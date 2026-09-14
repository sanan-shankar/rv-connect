import assert from "node:assert/strict";
import test from "node:test";

import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Audit pins for the feed's paging, the composer and the letters
 *  index. The file is named for `src/lib/rich-truncate.ts`, which it
 *  was written for and which no longer exists: "Read more" folds by
 *  measured LINES now, so nothing is cut in two and the C-011 family of
 *  bugs cannot happen. Those pins, and the fold's own rules, live in
 *  `read-more-fold.test.mjs`. The name stays because several audit
 *  documents cite the tests below by this file and line.
 * ------------------------------------------------------------------ */

/* ---- C-180: a double tap does not append a page twice ----------- */

test("C-180: both Load-more handlers guard synchronously and dedupe by id", () => {
  for (const file of [
    "src/components/posts/post-feed.tsx",
    "src/components/profile/profile-author-feed.tsx",
  ]) {
    const src = decomment(read(file));
    assert.match(src, /if \(loadingMoreRef\.current\) return;/, `${file} relies on a state flag alone`);
    assert.match(src, /loadingMoreRef\.current = true;/, `${file} never sets its guard`);
    assert.match(src, /loadingMoreRef\.current = false;/, `${file} never releases its guard`);
    // Either spelling of the dedupe. What is pinned is that the page is
    // deduped before it is appended, not which code does it: the hand-rolled
    // Set moved into `appendUnseen` (audit C-071), which append-page.test.mjs
    // owns and which every paged list now shares.
    assert.match(
      src,
      /const seen = new Set\(prev\.map\(\(p\) => p\.id\)\);|appendUnseen\(prev, data\.posts\)/,
      `${file} appends a page without deduping it`
    );
    assert.doesNotMatch(
      src,
      /setPosts\(\(prev\) => \[\.\.\.prev, \.\.\.data\.posts\]\)/,
      `${file} still appends blind`
    );
  }
});

/* ---- C-183/C-014: the composer's own two -------------------------- */

test("C-183: every preview this composer mints is released", () => {
  // The pipeline moved out of the composer into its own hook (feed-posts-02);
  // the pin follows the code, not the filename.
  const src = read("src/components/posts/use-composer-uploads.ts");
  assert.match(src, /function revokeBlobPreviews\(/, "there is no revoker");
  // Both exits: the successful post, and an unmount that was not a post.
  const calls = [...src.matchAll(/revokeBlobPreviews\(previewsRef\.current\)/g)];
  assert.equal(calls.length, 2, `${calls.length} of the 2 exits release their blob urls`);
  assert.match(src, /u\.startsWith\("blob:"\)/, "it would try to revoke stored R2 urls too");
});

test("C-014: the crash-net key names the account it belongs to", () => {
  // Likewise: the crash net is `use-letter-persistence.ts` now, and the id it
  // scopes the key with arrives as `userId` rather than off the session prop.
  const src = read("src/components/posts/use-letter-persistence.ts");
  assert.match(
    src,
    /`rv:letter-draft:\$\{userId \?\? "anon"\}:\$\{postId \?\? "new"\}`/,
    "an unsaved letter can be restored into the next member's composer on a shared browser"
  );
  /* Counted: three call sites, and two of three passing the id is not the fix
     -- the ":new" key is the one that is never cleared by a save. */
  const calls = [...src.matchAll(/localDraftKey\(userId/g)];
  assert.equal(calls.length, 3, `${calls.length} of the 3 call sites scope the key`);
});

test("C-014: the one surface that writes letter drafts actually supplies an id", () => {
  /* The shape above was right and the fix was off anyway, for as long as it
     had shipped: the letters desk -- the ONLY surface where `defaultLetter`
     is set, and so the only one where the crash net runs at all -- never
     passed `currentUser`, so every belt went to `rv:letter-draft:anon:new`
     and two members on one browser shared it. Found by driving it on
     2026-08-27, not by reading it, which is what a shape test cannot do.
     So this pins the WIRE, not the template. */
  const desk = read("src/components/letters/letter-desk.tsx");
  assert.match(desk, /currentUser=\{\{ id: writerId\b/, "the desk composes anonymously again");
  for (const page of [
    "src/app/(main)/letters/new/page.tsx",
    "src/app/(main)/letters/[id]/edit/page.tsx",
  ]) {
    assert.match(read(page), /writerId=\{session\.user\.id\}/, `${page} does not name the writer`);
  }
});

/* ---- C-008: an author keeps sight of their own letter ----------- */

test("C-008: the letters index uses the shared audience builder", () => {
  const src = read("src/app/(main)/letters/(index)/page.tsx");
  assert.match(src, /audienceWhere\(session\.user, viewerCities\)/, "the index hand-rolls its audience again");
  assert.doesNotMatch(src, /AND: \[cityScopeWhere\(viewerCities\)\]/, "the exemption-less city arm is back");
  // And the builder really carries the author exemption on both arms.
  const body = balancedBody(read("src/lib/posts.ts"), "export function audienceWhere");
  assert.equal(
    [...body.matchAll(/authorId: viewer\.id/g)].length,
    2,
    "audienceWhere no longer exempts the author on both the city and the batch arm"
  );
});
