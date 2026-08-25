# Operations

Everything installed on 2026-08-19 that is not application code: what it does, how it is
used, and what breaks if it is ignored. **A tool nobody runs is worse than no tool**, so
each entry names the moment it is supposed to fire.

Security items are tracked separately in `docs/SECURITY.md` (and live on `npm run audit:status`), not here.

---

## 1. Playwright — the picture memory

**Fires:** after any UI change, before committing. `npm run visual`.

10 routes x 2 viewports (1440x900 and 390x844) compared against baselines in
`e2e/__screenshots__/`. 50 seconds. Fails on a difference of 100 pixels.

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
timestamps from `formatTimeAgo`, the live contribution fill on `/support`, and the hoopoe,
which idles forever and has no rest state. The mascot keeps its own dedicated checks in
`scripts/qa/hoopoe-idle-check.mjs`.

**Adding a route:** one line in `ROUTES`, with its reason. That is the whole procedure.

**Known gap:** this runs locally only, not in CI, because baselines rendered on macOS do
not match a Linux runner pixel for pixel. Making it a CI gate means generating baselines in
Docker. Worth doing if the discipline ever slips.

---

## 2. GitHub Actions

### `check.yml` — the gate, run by something other than memory
**Fires:** every push to `main`. ~3 minutes.

Runs `npm run check`. A push to this repo is a deploy, so this is the last thing between a
bad commit and members seeing it.

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

**Restore:**
```
pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DIRECT_URL" rv-connect-YYYY-MM-DD.dump
```
Rehearse against staging, never straight at production.

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
2y, reports 3y, payments 10y, notifications 1y, login/audit logs 1y, sent-email log
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

---

## 5. Bundle analyzer

**Fires:** when you ask. `npm run analyze`.

A no-op without `ANALYZE=true`, so members pay nothing. Exists because this project already
holds the principle — *"parked code should not ride in bundles it is not used by"* — and had
no way to check it. The `optimizePackageImports` bet on `@phosphor-icons/react` in
`next.config.ts` has never been confirmed by anything but reasoning.

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

Funnels, paths, search terms, conversion. Free tier is 1M events a month against usage of
maybe 600k a *year*, so there is no bill to reach.

**Routed through `/ingest` on our own domain** (rewrites in `next.config.ts`). Ad blockers
list posthog.com, so a direct connection loses ~10-25% of visitors silently.

**Session replay is off and stays off** (`disable_session_recording`). Real names, home
addresses and photographs of other people are on that screen.

`identify()` sends the opaque cuid plus `accountType` and `batchYear`. Never the name,
email, city or phone. Enough to answer "which batch uses the map", nothing more.

**Turn on freely later, all free:** feature flags, surveys, experiments. **Do not turn on:**
session replay, and PostHog's error tracking — Sentry does that better and running both
means every error files twice.

**Own traffic:** the admin is tagged `isOwner: true` rather than opted out. Hide it project-
wide from Settings → Project → *Filter out internal users* if the numbers start looking odd.

**Verifying a change locally:** `NEXT_PUBLIC_POSTHOG_DEV=1`, otherwise dev opts out so
localhost clicking cannot pollute the funnels.

---

## Still to do
- **Staging database** — a second Supabase project so schema changes get a rehearsal.
  Data fixes (capitalisations, cities) would continue to run against production exactly as
  they do today; only structure changes gain a dry run.
- **Cron monitoring** — the two jobs in `vercel.json` can stop silently. Deliberately
  deferred; can be done with no third party by logging each run and surfacing it on
  `/admin`.
