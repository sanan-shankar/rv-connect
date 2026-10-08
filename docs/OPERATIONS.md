# Operations

Everything installed on 2026-08-19 that is not application code: what it does, how it is
used, and what breaks if it is ignored. **A tool nobody runs is worse than no tool**, so
each entry names the moment it is supposed to fire.

Security items are tracked separately in `docs/SECURITY.md` (and live on `npm run audit:status`), not here.

---

## 1. Playwright — the picture memory

**Fires:** after any UI change, before committing. `npm run visual`.

One line per route in `ROUTES` (`e2e/visual.spec.ts`), each with its reason, x 2 viewports
(1440x900 and 390x844), compared against baselines in `e2e/__screenshots__/`. Fails on a
difference of 100 pixels. Count the routes out of `ROUTES` when you need the number: it has
been 10, then 11, then 12 inside three weeks, and a count printed here rots every time.

| Command | Use |
|---|---|
| `npm run visual` | compare everything against baseline |
| `npm run visual:update` | the change was intentional; rewrites baselines, then **commit the PNGs** |
| `npm run visual:report` | the three-up expected/actual/diff view of the last failure |
| `npm run test:e2e` | the above plus the sign-in check |

**The one rule:** never run `visual:update` to silence a failure without opening the diff
first. That is the single action that turns this from a safety net into a rubber stamp.

**Why it is not a ratio.** The first version used `maxDiffPixelRatio: 0.01`, which sounds
strict and is not: 1% of a full-page shot is ~28,000 pixels. Verified by regression —
changing `/about` from `text-sm` to `text-base` **passed**. It is now an absolute
`maxDiffPixels: 100`, so the blind spot does not scale with the page.

**What is masked, and why** (`volatileRegions()` in `e2e/visual.spec.ts`): relative
timestamps from `formatTimeAgo`, the live contribution fill on `/support`, the hoopoe,
which idles forever and has no rest state, the notification bell's unread dot, and the
Collection's phone scrubber, which is a timer rather than a state and so may or may not be
on screen at the instant of a shot. The mascot keeps its own dedicated checks in
`scripts/qa/hoopoe-idle-check.mjs`; the scrubber has three in `e2e/collection-seek.spec.ts`.

**Six routes photograph a live database, and are masked further** (`live:` in `ROUTES`,
explained under `LIVE ROUTES` in the same file). Feed, directory, letters and catchups were
red on every run from 2026-08-25 because members were posting and signing up — eight
failures a session, none caused by a commit, which is how a suite stops being read at all.
`/collection` joined them on 2026-08-29 and `/collection?scope=class` on 2026-09-02. They
are not rebaselined against today's content, because that baseline is stale tomorrow.
Instead:

- **feed, letters, catchups and both halves of the Collection** are shot at viewport height
  with the content under the page header masked. One new post moves everything below it, so
  no per-element mask helps.
  Still compared: the sidebar, the mobile header, the background, and the header band
  itself — serif title, Canopy pill, spacing — which is where a token change shows first.
  `spine()` additionally pins the content column's x and width as numbers.
- **directory** drifts far more narrowly (the headcount, and cluster circles that grow with
  signups), so only the map drawing and the headcount are masked. The search field, the
  filter pills, the Map/Batches toggle and the map's container box are still compared, full
  page. It is the most fragile layout in the app and worth the precision.

**What masking the Collection cost, because it is a real hole and not a footnote.** Until
2026-08-29 `/collection` was the route that caught image-sizing regressions, and the class
half's empty state — what every class sees on its first day — was the only place that state
was photographed. The archive went from four photographs to twelve mid-session, then the
owner's 1,719-photograph album landed in the class half, and both viewports went red on
photographs with every pixel of chrome identical. That is the cry-wolf the masking exists to
stop, so both halves are masked and both of those coverages are now uncovered rather than
covered. **If full coverage of any of the six is ever wanted back, the answer is seeded
content — a database the suite owns — not a bigger mask.**

