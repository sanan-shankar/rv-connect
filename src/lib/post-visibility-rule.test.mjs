import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { ROOT, decomment } from "./test-kit.mjs";

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
  cityScope: null,
  targetBatches: null,
  isHidden: false,
  status: "published",
  ...over,
});
const member = (over = {}) => ({ id: "viewer", role: "member", batchType: "ISC", batchYear: 2011, ...over });
const OPEN = { cityMatches: true };

test("an ordinary published post is visible to any member", () => {
  assert.equal(decidePostVisibility(post(), member(), OPEN).ok, true);
});

test("a post carries no group scope, so nothing may be added that ignores the audience", () => {
  /* THREE TESTS USED TO LIVE HERE, all about `Post.groupId`: a non-member
     refused a private group's post, a member allowed it, and membership
     overriding city and batch. The column went on 2026-09-07 (refactor audit
     2 / D6) after being NULL on every row since Groups were retired -- 0 of 20
     on production, 0 of 0 on the demo -- with no write path able to set it.
     A branch that can never fire is not a guard.

     What replaces them is the thing that made that branch dangerous to add
     back carelessly: it returned `ok: true` WITHOUT consulting cityScope or
     targetBatches. So this refuses any future short-circuit of the same
     shape. If a group-like scope returns one day, it must decide the audience
     arms too, not skip them. */
  const src = decomment(readFileSync(resolve(ROOT, "src/lib/post-visibility-rule.ts"), "utf8"));
  assert.ok(!/\bgroupId\b/.test(src), "post-visibility-rule.ts names groupId again; re-derive this test");

  /* And the behaviour: an unknown extra field on the row changes nothing. */
  const r = decidePostVisibility(
    { ...post({ cityScope: "Chennai", targetBatches: "ICSE-1999" }), groupId: "g1" },
    member(),
    { cityMatches: false }
  );
  assert.equal(r.ok, false);
  assert.equal(r.reason, "other-city");
});

test("a city-scoped post is refused to somebody in another city", () => {
  const r = decidePostVisibility(post({ cityScope: "Bangalore" }), member(), { cityMatches: false });
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
    { cityScope: "Bangalore" },
    { targetBatches: "ICSE-1999" },
    { isHidden: true },
    { status: "draft" },
  ]) {
    assert.equal(
      decidePostVisibility(post(over), admin, { cityMatches: false }).ok,
      true,
      `admin should see ${JSON.stringify(over)}`
    );
  }
});

test("a blocked-shaped viewer gets no special treatment here", () => {
  /* Blocking is enforced in the auth layer (H4): auth() returns null, so this
     function never runs for a blocked member. This only pins that nothing
     here quietly re-admits them. */
  const r = decidePostVisibility(post({ isHidden: true }), member({ role: null }), OPEN);
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
    isHidden: false,
    status: "published",
  };
  const facts = { cityMatches: false };

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
    cityScope: null,
    targetBatches: null,
    isHidden: false,
    status: "draft",
  };
  const facts = { cityMatches: true };
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
    cityScope: null,
    targetBatches: null,
    isHidden: true,
    status: "published",
  };
  assert.equal(
    decidePostVisibility(hidden, { id: "asha" }, { cityMatches: true }).ok,
    true
  );
  const other = decidePostVisibility(hidden, { id: "bo" }, { cityMatches: true });
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
    cityScope: null,
    targetBatches: "ISC-2004",
    isHidden: false,
    status: "published",
  };
  const facts = { cityMatches: true };
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

/* ------------------------------------------------------------------ *
 *  Blocked authors (audit Low 78, owner decision 2026-08-21).
 * ------------------------------------------------------------------ */

const byBlocked = {
  id: "p5",
  authorId: "gone",
  cityScope: null,
  targetBatches: null,
  isHidden: false,
  status: "published",
  authorIsBlocked: true,
};
const anyone = { cityMatches: true };

test("a blocked member's post is not available to other members", () => {
  const seen = decidePostVisibility(byBlocked, { id: "bo" }, anyone);
  assert.equal(seen.ok, false);
  assert.equal(seen.reason, "author-blocked");
});

test("an admin can still open it, because that is where moderation happens", () => {
  assert.equal(
    decidePostVisibility(byBlocked, { id: "admin", role: "admin" }, anyone).ok,
    true
  );
});

test("a caller that never fetched the author's standing is not told everything is blocked", () => {
  /* `authorIsBlocked` is optional on GuardedPost, so a query that forgets the
     join must fail OPEN on this one flag rather than hiding the whole feed.
     The feed queries carry AUTHOR_IN_GOOD_STANDING regardless. */
  const { authorIsBlocked: _omitted, ...noStanding } = byBlocked;
  void _omitted;
  assert.equal(decidePostVisibility(noStanding, { id: "bo" }, anyone).ok, true);
});

