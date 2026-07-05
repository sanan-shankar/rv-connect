"use client";

/* ------------------------------------------------------------------ *
 *  <CadenceControl> — step 2 of the create flow: the Canopy pill
 *  segmented control for the recurring rhythm (spec 3.2). Monthly is
 *  the default; weekly is deliberately not offered (Letterloop
 *  research: weekly kills these loops).
 *
 *  `labels` is passed in from the server page rather than imported
 *  from `@/lib/catchups` directly: that module also pulls in the
 *  Prisma `pg` driver (dynamically, for the impure helpers), which
 *  cannot be bundled for the browser. Keeping this file's only import
 *  from that module a type-only one (`Cadence`) sidesteps the whole
 *  Node-only dependency graph.
 * ------------------------------------------------------------------ */

import { cn } from "@/lib/utils";
import type { Cadence } from "@/lib/catchups-types";

const OPTIONS: Cadence[] = ["biweekly", "monthly", "quarterly"];

export function CadenceControl({
  value,
  onChange,
  labels,
}: {
  value: Cadence;
  onChange: (cadence: Cadence) => void;
  labels: Record<Cadence, string>;
}) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Rhythm"
        className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-muted/70 p-1"
      >
        {OPTIONS.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-transform duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.97]",
                active
                  ? "bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {labels[opt]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12.5px] text-muted-foreground">You can change this anytime.</p>
    </div>
  );
}
