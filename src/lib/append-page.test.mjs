import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { decomment } from "./test-kit.mjs";
import { appendUnseen } from "./append-page.ts";

const row = (id) => ({ id, caption: id });

test("C-071: a row that shifted between pages appears once, not twice", () => {
  // Offset pagination: a photo approved mid-browse pushes everything down one,
  // so page 2 starts with the tile page 1 ended on.
  const shown = [row("a"), row("b"), row("c")];
  const arriving = [row("c"), row("d")];
  assert.deepEqual(
    appendUnseen(shown, arriving).map((p) => p.id),
    ["a", "b", "c", "d"]
  );
});

test("C-071: the copy already on screen is the one kept", () => {
  const mounted = { id: "c", caption: "the mounted node" };
  const arrived = { id: "c", caption: "a fresh object" };
  const [kept] = appendUnseen([mounted], [arrived]).filter((p) => p.id === "c");
  assert.equal(kept, mounted);
});

test("C-071: an ordinary page is appended whole, in order", () => {
  assert.deepEqual(
    appendUnseen([row("a")], [row("b"), row("c")]).map((p) => p.id),
    ["a", "b", "c"]
  );
  assert.deepEqual(appendUnseen([], [row("a")]).map((p) => p.id), ["a"]);
  assert.deepEqual(appendUnseen([row("a")], []).map((p) => p.id), ["a"]);
  // A page that is entirely a repeat adds nothing rather than doubling the list.
  assert.deepEqual(appendUnseen([row("a")], [row("a")]).map((p) => p.id), ["a"]);
});

test("C-179: the Collection river drops a page that answers the previous query", () => {
  // The feed and the directory have carried this guard since Low 75 / M36.
  // The Collection was the one list of the three without it.
  //
  // Read off the source rather than exercised, because what is being pinned is
  // an ORDERING inside one function -- read the generation, await, compare --
  // and a test that called it could pass with the read after the await, which
  // guards nothing. The names moved when the grid became the river (2026-08-28,
  // `handleLoadMore` -> `more`, `listGeneration` -> `generation`); the ordering
  // is the assertion and it did not.
  const src = readFileSync(new URL("../components/collection/collection-client.tsx", import.meta.url), "utf8");
  const start = src.indexOf("const more = useCallback(async ()");
  assert.notEqual(start, -1, "the river no longer has a load-more callback by that name");
  const loadMore = src.slice(start, src.indexOf("\n  }, [", start));
  assert.match(loadMore, /const mine = generation\.current;/);
  assert.match(loadMore, /if \(mine !== generation\.current\) return;/);
  // Captured BEFORE the await and compared after it, or it guards nothing.
  assert.ok(
    loadMore.indexOf("const mine =") < loadMore.indexOf("await callAction"),
    "the generation is read after the fetch, which proves nothing"
  );
  assert.ok(
    loadMore.indexOf("await callAction") < loadMore.indexOf("if (mine !=="),
    "the comparison happens before the fetch"
  );
  // ...and the effect that changes the query bumps it.
  assert.match(src, /generation\.current \+= 1;/);
  assert.ok(src.indexOf("generation.current += 1;") < start, "the bump is not in the filter effect");
  // The append itself is the deduping one.
  assert.match(loadMore, /appendUnseen\(prev, data\.photos\)/);
});

test("C-071: every paged list appends through appendUnseen, not its own Set", () => {
  // The rule this file exists for was written out inline in four places and
  // shared in one. The three that hand-rolled it each had the same Set-of-ids
  // filter -- so a change of mind about WHICH copy of a repeated row to keep
  // (see the helper's docblock: the mounted one) would have reached one list
  // and not the others.
  const LISTS = [
    "../components/posts/post-feed.tsx",
    "../components/posts/comments-section.tsx",
    "../components/profile/profile-author-feed.tsx",
    "../components/collection/collection-client.tsx",
  ];
  for (const rel of LISTS) {
    const src = decomment(readFileSync(new URL(rel, import.meta.url), "utf8"));
    assert.match(src, /appendUnseen\(/, `${rel} no longer appends through the shared helper`);
    assert.doesNotMatch(
      src,
      /new Set\(\w+\.map\(\(\w+\) => \w+\.id\)\)/,
      `${rel} has gone back to hand-rolling the id dedupe`
    );
  }
});
