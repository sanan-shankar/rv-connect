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
 *  The lazy-advance touchpoint (spec 2.4): any action that reads a Round's
 *  status first calls WP1's `advanceEdition` on it via `loadFreshEdition`, so
 *  a mutation can never act on a status the clock already passed underneath a
 *  stale page (e.g. a late "open answering now" click after the window had
 *  already auto-advanced past collecting).
 *
 *  Every action is wrapped by `runAction`, which turns a missing-table error
 *  (P2021, pre-migration) into a friendly `{ error }` instead of throwing, so
 *  calling any of these before the owner applies the migration degrades
 *  gracefully rather than surfacing a raw server-action exception.
 *
 *  Spotify (threat T-catchups-01, the SSRF boundary): the host/path allowlist
 *  and the keyless oembed fetch live in `resolveSpotify` (WP1, `lib/catchups.ts`)
 *  only. This file calls it and never re-implements the fetch.
 *
 *  No em dashes. User-facing copy says "Rishi Valley", never "Alumni".
 * ------------------------------------------------------------------ */

import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { MAX_CATCHUP_PEOPLE } from "@/lib/catchup-caps";
import { requireVerifiedMember } from "@/lib/member-gate";
import { rateLimit } from "@/lib/rate-limit";
import { ownedUploadUrls } from "@/lib/upload-ownership";
import { revalidatePath } from "next/cache";
import {
  addCadenceGap,
  addDays,
  advanceEdition,
  answeringPatch,
  EDITION_TIMING_SELECT,
  extendPatch,
  extendPhasePatch,
  isEffectiveKeeper,
  isMissingCatchupTable,
  newInviteToken,
  preparingPatch,
  publishPatch,
  QUESTION_WINDOW_DAYS,
  REMINDER_QUESTIONS_EXTENDED,
  resolveSpotify,
  restoreOwnCatchupCopy,
  shiftEditionPatch,
  shiftPausedInstant,
  shouldExtendForTooFew,
  type AdvanceEditionInput,
} from "@/lib/catchups";
import {
  notifyAnswersOpen,
  notifyLove,
  notifyPublished,
  notifyQuestionsOpen,
  notifyReminder,
} from "@/lib/catchups-notify";
import { PROMPT_CATEGORIES } from "@/lib/catchups-types";
import type {
  Cadence,
  CatchupStatus,
  EditionStatus,
  PromptCategory,
  ReminderMode,
} from "@/lib/catchups-types";
import { promoteGroupSuccessor } from "@/lib/group-succession";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { DOUBLE_SUBMIT_MS } from "@/lib/double-submit";

// ─── Soft caps (spec 3.3.1, enforced here rather than only surfaced as UI copy) ──

// Raised from 12 and no longer surfaced anywhere in the UI. The owner's call:
// a visible "3 of 12" counter made a Round feel rationed for no reason nobody
// could explain. This is now purely a runaway/spam ceiling that a real group
// will never reach, not a budget members are asked to manage. The companion
// per-member pending cap is gone: since 2026-08-05 nothing pends.
const MAX_ACCEPTED_PROMPTS_PER_EDITION = 40;

// ─── Validation ──────────────────────────────────────────────────────────────

const CADENCE_VALUES = ["biweekly", "monthly", "quarterly"] as const;
const REMINDER_MODE_VALUES = ["all", "last", "off"] as const;

const cadenceSchema = z.enum(CADENCE_VALUES);
/**
 * Built from the shared `PROMPT_CATEGORIES` array, never from a list retyped
 * here. The hand-written copy this replaces went stale when the question
 * library was rewritten (2026-07-25) and rejected three of the five live sets
 * with a raw "Invalid option: expected one of valley-days|..." shown to the
 * member (owner, 2026-08-05: "that should never happen").
 */
const promptCategorySchema = z.enum(PROMPT_CATEGORIES).nullable();
const reminderModeSchema = z.enum(REMINDER_MODE_VALUES);
/** How far a Keeper may push a deadline in one go (owner, 2026-08-05). */
const extendDaysSchema = z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(7)]);

/** People-first creation: no pre-existing group needed, see createCatchupWithPeople. */
const createCatchupWithPeopleSchema = z.object({
  name: z.string().trim().min(1, "Give this Catch-up a name.").max(80, "Keep the name under 80 characters."),
  // The argument for the number is on MAX_CATCHUP_PEOPLE, which the people
  // picker now reads too, so the roster cannot be built past a limit the
  // member is only told about on submit (audit M12).
  memberIds: z
    .array(z.string().min(1))
    .max(MAX_CATCHUP_PEOPLE, `A Catch-up can start with up to ${MAX_CATCHUP_PEOPLE} people.`),
  cadence: cadenceSchema.default("monthly"),
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
  orderedPromptIds: z.array(z.string().min(1)).min(1).max(MAX_ACCEPTED_PROMPTS_PER_EDITION),
});

