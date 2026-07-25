"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
import { academicSpanLabel, parseHouseSpans, type HouseSpan } from "@/lib/house-spans";

/**
 * The houses chain (the owner's favourite element): each house is a full pill
 * with its name + year range, joined by arrows, reading like distinct chapters
 * of a school career. Consecutive years in the same house collapse into one
 * `fromYear-toYear` box; the pills are tinted (see below) so a long run stays
 * legible without inventing 22 real house colours.
 *
 * Scales to ~10 stints: desktop wraps, mobile is a horizontal scroll-snap
 * strip. One house renders a single chip (no arrow); zero houses hides the
 * whole band (the caller may show its own "add your houses" prompt instead).
 *
 * The pills cycle through three brand tints - canopy, cinnamon, sky - so a long
 * run reads as distinct chapters rather than a two-tone stripe. Each keeps its
 * own family for text (AA on the light tinted fill) instead of inventing 22
 * real house colours.
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

export function HousesChain({ houses }: { houses: string | null | undefined }) {
  const spans = parseHouseSpans(houses);
  if (spans.length === 0) return null;

  return (
    <div
      className="-mx-1 flex snap-x snap-mandatory items-center gap-x-1.5 gap-y-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden"
      role="list"
      aria-label="Houses over the years"
    >
      {spans.map((span, i) => (
        <span key={`${span.house}-${span.fromYear}-${i}`} className="flex shrink-0 items-center gap-1.5">
          <motion.span
            role="listitem"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRINGS.gentle, delay: 0.05 * i }}
            className={cn(
              "inline-flex snap-start items-baseline gap-1.5 rounded-full border px-3.5 py-1.5",
              HOUSE_TINTS[i % HOUSE_TINTS.length]
            )}
          >
            <span className="font-heading text-[13px] font-bold leading-none">{span.house}</span>
            <span className="text-[11px] font-semibold tabular-nums leading-none opacity-75">
              {yearRange(span)}
            </span>
          </motion.span>
          {i < spans.length - 1 && (
            <span aria-hidden className="shrink-0 text-[13px] text-muted-foreground/45">
              &rarr;
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
