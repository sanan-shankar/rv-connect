import assert from "node:assert/strict";
import test from "node:test";

import { chooseGroupSuccessor, promoteGroupSuccessor } from "./group-succession.ts";
import { CATCHUP_PEOPLE } from "./catchup-caps.ts";
import { read as readRepo, decomment, balancedBody } from "./test-kit.mjs";

const at = (iso) => new Date(iso);
const member = (userId, role, joinedAt) => ({ userId, role, joinedAt: at(joinedAt) });

test("nobody is promoted while another admin is still there", () => {
  const rows = [
    member("leaving", "admin", "2026-01-01"),
    member("other-admin", "admin", "2026-02-01"),
    member("plain", "member", "2026-03-01"),
  ];
  assert.equal(chooseGroupSuccessor(rows, "leaving"), null);
});

test("the longest-standing remaining member inherits an orphaned group", () => {
  const rows = [
    member("leaving", "admin", "2026-01-01"),
    member("late", "member", "2026-05-01"),
    member("early", "member", "2026-02-01"),
  ];
  assert.equal(chooseGroupSuccessor(rows, "leaving"), "early");
});

test("a group whose last member is leaving has no successor", () => {
  assert.equal(chooseGroupSuccessor([member("leaving", "admin", "2026-01-01")], "leaving"), null);
  assert.equal(chooseGroupSuccessor([], "leaving"), null);
});

test("a keeper counts as an admin already in place", () => {
  const rows = [member("leaving", "admin", "2026-01-01"), member("keeper", "keeper", "2026-02-01")];
  assert.equal(chooseGroupSuccessor(rows, "leaving"), null);
});

test("a joinedAt tie resolves the same way whatever order the rows arrive in", () => {
  // People added by one createMany share a timestamp to the millisecond, and
  // findMany makes no ordering promise, so without a tiebreak the successor
  // would depend on how Postgres felt that second.
  const rows = [
    member("b", "member", "2026-04-01"),
    member("a", "member", "2026-04-01"),
    member("leaving", "admin", "2026-01-01"),
  ];
  assert.equal(chooseGroupSuccessor(rows, "leaving"), "a");
  assert.equal(chooseGroupSuccessor([...rows].reverse(), "leaving"), "a");
});

/* ------------------------------------------------------------------ *
 *  C-023: the hat is handed on before the head leaves.
 *
 *  Driven against a fake database, so what is tested is the behaviour
 *  (who gets written, and when nothing is) rather than the shape of the
 *  source.
 * ------------------------------------------------------------------ */

/* A row's `canAct: false` stands for an account `CATCHUP_PEOPLE` excludes
   (blocked, leaving, a teacher, not yet verified). The fake applies the filter
   only when the caller asks for it, so a caller that stops asking is caught by
   the behaviour, not by reading its source. */
function fakeDb(rows) {
  const writes = [];
  const reads = [];
  return {
    writes,
    reads,
    groupMember: {
      async findMany({ where }) {
        reads.push(where);
        return rows.filter(
          (r) => r.groupId === where.groupId && (where.user !== CATCHUP_PEOPLE || r.canAct !== false)
        );
      },
      async updateMany({ where, data }) {
        const row = rows.find((r) => r.groupId === where.groupId && r.userId === where.userId);
        if (!row) return { count: 0 };
        writes.push({ userId: where.userId, role: data.role });
        row.role = data.role;
        return { count: 1 };
      },
    },
  };
}

const inGroup = (userId, role, joinedAt, canAct = true) => ({ groupId: "g", userId, role, joinedAt: at(joinedAt), canAct });

test("C-023: the last role-holder leaving hands the powers on", async () => {
  const db = fakeDb([
    inGroup("keeper", "keeper", "2026-01-01"),
    inGroup("older", "member", "2026-02-01"),
    inGroup("newer", "member", "2026-03-01"),
  ]);
  assert.equal(await promoteGroupSuccessor(db, "g", "keeper"), "older");
  assert.deepEqual(db.writes, [{ userId: "older", role: "keeper" }]);
});

