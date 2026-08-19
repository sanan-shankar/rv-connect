import assert from "node:assert/strict";
import test from "node:test";

import { decidePostVisibility } from "./post-visibility-rule.ts";

/* ------------------------------------------------------------------ *
 *  The post visibility rule, written down as attacks.
 *
 *  This is the audit's H3: every interaction path -- comments, likes,
 *  bookmarks, poll votes -- used to take a postId and act on it without ever
 *  asking whether the caller could see the post. Each case below names what
 *  somebody would be able to do again if this regressed.
 *
 *  Phrased as attacks rather than behaviours, following demo.test.mjs, which
 *  is the other file in this repo guarding a security policy.
 * ------------------------------------------------------------------ */

const post = (over = {}) => ({
  id: "p1",
  authorId: "author",
  groupId: null,
  cityScope: null,
  targetBatches: null,
  isHidden: false,
  status: "published",
  ...over,
});
const member = (over = {}) => ({ id: "viewer", role: "member", batchType: "ISC", batchYear: 2011, ...over });
const OPEN = { isGroupMember: false, cityMatches: true };

test("an ordinary published post is visible to any member", () => {
  assert.equal(decidePostVisibility(post(), member(), OPEN).ok, true);
});

test("a non-member cannot reach a private group's post by id", () => {
  /* The Catch-up case: private groups are the hidden container under every
     people-started Catch-up, and post ids leak through /feed#<postId>
     notification links. */
  const r = decidePostVisibility(post({ groupId: "g1" }), member(), { isGroupMember: false, cityMatches: true });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "not-a-member");
});

test("a member of that group can", () => {
  assert.equal(
    decidePostVisibility(post({ groupId: "g1" }), member(), { isGroupMember: true, cityMatches: true }).ok,
    true
  );
});

test("group membership alone decides a group post, ignoring city and batch", () => {
  /* createPost writes cityScope and targetBatches as null whenever groupId is
     set. If that ever changed, a member could be refused their own group's
     post -- so this pins the intent. */
  const r = decidePostVisibility(
    post({ groupId: "g1", cityScope: "Chennai", targetBatches: "ICSE-1999" }),
    member(),
    { isGroupMember: true, cityMatches: false }
  );
  assert.equal(r.ok, true);
});

test("a city-scoped post is refused to somebody in another city", () => {
  const r = decidePostVisibility(post({ cityScope: "Bangalore" }), member(), { isGroupMember: false, cityMatches: false });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "other-city");
});

test("a batch-targeted post is refused to another batch", () => {
  const r = decidePostVisibility(post({ targetBatches: "ICSE-1999" }), member(), OPEN);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "other-batch");
});

test("a batch-targeted post reaches the batch it names", () => {
  assert.equal(decidePostVisibility(post({ targetBatches: "ISC-2011,ICSE-1999" }), member(), OPEN).ok, true);
});

test("a hidden post is refused to everyone but its author", () => {
  assert.equal(decidePostVisibility(post({ isHidden: true }), member(), OPEN).reason, "hidden");
  /* The author keeps reach so they can delete or edit it. Being moderated
     without being able to see what was moderated is not a state to leave
     anybody in. */
  assert.equal(decidePostVisibility(post({ isHidden: true }), member({ id: "author" }), OPEN).ok, true);
});

test("an unpublished draft is refused to everyone but its author", () => {
  assert.equal(decidePostVisibility(post({ status: "draft" }), member(), OPEN).reason, "draft");
  assert.equal(decidePostVisibility(post({ status: "draft" }), member({ id: "author" }), OPEN).ok, true);
});

test("an admin sees everything", () => {
  const admin = member({ role: "admin" });
  for (const over of [
    { groupId: "g1" },
    { cityScope: "Bangalore" },
    { targetBatches: "ICSE-1999" },
    { isHidden: true },
    { status: "draft" },
  ]) {
    assert.equal(
      decidePostVisibility(post(over), admin, { isGroupMember: false, cityMatches: false }).ok,
      true,
      `admin should see ${JSON.stringify(over)}`
    );
  }
});

test("a blocked-shaped viewer gets no special treatment here", () => {
  /* Blocking is enforced in the auth layer (H4): auth() returns null, so this
     function never runs for a blocked member. This only pins that nothing
     here quietly re-admits them. */
  const r = decidePostVisibility(post({ groupId: "g1" }), member({ role: null }), { isGroupMember: false, cityMatches: true });
  assert.equal(r.ok, false);
});

test("the refusal message never distinguishes why", async () => {
  /* Saying "not a member of that group" would confirm the group exists and
     that this id belongs to it -- the exact fact being protected. Callers
     must hand back one constant. */
  const { POST_NOT_VISIBLE } = await import("./post-visibility-rule.ts");
  assert.equal(typeof POST_NOT_VISIBLE, "string");
  assert.ok(!/group|city|batch|draft|hidden/i.test(POST_NOT_VISIBLE));
});
