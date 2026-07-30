"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Plus, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HOUSES, normalizeHouse } from "@/lib/houses";
import { SPRINGS } from "@/components/common/motion";

/**
 * Grouped house picker: a panel of pills, in the owner's canonical house
 * order, with comfortable 44px+ touch targets. More than one house can be
 * selected for a year (two houses in one year is allowed), plus a
 * free-typed "Other" entry for anything outside the canonical 22. The value
 * is a plain string[] so callers never need to know which entries are
 * canonical.
 *
 * The interaction the owner asked to KEEP: year rows, tap a year, pick a
 * house from the full list, auto-advance to the next unfilled year. No
 * per-house colour coding and no family grouping -- one calm neutral style,
 * selected reads canopy. What changed in this pass is purely the shape and
 * the feel, not the question being asked:
 *
 * - Below 1024px the panel is a BOTTOM SHEET (`Sheet`, shared with the
 *   Directory/Collection filter sheet), not a popover anchored to the
 *   trigger. The old popover opened `side="bottom"` on narrow screens and
 *   covered the very rows it was asking about, so answering meant exit,
 *   re-enter, scroll, repeat. A sheet is fixed to the viewport instead of
 *   the trigger, and the year is restated as its title, so the question
 *   stays legible no matter how tall the list is.
 * - Opening a panel (including the auto-advance jump to the next year)
 *   scrolls its trigger into view, so the eye can follow the run without
 *   hunting for where the next question landed.
 * - Picking a house commits, closes, and calls `onPicked`, so the editor
 *   can open the next year automatically -- unchanged from the original.
 *   Deselecting deliberately does NOT close: that is a correction, not a
 *   finished answer.
 * - On desktop the panel still opens to the SIDE, leaving the year rows
 *   visible; narrow viewports have no room for that, hence the sheet.
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = controlledOpen ?? uncontrolledOpen;
  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  // Side placement (desktop) is decided from the viewport rather than left to
  // collision flipping: at 390px a "right" panel has nowhere to flip to that
  // isn't also off-screen. Below the breakpoint we switch shells entirely,
  // to a bottom sheet, rather than letting a side popover degrade into one
  // that opens below the trigger and covers the rows under it.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Makes the auto-advance jump to the next year VISIBLE: the eye follows the
  // scroll rather than the panel silently reappearing somewhere else. On a
  // phone this also keeps the row above the sheet that is about to cover the
  // lower part of the screen, so the year being answered is never hidden.
  // The sheet only ever covers the bottom ~64% of the viewport, so "start"
  // (not "center") is what actually lands the row in the clear band above it
  // -- centering the trigger in the full viewport routinely centers it
  // UNDER the sheet instead.
  useEffect(() => {
    if (!open) return;
    const el = triggerRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: wide ? "nearest" : "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, wide]);

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

  const triggerContent = (
    <>
      {value.length === 0 ? (
        <span className="text-muted-foreground">{placeholder}</span>
      ) : (
        <HousePills value={value} canonicalSet={canonicalSet} />
      )}
      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </>
  );

  const inlineHeading = yearLabel ? (
    <p className="text-[13px] font-semibold text-foreground">
      Which house in <span className="tabular-nums text-canopy">{yearLabel}</span>?
    </p>
  ) : null;

  if (wide) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          ref={triggerRef}
          type="button"
          aria-label={ariaLabel}
          className={cn(TRIGGER_CLASS, open && "border-canopy/50 bg-canopy/5")}
        >
          {triggerContent}
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverPositioner sideOffset={8} align="start" side="right">
            <PopoverContent className="w-[300px]">
              <HouseOptions
                value={value}
                onToggle={toggleHouse}
                otherText={otherText}
                setOtherText={setOtherText}
                onAddOther={addOther}
                customEntries={customEntries}
                onRemoveCustom={removeCustom}
                heading={inlineHeading}
              />
            </PopoverContent>
          </PopoverPositioner>
        </PopoverPortal>
      </Popover>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(TRIGGER_CLASS, open && "border-canopy/50 bg-canopy/5")}
      >
        {triggerContent}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[64vh] rounded-t-[var(--radius)] p-0">
          <SheetHeader className="border-b border-border pb-3">
            <SheetTitle className="font-heading text-[15px] font-semibold tracking-tight">
              {yearLabel ? (
                <>
                  Which house in <span className="tabular-nums text-canopy">{yearLabel}</span>?
                </>
              ) : (
                "Pick a house"
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <HouseOptions
              value={value}
              onToggle={toggleHouse}
              otherText={otherText}
              setOtherText={setOtherText}
              onAddOther={addOther}
              customEntries={customEntries}
              onRemoveCustom={removeCustom}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  Shared bits
 * ------------------------------------------------------------------ */

// scroll-mt clears the sticky top nav, so the "start"-aligned scrollIntoView
// above never tucks the row in underneath it.
const TRIGGER_CLASS =
  "flex min-h-11 w-full flex-1 flex-wrap items-center gap-1.5 rounded-[var(--radius-input)] border border-input bg-transparent px-3 py-1.5 text-left text-[13px] outline-none transition-colors duration-150 scroll-mt-24 hover:border-ring/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** The selected-house pills inside the trigger. Each new pick lands with a
 *  small spring settle rather than just appearing, so the answer visibly
 *  arrives; a removed one (via the "Other" chip's own X) leaves the same way. */
function HousePills({
  value,
  canonicalSet,
}: {
  value: string[];
  canonicalSet: ReadonlySet<string>;
}) {
  return (
    <AnimatePresence initial={false}>
      {value.map((h) => (
        <motion.span
          key={h}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={SPRINGS.snappy}
          className={cn(
            "rounded-full px-2.5 py-1 text-[12.5px] font-semibold",
            canonicalSet.has(h) ? "bg-canopy/10 text-canopy" : "bg-cinnamon/10 text-cinnamon"
          )}
        >
          {h}
        </motion.span>
      ))}
    </AnimatePresence>
  );
}

/** The grid of 22 houses plus the free-text "Other" row, shared between the
 *  desktop popover and the mobile sheet so the two shells never drift apart.
 *  One calm neutral style throughout: no per-house colour, no family
 *  grouping. Selected is the one canopy state. */
function HouseOptions({
  value,
  onToggle,
  otherText,
  setOtherText,
  onAddOther,
  customEntries,
  onRemoveCustom,
  heading,
}: {
  value: string[];
  onToggle: (h: string) => void;
  otherText: string;
  setOtherText: (v: string) => void;
  onAddOther: () => void;
  customEntries: string[];
  onRemoveCustom: (name: string) => void;
  /** An in-body heading; omitted when the shell (the sheet's own title) already carries the year. */
  heading?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.gentle}
      className="space-y-3"
    >
      {heading}
      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Pick one or more houses">
        {HOUSES.map((h) => {
          const selected = value.includes(h);
          return (
            <button
              key={h}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(h)}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-full border px-2.5 py-2 text-center text-[13px] font-semibold leading-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]",
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
                onAddOther();
              }
            }}
            placeholder="Type a house name"
            aria-label="Type a house name"
            className="h-11 flex-1 text-[13px]"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Add this house"
            onClick={onAddOther}
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
                  onClick={() => onRemoveCustom(name)}
                  className="rounded-full text-cinnamon/70 outline-none transition-colors hover:text-cinnamon focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
