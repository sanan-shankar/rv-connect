import { test } from "node:test";
import assert from "node:assert/strict";
import { catchupShelf, editionSlots, LIST_GRID_SLOTS } from "./catchup-shelf.ts";

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

/* ── the list's spare slots (spec section 5, build phase 6) ─────────── */

test("the grid holds four things, Catch-up cards first", () => {
  /* His table, verbatim: "if they have one catch up then max latest 3
     editions. if they have 2 catch ups the the latest two editions whichever
     one they're from. if they have four catch up, no need to show editions
     there." */
  assert.equal(editionSlots(1), 3);
  assert.equal(editionSlots(2), 2);
  assert.equal(editionSlots(3), 1);
  assert.equal(editionSlots(4), 0);
});

test("past four the grid is full, and the arithmetic never goes negative", () => {
  assert.equal(editionSlots(5), 0);
  assert.equal(editionSlots(40), 0);
});

test("no Catch-ups means no Editions, not three empty slots", () => {
  /* An Edition is only reachable through a membership, so the subtraction
     would be offering three slots to fill from an empty set. The page draws
     its own empty state instead. */
  assert.equal(editionSlots(0), 0);
  assert.equal(editionSlots(-1), 0);
});

test("four is his number and is stated once", () => {
  assert.equal(LIST_GRID_SLOTS, 4);
});
