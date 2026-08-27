/* ------------------------------------------------------------------ *
 *  Six answers to one question: a photograph of unknown shape has to go
 *  into a column of known width. What happens to it?
 *
 *  The maths lives here, apart from the room that draws it, for two
 *  reasons. It is the thing being chosen between, so it should be
 *  readable on its own. And whichever of these the owner picks becomes
 *  the rule for post-card, the catch-up answer card, the letter page and
 *  the Collection grid, so it wants to be liftable rather than
 *  retyped from a JSX file.
 *
 *  Every function here is pure. Nothing reaches for the DOM.
 * ------------------------------------------------------------------ */

export type PolicyKey = "narrow" | "free" | "today" | "bounds" | "snap" | "fill" | "focal";

export interface Specimen {
  key: string;
  src: string;
  w: number;
  h: number;
  label: string;
  /** What the picture is of, said plainly. */
  note: string;
  /**
   * Where sharp thinks the subject is, x and y from 0 to 1.
   *
   * Not my opinion: measured by resizing each file to a square with
   * `sharp.strategy.attention` and reading back the crop window it chose.
   * The numbers are baked in because the room has no server. In the real
   * thing this is computed once at upload and stored on the row.
   */
  focal: { x: number; y: number };
}

/** The three column widths a photograph actually gets in this app. */
export const WIDTHS = {
  phone: { px: 358, label: "Phone", note: "390px screen, inside the card" },
  laptop: { px: 728, label: "Laptop", note: "1440px screen" },
  wide: { px: 1216, label: "Wide", note: "1928px and up, where the feed stops growing" },
} as const;
export type WidthKey = keyof typeof WIDTHS;

/**
 * Today's cap, from post-card.tsx: `max-h-96` on a single-image post.
 * It is a FIXED number of pixels, which is half of why the wide column
 * looks so bad. At 1216px wide a 384px cap is a 3.2:1 letterbox, applied
 * to every photograph regardless of its real shape.
 */
export const TODAY_MAX_H = 384;

/** Policy "bounds": the shapes a card is allowed to be. 4:5 to 1.91:1. */
export const MIN_RATIO = 0.8;
export const MAX_RATIO = 1.91;

/**
 * The floor is the real lever, and this is the thing the first pass of this
 * room got wrong by leaving it fixed.
 *
 * Instagram's 4:5 floor is tuned to Instagram's column, which is about 470px
 * on a desktop, so a 4:5 card there is 587px tall. OUR column is 728px, and
 * the same 4:5 floor comes out at 910px, which is more than a laptop
 * screenful. Copying the ratio without copying the column copies the wrong
 * thing. So the floor is a control, not a constant.
 */
export const FLOORS = [
  { v: 0.8, label: "4:5", note: "Instagram's floor. Generous to portraits." },
  { v: 1, label: "1:1", note: "No card is ever taller than it is wide." },
  { v: 1.25, label: "5:4", note: "Everything leans landscape. Shortest feed." },
] as const;

/** Policy "snap": the only four shapes a card may take. */
export const SNAP_RATIOS = [16 / 9, 3 / 2, 1, 4 / 5];

/**
 * Policy "narrow": the tallest a photograph may be drawn, in pixels.
 *
 * An absolute number, NOT a share of the column, and the first pass got this
 * wrong. Tying the ceiling to the column width meant a phone, whose column is
 * 358px, drew a 9:16 photograph 201px wide -- smaller than anything shipping
 * today, on the device where portraits matter most. A ceiling is about the
 * SCREEN's height, which has nothing to do with how wide the card is.
 */
export const TALL_CEILINGS = [
  { v: 560, label: "560px", note: "Tight. Roughly two thirds of a laptop screen." },
  { v: 700, label: "700px", note: "About three quarters of a laptop screen." },
  { v: 840, label: "840px", note: "Roomy. A tall photo owns the screen." },
] as const;

/** Policy "fill": the one box everything is poured into. */
export const FILL_RATIO = 3 / 2;

