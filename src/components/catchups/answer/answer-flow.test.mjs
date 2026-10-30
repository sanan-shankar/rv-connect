import { test } from "node:test";
import assert from "node:assert/strict";
import { decomment, read } from "../../../lib/test-kit.mjs";
import { nextIndex, saveLanded, shouldFlush } from "./answer-flow.ts";

/* ------------------------------------------------------------------ *
 *  The answering surface's decisions (bug audit 3).
 *
 *  T3-04: after a failed save the red line said "Click away and back to try
 *  again", and doing exactly that sent nothing, because the card compared
 *  the words with what it had last SENT and never learned the send failed.
 *  A member who then left lost the paragraph.
 *
 *  T3-18: Share on the last question swept back to the first blank one on
 *  every press, so a member who left a question blank on purpose could never
 *  reach the end. T3-05: the end's one pill linked to the page it was on.
 *  T3-21: a photo-wall answer took one photograph while the server and the
 *  Edition's run both took three.
 * ------------------------------------------------------------------ */

const CARD = decomment(read("src/components/catchups/answer/answer-card.tsx"));
const EXPERIENCE = decomment(read("src/components/catchups/answer/answer-experience.tsx"));
const SONG = decomment(read("src/components/catchups/answer/song-attachment.tsx"));
const ACTIONS = decomment(read("src/app/(main)/catchups/actions.ts"));
const COMPLETION = decomment(read("src/components/catchups/answer/completion-card.tsx"));
const PHOTOS = decomment(read("src/components/catchups/answer/photo-attachments.tsx"));

/** Press Next/Share from `index` until the completion card, or give up. */
function walk(total, answered, from = 0) {
  const path = [from];
  let at = { index: from, swept: false };
  for (let presses = 0; presses < total * 4 && at.index < total; presses++) {
    at = nextIndex(at.index, total, answered, at.swept);
    path.push(at.index);
  }
  return path;
}

test("a failed save is sent again with unchanged words, which is the retry the line promises", () => {
  assert.equal(shouldFlush("Three paragraphs.", "Three paragraphs.", "failed"), true, "T3-04: the retry is a no-op again");
  assert.equal(shouldFlush("Three paragraphs.", "Three paragraphs.", "saved"), false, "a blur with nothing new sends nothing");
  assert.equal(shouldFlush("Three paragraphs.", "Three paragraphs.", "saving"), false, "a second blur while saving doubles the save");
  assert.equal(shouldFlush("Three paragraphs.", "Three paragraphs.", "idle"), false);
  assert.equal(shouldFlush("Three paragraphs. ", "Three paragraphs.", "saved"), false, "trailing space is not a change");
  assert.equal(shouldFlush("Four paragraphs.", "Three paragraphs.", "saved"), true, "a change is always sent");
});

test("a refused save is not re-sent unchanged, and a change is still sent", () => {
  /* Refused means the server would say the same no again: answering closed,
     another device saved first, over the cap. Shortening an answer that was
     over the cap is how a member gets past that one. */
  assert.equal(shouldFlush("x".repeat(6001), "x".repeat(6001), "refused"), false);
  assert.equal(shouldFlush("x".repeat(5999), "x".repeat(6001), "refused"), true);
});

test("only a save that landed, or is on its way, counts as answered", () => {
  assert.equal(saveLanded("failed"), false);
  assert.equal(saveLanded("refused"), false, "a refused answer ticked its mark and cheered on the completion card");
  for (const status of ["idle", "saving", "saved", undefined]) assert.equal(saveLanded(status), true, String(status));
});

test("the card decides through shouldFlush, and every caller of flushBody hands it words", () => {
  const flush = CARD.slice(CARD.indexOf("function flushBody("), CARD.indexOf("function flushBody(") + 400);
  assert.match(flush, /if \(!shouldFlush\(value, savedRef\.current, saveStatus\)\) return;/, "flushBody compares inline again");
  /* The songs field handed its blur EVENT to flushBody(latest?: string),
     which threw on `.trim()`, so a song name saved only on Next. */
  assert.match(CARD, /onCommit=\{\(\) => flushBody\(\)\}/, "the songs field passes flushBody itself, so the blur event becomes the words");
  assert.match(SONG, /onBlur=\{\(\) => onCommit\(\)\}/, "the songs field forwards its blur event to onCommit");
  assert.doesNotMatch(SONG, /onBlur=\{onCommit\}/);
});

test("a refusal and a failure are told apart, and the retry carries what did not land", () => {
  assert.match(EXPERIENCE, /const final = "final" in result && result\.final === true;/);
  assert.match(EXPERIENCE, /setSaveStatus\(\(s\) => \(\{ \.\.\.s, \[promptId\]: final \? "refused" : "failed" \}\)\);/);
  assert.match(
    EXPERIENCE,
    /const send = \{ \.\.\.unsent\.current\[promptId\], \.\.\.patch \};/,
    "a retry sends only the words, and says Saved over a photograph that never arrived"
  );
  assert.match(EXPERIENCE, /else unsent\.current\[promptId\] = send;/);
  assert.match(EXPERIENCE, /saveLanded\(saveStatus\[p\.id\]\)/, "the marks count a refused answer as answered");
  assert.match(CARD, /saveStatus === "refused"\s*\?\s*\(refusal \?\? "Not saved\."\)/, "a refusal's line is not its own sentence");
});

