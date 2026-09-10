/* ------------------------------------------------------------------ *
 *  Picking a Catch-up's picture against what its people already see.
 *
 *  The rule is `pictureAvoiding` in catchup-pictures.ts, which is pure and
 *  tested there. This is the one query that feeds it, kept out of that file
 *  because the picture dialog imports the pool into the browser and has no
 *  business carrying a database read with it.
 *
 *  Every path that gives a Catch-up a picture comes through here: starting
 *  one, a batch reaching ten, and the purge putting back a picture whose
 *  uploader has gone. The demo's one Catch-up has nobody to compare against
 *  and uses `pictureFor` directly.
 * ------------------------------------------------------------------ */
import type { Prisma } from "@/generated/prisma/client";
import type { prisma } from "./prisma";
import { pictureAvoiding, type CatchupPicture } from "./catchup-pictures";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * The picture for the Catch-up on `groupId`, given every OTHER Catch-up its
 * members are in.
 *
 * Keyed on the group rather than on a list of people because the group is
 * the membership: at creation its rows are written before this runs (inside
 * the same transaction), and for a batch or a purge they already exist.
 * The group's own Catch-up is left out, so a purge restoring a row does not
 * count the picture it is about to replace.
 *
 * One row per (member, other Catch-up). A batch of forty with three
 * Catch-ups each is 120 rows; nothing here is on a page view.
 */
export async function pickCatchupPicture(db: Db, groupId: string): Promise<CatchupPicture> {
  const seen = await db.groupMember.findMany({
    where: {
      groupId: { not: groupId },
      group: { catchup: { isNot: null } },
      user: { groupMemberships: { some: { groupId } } },
    },
    select: { group: { select: { catchup: { select: { pictureSrc: true } } } } },
  });

  const held = new Map<string, number>();
  for (const row of seen) {
    const src = row.group.catchup?.pictureSrc;
    if (src) held.set(src, (held.get(src) ?? 0) + 1);
  }
  return pictureAvoiding(groupId, held);
}
