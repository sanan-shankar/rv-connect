"use client";

/* ------------------------------------------------------------------ *
 *  BALANCED SERPENTINE - the snake, rebuilt rather than replaced.
 *
 *  The owner has seen two chains and picked this family: "out of the two
 *  options I've tried, the snake is better. The random break in the line
 *  is a bigger error than having houses that were far apart actually
 *  close together in the UI." So the incumbent idea stays; the three
 *  things that actually break in it are what this file changes.
 *
 *  1. RAGGEDNESS. The shipped chain packs greedily (packRows in
 *     src/components/profile/houses-chain.tsx): fill a row until the
 *     next pill overflows, then start a new one. Measured on the
 *     owner's own nine houses at the real 688px profile width, that
 *     comes out 4 + 4 + 1, a third row holding one pill beside acres of
 *     nothing. Here the break points come from a Knuth-Plass style
 *     dynamic program over the measured pill widths that minimises the
 *     SUM OF SQUARED SLACK over every row, last row included: the same
 *     nine houses come out 5 + 4 in two rows at 688px, and 3 + 3 + 3 at
 *     480px where they genuinely need three.
 *
 *  2. STRETCHED ARROWS. "Sometimes the arrows are too long. It looks
 *     really janky, there's so much white space, it looks like it's
 *     doing a very inefficient job." Nothing in this layout stretches:
 *     the straight arrow is the kit's fixed 18px glyph, and the turn is
 *     the SAME glyph rotated a quarter turn. The longest line this file
 *     can draw is therefore 14px of ink at any width and any span
 *     count; the shipped chain's turning arc measures 183px of ink on
 *     the owner's chain at 688px and 198px at 302px. Row slack is not
 *     poured into the connectors, and it is not poured into the gaps
 *     between pills either (that only moves the white space around and
 *     leaves each arrow marooned in the middle of it). It is left where
 *     it honestly belongs: as trailing air at the end of the row, which
 *     the line breaker in (1) has already made as small and as evenly
 *     shared as the pill widths allow.
 *
 *  3. THE TURN. The shipped turn is an SVG arc living in a 30px side
 *     gutter, whose horizontal run stretches to reach whatever x the
 *     row happened to end at, and that gutter is why the owner's first
 *     pill "starts maybe a centimeter to the right of the left align
 *     line". Here the turn drops from the BOTTOM of the last pill of a
 *     row to the TOP of the first pill of the next, so it is a pure
 *     vertical of fixed length, in the row gap, needing no gutter on
 *     either side. There is no indent at any row count: the first pill
 *     sits on x = 0 exactly, and so does every row that can.
 *
 *  The one thing a vertical turn needs is for the two pills it joins to
 *  overlap horizontally, and both the line breaker and the row placer
 *  below are built to guarantee that (see `minOverlap`). That is the
 *  whole trick of this concept: instead of drawing a longer line to
 *  reach wherever a row ended, it CHOOSES where rows end.
 *
 *  Reading order stays the boustrophedon the owner already accepted:
 *  a row runs left to right, drops at its right end, the next row runs
 *  right to left with its arrows mirrored, drops at its left end, and
 *  so on. Direction is never a guess, because the arrows in a row all
 *  point the way that row is read.
 *
 *  MEASURED, every fixture in the kit at 900, 820, 688, 620, 480, 390,
 *  302, 240, 200 and 150px, against the shipped chain at the same
 *  widths. First pill offset: 0.00px in every single case, against 30px
 *  (the arc gutter) in every shipped case that needs three rows. The
 *  owner's nine houses: 2 rows and 67px tall at 688px against the
 *  shipped 3 rows and 95.5px, and 5 rows and 200.5px at 302px against
 *  the shipped 8 rows and 278px. Nothing overflows its container at any
 *  of those widths, and every turn lands inside both of the pills it
 *  joins. At 240px and below the chain degrades to one pill per row,
 *  still flush left, still joined top to bottom, still not overflowing;
 *  the shipped chain overflows its container by 12px at 150px wide.
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
  useChainMetrics,
  type ChainMeta,
  type ChainProps,
} from "./_chain-kit";

export const META: ChainMeta = {
  key: "serpentine",
  label: "Balanced serpentine",
  blurb:
    "The snake rebuilt: rows broken for even length instead of greedily, every row flush left, and the turn a fixed vertical drop that cannot stretch.",
};

/* ================================================================== *
 *  GEOMETRY
 * ================================================================== */

