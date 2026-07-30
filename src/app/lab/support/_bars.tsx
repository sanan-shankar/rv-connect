"use client";

/* ------------------------------------------------------------------ *
 *  The build-fund widget, as it ships and as three alternatives.
 *
 *  Shipped values are lifted from src/components/support/cost-bar.tsx
 *  (2026-07-25): BUILD_COST = 400000, BUILD_RECOVERED = 0, the trough is
 *  `h-5 w-full rounded-full bg-mist p-1` on a `bg-card` card. #EEE8DA on
 *  #F6F2E8 is 1.09:1, so at zero the widget is a 20px slot you cannot see.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { cn } from "@/lib/utils";

export const BUILD_COST = 400000;
const TICKS = 80; // one per 5,000 rupees
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* ---------------- what ships ---------------- */

export function ShippedBar({ recovered }: { recovered: number }) {
  const pct = Math.min(100, (recovered / BUILD_COST) * 100);
  return (
    <div className="card-elevated rounded-[16px] border border-border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h4 className="font-heading text-[19px] font-bold tracking-tight">
          Recovering what it cost to build
        </h4>
        <div className="text-[15px]">
          <span className="font-heading text-[19px] font-bold tabular-nums text-leaf">
            {rupees(recovered)}
          </span>{" "}
          <span className="text-muted-foreground">of {rupees(BUILD_COST)}</span>
        </div>
      </div>
      <div className="mt-4 h-5 w-full overflow-hidden rounded-full bg-mist p-1">
        <div
          className="h-full rounded-full bg-[#235C49] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-4 text-[13.5px] leading-[1.7] text-muted-foreground">
        This one is a goal, not an expectation. It is the one-time cost of designing and building the
        site, shown here simply because it is the honest number. Nothing about the site changes if it
        never fills up.
      </p>
    </div>
  );
}

/* ---------------- A. the tick ladder ---------------- */

export function TickLadder({ recovered }: { recovered: number }) {
  const lit = (recovered / BUILD_COST) * TICKS;
  return (
    <div className="card-elevated rounded-[16px] border border-border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h4 className="font-heading text-[19px] font-bold tracking-tight">What it cost to build</h4>
        <div className="text-[13px] text-muted-foreground">
          one mark per {rupees(5000)}
        </div>
      </div>
      <div className="mt-4 flex items-end gap-[2px]" aria-hidden>
        {Array.from({ length: TICKS }, (_, i) => {
          const fill = Math.max(0, Math.min(1, lit - i));
          return (
            <span
              key={i}
              className="relative h-4 flex-1 overflow-hidden rounded-[1px] bg-border"
            >
              <span
                className="absolute bottom-0 left-0 w-full bg-leaf transition-[height] duration-500 ease-out"
                style={{ height: `${fill * 100}%` }}
              />
            </span>
          );
        })}
      </div>
      <p className="mt-3.5 text-[13.5px] leading-[1.7] text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{rupees(recovered)}</span> back
        so far. The scale is the point: a single {rupees(5000)} lights a whole mark, so the first
        contribution is visible instead of being a rounding error on a 400,000 rupee bar.
      </p>
    </div>
  );
}

/* ---------------- B. invert the frame ---------------- */

export function InvertedFrame({ recovered }: { recovered: number }) {
  return (
    <div className="card-elevated rounded-[16px] border border-border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h4 className="font-heading text-[19px] font-bold tracking-tight">This month is covered</h4>
        <div className="text-[15px]">
          <span className="font-heading text-[19px] font-bold tabular-nums text-leaf">
            {rupees(2290)}
          </span>{" "}
          <span className="text-muted-foreground">/month</span>
        </div>
      </div>
      <div className="mt-4 flex h-5 w-full gap-1 overflow-hidden rounded-full bg-mist p-1">
        <span className="h-full rounded-full bg-[#235C49]" style={{ width: "85%" }} />
        <span className="h-full rounded-full bg-sky" style={{ width: "4%" }} />
        <span className="h-full rounded-full bg-cinnamon" style={{ width: "11%" }} />
      </div>
      <p className="mt-4 text-[13.5px] leading-[1.7] text-muted-foreground">
        Hosting, photos and the domain, all paid for. A few people chipping in comfortably covers the
        whole month.
      </p>
      {/* the one-off demoted into a recessed note: 12px inside a 16px card,
          which is the project's own box-in-a-box radius rule */}
      <div className="mt-4 rounded-xl bg-mist p-4">
        <p className="text-[13.5px] leading-[1.7] text-muted-foreground">
          Separately, designing and building the site cost about{" "}
          <span className="font-semibold text-foreground">{rupees(BUILD_COST)}</span>, of which{" "}
          <span className="font-semibold tabular-nums text-foreground">{rupees(recovered)}</span> has
          come back. That one is a goal, not an expectation, and nothing here depends on it.
        </p>
      </div>
    </div>
  );
}

/* ---------------- C. the seats ---------------- */

export function Seats({ recovered }: { recovered: number }) {
  const filled = Math.floor((recovered / BUILD_COST) * TICKS);
  return (
    <div className="card-elevated rounded-[16px] border border-border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h4 className="font-heading text-[19px] font-bold tracking-tight">Eighty seats</h4>
        <div className="text-[13px] tabular-nums text-muted-foreground">
          {filled} of {TICKS} taken
        </div>
      </div>
      <div
        className="mt-4 grid gap-1.5 [grid-template-columns:repeat(20,minmax(0,1fr))]"
        aria-hidden
      >
        {Array.from({ length: TICKS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-[3px] transition-colors duration-300",
              i < filled ? "bg-leaf" : "bg-mist ring-1 ring-inset ring-border",
            )}
          />
        ))}
      </div>
      <p className="mt-3.5 text-[13.5px] leading-[1.7] text-muted-foreground">
        The stone benches under the banyan, one seat per {rupees(5000)}. Nobody has to fill the hall.
        Taking one seat is a complete act, which a percentage bar can never be.
      </p>
    </div>
  );
}

/* ---------------- the driver ---------------- */

export const AMOUNTS = [0, 5000, 60000, 220000];

export function useRecovered() {
  const [i, setI] = useState(0);
  return { recovered: AMOUNTS[i], i, setI };
}
