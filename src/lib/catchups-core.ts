/* ------------------------------------------------------------------ *
 *  Catch-ups: the PURE half of the engine.
 *
 *  The 30-question library, the timing constants, the calendar
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
  CatchupStatus,
  CatchupNotifyKind,
  EditionStatus,
  EditionTiming,
  PromptCategory,
  ReminderMode,
} from "@/lib/catchups-types";

/* ------------------------------------------------------------------ *
 *  Why the runtime deps (prisma, the notify builders) load via dynamic
 *  import instead of a static `import`:
 *
 *  The pure state machine below (computeStatus, planNextAction, the
 *  patch helpers, calendar math) is unit-tested with
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

/**
 * A member's reminders when they have never chosen: none. His answer,
 * 2026-10-17, to "how many notifications should a round send to someone who
 * isn't taking part?": "Only 'a round started' and 'it's published'. No
 * reminders unless you've turned them on yourself." Read by the notify
 * builders and the settings row alike, so the bell and the page agree about
 * what a member who never touched it gets. It was "all" (daily) by default.
 */
export const DEFAULT_REMINDER_MODE: ReminderMode = "off";

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
 * NOT a snapped twelve-months-on: snapping rounds FORWARD,
 * so a capsule sealed by the 07:30 cron would open on the 15th, a day late,
 * every year. This lands on the date itself: sealed at 05:30 IST it opens an
 * hour and a half over a year, sealed at 23:59 IST seventeen hours short, and
 * never a whole day either way.
 *
 * 29 February has no anniversary three years in four, so it opens on 28
 * February: the last day of the month it was sealed in.
 */
export function capsuleOpensAt(sealedAt: Date): Date {
  const valley = new Date(sealedAt.getTime() + IST_OFFSET_MS);
  const year = valley.getUTCFullYear() + 1;
  const month = valley.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(valley.getUTCDate(), daysInMonth);
  return new Date(Date.UTC(year, month, day) + DEADLINE_HOUR_UTC_MS);
}

/* `addCadenceGap` and the month arithmetic under it stood here: they booked
   the next Edition a rhythm after the last one came out. There is no rhythm
   any more (2026-10-17, docs/planning/catchups-rework/editions-on-demand.md).
   An Edition starts because somebody in the Catch-up starts it. */

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
 * (spec section 2.2).
 *
 * Two role strings, one meaning. `"keeper"` is what every path that hands the
 * hat on writes: `setCatchupKeeper`, succession, the account purge and an
 * admin's merge (bug audit 3, T7a-07). `"admin"` is what every Catch-up
 * creator's own membership row has carried since creation. It was also the
 * GROUP's moderation role once, read by a `deletePost` that let a group admin
 * delete anyone's post in the group, which is why the two were kept apart;
 * posts left groups on 2026-09-07, and nothing outside this feature reads the
 * group role any more. Read both; only ever write `"keeper"`.
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

/* `BATCH_QUESTIONS_TO_START` and `BATCH_CADENCE` stood here. A batch's first
   Edition used to start itself on its third question, and later ones arrived
   every three months. Both were ways of starting something nobody had
   started. The owner, 2026-10-17: "You should just be able to start it
   whenever you want. And then it ends when it ends. And then it just doesn't
   go until you start it again." So a batch Catch-up is made idle and stays
   idle until a member presses Start (`isEditionRunning` below). */

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
 * worry rather than the reasoning behind it: "make everyone a keeper".
 * Everyone in the batch runs the cycle together -- starting an Edition,
 * choosing questions, opening answering, extending, closing and publishing --
 * and the accident risk N30 named is answered by a confirmation that says how
 * many people will be told, rather than by locking the controls to nobody.
 * (It was answered by every batch starting paused until 2026-10-17, when
 * Editions stopped running on their own and there was nothing left to hold.)
 *
 * What is LEFT refusing this sentence is membership and identity: the batch
 * IS the roster, so there is still nobody to add, remove, or hand a Keeper's
 * hat to, and the name and ending it stay fixed the same way.
 * `loadKeeperScope` and `loadKeeperEdition` each take an `allowBatch` opt-in
 * per caller now; the cycle controls pass it, these six do not.
 *
 * Still ONE sentence rather than one per control, because the reason is the
 * same every time and has nothing to do with who is asking.
 */
