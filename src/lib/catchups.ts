/* ------------------------------------------------------------------ *
 *  Catch-ups: the shared engine.
 *
 *  Everything the recurring group newsletter needs that is not a screen or
 *  a server action lives here:
 *   - CATCHUP_PROMPT_SETS: the 30-question library (spec section 4).
 *   - timing + cadence constants and the calendar math.
 *   - the PURE state machine: computeStatus + planNextAction (no DB, no clock
 *     of their own), so every boundary is unit-testable with fake timestamps.
 *   - the IMPURE drivers: advanceEdition (one Prisma transaction per step,
 *     idempotent side effects guarded by the status column + remindersSent
 *     bitmask) and advanceDueCatchups (the lazy, read-time, no-cron advance).
 *   - resolveSpotify: the keyless oembed resolver (the SSRF boundary).
 *   - isMissingCatchupTable: the P2021 guard shared surfaces wrap with, so a
 *     table that does not exist yet can never break an existing page.
 *
 *  No em dashes. User-facing copy says "Rishi Valley", never "Alumni".
 * ------------------------------------------------------------------ */

import { randomUUID } from "node:crypto";
import type {
  Cadence,
  CatchupNotifyKind,
  CatchupStatus,
  EditionStatus,
  EditionTiming,
  PromptCategory,
} from "@/lib/catchups-types";

/* ------------------------------------------------------------------ *
 *  Why the runtime deps (prisma, the notify builders) load via dynamic
 *  import instead of a static `import`:
 *
 *  The pure state machine below (computeStatus, planNextAction, the
 *  patch helpers, cadence math, resolveSpotify) is unit-tested with
 *  `node --test src/lib/catchups.test.mjs` and MUST run with no database.
 *  Node strips `import type` entirely, so the only remaining static import
 *  here is erased at load; a static `import { prisma }` would instead pull
 *  the generated Prisma client (and a live client instantiation) into the
 *  test's module graph and break it. Loading prisma / the notify module
 *  lazily inside the impure drivers keeps the pure top level dependency
 *  free while the real app (Next resolves the `@/` alias for dynamic
 *  imports too) is unaffected. Do NOT convert these back to static imports.
 * ------------------------------------------------------------------ */

type PrismaLike = (typeof import("@/lib/prisma"))["prisma"];
type NotifyModule = typeof import("@/lib/catchups-notify");

let prismaSingleton: PrismaLike | null = null;
let notifySingleton: NotifyModule | null = null;

async function getPrisma(): Promise<PrismaLike> {
  if (!prismaSingleton) prismaSingleton = (await import("@/lib/prisma")).prisma;
  return prismaSingleton;
}

async function getNotify(): Promise<NotifyModule> {
  if (!notifySingleton) notifySingleton = await import("@/lib/catchups-notify");
  return notifySingleton;
}

// ─── Timing constants (spec section 2.3) ─────────────────────────────────────

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

/** Question window: 3 days. Answer window: 7 days. Preparing hold: 24h. */
/**
 * A fresh Catch-up invite token: 32 hex characters from the platform CSPRNG.
 *
 * `randomUUID` rather than cuid: the ids in this app are cuids, and a token
 * that looked like an id would invite someone to try a Catch-up id in the join
 * URL. The dashes come out so it reads as one opaque string in a shared link.
 *
 * This is a BEARER token. Whoever holds the link can join, which is the point
 * of a share link; it must therefore never be derivable from anything already
 * public about the Catch-up (its id is in the URL of every one of its pages).
 */
export function newInviteToken(): string {
  return randomUUID().replace(/-/g, "");
}

export const QUESTION_WINDOW_DAYS = 3;
export const ANSWER_WINDOW_DAYS = 7;
export const PREPARING_HOLD_HOURS = 24;
/** Too-few-answers auto-extend, applied at most once. */
export const EXTEND_DAYS = 3;

/** remindersSent low bits (spec section 2.4). */
export const REMINDER_TWO_DAYS = 1; // legacy: superseded by the daily bucket below
export const REMINDER_LAST_DAY = 2; // legacy: superseded by the daily bucket below
export const REMINDER_EXTENDED = 4;
/**
 * Questions auto-extend, applied at most once. Bit 3, still inside the low byte
 * the daily bucket leaves alone (see DAILY_BUCKET_SHIFT below), so it costs no
 * migration -- the same trick REMINDER_EXTENDED already uses on the same column.
 */
