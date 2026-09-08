/* ------------------------------------------------------------------ *
 *  Unit tests for the pure Catch-ups engine. NO database, NO network.
 *
 *  Run: node --test src/lib/catchups-core.test.mjs
 *
 *  These exercise the state machine at every boundary, the reminder
 *  bitmask + auto-extend-once idempotency, cadence math, the Spotify
 *  resolver (with a stubbed fetch), and the P2021 guard. They import the
 *  real functions from catchups.ts; Node strips its type-only imports, so
 *  the impure drivers (which load prisma lazily) are never touched here.
 *
 *  One exception at the end: the anonymity sweep reads the renderers off
 *  disk, because the bug it pins (audit C-019) was a renderer disagreeing
 *  with a rule that was itself correct.
 * ------------------------------------------------------------------ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DAY_MS,
  HOUR_MS,
  REMINDER_TWO_DAYS,
  REMINDER_LAST_DAY,
  REMINDER_EXTENDED,
  askerVisible,
  computeStatus,
  nextEditionStatus,
  planNextAction,
  addCadenceGap,
  answerReminderMessage,
  answersCloseSentence,
  valleyDaysLeft,
  addDays,
  deadlineIn,
  snapToDeadlineHour,
  catchupDisplayName,
  catchupSurfaceTitle,
  isEffectiveKeeper,
  mayChangeCatchupPicture,
  editionCountdownLabel,
  describeEditionStatus,
  catchupStageLine,
  resolveSpotify,
  isMissingCatchupTable,
  CATCHUP_PROMPT_SETS,
  dailyBucket,
  withDailyBucket,
  daysLeftUntil,
  TICK_GRACE_MS,
  extendPhasePatch,
  REMINDER_QUESTIONS_EXTENDED,
  shiftEditionPatch,
  shiftPausedInstant,
} from "./catchups-core.ts";
import { PROMPT_CATEGORIES } from "./catchups-types.ts";
import { formatDayAndDate, formatDisplayDateLong } from "./utils.ts";
import { read, decomment } from "./test-kit.mjs";

// A fixed clock so every case is deterministic.
const NOW = new Date("2026-03-01T12:00:00.000Z");
const at = (offsetMs) => new Date(NOW.getTime() + offsetMs);

/** Build an EditionTiming with sensible defaults. */
function edition(overrides = {}) {
  return {
    status: "collecting",
    questionsCloseAt: null,
    answersCloseAt: null,
    publishedAt: null,
    remindersSent: 0,
    ...overrides,
  };
}

/**
 * Counts for planNextAction. `prompts` defaults to 3 -- "somebody asked
 * something", which is the ordinary Edition. The no-questions cases below pass
 * `prompts: 0` explicitly, so a test that cares says so.
 */
const counts = (entries = 0, prompts = 3) => ({ entries, prompts });

/** Apply a plan's patch the way the DB would, so we can re-plan and assert idempotency. */
const applyPatch = (ed, patch) => ({ ...ed, ...patch });

// ─── computeStatus: forward-only boundaries ──────────────────────────────────

test("computeStatus: draft never advances by the clock", () => {
  const ed = edition({
    status: "draft",
    questionsCloseAt: at(-DAY_MS),
    answersCloseAt: at(-DAY_MS),
  });
  assert.equal(computeStatus(ed, NOW), "draft");
});

test("computeStatus: published is terminal", () => {
  const ed = edition({ status: "published", publishedAt: at(-DAY_MS) });
  assert.equal(computeStatus(ed, NOW), "published");
});

test("computeStatus: collecting holds until questionsCloseAt, then answering", () => {
  assert.equal(computeStatus(edition({ status: "collecting", questionsCloseAt: at(DAY_MS) }), NOW), "collecting");
  assert.equal(computeStatus(edition({ status: "collecting", questionsCloseAt: at(-1) }), NOW), "answering");
});

test("computeStatus: a deadline the next tick just undershoots still fires (C-142)", () => {
  /* The failure this pins: a deadline is minted as `day-0 tick + N days`, and
     the day-N tick runs at its own independent offset. Fire even a second
     earlier than day 0 did and the comparison misses, so the phase waits a
     whole further day -- about half the time, for any jitter at all. The
     grace makes an undershoot smaller than a scheduler's wobble irrelevant.

     Expressed as a fraction of the grace, not as a literal, so tuning the
     constant does not need this test rewritten. */
  const undershoot = TICK_GRACE_MS / 2;
  assert.equal(
    computeStatus(edition({ status: "collecting", questionsCloseAt: at(undershoot) }), NOW),
    "answering",
    "a tick firing inside the grace before the deadline must still advance"
  );
  assert.equal(
    computeStatus(edition({ status: "answering", answersCloseAt: at(undershoot) }), NOW),
    "published"
  );
});

test("computeStatus: the grace is a wobble, not a shortened phase (C-142)", () => {
  // A whole day still to run is a whole day still to run.
  assert.equal(
    computeStatus(edition({ status: "collecting", questionsCloseAt: at(DAY_MS) }), NOW),
    "collecting"
  );
  // And the grace stays far below the granularity the deadlines are set in.
  // Still holding with an hour to run: an Edition an hour from its close is
  // still open, not out.
  assert.equal(
    computeStatus(edition({ status: "answering", answersCloseAt: at(HOUR_MS) }), NOW),
    "answering"
  );
  assert.ok(TICK_GRACE_MS < HOUR_MS, `a grace of ${TICK_GRACE_MS}ms is not a wobble`);
});

test("computeStatus: collecting cannot skip past answering when the later close is not set", () => {
  // questionsCloseAt passed but answersCloseAt is still null (the normal case): stop at answering.
  assert.equal(
    computeStatus(edition({ status: "collecting", questionsCloseAt: at(-DAY_MS), answersCloseAt: null }), NOW),
    "answering"
  );
});

test("computeStatus: answering holds until answersCloseAt, then PUBLISHED", () => {
  assert.equal(computeStatus(edition({ status: "answering", answersCloseAt: at(DAY_MS) }), NOW), "answering");
  /* Straight out, with no hold in between: `preparing` is deleted (N88, "why
     doesn't it just publish immediately?"). If a fourth state ever appears
     between these two again, this line is what says it was not asked for. */
  assert.equal(computeStatus(edition({ status: "answering", answersCloseAt: at(-1) }), NOW), "published");
});

