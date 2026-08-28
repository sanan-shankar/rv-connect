import type { Metadata } from "next";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { DirectoryClient } from "@/components/directory/directory-client";
import { cityCoords, hasOwnPin, normalizeCity } from "@/lib/city-coords";
import { resolvePlacesFromGazetteer } from "@/lib/geocode";
import { buildDirectoryWhere, directoryOrderBy, parseDirectoryYears } from "./where";
import type { CityPin, PinPerson } from "@/components/directory/alumni-map";
import { valleyYear } from "@/lib/utils";
import { logSearch } from "@/lib/search-log";
import { PERSON_SELECT, PIN_SELECT } from "./select";

export const metadata: Metadata = {
  title: "Directory",
};

// One page of directory results. Cursor pagination appends another page.
const PAGE_SIZE = 60;

type PinRow = {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride: string | null;
  accountType: string | null;
  verifyState: string | null;
  batchType: string | null;
  batchYear: number | null;
  jobTitle: string | null;
  places: { city: string; lat: number | null; lng: number | null }[];
};

// Coordinate resolution ladder for one UserPlace (the Gurgaon/Northfield
// fix): (1) the row's own lat/lng, written by the GeoNames picker at save
// time; (2) the curated static table, for legacy free-typed rows; (3) the
// batched gazetteer fallback resolved before buildPins runs. Only a string
// all three layers miss leaves a member off the map, and that miss is
// warned in dev rather than silent.
function placeCoords(
  place: PinRow["places"][number],
  fallbackCoords: Map<string, [number, number]>
): [number, number] | null {
  if (place.lng != null && place.lat != null) return [place.lng, place.lat];
  return cityCoords(place.city) ?? fallbackCoords.get(place.city) ?? null;
}

/**
 * How many people of a pin travel to the browser with it.
 *
 * Twelve, because the drilldown sheet shows about that many before it needs
 * scrolling, and because everything here is serialized into the RSC payload of
 * every directory load AND every filter change -- so the number is a per-load
 * cost paid by every member, not a per-tap one. Past it, the sheet hands over
 * to /directory?city=..., which is paginated and searchable (bug audit B-092).
 */
const PIN_PEOPLE_CAP = 12;