**Adding a route:** one line in `ROUTES`, with its reason. That is the whole procedure.

**Known gap:** this runs locally only, not in CI, because baselines rendered on macOS do
not match a Linux runner pixel for pixel. Making it a CI gate means generating baselines in
Docker. Worth doing if the discipline ever slips.

---

## 2. GitHub Actions

### `check.yml` — the gate, run by something other than memory
**Fires:** every push to `main`. ~3 minutes.

Runs `npm run check`, and deliberately nothing else. A push to this repo is a deploy, so
this is the last thing between a bad commit and members seeing it — and it has to be the
same list of gates the laptop runs, or a green local run still lands in your inbox as a
failure email. `scripts/qa/ci-parity.test.mjs` fails the build if a step is added here
that `npm run check` does not run.

### `backup.yml` — the one that must never be broken
**Fires:** nightly at 02:00 IST, and on demand via **Actions → backup → Run workflow**.

Supabase's free plan has **no automatic backups and no point-in-time recovery**. One
database serves production and local dev. `prisma db push` will try to DROP tables it
thinks are orphaned. Before this job, one bad command destroyed everything with no
recovery.

Dumps to a **private** R2 bucket, keeps 30 days plus the 1st of every month forever, and:

- **refuses to run** if the target bucket looks like the public media bucket
  (`rv-alumni-media` is served from a `pub-*.r2.dev` URL; a dump landing there would
  publish every member's personal data);
- **verifies the archive** before trusting it, failing if the table of contents is short or
  if `User` / `Post` / `Comment` / `Contribution` / `Photo` / `CatchupEntry` are absent. A
  dump nobody has read is a file, not a backup.

- **restores every night's dump into a throwaway Postgres 17** beside the job, the same
  way a real restore goes, and fails if a step errors or the members are not there. That
  rehearsal runs before the prune, so an old backup is only removed once a newer one has
  come back. Until 2026-09-30 no dump had ever been restored.

**The place list is kept apart.** `Place` (235k GeoNames rows, 36 of the 41 MB of table
data) never changes from the app, and every byte `pg_dump` reads counts against Supabase's
5 GB-a-month egress, so the nightly dump leaves its rows out. It is dumped once per version
to `postgres/place-<fingerprint>.dump` (never pruned), and each nightly dump carries that
fingerprint as `place` metadata. That cut about 1 GB a month of egress.

**Restore** into a fresh project, never over production. The workflow header has the four
commands; in order: `--schema=public --section=pre-data`, then the place list
`--data-only`, then `--section=data`, then `--section=post-data` (UserPlace's foreign key
to the place list is added last). Find the matching place list with
`aws s3api head-object --key postgres/rv-connect-YYYY-MM-DD.dump --query Metadata.place`.
Dumps from before 2026-09-30 still hold the place list and restore in one command.

The same workflow's **`media` job** copies every object in `rv-alumni-media` into the
private bucket under `media/`, server-side, **never with `--delete`**. This is the photo
archive's undelete: Cloudflare R2 has no object versioning on any plan, so the security
audit's "enable versioning" remediation (C2/C4) is impossible as written and this
scheduled copy is its named fallback. A photo deleted from the live bucket survives in
the backup until deliberately removed there. The job fails if the backup ever holds
fewer objects than the live bucket. Restore one photo:
```
aws s3 cp "s3://$R2_BACKUP_BUCKET/media/<key>" "s3://rv-alumni-media/<key>" --endpoint-url "https://<account-id>.r2.cloudflarestorage.com"
```

### `retention.yml` — the data that is supposed to expire, expiring
**Fires:** nightly at 02:30 IST, and on demand via **Actions → retention → Run workflow**.

One `curl` to `https://rishivalley.space/api/retention/sweep` carrying `CRON_SECRET`
(security audit M34). The route applies the owner's retention schedule (admin messages
2y, reports 3y, payments 10y, notifications 30d, login/audit logs 1y, sent-email log
180d) and makes 60-day-old deletion requests final, erasing the account's rows AND its
R2 images (audits H9/M35). It lives in Actions rather than a Vercel cron because the
Hobby plan allows two crons and both are spent (the Catch-up tick, the demo reset).

