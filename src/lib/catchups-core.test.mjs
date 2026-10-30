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
  isEditionRunning,
  RUNNING_EDITION_WHERE,
  answerReminderMessage,
  valleyDaysLeft,
  addDays,
  deadlineIn,
  snapToDeadlineHour,
  catchupDisplayName,
  overdueEditionWhere,
  catchupSurfaceTitle,
  isEffectiveKeeper,
  mayChangeCatchupPicture,
  editionCountdownLabel,
  describeEditionStatus,
  catchupStageLine,
  isMissingCatchupTable,
  CATCHUP_PROMPT_SETS,
  dailyBucket,
  withDailyBucket,
  daysLeftUntil,
  TICK_GRACE_MS,
  extendPhasePatch,
  planExtension,
  REMINDER_QUESTIONS_EXTENDED,
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

test("planNextAction: answering -> published fires published, and books nothing", () => {
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
  // There is no rhythm (2026-10-17): coming out leaves the Catch-up idle, and
  // the next Edition starts when somebody starts it.
  assert.equal("setsNextOpensAt" in a, false, "publishing books the next Edition again");
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

test("T3-06: two taps carrying the same seen deadline add one extension, and the second is refused", () => {
  /* Every tap on "A week" added a week: the swap compared the row with the
     value the action had just read itself. It swaps on the page's date now. */
  const closes = at(5 * DAY_MS);
  let ed = edition({ status: "answering", answersCloseAt: closes });
  const first = planExtension(ed, 7, closes.toISOString(), NOW);
  assert.equal(first.ok, true);
  assert.equal(first.deadline.getTime(), closes.getTime(), "the write would not swap on the date the page showed");
  assert.equal(first.closesAt.getTime(), deadlineIn(closes, 7).getTime());
  ed = applyPatch(ed, first.patch);
  assert.deepEqual(planExtension(ed, 7, closes.toISOString(), NOW), { ok: false, reason: "moved" });
  // A page showing the new date may push again: that is a second, deliberate act.
  assert.equal(planExtension(ed, 7, ed.answersCloseAt, NOW).ok, true);
  assert.deepEqual(planExtension(edition({ status: "published" }), 7, closes, NOW), { ok: false, reason: "closed" });
});

test("T3-06: each window swaps on its own deadline", () => {
  const q = at(2 * DAY_MS);
  const plan = planExtension(edition({ status: "collecting", questionsCloseAt: q }), 3, q, NOW);
  assert.equal(plan.ok, true);
  assert.equal(plan.patch.answersCloseAt, undefined);
  assert.equal(plan.closesAt.getTime(), deadlineIn(q, 3).getTime());
  // A page drawn while collecting cannot push the answers once the clock has opened them.
  const opened = edition({ status: "answering", questionsCloseAt: q, answersCloseAt: at(9 * DAY_MS) });
  assert.deepEqual(planExtension(opened, 3, q, NOW), { ok: false, reason: "moved" });
});

test("C3-01: the offered three days never land earlier than the deadline they replace", () => {
  /* "Close and send it out" with no answers moved the deadline to three days
     from NOW, so a press in a week's first days cut up to four of its seven
     (C3's /tmp run lost three). The offer that replaced it comes through planExtension:
     three days from the deadline, or from now once that has passed, and the
     clock's own one-off zero-answer extension is left for the deadline. */
  const opened = new Date("2026-10-19T01:30:00Z"); // a Monday, 07:00 IST
  const weekOut = deadlineIn(opened, 7);
  const ed = edition({ status: "answering", answersCloseAt: weekOut });
  for (const pressed of ["2026-10-19T13:00:00Z", "2026-10-22T09:00:00Z", "2026-10-26T03:00:00Z"]) {
    const now = new Date(pressed);
    const plan = planExtension(ed, 3, weekOut.toISOString(), now);
    assert.equal(plan.ok, true);
    assert.ok(plan.closesAt.getTime() > weekOut.getTime(), `a press at ${pressed} moved the deadline earlier`);
    assert.equal(
      plan.closesAt.getTime(),
      deadlineIn(new Date(Math.max(weekOut.getTime(), now.getTime())), 3).getTime()
    );
    assert.equal(plan.patch.remindersSent & REMINDER_EXTENDED, 0, "the hand extension spent the clock's safety net");
  }
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

test("planNextAction: a question window closing with no questions extends once, silently, not opens", () => {
  let ed = edition({ status: "collecting", questionsCloseAt: at(-HOUR_MS), remindersSent: 0 });

  const a1 = planNextAction(ed, counts(0, 0), NOW);
  assert.equal(a1.kind, "extend-questions");
  // No bell (2026-10-17): it used to tell everyone again, a third bell for
  // people who had not taken part. His budget is two: it started, it is out.
  assert.equal("notify" in a1, false, "the empty-window extension rings a bell again");
  assert.equal(a1.patch.questionsCloseAt.getTime(), deadlineIn(NOW, 3).getTime());
  assert.equal(a1.patch.remindersSent & REMINDER_QUESTIONS_EXTENDED, REMINDER_QUESTIONS_EXTENDED);
  // Crucially it did NOT open answering, which would have invited the whole
  // group to answer nothing.
  assert.notEqual(a1.kind, "transition");

  ed = applyPatch(ed, a1.patch);
  assert.equal(planNextAction(ed, counts(0, 0), NOW).kind, "none"); // window is future again
});

test("planNextAction: after its one extension a still-empty Edition fizzles, once, and then nothing", () => {
  const ed = edition({
    status: "collecting",
    questionsCloseAt: at(-HOUR_MS),
    remindersSent: REMINDER_QUESTIONS_EXTENDED,
  });
  // Not a transition, not an extension, not a reminder: the deadline goes,
  // which is what makes it idle (2026-10-17).
  const a = planNextAction(ed, counts(0, 0), NOW);
  assert.equal(a.kind, "fizzle");
  assert.equal(a.patch.questionsCloseAt, null);
  assert.equal("notify" in a, false, "fizzling tells somebody; nothing happened anybody can act on");
  const fizzled = applyPatch(ed, a.patch);
  assert.equal(isEditionRunning(fizzled), false);
  // And nothing at all a month later -- this is what stops the abandoned-
  // Catch-up loop (open empty -> nudge daily -> publish empty -> repeat).
  assert.equal(planNextAction(fizzled, counts(0, 0), at(30 * DAY_MS)).kind, "none");
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

// ─── idle or running (2026-10-17: Editions start by hand) ────────────────────
/* The pause arithmetic (shiftEditionPatch, shiftPausedInstant) and the rhythm
   arithmetic (addCadenceGap, and C-144's month clamp under it) were tested
   here. Both went with the rhythm; there is nothing to hold and nothing to
   book. What replaced them is one question: is anything running? */

test("isEditionRunning: answering runs; out, sealed and draft do not", () => {
  assert.equal(isEditionRunning(edition({ status: "answering", answersCloseAt: at(DAY_MS) })), true);
  assert.equal(isEditionRunning(edition({ status: "published" })), false);
  assert.equal(isEditionRunning(edition({ status: "sealed" })), false);
  assert.equal(isEditionRunning(edition({ status: "draft" })), false);
});

test("isEditionRunning: a collecting row runs exactly when it has a question deadline", () => {
  // A batch's first Edition, made at ten members and told to nobody, and a
  // fizzled one: both have no deadline, both idle, whatever is in them.
  assert.equal(isEditionRunning(edition({ status: "collecting", questionsCloseAt: null })), false);
  // An open window, and one that has just closed: the clock is about to move
  // it on (answering, the silent extension, or the fizzle), so it still runs
  // and nobody may start a second Edition on top of it.
  assert.equal(isEditionRunning(edition({ status: "collecting", questionsCloseAt: at(DAY_MS) })), true);
  assert.equal(isEditionRunning(edition({ status: "collecting", questionsCloseAt: at(-HOUR_MS) })), true);
});

test("T2a-07: the running-Edition where says what isEditionRunning says, on every status and deadline", () => {
  /* Ending a Catch-up asks the database this question, in the same statement
     as the write; the screens ask the predicate. Read the where clause by
     hand over the grid, so the two cannot drift apart. */
  const holds = (clause, row) =>
    Object.entries(clause).every(([key, want]) =>
      want && typeof want === "object" && "not" in want ? row[key] !== want.not : row[key] === want
    );
  for (const status of ["draft", "collecting", "answering", "sealed", "published"]) {
    for (const questionsCloseAt of [null, at(DAY_MS), at(-HOUR_MS)]) {
      const row = edition({ status, questionsCloseAt });
      assert.equal(
        RUNNING_EDITION_WHERE.OR.some((clause) => holds(clause, row)),
        isEditionRunning(row),
        `${status} with ${questionsCloseAt ? "a" : "no"} question deadline`
      );
    }
  }
});

test("the clock never touches an idle Edition, and leaves every closed-empty one idle in the end", () => {
  /* The two sides of one rule, over a grid: idle (no deadline) means the
     clock has nothing to do, at any time, with any question count; and a
     window that closes empty is extended once and then fizzled, never left
     running with nothing in it. Pinned together so the predicate and the
     plan cannot drift apart (simplify review, 2026-10-17). */
  for (const offset of [-30 * DAY_MS, -HOUR_MS, 0, HOUR_MS, 30 * DAY_MS]) {
    for (const bits of [0, REMINDER_QUESTIONS_EXTENDED]) {
      for (const prompts of [0, 1, 5]) {
        const idle = edition({ status: "collecting", questionsCloseAt: null, remindersSent: bits });
        assert.equal(planNextAction(idle, counts(0, prompts), at(offset)).kind, "none");
      }
    }
  }
  let ed = edition({ status: "collecting", questionsCloseAt: at(-HOUR_MS), remindersSent: 0 });
  for (let step = 0; step < 4 && isEditionRunning(ed); step += 1) {
    const a = planNextAction(ed, counts(0, 0), at(step * 4 * DAY_MS));
    assert.notEqual(a.kind, "transition", "an empty Edition opened for answers");
    if (a.kind === "none") break;
    ed = applyPatch(ed, a.patch);
  }
  assert.equal(isEditionRunning(ed), false, "a twice-empty Edition is still running");
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
  const live = { status: "answering", answersCloseAt: "2026-08-20T01:30:00.000Z" };
  /* A legacy paused row runs like any other since 2026-10-17, so it says what
     its Edition is doing. Nothing pauses a Catch-up any more. */
  assert.equal(catchupStageLine("paused", live, FMT), "Answers close Thursday 20 August");
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

test("catchupStageLine: an idle collecting row is not open for questions", () => {
  /* A batch's never-started first Edition, and one that fizzled. There is no
     box to ask in until somebody presses Start, and the card says so in the
     same words the home's idle card uses. */
  assert.equal(
    catchupStageLine("active", { status: "collecting", questionsCloseAt: null, number: 1 }, FMT),
    "No Editions yet"
  );
  assert.equal(
    catchupStageLine("active", { status: "collecting", questionsCloseAt: null, number: 3 }, FMT),
    "Nothing running"
  );
  assert.equal(
    catchupStageLine("active", { status: "collecting", questionsCloseAt: at(DAY_MS), number: 3 }, FMT),
    "Open for questions"
  );
  // A caller that did not select the deadline cannot make a running row idle.
  assert.equal(catchupStageLine("active", { status: "collecting" }, FMT), "Open for questions");
});

test("catchupStageLine: every state has a line, including the ones nothing reaches", () => {
  assert.equal(catchupStageLine("active", null, FMT), "No Editions yet");
  assert.equal(catchupStageLine("active", { status: "draft" }, FMT), "Not open yet");
  /* Missing timestamps must not print "Answers close undefined". */
  assert.equal(catchupStageLine("active", { status: "answering" }, FMT), "Open for answers");
  assert.equal(catchupStageLine("active", { status: "published" }, FMT), "Out now");
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
   `asker: AnswerAsker | null;` and has nothing to get wrong.

   THE MATCH STOPS AT A `;` OR A NEWLINE, which is what "on the right of
   `asker:`" means and what this used to only approximate. It scanned 200
   characters ahead for any `?`, so a props type written
   `{ asker: ReaderAsker; className?: string }` was read as a decision because
   of the OTHER field's optional marker -- and then any ternary later in the
   file kept it flagged. A real decider has no `;` between the colon and its
   `?` (`asker: reveal && p.author ? toPersonRef(p.author) : null,`), so
   nothing this test is for stops being caught. */
const askerSurfaces = execSync(
  "git grep -l 'asker:' -- src/app src/components ':!*.test.*'",
  { cwd: resolve(CATCHUP_ROOT, ".."), encoding: "utf8" }
)
  .split("\n")
  .filter(Boolean)
  .map((f) => [f, decomment(readFileSync(resolve(CATCHUP_ROOT, "..", f), "utf8"))])
  .filter(([, src]) => /asker:[^;\n]{0,200}?[?]|asker:[^\n]*&&/.test(src));

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
    const bell = answerReminderMessage("Batch of '23", CLOSE, now);

    if (days === 0) {
      assert.equal(label, "last day", `${now.toISOString()}`);
      assert.match(bell, /^Last day to answer/);
    } else if (days === 1) {
      assert.equal(label, "closes tomorrow");
      assert.match(bell, /^Answers close tomorrow/);
    } else {
      assert.equal(label, `${days} days left`);
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
  /* Said through the bell, which is the only countdown left in the app: the
     answering page's own sentence went with build phase 7, when answering
     moved onto the home and the deadline there became a date. */
  assert.match(
    answerReminderMessage("Batch of '23", CLOSE, justAfterValleyMidnight),
    /^Last day to answer/
  );
  // Past it: a transition, not a countdown.
  assert.equal(valleyDaysLeft(CLOSE, iso("2026-06-15T03:00:00.000Z")), null);
  assert.equal(
    editionCountdownLabel({ status: "answering", answersCloseAt: CLOSE }, iso("2026-06-15T03:00:00.000Z")),
    "closing"
  );
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
  /* There is ONE countdown left in the app, and it is the bell's. The
     answering page had the other one; build phase 7 moved answering onto the
     Catch-up's home, where the deadline is a DATE rather than a count of days
     ("Answers close Thursday 20 August"), so the two surfaces C-141 caught
     disagreeing can no longer phrase the same instant two ways. */
  assert.match(read("src/lib/catchups-notify.ts"), /answerReminderMessage\(ctx\.catchupName, ctx\.closesAt/);
  // ...and the deadline actually reaches the bell.
  assert.match(read("src/lib/catchups.ts"), /closesAt: before\.answersCloseAt,/);
  /* The home's line comes off the same column, through the one helper, so it
     cannot start counting for itself. */
  const home = read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx");
  assert.match(home, /homeStateLine\(/, "the home no longer uses the shared state-line helper");
  assert.ok(
    !/answersCloseSentence/.test(home),
    "the deleted countdown sentence is back on the answering surface"
  );
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

test("the admin's past-its-date list leaves out an ended Catch-up and a fizzled Edition", () => {
  /* Owner, 2026-09-15, about a paused Catch-up on his worklist: "it's paused.
     let it be paused wtf should I do". A frozen clock and an Edition nobody
     asked anything in are both working as designed, and neither has a fix.
     Only ENDED freezes since 2026-10-17; a legacy paused row runs, so if it
     is past its date it is genuinely stuck. */
  const now = new Date("2026-09-15T12:00:00Z");
  const [collecting, answering, sealed] = overdueEditionWhere(now).OR;
  assert.deepEqual(collecting.catchup, { status: { not: "ended" } });
  assert.deepEqual(collecting.prompts, { some: {} });
  assert.deepEqual(answering.catchup, { status: { not: "ended" } });
  // A time capsule opens on its date whatever the Catch-up is doing.
  assert.equal(sealed.catchup, undefined);
  for (const clause of [collecting, answering, sealed]) {
    const deadline = clause.questionsCloseAt ?? clause.answersCloseAt ?? clause.publishAt;
    assert.equal(deadline.lt, now);
  }
});
