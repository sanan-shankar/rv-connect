import { test } from "node:test";
import assert from "node:assert/strict";
import { valleyYear } from "./utils.ts";

/* valleyYear is the CEILING `yearGiven` compares a contributor's typed year
   against, and it runs in the browser. If it ever returns NaN, every year is
   rejected and every photograph files as undated with nothing said. */

test("a normal runtime reads the valley's year", () => {
  assert.equal(valleyYear(new Date("2026-08-30T12:00:00Z")), 2026);
});

test("it is never NaN, whatever the runtime's locale data does", () => {
  const broken = new Date("2026-08-30T12:00:00Z");
  // A runtime that ignores "en-CA" and formats some other way.
  broken.toLocaleDateString = () => "30/08/2026";
  assert.equal(valleyYear(broken), 2026);

  const american = new Date("2026-08-30T12:00:00Z");
  american.toLocaleDateString = () => "8/30/2026";
  assert.equal(valleyYear(american), 2026);
});

test("an IST date late on 31 December still reads as that year", () => {
  // 18:30 UTC on the 31st is already the 1st in the valley.
  assert.equal(valleyYear(new Date("2026-12-31T19:00:00Z")), 2027);
});
