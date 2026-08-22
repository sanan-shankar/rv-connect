import { prisma } from "@/lib/prisma";
import type { GazetteerPlace } from "@/lib/place-input";

/**
 * The gazetteer half of `resolvePlaces`, in one place.
 *
 * `place-input.ts` takes this as a callback rather than importing Prisma
 * itself, so its schema and its shaping stay reachable from a unit test
 * without a database. That is worth keeping -- but three writers each
 * hand-rolling the same `findMany` is the copy-paste the module exists to
 * stop (audit R6), and one of them silently doing a slightly different query
 * is how the canonical rewrite would quietly stop happening on signup and
 * nowhere else.
 */
export async function lookupGazetteerPlaces(
  ids: number[]
): Promise<Map<number, GazetteerPlace>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.place.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, admin1: true, country: true, lat: true, lng: true },
  });
  return new Map(rows.map((r) => [r.id, r]));
}