test("computeStatus: a very stale collecting Edition cascades all the way to published", () => {
  const ed = edition({
    status: "collecting",
    questionsCloseAt: at(-3 * DAY_MS),
    answersCloseAt: at(-2 * DAY_MS),
  });
  assert.equal(computeStatus(ed, NOW), "published");
});

test("nextEditionStatus: one step at a time, null when settled", () => {
  assert.equal(nextEditionStatus(edition({ status: "collecting", questionsCloseAt: at(-1) }), NOW), "answering");
  assert.equal(nextEditionStatus(edition({ status: "collecting", questionsCloseAt: at(DAY_MS) }), NOW), null);
  assert.equal(nextEditionStatus(edition({ status: "published", publishedAt: at(-DAY_MS) }), NOW), null);
});

// ─── planNextAction: transitions + idempotency ───────────────────────────────

test("planNextAction: collecting -> answering fires answers-open once, then is a no-op", () => {
  let ed = edition({ status: "collecting", questionsCloseAt: at(-HOUR_MS) });
  const a1 = planNextAction(ed, counts(0), NOW);
  assert.equal(a1.kind, "transition");
  assert.equal(a1.to, "answering");
  assert.equal(a1.notify, "catchup_answers_open");
  assert.ok(a1.patch.answersCloseAt instanceof Date);
  assert.equal(a1.patch.answersCloseAt.getTime(), deadlineIn(NOW, 7).getTime());

  ed = applyPatch(ed, a1.patch); // the DB flip
  assert.equal(planNextAction(ed, counts(0), NOW).kind, "none"); // idempotent
});

test("planNextAction: answering -> published fires published + schedules the next Edition", () => {
  /* One transition where there were two. The close used to be silent
     (answering -> preparing, notify null) and the announcement came a day
     later; now they are the same step, so an Edition cannot come out with
     nobody told. */
  const ed = edition({ status: "answering", answersCloseAt: at(-HOUR_MS) });
  const a = planNextAction(ed, counts(5), NOW);
  assert.equal(a.kind, "transition");
  assert.equal(a.from, "answering");
  assert.equal(a.to, "published");
  assert.equal(a.notify, "catchup_published");
  assert.equal(a.setsNextOpensAt, true);
  assert.ok(a.patch.publishedAt instanceof Date);
  assert.equal(a.patch.publishAt, undefined, "publishAt is gone, not merely unset");
});

// ─── daily reminders (owner, 2026-08-05: one a day while answers are open) ───

test("planNextAction: one reminder per day, idempotent within the same day", () => {
  // 2.5 days before close: days-left rounds up to 3.
  let ed = edition({ status: "answering", answersCloseAt: at(2.5 * DAY_MS) });
  const r1 = planNextAction(ed, counts(3), NOW);
  assert.equal(r1.kind, "reminder");
  assert.equal(r1.daysLeft, 3);
  assert.equal(dailyBucket(r1.patch.remindersSent), 3);

  ed = applyPatch(ed, r1.patch);
  // A hundred more page views the same day must not produce a second one:
  // an hour on, days-left is still 3, so the bucket still matches.
  assert.equal(planNextAction(ed, counts(3), NOW).kind, "none");
  assert.equal(planNextAction(ed, counts(3), at(HOUR_MS)).kind, "none");
  // A day on it is due again, at 2.
  const next = planNextAction(ed, counts(3), at(DAY_MS));
  assert.equal(next.kind, "reminder");
  assert.equal(next.daysLeft, 2);
});

test("planNextAction: the countdown steps down a day at a time to the last day", () => {
  let ed = edition({ status: "answering", answersCloseAt: at(3 * DAY_MS) });
  const seen = [];
  // Walk the clock forward one day at a time across the whole window.
  for (let day = 0; day < 3; day += 1) {
    const now = at(day * DAY_MS);
    const action = planNextAction(ed, counts(0), now);
    assert.equal(action.kind, "reminder", `expected a reminder on day ${day}`);
    seen.push(action.daysLeft);
    ed = applyPatch(ed, action.patch);
    assert.equal(planNextAction(ed, counts(0), now).kind, "none"); // still one per day
  }
  assert.deepEqual(seen, [3, 2, 1]);
});

test("answeringPatch: seeds the bucket so the first daily nudge is a day away", () => {
  const ed = edition({ status: "collecting", questionsCloseAt: at(-HOUR_MS) });
  const action = planNextAction(ed, counts(0), NOW);
  assert.equal(action.kind, "transition");
  assert.equal(action.to, "answering");
  /* The window is seeded at whatever the snapped deadline is actually worth,
     so "answers are open" is not immediately followed by "N days left to
     answer" on the same page view. Eight, not seven: a 7-day window opened at
     12:00 UTC rounds forward to the next 07:00 IST, which is the civil-hour
     rule paid for in up to one extra day (see `snapToDeadlineHour`). */
  assert.equal(
    dailyBucket(action.patch.remindersSent),
    daysLeftUntil(deadlineIn(NOW, 7), NOW)
  );
  assert.equal(dailyBucket(action.patch.remindersSent), 8);
  const opened = applyPatch(ed, action.patch);
  assert.equal(planNextAction(opened, counts(0), NOW).kind, "none");
  // A day later it does fire, counting one fewer.
  const next = planNextAction(opened, counts(0), at(DAY_MS));
  assert.equal(next.kind, "reminder");
  assert.equal(next.daysLeft, 7);
});

test("dailyBucket / withDailyBucket: the bucket never clobbers the flag bits", () => {
  const flags = REMINDER_TWO_DAYS | REMINDER_LAST_DAY | REMINDER_EXTENDED;
  const packed = withDailyBucket(flags, 5);
  assert.equal(dailyBucket(packed), 5);
  assert.equal(packed & REMINDER_EXTENDED, REMINDER_EXTENDED);
  // Re-bucketing leaves the flags exactly as they were.
  assert.equal(withDailyBucket(packed, 2) & 0xff, flags);
  assert.equal(dailyBucket(withDailyBucket(packed, 2)), 2);
});

