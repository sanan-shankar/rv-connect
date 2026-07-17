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
  profession?: string;
  house?: string;
  openTo?: string;
  type?: string; // "alumni" | "teachers"
  sort?: string;
  yearFrom?: string;
  yearTo?: string;
};

/**
 * Build the Prisma `where` for the directory from a set of filters. Shared by the
 * server page (first SSR page) and the Load more server action so both pages of a
 * result set are filtered identically. City filtering matches ANY of a person's
 * `UserPlace` cities (not just a primary/secondary pair) and search is
 * case-insensitive where the provider allows it.
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
      { workplace: { contains: filters.q, ...insensitive } },
      { jobTitle: { contains: filters.q, ...insensitive } },
      { openTo: { contains: filters.q, ...insensitive } },
      { places: { some: { city: { contains: filters.q, ...insensitive } } } },
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
    // A person counts for a city filter if ANY of their (unlimited) cities
    // match -- not just a primary one -- so this is a `places.some` EXISTS,
    // not an equality on a single column.
    const variants = cityNameVariants(filters.city);
    const targets = variants.length > 0 ? variants : [filters.city];
    where.places = {
      some: { OR: targets.map((v) => ({ city: { contains: v, ...insensitive } })) },
    };
  }
  if (filters.profession) where.workplace = filters.profession;
  if (filters.house) where.houses = { contains: filters.house };
  if (filters.openTo) where.openTo = { contains: filters.openTo };
  if (filters.type === "alumni") {
    where.accountType = "alumnus";
  } else if (filters.type === "teachers") {
    where.accountType = { in: ["teacher", "ex_teacher"] };
  }
  return where;
}

/**
 * "Best match" and "Newest" share the same honest default order (createdAt
 * desc, then batch desc). A true prefix/relevance rank over `q` is a backlog
 * item -- the old "relevance" sort this replaces never actually implemented
 * one either, so this is not a regression, just an honest label.
 */
export function directoryOrderBy(sort?: string) {
  switch (sort) {
    case "name-asc":
      return [{ name: "asc" as const }, { id: "asc" as const }];
    case "name-desc":
      return [{ name: "desc" as const }, { id: "asc" as const }];
    case "batch-asc":
      return [{ batchYear: "asc" as const }, { name: "asc" as const }, { id: "asc" as const }];
    case "batch-desc":
      return [{ batchYear: "desc" as const }, { name: "asc" as const }, { id: "asc" as const }];
    default:
      return [
        { createdAt: "desc" as const },
        { batchYear: "desc" as const },
        { id: "asc" as const },
      ];
  }
}
