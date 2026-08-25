/**
 * Cities the gazetteer lists twice and everybody means once.
 *
 * GeoNames has a row for Delhi (id 1273294, population 11,034,555) and a row
 * for New Delhi (id 1261481, population 317,797). They are 3.4km apart and to
 * anybody filling in this profile they are the same answer to the same
 * question. The picker ranks an exact name match first and then by population,
 * so typing "delhi" puts the eleven-million row at the top and that is the one
 * people press -- which is why the directory kept growing a second Delhi pin
 * next to the New Delhi one however many times the rows were merged by hand.
 *
 * Owner, 2026-08-22: "previously I had made an attempt to put delhi and new
 * delhi in the same place. it kinda worked and moved everyone to new delhi and
 * I thought in the future all people would just come under new delhi ... but
 * now few new people joined and they're showing up under delhi which shouldn't
 * be happening so clearly the previous agent didn't do a great job."
 *
 * It did not, and the reason is worth writing down: that was an UPDATE, and an
 * UPDATE fixes the rows that exist. This file is the rule instead. It is read
 * by the picker's search (so the aliased row is never offered) and by the one
 * function every writer runs a place through (so it cannot be written even by
 * a client that never saw the search), and those two together are what make it
 * hold for people who have not joined yet.
 *
 * Keyed by geonameid, never by name. "Delhi" is also a town in Ontario, one in
 * California and one in New York; collapsing by name would move somebody in
 * Delhi, Ontario to India. An id says exactly which row is meant.
 *
 * WHEN TO ADD A PAIR: only when the gazetteer holds two rows that one person
 * would reasonably give as one answer, and the owner has said which of the two
 * wins. Renames -- Bombay/Mumbai, Calcutta/Kolkata, Madras/Chennai,
 * Gurgaon/Gurugram -- are NOT this: GeoNames keeps one row and files the old
 * name under altNames, which the search already matches, so searching "bombay"
 * has always landed on the single Mumbai row. `scripts/dev/city-alias-scan.ts`
 * lists the candidates worth looking at; this file is where a confirmed one
 * goes to become permanent.
 */

/** New Delhi, Delhi, India -- the row every Delhi answer resolves to. */
const NEW_DELHI = 1261481;

/** Aliased gazetteer id -> the id it is written as. */
const BY_ID: ReadonlyMap<number, number> = new Map([
  [1273294, NEW_DELHI], // Delhi -> New Delhi
]);

/**
 * The same collapse for a place typed by hand rather than picked.
 *
 * The picker only offers free text when the gazetteer search returns nothing,
 * so this is not the usual road in -- but a search that fails on a dropped
 * connection returns nothing too, and the row it leaves behind has no
 * coordinates at all. Rewriting it to the canonical gazetteer row gives it
 * both a name everyone shares and a pin on the map.
 *
 * Matched on the bare city name, lowercased, which is the one place this file
 * risks a homonym. It is the risk the owner asked for in as many words ("it's
 * just a matter of what people think to type"), and the loser is a hypothetical
 * member in Delhi, Ontario who both typed it by hand and did so while the
 * search was down.
 */
const BY_TYPED_NAME: ReadonlyMap<string, number> = new Map([["delhi", NEW_DELHI]]);

/** The id a place should be stored under. Returns `id` unchanged if it is not aliased. */
export function canonicalPlaceId(id: number): number {
  return BY_ID.get(id) ?? id;
}

/**
 * The gazetteer id a hand-typed city should become, or null to leave it alone.
 * Reads only the part before the first comma, so "Delhi" and "Delhi, India"
 * are the same answer.
 */
export function canonicalIdForTypedCity(city: string): number | null {
  const bare = city.split(",")[0].trim().toLowerCase();
  return BY_TYPED_NAME.get(bare) ?? null;
}
