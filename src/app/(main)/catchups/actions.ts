"use server";

/* ------------------------------------------------------------------ *
 *  Catch-ups: server actions.
 *
 *  Every mutation the feature needs, following the conventions already used
 *  by `collection/actions.ts` and `groups/actions.ts`: `auth()` gate first,
 *  plain Prisma calls (no repository layer), `revalidatePath` after a write,
 *  and a loose `{ error }` / `{ success: true, ... }` return shape rather than
 *  throwing to the client.
 *
 *  Every action re-derives its own permission from the database, never from
 *  a client-supplied flag (spec section 7, threat T-catchups-02):
 *   - participation is inherited from `GroupMember` (private groups are
 *     already gated by that same check);
 *   - the effective Keeper is the Catch-up's `createdBy` OR a member holding
 *     the Keeper role, computed via `isEffectiveKeeper` (WP1) from freshly-read
 *     rows, never trusted from the caller.
 *
 *  The lazy-advance touchpoint (spec 3.4): any action that reads an Edition's
 *  status calls WP1's `advanceEdition` on it via `loadMemberEdition`, once the
 *  caller is proved to be in the group, so a mutation can never act on a
 *  status the clock already passed underneath a stale page (e.g. a late "open
 *  answering now" click after the window had already auto-advanced past
 *  collecting), and an account outside the group cannot move its clock.
 *
 *  Every action is wrapped by `runAction`, which turns a missing-table error
 *  (P2021, pre-migration) into a friendly `{ error }` instead of throwing, so
 *  calling any of these before the owner applies the migration degrades
 *  gracefully rather than surfacing a raw server-action exception.
 *
 *  No song field, and no Spotify fetch from here: a pasted link becomes a
 *  card through `lib/link-preview.ts` (build phase 10), which is the one place
 *  that fetches anything a member typed.
 *
 *  No em dashes. User-facing copy says "Rishi Valley", never "Alumni".
 * ------------------------------------------------------------------ */

import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { CATCHUP_PEOPLE, MAX_CATCHUP_PEOPLE } from "@/lib/catchup-caps";
import { entryCommentSchema } from "@/lib/validators";
import {
  EMPTY_COMMENT_PAGE,
  readCommentPage,
  serializeComment,
  toggleCommentLikeRow,
  writeComment,
} from "@/lib/comment-thread";
import { isPoolPicture, isValidPictureFocus } from "@/lib/catchup-pictures";
import { pickCatchupPicture } from "@/lib/catchup-picture-pick";
import { requireVerifiedMember } from "@/lib/member-gate";
import { rateLimit } from "@/lib/rate-limit";
import { ownedUploadUrls } from "@/lib/upload-ownership";
import { ownedVoiceRecording } from "@/lib/voice-answer";
import { purgeImageUrls } from "@/lib/image-purge";
import { revalidatePath } from "next/cache";
import {
  advanceEdition,
  openEdition,
  answeringPatch,
  planExtension,
  isEffectiveKeeper,
  isBatchCatchup,
  BATCH_CATCHUP_REFUSAL,
  BATCH_LEAVE_REFUSAL,
  DEFAULT_REMINDER_MODE,
  isEditionRunning,
  RUNNING_EDITION_WHERE,
  EMPTY_ENTRY_WHERE,
  ANSWERED_ENTRY_WHERE,
  EmptyAfterSwap,
  unlessEmpty,
  isMissingCatchupTable,
  mayChangeCatchupPicture,
  newInviteToken,
  publishPatch,
  sealPatch,
  mayMarkTimeCapsule,
  decideTimeCapsuleMark,
  QUESTION_WINDOW_DAYS,
  deadlineIn,
  type AdvanceEditionInput,
} from "@/lib/catchups";
import { scheduleLinkPreviews } from "@/lib/link-preview";
import { findLinks } from "@/lib/link-preview-core";
import {
  notifyAdded,
  notifyAnswersOpen,
  notifyComment,
  notifyLove,
  notifyPublished,
  notifyQuestionsOpen,
  notifySealed,
} from "@/lib/catchups-notify";
import { PROMPT_CATEGORIES } from "@/lib/catchups-types";
import type {
  CatchupStatus,
  EditionStatus,
  PromptCategory,
  ReminderMode,
} from "@/lib/catchups-types";
import { anyOtherHolder, lockGroup, promoteGroupSuccessor } from "@/lib/group-succession";
import { clearCatchupNotifications } from "@/lib/catchup-notifications";
import { isSerializationFailure, isUniqueViolation } from "@/lib/prisma-errors";
import { DOUBLE_SUBMIT_MS } from "@/lib/double-submit";

// ─── Soft caps (spec 3.3.1, enforced here rather than only surfaced as UI copy) ──

// Raised from 12 and no longer surfaced anywhere in the UI. The owner's call:
// a visible "3 of 12" counter made an Edition feel rationed for no reason nobody
// could explain. This is now purely a runaway/spam ceiling that a real group
// will never reach, not a budget members are asked to manage. The companion
// per-member pending cap is gone: since 2026-08-05 nothing pends.
const MAX_ACCEPTED_PROMPTS_PER_EDITION = 40;

/** The most ids one reorder may send. Above the insert cap on purpose (bug
 *  audit 3, T2b-09): that cap is soft -- `submitPrompt` tolerates a 41st
 *  question when two land together (C-029) -- and the reorder sends every
 *  accepted id, so a bound AT the cap refused every drag on such an Edition,
 *  for good, with "Invalid request.". This bounds the payload; the runaway
 *  guard is the one on inserts. */
const MAX_REORDER_PROMPT_IDS = MAX_ACCEPTED_PROMPTS_PER_EDITION * 2;

// ─── Validation ──────────────────────────────────────────────────────────────

const REMINDER_MODE_VALUES = ["all", "last", "off"] as const;

/**
 * Built from the shared `PROMPT_CATEGORIES` array, never from a list retyped
 * here. The hand-written copy this replaces went stale when the question
 * library was rewritten (2026-07-25) and rejected three of the five live sets
 * with a raw "Invalid option: expected one of valley-days|..." shown to the
 * member (owner, 2026-08-05: "that should never happen").
 */
const promptCategorySchema = z.enum(PROMPT_CATEGORIES).nullable();
const reminderModeSchema = z.enum(REMINDER_MODE_VALUES);
/** How far a Keeper may push a deadline in one go. The three the settings
 *  surface offers, and only those: his "why are we only giving a week more
 *  instead of more options?" moved the choices to three days, a week and two
 *  weeks, and this list stayed at 1, 2, 4 and 7, so two of the three buttons
 *  were refused. extend-days-rule.test.mjs keeps the two in step. */
const extendDaysSchema = z.union([z.literal(3), z.literal(7), z.literal(14)]);

/** People-first creation: no pre-existing group needed, see createCatchupWithPeople. */
const createCatchupWithPeopleSchema = z.object({
  name: z.string().trim().min(1, "Give this Catch-up a name.").max(80, "Keep the name under 80 characters."),
  // The argument for the number is on MAX_CATCHUP_PEOPLE, which the people
  // picker now reads too, so the roster cannot be built past a limit the
  // member is only told about on submit (audit M12).
  memberIds: z
    .array(z.string().min(1))
    .max(MAX_CATCHUP_PEOPLE, `A Catch-up can start with up to ${MAX_CATCHUP_PEOPLE} people.`),
});

/* The same 80 characters creation allows, and the same sentence when it is
   over, so a name that was accepted when the Catch-up was made cannot be
   rejected when it is edited. Empty is allowed here and is not there: clearing
   the name falls back to the group's own, which is a thing a Keeper may want,
   whereas creating a nameless Catch-up is not. */
const renameCatchupSchema = z.object({
  title: z.string().trim().max(80, "Keep the name under 80 characters."),
});

const submitPromptSchema = z.object({
  editionId: z.string().min(1),
  text: z.string().trim().min(1, "Ask something for the group.").max(300, "Keep it under 300 characters."),
  category: promptCategorySchema.optional(),
  showAsker: z.boolean().default(true),
});

const curateRemoveSchema = z.object({
  action: z.literal("remove"),
  promptId: z.string().min(1),
});

const curateReorderSchema = z.object({
  action: z.literal("reorder"),
  editionId: z.string().min(1),
  orderedPromptIds: z.array(z.string().min(1)).min(1).max(MAX_REORDER_PROMPT_IDS),
});

const submitEntrySchema = z.object({
  promptId: z.string().min(1),
  body: z.string().trim().max(6000, "Keep it under 6000 characters.").optional(),
  images: z.array(z.url()).max(3, "Up to 3 photos.").optional(),
  /* A recording (build phase 12, spec 3.10). `null` takes it off the answer
     and leaves the words; absent leaves the column alone, like every field
     here. `transcribed` says the body came from the browser's speech
     recognition. Shape only: whose recording it is, and whether its length is
     inside the cap, is `ownedVoiceRecording` below. NOTHING SENDS THIS YET --
     the recorder is in the lab until the owner picks. */
  audio: z
    .object({ url: z.string().max(2000), seconds: z.number(), transcribed: z.boolean() })
    .nullable()
    .optional(),
  /* The row version this surface last saw (audit C-125). Optional, so a
     caller that holds none keeps the unconditional upsert it always had. */
  baseUpdatedAt: z.string().optional(),
});

// ─── Shared helpers (not exported: a "use server" file may only export async
//     functions, so every internal helper/schema/constant below stays local) ──

/**
 * Every action shares one failure shape: a missing-table error (P2021,
 * pre-migration) becomes a friendly message instead of throwing, and any
 * other error is logged but still degrades to a friendly `{ error }` rather
 * than a raw server-action exception reaching the client.
 */
async function runAction<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    if (isMissingCatchupTable(err)) {
      return { error: "Catch-ups is not set up for this community yet. Please check back soon." };
    }
    console.error("[catchups/actions]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

async function loadMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  });
}

type EditionContext = {
  id: string;
  catchupId: string;
  number: number;
  status: EditionStatus;
  questionsCloseAt: Date | null;
  answersCloseAt: Date | null;
  publishedAt: Date | null;
  remindersSent: number;
  timeCapsule: boolean;
  sealedAt: Date | null;
  publishAt: Date | null;
  catchup: {
    createdById: string | null;
    status: CatchupStatus;
    group: { id: string; name: string; batchYear: number | null };
  };
};

/** The Edition's own columns, read twice on the way into a member's action:
 *  by `readEditionBase` before `advanceEdition` and by `advanceAndReload`
 *  after it, because the point of the second read is that the row has
 *  changed. What must not differ between the two is which columns they ask
 *  for, so they ask once. (The first read also nests the Catch-up and its
 *  group; that half is genuinely only wanted once.) */
const EDITION_COLUMNS = {
  id: true,
  catchupId: true,
  number: true,
  status: true,
  questionsCloseAt: true,
  answersCloseAt: true,
  publishedAt: true,
  remindersSent: true,
  // Build phase 14: the flag decides whether the close publishes or seals,
  // and `advanceEdition` below plans from it, so it is read every time.
  timeCapsule: true,
  sealedAt: true,
  publishAt: true,
} as const;

/**
 * An Edition plus its Catch-up/group context exactly as they stand: no clock,
 * no write. The first half of `loadMemberEdition`, split from the second so
 * the membership check can sit between them.
 */
async function readEditionBase(editionId: string) {
  return prisma.catchupEdition.findUnique({
    where: { id: editionId },
    select: {
      ...EDITION_COLUMNS,
      catchup: {
        select: {
          createdById: true,
          status: true,
          // `batchYear` is the whole test for "this is a batch Catch-up" (F6),
          // which the Keeper controls below ask before they ask who keeps it.
          group: { select: { id: true, name: true, batchYear: true } },
        },
      },
    },
  });
}

type EditionBase = NonNullable<Awaited<ReturnType<typeof readEditionBase>>>;

/**
 * Bring an Edition's status current against the clock, then read it again
 * (the lazy-advance touchpoint, spec 3.4), so no action can act on a status
 * the clock already passed underneath a stale page (e.g. a "close answers
 * now" click after the answer window had already auto-closed, or a question
 * submitted a beat after questionsCloseAt).
 *
 * `advanceEdition` is a WRITE: it opens answering, publishes and sends the
 * day's reminder, each with its bells. So this is reached from one place,
 * `loadMemberEdition`, after the caller is proved to be in the group.
 */
async function advanceAndReload(base: EditionBase): Promise<EditionContext | null> {
  await advanceEdition(base as AdvanceEditionInput);

  const fresh = await prisma.catchupEdition.findUnique({
    where: { id: base.id },
    select: EDITION_COLUMNS,
  });
  if (!fresh) return null;

  return {
    ...fresh,
    status: fresh.status as EditionStatus,
    catchup: {
      createdById: base.catchup.createdById,
      status: base.catchup.status as CatchupStatus,
      group: base.catchup.group,
    },
  };
}

