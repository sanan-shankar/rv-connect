#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Nightly metric snapshot.
 *
 *  WHY: Sentry’s free plan drops errors after 30 days and PostHog keeps
 *  a year. Neither of them will say in 2028 what the
 *  site looked like in 2026, and none of it can be recovered once gone.
 *  This writes one row per metric per day into OUR database, so the admin
 *  room reads only Postgres -- fast, no API keys at page load, no vendor
 *  rate limit, and a history that outlives every free tier it came from.
 *
 *  Run: node scripts/ops/snapshot.mjs [--day YYYY-MM-DD] [--dry]
 *  Nightly via .github/workflows/snapshot.yml, at 00:10 UTC -- ten minutes
 *  after the UTC day rolls over. With no --day, this records the day that
 *  JUST ENDED, not "today": every source is then read at the boundary of the
 *  day it gets stamped with, instead of PostHog being asked for "today"
 *  three hours before the UTC day was actually over (audit Lows 51 + 103).
 *
 *  Each source is independent and failure-isolated: no vendor being down,
 *  rate-limited or unconfigured may cost us the database numbers, which are
 *  the ones that matter and the only ones that are exact.
 *
 *  --day backfills a SPECIFIC PAST day, and only PostHog can honestly answer
 *  one: PostHog is a real time series, but the database, Sentry and GitHub
 *  sources are point-in-time counts with no history behind them. Recording
 *  today's member count under last Tuesday's date would be a lie in a table
 *  whose whole purpose is a time series, so a backfill collects PostHog alone
 *  and leaves the other three absent for that row rather than wrong
 *  (audit Low 104).
 * ------------------------------------------------------------------ */

import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env", quiet: true });

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const dayArg = args[args.indexOf("--day") + 1];
/* BACKFILL is true only when a past day was explicitly requested. The
 * ordinary nightly run (no --day) is NOT a backfill even though it stamps
 * "yesterday" -- it runs ten minutes after that day ended, close enough to
 * the boundary that the point-in-time sources are still an honest read of
 * that day's final state. An explicit --day for an arbitrary past date has
 * no such claim: only PostHog gets queried for it, below. */
const BACKFILL = args.includes("--day");
const DAY = BACKFILL ? new Date(`${dayArg}T00:00:00Z`) : startOfUtcYesterday();

/* The day that just ended, in UTC. Date.UTC handles month/year rollover
 * itself (day 0 of a month is the last day of the previous one), so this
 * needs no separate case for the 1st. */
function startOfUtcYesterday() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1));
}
function daysAgo(n) {
  return new Date(DAY.getTime() - n * 86_400_000);
}

/* pg directly, not the Prisma client: the generated client is TypeScript and
 * a plain .mjs script cannot import it. Raw SQL is also the better fit here --
 * twenty counts in ONE round trip instead of twenty, which matters on a pooled
 * connection from a CI runner in another continent. Same connection choice as
 * scripts/dev/run-sql.mjs: the session pooler, falling back to the app URL. */
