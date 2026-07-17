"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveChip {
  key: string;
  /** Already formatted as "Label: Value". */
  label: string;
  onClear: () => void;
}

/**
 * The mobile chip strip: mirrors whatever facets are set (since the pills
 * themselves live inside the FilterSheet on small screens), plus Clear all.
 * Horizontally scrollable so it never wraps into a second line.
 */
export function ActiveFilterChips({
  chips,
  onClearAll,
  className,
}: {
  chips: ActiveChip[];
  onClearAll?: () => void;
  className?: string;
}) {
  if (chips.length === 0) return null;
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto pr-4 pb-1", className)}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-canopy/35 bg-canopy/[0.08] py-1.5 pl-3 pr-1.5 text-[12.5px] font-medium text-canopy transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy/40 active:scale-95"
        >
          <span className="truncate">{chip.label}</span>
          <X className="size-3.5 shrink-0" strokeWidth={2.25} />
        </button>
      ))}
      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-canopy underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy/40 active:scale-95"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
