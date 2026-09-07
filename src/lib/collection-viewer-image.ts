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
 *  The Collection has two "viewers" and they are not the same noun. This
 *  is the image viewer's field map and it is client-safe;
 *  `collection-viewer-facts.ts` is the member doing the looking and it
 *  imports Prisma. They were `collection-viewer-image` and
 *  `collection-viewer` for an afternoon, which was one letter of meaning
 *  apart on a pair where getting it wrong puts Prisma in the browser.
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
/* `isAdmin` is REQUIRED, with no default. A default of `false` reads as a
 * kindness to the two lab rooms and is really a trap: forgetting the
 * argument would compile, and the only symptom is an edit pencil that
 * silently stops rendering for admins. It under-permissions rather than
 * over-permissions, so it is not a hole -- but a missing capability that
 * `tsc` refuses to mention is exactly the shape of bug this file was
 * split out to stop. The lab rooms say `false` out loud instead. */
export function toViewerImage(p: PhotoData, isAdmin: boolean): ViewerImage {
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
