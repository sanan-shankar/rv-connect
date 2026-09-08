/* ------------------------------------------------------------------ *
 *  The batch Catch-up: the invariants that make "nobody keeps it"
 *  survivable.
 *
 *  Run: node --test src/lib/batch-catchups.test.mjs
 *
 *  His, brief 4 and 51: "anyone in that batch is automatically added to
 *  that catch-up ... This batch catch-up should exist by default", and
 *  "the batch catch up can't edit people in and out it's just people in
 *  that batch and they're all automatically added and have access to
 *  previous issues if they join later."
 *
 *  Two halves, like catchup-lifecycle.test.mjs. The pure rules are
 *  imported and exercised. The rest only exists as a call into Prisma,
 *  so it is pinned by reading the real source and failing the moment a
 *  guard goes missing -- the only database here is the live production
 *  one, and these are exactly the guards nobody would notice were gone
 *  until somebody had already left their own batch.
 * ------------------------------------------------------------------ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

import {
  BATCH_CATCHUP_FLOOR,
  isBatchCatchup,
  mayChangeCatchupPicture,
} from "./catchups-core.ts";
import { ROOT, read, decomment, balancedBody } from "./test-kit.mjs";

test("ten is the floor, and it is his number", () => {
  /* 2026-09-08: "for people whose batches have less than ten people, let's not
     even show the catch ups things in the sidebar. it won't be reachble to
     them. once there's ten it appears and the catch up would be created for
     that batch." Pinned as a value because three separate things read it: the
     creation guard, the tick's self-heal, and the migration's backfill. */
  assert.equal(BATCH_CATCHUP_FLOOR, 10);
});

test("a batch is a Group with the year set, and nothing else is", () => {
  assert.equal(isBatchCatchup(2023), true);
  assert.equal(isBatchCatchup(0), true, "year 0 is nonsense, but it is still a set column");
  assert.equal(isBatchCatchup(null), false);
  assert.equal(isBatchCatchup(undefined), false);
});

test("anyone in a batch may replace its picture; on a people Catch-up only the Keeper", () => {
  /* His answer to owner question 18: "anyone can replace the batch picture."
     It is the ONE control anybody holds on a batch Catch-up, and the reason is
     that it is reversible: nobody keeps a batch Catch-up, so "only the Keeper"
     would mean nobody at all, for ever, on the Catch-ups most members are in. */
  const plainMember = { viewerId: "u1", createdById: null, groupRole: "member" };
  assert.equal(mayChangeCatchupPicture({ ...plainMember, batchYear: 2023 }), true);
  assert.equal(mayChangeCatchupPicture({ ...plainMember, batchYear: null }), false);
  assert.equal(
    mayChangeCatchupPicture({ viewerId: "u1", createdById: "u1", groupRole: "member", batchYear: null }),
    true
  );
  assert.equal(
    mayChangeCatchupPicture({ viewerId: null, createdById: null, groupRole: "member", batchYear: 2023 }),
    false,
    "a signed-out caller must not pass on the batch branch"
  );
});

test("a batch Catch-up has no manual transitions at all", () => {
  /* Architecture 6, and it is his own correction (N30): "Can anyone open
     answering? That shouldn't be allowed. Because many people would click it
     by accident. Especially on a batch thing ... it seems like the kind of
     irreversible thing."

     Both Keeper preambles have to refuse, and both have to refuse BEFORE the
     Keeper question rather than relying on it. Nobody could pass that question
     on a batch group today -- `createdById` is null and every role in one is
     "member" -- but that is an accident of the data, and one `setCatchupKeeper`
     against the wrong group would end it. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));

  for (const fn of ["async function loadKeeperEdition", "async function loadKeeperScope"]) {
    const body = balancedBody(src, fn);
    assert.ok(body, `${fn} is gone; this pin is reading nothing`);
    const refusal = body.indexOf("BATCH_CATCHUP_REFUSAL");
    const keeperCheck = body.indexOf("isEffectiveKeeper");
    assert.ok(refusal !== -1, `${fn} no longer refuses a batch Catch-up`);
    assert.ok(
      refusal < keeperCheck,
      `${fn} asks who the Keeper is before it refuses a batch Catch-up`
    );
    assert.match(body, /isBatchCatchup\(/, `${fn} tests for a batch some other way`);
  }
});

test("nobody leaves their own batch, and nobody bins it either", () => {
  /* Leaving would be undone by the next `healBatchGroupMemberships` pass, which
     would put them straight back, so refusing is the honest answer rather than
     the strict one. Deleting is leaving with a thirty-day fuse -- the sweep
     takes the GroupMember row at the end of it -- so it refuses for the same
     reason. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  for (const fn of ["export async function leaveCatchup", "export async function setCatchupDeleted"]) {
    const body = balancedBody(src, fn);
    assert.ok(body, `${fn} is gone; this pin is reading nothing`);
    assert.match(body, /BATCH_LEAVE_REFUSAL/, `${fn} no longer refuses a batch Catch-up`);
  }
  // Restoring must stay open: a row stamped before the guard existed has to be
  // recoverable, so the refusal is scoped to `deleted === true`.
  const del = balancedBody(src, "export async function setCatchupDeleted");
  assert.match(del, /deleted && isBatchCatchup\(/, "the bin refuses to RESTORE a batch copy too");
});

test("neither screen offers what the server refuses", () => {
  /* This page's own house rule, written on `canDelete` in the card menu: an
     action refused server-side is not shown as a way to be told no. */
  const panel = decomment(read("src/components/catchups/home/people-panel.tsx"));
  assert.match(
    panel,
    /!isCreator && !data\.isBatch/,
    "the roster still offers Leave on a batch Catch-up"
  );
  const card = decomment(read("src/components/catchups/index/your-catchups-card.tsx"));
  assert.match(
    card,
    /canDelete=\{!card\.isCreator && !card\.isBatch\}/,
    "the list's card menu still offers Delete on a batch Catch-up"
  );
});

