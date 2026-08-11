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
import { requireVerifiedEmail } from "@/lib/email-verification";
import { revalidatePath } from "next/cache";
import {
  addCadenceGap,
  addDays,
  advanceEdition,
  answeringPatch,
  extendPatch,
  extendPhasePatch,
  isEffectiveKeeper,
  isMissingCatchupTable,
  newInviteToken,
  preparingPatch,
  publishPatch,
  QUESTION_WINDOW_DAYS,
  resolveSpotify,
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

const seedPromptSchema = z.object({
  text: z.string().trim().min(1, "A question cannot be empty.").max(300, "Keep it under 300 characters."),
  category: promptCategorySchema.optional(),
});

const createCatchupSchema = z.object({
  groupId: z.string().min(1),
  cadence: cadenceSchema.default("monthly"),
  seedPrompts: z.array(seedPromptSchema).max(MAX_ACCEPTED_PROMPTS_PER_EDITION).default([]),
});

/** People-first creation: no pre-existing group needed, see createCatchupWithPeople. */
const createCatchupWithPeopleSchema = z.object({
  name: z.string().trim().min(1, "Give this Catch-up a name.").max(80, "Keep the name under 80 characters."),
  memberIds: z.array(z.string().min(1)).max(500),
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
    select: { id: true, createdById: true, status: true, groupId: true },
  });
  if (!catchup) return null;
  const membership = await loadMembership(catchup.groupId, userId);
  return { catchup, membership };
}

// ─── Catchup lifecycle (spec 3.2, 3.3 settings) ───────────────────────────────

/**
 * Start a Catch-up for a group (spec 3.2). A Catch-up can only be created
 * from a group, and any group member may start one; `groupId` is unique on
 * Catchup so a race between two members creating at once is resolved by the
 * database, not by this check. Creates Round 1 already `collecting`, attaches
 * the seed prompts as accepted (the creator already holds Keeper power the
 * moment the Catchup exists), and fires `catchup_questions_open`.
 */
