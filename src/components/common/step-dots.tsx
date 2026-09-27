"use client";

import { cn } from "@/lib/utils";

/**
 * StepDots: where you are in a short sequence of steps. The current step is a
 * long canopy pill, the ones behind it are fainter dots you can press to go
 * back to, and the ones ahead are plain dots that do nothing yet.
 *
 * Shared by the two sequences in the app, the setup wizard at /welcome and
 * the guide's first-run tour, so a new member meets the same mark in both.
 * It was inline in onboarding-flow.tsx until the tour needed it too.
 */
export function StepDots({
  count,
  current,
  onPick,
  labelFor,
  tone = "paper",
  className,
}: {
  count: number;
  current: number;
  onPick: (index: number) => void;
  /** The accessible name of the dot at `index`, e.g. "Go back to step 2". */
  labelFor: (index: number) => string;
  /** "photo" on a darkened photograph (the guide's cover), where canopy on
   *  near-black and the paper-coloured border would both disappear. */
  tone?: "paper" | "photo";
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-[var(--space-xs)]", className)}
      role="group"
      aria-label={`Step ${current + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => {
        const state = i === current ? "current" : i < current ? "done" : "upcoming";
        return (
          <button
            key={i}
            type="button"
            aria-label={labelFor(i)}
            aria-current={state === "current" ? "step" : undefined}
            disabled={state === "upcoming"}
            onClick={() => state === "done" && onPick(i)}
            className={cn(
              "h-2 rounded-full transition-[width,background-color,opacity] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              state === "current" && (tone === "photo" ? "w-6 bg-card" : "w-6 bg-canopy"),
              state === "done" && "w-2 cursor-pointer bg-canopy/45 hover:bg-canopy/70",
              state === "upcoming" &&
                (tone === "photo" ? "w-2 cursor-default bg-card/35" : "w-2 cursor-default bg-border")
            )}
          />
        );
      })}
    </div>
  );
}
