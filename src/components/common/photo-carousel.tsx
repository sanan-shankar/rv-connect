"use client";

/* ------------------------------------------------------------------ *
 *  <PhotoCarousel> - more than two photographs in one post.
 *
 *  The owner, 2026-08-28: "I think if there's more than two images we
 *  use a carousel. and make sure it's a beautiful transition and just
 *  done really well. lot of carousels are super basic and not much
 *  thought and it's not smooth. let's make ours amazing."
 *
 *  So: one photograph at a time, each drawn by the SAME rule a
 *  photograph posted on its own gets (photo-layout.ts, via
 *  <PhotoFrame>), rather than squeezed into a shared box. Three
 *  photographs in a 316px phone card were a 760px stack; here they are
 *  one frame you swipe.
 *
 *  Three decisions are what separate this from a basic one:
 *
 *  1. THE SCROLLING IS THE BROWSER'S. A native scroll-snap track follows
 *     a finger exactly, with the platform's own momentum and rubber-band,
 *     which no JavaScript drag handler reproduces. `scroll-snap-stop:
 *     always` means a fast flick advances ONE photograph rather than
 *     skidding past three -- the single most common thing basic
 *     carousels get wrong.
 *  2. THE ARROWS USE OUR CURVE, NOT THE BROWSER'S. `behavior: "smooth"`
 *     is whatever the engine feels like, and it is usually flat and slow.
 *     A press animates scrollLeft on a rAF with EASE_OUT_SMOOTH, the same
 *     curve every other panel in this app slides on, with snapping turned
 *     off for the duration so the two do not fight.
 *  3. THE INDICATOR IS SCROLL-LINKED, NOT STATE-LINKED. It reads the
 *     actual scroll offset every frame, so it travels WITH your thumb
 *     rather than jumping when a slide finally settles. That is the
 *     detail that makes a carousel feel attached to the gesture.
 *
 *  4. THE FRAME FOLLOWS THE PHOTOGRAPH. Every photograph is drawn at
 *     exactly the size it would have been posted on its own, and the
 *     frame is whatever height that photograph needs -- interpolated as
 *     you swipe, so it breathes with the gesture rather than jumping
 *     when a slide lands. Nothing is ever shrunk to fit a shared shape
 *     and nothing is ever bedded to fill one. See `carouselWidth` for
 *     the two shared-shape rules this replaced and why both were wrong.
 *
 *  Everything animated is a transform. The frame's shape is known before
 *  any photograph loads, so nothing jumps.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { PhotoBed } from "@/components/common/photo-frame";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import {
  carouselWidth,
  drawnSize,
  framePhoto,
  photoSizes,
  type PhotoFacts,
  type StoredPhoto,
} from "@/lib/photo-layout";
import { cn } from "@/lib/utils";

export type CarouselPhoto = {
  src: string;
  srcSet?: string;
  photo: StoredPhoto | null;
};

/** How long an arrow press takes to cross one photograph. Long enough to be
 *  followed by the eye, short enough not to be waited on. */
const SLIDE_MS = 460;

/** The rail's geometry, in px, in one place: the dot and the space beside it.
 *  The indicator's travel is a multiple of the two, so a Tailwind class and a
 *  number in a transform must not be allowed to drift apart. */
const DOT = 6;
const DOT_GAP = 6;

/** What a photograph nobody has measured is treated as, for its `sizes`
 *  promise only: an ordinary camera landscape. It is drawn filling the frame
 *  regardless, so this decides nothing about layout. */
const NEUTRAL: PhotoFacts = { width: 3, height: 2, focalX: 0.5, focalY: 0.5 };

const ease = (t: number) => {
  /* EASE_OUT_SMOOTH as a cubic-bezier, evaluated. Newton on x(t) is overkill
     for a 460ms tween, so this samples the curve by bisection -- accurate to
     well under a pixel and about ten iterations. */
  const [x1, y1, x2, y2] = EASE_OUT_SMOOTH;
  const bez = (a: number, b: number, u: number) =>
    3 * a * (1 - u) ** 2 * u + 3 * b * (1 - u) * u ** 2 + u ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (bez(x1, x2, mid) < t) lo = mid;
    else hi = mid;
  }
  return bez(y1, y2, (lo + hi) / 2);
};

