/* ------------------------------------------------------------------ *
 *  Several photographs together, laid out in justified rows.
 *
 *  <PhotoFrame> answers "one photograph, one column". This answers the
 *  other half of the layout problem, and the two are genuinely separate:
 *  the crop that ate faces in a Catch-up and the fact that the
 *  Collection's rows never line up are not the same bug and do not have
 *  the same fix (prior-art.md opens on exactly this).
 *
 *  Two components, because a card and an archive want opposite things
 *  from the same algorithm:
 *
 *    <PhotoRows>    a post's two or three, or a Catch-up answer's. Rows
 *                   fill their width, INCLUDING the last one, because a
 *                   card has only one or two rows and a short one reads
 *                   as a rendering fault. Each photograph is framed by
 *                   the single-photograph rule first, so a tall one is
 *                   3:4 rather than a strip, and capped the way a single
 *                   photograph is capped -- which means a photograph
 *                   that ends up alone on a row is drawn exactly as it
 *                   would have been had it been posted alone.
 *
 *    <PhotoStream>  the Collection grid and a Catch-up photo wall. Rows
 *                   break where they break, nothing is ever cropped
 *                   (D11), and the last row runs short at the target
 *                   height, exactly as the owner's reference gallery
 *                   does.
 *
 *  Neither measures anything. The arithmetic is in photo-layout.ts and
 *  the browser resolves it from flex ratios, so both render on the
 *  server, survive a resize with no JavaScript, and reserve their space
 *  before a single byte of photograph arrives -- which is the point. A
 *  version that measured its container could only run after first paint,
 *  and would move the page as it did.
 *
 *  Each takes a render function as its child, so a surface keeps its own
 *  markup -- a post wraps every photograph in a button that opens the
 *  viewer, a photo wall hangs a caption and a heart under each one --
 *  while the geometry stays unforgeable and in one place.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import {
  drawnRatio,
  framePhoto,
  photoBasis,
  photoGrow,
  photoRatio,
  PHOTO_GRID_TARGET,
  PHOTO_MAX_WIDTH,
  PHOTO_ROW_TARGET,
  photoSizes,
  type PhotoFacts,
  type PhotoShape,
} from "@/lib/photo-layout";
import { cn } from "@/lib/utils";

/** What a surface is told about the cell it is drawing into. */
export type PhotoCell = {
  /** `aspect-ratio`, as CSS. In a stream this is always the photograph's own
   *  shape, because the Collection grid never crops. In a row it is the shape
   *  the single-photograph rule gives it, which is its own unless it is taller
   *  than 3:4. Put it on the image (or on whatever box the image fills), not
   *  on the cell -- a photo wall's cell is the photograph AND its caption, so
   *  the two have different heights. */
  aspectRatio: string;
  /** `object-position`. Put it on the image beside the aspect-ratio. */
  objectPosition: string;
  /** `max-height` in px: the 500px ceiling, which a photograph pays for by
   *  losing up to 20% off its top and bottom rather than by narrowing. Goes
   *  on the image with the aspect-ratio; without it a photograph alone on a
   *  row can be drawn 625px tall. Absent in a stream, which crops nothing at
   *  all and lets a row's own arithmetic bound its height. */
  maxHeight?: number;
  /** The `sizes` promise for this photograph, when the surface passed a column
   *  measure to build one from. Absent where a surface serves one file with no
   *  `srcset`, where `sizes` means nothing. */
  sizes?: string;
};

