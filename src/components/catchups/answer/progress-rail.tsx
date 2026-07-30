"use client";

/* ------------------------------------------------------------------ *
 *  <ProgressRail> / <MobileProgressBar> — a sticky left rail: the ring
 *  ("4 of 7 shared") over every question as a row with a check state.
 *  Mobile collapses to a slim sticky bar carrying the same one count.
 *
 *  This is the ONLY place the Round's count is printed. The answer card
 *  used to repeat it as "Question N of M"; that duplicate is gone.
 * ------------------------------------------------------------------ */

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { SPRINGS, SpringPress } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import type { AnswerPromptData } from "./types";

function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 44;
  const strokeWidth = 4;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-canopy)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={SPRINGS.gentle}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-foreground">
        {done}/{total}
      </span>
    </div>
  );
}

export function ProgressRail({
  prompts,
  answeredIds,
  currentIndex,
  onJump,
}: {
  prompts: AnswerPromptData[];
  answeredIds: Set<string>;
  currentIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <div className="sticky top-7 flex flex-col gap-[var(--space-m)]">
      <div className="flex items-center gap-3.5 rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
        <ProgressRing done={answeredIds.size} total={prompts.length} />
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-foreground">
            {answeredIds.size} of {prompts.length} shared
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">Every question is optional.</p>
        </div>
      </div>

      <nav
        aria-label="Questions in this Round"
        className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-card p-[var(--space-s)]"
      >
        {prompts.map((p, i) => {
          const done = answeredIds.has(p.id);
          const active = i === currentIndex;
          return (
            <SpringPress
              key={p.id}
              as="button"
              onClick={() => onJump(i)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-start gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-[13px] leading-snug hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active ? "bg-secondary text-foreground" : "text-muted-foreground"
              )}
              {...({ type: "button", "aria-current": active ? "step" : undefined } as object)}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                  done ? "border-canopy bg-canopy text-white" : "border-border"
                )}
              >
                {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              <span className="line-clamp-2">{p.text}</span>
            </SpringPress>
          );
        })}
      </nav>
    </div>
  );
}

export function MobileProgressBar({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <div
      className={cn(
        "glass sticky top-14 z-[var(--z-elevated)] rounded-[var(--radius-md)] border border-border/70 px-4 py-2.5",
        className
      )}
    >
      <p className="text-xs font-semibold text-muted-foreground">
        {done} of {total} shared
      </p>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-mist">
        <motion.div
          className="h-full w-full origin-left rounded-full bg-canopy"
          initial={false}
          animate={{ scaleX: pct }}
          transition={SPRINGS.gentle}
        />
      </div>
    </div>
  );
}