test("daysLeftUntil: rounds up, floors at 1 while open, 0 once past", () => {
  assert.equal(daysLeftUntil(at(3 * DAY_MS), NOW), 3);
  assert.equal(daysLeftUntil(at(2.1 * DAY_MS), NOW), 3); // any part of a day counts
  assert.equal(daysLeftUntil(at(HOUR_MS), NOW), 1); // last day, never 0 while open
  assert.equal(daysLeftUntil(at(-HOUR_MS), NOW), 0); // past: transition, not nudge
  assert.equal(daysLeftUntil(null, NOW), 0);
});

// ─── every deadline lands on 07:00 IST (spec section 3.3) ───────────────────

test("snapToDeadlineHour: every deadline lands at 01:30 UTC, which is 07:00 IST", () => {
  for (const offset of [0, 1, 7, 30, 400, -3]) {
    const snapped = snapToDeadlineHour(addDays(NOW, offset));
    assert.equal(snapped.getUTCHours(), 1, `${snapped.toISOString()} is not on the hour`);
    assert.equal(snapped.getUTCMinutes(), 30);
    assert.equal(snapped.getUTCSeconds(), 0);
    assert.equal(snapped.getUTCMilliseconds(), 0);
    // Read back in the valley's own zone, it says seven in the morning.
    assert.equal(
      snapped.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false }),
      "07:00:00"
    );
  }
});

test("snapToDeadlineHour: rounds forward only, and is idempotent", () => {
  const from = addDays(NOW, 7);
  const once = snapToDeadlineHour(from);
  assert.ok(once.getTime() >= from.getTime(), "a snapped window must never be SHORTER");
  assert.ok(once.getTime() - from.getTime() < DAY_MS, "and never longer by more than a day");
  /* Idempotent, which is what lets an extension anchor on a stored deadline
     and a resume shift one without walking it forward a day per call. */
  assert.equal(snapToDeadlineHour(once).getTime(), once.getTime());
});

test("07:00 IST is picked up by that morning's cron, within thirty minutes", () => {
  /* The hour is not a preference. `vercel.json` runs /api/catchups/tick on
     "0 2 * * *" -- 02:00 UTC, 07:30 IST -- and a deadline at 07:00 IST is
     therefore always swept by that morning's run rather than waiting on the
     lazy read-time advance and whoever happens to open a page. If the cron
     ever moves, this fails, and the deadline hour has to move with it. */
  const vercel = JSON.parse(read("vercel.json"));
  const tick = vercel.crons.find((c) => c.path === "/api/catchups/tick");
  assert.ok(tick, "the Catch-ups tick is no longer a cron");
  const [minute, hour] = tick.schedule.split(" ");
  const cronUtcMs = (Number(hour) * 60 + Number(minute)) * 60 * 1000;

  const deadline = snapToDeadlineHour(addDays(NOW, 7));
  const deadlineUtcMs =
    (deadline.getUTCHours() * 60 + deadline.getUTCMinutes()) * 60 * 1000;
  const wait = cronUtcMs - deadlineUtcMs;
  assert.ok(wait > 0, "the cron runs BEFORE the deadline, so an Edition waits a whole day");
  assert.ok(wait <= 30 * 60 * 1000, `an Edition waits ${wait / 60000} minutes for the tick`);
});

// ─── extending a deadline by hand (Keeper, owner 2026-08-05) ─────────────────

test("extendPhasePatch: collecting moves the question deadline from the deadline", () => {
  const ed = edition({ status: "collecting", questionsCloseAt: at(DAY_MS) });
  const patch = extendPhasePatch(ed, 2, NOW);
  // +2 days from the DEADLINE (NOW + 1d), not from now, then landed on the
  // civil hour like every other deadline this file mints.
  assert.equal(patch.questionsCloseAt.getTime(), deadlineIn(at(DAY_MS), 2).getTime());
  assert.equal(patch.answersCloseAt, undefined);
});

test("extendPhasePatch: answering moves the answer deadline and re-seeds the bucket", () => {
  const ed = edition({
    status: "answering",
    answersCloseAt: at(DAY_MS),
    remindersSent: withDailyBucket(REMINDER_EXTENDED, 1),
  });
  const patch = extendPhasePatch(ed, 7, NOW);
  assert.equal(patch.answersCloseAt.getTime(), deadlineIn(at(DAY_MS), 7).getTime());
  assert.equal(dailyBucket(patch.remindersSent), daysLeftUntil(patch.answersCloseAt, NOW));
  assert.equal(patch.remindersSent & REMINDER_EXTENDED, REMINDER_EXTENDED);
  // Buying the group a week does not immediately spend it on a reminder.
  assert.equal(planNextAction(applyPatch(ed, patch), counts(0), NOW).kind, "none");
});

test("C-028: extending a dormant Edition lands in the future, not in the past", () => {
  /* An Edition whose question window closed empty keeps a `questionsCloseAt`
     weeks old. Extending from that put the new deadline in the past too: the
     write applied, the Keeper was told it had worked, and the card still said
     the same thing (audit C-028). */
  const dormant = edition({ status: "collecting", questionsCloseAt: at(-20 * DAY_MS) });
  const patch = extendPhasePatch(dormant, 2, NOW);
  assert.ok(patch.questionsCloseAt.getTime() > NOW.getTime(), "the new deadline is still in the past");
  assert.equal(patch.questionsCloseAt.getTime(), deadlineIn(NOW, 2).getTime());

  // The same for an answer window found already closed.
  const late = edition({ status: "answering", answersCloseAt: at(-3 * DAY_MS) });
  const answerPatch = extendPhasePatch(late, 1, NOW);
  assert.equal(answerPatch.answersCloseAt.getTime(), deadlineIn(NOW, 1).getTime());

  // ...and a live window is still extended from the DEADLINE, which is the
  // whole point of the original design: "extend by 2 days" moves the date on
  // the page by two days.
  const live = edition({ status: "collecting", questionsCloseAt: at(DAY_MS) });
  assert.equal(
    extendPhasePatch(live, 2, NOW).questionsCloseAt.getTime(),
    deadlineIn(at(DAY_MS), 2).getTime()
  );
});

