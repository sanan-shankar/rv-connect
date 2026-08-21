import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeHouse } from "./houses.ts";
import { parseHouseSpans } from "./house-spans.ts";

/* --- A house name typed by hand (audit M41) ------------------------------- */

test("a real house, however it is spelled, comes back canonical", () => {
  assert.equal(normalizeHouse("cauvery"), "Cauvery");
  assert.equal(normalizeHouse("KAVERI"), "Cauvery");
  assert.equal(normalizeHouse("  amaltas  "), "Amaltash");
});

test("a word that happens to name a JavaScript builtin is not a house", () => {
  /* The alias table is a plain object literal, so it inherits every method on
     Object.prototype. `HOUSE_ALIASES["constructor"]` is the Object
     constructor -- truthy -- so the old lookup "resolved" and handed a
     FUNCTION back where a house name was expected (audit M41). These must all
     fall through to the title-case path like any other unknown word. */
  for (const word of ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"]) {
    const out = normalizeHouse(word);
    assert.equal(typeof out, "string", `${word} did not come back as a string`);
    assert.ok(
      !out.includes("function") && !out.includes("["),
      `${word} resolved to something from the prototype chain: ${out}`
    );
  }
});

test("an unknown word is title-cased rather than dropped", () => {
  assert.equal(normalizeHouse("banyan"), "Banyan");
  assert.equal(normalizeHouse("two words"), "Two Words");
});

/* --- Spans over the years a member actually recorded (audit Low 99) ------- */

const houses = (...pairs) => JSON.stringify(pairs.map(([year, house]) => ({ year, house })));

test("consecutive years in one house collapse into a single span", () => {
  const spans = parseHouseSpans(houses([2014, "Cauvery"], [2015, "Cauvery"], [2016, "Cauvery"]));
  assert.deepEqual(spans, [{ house: "Cauvery", fromYear: 2014, toYear: 2016 }]);
});

test("an unrecorded year breaks the span instead of being claimed", () => {
  // 2016 is not recorded at all. The old rule merged anyway and printed one
  // span covering a year the member never said they were in that house.
  const spans = parseHouseSpans(houses([2014, "Cauvery"], [2015, "Cauvery"], [2017, "Cauvery"]));
  assert.deepEqual(spans, [
    { house: "Cauvery", fromYear: 2014, toYear: 2015 },
    { house: "Cauvery", fromYear: 2017, toYear: 2017 },
  ]);
});

test("a duplicate year in the same house does not open a second span", () => {
  const spans = parseHouseSpans(houses([2014, "Cauvery"], [2014, "Cauvery"], [2015, "Cauvery"]));
  assert.deepEqual(spans, [{ house: "Cauvery", fromYear: 2014, toYear: 2015 }]);
});

test("changing house opens a new span even in the very next year", () => {
  const spans = parseHouseSpans(houses([2014, "Cauvery"], [2015, "Raavi"]));
  assert.deepEqual(spans, [
    { house: "Cauvery", fromYear: 2014, toYear: 2014 },
    { house: "Raavi", fromYear: 2015, toYear: 2015 },
  ]);
});

test("nothing recorded is no spans, not a crash", () => {
  assert.deepEqual(parseHouseSpans(null), []);
  assert.deepEqual(parseHouseSpans(""), []);
  assert.deepEqual(parseHouseSpans("not json"), []);
  assert.deepEqual(parseHouseSpans("[]"), []);
});
