"use client";

/* ------------------------------------------------------------------ *
 *  CONCEPT: THE ROUTE LINE
 *
 *  One continuous stroke with the houses threaded onto it like stations
 *  on a transit line, and exactly one arrowhead, at the terminus.
 *
 *  WHY THIS SHAPE. The owner's complaint is a size complaint, not a
 *  direction complaint: "sometimes the arrows are too long... most of
 *  each line is just arrows". An arrow glyph has an implied fixed size,
 *  so a stretched one reads as broken. A LINE has no implied size, so a
 *  long run of it reads as intentional and a short run of it reads as
 *  tight. Making the connective tissue a line and the arrowhead scarce
 *  therefore removes the failure mode rather than tuning it: there is
 *  nothing left in the drawing that can look "too long".
 *
 *  THREE MOVES DO ALL THE WORK.
 *
 *  1. THE TURN IS A DROP, NOT A SIDE ARC. The shipped chain turns rows
 *     in a side gutter, which is what forces the first pill inward
 *     ("Golden starts maybe a centimeter to the right of the left align
 *     line") and what makes the turn travel the width of the sheet. Here
 *     the line leaves a row from the BOTTOM of that row's last pill and
 *     enters the next row at the TOP of its first pill. A drop needs no
 *     horizontal lane at all, so every row, including the first, starts
 *     at x = 0 with zero indent, and the connector between rows is about
 *     as long as the row gap instead of as long as the sheet.
 *
 *  2. THE SNAKE EARNS ITS KEEP. Rows alternate direction, which the
 *     owner already picked ("out of the two options I've tried, the
 *     snake is better"). It is not a style choice here, it is what makes
 *     move 1 possible: a serpentine row ends where the next row starts,
 *     so the drop has almost nothing to travel. An all-forward layout
 *     would need the connector to walk the full width back to x = 0 on
 *     every wrap, which is exactly the long connector we are removing.
 *
 *  3. ROWS ARE BROKEN FOR EVEN WIDTH, NOT GREEDILY. Nothing is
 *     stretched (justified gaps would be the stretched-connector defect
 *     under another name); instead the BREAK POINTS are chosen, by a
 *     small dynamic program, so the rows come out as close to equal
 *     width as the pills allow, using the same number of rows greedy
 *     packing would have used. Equal rows mean the drop between them is
 *     a straight, short vertical instead of a dog-leg, and the right
 *     edge lands nearly flush, which is what kills the "inefficient job"
 *     read.
 *
 *  BEHIND THE PILLS, OR UP TO THEIR EDGE? Up to their edge, with zero
 *  air. The pill fills are 7-10% tints, so a stroke actually drawn
 *  behind one would ghost straight through the house name and read as a
 *  strike-through. Butting the stroke against the cap's tangent point
 *  buys the same "threaded on the line" reading with none of the
 *  ghosting: the eye closes the pill for free because the stroke meets
 *  the cap exactly on its widest point, so each pill reads as a station
 *  the line arrives at, not a label parked beside it.
 *  It is also what lets a pill act as a CORNER: at the end of a row the
 *  line goes in horizontally and comes out downward, and the turn is
 *  simply hidden under the pill that owns it.
 * ------------------------------------------------------------------ */

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
import {
  ARROW_SLOT,
  ARROW_W,
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
  key: "route",
  label: "The route line",
  blurb:
    "The houses are stations on one continuous line that snakes down the sheet, with a single arrowhead at the end.",
};

/* ================================================================== *
 *  GEOMETRY. Every number here is measured against the owner's real
 *  9-span chain at 688px (his desktop content width) and 302px (a 390px
 *  phone), which are the two ends of the range this has to hold across.
 * ================================================================== */

/** The bare-line run between two pills inside a row.
 *
 *  Exactly the kit's arrow SLOT minus the air on both sides of the
 *  glyph, which is the glyph's own width (30 - 12 = 18 = ARROW_W). The
 *  reasoning: the arrow needed 6px of air at each end because a glyph
 *  pointing AT something must not touch it, but a line whose stations
 *  sit ON it must touch, so that air is dead space here and is given
 *  back. Measured payoff on the owner's nine spans: 12px reclaimed at
 *  each of his eight junctions, 96px in all, which is very nearly a
 *  tenth house's worth of width. His five-house first row at 688px
 *  measures 590px where the kit's 30px slot would have made it 638. */
const LINK = ARROW_SLOT - 2 * GAP;