**Vercel crons run in UTC. GitHub Actions crons run in UTC.** Neither reads IST, and
`vercel.json`'s `0 2 * * *` is 02:00 UTC, which is **07:30 IST** -- the valley's
morning, not its night. The two GitHub schedules are written in UTC to land at night
here (`30 20 * * *` = 02:00 IST, `0 21 * * *` = 02:30 IST); the Vercel ones are not.
A comment in backup.yml claimed the two shared one quiet-hours window for months, and
they are five and a half hours apart (audit C-147). Convert before you compare.

**Needs the `CRON_SECRET` repository secret** — the same value set on the Vercel
project. Without it the job fails loudly with a 401, which is the correct symptom, and
nothing is swept until it is set. Every sweep writes a `retention.sweep` line to
/admin/audit, so "is this actually running" is answerable from inside the app.

### `snapshot.yml` — the only thing that remembers last year
**Fires:** nightly at 00:10 UTC (05:40 IST), and on demand via **Actions → snapshot → Run
workflow**, which takes an optional `day` to backfill.

Sentry’s free plan drops errors after 30 days and PostHog keeps a year. None of them can say in 2028 what this site looked like in 2026, and none of it is
recoverable once dropped. `scripts/ops/snapshot.mjs` writes the day's numbers into our own
database, which is what every chart in `/admin/analytics` reads. **A day it does not run is
a day permanently missing from those charts.**

It runs ten minutes *after* the UTC day rolls over and records the day that just ended. The
old 21:00 UTC schedule asked PostHog about "today" three hours before the day was over, so
02:30–05:30 IST — real usage for an Indian community — was never counted, on every day,
forever (audit Lows 51, 103). It also landed on the same minute as retention.yml (Low 102).

Every vendor key is optional: a source with no key is skipped and everything else is still
recorded, so a vendor being down never costs us the database numbers, which are the exact
ones. A backfill records PostHog alone, because the other sources are point-in-time counts
with no history and labelling today's counts as an older day's would be a lie (Low 104).

The same job then runs `scripts/ops/prune.mjs`. No `--days` flag: the window lives in
`KEEP_DAYS.notifications` and the script's default follows it, because a flag here and a
number there is exactly how the policy and the practice came apart (refactor audit 2,
ORCH-04). Notifications are the one table here that grows without bound — ~0.8KB each, and 2,000 members at 500 apiece is ~800MB
against a 500MB free tier.

#### Database size

The snapshot also records `db.database.bytes` (`pg_database_size`) and **fails the job, which
emails the owner, once it passes 350 MB**. The Free plan makes the whole database read-only at
500 MB, and before 2026-09-30 nothing watched it: the first sign would have been every write in
the app failing. Supabase's own meter reads about 20 MB higher than Postgres's count (140 vs
119 MB on 2026-09-29), hence 350 rather than 450. At 125 MB with ~280 members, the line is
months away. When it fires:

1. See what grew: `node scripts/dev/run-sql.mjs --inline "SELECT relname,
   pg_size_pretty(pg_total_relation_size(oid)) FROM pg_class WHERE relkind='r' AND
   relnamespace='public'::regnamespace ORDER BY pg_total_relation_size(oid) DESC LIMIT 10"`.
2. A log table (`LoginAttempt`, `Visit`, `ContentView`, `Notification`) that grew fast is a
   retention window or a flood. `LoginAttempt` failures are capped at 120 an hour
   (`src/lib/login-attempt.ts`) for exactly this reason.
3. `Place` is 97 MB of the total by itself: the static gazetteer and its search indexes. It is
   the largest single lever if the members' own data ever needs the room.
