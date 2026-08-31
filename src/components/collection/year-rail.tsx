"use client";

/* ------------------------------------------------------------------ *
 *  The year rail: when, as a picture rather than a menu.
 *
 *  This replaces the "When" dropdown, and the replacement is the point.
 *  A dropdown tells you nothing until you open it and then makes you
 *  guess; the same values drawn as marks whose length is how many
 *  photographs each holds tell you, at rest and without a click, what
 *  shape the archive is. Google Photos' scrubber is the same idea and it
 *  is what makes a hundred thousand photographs navigable with no
 *  folders at all.
 *
 *  DECADES AT REST, YEARS UNDER THE POINTER. It listed decades until
 *  2026-08-30, then every year, and every year at rest was wrong:
 *  "eh too many ticks ... maybe just decades but it beautifully expands
 *  becoming granular when you hover, keep the magnification effect?"
 *  Fifty-nine near-identical marks read as texture, not as a scale.
 *
 *  So the rows themselves NEVER MOVE -- not on hover, not on expansion,
 *  not ever. Every year the archive holds keeps the slot it already had,
 *  at the spacing and the type size that shipped ("I like the spacing,
 *  font sizes and all of the currently pushed version", owner). Only the
 *  lettering and the marks change: at rest one row per decade is drawn
 *  and the years between them are not, and bringing a pointer near fades
 *  the years in exactly where they already were, unfurling from wherever
 *  you arrived. Nothing reflows, so nothing can jump under your hand --
 *  which is the failure the version before this one had: reveal ranges
 *  measured against a stale row height, so after a window resize the name
 *  that lit was one row off the mark that swelled.
 *
 *  A DECADE'S ANCHOR IS A REAL YEAR, the row nearest that decade's start
 *  rather than the decade itself. Nothing is filed under "the 1950s" as a
 *  position on this scale -- there is a row for 1953 because there are
 *  photographs from 1953 -- and inventing an empty 1950 row to hang the
 *  word on would put a mark on the scale for a year nobody photographed.
 *  So the 1950s reads as "1953", which is both the anchor the eye needs
 *  and the truth about what is there.
 *
 *  A SMALL ARCHIVE SKIPS ALL OF IT. While there is room for every year
 *  to be named -- rows at 15px or better -- they all simply are, at rest,
 *  and there is nothing to expand. The live Collection is four bands and
 *  looks exactly like the rail that shipped before any of this.
 *
 *  IT SEEKS. IT DOES NOT FILTER. Pressing a year used to narrow the grid
 *  to it, which meant landing there had no way back except a reload --
 *  "I now have no way to go back? ... doing that has locked me into
 *  2020s" (owner, 2026-08-29). The rail now travels one continuous river
 *  to that stretch of it; photographs above and below still exist and
 *  scrolling either way keeps going. `active` therefore is not a filter
 *  you set, it is read off what is actually on screen (`useActiveBand`
 *  in `photo-river.tsx`) -- the rail reports where you are rather than
 *  deciding it.
 *
 *  It also answers the owner's "year should not be the primary
 *  organising axis": time is a lens down the right-hand edge, never a
 *  gate you pass through to reach the photographs.
 *
 *  Below 1280px this margin does not exist; the phone scrubber down the
 *  right edge of the grid is its own component, not a second shape of
 *  this one -- a narrow scrolling line of decade words shipped here once
 *  and was rejected on sight ("remove the decades and undated thing
 *  from mobile, it looks really bad").
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
 *  ROW_MAX is the old decade rail's row, so a small archive looks exactly
 *  like the rail that shipped before this one rather than like a diagram of
 *  itself. ROW_MIN is where a mark stops reading as a mark: below about six
 *  pixels two neighbours merge into a smear.
 *
 *  ROW_NAMED is the row height at which a label fits beside its own mark.
 *  The type is 11px; two 11px labels on 15px rows already touch at the
 *  ascender. Above it every year is named at rest and the whole
 *  decades-that-expand apparatus below simply never engages.
 * ------------------------------------------------------------------ */
const ROW_MAX = 17;
const ROW_MIN = 6;
const ROW_NAMED = 15;

/** The gap that lifts "Undated" off the years. It is not a year and does not
 *  belong in their run; a plain row would read as the year before the oldest. */
const UNDATED_GAP = 10;

/** What the rail leaves below itself, so the oldest year is not welded to
 *  the bottom of the window. */
const RAIL_FOOT = 24;

