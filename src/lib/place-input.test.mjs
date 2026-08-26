import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { ROOT, decomment } from "./test-kit.mjs";
import {
  MAX_PLACES,
  formatPlaceLabel,
  legacyCityColumns,
  parsePlaces,
  resolvePlaces,
} from "./place-input.ts";

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

/* ── The canonical-city rule ──────────────────────────────────────────────
   This is the half of the Delhi/New Delhi fix that has to survive: the
   previous attempt was an UPDATE, it fixed the rows that existed, and new
   members went straight back to picking Delhi (owner, 2026-08-22). A rule
   that quietly stops running looks exactly like no rule at all, so it is
   pinned here rather than left to be noticed again in six months.

   The gazetteer lookup is a stub. resolvePlaces takes it as an argument for
   this reason: the shaping is testable without a database. */

const DELHI = 1273294;
const NEW_DELHI = 1261481;

const GAZETTEER = new Map([
  [DELHI, { id: DELHI, name: "Delhi", admin1: "Delhi", country: "IN", lat: 28.65195, lng: 77.23149 }],
  [NEW_DELHI, { id: NEW_DELHI, name: "New Delhi", admin1: "Delhi", country: "IN", lat: 28.62137, lng: 77.2148 }],
  [1277333, { id: 1277333, name: "Bengaluru", admin1: "Karnataka", country: "IN", lat: 12.97194, lng: 77.59369 }],
  [5128581, { id: 5128581, name: "New York City", admin1: "New York", country: "US", lat: 40.71427, lng: -74.0060 }],
]);

const lookup = async (ids) => new Map(ids.filter((id) => GAZETTEER.has(id)).map((id) => [id, GAZETTEER.get(id)]));
const same = (s) => s;

test("picking Delhi is stored as New Delhi, coordinates and all", async () => {
  const [row] = await resolvePlaces(
    [{ placeId: DELHI, label: "Delhi, Delhi", city: "Delhi", lat: 28.65195, lng: 77.23149 }],
    same,
    lookup
  );
  assert.equal(row.placeId, NEW_DELHI);
  assert.equal(row.city, "New Delhi");
  assert.equal(row.label, "New Delhi, Delhi");
  // The map clusters on coordinates, not on placeId: leaving the old lat/lng
  // is how the previous merge still drew two pins 3.4km apart.
  assert.equal(row.lat, 28.62137);
  assert.equal(row.lng, 77.2148);
});

test("a city typed by hand when the search was down collapses too", async () => {
  const [row] = await resolvePlaces(
    [{ placeId: null, label: "Delhi", city: "Delhi", lat: null, lng: null }],
    same,
    lookup
  );
  assert.equal(row.placeId, NEW_DELHI);
  assert.equal(row.label, "New Delhi, Delhi");
  assert.equal(row.lat, 28.62137);
});

test("listing both Delhi and New Delhi leaves one row, in the order chosen", async () => {
  const rows = await resolvePlaces(
    [
      { placeId: 1277333, label: "Bengaluru, Karnataka", city: "Bengaluru", lat: 12.97194, lng: 77.59369 },
      { placeId: DELHI, label: "Delhi, Delhi", city: "Delhi", lat: 28.65195, lng: 77.23149 },
      { placeId: NEW_DELHI, label: "New Delhi, Delhi", city: "New Delhi", lat: 28.62137, lng: 77.2148 },
    ],
    same,
    lookup
  );
  assert.deepEqual(rows.map((r) => r.label), ["Bengaluru, Karnataka", "New Delhi, Delhi"]);
});

test("a place with no alias is left exactly as it came", async () => {
  const given = { placeId: 1277333, label: "Bengaluru, Karnataka", city: "Bengaluru", lat: 12.97194, lng: 77.59369 };
  const [row] = await resolvePlaces([given], same, lookup);
  assert.deepEqual(row, given);
});

test("a placeId the gazetteer does not know degrades to free text, not a foreign key error", async () => {
  const [row] = await resolvePlaces(
    [{ placeId: 999999999, label: "Nowhere", city: "Nowhere", lat: 1, lng: 1 }],
    same,
    lookup
  );
  assert.equal(row.placeId, null);
  assert.equal(row.label, "Nowhere");
});

test("a non-Indian label keeps its country, an Indian one does not repeat it", () => {
  assert.equal(formatPlaceLabel(GAZETTEER.get(5128581)), "New York City, New York, United States");
  assert.equal(formatPlaceLabel(GAZETTEER.get(NEW_DELHI)), "New Delhi, Delhi");
});

/* ---- C-101: the legacy city columns are mirrored, both of them ------- */

test("clearing every place clears BOTH legacy city columns", () => {
  /* The profile falls back to [currentCity, secondaryCity] while a member's
     places list is empty. The writers mirrored only the first, so a member who
     still carried a pre-migration secondaryCity and then deleted every place
     got currentCity nulled and the stale second city resurrected on their own
     page -- a place they had just removed, back again. */
  assert.deepEqual(legacyCityColumns([]), { currentCity: null, secondaryCity: null });
  assert.deepEqual(legacyCityColumns([{ label: "Mumbai" }]), {
    currentCity: "Mumbai",
    secondaryCity: null,
  });
  assert.deepEqual(legacyCityColumns([{ label: "Mumbai" }, { label: "Bengaluru" }]), {
    currentCity: "Mumbai",
    secondaryCity: "Bengaluru",
  });
  // A third place has nowhere to go in the legacy pair, and must not displace
  // either of the two that do.
  assert.deepEqual(
    legacyCityColumns([{ label: "Mumbai" }, { label: "Bengaluru" }, { label: "Chennai" }]),
    { currentCity: "Mumbai", secondaryCity: "Bengaluru" }
  );
});

test("every place writer mirrors the legacy columns from the one helper", () => {
  /* THREE writers, and the whole bug was that they each mirrored half of it.
     Counted, not detected: a check that "some file calls legacyCityColumns"
     passes on a codebase where two of the three still hand-roll it. */
  const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
      if (name === "generated" || name === "node_modules" || name === "lab") continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.tsx?$/.test(name)) out.push(full);
    }
    return out;
  };
  const callers = [];
  const handRolled = [];
  const HELPER = resolve(ROOT, "src/lib/place-input.ts");
  for (const file of walk(resolve(ROOT, "src"))) {
    // The helper itself is where the rule is allowed to be written out.
    if (file === HELPER) continue;
    const src = readFileSync(file, "utf8");
    const code = decomment(src);
    if (/legacyCityColumns\(/.test(code)) callers.push(file);
    // The shape it replaced. Anything writing currentCity off a places list
    // by hand is a fourth copy of the rule.
    if (/currentCity:\s*(cleaned|cleanedPlaces|places)\[0\]/.test(code)) handRolled.push(file);
  }
  assert.deepEqual(handRolled, [], "a place writer mirrors currentCity by hand again (C-101)");
  assert.ok(
    callers.length >= 3,
    `only ${callers.length} place writers call legacyCityColumns; there are three ` +
      "(settings, admin, onboarding) and each one that stops calling it leaves a " +
      "stale secondaryCity behind"
  );
});
