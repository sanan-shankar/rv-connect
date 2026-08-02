"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FacetClearButton, FacetPanel, facetPillClass } from "./pill-shell";

const DECADE_PRESETS = [
  { label: "2020s", from: 2020, to: 2029 },
  { label: "2010s", from: 2010, to: 2019 },
  { label: "2000s", from: 2000, to: 2009 },
  { label: "1990s", from: 1990, to: 1999 },
];

const YEAR_SELECT_CLASS =
  "h-9 rounded-[var(--radius-input)] border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * RangeFacetPill — the Batch year-range facet: one labelled pill that opens a
 * From/To popover (plus decade quick-presets) instead of two bare inputs.
 * Renders `Batch: 2010 to 2018`, `Batch: 2010 onward`, or `Batch: up to 2005`.
 */
export function RangeFacetPill({
  label = "Batch",
  from,
  to,
  onChange,
  minYear,
  maxYear,
  className,
}: {
  label?: string;
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  minYear: number;
  maxYear: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const set = from !== "" || to !== "";
  const text = from && to
    ? `${label}: ${from} to ${to}`
    : from
      ? `${label}: ${from} onward`
      : to
        ? `${label}: up to ${to}`
        : label;

  const years =
    maxYear >= minYear
      ? Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)
      : [];

  const presets = DECADE_PRESETS.filter((d) => d.to >= minYear && d.from <= maxYear);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={facetPillClass(set, className)}>
        <PopoverTrigger
          data-facet-trigger=""
          className="flex min-w-0 flex-1 items-center gap-1.5 py-2 outline-none"
        >
          <span className="truncate">{text}</span>
          {!set && <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />}
        </PopoverTrigger>
        {set && <FacetClearButton label={label} onClear={() => onChange({ from: "", to: "" })} />}
      </div>
      <PopoverPortal>
        <PopoverPositioner sideOffset={6} align="start">
          {/* Same menu material as every other facet panel, but p-3: this
              panel holds form controls, not menu rows, and the material's
              4px inset is sized for row highlights. 12px of air also keeps
              the 12px-radius year inputs' corners clear of the panel's own
              12px arc (inset >= radius, so the two curves never read against
              each other despite being equal). */}
          <FacetPanel className="w-72 p-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                From
                <select
                  value={from}
                  onChange={(e) => onChange({ from: e.target.value, to })}
                  className={YEAR_SELECT_CLASS}
                >
                  <option value="">Any</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                To
                <select
                  value={to}
                  onChange={(e) => onChange({ from, to: e.target.value })}
                  className={YEAR_SELECT_CLASS}
                >
                  <option value="">Any</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {presets.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {presets.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() =>
                      onChange({
                        from: String(Math.max(d.from, minYear)),
                        to: String(Math.min(d.to, maxYear)),
                      })
                    }
                    // Canopy focus ring: --ring (leaf) is the INPUT ring
                    // only; these presets are buttons (globals.css token
                    // note), unlike the year <select>s above which keep it.
                    //
                    // state-layer, not hover:bg-accent: these chips render on
                    // the FacetPanel, which is Float white, and --accent on
                    // white measured -2.42 dL* -- the hover inverted and
                    // vanished. The ink tint lands at -4.72 there instead.
                    // transition-transform only: the layer is a
                    // background-image, which cannot tween; the press can.
                    className="state-layer rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </FacetPanel>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
