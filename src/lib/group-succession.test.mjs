import assert from "node:assert/strict";
import test from "node:test";

import { chooseGroupSuccessor, promoteGroupSuccessor } from "./group-succession.ts";

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

function fakeDb(rows) {
  const writes = [];
  return {
    writes,
    groupMember: {
      async findMany({ where }) {
        return rows.filter((r) => r.groupId === where.groupId);
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

const inGroup = (userId, role, joinedAt) => ({ groupId: "g", userId, role, joinedAt: at(joinedAt) });

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
  // ...and the nightly sweep, which empties a bin the same way.
  const retention = read("./retention.ts");
  const step = retention.slice(retention.indexOf('await step("catchupCopies"'));
  assert.match(step, /promoteGroupSuccessor\(tx, row\.catchup\.groupId, row\.userId\)/);
  assert.ok(step.indexOf("promoteGroupSuccessor") < step.indexOf("groupMember.deleteMany"));
});
