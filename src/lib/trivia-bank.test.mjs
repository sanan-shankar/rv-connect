import assert from "node:assert/strict";
import test from "node:test";

import { TRIVIA_QUESTIONS, judge, questionById, normalize } from "./trivia-bank.ts";

/* The judge the gate, the recorder and the admin room all share
 * (trivia-bank.ts). These are the cases its comments promise, so a change
 * to the rules that breaks one of them breaks out loud. `how` is pinned too:
 * the admin room reports which rule let each answer in, and a right answer
 * reported under the wrong rule would make the one-letter allowance look
 * busier or idler than it is. */

const q = (id) => {
  const found = questionById(id);
  assert.ok(found, `no question "${id}"`);
  return found;
};

test("spacing, capitals, punctuation and the/house/tree/valley never decide", () => {
  for (const said of ["BBT", "b.b.t.", "b b t", "The Big Banyan Tree", "banyan"]) {
    assert.equal(judge(q("banyan"), said).ok, true, said);
  }
  assert.deepEqual(judge(q("cauvery"), "Cauvery House"), { ok: true, how: "exact", matched: "cauvery" });
  assert.equal(judge(q("raavi"), "Raavi valley").how, "exact");
  assert.equal(normalize("tree"), "tree", "a bare suffix is not stripped to nothing");
});

test("one letter off is let in on long answers only, and says so", () => {
  assert.deepEqual(judge(q("cauvery"), "cauvary"), { ok: true, how: "typo", matched: "cauvery" });
  assert.equal(judge(q("tuckshop"), "tuk").ok, false, "three letters is most of the word");
  assert.equal(judge(q("raavi"), "ravi").how, "exact", "listed, not inferred");
});

test("the folk dancing question refuses its own word by name", () => {
  assert.deepEqual(judge(q("folkie"), "folk"), { ok: false, how: "refused", matched: null });
  assert.equal(judge(q("folkie"), "folky").ok, true);
});

test("the dinner question passes on a mention", () => {
  assert.deepEqual(judge(q("thursdaydinner"), "Egg curry and tomato rice"), {
    ok: true,
    how: "mention",
    matched: "egg",
  });
  assert.equal(judge(q("thursdaydinner"), "tomato rice I think").ok, true);
  assert.equal(judge(q("thursdaydinner"), "dal").ok, false);
});

test("an answer accepted from the admin room matches exactly and is never widened", () => {
  const added = ["grubby"];
  assert.deepEqual(judge(q("tuckshop"), "Grubby!", added), { ok: true, how: "added", matched: "grubby" });
  assert.equal(judge(q("tuckshop"), "grubbi", added).ok, false, "one letter off a panel entry is not it");
  assert.equal(judge(q("tuckshop"), "", [""]).ok, false, "an empty answer is never right");
});

test("every question has an id, a topic label that is not its answer, and something to accept", () => {
  const ids = new Set();
  for (const item of TRIVIA_QUESTIONS) {
    assert.ok(!ids.has(item.id), `duplicate id ${item.id}`);
    ids.add(item.id);
    assert.ok(item.label && item.label.length <= 24, `${item.id}: label`);
    const accepted = [...item.answers, ...(item.contains ?? [])].map(normalize);
    assert.ok(accepted.length > 0, `${item.id}: nothing accepted`);
    assert.equal(judge(item, item.label).ok, false, `${item.id}: its label gives the answer away`);
  }
});
