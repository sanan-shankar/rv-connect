/* ------------------------------------------------------------------ *
 *  A Collection photograph, as the shared image viewer wants it.
 *
 *  This was written three times: once in `collection-client.tsx` and once
 *  in each of the two lab rooms, whose own headers promise that every
 *  component on the page is "the REAL one". The mapping that feeds the
 *  real viewer was the one thing they copied, so the rooms quietly drew
 *  a photograph the site does not draw -- no `alt`, no free tags, and
 *  the raw `area` value instead of its label.
 *
 *  NOT `collection-viewer.ts`, which is a server module about the member
 *  doing the viewing and imports `prisma`. The two names are one letter
 *  of meaning apart and this one is the CLIENT-safe half; importing the
 *  other from a client component drags Prisma into the browser bundle.
 *
 *  `ViewerImage` is imported as a TYPE, which erases, so nothing follows
 *  it at runtime.
 * ------------------------------------------------------------------ */

import type { ViewerImage } from "@/components/common/image-viewer";
import type { PhotoData } from "@/lib/collection-shape";
import { areaLabel, bucketLabel } from "@/lib/collection";

/**
 * Map a Collection photograph onto the shared viewer's shape.
 *
 * Everything /collection/[id] used to be a separate page for is in here now:
 * the love, the buckets, the Where line and the uploader's own delete. The
 * owner on that page: "I don't know if we even need that page... That another
 * page isn't even pretty."
 *
 * The date is when the photograph was TAKEN, at whatever precision the
 * contributor gave, and nothing at all when they gave none -- never
 * `createdAt`, which is the day somebody scanned it.
 */
export function toViewerImage(p: PhotoData, isAdmin = false): ViewerImage {
  return {
    src: p.url,
    alt: p.caption ?? undefined,
    caption: p.caption,
    author: { id: p.uploader.id, name: p.uploader.name },
    date: p.takenLabel,
    where: p.area ? areaLabel(p.area) : null,
    tags: [...p.subject.map(bucketLabel), ...p.freeTags],
    href: `/collection/${p.id}`,
    loved: p.loved,
    loveCount: p.loveCount,
    /* An EDIT, not a delete, and deliberately instead of one. The owner,
       2026-08-30: "instead of delete photo button, have an edit icon."
       Taking the photograph down is inside the dialog this opens, where a
       destructive act is read rather than pressed by mistake beside
       Download. Same gate as the delete it replaced -- your own photograph,
       or an admin's, which is the gate `deleteOwnPhoto` enforces server-side
       and `editPhoto` now enforces alongside it.

       The lab rooms take the default and pass no `onEdit`, so the pencil is
       never drawn there: the viewer requires both. */
    canEdit: p.isOwn || isAdmin,
    editLabel: p.isOwn ? "Edit this photo" : "Edit this photo's details",
  };
}
