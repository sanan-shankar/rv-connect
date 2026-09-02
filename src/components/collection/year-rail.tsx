"use client";

/* ------------------------------------------------------------------ *
 *  The year rail: when, as a picture rather than a menu.
 *
 *  This replaces the "When" dropdown, and the replacement is the point.
 *  A dropdown tells you nothing until you open it and then makes you
 *  guess; the same values drawn as marks whose length is how many
 *  photographs each holds tell you, at rest and without a click, what
 *  shape the archive is.
 *
 *  IT IS A LIST OF DECADES, AND THE ONE YOU POINT AT OPENS INTO ITS
 *  YEARS, PACKED, UNDER IT. Everything below shifts down to make room
 *  and shifts back when you leave.
 *
 *  THE METRICS ARE NOT NEGOTIABLE and they are not this file's to
 *  choose: ROW, the type size, and the dock's three numbers are copied
 *  from the rail that shipped, measured off it rather than remembered.
 *  "I want you to remember that font size, magnification and spacing
 *  between the rows ... in general all the decades are cramped together,
 *  why can't we have it like it is in the pushed version" (owner,
 *  2026-09-02). The rail had drifted to a 17px row against the shipped
 *  23.5px, which is also why the same dock numbers read as less
 *  magnification: the swell is the same multiple of a smaller row.
 *
 *  THE YEARS ARE PACKED. No slot is left for a year the archive does not
 *  hold and none is stretched to fill a block -- "I don't want to leave
 *  empty spaces for years that aren't there", and the stretch is what
 *  made one decade's ticks twice as far apart as another's ("under 2010s
 *  it's okay but 2020s for some reason is so much wider"). Every tick in
 *  the rail is now the same distance from the next, at every level, in
 *  every decade, whatever the archive happens to hold.
 *
 *  WHICH MEANS BLOCKS HAVE DIFFERENT HEIGHTS, and that is what
 *  `SWITCH_TRAVEL` is for. Crossing out of a tall decade into a short
 *  one can leave the pointer past the short one entirely, and without a
 *  brake the rail would run down three or four decades on one gesture.
 *  One decade per row of travel is the brake, which is exactly the
 *  sensitivity the closed list already has.
 *
 *  A SMALL ARCHIVE IS NOT GROUPED. If every year fits down the column at
 *  full row height they are simply all listed, all named, always. The
 *  live Collection is four bands and is, to the pixel, the rail that
 *  shipped.
 *
 *  IT SEEKS. IT DOES NOT FILTER. Pressing a year used to narrow the grid
 *  to it, which meant landing there had no way back except a reload --
 *  "I now have no way to go back? ... doing that has locked me into
 *  2020s" (owner, 2026-08-29). The rail travels one continuous river to
 *  that stretch of it; photographs above and below still exist and
 *  scrolling either way keeps going. `active` therefore is not a filter
 *  you set, it is read off what is actually on screen (`useActiveBand`
 *  in `photo-river.tsx`).
 *
 *  Below 1280px this margin does not exist and the phone gets
 *  `<PhotoScrubber>` instead, which is a different shape for a different
 *  hand rather than this one squeezed.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { m, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { bandLabel } from "@/lib/collection";
import { cn } from "@/lib/utils";

export type BandCount = { key: string; count: number };

/* ------------------------------------------------------------------ *
 *  Measured off the rail that shipped, not chosen here.
 *
 *  A row was `py-[3px]` around an 11px label at the inherited 16.5px
 *  line-height -- 22.5px -- in a column with `gap-px` between rows, so the
 *  pitch is 23.5. Both numbers are kept because the difference is the gap,
 *  and a row that fills its pitch would close it.
 * ------------------------------------------------------------------ */
const ROW = 23.5;
const ROW_H = 22.5;

/** The floor the rows may be squeezed to, and only on a window too short to
 *  hold the rail at full size -- an overflowing rail is worse than a tight
 *  one, and a tight one is still better than a scrollbar. */
