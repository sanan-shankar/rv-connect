"use client";

/* ------------------------------------------------------------------ *
 *  STEPPED ROWS. One of six competing house-chain layout concepts.
 *  Pills, tints, type and arrow all come from ./_chain-kit.tsx (the
 *  owner approved that vocabulary); only the arrangement below is new.
 *
 *  THE IDEA. Every row runs left to right and every row starts on the
 *  SAME left rule as the rest of the sheet, so the chain reads like a
 *  paragraph of text: one hard edge down the left, ragged right. Time
 *  never reverses, so the house you were in eight years ago is never
 *  sitting beside the house you are in now.
 *
 *  ONE LEFT EDGE, NOT AN INDENT. The first version of this file indented
 *  every continuation row by the width of its entry mark, on the
 *  reasoning that a wrapped line is a continuation and continuations get
 *  indented. Measured against the owner's real nine spans it put row 0
 *  at 0.00 and every row under it at 24.00, which is the exact ragged
 *  left edge he complained about in the first place ("Golden starts
 *  maybe a centimetre to the right of the left align line. It should be
 *  all the way at that end") reproduced one row lower down. His words
 *  name the first house, but the thing being asked for is a left edge,
 *  and an edge that only the top row obeys is not an edge.
 *
 *  So the entry mark HANGS IN THE MARGIN instead, the way an opening
 *  quote hangs outside a justified column: the pills of every row start
 *  at x = 0 and the mark is drawn at negative x, out in the sheet's own
 *  padding. It can afford to be there because it is a 1.25px stroke at
 *  50% muted-foreground, not text. Hanging it costs the reader nothing
 *  and buys back 24px of line on every row but the first; dropping the
 *  row-end hook (below) buys back another 18px on every row but the
 *  last. Measured on the owner's nine houses in the real sheet at a
 *  390px phone, where the column is 300px, that is the difference
 *  between seven rows (217.5px of chain) and five (152.5px).
 *
 *  WHY A *MARKED* BREAK AT ALL. The owner tried two things and disliked
 *  both. The plain wrap: "the random break in the line is a bigger
 *  error". A row simply stops and the reader has to guess whether the
 *  next row continues it or starts something new. The serpentine:
 *  readable breaks, but bought with a reversed row, and he named the
 *  cost himself: "the house you are in now and the house you were in
 *  eight years earlier are nearby."
 *
 *  Both are the same mistake in opposite directions: one hides the
 *  break, the other pays for it with the reading order. The answer here
 *  is the mark every code editor already draws when a long line soft
 *  wraps: a small arrow that drops out of the line above, turns right,
 *  and points at where reading resumes. It is the kit's own arrow with
 *  its tail bent up, so the break is announced in the vocabulary already
 *  on the line, and it costs nothing: no reversed row, no arc lane in
 *  the margin, no arrow stretched across the page to reach the next
 *  pill.
 *
 *  ONE MARK PER BREAK, NOT TWO. The first version also drew a hook at
 *  the END of each row, leaving the last pill and turning down. It was
 *  deleted. A break mark only reads as punctuation while it is attached
 *  to the ink it punctuates (a hyphen works because it touches the word
 *  it splits), and a ragged-right row ends at a different x every time:
 *  measured on the owner's chain in a 390px column those three hooks
 *  sat at x = 377.6, then 288.7, then 311.4 going down the block, an
 *  89px spread that reads as debris rather than as a column.
 *
 *  Right-aligning them was the other option and it is worse. A hook
 *  parked at the right edge stops touching the pill it is leaving: in a
 *  480px column the owner's three rows end at 370.6, 406.8 and 438, so
 *  the mark would float 97, 61 and 30px clear of its own pill and read
 *  as a decorative rail. It would also have to reserve that column on
 *  every row, which is the gutter the owner just rejected, mirrored.
 *
 *  The entry mark is the one that can be columnar for nothing, because
 *  the left edge is already a hard rule: every break in the block is
 *  marked at the same x = -18, at every width, for free. One mark that
 *  always lines up beats two when one of the two never can.
 *
 *  WHAT THIS BUYS AGAINST THE OWNER'S COMPLAINT. "The arrows are really
 *  long... most of each line is just arrows." Nothing here ever
 *  stretches. Every connector on screen is a fixed-size glyph: the
 *  straight arrow travels the kit's 14px, the entry mark 12px around a
 *  corner, and neither knows or cares how wide the container is. There
 *  is no geometry in this file that can grow a line to fill space,
 *  because nothing has to meet anything. Rows are ragged right on
 *  purpose, and that is affordable precisely because a marked break does
 *  not need two ends to line up.
 * ------------------------------------------------------------------ */

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
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
  key: "stepped",
  label: "Stepped rows",
  blurb:
    "Every row runs left to right and every row starts on the sheet's left rule, so time never runs backwards and the block has one hard edge. The wrap is marked rather than hidden: each continuation row opens on the kit's arrow bent into a wrap mark, hung out in the margin so it never pushes the pills in.",
};

