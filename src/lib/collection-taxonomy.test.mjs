import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  BUCKETS,
  BUCKET_VALUES,
  ERAS,
  ERA_START_YEAR,
  bucketLabel,
  bucketsOf,
  eraSortYear,
  takenShort,
} from "./collection.ts";

/* ------------------------------------------------------------------ *
 *  The six buckets, and the fourteen values they replaced.
 *
 *  The old vocabulary was drawn up under "the place, not people" and had
 *  nowhere at all to file a class photograph, which is why it is being
 *  replaced rather than extended (campaign D2). The rows carrying it are
 *  remapped by a migration; the app maps on read as well, because a value
 *  can still arrive from the demo database's own seeds or from a browser
 *  holding a form built before the deploy.
 * ------------------------------------------------------------------ */

/** Every value the fourteen-item list could hold. */
const OLD_VOCABULARY = [
  "birds", "wildlife", "landscape", "campus", "buildings", "banyan",
  "rishi-konda", "hills", "weather-sky", "flora", "assembly-dining",
  "arts-music", "sport-outdoors", "historical",
];

test("every value of the old taxonomy still lands in one of the six", () => {
  for (const old of OLD_VOCABULARY) {
    const [bucket, ...rest] = bucketsOf(old);
    assert.ok(BUCKET_VALUES.includes(bucket), `${old} maps to ${bucket}, which is not a bucket`);
    assert.equal(rest.length, 0, `${old} maps to more than one bucket`);
    assert.ok(bucketLabel(old), `${old} has no label`);
  }
});

test("a value from neither vocabulary is filed under Other, never dropped", () => {
  /* Other is a SENSOR, not a bin: something unaccounted for has to show up
     where we are looking rather than disappear from every bucket. The
     migration writes the same answer into the column. */
  assert.deepEqual(bucketsOf("cave-rock"), ["other"]);
  assert.equal(bucketLabel("cave-rock"), "Other");
});

test("four old values collapse onto Nature, and arrive as one Nature", () => {
  assert.deepEqual(bucketsOf("hills,flora"), ["nature"]);
  assert.deepEqual(bucketsOf("wildlife,landscape,weather-sky"), ["nature"]);
  // And a genuine pair stays a pair.
  assert.deepEqual(bucketsOf("banyan,people"), ["campus", "people"]);
});

test("nothing filed is nothing, not an empty string in a list", () => {
  for (const nothing of [null, undefined, "", " ", ",", ",,"]) {
    assert.deepEqual(bucketsOf(nothing), [], JSON.stringify(nothing));
  }
});

test("six buckets, and Other is the last of them", () => {
  // Small enough to pick from without reading, and to lay across a title
  // line. If a seventh is ever added, check the `contains` match in
  // buildCollectionWhere: it is exact only while no value is a substring of
  // another.
  assert.equal(BUCKETS.length, 6);
  assert.equal(BUCKETS[BUCKETS.length - 1].value, "other");
  for (const a of BUCKET_VALUES) {
    for (const b of BUCKET_VALUES) {
      if (a === b) continue;
      assert.ok(!b.includes(a), `"${a}" is a substring of "${b}", so the bucket filter would over-match`);
    }
  }
});

/* ------------------------------------------------------------------ *
 *  When, and the one number that has to agree with Postgres.
 * ------------------------------------------------------------------ */

test("ERA_START_YEAR is the same mapping the takenKey column computes", () => {
  /* `takenKey` is a GENERATED column, so this table exists twice: once in
     TypeScript for the river's fixtures and its labels, once in SQL for the
     ordering. They cannot be shared, so they are compared. */
  const sql = readFileSync(
    new URL("../../prisma/migrations-manual/2026-08-28-collection-river.sql", import.meta.url),
    "utf8"
  );
  const generated = sql.slice(sql.indexOf('ADD COLUMN IF NOT EXISTS "takenKey"'));
  for (const [era, year] of Object.entries(ERA_START_YEAR)) {
    const line = new RegExp(`WHEN '${era}'\\s+THEN ${year}\\b`);
    assert.match(generated, line, `${era} is ${year} in TypeScript; the migration disagrees`);
  }
  // Every dated era is in the table, and only "unknown" is not.
  for (const e of ERAS) {
    if (e.value === "unknown") assert.equal(eraSortYear(e.value), null);
    else assert.ok(eraSortYear(e.value), `${e.value} has no sort year`);
  }
});

test("the tile says the shortest true thing about when, or nothing", () => {
  assert.equal(takenShort({ photoYear: 1978, era: "1970s" }), "1978");
  assert.equal(takenShort({ photoYear: null, era: "1970s" }), "1970s");
  assert.equal(takenShort({ photoYear: null, era: "pre-1960s" }), "Pre-1960s");
  // Nothing at all rather than a guess: the owner's whole complaint about the
  // viewer was a date that was not the photograph's.
  assert.equal(takenShort({ photoYear: null, era: "unknown" }), null);
  assert.equal(takenShort({}), null);
});
