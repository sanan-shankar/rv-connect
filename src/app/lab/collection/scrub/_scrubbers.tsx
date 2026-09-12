"use client";

/* ------------------------------------------------------------------ *
 *  Four faces for the phone's scrubber, one set of hands behind them.
 *
 *  The problem, in his words: "people don't really intuit that you can
 *  drag on the normal looking one and it's hard to contact it at times"
 *  (owner, 2026-09-12).
 *
 *  Five causes, and the shipped `<PhotoScrubber>` has all five.
 *
 *    1. IT IS DISGUISED AS A THING YOU CANNOT DRAG. Its own file says
 *       so: "an iOS scroll indicator, near enough". iOS scroll
 *       indicators are not draggable and everybody knows it, so the
 *       disguise reads as decoration reporting a position.
 *    2. IT LEAVES 1.4 SECONDS AFTER THE RIVER STOPS. You scroll, you
 *       see it, you stop to aim, and it fades while you are aiming.
 *    3. THE TARGET IS 44 WIDE AND 28 TALL. Apple's number is 44 both
 *       ways, and on a vertical scrubber the vertical axis is the one
 *       you have to land on.
 *    4. IT IS FLUSH AT `right: 0`. Curved glass, the back-swipe zone,
 *       and a right thumb has to hook over the edge to reach it.
 *  Causes 2 to 4 are settled and fixed the same way in all four faces:
 *  a 56px seat, the art held in off the edge, and a longer stay. Cause 1
 *  is a question of shape, and that is what the four are for.
 *
 *  THE GUTTER IS 20px AND IT DECIDES WHICH FACES NEED PAPER UNDER THEM.
 *  Measured on the real `/collection` at 390: the photographs run 20 to
 *  370, so there is a 20px margin of page down each side and the shipped
 *  hairline sits in it, on paper, legible. A face WIDER than that gutter
 *  does not: the year chip is 50px, which puts three quarters of it over
 *  a photograph, and the ruler's longest ticks reach about 10px past the
 *  edge of one. Those two carry their own ground and say so where they
 *  are drawn. Grip and Bead fit in the gutter and carry nothing, because
 *  paper laid over paper is chrome that does no work.
 *
 *  THE HELD STATE IS THE SAME IN ALL FOUR, deliberately. The paper
 *  coming up, the scale up the edge, the year at forty pixels: that is
 *  the part he already approved and the part that works. Only what you
 *  see BEFORE you hold it changes, so the comparison is clean and the
 *  question is only ever "which one do you reach for".
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { bandLabel, orderBandKeys } from "@/lib/collection";
import { readBandPosition } from "@/components/collection/photo-river";
import { cn } from "@/lib/utils";

export type ScrubFace = "grip" | "signpost" | "bead" | "ruler";

/** What each face is arguing, in one line, because the room shows four
 *  things at the same place on the same edge and the difference between two
 *  of them is four pixels. The Ruler's line names its cost: it is the only
 *  face that takes something away. */
export const FACE_NAMES: { id: ScrubFace; name: string; says: string }[] = [
  {
    id: "grip",
    name: "Grip",
    says: "Two lines instead of one, which is the mark every drag handle uses. Small enough to stay inside the 20px gutter.",
  },
  {
    id: "signpost",
    name: "Signpost",
    says: "The year is the handle. A number that moves as you scroll is obviously about position, and you can read where you are without holding anything.",
  },
  {
    id: "bead",
    name: "Bead",
    says: "A bead on a thread, the most literal slider there is. The only face that leaves a line down the edge when nobody is touching it.",
  },
  {
    id: "ruler",
    name: "Ruler",
    says: "The scale is faintly there all the time and you can grab anywhere on the edge. That costs the right 32px, which no longer scrolls the river.",
  },
];

/* ------------------------------------------------------------------ *
 *  Kept from the shipped scrubber, because they were tuned against a
 *  real thumb and this room is not relitigating them.
 * ------------------------------------------------------------------ */
