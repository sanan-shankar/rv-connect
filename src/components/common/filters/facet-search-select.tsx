"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FACET_ITEM_CLASS, FacetClearButton, FacetPanel, facetPillClass } from "./pill-shell";
import type { FacetOption } from "./types";

/**
 * One row of the searchable panel. Selection is a canopy check, never a
 * fill: the hover state is the shared state layer (FACET_ITEM_CLASS), and the
 * old selected wash reused the identical swatch, leaving hovered and
 * selected rows indistinguishable.
 */
function FacetSearchRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={cn(FACET_ITEM_CLASS, "gap-2")}>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected && <Check className="size-4 shrink-0 text-canopy" aria-hidden />}
    </button>
  );
}

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
        <PopoverTrigger
          data-facet-trigger=""
          className="flex min-w-0 flex-1 items-center gap-1.5 py-2 outline-none"
        >
          <span className="truncate">{text}</span>
          {!set && <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />}
        </PopoverTrigger>
        {set && <FacetClearButton label={label} onClear={() => onChange("")} />}
      </div>
      <PopoverPortal>
        <PopoverPositioner sideOffset={6} align="start">
          {/* p-0 + overflow-hidden: the option list below is a square-edged
              scroller flush with the panel bottom; without the clip its row
              highlight paints past the panel's 12px corner (the spill the
              owner saw on the City/House lists).

              The search input below used to carry a raw `autoFocus`, which
              is what was popping the keyboard on every open, including
              touch. Base UI's Popup already has the right behaviour without
              being told: opened by touch, it focuses the popup panel itself
              rather than a field (its own comment says so -- "prevent the
              virtual keyboard from opening"); opened by mouse or keyboard,
              it focuses the first tabbable descendant, which is this input.
              `autoFocus` was fighting that default rather than working with
              it. Removing it, with no `initialFocus` override needed, is the
              whole fix (verified: mobile now focuses nothing, desktop still
              gets a ready caret). */}
          <FacetPanel className="w-64 overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder ?? `Search ${label.toLowerCase()}...`}
                aria-label={`Search ${label.toLowerCase()}`}
                className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {/* The material's 4px inset lives on the scroller so rows stay
                concentric (12px panel - 4px = the 8.8px row radius). */}
            <div className="max-h-64 overflow-y-auto p-1">
              <FacetSearchRow
                label={anyLabel ?? `Any ${label.toLowerCase()}`}
                selected={!set}
                onClick={() => pick("")}
              />
              {filtered.map((o) => (
                <FacetSearchRow
                  key={o.value}
                  label={o.label}
                  selected={value === o.value}
                  onClick={() => pick(o.value)}
                />
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</p>
              )}
            </div>
          </FacetPanel>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
