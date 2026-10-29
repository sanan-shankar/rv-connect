import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, read, decomment, walk, SKIP_DIRS, balancedBody } from "../../src/lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The probes clean up after themselves.
 *
 *  The security probes make real accounts in the one database production
 *  uses, then delete them. Their cleanups had rotted: four probes and
 *  phase4-prod-check still deleted from "Session", a table dropped on
 *  2026-08-27, and three of those had no catch, so a run threw before its
 *  User delete and left confirmed, sometimes verified, probe accounts on
 *  the real site. The cleanup also ran only if every check before it had
 *  (bug audit 3, V-T7a-03). Nobody runs a probe to test it, so this reads
 *  them.
 * ------------------------------------------------------------------ */

/** Every table a manual migration dropped, read from the migrations, so the
 *  next drop is covered the day it is written. */
const DROPPED = [
  ...new Set(
    readdirSync(join(ROOT, "prisma/migrations-manual"))
      .filter((f) => f.endsWith(".sql"))
      .flatMap((f) =>
        [...read(`prisma/migrations-manual/${f}`).matchAll(/DROP TABLE (?:IF EXISTS )?"(\w+)"/gi)].map((m) => m[1]),
      ),
  ),
];

test("no script names a table a migration dropped", () => {
  assert.ok(DROPPED.includes("Session"), "the dropped-table list no longer reads the migrations");
  const files = walk(join(ROOT, "scripts"), {
    skip: (name) => SKIP_DIRS.includes(name),
    match: (name) => /\.(mjs|mts|ts|js|cjs)$/.test(name) && !/\.test\.mjs$/.test(name),
  });
  const offenders = [];
  for (const full of files) {
    const rel = full.slice(ROOT.length + 1);
    const src = decomment(read(rel));
    for (const table of DROPPED) if (src.includes(`"${table}"`)) offenders.push(`${rel}: "${table}"`);
  }
  assert.deepEqual(offenders, [], "these name a table that no longer exists, and a delete from it throws:\n  " + offenders.join("\n  "));
});

/* The five V-T7a-03 named. phase5 and phase8 die at load on the `@/` alias
   before they make anything, and phase10's one-line cleanup has nothing in
   front of it to throw. */
const PROBES = ["phase3-probe.mjs", "phase4-probe.mjs", "phase6-probe.mjs", "phase7-probe.mjs", "phase4-prod-check.mjs"];

for (const probe of PROBES) {
  test(`${probe}: its accounts are deleted however the run ends`, () => {
    const src = decomment(read(`scripts/qa/${probe}`));
    // At column 0: the run's own finally, not one around a browser inside it.
    const fin = src.lastIndexOf("\n} finally {");
    assert.ok(fin > 0, `${probe} has no finally around its run`);
    const lastDelete = Math.max(src.lastIndexOf("await cleanup()"), src.lastIndexOf('DELETE FROM "User"'));
    assert.ok(lastDelete > fin, `${probe}'s last account delete is not inside its finally`);
  });
}

test("phase6-probe.mjs removes its sign-in attempts by address", () => {
  // LoginAttempt.userId is no foreign key; the column it used to name never existed.
  assert.match(decomment(read("scripts/qa/phase6-probe.mjs")), /DELETE FROM "LoginAttempt" WHERE email LIKE/);
});

/* ------------------------------------------------------------------ *
 *  Phase 3 wrote into real members' rows (C1-02). It commented on the
 *  newest post on the feed, a real member's, so every run rang that
 *  member's bell, and its cleanup never reached the admins' bells or the
 *  audit rows its accounts caused.
 * ------------------------------------------------------------------ */

test("phase3-probe.mjs comments only on its own post", () => {
  const src = decomment(read("scripts/qa/phase3-probe.mjs"));
  assert.doesNotMatch(src, /page\.click\(\s*['"`]button\[aria-label="Show comments"\]/, "the drive clicks the first post on the feed again");
  assert.match(src, /INSERT INTO "Post"/, "the probe no longer makes a post of its own");
  assert.match(src, /aria-controls="comments-\$\{ownPost\}"/, "the drive does not aim at the probe's own post");
});

test("phase3-probe.mjs takes back what the app wrote about its accounts", () => {
  const cleanup = balancedBody(decomment(read("scripts/qa/phase3-probe.mjs")), "async function cleanup");
  assert.ok(cleanup, "phase3-probe.mjs has no cleanup function");
  assert.match(cleanup, /DELETE FROM "Notification"/, "the admins' bells naming a probe account outlive it");
  assert.match(cleanup, /DELETE FROM "AuditLog"/, "the audit rows naming a probe account outlive it");
});

test("phase3-probe.mjs expects an office-list name match to queue, not verify", () => {
  const src = decomment(read("scripts/qa/phase3-probe.mjs"));
  assert.match(src, /row2\.verifyState === "pending"/);
  assert.doesNotMatch(src, /row2\.verifyState === "verified"/);
});
