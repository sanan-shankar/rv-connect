/* ------------------------------------------------------------------ *
 *  Catch-ups: shared TypeScript vocabulary.
 *
 *  This file is the one place the whole feature agrees on its shapes:
 *   - the string-literal unions for the Round state machine and cadence,
 *   - the pure-function input shape (EditionTiming) the state machine reads,
 *   - the view models the screens (index / home / answer / reader) render,
 *   - the notify-builder signatures, declared here so WP2 and WP7 can
 *     compile against them independently of the notify implementation.
 *
 *  It is safe to import from client components: every Prisma reference is
 *  `import type`, so nothing server-only is bundled.
 * ------------------------------------------------------------------ */

import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// ─── String-literal unions (mirror the free-string columns in schema) ────────

/** CatchupEdition.status — forward-only: draft -> collecting -> answering -> preparing -> published. */
export type EditionStatus =
  | "draft"
  | "collecting"
  | "answering"
  | "preparing"
  | "published";

/** Catchup.status. */
export type CatchupStatus = "active" | "paused" | "ended";

/** Catchup.cadence. All three are recurring. */
export type Cadence = "biweekly" | "monthly" | "quarterly";

/** CatchupPref.reminderMode. */
export type ReminderMode = "all" | "last" | "off";

/** CatchupPrompt.source. */
export type PromptSource = "library" | "member" | "keeper";

/**
 * CatchupPrompt.category — a library set id, or null for a custom question.
 *
 * The column is a plain String, so this doubles as the question's KIND: most
 * sets are answered with text, while `photo-wall` and `songs` switch the
 * answering UI to a picture upload and a song picker respectively. Carrying
 * the kind here rather than in a new column keeps both special question types
 * migration-free.
 *
 * This ARRAY, not the union, is the source of truth, and every validator must
 * import it rather than retyping the ids. `catchups/actions.ts` used to keep
 * its own hand-written Zod enum, which went stale the day the library was
 * rewritten (2026-07-25) and started rejecting three of the five live sets with
 * a raw "Invalid option: expected one of valley-days|..." in front of the
 * member. Deriving the union from the array means a set can never again be in
 * the library but absent from the validator.
 *
 * The last three ids are sets that were CUT in that rewrite. Rows written
 * before then still carry them, so they stay here to keep reads type-safe and
 * to keep an old question re-submittable; nothing offers them any more.
 */
