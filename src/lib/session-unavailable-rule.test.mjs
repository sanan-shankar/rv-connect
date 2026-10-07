import test from "node:test";
import assert from "node:assert/strict";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A database that does not answer never signs a member out.
 *
 *  The session callback reads the member's row on every request. When
 *  that read threw (a pool timeout under a burst of page views), NextAuth
 *  answered "no session" and the (main) layout sent a member with a valid
 *  cookie to the sign-in form (bug audit 3, O-03 / T5-17). Three places
 *  now cooperate, and each is pinned here, because removing any one of
 *  them quietly brings the sign-out back:
 *    1. the callback turns a failed read into `session.unavailable`,
 *    2. auth() records that for the request (and still answers null),
 *    3. the layout throws to the error screen before it would redirect.
 * ------------------------------------------------------------------ */

const auth = decomment(read("src/lib/auth.ts"));
const layout = decomment(read("src/app/(main)/layout.tsx"));

test("the session callback marks a failed row read unavailable", () => {
  const cb = balancedBody(auth, "async session({ session, token })");
  assert.ok(cb, "the session callback moved; re-point this test");
  assert.match(cb, /\.findUnique\(\{[\s\S]*?\}\)\s*\.catch\(sessionReadFailed\)/, "the row read is not caught");
  assert.match(
    cb,
    /if \(dbUser === SESSION_READ_FAILED\) \{\s*session\.unavailable = true;\s*return session;/,
    "a failed read must mark the session unavailable and stop",
  );
  // emailGateOpenFor is the other read here and needs no catch: it fails
  // closed and reports on its own (src/lib/email-gate-open.ts).
});

test("auth() records an unavailable session for the request and still answers null", () => {
  const guard = balancedBody(auth, "async function guardedSession()");
  assert.ok(guard, "guardedSession moved; re-point this test");
  assert.match(guard, /if \(session\?\.unavailable\) \{\s*unavailableThisRequest\(\)\.value = true;\s*return null;/);
  assert.ok(
    guard.indexOf("session?.unavailable") < guard.indexOf("session.invalid"),
    "unavailable must be checked before the generic null, or it is never recorded",
  );
  assert.match(auth, /const unavailableThisRequest = cache\(/, "the flag must be request-scoped");
});

test("the (main) layout shows the error screen, not the sign-in form, when the database did not answer", () => {
  const branch = layout.slice(layout.indexOf("if (!session?.user) {"));
  const check = branch.indexOf("if (sessionWasUnavailable())");
  const redirectAt = branch.indexOf("redirectToSignIn(");
  assert.ok(check !== -1, "the layout no longer asks whether the session was unavailable");
  assert.ok(redirectAt !== -1, "the layout no longer redirects through redirectToSignIn; re-point this test");
  assert.ok(check < redirectAt, "the layout redirects to sign-in before asking");
  assert.match(branch.slice(check, redirectAt), /throw new Error\("SESSION_UNAVAILABLE/, "an unavailable session must throw to the error screen");
});

test("that throw is not filed to Sentry once per page view", () => {
  /* The callback's report is throttled to once a minute; the layout's throw,
     through onRequestError, is not. Without this every page view of an
     outage is an event (write-path review, 2026-09-30). */
  assert.match(decomment(read("src/instrumentation.ts")), /ignoreErrors: \[[\s\S]*?"SESSION_UNAVAILABLE"[\s\S]*?\]/);
});
