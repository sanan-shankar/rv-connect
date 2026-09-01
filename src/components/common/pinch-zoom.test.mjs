import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Pins for the image viewer's zoom (owner, 2026-09-02: "you can't
 *  really pinch zoom on the image viewer").
 *
 *  Every one of these is a mechanism whose absence LOOKS FINE. The
 *  viewer still opens, the photograph still fills the screen, the
 *  swipe still steps -- and the zoom is silently either gone, fighting
 *  the browser's own, or leaking a hairline of backdrop down the edge.
 *  Static-shape assertions in the house style, so `npm run check`
 *  answers rather than a member on a phone.
 * ------------------------------------------------------------------ */

const HOOK = "src/components/common/pinch-zoom.ts";
const VIEWER = "src/components/common/image-viewer.tsx";

test("the gesture surface tells the browser to keep its hands off", () => {
  const src = decomment(read(VIEWER));
  assert.ok(
    /touch-none/.test(src),
    "the viewer's gesture surface lost `touch-none`. Without it a two-finger " +
      "pinch zooms the PAGE as well as the photograph -- two zooms stacked on " +
      "each other, and the overlay drifts off the viewport"
  );
});

test("Motion's one-finger drag never comes back", () => {
  const src = decomment(read(VIEWER));
  assert.ok(
    !/\bdrag=|dragConstraints|dragElastic|onDragEnd/.test(src),
    "the viewer is using Motion's drag again. It knows about exactly one " +
      "pointer, so a second finger landing on the photograph keeps dragging " +
      "instead of starting a pinch -- which is why the swipe moved into " +
      "pinch-zoom.ts, where one state machine owns every pointer"
  );
});

test("the swipe kept the numbers it was tuned with", () => {
  const src = decomment(read(HOOK));
  for (const [name, value] of [
    ["SWIPE_FOLLOW", "0.14"],
    ["SWIPE_DISTANCE", "70"],
    ["SWIPE_VELOCITY", "420"],
  ]) {
    assert.ok(
      new RegExp(`${name} = ${value.replace(".", "\\.")}\\b`).test(src),
      `${name} is no longer ${value}. Moving the swipe off Motion's drag was a ` +
        "gesture rewrite, not a re-tuning: these three are the feel the owner " +
        "settled, and they carry over verbatim"
    );
  }
});

test("a photograph always arrives fitted to the screen", () => {
  const src = decomment(read(VIEWER));
  assert.ok(
    /resetZoomRef\.current\(\)/.test(src) && /zoom\.reset\(\)/.test(src),
    "stepping or reopening no longer resets the zoom. Carrying one " +
      "photograph's zoom onto the next lands you in the middle of a picture " +
      "you have not seen yet"
  );
});

test("the pan clamp is arithmetic, not a rounded offsetWidth", () => {
  const src = decomment(read(HOOK));
  assert.ok(
    /naturalWidth/.test(src) && /naturalHeight/.test(src),
    "the fitted size stopped being computed from the file's own dimensions"
  );
  assert.ok(
    !/offsetWidth \* s|offsetWidth \* scale/.test(src),
    "the pan limits are being measured from offsetWidth again. It rounds to a " +
      "whole pixel, and half a pixel becomes four at 8x -- a hairline of " +
      "backdrop down the edge of a photograph panned against the side of the " +
      "screen (measured at 0.9px before this was arithmetic)"
  );
});

test("the wheel listener is native and non-passive", () => {
  const src = decomment(read(HOOK));
  assert.ok(
    /addEventListener\("wheel", onWheel, \{ passive: false \}\)/.test(src),
    "the wheel handler went passive (or back to React's onWheel, which is " +
      "passive). A passive handler cannot preventDefault, so a trackpad pinch " +
      "zooms the page behind the overlay at the same time"
  );
});

test("nothing is zoomed past the file's own pixels without a floor to justify it", () => {
  const src = decomment(read(HOOK));
  assert.ok(
    /1 \/ fit/.test(src) && /MIN_CEILING/.test(src) && /MAX_CEILING/.test(src),
    "the zoom ceiling stopped being the file's own 1:1 point between a floor " +
      "and a cap. The owner has objected twice to seeing photographs upscaled " +
      "into grain; an unbounded zoom is that complaint with a gesture attached"
  );
});
