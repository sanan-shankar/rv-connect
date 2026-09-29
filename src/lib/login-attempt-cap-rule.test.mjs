import test from "node:test";
import assert from "node:assert/strict";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A refused sign-in cannot grow the database without bound.
 *
 *  recordLoginAttempt wrote one row per refusal, so a bot the limiter
 *  had already stopped still filled LoginAttempt at its own pace, and the
 *  Free plan turns the whole database read-only at 500 MB (bug audit 3,
 *  L5-02). The writer now counts the last hour's failure rows first and
 *  writes nothing past the cap. This pins the three things that make that
 *  true: the cap exists and is small, the count runs before the insert,
 *  and it only ever applies to failures.
 * ------------------------------------------------------------------ */

const src = decomment(read("src/lib/login-attempt.ts"));

test("failure rows are capped per hour, and the cap is small", () => {
  const m = src.match(/export const FAILURE_ROWS_PER_HOUR = (\d+);/);
  assert.ok(m, "FAILURE_ROWS_PER_HOUR is gone; a sign-in flood can fill the database again");
  const cap = Number(m[1]);
  // 500 rows an hour is ~6 MB a day of a bot's rows; past that the cap
  // stops protecting a 500 MB database in any useful time.
  assert.ok(cap > 0 && cap <= 500, `a cap of ${cap} failure rows an hour does not bound a flood`);
});

test("the cap is checked before the insert, for failures only", () => {
  const body = balancedBody(src, "const write = async () =>");
  assert.ok(body, "recordLoginAttempt's write function moved; re-point this test");
  const guard = body.indexOf("if (!input.ok)");
  const count = body.indexOf('FROM "LoginAttempt"');
  const insert = body.indexOf("loginAttempt.create(");
  assert.ok(guard !== -1 && count > guard, "the failure-row count is missing, or no longer limited to failures");
  assert.ok(insert > count, "the insert runs before the cap is checked");
  assert.match(body, /NOT ok AND "createdAt" > now\(\) - interval '1 hour'/, "the cap no longer counts the last hour's failures");
  assert.match(body, /if \(n >= FAILURE_ROWS_PER_HOUR\) return;/, "a full hour no longer stops the write");
});