/* ------------------------------------------------------------------ *
 *  The dock. "Maybe some kind of subtle magnification while hovering
 *  over them, like a mac dock" (owner, 2026-08-29), and kept on purpose
 *  through the redesign ("keep the magnification effect?") -- so the
 *  rows do what the Dock does: swell toward the pointer and settle as it
 *  leaves, on a spring, with the neighbours carrying a share of it.
 *
 *  Transform only, anchored to the right edge, so the right-aligned
 *  labels stay a clean column while the rows grow leftward into the
 *  margin -- and the BUTTONS never move, only their paint: the hit
 *  targets hold still under the cursor, which keeps the house rule
 *  ("hover never moves a control") in the sense that matters.
 * ------------------------------------------------------------------ */
const DOCK_REACH = 64; // px of falloff either side of the pointer
const DOCK_PEAK = 1.16;
const DOCK_SPRING = { stiffness: 400, damping: 28 };

/** How far from the pointer a year still says its own name, as a multiple of
 *  the row height -- so it is always about one row either side, whatever the
 *  rows currently measure. Deliberately far tighter than DOCK_REACH: the
 *  swell covers eight rows and reads as one soft bulge, and eight labels at
 *  once in a column this tight is a stack of overlapping numbers. */
const NAME_REACH_ROWS = 1.4;

/** Where a name has faded out entirely, as a fraction of that reach. Under
 *  it the pointer's own row is naming itself; over it an anchor row is
 *  coming back. */
const NAME_FALLOFF = 0.55;

/* ------------------------------------------------------------------ *
 *  How much height there actually is, which is NOT the window.
 *
 *  The rail is sticky at `top-6`, so once you have scrolled it has the
 *  window minus 24px to work with. Before you have scrolled it starts
 *  wherever the river starts -- about 164px down, under the page title and
 *  the bucket row -- and that is the state it is FIRST seen in. Sizing the
 *  rows against the stuck height put the oldest years below the fold on
 *  arrival, which is the exact thing this rail exists not to do.
 *
 *  So it measures its own top in the document and sizes for THERE, the
 *  tightest position it is ever in, and carries a little slack at the foot
 *  once it sticks. Slack you never see beats years you cannot reach.
 * ------------------------------------------------------------------ */
function useColumnHeight(rowCount: number) {
  const nav = useRef<HTMLElement>(null);
  /* 560 is not a guess at the reader's window, it is a deliberately SHORT
     first pass: erring tight and growing is invisible, while drawing 17px
     rows and snapping them to 8px a frame later is a lurch. */
  const [height, setHeight] = useState(560);
  const measure = useCallback(() => {
    const el = nav.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    setHeight(Math.max(0, window.innerHeight - top - RAIL_FOOT));
  }, []);
  /* Layout effect, so the corrected height is in place before the browser
     paints the fallback one -- and re-run on the ROW COUNT, not just on
     mount. A rail of fewer than two rows renders nothing at all, so the ref
     is empty and the first measurement is a no-op; changing the bucket back
     to one the archive has years for then mounted the nav with the fallback
     still in place and never corrected it. */
  useLayoutEffect(measure, [measure, rowCount]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  return { nav, height };
}

type Row = {
  key: string;
  label: string;
  count: number;
  /** Drawn and named with no pointer anywhere near: the decades, the two
   *  ends of the scale, and Undated. Everything else is what "granular"
   *  means. */
  anchor: boolean;
  /** The mark's length in px, already scaled to the archive's shape. */
  mark: number;
};

function useRailRows(bands: BandCount[], columnHeight: number) {
  const held = new Map(bands.map((b) => [b.key, b.count]));
  /* Newest first, matching the river's own direction, with "Undated" last --
     it is not a year and cannot be sorted among them. Only years that hold
     something get a row: an empty year is not a fact about the archive, and
     pressing one could only ever land on the year below it. */
  const span = [...held.keys()]
    .filter((k) => k !== "unknown")
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a);
  const keys = [...span.map(String), ...(held.has("unknown") ? ["unknown"] : [])];

  /* The biggest YEAR, not the biggest band: a third of the archive being
     undated is a real fact, but scaling the years against it flattens every
     one of them into the same stub and throws away the shape the rail exists
     to draw. Undated is clamped to the same ceiling instead. */
  const most = span.reduce((m, y) => Math.max(m, held.get(String(y)) ?? 0), 0) || 1;

  /* ---------------------------------------------------------------- *
   *  WHAT IS DRAWN WITH NO POINTER IN THE RAIL.
   *
   *  The two ends, because a ruler is read by its ends first -- they say how
   *  far back the archive goes, which is the most useful thing the rail can
   *  tell somebody at rest. Undated, because it is not a year and an
   *  unlabelled mark below a gap is unreadable rather than merely
   *  unlabelled. And one row per decade in between, because ten marks down
   *  a margin is a scale and sixty is a texture.
   *
   *  MIN_APART is what stops two anchors printing through each other: at
   *  eleven pixels a row, two 11px labels two rows apart already touch. A
   *  decade whose nearest year is crowded against an anchor already chosen
   *  simply does not get one -- the decade above it is close enough for the
   *  eye, and a collision is worse than a gap. */
  const MIN_APART = 3;
  const anchors = new Set<number>();
  const room = (i: number) => [...anchors].every((a) => Math.abs(i - a) >= MIN_APART);
  if (span.length) {
    anchors.add(0);
    if (room(span.length - 1)) anchors.add(span.length - 1);
    /* Newest decade first, so the ones nearest today -- where the archive is
       densest and the reader most often is -- win any crowding contest. */
    for (let d = Math.floor(span[0] / 10) * 10; d >= span[span.length - 1]; d -= 10) {
      let best = -1;
      for (let i = 0; i < span.length; i++) {
        if (best < 0 || Math.abs(span[i] - d) < Math.abs(span[best] - d)) best = i;
      }
      if (best >= 0 && !anchors.has(best) && room(best)) anchors.add(best);
    }
  }

  const rows: Row[] = keys.map((key, i) => ({
    key,
    label: bandLabel(key),
    count: held.get(key) ?? 0,
    anchor: key === "unknown" || anchors.has(i),
    /* Length is the year's share of the biggest year, with a floor -- a year
       holding three photographs must still be pressable and still read as
       present, and a mark shorter than about 5px reads as a speck of dust
       rather than as a quantity. */
    mark: Math.max(5, Math.min(40, Math.round(((held.get(key) ?? 0) / most) * 40))),
  }));

  const spare = columnHeight - (held.has("unknown") ? UNDATED_GAP : 0);
  const row = Math.max(ROW_MIN, Math.min(ROW_MAX, Math.floor(spare / Math.max(rows.length, 1))));
  return { rows, row };
}

