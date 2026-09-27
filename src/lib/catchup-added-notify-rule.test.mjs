import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Being added to an existing Catch-up used to notify nobody.
 *
 *  `addCatchupMembers`'s own docblock said "notifies each of them", but its
 *  body only ever wrote GroupMember rows, cleared the archive stamp for
 *  whoever was genuinely new, and revalidated -- `newlyAdded` was computed
 *  and then only used for the archive clear. `createCatchupWithPeople` has
 *  always notified the FIRST enrollment (`notifyQuestionsOpen`); this pins
 *  the second one, `notifyAdded`, for everyone enrolled afterward.
 * ------------------------------------------------------------------ */

const TYPES = "src/lib/catchups-types.ts";
const NOTIFY = "src/lib/catchups-notify.ts";
const ACTIONS = "src/app/(main)/catchups/actions.ts";
const CLEAR = "src/lib/catchup-notifications.ts";
const BELL = "src/components/layout/notification-bell.tsx";

test("catchup_added joins the shared vocabulary", () => {
  const types = decomment(read(TYPES));
  const kind = types.slice(types.indexOf("export type CatchupNotifyKind"), types.indexOf(";", types.indexOf("export type CatchupNotifyKind")));
  assert.match(kind, /"catchup_added"/, "CatchupNotifyKind does not accept the new type");
});

test("notifyAdded writes exactly the userIds it is given, never audience math", () => {
  const notify = decomment(read(NOTIFY));
  const fn = balancedBody(notify, "export const notifyAdded");
  assert.ok(fn, "notifyAdded is gone or renamed");
  assert.match(
    fn,
    /createMany\(\s*db,\s*ctx\.userIds,\s*"catchup_added",/,
    "notifyAdded no longer sends to exactly ctx.userIds -- every other builder here " +
      "queries groupMemberIds, and doing that here would notify the whole group, not just who was added"
  );
  assert.doesNotMatch(
    fn,
    /groupMemberIds/,
    "notifyAdded queries the group again; the caller already computed exactly who is new"
  );
  assert.match(
    fn,
    /`\$\{ctx\.addedByName\} added you to \$\{ctx\.groupName\}'s Catch-up\.`/,
    "the added notification's wording changed; update this pin and the spec table together"
  );
  assert.match(fn, /`\/catchups\/\$\{ctx\.catchupId\}`/, "notifyAdded no longer links to the Catch-up's home");
});

test("addCatchupMembers actually calls notifyAdded, with newlyAdded and not the actor", () => {
  const actions = decomment(read(ACTIONS));
  const fn = balancedBody(actions, "export async function addCatchupMembers(");
  assert.ok(fn, "addCatchupMembers is gone or renamed");
  assert.match(
    fn,
    /notifyAdded\(prisma,\s*\{/,
    "addCatchupMembers no longer calls notifyAdded -- its own docblock says it notifies people it enrols, but nothing did"
  );
  const call = fn.slice(fn.indexOf("notifyAdded(prisma,"), fn.indexOf("});", fn.indexOf("notifyAdded(prisma,")));
  assert.match(
    call,
    /userIds:\s*newlyAdded/,
    "notifyAdded is not sent newlyAdded -- sending `real` or the raw input would " +
      "notify someone re-listed who was already a member"
  );
  assert.doesNotMatch(
    call,
    /session\.user\.id/,
    "the actor's own id is threaded into the notify call directly"
  );
  // The call must sit inside the `newlyAdded.length > 0` guard that already
  // exists for the archive-clear, not fire unconditionally with an empty list.
  const guardAt = fn.indexOf("if (newlyAdded.length > 0)");
  const callAt = fn.indexOf("notifyAdded(prisma,");
  assert.ok(guardAt > -1 && callAt > guardAt, "notifyAdded moved outside the newlyAdded guard");
});

test("leaving or being removed clears an unread catchup_added the same as every other kind", () => {
  const src = decomment(read(CLEAR));
  const types = src.slice(
    src.indexOf("export const CATCHUP_NOTIFICATION_TYPES"),
    src.indexOf("] as const", src.indexOf("export const CATCHUP_NOTIFICATION_TYPES"))
  );
  assert.match(types, /"catchup_added"/, "CATCHUP_NOTIFICATION_TYPES does not list the new type, so it survives a removal");
});

test("the bell can draw the new type, and the mention row another change added is still there", () => {
  const bell = read(BELL);
  assert.match(bell, /catchup_added:\s*\{\s*icon:/, "notification-bell.tsx has no icon row for catchup_added");
  assert.match(bell, /mention:\s*\{\s*icon:\s*AtSign/, "the mention row is gone");
});

test("the spec's who-is-notified table carries the new row", () => {
  const spec = read("docs/spec/catchups.md");
  assert.match(spec, /\|\s*`catchup_added`\s*\|/, "catchups.md section 11's table has no row for catchup_added");
});
