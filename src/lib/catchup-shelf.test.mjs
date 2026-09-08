import { test } from "node:test";
import assert from "node:assert/strict";
import { catchupShelf } from "./catchup-shelf.ts";

const NOW = new Date("2026-08-21T12:00:00.000Z");

test("no pref row means the copy is simply on the list", () => {
  assert.equal(catchupShelf(null), "active");
  assert.equal(catchupShelf({ archivedAt: null }), "active");
});

test("an archived stamp files the copy away, and nothing else does", () => {
  assert.equal(catchupShelf({ archivedAt: NOW }), "archived");
  assert.equal(catchupShelf({ archivedAt: NOW.toISOString() }), "archived");
});

test("the thirty-day bin is gone, not hidden", () => {
  /* `deleted` was a third shelf, with a countdown on the row and a nightly
     sweep that took the member's GroupMember row on the last night. Deleting
     became LEAVING in build phase 5 (his, N18), which happens in the moment,
     so a copy is either on the list or filed away.

     Pinned here rather than left to tsc: a `deletedAt` reaching this function
     from an old caller must not quietly file something away, and the column
     itself outlives this commit -- it is dropped in phase 11. */
  const withStamp = { archivedAt: null, deletedAt: NOW };
  assert.equal(catchupShelf(withStamp), "active");
});