const submitEntrySchema = z.object({
  promptId: z.string().min(1),
  body: z.string().trim().max(6000, "Keep it under 6000 characters.").optional(),
  images: z.array(z.url()).max(3, "Up to 3 photos.").optional(),
  songUrl: z.string().trim().max(2000).optional(),
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

function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  return (err as { code?: unknown }).code === "P2002";
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
  publishAt: Date | null;
  publishedAt: Date | null;
  remindersSent: number;
  catchup: {
    createdById: string | null;
    cadence: Cadence;
    status: CatchupStatus;
    group: { id: string; name: string };
  };
};

/**
 * Load a Round plus its Catch-up/group context, bringing its status current
 * against the clock first (the lazy-advance touchpoint, spec 2.4). Every
 * action below that reads a Round's status goes through this helper, so none
 * can act on a status the clock already passed underneath a stale page (e.g.
 * a "close and prepare now" click after the answer window had already
 * auto-closed, or a question submitted a beat after questionsCloseAt).
 */
async function loadFreshEdition(editionId: string): Promise<EditionContext | null> {
  const base = await prisma.catchupEdition.findUnique({
    where: { id: editionId },
    select: {
      id: true,
      catchupId: true,
      number: true,
      status: true,
      questionsCloseAt: true,
      answersCloseAt: true,
      publishAt: true,
      publishedAt: true,
      remindersSent: true,
      catchup: {
        select: {
          createdById: true,
          cadence: true,
          status: true,
          group: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!base) return null;

  await advanceEdition(base as AdvanceEditionInput);

  const fresh = await prisma.catchupEdition.findUnique({
    where: { id: editionId },
    select: {
      id: true,
      catchupId: true,
      number: true,
      status: true,
      questionsCloseAt: true,
      answersCloseAt: true,
      publishAt: true,
      publishedAt: true,
      remindersSent: true,
    },
  });
  if (!fresh) return null;

  return {
    ...fresh,
    status: fresh.status as EditionStatus,
    catchup: {
      createdById: base.catchup.createdById,
      cadence: base.catchup.cadence as Cadence,
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
      cadence: true,
      nextOpensAt: true,
      pausedAt: true,
    },
  });
  if (!catchup) return null;
  const membership = await loadMembership(catchup.groupId, userId);
  return { catchup, membership };
}

/**
 * The refusal every write into a live Round shares.
 *
 * `advanceEdition` freezes the CLOCK for a paused or ended Catch-up, which is
 * the whole of B-061's automatic half. It is not the whole story: five Keeper
 * controls (open answering, close and prepare, extend, publish now, nudge) and
 * the two member submissions write the edition directly, in their own
 * transactions, and each of them only ever checked the ROUND's status --
 * `answering` stays `answering` through a pause, so "Publish now" on a paused
 * Catch-up still published it and notified the whole group under a home page
 * saying it was paused. A stale tab opened before the pause is enough to reach
 * every one of them.
 *
 * So the freeze is enforced in two places by construction, not one: the clock
 * in `advanceEdition`, and every hand-driven write through here.
 */
function refuseIfFrozen(
  status: string,
  pausedHint: string
): { error: string } | null {
  if (status === "active") return null;
  return {
    error:
      status === "paused"
        ? `This Catch-up is paused. ${pausedHint}`
        : "This Catch-up has ended.",
  };
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
  cadence?: Cadence;
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
    const { name, memberIds, cadence } = parsed.data;
    const creatorId = session.user.id;

    // The creator is always in, and never twice. Anyone who is not a real,
    // unblocked, non-teacher user is dropped rather than failing the whole
    // creation: the picker can go stale between rendering and submitting,
    // and Catch-ups is an alumni feature, so a hand-crafted call must not
    // be able to add a teacher the picker would never have offered.
    const invitedIds = [...new Set(memberIds.filter((id) => id !== creatorId))];
    const realMembers = invitedIds.length
      ? await prisma.user.findMany({
          where: {
            id: { in: invitedIds },
            isBlocked: false,
            // Same as every people surface: someone inside their deletion
            // grace window (audit M35) must not be enrollable or emailable
            // by a hand-crafted call the picker would never make.
            deletionRequestedAt: null,
            accountType: { notIn: ["teacher", "ex_teacher"] },
          },
          select: { id: true },
        })
      : [];
    const memberRows = [
      { userId: creatorId, role: "admin" },
      ...realMembers.map((u) => ({ userId: u.id, role: "member" })),
    ];

    /* The server half of the double-submit guard (audit Low 29).
     *
     * A duplicated invocation minted a WHOLE second Catch-up -- its own group,
     * its own Round 1 -- and notified up to a hundred people about it twice.
     * The rate limit caps volume, not duplicates. A group is free text so no
     * unique index can dedupe it; the same creator starting the same name
     * seconds apart is a double press, and the first one is handed back as
     * though this call had made it. */
    const twin = await prisma.catchup.findFirst({
      where: {
        createdById: creatorId,
        createdAt: { gte: new Date(Date.now() - DOUBLE_SUBMIT_MS) },
        group: { name },
      },
      select: { id: true },
    });
    if (twin) {
      revalidatePath("/catchups");
      return { success: true as const, catchupId: twin.id };
    }

    const now = new Date();
    const catchupId = await prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name,
          visibility: "private",
          creatorId,
          members: { create: memberRows },
        },
        select: { id: true, name: true },
      });
      const catchup = await tx.catchup.create({
        data: { groupId: group.id, createdById: creatorId, cadence, inviteToken: newInviteToken() },
      });
      // Round 1 opens straight into `collecting` with NO questions. Questions
      // are no longer picked at creation time (owner: "why would I need to add
      // questions while creating the catch-up?"), so an empty collecting Round
      // is the correct initial state: the home screen's whole job right now is
      // to collect them.
      const edition = await tx.catchupEdition.create({
        data: {
          catchupId: catchup.id,
          number: 1,
          status: "collecting",
          questionsCloseAt: addDays(now, QUESTION_WINDOW_DAYS),
        },
      });
      await notifyQuestionsOpen(tx, {
        catchupId: catchup.id,
        editionId: edition.id,
        groupId: group.id,
        groupName: group.name,
        excludeUserId: creatorId,
      });
      return catchup.id;
    });

    revalidatePath("/catchups");
    revalidatePath(`/catchups/${catchupId}`);
    return { success: true as const, catchupId };
  });
}

/**
 * Accept a Catch-up invite link.
 *
 * The token is the whole authorisation: holding it is the invitation, the same
 * way holding a WhatsApp group link is. So there is nothing to check against
 * the caller beyond being signed in, and nothing here reads a client-supplied
 * catchupId: the token resolves to exactly one Catch-up or to nothing.
 *
 * Idempotent. Following the same link twice, or landing on it as an existing
 * member, is a no-op that still returns the id, because the honest response to
 * "join this" from someone already in it is to show them the Catch-up.
 *
 * Ended Catch-ups refuse: joining something nobody will write in again is a
 * dead end, and it is better to say so than to add a silent membership. A
 * PAUSED one accepts, because pausing is temporary by definition.
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
    // ...and out of their own bin, if they had put it there: rejoining
    // something you binned must not leave the 30-day sweep armed (C-020).
    await restoreOwnCatchupCopy(catchup.id, session.user.id);

    revalidatePath("/catchups");
    revalidatePath(`/catchups/${catchup.id}`);
    return { success: true as const, catchupId: catchup.id, groupName: catchup.group.name };
  });
}

/** Keeper-only: change the recurring rhythm (spec 3.3 settings). */
export async function updateCatchupCadence(catchupId: string, cadence: Cadence) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    const parsedCadence = cadenceSchema.safeParse(cadence);
    if (!parsedCadence.success) return { error: "Pick a valid rhythm." };

    const ctx = await loadCatchupContext(catchupId, session.user.id);
    if (!ctx) return { error: "Catch-up not found." };
    if (!ctx.membership) return { error: "You are not a member of this group." };
    if (
      !isEffectiveKeeper({
        viewerId: session.user.id,
        createdById: ctx.catchup.createdById,
        groupRole: ctx.membership.role,
      })
    ) {
      return { error: "Only the Keeper can change the rhythm." };
    }

    const next = parsedCadence.data;
    const wasCadence = ctx.catchup.cadence as Cadence;

    /* Reschedule what is already booked (audit M08).
     *
     * `nextOpensAt` is stamped once, when a Round publishes, as
     * publishedAt + the gap for the cadence AT THAT MOMENT. Changing the
     * cadence used to write the new word and leave that stamp untouched, so a
     * Keeper moving a quarterly Catch-up to monthly because three months was
     * too slow then waited the rest of the three months anyway -- with the
     * settings sheet reading "Monthly" the whole time. The word changed and
     * nothing else did.
     *
     * Recomputed from the same ORIGIN rather than from now, because "monthly"
     * has to mean a month after the last Round, not a month after somebody
     * touched a setting: anchoring on now would let a Keeper push the next
     * Round away by opening a menu. If that instant has already gone by, it
     * lands on now and the next tick opens the Round, which is the honest
     * reading of "you are overdue under the new rhythm".
     *
     * A Catch-up that has never published has no origin and no rhythm yet, so
     * there is nothing to move. */
    const lastPublished = await prisma.catchupEdition.findFirst({
      where: { catchupId, status: "published", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: { publishedAt: true },
    });
    const origin = lastPublished?.publishedAt ?? null;
    const shouldReschedule = next !== wasCadence && ctx.catchup.nextOpensAt !== null && origin !== null;
    const now = new Date();
    const rescheduled = shouldReschedule
      ? (() => {
          const at = addCadenceGap(origin as Date, next);
          return at.getTime() < now.getTime() ? now : at;
        })()
      : undefined;

    await prisma.catchup.update({
      where: { id: catchupId },
      data: { cadence: next, ...(rescheduled ? { nextOpensAt: rescheduled } : {}) },
    });
    revalidatePath(`/catchups/${catchupId}`);
    revalidatePath("/catchups");
    return { success: true };
  });
}

