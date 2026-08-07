"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
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
import { HOUSE_TINTS_HOVER, HOUSE_TINTS_PANEL } from "@/components/profile/houses-chain";

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
      Which house in <span className="tabular-nums text-leaf">{yearLabel}</span>?
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
            <PopoverContent className="w-[344px]">
              <HouseOptions
                value={value}
                onToggle={toggleHouse}
                otherText={otherText}
                setOtherText={setOtherText}
                onAddOther={addOther}
                customEntries={customEntries}
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
                  Which house in <span className="tabular-nums text-leaf">{yearLabel}</span>?
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

/**
 * The panel body: the 22 houses as a field of PILLS, plus the free-text
 * escape.
 *
 * It used to be two columns of text rows, with a selected row inflating into
 * a lozenge. The owner threw that out (2026-08-07: "it's still not a very
 * pretty outline ... I wanted more of an outline that looks like the actual
 * house pill in the chain ... make a bigger change if necessary"). He was
 * right about the cause: a list whose selected items become pills has two
 * kinds of object in it, at two different widths, scattered down a column.
 * The eye reads the shape before the word, so the shape has to be constant.
 *
 * So every house is a pill, always. Unselected is a hairline outline and no
 * fill; picking one fills it. Nothing changes shape, nothing changes width,
 * and the panel reads as one set of things rather than a list with lumps in.
 *
 * THE TINTS ARE THE CHAIN'S OWN, imported rather than matched by eye, and
 * they are handed out in selection order: the first house you pick for a year
 * is leaf, a second is cinnamon, which is exactly the pair the chain will
 * draw side by side once you close the panel. Colour means the same thing in
 * both places, which is the whole reason to spend it. It is NOT a colour per
 * house: that has been proposed and rejected twice, and 22 tinted names is a
 * confetti you cannot scan.
 *
 * Hover is a leaf wash, the light green (owner, same review), so it previews
 * what picking will do rather than inventing a third state colour.
 */
export function HouseOptions({
  value,
  onToggle,
  otherText,
  setOtherText,
  onAddOther,
  customEntries,
  tintIndexFor,
  heading,
}: {
  value: string[];
  onToggle: (h: string) => void;
  otherText: string;
  setOtherText: (v: string) => void;
  onAddOther: () => void;
  customEntries: string[];
  /** The tint this house wears in the chain, or WOULD wear if it were picked
   *  right now. Drives the selected fill and the hover preview alike, so
   *  hovering a house shows the colour it is about to become. Omitted (the
   *  onboarding year rows, which have no chain beside them) and selection
   *  falls back to the order things were picked in. */
  tintIndexFor?: (house: string) => number | undefined;
  /** An in-body heading; omitted when the shell (the sheet's own title) already carries the year. */
  heading?: ReactNode;
}) {
  /* Canonical order first, then anything free-typed, so a house someone added
     by hand sits in the same field as the rest instead of in a separate tray
     underneath it. */
  const all = [...HOUSES, ...customEntries];

  return (
    <div className="space-y-3">
      {heading}
      {/* Tight. The first pill version gave every house a 44px body and 8px of
          gap, which for names as short as "Red" is mostly air: 22 houses ran
          seven ragged rows deep (owner, 2026-08-07: "compress it so it fills
          the rows fully instead of this huge whitespace"). At 34px with 6px
          gaps the same 22 pack four and five to a line with almost no ragged
          tail, and the field reads as one block rather than a scatter. */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pick one or more houses">
        {all.map((h) => {
          const picked = value.indexOf(h);
          const selected = picked !== -1;
          /* Its colour in the chain when the caller knows one, else its
             position in this panel's own selection, which is the same rule the
             chain uses: first is leaf, second cinnamon, third sky. */
          const tint = tintIndexFor?.(h) ?? (selected ? picked : 0);
          return (
            <button
              key={h}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(h)}
              className={cn(
                "inline-flex min-h-[34px] items-center rounded-full border px-3 text-[13px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected
                  ? cn(HOUSE_TINTS_PANEL[tint % HOUSE_TINTS_PANEL.length], "font-semibold")
                  : cn(
                      "border-border/80 bg-transparent font-medium text-foreground",
                      HOUSE_TINTS_HOVER[tint % HOUSE_TINTS_HOVER.length]
                    )
              )}
            >
              {h}
            </button>
          );
        })}
      </div>

      {/* No rule above it. The field of pills already ends where it ends, and
          a hairline across a 344px panel to separate two things that are
          obviously different is a border that has not earned itself. */}
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
          placeholder="Not listed? Type it"
          aria-label="Type a house name"
          className="h-10 flex-1 text-[13px]"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Add this house"
          disabled={!normalizeHouse(otherText)}
          onClick={onAddOther}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
