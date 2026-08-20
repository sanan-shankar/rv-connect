import assert from "node:assert/strict";
import test from "node:test";

import { decideOwnedUploads, ownUploadsPrefix, MAX_IMAGES } from "./upload-ownership-rule.ts";

/* ------------------------------------------------------------------ *
 *  The C2 write-time ownership decision, written down as attacks.
 *
 *  The vulnerability: any member could put every scraped R2 URL — the
 *  heritage Collection, other members' avatars and post images — into a
 *  post's `images` and then delete the post, taking every named object with
 *  it, unrecoverably (no R2 versioning). The fix mints keys the server
 *  scopes to the uploader, `uploads/<their id>/...`, and refuses any write
 *  whose image keys are not the caller's own. Each case is that refusal.
 * ------------------------------------------------------------------ */

const ME = "clown_me";
const YOU = "clown_you";
const mine = (name) => ({ minted: true, key: `${ownUploadsPrefix(ME)}2026/08/${name}.webp` });
const yours = (name) => ({ minted: true, key: `${ownUploadsPrefix(YOU)}2026/08/${name}.webp` });

test("my own uploaded images pass", () => {
  assert.deepEqual(decideOwnedUploads([mine("a"), mine("b")], ME), { ok: true });
});

test("an empty list passes (a post with no photos)", () => {
  assert.deepEqual(decideOwnedUploads([], ME), { ok: true });
});

test("ATTACK: another member's uploaded image is refused", () => {
  const v = decideOwnedUploads([yours("victim")], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: one of mine plus one of yours is refused as a whole", () => {
  const v = decideOwnedUploads([mine("a"), yours("victim")], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: a Collection heritage key is refused (wrong root, not under my uploads prefix)", () => {
  // A scraped Collection URL resolves to a `collection/...` key, which can
  // never start with `uploads/<me>/`.
  const v = decideOwnedUploads([{ minted: true, key: `collection/${YOU}/2026/07/heritage.webp` }], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: an avatar key is refused (wrong root)", () => {
  const v = decideOwnedUploads([{ minted: true, key: `avatars/${ME}/2026/08/face.webp` }], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: an external, non-minted URL is refused", () => {
  const v = decideOwnedUploads([{ minted: false, key: null }], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: a minted-looking URL that resolves to no key is refused", () => {
  const v = decideOwnedUploads([{ minted: true, key: null }], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: a legacy key with no id segment is refused (uploads/2026/... not uploads/<me>/...)", () => {
  const v = decideOwnedUploads([{ minted: true, key: "uploads/2026/08/legacy.webp" }], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: a prefix-spoof id is refused (uploads/<me>evil/ does not start with uploads/<me>/)", () => {
  const v = decideOwnedUploads([{ minted: true, key: `uploads/${ME}evil/2026/08/x.webp` }], ME);
  assert.equal(v.ok, false);
});

test(`ATTACK: more than ${MAX_IMAGES} images is refused even when all are mine`, () => {
  const many = Array.from({ length: MAX_IMAGES + 1 }, (_, i) => mine(`x${i}`));
  const v = decideOwnedUploads(many, ME);
  assert.equal(v.ok, false);
});

test(`exactly ${MAX_IMAGES} of my own images pass`, () => {
  const many = Array.from({ length: MAX_IMAGES }, (_, i) => mine(`x${i}`));
  assert.deepEqual(decideOwnedUploads(many, ME), { ok: true });
});
