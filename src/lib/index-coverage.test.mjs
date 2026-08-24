import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ *
 *  Every hot foreign key is indexed on the child side.
 *
 *  Postgres does not index a foreign key for you, and every "one row per
 *  user per thing" rule in this schema is a @@unique([userId, thingId])
 *  that LEADS with userId -- so none of them can serve the predicate the
 *  app actually runs, which is by thingId. Counting likes on a post,
 *  tallying a poll, opening a comment thread, loading a profile's posts:
 *  each was a sequential scan of its whole table, invisible at seventeen
 *  posts and a scan per request at two thousand members (bug audit B-090,
 *  dossier 4.2).
 *
 *  This is a schema-shape test, not a database test: it reads
 *  prisma/schema.prisma, so it runs in the offline unit gate.
 *
 *  Two halves. REQUIRED below is the ten hot reads the B-090 audit actually
 *  measured, pinned by name. The DERIVED sweep after it is the general rule
 *  the header used to claim on its own and did not have (bug-report-2 C-192):
 *  every `@@unique([aId, bId])` in the schema is an index Postgres can only
 *  use from `aId`, so the read that filters by `bId` needs an index of its
 *  own -- and a new interaction table (a reply-love, an event RSVP) is now
 *  caught on the day it is written rather than at two thousand members.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const schema = readFileSync(resolve(ROOT, "prisma/schema.prisma"), "utf8");

/** The body of one `model X { ... }` block. */
function model(name) {
  const start = schema.indexOf(`model ${name} {`);
  assert.ok(start > -1, `model ${name} is gone`);
  return schema.slice(start, schema.indexOf("\n}", start));
}

/** Whether some @@index or @@unique on this model LEADS with the column. */
function leadsWith(body, column) {
  return new RegExp(`@@(?:index|unique)\\(\\[${column}\\b`).test(body);
}

/** Each hot count/thread/profile read the audit measured, by the column it
 *  filters on and the surface that runs it. */
const REQUIRED = [
  ["Like", "postId", "every feed page, the letters index, saved posts, the 'most liked' sort"],
  ["Comment", "parentId", "opening one comment thread"],
  ["PollVote", "pollOptionId", "tallying a poll"],
  ["PollVote", "postId", "a post's own vote count"],
  ["CommentLike", "commentId", "a comment's like count"],
  ["PhotoLove", "photoId", "the Collection grid's love counts"],
  ["Bookmark", "postId", "a post's saved state"],
  ["CatchupEntryLove", "entryId", "a Round's hearts"],
  ["Post", "authorId", "a profile's Posts and Letters tabs"],
  ["Photo", "uploaderId", "photos by this member, and the account purge"],
];

for (const [name, column, why] of REQUIRED) {
  test(`${name}.${column} is indexed on the child side`, () => {
    assert.ok(
      leadsWith(model(name), column),
      `${name} has no index leading with ${column}: ${why} scans the whole table (B-090)`
    );
  });
}

/**
 * Trailing foreign keys that deliberately have no index of their own, each
 * with the read that justifies it. An entry is a reviewed decision; a new
 * unlisted one fails the sweep below.
 */
const NO_INDEX_NEEDED = {
  "CatchupPref.userId":
    "every live read leads with catchupId (the reminder fan-out, the bin sweep, the member's own row); only adminMergeUsers filters by userId alone, once, by hand",
  "CatchupEntry.authorId":
    "the Round reads lead with editionId or promptId, both indexed; authorId alone is only the account data export",
  "Report.reportedUserId":
    "the flag-count groupBy in reportUser is the only reader, on a moderation table that grows by a handful of rows a month",
  "GroupMember.userId":
    "NOT a settled decision: loadSavedPosts reads memberships by userId on every request, which is the same shape as B-090. Raised 2026-08-25 in docs/planning/audits/fix-ledger.md; it wants a migration, which does not belong in a test change",
};

/** Is this column the owning side of a real relation, not just a name ending in Id? */
function isRelationColumn(body, column) {
  return new RegExp(`@relation\\([^)]*fields:\\s*\\[${column}\\]`).test(body);
}

