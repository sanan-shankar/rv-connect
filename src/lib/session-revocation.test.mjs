import assert from "node:assert/strict";
import test from "node:test";

import { SESSION_MAX_AGE, sessionRevoked } from "./session-revocation.ts";
import { read, decomment, balancedBody, filesContaining } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Session revocation, written down as attacks.
 *
 *  Until this file existed the word `credentialVersion` appeared in no test
 *  in the repo (bug-report-2 C-187). The whole revocation mechanism was one
 *  inline condition in the NextAuth session callback, so a flipped `!==`, a
 *  dropped isBlocked clause or a select that stopped fetching a column left
 *  every blocked, deleted and password-reset session live for the token's
 *  ninety days (SESSION_MAX_AGE) with `npm run check` and CI both green.
 *
 *  Three parts, because any one alone is a hole: the rule below; the
 *  wiring -- that the callback still calls it, and that the query still
 *  fetches every column the rule reads; and the writes that move the epoch
 *  the rule compares, at the bottom.
 * ------------------------------------------------------------------ */

test("the window revocation guards is the session's ninety days", () => {
  // The header above names it; if the session's life changes, so does the
  // size of the hole a dropped bump leaves.
  assert.equal(SESSION_MAX_AGE, 90 * 24 * 60 * 60);
});

const live = (over = {}) => ({ isBlocked: false, credentialVersion: 0, ...over });

/* ------------------------------------------------------- the rule itself */

test("a deleted account cannot keep browsing on the token it already holds", () => {
  // audit M6: the row is gone, and the old code returned a session anyway
  // with an id read off the JWT, so all ~86 guards passed for the rest of
  // the token's life.
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

/* ------------------------------------------------------------ the writes */

/* The rule compares an epoch, and the epoch only moves where a writer bumps
   it: one write per security event. Nothing pinned those writes (bug audit
   3, L9-05), so deleting `credentialVersion: { increment: 1 }` from the
   password reset left a phished member's reset unable to end the attacker's
   session, for the token's ninety days, with every gate above still green.
   The deletion request leans on its bump alone too: the rule has no clause
   for deletionRequestedAt. A block has its own isBlocked clause as well. */

const BUMP = /credentialVersion:\s*\{\s*increment:\s*1\s*\}/;

/** The text between the braces that open at `open`, braces included. */
function braced(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open, i + 1);
  }
  return null;
}

/** Every `<anything>.user.update / updateMany / upsert(...)` in `src`, as the
 *  object(s) it writes: `data`, or an upsert's `update`. */
function userWrites(src) {
  const out = [];
  for (const m of src.matchAll(/\b\w+\.user\.(?:update|updateMany|updateManyAndReturn|upsert)\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let args = null;
    for (let i = open; i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")" && --depth === 0) {
        args = src.slice(open + 1, i);
        break;
      }
    }
    if (!args) continue;
    for (const key of ["data", "update"]) {
      const at = args.search(new RegExp(`\\b${key}\\s*:\\s*\\{`));
      if (at >= 0) out.push(braced(args, args.indexOf("{", at)));
    }
  }
  return out.filter(Boolean);
}

const WRITERS = [
  // [file, the function the write lives in, the column its event changes]
  ["src/components/auth/email-actions.ts", "export async function resetPassword", /\bpassword:/],
  ["src/components/settings/actions.ts", "export async function requestAccountDeletion", /\bdeletionRequestedAt:/],
  ["src/app/(main)/admin/people/actions.ts", "async function blockWrite", /\bisBlocked:/],
];

for (const [file, decl, column] of WRITERS) {
  const name = decl.split(" ").pop();
  test(`${name} moves the epoch in the same write as its ${column.source.replace(/\\b|:/g, "")}`, () => {
    const body = balancedBody(decomment(read(file)), decl);
    assert.ok(body, `${decl} is no longer in ${file}; this pin has lost its writer`);
    const writes = userWrites(body).filter((data) => column.test(data));
    assert.equal(writes.length, 1, `${name} should change ${column.source} in exactly one User write`);
    assert.match(
      writes[0],
      BUMP,
      `${name} no longer bumps credentialVersion beside ${column.source}: every session already signed in survives it`
    );
  });
}

test("a block and an unblock both go through the write that bumps", () => {
  /* adminBlockUser writes in two places: inside the self-and-last-admin
     guard's transaction for a block, straight through for an unblock. */
  const body = balancedBody(
    decomment(read("src/app/(main)/admin/people/actions.ts")),
    "export async function adminBlockUser"
  );
  assert.ok(body, "adminBlockUser is gone");
  assert.equal((body.match(/\bblockWrite\s*\(/g) ?? []).length, 2, "a path of adminBlockUser no longer writes through blockWrite");
  assert.doesNotMatch(body, /\.user\.update/, "adminBlockUser writes the row itself, around blockWrite's bump");
});

test("no password is written anywhere without ending the sessions it replaces", () => {
  /* Derived from the code, so a writer added later (Q3's change-password,
     an admin tool) joins on the day it is written. A `password: true` is a
     select, not a write. */
  let writers = 0;
  for (const file of filesContaining(/\.user\.(?:update|updateMany|updateManyAndReturn|upsert)\s*\(/)) {
    for (const data of userWrites(decomment(read(file)))) {
      if (!/\bpassword:\s*(?!true\b|false\b)\S/.test(data)) continue;
      writers++;
      assert.match(data, BUMP, `${file} writes a password without bumping credentialVersion in the same write`);
    }
  }
  assert.ok(writers >= 1, "found no password write in src at all; the sweep has stopped seeing them");

  /* And the raw SQL ones: the break-glass script sets a password from the
     laptop, and a tool that left an intruder's cookie alive would be the one
     path around revocation. */
  let raw = 0;
  for (const file of filesContaining(/UPDATE\s+"User"/, { under: ["src", "scripts"], match: /\.(?:ts|tsx|mjs|mts)$/ })) {
    for (const m of read(file).matchAll(/UPDATE\s+"User"([\s\S]*?)(?:\bWHERE\b|`)/g)) {
      const set = m[1].replace(/--[^\n]*/g, "");
      if (!/\bpassword\s*=/.test(set)) continue;
      raw++;
      assert.match(
        set,
        /"credentialVersion"\s*=\s*"credentialVersion"\s*\+\s*1/,
        `${file} sets a password in SQL without bumping "credentialVersion" in the same statement`
      );
    }
  }
  assert.ok(raw >= 1, "scripts/dev/set-password.mjs no longer reads as a password write; the scrape broke");
});
