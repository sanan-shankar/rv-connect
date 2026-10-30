/* ------------------------------------------------------------------ *
 *  Catch-ups: the IMPURE half of the engine.
 *
 *  advanceEdition (one Prisma transaction per step, idempotent side effects
 *  guarded by the status column plus the remindersSent bitmask) and
 *  advanceDueCatchups (the lazy, read-time, no-cron advance).
 *
 *  The pure state machine, the question library, the calendar math and the
 *  copy helpers are in `./catchups-core.ts`, which this file drives. That
 *  split is why prisma, the notify builders and the error reporter are plain
 *  static imports here. They used to be lazy singletons behind `getPrisma()`
 *  and `getNotify()`, with a dynamic `report()` beside them, for one reason:
 *  the pure code shared this module and had to load under bare `node --test`
 *  with no Prisma client in its graph. The file boundary does that job now,
 *  and it also breaks the app's last import cycle -- catchups-notify.ts needs
 *  `answerReminderMessage`, and takes it from the core rather than from here.
 *
 *  No em dashes. User-facing copy says "Rishi Valley", never "Alumni".
 * ------------------------------------------------------------------ */
import { prisma } from "@/lib/prisma";
import * as notify from "@/lib/catchups-notify";
import { reportSwallowed } from "@/lib/report-error";
import { healBatchCatchupsAndMemberships } from "@/lib/batch-catchups";
import { dropGoneMembersWriting } from "@/lib/group-succession";
import { isUniqueViolation } from "@/lib/prisma-errors";
import type {
  CatchupStatus,
  EditionStatus,
  EditionTiming,
} from "@/lib/catchups-types";
import {
  ANSWERED_ENTRY_WHERE,
  catchupDisplayName,
  isEditionRunning,
  isMissingCatchupTable,
  nextEditionStatus,
  planNextAction,
  QUESTION_WINDOW_DAYS,
  TICK_GRACE_MS,
  deadlineIn,
  type EditionAction,
} from "./catchups-core";

/* The pure half's whole surface, re-exported. Server components and actions
   have always reached the state machine and the copy helpers through this
   module, and there is nothing to gain by making a dozen call sites name which
   half a helper lives in: they run on the server, where importing the drivers
   costs nothing.

   THE RULE THAT MATTERS IS THE OTHER DIRECTION. A CLIENT component must import
   from `./catchups-core` directly. Coming through here would pull Prisma and
   the notify builders into its bundle -- which is what the lazy singletons used
   to prevent and what the file split prevents now. The five client and
   type-only importers were repointed when the split landed. */
export * from "./catchups-core";

// ─── Impure drivers ──────────────────────────────────────────────────────────

type AdvanceMeta = {
  catchupId: string;
  groupId: string;
  /** What the bells call it (`catchupDisplayName`), see `CatchupName`. */
  catchupName: string;
  catchupStatus: CatchupStatus;
};

export type AdvanceEditionInput = EditionTiming & {
  id: string;
  catchupId: string;
  catchup?: {
    id?: string;
    status?: string | null;
    /** The Keeper's own name for it. A caller that selected it passes it,
     *  `null` included; one that did not leaves it out, and `loadMeta` reads
     *  the row rather than guess the name from the group (T2a-02). */
    title?: string | null;
    group?: { id: string; name: string } | null;
  } | null;
};

/** The columns the pure timing helpers read. Exported so an action reading an
 *  edition for `shiftEditionPatch` selects exactly the same set. */
export const EDITION_TIMING_SELECT = {
  status: true,
  questionsCloseAt: true,
  answersCloseAt: true,
  publishedAt: true,
  remindersSent: true,
  timeCapsule: true,
  publishAt: true,
} as const;

function toTiming(row: {
  status: string;
  questionsCloseAt: Date | string | null;
  answersCloseAt: Date | string | null;
  publishedAt: Date | string | null;
  remindersSent: number;
  timeCapsule: boolean;
  publishAt: Date | string | null;
}): EditionTiming {
  return {
    status: row.status as EditionStatus,
    questionsCloseAt: row.questionsCloseAt,
    answersCloseAt: row.answersCloseAt,
    publishedAt: row.publishedAt,
    remindersSent: row.remindersSent,
    timeCapsule: row.timeCapsule,
    publishAt: row.publishAt,
  };
}

/**
 * Who the clock's bells go to, and what they call the Catch-up.
 *
 * THE NAME IS THE ONE THE PAGES PRINT: the Keeper's title when there is one,
 * else the group's name. It was the group's name always, and a rename writes
 * only the title, so every bell after a rename used the name it replaced (bug
 * audit 3, T2a-02). The included row is used only when its caller selected the
 * title (`null` counts: no title), because a caller that did not would have
 * the same bug back by omission.
 */
