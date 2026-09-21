import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FILTER_BUTTON,
  SEGMENTED_COUNT,
  SEGMENTED_SEGMENT,
  SEGMENTED_TRACK,
  SEGMENTED_TRACK_HUG,
} from "./control-geometry";

/**
 * Pieces the loading screens share, for the few shapes that recur across
 * them. Everything else in a skeleton is the page's own markup with the ink
 * taken out, written beside the page it stands in for.
 */

/**
 * A Button before its page arrives: the real Button, rendered as an inert div
 * with its label set invisible and its colour taken off.
 *
 * The real component rather than a copy of its classes, because the point of
 * a placeholder is to be the box the button will be -- its height, its
 * padding, the 4px optical correction it takes beside a leading icon, and the
 * width of its words -- at every breakpoint and in every font. A hand-sized
 * pill is right at the one width somebody measured it at and wrong at the
 * others, which is how the directory's Filters pill came to be 88px on a
 * phone that draws a 48px one.
 *
 * `variant={null}` drops the variant's colours (cva's own opt-out); the empty
 * svg is what Button reads as a leading icon, so the correction fires exactly
 * as it does for the real one, and it carries no size of its own so the
 * button's size sets it, 16px at the default and 14px at `sm`, as it does for
 * the real icon. Disabled and aria-hidden, so the stand-in is
 * never a focus stop or something a screen reader announces.
 */
export function ButtonSkeleton({
  label,
  icon = false,
  size,
  className,
}: {
  label: string;
  icon?: boolean;
  size?: "default" | "xs" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Button
      render={<div aria-hidden />}
      nativeButton={false}
      disabled
      variant={null}
      size={size}
      className={cn("skeleton-warm pointer-events-none", className)}
    >
      {icon && <svg aria-hidden />}
      <span className="invisible">{label}</span>
    </Button>
  );
}

/**
 * A run of known words before its page arrives: a bar exactly as wide as the
 * words, centred on the line, because the words themselves are there,
 * invisible, setting the width. For text that is fixed but must not be drawn
 * yet -- a heading inside a step that rises in on arrival, where drawn words
 * would vanish and rise in again. The bar is 0.6em, so it scales with
 * whatever type the caller wraps it in.
 */
export function TextSkeleton({ children }: { children: string }) {
  return (
    <span className="relative inline-block">
      <span className="invisible">{children}</span>
      <span className="skeleton-warm absolute inset-x-0 top-1/2 h-[0.6em] -translate-y-1/2 rounded-md" />
    </span>
  );
}

/**
 * SegmentedPills before its page arrives: the control's own track and
 * segments (control-geometry.ts), shimmering, with the labels and any
 * counts set invisible so each segment is as wide as the real one. `count` is
 * a sample of the figure the segment carries ("0", "12"), for its width only.
 */
export function SegmentedPillsSkeleton({
  segments,
  className,
  style,
}: {
  segments: { label: string; count?: string }[];
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("skeleton-warm border-transparent", SEGMENTED_TRACK, SEGMENTED_TRACK_HUG, className)}
      style={style}
    >
      {segments.map(({ label, count }) => (
        <span key={label} className={cn("invisible shrink-0", SEGMENTED_SEGMENT)}>
          {label}
          {count !== undefined && <span className={SEGMENTED_COUNT}>{count}</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * FilterButton before its page arrives: its own box with the word invisible.
 * `compactBelowSm` for the one caller whose phone gets the icon-only button
 * (the directory); the admin lists keep the word at every width.
 */
export function FilterButtonSkeleton({ compactBelowSm = false }: { compactBelowSm?: boolean }) {
  return (
    <div className={cn("skeleton-warm border-transparent", FILTER_BUTTON)}>
      <span className="size-3.5" />
      <span className={cn("invisible", compactBelowSm && "hidden sm:inline")}>Filters</span>
    </div>
  );
}
