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
    // All five reach both rules through `useHeartToggle` now. They each used
    // to spell out the busy ref and the settledHeart call, which is how a
    // sixth heart could be added with neither.
    assert.match(src, /useHeartToggle\(/, `${label} does not use the shared toggle`);
  });
}

test("C-010/C-133: the shared toggle is what actually guards and adopts", () => {
  // The five assertions above now all lean on this one file, so it is checked
  // directly rather than trusted: without these lines they would pass while
  // every heart in the app quietly lost both fixes at once.
  const hook = readFileSync(
    new URL("../components/posts/use-engagement.ts", import.meta.url),
    "utf8"
  );
  assert.match(hook, /settledHeart\(before, result\.liked \?\? result\.loved\)/, "the hook ignores what the server said");
  // One toggle in flight at a time: a ref the handler returns on, read and
  // set in the same tick a second tap would arrive in.
  assert.match(hook, /const busy = useRef\(false\);/, "the hook has no in-flight guard");
  assert.match(hook, /if \(busy\.current\) return undefined;/, "the hook keeps a busy flag but does not act on it");
  assert.match(hook, /busy\.current = true;/, "the hook never sets its guard");
  assert.match(hook, /} finally \{\s*busy\.current = false;/, "the guard is not released in a finally, so one rejection wedges it shut");
});
