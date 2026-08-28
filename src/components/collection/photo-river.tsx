"use client";

/* ------------------------------------------------------------------ *
 *  The river itself: justified rows, and decade headings when the
 *  order is time.
 *
 *  Split out from <CollectionClient> for one reason -- so /lab/collection
 *  can show the REAL thing against a few hundred photographs rather than
 *  the two the database actually holds. A lab room that reimplements the
 *  surface it is meant to be judging is a room that lies, and the layout
 *  work in this campaign has already been through one of those
 *  (`_justified.ts`, deleted for being a second implementation).
 *
 *  So the state lives with the caller -- the page fetches, the room
 *  filters an array in memory -- and everything you can SEE lives here.
 * ------------------------------------------------------------------ */

import { useMemo } from "react";
import { PhotoStream, type PhotoCell } from "@/components/common/photo-rows";
import { eraLabel } from "@/lib/collection";
import type { PhotoData, RiverOrder } from "@/app/(main)/collection/actions";
import { cn } from "@/lib/utils";

/** Warm the viewer chunk before the press needs it. The owner, clicking a
 *  photograph during the brief: "Oh, wow. This doesn't even load. What? I
 *  clicked on picture. Okay. Loaded." */
export const preloadViewer = () => void import("@/components/common/image-viewer");

export function Tile({
  photo,
  cell,
  onOpen,
}: {
  photo: PhotoData;
  cell: PhotoCell;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={preloadViewer}
      onFocus={preloadViewer}
      aria-label={photo.caption ?? `Photograph by ${photo.uploader.name}`}
      // Hover is the scrim below, so no state-layer here (a tint over a
      // photograph is noise). The press only needed an answer: opacity, not a
      // transform, because the tile must not move under the cursor.
      className="group relative block w-full overflow-hidden rounded-[var(--radius-md)] bg-paper text-left transition-opacity duration-150 active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      /* The photograph's OWN shape, which is what makes the row justified:
         PhotoStream has already solved the width, and the height follows from
         the ratio, so every tile in a row comes out the same height with
         nothing cropped to get there. */
      style={{ aspectRatio: cell.aspectRatio }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbUrl}
        alt={photo.caption ?? ""}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      {!photo.approved && (
        <span className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10.5px] font-semibold text-background">
          Pending review
        </span>
      )}
      {/* Who and when, and nothing else. The owner, on the caption and the
          love count that used to be here: "I don't think we need to show the
          caption and the number of likes. We could just show the person. The
          person and the year maybe, that would be good." */}
      <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <div className="flex w-full items-baseline gap-2 p-3 text-[12px] text-white">
          <span className="min-w-0 truncate font-medium">{photo.uploader.name}</span>
          {photo.takenShort && (
            <span className="ml-auto shrink-0 tabular-nums text-white/80">{photo.takenShort}</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 *  Reading the river in time order.
 *
 *  "Through time" is the only order where a heading means anything, and
 *  there it means a great deal: it is the foldering the owner wanted
 *  ("all the organization foldering that we do, we have to do in a really
 *  beautiful way") delivered INLINE, at the cost of no clicks at all. You
 *  scroll and the decades announce themselves.
 *
 *  Consecutive runs, not a group-by: the rows arrive already ordered by
 *  `takenKey`, so a run of one era is contiguous by construction, and this
 *  keeps working as each new page is appended to the end.
 * ------------------------------------------------------------------ */
type Band = { era: string; photos: PhotoData[] };

export function bandsOf(photos: PhotoData[], order: RiverOrder): Band[] {
  if (order !== "taken") return [{ era: "", photos }];
  const out: Band[] = [];
  for (const p of photos) {
    const last = out[out.length - 1];
    if (last && last.era === p.era) last.photos.push(p);
    else out.push({ era: p.era, photos: [p] });
  }
  return out;
}

const bandLabel = (era: string) => (era === "unknown" ? "Undated" : eraLabel(era));

export function PhotoRiver({
  photos,
  order,
  onOpen,
  dimmed = false,
  className,
}: {
  photos: PhotoData[];
  order: RiverOrder;
  /** The index is into `photos`, so the viewer steps through the whole river
   *  the reader can see, across decade headings. */
  onOpen: (index: number) => void;
  /** True while a new query's first page is in the air. */
  dimmed?: boolean;
  className?: string;
}) {
  const bands = useMemo(() => bandsOf(photos, order), [photos, order]);

  return (
    /* The cross-fade. Changing a bucket dims the river the moment the query
       changes and brings the new one up when it lands, so the change reads as
       one movement instead of a flash of skeletons. Opacity only. */
    <div
      className={cn(
        "transition-opacity duration-200 ease-out",
        dimmed && "pointer-events-none opacity-40",
        className
      )}
    >
      {bands.map((band, bi) => (
        <section
          key={band.era || "all"}
          /* Windowing, and it is the browser's rather than ours. Everything
             well below the fold is skipped at layout and paint until it is
             scrolled near, which is what keeps a twenty-thousand photograph
             archive smooth without a virtualiser measuring rows. A
             virtualiser is what this campaign's D16 ruled out: measuring
             means laying out after the first paint, which is the page-jump
             the whole thing exists to end.

             Only past the first band. The fold is never skipped (it is the
             largest thing painted), and chopping ONE continuous river into
             windowed chunks would break a justified row at every seam. A
             decade boundary is a real seam and its rows already end there. */
          style={
            bi > 0 ? { contentVisibility: "auto", containIntrinsicSize: "auto 600px" } : undefined
          }
        >
          {band.era && bands.length > 1 && (
            /* The foldering, inline and free -- and it is a chapter opening
               now rather than a bar.
               It used to be sticky, which meant it needed a background to
               travel over, which meant a translucent band and a hairline
               rule ran across the river at every decade. The owner: "the
               headings also have the weird bars behind them." They were the
               price of the stickiness, and the stickiness was buying very
               little: the decade rail on the right already says where you
               are, permanently, without covering anything.
               So: no band, no rule, no blur. The decade, the count under
               it, and a clear breath above so the eye reads a new section
               starting rather than a label attached to the row above. */
            <h2 className={cn("mb-4", bi > 0 && "mt-12")}>
              <span className="block font-heading text-[22px] leading-none tracking-[-0.02em] text-foreground">
                {bandLabel(band.era)}
              </span>
              <span className="mt-1.5 block text-[12.5px] tabular-nums text-muted-foreground">
                {band.photos.length}{" "}
                {band.photos.length === 1 ? "photograph" : "photographs"}
              </span>
            </h2>
          )}
          <PhotoStream photos={band.photos} keyOf={(p) => p.id} className="mb-3">
            {(p, i, cell) => (
              <Tile photo={p} cell={cell} onOpen={() => onOpen(photos.indexOf(p))} />
            )}
          </PhotoStream>
        </section>
      ))}
    </div>
  );
}