test("every composite unique's TRAILING foreign key can still be filtered on", () => {
  const bodies = [...schema.matchAll(/model\s+(\w+)\s*\{/g)].map((m) => ({
    name: m[1],
    body: schema.slice(m.index, schema.indexOf("\n}", m.index)),
  }));
  assert.ok(bodies.length > 20, `parsed only ${bodies.length} models; the scan has drifted`);

  let checked = 0;
  for (const { name, body } of bodies) {
    for (const [, first, second] of body.matchAll(/@@unique\(\[(\w+),\s*(\w+)\]/g)) {
      // Only pairs of real foreign keys. (provider, providerAccountId) and
      // (identifier, token) are opaque strings from someone else's system, and
      // (userId, position) is an ordering, not a thing to filter by.
      if (!isRelationColumn(body, first) || !isRelationColumn(body, second)) continue;
      checked++;
      if (NO_INDEX_NEEDED[`${name}.${second}`]) continue;
      assert.ok(
        leadsWith(body, second),
        `${name} has no index leading with ${second}: the @@unique([${first}, ${second}]) cannot serve a read ` +
          `that filters by ${second} alone, so that read scans the whole table (B-090). Add @@index([${second}]), ` +
          `or add ${name}.${second} to NO_INDEX_NEEDED with the reason.`
      );
    }
  }
  assert.ok(checked >= 8, `only ${checked} relation pairs found; the sweep has stopped seeing them`);
});

test("the no-index list names only pairs the schema still has", () => {
  for (const key of Object.keys(NO_INDEX_NEEDED)) {
    const [name, column] = key.split(".");
    assert.match(model(name), new RegExp(`\\b${column}\\b`), `${key} is exempted but ${name} has no ${column} any more`);
  }
});

test("the gazetteer's altNames search has an index to use", () => {
  // Not expressible in schema.prisma (Prisma has no GIN trigram index), so the
  // migration file is the artefact. Before it, a 4+ character query mixed two
  // indexable arms with an unindexable one, which Postgres cannot BitmapOr, so
  // every keystroke sequentially scanned all 234,935 rows: measured live at
  // 368ms and 4,690 buffers, and 7.4ms / 54 buffers after (bug audit B-091).
  const dir = resolve(ROOT, "prisma/migrations-manual");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(resolve(dir, f), "utf8"))
    .join("\n");
  assert.ok(/pg_trgm/.test(sql), "no migration installs pg_trgm");
  assert.ok(
    /gin_trgm_ops/.test(sql) && /"altNames"/.test(sql),
    "no migration builds a trigram index on Place.altNames"
  );
});

test("the search route still asks the question the index answers", () => {
  const src = readFileSync(resolve(ROOT, "src/app/api/places/search/route.ts"), "utf8");
  assert.ok(
    /altNames.*ILIKE/s.test(src),
    "the gazetteer query no longer matches altNames; the trigram index above " +
      "may now be 36MB of nothing, so check before deleting this test"
  );
});

test("a batch has exactly one group, and the database is what says so", () => {
  // joinBatchGroup was findFirst-by-name then create with nothing unique behind
  // it, so two members of the same batch registering in the same second both
  // created "Batch of 2010" and the batch was permanently split (bug audit
  // B-121). Identity is a column now, not display text somebody could rename.
  const body = model("Group");
  assert.ok(
    /batchYear\s+Int\?\s+@unique/.test(body),
    "Group.batchYear is no longer a unique column: nothing stops two groups " +
      "for one batch, and launch day is the concurrency that produces them"
  );

  const signup = readFileSync(resolve(ROOT, "src/components/auth/actions.ts"), "utf8");
  const i = signup.indexOf("async function joinBatchGroup");
  const fn = signup.slice(i, signup.indexOf("\n}", i));
  assert.ok(
    /P2002/.test(fn),
    "joinBatchGroup does not answer the unique violation, so the loser of the " +
      "race throws out of registerUser instead of joining the group that won"
  );
  assert.ok(
    !/where: \{ name \}/.test(fn),
    "joinBatchGroup matches by name again, which nothing constrains"
  );
});
