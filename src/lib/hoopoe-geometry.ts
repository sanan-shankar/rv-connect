/* ------------------------------------------------------------------ *
 *  The hoopoe's parts, as geometry rather than as components.
 *
 *  Not a redrawing. Every curve here is the one in
 *  src/components/mascot/hoopoe.tsx, with its hard-coded numbers turned
 *  into ratios so a mark can fan the crest wider or lengthen it without
 *  changing its shape. The colours are that file's palette, copied.
 *
 *  Why this is data and not JSX: the shipped app icon
 *  (public/images/brand/app-icon.svg) has to be built by a plain Node
 *  script, and the lab rooms have to draw the identical thing in React.
 *  If the two had their own copies of the assembly -- which paths, in
 *  what order, in what colour -- the icon would drift from the character
 *  the first time anyone touched one of them. So the assembly lives here
 *  once, as Prim[], and each side is a fifteen line renderer.
 *
 *  (The first attempt at this was a route handler calling
 *  renderToStaticMarkup, which Next refuses to compile inside app/. It
 *  was the wrong shape anyway: this version needs no dev server, no
 *  sign-in and no browser.)
 *
 *  The rig's own numbers, for reference:
 *    crest pivot (60, 37), nine feathers at -52..52 degrees
 *    feather length 31, half width 5.4, control half width 7.4
 *    dark cap starts 6 below the tip, pale band 3 below that
 *    head ellipse (60, 56) r 30 x 27
 *    eyes at x 60 +/- 9, y 61, r 6.9 x 8.1, two catchlights
 *    bill from y 62.5, hinge at 74, tip at 80.5
 * ------------------------------------------------------------------ */

/** hoopoe.tsx's palette, verbatim. */
export const H = {
  body: "#D5854A",
  bodyHi: "#EEB683",
  bodySh: "#BC6F39",
  head: "#DA9056",
  crest: "#DD9259",
  crestHi: "#E7A772",
  crestTip: "#2B2722",
  crestBand: "#FBF4E6",
  bill: "#4A4038",
  billHi: "#6E6055",
  eye: "#2B2722",
  catchlight: "#FFFFFF",
};

/** the greens and grounds a mark has to sit on */
export const G = {
  canopy: "#235C49",
  pine: "#173F35",
  ink: "#141B18",
  night: "#0F1714",
  cream: "#FBF4E6",
  paper: "#F5F2EA",
};

export type Prim =
  | { k: "path"; d: string; fill: string; opacity?: number; stroke?: string; strokeWidth?: number }
  | { k: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill: string; opacity?: number }
  | { k: "circle"; cx: number; cy: number; r: number; fill: string; opacity?: number }
  | { k: "g"; transform: string; children: Prim[] };

export type FeatherOptions = {
  angle: number;
  px?: number;
  py?: number;
  len?: number;
  w?: number;
  /** index, only used to alternate the two crest browns as the rig does */
  i?: number;
  band?: boolean;
  tip?: boolean;
  /** How far the quill's own point shows ABOVE the dark cap, as a fraction of
      the feather's length: the little cinnamon triangle at the end of every
      ray. The rig draws 0.073, which is lovely at 512 and gone by 32. Raising
      it lengthens the orange without touching the fan's outline, because the
      outline is the quill's point either way -- only the dark cap moves down.
      It does eat the cap, so past about 0.12 the cap stops being a cap. */
  tipOut?: number;
  /** Rounds the quill's point, as a fraction of the way back down the feather.
      0 is the rig's own cusp; the mark wants a little, because a fan of
      needles reads as a cog rather than as a soft character. */
  blunt?: number;
  /** one colour for everything: the rail and any monochrome lockup */
  flat?: string;
  /** a hairline of the GROUND colour along each feather, which is the only
      thing that keeps a one-colour fan from collapsing into a blob */
  sep?: string;
};

/**
 * One crest feather, standing upright from (px, py) and rotated into the fan
 * by its caller. `len` and `w` are multipliers on the rig's own 31 and 5.4; at
 * 1 and 1 this is the exact feather the mascot has.
 */
