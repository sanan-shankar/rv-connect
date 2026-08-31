"use client";

/* ------------------------------------------------------------------ *
 *  The year rail: when, as a picture rather than a menu.
 *
 *  This replaces the "When" dropdown, and the replacement is the point.
 *  A dropdown tells you nothing until you open it and then makes you
 *  guess; the same values drawn as marks whose length is how many
 *  photographs each holds tell you, at rest and without a click, what
 *  shape the archive is -- that it is mostly the 2010s, that 1978 was a
 *  year somebody photographed everything and 1979 was not, that a third
 *  of it is undated and could use a hand. Google Photos' scrubber is the
 *  same idea and it is what makes a hundred thousand photographs
 *  navigable with no folders at all.
 *
 *  IT WAS DECADES UNTIL 2026-08-30. "Can you make the siderail on
 *  collection show each year instead of decades" -- and then, asked
 *  whether the years should live folded inside a decade you open,
 *  "show all". So every year the archive holds has a row, all of them
 *  are on screen at once, and the rail itself NEVER SCROLLS. That last
 *  part is the whole design problem and the owner named it before the
 *  first line was written: "make sure you're easily able to reach say
 *  1956. think about what you'd have to scroll."
 *
 *  A scroll container inside a scroll container would be the lazy
 *  answer, and it is the one thing that cannot happen: reaching 1956
 *  would mean scrolling the rail past seventy years first, in a
 *  90-pixel gutter, while the river scrolls underneath. So the rows
 *  divide the height they are given instead. The archive can span 1926
 *  to now -- 101 rows -- and 101 rows in an 850px column is 8px each,
 *  which is a fine height for a mark and far too short for a label.
 *  Hence the two regimes in `useRailRows`: while there is room, every
 *  year is named; once there is not, the decades stay named, the years
 *  between them keep their marks, and the pointer names whichever one
 *  it is over. Nothing is hidden -- every year is always present, always
 *  pressable, and always drawn to scale. Only the lettering thins.
 *
 *  IT SEEKS. IT DOES NOT FILTER. Pressing a year used to narrow the
 *  grid to it, which meant landing there had no way back except a
 *  reload -- "I now have no way to go back? ... doing that has locked me
 *  into 2020s" (owner, 2026-08-29). The rail now travels one continuous
 *  river to that stretch of it; photographs above and below still exist
 *  and scrolling either way keeps going. `active` therefore is not a
 *  filter you set, it is read off what is actually on screen
 *  (`useActiveBand` in `photo-river.tsx`) -- the rail reports where you
 *  are rather than deciding it.
 *
 *  It also answers the owner's "year should not be the primary
 *  organising axis": time is a lens down the right-hand edge, never a
 *  gate you pass through to reach the photographs.
 *
 *  Below 1280px this margin does not exist; the phone scrubber down the
 *  right edge of the grid is its own component, not a second shape of
 *  this one -- a narrow scrolling line of decade words shipped here once
 *  and was rejected on sight ("remove the decades and undated thing
 *  from mobile, it looks really bad"): two words with no marks beside
 *  them carried none of what makes the rail worth having.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  m,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { bandLabel } from "@/lib/collection";
import { cn } from "@/lib/utils";

export type BandCount = { key: string; count: number };

/* ------------------------------------------------------------------ *
 *  How tall a row is, and what that buys.
 *
 *  ROW_MAX is the old decade rail's row, so an archive with a handful of
 *  years looks exactly like the rail that shipped before this one rather
 *  than like a diagram of itself. ROW_MIN is where a mark stops reading as
 *  a mark: below about six pixels two neighbours merge into a smear and
 *  the bar chart the rail is stops being one.
 *
 *  ROW_NAMED is the row height at which a label fits beside its own mark.
 *  The type is 11px; two 11px labels on 15px rows already touch at the
 *  ascender, and 15px is where the column stops reading as a list of years
 *  and starts reading as a paragraph. Above it every year is named, which
 *  is what "show all" means whenever the archive lets it be true.
 * ------------------------------------------------------------------ */
