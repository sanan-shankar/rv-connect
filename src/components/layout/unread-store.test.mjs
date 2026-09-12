import test from "node:test";
import assert from "node:assert/strict";

import {
  decrementUnread,
  getUnread,
  resetUnreadStore,
  seedUnread,
  seedVerdict,
  setUnread,
  subscribeUnread,
} from "./unread-store.ts";

/* The bug this pins, measured 2026-09-12 at 390x844: mark every notification
   read on /feed, tap through to /directory, and the badge said "3 unread"
   again while the database said 0. The (main) layout's count is frozen at the
   last full page load and the band's bell remounts on every route change, so
   each mount resurrected the stale number. */

test("a stale prop never puts a read notification back on the badge", () => {
  resetUnreadStore();
  // Hard load of /feed: nothing has set a count, so the prop is the truth.
  assert.equal(seedUnread(3), "seed");
  assert.equal(getUnread(), 3);

  // The member reads them.
  setUnread(0);

  // Navigating to /directory mounts the band's bell with the layout's frozen
  // 3, and every later page change hands over that same 3.
  assert.equal(seedUnread(3), "agrees", "a number this document has already seen is not news");
  assert.equal(seedUnread(3), "agrees");
  assert.equal(getUnread(), 0, "this is the bug: the badge must stay cleared");
});

test("moving between the two bells costs no server round trip", () => {
  resetUnreadStore();
  seedUnread(3); // /feed, hard load
  setUnread(0); // mark all read
  assert.equal(seedUnread(3), "agrees"); // /directory, frozen layout prop
  assert.equal(seedUnread(0), "agrees"); // back to /feed, freshly rendered 0
  assert.equal(seedUnread(3), "agrees"); // /directory again
  assert.equal(getUnread(), 0);
});

test("a count this document has never seen is checked with the server", () => {
  resetUnreadStore();
  seedUnread(3);
  setUnread(0);
  seedUnread(3);
  // A like arrives; /feed re-renders and counts 1. Unlike both the store and
  // anything seen so far, so the bell asks rather than guessing either way.
  assert.equal(seedUnread(1), "verify");
  assert.equal(getUnread(), 0, "the store holds until the server answers");
});

test("a prop that agrees costs nothing", () => {
  resetUnreadStore();
  seedUnread(2);
  assert.equal(seedUnread(2), "agrees");
  assert.equal(getUnread(), 2);
});

test("seedVerdict is the whole rule, and it is pure", () => {
  assert.equal(seedVerdict(null, new Set(), 4), "seed");
  assert.equal(seedVerdict(0, new Set(), 0), "agrees");
  assert.equal(seedVerdict(0, new Set([3]), 3), "agrees");
  assert.equal(seedVerdict(0, new Set([2]), 3), "verify");
});

test("the count never goes below zero", () => {
  resetUnreadStore();
  seedUnread(1);
  decrementUnread();
  decrementUnread();
  assert.equal(getUnread(), 0);
  setUnread(-5);
  assert.equal(getUnread(), 0);
});

test("every bell in the document hears a change", () => {
  resetUnreadStore();
  let header = 0;
  let band = 0;
  const unsubscribe = subscribeUnread(() => header++);
  subscribeUnread(() => band++);
  setUnread(7);
  assert.equal(header, 1);
  assert.equal(band, 1);
  // An identical value is not a change; re-rendering both bells for it would
  // replay the badge's pop animation for nothing.
  setUnread(7);
  assert.equal(header, 1);
  unsubscribe();
  setUnread(2);
  assert.equal(header, 1, "an unmounted bell must stop hearing");
  assert.equal(band, 2);
});