export function featherPrims({
  angle,
  px = 60,
  py = 37,
  len = 1,
  w = 1,
  i = 0,
  band = true,
  tip = true,
  tipOut = 0.073,
  blunt = 0,
  flat,
  sep,
}: FeatherOptions): Prim {
  const L = 31 * len;
  const bw = 5.4 * w; // half width at the base
  const cw = 7.4 * w; // control half width, what gives the feather its belly
  const t = py - L;
  const mid = py - 0.548 * L;
  const capBot = t + 0.194 * L;
  const bandBot = capBot + 0.097 * L;
  const quill = flat ?? (i % 2 ? H.crest : H.crestHi);

  /* Rounding the quill's point.
   *
   * de Casteljau splits the half-feather's quadratic at (1 - blunt/2), then a
   * CUBIC caps the two halves with its control points on the tangents at the
   * join, which is what makes the result read as a rounded tip rather than as
   * a facet. The first attempt capped with a quadratic and placed its control
   * ABOVE the apex to hold the tip height; a quadratic control above the apex
   * is what makes a point in the first place, so it re-sharpened what it was
   * meant to soften and four settings rendered identical.
   *
   * Rounding a point necessarily shortens it, so the quill is drawn from a
   * length `lx` chosen to give that back exactly: at MU = 0.45 the cubic's
   * apex lands 0.75 * MU of the way back up, and lx solves for the tip landing
   * on t. The dark cap and the pale band still key off the original t and L,
   * so nothing else in the feather moves. */
  const MU = 0.45;
  const lx = L / (1 - 0.2995 * blunt);
  const tx = py - lx;
  const midx = py - 0.548 * lx;
  const k = 1 - blunt / 2;
  const jx = (1 - k) * (1 - k) * (px - bw) + 2 * k * (1 - k) * (px - cw) + k * k * px;
  const jy = (1 - k) * (1 - k) * py + 2 * k * (1 - k) * midx + k * k * tx;
  const qx = px - bw + k * (bw - cw);
  const qy = py + k * (midx - py);
  const cax = jx + MU * (px - jx);
  const cay = jy + MU * (tx - jy);

  const children: Prim[] = [
    {
      k: "path",
      d: blunt
        ? `M${px - bw} ${py} Q${qx} ${qy} ${jx} ${jy} C${cax} ${cay} ${2 * px - cax} ${cay} ${2 * px - jx} ${jy} Q${2 * px - qx} ${qy} ${px + bw} ${py} Z`
        : `M${px - bw} ${py} Q${px - cw} ${mid} ${px} ${t} Q${px + cw} ${mid} ${px + bw} ${py} Z`,
      fill: quill,
      ...(sep ? { stroke: sep, strokeWidth: 1.1 } : {}),
    },
  ];
  if (band && !flat) {
    children.push({
      k: "path",
      d: `M${px - 3 * w} ${capBot} Q${px} ${capBot - 0.6} ${px + 3 * w} ${capBot} L${px + 2.6 * w} ${bandBot} Q${px} ${bandBot - 0.6} ${px - 2.6 * w} ${bandBot} Z`,
      fill: H.crestBand,
    });
  }
  if (tip && !flat) {
    children.push({
      k: "path",
      d: `M${px - 3.4 * w} ${capBot} Q${px} ${t + (2 * tipOut - 0.194) * L} ${px + 3.4 * w} ${capBot} Q${px} ${capBot - 1.4 * w} ${px - 3.4 * w} ${capBot} Z`,
      fill: H.crestTip,
    });
  }
  return { k: "g", transform: `rotate(${angle} ${px} ${py})`, children };
}

export type CrestOptions = Omit<FeatherOptions, "angle" | "i"> & {
  n?: number;
  spread?: number;
  /** shorten the outer feathers, which rounds the top of the fan */
  taper?: number;
  /** a disc at the pivot, filling the small notch where the feathers converge.
      Off by default: it also flattens the inner ends of the fan, and the fan
      reads better with the notch than without it. Only the marks with no head
      under them should ever want it. */
  base?: boolean;
};

/**
 * The crest. The rig fans nine feathers across 104 degrees because it has a
 * head underneath and a body under that; a mark has neither, so `spread`, `n`
 * and `len` are the three dials worth turning.
 */
export function crestPrims({
  n = 9,
  spread = 52,
  px = 60,
  py = 37,
  len = 1,
  w = 1,
  taper = 0,
  base = false,
  flat,
  ...rest
}: CrestOptions = {}): Prim[] {
  const out: Prim[] = [];
  if (base) out.push({ k: "circle", cx: px, cy: py, r: 6.2 * w, fill: flat ?? H.crest });
  /* Index order, first to last, exactly as the rig does. This is not a detail:
     each feather overlaps the one before it, so painting them in order is what
     makes the two crest browns read as a light sweeping across the fan.
     Bringing the middle feather to the front (tried, 2026-08-24) breaks the
     sweep in half and the fan goes flat. */
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    out.push(
      featherPrims({
        angle: u * spread,
        px,
        py,
        len: len * (1 - taper * Math.abs(u)),
        w,
        i,
        flat,
        ...rest,
      }),
    );
  }
  return out;
}

/** The rig's round eye, catchlights and all. */
export function eyePrims({
  cx,
  cy,
  s = 1,
  flat,
}: {
  cx: number;
  cy: number;
  s?: number;
  flat?: string;
}): Prim[] {
  const out: Prim[] = [
    { k: "ellipse", cx, cy, rx: 6.9 * s, ry: 8.1 * s, fill: flat ?? H.eye },
  ];
  if (!flat) {
    out.push(
      { k: "circle", cx: cx - 2.2 * s, cy: cy - 2.9 * s, r: 2.5 * s, fill: H.catchlight },
      { k: "circle", cx: cx + 1.8 * s, cy: cy + 1.8 * s, r: 1.1 * s, fill: H.catchlight, opacity: 0.85 },
    );
  }
  return out;
}