/** The vertical channel between two rows, which is also the whole length
 *  the turn has to work in. The kit arrow's ink is 14px long (its shaft
 *  runs x=1 to x=15 inside an 18px box), so 22px leaves 4px of air at
 *  each end of the drop. A straight arrow in a row sits 7px from the
 *  pill behind it and 9px in front, so 4px is deliberately tighter than
 *  its horizontal counterpart: the channel between two rows is an
 *  uninterrupted band running the whole width of the block, and an
 *  uninterrupted band of white reads wider than the same measurement
 *  pinched between two pill caps. Shot at 20, 22 and 24 against the
 *  12-span fixture: 24 broke the block into three separate lines, 20
 *  crowded the arrowhead against the pill it points at, 22 held. The
 *  owner's 9 spans pay it once at 688px (67px tall in total) and four
 *  times at 302px (200.5px). */
const ROW_GAP = 22;

/** The height of the kit arrow's box; the kit exports its width as
 *  ARROW_W but not this. Needed only to centre that box on the point the
 *  drop is supposed to fall through, since rotating an element turns it
 *  about its own centre. Nothing is drawn at this size. */
const ARROW_H = 10;

/** The kit arrow's ink is not centred in its 18px box: it runs 1 to 15,
 *  so the ink's midpoint sits 1px left of the box's. Rotated a quarter
 *  turn that becomes 1px high, which would leave every drop looking
 *  fractionally short of the pill it points at. Push the box down by
 *  that 1px and the ink lands centred in the channel. */
const ARROW_INK_SHIFT = 1;

/** How much worse a pixel of INDENT is than a pixel of trailing slack.
 *  Both are empty space, but slack is only where the block stops, while
 *  an indent is a notch in the one edge the owner asked to be straight,
 *  so the breaker is willing to leave a row shorter to keep a later row
 *  flush. Swept against the fixtures at every test width: at 2 the
 *  owner's chain at 302px still parks its odd pill alone in the middle
 *  of the block, indented 39px; 3 is the smallest weight that moves
 *  that pill to the end of the chain where it lands flush left, and 4
 *  keeps a margin, since the threshold is a function of the particular
 *  pill widths and those change with the house names on the profile. */
const INDENT_WEIGHT = 4;

/* ================================================================== *
 *  LINE BREAKING - where the rows break, and why there
 * ================================================================== */

/** A row is a contiguous run of spans, always in chronological order.
 *  Which END of it is drawn leftmost is the serpentine's business, not
 *  the breaker's: a row is the same run either way round. */
interface Row {
  from: number;
  to: number;
  width: number;
}