const ROW_MAX = 17;
const ROW_MIN = 6;
const ROW_NAMED = 15;

/** The gap that lifts "Undated" off the years. It is not a year and does not
 *  belong in their run; a plain row would read as the one before 1926. */
const UNDATED_GAP = 10;

/** What the rail leaves below itself, so the oldest year is not welded to
 *  the bottom of the window. */
const RAIL_FOOT = 24;

/* ------------------------------------------------------------------ *
 *  The dock. "Maybe some kind of subtle magnification while hovering
 *  over them, like a mac dock" (owner, 2026-08-29) -- so the rows do
 *  what the Dock does: swell toward the pointer and settle as it
 *  leaves, on a spring, with the neighbours carrying a share of it.
 *
 *  Transform only, anchored to the right edge, so the right-aligned
 *  labels stay a clean column while the rows grow leftward into the
 *  margin -- and the BUTTONS never move, only their paint: the hit
 *  targets hold still under the cursor, which keeps the house rule
 *  ("hover never moves a control") in the sense that matters.
 *
 *  Subtle is the whole brief: 1.16 at the pointer, falling to rest over
 *  about three rows.
 * ------------------------------------------------------------------ */
const DOCK_REACH = 64; // px of falloff either side of the pointer
const DOCK_PEAK = 1.16;
const DOCK_SPRING = { stiffness: 400, damping: 28 };

/** How far from the pointer a year still says its own name, as a multiple of
 *  the row height -- so it is always about one row either side, whatever the
 *  rows currently measure. Deliberately far tighter than DOCK_REACH: the
 *  swell is meant to cover eight rows and read as one soft bulge, and eight
 *  labels at once in a column this tight is a stack of overlapping numbers. */
const NAME_REACH_ROWS = 1.4;

/* ------------------------------------------------------------------ *
 *  How much height there actually is, which is NOT the window.
 *
 *  The rail is sticky at `top-6`, so once you have scrolled it has the
 *  window minus 24px to work with. Before you have scrolled it starts
 *  wherever the river starts -- about 164px down, under the page title and
 *  the bucket row -- and that is the state it is FIRST seen in. Sizing the
 *  rows against the stuck height put the oldest three years below the fold
 *  on arrival: fifty-nine rows measured out over 876px of window in a slot
 *  that only had 712px until the reader scrolled. Which is the exact thing
 *  this rail exists not to do.
 *
 *  So it measures its own top in the document and sizes for THERE, the
 *  tightest position it is ever in, and carries a little slack at the foot
 *  once it sticks. Slack you never see beats three years you cannot reach.
 * ------------------------------------------------------------------ */