/** Keeper-only: pause a Catch-up (spec 3.3 settings / edge states). */
export async function pauseCatchup(catchupId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };

    const ctx = await loadCatchupContext(catchupId, session.user.id);
    if (!ctx) return { error: "Catch-up not found." };
    if (!ctx.membership) return { error: "You are not a member of this group." };
    if (
      !isEffectiveKeeper({
        viewerId: session.user.id,
        createdById: ctx.catchup.createdById,
        groupRole: ctx.membership.role,
      })
    ) {
      return { error: "Only the Keeper can pause this Catch-up." };
    }
    if (ctx.catchup.status === "ended") return { error: "This Catch-up has already ended." };

    // `pausedAt` stamps the moment the freeze begins. From here the live Round
    // stops advancing entirely (the gate is in advanceEdition), and resume
    // shifts every unreached deadline forward by this long, so the group gets
    // back the window it had rather than finding it expired (audit B-061).
    // Only stamped on the active -> paused edge: pausing an already-paused
    // Catch-up must not extend the credit.
    await prisma.catchup.updateMany({
      where: { id: catchupId, status: "active" },
      data: { status: "paused", pausedAt: new Date() },
    });
    revalidatePath(`/catchups/${catchupId}`);
    return { success: true };
  });
}

/** Keeper-only: resume a paused Catch-up. */
export async function resumeCatchup(catchupId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };

    const ctx = await loadCatchupContext(catchupId, session.user.id);
    if (!ctx) return { error: "Catch-up not found." };
    if (!ctx.membership) return { error: "You are not a member of this group." };
    if (
      !isEffectiveKeeper({
        viewerId: session.user.id,
        createdById: ctx.catchup.createdById,
        groupRole: ctx.membership.role,
      })
    ) {
      return { error: "Only the Keeper can resume this Catch-up." };
    }
    if (ctx.catchup.status !== "paused") return { error: "This Catch-up is not paused." };

    const now = new Date();
    const pausedAt = ctx.catchup.pausedAt;

    await prisma.$transaction(async (tx) => {
      // Pinned on pausedAt as well as status: another Keeper completing a
      // whole pause -> resume -> pause cycle between the read above and this
      // write would leave status back at "paused" with a DIFFERENT freeze
      // stamp, and every shift below would then credit the wrong duration.
      const resumed = await tx.catchup.updateMany({
        where: { id: catchupId, status: "paused", pausedAt },
        data: { status: "active", pausedAt: null },
      });
      if (resumed.count === 0) return; // someone else resumed it first

      const latest = await tx.catchupEdition.findFirst({
        where: { catchupId },
        orderBy: { number: "desc" },
        select: { ...EDITION_TIMING_SELECT, id: true },
      });
      if (!latest) return;

      if (latest.status === "published") {
        // Nothing live to un-freeze, so the thing to restore is the rhythm.
        //
        // Re-arm it when it is missing. A Round that published while the
        // Catch-up was paused never wrote nextOpensAt, and nothing else in the
        // app ever sets it, so the Catch-up sat "active" forever with no future
        // Round and no control anywhere to start one (audit B-060). Freezing on
        // pause should make that unreachable now; this is the belt, and it also
        // repairs any row already stuck that way. Conditional on the column
        // still being null so it cannot stamp over a live schedule.
        const rearmed = await tx.catchup.updateMany({
          where: { id: catchupId, nextOpensAt: null },
          data: { nextOpensAt: addCadenceGap(now, ctx.catchup.cadence as Cadence) },
        });
        if (rearmed.count > 0) return;

        // Otherwise the schedule survived, and it gets the same credit a live
        // Round's deadlines get: a Catch-up paused a month before its next
        // Round should not open one the instant it resumes.
        const shifted = shiftPausedInstant(ctx.catchup.nextOpensAt, pausedAt, now);
        if (shifted) {
          await tx.catchup.updateMany({
            where: { id: catchupId, nextOpensAt: ctx.catchup.nextOpensAt },
            data: { nextOpensAt: shifted },
          });
        }
        return;
      }

      // A live Round: give back exactly the time the freeze took.
      const patch = shiftEditionPatch(latest, pausedAt, now);
      if (Object.keys(patch).length > 0) {
        await tx.catchupEdition.update({ where: { id: latest.id }, data: patch });
      }
    });

    revalidatePath(`/catchups/${catchupId}`);
    return { success: true };
  });
}

/** Keeper-only: end a Catch-up. Past published Rounds stay readable forever. */
export async function endCatchup(catchupId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (IS_DEMO) return { error: "Ending a Catch-up cannot be undone, so the demo keeps that one switched off." };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };

    const ctx = await loadCatchupContext(catchupId, session.user.id);
    if (!ctx) return { error: "Catch-up not found." };
    if (!ctx.membership) return { error: "You are not a member of this group." };
    if (
      !isEffectiveKeeper({
        viewerId: session.user.id,
        createdById: ctx.catchup.createdById,
        groupRole: ctx.membership.role,
      })
    ) {
      return { error: "Only the Keeper can end this Catch-up." };
    }

    await prisma.catchup.update({
      where: { id: catchupId },
      // pausedAt goes with it: ending from a paused state leaves no freeze to
      // credit, and a stale stamp would shift deadlines if the row were ever
      // reopened.
      data: { status: "ended", nextOpensAt: null, pausedAt: null },
    });
    revalidatePath(`/catchups/${catchupId}`);
    return { success: true };
  });
}

// ─── Prompts (spec 3.3.1) ──────────────────────────────────────────────────────

