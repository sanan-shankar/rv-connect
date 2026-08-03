"use client";

/* ------------------------------------------------------------------ *
 *  CONCEPT: THE YEAR RAIL
 *
 *  One house per row, every pill flush on the container's left edge,
 *  each row joined to the next by one short vertical arrow drawn at a
 *  single fixed x. That fixed x is the rail: a straight hairline spine
 *  running the whole height of the chain, with the pills strung off it.
 *
 *  Why vertical at all. The shipped serpentine packs pills into rows,
 *  so the geometry depends on how many happen to fit, and the owner's
 *  complaint (2026-08-02) is entirely a consequence of that packing:
 *  "the arrows are really long... most of each line is just arrows",
 *  and the first pill is pushed off the left edge by the turning-arc
 *  gutter. A vertical rail has no horizontal packing, so there is
 *  nothing for a width change to get wrong. Every connector is the same
 *  length at every width because its length is fixed by the row rhythm,
 *  not by leftover space. Pill one starts at x=0 because there is no
 *  gutter to reserve. Reading order is top to bottom, which is the one
 *  order nobody has to be taught.
 *
 *  What it costs: height. Nine spans want nine rows. Everything below
 *  is spent buying that height back or making it earn itself:
 *
 *   - SAME-YEAR SPANS SHARE A ROW. The rail is indexed by time, so two
 *     houses in the same academic year belong on the same rung, joined
 *     by the kit's horizontal arrow. This is the owner's own data: he
 *     lists Alamanda 2021-22 and Jacaranda 2021-22 back to back, and
 *     drawing them as two separate rungs says a year passed between
 *     them, which is false. It also takes his 9 spans down to 8 rows.
 *   - YEAR FIRST INSIDE THE PILL. The pill component is the kit's,
 *     untouched; only its flex direction is reversed (one class). Every
 *     year label is exactly seven tabular-nums characters ("2014-15",
 *     "2016-18"), so year-first means the years line up in a real
 *     column at a constant x AND the house names start at a constant x
 *     too. That is the rail the concept is named for, and it comes free:
 *     no pill is padded out to a common width, so no pill carries dead
 *     space (which is what got the earlier grid version rejected on
 *     2026-07-30).
 *   - THE ROW RHYTHM IS AS TIGHT AS THE ARROW ALLOWS: 12px rung to rung,
 *     against the shipped chain's 14px. See RAIL_H.
 *
 *  Measured (headless Chrome, real Libre Baskerville, every fixture in
 *  the kit at 900 / 820 / 688 / 620 / 480 / 390 / 340 / 320 / 310 / 302 /
 *  290 / 260 / 220px). For the owner's real 9-span chain: 8 rungs and
 *  264px tall at BOTH 688px and 302px, first pill at x=0.00 and longest
 *  connector 8px at both, nothing overflowing at any width. The height is
 *  identical at the two ends because nothing in this layout depends on
 *  width. The 12-span stress chain is 402px and the widest-names fixture
 *  160px, again at every width.
 * ------------------------------------------------------------------ */

import { Fragment } from "react";
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
  STROKE,
  useChainMetrics,
  type ChainMeta,
  type ChainProps,
} from "./_chain-kit";

export const META: ChainMeta = {
  key: "rail",
  label: "The year rail",
  blurb:
    "One house per row, flush left, strung top to bottom on a single vertical arrow. It cannot break at any width and reads in exact order; it pays for that in height.",
};

/* ---------------------------------------------------------------- *
 *  Geometry. Everything here is vertical; the horizontal numbers all
 *  come from the kit so a rail row spaces its pills exactly like a
 *  shipped chain row does.
 * ---------------------------------------------------------------- */

