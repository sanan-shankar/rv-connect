import assert from "node:assert/strict";
import test from "node:test";
import { execSync } from "node:child_process";
import { ROOT, read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A notification leads somewhere.
 *
 *  Two halves of the same promise, both broken (bug-report-2 C-052, C-054):
 *
 *   - `/feed#<postId>` is what every like and comment notification on a plain
 *     post links to, and nothing read the fragment. PostFeed fetches after
 *     mount, so the anchor does not exist when the router commits.
 *   - Deleting or hiding a letter left the bell rows pointing at
 *     `/letters/<id>`, which then answers 404 -- for up to a month, since
 *     notifications are kept until the 30-day sweep. Catch-ups had cleaned
 *     up after itself since it was written; the feed never did.
 *
 *  The scroll's behaviour is pinned in e2e/deeplink.spec.ts (both navigation
 *  shapes, geometry with expect.poll). This file is the cheap half that runs
 *  on every `npm run check` and in CI: the mechanisms cannot be deleted
 *  quietly, and no new way to take a post down can forget the bell.
 * ------------------------------------------------------------------ */

/* ---------------------------------------------- C-052: the fragment scroll */

test("the feed reads the fragment, on a fresh mount AND on a hash change", () => {
  const src = decomment(read("src/components/posts/post-feed.tsx"));
  assert.match(src, /window\.location\.hash/, "PostFeed no longer reads the URL fragment");
  assert.match(src, /scrollIntoView\s*\(/, "PostFeed no longer scrolls to the deep-linked post");
  /* The half that is easy to lose: tapping the bell while already on the feed
     changes only the fragment, which is a same-document navigation -- nothing
     remounts and no effect on the post list re-runs. The first version of
     this fix handled only the mount and did nothing in the commonest case. */
  assert.match(
    src,
    /addEventListener\(\s*["']hashchange["']/,
    "PostFeed no longer listens for a same-document fragment change, so a notification " +
      "tapped while already on the feed scrolls nowhere"
  );
});

test("the ring the deep link draws is still defined", () => {
  const feed = decomment(read("src/components/posts/post-feed.tsx"));
  const css = read("src/app/globals.css");
  assert.match(feed, /deeplink-flash/, "PostFeed no longer marks the post it scrolled to");
  assert.match(css, /\.deeplink-flash/, "globals.css has no .deeplink-flash rule, so the mark is invisible");
  // Design rule: only transform and opacity animate. The ring is drawn on a
  // pseudo-element for exactly that reason.
  const rule = css.slice(css.indexOf("@keyframes deeplink-fade"), css.indexOf(".deeplink-flash::after") + 400);
  assert.ok(/opacity/.test(rule), "the deep-link ring no longer animates opacity");
  assert.ok(
    !/animation[^;]*box-shadow|transition:[^;]*box-shadow/.test(rule),
    "the deep-link ring animates box-shadow, which repaints the card every frame"
  );
});

test("the module comment describes what the feed actually does", () => {
  /* This comment claimed "PostFeed handles the scrolling half" for months
     before any code did, which is why the gap survived a rewrite of the file
     right beside it. Whitespace-flattened, because the sentence wraps. */
  const links = read("src/lib/notification-links.ts")
    .replace(/\n\s*\*/g, " ")
    .replace(/\s+/g, " ");
  assert.match(
    links,
    /reads the fragment once its posts have rendered .* again on `hashchange`/,
    "notification-links.ts no longer says what PostFeed actually does with the fragment"
  );
});

/* --------------------------------------- C-054: bell rows for a dead post */

test("every way a post stops being readable clears the bell rows that named it", () => {
  /* Derived, so a fourth takedown path joins the sweep on the day it is
     written. A post becomes unreadable two ways: the row goes, or isHidden
     goes true. Either way the link in somebody's bell stops working. */
  const files = execSync(`git grep -l 'isHidden: true\\|post.delete(' -- 'src/**/*.ts' || true`, {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .filter((f) => !f.endsWith(".test.mjs"));

  const count = (src, re) => (src.match(re) ?? []).length;
  let sites = 0;
  for (const file of files) {
    const src = decomment(read(file));
    /* Posts only: the Collection hides photographs and the moderation queue
       hides comments, neither of which carries a post's link. COUNTED rather
       than merely detected -- a file with two takedown paths and one cleanup
       passed a per-file check, which is exactly the half-fix this is here to
       refuse. */
    const takedowns =
      count(src, /(?:prisma|tx)\.post\.update\(\{[\s\S]{0,200}?isHidden:\s*true/g) +
      count(src, /(?:tx|prisma)\.post\.delete\s*\(/g);
    if (takedowns === 0) continue;
    sites += takedowns;
    assert.ok(
      count(src, /clearPostNotifications\s*\(/g) >= takedowns,
      `${file} has ${takedowns} way(s) to take a post down and fewer cleanups: one of them ` +
        `leaves bell rows pointing at a post nobody can open (C-054)`
    );
  }
  assert.ok(sites >= 3, `only found ${sites} post-takedown sites; the sweep has stopped seeing them`);
});

test("a hide keeps the author's own notifications, a delete keeps nobody's", () => {
  // A hidden post still opens for its author and for an admin -- that is where
  // the moderation notice is read -- so their links are not broken and their
  // rows must survive. A deleted post opens for nobody.
  const helper = decomment(read("src/lib/post-notifications.ts"));
  assert.match(helper, /keepFor/, "clearPostNotifications can no longer spare anybody");
  assert.match(
    helper,
    /userId:\s*\{\s*not:\s*opts\.keepFor\s*\}/,
    "the spared member is no longer excluded by id; a hide would take the author's own rows too"
  );

  const feed = decomment(read("src/app/(main)/feed/actions.ts"));
  const hide = feed.slice(feed.indexOf("export async function adminRemovePost"));
  assert.match(
    hide.slice(0, hide.indexOf("\nexport ")),
    /clearPostNotifications\([\s\S]{0,120}keepFor/,
    "adminRemovePost clears the author's own notifications about their hidden post"
  );
});

/* ------------------------------------- M33: one bell row per person per tap */

test("the feed's four notification writes go through the two helpers", () => {
  /* M33's one-per-unread rule was written twice -- toggleLike and
     toggleCommentLike, twelve near-identical lines each -- and kept in step by
     a comment saying "same rule as toggleLike". jscpd never saw it: the
     variable names and the message differ. The rule now lives once, in
     post-notifications.ts.

     What is pinned is WHICH rule each write gets, not just that a helper
     exists. Converting a like to the plain helper would silently restore the
     bell-flooding M33 closed, and nothing else in the suite would notice. */
  const feed = decomment(read("src/app/(main)/feed/actions.ts"));

  assert.ok(
    !/prisma\.notification\.(create|findFirst)\s*\(/.test(feed),
    "a notification is written inline in feed/actions.ts again, so the M33 rule has a second home"
  );

  const count = (re) => (feed.match(re) ?? []).length;
  assert.equal(
    count(/notifyMemberOnceUnread\(/g),
    2,
    "the two like paths (a post, a comment) no longer both carry the one-per-unread rule"
  );
  assert.equal(
    count(/notifyMember\(/g),
    2,
    "the two comment paths (the post's author, the replied-to author) have changed in number"
  );
});

test("M33's dedupe matches the whole unread row, not part of it", () => {
  const helper = decomment(read("src/lib/post-notifications.ts"));
  const from = helper.indexOf("export async function notifyMemberOnceUnread");
  assert.ok(from > 0, "notifyMemberOnceUnread is gone");
  const body = helper.slice(from, helper.indexOf("\n}", from));

  /* `read: false` is the whole rule: without it a member who has already read
     "X liked your post" would never be told about the next like, which is the
     opposite failure to the one M33 closed. */
  assert.match(body, /read: false/, "the dedupe no longer restricts itself to UNREAD rows");
  /* And it must compare the row it is about to write, not a subset: matching
     on userId and type alone would swallow a different person's like. */
  assert.match(body, /where: \{ \.\.\.row, read: false \}/, "the dedupe matches on part of the row");
  assert.match(body, /if \(alreadyTold\) return;/, "the dedupe no longer stops the second write");
});
