import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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

const deps = (code, out, env = {}) => GATES.deps.read({ code, out }, env);

/* Bug audit 3, C1-08: the dependency gate could exit 0 having printed
   nothing (its entry guard skipped the audit on an unusual path), and this
   gate read that as "clean". */
test("a dependency gate that prints no verdict is not clean", () => {
  const result = deps(0, "");
  assert.equal(result.detail, "printed no verdict — not checked");
  assert.equal(blocks(GATES.deps, result), true);
});

test("the dependency gate's own verdict passes, and a new advisory blocks", () => {
  const clean = deps(0, "npm-audit-gate: clean (no high/critical advisories, nothing allowlisted)\n");
  assert.equal(stateOf(clean), "pass");
  const advisory = deps(1, "  FAIL     GHSA-xxxx-xxxx-xxxx (high) crafted\n");
  assert.equal(blocks(GATES.deps, advisory), true);
});

test("an unreachable registry warns on a laptop and blocks in CI", () => {
  const offline = "npm-audit-gate: the audit did not run -- ECONNREFUSED";
  assert.equal(stateOf(deps(2, offline, {})), "soft");
  assert.equal(blocks(GATES.deps, deps(2, offline, { CI: "true" })), true);
});

const security = (code, out) => GATES.security.read({ code, out });

test("the status board blocks on an open high, and on printing no summary", () => {
  const summary = "\n  74 checked -- 58 fixed, 5 open, 9 accepted, 2 awaiting the owner\n";
  assert.equal(stateOf(security(0, summary)), "pass");
  assert.equal(blocks(GATES.security, security(1, `${summary}FAIL: 1 open finding(s) at severity critical/high: H1`)), true);
  /* No summary and exit 0 used to throw inside the gate (m[1] of null). */
  assert.equal(blocks(GATES.security, security(0, "")), true);
});

/* Bug audit 3, L9-11: four of the board's notes told the reader to "run
   phaseN-probe for behaviour", and those probes comment on a real member's
   post and ring their bell (C1-02). A note says what its probe saw. */
test("no note on the status board sends anyone to a phase probe", () => {
  const board = spawnSync(process.execPath, ["scripts/qa/audit-status.mjs", "--json"], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
  });
  assert.equal(board.status, 0, board.stderr);
  const rows = JSON.parse(board.stdout);
  assert.ok(rows.length >= 70, `only ${rows.length} rows on the board`);
  const sends = rows.filter((r) => /phase\d*-probe/.test(r.note)).map((r) => `${r.id}: ${r.note}`);
  assert.deepEqual(sends, []);
});