/** Vertical air between one row of pills and the next, which is all the
 *  room a drop connector has to work in.
 *
 *  Deliberately the SAME 18px as a link. That makes the route's stride
 *  identical in both axes: apart from the rare dog-leg, no connector
 *  anywhere in the chain, sideways or downwards, is any longer than any
 *  other, which is the most direct possible answer to "sometimes the
 *  arrows are too long". It also happens to be exactly the arrow glyph's
 *  length, so the one arrowhead fits a drop as precisely as it fits a
 *  link if it ever has to point down one, and it leaves 3px of straight
 *  stub above and below both corner arcs of a dog-leg (18 - 2 x
 *  CORNER_R), so a jogging drop never has to shrink its radius. Measured
 *  cost against 14px: 4px per row, so 4px on the owner's 2-row desktop
 *  chain and 16px on his 5-row phone one. */
const ROW_GAP = LINK;

/** The one corner radius in the drawing, used for both elbows of a
 *  dog-legged drop.
 *
 *  Deliberately FIXED and never scaled to the length of the jog: a
 *  radius that grows with the distance it has to cover is precisely the
 *  "stretched to fill space it did not ask for" defect, just expressed
 *  as curvature instead of length. 6px reads as a drawn corner rather
 *  than a mitre at 1.25px stroke, and 2 x 6 leaves a straight stub at
 *  both ends of an 18px drop. It is only reduced below 6 when the jog
 *  itself is under 12px wide, where the geometry, not the taste, sets
 *  the limit. */
const CORNER_R = 6;

/** Packing insurance, in px, held back off the measured container width.
 *
 *  `clientWidth` is an integer but the real content box is fractional,
 *  so a row packed to exactly `clientWidth` can be a fraction of a pixel
 *  too wide for the box it was measured against and clip its last pill.
 *  1px is the smallest amount that cannot round the wrong way, and it is
 *  taken off the RIGHT only, so it never costs the first pill its flush
 *  left edge. */
const PACK_SLOP = 1;

/** How much extra a row's leftover width costs for each row that still
 *  follows it, as a fraction. It is what tips a block towards tapering
 *  instead of flaring.
 *
 *  A TENTH, on purpose. Big enough to settle a near-tie: at 688px the
 *  five widest house names break 3 then 2 or 2 then 3 for within about a
 *  percent of the same cost, and unbiased that landed on 2 then 3, a
 *  short row sitting on top of a long one. Small enough that it can
 *  never buy a taper by leaving an earlier row materially emptier,
 *  because a 10% weight cannot outweigh a difference between two SQUARED
 *  slacks. Checked against the case that would expose it: four equal
 *  pills in a container that holds three still break 2 and 2 (cost
 *  122984) rather than 3 and a lonely 1 (156298). */
const FLARE_BIAS = 0.1;

/* ================================================================== *
 *  PACKING. Break points only. No gap is ever stretched to fill a row.
 * ================================================================== */

/** Width of the row holding spans [i, j), pills snug with LINK between. */
function rowWidthOf(prefix: number[], i: number, j: number): number {
  return prefix[j] - prefix[i] + (j - i - 1) * LINK;
}

/**
 * Break `widths` into rows that are as close to equal width as the pills
 * allow, using the fewest rows possible.
 *
 * Two passes, because "fewest rows" and "evenest rows" are different
 * questions and only the first one has a greedy answer:
 *
 * 1. Greedy first-fit gives the minimum row count for a fixed sequence
 *    (the classic line-breaking result). That count is then FIXED, so
 *    evening the rows out can never cost a single extra row of height.
 * 2. A small dynamic program picks, among every packing that uses that
 *    many rows, the one minimising the sum of SQUARED leftover width.
 *    Squared, not linear: linear cost is indifferent between two rows
 *    30px short and one row 60px short, and it is the lone very short
 *    row that both looks like wasted space and forces a long dog-leg in
 *    the drop beside it.
 *
 * Step 2 is free, and provably so, which is worth stating because "even
 * rows" can look like it is leaving space on the right. Once the row
 * count is fixed, the number of links is fixed too (one per pill, minus
 * one per row), so the TOTAL width of all the rows added together is a
 * constant no matter where the breaks go. No packing can make the block
 * cover more of the sheet than any other; the only thing on the table is
 * how the leftover is distributed. Spreading it evenly costs nothing and
 * buys short drops and a near-flush right edge, where hoarding it into
 * one short row buys a staircase.
 *
 * Slack is then weighted very slightly by how many rows still follow it,
 * because a ragged edge is only visible against the rows under it and the
 * bottom row has nothing under it to be ragged against. That is what
 * decides the near-ties in favour of a block that TAPERS rather than one
 * that flares: five wide names at 688px cost within about a percent of
 * each other broken 3 then 2 or 2 then 3, and 2 then 3 puts the short row
 * on top, where a reader reads it as a mistake rather than as an ending.
 * The last row gets no free pass beyond that, unlike a paragraph's last
 * line: free slack would let it come out arbitrarily narrower than the
 * row above, and the gap between two neighbouring row widths is exactly
 * what the drop between them has to travel.
 */
