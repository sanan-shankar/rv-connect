import assert from "node:assert/strict";
import test from "node:test";

import { academicSpanLabel, parseHouseSpans } from "./house-spans.ts";

/* This file used to pin `seedHouseYearRows`, the editor that built a column of
   year rows. That editor was replaced by the house chain and the library went
   with it in the 2026-08-25 refactor audit. What is pinned here now is what
   actually ships: the label every house chip prints, and the collapsing rule
   behind audit Low 99. */

test("an academic year is labelled by the year it ENDS in", () => {
  // `year: 2014` means the 2014-15 academic year, not literal 2014, so the
  // suffix is always the following year. A one-year stint is a span of one.
  assert.equal(academicSpanLabel(2014, 2014), "2014-15");
  assert.equal(academicSpanLabel(2014, 2017), "2014-18");
});

test("the century rolls over without losing the leading zero", () => {
  // 1999-00, not 1999-0: the suffix is padded, which is the whole reason this
  // is a function and not a template literal at each call site.
  assert.equal(academicSpanLabel(1999, 1999), "1999-00");
  assert.equal(academicSpanLabel(2008, 2008), "2008-09");
});

test("a same-house run collapses, but a skipped year opens a new span", () => {
  // Audit Low 99: the old check collapsed across ANY gap, so a member who
  // recorded Golden for 2014, 2015 and 2017 was shown "Golden 2014-18",
  // asserting a year they never said they were in that house.
  const raw = JSON.stringify([
    { year: 2014, house: "Golden" },
    { year: 2015, house: "Golden" },
    { year: 2017, house: "Golden" },
  ]);

  assert.deepEqual(parseHouseSpans(raw), [
    { house: "Golden", fromYear: 2014, toYear: 2015 },
    { house: "Golden", fromYear: 2017, toYear: 2017 },
  ]);
});

test("malformed stored houses parse to nothing rather than throwing", () => {
  // The column is free-form JSON written by older code paths; a profile page
  // must never 500 because one row is junk.
  assert.deepEqual(parseHouseSpans(null), []);
  assert.deepEqual(parseHouseSpans("not json"), []);
  assert.deepEqual(parseHouseSpans(JSON.stringify({ year: 2014 })), []);
});
