/* ------------------------------------------------------------------ *
 *  Catch-ups: the PURE half of the engine.
 *
 *  The 30-question library, the timing and cadence constants, the calendar
 *  math, the state machine (computeStatus + planNextAction and every patch
 *  helper), the copy helpers, the keyless Spotify resolver and the P2021
 *  guard. No database, no clock of its own, no Sentry: every boundary here is
 *  unit-testable with fake timestamps, which is what `node --test
 *  src/lib/catchups-core.test.mjs` does.
 *
 *  IT IS A SEPARATE FILE FOR TWO REASONS, and the first is the one that
 *  matters. `catchups-notify.ts` needs `answerReminderMessage` from here (the
 *  C-141/C-031 fix put the reminder sentence and the countdown it shares in one
 *  place), and the impure half needs `catchups-notify.ts` back -- a cycle, and
 *  the last one the app had. Pointing notify at the pure half breaks it.
 *
 *  The second: the impure half can now import prisma, notify and the error
 *  reporter STATICALLY. It used to reach them through lazy singletons and a
 *  dynamic `report()` purely so that this pure code could load under bare
 *  `node --test` with no Prisma client in its module graph. That workaround is
 *  gone; the file boundary does the job the dynamic imports were doing.
 *
 *  No em dashes. User-facing copy says "Rishi Valley", never "Alumni".
 * ------------------------------------------------------------------ */
import { randomUUID } from "node:crypto";
import { valleyDaysBetween } from "./utils.ts";
import { isMissingTable } from "./prisma-errors.ts";
import type {
  Cadence,
  CatchupStatus,
  CatchupNotifyKind,
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
 *  `node --test src/lib/catchups-core.test.mjs` and MUST run with no database.
 *  Node strips `import type` entirely, so the only remaining static import
 *  here is erased at load; a static `import { prisma }` would instead pull
 *  the generated Prisma client (and a live client instantiation) into the
 *  test's module graph and break it. Loading prisma / the notify module
 *  lazily inside the impure drivers keeps the pure top level dependency
 *  free while the real app (Next resolves the `@/` alias for dynamic
 *  imports too) is unaffected. Do NOT convert these back to static imports.

/**
 * Whether a question shows who asked it.
 *
 * The ONE place this is decided, because the two surfaces that render a
 * question disagreed (bug audit M10). The Catch-up home hid an anonymous
 * asker from everybody but the asker; the published Edition revealed them to any
 * Keeper, with nothing on screen to say the question had been asked
 * anonymously. So a member picked "Ask anonymously", saw their name withheld
 * on the console, and was named in the Edition the whole group then read.
 *
 * The spec grants no Keeper exception: "the author is always stored;
 * `showAsker=false` only hides the asker in the UI" (catchups.md:257), and
 * anonymity is listed as a property of question submission with no carve-out
 * (catchups.md:825). A Keeper curating the queue already works without seeing
 * askers, because the home page has always hidden them there too.
 *
 * The author themselves always sees their own name, which is not a leak: they
 * are the only person who already knows.
 */
export function askerVisible(
  prompt: { showAsker: boolean; authorId: string | null },
  viewerId: string | null
): boolean {
  if (prompt.showAsker) return true;
  return !!viewerId && prompt.authorId === viewerId;
}

// ─── Timing constants (spec section 2.3) ─────────────────────────────────────

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

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

/** Question window: 3 days. Answer window: 7 days. Both snap to DEADLINE_HOUR. */
export const QUESTION_WINDOW_DAYS = 3;
const ANSWER_WINDOW_DAYS = 7;
/** Too-few-answers auto-extend, applied at most once. */
const EXTEND_DAYS = 3;

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

/**
 * Forward-only order of the Edition state machine.
 *
 * `preparing` sat between answering and published until 2026-09-08 and is
 * deleted, not renamed. His, N88: "Why are we preparing? ... why doesn't it
 * just publish immediately? Is there a reason we have to have a separate
 * preparing section? I can't just publish at midnight and the deadline is
 * done." It was a 24-hour hold during which nobody -- Keeper included --
 * could read a word, and its only real job was stopping an Edition landing
 * at 3am. `DEADLINE_HOUR_UTC_MS` below does that job instead, and does it
 * without hiding a finished Edition from the people who wrote it.
 */
const STATUS_ORDER: EditionStatus[] = ["draft", "collecting", "answering", "published"];

/**
 * A time capsule's path (build phase 14, spec 3.12): the same, with `sealed`
 * between answering and published. His: "release the addition only one year
 * later". It is the ordinary close, landing on a status nothing reads, and the
 * same publish a year afterwards -- so the clock gains a step rather than a
 * second mechanism.
 *
 * A row already `sealed` walks this path even if its flag somehow read false,
 * because the only way forward from sealed is opening on its date.
 */
const CAPSULE_ORDER: EditionStatus[] = ["draft", "collecting", "answering", "sealed", "published"];

function orderFor(ed: { status: EditionStatus; timeCapsule?: boolean }): EditionStatus[] {
  return ed.timeCapsule || ed.status === "sealed" ? CAPSULE_ORDER : STATUS_ORDER;
}

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
    // Not a text question: everyone adds one picture and the Edition prints them
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

// ─── Calendar math ───────────────────────────────────────────────────────────

/**
 * UTC-safe month addition (deterministic across machines; no timezone
 * machinery, per spec), with the day of the month CLAMPED to the target month.
 *
 * `setUTCMonth` alone overflows: an Edition published on 31 January and set to a
 * monthly rhythm asked for 31 February and got 3 March, skipping February
 * altogether; 31 October + 1 month landed on 1 December, skipping November
 * (audit C-144). About one publish in ten falls on a 29th-31st, and the
 * symptom is a rhythm that slides a few days and occasionally loses a month,
 * with nothing anywhere reporting it. The last day of a short month is the
 * honest answer to "a month after the 31st".
 */
function addMonths(date: Date, n: number): Date {
  const day = date.getUTCDate();
  const d = new Date(date.getTime());
  // From the 1st, so the month step itself can never overflow; then take
  // whichever comes first, the original day or the end of the target month.
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const daysInTarget = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTarget));
  return d;
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS);
}

