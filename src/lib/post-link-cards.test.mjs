import test from "node:test";
import assert from "node:assert/strict";
import { read, balancedBody, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Posts, letters and comments show a pasted link the way a Catch-up
 *  answer already does: clickable in the text, and -- for a post or a
 *  letter, never a comment -- a resolved link becomes a `LinkCard` cut
 *  out of the paragraph.
 *
 *  WHY IT IS A TEST AND NOT A COMMENT. Every rule here fails silently or
 *  expensively, never loudly:
 *
 *   - a per-post preview query is an N+1 that a screenshot cannot see --
 *     the feed page renders exactly the same whether it cost one query or
 *     twenty;
 *   - a post's `content` doubling as `EditPostDialog`'s initial value means
 *     stripping a resolved link out of it on the SERVER, the way the
 *     Catch-up reader strips `body`, would hand the edit dialog a body with
 *     the link already gone -- and saving that overwrites the stored post,
 *     permanently, with no error and no diff to read;
 *   - a card on a comment, or a preview fetched from the public demo, are
 *     both additions nobody would notice missing until they were.
 *
 *  So this reads the source of every file the feature touches and asserts
 *  on its shape, the way `heart-revalidate-rule.test.mjs` and
 *  `image-viewer-import-rule.test.mjs` already do for their own rules.
 * ------------------------------------------------------------------ */

const FEED_ACTIONS = "src/app/(main)/feed/actions.ts";
const POSTS_LIB = "src/lib/posts.ts";
const POST_CARD = "src/components/posts/post-card.tsx";
const COMMENTS = "src/components/posts/comments-section.tsx";
const LETTER_PAGE = "src/app/(main)/letters/[id]/(read)/page.tsx";
const READER_PARTS = "src/components/catchups/edition/reader-parts.tsx";
const READER = "src/components/catchups/edition/reader.tsx";
const LINK_PREVIEW = "src/lib/link-preview.ts";
const DEMO = "src/lib/demo.ts";

/* ── one query per page, not one per post ────────────────────────────── */

test("withLinkCards reads LinkPreview in ONE query, before it builds the per-row result", () => {
  const body = balancedBody(decomment(read(POSTS_LIB)), "export async function withLinkCards");
  assert.ok(body, "withLinkCards not found in posts.ts; the test is reading the wrong path");
  assert.ok(body.length > 300, `withLinkCards came back as ${body.length} characters; the slice is truncated`);

  const finds = body.match(/\.findMany\s*\(/g) ?? [];
  assert.equal(
    finds.length,
    1,
    "withLinkCards should read LinkPreview in exactly one findMany, for the whole page of rows " +
      `at once; found ${finds.length}.`,
  );

  const queryAt = body.indexOf("linkPreview.findMany");
  const mapAt = body.indexOf("return rows.map(");
  assert.ok(
    queryAt >= 0 && mapAt > queryAt,
    "the findMany must run BEFORE the per-row result is built, or a future edit could move it " +
      "inside that map and turn one query into one per post.",
  );
});

test("loadPosts and loadSavedPosts reuse withLinkCards rather than a second fetcher", () => {
  const source = decomment(read(FEED_ACTIONS));
  for (const decl of ["export async function loadPosts", "export async function loadSavedPosts"]) {
    const body = balancedBody(source, decl);
    assert.ok(body, `${decl} not found in ${FEED_ACTIONS}`);
    assert.match(body, /withLinkCards\(/, `${decl} should call withLinkCards, not fetch previews itself`);
    assert.ok(
      !body.includes("linkPreview"),
      `${decl} reads LinkPreview directly instead of going through withLinkCards, which is the ` +
        "one place the query is batched to one per page.",
    );
  }
});

/* ── save schedules a resolve, the same trigger a Catch-up answer uses ── */

test("createPost, editPost and publishDraft each schedule a resolve on save", () => {
  const source = decomment(read(FEED_ACTIONS));
  for (const decl of [
    "export async function createPost",
    "export async function editPost",
    "export async function publishDraft",
  ]) {
    const body = balancedBody(source, decl);
    assert.ok(body, `${decl} not found in ${FEED_ACTIONS}`);
    assert.match(
      body,
      /scheduleLinkPreviews\(/,
      `${decl} should schedule a link-preview resolve on save, the trigger a Catch-up answer's ` +
        "own save uses (catchups/actions.ts).",
    );
    // Reuse, not a second fetcher: nothing here should call the network/DB
    // half directly, only the deferred, demo-guarded entry point.
    assert.ok(
      !body.includes("ensureLinkPreviews("),
      `${decl} calls ensureLinkPreviews directly, bypassing the after()-deferred, demo-guarded ` +
        "scheduleLinkPreviews wrapper.",
    );
  }
});

/* ── editing a post must never see the stripped body ─────────────────── */

test("PostCard hands the edit dialog the raw content, never the display-stripped one", () => {
  const src = decomment(read(POST_CARD));
  assert.ok(
    src.includes("initialContent={content}"),
    "EditPostDialog must open on `content` (the raw, unstripped post) -- opening it on the " +
      "display-stripped body would save that shorter text back over the real post and drop the " +
      "link's text for good.",
  );
  assert.ok(
    !src.includes("initialContent={displayBody}"),
    "the edit dialog must not be handed the stripped display body.",
  );
});

/* ── a comment is clickable-only: no card, no preview query ──────────── */

test("comments get clickable links and nothing else: no LinkCard, no preview fetch", () => {
  const src = decomment(read(COMMENTS));
  assert.match(
    src,
    /renderRichText\(\s*comment\.content\s*,\s*\{\s*linkRanges\s*\}\s*\)/,
    "a pasted link in a comment should render as a plain clickable link, same as a post's.",
  );
  assert.ok(
    !src.includes("LinkCard") && !src.includes("linkPreview") && !src.includes("withLinkCards"),
    "a comment must never grow a LinkCard or fetch a preview -- spec is clickable-only.",
  );
});

/* ── posts and the letter reading page draw the card, cut from the text ─ */

test("post-card and the letter page render LinkCard with the link cut from the paragraph", () => {
  const post = decomment(read(POST_CARD));
  assert.match(post, /renderRichText\(\s*displayBody\s*,\s*\{\s*linkRanges\s*\}\s*\)/);
  assert.match(post, /stripReplacedLinks\(/);
  assert.match(post, /<LinkCard\b/);
  assert.match(post, /from ["']@\/components\/common\/link-card["']/);

  const letter = decomment(read(LETTER_PAGE));
  assert.match(letter, /renderRichText\(\s*displayBody\s*,\s*\{\s*linkRanges\s*\}\s*\)/);
  assert.match(letter, /stripReplacedLinks\(/);
  assert.match(letter, /<LinkCard\b/);
  assert.match(letter, /from ["']@\/components\/common\/link-card["']/);
});

/* ── one LinkCard, shared, not a second copy inside catchups ─────────── */

test("LinkCard is defined once, and the Catch-up reader imports that one definition", () => {
  const partsSource = decomment(read(READER_PARTS));
  assert.ok(
    !/export function LinkCard\(/.test(partsSource) && !/^function LinkCard\(/m.test(partsSource),
    "LinkCard should no longer be DEFINED in reader-parts.tsx -- it moved to " +
      "@/components/common/link-card so a post and a letter can draw the same card.",
  );

  const readerSource = decomment(read(READER));
  assert.match(
    readerSource,
    /import\s*\{\s*LinkCard\s*\}\s*from\s*["']@\/components\/common\/link-card["']/,
    "reader.tsx should import LinkCard from the shared component.",
  );
});

/* ── the demo never resolves a link, for a post exactly as for a Catch-up ── */

test("the demo guard the feature relies on is still in place", () => {
  const linkPreview = decomment(read(LINK_PREVIEW));
  assert.match(
    balancedBody(linkPreview, "export async function ensureLinkPreviews") ?? "",
    /if\s*\(\s*IS_DEMO\b/,
    "ensureLinkPreviews must still refuse to run on the demo -- this is the ONE guard both " +
      "Catch-ups and posts rely on, since scheduleLinkPreviews is shared rather than duplicated.",
  );
  assert.ok(
    !decomment(read(DEMO)).includes('"LinkPreview"'),
    "LinkPreview must stay OFF the demo's write allowlist -- the feature must never need it " +
      "there, since ensureLinkPreviews already refuses to run at all.",
  );
});
