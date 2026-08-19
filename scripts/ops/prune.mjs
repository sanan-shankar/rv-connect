#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Nightly pruning.
 *
 *  WHY: notifications are ~0.8KB each and accumulate forever. Measured
 *  against the current table, 2,000 members generating 500 notifications
 *  apiece is ~800MB -- on a 500MB free tier, the ONE thing in this schema
 *  that can actually exhaust it. Nothing else here grows unbounded: Place
 *  is fixed reference data, and every file lives in R2.
 *
 *  Run: node scripts/ops/prune.mjs [--days 30] [--dry]
 *  Nightly, from .github/workflows/snapshot.yml.
 * ------------------------------------------------------------------ */

import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env", quiet: true });

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const DAYS = args.includes("--days") ? Number(args[args.indexOf("--days") + 1]) : 30;

if (!Number.isFinite(DAYS) || DAYS < 7) {
  console.error(`Refusing to prune with --days ${DAYS}. Minimum 7.`);
  process.exit(1);
}

const db = new pg.Client({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  await db.connect();

  const cutoff = new Date(Date.now() - DAYS * 86_400_000).toISOString();

  const { rows: [before] } = await db.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE "createdAt" < $1)::int AS stale,
            count(*) FILTER (WHERE "createdAt" < $1 AND NOT read)::int AS stale_unread
     FROM "Notification"`,
    [cutoff],
  );

  console.log(`Notifications: ${before.total} total, ${before.stale} older than ${DAYS} days`);
  /* Reported separately, not spared. A notification nobody opened in a month
   * is not going to be opened; the owner asked for a flat 30 days. Worth
   * printing so the number is visible if that judgement ever needs revisiting. */
  console.log(`  (of those, ${before.stale_unread} were never read)`);

  if (DRY) {
    console.log("--dry: nothing deleted.");
    return;
  }
  if (before.stale === 0) {
    console.log("Nothing to prune.");
    return;
  }

  /* Batched. One unbounded DELETE would hold a long transaction against the
   * session pooler and lock rows the app is trying to read; 5,000 at a time
   * keeps each statement short. */
  let deleted = 0;
  for (;;) {
    const { rowCount } = await db.query(
      `DELETE FROM "Notification"
       WHERE id IN (
         SELECT id FROM "Notification" WHERE "createdAt" < $1 LIMIT 5000
       )`,
      [cutoff],
    );
    deleted += rowCount;
    if (rowCount === 0) break;
  }

  console.log(`Deleted ${deleted} notifications older than ${DAYS} days.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.end());