const TRACK_TOP = 96;
const TRACK_FOOT = 40;
/** How far in the apparatus reaches. A hit box and a drawing surface. */
const REACH = 260;
/** The scale and the year, held clear of where a thumb and the hand behind
 *  it sit: roughly the outer 50pt of a 390pt phone. */
const TICKS_INSET = 54;
const YEAR_INSET = 92;
/** How near the thumb a tick is drawn at full length while held. */
const TICK_REACH = 0.06;

/* ------------------------------------------------------------------ *
 *  Changed, and these are the fixes for causes 2 to 5.
 * ------------------------------------------------------------------ */

/** The seat the thumb travels in. 28 in the shipped version, which is the
 *  number that made it hard to land on: it is the vertical axis of a
 *  vertical control. 56 is Apple's 44 plus enough to aim at while the page
 *  is still moving under you. */
const SEAT = 56;

/** How far the visible art sits in from the true right edge. The hit box
 *  still runs to 0, so nothing is harder to reach than it was -- this only
 *  moves the thing you are aiming AT off the curve of the glass. */
const EDGE = 8;

/** How long the thumb stays after the river stops, when it is not pinned on.
 *  1400 in the shipped version. Long enough there to read where you landed,
 *  not long enough to stop scrolling and aim. */
const LINGER = 2600;

/** A press shorter and stiller than this is a tap, not a drag. */
const TAP_MS = 320;
const TAP_SLOP = 7;

/** How wide a band of the edge the Ruler claims. Everything else takes a
 *  pointer only on its seat; the Ruler's whole pitch is that you can grab
 *  anywhere, which costs this strip for scrolling. That trade is the thing
 *  the Ruler is in this room to be judged on. */
const RULER_STRIP = 32;
/** How far either side of you the Ruler draws its ticks, as a fraction of
 *  the track. Wider than the held scale's, because at rest it is a hint
 *  about where you are rather than an index you are reading. */
const RULER_REACH = 0.17;

/** The one tick, so the two scales that draw it cannot drift apart on shape
 *  while staying deliberately different on reach, inset and weight. */
const TICK = "absolute block h-px rounded-full bg-foreground";

