import assert from "node:assert/strict";
import test from "node:test";
import { ROOT, read, decomment, walk } from "./test-kit.mjs";
import { droppedImages } from "./draft-images.ts";

/* ------------------------------------------------------------------ *
 *  Bytes never outlive the row that names them.
 *
 *  Nothing in this system can enumerate the bucket: `keyForUrl` walks a
 *  URL to a key, and every sweep reads rows. So an object that no row
 *  references, and no code deleted, is unreachable for ever -- there is
 *  no list to find it in and no sweep that will ever look. That makes
 *  the moment of NOT creating the row the dangerous one.
 *
 *  This file pins the two shapes that keep it closed, by reading the
 *  source rather than the behaviour, because what is being asserted IS
 *  structural: that no exit was forgotten.
 * ------------------------------------------------------------------ */

/** A named function's body, brace-matched. Anchored on the `function`
 *  keyword, never on the bare name: a file that imports a symbol and
 *  also calls it will hand an indexOf-on-the-name search the IMPORT
 *  line, and every assertion after that passes against nothing. */
function blockAt(src, from, bodyBrace = false) {
  /* `bodyBrace` skips a return-type annotation: `): Promise<{ ok: true }> {`
     has TWO opening braces after the parameter list and the first one is the
     type. A function body's brace is the one that ends its line. */
  const open = bodyBrace ? from + src.slice(from).search(/\{[ \t]*\r?\n/) : src.indexOf("{", from);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return { body: src.slice(open, i + 1), end: i + 1 };
  }
  throw new Error(`unbalanced braces from ${from}`);
}

function bodyOf(src, name) {
  const decl = src.indexOf(`function ${name}(`);
  assert.notEqual(decl, -1, `${name} not found`);
  return blockAt(src, src.indexOf(")", decl), true).body;
}

/* ---- C-063: the staged direct-upload original ------------------- */

const collection = read("src/app/(main)/collection/actions.ts");
const direct = decomment(bodyOf(collection, "contributePhotoDirect"));

test("the extraction really is contributePhotoDirect's whole body", () => {
  // If this fails the assertions below are testing a fragment, and their
  // passing means nothing.
  assert.match(direct, /^\{[\s\S]*return \{ success: true, autoApprove[^}]*\};\s*\}$/);
  assert.ok(direct.includes("COLLECTION_ORIGINAL_KEY.test(input.key)"));
});

