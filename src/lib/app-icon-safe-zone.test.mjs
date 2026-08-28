import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import sharp from "sharp";
import { ROOT } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The hoopoe keeps its eyes on Android.
 *
 *  An adaptive launcher never draws all 512px of a maskable icon. The
 *  Android icon is 108dp of artwork of which only the middle 72dp is
 *  shown -- 66.67%, so everything outside x/y 85.3..426.7 here is gone
 *  before any mask shape applies, and a circular mask then keeps only
 *  what is within 170.67px of the centre.
 *
 *  generate-icons.mjs used to scale the art 0.8 about the BOTTOM CENTRE,
 *  on the reasoning that the bird peeks over the bottom edge of the tile
 *  and must stay pinned to it. That is right for the tile and exactly
 *  wrong for the mask: it held the face against the one edge a launcher
 *  crops hardest. The shipped icon put the eyes at y~500-522, so a
 *  Samsung install showed a crest and a bare orange forehead and nothing
 *  else (owner, 2026-08-28, from his home screen: "the eyes didn't show
 *  ... it's basically like the hoopoe has just been moved down").
 *
 *  Nothing caught it, and nothing could have: the file was regenerated,
 *  looked correct in every viewer, and was correct everywhere except
 *  under the one crop that never happens on this machine. iOS and macOS
 *  mask to a squircle that is essentially the whole square, which is why
 *  the same artwork was right on the owner's phone and in his dock the
 *  whole time. So the guard has to be the crop itself, not the picture.
 *
 *  Run: node --test src/lib/app-icon-safe-zone.test.mjs
 * ------------------------------------------------------------------ */

const ICON = join(ROOT, "public/images/icons/icon-maskable-512.png");

const SIZE = 512;
/** The middle 66.67%: everything outside this is discarded before masking. */
const VISIBLE = (SIZE * 2) / 3;
const EDGE = (SIZE - VISIBLE) / 2; // 85.33
/** The worst case a launcher can apply -- a full circle inside that band. */
const SAFE_RADIUS = VISIBLE / 2; // 170.67
const CENTRE = SIZE / 2;

/** The bird's eye ink, straight out of public/images/brand/app-icon.svg. */
const EYE_INK = [0x2b, 0x27, 0x22];
/** Below this the crest fan has ended, so dark pixels are eyes and beak.
 *  The eyes land at y 328..403 as generated; the fan stops well above. */
const BELOW_THE_CREST = 300;

const distance = (x, y) => Math.hypot(x - CENTRE, y - CENTRE);

async function pixels() {
  const { data, info } = await sharp(ICON).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, SIZE, "the maskable icon is not 512px wide");
  assert.equal(info.height, SIZE, "the maskable icon is not 512px tall");
  return { data, ch: info.channels };
}

/** The canopy tile the art sits on; anything else is the bird. */
const isTile = (r, g, b) =>
  Math.abs(r - 0x23) < 14 && Math.abs(g - 0x5c) < 14 && Math.abs(b - 0x49) < 14;

test("the eyes survive even a circular adaptive mask", async () => {
  const { data, ch } = await pixels();
  let eyeInk = 0;
  let outside = 0;
  for (let y = BELOW_THE_CREST; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * ch;
      if (data[i + 3] < 250) continue;
      const near = EYE_INK.every((c, k) => Math.abs(data[i + k] - c) < 12);
      if (!near) continue;
      eyeInk++;
      if (distance(x, y) > SAFE_RADIUS) outside++;
    }
  }

  /* Not "some ink exists somewhere": the broken icon had 3,909 eye pixels
     too, and 82% of them fell outside this circle. The count guards against
     the art vanishing entirely, the ratio against it sliding out of frame. */
  assert.ok(
    eyeInk > 3000,
    `expected the eyes below the crest to be several thousand pixels, found ${eyeInk}. ` +
      "Either the bird moved or EYE_INK no longer matches app-icon.svg."
  );
  assert.equal(
    outside,
    0,
    `${outside} of ${eyeInk} eye pixels fall outside the ${SAFE_RADIUS.toFixed(1)}px safe ` +
      "radius, so a circular launcher mask would cut the hoopoe's face. Re-check the " +
      "maskable transform in scripts/dev/generate-icons.mjs."
  );
});

test("the bird still peeks, rather than floating in the tile", async () => {
  const { data, ch } = await pixels();
  let top = SIZE;
  let bottom = -1;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * ch;
      if (data[i + 3] < 8 || isTile(data[i], data[i + 1], data[i + 2])) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  assert.ok(
    top >= EDGE,
    `the artwork starts at y=${top}, above the visible band's ${EDGE.toFixed(1)}px edge, ` +
      "so the crest would be clipped."
  );
  /* The chin is MEANT to run past the crop: that is what makes the mask do
     the cutting and keeps the peek without a band of empty tile under a
     floating face. A bird entirely inside the band is the other failure. */
  assert.ok(
    bottom > SIZE - EDGE,
    `the artwork ends at y=${bottom}, inside the visible band, so the head hangs in the ` +
      "middle of the tile instead of peeking over the mask's bottom edge."
  );
});
