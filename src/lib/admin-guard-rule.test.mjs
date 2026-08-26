import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The admin surface cannot be locked shut from inside it.
 *
 *  Since the password-less /api/auth/admin-login route was deleted (security
 *  audit C1-b) there is genuinely no other door: no bypass, no seeded
 *  account, and the local dev-login 404s in production. So an admin who
 *  blocks or deletes their own account, or the last remaining admin's, ends
 *  moderation for good and the only way back is editing the database by
 *  hand. adminSetRole knew this and refused; adminBlockUser and
 *  adminDeleteUser did not check at all (bug audit B-023), and adminSetRole's
 *  own check was a read-then-write outside any transaction, so two
 *  simultaneous demotions could still reach zero (audit M26).
 * ------------------------------------------------------------------ */

const blockDelete = decomment(read("src/components/profile/admin-actions.ts"));
const people = decomment(read("src/app/(main)/admin/people/actions.ts"));

const body = (src, name) => {
  const i = src.indexOf(`export async function ${name}`);
  assert.ok(i > -1, `${name} is gone`);
  const rest = src.slice(i);
  return rest.slice(0, rest.indexOf("\n}\n") + 2);
};

test("blocking refuses your own account and the last admin", () => {
  const fn = body(blockDelete, "adminBlockUser");
  assert.ok(
    /refuseSelfOrLastAdmin|actorId === userId|userId === actor\.actorId/.test(fn),
    "adminBlockUser has no self / last-admin guard: the sole admin can block " +
      "themselves out of their own panel permanently (B-023)"
  );
});

test("deleting refuses your own account and the last admin", () => {
  const fn = body(blockDelete, "adminDeleteUser");
  assert.ok(
    /refuseSelfOrLastAdmin|actorId === userId|userId === actor\.actorId/.test(fn),
    "adminDeleteUser has no self / last-admin guard (B-023)"
  );
});

test("the last-admin count is decided inside a serializable transaction", () => {
  const src = decomment(read("src/lib/admin.ts"));
  assert.ok(
    /refuseSelfOrLastAdmin/.test(src),
    "the shared last-admin guard is gone; each action is checking for itself again"
  );
  assert.ok(
    /Serializable/.test(src),
    "the guard counts admins outside a serializable transaction, so two " +
      "simultaneous demotions can still leave zero (audit M26)"
  );
});

test("changing a role goes through the same guard", () => {
  const fn = body(people, "adminSetRole");
  assert.ok(
    /refuseSelfOrLastAdmin/.test(fn),
    "adminSetRole keeps its own read-then-write copy of the last-admin check"
  );
});

test("the person's own detail page does not offer them the controls", () => {
  const detail = decomment(read("src/components/admin/people/person-detail.tsx"));
  assert.ok(
    /isSelf/.test(detail),
    "PersonDetail renders Block, Delete and Merge on the acting admin's own " +
      "row with nothing to tell it apart (B-023)"
  );
});
