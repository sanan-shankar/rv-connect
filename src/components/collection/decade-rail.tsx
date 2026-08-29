"use client";

/* ------------------------------------------------------------------ *
 *  The decade rail: when, as a picture rather than a menu.
 *
 *  This replaces the "When" dropdown, and the replacement is the point.
 *  A dropdown of decades tells you nothing until you open it and then
 *  makes you guess; the same nine values drawn as marks whose length is
 *  how many photographs each holds tell you, at rest and without a
 *  click, what shape the archive is -- that it is mostly the 2010s, that
 *  there are forty things from before 1960, that a third of it is
 *  undated and could use a hand. Google Photos' scrubber is the same
 *  idea and it is what makes a hundred thousand photographs navigable
 *  with no folders at all. The owner asked for exactly this kind of
 *  answer: "is there like another way we could do it which is even more
 *  space efficient and beautiful."
 *
 *  IT SEEKS. IT DOES NOT FILTER. That is a correction, not the original
 *  design: pressing a decade used to narrow the grid to it, which meant
 *  landing there had no way back except a reload -- "I now have no way
 *  to go back? ... doing that has locked me into 2020s" (owner,
 *  2026-08-29). The rail now travels one continuous river to that
 *  stretch of it; photographs above and below still exist and scrolling
 *  either way keeps going. `active` therefore is not a filter you set,
 *  it is read off what is actually on screen (`useActiveBand` in
 *  `photo-river.tsx`) -- the rail reports where you are rather than
 *  deciding it.
 *
 *  It also answers the owner's "year should not be the primary
 *  organising axis": time is a lens down the right-hand edge, never a
 *  gate you pass through to reach the photographs.
 *
 *  Only in "Chronological" order, where a `takenKey` spine exists to
 *  seek along at all -- every other order sorts by something else
 *  (upload date, love count), and a decade mark would be seeking along
 *  an axis the river is not currently walking.
 *
 *  Below 1280px this margin does not exist; the phone scrubber down the
 *  right edge of the grid is its own component, not a second shape of
 *  this one -- a narrow scrolling line of decade words shipped here once
 *  and was rejected on sight ("remove the decades and undated thing
 *  from mobile, it looks really bad"): two words with no marks beside
 *  them carried none of what makes the rail worth having.
 * ------------------------------------------------------------------ */

import { ERAS } from "@/lib/collection";
import { cn } from "@/lib/utils";

export type DecadeCount = { era: string; count: number };

/** The rail's own order: newest decade first, matching the river's, with
 *  "Undated" last -- it is not a decade and cannot be sorted among them, and
 *  reversing `ERAS` alone puts it at the TOP, above the 2020s, because that
 *  list ends with it. `ERAS` runs the other way round (it is a form's list,
 *  oldest first), so this reverses it and then lifts the one value that is
 *  not a date out to the end, rather than keeping a second list to drift. */
const RAIL_ORDER = [
  ...[...ERAS].reverse().filter((e) => e.value !== "unknown"),
  ...ERAS.filter((e) => e.value === "unknown"),
];

const railLabel = (era: string) =>
  era === "unknown" ? "Undated" : ERAS.find((e) => e.value === era)?.label ?? era;

function useRailRows(decades: DecadeCount[]) {
  const held = new Map(decades.map((d) => [d.era, d.count]));
  const rows = RAIL_ORDER.filter((e) => (held.get(e.value) ?? 0) > 0).map((e) => ({
    era: e.value,
    label: railLabel(e.value),
    count: held.get(e.value)!,
  }));
  const most = rows.reduce((m, r) => Math.max(m, r.count), 0);
  return { rows, most };
}

/** The wide-screen rail: marks in the margin. */
export function DecadeRail({
  decades,
  active,
  onSeek,
  className,
}: {
  decades: DecadeCount[];
  /** The decade currently on screen, read from scroll position. "" while
   *  nothing has settled yet (the very first paint, before the observer's
   *  first callback). */
  active: string;
  onSeek: (era: string) => void;
  className?: string;
}) {
  const { rows, most } = useRailRows(decades);
  // One decade is not a shape, it is a fact, and a rail of one mark is noise.
  if (rows.length < 2) return null;

  return (
    <nav
      aria-label="Jump to when the photograph was taken"
      /* Sticky, so the index stays with you down twenty thousand photographs
         the way a thumb index stays with a book. `top-6` clears the sticky
         page chrome above it. */
      className={cn("sticky top-6 hidden w-[92px] shrink-0 flex-col items-end gap-px xl:flex", className)}
    >
      {rows.map((r) => {
        const isActive = active === r.era;
        /* The mark. Length is the decade's share of the biggest decade, with
           a floor -- a decade holding three photographs must still be
           pressable and still read as present, and a mark shorter than about
           5px reads as a speck of dust rather than as a quantity. */
        const mark = Math.max(5, Math.round((r.count / most) * 40));
        return (
          <button
            key={r.era}
            type="button"
            onClick={() => onSeek(r.era)}
            aria-current={isActive ? "true" : undefined}
            title={`${r.count.toLocaleString()} ${r.count === 1 ? "photograph" : "photographs"}`}
            className={cn(
              "group flex w-full items-center justify-end gap-2 rounded-[var(--radius-sm)] py-[3px] pr-1 text-right",
              "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive ? "text-canopy" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              aria-hidden
              /* An ink tint, not `--border`. The rail sits on the page base
                 rather than on a card, and border #DFD8CB against background
                 #E4E1D5 is well under the just-noticeable step, so the marks
                 were invisible in the first screenshot -- nine labels with
                 nothing beside them. A translucent ink also lifts on dark,
                 where a fixed hairline colour would sink. */
              className={cn(
                "h-[2px] shrink-0 rounded-full transition-colors duration-150",
                isActive ? "bg-canopy" : "bg-foreground/25 group-hover:bg-foreground/50"
              )}
              style={{ width: mark }}
            />
            <span
              className={cn(
                "shrink-0 text-[11px] tabular-nums tracking-[0.04em]",
                isActive ? "font-semibold" : "font-medium"
              )}
            >
              {r.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
