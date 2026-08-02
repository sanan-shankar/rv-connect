"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * FilterSheet — the mobile bottom sheet that carries the full labelled facet
 * stack, with a sticky `Clear all` / `Show N` footer (filters-rework.md
 * sec. 5.2 / 6.2). Same shell for Directory and Collection; the facets
 * themselves are passed as children.
 */
export function FilterSheet({
  open,
  onOpenChange,
  title = "Filters",
  children,
  onClearAll,
  hasActive,
  showLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  onClearAll: () => void;
  hasActive: boolean;
  showLabel: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-[var(--radius)] p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading text-xl tracking-tight">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">{children}</div>
        <div className="flex items-center gap-3 border-t border-border bg-background p-4">
          {hasActive && (
            <button
              type="button"
              onClick={onClearAll}
              // A text action, not a filled control, so its hover is the rule
              // rather than a state layer: a tint behind px-1 of text would
              // read as a stray swatch next to the solid Show button. The
              // press is the scale, and transform is what the transition is
              // for -- nothing here changes colour. Kept identical to the
              // Clear all in active-filter-chips.tsx, its desktop twin.
              className="shrink-0 rounded-full px-1 text-sm font-semibold text-canopy underline-offset-2 outline-none transition-transform hover:underline focus-visible:ring-2 focus-visible:ring-canopy/40 active:scale-95"
            >
              Clear all
            </button>
          )}
          <Button
            type="button"
            variant="primary"
            className="ml-auto flex-1 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {showLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
