"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
import { academicSpanLabel, chunkRows, parseHouseSpans, type HouseSpan } from "@/lib/house-spans";

/**
 * The houses chain (the owner's favourite element): each house is a full pill
 * with its name and year range, joined by arrows, reading like distinct
 * chapters of a school career. Consecutive years in the same house collapse
 * into one `fromYear-toYear` box; the pills cycle three brand tints (canopy,
 * cinnamon, sky) so a long run stays legible without inventing 22 real house
 * colours.
 *
 * LAID OUT AS A BOUSTROPHEDON (serpentine). Row 1 runs left to right, a 180
 * turn at the right edge, row 2 runs right to left, and so on.
 *
 * Why, rather than `flex-wrap`: with enough houses to wrap, and people do have
 * up to ten, the last arrow on a row pointed right into empty space while the
 * run it pointed at had restarted on the far left of the next line. Owner,
 * verbatim: "the arrow kind of points to nothing, and it continues on the next
 * line. That doesn't really look very nice. It should probably continue on the
 * right side of the next line, and then kind of loop back, and then the arrows
 * start pointing another direction. Maybe the last arrow on the top row does
 * this 180 turning thing." Every arrow now points at the pill it leads to.
 *
 * A wrapped row's membership is only knowable after layout, but each row's
 * direction has to be chosen before render, so the column count is explicit per
 * breakpoint and the rows are chunked in JS (`chunkRows`). Deterministic, no
 * measurement pass, no resize flicker, and it collapses to one tidy row for
 * someone with two or three houses.
 *
 * This also replaces the old mobile horizontal scroll-snap strip, which was a
 * nested scroller that could swallow the page scroll.
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

/** Houses per row at each breakpoint. Two on a phone keeps the pills legible. */
function useColumns(): number {
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const mid = window.matchMedia("(min-width: 640px)");
    const sync = () => setCols(wide.matches ? 4 : mid.matches ? 3 : 2);
    sync();
    wide.addEventListener("change", sync);
    mid.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      mid.removeEventListener("change", sync);
    };
  }, []);
  return cols;
}

/**
 * The turn itself: an arc that leaves the row it is ending, curves down, and
 * arrives pointing back along the next row's direction. `flip` mirrors it for a
 * turn on the left edge.
 */
function UTurn({ flip }: { flip: boolean }) {
  return (
    <svg
      width="26"
      height="20"
      viewBox="0 0 34 26"
      fill="none"
      aria-hidden
      className="text-muted-foreground/45"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M4 6 H20 A8 8 0 0 1 20 22 H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M15.5 18.5 L11.5 22 L15.5 25.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The trail itself, over already-parsed spans.
 *
 * Exported so the `/preview/delight/profiles` concepts render the SAME pills as
 * the shipped profile instead of a lookalike. They previously had their own
 * copy with solid-filled pills, which the owner rejected in favour of this
 * bordered-tint style. One definition, no drift.
 */
export function HouseTrail({ spans }: { spans: HouseSpan[] }) {
  const cols = useColumns();
  if (spans.length === 0) return null;

  const rows = chunkRows(spans, cols);

  return (
    // Deliberately narrow. Houses are a fun detail, not the subject of the
    // page: given a full card's width the rows spread out and the block starts
    // reading as a major section. Capped tight, the pills sit close enough to
    // read as one chain AND the whole thing stays a quiet strip.
    <div className="flex max-w-[520px] flex-col gap-0.5">
      {/* Screen readers get the plain sequence; the serpentine is purely visual. */}
      <p className="sr-only">
        Houses over the years:{" "}
        {spans.map((s) => `${s.house} ${yearRange(s)}`).join(", then ")}
      </p>

      {rows.map((row, rowIndex) => {
        const backwards = rowIndex % 2 === 1;
        const isLastRow = rowIndex === rows.length - 1;
        return (
          <div key={rowIndex} className="flex flex-col gap-0.5">
            <div
              aria-hidden
              className={cn(
                "flex items-center gap-1",
                backwards && "flex-row-reverse",
                // Full rows stretch edge to edge so a row always ENDS on the
                // container edge the U-turn sits on; otherwise the turn floats
                // out at the card's margin while the row stopped short of it.
                // The last row is usually partial, so it packs snugly against
                // whichever edge it starts from instead of being spread thin
                // (`justify-start` follows the reversed axis, so a backwards
                // last row packs right, directly under the turn above it).
                isLastRow ? "justify-start" : "w-full justify-between"
              )}
            >
              {row.map((span, i) => {
                const absolute = rowIndex * cols + i;
                return (
                  <span key={`${span.house}-${span.fromYear}`} className="flex shrink-0 items-center gap-1">
                    <motion.span
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRINGS.gentle, delay: 0.05 * absolute }}
                      className={cn(
                        "inline-flex items-baseline gap-1.5 rounded-full border px-2.5 py-1",
                        HOUSE_TINTS[absolute % HOUSE_TINTS.length]
                      )}
                    >
                      <span className="font-heading text-[12.5px] font-bold leading-none">{span.house}</span>
                      <span className="text-[10.5px] font-semibold tabular-nums leading-none opacity-75">
                        {yearRange(span)}
                      </span>
                    </motion.span>
                    {i < row.length - 1 && (
                      <span className="shrink-0 text-[13px] leading-none text-muted-foreground/45">
                        {backwards ? "←" : "→"}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>

            {/* The turn sits on the edge the row ended at, so the whole thing
                reads as one continuous line rather than stacked rows. */}
            {!isLastRow && (
              <div aria-hidden className={cn("flex", backwards ? "justify-start" : "justify-end")}>
                <UTurn flip={backwards} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The shipped profile's entry point: parse the raw `houses` JSON, then draw. */
export function HousesChain({ houses }: { houses: string | null | undefined }) {
  return <HouseTrail spans={parseHouseSpans(houses)} />;
}
