/* ------------------------------------------------------------------ *
 *  One row of the Collection, as every reader wants it.
 *
 *  This lives outside collection/actions.ts for a mechanical reason: that
 *  file is `"use server"`, so every export it carries becomes a
 *  client-callable HTTP endpoint with its own action ID, and it may only
 *  export async functions. `shape` and `includeFor` are neither of those
 *  things and are needed by two files, so a shared module is the only place
 *  they can be. Moved here 2026-09-05 so that loadPhoto and myPendingPhotos
 *  -- read-only, and called only from server modules -- could leave the
 *  action surface with them.
 * ------------------------------------------------------------------ */

import { bucketsOf, takenLabel, takenShort } from "@/lib/collection";
import type { PhotoScope } from "@/lib/photo-visibility-rule";
import type { AvatarUser } from "@/components/common/bird-avatar";
import { IDENTITY_SELECT } from "@/lib/people-select";

export type PhotoData = {
  id: string;
  thumbUrl: string;
  url: string;
  /** What the viewer opens: `url` boxed to SCREEN_PX, a fifth of its bytes
   *  or less. Null means open `url` (see the column in schema.prisma). */
  screenUrl: string | null;
  width: number;
  height: number;
  caption: string | null;
  /** The six buckets this photograph is filed under, already mapped off the
   *  stored `subject` column and de-duplicated (src/lib/collection.ts). */
  subject: string[];
  era: string;
  /** When the photograph was TAKEN, in the contributor's own precision --
   *  "May 1978", "1978", "the 1970s" -- or null when they gave nothing. The
   *  viewer shows this and never `createdAt`, which is the day somebody
   *  scanned it (brief #21). */
  takenLabel: string | null;
  /** The same fact at tile length -- "1978", "1970s", or nothing. The owner
   *  on the hover overlay: "I don't think we need to show the caption and the
   *  number of likes. We could just show the person. The person and the year
   *  maybe, that would be good." */
  takenShort: string | null;
  /* The three date columns as stored, which is what the edit dialog seeds its
     one date box from (`typedDate`). Carried rather than re-fetched when the
     dialog opens: they arrive on a row the river has already queried, so the
     alternative is a round trip to learn three numbers we are holding. */
  photoYear: number | null;
  photoMonth: number | null;
  datePrecision: string | null;
  approved: boolean;
  /** Which half of the Collection this belongs to. Carried on the shape so a
   *  permalink can put the RIGHT river behind the viewer, rather than opening
   *  a class photograph over the valley's. */
  scope: PhotoScope;
  loveCount: number;
  loved: boolean;
  isOwn: boolean;
  uploader: AvatarUser & { id: string; name: string };
  createdAt: string;
};

export function shape(
  p: {
    id: string; thumbUrl: string; url: string; screenUrl: string | null; width: number; height: number;
    caption: string | null; subject: string; era: string;
    approved: boolean; scope: string; uploaderId: string; createdAt: Date;
    photoYear: number | null; photoMonth: number | null; datePrecision: string | null;
    uploader: AvatarUser & { id: string; name: string };
    _count: { loves: number }; loves: { id: string }[];
  },
  userId: string
): PhotoData {
  return {
    id: p.id,
    thumbUrl: p.thumbUrl,
    url: p.url,
    screenUrl: p.screenUrl,
    width: p.width,
    height: p.height,
    caption: p.caption,
    /* The six buckets, resolved here rather than at each reader: the column
       can still hold a value from the fourteen-item list it used to carry, and
       four of those collapse onto Nature -- so a photograph filed
       "hills,flora" must arrive as ONE Nature, not two. */
    subject: bucketsOf(p.subject),
    era: p.era,
    takenLabel: takenLabel(p),
    takenShort: takenShort(p),
    photoYear: p.photoYear,
    photoMonth: p.photoMonth,
    datePrecision: p.datePrecision,
    approved: p.approved,
    /* Read strictly, the same way `isValley` reads it: anything that is not
       the literal "valley" is treated as class-scoped. A shape that guessed
       "valley" for an unrecognised value would put a private photograph over
       the public river. */
    scope: p.scope === "valley" ? "valley" : "class",
    loveCount: p._count.loves,
    loved: p.loves.length > 0,
    isOwn: p.uploaderId === userId,
    uploader: p.uploader,
    createdAt: p.createdAt.toISOString(),
  };
}

export const includeFor = (userId: string) => ({
  uploader: { select: IDENTITY_SELECT },
  _count: { select: { loves: true } },
  loves: { where: { userId }, select: { id: true } },
});