export const BATCH_CATCHUP_REFUSAL =
  "A batch Catch-up's roster is the batch itself, so there is nobody to add, remove, or hand the Keeper's hat to. Its name stays fixed, and it cannot be ended, for the same reason.";

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
 *   ENDED. `advanceEdition` freezes the clock of a Catch-up that has ended,
 *   so a deadline inside it stays in the past for good. That is the ending
 *   working, not a stuck Edition. (A legacy `paused` row runs like an active
 *   one now, so it is on the list like one.)
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
        catchup: { status: { not: "ended" } },
        prompts: { some: {} },
      },
      { status: "answering", answersCloseAt: { lt: now }, catchup: { status: { not: "ended" } } },
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
 * After that extension an Edition with still no questions FIZZLES rather than
 * opening answering (see planNextAction). Opening it would invite the whole
 * group to answer nothing, then nudge every one of them daily for a week about
 * the questions that do not exist, then publish an empty keepsake (audit
 * B-062). Fizzling clears its question deadline, which is what makes it idle
 * (`isEditionRunning`): the home draws Start, and the next Start reuses the row
 * with a fresh window. A question used to revive it; since 2026-10-17 only
 * Start does.
 */
function shouldExtendForNoQuestions(ed: EditionTiming, promptCount: number): boolean {
  return promptCount === 0 && (ed.remindersSent & REMINDER_QUESTIONS_EXTENDED) === 0;
}

// ─── Transition patches (pure; shared by advanceEdition AND the WP2 actions) ──

export type EditionPatch = {
  status?: EditionStatus;
  /** Null only from `fizzlePatch`: an Edition with no question deadline is idle. */
  questionsCloseAt?: Date | null;
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
 * From the deadline OR from now, whichever is later (audit C-028). A window
 * that has just closed keeps its `questionsCloseAt` in the past until the clock
 * moves it on, and extending from that put the new deadline in the past too:
 * the write applied, the Keeper was told it had worked, and nothing whatsoever
 * changed. Extending a live window still means "the date on the page moves N
 * days", which is the thing this is careful about. (An IDLE Edition has no
 * deadline at all and is refused before this runs; only Start gives it one.)
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
 * Whether a hand extension may land, and what it writes (bug audit 3, T3-06).
 *
 * `seen` is the deadline the presser's page showed, and the write swaps on it,
 * so two people tapping "A week" on the same page add one week between them:
 * the second finds the date already moved and is told so. The swap used to
 * compare the row with what the action had read a moment earlier in the same
 * request, which always matched, so every tap added the whole extension again
 * while the row went on saying "A week more". On a batch Catch-up any member
 * holds the control, so any two of them stacked.
 *
 * The new date is `extendPhasePatch`'s, from the deadline or from now,
 * whichever is later, so it can never land earlier than the one it replaces
 * (C3-01: the zero-answer press once moved a week's deadline up to four days
 * earlier, and "Give everyone 3 more days" now comes through here).
 */
