import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { read, decomment } from "./test-kit.mjs";
import { describeImage, focalFraction, isBlankImage, UNKNOWN_FOCAL } from "./image.ts";

/* ------------------------------------------------------------------ *
 *  What we know about a stored image: its shape, where the interesting
 *  part is, and a smear to hold its place.
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

test("a black-and-white photograph is measured like any other", async () => {
  /* THREE CHROMA TESTS AND A BLACK-AND-WHITE ONE USED TO LIVE HERE. The
     measurement they covered -- meanChroma / isGreyscale, run on every feed
     upload -- was removed on 2026-09-07 (refactor audit 2 / D9): it fed
     Image.greyscale, and the Collection filter it existed for reads Photo, a
     different table, so nothing could ever have used it.

     What survives is the thing that would actually break: a photograph with no
     colour must still be measurable at all. sharp's attention crop behaves
     differently on a flat monochrome frame, and a null here would take the
     whole layout with it. */
  const colour = await photoWithSubjectAt(900, 600, 300, 300);
  const bw = await sharp(colour).greyscale().webp().toBuffer();
  const facts = await describeImage(bw);
  assert.ok(facts, "a black-and-white photograph came back unmeasured");
  assert.equal(facts.width, 900);
  assert.equal(facts.height, 600);
  assert.ok(Number.isFinite(facts.focalX) && Number.isFinite(facts.focalY));
  assert.ok(facts.blurDataUrl.startsWith("data:image/webp;base64,"));
  assert.ok(!("greyscale" in facts), "greyscale is being measured again");
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

test("a crop that came out blank is caught before it replaces the bird", async () => {
  // The 2026-10-01 case exactly: the framer's canvas handed back 512x512 of
  // nothing, stored as a 582-byte WebP, and the member lost his bird to it.
  const transparent = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .webp({ quality: 82 })
    .toBuffer();
  assert.equal(await isBlankImage(transparent), true);

  // The other way a canvas fails: opaque, one colour edge to edge.
  const black = await sharp({
    create: { width: 512, height: 512, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .webp({ quality: 82 })
    .toBuffer();
  assert.equal(await isBlankImage(black), true);

  assert.equal(await isBlankImage(await photoWithSubjectAt(512, 512, 256, 200)), false);

  // A cut-out on a transparent ground is mostly empty but not blank.
  const patch = await sharp({
    create: { width: 80, height: 80, channels: 4, background: { r: 200, g: 120, b: 60, alpha: 1 } },
  })
    .png()
    .toBuffer();
  const cutOut = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: patch, left: 216, top: 216 }])
    .webp({ quality: 82 })
    .toBuffer();
  assert.equal(await isBlankImage(cutOut), false);

  // And the one upload path that needs it asks before storing anything.
  const action = decomment(read("src/components/settings/actions.ts"));
  const body = action.slice(action.indexOf("export async function updateAvatar"));
  assert.ok(
    body.indexOf("isBlankImage(") > -1 && body.indexOf("isBlankImage(") < body.indexOf("putImage("),
    "updateAvatar must refuse a blank crop before putImage stores it"
  );
});
