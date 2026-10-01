import test from "node:test";
import assert from "node:assert/strict";

import {
  PROFESSION_TAGS,
  TAG_VALUES,
  TAG_FLOOR,
  TAG_VISIBLE_MAX,
  TAG_MAX_PER_PERSON,
  VOCAB_MAX,
  tagLabel,
  tagsOf,
  withParents,
  sourceOf,
  TAG_RULES,
} from "./profession-tags.ts";

/* ------------------------------------------------------------------ *
 *  The profession vocabulary, and the three caps that keep it usable.
 *
 *  This file exists because the vocabulary is MEANT to change -- tags
 *  added, split, merged, dropped -- and every one of those edits is a
 *  hand edit to a list. The caps below are the only thing standing
 *  between "the list evolves" and "the list has forty entries and the
 *  directory filter is a scrolling wall".
 * ------------------------------------------------------------------ */

test("no duplicate tag values", () => {
  assert.equal(new Set(TAG_VALUES).size, TAG_VALUES.length);
});

test("every tag has a label and a hint", () => {
  for (const t of PROFESSION_TAGS) {
    assert.ok(t.label.length > 0, `${t.value} has no label`);
    assert.ok(t.hint.length > 0, `${t.value} has no hint for the tagging session`);
  }
});

/* Rule 1, pinned. "Agriculture & Environment" was the draft label the
   owner rejected on 2026-08-28 for being wordy, and the reason it was
   wrong is structural rather than cosmetic: an ampersand label is two
   tags merged sideways, which rule 4 forbids everywhere else. Farming
   and Environment are two entries now, and the floor decides which
   survives. This test is what stops a compound coming back. */
test("labels are sentence case with no ampersand (rule 1)", () => {
  for (const t of PROFESSION_TAGS) {
    assert.ok(!t.label.includes("&"), `"${t.label}" is two tags wearing one name -- split it`);
    assert.ok(
      /^[A-Z][a-z]*(?: [a-z]+)*$/.test(t.label),
      `"${t.label}" is not sentence case ("Social impact", not "Social Impact")`
    );
  }
});

/* The cap that will actually fail on somebody one day, so its message
   has to say what to DO. "Too many tags" sends the reader to count a
   list; naming the two smallest sends them to the decision the cap
   exists to force. */
test("the vocabulary stays inside VOCAB_MAX", () => {
  const smallest = PROFESSION_TAGS.map((t) => t.value).slice(-2).join(" or ");
  assert.ok(
    PROFESSION_TAGS.length <= VOCAB_MAX,
    `${PROFESSION_TAGS.length} tags, and ${VOCAB_MAX} is the ceiling. Adding one means ` +
      `merging two upward first (rule 4) -- start by asking whether ${smallest} belongs ` +
      `under something broader. Raising VOCAB_MAX is a decision, not a fix: if no merge is ` +
      `upward, argue the raise on the constant, as the 2026-10-01 one was.`
  );
});

/* The two display caps have to be able to hand off to each other. If
   the visible cap ever reached the vocabulary size it would stop doing
   anything at all, and the whole list would be offered again. */
test("the caps are ordered so each has a job", () => {
  assert.ok(TAG_VISIBLE_MAX < VOCAB_MAX, "the visible cap must bind before the vocabulary cap");
  assert.ok(Number.isInteger(TAG_FLOOR) && TAG_FLOOR > 0);
  assert.ok(Number.isInteger(TAG_MAX_PER_PERSON) && TAG_MAX_PER_PERSON > 0);
  assert.ok(TAG_MAX_PER_PERSON < TAG_VISIBLE_MAX, "a person cannot hold most of the filter");
});

test("every parent resolves to a live tag, with no cycles", () => {
  for (const t of PROFESSION_TAGS) {
    if (t.parent === null) continue;
    assert.ok(TAG_VALUES.includes(t.parent), `${t.value} names a parent that does not exist`);
    /* Walk to the root. A cycle would hang withParents' loop guard into
       silently dropping tags instead, which is the failure this catches
       while it is still a hand edit rather than a bad apply run. */
    const seen = new Set([t.value]);
    let cur = t.parent;
    while (cur) {
      assert.ok(!seen.has(cur), `${t.value} sits in a parent cycle`);
      seen.add(cur);
      cur = PROFESSION_TAGS.find((x) => x.value === cur)?.parent ?? null;
    }
  }
});

test("withParents is idempotent and carries the whole chain", () => {
  const once = withParents(TAG_VALUES.slice(0, 3));
  assert.deepEqual(withParents(once).sort(), once.sort());
  /* The property that matters, checked against the vocabulary as it
     actually stands rather than a fixture: every tag with a parent
     brings it. Today nothing has a parent, so this passes vacuously --
     and starts doing real work the day Healthcare splits, which is
     exactly when nobody will think to write the test. */
  for (const t of PROFESSION_TAGS) {
    if (t.parent === null) continue;
    assert.ok(withParents([t.value]).includes(t.parent), `${t.value} dropped its parent`);
  }
});

test("tagsOf drops values from no vocabulary at all", () => {
  assert.deepEqual(tagsOf(["technology", "not-a-tag", "technology"]), ["technology"]);
  assert.deepEqual(tagsOf([]), []);
  assert.deepEqual(tagsOf(null), []);
  assert.deepEqual(tagsOf(["  ", ""]), []);
});

test("tagLabel never returns nothing", () => {
  for (const t of PROFESSION_TAGS) assert.equal(tagLabel(t.value), t.label);
  assert.equal(tagLabel("unmapped"), "Unmapped");
});

/* The rules are read by a session, not by code, so the only thing worth
   pinning is that they are still THERE -- a merge that empties this
   string would leave the tagging pass with a vocabulary and no idea how
   to choose between its entries. */
test("TAG_RULES still states the two rules that are easiest to lose", () => {
  assert.match(TAG_RULES, /fewest tags that are TRUE/);
  assert.match(TAG_RULES, /No tags is a legitimate answer/);
  assert.match(TAG_RULES, new RegExp(`${TAG_MAX_PER_PERSON === 4 ? "Four" : TAG_MAX_PER_PERSON}`));
});

/* The staleness check compares a stored string against this function's
   output. It was briefly reimplemented in SQL and the two disagreed by one
   space, which re-picked every tagged member on every run -- so what is
   worth pinning is that the output is COMPACT and that both halves of the
   pair survive it, including the empty ones. */
test("sourceOf is compact and keeps both halves", () => {
  assert.equal(sourceOf("Doctor", "RV Health Centre"), '["Doctor","RV Health Centre"]');
  assert.equal(sourceOf(null, null), '["",""]');
  assert.notEqual(sourceOf("a", "b c"), sourceOf("a b", "c"));
  assert.ok(!sourceOf("Doctor", "RV").includes(", "), "a space here re-picks the whole membership");
});
