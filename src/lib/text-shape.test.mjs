import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FULL_NAME_MAX,
  batchTypeFromLeaving,
  firstGrapheme,
  fullNameFits,
  getInitials,
  letterTitle,
  parseJsonArray,
  plainExcerpt,
  truncateGraphemes,
} from "./utils.ts";

/* Text that is more than one UTF-16 code unit per character. Every one of
   these used to come back broken from a `.slice()` or a `[0]`. */
const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}"; // one ZWJ emoji
const FLAG = "\u{1F1EE}\u{1F1F3}"; // one flag, two regional indicators
const DEVANAGARI = "नमस्ते"; // namaste

/* --- Cutting text (audit Lows 38, 107) ------------------------------------ */

test("a cut lands between characters, never through one", () => {
  const text = `${FAMILY}${FAMILY}${FAMILY}`;
  const cut = truncateGraphemes(text, 2);
  // The real assertion: no lone surrogate survives. A half-emoji is an
  // unpaired code unit in the D800-DFFF range, which renders as a box.
  assert.equal(hasLoneSurrogate(cut), false, "cut left half a character behind");
  assert.ok(cut.startsWith(FAMILY + FAMILY));
});

test("a flag counts as one character, not two", () => {
  assert.equal(truncateGraphemes(`${FLAG}${FLAG}`, 1), `${FLAG}...`);
  assert.equal(hasLoneSurrogate(truncateGraphemes(`${FLAG}${FLAG}`, 1)), false);
});

test("text that fits is returned untouched, with no ellipsis", () => {
  assert.equal(truncateGraphemes("short", 20), "short");
  assert.equal(truncateGraphemes(FAMILY, 1), FAMILY);
  assert.equal(truncateGraphemes("", 5), "");
});

test("plain text still cuts exactly where it used to", () => {
  assert.equal(truncateGraphemes("abcdef", 3), "abc...");
  // Trailing space before the ellipsis is trimmed, as it always was.
  assert.equal(truncateGraphemes("ab cdef", 3), "ab...");
});

/* --- Initials (audit Low 107) --------------------------------------------- */

test("initials take a whole first character, not half of one", () => {
  assert.equal(firstGrapheme(FAMILY), FAMILY);
  assert.equal(hasLoneSurrogate(getInitials(`${FAMILY} ${FLAG}`)), false);
  assert.equal(firstGrapheme(""), "");
});

test("initials still work for the ordinary case", () => {
  assert.equal(getInitials("Asha Menon"), "AM");
  assert.equal(getInitials("Asha"), "A");
  assert.equal(getInitials("  Asha   Kumari Menon  "), "AM");
  assert.equal(getInitials(""), "?");
  assert.equal(getInitials("   "), "?");
  assert.equal(getInitials(DEVANAGARI), DEVANAGARI.slice(0, 1).toUpperCase());
});

/* --- A letter that opens with a photo (audit Low 88) ---------------------- */

test("a letter opening with an image does not title itself with a stray bang", () => {
  const title = letterTitle(null, "![the banyan](https://example.com/a.jpg)\n\nThe tree still stands.");
  assert.ok(!title.startsWith("!"), `title began with a bang: ${title}`);
  assert.equal(title, "The tree still stands.");
});

test("the excerpt and the title agree about images", () => {
  const body = "![a photo](https://example.com/a.jpg) and then some words.";
  assert.ok(!plainExcerpt(body).includes("!"));
  assert.ok(!letterTitle(null, body).includes("!"));
});

test("a letter with a real title keeps it", () => {
  assert.equal(letterTitle("  My title  ", "anything"), "My title");
  assert.equal(letterTitle(null, "   "), "A letter");
});

/* --- A JSON column with something unexpected in it (audit Low 92) --------- */

test("one bad element in a JSON array is dropped, not fatal", () => {
  // The profile page calls .trim() on every element of `phones`; a number or
  // a null in there threw and took the whole page down.
  assert.deepEqual(parseJsonArray('["+91 99", 42, null, "+91 98", {}]'), ["+91 99", "+91 98"]);
  assert.deepEqual(parseJsonArray("[]"), []);
  assert.deepEqual(parseJsonArray("not json"), []);
  assert.deepEqual(parseJsonArray('{"a":1}'), []);
  assert.deepEqual(parseJsonArray(null), []);
});

/* --- Two years that cannot both be true (audit Low 110) ------------------- */

test("a batch year before the leaving year is refused, not guessed", () => {
  // Swapped fields at signup. The arithmetic read the negative gap as MORE
  // grade than a 12th-grade leaver has and confidently answered "ISC".
  assert.equal(batchTypeFromLeaving(2012, 2010), null);
  assert.equal(batchTypeFromLeaving(2000, 1999), null);
});

test("the ordinary cases are unchanged", () => {
  assert.equal(batchTypeFromLeaving(2012, 2012), "ISC", "left in their own final year");
  assert.equal(batchTypeFromLeaving(2010, 2012), "ICSE", "left after 10th");
  assert.equal(batchTypeFromLeaving(2008, 2012), null, "left too early for either board");
});

/* --- One ceiling for a stored name (audit M45, Low 109) ------------------- */

test("first and last name together cannot exceed the stored ceiling", () => {
  const fifty = "x".repeat(50);
  // 50 + a space + 50 is 101, one past the column's own cap, which is exactly
  // the pair signup used to accept and Settings then refused to save back.
  assert.equal(fullNameFits(fifty, fifty), false);
  assert.equal(fullNameFits("x".repeat(49), fifty), true);
  assert.equal(fullNameFits("  Asha  ", "  Menon  "), true, "trimmed before counting");
  assert.equal(FULL_NAME_MAX, 100);
});

/** True if `s` contains an unpaired UTF-16 surrogate, i.e. half a character. */
function hasLoneSurrogate(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return true;
    }
  }
  return false;
}
