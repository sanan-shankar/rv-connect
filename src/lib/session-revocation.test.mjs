import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { sessionRevoked } from "./session-revocation.ts";

/* ------------------------------------------------------------------ *
 *  Session revocation, written down as attacks.
 *
 *  Until this file existed the word `credentialVersion` appeared in no test
 *  in the repo (bug-report-2 C-187). The whole revocation mechanism was one
 *  inline condition in the NextAuth session callback, so a flipped `!==`, a
 *  dropped isBlocked clause or a select that stopped fetching a column left
 *  every blocked, deleted and password-reset session live for the 30-day JWT
 *  window with `npm run check` and CI both green.
 *
 *  Two halves, because either alone is a hole: the rule below, and the
 *  wiring -- that the callback still calls it, and that the query still
 *  fetches every column the rule reads.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

const live = (over = {}) => ({ isBlocked: false, credentialVersion: 0, ...over });

/* ------------------------------------------------------- the rule itself */

test("a deleted account cannot keep browsing on the token it already holds", () => {
  // audit M6: the row is gone, and the old code returned a session anyway
  // with an id read off the JWT, so all ~86 guards passed for 30 days.
  assert.equal(sessionRevoked(null, 0), true);
  assert.equal(sessionRevoked(undefined, 3), true);
});

test("a block ends the sessions it did not catch at the door", () => {
  // audit H4: authorize() refuses the next sign-in, but somebody already
  // signed in never signs in again -- this is the half that reaches them.
  assert.equal(sessionRevoked(live({ isBlocked: true }), 0), true);
  // ...even when their epoch matches perfectly, which is the ordinary case:
  // blocking bumps credentialVersion too, but the block must stand on its own.
  assert.equal(sessionRevoked(live({ isBlocked: true, credentialVersion: 7 }), 7), true);
});

test("a password reset ends every session that predates it", () => {
  // audit M4: every password write bumps User.credentialVersion, so a
  // stolen token minted before the reset stops verifying as a session.
  assert.equal(sessionRevoked(live({ credentialVersion: 1 }), 0), true);
  assert.equal(sessionRevoked(live({ credentialVersion: 4 }), 3), true);
});

test("an ordinary member is not signed out", () => {
  assert.equal(sessionRevoked(live(), 0), false);
  assert.equal(sessionRevoked(live({ credentialVersion: 9 }), 9), false);
});

test("a token minted before the claim existed is epoch 0, not a sign-out", () => {
  // Shipping the mechanism had to sign nobody out: every existing row was
  // backfilled with 0, and every existing token carried the claim not at all.
  assert.equal(sessionRevoked(live({ credentialVersion: 0 }), undefined), false);
  assert.equal(sessionRevoked(live({ credentialVersion: null }), undefined), false);
  assert.equal(sessionRevoked(live({ credentialVersion: null }), null), false);
  // But a bumped row still beats a claimless token: somebody who reset their
  // password does not get to keep a pre-claim session.
  assert.equal(sessionRevoked(live({ credentialVersion: 1 }), undefined), true);
});

test("the comparison is not one-sided: a token ahead of the row is refused too", () => {
  // Guards against `row.credentialVersion > token.credentialVersion`, which
  // looks equivalent and silently accepts a forged or replayed higher epoch.
  assert.equal(sessionRevoked(live({ credentialVersion: 0 }), 2), true);
});

/* ----------------------------------------------------------- the wiring */

test("the session callback still asks", () => {
  const src = decomment(read("src/lib/auth.ts"));
  assert.match(src, /sessionRevoked\s*\(/, "auth.ts no longer calls sessionRevoked");
  // ...and acts on the answer rather than computing it and moving on.
  assert.match(
    src,
    /if\s*\(\s*sessionRevoked\s*\([^)]*\)\s*\)\s*\{\s*session\.invalid\s*=\s*true/,
    "the revocation answer no longer invalidates the session"
  );
});

test("the session read fetches every column the rule consults", () => {
  // The rule can only be as good as its input: a `select` that quietly stops
  // reading credentialVersion feeds it undefined, which reads as epoch 0, and
  // signs out everybody who ever reset a password while letting nobody's
  // block land. Derived from the rule's own source rather than a hard-coded
  // pair, so a new clause reading a new column fails here until the query
  // fetches it.
  const rule = decomment(read("src/lib/session-revocation.ts"));
  const columns = [...new Set([...rule.matchAll(/\brow\.([A-Za-z0-9_]+)/g)].map((m) => m[1]))];
  assert.ok(columns.length >= 2, `only found ${columns} in the rule; the scrape broke`);

  const auth = decomment(read("src/lib/auth.ts"));
  const select = auth.slice(auth.indexOf("const dbUser"), auth.indexOf("sessionRevoked("));
  assert.ok(select.includes("findUnique"), "the session read has moved; this slice no longer covers it");
  for (const column of columns) {
    assert.match(
      select,
      new RegExp(`\\b${column}\\s*:\\s*true`),
      `the session read no longer selects ${column}, which sessionRevoked reads`
    );
  }
});
