"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
import { academicSpanLabel, chunkRows, parseHouseSpans, type HouseSpan } from "@/lib/house-spans";

/**
 * The houses chain: each house a pill with its name and year range, joined by
 * arrows, reading like the chapters of a school career. Consecutive years in
 * the same house collapse into one span; the pills cycle three brand tints so a
 * long run stays legible without inventing 22 real house colours.
 *
 * LAID OUT AS A BOUSTROPHEDON (serpentine), the owner's own design: row 1 runs
 * left to right, takes a 180 turn at the right edge, row 2 runs right to left,
 * and so on, so no arrow ever points into empty space the way a plain
 * `flex-wrap` chain's trailing arrow does.
 *
 * WHY A GRID, and not flex rows. The turn has to sit directly between the pill
 * that ends one row and the pill that starts the next, which means those two
 * pills must share an x position. Flex cannot promise that: the rows hold
 * different numbers of pills of different widths, so their ends never line up.
 * An earlier attempt forced it with `justify-between`, which "solved" the
 * alignment by stretching each row edge to edge; measured, that left 132px
 * pills separated by ~135px of nothing, with the arrows stranded mid-gap and
 * the turn floating past the end of the row below it. Pills sitting further
 * apart than they are wide is not a chain.
 *
 * A grid of `max-content` columns fixes both at once: every column is exactly
 * as wide as its widest pill, so the row is snug, AND column n has the same x
 * on every row, so the turn lands where it belongs. Pills take odd columns and
 * arrows the even ones between them, which keeps the arrow gaps uniform instead
 * of leaving them to whatever slack a justify rule happens to distribute.
 *
 * Row membership cannot come from `flex-wrap` either, since each row's
 * direction has to be known before layout, so rows are chunked in JS from a
 * column count measured off the container. It collapses to one tidy row for two
 * or three houses.
 */

const HOUSE_TINTS = [
  "border-canopy/25 bg-canopy/[0.06] text-canopy",
  "border-cinnamon/30 bg-cinnamon/[0.07] text-cinnamon",
  "border-sky/35 bg-sky/[0.10] text-sky",
];

// Each stored year is an ACADEMIC year (2014 reads as "2014-15"), so every
// span -- one year or a multi-year run -- renders as a hyphenated span label,
// never a bare calendar year and never an en dash.
function yearRange(span: HouseSpan): string {
  return academicSpanLabel(span.fromYear, span.toYear);
}

/* Roughly what a row of N pills needs, measured: four sit in ~560px, and the
   count steps down from there. Generous by ~20px so a long house name never
   tips a row over its container. */
const WIDTH_FOR_COLUMNS: ReadonlyArray<{ min: number; cols: number }> = [
  { min: 580, cols: 4 },
  { min: 430, cols: 3 },
  { min: 0, cols: 2 },
];

/**
 * Houses per row, chosen from the width of the CONTAINER the trail is sitting
 * in, not the viewport.
 *
 * This used to read `matchMedia("(min-width: 1024px)")`, which meant the trail
 * was a fixed ~560px object on any desktop screen no matter how narrow the box
 * around it was. Nothing overflows today only because every container that
 * currently holds one happens to be wide enough; drop this into a 320px rail at
 * a 1440 viewport and four columns would run straight out the side. A shared
 * component should not depend on the caller's layout happening to be roomy, so
 * it measures what it has been given.
 */
function useColumns(ref: React.RefObject<HTMLDivElement | null>): number {
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pick = (w: number) => WIDTH_FOR_COLUMNS.find((t) => w >= t.min)?.cols ?? 2;
    // The wrapper is `w-fit`, so it shrink-wraps the trail and would report the
    // trail's own width back to us. The parent is the real budget.
    const measured = () => el.parentElement?.clientWidth ?? el.clientWidth;
    setCols(pick(measured()));
    const ro = new ResizeObserver(() => setCols(pick(measured())));
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [ref]);
  return cols;
}

/* Arrows are SVG rather than the "→" glyph so they share one stroke weight and
   one cap style with the turn below. A hairline text arrow beside a drawn arc
   reads as two different hands. */
