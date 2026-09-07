import type { PhotoData } from "@/app/(main)/collection/actions";
import { takenLabel, takenShort } from "@/lib/collection";
import { SPECIMENS } from "../crop/_specimens";

/* ------------------------------------------------------------------ *
 *  An archive that does not exist, so the one that does can be judged.
 *
 *  There are two approved photographs in the real database and both say
 *  "asdf" (handover F26, F33). Nothing about the Collection page can be
 *  looked at against that: not justified rows, not the year rail's
 *  marks, not a bucket that narrows two hundred photographs to forty,
 *  not what happens when you reach the bottom.
 *
 *  So this deals out 240 records from the eleven real photographs in
 *  `/lab/crop/_specimens.ts` -- every shape a member can post, from a
 *  9:16 phone still to a 21:9 panorama -- across nine decades, six
 *  buckets and twelve names. The pictures repeat; nothing else does.
 *
 *  Deterministic, and that is not fussiness. A room whose grid reshuffles
 *  on every render cannot be screenshotted twice and compared, which is
 *  the entire protocol this project judges UI by. So the "randomness" is
 *  a small integer hash of the index: same room, same archive, every
 *  time, on the server and in the browser both.
 *
 *  When /lab/crop is retired, its specimens and their eleven webp files
 *  move somewhere shared rather than going with it -- spec sec. 12 has
 *  been asking for exactly this fixture set since the campaign opened.
 * ------------------------------------------------------------------ */

/** A cheap, stable spread. Not random: see above.
 *
 *  Integer arithmetic, not `Math.sin`. The obvious one-liner for this is
 *  `sin(n * 12.9898) * 43758.5453`, and it is a trap here: the precision of
 *  `Math.sin` is not specified by the language, so two engines may disagree in
 *  the last bits -- and every value below is immediately floored into an index,
 *  where a last-bit disagreement becomes a different photograph. In a component
 *  rendered on the server and then hydrated in a browser that is a hydration
 *  mismatch. This mixes 32-bit integers, which cannot drift. */
const spin = (n: number, salt: number) => {
  let h = (n * 0x9e3779b1 + salt * 0x85ebca6b) >>> 0;
  // `>>> 0` after every step, including the XORs: `^` in JavaScript answers a
  // SIGNED 32-bit integer, so half the values came out negative and the whole
  // archive collapsed into three decades.
  h = (h ^ (h >>> 15)) >>> 0;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h = (h ^ (h >>> 12)) >>> 0;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 0x100000000;
};

const pick = <T,>(list: readonly T[], n: number, salt: number) =>
  list[Math.floor(spin(n, salt) * list.length) % list.length];

const NAMES = [
  "Ravi Menon", "Anjali Sundaram", "Meera Krishnan", "Farhan Qureshi",
  "Devika Rao", "Sanjay Iyer", "Leela Nambiar", "Ashwin Patel",
  "Nandita Bose", "Kabir Shah", "Uma Raghavan", "Thomas Abraham",
];

const BUCKET_VALUES = ["people", "birds", "nature", "campus", "school-life", "other"];

const CAPTIONS = [
  "Morning assembly under the banyan, before the bell.",
  "Rishi Konda from the study steps, an hour before it rained.",
  "The paradise flycatcher that lived by the nursery for two seasons.",
  "House match, and nobody remembers who won.",
  "The dining hall on a Sunday, which is the quietest it ever is.",
  "Half the batch on the steps. Everyone is squinting.",
  "First light on the hill. Somebody was up early.",
  "The old library window, before the repair.",
  "Sports day, the hundred metres, and a photographer standing too close.",
  "The tamarind by the gate, which is older than the school.",
  "",
];

/* Weighted so the rail has a SHAPE rather than a flat run of equal marks: an
   archive fills up from the present backwards, and half of what people scan
   in is undated. That is the finding the rail exists to show. */
const ERA_WEIGHTS: [string, number][] = [
  ["2020s", 46], ["2010s", 58], ["2000s", 31], ["1990s", 22],
  ["1980s", 17], ["1970s", 14], ["1960s", 9], ["1950s", 3], ["1940s", 2],
  ["pre-1940s", 2], ["unknown", 38],
];

