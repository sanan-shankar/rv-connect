"use client";

/* ------------------------------------------------------------------ *
 *  The river itself: justified rows, and decade headings when the
 *  order is time.
 *
 *  Split out from <CollectionClient> for one reason -- so /lab/collection
 *  can show the REAL thing against a few hundred photographs rather than
 *  the two the database actually holds. A lab room that reimplements the
 *  surface it is meant to be judging is a room that lies, and the layout
 *  work in this campaign has already been through one of those
 *  (`_justified.ts`, deleted for being a second implementation).
 *
 *  So the state lives with the caller -- the page fetches, the room
 *  filters an array in memory -- and everything you can SEE lives here.
 * ------------------------------------------------------------------ */

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { PhotoStream, type PhotoCell } from "@/components/common/photo-rows";
import { bandKeyOf, bandLabel } from "@/lib/collection";
import type { PhotoData, RiverOrder } from "@/app/(main)/collection/actions";
import { cn } from "@/lib/utils";
import type { BandBox } from "@/lib/river-geometry";
import { preloadImageViewer } from "@/components/common/lazy-image-viewer";

/** Scroll the document to `want`, LENGTHENING IT FIRST if it is too short
 *  to get there. A scroll position only exists if there is document below
 *  it, and an archive of four photographs has none: the seek landed
 *  Undated at the head, the 2020s band arrived above it, and the scroll
 *  correction that should have held Undated still was clamped to zero --
 *  so the reader who pressed Undated watched 2020s slide in on top of it.
 *  `tail` is an empty element after the river whose height is grown by
 *  exactly the deficit, and by nothing when there is none: a long river
 *  never sees it, and a short one gains only the blank it needs to keep
 *  its promise. Grown, never shrunk mid-river; a new river resets it. */
export function landAt(want: number, tail: HTMLElement | null) {
  const scroller = document.scrollingElement;
  if (!scroller) return;
  /* Measured from where the content actually ENDS, which is the tail's own
     position -- not from scrollHeight, which is floored at the viewport and
     so cannot see the slack under a page shorter than the window. The
     furthest the window can scroll is (content end + tail) - viewport, and
     `want` has to fit under that. Never shrunk here: a tail already taller
     than needed keeps its height until a new river resets it. */
  if (tail) {
    const contentEnd = tail.getBoundingClientRect().top + scroller.scrollTop;
    const needed = want + scroller.clientHeight - contentEnd;
    const current = parseFloat(tail.style.height || "0");
    if (needed > current) tail.style.height = `${Math.ceil(needed)}px`;
  }
  scroller.scrollTop = want;
}

/** Every thumbnail this session has finished loading, by resolved URL. Read
 *  in <Tile>'s ref callback to decide whether an image should fade in (new
 *  to the reader) or simply appear (seen before, remounted by a re-flow).
 *  Module-level and monotonic: a few hundred short strings, never cleared,
 *  and a wrong answer only costs one fade. */
const seenThumbs = new Set<string>();

/** One frozen empty list, so a reserved band does not hand <BandSection> a
 *  fresh array every render and defeat its own memo. */
const EMPTY: PhotoData[] = [];

/** Decode the first screenful BEFORE the river swaps, so a new view arrives
 *  formed instead of assembling itself tile by tile -- the owner, on exactly
 *  that: "it's a full reloading and things populate unevenly, it's not
 *  pretty." The old river stays up (dimmed) while this runs, so the swap is
 *  one movement: dim, then the new photographs, whole.
 *
 *  Bounded by patience, not by success: a slow network gets the old
 *  behaviour after 450ms rather than a page that refuses to change. A
 *  decode that fails is a tile that pops late, which is the status quo,
 *  so failures resolve rather than reject. */
export async function warmThumbs(photos: { thumbUrl: string }[], count = 12, patience = 450) {
  if (typeof window === "undefined" || photos.length === 0) return;
  const jobs = photos.slice(0, count).map((p) => {
    const img = new window.Image();
    img.src = p.thumbUrl;
    return img.decode().catch(() => {});
  });
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, patience))]);
}

