"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MENU_PANEL_CLASS } from "@/components/ui/menu-material";

/**
 * Shared visual language for every facet pill (FacetSelect, FacetSearchSelect,
 * RangeFacetPill). Idle sits on the warm `--secondary` surface with
 * a `--border` hairline; Set tints canopy. Full pill,
 * Hover is a colour change only (owner, 2026-07-25: hover never moves a
 * control); the press sink stays (docs/spec/DESIGN-SYSTEM.md, filters-rework.md sec. 4).
 *
 * Focus ring: canopy, and only for keyboard focus. `--ring` (leaf) is the
 * INPUT ring; globals.css reserves it so a button never wears a mismatched
 * leaf halo, and these pills are buttons. The ring is keyed to the inner
 * trigger's `:focus-visible` (via `data-facet-trigger`) rather than
 * `focus-within`, so a plain mouse click leaves no halo and tabbing onto the
 * pill's clear `x` lights the x's own ring, not the whole pill.
 *
 * `transition-transform`, not `transition-[colors,transform]`. Two things used
 * to ride that `colors`, and neither should:
 * 1. The hover. The idle pill's hover is now `state-layer`, a background-IMAGE,
 *    which CSS cannot transition at all; leaving the Set pill's canopy ramp on
 *    a 150ms fade would mean the pill you hover second behaves differently from
 *    the pill you hovered first.
 * 2. The idle -> Set swap when you pick a value. The rest of that swap has
 *    always been instant (the `x` appears, the label grows its ": Value"), so
 *    fading only the fill and the border made one state change arrive in two
 *    instalments. It now lands in one frame, like the text it belongs to.
 * The `active` press sink is the only thing left that needs a curve.
 */
const PILL_BASE =
  "inline-flex h-10 shrink-0 items-center rounded-full border text-[13px] font-medium transition-transform duration-150 has-[[data-facet-trigger]:focus-visible]:ring-2 has-[[data-facet-trigger]:focus-visible]:ring-canopy/40 active:scale-[0.97]";

/* Idle hover is `state-layer`, the app's one neutral hover, NOT `hover:bg-accent`.
   These pills render on the page (`--background`) in the desktop filter bar and
   on the sheet's own surface on mobile, and one opaque hover hex cannot serve
   both: --accent measured +8.12 dL* on the page against +2.06 on a card. The
   translucent ladder lands at -4.30 against `--secondary` wherever the bar sits. */
/* No fill at rest. It was `--secondary`, a warm cream, and the owner's verdict
   on 2026-08-28 was blunt: "I don't like the colours of the filtering pills.
   it's that brown cream thing. it doesn't look good ... it's not beautiful and
   delightful and fun and dopamine inducing enough yet."
   He is right about more than the hue. These pills sit on the Float-white
   filter panel, so a cream fill made four warm boxes on white -- four objects
   competing before you have chosen anything -- when what the panel wants at
   rest is a quiet list. An outline holds the shape and nothing else, which
   leaves the whole of the colour budget for the ON state below. */
const PILL_IDLE = "border-border bg-transparent text-foreground state-layer";

/* Set KEEPS a canopy hover rather than taking the neutral state layer: canopy is
   this kit's semantic for "this facet is narrowing your results", and a grey tint
   on hover would drop the green for as long as the cursor is on it. Only the
   DEPTH of the ramp changed. 0.08 -> 0.12 measured just -2.09 dL* on the page
   (-2.31 on paper), i.e. the ~2 just-noticeable threshold that made the old
   --accent hover invisible; 0.08 -> 0.16 measures -4.19 / -4.62, which is the
   same weight `state-layer` gives every other control (-4.19 to -4.72). The
   RESTING Set appearance is untouched: selection stays canopy/[0.08]. */
/* Set is now the app's own selected chip: a SOLID canopy fill with white text,
   the same thing the composer's audience picker does for the same meaning, and
   the DESIGN-SYSTEM's one green state at full strength rather than at 8%. The
   reward is the flip -- press a facet and it lights up -- which is what the
   faint tint could never give, because 8% canopy over a cream pill is a shade,
   not an answer.
   Hover BRIGHTENS rather than deepening: a filled brand surface lifts (the same
   move the canopy CTA and the composer's remove button make), and a further ink
   tint on a saturated fill barely moves at all. */
export const PILL_SET =
  "border-canopy bg-canopy text-white transition-[filter] hover:brightness-[1.12]";

