import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_BATCH_TARGETS,
  batchTargetKey,
  batchTargetsInclude,
  decidePostVisibility,
  parseBatchTargets,
  storedBatchTargets,
} from "./post-visibility-rule.ts";

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

/* --- Your own writing is always yours to read (audit M30) ----------------- */

test("the author sees their own post whatever audience it was aimed at", () => {
  const author = { id: "asha", batchType: "ISC", batchYear: 2011 };
  const base = {
    id: "p1",
    authorId: "asha",
    groupId: null,
    isHidden: false,
    status: "published",
  };
  const facts = { isGroupMember: false, cityMatches: false };

  // Aimed at a city the author no longer has, and a batch that is not theirs.
  const aimedElsewhere = { ...base, cityScope: "Chennai", targetBatches: "ISC-1998" };
  assert.equal(decidePostVisibility(aimedElsewhere, author, facts).ok, true);

  // ...and a stranger in neither audience still cannot.
  const stranger = { id: "bo", batchType: "ISC", batchYear: 2011 };
  assert.equal(decidePostVisibility(aimedElsewhere, stranger, facts).ok, false);
});

test("the author reads their own unpublished draft; nobody else does", () => {
  const draft = {
    id: "p2",
    authorId: "asha",
    groupId: null,
    cityScope: null,
    targetBatches: null,
    isHidden: false,
    status: "draft",
  };
  const facts = { isGroupMember: false, cityMatches: true };
  assert.equal(decidePostVisibility(draft, { id: "asha" }, facts).ok, true);
  const denied = decidePostVisibility(draft, { id: "bo" }, facts);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, "draft");
});

test("a hidden post is still reachable by its own author, on purpose", () => {
  /* Not an oversight, and worth a test so nobody "fixes" it: an author whose
     post a moderator has hidden can still open it, because deleting or
     editing it is the only way they can respond to the moderation at all.
     The audit's M30 assumed the rule lacked an author exemption entirely; it
     did not. The gap was in loadPosts, which is where the fix went. */
  const hidden = {
    id: "p3",
    authorId: "asha",
    groupId: null,
    cityScope: null,
    targetBatches: null,
    isHidden: true,
    status: "published",
  };
  assert.equal(
    decidePostVisibility(hidden, { id: "asha" }, { isGroupMember: true, cityMatches: true }).ok,
    true
  );
  const other = decidePostVisibility(hidden, { id: "bo" }, { isGroupMember: true, cityMatches: true });
  assert.equal(other.ok, false);
  assert.equal(other.reason, "hidden");
});

/* ------------------------------------------------------------------ *
 *  Batch targets (audit M43): the column createPost used to store
 *  exactly as the client sent it.
 * ------------------------------------------------------------------ */

test("a target list is normalised, de-duplicated and case-corrected", () => {
  assert.deepEqual(parseBatchTargets("ISC-2004,icse-1999, ISC-2004 "), [
    "ISC-2004",
    "ICSE-1999",
  ]);
  assert.deepEqual(parseBatchTargets(""), []);
  assert.deepEqual(parseBatchTargets(null), []);
  assert.deepEqual(parseBatchTargets(undefined), []);
});

test("anything that is not a list of batch keys is refused, not stored", () => {
  // The shape IS the cap: no token can outgrow "TYPE-YYYY".
  assert.equal(parseBatchTargets("x".repeat(5000)), null);
  assert.equal(parseBatchTargets("ISC-20040"), null);
  assert.equal(parseBatchTargets("ISC-204"), null);
  assert.equal(parseBatchTargets("IB-2004"), null);
  assert.equal(parseBatchTargets("2004"), null);
  assert.equal(parseBatchTargets("ISC-2004,junk"), null);
});

test("more batches than anyone would pick by hand is refused", () => {
  const forty = Array.from({ length: MAX_BATCH_TARGETS }, (_, i) => `ISC-${1950 + i}`);
  assert.equal(parseBatchTargets(forty.join(","))?.length, MAX_BATCH_TARGETS);
  assert.equal(parseBatchTargets([...forty, "ISC-2000"].join(",")), null);
});

test("matching is token-exact, so a longer key is not a member of a shorter one", () => {
  // The old rule was `stored.includes(key)`, which showed an "ISC-20111" post
  // to everyone in ISC-2011.
  assert.equal(batchTargetsInclude("ISC-2011", "ISC-2011"), true);
  assert.equal(batchTargetsInclude("ISC-20111", "ISC-2011"), false);
  assert.equal(batchTargetsInclude("ICSE-2011", "ISC-2011"), false);
  assert.equal(batchTargetsInclude("ISC-2004,ISC-2011", "ISC-2011"), true);
});

test("a member with no batch is in nobody's target list", () => {
  assert.equal(batchTargetKey(null, null), null);
  assert.equal(batchTargetKey("ISC", null), null);
  assert.equal(batchTargetKey(undefined, 2004), null);
  assert.equal(batchTargetsInclude("ISC-2004", null), false);
});

test("what gets stored is the normalised list, or null for everyone", () => {
  assert.equal(storedBatchTargets("icse-1999,ISC-2004"), "ICSE-1999,ISC-2004");
  assert.equal(storedBatchTargets(""), null);
  assert.equal(storedBatchTargets(null), null);
});

test("a targeted post reaches its batch and nobody else's", () => {
  const targeted = {
    id: "p4",
    authorId: "asha",
    groupId: null,
    cityScope: null,
    targetBatches: "ISC-2004",
    isHidden: false,
    status: "published",
  };
  const facts = { isGroupMember: false, cityMatches: true };
  assert.equal(
    decidePostVisibility(targeted, { id: "bo", batchType: "ISC", batchYear: 2004 }, facts).ok,
    true
  );
  const wrong = decidePostVisibility(
    targeted,
    { id: "bo", batchType: "ISC", batchYear: 2005 },
    facts
  );
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "other-batch");
  // No batch at all: refused, not crashed, and not let through.
  assert.equal(decidePostVisibility(targeted, { id: "bo" }, facts).ok, false);
});