test("extendPhasePatch: nothing left to extend once the window has closed", () => {
  assert.equal(extendPhasePatch(edition({ status: "published" }), 1, NOW), null);
});

test("planNextAction: no reminder once the answer window has fully closed", () => {
  const ed = edition({ status: "answering", answersCloseAt: at(-1) });
  // With entries present it should transition, not nudge.
  assert.equal(planNextAction(ed, counts(4), NOW).kind, "transition");
});

// ─── auto-extend-once ────────────────────────────────────────────────────────

test("planNextAction: zero answers at close extends the window once (bit 4)", () => {
  let ed = edition({ status: "answering", answersCloseAt: at(-HOUR_MS), remindersSent: 0 });
  const e1 = planNextAction(ed, counts(0), NOW);
  assert.equal(e1.kind, "extend");
  assert.equal(e1.notify, "catchup_answers_open");
  assert.ok(e1.patch.answersCloseAt.getTime() > NOW.getTime());
  assert.equal(e1.patch.remindersSent & REMINDER_EXTENDED, REMINDER_EXTENDED);

  ed = applyPatch(ed, e1.patch);
  assert.equal(planNextAction(ed, counts(0), NOW).kind, "none"); // window now in the future; no second extend
});

test("planNextAction: after an extension it publishes even with zero answers", () => {
  // Extended once (bit 4 set), and the extended window has now also closed with no entries.
  const ed = edition({
    status: "answering",
    answersCloseAt: at(-HOUR_MS),
    remindersSent: REMINDER_EXTENDED,
  });
  const a = planNextAction(ed, counts(0), NOW);
  assert.equal(a.kind, "transition");
  assert.equal(a.to, "published");
});

// ─── an Edition nobody asked anything in (audit B-062) ──────────────────────────

test("planNextAction: a question window closing with no questions extends once, not opens", () => {
  let ed = edition({ status: "collecting", questionsCloseAt: at(-HOUR_MS), remindersSent: 0 });

  const a1 = planNextAction(ed, counts(0, 0), NOW);
  assert.equal(a1.kind, "extend-questions");
  assert.equal(a1.notify, "catchup_questions_open");
  assert.equal(a1.patch.questionsCloseAt.getTime(), deadlineIn(NOW, 3).getTime());
  assert.equal(a1.patch.remindersSent & REMINDER_QUESTIONS_EXTENDED, REMINDER_QUESTIONS_EXTENDED);
  // Crucially it did NOT open answering, which would have invited the whole
  // group to answer nothing.
  assert.notEqual(a1.kind, "transition");

  ed = applyPatch(ed, a1.patch);
  assert.equal(planNextAction(ed, counts(0, 0), NOW).kind, "none"); // window is future again
});

test("planNextAction: after its one extension a still-empty Edition goes dormant, forever", () => {
  const ed = edition({
    status: "collecting",
    questionsCloseAt: at(-HOUR_MS),
    remindersSent: REMINDER_QUESTIONS_EXTENDED,
  });
  // Not a transition, not an extension, not a reminder: nothing at all.
  assert.equal(planNextAction(ed, counts(0, 0), NOW).kind, "none");
  // And still nothing a month later -- this is what stops the abandoned-
  // Catch-up loop (open empty -> nudge daily -> publish empty -> repeat).
  assert.equal(planNextAction(ed, counts(0, 0), at(30 * DAY_MS)).kind, "none");
});

test("planNextAction: one question is enough to open answering normally", () => {
  const ed = edition({
    status: "collecting",
    questionsCloseAt: at(-HOUR_MS),
    remindersSent: REMINDER_QUESTIONS_EXTENDED,
  });
  const a = planNextAction(ed, counts(0, 1), NOW);
  assert.equal(a.kind, "transition");
  assert.equal(a.to, "answering");
  assert.equal(a.notify, "catchup_answers_open");
});

// ─── pause freezes the Edition; resume hands the time back (audit B-060/B-061) ──

test("shiftEditionPatch: moves every deadline still ahead of the freeze, by the pause", () => {
  const pausedAt = at(-2 * DAY_MS); // paused two days ago
  const ed = edition({
    status: "answering",
    questionsCloseAt: at(-5 * DAY_MS), // already past when the freeze began: history
    answersCloseAt: at(-DAY_MS), // 1 day left at the freeze, now expired
  });
  const patch = shiftEditionPatch(ed, pausedAt, NOW);
  assert.equal(patch.questionsCloseAt, undefined); // untouched
  // The answer window had one day left when the freeze began; it has one day
  // left again now, two days later.
  assert.equal(patch.answersCloseAt.getTime(), at(DAY_MS).getTime());
});

test("shiftEditionPatch: an Edition paused mid-answering resumes with the same days left", () => {
  const pausedAt = at(-30 * DAY_MS);
  const ed = edition({ status: "answering", answersCloseAt: at(-27 * DAY_MS) });
  const patch = shiftEditionPatch(ed, pausedAt, NOW);
  // 3 days left at the freeze, 3 days left at resume, a month later.
  assert.equal(daysLeftUntil(patch.answersCloseAt, NOW), 3);
});

test("shiftPausedInstant: the next Edition's schedule gets the same credit", () => {
  // A Catch-up paused a month before its next Edition is due should not open one
  // the instant it resumes: nextOpensAt moves by the pause, like everything else.
  const nextOpensAt = at(-20 * DAY_MS); // was due 20 days ago, during the freeze
  const shifted = shiftPausedInstant(nextOpensAt, at(-30 * DAY_MS), NOW);
  assert.equal(shifted.getTime(), at(10 * DAY_MS).getTime()); // 10 days out again
});

test("shiftEditionPatch: no freeze stamp means no credit, and no crash", () => {
  const ed = edition({ status: "answering", answersCloseAt: at(DAY_MS) });
  assert.deepEqual(shiftEditionPatch(ed, null, NOW), {});
  assert.deepEqual(shiftEditionPatch(ed, undefined, NOW), {});
  // A clock that went backwards credits nothing rather than pulling deadlines in.
  assert.deepEqual(shiftEditionPatch(ed, at(HOUR_MS), NOW), {});
});