/* ================================================================== *
 *  GEOMETRY. Everything here is either taken from the kit or derived
 *  from it, so no number in this file can drift away from the pill and
 *  arrow the owner already approved.
 * ================================================================== */

/** The vertical gap between two rows of pills.
 *
 *  10px, one golden step up from the kit's 6px pill-to-arrow GAP
 *  (6 x 1.618 = 9.7): the air between two rows has to read as larger
 *  than the air inside a row, or the chain stops looking like lines and
 *  starts looking like a grid, but a full second step (16px) is more
 *  separation than rows joined by a visible mark need.
 *
 *  Measured against the owner's real 9-span chain: 2 rows and 55px tall
 *  at 688px, 3 rows and 87.5px at 480px, 5 rows and 152.5px at 302px.
 *  The shipped serpentine's 14px would add 4px per junction, so 16px on
 *  the 302px case, and buy nothing: there the gap was the only thing
 *  telling one row from the next, and here the break marks do that. */
const ROW_GAP = 10;

/** Corner radius of the entry mark's turn. 5px is half the arrow glyph's
 *  10px height, so the turn curves at the scale of the arrowhead sharing
 *  its line. Smaller reads as a nick rather than a turn at 1.25px
 *  stroke; larger eats more than half of the 12px of travel the mark is
 *  allowed, which leaves its arrowhead no straight lead to arrive on. */
const HOOK_R = 5;

/** The arrowhead's reach. The kit draws its head as `M 11.5 1.5 L 15 5
 *  L 11.5 8.5`: barbs 3.5px back from the tip and 3.5px out from the
 *  line. Named here so the entry mark's length is built from the number
 *  the head is actually drawn from, not from a copy of it that can go
 *  stale if the kit's arrow is ever redrawn. */
const HEAD = 3.5;

/** The straight shaft between the end of the turn and the back of the
 *  arrowhead. Deliberately HEAD, so the head always sits on a run as
 *  long as itself: any shorter and the barbs grow straight out of the
 *  curve and the mark reads as a tick rather than an arrow. (The kit's
 *  straight arrow gets 10.5px here, but it has a void between two pills
 *  to cross; this one only has to look like an arrow arriving.) */
const MARK_LEAD = HEAD;

/** How far LEFT of the block's left rule the entry mark hangs, in px.
 *
 *  Built from its parts rather than chosen: 1px of inset (the kit's
 *  Arrow starts its stroke at x=1, not x=0, so a round cap is never
 *  half a pixel off its own box) + the 5px corner + a 3.5px shaft +
 *  a 3.5px head + GAP. That last term is the same 6px flex gap every
 *  cell in a row gets, so the mark's tip stands off the pill it points
 *  at by exactly the distance a straight arrow's tip stands off the pill
 *  after it.
 *
 *  19 is also checked, not hoped: the mark's INK reaches 18px left of
 *  the rule, and the profile sheet's padding at phone width is p-6, so
 *  the stroke lands 7px clear of the sheet's edge (measured at a 390px
 *  viewport: 25px from the rule to the sheet's border, less 18). At the
 *  desktop p-10 it lands 23px clear. Nothing here can push the page
 *  into horizontal scroll, because the mark hangs into padding that
 *  already exists on the left and the block's own right edge is
 *  unchanged (measured: no horizontal page scroll at 390, 820 or
 *  1440). */
const HANG = 1 + HOOK_R + MARK_LEAD + HEAD + GAP;

/** Where the entry mark's tip sits in the overlay's own coordinates
 *  (that overlay is shifted left by HANG, so x = HANG is the block's
 *  left rule). One GAP short of the rule, per HANG's derivation. */
const MARK_TIP_X = HANG - GAP;

/** How far the entry mark reaches UP out of its own row, measured from
 *  the row's vertical centre. `pillH / 2` gets it to the pill's top
 *  edge; `ROW_GAP - GAP` (4px) carries it into the gap above, leaving
 *  exactly GAP of clear air below the row it came from, so the mark
 *  reads as dropping out of that row without ever looking welded to it.
 *  Nothing is drawn outside the block: only continuation rows carry a
 *  mark, so there is never one above the first row. */
function markRise(pillH: number): number {
  return pillH / 2 + (ROW_GAP - GAP);
}

/* ================================================================== *
 *  ROW BREAKING. Two passes: greedy to find the fewest rows possible,
 *  then a balancing pass that flattens those rows out.
 * ================================================================== */

/** Inclusive span-index range for one row. */
interface Row {
  start: number;
  end: number;
}

