import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "./test-kit.mjs";
import { mentionedUserIds } from "./rich-text.ts";

/* ------------------------------------------------------------------ *
 *  Mention notifications: "And, also, yeah, obviously, notify the person
 *  who is tagged." (owner)
 *
 *  Two halves, tested two different ways -- the same split the brief drew:
 *
 *   - `mentionedUserIds` (rich-text.ts) is pure, so it is called directly,
 *     the same way rich-text.test.mjs calls renderRichText itself.
 *   - who actually gets told touches Prisma (mention-notifications.ts) and
 *     is wired into four write paths in feed/actions.ts, so those are read
 *     as source and asserted on shape -- the way notification-links.test.mjs
 *     already pins the like/comment/reply rules next door, with no database
 *     and no `@/` alias (see test-kit.mjs).
 * ------------------------------------------------------------------ */

test("mentionedUserIds finds every id, deduplicated, in first-appearance order", () => {
  const ids = mentionedUserIds(
    "hi @[Alice](abc123) and @[Bob](xyz-9) -- @[Alice](abc123) again"
  );
  assert.deepEqual(
    ids,
    ["abc123", "xyz-9"],
    "a person mentioned twice should notify once, not twice"
  );
});

test("mentionedUserIds finds nothing in plain text or a malformed tag", () => {
  assert.deepEqual(mentionedUserIds("no mentions here"), []);
  assert.deepEqual(
    mentionedUserIds("@[Name](has space)"),
    [],
    "an id outside the strict charset is not a mention"
  );
  assert.deepEqual(mentionedUserIds("@[Name]()"), [], "an empty id is not a mention");
});

test("the mention id charset is defined exactly once in rich-text.ts", () => {
  // A second `A-Za-z0-9_-`-shaped pattern is a second regex that can drift
  // from this one the day either gets tightened -- the exact failure mode
  // the brief calls out.
  const src = decomment(read("src/lib/rich-text.ts"));
  const count = (src.match(/A-Za-z0-9_-/g) ?? []).length;
  assert.equal(
    count,
    1,
    "a second mention-id pattern has appeared in rich-text.ts -- share MENTION_PATTERN instead of reinventing it"
  );
});

test("MENTION_PATTERN is declared once and used by both the renderer and the extractor", () => {
  const src = decomment(read("src/lib/rich-text.ts"));
  assert.equal(
    (src.match(/MENTION_PATTERN/g) ?? []).length,
    3,
    "expected exactly 3: the declaration, renderRichText's .replace(), and mentionedUserIds' matchAll()"
  );
});

test("a mentioned member who is blocked is never notified", () => {
  const src = decomment(read("src/lib/mention-notifications.ts"));
  assert.match(
    src,
    /isBlocked:\s*false/,
    "mention notifications no longer exclude blocked members, the way AUTHOR_IN_GOOD_STANDING excludes them everywhere else"
  );
});

test("visibility is decided by the post's own audience rule, not re-derived", () => {
  // City scope, batch targeting, hidden and draft all live in one place
  // already (post-visibility-rule.ts) -- a mention re-deriving them by hand
  // is exactly the "sameness maintained by hand" the audit keeps closing.
  const src = decomment(read("src/lib/mention-notifications.ts"));
  assert.match(
    src,
    /decidePostVisibility\(/,
    "mention-notifications.ts no longer defers to decidePostVisibility"
  );
});

test("one save cannot page half the community", () => {
  const src = decomment(read("src/lib/mention-notifications.ts"));
  const m = src.match(/MAX_MENTION_NOTIFICATIONS\s*=\s*(\d+)/);
  assert.ok(m, "the mention notification cap constant is gone");
  const cap = Number(m[1]);
  assert.ok(cap > 0 && cap <= 100, `a cap of ${cap} is not a sensible ceiling`);
  assert.match(
    src,
    /\.slice\(0, MAX_MENTION_NOTIFICATIONS\)/,
    "the cap is declared but never actually applied to the candidate list"
  );
});

test("createPost, publishDraft, editPost and createComment all call the mention notifier", () => {
  const src = decomment(read("src/app/(main)/feed/actions.ts"));
  assert.equal(
    (src.match(/notifyMentioned\(/g) ?? []).length,
    4,
    "expected exactly 4 call sites: createPost, publishDraft, editPost, createComment"
  );
});

test("editPost notifies only newly-mentioned ids, diffed against the stored body", () => {
  const src = decomment(read("src/app/(main)/feed/actions.ts"));
  const from = src.indexOf("export async function editPost");
  const to = src.indexOf("\nexport async function toggleLike");
  assert.ok(from > 0 && to > from, "editPost's boundaries moved; update this test's slice");
  const body = src.slice(from, to);
  assert.match(
    body,
    /mentionedUserIds\(post\.content\)/,
    "editPost no longer reads the OLD body's mentions before diffing"
  );
  assert.match(
    body,
    /mentionedUserIds\(content\)\.filter/,
    "editPost no longer diffs the new body's mentions against the old ones"
  );
});

test("a comment's mention notice is skipped for whoever already got the comment/reply bell", () => {
  const src = decomment(read("src/app/(main)/feed/actions.ts"));
  const from = src.indexOf("export async function createComment");
  const to = src.indexOf("\nexport async function deleteComment");
  assert.ok(from > 0 && to > from, "createComment's boundaries moved; update this test's slice");
  const body = src.slice(from, to);
  assert.match(
    body,
    /alsoSkip/,
    "createComment no longer skips the people already told by the comment/reply notifications, so a mentioned post author would get two bells for one comment"
  );
});

test("a draft's mentions wait for publishDraft, not the original save", () => {
  const src = decomment(read("src/app/(main)/feed/actions.ts"));
  const from = src.indexOf("export async function createPost");
  const to = src.indexOf("\nexport async function publishDraft");
  const body = src.slice(from, to);
  assert.match(
    body,
    /if \(!isDraft\) \{\s*\n\s*await notifyMentioned/,
    "createPost no longer skips mention notifications for a draft, which nobody but its author can see"
  );
});

test("the bell has a real icon and label for a mention, not the generic fallback", () => {
  const src = decomment(read("src/components/layout/notification-bell.tsx"));
  assert.match(
    src,
    /mention:\s*\{\s*icon:\s*\w+/,
    'notification-bell.tsx has no entry for "mention" -- it would fall back to the plain Bell'
  );
});

test("the demo's write guard already allows the Notification model a mention rides on", () => {
  // Confirms the premise rather than a new mechanism: mention rows are
  // written through the same prisma client and the same Notification model
  // every like/comment/reply notification already uses, so the demo's
  // default-deny extension covers them for free.
  const src = decomment(read("src/lib/demo.ts"));
  assert.match(src, /"Notification"/, "Notification is no longer in the demo's write allowlist");
});
