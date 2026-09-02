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

import { useEffect, useMemo, useRef } from "react";
import { PhotoStream, type PhotoCell } from "@/components/common/photo-rows";
import { bandKeyOf, bandLabel } from "@/lib/collection";
import type { PhotoData, RiverOrder } from "@/app/(main)/collection/actions";
import { cn } from "@/lib/utils";

/** Warm the viewer chunk before the press needs it. The owner, clicking a
 *  photograph during the brief: "Oh, wow. This doesn't even load. What? I
 *  clicked on picture. Okay. Loaded." */
export const preloadViewer = () => void import("@/components/common/image-viewer");

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

export async function warmThumbs(photos: { thumbUrl: string }[], count = 12, patience = 450) {
  if (typeof window === "undefined" || photos.length === 0) return;
  const jobs = photos.slice(0, count).map((p) => {
    const img = new window.Image();
    img.src = p.thumbUrl;
    return img.decode().catch(() => {});
  });
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, patience))]);
}

export function Tile({
  photo,
  cell,
  onOpen,
}: {
  photo: PhotoData;
  cell: PhotoCell;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={preloadViewer}
      onFocus={preloadViewer}
      aria-label={photo.caption ?? `Photograph by ${photo.uploader.name}`}
      // Hover is the scrim below, so no state-layer here (a tint over a
      // photograph is noise). The press only needed an answer: opacity, not a
      // transform, because the tile must not move under the cursor.
      className="group relative block w-full overflow-hidden rounded-[var(--radius-md)] bg-paper text-left transition-opacity duration-150 active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
          if (el.complete || seenThumbs.has(el.src)) {
            seenThumbs.add(el.src);
            el.dataset.loaded = "";
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
        className="h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-300 ease-out data-[loaded]:opacity-100 group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
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
      <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
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
type Band = { key: string; photos: PhotoData[] };

export function bandsOf(photos: PhotoData[], order: RiverOrder): Band[] {
  if (order !== "taken") return [{ key: "", photos }];
  const out: Band[] = [];
  for (const p of photos) {
    const key = bandKeyOf(p);
    const last = out[out.length - 1];
    if (last && last.key === key) last.photos.push(p);
    else out.push({ key, photos: [p] });
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
const READING_LINE = 0.2;

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
      const line = window.innerHeight * READING_LINE;
      let current = "";
      for (const key of keys) {
        const el = headings.current.get(key);
        if (el && el.getBoundingClientRect().top <= line) current = key;
      }
      /* Above the first heading there is nothing to have passed, and the
         band being read is the first one -- not "no year", which would
         blank the rail every time the reader returned to the very top. */
      onChange(current || keys[0]);
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
  className?: string;
}) {
  const bands = useMemo(() => bandsOf(photos, order), [photos, order]);
  const headingRef = useActiveBand(bands, onActiveBandChange);

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
      {bands.map((band, bi) => (
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
        /* KEYED BY THE PHOTOGRAPH THE BAND STARTS AT, not by the year.
           A year is not unique. `bandsOf` cuts consecutive runs, so the same
           year appears as several bands the moment the list is not sorted by
           year -- which is every render between asking for Chronological and
           the Chronological page arriving, because `order` flips at the press
           and `photos` does not. React then gets `key="2021"` four times over,
           cannot reconcile the list, and LEAVES NODES BEHIND: sections that
           belong to a query nobody is looking at, still on the page, showing
           photographs twice, under headings the current order does not even
           draw. Only a reload cleared them.
           "Photos just disappear ... everything takes a reload to fix"
           (owner, 2026-09-02) is this, and so is the 2021-twice screenshot.
           A run is identified by the row it begins at, which is unique by
           construction; `band.key` is kept as the fallback for the single
           unheaded band, whose photos array is never empty either. */
        <section key={band.photos[0]?.id ?? band.key ?? "all"}>
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
            <h2 ref={headingRef(band.key)} data-band={band.key} className={cn("mb-4", bi > 0 && "mt-12")}>
              <span className="block font-heading text-[22px] leading-none tracking-[-0.02em] text-foreground">
                {bandLabel(band.key)}
              </span>
            </h2>
          )}
          <PhotoStream photos={band.photos} keyOf={(p) => p.id} className="mb-3">
            {(p, i, cell) => (
              <Tile photo={p} cell={cell} onOpen={() => onOpen(photos.indexOf(p))} />
            )}
          </PhotoStream>
        </section>
      ))}
    </div>
  );
}
