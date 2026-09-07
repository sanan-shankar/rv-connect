import type { PhotoScope } from "./photo-visibility-rule";
import type { RiverOrder } from "./river-cursor";
// The Valley Collection: the taxonomy, and when a photograph was taken.
// Shared by the validator, the contribute form, the river and the viewer.

/* ------------------------------------------------------------------ *
 *  The buckets.
 *
 *  Six, and the sixth is a pressure valve. This replaces the fourteen
 *  values that were here before (birds, wildlife, landscape, campus,
 *  buildings, banyan, rishi-konda, hills, weather-sky, flora,
 *  assembly-dining, arts-music, sport-outdoors, historical), which were
 *  drawn up under the old frame of "the place, not people" and so had
 *  nowhere at all to file a class photograph. The owner widened the
 *  frame to the school's whole visual memory (D2), which made that list
 *  wrong rather than short.
 *
 *  Six because a contributor picks from six without thinking and
 *  fourteen makes them read. The archive literature is consistent on
 *  this and prior-art.md sec. "organising the archive" has the reasoning:
 *  a small controlled spine for browsing, free text underneath it for
 *  searching. Anything more specific than these six -- "the big banyan
 *  tree", "behind junior Adi under the trees" -- is prose, and prose is
 *  searched, never offered as a dropdown (sec. 7.2, and it is the one
 *  rule in this area that is absolute).
 *
 *  OTHER IS A SENSOR, NOT A BIN. Every archive taxonomy is wrong on the
 *  day it ships and the useful question is how you find out. Two hundred
 *  photographs landing in Other with "sports day" in their captions is
 *  not a mess, it is the evidence for a seventh bucket arriving without
 *  anyone having had to guess in advance. The admin side reads it.
 *
 *  The column behind this is still called `subject`. It is not renamed:
 *  one database serves production and local dev, so a rename breaks
 *  every Collection query running in production for as long as it takes
 *  the next deploy to land, and legibility is not worth an outage
 *  window. The values are what changed.
 * ------------------------------------------------------------------ */

export const BUCKETS = [
  {
    value: "people",
    label: "People",
    /** What belongs, in the words a contributor would use. */
    hint: "Portraits, class photographs, groups, faces you know",
  },
  {
    value: "birds",
    label: "Birds",
    hint: "The sanctuary's own",
  },
  {
    value: "nature",
    label: "Nature",
    hint: "The land itself: trees, the hills, weather, flowers, animals",
  },
  {
    value: "campus",
    label: "Campus",
    hint: "The built valley: the buildings, the study, the banyan amphitheatre",
  },
  {
    value: "school-life",
    label: "School life",
    hint: "What happens here: assembly, sport, plays, music, dining, reunions",
  },
  {
    value: "other",
    label: "Other",
    hint: "Anything with nowhere else to go. We read this one.",
  },
] as const;

export type BucketValue = (typeof BUCKETS)[number]["value"];

export const BUCKET_VALUES = BUCKETS.map((b) => b.value);

/* Every value the fourteen-item list could have written, mapped onto the
   six. Kept in the app and not only in the migration, because a row can
   still arrive carrying an old value: the demo database seeds its own
   photographs, and a member's browser can be holding a form built before
   the deploy. A value that maps to nothing reads as Other rather than
   disappearing from every bucket. */
const LEGACY_BUCKETS: Record<string, BucketValue> = {
  birds: "birds",
  wildlife: "nature",
  landscape: "nature",
  flora: "nature",
  "weather-sky": "nature",
  hills: "nature",
  // Rishi Konda is a hill before it is a place of ours.
  "rishi-konda": "nature",
  campus: "campus",
  buildings: "campus",
  // The banyan here means the amphitheatre under it, which is where the
  // school assembles -- the tree alone would be nature.
  banyan: "campus",
  "assembly-dining": "school-life",
  "arts-music": "school-life",
  "sport-outdoors": "school-life",
  // "Historical" was a date wearing a subject's clothes. When is its own
  // axis now (the year rail), so this is the evidence Other exists for.
  historical: "other",
};

