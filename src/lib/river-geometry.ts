/* ------------------------------------------------------------------ *
 *  Where every year of the Collection sits, and how tall it is, before
 *  any of its photographs have been fetched.
 *
 *  This is the file that lets the river stop lying about its own
 *  height. Everything the archive's scrolling has gone wrong with for
 *  three sessions -- the runaway fetch, the white flash, the teleport,
 *  the page title appearing where 2018 should be -- comes from one
 *  fact: the document only knew how tall it was where photographs had
 *  already arrived, so it grew under the reader and the scroll had to
 *  be corrected afterwards. There is no good setting for that
 *  correction. Reserve nothing and the reader hits the ceiling;
 *  reserve space you cannot fill in time and they scroll into blank
 *  paper. Both were built and measured on 2026-09-09, and both are in
 *  that day's progress entry as dead ends.
 *
 *  The way out is not a better correction. It is knowing the answer in
 *  advance, which is possible because justified row-breaking is
 *  arithmetic: a row's height follows from the aspect ratios on it and
 *  the width of the column, and `drawnRows` already does that sum for
 *  the renderer. Ratios for the WHOLE query now ride back with the
 *  first page (`PhotoShapeIndex`, 1.3 KB gzipped for 1,718
 *  photographs), so every year's exact pixel height is computable
 *  before a single thumbnail loads.
 *
 *  What that buys, in order of how much the reader feels it:
 *    - the document is its true height on the first frame, so scrolling
 *      up cannot reach the page title and nothing needs anchoring;
 *    - a year that has not loaded is drawn as a box of exactly the
 *      height its photographs will occupy, so filling it moves nothing;
 *    - the loader can ask "what is at this scroll position" instead of
 *      walking pages from wherever it happens to be;
 *    - pressing a year on the rail is a scroll to a known offset rather
 *      than a query.
 * ------------------------------------------------------------------ */

import {
  drawnRows,
  photoGrow,
  PHOTO_GRID_TARGET_PX,
  PHOTO_GRID_MAX_SCALE,
} from "./photo-layout.ts";
import type { PhotoShapeIndex } from "@/app/(main)/collection/actions";

/** One year of the river, with its place in the document already known. */
export type BandBox = {
  key: string;
  /** Indices into the shape index: `[from, to)`. */
  from: number;
  to: number;
  count: number;
  /** The photographs' own height, excluding the heading above them. */
  gridHeight: number;
  /** Heading, its margins and the grid: what the section really occupies. */
  height: number;
  /** Distance from the top of the river to the top of this section. */
  top: number;
};

/** The chrome a band carries besides its photographs, in px.
 *
 *  Read off the markup in photo-river.tsx rather than guessed, and it has to
 *  move when that markup does: the heading's own line box, the `mb-4` under
 *  it, the `mt-12` above every band but the first, and the `mb-3` under the
 *  grid. A number here that disagrees with the CSS is a document whose height
 *  drifts by that much per year, which is the one failure this module exists
 *  to prevent -- `river-geometry.test.mjs` pins them against the classes. */
export const BAND_HEADING = 22; // font-heading 22px, leading-none
export const BAND_HEADING_GAP = 16; // mb-4
export const BAND_SEPARATION = 48; // mt-12, every band after the first
export const BAND_GRID_TAIL = 12; // mb-3

/** The row gap the Collection grid is drawn with. Matches <PhotoStream gap>. */
export const RIVER_GAP = 4;

/** The height a run of photographs occupies at a given column width.
 *
 *  Straight out of `drawnRows`, which is the same arithmetic the browser
 *  performs -- deliberately, so that a box drawn for photographs that have not
 *  arrived is the size they will actually be. The caps are the grid's own:
 *  `maxScale` times the target, expressed as a width, exactly as
 *  <PhotoStream> sets `maxWidth`. */