function packBalanced(widths: number[], maxW: number): number[][] {
  const n = widths.length;
  const prefix = [0];
  for (const w of widths) prefix.push(prefix[prefix.length - 1] + w);
  // A pill wider than the whole container still has to go somewhere, so a
  // row of one is always legal; anything longer must actually fit.
  const fits = (i: number, j: number) => j - i === 1 || rowWidthOf(prefix, i, j) <= maxW;

  let rowCount = 1;
  let run = 0;
  for (const w of widths) {
    const add = run === 0 ? w : LINK + w;
    if (run > 0 && run + add > maxW) {
      rowCount++;
      run = w;
    } else {
      run += add;
    }
  }

  const INF = Number.POSITIVE_INFINITY;
  // best[r][i]: cheapest way to lay spans i..n-1 in exactly r rows.
  const best = Array.from({ length: rowCount + 1 }, () => new Array<number>(n + 1).fill(INF));
  const cut = Array.from({ length: rowCount + 1 }, () => new Array<number>(n + 1).fill(-1));
  best[0][n] = 0;

  for (let r = 1; r <= rowCount; r++) {
    for (let i = n - 1; i >= 0; i--) {
      for (let j = i + 1; j <= n; j++) {
        // rowWidthOf grows with j, so the first miss ends the run.
        if (!fits(i, j)) break;
        const rest = best[r - 1][j];
        if (rest === INF) continue;
        const slack = maxW - rowWidthOf(prefix, i, j);
        // r is how many rows this suffix uses, so r - 1 still follow.
        const cost = (1 + FLARE_BIAS * (r - 1)) * slack * slack + rest;
        // `<=`, not `<`: j climbs, so an EXACT tie is settled in favour of
        // the fuller earlier row. Equal-width pills split 3 and 2 cost the
        // same either way round, and 3 then 2 is the shape a paragraph
        // makes, with the ragged end at the bottom where a reader expects
        // a chain to run out. FLARE_BIAS handles the near-ties; this only
        // handles the dead heats it cannot see.
        if (cost <= best[r][i]) {
          best[r][i] = cost;
          cut[r][i] = j;
        }
      }
    }
  }

  const rows: number[][] = [];
  let i = 0;
  for (let r = rowCount; r > 0; r--) {
    const j = cut[r][i];
    // Unreachable for any real input; bail to one-pill-per-row rather
    // than loop forever if a future change ever makes the DP infeasible.
    if (j < 0) {
      for (let k = i; k < n; k++) rows.push([k]);
      return rows;
    }
    rows.push(Array.from({ length: j - i }, (_, k) => i + k));
    i = j;
  }
  return rows;
}

/* ================================================================== *
 *  THE DROP. One row's last pill to the next row's first pill.
 * ================================================================== */

/**
 * The connector between two rows, from (x0, y0) at the bottom edge of
 * one pill to (x1, y1) at the top edge of the next.
 *
 * Straight when the two columns agree, which after balanced packing is
 * every left-hand turn and most right-hand ones. When they do not, it is
 * a Z with two fixed-radius elbows and a straight stub at each end, so
 * the only thing that varies with the distance is the length of one
 * horizontal run, never the shape or the radius of the corners.
 */
