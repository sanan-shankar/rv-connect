import { prisma } from "@/lib/prisma";
import { legacyCityColumns, type ResolvedPlace } from "@/lib/place-input";

/* ------------------------------------------------------------------ *
 *  Writing somebody's places.
 *
 *  There are exactly two writers -- a member editing their own in
 *  /settings, and an admin editing someone's on the person page -- and
 *  the schema says so out loud: UserPlace's own comment reads "Both
 *  writers ... are wipe-and-recreate transactions". They were the same
 *  transaction written twice, carrying the same two audit comments, so
 *  each was a place for the next fix to miss.
 *
 *  This lives beside `place-input.ts` rather than in it because that file
 *  is deliberately prisma-free: its tests run under bare node, where an
 *  `@/` import does not resolve.
 * ------------------------------------------------------------------ */

/**
 * Replace every place on an account with this list, in order.
 *
 * Wipe-and-recreate rather than a diff, in ONE transaction: `position` is the
 * order the member arranged, so a partial write leaves a chain that means
 * something different from what they saved, and a delete that lands without
 * its inserts leaves them with none at all.
 */
export function replaceUserPlaces(userId: string, cleaned: ResolvedPlace[]) {
  return prisma.$transaction([
    prisma.userPlace.deleteMany({ where: { userId } }),
    ...cleaned.map((p, i) =>
      prisma.userPlace.create({
        data: {
          userId,
          placeId: p.placeId ?? null,
          label: p.label,
          city: p.city,
          lat: p.lat,
          lng: p.lng,
          position: i,
        },
      })
    ),
    prisma.user.update({
      where: { id: userId },
      // Both legacy columns, from one place. Mirroring only the first left a
      // pre-migration secondaryCity behind for the profile's fallback to
      // resurrect the moment the member cleared their places (audit C-101).
      data: legacyCityColumns(cleaned),
    }),
  ]);
}
