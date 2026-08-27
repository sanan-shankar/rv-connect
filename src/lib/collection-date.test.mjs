import { test } from "node:test";
import assert from "node:assert/strict";
import { takenLabel, eraPhrase } from "./collection.ts";

/* The viewer says WHEN A PHOTOGRAPH WAS TAKEN, at the precision the
   contributor gave and never finer -- the owner's complaint #21, that the
   date on screen was the day it was uploaded. */

test("a month and a year print as a month", () => {
  assert.equal(
    takenLabel({ photoYear: 1978, photoMonth: 5, datePrecision: "month", era: "1970s" }),
    "May 1978"
  );
});

test("a year alone prints as a year", () => {
  assert.equal(
    takenLabel({ photoYear: 1978, photoMonth: null, datePrecision: "year", era: "1970s" }),
    "1978"
  );
});

test("a stale month is ignored when the contributor said 'year'", () => {
  // The form keeps the month in state while the precision drops back to a
  // year, so the column can hold a month the contributor did not mean.
  assert.equal(
    takenLabel({ photoYear: 1978, photoMonth: 5, datePrecision: "year", era: "1970s" }),
    "1978"
  );
});

test("not sure of the year gives the decade in words", () => {
  assert.equal(
    takenLabel({ photoYear: null, photoMonth: null, datePrecision: "decade", era: "1970s" }),
    "the 1970s"
  );
  assert.equal(takenLabel({ era: "pre-1960s" }), "before 1960");
});

test("nothing given shows nothing, never a stand-in", () => {
  assert.equal(takenLabel({ era: "unknown" }), null);
  assert.equal(takenLabel({}), null);
  assert.equal(eraPhrase(""), null);
});

test("a row from before datePrecision existed still reads", () => {
  // Rows predating the column carry only photoYear (and its era), so the
  // fields decide and the precision only narrows.
  assert.equal(takenLabel({ photoYear: 1994, photoMonth: 8, era: "1990s" }), "August 1994");
  assert.equal(takenLabel({ photoYear: 1994, era: "1990s" }), "1994");
});

test("a month out of range is not indexed into", () => {
  assert.equal(takenLabel({ photoYear: 1978, photoMonth: 0 }), "1978");
  assert.equal(takenLabel({ photoYear: 1978, photoMonth: 13 }), "1978");
});
