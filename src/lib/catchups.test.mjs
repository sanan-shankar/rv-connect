/* ------------------------------------------------------------------ *
 *  Unit tests for the pure Catch-ups engine. NO database, NO network.
 *
 *  Run: node --test src/lib/catchups.test.mjs
 *
 *  These exercise the state machine at every boundary, the reminder
 *  bitmask + auto-extend-once idempotency, cadence math, the Spotify
 *  resolver (with a stubbed fetch), and the P2021 guard. They import the
 *  real functions from catchups.ts; Node strips its type-only imports, so
 *  the impure drivers (which load prisma lazily) are never touched here.
 * ------------------------------------------------------------------ */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DAY_MS,
  HOUR_MS,
  REMINDER_TWO_DAYS,
  REMINDER_LAST_DAY,
  REMINDER_EXTENDED,
  computeStatus,
  nextEditionStatus,
  planNextAction,
  addCadenceGap,
  addDays,
  roundLabel,
  catchupTitle,
  isEffectiveKeeper,
  editionCountdownLabel,
  describeEditionStatus,
  resolveSpotify,
  isMissingCatchupTable,
  suggestSeedPrompts,
  CATCHUP_PROMPT_SETS,
} from "./catchups.ts";

// A fixed clock so every case is deterministic.
const NOW = new Date("2026-03-01T12:00:00.000Z");
const at = (offsetMs) => new Date(NOW.getTime() + offsetMs);

/** Build an EditionTiming with sensible defaults. */
function edition(overrides = {}) {
  return {
    status: "collecting",
    questionsCloseAt: null,
    answersCloseAt: null,
    publishAt: null,
    publishedAt: null,
    remindersSent: 0,
    ...overrides,
  };
}

/** Apply a plan's patch the way the DB would, so we can re-plan and assert idempotency. */
const applyPatch = (ed, patch) => ({ ...ed, ...patch });

// ─── computeStatus: forward-only boundaries ──────────────────────────────────

