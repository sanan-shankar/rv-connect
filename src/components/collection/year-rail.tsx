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
 *  DECADES AT REST. IT OPENS INTO YEARS UNDER THE POINTER, AND ONLY
 *  THEN. It listed decades until 2026-08-30, then every year, and every
 *  year standing there was wrong -- "eh too many ticks", sixty
 *  near-identical marks reading as texture rather than as a scale. What
 *  the owner asked for instead, twice, is a real expansion: "just
 *  decades but it beautifully expands becoming granular when you hover,
 *  keep the magnification effect", then "decade spaced like before ...
 *  they're hidden but they'll show on hover. I want it to expand only
 *  when you hover."
 *
 *  So there are two layouts and the rail springs between them.
 *
 *    AT REST, the decades stack from the top at the row height the rail
 *    has always used, adjacent, about ten of them: the compact index it
 *    was before any of this.
 *
 *    OPEN, every year the archive holds takes its own place down the
 *    full column, which is the ruler you can pick 1956 off. The decades
 *    travel from their compact slots to their true ones and the years
 *    come out from behind the decade they belong to.
 *
 *  Both layouts are the same rows in the same DOM: a row's position is
 *  a `y` transform between two numbers, never a reflow, so the page
 *  underneath never learns any of this happened. The rail's own hit box
 *  grows with it, which is what makes the open state stable -- to leave
 *  you have to leave the BIG box, so there is no edge to flicker on.
 *
 *  A DECADE'S ANCHOR IS A REAL YEAR, the row nearest that decade's start
 *  rather than the decade itself. Nothing is filed under "the 1950s" as
 *  a position on this scale -- there is a row for 1953 because there are
 *  photographs from 1953 -- and inventing an empty 1950 row to hang the
 *  word on would put a mark on the scale for a year nobody photographed.
 *  So the 1950s reads as "1953", which is both the anchor the eye needs
 *  and the truth about what is there.
 *
 *  A SMALL ARCHIVE SKIPS ALL OF IT. While there is room for every year
 *  to be named -- rows at 15px or better -- they all simply are, at rest,
 *  the two layouts are the same layout, and nothing ever expands. The
 *  live Collection is four bands and looks exactly like the rail that
 *  shipped before any of this.
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
 *  ROW_REST is the row the rail has used since it was a list of decades,
 *  and the closed state is exactly that list again -- "decade spaced like
 *  before" (owner, 2026-08-31).
 *
 *  ROW_MIN is where a mark stops reading as a mark once the rail is open and
 *  a century has to fit: below about six pixels two neighbours merge into a
 *  smear. ROW_NAMED is the row height at which a label fits beside its own
 *  mark -- the type is 11px, and two 11px labels on 15px rows already touch
 *  at the ascender. An archive whose years all clear it never needs an open
 *  state at all.
 * ------------------------------------------------------------------ */
const ROW_REST = 17;
const ROW_MIN = 6;
const ROW_NAMED = 15;

/** The gap that lifts "Undated" off the years. It is not a year and does not
 *  belong in their run; a plain row would read as the year before the oldest. */
const UNDATED_GAP = 10;

/** What the rail leaves below itself when open, so the oldest year is not
 *  welded to the bottom of the window. */
const RAIL_FOOT = 24;

/* ------------------------------------------------------------------ *
 *  The dock. "Maybe some kind of subtle magnification while hovering
 *  over them, like a mac dock" (owner, 2026-08-29), and kept on purpose
 *  through two redesigns since ("keep the magnification effect?") -- so
 *  the rows do what the Dock does: swell toward the pointer and settle
 *  as it leaves, on a spring, with the neighbours carrying a share of it.
 *
 *  Transform only, anchored to the right edge, so the right-aligned
 *  labels stay a clean column while the rows grow leftward into the
 *  margin -- and the swell never moves a row, only its paint.
 * ------------------------------------------------------------------ */
const DOCK_REACH = 64; // px of falloff either side of the pointer
const DOCK_PEAK = 1.16;
const DOCK_SPRING = { stiffness: 400, damping: 28 };

