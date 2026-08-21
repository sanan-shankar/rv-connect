import assert from "node:assert/strict";
import test from "node:test";

import {
  PRIORITY,
  eligibleKindsFor,
  isTransientMailError,
  quotaExceeded,
  retryDelayMs,
  MAX_ATTEMPTS,
  MAX_DEFERRALS,
  ATTEMPT_RETRY_MS,
} from "./mail-policy.ts";

test("a rate limit is the provider's problem, not the address's", () => {
  assert.equal(
    isTransientMailError({ name: "rate_limit_exceeded", statusCode: 429, message: "Too many" }),
    true
  );
  assert.equal(isTransientMailError({ name: "internal_server_error", statusCode: 500 }), true);
  assert.equal(isTransientMailError({ name: "application_error", statusCode: 500 }), true);
});

test("a bad address is permanent and must stop being retried", () => {
  assert.equal(isTransientMailError({ name: "validation_error", statusCode: 422 }), false);
  assert.equal(isTransientMailError({ name: "invalid_from_address", statusCode: 403 }), false);
  assert.equal(isTransientMailError({ name: "invalid_api_key", statusCode: 401 }), false);
  assert.equal(isTransientMailError({ name: "not_found", statusCode: 404 }), false);
});

test("any 5xx or 429 counts as transient even under an unfamiliar code name", () => {
  assert.equal(isTransientMailError({ name: "something_new", statusCode: 503 }), true);
  assert.equal(isTransientMailError({ name: "something_new", statusCode: 429 }), true);
  assert.equal(isTransientMailError({ name: "something_new", statusCode: 400 }), false);
});

test("a thrown network error is transient", () => {
  assert.equal(isTransientMailError({ message: "fetch failed" }), true);
  assert.equal(isTransientMailError({ message: "The operation was aborted" }), true);
  assert.equal(isTransientMailError({ message: "socket hang up" }), true);
  assert.equal(isTransientMailError({ message: "read ECONNRESET" }), true);
  assert.equal(isTransientMailError({ message: "Recipient is invalid" }), false);
});

test("nothing is transient by accident", () => {
  assert.equal(isTransientMailError(null), false);
  assert.equal(isTransientMailError(undefined), false);
  assert.equal(isTransientMailError({}), false);
});

test("a spent quota is recognised separately, so it waits for the new day", () => {
  assert.equal(quotaExceeded({ name: "daily_quota_exceeded" }), true);
  assert.equal(quotaExceeded({ name: "monthly_quota_exceeded" }), true);
  assert.equal(quotaExceeded({ name: "rate_limit_exceeded" }), false);
  assert.equal(quotaExceeded(null), false);
});

test("the backoff grows and then stops growing", () => {
  const minutes = [];
  for (let i = 0; i <= MAX_DEFERRALS; i++) minutes.push(retryDelayMs(i) / 60_000);
  assert.deepEqual(minutes.slice(0, 7), [1, 2, 5, 10, 20, 40, 60]);
  // Past the end of the schedule it flattens rather than doubling forever.
  assert.equal(retryDelayMs(50), 60 * 60_000);
  // Every step is at least as long as the one before it.
  for (let i = 1; i < minutes.length; i++) assert.ok(minutes[i] >= minutes[i - 1]);
});

test("every wait is long enough to outlive a single drain pass", () => {
  // This is the whole point of B-002: the shortest possible retry delay has to
  // exceed the time one pass takes, or the row is re-selected inside it and
  // four attempts burn in four seconds.
  const ONE_PASS_MS = 30_000;
  assert.ok(retryDelayMs(0) > ONE_PASS_MS, "the first retry is inside one drain pass");
  assert.ok(ATTEMPT_RETRY_MS > ONE_PASS_MS, "the attempt retry is inside one drain pass");
});

test("the ceilings leave room to be patient without being useless", () => {
  const totalMinutes = Array.from({ length: MAX_DEFERRALS }, (_, i) => retryDelayMs(i) / 60_000).reduce(
    (a, b) => a + b,
    0
  );
  assert.ok(totalMinutes > 120, `gives up after only ${totalMinutes} minutes of provider trouble`);
  assert.ok(totalMinutes < 60 * 24, `keeps trying for ${totalMinutes} minutes, long past useful`);
  assert.ok(MAX_ATTEMPTS >= 3 && MAX_ATTEMPTS <= 6);
});


/* ---- eligibility: no kind of mail may be un-drainable (B-070) ---------- */

test("every kind the queue can hold is one the drain can select", () => {
  // The bug this pins: `deletion-scheduled` existed in MailKind, in PRIORITY,
  // in ENQUEUE_LIMIT and in render(), and was missing from the drain's
  // hard-coded eligible list — so every account-deletion confirmation, and
  // every takeover alarm during the 60-day undo window, sat queued forever
  // with no way to notice.
  const withBudget = eligibleKindsFor(50);
  for (const kind of Object.keys(PRIORITY)) {
    assert.ok(
      withBudget.includes(kind),
      `${kind} is queueable but the drain can never select it`
    );
  }
});

test("confirmations stop at the reserve line and nothing else does", () => {
  const spent = eligibleKindsFor(0);
  assert.ok(!spent.includes("verify"), "confirmations keep spending past the reserve");
  for (const kind of Object.keys(PRIORITY)) {
    if (kind === "verify") continue;
    assert.ok(spent.includes(kind), `${kind} is blocked once confirmations run out`);
  }
});

test("a reset outranks a confirmation, and a security notice sits between", () => {
  assert.ok(PRIORITY.reset < PRIORITY["password-changed"]);
  assert.ok(PRIORITY["password-changed"] < PRIORITY.verify);
  assert.equal(PRIORITY["deletion-scheduled"], PRIORITY["password-changed"]);
});
