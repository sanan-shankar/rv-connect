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

/* ------------------------------------------------------------------ *
 *  When a photograph was TAKEN, in words.
 *
 *  The owner, looking at the viewer during the 2026-08-26 brief: "It's
 *  important to show the person and the date or wait, what you are
 *  showing the date it was uploaded. So we are actually not seeing the
 *  date that people are saying this photo was taken." A photograph of
 *  1978 stamped with the day somebody scanned it in 2026 is worse than
 *  no date at all, so this reads the three columns the contributor
 *  actually filled in and says only what they said.
 *
 *  It prints at the precision it was given and no finer: a month if
 *  there is one, a year if there is one, a decade if the contributor
 *  wasn't sure, and NOTHING when they gave nothing. `datePrecision` is
 *  the contributor's own answer to which of those they meant, but rows
 *  predating that column carry only `photoYear`/`era`, so the fields
 *  themselves decide and the precision only narrows.
 * ------------------------------------------------------------------ */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "the 1970s", "before 1960" -- an era value as it reads in a sentence. */
export function eraPhrase(era: string): string | null {
  if (!era || era === "unknown") return null;
  if (era === "pre-1960s") return "before 1960";
  return /^\d{4}s$/.test(era) ? `the ${era}` : eraLabel(era);
}

export function takenLabel(photo: {
  photoYear?: number | null;
  photoMonth?: number | null;
  datePrecision?: string | null;
  era?: string | null;
}): string | null {
  const { photoYear, photoMonth, datePrecision } = photo;
  if (photoYear) {
    const month =
      datePrecision !== "year" && photoMonth && photoMonth >= 1 && photoMonth <= 12
        ? MONTHS[photoMonth - 1]
        : null;
    return month ? `${month} ${photoYear}` : String(photoYear);
  }
  return eraPhrase(photo.era ?? "");
}
