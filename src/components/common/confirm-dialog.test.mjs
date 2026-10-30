import assert from "node:assert/strict";
import test from "node:test";
import { resolve, relative } from "node:path";
import { ROOT, read, decomment, walk } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The browser's confirm() stays dead (owner, 2026-08-29: "we dont
 *  want any system dialogs to pop up instead of our dialogs").
 *
 *  ConfirmDialog existed for a year while eight call sites went on
 *  calling window.confirm -- posts, comments, letter drafts, catch-ups
 *  and the profile admin tools each shipped the browser's grey chrome
 *  around copy nobody reviewed. This pin makes the ninth impossible.
 *
 *  Decommented source, so history told in comments stays legal. The
 *  patterns cover every shape those eight actually had; a local
 *  function NAMED confirm (support/bird-picker.tsx) also stays legal,
 *  since definitions and `onClick={confirm}` references match nothing
 *  here.
 * ------------------------------------------------------------------ */

test("no native confirm/alert/prompt dialogs in app code", () => {
  // Walked, not `git ls-files`: an unstaged new file is code too (L9-07).
  const files = ["src/app", "src/components"]
    .flatMap((dir) => walk(resolve(ROOT, dir), { match: /\.tsx?$/ }))
    .map((full) => relative(ROOT, full));
  assert.ok(files.length > 100, `suspiciously few files listed (${files.length})`);

  const banned = /window\.(confirm|alert|prompt)\(|!confirm\(|await confirm\(|!alert\(/;
  const offenders = files.filter((f) => banned.test(decomment(read(f))));
  assert.deepEqual(
    offenders,
    [],
    "native dialog call found. Use ConfirmDialog from src/components/common/confirm-dialog.tsx instead."
  );
});