test("shiftEditionPatch: the shifted window re-arms the daily reminder", () => {
  // The bucket held "1 day left" from the last nudge before the pause. After
  // the shift days-left is 3 again, so the bucket differs and the next daily
  // reminder is due -- no extra bookkeeping needed on resume.
  const paused = edition({
    status: "answering",
    answersCloseAt: at(-27 * DAY_MS),
    remindersSent: withDailyBucket(0, 1),
  });
  const patch = shiftEditionPatch(paused, at(-30 * DAY_MS), NOW);
  const resumed = applyPatch(paused, patch);
  const action = planNextAction(resumed, counts(0), NOW);
  assert.equal(action.kind, "reminder");
  assert.equal(action.daysLeft, 3);
});

// ─── cadence math ────────────────────────────────────────────────────────────

test("addCadenceGap: biweekly is exactly 14 days", () => {
  const from = new Date("2026-01-15T00:00:00.000Z");
  assert.equal(addCadenceGap(from, "biweekly").toISOString(), "2026-01-29T00:00:00.000Z");
});

test("addCadenceGap: monthly is one calendar month", () => {
  const from = new Date("2026-01-15T00:00:00.000Z");
  assert.equal(addCadenceGap(from, "monthly").toISOString(), "2026-02-15T00:00:00.000Z");
});

test("C-144: a rhythm anchored on the 31st does not skip a month", () => {
  // setUTCMonth alone overflows: 31 Jan + 1 month asked for 31 February and
  // got 3 March, so a monthly Catch-up skipped February entirely.
  const jan31 = new Date("2027-01-31T10:00:00.000Z");
  const next = addCadenceGap(jan31, "monthly");
  assert.equal(next.getUTCMonth(), 1, "a monthly rhythm skipped February");
  assert.equal(next.toISOString(), "2027-02-28T10:00:00.000Z");
  // A leap year keeps the extra day.
  assert.equal(
    addCadenceGap(new Date("2028-01-31T10:00:00.000Z"), "monthly").toISOString(),
    "2028-02-29T10:00:00.000Z"
  );
  // ...and a 31-day month followed by a 30-day one.
  assert.equal(
    addCadenceGap(new Date("2026-10-31T10:00:00.000Z"), "monthly").toISOString(),
    "2026-11-30T10:00:00.000Z"
  );
  // Quarterly is the same arithmetic three months out.
  assert.equal(
    addCadenceGap(new Date("2026-11-30T10:00:00.000Z"), "quarterly").toISOString(),
    "2027-02-28T10:00:00.000Z"
  );
  // The property behind all four: the day never runs past the month asked for.
  for (let month = 0; month < 12; month++) {
    for (const day of [28, 29, 30, 31]) {
      const from = new Date(Date.UTC(2027, month, 1, 9, 0, 0));
      const last = new Date(Date.UTC(2027, month + 1, 0)).getUTCDate();
      if (day > last) continue;
      from.setUTCDate(day);
      const to = addCadenceGap(from, "monthly");
      assert.equal(to.getUTCMonth(), (month + 1) % 12, `${from.toISOString()} landed in the wrong month`);
      assert.ok(to.getUTCDate() <= day);
      assert.equal(to.getUTCHours(), 9, "the time of day moved");
    }
  }
});

test("addCadenceGap: quarterly is three calendar months", () => {
  const from = new Date("2026-01-15T00:00:00.000Z");
  assert.equal(addCadenceGap(from, "quarterly").toISOString(), "2026-04-15T00:00:00.000Z");
});

// ─── keeper power + labels ───────────────────────────────────────────────────

test("isEffectiveKeeper: creator OR group admin, nobody else", () => {
  assert.equal(isEffectiveKeeper({ viewerId: "u1", createdById: "u1", groupRole: "member" }), true);
  assert.equal(isEffectiveKeeper({ viewerId: "u2", createdById: "u1", groupRole: "admin" }), true);
  assert.equal(isEffectiveKeeper({ viewerId: "u2", createdById: "u1", groupRole: "member" }), false);
  assert.equal(isEffectiveKeeper({ viewerId: null, createdById: "u1", groupRole: "admin" }), false);
});

test("mayChangeCatchupPicture: the Keeper, or ANYONE in a batch", () => {
  const keeper = { viewerId: "u1", createdById: "u1", groupRole: "member" };
  const stranger = { viewerId: "u2", createdById: "u1", groupRole: "member" };

  // A people Catch-up follows the Keeper rule exactly.
  assert.equal(mayChangeCatchupPicture({ ...keeper, batchYear: null }), true);
  assert.equal(mayChangeCatchupPicture({ ...stranger, batchYear: null }), false);
  assert.equal(
    mayChangeCatchupPicture({ viewerId: "u2", createdById: "u1", groupRole: "keeper", batchYear: null }),
    true
  );

  /* A batch Catch-up opens it to everybody, which is his answer to owner
     question 18: "anyone can replace the batch picture". It is the one place
     this feature departs from the accident rule, and it has to: nobody keeps a
     batch Catch-up (`createdById` is null), so a Keeper-only rule would mean
     nobody at all, for ever, on the Catch-ups most members are in. */
  assert.equal(mayChangeCatchupPicture({ ...stranger, batchYear: 2024 }), true);
  assert.equal(
    mayChangeCatchupPicture({ viewerId: "u2", createdById: null, groupRole: "member", batchYear: 1978 }),
    true
  );

  // Signed out is nobody, on either kind.
  assert.equal(mayChangeCatchupPicture({ viewerId: null, createdById: null, groupRole: "member", batchYear: 2024 }), false);
});

test("the two title fallbacks", () => {
  // A Keeper's own title wins on every surface, whitespace does not count as
  // one, and the two differ only in what stands in when there is none: the
  // home says the group's name bare, everywhere else appends the word.
  assert.equal(catchupDisplayName(null, "Batch of 09"), "Batch of 09");
  assert.equal(catchupDisplayName("  ", "Batch of 09"), "Batch of 09");
  assert.equal(catchupDisplayName("Monsoon Notes", "Batch of 09"), "Monsoon Notes");
  assert.equal(catchupSurfaceTitle(null, "Batch of 09"), "Batch of 09 catch-up");
  assert.equal(catchupSurfaceTitle("  ", "Batch of 09"), "Batch of 09 catch-up");
  assert.equal(catchupSurfaceTitle("Monsoon Notes", "Batch of 09"), "Monsoon Notes");
});

