// Directory filter option lists (filters-rework.md sec 5.3). Thin, page-specific
// config layered on the shared taxonomy lib (houses.ts) and the shared
// FacetOption type. Neither City nor Profession is listed here: both are LIVE
// option sets fetched per-request in page.tsx -- city from the distinct
// `UserPlace.city` values, profession from the `User.professionTags` histogram
// with its floor and cap applied. A static list is only right for a vocabulary
// where every value is worth offering whether or not anybody is in it. Sort
// is not listed either: the owner removed the control on 2026-08-03 ("I think
// we just remove sorting"), and the server keeps its own default ordering.

import { HOUSES } from "@/lib/houses";
import type { FacetOption } from "@/components/common/filters/types";

export const HOUSE_OPTIONS: FacetOption[] = HOUSES.map((h) => ({ value: h, label: h }));

export const TYPE_OPTIONS: FacetOption[] = [
  { value: "alumni", label: "Alumni" },
  { value: "teachers", label: "Teachers" },
];