const BUCKET_LABELS = Object.fromEntries(BUCKETS.map((b) => [b.value, b.label]));

/** One stored value as a person reads it, old vocabulary included. Anything
 *  from neither vocabulary reads as Other, exactly as `bucketsOf` files it. */
export function bucketLabel(v: string): string {
  return BUCKET_LABELS[v] ?? BUCKET_LABELS[LEGACY_BUCKETS[v] ?? "other"];
}

/** A stored, comma-joined `subject` string as the six buckets it means.
 *
 *  De-duplicated, because four of the old values collapse onto Nature. A
 *  value nobody recognises reads as **Other** rather than vanishing from
 *  every bucket -- the same answer the migration writes into the column, and
 *  the reason Other is a sensor: something unaccounted for should show up
 *  where we are looking, not disappear. */
export function bucketsOf(subject: string | null | undefined): BucketValue[] {
  if (!subject) return [];
  const seen = new Set<BucketValue>();
  for (const raw of subject.split(",")) {
    const v = raw.trim();
    if (!v) continue;
    seen.add(
      (BUCKET_VALUES as readonly string[]).includes(v)
        ? (v as BucketValue)
        : LEGACY_BUCKETS[v] ?? "other"
    );
  }
  return [...seen];
}

/* ------------------------------------------------------------------ *
 *  The decades.
 *
 *  The ladder used to stop at "Pre-1960s", which put thirty-four years of
 *  the school -- it was founded in 1926 -- into one bucket labelled with a
 *  decade nobody photographed in. The owner extended it on 2026-08-28:
 *  "have for 1950s and 1940s as well." Pre-1960s became **Pre-1940s**
 *  rather than surviving beside them, because a 1955 photograph offered
 *  both "1950s" and "Pre-1960s" has two true answers, and a vocabulary
 *  with two true answers is a vocabulary that gets filled in at random.
 *
 *  **REVISIT THIS, and he asked for the note.** If nothing is ever
 *  uploaded from the 1940s or the 1950s, those two pills are two presses
 *  of dead weight on every contributor's screen and the bottom of the
 *  ladder should collapse back. The query that answers it:
 *    SELECT era, count(*) FROM "Photo" GROUP BY era ORDER BY era;
 *  Nothing has been uploaded from before the 2020s as of 2026-08-28, so
 *  there is nothing to read yet -- wait until the archive is real.
 *
 *  `pre-1960s` is deliberately NOT in this list and deliberately still in
 *  ERA_START_YEAR and in the migration's CASE below: no row has ever held
 *  it, but a value that can still arrive from a stale browser must sort
 *  and label rather than fall to the bottom as undated.
 * ------------------------------------------------------------------ */
