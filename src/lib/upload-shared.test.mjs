import test from "node:test";
import assert from "node:assert/strict";
import {
  isImageFile,
  isUploadedImageUrl,
  publicBaseFor,
  describeProcessingError,
  MAX_INPUT_PIXELS,
  storedImageFormat,
  stillPictureNotice,
} from "./upload-shared.ts";

/* Serving moved from pub-*.r2.dev to images.rishivalley.space on 2026-08-21.
   Both have to be recognised: a URL written before the move that the code
   refuses to claim is a photograph whose bytes survive its own deletion, and
   nothing anywhere would report it. */

const NEW = "https://images.rishivalley.space";
const OLD = "https://pub-a656209a5438484f9694738260255a5e.r2.dev";

test("the configured host and the one it replaced are both ours", () => {
  process.env.R2_PUBLIC_BASE_URL = NEW;
  assert.equal(publicBaseFor(`${NEW}/uploads/abc/x.webp`), NEW);
  assert.equal(publicBaseFor(`${OLD}/uploads/abc/x.webp`), OLD);
  assert.equal(publicBaseFor(`${NEW}/collection/2026/07/x.webp`), NEW);
});

test("a trailing slash on the configured base does not break matching", () => {
  process.env.R2_PUBLIC_BASE_URL = `${NEW}/`;
  assert.equal(publicBaseFor(`${NEW}/uploads/abc/x.webp`), NEW);
});

test("somebody else's bucket is not ours, however similar", () => {
  process.env.R2_PUBLIC_BASE_URL = NEW;
  // The legacy entry is one exact host, never a pub-*.r2.dev wildcard: this
  // function is what vouches for a URL before it is embedded (audit M10).
  assert.equal(publicBaseFor("https://pub-0000000000000000000000000000dead.r2.dev/uploads/a/x.webp"), null);
  assert.equal(publicBaseFor("https://images.rishivalley.space.evil.test/uploads/a/x.webp"), null);
  assert.equal(publicBaseFor("https://evil.test/uploads/a/x.webp"), null);
});

test("only the uploads root is claimable as a member upload", () => {
  process.env.R2_PUBLIC_BASE_URL = NEW;
  assert.equal(isUploadedImageUrl(`${NEW}/uploads/abc/x.webp`), true);
  assert.equal(isUploadedImageUrl(`${OLD}/uploads/abc/x.webp`), true);
  // A Collection object is ours, but it is not something a member "uploaded"
  // into a post, so the embed check still says no.
  assert.equal(isUploadedImageUrl(`${NEW}/collection/2026/07/x.webp`), false);
  assert.equal(isUploadedImageUrl("https://evil.test/uploads/a/x.webp"), false);
  // Local dev paths stay claimable in both modes.
  assert.equal(isUploadedImageUrl("/uploads/abc/x.webp"), true);
});

test("a picked file with no MIME type is still an image if the name says so", () => {
  // Some mobile browsers hand over a blank type (audit Low 41).
  assert.equal(isImageFile({ type: "", name: "IMG_0042.JPG" }), true);
  assert.equal(isImageFile({ type: "image/webp", name: "x.webp" }), true);
  assert.equal(isImageFile({ type: "", name: "notes.pdf" }), false);
  assert.equal(isImageFile({ type: "application/pdf", name: "x.jpg" }), false);
});

/* ------------------------------------------------------------------ *
 *  C-072: too many pixels is not the same refusal as a bad file.
 * ------------------------------------------------------------------ */