// Aggregate located alumni into counted, sorted city pins. A person with
// several cities plots once per resolvable city (the owner explicitly wants
// "let me appear in all of those locations"); a person plots in "unmapped"
// only if NONE of their cities resolve against the gazetteer. Shared by the
// global browse map and the filtered map so both render the same shape of pin.
function buildPins(
  rows: PinRow[],
  fallbackCoords: Map<string, [number, number]>
): { cityPins: CityPin[]; unmappedPeople: PinPerson[]; unmappedCount: number } {
  const pinMap = new Map<string, CityPin>();
  const unmappedPeople: PinPerson[] = [];
  let unmappedCount = 0;
  // One dev warn per distinct unresolvable string, not per member: the fix
  // is per-string (add data), so per-member repeats would only bury it.
  const warned = new Set<string>();
  for (const u of rows) {
    const base = {
      id: u.id,
      name: u.name,
      photoUrl: u.photoUrl,
      birdOverride: u.birdOverride,
      accountType: u.accountType,
      verifyState: u.verifyState,
      batchType: u.batchType,
      batchYear: u.batchYear,
      jobTitle: u.jobTitle,
    };
    // Resolve every one of this person's cities once, deduped by pin key (so
    // "Bangalore" listed twice never double-plots). Kept alongside each pin
    // entry as `otherCities` -- a person appears in EVERY city they list
    // (owner override) -- even though the drilldown no longer renders an
    // "Also in ..." line for it (owner call, 2026-07).
    const resolvedByKey = new Map<string, { city: string; coords: [number, number] }>();
    for (const place of u.places) {
      const coords = placeCoords(place, fallbackCoords);
      if (!coords) {
        if (process.env.NODE_ENV !== "production" && !warned.has(place.city)) {
          warned.add(place.city);
          console.warn(
            `[directory map] no coordinates for "${place.city}" (e.g. member ${u.name}); ` +
              `they will sit in the Unmapped bucket. Every resolver missed: the row has no ` +
              `lat/lng, and the string matched neither city-coords.ts nor the Place gazetteer.`
          );
        }
        continue;
      }
      // Pins group on a 0.1-degree grid (~11 km), not exact coordinates:
      // GeoNames puts Bengaluru at 77.5946 while the legacy table says
      // 77.59, and exact keys would split one city into two stacked pins.
      // 0.1 degrees merges that noise while keeping real neighbours (Delhi
      // 77.21 vs Gurgaon 77.03) distinct. Display coords stay exact.
      // A place in OWN_PIN_CITIES opts out and is keyed by name, because the
      // grid is wider than its gap to the next town (Rishi Valley sits 10.4 km
      // from Madanapalle and was being absorbed by it). See city-coords.ts.
      const key = hasOwnPin(place.city)
        ? `named:${normalizeCity(place.city)}`
        : `${coords[0].toFixed(1)},${coords[1].toFixed(1)}`;
      if (!resolvedByKey.has(key)) resolvedByKey.set(key, { city: place.city, coords });
    }
    const allMappedCities = [...resolvedByKey.values()].map((r) => r.city);

    let placedSomewhere = false;
    for (const [key, { city, coords }] of resolvedByKey) {
      placedSomewhere = true;
      const otherCities = allMappedCities.filter((c) => c !== city);
      const person: PinPerson = {
        ...base,
        currentCity: city,
        otherCities: otherCities.length > 0 ? otherCities : undefined,
      };
      const existing = pinMap.get(key);
      if (existing) {
        existing.count += 1;
        /* Every distinct city the cell holds, not just the one that named it
           (audit C-098). Two towns can share an 11km grid square, and the
           escape link has to reach everybody the pin counted. Unbounded in
           principle, bounded in practice by how many named places fit in one
           cell -- two or three at most. */
        if (!existing.cities.includes(city)) existing.cities.push(city);
        // The COUNT is every member; the LIST is the first handful. Everything
        // in `people` is serialized into the RSC payload of every directory
        // load and every filter change, and a member with three cities was
        // serialized three times -- roughly 1-2MB per load at 2,000 members,
        // for a list only ever read after a pin is tapped (bug audit B-092).
        // Past the cap the drilldown sends people to /directory?city=..., which
        // is the paginated, searchable surface that already exists and reads
        // far better than a two-hundred-row sheet.
        if (existing.people.length < PIN_PEOPLE_CAP) existing.people.push(person);
      } else {
        pinMap.set(key, { city, cities: [city], lng: coords[0], lat: coords[1], count: 1, people: [person] });
      }
    }
    if (!placedSomewhere) {
      unmappedCount += 1;
      if (unmappedPeople.length < PIN_PEOPLE_CAP) unmappedPeople.push({ ...base, currentCity: null });
    }
  }
  const cityPins = [...pinMap.values()].sort((a, b) => b.count - a.count);
  return { cityPins, unmappedPeople, unmappedCount };
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    year?: string;
    // Several, when the escape link comes from a map pin whose grid cell
    // holds more than one town (audit C-098). Every other caller sends one.
    city?: string | string[];
    profession?: string;
    house?: string;
    type?: string;
    sort?: string;
    yearFrom?: string;
    yearTo?: string;
    cursor?: string;
  }>;
}) {
  const params = await searchParams;

  /* The trust model's Stage 1 line runs through this page (audit H21, and the
     harvesting half of M1): an account that has not confirmed its email may
     see the SHAPE of the community -- the map, the pin counts, the batch
     tiles -- but not one name. Everything this page passes to the client is
     serialized into the HTML, so the rule has to hold at query time, not at
     render time. The demo's invented visitor is exempt, as with every gate. */
  const session = await auth();
  const namesLocked = !IS_DEMO && !session?.user?.emailConfirmed;

  // The directory `where` (case-insensitive search + any-of-N-cities match) is
  // built by a shared helper so the SSR first page and the Load more server
  // action filter identically.
  const filters = {
    q: params.q,
    year: params.year,
    city: params.city,
    profession: params.profession,
    house: params.house,
    type: params.type,
    sort: params.sort,
    yearFrom: params.yearFrom,
    yearTo: params.yearTo,
  };
  const where = buildDirectoryWhere(filters);
  /* The SAME parser the where uses, not a second reading with bare Number()
     (audit C-099). `?year=1800` is truthy to Number, so this page called
     itself filtered, rendered a filter token and headed the grid "Batch of
     '00" -- while parseBatchYear rejected it, the where added no batchYear
     clause, and the entire membership was listed under that heading. */
  const { showingYear, yearFrom, yearTo } = parseDirectoryYears(filters);

  const hasFilter = !!(
    params.q ||
    showingYear ||
    params.city ||
    params.profession ||
    params.house ||
    params.type ||
    yearFrom ||
    yearTo
  );

  // Sort: "Best match"/"Newest" share the honest default order (see where.ts);
  // Name-asc/desc and Batch-asc/desc are explicit picks. The dishonest
  // "relevance" value+label from the old rail is gone.
  const orderBy = directoryOrderBy(params.sort);

  // Keyset pagination: fetch one extra row to know whether a "Load more" page
  // exists, then trim it off and hand its id back as the cursor.
  const cursor = params.cursor || null;

  // City pins for the map. When a filter is active we recompute pins from the
  // FILTERED set (so the map narrows in place instead of being abandoned for the
  // grid); otherwise we plot every located alumnus for the zero-typing browse.
  // This aggregation is its own query (every match, not just the current page),
  // so the map stays accurate even when results span several pages. A city
  // filter already implies `where.places` is set, so it is not overwritten
  // here -- otherwise the "has any place" guard is added on top.
  const placesGuard = (where as { places?: unknown }).places ? {} : { places: { some: {} } };
  // Every unfiltered branch repeats the deletionRequestedAt guard `where`
  // already carries (via buildDirectoryWhere): a deletion-pending account is
  // out of the directory in every view, counts included (audit M35).
  const pinWhere = hasFilter
    ? { ...where, ...placesGuard }
    : { isBlocked: false, deletionRequestedAt: null, ...placesGuard };

  // Every read this page needs is independent of every other, so they all run
  // as one concurrent round trip instead of several sequential ones: the
  // Batches-view tiles/faculty-count/batch range, the current page of results
  // plus its total count, the map's pins, and the City facet's live options.
  const [
    batchYearCounts,
    facultyCount,
    batchYearRange,
    pageRows,
    resultCount,
    mapped,
    cityGroups,
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ["batchYear"],
      where: { isBlocked: false, deletionRequestedAt: null, accountType: { notIn: ["teacher", "ex_teacher"] } },
      _count: { id: true },
      // nulls last here too, so every batch-desc sort in this app reads as one
      // decision (audit C-092). The null group is filtered out downstream
      // either way; what matters is that no batchYear desc is left as an
      // exception somebody has to remember.
      orderBy: { batchYear: { sort: "desc", nulls: "last" } },
    }),
    prisma.user.count({
      where: { isBlocked: false, deletionRequestedAt: null, accountType: { in: ["teacher", "ex_teacher"] } },
    }),
    prisma.user.aggregate({
      where: { isBlocked: false, deletionRequestedAt: null, batchYear: { not: null } },
      _min: { batchYear: true },
      _max: { batchYear: true },
    }),
    hasFilter && !namesLocked
      ? prisma.user.findMany({
          where,
          select: PERSON_SELECT,
          orderBy,
          take: PAGE_SIZE + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        })
      : Promise.resolve([]),
    // Always the real count, even with no filter active (where degenerates to
    // just `{ isBlocked: false }` then): the mobile FilterSheet's sticky
    // "Show N people" button reads this regardless of which browse view is
    // open, so it must never read a hardcoded 0.
    prisma.user.count({ where }),
    prisma.user.findMany({
      where: pinWhere,
      select: PIN_SELECT,
      /* `nulls: "last"`, the same as every batch sort in directoryOrderBy
         (audit M38). This sibling query never got that fix, and Postgres puts
         NULLs FIRST on a DESC column -- so a pin's visible twelve people were
         filled with rows carrying no batch year at all, teachers and
         half-finished profiles ahead of everyone else, while real alumni fell
         behind "See all N" (audit C-092). */
      orderBy: [{ batchYear: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    }),
    // City facet options: live distinct `UserPlace.city` values (frequency,
    // then A-Z), NOT `distinct User.currentCity` -- a person now has an
    // unlimited ordered city list, so the option source moved to the child
    // table. Profession/House/Type are static vocabularies (no query
    // needed) imported straight into the client component.
    prisma.userPlace.groupBy({
      by: ["city"],
      where: { user: { isBlocked: false, deletionRequestedAt: null } },
      _count: { city: true },
      orderBy: [{ _count: { city: "desc" } }, { city: "asc" }],
    }),
  ]);

  /* What people look for HERE, which was the one scope with no writer even
     though it is the surface whose entire job is finding somebody (audit
     C-097). Logged after the count is known, so "what are people failing to
     find" is answerable rather than just "what did they type".

     Inside after(), like the feed's: a bare `void` races the response, and
     Vercel can tear the instance down the moment that response streams. */
  if (params.q) {
    const q = params.q;
    after(() => logSearch({ scope: "directory", query: q, userId: session?.user?.id, results: resultCount }));
  }

  const hasMore = pageRows.length > PAGE_SIZE;
  const users = hasMore ? pageRows.slice(0, PAGE_SIZE) : pageRows;
  const nextCursor = hasMore ? users[users.length - 1].id : null;

  // Legacy rows (saved before the GeoNames picker, so lat/lng are null) whose
  // city string also misses the curated table get one batched shot at the
  // real gazetteer. resolvePlacesFromGazetteer caches module-wide, so the
  // steady state of this await is zero queries.
  const needsFallback = new Set<string>();
  for (const u of mapped) {
    for (const p of u.places) {
      if ((p.lat == null || p.lng == null) && !cityCoords(p.city)) needsFallback.add(p.city);
    }
  }
  const fallbackCoords = await resolvePlacesFromGazetteer([...needsFallback]);

  const built = buildPins(mapped, fallbackCoords);
  // Below Stage 1 the map keeps its circles and counts (a city is coarse
  // enough; owner call 2026-08-19) but every person is stripped BEFORE
  // serialization. An empty array, not a hidden list: view-source must have
  // nothing to find.
  const cityPins = namesLocked
    ? built.cityPins.map((p) => ({ ...p, people: [] }))
    : built.cityPins;
  const unmappedPeople = namesLocked ? [] : built.unmappedPeople;

  return (
    <div>
      {/* The header is DirectoryClient's own (2026-08-28): its title line now
          carries the search pill, and the query behind that pill is client
          state. No subtitle either way (owner, 2026-08-22): the grid says what
          the page is. */}
      <DirectoryClient
        users={users}
        resultCount={resultCount}
        cityPins={cityPins}
        unmappedCount={built.unmappedCount}
        unmappedPeople={unmappedPeople}
        batchYearCounts={batchYearCounts
          .filter((b): b is { batchYear: number; _count: { id: number } } => b.batchYear != null)
          .map((b) => ({ year: b.batchYear, count: b._count.id }))}
        facultyCount={facultyCount}
        cities={cityGroups.map((c) => c.city)}
        minBatchYear={batchYearRange._min.batchYear ?? valleyYear() - 40}
        maxBatchYear={batchYearRange._max.batchYear ?? valleyYear()}
        /* The filters that were actually APPLIED, not the raw params (audit
           C-099). A year the parser rejects adds no clause to the where, so
           passing the raw string through rendered a "Batch of '00" chip and a
           heading over the entire membership -- a filter the member could see
           and was not getting. What the chip says and what the query did are
           now the same value. */
        initialFilters={{
          q: params.q || "",
          year: showingYear === "faculty" ? "faculty" : showingYear != null ? String(showingYear) : "",
          /* The client's chip shows ONE city, and a multi-city value only ever
             arrives from a map pin's escape link (audit C-098). Showing the
             first is honest -- it is the pin's own name -- and any change the
             member makes to the chip replaces the whole filter anyway. */
          city: (Array.isArray(params.city) ? params.city[0] : params.city) || "",
          profession: params.profession || "",
          house: params.house || "",
          type: params.type || "",
          yearFrom: yearFrom != null ? String(yearFrom) : "",
          yearTo: yearTo != null ? String(yearTo) : "",
          sort: params.sort || "",
        }}
        hasFilter={hasFilter}
        nextCursor={nextCursor}
        namesLocked={namesLocked}
      />
    </div>
  );
}
