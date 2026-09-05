import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The shapes that made the mail queue lose mail.
 *
 *  The policy itself is unit-tested in mail-policy.test.mjs, where it can
 *  be called. These are the joins between that policy and the queue, which
 *  need a database and a provider outage to exercise for real -- so what is
 *  pinned here is the shape, in the security-regressions.test.mjs style.
 * ------------------------------------------------------------------ */

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

test("the drain's own selection reads the same counters drainEligible does", () => {
  /* drainEligible (mail-policy.ts) is the callable copy of the where clause
     below, and the Retry button is tested against it -- so if the two ever
     part company the test that proves Retry works proves nothing (audit
     C-102). Pin the join: every field the predicate consults appears in the
     drain's selection. */
  const find = queue.slice(queue.indexOf("async function drainWithLease"));
  for (const field of ["status", "attempts", "deferrals", "nextAttemptAt"]) {
    assert.ok(
      new RegExp(`${field}:`).test(find),
      `the drain no longer selects on ${field}, which drainEligible still weighs`
    );
  }
});

test("the admin Retry writes the shared reset, not a hand-listed one", () => {
  const retry = decomment(read("src/app/(main)/admin/mail/actions.ts"));
  assert.ok(/RETRY_RESET/.test(retry), "retryMail hand-lists the columns it resets again");
  assert.ok(
    !/data:\s*\{\s*status:\s*"queued"/.test(retry),
    "retryMail writes its own requeue payload again"
  );
});

test("the lease outlives the pass that holds it", () => {
  /* One pass at a time is the whole point of the lease, and it lapsed exactly
     when it mattered: BATCH sends at SEND_TIMEOUT_MS each is 80 seconds
     against a 45-second lease, so during a provider brownout -- the condition
     the lease exists for -- a second pass took it mid-flight and the two ran
     together, reopening the self-inflicted 429 storm (bug-report-2 C-108).

     Renewal rather than a longer lease, deliberately: a lease sized for the
     worst case would stall the queue for that long every time an instance was
     frozen mid-drain. The arithmetic is pinned below, so raising BATCH or the
     timeout cannot quietly re-open the gap. */
  assert.match(queue, /async function renewDrainLease/, "the drain no longer renews its lease");
  const pass = queue.slice(queue.indexOf("async function drainWithLease"));
  const loop = pass.slice(pass.indexOf("for (let i = 0"));
  const renewAt = loop.search(/renewDrainLease\(holder\)/);
  const sendAt = loop.search(/claimAndSend\(/);
  assert.ok(renewAt !== -1, "the pass takes the lease once and never looks at it again");
  assert.ok(renewAt < sendAt, "the lease is renewed after the send, not before it");
  assert.match(loop, /if \(!\(await renewDrainLease\(holder\)\)\) break/, "a lost lease no longer stops the pass");
});

test("a single send always fits inside the lease", () => {
  // The renewal covers a whole pass; this covers one send, which nothing can
  // interrupt. Read from both files so changing either is what fails.
  const lease = Number(/DRAIN_LEASE_MS = ([\d_]+)/.exec(queue)?.[1].replace(/_/g, ""));
  const timeout = Number(/SEND_TIMEOUT_MS = ([\d_]+)/.exec(mail)?.[1].replace(/_/g, ""));
  assert.ok(Number.isFinite(lease) && Number.isFinite(timeout), "the two constants no longer parse");
  assert.ok(
    lease >= timeout * 2,
    `the drain lease (${lease}ms) leaves no room around one send (${timeout}ms): a pass would ` +
      `lose the lease inside a single slow send, whatever it renews`
  );
});

test("the confirmation ETA counts the queue in front of it", () => {
  /* The banner prints this as a clock time -- "your link goes out tomorrow at
     5:30 am" -- and it was the next UTC midnight for everybody, with no
     queue-depth term. The drain is oldest-first, so on a 300-signup launch day
     the person at position 200 was told tomorrow and waited three days
     (bug-report-2 C-161). */
  assert.match(queue, /async function verifySendingAt/, "the confirmation ETA is a flat calendar date again");
  const body = balancedBody(queue, "async function verifySendingAt");
  assert.match(body, /outboundEmail\.count/, "the ETA no longer counts anything");
  assert.match(body, /createdAt:\s*\{\s*lt:/, "the ETA counts rows that are not actually ahead of this one");
  assert.match(body, /VERIFY_PER_DAY/, "the ETA divides by something other than a day's verify budget");
  // ...and the state that prints it is the one that uses it.
  assert.match(
    queue,
    /sendingAt:\s*await verifySendingAt\(row\)/,
    "verificationMailState went back to promising the next budget reset to everybody"
  );
});

test("an empty queue costs one read, not the whole pass", () => {
  /* C-104. drainMailQueue runs in `after()` on every authenticated page view.
     Without a precheck it took the lease (a write), reclaimed (a write),
     counted the budget four times, counted the backlog and released the lease
     (a write) -- around nine statements to send nothing.

     Asserted on ORDER, because a precheck that happens after the lease is
     the same cost it was meant to remove. */
  const fn = queue.slice(queue.indexOf("export async function drainMailQueue"));
  const body = fn.slice(0, fn.indexOf("\nasync function drainWithLease"));
  assert.ok(body.length > 400, "drainMailQueue's body did not slice; this test is vacuous");

  const precheck = body.indexOf("outboundEmail.count");
  const lease = body.indexOf("takeDrainLease()");
  assert.ok(precheck > -1, "the empty-queue precheck is gone (C-104)");
  assert.ok(lease > -1, "the drain lease is gone (B-072)");
  assert.ok(
    precheck < lease,
    "the precheck runs after the lease is taken, which is the cost it exists to avoid"
  );
  assert.ok(
    /if \(pending === 0\) return/.test(body),
    "the precheck's answer is read but not acted on -- the pass runs anyway"
  );
});

test("the precheck counts stale claims too, or a dead send is stranded", () => {
  /* The dangerous half of C-104. Reclaiming a row whose sender died mid-send
     is the drain's own job, so a precheck that counted only `queued` would
     skip the only pass that could ever rescue it. Both arms, and the same
     window the reclaim uses -- imported from mail-policy, not typed twice. */
  const fn = queue.slice(queue.indexOf("export async function drainMailQueue"));
  const body = fn.slice(0, fn.indexOf("\nasync function drainWithLease"));
  const where = body.slice(body.indexOf("outboundEmail.count"), body.indexOf("if (pending === 0)"));
  assert.ok(/status: "queued"/.test(where), "the precheck stopped counting queued rows");
  assert.ok(
    /status: "sending"/.test(where) && /claimedAt: \{ lt:/.test(where),
    "the precheck no longer counts a stale claim, so a dead send is never reclaimed"
  );
  assert.ok(
    /STALE_CLAIM_MS/.test(where),
    "the precheck's stale window is typed out rather than shared with the reclaim"
  );
  assert.ok(
    !/const STALE_CLAIM_MS/.test(queue),
    "STALE_CLAIM_MS is defined locally again; it must come from mail-policy so " +
      "drainHasWork and the query cannot drift"
  );
});
