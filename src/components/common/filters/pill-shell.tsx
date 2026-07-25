"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared visual language for every facet pill (FacetSelect, FacetSearchSelect,
 * RangeFacetPill, SortPill). Idle sits on the warm `--secondary` surface with
 * a `--border` hairline; Set tints canopy. Full pill, single Leaf focus ring,
 * Hover is a colour change only (owner, 2026-07-25: hover never moves a
 * control); the press sink stays (docs/spec/DESIGN-SYSTEM.md, filters-rework.md sec. 4).
 */
export const PILL_BASE =
  "inline-flex h-10 shrink-0 items-center rounded-full border text-[13px] font-medium transition-[colors,transform] duration-150 focus-within:ring-2 focus-within:ring-ring/50 active:scale-[0.97]";

export const PILL_IDLE = "border-border bg-secondary text-foreground hover:bg-secondary/70";

export const PILL_SET = "border-canopy/35 bg-canopy/[0.08] text-canopy hover:bg-canopy/[0.12]";

/** The item row used inside every facet's dropdown/panel list. */
export const FACET_ITEM_CLASS =
  "flex w-full cursor-pointer scroll-my-1 items-center rounded-[10px] px-3 py-2 text-left text-sm outline-none transition-transform duration-100 select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.99]";

/** The dropdown/popup surface every facet opens (Select popup, search panel, range popover). */
export const FACET_POPUP_CLASS =
  "max-h-80 w-(--anchor-width) min-w-48 origin-(--transform-origin) overflow-y-auto rounded-2xl bg-popover p-1.5 text-popover-foreground ring-1 ring-foreground/10 shadow-[0_18px_38px_-16px_rgba(35,36,30,0.28)] duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

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
