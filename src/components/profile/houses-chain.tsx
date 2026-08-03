"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
import { academicSpanLabel, parseHouseSpans, type HouseSpan } from "@/lib/house-spans";

/**
 * The houses chain: each house a pill with its name and year range, joined by
 * arrows, reading like the chapters of a school career. Consecutive years in
 * the same house collapse into one span; the pills cycle three brand tints so a
 * long run stays legible without inventing 22 real house colours. The green
 * tint is LEAF, not canopy (owner, 2026-07-30: "we started using the dark
 * green instead of the light green... move it back to light").
 *
 * LAID OUT AS A BOUSTROPHEDON (serpentine): row 1 runs left to right, takes a
 * 180 turn past the right edge of the pills, row 2 runs right to left, and so
 * on, so no arrow ever points into empty space.
 *
 * NOT A GRID. An earlier version put pills in `max-content` grid columns so
 * row ends would line up for the turn. The owner rejected it (2026-07-30):
 * columns pad every pill out to the widest one in its column, which shoves
 * the straight arrows toward whichever pill happens to be narrow and spaces
 * the houses unevenly. So now each row is a snug flex line - every pill
 * exactly as wide as its name, every arrow an equal gap from both of its
 * neighbours - and the turn no longer needs aligned row ends: it is drawn in
 * a side gutter as one arc that leaves the END of the top row at that row's
 * vertical centre, swings around outside the pills, and comes back pointing
 * at the FIRST pill of the next row at its vertical centre. Rows are packed
 * from measured pill widths (a hidden measuring pass), so the chain always
 * fills the line it has and the arc always knows exactly where a row ends.
 */

const HOUSE_TINTS = [
  "border-leaf/30 bg-leaf/[0.07] text-leaf",
  "border-cinnamon/30 bg-cinnamon/[0.07] text-cinnamon",
  "border-sky/35 bg-sky/[0.10] text-sky",
];

// Each stored year is an ACADEMIC year (2014 reads as "2014-15"), so every
// span -- one year or a multi-year run -- renders as a hyphenated span label,
// never a bare calendar year and never an en dash.
function yearRange(span: HouseSpan): string {
  return academicSpanLabel(span.fromYear, span.toYear);
}

/* Geometry, all in px. ARROW_SLOT is what one straight arrow costs a row:
   the glyph plus the flex gap on each side of it. GUTTER is the side lane the
   turning arc lives in; the arc's horizontal radius stays smaller than the
   gutter so the arc always has a straight lead back to the pill it points at. */
const GAP = 6; // flex gap-1.5, between a pill and an arrow
const ARROW_W = 18;
const ARROW_SLOT = ARROW_W + 2 * GAP;
/* The channel between two rows. 26px when the turn was an S-curve that needed
   room to leave and arrive vertically; the turn is now at most a single
   quarter bend, which needs far less, and the owner called 26 "a tad much"
   (2026-08-03). 20px. GUTTER, ARC_RX and LEAD went with the old bracket. */
const ROW_GAP = 20;

/* The radius of the ONE bend a turn is allowed. Owner: "I wanted just one 90
   degree curve max." */
const TURN_R = 10;

/* How much horizontal overlap two pills need before the turn between them is
   drawn as a plain vertical drop. Below this the drop would meet a pill on
   the very edge of its rounded cap, which reads as missing it. */
const MIN_DROP_OVERLAP = 16;

/* How far inside a pill's edge the vertical leg of an elbow sits, so it
   leaves from under the pill's straight body rather than off its cap. */
const CAP_INSET = 12;

/* Air between a turn and each pill it joins (owner, 2026-08-03: "don't have
   the arrows in the chain touch the houses ... the ones that go onto the next
   line touch both the start house and the end house"). They did: a turn ran
   from exactly the bottom edge of one pill to exactly the top edge of the
   next, so both ends were flush against ink.
   The in-row arrows have carried this air all along, about 7px, from GAP
   plus the arrow glyph's own inset; a turn works in a 20px channel rather
   than a 30px slot, so it takes 4px at each end. That leaves 12px of drawn
   line, which is enough for the shaft to read behind its head. */
const TURN_LEAD = 4;

