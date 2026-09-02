/**
 * ONE BUILDER ASKS FOR EVERY PAGE OF THE RIVER.
 *
 * The Collection's river is walked in two directions -- older, appended at the
 * foot, and newer, prepended at the head when the year rail has landed
 * mid-river. Both are the same query with the same five dimensions on it
 * (scope, bucket, search, order, seek), and for a while they were two calls.
 *
 * The upward one forgot `scope`. `loadPhotos` reads a missing scope as the
 * Valley Collection -- the right default for a link arriving cold, and the
 * wrong one here -- so climbing out of a seek in the Class Collection
 * prepended valley photographs above the class ones, under the class heading.
 * The owner, 2026-09-02: "what's worse is it showed all the valley collection
 * photos under the heading of class collection." It also fed the re-seed loop
 * he had reported the week before, because every prepended valley photograph
 * made the next server page look like news.
 *
 * This is a source pin rather than a behavioural test on purpose. The bug is
 * not "the upward page was wrong once", it is "there are two places to name a
 * dimension and one of them can be missed" -- and a sixth dimension added next
 * year would be missed the same way. What has to stay true is structural: the
 * component reaches `loadPhotos` from exactly ONE place, and that place names
 * the scope.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "collection-client.tsx"), "utf8");

/** Call sites only: the import at the top of the file is not one. */
const callSites = [...source.matchAll(/\bloadPhotos\s*\(/g)].filter(
  (m) => !/import\s*\{[^}]*$/.test(source.slice(0, m.index))
);

test("the river is fetched from exactly one place", () => {
  assert.equal(
    callSites.length,
    1,
    `loadPhotos is called ${callSites.length} times in collection-client.tsx. ` +
      "Every page of the river, in both directions, goes through `fetchPage` -- " +
      "a second call site is a second list of query dimensions to keep in step, " +
      "and the last one dropped `scope` and put valley photographs in the Class " +
      "Collection."
  );
});

test("that one place names the scope", () => {
  const call = source.slice(callSites[0].index);
  const body = call.slice(0, call.indexOf("})") + 2);
  assert.match(
    body,
    /(^|[\s,{])scope\s*[,:]/m,
    "the river's one query does not pass `scope`. Without it the server " +
      "answers with the Valley Collection, which is safe but wrong: a member " +
      "reading their Class Collection would be shown the valley's photographs " +
      "under the class heading."
  );
});

test("loadNewer does not build its own query", () => {
  const start = source.indexOf("const loadNewer");
  assert.notEqual(start, -1, "loadNewer has been renamed; this pin needs updating");
  const body = source.slice(start, source.indexOf("}, [topCursor", start));
  assert.match(
    body,
    /fetchPage\(\s*topCursor\s*,\s*"newer"\s*\)/,
    "loadNewer asks for its page some other way than through `fetchPage`"
  );
});
