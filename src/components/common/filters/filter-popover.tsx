"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { FILTER_BUTTON } from "@/components/common/control-geometry";
import {
  Popover,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FacetPanel } from "./pill-shell";

/* ------------------------------------------------------------------ *
 *  The one Filters control, and the panel it opens.
 *
 *  Every facet lives in here now, rather than three on the toolbar and
 *  two behind a "More filters" disclosure. That split was what let the
 *  chrome grow a row: opening More filters pushed the whole page down.
 *  One button that opens one panel is a fixed height forever.
 *
 *  Desktop opens a popover anchored to the button; mobile opens the
 *  kit's existing FilterSheet (the caller picks, since the sheet has its
 *  own Show-N footer). Both render the SAME facet children, so the two
 *  breakpoints cannot drift.
 * ------------------------------------------------------------------ */

/**
 * The trigger. Carries the active count, because once the facets are hidden
 * behind it this button is the only place the page can say how many are set.
 */
export function FilterButton({
  count,
  open,
  onClick,
  compact,
  className,
}: {
  count: number;
  open?: boolean;
  onClick: () => void;
  /** Drops the word, keeping the icon + count, for a narrow column. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        /* bg-card, NOT the facet pills' bg-secondary (owner, 2026-08-03: "why
           is the filters button a different colour?"). It was a rung off its
           neighbours: --secondary is #F0EDE4 while the search box beside it
           and the view toggle under it are both --card #F5F2EA, so one row
           carried two surfaces five RGB steps apart. The facet pills keep
           --secondary, because they live on the Float-white panel where that
           rung is the right one; this button lives on the page, among page
           chrome, and takes the page chrome's surface.
           The OPEN state stays canopy via aria-expanded: selection is the
           app's one green state, and hover must not borrow it (pill-shell). */
        FILTER_BUTTON,
        "border-border bg-card text-foreground transition-transform duration-150 state-layer active:scale-[0.97] aria-expanded:border-canopy/35 aria-expanded:bg-canopy/[0.08] aria-expanded:text-canopy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      <SlidersHorizontal className="size-3.5" aria-hidden />
      {!compact && "Filters"}
      {count > 0 && <span className={compact ? "tabular-nums" : "tabular-nums opacity-80"}>{compact ? count : `· ${count}`}</span>}
    </button>
  );
}

/**
 * The desktop panel: the shared menu material holding the labelled facet
 * stack, and nothing else.
 *
 * It is a FIXED height (owner, 2026-08-03: "the filters drop down grows in
 * size with every filter, and even the smallest version of it is way bigger
 * than it needs to be"). Two things were wrong:
 *
 * - It grew. A "Clear all" row appeared the moment any facet was set, so the
 *   panel was one height empty and another height in use. That row is gone
 *   rather than reserved, because it was duplication: every set facet already
 *   carries its own `x`, and the sentence line under the toolbar already ends
 *   in a Clear all. The panel now has the same number of rows always.
 * - It was too big at rest. The facets render at h-9 in here rather than the
 *   toolbar's h-10, the stack gap drops to 6px, and the panel's own padding to
 *   10px. Five facets now come to ~215px against ~300px, and the width drops
 *   340 -> 300 since nothing in it needs 340.
 */
export function FilterPopover({
  open,
  onOpenChange,
  trigger,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger as React.ReactElement} />
      <PopoverPortal>
        <PopoverPositioner align="end" sideOffset={6}>
          <FacetPanel className={cn("w-[300px] space-y-1.5 p-2.5", className)}>
            {children}
          </FacetPanel>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
