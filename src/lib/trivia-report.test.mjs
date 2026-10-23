import assert from "node:assert/strict";
import test from "node:test";

import { buildGateReport, editDistance, questionDetail, valleyDay } from "./trivia-report.ts";
import { valleyDayKey } from "./utils.ts";

/* The arithmetic behind /admin/trivia (trivia-report.ts). Each browser below
 * is one way a showing can end, so a change that miscounts any of them names
 * itself. Times are minutes after a fixed morning, far enough from NOW that
 * nobody reads as still at the gate unless the test says so. */

const NOW = new Date("2026-10-31T12:00:00Z");
const T0 = new Date("2026-10-31T04:00:00Z").getTime();
let n = 0;
const row = (browserId, minute, kind, questionId, answer = null, extra = {}) => ({
  id: `r${++n}`,
  browserId,
  questionId,
  kind,
  answer,
  how: null,
  matched: null,
  device: "phone",
  country: "IN",
  userId: null,
  createdAt: new Date(T0 + minute * 60_000),
  ...extra,
});

const ROWS = [
  // a: the tree, right first go, then joins
  row("a", 0, "shown", "banyan"),
  row("a", 0.5, "right", "banyan", "Banyan", { how: "exact", matched: "banyan", userId: "m1" }),
  // b: Krishna's neighbour wrong, then right
  row("b", 1, "shown", "cauvery"),
  row("b", 1.2, "wrong", "cauvery", "Ganga"),
  row("b", 1.5, "right", "cauvery", "kavery", { how: "exact", matched: "kavery" }),
  // c: skips the tuck shop untried (the skip and the next question share a ms),
  //    types "grub" for... no: says it to the hut, misses, says idk, then gets the tree
  row("c", 2, "shown", "tuckshop"),
  row("c", 2.1, "skipped", "tuckshop"),
  row("c", 2.1, "shown", "roundhut"),
  row("c", 2.3, "wrong", "roundhut", "the dining hut"),
  row("c", 2.4, "dontknow", "roundhut", "idk"),
  row("c", 2.4, "shown", "banyan"),
  row("c", 2.6, "right", "banyan", "BBT", { how: "exact", matched: "bbt" }),
  // d: a stranger. Misses the tuck shop with "grub", leaves
  row("d", 10, "shown", "tuckshop"),
  row("d", 10.2, "wrong", "tuckshop", "grub"),
  // e: also says "Grub!" and leaves: two people now
  row("e", 20, "shown", "tuckshop"),
  row("e", 20.2, "wrong", "tuckshop", "Grub!"),
  // f: looks at the hill and leaves without typing
  row("f", 30, "shown", "caverock"),
  // g: still here, mid-question, two minutes ago
  row("g", 0, "shown", "raavi", null, { createdAt: new Date(NOW.getTime() - 120_000) }),
];

const MEMBERS = [
  {
    id: "m1",
    name: "Meera Iyer",
    photoUrl: null,
    birdOverride: null,
    accountType: "alumnus",
    batchType: "leaving",
    batchYear: 1984,
    verifyState: "verified",
    createdAt: new Date(T0 + 3 * 60_000),
  },
];

const build = (added = new Map()) =>
  buildGateReport({ rows: ROWS, members: MEMBERS, addedByQuestion: added, now: NOW, days: 7 });

test("the door counts people, not rows", () => {
  const { door, stuck } = build();
  assert.equal(door.arrived, 7);
  assert.equal(door.tried, 5, "a b c d e typed something");
  assert.equal(door.through, 3);
  assert.equal(door.joined, 1);
  assert.equal(door.firstGo, 1, "only a got in on the first thing typed");
  assert.equal(stuck.length, 2, "d and e tried and never got in");
  assert.equal(door.hereNow, 1, "g is still on the page");
});