function TileInner({
  photo,
  cell,
  onOpen,
  index,
}: {
  photo: PhotoData;
  cell: PhotoCell;
  onOpen: () => void;
  /** Position within its year, for the arrival stagger below. */
  index: number;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={preloadImageViewer}
      onFocus={preloadImageViewer}
      aria-label={photo.caption ?? `Photograph by ${photo.uploader.name}`}
      // Hover is the scrim below, so no state-layer here (a tint over a
      // photograph is noise). The press only needed an answer: opacity, not a
      // transform, because the tile must not move under the cursor.
      /* NO CORNER RADIUS, and it is the archive's rule rather than an
         oversight. A wall of photographs is read as one surface, and rounding
         every tile puts a hundred little notches of paper through it; the
         reference galleries -- Google Photos among them -- all square them
         off. The owner, 2026-09-09: "I don't think they do corner rounding. I
         don't think we should either for anyone in the collection." Square
         here and nowhere else: a photograph in a POST is a card and keeps its
         radius. */
      className="group relative block w-full overflow-hidden bg-paper text-left transition-opacity duration-150 active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      /* The photograph's OWN shape, which is what makes the row justified:
         PhotoStream has already solved the width, and the height follows from
         the ratio, so every tile in a row comes out the same height with
         nothing cropped to get there. */
      style={{ aspectRatio: cell.aspectRatio }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbUrl}
        alt={photo.caption ?? ""}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        /* Materialise, never pop. The tile's box is reserved by aspect-ratio,
           so a loading image cannot shift anything -- but it used to CUT from
           paper to pixels the frame it arrived, and a screen of tiles doing
           that at different moments is the unevenness the owner called out.
           A 300ms opacity ease turns each arrival into a breath.

           ONCE. A thumbnail the browser has already shown is set visible in
           the ref callback -- before first paint, so no transition runs --
           and only a thumbnail arriving for the first time fades. Without
           that latch the fade replayed on every REMOUNT, and remounts are
           routine: a page landing above the reader re-flows the justified
           rows of the band it joins, and a tile that changes row changes
           parent, which React can only do by destroying and recreating it.
           So the photographs under the reader's eye went blank and faded
           back in every time the river grew upward -- "they turn white for
           a beat and then they come back" (owner, 2026-08-29).

           The ref callback rather than onLoad alone, for the same reason:
           a cached image can be complete before hydration attaches any
           listener, and would then sit at opacity 0 for ever. onError
           resolves the same way -- a broken file gets the alt text, not an
           invisible tile. */
        ref={(el) => {
          if (!el) return;
          /* SEEN BEFORE: straight to visible, before first paint, so no
             transition runs. That is the remount case and it must stay
             instant -- a fade replayed every time a tile is rebuilt is the
             blinking this latch was added to stop.

             NEW, BUT ALREADY DECODED: fade it anyway, on the next frame.
             This is the case the old code got wrong. `warmThumbs` decodes a
             page before it mounts, so its tiles arrive `complete`, took this
             branch, and were marked visible in the same frame they were
             created -- opacity went 0 to 1 with no transition to run, and a
             whole screenful did it at once. That is the "photos don't appear
             smoothly, they just come late and then suddenly turn on" the
             owner has reported since long before the archive was reserved
             (2026-09-10). Setting the flag a frame later leaves the tile at
             opacity 0 for one frame, which is what gives the transition
             something to animate FROM. */
          if (seenThumbs.has(el.src)) {
            el.dataset.loaded = "";
            return;
          }
          if (el.complete) {
            seenThumbs.add(el.src);
            requestAnimationFrame(() => {
              el.dataset.loaded = "";
            });
          }
        }}
        onLoad={(e) => {
          seenThumbs.add(e.currentTarget.src);
          e.currentTarget.dataset.loaded = "";
        }}
        onError={(e) => {
          e.currentTarget.dataset.loaded = "";
        }}
        /* And the magnification the owner asked for -- "some kind of subtle
           magnification while hovering over them, like a mac dock". The
           photograph swells 3% INSIDE its fixed, overflow-hidden frame, so
           the control itself never moves (the standing rule) while the
           picture leans toward the cursor. Transform and opacity only. */
        /* `scale`, NOT `transform`, and that one word is the whole bug.
           Tailwind v4 compiles `scale-[1.03]` to the standalone CSS `scale`
           property rather than to a `transform: scale(...)`. This transition
           listed `transform`, which the tile never sets -- so the hover
           magnification was not slow, or badly eased, or fighting the
           compositor: it was NOT ANIMATING AT ALL. Measured 2026-09-09,
           sampling every frame through a hover: `scale` goes `none` -> `1.03`
           between one frame and the next while the computed `transform` reads
           `none` for the entire 700ms. A one-frame jump is what "it's a bit
           too fast and it's not smooth at all" (owner, 2026-09-09) was
           describing, and tuning the duration could never have fixed it.

           Ordinary `ease-out` at 300ms rather than anything cleverer: a hover
           answers a cursor, so it wants to start immediately and settle,
           which is also what the scrim below does. The two now finish
           together instead of 250ms apart. Transform-family and opacity only.

           THE TRAP GENERALISES: any `transition-[...transform...]` in this
           codebase paired with a Tailwind v4 `scale-*`, `rotate-*` or
           `translate-*` utility is animating nothing. */
        /* A WAVE, NOT A SWITCH. Every tile fading on the same frame reads as
           the page being turned on rather than photographs arriving, and
           that is true even when the fade itself is smooth. 22ms is a frame
           and a half apart -- the smallest gap that reads as sequence rather
           than simultaneity -- and it is CAPPED at ten tiles because the
           delay is a grace note, not a queue: a year of two hundred
           photographs must not take four seconds to appear, and only the
           first screenful is ever watched arriving anyway.

           Two delays, because there are two transitions on this element and
           only one of them wants one: a hover that waited 200ms before
           moving would feel broken. The list matches `transition-property`
           below, in order. */
        style={{ transitionDelay: `${Math.min(index, 10) * 22}ms, 0ms` }}
        className="h-full w-full object-cover opacity-0 transition-[opacity,scale] duration-300 ease-out data-[loaded]:opacity-100 group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
      />
      {!photo.approved && (
        <span className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10.5px] font-semibold text-background">
          Pending review
        </span>
      )}
      {/* Who and when, and nothing else. The owner, on the caption and the
          love count that used to be here: "I don't think we need to show the
          caption and the number of likes. We could just show the person. The
          person and the year maybe, that would be good." */}
      <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
        <div className="flex w-full items-baseline gap-2 p-3 text-[12px] text-white">
          <span className="min-w-0 truncate font-medium">{photo.uploader.name}</span>
          {photo.takenShort && (
            <span className="ml-auto shrink-0 tabular-nums text-white/80">{photo.takenShort}</span>
          )}
        </div>
      </div>
    </button>
  );
}

