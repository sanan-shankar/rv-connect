"use client";

/* ------------------------------------------------------------------ *
 *  <ProgressRing> - the soft countdown ring on the status console
 *  (spec 3.3: "a soft progress ring counting down questionsCloseAt" /
 *  "...answersCloseAt"). The colored arc represents time REMAINING (it
 *  shrinks as the window closes), which reads more intuitively as a
 *  countdown than an elapsed-time fill would.
 *
 *  `ratio` (0..1 elapsed) is computed server-side in page.tsx from the
 *  request's own clock, so the ring never has to read Date.now() on the
 *  client and risk a hydration mismatch.
 * ------------------------------------------------------------------ */

import { motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";

export function ProgressRing({
  ratio,
  size = 60,
  strokeWidth = 5,
  label,
  sublabel,
  tone = "leaf",
}: {
  /** 0..1, elapsed fraction of the window. */
  ratio: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  tone?: "leaf" | "cinnamon";
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const remaining = Math.max(0, Math.min(1, 1 - ratio));
  const color = tone === "cinnamon" ? "var(--color-cinnamon)" : "var(--color-leaf)";

  return (
    <div className="flex items-center gap-3.5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - remaining) }}
            transition={SPRINGS.gentle}
          />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight text-foreground">{label}</p>
        {sublabel && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}
