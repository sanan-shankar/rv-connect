import test from "node:test";
import assert from "node:assert/strict";
import { collectionSaveName, photoSaveName } from "./photo-save-name.ts";

/* ------------------------------------------------------------------ *
 *  The name a saved photograph arrives under.
 *
 *  Two of these are the bug this file was written for and neither is
 *  hypothetical. The extension one shipped for months: everything stored
 *  here is WebP, the Download button saved the stored bytes, and the file
 *  landed as `<object key>.webp` -- which older Photoshop, Preview's print
 *  dialog and most print shops refuse to open. The other is what a naive
 *  fix does to it: append ".jpg" instead of replacing, and the file is
 *  `photo.webp.jpg`, still unopenable but now also confusing.
 *
 *  The rest guard the fact that a caption is member-written text going
 *  into a filename.
 * ------------------------------------------------------------------ */

test("a saved photograph is always a .jpg, whatever it was stored as", () => {
  const name = photoSaveName(undefined, "https://images.rishivalley.space/collection/x/dw8j9.webp");
  assert.equal(name, "dw8j9.jpg");
});

test("the stored extension is replaced, never appended", () => {
  assert.equal(photoSaveName("sports day.webp", "/x.webp"), "sports day.jpg");
  assert.ok(!photoSaveName(undefined, "/uploads/a/b.webp").includes(".webp"));
});

test("a query string is not part of the name", () => {
  assert.equal(photoSaveName(undefined, "/uploads/a/b.webp?v=2"), "b.jpg");
});

test("a Collection photograph is named for where, when and what", () => {
  assert.equal(collectionSaveName("Sports day", "1978"), "Rishi Valley 1978 Sports day");
  assert.equal(collectionSaveName("Sports day", null), "Rishi Valley Sports day");
});

test("an undated, uncaptioned photograph still gets a name", () => {
  assert.equal(collectionSaveName(null, null), "Rishi Valley");
  assert.equal(photoSaveName("", ""), "photograph.jpg");
});

test("a caption cannot smuggle a path or a control character into the name", () => {
  const hostile = collectionSaveName("../../etc/passwd", "1978");
  assert.ok(!hostile.includes("/"));
  assert.ok(!hostile.includes(".."));
  const withNewline = collectionSaveName("hockey\nteam", "1978");
  assert.equal(withNewline, "Rishi Valley 1978 hockey team");
});

test("a long caption is cut before any filesystem cuts it", () => {
  const name = photoSaveName(collectionSaveName("a".repeat(300), "1978"), "/x.webp");
  assert.ok(name.length <= 76, `got ${name.length}`);
  assert.ok(name.endsWith(".jpg"));
});

test("a name never starts with a dot, which would hide the file", () => {
  assert.ok(!photoSaveName(".hidden", "/x.webp").startsWith("."));
});
