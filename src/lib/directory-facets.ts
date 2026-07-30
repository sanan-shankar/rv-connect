// Directory filter option lists (filters-rework.md sec 5.3). Thin, page-specific
// config layered on the shared taxonomy libs (professions.ts, houses.ts)
// and the shared FacetOption type. City is not listed here: its options are the
// live distinct `UserPlace.city` values, fetched per-request in page.tsx.

import { PROFESSIONS } from "@/lib/professions";
import { HOUSES } from "@/lib/houses";
import type { FacetOption } from "@/components/common/filters/types";

export const PROFESSION_OPTIONS: FacetOption[] = PROFESSIONS.map((p) => ({ value: p, label: p }));

export const HOUSE_OPTIONS: FacetOption[] = HOUSES.map((h) => ({ value: h, label: h }));

export const TYPE_OPTIONS: FacetOption[] = [
  { value: "alumni", label: "Alumni" },
  { value: "teachers", label: "Teachers" },
];

const SORT_OPTIONS: FacetOption[] = [
  { value: "newest", label: "Newest" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "batch-desc", label: "Batch: newest first" },
  { value: "batch-asc", label: "Batch: oldest first" },
];

/** "Best match" only appears (and is the honest default) once a search is typed. */
export function directorySortOptions(hasQuery: boolean): FacetOption[] {
  return hasQuery ? [{ value: "best-match", label: "Best match" }, ...SORT_OPTIONS] : SORT_OPTIONS;
}

export function directoryDefaultSort(hasQuery: boolean): string {
  return hasQuery ? "best-match" : "newest";
}