test("the refusals a retry cannot change carry final, and only those", () => {
  const submit = ACTIONS.slice(ACTIONS.indexOf("export async function submitEntry("), ACTIONS.indexOf("export async function toggleEntryLove("));
  assert.ok(submit.length > 2000, "submitEntry is not where this test looks");
  for (const words of [
    "Answering has closed for this Edition.",
    "This answer has changed somewhere else.",
    "Answering is not open for this Edition right now.",
  ]) {
    const at = submit.indexOf(words);
    assert.notEqual(at, -1, `submitEntry no longer says "${words}"`);
    assert.match(submit.slice(at, at + 260), /final: true as const/, `"${words}" invites a retry that cannot land`);
  }
  assert.match(submit, /return \{ error: parsed\.error\.issues\[0\]\.message, final: true as const \};/);
  // A member taken out of the Catch-up while their save was on its way
  // (C8-04): the same save would meet the same door.
  assert.match(submit, /if \(entry === "gone"\) return \{ error: NOT_IN_EDITION, final: true as const \};/);
  // The catch-all lives in runAction, outside submitEntry: a crash stays retryable.
  assert.equal((submit.match(/final: true as const/g) ?? []).length, 5);
});

test("a question left blank on purpose sends Share back to it once, and the next Share finishes", () => {
  // Four questions, the second left blank: the T3-18 case exactly.
  const answered = [true, false, true, true];
  assert.deepEqual(walk(4, answered), [0, 1, 2, 3, 1, 2, 3, 4], "Share loops back to question 2 for ever (T3-18)");
  // Two blanks: one trip back walks past both.
  assert.deepEqual(walk(4, [false, true, false, true]), [0, 1, 2, 3, 0, 1, 2, 3, 4]);
  // Everything answered: straight to the card.
  assert.deepEqual(walk(3, [true, true, true]), [0, 1, 2, 3]);
  // The owner's own case, 2026-08-13: question one blank when he finished three of four.
  assert.deepEqual(nextIndex(3, 4, [false, true, true, true], false), { index: 0, swept: true });
});

test("the question being left is never the one swept back to", () => {
  /* Its words reach `answered` a render late, so a just-answered last
     question still reads blank: it must not send the member to itself. */
  assert.deepEqual(nextIndex(2, 3, [true, true, false], false), { index: 3, swept: false });
  assert.deepEqual(nextIndex(0, 1, [false], false), { index: 1, swept: false }, "one question, unanswered: the card");
  assert.deepEqual(nextIndex(0, 3, [false, false, false], false), { index: 1, swept: false }, "only the last question sweeps");
});

test("the end of answering offers the questions, not the page it is already on", () => {
  assert.doesNotMatch(COMPLETION, /href=\{`\/catchups\/\$\{/, "the completion card links to the Catch-up's home, which it is drawn on (T3-05)");
  assert.doesNotMatch(COMPLETION, /from "@\/components\/common\/link"/);
  assert.match(COMPLETION, /<Button variant="primary" onClick=\{onBack\}[^>]*>\s*Back to the questions\s*<\/Button>/);
  assert.match(EXPERIENCE, /onBack=\{\(\) => goTo\(0, -1\)\}/, "the pill no longer takes the member to the first question");
  assert.match(EXPERIENCE, /const next = nextIndex\(index, total, /, "the advance decides inline again, without the sweep's memory");
});

test("every answer takes the same three photographs, a photo wall's included", () => {
  /* One constant, read by the strip and by the server's schema, and no way
     for a caller to pass a lower one: the strip once held a wall answer to
     one with `max={1}` while submitEntry took three (T3-21). */
  assert.match(PHOTOS, /import \{ MAX_IMAGES \} from "@\/lib\/upload-ownership-rule";/);
  assert.match(PHOTOS, /const remaining = MAX_IMAGES - images\.length;/);
  assert.match(PHOTOS, /images\.length < MAX_IMAGES &&/);
  assert.doesNotMatch(PHOTOS, /\bmax\??:\s*number|\bmax\s*=\s*\d/, "PhotoAttachments takes a cap from its caller again");
  assert.doesNotMatch(CARD, /<PhotoAttachments[^>]*\bmax=/, "the answer card passes a cap below the server's");
  assert.match(
    ACTIONS,
    /images: z\.array\(z\.url\(\)\)\.max\(MAX_IMAGES, /,
    "submitEntry's photograph cap is a literal again, free to drift from the strip's"
  );
});