export async function createCatchup(input: {
  groupId: string;
  cadence?: Cadence;
  seedPrompts?: Array<{ text: string; category?: PromptCategory | null }>;
}) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const parsed = createCatchupSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { groupId, cadence, seedPrompts } = parsed.data;

    const membership = await loadMembership(groupId, session.user.id);
    if (!membership) return { error: "Join this group before starting a Catch-up." };

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });
    if (!group) return { error: "Group not found." };

    const existing = await prisma.catchup.findUnique({ where: { groupId }, select: { id: true } });
    if (existing) {
      return { error: "This group already has a Catch-up.", catchupId: existing.id };
    }

    const now = new Date();
    try {
      const catchupId = await prisma.$transaction(async (tx) => {
        const catchup = await tx.catchup.create({
          data: { groupId, createdById: session.user.id, cadence, inviteToken: newInviteToken() },
        });
        const edition = await tx.catchupEdition.create({
          data: {
            catchupId: catchup.id,
            number: 1,
            status: "collecting",
            questionsCloseAt: addDays(now, QUESTION_WINDOW_DAYS),
          },
        });
        if (seedPrompts.length > 0) {
          await tx.catchupPrompt.createMany({
            data: seedPrompts.map((p, i) => ({
              editionId: edition.id,
              authorId: session.user.id,
              text: p.text,
              category: p.category ?? null,
              source: "keeper",
              showAsker: true,
              accepted: true,
              position: i,
            })),
          });
        }
        await notifyQuestionsOpen(tx, {
          catchupId: catchup.id,
          editionId: edition.id,
          groupId: group.id,
          groupName: group.name,
          excludeUserId: session.user.id,
        });
        return catchup.id;
      });

      revalidatePath("/catchups");
      revalidatePath(`/catchups/${catchupId}`);
      revalidatePath(`/groups/${groupId}`);
      return { success: true as const, catchupId };
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        const raced = await prisma.catchup.findUnique({ where: { groupId }, select: { id: true } });
        return { error: "This group already has a Catch-up.", catchupId: raced?.id ?? null };
      }
      throw err;
    }
  });
}

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
    const gate = await requireVerifiedEmail();
    if (!gate.ok) return { error: gate.error };

    const parsed = createCatchupWithPeopleSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { name, memberIds, cadence } = parsed.data;
    const creatorId = session.user.id;

    // The creator is always in, and never twice. Anyone who is not a real,
    // unblocked user is dropped rather than failing the whole creation: the
    // picker can go stale between rendering and submitting.
    const invitedIds = [...new Set(memberIds.filter((id) => id !== creatorId))];
    const realMembers = invitedIds.length
      ? await prisma.user.findMany({
          where: { id: { in: invitedIds }, isBlocked: false },
          select: { id: true },
        })
      : [];
    const memberRows = [
      { userId: creatorId, role: "admin" },
      ...realMembers.map((u) => ({ userId: u.id, role: "member" })),
    ];

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

    await prisma.catchup.update({ where: { id: catchupId }, data: { cadence: parsedCadence.data } });
    revalidatePath(`/catchups/${catchupId}`);
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

    await prisma.catchup.update({ where: { id: catchupId }, data: { status: "paused" } });
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

    await prisma.catchup.update({ where: { id: catchupId }, data: { status: "active" } });
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
      data: { status: "ended", nextOpensAt: null },
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
    const gate = await requireVerifiedEmail();
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

    const keeper = isEffectiveKeeper({
      viewerId: session.user.id,
      createdById: edition.catchup.createdById,
      groupRole: membership.role,
    });

    // `position` is the Round's rendered/reorderable order, so it counts the
    // rows that are actually in the Round. Everything written here is, so this
    // is simply "next in line". (Legacy rows from before auto-accept may still
    // be sitting pending; they are excluded, exactly as the reorder branch
    // excludes them, so they cannot push live questions out of sequence.)
    const acceptedCount = await prisma.catchupPrompt.count({
      where: { editionId, accepted: true },
    });
    if (acceptedCount >= MAX_ACCEPTED_PROMPTS_PER_EDITION) {
      return { error: "This Round has as many questions as it can hold. Remove one to add another." };
    }

    const prompt = await prisma.catchupPrompt.create({
      data: {
        editionId,
        authorId: session.user.id,
        text,
        category: category ?? null,
        source: keeper ? "keeper" : category ? "library" : "member",
        showAsker,
        accepted: true,
        position: acceptedCount,
      },
      select: { id: true },
    });

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
    if (edition.status !== "collecting") {
      return { error: "This Round is not collecting questions right now." };
    }

    const now = new Date();
    const patch = answeringPatch(edition, now);

    const applied = await prisma.$transaction(async (tx) => {
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "collecting" },
        data: patch,
      });
      if (cas.count === 0) return false;
      await notifyAnswersOpen(tx, {
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
}) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    // An answer carries prose and images into a Round that gets published to
    // everyone in it. The upload routes are gated too, so the images could not
    // have been produced by an unconfirmed account either.
    const gate = await requireVerifiedEmail();
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

    const hasBody = parsed.data.body !== undefined;
    const hasImages = parsed.data.images !== undefined;
    const hasSong = parsed.data.songUrl !== undefined;

    const bodyValue = hasBody ? parsed.data.body!.trim() || null : undefined;
    const imagesValue = hasImages
      ? parsed.data.images!.length
        ? JSON.stringify(parsed.data.images)
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

    const entry = await prisma.catchupEntry.upsert({
      where: { promptId_authorId: { promptId, authorId: session.user.id } },
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
      update: {
        ...(hasBody ? { body: bodyValue } : {}),
        ...(hasImages ? { images: imagesValue } : {}),
        ...(songPatch ? songPatch : {}),
      },
      select: { id: true },
    });

    revalidatePath(`/catchups/${edition.catchupId}/answer`);
    return { success: true, entryId: entry.id, songWarning };
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

    const existing = await prisma.catchupEntryLove.findUnique({
      where: { userId_entryId: { userId: session.user.id, entryId } },
      select: { id: true },
    });

    if (existing) {
      await prisma.catchupEntryLove.delete({ where: { id: existing.id } });
    } else {
      await prisma.catchupEntryLove.create({ data: { userId: session.user.id, entryId } });
      if (entry.authorId !== session.user.id) {
        await notifyLove(prisma, {
          catchupId: edition.catchupId,
          editionId: entry.editionId,
          groupName: edition.catchup.group.name,
          entryId,
          authorId: entry.authorId,
          likerId: session.user.id,
          likerName: session.user.name,
        });
      }
    }

    revalidatePath(`/catchups/round/${entry.editionId}`);
    return { success: true, loved: !existing };
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
    const gate = await requireVerifiedEmail();
    if (!gate.ok) return { error: gate.error };
    if (typeof catchupId !== "string" || !catchupId) return { error: "Invalid request." };
    const parsed = z.array(z.string().min(1)).min(1).max(500).safeParse(userIds);
    if (!parsed.success) return { error: "Pick at least one person." };

    const scope = await loadKeeperScope(catchupId, session.user.id);
    if ("error" in scope) return { error: scope.error };
    const { catchup } = scope;
    if (catchup.status === "ended") return { error: "This Catch-up has ended." };

    const real = await prisma.user.findMany({
      where: { id: { in: [...new Set(parsed.data)] }, isBlocked: false },
      select: { id: true },
    });
    if (real.length === 0) return { error: "No one to add." };

    // createMany + skipDuplicates rather than a read-then-write: the unique on
    // (groupId, userId) is what decides, so two Keepers adding the same person
    // at the same moment cannot make this throw.
    const created = await prisma.groupMember.createMany({
      data: real.map((u) => ({ groupId: catchup.groupId, userId: u.id, role: "member" })),
      skipDuplicates: true,
    });

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

    const removed = await prisma.groupMember.deleteMany({
      where: { groupId: catchup.groupId, userId },
    });
    if (removed.count === 0) return { error: "They are not in this Catch-up." };

    // Their pending nudges point at a Catch-up they can no longer open.
    await prisma.notification.deleteMany({
      where: {
        userId,
        type: { in: ["catchup_reminder", "catchup_answers_open", "catchup_questions_open"] },
        link: { startsWith: `/catchups/${catchupId}` },
      },
    });

    revalidatePath(`/catchups/${catchupId}`);
    revalidatePath("/catchups");
    return { success: true as const };
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

    const updated = await prisma.groupMember.updateMany({
      where: { groupId: catchup.groupId, userId },
      data: { role: isKeeper ? "keeper" : "member" },
    });
    if (updated.count === 0) return { error: "They are not in this Catch-up." };

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
    if (edition.status !== "answering") {
      return { error: "Nudges only make sense while answers are open." };
    }

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