/** The tile, memoised, and the comparator is the point rather than a
 *  micro-optimisation.
 *
 *  Nothing here was memoised, so every page that arrived re-rendered the
 *  WHOLE river -- and the river is the archive: 1,718 photographs in the
 *  class collection. Measured on 2026-09-09 at 4x CPU throttle, the worst
 *  long task caused by one page landing grew straight in line with the
 *  number of tiles already on screen:
 *
 *      48 tiles  120ms      480 tiles  303ms
 *     240 tiles  263ms      768 tiles  384ms
 *
 *  which extrapolates to about 800ms of frozen main thread per page at the
 *  full archive. That freeze is what swallows the wheel: 41% of a fast
 *  scroll was spent blocked, input went nowhere, and the page caught up in a
 *  lurch -- "it constantly readjusts and brings me back down" (owner,
 *  2026-09-09).
 *
 *  A BESPOKE COMPARATOR, because the default one cannot help here. `cell` is
 *  built fresh inside <PhotoStream> on every render and `onOpen` used to be a
 *  fresh arrow per tile, so reference equality failed on two of three props
 *  every time and a plain `memo()` would have been decoration. The fields are
 *  compared instead; `onOpen` is now stable per photograph (see `openerFor`),
 *  so it can stay a reference check. */
export const Tile = memo(
  TileInner,
  (a, b) =>
    a.photo === b.photo &&
    a.onOpen === b.onOpen &&
    a.index === b.index &&
    a.cell.aspectRatio === b.cell.aspectRatio &&
    a.cell.objectPosition === b.cell.objectPosition
);

