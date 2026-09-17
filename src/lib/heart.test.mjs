import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { settledHeart } from "./heart.ts";
import { createToggleQueue } from "./toggle-queue.ts";

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
  "catch-up answer": "../components/catchups/edition/entry-love-button.tsx",
  /* The Collection's heart moved into the grid on 2026-08-28: it is drawn in
     the full-screen viewer now, and the row it changes lives on the page
     behind, so the two agree when the viewer closes. `photo-love-button.tsx`
     went with the /collection/[id] page it was the only caller of. */
  "collection photo": "../components/collection/collection-client.tsx",
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

test("C-010/C-133: the shared toggle is built on the queue and adopts the answer", () => {
  // The five assertions above lean on this one file, so it is checked
  // directly: without these lines they would pass while every heart in the
  // app quietly lost both fixes at once. The queue's BEHAVIOUR is driven
  // below rather than read.
  const hook = readFileSync(
    new URL("../components/posts/use-engagement.ts", import.meta.url),
    "utf8"
  );
  assert.match(hook, /settledHeart\(before, result\.liked \?\? result\.loved\)/, "the hook ignores what the server said");
  assert.match(hook, /createToggleQueue<T>\(/, "the hook no longer goes through the toggle queue");
});

/* ---- the queue, against a slow fake server ----------------------- *
 * 2026-09-17, the owner on a phone: "sometimes it just doesn't react for even
 * 5 taps even though it compresses", and on a Catch-up, "the celebration
 * shows ... but the heart doesn't colour in". A like took up to 2.7s, and the
 * old guard REFUSED every tap made while one was in the air. */

function fakeServer({ liked = false, answer } = {}) {
  const server = { liked, calls: 0, pending: [] };
  server.action = () => {
    server.calls += 1;
    return new Promise((resolve) => {
      server.pending.push(() => {
        server.liked = !server.liked;
        resolve(answer ? answer(server) : { success: true, liked: server.liked });
      });
    });
  };
  server.land = async () => {
    const next = server.pending.shift();
    assert.ok(next, "no request was in the air to land");
    next();
    // Let the queue's continuation run.
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };
  return server;
}

function heartQueue(server, errors = []) {
  const screen = { state: { liked: false, count: 4 } };
  const fire = createToggleQueue({
    action: server.action,
    flip: (b) => ({ liked: !b.liked, count: b.liked ? b.count - 1 : b.count + 1 }),
    settle: (b, r) => settledHeart(b, r.liked),
    same: (a, b) => a.liked === b.liked,
    onError: (m) => errors.push(m),
  });
  const tap = () => fire(screen.state, (next) => (screen.state = next));
  return { screen, tap };
}

test("every tap during a slow write flips the heart; none is refused", async () => {
  const server = fakeServer();
  const { screen, tap } = heartQueue(server);
  tap();
  assert.equal(screen.state.liked, true);
  tap();
  assert.equal(screen.state.liked, false, "the second tap, mid-flight, was refused");
  tap();
  assert.equal(screen.state.liked, true, "the third tap, mid-flight, was refused");
  assert.equal(server.calls, 1, "C-010: a second toggle raced the first");
  await server.land();
  // The server is liked and so is the screen: nothing more to send.
  assert.equal(server.calls, 1);
  assert.deepEqual(screen.state, { liked: true, count: 5 });
  assert.equal(server.liked, true);
});

test("a tap that changes its mind mid-flight is sent once it lands", async () => {
  const server = fakeServer();
  const { screen, tap } = heartQueue(server);
  tap();
  tap();
  assert.equal(screen.state.liked, false);
  await server.land();
  assert.equal(server.calls, 2, "the unlike made during the flight was never sent");
  await server.land();
  assert.deepEqual(screen.state, { liked: false, count: 4 });
  assert.equal(server.liked, false, "the database disagrees with the screen");
});

test("C-133: a stale page ends where the member asked, not the opposite", async () => {
  // The page says not liked, the row says liked: the first toggle deletes.
  const server = fakeServer({ liked: true });
  const { screen, tap } = heartQueue(server);
  tap();
  await server.land();
  assert.equal(server.liked, false);
  await server.land();
  assert.equal(server.liked, true);
  assert.equal(screen.state.liked, true, "the heart did not colour in");
});

test("a refusal rolls back to what the server holds, with its message", async () => {
  const errors = [];
  const server = fakeServer({ answer: () => ({ error: "No." }) });
  const { screen, tap } = heartQueue(server, errors);
  tap();
  tap();
  tap();
  await server.land();
  assert.deepEqual(screen.state, { liked: false, count: 4 });
  assert.deepEqual(errors, ["No."]);
  assert.equal(server.calls, 1);
  // And the queue is free again afterwards.
  server.pending.length = 0;
  tap();
  assert.equal(server.calls, 2, "one refusal wedged the queue shut");
});

test("a server that never agrees cannot loop forever", async () => {
  const server = fakeServer({ answer: () => ({ success: true, liked: false }) });
  const { tap } = heartQueue(server);
  tap();
  for (let i = 0; i < 4; i++) await server.land();
  assert.equal(server.pending.length, 0, "the queue kept sending");
});

test("only the last tap's promise reports what stuck", async () => {
  const server = fakeServer();
  const { tap } = heartQueue(server);
  const first = tap();
  const second = tap();
  await server.land();
  await server.land();
  assert.equal(await first, undefined);
  assert.deepEqual(await second, { liked: false, count: 4 });
});

test("the Collection's queue is held per subject, not per hook", () => {
  /* 2026-09-08, an S23 in the Collection: "I get the celebration with the
     heart, the heart didn't fill in. when I tried on another it worked."
     Measured with the network throttled -- the second tap made ZERO requests.

     The guard was one boolean per hook INSTANCE. That is the same thing as
     per subject for four of the five hearts, because a card, a comment row
     and a letter each draw exactly one. The Collection draws one heart for
     the whole archive: the viewer walks the river and the page holds a single
     hook. So a tap on any photograph while another photograph's toggle was in
     the air was refused -- silently, and after the button had already played
     its flecks, because it animates on press rather than on the answer.

     Two lines carry the fix and both are checked: the id reaching the guard,
     and the id reaching the action (which is what let the target ref go). */
  const src = readFileSync(
    new URL("../components/collection/collection-client.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    src,
    /\{ subject: photo\.id \}/,
    "the Collection's heart does not tell the guard which photograph it is about"
  );
  assert.match(
    src,
    /useHeartToggle\(\(photoId\) => togglePhotoLove\(photoId\)\)/,
    "the Collection's action does not take the photograph from the tap that fired it"
  );
});
