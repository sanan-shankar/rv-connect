"use client";

/* ------------------------------------------------------------------ *
 *  The houses picker room, rebuilt (2026-07-30).
 *
 *  The previous version of this file held three from-scratch alternative
 *  interactions (DirectionRun / DirectionRollCall / DirectionQuiet) plus a
 *  four-family colour taxonomy for the 22 houses. The owner rejected all of
 *  it in one sitting: no per-house colours, no sorting houses by colour or
 *  tree or mountain, no new game. The shipped year-by-year picker with
 *  auto-advance is what they wanted -- just refined: where the panel sits on
 *  a phone, the radii, the small motion. That refinement lives in the real
 *  component (`src/components/common/house-picker.tsx`), not here.
 *
 *  All that remains in this file is the small live demo shared by the room
 *  page and its iframe target below, so the "mobile" frame in the room gets
 *  a genuinely narrow viewport (window.matchMedia and the bottom sheet's
 *  `position: fixed` both resolve against the iframe's own window) rather
 *  than a forced flag bolted onto the real component just for a demo.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { HousePicker } from "@/components/common/house-picker";
import { academicSpanLabel } from "@/lib/house-spans";

const DEMO_YEARS = [2014, 2015, 2016, 2017, 2018];

export function DemoRows() {
  const [rows, setRows] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(DEMO_YEARS.map((y) => [y, [] as string[]]))
  );
  const [openYear, setOpenYear] = useState<number | null>(null);

  function update(year: number, houses: string[]) {
    setRows((r) => ({ ...r, [year]: houses }));
  }
  function advance(fromYear: number) {
    const next = DEMO_YEARS.find((y) => y > fromYear && rows[y].length === 0);
    setOpenYear(next ?? null);
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      {DEMO_YEARS.map((y, i) => (
        <div
          key={y}
          className={[
            "flex items-center gap-3 px-4 py-2.5",
            i < DEMO_YEARS.length - 1 ? "border-b border-border" : "",
          ].join(" ")}
        >
          {/* Radius ladder: 16px group container (above) -> 12px HousePicker
              trigger -> this 8px year chip. No two nested surfaces share a
              radius. */}
          <span className="flex h-9 w-16 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-canopy/10 text-center text-[13px] font-bold tabular-nums leading-tight text-canopy">
            {academicSpanLabel(y, y)}
          </span>
          <div className="min-w-0 flex-1">
            <HousePicker
              value={rows[y]}
              onChange={(next) => update(y, next)}
              ariaLabel={`House(s) for ${academicSpanLabel(y, y)}`}
              yearLabel={academicSpanLabel(y, y)}
              open={openYear === y}
              onOpenChange={(o) => setOpenYear(o ? y : null)}
              onPicked={() => advance(y)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