test("describeEditionStatus: readable per-status copy", () => {
  assert.equal(
    editionCountdownLabel({ status: "collecting", questionsCloseAt: at(3 * DAY_MS) }, NOW),
    "3 days left"
  );
  /* A deadline 24 hours out is TOMORROW's, not today's: this asserted "last
     day" until C-031, which is the day-early claim that started the whole
     disagreement. "last day" now means the valley day the Edition closes on. */
  assert.equal(
    editionCountdownLabel({ status: "answering", answersCloseAt: at(DAY_MS) }, NOW),
    "closes tomorrow"
  );
  assert.equal(
    editionCountdownLabel({ status: "answering", answersCloseAt: at(2 * 3_600_000) }, NOW),
    "last day"
  );
  assert.equal(editionCountdownLabel({ status: "published" }, NOW), null);
  assert.equal(
    describeEditionStatus({ status: "answering", answersCloseAt: at(3 * DAY_MS) }, NOW),
    "Answering now, 3 days left"
  );
  /* No number, on purpose: `roundLabel()` was deleted in the Edition rename
     (2026-09-08) rather than renamed, because an Edition is identified by its
     date. If this ever reads "Edition 5 published" again, the rule has been
     lost. */
  assert.equal(describeEditionStatus({ status: "published" }, NOW), "Published");
});

/* ── the list's one line under a Catch-up's name (build phase 6) ───── */

/** The two real formatters, so the copy asserted here is the copy that ships. */
const FMT = { dayAndDate: formatDayAndDate, longDate: formatDisplayDateLong };

test("catchupStageLine: the Catch-up's own state outranks the Edition's", () => {
  const live = { status: "answering", answersCloseAt: at(3 * DAY_MS) };
  /* A paused Catch-up with a live Edition inside it reads as paused, and a
     card never says two things at once. */
  assert.equal(catchupStageLine("paused", live, FMT), "Paused");
  /* No date after "Ended": nothing records when a Catch-up ended, and
     inventing a column for one line on one card is a migration. */
  assert.equal(catchupStageLine("ended", live, FMT), "Ended");
});

test("catchupStageLine: a stage, in words, and never a number", () => {
  assert.equal(catchupStageLine("active", { status: "collecting" }, FMT), "Open for questions");
  assert.equal(
    catchupStageLine("active", { status: "answering", answersCloseAt: "2026-08-20T01:30:00.000Z" }, FMT),
    "Answers close Thursday 20 August"
  );
  assert.equal(
    catchupStageLine("active", { status: "published", publishedAt: "2026-08-15T01:30:00.000Z" }, FMT),
    "Out 15 August 2026"
  );
});

test("catchupStageLine: a countdown belongs on the page you are already on", () => {
  /* describeEditionStatus answers "where is this Edition in the machine" for
     the console and the admin room; this answers "what is this Catch-up
     doing" for somebody choosing which card to open. If this line ever gains
     "3 days left", the two have collapsed back into one. */
  const line = catchupStageLine("active", { status: "answering", answersCloseAt: at(3 * DAY_MS) }, FMT);
  assert.ok(!/left|tomorrow|last day/.test(line), line);
});

test("catchupStageLine: every state has a line, including the ones nothing reaches", () => {
  assert.equal(catchupStageLine("active", null, FMT), "No Editions yet");
  assert.equal(catchupStageLine("active", { status: "draft" }, FMT), "Not open yet");
  /* Missing timestamps must not print "Answers close undefined". */
  assert.equal(catchupStageLine("active", { status: "answering" }, FMT), "Open for answers");
  assert.equal(catchupStageLine("active", { status: "published" }, FMT), "Out now");
});

// ─── resolveSpotify: host/path allowlist + fail-soft (stubbed fetch) ─────────

const okFetch = async () => ({
  ok: true,
  json: async () => ({ title: "Nightcall", thumbnail_url: "https://i.scdn.co/image/abc" }),
});
const throwFetch = async () => {
  throw new Error("network down");
};
const notOkFetch = async () => ({ ok: false, json: async () => ({}) });

test("resolveSpotify: rejects a non-Spotify host", async () => {
  const r = await resolveSpotify("https://evil.example.com/track/abc", { fetchImpl: throwFetch });
  assert.equal(r.ok, false);
});

test("resolveSpotify: rejects non-https", async () => {
  const r = await resolveSpotify("http://open.spotify.com/track/abc", { fetchImpl: throwFetch });
  assert.equal(r.ok, false);
});

test("resolveSpotify: rejects a non track/album/playlist path", async () => {
  const r = await resolveSpotify("https://open.spotify.com/user/someone", { fetchImpl: throwFetch });
  assert.equal(r.ok, false);
});

test("resolveSpotify: rejects garbage that is not a URL", async () => {
  const r = await resolveSpotify("not a link", { fetchImpl: throwFetch });
  assert.equal(r.ok, false);
});

test("resolveSpotify: rejects an empty string", async () => {
  const r = await resolveSpotify("", { fetchImpl: throwFetch });
  assert.equal(r.ok, false);
});

test("resolveSpotify: resolves a track and normalizes the URL (strips tracking query)", async () => {
  const r = await resolveSpotify("https://open.spotify.com/track/abc123?si=deadbeef", { fetchImpl: okFetch });
  assert.equal(r.ok, true);
  assert.equal(r.songUrl, "https://open.spotify.com/track/abc123");
  assert.equal(r.songTitle, "Nightcall");
  assert.equal(r.songArt, "https://i.scdn.co/image/abc");
});

test("resolveSpotify: accepts album and playlist paths", async () => {
  assert.equal((await resolveSpotify("https://open.spotify.com/album/xyz", { fetchImpl: okFetch })).ok, true);
  assert.equal((await resolveSpotify("https://open.spotify.com/playlist/xyz", { fetchImpl: okFetch })).ok, true);
});

test("resolveSpotify: accepts an intl-prefixed link and normalizes it", async () => {
  const r = await resolveSpotify("https://open.spotify.com/intl-de/track/abc123", { fetchImpl: okFetch });
  assert.equal(r.ok, true);
  assert.equal(r.songUrl, "https://open.spotify.com/track/abc123");
});

