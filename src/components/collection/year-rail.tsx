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
 *  YEARS. Nothing else moves, nothing fades to a half tone, and every
 *  label on screen is either fully there or not there at all.
 *
 *  THAT LAST SENTENCE IS THE WHOLE DESIGN, and it is written down
 *  because two versions failed by not honouring it. Both tried to fit
 *  every year of the archive down one column at once -- sixty rows at
 *  eleven pixels -- which no eleven-pixel label fits beside, so both
 *  grew a system for fading labels in and out by proximity to the
 *  pointer. That system worked exactly as designed and was terrible:
 *  "there's so many instances where it's these different shades of grey
 *  ... two numbers showing and they're both kind of half showing ...
 *  I have [the pointer] over 2026 then ... 2026 is kind of grey[ed] out
 *  almost like invisible ... it's just coming off as still so janky"
 *  (owner, 2026-08-31). A continuous opacity field means partial greys
 *  are not an edge case, they are the resting state, and an anchor
 *  stepping aside to dodge a collision is a label deleting itself for a
 *  reason no reader can see.
 *
 *  So there is no opacity field. A decade holds at most ten years, ten
 *  years is a short list, and a short list fits at the row height this
 *  rail has always used with room for every label. The nesting does the
 *  work the fading was trying to do.
 *
 *  HOW IT HOLDS STILL. Only one decade is ever open and every open
 *  decade is the same eleven rows, so the rail's total height never
 *  changes and neither does its hit box. A decade grows DOWNWARD from
 *  its own row, which does not move.
 *
 *  AND THE YEARS ARE ALWAYS BELOW YOUR HAND, never above it. That is a
 *  rule, and it costs something, and the owner chose to pay: "sometimes
 *  the menu opens above sometimes below" (2026-08-31). The cause is
 *  arithmetic rather than a slip. Crossing out of the foot of an open
 *  decade used to open the next one straight away -- but opening it
 *  collapses the one you left, which lifts the whole list by the height
 *  of a block, so the new years landed ABOVE the pointer. Measured on
 *  the version that shipped: arriving fresh on the 1970s put its years
 *  7px below the pointer and 178px below it; walking down into the
 *  1960s put them 161px ABOVE.
 *
 *  So the decade that opens is always the one whose OWN ROW is at the
 *  pointer's height in the closed list -- which means, after it opens,
 *  its row is still exactly there and its years run down from it. Every
 *  time, from every direction.
 *
 *  What that costs: while a decade is open you can only switch upward,
 *  to a newer one, in a single move. Its own years occupy the space
 *  below it, and travelling through them must not re-choose the decade
 *  or you could not read them. Going OLDER means moving down past the
 *  years, which closes the rail, and then back up into the list. Two
 *  moves. The trade is a menu that never jumps for a decade that
 *  sometimes takes two gestures to reach.
 *
 *  A SMALL ARCHIVE IS NOT GROUPED. If every year the archive holds fits
 *  down the column at full row height, they are simply all listed, all
 *  named, always -- there is nothing a decade could usefully hide. The
 *  live Collection is four bands and looks exactly like the rail that
 *  shipped before any of this.
 *
 *  IT SEEKS. IT DOES NOT FILTER. Pressing a year used to narrow the grid
 *  to it, which meant landing there had no way back except a reload --
 *  "I now have no way to go back? ... doing that has locked me into
 *  2020s" (owner, 2026-08-29). The rail travels one continuous river to
 *  that stretch of it; photographs above and below still exist and
 *  scrolling either way keeps going. `active` therefore is not a filter
 *  you set, it is read off what is actually on screen (`useActiveBand`
 *  in `photo-river.tsx`) -- the rail reports where you are rather than
 *  deciding it.
 *
 *  Below 1280px this margin does not exist; the phone scrubber down the
 *  right edge of the grid is its own component, not a second shape of
 *  this one -- a narrow scrolling line of decade words shipped here once
 *  and was rejected on sight ("remove the decades and undated thing
 *  from mobile, it looks really bad").
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { m, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { bandLabel } from "@/lib/collection";
import { cn } from "@/lib/utils";

export type BandCount = { key: string; count: number };

/** One row, everywhere, at every level. The rail has used it since it was a
 *  list of decades and there is no longer any state in which it changes:
 *  every label is a full-size label, which is what makes the thing legible. */
const ROW = 17;

/* ------------------------------------------------------------------ *
 *  A DECADE IS TEN ROWS TALL WHEN IT IS OPEN, always, however many years
 *  it actually holds, and each year sits at its own place inside those ten
 *  rather than being packed against the top.
 *
 *  Two things fall out of that and both are the point.
 *
 *  The gaps become honest. A decade with photographs from 1979, 1976 and
 *  1974 draws three marks with the empty years between them left empty --
 *  which is a true statement about the archive, and the same statement the
 *  rail makes at every other level.
 *
 *  And the rail stops being able to cascade. Every open decade being the
 *  SAME height is what makes crossing out of one land you inside the next
 *  instead of two past it: with heights that varied, one twenty-pixel move
 *  out of a nine-year decade fell straight through a one-year decade and
 *  two more below it, and the rail walked three decades on a gesture that
 *  meant one. Packing the years and padding the remainder at the foot gives
 *  the same guarantee but leaves a visible hole under a sparse decade;
 *  spreading them over their real positions costs nothing and reads as a
 *  scale.
 * ------------------------------------------------------------------ */
const DECADE_SLOTS = 10;

/** The gap that lifts "Undated" off the years. It is not a year and does not
 *  belong in their run; a plain row would read as the year before the oldest. */
const UNDATED_GAP = 10;

/** What the rail leaves below itself, so its foot is not welded to the
 *  bottom of the window. */
const RAIL_FOOT = 24;

/* ------------------------------------------------------------------ *
 *  The dock. "Maybe some kind of subtle magnification while hovering
 *  over them, like a mac dock" (owner, 2026-08-29), and asked for again
 *  every time this rail has been rebuilt. The rows swell toward the
 *  pointer and settle as it leaves, on a spring, with the neighbours
 *  carrying a share of it.
 *
 *  Transform only, anchored to the right edge, so the right-aligned
 *  labels stay a clean column while the rows grow leftward into the
 *  margin -- and the swell never moves a row, only its paint.
 * ------------------------------------------------------------------ */
const DOCK_REACH = 64; // px of falloff either side of the pointer
const DOCK_PEAK = 1.16;
const DOCK_SPRING = { stiffness: 400, damping: 28 };

/** The opening and the closing. Deliberately about a quarter slower than the
 *  first version of it -- "I'd slow the expansion and compression animations
 *  by maybe 20-30%" (owner, 2026-08-31) -- and just short of critically
 *  damped, so it arrives without a bounce. */
const OPEN_SPRING = { stiffness: 150, damping: 23, mass: 0.9 };

/* ------------------------------------------------------------------ *
 *  How much height there actually is, which is NOT the window.
 *
 *  The rail is sticky at `top-6`, so once you have scrolled it has the
 *  window minus 24px to work with. Before you have scrolled it starts
 *  wherever the river starts -- about 164px down, under the page title and
 *  the bucket row -- and that is the state it is FIRST opened in. This
 *  measures its own top in the document and sizes for THERE, the tightest
 *  position it is ever in.
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
  /** The band this row seeks to. A decade header seeks to the newest year it
   *  holds, which is a real band; there is nothing filed under "the 1950s"
   *  as a position in the river. */
  key: string;
  label: string;
  count: number;
  /** Length in px, scaled to the archive's shape. */
  mark: number;
  /** Which decade this belongs to, as an index into `groups`. Undated is not
   *  a decade and answers -1. */
  group: number;
  /** True for the decade's own row; false for a year inside it. */
  header: boolean;
  /** A year's place inside its decade's ten slots. The newest year a decade
   *  holds takes the first slot and the oldest takes the last, with whatever
   *  lies between spread across the rest in proportion. */
  slot: number;
  /** Every band key this row stands for, so a collapsed decade can light up
   *  when the reader is anywhere inside it. */
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

    const fits = Math.floor(columnHeight / ROW);
    /* GROUPED ONLY WHEN IT HAS TO BE. If every year fits down the column at
       full height there is nothing a decade could usefully hide, so they are
       all simply listed -- which is the live Collection, and the rail that
       shipped before any of this. */
    const grouped = years.length + (undated ? 1 : 0) > fits;

    /* TWO SCALES, ONE PER LEVEL, because the two are never read against each
       other: closed, you are comparing decades; open, you are comparing the
       years of one decade. Sharing a scale would squash every year of a thin
       decade into the same stub and throw away the shape the rail exists to
       draw. Undated takes the coarse one -- it is a pile, not a year, and a
       third of the archive being undated must not set the year scale. */
    const biggestYear = years.reduce((m, y) => Math.max(m, held.get(String(y)) ?? 0), 0) || 1;
    const biggestDecade = [...byDecade.values()].reduce(
      (m, ys) => Math.max(m, ys.reduce((t, y) => t + (held.get(String(y)) ?? 0), 0)),
      0
    );
    const bar = (n: number, of: number) => Math.max(5, Math.min(40, Math.round((n / (of || 1)) * 40)));
    const yearMark = (n: number) => bar(n, biggestYear);
    const coarseMark = (n: number) => bar(n, grouped ? biggestDecade : biggestYear);

    const rows: Row[] = [];
    if (!grouped) {
      for (const y of years) {
        const key = String(y);
        rows.push({
          key,
          label: key,
          count: held.get(key) ?? 0,
          mark: yearMark(held.get(key) ?? 0),
          group: -1,
          header: true,
          slot: 0,
          covers: [key],
        });
      }
    } else {
      decades.forEach((d, g) => {
        const ys = byDecade.get(d)!;
        const total = ys.reduce((t, y) => t + (held.get(String(y)) ?? 0), 0);
        /* How many years this decade actually reaches across, which is what
           the ten slots are stretched over. Zero when it holds a single year,
           which then simply sits on the decade's own line. */
        const span = ys[0] - ys[ys.length - 1];
        rows.push({
          key: String(ys[0]),
          label: `${d}s`,
          count: total,
          mark: coarseMark(total),
          group: g,
          header: true,
          slot: 0,
          covers: ys.map(String),
        });
        for (const y of ys) {
          const key = String(y);
          rows.push({
            key,
            label: key,
            count: held.get(key) ?? 0,
            mark: yearMark(held.get(key) ?? 0),
            group: g,
            header: false,
            /* STRETCHED TO FILL THE TEN SLOTS, newest at the top and oldest
               flush against the decade below.

               Counting from the decade's own first year instead leaves a hole
               under any decade whose years do not happen to span the full ten
               -- and a hole whose size changes from decade to decade, which
               is the whole of "sometimes there's a gap to the next decade
               sometimes there isn't" (owner, 2026-08-31). The block is now
               the same eleven rows whoever opens it AND ends where the next
               decade begins, every time.

               The proportions inside survive the stretch: a decade with a
               run of consecutive years still draws them evenly, and one with
               a five-year hole in the middle still shows it. */
            slot: span ? ((ys[0] - y) * (DECADE_SLOTS - 1)) / span : 0,
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
        mark: coarseMark(held.get("unknown") ?? 0),
        group: -1,
        slot: 0,
        header: true,
        covers: ["unknown"],
      });
    }

    return { rows, grouped, decadeCount: decades.length, undated };
  }, [bands, columnHeight]);
}

/** Where every row sits, given which decade is open. Pure arithmetic on the
 *  model, so the hit-testing and the drawing can never disagree about which
 *  decade a given pixel belongs to. */
function layout(rows: Row[], open: number | null) {
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
      at += ROW;
      i += 1;
      continue;
    }
    const g = r.group;
    const top = at;
    y[i] = at; // the decade's own row
    at += ROW;
    i += 1;
    while (i < rows.length && rows[i].group === g) {
      /* Open, a year sits at its own place in the decade's ten slots. Closed,
         it is parked on its own decade's row, hidden -- so opening slides it
         out from under the decade it belongs to rather than materialising it
         somewhere unrelated. */
      y[i] = g === open ? top + ROW + rows[i].slot * ROW : top;
      i += 1;
    }
    const bottom = top + (g === open ? (1 + DECADE_SLOTS) * ROW : ROW);
    at = bottom;
    extent.set(g, { top, bottom });
  }
  return { y, extent, height: at };
}

