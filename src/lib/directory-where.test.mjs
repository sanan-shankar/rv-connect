import assert from "node:assert/strict";
import test from "node:test";
import { cityFilterTargets } from "./city-coords.ts";
import { read } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A city chip finds the people whose city it was read from.
 *
 *  Every city the directory offers as a filter -- the facet dropdown, the
 *  chips, the map's "See all" -- is a string read straight back out of
 *  UserPlace.city. The filter then ran that value through the gazetteer's
 *  normalizer, which folds accents and drops a comma-qualified tail, and
 *  compared the folded key against the RAW column with Postgres's
 *  case-insensitive mode. Postgres folds case only, never accents, so
 *  "Zürich" never equalled "zurich" and the one chip naming a member's city
 *  led to an empty page (bug-report-2 C-091). Reproduced live against a
 *  seeded accented row and a comma-qualified one, before the fix and after.
 *
 *  The property, not the literal: whatever the caller asked for must be
 *  among the values the query compares against.
 * ------------------------------------------------------------------ */

test("the exact value the member picked is always one of the targets", () => {
  for (const city of ["Zürich", "Northfield, Minnesota", "São Paulo", "Bengaluru", "Delhi"]) {
    assert.ok(
      cityFilterTargets(city).includes(city),
      `filtering on "${city}" never compares against "${city}" itself, so the chip that ` +
        `offered it cannot find the rows it came from`
    );
  }
});

test("the picked value comes first", () => {
  // Not cosmetic: it is the arm that matches the stored string exactly, and
  // reading the array should say which one is the answer to the question asked.
  assert.equal(cityFilterTargets("  Zürich  ")[0], "Zürich");
});

test("the folded aliases are still there beside it", () => {
  // The reason the normalizer was in this path at all: one place, two names.
  const targets = cityFilterTargets("Bangalore");
  assert.ok(targets.includes("bengaluru"), "Bangalore no longer finds members stored as Bengaluru");
  assert.ok(targets.includes("Bangalore"), "the picked spelling was dropped");
});

test("nothing asked for, nothing to compare", () => {
  assert.deepEqual(cityFilterTargets(""), []);
  assert.deepEqual(cityFilterTargets("   "), []);
  assert.deepEqual(cityFilterTargets(null), []);
});

test("the directory filter still uses this rule, and still by equality", () => {
  // The rule is only worth anything where it is spent. Shape-checked because
  // where.ts imports through the @/ alias, which the unit gate's plain `node`
  // cannot resolve.
  const src = read("src/app/(main)/directory/where.ts");
  assert.match(src, /cityFilterTargets\s*\(/, "the directory no longer builds its city targets from the shared rule");
  const branch = src.slice(src.indexOf("if (filters.city)"), src.indexOf("if (filters.profession)"));
  assert.match(
    branch,
    /city:\s*\{\s*equals:/,
    "the city filter matches by something other than equality: Low 69 was Delhi returning New Delhi"
  );
});
