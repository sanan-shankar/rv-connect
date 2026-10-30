import test from "node:test";
import assert from "node:assert/strict";
import { read, decomment } from "../../src/lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The nightly snapshot watches the database's size, and says where it is.
 *
 *  Nothing else in the project measures it. Until 2026-09-30 the first sign
 *  of the plan's size line would have been the line itself (bug audit 3,
 *  L5-02 / L5-08), and when the alarm does trip, the first question is
 *  which table grew, which only a history of per-table sizes can answer.
 *  Source pins, since the job runs against production from CI and has no
 *  offline half to exercise.
 * ------------------------------------------------------------------ */

const src = decomment(read("scripts/ops/snapshot.mjs"));

test("the snapshot records the database's own size every night", () => {
  assert.match(src, /pg_database_size\(current_database\(\)\)\s+AS\s+(\w+)/, "the size is no longer read");
  assert.match(src, /add\(\s*"db",\s*"database\.bytes"/, "db.database.bytes is no longer recorded");
});

test("the job fails, and so emails the owner, well before the plan's 500 MB", () => {
  const m = src.match(/const DB_ALARM_MB\s*=\s*([\d_]+)/);
  assert.ok(m, "the size alarm is gone");
  const mb = Number(m[1].replace(/_/g, ""));
  /* Supabase's own meter reads about 20 MB above pg_database_size, and the
     alarm is only worth anything with months of growth still in hand. */
  assert.ok(mb >= 250 && mb <= 400, `an alarm at ${mb} MB is too late or too noisy for a 500 MB line`);
  assert.match(src, /mb\s*>=\s*DB_ALARM_MB/, "the alarm no longer compares the size with its line");
  assert.match(src, /process\.exitCode\s*=\s*1/, "a tripped alarm no longer fails the job");
});

test("it records where the size is: the largest tables, each by name", () => {
  assert.match(src, /pg_total_relation_size\(/, "the per-table sizes are no longer read");
  assert.match(src, /add\(\s*"db",\s*`table\.\$\{[^}]+\}\.bytes`/, "the per-table sizes are no longer recorded");
});
