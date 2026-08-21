import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ *
 *  The shapes that made the mail queue lose mail.
 *
 *  The policy itself is unit-tested in mail-policy.test.mjs, where it can
 *  be called. These are the joins between that policy and the queue, which
 *  need a database and a provider outage to exercise for real -- so what is
 *  pinned here is the shape, in the security-regressions.test.mjs style.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

const queue = decomment(read("src/lib/email-queue.ts"));
const mail = decomment(read("src/lib/email.ts"));

test("the drain only picks up rows that are due", () => {
  // B-002: without this, a requeued row keeps its createdAt, stays the oldest
  // eligible row, and the next iteration of the SAME pass takes it again --
  // four attempts in four seconds, then permanently failed.
  assert.ok(
    /nextAttemptAt/.test(queue),
    "the drain no longer considers when a row may next be tried"
  );
  const find = queue.slice(queue.indexOf("async function drainWithLease"));
  assert.ok(
    /nextAttemptAt: \{ lte:/.test(find),
    "the drain's row selection does not filter on nextAttemptAt"
  );
});

test("the eligible kinds are derived, never typed out", () => {
  assert.ok(
    /eligibleKindsFor\(/.test(queue),
    "the drain builds its eligible-kind list by hand again (B-070)"
  );
  assert.ok(
    !/\["verify",\s*"reset"/.test(queue),
    "a hard-coded kind list is back in the drain"
  );
});

test("the daily budget counts what the provider accepted, not row status", () => {
  const fn = queue.slice(queue.indexOf("export async function dailyBudget"));
  const body = fn.slice(0, fn.indexOf("\n}\n") + 2);
  assert.ok(
    !/status: "sent"/.test(body),
    "dailyBudget filters on status again: a bounce webhook flipping a delivered " +
      "row to 'failed' hands back a budget slot Resend already spent (B-071)"
  );
  assert.ok(/sentAt: \{ gte:/.test(body), "dailyBudget no longer counts by sentAt");
  assert.ok(
    /status: "sending"/.test(body),
    "in-flight rows are not counted, so concurrent passes can each spend the same slot"
  );
});

test("one drain pass at a time, and not via an advisory lock", () => {
  assert.ok(/takeDrainLease/.test(queue), "the drain lease is gone (B-072)");
  assert.ok(
    !/pg_advisory/.test(queue),
    "a session-scoped advisory lock cannot work behind the transaction pooler"
  );
});

test("a provider failure is told apart from a bad address", () => {
  assert.ok(
    /transient/.test(mail),
    "sendMail no longer classifies its failures, so the queue cannot tell a " +
      "429 from a mistyped domain (B-002)"
  );
  assert.ok(
    /SEND_TIMEOUT_MS|Promise\.race/.test(mail),
    "sendMail has no deadline again; it is awaited inside a page render"
  );
});
