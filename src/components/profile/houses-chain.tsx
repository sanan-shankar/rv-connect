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

/**
 * What the chain draws. A house span, or the one empty pill the EDITOR keeps
 * at the end of the chain (owner, 2026-08-07: "I just want a pill, maybe it's
 * a grey, for when it's not selected ... the next pill will be created only
 * when you select the answer for this pill").
 *
 * The pending pill is a real item, not an extra element bolted on after the
 * fact. That is the whole trick: it goes through the same measuring pass and
 * the same row packing as a house, so a turn lands on it exactly the way a
 * turn lands on a house, and the chain never has to know it is being edited.
 */
type ChainItem =
  /** `tint` is the SPAN's own index, not the item's. The pending pill can sit
   *  anywhere in the line, and if the tints were counted off item positions
   *  every house after it would change colour the moment it moved. */
  | { kind: "span"; span: HouseSpan; tint: number }
  | { kind: "pending"; label: string };

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

/** One pill's contents. Shared by the hidden measuring pass and the real
 *  render so the packed row widths are the truth, not an estimate. */
function Pill({ item }: { item: ChainItem }) {
  if (item.kind === "pending") {
    /* The year sits in the slot the house NAME will take, not in the small
       year slot beside it. So answering the pill does not move anything: the
       year slides down into its subordinate size and the house name takes the
       place it was holding. */
    return <span className="font-heading text-[12.5px] font-bold leading-none">{item.label}</span>;
  }
  return (
    <>
      <span className="font-heading text-[12.5px] font-bold leading-none">{item.span.house}</span>
      <span className="text-[10.5px] font-semibold tabular-nums leading-none opacity-75">
        {yearRange(item.span)}
      </span>
    </>
  );
}

const PILL_CLASS = "inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1";

/* The one dashed outline in the chain, because it is the one pill that is not
   a fact yet. Grey and unfilled, so a finished chain has no grey left in it
   and "am I done" is answered by looking rather than by counting. */
const PENDING_TINT =
  "border-dashed border-muted-foreground/40 bg-foreground/[0.025] text-muted-foreground";

/* Editor-only. Lives apart from PILL_CLASS because the profile's chain is not
   pressable and must not grow a pointer cursor or a press. `state-layer` is a
   background-IMAGE, so it tints over each pill's own fill instead of replacing
   it, and one class lands at the same weight on all three house tints and on
   the dashed add pill. The border does not change on hover: the owner's rule
   is that hovering never moves or re-weights a control.

   The press is framer's own `whileTap`, not `active:scale-[0.97]`: every pill
   is a motion element, framer writes `transform` inline, and an inline
   transform beats a utility class every time. A Tailwind press on these would
   simply never fire. */
const PILL_PRESS =
  "state-layer cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/* The pill whose panel is open. A ring, not a fill swap: the pill still has to
   read as the house it names while you are changing it. */
const PILL_OPEN = "ring-2 ring-canopy/40";

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

    /* A row holding ONE pill anywhere but at the end is charged the whole
       band on top of its slack. Slack alone rates it as merely wasteful, and
       it is worse than that: the pill below it starts a row that can be far
       wider, so the turn leaving the lone pill has to cross most of the band
       and arrives at its target from the inside, where that target's own
       in-row arrow already is. That is the tangle in the owner's 2026-08-04
       screenshot (Alamanda alone, then Jacaranda and Duranta beneath it).
       A lone pill as the LAST row is fine and stays uncharged: a turn INTO
       one arrives at a pill with no in-row neighbour to collide with. */
    if (to === from && to < n - 1) total += band * band;

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

