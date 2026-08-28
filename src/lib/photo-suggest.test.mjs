import test from "node:test";
import assert from "node:assert/strict";

import {
  BUCKET_RULES,
  SUGGEST_CAPTION_MAX,
  VALLEY_GLOSSARY,
  planChange,
  readVerdicts,
  tidyCaption,
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
 * ------------------------------------------------------------------ */

const KNOWN = new Set(["a", "b", "c"]);

/** A row nobody filled anything in on: the case this exists for. */
const blank = (id = "a") => ({
  id,
  subject: "",
  caption: null,
  era: null,
  datePrecision: "unknown",
});

/* ---------------- reading what a session wrote ---------------- */

test("a well-formed verdict is read, de-duplicated and tidied", () => {
  const { verdicts, problems } = readVerdicts(
    [{ id: "a", buckets: ["people", "school-life", "people"], caption: "  Assembly,\n  before the bell. " }],
    KNOWN
  );
  assert.deepEqual(problems, []);
  assert.equal(verdicts.length, 1);
  assert.deepEqual(verdicts[0].buckets, ["people", "school-life"]);
  assert.equal(verdicts[0].caption, "Assembly, before the bell.");
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

test("a caption is cut to the column's own limit", () => {
  const long = "x".repeat(SUGGEST_CAPTION_MAX + 50);
  assert.equal(tidyCaption(long).length, SUGGEST_CAPTION_MAX);
});

/* ---------------- what may be written ---------------- */

test("a blank row takes everything the verdict offers", () => {
  const change = planChange(blank(), {
    id: "a",
    buckets: ["people", "school-life"],
    caption: "Assembly.",
    era: "1970s",
  });
  assert.deepEqual(change.set, {
    subject: "people,school-life",
    caption: "Assembly.",
    era: "1970s",
    datePrecision: "decade",
  });
  assert.deepEqual(change.kept, []);
});

test("a bucket somebody already chose is never replaced", () => {
  const change = planChange(
    { ...blank(), subject: "birds" },
    { id: "a", buckets: ["people"], caption: "A hoopoe." }
  );
  assert.equal(change.set.subject, undefined, "their filing must survive");
  assert.equal(change.set.caption, "A hoopoe.");
  assert.match(change.kept.join(" "), /already filed/);
});

test("a caption somebody wrote is never replaced, whitespace-only aside", () => {
  const theirs = planChange(
    { ...blank(), caption: "The banyan, this morning." },
    { id: "a", buckets: ["nature"], caption: "A large tree." }
  );
  assert.equal(theirs.set.caption, undefined);
  assert.match(theirs.kept.join(" "), /already has a caption/);

  const empty = planChange(
    { ...blank(), caption: "   " },
    { id: "a", buckets: ["nature"], caption: "A large tree." }
  );
  assert.equal(empty.set.caption, "A large tree.");
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
    { id: "a", subject: "people", caption: "Class of 78.", era: "1970s", datePrecision: "year" },
    { id: "a", buckets: ["nature"], caption: "Some trees.", era: "2020s" }
  );
  assert.equal(change, null);
});

test("every change carries the old values, so it can be undone exactly", () => {
  const change = planChange(blank(), { id: "a", buckets: ["birds"], caption: "A hoopoe." });
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
