"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  The gate by day.
 *
 *  One column a day, three bars from one baseline: everyone who came, the
 *  ones who got through, the ones who joined. They are NESTED (a joiner got
 *  through, a person through came), so they are drawn over each other in
 *  three steps of one green rather than side by side in three colours:
 *  one hue, light to dark, is how a reader knows the darker is a part of
 *  the lighter. One axis, ticked at its top.
 *
 *  The readout above is the tooltip, made a line of text so it never covers
 *  a column: it says the whole range until a day is pointed at, then that
 *  day. A finger taps a day; a mouse just passes over it (a tap must be one
 *  state change, DESIGN-SYSTEM §10, so hover is gated to non-touch).
 * ------------------------------------------------------------------ */

type Day = { day: string; arrived: number; through: number; joined: number };

const SERIES = [
  { key: "arrived", label: "came", swatch: "bg-leaf/20" },
  { key: "through", label: "got through", swatch: "bg-leaf/55" },
  { key: "joined", label: "joined", swatch: "bg-leaf" },
] as const;

const short = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const long = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
/* The keys are already the valley's calendar day, so they are read back in UTC
   to print that same day rather than shifting it a second time. */
const asDate = (key: string) => new Date(`${key}T00:00:00Z`);

export function Rhythm({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.arrived));
  const total = days.reduce(
    (t, d) => ({ arrived: t.arrived + d.arrived, through: t.through + d.through, joined: t.joined + d.joined }),
    { arrived: 0, through: 0, joined: 0 },
  );
  const shown = active === null ? total : days[active];
  const when = active === null ? `Last ${days.length} days` : long.format(asDate(days[active].day));

  return (
    <div className="flex flex-col gap-3 px-3.5 pb-3 pt-3">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12.5px] tabular-nums" aria-live="polite">
        <span className="font-medium text-foreground">{when}</span>
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className={cn("size-2.5 rounded-[3px]", s.swatch)} aria-hidden />
            <span className="text-foreground">{shown[s.key]}</span> {s.label}
          </span>
        ))}
      </p>

      <div className="relative">
        {/* The one tick: the top of the axis, so the tallest column has a number. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-border" aria-hidden />
        <span className="pointer-events-none absolute -top-2 right-0 bg-card pl-1 text-[12px] leading-none tabular-nums text-muted-foreground">
          {max}
        </span>
        <div
          className="flex h-[112px] items-end gap-[2px] border-b border-border pt-3"
          onPointerLeave={() => setActive(null)}
        >
          {days.map((d, i) => (
            <button
              key={d.day}
              type="button"
              aria-label={`${long.format(asDate(d.day))}: ${d.arrived} came, ${d.through} got through, ${d.joined} joined`}
              aria-pressed={active === i}
              onPointerEnter={(e) => {
                if (e.pointerType !== "touch") setActive(i);
              }}
              onClick={() => setActive(active === i ? null : i)}
              /* The hit area is the whole slot, the full height of the plot:
                 a two-pixel column is not something a finger can land on. */
              className={cn(
                "group relative flex h-full min-w-0 flex-1 justify-center rounded-t-[3px] outline-none",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                active === i && "bg-foreground/[0.04]",
                "active:bg-foreground/[0.08]",
              )}
            >
              {SERIES.map((s) => (
                <span
                  key={s.key}
                  /* 3px, off the radius ladder on purpose: a column can be
                     11px wide on a phone, and even the ladder's smallest
                     rung (8.8px) would round it into a pill. */
                  className={cn("absolute bottom-0 w-full max-w-[24px] rounded-t-[3px]", s.swatch)}
                  style={{ height: d[s.key] ? `${Math.max((d[s.key] / max) * 100, 3)}%` : 0 }}
                  aria-hidden
                />
              ))}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[12px] tabular-nums text-muted-foreground">
          <span>{days[0] && short.format(asDate(days[0].day))}</span>
          {days.length > 10 && <span>{short.format(asDate(days[Math.floor(days.length / 2)].day))}</span>}
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
