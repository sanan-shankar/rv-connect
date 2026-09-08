"use client";

/* ------------------------------------------------------------------ *
 *  The colour handoff.
 *
 *  The house chain's arrows became connecting lines that carry one
 *  pill's colour into the next (owner, 2026-08-19). The first pass is
 *  on the profile and the owner's read was "janky, a bit amateurish":
 *  a full-ink hairline is the most saturated thing in a block of soft
 *  washes, and 30px is too short for a gradient to read as a choice.
 *
 *  This room draws the SAME shipped geometry (packing, serpentine,
 *  turns, all copied from src/components/profile/houses-chain.tsx)
 *  six different ways, so the pick is about the line and only the
 *  line. Pills, spacing and turns stay exactly where they ship.
 * ------------------------------------------------------------------ */

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { type HouseSpan } from "@/lib/house-spans";
import { LabShell, Mount, Rule, Verdict } from "../_second-look-kit";
import {
  ARROW_SLOT,
  CHAIN_FIXTURES,
  HOUSE_TINTS,
  PILL_CLASS,
  Pill,
  ChainScreenReaderText,
  useChainMetrics,
} from "../profiles/_chain-kit";

/* ================================================================== *
 *  The six treatments.
 * ================================================================== */

type Variant = {
  key: string;
  label: string;
  note: string;
  /** stroke width in px */
  stroke: number;
  opacity: number;
  cap: "butt" | "round";
  dash?: string;
  /** how far the line dips mid-slot, 0 = straight */
  sag?: number;
  /** how the colour crosses the gap */
  color: "blend" | "split" | "grey";
  /** a dot where the two inks meet (split only) */
  bead?: boolean;
  /** lift the pill borders to carry the colour instead of the line */
  strongRings?: boolean;
  /** extend the line ends under the pills by this many px */
  tuck?: number;
};

const VARIANTS: Variant[] = [
  {
    key: "thread",
    label: "Thread",
    note: "Picked and shipped 2026-08-19. Sits at the pill borders' weight, and each ink holds pure for a third of the line before it blends.",
    stroke: 1.75,
    opacity: 0.6,
    cap: "butt",
    color: "blend",
  },
  {
    key: "garland",
    label: "Garland",
    note: "Same colours, but the line sags a few px between pills, like thread pinned at both ends.",
    stroke: 1.75,
    opacity: 0.6,
    cap: "butt",
    sag: 3.5,
    color: "blend",
  },
  {
    key: "baton",
    label: "Baton",
    note: "No gradient at all. Half the line in each house's ink, meeting at a small bead in the mixed colour.",
    stroke: 1.75,
    opacity: 0.75,
    cap: "butt",
    color: "split",
    bead: true,
  },
  {
    key: "stitch",
    label: "Stitch",
    note: "Round dots instead of a solid line, still blending, like the chain is sewn onto the sheet.",
    stroke: 2,
    opacity: 0.7,
    cap: "round",
    dash: "0.1 5",
    color: "blend",
  },
  {
    key: "rings",
    label: "Rings",
    note: "The colour moves to the pill outlines, doubled in strength. The line goes back to a quiet grey and only joins.",
    stroke: 1.25,
    opacity: 0.45,
    cap: "butt",
    color: "grey",
    strongRings: true,
  },
  {
    key: "wash",
    label: "Wash",
    note: "A wide soft band at low opacity that slides under the pill edges, like a route drawn in highlighter.",
    stroke: 5,
    opacity: 0.28,
    cap: "round",
    color: "blend",
    tuck: 3,
  },
];

/* Rings variant: the same three hues, borders roughly doubled so the ring is
   the colour statement. Fills and inks untouched, so the pills stay the pills
   the owner approved. */
const RING_TINTS = [
  "border-leaf/60 bg-leaf/[0.07] text-leaf",
  "border-cinnamon/60 bg-cinnamon/[0.07] text-cinnamon",
  "border-sky/70 bg-sky/[0.10] text-sky",
];

const LINE_INK = ["var(--leaf)", "var(--cinnamon)", "var(--sky)"];
const GREY_INK = "var(--muted-foreground)";

