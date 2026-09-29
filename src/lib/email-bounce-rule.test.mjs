import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A bounced confirmation, end to end (change-email-actions.ts).
 *
 *  The member is told, they move to another address with their password,
 *  and the owner's to-do list stops showing it. Each join below needs a
 *  database, a provider and a bounce to exercise for real, so what is
 *  pinned is the shape, in the mail-queue-rule.test.mjs style. The pure
 *  halves (mailboxWasFull, the wording) are unit-tested beside them.
 * ------------------------------------------------------------------ */

const webhook = decomment(read("src/app/api/resend/webhook/route.ts"));
const queue = decomment(read("src/lib/email-queue.ts"));
const move = decomment(read("src/components/auth/change-email-actions.ts"));
const worklist = decomment(read("src/lib/admin-worklist-query.ts"));
const admin = decomment(read("src/lib/admin.ts"));
const mailActions = decomment(read("src/app/(main)/admin/mail/actions.ts"));

test("the webhook still writes the subtype where mailboxWasFull reads it", () => {
  // mailboxWasFull matches /^Bounced \(MailboxFull\)/ on lastError. Reword the
  // webhook's sentence and every full inbox reads as a flat refusal.
  assert.match(webhook, /lastError: `Bounced \(\$\{/, "the bounce's lastError no longer starts 'Bounced ('");
  assert.match(webhook, /bounce\?\.subType/, "the bounce's lastError no longer carries Resend's subtype");
});

test("a bounce is its own state, read off bouncedAt", () => {
  const body = balancedBody(queue, "export async function verificationMailState");
  assert.match(body, /bouncedAt: true/, "the mail state no longer reads bouncedAt");
  assert.match(body, /state: "bounced"/, "a bounced row reads as a plain failure again");
});

test("a resend folds only into a row for the SAME address", () => {
  // Otherwise a row mid-send to the old address swallows the new one's link.
  const body = balancedBody(queue, "export async function enqueueMail");
  assert.match(body, /to: \{ equals: input\.to, mode: "insensitive" \}/, "the fold ignores the address");
});

test("the to-do badge and list agree, and both leave out bounced confirmations", () => {
  assert.match(worklist, /export const MAIL_NEEDING_ADMIN = \{/);
  assert.match(worklist, /NOT: \{ kind: "verify", bouncedAt: \{ not: null \} \}/);
  assert.match(worklist, /where: MAIL_NEEDING_ADMIN/, "the worklist lists failed mail by its own clause");
  assert.match(admin, /outboundEmail\.count\(\{ where: MAIL_NEEDING_ADMIN \}\)/, "the badge counts by its own clause");
});

test("clearing a bounced confirmation the member still depends on is refused", () => {
  const body = balancedBody(mailActions, "export async function dismissMail");
  const guard = body.indexOf('row.kind === "verify" && row.sentAt');
  const del = body.indexOf("outboundEmail.deleteMany");
  assert.ok(guard > -1, "dismissMail lost its bounced-confirmation guard");
  assert.ok(guard < del, "the guard runs after the delete");
});

test("moving an address: unconfirmed only, metered, password, then the write", () => {
  const body = balancedBody(move, "export async function changeUnconfirmedEmail");
  const at = (s) => body.indexOf(s);
  const unconfirmed = at("if (me.emailVerified)");
  const meter = at('rateLimit("emailChange"');
  const password = at("bcrypt.compare(");
  const write = at("tx.user.updateMany(");
  for (const [name, i] of Object.entries({ unconfirmed, meter, password, write })) {
    assert.ok(i > -1, `changeUnconfirmedEmail no longer has its ${name} step`);
  }
  assert.ok(unconfirmed < meter && meter < password && password < write,
    "the checks run out of order: a confirmed address, an unmetered guess or a " +
      "wrong password must never reach the write (or the 'already has an account' answer)");
  // The write is fenced on what was read, so a confirmation or a second tab
  // in between is not overwritten.
  assert.match(body, /where: \{ id: userId, email: me\.email, emailVerified: null \}/);
});

test("a move keeps the waiting row's place in line, and moves are capped", () => {
  /* A deleted-and-requeued row is always the youngest in the drain's
     oldest-first order, so an account moving to invented addresses on a
     backlog day never reached the front and its email gate never shut
     (write-path review, 2026-09-29). */
  const body = balancedBody(move, "export async function changeUnconfirmedEmail");
  assert.doesNotMatch(body, /outboundEmail\.deleteMany/, "a move deletes the waiting row again");
  assert.match(
    body,
    /outboundEmail\.updateMany\(\{\s*where: \{ userId, kind: "verify", status: "queued" \},\s*data: \{ to: email \}/,
    "a move no longer re-addresses the waiting row in place"
  );
  const cap = body.indexOf('hasBudget("emailMoves"');
  const spend = body.indexOf('consume("emailMoves"');
  const write = body.indexOf("tx.user.updateMany(");
  assert.ok(cap > -1 && cap < write, "the monthly move ceiling is not checked before the write");
  assert.ok(spend > write, "a move is spent before it lands, so a wrong password would cost one");
});
