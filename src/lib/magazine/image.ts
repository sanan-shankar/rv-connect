/* ------------------------------------------------------------------ *
 *  What a photograph may be asked to do on paper.
 *
 *  His rule, brief para 21: "if we have one image big, we have to make
 *  sure that it's high resolution." Blurb's rule (prior-art section 4):
 *  judge resolution AT THE PLACED SIZE, and shrink the frame rather than
 *  upsample. Both are one function here: the pixels a photograph has set
 *  the largest frame it may occupy, and a frame it cannot fill sharply is
 *  not a candidate at all.
 *
 *  Every stored Catch-up photograph is at most 1920px on its long edge
 *  and no original is kept (recon.md section 6; the upload path deletes
 *  the staged file). Many are smaller than that. So the gate is not a
 *  formality: on the live Edition 21 of 36 photographs are under 1920,
 *  and one is 438x202.
 * ------------------------------------------------------------------ */

import { spanMm, type MagPhoto, type Paper, type PhotoPlacement } from "./types.ts";

/** Below this at the placed size a photograph is refused the slot. It is
 *  the point where a q80 WebP shown on a 2x screen at fit-to-page, and a
 *  home print, both start to look soft. */
export const DPI_FLOOR = 150;
/** At or above this a photograph is as sharp as print wants; between the
 *  two it is allowed and scored down. */
export const DPI_GOOD = 250;

/** The most of either axis a `cover` crop may throw away. The reader's
 *  photo-layout uses the same budget for its aimed crops. */
export const CROP_BUDGET = 0.2;

export type Shape = "portrait" | "tall" | "square" | "landscape" | "wide" | "strip" | "unknown";

/** Width over height, or null when unmeasured. */
export function ratioOf(p: MagPhoto): number | null {
  if (!p.width || !p.height) return null;
  return p.width / p.height;
}

export function shapeOf(p: MagPhoto): Shape {
  const r = ratioOf(p);
  if (r === null) return "unknown";
  if (r < 0.6) return "tall";
  if (r < 0.9) return "portrait";
  if (r <= 1.15) return "square";
  if (r <= 1.9) return "landscape";
  if (r <= 3) return "wide";
  return "strip";
}

/** Long edge in pixels; an unmeasured photograph counts as small, which
 *  keeps it out of every large slot rather than in one by accident. */
export function longEdge(p: MagPhoto): number {
  if (!p.width || !p.height) return 640;
  return Math.max(p.width, p.height);
}

/** Dots per inch when the photograph is drawn `widthMm` wide at its own
 *  proportions (contain), or into a `widthMm` x `heightMm` frame (cover,
 *  where the scale is set by whichever axis has to stretch further). */
export function dpiAt(p: MagPhoto, widthMm: number, heightMm?: number): number {
  const w = p.width ?? 640;
  const h = p.height ?? 640;
  const mmPerIn = 25.4;
  if (heightMm === undefined) return (w / widthMm) * mmPerIn;
  const scale = Math.max(widthMm / w, heightMm / h);
  return mmPerIn / scale;
}

/** Whether a cover crop into `widthMm` x `heightMm` stays inside the crop
 *  budget on both axes. */
export function cropWithin(p: MagPhoto, widthMm: number, heightMm: number): boolean {
  const r = ratioOf(p);
  if (r === null) return false;
  const frame = widthMm / heightMm;
  const lost = r > frame ? 1 - frame / r : 1 - r / frame;
  return lost <= CROP_BUDGET;
}

/** A photograph in a frame `span` columns wide, at its own proportions,
 *  with the rows it needs; or null when it would print under the floor. */
export function place(paper: Paper, p: MagPhoto, span: number, maxRows?: number): (PhotoPlacement & { rows: number; heightMm: number }) | null {
  const widthMm = spanMm(paper, span);
  const r = ratioOf(p) ?? 1;
  let heightMm = widthMm / r;
  let fit: "contain" | "cover" = "contain";
  let dpi = dpiAt(p, widthMm);
  if (maxRows !== undefined) {
    const cap = maxRows * paper.baselineMm;
    if (heightMm > cap) {
      /* Too tall for the room: crop toward the focal point if the budget
         allows, else refuse rather than cut somebody's head off. */
      if (!cropWithin(p, widthMm, cap)) return null;
      heightMm = cap;
      fit = "cover";
      dpi = dpiAt(p, widthMm, cap);
    }
  }
  if (dpi < DPI_FLOOR) return null;
  const rows = Math.ceil(heightMm / paper.baselineMm);
  return { photo: p, fit, dpi, rows, heightMm: rows * paper.baselineMm };
}

/** The widest span, in columns, at which the photograph still clears the
 *  floor at its own proportions. 0 when it clears none. */
export function widestSpan(paper: Paper, p: MagPhoto): number {
  for (let span = paper.columns; span >= 2; span -= 1) {
    if (dpiAt(p, spanMm(paper, span)) >= DPI_FLOOR) return span;
  }
  return 0;
}

/** How good the placement is, 0..1, from the dpi alone. */
export function sharpness(dpi: number): number {
  if (dpi >= DPI_GOOD) return 1;
  if (dpi <= DPI_FLOOR) return 0;
  return (dpi - DPI_FLOOR) / (DPI_GOOD - DPI_FLOOR);
}

/** A row of photographs at one height, each at its own width (Flickr's
 *  justified row): scale every photo to `targetHeightMm`, add widths until
 *  the row is full, then scale the row to fit exactly. Returns the rows in
 *  order, the last one short unless it can be scaled without going over
 *  1.35x the target. */
export function justify(
  photos: MagPhoto[],
  widthMm: number,
  targetHeightMm: number,
  gapMm: number,
): Array<{ heightMm: number; items: Array<{ photo: MagPhoto; widthMm: number }> }> {
  const rows: Array<{ heightMm: number; items: Array<{ photo: MagPhoto; widthMm: number }> }> = [];
  let row: MagPhoto[] = [];
  let sum = 0;
  const flush = (last: boolean) => {
    if (row.length === 0) return;
    const gaps = gapMm * (row.length - 1);
    let height = (widthMm - gaps) / sum;
    if (last && height > targetHeightMm * 1.35) height = targetHeightMm;
    rows.push({
      heightMm: height,
      items: row.map((p) => ({ photo: p, widthMm: (ratioOf(p) ?? 1) * height })),
    });
    row = [];
    sum = 0;
  };
  for (const p of photos) {
    const r = ratioOf(p) ?? 1;
    row.push(p);
    sum += r;
    if (sum * targetHeightMm + gapMm * (row.length - 1) >= widthMm) flush(false);
  }
  flush(true);
  return rows;
}
