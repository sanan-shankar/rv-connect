#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  geocode-check - db-free harness for the directory map's city
 *  lookup (src/lib/city-coords.ts). Run: node scripts/qa/geocode-check.mjs
 *
 *  There is no db-free way to enumerate the DISTINCT place strings
 *  actually in UserPlace (that needs a live query), so this tests the
 *  lookup function directly against a hardcoded list built from the
 *  owner's bug report (Gurgaon, Northfield MN) plus the alias/
 *  normalization classes that report represents.
 *
 *  Two expectation groups:
 *  - MUST_RESOLVE: the static table has to answer these itself.
 *  - HANDLED_DOWNSTREAM: the static table CANNOT honestly answer these
 *    (a flat name key has no state/country dimension, so "Northfield"
 *    is ambiguous by construction). They must return null GRACEFULLY
 *    here; in the real pipeline they resolve from UserPlace.lat/lng
 *    (picker-written rows) or the Place-gazetteer fallback
 *    (src/lib/geocode.ts), and a full miss console.warns in dev
 *    (buildPins in src/app/(main)/directory/page.tsx).
 *
 *  Node 23.6+ strips the .ts types on import natively; city-coords.ts
 *  is import-free, so no loader or build step is needed.
 * ------------------------------------------------------------------ */

import {
  cityCoords,
  cityNameVariants,
  normalizeCity,
  normalizePlaceString,
} from "../../src/lib/city-coords.ts";

let failures = 0;

function check(label, ok, detail) {
  const mark = ok ? "ok  " : "FAIL";
  console.log(`  ${mark}  ${label}${detail ? `  ->  ${detail}` : ""}`);
  if (!ok) failures += 1;
}

/* 1 -- strings the static table must resolve itself ----------------- */
const MUST_RESOLVE = [
  // The owner's Gurgaon report, in both official spellings and the
  // case/whitespace/diacritic forms free text arrives in.
  "Gurgaon",
  "Gurugram",
  "GURGAON",
  "  gurgaon  ",
  "Gurgáon",
  // The rest of the NCR satellite gap the Gurgaon miss exposed.
  "Noida",
  "Faridabad",
  "Ghaziabad",
  // The alias doublets that predate this fix must keep working.
  "Bengaluru",
  "Bangalore",
  "Bombay",
  "Madras",
  "New York City",
  // A qualified string whose short name IS in the table must not be
  // broken by the comma tail.
  "Bengaluru, Karnataka",
  // The valley itself.
  "Rishi Valley",
];

console.log("\nMUST resolve from the static table:");
for (const s of MUST_RESOLVE) {
  const coords = cityCoords(s);
  check(JSON.stringify(s), coords != null, coords ? `[${coords}]` : "null");
}

/* 2 -- alias pairs must land on the same pin ------------------------ */
console.log("\nAlias pairs share one coordinate:");
const PAIRS = [
  ["Gurgaon", "Gurugram"],
  ["Bengaluru", "Bangalore"],
  ["Mumbai", "Bombay"],
  ["New York", "NYC"],
];
for (const [a, b] of PAIRS) {
  const ca = cityCoords(a);
  const cb = cityCoords(b);
  check(`${a} == ${b}`, !!ca && !!cb && ca.join() === cb.join(), `[${ca}] vs [${cb}]`);
}

/* 3 -- strings the static table cannot answer; must miss GRACEFULLY - */
console.log("\nHandled downstream (row lat/lng or the gazetteer fallback), so null here, no throw:");
const HANDLED_DOWNSTREAM = ["Northfield", "Northfield, Minnesota", "Atlantis"];
for (const s of HANDLED_DOWNSTREAM) {
  let coords;
  let threw = false;
  try {
    coords = cityCoords(s);
  } catch {
    threw = true;
  }
  check(JSON.stringify(s), !threw && coords == null, threw ? "THREW" : String(coords));
}

/* 4 -- normalization + variants behave ------------------------------ */
console.log("\nNormalization and filter variants:");
check(
  'normalizePlaceString keeps the qualifier ("Northfield ,  Minnesota")',
  normalizePlaceString("Northfield ,  Minnesota") === "northfield, minnesota",
  normalizePlaceString("Northfield ,  Minnesota")
);
check(
  'normalizeCity drops the qualifier ("Bengaluru, Karnataka")',
  normalizeCity("Bengaluru, Karnataka") === "bengaluru",
  normalizeCity("Bengaluru, Karnataka")
);
check(
  "normalizeCity folds diacritics (Gurgáon)",
  normalizeCity("Gurgáon") === "gurgaon",
  normalizeCity("Gurgáon")
);
check(
  'cityNameVariants("Bangalore") includes bengaluru',
  cityNameVariants("Bangalore").includes("bengaluru"),
  cityNameVariants("Bangalore").join(", ")
);
check(
  'cityNameVariants("Gurgaon") includes gurugram',
  cityNameVariants("Gurgaon").includes("gurugram"),
  cityNameVariants("Gurgaon").join(", ")
);

/* ------------------------------------------------------------------ */
if (failures) {
  console.error(`\ngeocode-check: ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log("\ngeocode-check: clean");
}