test("C-063: every refusal after the key is validated deletes the staged object", () => {
  const guard = direct.indexOf("const refuse = async");
  assert.notEqual(guard, -1, "the single cleanup exit is gone");
  assert.ok(
    /const refuse = async[^;]*?purgeImageKey\(input\.key/s.test(direct),
    "refuse no longer purges the staged key"
  );

  // The property: past the point where we know the key is the caller's own,
  // NO error leaves by any door but `refuse`. A new refusal added below the
  // guard fails here until it is routed through it.
  const after = direct.slice(blockAt(direct, guard).end);
  const bare = [...after.matchAll(/return \{\s*error/g)];
  assert.deepEqual(
    bare.map((m) => after.slice(Math.max(0, m.index - 90), m.index + 40)),
    [],
    "an error return below the guard skips the staged-object cleanup"
  );

  // ...and there are real refusals down there to have routed. Counted, not
  // named, so renaming a message does not touch this test.
  assert.ok(
    [...after.matchAll(/return refuse\(/g)].length >= 5,
    "the refusals stopped going through refuse"
  );
});

test("C-063: the one refusal ABOVE the guard is the unvouched key itself", () => {
  const above = direct.slice(0, direct.indexOf("const refuse = async"));
  const bare = [...above.matchAll(/return \{\s*error/g)].length;
  // auth, demo, bad key. Deleting for a key we cannot vouch for would be
  // aiming a delete at an object the caller merely named.
  assert.equal(bare, 3);
});

/* ---- the fallback the cleanup itself leans on ------------------- */

const purge = decomment(read("src/lib/image-purge.ts"));

test("a refused delete is queued for the nightly drain, not logged and lost", () => {
  const queue = bodyOf(purge, "queue");
  assert.ok(queue.includes("pendingImagePurge.createMany"));
  // Both entry points must reach it, and only on the failure branch.
  assert.ok(/if \(await delImageByKey\(key\)\) return;\s*await queue\(/.test(purge));
  assert.ok(bodyOf(purge, "purgeImageUrls").includes("!results[i]"));
});

/* ---- C-064: bytes stored before a request gave up ---------------- */

const proxyUpload = decomment(read("src/app/api/upload/route.ts"));
const finalize = decomment(read("src/app/api/upload/finalize/route.ts"));

for (const [name, src] of [
  ["/api/upload", proxyUpload],
  ["/api/upload/finalize", finalize],
]) {
  test(`C-064: ${name} gives back what it stored before it gave up`, () => {
    const loop = src.indexOf("const abort = async");
    assert.notEqual(loop, -1, "the single abort exit is gone");
    assert.ok(
      /const abort = async[\s\S]*?purgeImageUrls\(/.test(src.slice(loop)),
      "abort no longer purges the stored objects"
    );
    // The property: below the abort, an error leaves only through it. A new
    // refusal in the loop fails here until it is routed the same way.
    const after = src.slice(blockAt(src, src.indexOf("=>", loop)).end);
    const bare = [...after.matchAll(/return NextResponse\.json\(\s*\{?\s*error/g)];
    assert.deepEqual(
      bare.map((m) => after.slice(m.index, m.index + 70)),
      [],
      "an error return inside the loop leaves the stored objects behind"
    );
    assert.ok([...after.matchAll(/return abort\(/g)].length >= 3);
  });
}

test("C-064: finalize also releases the originals it never got to", () => {
  // The `finally` only ever reached the key of the pass that failed; the
  // staged objects for the keys after it stayed in the bucket.
  assert.ok(/keys\.slice\(from \+ 1\)\.map\(publicUrlForKey\)/.test(finalize));
});

test("C-064: no Collection photo row is written outside the guard that cleans up", () => {
  const raw = decomment(read("src/app/(main)/collection/actions.ts"));
  const guarded = bodyOf(raw, "createPhotoRow");
  assert.ok(guarded.includes("prisma.photo.create"));
  assert.ok(guarded.includes("purgeImageUrls"));
  // Exactly one call site in the file: the one inside the guard.
  assert.equal([...raw.matchAll(/prisma\.photo\.create\(/g)].length, 1);
  // ...and both contribution paths go through it, carrying what they stored:
  // the fallback its pair, the direct path its pair and its screen copy.
  assert.equal([...raw.matchAll(/await createPhotoRow\(/g)].length, 2);
  assert.equal([...raw.matchAll(/\}, \[url, thumbUrl\]\);/g)].length, 1);
  assert.equal([...raw.matchAll(/\}, \[url, thumbUrl, screenUrl\]\);/g)].length, 1);
});

/* ---- The screen copy goes wherever the other two go -------------- */

test("every place that deletes a Collection photo's bytes takes all of them", () => {
  /* Three objects since the screen copy (2026-09-23), and every delete used to
     hand-list the ones it knew. A forgotten one is left in a public bucket that
     nothing can enumerate -- the exact orphan the rest of this file exists to
     stop. So the list is one function, and each delete must call it; its
     parameter type then refuses a caller whose select left a column out. */
  const helper = bodyOf(decomment(read("src/lib/collection-photo.ts")), "photoStoredUrls");
  for (const column of ["url", "thumbUrl", "screenUrl"]) {
    assert.match(helper, new RegExp(`p\\.${column}\\b`), `photoStoredUrls forgets ${column}`);
  }

  const actions = decomment(read("src/app/(main)/collection/actions.ts"));
  for (const fn of ["erasePhoto", "adminRemovePhoto"]) {
    assert.match(bodyOf(actions, fn), /photoStoredUrls\(photo\)/, `${fn} lists the bytes by hand`);
  }
  // The account purge's two reads: the bytes to delete, and the covers other
  // members are wearing.
  const purge = decomment(read("src/lib/account-purge.ts"));
  assert.equal([...purge.matchAll(/photoStoredUrls\b/g)].length, 3, "an import and two uses");
  // And nobody has gone back to listing them.
  for (const [name, src] of [["actions.ts", actions], ["account-purge.ts", purge]]) {
    assert.doesNotMatch(src, /\bthumbUrl, (p|photo)\.url\b|\burl, (p|photo)\.thumbUrl\b/, `${name} hand-lists a photo's bytes`);
  }

  // The direct path stores the screen copy through the same all-or-none as the pair.
  const stored = bodyOf(actions, "contributePhotoDirect");
  assert.match(stored, /putAllOrNone\(\s*\[[\s\S]*?-s\.webp[\s\S]*?\],\s*"abandoned"/);
});

test("C-064: a half-stored pair is not left half-stored", () => {
  const raw = decomment(read("src/app/(main)/collection/actions.ts"));
  assert.equal([...raw.matchAll(/await putAllOrNone\(/g)].length, 2);
  assert.equal([...raw.matchAll(/await Promise\.all\(\[\s*putImage/g)].length, 0);
});

/* ---- C-064: a photo taken off a draft ---------------------------- */

const feed = decomment(read("src/app/(main)/feed/actions.ts"));

test("C-064: an image dropped from a draft is queued in the same write", () => {
  const edit = bodyOf(feed, "editPost");
  assert.ok(edit.includes("droppedImages("), "editPost stopped tracking what it dropped");
  // Queued inside the write that removes the reference, drained after it
  // commits -- the order deletePostWithImages already keeps.
  const write = blockAt(edit, edit.indexOf("const write = async")).body;
  assert.ok(write.includes("tx.pendingImagePurge.createMany"));
  assert.ok(write.indexOf("tx.post.update") < write.indexOf("pendingImagePurge.createMany"));
  assert.ok(/removedImages\.length > 0 \? await prisma\.\$transaction\(write\)/.test(edit));
  assert.ok(edit.includes("drainPendingImagePurges(removedImages)"));
});

test("C-064: reordering or re-adding a photo drops nothing", () => {
  const a = "/uploads/me/a.webp";
  const b = "/uploads/me/b.webp";
  const c = "/uploads/me/c.webp";
  assert.deepEqual(droppedImages([a, b, c], [c, b, a]), []);
  assert.deepEqual(droppedImages([a, b], [a, b]), []);
  assert.deepEqual(droppedImages([a, b], [a, b, c]), []);
  assert.deepEqual(droppedImages([a, b, c], [a, c]), [b]);
  assert.deepEqual(droppedImages([a, b], []), [a, b]);
  assert.deepEqual(droppedImages([], [a]), []);
  // The same URL twice on the old row is let go once per entry it lost.
  assert.deepEqual(droppedImages([a, a], [a]), []);
});

/* ---- C-069/C-152: a delete that fails leaves a worklist behind --- */

import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const SRC = resolve(ROOT, "src");
const sources = () => {
  const files = walk(SRC);
  // Counted, not assumed: every assertion below is "no file does X", which an
  // empty sweep satisfies perfectly.
  assert.ok(files.length > 300, `swept only ${files.length} files; the sweep has drifted`);
  return files.map((full) => [relative(SRC, full), readFileSync(full, "utf8")]);
};

test("C-069: nothing calls delImage directly except the two places allowed to", () => {
  // `delImage` answers false and logs; that boolean was discarded at four
  // sites, so a bad minute at R2 left "removed" bytes live at a permanent
  // public URL with nothing able to enumerate them and nothing to retry.
  // Everywhere else now goes through purgeImageUrls, which queues a failure.
  const allowed = new Set([
    "lib/storage.ts", // where it is defined
    "lib/image-purge.ts", // the wrapper that queues on failure
    "lib/account-purge.ts", // the drain itself, which reads the boolean
  ]);
  const callers = sources()
    .filter(([, src]) => /(?<![A-Za-z])delImage\(/.test(decomment(src)))
    .map(([f]) => f)
    .filter((f) => !allowed.has(f));
  assert.deepEqual(callers, []);
});

test("C-050: the avatar swap is one decision, not a read and a later write", () => {
  const settings = decomment(read("src/components/settings/actions.ts"));
  const swap = decomment(read("src/lib/avatar-swap.ts"));
  // Compare-and-swap: the update only lands if the row still holds what was
  // read, so two concurrent uploads supersede different URLs.
  const body = bodyOf(swap, "swapPhotoUrl");
  assert.ok(body.includes("photoUrl: row.photoUrl"), "the precondition is gone");
  assert.ok(body.includes("updateMany"), "an unconditional update cannot detect the race");
  assert.ok(/if \(swapped\.count > 0\) return \{ ok: true, previous: row\.photoUrl \}/.test(body));
  // Both avatar writes go through it, and neither reads the previous URL itself.
  assert.equal([...settings.matchAll(/await swapPhotoUrl\(/g)].length, 2);
  assert.equal([...settings.matchAll(/select: \{ photoUrl: true \}/g)].length, 0);
  // A lost swap takes its own upload back rather than leaving it unreferenced.
  assert.ok(/if \(!swap\.ok\) \{[\s\S]*?purgeImageUrls\(\[url\]/.test(settings));
});

/* ------------------------------------------------------------------ *
 *  The Collection's own three, from the same run.
 * ------------------------------------------------------------------ */

test("C-129: a staged upload can be contributed exactly once", () => {
  /* Two calls carrying the same key both read the original before either
     delete ran, so both re-encoded it, both stored a pair of objects, and both
     created a row -- with the per-account ceiling checked before either
     insert. Application code cannot close that under READ COMMITTED, so the
     database does. */
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /sourceKey\s+String\?\s+@unique/, "Photo.sourceKey is not unique");
  const sql = read("prisma/migrations-manual/2026-08-25-photo-source-key.sql");
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS "Photo_sourceKey_key"/);
  const actions = read("src/app/(main)/collection/actions.ts");
  assert.match(actions, /sourceKey: input\.key,/, "the direct path does not record the key it claims");
  assert.match(
    actions,
    /if \(!isUniqueViolation\(err\)\) throw err;\s*\n\s*revalidatePath\("\/collection"\);/,
    "losing the claim is not treated as the outcome the member wanted"
  );
});

test("C-074/C-130: concurrent moderation is answered, not thrown at", () => {
  /* Both admin writes on a possibly-stale row -- and they now live in two
     files. The approving half moved when /admin/content's second review UI
     went (2026-09-07): `approvePhoto` and `approvePhotos` were its only
     callers, so the ONLY write that lets a photograph in is `saveReview` in
     the review room. The invariant did not move with it. */
  const review = decomment(read("src/app/(main)/admin/review/actions.ts"));
  const approve = /const (\w+) = await prisma\.photo\.updateMany\(/.exec(review);
  assert.ok(approve, "the approve write is no longer an updateMany, so it throws P2025 again");
  assert.match(
    review,
    new RegExp(`${approve[1]}\\.count === 0`),
    "the approve write ignores having matched nothing"
  );
  const code = decomment(read("src/app/(main)/collection/actions.ts"));
  assert.match(code, /const gone = await tx\.photo\.deleteMany\(/, "the row delete still throws P2025");
  // `AlreadyGone` was `AlreadyDeclined` until the same transaction started
  // serving a member's own delete as well (spec sec. 9); the sentinel is the
  // invariant, its name is not.
  assert.match(code, /err instanceof AlreadyGone/, "the rolled-back removal is not mapped to a sentence");
});

test("C-159: the Collection intake keeps its resolve-always promise", () => {
  const src = read("src/lib/collection-intake.ts");
  const code = decomment(src);
  // No await outside a try before the loop.
  const head = code.slice(0, code.indexOf("toCopy.map"));
  const awaits = [...head.matchAll(/await /g)];
  const firstTry = head.indexOf("try {");
  assert.ok(firstTry > 0, "the pre-loop reads are not guarded at all");
  for (const a of awaits) {
    assert.ok(a.index > firstTry, "a pre-loop await sits outside the try, so after() can reject");
  }
  // And a failure mid-copy books the bytes it already stored.
  assert.match(code, /stagedCopiedUrl = copiedUrl;/, "the catch cannot see what was stored");
  assert.match(
    code,
    /pendingImagePurge\s*\n?\s*\.createMany\(\{ data: stored\.map/,
    "a failed copy still orphans the objects it stored, which nothing can enumerate"
  );
});

test("C-157/C-158: a fetch that failed is not mistaken for one that worked", () => {
  const viewer = read("src/components/common/image-viewer.tsx");
  assert.match(
    viewer,
    /if \(!res\.ok\) throw new Error\(String\(res\.status\)\);/,
    "an error body is still saved to disk under the photograph's name"
  );
  const upload = read("src/lib/upload-client.ts");
  // Backtick OR quote, and the string may wrap to the next line.
  const warns = [...upload.matchAll(/console\.warn\(\s*[`"]\[upload\]/g)];
  assert.equal(warns.length, 3, `${warns.length} of the 3 silent fallbacks say anything`);
});
