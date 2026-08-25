import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { startOfUtcDay } from "./mail-policy.ts";

/* ------------------------------------------------------------------ *
 *  The machinery nobody watches: the mail queue, the nightly sweep,
 *  the purge, the rate limiters.
 *
 *  Every finding here shares a shape. These paths run with no human on
 *  them, so a failure has no symptom until somebody asks where their
 *  email went, or a table is large enough to notice. What is pinned is
 *  that each one either cannot fail silently, or cannot fail at all.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const QUEUE = code(read("src/lib/email-queue.ts"));

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
  const src = code(read("src/lib/rate-limit.ts"));
  assert.match(src, /function reportLimiterFailure\(/, "there is no reporter");
  const calls = [...src.matchAll(/reportLimiterFailure\(name, "(check|read|consume)"/g)];
  assert.equal(calls.length, 3, `${calls.length} of the 3 fail-open catches report`);
  assert.match(src, /REPORT_EVERY_MS/, "unthrottled, so an outage reports once per request");
  assert.doesNotMatch(src, /console\.error\(`\[rate-limit\]/, "a bare console line is back");
});

/* ---- C-076/C-118: the purge cannot leak or explode -------------- */

test("C-076: the purge transaction runs at the isolation its comment relies on", () => {
  const src = code(read("src/lib/account-purge.ts"));
  assert.match(
    src,
    /isolationLevel: "RepeatableRead"/,
    'collectImageUrls claims nothing uploaded mid-purge can slip past, which READ COMMITTED does not give'
  );
});

test("C-118: the purge drain's failure branch cannot throw", () => {
  const src = code(read("src/lib/account-purge.ts"));
  assert.match(
    src,
    /prisma\.pendingImagePurge\.updateMany\(\{\s*where: \{ id: row\.id \}/,
    "the bookkeeping for a failed delete still throws P2025 when a concurrent drain took the row"
  );
});

/* ---- C-062: retention removes the shell with the transcript ----- */

test("C-062: an emptied thread goes with its messages", () => {
  const src = code(read("src/lib/retention.ts"));
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
      code(read(route)),
      /export const maxDuration = \d+;/,
      `${route} runs on the platform default, so a long pass is cut off without reaching its reporter`
    );
  }
});

/* ---- C-106/C-083: the day's budget survives a dismissal --------- */

test("C-106: dismissMail refuses to delete a row already counted against today", () => {
  const src = code(read("src/app/(main)/admin/mail/actions.ts"));
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
  const exportSrc = code(read("src/app/api/account/export/route.ts"));
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