export const REMINDER_QUESTIONS_EXTENDED = 8;

/* ------------------------------------------------------------------ *
 *  The daily reminder bucket.
 *
 *  Reminders used to be two fixed nudges (two-days-left, last-day), each
 *  guarded by its own bit. The owner asked for one EVERY day the answer
 *  window is open instead (2026-08-05), which a two-bit mask cannot
 *  express: a 7-day window has seven of them, and an extension can add
 *  more.
 *
 *  So `remindersSent` is now split. The low byte keeps the existing bits
 *  (only REMINDER_EXTENDED still means anything; 1 and 2 are inert history
 *  on rows written before this change). The high bits carry a small
 *  integer: the days-left value at which the last daily reminder went out,
 *  0 for "none yet".
 *
 *  Why days-left and not a date: it needs no timezone (spec fence: "no
 *  timezone machinery"), it is a pure function of two timestamps the row
 *  already has, and it is strictly decreasing inside a window, so "the
 *  bucket differs from today's days-left" is a complete and self-clearing
 *  guard. An extension pushes days-left back UP, which correctly reads as
 *  a new bucket and lets the next day's reminder fire.
 *
 *  This is deliberately still one Int column: no migration.
 * ------------------------------------------------------------------ */
const DAILY_BUCKET_SHIFT = 8;
const REMINDER_FLAG_MASK = (1 << DAILY_BUCKET_SHIFT) - 1;

/** The days-left value the last daily reminder was sent for, or 0 for none. */
export function dailyBucket(remindersSent: number): number {
  return remindersSent >> DAILY_BUCKET_SHIFT;
}

/** `remindersSent` with its daily bucket set to `daysLeft`, flags untouched. */
export function withDailyBucket(remindersSent: number, daysLeft: number): number {
  return (remindersSent & REMINDER_FLAG_MASK) | (Math.max(0, daysLeft) << DAILY_BUCKET_SHIFT);
}

/**
 * Whole days left before `closeAt`, floored at 1 while the window is still
 * open. 1 means "last day", which is what the copy says. Returns 0 once the
 * moment has passed, because then the answer is a transition, not a nudge.
 */
export function daysLeftUntil(closeAt: Date | string | null | undefined, now: Date): number {
  if (closeAt == null) return 0;
  const close = new Date(closeAt).getTime();
  if (Number.isNaN(close)) return 0;
  const diff = close - now.getTime();
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / DAY_MS));
}

/** Forward-only order of the Round state machine. */
export const STATUS_ORDER: EditionStatus[] = [
  "draft",
  "collecting",
  "answering",
  "preparing",
  "published",
];