/** Width of the pills-and-arrows run for spans [i..j], from measured
 *  pill widths. `ARROW_SLOT` (not `ARROW_W`) per join, because the kit
 *  charges an arrow the flex gap on both of its sides. This is the WHOLE
 *  cost of a row, and every row's line is the full container: the two
 *  things that used to be charged on top of this are both gone, the
 *  entry mark because it now hangs outside the container, the row-end
 *  hook because it no longer exists. Rows therefore all have the same
 *  capacity, which is also what makes plain greedy row-count-optimal
 *  below. */
function runWidth(widths: number[], i: number, j: number): number {
  let total = 0;
  for (let k = i; k <= j; k++) total += widths[k];
  return total + (j - i) * ARROW_SLOT;
}

/** First-fit line-breaking, with an optional ceiling on how many pills
 *  one row may hold. With `maxPerRow` at the span count this is plain
 *  greedy, which gives the fewest possible rows: optimal for row COUNT
 *  here because every row has the identical line width, so nothing a
 *  row does can make a later row cheaper.
 *
 *  A row always keeps at least one pill even when that pill is wider
 *  than the line: pills are `whitespace-nowrap` by the kit's own
 *  vocabulary, so a 40-character free-typed house name has nowhere
 *  better to go, and one overhanging pill is a far better failure than
 *  a loop that never terminates. */
function packGreedy(widths: number[], containerW: number, maxPerRow: number): Row[] {
  const n = widths.length;
  const rows: Row[] = [];
  let i = 0;
  while (i < n) {
    let j = i;
    while (
      j + 1 < n &&
      j - i + 1 < maxPerRow &&
      runWidth(widths, i, j + 1) <= containerW
    ) {
      j++;
    }
    rows.push({ start: i, end: j });
    i = j + 1;
  }
  return rows;
}

/** The fewest rows possible, then the flattest arrangement that still
 *  uses only that many: tighten the ceiling on pills-per-row one step
 *  at a time and keep the tightest one that has not cost an extra row.
 *
 *  This is the concept's direct answer to "there's so much white space,
 *  it looks like it's doing a very inefficient job". Plain greedy
 *  stuffs the early rows and leaves the leftovers at the bottom: the
 *  12-span chain at 688px comes out 5, 5, 2, ending at 636, 613.5 and
 *  249.5, so two full lines are followed by one that is two pills and
 *  438px of nothing. Same three rows, same height, but capped at four
 *  it comes out 4, 4, 4, ending at 508.1, 487.2 and 503.9: all three
 *  line ends inside 21px of each other. The owner's own 9 spans at
 *  620px go from 4, 4, 1 to 3, 3, 3 the same way.
 *
 *  Lowering a CEILING rather than solving for even line widths is what
 *  keeps the shape honest at the sizes where nothing can be balanced.
 *  Both of the obvious "proper" objectives (minimise the sum of squared
 *  slack; minimise the widest row) are symmetric between rows, so on
 *  the five widest house names at 688px both of them prefer a 2-then-3
 *  split over 3-then-2, the second by 2.8px: a first line that stops at
 *  284px of 688 (41%) over one that runs to 446px (65%). That reads as
 *  the chain giving up early, and it puts the sparsest line on the one
 *  rule that has to look deliberate, the block's left edge. Filling
 *  greedily under a ceiling cannot produce that: every row takes all it
 *  can up to the cap, so a later row is fuller than an earlier one only
 *  when the pills' own widths force it. The block tapers. That taper, not
 *  any indent, is the step in "stepped rows". */
function packBalanced(widths: number[], containerW: number): Row[] {
  const loosest = packGreedy(widths, containerW, widths.length);
  let best = loosest;
  // Row count is monotone in the cap (a tighter cap can only split a row,
  // never merge two), so the first cap that costs a row ends the search.
  for (let cap = widths.length - 1; cap >= 1; cap--) {
    const tighter = packGreedy(widths, containerW, cap);
    if (tighter.length > loosest.length) break;
    best = tighter;
  }
  return best;
}

/* ================================================================== *
 *  THE BREAK MARK. The kit's arrow with its tail bent up: same 1.25px
 *  `STROKE`, same round caps, same arrowhead geometry.
 * ================================================================== */

/** Start of a continuation row: drop in from the gap above, out in the
 *  margin, turn right, and arrive at the row's first pill on the kit
 *  arrowhead. Drawn in the overlay's coordinates, where x = HANG is the
 *  block's left rule, so the whole mark lives at negative x relative to
 *  the pills and cannot move them. */
function entryMarkPath(cy: number, pillH: number): string {
  return [
    `M 1 ${cy - markRise(pillH)}`,
    `V ${cy - HOOK_R}`,
    // Sweep 0: heading south, turning to head east, which is
    // counter-clockwise on a y-down canvas.
    `A ${HOOK_R} ${HOOK_R} 0 0 0 ${1 + HOOK_R} ${cy}`,
    `H ${MARK_TIP_X}`,
  ].join(" ");
}

