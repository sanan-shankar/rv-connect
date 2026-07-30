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
const GUTTER = 30;
const ARC_RX = 14;
const LEAD = 6; // air between a pill's edge and the line entering/leaving it
const ROW_GAP = 14;

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
function packRows(widths: number[], maxW: number): number[][] {
  const rows: number[][] = [];
  let cur: number[] = [];
  let curW = 0;
  widths.forEach((w, i) => {
    const add = cur.length === 0 ? w : ARROW_SLOT + w;
    if (cur.length > 0 && curW + add > maxW) {
      rows.push(cur);
      cur = [i];
      curW = w;
    } else {
      cur.push(i);
      curW += add;
    }
  });
  if (cur.length > 0) rows.push(cur);
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

  /* Serpentine. Rows are packed into the band beside the arc gutters; forward
     rows hug the band's left edge, backward rows hug its right, and the arcs
     live in the gutters. The LEFT gutter exists only when a left-side turn
     will actually be drawn (three or more rows): at two rows the pills stay
     flush on the container's left edge, on the same line as everything above
     them. Packing and gutter-need depend on each other, so pack optimistically
     first and fall back to the narrower band if a third row appears. */
  let leftInset = 0;
  let rowsIdx = packRows(widths, Math.max(containerW - GUTTER, 120));
  if (rowsIdx.length > 2) {
    leftInset = GUTTER;
    rowsIdx = packRows(widths, Math.max(containerW - 2 * GUTTER, 120));
  }
  const rowWs = rowsIdx.map(
    (row) => row.reduce((a, i) => a + widths[i], 0) + (row.length - 1) * ARROW_SLOT
  );
  const totalH = rowsIdx.length * pillH + (rowsIdx.length - 1) * ROW_GAP;
  const centerY = (r: number) => r * (pillH + ROW_GAP) + pillH / 2;

  const arcs = rowsIdx.slice(0, -1).map((_, r) => {
    const backwards = r % 2 === 1;
    const y1 = centerY(r);
    const y2 = centerY(r + 1);
    const ry = (y2 - y1) / 2;
    if (!backwards) {
      // Right-side turn: leave the end of row r, swing through the right
      // gutter, come back pointing left at row r+1's first (rightmost) pill.
      const startX = leftInset + rowWs[r] + LEAD;
      const bulgeX = containerW - ARC_RX - 1;
      const endX = containerW - GUTTER + LEAD - 1;
      return {
        key: `arc-${r}`,
        d: `M ${startX} ${y1} H ${bulgeX} A ${ARC_RX} ${ry} 0 0 1 ${bulgeX} ${y2} H ${endX}`,
        head: `M ${endX + 4.5} ${y2 - 3.5} L ${endX} ${y2} L ${endX + 4.5} ${y2 + 3.5}`,
      };
    }
    // Left-side turn, mirrored: row r is right-aligned so its last pill sits
    // leftmost; the arc leaves it leftward and returns pointing right at row
    // r+1's first (leftmost) pill.
    const startX = containerW - GUTTER - rowWs[r] - LEAD;
    const bulgeX = ARC_RX + 1;
    const endX = leftInset - LEAD + 1;
    return {
      key: `arc-${r}`,
      d: `M ${startX} ${y1} H ${bulgeX} A ${ARC_RX} ${ry} 0 0 0 ${bulgeX} ${y2} H ${endX}`,
      head: `M ${endX - 4.5} ${y2 - 3.5} L ${endX} ${y2} L ${endX - 4.5} ${y2 + 3.5}`,
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
              className={cn("absolute flex items-center", backwards ? "justify-end" : "justify-start")}
              style={{
                gap: GAP,
                top: r * (pillH + ROW_GAP),
                left: leftInset,
                right: GUTTER,
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

        {/* The turning arcs, one per row junction, drawn over the whole band
            in real pixel coordinates so each one meets its rows exactly. */}
        <svg
          className="pointer-events-none absolute inset-0 text-muted-foreground/50"
          width={containerW}
          height={totalH}
          viewBox={`0 0 ${containerW} ${totalH}`}
          fill="none"
          aria-hidden
        >
          {arcs.map((arc, i) => (
            <motion.g
              key={arc.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 + 0.08 * i }}
            >
              <path d={arc.d} {...STROKE} />
              <path d={arc.head} {...STROKE} strokeLinejoin="round" />
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
