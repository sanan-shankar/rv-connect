/* ------------------------------------------------------------------ *
 *  Catch-ups: the IMPURE half of the engine.
 *
 *  advanceEdition (one Prisma transaction per step, idempotent side effects
 *  guarded by the status column plus the remindersSent bitmask) and
 *  advanceDueCatchups (the lazy, read-time, no-cron advance), plus
 *  restoreOwnCatchupCopy.
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
import type {
  Cadence,
  CatchupStatus,
  EditionStatus,
  EditionTiming,
} from "@/lib/catchups-types";
import {
  addCadenceGap,
  isMissingCatchupTable,
  nextEditionStatus,
  planNextAction,
  QUESTION_WINDOW_DAYS,
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
  groupName: string;
  cadence: Cadence;
  catchupStatus: CatchupStatus;
};

export type AdvanceEditionInput = EditionTiming & {
  id: string;
  catchupId: string;
  catchup?: {
    id?: string;
    cadence?: string | null;
    status?: string | null;
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
} as const;

function toTiming(row: {
  status: string;
  questionsCloseAt: Date | string | null;
  answersCloseAt: Date | string | null;
  publishedAt: Date | string | null;
  remindersSent: number;
}): EditionTiming {
  return {
    status: row.status as EditionStatus,
    questionsCloseAt: row.questionsCloseAt,
    answersCloseAt: row.answersCloseAt,
    publishedAt: row.publishedAt,
    remindersSent: row.remindersSent,
  };
}

async function loadMeta(edition: AdvanceEditionInput): Promise<AdvanceMeta | null> {
  const included = edition.catchup;
  if (included?.group) {
    return {
      catchupId: edition.catchupId,
      groupId: included.group.id,
      groupName: included.group.name,
      cadence: (included.cadence as Cadence) ?? "monthly",
      catchupStatus: (included.status as CatchupStatus) ?? "active",
    };
  }
  const c = await prisma.catchup.findUnique({
    where: { id: edition.catchupId },
    select: {
      id: true,
      cadence: true,
      status: true,
      group: { select: { id: true, name: true } },
    },
  });
  if (!c) return null;
  return {
    catchupId: c.id,
    groupId: c.group.id,
    groupName: c.group.name,
    cadence: c.cadence as Cadence,
    catchupStatus: c.status as CatchupStatus,
  };
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
  meta: AdvanceMeta,
  now: Date
): Promise<boolean> {
  if (action.kind === "none") return false;

  return prisma.$transaction(async (tx) => {
    if (action.kind === "transition") {
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: action.from },
        data: action.patch,
      });
      if (cas.count === 0) return false;

      if (action.setsNextOpensAt && meta.catchupStatus === "active") {
        await tx.catchup.update({
          where: { id: meta.catchupId },
          data: { nextOpensAt: addCadenceGap(now, meta.cadence) },
        });
      }
      if (action.notify === "catchup_answers_open") {
        await notify.notifyAnswersOpen(tx, { ...meta, editionId });
      } else if (action.notify === "catchup_published") {
        await notify.notifyPublished(tx, { ...meta, editionId });
      }
      return true;
    }

    if (action.kind === "extend") {
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "answering", remindersSent: before.remindersSent },
        data: action.patch,
      });
      if (cas.count === 0) return false;
      await notify.notifyAnswersOpen(tx, { ...meta, editionId, onlyNonAnswerers: true });
      return true;
    }

    if (action.kind === "extend-questions") {
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "collecting", remindersSent: before.remindersSent },
        data: action.patch,
      });
      if (cas.count === 0) return false;
      await notify.notifyQuestionsOpen(tx, { ...meta, editionId });
      return true;
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
  });
}

/**
 * Bring one Edition to the status the clock justifies, firing each crossed
 * transition's one-time side effects. Loops so a very stale Edition settles fully
 * in a single visit; bounded so a logic bug can never spin. Never throws: a
 * missing table (pre-migration) or any error is swallowed, because the app-shell
 * piggyback that calls this runs on every authenticated page.
 */
/**
 * Take one member's own copy of a Catch-up back out of their bin.
 *
 * Binning is personal: it sets `CatchupPref.deletedAt`, which files the card
 * under "Recently deleted", stops every broadcast reaching them, and starts a
 * 30-day clock after which the retention sweep removes their membership
 * outright. Rejoining through the invite link left all of that armed -- the
 * link found the membership still there and simply showed them the Catch-up,
 * so the card stayed in the bin and the sweep still removed them from
 * something they had just walked back into (audit C-020).
 *
 * `archivedAt` is deliberately untouched: archiving is filing, not deletion,
 * and nothing sweeps it. Scoped to one member's own row, so following a link
 * can never change anybody else's filing.
 */
