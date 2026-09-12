import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* The geometry is TypeScript and this runner is bare node, so the numbers are
   asserted through the source the way the rest of the repo's protocol tests
   do. What matters here is not the arithmetic -- `drawnRows` is already
   pinned -- but that the constants describing the markup still describe it.
   A band box that is 4px taller than the section it stands in is a document
   that drifts by 4px per year, and with eighty years of archive that is a
   scroll position nobody can trust. */
const geometry = readFileSync(new URL("./river-geometry.ts", import.meta.url), "utf8");
const river = readFileSync(
  new URL("../components/collection/photo-river.tsx", import.meta.url),
  "utf8"
);
const layout = readFileSync(new URL("./photo-layout.ts", import.meta.url), "utf8");

const constant = (name) => {
  const m = geometry.match(new RegExp(`export const ${name} = (\\d+)`));
  assert.ok(m, `river-geometry.ts no longer exports ${name}`);
  return Number(m[1]);
};

test("the band chrome matches the markup it is measuring", () => {
  assert.match(
    river,
    /className={cn\("mb-4", !first && "mt-12"\)}/,
    "the band heading's margins changed; BAND_HEADING_GAP and BAND_SEPARATION " +
      "in river-geometry.ts describe them and must change with them"
  );
  assert.equal(constant("BAND_HEADING_GAP"), 16, "mb-4 is 16px");
  assert.equal(constant("BAND_SEPARATION"), 48, "mt-12 is 48px");
  assert.match(river, /gap=\{4\} className="mb-3"/, "the grid's tail margin changed");
  assert.equal(constant("BAND_GRID_TAIL"), 12, "mb-3 is 12px");
});

test("the reserved gap is the gap the grid is actually drawn with", () => {
  const gap = river.match(/gap=\{(\d+)\}/);
  assert.ok(gap, "the Collection river no longer passes an explicit gap");
  assert.equal(
    constant("RIVER_GAP"),
    Number(gap[1]),
    "RIVER_GAP and <PhotoStream gap> disagree, so every reserved row is the " +
      "wrong height by the difference"
  );
});

test("the numeric grid target and the CSS one cannot drift apart", () => {
  assert.match(
    layout,
    /export const PHOTO_GRID_TARGET = `min\(\$\{PHOTO_GRID_TARGET_PX\}px, 30%\)`/,
    "PHOTO_GRID_TARGET must be BUILT from PHOTO_GRID_TARGET_PX -- a second " +
      "literal is how the drawn height and the reserved height start to differ"
  );
});

test("the heading's own line box is accounted for", () => {
  assert.match(river, /text-\[22px\] leading-none/, "the band heading's type changed");
  assert.equal(constant("BAND_HEADING"), 22, "leading-none means the line box is the font size");
});

/* ------------------------------------------------------------------ *
 *  A year is drawn only when it holds exactly as many photographs as its
 *  box was computed for, so the index has to follow the archive when it
 *  changes. It did not: taking one photograph out of 2014 left 2014 one
 *  short of its box, and the whole year was drawn as blank paper until a
 *  reload -- "when I add or remove photos, the photos from that year
 *  disappear until I reload the page" (owner, 2026-09-12).
 * ------------------------------------------------------------------ */
const { holdsBand, ratioOf, reshapeBand, sameIndex } = await import("./river-geometry.ts");

const shot = (w, h) => ({ width: w, height: h });
const index = [
  [1.5, "2015"],
  [0.667, "2014"],
  [1.5, "2014"],
  [1.333, "2014"],
  [1, "2013"],
];

test("a ratio is rounded exactly as the server writes it into the index", () => {
  assert.equal(ratioOf(3000, 2000), 1.5);
  assert.equal(ratioOf(2000, 3000), 0.667);
  assert.equal(ratioOf(0, 100), 1, "a missing dimension is a square, never Infinity");
});

test("a year holds its band only when every shape matches, in order", () => {
  const year = [shot(2000, 3000), shot(3000, 2000), shot(4000, 3000)];
  assert.equal(holdsBand(index, "2014", year), true);
  assert.equal(holdsBand(index, "2014", year.slice(1)), false, "one taken out");
  assert.equal(holdsBand(index, "2014", [...year, shot(1, 1)]), false, "one added");
  assert.equal(holdsBand(index, "2014", [year[1], year[0], year[2]]), false, "reordered");
  assert.equal(holdsBand(index, "2012", []), true, "a year the index lacks holds nothing");
  assert.equal(holdsBand(index, "2012", [shot(1, 1)]), false);
});

test("removing a photograph reshapes only its own year", () => {
  const rest = [shot(2000, 3000), shot(4000, 3000)];
  assert.deepEqual(reshapeBand(index, "2014", rest), [
    [1.5, "2015"],
    [0.667, "2014"],
    [1.333, "2014"],
    [1, "2013"],
  ]);
});

test("a year that arrives bigger than the index said takes the room it needs", () => {
  const grown = [shot(2000, 3000), shot(3000, 2000), shot(4000, 3000), shot(1000, 1000)];
  const next = reshapeBand(index, "2014", grown);
  assert.equal(next.filter(([, k]) => k === "2014").length, 4);
  assert.deepEqual(next.at(-1), [1, "2013"], "the years below keep their place");
});

test("an unchanged year hands back the same index, so nothing re-renders", () => {
  const year = [shot(2000, 3000), shot(3000, 2000), shot(4000, 3000)];
  assert.equal(reshapeBand(index, "2014", year), index);
});

test("the last photograph out of a year takes the year with it", () => {
  assert.deepEqual(
    reshapeBand([[1, "2015"], [1, "2014"]], "2014", []),
    [[1, "2015"]]
  );
});

test("two answers describing the same archive compare equal, whatever their identity", () => {
  assert.equal(sameIndex(index, index.map((s) => [...s])), true);
  assert.equal(sameIndex(index, index.slice(1)), false);
  assert.equal(sameIndex(index, index.map(([r, k]) => [r, k === "2013" ? "2012" : k])), false);
});
