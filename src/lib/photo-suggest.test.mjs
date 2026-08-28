import test from "node:test";
import assert from "node:assert/strict";

import {
  BUCKET_RULES,
  VALLEY_GLOSSARY,
  planChange,
  readVerdicts,
} from "./photo-suggest.ts";
import { BUCKET_VALUES } from "./collection.ts";

/* ------------------------------------------------------------------ *
 *  The suggestion pass (spec sec. 8.3), which is now a session in this
 *  repo looking at photographs on disk rather than a paid API call.
 *
 *  Two things here are worth a test rather than a careful reading, and
 *  both are ways this could quietly damage a real archive:
 *
 *  1. A SEVENTH BUCKET must be refused, not coerced. The whole value of
 *     a closed vocabulary is that nothing outside it can be written, and
 *     a value silently mapped to Other makes "Other is a sensor" false --
 *     the sensor would be reading the mapping, not the archive.
 *  2. NOTHING A PERSON ANSWERED may be overwritten. There is no
 *     contributor in the room during a backfill, so the only honest
 *     version of "suggestions are never silent" is that a suggestion
 *     only ever fills a blank.
 *  3. NO CAPTION IS EVER WRITTEN (owner, 2026-08-28). A session can see
 *     a tree and a building; it cannot see a name, a house, a year or an
 *     occasion. A caption in a verdicts file is dropped and counted, not
 *     refused -- refusing would cost a batch of good buckets over a field
 *     whose correct handling is to ignore it.
 * ------------------------------------------------------------------ */

const KNOWN = new Set(["a", "b", "c"]);

/** A row nobody filled anything in on: the case this exists for. */
const blank = (id = "a") => ({
  id,
  subject: "",
  era: null,
  datePrecision: "unknown",
});

/* ---------------- reading what a session wrote ---------------- */

test("a well-formed verdict is read and de-duplicated", () => {
  const { verdicts, problems } = readVerdicts(
    [{ id: "a", buckets: ["people", "school-life", "people"] }],
    KNOWN
  );
  assert.deepEqual(problems, []);
  assert.equal(verdicts.length, 1);
  assert.deepEqual(verdicts[0].buckets, ["people", "school-life"]);
});

test("both file shapes are accepted: a bare array and { photos: [...] }", () => {
  const one = readVerdicts([{ id: "a", buckets: ["birds"] }], KNOWN);
  const two = readVerdicts({ photos: [{ id: "a", buckets: ["birds"] }] }, KNOWN);
  assert.deepEqual(one.verdicts, two.verdicts);
  assert.deepEqual([...one.problems, ...two.problems], []);
});

test("a seventh bucket is refused, never mapped to Other", () => {
  const { verdicts, problems } = readVerdicts(
    [{ id: "a", buckets: ["sports-day"] }],
    KNOWN
  );
  assert.equal(verdicts.length, 0, "an invented bucket must not reach the database");
  assert.equal(problems.length, 1);
  assert.match(problems[0].why, /not one of the six/);
});

test("every real bucket is accepted", () => {
  for (const b of BUCKET_VALUES) {
    const { verdicts, problems } = readVerdicts([{ id: "a", buckets: [b] }], KNOWN);
    assert.deepEqual(problems, [], `${b} was refused`);
    assert.deepEqual(verdicts[0].buckets, [b]);
  }
});

test("an id the batch did not export is refused", () => {
  // The one way this could write an answer onto the WRONG photograph.
  const { verdicts, problems } = readVerdicts([{ id: "z", buckets: ["nature"] }], KNOWN);
  assert.equal(verdicts.length, 0);
  assert.match(problems[0].why, /not one of the photographs/);
});

test("an empty bucket list is a problem, because Other exists for that", () => {
  const { verdicts, problems } = readVerdicts([{ id: "a", buckets: [] }], KNOWN);
  assert.equal(verdicts.length, 0);
  assert.match(problems[0].why, /other/i);
});

test("one bad entry does not take the batch down with it", () => {
  const { verdicts, problems } = readVerdicts(
    [
      { id: "a", buckets: ["birds"] },
      { id: "b", buckets: ["not-a-bucket"] },
      { id: "c", buckets: ["campus"] },
    ],
    KNOWN
  );
  assert.deepEqual(verdicts.map((v) => v.id), ["a", "c"]);
  assert.equal(problems.length, 1);
});

test("the same photograph answered twice is refused the second time", () => {
  const { verdicts, problems } = readVerdicts(
    [{ id: "a", buckets: ["birds"] }, { id: "a", buckets: ["nature"] }],
    KNOWN
  );
  assert.equal(verdicts.length, 1);
  assert.deepEqual(verdicts[0].buckets, ["birds"]);
  assert.match(problems[0].why, /twice/);
});