test("a 108MP photo is refused in words that name the way out", async () => {
  // The message is taken from sharp itself rather than typed from memory, so
  // an upgrade that rewords it fails here instead of quietly falling through
  // to "try a different one" -- which is what it did before, sending the
  // member off to make a JPG export that fails at exactly the same
  // resolution.
  const sharp = (await import("sharp")).default;
  const overSized = await sharp({
    create: { width: 12000, height: 9000, channels: 3, background: "#235C49" },
  })
    .jpeg({ quality: 20 })
    .toBuffer();

  let thrown;
  try {
    await sharp(overSized, { limitInputPixels: MAX_INPUT_PIXELS }).resize(100).toBuffer();
  } catch (e) {
    thrown = e;
  }
  assert.ok(thrown, "12000x9000 no longer exceeds the decode ceiling");

  const said = describeProcessingError(thrown);
  assert.notEqual(said, describeProcessingError(new Error("something else entirely")));
  assert.match(said, /megapixels/);
  // The number in the sentence is the constant, not a copy of it.
  assert.ok(said.includes(String(Math.round(MAX_INPUT_PIXELS / 1_000_000))));
});

test("C-072: 12000x9000 really is over the limit the comment describes", () => {
  // The comment used to claim a full 108MP shot fitted. 12000 * 9000 does not.
  assert.ok(12000 * 9000 > MAX_INPUT_PIXELS);
});

/* ------------------------------------------------------------------ *
 *  C-066: a photograph with no MIME type is still a photograph.
 * ------------------------------------------------------------------ */

