import test from "node:test";
import assert from "node:assert/strict";
import { isSameSearch } from "./search-continuation.ts";

/* The bug this rule exists for (audit M25): a live-filtering box fires on
   every keystroke, so one search arrives as a ladder of prefixes. The old
   dedupe compared the strings for equality and therefore never matched two
   consecutive keystrokes -- it deduped nothing at all. */
test("every keystroke of one word is the same search", () => {
  const typed = "Bengaluru";
  for (let i = 2; i < typed.length; i++) {
    assert.equal(
      isSameSearch(typed.slice(0, i), typed.slice(0, i + 1)),
      true,
      `"${typed.slice(0, i)}" -> "${typed.slice(0, i + 1)}" should be one search`
    );
  }
});

test("backspacing is the same search too", () => {
  assert.equal(isSameSearch("Bengaluru", "Bengal"), true);
  assert.equal(isSameSearch("Bengal", "Bengaluru"), true);
});

test("a different word is a different search", () => {
  assert.equal(isSameSearch("Bengaluru", "Delhi"), false);
  assert.equal(isSameSearch("Anand", "Ananya"), false);
  // Shares a prefix but neither contains the other: two real searches.
  assert.equal(isSameSearch("Rishi Valley", "Rishi Kumar"), false);
});

test("case and edge whitespace do not split one search in two", () => {
  assert.equal(isSameSearch("beng", "Beng "), true);
  assert.equal(isSameSearch(" Bengal", "BENGALURU"), true);
});

test("an empty query matches nothing, including another empty one", () => {
  // Guards the update branch: an empty string is a prefix of everything, and
  // without this every unrelated search would fold into the last row.
  assert.equal(isSameSearch("", "Bengaluru"), false);
  assert.equal(isSameSearch("Bengaluru", "   "), false);
  assert.equal(isSameSearch("", ""), false);
});
