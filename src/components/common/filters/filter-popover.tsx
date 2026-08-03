"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
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
        // Matches the facet pills' idle shell exactly (PILL_BASE + PILL_IDLE),
        // written out rather than imported because this is a plain button with
        // no facet trigger inside it to hang the focus ring off.
        // The OPEN state stays canopy via aria-expanded: selection is the app's
        // one green state, and hover must not borrow it (see pill-shell.tsx).
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-4 text-[13px] font-medium text-foreground transition-transform duration-150 state-layer active:scale-[0.97] aria-expanded:border-canopy/35 aria-expanded:bg-canopy/[0.08] aria-expanded:text-canopy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
 * The desktop panel: the shared menu material, holding the full labelled
 * facet stack and a Clear all. Width is fixed rather than anchor-derived,
 * because the trigger is a small pill and the facets inside want room.
 */
export function FilterPopover({
  open,
  onOpenChange,
  trigger,
  children,
  onClearAll,
  hasActive,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  onClearAll: () => void;
  hasActive: boolean;
  className?: string;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger as React.ReactElement} />
      <PopoverPortal>
        <PopoverPositioner align="end" sideOffset={6}>
          <FacetPanel className={cn("w-[340px] p-3", className)}>
            <div className="space-y-2.5">{children}</div>
            {hasActive && (
              <div className="mt-3 flex justify-end border-t border-border pt-2.5">
                <button
                  type="button"
                  onClick={onClearAll}
                  className="rounded-full px-2 py-1 text-[12.5px] font-semibold text-canopy underline-offset-2 transition-transform hover:underline active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
                >
                  Clear all
                </button>
              </div>
            )}
          </FacetPanel>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