/**
 * Submit a question for the current Round, named or anonymous (`showAsker`).
 * The author is always stored regardless of `showAsker`.
 *
 * Every submission goes straight into the Round (owner, 2026-08-05: "don't
 * make the keeper verify everyone's questions, let it automatically be
 * included in the round"). The Keeper's approval step is gone; what they keep
 * is the ability to REMOVE a question and to reorder the list, which is the
 * moderation that actually gets used. The pending-submission cap went with it
 * (nothing pends any more); the silent per-Round ceiling stays as the only
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

    // A question put to a whole Round, under your name or anonymously. Same
    // footing as a post.
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };

    const parsed = submitPromptSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { editionId, text, category, showAsker } = parsed.data;

    const edition = await loadFreshEdition(editionId);
    if (!edition) return { error: "Catch-up round not found." };
    const membership = await loadMembership(edition.catchup.group.id, session.user.id);
    if (!membership) return { error: "You are not a member of this group." };
    if (edition.status !== "collecting") {
      return { error: "The question window for this Round is closed." };
    }
    const frozen = refuseIfFrozen(
      edition.catchup.status,
      "You can add a question again when the Keeper resumes it."
    );
    if (frozen) return frozen;

    const keeper = isEffectiveKeeper({
      viewerId: session.user.id,
      createdById: edition.catchup.createdById,
      groupRole: membership.role,
    });

    /* `position` is the Round's rendered, reorderable order, and this is "next
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
      const [{ _max, _count }] = [
        await tx.catchupPrompt.aggregate({
          where: { editionId, accepted: true },
          _max: { position: true },
          _count: true,
        }),
      ];
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
      // Read inside the transaction too: whether this was the FIRST question
      // decides the dormant-Round revival below, and a count taken outside
      // could be a different moment's answer.
      return { row, wasFirst: _count === 0 };
    });

    if (!created) {
      return { error: "This Round has as many questions as it can hold. Remove one to add another." };
    }
    const prompt = created.row;
    const firstQuestion = created.wasFirst;

    // Reviving a dormant Round. A Round whose question window closed with
    // nothing in it does not open for answers -- it goes quiet instead of
    // nudging the group daily to answer nothing (audit B-062). This is the way
    // back out: the first question restarts the window, so the rest of the
    // group gets the usual few days to add theirs rather than being dropped
    // straight into answering a Round with exactly one question in it.
    //
    // The three conditions together are the dormant state and nothing else:
    // still collecting, the window already closed, the one auto-extension
    // already spent, and this was the first question. The conditional
    // updateMany means a second submitter in the same second cannot push the
    // deadline out twice.
    const wasDormant =
      firstQuestion &&
      edition.questionsCloseAt != null &&
      edition.questionsCloseAt.getTime() <= Date.now() &&
      (edition.remindersSent & REMINDER_QUESTIONS_EXTENDED) !== 0;
    if (wasDormant) {
      await prisma.catchupEdition.updateMany({
        where: { id: editionId, status: "collecting", remindersSent: edition.remindersSent },
        data: { questionsCloseAt: addDays(new Date(), QUESTION_WINDOW_DAYS) },
      });
    }

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true, promptId: prompt.id, accepted: true };
  });
}

export type CuratePromptInput =
  | { action: "remove"; promptId: string }
  | { action: "reorder"; editionId: string; orderedPromptIds: string[] };

/**
 * Keeper curation of a Round's questions (spec 3.3): remove one, or persist a
 * new order. Both require effective Keeper power and only run while the Round
 * is still `collecting`.
 *
 * There is no longer an "accept" action. Every question now goes straight into
 * the Round (owner, 2026-08-05), so there is nothing to approve; removing and
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

    if (input.action === "reorder") {
      const parsed = curateReorderSchema.safeParse(input);
      if (!parsed.success) return { error: "Invalid request." };
      const { editionId, orderedPromptIds } = parsed.data;

      const edition = await loadFreshEdition(editionId);
      if (!edition) return { error: "Catch-up round not found." };
      const membership = await loadMembership(edition.catchup.group.id, session.user.id);
      if (!membership) return { error: "You are not a member of this group." };
      if (
        !isEffectiveKeeper({
          viewerId: session.user.id,
          createdById: edition.catchup.createdById,
          groupRole: membership.role,
        })
      ) {
        return { error: "Only the Keeper can reorder questions." };
      }
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

    const edition = await loadFreshEdition(prompt.editionId);
    if (!edition) return { error: "Catch-up round not found." };
    const membership = await loadMembership(edition.catchup.group.id, session.user.id);
    if (!membership) return { error: "You are not a member of this group." };
    if (
      !isEffectiveKeeper({
        viewerId: session.user.id,
        createdById: edition.catchup.createdById,
        groupRole: membership.role,
      })
    ) {
      return { error: "Only the Keeper can curate questions." };
    }
    if (edition.status !== "collecting") {
      return { error: "Questions can only be curated while the window is open." };
    }

    await prisma.catchupPrompt.delete({ where: { id: promptId } });

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true };
  });
}

// ─── Round transitions (Keeper-only early triggers; the clock drives the rest) ─

/** Keeper-only: collecting -> answering, ahead of `questionsCloseAt`. */
export async function openAnswering(editionId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof editionId !== "string" || !editionId) return { error: "Invalid request." };

    const edition = await loadFreshEdition(editionId);
    if (!edition) return { error: "Catch-up round not found." };
    const membership = await loadMembership(edition.catchup.group.id, session.user.id);
    if (!membership) return { error: "You are not a member of this group." };
    if (
      !isEffectiveKeeper({
        viewerId: session.user.id,
        createdById: edition.catchup.createdById,
        groupRole: membership.role,
      })
    ) {
      return { error: "Only the Keeper can open answering." };
    }
    const frozen = refuseIfFrozen(edition.catchup.status, "Resume it to pick the Round back up.");
    if (frozen) return frozen;
    if (edition.status !== "collecting") {
      return { error: "This Round is not collecting questions right now." };
    }

    const now = new Date();
    const patch = answeringPatch(edition, now);

    const applied = await prisma.$transaction(async (tx) => {
      /* A Round with nothing to answer must not open (audit C-021).
       *
       * The clock already refuses this: planNextAction returns "extend the
       * questions" and then leaves the Round dormant rather than opening an
       * empty one, precisely to avoid the reminder loop B-062 closed. The
       * Keeper's own early trigger had no such rule -- and the button being
       * hidden is not the guard, because a stale second tab, a second Keeper,
       * or a hand-made call can all still arrive here just as the last
       * question is removed. Counted INSIDE the transaction, against the same
       * rows advanceEdition counts, so the removal cannot land between the
       * check and the open. There is no way back out of `answering`. */
      const accepted = await tx.catchupPrompt.count({
        where: { editionId, accepted: true },
      });
      if (accepted === 0) return "empty" as const;

      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "collecting" },
        data: patch,
      });
      if (cas.count === 0) return "moved" as const;
      await notifyAnswersOpen(tx, {
        catchupId: edition.catchupId,
        editionId,
        groupId: edition.catchup.group.id,
        groupName: edition.catchup.group.name,
        excludeUserId: session.user.id,
      });
      return "opened" as const;
    });
    if (applied === "empty") {
      return { error: "There are no questions in this Round yet, so there is nothing to answer." };
    }
    if (applied === "moved") return { error: "This Round already moved on." };

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true };
  });
}

/**
 * Keeper-only: answering -> preparing, ahead of `answersCloseAt`. Evaluates
 * the too-few-answers rule (spec 2.6) exactly like the natural close: zero
 * entries auto-extends the window once instead of proceeding.
 */
