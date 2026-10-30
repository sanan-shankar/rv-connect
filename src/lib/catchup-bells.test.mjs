import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  What a Catch-up's bells say, read off the real builders.
 *
 *  The other Catch-up pins read source, because the only database here is
 *  the live one. These run `catchups-notify.ts` itself against a fake client
 *  that records what it is asked to write, so a sentence is asserted as a
 *  member would read it. The one thing bare `node` cannot do for that file
 *  is resolve its `@/` imports, so they are pointed at `src/` here; its
 *  type-only imports never load.
 * ------------------------------------------------------------------ */

registerHooks({
  resolve(specifier, context, next) {
    if (!specifier.startsWith("@/")) return next(specifier, context);
    return next(pathToFileURL(resolve(ROOT, "src", `${specifier.slice(2)}.ts`)).href, context);
  },
});

const notify = await import("./catchups-notify.ts");
const { catchupDisplayName } = await import("./catchups-core.ts");

/** A client that answers the reads the builders make and keeps their writes. */
function fakeDb() {
  const written = [];
  return {
    written,
    groupMember: {
      findMany: async () => [{ userId: "u-member" }, { userId: "u-starter" }],
      count: async () => 1,
    },
    catchupPrompt: { findMany: async () => [] },
    catchupPref: {
      findMany: async () => [{ userId: "u-member", reminderMode: "all" }],
    },
    catchupEntry: { findMany: async () => [] },
    notification: {
      createMany: async ({ data }) => {
        written.push(...data);
        return { count: data.length };
      },
      create: async ({ data }) => {
        written.push(data);
        return data;
      },
      findFirst: async () => null,
      deleteMany: async () => ({ count: 0 }),
    },
  };
}

/* A Keeper renamed "asdf" to "Old friends". `Group.name` still says asdf,
   which is what every bell used to print (bug audit 3, T2a-02). */
const RENAMED = catchupDisplayName("Old friends", "asdf");
const base = { catchupId: "c1", editionId: "e1", groupId: "g1", catchupName: RENAMED };

test("T2a-02: the questions-open bell says a renamed Catch-up's new name", async () => {
  assert.equal(RENAMED, "Old friends");
  for (const starterName of ["Someone", undefined]) {
    const db = fakeDb();
    await notify.notifyQuestionsOpen(db, { ...base, excludeUserId: "u-starter", starterName });
    assert.ok(db.written.length > 0, "the questions-open bell wrote nothing");
    for (const row of db.written) {
      assert.match(row.message, /Old friends/, row.message);
      assert.doesNotMatch(row.message, /asdf/, row.message);
    }
  }
});

test("T2a-02: every bell names the Catch-up the same way", async () => {
  const calls = {
    notifyAnswersOpen: { ...base },
    notifyReminder: { ...base, daysLeft: 2, closesAt: new Date(Date.now() + 2 * 86_400_000) },
    notifyPublished: { ...base },
    notifySealed: { ...base, opensAt: new Date("2027-09-14T01:30:00Z") },
    notifyLove: { ...base, entryId: "n1", authorId: "u-member", likerId: "u-starter", likerName: "Someone" },
    notifyComment: { ...base, entryId: "n1", recipientId: "u-member", writerId: "u-starter", writerName: "Someone", kind: "comment" },
    notifyAdded: { catchupId: "c1", catchupName: RENAMED, addedByName: "Someone", userIds: ["u-member"] },
  };
  for (const [name, ctx] of Object.entries(calls)) {
    const db = fakeDb();
    await notify[name](db, ctx);
    assert.ok(db.written.length > 0, `${name} wrote no bell`);
    for (const row of db.written) {
      assert.match(row.message, /Old friends/, `${name}: ${row.message}`);
      assert.doesNotMatch(row.message, /asdf/, `${name}: ${row.message}`);
    }
  }
});
