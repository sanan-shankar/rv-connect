import { prisma } from "@/lib/prisma";
import { DirectoryClient } from "@/components/directory/directory-client";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; year?: string; city?: string }>;
}) {
  const params = await searchParams;

  // Build where clause
  const where: Record<string, unknown> = {
    isBlocked: false,
  };

  if (params.q) {
    where.name = { contains: params.q };
  }
  if (params.type && params.type !== "all") {
    where.batchType = params.type;
  }
  if (params.year) {
    where.batchYear = Number(params.year);
  }
  if (params.city) {
    where.currentCity = params.city;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      avatarColor: true,
      batchType: true,
      batchYear: true,
      currentCity: true,
      jobTitle: true,
    },
    orderBy: [{ batchYear: "desc" }, { name: "asc" }],
    take: 100,
  });

  // Get filter options
  const [batchYears, cities] = await Promise.all([
    prisma.user.findMany({
      where: { isBlocked: false },
      select: { batchYear: true },
      distinct: ["batchYear"],
      orderBy: { batchYear: "desc" },
    }),
    prisma.user.findMany({
      where: { isBlocked: false, currentCity: { not: null } },
      select: { currentCity: true },
      distinct: ["currentCity"],
      orderBy: { currentCity: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-heading text-3xl font-bold text-foreground">
        Alumni Directory
      </h1>
      <DirectoryClient
        users={users}
        batchYears={batchYears.map((b) => b.batchYear)}
        cities={cities.map((c) => c.currentCity!).filter(Boolean)}
        initialFilters={{
          q: params.q || "",
          type: params.type || "all",
          year: params.year || "",
          city: params.city || "",
        }}
      />
    </div>
  );
}