test("C-023: an ordinary member leaving promotes nobody", async () => {
  const db = fakeDb([
    inGroup("keeper", "keeper", "2026-01-01"),
    inGroup("leaving", "member", "2026-02-01"),
  ]);
  assert.equal(await promoteGroupSuccessor(db, "g", "leaving"), null);
  assert.deepEqual(db.writes, []);
});

test("C-023: the last member of all leaves nobody to promote, and that is fine", async () => {
  const db = fakeDb([inGroup("keeper", "keeper", "2026-01-01")]);
  assert.equal(await promoteGroupSuccessor(db, "g", "keeper"), null);
  assert.deepEqual(db.writes, []);
});

test("C-023: a successor who left in the same beat is a no-op, not a failure", async () => {
  const rows = [inGroup("keeper", "keeper", "2026-01-01"), inGroup("older", "member", "2026-02-01")];
  const db = fakeDb(rows);
  // Chosen from the snapshot, then gone before the write lands.
  const realUpdate = db.groupMember.updateMany;
  db.groupMember.updateMany = async (args) => {
    rows.splice(rows.findIndex((r) => r.userId === "older"), 1);
    return realUpdate.call(db.groupMember, args);
  };
  assert.equal(await promoteGroupSuccessor(db, "g", "keeper"), null);
});

test("T2a-09 / L10-01: the hat skips a longer-standing member who cannot act", async () => {
  const db = fakeDb([
    inGroup("keeper", "keeper", "2026-01-01"),
    inGroup("blocked-or-unverified", "member", "2026-02-01", false),
    inGroup("next", "member", "2026-03-01"),
  ]);
  assert.equal(await promoteGroupSuccessor(db, "g", "keeper"), "next");
  assert.deepEqual(db.writes, [{ userId: "next", role: "keeper" }]);
  assert.ok(db.reads.every((w) => w.user === CATCHUP_PEOPLE), "succession read the roster without the Catch-up rule");
});

test("T2a-09: a holder who can no longer act does not count as somebody else holding the powers", async () => {
  const db = fakeDb([
    inGroup("keeper", "keeper", "2026-01-01"),
    inGroup("stranded", "keeper", "2026-02-01", false),
    inGroup("member", "member", "2026-03-01"),
  ]);
  assert.equal(await promoteGroupSuccessor(db, "g", "keeper"), "member");
});

test("T2a-09: when nobody left can act, nobody is promoted", async () => {
  const db = fakeDb([inGroup("keeper", "keeper", "2026-01-01"), inGroup("only", "member", "2026-02-01", false)]);
  assert.equal(await promoteGroupSuccessor(db, "g", "keeper"), null);
  assert.deepEqual(db.writes, []);
});

/* ------------------------------------------------------------------ *
 *  One word for the hat (bug audit 3, T7a-07 and T3-15).
 *
 *  Three writers used two words: leaving and setCatchupKeeper wrote
 *  "keeper", the purge's succession and an admin's merge wrote "admin", and
 *  the revoke matched only "keeper", so a Keeper made by the purge or a merge
 *  could never be relieved, while the People door said they had been. Every
 *  writer now says "keeper"; "admin" is left only on a creator's own row from
 *  creation, and the revoke takes either from anyone but the creator.
 * ------------------------------------------------------------------ */

test("T7a-07: the purge's succession reads only members who can act, and writes keeper", () => {
  const src = decomment(readRepo("src/lib/account-purge.ts"));
  const fn = balancedBody(src, "async function promoteOrphanedGroups(");
  assert.ok(fn, "promoteOrphanedGroups is gone; this pin is reading nothing");
  assert.match(
    fn,
    /where:\s*\{\s*groupId:\s*\{\s*in:\s*groupIds\s*\},\s*user:\s*CATCHUP_PEOPLE\s*\}/,
    "the purge hands the hat to whoever is oldest, able to act or not"
  );
  assert.match(fn, /data:\s*\{\s*role:\s*"keeper"\s*\}/, "the purge no longer writes the hat as keeper");
  assert.doesNotMatch(src, /role:\s*"admin"/, "the purge writes the role a Keeper's revoke cannot take back again");
});