test("computeStatus: draft never advances by the clock", () => {
  const ed = edition({
    status: "draft",
    questionsCloseAt: at(-DAY_MS),
    answersCloseAt: at(-DAY_MS),
    publishAt: at(-DAY_MS),
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

test("computeStatus: collecting cannot skip past answering when the later close is not set", () => {
  // questionsCloseAt passed but answersCloseAt is still null (the normal case): stop at answering.
  assert.equal(
    computeStatus(edition({ status: "collecting", questionsCloseAt: at(-DAY_MS), answersCloseAt: null }), NOW),
    "answering"
  );
});

test("computeStatus: answering holds until answersCloseAt, then preparing", () => {
  assert.equal(computeStatus(edition({ status: "answering", answersCloseAt: at(DAY_MS) }), NOW), "answering");
  assert.equal(computeStatus(edition({ status: "answering", answersCloseAt: at(-1) }), NOW), "preparing");
});

test("computeStatus: preparing holds until publishAt, then published", () => {
  assert.equal(computeStatus(edition({ status: "preparing", publishAt: at(HOUR_MS) }), NOW), "preparing");
  assert.equal(computeStatus(edition({ status: "preparing", publishAt: at(-1) }), NOW), "published");
});

test("computeStatus: a very stale collecting Round cascades all the way to published", () => {
  const ed = edition({
    status: "collecting",
    questionsCloseAt: at(-3 * DAY_MS),
    answersCloseAt: at(-2 * DAY_MS),
    publishAt: at(-DAY_MS),
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
  const a1 = planNextAction(ed, 0, NOW);
  assert.equal(a1.kind, "transition");
  assert.equal(a1.to, "answering");
  assert.equal(a1.notify, "catchup_answers_open");
  assert.ok(a1.patch.answersCloseAt instanceof Date);
  assert.equal(a1.patch.answersCloseAt.getTime(), addDays(NOW, 7).getTime());

  ed = applyPatch(ed, a1.patch); // the DB flip
  assert.equal(planNextAction(ed, 0, NOW).kind, "none"); // idempotent
});

test("planNextAction: preparing -> published fires published + schedules the next Round", () => {
  const ed = edition({ status: "preparing", publishAt: at(-1000) });
  const a = planNextAction(ed, 5, NOW);
  assert.equal(a.kind, "transition");
  assert.equal(a.to, "published");
  assert.equal(a.notify, "catchup_published");
  assert.equal(a.setsNextOpensAt, true);
  assert.ok(a.patch.publishedAt instanceof Date);
});

test("planNextAction: answering -> preparing with answers present proceeds (no extend, no notify)", () => {
  const ed = edition({ status: "answering", answersCloseAt: at(-HOUR_MS) });
  const a = planNextAction(ed, 2, NOW);
  assert.equal(a.kind, "transition");
  assert.equal(a.to, "preparing");
  assert.equal(a.notify, null);
  assert.ok(a.patch.publishAt instanceof Date);
});

// ─── reminder bitmask idempotency ────────────────────────────────────────────

test("planNextAction: two-days reminder fires once (bit 1), then not again", () => {
  // 1.5 days before close: inside the two-day window, not yet the last day.
  let ed = edition({ status: "answering", answersCloseAt: at(1.5 * DAY_MS) });
  const r1 = planNextAction(ed, 3, NOW);
  assert.equal(r1.kind, "reminder");
  assert.equal(r1.bit, REMINDER_TWO_DAYS);
  assert.deepEqual(r1.modes, ["all"]);
  assert.equal(r1.patch.remindersSent, REMINDER_TWO_DAYS);

  ed = applyPatch(ed, r1.patch);
  assert.equal(planNextAction(ed, 3, NOW).kind, "none"); // bit 1 set; last day not due yet
});

test("planNextAction: last-day reminder fires once (bit 2) after the two-day one", () => {
  // Start with the two-day reminder already sent.
  let ed = edition({ status: "answering", answersCloseAt: at(1.5 * DAY_MS), remindersSent: REMINDER_TWO_DAYS });
  const lastDayNow = at(DAY_MS); // now within 12h of close
  const r2 = planNextAction(ed, 3, lastDayNow);
  assert.equal(r2.kind, "reminder");
  assert.equal(r2.bit, REMINDER_LAST_DAY);
  assert.deepEqual(r2.modes, ["all", "last"]);

  ed = applyPatch(ed, r2.patch);
  assert.equal(ed.remindersSent, REMINDER_TWO_DAYS | REMINDER_LAST_DAY);
  assert.equal(planNextAction(ed, 3, lastDayNow).kind, "none"); // both bits set
});

test("planNextAction: no reminder once the answer window has fully closed", () => {
  const ed = edition({ status: "answering", answersCloseAt: at(-1) });
  // With entries present it should transition, not nudge.
  assert.equal(planNextAction(ed, 4, NOW).kind, "transition");
});

// ─── auto-extend-once ────────────────────────────────────────────────────────

test("planNextAction: zero answers at close extends the window once (bit 4)", () => {
  let ed = edition({ status: "answering", answersCloseAt: at(-HOUR_MS), remindersSent: 0 });
  const e1 = planNextAction(ed, 0, NOW);
  assert.equal(e1.kind, "extend");
  assert.equal(e1.notify, "catchup_answers_open");
  assert.ok(e1.patch.answersCloseAt.getTime() > NOW.getTime());
  assert.equal(e1.patch.remindersSent & REMINDER_EXTENDED, REMINDER_EXTENDED);

  ed = applyPatch(ed, e1.patch);
  assert.equal(planNextAction(ed, 0, NOW).kind, "none"); // window now in the future; no second extend
});

test("planNextAction: after an extension it proceeds to preparing even with zero answers", () => {
  // Extended once (bit 4 set), and the extended window has now also closed with no entries.
  const ed = edition({
    status: "answering",
    answersCloseAt: at(-HOUR_MS),
    remindersSent: REMINDER_EXTENDED,
  });
  const a = planNextAction(ed, 0, NOW);
  assert.equal(a.kind, "transition");
  assert.equal(a.to, "preparing");
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

test("roundLabel + catchupTitle fallbacks", () => {
  assert.equal(roundLabel(4), "Round 4");
  assert.equal(catchupTitle(null, "Batch of 09"), "Batch of 09 Catch-ups");
  assert.equal(catchupTitle("  ", "Batch of 09"), "Batch of 09 Catch-ups");
  assert.equal(catchupTitle("Monsoon Notes", "Batch of 09"), "Monsoon Notes");
});

test("describeEditionStatus: readable per-status copy", () => {
  assert.equal(
    editionCountdownLabel({ status: "collecting", questionsCloseAt: at(3 * DAY_MS) }, NOW),
    "3 days left"
  );
  assert.equal(
    editionCountdownLabel({ status: "answering", answersCloseAt: at(DAY_MS) }, NOW),
    "last day"
  );
  assert.equal(editionCountdownLabel({ status: "published" }, NOW), null);
  assert.equal(
    describeEditionStatus({ status: "answering", number: 2, answersCloseAt: at(3 * DAY_MS) }, NOW),
    "Answering now, 3 days left"
  );
  assert.equal(describeEditionStatus({ status: "preparing", number: 2 }, NOW), "Preparing the Round");
  assert.equal(describeEditionStatus({ status: "published", number: 5 }, NOW), "Round 5 published");
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

test("CATCHUP_PROMPT_SETS: 5 sets, 30 prompts, correct categories, no em dashes", () => {
  assert.equal(CATCHUP_PROMPT_SETS.length, 5);
  assert.deepEqual(
    CATCHUP_PROMPT_SETS.map((s) => s.id),
    ["valley-days", "right-now", "most-likely-to", "on-the-horizon", "small-things"]
  );
  const total = CATCHUP_PROMPT_SETS.reduce((n, s) => n + s.prompts.length, 0);
  assert.equal(total, 30);
  for (const set of CATCHUP_PROMPT_SETS) {
    for (const prompt of set.prompts) {
      assert.ok(!prompt.includes("—"), `em dash found in prompt: ${prompt}`);
    }
  }
});

test("suggestSeedPrompts: one valley-days + one right-now for Round 1", () => {
  const seeds = suggestSeedPrompts();
  assert.equal(seeds.length, 2);
  assert.equal(seeds[0].category, "valley-days");
  assert.equal(seeds[1].category, "right-now");
});
