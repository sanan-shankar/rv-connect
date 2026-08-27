import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Deleting one member must never destroy anybody else's writing.
 *
 *  Before 2026-08-21 it did. The hidden Group under every Catch-up was
 *  created with `creatorId` = whoever started it, and `Group.creator` was
 *  `onDelete: Cascade`. So `prisma.user.delete` -- which is the end of the
 *  60-day retention purge, of adminDeleteUser and of adminMergeUsers --
 *  took the Group with it, and the Group took the Catchup, the Editions,
 *  the Prompts and every member's Entries. Separately `CatchupPrompt.author`
 *  was Cascade too, so deleting the person who ASKED a question deleted the
 *  question and, through it, thirty other people's answers to it.
 *
 *  This test does not check those two columns. It checks the property: it
 *  walks every `onDelete: Cascade` foreign key out of `User` and asserts that
 *  every model it reaches is one somebody classified.
 *
 *  It used to filter that walk through a four-name COMMUNAL list, which meant
 *  a NEW communal model wired Cascade-from-User -- an Events table, a shared
 *  album -- was reachable, absent from the list, and passed silently, while
 *  the header claimed it would "fail on the day it is written"
 *  (bug-report-2 C-191). The assertion is now the other way round and fails
 *  closed: the reachable set must be a SUBSET of OWN_CONTENT below, so any
 *  newly reachable model fails until somebody says in writing why one
 *  member's deletion may destroy it.
 * ------------------------------------------------------------------ */

const schema = readFileSync(resolve(ROOT, "prisma/schema.prisma"), "utf8");

/**
 * Every `child -> parent` relation the schema declares, with its delete rule.
 * Only the OWNING side of a relation carries `fields:`, which is also the only
 * side that can carry `onDelete`, so scanning for that is exact.
 */
function relations(src) {
  const out = [];
  let model = null;
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    const open = line.match(/^model\s+(\w+)\s*\{/);
    if (open) {
      model = open[1];
      continue;
    }
    if (line === "}") {
      model = null;
      continue;
    }
    if (!model) continue;
    const rel = line.match(/^(\w+)\s+(\w+)(\?|\[\])?\s+@relation\((.*)\)/);
    if (!rel) continue;
    const args = rel[4];
    if (!args.includes("fields:")) continue; // the back-reference side
    const onDelete = args.match(/onDelete:\s*(\w+)/)?.[1] ?? "Default";
    out.push({ child: model, parent: rel[2], onDelete });
  }
  return out;
}

/** Models a `DELETE FROM "User"` physically destroys, following Cascade only. */
function cascadeReachableFromUser(rels) {
  const seen = new Set(["User"]);
  const queue = ["User"];
  while (queue.length) {
    const parent = queue.shift();
    for (const r of rels) {
      if (r.parent !== parent || r.onDelete !== "Cascade") continue;
      if (seen.has(r.child)) continue;
      seen.add(r.child);
      queue.push(r.child);
    }
  }
  seen.delete("User");
  return seen;
}

/**
 * Rows that belong to more than one person. A Group is a batch or a Catch-up's
 * membership container; an Edition is a published Round other members read
 * "forever"; a Prompt is a question whose answers were written by everybody
 * else. None of them is one member's property, so none of them may die with
 * one member. (CatchupEntry is deliberately NOT on this list: an entry is the
 * member's own answer and SHOULD go with them.)
 */
const COMMUNAL = ["Group", "Catchup", "CatchupEdition", "CatchupPrompt"];

/**
 * Everything a `DELETE FROM "User"` is ALLOWED to take with it, and why. The
 * test below asserts the cascade-reachable set is a subset of these keys, so
 * adding a model with an onDelete: Cascade path from User fails `npm run
 * check` until it appears here -- which is the moment to ask whether it is
 * really this one member's to lose.
 */
const OWN_CONTENT = {
  AdminMessage: "lines inside their own admin thread; the thread itself goes below",
  AdminThread: "their private conversation with the admins, which the purge exists to remove",
  AuthToken: "their unused password-reset and email-confirmation tokens",
  Bookmark: "posts they saved; private to the saver",
  CatchupEntry: "their own answer to a Round; the question and the Round outlive them",
  CatchupEntryLove: "hearts they gave; the count is derived, so nobody else's entry changes",
  CatchupPref: "their per-Catch-up reminder settings",
  Comment: "reachable only THROUGH their own posts; the direct User edge is SetNull (M34)",
  CommentLike: "hearts they gave on comments",
  ContentView: "their own read receipts",
  GroupMember: "their membership rows; the Group itself is communal and stays",
  Like: "hearts they gave on posts",
  Notification: "their bell; nobody else reads it",
  OutboundEmail: "queued mail addressed to them, which must not be sent after the purge",
  Photo: "Collection photographs they contributed; removing them is the point of the purge, and account-purge clears the covers pointing at them",
  PhotoLove: "hearts they gave on photographs",
  PollOption: "reachable only through their own post's poll",
  PollVote: "their votes; the tallies are counts of rows, so everyone else's stands",
  Post: "their own writing",
  Report: "reports filed against them, which end with the account (their FILED reports go by the reporter edge, not Cascade)",
  UserPlace: "the pins on their own map",
  Visit: "their own visit rows",
};

