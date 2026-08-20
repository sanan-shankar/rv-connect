// A curated, offline gazetteer of cities where RV alumni are likely to be,
// mapping a normalized city name to [lng, lat]. Keys are lowercased; common
// variants (Bangalore/Bengaluru, Gurgaon/Gurugram) both included.
//
// SCOPE (revised 2026-07-30, the Gurgaon/Northfield fix): this table is no
// longer the map's only geocoder, just its fast middle layer for legacy
// free-typed rows. The resolution ladder for a UserPlace is (1) the row's own
// lat/lng, written by the GeoNames LocationPicker; (2) this table; (3) the
// 234,934-row Place gazetteer via src/lib/geocode.ts. A place this table
// cannot represent (the several US Northfields need an admin1 dimension a
// flat name key does not have) is NOT a failure here -- it falls through to
// the layers that can. Misses after all three are console.warned in dev by
// the map's buildPins, never silently dropped.

export const CITY_COORDS: Record<string, [number, number]> = {
  // India
  bengaluru: [77.59, 12.97],
  bangalore: [77.59, 12.97],
  chennai: [80.27, 13.08],
  madras: [80.27, 13.08],
  mumbai: [72.88, 19.08],
  bombay: [72.88, 19.08],
  "new delhi": [77.21, 28.61],
  delhi: [77.21, 28.61],
  hyderabad: [78.49, 17.38],
  kolkata: [88.36, 22.57],
  calcutta: [88.36, 22.57],
  pune: [73.86, 18.52],
  ahmedabad: [72.57, 23.02],
  jaipur: [75.79, 26.91],
  chandigarh: [76.78, 30.73],
  kochi: [76.27, 9.93],
  cochin: [76.27, 9.93],
  thiruvananthapuram: [76.95, 8.52],
  coimbatore: [76.96, 11.02],
  mysuru: [76.64, 12.3],
  mysore: [76.64, 12.3],
  goa: [73.83, 15.5],
  panaji: [73.83, 15.5],
  "rishi valley": [78.45, 13.63],
  madanapalle: [78.5, 13.55],
  tirupati: [79.42, 13.63],
  visakhapatnam: [83.22, 17.69],
  vijayawada: [80.65, 16.51],
  nagpur: [79.09, 21.15],
  lucknow: [80.95, 26.85],
  indore: [75.86, 22.72],
  bhopal: [77.41, 23.26],
  dehradun: [78.03, 30.32],
  shimla: [77.17, 31.1],
  guwahati: [91.74, 26.14],
  bhubaneswar: [85.82, 20.3],
  // NCR satellite towns. Their absence is what put the owner's Gurgaon
  // report in the Unmapped bucket: the table had Delhi but none of the
  // commuter cities half the NCR actually lives in.
  gurgaon: [77.03, 28.46],
  gurugram: [77.03, 28.46],
  noida: [77.39, 28.54],
  faridabad: [77.32, 28.41],
  ghaziabad: [77.45, 28.67],
  // Gulf
  dubai: [55.27, 25.2],
  "abu dhabi": [54.37, 24.45],
  doha: [51.53, 25.29],
  "muscat": [58.41, 23.59],
  riyadh: [46.72, 24.71],
  // UK + Europe
  london: [-0.13, 51.51],
  manchester: [-2.24, 53.48],
  edinburgh: [-3.19, 55.95],
  cambridge: [0.12, 52.21],
  oxford: [-1.26, 51.75],
  paris: [2.35, 48.86],
  berlin: [13.4, 52.52],
  amsterdam: [4.9, 52.37],
  zurich: [8.54, 47.37],
  // North America
  "new york": [-74.01, 40.71],
  "new york city": [-74.01, 40.71],
  nyc: [-74.01, 40.71],
  "san francisco": [-122.42, 37.77],
  "bay area": [-122.27, 37.8],
  boston: [-71.06, 42.36],
  seattle: [-122.33, 47.61],
  chicago: [-87.63, 41.88],
  "los angeles": [-118.24, 34.05],
  austin: [-97.74, 30.27],
  toronto: [-79.38, 43.65],
  vancouver: [-123.12, 49.28],
  // APAC + Australia
  singapore: [103.82, 1.35],
  "hong kong": [114.17, 22.32],
  tokyo: [139.69, 35.68],
  sydney: [151.21, -33.87],
  melbourne: [144.96, -37.81],
  auckland: [174.76, -36.85],
};