export async function restoreOwnCatchupCopy(
  catchupId: string,
  userId: string
): Promise<void> {
  await prisma.catchupPref.updateMany({
    where: { catchupId, userId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
}

export async function advanceEdition(
  edition: AdvanceEditionInput,
  now: Date = new Date()
): Promise<void> {
  try {
    const meta = await loadMeta(edition);
    if (!meta) return;
  
    // A paused or ended Catch-up's clock stops with it. Without this the Edition
    // kept advancing, kept sending a daily reminder to answer, and published
    // itself, all while the home page showed "This Catch-up is paused" and no
    // way to answer (audit B-061).
    //
    // This gate covers the whole AUTOMATIC half: the app-shell sweep, the cron
    // tick and every page's own freshen all advance through here. The
    // hand-driven half -- the Keeper's early-trigger controls and the two
    // member submissions, which write the edition directly -- is frozen by
    // `refuseIfFrozen` in the actions. Both halves are needed; neither is
    // reachable from the other.
    if (meta.catchupStatus !== "active") return;

    let ed: EditionTiming = toTiming(edition);
    let entryCount: number | null = null;
    let promptCount: number | null = null;

    for (let i = 0; i < 12; i += 1) {
      // Each count is loaded only for the decision that needs it, and only when
      // that decision is actually on the table.
      if (
        entryCount === null &&
        ed.status === "answering" &&
        nextEditionStatus(ed, now) === "published"
      ) {
        entryCount = await prisma.catchupEntry.count({ where: { editionId: edition.id } });
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

      const applied = await applyEditionAction(edition.id, ed, action, meta, now);
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
       was called from down -- so the reportSwallowed calls in
       advanceDueCatchups and openNextEditionIfDue never see a per-edition
       failure. Edition-OPENING failures reached Sentry and Edition-ADVANCING
       failures did not, which is the M09 fix applied to half the clock. A
       console line on Vercel reaches nobody: the Edition quietly stops moving,
       the countdown keeps counting down, and the first anybody hears of it is
       a member asking why the Edition never closed. */
    reportSwallowed("catchups", err, { step: "advanceEdition", editionId: edition.id });
  }
}

/**
 * Open the next Edition for a recurring Catch-up once its nextOpensAt has passed.
 * Idempotent: the compare-and-swap on nextOpensAt (set back to null) means only
 * one visit opens it, and the unique [catchupId, number] index is the backstop.
 */
async function openNextEditionIfDue(
  catchup: {
    id: string;
    status: string;
    cadence: string;
    nextOpensAt: Date | null;
    group: { id: string; name: string };
    editions: Array<{ number: number; status: string }>;
  },
  now: Date
): Promise<void> {
  if (catchup.status !== "active") return;
  const opensAt = catchup.nextOpensAt;
  if (!opensAt || now.getTime() < opensAt.getTime()) return;

  const latest = catchup.editions[0];
  // Only open a fresh Edition when the previous one has actually published.
  if (!latest || latest.status !== "published") return;

  await prisma.$transaction(async (tx) => {
    const cas = await tx.catchup.updateMany({
      where: { id: catchup.id, nextOpensAt: opensAt },
      data: { nextOpensAt: null },
    });
    if (cas.count === 0) return;

    const edition = await tx.catchupEdition.create({
      data: {
        catchupId: catchup.id,
        number: latest.number + 1,
        status: "collecting",
        questionsCloseAt: deadlineIn(now, QUESTION_WINDOW_DAYS),
      },
    });
    await notify.notifyQuestionsOpen(tx, {
      catchupId: catchup.id,
      editionId: edition.id,
      groupId: catchup.group.id,
      groupName: catchup.group.name,
    });
  });
}

/**
 * The lazy, read-time, no-cron advance (spec section 2.4). Finds every stale
 * Edition in the viewer's groups (or across all groups when unscoped, so a future
 * CRON_SECRET /api/catchups/tick is a thin wrapper) and advances each, then opens
 * any next Editions whose nextOpensAt has passed. Wrapped so it can NEVER throw:
 * it is piggy-backed on the app-shell notification-count query that runs on
 * essentially every authenticated page view, and a missing table (pre-migration)
 * or any error must degrade to a no-op, never a 500.
 */
export async function advanceDueCatchups(userId?: string): Promise<void> {
  const now = new Date();
  try {
      const scope = userId ? { group: { members: { some: { userId } } } } : {};

    /* ONE read for both halves of the advance, because both are questions
       about the same Catch-up rows and this runs on essentially every
       authenticated page view. It used to be two joins against
       `group.members.some`, and for a member in no Catch-up -- the majority --
       both returned nothing.

       Paused/ended Catch-ups are frozen. advanceEdition re-checks this and is
       the actual guarantee (it is reachable from every page's own freshen
       too); the `status: "active"` clause just avoids loading rows we would
       skip.

       The two reads were sequential, and it is worth saying why one is safe.
       The only thing the advance loop below writes to `nextOpensAt` is
       `now + cadence gap` -- always in the future -- so a Catch-up it
       publishes cannot also become due to OPEN in the same pass, which is
       exactly what the second read was positioned after to see. And in the
       other direction `openNextEditionIfDue` compare-and-swaps on the
       `nextOpensAt` it was handed, so a value that moved under it is a no-op
       rather than a double open. */
    const STALE = ["collecting", "answering"];
    const catchups = await prisma.catchup.findMany({
      where: {
        status: "active",
        ...scope,
        OR: [{ nextOpensAt: { lte: now } }, { editions: { some: { status: { in: STALE } } } }],
      },
      include: {
        group: { select: { id: true, name: true } },
        /* Every edition, newest first: the stale ones feed advanceEdition and
           the newest feeds openNextEditionIfDue, and Prisma cannot include the
           same relation twice under two filters. A Catch-up has one edition
           per cadence period, so this is tens of small rows at most, and only
           for the Catch-ups the `where` already narrowed to. */
        editions: {
          orderBy: { number: "desc" },
          select: { ...EDITION_TIMING_SELECT, id: true, catchupId: true, number: true },
        },
      },
    });

    for (const c of catchups) {
      for (const ed of c.editions) {
        if (!STALE.includes(ed.status)) continue;
        await advanceEdition(
          {
            ...ed,
            catchup: { id: c.id, cadence: c.cadence, status: c.status, group: c.group },
          } as AdvanceEditionInput,
          now
        );
      }
    }

    for (const c of catchups) {
      try {
        await openNextEditionIfDue(c, now);
      } catch (err) {
        if (!isMissingCatchupTable(err)) {
          // Reported, not just logged: this is the engine, and nobody notices
          // it stop -- the symptom is Editions that never open (audit M09).
          reportSwallowed("catchups", err, { step: "openNextEditionIfDue", catchupId: c.id });
        }
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