/** The kit arrowhead's own geometry (`M 11.5 1.5 L 15 5 L 11.5 8.5`),
 *  re-expressed around an arbitrary tip so the entry mark arrives on
 *  literally the same head as every straight arrow in the row: barbs
 *  HEAD back and HEAD out. */
function arrowHeadPath(tipX: number, tipY: number): string {
  return `M ${tipX - HEAD} ${tipY - HEAD} L ${tipX} ${tipY} L ${tipX - HEAD} ${tipY + HEAD}`;
}

/* ================================================================== *
 *  THE COMPONENT
 * ================================================================== */

export default function SteppedChain({ spans, className }: ChainProps) {
  const { hostRef, measurer, metrics } = useChainMetrics(spans);

  if (spans.length === 0) return null;

  /* Before the first measuring pass there is nothing honest to draw:
     the row breaks are computed from real pill widths, so drawing
     early would mean drawing a layout we know is wrong and then
     visibly re-flowing it. The screen-reader sentence is complete from
     the first paint either way. */
  if (!metrics) {
    return (
      <div ref={hostRef} className={cn("relative w-full", className)}>
        <ChainScreenReaderText spans={spans} />
        {measurer}
      </div>
    );
  }

  const { widths, pillH } = metrics;
  // A host can report 0 mid-transition (a collapsed parent, a panel
  // opening). Falling back to one pill per row is ugly but finite;
  // clamping keeps the packer off a zero-width line.
  const containerW = Math.max(metrics.containerW, 1);

  const rows = packBalanced(widths, containerW);

  const totalH = rows.length * pillH + (rows.length - 1) * ROW_GAP;
  const rowCenter = (r: number) => r * (pillH + ROW_GAP) + pillH / 2;

  /* One mark per continuation row. Drawn in a single overlay in real
     pixel coordinates (not as flex cells) so a mark can hang into the
     margin and into the row gap without ever changing a row's height or
     a row's left edge, and so the maths that places it is three numbers
     rather than a layout negotiation. */
  const entries = rows.slice(1).map((row, k) => {
    const cy = rowCenter(k + 1);
    return {
      // Keyed by the row's first span for the same reason the rows are:
      // a resize that re-breaks the chain should not replay the marks
      // whose rows did not actually change.
      key: `entry-${row.start}`,
      path: entryMarkPath(cy, pillH),
      head: arrowHeadPath(MARK_TIP_X, cy),
      // The mark arrives with the pill it points at, so the chain draws
      // itself in reading order instead of the marks landing as a
      // separate layer once the pills have settled.
      delay: 0.04 * row.start,
    };
  });

  return (
    <div ref={hostRef} className={cn("relative w-full", className)}>
      <ChainScreenReaderText spans={spans} />
      {measurer}

      <div aria-hidden className="relative flex flex-col" style={{ gap: ROW_GAP }}>
        {rows.map((row) => (
          <div
            // Keyed by the row's first span, not by its position, so a
            // resize that re-breaks the chain only remounts the rows whose
            // contents actually changed. Keying by index would remount every
            // row below the change and replay its pills' entry animation on
            // every drag of the window edge.
            key={`row-${row.start}`}
            className="flex items-center"
            style={{ gap: GAP, height: pillH }}
          >
            {Array.from({ length: row.end - row.start + 1 }, (_, k) => {
              const i = row.start + k;
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
              // Within a row the join is the kit's straight arrow,
              // untouched. Only the join BETWEEN rows is this concept's
              // invention, which is the whole point: the chain still
              // looks like the chain, and the one new mark appears
              // exactly where the old layout was failing.
              if (i < row.end) cells.push(<Arrow key={`a-${i}`} back={false} />);
              return cells;
            })}
          </div>
        ))}

        {entries.length > 0 && (
          <svg
            className="pointer-events-none absolute top-0 text-muted-foreground/50"
            // Shifted a full HANG to the left of the pills' rule and made
            // that much wider, so its own x = HANG lands exactly on the
            // rule and every mark is drawn at x < HANG, out in the sheet's
            // padding. The right edge is unmoved, so the block still ends
            // where the pills end.
            style={{ left: -HANG }}
            width={containerW + HANG}
            height={totalH}
            viewBox={`0 0 ${containerW + HANG} ${totalH}`}
            fill="none"
            aria-hidden
          >
            {entries.map((e) => (
              <motion.g
                key={e.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: e.delay }}
              >
                <path d={e.path} {...STROKE} />
                <path d={e.head} {...STROKE} strokeLinejoin="round" />
              </motion.g>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
