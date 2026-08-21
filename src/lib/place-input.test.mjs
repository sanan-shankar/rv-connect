import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PLACES, parsePlaces } from "./place-input.ts";

const ok = { placeId: null, label: "Bangalore", city: "Bangalore", lat: 12.97, lng: 77.59 };

test("an ordinary place list is accepted and trimmed", () => {
  const out = parsePlaces([{ ...ok, label: "  Bangalore  " }]);
  assert.equal(out.ok, true);
  assert.equal(out.places[0].label, "Bangalore");
});

test("an oversized label is refused rather than written to a column", () => {
  // label mirrors into User.currentCity, which the directory sends to every
  // viewer, so an unbounded string here is everyone else's payload too.
  const out = parsePlaces([{ ...ok, label: "x".repeat(161) }]);
  assert.equal(out.ok, false);
  const huge = parsePlaces([{ ...ok, city: "x".repeat(2_000_000) }]);
  assert.equal(huge.ok, false);
});

test("coordinates must be real and on the planet", () => {
  for (const bad of [Number.NaN, Infinity, -Infinity, 91, -91]) {
    assert.equal(parsePlaces([{ ...ok, lat: bad }]).ok, false, `lat ${bad}`);
  }
  for (const bad of [Number.NaN, Infinity, 181, -181]) {
    assert.equal(parsePlaces([{ ...ok, lng: bad }]).ok, false, `lng ${bad}`);
  }
  // The poles and the date line are legitimate.
  assert.equal(parsePlaces([{ ...ok, lat: 90, lng: 180 }]).ok, true);
  assert.equal(parsePlaces([{ ...ok, lat: null, lng: null }]).ok, true);
});

test("a payload that is not a list of places is refused, not thrown at", () => {
  // The old code ran .map(p => p.label.trim()) straight off the wire, so any
  // of these produced a raw TypeError out of the server action.
  for (const bad of [null, undefined, "Bangalore", 42, {}, [null], ["Bangalore"], [{ label: 5 }]]) {
    const out = parsePlaces(bad);
    assert.equal(out.ok, false, JSON.stringify(bad));
    assert.equal(typeof out.error, "string");
  }
});

test("the list is capped", () => {
  assert.equal(parsePlaces(Array(MAX_PLACES).fill(ok)).ok, true);
  assert.equal(parsePlaces(Array(MAX_PLACES + 1).fill(ok)).ok, false);
});

test("a bogus placeId is refused before it can abort a transaction", () => {
  for (const bad of [0, -1, 1.5, Number.NaN]) {
    assert.equal(parsePlaces([{ ...ok, placeId: bad }]).ok, false, String(bad));
  }
  assert.equal(parsePlaces([{ ...ok, placeId: 1 }]).ok, true);
});

test("the refusal is a sentence, with no em dash", () => {
  const out = parsePlaces([{ ...ok, label: "" }]);
  assert.equal(out.ok, false);
  assert.ok(!out.error.includes("—"));
  assert.match(out.error, /\.\)?$/);
});
