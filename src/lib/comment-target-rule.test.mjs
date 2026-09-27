/* ------------------------------------------------------------------ *
 *  ONE `Comment` TABLE, TWO OWNERS (build phase 9, spec 3.7).
 *
 *  Run: node --test src/lib/comment-target-rule.test.mjs
 *
 *  A comment hangs off a feed post OR off one answer in a Catch-up
 *  Edition, and exactly one of `postId` and `entryId` is set. Widening the
 *  table rather than twinning it is what let CommentLike, the
 *  soft-delete-that-keeps-replies rule, the admin hide, the SetNull purge
 *  behaviour and the 700-line reading surface serve both -- and every one
 *  of those is a rule somebody has already been bitten by once.
 *
 *  What this file pins is the price of that decision: the invariants that
 *  a second, independent target column can quietly break. Prisma cannot
 *  say "exactly one of these", so the CHECK lives in a hand-written
 *  migration and nothing but this test connects the two.
 * ------------------------------------------------------------------ */

import { test } from "node:test";
import assert from "node:assert/strict";

import { read, decomment } from "./test-kit.mjs";

const SCHEMA = "prisma/schema.prisma";
const MIGRATION = "prisma/migrations-manual/2026-09-10-comments-on-answers.sql";
const THREAD = "src/lib/comment-thread.ts";
const CATCHUP_ACTIONS = "src/app/(main)/catchups/actions.ts";
const CATCHUP_NOTIFICATIONS = "src/lib/catchup-notifications.ts";
const FEED_ACTIONS = "src/app/(main)/feed/actions.ts";
const EDITION_VIEW = "src/lib/catchups-edition-view.ts";

test("both target columns are nullable in the schema", () => {
  const src = read(SCHEMA);
  const model = src.slice(src.indexOf("model Comment {"), src.indexOf("model Like {"));
  assert.match(model, /^\s*postId\s+String\?/m, "Comment.postId must be nullable");
  assert.match(model, /^\s*entryId\s+String\?/m, "Comment.entryId must be nullable");
});

test("the CHECK that exactly one target is set exists in the migration", () => {
  /* THE WHOLE POINT OF THIS TEST. Prisma has no way to express it, so if this
     statement is ever dropped -- or the migration renamed without the schema's
     pointer following -- a comment with two targets, or with none, becomes
     writable. Both counts on both features then drift, and nothing reports it:
     a two-target row is counted twice and a no-target row is invisible. */
  const sql = read(MIGRATION);
  assert.match(sql, /CONSTRAINT "Comment_one_target"/);
  assert.match(sql, /CHECK \(\("postId" IS NULL\) <> \("entryId" IS NULL\)\)/);
  assert.match(sql, /VALIDATE CONSTRAINT "Comment_one_target"/, "NOT VALID without a VALIDATE leaves the constraint unenforced for existing rows");
  assert.match(sql, /--demo|\.env\.demo/, "production and the demo are separate Supabase projects; the file must say to run it twice");
});

test("the schema points at the file that carries the constraint", () => {
  // A rename that forgets this pointer is how the CHECK becomes folklore.
  const src = read(SCHEMA);
  assert.ok(
    src.includes("2026-09-10-comments-on-answers.sql"),
    "Comment's own comment must name the migration holding Comment_one_target"
  );
});

test("a thread query never leaves the other target open", () => {
  /* `targetWhere` writes BOTH columns -- { postId, entryId: null } or the
     mirror -- on every read and every write. Naming only the column you want
     looks equivalent and is not: `findFirst({ where: { postId } })` for the
     double-submit guard would happily match across the two owners once a
     third target is added, and the create would write a row the CHECK then
     rejects at runtime rather than at review. */
  const src = decomment(read(THREAD));
  const fn = src.slice(src.indexOf("function targetWhere"), src.indexOf("function sameTarget"));
  assert.match(fn, /postId: target\.postId, entryId: null/);
  assert.match(fn, /entryId: target\.entryId, postId: null/);
});

test("the feed's heart declines a comment that has no post", () => {
  /* `Comment.postId` became nullable in build phase 9, which made this branch
     reachable in TypeScript for the first time. It is not reachable in fact --
     `canViewPostOfComment` answers not-found when there is no post -- but the
     guard is what keeps that true if the gate above it is ever changed. */
  const src = decomment(read(FEED_ACTIONS));
  assert.match(src, /comment\?\.authorId && comment\.postId &&/);
});

