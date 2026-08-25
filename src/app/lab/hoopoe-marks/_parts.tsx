/* ------------------------------------------------------------------ *
 *  The mascot's parts, re-cut for logo work.
 *
 *  Not a redrawing. Every curve here is the one in
 *  src/components/mascot/hoopoe.tsx, with its hard-coded numbers turned
 *  into ratios so a mark can make the crest longer, wider or fanned
 *  further without changing its shape. The colours are that file's
 *  palette, copied exactly.
 *
 *  Why not just crop the live rig: a crop can only ever give you the
 *  proportions the character was drawn at, and a character is drawn to
 *  be looked at for a second while it blinks at you. A logo wants a
 *  wider fan, fewer overlaps and tighter margins. Same parts, different
 *  build.
 *
 *  The rig's own numbers, for reference:
 *    crest pivot (60, 37), nine feathers at -52..52 degrees
 *    feather length 31, half width 5.4, control half width 7.4
 *    dark cap starts 6 below the tip, pale band 3 below that
 *    head ellipse (60, 56) r 30 x 27
 *    eyes at x 60 +/- 9, y 61, r 6.9 x 8.1, two catchlights
 *    bill from y 62.5, hinge at 74, tip at 80.5
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";

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

/**
 * One crest feather, standing upright from (px, py) and rotated into the
 * fan by its caller. `len` and `w` are multipliers on the rig's own 31 and
 * 5.4; at 1 and 1 this draws the exact feather the mascot has.
 */
export function Feather({
  angle,
  px = 60,
  py = 37,
  len = 1,
  w = 1,
  i = 0,
  band = true,
  tip = true,
  flat,
  sep,
}: {
  angle: number;
  px?: number;
  py?: number;
  len?: number;
  w?: number;
  /** index, only used to alternate the two crest browns as the rig does */
  i?: number;
  band?: boolean;
  tip?: boolean;
  /** one colour for everything: the rail and any monochrome lockup */
  flat?: string;
  /** a hairline of the GROUND colour along each feather, which is the only
      thing that keeps a one-colour fan from collapsing into a blob */
  sep?: string;
}) {
  const L = 31 * len;
  const bw = 5.4 * w; // half width at the base
  const cw = 7.4 * w; // control half width, what gives the feather its belly
  const t = py - L;
  const mid = py - 0.548 * L;
  const capBot = t + 0.194 * L;
  const bandBot = capBot + 0.097 * L;
  const quill = flat ?? (i % 2 ? H.crest : H.crestHi);
  return (
    <g transform={`rotate(${angle} ${px} ${py})`}>
      <path
        d={`M${px - bw} ${py} Q${px - cw} ${mid} ${px} ${t} Q${px + cw} ${mid} ${px + bw} ${py} Z`}
        fill={quill}
        stroke={sep}
        strokeWidth={sep ? 1.1 : undefined}
      />
      {band && !flat ? (
        <path
          d={`M${px - 3 * w} ${capBot} Q${px} ${capBot - 0.6} ${px + 3 * w} ${capBot} L${px + 2.6 * w} ${bandBot} Q${px} ${bandBot - 0.6} ${px - 2.6 * w} ${bandBot} Z`}
          fill={H.crestBand}
        />
      ) : null}
      {tip && !flat ? (
        <path
          d={`M${px - 3.4 * w} ${capBot} Q${px} ${t - 0.048 * L} ${px + 3.4 * w} ${capBot} Q${px} ${capBot - 1.4 * w} ${px - 3.4 * w} ${capBot} Z`}
          fill={H.crestTip}
        />
      ) : null}
    </g>
  );
}

/**
 * The crest. The rig fans nine feathers across 104 degrees because it has a
 * head underneath and a body under that; a mark has neither, so `spread`,
 * `n` and `len` are the three dials worth turning.
 */