export function gridHeightOf(ratios: number[], width: number): number {
  if (ratios.length === 0 || width <= 0) return 0;
  const target = targetFor(width);
  const caps = ratios.map((r) => r * target * PHOTO_GRID_MAX_SCALE);
  const rows = drawnRows(ratios, caps, width, RIVER_GAP, target);
  /* THE LAST ROW IS NEITHER JUSTIFIED NOR AT THE TARGET, and both wrong
     answers were measured before this one. <PhotoStream> ends with a
     zero-width ghost cell carrying a large flex-grow, so the trailing row
     runs short instead of blowing one leftover photograph up to the width of
     the page -- the standard justified-gallery answer, and Google Photos'.

     Treating that row as justified put a 208-photograph year 210px too tall.
     Treating it as exactly the target put a one-photograph year 29px too
     short, because the ghost does NOT swallow all the slack: flex shares free
     space in proportion to grow factors, and the photographs have their own
     (`photoGrow`). The ghost merely takes the lion's share. So the row grows
     by its proportional cut, which works out the same for every photograph on
     it -- each one's width rises by `free * g_i / sum(g)`, and dividing by
     its ratio gives one height for the row.

     `photoGrow` rather than the numbers it returns, so this cannot drift from
     the component it is predicting. */
  const ghost = photoGrow(24);
  const last = rows[rows.length - 1];
  const lastCount = last.widths.length;
  const sumR = ratios.slice(ratios.length - lastCount).reduce((a, r) => a + r, 0);
  /* `lastCount` gaps, not `lastCount - 1`: the ghost is a flex item too, so it
     brings a gap of its own between itself and the final photograph. */
  const free = width - RIVER_GAP * lastCount - target * sumR;
  const lastHeight =
    free > 0 ? target + (free * photoGrow(1)) / (photoGrow(sumR) + ghost) : last.height;

  const stacked = rows.reduce(
    (sum, row, i) => sum + (i === rows.length - 1 ? lastHeight : row.height),
    0
  );
  return stacked + RIVER_GAP * Math.max(0, rows.length - 1);
}

/** `min(190px, 30%)` as a number. The CSS lives in PHOTO_GRID_TARGET and the
 *  two must agree; the test asserts they do. */
export function targetFor(width: number): number {
  return Math.min(PHOTO_GRID_TARGET_PX, width * 0.3);
}

/**
 * Every band in the query, in river order, with its height and its offset.
 *
 * Consecutive runs rather than a group-by, matching `bandsOf` in the river:
 * the shape index arrives already ordered, so a run of one band is contiguous
 * by construction.
 */
export function bandBoxes(shapes: PhotoShapeIndex, width: number): BandBox[] {
  const out: BandBox[] = [];
  let top = 0;
  for (let i = 0; i < shapes.length; ) {
    const key = shapes[i][1];
    let j = i;
    const ratios: number[] = [];
    while (j < shapes.length && shapes[j][1] === key) {
      ratios.push(shapes[j][0]);
      j += 1;
    }
    const gridHeight = gridHeightOf(ratios, width);
    const height =
      (out.length > 0 ? BAND_SEPARATION : 0) +
      BAND_HEADING +
      BAND_HEADING_GAP +
      gridHeight +
      BAND_GRID_TAIL;
    out.push({ key, from: i, to: j, count: j - i, gridHeight, height, top });
    top += height;
    i = j;
  }
  return out;
}

/** The river's whole height: what the document should be from the first frame. */
export function riverHeightOf(boxes: BandBox[]): number {
  const last = boxes[boxes.length - 1];
  return last ? last.top + last.height : 0;
}

/** Which band a document offset falls in -- "what is the reader looking at",
 *  which is the question the loader asks instead of walking pages. Binary
 *  search, because it runs on every scroll frame. */
export function bandAt(boxes: BandBox[], offset: number): BandBox | null {
  let lo = 0;
  let hi = boxes.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = boxes[mid];
    if (offset < b.top) hi = mid - 1;
    else if (offset >= b.top + b.height) lo = mid + 1;
    else return b;
  }
  return boxes[Math.min(lo, boxes.length - 1)] ?? null;
}
