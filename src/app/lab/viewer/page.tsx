"use client";

/* ------------------------------------------------------------------ *
 *  Delight room: the image viewer.
 *
 *  Exercises `src/components/common/image-viewer.tsx` (the REAL shared
 *  module, not a copy) against the Collection's own photographs, with
 *  every state reachable: a photograph that fills the screen, a long
 *  caption that has more behind it, the buckets and the Where line, the
 *  heart, an uploader's delete, a multi-photograph set with its counter,
 *  and a single one with no caption at all.
 *
 *  It matters that this is the real component: there are two approved
 *  photographs in the database, so /collection cannot show what a
 *  viewer full of real records looks like (handover F26).
 * ------------------------------------------------------------------ */

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { ImageViewer, type ViewerImage } from "@/components/common/image-viewer";

const AUTHOR = { id: "preview-uploader", name: "Sanan Shankar" };

/* One photograph as the Collection hands it over: the caption runs past two
   lines, it knows where it was taken and what it is filed under, and the
   member looking at it is the one who put it there. */
const ARCHIVE: ViewerImage[] = [
  {
    src: "/images/collection/v1.webp",
    caption:
      "The path down from the senior school block, the morning after the first monsoon rain. Half the batch was late to assembly because of this exact view, and nobody who was there has ever agreed about who stopped first.",
    author: AUTHOR,
    date: "May 1978",
    where: "Senior School",
    tags: ["Campus", "Weather & Sky", "monsoon"],
    href: "/collection/preview",
    loved: false,
    loveCount: 12,
    canRemove: true,
    removeLabel: "Delete this photo",
  },
  {
    src: "/images/collection/c1.webp",
    caption: "The banyan by the dining hall. No notice board has ever explained the silence under it.",
    author: AUTHOR,
    date: "the 1970s",
    where: "Whole Campus",
    tags: ["The Banyan", "Flora"],
    href: "/collection/preview-2",
    loved: true,
    loveCount: 41,
  },
  {
    // No caption, no date, nothing filed: the bottom row is a byline and a
    // heart, and there is nothing to press open.
    src: "/images/collection/v3.webp",
    author: AUTHOR,
    date: null,
    href: "/collection/preview-3",
    loved: false,
    loveCount: 0,
  },
];

/* A post's photographs. A real count, so the counter stays. */
const POST: ViewerImage[] = [
  {
    src: "/images/collection/v2.webp",
    caption: "Founder's Day, seen from the back row where all the best commentary happens.",
    author: AUTHOR,
    date: "3 Apr 2026",
  },
  { src: "/images/collection/c4.webp", author: AUTHOR, date: "3 Apr 2026" },
  { src: "/images/collection/c2.webp", author: AUTHOR, date: "3 Apr 2026" },
];

const THUMBS = [
  "/images/collection/v1-thumb.webp",
  "/images/collection/c1-thumb.webp",
  "/images/collection/v3-thumb.webp",
];
const POST_THUMBS = [
  "/images/collection/v2-thumb.webp",
  "/images/collection/c4-thumb.webp",
  "/images/collection/c2-thumb.webp",
];

function Thumb({ src, alt, onClick }: { src: string; alt: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-[var(--radius-md)] border border-border bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <img
        src={src}
        alt={alt}
        className="aspect-[4/3] w-full object-cover transition-opacity duration-150 group-hover:opacity-90"
      />
    </button>
  );
}

export default function ViewerRoom() {
  const [archiveAt, setArchiveAt] = useState<number | null>(null);
  const [postAt, setPostAt] = useState<number | null>(null);
  const [loves, setLoves] = useState(ARCHIVE.map((i) => Boolean(i.loved)));

  const archive = ARCHIVE.map((image, i) => ({
    ...image,
    loved: loves[i],
    loveCount: (image.loveCount ?? 0) + (loves[i] === Boolean(image.loved) ? 0 : loves[i] ? 1 : -1),
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-[var(--z-elevated)] flex items-center gap-4 border-b border-border px-6 py-3">
        <Link
          href="/lab"
          className="state-layer inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <PeaksMark size={16} />
          Lab
        </Link>
        <h1 className="font-heading text-[17px] font-bold tracking-tight">
          The photograph owns the screen
        </h1>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-[15px] leading-[1.7] text-muted-foreground">
          Open one. The photograph reaches two edges of the glass, the controls float on top of
          it, and after a couple of seconds of stillness they leave. Move the mouse and they come
          back. Press the photograph to put them away for good, and press it again to bring them
          back.
        </p>

        <h2 className="mt-9 font-heading text-[19px] font-bold tracking-tight">
          A photograph from the Collection
        </h2>
        <p className="mt-2 text-[14px] leading-[1.65] text-muted-foreground">
          Press the words to read the rest of them. That press also shows where it was taken and
          what it is filed under, which is everything the old separate page held. Press again to
          put it back. No counter here: the archive has no second of two. The third photograph
          has no caption and nothing filed, so there is nothing to open.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {THUMBS.map((thumb, i) => (
            <Thumb
              key={thumb}
              src={thumb}
              alt={ARCHIVE[i].caption ?? "A photograph of the valley"}
              onClick={() => setArchiveAt(i)}
            />
          ))}
        </div>

        <h2 className="mt-12 font-heading text-[19px] font-bold tracking-tight">
          Three photographs in one post
        </h2>
        <p className="mt-2 text-[14px] leading-[1.65] text-muted-foreground">
          Here the counter stays, because three is a number you can hold. Arrow keys or the edge
          buttons move one frame. On a phone you drag. The step is a cross dissolve with no
          slide and no scale.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {POST_THUMBS.map((thumb, i) => (
            <Thumb key={thumb} src={thumb} alt="A photograph from a post" onClick={() => setPostAt(i)} />
          ))}
        </div>
      </main>

      <ImageViewer
        images={archive}
        initialIndex={archiveAt ?? 0}
        open={archiveAt !== null}
        onClose={() => setArchiveAt(null)}
        showCount={false}
        onToggleLove={(i) => setLoves((prev) => prev.map((v, n) => (n === i ? !v : v)))}
        onRemove={() => toast.success("The real one asks first, then deletes the file too.")}
      />
      <ImageViewer
        images={POST}
        initialIndex={postAt ?? 0}
        open={postAt !== null}
        onClose={() => setPostAt(null)}
      />
    </div>
  );
}