function useColumnHeight(rowCount: number) {
  const nav = useRef<HTMLElement>(null);
  /* 560 is not a guess at the reader's window, it is a deliberately SHORT
     first pass: erring tight and growing is invisible, while drawing 17px
     rows and snapping them to 12px a frame later is a lurch. */
  const [height, setHeight] = useState(560);
  const measure = useCallback(() => {
    const el = nav.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    setHeight(Math.max(0, window.innerHeight - top - RAIL_FOOT));
  }, []);
  /* Layout effect, so the corrected height is in place before the browser
     paints the fallback one -- and re-run on the ROW COUNT, not just on
     mount. A rail of fewer than two bands renders nothing at all, so the ref
     is empty and the first measurement is a no-op; changing the bucket back
     to one the archive has years for then mounted the nav with the 560px
     fallback still in place and never corrected it. */
  useLayoutEffect(measure, [measure, rowCount]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  return { nav, height };
}

function useRailRows(bands: BandCount[], columnHeight: number) {
  const held = new Map(bands.map((b) => [b.key, b.count]));
  /* Newest first, matching the river's own direction, with "Undated" last --
     it is not a year and cannot be sorted among them. Only bands that hold
     something get a row: an empty year is not a fact about the archive, and
     pressing one could only ever land on the year below it. */
  const years = [...held.keys()]
    .filter((k) => k !== "unknown")
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a);
  const keys = [...years.map(String), ...(held.has("unknown") ? ["unknown"] : [])];

  /* ---------------------------------------------------------------- *
   *  Which rows keep their name once there is no room for all of them.
   *
   *  Three kinds, and each is doing a different job:
   *
   *  THE ENDS, because a ruler is read by its ends first. The newest year
   *  and the oldest year say how far back the archive goes, which is the
   *  single most useful thing the rail can tell somebody at rest, and it is
   *  a fact no decade label carries -- "1940" is a label, "1932" is the
   *  beginning of the school's memory.
   *
   *  UNDATED, because it is not a year, and an unlabelled mark below a gap
   *  is unreadable rather than merely unlabelled.
   *
   *  THE DECADES, because a column of ticks needs somewhere for the eye to
   *  land between the ends, and the decade is the coarse answer everybody
   *  already navigates by -- it is how the rail read for its first two days
   *  and it is what makes the year ticks legible as a scale rather than as
   *  a texture.
   *
   *  A decade too near an end steps aside instead: 2020 sitting one row
   *  under a named 2021 is two labels in eleven pixels, and the eye reads
   *  the collision, not either number. */
  const lastYear = keys.filter((k) => k !== "unknown").length - 1;
  const anchors = [0, lastYear, ...(held.has("unknown") ? [keys.length - 1] : [])];
  const rows = keys.map((key, i) => ({
    key,
    label: bandLabel(key),
    count: held.get(key)!,
    named:
      anchors.includes(i) ||
      (key !== "unknown" &&
        Number(key) % 10 === 0 &&
        anchors.every((a) => Math.abs(i - a) >= 2)),
  }));

  const most = rows.reduce((m, r) => Math.max(m, r.count), 0);
  const spare = columnHeight - (held.has("unknown") ? UNDATED_GAP : 0);
  const row = Math.max(ROW_MIN, Math.min(ROW_MAX, Math.floor(spare / Math.max(rows.length, 1))));
  return { rows, most, row, allNamed: row >= ROW_NAMED };
}

