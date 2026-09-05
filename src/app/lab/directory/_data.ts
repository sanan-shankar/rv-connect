/* ------------------------------------------------------------------ *
 *  Synthetic member data for the directory room.
 *
 *  Self-contained ON PURPOSE. A concurrent session owns
 *  src/components/directory/alumni-map.tsx and src/lib/map-cluster.ts,
 *  so this room imports NOTHING from either. It also does not read the
 *  live database: the whole point of the room is judging the design at
 *  member counts the database does not have yet, which is exactly the
 *  owner's stated fear ("when even a hundred people are on this it's
 *  going to become pretty unmanageable").
 *
 *  Everything here is deterministic from a seed. No Math.random. Two
 *  reasons, both real: a screenshot taken twice has to be comparable,
 *  and a lab room that reshuffles on every re-render makes it
 *  impossible to say "that pin, there, is wrong".
 * ------------------------------------------------------------------ */

/* --- deterministic PRNG ------------------------------------------- */

/** mulberry32. 32 bits of state, one multiply and three shifts per draw.
 *  Chosen over a hash-per-index because we draw ~12 values per member and
 *  a sequential generator keeps that to one live number. */
function rng(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick from a weighted table. Weights need not sum to 1. */
function weighted<T>(next: () => number, table: { v: T; w: number }[]): T {
  const total = table.reduce((s, r) => s + r.w, 0);
  let roll = next() * total;
  for (const row of table) {
    roll -= row.w;
    if (roll <= 0) return row.v;
  }
  return table[table.length - 1].v;
}

/* --- the gazetteer ------------------------------------------------- *
 *
 *  60 places, [lng, lat], with a WEIGHT that encodes the real shape of a
 *  Rishi Valley diaspora rather than a flat spread. The weights matter
 *  more than the coordinates for this room: a uniform sprinkle of pins
 *  over the world is the easy case, and it is not the case that breaks.
 *  The case that breaks is 40% of everybody in one south-Indian pixel
 *  with a thin tail everywhere else, which is what these weights produce
 *  and what the hostile reviewer of the map concepts kept naming.
 *
 *  `region` drives the tiered/choropleth concepts. `country` drives the
 *  gazetteer grouping.
 * ------------------------------------------------------------------ */

export type Place = {
  city: string;
  admin: string;
  country: string;
  region: string;
  lng: number;
  lat: number;
  w: number;
};

export const PLACES: Place[] = [
  // South India. The gravity well, and the whole scaling problem.
  { city: "Bengaluru", admin: "Karnataka", country: "India", region: "South India", lng: 77.59, lat: 12.97, w: 190 },
  { city: "Chennai", admin: "Tamil Nadu", country: "India", region: "South India", lng: 80.27, lat: 13.08, w: 92 },
  { city: "Hyderabad", admin: "Telangana", country: "India", region: "South India", lng: 78.49, lat: 17.38, w: 44 },
  { city: "Kochi", admin: "Kerala", country: "India", region: "South India", lng: 76.27, lat: 9.93, w: 17 },
  { city: "Mysuru", admin: "Karnataka", country: "India", region: "South India", lng: 76.64, lat: 12.3, w: 13 },
  { city: "Coimbatore", admin: "Tamil Nadu", country: "India", region: "South India", lng: 76.96, lat: 11.02, w: 10 },
  { city: "Thiruvananthapuram", admin: "Kerala", country: "India", region: "South India", lng: 76.95, lat: 8.52, w: 9 },
  { city: "Madanapalle", admin: "Andhra Pradesh", country: "India", region: "South India", lng: 78.5, lat: 13.55, w: 7 },
  { city: "Rishi Valley", admin: "Andhra Pradesh", country: "India", region: "South India", lng: 78.45, lat: 13.63, w: 12 },
  { city: "Visakhapatnam", admin: "Andhra Pradesh", country: "India", region: "South India", lng: 83.3, lat: 17.69, w: 6 },
  { city: "Mangaluru", admin: "Karnataka", country: "India", region: "South India", lng: 74.86, lat: 12.91, w: 5 },
  { city: "Puducherry", admin: "Puducherry", country: "India", region: "South India", lng: 79.83, lat: 11.94, w: 6 },

  // West and central India.
  { city: "Mumbai", admin: "Maharashtra", country: "India", region: "West India", lng: 72.88, lat: 19.08, w: 78 },
  { city: "Pune", admin: "Maharashtra", country: "India", region: "West India", lng: 73.86, lat: 18.52, w: 34 },
  { city: "Ahmedabad", admin: "Gujarat", country: "India", region: "West India", lng: 72.57, lat: 23.02, w: 12 },
  { city: "Panaji", admin: "Goa", country: "India", region: "West India", lng: 73.83, lat: 15.5, w: 11 },
  { city: "Indore", admin: "Madhya Pradesh", country: "India", region: "West India", lng: 75.86, lat: 22.72, w: 6 },
  { city: "Bhopal", admin: "Madhya Pradesh", country: "India", region: "West India", lng: 77.41, lat: 23.26, w: 5 },

  // North India.
  { city: "New Delhi", admin: "Delhi", country: "India", region: "North India", lng: 77.21, lat: 28.61, w: 74 },
  { city: "Gurugram", admin: "Haryana", country: "India", region: "North India", lng: 77.03, lat: 28.46, w: 26 },
  { city: "Noida", admin: "Uttar Pradesh", country: "India", region: "North India", lng: 77.39, lat: 28.54, w: 14 },
  { city: "Chandigarh", admin: "Chandigarh", country: "India", region: "North India", lng: 76.78, lat: 30.73, w: 9 },
  { city: "Jaipur", admin: "Rajasthan", country: "India", region: "North India", lng: 75.79, lat: 26.91, w: 10 },
  { city: "Dehradun", admin: "Uttarakhand", country: "India", region: "North India", lng: 78.03, lat: 30.32, w: 8 },
  { city: "Lucknow", admin: "Uttar Pradesh", country: "India", region: "North India", lng: 80.95, lat: 26.85, w: 5 },
  { city: "Rishikesh", admin: "Uttarakhand", country: "India", region: "North India", lng: 78.27, lat: 30.09, w: 4 },

  // East and northeast India.
  { city: "Kolkata", admin: "West Bengal", country: "India", region: "East India", lng: 88.36, lat: 22.57, w: 22 },
  { city: "Bhubaneswar", admin: "Odisha", country: "India", region: "East India", lng: 85.82, lat: 20.3, w: 5 },
  { city: "Guwahati", admin: "Assam", country: "India", region: "East India", lng: 91.75, lat: 26.14, w: 4 },
  { city: "Darjeeling", admin: "West Bengal", country: "India", region: "East India", lng: 88.26, lat: 27.04, w: 3 },

  // North America.
  { city: "New York", admin: "New York", country: "United States", region: "North America", lng: -74.01, lat: 40.71, w: 30 },
  { city: "San Francisco", admin: "California", country: "United States", region: "North America", lng: -122.42, lat: 37.77, w: 24 },
  { city: "Seattle", admin: "Washington", country: "United States", region: "North America", lng: -122.33, lat: 47.61, w: 12 },
  { city: "Boston", admin: "Massachusetts", country: "United States", region: "North America", lng: -71.06, lat: 42.36, w: 11 },
  { city: "Chicago", admin: "Illinois", country: "United States", region: "North America", lng: -87.63, lat: 41.88, w: 9 },
  { city: "Austin", admin: "Texas", country: "United States", region: "North America", lng: -97.74, lat: 30.27, w: 8 },
  { city: "Los Angeles", admin: "California", country: "United States", region: "North America", lng: -118.24, lat: 34.05, w: 10 },
  { city: "Northfield", admin: "Minnesota", country: "United States", region: "North America", lng: -93.16, lat: 44.46, w: 3 },
  { city: "Toronto", admin: "Ontario", country: "Canada", region: "North America", lng: -79.38, lat: 43.65, w: 9 },
  { city: "Vancouver", admin: "British Columbia", country: "Canada", region: "North America", lng: -123.12, lat: 49.28, w: 5 },

  // Europe.
  { city: "London", admin: "England", country: "United Kingdom", region: "Europe", lng: -0.13, lat: 51.51, w: 32 },
  { city: "Cambridge", admin: "England", country: "United Kingdom", region: "Europe", lng: 0.12, lat: 52.21, w: 7 },
  { city: "Edinburgh", admin: "Scotland", country: "United Kingdom", region: "Europe", lng: -3.19, lat: 55.95, w: 5 },
  { city: "Berlin", admin: "Berlin", country: "Germany", region: "Europe", lng: 13.4, lat: 52.52, w: 8 },
  { city: "Amsterdam", admin: "North Holland", country: "Netherlands", region: "Europe", lng: 4.9, lat: 52.37, w: 6 },
  { city: "Paris", admin: "Ile-de-France", country: "France", region: "Europe", lng: 2.35, lat: 48.86, w: 7 },
  { city: "Zurich", admin: "Zurich", country: "Switzerland", region: "Europe", lng: 8.54, lat: 47.37, w: 4 },
  { city: "Barcelona", admin: "Catalonia", country: "Spain", region: "Europe", lng: 2.17, lat: 41.39, w: 4 },
  { city: "Stockholm", admin: "Stockholm", country: "Sweden", region: "Europe", lng: 18.07, lat: 59.33, w: 3 },

  // Gulf and west Asia.
  { city: "Dubai", admin: "Dubai", country: "United Arab Emirates", region: "Gulf", lng: 55.27, lat: 25.2, w: 22 },
  { city: "Abu Dhabi", admin: "Abu Dhabi", country: "United Arab Emirates", region: "Gulf", lng: 54.37, lat: 24.45, w: 8 },
  { city: "Doha", admin: "Doha", country: "Qatar", region: "Gulf", lng: 51.53, lat: 25.29, w: 6 },
  { city: "Muscat", admin: "Muscat", country: "Oman", region: "Gulf", lng: 58.41, lat: 23.59, w: 4 },

  // Asia-Pacific.
  { city: "Singapore", admin: "Singapore", country: "Singapore", region: "Asia Pacific", lng: 103.82, lat: 1.35, w: 20 },
  { city: "Hong Kong", admin: "Hong Kong", country: "Hong Kong", region: "Asia Pacific", lng: 114.17, lat: 22.32, w: 8 },
  { city: "Tokyo", admin: "Tokyo", country: "Japan", region: "Asia Pacific", lng: 139.69, lat: 35.69, w: 6 },
  { city: "Sydney", admin: "New South Wales", country: "Australia", region: "Asia Pacific", lng: 151.21, lat: -33.87, w: 11 },
  { city: "Melbourne", admin: "Victoria", country: "Australia", region: "Asia Pacific", lng: 144.96, lat: -37.81, w: 8 },
  { city: "Auckland", admin: "Auckland", country: "New Zealand", region: "Asia Pacific", lng: 174.76, lat: -36.85, w: 4 },
  { city: "Colombo", admin: "Western", country: "Sri Lanka", region: "Asia Pacific", lng: 79.86, lat: 6.93, w: 5 },
  { city: "Kathmandu", admin: "Bagmati", country: "Nepal", region: "Asia Pacific", lng: 85.32, lat: 27.72, w: 4 },

  // Africa and South America. Thin, and deliberately so: a real diaspora
  // has a long tail of ones, and a "1 member" pin is its own design case.
  { city: "Nairobi", admin: "Nairobi", country: "Kenya", region: "Africa", lng: 36.82, lat: -1.29, w: 4 },
  { city: "Cape Town", admin: "Western Cape", country: "South Africa", region: "Africa", lng: 18.42, lat: -33.92, w: 3 },
  { city: "Sao Paulo", admin: "Sao Paulo", country: "Brazil", region: "South America", lng: -46.63, lat: -23.55, w: 2 },
];

/* --- name pools ---------------------------------------------------- */

const FIRST = [
  "Ananya", "Rohan", "Meera", "Arjun", "Kavya", "Vikram", "Divya", "Karthik",
  "Sneha", "Aditya", "Nandini", "Siddharth", "Ishaan", "Radhika", "Vivek",
  "Tara", "Nikhil", "Anjali", "Rahul", "Shreya", "Kabir", "Leela", "Varun",
  "Malini", "Aravind", "Sunita", "Devika", "Raghav", "Ira", "Nithya",
  "Pranav", "Aisha", "Gautam", "Sanjana", "Vedant", "Riya", "Akhil", "Maya",
  "Sameer", "Neha", "Dhruv", "Priya", "Rishi", "Aparna", "Yash", "Lakshmi",
  "Aryan", "Bhavna", "Chetan", "Damini", "Eshan", "Farida", "Girish", "Hema",
];

const LAST = [
  "Sharma", "Iyer", "Nair", "Reddy", "Menon", "Krishnan", "Rao", "Desai",
  "Bhat", "Mehta", "Kulkarni", "Pillai", "Subramanian", "Chatterjee", "Bose",
  "Gupta", "Varma", "Sundaram", "Raman", "Kapoor", "Joshi", "Deshpande",
  "Narayanan", "Ganesh", "Prasad", "Shankar", "Venkatesh", "Mukherjee",
  "Balasubramanian", "Anand", "Chandrasekhar", "Ramanathan", "Srinivasan",
];

/** Straight from src/lib/professions.ts. Copied rather than imported so the
 *  room stays runnable if that vocabulary is edited mid-session by another
 *  branch; the list is 14 strings and drift here costs nothing. */
export const PROFESSIONS = [
  "Technology", "Finance", "Healthcare", "Education", "Arts & Media", "Law",
  "Government", "Non-profit", "Research", "Consulting", "Entrepreneurship",
  "Agriculture", "Student", "Other",
] as const;

/** Weighted so Technology dominates the way it actually does in a modern
 *  Indian boarding-school alumni body. A flat 1/14 spread would make the
 *  profession facet look far more useful than it is. */
const PROFESSION_W: { v: string; w: number }[] = [
  { v: "Technology", w: 26 }, { v: "Finance", w: 12 }, { v: "Education", w: 10 },
  { v: "Arts & Media", w: 9 }, { v: "Healthcare", w: 8 }, { v: "Consulting", w: 7 },
  { v: "Entrepreneurship", w: 7 }, { v: "Research", w: 6 }, { v: "Law", w: 4 },
  { v: "Non-profit", w: 4 }, { v: "Student", w: 4 }, { v: "Government", w: 2 },
  { v: "Agriculture", w: 2 }, { v: "Other", w: 3 },
];

const TITLES: Record<string, string[]> = {
  Technology: ["Software engineer", "Product manager", "Data scientist", "Design lead", "Infrastructure engineer"],
  Finance: ["Analyst", "Portfolio manager", "Risk lead", "Investment associate"],
  Healthcare: ["Physician", "Paediatrician", "Public health researcher", "Surgeon"],
  Education: ["Teacher", "Head of school", "Curriculum designer", "Lecturer"],
  "Arts & Media": ["Documentary editor", "Illustrator", "Journalist", "Composer"],
  Law: ["Associate", "Counsel", "Policy lawyer"],
  Government: ["Civil servant", "Policy adviser"],
  "Non-profit": ["Programme lead", "Field director", "Fundraiser"],
  Research: ["Postdoctoral fellow", "Ecologist", "Research fellow"],
  Consulting: ["Consultant", "Engagement manager"],
  Entrepreneurship: ["Founder", "Co-founder"],
  Agriculture: ["Farmer", "Agronomist", "Seed researcher"],
  Student: ["Undergraduate", "Doctoral student", "Masters student"],
  Other: ["Archivist", "Translator", "Chef"],
};

const ORGS: Record<string, string[]> = {
  Technology: ["Zerodha", "Freshworks", "Google", "Postman", "Stripe", "Razorpay"],
  Finance: ["ICICI", "Morgan Stanley", "Kotak", "Blume Ventures"],
  Healthcare: ["AIIMS", "Narayana Health", "St Johns", "NHS"],
  Education: ["Rishi Valley School", "Azim Premji University", "Ashoka University", "The Valley School"],
  "Arts & Media": ["Scroll", "The Hindu", "Cheeni Studio", "Freelance"],
  Law: ["Trilegal", "AZB", "Independent practice"],
  Government: ["Ministry of Environment", "NITI Aayog"],
  "Non-profit": ["Pratham", "SELCO Foundation", "ATREE", "Nature Conservation Foundation"],
  Research: ["IISc", "NCBS", "TIFR", "Cambridge"],
  Consulting: ["McKinsey", "Dalberg", "Independent"],
  Entrepreneurship: ["Own studio", "Early stage startup"],
  Agriculture: ["Timbaktu Collective", "Own farm"],
  Student: ["IIT Madras", "University of Edinburgh", "NID"],
  Other: ["Independent", "Freelance"],
};

/* --- the member shape ---------------------------------------------- */

export type Member = {
  id: string;
  name: string;
  batchYear: number | null;
  /** "alumnus" | "teacher" | "ex_teacher" */
  accountType: string;
  profession: string;
  jobTitle: string;
  workplace: string;
  /** every city this person lists, in order. A member plots in all of them,
   *  which is the owner's existing override and the reason a pin count can
   *  exceed the member count. */
  places: Place[];
  joinedAt: number;
};

const THIS_YEAR = 2026;

/**
 * Build `n` members deterministically.
 *
 * Batch years lean recent (a 2019 leaver is far likelier to have signed up
 * than a 1974 one), which is why the Batches view has a long thin tail of
 * one-person years at the top of the range. That tail is not noise: it is
 * the case that makes a flat grid of year tiles read badly, so the data has
 * to contain it.
 */
export function makeMembers(n: number, seed = 20260802): Member[] {
  const next = rng(seed);
  const out: Member[] = [];
  for (let i = 0; i < n; i++) {
    const isTeacher = next() < 0.07;
    const first = FIRST[Math.floor(next() * FIRST.length)];
    const last = LAST[Math.floor(next() * LAST.length)];
    const profession = isTeacher ? "Education" : weighted(next, PROFESSION_W);

    // Batch years: a triangular-ish draw over 1968..2026 biased to the last
    // 20 years. Two uniform draws averaged, then skewed, gives a smooth
    // shoulder rather than the hard cliff a single power draw produces.
    const u = (next() + next() * 3) / 4;
    const batchYear = isTeacher ? null : Math.round(1968 + u * (THIS_YEAR - 1968));

    // How many cities this person lists. Most list one. The tail matters:
    // a member in three cities triple-counts across pins, and the counted
    // pin design has to survive that without lying about the member total.
    const cityCount = next() < 0.14 ? 2 : next() < 0.03 ? 3 : 1;
    const places: Place[] = [];
    for (let c = 0; c < cityCount; c++) {
      const p = weighted(next, PLACES.map((pl) => ({ v: pl, w: pl.w })));
      if (!places.some((x) => x.city === p.city)) places.push(p);
    }

    const titles = TITLES[profession] ?? TITLES.Other;
    const orgs = ORGS[profession] ?? ORGS.Other;

    out.push({
      id: `m${seed}-${i}`,
      name: `${first} ${last}`,
      batchYear,
      accountType: isTeacher ? (next() < 0.5 ? "teacher" : "ex_teacher") : "alumnus",
      profession,
      jobTitle: titles[Math.floor(next() * titles.length)],
      workplace: orgs[Math.floor(next() * orgs.length)],
      places,
      // Signup order, used by the "Newest" sort. Descending index so member 0
      // is the most recent, matching createdAt desc.
      joinedAt: n - i,
    });
  }
  return out;
}

/* --- derived aggregates -------------------------------------------- */

export type CityPoint = {
  city: string;
  admin: string;
  country: string;
  region: string;
  lng: number;
  lat: number;
  count: number;
  members: Member[];
};

/** One point per city, counted. A member in two cities counts in both, so
 *  `sum(count) >= members.length`; every surface that prints a total has to
 *  print the MEMBER total, not the pin total, or it inflates the community. */
export function cityPoints(members: Member[]): CityPoint[] {
  const map = new Map<string, CityPoint>();
  for (const m of members) {
    for (const p of m.places) {
      const existing = map.get(p.city);
      if (existing) {
        existing.count += 1;
        existing.members.push(m);
      } else {
        map.set(p.city, { ...p, count: 1, members: [m] });
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

export type RegionPoint = {
  region: string;
  count: number;
  cities: number;
  /** count-weighted centroid, for placing a region label */
  lng: number;
  lat: number;
};

export function regionPoints(points: CityPoint[]): RegionPoint[] {
  const map = new Map<string, RegionPoint & { wx: number; wy: number }>();
  for (const p of points) {
    const r = map.get(p.region);
    if (r) {
      r.count += p.count;
      r.cities += 1;
      r.wx += p.lng * p.count;
      r.wy += p.lat * p.count;
    } else {
      map.set(p.region, {
        region: p.region, count: p.count, cities: 1,
        lng: 0, lat: 0, wx: p.lng * p.count, wy: p.lat * p.count,
      });
    }
  }
  return [...map.values()]
    .map((r) => ({ region: r.region, count: r.count, cities: r.cities, lng: r.wx / r.count, lat: r.wy / r.count }))
    .sort((a, b) => b.count - a.count);
}

export type CountryPoint = {
  country: string;
  count: number;
  cities: number;
  lng: number;
  lat: number;
};

export function countryPoints(points: CityPoint[]): CountryPoint[] {
  const map = new Map<string, CountryPoint & { wx: number; wy: number }>();
  for (const p of points) {
    const c = map.get(p.country);
    if (c) {
      c.count += p.count;
      c.cities += 1;
      c.wx += p.lng * p.count;
      c.wy += p.lat * p.count;
    } else {
      map.set(p.country, {
        country: p.country, count: p.count, cities: 1,
        lng: 0, lat: 0, wx: p.lng * p.count, wy: p.lat * p.count,
      });
    }
  }
  return [...map.values()]
    .map((c) => ({ country: c.country, count: c.count, cities: c.cities, lng: c.wx / c.count, lat: c.wy / c.count }))
    .sort((a, b) => b.count - a.count);
}

export function batchCounts(members: Member[]): { year: number; count: number }[] {
  const map = new Map<number, number>();
  for (const m of members) {
    if (m.batchYear == null) continue;
    map.set(m.batchYear, (map.get(m.batchYear) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);
}

/* --- the scales ---------------------------------------------------- *
 *
 *  Four sizes, because the design has to be judged at all four and the
 *  owner's worry lives entirely in the gap between the first and the last.
 *  32 is roughly the live database today. 2400 is a fully signed-up
 *  seventy-year alumni body, which is the ceiling worth designing for.
 * ------------------------------------------------------------------ */

export const SCALES = [
  { k: "now", label: "32", n: 32, note: "roughly the live database today" },
  { k: "soon", label: "120", n: 120, note: "the owner's stated worry line" },
  { k: "grown", label: "600", n: 600, note: "a well-adopted directory" },
  { k: "full", label: "2400", n: 2400, note: "seventy batches, fully signed up" },
] as const;

export type ScaleKey = (typeof SCALES)[number]["k"];

/** Memoised per scale: rebuilding 2400 members on every control flip made
 *  the room's own filter toggles feel laggy, which is a bad way to judge
 *  whether a filter feels laggy. */
const cache = new Map<number, Member[]>();
export function membersForScale(n: number): Member[] {
  const hit = cache.get(n);
  if (hit) return hit;
  const built = makeMembers(n);
  cache.set(n, built);
  return built;
}

/* --- filter model --------------------------------------------------- */

export type Filters = {
  q: string;
  profession: string;
  city: string;
  batchFrom: string;
  batchTo: string;
  type: string;
};

export const EMPTY_FILTERS: Filters = {
  q: "", profession: "", city: "", batchFrom: "", batchTo: "", type: "",
};

export function activeCount(f: Filters): number {
  return (
    (f.profession ? 1 : 0) + (f.city ? 1 : 0) + (f.type ? 1 : 0) +
    (f.batchFrom || f.batchTo ? 1 : 0)
  );
}

export function applyFilters(members: Member[], f: Filters): Member[] {
  const q = f.q.trim().toLowerCase();
  const from = f.batchFrom ? Number(f.batchFrom) : null;
  const to = f.batchTo ? Number(f.batchTo) : null;
  return members.filter((m) => {
    if (q) {
      const hay = `${m.name} ${m.jobTitle} ${m.workplace} ${m.places.map((p) => p.city).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.profession && m.profession !== f.profession) return false;
    if (f.city && !m.places.some((p) => p.city === f.city)) return false;
    if (f.type === "alumni" && m.accountType !== "alumnus") return false;
    if (f.type === "teachers" && m.accountType === "alumnus") return false;
    if (from != null && (m.batchYear == null || m.batchYear < from)) return false;
    if (to != null && (m.batchYear == null || m.batchYear > to)) return false;
    return true;
  });
}

/* --- the chrome stress states --------------------------------------- *
 *
 *  These live HERE, in the plain module, rather than beside the chrome
 *  concepts that consume them. `_chrome.tsx` carries "use client", so
 *  anything imported from it into the server `page.tsx` arrives as a client
 *  reference proxy rather than the value: reading `STRESS.some(...)` there
 *  threw "STRESS.some is not a function" at request time, and tsc cannot
 *  see it because the proxy has the right type. Data that both sides need
 *  belongs in a module neither side owns.
 *
 *  The four states match the ones a DOM probe measured on the shipped bar on
 *  2026-08-03. That probe was retired on 2026-09-05 (its `data-tour` anchor
 *  left with the hoopoe tour), so these are a dated reading rather than a
 *  live one -- see the note in _chrome.tsx.
 * ------------------------------------------------------------------ */

export type StressKey = "none" | "one" | "two" | "worst";

export const STRESS: { k: StressKey; label: string; note: string; f: Filters }[] = [
  { k: "none", label: "Nothing set", note: "the demo case", f: EMPTY_FILTERS },
  {
    k: "one", label: "1 filter", note: "shipped bar grows to 2 rows here",
    f: { ...EMPTY_FILTERS, profession: "Technology" },
  },
  {
    k: "two", label: "2 filters", note: "the owner's screenshot",
    f: { ...EMPTY_FILTERS, profession: "Technology", city: "Bengaluru" },
  },
  {
    k: "worst", label: "4 filters + a query", note: "longest real values",
    f: {
      q: "ananya",
      profession: "Entrepreneurship",
      city: "Thiruvananthapuram",
      batchFrom: "2005",
      batchTo: "2015",
      type: "alumni",
    },
  },
];

export type SortKey = "newest" | "batch-desc" | "batch-asc" | "name-asc";

export function sortMembers(members: Member[], key: SortKey): Member[] {
  const out = [...members];
  switch (key) {
    case "name-asc":
      return out.sort((a, b) => a.name.localeCompare(b.name));
    case "batch-desc":
      return out.sort((a, b) => (b.batchYear ?? -1) - (a.batchYear ?? -1) || a.name.localeCompare(b.name));
    case "batch-asc":
      return out.sort((a, b) => (a.batchYear ?? 9999) - (b.batchYear ?? 9999) || a.name.localeCompare(b.name));
    default:
      return out.sort((a, b) => b.joinedAt - a.joinedAt);
  }
}

/** "Batch of '09", matching src/lib/utils.ts batchLine. Teachers have no
 *  batch, so they get their role instead and never read "Member". */
export function memberLine(m: Member): string {
  if (m.accountType === "teacher") return "Teacher";
  if (m.accountType === "ex_teacher") return "Former teacher";
  if (m.batchYear == null) return "Member";
  return `Batch of '${String(m.batchYear).slice(-2)}`;
}
