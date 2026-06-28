import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { DirectoryClient } from "@/components/directory/directory-client";
import { cityCoords } from "@/lib/city-coords";
import type { CityPin, PinPerson } from "@/components/directory/alumni-map";

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
  }>;
}) {
  const params = await searchParams;

  const showingYear = params.year === "faculty" ? "faculty" : params.year ? Number(params.year) : null;
  const yearFrom = params.yearFrom ? Number(params.yearFrom) : null;
  const yearTo = params.yearTo ? Number(params.yearTo) : null;

  // Tier-1 search spans name, city, workplace, and job title (never name-only).
  const where: Record<string, unknown> = { isBlocked: false };
  if (params.q) {
    where.OR = [
      { name: { contains: params.q } },
      { currentCity: { contains: params.q } },
      { workplace: { contains: params.q } },
      { jobTitle: { contains: params.q } },
    ];
  }
  if (showingYear === "faculty") {
    where.accountType = { in: ["teacher", "ex_teacher"] };
  } else if (typeof showingYear === "number") {
    where.batchYear = showingYear;
  }
  if (yearFrom || yearTo) {
    where.batchYear = {
      ...(yearFrom ? { gte: yearFrom } : {}),
      ...(yearTo ? { lte: yearTo } : {}),
    };
  }
  if (params.city) where.currentCity = params.city;
  if (params.industry) where.workplace = params.industry;

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

  // Aggregate every alumnus with a known city into counted, located pins.
  // Each pin carries a compact member list so the drilldown opens with no extra fetch.
  const mapped = await prisma.user.findMany({
    where: { isBlocked: false, currentCity: { not: null } },
    select: {
      id: true,
      name: true,
      avatarColor: true,
      accountType: true,
      verifyState: true,
      batchType: true,
      batchYear: true,
      currentCity: true,
      jobTitle: true,
    },
    orderBy: [{ batchYear: "desc" }, { name: "asc" }],
  });

  const pinMap = new Map<string, CityPin>();
  const unmappedPeople: PinPerson[] = [];
  for (const u of mapped) {
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

  const hasFilter = !!(
    params.q ||
    showingYear ||
    params.city ||
    params.industry ||
    yearFrom ||
    yearTo
  );

  // Sort: relevance is the default (newest, then batch descending). Name-asc only on request.
  const orderBy =
    params.sort === "name"
      ? [{ name: "asc" as const }]
      : [{ createdAt: "desc" as const }, { batchYear: "desc" as const }];

  const [users, resultCount] = hasFilter
    ? await Promise.all([
        prisma.user.findMany({ where, select: PERSON_SELECT, orderBy, take: 60 }),
        prisma.user.count({ where }),
      ])
    : [[], 0];

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
        title="Alumni Directory"
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
      />
    </div>
  );
}
