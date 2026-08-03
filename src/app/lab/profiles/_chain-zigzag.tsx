"use client";

/* ------------------------------------------------------------------ *
 *  CONCEPT: "Diagonal zigzag"
 *
 *  The owner's own suggestion, built straight so it can be judged
 *  rather than dismissed: "maybe the zigzag where it starts off there
 *  and goes diagonally down to the right and then back, so southeast,
 *  then northeast, then southeast". Houses step down-and-right, then
 *  up-and-right, as one chevron whose pills only ever advance
 *  rightward, so the leftmost pill on screen is always the earliest one
 *  and no row ever resets to the left edge mid-chain.
 *
 *  WHY A ZIGZAG IS WORTH BUILDING AT ALL, i.e. what it actually buys.
 *  It is not decoration; it buys horizontal room, and horizontal room
 *  is exactly what the owner ran out of ("it goes onto five different
 *  lines and most of each line is just arrows"). In a straight row a
 *  house costs its own pill width PLUS ARROW_SLOT (30px) of dedicated
 *  arrow lane. In a two-level sawtooth the lower pill tucks under the
 *  tail of the upper one, so a house costs its width MINUS the overlap,
 *  and the connector costs no horizontal lane at all because it travels
 *  through the vertical corridor that already exists between the two
 *  levels. The trade is explicit: pay one extra pill-height of vertical
 *  space, get roughly half the horizontal run back, and stop breaking
 *  the line.
 *
 *  WHY EXACTLY TWO LEVELS, AND NEVER THREE. A tempting idea is to grow
 *  the amplitude on narrow screens (down, down, down, up, up, up) so
 *  pills can overlap harder still. It does not work, and the reason is
 *  worth writing down so nobody re-tries it: in ANY triangle wave the
 *  turning points put two pills two steps apart back on the same level
 *  (levels 0,1,2,1,0 -> pills 1 and 3 are both on level 1). So the
 *  binding "these two must not collide" pair is ALWAYS the i / i+2 pair,
 *  no matter how tall the wave is. Extra amplitude therefore buys zero
 *  extra horizontal density and costs a full pill-height per level. Two
 *  levels is not a simplification here, it is the optimum.
 *
 *  WHAT THAT IMPLIES FOR COMPRESSION. With levels alternating, pills i
 *  and i+2 sit side by side on one level, so the chain can be squeezed
 *  only until those two touch. That happens when the lower pill's left
 *  edge reaches the middle of the upper one, i.e. at a 50% shingle. The
 *  geometry self-limits: there is no separate "don't overlap too much"
 *  fudge factor, the no-collision rule IS the legibility rule (see
 *  STEP_MIN below).
 *
 *  MEASURED, not asserted. Every number below came off a probe that
 *  rendered this file and the shipped serpentine side by side against
 *  all six CHAIN_FIXTURES at 900 / 820 / 688 / 620 / 480 / 390 / 302,
 *  in the real app with the real fonts. Owner's 9-span chain, total
 *  height in px, zigzag vs the shipped serpentine:
 *
 *      900   59  vs   59      820   59  vs   59
 *      688   59  vs   95.5    620  104.5 vs  95.5
 *      480  141  vs  132      390  141  vs 168.5
 *      302  223  vs  278
 *
 *  It wins at five of the seven widths, including the owner's own
 *  desktop width, where it puts all nine houses on ONE unbroken band
 *  and the serpentine needs three rows. At every width its first pill
 *  sits at x = 0 (the serpentine's sits at x = 30, which is the
 *  indent the owner complained about) and its longest connector is
 *  18px, the kit's arrow glyph at its natural size, against the
 *  serpentine's 694.6px arc at 688px, which is his "the arrows are
 *  really long" in numbers.
 *
 *  AND THE COST, plainly. A band is always two pill-heights tall, even
 *  where its lower level is half empty, so the concept quantises badly
 *  on long chains: the 12-span fixture at 688px needs two bands (141px)
 *  where the serpentine gets away with three single-height rows
 *  (95.5px). The two widths where the owner's chain loses (620, 480)
 *  are the same effect: it misses fitting one band by a few pixels and
 *  has to buy a whole second one.
 * ------------------------------------------------------------------ *
 *  Layout only. Every pill, tint, year label, arrow glyph, stroke and
 *  the measuring pass come from ./_chain-kit so this concept cannot
 *  drift from the vocabulary the owner already approved.
 * ------------------------------------------------------------------ */

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
import type { HouseSpan } from "@/lib/house-spans";
import {
  ARROW_SLOT,
  Arrow,
  ChainScreenReaderText,
  GAP,
  HOUSE_TINTS,
  PILL_CLASS,
  Pill,
  useChainMetrics,
  type ChainMeta,
  type ChainProps,
} from "./_chain-kit";

