import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { escapeLike, SEARCH_TERM_MAX } from "@/lib/db-text";
import { logSearch } from "@/lib/search-log";
import { canonicalPlaceId } from "@/lib/place-aliases";
import { formatPlaceLabel } from "@/lib/place-input";

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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // This is the expensive one: a raw LIKE scan over 234k gazetteer rows. The
  // shared lookup throttle caps a script pointed at it without touching a
  // member's live type-ahead.
  const limited = await rateLimit("search", session.user.id);
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: 429 });
  }

  const raw = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (raw.length < 1) {
    return NextResponse.json<PlaceSearchResult[]>([]);
  }

  /* The shared escapeLike, not a local copy of its replace: this route runs
     `ILIKE '%q%'` against the 234k-row Place table's UNINDEXED altNames column
     for any query of four characters or more, which is exactly the shape audit
     C-015 closed everywhere else. The clamp that comes with the shared one is
     the fix -- a 20KB `q` here is hundreds of millions of comparisons holding a
     pool connection, and the rate limit above caps how MANY requests arrive,
     never what one of them costs. A hundred characters is longer than any real
     place name, so nobody typing one will ever meet it. */
  const term = raw.slice(0, SEARCH_TERM_MAX);
  const escaped = escapeLike(term);
  const prefixPattern = `${escaped}%`;
  const containsPattern = `%${escaped}%`;
  // Bounded too, so the ORDER BY equality comparisons carry the same cap.
  const lowerQuery = term.toLowerCase();

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

  /* An aliased row is answered with the row it would be saved as, so nobody
     is offered a choice the save is going to overrule (place-aliases.ts).
     Typing "delhi" matches the eleven-million-population Delhi row exactly
     and puts it first; swapping it here is what makes "New Delhi, Delhi" the
     thing under the cursor, which is the whole of why new members kept
     landing on the other one. The canonical row is usually already in the
     eight this query returned, so the extra fetch below runs only when an
     aliased row came back without its replacement, and never at all for the
     overwhelming majority of queries that touch no alias.

     Deduped after, first hit winning: a query can match both rows of an
     aliased pair, and two identical "New Delhi, Delhi" lines in a dropdown
     would read as a bug. That can leave fewer than the LIMIT 8 rows, which
     is the correct number of distinct places rather than a short page. */
  const byId = new Map(rows.map((r) => [r.id, r]));
  const missing = [
    ...new Set(rows.map((r) => canonicalPlaceId(r.id)).filter((id) => !byId.has(id))),
  ];
  if (missing.length > 0) {
    const extra = await prisma.place.findMany({
      where: { id: { in: missing } },
      select: { id: true, name: true, admin1: true, country: true, lat: true, lng: true },
    });
    for (const r of extra) byId.set(r.id, r);
  }

  const results: PlaceSearchResult[] = [];
  const seen = new Set<number>();
  for (const row of rows) {
    const resolved = byId.get(canonicalPlaceId(row.id)) ?? row;
    if (seen.has(resolved.id)) continue;
    seen.add(resolved.id);
    results.push({ ...resolved, label: formatPlaceLabel(resolved) });
  }

  /* after(), not `void`: see src/app/api/users/search/route.ts -- the same
     freeze-after-response loss (bug audit Lows 25/35/44/72/77/82/87). */
  after(() =>
    logSearch({
      scope: "places",
      query: raw,
      userId: session?.user?.id,
      results: results.length,
    })
  );

  return NextResponse.json(results);
}
