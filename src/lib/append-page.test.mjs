import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

test("C-179: the Collection grid drops a page that answers the previous query", () => {
  // The feed and the directory have carried this guard since Low 75 / M36.
  // The Collection was the one list of the three without it.
  const src = readFileSync(new URL("../components/collection/collection-client.tsx", import.meta.url), "utf8");
  const start = src.indexOf("async function handleLoadMore()");
  assert.notEqual(start, -1);
  const loadMore = src.slice(start, src.indexOf("\n  }", start));
  assert.match(loadMore, /const generation = listGeneration\.current;/);
  assert.match(loadMore, /if \(generation !== listGeneration\.current\) return;/);
  // Captured BEFORE the await and compared after it, or it guards nothing.
  assert.ok(
    loadMore.indexOf("const generation =") < loadMore.indexOf("await callAction"),
    "the generation is read after the fetch, which proves nothing"
  );
  assert.ok(
    loadMore.indexOf("await callAction") < loadMore.indexOf("if (generation !=="),
    "the comparison happens before the fetch"
  );
  // ...and the effect that changes the query bumps it.
  assert.match(src, /listGeneration\.current \+= 1;/);
  assert.ok(src.indexOf("listGeneration.current += 1;") < start, "the bump is not in the filter effect");
  // The append itself is the deduping one.
  assert.match(loadMore, /appendUnseen\(prev, data\.photos\)/);
});