function RailRow({
  row: { key, label, count, named: namedAtRest },
  mark,
  height,
  allNamed,
  isActive,
  pointerY,
  onSeek,
}: {
  row: ReturnType<typeof useRailRows>["rows"][number];
  /** The mark's length in px, already scaled to the archive's shape. */
  mark: number;
  height: number;
  /** True while every year has room for its own label (see ROW_NAMED). */
  allNamed: boolean;
  isActive: boolean;
  /** The pointer's clientY while it is over the rail; far away otherwise. */
  pointerY: MotionValue<number>;
  onSeek: (key: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  /* Distance from the pointer to this row's centre, measured live: the rail
     is sticky, so the row's screen position depends on scroll and cannot be
     precomputed. Reading the rect here is fine -- this runs per pointer
     event, never during render. */
  const distance = useTransform(pointerY, (y: number) => {
    const box = ref.current?.getBoundingClientRect();
    return box ? y - (box.top + box.height / 2) : 1e5;
  });
  const scale = useSpring(
    useTransform(distance, [-DOCK_REACH, 0, DOCK_REACH], [1, DOCK_PEAK, 1]),
    DOCK_SPRING
  );

  /* WHEN THIS ROW SAYS ITS NAME.
     Roomy rail: always, and the pointer changes nothing.
     Tight rail: the pointer names whatever it is over, and a row that is
     ALREADY named steps aside as the pointer approaches its neighbours --
     the |2n-1| shape below, which is 1 with the pointer far away, 0 with it
     a row off, and 1 again with it dead on. Without that, revealing 1956
     would print it straight through the 1950 sitting eleven pixels away. */
  const near = NAME_REACH_ROWS * height;
  const named = useSpring(
    useTransform(
      distance,
      [-near, -near * 0.55, 0, near * 0.55, near],
      namedAtRest || isActive ? [1, 0, 1, 0, 1] : [0, 0, 1, 0, 0]
    ),
    DOCK_SPRING
  );

  return (
    <m.button
      ref={ref}
      type="button"
      onClick={() => onSeek(key)}
      aria-current={isActive ? "true" : undefined}
      aria-label={label}
      title={`${label}: ${count.toLocaleString()} ${count === 1 ? "photograph" : "photographs"}`}
      /* "Undated" is lifted off the run of years by UNDATED_GAP rather than
         sitting at the foot of it, where it would read as the year before
         1926. The gap is already taken out of the height the rows divide. */
      style={{ scale, transformOrigin: "right center", height, marginTop: key === "unknown" ? UNDATED_GAP : undefined }}
      className={cn(
        "group flex w-full shrink-0 items-center justify-end gap-2 rounded-[var(--radius-sm)] pr-1 text-right",
        "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isActive ? "text-canopy" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span
        aria-hidden
        /* An ink tint, not `--border`. The rail sits on the page base
           rather than on a card, and border #DFD8CB against background
           #E4E1D5 is well under the just-noticeable step, so the marks
           were invisible in the first screenshot -- labels with nothing
           beside them. A translucent ink also lifts on dark, where a fixed
           hairline colour would sink. */
        className={cn(
          "h-[2px] shrink-0 rounded-full transition-colors duration-150",
          isActive ? "bg-canopy" : "bg-foreground/25 group-hover:bg-foreground/50"
        )}
        style={{ width: mark }}
      />
      <m.span
        aria-hidden
        /* Fixed width, so the marks all start from the same line however
           many digits the label has -- a ragged left edge would read as
           noise in the bar chart rather than as typography. */
        className={cn(
          "w-[34px] shrink-0 text-[11px] leading-none tabular-nums tracking-[0.04em]",
          isActive ? "font-semibold" : "font-medium"
        )}
        style={allNamed ? undefined : { opacity: named }}
      >
        {label}
      </m.span>
    </m.button>
  );
}

/** The wide-screen rail: marks in the margin. */
export function YearRail({
  bands,
  active,
  onSeek,
  className,
}: {
  bands: BandCount[];
  /** The band currently on screen, read from scroll position. "" while
   *  nothing has settled yet (the very first paint, before the observer's
   *  first callback). */
  active: string;
  onSeek: (key: string) => void;
  className?: string;
}) {
  const { nav, height: columnHeight } = useColumnHeight(bands.length);
  const { rows, most, row, allNamed } = useRailRows(bands, columnHeight);
  /* Far away, not zero: 1e5 keeps every row's distance outside DOCK_REACH,
     so the rail rests flat until a pointer actually arrives. */
  const pointerY = useMotionValue(1e5);
  // One year is not a shape, it is a fact, and a rail of one mark is noise.
  if (rows.length < 2) return null;

  return (
    <nav
      ref={nav}
      aria-label="Jump to when the photograph was taken"
      onPointerMove={(e) => pointerY.set(e.clientY)}
      onPointerLeave={() => pointerY.set(1e5)}
      /* Sticky, so the index stays with you down twenty thousand photographs
         the way a thumb index stays with a book. `top-6` clears the sticky
         page chrome above it. */
      className={cn("sticky top-6 hidden w-[92px] shrink-0 flex-col items-end xl:flex", className)}
    >
      {rows.map((r) => (
        <RailRow
          key={r.key}
          row={r}
          /* The mark. Length is the year's share of the biggest year, with a
             floor -- a year holding three photographs must still be pressable
             and still read as present, and a mark shorter than about 5px
             reads as a speck of dust rather than as a quantity. */
          mark={Math.max(5, Math.round((r.count / most) * 40))}
          height={row}
          allNamed={allNamed}
          isActive={active === r.key}
          pointerY={pointerY}
          onSeek={onSeek}
        />
      ))}
    </nav>
  );
}
