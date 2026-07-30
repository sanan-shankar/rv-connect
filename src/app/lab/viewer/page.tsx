"use client";

/* ------------------------------------------------------------------ *
 *  Delight room: the image viewer.
 *
 *  Exercises `src/components/common/image-viewer.tsx` (the REAL shared
 *  module, not a copy) against the Collection's own photographs, with
 *  every state reachable: multi-image navigation and its dissolve,
 *  captions folded and unfolded, an author chip, a caption-less image,
 *  a single-image set (no counter, no arrows), keyboard and drag input.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import Link from "next/link";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { ImageViewer, type ViewerImage } from "@/components/common/image-viewer";

const AUTHOR = { id: "preview-uploader", name: "Sanan Shankar" };

const GALLERY: ViewerImage[] = [
  {
    src: "/images/collection/v1.webp",
    caption:
      "The path down from the senior school block, the morning after the first monsoon rain. Half the batch was late to assembly because of this exact view.",
    author: AUTHOR,
    date: "22 May 2026",
  },
  {
    src: "/images/collection/v2.webp",
    caption: "Founder's Day, seen from the back row where all the best commentary happens.",
    author: AUTHOR,
    date: "3 Apr 2026",
  },
  {
    // Deliberately caption-less: the Caption affordance must not render.
    src: "/images/collection/v3.webp",
    author: AUTHOR,
    date: "19 Mar 2026",
  },
  {
    src: "/images/collection/c1.webp",
    caption: "The banyan by the dining hall. No notice board has ever explained the silence under it.",
    author: AUTHOR,
    date: "2 Feb 2026",
  },
  {
    src: "/images/collection/c4.webp",
    caption: "Nature Walk, ten minutes after it was supposed to have left.",
    author: AUTHOR,
    date: "11 Jan 2026",
  },
];

const THUMBS = [
  "/images/collection/v1-thumb.webp",
  "/images/collection/v2-thumb.webp",
  "/images/collection/v3-thumb.webp",
  "/images/collection/c1-thumb.webp",
  "/images/collection/c4-thumb.webp",
];

export default function ViewerRoom() {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [singleOpen, setSingleOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-[var(--z-elevated)] flex items-center gap-4 border-b border-border px-6 py-3">
        <Link
          href="/lab"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors duration-150 hover:bg-mist hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
        >
          <PeaksMark size={16} />
          Lab
        </Link>
        <h1 className="font-heading text-[17px] font-bold tracking-tight">The image viewer</h1>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-[15px] leading-[1.7] text-muted-foreground">
          The shared viewer, live. Click any photo. Then: arrow keys or the edge buttons advance
          the film one frame (the incoming photo drifts in from the side you are heading toward,
          the outgoing slips the other way and fades first; no scale, so nothing zooms or
          bounces), dragging the photo steps on touch, a tap on the photo puts the chrome
          away, Caption turns the bottom of the screen up, the arrow-out button appears only when
          a photo has its own page, and Esc or the backdrop closes. The third photo has no
          caption, so the Caption affordance is absent there.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THUMBS.map((thumb, i) => (
            <button
              key={thumb}
              type="button"
              onClick={() => setOpenAt(i)}
              className="group overflow-hidden rounded-[var(--radius-md)] border border-border bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt={GALLERY[i].caption ?? "Collection photograph"}
                className="aspect-[4/3] w-full object-cover transition-opacity duration-150 group-hover:opacity-90"
              />
            </button>
          ))}
        </div>

        <h2 className="mt-12 font-heading text-[19px] font-bold tracking-tight">
          Single image, no set
        </h2>
        <p className="mt-2 text-[14px] leading-[1.65] text-muted-foreground">
          One image only: no counter, no arrows, no drag. This is what a single-photo post feels
          like.
        </p>
        <button
          type="button"
          onClick={() => setSingleOpen(true)}
          className="group mt-4 block w-56 overflow-hidden rounded-[var(--radius-md)] border border-border bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/collection/c2-thumb.webp"
            alt="A single collection photograph"
            className="aspect-[4/3] w-full object-cover transition-opacity duration-150 group-hover:opacity-90"
          />
        </button>
      </main>

      <ImageViewer
        images={GALLERY}
        initialIndex={openAt ?? 0}
        open={openAt !== null}
        onClose={() => setOpenAt(null)}
      />
      <ImageViewer
        images={[
          {
            src: "/images/collection/c2.webp",
            caption: "The quad at four in the afternoon, when it belongs to nobody.",
            author: AUTHOR,
            date: "27 Jun 2026",
          },
        ]}
        open={singleOpen}
        onClose={() => setSingleOpen(false)}
      />
    </div>
  );
}
