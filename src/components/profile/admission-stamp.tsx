"use client";

import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";

/**
 * The admission-number stamp - a cinnamon double-ruled archival accession
 * mark that thumps into place on mount. Never a hashtag.
 *
 * The "ink soaked into paper" wash lives on its own absolute layer with
 * mix-blend-multiply; the stroke and numerals sit on a separate, un-blended
 * layer in true `border-cinnamon` / `text-cinnamon`. Blending the ink colour
 * against the warm card tone shifts it toward a muddier, redder hue, so the
 * two layers stay split to keep the stamp true brand cinnamon (#C2622F).
 *
 * Ported verbatim in spirit from the Dossier preview variant.
 */
export function AdmissionStamp({
  number,
  className,
}: {
  number: number;
  className?: string;
}) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 1.5, rotate: -16 }}
      animate={{ opacity: 1, scale: 1, rotate: -7 }}
      transition={{ ...SPRINGS.snappy, delay: 0.3 }}
      className={cn("pointer-events-none relative select-none", className)}
      aria-label={`Admission number ${number}`}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[6px] bg-cinnamon/[0.08]"
        style={{ mixBlendMode: "multiply" }}
      />
      <div className="relative rounded-[6px] border-[1.5px] border-cinnamon px-4 py-2 text-center">
        <span aria-hidden className="absolute inset-[3px] rounded-[3px] border border-cinnamon/70" />
        <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-cinnamon">
          Admission No.
        </p>
        <p className="mt-0.5 font-heading text-[20px] font-bold leading-none tracking-[0.02em] text-cinnamon">
          {number}
        </p>
      </div>
    </m.div>
  );
}
