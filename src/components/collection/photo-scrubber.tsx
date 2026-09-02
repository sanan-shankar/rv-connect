"use client";

/* ------------------------------------------------------------------ *
 *  The phone's scrubber: the rail's job, done by a thumb.
 *
 *  The wide-screen rail lives in a 92px margin that does not exist below
 *  1280px, and squeezing it into one was tried once and rejected on
 *  sight -- "remove the decades and undated thing from mobile, it looks
 *  really bad" (owner). So the phone gets a different shape for a
 *  different hand: "something like the google photos scroller", and then
 *  "maybe the background fades out while you're doing it and we kinda
 *  make it a spectacle of a scroller that people can get such a thrill
 *  out of using" (owner, 2026-09-02).
 *
 *  THREE STATES, AND THE FIRST ONE IS NOTHING.
 *
 *    AT REST there is no scrubber. No track, no rule, no furniture down
 *    the edge of the photographs. This is the state the Collection is in
 *    almost all of the time and it is the reason the other two are
 *    allowed to be as loud as they are.
 *
 *    SCROLLING raises a single hairline thumb against the right edge --
 *    an iOS scroll indicator, near enough, three pixels wide and no
 *    lettering at all. It says where you are and that there is something
 *    here to hold. It leaves a second and a half after the river stops.
 *
 *    HELD is the spectacle. The photographs fade back to paper, every
 *    band the archive holds comes up the edge as a scale, and the year
 *    under your thumb reads out beside it in the heading face at forty
 *    pixels. Slide and the years count through; let go and the paper
 *    lifts on the year you chose.
 *
 *  NO COLOURED CHIP. A Canopy pill was the first attempt and it was
 *  wrong twice over -- "that green mobile scroller looks a bit cringe.
 *  Maybe not a full colour background way of doing it." Canopy is this
 *  project's CTA colour and a position readout is not a CTA; and a solid
 *  lozenge riding over the photographs is a widget sitting on the work,
 *  where the whole idea is for the work to step back and let the index
 *  through. Nothing here has a fill. The scrim is the page's own paper
 *  colour and everything drawn on it is ink.
 *
 *  IT SCRUBS THE BANDS, NOT THE PAGE, and that is not a shortcut. The
 *  river is cursor-paginated -- what is loaded is a window onto the
 *  archive, not the archive -- so a scrollbar's arithmetic, position
 *  over document height, would map a thumb's travel onto whatever
 *  happened to have loaded and call 1978 by a different name every time
 *  another page arrived. The drag maps onto `orderBandKeys` instead,
 *  which is the same sequence the rail indexes and the same one the
 *  server counted.
 *
 *  IN EVERY ORDER, exactly as the rail is, and for the same reason: the
 *  archive's shape is worth reaching at rest, and pressing it is what
 *  commits to reading in time. Gating it to Chronological was a mistake
 *  and a bad one -- the Collection OPENS in Newest, so on a phone there
 *  was simply nothing there: "how do you access the side rail on mobile,
 *  can't find it" (owner, 2026-09-02).
 *
 *  What does change with the order is what the thumb is reporting when
 *  nobody is holding it. Running in time it sits at the band you are in
 *  and can be trusted to name it. In Newest or Most loved there is no
 *  such answer -- the river is sorted by upload date or by love, and a
 *  year would be a number with nothing behind it -- so it rides the
 *  scroll instead, an indicator and no more. Held, it is the same index
 *  either way, and letting go turns the river to Chronological and
 *  travels there, which is precisely what pressing the rail does.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { bandLabel, orderBandKeys } from "@/lib/collection";
import { cn } from "@/lib/utils";

export type BandCount = { key: string; count: number };

/** How long the thumb stays after the river stops moving. Long enough to read
 *  where you landed, short enough that it is gone before it is furniture. */
const LINGER = 1400;

/** The track's inset from the top and foot of the window. The top clears the
 *  phone's own header; the foot leaves the thumb somewhere to end. */
const TRACK_TOP = 96;
const TRACK_FOOT = 40;

/** The thumb's own height, and the width of the invisible target around it --
 *  Apple's 44px, which is the whole reason the hairline can be three pixels. */
const THUMB = 28;
const TARGET = 44;

/* ------------------------------------------------------------------ *
 *  WHAT YOU HOLD AND WHAT YOU READ ARE NOT IN THE SAME PLACE.
 *
 *  The hairline stays on the right edge, because that is where a thumb
 *  goes. Everything you are meant to LOOK at moves inboard of it, because
 *  that is where a thumb is not: "my thumb covers the ticks so I can't see
 *  them ... the year is a bit hidden by my finger sometimes" (owner,
 *  2026-09-02).
 *
 *  A thumb and the hand behind it occlude roughly the outer 45mm of the
 *  screen, which on a 390pt phone is about the outer 50pt. So the scale
 *  starts just past that and the year clears it entirely, and the two keep
 *  their own relationship: the year's right edge sits a little inside the
 *  longest tick, so it reads as a label on a ruler rather than as two
 *  things that happen to share a row.
 * ------------------------------------------------------------------ */
