"use client";

/* ------------------------------------------------------------------ *
 *  <CadenceControl> — the Canopy pill segmented control for the
 *  recurring rhythm. Monthly is the default; weekly is deliberately not
 *  offered (Letterloop research: weekly kills these loops).
 *
 *  The selected fill is a single shared element (`layoutId`), so changing
 *  option glides it across and crossfades it in rather than snapping the
 *  colour from one pill to the next. Transform and opacity only.
 *
 *  `labels` is passed in from the server page rather than imported
 *  from `@/lib/catchups` directly: that module also pulls in the
 *  Prisma `pg` driver (dynamically, for the impure helpers), which
 *  cannot be bundled for the browser. Keeping this file's only import
 *  from that module a type-only one (`Cadence`) sidesteps the whole
 *  Node-only dependency graph.
 * ------------------------------------------------------------------ */

import { motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
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
              "relative rounded-full px-4 py-1.5 text-[13px] font-semibold transition-[color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]",
              active ? "text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="cadence-selected"
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={SPRINGS.snappy}
                className="absolute inset-0 rounded-full bg-canopy shadow-[0_5px_13px_-12px_var(--color-canopy)]"
              />
            )}
            <span className="relative">{labels[opt]}</span>
          </button>
        );
      })}
    </div>
  );
}
