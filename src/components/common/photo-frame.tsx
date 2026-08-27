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

import { photoSrc, photoSrcSet } from "@/lib/image-cdn";
import { framePhoto, photoSizes, type StoredPhoto } from "@/lib/photo-layout";
import { cn } from "@/lib/utils";

export function PhotoFrame({
  src,
  photo,
  sizes,
  alt = "",
  className,
  fallbackClassName,
  eager = false,
}: {
  /** The stored image url. */
  src: string;
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
        src={photoSrc(src)}
        srcSet={photoSrcSet(src)}
        sizes={sizes}
        alt={alt}
        loading={loading}
        className={cn("w-full object-cover", fallbackClassName, className)}
      />
    );
  }

  const frame = framePhoto(photo);

  return (
    <div className={cn("relative flex justify-center overflow-hidden bg-mist", className)}>
      {/* The bed, and the placeholder, and the same object either way.
          It is the 16px smear stored with the image (about 140 bytes), blown
          up and blurred: it holds the space with something photograph-shaped
          while the real file arrives, and it is what fills the card beside a
          photograph too tall or too large to span its column.

          The owner reversed himself on blur and was right both times. As the
          whole rule it squashes every photo into one landscape box and is "a
          cop out"; as the filler beside a photo already shown at a proper
          size it is simply a better background than a flat colour. The filter
          is the one he approved in /lab/crop, to the number. */}
      {photo.blurDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.blurDataUrl}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-[1.12] object-cover blur-[26px] brightness-[0.68] saturate-[1.1]"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoSrc(src)}
        srcSet={photoSrcSet(src)}
        sizes={photoSizes(sizes, frame)}
        alt={alt}
        loading={loading}
        width={photo.width}
        height={photo.height}
        /* `h-auto` explicitly, not on the strength of Tailwind's preflight:
           an <img>'s width and height ATTRIBUTES are presentational hints, so
           without it a 1080x1920 photograph would try to be 1920px tall and
           the aspect-ratio beside it would never get a say. */
        className="relative h-auto w-full object-cover"
        style={{
          maxWidth: frame.maxWidth,
          aspectRatio: frame.aspectRatio,
          objectPosition: frame.objectPosition,
        }}
      />
    </div>
  );
}