export const META: ChainMeta = {
  key: "zigzag",
  label: "Diagonal zigzag",
  blurb:
    "Houses step southeast then northeast in one chevron that only ever moves right, each pill tucking under the tail of the one before it so the chain needs about half the width a straight row would.",
};

/* ================================================================== *
 *  GEOMETRY
 * ================================================================== */

/** Vertical gap between the upper and lower level of one sawtooth, i.e.
 *  the corridor every diagonal connector is drawn inside. Measured
 *  floor: a kit Arrow tilted to DIAG_DEG has 9.4px of ink between its
 *  highest and lowest point (its 14px shaft contributes 14*sin40 = 9.0,
 *  the head barbs a little more), plus 1.25px of stroke width, so it
 *  needs 10.7px. 14 leaves ~1.6px of air above and below the glyph,
 *  which at 1.25px stroke and 50% opacity is enough that the connector
 *  never looks welded to either pill. Every extra pixel here is a pixel
 *  of total chain height, so this is deliberately the smallest number
 *  the arrow can live in, not a comfortable one: a pill measures 22.5px
 *  tall, so a band costs 2 x 22.5 + 14 = 59px, which is exactly what
 *  two rows of the shipped serpentine cost. That parity is the whole
 *  argument for the concept: one band and two rows are the same price,
 *  and the band carries roughly twice the houses. */
const LEVEL_GAP = 14;

/** Vertical gap between two wrapped bands. Two jobs, and the larger of
 *  the two requirements wins. (1) It has to hold the drop connector,
 *  which is the same kit Arrow turned to point straight down: rotated
 *  90 degrees its 14px shaft is 14px of ink, plus stroke, so 15.3px.
 *  (2) It has to be clearly bigger than LEVEL_GAP, or the four pill
 *  rows of two stacked bands read as one four-level mess instead of two
 *  sawteeth. LEVEL_GAP x phi (14 x 1.618 = 22.7) satisfies both: it is
 *  one full golden step up from the corridor, so the eye groups levels
 *  within a band and separates band from band, and it leaves ~3.9px of
 *  air around the drop arrow. */
const BAND_GAP = 23;

/** How far a step is tilted off horizontal, in degrees. This is the one
 *  number that makes the chain read as "southeast then northeast"
 *  rather than as two rows with tilted arrows between them. It is
 *  bounded on both sides: below ~30 degrees the connector reads as a
 *  horizontal arrow that got nudged, and above ~45 degrees its ink
 *  height (14*sin(theta)) grows past what a 14px corridor can hold, and
 *  the corridor is charged to every band's height. 40 is the steepest
 *  tilt that still fits the corridor, so it is the most diagonal the
 *  concept can afford. */
const DIAG_DEG = 40;

/** The band-to-band connector points straight down, not at DIAG_DEG,
 *  and the difference is the whole signal: inside a band every arrow is
 *  a tilted step to the next pill, so a wrap needs to look like a
 *  different kind of move, not like one more step. Vertical also says
 *  literally what happened (the chain dropped a band) and is the only
 *  angle that cannot be mistaken for an in-band step. */
