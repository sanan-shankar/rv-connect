import test from "node:test";
import assert from "node:assert/strict";
import { isImageFile, isUploadedImageUrl, publicBaseFor } from "./upload-shared.ts";

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
