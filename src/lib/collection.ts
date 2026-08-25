// The Valley Collection: faceted taxonomy (fixed enums, stored as strings).
// Shared by the validator, the contribute form, and the filter rail.

const SUBJECTS = [
  { value: "birds", label: "Birds" },
  { value: "wildlife", label: "Wildlife" },
  { value: "landscape", label: "Landscape" },
  { value: "campus", label: "Campus" },
  { value: "buildings", label: "Buildings" },
  { value: "banyan", label: "The Banyan" },
  { value: "rishi-konda", label: "Rishi Konda" },
  { value: "hills", label: "Hills" },
  { value: "weather-sky", label: "Weather & Sky" },
  { value: "flora", label: "Flora" },
  { value: "assembly-dining", label: "Assembly & Dining" },
  { value: "arts-music", label: "Arts & Music" },
  { value: "sport-outdoors", label: "Sport & Outdoors" },
  { value: "historical", label: "Historical" },
] as const;

const AREAS = [
  { value: "junior-school", label: "Junior School" },
  { value: "senior-school", label: "Senior School" },
  { value: "whole-campus", label: "Whole Campus" },
  { value: "off-campus", label: "Off Campus" },
] as const;

export const ERAS = [
  { value: "pre-1960s", label: "Pre-1960s" },
  { value: "1960s", label: "1960s" },
  { value: "1970s", label: "1970s" },
  { value: "1980s", label: "1980s" },
  { value: "1990s", label: "1990s" },
  { value: "2000s", label: "2000s" },
  { value: "2010s", label: "2010s" },
  { value: "2020s", label: "2020s" },
  { value: "unknown", label: "Not sure" },
] as const;

export const ERA_VALUES = ERAS.map((e) => e.value);

const SUBJECT_LABELS = Object.fromEntries(SUBJECTS.map((s) => [s.value, s.label]));
const AREA_LABELS = Object.fromEntries(AREAS.map((a) => [a.value, a.label]));
const ERA_LABELS = Object.fromEntries(ERAS.map((e) => [e.value, e.label]));

export const subjectLabel = (v: string) => SUBJECT_LABELS[v] ?? v;
export const areaLabel = (v: string) => AREA_LABELS[v] ?? v;
export const eraLabel = (v: string) => ERA_LABELS[v] ?? v;

/** The oldest year the contribute form's year dropdown offers. */
export const PHOTO_YEAR_MIN = 1926;

/** Map an exact year to its ERA_VALUES decade bucket, so a contributor who
 *  gives a precise year still shows up under the right era filter. */
export function eraFromYear(year: number): string {
  if (year < 1960) return "pre-1960s";
  const decade = Math.floor(year / 10) * 10;
  const bucket = `${decade}s`;
  return (ERA_VALUES as readonly string[]).includes(bucket) ? bucket : "unknown";
}