/* ------------------------------------------------------------------ *
 *  Reading the river in time order.
 *
 *  "Chronological" is the only order where a heading means anything, and
 *  there it means a great deal: it is the foldering the owner wanted
 *  ("all the organization foldering that we do, we have to do in a really
 *  beautiful way") delivered INLINE, at the cost of no clicks at all. You
 *  scroll and the years announce themselves.
 *
 *  A CHAPTER IS A YEAR, not a decade, since 2026-08-30 -- the rail changed
 *  unit and these are the headings the rail lights, so they change with it.
 *  A decade of chapters was ten headings for eighty years of archive; a year
 *  of them is the granularity somebody actually looks for a photograph at.
 *
 *  Consecutive runs, not a group-by: the rows arrive already ordered by
 *  `takenKey`, so a run of one band is contiguous by construction, and this
 *  keeps working as each new page is appended to the end.
 * ------------------------------------------------------------------ */
type Band = { key: string; photos: PhotoData[]; id: string };

export function bandsOf(photos: PhotoData[], order: RiverOrder): Band[] {
  if (order !== "taken") return [{ key: "", photos, id: "all" }];
  const out: Band[] = [];
  /* HOW MANY TIMES THIS YEAR HAS ALREADY APPEARED, which is what makes the
     React key both unique and STILL. A year is not unique -- runs are cut
     consecutively, so the same year returns as several bands whenever the
     list is not sorted by year, which is every render between asking for
     Chronological and its page arriving. Keyed by the year alone React got
     the same key twice, stopped reconciling, and left whole sections behind.
     Keyed by the band's FIRST PHOTOGRAPH it was unique -- and moved: a page
     arriving above changes which photograph a year begins at, so the key
     changed, so React destroyed and rebuilt the entire year. Every tile in it
     went white and faded back in, which is what the reader sees as "the
     photos appear then all turn white then reappear" (owner, 2026-09-02).
     The occurrence index is the one identity that is unique in the bad state
     and unchanged in the good one: in a properly ordered river every year is
     `2021#0` for ever, however much arrives above or below it. */
  const seen = new Map<string, number>();
  for (const p of photos) {
    const key = bandKeyOf(p);
    const last = out[out.length - 1];
    if (last && last.key === key) {
      last.photos.push(p);
      continue;
    }
    const nth = seen.get(key) ?? 0;
    seen.set(key, nth + 1);
    out.push({ key, photos: [p], id: `${key}#${nth}` });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 *  Which decade the reader is IN, read off the page rather than set.
 *
 *  The rail used to light whatever era it had just filtered to; now that
 *  pressing it seeks instead, there is no such value to light -- the mark
 *  that glows has to be a fact about where the reader has scrolled to.
 *
 *  THE ANSWER IS READ FROM RECTS, AND THE OBSERVER IS ONLY THE TRIGGER.
 *  The obvious version -- "the last heading currently inside a band at the
 *  top of the viewport" -- is right going down and wrong coming back up.
 *  Two headings are usually further apart than the band is tall, so between
 *  them NO heading is inside it, and the reading holds whatever it last saw.
 *  Scrolling down that is correct (you are still in the decade you entered);
 *  scrolling up it is a lie, because the moment you cross above a heading
 *  you are in the decade ABOVE it and nothing fires to say so until the next
 *  heading arrives. So the rule is positional instead: the current decade is
 *  the last heading whose top has passed the reading line, which is true in
 *  both directions at every scroll position. The observer's root ends on
 *  that same line, so a heading crossing it always wakes this up.
 * ------------------------------------------------------------------ */

/** How far down the viewport a heading counts as "reached", as a fraction of
 *  its height. Matches the observer's bottom root margin below: the two are
 *  the same line and have to move together. */
export const READING_LINE = 0.2;

/* ------------------------------------------------------------------ *
 *  WHERE THE READER IS, IN BAND SPACE: which band, and how far through it.
 *
 *  The second half is the one that was missing. The rail and the phone's
 *  scrubber both placed their marker at the BAND -- index over count -- so it
 *  did not move at all while you read a year and then teleported when you
 *  crossed into the next. Measured on the class archive: the thumb sat on the
 *  same pixel through nineteen thousand pixels of scrolling and then jumped
 *  75px. "The scrolling bar should never jump from place to place. It does
 *  that now" (owner, 2026-09-02).
 *
 *  A progress fraction inside the band turns that into continuous travel
 *  without giving up the thing the band model buys: the marker still lines up
 *  with the tick that names where you are, which a raw scroll fraction cannot
 *  do in a lazily loaded river.
 *
 *  ONE FUNCTION, TWO CALLERS, and that is deliberate. The river reads it off
 *  the heading refs it already holds; the scrubber reads it off the same
 *  headings' `data-band` in the DOM. Two implementations of "which year am I
 *  in" is how the rail and the scrubber would come to disagree, which on this
 *  page has happened before.
 * ------------------------------------------------------------------ */
export function readBandPosition(
  keys: string[],
  at: (key: string) => HTMLElement | null | undefined
): { key: string; progress: number } {
  const line = window.innerHeight * READING_LINE;
  let i = -1;
  for (let k = 0; k < keys.length; k += 1) {
    const el = at(keys[k]);
    if (el && el.getBoundingClientRect().top <= line) i = k;
  }
  /* Above the first heading there is nothing to have passed, and the band
     being read is the first one -- not "no year", which would blank the rail
     every time the reader returned to the very top. */
  if (i < 0) return { key: keys[0] ?? "", progress: 0 };

  const here = at(keys[i])!.getBoundingClientRect().top;
  /* The band ends where the next one begins, or -- for the last band on
     screen, which is usually the last one LOADED rather than the last one in
     the archive -- at the foot of the document. */
  const nextEl = at(keys[i + 1]);
  const end = nextEl
    ? nextEl.getBoundingClientRect().top
    : document.documentElement.scrollHeight - window.scrollY;
  const span = end - here;
  return {
    key: keys[i],
    progress: span > 0 ? Math.min(1, Math.max(0, (line - here) / span)) : 0,
  };
}

function useActiveBand(bands: Band[], onChange?: (era: string) => void) {
  const headings = useRef(new Map<string, HTMLElement>());
  // One stable callback ref per era, cached rather than built fresh in every
  // render's JSX -- a fresh function each render reads to React as a
  // different ref, which unmounts and remounts the DOM node's entry on every
  // unrelated re-render instead of only when a heading actually appears.
  const refs = useRef(new Map<string, (el: HTMLElement | null) => void>());

  useEffect(() => {
    if (!onChange || bands.length < 2) return;
    const keys = bands.map((b) => b.key).filter(Boolean);

    const settle = () => {
      onChange(readBandPosition(keys, (k) => headings.current.get(k)).key);
    };

    const io = new IntersectionObserver(settle, {
      rootMargin: `0px 0px -${(1 - READING_LINE) * 100}% 0px`,
      threshold: 0,
    });
    for (const key of keys) {
      const el = headings.current.get(key);
      if (el) io.observe(el);
    }
    /* AND ON SCROLL, because the observer alone is not enough and the gap is
       not a small one. Its root is the top fifth of the window, so it only
       ever fires when a heading crosses THAT strip -- which is exactly what
       continuous scrolling does, and exactly what a jump does not. Landing
       from 28,872px to 14,002px with no heading inside the strip at either
       end changes no intersection state, delivers no callback, and leaves the
       reading stuck wherever it last happened to settle: measured, the reader
       at the 2000 heading with the rail lit on "Undated". Harmless enough
       when it was only a mark glowing in a margin, wrong out loud now that
       the phone's scrubber prints the answer on a pill.

       One reading per frame, and only while the page is actually moving. */
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        settle();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // A new page of photographs can add bands without moving the reader, so
    // the answer is recomputed when the bands change, not only when one of
    // them crosses the line.
    settle();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [bands, onChange]);

  return (key: string) => {
    let ref = refs.current.get(key);
    if (!ref) {
      ref = (el: HTMLElement | null) => {
        if (el) headings.current.set(key, el);
        else headings.current.delete(key);
      };
      refs.current.set(key, ref);
    }
    return ref;
  };
}

export function PhotoRiver({
  photos,
  order,
  onOpen,
  dimmed = false,
  onActiveBandChange,
  boxes,
  onNeedBand,
  className,
}: {
  photos: PhotoData[];
  order: RiverOrder;
  /** The index is into `photos`, so the viewer steps through the whole river
   *  the reader can see, across decade headings. */
  onOpen: (index: number) => void;
  /** True while a new query's first page is in the air. */
  dimmed?: boolean;
  /** The decade heading currently in view, for the rail to light -- read
   *  from scroll position, never from a filter (see `useActiveBand`). Fires
   *  only in "taken" order, where headings exist at all. */
  onActiveBandChange?: (era: string) => void;
  /** THE WHOLE ARCHIVE'S GEOMETRY, when the caller has it: every year with
   *  the exact height its photographs occupy, computed from the shape index.
   *  Given these the river draws every year whether or not it has been
   *  fetched, so the document is its full height from the first frame and no
   *  page ever changes it. Absent -- /lab/collection, which filters an array
   *  in memory -- the river falls back to drawing only what it holds. */
  boxes?: BandBox[];
  /** A reserved year has come within reach and its photographs are wanted. */
  onNeedBand?: (key: string) => void;
  className?: string;
}) {
  const bands = useMemo(() => bandsOf(photos, order), [photos, order]);
  /* WHICH YEARS THE RAIL CAN LIGHT. With geometry every year is on the page,
     including the ones whose photographs have not been fetched -- so the
     reading has to consider all of them, not just the ones that happen to be
     loaded. Otherwise scrolling to a year that is still reserved lights its
     nearest loaded neighbour instead: measured, landing on 2019 lit 2020. */
  const readable = useMemo(
    () => (boxes && boxes.length > 0
      ? boxes.map((b) => ({ key: b.key, id: b.key, photos: EMPTY }))
      : bands),
    [boxes, bands]
  );
  const headingRef = useActiveBand(readable, onActiveBandChange);

  /* ONE STABLE OPEN HANDLER PER PHOTOGRAPH, and without it neither memo below
     is worth anything: `onOpen={() => onOpen(photos.indexOf(p))}` built a new
     arrow for every tile on every render, which is a changed prop on every
     tile on every render.

     The index has to be resolved when the tile is PRESSED rather than when it
     is drawn, because it is an index into a river that grows at both ends --
     a closure that captured it at render time would point at the wrong
     photograph the moment a page landed above. `latest` is what keeps that
     honest while the callback itself stays the same object for the life of
     the tile. Same cache-a-callback-per-key shape as `useActiveBand` uses for
     the heading refs, for the same reason. */
  /* The loaded photographs, filed by year, so a box can ask "do I have this
     one" in constant time. Only built when the caller brought geometry;
     otherwise the river draws its flat list exactly as it always did. */
  const byBand = useMemo(() => {
    const m = new Map<string, Band>();
    if (!boxes || boxes.length === 0) return m;
    for (const p of photos) {
      const key = bandKeyOf(p);
      const at = m.get(key);
      if (at) at.photos.push(p);
      else m.set(key, { key, id: key, photos: [p] });
    }
    return m;
  }, [photos, boxes]);

  const latest = useRef({ photos, onOpen });
  /* In an effect rather than in the render body: writing a ref while
     rendering is the lint rule `react-hooks/refs` and it is right to complain.
     After the commit is early enough for everything that reads this, since the
     only reader is a click handler. */
  useEffect(() => {
    latest.current = { photos, onOpen };
  }, [photos, onOpen]);
  const openers = useRef(new Map<string, () => void>());
  const openerFor = useCallback((id: string) => {
    let fn = openers.current.get(id);
    if (!fn) {
      fn = () => {
        const i = latest.current.photos.findIndex((p) => p.id === id);
        if (i >= 0) latest.current.onOpen(i);
      };
      openers.current.set(id, fn);
    }
    return fn;
  }, []);

  /* ASK FOR WHAT THE READER IS LOOKING AT, not for what comes next.
     One observer over every reserved year. The cursor walk this replaces
     could only ever fetch the page adjacent to what it already held, so a
     reader who flicked through three decades got those decades in order from
     wherever the river happened to end -- the year under their eye last. A
     reserved box knows which year it IS, so reaching one asks for that year.

     A screen and a half of warning, which is the same runway the foot
     sentinel always used; the difference is that missing the runway now costs
     a year that fills in late rather than a scroll correction. */
  useEffect(() => {
    if (!onNeedBand || !boxes || boxes.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const key = (e.target as HTMLElement).dataset.reserved;
          if (key) onNeedBand(key);
        }
      },
      { rootMargin: "1200px 0px" }
    );
    for (const el of document.querySelectorAll("[data-reserved]")) io.observe(el);
    return () => io.disconnect();
  }, [boxes, byBand, onNeedBand]);

  return (
    /* The cross-fade. Changing a bucket dims the river the moment the query
       changes and brings the new one up when it lands, so the change reads as
       one movement instead of a flash of skeletons. Opacity only.

       `overflow-anchor: none`, because the river anchors its own scroll: a
       page landing above the reader is compensated by hand in a layout
       effect (`loadNewer`), and the browser's built-in anchoring, left on,
       applies its own correction to the same insertion against whatever
       node it happened to pick. Two hands on one wheel is exactly the
       "sometimes" class of jump. */
    <div
      className={cn(
        "transition-opacity duration-200 ease-out [overflow-anchor:none]",
        dimmed && "pointer-events-none opacity-40",
        className
      )}
    >
      {(boxes ?? []).length > 0
        ? boxes!.map((box, bi) => {
            /* COMPLETE, or reserved. A year drawn from SOME of its
               photographs is shorter than the box computed for all of them,
               so admitting a half-filled year is the document changing height
               under the reader by the back door -- and pages are cut by size,
               not by year, so the first page almost always ends mid-year.
               Measured: pressing 2017 landed 5,513px short because the year
               above it was drawn from a partial page and then grew when the
               rest arrived. A year is therefore either all here or none of
               it, which is also what makes `loadBand` fetch whole years. */
            const got = byBand.get(box.key);
            const complete = got != null && got.photos.length === box.count;
            return (
              <BandSection
                key={box.key}
                band={complete ? got : { key: box.key, id: box.key, photos: EMPTY }}
                first={bi === 0}
                headingRef={headingRef(box.key)}
                openerFor={openerFor}
                reserved={complete ? undefined : box.gridHeight}
              />
            );
          })
        : bands.map((band, bi) => (
            <BandSection
              key={band.id}
              band={band}
              first={bi === 0}
              headingRef={headingRef(band.key)}
              openerFor={openerFor}
            />
          ))}
    </div>
  );
}

/** One year, memoised, and this is where the 800ms actually goes.
 *
 *  Memoising the tile stops each PHOTOGRAPH re-rendering; this stops each
 *  YEAR being walked at all. A page arriving at the foot changes exactly one
 *  band -- the last -- and a page arriving at the head changes exactly one,
 *  the first. Every other year in the river is identical and now says so in
 *  one comparison instead of several hundred.
 *
 *  The comparator cannot use reference equality on `band.photos`: `bandsOf`
 *  rebuilds every array from scratch whenever `photos` changes, so the arrays
 *  are always new even when their contents are not. Identity, length and the
 *  two endpoints are enough here and are not a guess about React -- they are a
 *  fact about this river. Photographs only ever arrive at one END or the
 *  other (`appendUnseen`, `prependUnseen`), and the list is sorted, so a band
 *  whose id, count and first and last photographs are unchanged has not
 *  changed. An edit that ever inserts into the MIDDLE of a band breaks that
 *  reasoning and must revisit this. */
const BandSection = memo(
  function BandSection({
    band,
    first,
    headingRef,
    openerFor,
    reserved,
  }: {
    band: Band;
    first: boolean;
    headingRef: (el: HTMLElement | null) => void;
    openerFor: (id: string) => () => void;
    /** When set, this year's photographs have not been fetched and the box
     *  stands in for them at exactly the height they will occupy. */
    reserved?: number;
  }) {
    return (
        /* NO `content-visibility` WINDOWING, any more, and it was removed for
           cause rather than tidied away. A skipped band stands in at a
           600px guess until it is scrolled near; the real bands run to
           thousands of pixels, and the moment one was reached, the page
           re-learned its own height by that difference. Browser scroll
           anchoring papers over most of that -- except with justified rows
           it misfired often enough that scrolling "just glitched and took
           me elsewhere" (owner, 2026-08-29), which is strictly worse than
           the layout cost of a few hundred tiles. If the archive ever
           reaches the size where windowing earns its place again, the
           estimate must be COMPUTED from the rows' known aspect ratios,
           never guessed. */
        /* `band.id` -- the year and how many times it has occurred. See
           `bandsOf` for why it is neither the year (not unique: React left
           whole sections behind) nor the band's first photograph (not still:
           a page arriving above rebuilt the year and every tile in it went
           white). */
        <section>
          {band.key && (
            /* The foldering, inline and free -- and it is a chapter opening
               now rather than a bar.
               It used to be sticky, which meant it needed a background to
               travel over, which meant a translucent band and a hairline
               rule ran across the river at every decade. The owner: "the
               headings also have the weird bars behind them." They were the
               price of the stickiness, and the stickiness was buying very
               little: the year rail on the right already says where you
               are, permanently, without covering anything.

               A SINGLE band gets its heading too. It used to be suppressed
               when the whole page was one band, on the logic that one
               chapter needs no chapter openings -- and the owner read that
               as a bug, correctly: "when i'm on All and chronological why's
               there sometimes no 2020s heading." In an order whose whole
               point is time, the year you are reading is never noise.

               No count under it. "I feel like we can dispense of the number
               of photographs anywhere, who actually cares" -- the rail's
               marks already say how much each year holds, as proportion,
               which is the only form anybody reads. */
            <h2 ref={headingRef} data-band={band.key} className={cn("mb-4", !first && "mt-12")}>
              <span className="block font-heading text-[22px] leading-none tracking-[-0.02em] text-foreground">
                {bandLabel(band.key)}
              </span>
            </h2>
          )}
          {/* 4px, matching the reference galleries rather than the 12px a card
              wants. "I need to copy even the tiny thing, like the margins
              between the photos" (owner, 2026-09-09). Passed here rather
              than changed in <PhotoStream>, whose default still belongs to
              the Catch-up photo wall. */}
          {reserved != null ? (
            /* THE YEAR, AT ITS TRUE HEIGHT, WITHOUT ITS PHOTOGRAPHS.
               Not a placeholder and not a guess: `river-geometry.ts` solves
               the same justified rows the browser will, from aspect ratios
               that rode back with the first page, and agrees with what is
               actually drawn to within half a pixel across both viewports.
               So when this year's photographs arrive they replace exactly
               their own height and NOTHING on the page moves -- which is the
               whole point, because every glitch the owner has reported for
               three sessions happened at the moment a scroll correction ran.
               There is no correction any more; there is nothing to correct. */
            <div style={{ height: reserved }} className="mb-3" data-reserved={band.key} />
          ) : (
            <PhotoStream photos={band.photos} keyOf={(p) => p.id} gap={4} className="mb-3">
              {(p, i, cell) => <Tile photo={p} cell={cell} index={i} onOpen={openerFor(p.id)} />}
            </PhotoStream>
          )}
        </section>
    );
  },
  (a, b) =>
    a.band.id === b.band.id &&
    a.first === b.first &&
    a.reserved === b.reserved &&
    a.headingRef === b.headingRef &&
    a.openerFor === b.openerFor &&
    a.band.photos.length === b.band.photos.length &&
    a.band.photos[0] === b.band.photos[0] &&
    a.band.photos[a.band.photos.length - 1] === b.band.photos[b.band.photos.length - 1]
);
