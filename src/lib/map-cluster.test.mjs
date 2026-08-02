/**
 * Invariants of the directory map's clustering (run: `node --test src/lib/map-cluster.test.mjs`).
 *
 * The two product rules, asserted directly on the math rather than through the
 * DOM (scripts/qa/map-cluster-verify.mjs does the DOM half against the real
 * map):
 *   1. at `maxUsefulZoom` every group is a single city - no blue pin survives;
 *   2. at ANY zoom, no two rendered pins' hit discs overlap.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGroups,
  hitRadiusU,
  maxUsefulZoom,
  separatingZoom,
  sqrtRadius,
} from "./map-cluster.ts";

// Real projected positions (geoNaturalEarth1 fitted to the 900x460 viewBox).
const NCR = {
  delhi: { x: 626.027, y: 151.255, count: 3 },
  gurgaon: { x: 625.692, y: 151.669, count: 1 },
  noida: { x: 626.473, y: 151.448, count: 1 },
  faridabad: { x: 626.379, y: 151.808, count: 1 },
  ghaziabad: { x: 626.543, y: 151.089, count: 1 },
  bangalore: { x: 632.592, y: 194.387, count: 8 },
  chennai: { x: 638.873, y: 194.084, count: 4 },
  mysore: { x: 630.5, y: 196.229, count: 1 },
  london: { x: 428.9, y: 92.4, count: 2 },
};
const PINS = Object.values(NCR);

const DESKTOP = { maxCount: 8, pinBoost: 1, pxPerUnit: 1.14, coarsePointer: false };
const PHONE = { maxCount: 8, pinBoost: 2.58, pxPerUnit: 0.387, coarsePointer: true };

/** No two rendered pins may have overlapping hit discs at zoom k. */
function overlapsAt(pins, k, sizing, spread = false) {
  const groups = buildGroups(pins, k, sizing, spread);
  const bad = [];
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const a = groups[i];
      const b = groups[j];
      const gap = Math.hypot(a.x - b.x, a.y - b.y) * k;
      if (gap < a.hitU + b.hitU) bad.push(`${a.key} vs ${b.key}: ${gap.toFixed(2)} < ${(a.hitU + b.hitU).toFixed(2)}`);
    }
  }
  return { groups, bad };
}

for (const [name, sizing] of [
  ["desktop", DESKTOP],
  ["phone (44px taps)", PHONE],
]) {
  test(`${name}: every cluster resolves at max zoom`, () => {
    const maxK = maxUsefulZoom(PINS, sizing);
    const { groups, bad } = overlapsAt(PINS, maxK, sizing, true);
    const clusters = groups.filter((g) => g.members.length > 1);
    assert.equal(clusters.length, 0, `clusters left at k=${maxK}: ${clusters.map((c) => c.key)}`);
    assert.equal(groups.length, PINS.length, "every city has its own pin at max zoom");
    assert.deepEqual(bad, [], "no overlapping hit discs at max zoom");
  });

  test(`${name}: no overlapping hit discs at any zoom`, () => {
    const maxK = maxUsefulZoom(PINS, sizing);
    for (let k = 1; k <= maxK; k *= 1.25) {
      const { bad } = overlapsAt(PINS, k, sizing);
      assert.deepEqual(bad, [], `overlap at k=${k.toFixed(2)}`);
    }
  });

  test(`${name}: New Delhi and Gurgaon are one pin at world zoom`, () => {
    const { groups } = overlapsAt(PINS, 1, sizing);
    const withDelhi = groups.find((g) => g.members.includes(0));
    assert.ok(withDelhi.members.length > 1, "NCR is a cluster when zoomed out");
  });
}

test("clicking a cluster gets a zoom that actually splits it", () => {
  const { groups } = overlapsAt(PINS, 1, DESKTOP);
  const cluster = groups.find((g) => g.members.length > 1);
  const target = separatingZoom(PINS, cluster.members, DESKTOP);
  assert.ok(target > 1, "target zoom is deeper than the current one");
  const after = buildGroups(PINS, target, DESKTOP).filter((g) =>
    g.members.some((m) => cluster.members.includes(m))
  );
  assert.ok(
    after.every((g) => g.members.length === 1),
    `cluster ${cluster.key} still merged at its own separating zoom`
  );
});

test("coincident cities fall back to a deterministic ring, not a permanent cluster", () => {
  // Two pins the 0.1-degree pin grid can produce at its seam: closer than any
  // zoom below the ceiling can separate.
  const twins = [
    { x: 400, y: 200, count: 2 },
    { x: 400.00001, y: 200, count: 1 },
    { x: 500, y: 260, count: 1 },
  ];
  const maxK = maxUsefulZoom(twins, DESKTOP);
  const clustered = buildGroups(twins, maxK, DESKTOP);
  assert.ok(
    clustered.some((g) => g.members.length > 1),
    "the twins really are unsplittable by zoom (otherwise this test proves nothing)"
  );
  const spread = buildGroups(twins, maxK, DESKTOP, true);
  assert.equal(spread.length, 3, "every twin gets its own pin");
  assert.ok(
    spread.every((g) => g.members.length === 1),
    "no cluster survives the ring fallback"
  );
  for (let i = 0; i < spread.length; i++) {
    for (let j = i + 1; j < spread.length; j++) {
      const gap = Math.hypot(spread[i].x - spread[j].x, spread[i].y - spread[j].y) * maxK;
      assert.ok(gap >= spread[i].hitU + spread[j].hitU, `ring pins ${i}/${j} still overlap`);
    }
  }
  // Deterministic: same input, byte-identical layout.
  assert.deepEqual(buildGroups(twins, maxK, DESKTOP, true), spread);
});

test("a 44px tap disc is honoured on coarse pointers", () => {
  // The tightest possible pin: one member on the map with the biggest city.
  const rU = hitRadiusU(1, false, { ...PHONE, maxCount: 400 });
  // rU is in screen viewBox units; * pxPerUnit converts to CSS px.
  assert.ok(rU * PHONE.pxPerUnit * 2 >= 44 - 1e-9, `tap disc is ${(rU * PHONE.pxPerUnit * 2).toFixed(1)}px`);
  // Fine pointers are untouched: the hit disc is exactly the drawn halo.
  const desktop = hitRadiusU(1, false, DESKTOP);
  assert.equal(desktop, sqrtRadius(1, DESKTOP.maxCount) + 3);
});

test("max zoom is deeper on a phone, where 44px targets need more room", () => {
  assert.ok(maxUsefulZoom(PINS, PHONE) > maxUsefulZoom(PINS, DESKTOP));
});
