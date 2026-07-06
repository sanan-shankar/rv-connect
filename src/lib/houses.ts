/**
 * Rishi Valley house names.
 *
 * PLACEHOLDER LIST pending owner confirmation — the four names below (Krishna,
 * Cauvery, Ganga, Aditi) are the ones that recur as illustrative examples
 * across docs/spec/onboarding.md, docs/spec/directory.md, and docs/spec/profile.md,
 * but no spec doc actually locks a canonical, exhaustive list yet. Swap this
 * array for the real one when the owner provides it; every call site reads
 * from here, so it is a one-file change.
 */
export const HOUSES = ["Krishna", "Cauvery", "Ganga", "Aditi"] as const;

export type HouseName = (typeof HOUSES)[number];

export interface HouseYearEntry {
  year: number;
  house: string;
}
