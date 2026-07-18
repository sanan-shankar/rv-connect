"use client";

import { useState } from "react";
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
 * house order, with comfortable 40px+ touch targets, replacing the old long
 * flat <select> dropdown. More than one house can be selected at once (the
 * owner: two houses in the same year is allowed), plus a free-typed "Other"
 * entry for anything not in the 22. The value is a plain string[] so callers
 * never need to know which entries are canonical vs. custom.
 */
export function HousePicker({
  value,
  onChange,
  ariaLabel = "Houses",
  placeholder = "Pick a house",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [otherText, setOtherText] = useState("");

  const canonicalSet: ReadonlySet<string> = new Set(HOUSES);
  const customEntries = value.filter((v) => !canonicalSet.has(v));

  function toggleHouse(h: string) {
    onChange(value.includes(h) ? value.filter((v) => v !== h) : [...value, h]);
  }

  function addOther() {
    const name = normalizeHouse(otherText);
    if (!name) return;
    if (!value.includes(name)) onChange([...value, name]);
    setOtherText("");
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
        <PopoverPositioner sideOffset={8} align="start">
          <PopoverContent className="w-[300px] space-y-3">
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
                      "flex min-h-10 items-center justify-center rounded-full border px-2.5 py-2 text-center text-[13px] font-semibold leading-tight transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]",
                      selected
                        ? "border-canopy bg-canopy text-white"
                        : "border-border bg-mist/50 text-foreground hover:border-canopy/40"
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
