/* ------------------------------------------------------------------ *
 *  The trivia gate room's time ranges, in a module of their own so the
 *  loading skeleton can draw the pills without importing the one file that
 *  reads the gate's tables (admin-trivia.ts).
 * ------------------------------------------------------------------ */

export const RANGES = [
  { key: "7", label: "7 days", days: 7, strip: 7 },
  { key: "30", label: "30 days", days: 30, strip: 30 },
  /* The retention sweep keeps a year, so "everything" is a year; its day-by-
     day strip stays a month, because 365 columns are not a chart a phone can
     draw. */
  { key: "all", label: "Everything", days: 365, strip: 30 },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

export function isRange(v: string | undefined): v is RangeKey {
  return RANGES.some((r) => r.key === v);
}