async function loadMeta(edition: AdvanceEditionInput): Promise<AdvanceMeta | null> {
  const included = edition.catchup;
  if (included?.group && included.title !== undefined) {
    return {
      catchupId: edition.catchupId,
      groupId: included.group.id,
      catchupName: catchupDisplayName(included.title, included.group.name),
      catchupStatus: (included.status as CatchupStatus) ?? "active",
    };
  }
  const c = await prisma.catchup.findUnique({
    where: { id: edition.catchupId },
    select: {
      id: true,
      status: true,
      title: true,
      group: { select: { id: true, name: true } },
    },
  });
  if (!c) return null;
  return {
    catchupId: c.id,
    groupId: c.group.id,
    catchupName: catchupDisplayName(c.title, c.group.name),
    catchupStatus: c.status as CatchupStatus,
  };
}

/**
 * A swap that has to be undone once it holds the row (bug audit 3, L1-02).
 *
 * An Edition opens only with a question in it, and closes early only with an
 * answer in it. Those counts used to be taken BEFORE the compare-and-swap, and a
 * count is a read: at READ COMMITTED it neither waits for nor sees a question
 * removed a moment later, so answering could open on an Edition that no longer
 * had anything to answer. Counted AFTER the swap, in the same transaction, the
 * swap's hold on the Edition's row puts the two in order: a removal that took the
 * row first has committed by the time the count runs, and one that comes second
 * finds the Edition moved on. Throwing this rolls the swap back.
 */
export class EmptyAfterSwap extends Error {}

/** A transaction's own answer, or "empty" when it threw `EmptyAfterSwap`. */
export async function unlessEmpty<T>(run: Promise<T>): Promise<T | "empty"> {
  try {
    return await run;
  } catch (err) {
    if (err instanceof EmptyAfterSwap) return "empty";
    throw err;
  }
}

/**
 * Apply exactly one planned action inside its own transaction. The WHERE clause
 * is the compare-and-swap guard: a transition matches on the current status, a
 * reminder / extension on the current remindersSent. If a concurrent visit
 * already applied it the update touches 0 rows and we fire nothing (idempotent).
 * The notification write shares the transaction, so it commits with the flip or
 * not at all. Returns true when this call did the work.
 */
async function applyEditionAction(
  editionId: string,
  before: EditionTiming,
  action: EditionAction,
  meta: AdvanceMeta
): Promise<boolean> {
  if (action.kind === "none") return false;

  const applied = await unlessEmpty(prisma.$transaction(async (tx) => {
    if (action.kind === "transition") {
      /* `requires` rides on the compare-and-swap (build phase 14): an
         answering Edition publishes only if it is NOT a capsule and seals
         only if it IS, read by Postgres at the moment of the write. */
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: action.from, ...(action.requires ?? {}) },
        data: action.patch,
      });
      if (cas.count === 0) return false;

      /* The plan counted the questions before this swap (`EmptyAfterSwap`).
         Counted again now that the row is held: one removed as the deadline
         passed rolls the open back, and the loop in advanceEdition re-reads,
         counts none and takes the no-questions path instead. */
      if (action.to === "answering") {
        const questions = await tx.catchupPrompt.count({ where: { editionId, accepted: true } });
        if (questions === 0) throw new EmptyAfterSwap();
      }

      /* An Edition closing, published or sealed, sends out nothing written by
         a member who is blocked or leaving the site (his Q6 with Q21). Not
         at a capsule's opening: it keeps what it sealed. The count the plan
         took (ANSWERED_ENTRY_WHERE) already left their answers out. */
      if (action.from === "answering") await dropGoneMembersWriting(tx, editionId);

      if (action.notify === "catchup_answers_open") {
        await notify.notifyAnswersOpen(tx, { ...meta, editionId });
      } else if (action.notify === "catchup_published") {
        await notify.notifyPublished(tx, { ...meta, editionId, capsule: action.from === "sealed" });
      } else if (action.notify === "catchup_sealed" && action.patch.publishAt) {
        await notify.notifySealed(tx, { ...meta, editionId, opensAt: action.patch.publishAt });
      }
      return true;
    }

    if (action.kind === "extend") {
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "answering", remindersSent: before.remindersSent },
        data: action.patch,
      });
      if (cas.count === 0) return false;
      // The deadline every waiting reminder names has just moved three days.
      await notify.clearReminders(tx, meta.catchupId);
      await notify.notifyAnswersOpen(tx, { ...meta, editionId, onlyNonAnswerers: true });
      return true;
    }

    if (action.kind === "fizzle") {
      // Closed empty twice. Clearing the deadline makes it idle; nobody is
      // told, because nothing happened that anybody needs to act on.
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "collecting", remindersSent: before.remindersSent },
        data: action.patch,
      });
      return cas.count > 0;
    }

    if (action.kind === "extend-questions") {
      // Silent (2026-10-17): see planNextAction.
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "collecting", remindersSent: before.remindersSent },
        data: action.patch,
      });
      return cas.count > 0;
    }

    /* reminder
     *
     * `status: "answering"` alongside the bucket, which the three branches
     * above all carry and this one did not (audit Low 23). `dueReminder` only
     * ever returns while answering, but that is read from a snapshot: between
     * the plan and this write the Edition can publish, or the Keeper can pause or
     * end it, and the bucket alone happily agreed. The group then got "two days
     * left to answer" about an Edition that had already gone out. */
    const cas = await tx.catchupEdition.updateMany({
      where: { id: editionId, status: "answering", remindersSent: before.remindersSent },
      data: action.patch,
    });
    if (cas.count === 0) return false;
    await notify.notifyReminder(tx, {
      ...meta,
      editionId,
      daysLeft: action.daysLeft,
      closesAt: before.answersCloseAt,
    });
    return true;
  }));
  // Undone for want of a question: nothing applied, and the caller re-plans.
  return applied === "empty" ? false : applied;
}

