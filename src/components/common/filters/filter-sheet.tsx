"use client";

import type { ReactNode } from "react";
import { BottomSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * FilterSheet — the mobile bottom sheet that carries the full labelled facet
 * stack, with a `Clear all` / `Show N` footer (filters-rework.md sec. 5.2 /
 * 6.2). Same shell for the Directory and the admin lists; the facets
 * themselves are passed as children. The Collection left this kit in 8a0ba37
 * and owns its own river controls.
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
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      bodyClassName="space-y-3 pt-2"
      footer={
        <>
          {hasActive && (
            <button
              type="button"
              onClick={onClearAll}
              // A text action, not a filled control, so its hover is the rule
              // rather than a state layer: a tint behind px-1 of text would
              // read as a stray swatch next to the solid Show button. The
              // press is the scale, and transform is what the transition is
              // for -- nothing here changes colour. Kept identical to the
              // Clear all in sentence-line.tsx, its desktop counterpart.
              className="shrink-0 rounded-full px-1 text-sm font-semibold text-canopy underline-offset-2 outline-none transition-transform hover:underline active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
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
        </>
      }
    >
      {children}
    </BottomSheet>
  );
}
