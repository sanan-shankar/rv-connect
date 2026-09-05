import assert from "node:assert/strict";
import test from "node:test";

import { safeTruncateIndex } from "./rich-truncate.ts";
import { renderRichText } from "./rich-text.ts";
import { read, decomment, hasLoneSurrogate, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  "Read more", and the four things it used to break.
 *
 *  The card renders the lead and the remainder as two SEPARATE calls
 *  to renderRichText, which needs both delimiters of a run in one
 *  string and matches a mention whole. So the property worth pinning is
 *  not where the cut lands -- it is that cutting there changes nothing
 *  about what either half renders as.
 * ------------------------------------------------------------------ */

/** The card's own rule: render the two halves and stick them together. */
const asCard = (text, max) => {
  const i = safeTruncateIndex(text, max);
  return renderRichText(text.slice(0, i)) + renderRichText(text.slice(i));
};

/** What it would look like if nothing were split. */
const whole = (text) => renderRichText(text);

const MAX = 300;
const filler = (n) => "word ".repeat(Math.ceil(n / 5)).slice(0, n);

test("C-011: a bold run spanning the cut still renders as bold", () => {
  const text = `${filler(290)}**a bold phrase that straddles the boundary** ${filler(60)}`;
  assert.match(whole(text), /<strong>/, "the control does not even render bold; the case is wrong");
  assert.match(asCard(text, MAX), /<strong>/, "the split broke the bold run into raw asterisks");
});

test("C-011: a mention spanning the cut still renders as a mention", () => {
  const text = `${filler(292)}@[Anantha Rao](abc123def456) ${filler(60)}`;
  assert.match(whole(text), /href="\/profile\/abc123def456"/);
  assert.match(asCard(text, MAX), /href="\/profile\/abc123def456"/, "the split printed the mention's source");
});

test("C-011: an emoji is never split into lone surrogates", () => {
  for (const text of [
    `${filler(299)}\u{1F600}${filler(60)}`,
    `${filler(298)}\u{1F468}‍\u{1F469}‍\u{1F467}${filler(60)}`,
    `${"\u{1F600}".repeat(400)}`,
  ]) {
    const i = safeTruncateIndex(text, MAX);
    assert.ok(!hasLoneSurrogate(text.slice(0, i)), "the lead ends on half a character");
    assert.ok(!hasLoneSurrogate(text.slice(i)), "the remainder starts on half a character");
  }
});

test("C-011: the cut lands on a space, so nothing breaks mid-word", () => {
  const text = filler(600);
  const i = safeTruncateIndex(text, MAX);
  assert.match(text[i], /\s/, "the remainder begins mid-word");
  assert.ok(i <= MAX, "the lead grew past the cap");
  assert.ok(i > MAX * 0.6, `the cut backed off to ${i}, which is most of the lead thrown away`);
});

test("C-011: short text is not cut at all", () => {
  assert.equal(safeTruncateIndex("A short post.", MAX), "A short post.".length);
});

test("C-011: the card uses the safe index rather than a raw slice", () => {
  const card = read("src/components/posts/post-card.tsx");
  assert.match(card, /safeTruncateIndex\(content, READ_MORE_TRUNCATE_LEN\)/, "the helper is not called");
  assert.doesNotMatch(
    card,
    /content\.slice\(0, READ_MORE_TRUNCATE_LEN\)/,
    "the raw 300-character slice is back"
  );
});

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
  assert.match(desk, /currentUser=\{\{ id: writerId \}\}/, "the desk composes anonymously again");
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