export function LabScrubber({
  bands,
  active,
  onSeek,
  inTimeOrder,
  face,
  persist,
  tapOpens,
  onDraggingChange,
}: {
  /** Every band the ARCHIVE holds, in any order. Keys only: the shipped
   *  scrubber takes counts because the wide-screen rail draws marks whose
   *  length is how many each year holds, and nothing on this edge does. */
  bands: string[];
  active: string;
  onSeek: (key: string) => void;
  /** Whether the river is running in time. Decides what the thumb REPORTS
   *  at rest, never whether the scrubber exists. */
  inTimeOrder: boolean;
  face: ScrubFace;
  /** On: it never leaves while the page is somewhere you could scroll.
   *  Off: it fades, but after LINGER rather than the shipped 1400. */
  persist: boolean;
  /** On: a tap opens the scale and leaves it up, for somebody who will
   *  never think to drag anything. */
  tapOpens: boolean;
  /** So the room can get its own controls out of the way of the spectacle. */
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const keys = useMemo(() => orderBandKeys(bands), [bands]);
  /** Raised by a scroll and lowered by the linger. `persist` is OR'd over it
   *  at the point of use rather than pushed into it, so flipping the switch
   *  cannot leave the two disagreeing. */
  const [scrolled, setScrolled] = useState(false);
  /** The band under the thumb and how far down the track it is, while it is
   *  held; null when it is not. One piece of state rather than two: every
   *  writer set both in the same breath except `release`, which cleared the
   *  band and left the fraction behind for the next reader of `at`. */
  const [grip, setGrip] = useState<{ key: string; frac: number } | null>(null);
  /** Held open by a tap rather than by a finger that is still down. */
  const [pinned, setPinned] = useState(false);
  const [scrollAt, setScrollAt] = useState(0);
  const [bandSeat, setBandSeat] = useState(0);
  const hide = useRef<ReturnType<typeof setTimeout>>(undefined);
  const holding = useRef(false);
  /** Where and when the finger went down, so a tap can be told from a drag. */
  const began = useRef({ y: 0, t: 0, moved: 0 });
  const rail = useRef<HTMLDivElement>(null);

  /* EVERY BAND AS THE SCALE SEES IT, computed once per archive rather than
     per frame. Both scales need each band's seat down the track and whether
     it opens a decade, and neither depends on where the thumb is -- but the
     Ruler leaves its scale up AT REST, so inline this was 59 divisions and 59
     `Number()` parses on every scroll frame for as long as it was selected. */
  const marks = useMemo(
    () =>
      keys.map((key, i) => ({
        key,
        seat: keys.length > 1 ? i / (keys.length - 1) : 0,
        decade: key !== "unknown" && Number(key) % 10 === 0,
      })),
    [keys]
  );

  const shown = scrolled || persist;
  const at = grip ? grip.frac : inTimeOrder ? bandSeat : scrollAt;
  const dragging = grip !== null;

  useEffect(() => onDraggingChange?.(dragging), [dragging, onDraggingChange]);

  /** Letting go of a pin drops the band it was holding open with it: `grip`
   *  is what draws the scrim and the scale, so leaving it set would pin the
   *  spectacle up with nothing holding it. */
  const unpin = useCallback(() => {
    setPinned(false);
    setGrip(null);
  }, []);

  /* Raised by scrolling, and on mount when it is meant to be there from the
     start. Everything here is the shipped reading, unchanged: the band
     interpolated through the river's own function so the two indexes cannot
     disagree, and the raw scroll fraction only in the orders where a year
     would be a number with nothing behind it. */
  useEffect(() => {
    const read = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (room > 0) setScrollAt(Math.min(1, Math.max(0, window.scrollY / room)));
      if (keys.length > 1) {
        const { key, progress } = readBandPosition(keys, (k) =>
          document.querySelector<HTMLElement>(`[data-band="${CSS.escape(k)}"]`)
        );
        const i = keys.indexOf(key);
        if (i >= 0) setBandSeat(Math.min(1, (i + progress) / (keys.length - 1)));
      }
      // A scroll is the reader leaving whatever a tap pinned open. Inside
      // `read`, not beside it: a scroll event fires far more often than the
      // screen refreshes, and this is the one handler gated for that.
      if (!holding.current) unpin();
      clearTimeout(hide.current);
      if (!holding.current && !persist) hide.current = setTimeout(() => setScrolled(false), LINGER);
    };
    let frame = 0;
    const wake = () => {
      setScrolled(true);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        read();
      });
    };
    window.addEventListener("scroll", wake, { passive: true });
    read();
    return () => {
      window.removeEventListener("scroll", wake);
      clearTimeout(hide.current);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [keys, persist, unpin]);

  /* The right edge is the scrubber's while this is mounted, same rule and
     same reason as the shipped one: the browser's own overlay bar comes up
     in the same place at the same moment and the two draw on each other. */
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

  /* One wiring, two possible elements: the Ruler's strip and everything
     else's seat are mutually exclusive but take the identical four handlers,
     and having written them out twice they had already started to drift. */
  const hands = {
    onPointerDown: (e: React.PointerEvent) => grab(e),
    onPointerMove: (e: React.PointerEvent) => move(e),
    onPointerUp: () => release(),
    onPointerCancel: () => release(),
  };

  const grab = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no capture; the handlers below still work while the finger is on it
    }
    holding.current = true;
    began.current = { y: e.clientY, t: Date.now(), moved: 0 };
    clearTimeout(hide.current);
    setScrolled(true);
    setGrip(bandAt(e.clientY));
  };

  const move = (e: React.PointerEvent) => {
    if (!holding.current) return;
    began.current.moved = Math.max(began.current.moved, Math.abs(e.clientY - began.current.y));
    setGrip(bandAt(e.clientY));
  };

  const release = () => {
    if (!holding.current) return;
    holding.current = false;
    const { t, moved } = began.current;
    const tapped = tapOpens && moved < TAP_SLOP && Date.now() - t < TAP_MS;

    /* A TAP IS NOT A SEEK. Someone who taps has not chosen a year, they have
       asked what the years ARE -- so the scale stays up and nothing travels.
       Anything else travels on release and never during the drag: seeking per
       pixel would re-fetch a river under a thumb that has not decided yet. */
    if (tapped && !pinned) {
      setPinned(true);
      return;
    }
    setPinned(false);
    if (grip) onSeek(grip.key);
    setGrip(null);
    if (!persist) hide.current = setTimeout(() => setScrolled(false), LINGER);
  };

  if (keys.length < 2) return null;

  const label = bandLabel(grip?.key ?? active ?? keys[0]);
  /* The Ruler takes a pointer anywhere down the edge; every other face takes
     one only on its seat. */
  const wholeEdge = face === "ruler";
  /* The two layers a face may leave on the track at rest. Both fade on the
     same condition and the same curve; only what they draw differs. */
  const ambient = {
    initial: false as const,
    animate: { opacity: shown && !dragging ? 1 : 0 },
    transition: { duration: 0.3, ease: EASE_OUT_SMOOTH },
  };
  const seatStyle = {
    top: `calc(${at} * (100% - ${SEAT}px))`,
    height: SEAT,
    touchAction: "none" as const,
  };

  /* No `xl:hidden`, which the shipped scrubber has because the wide screen
     gets the year rail instead. This room narrows the river to a phone at
     every width, so the faces can be reached on a laptop too. */
  return (
    <div aria-hidden={!shown} className="pointer-events-none fixed inset-0 z-30">
      {/* The paper coming up over the photographs. Not a dark scrim: the
          page's own background, so the archive fades toward the paper it is
          printed on. Pinned open, it is also the way out. */}
      <m.div
        aria-hidden
        className={cn("absolute inset-0 bg-background", pinned && "pointer-events-auto")}
        onPointerDown={unpin}
        initial={false}
        animate={{ opacity: dragging ? 0.88 : 0 }}
        transition={{ duration: 0.32, ease: EASE_OUT_SMOOTH }}
      />

      <div
        ref={rail}
        className="absolute right-0"
        style={{ top: TRACK_TOP, bottom: TRACK_FOOT, width: REACH }}
      >
        {/* THE HELD SCALE. One tick per band, the whole archive at once,
            longest and inked where you are. Identical in all four faces. */}
        <AnimatePresence>
          {dragging &&
            marks.map(({ key, seat, decade }) => {
              const near = Math.max(0, 1 - Math.abs(seat - at) / TICK_REACH);
              return (
                <m.span
                  key={key}
                  aria-hidden
                  className={TICK}
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

        {/* THE BEAD'S THREAD: the whole track, which is the point of it. A
            slider reads as a slider because you can see the range it runs
            over, and at rest that line is the only thing on this edge. */}
        {face === "bead" && (
          <m.div
            aria-hidden
            className="absolute inset-y-0 w-px bg-foreground/20"
            style={{ right: EDGE + 6 }}
            {...ambient}
          />
        )}

        {/* THE RULER'S GROUND AND ITS SCALE AT REST. Its longest ticks are
            22px against a 20px gutter, so they cross onto a photograph just
            as they become the one you are meant to read. The gradient fades
            that photograph back toward paper under them, and doubles as the
            only hint at rest that this edge is not just an edge. */}
        {face === "ruler" && (
          <m.div
            aria-hidden
            className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background/80 via-background/30 to-transparent"
            {...ambient}
          />
        )}
        {face === "ruler" && !dragging && (
          <AnimatePresence>
            {shown &&
              marks.map(({ key, seat, decade }) => {
                const near = Math.max(0, 1 - Math.abs(seat - at) / RULER_REACH);
                if (near <= 0.02) return null;
                return (
                  <m.span
                    key={key}
                    aria-hidden
                    className={TICK}
                    style={{
                      top: `calc(${seat} * (100% - ${SEAT}px) + ${SEAT / 2}px)`,
                      right: EDGE,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: near * (decade ? 0.75 : 0.55),
                      width: (decade ? 9 : 6) + near * near * 13,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.24, ease: EASE_OUT_SMOOTH }}
                  />
                );
              })}
          </AnimatePresence>
        )}

        {/* The Ruler's hit strip: the whole edge, which is the promise and
            also the cost. Nothing is drawn here. */}
        {wholeEdge && shown && (
          <button
            type="button"
            aria-label="Jump to when the photograph was taken"
            className="pointer-events-auto absolute inset-y-0 right-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            style={{ width: RULER_STRIP, touchAction: "none" }}
            {...hands}
          />
        )}

        {/* THE THUMB. One seat, four faces. */}
        <AnimatePresence>
          {shown && !wholeEdge && (
            <m.button
              type="button"
              style={seatStyle}
              {...hands}
              aria-label={
                inTimeOrder || grip !== null
                  ? `Jump to when the photograph was taken. Now at ${label}`
                  : "Jump to when the photograph was taken"
              }
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.22, ease: EASE_OUT_SMOOTH }}
              className="pointer-events-auto absolute right-0 flex w-[72px] items-center justify-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Face face={face} label={label} inTimeOrder={inTimeOrder} dragging={dragging} />
            </m.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The four faces. Each one carries its own paper, because the river is
 *  full-bleed on a phone and there is a photograph behind all of them.
 * ------------------------------------------------------------------ */
function Face({
  face,
  label,
  inTimeOrder,
  dragging,
}: {
  face: ScrubFace;
  label: string;
  inTimeOrder: boolean;
  dragging: boolean;
}) {
  const gone = { opacity: dragging ? 0 : 1 };
  const ease = { duration: 0.22, ease: EASE_OUT_SMOOTH };

  if (face === "grip") {
    /* TWO LINES, NOT ONE. One line is a scroll indicator; two lines side by
       side is the mark every drag handle in the world uses, and it costs
       four pixels to say it. Fourteen pixels wide, so it lives inside the
       gutter and needs nothing behind it. */
    return (
      <m.span
        aria-hidden
        className="flex h-11 items-center justify-center gap-[3px] px-[5px]"
        style={{ marginRight: EDGE }}
        initial={false}
        animate={gone}
        transition={ease}
      >
        <span className="block h-9 w-[2.5px] rounded-full bg-foreground/55" />
        <span className="block h-9 w-[2.5px] rounded-full bg-foreground/55" />
      </m.span>
    );
  }

  if (face === "signpost") {
    /* THE YEAR IS THE HANDLE. A number that moves as you scroll is
       self-evidently about position, and text reads as something to touch in
       a way a bar never does. Where there is no honest year to show -- Newest,
       Most loved -- it shows the gesture instead and claims nothing.

       Accent, not background: at 50px it is the one face too wide for the
       gutter, so most of it is over a photograph and it has to be opaque to
       be read at all. Accent is also the right rung for it on the ladder --
       a small thing floating over the page, the way a menu is. */
    return (
      <m.span
        aria-hidden
        className="flex h-7 items-center justify-center rounded-full bg-accent px-2 shadow-sm ring-1 ring-foreground/12"
        style={{ marginRight: EDGE }}
        initial={false}
        animate={gone}
        transition={ease}
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
    );
  }

  if (face === "bead") {
    /* THE BEAD. Its thread is drawn on the track below, not here: a thread
       inside the thumb is only ever as long as the 56px box that moves, and
       a bead on a 136px line is not a slider, it is a dash. */
    return (
      <m.span
        aria-hidden
        /* `relative`, and it is load-bearing: the ink dot inside is absolute, so
           without it the dot resolves against the 72x56 button instead and
           fills the whole hit box with a grey slab. */
        className="relative block size-[13px] rounded-full bg-accent shadow-sm ring-1 ring-foreground/28"
        style={{ marginRight: EDGE }}
        initial={false}
        animate={gone}
        transition={ease}
      >
        <span className="absolute inset-[3.5px] rounded-full bg-foreground/65" />
      </m.span>
    );
  }

  /* The Ruler has no thumb to draw: it takes the whole edge, and everything
     it shows lives on the track. Stated rather than left to fall through the
     bottom of a function whose file header promises four faces. */
  return null;
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
