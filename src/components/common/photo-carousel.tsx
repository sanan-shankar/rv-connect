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
 *  4. THE FRAME NEVER MOVES. One box for the set, decided before you
 *     touch it and never touched again -- which is what every other
 *     carousel does, and what the three rules before this one each
 *     failed at differently. It is CSS, not a measured pixel, so it is
 *     right on the server and right at every width. The arithmetic and
 *     the three failures are in `CAROUSEL_BOX_CAP`.
 *
 *  Everything animated is a transform, and nothing at all is written to
 *  the layout while a finger is down. The frame's shape is known before
 *  any photograph loads, so nothing jumps.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { CarouselArrow } from "@/components/common/carousel-arrow";
import { PhotoBed } from "@/components/common/photo-frame";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import {
  carouselHeightCss,
  carouselWidth,
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

/** The rail's geometry, in px, in one place: the dot and the space beside it.
 *  The indicator's travel is a multiple of the two, so a Tailwind class and a
 *  number in a transform must not be allowed to drift apart. */
const DOT = 6;
const DOT_GAP = 6;

/** What a photograph nobody has measured is treated as, for its `sizes`
 *  promise only: an ordinary camera landscape. It is drawn filling the frame
 *  regardless, so this decides nothing about layout. */
const NEUTRAL: PhotoFacts = { width: 3, height: 2, focalX: 0.5, focalY: 0.5 };

export function PhotoCarousel({
  photos,
  sizes,
  onOpen,
  onPreload,
  className,
  bleed = false,
  dotsFloatTop,
}: {
  photos: CarouselPhoto[];
  /** The surface's `sizes` for its column. Each slide is the full column. */
  sizes: string;
  /** Open the shared viewer at this photograph. */
  onOpen: (index: number) => void;
  onPreload: () => void;
  className?: string;
  /** The carousel runs to the edges of the card it sits in, so it drops the
   *  radius and the side borders it would otherwise draw against nothing.
   *  The card clips the corners instead. */
  bleed?: boolean;
  /** Draw the dots OUT OF FLOW, this many pixels below the frame, so they
   *  take no vertical space and can share a row the caller draws itself.
   *
   *  Owner, 2026-09-07: "the heart icon and comment etc are pushed down
   *  because of the carousel. Make sure it's never pushed down. The
   *  carousel navigation doesn't even interfere with the icons because
   *  they're at the sides and it is at the middle. So just let those icons
   *  be where they were going to be anyway."
   *
   *  The number is the caller's, because only the caller knows how tall
   *  the row is that the dots have to sit in the middle of. */
  dotsFloatTop?: number;
}) {
  /* One frame per photograph, each the frame that photograph would have been
     given had it been posted on its own. An unmeasured one -- predating the
     `Image` table, or whose measurement failed -- has no shape to contribute,
     so it is treated as an ordinary camera landscape and simply fills
     whatever height the others settle on. */
  const frames = photos.map((p) => framePhoto(p.photo ?? NEUTRAL));
  const frameWidth = carouselWidth(frames);
  /* The set's one height, as an expression the browser resolves against its
     own width. Nothing here measures anything. */
  const frameHeight = carouselHeightCss(frames);

  const track = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLSpanElement>(null);
  const tween = useRef(0);
  const [at, setAt] = useState(0);
  const last = photos.length - 1;

  /* One read of the scroll offset, turned into two things: which photograph
     is showing (for the arrows and the labels) and where the indicator sits
     (a fraction, so it moves continuously rather than in steps). Written
     straight to the element's transform rather than to state -- this fires on
     every scroll frame, and a re-render per frame is how a carousel starts
     dropping them.

     What it deliberately does NOT do any more is touch the layout. It used to
     write an interpolated height to the frame here, which is both why the card
     changed size mid-swipe and, on iOS, why the swipe itself broke: rewriting
     a scroll-snap container's height during a gesture makes the engine re-run
     snap selection mid-flight, and the flick runs on to the last photograph.
     A transform on the indicator is all that is left. */
  const readScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const span = el.scrollWidth - el.clientWidth;
    const progress = span > 0 ? el.scrollLeft / span : 0;
    if (rail.current) {
      const travel = progress * last * (DOT + DOT_GAP);
      rail.current.style.transform = `translate3d(${travel.toFixed(2)}px, 0, 0)`;
    }
    setAt((was) => {
      const now = Math.round(progress * last);
      return now === was ? was : now;
    });
  }, [last]);

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

  useEffect(() => () => cancelAnimationFrame(tween.current), []);

  return (
    <div
      className={cn("group/carousel relative mx-auto", className)}
      /* The frame is as wide as the widest photograph in it may be drawn, and
         no wider -- so a set of three landscapes reaches the same edges a
         single landscape would, and a set of three portraits stays as narrow
         as a single portrait. Capped at the same 900px everything else is.

         And it is the CONTAINER, which is what lets the height below be CSS:
         `100cqw` inside here is exactly this width, so the box resolves
         itself at every column without anyone measuring a slide. */
      style={{ maxWidth: `min(100%, ${frameWidth}px)`, containerType: "inline-size" }}
    >
      <div
        ref={track}
        onScroll={readScroll}
        /* The set's one height, fixed for the life of the card. Nothing may
           change it while a finger is down -- that is the whole rule. */
        style={{ height: frameHeight }}
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
          /* `items-stretch` gives every slide the box's full height, which is
             what each photograph is then bedded into or trimmed by. */
          "flex snap-x snap-mandatory items-stretch overflow-x-auto",
          bleed ? "rounded-none" : "rounded-[var(--radius-md)]",
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
              className={cn(
                "relative flex w-full flex-none snap-center snap-always items-center justify-center overflow-hidden border border-border bg-mist transition-opacity duration-150 active:opacity-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                bleed && "border-x-0"
              )}
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

      {/* Arrows. Desktop only -- a touch screen has the gesture, and a control
          you cannot hover has no reason to be dimmed. They sit over the
          photograph rather than beside it, so the frame keeps the whole card. */}
      {[0, 1].map((side) => {
        const forward = side === 1;
        const disabled = forward ? at === last : at === 0;
        return (
          <CarouselArrow
            key={side}
            forward={forward}
            decorative
            onPress={() => go(forward ? at + 1 : at - 1)}
            disabled={disabled}
            className={cn(
              /* `hidden` plus the pointer-fine `grid` is what keeps these off
                 a touch screen, and it has to beat <CarouselArrow>'s own
                 `grid` -- hence the media query, which is more specific. */
              "absolute top-1/2 hidden -translate-y-1/2",
              "opacity-0 group-hover/carousel:opacity-100",
              disabled && "!opacity-0",
              forward ? "right-3" : "left-3",
              "[@media(pointer:fine)]:grid"
            )}
          />
        );
      })}

      {/* The rail. One dot per photograph, and a filled pill that rides the
          actual scroll offset -- so it travels with a thumb mid-swipe instead
          of snapping when the slide finally lands. */}
      <div
        className={cn(
          "flex justify-center",
          dotsFloatTop === undefined
            ? "mt-2"
            : /* Out of flow entirely: the row below rises to meet the
                 photograph and the dots come down into the middle of it.
                 They are an indicator and nothing presses them, so they
                 never take the press meant for a button underneath. */
              "pointer-events-none absolute inset-x-0 top-full"
        )}
        style={dotsFloatTop === undefined ? undefined : { paddingTop: dotsFloatTop }}
      >
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