/* ------------------------------------------------------------------ *
 *  Every deadline lands on a civil hour: 07:00 IST.
 *
 *  A deadline used to be `addDays(now, N)`, so it inherited whatever minute
 *  the phase happened to open at -- 03:47 on a Tuesday if that is when the
 *  tick ran -- and an Edition came out at that minute forever after. The
 *  24-hour `preparing` hold existed largely to stop an Edition landing at
 *  3am; deleting it (spec section 3.3) means the deadline itself has to be a
 *  decent hour.
 *
 *  WHY 07:00, and the number is from the app rather than from taste:
 *  `vercel.json` runs /api/catchups/tick at **02:00 UTC, which is 07:30
 *  IST**. A deadline at 07:00 IST is therefore picked up by that morning's
 *  cron **within thirty minutes**, every time, rather than waiting on the
 *  lazy read-time advance and whoever happens to open a page. So an Edition
 *  lands with the morning, and the hold bought nothing.
 *
 *  01:30 UTC is 07:00 IST on every day of the year. Hard-coding the offset
 *  is safe here for the reason `valleyMidnight` in utils.ts already gives:
 *  India has kept one fixed offset with no daylight saving since 1945. That
 *  keeps this pure UTC arithmetic, with no timezone machinery, like every
 *  other calendar helper in this file.
 *
 *  It rounds FORWARD, never back, so a snapped window is always at least the
 *  nominal length -- seven days becomes seven-and-a-bit, never six-and-a-bit.
 *  Nobody loses time they were promised, and the most anyone gains is a day.
 * ------------------------------------------------------------------ */
const DEADLINE_HOUR_UTC_MS = 90 * 60 * 1000; // 01:30 UTC = 07:00 IST

/**
 * The next 07:00 IST at or after `at`. Idempotent: an instant already on the
 * hour is returned unchanged, so re-snapping a stored deadline (an extension
 * anchored on it, a resume shifting it) cannot walk it forward a day at a
 * time.
 */
export function snapToDeadlineHour(at: Date): Date {
  const days = Math.ceil((at.getTime() - DEADLINE_HOUR_UTC_MS) / DAY_MS);
  return new Date(days * DAY_MS + DEADLINE_HOUR_UTC_MS);
}

/** `addDays`, landed on the civil hour. Every phase deadline is minted here. */
export function deadlineIn(from: Date, days: number): Date {
  return snapToDeadlineHour(addDays(from, days));
}

/** India's one fixed offset, the same fact DEADLINE_HOUR_UTC_MS leans on. */
const IST_OFFSET_MS = 330 * 60 * 1000;

/**
 * The morning a time capsule opens: the same date next year, at 07:00 IST
 * (build phase 14, spec 3.12).
 *
 * THE SAME CALENDAR DATE, AS THE VALLEY COUNTS IT. The date is read in IST
 * rather than UTC, because an Edition closed at 01:00 IST on 15 September is
 * the 14th in UTC, and "sealed 15 September, opens 14 September" is the one
 * mistake a member would notice. Then the civil hour every deadline lands on,
 * so it opens with the morning cron rather than whenever somebody visits.
 *
 * NOT `snapToDeadlineHour(addMonths(sealedAt, 12))`: snapping rounds FORWARD,
 * so a capsule sealed by the 07:30 cron would open on the 15th, a day late,
 * every year. This lands on the date itself: sealed at 05:30 IST it opens an
 * hour and a half over a year, sealed at 23:59 IST seventeen hours short, and
 * never a whole day either way.
 *
 * 29 February has no anniversary three years in four, so it opens on 28
 * February: the last day of the month it was sealed in, the rule
 * `addMonths` already applies to a monthly rhythm anchored on the 31st.
 */