const STROKE = { stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round" as const };

/* Straight arrows are SVG rather than the "→" glyph so they share one stroke
   weight and one cap style with the turning arc. */
function Arrow({ back }: { back: boolean }) {
  return (
    <svg
      width={ARROW_W}
      height="10"
      viewBox={`0 0 ${ARROW_W} 10`}
      fill="none"
      aria-hidden
      className="shrink-0 text-muted-foreground/50"
      style={back ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M1 5 H15" {...STROKE} />
      <path d="M11.5 1.5 L15 5 L11.5 8.5" {...STROKE} strokeLinejoin="round" />
    </svg>
  );
}

/** One pill. Shared by the hidden measuring pass and the real render so the
 *  packed row widths are the truth, not an estimate. */
function Pill({ span }: { span: HouseSpan }) {
  return (
    <>
      <span className="font-heading text-[12.5px] font-bold leading-none">{span.house}</span>
      <span className="text-[10.5px] font-semibold tabular-nums leading-none opacity-75">
        {yearRange(span)}
      </span>
    </>
  );
}

const PILL_CLASS = "inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1";

/** Greedy row packing over the measured pill widths. */
/* ------------------------------------------------------------------ *
 *  LINE BREAKING: minimum raggedness, not greedy packing.
 *
 *  Greedy packing (fill a row until the next pill overflows, then break)
 *  put the owner's nine houses at 4 + 4 + 1: a third row holding one
 *  pill beside acres of nothing. This is a Knuth-Plass style dynamic
 *  program over the measured pill widths that minimises the SUM OF
 *  SQUARED SLACK across every row, and the same nine come out 5 + 4.
 *
 *  Two properties fall out of that one cost expression:
 *   - It prefers fewer rows. Adding a row always adds total slack, and
 *     squaring punishes that harder than it punishes an uneven split of
 *     the rows already there.
 *   - Given a row count, it makes the rows EQUAL, because for a fixed
 *     row count the total slack is fixed and a sum of squares over a
 *     fixed sum is smallest when every term matches.
 *
 *  The LAST row is charged like every other one, which is where this
 *  departs from Knuth-Plass proper. A short last line is how a paragraph
 *  is supposed to end; a chain is not a paragraph, and a short last row
 *  is exactly the "4 + 4 + 1" being fixed.
 *
 *  O(n^2) states over the number of house spans in one career, so a
 *  dozen at the outside.
 * ------------------------------------------------------------------ */
function balanceRows(widths: number[], band: number): number[][] {
  const n = widths.length;
  const prefix = [0];
  for (let i = 0; i < n; i++) prefix.push(prefix[i] + widths[i]);
  /** A row's drawn width: its pills plus one arrow slot per join. */
  const rowW = (from: number, to: number) =>
    prefix[to + 1] - prefix[from] + (to - from) * ARROW_SLOT;

  const cost = new Map<number, number>();
  const nextEnd = new Map<number, number>();
  const key = (from: number, to: number) => from * n + to;

  function solve(from: number, to: number): number {
    const k = key(from, to);
    const memo = cost.get(k);
    if (memo !== undefined) return memo;

    const slack = Math.max(0, band - rowW(from, to));
    let total = slack * slack;

    if (to < n - 1) {
      let best = Infinity;
      let bestEnd = to + 1;
      for (let end = to + 1; end < n; end++) {
        /* A row of two or more pills that does not fit is not a row. A
           single pill wider than the band still has to go somewhere, so
           it is always allowed: that lone-pill continuation is what
           guarantees the search always finds SOME legal packing. */
        if (end > to + 1 && rowW(to + 1, end) > band) break;
        const c = solve(to + 1, end);
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
    const c = solve(0, to);
    if (c < bestCost) {
      bestCost = c;
      bestFirst = to;
    }
  }

  const rows: number[][] = [];
  let from = 0;
  let to = bestFirst;
  for (;;) {
    const row: number[] = [];
    for (let i = from; i <= to; i++) row.push(i);
    rows.push(row);
    if (to >= n - 1) break;
    const end = nextEnd.get(key(from, to)) ?? n - 1;
    from = to + 1;
    to = Math.max(end, from);
  }
  return rows;
}

type Metrics = { widths: number[]; pillH: number; containerW: number };

export function HouseTrail({ spans }: { spans: HouseSpan[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  // Stable key: parents rebuild the spans array every render, so depending on
  // the array itself would re-measure (and re-render) forever.
  const spansKey = spans.map((s) => `${s.house}:${s.fromYear}:${s.toYear}`).join("|");

  useLayoutEffect(() => {
    const host = hostRef.current;
    const meas = measureRef.current;
    if (!host || !meas) return;

    const measure = () => {
      const kids = Array.from(meas.children) as HTMLElement[];
      if (kids.length === 0) return;
      const next: Metrics = {
        widths: kids.map((k) => k.getBoundingClientRect().width),
        pillH: kids[0].getBoundingClientRect().height,
        containerW: host.clientWidth,
      };
      // Returning the previous reference bails out of the re-render when the
      // observer fires without anything actually changing.
      setMetrics((prev) =>
        prev &&
        prev.pillH === next.pillH &&
        prev.containerW === next.containerW &&
        prev.widths.length === next.widths.length &&
        prev.widths.every((w, i) => w === next.widths[i])
          ? prev
          : next
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    // Web fonts change pill widths when they land; re-measure once they have.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [spansKey]);

  if (spans.length === 0) return null;

  /* The hidden measuring strip renders every pill once, invisibly, with the
     exact classes of the real ones. It stays mounted so a resize or font swap
     can re-measure without a layout flash. */
  const measurer = (
    <div
      ref={measureRef}
      aria-hidden
      className="pointer-events-none absolute h-0 overflow-hidden whitespace-nowrap"
      style={{ visibility: "hidden" }}
    >
      {spans.map((span, i) => (
        <span key={i} className={cn(PILL_CLASS, HOUSE_TINTS[i % HOUSE_TINTS.length])}>
          <Pill span={span} />
        </span>
      ))}
    </div>
  );

  const srText = (
    <p className="sr-only">
      Houses over the years: {spans.map((s) => `${s.house} ${yearRange(s)}`).join(", then ")}
    </p>
  );

  if (!metrics) {
    return (
      <div ref={hostRef} className="relative w-full">
        {srText}
        {measurer}
      </div>
    );
  }

  const { widths, pillH, containerW } = metrics;
  const singleW = widths.reduce((a, b) => a + b, 0) + (spans.length - 1) * ARROW_SLOT;

  /* Everything fits on one line: no turns, no gutters, just the snug row. */
  if (singleW <= containerW) {
    return (
      <div ref={hostRef} className="relative w-full">
        {srText}
        {measurer}
        <div aria-hidden className="flex w-fit items-center" style={{ gap: GAP }}>
          {spans.flatMap((span, i) => {
            const cells = [
              <motion.span
                key={`p-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRINGS.gentle, delay: 0.04 * i }}
                className={cn(PILL_CLASS, HOUSE_TINTS[i % HOUSE_TINTS.length])}
              >
                <Pill span={span} />
              </motion.span>,
            ];
            if (i < spans.length - 1) cells.push(<Arrow key={`a-${i}`} back={false} />);
            return cells;
          })}
        </div>
      </div>
    );
  }

  /* Serpentine, with EVERY ROW FLUSH LEFT (owner, 2026-08-03).
     The chain used to right-align its backward rows against a 30px arc
     gutter, so at the widest sheet the second row started ~58px in from the
     first: "you see that the second row is not left aligned ... force the
     second row to be left aligned". Now every row starts at x = 0 and only
     its READING DIRECTION alternates, which is the boustrophedon the owner
     already accepted. The gutters go with the right-alignment they existed
     to serve, so the block also stops reserving 30-60px it no longer draws
     into. */
  const rowsIdx = balanceRows(widths, Math.max(containerW, 120));
  const rowWs = rowsIdx.map(
    (row) => row.reduce((a, i) => a + widths[i], 0) + (row.length - 1) * ARROW_SLOT
  );
  const totalH = rowsIdx.length * pillH + (rowsIdx.length - 1) * ROW_GAP;

  /* The turn. ONE 90 degree bend at most (owner, 2026-08-03: "the arrow
     connecting the second line is not good, I wanted just one 90 degree curve
     max"). The S-curve it replaces had two bends by definition, and on a wide
     sheet it swept a long way sideways to do it.

     A turn joins the last pill of row r to the first pill of row r+1. Those
     two are always on the SAME side of the block: a forward row draws its
     last span rightmost, and the backward row under it draws its first span
     rightmost too, because it reads the other way. So there are exactly two
     cases, decided by whether the pair overlaps horizontally:

       OVERLAP (the common case, and what minimum-raggedness rows mostly give
       you): a plain vertical drop through the shared column, arrowhead down
       into the pill's top. Zero bends.

       NO OVERLAP: one rounded quarter bend. The leg leaves the bottom of
       pill a just inside its facing edge, drops to the vertical middle of row
       r+1, turns once, and runs horizontally into the SIDE of pill b, so the
       arrowhead points along the row the way the in-row arrows do. The
       vertical leg is deliberately placed inside a and outside b, so it can
       never cut through either pill on its way past. */
  const turns = rowsIdx.slice(0, -1).map((row, r) => {
    const next = rowsIdx[r + 1];
    const backwards = r % 2 === 1;
    // Rows alternate, so the row BELOW always reads the other way. Both pills
    // still end up on the same side of the block, but each one's drawn extent
    // has to come from its OWN row's direction.
    const nextBackwards = !backwards;
    const lastW = widths[row[row.length - 1]];
    const firstW = widths[next[0]];
    /* Drawn extents of the two pills the turn joins. A row draws its spans in
       chronological order when forward and reversed when backward, so row r's
       LAST span is rightmost when forward and leftmost when backward, and row
       r+1's FIRST span is leftmost when forward and rightmost when backward. */
    const aL = backwards ? 0 : rowWs[r] - lastW;
    const aR = backwards ? lastW : rowWs[r];
    const bL = nextBackwards ? rowWs[r + 1] - firstW : 0;
    const bR = nextBackwards ? rowWs[r + 1] : firstW;

    // Both ends stand off by TURN_LEAD so no turn ever touches a pill.
    const y1 = r * (pillH + ROW_GAP) + pillH + TURN_LEAD; // below row r
    const y2 = (r + 1) * (pillH + ROW_GAP) - TURN_LEAD; // above row r+1
    const yc = (r + 1) * (pillH + ROW_GAP) + pillH / 2; // middle of row r+1

    const lo = Math.max(aL, bL);
    const hi = Math.min(aR, bR);
    if (hi - lo >= MIN_DROP_OVERLAP) {
      const x = (lo + hi) / 2;
      return {
        key: `turn-${r}`,
        d: `M ${x} ${y1} L ${x} ${y2}`,
        head: `M ${x - 3.5} ${y2 - 4.5} L ${x} ${y2} L ${x + 3.5} ${y2 - 4.5}`,
      };
    }

    // b sits clear of a: -1 means it is further left, +1 further right.
    const dir = bR <= aL ? -1 : 1;
    // The vertical leg goes just inside a's edge that FACES b.
    const vx = dir < 0 ? aL + CAP_INSET : aR - CAP_INSET;
    // Stop short of b's facing side by the same lead, on whichever side the
    // approach is coming from.
    const tx = (dir < 0 ? bR : bL) - dir * TURN_LEAD;
    // Sweep 1 turns clockwise on screen (leftward), 0 counter-clockwise.
    const sweep = dir < 0 ? 1 : 0;
    return {
      key: `turn-${r}`,
      d: `M ${vx} ${y1} L ${vx} ${yc - TURN_R} A ${TURN_R} ${TURN_R} 0 0 ${sweep} ${vx + dir * TURN_R} ${yc} L ${tx} ${yc}`,
      head: `M ${tx - dir * 4.5} ${yc - 3.5} L ${tx} ${yc} L ${tx - dir * 4.5} ${yc + 3.5}`,
    };
  });

  return (
    <div ref={hostRef} className="relative w-full">
      {srText}
      {measurer}
      <div aria-hidden className="relative" style={{ height: totalH }}>
        {rowsIdx.map((row, r) => {
          const backwards = r % 2 === 1;
          const ordered = backwards ? [...row].reverse() : row;
          return (
            <div
              key={r}
              // Always justify-start, always left: 0. Only `ordered` below
              // knows about direction now.
              className="absolute flex items-center justify-start"
              style={{
                gap: GAP,
                top: r * (pillH + ROW_GAP),
                left: 0,
                right: 0,
                height: pillH,
              }}
            >
              {ordered.flatMap((spanIdx, pos) => {
                const span = spans[spanIdx];
                const cells = [
                  <motion.span
                    key={`p-${spanIdx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRINGS.gentle, delay: 0.04 * spanIdx }}
                    className={cn(PILL_CLASS, HOUSE_TINTS[spanIdx % HOUSE_TINTS.length])}
                  >
                    <Pill span={span} />
                  </motion.span>,
                ];
                if (pos < ordered.length - 1) {
                  cells.push(<Arrow key={`a-${spanIdx}`} back={backwards} />);
                }
                return cells;
              })}
            </div>
          );
        })}

        {/* The turns, one per row junction, drawn over the whole band in real
            pixel coordinates so each one meets its rows exactly. */}
        <svg
          className="pointer-events-none absolute inset-0 text-muted-foreground/50"
          width={containerW}
          height={totalH}
          viewBox={`0 0 ${containerW} ${totalH}`}
          fill="none"
          aria-hidden
        >
          {turns.map((turn, i) => (
            <motion.g
              key={turn.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 + 0.08 * i }}
            >
              <path d={turn.d} {...STROKE} />
              <path d={turn.head} {...STROKE} strokeLinejoin="round" />
            </motion.g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/** The shipped profile's entry point: parse the raw `houses` JSON, then draw. */
export function HousesChain({ houses }: { houses: string | null | undefined }) {
  return <HouseTrail spans={parseHouseSpans(houses)} />;
}
