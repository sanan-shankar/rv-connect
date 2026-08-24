import { cityFilterTargets } from "@/lib/city-coords";
// The one definition of the Postgres-only `mode: "insensitive"` gate (audit
// R6: this file used to carry its own copy, which is the drift-by-copy-paste
// pattern that produced M18 for real).
import { insensitive, escapeLike } from "@/lib/db-text";
import { parseBatchYear } from "@/lib/batch-year";

export type DirectoryFilters = {
  q?: string;
  year?: string;
  city?: string;
  profession?: string;
  house?: string;
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
  /* parseBatchYear, not Number(): `Number("abc")` is NaN, and NaN reached
     Prisma as `batchYear: NaN`, which throws and 500s the whole directory --
     a hand-edited or stale link took the page down rather than showing an
     unfiltered list (audit M23). Shared with /api/users-by-batch, which had
     the same class of hole from the other direction (Low 70). */
  const showingYear =
    filters.year === "faculty" ? "faculty" : parseBatchYear(filters.year);
  const yearFrom = parseBatchYear(filters.yearFrom);
  const yearTo = parseBatchYear(filters.yearTo);

  // deletionRequestedAt: an account inside its 60-day deletion grace window
  // (audit M35) leaves the directory immediately, exactly like a blocked one.
  const where: Record<string, unknown> = { isBlocked: false, deletionRequestedAt: null };
  if (filters.q) {
    const q = escapeLike(filters.q);
    where.OR = [
      { name: { contains: q, ...insensitive } },
      { workplace: { contains: q, ...insensitive } },
      { jobTitle: { contains: q, ...insensitive } },
      { places: { some: { city: { contains: q, ...insensitive } } } },
    ];
  }
  if (showingYear === "faculty") {
    where.accountType = { in: ["teacher", "ex_teacher"] };
  }
  /* One `batchYear` clause built from all three inputs, so they INTERSECT
     rather than overwrite (audit Low 73). The range used to be assigned second
     and simply clobbered an exact year picked from a batch tile, while the UI
     went on rendering both as active filter tokens: the member could see two
     filters and was getting one. Contradictory inputs (year 1990 inside the
     range 2000-2010) now return nothing, which is honest and legible, because
     both tokens are on screen to explain it. */
  const batchYear: Record<string, number> = {};
  if (typeof showingYear === "number") batchYear.equals = showingYear;
  if (yearFrom !== null) batchYear.gte = yearFrom;
  if (yearTo !== null) batchYear.lte = yearTo;
  if (Object.keys(batchYear).length > 0) where.batchYear = batchYear;
  if (filters.city) {
    // A person counts for a city filter if ANY of their (unlimited) cities
    // match -- not just a primary one -- so this is a `places.some` EXISTS,
    // not an equality on a single column.
    /* The picked value first, then the folded variants -- see
       cityFilterTargets, which is where the reasoning lives. */
    const variants = cityFilterTargets(filters.city);
    const targets = variants.length > 0 ? variants : [filters.city];
    /* `equals`, not `contains` (audit Low 69). This is a FILTER -- the value
       comes from a city already on somebody's profile, chosen from a chip or a
       tile -- and a substring match made it quietly wider than the label it
       shows: filtering Delhi also returned everyone in New Delhi, so the two
       cities could never be told apart on the one page whose job is telling
       people apart. `cityNameVariants` is what handles the genuinely different
       names for one place (Bangalore/Bengaluru); a substring was never the
       right instrument for that either. */
    where.places = {
      some: { OR: targets.map((v) => ({ city: { equals: v, ...insensitive } })) },
    };
  }
  if (filters.profession) where.workplace = filters.profession;
  // escapeLike like every other free-text contains: an unescaped "%" or "_" in
  // the URL param would otherwise reach Postgres as a live LIKE wildcard and
  // silently widen the filter (the last of the ~18 contains sites to get this).
  // Case-sensitivity is left exactly as it was -- only the wildcard escaping changes.
  /* `contains` stays here, unlike the city filter above: `houses` is a JSON
     string of [{year, house}] rows, so a substring is the only instrument
     without parsing the column in SQL. Checked against the canonical list in
     lib/houses.ts: no house name is a substring of another, and the only other
     values in the blob are numeric years, so this cannot match the wrong
     house (audit Low 69). */
  if (filters.house) where.houses = { contains: escapeLike(filters.house) };
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
    /* `nulls: "last"` on every batch sort (audit M38). Postgres orders NULLs
       FIRST on a DESC column, so "Batch: newest first" opened with everybody
       who has NO batch year at all -- teachers and half-finished profiles
       ahead of the newest batch -- which is the opposite of what the label
       promises. Spelled out on ASC too, where Postgres already does this, so
       the two sorts read as one decision rather than one rule and one
       accident. */
    case "batch-asc":
      return [
        { batchYear: { sort: "asc" as const, nulls: "last" as const } },
        { name: "asc" as const },
        { id: "asc" as const },
      ];
    case "batch-desc":
      return [
        { batchYear: { sort: "desc" as const, nulls: "last" as const } },
        { name: "asc" as const },
        { id: "asc" as const },
      ];
    default:
      return [
        { createdAt: "desc" as const },
        { batchYear: { sort: "desc" as const, nulls: "last" as const } },
        { id: "asc" as const },
      ];
  }
}
