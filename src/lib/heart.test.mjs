import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { settledHeart } from "./heart.ts";

test("the ordinary tap: the server agrees with the flip", () => {
  assert.deepEqual(settledHeart({ liked: false, count: 4 }, true), { liked: true, count: 5 });
  assert.deepEqual(settledHeart({ liked: true, count: 5 }, false), { liked: false, count: 4 });
});

test("C-133: the server disagreeing puts the heart back where the row is", () => {
  // The stale-Back case: the page says "not liked" but the row says liked, so
  // the tap DELETED the real like and the action reports liked:false. The
  // heart must follow the row, not the guess.
  assert.deepEqual(settledHeart({ liked: false, count: 4 }, false), { liked: false, count: 4 });
  assert.deepEqual(settledHeart({ liked: true, count: 5 }, true), { liked: true, count: 5 });
});

test("C-010: a count never goes negative and never drifts by two", () => {
  assert.deepEqual(settledHeart({ liked: true, count: 0 }, false), { liked: false, count: 0 });
  // Whatever the answer, the count moves by at most one from where it started.
  for (const before of [{ liked: false, count: 3 }, { liked: true, count: 3 }]) {
    for (const server of [true, false, undefined]) {
      const after = settledHeart(before, server);
      assert.ok(Math.abs(after.count - before.count) <= 1);
      assert.equal(after.liked === before.liked, after.count === before.count);
    }
  }
});

test("an action that says nothing leaves the optimistic flip standing", () => {
  assert.deepEqual(settledHeart({ liked: false, count: 4 }, undefined), { liked: true, count: 5 });
});

/* ---- the five hearts that have to use it ------------------------- */

const HEARTS = {
  "post card (like)": "../components/posts/post-card.tsx",
  "comment": "../components/posts/comments-section.tsx",
  "letter": "../components/letters/letter-engagement.tsx",
  "catch-up answer": "../components/catchups/round/entry-love-button.tsx",
  "collection photo": "../components/collection/photo-love-button.tsx",
};

for (const [label, file] of Object.entries(HEARTS)) {
  test(`C-010/C-133: the ${label} heart guards its taps and adopts the answer`, () => {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(src, /settledHeart\(/, `${label} ignores what the server said`);
    // One toggle in flight at a time: a ref that the handler returns on.
    assert.match(src, /Busy\.current|busy\.current/, `${label} has no in-flight guard`);
    assert.match(
      src,
      /if \((?:\w*[Bb]usy)\.current\) return;/,
      `${label} keeps a busy flag but does not act on it`
    );
  });
}