test("the schema parser sees the relations it is meant to", () => {
  const rels = relations(schema);
  assert.ok(rels.length > 30, `parsed only ${rels.length} relations; the parser has drifted`);
  assert.ok(
    rels.some((r) => r.child === "Group" && r.parent === "User"),
    "Group -> User relation not found; the parser has drifted"
  );
});

test("deleting a member destroys nothing communal", () => {
  const reachable = cascadeReachableFromUser(relations(schema));
  const casualties = COMMUNAL.filter((m) => reachable.has(m));
  assert.deepEqual(
    casualties,
    [],
    `deleting one User cascade-deletes ${casualties.join(", ")} — other members' writing`
  );
});

test("deleting a member destroys nothing nobody has classified", () => {
  const reachable = [...cascadeReachableFromUser(relations(schema))].sort();
  const unclassified = reachable.filter((m) => !(m in OWN_CONTENT));
  assert.deepEqual(
    unclassified,
    [],
    `deleting one User cascade-deletes ${unclassified.join(", ")}, which nobody has said is theirs to lose. ` +
      `If it really is their own content, add it to OWN_CONTENT with the reason; if it is shared, change the relation.`
  );
});

test("the own-content list names only models that are still reachable", () => {
  // The mirror: a stale entry would silently re-open the hole it was written
  // to close, by pre-classifying a name a future model might reuse.
  const reachable = cascadeReachableFromUser(relations(schema));
  const stale = Object.keys(OWN_CONTENT).filter((m) => !reachable.has(m));
  assert.deepEqual(stale, [], `OWN_CONTENT lists ${stale.join(", ")}, which a User delete no longer reaches`);
});

test("a Catch-up outlives its Keeper, exactly as the schema comment promises", () => {
  const rels = relations(schema);
  const group = rels.find((r) => r.child === "Group" && r.parent === "User");
  assert.ok(group, "Group has no creator relation any more");
  assert.notEqual(group.onDelete, "Cascade", "Group.creator is Cascade again");

  const prompt = rels.find((r) => r.child === "CatchupPrompt" && r.parent === "User");
  assert.ok(prompt, "CatchupPrompt has no author relation any more");
  assert.notEqual(prompt.onDelete, "Cascade", "CatchupPrompt.author is Cascade again");
});

test("a member's own writing still goes with them", () => {
  // The mirror assertion: loosening the cascade must not accidentally strand
  // the member's own content, which deletion is supposed to remove.
  const reachable = cascadeReachableFromUser(relations(schema));
  for (const own of ["Post", "Comment", "CatchupEntry", "Photo", "Notification"]) {
    assert.ok(reachable.has(own), `${own} no longer goes with the member who wrote it`);
  }
});

test("a comment does not take somebody else's reply with it", () => {
  /* Comment.author was Cascade, and Comment.parent is SetNull, so purging an
     account deleted every comment they had written and silently PROMOTED every
     reply underneath to a top-level comment -- a stray sentence with no
     question above it, in a thread that then lied about its shape (audit M34).

     Note Comment is still cascade-reachable above, through Post: a member's
     comments on their OWN posts go with the post. What changed is the direct
     User -> Comment edge, which is now SetNull, and purgeUserAccount does the
     removing explicitly so it can tell an anchor from an ordinary comment. Both
     halves are asserted, because either one alone brings the bug back. */
  const rel = relations(schema).find((r) => r.child === "Comment" && r.parent === "User");
  assert.ok(rel, "Comment has no author relation any more");
  assert.equal(
    rel.onDelete,
    "SetNull",
    "Comment.author is Cascade again: purging an account will promote other members' replies to top-level"
  );

  const purge = readFileSync(resolve(ROOT, "src/lib/account-purge.ts"), "utf8");
  assert.match(
    purge,
    /replies:\s*\{\s*some:/,
    "purgeUserAccount no longer distinguishes a comment holding somebody else's reply from an ordinary one"
  );
  assert.match(
    purge,
    /comment\.deleteMany/,
    "purgeUserAccount no longer removes the member's comments at all, so they would survive the account"
  );
});