export function capsuleOpensAt(sealedAt: Date): Date {
  const valley = new Date(sealedAt.getTime() + IST_OFFSET_MS);
  const year = valley.getUTCFullYear() + 1;
  const month = valley.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(valley.getUTCDate(), daysInMonth);
  return new Date(Date.UTC(year, month, day) + DEADLINE_HOUR_UTC_MS);
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

/**
 * The two ways a Catch-up names itself. A Keeper's own title always wins; the
 * difference is only in what stands in when there is not one.
 *
 * These were three copies in three page files, and the Edition reader's TODO had
 * been asking for this since it wrote the third: "it wants to be one exported
 * helper in src/lib/catchups.ts". They replace `catchupTitle`, a fourth
 * spelling with a third fallback ("{group} Catch-ups", plural) whose docblock
 * claimed the index and archive used it -- they print the group name bare, and
 * knip had it down as unused.
 */

/** The heading on the Catch-up's own home: no "catch-up" appended, because the
 *  page around it has already said so. */
export function catchupDisplayName(title: string | null | undefined, groupName: string): string {
  return title?.trim() || groupName;
}

/** How every OTHER surface names it -- a back link, a reader's masthead, a page
 *  title -- where the word has to be there for the name to mean anything.
 *  Singular: it is one Catch-up (owner review 2026-07-25). */
export function catchupSurfaceTitle(title: string | null | undefined, groupName: string): string {
  return title?.trim() || `${groupName} catch-up`;
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

/* ------------------------------------------------------------------ *
 *  The batch Catch-up (spec 3.5, architecture 6).
 * ------------------------------------------------------------------ */

/**
 * How many people a batch needs before it gets a Catch-up of its own, and
 * before "Catch-ups" appears on their sidebar at all.
 *
 * His, 2026-09-08: "for people whose batches have less than ten people, let's
 * not even show the catch ups things in the sidebar. it won't be reachble to
 * them. once there's ten it appears and the catch up would be created for
 * that batch."
 *
 * Why the number bites so hard here, so nobody re-derives it: measured on
 * 2026-09-08, nine of the eleven batch groups hold four members or fewer and
 * six hold exactly one. Under any smaller floor most batch Catch-ups would be
 * a newsletter to yourself, with reminders. Two batches clear ten today,
 * 2023 (39) and 2024 (11).
 */
export const BATCH_CATCHUP_FLOOR = 10;

/**
 * How many questions a batch's first Edition waits for before its question
 * window starts. The owner, 2026-09-22: "don't let it send notifications. just
 * have questions indefinitely open. when 3 questions have been asked, then
 * start the 3 day window." A batch reaching ten is an accident of signups, not
 * a decision to start anything, so the first Edition opens with no deadline
 * (`questionsCloseAt` null, which `computeStatus` already reads as "still
 * collecting") and tells nobody. The third question is the batch deciding.
 */
export const BATCH_QUESTIONS_TO_START = 3;

/**
 * How often a batch Catch-up runs: every three months. Owner, 2026-09-27, on
 * learning they were monthly: "if it's monthly now, make it quarterly". A
 * batch has no Keeper, so nobody can change it in the app; this is the whole
 * setting. It used to be the column default ("monthly") by omission, which is
 * why it is named here rather than left to the schema.
 */
export const BATCH_CADENCE: Cadence = "quarterly";

/**
 * Is this a batch Catch-up?
 *
 * `Group.batchYear` is the whole test (F6): a batch is a Group with the year
 * set, a Catch-up is one row per Group, and nothing else in the app writes
 * that column. One function rather than eleven inline `batchYear != null`
 * checks, because the reason it means "batch" is not obvious from the
 * expression.
 */
export function isBatchCatchup(batchYear: number | null | undefined): boolean {
  return batchYear != null;
}

/**
 * What a batch Catch-up refuses, in one sentence, for every control that
 * still refuses it.
 *
 * REVERSED FROM ITS ORIGINAL SHAPE. It used to cover every manual control --
 * his own correction, N30, after asking "Can anyone open answering? That
 * shouldn't be allowed. Because many people would click it by accident.
 * Especially on a batch thing." His later word, 2026-09-27, overturns that
 * worry rather than the reasoning behind it: "make everyone a keeper ... and
 * have all of them paused by default." Everyone in the batch now runs the
 * cycle together -- choosing questions, opening answering, extending,
 * nudging, closing and publishing, starting the next Edition, pausing and
 * resuming -- and the accident risk N30 named is answered by starting paused
 * (`ensureBatchCatchup`) rather than by locking the controls to nobody.
 *
 * What is LEFT refusing this sentence is membership and identity: the batch
 * IS the roster, so there is still nobody to add, remove, or hand a Keeper's
 * hat to, and the name, the rhythm and ending it stay fixed the same way.
 * `loadKeeperScope` and `loadKeeperEdition` each take an `allowBatch` opt-in
 * per caller now; the cycle controls pass it, these six do not.
 *
 * Still ONE sentence rather than one per control, because the reason is the
 * same every time and has nothing to do with who is asking.
 */
export const BATCH_CATCHUP_REFUSAL =
  "A batch Catch-up's roster is the batch itself, so there is nobody to add, remove, or hand the Keeper's hat to. The name, the rhythm and ending it stay fixed the same way.";

/**
 * And the exit, which refuses for a different reason and so says a different
 * thing. His, in the paragraph the whole feature comes from (brief 51): "the
 * batch catch up can't edit people in and out it's just people in that batch
 * and they're all automatically added and have access to previous issues if
 * they join later." Leaving your own batch is not a thing you can do, so the
 * sentence points at the control that does work.
 */
export const BATCH_LEAVE_REFUSAL =
  "This is your batch's Catch-up, so there is nobody to leave it to. You can archive it instead.";

/**
 * Who may replace a Catch-up's photograph.
 *
 * Whoever may run it -- and on a BATCH Catch-up, anyone in the batch. His
 * answer to owner question 18, 2026-09-07: "anyone can replace the batch
 * picture."
 *
 * That is not the rule the rest of this feature follows, and the difference is
 * the accident rule (architecture 6). Every other Catch-up-level control is
 * one-way or close to it: end it, remove a member, open answering. A picture is
 * none of those. It is reversible by the next person who dislikes it, it
 * destroys nothing, and a batch Catch-up has no Keeper to ask -- nobody keeps
 * one (`createdById` is null), so a rule of "only the Keeper" would mean nobody
 * at all, for ever, on the Catch-ups most members are actually in.
 *
 * `isBatchCatchup` is the whole test, and since build phase 4 (2026-09-08)
 * this was the one control on a batch Catch-up that anybody held while every
 * other Catch-up-level control refused one outright. His 2026-09-27 word
 * opened most of the rest to the batch too (`BATCH_CATCHUP_REFUSAL` now
 * covers only membership and identity); this rule does not change, because
 * it was never keyed to "nobody keeps a batch" in the first place -- a
 * picture is reversible and destroys nothing regardless of who may run it.
 *
 * Membership is NOT checked here -- every caller has already established it,
 * because you cannot act on a Catch-up you are not in. This answers the
 * narrower question of which member.
 */
export function mayChangeCatchupPicture(opts: {
  viewerId: string | null | undefined;
  createdById: string | null | undefined;
  groupRole: string | null | undefined;
  /** The Group's `batchYear`; null on a people Catch-up. */
  batchYear: number | null | undefined;
}): boolean {
  if (!opts.viewerId) return false;
  if (isBatchCatchup(opts.batchYear)) return true;
  return isEffectiveKeeper(opts);
}

/**
 * Who may make an Edition a time capsule, or take it back (build phase 14).
 *
 * Whoever runs the Edition. On a people Catch-up that is its Keepers. On a
 * BATCH Catch-up it is anyone in the batch -- his answer 35, "yes an edition
 * can" -- because nobody keeps a batch, so "only the Keeper" would mean a
 * batch could never have one.
 *
 * WHY THIS IS NOT GATED THE SAME WAY THE TRANSITIONS ARE, which now let a
 * batch member through too (`allowBatch` on `loadKeeperScope` /
 * `loadKeeperEdition`). That gate is for ONE-WAY moves: his N30 was about
 * somebody in forty opening or closing answering by accident, a
 * thing nobody can undo. Marking a capsule moves nothing. It is allowed only
 * while the Edition is still taking questions, it is undone by pressing it
 * again, and until answering opens nobody has written a word it could seal.
 * That is the picture's footing (`mayChangeCatchupPicture`, his 18), not the
 * transitions', and the rule is the same shape for the same reason.
 *
 * Membership is established by the caller, as there.
 */
export function mayMarkTimeCapsule(opts: {
  viewerId: string | null | undefined;
  createdById: string | null | undefined;
  groupRole: string | null | undefined;
  batchYear: number | null | undefined;
}): boolean {
  return mayChangeCatchupPicture(opts);
}

/**
 * WHEN an Edition may be marked a time capsule: only while it is collecting
 * questions.
 *
 * So everyone writing it knows it is sealed before they write -- his 34b means
 * they will not see their own answer again for a year, and that is not a thing
 * to learn afterwards. Once answering opens the mark is frozen, both ways:
 * taking it off mid-week would publish words people wrote for a year from now.
 */
export function decideTimeCapsuleMark(
  editionStatus: string
): { ok: true } | { ok: false; error: string } {
  if (editionStatus === "collecting") return { ok: true };
  return {
    ok: false,
    error:
      editionStatus === "draft"
        ? "This Edition has not opened yet."
        : "An Edition can only become a time capsule while it is taking questions.",
  };
}

// ─── Pure state machine ──────────────────────────────────────────────────────

function ms(t: Date | string | null | undefined): number | null {
  if (t == null) return null;
  const n = new Date(t).getTime();
  return Number.isNaN(n) ? null : n;
}

/**
 * How far before a deadline the clock is allowed to count it as passed.
 *
 * Every phase deadline is minted as `now + N days` where `now` is the instant
 * the DAY-0 tick happened to run, and the day-N tick runs at its own,
 * independent offset. If day N fires even a second earlier than day 0 did, the
 * `t >= m` comparison misses and the whole phase waits another twenty-four
 * hours for the next tick -- roughly half the time, for any non-zero jitter at
 * all, and the magnitude does not matter (audit C-142). A dormant group whose
 * members never open a page has no lazy advance to heal it, so its cadence
 * simply drifts later.
 *
 * Five minutes: comfortably more than a scheduler's run-to-run wobble, which
 * is what the whole failure is made of, and small enough to stay well inside
 * the shortest window here (three days). An Edition can be at most five
 * minutes "early", which no surface counting in days or hours can show, and
 * can no longer be a day late.
 *
 * Applied inside `computeStatus` rather than to the stored deadlines, so the
 * advance and the render remain the same function: a page loaded in those last
 * five minutes and the tick that follows it agree about what the Edition is.
 */
export const TICK_GRACE_MS = 5 * 60 * 1000;

/**
 * The status an Edition SHOULD be in given its timestamps and the clock. Pure and
 * forward-only: it never returns a status earlier than the stored one, and it
 * never writes. Draft and published are terminal to the clock (draft only opens
 * by an explicit Keeper action; published is forever).
 */
export function computeStatus(ed: EditionTiming, now: Date): EditionStatus {
  const t = now.getTime();
  const passed = (at: Date | string | null | undefined) => {
    const m = ms(at);
    return m != null && t >= m - TICK_GRACE_MS;
  };

  let s = ed.status;
  if (s === "draft" || s === "published") return s;

  if (s === "collecting") {
    if (!passed(ed.questionsCloseAt)) return "collecting";
    s = "answering";
  }
  if (s === "answering") {
    // Answers close and the Edition comes out at the same moment. There is no
    // hold in between any more (see STATUS_ORDER), and no second timestamp to
    // wait on: `answersCloseAt` is itself a civil hour, so this lands the
    // Edition with the morning rather than at whatever minute the phase
    // happened to open at.
    if (!passed(ed.answersCloseAt)) return "answering";
    s = ed.timeCapsule ? "sealed" : "published";
  }
  if (s === "sealed") {
    /* A time capsule opens on `publishAt`, which the seal itself writes. A
       sealed row with no date stays sealed: failing closed is the whole of
       his 34b, and the CHECK in 2026-09-14-time-capsule.sql makes that row
       impossible anyway. */
    if (!passed(ed.publishAt)) return "sealed";
    s = "published";
  }
  return s;
}

/** The single next forward step the clock justifies, or null when the Edition is settled. */
export function nextEditionStatus(ed: EditionTiming, now: Date): EditionStatus | null {
  const target = computeStatus(ed, now);
  const order = orderFor(ed);
  const ci = order.indexOf(ed.status);
  const ti = order.indexOf(target);
  if (ti <= ci) return null;
  return order[ci + 1];
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
function dueReminder(ed: EditionTiming, now: Date): { daysLeft: number } | null {
  if (ed.status !== "answering") return null;
  const daysLeft = daysLeftUntil(ed.answersCloseAt, now);
  if (daysLeft === 0) return null; // past the window: we transition instead of nudging
  if (dailyBucket(ed.remindersSent) === daysLeft) return null; // already sent today's
  return { daysLeft };
}

/**
 * The admin's "past its date" list: an Edition that should have moved on and
 * did not. A Prisma `where`, kept here rather than in lib/admin.ts so the rule
 * can be tested without a database.
 *
 * TWO STATES LOOK OVERDUE AND ARE NOT, and both put a false alarm on the
 * owner's worklist that no action of his could clear (2026-09-15: "it's
 * paused. let it be paused wtf should I do").
 *
 *   PAUSED OR ENDED. `advanceEdition` freezes the clock of a Catch-up that is
 *   not active, so its deadline stays in the past for as long as it is held.
 *   That is the pause working, not a stuck Edition.
 *
 *   DORMANT. A question window that closed empty, twice, parks the Edition
 *   until somebody asks something (`planNextAction`). Zero questions past the
 *   date is that state or the one extension about to be granted; either way
 *   there is nothing for an admin to do.
 *
 * A sealed time capsule stays on the list whatever the Catch-up is doing,
 * because it opens on its date regardless (build phase 14).
 */
export function overdueEditionWhere(now: Date) {
  return {
    OR: [
      {
        status: "collecting",
        questionsCloseAt: { lt: now },
        catchup: { status: "active" },
        prompts: { some: {} },
      },
      { status: "answering", answersCloseAt: { lt: now }, catchup: { status: "active" } },
      // A time capsule past its opening day that has not opened is the one
      // failure nobody else would notice for a year (build phase 14).
      { status: "sealed", publishAt: { lt: now } },
    ],
  };
}

/** Too-few-answers: extend once when the answer window closes with zero entries. */
export function shouldExtendForTooFew(ed: EditionTiming, entryCount: number): boolean {
  return entryCount === 0 && (ed.remindersSent & REMINDER_EXTENDED) === 0;
}

/**
 * No-questions: extend the question window once when it closes with nothing in
 * it. The mirror of `shouldExtendForTooFew`, one phase earlier.
 *
 * After that extension an Edition with still no questions goes DORMANT rather than
 * opening answering (see planNextAction). Opening it would invite the whole
 * group to answer nothing, then nudge every one of them daily for a week about
 * the questions that do not exist, then publish an empty keepsake and start the
 * cycle again next cadence -- forever, until a human ends the Catch-up (audit
 * B-062). Doing nothing is the honest state for an Edition nobody asked anything
 * in, and it is self-healing: the first question submitted revives it
 * (`reviveDormantEdition` in the actions).
 */
function shouldExtendForNoQuestions(ed: EditionTiming, promptCount: number): boolean {
  return promptCount === 0 && (ed.remindersSent & REMINDER_QUESTIONS_EXTENDED) === 0;
}

// ─── Transition patches (pure; shared by advanceEdition AND the WP2 actions) ──

export type EditionPatch = {
  status?: EditionStatus;
  questionsCloseAt?: Date;
  answersCloseAt?: Date;
  publishedAt?: Date;
  remindersSent?: number;
  /** Written together, once, by `sealPatch`. */
  sealedAt?: Date;
  publishAt?: Date;
};

/**
 * collecting -> answering. Sets the 7-day answer window, and seeds the daily
 * reminder bucket to that window's days-left so the first daily nudge is a day
 * away rather than landing on the same page view as "answers are open".
 */
export function answeringPatch(ed: EditionTiming, now: Date): EditionPatch {
  const answersCloseAt = deadlineIn(now, ANSWER_WINDOW_DAYS);
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
 *
 * From the deadline OR from now, whichever is later (audit C-028). An Edition
 * that went dormant -- its question window closed empty, its one automatic
 * extension already spent -- keeps a `questionsCloseAt` weeks in the past, and
 * extending from that put the new deadline in the past too: the write applied,
 * the Keeper was told it had worked, and nothing whatsoever changed. Extending
 * a live window still means "the date on the page moves N days", which is the
 * thing this is careful about.
 */
export function extendPhasePatch(ed: EditionTiming, days: number, now: Date): EditionPatch | null {
  const anchor = (t: Date | string | null | undefined): Date =>
    new Date(Math.max(ms(t) ?? now.getTime(), now.getTime()));
  if (ed.status === "collecting") {
    return { questionsCloseAt: deadlineIn(anchor(ed.questionsCloseAt), days) };
  }
  if (ed.status === "answering") {
    const answersCloseAt = deadlineIn(anchor(ed.answersCloseAt), days);
    return {
      answersCloseAt,
      remindersSent: withDailyBucket(ed.remindersSent, daysLeftUntil(answersCloseAt, now)),
    };
  }
  return null; // published has no window left to extend
}

/**
 * answering -> published. The only way an Edition comes out, by the clock or
 * by the Keeper's hand: `preparingPatch` and the 24-hour hold it set are
 * deleted (see STATUS_ORDER).
 *
 * `publishedAt` is the real instant, not the snapped deadline, because it is
 * the Edition's NAME on every surface -- the date a member reads. An Edition
 * that publishes at 07:00 IST and one a Keeper closes early at 16:12 should
 * both say the day they actually came out.
 */
export function publishPatch(now: Date): EditionPatch {
  return { status: "published", publishedAt: now };
}

/**
 * answering -> sealed, for a time capsule (build phase 14). The ordinary close
 * with the opening a year out, by the clock or by a Keeper closing early.
 *
 * `publishedAt` stays null until it opens, because it is the Edition's NAME
 * (see publishPatch) and an Edition nobody can read has not come out.
 * `sealedAt` is when answering actually closed, which is what the rhythm and
 * the opening date are both measured from.
 */
export function sealPatch(now: Date): EditionPatch {
  return { status: "sealed", sealedAt: now, publishAt: capsuleOpensAt(now) };
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

/** `shiftPausedInstant` over an Edition's two deadlines, as a patch. */
export function shiftEditionPatch(
  // Only the three deadlines, not a whole EditionTiming: the status and the
  // reminder bitmask play no part, and asking for less lets a caller hand over
  // a raw Prisma row without widening its status back to EditionStatus.
  ed: {
    questionsCloseAt: Date | string | null;
    answersCloseAt: Date | string | null;
  },
  pausedAt: Date | string | null | undefined,
  resumedAt: Date
): EditionPatch {
  const patch: EditionPatch = {};
  /* NOT snapped to the civil hour, deliberately, and this is the one place a
     deadline is not. A resume credits back exactly the time the freeze took --
     "paused with two days left, resumed with two days left" -- and rounding
     forward to the next 07:00 hands the group up to a day it was not owed,
     which breaks the one guarantee this function makes. The spec names the
     three places that snap (answeringPatch, extendPhasePatch, the create
     path); resume is not one of them. The cost is small and bounded: a
     resumed deadline sits at an odd minute, and the Edition it belongs to
     still lands on the next tick or the next page view, because a deadline
     is a threshold rather than a scheduled moment. */
  const q = shiftPausedInstant(ed.questionsCloseAt, pausedAt, resumedAt);
  if (q) patch.questionsCloseAt = q;
  const a = shiftPausedInstant(ed.answersCloseAt, pausedAt, resumedAt);
  if (a) patch.answersCloseAt = a;
  return patch;
}

/** No-questions extension: push the question window 3 days and set bit 3. */
function questionsExtendPatch(ed: EditionTiming, now: Date): EditionPatch {
  return {
    questionsCloseAt: deadlineIn(now, EXTEND_DAYS),
    remindersSent: ed.remindersSent | REMINDER_QUESTIONS_EXTENDED,
  };
}

/** Too-few extension: push the answer window 3 days and set the extended bit. */
export function extendPatch(ed: EditionTiming, now: Date): EditionPatch {
  const answersCloseAt = deadlineIn(now, EXTEND_DAYS);
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
      /**
       * What the row's flag must say for the write to land, or null. The
       * compare-and-swap carries it, so a caller holding a stale or missing
       * `timeCapsule` can never publish a capsule: the update matches nothing,
       * the loop re-reads the row, and plans again from the truth.
       */
      requires: { timeCapsule: boolean } | null;
    }
  | { kind: "extend"; patch: EditionPatch; notify: "catchup_answers_open" }
  | { kind: "extend-questions"; patch: EditionPatch; notify: "catchup_questions_open" }
  | { kind: "reminder"; daysLeft: number; patch: EditionPatch };

/**
 * What the Edition has in it right now. Two counts, because two decisions need
 * one each: `prompts` gates collecting -> answering (an Edition with no questions
 * must not open for answers), `entries` gates answering -> published (the
 * too-few auto-extend). Named rather than positional so a call site cannot
 * quietly swap them.
 */
type EditionCounts = { entries: number; prompts: number };

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
      // then stop: an Edition with no questions has nothing to open for.
      if (shouldExtendForNoQuestions(ed, counts.prompts)) {
        return {
          kind: "extend-questions",
          patch: questionsExtendPatch(ed, now),
          notify: "catchup_questions_open",
        };
      }
      return { kind: "none" }; // dormant; revived by the first question
    }
    if (ed.status === "answering" && (next === "published" || next === "sealed")) {
      if (shouldExtendForTooFew(ed, counts.entries)) {
        return { kind: "extend", patch: extendPatch(ed, now), notify: "catchup_answers_open" };
      }
      if (next === "sealed") {
        /* A time capsule closes the same way and lands sealed. The rhythm
           carries on from here (the capsule is one Edition, his 33), so
           `nextOpensAt` is stamped now, not in a year; and the group is told
           the day it opens, so a week of writing does not just vanish. */
        return {
          kind: "transition",
          from: "answering",
          to: "sealed",
          patch: sealPatch(now),
          notify: "catchup_sealed",
          setsNextOpensAt: true,
          requires: { timeCapsule: true },
        };
      }
      // Straight out. This step used to be answering -> preparing, silent, with
      // the notification a day later on preparing -> published; now the close
      // and the announcement are the same transition, so an Edition can never
      // be published with nobody told (N88).
      return {
        kind: "transition",
        from: "answering",
        to: "published",
        patch: publishPatch(now),
        notify: "catchup_published",
        setsNextOpensAt: true,
        requires: { timeCapsule: false },
      };
    }
    if (ed.status === "sealed" && next === "published") {
      /* A year later: the same publish, the same bell. It books nothing,
         because the rhythm was booked when it sealed and has been running
         since. */
      return {
        kind: "transition",
        from: "sealed",
        to: "published",
        patch: publishPatch(now),
        notify: "catchup_published",
        setsNextOpensAt: false,
        requires: { timeCapsule: true },
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
        requires: null,
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
      requires: null,
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

/**
 * Calendar days left before a deadline, counted in the valley's own days --
 * 0 meaning "it closes today" -- or null once it has passed.
 *
 * Every member-facing countdown goes through this, because they used to
 * disagree. The index card, the masthead and the bell counted 24-hour blocks
 * (`Math.ceil` on the millisecond gap) while the answer page counted IST
 * calendar days, so with a deadline at 07:30 IST the bell said "Last day to
 * answer" from half past seven the MORNING BEFORE, and the page one click
 * away said "Answers close tomorrow" (audits C-141/C-031). One frame, and it
 * is the school's, for the same reason every timestamp on the site is.
 *
 * Deliberately NOT used for `daysLeftUntil`, which keys the once-a-day
 * reminder bucket: that arithmetic decides WHETHER a reminder fires and when,
 * and changing it here would quietly re-time every nudge. This is the count
 * the copy says out loud; that one is the clock.
 */
export function valleyDaysLeft(
  closeAt: Date | string | null | undefined,
  now: Date
): number | null {
  const m = ms(closeAt);
  if (m == null) return null;
  if (m - now.getTime() <= 0) return null;
  return Math.max(0, valleyDaysBetween(new Date(m), now));
}

/**
 * The bell's sentence for a deadline.
 *
 * It lives here next to `valleyDaysLeft`, the count it shares with every other
 * surface that names a last day, because the whole of C-141/C-031 was three
 * surfaces phrasing the same deadline from two different arithmetics -- the
 * cards counting 24-hour blocks while the answering page counted IST calendar
 * days, so the bell said "Last day to answer" from the morning before a page
 * saying "Answers close tomorrow".
 *
 * ITS SIBLING, `answersCloseSentence`, IS GONE, and so is the class of bug.
 * That one printed the same countdown on the answering page. Build phase 7
 * moved answering onto the Catch-up's home, where the deadline is stated as a
 * DATE -- "Answers close Thursday 20 August" -- by `homeStateLine`, which is
 * the drawn design (he cut the second half of that line himself: "you don't
 * need to say it comes out the same day"). A date and a countdown cannot
 * contradict each other, so there is now exactly ONE countdown left in the
 * app and it is this one.
 */
export function answerReminderMessage(
  groupName: string,
  closeAt: Date | string | null | undefined,
  now: Date
): string {
  const days = valleyDaysLeft(closeAt, now);
  if (days === null || days === 0) return `Last day to answer ${groupName}'s Catch-up.`;
  if (days === 1) return `Answers close tomorrow for ${groupName}'s Catch-up.`;
  return `${days} days left to answer ${groupName}'s Catch-up.`;
}

function daysUntilLabel(t: Date | string | null | undefined, now: Date): string | null {
  if (ms(t) == null) return null;
  const days = valleyDaysLeft(t, now);
  if (days === null) return "closing";
  if (days === 0) return "last day";
  if (days === 1) return "closes tomorrow";
  return `${days} days left`;
}

/** Countdown-only copy for the live part of an Edition. */
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

/**
 * One line saying where an Edition is, in the words a member would use.
 *
 * It takes no `number` and prints none. An Edition is identified by its DATE,
 * never by a position in a sequence -- the owner, 2026-09-07: "let's ditch the
 * round 1 ... The round number is irrelevant." The `number` column survives
 * because `@@unique([catchupId, number])` is what makes "one Edition at a
 * time" enforceable, but nothing prints it. `roundLabel()`, which returned
 * "Round N" for five surfaces, was deleted here rather than renamed.
 */
export function describeEditionStatus(
  ed: {
    status: EditionStatus;
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
    case "sealed":
      return "Sealed";
    case "published":
      return "Published";
    default:
      return "";
  }
}

/**
 * The ONE line written under a Catch-up's name on the list (build phase 6).
 *
 * "It can just be whatever stage it's going through" -- his, N26, taking the
 * Edition number off the card in the same breath. So: what this Catch-up is
 * doing, in words, in the same shape in every state, so the eye learns where
 * to look once. No counts of any kind, which is the standing objection (R32:
 * "you're trying so hard to include useless information").
 *
 * It is deliberately NOT `describeEditionStatus`. That one answers "where is
 * this Edition in the machine" for the console and the admin room, and says
 * "Answering now, 3 days left"; this one answers "what is this Catch-up doing"
 * for somebody choosing which card to open, and says "Answers close Thursday
 * 20 August". A countdown belongs on the page you are already on.
 *
 * ENDED CARRIES NO DATE, and that is a data fact rather than a design one.
 * The drawing says "Ended 17 April", but nothing records WHEN a Catch-up
 * ended: `status` flips to "ended" and `updatedAt` moves for any edit after.
 * Inventing a column for one line on one card is a migration, and build phase
 * 6 has none. One word, until something honest can follow it.
 */
/**
 * The one line UNDER the Edition region on a Catch-up's own home.
 *
 * Not the same sentence as `catchupStageLine` below, which labels a card on
 * the list and has to say what state the Catch-up is in. This one sits beneath
 * the thing it describes, so it only speaks when the region above it has not
 * already said the same thing. Two lines were deleted here at his word:
 *
 *   "Open for questions is not necessary because if the box is there, it
 *    implies that it's open for questions."
 *
 *   "Answers close Thursday 20 August, and it comes out the same day. Well,
 *    you don't need to say it comes out the same day. That's almost like
 *    implied. That's so stupid."
 *
 * So collecting returns null -- the ask box IS the line -- and answering
 * carries the deadline and nothing else. Held returns null too: the clock is
 * not running, so printing a deadline under a card that says the Catch-up is
 * on hold is the page contradicting itself in two lines.
 */
export function homeStateLine(
  catchupStatus: CatchupStatus,
  edition: {
    status: EditionStatus;
    answersCloseAt?: Date | string | null;
  } | null,
  nextOpensAt: Date | string | null,
  fmt: { dayAndDate: (d: Date | string) => string; longDate: (d: Date | string) => string }
): string | null {
  if (catchupStatus === "paused") return null;
  /* "Ended" and not "Ended 17 April", for the same reason `catchupStageLine`
     gives below: NOTHING RECORDS WHEN A CATCH-UP ENDED. `status` flips to
     "ended" and `updatedAt` moves again for any edit after, so a date here
     would be a plausible-looking lie. The drawing asked for the date; the
     column to draw it from does not exist and phase 7 has no migration. */
  if (catchupStatus === "ended") return "Ended";
  if (!edition) return null;
  if (edition.status === "answering") {
    return edition.answersCloseAt ? `Answers close ${fmt.dayAndDate(edition.answersCloseAt)}` : null;
  }
  /* A sealed Edition is the latest only until the rhythm opens the next one,
     and the rhythm was booked when it sealed, so the line is the same. */
  if (edition.status === "published" || edition.status === "sealed") {
    return nextOpensAt ? `The next one opens ${fmt.longDate(nextOpensAt)}` : null;
  }
  return null;
}

export function catchupStageLine(
  catchupStatus: CatchupStatus,
  edition: {
    status: EditionStatus;
    answersCloseAt?: Date | string | null;
    publishedAt?: Date | string | null;
    publishAt?: Date | string | null;
  } | null,
  /** Injected so this stays pure and testable, and so the app has one date
   *  voice: `formatDayAndDate` and `formatDisplayDateLong` from lib/utils,
   *  both pinned to the valley's own day. */
  fmt: { dayAndDate: (d: Date | string) => string; longDate: (d: Date | string) => string }
): string {
  // The Catch-up's own state outranks the Edition's: a paused Catch-up with a
  // live Edition inside it is paused, and today's home hides that Edition
  // behind a whole replacement page (recon section 11).
  if (catchupStatus === "paused") return "Paused";
  if (catchupStatus === "ended") return "Ended";
  if (!edition) return "No Editions yet";
  switch (edition.status) {
    case "collecting":
      return "Open for questions";
    case "answering":
      return edition.answersCloseAt
        ? `Answers close ${fmt.dayAndDate(edition.answersCloseAt)}`
        : "Open for answers";
    case "published":
      return edition.publishedAt ? `Out ${fmt.longDate(edition.publishedAt)}` : "Out now";
    /* A stand-in line until the owner picks how a sealed Edition looks
       (/lab/catchups/capsule); nothing can seal one before then. */
    case "sealed":
      return edition.publishAt ? `Sealed until ${fmt.longDate(edition.publishAt)}` : "Sealed";
    // A `draft` Edition is one that exists and has not opened. Nothing creates
    // one today -- every creation path opens straight into collecting, and the
    // live database holds none -- but the status is still in the union, and
    // "Open for questions" would be a lie on the one card that ever had it.
    default:
      return "Not open yet";
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
  return isMissingTable(err, /Catchup/);
}