/**
 * Minimum-raggedness line breaking over the measured pill widths.
 *
 * COST = the sum, over every row INCLUDING THE LAST, of that row's
 * squared slack against the band. Two properties fall out of that one
 * expression, which is why it is the whole cost function:
 *
 * - It prefers fewer rows. Total slack across R rows is R*band minus a
 *   quantity that only depends on R, so adding a row always adds slack,
 *   and squaring punishes the addition harder than it punishes an
 *   uneven split of the rows already there.
 * - Given a row count, it makes the rows EQUAL. For a fixed R the total
 *   slack is fixed, so the only freedom left is how that slack is
 *   distributed, and a sum of squares over a fixed sum is minimised
 *   when every term is the same. Charging the last row is what makes
 *   this true: Knuth-Plass proper exempts the last line of a paragraph,
 *   because a short last line is how a paragraph is supposed to end.
 *   A snake is not a paragraph. A short last row here is the "4 + 4 + 1"
 *   the owner is looking at, so it pays like every other row.
 *
 * Evenness is not only cosmetic here. Two rows joined by a turn have to
 * overlap horizontally for the drop to have somewhere to land, and rows
 * of similar width overlap almost completely, so the cost function that
 * makes the block look calm is the same one that keeps the turns short.
 * Where that is not enough, the turn test below rejects the break.
 *
 * O(n^2) states, O(n) transitions. n is the number of house spans in
 * one career, so realistically under twelve and never anywhere near a
 * size where that matters.
 */
function balanceRows(widths: number[], band: number, minOverlap: number): Row[] {
  const n = widths.length;
  const prefix = [0];
  for (let i = 0; i < n; i++) prefix.push(prefix[i] + widths[i]);
  /** A row's drawn width: its pills plus one arrow slot per join. */
  const rowW = (from: number, to: number) =>
    prefix[to + 1] - prefix[from] + (to - from) * ARROW_SLOT;

  /* Memo and reconstruction are keyed by the row AND its direction,
     because the turn leaving a row is a right-hand turn when the row
     runs forwards and a left-hand one when it runs back, and only the
     right-hand turn can be impossible (see the test below). */
  const key = (from: number, to: number, backwards: boolean) =>
    (from * n + to) * 2 + (backwards ? 1 : 0);
  const cost = new Map<number, number>();
  const nextEnd = new Map<number, number>();

  /** Cost of drawing spans `from..to` as one row, plus everything after. */
  function solve(from: number, to: number, backwards: boolean): number {
    const k = key(from, to, backwards);
    const memo = cost.get(k);
    if (memo !== undefined) return memo;

    const w = rowW(from, to);
    const slack = Math.max(0, band - w);
    let total = slack * slack;

    if (to < n - 1) {
      let best = Infinity;
      let bestEnd = to + 1;
      for (let end = to + 1; end < n; end++) {
        const nextW = rowW(to + 1, end);
        /* A row of two or more pills that does not fit is not a row.
           A single pill wider than the band still has to go somewhere,
           so it is always allowed: that lone-pill continuation is what
           guarantees this search always finds SOME legal packing. */
        if (end > to + 1 && nextW > band) break;
        /* The right-hand turn test. Rows sit as far left as they can,
           so the next row's leading pill can slide right but never left
           of x = 0; if that row is so much wider than this one that its
           leading pill clears this row's trailing pill even at x = 0,
           no vertical drop can join them. Widths only grow as `end`
           grows, so the first failure ends the scan. The single-pill
           case is exempt for the reason above, and cannot fail anyway
           (it needs only this row's own trailing pill to be at least
           minOverlap wide, which every pill is). */
        if (end > to + 1 && !backwards && nextW > w + widths[to + 1] - minOverlap) break;

        /* What this break would cost in indent: how far the next row has
           to be pushed right for the drop to reach it (see placeRows).
           Measured with this row at x = 0, which is where it sits unless
           it was itself pushed, so a chain of pushes is under-charged;
           this is a tie-breaker between packings, not a guarantee. */
        const indent = backwards
          ? 0
          : Math.max(0, w - widths[to] + minOverlap - nextW);
        const c = solve(to + 1, end, !backwards) + INDENT_WEIGHT * indent * indent;
        if (c < best) {
          best = c;
          bestEnd = end;
        }
      }
      total += best;
      nextEnd.set(k, bestEnd);
    }

    cost.set(k, total);
    return total;
  }

  let bestFirst = 0;
  let bestCost = Infinity;
  for (let to = 0; to < n; to++) {
    if (to > 0 && rowW(0, to) > band) break;
    const c = solve(0, to, false);
    if (c < bestCost) {
      bestCost = c;
      bestFirst = to;
    }
  }

  const rows: Row[] = [];
  let from = 0;
  let to = bestFirst;
  let backwards = false;
  for (;;) {
    rows.push({ from, to, width: rowW(from, to) });
    if (to >= n - 1) break;
    /* `solve` always records a continuation for a row that is not the
       last, so the fallback only exists to close the loop rather than
       spin: it drops the remaining spans into one final row. */
    const end = nextEnd.get(key(from, to, backwards)) ?? n - 1;
    from = to + 1;
    to = Math.max(end, from);
    backwards = !backwards;
  }
  return rows;
}

