import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * GET /api/places/search?q=<text>
 *
 * Prefix search over the 234,934-row GeoNames `Place` gazetteer, built so a
 * villager (Madanapalle) matches as readily as a metro, and homonyms
 * (the many US Northfields) come back disambiguated. Backs the reusable
 * <LocationPicker> (src/components/common/location-picker.tsx).
 *
 * Matching: prefix on lower(asciiName) and lower(name) -- the `@@index`es on
 * both columns are btree, which Postgres can use for a `LIKE 'prefix%'` scan
 * once the pattern has no leading wildcard (this is the `text_pattern_ops`-
 * style prefix trick; it degrades to a sequential scan for infix search,
 * which is why altNames only kicks in for longer queries). altNames is a
 * flat comma-joined string (no index), searched with a contains match only
 * once the query is 4+ characters so short queries ("de") do not force a
 * sequential scan of all 234,934 rows.
 *
 * Ranking: an exact case-insensitive match on name/asciiName sorts first
 * (so "nellore" surfaces the city named exactly that before any place whose
 * name merely starts with it), then population descending, so the well-known
 * place wins a homonym tie (e.g. the many US "Northfield"s).
 */

export interface PlaceSearchResult {
  id: number;
  name: string;
  admin1: string | null;
  country: string;
  lat: number;
  lng: number;
  /** Disambiguated display string: "Name, Admin1" (India) or "Name, Admin1, Country" (elsewhere). */
  label: string;
}

type PlaceRow = {
  id: number;
  name: string;
  admin1: string | null;
  country: string;
  lat: number;
  lng: number;
};

// Built once (locale-only, not request-dependent) rather than per request.
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function formatLabel(row: PlaceRow): string {
  const parts = [row.name];
  if (row.admin1) parts.push(row.admin1);
  if (row.country !== "IN") parts.push(countryName(row.country));
  return parts.join(", ");
}

// Escape LIKE/ILIKE metacharacters in user input so a typed "%" or "_" is
// matched literally instead of acting as a wildcard.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (raw.length < 1) {
    return NextResponse.json<PlaceSearchResult[]>([]);
  }

  const escaped = escapeLike(raw);
  const prefixPattern = `${escaped}%`;
  const containsPattern = `%${escaped}%`;
  const lowerQuery = raw.toLowerCase();

  const altNamesClause =
    raw.length >= 4
      ? Prisma.sql`OR "altNames" ILIKE ${containsPattern} ESCAPE '\\'`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    SELECT id, name, admin1, country, lat, lng
    FROM "Place"
    WHERE lower("asciiName") LIKE lower(${prefixPattern}) ESCAPE '\\'
       OR lower("name") LIKE lower(${prefixPattern}) ESCAPE '\\'
       ${altNamesClause}
    ORDER BY
      (lower("name") = ${lowerQuery} OR lower("asciiName") = ${lowerQuery}) DESC,
      -- A prefix hit on the place's own name outranks an altNames-contains
      -- hit regardless of population: typing "rishi" must surface Rishi
      -- Valley (pop. 1,500) above metros whose foreign-language altNames
      -- happen to contain the letters (Tbilisi et al. did exactly that).
      (lower("asciiName") LIKE lower(${prefixPattern}) ESCAPE '\\'
        OR lower("name") LIKE lower(${prefixPattern}) ESCAPE '\\') DESC,
      population DESC
    LIMIT 8
  `);

  const results: PlaceSearchResult[] = rows.map((row) => ({
    ...row,
    label: formatLabel(row),
  }));

  return NextResponse.json(results);
}