export function Crest({
  n = 9,
  spread = 52,
  px = 60,
  py = 37,
  len = 1,
  w = 1,
  taper = 0,
  band = true,
  tip = true,
  flat,
  sep,
  base = true,
}: {
  n?: number;
  spread?: number;
  px?: number;
  py?: number;
  len?: number;
  w?: number;
  /** shorten the outer feathers, which rounds the top of the fan */
  taper?: number;
  band?: boolean;
  tip?: boolean;
  flat?: string;
  sep?: string;
  /** a disc at the pivot. The feathers converge to a point there and leave a
      notch along the bottom of the fan without it; on the real bird the head
      is what fills that gap. */
  base?: boolean;
}) {
  const out: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    out.push(
      <Feather
        key={i}
        angle={u * spread}
        px={px}
        py={py}
        len={len * (1 - taper * Math.abs(u))}
        w={w}
        i={i}
        band={band}
        tip={tip}
        flat={flat}
        sep={sep}
      />,
    );
  }
  /* Middle feather last so the tallest one sits on top of its neighbours,
     the way the rig stacks them. */
  const mid = Math.floor(n / 2);
  return (
    <>
      {base ? (
        <circle cx={px} cy={py} r={6.2 * w} fill={flat ?? H.crest} />
      ) : null}
      {[...out.filter((_, i) => i !== mid), out[mid]]}
    </>
  );
}

/** The rig's round eye, catchlights and all. */
export function Eye({
  cx,
  cy,
  s = 1,
  flat,
}: {
  cx: number;
  cy: number;
  s?: number;
  flat?: string;
}) {
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={6.9 * s} ry={8.1 * s} fill={flat ?? H.eye} />
      {flat ? null : (
        <>
          <circle cx={cx - 2.2 * s} cy={cy - 2.9 * s} r={2.5 * s} fill={H.catchlight} />
          <circle cx={cx + 1.8 * s} cy={cy + 1.8 * s} r={1.1 * s} fill={H.catchlight} opacity={0.85} />
        </>
      )}
    </>
  );
}

/** The rig's slender decurved bill, closed. */
export function Bill({
  cx = 60,
  top = 62.5,
  len = 1,
  flat,
}: {
  cx?: number;
  top?: number;
  len?: number;
  flat?: string;
}) {
  const hinge = top + 11.5 * len;
  const tip = top + 18 * len;
  const midC = top + 5.5 * len;
  const lowC = hinge + 4 * len;
  return (
    <>
      <path
        d={`M${cx - 1.8} ${top} Q${cx - 2.5} ${midC} ${cx - 1.1} ${hinge} L${cx + 1.1} ${hinge} Q${cx + 2.5} ${midC} ${cx + 1.8} ${top} Q${cx} ${top - 1.3} ${cx - 1.8} ${top} Z`}
        fill={flat ?? H.bill}
      />
      <path
        d={`M${cx - 1.1} ${hinge} Q${cx - 0.7} ${lowC} ${cx} ${tip} Q${cx + 0.7} ${lowC} ${cx + 1.1} ${hinge} Z`}
        fill={flat ?? H.bill}
      />
    </>
  );
}

/**
 * Head, eyes and bill at the rig's own proportions unless told otherwise.
 * `eyeS`, `headS` and `billL` are the same three dials the live component
 * exposes, so a face tuned here can be reproduced on the real puppet.
 */
export function Face({
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
}) {
  return (
    <>
      <ellipse cx={60} cy={56} rx={30 * headS} ry={27 * headS} fill={flat ?? H.head} />
      <Bill cx={60} top={62.5} len={billL} flat={flat ? G.canopy : undefined} />
      <Eye cx={60 - eyeDX} cy={eyeY} s={eyeS} flat={flat ? G.canopy : undefined} />
      <Eye cx={60 + eyeDX} cy={eyeY} s={eyeS} flat={flat ? G.canopy : undefined} />
    </>
  );
}

/** The pudgy body, for marks that want a shoulder under the head. */
export function Body({ flat }: { flat?: string }) {
  return (
    <>
      <ellipse cx={60} cy={101} rx={22} ry={21} fill={flat ?? H.body} />
      {flat ? null : (
        <>
          <ellipse cx={60} cy={106} rx={14} ry={13} fill={H.bodyHi} opacity={0.5} />
          <ellipse cx={60} cy={84} rx={19} ry={6} fill={H.bodySh} opacity={0.22} />
        </>
      )}
    </>
  );
}