export const ERAS = [
  { value: "pre-1940s", label: "Pre-1940s" },
  { value: "1940s", label: "1940s" },
  { value: "1950s", label: "1950s" },
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

const ERA_LABELS = Object.fromEntries(ERAS.map((e) => [e.value, e.label]));

export const eraLabel = (v: string) => ERA_LABELS[v] ?? v;

/** The oldest year the contribute form's year dropdown offers. */
export const PHOTO_YEAR_MIN = 1926;

/* ------------------------------------------------------------------ *
 *  WHAT A CONTRIBUTOR TYPED INTO ONE BOX, AS A DATE THE ARCHIVE STORES.
 *
 *  The contribute room used to ask this with ten decade pills, an "I
 *  don't know" pill and a separate year field, so the contributor had to
 *  decide which control matched how much they remembered before they
 *  could answer at all. The owner scrapped that (2026-08-28) for one
 *  numeric box, and these three functions are what makes a single box
 *  able to say three different amounts:
 *
 *      ""      -> unknown          nobody said, which is also what
 *                                  leaving it blank means
 *      "197"   -> the 1970s        decade precision
 *      "1978"  -> 1978             year precision
 *      + March -> March 1978       month precision
 *
 *  They live here rather than in the dialog because this is the rule for
 *  what goes INTO the archive, not a detail of one screen -- and here
 *  they are pure, so `collection-date.test.mjs` can hold the ladder
 *  still. Getting this wrong mis-files a photograph in a way nobody
 *  notices until the rail is wrong.
 * ------------------------------------------------------------------ */

/** Is what has been typed actually a year? The valley's own year is the
 *  ceiling, matching the server validator that will judge it. */
export function yearGiven(typed: string, thisYear: number): boolean {
  const n = Number(typed);
  return typed.length === 4 && n >= PHOTO_YEAR_MIN && n <= thisYear;
}

/** The decade a HALF-TYPED year names, or null if it names nothing yet.
 *
 *  This is the whole of what the ten decade pills used to do, at three
 *  keystrokes on a number pad. "193" is pre-1940s, which `eraFromYear`
 *  already knows; "19" is not an answer yet, and neither is "99", because
 *  `eraFromYear` refuses a decade the archive has no bucket for. */
export function eraFromPartial(typed: string): string | null {
  if (typed.length !== 3) return null;
  const era = eraFromYear(Number(typed) * 10);
  return era === "unknown" ? null : era;
}

/** A decade said out loud, for a sentence rather than a filter chip. */
export const eraSaid = (era: string) =>
  era === "pre-1940s" ? "the years before 1940" : `the ${eraLabel(era)}`;

/** The date fields exactly as both contribute paths encode them. */
export function photoDate(
  typed: { year: string; month: string },
  thisYear: number
) {
  if (yearGiven(typed.year, thisYear)) {
    const monthIndex = MONTHS.indexOf(typed.month);
    return monthIndex >= 0
      ? { photoYear: Number(typed.year), photoMonth: monthIndex + 1, datePrecision: "month" }
      : { photoYear: Number(typed.year), datePrecision: "year" };
  }
  const era = eraFromPartial(typed.year);
  return era
    ? { era, datePrecision: "decade" }
    : { era: "unknown", datePrecision: "unknown" };
}

/**
 * The box holds something, and the date rule could make nothing of it.
 *
 * `photoDate` is deliberately total -- it always returns a filing, and when it
 * cannot read what was typed that filing is "unknown". That is right for an
 * EMPTY box, which means "I do not know", and quietly wrong for a FULL one,
 * which means "I told you and you lost it".
 *
 * The distinction earns its own function because of what it cost. Every
 * photograph contributed between 2026-08-29 and 2026-08-30 arrived with a
 * caption, a bucket and no date at all, from a contributor who was certain she
 * had typed years into all of them -- and she had: the digits render straight
 * out of the same state the filing is computed from, so the box showed them
 * back to her while `yearGiven` rejected every one and `photoDate` filed the
 * lot as undated. Nothing anywhere said so.
 *
 * So a room that asks for a date checks this before it files, and refuses out
 * loud rather than dropping the answer. A visible refusal costs somebody one
 * retry; a silent drop costs the archive the date for ever, because by the
 * time anyone notices, the original with its own metadata has been purged.
 */
export function yearUnreadable(
  typed: { year: string; month: string },
  thisYear: number
): boolean {
  if (typed.year === "") return false;
  return photoDate(typed, thisYear).datePrecision === "unknown";
}

/** A STORED ROW, back in the one box that wrote it -- `photoDate` run
 *  backwards, so the edit dialog can seed the date field with what is already
 *  on the photograph and a save that never touched it changes nothing.
 *
 *  A decade comes back as its three digits ("197"), which is exactly what a
 *  contributor types for a decade, so the field's own label reads "Filed under
 *  the 1970s" over a value it can round-trip. Pre-1940s is "192" for the same
 *  reason: it is the only three digits `eraFromPartial` maps back to that
 *  bucket, and the label says "the years before 1940" over it rather than
 *  leaving the reader to read 192 as a decade.
 *
 *  The one value that does NOT round-trip is the legacy `pre-1960s`, which
 *  comes back as pre-1940s. No row has ever held it (see the note above ERAS)
 *  and nothing offers it, so re-saving one is not a case that exists; a
 *  three-digit box cannot represent it, and inventing a fourth date control
 *  for a value with no rows behind it would be worse.
 *
 *  Pinned against `photoDate` in collection-date.test.mjs: for every era the
 *  archive offers, writing back what this returns must land on the same era. */
export function typedDate(row: {
  photoYear?: number | null;
  photoMonth?: number | null;
  datePrecision?: string | null;
  era?: string | null;
}): { year: string; month: string } {
  if (row.photoYear) {
    /* The same guard `takenLabel` applies: the form keeps a month in state
       while the precision drops back to a year, so the column can hold one
       the contributor did not mean, and seeding the box with it would put it
       back deliberately. */
    const month =
      row.datePrecision !== "year" && row.photoMonth && row.photoMonth >= 1 && row.photoMonth <= 12
        ? MONTHS[row.photoMonth - 1]
        : "";
    return { year: String(row.photoYear), month };
  }
  const start = ERA_START_YEAR[row.era ?? ""];
  return { year: start ? String(Math.floor(start / 10)) : "", month: "" };
}

/** Map an exact year to its ERA_VALUES decade bucket, so a contributor who
 *  gives a precise year still shows up under the right era filter. */
export function eraFromYear(year: number): string {
  if (year < 1940) return "pre-1940s";
  const decade = Math.floor(year / 10) * 10;
  const bucket = `${decade}s`;
  return (ERA_VALUES as readonly string[]).includes(bucket) ? bucket : "unknown";
}

/* ------------------------------------------------------------------ *
 *  The year rail's own ordering.
 *
 *  A decade sorts by the year it starts. "pre-1960s" is everything
 *  before that, so it takes the year the school was founded rather than
 *  a sentinel -- if a photograph of 1931 ever gets an exact year it
 *  lands next to the ones that only said "before 1960", which is the
 *  whole point of putting them on one axis. "unknown" is not a decade
 *  at all and sorts last wherever it appears, which is why it answers
 *  null rather than a number.
 *
 *  This is the SAME mapping the `takenYear` generated column uses in
 *  Postgres (prisma/migrations-manual/2026-08-28-collection-river.sql).
 *  If one changes the other must, and the test named for it says so.
 * ------------------------------------------------------------------ */

export const ERA_START_YEAR: Record<string, number> = {
  "pre-1940s": 1926,
  "1940s": 1940,
  "1950s": 1950,
  /* Legacy, and not offered anywhere. See the note above ERAS. */
  "pre-1960s": 1926,
  "1960s": 1960,
  "1970s": 1970,
  "1980s": 1980,
  "1990s": 1990,
  "2000s": 2000,
  "2010s": 2010,
  "2020s": 2020,
};

export const eraSortYear = (era: string): number | null => ERA_START_YEAR[era] ?? null;

/** The `takenKey` boundary a DECADE seeks to: one past the top of
 *  `era`, so "everything with a smaller `takenKey`" is exactly that decade
 *  and everything older. `null` means no boundary exists -- either `era` is
 *  the newest real decade (nothing sits above it, so seeking there is the
 *  same as a fresh, unfiltered first page) or an era outside `ERAS`
 *  altogether, which asks for nothing and gets nothing. "unknown" is not a
 *  decade and has no ceiling of its own; `takenKey` is 0 for every undated
 *  row, so 1 is the boundary that keeps exactly those and nothing dated. */
export function eraSeekBoundary(era: string): number | null {
  if (era === "unknown") return 1;
  const at = ERAS.findIndex((e) => e.value === era);
  if (at < 0) return null;
  const next = ERAS[at + 1];
  if (!next || next.value === "unknown") return null;
  return ERA_START_YEAR[next.value] * 100;
}

/* ------------------------------------------------------------------ *
 *  The rail's unit, which is the YEAR.
 *
 *  It was the decade until 2026-08-30 -- "can you make the siderail on
 *  collection show each year instead of decades", then "show all" when
 *  asked whether the years should hide inside a decade you open. So
 *  every year the archive holds gets its own row, all of them on screen
 *  at once, and the rail never scrolls (see `year-rail.tsx` for how a
 *  hundred rows fit in one sticky column).
 *
 *  A BAND KEY IS A YEAR, OR "unknown". There is no third kind, and that
 *  is a decision rather than an omission: a photograph filed only to a
 *  decade ("the 1950s", `datePrecision: "decade"`) has no year of its
 *  own, and giving it a row of its own would put a "1950s" mark
 *  somewhere in the middle of 1959..1950 that the river cannot actually
 *  hold -- `takenKey` files it at 195000, which is the same integer a
 *  bare 1950 gets, so the two would interleave and the river's headings
 *  would alternate 1950 / 1950s / 1950 all the way down. Instead it
 *  bands at its decade's first year, which is exactly where the river
 *  already puts it. The rail is a map of the river; the river decides.
 *
 *  If decade-only contributions ever become common enough that the
 *  first year of each decade reads as suspiciously fat, the fix is a
 *  migration giving those rows a distinct `takenKey` month (99, sorting
 *  just above the bare year) and a band of their own here. Not worth a
 *  generated-column rebuild on a shared production database until the
 *  data asks for it -- as of 2026-08-30 no row has `datePrecision`
 *  "decade" at all.
 * ------------------------------------------------------------------ */
export function bandKeyOf(row: { photoYear?: number | null; era?: string | null }): string {
  if (row.photoYear) return String(row.photoYear);
  const start = ERA_START_YEAR[row.era ?? ""];
  return start ? String(start) : "unknown";
}

/** A band key as it reads on the rail. A year is already its own label. */
export const bandLabel = (key: string) => (key === "unknown" ? "Undated" : key);

/** Every band the archive holds, in the order the river runs: newest year
 *  first, "Undated" last because it is not a year and cannot be sorted among
 *  them.
 *
 *  Shared rather than derived twice. The wide-screen rail and the phone's
 *  scrubber are different shapes for different hands, but they are indexes of
 *  the SAME sequence, and two copies of "which band comes after this one" is
 *  two copies that can disagree about where 1978 sits. */
export function orderBandKeys(keys: Iterable<string>): string[] {
  const all = [...keys];
  const years = all
    .filter((k) => k !== "unknown")
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a)
    .map(String);
  return all.includes("unknown") ? [...years, "unknown"] : years;
}