const db = new pg.Client({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

/** Everything collected this run, flattened to {source, metric, value}. */
const rows = [];
const add = (source, metric, value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return;
  rows.push({ source, metric, value: Number(value) });
};

/* ---------------------------------------------------------------- *
 *  1. Our own database. Exact, free, and the only source that can be
 *     asked about the past -- so these are computed fresh every night
 *     rather than trusted from yesterday's row.
 * ---------------------------------------------------------------- */
const DB_ALARM_MB = 350;
let dbAlarm = null;

async function collectDb() {
  const d7 = daysAgo(7).toISOString();
  const d30 = daysAgo(30).toISOString();

  /* One statement, twenty answers. Each scalar subquery is independent, so
   * Postgres runs them without a single join, and the whole thing costs one
   * network round trip instead of twenty from a CI runner in another
   * continent.
   *
   * Money is filtered on livemode EVERYWHERE it appears. This database is
   * shared with local dev and a Razorpay test order is indistinguishable from
   * a real one by its ids alone (see the Contribution model), so anything
   * summing this table for a figure a human reads must filter or a developer's
   * test payment silently becomes revenue. */
  const { rows: [r] } = await db.query(`
    SELECT
      (SELECT count(*) FROM "User")                                        AS members_total,
      (SELECT count(*) FROM "User" WHERE "emailVerified" IS NOT NULL)      AS members_verified,
      (SELECT count(*) FROM "User" WHERE "isBlocked")                      AS members_blocked,
      (SELECT count(*) FROM "User" WHERE theme = 'dark')                   AS members_dark,
      (SELECT count(*) FROM "User" WHERE "lastSeenAt" >= $1)               AS active_7d,
      (SELECT count(*) FROM "User" WHERE "lastSeenAt" >= $2)               AS active_30d,
      (SELECT count(DISTINCT "userId") FROM "UserPlace")                   AS members_placed,

      (SELECT count(*) FROM "Post" WHERE kind = 'post')                    AS posts_total,
      (SELECT count(*) FROM "Post" WHERE kind = 'letter')                  AS letters_total,
      (SELECT count(*) FROM "Comment")                                     AS comments_total,
      (SELECT count(*) FROM "Like")                                        AS likes_total,
      (SELECT count(*) FROM "Bookmark")                                    AS bookmarks_total,
      (SELECT count(*) FROM "Photo")                                       AS photos_total,
      (SELECT count(*) FROM "PhotoLove")                                   AS photo_loves,

      (SELECT count(*) FROM "CatchupEntry")                                AS catchup_entries,
      (SELECT count(*) FROM "CatchupPrompt")                               AS catchup_prompts,

      (SELECT count(*) FROM "OutboundEmail" WHERE status = 'sent')         AS mail_sent,
      (SELECT count(*) FROM "OutboundEmail" WHERE status = 'failed')       AS mail_failed,
      (SELECT count(*) FROM "OutboundEmail" WHERE "deliveredAt" IS NOT NULL) AS mail_delivered,
      (SELECT count(*) FROM "OutboundEmail" WHERE "bouncedAt" IS NOT NULL)   AS mail_bounced,

      (SELECT count(*) FROM "Contribution" WHERE livemode)                 AS give_started,
      (SELECT count(*) FROM "Contribution" WHERE livemode AND status = 'paid')       AS give_count,
      (SELECT coalesce(sum(amount),0) FROM "Contribution" WHERE livemode AND status = 'paid') AS give_paise,
      (SELECT count(DISTINCT "userId") FROM "Contribution"
        WHERE livemode AND status = 'paid' AND "userId" IS NOT NULL)       AS give_people,

      pg_database_size(current_database())                                 AS db_bytes
  `, [d7, d30]);

  const n = (k) => Number(r[k]);

  add("db", "members.total", n("members_total"));
  add("db", "members.verified", n("members_verified"));
  add("db", "members.blocked", n("members_blocked"));
  add("db", "members.dark_mode", n("members_dark"));
  add("db", "members.active_7d", n("active_7d"));
  add("db", "members.active_30d", n("active_30d"));
  add("db", "members.placed", n("members_placed"));

  add("db", "posts.total", n("posts_total"));
  add("db", "letters.total", n("letters_total"));
  add("db", "comments.total", n("comments_total"));
  add("db", "likes.total", n("likes_total"));
  add("db", "bookmarks.total", n("bookmarks_total"));
  add("db", "photos.total", n("photos_total"));
  add("db", "photos.loves", n("photo_loves"));

  add("db", "catchups.entries", n("catchup_entries"));
  add("db", "catchups.prompts", n("catchup_prompts"));
  /* Answers per question asked -- the number that says whether Catch-ups are
   * actually working rather than merely existing. */
  if (n("catchup_prompts") > 0) {
    add("db", "catchups.answers_per_prompt", n("catchup_entries") / n("catchup_prompts"));
  }

  add("db", "mail.sent", n("mail_sent"));
  add("db", "mail.failed", n("mail_failed"));
  add("db", "mail.delivered", n("mail_delivered"));
  add("db", "mail.bounced", n("mail_bounced"));

  add("db", "contributions.started", n("give_started"));
  add("db", "contributions.count", n("give_count"));
  add("db", "contributions.paise", n("give_paise"));
  add("db", "contributions.people", n("give_people"));
  /* The conversion the owner asked about first: of everyone who could give,
   * how many have. */
  if (n("members_total") > 0) {
    add("db", "contributions.rate", n("give_people") / n("members_total"));
  }
  /* And the other half of that funnel -- started but never completed -- which
   * Razorpay's own dashboard cannot line up against membership. */
  if (n("give_started") > 0) {
    add("db", "contributions.completion_rate", n("give_count") / n("give_started"));
  }

  /* The database's own size, and an ALARM, because nothing else watches it:
   * the Free plan makes the whole database read-only at 500 MB, and until
   * 2026-09-30 the first sign of that would have been every write in the app
   * failing (bug audit 3, L5-02 / L5-08). Supabase's meter reads ~20 MB above
   * pg_database_size (140 vs 119 MB on 2026-09-29), so the line is 350 MB:
   * months of warning at today's growth, not days. Past it this job fails,
   * which emails the owner, and says in plain words what to do. */
  add("db", "database.bytes", n("db_bytes"));
  const mb = Math.round(n("db_bytes") / 1e6);
  if (mb >= DB_ALARM_MB) {
    dbAlarm = `Database is ${mb} MB (Postgres's own count). Supabase's Free plan makes it read-only at 500 MB. ` +
      `Look at docs/OPERATIONS.md, "Database size", before it gets there.`;
  }

  return `${n("members_total")} members, ${n("give_count")} contributions, database ${mb} MB`;
}

/* ---------------------------------------------------------------- *
 *  2. Sentry. Errors only -- stack traces stay in Sentry, which is
 *     where they are actually useful.
 * ---------------------------------------------------------------- */
async function collectSentry() {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) return "skipped (no SENTRY_AUTH_TOKEN)";

  const org = process.env.SENTRY_ORG ?? "sanan-l0";
  const project = process.env.SENTRY_PROJECT ?? "javascript-nextjs";
  const base = "https://sentry.io/api/0";

  const res = await fetch(
    `${base}/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=24h`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Sentry ${res.status} ${await res.text()}`);
  const issues = await res.json();

  add("sentry", "issues.unresolved", issues.length);
  add(
    "sentry",
    "events.24h",
    issues.reduce((n, i) => n + Number(i.count ?? 0), 0),
  );
  add("sentry", "users.affected.24h", issues.reduce((n, i) => n + Number(i.userCount ?? 0), 0));
  return `${issues.length} unresolved issues`;
}

/* ---------------------------------------------------------------- *
 *  3. PostHog. Headline numbers only. Funnels and paths are built in
 *     PostHog's own UI and there is no point reimplementing them.
 * ---------------------------------------------------------------- */
async function collectPostHog() {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!key || !projectId) return "skipped (no POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID)";

  const iso = DAY.toISOString().slice(0, 10);
  /* HogQL, so one round trip answers several questions and the shape of the
   * answer is ours rather than whatever a canned endpoint returns. */
  const query = `
    SELECT
      count() AS events,
      count(DISTINCT person_id) AS people,
      countIf(event = '$pageview') AS pageviews
    FROM events
    WHERE toDate(timestamp) = toDate('${iso}')
  `;
  const res = await fetch(`https://eu.posthog.com/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!res.ok) throw new Error(`PostHog ${res.status} ${await res.text()}`);
  const data = await res.json();
  const [events, people, pageviews] = data.results?.[0] ?? [];

  add("posthog", "events", events);
  add("posthog", "people", people);
  add("posthog", "pageviews", pageviews);
  return `${events ?? 0} events, ${people ?? 0} people`;
}

/* ---------------------------------------------------------------- *
 *  4. GitHub Actions. Specifically: did last night's BACKUP run, and
 *     did it pass. Everything else here is replaceable; that one is not.
 * ---------------------------------------------------------------- */
async function collectGithub() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return "skipped (no GITHUB_TOKEN)";
  const repo = process.env.GITHUB_REPOSITORY ?? "sanan-shankar/rv-connect";

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/backup.yml/runs?per_page=10`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const { workflow_runs: runs = [] } = await res.json();

  /* runs[0] is the most RECENT run, not the most recent FINISHED one -- a
   * manually dispatched or still-running backup sorts first with
   * conclusion: null, and null === "success" is false, so the naive read
   * recorded a healthy backup as a failure while it was still mid-dump.
   * Only a completed run has an honest conclusion. */
  const completed = runs.filter((r) => r.status === "completed");
  const last = completed[0];
  if (last) {
    add("github", "backup.ok", last.conclusion === "success" ? 1 : 0);
    if (last.updated_at) {
      add("github", "backup.age_hours", (Date.now() - Date.parse(last.updated_at)) / 3_600_000);
    }
  }
  add("github", "backup.failures_last_10", completed.filter((r) => r.conclusion === "failure").length);
  return `last backup ${last?.conclusion ?? "unknown (no completed run in last 10)"}`;
}

/* ---------------------------------------------------------------- */

async function main() {
  await db.connect();
  /* A backfill can only honestly supply PostHog (see the header comment) --
   * db/sentry/github are skipped outright rather than run and discarded, so
   * a --dry run also shows the true shape of what gets written. */
  const sources = BACKFILL
    ? [["posthog", collectPostHog]]
    : [
        ["db", collectDb],
        ["sentry", collectSentry],
        ["posthog", collectPostHog],
        ["github", collectGithub],
      ];
  if (BACKFILL) {
    console.log(
      "  backfill  -- db/sentry/github skipped, point-in-time sources with no history to backfill",
    );
  }

  for (const [name, fn] of sources) {
    try {
      const note = await fn();
      console.log(`  ${name.padEnd(8)} ok${note ? `  -- ${note}` : ""}`);
    } catch (err) {
      /* One source failing must never cost the others. The database numbers
       * are exact and free; a vendor being down is not a reason to lose them. */
      console.error(`  ${name.padEnd(8)} FAILED -- ${err.message}`);
    }
  }

  /* The exit code only; the write below still runs, so the size that tripped
   * the alarm is on the chart too. */
  if (dbAlarm) {
    console.error(`::error::${dbAlarm}`);
    process.exitCode = 1;
  }

  console.log(`\n${rows.length} metrics for ${DAY.toISOString().slice(0, 10)}`);
  if (DRY) {
    for (const r of rows) console.log(`  ${r.source}.${r.metric} = ${r.value}`);
    console.log("\n--dry: nothing written.");
    return;
  }

  /* Upsert on (day, source, metric): re-running today overwrites today rather
   * than doubling every chart. */
  /* ON CONFLICT on (day, source, metric): re-running for a day overwrites
   * that day rather than doubling every chart. One statement for the whole
   * batch. It is also what makes the move to recording the day that just
   * ENDED safe to land mid-life: the first run under the new schedule
   * replaces the partial row the old one wrote for that same day. */
  const day = DAY.toISOString().slice(0, 10);
  await db.query(
    `INSERT INTO "MetricSnapshot" ("id","day","source","metric","value")
     SELECT gen_random_uuid()::text, $1::date, s, m, v
     FROM unnest($2::text[], $3::text[], $4::double precision[]) AS t(s, m, v)
     ON CONFLICT ("day","source","metric")
     DO UPDATE SET value = EXCLUDED.value, "capturedAt" = now()`,
    [day, rows.map((r) => r.source), rows.map((r) => r.metric), rows.map((r) => r.value)],
  );
  console.log(`Written ${rows.length} rows to MetricSnapshot for ${day}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.end());
