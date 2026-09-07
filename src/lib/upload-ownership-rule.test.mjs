import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { ROOT, SKIP_DIRS, decomment, walk } from "./test-kit.mjs";

import {
  decideOwnedUploads,
  ownUploadsPrefix,
  MAX_IMAGES,
  MAX_IMAGE_URL,
} from "./upload-ownership-rule.ts";

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
const mine = (name) => {
  const key = `${ownUploadsPrefix(ME)}2026/08/${name}.webp`;
  return { minted: true, key, length: key.length + 40 };
};
const yours = (name) => {
  const key = `${ownUploadsPrefix(YOU)}2026/08/${name}.webp`;
  return { minted: true, key, length: key.length + 40 };
};

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
  const v = decideOwnedUploads([{ minted: true, key: `collection/${YOU}/2026/07/heritage.webp`, length: 90 }], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: an avatar key is refused (wrong root)", () => {
  const v = decideOwnedUploads([{ minted: true, key: `avatars/${ME}/2026/08/face.webp`, length: 90 }], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: an external, non-minted URL is refused", () => {
  const v = decideOwnedUploads([{ minted: false, key: null, length: 60 }], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: a minted-looking URL that resolves to no key is refused", () => {
  const v = decideOwnedUploads([{ minted: true, key: null, length: 60 }], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: a legacy key with no id segment is refused (uploads/2026/... not uploads/<me>/...)", () => {
  const v = decideOwnedUploads([{ minted: true, key: "uploads/2026/08/legacy.webp", length: 70 }], ME);
  assert.equal(v.ok, false);
});

test("ATTACK: a prefix-spoof id is refused (uploads/<me>evil/ does not start with uploads/<me>/)", () => {
  const v = decideOwnedUploads([{ minted: true, key: `uploads/${ME}evil/2026/08/x.webp`, length: 80 }], ME);
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

/* ---- C-169: length is a check, not an afterthought ------------------ */

test("ATTACK: a legitimately-prefixed URL of megabytes is refused", () => {
  /* Nothing on this path bounded LENGTH. `postSchema.images` is a bare
     z.string(), parseImageUrls only checks the JSON parses into strings, and
     the key parser is happy with any number of characters after the prefix --
     so `uploads/<own id>/<megabytes of junk>.webp` was app-minted, owned, and
     stored verbatim in a column every feed reader downloads and re-parses per
     render. The sibling targetBatches field was capped for exactly this
     reason (M43). */
  const key = `${ownUploadsPrefix(ME)}2026/08/${"a".repeat(4_000_000)}.webp`;
  const v = decideOwnedUploads([{ minted: true, key, length: key.length + 40 }], ME);
  assert.equal(v.ok, false);
});

test("the cap is generous enough that no real upload is near it", () => {
  // A real minted URL is well under 120 characters. The boundary, both sides.
  const key = `${ownUploadsPrefix(ME)}2026/08/photo.webp`;
  assert.equal(decideOwnedUploads([{ minted: true, key, length: MAX_IMAGE_URL }], ME).ok, true);
  assert.equal(decideOwnedUploads([{ minted: true, key, length: MAX_IMAGE_URL + 1 }], ME).ok, false);
  assert.ok(MAX_IMAGE_URL >= 256, "the cap has been tightened to where a real URL could hit it");
});

test("a candidate built with no length at all is refused, not waved through", () => {
  /* The trap this cap could quietly fall into: `undefined > 512` is false, so
     a caller that forgot the field would disable the check everywhere while
     every reader still believed in it. Fail closed instead. */
  const key = `${ownUploadsPrefix(ME)}2026/08/photo.webp`;
  assert.equal(decideOwnedUploads([{ minted: true, key }], ME).ok, false);
  assert.equal(decideOwnedUploads([{ minted: true, key, length: NaN }], ME).ok, false);
});

/* ---- One home for "three photos per post" ------------------------ */

test("nothing retypes the photo cap MAX_IMAGES already argues for", () => {
  /* The cap was written six times: `const MAX_FILES = 3` in each of the two
     upload doors, `3 - shots.length` in the composer's hook, `previews.length
     >= 3` in the composer, `allowed.length > 3` in editPost, and this file's
     own constant -- the only one with a reason attached. A sweep rather than
     the five-file list the audit found, because the sixth copy is the one
     nobody counts (refactor audit 2, feed-posts-06).

     The lab is excluded: it keeps a forked composer on purpose, and a number
     in a design room is shown to nobody. */
  const files = walk(resolve(ROOT, "src"), { skip: [...SKIP_DIRS, "lab"] });
  assert.ok(files.length > 300, `swept only ${files.length} files; the sweep has drifted`);

  const offenders = [];
  for (const full of files) {
    const rel = relative(ROOT, full);
    if (rel === "src/lib/upload-ownership-rule.ts") continue;
    const code = decomment(readFileSync(full, "utf8"));
    // A second home for the constant, under any of the names it has worn.
    if (/\bconst\s+MAX_(?:IMAGES|FILES|PHOTOS|SHOTS|ATTACHMENTS|PICS)\s*=\s*\d/.test(code)) {
      offenders.push(`${rel}: declares its own cap`);
    }
    // `previews.length >= 3`, `allowed.length > 3` -- the cap as a literal.
    // Named collections only: `b.length >= 3` on a magic-byte buffer is not it.
    if (/\b(?:previews|shots|photos|images|files|keys|allowed|attachments|urls)\.length\s*(?:>=?|<=?)\s*3\b/.test(code)) {
      offenders.push(`${rel}: compares a list length against a literal 3`);
    }
    // `3 - shots.length` -- "how many places are left".
    if (/\b3\s*-\s*[A-Za-z_$][A-Za-z0-9_$.]*\.length\b/.test(code)) {
      offenders.push(`${rel}: counts the remaining places from a literal 3`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `the photo cap is typed by hand again instead of imported from upload-ownership-rule:\n  ${offenders.join("\n  ")}`
  );
});
