"use client";

/* The letter page's photo stack, clickable into the shared full-screen
 * viewer (src/components/common/image-viewer.tsx). The letter's author and
 * date ride along so the viewer can say who posted what it is showing. */

import { useState } from "react";
import { ImageViewer } from "@/components/common/image-viewer";
import type { AvatarUser } from "@/components/common/bird-avatar";

export function LetterImages({
  images,
  author,
  date,
}: {
  images: string[];
  author: AvatarUser & { name: string };
  date: string;
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (images.length === 0) return null;

  return (
    <>
      <div className="mt-8 space-y-4">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenAt(i)}
            aria-label={`View photo ${i + 1} of ${images.length} full screen`}
            className="block w-full overflow-hidden rounded-xl border border-border transition-opacity duration-150 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" loading="lazy" className="w-full object-cover" />
          </button>
        ))}
      </div>

      <ImageViewer
        images={images.map((src) => ({ src, author, date }))}
        initialIndex={openAt ?? 0}
        open={openAt !== null}
        onClose={() => setOpenAt(null)}
      />
    </>
  );
}
