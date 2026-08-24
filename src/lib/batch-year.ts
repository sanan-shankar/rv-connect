/* ------------------------------------------------------------------ *
 *  One reader for a batch year that arrived from a URL.
 *
 *  Its own module because two very different surfaces need the same
 *  answer -- the directory's filters and the batch-roster API -- and
 *  they were each doing their own arithmetic on untrusted text. Both
 *  got it wrong in the same family of ways: `Number("abc")` is NaN and
 *  reached Prisma as `batchYear: NaN`, which throws and 500s the page
 *  (audit M23); `Number("1.5")` is 1.5, which is truthy, survives a
 *  `filter(Boolean)` and then fails an Int column (audit Low 70).
 *
 *  No relative value imports, so `node --test` can load it.
 * ------------------------------------------------------------------ */

/**
 * The window a batch year may fall in.
 *
 * The school opened in 1926, so nothing earlier is a batch. The upper bound is
 * deliberately generous rather than tied to the current year: a leaving year
 * can honestly be a few years ahead for somebody still at school, and a filter
 * is not the place to enforce a rule the profile form owns. Anything outside
 * is not a year somebody mistyped, it is a value nobody meant.
 */
export const FIRST_BATCH_YEAR = 1926;
export const LAST_BATCH_YEAR = 2100;

/**
 * A batch year, or null for anything that is not one. Never NaN.
 *
 * Text has to be plain decimal digits before `Number` is allowed near it.
 * `Number` accepts a lot that no URL ever honestly means -- "0x7d0" is 2000,
 * "1e3" is 1000, " 12 " is 12 -- and a filter that quietly agrees with a
 * hand-crafted hex year is a filter nobody can reason about. A number handed
 * in directly is checked the same way, minus the spelling.
 */
export function parseBatchYear(raw: string | number | undefined | null): number | null {
  if (raw === null || raw === undefined) return null;
  let n: number;
  if (typeof raw === "number") {
    n = raw;
  } else {
    const text = raw.trim();
    if (!/^\d+$/.test(text)) return null;
    n = Number(text);
  }
  if (!Number.isInteger(n) || n < FIRST_BATCH_YEAR || n > LAST_BATCH_YEAR) return null;
  return n;
}

/** The same rule over a comma-separated list, de-duplicated and order-preserving. */
export function parseBatchYearList(raw: string | undefined | null): number[] {
  if (!raw) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const part of raw.split(",")) {
    const year = parseBatchYear(part.trim());
    if (year === null || seen.has(year)) continue;
    seen.add(year);
    out.push(year);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 *  The years somebody gives about themselves have to be possible.
 *
 *  Two writers ask for the same four numbers -- signup and the profile
 *  editor -- and they disagreed. The editor refused a batch year earlier than
 *  the year you left, calling it what it is (the two fields swapped); signup
 *  accepted it, and then `batchTypeFromLeaving` returned null for exactly that
 *  pair, so the row was written with no batch type at all: excluded from every
 *  batch-targeted post and mis-joined to the batch group, silently, with no
 *  way for the member to see why (bug-report-2 C-043).
 *
 *  One rule, imported by both, so they cannot drift apart again. The messages
 *  are the editor's, verbatim: they were the ones written for a member to
 *  read.
 * ------------------------------------------------------------------ */

export type MemberYears = {
  batchYear?: number | null;
  yearJoined?: number | null;
  yearLeft?: number | null;
  taughtFrom?: number | null;
  taughtUntil?: number | null;
};

/** What is wrong with this set of years, in the member's own terms, or null. */
export function yearClashMessage(y: MemberYears): string | null {
  if (y.yearJoined && y.yearLeft && y.yearLeft < y.yearJoined) {
    return "You cannot have left before you joined. Check the other year too.";
  }
  if (y.yearLeft && y.batchYear && y.batchYear < y.yearLeft) {
    return "Your batch year cannot be before the year you left. Check the other year too.";
  }
  if (y.taughtFrom && y.taughtUntil && y.taughtUntil < y.taughtFrom) {
    return "Your teaching cannot have ended before it began. Check the other year too.";
  }
  return null;
}
