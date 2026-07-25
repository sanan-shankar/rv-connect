"use client";

/* ------------------------------------------------------------------ *
 *  HousesTrail — the house-per-year chain, laid out as a boustrophedon
 *  (serpentine) trail.
 *
 *  WHY THIS EXISTS. The shipped chain is a plain `flex-wrap` row of
 *  pills joined by right-arrows. With enough houses to wrap (and people
 *  do have up to ten) the last arrow on a row points right, into empty
 *  space, while the run it is pointing at has restarted on the far LEFT
 *  of the next line. The eye gets thrown across the whole card. Owner
 *  note, verbatim: "the arrow kind of points to nothing, and it
 *  continues on the next line. That doesn't really look very nice. It
 *  should probably continue on the right side of the next line, and then
 *  kind of loop back, and then the arrows start pointing another
 *  direction. Maybe the last arrow on the top row does this 180 turning
 *  thing."
 *
 *  So: row 1 runs left to right, then a U-turn at the right edge, row 2
 *  runs right to left, U-turn at the left edge, and so on. Every arrow
 *  points at the pill it actually leads to.
 *
 *  HOW THE ROWS ARE DECIDED. Not by `flex-wrap`: a wrapped row's
 *  membership is only knowable after layout, and we need to know it
 *  BEFORE render to pick each row's direction and turn side. So the
 *  column count is explicit per breakpoint and the spans are chunked in
 *  JS. Deterministic, no measurement pass, no resize flicker, and it
 *  degrades to one tidy row when someone only has two or three houses.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import type { MockHouseYear } from "./_data";

/** Canopy, cinnamon, sky. Cycled so a long trail still reads as one system. */
const TINTS = ["var(--color-canopy)", "var(--color-cinnamon)", "var(--color-sky)"] as const;

function academicLabel(fromYear: number, toYear: number): string {
  return `${fromYear}-${String((toYear + 1) % 100).padStart(2, "0")}`;
}

/** Columns per row at each breakpoint. Two on a phone keeps the pills legible. */
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

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/**
 * The 180 turn itself. Drawn as an arc that leaves the row it is ending,
 * curves down, and arrives pointing back along the next row's direction.
 * `flip` mirrors it for a turn on the left edge.
 */
function UTurn({ flip }: { flip: boolean }) {
  return (
    <svg
      width="34"
      height="26"
      viewBox="0 0 34 26"
      fill="none"
      aria-hidden
      className="text-muted-foreground/45"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M4 6 H20 A8 8 0 0 1 20 22 H12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M15.5 18.5 L11.5 22 L15.5 25.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function Arrow({ back }: { back: boolean }) {
  return (
    <span
      aria-hidden
      className="shrink-0 select-none text-[13px] leading-none text-muted-foreground/45"
    >
      {back ? "←" : "→"}
    </span>
  );
}

export function HousesTrail({ houses }: { houses: MockHouseYear[] }) {
  const cols = useColumns();
  if (houses.length === 0) return null;

  const rows = chunk(houses, cols);

  return (
    <div className="flex flex-col gap-1">
      {/* Screen readers get the plain sequence; the serpentine is purely visual. */}
      <p className="sr-only">
        {houses.map((h) => `${h.house} ${academicLabel(h.fromYear, h.toYear)}`).join(", then ")}
      </p>

      {rows.map((row, rowIndex) => {
        const backwards = rowIndex % 2 === 1;
        const isLastRow = rowIndex === rows.length - 1;
        return (
          <div key={rowIndex} className="flex flex-col gap-1">
            <div
              className={`flex items-center gap-1.5 ${backwards ? "flex-row-reverse justify-end" : "justify-start"}`}
              aria-hidden
            >
              {row.map((span, i) => {
                const absolute = rowIndex * cols + i;
                const tint = TINTS[absolute % TINTS.length];
                return (
                  <span key={`${span.house}-${span.fromYear}`} className="flex shrink-0 items-center gap-1.5">
                    <motion.span
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRINGS.gentle, delay: 0.04 * absolute }}
                      className="flex flex-col items-center rounded-xl px-3 py-1.5 text-center leading-tight text-white"
                      style={{ backgroundColor: tint }}
                    >
                      <span className="text-[13px] font-semibold">{span.house}</span>
                      <span className="text-[11px] tabular-nums text-white/85">
                        {academicLabel(span.fromYear, span.toYear)}
                      </span>
                    </motion.span>
                    {i < row.length - 1 && <Arrow back={backwards} />}
                  </span>
                );
              })}
            </div>

            {/* The turn sits on the edge the row ended at, so the trail reads
                as one continuous line rather than a set of stacked rows. */}
            {!isLastRow && (
              <div className={`flex ${backwards ? "justify-start" : "justify-end"}`} aria-hidden>
                <UTurn flip={backwards} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
