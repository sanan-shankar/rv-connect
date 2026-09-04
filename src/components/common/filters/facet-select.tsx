"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FACET_ITEM_CLASS, FACET_POPUP_CLASS, FacetClearButton, facetPillClass } from "./pill-shell";
import type { FacetOption } from "./types";

const ANY = "__any__";

/**
 * One option row: label left, and a canopy check on the selected value.
 * Selection is a check, never a fill -- the `--accent` wash is the
 * hover/keyboard-highlight state, and a selected row that reused it would
 * read as two rows hovered at once.
 */
function FacetOptionRow({ value, label }: { value: string; label: string }) {
  return (
    <SelectPrimitive.Item value={value} className={cn(FACET_ITEM_CLASS, "gap-2")}>
      <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">{label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ml-auto shrink-0">
        <Check className="size-4 text-canopy" aria-hidden />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

/** The dropdown body: portal, positioner, popup, list, and an "Any ..." clear
 *  row above the options. It was shared with SortPill until 2026-09-05, which
 *  is why `anyItem` was optional; FacetSelect is the only caller now and always
 *  passes one. */
function FacetOptionsPopup({
  options,
  anyItem,
}: {
  options: FacetOption[];
  anyItem: { value: string; label: string };
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
            <FacetOptionRow value={anyItem.value} label={anyItem.label} />
            {options.map((o) => (
              <FacetOptionRow key={o.value} value={o.value} label={o.label} />
            ))}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

/**
 * FacetSelect — the labelled-value pill for a single-choice facet (Profession,
 * House, Type, When, Part of school...). Renders its own
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
        <SelectPrimitive.Trigger
          data-facet-trigger=""
          className="flex min-w-0 flex-1 items-center gap-1.5 py-2 outline-none"
        >
          <span className="truncate">{text}</span>
          {!set && <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />}
        </SelectPrimitive.Trigger>
        {set && <FacetClearButton label={label} onClear={() => onChange("")} />}
      </div>
      <FacetOptionsPopup options={options} anyItem={{ value: ANY, label: anyLabel ?? `Any ${label.toLowerCase()}` }} />
    </SelectPrimitive.Root>
  );
}
