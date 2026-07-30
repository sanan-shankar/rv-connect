/* Inline mock data for the groups-rethink previews. No DB, no writes.
   ids are stable strings so BirdAvatar renders a consistent species per person. */

export type Person = { id: string; name: string };

export const PEOPLE: Person[] = [
  { id: "p-arjun", name: "Arjun Menon" },
  { id: "p-lakshmi", name: "Lakshmi Rao" },
  { id: "p-devika", name: "Devika Nair" },
  { id: "p-kabir", name: "Kabir Sethi" },
  { id: "p-ananya", name: "Ananya Iyer" },
  { id: "p-rohan", name: "Rohan Pillai" },
  { id: "p-meera", name: "Meera Krishnan" },
  { id: "p-vikram", name: "Vikram Reddy" },
  { id: "p-tara", name: "Tara Bhat" },
  { id: "p-imran", name: "Imran Qureshi" },
  { id: "p-nisha", name: "Nisha Varma" },
  { id: "p-sanjay", name: "Sanjay Gupta" },
  { id: "p-priya", name: "Priya Desai" },
  { id: "p-aditya", name: "Aditya Shenoy" },
];

export const BATCH_2004 = PEOPLE.slice(0, 11);
export const BURDENS = PEOPLE.slice(2, 12);
export const BIRDERS = PEOPLE.slice(5, 11);

/** Cities with member counts, to demonstrate the threshold rule. */
export const CITIES = [
  { name: "Bengaluru", country: "India", count: 34, threshold: true },
  { name: "Chennai", country: "India", count: 21, threshold: true },
  { name: "Mumbai", country: "India", count: 18, threshold: true },
  { name: "London", country: "UK", count: 12, threshold: true },
  { name: "New York", country: "USA", count: 9, threshold: true },
  { name: "Bay Area", country: "USA", count: 8, threshold: true },
  { name: "Hyderabad", country: "India", count: 6, threshold: false },
  { name: "Pune", country: "India", count: 4, threshold: false },
  { name: "Madanapalle", country: "India", count: 3, threshold: false },
  { name: "Lisbon", country: "Portugal", count: 1, threshold: false },
];

export const CITY_THRESHOLD = 8;
