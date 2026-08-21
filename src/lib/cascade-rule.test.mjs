import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
 *  This test does not check those two columns. It checks the property:
 *  it walks every `onDelete: Cascade` foreign key out of `User` and asserts
 *  that no COMMUNAL container is reachable. A future model wired the same
 *  careless way fails here on the day it is written.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
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