function dropPath(x0: number, y0: number, x1: number, y1: number): string {
  const dx = x1 - x0;
  const drop = y1 - y0;
  // Under half a pixel of jog is a sub-pixel measuring artefact, not a
  // turn; drawing the Z for it would put two visible elbows in the line
  // for no reason.
  if (Math.abs(dx) < 0.5) return `M ${x0} ${y0} V ${y1}`;

  const dir = dx > 0 ? 1 : -1;
  const r = Math.min(CORNER_R, drop / 2, Math.abs(dx) / 2);
  const stub = (drop - 2 * r) / 2;
  const yA = y0 + stub;
  const yB = y1 - stub;
  // Heading down and turning towards +x is an anticlockwise arc in SVG's
  // y-down space (sweep 0); the second elbow turns back to down, which is
  // clockwise (sweep 1). Both flags mirror when the jog goes left.
  const sweepIn = dir > 0 ? 0 : 1;
  const sweepOut = dir > 0 ? 1 : 0;
  return [
    `M ${x0} ${y0}`,
    `V ${yA}`,
    `A ${r} ${r} 0 0 ${sweepIn} ${x0 + dir * r} ${yA + r}`,
    `H ${x1 - dir * r}`,
    `A ${r} ${r} 0 0 ${sweepOut} ${x1} ${yB}`,
    `V ${y1}`,
  ].join(" ");
}

/** Hold a turn column inside the straight middle of the pill hiding it.
 *  A pill narrower than it is tall has no straight middle at all (no real
 *  house name is, but a one-character "Other" entry could be), so that
 *  case falls back to the pill's own centre rather than inverting. */
function clampToPill(value: number, lo: number, hi: number): number {
  if (lo > hi) return (lo + hi) / 2;
  return Math.min(Math.max(value, lo), hi);
}

/** The air the kit's arrow leaves between its tip and the thing it points
 *  at: its head lands at x = 15 inside an 18px box. Reused so a head drawn
 *  on the route stands the same distance off its pill as the glyph does. */
const ARROW_TIP_AIR = ARROW_W - 15;

/** The kit arrow's own head, turned to point down a drop.
 *
 *  The chain that shipped already draws heads this way, in path form with
 *  the shared STROKE, to cap its turning arcs, so this is the established
 *  move rather than a second arrow: same 3.5px reach back, same 3.5px
 *  spread, same round join. Needed because the terminal house is
 *  occasionally reached by a drop rather than along a row (it sits alone
 *  on the last line), and the glyph component cannot be laid along a path
 *  that bends. */
function headDown(x: number, y: number): string {
  return `M ${x - 3.5} ${y - 3.5} L ${x} ${y} L ${x + 3.5} ${y - 3.5}`;
}

/* ================================================================== *
 *  RENDER
 * ================================================================== */

interface Placed {
  x: number;
  y: number;
  w: number;
}

type Connector =
  | { kind: "link"; x: number; y: number; back: boolean }
  | { kind: "drop"; d: string; head: string | null };

