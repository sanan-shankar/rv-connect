import assert from "node:assert/strict";
import test from "node:test";
import { SESSION_MAX_AGE } from "./session-revocation.ts";
import { read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The password-reset and confirmation flows.
 *
 *  These are the paths somebody reaches when they CANNOT sign in, so a
 *  failure here has no second door behind it. Each assertion matches a
 *  CALL or a whole fragment rather than a bare name: a file that only
 *  imports a symbol satisfies a name search, and every assertion after
 *  it then passes against nothing.
 * ------------------------------------------------------------------ */


const EMAIL_ACTIONS = decomment(read("src/components/auth/email-actions.ts"));

/**
 * A named exported function's source, from its own `export` keyword to the
 * next top-level one.
 *
 * Deliberately NOT brace-matched: these signatures wrap over several lines and
 * carry object types in both the parameter list and the return annotation, so
 * "the first brace that ends a line" lands on the parameter object and every
 * assertion after it reads a four-line body and passes against nothing.
 */
function bodyOf(src, name) {
  const from = src.indexOf(`export async function ${name}`);
  assert.ok(from > 0, `${name} is not an exported async function any more`);
  const rest = src.slice(from + 10);
  const next = rest.indexOf("\nexport ");
  const body = next === -1 ? rest : rest.slice(0, next);
  assert.ok(body.split("\n").length > 10, `${name}'s body scraped to ${body.split("\n").length} lines`);
  return body;
}

/* ---- C-033: a blocked account is not walked into a locked door --- */

test("C-033: requestPasswordReset reads isBlocked and refuses to mail one", () => {
  const body = bodyOf(EMAIL_ACTIONS, "requestPasswordReset");
  assert.match(body, /isBlocked: true/, "the lookup does not select isBlocked");
  assert.match(
    body,
    /if \(!user\?\.password \|\| user\.isBlocked\) return \{ ok: true \};/,
    "a blocked row still gets a reset mail, which ends at a door that refuses it"
  );
  // And the refusal must stay indistinguishable from every other outcome.
  const returns = [...body.matchAll(/return \{ ok: (true|false)/g)].map((m) => m[1]);
  assert.ok(
    returns.filter((r) => r === "true").length >= 3,
    "the identical { ok: true } answers are what stop this being a membership oracle"
  );
  assert.ok(
    body.indexOf("user.isBlocked") < body.indexOf("enqueueMail"),
    "the block check has to come before the enqueue"
  );
});

/* ---- C-035: a committed password change stays committed --------- */

test("C-035: resetPassword's post-commit work cannot throw out of the action", () => {
  const body = bodyOf(EMAIL_ACTIONS, "resetPassword");
  const commit = body.indexOf("if (!applied)");
  assert.ok(commit > 0, "the post-commit boundary moved");
  const after = body.slice(commit);
  /* Every await below the commit must sit inside the try. Counted, not
     detected: a sweep that finds no BAD await also passes against a body
     where the awaits have been renamed away. */
  const tryAt = after.indexOf("try {");
  assert.ok(tryAt > 0, "there is no try around the post-commit writes");
  const awaits = [...after.matchAll(/\bawait\s+(\w+)\(/g)].map((m) => ({
    name: m[1],
    at: m.index,
  }));
  assert.ok(awaits.length >= 4, `only found ${awaits.length} post-commit awaits; the shape has drifted`);
  for (const a of awaits) {
    assert.ok(a.at > tryAt, `${a.name} is awaited outside the try, so it can undo a committed success`);
  }
  assert.match(after, /catch \(err\) \{[\s\S]*?reportSwallowed\(/, "the catch has no witness");
  // The success is still returned after all of it.
  assert.match(after, /return \{ ok: true, email: peek\.email \};/);
});

/* ---- C-034: no auth form can be stranded on a busy button ------- */

test("C-034: the three auth clients dispatch through callAction", () => {
  const surfaces = [
    ["src/app/(auth)/reset-password/reset-client.tsx", "resetPassword"],
    ["src/app/(auth)/forgot-password/forgot-client.tsx", "requestPasswordReset"],
    ["src/app/(auth)/verify-email/verify-client.tsx", "resendVerification"],
  ];
  for (const [file, action] of surfaces) {
    const src = decomment(read(file));
    assert.match(
      src,
      new RegExp(`callAction\\(\\(\\) => ${action}\\(`),
      `${file} awaits ${action} directly, so a rejected dispatch strands the form`
    );
    assert.doesNotMatch(
      src,
      new RegExp(`=\\s*await ${action}\\(`),
      `${file} still has a bare await of ${action}`
    );
  }
});

/* ---- C-156: a swallowed signup write leaves a witness ----------- */

test("C-156: the batch-group swallow reports rather than logging to nowhere", () => {
  const src = decomment(read("src/components/auth/actions.ts"));
  const join = src.slice(src.indexOf("joinBatchGroup(user.id"));
  const guard = join.slice(0, join.indexOf("\n  }"));
  assert.match(guard, /reportSwallowed\(/, "the failure has no witness but a Vercel log line");
  assert.doesNotMatch(guard, /console\.error\(/, "the bare console.error is back");
});

/* ---- C-032: the session's real shape, written down -------------- */

test("C-032: the session is ninety ABSOLUTE days, from one shared constant", () => {
  /* The owner's call on 2026-08-25: thirty days became ninety. What did NOT
     change, and is the part worth pinning, is that it does not roll -- the
     cookie's expiry is fixed at sign-in because the refresh NextAuth documents
     rides on Set-Cookie headers this app's request path discards. A bigger
     number is not a rolling session, and the next reader must not think it is. */
  const auth = read("src/lib/auth.ts");
  const block = auth.slice(auth.lastIndexOf("/*", auth.indexOf("session: {")), auth.indexOf("session: {"));
  assert.match(block, /ABSOLUTE/, "nothing says the ninety days do not roll");
  assert.match(block, /credentialVersion/, "nor that revocation does not depend on it");

  // One constant, not two numbers that agree today. TWO places mint a session
  // cookie -- auth.ts and /api/dev-login -- and dev-login used to carry its own
  // hand-typed thirty days under a comment claiming it matched a maxAge that
  // was never set.
  const cfg = decomment(auth).slice(decomment(auth).indexOf("session: {"));
  const sessionBlock = cfg.slice(0, cfg.indexOf("}"));
  assert.match(
    sessionBlock,
    /maxAge:\s*SESSION_MAX_AGE/,
    "the session length is hand-typed or absent again; it must come from the " +
      "shared SESSION_MAX_AGE so dev-login cannot drift from it"
  );
  const devLogin = decomment(read("src/app/api/dev-login/route.ts"));
  assert.match(
    devLogin,
    /MAX_AGE = SESSION_MAX_AGE/,
    "dev-login mints a cookie with its own lifetime again"
  );
  assert.doesNotMatch(
    devLogin,
    /MAX_AGE = \d+/,
    "a hand-typed session length is back in dev-login"
  );
});

test("C-032: SESSION_MAX_AGE is the ninety days the comments promise", () => {
  // The number itself, so the prose above and the constant cannot part ways.
  assert.equal(SESSION_MAX_AGE, 90 * 24 * 60 * 60);
  assert.equal(SESSION_MAX_AGE / 86400, 90, "SESSION_MAX_AGE is not a whole number of days");
});