test("T7a-07: an admin's merge carries the hat over as keeper", () => {
  const src = decomment(readRepo("src/app/(main)/admin/people/actions.ts"));
  const fn = balancedBody(src, "export async function adminMergeUsers(");
  assert.ok(fn, "adminMergeUsers is gone; this pin is reading nothing");
  assert.match(fn, /role:\s*\{\s*in:\s*\["admin",\s*"keeper"\]\s*\}[\s\S]{0,200}?data:\s*\{\s*role:\s*"keeper"\s*\}/, "the merge's carry-over no longer writes keeper");
  assert.doesNotMatch(fn, /data:\s*\{\s*role:\s*"admin"\s*\}/, "the merge mints an admin row a Keeper's revoke cannot take back");
});

test("T7a-07: in the Catch-up actions, \"admin\" is written once, for the creator at creation", () => {
  const src = decomment(readRepo("src/app/(main)/catchups/actions.ts"));
  const writes = src.match(/role:\s*"admin"/g) ?? [];
  assert.equal(writes.length, 1, `found ${writes.length} writes of role "admin"; only the creator's own row at creation may carry it`);
  assert.match(balancedBody(src, "export async function createCatchupWithPeople(") ?? "", /\{\s*userId:\s*creatorId,\s*role:\s*"admin"\s*\}/);
});

test("T3-15: taking the hat back takes either word, and never from the creator", () => {
  const src = decomment(readRepo("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function setCatchupKeeper(");
  assert.ok(fn, "setCatchupKeeper is gone; this pin is reading nothing");
  const revoke = fn.indexOf('role: { in: ["keeper", "admin"] }');
  assert.ok(revoke > -1, "the revoke matches only one role word again, so an admin-row Keeper is told they were relieved and is not");
  const creator = fn.indexOf("Whoever started a Catch-up is always its Keeper.");
  assert.ok(creator > -1 && creator < revoke, "the creator's refusal no longer runs before the revoke, which now matches their admin row");
});

test("C-023: every path that removes a membership promotes first", async () => {
  const { readFileSync } = await import("node:fs");
  const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  const sites = {
    "leaving a Catch-up": ["../app/(main)/catchups/actions.ts", "leaveCatchup"],
    "a Keeper removing somebody": ["../app/(main)/catchups/actions.ts", "removeCatchupMember"],
  };
  for (const [label, [file, fn]] of Object.entries(sites)) {
    const src = read(file);
    const start = src.indexOf(`export async function ${fn}(`);
    assert.notEqual(start, -1, `${fn} is gone`);
    const body = src.slice(start, src.indexOf("\nexport async function", start + 10));
    assert.match(body, /promoteGroupSuccessor\(tx,/, `${label} no longer promotes a successor`);
    assert.ok(
      body.indexOf("promoteGroupSuccessor") < body.indexOf("groupMember.deleteMany"),
      `${label} promotes AFTER the row is gone, which promotes nobody`
    );
    assert.ok(
      body.indexOf("$transaction") < body.indexOf("promoteGroupSuccessor"),
      `${label} promotes outside the transaction that removes the row`
    );
  }
  /* There was a THIRD path: the nightly sweep that emptied the thirty-day bin
     took the membership row on the last night, and promoted a successor first
     for the same reason. Build phase 5 deleted the bin (his, N18), so the
     sweep is gone and retention removes no memberships at all. Pinned as an
     absence: a sweep that starts removing them again must promote first, and
     this is where that would be noticed. */
  const retention = read("./retention.ts");
  assert.ok(
    !retention.includes("groupMember.deleteMany"),
    "the retention sweep removes memberships again; it must promote a successor first"
  );
});