export function planExtension(
  ed: EditionTiming,
  days: number,
  seen: Date | string | null | undefined,
  now: Date
):
  | { ok: true; patch: EditionPatch; deadline: Date; closesAt: Date }
  | { ok: false; reason: "closed" | "moved" } {
  const patch = extendPhasePatch(ed, days, now);
  if (!patch) return { ok: false, reason: "closed" };
  const deadline = ms(ed.status === "collecting" ? ed.questionsCloseAt : ed.answersCloseAt);
  if (deadline == null || ms(seen) !== deadline) return { ok: false, reason: "moved" };
  return {
    ok: true,
    patch,
    deadline: new Date(deadline),
    closesAt: (patch.questionsCloseAt ?? patch.answersCloseAt) as Date,
  };
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
 * `sealedAt` is when answering actually closed, which is what the opening date
 * is measured from.
 */
export function sealPatch(now: Date): EditionPatch {
  return { status: "sealed", sealedAt: now, publishAt: capsuleOpensAt(now) };
}

/* `shiftPausedInstant` and `shiftEditionPatch` stood here: resuming a held
   Catch-up gave its deadlines back the time the hold took. Hold went when
   Editions stopped running on a rhythm (2026-10-17): with nothing scheduled
   there is nothing to hold between Editions, and inside one "give everyone
   longer" is the same act with a date on it. */

/** An Edition that closed empty twice: no deadline, so idle (`isEditionRunning`). */
function fizzlePatch(): EditionPatch {
  return { questionsCloseAt: null };
}

/** No-questions extension: push the question window 3 days and set bit 3. */
function questionsExtendPatch(ed: EditionTiming, now: Date): EditionPatch {
  return {
    questionsCloseAt: deadlineIn(now, EXTEND_DAYS),
    remindersSent: ed.remindersSent | REMINDER_QUESTIONS_EXTENDED,
  };
}

/**
 * Too-few extension: push the answer window 3 days and set the extended bit.
 *
 * THE CLOCK'S ALONE. It runs at the deadline, where "three days from now" is
 * three more days. "Close and send it out" borrowed it once and, pressed in
 * a week's first days, moved the deadline up to four days earlier and spent
 * the Edition's one safety net (bug audit 3, C3-01). A hand extension is
 * `planExtension`, which anchors on the deadline.
 */
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
      /**
       * What the row's flag must say for the write to land, or null. The
       * compare-and-swap carries it, so a caller holding a stale or missing
       * `timeCapsule` can never publish a capsule: the update matches nothing,
       * the loop re-reads the row, and plans again from the truth.
       */
      requires: { timeCapsule: boolean } | null;
    }
  | { kind: "extend"; patch: EditionPatch; notify: "catchup_answers_open" }
  | { kind: "extend-questions"; patch: EditionPatch }
  | { kind: "fizzle"; patch: EditionPatch }
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
      // SILENTLY since 2026-10-17: it used to tell everyone again, a third
      // bell for people who had already ignored the first (his answer: the
      // start and the publish, and nothing else, for anyone not taking part).
      if (shouldExtendForNoQuestions(ed, counts.prompts)) {
        return { kind: "extend-questions", patch: questionsExtendPatch(ed, now) };
      }
      // Its one extension spent and still empty: it fizzles. Clearing the
      // deadline is the whole write, and it is what makes the Edition idle,
      // so the next Start reuses this row and no page view counts its
      // questions again (the sweep skips a collecting row with no deadline).
      return { kind: "fizzle", patch: fizzlePatch() };
    }
    if (ed.status === "answering" && (next === "published" || next === "sealed")) {
      if (shouldExtendForTooFew(ed, counts.entries)) {
        return { kind: "extend", patch: extendPatch(ed, now), notify: "catchup_answers_open" };
      }
      if (next === "sealed") {
        /* A time capsule closes the same way and lands sealed. The Catch-up
           is idle from here, free to start its next Edition (the capsule is
           one Edition, his 33), and the group is told the day it opens, so a
           week of writing does not just vanish. */
        return {
          kind: "transition",
          from: "answering",
          to: "sealed",
          patch: sealPatch(now),
          notify: "catchup_sealed",
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
        requires: { timeCapsule: false },
      };
    }
    if (ed.status === "sealed" && next === "published") {
      /* A year later: the same publish, the same bell. */
      return {
        kind: "transition",
        from: "sealed",
        to: "published",
        patch: publishPatch(now),
        notify: "catchup_published",
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

// ─── Idle or running ─────────────────────────────────────────────────────────

/**
 * Is an Edition under way, or is the Catch-up idle and waiting for somebody to
 * start one?
 *
 * There is no rhythm (owner, 2026-10-17: "You should just be able to start it
 * whenever you want. And then it ends when it ends. And then it just doesn't go
 * until you start it again."), so this is the question every surface asks
 * before it offers Start, and the one `openEdition` asks before it agrees.
 *
 * ONE FIELD DECIDES IT. Running is `answering`, or `collecting` with a question
 * deadline. Idle is everything else: out (published), sealed, or `collecting`
 * with no deadline -- which is both a batch's first Edition, made that way and
 * told to nobody, and one that FIZZLED (closed empty, extension spent), because
 * the clock clears the deadline when it fizzles (`planNextAction`). Start puts
 * a deadline on that same row.
 *
 * It used to be three fields and a question count, which every caller had to
 * fetch and the clock had to agree with; a fizzled row then sat in the
 * page-view sweep for good, counting its questions on every visit. Storing the
 * state in the deadline made all of that one null check.
 *
 * Takes the status as a plain string so a raw Prisma row passes as it is.
 */
export function isEditionRunning(ed: {
  status: string;
  questionsCloseAt: Date | string | null | undefined;
}): boolean {
  if (ed.status === "answering") return true;
  return ed.status === "collecting" && ms(ed.questionsCloseAt) != null;
}

/**
 * `isEditionRunning` as a Prisma `where`, for a write that must not land while
 * an Edition runs: ending a Catch-up (bug audit 3, T2a-07). Beside the
 * predicate so the two cannot drift; catchups-core.test.mjs checks them
 * against each other.
 */
export const RUNNING_EDITION_WHERE = {
  OR: [{ status: "answering" }, { status: "collecting", questionsCloseAt: { not: null } }],
};

/**
 * An answer with nothing left in it: no words, no photograph, no recording, the
 * three things `submitEntry` writes. Erasing all three withdraws the member from
 * the Edition (audit Low 36), and the delete that does it carries exactly this,
 * so a save from another device that has just put something back into the row
 * is never deleted with it (bug audit 3, T2b-06).
 */
export const EMPTY_ENTRY_WHERE = { body: null, images: null, audioUrl: null };

/**
 * An answer, then, is a row with anything in it, and this is what "nobody has
 * answered" counts: the Keeper's early close and the clock's too-few rule alike.
 * A row emptied a moment ago and not yet withdrawn is not an answer to either
 * (bug audit 3, A3 review of C3-01).
 */
export const ANSWERED_ENTRY_WHERE = { NOT: EMPTY_ENTRY_WHERE };

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
 * carries the deadline and nothing else. Out returns null as well: the place
 * under the cover is where Start goes, and "The next one opens 6 December"
 * went with the rhythm that booked it (2026-10-17).
 */
export function homeStateLine(
  catchupStatus: CatchupStatus,
  edition: {
    status: EditionStatus;
    answersCloseAt?: Date | string | null;
  } | null,
  fmt: { dayAndDate: (d: Date | string) => string }
): string | null {
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
  return null;
}

export function catchupStageLine(
  catchupStatus: CatchupStatus,
  edition: {
    status: EditionStatus;
    answersCloseAt?: Date | string | null;
    publishedAt?: Date | string | null;
    publishAt?: Date | string | null;
    questionsCloseAt?: Date | string | null;
    /** Only to tell a never-started first Edition from one that fizzled
     *  later. Never printed: an Edition is named by its date. */
    number?: number;
  } | null,
  /** Injected so this stays pure and testable, and so the app has one date
   *  voice: `formatDayAndDate` and `formatDisplayDateLong` from lib/utils,
   *  both pinned to the valley's own day. */
  fmt: { dayAndDate: (d: Date | string) => string; longDate: (d: Date | string) => string }
): string {
  // The Catch-up's own state outranks the Edition's: an ended Catch-up with an
  // Edition left inside it is ended.
  if (catchupStatus === "ended") return "Ended";
  if (!edition) return "No Editions yet";
  /* Idle on a `collecting` row: no question deadline, the one signal
     `isEditionRunning` reads. Never started, or fizzled. "Open for questions"
     would be a lie on both, since there is no box to ask in until somebody
     presses Start. Explicitly null, not merely absent, so a caller that did
     not select the column cannot turn a running row idle. Nothing has ever
     come out of a first Edition, whichever it is. */
  if (edition.status === "collecting" && edition.questionsCloseAt === null) {
    return edition.number === 1 ? "No Editions yet" : "Nothing running";
  }
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

// ─── The missing-table guard (P2021) ─────────────────────────────────────────

/**
 * True when an error means "a Catchup* table does not exist yet" (pre-migration).
 * Shared surfaces (the app-shell piggyback, the group card) wrap their queries
 * with this so a missing table degrades to "no Catch-up data" instead of a 500.
 */
export function isMissingCatchupTable(err: unknown): boolean {
  return isMissingTable(err, /Catchup/);
}
