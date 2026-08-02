"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
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
import { MetaDots } from "@/components/common/meta-dots";
import { HOUSES, normalizeHouse } from "@/lib/houses";

/**
 * Grouped house picker: a panel of house rows in the owner's canonical
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
        /* Plain text, not nested pills: a pill inside the 12px trigger is the
         * box-in-box the owner rejected, and a two-house year used to wrap and
         * break the row height. MetaDots is metaLine's styled twin (same
         * separator rule) - needed here, not the string helper, because custom
         * entries keep their subtle cinnamon tint. Removing a house happens
         * inside the panel, where every selected row toggles off.
         * [&_.dotsep]:mx-1: MetaDots grew up inside flex rows whose `gap`
         * spaces the dot; in this plain inline span the dot would sit flush
         * against both names ("Alamanda·Jacaranda"), so the breathing room is
         * scoped in here rather than baked into the shared dot. */
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground [&_.dotsep]:mx-1">
          <MetaDots
            parts={value.map((h) =>
              canonicalSet.has(h) ? h : (
                <span key={h} className="text-cinnamon">
                  {h}
                </span>
              )
            )}
          />
        </span>
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
// above never tucks the row in underneath it. Deliberately single-line: the
// selected houses render as truncating text, so a two-house year can never
// wrap and change the row height.
const TRIGGER_CLASS =
  "flex min-h-11 w-full flex-1 items-center gap-1.5 rounded-[var(--radius-input)] border border-input bg-transparent px-3 py-1.5 text-left text-[13px] outline-none transition-colors duration-150 scroll-mt-24 hover:border-ring/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** The panel body: the 22 houses as two quiet columns of text rows, plus the
 *  free-text "Other" escape, shared between the desktop popover and the
 *  mobile sheet so the two shells never drift apart. One calm neutral style:
 *  no idle border, no idle fill, no per-house colour, no family grouping.
 *  Selected is the one canopy state - a small check plus canopy text, never
 *  a solid slab. */
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
  // No motion wrapper here: the shells already animate their own entrance
  // (the popover's fade/zoom, the sheet's rise), and a second inner animation
  // on top of that read as a stutter, not a flourish.
  //
  // An explicit midpoint split (not CSS columns) keeps the canonical order
  // flowing down column one then column two while DOM order stays 1..22, so
  // keyboard tabbing walks the list in the same order the eye reads it, and
  // no row can ever fragment across a column break.
  const mid = Math.ceil(HOUSES.length / 2);
  const columns = [HOUSES.slice(0, mid), HOUSES.slice(mid)];
  return (
    <div className="space-y-3">
      {heading}
      <div className="grid grid-cols-2 gap-x-2" role="group" aria-label="Pick one or more houses">
        {columns.map((column, ci) => (
          <div key={ci}>
            {column.map((h) => {
              const selected = value.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggle(h)}
                  className={cn(
                    // min-h-11 holds the owner's 44px touch floor; radius-sm
                    // (8.8px) is one rung inside the 12px panel per the radius
                    // ladder. No idle border or fill - hover is the shared
                    // state layer, selection is the check + canopy text below.
                    //
                    // state-layer, not hover:bg-accent: these 22 rows render on
                    // a Float-white popover on desktop and on the sheet's own
                    // surface on mobile. --accent is LIGHTER than white, so on
                    // the desktop panel the old hover inverted (-2.42 dL*) and
                    // the list read as having no hover at all. transition-colors
                    // stays for the text's foreground -> canopy swap on pick;
                    // the layer itself is a background-image and lands at once.
                    "state-layer flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 text-left text-[13.5px] transition-colors duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    selected ? "font-semibold text-canopy" : "font-medium text-foreground"
                  )}
                >
                  {/* The icon slot is always reserved so a pick never nudges
                      the name sideways; only the check inside it comes and
                      goes. */}
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                    {selected && <Check className="h-4 w-4 text-canopy" />}
                  </span>
                  {h}
                </button>
              );
            })}
          </div>
        ))}
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
                  // Hover is the glyph's own colour (cinnamon/70 -> cinnamon),
                  // not a state layer: this x is a bare 12px mark with no
                  // padding, so a tint behind it would draw a box tighter than
                  // the icon it sits under. active:scale-90 is the press the
                  // rest of the kit's x buttons use (see FacetClearButton), and
                  // transform joins the transition so it has a curve to run on.
                  className="rounded-full text-cinnamon/70 outline-none transition-[color,transform] duration-150 hover:text-cinnamon active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