export const CADENCE_LABELS: Record<Cadence, string> = {
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

// ─── The question library (spec section 4) ───────────────────────────────────

export type CatchupPromptSet = {
  id: PromptCategory;
  label: string;
  prompts: string[];
};

/**
 * REWRITTEN 2026-07-25 on the owner's direct instruction. The previous library
 * was five sets of six, and the owner's verdict was blunt: "this library sucks,
 * it is an awful library of questions", "none of these are cool", and on the
 * nostalgia set specifically, that it was not worth keeping. Two structural
 * notes from that review, because they explain the shape below:
 *
 * 1. A Catch-up question has to be answerable in a few lines. "Where has life
 *    taken you since the Valley?" was called out as "the question for the
 *    biography, not a short question" -- it asks for an essay, so nobody
 *    answers it. Every question here can be answered in a sentence or two.
 * 2. "Small things" was the one set the owner liked and asked to keep, so its
 *    register (concrete, recent, low-stakes, no sentiment required) is the
 *    model the other sets now follow.
 *
 * Deliberately short. Owner: "I think we don't need too many questions in the
 * library. Just a few." Adding filler back is a regression, not an improvement.
 */
export const CATCHUP_PROMPT_SETS: CatchupPromptSet[] = [
  {
    id: "right-now",
    label: "Right now",
    prompts: [
      "What does an ordinary day look like for you now?",
      "What are you working on these days, at work or otherwise?",
      "Something new you did recently that you did not think you would do.",
      "What is something that made you happy recently?",
      "What is a fun thing you did this summer?",
    ],
  },
  {
    id: "small-things",
    label: "Small things",
    prompts: [
      "What have you been reading, cooking, or growing lately?",
      "What is the best thing you have eaten in the last month?",
      "What is a small ritual that makes your days better?",
      "What is something small that made you laugh this week?",
    ],
  },
  {
    // Kept to exactly two, and only the concrete ones. The cut set asked people
    // what the Valley "taught" them or what they "miss"; these ask where you
    // went and who you talked to, which have actual answers.
    id: "the-valley",
    label: "Back then",
    prompts: [
      "Where on campus did you go when you needed to be on your own?",
      "Who did you sit up talking to long after lights out?",
    ],
  },
  {
    // Not a text question: everyone adds one picture and the Round prints them
    // as a wall. `promptKind()` switches the answering control on this id.
    id: "photo-wall",
    label: "A photo from everyone",
    prompts: [
      "Add a photo from where you are right now.",
      "Add a photo of something you made, cooked, or grew.",
      "Add a photo from somewhere you went recently.",
    ],
  },
  {
    // Also not a text question: everyone adds songs. This replaces the old
    // per-question "paste a Spotify link" field, which the owner never wanted
    // attached to every single question.
    id: "songs",
    label: "Songs from everyone",
    prompts: [
      "Add the songs you have had on repeat lately.",
      "Add a song you would put on for a long drive.",
    ],
  },
];

/**
 * The Round 1 auto-suggestion. Both come from "Right now": the owner picked
 * "What does an ordinary day look like for you now?" by name as the example a
 * new Catch-up should open with, and a first Round wants two questions of the
 * same easy register rather than one easy and one nostalgic.
 */
export function suggestSeedPrompts(): Array<{ category: PromptCategory; text: string }> {
  const rightNow = CATCHUP_PROMPT_SETS.find((s) => s.id === "right-now");
  if (!rightNow) return [];
  return rightNow.prompts.slice(0, 2).map((text) => ({ category: "right-now" as const, text }));
}

// ─── Calendar math ───────────────────────────────────────────────────────────

/** UTC-safe month addition (deterministic across machines; no timezone machinery, per spec). */
function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS);
}

/** nextOpensAt = publishedAt + cadenceGap: 14d biweekly, ~1 month monthly, ~3 months quarterly. */
export function addCadenceGap(from: Date, cadence: Cadence): Date {
  switch (cadence) {
    case "biweekly":
      return addDays(from, 14);
    case "quarterly":
      return addMonths(from, 3);
    case "monthly":
    default:
      return addMonths(from, 1);
  }
}

export function roundLabel(n: number): string {
  return `Round ${n}`;
}

/** Catchup.title, or the "{group} Catch-ups" fallback. */
export function catchupTitle(title: string | null | undefined, groupName: string): string {
  return title?.trim() || `${groupName} Catch-ups`;
}

/**
 * Effective Keeper = the creator, anyone given the Keeper hat, or a group admin
 * (spec section 7).
 *
 * The two accepted roles are NOT interchangeable, and the difference matters.
 * `"admin"` is the GROUP's admin role, and it is read outside this feature:
 * `deletePost` in `feed/actions.ts` lets a group admin delete anyone's post in
 * that group. So `setCatchupKeeper` writes `"keeper"` instead, which means
 * exactly "holds Keeper powers in this Catch-up" and nothing else. Handing
 * someone the Keeper hat must never quietly also hand them moderation over a
 * group's posts.
 *
 * `"admin"` stays accepted because it is what the spec's original rule says and
 * what existing rows (including every Catch-up creator's own membership row)
 * already carry. Read both; only ever write `"keeper"`.
 */
export function isEffectiveKeeper(opts: {
  viewerId: string | null | undefined;
  createdById: string | null | undefined;
  groupRole: string | null | undefined;
}): boolean {
  if (!opts.viewerId) return false;
  if (opts.createdById && opts.viewerId === opts.createdById) return true;
  return opts.groupRole === "keeper" || opts.groupRole === "admin";
}

// ─── Pure state machine ──────────────────────────────────────────────────────

function ms(t: Date | string | null | undefined): number | null {
  if (t == null) return null;
  const n = new Date(t).getTime();
  return Number.isNaN(n) ? null : n;
}

/**
 * The status a Round SHOULD be in given its timestamps and the clock. Pure and
 * forward-only: it never returns a status earlier than the stored one, and it
 * never writes. Draft and published are terminal to the clock (draft only opens
 * by an explicit Keeper action; published is forever).
 */
