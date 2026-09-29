import assert from "node:assert/strict";
import test from "node:test";

import { sendTimeLabel, resendOutcomeMessage, movedMessage } from "./confirmation-copy.ts";

/* ------------------------------------------------------------------ *
 *  The one sentence a waiting member reads about their confirmation.
 *
 *  It used to say "tomorrow" for everything that was not later today, while
 *  the queue behind it (verifySendingAt) correctly counted two and three days
 *  out on a busy launch. On a 300-signup day that promised tomorrow to over a
 *  hundred people who would not get their link until the day after.
 * ------------------------------------------------------------------ */

// 3:45 pm IST on Tuesday 29 September 2026, the afternoon of the launch post.
const NOW = new Date("2026-09-29T10:15:00Z");

test("the refill later today says the time", () => {
  // 11:10 UTC is 4:40 pm IST, the same valley day.
  assert.equal(sendTimeLabel("2026-09-29T11:10:00Z", NOW), "at 4:40 pm IST");
});

test("tomorrow's refill says tomorrow, with am on it", () => {
  // Midnight UTC is 5:30 am IST, which is when Resend's day turns over.
  assert.equal(sendTimeLabel("2026-09-30T00:00:00Z", NOW), "tomorrow at 5:30 am IST");
});

test("two to six days out names the weekday, not tomorrow", () => {
  assert.equal(sendTimeLabel("2026-10-01T00:00:00Z", NOW), "on Thursday at 5:30 am IST");
  assert.equal(sendTimeLabel("2026-10-05T00:00:00Z", NOW), "on Monday at 5:30 am IST");
});

test("a week or more out names the date, since a weekday would be ambiguous", () => {
  assert.equal(sendTimeLabel("2026-10-06T00:00:00Z", NOW), "on 6 October at 5:30 am IST");
});

test("days are counted in the valley, not in UTC", () => {
  // 11:00 pm IST on the 29th is still the 29th in the valley, though it is
  // 17:30 UTC. Just past valley midnight, 5:30 am on the 30th is TODAY.
  const lateEvening = new Date("2026-09-29T17:30:00Z");
  assert.equal(sendTimeLabel("2026-09-30T00:00:00Z", lateEvening), "tomorrow at 5:30 am IST");
  const pastMidnight = new Date("2026-09-29T18:40:00Z");
  assert.equal(sendTimeLabel("2026-09-30T00:00:00Z", pastMidnight), "at 5:30 am IST");
});

test("never prints a narrow no-break space or a capital AM", () => {
  const label = sendTimeLabel("2026-09-30T00:00:00Z", NOW);
  assert.ok(!/[  ]/.test(label), `odd space in ${JSON.stringify(label)}`);
  assert.ok(!/AM|PM/.test(label));
});

/* ------------------------------------------------------------------ *
 *  What a resend says. Three presses of one action (the banner, the
 *  confirm-email dialog, the /verify-email page) and three different
 *  truths behind it; the page used to say "Sent to ..." for all of them,
 *  including the one where the email was waiting until tomorrow.
 * ------------------------------------------------------------------ */

test("sent means the provider took it, and says where", () => {
  assert.equal(
    resendOutcomeMessage({ state: "sent", sentTo: "p***@gmail.com" }),
    "Sent to p***@gmail.com. Check your spam folder if it does not arrive."
  );
});

test("waiting names the time, and never claims it was sent", () => {
  const shut = resendOutcomeMessage(
    { state: "queued", sendingAt: "2026-09-30T00:00:00Z", open: false },
    NOW
  );
  assert.equal(shut, "We have hit today's email limit. Your link goes out tomorrow at 5:30 am IST.");
  assert.ok(!/sent to/i.test(shut));
});

test("waiting with the gate open says everything is open", () => {
  assert.equal(
    resendOutcomeMessage({ state: "queued", sendingAt: "2026-10-01T00:00:00Z", open: true }, NOW),
    "We'll send your confirmation email on Thursday at 5:30 am IST. Everything is open to you until then."
  );
});

test("in flight says so, without a deadline", () => {
  assert.equal(
    resendOutcomeMessage({ state: "imminent" }),
    "Your link is on its way. Give it a minute, then check spam."
  );
});

/* After "use another email": wherever the new link has got to, plus the one
   thing they must not miss, that they sign in with the new address now. */

test("a move that sent at once says where, and how to sign in", () => {
  assert.equal(
    movedMessage({ state: "sent", sentTo: "n***@gmail.com" }),
    "Sent to n***@gmail.com. Sign in with that address from now on."
  );
});

test("a move on a spent day names when the link goes", () => {
  assert.equal(
    movedMessage({ state: "queued", sentTo: "n***@gmail.com", sendingAt: "2026-09-30T00:00:00Z" }, NOW),
    "We'll send your link to n***@gmail.com tomorrow at 5:30 am IST. Sign in with that address from now on."
  );
});

test("a move still in flight says it is on its way", () => {
  assert.equal(
    movedMessage({ state: "imminent", sentTo: "n***@gmail.com" }),
    "Your link is on its way to n***@gmail.com. Sign in with that address from now on."
  );
});
