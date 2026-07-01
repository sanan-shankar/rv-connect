"use client";

/* ------------------------------------------------------------------ *
 *  The Letter reading view's title, ported from the approved preview
 *  "draw" entrance: the title rises in a beat after the page settles,
 *  and a cinnamon underline draws in beneath it (scaleX from the left).
 *  Light-mode app; transform/opacity only; motion runs by choice.
 * ------------------------------------------------------------------ */

import { motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";

export function LetterTitle({ title }: { title: string }) {
  return (
    <div className="relative mt-2 inline-block max-w-full">
      <motion.h1
        className="font-heading text-3xl font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-4xl"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRINGS.gentle, delay: 0.15 }}
      >
        {title}
      </motion.h1>
      <motion.span
        aria-hidden
        className="absolute -bottom-2 left-0 h-[2px] w-24 rounded-sm"
        style={{
          transformOrigin: "left center",
          background:
            "linear-gradient(90deg, var(--color-cinnamon), color-mix(in srgb, var(--color-cinnamon) 40%, transparent))",
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.15 }}
      />
    </div>
  );
}