/** The opening itself. Slower and softer than the dock: this one moves sixty
 *  rows at once and wants to read as a thing unfolding, not as a thing
 *  snapping. */
const OPEN_SPRING = { stiffness: 260, damping: 30, mass: 0.9 };

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
 *  the bucket row -- and that is the state it is FIRST opened in. Sizing the
 *  open layout against the stuck height put the oldest years below the fold,
 *  which is the exact thing the open state exists not to do.
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
  /** A decade, an end of the scale, or Undated: drawn in both layouts. */
  anchor: boolean;
  /** The mark's length in px, already scaled to the archive's shape. */
  mark: number;
  /** Where this row sits with the rail closed, and where it sits open. The
   *  only difference between the two layouts, and a transform either way. */
  restY: number;
  openY: number;
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
  const undated = held.has("unknown");
  const keys = [...span.map(String), ...(undated ? ["unknown"] : [])];

  /* The biggest YEAR, not the biggest band: a third of the archive being
     undated is a real fact, but scaling the years against it flattens every
     one of them into the same stub and throws away the shape the rail exists
     to draw. Undated is clamped to the same ceiling instead. */
  const most = span.reduce((m, y) => Math.max(m, held.get(String(y)) ?? 0), 0) || 1;

  /* ---------------------------------------------------------------- *
   *  WHAT THE CLOSED RAIL IS MADE OF.
   *
   *  The two ends, because a ruler is read by its ends first -- they say how
   *  far back the archive goes, which is the most useful thing the rail can
   *  tell somebody at rest. Undated, because it is not a year and an
   *  unlabelled mark below a gap is unreadable rather than merely
   *  unlabelled. And one row per decade in between.
   *
   *  MIN_APART is what stops two of them printing through each other once
   *  the rail is OPEN and the rows are eight pixels tall: a decade whose
   *  nearest year is crowded against an anchor already chosen simply does
   *  not get one. The decade above it is close enough for the eye, and a
   *  collision is worse than a gap. */
  const MIN_APART = 3;
  const anchors: number[] = [];
  const room = (i: number) => anchors.every((a) => Math.abs(i - a) >= MIN_APART);
  if (span.length) {
    anchors.push(0);
    if (span.length - 1 > 0 && room(span.length - 1)) anchors.push(span.length - 1);
    /* Newest decade first, so the ones nearest today -- where the archive is
       densest and the reader most often is -- win any crowding contest. */
    for (let d = Math.floor(span[0] / 10) * 10; d >= span[span.length - 1]; d -= 10) {
      let best = -1;
      for (let i = 0; i < span.length; i++) {
        if (best < 0 || Math.abs(span[i] - d) < Math.abs(span[best] - d)) best = i;
      }
      if (best >= 0 && !anchors.includes(best) && room(best)) anchors.push(best);
    }
  }
  const isAnchor = new Set(anchors);
  if (undated) isAnchor.add(keys.length - 1);

  /* THE OPEN ROW, and whether an open state is needed at all. An archive
     whose every year clears ROW_NAMED is simply drawn, all of it, always --
     there is nothing an expansion could add. */
  const spare = columnHeight - (undated ? UNDATED_GAP : 0);
  const open = Math.max(ROW_MIN, Math.min(ROW_REST, Math.floor(spare / Math.max(keys.length, 1))));
  const expands = open < ROW_NAMED;

  let rank = 0;
  let behind = 0; // where the last anchor sits in the CLOSED layout
  const rows: Row[] = keys.map((key, i) => {
    const anchor = isAnchor.has(i);
    const gap = key === "unknown" ? UNDATED_GAP : 0;
    const openY = i * open + gap;
    /* Closed, the anchors stack from the top and every year hides behind the
       decade it belongs to -- so opening slides it out from under that
       decade rather than materialising it somewhere unrelated. One spring,
       no stagger: the rows near the top barely travel and the ones at the
       foot travel the length of the column, so the fan falls out of the
       distances themselves. */
    if (anchor) behind = rank++ * ROW_REST + gap;
    return {
      key,
      label: bandLabel(key),
      count: held.get(key) ?? 0,
      anchor,
      /* Length is the year's share of the biggest year, with a floor -- a
         year holding three photographs must still be pressable and still
         read as present, and a mark shorter than about 5px reads as a speck
         of dust rather than as a quantity. */
      mark: Math.max(5, Math.min(40, Math.round(((held.get(key) ?? 0) / most) * 40))),
      restY: expands ? behind : openY,
      openY,
    };
  });

  return {
    rows,
    /** The row height while open, which is what the naming maths reads. */
    open,
    expands,
    /** The rail's own height in each state -- its hit box as much as its
     *  drawing. Closed it is only as tall as the decades it shows, so
     *  passing the margin does not open it from three hundred pixels away. */
    restHeight: expands ? rank * ROW_REST + (undated ? UNDATED_GAP : 0) : columnHeight,
  };
}