test("resolveSpotify: fails soft when the oembed fetch throws (still stores the link)", async () => {
  const r = await resolveSpotify("https://open.spotify.com/track/abc123", { fetchImpl: throwFetch });
  assert.equal(r.ok, true);
  assert.equal(r.songUrl, "https://open.spotify.com/track/abc123");
  assert.equal(r.songTitle, "https://open.spotify.com/track/abc123");
  assert.equal(r.songArt, null);
});

test("resolveSpotify: fails soft on a non-200 oembed response", async () => {
  const r = await resolveSpotify("https://open.spotify.com/track/abc123", { fetchImpl: notOkFetch });
  assert.equal(r.ok, true);
  assert.equal(r.songArt, null);
});

// ─── P2021 guard ─────────────────────────────────────────────────────────────

test("isMissingCatchupTable: true for P2021 / 42P01 / scoped message, false otherwise", () => {
  assert.equal(isMissingCatchupTable({ code: "P2021" }), true);
  assert.equal(isMissingCatchupTable({ code: "42P01" }), true);
  assert.equal(isMissingCatchupTable(new Error("The table `public.Catchup` does not exist")), true);
  assert.equal(isMissingCatchupTable({ code: "P2002" }), false);
  assert.equal(isMissingCatchupTable(new Error("something else broke")), false);
  assert.equal(isMissingCatchupTable(null), false);
  assert.equal(isMissingCatchupTable(undefined), false);
});

// ─── the question library (spec section 4) ───────────────────────────────────

test("CATCHUP_PROMPT_SETS: the five live sets, every prompt non-empty, no em dashes", () => {
  // Rewritten 2026-07-25; this assertion is the record of what the library IS,
  // so a future rewrite that forgets to bring the validators along fails here
  // rather than in front of a member. (It did exactly that once: see the next
  // test.) Counts are deliberately loose, because the owner may add or cut a
  // question without that being a regression.
  assert.deepEqual(
    CATCHUP_PROMPT_SETS.map((s) => s.id),
    ["right-now", "small-things", "the-valley", "photo-wall", "songs"]
  );
  for (const set of CATCHUP_PROMPT_SETS) {
    assert.ok(set.label.trim().length > 0, `set ${set.id} has no label`);
    assert.ok(set.prompts.length > 0, `set ${set.id} has no prompts`);
    for (const prompt of set.prompts) {
      assert.ok(prompt.trim().length > 0, `empty prompt in ${set.id}`);
      assert.ok(!prompt.includes("—"), `em dash found in prompt: ${prompt}`);
    }
  }
});

test("every library set id is an accepted PromptCategory (the 2026-08-05 bug)", () => {
  // The regression this exists for: the library was rewritten and the server's
  // category validator was not, so picking anything from "Back then", "A photo
  // from everyone" or "Songs from everyone" was refused with a raw Zod error
  // ("Invalid option: expected one of valley-days|..."). PROMPT_CATEGORIES is
  // now the single list every validator builds from; this proves the library
  // cannot drift out of it again.
  for (const set of CATCHUP_PROMPT_SETS) {
    assert.ok(
      PROMPT_CATEGORIES.includes(set.id),
      `library set "${set.id}" is not in PROMPT_CATEGORIES, so submitting it would be rejected`
    );
  }
});

/* --- Who a question says asked it (audit M10) ----------------------------- */

test("a named question shows its asker to everybody", () => {
  const p = { showAsker: true, authorId: "asha" };
  assert.equal(askerVisible(p, "asha"), true);
  assert.equal(askerVisible(p, "someone-else"), true);
  assert.equal(askerVisible(p, null), true);
});

test("an anonymous question shows its asker to nobody but the asker", () => {
  const p = { showAsker: false, authorId: "asha" };
  assert.equal(askerVisible(p, "asha"), true, "the author already knows who they are");
  assert.equal(askerVisible(p, "someone-else"), false);
  // The one that was wrong: a Keeper is somebody else. There is no role
  // argument here at all, which is the point -- the rule cannot grow an
  // exception without this signature changing.
  assert.equal(askerVisible(p, "the-keeper"), false);
  assert.equal(askerVisible(p, null), false);
});

test("an anonymous question whose asker deleted their account stays anonymous", () => {
  assert.equal(askerVisible({ showAsker: false, authorId: null }, "anyone"), false);
  // ...and a signed-out reader cannot become the author by both being null.
  assert.equal(askerVisible({ showAsker: false, authorId: null }, null), false);
});

/* The rule above was already right, and a renderer disagreed with it anyway.
 * The home page's inline published Edition declared `const askerVisible =
 * p.showAsker || isKeeper` INSIDE its map, which shadowed the imported helper,
 * so the same Edition named its anonymous askers to a Keeper on one page and hid
 * them on the other (audit C-019). A behavioural test of the helper cannot see
 * that; only a sweep of the renderers can.
 *
 * The three surfaces are .tsx, which node:test cannot load, so this reads
 * them. It is deliberately about the SHAPE and not the wording: any surface
 * that hands an `asker` to a view must get the answer from the one helper. */

const CATCHUP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* Files that DECIDE an asker, not files that merely declare the field: a
   ternary or a guard on the right of `asker:`. A type declaration reads
   `asker: AnswerAsker | null;` and has nothing to get wrong. */
const askerSurfaces = execSync(
  "git grep -l 'asker:' -- src/app src/components ':!*.test.*'",
  { cwd: resolve(CATCHUP_ROOT, ".."), encoding: "utf8" }
)
  .split("\n")
  .filter(Boolean)
  .map((f) => [f, decomment(readFileSync(resolve(CATCHUP_ROOT, "..", f), "utf8"))])
  .filter(([, src]) => /asker:[\s\S]{0,200}?[?]|asker:[^\n]*&&/.test(src));

