"use client";

/* ------------------------------------------------------------------ *
 *  <AnswerPhotos> - the photographs on one Catch-up answer, and the
 *  press that opens them.
 *
 *  The owner, reading his own Round: "to make matters worse you can't
 *  click on the images to expand them" (brief #36), against his own
 *  standard for every photograph in the app: "every image is clickable.
 *  And you can open it and see it in our image viewer" (#41). Catch-ups
 *  were the last surface where that was not true. The carousel already
 *  had the seam and it was wired to an empty function.
 *
 *  Which is why this is a client component while the card around it
 *  stays on the server: the viewer needs state, and nothing else on an
 *  answer does.
 *
 *  The layout rules themselves are unchanged and are not restated here
 *  -- one photograph is <PhotoFrame>, two are justified rows, more than
 *  two are a carousel, all of it from src/lib/photo-layout.ts.
 * ------------------------------------------------------------------ */

import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows } from "@/components/common/photo-rows";
import { PhotoCarousel } from "@/components/common/photo-carousel";
import { PHOTO_SIZES_CENTERED_FULL } from "@/lib/image-cdn";
import type { StoredPhoto } from "@/lib/photo-layout";
import type { CatchupPersonRef } from "@/lib/catchups-types";
import { cn, formatDisplayDate } from "@/lib/utils";
import {
  LazyImageViewer,
  preloadImageViewer,
  useImageViewer,
} from "@/components/common/lazy-image-viewer";


/** One photograph, as a press that opens the viewer at it. */
function Opener({
  index,
  count,
  onOpen,
  className,
  children,
}: {
  index: number;
  count: number;
  onOpen: (index: number) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      onPointerEnter={preloadImageViewer}
      onFocus={preloadImageViewer}
      aria-label={
        count > 1
          ? `View photo ${index + 1} of ${count} full screen`
          : "View this photo full screen"
      }
      className={cn(
        "block w-full overflow-hidden rounded-[var(--radius-md)] transition-opacity duration-150 hover:opacity-95 active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      {children}
    </button>
  );
}

export function AnswerPhotos({
  images,
  photos,
  author,
  body,
  createdAt,
}: {
  images: string[];
  photos: (StoredPhoto | null)[];
  author: CatchupPersonRef;
  body: string | null;
  createdAt: Date | string;
}) {
  const viewer = useImageViewer();

  const viewerImages = images.map((src) => ({
    src,
    author,
    date: formatDisplayDate(createdAt),
    caption: body,
  }));

  /* A lone photograph used to be a "near-full-bleed hero": aspect-[16/10] on a
     phone, aspect-[21/9] above it, object-cover, centred. Which is to say a
     portrait of four friends was cut down to a letterbox of their shoulders --
     the owner, watching his own Catch-up: "all of their faces are cropped out
     and you can't see them... sometimes the catch up just shows a bunch of
     shoulders. Like, why?" It now gets the same rule as the feed and letters:
     true shape if it is square or wider, 3:4 on a bed of itself if it is
     taller, nothing cut off the sides of a face. */
  let content: React.ReactNode;
  if (images.length === 1) {
    content = (
      <Opener index={0} count={1} onOpen={viewer.open} className="mt-[var(--space-s)] border border-border">
        {/* The bucket's own url, not an optimiser transform. A Catch-up is a
            newsletter: everyone opens the same Round within a day of each
            other, so a cold transform is not amortised across viewers the way
            a feed photo's is -- it is paid by nearly all of them at once. */}
        <PhotoFrame
          src={images[0]}
          photo={photos[0] ?? null}
          sizes={PHOTO_SIZES_CENTERED_FULL}
          fallbackClassName="aspect-[16/10] sm:aspect-[21/9]"
        />
      </Opener>
    );
  } else if (images.length > 2) {
    /* More than two: a carousel, the same rule the feed uses. Only legacy rows
       reach any of this -- the answer form has taken one photograph per answer
       since it shipped (`PhotoAttachments max={1}`). */
    content = (
      <PhotoCarousel
        className="mt-[var(--space-s)]"
        photos={images.map((src, i) => ({ src, photo: photos[i] ?? null }))}
        sizes={PHOTO_SIZES_CENTERED_FULL}
        onOpen={viewer.open}
        onPreload={preloadImageViewer}
      />
    );
  } else {
    /* Exactly two: justified rows, each at its true shape. They used to tile
       into squares, which is the same guillotine the lone hero applied, just
       twice at once. A pair that has not been measured keeps the squares rather
       than half a layout. */
    const shapes = photos.length === images.length && photos.every(Boolean) ? photos : null;
    content = shapes ? (
      <PhotoRows photos={shapes as StoredPhoto[]} className="mt-[var(--space-s)]">
        {(photo, i, cell) => (
          <Opener index={i} count={images.length} onOpen={viewer.open} className="h-full border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[i]}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              style={{
                aspectRatio: cell.aspectRatio,
                objectPosition: cell.objectPosition,
                maxHeight: cell.maxHeight,
              }}
            />
          </Opener>
        )}
      </PhotoRows>
    ) : (
      <div className="mt-[var(--space-s)] grid grid-cols-2 gap-2">
        {images.map((src, i) => (
          <Opener key={i} index={i} count={images.length} onOpen={viewer.open} className="border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
          </Opener>
        ))}
      </div>
    );
  }

  return (
    <>
      {content}
      {viewer.mounted && (
        <LazyImageViewer
          images={viewerImages}
          initialIndex={viewer.at ?? 0}
          open={viewer.at !== null}
          onClose={viewer.close}
        />
      )}
    </>
  );
}
