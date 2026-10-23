"use client";

import { m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  A bar that grows to its length once, when the room opens.
 *
 *  The room's one piece of motion, and it carries something: ten ribbons
 *  drawing themselves out from one edge, a few frames apart, are read as a
 *  race the eye follows to the end, which is the comparison the table
 *  exists for. Transform only (the house rule), from the bar's own start
 *  edge, on the out-curve a small element answering an arrival wants.
 *  Never on hover, never twice.
 * ------------------------------------------------------------------ */

export function Grow({
  index = 0,
  className,
  children,
}: {
  /** Position in its list; each step waits 40ms more. */
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <m.div
      className={cn("origin-left", className)}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.7, ease: EASE_OUT_SMOOTH, delay: 0.05 + index * 0.04 }}
    >
      {children}
    </m.div>
  );
}
