import { test } from "node:test";
import assert from "node:assert/strict";
import { decomment, read } from "../../../lib/test-kit.mjs";
import { saveLanded, shouldFlush } from "./answer-flow.ts";

/* ------------------------------------------------------------------ *
 *  The answering surface's decisions (bug audit 3).
 *
 *  T3-04: after a failed save the red line said "Click away and back to try
 *  again", and doing exactly that sent nothing, because the card compared
 *  the words with what it had last SENT and never learned the send failed.
 *  A member who then left lost the paragraph.
 * ------------------------------------------------------------------ */

const CARD = decomment(read("src/components/catchups/answer/answer-card.tsx"));
const EXPERIENCE = decomment(read("src/components/catchups/answer/answer-experience.tsx"));
const SONG = decomment(read("src/components/catchups/answer/song-attachment.tsx"));
const ACTIONS = decomment(read("src/app/(main)/catchups/actions.ts"));

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
  // The catch-all lives in runAction, outside submitEntry: a crash stays retryable.
  assert.equal((submit.match(/final: true as const/g) ?? []).length, 4);
});