export function HouseTrail({
  spans,
  onSpanClick,
  pending,
  openIndices,
}: {
  spans: HouseSpan[];
  /** Makes every house pill a button. Omitted (the profile) = read only.
   *  The index is the SPAN's, counted off the `spans` array the caller passed
   *  in, NOT the pill's position in the drawn line. The two are different the
   *  moment a grey pill sits earlier in the chain, and handing back the drawn
   *  position meant `spans[i]` was the wrong span, or undefined: tapping a
   *  house with an unanswered year before it did nothing at all. */
  onSpanClick?: (spanIndex: number) => void;
  /** The one empty pill. Omitted = nothing left to answer. `at` places it in
   *  the line; leave it off and it goes on the end. */
  pending?: { label: string; onClick: () => void; open?: boolean; at?: number };
  /** SPAN indices the open panel covers, drawn with a ring. Plural, because a
   *  year holding two houses is two pills and the panel edits both. */
  openIndices?: number[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const items: ChainItem[] = spans.map((span, i): ChainItem => ({ kind: "span", span, tint: i }));
  if (pending) {
    /* Chronological, not just last. Clear a year in the middle of a finished
       chain and the empty pill has to reappear where that year belongs, or
       the line stops reading left to right. */
    const at = Math.max(0, Math.min(pending.at ?? items.length, items.length));
    items.splice(at, 0, { kind: "pending", label: pending.label });
  }
  const editing = Boolean(onSpanClick || pending);

  // Stable key: parents rebuild the spans array every render, so depending on
  // the array itself would re-measure (and re-render) forever.
  const spansKey = items
    .map((it) =>
      it.kind === "pending"
        ? `?${it.label}`
        : `${it.span.house}:${it.span.fromYear}:${it.span.toYear}`
    )
    .join("|");

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

  if (items.length === 0) return null;

  const tintFor = (item: ChainItem) =>
    item.kind === "pending" ? PENDING_TINT : HOUSE_TINTS[item.tint % HOUSE_TINTS.length];

  /** One pill, in whichever of the three forms it needs: a plain span on the
   *  profile, a button on a house you can change, the empty pill at the end. */
  function renderPill(idx: number) {
    const item = items[idx];
    /* The key stays out of this object and is written on each element by
       hand: React refuses to read a `key` that arrives through a spread.
       Read-only, a pill rises into place. In the editor it POPS, because
       there the entrance is answering a tap you just made and the moment
       worth drawing is the empty pill taking its colour. */
    const shared = editing
      ? {
          initial: { opacity: 0, scale: 0.82 },
          animate: { opacity: 1, scale: 1 },
          transition: SPRINGS.snappy,
        }
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { ...SPRINGS.gentle, delay: 0.04 * idx },
        };
    if (item.kind === "pending") {
      return (
        <motion.button
          key="p-pending"
          {...shared}
          type="button"
          onClick={() => pending?.onClick()}
          aria-label={`Pick a house for ${item.label}`}
          whileTap={{ scale: 0.97 }}
          className={cn(
            PILL_CLASS,
            tintFor(item),
            PILL_PRESS,
            pending?.open && "border-solid border-canopy/50 text-canopy"
          )}
        >
          <Pill item={item} />
        </motion.button>
      );
    }
    if (onSpanClick) {
      return (
        <motion.button
          key={`p-${idx}`}
          {...shared}
          type="button"
          onClick={() => onSpanClick(item.tint)}
          whileTap={{ scale: 0.97 }}
          aria-label={`${item.span.house}, ${yearRange(item.span)}. Change this.`}
          className={cn(
            PILL_CLASS,
            tintFor(item),
            PILL_PRESS,
            openIndices?.includes(item.tint) && PILL_OPEN
          )}
        >
          <Pill item={item} />
        </motion.button>
      );
    }
    return (
      <motion.span key={`p-${idx}`} {...shared} className={cn(PILL_CLASS, tintFor(item))}>
        <Pill item={item} />
      </motion.span>
    );
  }

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
      {items.map((item, i) => (
        <span key={i} className={cn(PILL_CLASS, tintFor(item))}>
          <Pill item={item} />
        </span>
      ))}
    </div>
  );

  /* Read-only, the chain is one aria-hidden picture with this sentence behind
     it. As an editor it is a row of real buttons, which a screen reader has to
     be able to reach, so the picture stops being hidden and the sentence would
     only repeat what the buttons already say. */
  const srText = editing ? null : (
    <p className="sr-only">
      Houses over the years: {spans.map((s) => `${s.house} ${yearRange(s)}`).join(", then ")}
    </p>
  );

  /* Not measured yet, OR measured against a different chain. The second case
     is the crash: metrics are written in a layout effect, so on the render
     where a house is removed `widths` still describes the longer chain, and
     the row packing hands back indices past the end of `items`, which is the
     "undefined is not an object evaluating item.kind" the owner hit. Stale
     metrics are no metrics. The effect below re-measures before paint, so
     this costs a frame nobody sees, not a flash. */
  if (!metrics || metrics.widths.length !== items.length) {
    return (
      <div ref={hostRef} className="relative w-full">
        {srText}
        {measurer}
      </div>
    );
  }

  const { widths, pillH, containerW } = metrics;
  const singleW = widths.reduce((a, b) => a + b, 0) + (items.length - 1) * ARROW_SLOT;

  /* Everything fits on one line: no turns, no gutters, just the snug row. */
  if (singleW <= containerW) {
    return (
      <div ref={hostRef} className="relative w-full">
        {srText}
        {measurer}
        <div aria-hidden={!editing} className="flex w-fit items-center" style={{ gap: GAP }}>
          {items.flatMap((_, i) => {
            const cells = [renderPill(i)];
            if (i < items.length - 1) cells.push(<Arrow key={`a-${i}`} back={false} />);
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

       NO OVERLAP: one rounded quarter bend. There are two ways to spend that
       one bend, and which is correct depends on where b sits.

         REACHING OUTWARD (b's middle lies past a's outer edge): leave a's
         OUTER SIDE horizontally at row r's middle, run outward, bend once,
         and drop into the TOP of b. Nothing of row r exists past a's outer
         edge and nothing sits above b, so this route is clean by
         construction.

         Otherwise: leave the bottom of a just inside its facing edge, drop
         to the vertical middle of row r+1, bend once, and run horizontally
         into the SIDE of b, so the arrowhead points along the row the way
         the in-row arrows do.

       The outward route exists because the second one has a failure the
       owner photographed (2026-08-04): b is the FIRST pill of its row, so
       its in-row arrow to the next house sits against its inner side, and
       arriving on that same side puts two arrowheads in one 30px gap
       pointing at each other. Arriving from above cannot collide with an
       in-row arrow at all. */
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

    /* Which way the turn travels. Taken from the two pills' MIDDLES, never
       from their edges: row r's inner edge and row r+1's outer edge land on
       the same x often enough (three houses over two, in the owner's
       2026-08-04 profile, where both sat at 280) that an edge test decides on
       a rounding hair. It picked "rightward" for a turn that then had to run
       232px left, so the bend curled one way and the line doubled straight
       back through it. Middles cannot tie like that. */
    const dir = (bL + bR) / 2 < (aL + aR) / 2 ? -1 : 1;

    /* Which side of b the run would arrive on, and which side of b is free.
       b is the FIRST pill of its row, so it is drawn at one END of that row
       and its in-row arrow to the next house sits against its INNER side. A
       run that arrives there puts two arrowheads in one 30px gap pointing at
       each other, which is the doubled arrow in the owner's screenshot. */
    const arrivesLeftOfB = dir > 0;
    const innerSideIsLeft = nextBackwards;
    const sideEntryIsSafe = arrivesLeftOfB !== innerSideIsLeft;

    if (!sideEntryIsSafe) {
      /* Come down onto b's TOP instead, which no in-row arrow can occupy.
         One bend still: leave a's OUTER side horizontally at row r's middle
         (past that edge, row r is empty), run outward, bend, drop into b.
         The descent lands on the part of b's body nearest a that still
         leaves room for the bend, so the horizontal run is as short as the
         geometry allows. */
      const out = backwards ? -1 : 1;
      const aOuter = backwards ? aL : aR;
      const limit = aOuter + out * (TURN_R + TURN_LEAD);
      const bodyL = bL + CAP_INSET;
      const bodyR = bR - CAP_INSET;
      const bx = out > 0 ? Math.max(bodyL, limit) : Math.min(bodyR, limit);
      if (out > 0 ? bx <= bodyR : bx >= bodyL) {
        const ya = r * (pillH + ROW_GAP) + pillH / 2; // middle of row r
        // Rightward-then-down is the clockwise quarter turn on screen;
        // leftward-then-down is the counter-clockwise one.
        const sweep = out > 0 ? 1 : 0;
        return {
          key: `turn-${r}`,
          d: `M ${aOuter + out * TURN_LEAD} ${ya} L ${bx - out * TURN_R} ${ya} A ${TURN_R} ${TURN_R} 0 0 ${sweep} ${bx} ${ya + TURN_R} L ${bx} ${y2}`,
          head: `M ${bx - 3.5} ${y2 - 4.5} L ${bx} ${y2} L ${bx + 3.5} ${y2 - 4.5}`,
        };
      }
      // b is too narrow, or too close to a, to be entered from above. Fall
      // through: a crowded arrowhead beats no arrow at all.
    }

    /* Stop short of b's near side by the same lead the drop uses. */
    const tx = (dir < 0 ? bR : bL) - dir * TURN_LEAD;
    /* The vertical leg drops from under a, CAP_INSET inside its body so it
       leaves from the straight part rather than off a rounded cap. Normally
       that is a's side FACING b, which keeps the run short. When the two
       pills very nearly abut, though, that side leaves less run than the bend
       itself needs (8px against a 10px radius, in the owner's 2026-08-04
       profile) and the arc overshoots its own target, so fall back to a's far
       side and let the run cross beneath a. A pill narrower than two insets
       collapses both choices to its middle rather than inverting them. */
    const inset = Math.min(CAP_INSET, (aR - aL) / 2);
    const near = dir < 0 ? aL + inset : aR - inset;
    const far = dir < 0 ? aR - inset : aL + inset;
    const vx = Math.abs(tx - near) >= TURN_R ? near : far;
    // Never bend through more than the run actually has room for.
    const rr = Math.min(TURN_R, Math.abs(tx - vx));
    // Sweep 1 turns clockwise on screen (leftward), 0 counter-clockwise.
    const sweep = dir < 0 ? 1 : 0;
    return {
      key: `turn-${r}`,
      d: `M ${vx} ${y1} L ${vx} ${yc - rr} A ${rr} ${rr} 0 0 ${sweep} ${vx + dir * rr} ${yc} L ${tx} ${yc}`,
      head: `M ${tx - dir * 4.5} ${yc - 3.5} L ${tx} ${yc} L ${tx - dir * 4.5} ${yc + 3.5}`,
    };
  });

  return (
    <div ref={hostRef} className="relative w-full">
      {srText}
      {measurer}
      <div aria-hidden={!editing} className="relative" style={{ height: totalH }}>
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
              {ordered.flatMap((itemIdx, pos) => {
                const cells = [renderPill(itemIdx)];
                if (pos < ordered.length - 1) {
                  cells.push(<Arrow key={`a-${itemIdx}`} back={backwards} />);
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