async function loadCatchupContext(catchupId: string, userId: string) {
  const catchup = await prisma.catchup.findUnique({
    where: { id: catchupId },
    select: {
      id: true,
      createdById: true,
      status: true,
      groupId: true,
      // See readEditionBase: the batch test, for the guard in loadKeeperScope
      // and for the two exits that refuse a batch Catch-up by name. `name`
      // is added for `addCatchupMembers`'s notification, the same field
      // readEditionBase already carries for every notify call in this file.
      group: { select: { name: true, batchYear: true } },
    },
  });
  if (!catchup) return null;
  const membership = await loadMembership(catchup.groupId, userId);
  return { catchup, membership };
}

/**
 * The refusal every write into a live Edition shares.
 *
 * `advanceEdition` freezes the CLOCK of an ended Catch-up, which is the whole
 * of B-061's automatic half. It is not the whole story: the cycle controls
 * (open answering, close and publish, extend) and the two member submissions
 * write the edition directly, in their own transactions, and each of them only
 * ever checked the EDITION's status -- `answering` stays `answering` when a
 * Catch-up ends, so closing it early still published it and notified the
 * whole group under a home page saying it had ended. A stale tab is enough to
 * reach every one of them.
 *
 * So the freeze is enforced in two places by construction, not one: the clock
 * in `advanceEdition`, and every hand-driven write through here.
 *
 * It was `refuseIfFrozen` and refused a PAUSED Catch-up too, with a hint per
 * caller saying how to resume it. Hold went with the rhythm (2026-10-17):
 * nothing is scheduled, so there is nothing to hold, and a legacy `paused`
 * row is read as active everywhere.
 */
function refuseIfEnded(status: string): { error: string } | null {
  return status === "ended" ? { error: "This Catch-up has ended." } : null;
}

/**
 * The other refusal a write into an Edition needs since there is no rhythm:
 * that there IS an Edition running. An idle `collecting` row -- a batch's
 * never-started first, or one that fizzled (`isEditionRunning`) -- draws Start
 * on the home and nothing else, so anything arriving here for one is a stale
 * tab or a hand-made call. Letting it through would start the clock with
 * nobody told: a question used to do exactly that on a batch, and "give
 * everyone longer" or "open answering" would now. Only `startEdition` starts.
 */
function refuseIfIdle(edition: EditionContext): { error: string } | null {
  if (edition.status !== "collecting" || isEditionRunning(edition)) return null;
  return { error: "Nothing is running here yet. Start an Edition first." };
}

/** What `loadMemberEdition` says to anyone it turns away, whichever door was
 *  shut. */
const NOT_IN_EDITION = "You are not a member of this Catch-up." as const;

/**
 * The Edition a member is acting in, or the reason they may not.
 *
 * MEMBERSHIP FIRST, THEN THE CLOCK (bug audit 3, L12-03). This used to load
 * the Edition fresh, advancing it, and only then ask whether the caller was in
 * the group, so any signed-in account holding an Edition or answer id (bell
 * links carry them) could open answering, publish or send the day's reminder
 * for a group it was not in, and be refused afterwards. The home and the
 * reader already checked before advancing (spec 3.4); this is their order.
 *
 * ONE SENTENCE for a missing Edition and a closed door (V-T2-02). Two told a
 * stranger holding an id whether it was real; the reader answers both with
 * the same not-found page.
 *
 * Every member action and every Keeper action on an Edition starts here;
 * before this helper each of them wrote the same four lines out, and the
 * refusal sentences with them.
 */
async function loadMemberEdition(editionId: string, viewerId: string) {
  const base = await readEditionBase(editionId);
  if (!base) return { error: NOT_IN_EDITION };
  const membership = await loadMembership(base.catchup.group.id, viewerId);
  if (!membership) return { error: NOT_IN_EDITION };
  const edition = await advanceAndReload(base);
  if (!edition) return { error: "Catch-up Edition not found." as const };
  return { edition, membership };
}

/**
 * The same, plus the Keeper gate and the frozen gate: the whole preamble the
 * seven edition-scoped Keeper controls used to restate, ~13 lines each.
 *
 * Both refusals are passed in rather than generalised. The ten "Only the
 * Keeper can ..." sentences are owner-reviewed copy that differs per control,
 * and a caller naming its own is also what keeps the sentence next to the
 * thing it refuses.
 *
 * `refuseEnded` is what makes this refuse an ended Catch-up (B-061), so
 * omitting it is a real choice, not a default, and no caller makes it any more.
 * `curatePrompt` used to, on the reasoning that it is gated to a `collecting`
 * Edition and an ended Catch-up's frozen clock could not leave one behind. Idle
 * Editions broke that (2026-10-17): a never-started or fizzled row stays
 * `collecting` for good, ended or not (write-path review). Every caller passes
 * it, and catchup-lifecycle.test.mjs fails one that forgets.
 */
async function loadKeeperEdition(
  editionId: string,
  viewerId: string,
  refusal: {
    notKeeper: string;
    refuseEnded?: boolean;
    /** Opt in per caller, the `mayChangeCatchupPicture` shape: every batch
     *  member now runs the cycle together (owner, 2026-09-27, "make everyone
     *  a keeper"), but not every Edition-scoped control is part of the
     *  cycle, so this is asked rather than assumed. Omitted means refused,
     *  same as before that word. */
    allowBatch?: boolean;
  }
) {
  const scope = await loadMemberEdition(editionId, viewerId);
  if ("error" in scope) return scope;
  const { edition, membership } = scope;
  if (isBatchCatchup(edition.catchup.group.batchYear)) {
    if (!refusal.allowBatch) return { error: BATCH_CATCHUP_REFUSAL };
    // Every member holds this one; nothing left to check but the freeze below.
  } else if (
    !isEffectiveKeeper({
      viewerId,
      createdById: edition.catchup.createdById,
      groupRole: membership.role,
    })
  ) {
    return { error: refusal.notKeeper };
  }
  if (refusal.refuseEnded) {
    const ended = refuseIfEnded(edition.catchup.status);
    if (ended) return ended;
  }
  return { edition, membership };
}

// ─── Catchup lifecycle (spec 3.2, 3.3 settings) ───────────────────────────────

/**
 * Start a Catch-up from a set of PEOPLE rather than an existing group.
 *
 * Groups are being retired as a user-facing feature (owner, 2026-07-25: "for
 * now, let us have basically no groups, let's just have catch-ups... within
 * catch-ups you'll have to build in the functionality to create your own
 * group"). The Group row survives as the membership container underneath,
 * because everything downstream already keys off it: `Catchup.groupId` is
 * unique, `catchups-notify` derives its whole audience from `GroupMember`, and
 * post/letter scoping uses `Post.groupId`. Rebuilding all of that onto a new
 * join table would be a large migration to arrive at the same place, so
 * instead the group is created silently here and never surfaced.
 *
 * It is created `private` so it cannot be browsed or auto-joined: the only way
 * into one of these is to have been picked when the Catch-up was started.
 */
