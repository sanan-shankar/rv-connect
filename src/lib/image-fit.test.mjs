import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { read, decomment } from "./test-kit.mjs";
import {
  MAX_STORED_PIXELS,
  sharpImage,
  storedPixelFit,
  storedResizeBox,
  takeImageSlot,
  WEBP_MAX_DIM,
} from "./image.ts";

test("an ordinary photo is left completely alone", () => {
  assert.equal(storedPixelFit(4000, 3000), null, "a 12MP phone photo");
  assert.equal(storedPixelFit(7000, 5000), null, "a 35MP heritage scan");
  assert.equal(storedPixelFit(1, 1), null);
});

test("an image over the budget comes down to it, and only just", () => {
  const fit = storedPixelFit(20000, 10000); // 200MP
  assert.ok(fit, "a 200MP scan should be resized");
  assert.ok(fit.width * fit.height <= MAX_STORED_PIXELS, "still over budget");
  // "Only just": within a percent of the ceiling, so nothing is thrown away
  // that did not have to be.
  assert.ok(fit.width * fit.height > MAX_STORED_PIXELS * 0.99, "shrank further than needed");
});

test("the shape is kept, so nothing is stretched", () => {
  const fit = storedPixelFit(20000, 10000);
  assert.ok(Math.abs(fit.width / fit.height - 2) < 0.01);
});

test("a panorama is judged by area, not by its longest side", () => {
  // 20000x2000 is only 40MP. A longest-side cap would have shrunk this for no
  // reason; a square 7000x7000 is 49MP and genuinely must come down.
  assert.equal(storedPixelFit(20000, 2000), null);
  assert.ok(storedPixelFit(7000, 7000));
});

test("unknown dimensions mean no resize, never a crash", () => {
  assert.equal(storedPixelFit(undefined, 3000), null);
  assert.equal(storedPixelFit(4000, undefined), null);
  assert.equal(storedPixelFit(0, 0), null);
});

/* ------------------------------------------------------------------ *
 *  C-067 / C-070: the box an image is stored in.
 *
 *  Two bounds, both real, and they were not being applied to the same
 *  picture the pipeline was about to produce.
 * ------------------------------------------------------------------ */

test("C-067: the box is measured on the UPRIGHT image, not the stored one", () => {
  // sharp reports the header's dimensions in width/height and the
  // orientation-corrected ones in autoOrient. A 50MP portrait stored
  // landscape-with-a-turn-me-flag was given a landscape box, and `inside`
  // then shrank it to fit the transposed box: 22.7MP instead of 40MP.
  const box = storedResizeBox({
    width: 8160,
    height: 6144,
    autoOrient: { width: 6144, height: 8160 },
  });
  assert.ok(box.height > box.width, "the box came out landscape for a portrait photo");
  assert.deepEqual(box, storedPixelFit(6144, 8160));
});

test("C-067: with no orientation flag the stored dimensions are the upright ones", () => {
  const box = storedResizeBox({ width: 8160, height: 6144 });
  assert.deepEqual(box, storedPixelFit(8160, 6144));
  // ...and an image inside the budget is bounded only by what WebP can hold.
  assert.deepEqual(storedResizeBox({ width: 4000, height: 3000 }), {
    width: WEBP_MAX_DIM,
    height: WEBP_MAX_DIM,
  });
});

test("C-070: over the area budget, WebP's side limit still applies", () => {
  // 25000x2000 is 50MP at 12.5:1 -- a legal stitched panorama. Scaling by
  // area alone gave 22360px, which WebP cannot encode at all, so the member
  // got "could not process the photo".
  const box = storedResizeBox({ width: 25000, height: 2000 });
  assert.ok(box.width <= WEBP_MAX_DIM && box.height <= WEBP_MAX_DIM);
  assert.equal(box.width, WEBP_MAX_DIM);
});

test("C-067/C-070: sharp still behaves the way the box assumes", async () => {
  // The whole fix rests on `.rotate().metadata()` reporting STORED dimensions
  // and autoOrient reporting upright ones. If a sharp upgrade ever changes
  // that, this fails here rather than silently halving people's photographs.
  const sharp = (await import("sharp")).default;
  const jpeg = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#235C49" } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const meta = await sharp(jpeg).rotate().metadata();
  assert.deepEqual([meta.width, meta.height], [40, 20], "metadata() ran the pipeline");
  assert.deepEqual(
    [meta.autoOrient.width, meta.autoOrient.height],
    [20, 40],
    "autoOrient is no longer the upright size"
  );
  // ...and the box, fed that metadata, produces an upright-shaped output.
  const box = storedResizeBox({ width: 8160, height: 6144, autoOrient: { width: 6144, height: 8160 } });
  const out = await sharp(jpeg)
    .rotate()
    .resize(box.width, box.height, { fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  assert.ok(out.info.height > out.info.width, "the stored image came out on its side");
});

/* ------------------------------------------------------------------ *
 *  The decode budget is per instance, not per request (bug audit 3,
 *  L8-08). One 40-megapixel encode measured about 650MB at its peak and
 *  four at once 2.1GB, past a Fluid instance's 2GB, so decodes take
 *  turns: two at a time, the rest wait for a slot.
 * ------------------------------------------------------------------ */

/** True if the promise settles within a few turns of the event loop. */
async function settlesSoon(promise) {
  let done = false;
  promise.then(() => (done = true), () => (done = true));
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
  return done;
}

test("L8-08: two decodes at a time, a third waits for a slot, and a slot is given back once", async () => {
  const a = await takeImageSlot();
  const b = await takeImageSlot();
  const c = takeImageSlot();
  assert.equal(await settlesSoon(c), false, "a third decode started while two held the instance");
  a();
  const releaseC = await c;
  a(); // a second release of the same slot must not free another one
  const d = takeImageSlot();
  assert.equal(await settlesSoon(d), false, "a slot given back twice let a third decode in");
  b();
  const releaseD = await d;
  releaseC();
  releaseD();
});

test("L8-08: a buffered result from sharpImage waits for a slot, and a header read does not", async () => {
  const input = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#235c49" } }).png().toBuffer();
  const a = await takeImageSlot();
  const b = await takeImageSlot();
  try {
    const meta = await sharpImage(input).metadata();
    assert.equal(meta.width, 64, "metadata() should answer while every slot is held: it decodes nothing");
    const encode = sharpImage(input).rotate().resize(32).webp().toBuffer();
    assert.equal(await settlesSoon(encode), false, "an encode ran with every slot held");
    a();
    const out = await encode;
    assert.ok(out.length > 0, "the encode did not finish once a slot was free");
  } finally {
    a();
    b();
  }
});

test("L8-08: the streamed download takes a slot too, and gives it back when the stream closes", () => {
  /* /api/photo/download pipes sharp straight into the response, so it never
     calls toBuffer and the wrapper never sees it; a few presses of Download
     on the largest archive photographs are the concurrent decodes in the
     finding. "close" comes on the last byte and on a download cancelled
     part-way (checked against sharp's stream); "error" covers the rest. */
  const src = decomment(read("src/app/api/photo/download/route.ts"));
  const take = src.search(/await takeImageSlot\(\)/);
  const build = src.search(/sharpImage\(original\)/);
  assert.ok(take !== -1 && take < build, "the download no longer takes a decode slot before it builds the pipeline");
  assert.match(src, /\.once\("close", release\)/, "the download's slot is not given back when its stream closes");
  assert.match(src, /\.once\("error", release\)/, "the download's slot is not given back on an error");
});
