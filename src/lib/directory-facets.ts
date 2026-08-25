// Directory filter option lists (filters-rework.md sec 5.3). Thin, page-specific
// config layered on the shared taxonomy libs (professions.ts, houses.ts)
// and the shared FacetOption type. City is not listed here: its options are the
// live distinct `UserPlace.city` values, fetched per-request in page.tsx. Sort
// is not listed either: the owner removed the control on 2026-08-03 ("I think
// we just remove sorting"), and the server keeps its own default ordering.

import { PROFESSIONS } from "@/lib/professions";
import { HOUSES } from "@/lib/houses";
import type { FacetOption } from "@/components/common/filters/types";

export const PROFESSION_OPTIONS: FacetOption[] = PROFESSIONS.map((p) => ({ value: p, label: p }));

export const HOUSE_OPTIONS: FacetOption[] = HOUSES.map((h) => ({ value: h, label: h }));

export const TYPE_OPTIONS: FacetOption[] = [
  { value: "alumni", label: "Alumni" },
  { value: "teachers", label: "Teachers" },
];
