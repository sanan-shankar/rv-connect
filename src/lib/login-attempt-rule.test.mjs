import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/* ------------------------------------------------------------------ *
 *  The two places a sign-in failure is READ.
 *
 *  LoginAttempt is written from one place and read from two, and both
 *  reads told the owner something untrue on 2026-08-25: a tile saying
 *  one person was locked out of a site nobody was locked out of, and a
 *  bar labelled with a raw slug. Neither was a wrong number -- both were
 *  a query and a lookup that had quietly stopped covering their input.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const ANALYTICS = strip(read("src/lib/admin-analytics.ts"));
const PAGE = strip(read("src/app/(main)/admin/analytics/page.tsx"));
const PURGE = strip(read("src/lib/account-purge.ts"));

/** The one tagged template that builds the "still locked out" list. */
function lockedOutQuery() {
  const from = ANALYTICS.indexOf('HAVING bool_and(l.ok = false)');
  assert.ok(from > 0, "the locked-out query no longer groups on every-attempt-failed");
  const start = ANALYTICS.lastIndexOf("SELECT", from);
  return ANALYTICS.slice(start, ANALYTICS.indexOf("`", from));
}

/* ---- the ghost: an address whose account no longer exists -------- */

test("the locked-out list excludes attempts against a vanished account", () => {
  const q = lockedOutQuery();
  assert.match(
    q,
    /LEFT JOIN "User" u ON u\.id = l\."userId"/,
    "without the join, a purged member is still counted as somebody locked out"
  );
  assert.match(
    q,
    /bool_and\(l\."userId" IS NULL OR u\.id IS NOT NULL\)/,
    "the vanished-account guard is gone, or is no longer an aggregate over the whole address"
  );
});

test("the vanished-account guard is an aggregate, not a row filter", () => {
  const q = lockedOutQuery();
  /* A bare WHERE would DROP the successful attempt of a purged account and
   * leave the failures, flipping that address INTO the list -- the exact
   * opposite of the fix. Both conditions have to sit in the HAVING. */
  const having = q.slice(q.indexOf("HAVING"));
  assert.ok(
    having.includes('l."userId" IS NULL OR u.id IS NOT NULL'),
    "the guard moved out of the HAVING, where it can flip an address into the list"
  );
  assert.doesNotMatch(
    q.slice(0, q.indexOf("GROUP BY")),
    /WHERE/,
    "a row-level WHERE here drops rows before bool_and sees them"
  );
});

test("the guard is load-bearing because purging leaves the attempts behind", () => {
  /* If purgeUserAccount ever starts clearing these rows the guard becomes
   * belt-and-braces rather than the fix -- but it must not be deleted on the
   * assumption that it already does. This is what that assumption costs. */
  assert.doesNotMatch(
    PURGE,
    /loginAttempt/i,
    "purge now touches LoginAttempt; re-read the locked-out query's comment before trusting either"
  );
});

/* ---- the slug: a reason with no label --------------------------- */

test("every sign-in reason has a label, enforced by the type not by hope", () => {
  assert.match(
    PAGE,
    /const REASON: Record<LoginReason, string> = \{/,
    "REASON is keyed on string again, so a new reason ships to the owner as a raw slug"
  );
  const REASONS = strip(read("src/lib/login-attempt.ts"));
  const vocabulary = [...REASONS.matchAll(/\| "([a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(vocabulary.length >= 6, `scraped only ${vocabulary.length} reasons from LoginReason`);
  const map = PAGE.slice(PAGE.indexOf("const REASON:"), PAGE.indexOf("};", PAGE.indexOf("const REASON:")));
  for (const reason of vocabulary) {
    assert.ok(
      map.includes(`"${reason}"`) || new RegExp(`\\b${reason}:`).test(map),
      `"${reason}" is a reason the database can hold and this page cannot name`
    );
  }
});