export default function ChainRoute({ spans, className }: ChainProps) {
  const { hostRef, measurer, metrics } = useChainMetrics(spans);

  if (spans.length === 0) return null;

  if (!metrics) {
    return (
      <div ref={hostRef} className={cn("relative w-full", className)}>
        <ChainScreenReaderText spans={spans} />
        {measurer}
      </div>
    );
  }

  const { widths, pillH, containerW } = metrics;
  const n = spans.length;
  const maxW = Math.max(containerW - PACK_SLOP, 1);
  const rows = packBalanced(widths, maxW);
  const pitch = pillH + ROW_GAP;

  /** Half a pill's height, which is also the radius of its rounded end
   *  cap. A drop may not turn closer than this to either end of the pill
   *  hiding it, or the elbow would poke out past the cap's curve and read
   *  as a stray stub instead of as the pill's own corner. */
  const cap = pillH / 2;

  // Every row is anchored at x = 0, forward rows and backward rows alike,
  // so the whole chain has one crisp left margin and the first pill sits
  // on it. Odd rows read right to left, so their DOM order is reversed
  // for placement and their chronologically first pill is the rightmost.
  const placed = new Array<Placed>(n);
  const rowOf = new Array<number>(n);
  rows.forEach((row, r) => {
    const order = r % 2 === 1 ? [...row].reverse() : row;
    let x = 0;
    order.forEach((i) => {
      placed[i] = { x, y: r * pitch, w: widths[i] };
      rowOf[i] = r;
      x += widths[i] + LINK;
    });
  });

  const connectors: Connector[] = [];
  for (let j = 0; j < n - 1; j++) {
    const a = placed[j];
    const b = placed[j + 1];
    const r = rowOf[j];
    if (rowOf[j + 1] === r) {
      // Same row: a straight LINK-long segment, drawn from whichever pill
      // is physically on the left, and pointing back the way the row runs.
      const backwards = r % 2 === 1;
      const left = backwards ? b : a;
      connectors.push({ kind: "link", x: left.x + left.w, y: a.y + cap, back: backwards });
      continue;
    }
    /* Row turn. The line leaves the bottom of this row's last pill and
       enters the top of the next row's first pill, and the corner at each
       end is hidden under the pill that owns it. That leaves a genuine
       choice: the turn can happen anywhere along a pill's straight middle,
       not only at its far cap. So take the pair of columns that are
       CLOSEST TOGETHER, biased to the outer end of the row so the line
       still carries as far as it can before turning. Two rows whose widths
       differ by less than a pill can therefore share one column and the
       drop comes out perfectly straight, which is the common case once the
       rows have been evened out; when they cannot share, this still saves
       most of a pill's width off the dog-leg. Measured: the owner's
       9-span chain at 688px had a 59px jog before this and now drops
       dead straight, and the worst dog-leg anywhere across the six
       fixtures at seven widths falls from 148px to 49px. */
    const rightSide = r % 2 === 0;
    const exitLo = a.x + cap;
    const exitHi = a.x + a.w - cap;
    const entryLo = b.x + cap;
    const entryHi = b.x + b.w - cap;
    const target = rightSide ? Math.min(exitHi, entryHi) : Math.max(exitLo, entryLo);
    const exitX = clampToPill(target, exitLo, exitHi);
    const entryX = clampToPill(target, entryLo, entryHi);
    const y0 = r * pitch + pillH;
    // A drop normally runs right up to the pill below it, because a line
    // touching its station is what makes the pill read as sitting ON the
    // route. The one drop that carries the arrowhead stops short instead,
    // by the same air the glyph keeps in front of its own tip.
    const isTerminal = j === n - 2;
    const y1 = (r + 1) * pitch - (isTerminal ? ARROW_TIP_AIR : 0);
    connectors.push({
      kind: "drop",
      d: dropPath(exitX, y0, entryX, y1),
      head: isTerminal ? headDown(entryX, y1) : null,
    });
  }

  const totalH = rows.length * pillH + (rows.length - 1) * ROW_GAP;
  // The one arrowhead in the drawing: the final approach into the most
  // recent house. Everything before it is bare line, so the head is the
  // only thing in the chain that says "this end is now".
  const terminal = connectors[n - 2];

  return (
    <div ref={hostRef} className={cn("relative w-full", className)}>
      <ChainScreenReaderText spans={spans} />
      {measurer}
      <div aria-hidden className="relative" style={{ height: totalH }}>
        <svg
          className="pointer-events-none absolute inset-0 text-muted-foreground/50"
          width={containerW}
          height={totalH}
          viewBox={`0 0 ${containerW} ${totalH}`}
          fill="none"
        >
          {connectors.map((c, j) =>
            // The terminal LINK is drawn by the kit's arrow glyph instead,
            // so it must not also be stroked here: two half-opacity strokes
            // on the same 18px would composite into a darker segment.
            c === terminal && c.kind === "link" ? null : (
              <motion.g
                key={`c-${j}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                // Each leg lands just after the pill it leaves, so the route
                // reads as drawing itself along the chain rather than
                // appearing all at once under the pills.
                transition={{ duration: 0.24, delay: 0.04 * j + 0.1 }}
              >
                <path d={c.kind === "drop" ? c.d : `M ${c.x} ${c.y} H ${c.x + LINK}`} {...STROKE} />
                {c.kind === "drop" && c.head ? (
                  <path d={c.head} {...STROKE} strokeLinejoin="round" />
                ) : null}
              </motion.g>
            )
          )}
        </svg>

        {spans.map((span, i) => (
          <motion.span
            key={`p-${i}`}
            className={cn(PILL_CLASS, "absolute", HOUSE_TINTS[i % HOUSE_TINTS.length])}
            style={{ left: placed[i].x, top: placed[i].y }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRINGS.gentle, delay: 0.04 * i }}
          >
            <Pill span={span} />
          </motion.span>
        ))}

        {/* When the last house is reached along a row, the whole final link
            IS the kit's arrow glyph, unchanged, so the one arrowhead in the
            drawing is pixel for pixel the arrow the owner already approved.
            A drop-terminated chain gets the same head from the SVG above. */}
        {terminal && terminal.kind === "link" ? (
          <div
            className="pointer-events-none absolute"
            style={{ left: terminal.x, top: terminal.y, transform: "translateY(-50%)" }}
          >
            <motion.span
              className="inline-flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.24, delay: 0.04 * (n - 2) + 0.1 }}
            >
              <Arrow back={terminal.back} />
            </motion.span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
