"use client";

/* The letter page's photo stack, clickable into the shared full-screen
 * viewer (src/components/common/image-viewer.tsx). The letter's author and
 * date ride along so the viewer can say who posted what it is showing. */

import { useState } from "react";
import dynamic from "next/dynamic";
import { photoSrc, photoSrcSet, PHOTO_SIZES_LETTER } from "@/lib/image-cdn";
import { PhotoFrame } from "@/components/common/photo-frame";
import type { StoredPhoto } from "@/lib/photo-layout";
import type { AvatarUser } from "@/components/common/bird-avatar";

/* The viewer opens on a press and is 444 lines carrying the app's only drag
   gesture, so a letter that is never tapped into never fetches it. Mounted from
   the first press onward rather than gated on `openAt`, so its close animation
   still has something to play out of. */
const ImageViewer = dynamic(
  () => import("@/components/common/image-viewer").then((m) => m.ImageViewer),
  { ssr: false }
);

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
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  if (images.length === 0) return null;

  return (
    <>
      <div className="mt-8 space-y-4">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setMounted(true);
              setOpenAt(i);
            }}
            onPointerEnter={() => void import("@/components/common/image-viewer")}
            aria-label={`View photo ${i + 1} of ${images.length} full screen`}
            className="block w-full overflow-hidden rounded-[var(--radius-md)] border border-border transition-opacity duration-150 hover:opacity-95 active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
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
          </button>
        ))}
      </div>

      {mounted && (
        <ImageViewer
          images={images.map((src) => ({ src, author, date }))}
          initialIndex={openAt ?? 0}
          open={openAt !== null}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}
