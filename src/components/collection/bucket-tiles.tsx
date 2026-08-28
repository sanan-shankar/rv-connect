"use client";

/* ------------------------------------------------------------------ *
 *  The six buckets, as things you want to press.
 *
 *  This is the single most important interaction in contributing, and
 *  the reason is not aesthetic: it is the one thing we ask of every
 *  contributor and the one thing they can silently refuse to do. If
 *  pressing these does not feel good the taxonomy does not get filled
 *  in, and nothing the Collection page does with buckets works. The
 *  owner asked for exactly this and used the word himself: "some big
 *  bucket touch targets so they'll want to do it".
 *
 *  So: not checkboxes, not a dropdown, not chips. Six large tiles, each
 *  with its own duotone glyph, big enough to be a genuine pleasure to
 *  tap with a thumb. Pressed, a tile fills with Canopy and stays lit --
 *  selection is the app's one green state (DESIGN-SYSTEM sec. 2 rule 4),
 *  the same green the sidebar's active row uses.
 *
 *  Hover is colour only and the press keeps its sink, per the owner's
 *  2026-07-25 rule. The glyph is the only thing that moves, and only on
 *  the frame the tile lights: a small settle, so pressing six in a row
 *  feels like six separate acts rather than one long toggle.
 * ------------------------------------------------------------------ */

import { m } from "motion/react";
import {
  Bell,
  Bird,
  Buildings,
  Sparkle,
  Tree,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { SPRINGS } from "@/components/common/motion";
import { BUCKETS, type BucketValue } from "@/lib/collection";
import { cn } from "@/lib/utils";

/** One glyph per bucket. Duotone, per CLAUDE.md: Lucide is for UI chrome,
 *  Phosphor duotone for the decorative. The bell is the assembly bell, which
 *  is what "school life" sounds like from anywhere on that campus. */
const GLYPHS: Record<BucketValue, Icon> = {
  people: UsersThree,
  birds: Bird,
  nature: Tree,
  campus: Buildings,
  "school-life": Bell,
  other: Sparkle,
};

export function BucketTiles({
  value,
  onChange,
  /** True when the tiles are answering for several photographs at once and
   *  the selection does not agree. Those buckets read as half-lit rather than
   *  as off, so pressing one does not silently look like it did nothing. */
  mixed = [],
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  mixed?: string[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {BUCKETS.map((b) => {
        const on = value.includes(b.value);
        const some = !on && mixed.includes(b.value);
        const Glyph = GLYPHS[b.value];
        return (
          <m.button
            key={b.value}
            type="button"
            aria-pressed={on}
            title={b.hint}
            whileTap={{ scale: 0.96 }}
            transition={SPRINGS.snappy}
            onClick={() =>
              onChange(on ? value.filter((v) => v !== b.value) : [...value, b.value])
            }
            className={cn(
              "flex min-h-[82px] flex-col items-start justify-between gap-2 rounded-[var(--radius-md)] border p-3 text-left",
              "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              on
                ? "border-canopy bg-canopy text-white"
                : some
                  ? "border-canopy/40 bg-canopy/[0.08] text-foreground"
                  /* No fill at rest, and that is the whole of the owner's
                     complaint about these: "I don't like the yellowing when
                     it's not selecting." `bg-card` is #F5F2EA, which reads
                     as a warm card ON the page wash it was drawn for -- but
                     these live inside a pop-up, and a pop-up is pure white
                     (--float). Cream on white is not a surface, it is a
                     stain. The tile keeps its border and its ink hover; the
                     one filled state in the set is the one that means
                     something. */
                  : "state-layer border-border text-foreground"
            )}
          >
            <m.span
              aria-hidden
              /* The glyph is the only thing that moves, and only as the tile
                 lights: a small settle so six presses read as six acts. */
              animate={on ? { scale: 1 } : { scale: 0.94 }}
              transition={SPRINGS.snappy}
              className={cn("block", on ? "text-white" : "text-canopy")}
            >
              <Glyph size={26} weight="duotone" />
            </m.span>
            <span className="text-[13.5px] font-semibold leading-none">{b.label}</span>
          </m.button>
        );
      })}
    </div>
  );
}