/**
 * Bring one Edition to the status the clock justifies, firing each crossed
 * transition's one-time side effects. Loops so a very stale Edition settles fully
 * in a single visit; bounded so a logic bug can never spin. Never throws: a
 * missing table (pre-migration) or any error is swallowed, because the app-shell
 * piggyback that calls this runs on every authenticated page.
 */
/* `restoreOwnCatchupCopy` stood here until build phase 5. It took one
   member's copy back out of the thirty-day bin when they followed their own
   invite link, because the join path would otherwise redirect an existing
   member straight past the action and leave the sweep armed on somebody who
   had just walked back in (audit C-020). Deleting became LEAVING (his, N18):
   leaving takes the `GroupMember` row itself, so a member who is out is not a
   member the invite link can redirect, and there is no stamp left to disarm.
   Archiving is untouched by that path, exactly as it was -- filing something
   away and then opening it again should not unfile it. */

export async function advanceEdition(
  edition: AdvanceEditionInput,
  now: Date = new Date()
): Promise<void> {
  try {
    const meta = await loadMeta(edition);
    if (!meta) return;
  
    // An ended Catch-up's clock stops with it. Without this an Edition left
    // inside it kept advancing, kept sending a daily reminder to answer, and
    // published itself under a home page saying it had ended (audit B-061).
    // A legacy `paused` row is NOT frozen: there has been nothing to hold
    // since Editions stopped running on a rhythm (2026-10-17), and reading it
    // as active is what lets its cleanup migration land on either side of
    // the deploy.
    //
    // This gate covers the whole AUTOMATIC half: the app-shell sweep, the cron
    // tick and every page's own freshen all advance through here. The
    // hand-driven half -- the cycle controls and the two member submissions,
    // which write the edition directly -- is refused by `refuseIfEnded` in
    // the actions. Both halves are needed; neither is reachable from the other.
    /* ONE EXCEPTION: a sealed time capsule opens on its date whatever the
       Catch-up is doing (build phase 14). Ending a Catch-up was never a
       promise to keep last year's letters shut for longer than a year. */
    if (meta.catchupStatus === "ended" && edition.status !== "sealed") return;

    let ed: EditionTiming = toTiming(edition);
    let entryCount: number | null = null;
    let promptCount: number | null = null;

    for (let i = 0; i < 12; i += 1) {
      // Each count is loaded only for the decision that needs it, and only when
      // that decision is actually on the table.
      const closing = nextEditionStatus(ed, now);
      if (
        entryCount === null &&
        ed.status === "answering" &&
        // A capsule closes onto `sealed`, and needs the same count: without it
        // every capsule would look empty and take the too-few extension.
        (closing === "published" || closing === "sealed")
      ) {
        // Only answers with something in them, the same count the Keeper's
        // early close takes (`ANSWERED_ENTRY_WHERE`).
        entryCount = await prisma.catchupEntry.count({
          where: { editionId: edition.id, ...ANSWERED_ENTRY_WHERE },
        });
      }
      if (
        promptCount === null &&
        ed.status === "collecting" &&
        nextEditionStatus(ed, now) === "answering"
      ) {
        // `accepted` is what actually renders in an Edition, and it is what
        // submitPrompt counts for the per-Edition ceiling. Count the same rows,
        // so "this Edition has no questions" means the same thing everywhere.
        promptCount = await prisma.catchupPrompt.count({
          where: { editionId: edition.id, accepted: true },
        });
      }

      const action = planNextAction(
        ed,
        { entries: entryCount ?? 0, prompts: promptCount ?? 0 },
        now
      );
      if (action.kind === "none") break;

      const applied = await applyEditionAction(edition.id, ed, action, meta);
      if (!applied) {
        // Lost the compare-and-swap to a concurrent visit: re-read and continue.
        const fresh = await prisma.catchupEdition.findUnique({
          where: { id: edition.id },
          select: EDITION_TIMING_SELECT,
        });
        if (!fresh) break;
        ed = toTiming(fresh);
        entryCount = null;
        promptCount = null;
        continue;
      }

      ed = { ...ed, ...action.patch };
      if (ed.status !== "answering") entryCount = null;
      if (ed.status !== "collecting") promptCount = null;
    }
  } catch (err) {
    if (isMissingCatchupTable(err)) return;
    /* Reported, not just logged (bug-report-2 C-149). This function never
       re-throws -- an edition that cannot advance must not take the page it
       was called from down -- so the reportSwallowed call in
       advanceDueCatchups never sees a per-edition failure. Edition-OPENING
       failures reached Sentry and Edition-ADVANCING failures did not, which
       was the M09 fix applied to half the clock. A
       console line on Vercel reaches nobody: the Edition quietly stops moving,
       the countdown keeps counting down, and the first anybody hears of it is
       a member asking why the Edition never closed. */
    reportSwallowed("catchups", err, { step: "advanceEdition", editionId: edition.id });
  }
}

