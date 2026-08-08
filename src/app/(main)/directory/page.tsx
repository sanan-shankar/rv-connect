import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { DirectoryClient } from "@/components/directory/directory-client";
import { cityCoords } from "@/lib/city-coords";
import { resolvePlacesFromGazetteer } from "@/lib/geocode";
import { buildDirectoryWhere, directoryOrderBy } from "./where";
import type { CityPin, PinPerson } from "@/components/directory/alumni-map";

export const metadata: Metadata = {
  title: "Directory",
};

// One page of directory results. Cursor pagination appends another page.
const PAGE_SIZE = 60;

const PERSON_SELECT = {
  id: true,
  name: true,
  avatarColor: true,
  photoUrl: true,
  birdOverride: true,
  accountType: true,
  verifyState: true,
  batchType: true,
  batchYear: true,
  currentCity: true,
  jobTitle: true,
  workplace: true,
} as const;

// Fields the map needs from each located alumnus. `places` (not `currentCity`)
// drives pins: a person plots in EVERY city they list, not just a primary one
// (owner override).
// lat/lng ride along because the LocationPicker already wrote exact GeoNames
// coordinates onto every picked row; the old select dropped them, and the map
// then re-geocoded the bare city string against the small curated table --
// which is how "Gurgaon" and "Northfield, Minnesota" fell off the map while
// their rows held perfectly good coordinates.
const PIN_SELECT = {
  id: true,
  name: true,
  avatarColor: true,
  photoUrl: true,
  birdOverride: true,
  accountType: true,
  verifyState: true,
  batchType: true,
  batchYear: true,
  jobTitle: true,
  places: {
    select: { city: true, lat: true, lng: true },
    orderBy: { position: "asc" as const },
  },
} as const;

type PinRow = {
  id: string;
  name: string;
  avatarColor: string | null;
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

// Aggregate located alumni into counted, sorted city pins. A person with
// several cities plots once per resolvable city (the owner explicitly wants
// "let me appear in all of those locations"); a person plots in "unmapped"
// only if NONE of their cities resolve against the gazetteer. Shared by the
// global browse map and the filtered map so both render the same shape of pin.
function buildPins(
  rows: PinRow[],
  fallbackCoords: Map<string, [number, number]>
): { cityPins: CityPin[]; unmappedPeople: PinPerson[] } {
  const pinMap = new Map<string, CityPin>();
  const unmappedPeople: PinPerson[] = [];
  // One dev warn per distinct unresolvable string, not per member: the fix
  // is per-string (add data), so per-member repeats would only bury it.
  const warned = new Set<string>();
  for (const u of rows) {
    const base = {
      id: u.id,
      name: u.name,
      avatarColor: u.avatarColor,
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
      const key = `${coords[0].toFixed(1)},${coords[1].toFixed(1)}`;
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
        existing.people.push(person);
      } else {
        pinMap.set(key, { city, lng: coords[0], lat: coords[1], count: 1, people: [person] });
      }
    }
    if (!placedSomewhere) unmappedPeople.push({ ...base, currentCity: null });
  }
  const cityPins = [...pinMap.values()].sort((a, b) => b.count - a.count);
  return { cityPins, unmappedPeople };
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    year?: string;
    city?: string;
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

  const showingYear = params.year === "faculty" ? "faculty" : params.year ? Number(params.year) : null;
  const yearFrom = params.yearFrom ? Number(params.yearFrom) : null;
  const yearTo = params.yearTo ? Number(params.yearTo) : null;

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
  const pinWhere = hasFilter ? { ...where, ...placesGuard } : { isBlocked: false, ...placesGuard };

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
      where: { isBlocked: false, accountType: { notIn: ["teacher", "ex_teacher"] } },
      _count: { id: true },
      orderBy: { batchYear: "desc" },
    }),
    prisma.user.count({
      where: { isBlocked: false, accountType: { in: ["teacher", "ex_teacher"] } },
    }),
    prisma.user.aggregate({
      where: { isBlocked: false, batchYear: { not: null } },
      _min: { batchYear: true },
      _max: { batchYear: true },
    }),
    hasFilter
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
      orderBy: [{ batchYear: "desc" }, { name: "asc" }],
    }),
    // City facet options: live distinct `UserPlace.city` values (frequency,
    // then A-Z), NOT `distinct User.currentCity` -- a person now has an
    // unlimited ordered city list, so the option source moved to the child
    // table. Profession/House/Type are static vocabularies (no query
    // needed) imported straight into the client component.
    prisma.userPlace.groupBy({
      by: ["city"],
      where: { user: { isBlocked: false } },
      _count: { city: true },
      orderBy: [{ _count: { city: "desc" } }, { city: "asc" }],
    }),
  ]);

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

  const { cityPins, unmappedPeople } = buildPins(mapped, fallbackCoords);

  return (
    <div>
      <PageHeader
        title="Directory"
        subtitle="Find the people who grew up under the same trees."
      />
      <DirectoryClient
        users={users}
        resultCount={resultCount}
        cityPins={cityPins}
        unmappedCount={unmappedPeople.length}
        unmappedPeople={unmappedPeople}
        batchYearCounts={batchYearCounts
          .filter((b): b is { batchYear: number; _count: { id: number } } => b.batchYear != null)
          .map((b) => ({ year: b.batchYear, count: b._count.id }))}
        facultyCount={facultyCount}
        cities={cityGroups.map((c) => c.city)}
        minBatchYear={batchYearRange._min.batchYear ?? new Date().getFullYear() - 40}
        maxBatchYear={batchYearRange._max.batchYear ?? new Date().getFullYear()}
        initialFilters={{
          q: params.q || "",
          year: params.year || "",
          city: params.city || "",
          profession: params.profession || "",
          house: params.house || "",
          type: params.type || "",
          yearFrom: params.yearFrom || "",
          yearTo: params.yearTo || "",
          sort: params.sort || "",
        }}
        hasFilter={hasFilter}
        nextCursor={nextCursor}
      />
    </div>
  );
}
