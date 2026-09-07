import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { ROOT, SKIP_DIRS, read, decomment, walk } from "./test-kit.mjs";
import { isPostTwin } from "./double-submit.ts";

/* ------------------------------------------------------------------ *
 *  The feed's write paths, and the four ways they used to lie.
 *
 *  Two of these are properties of a pure function and are tested as
 *  such. The other three are properties of a Prisma query, which cannot
 *  be exercised without a database, so they are pinned against the
 *  SOURCE -- and every source assertion here matches a CALL or a whole
 *  fragment, never a bare name, because a file that merely imports a
 *  symbol satisfies a name search and every assertion after it passes
 *  against nothing.
 * ------------------------------------------------------------------ */

const FEED = decomment(read("src/app/(main)/feed/actions.ts"));

/* ---- C-009: a twin is the same POST, not the same words ---------- */

const empty = { title: null, images: null, pollOptions: [] };

test("C-009: identical content with no attachments is a twin", () => {
  assert.equal(isPostTwin(empty, { title: null, images: null, pollOptions: [] }), true);
});

test("C-009: same caption, different photographs is NOT a twin", () => {
  assert.equal(
    isPostTwin(
      { title: null, images: '["a.webp"]', pollOptions: [] },
      { title: null, images: '["b.webp"]', pollOptions: [] }
    ),
    false
  );
});

test("C-009: a first photograph post is not a twin of the caption-only one", () => {
  assert.equal(
    isPostTwin(empty, { title: null, images: '["a.webp"]', pollOptions: [] }),
    false
  );
});

test("C-009: same body, different letter title is NOT a twin", () => {
  assert.equal(
    isPostTwin(
      { title: "Monsoon", images: null, pollOptions: [] },
      { title: "Summer", images: null, pollOptions: [] }
    ),
    false
  );
});

test("C-009: same caption, different poll options is NOT a twin", () => {
  assert.equal(
    isPostTwin(
      { title: null, images: null, pollOptions: [{ text: "Yes", position: 0 }] },
      { title: null, images: null, pollOptions: ["No"] }
    ),
    false
  );
});

test("C-009: poll options are compared in stored position order, not row order", () => {
  const shuffled = [
    { text: "Second", position: 1 },
    { text: "First", position: 0 },
  ];
  assert.equal(
    isPostTwin({ title: null, images: null, pollOptions: shuffled }, {
      title: null,
      images: null,
      pollOptions: ["First", "Second"],
    }),
    true
  );
});

test("C-009: createPost settles its shortlist with isPostTwin, not with findFirst alone", () => {
  assert.match(FEED, /isPostTwin\(/, "the predicate is called, not merely imported");
  assert.doesNotMatch(
    FEED.slice(FEED.indexOf("const candidates"), FEED.indexOf("const post = await prisma.post.create")),
    /select: \{\s*id: true,?\s*\}/,
    "the candidate select must carry title/images/pollOptions, not id alone"
  );
});

/* ---- C-015: both searches go through escapeLike ------------------
   What escapeLike itself does with a long or wildcard term is pinned in
   db-text.test.mjs, next to the function. These two are about the feed
   and the directory calling it at all. */

test("C-015: the feed search goes through escapeLike", () => {
  assert.match(FEED, /escapeLike\(opts\.search\)/);
});

test("C-015: the directory search goes through escapeLike", () => {
  assert.match(decomment(read("src/app/(main)/directory/where.ts")), /escapeLike\(filters\.q\)/);
});

/* ---- C-003: the card's count and the thread ask one question ----- */

test("C-003: no _count.comments filter is hand-rolled", () => {
  const files = [
    "src/app/(main)/feed/actions.ts",
    "src/app/(main)/letters/(index)/page.tsx",
    "src/app/(main)/letters/[id]/(read)/page.tsx",
  ];
  let seen = 0;
  for (const f of files) {
    const src = decomment(read(f));
    for (const m of src.matchAll(/comments:\s*\{\s*where:\s*([^}]*?)\s*\}/g)) {
      seen++;
      assert.equal(
        m[1].trim(),
        "VISIBLE_COMMENT",
        `${f}: a comment count filtered by "${m[1].trim()}" instead of the shared fragment`
      );
    }
  }
  /* Counted, not detected: a sweep that merely finds no BAD site also passes
     against a file where the sites have been renamed away.

     Three, not four, since 2026-08-26. feed/actions.ts had this line twice --
     once in loadPosts' include and once in loadSavedPosts' -- and the two
     include-builders became one (`postInclude`), so one site went away rather
     than one filter. The remaining three are that builder, the letters index
     and a letter. Lowering this number is the dangerous edit in this file: do
     it only with the disappeared site named, as here. */
  assert.equal(seen, 3, `expected 3 comment-count filters, found ${seen}`);
});

