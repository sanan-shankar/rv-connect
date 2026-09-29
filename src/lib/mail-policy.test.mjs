import assert from "node:assert/strict";
import test from "node:test";

import {
  PRIORITY,
  eligibleKindsFor,
  isTransientMailError,
  isRetryableSkip,
  SKIP_NO_USER,
  SKIP_TOKEN_RATE_LIMIT,
  quotaExceeded,
  retryDelayMs,
  MAX_ATTEMPTS,
  MAX_DEFERRALS,
  ATTEMPT_RETRY_MS,
  localDrainRecipient,
  drainEligible,
  drainHasWork,
  STALE_CLAIM_MS,
  RETRY_RESET,
  confirmationStillWaiting,
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


/* ---- a rate-limited token mint is not the same as a dead row (M52) ----- */

test("a token-mint rate limit is worth waiting out; nothing else is", () => {
  // Asserted through the constants the queue actually writes, so rewording a
  // skip message cannot quietly turn a retryable one permanent.
  assert.equal(isRetryableSkip(SKIP_TOKEN_RATE_LIMIT), true);
  assert.equal(isRetryableSkip(SKIP_NO_USER), false);
  assert.equal(isRetryableSkip("something unrecognised"), false);
  assert.equal(isRetryableSkip(""), false);
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

/* --- Who a development machine may drain for (audit M53) ------------------ */

test("production drains for everybody", () => {
  assert.equal(
    localDrainRecipient({ NODE_ENV: "production", ADMIN_EMAIL: "owner@example.com" }),
    null
  );
});

test("development narrows the drain to the owner's own address", () => {
  assert.equal(
    localDrainRecipient({ NODE_ENV: "development", ADMIN_EMAIL: "Owner@Example.com " }),
    "owner@example.com"
  );
});

test("development with no ADMIN_EMAIL narrows to nothing, never to everybody", () => {
  // The fail-closed direction, and the whole point. Returning null here would
  // mean "select for anybody", so a developer with EMAIL_DEV_SEND=1 and no
  // ADMIN_EMAIL would drain every real member's queued mail -- the missing
  // variable reintroducing the incident the set one guards against. The empty
  // string matches no row, because no queued message is addressed to nothing.
  assert.equal(localDrainRecipient({ NODE_ENV: "development" }), "");
  assert.equal(localDrainRecipient({ NODE_ENV: "test", ADMIN_EMAIL: "   " }), "");
  // ...and production is the ONLY environment that drains for everybody.
  assert.equal(localDrainRecipient({ NODE_ENV: "production" }), null);
});

/* --- The admin panel's Retry (audit C-102) -------------------------------- *
 *
 * A row retired by a provider outage is `failed` with deferrals at the ceiling
 * and, because a transient failure hands its attempt back, possibly attempts
 * at zero. Retry reset the status and the attempts and left the deferrals, so
 * the row came back `queued` and the drain never selected it again. For a
 * reset -- which folds -- every later "forgot my password" for that member
 * folded into the zombie and returned without sending.
 * ------------------------------------------------------------------------- */

const NOW = new Date("2026-08-24T12:00:00Z");

const deadRow = () => ({
  // What bookFailure's give-up branch leaves behind.
  status: "failed",
  attempts: 0,
  deferrals: MAX_DEFERRALS,
  nextAttemptAt: new Date(NOW.getTime() + 60_000),
});

test("a provider-exhausted row is invisible to the drain", () => {
  assert.equal(drainEligible(deadRow(), NOW), false);
  // ...including after a reset that only moves the status and the attempts,
  // which is exactly what the button used to write.
  const halfReset = { ...deadRow(), status: "queued", attempts: 0 };
  assert.equal(drainEligible(halfReset, NOW), false, "the deferral ceiling was not the blocker");
});

test("Retry produces a row the drain will actually pick up", () => {
  const retried = { ...deadRow(), ...RETRY_RESET };
  assert.equal(drainEligible(retried, NOW), true);
});

test("Retry resets every counter the drain's selection reads", () => {
  // Pin the property, not the list: whatever drainEligible consults, Retry
  // must write. A fifth counter added to the predicate without being added to
  // the reset fails here rather than in production six months later.
  const retried = { ...deadRow(), ...RETRY_RESET };
  for (const [field, ceiling] of [
    ["attempts", MAX_ATTEMPTS],
    ["deferrals", MAX_DEFERRALS],
  ]) {
    assert.ok(field in RETRY_RESET, `Retry does not reset ${field}`);
    assert.ok(retried[field] < ceiling, `Retry leaves ${field} at or past its ceiling`);
  }
  assert.equal(retried.status, "queued");
  assert.equal(retried.nextAttemptAt, null, "Retry leaves a future nextAttemptAt in place");
});

test("the drain still refuses a row that is genuinely not ready", () => {
  const base = { status: "queued", attempts: 0, deferrals: 0, nextAttemptAt: null };
  assert.equal(drainEligible(base, NOW), true);
  assert.equal(drainEligible({ ...base, status: "sending" }, NOW), false);
  assert.equal(drainEligible({ ...base, attempts: MAX_ATTEMPTS }, NOW), false);
  assert.equal(drainEligible({ ...base, deferrals: MAX_DEFERRALS }, NOW), false);
  assert.equal(
    drainEligible({ ...base, nextAttemptAt: new Date(NOW.getTime() + 1) }, NOW),
    false
  );
  assert.equal(
    drainEligible({ ...base, nextAttemptAt: new Date(NOW.getTime() - 1) }, NOW),
    true
  );
});

test("an empty queue is not a reason to run a drain pass", () => {
  // C-104: the pass ran on every authenticated page view -- lease, reclaim,
  // four budget counts, release -- with nothing to send.
  assert.equal(drainHasWork({ status: "sent", claimedAt: null }, NOW), false);
  assert.equal(drainHasWork({ status: "failed", claimedAt: null }, NOW), false);
  assert.equal(drainHasWork({ status: "queued", claimedAt: null }, NOW), true);
});

test("a stale claim IS a reason, because nobody else will reclaim it", () => {
  // The arm that makes the precheck safe. A row whose sender died mid-send is
  // returned to the queue by the drain and by nothing else, so a precheck that
  // counted only `queued` would strand it in "sending" for ever.
  const fresh = new Date(NOW.getTime() - STALE_CLAIM_MS + 1000);
  const stale = new Date(NOW.getTime() - STALE_CLAIM_MS - 1000);
  assert.equal(drainHasWork({ status: "sending", claimedAt: stale }, NOW), true);
  assert.equal(drainHasWork({ status: "sending", claimedAt: fresh }, NOW), false);
  // A "sending" row with no claim stamp at all is not a stale claim; it is a
  // row mid-write, and guessing about it is how a message gets sent twice.
  assert.equal(drainHasWork({ status: "sending", claimedAt: null }, NOW), false);
});

/* ------------------------------------------------------------------ *
 *  Waiting counts as confirmed (owner, 2026-09-29, launch day).
 *
 *  "until we have sent the verification email, they should continue to
 *  have full access ... if we've sent the email and they've not verified,
 *  then shut it down." The daily email limit is ours, so a member stuck
 *  behind it keeps the site; the moment one confirmation goes out to the
 *  address on their account, the ordinary gate applies.
 * ------------------------------------------------------------------ */

const ME = "priya@example.com";
const row = (over = {}) => ({ to: ME, status: "queued", sentAt: null, ...over });
const SENT_AT = new Date("2026-09-29T00:00:05Z");

test("a confirmation still in the queue, never sent, keeps the gate open", () => {
  assert.equal(confirmationStillWaiting([row()], ME), true);
  // Mid-send is still waiting: it has not reached them yet.
  assert.equal(confirmationStillWaiting([row({ status: "sending" })], ME), true);
});

test("once one has gone out, waiting is over for good", () => {
  assert.equal(confirmationStillWaiting([row({ status: "sent", sentAt: SENT_AT })], ME), false);
  // A resend queued AFTER one went out does not reopen anything: they were
  // sent a link, and the owner's rule is to shut it down until they tap it.
  assert.equal(
    confirmationStillWaiting([row(), row({ status: "sent", sentAt: SENT_AT })], ME),
    false
  );
});

test("a bounce was sent, so it is not waiting either", () => {
  // The webhook flips a bounced row to failed and leaves sentAt alone.
  assert.equal(
    confirmationStillWaiting([row({ status: "failed", sentAt: SENT_AT })], ME),
    false
  );
});

test("a row that gave up without sending is waiting on a fix, not on the limit", () => {
  assert.equal(confirmationStillWaiting([row({ status: "failed" })], ME), false);
  // ...but an earlier give-up does not cancel a live row behind it.
  assert.equal(confirmationStillWaiting([row({ status: "failed" }), row()], ME), true);
});

test("nothing on file is not waiting", () => {
  assert.equal(confirmationStillWaiting([], ME), false);
});

test("only mail to the address on the account counts", () => {
  // A member whose first address bounced and who moved to another has never
  // been sent anything they could open. Their new link's wait is real.
  const bouncedOld = row({ to: "old@example.com", status: "failed", sentAt: SENT_AT });
  assert.equal(confirmationStillWaiting([bouncedOld, row()], ME), true);
  // And a queued row for an address they have left does not hold the gate open.
  assert.equal(confirmationStillWaiting([row({ to: "old@example.com" })], ME), false);
});

test("the address comparison ignores case and stray spaces", () => {
  assert.equal(confirmationStillWaiting([row({ to: " Priya@Example.com" })], ME), true);
  assert.equal(
    confirmationStillWaiting([row({ to: "PRIYA@example.com", status: "sent", sentAt: SENT_AT })], ME),
    false
  );
});