/** Gradient stops for one line. "blend" holds each ink pure for the first and
 *  last 30% and mixes only through the middle, in OKLab so the middle relaxes
 *  toward neutral instead of finding mud or magenta. "split" is a hard 50/50
 *  handoff with no mixing at all. */
function stops(mode: "blend" | "split", from: string, to: string) {
  if (mode === "split") {
    return [
      <stop key="a0" offset="0%" stopColor={from} />,
      <stop key="a1" offset="50%" stopColor={from} />,
      <stop key="b0" offset="50%" stopColor={to} />,
      <stop key="b1" offset="100%" stopColor={to} />,
    ];
  }
  return [
    <stop key="0" offset="0%" stopColor={from} />,
    <stop key="30" offset="30%" stopColor={from} />,
    <stop key="50" offset="50%" stopColor={`color-mix(in oklab, ${from} 50%, ${to})`} />,
    <stop key="70" offset="70%" stopColor={to} />,
    <stop key="100" offset="100%" stopColor={to} />,
  ];
}

/* ================================================================== *
 *  The in-row line, one per join, spanning the whole 30px slot.
 * ================================================================== */

const LINE_H = 22;

function Line({ v, from, to }: { v: Variant; from: string; to: string }) {
  const id = useId();
  const c = LINE_H / 2;
  const t = v.tuck ?? 0;
  const x0 = -t;
  const x1 = ARROW_SLOT + t;
  const d = v.sag
    ? `M ${x0} ${c} Q ${ARROW_SLOT / 2} ${c + 2 * v.sag} ${x1} ${c}`
    : `M ${x0} ${c} H ${x1}`;
  const stroke = v.color === "grey" ? GREY_INK : `url(#${id})`;
  return (
    <svg
      width={ARROW_SLOT}
      height={LINE_H}
      viewBox={`0 0 ${ARROW_SLOT} ${LINE_H}`}
      fill="none"
      aria-hidden
      className="shrink-0 overflow-visible"
    >
      {v.color !== "grey" && (
        <defs>
          {/* userSpaceOnUse: a horizontal line has a zero-height bounding
              box and a bounding-box gradient on it renders nothing. */}
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x0} y1={c} x2={x1} y2={c}>
            {stops(v.color, from, to)}
          </linearGradient>
        </defs>
      )}
      <path
        d={d}
        stroke={stroke}
        strokeWidth={v.stroke}
        strokeOpacity={v.opacity}
        strokeLinecap={v.cap}
        strokeDasharray={v.dash}
      />
      {v.bead && (
        <circle
          cx={ARROW_SLOT / 2}
          cy={c}
          r={2}
          fill={`color-mix(in oklab, ${from} 50%, ${to})`}
          fillOpacity={0.9}
        />
      )}
    </svg>
  );
}

/* ================================================================== *
 *  The chain, copied from the shipped component and stripped to read
 *  only: same packing, same serpentine, same turns, drawing swapped.
 * ================================================================== */

const ROW_GAP = 20;
const TURN_R = 10;
const MIN_DROP_OVERLAP = 16;
const CAP_INSET = 12;