export async function closeAndPrepare(editionId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof editionId !== "string" || !editionId) return { error: "Invalid request." };

    const edition = await loadFreshEdition(editionId);
    if (!edition) return { error: "Catch-up round not found." };
    const membership = await loadMembership(edition.catchup.group.id, session.user.id);
    if (!membership) return { error: "You are not a member of this group." };
    if (
      !isEffectiveKeeper({
        viewerId: session.user.id,
        createdById: edition.catchup.createdById,
        groupRole: membership.role,
      })
    ) {
      return { error: "Only the Keeper can close and prepare early." };
    }
    const frozen = refuseIfFrozen(edition.catchup.status, "Resume it to pick the Round back up.");
    if (frozen) return frozen;
    if (edition.status !== "answering") {
      return { error: "This Round is not open for answers right now." };
    }

    const now = new Date();
    const entryCount = await prisma.catchupEntry.count({ where: { editionId } });

    if (shouldExtendForTooFew(edition, entryCount)) {
      const patch = extendPatch(edition, now);
      const applied = await prisma.$transaction(async (tx) => {
        const cas = await tx.catchupEdition.updateMany({
          where: { id: editionId, status: "answering", remindersSent: edition.remindersSent },
          data: patch,
        });
        if (cas.count === 0) return false;
        await notifyAnswersOpen(tx, {
          catchupId: edition.catchupId,
          editionId,
          groupId: edition.catchup.group.id,
          groupName: edition.catchup.group.name,
          onlyNonAnswerers: true,
        });
        return true;
      });
      if (!applied) return { error: "This Round already moved on." };

      revalidatePath(`/catchups/${edition.catchupId}`);
      return {
        success: true,
        extended: true,
        message: "No one has answered yet, so the window was extended by 3 days.",
      };
    }

    const patch = preparingPatch(edition, now);
    const cas = await prisma.catchupEdition.updateMany({
      where: { id: editionId, status: "answering" },
      data: patch,
    });
    if (cas.count === 0) return { error: "This Round already moved on." };

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true, extended: false };
  });
}

/**
 * Keeper-only: push the current phase's deadline out by 1, 2, 4 or 7 days
 * (owner, 2026-08-05). Works on BOTH windows: `collecting` moves
 * `questionsCloseAt`, `answering` moves `answersCloseAt`. Which one is being
 * moved is read from the Round's own fresh status, never from the caller, so a
 * stale page cannot extend the phase it thinks it is looking at.
 *
 * The compare-and-swap is on the deadline itself rather than just the status:
 * two Keepers each tapping "2 days" on their own stale copy of the page should
 * add two days, not four, and matching on the timestamp they both saw means the
 * second one loses and is told so.
 *
 * `preparing` and `published` are refused: there is no window left to extend,
 * and reopening a sealed Round is a different (and unasked-for) feature.
 */
export async function extendDeadline(editionId: string, days: number) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof editionId !== "string" || !editionId) return { error: "Invalid request." };
    const parsedDays = extendDaysSchema.safeParse(days);
    if (!parsedDays.success) return { error: "Pick 1, 2, 4 days or a week." };

    const edition = await loadFreshEdition(editionId);
    if (!edition) return { error: "Catch-up round not found." };
    const membership = await loadMembership(edition.catchup.group.id, session.user.id);
    if (!membership) return { error: "You are not a member of this group." };
    if (
      !isEffectiveKeeper({
        viewerId: session.user.id,
        createdById: edition.catchup.createdById,
        groupRole: membership.role,
      })
    ) {
      return { error: "Only a Keeper can extend the deadline." };
    }
    const frozen = refuseIfFrozen(edition.catchup.status, "Resume it to pick the Round back up.");
    if (frozen) return frozen;

    const now = new Date();
    const patch = extendPhasePatch(edition, parsedDays.data, now);
    // `extendPhasePatch` returns null only for a status past the two open
    // windows, so this is the one thing left to say.
    if (!patch) {
      return { error: "This Round has closed. There is no deadline left to extend." };
    }

    const cas = await prisma.catchupEdition.updateMany({
      where:
        edition.status === "collecting"
          ? { id: editionId, status: "collecting", questionsCloseAt: edition.questionsCloseAt }
          : { id: editionId, status: "answering", answersCloseAt: edition.answersCloseAt },
      data: patch,
    });
    if (cas.count === 0) return { error: "The deadline just moved. Reload and try again." };

    // Any reminder already in the bell now names a deadline that is no longer
    // true ("Last day to answer" when there is a week left). Clear them; the
    // daily reminder writes an accurate one on its next pass.
    if (edition.status === "answering") {
      await prisma.notification.deleteMany({
        where: { type: "catchup_reminder", link: `/catchups/${edition.catchupId}/answer` },
      });
    }

    revalidatePath(`/catchups/${edition.catchupId}`);
    revalidatePath(`/catchups/${edition.catchupId}/answer`);
    return {
      success: true as const,
      days: parsedDays.data,
      phase: edition.status === "collecting" ? ("questions" as const) : ("answers" as const),
    };
  });
}

/** Keeper-only: preparing -> published, shortcutting the 24h ritual hold. */
export async function publishNow(editionId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof editionId !== "string" || !editionId) return { error: "Invalid request." };

    const edition = await loadFreshEdition(editionId);
    if (!edition) return { error: "Catch-up round not found." };
    const membership = await loadMembership(edition.catchup.group.id, session.user.id);
    if (!membership) return { error: "You are not a member of this group." };
    if (
      !isEffectiveKeeper({
        viewerId: session.user.id,
        createdById: edition.catchup.createdById,
        groupRole: membership.role,
      })
    ) {
      return { error: "Only the Keeper can publish early." };
    }
    const frozen = refuseIfFrozen(edition.catchup.status, "Resume it to pick the Round back up.");
    if (frozen) return frozen;
    if (edition.status !== "preparing") {
      return { error: "This Round is not ready to publish yet." };
    }

    const now = new Date();
    const patch = publishPatch(now);

    const applied = await prisma.$transaction(async (tx) => {
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "preparing" },
        data: patch,
      });
      if (cas.count === 0) return false;
      if (edition.catchup.status === "active") {
        await tx.catchup.update({
          where: { id: edition.catchupId },
          data: { nextOpensAt: addCadenceGap(now, edition.catchup.cadence) },
        });
      }
      await notifyPublished(tx, {
        catchupId: edition.catchupId,
        editionId,
        groupId: edition.catchup.group.id,
        groupName: edition.catchup.group.name,
        excludeUserId: session.user.id,
      });
      return true;
    });
    if (!applied) return { error: "This Round already moved on." };

    revalidatePath(`/catchups/${edition.catchupId}`);
    revalidatePath(`/catchups/round/${editionId}`);
    revalidatePath("/catchups");
    return { success: true };
  });
}

// ─── Entries (spec 3.4, 3.4.1) ─────────────────────────────────────────────────

/**
 * Autosave-friendly upsert of one member's answer to one prompt, keyed by
 * `[promptId, authorId]`. Every field is independently optional so a blur on
 * just the text area does not clobber a photo or song saved moments earlier
 * (a field only gets written when the caller actually sent it). A pasted
 * Spotify link is resolved server-side via `resolveSpotify`; on failure the
 * rest of the answer still saves and a friendly `songWarning` comes back
 * instead of blocking the save (spec 3.4.1, "never block the answer").
 */