export function computeStatus(ed: EditionTiming, now: Date): EditionStatus {
  const t = now.getTime();
  const passed = (at: Date | string | null | undefined) => {
    const m = ms(at);
    return m != null && t >= m;
  };

  let s = ed.status;
  if (s === "draft" || s === "published") return s;

  if (s === "collecting") {
    if (!passed(ed.questionsCloseAt)) return "collecting";
    s = "answering";
  }
  if (s === "answering") {
    if (!passed(ed.answersCloseAt)) return "answering";
    s = "preparing";
  }
  if (s === "preparing") {
    if (!passed(ed.publishAt)) return "preparing";
    s = "published";
  }
  return s;
}

/** The single next forward step the clock justifies, or null when the Round is settled. */
export function nextEditionStatus(ed: EditionTiming, now: Date): EditionStatus | null {
  const target = computeStatus(ed, now);
  const ci = STATUS_ORDER.indexOf(ed.status);
  const ti = STATUS_ORDER.indexOf(target);
  if (ti <= ci) return null;
  return STATUS_ORDER[ci + 1];
}

/**
 * The daily reminder due right now (if any), while still answering. One per
 * day of the answer window, guarded by the days-left bucket so a hundred page
 * views in one day still produce exactly one.
 *
 * The bucket is seeded to the full window at the moment answering opens (see
 * `answeringPatch`), so the first daily nudge lands a day LATER rather than
 * piling straight on top of the "answers are open" notification.
 */
export function dueReminder(ed: EditionTiming, now: Date): { daysLeft: number } | null {
  if (ed.status !== "answering") return null;
  const daysLeft = daysLeftUntil(ed.answersCloseAt, now);
  if (daysLeft === 0) return null; // past the window: we transition instead of nudging
  if (dailyBucket(ed.remindersSent) === daysLeft) return null; // already sent today's
  return { daysLeft };
}

/** Too-few-answers: extend once when the answer window closes with zero entries. */
export function shouldExtendForTooFew(ed: EditionTiming, entryCount: number): boolean {
  return entryCount === 0 && (ed.remindersSent & REMINDER_EXTENDED) === 0;
}

/**
 * No-questions: extend the question window once when it closes with nothing in
 * it. The mirror of `shouldExtendForTooFew`, one phase earlier.
 *
 * After that extension a Round with still no questions goes DORMANT rather than
 * opening answering (see planNextAction). Opening it would invite the whole
 * group to answer nothing, then nudge every one of them daily for a week about
 * the questions that do not exist, then publish an empty keepsake and start the
 * cycle again next cadence -- forever, until a human ends the Catch-up (audit
 * B-062). Doing nothing is the honest state for a Round nobody asked anything
 * in, and it is self-healing: the first question submitted revives it
 * (`reviveDormantRound` in the actions).
 */
export function shouldExtendForNoQuestions(ed: EditionTiming, promptCount: number): boolean {
  return promptCount === 0 && (ed.remindersSent & REMINDER_QUESTIONS_EXTENDED) === 0;
}

// ─── Transition patches (pure; shared by advanceEdition AND the WP2 actions) ──

export type EditionPatch = {
  status?: EditionStatus;
  questionsCloseAt?: Date;
  answersCloseAt?: Date;
  publishAt?: Date;
  publishedAt?: Date;
  remindersSent?: number;
};

/**
 * collecting -> answering. Sets the 7-day answer window, and seeds the daily
 * reminder bucket to that window's days-left so the first daily nudge is a day
 * away rather than landing on the same page view as "answers are open".
 */
export function answeringPatch(ed: EditionTiming, now: Date): EditionPatch {
  const answersCloseAt = addDays(now, ANSWER_WINDOW_DAYS);
  return {
    status: "answering",
    answersCloseAt,
    remindersSent: withDailyBucket(ed.remindersSent, daysLeftUntil(answersCloseAt, now)),
  };
}

/**
 * A Keeper pushing a deadline out by hand (owner, 2026-08-05: "importantly
 * have the ability to extend deadline ... by 1 day 2 days or 4 days or a
 * week"). Extends from the deadline itself, not from now: "extend by 2 days"
 * means the date on the page moves two days, which is not the same thing once
 * a day of the window has already gone.
 *
 * `collecting` moves `questionsCloseAt`; `answering` moves `answersCloseAt`
 * and re-seeds the daily bucket, so buying the group more time does not
 * immediately spend it on a reminder saying so.
 */