4. Supabase Pro ($25 a month) raises the line to 8 GB. That is the answer once the members'
   own data is what fills it.

### Minute budget
Private repos get **2,000 free minutes a month** and the account spending limit is **$0 by
default**, so exhausting them stops runs rather than producing a bill. Expected usage is
~350 minutes. Two things keep it there: `concurrency.cancel-in-progress` means a burst of
pushes costs one run, and every job sets `timeout-minutes`.

**If usage ever climbs:** Settings → Billing → check the limit is still $0, then trim
`check.yml` to run on pull requests only.

---

## 3. Sentry — the smoke alarm

**Fires by itself.** You do nothing until it emails you.

Server-side only, EU region, free Developer plan (5,000 errors and 10,000 spans a month;
the 14-day Business trial lapses back to free with no card on file and no charge).

**The sampling is sized for today's traffic and says so in the code** --
`tracesSampleRate: 0.1` in `src/instrumentation.ts`, justified there with "this site's
traffic is tiny". That justification inverts with scale (audit C-166): at 9,219 page views
a month, 10% tracing is around 900 traces, and a page-load trace is many spans, so the
10,000-span allowance is already the closer of the two limits rather than a distant one. At
2,000 members it is exceeded many times over. The error budget has a sharper edge: 5,000 a
month is about three hours of one hot-path bug on a busy day.

**Neither breaks the site.** Over quota, Sentry drops what it cannot take and the app
carries on; what is lost is the smoke alarm, at exactly the moment something is burning.
Tracing is the cheap thing to give up -- `tracesSampleRate` can go to 0.01 or 0 without
touching error reporting at all, which is the half that actually pages somebody.

**What it catches:** 500s, failed Server Actions, database errors — the class that produced
the "passed `tsc`, then 500'd the feed" incident in CLAUDE.md gotcha 3.

**What it does not catch:** crashes inside client components. There is no browser SDK,
because it costs ~30KB gzipped on every page load. If a member ever reports a blank screen
that Sentry knows nothing about, that is the gap, and adding `instrumentation-client.ts` is
the fix.

**Deliberate settings** (`src/instrumentation.ts`): `sendDefaultPii: false` so no IPs,
cookies or headers are attached; session replay never installed; disabled outside Vercel so
dev-server noise cannot spend the monthly budget; `NEXT_REDIRECT` and `NEXT_NOT_FOUND`
ignored, because Next implements `redirect()` and `notFound()` by throwing and every
redirect would otherwise file an issue.

Installed by hand rather than with `npx @sentry/wizard`, which would have added a
`/sentry-example-page` route, enabled session replay, and written an auth token into a new
`.env.sentry-build-plugin` file.

---

## 4. Renovate — dependency updates

**Fires:** Monday mornings, as one pull request.

