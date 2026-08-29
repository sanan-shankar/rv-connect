import { test } from "node:test";
import assert from "node:assert/strict";
import {
  eraFromPartial,
  eraPhrase,
  eraSaid,
  eraSeekBoundary,
  photoDate,
  takenLabel,
} from "./collection.ts";

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

/* ------------------------------------------------------------------ *
 *  ...AND WHAT GETS WRITTEN IN THE FIRST PLACE.
 *
 *  Above is the read side: a stored row printed back at the precision it
 *  was given. Below is the write side, which changed on 2026-08-29 when
 *  the contribute room's ten decade pills became one numeric box and how
 *  much you type became the precision. Same file because it is one
 *  subject, and the two halves have to agree: `photoDate` writing
 *  {era:"1970s", decade} is only correct because `takenLabel` reads it
 *  back as "the 1970s".
 *
 *  Worth pinning because a photograph mis-filed here is wrong in the
 *  decade rail, in the Chronological order and in every era filter, and
 *  nobody notices until someone goes looking for the 1970s.
 *
 *  `thisYear` is passed in rather than read from the clock, so the
 *  ceiling cases still mean something in 2031.
 * ------------------------------------------------------------------ */

const THIS_YEAR = 2026;
const date = (year, month = "") => photoDate({ year, month }, THIS_YEAR);

test("an empty box is unknown, which is what leaving it blank means", () => {
  assert.deepEqual(date(""), { era: "unknown", datePrecision: "unknown" });
});

test("one or two digits is not an answer yet", () => {
  assert.deepEqual(date("1"), { era: "unknown", datePrecision: "unknown" });
  assert.deepEqual(date("19"), { era: "unknown", datePrecision: "unknown" });
});

test("three digits is that decade", () => {
  assert.deepEqual(date("197"), { era: "1970s", datePrecision: "decade" });
  assert.deepEqual(date("202"), { era: "2020s", datePrecision: "decade" });
});

test("a decade older than the archive's buckets collapses into pre-1940s", () => {
  assert.deepEqual(date("193"), { era: "pre-1940s", datePrecision: "decade" });
  assert.deepEqual(date("190"), { era: "pre-1940s", datePrecision: "decade" });
});

test("a decade that is not a decade says nothing rather than inventing one", () => {
  assert.equal(eraFromPartial("999"), null);
  assert.deepEqual(date("999"), { era: "unknown", datePrecision: "unknown" });
});

test("four digits is a year", () => {
  assert.deepEqual(date("1978"), { photoYear: 1978, datePrecision: "year" });
});

test("a year and a month is a month", () => {
  assert.deepEqual(date("1978", "March"), {
    photoYear: 1978,
    photoMonth: 3,
    datePrecision: "month",
  });
  assert.deepEqual(date("1978", "December"), {
    photoYear: 1978,
    photoMonth: 12,
    datePrecision: "month",
  });
});

test("a month nobody recognises is dropped, and the year survives it", () => {
  assert.deepEqual(date("1978", "Smarch"), { photoYear: 1978, datePrecision: "year" });
});

test("a year outside the archive's range is not a year", () => {
  assert.deepEqual(date("1899"), { era: "unknown", datePrecision: "unknown" });
  assert.deepEqual(date("2027"), { era: "unknown", datePrecision: "unknown" });
});

test("the boundaries themselves are inside", () => {
  assert.deepEqual(date("1926"), { photoYear: 1926, datePrecision: "year" });
  assert.deepEqual(date(String(THIS_YEAR)), { photoYear: THIS_YEAR, datePrecision: "year" });
});

/* The field's own label reads this back while you type, so it has to be a
   sentence rather than a filter chip's words. */
test("a decade reads as a sentence, and pre-1940s is not one", () => {
  assert.equal(eraSaid("1970s"), "the 1970s");
  assert.equal(eraSaid("pre-1940s"), "the years before 1940");
});

/* The two halves meeting: what the box writes, the viewer prints. */
test("what the contribute box writes is what the viewer reads back", () => {
  assert.equal(takenLabel(date("197")), "the 1970s");
  assert.equal(takenLabel(date("1978")), "1978");
  assert.equal(takenLabel(date("1978", "March")), "March 1978");
  assert.equal(takenLabel(date("")), null);
});

/* ------------------------------------------------------------------ *
 *  The decade rail's own boundary: where a seek into one era stops
 *  belonging to it and starts belonging to the next one up.
 * ------------------------------------------------------------------ */

test("a decade's boundary is the next decade's start, times 100", () => {
  assert.equal(eraSeekBoundary("1970s"), 198000);
  assert.equal(eraSeekBoundary("pre-1940s"), 194000);
});

test("the newest real decade has nothing above it to seek past", () => {
  assert.equal(eraSeekBoundary("2020s"), null);
});

test("undated has no ceiling of its own -- 1, since its key is always 0", () => {
  assert.equal(eraSeekBoundary("unknown"), 1);
});

test("an era outside the vocabulary asks for nothing and gets nothing", () => {
  assert.equal(eraSeekBoundary("1930s"), null);
  assert.equal(eraSeekBoundary(""), null);
});
