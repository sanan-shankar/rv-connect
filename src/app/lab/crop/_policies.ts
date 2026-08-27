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

export type PolicyKey = "twothirds" | "narrow" | "free" | "today" | "bounds" | "snap" | "fill" | "focal";

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

/**
 * Policy "twothirds": the one shape every tall photograph is brought to.
 *
 * The owner's idea, and it is a good one. Cutting a tall photo to SQUARE
 * costs a 9:16 frame 44% of itself. Cutting it to 2:3 costs about 16%, and a
 * 4:5 loses a similar 17% off its sides in the other direction, so the damage
 * is small and even. What it buys is that every tall card in the feed is
 * exactly the same height, which is the rhythm that "narrow" gives up.
 */
export const TALL_SHAPES = [
  { v: 4 / 5, label: "4:5", note: "Widest. Least blur beside it, hardest on a very tall photo." },
  { v: 3 / 4, label: "3:4", note: "What a phone camera shoots by default, held upright." },
  { v: 2 / 3, label: "2:3", note: "What a real camera shoots. Gentlest on very tall photos." },
] as const;

/** Kept as the default so existing links behave; the room makes it a control. */
export const TALL_TARGET = 2 / 3;

/**
 * What goes in the space beside a photo that does not fill its card.
 *
 * "paper" is the card's own surface. "blur" is a blown-up, blurred, dimmed
 * copy of the photo itself. The owner called blur a cop out when it was the
 * whole rule, then asked for it here, and both positions are right: as a rule
 * of its own it squashes every photo into a landscape box, but as the filler
 * beside a photo that is already being shown properly it is just a nicer
 * background than a flat colour.
 */
export type FillKind = "none" | "paper" | "blur";

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
  /** What fills the card either side of a photo narrower than its column. */
  fill: FillKind;
}

export interface FrameOpts {
  /** The shallowest shape a card may be, for the bounds/snap/aimed rules. */
  floor?: number;
  /** The tallest a photo may be drawn, in px, for the two narrowing rules. */
  ceiling?: number;
  /** What fills the card beside a photo that does not span it. */
  gap?: FillKind;
  /** The one shape every tall photo is brought to, for the "twothirds" rule. */
  tall?: number;
  /** Nudge the visible window towards sharp's guess at the subject. */
  aim?: boolean;
}

/* ------------------------------------------------------------------ *
 *  Aiming a crop, with the brakes on.
 *
 *  The owner is right that a free improvement is worth taking. The
 *  brakes are here because of what X published in 2021: they cropped
 *  timeline previews with a saliency model from 2018, audited it, found
 *  it favoured white faces over Black faces and women over men, and
 *  withdrew it. See prior-art.md.
 *
 *  Three things make this a different proposition from theirs, and all
 *  three have to hold or it is not worth doing.
 *
 *  It only ever NUDGES. The crop here is small -- a 3:4 target takes 25%
 *  off a 9:16 frame and nothing at all off a phone's own 3:4 -- where X
 *  was cutting an arbitrary image down to a small 16:9 preview, so their
 *  model chose which of several people you saw and this one cannot.
 *
 *  It is CLAMPED, below, so a bad guess moves the window a little and
 *  never to an extreme. A tall photo's window can travel between 15% and
 *  50% down: heads live in the upper half, so the floor at 50% means the
 *  worst case is the plain centre crop we would have done anyway.
 *
 *  And the uploader must be able to OVERRIDE it. That is X's own
 *  replacement -- show the person the crop and let them move it -- and it
 *  is the part that makes the rest defensible. Not built here; the room
 *  is about the rule. It belongs in the spec.
 * ------------------------------------------------------------------ */
const AIM_Y = { lo: 0.15, hi: 0.5 };
const AIM_X = { lo: 0.25, hi: 0.75 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pct = (v: number) => `${Math.round(v * 100)}%`;

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

/* ------------------------------------------------------------------ *
 *  Whole pixels only.
 *
 *  A tall photo at 2:3 in a 728px column wants to be 466.67px wide. The
 *  browser rounds the box one way and the image inside it the other, so a
 *  sliver of whatever is BEHIND the image shows down its edge. On a warm
 *  page nobody notices. On a blurred bed it reads as a white outline
 *  around the photograph, which is exactly what the owner saw on
 *  2026-08-27. Rounding here removes the cause rather than papering over
 *  it; the frame also stops carrying a background of its own, below.
 * ------------------------------------------------------------------ */
export function frameFor(
  policy: PolicyKey,
  photo: Specimen,
  width: number,
  opts: FrameOpts = {}
): Frame {
  const f = rawFrame(policy, photo, width, opts);
  return { ...f, width: Math.round(f.width), height: Math.round(f.height) };
}

function rawFrame(
  policy: PolicyKey,
  photo: Specimen,
  width: number,
  { floor = MIN_RATIO, ceiling = 700, gap = "blur", tall = TALL_TARGET, aim = true }: FrameOpts = {}
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
      const shown = height * r >= width ? width : height * r;
      return {
        height,
        width: shown,
        fit: "cover", // the box is the photo's exact shape, so nothing is cut either way
        position: "50% 50%",
        kept: 1,
        fill: shown < width - 1 ? gap : "none",
      };
    }

    /* ---------------------------------------------------------------- *
     *  Tall to 2:3, wide runs free.
     *
     *  Wide behaves exactly as it does above: full column, true shape, a
     *  21:9 is a thin strip. Tall is brought to one shape, 2:3, so every
     *  tall card in the feed is the same height. The photo is drawn as
     *  large as the ceiling allows and whatever is left beside it is
     *  filled, blurred or plain.
     *
     *  On a narrow screen the ceiling is never the binding constraint --
     *  a 2:3 photo at 700px tall wants 467px of width and a phone column
     *  is 358 -- so the photo simply fills the width and nothing is
     *  filled beside it. That fallback is why the min() is here.
     * ---------------------------------------------------------------- */
    case "twothirds": {
      if (r >= 1) {
        return { height: trueHeight, width, fit: "cover", position: "50% 50%", kept: 1, fill: "none" };
      }
      const shown = Math.min(ceiling * tall, width);
      return {
        height: shown / tall,
        width: shown,
        fit: "cover",
        /* Taller than the target loses top and bottom, so the window
           travels vertically; shallower loses its sides, so it travels
           horizontally. Either way it starts from the sensible default
           (30% down for a tall photo, because heads are up there) and
           moves towards sharp's guess only as far as the clamp allows. */
        position:
          r < tall
            ? `50% ${pct(aim ? clamp(photo.focal.y, AIM_Y.lo, AIM_Y.hi) : 0.3)}`
            : `${pct(aim ? clamp(photo.focal.x, AIM_X.lo, AIM_X.hi) : 0.5)} 50%`,
        kept: keptAt(r, tall),
        fill: shown < width - 1 ? gap : "none",
      };
    }

    /* Every photograph at its real shape, however tall that turns out. */
    case "free":
      return { height: trueHeight, width, fit: "cover", position: "50% 50%", kept: 1, fill: "none" };

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
        fill: "none",
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
        fill: "none",
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
        fill: "none",
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
        fill: "blur",
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
        fill: "none",
      };
    }
  }
}

export const POLICIES: { key: PolicyKey; name: string; line: string }[] = [
  { key: "twothirds", name: "Tall to one shape, wide runs free", line: "Every tall photo becomes the same shape, so all tall cards match. The window is nudged towards the subject." },
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
  opts?: FrameOpts
): number {
  return photos.reduce((sum, p) => sum + frameFor(policy, p, width, opts).height, 0);
}