export async function submitEntry(input: {
  promptId: string;
  body?: string;
  images?: string[];
  songUrl?: string;
  baseUpdatedAt?: string;
}) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    // An answer carries prose and images into a Round that gets published to
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
    if (!prompt || !prompt.accepted) return { error: "This question is not part of the Round." };

    const edition = await loadFreshEdition(prompt.editionId);
    if (!edition) return { error: "Catch-up round not found." };
    const membership = await loadMembership(edition.catchup.group.id, session.user.id);
    if (!membership) return { error: "You are not a member of this group." };
    if (edition.status !== "answering") {
      return { error: "Answering is not open for this Round right now." };
    }
    const frozen = refuseIfFrozen(
      edition.catchup.status,
      "Answering opens again when the Keeper resumes it."
    );
    if (frozen) return frozen;

    const hasBody = parsed.data.body !== undefined;
    const hasImages = parsed.data.images !== undefined;
    const hasSong = parsed.data.songUrl !== undefined;

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

    let songPatch: { songUrl: string | null; songTitle: string | null; songArt: string | null } | undefined;
    let songWarning: string | undefined;
    if (hasSong) {
      const trimmedSong = parsed.data.songUrl!.trim();
      if (!trimmedSong) {
        songPatch = { songUrl: null, songTitle: null, songArt: null };
      } else {
        const resolved = await resolveSpotify(trimmedSong);
        if (resolved.ok) {
          songPatch = { songUrl: resolved.songUrl, songTitle: resolved.songTitle, songArt: resolved.songArt };
        } else {
          songWarning = resolved.error; // fail soft: the rest of the answer still saves below
        }
      }
    }

    /* The lost-update guard, when the caller is holding a row version (audit
     * C-125, the same instrument editPost carries for M66).
     *
     * The answering surface autosaves the whole field on every blur, and the
     * write had no precondition: a member with the same Round open on a
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
      ...(songPatch ? songPatch : {}),
    };
    const columns = {
      id: true,
      body: true,
      images: true,
      songUrl: true,
      updatedAt: true,
    } as const;

    /* The window is re-read at WRITE time, not trusted from the read above
     * (audit C-027).
     *
     * Between the two sits `resolveSpotify`, a network call with a 3-second
     * budget, and every other transition in this feature is a CAS on status
     * for exactly this reason. In those three seconds a Keeper's "close and
     * prepare", or any page view's clock advance, can move the Round out of
     * `answering` -- and this write would have landed an answer in a Round
     * already being made ready to publish, where it appears in the keepsake
     * with nobody expecting it. Counted inside the transaction that does the
     * write, so nothing can move in between. */
    const entry = await prisma.$transaction(async (tx) => {
      const open = await tx.catchupEdition.count({
        where: { id: prompt.editionId, status: "answering" },
      });
      if (open === 0) return "closed" as const;

      if (base) {
        const moved = await tx.catchupEntry.updateMany({
          where: { promptId, authorId: session.user.id, updatedAt: base },
          data: written,
        });
        if (moved.count === 0) return "stale" as const;
        return tx.catchupEntry.findUniqueOrThrow({ where: key, select: columns });
      }
      return tx.catchupEntry.upsert({
        where: key,
        create: {
          editionId: prompt.editionId,
          promptId,
          authorId: session.user.id,
          body: bodyValue ?? null,
          images: imagesValue ?? null,
          songUrl: songPatch?.songUrl ?? null,
          songTitle: songPatch?.songTitle ?? null,
          songArt: songPatch?.songArt ?? null,
        },
        update: written,
        select: columns,
      });
    });

    if (entry === "closed") {
      return { error: "Answering has closed for this Round. Your answer was not saved." };
    }
    if (entry === "stale") {
      return {
        error:
          "This answer has changed somewhere else. Reload the page before you carry on, or your writing here will replace it.",
      };
    }

    /* Erasing everything withdraws you from the Round (audit Low 36).
     *
     * There was no delete path at all: clearing every field left the row, so a
     * member who wrote something personal and then took it all back was still
     * published -- an answer card reading "Showed up for this Round without
     * adding anything here.", their bird in the masthead strip, and a place in
     * "12 of the group wrote in". The empty row also counted as an entry for
     * the too-few-answers rule, so a Round whose only answer was an erased one
     * skipped the extension and published with nothing to read.
     *
     * Deleted rather than kept-and-filtered because there is nothing left in
     * it: no body, no photograph, no song. Nothing is lost that the member has
     * not already removed, and a later answer simply creates the row again.
     * The `promptId_authorId` unique makes a second delete a no-op. */
    if (!entry.body && !entry.images && !entry.songUrl) {
      await prisma.catchupEntry.deleteMany({ where: { id: entry.id } });
      revalidatePath(`/catchups/${edition.catchupId}/answer`);
      // No row, so no version: the next save creates one afresh.
      return { success: true, entryId: null, updatedAt: null, songWarning };
    }

    revalidatePath(`/catchups/${edition.catchupId}/answer`);
    /* The new version, so the surface that just saved can hold it and keep
       saving; without this every save after the first would look stale. */
    return {
      success: true,
      entryId: entry.id,
      updatedAt: entry.updatedAt.toISOString(),
      songWarning,
    };
  });
}

/**
 * Heart one answer (spec 3.6). Hearts belong to the published reader: an
 * edition still `preparing` hides every answer from everyone, Keeper
 * included, so a heart cannot be cast until the Round is `published`.
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

    const edition = await loadFreshEdition(entry.editionId);
    if (!edition) return { error: "Catch-up round not found." };
    const membership = await loadMembership(edition.catchup.group.id, session.user.id);
    if (!membership) return { error: "You are not a member of this group." };
    if (edition.status !== "published") {
      return { error: "Hearts open once the Round is published." };
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
      revalidatePath(`/catchups/round/${entry.editionId}`);
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

    revalidatePath(`/catchups/round/${entry.editionId}`);
    return { success: true, loved: true };
  });
}

// ─── Who is in it (owner, 2026-08-05) ─────────────────────────────────────────
//
//  "Can't control who's in the catch up once the question round has started.
//   Might still want to add and remove and just see who all are part of it
//   while it's going on. Also the ability to make other people the keeper."
//
//  None of these look at the Round's status: adding, removing and handing over
//  the Keeper's hat are things a group does mid-cycle, and refusing them once
//  questions open was the bug being reported. They are Keeper-only, and they
//  operate on `GroupMember` because that is the membership container every
//  other part of the feature already derives its audience from.
//
//  A second Keeper is a `GroupMember.role` of "admin", which `isEffectiveKeeper`
//  has always honoured. So "make them a Keeper" needs no new column and no
//  migration; it is the role flip, and every Keeper-gated action picks it up
//  at once.

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
 * Every notification kind this feature writes. Listed rather than matched by
 * prefix so a future `catchup_`-prefixed type has to be considered here on
 * purpose: a member who has left, or binned their copy, should be left with
 * none of them, and silently missing one is a dead link in a bell.
 */
