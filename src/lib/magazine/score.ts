/* ------------------------------------------------------------------ *
 *  What a good page is, as numbers.
 *
 *  Four terms, the four prior-art section 4 said were worth taking from
 *  Flipboard's Duplo, each turned into a number between 0 and 1 (or a
 *  penalty below 0):
 *
 *  fill       how much of the page is used. Text fill at 80% or better
 *             scores full; below, it falls away fast. The last page is
 *             held to less. This is the term that answers his para 31:
 *             "only about 15% of the real estate is used".
 *  image      how sharp and how prominent the page's photographs are at
 *             the size they print. A full-width photograph at print
 *             resolution scores 1; a small one less; a page with none is
 *             neutral. This is "if we have one image big, we have to make
 *             sure that it's high resolution" (para 21).
 *  variety    a penalty when a page has the same shape as the one before.
 *             Duplo used noise to get "an organic sense of variety"; a
 *             penalty on repetition does the same without randomness, so
 *             two renders of one Edition agree.
 *  coherence  a penalty for a story that spreads thin: a headline with
 *             little under it, a run of continuations.
 *
 *  And the search subtracts PAGE_COST per page, so fewer fuller pages
 *  beat more emptier ones. The weights are here so the room can print
 *  them beside each page and so a test can pin the ordering they give.
 * ------------------------------------------------------------------ */

import { DPI_GOOD, sharpness } from "./image.ts";
import { rowsPerPage, type Block, type Page, type PageScore, type Paper } from "./types.ts";

export const WEIGHTS = { fill: 1.0, image: 0.8, variety: 1.0, coherence: 1.0 };
export const FILL_TARGET = 0.82;
export const LAST_PAGE_FILL_TARGET = 0.45;
export const PAGE_COST = 1.15;
export const SAME_AS_LAST = -0.45;
export const SAME_AS_TWO_BACK = -0.15;
export const UNIFORM_PHOTOS = -0.15;
/** From this many photographs on a page, all one span is a penalty. Not
 *  the upload cap, which is a different three. */
export const UNIFORM_FROM = 3;
export const THIN_OPENER = -0.2;
export const CONTINUATION = -0.05;

/** A page's shape, for the variety rule: what the eye sees, which is the
 *  photograph rows and the text runs, not the headline between them (the
 *  judge's pages 19 and 20, twins that differed only by an opener). */
export function signatureOf(blocks: Block[]): string {
  return blocks
    .filter((b) => b.kind !== "opener" && b.kind !== "quote")
    .map((b) => {
      switch (b.kind) {
        case "columns":
          return `C${b.columns.length}`;
        case "photo-text":
          return `PT${b.photoSpan}`;
        case "photo-band":
          return `PB${b.photos.length}`;
        case "cover":
          return "Cv";
        case "contents":
          return "Tc";
        case "contributors":
          return "Bk";
        case "cards":
          return "K";
        case "gallery":
          return `G${b.items.length}`;
        default:
          return b.kind[0].toUpperCase();
      }
    })
    .join("|");
}

function photoPlacements(b: Block): Array<{ dpi: number; span: number }> {
  switch (b.kind) {
    case "opener":
      return b.lead ? [{ dpi: b.lead.dpi, span: 6 }] : [];
    case "photo-text":
      return [{ dpi: b.photo.dpi, span: b.photoSpan }];
    case "photo-band":
      return b.photos.map((p) => ({ dpi: p.dpi, span: 12 / b.photos.length }));
    case "wall":
      return b.rowsOfPhotos.flatMap((r) => r.shots.map((s) => ({ dpi: s.placement.dpi, span: 3 })));
    case "gallery":
      return b.items.map((it) => ({ dpi: it.placement.dpi, span: 12 / b.items.length }));
    case "cover":
      return b.lead ? [{ dpi: b.lead.dpi, span: 12 }] : [];
    default:
      return [];
  }
}

/** A page that is one sharp photograph across most of its width and a few
 *  lines is allowed to be quiet (G10): its fill target drops to this. */
export const QUIET_PAGE_FILL_TARGET = 0.55;

function isQuiet(page: Page): boolean {
  const photos = page.blocks.flatMap(photoPlacements);
  if (photos.length !== 1) return false;
  const p = photos[0];
  const textRows = page.blocks.filter((b) => b.kind === "columns" || b.kind === "essay").reduce((n, b) => n + b.rows, 0);
  return p.span >= 10 && p.dpi >= DPI_GOOD && textRows <= 6;
}

export function scorePage(paper: Paper, page: Page, previous: Page | null, twoBack: Page | null, isLast: boolean): PageScore {
  const perPage = rowsPerPage(paper);
  /* Air beside a photograph is paper, not content (G11). */
  const air = page.blocks.reduce((n, b) => n + (b.kind === "photo-text" ? b.air : 0), 0);
  const used = Math.min(1, Math.max(0, page.used - air) / perPage);
  const target = isLast ? LAST_PAGE_FILL_TARGET : isQuiet(page) ? QUIET_PAGE_FILL_TARGET : FILL_TARGET;
  const fill = Math.min(1, used / target) ** 2;

  const photos = page.blocks.flatMap(photoPlacements);
  let image = 0.75;
  if (photos.length > 0) {
    image = photos.reduce((n, p) => n + sharpness(p.dpi) * (0.6 + 0.4 * (p.span / 12)), 0) / photos.length;
  }

  const sig = signatureOf(page.blocks);
  let variety = 0;
  if (previous && previous.signature === sig && sig !== "" && !sig.startsWith("W")) variety += SAME_AS_LAST;
  else if (twoBack && twoBack.signature === sig && sig !== "" && !sig.startsWith("W")) variety += SAME_AS_TWO_BACK;
  if (photos.length >= UNIFORM_FROM && new Set(photos.map((p) => Math.round(p.span))).size === 1 && !sig.startsWith("W")) variety += UNIFORM_PHOTOS;

  let coherence = 0;
  const last = page.blocks[page.blocks.length - 1];
  if (last && last.kind === "opener") coherence += THIN_OPENER;
  const first = page.blocks[0];
  if (first && (first.kind === "columns" || (first.kind === "essay" && first.text.continued))) coherence += CONTINUATION;

  const total = WEIGHTS.fill * fill + WEIGHTS.image * image + WEIGHTS.variety * variety + WEIGHTS.coherence * coherence;
  return { fill, image, variety, coherence, total };
}

/** Score every page in place and return the search objective. */
export function scoreAll(paper: Paper, pages: Page[]): number {
  let sum = 0;
  pages.forEach((p, i) => {
    p.signature = signatureOf(p.blocks);
    p.score = scorePage(paper, p, pages[i - 1] ?? null, pages[i - 2] ?? null, i === pages.length - 1);
    sum += p.score.total;
  });
  return sum - PAGE_COST * pages.length;
}