function balanceRows(widths: number[], band: number): number[][] {
  const n = widths.length;
  const prefix = [0];
  for (let i = 0; i < n; i++) prefix.push(prefix[i] + widths[i]);
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
    if (to === from && to < n - 1) total += band * band;
    if (to < n - 1) {
      let best = Infinity;
      let bestEnd = to + 1;
      for (let end = to + 1; end < n; end++) {
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

function LabChain({ spans, v }: { spans: HouseSpan[]; v: Variant }) {
  const { hostRef, measurer, metrics } = useChainMetrics(spans);
  const gradId = useId();
  const tints = v.strongRings ? RING_TINTS : HOUSE_TINTS;
  const ink = (i: number) => LINE_INK[i % LINE_INK.length];

  const pill = (i: number) => (
    <span key={`p-${i}`} className={cn(PILL_CLASS, tints[i % tints.length])}>
      <Pill span={spans[i]} />
    </span>
  );

  if (!metrics || metrics.widths.length !== spans.length) {
    return (
      <div ref={hostRef} className="relative w-full">
        <ChainScreenReaderText spans={spans} />
        {measurer}
      </div>
    );
  }

  const { widths, pillH, containerW } = metrics;
  const singleW = widths.reduce((a, b) => a + b, 0) + (spans.length - 1) * ARROW_SLOT;

  if (singleW <= containerW) {
    return (
      <div ref={hostRef} className="relative w-full">
        <ChainScreenReaderText spans={spans} />
        {measurer}
        <div aria-hidden className="flex w-fit items-center">
          {spans.flatMap((_, i) => {
            const cells = [pill(i)];
            if (i < spans.length - 1)
              cells.push(<Line key={`l-${i}`} v={v} from={ink(i)} to={ink(i + 1)} />);
            return cells;
          })}
        </div>
      </div>
    );
  }

  const rowsIdx = balanceRows(widths, Math.max(containerW, 120));
  const rowWs = rowsIdx.map(
    (row) => row.reduce((a, i) => a + widths[i], 0) + (row.length - 1) * ARROW_SLOT
  );
  const totalH = rowsIdx.length * pillH + (rowsIdx.length - 1) * ROW_GAP;

  const turns = rowsIdx.slice(0, -1).map((row, r) => {
    const next = rowsIdx[r + 1];
    const aInk = ink(row[row.length - 1]);
    const bInk = ink(next[0]);
    const backwards = r % 2 === 1;
    const nextBackwards = !backwards;
    const lastW = widths[row[row.length - 1]];
    const firstW = widths[next[0]];
    const aL = backwards ? 0 : rowWs[r] - lastW;
    const aR = backwards ? lastW : rowWs[r];
    const bL = nextBackwards ? rowWs[r + 1] - firstW : 0;
    const bR = nextBackwards ? rowWs[r + 1] : firstW;

    const y1 = r * (pillH + ROW_GAP) + pillH;
    const y2 = (r + 1) * (pillH + ROW_GAP);
    const yc = (r + 1) * (pillH + ROW_GAP) + pillH / 2;

    const lo = Math.max(aL, bL);
    const hi = Math.min(aR, bR);
    if (hi - lo >= MIN_DROP_OVERLAP) {
      const x = (lo + hi) / 2;
      return { key: `turn-${r}`, d: `M ${x} ${y1} L ${x} ${y2}`, x1: x, y1, x2: x, y2, from: aInk, to: bInk };
    }

    const dir = (bL + bR) / 2 < (aL + aR) / 2 ? -1 : 1;
    const arrivesLeftOfB = dir > 0;
    const innerSideIsLeft = nextBackwards;
    const sideEntryIsSafe = arrivesLeftOfB !== innerSideIsLeft;

    if (!sideEntryIsSafe) {
      const out = backwards ? -1 : 1;
      const aOuter = backwards ? aL : aR;
      const limit = aOuter + out * TURN_R;
      const bodyL = bL + CAP_INSET;
      const bodyR = bR - CAP_INSET;
      const bx = out > 0 ? Math.max(bodyL, limit) : Math.min(bodyR, limit);
      if (out > 0 ? bx <= bodyR : bx >= bodyL) {
        const ya = r * (pillH + ROW_GAP) + pillH / 2;
        const sweep = out > 0 ? 1 : 0;
        return {
          key: `turn-${r}`,
          d: `M ${aOuter} ${ya} L ${bx - out * TURN_R} ${ya} A ${TURN_R} ${TURN_R} 0 0 ${sweep} ${bx} ${ya + TURN_R} L ${bx} ${y2}`,
          x1: aOuter,
          y1: ya,
          x2: bx,
          y2,
          from: aInk,
          to: bInk,
        };
      }
    }

    const tx = dir < 0 ? bR : bL;
    const inset = Math.min(CAP_INSET, (aR - aL) / 2);
    const near = dir < 0 ? aL + inset : aR - inset;
    const far = dir < 0 ? aR - inset : aL + inset;
    const vx = Math.abs(tx - near) >= TURN_R ? near : far;
    const rr = Math.min(TURN_R, Math.abs(tx - vx));
    const sweep = dir < 0 ? 1 : 0;
    return {
      key: `turn-${r}`,
      d: `M ${vx} ${y1} L ${vx} ${yc - rr} A ${rr} ${rr} 0 0 ${sweep} ${vx + dir * rr} ${yc} L ${tx} ${yc}`,
      x1: vx,
      y1,
      x2: tx,
      y2: yc,
      from: aInk,
      to: bInk,
    };
  });

  return (
    <div ref={hostRef} className="relative w-full">
      <ChainScreenReaderText spans={spans} />
      {measurer}
      <div aria-hidden className="relative" style={{ height: totalH }}>
        {rowsIdx.map((row, r) => {
          const backwards = r % 2 === 1;
          const ordered = backwards ? [...row].reverse() : row;
          return (
            <div
              key={r}
              className="absolute flex items-center justify-start"
              style={{ top: r * (pillH + ROW_GAP), left: 0, right: 0, height: pillH }}
            >
              {ordered.flatMap((itemIdx, pos) => {
                const cells = [pill(itemIdx)];
                if (pos < ordered.length - 1) {
                  cells.push(
                    <Line
                      key={`l-${itemIdx}`}
                      v={v}
                      from={ink(itemIdx)}
                      to={ink(ordered[pos + 1])}
                    />
                  );
                }
                return cells;
              })}
            </div>
          );
        })}
        <svg
          className="pointer-events-none absolute inset-0"
          width={containerW}
          height={totalH}
          viewBox={`0 0 ${containerW} ${totalH}`}
          fill="none"
          aria-hidden
        >
          {turns.map((turn) => (
            <g key={turn.key}>
              {v.color !== "grey" && (
                <defs>
                  <linearGradient
                    id={`${gradId}${turn.key}`}
                    gradientUnits="userSpaceOnUse"
                    x1={turn.x1}
                    y1={turn.y1}
                    x2={turn.x2}
                    y2={turn.y2}
                  >
                    {stops(v.color, turn.from, turn.to)}
                  </linearGradient>
                </defs>
              )}
              <path
                d={turn.d}
                stroke={v.color === "grey" ? GREY_INK : `url(#${gradId}${turn.key})`}
                strokeWidth={v.stroke}
                strokeOpacity={v.opacity}
                strokeLinecap={v.cap}
                strokeDasharray={v.dash}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ================================================================== *
 *  The room.
 * ================================================================== */

export default function ChainLinesRoom() {
  const [w, setW] = useState(688);
  const spans = CHAIN_FIXTURES.find((f) => f.key === "owner-9")!.spans;

  return (
    <LabShell
      title="The colour handoff"
      lede="The chain's arrows became connecting lines that carry one house's colour into the next. Same pills, same spacing, same turns: six ways to draw only the line. The owner picked Thread over the old arrows and the other five, and it shipped to the profile on 2026-08-19."
    >
      <Rule nav="Width">One slider, six chains</Rule>
      <p className="mb-4 max-w-[74ch] text-[17px] leading-[1.65]">
        Every chain below is your real nine-house career, drawn with the shipped layout. Drag the
        width down and each one curls into the serpentine, so you can judge the turns in the same
        breath as the straights.
      </p>
      <label className="mb-10 flex w-full max-w-md items-center gap-4 text-[14px] font-semibold text-muted-foreground">
        <input
          type="range"
          min={302}
          max={688}
          value={w}
          onChange={(e) => setW(Number(e.target.value))}
          className="w-full accent-canopy"
        />
        <span className="w-14 shrink-0 tabular-nums">{w}px</span>
      </label>

      <div className="space-y-8">
        {VARIANTS.map((v) => (
          <Mount key={v.key} tone={v.key === "thread" ? "pick" : "option"} label={v.label} note={v.note}>
            <div style={{ width: w }} className="max-w-full">
              <LabChain spans={spans} v={v} />
            </div>
          </Mount>
        ))}
      </div>

      <Verdict>
        <p>
          Thread shipped. Against the old arrows the case was simple: the year captions on the
          pills already state the order, so the arrowheads repeated information while keeping the
          pills visually apart, which is exactly what made the chain read as a scatter. Thread joins
          them instead. The others stay here as the record of the search: Garland and Baton were
          the closest runners-up, Stitch and Wash change the material of the line, and Rings was
          the outline idea, tried and passed over.
        </p>
      </Verdict>
    </LabShell>
  );
}
