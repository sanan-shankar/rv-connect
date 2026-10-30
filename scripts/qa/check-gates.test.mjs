import assert from "node:assert/strict";
import test from "node:test";

import { GATES, blocks, stateOf } from "./check.mjs";

/* ------------------------------------------------------------------ *
 *  How each gate reads its tool, proved on crafted output: the tool
 *  itself cannot be made to fail on demand. The question every case
 *  asks is the one CI answers, "does this stop the push?".
 * ------------------------------------------------------------------ */

const lint = (code, out) => GATES.lint.read({ code, out });

/* Bug audit 3, L9-03: the lint gate was non-blocking whole, so an ESLint
   ERROR (a conditional hook, a missing key) printed FAIL and CI went green. */
test("an ESLint error stops the run", () => {
  const result = lint(1, "\n✖ 3 problems (1 error, 2 warnings)\n");
  assert.equal(stateOf(result), "fail");
  assert.equal(blocks(GATES.lint, result), true, "an ESLint error no longer blocks the push");
});

test("ESLint warnings are counted, never blocking", () => {
  /* Every design rule is `warn` on purpose: they nudge, they never break
     the build (DESIGN-SYSTEM.md). */
  const result = lint(0, "\n✖ 2 problems (0 errors, 2 warnings)\n");
  assert.equal(stateOf(result), "soft");
  assert.equal(blocks(GATES.lint, result), false);
});

test("an ESLint that crashed stops the run instead of reading as clean", () => {
  const result = lint(2, "Oops! Something went wrong! :(\nTypeError: plugin failed to load\n");
  assert.equal(result.detail, "tool crashed");
  assert.equal(blocks(GATES.lint, result), true, "a crashed ESLint cannot vouch for zero errors");
});

test("a clean ESLint passes", () => {
  assert.equal(stateOf(lint(0, "")), "pass");
});
