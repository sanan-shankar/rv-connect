import { z } from "zod/v4";

/**
 * The shape of a place a member claims: on sign-up, in settings, and when an
 * admin edits somebody's row.
 *
 * All three used to take the array on faith. `updateUserPlaces` and
 * `adminUpdatePlaces` had no schema at all: no cap on label or city (so a
 * multi-megabyte string could ride the 25MB Server Action body limit straight
 * into a column), no bounds or finiteness check on lat/lng, no check that
 * placeId pointed at a real row, and a bare `.map(p => p.label.trim())` that
 * threw a raw TypeError on any payload whose elements were not objects with
 * string labels (audit B-111). This matters more than it sounds: `label` is
 * mirrored into User.currentCity, which the directory serialises for every
 * viewer, and lat/lng feed the map's cluster maths.
 *
 * Extracted here so all three writers share one definition and a unit test can
 * reach it.
 */

/** How many places one member may list. */
export const MAX_PLACES = 30;

export const placeSchema = z.object({
  // The gazetteer row this came from, when it came from the gazetteer at all;
  // a free-typed place has none. Verified against the table by the callers
  // before it is written, because an unknown id aborts the whole transaction
  // on a foreign key rather than degrading to a free-typed place.
  placeId: z.number().int().positive().nullable(),
  label: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(160),
  // Real coordinates or nothing. The bounds also exclude NaN and both
  // infinities, since neither compares inside a range.
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

export const placesSchema = z.array(placeSchema).max(MAX_PLACES);

export type PlaceInput = z.infer<typeof placeSchema>;

/**
 * Parse a places payload from a client call. Returns the rows or a sentence to
 * show, never throws: these arrive from server actions whose contract is a
 * loose `{ error }`.
 */
export function parsePlaces(
  input: unknown
): { ok: true; places: PlaceInput[] } | { ok: false; error: string } {
  const parsed = placesSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error:
        issue.path.length > 0
          ? `That place list is not valid (${issue.path.join(".")}: ${issue.message}).`
          : "That place list is not valid.",
    };
  }
  return { ok: true, places: parsed.data };
}

/**
 * The rows as they should be written: validated, title-cased, blank labels
 * dropped, and any `placeId` that does not name a real gazetteer row nulled.
 *
 * The nulling is not cosmetic. The writers create every UserPlace inside one
 * `$transaction`, so a single foreign key violation aborts the whole save and
 * the member loses all their places rather than one bad coordinate. Degrading
 * an unknown id to a free-typed place keeps what they actually wrote.
 */
export async function resolvePlaces(
  places: PlaceInput[],
  titleCase: (s: string) => string,
  knownPlaceIds: (ids: number[]) => Promise<Set<number>>
): Promise<Array<PlaceInput & { label: string; city: string }>> {
  const cleaned = places
    .map((p) => ({ ...p, label: titleCase(p.label), city: titleCase(p.city) }))
    .filter((p) => p.label.length > 0);

  const ids = [...new Set(cleaned.map((p) => p.placeId).filter((id): id is number => id != null))];
  const known = ids.length > 0 ? await knownPlaceIds(ids) : new Set<number>();

  return cleaned.map((p) => ({
    ...p,
    placeId: p.placeId != null && known.has(p.placeId) ? p.placeId : null,
  }));
}
