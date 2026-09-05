"use client";

/* ------------------------------------------------------------------ *
 *  <SegmentedPills> - THE segmented pill control for the app: a
 *  rounded-full track with a hairline border and a canopy-FILLED thumb
 *  that glides between segments on a shared `layoutId`, white label on
 *  the active segment, muted label otherwise.
 *
 *  Extracted 2026-08-02 from the profile's Writing switcher (the
 *  reference look), per the owner: the profile switcher and the
 *  Catch-ups cadence control were flagged as the same control drawn
 *  twice and owed a shared home (progress.md, 2026-07-30 entry). The
 *  same session also swept the directory view toggle and the signup
 *  account-type toggle onto this component, both of which used to draw
 *  a canopy OUTLINE thumb (`border-canopy bg-canopy/10`) instead of the
 *  fill - the owner asked for one consistent look, not two.
 *
 *  Three axes of real variance across the call sites, and nothing more
 *  than that is exposed as a prop:
 *   - `count`: profile shows a trailing count per segment (12 posts,
 *     4 letters); directory, signup and Catch-ups don't. Optional per
 *     segment so a control can be all-counted, all-bare, or omit it
 *     per row - callers only ever do one or the other today.
 *   - `role`: "tablist" (profile, directory) switches between different
 *     content panels; "radiogroup" (signup, Catch-ups) is a single-choice
 *     form field. Only changes the ARIA role/attribute pattern
 *     (tab + aria-selected vs radio + aria-checked); the visuals are
 *     identical either way, so it is not worth two components.
 *   - `fill`: signup's toggle sits in a `grid grid-cols-2` beside an
 *     InfoTip and must stretch to fill its row; every other call site
 *     sizes to its labels and never grows past them.
 *  A fourth field, `warm`, was added per segment on 2026-09-05. It is not a
 *  fourth axis of variance -- it draws nothing and changes nothing about the
 *  control -- it is a hover hook for a segment whose panel is behind a lazy
 *  chunk. One segment in the app uses it: the directory's Map.
 *  Track background/shadow (profile's `bg-card` + soft shadow, directory's
 *  bare `bg-card`, signup's `bg-paper`, Catch-ups' `bg-muted/40`) is
 *  deliberately NOT baked in - it is the one thing that differs for a
 *  reason unrelated to this control (which surface it sits on), so it
 *  stays a `className`/`style` passthrough rather than a fourth prop.
 * ------------------------------------------------------------------ */

import type { CSSProperties } from "react";
import { m } from "motion/react";
import { EASE_SEGMENT_GLIDE, SEGMENT_GLIDE_SECONDS } from "@/components/common/motion";
import { cn } from "@/lib/utils";

export interface SegmentedPillsSegment<T extends string> {
  key: T;
  label: string;
  /** Trailing count badge (profile's post/letter/photo counts). Omit the
   *  field entirely on segments that should show no badge. */
  count?: number;
  /** Fired on pointer-enter and on focus, before the press. For a segment
   *  whose panel is behind a lazy chunk: the directory's Map is 66 KB of d3
   *  that only arrives when somebody asks for it, and asking is what a hover
   *  is. Per segment rather than per control, and optional, for the same
   *  reason `count` is -- exactly one segment in the app has anything to
   *  warm. Must be idempotent; it fires on every pass of the cursor. */
  warm?: () => void;
}

export function SegmentedPills<T extends string>({
  segments,
  value,
  onChange,
  ariaLabel,
  layoutId,
  role = "tablist",
  fill = false,
  className,
  style,
}: {
  segments: SegmentedPillsSegment<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Namespace for the shared gliding thumb's Motion `layoutId`. Two
   *  SegmentedPills mounted on one screen at once (a Catch-up's cadence
   *  AND reminder controls, say) must pass different namespaces, or
   *  Motion will try to glide a single shared element between both
   *  tracks the moment either one's selection changes. */
  layoutId: string;
  /** "tablist": switching reveals a different content panel (profile's
   *  All/Posts/Letters/Saved, directory's Map/Batches/People).
   *  "radiogroup": a single-choice form field (signup's account type, a
   *  Catch-up's cadence). Default matches the profile reference. */
  role?: "tablist" | "radiogroup";
  /**
   * The track spans its row and the segments split it in equal columns,
   * instead of the track hugging its labels.
   *
   * This is ONE prop rather than two on purpose. A caller used to stretch the
   * track by passing `w-full` in `className` while leaving the segments
   * label-sized, which is how the directory's mobile toggle ended up as a
   * full-width bar with both options bunched against its left edge (owner,
   * 2026-08-04: "each option should take up half of that pill, it shouldn't
   * be squashed to one side ... that applies with all such pills"). Width and
   * distribution have to move together, so `fill` now owns both and no call
   * site should be setting a width itself.
   */
  fill?: boolean;
  /** Track background/shadow/margin - each call site sits on a different
   *  surface (card, paper, muted), see file header. */
  className?: string;
  style?: CSSProperties;
}) {
  const itemRole = role === "tablist" ? "tab" : "radio";

  return (
    <div
      role={role}
      aria-label={ariaLabel}
      style={
        fill
          ? { gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))`, ...style }
          : style
      }
      className={cn(
        "items-center rounded-full border border-border p-1",
        fill ? "grid w-full gap-1.5" : "inline-flex w-fit max-w-full gap-1",
        className
      )}
    >
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <button
            key={segment.key}
            type="button"
            role={itemRole}
            {...(role === "tablist" ? { "aria-selected": active } : { "aria-checked": active })}
            onClick={() => onChange(segment.key)}
            onPointerEnter={segment.warm}
            onFocus={segment.warm}
            className={cn(
              "relative inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-200 active:scale-[0.97] sm:px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              !fill && "shrink-0",
              active ? "text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <m.span
                layoutId={`${layoutId}-thumb`}
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: SEGMENT_GLIDE_SECONDS, ease: EASE_SEGMENT_GLIDE }}
                className="absolute inset-0 rounded-full bg-canopy shadow-[0_5px_13px_-12px_var(--color-canopy)]"
              />
            )}
            <span className="relative">{segment.label}</span>
            {segment.count !== undefined && (
              <span
                className={cn(
                  "relative text-[11.5px] font-semibold tabular-nums",
                  active ? "text-white/70" : "text-muted-foreground/60"
                )}
              >
                {segment.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