/** The connector's own box height, and the only number that sets the
 *  row rhythm. This is the kit's arrow turned to point down, with the
 *  shaft cut: the kit draws a 14px shaft whose last 3.5px is the
 *  chevron, and 8 is the shortest total run that still reads as a line
 *  with a head on it (7px of drawn stroke, of which 3.5px is bare stem
 *  ahead of the chevron). Checked at deviceScaleFactor 1 as well as 2,
 *  because at 2x a stub still looks like an arrow and at 1x it stops.
 *  Rotating the kit's 14px glyph unchanged instead would have cost
 *  +42px over the owner's 9-span chain (7 junctions x 6px) for shaft
 *  nobody reads as shaft; going to 7 leaves 2.5px of bare stem and the
 *  connector collapses into a bare chevron, which throws away the one
 *  piece of vocabulary the owner named ("I like the arrow"). */
const RAIL_H = 8;

/** Air between a pill's border and the connector's stroke, above and
 *  below. Applied as the flex column's `gap`, so one constant produces
 *  both leads. 2px: the kit's stroke is 1.25px with round caps, so the
 *  cap alone eats ~0.6px of the gap, and 2 is the smallest value that
 *  still leaves a visible sliver of background between the pill border
 *  and the line. Total rung-to-rung gap is therefore 2+8+2 = 12px,
 *  under the shipped chain's 14px ROW_GAP: a horizontal row gap has two
 *  full lines of pills to hold apart, a vertical one has a 22.5px pill
 *  above and below it and reads airier at the same number, so 14 left
 *  the arrows looking like they were floating between the pills rather
 *  than joining them. */
const RAIL_LEAD = 2;

/** Half-height of the connector's chevron, and the length of each of
 *  its legs on both axes. 3.5 is lifted off the kit arrow's head
 *  (`M11.5 1.5 L15 5 L11.5 8.5`: 3.5 across, 3.5 up) so the vertical
 *  head is the horizontal head turned a quarter turn, same 90 degree
 *  point, same 45 degree legs, not a second arrowhead design. */
const RAIL_HEAD = 3.5;

/** Slack subtracted before deciding a shared rung fits on one line.
 *  `containerW` comes from `clientWidth`, which Chrome reports rounded
 *  to a whole pixel, while the measured pill widths are fractional: a
 *  container 289.6px wide reports 290, a rung measuring 289.8px would
 *  be judged to fit, and the flex row would then wrap for real and
 *  leave the horizontal arrow pointing off the end of a line. 1px is
 *  the whole of the possible rounding error. Measured cost: the owner's
 *  two 2021-22 pills need 289.55px together, so this moves their split
 *  point from 290px to 291px and changes nothing at 302px or above. */
const RUNG_FIT_SLACK = 1;

/**
 * One rung-to-rung connector: the kit's arrow, pointing down, at the
 * rail's fixed x. `x` is passed in rather than fixed here because it is
 * derived from the measured pill height (see `railX` below) and the
 * pill's height moves with the user's font settings.
 *
 * The stroke is inset half a pixel at each end so the round caps land
 * exactly on the box's edges instead of being clipped by the SVG
 * viewport, and the box is only as wide as the head needs, so this
 * element never widens the column it sits in.
 */
