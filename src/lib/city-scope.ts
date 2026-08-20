import { prisma } from "@/lib/prisma";
// The one definition of the Postgres-only `mode: "insensitive"` gate (audit R6).
import { insensitive as searchInsensitive } from "@/lib/db-text";

/** Cities the given user has listed (UserPlace.city), for feed cityScope matching. */
export async function getViewerCities(userId: string): Promise<string[]> {
  const places = await prisma.userPlace.findMany({
    where: { userId },
    select: { city: true },
  });
  return places.map((p) => p.city);
}

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
 * Single-item visibility check, for detail pages that fetch one row directly
 * instead of going through a list query (e.g. the letter reading page).
 */
export async function canViewCityScope(
  cityScope: string | null,
  viewer: { id: string; role?: string | null }
): Promise<boolean> {
  if (!cityScope) return true;
  if (viewer.role === "admin") return true;
  const match = await prisma.userPlace.findFirst({
    where: { userId: viewer.id, city: { equals: cityScope, ...searchInsensitive } },
    select: { id: true },
  });
  return !!match;
}