const TICKS_INSET = 54;
const YEAR_INSET = 92;

/** How far in the whole apparatus reaches, which is only a hit box and a
 *  drawing surface -- it never takes a pointer event except on the thumb. */
const REACH = 260;

/** How near the thumb a tick is drawn at its full length, as a fraction of
 *  the track. The scale is legible as a whole and emphatic where you are,
 *  which is the same idea as the dock on the wide-screen rail. */
const TICK_REACH = 0.06;

export function PhotoScrubber({
  bands,
  active,
  onSeek,
  inTimeOrder,
  className,
}: {
  bands: BandCount[];
  /** The band currently on screen, read from scroll position by the river. */
  active: string;
  onSeek: (key: string) => void;
  /** Whether the river is running in time. It decides what the thumb
   *  REPORTS at rest, never whether the scrubber exists. */
  inTimeOrder: boolean;
  className?: string;
}) {
  const keys = useMemo(() => orderBandKeys(bands.map((b) => b.key)), [bands]);
  const [shown, setShown] = useState(false);
  /** The band under the thumb while it is held; null when it is not. */
  const [held, setHeld] = useState<string | null>(null);
  /** Where the thumb is while it IS held, 0..1 down the track. */
  const [dragAt, setDragAt] = useState(0);
  /** How far down the document the reader is, 0..1. Only consulted in the
   *  orders where a band cannot be. */
  const [scrollAt, setScrollAt] = useState(0);
  const hide = useRef<ReturnType<typeof setTimeout>>(undefined);
  const holding = useRef(false);

  /* THE TRACK IS AN ELEMENT, not a number this component works out. Its box
     already spans the window between the two insets, so CSS can place the
     thumb along it and the pointer handler can read the one rect it needs at
     the moment it needs it. Nothing measured into state, nothing to keep in
     step with a resize, nothing read off `window` during a render the server
     also has to do. */
  const rail = useRef<HTMLDivElement>(null);

  /* WHERE THE THUMB SITS WHEN NOBODY IS HOLDING IT: at the band it is naming,
     DERIVED, not stored. Storing it and syncing on change is the same value
     kept in two places, and the two disagree for a frame every time the river
     settles on a new band -- a thumb that twitches while you scroll. */
  const bandAtRest = keys.length > 1 ? Math.max(0, keys.indexOf(active)) / (keys.length - 1) : 0;
  const at = held !== null ? dragAt : inTimeOrder ? bandAtRest : scrollAt;

  /* Raised by scrolling and by nothing else. No entrance on load. */
  useEffect(() => {
    const wake = () => {
      setShown(true);
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (room > 0) setScrollAt(Math.min(1, Math.max(0, window.scrollY / room)));
      clearTimeout(hide.current);
      if (!holding.current) hide.current = setTimeout(() => setShown(false), LINGER);
    };
    window.addEventListener("scroll", wake, { passive: true });
    return () => {
      window.removeEventListener("scroll", wake);
      clearTimeout(hide.current);
    };
  }, []);

  /* THE RIGHT EDGE IS THE SCRUBBER'S while it is mounted. The browser's own
     overlay scroll bar appears at the same moment and in the same place, so
     the two drew on top of each other. The rule this class turns on lives in
     globals.css and is bounded to under 1280px; `scrollbar-gutter: stable` is
     already set app-wide, so nothing shifts when the bar stops being drawn. */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-scrubber");
    return () => root.classList.remove("has-scrubber");
  }, []);

  const bandAt = useCallback(
    (clientY: number) => {
      const box = rail.current?.getBoundingClientRect();
      const span = box ? box.height - THUMB : 0;
      if (!box || span <= 0 || keys.length < 2) return { key: keys[0] ?? "", frac: 0 };
      const frac = Math.min(1, Math.max(0, (clientY - box.top - THUMB / 2) / span));
      return { key: keys[Math.round(frac * (keys.length - 1))], frac };
    },
    [keys]
  );

  const grab = (e: React.PointerEvent) => {
    /* Capture so the thumb keeps receiving moves once the finger has slid off
       a 44px target, which on a phone is within the first few pixels. Guarded
       because it throws for a pointer the browser does not consider active,
       and a scrubber that cannot be grabbed is worse than one that is merely
       harder to hold. */
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no capture; the handlers below still work while the finger is on it
    }
    holding.current = true;
    clearTimeout(hide.current);
    setShown(true);
    const { key, frac } = bandAt(e.clientY);
    setHeld(key);
    setDragAt(frac);
  };

  const move = (e: React.PointerEvent) => {
    if (!holding.current) return;
    const { key, frac } = bandAt(e.clientY);
    setHeld(key);
    setDragAt(frac);
  };

  const release = () => {
    if (!holding.current) return;
    holding.current = false;
    /* The travel happens on RELEASE, never during the drag. Seeking on every
       move would fire a fresh query per pixel and leave the reader watching a
       river re-fetch itself under a thumb that has not decided yet. */
    if (held) onSeek(held);
    setHeld(null);
    hide.current = setTimeout(() => setShown(false), LINGER);
  };

  if (keys.length < 2) return null;

  const dragging = held !== null;
  const label = bandLabel(held ?? active ?? keys[0]);

  return (
    <div
      aria-hidden={!shown}
      className={cn("pointer-events-none fixed inset-0 z-30 xl:hidden", className)}
    >
      {/* THE PAPER COMING UP OVER THE PHOTOGRAPHS. Not a dark scrim -- the
          page's own background, so the archive fades toward the paper it is
          printed on rather than toward a shadow. Opacity only. */}
      <m.div
        aria-hidden
        className="absolute inset-0 bg-background"
        initial={false}
        /* Not all the way. A ghost of the photographs left under the paper
           keeps the gesture attached to the thing it is scrubbing -- go to
           opaque and it stops being the Collection stepping back and starts
           being a different screen. */
        animate={{ opacity: dragging ? 0.88 : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      />

      <div
        ref={rail}
        className="absolute right-0"
        style={{ top: TRACK_TOP, bottom: TRACK_FOOT, width: REACH }}
      >
        {/* THE SCALE. One tick per band, the whole archive at once, drawn only
            while a thumb is on it. Longest and inked where you are, falling
            away either side -- the same idea as the dock on the wide-screen
            rail, so the two indexes read as one thing in two shapes. */}
        <AnimatePresence>
          {dragging &&
            keys.map((key, i) => {
              const seat = keys.length > 1 ? i / (keys.length - 1) : 0;
              const near = Math.max(0, 1 - Math.abs(seat - at) / TICK_REACH);
              const decade = key !== "unknown" && Number(key) % 10 === 0;
              return (
                <m.span
                  key={key}
                  aria-hidden
                  className="absolute block h-px rounded-full bg-foreground"
                  style={{
                    top: `calc(${seat} * (100% - ${THUMB}px) + ${THUMB / 2}px)`,
                    right: TICKS_INSET,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 0.24 + near * 0.68,
                    width: (decade ? 12 : 7) + near * 13,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                />
              );
            })}
        </AnimatePresence>

        {/* THE YEAR, in the heading face, beside your thumb. It is the only
            large type on the screen while this is happening, which is what
            makes the gesture feel like it is worth doing. */}
        <AnimatePresence>
          {dragging && (
            <m.span
              aria-hidden
              data-scrub-year
              className="absolute block whitespace-nowrap font-heading text-[40px] leading-none tracking-[-0.02em] text-foreground tabular-nums"
              style={{
                top: `calc(${at} * (100% - ${THUMB}px) + ${THUMB / 2}px)`,
                right: YEAR_INSET,
                y: "-50%",
              }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {label}
            </m.span>
          )}
        </AnimatePresence>

        {/* THE THUMB AND ITS TARGET. The hairline is three pixels; the thing
            you can actually hit is forty-four, and invisible. */}
        <AnimatePresence>
          {shown && (
            <m.button
              type="button"
              /* `touch-action: none`, or the drag scrolls the river underneath
                 and the thumb never gets the moves. */
              style={{
                top: `calc(${at} * (100% - ${THUMB}px))`,
                height: THUMB,
                width: TARGET,
                touchAction: "none",
              }}
              onPointerDown={grab}
              onPointerMove={move}
              onPointerUp={release}
              onPointerCancel={release}
              /* Only claims a band when the river is actually running in
                 time, or when a thumb is on it and has chosen one. */
              aria-label={
                inTimeOrder || held !== null
                  ? `Jump to when the photograph was taken. Now at ${label}`
                  : "Jump to when the photograph was taken"
              }
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              /* The only thing that takes a pointer, and it stays on the
                 edge where the thumb already is. */
              className="pointer-events-auto absolute right-0 flex items-center justify-end pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <m.span
                aria-hidden
                className="block w-[3px] rounded-full bg-foreground"
                initial={false}
                /* Held, the hairline is the tick you are on: it stretches to
                   meet the scale rather than being replaced by it. */
                animate={{ opacity: dragging ? 0 : 0.4, height: dragging ? 2 : THUMB }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              />
            </m.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