const ROW_MIN = 17;

/** The gap that lifts "Undated" off the decades. It is not a decade and does
 *  not belong in their run. */
const UNDATED_GAP = 10;

/** What the rail leaves below itself, so its foot is not welded to the
 *  bottom of the window. */
const RAIL_FOOT = 24;

/** How far the pointer must travel before the rail will change decade again.
 *  One row: the same sensitivity the closed list has, and enough of a brake
 *  that crossing out of a ten-year decade into a one-year decade cannot run
 *  away down the rest of the rail. */
const SWITCH_TRAVEL = ROW;

/* ------------------------------------------------------------------ *
 *  The dock, copied from the shipped rail exactly. "Maybe some kind of
 *  subtle magnification while hovering over them, like a mac dock"
 *  (owner, 2026-08-29). Transform only, anchored to the right edge, so
 *  the right-aligned labels stay a clean column while the rows grow
 *  leftward -- and the swell never moves a row, only its paint.
 * ------------------------------------------------------------------ */
const DOCK_REACH = 64; // px of falloff either side of the pointer
const DOCK_PEAK = 1.16;
const DOCK_SPRING = { stiffness: 400, damping: 28 };

/** Opening and closing. About a quarter slower than the first version of it,
 *  as asked, and just short of critically damped so it arrives without a
 *  bounce. */
const OPEN_SPRING = { stiffness: 150, damping: 23, mass: 0.9 };
const FADE = { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const };

/* ------------------------------------------------------------------ *
 *  How much height there actually is, which is NOT the window.
 *
 *  The rail is sticky at `top-6`, so once you have scrolled it has the
 *  window minus 24px. Before you have scrolled it starts wherever the river
 *  starts -- about 164px down, under the page title and the bucket row --
 *  and that is the state it is first opened in, so it sizes for THERE.
 * ------------------------------------------------------------------ */
function useColumnHeight(rowCount: number) {
  const nav = useRef<HTMLElement>(null);
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
  /** The band this row seeks to. A decade seeks to the newest year it holds,
   *  which is a real band; there is nothing filed under "the 1950s" as a
   *  position in the river. */
  key: string;
  label: string;
  count: number;
  /** Length in px, scaled to the archive's shape. */
  mark: number;
  /** Which decade this belongs to. Undated, and every row of an ungrouped
   *  rail, answer -1. */
  group: number;
  /** True for the decade's own row; false for a year nested under it. */
  head: boolean;
  /** Every band key this row stands for, so a closed decade can light up when
   *  the reader is anywhere inside it. */
  covers: string[];
};

