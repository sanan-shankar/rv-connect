"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MENU_PANEL_CLASS } from "@/components/ui/menu-material";

/**
 * Shared visual language for every facet pill (FacetSelect, FacetSearchSelect,
 * RangeFacetPill, SortPill). Idle sits on the warm `--secondary` surface with
 * a `--border` hairline; Set tints canopy. Full pill,
 * Hover is a colour change only (owner, 2026-07-25: hover never moves a
 * control); the press sink stays (docs/spec/DESIGN-SYSTEM.md, filters-rework.md sec. 4).
 *
 * Focus ring: canopy, and only for keyboard focus. `--ring` (leaf) is the
 * INPUT ring; globals.css reserves it so a button never wears a mismatched
 * leaf halo, and these pills are buttons. The ring is keyed to the inner
 * trigger's `:focus-visible` (via `data-facet-trigger`) rather than
 * `focus-within`, so a plain mouse click leaves no halo and tabbing onto the
 * pill's clear `x` lights the x's own ring, not the whole pill.
 */
export const PILL_BASE =
  "inline-flex h-10 shrink-0 items-center rounded-full border text-[13px] font-medium transition-[colors,transform] duration-150 has-[[data-facet-trigger]:focus-visible]:ring-2 has-[[data-facet-trigger]:focus-visible]:ring-canopy/40 active:scale-[0.97]";

export const PILL_IDLE = "border-border bg-secondary text-foreground hover:bg-accent";

export const PILL_SET = "border-canopy/35 bg-canopy/[0.08] text-canopy hover:bg-canopy/[0.12]";

/** The item row used inside every facet's dropdown/panel list: the menu
 *  material's row (36px minimum, `--radius-sm` 8.8px -- concentric with the
 *  12px panel through its 4px inset -- highlight = the `--accent` lift). */
export const FACET_ITEM_CLASS =
  "flex min-h-9 w-full cursor-pointer scroll-my-1 items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm outline-none transition-transform duration-100 select-none data-highlighted:bg-accent data-highlighted:text-foreground hover:bg-accent hover:text-foreground active:scale-[0.99]";

/** The dropdown/popup surface every list facet opens: the shared menu
 *  material plus this kit's sizing (a scrolling list capped at 320px, at
 *  least as wide as its own trigger pill). */
export const FACET_POPUP_CLASS = cn(
  MENU_PANEL_CLASS,
  "max-h-80 w-(--anchor-width) min-w-48 overflow-x-hidden overflow-y-auto p-1"
);

/**
 * The popover-flavoured facet panel (City/House search, Batch range): the
 * same menu material, rendered from the Base UI Popup directly rather than
 * through ui/popover's PopoverContent, whose own wider-card class list
 * (27.2px radius, its own slide-in animation) tailwind-merge cannot reliably
 * strip back down to the material. Compose it inside ui/popover's
 * Popover/PopoverTrigger/PopoverPositioner, which this kit already uses.
 */
export function FacetPanel({ className, ...props }: PopoverPrimitive.Popup.Props) {
  return <PopoverPrimitive.Popup className={cn(MENU_PANEL_CLASS, "p-1", className)} {...props} />;
}

export function facetPillClass(set: boolean, className?: string) {
  return cn(PILL_BASE, set ? PILL_SET : PILL_IDLE, "pl-4", set ? "pr-1.5" : "pr-3", className);
}

/** The `x` that clears one facet without opening it. Stops propagation so the
 *  click never also fires the trigger it sits beside. */
export function FacetClearButton({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Clear ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        onClear();
      }}
      className="grid size-6 shrink-0 place-items-center rounded-full text-canopy/70 outline-none transition-transform duration-150 hover:bg-canopy/15 hover:text-canopy focus-visible:ring-2 focus-visible:ring-canopy/40 active:scale-90"
    >
      <X className="size-3.5" strokeWidth={2.25} />
    </button>
  );
}