export function extendPhasePatch(ed: EditionTiming, days: number, now: Date): EditionPatch | null {
  if (ed.status === "collecting") {
    const from = ms(ed.questionsCloseAt) ?? now.getTime();
    return { questionsCloseAt: addDays(new Date(from), days) };
  }
  if (ed.status === "answering") {
    const from = ms(ed.answersCloseAt) ?? now.getTime();
    const answersCloseAt = addDays(new Date(from), days);
    return {
      answersCloseAt,
      remindersSent: withDailyBucket(ed.remindersSent, daysLeftUntil(answersCloseAt, now)),
    };
  }
  return null; // preparing and published have no window left to extend
}

/** answering -> preparing. Sets the 24h ritual hold (publishAt = answersCloseAt + 24h). */
export function preparingPatch(ed: EditionTiming, now: Date): EditionPatch {
  const existing = ms(ed.publishAt);
  if (existing != null) return { status: "preparing" };
  const base = ms(ed.answersCloseAt) ?? now.getTime();
  return { status: "preparing", publishAt: new Date(base + PREPARING_HOLD_HOURS * HOUR_MS) };
}

/** preparing -> published. */
export function publishPatch(now: Date): EditionPatch {
  return { status: "published", publishedAt: now };
}

/**
 * One instant, moved forward by however long the freeze lasted: resume hands
 * the group back exactly the time the pause took.
 *
 * Every deadline still AHEAD of the moment the freeze began moves forward by
 * the paused duration; anything already behind it is history and stays put. So
 * a Catch-up paused with two days left to answer resumes with two days left,
 * whether the pause lasted an hour or a season. The daily reminder bucket needs
 * no touching: shifting the close date pushes days-left back up, which the
 * bucket already reads as a new day and lets the next nudge fire.
 *
 * `pausedAt` is null on rows paused before the freeze semantics existed. Those
 * ran their clocks out in real time, so there is no duration to credit and this
 * returns an empty patch.
 */
export function shiftPausedInstant(
  at: Date | string | null | undefined,
  pausedAt: Date | string | null | undefined,
  resumedAt: Date
): Date | null {
  const from = ms(pausedAt);
  const m = ms(at);
  if (from == null || m == null) return null;
  const by = resumedAt.getTime() - from;
  // Nothing to credit (no freeze stamp, a clock that went backwards), or a
  // moment already behind the freeze and therefore history: leave it alone.
  if (by <= 0 || m <= from) return null;
  return new Date(m + by);
}

/** `shiftPausedInstant` over a Round's three deadlines, as a patch. */
export function shiftEditionPatch(
  // Only the three deadlines, not a whole EditionTiming: the status and the
  // reminder bitmask play no part, and asking for less lets a caller hand over
  // a raw Prisma row without widening its status back to EditionStatus.
  ed: {
    questionsCloseAt: Date | string | null;
    answersCloseAt: Date | string | null;
    publishAt: Date | string | null;
  },
  pausedAt: Date | string | null | undefined,
  resumedAt: Date
): EditionPatch {
  const patch: EditionPatch = {};
  const q = shiftPausedInstant(ed.questionsCloseAt, pausedAt, resumedAt);
  if (q) patch.questionsCloseAt = q;
  const a = shiftPausedInstant(ed.answersCloseAt, pausedAt, resumedAt);
  if (a) patch.answersCloseAt = a;
  const p = shiftPausedInstant(ed.publishAt, pausedAt, resumedAt);
  if (p) patch.publishAt = p;
  return patch;
}

/** No-questions extension: push the question window 3 days and set bit 3. */
export function questionsExtendPatch(ed: EditionTiming, now: Date): EditionPatch {
  return {
    questionsCloseAt: addDays(now, EXTEND_DAYS),
    remindersSent: ed.remindersSent | REMINDER_QUESTIONS_EXTENDED,
  };
}

/** Too-few extension: push the answer window 3 days and set the extended bit. */
export function extendPatch(ed: EditionTiming, now: Date): EditionPatch {
  const answersCloseAt = addDays(now, EXTEND_DAYS);
  return {
    answersCloseAt,
    // Extended flag AND a fresh daily bucket: this transition already re-fires
    // `catchup_answers_open` to the non-answerers, so a same-instant "3 days
    // left" on top of it would be the same message twice.
    remindersSent: withDailyBucket(
      ed.remindersSent | REMINDER_EXTENDED,
      daysLeftUntil(answersCloseAt, now)
    ),
  };
}