function useRailModel(bands: BandCount[], columnHeight: number) {
  return useMemo(() => {
    const held = new Map(bands.map((b) => [b.key, b.count]));
    /* Newest first, matching the river's own direction, with "Undated" last
       -- it is not a year and cannot be sorted among them. Only years that
       hold something get a row: an empty year is not a fact about the
       archive, and pressing one could only ever land on the year below it. */
    const years = [...held.keys()]
      .filter((k) => k !== "unknown")
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => b - a);
    const undated = held.has("unknown");

    const decades: number[] = [];
    const byDecade = new Map<number, number[]>();
    for (const y of years) {
      const d = Math.floor(y / 10) * 10;
      if (!byDecade.has(d)) {
        byDecade.set(d, []);
        decades.push(d);
      }
      byDecade.get(d)!.push(y);
    }
    const fullest = decades.reduce((m, d) => Math.max(m, byDecade.get(d)!.length), 0);

    /* GROUPED ONLY WHEN THE YEARS STOP FITTING, and the test is the WORST
       case rather than the resting one: a rail that lists every year and then
       has nowhere to put an open decade is not a rail that fits.

       Which means a young archive lists its years plainly -- 2026, 2022, 2021
       -- and only folds into decades once there are more of them than the
       column can hold, about twenty-nine at this row height. That surprised
       the owner, who had approved the decade rail and was seeing years:
       offered the alternative of grouping the moment a second decade exists,
       he chose to keep this. "Let it show as separate years until they fit,
       that's a good idea" (2026-09-02). Recorded because it looks like an
       oversight and is not one. */
    const flatRows = years.length + (undated ? 1 : 0);
    const groupedRows = decades.length + fullest + (undated ? 1 : 0);
    const grouped = flatRows * ROW > columnHeight;

    /* One row height for every row in every state, squeezed only if the
       window is too short to hold the rail's tallest state at full size. */
    const need = (grouped ? groupedRows : flatRows) * ROW + (undated ? UNDATED_GAP : 0);
    const unit =
      need <= columnHeight || need <= 0
        ? ROW
        : Math.max(ROW_MIN, (ROW * columnHeight) / need);
    const rowH = unit - (ROW - ROW_H);

    const biggestYear = years.reduce((m, y) => Math.max(m, held.get(String(y)) ?? 0), 0) || 1;
    const biggestDecade = [...byDecade.values()].reduce(
      (m, ys) => Math.max(m, ys.reduce((t, y) => t + (held.get(String(y)) ?? 0), 0)),
      0
    );
    /* TWO SCALES, ONE PER LEVEL, because the two are never read against each
       other: closed you are comparing decades, open you are comparing the
       years of one. Undated takes the coarse one -- it is a pile, not a year,
       and a third of the archive being undated must not set the year scale. */
    const bar = (n: number, of: number) => Math.max(5, Math.min(40, Math.round((n / (of || 1)) * 40)));

    const rows: Row[] = [];
    if (!grouped) {
      for (const y of years) {
        const key = String(y);
        rows.push({
          key,
          label: key,
          count: held.get(key) ?? 0,
          mark: bar(held.get(key) ?? 0, biggestYear),
          group: -1,
          head: true,
          covers: [key],
        });
      }
    } else {
      decades.forEach((d, g) => {
        const ys = byDecade.get(d)!;
        const total = ys.reduce((t, y) => t + (held.get(String(y)) ?? 0), 0);
        rows.push({
          key: String(ys[0]),
          label: `${d}s`,
          count: total,
          mark: bar(total, biggestDecade),
          group: g,
          head: true,
          covers: ys.map(String),
        });
        for (const y of ys) {
          const key = String(y);
          rows.push({
            key,
            label: key,
            count: held.get(key) ?? 0,
            mark: bar(held.get(key) ?? 0, biggestYear),
            group: g,
            head: false,
            covers: [key],
          });
        }
      });
    }
    if (undated) {
      rows.push({
        key: "unknown",
        label: bandLabel("unknown"),
        count: held.get("unknown") ?? 0,
        mark: bar(held.get("unknown") ?? 0, grouped ? biggestDecade : biggestYear),
        group: -1,
        head: true,
        covers: ["unknown"],
      });
    }

    return { rows, grouped, decades: decades.length, unit, rowH };
  }, [bands, columnHeight]);
}

/** Where every row sits, given which decade is open. Pure arithmetic on the
 *  model, so the hit-testing and the drawing can never disagree about which
 *  decade a given pixel belongs to. */
function layout(rows: Row[], unit: number, open: number | null) {
  const y: number[] = new Array(rows.length).fill(0);
  /** Each decade's extent in the CURRENT layout, which is what the pointer is
   *  tested against. */
  const extent = new Map<number, { top: number; bottom: number }>();
  let at = 0;
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    if (r.group < 0) {
      if (r.key === "unknown") at += UNDATED_GAP;
      y[i] = at;
      at += unit;
      i += 1;
      continue;
    }
    const g = r.group;
    const top = at;
    y[i] = at;
    at += unit;
    i += 1;
    while (i < rows.length && rows[i].group === g) {
      /* Packed, one after another, no slot left for a year that is not
         there. Closed, every year parks on its own decade's row, so opening
         slides it out from under the decade it belongs to. */
      y[i] = g === open ? at : top;
      if (g === open) at += unit;
      i += 1;
    }
    extent.set(g, { top, bottom: at });
  }
  return { y, extent, height: at };
}