const CATCHUP_NOTIFICATION_TYPES = [
  "catchup_questions_open",
  "catchup_answers_open",
  "catchup_reminder",
  "catchup_published",
  "catchup_love",
] as const;

/**
 * Clear one member's waiting notifications for one Catch-up.
 *
 * Two link shapes, because the reveal and the love nudge point at a ROUND
 * (`/catchups/round/<editionId>`) rather than at the Catch-up, so a
 * `startsWith('/catchups/<catchupId>')` filter alone quietly leaves the two
 * that matter most sitting in the bell, aimed at a page the member can no
 * longer open.
 */
async function clearCatchupNotifications(userId: string, catchupId: string): Promise<void> {
  const editions = await prisma.catchupEdition.findMany({
    where: { catchupId },
    select: { id: true },
  });
  const roundLinks = editions.map((e) => `/catchups/round/${e.id}`);
  await prisma.notification.deleteMany({
    where: {
      userId,
      type: { in: [...CATCHUP_NOTIFICATION_TYPES] },
      OR: [
        { link: { startsWith: `/catchups/${catchupId}` } },
        ...(roundLinks.length > 0 ? [{ link: { in: roundLinks } }] : []),
      ],
    },
  });
}

/**
 * The gate the three personal-copy actions share: you must be in a Catch-up to
 * have a copy of it. Returns the two facts they need and nothing else.
 */
async function loadOwnCatchupCopy(catchupId: string, viewerId: string) {
  const ctx = await loadCatchupContext(catchupId, viewerId);
  if (!ctx) return { error: "Catch-up not found." as const };
  if (!ctx.membership) return { error: "You are not in this Catch-up." as const };
  return { groupId: ctx.catchup.groupId, createdById: ctx.catchup.createdById };
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
  data: { archivedAt?: Date | null; deletedAt?: Date | null }
): Promise<void> {
  try {
    await prisma.catchupPref.upsert({
      where: { catchupId_userId: { catchupId, userId } },
      create: { catchupId, userId, ...data },
      update: data,
    });
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;
    await prisma.catchupPref.updateMany({ where: { catchupId, userId }, data });
  }
}

/**
 * The Catch-up a Keeper is acting on, or the reason they may not. Builds on
 * `loadCatchupContext` rather than re-reading the same two rows, so the three
 * actions below share one Keeper gate instead of each restating it.
 */
async function loadKeeperScope(catchupId: string, viewerId: string) {
  const ctx = await loadCatchupContext(catchupId, viewerId);
  if (!ctx) return { error: "Catch-up not found." as const };
  if (!ctx.membership) return { error: "You are not a member of this Catch-up." as const };
  if (
    !isEffectiveKeeper({
      viewerId,
      createdById: ctx.catchup.createdById,
      groupRole: ctx.membership.role,
    })
  ) {
    return { error: "Only a Keeper can change who is in this Catch-up." as const };
  }
  return { catchup: ctx.catchup };
}

/**
 * Keeper-only: add people to a live Catch-up. Silently skips anyone already in
 * (re-adding is a no-op, not an error) and anyone who is blocked or no longer a
 * real user, so a picker that went stale between opening and submitting does
 * not fail the whole action.
 */
export async function addCatchupMembers(catchupId: string, userIds: string[]) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    // Enrols other people and notifies each of them. Reaching real members
    // waits for a confirmed address.
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    // Same ceiling as creation (audit M29): adding is the same reach.
    const parsed = z
      .array(z.string().min(1))
      .min(1)
      .max(MAX_CATCHUP_PEOPLE)
      .safeParse(userIds);
    if (!parsed.success) {
      return { error: `Pick between 1 and ${MAX_CATCHUP_PEOPLE} people.` };
    }

    const scope = await loadKeeperScope(catchupId, session.user.id);
    if ("error" in scope) return { error: scope.error };
    const { catchup } = scope;
    if (catchup.status === "ended") return { error: "This Catch-up has ended." };

    // Same alumni-only rule as creation: the picker never offers a teacher,
    // so a raw call must not be able to enrol one either.
    const real = await prisma.user.findMany({
      where: {
        id: { in: [...new Set(parsed.data)] },
        isBlocked: false,
        // Deletion-pending accounts are out of reach here too (audit M35).
        deletionRequestedAt: null,
        accountType: { notIn: ["teacher", "ex_teacher"] },
      },
      select: { id: true },
    });
    if (real.length === 0) return { error: "No one to add." };

    /* Who is already in, read BEFORE the insert. It decides which of the
       people below are genuinely NEW, which is the only set whose filing
       state may be cleared -- see the comment on that write. */
    const alreadyIn = new Set(
      (
        await prisma.groupMember.findMany({
          where: { groupId: catchup.groupId, userId: { in: real.map((u) => u.id) } },
          select: { userId: true },
        })
      ).map((m) => m.userId)
    );

    // createMany + skipDuplicates rather than a read-then-write: the unique on
    // (groupId, userId) is what decides, so two Keepers adding the same person
    // at the same moment cannot make this throw.
    const created = await prisma.groupMember.createMany({
      data: real.map((u) => ({ groupId: catchup.groupId, userId: u.id, role: "member" })),
      skipDuplicates: true,
    });

    /* Being added puts the Catch-up back on your list. Without this, someone
       who binned their copy and was later re-added would come back with the
       stamp still on: the card would reappear in "Recently deleted" rather
       than among their Catch-ups, and the nightly sweep would then quietly
       remove them a second time from something they had just been invited
       into. Their reminder setting is left alone -- that is a preference, not
       a filing state.

       Scoped to the people this call actually ADDED, never to everyone named
       in it. Archiving and deleting are personal by the owner's decision, and
       the Keeper-only variant that overrides them was offered and declined; a
       Keeper re-listing somebody who is already a member must not be able to
       drag their own copy back out of their bin as a side effect (write-path
       review, 2026-08-21). The picker never offers an existing member, so
       this only ever mattered to a hand-made call -- which is exactly the
       kind that must not be able to do it. */
    const newlyAdded = real.map((u) => u.id).filter((id) => !alreadyIn.has(id));
    if (newlyAdded.length > 0) {
      await prisma.catchupPref.updateMany({
        where: {
          catchupId,
          userId: { in: newlyAdded },
          OR: [{ archivedAt: { not: null } }, { deletedAt: { not: null } }],
        },
        data: { archivedAt: null, deletedAt: null },
      });
    }

    revalidatePath(`/catchups/${catchupId}`);
    revalidatePath("/catchups");
    return { success: true as const, added: created.count };
  });
}

/**
 * Keeper-only: take someone out of a live Catch-up.
 *
 * Their words stay where they are. A published Round is a record of what the
 * group wrote, and unpublishing someone's answer out of it after the fact is
 * not what "remove" means here; what removal does is end their access and stop
 * their notifications. Re-adding restores both, which is why this is safe to
 * offer mid-cycle.
 *
 * The Catch-up's creator cannot be removed (they are its permanent Keeper),
 * and a Keeper cannot remove themselves: leaving is a different action, and one
 * misfire here would leave a Catch-up with nobody able to tend it.
 */