export interface Frame {
  /** How tall the card's photo area comes out, in px. */
  height: number;
  /**
   * How WIDE the photograph is drawn. The same as the column for every rule
   * but "narrow", which is the whole point of that rule: it buys a bounded
   * height by spending width rather than by cutting the picture.
   */
  width: number;
  /** cover crops to fill; contain fits the whole frame inside. */
  fit: "cover" | "contain";
  /** CSS object-position. */
  position: string;
  /** How much of the original photograph survives, 0 to 1. */
  kept: number;
  /** Whether a blurred copy of the same photo fills the leftover space. */
  blurBehind: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Overlap between a photo of ratio `r` and a box of ratio `box`, 0 to 1. */
function keptAt(r: number, box: number): number {
  return Math.min(r, box) / Math.max(r, box);
}

/** The nearest allowed shape, measured in ratio rather than in difference,
 *  so 2:1 and 1:2 are treated as equally far from square. */
function nearestSnap(r: number, floor: number): number {
  const allowed = SNAP_RATIOS.filter((a) => a >= floor);
  const pool = allowed.length ? allowed : [Math.max(...SNAP_RATIOS)];
  return pool.reduce((best, a) =>
    Math.abs(Math.log(r / a)) < Math.abs(Math.log(r / best)) ? a : best
  );
}

export function frameFor(
  policy: PolicyKey,
  photo: Specimen,
  width: number,
  floor: number = MIN_RATIO,
  ceiling: number = 700
): Frame {
  const r = photo.w / photo.h;
  const trueHeight = width / r;

  switch (policy) {
    /* ---------------------------------------------------------------- *
     *  Tall narrows, wide runs free.
     *
     *  The owner's own split, and the one rule here that never cuts a
     *  photograph anywhere. Square or wider: full column width, true
     *  shape, so a 21:9 is a thin strip and that is correct (owner: "for
     *  very wide images like 21:9, our solution should definitely not add
     *  bars above and below it. we should just let it be a thin photo").
     *
     *  Taller than wide: the SAME ceiling the bounds rule uses, obeyed a
     *  different way. Rather than cutting the picture to fill a box of
     *  that shape, the picture keeps its shape and stops growing, so it
     *  narrows and sits centred on the card. The space beside it is the
     *  card's own paper. Not a bar, not a blur.
     *
     *  Width, height and how much you cut are three quantities locked
     *  together and you may pick two. This rule picks height and no cut,
     *  and pays in width. Everything else here picks width and pays in
     *  cut.
     * ---------------------------------------------------------------- */
    case "narrow": {
      /* Square or wider always fills the column, whatever height that makes;
         a thin strip is the point. Only a tall photo meets the ceiling, and
         it obeys it by narrowing rather than by being cut. */
      const trueH = width / r;
      const height = r >= 1 ? trueH : Math.min(trueH, ceiling);
      return {
        height,
        width: height * r >= width ? width : height * r,
        fit: "cover", // the box is the photo's exact shape, so nothing is cut either way
        position: "50% 50%",
        kept: 1,
        blurBehind: false,
      };
    }

    /* Every photograph at its real shape, however tall that turns out. */
    case "free":
      return { height: trueHeight, width, fit: "cover", position: "50% 50%", kept: 1, blurBehind: false };

    /* What ships today: fill the width, guillotine at 384px, take the
       middle. This is the one that eats faces. */
    case "today": {
      const height = Math.min(trueHeight, TODAY_MAX_H);
      return {
        height,
        width,
        fit: "cover",
        position: "50% 50%",
        kept: height / trueHeight,
        blurBehind: false,
      };
    }

    /* Anything between 4:5 and 1.91:1 passes through untouched. Only the
       extremes are trimmed, and a trimmed portrait keeps its top, because
       that is where heads are. */
    case "bounds": {
      const box = clamp(r, floor, MAX_RATIO);
      return {
        height: width / box,
        width,
        fit: "cover",
        position: r < box ? "50% 25%" : "50% 50%",
        kept: keptAt(r, box),
        blurBehind: false,
      };
    }

    /* Four permitted card shapes. Every photograph snaps to its nearest,
       so the trim is always small and the feed only ever has four
       rhythms in it. */
    case "snap": {
      const box = nearestSnap(r, floor);
      return {
        height: width / box,
        width,
        fit: "cover",
        position: r < box ? "50% 30%" : "50% 50%",
        kept: keptAt(r, box),
        blurBehind: false,
      };
    }

    /* One box, every photo whole inside it, the gap filled with a blurred
       and dimmed copy of the same photo rather than a bar. */
    case "fill":
      return {
        height: width / FILL_RATIO,
        width,
        fit: "contain",
        position: "50% 50%",
        kept: 1,
        blurBehind: true,
      };

    /* The same box as "bounds", but the visible window is pulled towards
       whatever sharp decided the subject was. */
    case "focal": {
      const box = clamp(r, floor, MAX_RATIO);
      return {
        height: width / box,
        width,
        fit: "cover",
        position: `${Math.round(photo.focal.x * 100)}% ${Math.round(photo.focal.y * 100)}%`,
        kept: keptAt(r, box),
        blurBehind: false,
      };
    }
  }
}

export const POLICIES: { key: PolicyKey; name: string; line: string }[] = [
  { key: "narrow", name: "Tall narrows, wide runs free", line: "Nothing is ever cut. Wide photos fill the column; tall ones stop growing and narrow instead." },
  { key: "free", name: "Free height", line: "True shape, no cap. Nothing is ever cropped." },
  { key: "today", name: "What ships today", line: "Fill the width, cut at 384px, keep the middle." },
  { key: "bounds", name: "Aspect bounds", line: "4:5 to 1.91:1 pass untouched. Extremes trim, portraits keep their top." },
  { key: "snap", name: "Snap to four shapes", line: "16:9, 3:2, square, 4:5. Nearest wins, so the trim stays small." },
  { key: "fill", name: "Blurred fill", line: "One box. The whole photo inside it, blurred copy behind." },
  { key: "focal", name: "Aspect bounds, aimed", line: "Same as bounds, but the window moves to where sharp found the subject." },
];

/** The whole feed's height under one policy: what scrolling actually costs. */
export function stackHeight(
  policy: PolicyKey,
  photos: Specimen[],
  width: number,
  floor?: number,
  ceiling?: number
): number {
  return photos.reduce((sum, p) => sum + frameFor(policy, p, width, floor, ceiling).height, 0);
}