const STROKE = { stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round" as const };

function Arrow({ back }: { back: boolean }) {
  return (
    <svg
      width="18"
      height="10"
      viewBox="0 0 18 10"
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

/**
 * The 180 turn. Both pills it joins sit in the SAME grid column, so this drops
 * straight down between them: it enters going the way the row above was
 * travelling, hooks over, and leaves pointing the way the row below travels.
 * `flip` mirrors it for a turn on the left edge.
 */
function UTurn({ flip }: { flip: boolean }) {
  return (
    <svg
      width="26"
      height="18"
      viewBox="0 0 26 18"
      fill="none"
      aria-hidden
      className="shrink-0 text-muted-foreground/50"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M4 4 H15 A5 5 0 0 1 15 14 H8" {...STROKE} />
      <path d="M11 10.5 L7.5 14 L11 17.5" {...STROKE} strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The trail itself, over already-parsed spans.
 *
 * Exported so the `/preview/delight/profiles` concepts render the SAME pills as
 * the shipped profile instead of a lookalike. They previously forked their own
 * solid-filled style, which the owner rejected in favour of this bordered tint.
 * One definition, no drift.
 *
 * Houses are a fun detail, not the subject of the page, so this stays a quiet
 * strip: small pills, snug spacing, `w-fit` so it never stretches to fill
 * whatever container it is dropped into.
 */
export function HouseTrail({ spans }: { spans: HouseSpan[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cols = useColumns(wrapRef);
  if (spans.length === 0) return null;

  const rows = chunkRows(spans, cols);
  // Pills on odd columns, the arrow between each pair on the even column.
  const templateColumns = `repeat(${Math.max(1, 2 * cols - 1)}, max-content)`;

  return (
    <div ref={wrapRef} className="w-fit">
      {/* Screen readers get the plain sequence; the serpentine is purely visual. */}
      <p className="sr-only">
        Houses over the years: {spans.map((s) => `${s.house} ${yearRange(s)}`).join(", then ")}
      </p>

      <div
        aria-hidden
        className="grid items-center gap-x-1.5 gap-y-0.5"
        style={{ gridTemplateColumns: templateColumns }}
      >
        {rows.flatMap((row, rowIndex) => {
          const backwards = rowIndex % 2 === 1;
          const isLastRow = rowIndex === rows.length - 1;
          // Content rows are odd grid rows; the turn sits on the even row under.
          const gridRow = rowIndex * 2 + 1;

          const cells = row.flatMap((span, i) => {
            const absolute = rowIndex * cols + i;
            // A backwards row is filled from the right, so its first pill takes
            // the last column and the arrow leaving it sits to its LEFT.
            const pillCol = backwards ? 2 * (cols - 1 - i) + 1 : 2 * i + 1;
            const arrowCol = backwards ? pillCol - 1 : pillCol + 1;

            const out = [
              <motion.span
                key={`${span.house}-${span.fromYear}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRINGS.gentle, delay: 0.04 * absolute }}
                style={{ gridRow, gridColumn: pillCol }}
                className={cn(
                  "inline-flex items-baseline gap-1.5 justify-self-start rounded-full border px-2.5 py-1",
                  HOUSE_TINTS[absolute % HOUSE_TINTS.length]
                )}
              >
                <span className="font-heading text-[12.5px] font-bold leading-none">{span.house}</span>
                <span className="text-[10.5px] font-semibold tabular-nums leading-none opacity-75">
                  {yearRange(span)}
                </span>
              </motion.span>,
            ];

            if (i < row.length - 1) {
              out.push(
                <span
                  key={`${span.house}-${span.fromYear}-arrow`}
                  style={{ gridRow, gridColumn: arrowCol }}
                  className="flex justify-center"
                >
                  <Arrow back={backwards} />
                </span>
              );
            }
            return out;
          });

          if (!isLastRow) {
            // Every row that has a turn under it is a full row (only the last
            // row can be partial), so the turn column is always the row's outer
            // edge: the last pill column going right, the first going left.
            const turnCol = backwards ? 1 : 2 * cols - 1;
            cells.push(
              <span
                key={`turn-${rowIndex}`}
                style={{ gridRow: gridRow + 1, gridColumn: turnCol }}
                className="flex justify-center"
              >
                <UTurn flip={backwards} />
              </span>
            );
          }
          return cells;
        })}
      </div>
    </div>
  );
}

/** The shipped profile's entry point: parse the raw `houses` JSON, then draw. */
export function HousesChain({ houses }: { houses: string | null | undefined }) {
  return <HouseTrail spans={parseHouseSpans(houses)} />;
}
