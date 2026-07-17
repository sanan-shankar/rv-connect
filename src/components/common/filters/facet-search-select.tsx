"use client";

import { useMemo, useState } from "react";
import { ChevronDown, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FACET_ITEM_CLASS, FacetClearButton, facetPillClass } from "./pill-shell";
import type { FacetOption } from "./types";

/**
 * FacetSearchSelect — the searchable-panel variant for long option lists
 * (City, House): a search input at the top of the panel, then the filtered
 * options (filters-rework.md sec. 4, "Variants"). Same labelled-value pill
 * shell as FacetSelect; built on the Popover primitive (rather than the
 * Combobox primitive location-picker.tsx uses) because the trigger here is a
 * pill button, not a persistent search input.
 */
export function FacetSearchSelect({
  label,
  value,
  onChange,
  options,
  anyLabel,
  searchPlaceholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FacetOption[];
  anyLabel?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const set = value !== "";
  const selected = options.find((o) => o.value === value);
  const text = set ? `${label}: ${selected?.label ?? value}` : label;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <div className={facetPillClass(set, className)}>
        <PopoverTrigger className="flex min-w-0 flex-1 items-center gap-1.5 py-2 outline-none">
          <span className="truncate">{text}</span>
          {!set && <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />}
        </PopoverTrigger>
        {set && <FacetClearButton label={label} onClear={() => onChange("")} />}
      </div>
      <PopoverPortal>
        <PopoverPositioner sideOffset={6} align="start">
          <PopoverContent className="w-64 p-0">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder ?? `Search ${label.toLowerCase()}...`}
                aria-label={`Search ${label.toLowerCase()}`}
                className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1.5">
              <button
                type="button"
                onClick={() => pick("")}
                className={cn(FACET_ITEM_CLASS, !set && "bg-accent text-accent-foreground")}
              >
                {anyLabel ?? `Any ${label.toLowerCase()}`}
              </button>
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pick(o.value)}
                  className={cn(FACET_ITEM_CLASS, value === o.value && "bg-accent text-accent-foreground")}
                >
                  {o.label}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</p>
              )}
            </div>
          </PopoverContent>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