export function PhotoRows<T extends PhotoFacts>({
  photos,
  gap = 8,
  columnSizes,
  className,
  keyOf,
  children,
}: {
  photos: T[];
  /** Between photographs and between rows, in px. */
  gap?: number;
  /** The surface's own `sizes` for the whole column, from image-cdn.ts. */
  columnSizes?: string;
  className?: string;
  /** A stable identity for each cell. Defaults to position, which is right
   *  for a post's fixed handful and wrong for a list that filters. */
  keyOf?: (photo: T, index: number) => string | number;
  children: (photo: T, index: number, cell: PhotoCell) => ReactNode;
}) {
  return (
    <div
      /* Capped at the same 900px a single photograph is capped at, and
         centred, so a post with three photographs and a post with one measure
         the same in a 1216px feed column instead of the multi-photo one
         sprawling wider than the single. `justify-center` also catches the row
         that cannot fill its width because every photograph on it has hit its
         own cap: it centres rather than hanging off the left. */
      className={cn("mx-auto flex flex-wrap justify-center", className)}
      style={{ gap, maxWidth: PHOTO_MAX_WIDTH }}
    >
      {photos.map((photo, i) => {
        /* Framed FIRST, so the row is solved from the shape each photograph
           will actually be drawn at rather than from the shape of its file.
           See `drawnRatio`: this is where a 9:20 screenshot stops being a
           72px strip beside its neighbours. */
        const frame = framePhoto(photo);
        const ratio = drawnRatio(frame);
        return (
          <div
            key={keyOf?.(photo, i) ?? i}
            style={{
              flexGrow: photoGrow(ratio),
              flexShrink: 1,
              flexBasis: photoBasis(ratio, `${PHOTO_ROW_TARGET}px`),
              /* The single-photograph cap, which does two jobs here. It bounds
                 the 500px ceiling for a photograph that ends up alone on a row
                 -- a phone gives every wide photograph its own row -- and
                 because it is `ratio x a height`, every photograph in a row
                 reaches it at the same moment, so a capped row is still a row.
                 `min-width: 0` because a flex item's automatic minimum is
                 content-based, and an image's content is wide. */
              maxWidth: frame.maxWidth,
              minWidth: 0,
            }}
          >
            {children(photo, i, {
              aspectRatio: frame.aspectRatio,
              objectPosition: frame.objectPosition,
              maxHeight: frame.maxHeight,
              /* Honest but coarse. How much of the column a cell gets depends
                 on where the browser broke the line, which no `sizes` string
                 can express, so this promises the most it could be: the whole
                 column, capped the way a single photograph is capped. On a
                 phone that is exact, since a wide photograph gets a row to
                 itself. On a laptop it over-asks for a row of three, and the
                 cost is bounded -- the ladder's lowest rung is 750px, which a
                 728px card was going to request anyway (image-cdn.ts). Spec §4's
                 precomputed derivatives are where this stops approximating. */
              sizes: columnSizes ? photoSizes(columnSizes, frame) : undefined,
            })}
          </div>
        );
      })}
    </div>
  );
}

export function PhotoStream<T extends PhotoShape>({
  photos,
  gap = 12,
  targetHeight = PHOTO_GRID_TARGET,
  maxScale = 2.5,
  as = "div",
  className,
  keyOf,
  children,
}: {
  photos: T[];
  gap?: number;
  /** The height each row aims for, as CSS. See `PHOTO_GRID_TARGET`. */
  targetHeight?: string;
  /** How far past the target a row may stretch, as a hard stop rather than as
   *  the everyday guard -- the trailing row is handled by the ghost below.
   *  What this catches is the one case with no other brake: a photograph that
   *  starts a row and is left on it alone because the NEXT one is a panorama
   *  too wide to join. A 9:16 alone on a 358px phone row would otherwise be
   *  drawn 637px tall, which is the "huge ass pictures to keep scrolling past"
   *  the whole rule exists to prevent. */
  maxScale?: number;
  /** `ul` where the photographs really are a list of separate contributions,
   *  which the Catch-up wall is: it was a `ul` of `li` before this component
   *  existed and a screen reader should still hear "list, 12 items". */
  as?: "div" | "ul";
  className?: string;
  /** A stable identity for each cell. Defaults to position, which is wrong for
   *  anything that filters, sorts or paginates -- pass the row's id. */
  keyOf?: (photo: T, index: number) => string | number;
  children: (photo: T, index: number, cell: PhotoCell) => ReactNode;
}) {
  const Container = as;
  const Cell = as === "ul" ? "li" : "div";
  return (
    <Container className={cn("flex flex-wrap items-start", className)} style={{ gap }}>
      {photos.map((photo, i) => {
        const ratio = photoRatio(photo);
        return (
          <Cell
            key={keyOf?.(photo, i) ?? i}
            style={{
              flexGrow: photoGrow(ratio),
              flexShrink: 1,
              flexBasis: photoBasis(ratio, targetHeight),
              maxWidth: photoBasis(ratio, `calc(${targetHeight} * ${maxScale})`),
              minWidth: 0,
            }}
          >
            {children(photo, i, {
              aspectRatio: `${photo.width} / ${photo.height}`,
              objectPosition: "50% 50%",
            })}
          </Cell>
        );
      })}
      {/* The ghost, and it is the whole answer to the trailing row.

          A justified layout has exactly one ugly failure: the last row holds
          whatever is left, so solving it to the full width blows a single
          leftover photograph up to the width of the page. Flickr, Google
          Photos and the owner's own reference gallery all answer it the same
          way -- leave the last row at the target height and let it run short.

          This is that, in CSS. An empty cell of zero width and a large
          flex-grow joins whichever row ends up last and takes nearly all of
          its free space, so the photographs beside it stay near the height
          they were aiming for. It cannot affect any other row, which is the
          point: a row in the MIDDLE of the grid must always fill its width
          exactly, or the rows stop lining up and the layout has lost the one
          thing it was chosen for. A card does not want this -- there the last
          row is usually the only row -- so <PhotoRows> has no ghost. */}
      <Cell
        aria-hidden
        style={{ flexGrow: photoGrow(24), flexShrink: 0, flexBasis: 0, height: 0 }}
      />
    </Container>
  );
}