test("a batch Catch-up is created with no Keeper, no invite link and a picture", () => {
  const body = balancedBody(
    decomment(read("src/lib/batch-catchups.ts")),
    "export async function ensureBatchCatchup"
  );
  assert.ok(body, "ensureBatchCatchup is gone; this pin is reading nothing");

  // Nobody keeps one (architecture 6). If this ever became a real id, every
  // one-way control in the app would open on 39 people's batch Catch-up.
  assert.match(body, /createdById: null/, "a batch Catch-up is being given a Keeper");
  // There is nobody to invite: the membership IS the batch. This is what
  // closes joinCatchupByToken on it.
  assert.match(body, /inviteToken: null/, "a batch Catch-up is being given an invite link");
  // Every Catch-up has a photograph from the day it is made (spec 3.4).
  assert.match(body, /pictureFor\(/, "a batch Catch-up is not picking a picture from the pool");
  // Under the floor, nothing at all is created: no Catch-up, and per spec 3.5b
  // no sidebar row either, so there is no empty door.
  assert.match(
    body,
    /_count\.members < BATCH_CATCHUP_FLOOR/,
    "ensureBatchCatchup no longer checks the floor"
  );
  // Edition 1 opens the same day, which is his reading of the floor: "once
  // there's ten it appears and the catch up would be created for that batch."
  assert.match(body, /status: "collecting"/, "a new batch Catch-up does not start collecting");
  assert.match(body, /deadlineIn\(now, QUESTION_WINDOW_DAYS\)/, "the deadline is not the civil hour");
});

test("all three creation paths exist, and the signup one is the moment a batch crosses ten", () => {
  const lib = decomment(read("src/lib/batch-catchups.ts"));

  // 1. Signup. The tenth person from a batch registering IS the crossing, and
  //    this is the code that runs on it. The new member is excluded from the
  //    notification: they were enrolled one second ago by their own click.
  const join = balancedBody(lib, "export async function joinBatchGroup");
  assert.match(join, /ensureBatchCatchup\(group\.id, \{ excludeUserId: userId \}\)/);
  const signup = decomment(read("src/components/auth/actions.ts"));
  assert.match(
    signup,
    /from "@\/lib\/batch-catchups"/,
    "registerUser has grown its own copy of joinBatchGroup again"
  );

  // 2 and 3. The tick's two idempotent passes, in this order: healing a
  //    membership can be the thing that carries a batch over the floor.
  const heal = balancedBody(lib, "export async function healBatchCatchupsAndMemberships");
  const memberships = heal.indexOf("healBatchGroupMemberships");
  const catchups = heal.indexOf("healBatchCatchups(");
  assert.ok(memberships !== -1 && catchups !== -1, "a self-heal pass has gone missing");
  assert.ok(memberships < catchups, "the tick heals Catch-ups before memberships");
});

test("the self-heal runs only on an UNSCOPED sweep, and only these two make one", () => {
  /* Both passes scan a whole table. `advanceDueCatchups` is piggy-backed on
     the app-shell query that fires on essentially every authenticated page
     view, and the `userId` argument is the whole difference between the two
     shapes of caller. Running these on the scoped one would put two table
     scans on every page in the app. */
  const body = balancedBody(
    decomment(read("src/lib/catchups.ts")),
    "export async function advanceDueCatchups"
  );
  assert.match(
    body,
    /if \(!userId\) await healBatchCatchupsAndMemberships\(\)/,
    "the batch self-heal is no longer scoped to the unscoped sweep"
  );

  /* And the half the guard above does NOT give you. "Unscoped" is a property
     of the CALL, so the line above says nothing about who makes one. Two
     callers do -- the cron route, and the admin room, which sweeps everything
     on purpose because its job is to show every Catch-up's true state -- and
     both are fine. A THIRD, on a member-facing page, would silently put two
     table scans on it, and nothing else in this repo would notice. */
  const ALLOWED = new Set([
    "src/app/api/catchups/tick/route.ts",
    "src/app/(main)/admin/catchups/(index)/page.tsx",
  ]);
  /* Excluding the definition, and this file: `git grep` searches TRACKED
     content, so the moment this test was committed it started matching its own
     assertion text. */
  const files = execSync(
    "git grep -lF 'advanceDueCatchups()' -- 'src/*' " +
      "':!src/lib/catchups.ts' ':!src/lib/batch-catchups.test.mjs'",
    { cwd: ROOT, encoding: "utf8" }
  )
    .split("\n")
    .filter(Boolean);
  assert.deepEqual(
    files.filter((f) => !ALLOWED.has(f)),
    [],
    "a new UNSCOPED advanceDueCatchups() caller appeared. It now runs two " +
      "whole-table scans (the batch self-heal). If it is a member-facing page, " +
      "pass the viewer's id; if it is another oversight surface, add it here " +
      "and say why in batch-catchups.ts."
  );
  // The two that are allowed must still exist, or this list is guarding nothing.
  assert.equal(files.length, ALLOWED.size, `expected both known sweeps, found ${files.join(", ")}`);
});

test("the sidebar's test is 'have you got a Catch-up', not 'is your batch big'", () => {
  /* Spec 3.5b. His reason for hiding it is "it won't be reachble to them" --
     hide the door when there is nothing behind it. A strict batch-size test
     would have deleted Catch-ups from the sidebar of two live accounts that
     CAN open one: Jerry Maguire, who has no batch year at all and is in two,
     and the public demo's visitor, who is a member of `demo-catchup`. */
  const layout = decomment(read("src/app/(main)/layout.tsx"));
  assert.match(
    layout,
    /prisma\.catchup\.findFirst\(\{\s*where: \{ group: \{ members: \{ some: \{ userId: session\.user\.id \} \} \} \}/,
    "the layout no longer asks whether this member can open a Catch-up"
  );
  assert.match(layout, /hasCatchup=\{!!ownCatchup\}/, "the answer is not reaching the shell");

  const sidebar = decomment(read("src/components/layout/sidebar.tsx"));
  assert.match(
    sidebar,
    /hideCatchups =\s*user\.accountType === "teacher" \|\| user\.accountType === "ex_teacher" \|\| !hasCatchup/,
    "the sidebar no longer hides Catch-ups for a member with none"
  );
  // Hiding a door is not access control. /catchups still renders for anyone
  // signed in, and the invite link still works and makes the row appear.
  assert.match(
    sidebar,
    /hasCatchup = true/,
    "hasCatchup no longer defaults to true; a caller that forgets it now hides a whole feature"
  );
});

test("the migration is the fourth creation path, and it asserts before it re-points", () => {
  const sql = read("prisma/migrations-manual/2026-09-08-batch-catchups.sql");

  // The floor, retyped. The SQL cannot import the constant.
  const floor = sql.match(/\) >= (\d+)/);
  assert.ok(floor, "the backfill no longer has a floor");
  assert.equal(Number(floor[1]), BATCH_CATCHUP_FLOOR, "the backfill's floor is not BATCH_CATCHUP_FLOOR");

  /* THE ASSERTION IS THE POINT of the 2024 adoption. Re-pointing a Catch-up at
     a different group changes who can read it, so if anybody in the hand-made
     snapshot is NOT in the real batch group the whole file aborts rather than
     quietly taking somebody's access away. It has to come BEFORE the update. */
  const raise = sql.indexOf("RAISE EXCEPTION");
  const repoint = sql.indexOf('UPDATE "CatchupSeries"');
  assert.ok(raise !== -1, "the adoption no longer asserts the subset relation");
  assert.ok(raise < repoint, "the adoption re-points before it asserts");

  // And the re-point strips both things a batch Catch-up must not carry.
  assert.match(sql, /"createdById" = NULL/, "the adopted Catch-up keeps its Keeper");
  assert.match(sql, /"inviteToken" = NULL/, "the adopted Catch-up keeps its invite link");

  // One transaction, so a failed assertion leaves nothing behind.
  assert.match(sql, /^BEGIN;$/m);
  assert.match(sql, /^COMMIT;$/m);

  // Applied to BOTH Supabase projects. A second database with no way to
  // migrate it is a second database that will be wrong.
  assert.match(sql, /--env \.env\.demo/, "the file does not say to apply it to the demo project");
});
