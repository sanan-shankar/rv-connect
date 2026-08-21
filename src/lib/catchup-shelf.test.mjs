import { test } from "node:test";
import assert from "node:assert/strict";
import { RECENTLY_DELETED_DAYS, catchupShelf, restoreDaysLeft } from "./catchup-shelf.ts";

const DAY = 86_400_000;
const NOW = new Date("2026-08-21T12:00:00.000Z");

test("no pref row means the copy is simply on the list", () => {
  assert.equal(catchupShelf(null), "active");
  assert.equal(catchupShelf({ archivedAt: null, deletedAt: null }), "active");
});

test("archived and deleted each claim the copy, and deleted wins over both stamps", () => {
  assert.equal(catchupShelf({ archivedAt: NOW, deletedAt: null }), "archived");
  assert.equal(catchupShelf({ archivedAt: null, deletedAt: NOW }), "deleted");
  assert.equal(catchupShelf({ archivedAt: NOW, deletedAt: NOW }), "deleted");
});

test("a copy deleted this instant has the full window left", () => {
  assert.equal(restoreDaysLeft(NOW, NOW), RECENTLY_DELETED_DAYS);
});

test("the last partial day still reads as one day, never zero", () => {
  const nearlyUp = new Date(NOW.getTime() - (RECENTLY_DELETED_DAYS * DAY - 1));
  assert.equal(restoreDaysLeft(nearlyUp, NOW), 1);
});

test("a row the sweep has not reached yet counts down to zero, never below", () => {
  const overdue = new Date(NOW.getTime() - (RECENTLY_DELETED_DAYS + 9) * DAY);
  assert.equal(restoreDaysLeft(overdue, NOW), 0);
});

test("ISO strings work, because the client reads serialized dates", () => {
  assert.equal(restoreDaysLeft(NOW.toISOString(), NOW), RECENTLY_DELETED_DAYS);
});

test("the countdown and the sweep delete by the same boundary", () => {
  // The sweep's predicate is `deletedAt < now - RECENTLY_DELETED_DAYS`. A row
  // exactly on that boundary is NOT taken, and this says 0 days left rather
  // than a negative count -- so no row can read "1 day left" on a morning the
  // sweep has already emptied it.
  const cutoff = new Date(NOW.getTime() - RECENTLY_DELETED_DAYS * DAY);
  assert.equal(restoreDaysLeft(cutoff, NOW), 0);
  assert.equal(cutoff < cutoff, false);
  const older = new Date(cutoff.getTime() - 1);
  assert.equal(older < cutoff, true);
  assert.equal(restoreDaysLeft(older, NOW), 0);
  // ...and the last instant BEFORE the boundary still reads as a live day.
  const stillLive = new Date(cutoff.getTime() + 1);
  assert.equal(restoreDaysLeft(stillLive, NOW), 1);
});
