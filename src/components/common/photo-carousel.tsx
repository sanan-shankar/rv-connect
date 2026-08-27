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
 *  All three photographs share ONE shape, chosen as the median of the
 *  set (`carouselBox`), because the alternative is a card that changes
 *  height under the reader's thumb. Each photograph fills it if it can
 *  do so within the 20% crop budget and sits on its own blurred bed if
 *  it cannot -- so the shape most of them already are is the shape they
 *  are all drawn in, and the odd one out is the only one bedded.
 *
 *  Everything animated is a transform. The frame's shape is known before
 *  any photograph loads, so nothing jumps.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { PhotoBed } from "@/components/common/photo-frame";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import {
  carouselBox,
  drawnRatio,
  framePhoto,
  placeInBox,
  PHOTO_MAX_HEIGHT,
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
  /* An unmeasured photograph -- one that predates the `Image` table, or whose
     measurement failed -- has no shape to contribute and no shape to be
     placed in, so it simply fills the frame the others agreed on. */
  const known = photos.map((p) => p.photo).filter(Boolean) as StoredPhoto[];
  const box = carouselBox(
    known.length ? known.map((p) => drawnRatio(framePhoto(p))) : [3 / 2]
  );

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
     dropping them. */
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
    <div className={cn("group/carousel relative", className)}>
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
        style={{
          aspectRatio: box,
          /* Capped the way a single photograph is capped, and by the same
             arithmetic: a height ceiling reaches CSS as the width that
             produces it. At the widest shape a carousel may take, 1.8:1, that
             is exactly the 900px a photograph stops at. */
          maxWidth: `min(100%, ${Math.round(PHOTO_MAX_HEIGHT * box)}px)`,
        }}
        className={cn(
          "mx-auto flex snap-x snap-mandatory items-stretch overflow-x-auto rounded-[var(--radius-md)]",
          /* The track scrolls sideways inside a page that scrolls down, so a
             horizontal overscroll must stop here rather than becoming the
             browser's back gesture. */
          "[overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        )}
      >
        {photos.map((p, i) => {
          const placed = p.photo ? placeInBox(p.photo, box) : null;
          const promise = p.srcSet
            ? photoSizes(sizes, framePhoto(p.photo ?? NEUTRAL))
            : undefined;
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
                className="relative object-cover"
                style={
                  placed
                    ? {
                        width: placed.width,
                        height: placed.height,
                        objectPosition: placed.objectPosition,
                      }
                    : { width: "100%", height: "100%" }
                }
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
