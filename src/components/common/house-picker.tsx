"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HOUSES, normalizeHouse } from "@/lib/houses";

/**
 * Grouped house picker: a popover grid of pills, in the owner's canonical
 * house order, with comfortable 40px+ touch targets. More than one house can
 * be selected for a year (two houses in one year is allowed), plus a
 * free-typed "Other" entry for anything outside the canonical 22. The value is
 * a plain string[] so callers never need to know which entries are canonical.
 *
 * Filling in a whole school career is a repetitive, one-house-per-year task,
 * so the picker is tuned for that run rather than for a single isolated edit:
 *
 * - `yearLabel` prints the year INSIDE the panel. Previously the panel opened
 *   over the row list, so once it was up you could no longer see which year you
 *   were answering for.
 * - Picking a house commits, closes, and calls `onPicked`, so the editor can
 *   open the next year automatically. No dismiss-click between years.
 * - On desktop the panel opens to the SIDE, leaving the year rows visible.
 *   Narrow viewports have no room for that, so they keep the standard
 *   below-the-trigger placement (where the in-panel year label carries the
 *   context on its own).
 *
 * Deselecting a house deliberately does NOT close: that is a correction, and
 * yanking the panel away mid-fix would be hostile.
 */
export function HousePicker({
  value,
  onChange,
  ariaLabel = "Houses",
  placeholder = "Pick a house",
  yearLabel,
  open: controlledOpen,
  onOpenChange,
  onPicked,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  ariaLabel?: string;
  placeholder?: string;
  /** e.g. "2014-15". Shown as the panel heading so the year stays on screen. */
  yearLabel?: string;
  /** Optional controlled open, so a parent can advance through years. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Fired after a house is added, once the panel has closed. */
  onPicked?: () => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [wide, setWide] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  // Side placement is decided from the viewport rather than left to collision
  // flipping: at 390px a "right" panel has nowhere to flip to that isn't also
  // off-screen, so it would end up shifted over the rows anyway.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const canonicalSet: ReadonlySet<string> = new Set(HOUSES);
  const customEntries = value.filter((v) => !canonicalSet.has(v));

  function toggleHouse(h: string) {
    if (value.includes(h)) {
      onChange(value.filter((v) => v !== h));
      return;
    }
    onChange([...value, h]);
    setOpen(false);
    onPicked?.();
  }

  function addOther() {
    const name = normalizeHouse(otherText);
    if (!name) return;
    if (!value.includes(name)) onChange([...value, name]);
    setOtherText("");
    setOpen(false);
    onPicked?.();
  }

  function removeCustom(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={ariaLabel}
        className="flex min-h-10 w-full flex-1 flex-wrap items-center gap-1.5 rounded-[var(--radius-input)] border border-input bg-transparent px-3 py-1.5 text-left text-[13px] outline-none transition-colors hover:border-ring/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          value.map((h) => (
            <span
              key={h}
              className={cn(
                "rounded-full px-2.5 py-1 text-[12.5px] font-semibold",
                canonicalSet.has(h) ? "bg-canopy/10 text-canopy" : "bg-cinnamon/10 text-cinnamon"
              )}
            >
              {h}
            </span>
          ))
        )}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner sideOffset={8} align="start" side={wide ? "right" : "bottom"}>
          <PopoverContent className="w-[300px] space-y-3">
            {yearLabel && (
              <p className="text-[13px] font-semibold text-foreground">
                Which house in{" "}
                <span className="tabular-nums text-canopy">{yearLabel}</span>?
              </p>
            )}
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Pick one or more houses">
              {HOUSES.map((h) => {
                const selected = value.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleHouse(h)}
                    className={cn(
                      "flex min-h-10 items-center justify-center rounded-full border px-2.5 py-2 text-center text-[13px] font-semibold leading-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]",
                      selected
                        ? "border-canopy bg-canopy text-white"
                        : "border-border bg-mist/50 text-foreground hover:border-canopy/40 hover:bg-canopy/10"
                    )}
                  >
                    {h}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              <p className="text-[12px] font-medium text-muted-foreground">Not listed?</p>
              <div className="flex items-center gap-1.5">
                <Input
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOther();
                    }
                  }}
                  placeholder="Type a house name"
                  aria-label="Type a house name"
                  className="h-9 flex-1 text-[13px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Add this house"
                  onClick={addOther}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {customEntries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customEntries.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full bg-cinnamon/10 px-2.5 py-1 text-[12px] font-semibold text-cinnamon"
                    >
                      {name}
                      <button
                        type="button"
                        aria-label={`Remove ${name}`}
                        onClick={() => removeCustom(name)}
                        className="rounded-full text-cinnamon/70 outline-none transition-colors hover:text-cinnamon focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
