"use client";

import { type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HOUSES, normalizeHouse } from "@/lib/houses";
import { HOUSE_TINTS_HOVER, HOUSE_TINTS_PANEL } from "@/components/profile/houses-chain";

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
   *  hovering a house shows the colour it is about to become. Omitted and
   *  selection falls back to the order things were picked in -- which is
   *  what a caller without a chain beside it would want. */
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
