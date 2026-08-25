import { z } from "zod/v4";
import { canonicalIdForTypedCity, canonicalPlaceId } from "./place-aliases.ts";

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

const placeSchema = z.object({
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
 * A gazetteer row, as much of it as anyone shaping a place needs.
 *
 * `resolvePlaces` takes a lookup returning these rather than the bare set of
 * ids it used to, because verifying an id is only half the job now: a place
 * that gets rewritten to its canonical row (see place-aliases.ts) has to
 * carry that row's name and coordinates too, or the label still says Delhi
 * and the map still puts a pin 3.4km from the one it was merged into.
 */
export interface GazetteerPlace {
  id: number;
  name: string;
  admin1: string | null;
  country: string;
  lat: number;
  lng: number;
}

// Built once (locale-only, not request-dependent) rather than per call.
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * The one display string for a gazetteer row: "Name, Admin1" in India,
 * "Name, Admin1, Country" everywhere else.
 *
 * Lives here rather than in the search route because the route is no longer
 * the only thing that builds one -- a place rewritten to its canonical row
 * needs the canonical row's label, and two functions formatting the same
 * string two ways is how "New Delhi, Delhi" and "New Delhi" end up as two
 * entries in the directory's own list.
 */
export function formatPlaceLabel(row: {
  name: string;
  admin1: string | null;
  country: string;
}): string {
  const parts = [row.name];
  if (row.admin1) parts.push(row.admin1);
  if (row.country !== "IN") {
    let country = row.country;
    try {
      country = regionNames.of(row.country) ?? row.country;
    } catch {
      /* an invalid code prints as the code */
    }
    parts.push(country);
  }
  return parts.join(", ");
}

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
 * dropped, collapsed onto their canonical city, deduplicated, and any
 * `placeId` that does not name a real gazetteer row nulled.
 *
 * The nulling is not cosmetic. The writers create every UserPlace inside one
 * `$transaction`, so a single foreign key violation aborts the whole save and
 * the member loses all their places rather than one bad coordinate. Degrading
 * an unknown id to a free-typed place keeps what they actually wrote.
 *
 * The collapsing is the durable half of the Delhi/New Delhi fix (see
 * place-aliases.ts). It happens HERE, in the function every writer shares,
 * rather than in the picker alone: the picker is a suggestion and this is the
 * gate. A client that never saw the search -- an old tab, the admin editor, a
 * hand-made request -- cannot write a place this does not agree to.
 *
 * The dedupe follows from it: someone who listed both Delhi and New Delhi
 * before today has two rows that are now the same row, and a profile reading
 * "New Delhi, New Delhi" would be a worse answer than the one it replaced.
 * Keyed on the canonical id where there is one and the lowercased city where
 * there is not, first mention wins, so the order the member chose survives.
 */
export async function resolvePlaces(
  places: PlaceInput[],
  titleCase: (s: string) => string,
  lookupPlaces: (ids: number[]) => Promise<Map<number, GazetteerPlace>>
): Promise<Array<PlaceInput & { label: string; city: string }>> {
  const cleaned = places
    .map((p) => ({ ...p, label: titleCase(p.label), city: titleCase(p.city) }))
    .filter((p) => p.label.length > 0);

  /* Every id worth asking about in ONE query: the ids as given (still needed,
     since an id that names no row is degraded rather than trusted) and the
     canonical id of anything aliased, whether it arrived as an id or as typed
     text. A place already sitting on its canonical row asks for nothing extra. */
  const wanted = new Set<number>();
  for (const p of cleaned) {
    if (p.placeId != null) {
      wanted.add(p.placeId);
      wanted.add(canonicalPlaceId(p.placeId));
    } else {
      const typed = canonicalIdForTypedCity(p.city);
      if (typed != null) wanted.add(typed);
    }
  }
  const rows = wanted.size > 0 ? await lookupPlaces([...wanted]) : new Map<number, GazetteerPlace>();

  const seen = new Set<string>();
  const out: Array<PlaceInput & { label: string; city: string }> = [];

  for (const p of cleaned) {
    /* An id only counts once the gazetteer confirms it; an unconfirmed one
       becomes free text, exactly as before. Only then is the alias applied,
       and only if the canonical row is confirmed too -- rewriting onto a row
       that is not there would trade a wrong pin for a foreign key error. */
    const given = p.placeId != null && rows.has(p.placeId) ? p.placeId : null;
    const target =
      given != null ? canonicalPlaceId(given) : (canonicalIdForTypedCity(p.city) ?? null);
    const canonical = target != null ? rows.get(target) : undefined;

    const resolved =
      canonical && target !== given
        ? {
            ...p,
            placeId: canonical.id,
            city: canonical.name,
            label: formatPlaceLabel(canonical),
            lat: canonical.lat,
            lng: canonical.lng,
          }
        : { ...p, placeId: given };

    const key = resolved.placeId != null ? `#${resolved.placeId}` : resolved.city.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(resolved);
  }

  return out;
}

/**
 * The legacy city columns, mirrored from the places list.
 *
 * `User.currentCity` and `User.secondaryCity` predate UserPlace and are still
 * read: by the directory, by the profile's fallback while a member's places
 * list is empty, and by the account export. Both writers used to mirror only
 * the FIRST place and leave `secondaryCity` alone, so a member who had one
 * from before the migration and then cleared every place got `currentCity`
 * nulled while the profile's fallback resurrected the stale second city --
 * a place they had just deleted, back on their page (audit C-101).
 *
 * Written here, once, because two actions do this and the whole bug was that
 * they each mirrored half of it. Positional, matching the list's own order.
 */
export function legacyCityColumns(
  cleaned: Array<{ label: string }>
): { currentCity: string | null; secondaryCity: string | null } {
  return {
    currentCity: cleaned[0]?.label ?? null,
    secondaryCity: cleaned[1]?.label ?? null,
  };
}