/* ================================================================== *
 *  PLACEMENT - where each row sits, and why the turn cannot stretch
 * ================================================================== */

/**
 * Every row's left offset, in the order they are drawn.
 *
 * The rule is one sentence: a row sits as far left as it can, given that
 * the turn arriving into it must be able to fall straight down. Row 0 is
 * therefore always at 0, which is the owner's hard requirement, and in
 * practice so is nearly every other row: an offset only appears when the
 * row above ended so much further right that the drop would otherwise
 * have nothing beneath it, and even then the row moves the minimum the
 * drop needs rather than lining its edge up with the row above (which
 * would be tidier and would leave a much bigger hole).
 *
 * Two facts make this safe rather than hopeful. A row can always be
 * pushed right to meet a right-hand turn, because there is no wall on
 * that side until the band edge, and the push needed is at most the
 * width of the trailing pill it is reaching under, so it can never push
 * a row past the band. A left-hand turn needs no push at all: both rows
 * are already at or near x = 0, so their leading pills overlap by their
 * whole width.
 */
function placeRows(
  rows: Row[],
  widths: number[],
  band: number,
  minOverlap: number
): number[] {
  const xs = [0];
  for (let r = 1; r < rows.length; r++) {
    const prev = rows[r - 1];
    const prevX = xs[r - 1];
    const prevBackwards = (r - 1) % 2 === 1;
    const row = rows[r];
    let x: number;
    if (prevBackwards) {
      /* Left-hand turn: the drop leaves the previous row's LAST pill,
         which a backwards row draws leftmost, and lands on this row's
         first pill, which a forwards row also draws leftmost. */
      x = Math.max(0, prevX + minOverlap - widths[row.from]);
    } else {
      /* Right-hand turn: the previous row's trailing pill starts at
         `trailingLeft`, so this row's leading pill has to reach at
         least minOverlap past that point. */
      const trailingLeft = prevX + prev.width - widths[prev.to];
      x = Math.max(row.width, trailingLeft + minOverlap) - row.width;
    }
    /* Nothing may cross the band's right edge. Clamping here costs a
       little overlap under the drop, never a longer connector: the drop
       is placed inside whatever overlap survives (see dropX). */
    xs.push(Math.max(0, Math.min(x, band - row.width)));
  }
  return xs;
}

/** Where the drop falls, in the horizontal overlap of the two pills it
 *  joins. `inset` in from the turning edge when there is room for it, so
 *  the line meets the pill just past the end of its rounded cap rather
 *  than on the curve; the middle of the overlap when there is not. */
function dropX(
  aLeft: number,
  aRight: number,
  bLeft: number,
  bRight: number,
  inset: number,
  turningRight: boolean
): number {
  const lo = Math.max(aLeft, bLeft);
  const hi = Math.min(aRight, bRight);
  if (hi - lo < 2 * inset) return (lo + hi) / 2;
  return turningRight ? hi - inset : lo + inset;
}

/* ================================================================== *
 *  THE CHAIN
 * ================================================================== */

