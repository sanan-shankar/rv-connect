import assert from "node:assert/strict";
import test from "node:test";

import { startOfUtcDay } from "./mail-policy.ts";
import { read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The machinery nobody watches: the mail queue, the nightly sweep,
 *  the purge, the rate limiters.
 *
 *  Every finding here shares a shape. These paths run with no human on
 *  them, so a failure has no symptom until somebody asks where their
 *  email went, or a table is large enough to notice. What is pinned is
 *  that each one either cannot fail silently, or cannot fail at all.
 * ------------------------------------------------------------------ */


const QUEUE = decomment(read("src/lib/email-queue.ts"));

/* ---- C-103: every enqueue path wakes the drain ------------------ */

test("C-103: the fold path nudges the drain, like the create path", () => {
  /* The fold is what a member pressing "resend" hits. Its `return` sat above
     `scheduleDrain()`, so the one path a stuck queue is most likely to be
     poked through was the only one that never poked it. */
  const from = QUEUE.indexOf("export async function enqueueMail");
  assert.ok(from > 0);
  const body = QUEUE.slice(from, QUEUE.indexOf("\nexport ", from + 10));
  const returns = [...body.matchAll(/return \{ queued: true/g)];
  assert.ok(returns.length >= 2, `only ${returns.length} success returns; the shape has drifted`);
  for (const r of returns) {
    const before = body.slice(0, r.index);
    assert.ok(
      before.lastIndexOf("scheduleDrain()") > before.lastIndexOf("await prisma.outboundEmail"),
      "a success return is reached without scheduling a drain first"
    );
  }
});

/* ---- C-105: "sent" always means a provider accepted it ---------- */

test("C-105: the dev branch fails closed on a missing key, like production", () => {
  const from = QUEUE.indexOf("function queueIsSendable");
  const body = QUEUE.slice(from, QUEUE.indexOf("\n}", from) + 2);
  /* The GUARD, not the word. Counting every mention of RESEND_API_KEY passed
     against a body where the dev branch's check had been replaced by
     `if (false)` -- the two remaining hits were the production check and its
     own error message. Match what actually decides. */
  const guards = [...body.matchAll(/if \(!process\.env\.RESEND_API_KEY\)/g)];
  assert.equal(
    guards.length,
    2,
    `${guards.length} of the 2 branches require a key; a branch without one marks rows sent off a console.log`
  );
  assert.match(body, /EMAIL_DEV_SEND/, "the dev branch moved");
});

/* ---- C-107: "imminent" means imminent --------------------------- */

test("C-107: a far-future retry is reported as queued, with its time", () => {
  assert.match(QUEUE, /const IMMINENT_WINDOW_MS = /, "there is no bound on what counts as imminent");
  const from = QUEUE.indexOf("export async function verificationMailState");
  const body = QUEUE.slice(from);
  assert.match(
    body,
    /waitUntil\.getTime\(\) - Date\.now\(\) > IMMINENT_WINDOW_MS/,
    "a provider-quota deferral still falls through to copy asserting a completed send"
  );
  assert.ok(
    body.indexOf("IMMINENT_WINDOW_MS") < body.lastIndexOf('return { state: "imminent" }'),
    "the check has to come before the imminent fallback it exists to guard"
  );
});

/* ---- C-153/C-154: a silent failure leaves a witness ------------- */

test("C-153: no drain failure is swallowed to the console alone", () => {
  /* Counted per site, not detected: three catches, and two of three reporting
     is not the fix. */
  for (const step of ["targeted-send", "drain", "record-sent", "take-drain-lease"]) {
    assert.match(
      QUEUE,
      new RegExp(`reportSwallowed\\("email", err, \\{ step: "${step}"`),
      `the ${step} failure has no witness but a serverless console line`
    );
  }
  assert.doesNotMatch(QUEUE, /console\.error\("\[email\] drain failed"/, "the bare console line is back");
});

test("C-153: the drain lease reads only a unique violation as 'somebody has it'", () => {
  const from = QUEUE.indexOf("async function takeDrainLease");
  const body = QUEUE.slice(from, QUEUE.indexOf("\n}", from) + 2);
  assert.match(
    body,
    /if \(!isUniqueViolation\(err\)\)/,
    "a pool timeout still reads as a held lease, so a database that stopped answering looks like a busy queue"
  );
});

test("C-154: a limiter that fails open says so where somebody looks", () => {
  const src = decomment(read("src/lib/rate-limit.ts"));
  assert.match(src, /function reportLimiterFailure\(/, "there is no reporter");
  const calls = [...src.matchAll(/reportLimiterFailure\(name, "(check|read|consume)"/g)];
  assert.equal(calls.length, 3, `${calls.length} of the 3 fail-open catches report`);
  assert.match(src, /REPORT_EVERY_MS/, "unthrottled, so an outage reports once per request");
  assert.doesNotMatch(src, /console\.error\(`\[rate-limit\]/, "a bare console line is back");
});

/* ---- C-076/C-118: the purge cannot leak or explode -------------- */

test("C-076: the purge transaction runs at the isolation its comment relies on", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  assert.match(
    src,
    /isolationLevel: "RepeatableRead"/,
    'collectImageUrls claims nothing uploaded mid-purge can slip past, which READ COMMITTED does not give'
  );
});

test("C-118: the purge drain's failure branch cannot throw", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  assert.match(
    src,
    /prisma\.pendingImagePurge\.updateMany\(\{\s*where: \{ id: row\.id \}/,
    "the bookkeeping for a failed delete still throws P2025 when a concurrent drain took the row"
  );
});

/* ---- C-062: retention removes the shell with the transcript ----- */

test("C-062: an emptied thread goes with its messages", () => {
  const src = decomment(read("src/lib/retention.ts"));
  const from = src.indexOf('step("adminMessages"');
  const body = src.slice(from, src.indexOf("\n  );", from));
  assert.match(
    body,
    /tx\.adminThread\.deleteMany\(\{ where: \{ messages: \{ none: \{\} \} \} \}\)/,
    "purging a conversation's messages leaves the thread, whose subject is the member's own words"
  );
  // In the same transaction as the delete it depends on.
  assert.ok(body.indexOf("adminThread.deleteMany") > body.indexOf("adminMessage.deleteMany"));
});

/* ---- C-079: a nightly pass is given room to finish -------------- */

test("C-079: both cron routes declare a maxDuration", () => {
  for (const route of ["src/app/api/retention/sweep/route.ts", "src/app/api/catchups/tick/route.ts"]) {
    assert.match(
      decomment(read(route)),
      /export const maxDuration = \d+;/,
      `${route} runs on the platform default, so a long pass is cut off without reaching its reporter`
    );
  }
});

/* ---- C-079, second half: so does anything that re-encodes an image ----

   The finding was about a nightly pass, and the same hole was open on every
   upload surface for the same reason. A 40MP photograph needs about 16 seconds
   of CPU before either R2 round trip, and past the platform default the
   invocation is KILLED -- the member sees a failed contribution and nothing is
   reported anywhere, because the process dies before any error handler runs.
   Measured 2026-09-02 (bugs.md item 21).

   The two pages are here because a Server Action inherits its timeout from the
   page that hosts it, not from the file it is written in: `maxDuration` on
   `collection/actions.ts` would do nothing at all. */

test("C-079: every surface that re-encodes an image declares a maxDuration", () => {
  for (const file of [
    "src/app/(main)/collection/(index)/page.tsx",
    "src/app/(main)/collection/[id]/page.tsx",
    "src/app/api/upload/route.ts",
    "src/app/api/upload/finalize/route.ts",
  ]) {
    assert.match(
      decomment(read(file)),
      /export const maxDuration = \d+;/,
      `${file} re-encodes photographs on the platform default, so a large one is cut off silently`
    );
  }
});

/* ---- C-106/C-083: the day's budget survives a dismissal --------- */

test("C-106: dismissMail refuses to delete a row already counted against today", () => {
  const src = decomment(read("src/app/(main)/admin/mail/actions.ts"));
  const from = src.indexOf("export async function dismissMail");
  const body = src.slice(from);
  assert.match(
    body,
    /row\.sentAt && row\.sentAt >= startOfUtcDay\(\)/,
    "deleting a same-day accepted row hands back a slot Resend has already spent (B-071)"
  );
  assert.match(body, /deleteMany\(\{ where: \{ id, status: "failed" \} \}\)/, "the delete is unconditional (C-083)");
  assert.match(body, /cleared\.count === 0/, "a row that moved on is deleted anyway");
});

test("C-106: the budget and the dismissal read the same day boundary", () => {
  /* They disagreed once by being two functions; now there is one, and it is
     pure enough to check here directly. */
  const d = startOfUtcDay();
  assert.equal(d.getUTCHours(), 0);
  assert.equal(d.getUTCMinutes(), 0);
  assert.equal(d.getUTCSeconds(), 0);
  assert.ok(d.getTime() <= Date.now(), "the boundary is in the future");
  assert.ok(Date.now() - d.getTime() < 24 * 3600_000, "the boundary is more than a day old");
  assert.match(QUEUE, /sentAt: \{ gte: startOfUtcDay\(\) \}/, "the budget no longer uses the shared boundary");
});

/* ---- C-078: the export keeps its own promise -------------------- */

test("C-078: every member-authored model has an export section", () => {
  /* DERIVED from the schema, not listed: the questions somebody ASKED were
     missing for months while the file's header promised "what the person gave
     the site or wrote on it". */
  const schema = read("prisma/schema.prisma");
  const exportSrc = decomment(read("src/app/api/account/export/route.ts"));
  const authored = [
    ["CatchupPrompt", "catchupPrompt"],
    ["CatchupEntry", "catchupEntry"],
    ["Post", "post"],
    ["Comment", "comment"],
    ["AdminMessage", "adminMessage"],
    ["Photo", "photo"],
  ];
  for (const [model, client] of authored) {
    assert.match(schema, new RegExp(`model ${model} \\{`), `${model} is gone from the schema`);
    assert.match(
      exportSrc,
      new RegExp(`prisma\\.${client}\\.findMany\\(`),
      `${model} carries what a member wrote, and the export does not read it`
    );
  }
});

/* ---- C-146: the operator and the member name the same day ---------- */

test("C-146: an audit-log date is a valley day, like the email beside it", () => {
  /* The deletion request writes an audit line and posts the member a
     confirmation naming the purge date. The line used
     `toISOString().slice(0, 10)` -- a UTC day -- while the email formats in
     the valley's zone with a comment above it explaining exactly why it must.
     For any request made between midnight and 05:30 IST the two named
     different days, and an admin cross-checking them had nothing to say which
     was right. */
  const files = {
    "src/components/settings/actions.ts": decomment(read("src/components/settings/actions.ts")),
    "src/lib/retention.ts": decomment(read("src/lib/retention.ts")),
  };
  const offenders = [];
  let details = 0;
  for (const [name, src] of Object.entries(files)) {
    for (const m of src.matchAll(/detail:[\s\S]{0,400}?,\n/g)) {
      details++;
      if (/toISOString\(\)\.slice\(0, ?10\)/.test(m[0])) offenders.push(`${name}: ${m[0].slice(0, 90)}`);
    }
  }
  assert.ok(details >= 2, `only found ${details} audit details; this sweep has stopped matching`);
  assert.deepEqual(
    offenders,
    [],
    "an audit-log detail names a UTC day again while the member is told a valley one:\n" +
      offenders.join("\n")
  );
  assert.ok(
    /valleyDayKey\(/.test(files["src/components/settings/actions.ts"]) &&
      /valleyDayKey\(/.test(files["src/lib/retention.ts"]),
    "an audit date stopped going through valleyDayKey"
  );
});

/* ---- C-116: the gauntlet's outside call has a deadline ------------- */

test("C-116: the NYT fetch cannot hang the /dark-mode render", () => {
  /* The catch below it only ever caught a REJECTION, and the failure this file
     exists to survive is an endpoint that accepts the connection and never
     replies -- which does not reject, so the fallback was unreachable in the
     one case it was written for and the first visitor after each cache expiry
     got a 504. */
  const WORDLE = decomment(read("src/lib/wordle.ts"));
  assert.ok(
    /AbortSignal\.timeout\(/.test(WORDLE),
    "getWordleAnswer's fetch has no deadline again (C-116)"
  );
  const call = WORDLE.slice(WORDLE.indexOf("fetch("), WORDLE.indexOf("if (res.ok)"));
  assert.ok(call.length > 40, "the fetch call did not slice; this test is vacuous");
  assert.ok(/signal:/.test(call), "the deadline is declared but not passed to the fetch");
  assert.ok(/FALLBACK_WORDS/.test(WORDLE), "the offline fallback is gone");
});

/* ---- C-046: every writer of verifyState stamps verifyStateAt -------- */

test("C-046: nothing writes verifyState without stamping verifyStateAt", () => {
  /* The schema says so at the column: verifyStateAt is the only honest
     ordering the admin worklist has, and it defaults to now() at row creation
     and is never touched again. The roster import script set verifyState and
     left the stamp, so an entire import batch sorted by its members' SIGNUP
     times and never appeared in "recently verified".

     Swept across the app AND the scripts, because the one that got it wrong
     was a script, which no typechecker was going to catch. */
  const sources = [
    ["src/components/auth/verification-actions.ts", null],
    ["src/app/(main)/admin/people/actions.ts", null],
    ["src/lib/roster.ts", null],
    ["scripts/dev/import-roster.mjs", null],
  ];
  let writes = 0;
  const offenders = [];
  for (const [name] of sources) {
    const src = decomment(read(name));
    /* Prisma writers say `verifyState: "..."` and raw SQL says
       `"verifyState" = '...'`, and BOTH forms appear in a where/WHERE clause
       too, where they are a read and owe nothing. Told apart by which
       introducer is nearer -- `data:`/`SET` means a write, `where:`/`WHERE`
       means a read. A lookback window cannot do this: an updateMany's data
       block sits a few dozen characters after its own where block. */
    for (const m of src.matchAll(/(verifyState: "|"verifyState" = ')/g)) {
      const before = src.slice(0, m.index);
      const writeAt = Math.max(before.lastIndexOf("data:"), before.lastIndexOf("SET "));
      const readAt = Math.max(before.lastIndexOf("where:"), before.lastIndexOf("WHERE "));
      if (writeAt < readAt) continue;
      writes++;
      const window = src.slice(m.index, m.index + 500);
      if (!/verifyStateAt/.test(window)) offenders.push(`${name}: ${window.slice(0, 80)}`);
    }
  }
  assert.ok(writes >= 4, `only found ${writes} verifyState writes; this sweep has stopped matching`);
  assert.deepEqual(
    offenders,
    [],
    "verifyState written without verifyStateAt, against the schema's own rule:\n" +
      offenders.join("\n")
  );
});

/* ---- C-155: a broken query is not an answer ------------------------ */

test("C-155: pick-bird does not read a failed query as 'not a supporter'", () => {
  /* Both reads carried a .catch() into a value that changed the redirect, so a
     pool timeout at the busy moment payments cluster bounced somebody who HAD
     paid to the page whose one call to action is to pay again -- with nothing
     shown to say anything had gone wrong. */
  const PAGE = decomment(read("src/app/(main)/pick-bird/page.tsx"));
  assert.ok(PAGE.length > 400, "the pick-bird page did not read; this test is vacuous");
  assert.ok(
    !/\.catch\(/.test(PAGE),
    "pick-bird swallows a query failure again (C-155); a broken read must reach " +
      "the error boundary, not become a redirect to /support"
  );
  assert.ok(/redirect\("\/support"\)/.test(PAGE), "the supporter gate itself is gone");
});