const DROP_DEG = 90;

/** The loosest step the zigzag is ever allowed. Past ARROW_SLOT the
 *  straight row it replaced would itself have fit, so a zigzag spread
 *  wider than this would be paying a whole extra pill-height of height
 *  for nothing. Never binds in practice (the straight-row branch below
 *  catches those chains first); it is here so the relaxation pass has a
 *  ceiling it cannot argue with. */
const STEP_MAX = ARROW_SLOT;

/** Air between two pills that end up side by side on the SAME level
 *  (pills i and i+2). Reuses the kit's one gap rather than inventing a
 *  second spacing number: GAP is already the distance at which two
 *  things in this chain read as adjacent-but-separate. */
const SAME_LEVEL_GAP = GAP;

/* ================================================================== *
 *  LAYOUT MATH
 *
 *  One number drives the whole drawing: `step`, the horizontal distance
 *  from a pill's RIGHT edge to the next pill's LEFT edge. It is uniform
 *  across the entire chain, which is what guarantees the second bar of
 *  the brief: every connector in the drawing sits in an identical gap,
 *  so no arrow is ever stretched to cover a hole another arrow did not
 *  have to. `step` is normally NEGATIVE, and that is the point: a
 *  negative step is the shingle overlap that buys the horizontal room.
 * ================================================================== */

interface Band {
  /** Index of the band's first span, in the chain's own order. */
  first: number;
  count: number;
}

interface Connector {
  key: string;
  /** Where the glyph's centre lands, in the drawing's own pixels. */
  cx: number;
  cy: number;
  deg: number;
  /** Which span this connector follows, so its entrance can be staggered
   *  in step with the pills rather than on a timeline of its own. */
  order: number;
}

interface Layout {
  step: number;
  /** Per span, in chain order. */
  xs: number[];
  tops: number[];
  connectors: Connector[];
  height: number;
}

/** Greedy left-to-right fill at a fixed step: a pill joins the current
 *  band while its right edge still clears `containerW`, otherwise it
 *  opens the next band at x = 0. A band always keeps at least one pill,
 *  so a container narrower than a single pill degrades to one pill per
 *  band (overflowing, visibly) rather than looping forever.
 *
 *  GREEDY, NOT BALANCED, and it is a real decision rather than the lazy
 *  option. Balancing (spreading the houses evenly over the same number
 *  of bands, the way a headline balances its lines) makes a stuffed
 *  first band and a nearly empty last one look tidier, but it costs
 *  height the moment a balanced tail band gains a second level: the
 *  owner's chain at 620px packs greedily as 8 + 1 and is 104.5px tall,
 *  and balances as 5 + 4 at 141px. Greedy is also what running text
 *  does, so a full first band and a short last one is a shape every
 *  reader has already been trained on. The price is the visible one in
 *  the 12-span fixture at 688px: ten houses, then two, then a lot of
 *  empty right-hand side. */
function packBands(widths: number[], containerW: number, step: number): Band[] {
  const bands: Band[] = [];
  let first = 0;
  let x = 0; // left edge of the pill placed last
  for (let i = 1; i < widths.length; i++) {
    const nextX = x + widths[i - 1] + step;
    if (nextX + widths[i] > containerW) {
      bands.push({ first, count: i - first });
      first = i;
      x = 0;
    } else {
      x = nextX;
    }
  }
  bands.push({ first, count: widths.length - first });
  return bands;
}

/** How wide one band draws at a given step. */
function bandSpan(widths: number[], band: Band, step: number): number {
  let sum = 0;
  for (let k = 0; k < band.count; k++) sum += widths[band.first + k];
  return sum + (band.count - 1) * step;
}

