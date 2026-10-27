/**
 * Tagging people in a Collection photograph's description (owner, 2026-10-27:
 * "can you tag people in photo descriptions?").
 *
 * A tag is the post's own `@[Name](id)`, written into `Photo.caption`. What
 * these pin is everything that has to agree for that to be safe: the person
 * hears about it only once they can open the photograph, a caption's length is
 * what a reader sees, and nowhere that prints a caption as plain text shows
 * the brackets and the id.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "./test-kit.mjs";
import { mentionsAsNames } from "./rich-text.ts";

const TAGGED = "Class hike with @[Atul Vij](cmabc123) and @[Rajan](cmxyz789)";

test("a tag reads as the name it shows wherever it cannot be a link", () => {
  assert.equal(mentionsAsNames(TAGGED), "Class hike with Atul Vij and Rajan");
  assert.equal(mentionsAsNames("no tags here"), "no tags here");
  assert.equal(mentionsAsNames(null), "");
  // Called twice in a row: the shared global pattern must not carry lastIndex.
  assert.equal(mentionsAsNames(TAGGED), "Class hike with Atul Vij and Rajan");
});

test("a saved photograph is named after the person, never their id", () => {
  // photo-save-name.ts takes no imports (TRAPS, "Testing"), so the caller reads
  // the tags as names before handing the caption over.
  const src = decomment(read("src/lib/collection-viewer-image.ts"));
  assert.match(src, /collectionSaveName\(mentionsAsNames\(p\.caption\)/);
});

test("the 300 counts what a reader sees, not the ids behind the tags", () => {
  const src = decomment(read("src/lib/validators.ts"));
  assert.match(src, /caption:\s*z\s*\.string\(\)[\s\S]{0,120}mentionsAsNames\(c\)\.length <= 300/);
});

test("a tagged member hears only once they may open the photograph", () => {
  const src = decomment(read("src/lib/photo-tag-notifications.ts"));
  assert.match(src, /decidePhotoVisibility\(photo, \w+\)\.ok/, "visibility must be the permalink's own rule");
  assert.match(src, /isBlocked:\s*false,\s*deletionRequestedAt:\s*null/);
  assert.match(src, /\.slice\(0, MAX_MENTION_NOTIFICATIONS\)/, "one save cannot page half the community");
  // Once per photograph, whoever pressed Save: matched on the link, not the message.
  assert.match(src, /type:\s*"mention",\s*link\s*\}/);
});

test("every caption write tells the people it tags", () => {
  const collection = decomment(read("src/app/(main)/collection/actions.ts"));
  assert.equal(
    (collection.match(/notifyPhotoTags\(/g) ?? []).length,
    3,
    "expected contributePhoto, contributePhotoDirect and editPhoto"
  );
  const review = decomment(read("src/app/(main)/admin/review/actions.ts"));
  assert.equal((review.match(/notifyPhotoTags\(/g) ?? []).length, 1, "saveReview, on every decision");
});

test("a deleted photograph takes its tags' bells with it, and nothing else", () => {
  const src = decomment(read("src/app/(main)/collection/actions.ts"));
  const from = src.indexOf("async function erasePhoto");
  const erase = src.slice(from, src.indexOf("\nexport async function", from));
  assert.match(erase, /notification\.deleteMany\(\{\s*where:\s*\{\s*type:\s*"mention",\s*link:\s*`\/collection\/\$\{photoId\}`/);
});

test("the viewer draws a caption through the one sanitising renderer", () => {
  const src = decomment(read("src/components/common/image-viewer.tsx"));
  assert.match(src, /renderRichText\(caption\)/);
  assert.equal((src.match(/\{caption\}/g) ?? []).length, 0, "a raw {caption} prints a tag as brackets and an id");
});
