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
 *  THE YEAR IS THE HANDLE, and that is the answer to the thing that was
 *  wrong with this control for its first ten days: "people don't really
 *  intuit that you can drag on the normal looking one and it's hard to
 *  contact it at times" (owner, 2026-09-12). Four faces were drawn
 *  against the real archive at /lab/collection/scrub -- a two-line grip,
 *  this one, a bead on a thread and a ruler down the whole edge -- and
 *  this is the one he picked.
 *
 *  What it replaces was a three-pixel hairline whose own docblock called
 *  it "an iOS scroll indicator, near enough". It was, exactly, and that
 *  is why nobody ever held it: an iOS scroll indicator is a thing you
 *  cannot drag and everybody knows it, so the disguise worked and the
 *  control disappeared into it. A number is not chrome. It moves as you
 *  scroll, so it is visibly about position, and it is text, so it reads
 *  as something to touch. It also answers a question the hairline could
 *  not: what year am I in, without holding anything.
 *
 *  TWO STATES NOW, AND THE FIRST ONE IS NOT NOTHING. It used to raise
 *  itself on a scroll and leave 1.4 seconds later, and that was half of
 *  "hard to contact at times" -- you scroll, you see it, you stop
 *  scrolling to aim, and it fades while you are aiming. It stays put
 *  now, for as long as there is anything to scroll (owner, 2026-09-12:
 *  "stays put on"). Held, the page falls back to paper and the whole
 *  archive comes up the edge as a scale, which is unchanged and is the
 *  part that already worked.
 *
 *  A TAP DOES NOTHING IN PARTICULAR. The lab drew a tap that opened the
 *  scale and left it up, for somebody who would never think to drag; he
 *  turned it off. A press that does not travel simply lands you where
 *  you pressed, same as one that does.
 *
 *  THE NUMBERS THAT MADE IT HARD TO HIT. The seat is 56px, not 28: the
 *  old one was 44 wide and 28 tall, and on a vertical control it is the
 *  vertical axis you have to land on. The chip is held 8px off the true
 *  right edge, clear of the curve of the glass and the back-swipe zone,
 *  while the hit box still runs to the edge -- so nothing became harder
 *  to reach, only easier to aim at.
 *
 *  IT IS OPAQUE BECAUSE IT HAS TO BE. Measured at 390: the river runs 20
 *  to 370, so there is a 20px gutter of page down each side and the old
 *  hairline sat inside it, on paper. The chip is 50px and does not --
 *  about three quarters of it is over a photograph. Accent rather than
 *  the page's own colour is also its right rung on the ladder: a small
 *  thing floating over the page, the way a menu is.
 *
 *  NO COLOURED CHIP. A Canopy pill was the first attempt and it was
 *  wrong twice over -- "that green mobile scroller looks a bit cringe.
 *  Maybe not a full colour background way of doing it." Canopy is this
 *  project's CTA colour and a position readout is not a CTA. Nothing
 *  here has a brand fill; the chip is paper and everything on it is ink.
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
 *  What does change with the order is what the chip SAYS. Running in
 *  time it names the band you are in. In Newest or Most loved there is
 *  no such answer -- the river is sorted by upload date or by love, and
 *  a year would be a number with nothing behind it -- so it shows the
 *  gesture instead, two carets, and claims nothing. Held, it is the same
 *  index either way, and letting go turns the river to Chronological and
 *  travels there, which is precisely what pressing the rail does.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { bandLabel, orderBandKeys } from "@/lib/collection";
import { readBandPosition } from "./photo-river";
import { cn } from "@/lib/utils";

export type BandCount = { key: string; count: number };

/** The track's inset from the top and foot of the window.
 *
 *  96 until the chip started staying put, and that number only ever had to
 *  clear the fixed top band (bottom 48). Measured on /collection at 390, the
 *  page's own header puts Search and Contribute at 77..117 in this corner --
 *  they scroll away, but scroll zero is the first thing anybody sees, and a
 *  chip resting at the top of a 96 track landed 7px inside the Contribute
 *  button and read as a second one stacked under it. 124 puts the chip's top
 *  at 138, twenty-one clear, and costs 28px of a 652px travel. */
const TRACK_TOP = 124;
const TRACK_FOOT = 40;

/** The seat the chip travels in, and the height of the hit box around it.
 *  28 until 2026-09-12, which is the number that made it hard to land on. */
const SEAT = 56;

/** How far the chip sits in from the true right edge. The hit box still runs
 *  to 0; this only moves the thing you aim at off the curve of the glass. */
const EDGE = 8;

