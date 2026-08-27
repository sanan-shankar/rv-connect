import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { read, decomment } from "./test-kit.mjs";
import {
  describeImage,
  focalFraction,
  isGreyscale,
  meanChroma,
  UNKNOWN_FOCAL,
} from "./image.ts";

/* ------------------------------------------------------------------ *
 *  What we know about a stored image: its shape, where the interesting
 *  part is, whether it has any colour, and a smear to hold its place.
 *
 *  The whole Collection rework sits on these numbers being recorded
 *  (docs/planning/collection-rework/spec.md §2): without them nothing can
 *  reserve space for a photo, solve a justified row, or aim a crop.
 * ------------------------------------------------------------------ */

/** A flat green field with one bright patch in it, so "where is the
 *  interesting part" has a right answer to compare against. */
async function photoWithSubjectAt(width, height, x, y, patch = 60) {
  const bright = await sharp({
    create: { width: patch, height: patch, channels: 3, background: { r: 255, g: 240, b: 200 } },
  })
    .png()
    .toBuffer();
  return sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 40, b: 25 } },
  })
    .composite([{ input: bright, left: Math.round(x - patch / 2), top: Math.round(y - patch / 2) }])
    .webp()
    .toBuffer();
}

test("chroma is zero when the three channels agree, whatever the brightness", () => {
  // Black, mid grey, white: no colour anywhere.
  const grey = Uint8Array.from([0, 0, 0, 128, 128, 128, 255, 255, 255]);
  assert.equal(meanChroma(grey, 3), 0);
  assert.equal(isGreyscale(grey, 3), true);
});

test("chroma rises with how far apart the channels are", () => {
  const red = Uint8Array.from([255, 0, 0]);
  assert.equal(meanChroma(red, 3), 255);
  assert.equal(isGreyscale(red, 3), false);
  // A faint colour cast -- a scan of an old print, say -- is still not colour.
  const cast = Uint8Array.from([130, 128, 126, 120, 118, 116]);
  assert.equal(meanChroma(cast, 3), 4);
  assert.equal(isGreyscale(cast, 3), true);
});

test("a single-channel image has no colour to measure", () => {
  assert.equal(meanChroma(Uint8Array.from([10, 200, 30]), 1), 0);
});

test("an unreadable focal point lands in the centre, never at NaN", () => {
  // The trap: libvips reports no focal point at all when the resize it was
  // given needed no crop, so `attentionX` arrives undefined. Dividing that
  // gives NaN, and NaN in a stored column poisons every crop computed from it.
  assert.equal(focalFraction(undefined, 100), UNKNOWN_FOCAL);
  assert.equal(focalFraction(NaN, 100), UNKNOWN_FOCAL);
  assert.equal(focalFraction(50, 0), UNKNOWN_FOCAL);
});

test("a focal point is a fraction of the frame, and stays inside it", () => {
  assert.equal(focalFraction(25, 100), 0.25);
  assert.equal(focalFraction(-5, 100), 0);
  assert.equal(focalFraction(140, 100), 1);
});

test("a stored image is measured at the size it will be served", async () => {
  const facts = await describeImage(await photoWithSubjectAt(1200, 800, 900, 200));
  assert.equal(facts.width, 1200);
  assert.equal(facts.height, 800);
  assert.equal(facts.greyscale, false);
  assert.ok(facts.blurDataUrl.startsWith("data:image/webp;base64,"));
  // Small enough to send with every card: ~160 bytes, not a second image.
  assert.ok(facts.blurDataUrl.length < 600, `smear was ${facts.blurDataUrl.length} chars`);
});

test("the crop is aimed at the subject, whatever shape the photograph is", async () => {
  const near = (got, want, what) =>
    assert.ok(Math.abs(got - want) < 0.06, `${what}: ${got.toFixed(2)} should be near ${want}`);

  const wide = await describeImage(await photoWithSubjectAt(1200, 800, 900, 200));
  near(wide.focalX, 0.75, "wide x");
  near(wide.focalY, 0.25, "wide y");

  const tall = await describeImage(await photoWithSubjectAt(800, 1200, 400, 300));
  near(tall.focalX, 0.5, "tall x");
  near(tall.focalY, 0.25, "tall y");
});

test("a square photograph is measured too, rather than coming back as NaN", async () => {
  // Square is the case that catches this: ask libvips for a square crop of a
  // square image and no crop happens, so no focal point is reported. The probe
  // is deliberately shaped so a crop always happens.
  const facts = await describeImage(await photoWithSubjectAt(900, 900, 200, 700));
  assert.ok(Number.isFinite(facts.focalX) && Number.isFinite(facts.focalY));
  assert.ok(Math.abs(facts.focalX - 0.22) < 0.06, `square x: ${facts.focalX}`);
  assert.ok(Math.abs(facts.focalY - 0.78) < 0.06, `square y: ${facts.focalY}`);
});

test("a photograph with no colour in it is recognised as one", async () => {
  const colour = await photoWithSubjectAt(900, 600, 300, 300);
  const bw = await sharp(colour).greyscale().webp().toBuffer();
  assert.equal((await describeImage(bw)).greyscale, true);
  assert.equal((await describeImage(colour)).greyscale, false);
});

test("bytes that are not an image are refused rather than thrown", async () => {
  assert.equal(await describeImage(Buffer.from("this is not a photograph")), null);
});

/* ---- The pairings, which a third upload path must not forget ------ */

test("every path that stores a display image also measures it", () => {
  // Two routes make the display WebP that feed, letter and Catch-up photos are
  // served from. A third one that forgot to record its dimensions would put
  // images back into the app that nothing can lay out -- silently, because a
  // missing row is a supported state everywhere else.
  for (const path of ["src/app/api/upload/route.ts", "src/app/api/upload/finalize/route.ts"]) {
    const src = decomment(read(path));
    assert.ok(/toDisplayWebp\(/.test(src), `${path} no longer stores a display image`);
    assert.ok(/describeImage\(/.test(src), `${path} stores an image it never measures`);
    assert.ok(/recordImage\(/.test(src), `${path} measures an image it never records`);
  }
});

test("deleting the bytes forgets what we knew about them", () => {
  // `blurDataUrl` is a 16px picture of the photograph. It has to go when the
  // photograph does, or a member's deleted post leaves a smear of itself in a
  // table nothing points at. Both places bytes are deleted, per the C-069 rule.
  assert.ok(/forgetImages\(/.test(decomment(read("src/lib/image-purge.ts"))));
  assert.ok(/forgetImages\(/.test(decomment(read("src/lib/account-purge.ts"))));
});
