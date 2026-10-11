import assert from "node:assert/strict";
import test from "node:test";

import { continueFrom, joinHeard, bodyWithTranscript } from "./voice-transcript.ts";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Putting a browser's speech results together, written down as the two
 *  faults the owner reported on 2026-10-09:
 *
 *    "sometimes it just didn't put a space between different words um,
 *     the capitalizations were kind of weird"
 *
 *  Both were the recorder's own doing -- `heard += result[0].transcript`
 *  -- so every shape below is a REAL Chrome result list, not an invented
 *  one. Chrome hands over each settled phrase with no separator and with
 *  a sentence-opening capital, and keeps the trailing full stop off
 *  everything except the end of a real sentence.
 * ------------------------------------------------------------------ */

test("two phrases get one space between them, which is the missing-space bug", () => {
  // Exactly what `heard += ...` produced: "Hello thereThe banyan".
  assert.equal(joinHeard(["Hello there", "The banyan"]), "Hello there the banyan");
});

test("a continuing phrase loses its sentence-opening capital", () => {
  assert.equal(
    joinHeard(["We drove up for my niece's graduation", "And stopped at the valley"]),
    "We drove up for my niece's graduation and stopped at the valley"
  );
});

test("a capital after a full stop is left alone, because it is correct there", () => {
  assert.equal(
    joinHeard(["The banyan is still there.", "So is the bell"]),
    "The banyan is still there. So is the bell"
  );
  for (const ender of ["!", "?", "…"]) {
    assert.equal(joinHeard([`Is it still there${ender}`, "It is"]), `Is it still there${ender} It is`);
  }
});

test("a comma does not end a sentence, so the next phrase still comes down", () => {
  assert.equal(joinHeard(["We went up in May,", "And it rained"]), "We went up in May, and it rained");
});

test("I is never lower-cased", () => {
  assert.equal(joinHeard(["We drove up", "I think it was May"]), "We drove up I think it was May");
  for (const form of ["I'm", "I've", "I'll", "I'd"]) {
    assert.equal(joinHeard(["It was good", `${form} going back`]), `It was good ${form} going back`);
  }
});

test("an acronym keeps its capitals", () => {
  assert.equal(joinHeard(["We all met at", "RV last summer"]), "We all met at RV last summer");
  assert.equal(joinHeard(["She teaches at", "IIT Madras now"]), "She teaches at IIT Madras now");
});

test("a proper noun keeps its capital, which is the whole reason for the whitelist", () => {
  // spec 3.10: this transcript meets "Rishi Valley", "Bhoothi" and forty
  // Indian surnames, and wrecking one of those is the expensive mistake.
  for (const name of ["Rishi Valley is still there", "Bhoothi was closed", "Krishnamurti said so", "Mohini came too"]) {
    assert.equal(joinHeard(["We went back", name]), `We went back ${name}`);
  }
  // A name with an inner capital is not a sentence-opening capital either.
  assert.equal(joinHeard(["We stayed with", "McLeod for a week"]), "We stayed with McLeod for a week");
});

test("a first name that is also a function word keeps its capital", () => {
  // "will" and "may" are deliberately off the whitelist: each is a name.
  assert.equal(joinHeard(["We asked", "Will to come"]), "We asked Will to come");
  assert.equal(joinHeard(["It happened in", "May that year"]), "It happened in May that year");
});

test("a leading content word keeps its capital, the miss this rule accepts", () => {
  // The conservative half of the trade, pinned so it is a decision rather
  // than a surprise: a stray capital, never a broken name.
  assert.equal(joinHeard(["We drove up", "Went to the dam after"]), "We drove up Went to the dam after");
});

test("runs of whitespace collapse and empty results drop out", () => {
  assert.equal(joinHeard([" Hello   there ", "", "   ", "The  banyan"]), "Hello there the banyan");
  assert.equal(joinHeard([]), "");
  assert.equal(joinHeard(["\n\t "]), "");
});

test("the first phrase keeps its capital", () => {
  assert.equal(joinHeard(["The banyan is still there"]), "The banyan is still there");
});

test("continueFrom returns the segment alone, so two spans render as one sentence", () => {
  // The recorder draws the settled words and the still-being-heard words as
  // two separate spans; the second must not carry a leading space of its own.
  assert.equal(continueFrom("Hello there", "The banyan"), "the banyan");
  assert.equal(continueFrom("", "The banyan"), "The banyan");
  assert.equal(continueFrom("Hello there.", "The banyan"), "The banyan");
});

test("a transcript is added to what was typed, never swapped for it", () => {
  assert.equal(bodyWithTranscript("I typed this", "", "And then said this"), "I typed this\n\nAnd then said this");
  assert.equal(bodyWithTranscript("", "", "Said this"), "Said this");
});

test("recording again replaces its own last transcript rather than stacking", () => {
  const first = bodyWithTranscript("I typed this", "", "The first go");
  assert.equal(first, "I typed this\n\nThe first go");
  assert.equal(bodyWithTranscript(first, "The first go", "The second go"), "I typed this\n\nThe second go");
});

test("a transcript the member has since edited is left where it is", () => {
  // Once those words are theirs, nothing rewrites them: the new transcript is
  // added underneath instead.
  const edited = "I typed this\n\nThe first go, fixed up";
  assert.equal(
    bodyWithTranscript(edited, "The first go", "The second go"),
    "I typed this\n\nThe first go, fixed up\n\nThe second go"
  );
});

test("removing a recording after one go leaves the words behind", () => {
  // "Recording removed. Your words are still here." -- the drawn state.
  assert.equal(bodyWithTranscript("I typed this\n\nThe first go", "The first go", ""), "I typed this");
});

/* ── the reader keeps a spoken answer that has no words ─────────────── */

test("said() keeps an answer whose only content is a recording", () => {
  const src = decomment(read("src/components/catchups/edition/reader-parts.tsx"));
  const body = balancedBody(src, "export function said");
  assert.match(
    body,
    /e\.audio/,
    "said() drops an answer with a recording and no words: Firefox writes no transcript, so that is somebody's whole answer gone"
  );
});