function RailRow({
  row,
  y,
  shown,
  isActive,
  pointerY,
  onSeek,
}: {
  row: Row;
  y: number;
  shown: boolean;
  isActive: boolean;
  /** The pointer's clientY while it is over the rail; far away otherwise. */
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
      title={`${row.label}: ${row.count.toLocaleString()} ${row.count === 1 ? "photograph" : "photographs"}`}
      /* Absolutely placed and moved by transform, so opening a decade is a
         handful of rows travelling and nothing at all reflowing. */
      style={{ scale, y: springY, transformOrigin: "right center", height: ROW }}
      animate={{ opacity: shown ? 1 : 0 }}
      initial={false}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
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
           the bar chart rather than as typography. A year inside a decade is
           indented by the label column alone, not by a smaller size: it is
           the same kind of thing as its parent and reads as one. */
        className={cn(
          "w-[38px] shrink-0 text-[11px] leading-none tabular-nums tracking-[0.04em]",
          isActive ? "font-semibold" : row.header ? "font-medium" : "font-normal"
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

  const placed = layout(model.rows, open);
  /* The box is sized for one decade being open, ALWAYS, so it never changes
     size and there is no edge for the pointer to fall off. Which decade is
     open makes no difference to the total -- that is the whole point of
     DECADE_SLOTS -- so asking about the first one answers for all of them. */
  const boxed = layout(model.rows, model.grouped ? 0 : null).height;

  const track = (clientY: number) => {
    pointerY.set(clientY);
    if (!model.grouped) return;
    const box = nav.current?.getBoundingClientRect();
    if (!box) return;
    const local = clientY - box.top;

    /* Inside the open decade's own block, nothing changes. That is where its
       years are, and travelling through them to read one must not re-choose
       the decade they belong to. */
    if (open !== null) {
      const e = placed.extent.get(open);
      if (e && local >= e.top && local < e.bottom) return;
    }

    /* Otherwise the decade is whichever one's OWN ROW is at this height in
       the CLOSED list. That is the whole of "the years are always below your
       hand": the decade this picks is, once it opens, sitting exactly where
       the pointer is, so its years can only run downward from there. It also
       cannot bounce -- the row it chooses is by construction inside the block
       that opening it creates, so the very next reading of the pointer takes
       the branch above and stops. Below the list there is no decade to pick,
       and the rail closes. */
    const at = Math.floor(local / ROW);
    const next =
      local >= 0 && local < model.decadeCount * ROW
        ? Math.min(at, model.decadeCount - 1)
        : null;
    if (next !== open) setOpen(next);
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
        setOpen(null);
      }}
      /* Sticky, so the index stays with you down twenty thousand photographs
         the way a thumb index stays with a book. `top-6` clears the sticky
         page chrome above it. */
      style={{ height: boxed }}
      className={cn(
        "sticky top-6 hidden w-[92px] shrink-0 xl:block",
        // Relative, because every row inside is placed by transform.
        "relative",
        className
      )}
    >
      {model.rows.map((r, i) => (
        <RailRow
          key={`${r.group}:${r.key}:${r.header ? "d" : "y"}`}
          row={r}
          y={placed.y[i]}
          shown={r.header || r.group === open}
          /* EXACTLY ONE ROW IS EVER CURRENT. A collapsed decade lights when
             the reader is anywhere inside it, so the rail always says where
             you are even when the year itself is folded away -- and the year
             inside it must then NOT also claim to be, or a row nobody can see
             is announcing itself to a screen reader beside the row that can.
             Found by the spec, which could no longer find "the lit mark". */
          isActive={
            r.header
              ? r.group !== open && r.covers.includes(active)
              : r.group === open && r.key === active
          }
          pointerY={pointerY}
          onSeek={onSeek}
        />
      ))}
    </nav>
  );
}