test("C-003: VISIBLE_COMMENT is the fragment the thread query uses too", () => {
  const posts = decomment(read("src/lib/posts.ts"));
  assert.match(posts, /export const VISIBLE_COMMENT = \{[\s\S]*?AUTHOR_IN_GOOD_STANDING/);
  assert.match(FEED, /where:\s*\{[\s\S]{0,200}\.\.\.VISIBLE_COMMENT/);
});

/* ---- C-016: the reply reaches the person it named ---------------- */

test("C-016: createComment notifies the comment that was replied TO", () => {
  const start = FEED.indexOf("export async function createComment");
  assert.ok(start > 0);
  const body = FEED.slice(start, FEED.indexOf("export async function", start + 10));
  assert.match(body, /const repliedToId = parentId;/, "the pre-reparenting target is captured");
  assert.match(
    body,
    /findUnique\(\{\s*where: \{ id: repliedToId \}/,
    "the reply notification looks up repliedToId, not the promoted root"
  );
});

test("C-016: the composer targets the tapped reply", () => {
  const src = decomment(read("src/components/posts/comments-section.tsx"));
  assert.match(src, /id: reply\.id,\s*\n\s*name: reply\.author!\.name,/);
});

/* ---- C-017: a stale audience is refused, never widened ----------- */

test("C-017: editPost refuses a city the author no longer lists", () => {
  const start = FEED.indexOf("const cityScopeRaw = formData.get(\"cityScope\")");
  assert.ok(start > 0, "the cityScope branch moved");
  const branch = FEED.slice(start, start + 1200);
  assert.match(branch, /if \(!ownPlace\) \{\s*\n\s*return \{ error:/, "a miss returns an error");
  assert.doesNotMatch(
    branch,
    /cityScope: ownPlace\?\.city \?\? null/,
    "a miss must not fold to null, which is the stored value for Everyone"
  );
});

test("one query asks \"does this member list this city\"", () => {
  /* The same `userPlace.findFirst` was written three times -- createPost,
     editPost, and canViewCityScope on the read side -- with one `where` and
     three different `select`s, and editPost's own comment maintained the
     sameness in prose. `ownCity` in city-scope.ts is the query now; what
     differs between the callers is what a MISS means, which is why the C-017
     refusal above is pinned separately.

     A sweep rather than three named files: the fourth copy is the one nobody
     counts, and it is the copy that would ask the question a little
     differently (a case-SENSITIVE match, say) on a write that decides who
     reads a letter. */
  const files = walk(resolve(ROOT, "src"), { skip: [...SKIP_DIRS, "lab"] });
  assert.ok(files.length > 300, `swept only ${files.length} files; the sweep has drifted`);
  const offenders = files
    .filter((f) => relative(ROOT, f) !== "src/lib/city-scope.ts")
    .filter((f) => /prisma\.userPlace\.findFirst\s*\(/.test(decomment(readFileSync(f, "utf8"))))
    .map((f) => relative(ROOT, f));
  assert.deepEqual(
    offenders,
    [],
    `the own-city lookup is hand-rolled again instead of calling ownCity: ${offenders.join(", ")}`
  );
});

test("a comment reaches the client through one serializer", () => {
  /* The ten fields of `CommentData` were built in three places: createComment's
     return, loadComments' rows, and loadComments' stand-in stubs for deleted
     parents. Audit 1 folded the POST payload for exactly this reason and its
     note says why -- "they had already begun to disagree in ways that looked
     deliberate but were not". The comment trio had not drifted yet; `isOwn`
     was spelled three ways and all three were right.

     Counted rather than named, because a FOURTH hand-built payload is the
     failure, and it would be somewhere this test could not think to look. Two
     serialisers, two date conversions. A third means somebody built one by
     hand again -- or added a serialiser on purpose, in which case this number
     is the conversation. */
  const dates = (FEED.match(/\.createdAt\.toISOString\(\)/g) ?? []).length;
  assert.equal(
    dates,
    2,
    `expected one date conversion per serialiser (post, comment) and found ${dates}: ` +
      "a row is being shaped for the client outside serializePost/serializeComment"
  );
  const calls = (FEED.match(/serializeComment\(/g) ?? []).length;
  assert.equal(calls, 4, `serializeComment is defined once and called three times; found ${calls} mentions`);
});

/* ---- C-018: shared bytes survive one row's deletion -------------- */

test("C-018: deletePostWithImages queues only urls no other row names", () => {
  const start = FEED.indexOf("async function deletePostWithImages");
  assert.ok(start > 0);
  const body = FEED.slice(start, FEED.indexOf("\n}", start));
  assert.match(
    body,
    /id: \{ not: postId \}/,
    "the still-referenced check must exclude the row being deleted"
  );
  assert.match(body, /images: \{ contains: url \}/, "and match on each url");
  assert.match(
    body,
    /data: orphaned\.map/,
    "only the orphaned urls are queued for purge"
  );
  assert.match(
    body,
    /drainPendingImagePurges\(orphaned\)/,
    "and only the orphaned urls are drained"
  );
});

/* ---- Q15: a letter's three controls, and where they must NOT come from --
 *
 * The owner asked for Report, Edit and Delete on a letter's reading page
 * (campaign question 15, 2026-09-07: "15 b"). A letter is a Post row with
 * kind "letter", so all three actions above already accepted one and the
 * whole feature was a menu. The temptation the next session will feel is to
 * give the letters folder its own action file rather than trace which of the
 * feed's actions already does the job -- which is how the write path came to
 * enforce less than the read path the first time (see post-visibility.ts).
 * These two pin the shape, not the pixels.
 */

const LETTER_MENU = decomment(read("src/components/letters/letter-menu.tsx"));

test("Q15: the letter menu calls the feed's actions and declares none of its own", () => {
  assert.match(
    LETTER_MENU,
    /import \{[^}]*\badminRemovePost\b[^}]*\bdeletePost\b[^}]*\} from "@\/app\/\(main\)\/feed\/actions"/,
    "the letter menu no longer deletes and removes through the feed's own actions"
  );
  // Editing and reporting arrive through the shared dialogs, which own the
  // call. Matched as imports of the dialogs, since this file never names
  // editPost or reportPost itself.
  assert.match(LETTER_MENU, /@\/components\/posts\/edit-post-dialog/);
  assert.match(LETTER_MENU, /@\/components\/posts\/report-dialog/);

  // And nothing under components/letters may declare a server action: a
  // letter's writes are the feed's writes, gated in one place.
  const offenders = [];
  for (const f of walk(resolve(ROOT, "src/components/letters"), SKIP_DIRS)) {
    if (!/\.tsx?$/.test(f)) continue;
    if (/^\s*["']use server["']/m.test(readFileSync(f, "utf8"))) {
      offenders.push(relative(ROOT, f));
    }
  }
  assert.deepEqual(offenders, [], "a letters component declared its own server action");
});

test("Q15: a draft's notice sends its author to the desk, not back to the index", () => {
  /* This link read `href="/letters"` from the day the notice was written, so
     the one control on a draft's own page took its author to a list to find
     the draft again. The drafts strip on that list has always linked straight
     to the desk. */
  const page = decomment(read("src/app/(main)/letters/[id]/(read)/page.tsx"));
  const notice = page.slice(page.indexOf("{isDraft && ("), page.indexOf("Continue editing"));
  assert.match(
    notice,
    /href=\{`\/letters\/\$\{letter\.id\}\/edit`\}/,
    "the draft notice's link left the writing desk again"
  );
});