test("a blank MIME type falls back to the filename, as isImageFile already does", () => {
  // The two must agree: the composer's own check accepts these files, so the
  // presign step refusing them was the site telling a member their ordinary
  // JPEG was an unsupported format.
  for (const name of ["IMG_0042.jpg", "holi.JPEG", "scan.png", "loop.gif", "shot.webp"]) {
    assert.ok(isImageFile({ type: "", name }), `isImageFile refused ${name}`);
    const format = storedImageFormat("", name);
    assert.ok(format, `storedImageFormat refused ${name}`);
    assert.match(format.contentType, /^image\//);
    assert.ok(!format.ext.includes("."));
  }
  assert.deepEqual(storedImageFormat("", "IMG_0042.jpg"), { ext: "jpg", contentType: "image/jpeg" });
  assert.deepEqual(storedImageFormat("", "holi.JPEG"), { ext: "jpg", contentType: "image/jpeg" });
});

test("C-066: a type that IS given and cannot be decoded is still refused", () => {
  assert.equal(storedImageFormat("image/heic", "IMG.heic"), null);
  assert.equal(storedImageFormat("image/heif", "IMG.heif"), null);
  assert.equal(storedImageFormat("application/pdf", "deed.pdf"), null);
  // ...and the name is only consulted when there is no type at all.
  assert.equal(storedImageFormat("image/heic", "IMG_0042.jpg"), null);
  // A name that says nothing decodable is refused too.
  assert.equal(storedImageFormat("", "IMG_0042.heic"), null);
  assert.equal(storedImageFormat("", "notes"), null);
  assert.equal(storedImageFormat("", undefined), null);
  assert.equal(storedImageFormat(undefined, undefined), null);
});

test("every route that takes image bytes goes through the one door", async () => {
  /* Derived from the directory, not a list: the three upload routes each wrote
     out originAllowed -> auth -> requireVerifiedMember -> rateLimit("uploads")
     by hand, and nothing anywhere failed if a fourth route arrived with three
     of the four. This repo has already paid for that shape once, when M15 was
     fixed on one upload path and missed on three (C-073). */
  const { walk, read, decomment, ROOT } = await import("./test-kit.mjs");
  const { resolve, relative } = await import("node:path");
  const routes = walk(resolve(ROOT, "src/app/api/upload"), {
    match: (name) => name === "route.ts",
  }).map((full) => relative(ROOT, full));

  assert.ok(routes.length >= 3, `only found ${routes.length} upload routes; the walk broke`);
  for (const file of routes) {
    assert.match(
      decomment(read(file)),
      /vetUploadRequest\(/,
      `${file} does not call vetUploadRequest, so its origin, auth, confirmed-address ` +
        `and rate-limit checks are its own again`
    );
  }
});

test("C-066: the type the PUT is signed with is the type the client sends", async () => {
  // A signature over image/jpeg and a PUT sent as blank is a 403 at R2, so
  // these two halves have to stay joined.
  const { readFileSync } = await import("node:fs");
  const presign = readFileSync(new URL("../app/api/upload/presign/route.ts", import.meta.url), "utf8");
  const client = readFileSync(new URL("./upload-client.ts", import.meta.url), "utf8");
  assert.match(presign, /presignImagePut\([\s\S]{0,120}format\.contentType/);
  assert.match(presign, /contentType: format\.contentType/);
  assert.match(client, /"Content-Type": presign\.contentType \?\? file\.type/);
  assert.match(client, /filename: file\.name/);
});

/* ------------------------------------------------------------------ *
 *  C-073: every path that flattens a moving image says so.
 * ------------------------------------------------------------------ */

/** A valid two-frame GIF, built by hand: sharp cannot write one, and this
 *  needs to be a real animation, not a fixture that happens to be a GIF. */
function twoFrameGif() {
  const hex = (s) => Buffer.from(s.replace(/\s/g, ""), "hex");
  const frame = hex("21f904000a000000" + "2c0000000001000100 00" + "02" + "02" + "4c01" + "00");
  return Buffer.concat([
    hex("47494638396101000100 80 00 00"), // GIF89a, 1x1, global colour table
    hex("000000 ffffff"),
    frame,
    frame,
    hex("3b"),
  ]);
}

test("C-073: an animation really is seen as more than one frame", async () => {
  const { countImageFrames } = await import("./image.ts");
  assert.equal(await countImageFrames(twoFrameGif()), 2);
  const sharp = (await import("sharp")).default;
  const still = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#235C49" } })
    .png()
    .toBuffer();
  assert.equal(await countImageFrames(still), 1, "an ordinary photo must not be announced");
});

test("C-073: every path that re-encodes counts the frames and says the same sentence", async () => {
  const { readFileSync } = await import("node:fs");
  const paths = {
    "/api/upload": "../app/api/upload/route.ts",
    "/api/upload/finalize": "../app/api/upload/finalize/route.ts",
    "collection contribute (both actions)": "../app/(main)/collection/actions.ts",
  };
  for (const [label, file] of Object.entries(paths)) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(src, /countImageFrames\(/, `${label} does not count frames`);
    assert.match(src, /stillPictureNotice\(/, `${label} does not use the shared sentence`);
  }
  // Both Collection actions, not just one of them.
  const collection = readFileSync(new URL(paths["collection contribute (both actions)"], import.meta.url), "utf8");
  assert.equal([...collection.matchAll(/countImageFrames\(/g)].length, 2);

  // ...and both surfaces show what comes back.
  const composer = readFileSync(new URL("../components/posts/use-composer-uploads.ts", import.meta.url), "utf8");
  assert.equal([...composer.matchAll(/toast\.info\(notice\)/g)].length, 2, "the direct path drops the notice");
  /* The contribute dialog became the contribute room on 2026-08-28 (spec
     sec. 8.2), and the room files a BATCH -- so it collects the notices and
     says them once at the end rather than once per file. Both paths through
     it have to keep the notice. */
  const room = readFileSync(new URL("../components/collection/contribute-room.tsx", import.meta.url), "utf8");
  assert.equal(
    [...room.matchAll(/notices\.current\.add\(res\.notice\)/g)].length,
    2,
    "a contribute path drops the notice"
  );
  assert.match(room, /toast\.info\(/);
});

test("C-073: the sentence names the file when there is one to name", () => {
  assert.match(stillPictureNotice("holi.gif"), /"holi\.gif"/);
  assert.match(stillPictureNotice(), /^That photo/);
  assert.equal(stillPictureNotice("a.gif").replace('"a.gif"', "That photo"), stillPictureNotice());
});
