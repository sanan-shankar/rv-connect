"use client";

/* ------------------------------------------------------------------ *
 *  The Collection's controls, and there is one line of them.
 *
 *  The owner, on the row they replace: *"I don't know if that search bar
 *  needs to be as big as it is and then also some filters... do we want
 *  the search bar to be that long or so much like a whole row to be
 *  taken up by these controls what if we moved them maybe up or
 *  something right in line with the valley collection maybe?"* And on
 *  the pattern itself: *"these pills with stuff with you know text in
 *  them you click on it and it pops up a drop down it's okay it's not
 *  the prettiest design it's used in many places in this app but it's
 *  not like a 10 on 10 at anything so I don't want us to stick to it
 *  just because other places have it."*
 *
 *  So: no pills, no borders, no bordered search field. The buckets are
 *  a line of words with a canopy underline that glides between them,
 *  the count is a sentence, and the order is the last word of that
 *  sentence. Search is an icon on the title line (the shared
 *  <SearchPill>, in its live mode). The whole apparatus is one line
 *  tall and reads as an index rather than as a form.
 *
 *  What is NOT here, and deliberately: a "Part of school" dropdown. It
 *  is free text, so at two thousand photographs it becomes a menu of two
 *  thousand near-duplicates -- the owner worked that out himself during
 *  the brief -- and spec sec. 7.2 makes it absolute that nothing written
 *  in prose is ever offered as a dropdown. It is searched instead. And
 *  no "When" dropdown: that is the decade rail, which is a picture of
 *  the archive rather than a list of its decades.
 * ------------------------------------------------------------------ */

import { m } from "motion/react";
import { CaretDown } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_MARKER_SPRING } from "@/components/common/motion";
import { BUCKETS } from "@/lib/collection";
import type { RiverOrder } from "@/app/(main)/collection/actions";
import { cn } from "@/lib/utils";

/** Every order the river can take. "A wander" is deleted -- the owner,
 *  verbatim: "can you please delete that a wander that's not great."
 *
 *  "Chronological" is the one that is not a sort of the upload log. It orders
 *  by when the photograph was TAKEN and turns on the decade headings, which
 *  is the archive's own spine and the reason `takenKey` exists. It was called
 *  "Through time" until the owner read the menu back to himself as "newest,
 *  chronological, oldest, most loved" -- the house phrase was costing a reader
 *  a beat to work out what the other three say plainly.
 *
 *  AND THERE IS NO SECOND LINE. Each of these used to carry a note under it
 *  ("Most recently added", "By when it was taken") set at 11.5px, and the
 *  owner deleted the lot: "that font is just getting too small, we're just not
 *  respecting the user enough, the mobile user." Four words that each explain
 *  themselves do not need eight more words explaining them in type nobody can
 *  read. */
export const RIVER_ORDERS: { value: RiverOrder; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "taken", label: "Chronological" },
  { value: "oldest", label: "Oldest" },
  { value: "loved", label: "Most loved" },
];

export const orderLabel = (v: RiverOrder) =>
  RIVER_ORDERS.find((o) => o.value === v)?.label ?? "Newest";

function BucketWord({
  active,
  label,
  markerId,
  onSelect,
}: {
  active: boolean;
  label: string;
  markerId: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        // Hover is colour and nothing else (owner, 2026-07-25: hover never
        // moves a control). The press keeps its sink, because that is
        // feedback for something you did.
        "relative shrink-0 whitespace-nowrap px-0.5 pb-2 pt-1 text-[13.5px] leading-none transition-colors duration-150",
        "active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active ? "font-semibold text-canopy" : "font-medium text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {active && (
        /* One marker for the whole line, so it GLIDES from word to word
           rather than blinking out and in -- the sidebar's own mechanism and
           its own spring, because this is the same gesture. */
        <m.span
          layoutId={markerId}
          transition={NAV_MARKER_SPRING}
          className="absolute inset-x-0 bottom-0 block h-[2px] rounded-full bg-canopy"
        />
      )}
    </button>
  );
}

export function RiverControls({
  bucket,
  onBucket,
  order,
  onOrder,
  total,
  markerId = "collection-bucket",
  className,
}: {
  /** "" is All, which is the resting state and not a bucket. */
  bucket: string;
  onBucket: (v: string) => void;
  order: RiverOrder;
  onOrder: (v: RiverOrder) => void;
  /** How many photographs the current view holds, or undefined while a
   *  filter's first page is still in the air. */
  total?: number;
  markerId?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-1", className)}>
      {/* The buckets. A horizontal scroller on a phone rather than a wrap,
          because a wrapped second line of them reads as a form again -- and
          the scroll is the same gesture the decade strip below it takes. */}
      <nav
        aria-label="Filter by what the photograph is of"
        className="-mx-1 flex min-w-0 max-w-full items-end gap-4 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <BucketWord
          active={!bucket}
          label="All"
          markerId={markerId}
          onSelect={() => onBucket("")}
        />
        {BUCKETS.map((b) => (
          <BucketWord
            key={b.value}
            active={bucket === b.value}
            label={b.label}
            markerId={markerId}
            /* Pressing the bucket you are already in returns you to All, so
               the line is a toggle and never a trap you need a second control
               to escape. */
            onSelect={() => onBucket(bucket === b.value ? "" : b.value)}
          />
        ))}
      </nav>

      {/* The count and the order, as one sentence. `tabular-nums` so the
          number does not jitter as a filter narrows the river.

          `pb-0.5`, and it is a MEASURED optical correction rather than a
          spacing choice -- the owner: "the 1 photograph / newest line isn't
          in line with the buckets line."

          The row cannot inherit the alignment, because `items-end` on the
          parent aligns the two children's BOTTOM EDGES and these two children
          are not built the same: a bucket word is one 13.5px line set
          `leading-none`, while this is a 13px line sharing a centred flex row
          with a dropdown trigger that carries its own `py-0.5`. Equal bottoms,
          two different baselines. Nor can the parent switch to
          `items-baseline`: the bucket nav is an `overflow-x-auto` scroller, and
          a box with non-visible overflow has no baseline to align to -- it
          synthesises one from its bottom margin edge, which puts us back where
          we started.

          So the baseline is placed by hand. Measured at 1440px in Source Sans
          3: at `pb-2` this row's baseline sat exactly 6px above the nav's, and
          the drift falls one-for-one with the padding (pb-4px: 2, pb-3px: 1,
          pb-2px: 0). Two pixels is the number that lands them on the same
          line. */}
      <div className="flex shrink-0 items-center gap-1.5 pb-0.5 text-[13px] text-muted-foreground">
        {total !== undefined && (
          <span className="tabular-nums">
            {total.toLocaleString()} {total === 1 ? "photograph" : "photographs"}
          </span>
        )}
        <span className="dotsep" aria-hidden>
          ·
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="state-layer -mx-1 inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={`Order: ${orderLabel(order)}. Change`}
          >
            {orderLabel(order)}
            <CaretDown size={11} weight="bold" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            {RIVER_ORDERS.map((o) => (
              <DropdownMenuItem
                key={o.value}
                onClick={() => onOrder(o.value)}
                /* One line each, so the row is a comfortable target rather
                   than a stacked label-and-note squeezed into the same
                   height. */
                className="px-2 py-2"
              >
                <span className={cn("text-[14px]", order === o.value && "font-semibold text-canopy")}>
                  {o.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