/* ------------------------------------------------------------------ *
 *  WHAT YOU HOLD AND WHAT YOU READ ARE NOT IN THE SAME PLACE.
 *
 *  The chip stays on the right edge, because that is where a thumb goes.
 *  Everything the HELD state asks you to look at moves inboard of it,
 *  because that is where a thumb is not: "my thumb covers the ticks so I
 *  can't see them ... the year is a bit hidden by my finger sometimes"
 *  (owner, 2026-09-02).
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
 *  drawing surface -- it never takes a pointer event except on the seat. */
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
  /** Whether the river is running in time. It decides what the chip SAYS,
   *  never whether the scrubber exists. */
  inTimeOrder: boolean;
  className?: string;
}) {
  const keys = useMemo(() => orderBandKeys(bands.map((b) => b.key)), [bands]);

  /* EVERY BAND AS THE SCALE SEES IT, computed once per archive rather than
     per frame: where each one sits down the track and whether it opens a
     decade. Neither depends on where the thumb is. */
  const marks = useMemo(
    () =>
      keys.map((key, i) => ({
        key,
        seat: keys.length > 1 ? i / (keys.length - 1) : 0,
        decade: key !== "unknown" && Number(key) % 10 === 0,
      })),
    [keys]
  );

  /** The band under the thumb and how far down the track it is, while it is
   *  held; null when it is not. One piece of state rather than two, so a
   *  release cannot clear the band and leave the fraction behind. */
  const [grip, setGrip] = useState<{ key: string; frac: number } | null>(null);
  /** How far down the document the reader is, 0..1. Only consulted in the
   *  orders where a band cannot be. */
  const [scrollAt, setScrollAt] = useState(0);
  /** Whether there is anything to scroll at all. A chip that indexes a page
   *  which fits on one screen is a control with nothing to do. */
  const [scrollable, setScrollable] = useState(false);
  const holding = useRef(false);

  /* THE TRACK IS AN ELEMENT, not a number this component works out. Its box
     already spans the window between the two insets, so CSS can place the
     chip along it and the pointer handler can read the one rect it needs at
     the moment it needs it. Nothing measured into state, nothing to keep in
     step with a resize, nothing read off `window` during a render the server
     also has to do. */
  const rail = useRef<HTMLDivElement>(null);

  /* WHERE THE CHIP SITS WHEN NOBODY IS HOLDING IT: at the band it is naming,
     PLUS how far through that band the reader has got.

     The second term is the whole difference between a scrollbar and a
     signpost. Without it the chip is `indexOf(active) / count`, which does
     not move at all while you read a year and then teleports when you cross
     into the next: measured on the class archive, the same pixel through
     nineteen thousand pixels of scrolling, then a 75px jump. "The scrolling
     bar should never jump from place to place. It does that now" (owner,
     2026-09-02).

     Read from the river's own headings through the same function the river
     uses (`readBandPosition`), so the two indexes cannot come to disagree
     about which year you are in -- and NOT from the raw scroll fraction,
     which in a lazily loaded river is a fraction of what happens to be
     loaded rather than of the archive, and would put the chip nowhere near
     the tick that names where you are. */
  const [bandSeat, setBandSeat] = useState(0);
  const at = grip ? grip.frac : inTimeOrder ? bandSeat : scrollAt;
  const dragging = grip !== null;

  useEffect(() => {
    const read = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      setScrollable(room > 0);
      if (room > 0) setScrollAt(Math.min(1, Math.max(0, window.scrollY / room)));
      /* The band, interpolated. `keys` is every band the ARCHIVE holds, not
         only the ones loaded, so the chip travels the whole index; bands
         with no heading in the DOM yet simply have not been reached. */
      if (keys.length > 1) {
        const { key, progress } = readBandPosition(keys, (k) =>
          document.querySelector<HTMLElement>(`[data-band="${CSS.escape(k)}"]`)
        );
        const i = keys.indexOf(key);
        if (i >= 0) setBandSeat(Math.min(1, (i + progress) / (keys.length - 1)));
      }
    };
    /* One reading per frame while the page is moving. `read` touches layout,
       and a scroll event can fire far more often than the screen refreshes. */
    let frame = 0;
    const soon = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        read();
      });
    };
    window.addEventListener("scroll", soon, { passive: true });
    /* AND ON RESIZE OF THE DOCUMENT ITSELF, which a scroll listener alone
       cannot see. The river lazy-loads: at mount the page is one screen tall
       and `scrollable` is false, and without this the chip would stay away
       until the reader scrolled -- which they cannot do, because there is
       nothing to scroll until the photographs arrive and give the page its
       height. That is the whole control failing to appear on a cold load. */
    const grew = new ResizeObserver(soon);
    grew.observe(document.documentElement);
    // Once at mount, so the chip is in the right place before the first
    // scroll rather than starting at the top of the track and jumping.
    read();
    return () => {
      window.removeEventListener("scroll", soon);
      grew.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [keys]);

  /* THE RIGHT EDGE IS THE SCRUBBER'S while it is mounted. The browser's own
     overlay scroll bar appears in the same place, so the two drew on top of
     each other. The rule this class turns on lives in globals.css and is
     bounded to under 1280px; `scrollbar-gutter: stable` is already set
     app-wide, so nothing shifts when the bar stops being drawn. */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-scrubber");
    return () => root.classList.remove("has-scrubber");
  }, []);

  const bandAt = useCallback(
    (clientY: number) => {
      const box = rail.current?.getBoundingClientRect();
      const span = box ? box.height - SEAT : 0;
      if (!box || span <= 0 || keys.length < 2) return { key: keys[0] ?? "", frac: 0 };
      const frac = Math.min(1, Math.max(0, (clientY - box.top - SEAT / 2) / span));
      return { key: keys[Math.round(frac * (keys.length - 1))], frac };
    },
    [keys]
  );

  const grab = (e: React.PointerEvent) => {
    /* Capture so the chip keeps receiving moves once the finger has slid off
       a 56px target, which on a phone is within the first few pixels. Guarded
       because it throws for a pointer the browser does not consider active,
       and a scrubber that cannot be grabbed is worse than one that is merely
       harder to hold. */
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no capture; the handlers below still work while the finger is on it
    }
    holding.current = true;
    setGrip(bandAt(e.clientY));
  };

  const move = (e: React.PointerEvent) => {
    if (!holding.current) return;
    setGrip(bandAt(e.clientY));
  };

  const release = () => {
    if (!holding.current) return;
    holding.current = false;
    /* The travel happens on RELEASE, never during the drag. Seeking on every
       move would fire a fresh query per pixel and leave the reader watching a
       river re-fetch itself under a thumb that has not decided yet. */
    if (grip) onSeek(grip.key);
    setGrip(null);
  };

  if (keys.length < 2 || !scrollable) return null;

  const label = bandLabel(grip?.key ?? active ?? keys[0]);

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-30 xl:hidden", className)}>
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
        transition={{ duration: 0.32, ease: EASE_OUT_SMOOTH }}
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
            marks.map(({ key, seat, decade }) => {
              const near = Math.max(0, 1 - Math.abs(seat - at) / TICK_REACH);
              return (
                <m.span
                  key={key}
                  aria-hidden
                  className="absolute block h-px rounded-full bg-foreground"
                  style={{
                    top: `calc(${seat} * (100% - ${SEAT}px) + ${SEAT / 2}px)`,
                    right: TICKS_INSET,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.24 + near * 0.68, width: (decade ? 12 : 7) + near * 13 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: EASE_OUT_SMOOTH }}
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
              className="absolute block whitespace-nowrap font-heading text-[40px] leading-none tracking-[-0.02em] tabular-nums text-foreground"
              style={{
                top: `calc(${at} * (100% - ${SEAT}px) + ${SEAT / 2}px)`,
                right: YEAR_INSET,
                y: "-50%",
              }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.24, ease: EASE_OUT_SMOOTH }}
            >
              {label}
            </m.span>
          )}
        </AnimatePresence>

        {/* THE CHIP AND ITS SEAT. The chip is 50 by 28; the thing you can
            actually hit is 72 by 56 and runs to the edge of the screen. */}
        <m.button
          type="button"
          /* `touch-action: none`, or the drag scrolls the river underneath
             and the chip never gets the moves. */
          style={{
            top: `calc(${at} * (100% - ${SEAT}px))`,
            height: SEAT,
            touchAction: "none",
          }}
          onPointerDown={grab}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
          /* Only claims a band when the river is actually running in time,
             or when a thumb is on it and has chosen one. */
          aria-label={
            inTimeOrder || grip !== null
              ? `Jump to when the photograph was taken. Now at ${label}`
              : "Jump to when the photograph was taken"
          }
          /* Once, on mount. It stays put after that, so there is no exit and
             nothing to keep an AnimatePresence for. */
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT_SMOOTH }}
          /* The only thing that takes a pointer, and it stays on the edge
             where the thumb already is. */
          className="pointer-events-auto absolute right-0 flex w-[72px] items-center justify-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <m.span
            aria-hidden
            /* ONE SILHOUETTE IN EVERY ORDER. Without the minimum the caret
               form is 31px and very nearly a circle, and the Collection opens
               in Newest -- so the first thing anybody saw was a small round
               white button sitting under the round green Contribute one,
               reading as a pair of buttons rather than as an index. A year is
               48px; holding the carets to the same width makes the control one
               shape whose CONTENTS change with the order, instead of two
               shapes. "Undated" is wider and simply grows. */
            className="flex h-7 min-w-[46px] items-center justify-center rounded-full bg-accent px-2 shadow-sm ring-1 ring-foreground/12"
            style={{ marginRight: EDGE }}
            initial={false}
            /* Held, the chip gets out of the way: the 40px year inboard is
               saying the same thing, better, and two readouts on one row is
               one too many. */
            animate={{ opacity: dragging ? 0 : 1 }}
            transition={{ duration: 0.22, ease: EASE_OUT_SMOOTH }}
          >
            {inTimeOrder ? (
              <span className="font-heading text-[13.5px] leading-none tracking-[-0.01em] tabular-nums text-foreground">
                {label}
              </span>
            ) : (
              <span className="flex flex-col items-center gap-[3px] px-[3px] text-foreground/45">
                <Caret up />
                <Caret />
              </span>
            )}
          </m.span>
        </m.button>
      </div>
    </div>
  );
}

/** A caret, drawn rather than imported: Lucide's is 24px of stroke tuned for
 *  a 16px box and this one is six pixels across. */
function Caret({ up = false }: { up?: boolean }) {
  return (
    <svg width="9" height="5" viewBox="0 0 9 5" fill="none" aria-hidden>
      <path
        d={up ? "M1 4L4.5 1L8 4" : "M1 1L4.5 4L8 1"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
