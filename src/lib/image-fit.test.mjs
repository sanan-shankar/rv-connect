import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_STORED_PIXELS, storedPixelFit } from "./image.ts";

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