function RailArrow({ x }: { x: number }) {
  const top = 0.5;
  const tip = RAIL_H - 0.5;
  const w = Math.ceil(x + RAIL_HEAD + 1);
  return (
    <svg
      width={w}
      height={RAIL_H}
      viewBox={`0 0 ${w} ${RAIL_H}`}
      fill="none"
      aria-hidden
      className="shrink-0 text-muted-foreground/50"
    >
      <path d={`M ${x} ${top} V ${tip}`} {...STROKE} />
      <path
        d={`M ${x - RAIL_HEAD} ${tip - RAIL_HEAD} L ${x} ${tip} L ${x + RAIL_HEAD} ${tip - RAIL_HEAD}`}
        {...STROKE}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Group the spans into rungs, as arrays of span indices.
 *
 * Two consecutive spans share a rung when their year ranges overlap
 * (`next.fromYear <= previous.toYear`), i.e. the person was in both
 * houses in the same academic year. Only CONSECUTIVE spans are
 * considered, so a house returned to years later still gets its own
 * rung in the right place; the chain stays a narrative, not a set.
 *
 * A shared rung is then only kept if its pills plus the arrows between
 * them actually fit the container. If they do not, the rung is split
 * back into one span per row rather than allowed to wrap: a wrapped
 * flex row would leave the horizontal arrow dangling at the end of a
 * line pointing at nothing, which is the single ugliest failure mode
 * this concept exists to avoid. Split rungs still read correctly, the
 * shared year is written on both pills, and the whole thing simply
 * becomes the plain one-per-row rail again.
 */
function buildRungs(spans: HouseSpan[], widths: number[], containerW: number): number[][] {
  const grouped: number[][] = [];
  for (let i = 0; i < spans.length; i++) {
    const prev = grouped[grouped.length - 1];
    if (prev && spans[i].fromYear <= spans[i - 1].toYear) prev.push(i);
    else grouped.push([i]);
  }
  return grouped.flatMap((rung) => {
    if (rung.length === 1) return [rung];
    const used = rung.reduce((sum, i) => sum + widths[i], 0) + (rung.length - 1) * ARROW_SLOT;
    return used <= containerW - RUNG_FIT_SLACK ? [rung] : rung.map((i) => [i]);
  });
}

export default function ChainRail({ spans, className }: ChainProps) {
  const { hostRef, measurer, metrics } = useChainMetrics(spans);

  if (spans.length === 0) return null;

  /* The rail's x, and the only measurement this layout needs. Half the
     pill height puts it dead on the centre of the pill's left cap: the
     pill is `rounded-full`, so that cap is a circle of radius pillH/2
     and its centre is the one point on the pill's left end the eye
     already reads as its origin. Measured, that is 22.5/2 = 11.25px,
     which lands within a quarter pixel of where the year text itself
     starts (1px border + px-2.5 padding = 11px), so the spine, the
     pills' left edges and the year column all sit on one line. It is
     derived rather than hard-coded because pillH moves with the user's
     font size, and a hard-coded 11.25 would silently stop meaning
     "the cap's centre" the moment it did. */
  const railX = metrics ? metrics.pillH / 2 : 0;
  const rungs = metrics ? buildRungs(spans, metrics.widths, metrics.containerW) : null;

  return (
    <div ref={hostRef} className={cn("relative w-full", className)}>
      <ChainScreenReaderText spans={spans} />
      {measurer}

      {/* `items-start` so every rung is exactly as wide as its own
          pills: a full-width row would let a single pill's flex box
          stretch, and a stretched box is a box that can be filled with
          space nobody asked for. The column gap supplies the lead above
          and below each connector, so `RAIL_LEAD` is stated once. */}
      {rungs && (
        <div aria-hidden className="flex flex-col items-start" style={{ gap: RAIL_LEAD }}>
          {rungs.map((rung, r) => (
            <Fragment key={rung[0]}>
              {r > 0 && <RailArrow x={railX} />}
              <div className="flex items-center" style={{ gap: GAP }}>
                {rung.flatMap((i, pos) => {
                  const cells = [
                    <motion.span
                      key={`p-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRINGS.gentle, delay: 0.04 * i }}
                      /* `flex-row-reverse` is the whole of this
                         concept's change to the pill: the kit's Pill
                         renders untouched (same markup, same tints,
                         same type, same measured width) and CSS alone
                         puts its year first. Every year label is
                         exactly seven tabular-nums characters, so
                         year-first makes the years a real column at a
                         constant x and, because they are all the same
                         width, starts every house name at a constant x
                         too: measured at 52.69px in every pill of every
                         fixture. That second alignment is what makes
                         the stack scannable, and it costs nothing, no
                         pill is padded out to a common width the way
                         the grid version the owner rejected on
                         2026-07-30 was. */
                      className={cn(PILL_CLASS, "flex-row-reverse", HOUSE_TINTS[i % HOUSE_TINTS.length])}
                    >
                      <Pill span={spans[i]} />
                    </motion.span>,
                  ];
                  if (pos < rung.length - 1) cells.push(<Arrow key={`a-${i}`} back={false} />);
                  return cells;
                })}
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
