import { test } from "node:test";
import assert from "node:assert/strict";
import { read } from "./test-kit.mjs";
import {
  FIRST_BATCH_YEAR,
  LAST_BATCH_YEAR,
  parseBatchYear,
  parseBatchYearList,
  yearClashMessage,
} from "./batch-year.ts";

test("a plain year in range reads as itself", () => {
  assert.equal(parseBatchYear("1990"), 1990);
  assert.equal(parseBatchYear(2024), 2024);
  assert.equal(parseBatchYear(String(FIRST_BATCH_YEAR)), FIRST_BATCH_YEAR);
  assert.equal(parseBatchYear(String(LAST_BATCH_YEAR)), LAST_BATCH_YEAR);
});

test("nothing that is not a year comes back as a number", () => {
  // The whole point: every one of these used to reach Prisma. "abc" as NaN
  // (which throws and 500s the directory, audit M23) and "1.5" as a float
  // (which survives filter(Boolean) and then fails an Int column, Low 70).
  for (const bad of ["abc", "1.5", "", "  ", "NaN", "Infinity", "-Infinity", "1e400", "0x7d0"]) {
    assert.equal(parseBatchYear(bad), null, `${JSON.stringify(bad)} should not parse`);
  }
  assert.equal(parseBatchYear(NaN), null);
  assert.equal(parseBatchYear(Infinity), null);
  assert.equal(parseBatchYear(undefined), null);
  assert.equal(parseBatchYear(null), null);
});

test("years outside the school's lifetime are not years", () => {
  assert.equal(parseBatchYear(String(FIRST_BATCH_YEAR - 1)), null);
  assert.equal(parseBatchYear(String(LAST_BATCH_YEAR + 1)), null);
  assert.equal(parseBatchYear("0"), null);
  assert.equal(parseBatchYear("-1990"), null);
});

test("a list drops what it cannot read and keeps the order of what it can", () => {
  assert.deepEqual(parseBatchYearList("1990,abc,2000"), [1990, 2000]);
  assert.deepEqual(parseBatchYearList(" 1990 , 1991 "), [1990, 1991]);
  assert.deepEqual(parseBatchYearList(""), []);
  assert.deepEqual(parseBatchYearList(null), []);
});

test("a list de-duplicates, so a crafted query cannot pad the IN clause", () => {
  assert.deepEqual(parseBatchYearList("1990,1990,1990,1991"), [1990, 1991]);
});

/* ------------------------------------------------------------------ *
 *  Signup and the profile editor ask for the same four numbers.
 *
 *  They used to answer differently. The editor refused a batch year earlier
 *  than the year you left -- the two fields swapped -- and signup accepted
 *  it, then derived a null batchType from exactly that pair: an account
 *  outside every batch-targeted post, mis-joined to the batch group, with
 *  nothing on screen to say why (bug-report-2 C-043).
 * ------------------------------------------------------------------ */

test("the pair the profile editor refuses is refused", () => {
  const clash = yearClashMessage({ batchYear: 2005, yearLeft: 2010, yearJoined: 2003 });
  assert.match(clash ?? "", /batch year cannot be before the year you left/);
});

test("an ordinary set of years passes", () => {
  assert.equal(yearClashMessage({ yearJoined: 2003, yearLeft: 2010, batchYear: 2010 }), null);
  // The batch year is often a year AFTER leaving (an ICSE leaver's ISC batch).
  assert.equal(yearClashMessage({ yearJoined: 2003, yearLeft: 2008, batchYear: 2010 }), null);
});

test("leaving before joining, and teaching that ended before it began", () => {
  assert.match(yearClashMessage({ yearJoined: 2010, yearLeft: 2003 }) ?? "", /left before you joined/);
  assert.match(yearClashMessage({ taughtFrom: 2010, taughtUntil: 2003 }) ?? "", /ended before it began/);
});

test("a missing year is not a clash", () => {
  // Teachers leave the leaving year blank to say "still here", and a partial
  // form must not be refused for the field somebody has not reached yet.
  assert.equal(yearClashMessage({}), null);
  assert.equal(yearClashMessage({ yearJoined: 2003 }), null);
  assert.equal(yearClashMessage({ batchYear: 2005, yearLeft: null }), null);
  assert.equal(yearClashMessage({ taughtFrom: 2003, taughtUntil: null }), null);
});

test("both writers ask this one rule", () => {
  // Shape-checked: both files import through the @/ alias. What matters is
  // that neither hand-rolls the comparison again, which is how they drifted.
  for (const file of [
    "src/components/auth/actions.ts",
    "src/components/profile/profile-actions.ts",
  ]) {
    const src = read(file);
    // The CALL, not the import: an import that nothing calls is exactly how a
    // shape test goes vacuous, and this repo has been bitten by it four times.
    assert.match(src, /yearClashMessage\s*\(/, `${file} no longer asks the shared year rule`);
    assert.ok(
      !/yearLeft\s*<\s*[\w.]*yearJoined|batchYear\s*<\s*[\w.]*yearLeft/.test(src),
      `${file} compares the years by hand again`
    );
  }
});
