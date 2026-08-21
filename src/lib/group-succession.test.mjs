import assert from "node:assert/strict";
import test from "node:test";

import { chooseGroupSuccessor } from "./group-succession.ts";

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