/**
 * Fold case, accents and whitespace, KEEPING any comma-qualified tail:
 * "Gurgáon " and "gurgaon" meet at one key, and "Northfield, Minnesota"
 * survives intact for lookups that can use the qualifier. NFKD splits each
 * accented letter into base + combining marks; stripping the marks (\p{M})
 * is what makes the fold spelling-insensitive without a lookup table.
 */
export function normalizePlaceString(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

/** Normalize a free-text city string to a short gazetteer key (the part
 *  before any comma: "Bengaluru, Karnataka" -> "bengaluru"). */
export function normalizeCity(raw: string): string {
  return normalizePlaceString(raw).replace(/,.*$/, "").trim();
}

export function cityCoords(raw: string | null | undefined): [number, number] | null {
  if (!raw) return null;
  // Qualified form first, so a future "x, y" key can win before the string
  // collapses to its ambiguous bare name; then the short key.
  return CITY_COORDS[normalizePlaceString(raw)] ?? CITY_COORDS[normalizeCity(raw)] ?? null;
}

/**
 * Every known spelling that resolves to the same place as the given city, so a
 * filter on "Bangalore" also catches "Bengaluru" (and vice versa). Always
 * includes the original input. Returns lowercased, deduped keys; callers should
 * compare case-insensitively. When the city is not in the gazetteer, the result
 * is just the normalized input itself.
 */
export function cityNameVariants(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const key = normalizeCity(raw);
  const variants = new Set<string>([key]);
  // Object.hasOwn, not a bare `CITY_COORDS[key]`: a filter value like
  // "constructor" or "__proto__" survives normalizeCity and would otherwise
  // return an inherited member (Object, Object.prototype) -- truthy, no
  // `.join` -- turning a member's `/directory?city=...` into an uncaught 500.
  const coords = Object.hasOwn(CITY_COORDS, key) ? CITY_COORDS[key] : undefined;
  if (coords) {
    const target = coords.join(",");
    for (const [name, c] of Object.entries(CITY_COORDS)) {
      if (c.join(",") === target) variants.add(name);
    }
  }
  return [...variants];
}

/**
 * Places that keep a pin of their own, whatever the grid says.
 *
 * buildPins buckets every location onto a ~0.1-degree grid so one city cannot
 * split into two stacked dots. That grid is 11 km wide, which is coarser than
 * the gap between Rishi Valley and Madanapalle (10.4 km), so the two shared a
 * square -- and because a square takes the name of the first member drawn into
 * it, and the map draws newest batch first, two 2023 members in Madanapalle
 * were naming the pin that residents of the valley landed in. The school is
 * the one place on this map that has to be able to speak for itself.
 *
 * A city listed here is keyed by name instead of by square. It still plots at
 * its exact coordinates, so the two pins land 10.4 km apart and the map's
 * existing supercluster merges them at low zoom and splits them as you zoom
 * in, which is the behaviour the grid was standing in for anyway.
 *
 * Keys are normalizeCity() output. Add to this only for a place whose identity
 * matters more than its distance from the nearest town; the grid is the right
 * default for everywhere else.
 */
export const OWN_PIN_CITIES = new Set(["rishi valley"]);

/** True when this city gets a pin of its own rather than sharing a grid square. */
export function hasOwnPin(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return OWN_PIN_CITIES.has(normalizeCity(raw));
}
