/**
 * Every mark sits dead centre, left to right.
 *
 * The owner spotted the hoopoe sitting slightly left in the app icon. It was:
 * the window onto it was `22 -19 78 78`, whose centre is x=61, while every
 * part of the bird is symmetric about x=60. One unit, 1.28% of the icon.
 *
 * Measuring the rest found the same habit twice more, from the same cause --
 * a window's origin typed by eye instead of derived:
 *
 *   app icon   the bird 1.28% left of centre
 *   favicon    the ridge 1.9px (0.38%) right of centre in the 512 box
 *   sidebar    the ridge 5 units (0.44%) left of its viewBox's centre
 *
 * Each was invisible alone. Together they meant no two marks agreed on where
 * the middle was. Every origin is now derived from the art's own centre, and
 * this pins it, because "looks centred" is exactly the check a person stops
 * doing after the third time it passes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PEEK_AXIS, PEEK_VIEW, crestPrims, facePrims } from "./hoopoe-geometry.ts";

/** The ridge's drawn extent, verified by rendering the shipped favicon at
 *  4096px and inverting its transform: -98.03 .. 1008.22, the .0x being
 *  antialiasing past the path's own endpoints of -98 and 1008. */
const RIDGE_LEFT = -98;
const RIDGE_RIGHT = 1008;
const RIDGE_CENTRE = (RIDGE_LEFT + RIDGE_RIGHT) / 2;

test("the hoopoe's own geometry is symmetric about its axis", () => {
  /* Not just the window: the thing the window is centred ON. If a future crest
     stops being symmetric, centring the window on 60 would be centring on
     nothing, and this would say so before the icon shipped. */
  const angles = crestPrims({ n: 11, spread: 68, len: 1.18, taper: 0.08 })
    .filter((p) => p.k === "g")
    .map((p) => {
      const m = p.transform.match(/^rotate\((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\)$/);
      assert.ok(m, `a crest feather is not a rotate(): ${p.transform}`);
      assert.equal(Number(m[2]), PEEK_AXIS, "a feather pivots off the axis");
      return Number(m[1]);
    });
  assert.ok(angles.length > 0, "the crest drew no feathers");
  /* Compared with a tolerance, not deepEqual: the angles come out of
     (i / (n - 1)) * 2 - 1 and mirror to about 1e-14, which is exact enough for
     a fan and not exact enough for ===. 1e-9 degrees is far below anything
     that could move a pixel at any size we ship. */
  const up = (xs) => xs.slice().sort((a, b) => a - b);
  const got = up(angles);
  const mirrored = up(angles.map((a) => -a));
  assert.equal(got.length, mirrored.length);
  got.forEach((a, i) => {
    assert.ok(Math.abs(a - mirrored[i]) < 1e-9,
      `the crest's feather angles are not a mirrored set: ${a} vs ${mirrored[i]}`);
  });

  const head = facePrims({ eyeS: 1.12, billL: 0.9 }).find((p) => p.k === "ellipse");
  assert.equal(head.cx, PEEK_AXIS, "the head is not on the axis");
});

test("the app icon's window is centred on that axis", () => {
  assert.equal(PEEK_VIEW.x + PEEK_VIEW.size / 2, PEEK_AXIS,
    "the peeking window is off centre; the bird will sit to one side");
});

test("the favicon centres the ridge in its 512 box", () => {
  const svg = readFileSync(new URL("../app/icon.svg", import.meta.url), "utf8");
  const m = svg.match(/translate\((-?[\d.]+) (-?[\d.]+)\) scale\(([\d.]+)\)/);
  assert.ok(m, "src/app/icon.svg no longer has a translate/scale to check");
  const centre = Number(m[1]) + RIDGE_CENTRE * Number(m[3]);
  /* Half a pixel of 512. Tighter than any eye and looser than float noise. */
  assert.ok(Math.abs(centre - 256) < 0.5,
    `the favicon's ridge sits at ${centre.toFixed(2)}, not 256`);
});

test("the sidebar mark centres the ridge in its viewBox", () => {
  const src = readFileSync(new URL("../components/layout/peaks-mark.tsx", import.meta.url), "utf8");
  assert.match(src, /VIEWBOX_X = PEAK_CENTRE - VIEWBOX_WIDTH \/ 2/,
    "peaks-mark's viewBox x is no longer derived from the ridge's centre");
  assert.doesNotMatch(src, /viewBox="-?[\d.]+ /,
    "peaks-mark has gone back to a hand-typed viewBox");
});