export async function createCatchupWithPeople(input: {
  name: string;
  memberIds: string[];
}) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    // Starting a Catch-up enrols other named people and notifies every one of
    // them. That is reaching real members, so it waits for a confirmed address.
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };

    // Creation notifies every named member, so it is metered (audit M2).
    const limited = await rateLimit("catchups", session.user.id);
    if (!limited.ok) return { error: limited.error };

    const parsed = createCatchupWithPeopleSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { name, memberIds } = parsed.data;
    const creatorId = session.user.id;

    // The creator is always in, and never twice. Anyone a Catch-up may not
    // hold (`CATCHUP_PEOPLE`: a teacher, a blocked or leaving account, or one
    // not yet confirmed and verified) is dropped rather than failing the
    // whole creation: the picker can go stale between rendering and
    // submitting, and a hand-crafted call must not enrol somebody the picker
    // would never have offered (bug audit 3, L10-01).
    const invitedIds = [...new Set(memberIds.filter((id) => id !== creatorId))];
    const realMembers = invitedIds.length
      ? await prisma.user.findMany({
          where: { id: { in: invitedIds }, AND: [CATCHUP_PEOPLE] },
          select: { id: true },
        })
      : [];
    const memberRows = [
      { userId: creatorId, role: "admin" },
      ...realMembers.map((u) => ({ userId: u.id, role: "member" })),
    ];

    const now = new Date();
    const made = await prisma.$transaction(async (tx) => {
      /* ONE CREATION AT A TIME PER CREATOR (bug audit 3, T2a-08). The twin
         read below ran before this transaction, and at READ COMMITTED two
         requests in flight together (two tabs, a retried request) each missed
         the other's uncommitted Catch-up and both made one, ringing everyone
         named twice. Holding the creator's own row first, the second waits for
         the first to commit, and its twin read, a fresh statement, finds it.
         FOR NO KEY UPDATE is the lock a plain update of the row takes, so rows
         that merely point at this member are not held up; Prisma cannot say
         it, hence the raw read. */
      await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${creatorId} FOR NO KEY UPDATE`;

      /* The server half of the double-submit guard (audit Low 29).
       *
       * A duplicated invocation minted a WHOLE second Catch-up -- its own
       * group, its own Edition 1 -- and notified up to a hundred people about
       * it twice. The rate limit caps volume, not duplicates. A group is free
       * text so no unique index can dedupe it; the same creator starting the
       * same name seconds apart is a double press, and the first one is handed
       * back as though this call had made it. */
      const twin = await tx.catchup.findFirst({
        where: {
          createdById: creatorId,
          createdAt: { gte: new Date(Date.now() - DOUBLE_SUBMIT_MS) },
          group: { name },
        },
        select: { id: true },
      });
      if (twin) return { catchupId: twin.id, twin: true };

      const group = await tx.group.create({
        data: {
          name,
          creatorId,
          members: { create: memberRows },
        },
        select: { id: true, name: true },
      });
      /* A Catch-up gets its photograph at the moment it is made, not the
         first time somebody thinks to add one (spec 3.4). The one its people
         see least on the Catch-ups they already have, which the member rows
         written just above are what make askable; ties seeded off the group
         id, so a retried creation lands on the same picture. */
      const picture = await pickCatchupPicture(tx, group.id);
      const catchup = await tx.catchup.create({
        data: {
          groupId: group.id,
          createdById: creatorId,
          inviteToken: newInviteToken(),
          pictureSrc: picture.src,
          pictureFocus: picture.focus,
        },
      });
      // Edition 1 opens straight into `collecting` with NO questions. Questions
      // are no longer picked at creation time (owner: "why would I need to add
      // questions while creating the catch-up?"), so an empty collecting Edition
      // is the correct initial state: the home screen's whole job right now is
      // to collect them.
      const edition = await tx.catchupEdition.create({
        data: {
          catchupId: catchup.id,
          number: 1,
          status: "collecting",
          questionsCloseAt: deadlineIn(now, QUESTION_WINDOW_DAYS),
        },
      });
      await notifyQuestionsOpen(tx, {
        catchupId: catchup.id,
        editionId: edition.id,
        groupId: group.id,
        groupName: group.name,
        excludeUserId: creatorId,
      });
      return { catchupId: catchup.id, twin: false };
    });

    revalidatePath("/catchups");
    if (!made.twin) revalidatePath(`/catchups/${made.catchupId}`);
    return { success: true as const, catchupId: made.catchupId };
  });
}

/**
 * Accept a Catch-up invite link.
 *
 * The token is the whole authorisation: holding it is the invitation, the same
 * way holding a WhatsApp group link is. So there is nothing to check against
 * the caller beyond being signed in, and nothing here reads a client-supplied
 * catchupId: the token resolves to exactly one Catch-up or to nothing. Which
 * is why a Keeper's removal changes it (`removeCatchupMember`, L12-09), as
 * WhatsApp's own "Reset link" does: a removed member's copy stops resolving.
 *
 * Idempotent. Following the same link twice, or landing on it as an existing
 * member, is a no-op that still returns the id, because the honest response to
 * "join this" from someone already in it is to show them the Catch-up.
 *
 * Ended Catch-ups refuse: joining something nobody will write in again is a
 * dead end, and it is better to say so than to add a silent membership.
 */
export async function joinCatchupByToken(token: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    // Joining puts this account inside a private group, reading and writing
    // among people who shared the link in good faith (trust model, Stage 2).
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    // Catch-ups is an alumni feature; an invite link forwarded to a teacher
    // must not enrol an account that cannot open the section.
    if (
      session.user.accountType === "teacher" ||
      session.user.accountType === "ex_teacher"
    ) {
      return { error: "Catch-ups are for the old students." };
    }
    if (typeof token !== "string" || !/^[a-f0-9]{32}$/.test(token)) {
      return { error: "That invite link is not valid." };
    }

    const catchup = await prisma.catchup.findUnique({
      where: { inviteToken: token },
      select: { id: true, status: true, groupId: true, group: { select: { name: true } } },
    });
    if (!catchup) return { error: "That invite link is not valid." };
    if (catchup.status === "ended") {
      return { error: "This Catch-up has ended." };
    }

    // upsert, not create: two taps on the button, or a link followed twice,
    // must not throw on the (groupId, userId) unique.
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: catchup.groupId, userId: session.user.id } },
      create: { groupId: catchup.groupId, userId: session.user.id, role: "member" },
      update: {},
    });
    revalidatePath("/catchups");
    revalidatePath(`/catchups/${catchup.id}`);
    return { success: true as const, catchupId: catchup.id, groupName: catchup.group.name };
  });
}

/**
 * Keeper-only: rename the Catch-up.
 *
 * The Name row in the settings surface (spec 10.3) is the first thing that
 * needed this, and nothing had it: a Catch-up could be named at creation and
 * never again. The drawn panel states Name for EVERY member, because a
 * Catch-up's settings are the Catch-up described -- but only a Keeper's row
 * opens, and this action is the half that enforces it rather than the panel.
 *
 * A BATCH CATCH-UP IS REFUSED, and it is refused by `loadKeeperScope` before
 * the question of who keeps it is even asked. That is his 2026-08-21 reasoning
 * and it is the whole reason the shortcut that renamed a batch group was
 * removed: a private naming choice must not rename a shared batch. Nobody keeps
 * a batch Catch-up, so "only the Keeper" would mean nobody, which is the
 * correct answer here rather than an accident.
 *
 * `title` is nullable and the display name falls back to the group's own name
 * (`catchupDisplayName`), so clearing the field is a legitimate act: it puts
 * the Catch-up back to being called after its group. An empty string is stored
 * as NULL rather than as "", so the fallback is one test and not two.
 *
 * Not gated on `requireVerifiedMember`: this reaches nobody. It sends no
 * notification and no email, and it changes one word on a page the people
 * involved are already reading. An ended Catch-up is not refused for the same
 * reason `setCatchupPicture` is not -- the freeze is on the Edition clock, and
 * a name is not part of the cycle.
 */
export async function renameCatchup(catchupId: string, title: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    const parsed = renameCatchupSchema.safeParse({ title });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const scope = await loadKeeperScope(catchupId, session.user.id, {
      notMember: "You are not a member of this group.",
      notKeeper: "Only the Keeper can rename this Catch-up.",
    });
    if ("error" in scope) return scope;

    await prisma.catchup.update({
      where: { id: catchupId },
      data: { title: parsed.data.title || null },
    });
    revalidatePath(`/catchups/${catchupId}`);
    revalidatePath("/catchups");
    return { success: true };
  });
}

/* `updateCatchupCadence` stood here: the Keeper's choice of every two weeks,
   every month or every three months, and the rescheduling of whatever was
   already booked. There is no rhythm since 2026-10-17 (his: "You should just
   be able to start it whenever you want"); `startEdition` below is the only
   way an Edition begins. */

/**
 * Replace the Catch-up's photograph, and where its crop is taken from.
 *
 * WHO MAY: whoever may run the Catch-up, and on a BATCH Catch-up anyone in the
 * batch -- his answer to owner question 18, 2026-09-07: "anyone can replace the
 * batch picture." The rule itself is `mayChangeCatchupPicture`, pure and
 * tested, and it says there why a picture escapes the accident rule that keeps
 * every other Catch-up-level control in the Keeper's hands: it is reversible,
 * it destroys nothing, and nobody keeps a batch Catch-up, so "only the Keeper"
 * would mean nobody at all on the Catch-ups most members are in.
 *
 * WHAT MAY BE WRITTEN, and this is the half that matters. `pictureSrc` goes
 * into a column every member of the Catch-up then loads in their browser, so
 * an arbitrary url here is somebody else's server being told who read what,
 * from a settings row. Exactly two things pass: a path in the shipped pool, or
 * an image this app minted under the CALLER's own `uploads/<their id>/` prefix
 * -- the same `ownedUploadUrls` rule a post's images go through (audit C2/M10).
 * `pictureFocus` is interpolated into a style attribute, so it is matched
 * against a pattern rather than trusted.
 *
 * Not gated on `requireVerifiedMember`: this reaches nobody. It sends no
 * notification and no email, it changes one picture on a page the people
 * involved are already reading, and the next person who dislikes it changes it
 * back.
 *
 * An ended Catch-up is NOT refused, and that is deliberate: the freeze is on
 * the Edition clock (`refuseIfEnded`), and a photograph is not part of the
 * cycle. Tidying the picture on something that has ended is harmless.
 */
export async function setCatchupPicture(
  catchupId: string,
  picture: { src: string; focus: string }
) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    const src = typeof picture?.src === "string" ? picture.src : "";
    const focus = typeof picture?.focus === "string" ? picture.focus : "";
    if (!isValidPictureFocus(focus)) return { error: "That crop is in an unexpected shape." };

    const uploaded = !isPoolPicture(src);
    if (uploaded) {
      // Bytes into a bucket, which the demo does not do (see the notable
      // absences on ALLOWED_WRITE_MODELS). The pool half above works there in
      // full, so a visitor can still change the picture.
      if (IS_DEMO) {
        return { error: "Uploading a picture needs a bucket, so the demo keeps that one switched off. The gallery above works." };
      }
      const owned = ownedUploadUrls([src], session.user.id);
      if (!owned.ok) return { error: "That picture is not one of yours." };
    }

    const catchup = await prisma.catchup.findUnique({
      where: { id: catchupId },
      // `batchYear` is the whole test for "this is a batch Catch-up" (F6: a
      // batch is a Group with the year set, and a Catch-up is one row per
      // Group). Batch Catch-ups arrive in build phase 4; the guard is written
      // now so that phase does not have to widen it.
      select: { id: true, createdById: true, groupId: true, group: { select: { batchYear: true } } },
    });
    if (!catchup) return { error: "Catch-up not found." };
    const membership = await loadMembership(catchup.groupId, session.user.id);
    if (!membership) return { error: "You are not a member of this Catch-up." };
    if (
      !mayChangeCatchupPicture({
        viewerId: session.user.id,
        createdById: catchup.createdById,
        groupRole: membership.role,
        batchYear: catchup.group.batchYear,
      })
    ) {
      return { error: "Only a Keeper can change this Catch-up's picture." };
    }

    await prisma.catchup.update({
      where: { id: catchupId },
      data: { pictureSrc: src, pictureFocus: focus },
    });
    revalidatePath(`/catchups/${catchupId}`);
    revalidatePath("/catchups");
    return { success: true as const };
  });
}

/* `pauseCatchup` and `resumeCatchup` stood here, with the arithmetic that gave
   a resumed Edition back the days its hold took. Holding meant "nothing goes
   out until you say", which is what every Catch-up is now between Editions:
   nothing starts until somebody starts it (2026-10-17). Inside an Edition,
   "give everyone longer" is the same act with a date on it. Every batch
   Catch-up was made paused so that nobody was bothered by one they had not
   asked for; being idle does that now, with no switch to find. */

/**
 * Keeper-only: end a Catch-up. Past published Editions stay readable forever.
 *
 * NOT WHILE AN EDITION IS RUNNING (bug audit 3, T2a-07; his Q2, 2026-10-29).
 * The clock stops for an ended Catch-up, so an Edition caught collecting or
 * answering stayed that way for good: that week's answers could never be read
 * by anyone, its page said "not out yet" for ever, and the confirmation did
 * not mention it. He chose refusing over sending it out first or throwing it
 * away, so the Keeper ends it once the Edition is over, and the End row says
 * so. The check and the write are one statement, run while this transaction
 * holds the Catch-up's row, which `openEdition` also takes first and only while
 * the Catch-up has not ended (A3 review): a Start in the same instant either
 * commits first and its Edition is seen here, or finds the Catch-up ended.
 */
export async function endCatchup(catchupId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    // It ends the Catch-up for everyone in it, so it is a Stage 2 write like
    // every control here that reaches other members (bug audit 3, L10-01).
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    if (IS_DEMO) return { error: "Ending a Catch-up cannot be undone, so the demo keeps that one switched off." };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };

    const scope = await loadKeeperScope(catchupId, session.user.id, {
      notMember: "You are not a member of this group.",
      notKeeper: "Only the Keeper can end this Catch-up.",
    });
    if ("error" in scope) return scope;

    const ended = await prisma.$transaction(async (tx) => {
      await tx.catchup.updateMany({ where: { id: catchupId }, data: { updatedAt: new Date() } });
      return tx.catchup.updateMany({
        where: { id: catchupId, editions: { none: RUNNING_EDITION_WHERE } },
        data: { status: "ended" },
      });
    });
    if (ended.count === 0) {
      return { error: "An Edition is running. You can end this Catch-up once it is over." };
    }
    revalidatePath(`/catchups/${catchupId}`);
    return { success: true };
  });
}

// ─── Prompts (spec 3.3.1) ──────────────────────────────────────────────────────

/**
 * Submit a question for the current Edition, named or anonymous (`showAsker`).
 * The author is always stored regardless of `showAsker`.
 *
 * Every submission goes straight into the Edition (owner, 2026-08-05: "don't
 * make the keeper verify everyone's questions, let it automatically be
 * included in the round"). The Keeper's approval step is gone; what they keep
 * is the ability to REMOVE a question and to reorder the list, which is the
 * moderation that actually gets used. The pending-submission cap went with it
 * (nothing pends any more); the silent per-Edition ceiling stays as the only
 * limit, and it is a runaway guard rather than a budget anyone is asked to
 * manage.
 */
export async function submitPrompt(input: {
  editionId: string;
  text: string;
  category?: PromptCategory | null;
  showAsker?: boolean;
}) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    // A question put to a whole Edition, under your name or anonymously. Same
    // footing as a post.
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };

    const parsed = submitPromptSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { editionId, text, category, showAsker } = parsed.data;

    const scope = await loadMemberEdition(editionId, session.user.id);
    if ("error" in scope) return scope;
    const { edition, membership } = scope;
    if (edition.status !== "collecting") {
      return { error: "The question window for this Edition is closed." };
    }
    const ended = refuseIfEnded(edition.catchup.status);
    if (ended) return ended;
    const idle = refuseIfIdle(edition);
    if (idle) return idle;

    /* Deliberately NOT batch-aware, unlike the Edition-scoped controls below
       this one in the file. This decides an ATTRIBUTION (`source`), not a
       permission: it is what tells an anonymous asker's own byline from a
       library pick, and every batch member being a Keeper for the cycle does
       not make their own question one the Catch-up itself asked. */
    const keeper = isEffectiveKeeper({
      viewerId: session.user.id,
      createdById: edition.catchup.createdById,
      groupRole: membership.role,
    });

    /* `position` is the Edition's rendered, reorderable order, and this is "next
       in line" -- but it used to be the COUNT of accepted rows, which is not
       the same thing the moment one is removed. Positions 0,1,2 minus the
       middle one leaves 0 and 2, and the count is 2, so the next question
       landed on top of the last one. Not a race: a certainty, after any
       removal (audit Lows 27, 34, 57).
       
       Read as max+1, inside the same transaction as the cap check so both
       reads describe one moment. That is a consistent SNAPSHOT, not a
       serialization: this is a plain transaction, so it runs at READ
       COMMITTED, and two submissions arriving together each read a state
       without the other's uncommitted insert. Both can therefore see room for
       the last slot, and both can land on the same position -- a 41st question
       once in a blue moon, or two sharing a slot (audit C-029). Tolerated
       rather than serialized: the cap is a soft ceiling on a co-operative act,
       and every surface that renders these breaks a position tie on createdAt,
       so a shared slot is a stable order rather than a flicker. If this ever
       needs to be a hard guarantee it is an isolationLevel, not a comment.
       (Legacy rows from before auto-accept may still be sitting pending; they
       are excluded, exactly as the reorder branch excludes them, so they cannot
       push live questions out of sequence.) */
    const created = await prisma.$transaction(async (tx) => {
      /* The window, re-read at write time (write-path review, phase 13). The
         status check above is a read before this transaction, and a Keeper's
         "Open answering" or the clock can land in between; a question
         arriving after answering opened would change the Edition under
         people already answering it. `submitEntry` makes the same check for
         the same reason (audit C-027). */
      const open = await tx.catchupEdition.count({ where: { id: editionId, status: "collecting" } });
      if (open === 0) return "closed" as const;

      const { _max, _count } = await tx.catchupPrompt.aggregate({
        where: { editionId, accepted: true },
        _max: { position: true },
        _count: true,
      });
      if (_count >= MAX_ACCEPTED_PROMPTS_PER_EDITION) return null;

      const row = await tx.catchupPrompt.create({
        data: {
          editionId,
          authorId: session.user.id,
          text,
          category: category ?? null,
          source: keeper ? "keeper" : category ? "library" : "member",
          showAsker,
          accepted: true,
          position: (_max.position ?? -1) + 1,
        },
        select: { id: true },
      });
      return row;
    });

    if (created === "closed") {
      return { error: "The question window for this Edition is closed." };
    }
    if (!created) {
      return { error: "This Edition has as many questions as it can hold. Remove one to add another." };
    }
    /* Two things used to happen here and both went with the rhythm
       (2026-10-17). The first question into a DORMANT Edition restarted its
       window, and a batch's third question started its first one. An Edition
       that fizzled, or a batch nobody has started, is idle now, and the
       refusal above keeps questions out of it: Start is the one way in. */
    const prompt = created;

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true, promptId: prompt.id, accepted: true };
  });
}

export type CuratePromptInput =
  | { action: "remove"; promptId: string }
  | { action: "reorder"; editionId: string; orderedPromptIds: string[] };

/**
 * Curation of an Edition's questions (spec 3.3): remove one, or persist a
 * new order. Both require the cycle -- the Keeper on a people Catch-up, any
 * member on a batch one (owner, 2026-09-27) -- and only run while the
 * Edition is still `collecting`.
 *
 * There is no longer an "accept" action. Every question now goes straight into
 * the Edition (owner, 2026-08-05), so there is nothing to approve; removing and
 * reordering are the moderation that is left. The branch was deleted rather
 * than kept for rows written before that change, because there are none: the
 * table held nine prompts and zero pending ones when this was verified, so
 * carrying an approval path nothing can reach would have been scaffolding
 * around an empty room.
 */
export async function curatePrompt(input: CuratePromptInput) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    // Removing a question takes it out of everyone's Edition: the same Stage
    // 2 footing as asking one. On a batch every member holds this, so the
    // stage is the only thing between an unproven signup and the class's
    // questions (bug audit 3, L10-01).
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };

    if (input.action === "reorder") {
      const parsed = curateReorderSchema.safeParse(input);
      if (!parsed.success) return { error: "Invalid request." };
      const { editionId, orderedPromptIds } = parsed.data;

      const scope = await loadKeeperEdition(editionId, session.user.id, {
        notKeeper: "Only the Keeper can reorder questions.",
        refuseEnded: true,
        // Choosing questions is a cycle verb (owner, 2026-09-27).
        allowBatch: true,
      });
      if ("error" in scope) return scope;
      const { edition } = scope;
      if (edition.status !== "collecting") {
        return { error: "Questions can only be reordered while the window is open." };
      }

      // Defense in depth: only touch already-accepted prompts that actually
      // belong to this edition (reordering is a property of the accepted list).
      const owned = await prisma.catchupPrompt.findMany({
        where: { editionId, id: { in: orderedPromptIds }, accepted: true },
        select: { id: true },
      });
      const ownedIds = new Set(owned.map((p) => p.id));
      const updates = orderedPromptIds
        .filter((id) => ownedIds.has(id))
        .map((id, index) => prisma.catchupPrompt.update({ where: { id }, data: { position: index } }));
      if (updates.length > 0) await prisma.$transaction(updates);

      revalidatePath(`/catchups/${edition.catchupId}`);
      return { success: true };
    }

    const parsed = curateRemoveSchema.safeParse(input);
    if (!parsed.success) return { error: "Invalid request." };
    const { promptId } = parsed.data;

    const prompt = await prisma.catchupPrompt.findUnique({
      where: { id: promptId },
      select: { id: true, editionId: true },
    });
    if (!prompt) return { error: "Question not found." };

    const scope = await loadKeeperEdition(prompt.editionId, session.user.id, {
      notKeeper: "Only the Keeper can curate questions.",
      refuseEnded: true,
      allowBatch: true,
    });
    if ("error" in scope) return scope;
    const { edition } = scope;
    if (edition.status !== "collecting") {
      return { error: "Questions can only be curated while the window is open." };
    }

    /* THE WINDOW IS HELD WHILE THE QUESTION GOES (bug audit 3, L1-02). The
       status above is a read, and an open landing between it and a plain
       delete left an answering Edition with nothing to answer: everyone told
       answers were open, nobody able to write, and an empty Edition out at the
       deadline. Touching the Edition on `collecting` takes its row, which both
       opens also take (each counts its questions after its own swap), so
       either this delete commits first and the open sees it, or the open wins
       and this deletes nothing. `deleteMany`: a second remover of the same
       question finds it gone, which is what both of them asked for. */
    const removed = await prisma.$transaction(async (tx) => {
      const open = await tx.catchupEdition.updateMany({
        where: { id: prompt.editionId, status: "collecting" },
        data: { updatedAt: new Date() },
      });
      if (open.count === 0) return false;
      await tx.catchupPrompt.deleteMany({ where: { id: promptId, editionId: prompt.editionId } });
      return true;
    });
    if (!removed) return { error: "This Edition already moved on." };

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true };
  });
}

// ─── Edition transitions (the Keeper's early triggers, any batch member's; the clock drives the rest) ─

/** Keeper-only on a people Catch-up; any member on a batch one. Collecting
 *  -> answering, ahead of `questionsCloseAt`. */
export async function openAnswering(editionId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    // Rings everyone taking part: a Stage 2 write, like Start (bug audit 3,
    // L10-01; every batch member holds it).
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    if (typeof editionId !== "string" || !editionId) return { error: "Invalid request." };

    const scope = await loadKeeperEdition(editionId, session.user.id, {
      notKeeper: "Only the Keeper can open answering.",
      refuseEnded: true,
      allowBatch: true,
    });
    if ("error" in scope) return scope;
    const { edition } = scope;
    if (edition.status !== "collecting") {
      return { error: "This Edition is not collecting questions right now." };
    }
    const idle = refuseIfIdle(edition);
    if (idle) return idle;

    const now = new Date();
    const patch = answeringPatch(edition, now);

    const applied = await unlessEmpty(prisma.$transaction(async (tx) => {
      /* An Edition with nothing to answer must not open (audit C-021).
       *
       * The clock already refuses this: planNextAction returns "extend the
       * questions" and then leaves the Edition dormant rather than opening an
       * empty one, precisely to avoid the reminder loop B-062 closed. The
       * Keeper's own early trigger had no such rule -- and the button being
       * hidden is not the guard, because a stale second tab, a second Keeper,
       * or a hand-made call can all still arrive here just as the last
       * question is removed.
       *
       * SWAP FIRST, THEN COUNT (bug audit 3, L1-02). This counted first, and a
       * count is a read: a removal landing a moment after it still left an
       * answering Edition with nothing in it. With the swap first the
       * Edition's row is held, so a removal that took it first has committed
       * and is counted, and one that comes second finds the Edition moved on
       * (`curatePrompt` holds the same row). There is no way back out of
       * `answering` once committed, so an empty count rolls the swap back. */
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "collecting" },
        data: patch,
      });
      if (cas.count === 0) return "moved" as const;
      const accepted = await tx.catchupPrompt.count({
        where: { editionId, accepted: true },
      });
      if (accepted === 0) throw new EmptyAfterSwap();

      await notifyAnswersOpen(tx, {
        catchupId: edition.catchupId,
        editionId,
        groupId: edition.catchup.group.id,
        groupName: edition.catchup.group.name,
        excludeUserId: session.user.id,
      });
      return "opened" as const;
    }));
    if (applied === "empty") {
      return { error: "There are no questions in this Edition yet, so there is nothing to answer." };
    }
    if (applied === "moved") return { error: "This Edition already moved on." };

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true };
  });
}

/**
 * Keeper-only on a people Catch-up; any member on a batch one. Answering ->
 * published, ahead of `answersCloseAt`.
 *
 * NOT WITH NOBODY'S ANSWERS IN IT (bug audit 3, C3-01; his Q15, 2026-10-29).
 * This used to run the clock's too-few rule, which moves the deadline to
 * three days from NOW: right at the deadline that is three more days, but in
 * a week's first days it moved the deadline up to four days EARLIER, rang
 * everyone again, spent the Edition's one safety net and told the presser
 * nothing, so a puzzled second press published an empty Edition to every
 * member. A press with no answers
 * now writes nothing and comes back `nobodyAnswered`, which the settings
 * surface turns into the offer of three more days (`extendDeadline`). The
 * clock's own rule at the deadline is unchanged.
 *
 * The answers are counted AFTER each write's swap, in its transaction, as
 * `openAnswering` counts its questions (bug audit 3, L1-02), and only rows
 * with something in them (`ANSWERED_ENTRY_WHERE`). Counting every row before
 * the swap let an answer emptied as the press landed, still waiting for its
 * withdrawal, count as somebody having answered (A3 review of C3-01).
 *
 * It was `closeAndPrepare` and it stopped a step short, at a 24-hour hold
 * nobody could read through; `publishNow` existed only to skip that hold and
 * is deleted with it. Closing early now IS publishing, which is what a Keeper
 * pressing it always meant.
 */
export async function closeAndPublish(editionId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    // Ends everyone's week of writing and rings the whole group, one way: a
    // Stage 2 write, like Start (bug audit 3, L10-01; every batch member
    // holds it).
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    if (typeof editionId !== "string" || !editionId) return { error: "Invalid request." };

    const scope = await loadKeeperEdition(editionId, session.user.id, {
      notKeeper: "Only the Keeper can close answers early.",
      refuseEnded: true,
      allowBatch: true,
    });
    if ("error" in scope) return scope;
    const { edition } = scope;
    if (edition.status !== "answering") {
      return { error: "This Edition is not open for answers right now." };
    }

    const now = new Date();
    // The refusal and its marker, the same from either way out below.
    const nobodyAnswered = { error: "Nobody has answered yet.", nobodyAnswered: true as const };

    /* A TIME CAPSULE CLOSES INTO `sealed` (build phase 14): the Keeper's early
       close is the clock's close, so it seals exactly as the deadline would,
       with everyone told the day it opens. The flag was read fresh by
       loadMemberEdition and is required again by the write. */
    if (edition.timeCapsule) {
      const sealed = sealPatch(now);
      const opensAt = sealed.publishAt as Date;
      const didSeal = await unlessEmpty(prisma.$transaction(async (tx) => {
        const cas = await tx.catchupEdition.updateMany({
          where: { id: editionId, status: "answering", timeCapsule: true },
          data: sealed,
        });
        if (cas.count === 0) return "moved" as const;
        if ((await tx.catchupEntry.count({ where: { editionId, ...ANSWERED_ENTRY_WHERE } })) === 0) {
          throw new EmptyAfterSwap();
        }
        await notifySealed(tx, {
          catchupId: edition.catchupId,
          editionId,
          groupId: edition.catchup.group.id,
          groupName: edition.catchup.group.name,
          opensAt,
          excludeUserId: session.user.id,
        });
        return "sealed" as const;
      }));
      if (didSeal === "empty") return nobodyAnswered;
      if (didSeal === "moved") return { error: "This Edition already moved on." };

      revalidatePath(`/catchups/${edition.catchupId}`);
      revalidatePath("/catchups");
      return { success: true, sealed: true };
    }

    /* The publish and the bell in one transaction, exactly as the clock's own
       `applyEditionAction` does it. An
       Edition published without `notifyPublished` is an Edition that, for its
       members, simply never happened -- which is why the migration that
       drained `preparing` published those rows through this path rather than
       in SQL.

       `timeCapsule: false` on the compare-and-swap: if the flag the check above
       read were ever wrong, Postgres refuses to publish a capsule rather than
       trusting it (his 34b). */
    const patch = publishPatch(now);
    const applied = await unlessEmpty(prisma.$transaction(async (tx) => {
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "answering", timeCapsule: false },
        data: patch,
      });
      if (cas.count === 0) return "moved" as const;
      if ((await tx.catchupEntry.count({ where: { editionId, ...ANSWERED_ENTRY_WHERE } })) === 0) {
        throw new EmptyAfterSwap();
      }
      await notifyPublished(tx, {
        catchupId: edition.catchupId,
        editionId,
        groupId: edition.catchup.group.id,
        groupName: edition.catchup.group.name,
        excludeUserId: session.user.id,
      });
      return "published" as const;
    }));
    if (applied === "empty") return nobodyAnswered;
    if (applied === "moved") return { error: "This Edition already moved on." };

    revalidatePath(`/catchups/${edition.catchupId}`);
    revalidatePath(`/catchups/edition/${editionId}`);
    revalidatePath("/catchups");
    return { success: true };
  });
}

/**
 * Start an Edition: anyone in the Catch-up, whenever it is idle.
 *
 * THE ONLY WAY ONE BEGINS, since 2026-10-17. There is no rhythm; his words:
 * "they should have been able to start one when they wished. They shouldn't
 * have to wait for three weeks or two months or whatever", and "You should just
 * be able to start it whenever you want. And then it ends when it ends. And
 * then it just doesn't go until you start it again." It replaces "Start the
 * next Edition now", which lived in the settings panel where nobody found it:
 * a 2024 alumnus made a whole second Catch-up of her batch rather than wait for
 * December (`2026-10-17-fold-2024-duplicate-into-batch.sql`).
 *
 * WHO: anyone in it, batch or people Catch-up. His answer, the same day,
 * "Anyone in it", over Keeper-only: one rule everywhere. The accident worry
 * (N30) is met by the confirmation the home opens first, which says how many
 * people will be told.
 *
 * Verified and metered, because it rings every bell in the group. The shared
 * "catchups" bucket is the one creation uses, so starting, finishing early and
 * starting again cannot become a way to page forty people every few minutes.
 *
 * The opening itself is `openEdition`, which also refuses when one is already
 * running and settles two simultaneous presses into one Edition.
 */
export async function startEdition(catchupId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };

    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };

    const ctx = await loadCatchupContext(catchupId, session.user.id);
    if (!ctx) return { error: "Catch-up not found." };
    if (!ctx.membership) return { error: "You are not a member of this group." };
    const ended = refuseIfEnded(ctx.catchup.status);
    if (ended) return ended;
    // After the cheap refusals, so a press that was never going to work does
    // not spend the shared bucket that creation draws on too (write-path
    // review). "Already running" is decided inside `openEdition` and still
    // spends one, which is the price of deciding it where it cannot race.
    const limited = await rateLimit("catchups", session.user.id);
    if (!limited.ok) return { error: limited.error };

    const opened = await openEdition(
      { id: catchupId, group: { id: ctx.catchup.groupId, name: ctx.catchup.group.name } },
      { id: session.user.id, name: session.user.name ?? "Someone" },
      new Date()
    );
    if ("refused" in opened) {
      // Ended between the check above and the start: refuseIfEnded's sentence.
      if (opened.refused === "ended") return { error: "This Catch-up has ended." };
      return opened.refused === "running"
        ? { error: "An Edition is already running here." }
        : { error: "Somebody just started one. Reload the page." };
    }

    revalidatePath(`/catchups/${catchupId}`);
    revalidatePath("/catchups");
    return { success: true as const };
  });
}

/**
 * Keeper-only on a people Catch-up, any member on a batch one: push the
 * current phase's deadline out by three days, a week or two weeks
 * (`extendDaysSchema`). Works on BOTH windows: `collecting` moves
 * `questionsCloseAt`, `answering` moves `answersCloseAt`. Which one is being
 * moved is read from the Edition's own fresh status, never from the caller, so a
 * stale page cannot extend the phase it thinks it is looking at.
 *
 * `seenCloseAt` is the deadline the caller's page showed, and the
 * compare-and-swap is on it (`planExtension`, bug audit 3, T3-06): two people
 * tapping "A week" on the same page add one week, and the second is told the
 * deadline moved. It used to swap on the value this action had just read
 * itself, which always matched, so every tap added the whole extension again.
 * The new date goes back to the caller, which says it.
 *
 * `published` is refused: there is no window left to extend, and reopening a
 * sealed Edition is a different (and unasked-for) feature.
 */
export async function extendDeadline(editionId: string, days: number, seenCloseAt: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    // Moves everyone's deadline: a Stage 2 write, like Start (bug audit 3,
    // L10-01; every batch member holds it).
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    if (typeof editionId !== "string" || !editionId) return { error: "Invalid request." };
    const parsedDays = extendDaysSchema.safeParse(days);
    if (!parsedDays.success) return { error: "Pick three days, a week or two weeks." };
    if (typeof seenCloseAt !== "string" || Number.isNaN(Date.parse(seenCloseAt))) {
      return { error: "Invalid request." };
    }

    const scope = await loadKeeperEdition(editionId, session.user.id, {
      notKeeper: "Only a Keeper can extend the deadline.",
      refuseEnded: true,
      allowBatch: true,
    });
    if ("error" in scope) return scope;
    const { edition } = scope;
    const idle = refuseIfIdle(edition);
    if (idle) return idle;

    const moved = { error: "The deadline just moved. Reload and try again." };
    const plan = planExtension(edition, parsedDays.data, seenCloseAt, new Date());
    if (!plan.ok) {
      // "closed" is a status past the two open windows; "moved" is a page
      // that showed a deadline the row no longer has.
      return plan.reason === "closed"
        ? { error: "This Edition has closed. There is no deadline left to extend." }
        : moved;
    }

    const cas = await prisma.catchupEdition.updateMany({
      where:
        edition.status === "collecting"
          ? { id: editionId, status: "collecting", questionsCloseAt: plan.deadline }
          : { id: editionId, status: "answering", answersCloseAt: plan.deadline },
      data: plan.patch,
    });
    if (cas.count === 0) return moved;

    // Any reminder already in the bell now names a deadline that is no longer
    // true ("Last day to answer" when there is a week left). Clear them; the
    // daily reminder writes an accurate one on its next pass.
    if (edition.status === "answering") {
      await prisma.notification.deleteMany({
        /* Matches what `notifyReminder` now writes: the home, since answering
           moved onto it in build phase 7. A stale reminder still pointing at
           `/catchups/<id>/answer` is left alone by this delete and cleared by
           the dated migration instead. */
        where: { type: "catchup_reminder", link: `/catchups/${edition.catchupId}` },
      });
    }

    revalidatePath(`/catchups/${edition.catchupId}`);
    return {
      success: true as const,
      days: parsedDays.data,
      phase: edition.status === "collecting" ? ("questions" as const) : ("answers" as const),
      closesAt: plan.closesAt.toISOString(),
    };
  });
}

/**
 * Make this Edition a time capsule, or take it back (build phase 14, spec 3.12).
 *
 * His, 2026-09-09: "Maybe something in settings. Say make this a time
 * capsule." And 2026-09-14: "33 time capsule is just for one edition. 34b.
 * 35 yes an edition can."
 *
 * It flips one flag and nothing else. The clock does the rest: when answering
 * closes the Edition goes `sealed` instead of `published`, and a year later it
 * opens and everyone is told (`planNextAction`).
 *
 * THE GATE, in the order it runs:
 *  - A verified member. It decides what happens to everybody's writing for a
 *    year, which is the tier every group-reaching write here sits at.
 *  - In this Catch-up, via `loadMemberEdition`, which then brings the clock
 *    current, so "still collecting" means now and not when the page was
 *    drawn.
 *  - Not ended (`refuseIfEnded`).
 *  - WHO: `mayMarkTimeCapsule`. The Keepers of a people Catch-up, anyone in a
 *    batch. Deliberately NOT `loadKeeperEdition`, which turns a batch away
 *    before asking anything else, because it guards transitions nobody can
 *    undo (his N30). This is a setting, reversible until answering opens, and
 *    his 35 is that a batch Edition can be a capsule. So the batch is let in
 *    here, by name, rather than by slipping past that refusal.
 *  - WHEN: `decideTimeCapsuleMark`, collecting only, and again inside the write
 *    as the compare-and-swap, so a Keeper opening answering (or the clock)
 *    between the check and the write cannot change it under people already
 *    writing.
 *
 * No notification: the answering card is where a writer learns it, and that
 * is waiting on the owner's pick in /lab/catchups/capsule. Allowed on the
 * demo, which writes `CatchupEdition` already: it seals nothing until answering
 * closes, and the nightly reset takes it.
 *
 * NOTHING CALLS THIS YET.
 */
export async function setEditionTimeCapsule(editionId: string, timeCapsule: boolean) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof editionId !== "string" || !editionId) return { error: "Invalid request." };
    if (typeof timeCapsule !== "boolean") return { error: "Invalid request." };

    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };

    const scope = await loadMemberEdition(editionId, session.user.id);
    if ("error" in scope) return scope;
    const { edition, membership } = scope;

    const ended = refuseIfEnded(edition.catchup.status);
    if (ended) return ended;

    if (
      !mayMarkTimeCapsule({
        viewerId: session.user.id,
        createdById: edition.catchup.createdById,
        groupRole: membership.role,
        batchYear: edition.catchup.group.batchYear,
      })
    ) {
      return { error: "Only a Keeper can make this Edition a time capsule." };
    }

    const when = decideTimeCapsuleMark(edition.status);
    if (!when.ok) return { error: when.error };

    const cas = await prisma.catchupEdition.updateMany({
      where: { id: editionId, status: "collecting" },
      data: { timeCapsule },
    });
    if (cas.count === 0) {
      return { error: "Questions have just closed on this Edition, so this can no longer change." };
    }

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true as const, timeCapsule };
  });
}

// ─── Entries (spec 3.4, 3.4.1) ─────────────────────────────────────────────────

/**
 * Autosave-friendly upsert of one member's answer to one prompt, keyed by
 * `[promptId, authorId]`. Every field is independently optional so a blur on
 * just the text area does not clobber a photo or a recording saved moments
 * earlier (a field only gets written when the caller actually sent it).
 *
 * THERE IS NO SONG FIELD. A song is a pasted link like any other link now,
 * resolved into a card by build phase 10, and the three `song*` columns are
 * null on every row and dropped by
 * `prisma/migrations-manual/2026-10-11-drop-song-columns.sql` once this has
 * deployed. His word, 2026-10-09: "remove songs."
 */
export async function submitEntry(input: {
  promptId: string;
  body?: string;
  images?: string[];
  baseUpdatedAt?: string;
}) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    // An answer carries prose and images into an Edition that gets published to
    // everyone in it. The upload routes are gated too, so the images could not
    // have been produced by an unconfirmed account either.
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };

    const parsed = submitEntrySchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { promptId } = parsed.data;

    const prompt = await prisma.catchupPrompt.findUnique({
      where: { id: promptId },
      select: { id: true, editionId: true, accepted: true },
    });
    if (!prompt || !prompt.accepted) return { error: "This question is not part of the Edition." };

    const scope = await loadMemberEdition(prompt.editionId, session.user.id);
    if ("error" in scope) return scope;
    const { edition } = scope;
    if (edition.status !== "answering") {
      return { error: "Answering is not open for this Edition right now." };
    }
    const ended = refuseIfEnded(edition.catchup.status);
    if (ended) return ended;

    const hasBody = parsed.data.body !== undefined;
    const hasImages = parsed.data.images !== undefined;

    // An answer's images must be this member's own uploads, not arbitrary
    // external URLs (M10) or another member's objects (C2). `z.url()` above
    // only proved they were URLs; this proves they are ours and theirs.
    let ownedImages: string[] = [];
    if (hasImages) {
      const ownership = ownedUploadUrls(parsed.data.images!, session.user.id);
      if (!ownership.ok) return { error: ownership.error };
      ownedImages = ownership.urls;
    }

    const bodyValue = hasBody ? parsed.data.body!.trim() || null : undefined;
    const imagesValue = hasImages
      ? ownedImages.length
        ? JSON.stringify(ownedImages)
        : null
      : undefined;

    /* A recording must be one this member made, under their own
       `audio/<id>/` prefix, inside the two-minute cap. The C2 rule for sound:
       without it an answer could point at somebody else's recording, and the
       purge of a replaced one below would delete their bytes. */
    const hasAudio = parsed.data.audio !== undefined;
    let audioPatch: { audioUrl: string | null; audioSeconds: number | null; audioIsAuto: boolean } | undefined;
    if (hasAudio) {
      const audio = parsed.data.audio;
      if (audio) {
        // The demo takes no uploads, so it has no recording to attach; said at
        // the door rather than left to the ownership check's generic refusal.
        if (IS_DEMO) return { error: "The demo doesn't take recordings." };
        const verdict = ownedVoiceRecording(audio, session.user.id);
        if (!verdict.ok) return { error: verdict.error };
        audioPatch = { audioUrl: audio.url, audioSeconds: audio.seconds, audioIsAuto: audio.transcribed };
      } else {
        // Taking the recording off keeps the words. They are no longer "from
        // the recording" once there is no recording to be from.
        audioPatch = { audioUrl: null, audioSeconds: null, audioIsAuto: false };
      }
    }

    /* The lost-update guard, when the caller is holding a row version (audit
     * C-125, the same instrument editPost carries for M66).
     *
     * The answering surface autosaves the whole field on every blur, and the
     * write had no precondition: a member with the same Edition open on a
     * laptop and a phone who wrote three paragraphs on the laptop, then
     * touched the still-open phone, had the phone's stale copy silently
     * replace all of it -- and both surfaces said "Saved".
     *
     * `baseUpdatedAt` is the version this surface last saw. If the row has
     * moved on since, nobody's writing is destroyed: the save is refused and
     * the stale surface is told to reload. A caller that sends no token keeps
     * the unconditional upsert. */
    const base = parsed.data.baseUpdatedAt ? new Date(parsed.data.baseUpdatedAt) : null;
    if (base && Number.isNaN(base.getTime())) {
      return { error: "That save could not be checked. Reload and try again." };
    }

    const key = { promptId_authorId: { promptId, authorId: session.user.id } };
    const written = {
      ...(hasBody ? { body: bodyValue } : {}),
      ...(hasImages ? { images: imagesValue } : {}),
      ...(audioPatch ? audioPatch : {}),
    };
    const columns = {
      id: true,
      body: true,
      images: true,
      audioUrl: true,
      updatedAt: true,
    } as const;

    /* The window is re-read at WRITE time, not trusted from the read above
     * (audit C-027).
     *
     * Between the read and the write a Keeper's "close and send it out", or
     * any page view's clock advance, can move the Edition out of `answering`
     * -- and this write would have landed an answer in an Edition already on
     * its way out, where it appears with nobody expecting it. Counted inside
     * the transaction that does the write, so nothing can move in between.
     * (The gap used to be measured in seconds: a Spotify fetch sat here until
     * the song field was deleted on 2026-10-11.) */
    const entry = await prisma.$transaction(async (tx) => {
      const open = await tx.catchupEdition.count({
        where: { id: prompt.editionId, status: "answering" },
      });
      if (open === 0) return "closed" as const;

      /* The recording this write replaces, read in the same transaction as
         the write, so the purge after it names exactly what the row stopped
         pointing at. */
      const before = hasAudio
        ? await tx.catchupEntry.findUnique({ where: key, select: { audioUrl: true } })
        : null;
      const replacedAudio = before?.audioUrl ?? null;

      if (base) {
        const moved = await tx.catchupEntry.updateMany({
          where: { promptId, authorId: session.user.id, updatedAt: base },
          data: written,
        });
        if (moved.count === 0) return "stale" as const;
        const row = await tx.catchupEntry.findUniqueOrThrow({ where: key, select: columns });
        return { ...row, replacedAudio };
      }
      const row = await tx.catchupEntry.upsert({
        where: key,
        create: {
          editionId: prompt.editionId,
          promptId,
          authorId: session.user.id,
          body: bodyValue ?? null,
          images: imagesValue ?? null,
          audioUrl: audioPatch?.audioUrl ?? null,
          audioSeconds: audioPatch?.audioSeconds ?? null,
          audioIsAuto: audioPatch?.audioIsAuto ?? false,
        },
        update: written,
        select: columns,
      });
      return { ...row, replacedAudio };
    });

    if (entry === "closed") {
      return { error: "Answering has closed for this Edition. Your answer was not saved." };
    }
    if (entry === "stale") {
      return {
        error:
          "This answer has changed somewhere else. Reload the page before you carry on, or your writing here will replace it.",
      };
    }

    /* Erasing everything withdraws you from the Edition (audit Low 36).
     *
     * There was no delete path at all: clearing every field left the row, so a
     * member who wrote something personal and then took it all back was still
     * published -- an answer card reading "Showed up for this Edition without
     * adding anything here.", their bird in the masthead strip, and a place in
     * "12 of the group wrote in". The empty row also counted as an entry for
     * the too-few-answers rule, so an Edition whose only answer was an erased one
     * skipped the extension and published with nothing to read.
     *
     * Deleted rather than kept-and-filtered because there is nothing left in
     * it: no body, no photograph, no song, no recording. Nothing is lost that the member has
     * not already removed, and a later answer simply creates the row again.
     * The `promptId_authorId` unique makes a second delete a no-op. */
    /* A recording this save took off the answer, or swapped for a new one
       ("Record again"), is bytes no row names any more. It is the author's
       own by construction (the ownership check put it there), and it goes
       unless another of their answers still carries the same url. The count
       is outside the write's transaction, which is only a race if one url ever
       sits on two answers; finalize mints a fresh key per recording, so nothing
       produces that today. A "use this recording again" feature would need a
       lock here first. */
    if (entry.replacedAudio && entry.replacedAudio !== entry.audioUrl) {
      const stillUsed = await prisma.catchupEntry.count({ where: { audioUrl: entry.replacedAudio } });
      if (stillUsed === 0) await purgeImageUrls([entry.replacedAudio], "replaced");
    }

    if (!entry.body && !entry.images && !entry.audioUrl) {
      /* Only while it is still empty (bug audit 3, T2b-06). The write that
         emptied it has committed, and a second device holding no version
         (its page was drawn before the row existed) upserts straight onto
         the same row: deleting by id alone took that device's paragraph,
         after telling it "Saved". */
      const withdrawn = await prisma.catchupEntry.deleteMany({
        where: { id: entry.id, ...EMPTY_ENTRY_WHERE },
      });
      if (withdrawn.count > 0 || (await prisma.catchupEntry.count({ where: { id: entry.id } })) === 0) {
        revalidatePath(`/catchups/${edition.catchupId}`);
        // No row, so no version: the next save creates one afresh.
        return { success: true, entryId: null, updatedAt: null };
      }
      /* Filled again from elsewhere: the row is that save's now. This one
         keeps its own version below, so its next save is told the answer
         changed somewhere else instead of writing over it. */
    }

    /* A link pasted into the answer starts resolving now, after the response
       (build phase 10, spec 3.8), so its card is ready by the morning the
       Edition publishes rather than on the second page view after. Never
       awaited: the save must not wait on somebody else's website. */
    if (bodyValue) scheduleLinkPreviews(findLinks(bodyValue).map((f) => f.raw));

    revalidatePath(`/catchups/${edition.catchupId}`);
    /* The new version, so the surface that just saved can hold it and keep
       saving; without this every save after the first would look stale. */
    return {
      success: true,
      entryId: entry.id,
      updatedAt: entry.updatedAt.toISOString(),
    };
  });
}

/**
 * Heart one answer (spec 3.6). Hearts belong to the published reader: an
 * edition still collecting or answering hides every answer from everyone,
 * Keeper included, so a heart cannot be cast until the Edition is
 * `published`.
 */
export async function toggleEntryLove(entryId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    // Same tier as the feed's likes: a public gesture is a Stage 2 write.
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    if (typeof entryId !== "string" || !entryId) return { error: "Invalid request." };

    const entry = await prisma.catchupEntry.findUnique({
      where: { id: entryId },
      select: { id: true, authorId: true, editionId: true },
    });
    if (!entry) return { error: "Answer not found." };

    const scope = await loadMemberEdition(entry.editionId, session.user.id);
    if ("error" in scope) return scope;
    const { edition } = scope;
    if (edition.status !== "published") {
      return { error: "Hearts open once the Edition is published." };
    }

    /* Delete-first, then create and let the unique settle a tie -- the shape
       the feed's toggleLike already carries.
       
       This was a findUnique followed by a create, so two taps in the same
       instant both read "not loved" and both inserted: the loser threw a raw
       P2002 out of the action, the member saw "Something went wrong" for a
       gesture that had in fact worked, and the heart on screen ended up saying
       the opposite of the database (audit Lows 26, 32). Both outcomes below are
       the state the caller asked for, so both are reported as success. */
    const removed = await prisma.catchupEntryLove.deleteMany({
      where: { userId: session.user.id, entryId },
    });
    if (removed.count > 0) {
      return { success: true, loved: false };
    }

    let created = true;
    try {
      await prisma.catchupEntryLove.create({ data: { userId: session.user.id, entryId } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      created = false; // a concurrent tap got there first; the heart stands
    }

    if (created && entry.authorId !== session.user.id) {
      await notifyLove(prisma, {
        catchupId: edition.catchupId,
        editionId: entry.editionId,
        groupId: edition.catchup.group.id,
        groupName: edition.catchup.group.name,
        entryId,
        authorId: entry.authorId,
        likerId: session.user.id,
        likerName: session.user.name,
      });
    }

    /* No revalidatePath, and this is the whole of his "the heart's animation
       fires a second late" (brief 29). EntryLoveButton holds `liked` and
       `count` in its own state and flips both optimistically in 28ms, so the
       server tree it forced Next to rebuild was markup nobody read -- except
       that rebuilding it meant server-rendering every answer in the Edition.
       Measured on "in the loop" Edition 1 (133 answers) at 1440: 223 KB and
       1.3 to 1.8 seconds down the wire on every single tap, against the feed's
       55 KB and ~270ms. The feed's `toggleLike` deliberately has no such call
       and states the rule in its own comment: an action whose result the client
       already holds does not revalidate. It is the same rule here. */
    return { success: true, loved: true };
  });
}

/* ── Comments on an answer (build phase 9, spec 3.7) ───────────────── *
 *  His, review-2026-09-07 N1: "I feel like the comment section can be done
 *  the same way that we do it in feed ... I think we can just copy that
 *  comment section."
 *
 *  So the thread itself is not written twice: `lib/comment-thread.ts` holds
 *  the paging, the stub rule, the double-submit guard and the serialiser,
 *  on the one `Comment` table both features now share. What lives here is
 *  the half that is genuinely a Catch-up's -- WHO MAY READ AND WRITE, which
 *  is the published gate, and WHO HEARS ABOUT IT.
 *
 *  THE GATE IS THE HEART'S, EXACTLY. `toggleEntryLove` above already decided
 *  it: you must be in the group, and the Edition must be `published`. An
 *  Edition still collecting or answering hides every answer from everyone,
 *  Keeper included, so there is nothing to comment on; and once published it
 *  is open to every member whether they wrote or not (spec 3.13, closed as
 *  (a) by him on 2026-09-09). architecture.md section 8 puts comment and
 *  heart in one cell for that reason, and this keeps them there.
 *
 *  An ENDED Catch-up still takes comments, which is the same table row: the
 *  Edition stays published, and architecture 8 reads "same" across that
 *  column. Nothing here asks about the Catch-up's own state.
 */

/**
 * The three facts a comment action needs, and the refusal if it may not have
 * them. Shared by all three below so the published rule is stated once: three
 * copies of it is how one of them ends up admitting a `collecting` Edition.
 */
async function loadCommentableEntry(entryId: string, viewerId: string) {
  if (typeof entryId !== "string" || !entryId) return { error: "Invalid request." as const };
  const entry = await prisma.catchupEntry.findUnique({
    where: { id: entryId },
    select: { id: true, authorId: true, editionId: true },
  });
  if (!entry) return { error: "Answer not found." as const };

  const scope = await loadMemberEdition(entry.editionId, viewerId);
  /* `{ error: scope.error }` rather than `scope`: returning the narrowed
     object itself drags `membership` into this function's return type, and
     every caller then has to prove it is not looking at one. */
  if ("error" in scope) return { error: scope.error };
  if (scope.edition.status !== "published") {
    return { error: "Comments open once the Edition is published." as const };
  }
  return { entry, edition: scope.edition };
}

/** One page of an answer's thread.
 *
 *  Inside `runAction` like every other action here (bug audit 3, T2b-11): it
 *  was the one comment action outside it, so a throw (a crafted `take` did it,
 *  until `pageSize`) left the action raw. The thread already shows an
 *  `{ error }`; what it must never get is an empty page standing in for a
 *  failure. */
export async function loadEntryComments(
  entryId: string,
  opts?: { cursor?: string | null; take?: number }
) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return EMPTY_COMMENT_PAGE;

    /* An empty page, never an error, and never a different empty page: this
       is the same answer an entry that does not exist gives, so it cannot be
       used to discover which ids are real -- the rule `loadComments` states
       for the feed, and the reason the caller renders "No comments yet"
       either way. */
    const scope = await loadCommentableEntry(entryId, session.user.id);
    if ("error" in scope) return EMPTY_COMMENT_PAGE;

    return readCommentPage(
      { entryId },
      { userId: session.user.id, isAdmin: session.user.role === "admin" },
      opts
    );
  });
}

/** Write one comment under an answer, or under another comment on it. */
export async function createEntryComment(
  entryId: string,
  content: string,
  parentId?: string | null
) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    // The same tier as the feed's comments: writing in public is a Stage 2 write.
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };

    // Verified is not unlimited, and it is the SAME bucket as the feed's
    // (audit M2): the limit is on a person writing comments, not on which
    // page they happen to be writing them from.
    const limited = await rateLimit("comments", session.user.id);
    if (!limited.ok) return { error: limited.error };

    const parsed = entryCommentSchema.safeParse({ content, parentId: parentId || undefined });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const scope = await loadCommentableEntry(entryId, session.user.id);
    if ("error" in scope) return scope;
    const { entry, edition } = scope;

    const written = await writeComment({
      target: { entryId },
      authorId: session.user.id,
      content: parsed.data.content,
      parentId: parsed.data.parentId,
    });
    if ("error" in written) return { error: written.error };
    const { comment, repliedToId, twin } = written;

    /* Skipped when this call was the second half of a double submission: the
       bell already rang with the first one, and the bell is exactly where a
       duplicate would be noticed. */
    if (!twin) {
      const base = {
        catchupId: edition.catchupId,
        editionId: entry.editionId,
        groupId: edition.catchup.group.id,
        groupName: edition.catchup.group.name,
        entryId,
        writerId: session.user.id,
        writerName: session.user.name,
      };

      /* Who was ANSWERED, before the reparenting. Threads are one level deep,
         so a reply to a reply is stored under the root -- but the person being
         answered is the one whose name the composer printed, and notifying the
         root's author instead told somebody else entirely while the addressee
         heard nothing (audit C-016). */
      let repliedToAuthorId: string | null = null;
      if (repliedToId) {
        const parent = await prisma.comment.findUnique({
          where: { id: repliedToId },
          select: { authorId: true },
        });
        // Nullable since audit M34: a purged author's comment survives as an
        // authorless stub, and there is nobody to tell.
        repliedToAuthorId = parent?.authorId ?? null;
      }

      if (repliedToAuthorId) {
        await notifyComment(prisma, { ...base, recipientId: repliedToAuthorId, kind: "reply" });
      }
      /* The answer's author hears about it too -- unless they are the person
         just written to, which would be two bells for one sentence. */
      if (entry.authorId !== repliedToAuthorId) {
        await notifyComment(prisma, { ...base, recipientId: entry.authorId, kind: "comment" });
      }
    }

    /* No revalidatePath, for the reason `toggleEntryLove` states at length:
       the client already holds this comment and slots it in, and rebuilding
       the server tree means re-rendering every answer in the Edition. */
    return {
      success: true,
      commentId: comment.id,
      comment: serializeComment(comment, {
        userId: session.user.id,
        isAdmin: session.user.role === "admin",
      }),
    };
  });
}

/** The heart on one comment under an answer. */
export async function toggleEntryCommentLike(commentId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    if (typeof commentId !== "string" || !commentId) return { error: "Invalid request." };

    /* The comment tells us which answer, and the answer is what carries the
       gate. A comment with no `entryId` is a FEED comment and is refused here
       by the same lookup, which is the mirror of `canViewPostOfComment`
       declining a Catch-up one. */
    const row = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { entryId: true, deletedAt: true, isHidden: true },
    });
    if (!row?.entryId || row.deletedAt || row.isHidden) return { error: "Comment not found." };

    const scope = await loadCommentableEntry(row.entryId, session.user.id);
    if ("error" in scope) return scope;

    const { liked } = await toggleCommentLikeRow(session.user.id, commentId);
    /* No bell on this one, and it is a decision rather than an omission: the
       feed rings for a liked comment, but a Catch-up already rings for a
       loved ANSWER, and adding a second heart notification to the same
       Edition is the spam the coalescing in `notifyComment` exists to avoid.
       He asked for the feed's comment section, not for the feed's bell. */
    return { success: true, liked };
  });
}

// ─── Who is in it (owner, 2026-08-05) ─────────────────────────────────────────
//
//  "Can't control who's in the catch up once the question round has started.
//   Might still want to add and remove and just see who all are part of it
//   while it's going on. Also the ability to make other people the keeper."
//
//  None of these look at the Edition's status: adding, removing and handing over
//  the Keeper's hat are things a group does mid-cycle, and refusing them once
//  questions open was the bug being reported. They are Keeper-only, and they
//  operate on `GroupMember` because that is the membership container every
//  other part of the feature already derives its audience from.
//
//  A second Keeper is a `GroupMember.role` of "keeper", which `isEffectiveKeeper`
//  honours beside the creator's own "admin". So "make them a Keeper" needs no
//  new column and no migration; it is the role flip, and every Keeper-gated
//  action picks it up at once.

/**
 * Why the demo says no to leaving, archiving and deleting.
 *
 * Every visitor to the demo arrives as the SAME seeded persona, so these
 * three -- which are personal by design and change only the acting member's
 * own list -- would in that one place change it for whoever else is looking.
 * `leaveCatchup` would also be refused by the demo's write guard anyway
 * (`GroupMember` is not on `ALLOWED_WRITE_MODELS`), but as a generic "Something
 * went wrong" rather than as an answer (write-path review, 2026-08-21).
 */
const DEMO_SHARED_COPY_REFUSAL =
  "Everyone exploring the demo shares one account, so this would change the list for whoever else is looking. The demo leaves it switched off.";

/**
 * The gate a personal-copy action shares with the guards around it: you must
 * be in a Catch-up to have a copy of it. Returns the three facts they need and
 * nothing else. There were three such actions until build phase 5 took the bin
 * away; `leaveCatchup` still asks the same two questions inline, and
 * `batchYear` is here because it is what tells the two apart.
 */
async function loadOwnCatchupCopy(catchupId: string, viewerId: string) {
  const ctx = await loadCatchupContext(catchupId, viewerId);
  if (!ctx) return { error: "Catch-up not found." as const };
  if (!ctx.membership) return { error: "You are not in this Catch-up." as const };
  return {
    groupId: ctx.catchup.groupId,
    createdById: ctx.catchup.createdById,
    batchYear: ctx.catchup.group.batchYear,
  };
}

/**
 * Write one member's own state for one Catch-up, creating the row if this is
 * the first opinion they have ever had about it.
 *
 * The P2002 retry is a belt, not the braces, and the comment here used to say
 * the opposite: that `upsert` is a read-then-write inside Postgres and two
 * taps landing together can both miss the row. Checked against the live
 * database rather than argued about (audit C-127): for this shape -- a `where`
 * that is exactly a compound unique which also appears in `create`, no nested
 * writes -- Prisma 7.9 emits a single
 * `INSERT ... ON CONFLICT ("catchupId","userId") DO UPDATE`, and 75 deliberately
 * simultaneous first-writes produced zero violations. Postgres decides it, not
 * us. The catch stays because it costs nothing and an upsert shape that stops
 * qualifying for the native path would otherwise fail loudly for a member; it
 * is no longer the thing keeping the archive toggle honest.
 */
async function upsertCatchupPref(
  catchupId: string,
  userId: string,
  data: { archivedAt?: Date | null }
): Promise<void> {
  try {
    await prisma.catchupPref.upsert({
      where: { catchupId_userId: { catchupId, userId } },
      /* The default spelled out rather than left to the column's, which was
         "all" until 2026-10-17-reminders-default-off.sql: archiving a
         Catch-up must never be what turns its reminders on. */
      create: { catchupId, userId, reminderMode: DEFAULT_REMINDER_MODE, ...data },
      update: data,
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    await prisma.catchupPref.updateMany({ where: { catchupId, userId }, data });
  }
}

/** The three membership controls refuse as one, because they are one
 *  permission: who is in this Catch-up. The lifecycle controls below each name
 *  their own verb, so they pass their own. */
const MEMBERSHIP_REFUSAL = {
  notMember: "You are not a member of this Catch-up.",
  notKeeper: "Only a Keeper can change who is in this Catch-up.",
} as const;

/**
 * The Catch-up a Keeper is acting on, or the reason they may not. Builds on
 * `loadCatchupContext` rather than re-reading the same two rows, so nine
 * actions share one Keeper gate instead of each restating it.
 *
 * Both refusals come from the caller. They are not interchangeable: the four
 * lifecycle controls say "a member of this group" and the three membership
 * controls say "a member of this Catch-up", and the ten Keeper sentences each
 * name their own verb. Passing them in is what let these nine collapse
 * without a word of owner-reviewed copy changing.
 */
async function loadKeeperScope(
  catchupId: string,
  viewerId: string,
  refusal: {
    notMember: string;
    notKeeper: string;
    /** Opt in per caller, the `mayChangeCatchupPicture` shape: every batch
     *  member now runs the cycle together (owner, 2026-09-27, "make everyone
     *  a keeper"). Membership and identity -- add, remove, hand off the hat,
     *  rename, end -- do not opt in and stay refused outright,
     *  because the batch IS the roster. Omitted means refused. */
    allowBatch?: boolean;
  }
) {
  const ctx = await loadCatchupContext(catchupId, viewerId);
  if (!ctx) return { error: "Catch-up not found." as const };
  if (!ctx.membership) return { error: refusal.notMember };
  if (isBatchCatchup(ctx.catchup.group.batchYear)) {
    return refusal.allowBatch ? { catchup: ctx.catchup } : { error: BATCH_CATCHUP_REFUSAL };
  }
  if (
    !isEffectiveKeeper({
      viewerId,
      createdById: ctx.catchup.createdById,
      groupRole: ctx.membership.role,
    })
  ) {
    return { error: refusal.notKeeper };
  }
  return { catchup: ctx.catchup };
}

/**
 * Keeper-only: add people to a live Catch-up, and tell each of them. Silently
 * skips anyone already in (re-adding is a no-op, not an error) and anyone a
 * Catch-up may not hold (`CATCHUP_PEOPLE`), so a picker that went stale
 * between opening and submitting does not fail the whole action.
 *
 * THE ROSTER HOLDS `MAX_CATCHUP_PEOPLE`, counted inside the write that adds
 * to it (bug audit 3, T2a-03). The bound used to be on one request's list,
 * and the People door sends one person per request, so a Keeper could keep
 * going past a hundred, and every bell the Catch-up rings fans out per
 * member. The count and the insert share a SERIALIZABLE transaction: at READ
 * COMMITTED two adds landing together each see the room the other is about
 * to take, and five scripted requests would each fill it.
 */
export async function addCatchupMembers(catchupId: string, userIds: string[]) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    // Enrols other people and notifies each of them. Reaching real members
    // waits for a verified profile.
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    // The shape of one request, the same ceiling as creation's (audit M29).
    // The roster's own bound is the count inside the write below.
    const parsed = z
      .array(z.string().min(1))
      .min(1)
      .max(MAX_CATCHUP_PEOPLE)
      .safeParse(userIds);
    if (!parsed.success) {
      return { error: `Pick between 1 and ${MAX_CATCHUP_PEOPLE} people.` };
    }

    const scope = await loadKeeperScope(catchupId, session.user.id, MEMBERSHIP_REFUSAL);
    if ("error" in scope) return { error: scope.error };
    const { catchup } = scope;
    if (catchup.status === "ended") return { error: "This Catch-up has ended." };

    // The same rule as creation: the picker never offers somebody a Catch-up
    // may not hold, so a raw call must not be able to enrol them either.
    const real = await prisma.user.findMany({
      where: { id: { in: [...new Set(parsed.data)] }, AND: [CATCHUP_PEOPLE] },
      select: { id: true },
    });
    if (real.length === 0) return { error: "No one to add." };
    const realIds = real.map((u) => u.id);

    // Every add rings the people it adds, so it draws on the bucket creation
    // and Start share (T2a-03). After the cheap refusals, as Start does, so a
    // press that was never going to work spends nothing.
    const limited = await rateLimit("catchups", session.user.id);
    if (!limited.ok) return { error: limited.error };

    let written: { room: number } | { added: number; newlyAdded: string[] };
    try {
      written = await prisma.$transaction(
        async (tx) => {
          /* Who is already in, read BEFORE the insert. It decides which of
             the people below are genuinely NEW, which is the only set whose
             filing state may be cleared and the only set that is told -- see
             the comments on those writes. */
          const alreadyIn = new Set(
            (
              await tx.groupMember.findMany({
                where: { groupId: catchup.groupId, userId: { in: realIds } },
                select: { userId: true },
              })
            ).map((m) => m.userId)
          );
          const newlyAdded = realIds.filter((id) => !alreadyIn.has(id));
          if (newlyAdded.length === 0) return { added: 0, newlyAdded };

          const roster = await tx.groupMember.count({ where: { groupId: catchup.groupId } });
          if (roster + newlyAdded.length > MAX_CATCHUP_PEOPLE) {
            return { room: Math.max(0, MAX_CATCHUP_PEOPLE - roster) };
          }

          // createMany + skipDuplicates rather than a read-then-write: the
          // unique on (groupId, userId) is what decides, so two Keepers adding
          // the same person at the same moment cannot make this throw.
          const created = await tx.groupMember.createMany({
            data: newlyAdded.map((userId) => ({ groupId: catchup.groupId, userId, role: "member" })),
            skipDuplicates: true,
          });
          return { added: created.count, newlyAdded };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (err) {
      // Somebody else changed this roster in the same instant; Postgres kept
      // one of the two writes and the other is safe to repeat.
      if (isSerializationFailure(err)) {
        return { error: "Somebody else was changing who is in this Catch-up. Try again." };
      }
      throw err;
    }
    if ("room" in written) {
      return {
        error:
          written.room > 0
            ? `A Catch-up holds up to ${MAX_CATCHUP_PEOPLE} people, so there is room for ${written.room} more.`
            : `A Catch-up holds up to ${MAX_CATCHUP_PEOPLE} people, and this one is full.`,
      };
    }
    const { newlyAdded } = written;

    /* Being added puts the Catch-up back on your list. Without this, someone
       who had filed their copy away before a Keeper took them out would come
       back with the stamp still on, and an invitation they had just accepted
       would land at the foot of the list rather than among their Catch-ups.
       Their reminder setting is left alone -- that is a preference, not a
       filing state. (This cleared the thirty-day bin too, until build phase 5
       deleted it.)

       Scoped to the people this call actually ADDED, never to everyone named
       in it. Archiving and deleting are personal by the owner's decision, and
       the Keeper-only variant that overrides them was offered and declined; a
       Keeper re-listing somebody who is already a member must not be able to
       drag their own copy back out of their bin as a side effect (write-path
       review, 2026-08-21). The People door offers nobody already in (T3-22),
       so this only matters to a hand-made call -- which is exactly the kind
       that must not be able to do it. */
    if (newlyAdded.length > 0) {
      await prisma.catchupPref.updateMany({
        where: { catchupId, userId: { in: newlyAdded }, archivedAt: { not: null } },
        data: { archivedAt: null },
      });
      /* The bell this function's own docblock always claimed it rang. Only the
         people actually enrolled just now, never re-listing an existing member
         and never the Keeper who did the adding -- `newlyAdded` is already
         exactly that set, with the actor excluded by construction (they are
         never in their own invite list's "newly added" once they are already
         a member of their own Catch-up). */
      await notifyAdded(prisma, {
        catchupId,
        groupName: catchup.group.name,
        addedByName: session.user.name,
        userIds: newlyAdded,
      });
    }

    revalidatePath(`/catchups/${catchupId}`);
    revalidatePath("/catchups");
    return { success: true as const, added: written.added };
  });
}

/**
 * Keeper-only: take someone out of a live Catch-up.
 *
 * Their words stay where they are. A published Edition is a record of what the
 * group wrote, and unpublishing someone's answer out of it after the fact is
 * not what "remove" means here; what removal does is end their access and stop
 * their notifications. Re-adding restores both, which is why this is safe to
 * offer mid-cycle.
 *
 * IT STICKS (bug audit 3, L12-09; his Q16, 2026-10-29). The invite link was
 * never changed, and every member's page carried it, so a removed member could
 * open their old copy, press Join and be straight back in. The removal now
 * changes the link in the same transaction, so every copy already out stops
 * working (anyone the Keeper still wants needs the new one), and only a
 * Keeper's page carries it. Their pref row goes too, as when they leave: a
 * member who comes back should not find it filed under Archived (T2a-10).
 *
 * The Catch-up's creator cannot be removed (they are its permanent Keeper),
 * and a Keeper cannot remove themselves: leaving is a different action, and one
 * misfire here would leave a Catch-up with nobody able to tend it.
 */
export async function removeCatchupMember(catchupId: string, userId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    // Takes somebody else out: a Stage 2 write, like adding them (bug audit
    // 3, L10-01).
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    if (typeof userId !== "string" || !userId) return { error: "Invalid request." };

    const scope = await loadKeeperScope(catchupId, session.user.id, MEMBERSHIP_REFUSAL);
    if ("error" in scope) return { error: scope.error };
    const { catchup } = scope;

    if (userId === session.user.id) return { error: "You cannot remove yourself." };
    if (catchup.createdById && userId === catchup.createdById) {
      return { error: "The person who started this Catch-up cannot be removed." };
    }

    const removed = await prisma.$transaction(async (tx) => {
      // The same succession as leaving: a Keeper can remove a second Keeper,
      // and on a Catch-up with no creator left that could be the last one
      // (audit C-023).
      await promoteGroupSuccessor(tx, catchup.groupId, userId);
      const gone = await tx.groupMember.deleteMany({ where: { groupId: catchup.groupId, userId } });
      if (gone.count === 0) return gone;
      // A new link, so the copy they hold stops working (L12-09). A row with
      // no link keeps none rather than gaining one.
      await tx.catchup.updateMany({
        where: { id: catchupId, inviteToken: { not: null } },
        data: { inviteToken: newInviteToken() },
      });
      await tx.catchupPref.deleteMany({ where: { catchupId, userId } });
      return gone;
    });
    if (removed.count === 0) return { error: "They are not in this Catch-up." };

    // Their pending nudges point at a Catch-up they can no longer open. This
    // used to miss the reveal and the love nudge, which link to a ROUND rather
    // than to the Catch-up; the shared helper takes both shapes.
    await clearCatchupNotifications(userId, catchupId);

    revalidatePath(`/catchups/${catchupId}`);
    revalidatePath("/catchups");
    return { success: true as const };
  });
}

/**
 * Leave a Catch-up you were put into. Since build phase 5 this is the ONLY way
 * out, which is his word: "defaults, except deleting becomes leaving" (N18).
 *
 * Nobody accepts an invitation to a Catch-up: `createCatchupWithPeople` and
 * `addCatchupMembers` enrol up to a hundred people directly, and until this
 * existed the only way out was to ask a Keeper to remove you, because
 * `removeCatchupMember` refuses self-removal by design (bug audit B-063).
 *
 * It happens NOW rather than in thirty nights. The bin that `setCatchupDeleted`
 * opened was leaving with a fuse on it -- a member who thought they had
 * deleted something stayed in the group for a month, out of every broadcast,
 * and was then removed by a nightly sweep nobody was watching. One verb, one
 * moment, and a confirmation that says what it does.
 *
 * Your words stay where they are. A published Edition is a keepsake the whole
 * group has read, and pulling one person's answers out of it afterwards would
 * put holes in something other people remember (owner's decision, 2026-08-21).
 * What leaving does is end your access and stop your notifications.
 *
 * Refused for whoever started it. They hold Keeper power through
 * `Catchup.createdById` rather than through their membership row, so a founder
 * with no `GroupMember` row would be a Keeper that every Keeper-scoped action
 * then tells "you are not a member of this Catch-up" -- a Catch-up nobody can
 * tend. They are pointed at the two controls that do work for them instead:
 * end it, or hand the hat over first.
 */
export async function leaveCatchup(catchupId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (IS_DEMO) return { error: DEMO_SHARED_COPY_REFUSAL };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    const viewerId = session.user.id;

    const ctx = await loadCatchupContext(catchupId, viewerId);
    if (!ctx) return { error: "Catch-up not found." };
    if (!ctx.membership) return { error: "You are not in this Catch-up." };
    /* You cannot leave your own batch. His, brief 51: "the batch catch up
       can't edit people in and out it's just people in that batch and they're
       all automatically added". A leave would also be undone by the next
       nightly `healBatchGroupMemberships` pass, which would put them straight
       back -- so refusing is the honest answer rather than the strict one.
       Archiving still works, and that is what the sentence points at. */
    if (isBatchCatchup(ctx.catchup.group.batchYear)) {
      return { error: BATCH_LEAVE_REFUSAL };
    }
    if (ctx.catchup.createdById && ctx.catchup.createdById === viewerId) {
      return {
        error:
          "You started this Catch-up, so leaving it would leave nobody to tend it. End it, or make someone else a Keeper first.",
      };
    }

    await prisma.$transaction(async (tx) => {
      /* Hand the hat on first, if this is the last head wearing it (audit
         C-023). A Catch-up whose `createdById` has gone null holds its Keeper
         powers entirely in `GroupMember.role`, so the last role-holder walking
         out leaves nobody who can curate a question, publish an Edition or end
         it -- and no way to claim it, since making a Keeper needs a Keeper.
         A no-op whenever somebody else still holds the powers. First in the
         transaction, because it holds the group's row before it reads: the
         last two Keepers leaving at once are decided one after the other
         (bug audit 3, L1-03). */
      await promoteGroupSuccessor(tx, ctx.catchup.groupId, viewerId);
      // deleteMany, not delete: a second tap (or a Keeper removing them in the
      // same beat) has already taken the row, and P2025 out of a "leave" button
      // would read as a failure to leave something they are already out of.
      await tx.groupMember.deleteMany({
        where: { groupId: ctx.catchup.groupId, userId: viewerId },
      });
    });
    // Their own pref row goes with them: the reminder setting, and any
    // archived/deleted stamp, describe a copy that no longer exists. Being
    // re-added later should start clean rather than resurrect a bin.
    await prisma.catchupPref.deleteMany({ where: { catchupId, userId: viewerId } });
    await clearCatchupNotifications(viewerId, catchupId);

    revalidatePath(`/catchups/${catchupId}`);
    revalidatePath("/catchups");
    return { success: true as const };
  });
}

/**
 * File your own copy of a Catch-up away, or take it back out.
 *
 * Personal by construction: the state is a column on `CatchupPref`, which is
 * unique on (catchupId, userId), so this cannot touch anyone else's list.
 * You are still a member and still notified -- archiving is filing, not
 * muting, and muting already has its own control (`reminderMode`). Instantly
 * reversible, which is why it asks nothing before doing it.
 */
export async function setCatchupArchived(catchupId: string, archived: boolean) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (IS_DEMO) return { error: DEMO_SHARED_COPY_REFUSAL };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    if (typeof archived !== "boolean") return { error: "Invalid request." };

    const copy = await loadOwnCatchupCopy(catchupId, session.user.id);
    if ("error" in copy) return { error: copy.error };

    await upsertCatchupPref(catchupId, session.user.id, {
      archivedAt: archived ? new Date() : null,
    });

    revalidatePath("/catchups");
    return { success: true as const, archived };
  });
}

/* `setCatchupDeleted` stood here: your own copy into a thirty-day bin, out of
   which the nightly sweep took your membership row on the last night.
   Deleting became LEAVING in build phase 5, and it is one word of his (N18):
   "defaults, except deleting becomes leaving." What you already published
   STAYS -- other people have read it and replied to it -- and the bin went
   with the word. `leaveCatchup` above is now the only exit, which is why its
   batch refusal and its founder refusal matter more than they did: they were
   duplicated here, and there is nowhere else left holding them. */

/**
 * Keeper-only: hand someone else the Keeper's hat, or take it back.
 *
 * Writes `GroupMember.role = "keeper"`, which `isEffectiveKeeper` honours, so
 * one flip is the whole feature and no migration is needed (role is a free
 * string). Every path that hands the hat on writes the same word: this one,
 * succession on leaving or removal, the account purge's succession and an
 * admin's merge (bug audit 3, T7a-07; the last two wrote "admin").
 *
 * Taking it back takes either word. "admin" was once the group's moderation
 * role, read by a `deletePost` that let a group admin delete anyone's post in
 * the group, which is why the two were kept apart (audit C-025). Posts left
 * groups on 2026-09-07, so "admin" grants nothing a Keeper does not hold, and a
 * revoke that matched only "keeper" told a Keeper "X is no longer a Keeper"
 * while changing nothing (T3-15).
 *
 * The creator's own row is untouchable: they hold Keeper power through
 * `Catchup.createdById` regardless of role, so "demoting" them would change
 * nothing while looking like it had. Saying so is better than a silent no-op.
 */
export async function setCatchupKeeper(catchupId: string, userId: string, isKeeper: boolean) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    // Hands another member every control here, or takes them away: a Stage 2
    // write (bug audit 3, L10-01).
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    if (typeof userId !== "string" || !userId) return { error: "Invalid request." };
    if (typeof isKeeper !== "boolean") return { error: "Invalid request." };

    const scope = await loadKeeperScope(catchupId, session.user.id, MEMBERSHIP_REFUSAL);
    if ("error" in scope) return { error: scope.error };
    const { catchup } = scope;

    /* Not your own hat (write-path review of A2). The People door offers
       nobody their own row, and says this is refused here; it was not, so a
       lone Keeper of a Catch-up whose creator is gone could take theirs off
       and leave nobody able to tend it. */
    if (userId === session.user.id) return { error: "You cannot change your own Keeper hat." };
    if (catchup.createdById && userId === catchup.createdById) {
      return { error: "Whoever started a Catch-up is always its Keeper." };
    }

    if (isKeeper) {
      const granted = await prisma.groupMember.updateMany({
        // Only to somebody a Catch-up may hold (L10-01). The hat is every
        // Keeper control in this file, and the stage gate on each of them
        // would turn an unproven Keeper away, leaving a Catch-up whose
        // Keeper can do nothing.
        where: { groupId: catchup.groupId, userId, user: CATCHUP_PEOPLE },
        data: { role: "keeper" },
      });
      if (granted.count === 0) {
        // Not in the Catch-up, or somebody a Catch-up may not hold.
        const stillHere = await prisma.groupMember.count({ where: { groupId: catchup.groupId, userId } });
        return { error: stillHere === 0 ? "They are not in this Catch-up." : "Only a verified member can be a Keeper." };
      }
    } else {
      /* NEVER THE LAST HAT, decided while the group is held (write-path
         review of A2; the lock is L1-03's). Two Keepers of a Catch-up whose
         creator is gone, each taking the other's hat in the same instant,
         each saw the other still wearing one; now the second waits for the
         first, sees its change, and is refused. Either word comes off, and
         only the hat: "member" over a "keeper" or an "admin" row (T3-15, see
         the docblock); the creator, whose "admin" row means more than the
         hat, was refused above. */
      const revoked = await prisma.$transaction(async (tx) => {
        await lockGroup(tx, catchup.groupId);
        if (!(await anyOtherHolder(tx, catchup.groupId, userId))) return "last" as const;
        return tx.groupMember.updateMany({
          where: { groupId: catchup.groupId, userId, role: { in: ["keeper", "admin"] } },
          data: { role: "member" },
        });
      });
      if (revoked === "last") return { error: "That would leave this Catch-up with no Keeper, so nothing changed." };
      if (revoked.count === 0) {
        // Not in the Catch-up; or not wearing the hat, which is the state asked for.
        const stillHere = await prisma.groupMember.count({ where: { groupId: catchup.groupId, userId } });
        if (stillHere === 0) return { error: "They are not in this Catch-up." };
      }
    }

    revalidatePath(`/catchups/${catchupId}`);
    return { success: true as const, isKeeper };
  });
}

// ─── Prefs and nudges (spec 5) ──────────────────────────────────────────────────

/** A member's own reminder setting for one Catchup: all / last only / off. */
export async function setReminderPref(catchupId: string, reminderMode: ReminderMode) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    const parsed = reminderModeSchema.safeParse(reminderMode);
    if (!parsed.success) return { error: "Pick a valid reminder setting." };

    const catchup = await prisma.catchup.findUnique({
      where: { id: catchupId },
      select: { id: true, groupId: true },
    });
    if (!catchup) return { error: "Catch-up not found." };
    const membership = await loadMembership(catchup.groupId, session.user.id);
    if (!membership) return { error: "You are not a member of this group." };

    await prisma.catchupPref.upsert({
      where: { catchupId_userId: { catchupId, userId: session.user.id } },
      create: { catchupId, userId: session.user.id, reminderMode: parsed.data },
      update: { reminderMode: parsed.data },
    });

    revalidatePath(`/catchups/${catchupId}`);
    return { success: true };
  });
}

/* `nudgeGroup` stood here: "Nudge everyone", one reminder to every member
   who had not written yet, whatever they had chosen. Deleted 2026-10-17 with
   his answer that somebody not taking part hears about an Edition twice -- it
   started, it is out -- and no more; on a batch any of forty people could
   fire it. Reminders are each member's own setting now, off unless they turn
   them on (`DEFAULT_REMINDER_MODE`). */
