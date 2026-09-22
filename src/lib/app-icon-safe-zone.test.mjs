import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import sharp from "sharp";
import { ROOT } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The Android app icon is the peek: eyes over the edge, no chin.
 *
 *  Chrome on Android never shows all 512px of a maskable icon. It turns
 *  it into an adaptive icon, padding it first so the W3C's safe circle
 *  (4/5 of the icon) lands on Android's (66dp of the 108dp layer):
 *  ((4/5) / (66/108) - 1) / 2 of the icon on every side, 79px here, a
 *  670px layer (WebappsIconUtils.java). Android then draws the middle
 *  2/3 of that layer, 446.7px, and the launcher cuts its own shape --
 *  Samsung's squircle, a Pixel's circle -- out of that. So what reaches
 *  a home screen is x/y 32.7 to 479.3 of this file, and at worst a
 *  circle of radius 223.3 inside it.
 *
 *  This icon has broken twice, once each way, and this file guards
 *  both. The eyes once sat below the cut, so a Samsung showed a crest
 *  and a bare forehead (owner, 2026-08-28: "the eyes didn't show").
 *  The repair believed Android shows only the middle 2/3 of the FILE
 *  -- the 72dp of a native adaptive icon, without Chrome's padding --
 *  and pulled the whole head inside that, which is well inside what
 *  Android really shows: the home screen got the entire bird floating
 *  in the tile, chin, beak seam and all (owner, 2026-09-22: "It shows a
 *  whole orange circle instead of the peeking thing"). This test had
 *  the same 2/3 in it and passed that icon.
 *
 *  Nothing looking at the file can catch either, because both icons
 *  look fine as files; what differs is the crop. So the checks are the
 *  crop itself, done with Chromium's own arithmetic.
 *
 *  Run: node --test src/lib/app-icon-safe-zone.test.mjs
 * ------------------------------------------------------------------ */

const ICON = join(ROOT, "public/images/icons/icon-maskable-512.png");

const SIZE = 512;
/** Chrome's padding per side (WebappsIconUtils: MASKABLE_ICON_PADDING_RATIO). */
const PAD = Math.round(((4 / 5 / (66 / 108) - 1) / 2) * SIZE); // 79
/** What Android draws of the padded layer: its middle 72dp of 108dp. */
const VIEW = ((SIZE + 2 * PAD) * 2) / 3; // 446.67
const EDGE = (SIZE - VIEW) / 2; // 32.67
/** The tightest shape a launcher cuts: a full circle inside that view. */
const CIRCLE = VIEW / 2; // 223.33
const CENTRE = SIZE / 2;

/** The bird's eye ink, straight out of public/images/brand/app-icon.svg. */
const EYE_INK = [0x2b, 0x27, 0x22];
/** Below the crest's dark tips, so dark ink here is the eyes: the crest's
 *  lowest ink is at y 303 as generated, and the eyes start at 432. */
const EYES_FROM = 320;
/** Above this is crest only; the head's top is at y 300.6. */
const CREST_ABOVE = 300;

const distance = (x, y) => Math.hypot(x + 0.5 - CENTRE, y + 0.5 - CENTRE);

async function pixels() {
  const { data, info } = await sharp(ICON).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, SIZE, "the maskable icon is not 512px wide");
  assert.equal(info.height, SIZE, "the maskable icon is not 512px tall");
  const at = (x, y) => {
    const i = (y * SIZE + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  return at;
}

/** The canopy tile the art sits on; anything else is the bird. */
const isTile = ([r, g, b]) =>
  Math.abs(r - 0x23) < 14 && Math.abs(g - 0x5c) < 14 && Math.abs(b - 0x49) < 14;
const isEyeInk = (p) => EYE_INK.every((c, k) => Math.abs(p[k] - c) < 12);

test("the eyes show over the edge, even through a circular mask", async () => {
  const at = await pixels();
  let seen = 0;
  for (let y = EYES_FROM; y < SIZE - EDGE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (isEyeInk(at(x, y)) && distance(x, y) <= CIRCLE) seen++;
    }
  }
  /* Most of each eye is MEANT to be below the cut -- that is the peek. What
     must never happen again is the first failure, where none of it was above:
     that icon left ~0 eye pixels inside this circle, and this one leaves
     3,764. */
  assert.ok(
    seen > 3000,
    `only ${seen} pixels of the eyes fall inside Android's circular mask; the hoopoe's face ` +
      "is being cropped away. Re-check the maskable transform in scripts/dev/generate-icons.mjs."
  );
});

test("the head runs out past the bottom of what Android shows, so it peeks", async () => {
  const at = await pixels();
  /* The last row Android draws, across the middle of the head. The whole-bird
     icon had its chin at y=460 and tile under it, so all 241 of these were
     tile; a peek has none. */
  const lastRow = Math.floor(SIZE - EDGE) - 1;
  let tile = 0;
  for (let x = CENTRE - 120; x <= CENTRE + 120; x++) if (isTile(at(x, lastRow))) tile++;
  assert.equal(
    tile,
    0,
    `${tile} of the 241 pixels across the bottom of Android's view are tile, so the head ends ` +
      "inside the icon and floats there instead of peeking over the mask's edge."
  );
});

test("the crest fits inside the circle and below the top of the view", async () => {
  const at = await pixels();
  let top = SIZE;
  let reach = 0;
  for (let y = 0; y < CREST_ABOVE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (isTile(at(x, y))) continue;
      if (y < top) top = y;
      reach = Math.max(reach, distance(x, y));
    }
  }
  assert.ok(top >= EDGE, `the crest starts at y=${top}, above Android's view at ${EDGE.toFixed(1)}`);
  assert.ok(
    reach <= CIRCLE,
    `a crest tip sits ${reach.toFixed(1)}px from the centre, past a circular mask's ` +
      `${CIRCLE.toFixed(1)}px, so a Pixel launcher would clip the fan.`
  );
});