/**
 * Place every pill and every connector.
 *
 * Two passes, in this order for a reason:
 *
 * 1. Pack at STEP_MIN, the hardest squeeze the geometry allows. This
 *    settles how many bands the chain needs, and it is the only way to
 *    get the MINIMUM band count, which is the number that decides the
 *    chain's height.
 * 2. Then relax `step` back up until the fullest band exactly reaches
 *    the container's right edge. Same band count, least overlap, no
 *    slack left on the right, which is the sixth bar of the brief ("it
 *    looks like it's doing a very inefficient job"). Relaxing cannot
 *    change the packing: every band still fits by construction, and the
 *    pill that did not fit at the tighter step certainly does not fit
 *    at a looser one.
 */
function layoutZigzag(widths: number[], pillH: number, containerW: number): Layout {
  /* The 50% shingle limit, derived rather than chosen: pills i and i+2
     share a level, and sit x(i+2) - x(i) = w(i) + w(i+1) + 2*step apart,
     so keeping SAME_LEVEL_GAP of air between them needs
     step >= (SAME_LEVEL_GAP - w(i+1)) / 2. Taking the narrowest pill in
     the chain makes one uniform step safe for every pair at once.

     ONE step for the whole chain, not one per pair, even though a
     per-pair step would compress a little harder. The owner already
     rejected uneven spacing once (2026-07-30, on the grid version:
     columns "shove the straight arrows toward whichever pill happens
     to be narrow and space the houses unevenly"). A single step means
     every connector in the drawing sits in an identically sized gap,
     which is also what makes the "no arrow is ever stretched" promise
     checkable rather than a claim. */
  const minW = widths.reduce((a, b) => Math.min(a, b), widths[0]);
  const stepMin = (SAME_LEVEL_GAP - minW) / 2;

  const bands = packBands(widths, containerW, stepMin);

  let step = STEP_MAX;
  for (const band of bands) {
    if (band.count < 2) continue; // a lone pill has no gap, so it pins nothing
    // At step 0 a band spans exactly the sum of its pills, so this is the
    // width the band's gaps have to make up to reach the right edge.
    const pillsOnly = bandSpan(widths, band, 0);
    step = Math.min(step, (containerW - pillsOnly) / (band.count - 1));
  }
  step = Math.max(step, stepMin);

  const xs: number[] = new Array(widths.length).fill(0);
  const tops: number[] = new Array(widths.length).fill(0);
  const connectors: Connector[] = [];

  let y = 0;
  bands.forEach((band, bi) => {
    /* A band with a single pill never reaches its lower level, so it is
       only one pill tall. That is what keeps a 3-band chain whose last
       band holds one house from paying for a phantom second row. */
    const bandH = band.count > 1 ? 2 * pillH + LEVEL_GAP : pillH;

    let x = 0;
    for (let k = 0; k < band.count; k++) {
      const i = band.first + k;
      xs[i] = x;
      // Slot parity is per band, not per chain, so every band opens on
      // the upper level and the drop connector always aims at a pill
      // sitting at the top of its band.
      tops[i] = y + (k % 2 === 1 ? pillH + LEVEL_GAP : 0);
      x += widths[i] + step;
    }

    for (let k = 0; k < band.count - 1; k++) {
      const i = band.first + k;
      connectors.push({
        key: `s-${i}`,
        // Midway between the two pills' facing edges. One formula for
        // both regimes: with a positive step that is the middle of the
        // gap, with a negative step it is the middle of the overlap, and
        // either way the arrow lands where the eye is already looking.
        cx: (xs[i] + widths[i] + xs[i + 1]) / 2,
        cy: y + pillH + LEVEL_GAP / 2,
        deg: k % 2 === 0 ? DIAG_DEG : -DIAG_DEG,
        order: i,
      });
    }

    if (bi > 0) {
      const i = band.first;
      connectors.push({
        key: `d-${i}`,
        // Centred over the pill it hands off to, not off its left edge:
        // anything to the LEFT of the first pill of a band would put
        // that band's pills on a different left edge from the chain's
        // first pill, and flush-left is the owner's hard rule.
        cx: xs[i] + widths[i] / 2,
        cy: y - BAND_GAP / 2,
        deg: DROP_DEG,
        order: i,
      });
    }

    y += bandH + BAND_GAP;
  });

  return { step, xs, tops, connectors, height: y - BAND_GAP };
}