test("every showing ends one way, and a live one is not a drop-out", () => {
  const q = (id) => build().questions.find((s) => s.id === id);
  assert.deepEqual(q("banyan").outcomes, { firstGo: 2, afterMiss: 0, movedOn: 0, missed: 0, left: 0 });
  assert.equal(q("cauvery").outcomes.afterMiss, 1);
  assert.deepEqual(q("tuckshop").outcomes, { firstGo: 0, afterMiss: 0, movedOn: 1, missed: 2, left: 0 });
  assert.equal(q("roundhut").outcomes.missed, 1, "a miss then an I-don't-know is a miss");
  assert.equal(q("caverock").outcomes.left, 1);
  assert.equal(q("raavi").shown, 0, "g's open showing is not counted yet");
  assert.equal(q("banyan").medianSecondsToRight, 21, "30s for a, 12s for c");
});

test("too few showings is too early to call, and sorts after the rest", () => {
  const qs = build().questions;
  assert.ok(qs.every((s) => s.verdict === "early"), "no question has five answered showings here");
  assert.equal(qs[0].id, "banyan", "but the best of them still leads");
});

test("an answer near one we take is worth a look; a common miss far from anything is not", () => {
  const { candidates, turnedAway } = build();
  const grub = candidates.find((c) => c.norm === "grub");
  assert.ok(grub, "grub, typed by d and e");
  assert.equal(grub.people, 2);
  assert.deepEqual(grub.variants.sort(), ["Grub!", "grub"]);
  assert.deepEqual(grub.near, { entry: "grubtuck", how: "part" });
  assert.ok(!candidates.some((c) => c.norm === "ganga"), "b fixed it themselves; nowhere close");
  assert.equal(turnedAway.find((c) => c.norm === "ganga").correctedTo, "kavery");
  const hut = turnedAway.find((c) => c.norm === "dininghut");
  assert.equal(hut.gotInElsewhere, 1, "c missed the hut and got in on the tree");
  assert.ok(!candidates.includes(hut), "one person who got in elsewhere is a coincidence, not a pattern");
});

test("an answer accepted from the room stops being listed, and its old misses say so", () => {
  const r = build(new Map([["tuckshop", ["grub"]]]));
  assert.ok(!r.candidates.some((c) => c.norm === "grub"));
  const misses = r.recent.filter((e) => e.questionId === "tuckshop" && e.kind === "wrong");
  assert.ok(misses.length === 2 && misses.every((e) => e.acceptedSince));
});

test("a member's answers carry their name, and their generation fills the matrix", () => {
  const r = build();
  const a = r.recent.find((e) => e.answer === "Banyan");
  assert.equal(a.member?.name, "Meera Iyer");
  assert.deepEqual(r.generations.cohorts, ["1980s"]);
  const tree = r.generations.rows.find((g) => g.questionId === "banyan");
  assert.deepEqual(tree.cells, [{ cohort: "1980s", answered: 1, right: 1 }]);
});

test("the rhythm is counted by the valley's day", () => {
  const r = build();
  const today = r.daily.at(-1);
  assert.equal(today.day, valleyDay(NOW));
  assert.equal(today.arrived, 7);
  assert.equal(today.through, 3);
  assert.equal(today.joined, 1);
  assert.equal(valleyDay(new Date("2026-10-30T19:00:00Z")), "2026-10-31", "half past midnight in the valley");
  /* The report keeps its own copy because it runs under plain Node; it must
     never disagree with the app's canonical one, at any hour. */
  for (let h = 0; h < 48; h += 0.5) {
    const t = new Date(Date.UTC(2026, 9, 30) + h * 3_600_000);
    assert.equal(valleyDay(t), valleyDayKey(t), t.toISOString());
  }
});

test("the question page lists what is accepted and how often each entry let someone in", () => {
  const r = build();
  const d = questionDetail(r, ROWS, [], "banyan");
  assert.equal(d.accepted.find((a) => a.entry === "banyan").hits, 1);
  assert.equal(d.accepted.find((a) => a.entry === "bbt").hits, 1);
  assert.equal(d.accepted.find((a) => a.entry === "kbt").hits, 0);
  assert.equal(questionDetail(r, ROWS, [], "nope"), null);
});

test("edit distance stops counting past its cap", () => {
  assert.equal(editDistance("cauvery", "cavery"), 1);
  assert.equal(editDistance("grub", "grubtuck"), 3);
  assert.equal(editDistance("asthachal", "ashtachal"), 2);
});
