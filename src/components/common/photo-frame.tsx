/* ------------------------------------------------------------------ *
 *  <PhotoFrame> - one photograph, laid out by the one rule.
 *
 *  The feed, a Catch-up answer and a letter all draw a single photograph
 *  in a column, and until now all three did it differently: a fixed 384px
 *  guillotine, a 21:9 letterbox, and no bound at all. The first two are
 *  why a portrait of a group of friends came out as a row of shoulders.
 *  The rule they now share is in src/lib/photo-layout.ts, argued there.
 *
 *  Everything here is CSS the browser resolves by itself -- a max-width,
 *  an aspect-ratio, an object-position -- so nothing has to measure a
 *  column, and the space is reserved before the bytes arrive. That is the
 *  other half of the fix: the feed used to jump as each photograph landed
 *  (bugs.md #18) because nothing knew how tall the gap should be.
 *
 *  Not a client component and no hooks, so a server page can render it
 *  directly and a client card can wrap it in a button.
 * ------------------------------------------------------------------ */

import { framePhoto, photoSizes, type StoredPhoto } from "@/lib/photo-layout";
import { cn } from "@/lib/utils";

/**
 * What fills a card either side of, or above and below, a photograph that
 * does not span its frame.
 *
 * The owner reversed himself on blur and was right both times. As the whole
 * rule it squashes every photo into one landscape box and is "a cop out"; as
 * the filler beside a photo already shown at a proper size it is simply a
 * better background than a flat colour. The filter is the one he approved in
 * /lab/crop, to the number.
 *
 * THE PHOTOGRAPH ITSELF, not the 16px smear stored beside it. The first
 * version used the smear on the theory that a 26px blur destroys the
 * difference. It does not: `object-cover` stretches a 16px source across
 * 350px of card, so every source pixel becomes a 20px block and the blur
 * smears those into streaks. The owner, looking at his own feed: "very
 * distracting and not smooth and just yucky blur bars." He was right. Same
 * `src` and `sizes` as the photograph in front of it, so the browser resolves
 * the same URL and this costs no second download.
 *
 * Always rendered, even on a phone where a photograph often spans its column
 * and the bed cannot be seen. Hiding it below a 456px viewport was tried, to
 * save a phone a blurred full-size layer per card, and it broke something
 * worse than it saved: a `display: none` image with `loading="lazy"` never
 * loads, so `img.complete` stays false forever and anything waiting on
 * `document.images` waits for good -- which is what `e2e/visual.spec.ts`'s
 * settle() does, and it hung on it. The saving was never measured; this cost
 * was real within a minute.
 */
export function PhotoBed({
  src,
  srcSet,
  sizes,
  loading,
}: {
  src: string;
  srcSet?: string;
  sizes?: string;
  loading?: "lazy";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt=""
      aria-hidden
      loading={loading}
      decoding="async"
      className="pointer-events-none absolute inset-0 h-full w-full scale-[1.12] object-cover blur-[26px] brightness-[0.68] saturate-[1.1]"
    />
  );
}

export function PhotoFrame({
  src,
  srcSet,
  photo,
  sizes,
  alt = "",
  className,
  fallbackClassName,
  eager = false,
}: {
  /** The url to actually fetch, and how this component stays out of a decision
   *  that is not its own.
   *
   *  It used to call `photoSrc()` itself, which quietly put Catch-up
   *  photographs -- served straight off R2 since the day they shipped --
   *  through Vercel's image optimiser. A transform nobody has asked for before
   *  takes about 880ms against 260ms for the same bytes from the bucket's own
   *  edge, so every photograph in a Round made the reader wait on it. Measured
   *  2026-08-27 after the owner reported exactly that. Whether a surface wants
   *  the optimiser is the surface's call; see image-cdn.ts, and spec §4 for
   *  where all of this is meant to end up (precomputed derivatives on R2, no
   *  optimiser anywhere). */
  src: string;
  /** The rungs, when the surface has any. Absent means one file, as-is. */
  srcSet?: string;
  /** What we know about it, or null when we know nothing -- an image that
   *  predates the `Image` table and has not been backfilled, or one whose
   *  measurement failed. Null is a supported state, not an error. */
  photo: StoredPhoto | null;
  /** The surface's own `sizes` promise, from image-cdn.ts. The rule's width
   *  cap is folded into it here rather than at the call site. */
  sizes: string;
  alt?: string;
  /** Extra classes for the stage: the border and radius belong to the
   *  surface, because a photograph sitting on a blurred bed must not carry a
   *  light background or a hairline of its own -- either shows down its edge
   *  as a pale outline over the blur, which is what the owner spotted on
   *  2026-08-27. */
  className?: string;
  /** What to draw when we know nothing about the photograph: the height
   *  clamp that surface used before this rule existed. Passing today's class
   *  keeps an unmeasured image looking exactly as it did. */
  fallbackClassName?: string;
  /** Skip lazy loading. For a photograph that is the reason the page exists. */
  eager?: boolean;
}) {
  const loading = eager ? undefined : ("lazy" as const);

  /* Nothing known: exactly what shipped before, including its old height
     clamp. No bed, no reserved space, no aiming -- guessing a shape here
     would move every card that has not been measured yet. */
  if (!photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={loading}
        decoding="async"
        className={cn("w-full object-cover", fallbackClassName, className)}
      />
    );
  }

  const frame = framePhoto(photo);

  return (
    <div className={cn("relative flex justify-center overflow-hidden bg-mist", className)}>
      <PhotoBed src={src} srcSet={srcSet} sizes={srcSet ? photoSizes(sizes, frame) : undefined} loading={loading} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? photoSizes(sizes, frame) : undefined}
        alt={alt}
        loading={loading}
        decoding="async"
        width={photo.width}
        height={photo.height}
        /* `h-auto` explicitly, not on the strength of Tailwind's preflight:
           an <img>'s width and height ATTRIBUTES are presentational hints, so
           without it a 1080x1920 photograph would try to be 1920px tall and
           the aspect-ratio beside it would never get a say. */
        className="relative h-auto w-full object-cover"
        style={{
          maxWidth: frame.maxWidth,
          /* The ceiling, and the reason a landscape stops having blurred bars
             down its sides: it is allowed to fill the column and lose up to
             20% off its top and bottom instead of being narrowed to fit under
             500px. See CROP_BUDGET. */
          maxHeight: frame.maxHeight,
          aspectRatio: frame.aspectRatio,
          objectPosition: frame.objectPosition,
        }}
      />
    </div>
  );
}
