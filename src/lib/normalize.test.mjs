import assert from "node:assert/strict";
import test from "node:test";

import * as normalize from "./normalize.ts";

test("shortPlaceLabel shows only the primary place name", () => {
  assert.equal(normalize.shortPlaceLabel?.("Delhi, Delhi"), "Delhi");
  assert.equal(normalize.shortPlaceLabel?.("London, England, United Kingdom"), "London");
  assert.equal(normalize.shortPlaceLabel?.("Northfield, Minnesota, United States"), "Northfield");
});

test("shortPlaceLabel preserves a place that has no qualifier", () => {
  assert.equal(normalize.shortPlaceLabel?.("  New Delhi  "), "New Delhi");
});