// ─── The one-step plan (pure) ────────────────────────────────────────────────

export type EditionAction =
  | { kind: "none" }
  | {
      kind: "transition";
      from: EditionStatus;
      to: EditionStatus;
      patch: EditionPatch;
      notify: CatchupNotifyKind | null;
      setsNextOpensAt: boolean;
    }
  | { kind: "extend"; patch: EditionPatch; notify: "catchup_answers_open" }
  | { kind: "extend-questions"; patch: EditionPatch; notify: "catchup_questions_open" }
  | { kind: "reminder"; daysLeft: number; patch: EditionPatch };

/**
 * What the Round has in it right now. Two counts, because two decisions need
 * one each: `prompts` gates collecting -> answering (a Round with no questions
 * must not open for answers), `entries` gates answering -> preparing (the
 * too-few auto-extend). Named rather than positional so a call site cannot
 * quietly swap them.
 */
export type EditionCounts = { entries: number; prompts: number };

/**
 * What advanceEdition should do next, as a single step. Pure: given the same
 * edition + counts + now it always returns the same action, and once a step
 * has been applied (status advanced, or the guarding bit set) it returns { none }.
 * That total, deterministic shape is exactly what makes idempotency unit-testable
 * without a database.
 */
export function planNextAction(ed: EditionTiming, counts: EditionCounts, now: Date): EditionAction {
  const next = nextEditionStatus(ed, now);

  if (next) {
    if (ed.status === "collecting" && next === "answering" && counts.prompts === 0) {
      // Nothing was asked. Give the group one more window to ask something,
      // then stop: a Round with no questions has nothing to open for.
      if (shouldExtendForNoQuestions(ed, counts.prompts)) {
        return {
          kind: "extend-questions",
          patch: questionsExtendPatch(ed, now),
          notify: "catchup_questions_open",
        };
      }
      return { kind: "none" }; // dormant; revived by the first question
    }
    if (ed.status === "answering" && next === "preparing") {
      if (shouldExtendForTooFew(ed, counts.entries)) {
        return { kind: "extend", patch: extendPatch(ed, now), notify: "catchup_answers_open" };
      }
      return {
        kind: "transition",
        from: "answering",
        to: "preparing",
        patch: preparingPatch(ed, now),
        notify: null,
        setsNextOpensAt: false,
      };
    }
    if (next === "answering") {
      return {
        kind: "transition",
        from: ed.status,
        to: "answering",
        patch: answeringPatch(ed, now),
        notify: "catchup_answers_open",
        setsNextOpensAt: false,
      };
    }
    if (next === "published") {
      return {
        kind: "transition",
        from: "preparing",
        to: "published",
        patch: publishPatch(now),
        notify: "catchup_published",
        setsNextOpensAt: true,
      };
    }
    // Any other single step (e.g. a staged draft opening) carries no clock side effects.
    return {
      kind: "transition",
      from: ed.status,
      to: next,
      patch: { status: next },
      notify: null,
      setsNextOpensAt: false,
    };
  }

  const rem = dueReminder(ed, now);
  if (rem) {
    return {
      kind: "reminder",
      daysLeft: rem.daysLeft,
      patch: { remindersSent: withDailyBucket(ed.remindersSent, rem.daysLeft) },
    };
  }

  return { kind: "none" };
}

// ─── Friendly status copy (shared so every surface reads the same) ────────────

function daysUntilLabel(t: Date | string | null | undefined, now: Date): string | null {
  const m = ms(t);
  if (m == null) return null;
  const diff = m - now.getTime();
  if (diff <= 0) return "closing";
  const days = Math.ceil(diff / DAY_MS);
  if (days <= 1) return "last day";
  return `${days} days left`;
}

/** Countdown-only copy for the live part of a Round. */
export function editionCountdownLabel(
  ed: {
    status: EditionStatus;
    questionsCloseAt?: Date | string | null;
    answersCloseAt?: Date | string | null;
  },
  now: Date = new Date()
): string | null {
  if (ed.status === "collecting") return daysUntilLabel(ed.questionsCloseAt, now);
  if (ed.status === "answering") return daysUntilLabel(ed.answersCloseAt, now);
  return null;
}

