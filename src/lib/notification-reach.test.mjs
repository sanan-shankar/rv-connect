import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, filesContaining } from "./test-kit.mjs";

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

/* ---- what one file owes the bells, and what it pays ----

   A post stops opening for other members five ways, and this sweep used to
   believe in two (bug audit 3, L9-08):

     - the row goes                     post.delete / deleteMany
     - isHidden goes true               an admin's remove or hide
     - the author's account is erased   user.delete / deleteMany: the posts go
                                        by cascade, and no post write runs
     - the author is blocked            AUTHOR_IN_GOOD_STANDING
     - the author asks to be deleted    the sixty days (L10-02)

   The first three are for good, and each owes the bells that pointed at the
   post: `clearPostNotifications` for a post's own delete or hide, the purge's
   `clearBellsPointingAtThisMember` for an erasure (T7a-04 got through because
   this sweep could not see one), or, for an account whose posts move to
   another first, nothing, since a merge re-homes them and their links still
   open. The last two are undone by an unblock or by the member signing back
   in, after which the post and its links answer again, so they clear nothing
   on purpose; the thirty-day sweep, or the erasure, takes those bells. */

/** The text inside the parentheses of every call matching `re`. */
function callArgs(src, re) {
  return [...src.matchAll(re)].map((m) => {
    const open = m.index + m[0].length - 1;
    for (let i = open, depth = 0; i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")" && --depth === 0) return src.slice(open + 1, i);
    }
    return "";
  });
}

/** The `data: { ... }` a write's arguments carry, or "" if none. */
function dataOf(args) {
  const at = args.search(/\bdata\s*:\s*\{/);
  if (at < 0) return "";
  const open = args.indexOf("{", at);
  for (let i = open, depth = 0; i < args.length; i++) {
    if (args[i] === "{") depth++;
    else if (args[i] === "}" && --depth === 0) return args.slice(open, i + 1);
  }
  return "";
}

/** One file's takedowns and cleanups, counted on its decommented source.
 *  COUNTED rather than detected: a file with two takedown paths and one
 *  cleanup passed a per-file check, the half-fix this exists to refuse. */
function bellLedger(src) {
  const count = (re) => (src.match(re) ?? []).length;
  const postWrites = callArgs(src, /\b\w+\.post\.(?:update|updateMany)\s*\(/g).map(dataOf);
  return {
    takedowns:
      count(/\b\w+\.post\.(?:delete|deleteMany)\s*\(/g) +
      postWrites.filter((data) => /\bisHidden:\s*true\b/.test(data)).length,
    postClears: count(/(?<!function\s+)\bclearPostNotifications\s*\(/g),
    erasures: count(/\b\w+\.user\.(?:delete|deleteMany)\s*\(/g),
    erasuresPaid:
      count(/(?<!function\s+)\bclearBellsPointingAtThisMember\s*\(/g) +
      callArgs(src, /\b\w+\.post\.updateMany\s*\(/g).filter((args) => /\bauthorId:/.test(dataOf(args))).length,
    /* An unscoped delete of every bell (the demo's nightly reseed) leaves
       nothing pointing anywhere. */
    clearsEveryBell: /\b\w+\.notification\.deleteMany\(\s*\{\s*\}\s*\)/.test(src),
  };
}

test("every way a post stops being readable clears the bell rows that named it", () => {
  /* Derived, so a new takedown path joins the sweep on the day it is
     written. Read off the disk, .ts and .tsx alike: this was
     `git grep ... || true` over .ts alone, so a new file was invisible until
     staged and a git that could not run read as no takedowns at all (L9-07).
     Posts only: the Collection hides photographs and the moderation queue
     hides comments, neither of which carries a post's link. */
  let takedowns = 0;
  let erasures = 0;
  for (const file of filesContaining(/isHidden:\s*true|\.post\.delete|\.user\.delete/)) {
    const ledger = bellLedger(decomment(read(file)));
    if (ledger.clearsEveryBell) continue;
    takedowns += ledger.takedowns;
    erasures += ledger.erasures;
    assert.ok(
      ledger.postClears >= ledger.takedowns,
      `${file} has ${ledger.takedowns} way(s) to take a post down and ${ledger.postClears} cleanup(s): one of them ` +
        `leaves bell rows pointing at a post nobody can open (C-054)`
    );
    assert.ok(
      ledger.erasuresPaid >= ledger.erasures,
      `${file} erases ${ledger.erasures} account(s) and clears or re-homes for ${ledger.erasuresPaid}: an erased ` +
        `member's posts go by cascade and leave every bell that pointed at them (T7a-04)`
    );
  }
  assert.ok(takedowns >= 3, `only found ${takedowns} post-takedown sites; the sweep has stopped seeing them`);
  assert.ok(erasures >= 2, `only found ${erasures} account erasures (the purge, the merge); the sweep has stopped seeing them`);
});

test("the sweep sees the two shapes it used to miss", () => {
  /* An erasure with no bell clear is a debt: the purge as it stood before
     T7a-04, replayed by taking its clear back out. */
  const purge = decomment(read("src/lib/account-purge.ts"));
  const unpaid = purge.replace(/await clearBellsPointingAtThisMember\([^)]*\);/, "");
  assert.notEqual(unpaid, purge, "the purge's bell clear has moved; this replay no longer removes it");
  assert.ok(bellLedger(purge).erasuresPaid >= bellLedger(purge).erasures, "today's purge owes the bells");
  assert.ok(bellLedger(unpaid).erasuresPaid < bellLedger(unpaid).erasures, "a purge that clears no bells passes the sweep");

  /* And a hide written as updateMany, the shape T7a-17's fix asks
     adminHidePost to take, is still a hide. */
  const reports = decomment(read("src/app/(main)/admin/reports/actions.ts"));
  const asMany = reports.replace("prisma.post.update(", "prisma.post.updateMany(");
  assert.notEqual(asMany, reports, "adminHidePost's write has moved; this replay no longer converts it");
  assert.equal(bellLedger(asMany).takedowns, bellLedger(reports).takedowns, "an updateMany hide drops out of the sweep");
  const uncleared = asMany.replace(/await clearPostNotifications\([^)]*\);/, "");
  assert.ok(bellLedger(uncleared).postClears < bellLedger(uncleared).takedowns, "an updateMany hide with no cleanup passes");
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
