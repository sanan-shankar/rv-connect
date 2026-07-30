import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePlaceString } from "@/lib/city-coords";

/**
 * Batched, server-side last-resort geocoder for the directory map.
 *
 * Who reaches this layer: legacy free-typed `UserPlace` rows only. Rows made
 * through the GeoNames LocationPicker already carry lat/lng, and the curated
 * table in src/lib/city-coords.ts catches the common free-typed metros. What
 * is left ("Northfield, Minnesota" typed before the picker existed) gets one
 * shot at the real 234,934-row `Place` gazetteer -- the same data the picker
 * searches (docs/spec/directory.md sec 4.5).
 *
 * Cost discipline: matching is exact lowercased equality on asciiName/name,
 * which the DB's lower() expression indexes serve (schema.prisma's note on
 * `Place`); never LIKE/ILIKE, whose contains form would sequential-scan all
 * 234,934 rows on a hot page. One query resolves every miss in the batch, and
 * results (including misses -- the gazetteer is static data, so a miss stays
 * a miss) are cached module-wide, making the steady state zero extra queries
 * per render. The batch is bounded in practice by the count of DISTINCT
 * unresolved legacy strings in UserPlace, i.e. tens, not thousands.
 */

// Resolved coordinates as [lng, lat] -- the same order city-coords.ts and the
// map's CityPin use. GeoNames columns are named lat/lng individually, so the
// one place the pair is assembled is right here; keep it [lng, lat].
type LngLat = [number, number];

const cache = new Map<string, LngLat | null>();

// "Name, Qualifier" free text: the qualifier may be a state/province
// ("Northfield, Minnesota" -> admin1) or a country ("Gurgaon, India"). A
// qualified string that matches NO candidate's qualifier stays unresolved
// rather than guessing the biggest homonym -- plotting someone in the wrong
// state is worse than leaving them in Unmapped, where dev sees the warn.
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

type GazetteerRow = {
  name: string;
  asciiName: string;
  admin1: string | null;
  country: string;
  lat: number;
  lng: number;
};

/**
 * Resolve free-text place strings against the `Place` gazetteer. Returns a
 * map keyed by the RAW input strings (only the ones that resolved), so
 * callers can look up with the exact string they hold. Homonym ties go to
 * the highest population, matching the LocationPicker's own ranking.
 */
export async function resolvePlacesFromGazetteer(
  rawNames: string[]
): Promise<Map<string, LngLat>> {
  const resolved = new Map<string, LngLat>();
  // raw -> normalized, deduped on the normalized form.
  const wanted = new Map<string, string>();
  for (const raw of rawNames) {
    const norm = normalizePlaceString(raw);
    if (!norm) continue;
    const hit = cache.get(norm);
    if (hit !== undefined) {
      if (hit) resolved.set(raw, hit);
      continue;
    }
    wanted.set(raw, norm);
  }
  if (wanted.size === 0) return resolved;

  const shortNames = [...new Set([...wanted.values()].map((n) => n.split(", ")[0]))];

  let rows: GazetteerRow[] = [];
  try {
    rows = await prisma.$queryRaw<GazetteerRow[]>(Prisma.sql`
      SELECT name, "asciiName", admin1, country, lat, lng
      FROM "Place"
      WHERE lower("asciiName") IN (${Prisma.join(shortNames)})
         OR lower(name) IN (${Prisma.join(shortNames)})
      ORDER BY population DESC
    `);
  } catch (err) {
    // The fallback is a best-effort layer under the map: if the query fails,
    // the affected members sit in Unmapped for this render (nothing cached,
    // so the next render retries) instead of the whole page erroring.
    console.error("[geocode] gazetteer fallback query failed:", err);
    return resolved;
  }

  for (const [raw, norm] of wanted) {
    const [shortName, qualifier] = norm.split(", ");
    // Rows arrive population-desc, so the first acceptable row is the best.
    const match = rows.find((r) => {
      if (r.asciiName.toLowerCase() !== shortName && r.name.toLowerCase() !== shortName) {
        return false;
      }
      if (!qualifier) return true;
      return (
        r.admin1?.toLowerCase() === qualifier ||
        countryName(r.country).toLowerCase() === qualifier
      );
    });
    const coords: LngLat | null = match ? [match.lng, match.lat] : null;
    cache.set(norm, coords);
    if (coords) resolved.set(raw, coords);
  }
  return resolved;
}
