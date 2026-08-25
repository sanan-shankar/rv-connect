import type { HouseYearEntry } from "@/lib/houses";

/**
 * A collapsed run of consecutive years in the same house, e.g. Aravali 2014-17.
 * Server-safe (no "use client") so both the server profile page and the client
 * HousesChain can share the same parsing/collapsing logic.
 */
export interface HouseSpan {
  house: string;
  fromYear: number;
  toYear: number;
}

/**
 * A stored `{year, house}` entry names an ACADEMIC year: `year` is the
 * calendar year the academic year starts in, so `year: 2014` reads as
 * "2014-15", not literal 2014. Single label for a one-year stint, or the
 * compact span label for a multi-year run (e.g. `2014-18` for 2014 through
 * 2017, i.e. academic years 2014-15 through 2017-18). One function handles
 * both: a single year is just a span of length one.
 */
export function academicSpanLabel(fromYear: number, toYear: number): string {
  const endSuffix = String((toYear + 1) % 100).padStart(2, "0");
  return `${fromYear}-${endSuffix}`;
}

/** Parse the raw `houses` JSON into entries, silently ignoring malformed rows
 *  or invalid JSON (returns []) rather than throwing. */
export function parseHouseYearEntries(raw: string | null | undefined): HouseYearEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is HouseYearEntry =>
          e && typeof e.house === "string" && e.house.trim() !== "" && Number.isFinite(Number(e.year))
      )
      .map((e) => ({ year: Number(e.year), house: e.house.trim() }));
  } catch {
    return [];
  }
}

/**
 * Build the houses-editor row list (onboarding step + settings editor share
 * this): prefer the full known academic-year range [yearJoined, yearLeft)
 * every time it's known. The leaving year is the end of the last academic
 * year, so someone at school from 2014 to 2023 gets rows starting 2014 through
 * 2022. A partially-filled attempt still shows the whole skeleton on the next
 * visit -- not just the one row that happened to get a house picked before the
 * last save. Any already-saved house lands in its matching row. Saved years
 * outside the known range (the range guess being wrong, or a stray edit) still
 * show up too, appended in year order, except for an entry exactly at the
 * leaving-year boundary: that can only represent the old inclusive-range bug.
 * Falls back to exactly what's saved when the range isn't known at all.
 */
/** Parse the raw `houses` JSON and collapse same-house runs into year spans. */
export function parseHouseSpans(raw: string | null | undefined): HouseSpan[] {
  const entries = parseHouseYearEntries(raw);
  if (entries.length === 0) return [];

  entries.sort((a, b) => a.year - b.year);

  const spans: HouseSpan[] = [];
  for (const entry of entries) {
    const last = spans[spans.length - 1];
    // Collapse a same-house run into one span, but only across YEARS THE
    // PERSON ACTUALLY RECORDED as consecutive: `entry.year <= last.toYear + 1`
    // allows the next entry to repeat the last recorded year (a duplicate
    // row) or pick straight up the year after it, and nothing further out.
    // The old check was `entry.year >= last.toYear`, which -- since entries
    // are sorted ascending -- is true for every later same-house entry
    // regardless of gap, so Golden 2014, Golden 2015, (nothing recorded for
    // 2016), Golden 2017 collapsed into one "Golden 2014-18" span asserting a
    // year the member never actually said they were in that house (audit Low
    // 99). A skipped year now correctly opens a new span.
    if (
      last &&
      last.house.toLowerCase() === entry.house.toLowerCase() &&
      entry.year <= last.toYear + 1
    ) {
      last.toYear = Math.max(last.toYear, entry.year);
    } else {
      spans.push({ house: entry.house, fromYear: entry.year, toYear: entry.year });
    }
  }
  return spans;
}