function RailRow({
  row,
  y,
  height,
  shown,
  isActive,
  /** The pointer's clientY while it is over the rail; far away otherwise. */
  pointerY,
  onSeek,
}: {
  row: Row;
  y: number;
  height: number;
  shown: boolean;
  isActive: boolean;
  pointerY: MotionValue<number>;
  onSeek: (key: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  /* WHERE THIS ROW IS, as a spring. A motion value rather than an `animate`
     prop because the swell below has to be able to ask, at any frame, how far
     the pointer is from this row -- and `useSpring(number)` takes its
     argument as a starting point and never re-targets in this version, which
     once left every row parked at its closed position while the rest of the
     component behaved as though the rail had opened. */
  const target = useMotionValue(y);
  useLayoutEffect(() => {
    target.set(y);
  }, [target, y]);
  const springY = useSpring(target, OPEN_SPRING);

  /* Distance from the pointer to this row's centre. The rect is read live,
     because the rail is sticky and its rows travel; `springY` is an input for
     the same reason -- a transform recomputes when an INPUT moves, and while
     a decade opens it is the ROWS that are moving and the pointer that is
     holding still. */
  const distance = useTransform([pointerY, springY], ([py]: number[]) => {
    const box = ref.current?.getBoundingClientRect();
    return box ? py - (box.top + box.height / 2) : 1e5;
  });
  const scale = useSpring(
    useTransform(distance, [-DOCK_REACH, 0, DOCK_REACH], [1, DOCK_PEAK, 1]),
    DOCK_SPRING
  );

  return (
    <m.button
      ref={ref}
      type="button"
      onClick={() => onSeek(row.key)}
      aria-current={isActive ? "true" : undefined}
      aria-label={row.label}
      aria-hidden={!shown}
      tabIndex={shown ? undefined : -1}
      /* NO `title`. It carried the count -- "2022: 4 photographs" -- and the
         browser drew it as a native tooltip: an unstyled grey box that
         appears after a pause, sits over the photographs, and cannot be
         positioned, themed or dismissed. The owner: "I dont want that dialog
         box interfering with what im seeing" (2026-09-02).
         The count is not lost. The mark's own LENGTH is the count, drawn to
         scale, which is the form this rail was built to say it in and the
         reason the owner cut the number from the controls line as well: "I
         feel like we can dispense of the number of photographs anywhere, who
         actually cares." A hover box repeating it in words was the one place
         that decision had not reached. `aria-label` still names the year, so
         a screen reader is unaffected. */
      /* Absolutely placed and moved by transform, so opening a decade is a
         handful of rows travelling and nothing at all reflowing. */
      style={{ scale, y: springY, transformOrigin: "right center", height }}
      animate={{ opacity: shown ? 1 : 0 }}
      initial={false}
      transition={FADE}
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
        style={{ width: row.mark }}
      />
      <span
        aria-hidden
        /* Fixed width, so the marks all start from the same line however many
           digits the label has -- a ragged left edge would read as noise in
           the bar chart rather than as typography. No `leading-none`: the
           shipped rail let the label take the inherited 16.5px line box, and
           that is a third of the row's height. */
        className={cn(
          "w-[34px] shrink-0 text-[11px] tabular-nums tracking-[0.04em]",
          isActive ? "font-semibold" : row.head ? "font-medium" : "font-normal"
        )}
      >
        {row.label}
      </span>
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
  const model = useRailModel(bands, columnHeight);
  const [open, setOpen] = useState<number | null>(null);
  /* Far away, not zero: 1e5 keeps every row's distance outside DOCK_REACH,
     so the rail rests flat until a pointer actually arrives. */
  const pointerY = useMotionValue(1e5);
  /** Where the pointer was when the decade last changed. See SWITCH_TRAVEL. */
  const lastSwitch = useRef(-1e5);

  const placed = layout(model.rows, model.unit, open);
  /* The box is sized for the FULLEST decade being open, always, so it never
     changes size and there is no edge for the pointer to fall off. */
  const boxed = model.grouped
    ? Math.max(
        placed.height,
        ...[...placed.extent.keys()].map((g) => layout(model.rows, model.unit, g).height)
      )
    : placed.height;

  const track = (clientY: number) => {
    pointerY.set(clientY);
    if (!model.grouped) return;
    const box = nav.current?.getBoundingClientRect();
    if (!box) return;
    const local = clientY - box.top;

    /* NOTHING OPEN: the closed list is one row per decade, so the row under
       the pointer is the decade under the pointer. */
    if (open === null) {
      for (const [g, e] of placed.extent) {
        if (local >= e.top && local < e.bottom) {
          setOpen(g);
          lastSwitch.current = clientY;
          return;
        }
      }
      return;
    }

    /* Inside the open decade's own block, nothing changes. That is where its
       years are, and travelling through them to read one must not re-choose
       the decade they belong to. */
    const e = placed.extent.get(open);
    if (!e) return;
    if (local >= e.top && local < e.bottom) return;

    /* Outside it, the rail steps ONE decade in the direction you left, and
       only once per row of travel.

       Both halves are load-bearing and both were learned the hard way.
       Opening whichever decade's extent happens to contain the pointer looks
       right and is not: packed years give blocks of different heights, so
       leaving a ten-year decade drops the pointer clean past a one-year
       decade and into whatever is under THAT -- a measured drag down the rail
       went 2020s, 2010s, 2000s, 1970s, 1940s, skipping four. Stepping one at
       a time fixes the leap; the travel brake fixes the speed. Together they
       are exactly the sensitivity the closed list already has: one row of
       movement, one decade. */
    if (Math.abs(clientY - lastSwitch.current) < SWITCH_TRAVEL) return;
    const step = local < e.top ? -1 : 1;
    const next = Math.min(Math.max(open + step, 0), model.decades - 1);
    if (next !== open) {
      setOpen(next);
      lastSwitch.current = clientY;
    }
  };

  // One year is not a shape, it is a fact, and a rail of one mark is noise.
  if (model.rows.length < 2) return null;

  return (
    <nav
      ref={nav}
      aria-label="Jump to when the photograph was taken"
      onPointerMove={(e) => track(e.clientY)}
      onPointerLeave={() => {
        pointerY.set(1e5);
        lastSwitch.current = -1e5;
        setOpen(null);
      }}
      /* Sticky, so the index stays with you down twenty thousand photographs
         the way a thumb index stays with a book -- and NOT `relative` beside
         it, which is what broke it: both are position utilities, Tailwind
         emits them in its own order rather than the class string's, and
         `relative` won. The rail scrolled away, so at 1987 the only way back
         was the top of the page (owner, 2026-09-02). `sticky` is a positioned
         element in its own right, so the absolute rows inside it need no
         help. */
      style={{ height: boxed, width: 92 }}
      className={cn("sticky top-6 hidden shrink-0 xl:block", className)}
    >
      {model.rows.map((r, i) => (
        <RailRow
          key={`${r.group}:${r.key}:${r.head ? "d" : "y"}`}
          row={r}
          y={placed.y[i]}
          height={model.rowH}
          shown={r.head || r.group === open}
          /* EXACTLY ONE ROW IS EVER CURRENT. A closed decade lights when the
             reader is anywhere inside it, so the rail always says where you
             are even with the years put away -- and the year must then NOT
             also claim it, or a row nobody can see announces itself to a
             screen reader beside the row that can. */
          isActive={
            r.head ? r.group !== open && r.covers.includes(active) : r.group === open && r.key === active
          }
          pointerY={pointerY}
          onSeek={onSeek}
        />
      ))}
    </nav>
  );
}
