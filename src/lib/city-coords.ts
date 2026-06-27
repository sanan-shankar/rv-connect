// A curated, offline gazetteer of cities where RV alumni are likely to be,
// mapping a normalized city name to [lng, lat]. This is the MVP stand-in for a
// full GeoNames gazetteer + City model; unknown cities fall into "Unmapped".
// Keys are lowercased; common variants (Bangalore/Bengaluru) both included.

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

/** Normalize a free-text city string to a gazetteer key. */
export function normalizeCity(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s*,.*$/, "").replace(/\s+/g, " ");
}

export function cityCoords(raw: string | null | undefined): [number, number] | null {
  if (!raw) return null;
  return CITY_COORDS[normalizeCity(raw)] ?? null;
}
