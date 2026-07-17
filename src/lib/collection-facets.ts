// Collection filter option lists (filters-rework.md sec 6.3). Reuses the
// upload-time taxonomy from src/lib/collection.ts, but the filter's "unknown"
// row reads "Undated" (upload's "Not sure" phrasing is about the contributor's
// certainty; the filter is about the photo's actual state).
//
// "Part of school" has NO static option list: the upload form's `area` field
// was changed to free text in the same 2026-07-18 rework this spec assumed a
// fixed 4-value picklist for (src/lib/validators.ts photoSchema comment). A
// fixed-enum equality filter would silently stop matching any newly
// contributed photo, so this facet instead uses live distinct `Photo.area`
// values (page.tsx) with a `contains` match, the same live-option pattern as
// Directory's City facet.

import { ERAS } from "@/lib/collection";
import type { FacetOption } from "@/components/common/filters/types";

export const WHEN_OPTIONS: FacetOption[] = ERAS.map((e) => ({
  value: e.value,
  label: e.value === "unknown" ? "Undated" : e.label,
}));

export const COLLECTION_SORT_OPTIONS: FacetOption[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "loved", label: "Most loved" },
  { value: "wander", label: "A wander" },
];
