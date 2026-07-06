import { cityNameVariants } from "@/lib/city-coords";

// SQLite's Prisma adapter rejects `mode: "insensitive"`; only Postgres accepts
// it. SQLite `LIKE` is already case-insensitive for ASCII, so on SQLite we drop
// the flag. Detect the live provider the same way prisma.ts does.
const IS_POSTGRES = (process.env.DATABASE_URL ?? "").startsWith("postgres");
const insensitive = IS_POSTGRES ? ({ mode: "insensitive" } as const) : {};

export type DirectoryFilters = {
  q?: string;
  year?: string;
  city?: string;
  industry?: string;
  sort?: string;
  yearFrom?: string;
  yearTo?: string;
};

/**
 * Build the Prisma `where` for the directory from a set of filters. Shared by the
 * server page (first SSR page) and the Load more server action so both pages of a
 * result set are filtered identically. City filtering normalizes both sides
 * (Bangalore also matches Bengaluru) and search is case-insensitive where the
 * provider allows it.
 */
export function buildDirectoryWhere(filters: DirectoryFilters): Record<string, unknown> {
  const showingYear =
    filters.year === "faculty" ? "faculty" : filters.year ? Number(filters.year) : null;
  const yearFrom = filters.yearFrom ? Number(filters.yearFrom) : null;
  const yearTo = filters.yearTo ? Number(filters.yearTo) : null;

  const where: Record<string, unknown> = { isBlocked: false };
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, ...insensitive } },
      { currentCity: { contains: filters.q, ...insensitive } },
      { secondaryCity: { contains: filters.q, ...insensitive } },
      { workplace: { contains: filters.q, ...insensitive } },
      { jobTitle: { contains: filters.q, ...insensitive } },
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
  if (filters.city) {
    // A person counts for a city filter whether it's their primary or
    // secondary city, so both fields are checked against every known
    // spelling of the requested city.
    const variants = cityNameVariants(filters.city);
    const targets = variants.length > 0 ? variants : [filters.city];
    const cityOr = targets.flatMap((v) => [
      { currentCity: { contains: v, ...insensitive } },
      { secondaryCity: { contains: v, ...insensitive } },
    ]);
    where.AND = [...((where.AND as unknown[]) ?? []), { OR: cityOr }];
  }
  if (filters.industry) where.workplace = filters.industry;
  return where;
}

export function directoryOrderBy(sort?: string) {
  return sort === "name"
    ? [{ name: "asc" as const }, { id: "asc" as const }]
    : [
        { createdAt: "desc" as const },
        { batchYear: "desc" as const },
        { id: "asc" as const },
      ];
}
