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

/** One row per academic year in the houses editor: the year(s) a person was
 *  in each house, with more than one house allowed for the same year (the
 *  owner explicitly wants that allowed -- someone who switched houses
 *  mid-year, or misremembers which one). */
export interface HouseYearRow {
  year: number;
  houses: string[];
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

/** Group raw `{year, house}` entries into one row per academic year, each
 *  holding every house recorded for that year (deduped, first-seen order),
 *  sorted by year. The inverse of flattening back to `HouseYearEntry[]` for
 *  save is a simple `rows.flatMap(r => r.houses.map(house => ({year: r.year, house})))`. */
export function groupHouseYearEntries(entries: HouseYearEntry[]): HouseYearRow[] {
  const byYear = new Map<number, string[]>();
  for (const e of entries) {
    if (!e.house || !Number.isFinite(e.year)) continue;
    const houses = byYear.get(e.year) ?? [];
    if (!houses.includes(e.house)) houses.push(e.house);
    byYear.set(e.year, houses);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, houses]) => ({ year, houses }));
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
 * this): prefer the full known academic-year range (yearJoined..yearLeft)
 * every time it's known, so a partially-filled attempt still shows the whole
 * skeleton on the next visit -- not just the one row that happened to get a
 * house picked before the last save. Any already-saved house lands in its
 * matching row; saved years outside the known range (the range guess being
 * wrong, or a stray edit) still show up too, appended in year order. Falls
 * back to exactly what's saved when the range isn't known at all.
 */
export function seedHouseYearRows(
  raw: string | null | undefined,
  yearJoined: number | null,
  yearLeft: number | null
): HouseYearRow[] {
  const saved = groupHouseYearEntries(parseHouseYearEntries(raw));
  if (yearJoined == null || yearLeft == null || yearLeft < yearJoined) return saved;

  const byYear = new Map(saved.map((r) => [r.year, r.houses]));
  const rows: HouseYearRow[] = [];
  for (let y = yearJoined; y <= yearLeft; y++) {
    rows.push({ year: y, houses: byYear.get(y) ?? [] });
    byYear.delete(y);
  }
  const extra = [...byYear.entries()].map(([year, houses]) => ({ year, houses }));
  return [...rows, ...extra].sort((a, b) => a.year - b.year);
}

/** Parse the raw `houses` JSON and collapse same-house runs into year spans. */
export function parseHouseSpans(raw: string | null | undefined): HouseSpan[] {
  const entries = parseHouseYearEntries(raw);
  if (entries.length === 0) return [];

  entries.sort((a, b) => a.year - b.year);

  const spans: HouseSpan[] = [];
  for (const entry of entries) {
    const last = spans[spans.length - 1];
    // Collapse a same-house run into one span; a different house naturally
    // opens a new span even across a repeated or skipped year.
    if (last && last.house.toLowerCase() === entry.house.toLowerCase() && entry.year >= last.toYear) {
      last.toYear = entry.year;
    } else {
      spans.push({ house: entry.house, fromYear: entry.year, toYear: entry.year });
    }
  }
  return spans;
}
