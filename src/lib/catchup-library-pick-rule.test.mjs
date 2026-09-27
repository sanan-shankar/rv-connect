import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "./test-kit.mjs";
import { balancedBody } from "./test-fn-body.mjs";

/* ------------------------------------------------------------------ *
 *  Picking a question from the Catch-ups library, pinned after it was
 *  found to prefill only the WORDS. `LibraryDialog`'s onPick carried text
 *  alone, so `submitPrompt` always wrote `category: null` and a
 *  photo-wall or songs pick landed as an ordinary text question --
 *  `promptKind()` (catchups-types.ts) never saw the set id that switches
 *  its answering control. `submitPrompt` itself was never broken: it has
 *  always written `category: category ?? null` (catchups/actions.ts).
 *
 *  The dropped id had a working double before the 2026-09-09 home rework
 *  -- `console-collecting.tsx` + `library-picker-dialog.tsx`, deleted in
 *  b94677ce, whose `onPick(text, category)` fed the same call -- so this
 *  pins the id's path through the CURRENT ask box rather than trusting
 *  the wiring by eye a second time.
 * ------------------------------------------------------------------ */

const collecting = decomment(read("src/components/catchups/home/collecting.tsx"));

test("picking a library question hands back its set id, not just its words", () => {
  assert.match(
    collecting,
    /onClick=\{\(\) => onPick\(text, set\.id\)\}/,
    "the library's pick button sends only the text again; a photo-wall or songs " +
      "question picked from here has no way to tell submitPrompt what kind it is"
  );
  assert.match(
    collecting,
    /onPick:\s*\(text:\s*string,\s*category:\s*PromptCategory\)\s*=>\s*void;/,
    "LibraryDialog's onPick no longer declares a category, so a caller can drop it and still typecheck"
  );
});

test("the ask box keeps the picked category and sends it when asking", () => {
  const askBox = balancedBody(collecting, "export function AskBox(");
  assert.ok(askBox, "AskBox is gone or renamed");

  assert.match(
    askBox,
    /onPick=\{\(t, c\) => \{\s*setText\(t\);\s*setCategory\(c\);/,
    "picking a library question no longer stores its category alongside the text"
  );

  const ask = balancedBody(askBox, "async function ask(");
  assert.ok(ask, "AskBox's ask() is gone or renamed");
  assert.match(
    ask,
    /submitPrompt\(\{\s*editionId,\s*text:\s*body,\s*category,\s*showAsker:\s*!anon\s*\}\)/,
    "ask() no longer sends the picked category to submitPrompt, so a library pick " +
      "prefills the words and nothing else, same as before this fix"
  );
});

test("a cleared box drops the category so a fresh question is never mistaken for a pick", () => {
  const askBox = balancedBody(collecting, "export function AskBox(");
  const updateText = balancedBody(askBox, "function updateText(");
  assert.ok(updateText, "updateText is gone or renamed");
  assert.match(
    updateText,
    /if\s*\(!next\.trim\(\)\)\s*setCategory\(null\);/,
    "clearing the box no longer drops the picked category; a member who deletes a " +
      "photo-wall pick and types their own question would still submit it as a photo-wall question"
  );

  // And a successful ask resets it too, so the next question typed in the same
  // box does not inherit a category from the one before it.
  assert.match(
    askBox,
    /setText\(""\);\s*setCategory\(null\);\s*setAnon\(false\);/,
    "asking successfully no longer clears the category with the box, so it would leak into the next question"
  );
});