function RailRow({
  row: { key, label, count, anchor, mark, restY, openY },
  height,
  /** True while the rail is open: every year is drawn. */
  open,
  /** The same fact as a motion value, because the naming transform has to
   *  RECOMPUTE when it changes rather than wait for a render. */
  openness,
  /** The open row height, likewise. */
  rowHeight,
  isActive,
  /** The pointer's clientY while it is over the rail; far away otherwise. */
  pointerY,
  onSeek,
}: {
  row: Row;
  height: number;
  open: boolean;
  openness: MotionValue<number>;
  rowHeight: MotionValue<number>;
  isActive: boolean;
  pointerY: MotionValue<number>;
  onSeek: (key: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  /* WHERE THIS ROW IS, as a spring between the two layouts. A motion value
     rather than an `animate` prop because the naming below has to be able to
     ask, at any frame, how far the pointer is from this row -- see the note
     on `distance`.

     The target is its own motion value rather than the plain number, which
     is not a style choice: `useSpring(number)` takes that number as a
     STARTING point in this version and never re-targets when it changes, so
     the rows sat at their closed positions for ever while everything else
     behaved as though the rail had opened. Springing from a motion value
     tracks. */
  const target = useMotionValue(open ? openY : restY);
  useLayoutEffect(() => {
    target.set(open ? openY : restY);
  }, [target, open, openY, restY]);
  const y = useSpring(target, OPEN_SPRING);

  /* Distance from the pointer to this row's centre. The rect is read live,
     because the rail is sticky and its rows travel; `y` is an input for the
     same reason `openness` is one below -- a transform recomputes when an
     INPUT moves, and while the rail opens it is the ROWS that are moving and
     the pointer that is holding still. Without `y` here, the six years that
     had been stacked behind the 1970 anchor kept the distance they had while
     they were stacked, and all six named themselves in a heap on top of each
     other after they had fanned out. */
  const distance = useTransform([pointerY, y], ([py]: number[]) => {
    const box = ref.current?.getBoundingClientRect();
    return box ? py - (box.top + box.height / 2) : 1e5;
  });
  const scale = useSpring(
    useTransform(distance, [-DOCK_REACH, 0, DOCK_REACH], [1, DOCK_PEAK, 1]),
    DOCK_SPRING
  );

  /* WHEN THIS ROW SAYS ITS NAME.
       - the pointer's own row names itself, falling off over NAME_FALLOFF
       - an anchor row is named whenever the pointer is far away, and STEPS
         ASIDE as it comes near a neighbour, or the reveal would print
         through it
       - everything else is silent unless the pointer is on it

     EVERY FACT THIS DEPENDS ON IS AN INPUT, which is the whole lesson of the
     two bugs this handful of lines has had.

     The first was the owner's. It used to interpolate across a fixed input
     range, `[-near, ..., near]`, and `near` is a multiple of the row height
     -- which changes the moment the window is resized. The range did not
     follow, so the name that lit was one row off the mark that swelled:
     "sometimes after resizing window the highlight number is one higher than
     the highlighted ticks" (2026-08-31). Computing it instead of
     interpolating fixes the arithmetic.

     The second was mine, and only a Playwright click found it: a transform
     recomputes when an INPUT moves, and "is the rail open" was React state,
     which no motion value hears about. A pointer that entered and STOPPED
     DEAD drew its marks and named nothing, and any further movement hid it
     -- which is exactly why probing it by hand missed it.

     So both arrive as motion values. `anchor` is the one fact left in a ref,
     and it can only change when the archive itself does. */
  const anchored = useRef(anchor);
  useLayoutEffect(() => {
    anchored.current = anchor;
  }, [anchor]);
  const named = useSpring(
    useTransform([distance, openness, rowHeight], ([d, on, h]: number[]) => {
      if (h >= ROW_NAMED) return 1;
      const t = Math.min(1, Math.abs(d) / (NAME_REACH_ROWS * h));
      const mine = on ? Math.max(0, 1 - t / NAME_FALLOFF) : 0;
      if (!anchored.current) return mine;
      return Math.max(mine, Math.max(0, (t - NAME_FALLOFF) / (1 - NAME_FALLOFF)));
    }),
    DOCK_SPRING
  );

  const shown = anchor || open;

  return (
    <m.button
      ref={ref}
      type="button"
      onClick={() => onSeek(key)}
      aria-current={isActive ? "true" : undefined}
      aria-label={label}
      title={`${label}: ${count.toLocaleString()} ${count === 1 ? "photograph" : "photographs"}`}
      /* Absolutely placed and moved by transform, so opening the rail is
         sixty rows travelling and nothing at all reflowing. */
      style={{ scale, y, transformOrigin: "right center", height }}
      animate={{ opacity: shown ? 1 : 0 }}
      initial={false}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group absolute inset-x-0 top-0 flex items-center justify-end gap-2 rounded-[var(--radius-sm)] pr-1 text-right",
        "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        !shown && "pointer-events-none",
        isActive ? "text-canopy" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span
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
        style={{ width: mark }}
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
  const { rows, open: openRow, expands, restHeight } = useRailRows(bands, columnHeight);
  /* Far away, not zero: 1e5 keeps every row's distance outside DOCK_REACH,
     so the rail rests flat until a pointer actually arrives. */
  const pointerY = useMotionValue(1e5);
  /* WHETHER THE RAIL IS OPEN, as React state for the layout and as a motion
     value for the naming -- see the long note in `RailRow` for why one is
     not enough. It turns on when a pointer enters the closed box and off
     when one leaves the OPEN box, which is bigger; there is no edge where
     those two disagree, so there is nothing to flicker. */
  const [open, setOpen] = useState(false);
  const openness = useMotionValue(0);
  const rowHeight = useMotionValue(openRow);
  useLayoutEffect(() => {
    rowHeight.set(openRow);
  }, [rowHeight, openRow]);

  // One year is not a shape, it is a fact, and a rail of one mark is noise.
  if (rows.length < 2) return null;

  return (
    <nav
      ref={nav}
      aria-label="Jump to when the photograph was taken"
      onPointerMove={(e) => {
        openness.set(1);
        pointerY.set(e.clientY);
        if (!open) setOpen(true);
      }}
      onPointerLeave={() => {
        openness.set(0);
        pointerY.set(1e5);
        setOpen(false);
      }}
      /* Sticky, so the index stays with you down twenty thousand photographs
         the way a thumb index stays with a book. `top-6` clears the sticky
         page chrome above it. The height is the hit box as much as the
         drawing, and it is a plain style rather than an animated one: the
         box has to be the BIG one the instant the rail opens, or the pointer
         can find itself outside a box that is still growing. */
      style={{ height: open || !expands ? columnHeight : restHeight }}
      className={cn(
        "sticky top-6 hidden w-[92px] shrink-0 flex-col items-end xl:flex",
        // Relative, because every row inside is placed by transform.
        "relative",
        className
      )}
    >
      {rows.map((r) => (
        <RailRow
          key={r.key}
          row={r}
          height={openRow}
          open={open || !expands}
          openness={openness}
          rowHeight={rowHeight}
          isActive={active === r.key}
          pointerY={pointerY}
          onSeek={onSeek}
        />
      ))}
    </nav>
  );
}