/**
 * Start an Edition: the questions open for three days and everyone is told.
 *
 * THE ONLY WAY ONE BEGINS. There is no rhythm (owner, 2026-10-17: "You should
 * just be able to start it whenever you want. And then it ends when it ends.
 * And then it just doesn't go until you start it again."), so the clock that
 * used to open Editions on `nextOpensAt` is gone and this is what is left of
 * it. The Catch-up's own creation opens its first Edition in the same breath
 * (`createCatchupWithPeople`); every later one, and a batch's first, is here.
 *
 * In place, when it can be. If the newest Edition is an idle `collecting` row
 * -- a batch's first, made with no deadline, or one that fizzled -- that row
 * gets the clock, keeping whatever questions are already in it, rather than
 * being left behind empty under a new number. Otherwise a new Edition opens.
 *
 * One transaction, the bell inside it, so nobody is told about an Edition that
 * did not start. Two members pressing Start together produce one Edition: the
 * in-place path compare-and-swaps on the row it read, and the new-row path has
 * the unique (catchupId, number) under it. The loser gets "moved".
 *
 * NEVER INTO AN ENDED CATCH-UP, decided while its row is held (bug audit 3, A3
 * review of T2a-07). The action's own "not ended" check runs before the rate
 * limit and this transaction, and an End landing in that gap left an ended
 * Catch-up with a running Edition that nobody could ever read. The first
 * statement here holds the Catch-up's row only while it has not ended, and
 * `endCatchup` holds the same row before it looks for a running Edition, so
 * whichever comes second sees the first.
 */
export async function openEdition(
  /** `name` is what the bell calls it: `catchupDisplayName`, never the
   *  group's name alone (T2a-02). */
  catchup: { id: string; groupId: string; name: string },
  starter: { id: string; name: string },
  now: Date
): Promise<{ editionId: string } | { refused: "running" | "moved" | "ended" }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const held = await tx.catchup.updateMany({
        where: { id: catchup.id, status: { not: "ended" } },
        data: { updatedAt: now },
      });
      if (held.count === 0) return { refused: "ended" as const };

      const newest = await tx.catchupEdition.findFirst({
        where: { catchupId: catchup.id },
        orderBy: { number: "desc" },
        select: { id: true, number: true, status: true, questionsCloseAt: true },
      });
      if (newest && isEditionRunning(newest)) return { refused: "running" as const };

      const questionsCloseAt = deadlineIn(now, QUESTION_WINDOW_DAYS);
      let editionId: string;
      // Idle and collecting means no deadline (`isEditionRunning`), and the
      // compare-and-swap is on exactly that.
      if (newest && newest.status === "collecting") {
        const cas = await tx.catchupEdition.updateMany({
          where: { id: newest.id, status: "collecting", questionsCloseAt: null },
          // Zero, which also clears the spent-extension bit: this is a fresh
          // window, and it gets its own one silent extension.
          data: { questionsCloseAt, remindersSent: 0 },
        });
        if (cas.count === 0) return { refused: "moved" as const };
        editionId = newest.id;
      } else {
        const created = await tx.catchupEdition.create({
          data: {
            catchupId: catchup.id,
            number: (newest?.number ?? 0) + 1,
            status: "collecting",
            questionsCloseAt,
          },
          select: { id: true },
        });
        editionId = created.id;
      }

      await notify.notifyQuestionsOpen(tx, {
        catchupId: catchup.id,
        editionId,
        groupId: catchup.groupId,
        catchupName: catchup.name,
        excludeUserId: starter.id,
        starterName: starter.name,
      });
      return { editionId };
    });
  } catch (err) {
    // Somebody else's Start minted this number first.
    if (isUniqueViolation(err)) return { refused: "moved" };
    throw err;
  }
}