export const PROMPT_CATEGORIES = [
  "right-now",
  "small-things",
  "the-valley",
  "photo-wall",
  "songs",
  "valley-days",
  "most-likely-to",
  "on-the-horizon",
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

/** How a question is answered. Derived from the category, see PROMPT_KIND. */
export type PromptKind = "text" | "photo" | "songs";

/** Only these two sets change the answering control; everything else is text. */
export function promptKind(category: PromptCategory | null): PromptKind {
  if (category === "photo-wall") return "photo";
  if (category === "songs") return "songs";
  return "text";
}

/** Notification.type values this feature writes. `type` is a free string, so no migration. */
export type CatchupNotifyKind =
  | "catchup_questions_open"
  | "catchup_answers_open"
  | "catchup_reminder"
  | "catchup_published"
  | "catchup_love";

// ─── Pure state-machine input ────────────────────────────────────────────────

/**
 * The minimal slice of a Round the pure state machine reads. `computeStatus`
 * and `planNextAction` take exactly this — no relations, no DB. Timestamps may
 * arrive as Date or as the ISO strings a JSON round-trip produces.
 */
export type EditionTiming = {
  status: EditionStatus;
  questionsCloseAt: Date | string | null;
  answersCloseAt: Date | string | null;
  publishAt: Date | string | null;
  publishedAt: Date | string | null;
  remindersSent: number;
};

// ─── View models (what the screens render) ───────────────────────────────────

/** Compatible with `AvatarUser` from bird-avatar.tsx, so it drops into BirdAvatar / IdentityRow. */
export type CatchupPersonRef = {
  id: string;
  name: string;
  photoUrl?: string | null;
  avatarSpecies?: number | null;
  birdOverride?: string | null;
};

export type CatchupSongView = {
  url: string;
  title: string;
  art: string | null;
};

export type CatchupPromptView = {
  id: string;
  text: string;
  category: PromptCategory | null;
  source: PromptSource;
  showAsker: boolean;
  accepted: boolean;
  position: number;
  /** The asker, or null when the question was submitted anonymously
   *  (showAsker=false). There is no Keeper exception -- a Keeper curates the
   *  queue without seeing who asked, which is what this comment used to say
   *  the opposite of while one of the two renderers believed it (audit C-019).
   *  The author always sees their own name; they are the only person who
   *  already knows. `askerVisible()` in catchups.ts is the one authority. */
  asker: CatchupPersonRef | null;
};

export type CatchupEntryView = {
  id: string;
  promptId: string;
  author: CatchupPersonRef;
  body: string | null;
  images: string[];
  song: CatchupSongView | null;
  loveCount: number;
  lovedByViewer: boolean;
  createdAt: Date | string;
};

/** One question and every answer to it, for the reader and the home console. */
export type CatchupRoundSection = {
  prompt: CatchupPromptView;
  entries: CatchupEntryView[];
};

export type CatchupRoundView = {
  editionId: string;
  catchupId: string;
  number: number;
  status: EditionStatus;
  groupId: string;
  groupName: string;
  /** Catchup.title, or the "{group} Catch-ups" fallback. */
  title: string;
  cadence: Cadence;
  questionsCloseAt: Date | string | null;
  answersCloseAt: Date | string | null;
  publishAt: Date | string | null;
  publishedAt: Date | string | null;
  nextOpensAt: Date | string | null;
  sections: CatchupRoundSection[];
  contributors: CatchupPersonRef[];
};

/** Who the viewer is relative to one Catch-up. Effective Keeper = creator OR group admin. */
export type CatchupViewerRole = {
  isMember: boolean;
  isCreator: boolean;
  isGroupAdmin: boolean;
  /** isCreator || isGroupAdmin — holds every Keeper power. */
  isKeeper: boolean;
};

/** One row on the index "Your Catch-ups" column (one per group the viewer belongs to). */
export type CatchupIndexCard = {
  groupId: string;
  groupName: string;
  members: CatchupPersonRef[];
  /** null = this group has no Catch-up yet (card shows "Start one"). */
  catchupId: string | null;
  catchupStatus: CatchupStatus | null;
  editionId: string | null;
  editionStatus: EditionStatus | null;
  roundNumber: number | null;
  /** Human status line, e.g. "Questions open, 2 days left" / "Answering now" / "Round 4 published". */
  statusLine: string;
  cta: { label: string; href: string } | null;
};

/** One vellum spine in the archive shelf. */
export type CatchupArchiveRow = {
  editionId: string;
  number: number;
  publishedAt: Date | string | null;
  contributorCount: number;
  /** A one-line teaser pulled from the most-loved answer. */
  teaser: string | null;
};

// ─── Notify-builder signatures ───────────────────────────────────────────────

/**
 * Either the shared client or a transaction client, so a notify builder can run
 * inside `advanceEdition`'s transaction (exactly-once with the status flip) or
 * standalone from a server action.
 */
export type CatchupDb = PrismaClient | Prisma.TransactionClient;

export type NotifyBaseCtx = {
  catchupId: string;
  editionId: string;
  groupId: string;
  groupName: string;
};

export type NotifyQuestionsOpenFn = (
  db: CatchupDb,
  ctx: NotifyBaseCtx & { excludeUserId?: string }
) => Promise<void>;

export type NotifyAnswersOpenFn = (
  db: CatchupDb,
  ctx: NotifyBaseCtx & { onlyNonAnswerers?: boolean; excludeUserId?: string }
) => Promise<void>;

export type NotifyReminderFn = (
  db: CatchupDb,
  ctx: NotifyBaseCtx & {
    /**
     * Whole days left in the answer window, 1 meaning "last day". Decides both
     * the copy and who qualifies: `reminderMode: "last"` members only hear from
     * us at 1. Omitted for a manual Keeper nudge, which is not a countdown.
     */
    daysLeft?: number;
    /**
     * The actual deadline, for the SENTENCE. `daysLeft` counts 24-hour blocks
     * because it keys the once-a-day bucket; the words a member reads count
     * valley calendar days, like the page the reminder links to (C-141/C-031).
     */
    closesAt?: Date | string | null;
    /** Manual Keeper nudge: reaches "off" members too. */
    bypassOff?: boolean;
    keeperName?: string;
  }
) => Promise<void>;

export type NotifyPublishedFn = (
  db: CatchupDb,
  ctx: NotifyBaseCtx & { excludeUserId?: string }
) => Promise<void>;

export type NotifyLoveFn = (
  db: CatchupDb,
  ctx: {
    catchupId: string;
    editionId: string;
    /** The group behind the Catch-up, so the author's reachability can be
     *  checked before they are written to (audit C-030). */
    groupId: string;
    groupName: string;
    entryId: string;
    authorId: string;
    likerId: string;
    likerName: string;
  }
) => Promise<void>;