test("an invented decade is refused, and 'unknown' is simply no answer", () => {
  const bad = readVerdicts([{ id: "a", buckets: ["nature"], era: "1930s-ish" }], KNOWN);
  assert.equal(bad.verdicts.length, 0);
  assert.match(bad.problems[0].why, /not one of the decades/);

  const none = readVerdicts([{ id: "a", buckets: ["nature"], era: "unknown" }], KNOWN);
  assert.deepEqual(none.problems, []);
  assert.equal(none.verdicts[0].era, undefined);
});

test("a caption is dropped and counted, and the buckets beside it still land", () => {
  const { verdicts, problems, ignoredCaptions } = readVerdicts(
    [
      { id: "a", buckets: ["people"], caption: "Morning assembly under the banyan." },
      { id: "b", buckets: ["birds"] },
      { id: "c", buckets: ["nature"], caption: "   " },
    ],
    KNOWN
  );
  assert.deepEqual(problems, [], "a caption must not cost the batch");
  assert.equal(verdicts.length, 3);
  assert.equal(ignoredCaptions, 1, "whitespace is not a caption offered");
  for (const v of verdicts) {
    assert.equal("caption" in v, false, "no caption may survive into a verdict");
  }
});

test("no plan ever writes the caption column", () => {
  const change = planChange(blank(), {
    id: "a",
    buckets: ["people"],
    // Not a Verdict field any more; here as the shape a stale caller might
    // still pass, which must change nothing.
    caption: "Assembly.",
    era: "1970s",
  });
  assert.equal("caption" in change.set, false);
  assert.equal("caption" in change.was, false);
});

/* ---------------- what may be written ---------------- */

test("a blank row takes everything the verdict offers", () => {
  const change = planChange(blank(), {
    id: "a",
    buckets: ["people", "school-life"],
    era: "1970s",
  });
  assert.deepEqual(change.set, {
    subject: "people,school-life",
    era: "1970s",
    datePrecision: "decade",
  });
  assert.deepEqual(change.kept, []);
});

test("a bucket somebody already chose is never replaced", () => {
  const change = planChange(
    { ...blank(), subject: "birds" },
    { id: "a", buckets: ["people"], era: "1970s" }
  );
  assert.equal(change.set.subject, undefined, "their filing must survive");
  assert.match(change.kept.join(" "), /already filed/);
});

test("a date somebody gave is never overruled, at any precision", () => {
  for (const row of [
    { ...blank(), datePrecision: "year", era: "1970s" },
    { ...blank(), datePrecision: "month", era: "1980s" },
    { ...blank(), datePrecision: "decade", era: "1990s" },
    // A decade with no precision recorded still counts as answered.
    { ...blank(), era: "1960s" },
  ]) {
    const change = planChange(row, { id: "a", buckets: ["nature"], era: "2020s" });
    assert.equal(change?.set.era, undefined, `${row.datePrecision}/${row.era} was overwritten`);
    assert.equal(change?.set.datePrecision, undefined);
  }
});

test("a decade always brings its precision with it, so the two columns agree", () => {
  const change = planChange(blank(), { id: "a", buckets: ["nature"], era: "1980s" });
  assert.equal(change.set.era, "1980s");
  assert.equal(change.set.datePrecision, "decade");
});

test("a fully answered photograph plans no change at all", () => {
  const change = planChange(
    { id: "a", subject: "people", era: "1970s", datePrecision: "year" },
    { id: "a", buckets: ["nature"], era: "2020s" }
  );
  assert.equal(change, null);
});

test("every change carries the old values, so it can be undone exactly", () => {
  const change = planChange(blank(), { id: "a", buckets: ["birds"], era: "1980s" });
  for (const column of Object.keys(change.set)) {
    assert.ok(column in change.was, `${column} is written with no record of what it was`);
  }
});

/* ---------------- what the session is told ---------------- */

test("the glossary teaches the names a classifier cannot know", () => {
  // prior-art.md: "It will know 'tree' and 'building'. It will not know
  // 'the banyan' or 'Rishi Konda' unless we teach it those words."
  for (const name of ["banyan", "Rishi Konda", "sanctuary"]) {
    assert.match(VALLEY_GLOSSARY, new RegExp(name, "i"), `the glossary never mentions ${name}`);
  }
});

test("the rules name all six buckets, so none is a bucket nobody was told about", () => {
  for (const b of BUCKET_VALUES) {
    const word = b === "school-life" ? "School life" : b;
    assert.match(BUCKET_RULES, new RegExp(word, "i"), `${b} is not described`);
  }
});
