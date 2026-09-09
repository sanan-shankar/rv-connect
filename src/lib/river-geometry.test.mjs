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