/** The `takenKey` boundary a band seeks to: one past the top of it, so
 *  "everything with a smaller `takenKey`" is that band and everything older.
 *
 *  Takes a DECADE as well as a year, because `?when=1970s` links were
 *  shareable for two days before the rail changed unit and a link that used
 *  to open the archive at the 1970s must keep doing so -- it delegates to
 *  `eraSeekBoundary` for those, which is also what still answers `null` for
 *  the newest decade.
 *
 *  A year always answers a number, even the newest one the archive holds:
 *  the server cannot know which year that is without a second query, and the
 *  cost of not knowing is one upward fetch that comes back empty the first
 *  time somebody scrolls to the top of a seek they made to the newest year.
 *  A query saved on every seek is worth more than a query wasted on that. */
export function bandSeekBoundary(key: string): number | null {
  if (/^\d{4}$/.test(key)) return (Number(key) + 1) * 100;
  return eraSeekBoundary(key);
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

/** The months, in the one order they are ever in. Exported since the
 *  contribute room's month menu and `photoDate` both read it, and a second
 *  copy in a component is how the two drift. */
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "the 1970s", "before 1960" -- an era value as it reads in a sentence. */
export function eraPhrase(era: string): string | null {
  if (!era || era === "unknown") return null;
  if (era === "pre-1940s") return "before 1940";
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

/** The year on a tile, which is the shortest true thing we can say: an
 *  exact year when there is one, "1970s" when the contributor only knew
 *  the decade, and nothing at all otherwise. The owner asked for the
 *  person and the year on hover and for the caption and the love count to
 *  come off it. */
export function takenShort(photo: {
  photoYear?: number | null;
  era?: string | null;
}): string | null {
  if (photo.photoYear) return String(photo.photoYear);
  const era = photo.era ?? "";
  if (!era || era === "unknown") return null;
  return eraLabel(era);
}

/* ------------------------------------------------------------------ *
 *  Each half of the Collection opens the way it is actually read.
 *
 *  The valley opens on Newest, because it is a place people come back to
 *  and what they came back for is what has arrived since.
 *
 *  A CLASS OPENS ON CHRONOLOGICAL (owner, 2026-09-02). It is not a feed of
 *  arrivals, it is one batch's own record of itself, and the question a
 *  member brings to it is "what have we got, from when" rather than "what
 *  turned up this week" -- which is also the only order the rail and the
 *  phone's scrubber can index, so the half that most wants an index gets
 *  one on arrival rather than after a trip through a menu.
 *
 *  IT LIVES HERE, in the client-safe module, and that is not filing. It
 *  was written in `collection-data.ts` first, where it reads naturally
 *  beside `riverFiltersFrom` -- and importing it from the client dragged
 *  that module's whole server graph into the browser bundle: auth, then
 *  `next/server`, then Prisma, then sharp. `tsc` was perfectly happy and
 *  the Collection rendered a blank page. The types below are imported as
 *  TYPES only, which erase, so nothing follows them at runtime.
 * ------------------------------------------------------------------ */
export const defaultOrderFor = (scope: PhotoScope): RiverOrder =>
  scope === "class" ? "taken" : "newest";

/* ------------------------------------------------------------------ *
 *  What each half of the Collection calls itself.
 *
 *  Every word the class half says used to be a `scope === "class" ? …`
 *  ternary, and the eight of them were scattered across four files: the
 *  page title and two search labels in the client, the empty state's
 *  heading and body, the "wider bucket" line, the contribute dialog's
 *  title, and the quota refusal in the server action. Read together they
 *  are one voice; read apart they were eight coin flips, and two of the
 *  strings were already written twice.
 *
 *  ONLY THE WORDS. The layout ternaries stay as JSX conditionals where
 *  they are -- `xl:hidden`, `xl:mt-0`, `xl:mt-[42px]` and where the order
 *  menu mounts are all about the class half having no bucket line, which
 *  is structure and not copy, and hiding it in a table would make both
 *  halves harder to read.
 *
 *  A THIRD HALF IS NOT PLANNED and this is not extensibility --
 *  `scope-caret.tsx` says the two-ness is load-bearing. It is legibility:
 *  the class half's whole vocabulary now fits on one screen.
 * ------------------------------------------------------------------ */
export const HALVES: Record<
  PhotoScope,
  {
    title: string;
    searchLabel: string;
    emptyTitle: string;
    /** The class half names the year whose archive this is. A string,
     *  because that is what the page hands the client. */
    emptyBody: (classYear: string | null) => string;
    contributeTitle: string;
    /** Appended after "No photograph has been filed under this." Empty on
     *  the class side, which has no bucket line and so no wider bucket. */
    noResultsHint: string;
    quotaError: string;
  }
> = {
  valley: {
    title: "The Valley Collection",
    searchLabel: "Search the Collection",
    emptyTitle: "The collection is just beginning.",
    emptyBody: () =>
      "The first photographs of the valley will live here: the banyan, Rishi Konda, the birds, the light. Add the first one.",
    /* The valley's line keeps its warmth -- it is the one warm line on the
       contribute surface and it already names the valley. */
    contributeTitle: "Add to the valley’s memory",
    noResultsHint: "Try a wider bucket.",
    quotaError:
      "You've reached the limit of photos one account can add to the Collection. Message the admin if you have more to share.",
  },
  class: {
    title: "The Class Collection",
    searchLabel: "Search your class",
    emptyTitle: "Nothing from your class yet.",
    emptyBody: (classYear) =>
      `Photographs added here stay with the class of ${classYear}. Nobody else in the school can see them.`,
    /* Plain, deliberately: a statement of where something private is going
       is not the place for a house voice. */
    contributeTitle: "Add to the Class Collection",
    noResultsHint: "",
    quotaError:
      "You've reached the number of photographs one account can add to the Class Collection. Message the admin if you have more to share.",
  },
};