function RailRow({
  row: { key, label, count, anchor, mark },
  index,
  height,
  /** True while a pointer is in the rail: the years are shown. This drives
   *  the MARKS; the names read `granularity` below, which is the same fact
   *  as a motion value. */
  granular,
  granularity,
  rowHeight,
  /** The row the pointer arrived on, which the unfurl radiates out from.
   *  -1 before any pointer has been in the rail. */
  from,
  isActive,
  /** The pointer's clientY while it is over the rail; far away otherwise. */
  pointerY,
  onSeek,
}: {
  row: Row;
  index: number;
  height: number;
  granular: boolean;
  /** 1 while a pointer is in the rail, 0 otherwise. */
  granularity: MotionValue<number>;
  /** The current row height. A motion value rather than the plain number
   *  above because the naming transform has to RECOMPUTE when it changes,
   *  not merely read the new value the next time something else moves. */
  rowHeight: MotionValue<number>;
  from: number;
  isActive: boolean;
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
       - the pointer's own row names itself, falling off over NAME_FALLOFF
       - an anchor row is named when the pointer is far away, and STEPS ASIDE
         as it comes near a neighbour, or the reveal would print through it
       - everything else is silent unless the pointer is on it

     EVERY FACT THIS DEPENDS ON IS AN INPUT, which is the whole lesson of the
     two bugs this handful of lines has now had.

     The first was the owner's. It used to interpolate across a fixed input
     range, `[-near, ..., near]`, and `near` is a multiple of the row height
     -- which changes the moment the window is resized. The range did not
     follow, so the name that lit was one row off the mark that swelled:
     "sometimes after resizing window the highlight number is one higher than
     the highlighted ticks" (2026-08-31). Computing it instead of
     interpolating fixes the arithmetic.

     The second was mine, and only a Playwright click found it: a transform
     recomputes when an INPUT moves, and "is there a pointer in the rail" was
     React state, which no motion value hears about. `arrive` sets the
     pointer position first and flips granular second, so the single
     evaluation that ran still believed the rail was at rest and nothing ever
     asked it again -- a pointer that entered and STOPPED DEAD drew its marks
     and named nothing. Any further mouse movement hid it, which is exactly
     why probing this by hand missed it and a single synthetic move did not.

     So both arrive as motion values. `anchor` is the one fact left in a ref,
     and it can only change when the archive itself does. */
  const anchored = useRef(anchor);
  useLayoutEffect(() => {
    anchored.current = anchor;
  }, [anchor]);
  const named = useSpring(
    useTransform([distance, granularity, rowHeight], ([d, on, h]: number[]) => {
      if (h >= ROW_NAMED) return 1;
      const t = Math.min(1, Math.abs(d) / (NAME_REACH_ROWS * h));
      const mine = on ? Math.max(0, 1 - t / NAME_FALLOFF) : 0;
      if (!anchored.current) return mine;
      return Math.max(mine, Math.max(0, (t - NAME_FALLOFF) / (1 - NAME_FALLOFF)));
    }),
    DOCK_SPRING
  );

  /* The unfurl. The years do not appear all at once -- they run outward from
     wherever the pointer arrived, about six milliseconds a row, which reads
     as the scale opening under your hand rather than as a panel switching
     on. Capped, because a hundred rows at 6ms each is a slow reveal at the
     far end and nobody is looking there. */
  const shown = height >= ROW_NAMED || anchor || granular;
  const delay = from < 0 ? 0 : Math.min(0.16, Math.abs(index - from) * 0.006);

  return (
    <m.button
      ref={ref}
      type="button"
      onClick={() => onSeek(key)}
      aria-current={isActive ? "true" : undefined}
      aria-label={label}
      title={`${label}: ${count.toLocaleString()} ${count === 1 ? "photograph" : "photographs"}`}
      /* "Undated" is lifted off the run of years rather than sitting at the
         foot of it, where it would read as the year before the oldest. The
         gap is already taken out of the height the rows divide. */
      style={{
        scale,
        transformOrigin: "right center",
        height,
        marginTop: key === "unknown" ? UNDATED_GAP : undefined,
      }}
      className={cn(
        "group flex w-full shrink-0 items-center justify-end gap-2 rounded-[var(--radius-sm)] pr-1 text-right",
        "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isActive ? "text-canopy" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <m.span
        aria-hidden
        /* An ink tint, not `--border`. The rail sits on the page base rather
           than on a card, and border #DFD8CB against background #E4E1D5 is
           well under the just-noticeable step, so the marks were invisible in
           the first screenshot -- labels with nothing beside them. A
           translucent ink also lifts on dark, where a fixed hairline colour
           would sink. */
        className={cn(
          "h-[2px] shrink-0 rounded-full transition-colors duration-150",
          isActive ? "bg-canopy" : "bg-foreground/25 group-hover:bg-foreground/50"
        )}
        style={{ width: mark, transformOrigin: "right center" }}
        /* Growing leftward out of the label column, not fading in place: a
           ruler unrolls, it does not materialise. */
        animate={{ opacity: shown ? 1 : 0, scaleX: shown ? 1 : 0 }}
        initial={false}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1], delay }}
      />
      <m.span
        aria-hidden
        /* Fixed width, so the marks all start from the same line however many
           digits the label has -- a ragged left edge would read as noise in
           the bar chart rather than as typography. */
        className={cn(
          "w-[34px] shrink-0 text-[11px] leading-none tabular-nums tracking-[0.04em]",
          isActive ? "font-semibold" : "font-medium"
        )}
        style={{ opacity: named }}
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
  const { rows, row } = useRailRows(bands, columnHeight);
  /* Far away, not zero: 1e5 keeps every row's distance outside DOCK_REACH,
     so the rail rests flat until a pointer actually arrives. */
  const pointerY = useMotionValue(1e5);
  /* The two facts the unfurl needs, and the ONLY React state a pointer move
     can touch: whether there is a pointer at all, and which row it arrived
     on. Both change once per visit, not once per mousemove -- everything
     that tracks the pointer continuously is a motion value and never
     re-renders anything. */
  const [granular, setGranular] = useState(false);
  const [from, setFrom] = useState(-1);
  /* The same two facts the names need, as motion values, so the naming
     transform recomputes off them directly instead of waiting for a render
     it has no way to hear about. See the long note in `RailRow`. */
  const granularity = useMotionValue(0);
  const rowHeight = useMotionValue(row);
  useLayoutEffect(() => {
    rowHeight.set(row);
  }, [rowHeight, row]);

  const arrive = (clientY: number) => {
    granularity.set(1);
    pointerY.set(clientY);
    if (granular) return;
    const box = nav.current?.getBoundingClientRect();
    if (box) setFrom(Math.floor((clientY - box.top) / Math.max(row, 1)));
    setGranular(true);
  };

  // One year is not a shape, it is a fact, and a rail of one mark is noise.
  if (rows.length < 2) return null;

  return (
    <nav
      ref={nav}
      aria-label="Jump to when the photograph was taken"
      onPointerMove={(e) => arrive(e.clientY)}
      onPointerLeave={() => {
        granularity.set(0);
        pointerY.set(1e5);
        setGranular(false);
      }}
      /* Sticky, so the index stays with you down twenty thousand photographs
         the way a thumb index stays with a book. `top-6` clears the sticky
         page chrome above it. */
      className={cn("sticky top-6 hidden w-[92px] shrink-0 flex-col items-end xl:flex", className)}
    >
      {rows.map((r, i) => (
        <RailRow
          key={r.key}
          row={r}
          index={i}
          height={row}
          granular={granular}
          granularity={granularity}
          rowHeight={rowHeight}
          from={from}
          isActive={active === r.key}
          pointerY={pointerY}
          onSeek={onSeek}
        />
      ))}
    </nav>
  );
}
