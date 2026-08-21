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
 *  prisma/schema.prisma, so it runs in the offline unit gate and fails the
 *  moment somebody adds a relation and forgets its index.
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
