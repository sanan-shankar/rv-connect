import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIRST_BATCH_YEAR,
  LAST_BATCH_YEAR,
  parseBatchYear,
  parseBatchYearList,
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
