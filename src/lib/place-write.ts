import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { legacyCityColumns, type ResolvedPlace } from "@/lib/place-input";

/* ------------------------------------------------------------------ *
 *  Writing somebody's places.
 *
 *  There are exactly three writers -- sign-up's register step, the
 *  profile's own cities pen, and an admin editing someone's on the person
 *  page -- and the schema says so out loud at UserPlace's unique index.
 *  They were the same transaction written three times, carrying the same
 *  two audit comments, so each was a place for the next fix to miss.
 *
 *  This header said TWO until 2026-09-07, and named a /settings page that
 *  has not existed for a while. Onboarding was the uncounted third, and it
 *  hand-rolled the wipe-and-recreate with a `createMany` inside a
 *  transaction that also wrote four profile columns -- which is what
 *  `userData` is for, rather than leaving it out of the count again.
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
 *
 * `userData` is for the writer that saves other columns in the same breath:
 * the register step writes admission number, occupation and organisation
 * beside the cities, and those four either all land or none do. The legacy
 * mirror is spread AFTER it, so no caller can pass a `currentCity` of its own
 * and quietly become the fourth copy of the C-101 rule.
 */
export function replaceUserPlaces(
  userId: string,
  cleaned: ResolvedPlace[],
  /* A `Pick`, not the whole `UserUpdateInput`. The wide type let a caller
     spread `role`, `isBlocked`, `verifyState` or `credentialVersion` into
     an update reached from sign-up, and only this comment would have
     objected. Nothing does that today -- the register step passes a
     literal of these four, built from a Zod schema -- but "the compiler
     enforces what the prose asserts" is the whole point of naming them. */
  userData?: Pick<
    Prisma.UserUpdateInput,
    "admissionNumber" | "workplace" | "jobTitle" | "subjects"
  >
) {
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
      data: { ...userData, ...legacyCityColumns(cleaned) },
    }),
  ]);
}
