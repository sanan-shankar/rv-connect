import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { DirectoryClient } from "@/components/directory/directory-client";
import { cityCoords } from "@/lib/city-coords";
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
  accountType: true,
  verifyState: true,
  batchType: true,
  batchYear: true,
  currentCity: true,
  jobTitle: true,
  workplace: true,
} as const;

// Fields the map needs from each located alumnus.
const PIN_SELECT = {
  id: true,
  name: true,
  avatarColor: true,
  accountType: true,
  verifyState: true,
  batchType: true,
  batchYear: true,
  currentCity: true,
  jobTitle: true,
} as const;

type PinRow = {
  id: string;
  name: string;
  avatarColor: string | null;
  accountType: string | null;
  verifyState: string | null;
  batchType: string | null;
  batchYear: number | null;
  currentCity: string | null;
  jobTitle: string | null;
};

// Aggregate located alumni into counted, sorted city pins. Anyone whose city is
// not in the gazetteer falls into the unmapped bucket. Shared by the global
// browse map and the filtered map so both render the same shape of pin.
function buildPins(rows: PinRow[]): { cityPins: CityPin[]; unmappedPeople: PinPerson[] } {
  const pinMap = new Map<string, CityPin>();
  const unmappedPeople: PinPerson[] = [];
  for (const u of rows) {
    const coords = cityCoords(u.currentCity);
    const person: PinPerson = {
      id: u.id,
      name: u.name,
      avatarColor: u.avatarColor,
      accountType: u.accountType,
      verifyState: u.verifyState,
      batchType: u.batchType,
      batchYear: u.batchYear,
      currentCity: u.currentCity,
      jobTitle: u.jobTitle,
    };
    if (!coords) {
      unmappedPeople.push(person);
      continue;
    }
    const key = coords.join(",");
    const existing = pinMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.people.push(person);
    } else {
      pinMap.set(key, {
        city: u.currentCity!,
        lng: coords[0],
        lat: coords[1],
        count: 1,
        people: [person],
      });
    }
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
    industry?: string;
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

  // The directory `where` (case-insensitive search + normalized city) is built by
  // a shared helper so the SSR first page and the Load more server action filter
  // identically.
  const filters = {
    q: params.q,
    year: params.year,
    city: params.city,
    industry: params.industry,
    sort: params.sort,
    yearFrom: params.yearFrom,
    yearTo: params.yearTo,
  };
  const where = buildDirectoryWhere(filters);

  // Batch-year tiles plus a faculty count for the Batches view.
  const [batchYearCounts, facultyCount] = await Promise.all([
    prisma.user.groupBy({
      by: ["batchYear"],
      where: { isBlocked: false, accountType: { notIn: ["teacher", "ex_teacher"] } },
      _count: { id: true },
      orderBy: { batchYear: "desc" },
    }),
    prisma.user.count({
      where: { isBlocked: false, accountType: { in: ["teacher", "ex_teacher"] } },
    }),
  ]);

  const hasFilter = !!(
    params.q ||
    showingYear ||
    params.city ||
    params.industry ||
    yearFrom ||
    yearTo
  );

  // Sort: relevance is the default (newest, then batch descending). Name-asc only
  // on request. `id` is the stable tiebreaker that makes cursor pagination deterministic.
  const orderBy = directoryOrderBy(params.sort);

  // Keyset pagination: fetch one extra row to know whether a "Load more" page
  // exists, then trim it off and hand its id back as the cursor.
  const cursor = params.cursor || null;
  const [pageRows, resultCount] = hasFilter
    ? await Promise.all([
        prisma.user.findMany({
          where,
          select: PERSON_SELECT,
          orderBy,
          take: PAGE_SIZE + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
        prisma.user.count({ where }),
      ])
    : [[], 0];

  const hasMore = pageRows.length > PAGE_SIZE;
  const users = hasMore ? pageRows.slice(0, PAGE_SIZE) : pageRows;
  const nextCursor = hasMore ? users[users.length - 1].id : null;

  // City pins for the map. When a filter is active we recompute pins from the
  // FILTERED set (so the map narrows in place instead of being abandoned for the
  // grid); otherwise we plot every located alumnus for the zero-typing browse.
  // This aggregation is its own query (every match, not just the current page),
  // so the map stays accurate even when results span several pages.
  const pinWhere = hasFilter
    ? { ...where, currentCity: { not: null } }
    : { isBlocked: false, currentCity: { not: null } };
  const mapped = await prisma.user.findMany({
    where: pinWhere,
    select: PIN_SELECT,
    orderBy: [{ batchYear: "desc" }, { name: "asc" }],
  });
  const { cityPins, unmappedPeople } = buildPins(mapped);

  // Tier-2 facet options.
  const [cities, industries] = await Promise.all([
    prisma.user.findMany({
      where: { isBlocked: false, currentCity: { not: null } },
      select: { currentCity: true },
      distinct: ["currentCity"],
      orderBy: { currentCity: "asc" },
    }),
    prisma.user.findMany({
      where: { isBlocked: false, workplace: { not: null } },
      select: { workplace: true },
      distinct: ["workplace"],
      orderBy: { workplace: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
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
        cities={cities.map((c) => c.currentCity!).filter(Boolean)}
        industries={industries.map((i) => i.workplace!).filter(Boolean)}
        initialFilters={{
          q: params.q || "",
          year: params.year || "",
          city: params.city || "",
          industry: params.industry || "",
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