const ERA_YEARS: Record<string, [number, number]> = {
  "pre-1940s": [1931, 1939], "1940s": [1940, 1949], "1950s": [1950, 1959],
  "1960s": [1960, 1969], "1970s": [1970, 1979],
  "1980s": [1980, 1989], "1990s": [1990, 1999], "2000s": [2000, 2009],
  "2010s": [2010, 2019], "2020s": [2020, 2026],
};

/** A decade for photograph `n`, drawn from the weights above. */
function eraFor(n: number): string {
  const total = ERA_WEIGHTS.reduce((t, [, w]) => t + w, 0);
  let at = spin(n, 5) * total;
  for (const [era, w] of ERA_WEIGHTS) {
    at -= w;
    if (at <= 0) return era;
  }
  return "unknown";
}

export const LAB_ARCHIVE: PhotoData[] = Array.from({ length: 240 }, (_, n) => {
  const shape = SPECIMENS[n % SPECIMENS.length];
  const era = eraFor(n);
  const range = ERA_YEARS[era];
  // Two thirds of the dated ones give an exact year; the rest only knew the
  // decade. That mix is what `takenShort` and the viewer's date line have to
  // cope with, so the room had better show it.
  const exact = range && spin(n, 7) > 0.34;
  const year = exact ? range[0] + Math.floor(spin(n, 11) * (range[1] - range[0] + 1)) : null;
  const month = exact && spin(n, 13) > 0.6 ? 1 + Math.floor(spin(n, 17) * 12) : null;

  /* One bucket usually, two sometimes, none for about one in nine -- which is
     the case the Other bucket and the suggestion pass in phase 6 exist for,
     and it should be visible here rather than tidied away. */
  const first = pick(BUCKET_VALUES, n, 19);
  const second = pick(BUCKET_VALUES, n, 23);
  const buckets =
    spin(n, 29) > 0.89 ? [] : spin(n, 31) > 0.72 && second !== first ? [first, second] : [first];

  const name = pick(NAMES, n, 37);
  const caption = pick(CAPTIONS, n, 41);
  /* Newest first by upload, one a day going backwards, so "Newest" and
     "Chronological" are visibly DIFFERENT orders rather than the same list. */
  const added = new Date(Date.UTC(2026, 7, 28) - n * 86_400_000);

  const datePrecision = month ? "month" : year ? "year" : "decade";

  return {
    id: `lab-${n}`,
    thumbUrl: shape.src,
    url: shape.src,
    width: shape.w,
    height: shape.h,
    caption: caption || null,
    subject: buckets,
    era,
    /* Through the app's own two functions, not spelled out here, so the room
       shows the real phrasing at the real precision: "May 1978", "1978",
       "the 1970s", or nothing at all when nobody said. */
    takenLabel: takenLabel({ photoYear: year, photoMonth: month, era, datePrecision }),
    takenShort: takenShort({ photoYear: year, era }),
    photoYear: year,
    photoMonth: month,
    datePrecision,
    approved: true,
    // The lab room shows the Valley Collection; the class half has no fixture.
    scope: "valley" as const,
    loveCount: Math.floor(spin(n, 47) * 40),
    loved: spin(n, 53) > 0.86,
    isOwn: n % 17 === 0,
    uploader: { id: `lab-${name}`, name },
    createdAt: added.toISOString(),
  } satisfies PhotoData;
});

/** The same integer Postgres computes into `takenKey`, so the room's "through
 *  time" order is the real one rather than something that looks like it. */
export function takenKeyOf(p: PhotoData): number {
  const year = p.takenShort && /^\d{4}$/.test(p.takenShort)
    ? Number(p.takenShort)
    : ({ "pre-1940s": 1926, "1940s": 1940, "1950s": 1950, "1960s": 1960, "1970s": 1970, "1980s": 1980,
         "1990s": 1990, "2000s": 2000, "2010s": 2010, "2020s": 2020 }[p.era] ?? 0);
  return year * 100;
}
