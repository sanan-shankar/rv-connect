import { cache } from "react";
import { prisma } from "@/lib/prisma";
// The one definition of the Postgres-only `mode: "insensitive"` gate (audit R6).
import { insensitive as searchInsensitive } from "@/lib/db-text";

/** Cities the given user has listed (UserPlace.city), for feed cityScope matching.
 *
 *  `cache()`d per request. /profile/[id] reads this itself for its counts and
 *  then calls `loadPosts`, which reads it again -- so seeding the Writing tab
 *  on the server (audit 2 B13) would have traded a browser round trip for a
 *  duplicate query. React's cache dedupes them inside one render, and every
 *  other caller that happens to ask twice gets the same for free. Server-only:
 *  every importer of this module is a page, an action or a lib the server
 *  reaches. */
export const getViewerCities = cache(async function getViewerCities(
  userId: string
): Promise<string[]> {
  const places = await prisma.userPlace.findMany({
    where: { userId },
    /* Primary city first, which is the order the "Show to" audience control
       wants and the order the letters index already says this returns. It was
       only true of the feed page's own copy of this query, now folded in. */
    orderBy: { position: "asc" },
    select: { city: true },
  });
  return places.map((p) => p.city);
});

/**
 * Prisma where-fragment for city-scoped posts: cityScope IS NULL, or it
 * matches one of the viewer's own cities (case-insensitive). Admins see
 * everything, so callers should skip adding this fragment at all for an
 * admin viewer rather than calling this with an empty-cities admin case.
 */
export function cityScopeWhere(viewerCities: string[]) {
  return {
    OR: [
      { cityScope: null },
      ...(viewerCities.length ? [{ cityScope: { in: viewerCities, ...searchInsensitive } }] : []),
    ],
  };
}

/**
 * "Does this member list this city, and how do they spell it?"
 *
 * The one query behind the audience rule's write half. It was written three
 * times -- `createPost`, `editPost` and `canViewCityScope` below -- with the
 * same `where` and three different `select`s, and `editPost`'s comment said so
 * in prose ("Re-validated against the author's own UserPlace list exactly as
 * createPost does"). A sameness maintained by hand is the drift this file
 * exists to stop.
 *
 * Returns the STORED spelling, not a boolean, because that is the strictly
 * larger answer and the callers want both halves of it: the composer stores
 * what the member's own profile says rather than what the form field typed,
 * and a miss is `null`. What each caller does with a miss is the one thing
 * that genuinely differs -- `createPost` folds it to "Everyone", `editPost`
 * REFUSES (audit C-017) -- and that belongs at the call site.
 *
 * NOT `cache()`d, unlike `getViewerCities`: two of the three callers are
 * writes re-checking the audience at the moment they store it, and a memoised
 * answer there would be a check that stopped checking.
 */
export async function ownCity(userId: string, city: string): Promise<string | null> {
  const place = await prisma.userPlace.findFirst({
    where: { userId, city: { equals: city, ...searchInsensitive } },
    select: { city: true },
  });
  return place?.city ?? null;
}

/**
 * Single-item visibility check, for detail pages that fetch one row directly
 * instead of going through a list query (e.g. the letter reading page).
 */
export async function canViewCityScope(
  cityScope: string | null,
  viewer: { id: string; role?: string | null }
): Promise<boolean> {
  if (!cityScope) return true;
  if (viewer.role === "admin") return true;
  return (await ownCity(viewer.id, cityScope)) !== null;
}
