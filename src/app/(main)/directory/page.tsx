import { prisma } from "@/lib/prisma";
import { DirectoryClient } from "@/components/directory/directory-client";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; year?: string; city?: string; industry?: string }>;
}) {
  const params = await searchParams;

  // If a year is selected, show users from that year
  const showingYear = params.year ? Number(params.year) : null;

  // Build where clause for user list
  const where: Record<string, unknown> = {
    isBlocked: false,
  };

  if (params.q) {
    where.name = { contains: params.q };
  }
  if (showingYear) {
    where.batchYear = showingYear;
  }
  if (params.city) {
    where.currentCity = params.city;
  }
  if (params.industry) {
    where.workplace = params.industry;
  }

  // Get all batch years with user counts for the grid
  const batchYearCounts = await prisma.user.groupBy({
    by: ["batchYear"],
    where: { isBlocked: false },
    _count: { id: true },
    orderBy: { batchYear: "desc" },
  });

  // Only fetch users if we have a filter active
  const hasFilter = !!(params.q || showingYear || params.city || params.industry);

  const users = hasFilter
    ? await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          avatarColor: true,
          batchType: true,
          batchYear: true,
          currentCity: true,
          jobTitle: true,
          workplace: true,
        },
        orderBy: [{ name: "asc" }],
        take: 100,
      })
    : [];

  // Get filter options
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
      <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
        Alumni Directory
      </h1>
      <p className="mb-8 text-muted-foreground">
        Find and reconnect with your batchmates.
      </p>
      <DirectoryClient
        users={users}
        batchYearCounts={batchYearCounts.map((b) => ({
          year: b.batchYear,
          count: b._count.id,
        }))}
        cities={cities.map((c) => c.currentCity!).filter(Boolean)}
        industries={industries.map((i) => i.workplace!).filter(Boolean)}
        initialFilters={{
          q: params.q || "",
          year: params.year || "",
          city: params.city || "",
          industry: params.industry || "",
        }}
        hasFilter={hasFilter}
      />
    </div>
  );
}