export function describeEditionStatus(
  ed: {
    status: EditionStatus;
    number: number;
    questionsCloseAt?: Date | string | null;
    answersCloseAt?: Date | string | null;
  },
  now: Date = new Date()
): string {
  switch (ed.status) {
    case "draft":
      return "Draft";
    case "collecting": {
      const left = editionCountdownLabel(ed, now);
      return left ? `Questions open, ${left}` : "Questions open";
    }
    case "answering": {
      const left = editionCountdownLabel(ed, now);
      return left ? `Answering now, ${left}` : "Answering now";
    }
    case "preparing":
      return "Preparing the Round";
    case "published":
      return `${roundLabel(ed.number)} published`;
    default:
      return "";
  }
}

// ─── Spotify (keyless oembed; the SSRF boundary) ─────────────────────────────

export type SpotifyResult =
  | { ok: false; error: string }
  | { ok: true; songUrl: string; songTitle: string; songArt: string | null };

/** Optional intl prefix, then exactly track / album / playlist and a base62 id. */
const SPOTIFY_PATH_RE = /^(?:\/intl-[a-z]{2})?\/(track|album|playlist)\/([A-Za-z0-9]+)/;

/**
 * Resolve a user-supplied Spotify URL through the keyless oembed endpoint.
 * SSRF boundary: the host MUST be exactly open.spotify.com over https, and the
 * path MUST be a track / album / playlist. Anything else is rejected with a
 * friendly error. On a valid link we fetch with a 3s timeout and fail soft:
 * the answer is never blocked on Spotify.
 */