/** The item row used inside every facet's dropdown/panel list: the menu
 *  material's row (`--radius-sm` 8.8px -- concentric with the 12px panel
 *  through its 4px inset -- highlight = `state-layer`).
 *
 *  NO min-height, matching ui/select, ui/combobox and ui/dropdown-menu. This
 *  row kept `min-h-9` after those three dropped it, which left every facet
 *  dropdown rendering 36px rows beside 28px rows in panels built from the very
 *  same MENU_PANEL_CLASS. The owner asked for the shorter row back ("really
 *  stretched"); a facet list is the same material as a menu and gets the same
 *  answer.
 *
 *  The highlight is `state-layer` and nothing else. It replaces
 *  `hover:bg-accent` + `data-highlighted:bg-accent`, which painted --accent
 *  #FAF8F2 on a Float-white panel: -2.42 dL*, i.e. INVERTED and gone ("hovering
 *  over all menus now has disappeared"). state-layer covers `data-highlighted`
 *  itself, which is how Base UI marks the keyboard-highlighted row, so both the
 *  pointer and the arrow keys light the same row the same way.
 *
 *  ...for the rows Base UI owns. The `focus-visible:` half below closes the one
 *  hole that left. This class dresses TWO different kinds of row: FacetSelect's
 *  are `Select.Item`s, which Base UI marks `data-highlighted` and which never
 *  take DOM focus (the popup keeps it), so `state-layer` lights them for both
 *  pointer and keyboard. FacetSearchSelect's are plain `<button>`s in a
 *  Popover, and nothing marks those: `data-highlighted` is never set, so a row
 *  tabbed to had `outline-none` here and NO replacement, measured 2026-08-02 at
 *  dL* 0.00 with outline none, background-image none and box-shadow none. The
 *  City, House and "Part of school" lists were literally unnavigable by
 *  keyboard: focus was real and completely unpainted.
 *
 *  That hole is now closed in `@utility state-layer` itself (globals.css), which
 *  paints the same tint on `:focus-visible`, so every hand-rolled row in the app
 *  is fixed at once rather than only this kit's. Nothing extra is needed here.
 *  It repaints the state layer rather than adding a ring because arrow keys and
 *  the pointer should light the same row the same way, and a search panel is the
 *  same material as a select. */
export const FACET_ITEM_CLASS =
  "state-layer flex w-full cursor-pointer scroll-my-1 items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm outline-none transition-transform duration-100 select-none active:scale-[0.99]";

/** The dropdown/popup surface every list facet opens: the shared menu
 *  material plus this kit's sizing (a scrolling list capped at 320px, at
 *  least as wide as its own trigger pill). */
export const FACET_POPUP_CLASS = cn(
  MENU_PANEL_CLASS,
  "max-h-80 w-(--anchor-width) min-w-48 overflow-x-hidden overflow-y-auto p-1"
);

/**
 * The popover-flavoured facet panel (City/House search, Batch range): the
 * same menu material, rendered from the Base UI Popup directly rather than
 * through ui/popover's PopoverContent, whose own wider-card class list
 * (27.2px radius, its own slide-in animation) tailwind-merge cannot reliably
 * strip back down to the material. Compose it inside ui/popover's
 * Popover/PopoverTrigger/PopoverPositioner, which this kit already uses.
 */
export function FacetPanel({ className, ...props }: PopoverPrimitive.Popup.Props) {
  return <PopoverPrimitive.Popup className={cn(MENU_PANEL_CLASS, "p-1", className)} {...props} />;
}

export function facetPillClass(set: boolean, className?: string) {
  return cn(PILL_BASE, set ? PILL_SET : PILL_IDLE, "pl-4", set ? "pr-1.5" : "pr-3", className);
}

/** The `x` that clears one facet without opening it. Stops propagation so the
 *  click never also fires the trigger it sits beside.
 *
 *  Keeps a canopy wash rather than `state-layer`: it only ever renders inside a
 *  Set pill, so its hover has to stay inside that pill's semantic. It is also
 *  the strongest hover in the kit on purpose -- canopy/15 over the pill's
 *  canopy/[0.08] measures -7.25 dL* on the page -- because this control DESTROYS
 *  a filter on click, and it has to separate itself from the pill it sits in,
 *  which is lighting up underneath it at the same moment. */
export function FacetClearButton({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Clear ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        onClear();
      }}
      /* Inside a solid canopy pill now, so it reads in white at 70% and goes to
         full white on a darker wash. The old canopy-on-cream pair went
         invisible the moment the pill behind it filled. */
      className="grid size-6 shrink-0 place-items-center rounded-full text-white/70 outline-none transition-transform duration-150 hover:bg-white/20 hover:text-white active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <X className="size-3.5" strokeWidth={2.25} />
    </button>
  );
}