/**
 * The lazy, read-time, no-cron advance (spec section 2.4). Finds every stale
 * Edition in the viewer's groups (or across all groups when unscoped, so
 * /api/catchups/tick is a thin wrapper) and advances each. It opens nothing:
 * an Edition starts only when somebody starts it. Wrapped so it can NEVER throw:
 * it is piggy-backed on the app-shell notification-count query that runs on
 * essentially every authenticated page view, and a missing table (pre-migration)
 * or any error must degrade to a no-op, never a 500.
 *
 * `userId` is not just a filter: it is the difference between the two callers,
 * and one thing here happens on only one of them. The batch self-heal below
 * scans two whole tables, which is a nightly cost and would be an absurd
 * per-page-view one, so it runs on the unscoped cron sweep alone.
 */
export async function advanceDueCatchups(userId?: string): Promise<void> {
  const now = new Date();

  /* The nightly half, before the advance rather than after it: a batch that
     crossed the floor gets its Catch-up and its first Edition here, and the
     advance below is then the pass that can move it. It never throws and it
     reports its own failures (see batch-catchups.ts). */
  if (!userId) await healBatchCatchupsAndMemberships();

  try {
      const scope = userId ? { group: { members: { some: { userId } } } } : {};

    /* ONE read, because this runs on essentially every authenticated page
       view. It used to serve two halves -- advancing stale Editions and
       opening the next one when `nextOpensAt` came round -- and the second
       half went with the rhythm (2026-10-17). Nothing opens here now.

       Ended Catch-ups are frozen. advanceEdition re-checks this and is the
       actual guarantee (it is reachable from every page's own freshen too);
       the clause here just avoids loading rows it would skip. A legacy
       `paused` row is not ended, so it runs. */
    /* What the clock can move: an Edition that is RUNNING. An idle one --
       a batch nobody has started, or one that fizzled -- has no question
       deadline (`isEditionRunning`), and is left out here in SQL, so a
       Catch-up resting between Editions costs its members nothing on a page
       view, however long it rests. */
    const running = {
      OR: [{ status: "answering" }, { status: "collecting", questionsCloseAt: { not: null } }],
    };
    /* A time capsule due to open, in ANY Catch-up the scope reaches, ended or
       not (see advanceEdition). Inside the same read rather than a second
       query, because this runs on every authenticated page and a round trip
       to Mumbai for a table that is almost always empty of these is not free.
       The grace is the clock's own, so the query and computeStatus agree. */
    const sealedDue = {
      status: "sealed",
      publishAt: { lte: new Date(now.getTime() + TICK_GRACE_MS) },
    };
    const catchups = await prisma.catchup.findMany({
      where: {
        ...scope,
        OR: [
          { status: { not: "ended" }, editions: { some: running } },
          { editions: { some: sealedDue } },
        ],
      },
      include: {
        group: { select: { id: true, name: true } },
        /* Only the Editions there is anything to do with: the running one,
           and a capsule whose day has come. */
        editions: {
          where: { OR: [running, sealedDue] },
          select: { ...EDITION_TIMING_SELECT, id: true, catchupId: true, number: true },
        },
      },
    });

    for (const c of catchups) {
      for (const ed of c.editions) {
        await advanceEdition(
          {
            ...ed,
            catchup: { id: c.id, status: c.status, title: c.title, group: c.group },
          } as AdvanceEditionInput,
          now
        );
      }
    }
  } catch (err) {
    if (isMissingCatchupTable(err)) return; // tables absent (pre-migration): no-op
    // Swallow: this runs on every authenticated page and must never break one.
    // But say so somewhere a human will hear it. Before this the whole
    // Catch-ups feature could be failing on every page view and the only
    // outward sign would be Editions quietly not happening (audit M09).
    reportSwallowed("catchups", err, { step: "advanceDueCatchups", userId });
  }
}