export async function resolveSpotify(
  rawUrl: string,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<SpotifyResult> {
  const input = (rawUrl ?? "").trim();
  if (!input) return { ok: false, error: "Paste a Spotify link to add a song." };

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return {
      ok: false,
      error: "That does not look like a link. Paste a Spotify track, album, or playlist.",
    };
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "open.spotify.com") {
    return { ok: false, error: "Only Spotify links work here. Paste one from open.spotify.com." };
  }

  const match = SPOTIFY_PATH_RE.exec(parsed.pathname);
  if (!match) {
    return { ok: false, error: "Paste a link to a Spotify track, album, or playlist." };
  }

  const kind = match[1];
  const id = match[2];
  const songUrl = `https://open.spotify.com/${kind}/${id}`;

  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { ok: true, songUrl, songTitle: songUrl, songArt: null };
  }

  const timeoutMs = opts.timeoutMs ?? 3000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(songUrl)}`,
      { signal: controller.signal }
    );
    if (!res.ok) return { ok: true, songUrl, songTitle: songUrl, songArt: null };
    const data = (await res.json()) as { title?: unknown; thumbnail_url?: unknown };
    const title =
      typeof data.title === "string" && data.title.trim() ? data.title.trim() : songUrl;
    const art =
      typeof data.thumbnail_url === "string" && data.thumbnail_url ? data.thumbnail_url : null;
    return { ok: true, songUrl, songTitle: title, songArt: art };
  } catch {
    // Timeout, network failure, or bad JSON: fail soft, still store the link.
    return { ok: true, songUrl, songTitle: songUrl, songArt: null };
  } finally {
    clearTimeout(timer);
  }
}

// ─── The missing-table guard (P2021) ─────────────────────────────────────────

/**
 * True when an error means "a Catchup* table does not exist yet" (pre-migration).
 * Shared surfaces (the app-shell piggyback, the group card) wrap their queries
 * with this so a missing table degrades to "no Catch-up data" instead of a 500.
 */
export function isMissingCatchupTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  if (code === "P2021") return true; // Prisma: the table does not exist
  if (code === "42P01") return true; // Postgres undefined_table (raw, via the pg adapter)
  const msg = typeof e.message === "string" ? e.message : "";
  // Defensive fallback, scoped to our tables so an unrelated error is never masked.
  if (/Catchup/.test(msg) && /does not exist/i.test(msg)) return true;
  return false;
}

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
  publishAt: true,
  publishedAt: true,
  remindersSent: true,
} as const;

function toTiming(row: {
  status: string;
  questionsCloseAt: Date | string | null;
  answersCloseAt: Date | string | null;
  publishAt: Date | string | null;
  publishedAt: Date | string | null;
  remindersSent: number;
}): EditionTiming {
  return {
    status: row.status as EditionStatus,
    questionsCloseAt: row.questionsCloseAt,
    answersCloseAt: row.answersCloseAt,
    publishAt: row.publishAt,
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
  const prisma = await getPrisma();
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
  const prisma = await getPrisma();
  const notify = await getNotify();

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

    // reminder
    const cas = await tx.catchupEdition.updateMany({
      where: { id: editionId, remindersSent: before.remindersSent },
      data: action.patch,
    });
    if (cas.count === 0) return false;
    await notify.notifyReminder(tx, { ...meta, editionId, daysLeft: action.daysLeft });
    return true;
  });
}

/**
 * Bring one Round to the status the clock justifies, firing each crossed
 * transition's one-time side effects. Loops so a very stale Round settles fully
 * in a single visit; bounded so a logic bug can never spin. Never throws: a
 * missing table (pre-migration) or any error is swallowed, because the app-shell
 * piggyback that calls this runs on every authenticated page.
 */
export async function advanceEdition(
  edition: AdvanceEditionInput,
  now: Date = new Date()
): Promise<void> {
  try {
    const meta = await loadMeta(edition);
    if (!meta) return;
    const prisma = await getPrisma();

    // A paused or ended Catch-up's clock stops with it. This is the ONE gate:
    // every caller (the app-shell sweep, the cron tick, each page's own
    // freshen) comes through here, so freezing here freezes everywhere. Without
    // it the Round kept advancing, kept sending a daily reminder to answer, and
    // published itself, all while the home page showed "This Catch-up is
    // paused" and no way to answer (audit B-061).
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
        nextEditionStatus(ed, now) === "preparing"
      ) {
        entryCount = await prisma.catchupEntry.count({ where: { editionId: edition.id } });
      }
      if (
        promptCount === null &&
        ed.status === "collecting" &&
        nextEditionStatus(ed, now) === "answering"
      ) {
        // `accepted` is what actually renders in a Round, and it is what
        // submitPrompt counts for the per-Round ceiling. Count the same rows,
        // so "this Round has no questions" means the same thing everywhere.
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
    console.error("[catchups] advanceEdition failed", err);
  }
}

/**
 * Open the next Round for a recurring Catch-up once its nextOpensAt has passed.
 * Idempotent: the compare-and-swap on nextOpensAt (set back to null) means only
 * one visit opens it, and the unique [catchupId, number] index is the backstop.
 */
async function openNextRoundIfDue(
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
  // Only open a fresh Round when the previous one has actually published.
  if (!latest || latest.status !== "published") return;

  const prisma = await getPrisma();
  const notify = await getNotify();
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
        questionsCloseAt: addDays(now, QUESTION_WINDOW_DAYS),
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
 * Round in the viewer's groups (or across all groups when unscoped, so a future
 * CRON_SECRET /api/catchups/tick is a thin wrapper) and advances each, then opens
 * any next Rounds whose nextOpensAt has passed. Wrapped so it can NEVER throw:
 * it is piggy-backed on the app-shell notification-count query that runs on
 * essentially every authenticated page view, and a missing table (pre-migration)
 * or any error must degrade to a no-op, never a 500.
 */
export async function advanceDueCatchups(userId?: string): Promise<void> {
  const now = new Date();
  try {
    const prisma = await getPrisma();
    const scope = userId ? { group: { members: { some: { userId } } } } : {};

    const editions = await prisma.catchupEdition.findMany({
      where: {
        status: { in: ["collecting", "answering", "preparing"] },
        // Paused/ended Catch-ups are frozen. advanceEdition re-checks this and
        // is the actual guarantee (it is reachable from every page's own
        // freshen too); this clause just avoids loading rows we would skip.
        catchup: { status: "active", ...scope },
      },
      include: {
        catchup: { select: { id: true, cadence: true, status: true, group: { select: { id: true, name: true } } } },
      },
    });

    for (const ed of editions) {
      await advanceEdition(ed as AdvanceEditionInput, now);
    }

    const catchups = await prisma.catchup.findMany({
      where: { status: "active", nextOpensAt: { lte: now }, ...scope },
      include: {
        group: { select: { id: true, name: true } },
        editions: { orderBy: { number: "desc" }, take: 1, select: { number: true, status: true } },
      },
    });

    for (const c of catchups) {
      try {
        await openNextRoundIfDue(c, now);
      } catch (err) {
        if (!isMissingCatchupTable(err)) {
          console.error("[catchups] openNextRoundIfDue failed", err);
        }
      }
    }
  } catch (err) {
    if (isMissingCatchupTable(err)) return; // tables absent (pre-migration): no-op
    console.error("[catchups] advanceDueCatchups failed", err);
    // Swallow: this runs on every authenticated page and must never break one.
  }
}