test("every surface that names an asker asks the one helper", () => {
  assert.ok(askerSurfaces.length > 0, "nothing renders an asker; retarget this test");
  for (const [f, src] of askerSurfaces) {
    assert.ok(
      /askerVisible\(/.test(src),
      `${f} decides who asked without askerVisible()`
    );
    // The exact shape that came back: a local binding of the same name, which
    // shadows the import and silently wins.
    assert.ok(
      !/const\s+askerVisible\s*=/.test(src),
      `${f} shadows the askerVisible helper with a local rule`
    );
    // And the exception itself, however it is spelled.
    assert.ok(
      !/showAsker\s*\|\|\s*\w*[Kk]eeper/.test(src),
      `${f} grants a Keeper an exception to anonymity`
    );
  }
});

/* ------------------------------------------------------------------ *
 *  C-141 / C-031: every surface names the same last day.
 *
 *  Three surfaces printed the same deadline from two different
 *  arithmetics -- the index card, the masthead and the bell counted
 *  24-hour blocks, the answer page counted IST calendar days -- so with
 *  an Edition closing at 07:30 IST the bell said "Last day to answer" from
 *  half past seven the MORNING BEFORE, one tap away from a page saying
 *  "Answers close tomorrow".
 * ------------------------------------------------------------------ */

/** 07:30 IST is where the 02:00 UTC cron puts a close; the old count
 *  crossed there, and the valley's day crosses at IST midnight. */
const CLOSE = new Date("2026-06-15T02:00:00.000Z"); // 07:30 IST on the 15th
const iso = (s) => new Date(s);

test("C-141: the countdown, the page sentence and the bell agree, hour by hour", () => {
  // Every hour of the four days running up to the close.
  for (let h = 1; h <= 96; h++) {
    const now = new Date(CLOSE.getTime() - h * 3_600_000);
    const days = valleyDaysLeft(CLOSE, now);
    const label = editionCountdownLabel({ status: "answering", answersCloseAt: CLOSE }, now);
    const page = answersCloseSentence(CLOSE, now);
    const bell = answerReminderMessage("Batch of '23", CLOSE, now);

    if (days === 0) {
      assert.equal(label, "last day", `${now.toISOString()}`);
      assert.equal(page, "Answers close today.");
      assert.match(bell, /^Last day to answer/);
    } else if (days === 1) {
      assert.equal(label, "closes tomorrow");
      assert.equal(page, "Answers close tomorrow.");
      assert.match(bell, /^Answers close tomorrow/);
    } else {
      assert.equal(label, `${days} days left`);
      assert.equal(page, `Answers close in ${days} days.`);
      assert.match(bell, new RegExp(`^${days} days left`));
    }
  }
});

test("C-031: 'last day' means the day it closes, not the day before", () => {
  // 07:31 IST on the 14th: 24 hours out. The old arithmetic said "last day".
  assert.equal(valleyDaysLeft(CLOSE, iso("2026-06-14T02:01:00.000Z")), 1);
  assert.equal(
    editionCountdownLabel({ status: "answering", answersCloseAt: CLOSE }, iso("2026-06-14T02:01:00.000Z")),
    "closes tomorrow"
  );
  // 00:30 IST on the 15th (19:00 UTC on the 14th) is the last day, and every
  // surface now says so -- the old count still called it 1, which it rendered
  // as "last day" too, but only by accident of the same threshold.
  const justAfterValleyMidnight = iso("2026-06-14T19:00:00.000Z");
  assert.equal(valleyDaysLeft(CLOSE, justAfterValleyMidnight), 0);
  assert.equal(answersCloseSentence(CLOSE, justAfterValleyMidnight), "Answers close today.");
  // Past it: a transition, not a countdown.
  assert.equal(valleyDaysLeft(CLOSE, iso("2026-06-15T03:00:00.000Z")), null);
  assert.equal(answersCloseSentence(CLOSE, iso("2026-06-15T03:00:00.000Z")), "Answers are closing.");
});

test("C-141: the reminder BUCKET still counts 24-hour blocks", () => {
  // Deliberate: daysLeftUntil keys the once-a-day bucket and decides who a
  // "last day only" member is. Changing the sentence must not re-time a
  // single nudge, so this is the one count that stays a duration.
  assert.equal(daysLeftUntil(CLOSE, iso("2026-06-14T02:01:00.000Z")), 1);
  assert.equal(valleyDaysLeft(CLOSE, iso("2026-06-14T02:01:00.000Z")), 1);
  // ...and they genuinely differ, which is why this test exists.
  assert.equal(daysLeftUntil(CLOSE, iso("2026-06-13T19:00:00.000Z")), 2);
  assert.equal(valleyDaysLeft(CLOSE, iso("2026-06-13T19:00:00.000Z")), 1);
});

test("C-141: nothing prints a countdown from a raw millisecond gap any more", () => {
  // The answer page and the bell both take their words from the shared pair.
  assert.match(
    read("src/app/(main)/catchups/[catchupId]/answer/page.tsx"),
    /return answersCloseSentence\(at, new Date\(\)\);/
  );
  assert.match(read("src/lib/catchups-notify.ts"), /answerReminderMessage\(ctx\.groupName, ctx\.closesAt/);
  // ...and the deadline actually reaches the bell.
  assert.match(read("src/lib/catchups.ts"), /closesAt: before\.answersCloseAt,/);
});

test("C-182: a photo removed mid-upload is not resurrected when the upload lands", () => {
  /* `handleFiles` closes over the `images` prop as it was when the picker
     returned, and awaits an upload. Remove a photo in that window -- the
     Remove button stays live, deliberately -- and the completion used to
     spread the STALE list back over the parent, putting the removed photo
     back and autosaving it to the row.

     Structural, because the bug is which binding is read after an await, and
     that is not observable from the component's rendered output. */
  const src = readFileSync(
    resolve(CATCHUP_ROOT, "components/catchups/answer/photo-attachments.tsx"),
    "utf8"
  );
  const fn = src.slice(src.indexOf("async function handleFiles"));
  const body = fn.slice(0, fn.indexOf("\n  }\n"));
  assert.match(
    body,
    /onChange\(\[\.\.\.imagesRef\.current,/,
    "the post-upload onChange reads the captured prop, not the freshest one"
  );
  assert.doesNotMatch(
    body,
    /onChange\(\[\.\.\.images,/,
    "the stale closure is back"
  );
  assert.match(
    src,
    /imagesRef\.current = images;/,
    "nothing keeps the ref in step with the prop"
  );
});
