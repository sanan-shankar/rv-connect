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
 *   - the effective Keeper is the Catch-up's `createdBy` OR any group admin,
 *     computed via `isEffectiveKeeper` (WP1) from freshly-read rows, never
 *     trusted from the caller.
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
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  addCadenceGap,
  addDays,
  advanceEdition,
  answeringPatch,
  extendPatch,
  isEffectiveKeeper,
  isMissingCatchupTable,
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
import type {
  Cadence,
  CatchupStatus,
  EditionStatus,
  PromptCategory,
  ReminderMode,
} from "@/lib/catchups-types";

// ─── Soft caps (spec 3.3.1, enforced here rather than only surfaced as UI copy) ──

const MAX_PENDING_PROMPTS_PER_MEMBER = 3;
// Raised from 12 and no longer surfaced anywhere in the UI. The owner's call:
// a visible "3 of 12" counter made a Round feel rationed for no reason nobody
// could explain. This is now purely a runaway/spam ceiling that a real group
// will never reach, not a budget members are asked to manage.
const MAX_ACCEPTED_PROMPTS_PER_EDITION = 40;

// ─── Validation ──────────────────────────────────────────────────────────────

const CADENCE_VALUES = ["biweekly", "monthly", "quarterly"] as const;
const PROMPT_CATEGORY_VALUES = [
  "valley-days",
  "right-now",
  "most-likely-to",
  "on-the-horizon",
  "small-things",
] as const;
const REMINDER_MODE_VALUES = ["all", "last", "off"] as const;

const cadenceSchema = z.enum(CADENCE_VALUES);
const promptCategorySchema = z.enum(PROMPT_CATEGORY_VALUES).nullable();
const reminderModeSchema = z.enum(REMINDER_MODE_VALUES);

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

const curateAcceptRemoveSchema = z.object({
  action: z.enum(["accept", "remove"]),
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
          data: { groupId, createdById: session.user.id, cadence },
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
        data: { groupId: group.id, createdById: creatorId, cadence },
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
 * The author is always stored regardless of `showAsker`. A regular member's
 * submission is pending (`accepted: false`) until the Keeper curates it; the
 * effective Keeper's own submission auto-accepts (spec 3.3.1). Soft caps: up
 * to 3 pending submissions per member, up to 12 accepted prompts per Round.
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

    // `position` only matters for accepted prompts: it is the Round's
    // rendered/reorderable order (the `reorder` branch below only ever
    // touches `accepted: true` rows). A Keeper's own addition here is
    // auto-accepted, so it MUST derive its position from the same
    // denominator curatePrompt's accept branch uses below (count of already
    // `accepted: true` prompts), not a count of every prompt in the edition
    // (which also includes pending ones) - otherwise two ordinary Keeper
    // actions in one sitting (add a question directly, then curate a
    // member's pending one) can hand out the same position twice. A
    // still-pending prompt's position is a placeholder: curatePrompt
    // always overwrites it with a fresh accepted-count at the moment it is
    // accepted, so any distinct value is safe for it.
    let acceptedCount = 0;
    if (keeper) {
      acceptedCount = await prisma.catchupPrompt.count({
        where: { editionId, accepted: true },
      });
      if (acceptedCount >= MAX_ACCEPTED_PROMPTS_PER_EDITION) {
        return { error: "This Round has as many questions as it can hold. Remove one to add another." };
      }
    } else {
      const pendingCount = await prisma.catchupPrompt.count({
        where: { editionId, authorId: session.user.id, accepted: false },
      });
      if (pendingCount >= MAX_PENDING_PROMPTS_PER_MEMBER) {
        return { error: "You can have up to 3 questions waiting on the Keeper at a time." };
      }
    }

    const position = keeper
      ? acceptedCount
      : await prisma.catchupPrompt.count({ where: { editionId } });

    const prompt = await prisma.catchupPrompt.create({
      data: {
        editionId,
        authorId: session.user.id,
        text,
        category: category ?? null,
        source: keeper ? "keeper" : category ? "library" : "member",
        showAsker,
        accepted: keeper,
        position,
      },
      select: { id: true },
    });

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true, promptId: prompt.id, accepted: keeper };
  });
}

export type CuratePromptInput =
  | { action: "accept"; promptId: string }
  | { action: "remove"; promptId: string }
  | { action: "reorder"; editionId: string; orderedPromptIds: string[] };

/**
 * Keeper curation of a Round's questions (spec 3.3): accept a pending
 * submission, remove one, or persist a new accepted order. All three require
 * effective Keeper power and only run while the Round is still `collecting`.
 * "Add from the library" for a Keeper is just `submitPrompt`, which
 * auto-accepts when the caller already holds Keeper power.
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

    const parsed = curateAcceptRemoveSchema.safeParse(input);
    if (!parsed.success) return { error: "Invalid request." };
    const { action, promptId } = parsed.data;

    const prompt = await prisma.catchupPrompt.findUnique({
      where: { id: promptId },
      select: { id: true, editionId: true, accepted: true },
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

    if (action === "remove") {
      await prisma.catchupPrompt.delete({ where: { id: promptId } });
    } else if (!prompt.accepted) {
      const acceptedCount = await prisma.catchupPrompt.count({
        where: { editionId: prompt.editionId, accepted: true },
      });
      if (acceptedCount >= MAX_ACCEPTED_PROMPTS_PER_EDITION) {
        return { error: "This Round has as many questions as it can hold. Remove one to add another." };
      }
      await prisma.catchupPrompt.update({
        where: { id: promptId },
        data: { accepted: true, position: acceptedCount },
      });
    }

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
    const patch = answeringPatch(now);

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
      modes: ["all", "last"],
      bypassOff: true,
      keeperName: session.user.name,
    });

    revalidatePath(`/catchups/${edition.catchupId}`);
    return { success: true };
  });
}
