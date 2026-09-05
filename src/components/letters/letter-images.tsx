"use client";

/* The letter page's photo stack, clickable into the shared full-screen
 * viewer (src/components/common/image-viewer.tsx). The letter's author and
 * date ride along so the viewer can say who posted what it is showing. */

import { photoSrc, photoSrcSet, PHOTO_SIZES_LETTER } from "@/lib/image-cdn";
import { PhotoFrame } from "@/components/common/photo-frame";
import type { StoredPhoto } from "@/lib/photo-layout";
import type { AvatarUser } from "@/components/common/bird-avatar";
import { LazyImageViewer, useImageViewer } from "@/components/common/lazy-image-viewer";
import { PhotoOpener } from "@/components/common/photo-opener";

export function LetterImages({
  images,
  photos,
  author,
  date,
}: {
  images: string[];
  /** What each photograph looks like, in the same order. A null entry is one
   *  we have never measured; it draws the way it always did. */
  photos?: (StoredPhoto | null)[];
  author: AvatarUser & { name: string };
  date: string;
}) {
  const viewer = useImageViewer();
  if (images.length === 0) return null;

  return (
    <>
      <div className="mt-8 space-y-4">
        {images.map((img, i) => (
          <PhotoOpener key={i} index={i} count={images.length} onOpen={viewer.open}>
            {/* The same rule the feed and the Catch-ups use: true shape when
                the photograph is square or wider, 3:4 on a bed of itself when
                it is taller, capped at 900px. Letters were never the surface
                that cut faces off -- an unbounded object-cover crops nothing --
                but they did jump as each photograph loaded, and a 1216px-wide
                reader stretched a phone photo soft. */}
            <PhotoFrame
              src={photoSrc(img)}
              srcSet={photoSrcSet(img)}
              photo={photos?.[i] ?? null}
              sizes={PHOTO_SIZES_LETTER}
            />
          </PhotoOpener>
        ))}
      </div>

      {viewer.mounted && (
        <LazyImageViewer
          images={images.map((src) => ({ src, author, date }))}
          initialIndex={viewer.at ?? 0}
          open={viewer.at !== null}
          onClose={viewer.close}
        />
      )}
    </>
  );
}