/** The rig's slender decurved bill, closed. */
export function billPrims({
  cx = 60,
  top = 62.5,
  len = 1,
  flat,
}: { cx?: number; top?: number; len?: number; flat?: string } = {}): Prim[] {
  const hinge = top + 11.5 * len;
  const tip = top + 18 * len;
  const midC = top + 5.5 * len;
  const lowC = hinge + 4 * len;
  return [
    {
      k: "path",
      d: `M${cx - 1.8} ${top} Q${cx - 2.5} ${midC} ${cx - 1.1} ${hinge} L${cx + 1.1} ${hinge} Q${cx + 2.5} ${midC} ${cx + 1.8} ${top} Q${cx} ${top - 1.3} ${cx - 1.8} ${top} Z`,
      fill: flat ?? H.bill,
    },
    {
      k: "path",
      d: `M${cx - 1.1} ${hinge} Q${cx - 0.7} ${lowC} ${cx} ${tip} Q${cx + 0.7} ${lowC} ${cx + 1.1} ${hinge} Z`,
      fill: flat ?? H.bill,
    },
  ];
}

/** Head, eyes and bill at the rig's own proportions unless told otherwise. */
export function facePrims({
  headS = 1,
  eyeS = 1,
  eyeDX = 9,
  eyeY = 61,
  billL = 1,
  flat,
}: {
  headS?: number;
  eyeS?: number;
  eyeDX?: number;
  eyeY?: number;
  billL?: number;
  flat?: string;
} = {}): Prim[] {
  const sub = flat ? G.canopy : undefined;
  return [
    { k: "ellipse", cx: 60, cy: 56, rx: 30 * headS, ry: 27 * headS, fill: flat ?? H.head },
    ...billPrims({ cx: 60, top: 62.5, len: billL, flat: sub }),
    ...eyePrims({ cx: 60 - eyeDX, cy: eyeY, s: eyeS, flat: sub }),
    ...eyePrims({ cx: 60 + eyeDX, cy: eyeY, s: eyeS, flat: sub }),
  ];
}

/** The pudgy body, for marks that want a shoulder under the head. */
export function bodyPrims({ flat }: { flat?: string } = {}): Prim[] {
  const out: Prim[] = [{ k: "ellipse", cx: 60, cy: 101, rx: 22, ry: 21, fill: flat ?? H.body }];
  if (!flat) {
    out.push(
      { k: "ellipse", cx: 60, cy: 106, rx: 14, ry: 13, fill: H.bodyHi, opacity: 0.5 },
      { k: "ellipse", cx: 60, cy: 84, rx: 19, ry: 6, fill: H.bodySh, opacity: 0.22 },
    );
  }
  return out;
}

/* ---- the shipped mark ---------------------------------------------- */

/** The x every part of the bird is symmetric about: the crest's pivot, the
    head's centre, the bill, and the two eyes at 60 +/- 9. Only the catchlights
    break it, and they are interior white dots on a dark eye, so they move no
    edge. Any window onto this mark must be centred here or the bird sits off
    to one side -- which it did, by a whole unit, until the owner spotted it. */
export const PEEK_AXIS = 60;

/** The window the peeking mark was chosen in, in the rig's 120 space.
    x is PEEK_AXIS - size / 2, never a hand-typed number. */
export const PEEK_VIEW = { x: PEEK_AXIS - 78 / 2, y: -19, size: 78 };

/** The same window as a viewBox string, so no room retypes it and drifts. */
export const PEEK_VIEW_BOX = `${PEEK_VIEW.x} ${PEEK_VIEW.y} ${PEEK_VIEW.size} ${PEEK_VIEW.size}`;

/** The two crest settings picked in /lab/hoopoe-marks: a longer cinnamon point
    so it survives 26px, and its tip rounded so the fan reads soft. */
export const PEEK_CREST = { tipOut: 0.105, blunt: 0.11 };

/** The app icon's artwork: the hoopoe peeking over the bottom edge. */
export function peekPrims(): Prim[] {
  return [
    ...crestPrims({ n: 11, spread: 68, len: 1.18, taper: 0.08, ...PEEK_CREST }),
    ...facePrims({ eyeS: 1.12, billL: 0.9 }),
  ];
}

/* ---- rendering ------------------------------------------------------ */

const num = (x: number) => String(+x.toFixed(4));

/** Prim[] to SVG markup, for anything that is not React. */
export function primsToSvg(prims: Prim[]): string {
  return prims
    .map((p) => {
      if (p.k === "g") return `<g transform="${p.transform}">${primsToSvg(p.children)}</g>`;
      const o = p.opacity === undefined ? "" : ` opacity="${p.opacity}"`;
      if (p.k === "path") {
        const s = p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.strokeWidth}"` : "";
        return `<path d="${p.d}" fill="${p.fill}"${s}${o}/>`;
      }
      if (p.k === "ellipse") {
        return `<ellipse cx="${num(p.cx)}" cy="${num(p.cy)}" rx="${num(p.rx)}" ry="${num(p.ry)}" fill="${p.fill}"${o}/>`;
      }
      return `<circle cx="${num(p.cx)}" cy="${num(p.cy)}" r="${num(p.r)}" fill="${p.fill}"${o}/>`;
    })
    .join("");
}
