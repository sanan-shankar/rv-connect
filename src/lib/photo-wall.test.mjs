import { test } from "node:test";
import assert from "node:assert/strict";
import { byContributor, groupStarts, shotsOf, UNMEASURED_RATIO } from "./photo-wall.ts";

/* ------------------------------------------------------------------ *
 *  The photo wall's arithmetic.
 *
 *  WHY THIS IS A TEST AND NOT A SCREENSHOT. `photo-wall` has been a
 *  question category since the feature was built and not one Edition in
 *  the live database has ever used it -- checked on 2026-09-09, zero rows.
 *  So the run he picked ships in build phase 8 with no page anywhere that
 *  draws it from real data, and the only honest verification of the part
 *  that can be wrong is this.
 *
 *  What can be wrong is the grouping. One person's photographs have to sit
 *  together under one name, because without that three photographs from
 *  one person read as three people and the wall stops being about the
 *  group -- and the viewer has to open on the photograph that was actually
 *  touched, which means the flat index and the grouped draw must agree.
 * ------------------------------------------------------------------ */

const person = (id, name) => ({ id, name });

const entry = (id, author, images, photos = [], body = null) => ({
  id,
  author,
  body,
  images,
  photos: images.map((_, i) => photos[i] ?? null),
});

const MEERA = person("u-meera", "Meera Joshi");
const ARUN = person("u-arun", "Arun Pillai");

test("every photograph on the wall, in the order they were written", () => {
  const shots = shotsOf([
    entry("e1", MEERA, ["a.webp", "b.webp"]),
    entry("e2", ARUN, ["c.webp"]),
  ]);
  assert.deepEqual(
    shots.map((s) => s.src),
    ["a.webp", "b.webp", "c.webp"],
  );
  assert.deepEqual(
    shots.map((s) => s.by.id),
    ["u-meera", "u-meera", "u-arun"],
  );
});

test("an answer with no photograph puts nothing on the wall", () => {
  /* The reader routes those to a tile instead, so nothing anybody wrote is
     dropped. If they leaked in here they would be zero-width frames. */
  assert.equal(shotsOf([entry("e1", MEERA, [])]).length, 0);
});

test("the ratio is the photograph's own, and a square when nobody measured it", () => {
  const shots = shotsOf([
    entry("e1", MEERA, ["wide.webp", "tall.webp", "unknown.webp"], [
      { width: 1200, height: 800 },
      { width: 900, height: 1300 },
      null,
    ]),
  ]);
  assert.equal(shots[0].ratio, 1.5);
  assert.equal(Math.round(shots[1].ratio * 1000) / 1000, 0.692);
  assert.equal(shots[2].ratio, UNMEASURED_RATIO);
});

test("a zero dimension is treated as unmeasured, not as a divide", () => {
  /* A row written before the measuring pass can carry a 0. `0 / 0` is NaN and
     `calc(var(--band) * NaN)` is an invalid declaration, so the frame would
     collapse to nothing with no error anywhere. */
  const shots = shotsOf([
    entry("e1", MEERA, ["broken.webp"], [{ width: 0, height: 0 }]),
  ]);
  assert.equal(shots[0].ratio, UNMEASURED_RATIO);
});

test("one person's photographs are one group, however many answers they span", () => {
  const groups = byContributor(
    shotsOf([
      entry("e1", MEERA, ["a.webp", "b.webp", "c.webp"]),
      entry("e2", ARUN, ["d.webp"]),
    ]),
  );
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].map((s) => s.src), ["a.webp", "b.webp", "c.webp"]);
  assert.deepEqual(groups[1].map((s) => s.src), ["d.webp"]);
});

test("somebody who answered twice, apart, stays in two places", () => {
  /* Not a `groupBy`: pulling their second set up beside their first would
     reorder everybody who wrote between them. Two groups is the honest
     drawing, and each carries their name. */
  const groups = byContributor(
    shotsOf([
      entry("e1", MEERA, ["a.webp"]),
      entry("e2", ARUN, ["b.webp"]),
      entry("e3", MEERA, ["c.webp"]),
    ]),
  );
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map((g) => g[0].by.id), ["u-meera", "u-arun", "u-meera"]);
});

test("the viewer opens on the photograph that was touched", () => {
  /* groupStarts + the offset inside a group must reproduce the flat index,
     or tapping the third photograph opens the first. */
  const shots = shotsOf([
    entry("e1", MEERA, ["a.webp", "b.webp"]),
    entry("e2", ARUN, ["c.webp"]),
    entry("e3", MEERA, ["d.webp", "e.webp", "f.webp"]),
  ]);
  const groups = byContributor(shots);
  const starts = groupStarts(groups);

  const reconstructed = [];
  groups.forEach((group, g) => {
    group.forEach((_shot, k) => reconstructed.push(starts[g] + k));
  });
  assert.deepEqual(reconstructed, [0, 1, 2, 3, 4, 5]);

  groups.forEach((group, g) => {
    group.forEach((shot, k) => {
      assert.equal(shots[starts[g] + k].src, shot.src);
    });
  });
});

test("an empty wall groups to nothing rather than to one empty group", () => {
  assert.deepEqual(byContributor([]), []);
  assert.deepEqual(groupStarts([]), []);
});
