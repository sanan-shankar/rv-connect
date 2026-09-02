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
const river = readFileSync(join(here, "photo-river.tsx"), "utf8");

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

/**
 * A YEAR IS NOT A REACT KEY.
 *
 * `bandsOf` cuts consecutive runs, so the same year comes back as several
 * bands whenever the list is not sorted by year -- which is every render
 * between pressing Chronological and the chronological page arriving.
 * `key={band.key}` therefore emitted `key="2021"` four times, React stopped
 * being able to reconcile the list, and sections it no longer owned stayed on
 * the page: photographs shown twice, year headings under Newest, a river only
 * a reload could clear. Measured 2026-09-02: eight scope swaps grew the
 * valley's 17 photographs to 41 nodes.
 */
test("the river's sections are keyed by a photograph, not by a year", () => {
  assert.doesNotMatch(
    river,
    /<section key=\{band\.key/,
    "PhotoRiver is keying a band by its year again. A year repeats; the row a " +
      "run starts at does not."
  );
  assert.match(
    river,
    /<section key=\{band\.photos\[0\]\?\.id/,
    "PhotoRiver's section key is no longer the band's first photograph id"
  );
});

/**
 * The river draws time from the order its photographs were FETCHED in, never
 * from the order that has been asked for. The two differ for the second the
 * new page is in the air, and drawing the request is what cut an
 * upload-ordered list into year chapters in the first place.
 */
test("the river is grouped by the order its photographs came back in", () => {
  // The JSX element, not the "<PhotoRiver>" the file header names in prose.
  const at = source.search(/<PhotoRiver\s*\n/);
  assert.notEqual(at, -1, "PhotoRiver is no longer rendered here; this pin needs updating");
  const props = source.slice(at, source.indexOf("/>", at));
  assert.match(props, /order=\{riverOrder\}/, "PhotoRiver is being given the requested order again");
  assert.doesNotMatch(props, /order=\{order\}/, "PhotoRiver is being given the requested order again");
});

/**
 * The head sentinel sits exactly where a seek lands the reader, so "is it on
 * screen" is true the moment they arrive and cannot be the reason to fetch.
 * Ungated, pressing 2020 walked the river back to 2026 on its own: three of
 * six seeks landed on the wrong year.
 */
test("the upward pull needs the reader to have asked", () => {
  const start = source.indexOf("const head = useRef");
  assert.notEqual(start, -1, "the head sentinel has been renamed; this pin needs updating");
  const body = source.slice(start, source.indexOf("}, [topCursor", start));
  assert.match(
    body,
    /wantsNewer\(\)/,
    "the head sentinel fires on visibility alone again, which is true at every landing"
  );
});

/**
 * ...and the observer cannot be the only thing that asks. It reports
 * TRANSITIONS: after a seek the seam enters range once, that one callback
 * runs at the landing when the answer is no, and it never fires again because
 * the seam never leaves range. The reader was then stranded at the year they
 * pressed with the page title where the year above should be. The scroll
 * listener re-asks on every scroll, which is the half that makes climbing out
 * possible at all.
 */
test("the scroll re-asks for the seam, not only the observer", () => {
  const start = source.indexOf("const onScroll = () =>");
  assert.notEqual(start, -1, "the scroll watcher has been renamed; this pin needs updating");
  const body = source.slice(start, start + 1600);
  assert.match(
    body,
    /headNear\.current && wantsNewer\(\)/,
    "only the IntersectionObserver asks for the seam again, and it only fires on transitions"
  );
});

/**
 * A landing must clear the whole viewport that is already pinned, not a
 * hardcoded 24px. On a phone the app bar is 56px, so a pressed year landed
 * underneath the bar it was pressed from.
 */
test("the landing measures what is pinned over the viewport", () => {
  const start = source.indexOf("const headOfRiver = useCallback");
  const body = source.slice(start, source.indexOf("}, []);", start));
  assert.match(body, /data-app-bar/, "headOfRiver is back to assuming the desktop rail's 24px");
});