export async function removeCatchupMember(catchupId: string, userId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    if (typeof userId !== "string" || !userId) return { error: "Invalid request." };

    const scope = await loadKeeperScope(catchupId, session.user.id);
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
      return tx.groupMember.deleteMany({ where: { groupId: catchup.groupId, userId } });
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
 * Leave a Catch-up you were put into.
 *
 * Nobody accepts an invitation to a Catch-up: `createCatchupWithPeople` and
 * `addCatchupMembers` enrol up to a hundred people directly, and until this
 * existed the only way out was to ask a Keeper to remove you, because
 * `removeCatchupMember` refuses self-removal by design (bug audit B-063).
 *
 * Your words stay where they are. A published Round is a keepsake the whole
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
         out leaves nobody who can curate a question, publish a Round or end
         it -- and no way to claim it, since making a Keeper needs a Keeper.
         A no-op whenever somebody else still holds the powers. */
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

/**
 * Throw your own copy of a Catch-up away, or take it back out of the bin.
 *
 * Only your copy. Nobody else's view changes, and nothing anyone else relies
 * on is destroyed -- the owner was offered the Keeper-only variant that
 * soft-deletes the shared Catch-up for everyone, and declined it (2026-08-21).
 *
 * Deleting stops this Catch-up's notifications to you at once and clears the
 * ones already waiting. After `RECENTLY_DELETED_DAYS` the nightly retention
 * sweep takes your `GroupMember` row for real, so delete is the gentle version
 * of leaving: same destination, with a month to change your mind. The
 * confirmation copy says exactly that, because a bin that quietly removes you
 * from a group in thirty days is not what "delete" usually promises.
 *
 * Refused for whoever started it, for the same reason `leaveCatchup` is: the
 * sweep would strip the founder's membership row and leave a Catch-up whose
 * Keeper cannot open it. Archiving is open to them, and so is ending it.
 */
export async function setCatchupDeleted(catchupId: string, deleted: boolean) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (IS_DEMO) return { error: DEMO_SHARED_COPY_REFUSAL };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    if (typeof deleted !== "boolean") return { error: "Invalid request." };
    const viewerId = session.user.id;

    const copy = await loadOwnCatchupCopy(catchupId, viewerId);
    if ("error" in copy) return { error: copy.error };
    if (deleted && copy.createdById && copy.createdById === viewerId) {
      return {
        error:
          "You started this Catch-up. Archive it to tidy your list, or end it for everyone.",
      };
    }

    await upsertCatchupPref(catchupId, viewerId, { deletedAt: deleted ? new Date() : null });
    if (deleted) await clearCatchupNotifications(viewerId, catchupId);

    revalidatePath("/catchups");
    return { success: true as const, deleted };
  });
}

/**
 * Keeper-only: hand someone else the Keeper's hat, or take it back.
 *
 * Writes `GroupMember.role = "keeper"`, which `isEffectiveKeeper` honours, so
 * one flip is the whole feature and no migration is needed (role is a free
 * string). Deliberately NOT `"admin"`, even though that also satisfies
 * `isEffectiveKeeper`: `"admin"` is the group's own admin role and is read
 * outside this feature, where `deletePost` lets a group admin delete anyone's
 * post in that group. Making someone a Keeper of a Catch-up must not silently
 * also make them a moderator of a group's posts.
 *
 * The creator's own row is untouchable: they hold Keeper power through
 * `Catchup.createdById` regardless of role, so "demoting" them would change
 * nothing while looking like it had. Saying so is better than a silent no-op.
 */
export async function setCatchupKeeper(catchupId: string, userId: string, isKeeper: boolean) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    if (typeof userId !== "string" || !userId) return { error: "Invalid request." };
    if (typeof isKeeper !== "boolean") return { error: "Invalid request." };

    const scope = await loadKeeperScope(catchupId, session.user.id);
    if ("error" in scope) return { error: scope.error };
    const { catchup } = scope;

    if (catchup.createdById && userId === catchup.createdById) {
      return { error: "Whoever started a Catch-up is always its Keeper." };
    }

    /* Taking the hat off touches the hat and nothing else (audit C-025).
       Granting deliberately writes "keeper" rather than "admin" so that a
       Catch-up Keeper is not silently made a moderator of the group's posts --
       and the revoke had no matching care: it wrote "member" over whatever it
       found, so revoking the hat from someone who held the group's own "admin"
       role stripped their post moderation as a side effect, in the opposite
       direction to the decoupling above. Scoped to `role: "keeper"`, a revoke
       on an "admin" row is now the no-op it should always have been. */
    const updated = isKeeper
      ? await prisma.groupMember.updateMany({
          where: { groupId: catchup.groupId, userId },
          data: { role: "keeper" },
        })
      : await prisma.groupMember.updateMany({
          where: { groupId: catchup.groupId, userId, role: "keeper" },
          data: { role: "member" },
        });
    if (updated.count === 0) {
      // A revoke matching nothing means they never wore this hat: either they
      // are not in the Catch-up, or they hold the group's own admin role,
      // which this control is not the place to take away.
      const stillHere = await prisma.groupMember.count({
        where: { groupId: catchup.groupId, userId },
      });
      if (stillHere === 0) return { error: "They are not in this Catch-up." };
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

/** Keeper-only: manually nudge every non-answerer, bypassing their `off` pref. */
export async function nudgeGroup(editionId: string) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (IS_DEMO) return { error: "A nudge would notify everyone in the Catch-up, so the demo leaves it switched off." };
    if (typeof editionId !== "string" || !editionId) return { error: "Invalid request." };

    const edition = await loadFreshEdition(editionId);
    if (!edition) return { error: "Catch-up round not found." };
    const membership = await loadMembership(edition.catchup.group.id, session.user.id);
    if (!membership) return { error: "You are not a member of this group." };
    if (
      !isEffectiveKeeper({
        viewerId: session.user.id,
        createdById: edition.catchup.createdById,
        groupRole: membership.role,
      })
    ) {
      return { error: "Only the Keeper can nudge the group." };
    }
    const frozen = refuseIfFrozen(edition.catchup.status, "Resume it to pick the Round back up.");
    if (frozen) return frozen;
    if (edition.status !== "answering") {
      return { error: "Nudges only make sense while answers are open." };
    }

    /* Metered like the other whole-group fanouts (audit C-026). This one is a
       manual nudge: it bypasses the daily bucket AND every member's "off"
       setting, so it is the one notification in the feature with no natural
       ceiling of its own. Looped, it re-creates an unread bell entry for the
       whole roster as often as the caller likes, for people who have
       explicitly asked not to hear about it. The shared "catchups" bucket is
       five an hour, which is far more nudging than any real Keeper does. */
    const limited = await rateLimit("catchups", session.user.id);
    if (!limited.ok) return { error: limited.error };

    await notifyReminder(prisma, {
      catchupId: edition.catchupId,
      editionId,
      groupId: edition.catchup.group.id,
      groupName: edition.catchup.group.name,
      bypassOff: true,
      keeperName: session.user.name,
    });

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true };
  });
}
