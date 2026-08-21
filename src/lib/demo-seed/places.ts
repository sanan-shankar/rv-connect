/* ------------------------------------------------------------------ *
 *  A hand-picked slice of the `Place` gazetteer, for the demo database
 *  only.
 *
 *  The real deployment's `Place` table is the 234,934-row GeoNames import
 *  that /api/places/search runs a prefix search over (src/app/api/places/
 *  search/route.ts). That table is never copied into the demo: it is a
 *  build artefact, not something this repository can regenerate from data
 *  files the way people.ts and content.ts are, and shipping the whole
 *  gazetteer into a second Supabase project for a showcase would be a lot
 *  of storage spent on the 234,926 cities no invented alumnus lives in.
 *
 *  Without ANY rows the endpoint was still reachable in principle, but the
 *  demo's own proxy closed it -- on a comment describing an earlier design
 *  that called a paid, metered geocoder, which this route has not been for
 *  a while (bug audit M64). With the route open and this table empty, every
 *  search would still return nothing: the type-ahead in the "Where you are"
 *  editor would look exactly as broken as before, just for a different
 *  reason. So this file is the other half of that fix -- exactly the
 *  cities ALL_DEMO_PEOPLE actually live in (src/lib/demo-seed/people.ts),
 *  so a visitor moving their own pin sees the same real prefix-match,
 *  disambiguated-label experience the real product gives everyone else.
 *
 *  Coordinates match CITY_COORDS (src/lib/city-coords.ts), the same
 *  offline table the map already trusts for these exact city names, so a
 *  place picked here and the map pin it produces never disagree.
 *
 *  IDs are synthetic (geonameids are just an Int primary key here, and this
 *  database holds no real GeoNames import to collide with) but namespaced
 *  well above any plausible geonameid so a row from this file is never
 *  mistaken for a real gazetteer entry if the two are ever compared.
 */

export interface DemoPlace {
  id: number;
  name: string;
  admin1: string | null;
  country: string; // ISO-3166 alpha-2
  lat: number;
  lng: number;
}

const DEMO_PLACE_ID_BASE = 90_000_000;

// Every city or secondCity any ALL_DEMO_PEOPLE row uses. If a name gets
// added to people.ts without a matching row here, the picker just falls
// back to its existing free-text option for that one query -- the same
// graceful path a genuine gazetteer miss already takes -- so an out-of-sync
// list degrades rather than breaks.
const CITIES: Omit<DemoPlace, "id">[] = [
  { name: "Abu Dhabi", admin1: "Abu Dhabi", country: "AE", lat: 24.45, lng: 54.37 },
  { name: "Ahmedabad", admin1: "Gujarat", country: "IN", lat: 23.02, lng: 72.57 },
  { name: "Amsterdam", admin1: "North Holland", country: "NL", lat: 52.37, lng: 4.9 },
  { name: "Bengaluru", admin1: "Karnataka", country: "IN", lat: 12.97, lng: 77.59 },
  { name: "Berlin", admin1: "Berlin", country: "DE", lat: 52.52, lng: 13.4 },
  { name: "Boston", admin1: "Massachusetts", country: "US", lat: 42.36, lng: -71.06 },
  { name: "Chandigarh", admin1: "Chandigarh", country: "IN", lat: 30.73, lng: 76.78 },
  { name: "Chennai", admin1: "Tamil Nadu", country: "IN", lat: 13.08, lng: 80.27 },
  { name: "Dubai", admin1: "Dubai", country: "AE", lat: 25.2, lng: 55.27 },
  { name: "Edinburgh", admin1: "Scotland", country: "GB", lat: 55.95, lng: -3.19 },
  { name: "Goa", admin1: "Goa", country: "IN", lat: 15.5, lng: 73.83 },
  { name: "Gurugram", admin1: "Haryana", country: "IN", lat: 28.46, lng: 77.03 },
  { name: "Hyderabad", admin1: "Telangana", country: "IN", lat: 17.38, lng: 78.49 },
  { name: "Jaipur", admin1: "Rajasthan", country: "IN", lat: 26.91, lng: 75.79 },
  { name: "Kochi", admin1: "Kerala", country: "IN", lat: 9.93, lng: 76.27 },
  { name: "Kolkata", admin1: "West Bengal", country: "IN", lat: 22.57, lng: 88.36 },
  { name: "London", admin1: "England", country: "GB", lat: 51.51, lng: -0.13 },
  { name: "Madanapalle", admin1: "Andhra Pradesh", country: "IN", lat: 13.55, lng: 78.5 },
  { name: "Mumbai", admin1: "Maharashtra", country: "IN", lat: 19.08, lng: 72.88 },
  { name: "Mysuru", admin1: "Karnataka", country: "IN", lat: 12.3, lng: 76.64 },
  { name: "New Delhi", admin1: "Delhi", country: "IN", lat: 28.61, lng: 77.21 },
  { name: "New York", admin1: "New York", country: "US", lat: 40.71, lng: -74.01 },
  { name: "Pune", admin1: "Maharashtra", country: "IN", lat: 18.52, lng: 73.86 },
  { name: "Rishi Valley", admin1: "Andhra Pradesh", country: "IN", lat: 13.63, lng: 78.45 },
  { name: "San Francisco", admin1: "California", country: "US", lat: 37.77, lng: -122.42 },
  { name: "Singapore", admin1: null, country: "SG", lat: 1.35, lng: 103.82 },
  { name: "Thiruvananthapuram", admin1: "Kerala", country: "IN", lat: 8.52, lng: 76.95 },
  { name: "Tirupati", admin1: "Andhra Pradesh", country: "IN", lat: 13.63, lng: 79.42 },
  { name: "Toronto", admin1: "Ontario", country: "CA", lat: 43.65, lng: -79.38 },
];

export const DEMO_PLACES: DemoPlace[] = CITIES.map((c, i) => ({
  id: DEMO_PLACE_ID_BASE + i,
  ...c,
}));