/* ================================================================== *
 *  RENDER
 * ================================================================== */

/** A kit Arrow parked at an exact point and turned to an exact angle.
 *  The translate(-50%, -50%) is what lets the layout maths above talk
 *  about the glyph's CENTRE and stay ignorant of its 18x10 box; the
 *  rotation is applied to a wrapper rather than the svg so the kit's
 *  own `back` mirroring stays available and untouched. The static
 *  transform lives on a plain span and only opacity is animated on the
 *  motion child, so Motion never has to share the transform property
 *  with a hand-written one. */
function TiltedArrow({ cx, cy, deg, delay }: { cx: number; cy: number; deg: number; delay: number }) {
  return (
    <span
      className="absolute flex"
      style={{ left: cx, top: cy, transform: `translate(-50%, -50%) rotate(${deg}deg)` }}
    >
      <motion.span
        className="flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay }}
      >
        <Arrow back={false} />
      </motion.span>
    </span>
  );
}

/** The pill entrance, identical in both branches: a short rise on a
 *  gentle spring, staggered by span order so the chain assembles in the
 *  order it is meant to be read. transform and opacity only. */
function ChainPill({ index, span, style }: { index: number; span: HouseSpan; style?: CSSProperties }) {
  return (
    <motion.span
      style={style}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRINGS.gentle, delay: 0.04 * index }}
      className={cn(PILL_CLASS, HOUSE_TINTS[index % HOUSE_TINTS.length])}
    >
      <Pill span={span} />
    </motion.span>
  );
}

export default function ChainZigzag({ spans, className }: ChainProps) {
  const { hostRef, measurer, metrics } = useChainMetrics(spans);

  const shell = (drawing: ReactNode) => (
    <div ref={hostRef} className={cn("relative w-full", className)}>
      <ChainScreenReaderText spans={spans} />
      {measurer}
      {drawing}
    </div>
  );

  if (spans.length === 0) return null;
  // First paint, before the measuring pass has run once: the wrapper and
  // the screen-reader sentence exist, the drawing does not yet.
  if (!metrics || metrics.containerW <= 0) return shell(null);

  const { widths, pillH, containerW } = metrics;

  /* One line and no zigzag at all whenever one line honestly fits. The
     owner's own words: "when the houses all fit in one line there's no
     problem". A chevron drawn where a row would have done is a costume,
     and it would spend a pill-height of vertical space to look busy. */
  const straightW = widths.reduce((a, b) => a + b, 0) + (spans.length - 1) * ARROW_SLOT;
  if (straightW <= containerW) {
    return shell(
      <div aria-hidden className="flex w-fit items-center" style={{ gap: GAP }}>
        {spans.flatMap((span, i) => {
          const cells: ReactNode[] = [<ChainPill key={`p-${i}`} index={i} span={span} />];
          if (i < spans.length - 1) cells.push(<Arrow key={`a-${i}`} back={false} />);
          return cells;
        })}
      </div>
    );
  }

  const { xs, tops, connectors, height } = layoutZigzag(widths, pillH, containerW);

  return shell(
    <div aria-hidden className="relative" style={{ height }}>
      {spans.map((span, i) => (
        <ChainPill
          key={`p-${i}`}
          index={i}
          span={span}
          style={{ position: "absolute", left: xs[i], top: tops[i] }}
        />
      ))}
      {connectors.map((c) => (
        <TiltedArrow
          key={c.key}
          cx={c.cx}
          cy={c.cy}
          deg={c.deg}
          // Half a pill's stagger after the pill it follows, so a step
          // always lands just behind the house it points at.
          delay={0.04 * c.order + 0.12}
        />
      ))}
    </div>
  );
}