export function PhotoCarousel({
  photos,
  sizes,
  onOpen,
  onPreload,
  className,
}: {
  photos: CarouselPhoto[];
  /** The surface's `sizes` for its column. Each slide is the full column. */
  sizes: string;
  /** Open the shared viewer at this photograph. */
  onOpen: (index: number) => void;
  onPreload: () => void;
  className?: string;
}) {
  /* One frame per photograph, each the frame that photograph would have been
     given had it been posted on its own. An unmeasured one -- predating the
     `Image` table, or whose measurement failed -- has no shape to contribute,
     so it is treated as an ordinary camera landscape and simply fills
     whatever height the others settle on. */
  const frames = photos.map((p) => framePhoto(p.photo ?? NEUTRAL));
  const frameWidth = carouselWidth(frames);

  const frame = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLSpanElement>(null);
  const tween = useRef(0);
  const [at, setAt] = useState(0);
  const last = photos.length - 1;

  /* ---------------------------------------------------------------- *
   *  The frame's height, which is the current photograph's height.
   *
   *  Two shared-shape rules came before this one and each was wrong in
   *  the other's direction. Measured on one real post -- a 9:20, a 20:9
   *  and a 16:9 -- in a 314px phone slide, where the three photographs
   *  want 419, 141 and 177px of height:
   *
   *    shared SHAPE (the median)  the portrait is drawn 296 x 177,
   *                               a third of the picture it should be.
   *                               This is what the owner found in his
   *                               own feed on 2026-08-28.
   *    shared HEIGHT (the tallest) every photograph is full size, but the
   *                               16:9 sits in a 421px frame with 122px
   *                               of blurred bed above AND below it --
   *                               "yucky blur bars", his words, twice.
   *
   *  There is no third fixed height that avoids both, because 419 and
   *  141 are three to one. So the frame is not fixed. It is the height
   *  of whichever photograph you are looking at, interpolated across the
   *  swipe so the card breathes with your thumb instead of jumping when
   *  a slide lands.
   *
   *  The heights are ARITHMETIC, not measurement: `drawnSize` is the same
   *  pure function the layout tests assert against, given the one number
   *  a browser has to tell us -- how wide a slide is. Before that number
   *  exists (server render, first paint) the ghost below holds the first
   *  photograph's box open in plain CSS, so nothing jumps into place.
   * ---------------------------------------------------------------- */
  const heights = useRef<number[]>([]);
  const slideWidth = useRef(0);

  /** The frame's height at a fractional position along the track. */
  const heightAt = useCallback((where: number) => {
    const hs = heights.current;
    if (!hs.length) return null;
    const i = Math.max(0, Math.min(hs.length - 1, Math.floor(where)));
    const j = Math.min(hs.length - 1, i + 1);
    const t = Math.max(0, Math.min(1, where - i));
    return hs[i] + (hs[j] - hs[i]) * t;
  }, []);

  /* One read of the scroll offset, turned into two things: which photograph
     is showing (for the arrows and the labels) and where the indicator sits
     (a fraction, so it moves continuously rather than in steps). Written
     straight to the element's transform rather than to state -- this fires on
     every scroll frame, and a re-render per frame is how a carousel starts
     dropping them. */
  const readScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const span = el.scrollWidth - el.clientWidth;
    const progress = span > 0 ? el.scrollLeft / span : 0;
    /* Where the track actually is, in slides. Written straight to the frame
       rather than through state, for the same reason the indicator is: this
       fires on every scroll frame. */
    const h = heightAt(el.clientWidth > 0 ? el.scrollLeft / el.clientWidth : 0);
    if (h !== null && frame.current) frame.current.style.height = `${h}px`;
    if (rail.current) {
      const travel = progress * last * (DOT + DOT_GAP);
      rail.current.style.transform = `translate3d(${travel.toFixed(2)}px, 0, 0)`;
    }
    setAt((was) => {
      const now = Math.round(progress * last);
      return now === was ? was : now;
    });
  }, [last, heightAt]);

  const go = useCallback(
    (index: number) => {
      const el = track.current;
      if (!el) return;
      const to = Math.max(0, Math.min(last, index)) * el.clientWidth;
      const from = el.scrollLeft;
      if (Math.abs(to - from) < 1) return;

      /* Snapping and a scripted scroll pull in different directions -- the
         engine keeps trying to settle the track while we are mid-flight -- so
         it is off for the duration and back on the moment we land. */
      cancelAnimationFrame(tween.current);
      el.style.scrollSnapType = "none";
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / SLIDE_MS);
        el.scrollLeft = from + (to - from) * ease(t);
        if (t < 1) {
          tween.current = requestAnimationFrame(step);
        } else {
          el.style.scrollSnapType = "";
        }
      };
      tween.current = requestAnimationFrame(step);
    },
    [last]
  );

  /* One measurement, and it is the slide's width -- the single thing about a
     column the arithmetic cannot know. Everything else follows from the
     stored dimensions. Re-run on resize, because the column changes with the
     window and the sidebar appears at a breakpoint. */
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (!w || w === slideWidth.current) return;
      slideWidth.current = w;
      heights.current = frames.map((f) => drawnSize(f, w).height);
      readScroll();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    /* `frames` is rebuilt every render from props that do not change for the
       life of a card, so the shapes are keyed on the one thing that can:
       which photographs these are. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, readScroll]);

  useEffect(() => () => cancelAnimationFrame(tween.current), []);

  return (
    <div
      className={cn("group/carousel relative mx-auto", className)}
      /* The frame is as wide as the widest photograph in it may be drawn, and
         no wider -- so a set of three landscapes reaches the same edges a
         single landscape would, and a set of three portraits stays as narrow
         as a single portrait. Capped at the same 900px everything else is. */
      style={{ maxWidth: `min(100%, ${frameWidth}px)` }}
    >
    <div ref={frame} className="relative">
      {/* The ghost. It holds the FIRST photograph's box open in plain CSS --
          a max-width, an aspect-ratio and the ceiling, exactly what
          <PhotoFrame> puts on a photograph posted alone -- so the card has
          its right height on the server, before hydration and before any
          slide has been measured. From the first scroll frame onward the
          height above is explicit and this is inert. Same trick as
          <PhotoStream>'s trailing cell: a box that is only its own shape. */}
      <div
        aria-hidden
        className="pointer-events-none w-full"
        style={{
          maxWidth: frames[0]?.maxWidth,
          aspectRatio: frames[0]?.aspectRatio,
          maxHeight: frames[0]?.maxHeight,
        }}
      />
      <div
        ref={track}
        onScroll={readScroll}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${photos.length} photographs`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(at + 1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(at - 1);
          }
        }}
        tabIndex={0}
        className={cn(
          /* NO height of its own, and that is the mechanism. A flex line is as
             tall as the tallest item on it, and each slide is as tall as the
             photograph inside it wants to be, so the frame settles on the
             tallest photograph in the set with nothing computed and nothing
             measured. `items-stretch` then gives every other slide that same
             height to bed its photograph into. */
          "absolute inset-0 flex snap-x snap-mandatory items-stretch overflow-x-auto rounded-[var(--radius-md)]",
          /* The track scrolls sideways inside a page that scrolls down, so a
             horizontal overscroll must stop here rather than becoming the
             browser's back gesture. */
          "[overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        )}
      >
        {photos.map((p, i) => {
          const shape = frames[i];
          const promise = p.srcSet ? photoSizes(sizes, shape) : undefined;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onOpen(i)}
              onPointerEnter={onPreload}
              onFocus={onPreload}
              aria-label={`View photo ${i + 1} of ${photos.length} full screen`}
              /* `snap-always`: a flick moves one photograph, never three. */
              className="relative flex w-full flex-none snap-center snap-always items-center justify-center overflow-hidden border border-border bg-mist transition-opacity duration-150 active:opacity-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <PhotoBed src={p.src} srcSet={p.srcSet} sizes={promise} loading={i === 0 ? undefined : "lazy"} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                srcSet={p.srcSet}
                sizes={promise}
                alt=""
                /* The first is what the card is about; the rest are one swipe
                   away, so they wait until the reader is near them. */
                loading={i === 0 ? undefined : "lazy"}
                decoding="async"
                className="relative w-full object-cover"
                /* The single-photograph rule, unchanged and unshared: a
                   max-width, an aspect-ratio and the 500px ceiling, which is
                   exactly what <PhotoFrame> puts on a photograph posted
                   alone. `max-height: 100%` is only a guard for the moment
                   mid-swipe when the frame is between two heights; at rest
                   the frame IS this photograph's height, so it never binds
                   and nothing is ever bedded. */
                style={{
                  maxWidth: shape.maxWidth,
                  aspectRatio: shape.aspectRatio,
                  maxHeight: `min(100%, ${shape.maxHeight}px)`,
                  objectPosition: shape.objectPosition,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>

      {/* Arrows. Desktop only -- a touch screen has the gesture, and a control
          you cannot hover has no reason to be dimmed. They sit over the
          photograph rather than beside it, so the frame keeps the whole card. */}
      {[0, 1].map((side) => {
        const forward = side === 1;
        const disabled = forward ? at === last : at === 0;
        return (
          <button
            key={side}
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => go(forward ? at + 1 : at - 1)}
            disabled={disabled}
            className={cn(
              "absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full",
              "bg-paper/85 text-foreground shadow-[0_1px_6px_rgba(0,0,0,0.18)] backdrop-blur-sm",
              "transition-[opacity,transform] duration-200 ease-out",
              "hover:scale-[1.06] active:scale-[0.94]",
              "opacity-0 group-hover/carousel:opacity-100",
              disabled && "!opacity-0",
              forward ? "right-3" : "left-3",
              "[@media(pointer:fine)]:grid"
            )}
          >
            {forward ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
          </button>
        );
      })}

      {/* The rail. One dot per photograph, and a filled pill that rides the
          actual scroll offset -- so it travels with a thumb mid-swipe instead
          of snapping when the slide finally lands. */}
      <div className="mt-2 flex justify-center">
        <div className="relative flex items-center" style={{ gap: DOT_GAP }}>
          {photos.map((_, i) => (
            <span
              key={i}
              className="rounded-full bg-foreground/20"
              style={{ width: DOT, height: DOT }}
            />
          ))}
          <span
            ref={rail}
            aria-hidden
            className="pointer-events-none absolute left-0 rounded-full bg-canopy will-change-transform"
            style={{ width: DOT, height: DOT }}
          />
          <span className="sr-only" aria-live="polite">
            Photo {at + 1} of {photos.length}
          </span>
        </div>
      </div>
    </div>
  );
}