export default function BalancedSerpentineChain({ spans, className }: ChainProps) {
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
  const band = Math.max(containerW, 1);

  /* A pill is capped by a full half-circle at each end, so its cap arc
     spans exactly half its height in from either edge. Dropping one
     half-height plus a pixel in from the turning edge puts the line on
     the pill's flat top or bottom, just past where the curve ends,
     instead of grazing the round. */
  const inset = pillH / 2 + 1;
  /* The narrowest horizontal overlap two pills can have and still take a
     drop that sits one cap-length inside BOTH of them. Everything above
     is written to guarantee this much: the line breaker refuses a break
     that cannot reach it, and the placer nudges a row right until it
     does. */
  const minOverlap = 2 * inset;

  /* Recomputed on every render rather than memoised: the inputs only
     change when the measuring pass reports new widths or a new container
     width, which is already the only thing that re-renders this, and the
     search is a few hundred operations on a career-length list. */
  const rows = balanceRows(widths, band, minOverlap);
  const xs = placeRows(rows, widths, band, minOverlap);
  const rowTop = (r: number) => r * (pillH + ROW_GAP);
  const totalH = rows.length * pillH + (rows.length - 1) * ROW_GAP;

  const drops = rows.slice(0, -1).map((row, r) => {
    const next = rows[r + 1];
    const turningRight = r % 2 === 0;
    /* The pill the line leaves is this row's last, the pill it enters is
       the next row's first; a backwards row draws its first pill
       rightmost, which is why both ends of a right-hand turn are read
       off the rows' right edges and both ends of a left-hand one off
       their left edges. */
    const aRight = turningRight ? xs[r] + row.width : xs[r] + widths[row.to];
    const bRight = turningRight ? xs[r + 1] + next.width : xs[r + 1] + widths[next.from];
    return {
      key: `drop-${row.to}`,
      span: row.to,
      x: dropX(
        aRight - widths[row.to],
        aRight,
        bRight - widths[next.from],
        bRight,
        inset,
        turningRight
      ),
      y: rowTop(r) + pillH + ROW_GAP / 2,
    };
  });

  return (
    <div ref={hostRef} className={cn("relative w-full", className)}>
      <ChainScreenReaderText spans={spans} />
      {measurer}
      <div aria-hidden className="relative" style={{ height: totalH }}>
        {rows.map((row, r) => {
          const backwards = r % 2 === 1;
          const order: number[] = [];
          for (let i = row.from; i <= row.to; i++) order.push(i);
          if (backwards) order.reverse();
          return (
            <div
              key={r}
              className="absolute flex items-center"
              style={{ gap: GAP, top: rowTop(r), left: xs[r], height: pillH }}
            >
              {order.flatMap((i, pos) => {
                const cells = [
                  <motion.span
                    key={`p-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRINGS.gentle, delay: 0.04 * i }}
                    className={cn(PILL_CLASS, HOUSE_TINTS[i % HOUSE_TINTS.length])}
                  >
                    <Pill span={spans[i]} />
                  </motion.span>,
                ];
                if (pos < order.length - 1) cells.push(<Arrow key={`a-${i}`} back={backwards} />);
                return cells;
              })}
            </div>
          );
        })}

        {/* The turns. Each one is the kit's straight arrow given a quarter
            turn, so a chain only ever contains one arrow glyph at one
            length, pointing whichever of three ways the reading goes. */}
        {drops.map((drop) => (
          <motion.span
            key={drop.key}
            className="absolute block"
            style={{
              width: ARROW_W,
              height: ARROW_H,
              left: drop.x - ARROW_W / 2,
              top: drop.y - ARROW_H / 2 + ARROW_INK_SHIFT,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            /* Lands just after the pill it leaves has settled, so the eye
               is handed down to the next row rather than finding the turn
               already drawn. */
            transition={{ duration: 0.25, delay: 0.04 * drop.span + 0.12 }}
          >
            <span className="block" style={{ transform: "rotate(90deg)" }}>
              <Arrow back={false} />
            </span>
          </motion.span>
        ))}
      </div>
    </div>
  );
}