test("a Catch-up comment is gated on a PUBLISHED Edition, in one place", () => {
  /* The gate is the heart's exactly (architecture 8 puts comment and heart in
     one cell). Three copies of it is how one of the three actions ends up
     admitting a `collecting` Edition, where every answer is hidden from
     everyone including the Keeper. */
  const src = decomment(read(CATCHUP_ACTIONS));
  const gate = src.indexOf("async function loadCommentableEntry");
  assert.ok(gate > 0, "loadCommentableEntry is gone");
  const body = src.slice(gate, gate + 1200);
  assert.match(body, /status !== "published"/);

  for (const action of ["loadEntryComments", "createEntryComment", "toggleEntryCommentLike"]) {
    const at = src.indexOf(`export async function ${action}`);
    assert.ok(at > 0, `${action} is gone`);
    const fn = src.slice(at, src.indexOf("\n}", at));
    assert.match(fn, /loadCommentableEntry\(/, `${action} must go through the shared gate`);
  }
});

test("the reader's comment count excludes deleted and hidden rows", () => {
  /* A soft-deleted comment still has a row -- that is what keeps its replies
     anchored -- and so does one hidden by a moderator or written by a blocked
     member. A bare `_count.comments` therefore promises a thread that then
     renders empty, which is audit C-003 on the feed, one feature later. */
  const src = decomment(read(EDITION_VIEW));
  assert.match(src, /comments: \{ where: VISIBLE_COMMENT \}/);
});

test("leaving a Catch-up clears comment notifications too", () => {
  /* `catchup_comment` links at one ANSWER -- `/catchups/edition/<id>#entry-<id>`
     -- so the exact-match `link: { in: editionLinks }` this used to carry
     walked straight past every one of them and left a departed member with
     bells aimed at a door that no longer opens. Prefix, and the type listed. */
  const src = decomment(read(CATCHUP_NOTIFICATIONS));
  const at = src.indexOf("async function clearCatchupNotifications");
  assert.ok(at > 0, "clearCatchupNotifications is gone");
  const fn = src.slice(at, src.indexOf("\n}", at));
  assert.match(fn, /editionLinks\.map\(\(link\) => \(\{ link: \{ startsWith: link \} \}\)\)/);
  assert.ok(
    !/link: \{ in: editionLinks \}/.test(fn),
    "an exact match cannot see an anchored link"
  );

  const types = src.slice(
    src.indexOf("const CATCHUP_NOTIFICATION_TYPES"),
    src.indexOf("] as const", src.indexOf("const CATCHUP_NOTIFICATION_TYPES"))
  );
  assert.match(types, /"catchup_comment"/);
});

test("a comment's bell coalesces on the exact sentence, never a prefix", () => {
  /* Notification has no column for who sent it, so the sentence is the key.
     A PREFIX ("Ravi ") also matches an unread "Ravi Kumar commented ...", and
     one member's bell is swallowed by another's. */
  const src = decomment(read("src/lib/catchups-notify.ts"));
  const at = src.indexOf("export const notifyComment");
  assert.ok(at > 0, "notifyComment is gone");
  const fn = src.slice(at, src.indexOf("\n};", at));
  assert.match(fn, /type: "catchup_comment", link, message, read: false/);
  assert.doesNotMatch(fn, /startsWith/, "a prefix match merges different people's bells");
  assert.ok(
    fn.indexOf("const message") < fn.indexOf("findFirst"),
    "the sentence must be built before it is used as the key"
  );
});

test("the bell can draw the new type", () => {
  // A type with no row falls back to a generic bell with the label
  // "Notification", which is silent breakage rather than a crash.
  const src = read("src/components/layout/notification-bell.tsx");
  assert.match(src, /catchup_comment: \{ icon:/);
});

test("the admin content list can open a comment on an answer", () => {
  // The href was an unconditional `/feed#${c.postId}`, which is `/feed#null`
  // for a comment under a Catch-up answer.
  const src = decomment(read("src/lib/admin-content-query.ts"));
  assert.match(src, /c\.entry\s*\n?\s*\?\s*`\/catchups\/edition\/\$\{c\.entry\.editionId\}#entry-\$\{c\.entryId\}`/);
});

test("a member's data export carries what they wrote in a Catch-up", () => {
  // Selecting only postId gave a member a file that silently omitted every
  // comment they had written under an answer.
  const src = decomment(read("src/app/api/account/export/route.ts"));
  const at = src.indexOf('"comments"');
  assert.ok(at > 0, "the comments section of the export is gone");
  assert.match(src.slice(at, at + 400), /entryId: true/);
});
