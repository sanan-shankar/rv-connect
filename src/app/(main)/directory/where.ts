import { cityFilterTargets } from "@/lib/city-coords";
// The one definition of the Postgres-only `mode: "insensitive"` gate (audit
// R6: this file used to carry its own copy, which is the drift-by-copy-paste
// pattern that produced M18 for real).
import { insensitive, escapeLike } from "@/lib/db-text";
import { parseBatchYear } from "@/lib/batch-year";

/**
 * The three account types the schema allows (`User.accountType`), split the
 * one way the directory ever asks about them.
 *
 * Named here rather than written out at each site because four separate
 * clauses now narrow on them and they have to agree; the pair is exhaustive,
 * so an intersection over them can never be surprised by a fourth value.
 */
const FACULTY_TYPES = ["teacher", "ex_teacher"];
const NON_FACULTY_TYPES = ["alumnus"];

export type DirectoryFilters = {
  q?: string;
  year?: string;
  city?: string | string[];
  profession?: string;
  house?: string;
  type?: string; // "alumni" | "teachers"
  sort?: string;
  yearFrom?: string;
  yearTo?: string;
};

/**
 * The three year inputs, parsed once.
 *
 * parseBatchYear, not Number(): `Number("abc")` is NaN, and NaN reached Prisma
 * as `batchYear: NaN`, which throws and 500s the whole directory -- a
 * hand-edited or stale link took the page down rather than showing an
 * unfiltered list (audit M23). Shared with /api/users-by-batch, which had the
 * same class of hole from the other direction (Low 70).
 *
 * EXPORTED, because the page derived its own copy with bare `Number()` and the
 * two disagreed about anything the parser rejects (audit C-099).
 * `?year=1800` is truthy to Number, so the page set a filter token, called
 * itself filtered and headed the grid "Batch of '00" -- while the where added
 * no batchYear clause at all and returned the entire membership under it. One
 * parser, one answer, on both sides.
 */
export function parseDirectoryYears(filters: DirectoryFilters): {
  showingYear: "faculty" | number | null;
  yearFrom: number | null;
  yearTo: number | null;
} {
  return {
    showingYear: filters.year === "faculty" ? "faculty" : parseBatchYear(filters.year),
    yearFrom: parseBatchYear(filters.yearFrom),
    yearTo: parseBatchYear(filters.yearTo),
  };
}

/**
 * Build the Prisma `where` for the directory from a set of filters. Shared by the
 * server page (first SSR page) and the Load more server action so both pages of a
 * result set are filtered identically. City filtering matches ANY of a person's
 * `UserPlace` cities (not just a primary/secondary pair) and search is
 * case-insensitive: Postgres, and only Postgres, since 2026-07-01 (db-text.ts).
 */
export function buildDirectoryWhere(filters: DirectoryFilters): Record<string, unknown> {
  const { showingYear, yearFrom, yearTo } = parseDirectoryYears(filters);

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
  /* accountType from BOTH inputs, folded once (audit C-093).
     The faculty tile set it here and `filters.type` overwrote it further down,
     unconditionally, so year=faculty + type=alumni always resolved to plain
     alumni -- while the UI went on rendering both tokens as active and headed
     the grid "Faculty". Same clobber Low 73 fixed for batchYear, from the
     other direction. Contradictory inputs now return nothing, which is honest
     and legible because both tokens are on screen to explain it. */
  const accountTypes: string[][] = [];
  if (showingYear === "faculty") accountTypes.push(FACULTY_TYPES);
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
  if (Object.keys(batchYear).length > 0) {
    where.batchYear = batchYear;
    /* And no faculty in a batch (audit C-095). `accountType` and `batchYear`
       are written independently by the admin editor, so flipping an alumnus to
       ex_teacher keeps whatever year the row already had. The batch TILE
       counts exclude faculty; this branch did not, so the tile said N and
       opening it listed N+k. The tile is the promise, so this side moves. */
    accountTypes.push(NON_FACULTY_TYPES);
  }
  if (filters.city) {
    // A person counts for a city filter if ANY of their (unlimited) cities
    // match -- not just a primary one -- so this is a `places.some` EXISTS,
    // not an equality on a single column.
    /* The picked value first, then the folded variants -- see
       cityFilterTargets, which is where the reasoning lives.

       SEVERAL cities, because a map pin is a 0.1-degree grid cell and two
       genuinely different towns can share one (audit C-098). The pin counted
       both and linked to whichever happened to be resolved first, so "See all
       N" opened a page showing a fraction of N. A normal chip or tile still
       sends exactly one value and reads exactly as before. */
    const picked = Array.isArray(filters.city) ? filters.city : [filters.city];
    const targets = [
      ...new Set(picked.flatMap((c) => {
        const variants = cityFilterTargets(c);
        return variants.length > 0 ? variants : [c];
      })),
    ];
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
  if (filters.profession) {
    /* A derived tag, matched exactly -- `professionTags` is a Postgres text[]
       written only by scripts/dev/tag-professions-*.mjs, and `has` is a `@>`
       containment against the GIN index on it.

       This replaces a case-insensitive contains over jobTitle then workplace,
       which was a stand-in for exactly this column and was marked provisional
       from the day it shipped. The contains was loose by construction (a
       workplace called "Lawson" answered a filter for Law) and it could only
       ever find the members whose free text happened to contain a bucket's
       own name. The vocabulary and the rules behind the values are in
       src/lib/profession-tags.ts.

       AND the reason `where.AND` is gone with it: that array existed solely so
       the contains' OR would not clobber `filters.q`'s (audits C-093, Low 73).
       One clause on one column needs no such arrangement, so the hazard is
       removed rather than managed.

       No `tagsOf()` on the way in, deliberately. A URL asking for a tag that
       no longer exists should return nothing and show a chip to clear, which
       is what an unmatched value does here anyway; mapping it through the
       legacy table would silently answer a DIFFERENT question than the chip
       on screen says it is answering. */
    where.professionTags = { has: filters.profession };
  }
  // escapeLike like every other free-text contains: an unescaped "%" or "_" in
  // the URL param would otherwise reach Postgres as a live LIKE wildcard and
  // silently widen the filter (the last of the ~18 contains sites to get this).
  // Case-sensitivity is left exactly as it was -- only the wildcard escaping changes.
  /* The house CONTROL is gone (owner, 2026-08-28: "remove filtering by
     house"); this arm stays so a bookmarked ?house= still returns the page it
     used to, with a chip on it to clear.
     `contains` stays here, unlike the city filter above: `houses` is a JSON
     string of [{year, house}] rows, so a substring is the only instrument
     without parsing the column in SQL. Checked against the canonical list in
     lib/houses.ts: no house name is a substring of another, and the only other
     values in the blob are numeric years, so this cannot match the wrong
     house (audit Low 69). */
  if (filters.house) where.houses = { contains: escapeLike(filters.house) };
  if (filters.type === "alumni") accountTypes.push(["alumnus"]);
  else if (filters.type === "teachers") accountTypes.push(FACULTY_TYPES);
  if (accountTypes.length > 0) {
    // The intersection of everything asked for. Two inputs that cannot both
    // be true leave an empty set, and an empty `in` matches nothing -- which
    // is the honest answer to "faculty who are alumni".
    const allowed = accountTypes.reduce((a, b) => a.filter((t) => b.includes(t)));
    where.accountType = { in: allowed };
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
