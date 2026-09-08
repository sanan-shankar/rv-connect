"use client";

/* ------------------------------------------------------------------ *
 *  <PhotoWall> - a photo question, printed as everybody's pictures at
 *  once rather than as N cards each wrapping one letterboxed image.
 *
 *  A wall is many photographs of many shapes, so it is justified rows
 *  rather than a grid of squares. The square was the wall's own version
 *  of the crop that cost the Catch-up its faces, and a wall is the one
 *  place that damage repeats twenty times over.
 *
 *  It is a client component for one reason: a press opens the shared
 *  viewer, which was the owner's #36 ("you can't click on the images to
 *  expand them"). And it opens on the WHOLE WALL rather than on the one
 *  photograph, so an Edition is something you can sit and step through --
 *  which is the closest this app has to an evening of somebody's
 *  photographs.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { EntryLoveButton } from "@/components/catchups/edition/entry-love-button";
import { renderRichText } from "@/lib/rich-text";
import { PhotoStream } from "@/components/common/photo-rows";
import { LazyImageViewer, useImageViewer } from "@/components/common/lazy-image-viewer";
import { PhotoOpener } from "@/components/common/photo-opener";
import type { EditionEntry } from "@/components/catchups/edition/answer-card";
import { formatDisplayDate } from "@/lib/utils";


/** A photograph nobody has measured keeps the square it has always had. */
const UNMEASURED = { width: 1, height: 1 };

export function PhotoWall({ entries }: { entries: EditionEntry[] }) {
  const viewer = useImageViewer();

  const cells = entries.map((entry) => ({
    entry,
    ...(entry.photos[0] ?? UNMEASURED),
  }));

  return (
    <>
      <PhotoStream photos={cells} gap={16} as="ul" keyOf={(c) => c.entry.id}>
        {({ entry }, i, cell) => (
          <div id={`entry-${entry.id}`} className="min-w-0">
            <PhotoOpener
              index={i}
              count={entries.length}
              onOpen={viewer.open}
              label={`View ${entry.author.name}'s photo full screen`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.images[0]}
                alt={`Added by ${entry.author.name}`}
                loading="lazy"
                decoding="async"
                className="w-full object-cover"
                style={{ aspectRatio: cell.aspectRatio }}
              />
            </PhotoOpener>
            {entry.body?.trim() && (
              /* renderRichText, the same as the answer card beside it. The
                 same field used to render two ways in the same edition: the
                 card honoured the composer's markers and the wall printed
                 them, so a caption written with emphasis read `*like this*`
                 here and formatted there (bugs.md #19). */
              <p
                className="mt-[var(--space-xs)] whitespace-pre-wrap break-words text-[13.5px] leading-[1.55] text-foreground"
                dangerouslySetInnerHTML={{ __html: renderRichText(entry.body) }}
              />
            )}
            <div className="mt-[var(--space-xs)] flex items-center justify-between gap-1">
              <Link
                href={`/profile/${entry.author.id}`}
                className="min-w-0 truncate rounded-md text-[13px] font-semibold text-muted-foreground hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {entry.author.name}
              </Link>
              {/* Cancels the LoveButton's own px-2.5 so the heart sits flush
                  with the picture's right edge. */}
              <div className="-mr-2.5 shrink-0">
                <EntryLoveButton
                  entryId={entry.id}
                  initialLoved={entry.lovedByViewer}
                  initialCount={entry.loveCount}
                />
              </div>
            </div>
          </div>
        )}
      </PhotoStream>
      {viewer.mounted && (
        <LazyImageViewer
          images={entries.map((entry) => ({
            src: entry.images[0],
            author: entry.author,
            date: formatDisplayDate(entry.createdAt),
            caption: entry.body,
          }))}
          initialIndex={viewer.at ?? 0}
          open={viewer.at !== null}
          onClose={viewer.close}
        />
      )}
    </>
  );
}