/* ------------------------------------------------------------------ *
 *  The rule is only the authority if nothing refuses ahead of it
 * ------------------------------------------------------------------ */

/* Both exemptions above -- admin, and the author -- sit ABOVE the isHidden
 * refusal on purpose, so that a moderator following the Open link from
 * /admin/content lands on the post and an author can reach a hidden post to
 * respond to the moderation. letters/[id] cancelled both of them by testing
 * `letter.isHidden` on its own line above canViewPost, and a hidden letter is
 * filtered out of the feed and the letters index too, so its author had no
 * route to it at all (audit C-002).
 *
 * A behavioural test of decidePostVisibility cannot see that. This can: no
 * caller may refuse on a fact the rule already weighs. */

const RULE_FACTS = ["isHidden", "cityScope", "targetBatches"];

test("no page refuses a post ahead of the rule", () => {
  const callers = execSync("git grep -l 'canViewPost(' -- 'src/app/**/page.tsx'", {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  assert.ok(callers.length > 0, "no page calls canViewPost; retarget this test");

  for (const f of callers) {
    const src = decomment(readFileSync(resolve(ROOT, f), "utf8"));
    /* Everything the page does before it asks the rule. The IMPORT of
       canViewPost is not the call, which is the trap this test fell into
       first: slicing at the import made `before` three lines long and the
       sweep vacuous. A guard AFTER the rule has spoken is the page's own
       business (a draft banner, a group redirect); a guard before it silently
       overrides the rule. */
    const segments = src.split("await canViewPost(");
    assert.ok(segments.length > 1, `${f} no longer awaits canViewPost`);
    // One segment per call -- generateMetadata and the page body each ask the
    // rule, and each has its own run-up. The last segment is what follows the
    // final call and is not a run-up to anything.
    for (const before of segments.slice(0, -1)) {
      for (const fact of RULE_FACTS) {
        assert.ok(
          !new RegExp(`(if|\\|\\||&&)[^\\n]*\\.${fact}\\b[^\\n]*(notFound|redirect|return)`).test(before),
          `${f} refuses on ${fact} before canViewPost decides it`
        );
      }
    }
  }
});

/* ------------------------------------------------------------------ *
 *  A count and the list beside it answer the same question.
 *
 *  The profile page hand-copied the audience half of loadPosts' where-clause
 *  and the copy drifted: no batch arm, a city arm with no author
 *  self-exemption, no author-standing filter. So the number on a tab
 *  disagreed with the list underneath it, and a batch-targeted photo reached
 *  the Photos grid of somebody outside its audience (bug-report-2 C-004).
 *
 *  Shape-checked because both files import through the `@/` alias, which the
 *  unit gate's plain `node` cannot resolve. What is pinned is the property
 *  that made the drift possible: neither surface may build those arms itself.
 * ------------------------------------------------------------------ */

/** One exported function's source, from its declaration to the next one. */
function section(src, name) {
  const start = src.indexOf(`export async function ${name}`);
  assert.ok(start > -1, `${name} is gone`);
  const next = src.indexOf("\nexport ", start + 1);
  return next === -1 ? src.slice(start) : src.slice(start, next);
}

const AUDIENCE_SURFACES = [
  ["src/app/(main)/feed/actions.ts", "loadPosts", "the feed and every authorId list it serves"],
  ["src/app/(main)/profile/[id]/page.tsx", null, "the profile's tab counts and Photos grid"],
];

test("every audience-filtered surface composes its arms from one builder", () => {
  for (const [file, fn, what] of AUDIENCE_SURFACES) {
    const whole = decomment(readFileSync(resolve(ROOT, file), "utf8"));
    const src = fn ? section(whole, fn) : whole;
    assert.match(
      src,
      /audienceWhere\s*\(/,
      `${file} (${what}) no longer builds its audience from the shared fragment`
    );
    // ...and does not rebuild either arm alongside it, which is exactly how
    // the two came to disagree.
    assert.ok(
      !/cityScopeWhere\s*\(/.test(src),
      `${file} composes the city arm by hand again; audienceWhere owns it`
    );
    assert.ok(
      !/batchScopeWhere\s*\(/.test(src),
      `${file} composes the batch arm by hand again; audienceWhere owns it`
    );
  }
});

test("the profile applies the author-standing filter the feed applies", () => {
  // Without it an admin reading a blocked member's profile is shown a count
  // of eleven above an empty list -- the same disagreement, from the other end.
  const src = decomment(readFileSync(resolve(ROOT, "src/app/(main)/profile/[id]/page.tsx"), "utf8"));
  const where = src.slice(src.indexOf("const visiblePostsWhere"), src.indexOf("const [postCount"));
  assert.match(where, /AUTHOR_IN_GOOD_STANDING/, "the profile's post set no longer filters on the author's standing");
  assert.match(where, /audienceWhere\s*\(/, "the profile's post set no longer carries the audience arms");
});
