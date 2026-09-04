#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Nightly pruning.
 *
 *  WHY: notifications are ~0.8KB each and accumulate. Measured against the
 *  current table, 2,000 members generating 500 notifications apiece is
 *  ~800MB, which on a 500MB free tier would matter. Two things bound it: a
 *  per-user cap of 100 applied on every first-page open (loadNotifications
 *  in src/app/(main)/notifications/actions.ts) and the age cutoff below.
 *
 *  ONE policy, not two, and it took two goes. The default here was 30 days
 *  while src/lib/retention.ts deleted the same table at a year, so the app
 *  documented one rule and this script quietly enforced a stricter one (bug
 *  audit M55). That fix raised this default to 365 -- and left --days 30 in
 *  snapshot.yml, which overrode it, so the split simply moved into the
 *  workflow file and outlived its own repair (refactor audit 2, ORCH-04).
 *  The owner settled it on 2026-09-04: 30 days is the real policy, the
 *  privacy page says so, the flag is deleted. retention.ts is the source of
 *  truth; this matches it, and exists alongside it only because a large
 *  backlog wants the batched delete below rather than one long statement.
 *
 *  The header used to claim "nothing else here grows unbounded". Visit and
 *  SearchLog, added 2026-08-19, did -- they are in the retention sweep now.
 *
 *  Run: node scripts/ops/prune.mjs [--days 30] [--dry]
 *  Nightly, from .github/workflows/snapshot.yml.
 * ------------------------------------------------------------------ */

import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env", quiet: true });

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
/** Matches KEEP_DAYS.notifications in src/lib/retention.ts. Change it there. */
const DEFAULT_DAYS = 30;
const DAYS = args.includes("--days") ? Number(args[args.indexOf("--days") + 1]) : DEFAULT_DAYS;

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
