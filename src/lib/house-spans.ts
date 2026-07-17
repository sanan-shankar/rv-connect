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

/** Parse the raw `houses` JSON and collapse same-house runs into year spans. */
export function parseHouseSpans(raw: string | null | undefined): HouseSpan[] {
  if (!raw) return [];
  let entries: HouseYearEntry[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    entries = parsed
      .filter(
        (e): e is HouseYearEntry =>
          e && typeof e.house === "string" && e.house.trim() !== "" && Number.isFinite(Number(e.year))
      )
      .map((e) => ({ year: Number(e.year), house: e.house.trim() }));
  } catch {
    return [];
  }
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