Config in `.github/renovate.json`. Batched deliberately so it does not become noise. Four
things are never batched: **majors** get individual PRs so a broken build has an obvious
culprit; **prisma** and `@prisma/*` move together because a client/CLI mismatch typechecks
and then fails at runtime; **react**/**react-dom** are pinned exactly and must not drift;
**next-auth** is held 7 days and labelled `review-carefully`, because it is on a
`5.0.0-beta` that can change shape between patches and auth breaking is the worst failure
this site has. Security fixes ignore the schedule.

**A Playwright bump means re-running `npm run visual`** — the PR carries a label saying so.

**Two `overrides` entries live in `package.json`, and neither is permanent.** Both exist for
the same reason: a Prisma package pins a transitive dependency to an EXACT version that carries
an advisory, so npm's only offered fix is downgrading the Prisma CLI two majors.

| Override | Forced to | Pinned by | Closes | Delete it when |
|---|---|---|---|---|
| `deepmerge-ts` | `^8.0.2` | `@prisma/config` → exact `7.1.5` | GHSA-ggr8-5vv4-36mx, stack exhaustion on recursive object graphs | `@prisma/config` depends on 8 |
| `mysql2` | `^3.24.3` | `prisma` → exact `3.15.3` | its advisory is in a MySQL driver this Postgres-only project never loads; the override exists to satisfy a scanner, not to close an exposure | `prisma` ships a newer pin |

`prisma validate` and `prisma generate` were both run against them.

**Three more used to be here and were doing nothing** (`browserslist`, `postcss-selector-parser`,
`fast-uri`). Every parent asking for those was asking with a caret range, so a fresh resolution
already picked a version at or above the pin. Removed 2026-09-05, after `npm install` proved the
counterfactual: every resolved version came back identical and the advisory gate stayed clean.
That paragraph's own closing sentence is why it was worth checking, and it is still the rule:
**an override that outlives its reason is a pin nobody remembers making.** The proof is
`npm run check`, which runs both security gates, not anybody's reading of a range.

---

## 5. Bundle analyzer

**Fires:** when you ask. `npm run analyze`.

Runs Next's own analyzer. Exists because this project already holds the principle —
*"parked code should not ride in bundles it is not used by"* — and had no way to check it.
The `optimizePackageImports` bet on `@phosphor-icons/react` in `next.config.ts` has never
been confirmed by anything but reasoning.

Until 2026-08-26 this script wrapped the config in `@next/bundle-analyzer` and produced
nothing at all: that wrapper is webpack-only, every build here is Turbopack, and the build
said so on each run — *"The Next Bundle Analyzer is not compatible with Turbopack builds,
no report will be generated."* The wrapper and its dependency are gone. If
`experimental-analyze` is ever unavailable, per-route JS sizes can still be read out of
`.next`'s build manifest.

---

## 6. Resend delivery reports

**Fires by itself.** Bounces appear in the admin worklist under Email.

`OutboundEmail.status` used to stop at "sent", meaning only that Resend accepted the
message. `/api/resend/webhook` now records `deliveredAt`, `bouncedAt`, `bounceKind` and
`complainedAt` against the row, matched on `providerId` (Resend's message id, captured at
send time).

A **bounce sets `status: "failed"`** on purpose rather than inventing a sixth status, so it
lands on the admin worklist the owner already reads, with `lastError` explaining why. Hard
vs soft is kept raw in `bounceKind`: a hard bounce means the address is dead, a soft one is
a full mailbox, and nothing has decided yet what to do about either.

Signatures are verified by hand (Svix scheme, one HMAC plus a five-minute replay window)
rather than by adding the `svix` package. Needs `RESEND_WEBHOOK_SECRET` in Vercel.

**Not tracked, deliberately:** opens and clicks. Those need a tracking pixel in members'
mail, and this is a community's inbox, not a marketing funnel.

---

## 7. PostHog — what members actually do

**Fires by itself.** Read it at **https://eu.posthog.com**.

Funnels, paths, search terms, conversion. Free tier is **1M events a month**.

**How close we are, measured rather than guessed (2026-08-25):** 63 members produced 9,219
page views in the last thirty days. Autocapture is on, plus a pageview per client-side
navigation and a pageleave, and every click is its own event -- call it four or five events
a page view. So today is somewhere around 40k events a month: about 4% of the ceiling, and
nothing to think about.

**It does not stay nothing to think about.** That is ~146 page views per member per month,
and the number that matters scales with MEMBERS, not with time. At the 2,000 the project
plans for, the same behaviour is roughly 292k page views and therefore well over 1M events.
This paragraph used to say "usage of maybe 600k a *year*, so there is no bill to reach",
which was true at 52 members and is off by two orders of magnitude at 2,000 (audit C-165).

**What happens at the ceiling is not a broken site.** PostHog stops ingesting for the rest
of the billing month unless there is a card on file; the app itself is unaffected, because
every capture is fire-and-forget in the browser. What is lost is the DATA -- and the month
it would be lost in is launch month, which is the one month worth measuring. The lever, if
it comes to it, is one line: `capture_pageleave: false` roughly halves it, and PostHog's
own `before_send` sampling can take any fraction from there. Decide before launch, not
during.

**Routed through `/ingest` on our own domain** (rewrites in `next.config.ts`). Ad blockers
list posthog.com, so a direct connection loses ~10-25% of visitors silently.

**Session replay is off and stays off** (`disable_session_recording`). Real names, home
addresses and photographs of other people are on that screen.

`identify()` sends the opaque cuid plus `accountType` and `batchYear`. Never the name,
email, city or phone. Enough to answer "which batch uses the map", nothing more.

**Turn on freely later, all free:** feature flags, surveys, experiments. **Do not turn on:**
session replay, and PostHog's error tracking — Sentry does that better and running both
means every error files twice.

**Own traffic:** admins are tagged `isOwner: true`. The owner's own account and the Jerry
Maguire test account are opted out of capture entirely (`src/lib/stats-exclusion.ts`), and the
same two accounts are left out of every activity number in `/admin/analytics`. The database
side records visits, searches and views only on the production deployment; `PRESENCE_IN_DEV=1`
turns that back on locally when the recording itself needs proving.

**Verifying a change locally:** `NEXT_PUBLIC_POSTHOG_DEV=1`, otherwise dev opts out so
localhost clicking cannot pollute the funnels.

---

## 8. knip — what nothing points at any more

**Fires:** when you ask. `npx knip --config scripts/qa/knip.jsonc`. Not a dependency and
not in the gate; it is the tool you reach for at the start of a cleanup, and once a release.
The flag is not optional: knip only looks for a config at the repo root, and this one was
moved out of the root on 2026-08-28 (see below).

It answers one question — which files and exports nothing imports — and it was answering it
uselessly. Almost nothing here is reachable from `src`: the unit gate discovers its test
files by glob, the QA and dev scripts are run by hand or by `check.mjs`, Playwright loads
`e2e/`, the Prisma CLI loads `prisma.config.ts`. knip counted every one of those as dead and
reported **131 unused files**, 75 of them tests. A list that long is a list nobody reads,
which is why the 2026-08-25 audit had to find the dead code by hand.

`scripts/qa/knip.jsonc` names those as entry points. It sat at the repo root until
2026-08-28 and moved because a root entry for a tool that is not installed was not paying
for itself; its globs are still written relative to the root, which is where knip runs.
The list is now **5**, and all five are the landing showcase, which is genuinely
unreferenced because the flag that rendered it is off (report §4 #1, still the owner's
call). That is the tool working: what remains is a question, not noise.

The export list (~58) is mostly `/lab`, which is a deliberate exception — a lab room's
exports exist to be read, not imported.

---

## Capacity: what 2,000 members costs

**Measured, never estimated per visit.** The first forecasts here priced CPU per real visit and
said Hobby would hold 2,000 members; at ~150 the site hit Hobby's CPU ceiling and was moved to
Pro, because Next's link prefetching was rendering ~18 pages on the server for every page a
member opened (TRAPS.md, "Next.js"; fixed 2026-09-29). Every figure below comes from
`vercel metrics`, `vercel usage`, SQL or the Supabase dashboard, dated. Anything projected says
so. Re-measure before trusting a projection; the commands are at the end.

### Vercel (Pro: $20 a month, which includes $20 of usage credit)

| | Week before the prefetch fix (09-22..28) | 8 days after (09-30..10-07) |
|---|---|---|
| Real page views (`Visit`) | 3,291 | 5,818, a busier week |
| Active CPU | 84 min | 47 min |
| CPU per real page view | 1.53 s | **0.48 s (−69%)** |
| Server calls per real page view | 16.6 | 5.9 |
| Usage cost (beyond the plan line) | $1.13 a week | $1.20 for 10-01..07, of which ~$0.59 scales with traffic; billed beyond the plan $0.00 |

**Projection to 2,000 members** (~7× today's ~290), from the measured per-view cost: roughly
$9–18 a month of usage depending on how active people are (the low end at the steady
1.3 views/member/day of 10-03..07, the high end at launch-week activity), inside or at the edge
of the $20 credit, so the bill stays at or near the $20 plan fee. **Hobby cannot hold 2,000
members**, and Hobby is for non-commercial use while the site takes contributions. Pro is the
plan for 2,000.

A bot can still spend money that members never would. Vercel's default only *emails*, at $200.
**Spend Management** (Settings → Billing) can pause the project at a hard cap instead; that is
the owner's switch.

### Supabase (Free)

Free quotas: database 500 MB per project, egress 5 GB a month, log ingestion 1 GB (as the
dashboard shows it). Over a quota Supabase gives a grace period, then may pause the project, make
the database read-only, or answer 402 to every request (its billing FAQ). So each line matters.

| Quota | 2026-09-29 | At 2,000 members (projected) | Guard |
|---|---|---|---|
| Database size | 140 MB on Supabase's meter; 119 MB by Postgres, of which 97 MB is the static place list and 23 MB everything else | ~270–290 MB (the 23 MB scaled 7×, plus the place list) | nightly alarm at 350 MB (§2, `snapshot.yml`); sign-in failure rows capped at 120 an hour |
| Egress | 0.39 of 5 GB, 10-01..08 (cycle runs 1st to 1st). **~60 KB per real page view**, steady across days (10-01: 153 MB / 2,364 views; 10-05: 25 MB / 427; 10-07: 14 MB / 227) | ~4.7 GB a month at the steady 1.3 views/member/day, more in a busy month: **the binding Free-plan limit, reached somewhere between ~1,100 and 2,000 members** | the organisation Usage page's daily chart; cut the bytes per page, or Supabase Pro when it nears |
| Log ingestion | 1.55 of 1 GB in September (over); 0.435 GB 10-01..08, still the Data API loop. Marked UPCOMING, not yet enforced | ~0 from that source since the owner pointed both projects' Data API at `api` alone on 2026-10-08 | re-read the meter a few days later: it should stop climbing |
| Connections | peak 12 of 60 | pooled; not the constraint | — |
| CPU / RAM (nano) | 2% / 53% | — | — |

**For the next month**, at ~300 members: database ~25% of its limit, egress well under once the
backup change lands, log ingestion back under once the Data API setting is changed. That last one
is the only open item, and it needs the owner's dashboard. **At 2,000 members** the projection
fits the Free plan with less room, and egress is the line to watch: nothing measures the app's
share of it directly yet. Supabase Pro ($25 a month: 8 GB database, 250 GB egress) is the answer
when either line gets near.

### Re-measuring (from `/tmp`; the repo is not `vercel link`ed)

- CPU by route: `vercel metrics vercel.function_invocation.function_cpu_time_ms -p rv-alumni -a sum --since 1d --group-by route --order-by value -F json`
- The same split by `--group-by function_start_type`: deploys make cold starts, which are not traffic.
- Money: `vercel usage --from YYYY-MM-DD --to YYYY-MM-DD`.
- Real page views, to divide by: `SELECT sum(views) FROM "Visit" WHERE "startedAt" > now() - interval '1 day'`.
- Database size: `db.database.bytes` in `/admin/analytics`, or `SELECT pg_size_pretty(pg_database_size(current_database()))`.

## Still to do
- **Staging database** — a second Supabase project so schema changes get a rehearsal.
  Data fixes (capitalisations, cities) would continue to run against production exactly as
  they do today; only structure changes gain a dry run.
- **Cron monitoring** — the two jobs in `vercel.json` can stop silently. Deliberately
  deferred; can be done with no third party by logging each run and surfacing it on
  `/admin`.
