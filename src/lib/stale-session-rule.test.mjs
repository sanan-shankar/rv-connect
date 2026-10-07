import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";

import { STALE_SESSION_PATH, isSessionCookie, signedOutDestination, withNext } from "./stale-session.ts";
import { ROOT, read, decomment, balancedBody, walk } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A dead sign-in cookie is deleted, and the bare domain is the landing
 *  page again.
 *
 *  A session ended by a password reset, a block or a deletion request
 *  left its cookie in the browser. The proxy saw the cookie and sent "/"
 *  to /feed, the layout found no session and sent it to /login, and the
 *  sign-in page's Back link went to "/" and round again, on every visit,
 *  for good (owner, 2026-10-07). The pieces below only work together.
 * ------------------------------------------------------------------ */

test("a dead session goes where a visitor with no cookie would have gone", () => {
  // "/" became "/feed" at the proxy before anyone knew the cookie was dead.
  assert.equal(signedOutDestination("/feed"), "/");
  assert.equal(signedOutDestination(null), "/");
  // A followed link keeps its sign-in detour, query string and all.
  assert.equal(
    signedOutDestination("/catchups/abc?tab=answers"),
    "/login?next=%2Fcatchups%2Fabc%3Ftab%3Danswers",
  );
  assert.equal(signedOutDestination("/feed?post=1"), "/login?next=%2Ffeed%3Fpost%3D1");
  // Encoded, or a path with & or # truncates the next param (C-117/C-200).
  assert.equal(withNext("/login", "/a?b=1&c=2#d"), "/login?next=%2Fa%3Fb%3D1%26c%3D2%23d");
  assert.equal(withNext("/login", undefined), "/login");
});

test("every Auth.js session cookie is cleared, and nothing else", () => {
  for (const name of [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "__Secure-authjs.session-token.0",
    "authjs.session-token.1",
  ]) {
    assert.ok(isSessionCookie(name), `${name} would survive a dead session`);
  }
  for (const name of ["authjs.csrf-token", "__Host-authjs.csrf-token", "authjs.callback-url", "rv-visit", "theme"]) {
    assert.ok(!isSessionCookie(name), `${name} is not a session and must not be cleared`);
  }
});

test("the route deletes a cookie only after confirming it is dead", () => {
  const file = `src/app${STALE_SESSION_PATH}/route.ts`;
  assert.ok(existsSync(resolve(ROOT, file)), `STALE_SESSION_PATH has no route at ${file}`);
  const route = decomment(read(file));
  const get = balancedBody(route, "export async function GET(request: NextRequest)");
  assert.ok(get, "the GET handler moved; re-point this test");

  // A GET anyone can link to: without the check, any site could sign a member out.
  const check = get.indexOf("await sessionIsStale()");
  const clear = get.indexOf("response.cookies.set(");
  assert.ok(check !== -1 && clear !== -1, "the check or the delete is gone");
  assert.ok(check < clear, "the cookie is deleted before the session is confirmed dead");
  assert.match(get, /safeNextPath\(/, "next= is used unsanitised: an open redirect");
  // Browsers ignore an expiry for a __Secure- cookie that is not itself Secure.
  assert.match(get, /secure: name\.startsWith\("__Secure-"\)/);

  // Reachable without a session, which is the only state it is ever needed in.
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /const publicPaths = \[[\s\S]*?"\/api\/auth",/);
  // And the proxy's "has a cookie" uses the same names the route deletes.
  assert.match(proxy, /const sessionCookie = request\.cookies\.getAll\(\)\.find\(\(\{ name \}\) => isSessionCookie\(name\)\)/);
});

test("a slow database is never mistaken for a dead session", () => {
  /* The O-03 rule (session-unavailable-rule.test.mjs) applied to the one
     place that now DELETES a cookie: an unavailable read must answer "not
     stale". It reads nextAuth.auth() itself because the request-cache flag
     behind sessionWasUnavailable() reads false in a route handler. */
  const fn = balancedBody(decomment(read("src/lib/auth.ts")), "export async function sessionIsStale()");
  assert.ok(fn, "sessionIsStale moved; re-point this test");
  assert.match(fn, /await nextAuth\.auth\(\)/);
  assert.match(fn, /if \(session\?\.unavailable\) return false;/);
  assert.ok(fn.indexOf("unavailable") < fn.indexOf("return !session"), "unavailable must be ruled out first");
});

test("no page signs somebody out around the route that clears the cookie", () => {
  /* A page that sends a signed-out visitor straight to /login leaves the dead
     cookie in place, and layouts and pages render in parallel, so the
     layout's own redirect is no guarantee the page's does not win. */
  const offenders = walk(resolve(ROOT, "src/app"))
    .filter((f) => /if \(!session[^)]*\)\s*(return )?redirect\(\s*["`]\/login/.test(decomment(read(f))))
    .map((f) => relative(ROOT, f));
  assert.deepEqual(offenders, [], "use redirectToSignIn() from src/lib/sign-in-redirect.ts");
});
