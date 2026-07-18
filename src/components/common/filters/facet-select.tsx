"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FACET_ITEM_CLASS, FACET_POPUP_CLASS, FacetClearButton, facetPillClass } from "./pill-shell";
import type { FacetOption } from "./types";

const ANY = "__any__";

/**
 * The dropdown body shared by FacetSelect and SortPill: same portal/positioner/
 * popup/list/item tree, differing only in whether an "Any ..." clear row is
 * prepended.
 */
function FacetOptionsPopup({
  options,
  anyItem,
}: {
  options: FacetOption[];
  anyItem?: { value: string; label: string };
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        sideOffset={6}
        align="start"
        alignItemWithTrigger={false}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup className={FACET_POPUP_CLASS}>
          <SelectPrimitive.List className="flex flex-col gap-0.5">
            {anyItem && (
              <SelectPrimitive.Item value={anyItem.value} className={cn(FACET_ITEM_CLASS, "cursor-default")}>
                <SelectPrimitive.ItemText>{anyItem.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            )}
            {options.map((o) => (
              <SelectPrimitive.Item key={o.value} value={o.value} className={cn(FACET_ITEM_CLASS, "cursor-default")}>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

/**
 * FacetSelect — the labelled-value pill for a single-choice facet (Profession,
 * House, Open to, Type, When, Part of school...). Renders its own
 * `Label: Value` text from props (never `<SelectValue>`), so it can never
 * echo a raw option id. Empty reads just the label; set reads `Label: Value`
 * in canopy with an `x` that clears the facet without opening the dropdown.
 */
export function FacetSelect({
  label,
  value,
  onChange,
  options,
  anyLabel,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FacetOption[];
  /** Text for the always-first "clear" row, e.g. "Any profession". */
  anyLabel?: string;
  className?: string;
}) {
  const set = value !== "";
  const selected = options.find((o) => o.value === value);
  const text = set ? `${label}: ${selected?.label ?? value}` : label;

  return (
    <SelectPrimitive.Root
      value={set ? value : ANY}
      onValueChange={(v) => onChange(v === ANY ? "" : String(v ?? ""))}
    >
      <div className={facetPillClass(set, className)}>
        <SelectPrimitive.Trigger className="flex min-w-0 flex-1 items-center gap-1.5 py-2 outline-none">
          <span className="truncate">{text}</span>
          {!set && <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />}
        </SelectPrimitive.Trigger>
        {set && <FacetClearButton label={label} onClear={() => onChange("")} />}
      </div>
      <FacetOptionsPopup options={options} anyItem={{ value: ANY, label: anyLabel ?? `Any ${label.toLowerCase()}` }} />
    </SelectPrimitive.Root>
  );
}

/**
 * SortPill — a FacetSelect variant that always has a value and is never
 * removable (no "Any" row, no `x`). Reads `Sort: Newest`. Stays neutral
 * (never canopy-tinted) even though it always carries a value: canopy means
 * "narrowing your results", and sort never narrows.
 */
export function SortPill({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FacetOption[];
  className?: string;
}) {
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <SelectPrimitive.Root
      value={selected.value}
      onValueChange={(v) => onChange(String(v ?? selected.value))}
    >
      <div className={facetPillClass(false, className)}>
        <SelectPrimitive.Trigger className="flex min-w-0 flex-1 items-center gap-1.5 py-2 outline-none">
          <span className="truncate">Sort: {selected.label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
        </SelectPrimitive.Trigger>
      </div>
      <FacetOptionsPopup options={options} />
    </SelectPrimitive.Root>
  );
}
