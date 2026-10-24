# V-L-c — adversarial validation of L5 (scale-2k-and-connection-budget) and L8 (platform-limits)
Validator: V-L-c · Run: 2026-10-24 · Model: Opus 5.5 · Code read at HEAD `36ed27d3` (five peer trivia/birds commits past `88642426`; none touches a cited line except `src/lib/last-seen.ts`/`stats-exclusion.ts`/`retention.ts`, checked).
Method: `work/brief-validator.md`; rules `brief-common.md` §3 (read-only, SELECT/EXPLAIN only, no gates, no browser, no sign-in). Vendor pages re-fetched 2026-10-24 where a verdict leans on them; Vercel read through GET-only `vercel api` / `vercel usage` / `vercel metrics` from `/tmp`, as L8 did.

## Board
| id | filed | verdict at HEAD | severity now |
|---|---|---|---|
| L5-01 | Critical | **MOOT-SINCE** the Vercel Pro move (team `planChangedAt` 2026-09-21 06:56 UTC, i.e. BEFORE the finding was written) + `19be10b0`; attribution refuted by measurement | none (cost line) |
| L5-02 | Critical | **DOWNGRADED to Medium** — DB half **FIXED-SINCE `e29823cb`**; Upstash half stands and now chains into L8-04's spend cap | Medium |
| L5-03 | Medium | **DOWNGRADED to Low**, fold into T1-17 (canonical class) | Low |
| L5-04 | Medium | CONFIRMED-CORRECTED | Medium |
| L5-05 | Low | CONFIRMED-CORRECTED | Low |
| L5-06 | Low | CONFIRMED-CORRECTED | Low |
| L5-07 | Critical | **DOWNGRADED to High** — backup half **FIXED-SINCE `4487283b`**; app half stands, crossing re-derived | High |
| L5-08 | High | **DOWNGRADED to Low** — "nothing measures" **FIXED-SINCE `e29823cb`**; mechanism re-ruled (L8); growth projection refuted by measured rates | Low |
| L5-09 | Low | CONFIRMED-CORRECTED | Low |
| L5-10 | Low | CONFIRMED-CORRECTED | Low |
| L5-11 | Low | **MOOT-SINCE** the Vercel Pro move (2026-09-21) | none |
| L5-12 | Low | **REFUTED** (consequence unreachable at measured data size; mechanism folds into T7b-10) | — |
| L8-01 | Low (re-ruled by L8) | CONFIRMED | Low |
| L8-02 | Low | CONFIRMED | Low |
| L8-03 | Low | CONFIRMED | Low |
| L8-04 | Medium | CONFIRMED-CORRECTED (cost per request ~2x L8's; Supabase half measured negligible) | Medium |
| L8-05 | High | **FIXED-SINCE `b6cbdfc0`** | closed |
| L8-06 | Medium | CONFIRMED | Medium |
| L8-07 | Low | **MOOT-SINCE** repository public (~2026-10-02, `44516525`) | none |
| L8-08 | Low | CONFIRMED | Low |
| L8-09 | Low | CONFIRMED-CORRECTED (one more stale Resend line; cron lateness is worse than item 1 says) | Low |
| L8-10 | Low | CONFIRMED | Low |

## The two facts this zone rests on, re-verified today

**1. Production has been on Vercel Pro since 2026-09-21 — three days before L5 was written.** `vercel api /v2/teams/sanan-shankars-projects` (GET, 2026-10-24): `billing.planChangedAt` = **2026-09-21 06:56 UTC**, and the team's `entitlements.observability.createdAt` is the same minute; the 150th member joined 2026-09-20 15:10 UTC (live `row_number() OVER (ORDER BY "createdAt")` on `User`), which is the owner's own "I got 150 people and then I had to upgrade" (platform-health `brief.md` ¶1). `vercel usage` bills a **"Pro" line every day** of October through 2026-10-24 ($0.667/day to 10-19, $0.645/day from 10-20). So the audit's plan fact ("deployed on Vercel Hobby", `brief-common.md` §2; orchestrator's 09:25 BST check in `findings.md:158`, taken from the repo's own docs) was already stale when L5 filed L5-01/L5-11. **Caveat recorded, not resolved:** the same API returns `billing.plan: "hobby"`, `orbSubscriptionId: "427sYS5AxUb5srBQ"` and `expiredSubscriptions: ["427sYS5AxUb5srBQ"]` (synced 2026-10-20 19:43 UTC) — see V-L-c-01; the daily "Pro" charge is the stronger evidence and I rule on Pro.

**2. Supabase is Free; its pages say what L8 says.** Re-fetched 2026-10-24: database-size — "Read-only mode depends on disk usage. The 500 MB database size quota does not trigger it"; "Free Plan projects have a fixed disk size of 2 GB"; "When disk usage reaches 95%, Supabase puts your database into read-only mode"; "This quota is evaluated per organization, summing the database size across all of your projects". Egress — Shared Pooler Egress is "Data sent to the client when using the shared connection pooler (Supavisor) to access your database"; Free "5 GB / 5 GB" (uncached/cached); over it "a notification to your billing email address and put under a grace period". (The same page's "When using the shared connection pooler, we do not count database egress" is about not double-counting the PostgREST line, not an exemption — read in context.)

## Verdicts

### L5-01 — MOOT-SINCE the Vercel Pro move (2026-09-21) and `19be10b0`
Verdict: MOOT-SINCE 2026-09-21 (plan fact; recorded in the repo by `1e5f9887`, OPERATIONS "Capacity") — the Hobby allowance it projects against no longer applied on the day it was filed; its mechanism's attribution is refuted by measurement.
Confidence in verdict: certain (billing ledger + project config); likely on the residual share figures (L8's 7-day meters, which I could not re-run — V-L-c-01).
Citations re-derived: `presence-beacon.tsx:30` (`BEAT_MS = 60_000`), `:58` (view ping), `:68-70` (beat), `:75-76` (hide ping) correct; `api/presence/route.ts:29-62` correct; proxy matcher `src/proxy.ts:418-422` → **`:422-424`**; `posthog-client.ts:91-103` still the autocapture/pageview block; "no `prefetch={...}` anywhere" is **no longer true**: since `19be10b0` every link goes through `src/components/common/link.tsx` with `prefetch = false` (pinned by `link-import-rule.test.mjs`); the only explicit prefetches left are `landing-hero.tsx:204-205` (`/login`, `/signup`).
What I tried to refute it with: the billing ledger (Pro daily), the measured meters (L8 §00, platform-health handover item 1), the presence beacon at HEAD (unchanged).
Why it falls: the ceiling it predicts (Hobby 1 M invocations / 4 CPU-h, then a 30-day stop) had already been replaced by Pro on-demand billing. The ceiling that actually fell, at ~150 members, was Active CPU, and the measured cause was link prefetching (~18 server renders per real view; 16.6 calls per view → 5.9 after `19be10b0`, CPU per view 1.53 s → 0.48 s) — L5 listed prefetch third and estimated it at 0.5-2 per view, ~10x low. The streams L5 named first are a minority: in 10-16..10-23 `/api/presence` was 2,888 of at least 9,600 function invocations (the top nine routes L8 listed) and 169 s of 918 s Active CPU (~18%), and invocations cost $0.10 in Oct 1-23. On Pro the whole class is cost: ~$0.03/day of traffic-scaled usage at today's 1,507 views/week; OPERATIONS projects $9-18/month at 2,000 members against a $20 credit — consistent with the daily ledger (my arithmetic: $0.14 per 1,000 real views × 2,600 views/day ≈ $11/month).
Live check run: `vercel usage --from 2026-10-14 --to 2026-10-24 --breakdown daily -F json` (Pro $0.645-0.667/day; CPU $0.003-0.016/day; invocations $0.001-0.005/day); `vercel api /v2/teams/sanan-shankars-projects` (`planChangedAt`); SQL `Visit` last 7 days: 116 visitors, 289 visits, 1,507 views.
Corrections to the finding: verdict as above. Keep fix-direction items (1)-(2) only as cost hygiene (presence ≈ a fifth of CPU), not as a launch blocker. The section-6 "Pro trial" advice is moot.
Orchestrator action: none.

### L5-02 — DOWNGRADED to Medium (DB half FIXED-SINCE `e29823cb`; Upstash half stands)
Verdict: DOWNGRADED to Medium.
Confidence in verdict: certain (source, test run, vendor page).
Citations re-derived: `auth.ts:104-110` → **`:106-113`** (`Promise.all([hasBudget("login-ip"), hasBudget("login-account")])` :106-109, refusal row + throw :110-113); `:167-180` → **`:175-182`** (`hasBudget`/`consume("login-unverified")`, bot-check row :180); dummy `bcrypt.compare` `:208` → **`:210`** (and `:228`); `login-attempt.ts:38-60,91` → the write is now **`:63-83`** behind the cap `FAILURE_ROWS_PER_HOUR = 120` (**`:47`**, SELECT count with `LIMIT` `:65-71`); `retention.ts:53` (`securityLogs: 365`) and `:128` (rule) correct; `rate-limit.ts:286-297` → `hasBudget` **`:300-312`**, fail-open catch **`:307-310`**, `consume` `:315-325`.
What I tried to refute it with: the cap (`e29823cb`, `login-attempt-cap-rule.test.mjs`, ran it: 2/2 pass); the Upstash Free quota (re-fetched: "500K commands per month"); whether the bot check runs before the meter (it does not: two `hasBudget` reads precede Turnstile); whether a WAF rule exists (L8: firewall config "not found" on both projects, 2026-10-23).
Why it stands / falls: the Critical consequence (500 MB read-only in a day) is gone twice over — rows are capped at 120/hour (a flood now writes ~1.4 MB/day; the 350 MB alarm would fire after ~5 months of a continuous flood) and the 500 MB line is no longer a read-only switch (L8 §0b). What stands: every refused attempt still spends 2 Upstash commands (4 without a Turnstile token inside the 5/hour allowance), so a single source at 10/s exhausts the month's 500K in ~7 hours, after which every limiter in the app fails OPEN until the month resets (`rate-limit.ts:307-310`) — sign-in, sign-up, reset, trivia, posts, uploads unmetered, and the `login-unverified` meter also opens, so token-less attempts reach `bcrypt.compare` at cost 12 (~0.25 CPU-s each). On Pro that CPU is money: at $0.14/h it is ~$10 per million attempts plus ~$1.20/M invocations, so a 10/s flood after exhaustion spends the $50 on-demand budget in roughly 4-6 days and pauses production (L8-04). Needs an attacker; Sentry hears the limiter once a minute per instance and Vercel e-mails at 50/75/100%. Medium.
Live check run: `node --test src/lib/login-attempt-cap-rule.test.mjs` → pass 2/0; SQL `max(count) per hour of NOT ok rows` = 8 (no flood seen); WebFetch upstash.com/pricing/redis ("500K commands per month").
Corrections to the finding: severity Critical → Medium; title should name the surviving consequence ("a sign-in flood turns every rate limit off for the rest of the month, and then bills bcrypt toward the spend cap"); fix direction (1)-(2) done by `e29823cb`; (3) the WAF rule (now 40 allowed per project on Pro, not Hobby's 3) is the remaining fix and is the same rule L8-04 asks for; (4) done. Side effect of the cap worth a line in the fix row: during a flood the 120-row budget is shared by every failure reason, so a real member's `wrong-password`/`blocked` row in that hour is dropped — the analytics room's "who cannot sign in" panel goes blind exactly then (the comment at `:38-46` accepts this; owner-visible trade, not a new finding).
Orchestrator action: none.

### L5-03 — DOWNGRADED to Low; fold into T1-17
Verdict: DOWNGRADED to Low (DUPLICATE-in-class of T1-17, which V-T1 already ruled Low and widened to the poll counts; L5-03's two genuinely new instances are appended to that row).
Confidence in verdict: certain on the shape (unchanged at HEAD); likely on the cost (measured growth, below).
Citations re-derived (HEAD): `postInclude` `feed/actions.ts:984` → **`:1137-1149`** (`_count` comments+likes `:1140`, poll votes `:1145`); `comment-thread.ts:159` correct, reached from `feed/actions.ts:1260` → **`:1438`** and `catchups/actions.ts:2122` → **`:1796`**; `collection-shape.ts:108` correct, used at `collection/actions.ts:772/832/978` → **`:793/853/999`**, `collection-data.ts:276,324` correct; `profile/[id]/page.tsx:202` correct; `catchups-edition-view.ts:146` → **`:149`**; `letters/[id]/(read)/page.tsx:42` → **`:44`**.
What I tried to refute it with: the projected row counts. Measured 2026-10-24, one month after L5 at 575 members (was 223): Comment **30** (+2 in a month), Like 184, CommentLike 14, PhotoLove 50, CatchupEntryLove 554 (+23), PollVote 0. L5's projection for these tables after a year (Comment 10-40k, Like 10-50k, CatchupEntryLove 50-200k) is 1-2 orders of magnitude above the observed rate even scaled to 2,000 members. My EXPLAIN of a river page with the PhotoLove derived table: whole-table aggregate over 50 rows, 0.08 ms; V-T2 measured the Edition reader's over all 554 hearts.
Why it falls to Low: the mechanism is exact and the fix (one "counts for these ids" helper) is right, but the premise that it is "the thing that turns a burst into five-second pool timeouts" needs tables of tens of thousands of rows that the measured community will not produce by 2,000 members; at measured rates every instance stays in single-digit milliseconds. Same rating as its siblings T1-17 and T2b-13.
Live check run: `pg_stat_user_tables` + `count(*)` per reaction table; `EXPLAIN (ANALYZE, BUFFERS)` of the reconstructed PhotoLove shape (Hash Left Join ← Subquery Scan ← HashAggregate over all PhotoLove).
Corrections to the finding: severity Medium → Low; fold into T1-17 with the comment-thread and Collection instances listed; keep the query-shape gate as T1-17's.
Orchestrator action: none.

### L5-04 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED.
Confidence in verdict: likely (Vercel's own KB for the mechanism; not observed — runtime logs keep a day and the metrics API now refuses, V-L-c-01).
Citations re-derived: `prisma.ts:45-51` → **`:46-55`** (`max: 5` :51, `connectionTimeoutMillis` :52, `query_timeout` :53; no `idleTimeoutMillis`); pg-pool default `node_modules/pg-pool/index.js:98-99` correct; the stale "5 x ~40 concurrent instances" comment **`:28`**; no `attachDatabasePool`/`@vercel/functions` in `src` or `package.json` (grep, HEAD).
What I tried to refute it with: `91c07fbc` (TLS) touched the same constructor and did not add a pool; Fluid is measured ON (`vercel api /v9/projects/rv-alumni`: `fluid: true`), so the suspend lifecycle applies; live connections now 7 client backends, 4 of them Supavisor.
Why it stands: unchanged code, same platform. Two things changed around it: (1) the member-facing face of a failed first query is now the error screen rather than a sign-out on hard loads (`e286daf0`; V-DRIFT: `auth()` still returns null on a stall elsewhere); (2) every fresh connection now also does a verify-full TLS handshake (`db-tls.ts`), so the "quiet site opens fresh connections" cost grows by one handshake — negligible intra-region. The site is quiet enough that this is the common path: 1,507 views a week is one view every ~7 minutes on average, far past the 10 s idle timer.
Live check run: `pg_stat_activity` (7 client backends: PostgREST, Supavisor ×4 incl. auth_query, exporter, supabase_admin).
Corrections to the finding: lines; the face is O-03's error-screen variant after `e286daf0`.
Orchestrator action: none (dashboard: Supabase → Reports → pooler client connections overnight, as L5 wrote).

### L5-05 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED.
Confidence in verdict: certain (shipped runtime: `maxWait:s.transactionOptions?.maxWait??2e3,timeout:...??5e3` in `node_modules/@prisma/client/runtime/client.js`).
Citations re-derived: `new PrismaClient({ adapter })` **`prisma.ts:65`** (no `transactionOptions`); `account-purge.ts:379-384` correct (the one `maxWait: 5_000`; also `demo-seed/seed.ts:535` 10 s); `admin.ts:150-158` → isolation option **`:159`**. The 20 interactive sites at HEAD: answer save `catchups/actions.ts:1860` → **`:1552`** (inside `submitEntry` :1433), creation `:537` → **`:519`**, `catchups.ts:154` → **`:148`**, `:368` → **`:360`**, `report-action.ts:162` correct, `email-actions.ts:175,358` → **`:193, :376`**, `feed/actions.ts:75` → **`:80`**, `collection/actions.ts:1040` → **`:1061`**, `batch-catchups.ts:163` → **`:182`**; new since baseline: `change-email-actions.ts:114`, `catchups/actions.ts:879,1040,1114,1146,1180,2195,2269`, `retention.ts:207`.
What I tried to refute it with: a client-level option set anywhere (none).
Why it stands: unchanged. Low: it fires only under the pool pressure the dossier shows is not reached at 2,000.
Corrections to the finding: lines only.
Orchestrator action: none.

### L5-06 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED.
Confidence in verdict: certain.
Citations re-derived: the pre-check `email-queue.ts:727-737` → **`:745-755`** (still `{ status: "queued" }` with no `nextAttemptAt` arm, while the row selection at **`:837`** has one); the arms are now named by `drainHasWork` (`mail-policy.ts:328-335`), which has no `nextAttemptAt` either; `DAILY_CAP = 95` **`:87`**; `RESET_RESERVE` is now **10** at **`:103`** (L5 said 20 at `:93`); the trigger `layout.tsx:116-122` → **`:125-130`** (`after(async () => { await drainMailQueue() })`).
What I tried to refute it with: `d7a8041d` (the gate opens while a confirmation waits) — reduces the member side of C-161, not the drain's DB work; the queue today (L8: 0 waiting).
Why it stands: unchanged mechanism; prefetch-off means it now runs only on hard loads and revalidating actions, which lowers the volume L5 counted. Low.
Corrections to the finding: lines; reserve 10; the unit test to extend is `mail-policy.test.mjs` (`drainHasWork`).
Orchestrator action: none.

### L5-07 — DOWNGRADED to High (backup half FIXED-SINCE `4487283b`; app half stands)
Verdict: DOWNGRADED to High.
Confidence in verdict: likely (the plan line and mechanism are certain; the crossing depends on activity, which has varied 9x in five weeks).
Citations re-derived: `backup.yml:104-121` → the dump is now **`:189-197`** with `--exclude-table-data='public."Place"'` (**`:193`**) and the place list dumped only when its fingerprint changes (`:180-181`, `:217-223`); the directory pins `directory/page.tsx:279-287` correct (`select: PIN_SELECT`, no `take`; `PIN_PEOPLE_CAP = 12` at `:46` trims only what goes to the browser, not what Postgres sends); `PIN_SELECT` **`directory/select.ts:58-65`**; geometry `collection/actions.ts:912-916` → **`:933-937`**; letters rail `letters-module.tsx:31-51` (body still read for read-minutes); Catch-up home covers `(home)/page.tsx:294-316` → **`:293-315`** (still every published Edition's photo JSON).
What I tried to refute it with: the measurement (OPERATIONS "Capacity": 0.39 GB in Oct 1-8; ~60 KB per real view); whether the pooler counts (re-fetched: it does); whether the backup still dominates (no: `4487283b`'s first rehearsal run dumped 984 KB compressed, handover item 3).
Why it stands, and why High not Critical: the consequence (grace period, then possible pause/read-only/402 for the organisation) is unchanged and is the first ORGANIC limit on the way to 2,000. But it is preceded by an e-mail and a grace period, the owner holds an explicit trigger ("revisit before ~1,000", handover item 14), and Supabase Pro ($25) lifts it — so it is a decision with warning, not a hard-down at load. The crossing needs correcting in both directions: (a) per-view bytes are NOT constant — the directory's pin query returns every member with a place on every render and every search step, measured today at **417 members, 39,676 B of user columns + 27,257 B of place columns ≈ 67 KB raw per unfiltered render** (~160 B per placed member), and the directory is 24% of page entries (668 of 2,731 in the last 14 days); at 2,000 members (~1,450 placed) that alone is ~230 KB raw per directory render, ~55 KB on the average view, so ~60 KB/view becomes ~100-110 KB; (b) activity, not membership, sets the volume: 3.4 views/member/day in the launch week, 1.3 in early October, **0.37 now** (1,507 views/7 days/575 members). Solving members × 30 × views/member/day × (≈49 KB + 0.028 KB per member) = 5 GB (an estimate built on the one measured 60 KB figure and the measured pin bytes): crossed at **~700 members** at launch-week activity, **~1,400** at early-October activity, **~3,200** at this week's 0.37 (2,000 members would then be ~2.3 GB/month). L5's "500-900 members" and OPERATIONS's "~1,100-2,000" are both points on that line; neither is a measurement of 2,000. Nothing in the app records egress (the snapshot records database size only), so the Supabase e-mail is the only alarm.
Live check run: SQL `sum(pg_column_size(...))` over the pin columns for unblocked members with a place (417 rows, 66,933 B); `Visit.paths` route mix (14 days); `Visit` views by day (peak 2,364 on 10-01 by 182 members — OPERATIONS's 153 MB day); WebFetch Supabase egress page.
Corrections to the finding: severity Critical → High; backup half closed by `4487283b`; replace the crossing with the activity-dependent line above; fix direction (3) unchanged and now the main lever (cache the unfiltered pins per version, or return pin counts per city and fetch a pin's people on open — the browser already gets at most 12 per pin); add (4)'s egress line to the snapshot is still undone. New member-path reader since baseline worth listing here: `api/users/first-names/route.ts` reads every member's name per composer focus (≤ once per 10 min per browser, ~50 KB at 2,000) — identical for everyone, cacheable.
Orchestrator action: owner dashboard — Supabase → Organization → Usage → Egress for the current cycle (the last reading on file is 10-08).

### L5-08 — DOWNGRADED to Low (alarm half FIXED-SINCE `e29823cb`; mechanism and timing re-ruled)
Verdict: DOWNGRADED to Low.
Confidence in verdict: certain on the mechanism (vendor page) and the alarm (source + nightly runs); likely on the growth line.
Citations re-derived: `retention.ts:26-106` — still no rule for `ContentView`, `CatchupEntryLove`, `PhotoLove`, `CommentLike`, `Like`, `MetricSnapshot`, `LinkPreview`, `CatchupEditionRead` (peer commit added `triviaEvents` with one); "no `pg_database_size` anywhere" is **no longer true**: `scripts/ops/snapshot.mjs:129` reads it, `:178-190` records `db.database.bytes` and fails the job (e-mailing the owner) past `DB_ALARM_MB = 350` (`:80`).
What I tried to refute it with: measured growth and the vendor's current wording.
Why it falls to Low: (1) the alarm exists and runs — `snapshot` green every night 10-20..10-24 (`gh run list`); (2) the 500 MB is now a notified, org-wide billing quota with a Fair Use 402 restriction after grace, and read-only sits at 95% of a fixed 2 GB disk (L8 §0b, re-fetched); (3) growth is far below the projection: 128.5 MB today (`pg_database_size` 128,543,891 B), of which Place is 101 MB; in the month 09-24 → 10-24, with members 223 → 575, ContentView grew +1,515 rows (~1 MB), Visit sits at 2.5 MB under 90-day retention, MetricSnapshot +1,081 rows (+0.4 MB). Scaled to 2,000 members that is ~+3-5 MB a month — **~170-220 MB after a year**, against L5's 220-630 MB (mid 350) and OPERATIONS's 270-290 MB. The org sum adds the demo's database: measured **14.9 MB** (`--env .env.demo`, `pg_database_size`), negligible. What remains is hygiene: tables that never expire (ContentView, MetricSnapshot, the reaction tables) — a retention decision, not a launch risk.
Live check run: `pg_database_size` (prod 128,543,891 B; demo 14,888,083 B); `pg_stat_user_tables` sizes; 30-day row deltas; `gh run list --workflow snapshot.yml` (5/5 success).
Corrections to the finding: severity High → Low; mechanism per L8 §0b; the alarm's wording is L8-09 item 9's; fix direction (1) done, (2)-(3) stand as owner retention choices, (4) unchanged.
Orchestrator action: none.

### L5-09 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED.
Confidence in verdict: certain (live `pg_indexes`, 133 indexes: Comment has `(entryId, createdAt)`, `(parentId)`, `(postId, createdAt)`, `(postId, isHidden)`, pkey — nothing leading with `authorId`).
Citations re-derived: export `route.ts:178` → **`:184`** (`keyset({ authorId: userId, deletedAt: null }, after)`); purge `account-purge.ts:203` correct (`findMany`), `:231` correct (`deleteMany`), plus the `updateMany` at **`:220`**; admin person page `:68` correct; merge `admin/people/actions.ts:362` → **`:365`**.
What I tried to refute it with: a composite with `authorId` second (none).
Why it stands: unchanged; with 30 comments today and ~+2/month it is latent for years. Low is generous-to-correct.
Corrections to the finding: lines.
Orchestrator action: none.

### L5-10 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED.
Confidence in verdict: certain (live: `CatchupEntry (editionId)`, `(pollOptionId, promptId)`, unique `(promptId, authorId)`, pkey).
Citations re-derived: purge `account-purge.ts:116` correct; export `:215` → **`:235`**; merge `admin/people/actions.ts:370,373` → **`:373-376`** (`deleteMany` :373-375, `updateMany` :376).
Why it stands: unchanged; 193 answers today. Low.
Corrections to the finding: lines.
Orchestrator action: none.

### L5-11 — MOOT-SINCE the Vercel Pro move (2026-09-21)
Verdict: MOOT-SINCE 2026-09-21 (plan fact, as L5-01).
Confidence in verdict: certain.
Citations re-derived: `bird-avatar.tsx:115-122` and the Catch-up `next/image` sites unchanged in kind; `next.config.ts` image patterns unchanged.
Why it falls: on Pro, transformations are billed ($0.0527/1K in bom1) and never 402; measured ≈570 in Oct 1-23 for $0.03 (`vercel usage`, "Image Optimization Transformation" $0.0301). The 402-and-alt-text consequence cannot occur on this plan.
Corrections to the finding: none needed beyond the verdict; the `unoptimized` idea survives only as a cents-level cost choice.
Orchestrator action: none.

### L5-12 — REFUTED
Verdict: REFUTED (mechanism real, consequence unreachable at the 2,000 target; fold the residual into T7b-10).
Confidence in verdict: likely.
Citations re-derived: not re-walked line by line (admin-only page; the refutation is on the durations).
What I tried to refute it with: the duration premise. The finding needs ~10-15 statements of 0.5-1.5 s to queue past 25 connection-seconds on one instance; the 1.2 s figure came from T7b-10's extrapolation to a Visit table of tens of thousands of rows. Measured: Visit holds 3,999 rows under 90-day retention at 575 members; a 30-day day-by-day aggregate (count, distinct users, sum views) seq-scans it in **8.1 ms** (EXPLAIN ANALYZE). Scaled to 2,000 members at today's activity, ~15-25k rows, ~30-50 ms — the room's whole Overview is well under a connection-second.
Why it falls: TRAPS' "right about the mechanism and wrong about the consequence". The pool sharing is real but cannot starve members at measured sizes.
Live check run: `EXPLAIN (ANALYZE, BUFFERS) SELECT date_trunc('day',"startedAt"), count(*), count(DISTINCT "userId"), sum(views) FROM "Visit" WHERE "startedAt" > now() - interval '30 days' GROUP BY 1` → 8.1 ms, Seq Scan 2,198 rows.
Corrections to the finding: none to carry; T7b-10's index row covers the residual.
Orchestrator action: none.

### L8-01 — CONFIRMED (Low; owner-deferred)
Verdict: CONFIRMED.
Confidence in verdict: certain.
Citations re-derived: `photo/download/route.ts` `JPEG_QUALITY = 92` `:49`, `sharpImage(original).keepExif().jpeg(...)` `:83`, `"Cache-Control": "private, max-age=3600"` `:96`, `maxDuration = 60` `:42` — correct; `photoDownloads: { tokens: 60, window: "1 h" }` is **`rate-limit.ts:156`** (cited 150-156 incl. its comment).
Arithmetic checked: 60/h × 24 × 2.6 s ≈ 1.04 CPU-h/day ($0.15) + 1,440 × ~1.7 MB ≈ 2.4 GB FOT ($0.61) ≈ $0.76/day/account; three accounts × 30 days ≈ $68 ≈ the $20 credit + $50 cap. Correct.
Why it stands: unchanged code; platform-health handover item 12 records the owner's deferral — this is the same item, not a second one.
Corrections to the finding: none.
Orchestrator action: none.

### L8-02 — CONFIRMED (Low)
Verdict: CONFIRMED.
Confidence in verdict: certain.
Citations re-derived: `admin/people/actions.ts:416`, `:537` ("Check the server log.") correct; `email-queue.ts:353-358` (the comment at `:358`) correct; `tick/route.ts:38` (`{ ok: true }`) correct.
Why it stands: Pro keeps one day of runtime logs; the team has no Observability Plus (V-L-c-01's refusals confirm it).
Corrections to the finding: none.
Orchestrator action: none.

### L8-03 — CONFIRMED (Low)
Verdict: CONFIRMED.
Confidence in verdict: likely (as L8 rated: the vendor number is certain, its application to Next's proxy is the vendor's wording plus the measured `middleware_invocation` meter, not a test).
Citations re-derived: `image-downscale.ts:84` (the "roughly 4.5MB" reasoning), `UPLOAD_BODY_LIMIT = 4 * 1024 * 1024` `:90`, `:114` correct; `upload-size-rule.test.mjs:48-49` (`PLATFORM_CAP = 4.5 * 1024 * 1024`) correct; `upload-client.ts:301` correct (and `:197` the same sentence on the other path); `updateAvatar(formData)` `settings/actions.ts:58` correct; matcher `proxy.ts:422-424`.
Live check run: WebFetch vercel.com/docs/routing-middleware (last_updated 2026-08-14): "Maximum request body length 4 MB" for "requests processed by Routing Middleware"; runs on Node.js by default.
Corrections to the finding: none.
Orchestrator action: the preview POST L8 names, if anyone wants certainty.

### L8-04 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED.
Confidence in verdict: certain on the rules and setup; likely on the corrected cost.
Citations re-derived: `proxy.ts:136-151` (demo branch) correct; `demo/reset/route.ts` `maxDuration = 120` `:41`, `MIN_GAP_MS = 20_000` `:51`, `let lastReset` `:52`, `POST` `:81`, reset-to-0 `:98` correct. Demo project: production target READY 2026-08-07 16:53 UTC, crons still defined (`vercel api /v9/projects/rv-alumni-demo`) — L8's measurement reproduced.
What I tried to refute it with: the spend-management page (re-fetched, last_updated 2026-09-18): "The spend amount applies to metered resources used by all projects on your team"; "Vercel automatically pauses the production deployment for **all projects** on your team"; "503 DEPLOYMENT_PAUSED"; "Projects won't automatically unpause if you increase the spend amount"; check "every few minutes" — all as quoted. Whether Vercel's DDoS mitigation would absorb a modest flood: not for 10-100 rps of valid-looking requests (L8's quote stands).
Why it stands, with two corrections: (1) **cost per request is ~2x L8's figure for a rendered page.** L8 counted invocations, CDN requests and CPU (~$4-5/M) but not Fast Origin Transfer or provisioned memory. From L8's own 7-day meters, `/` cost 118 s CPU / 2,469 renders = 48 ms ($1.9/M), 22.6 MB FOT / 2,469 = 9.2 KB ($2.3/M at $0.25/GB) plus the proxy's 3.4 KB per invocation ($0.85/M), memory ~$0.5/M, invocations ×2 $1.2/M, CDN $2.2/M — **~$9 per million landing renders**, so the $20 credit + $50 cap is ~8 M requests (~1 day at 100/s, ~2 h at 1,000/s), not ~15 M. A request the proxy answers itself (a redirect) is cheaper, ~$3-4/M, so the attacker's cheapest page is not the one that pauses the site fastest. (2) **the Supabase half is measured, and small**: the demo's database is 14.9 MB; its pages 500, so its egress is minimal. The coupling is real but not material today. Also: L5-02's residual is a second door into the same cap (Upstash exhausted → bcrypt CPU billed), and the same WAF rule closes both.
Live check run: `vercel api /v9/projects/rv-alumni-demo`; `node scripts/dev/run-sql.mjs --env .env.demo --inline "SELECT pg_database_size(...)"` (14,888,083 B); WebFetch spend-management.
Corrections to the finding: cost arithmetic as above (time-to-cap roughly halves); Supabase half "measured negligible (15 MB)"; known-related add L5-02 residual.
Orchestrator action: owner dashboard — whether `rv-alumni-demo`'s Supabase project sits in production's organisation (still unread).

### L8-05 — FIXED-SINCE `b6cbdfc0`
Verdict: FIXED-SINCE b6cbdfc0 ("bound the page-meta patterns so a hostile page parses in milliseconds").
Confidence in verdict: certain.
Citations re-derived: `link-preview-core.ts:383-385` (`META_TAG_MAX = 2048`, `ATTR_NAME_MAX = 64`, `TITLE_MAX = 1024`), `:390` (`META_TAG` bounded `[^<>]{0,2048}`), `:395` (`TITLE_TAG` bounded); the test `link-preview-core.test.mjs:252`.
Live check run: `node --test src/lib/link-preview-core.test.mjs` → 16 pass, 0 fail.
Corrections to the finding: none.
Orchestrator action: none.

### L8-06 — CONFIRMED (Medium)
Verdict: CONFIRMED.
Confidence in verdict: certain on mechanism and setting.
Citations re-derived: `skewProtectionMaxAge: 0` re-read 2026-10-24 (`vercel api /v9/projects/rv-alumni`); Next `action-handler.js:589, :743` ("Failed to find Server Action ...") and `server-action-reducer.js:104` (`UnrecognizedActionError`) correct; `call-action.ts:5-7` (names deploy skew), `ACTION_FAILED` `:23`, `callAction` `:43-59` correct; no `isUnrecognizedActionError`/`deploymentId` in `src` or `next.config.ts` (grep); `use-letter-persistence.ts:328, :335` inside the cited 324-352.
What I tried to refute it with: duplication with O-04 (Low: the generic "Check your connection" for any failed action POST). Not a duplicate — L8-06 is the deploy-skew face with its own platform fix (a dashboard switch); the CODE half of both is one change in `callAction`, so the fix session should do them as one row.
Why it stands: unchanged; Medium is right (every deploy, every long-lived tab, wrong diagnosis until reload).
Corrections to the finding: note the O-04 fold for the code half.
Orchestrator action: none.

### L8-07 — MOOT-SINCE the repository went public (~2026-10-02, `44516525`)
Verdict: MOOT-SINCE.
Confidence in verdict: certain (`gh repo view --json visibility` → PUBLIC; every job `runs-on: ubuntu-latest`).
Corrections to the finding: none. (Workflow logs are public: checked as L8 did, counts only.)
Orchestrator action: none.

### L8-08 — CONFIRMED (Low)
Verdict: CONFIRMED.
Confidence in verdict: possible (as filed; argue-only).
Citations re-derived: `MAX_INPUT_PIXELS = 100_000_000` `upload-shared.ts:28`, `MAX_STORED_PIXELS = 40_000_000` `image.ts:71` correct; no `sharp.concurrency`/`sharp.cache`/semaphore in `src` (grep); project memory "standard" (re-read).
Corrections to the finding: none.
Orchestrator action: none.

### L8-09 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED.
Confidence in verdict: certain.
Citations re-derived: item 1 `retention.yml:7-10`, `retention.ts:15`, `sweep/route.ts:10`, `OPERATIONS.md:144` present; item 2 `instrumentation.ts:55`, `OPERATIONS.md:218` present, and Sentry's page re-fetched today ("5M spans") confirms the 500x; item 3 `next.config.ts:346` present; item 4 `email-queue.ts:718-719` present — **and a second copy at `:105-106`** ("Resend also rate-limits to a couple of requests a second"); item 5 `instrumentation.ts:82`, `proxy.ts:4`, `:33` present; item 7 `sweep/route.ts:37`, `collection/(index)/page.tsx:20` present; item 8 `check.yml:14`, `OPERATIONS.md:204` present; item 9 `snapshot.mjs:179, :188`, `OPERATIONS.md:186`, `login-attempt.ts:41-43` present (peer `trivia-log.ts:40` repeats it); item 10 `upload-shared.ts:48` present.
Correction with teeth (item 1's "steers"): L8 says GitHub's schedule runs the sweep and snapshot "1-2 h late". Measured from `gh run list` this week: retention (cron 21:00 UTC) ran 23:32-23:49 (**~2.5-2.8 h late**), backup (20:30) ran 23:16-23:29 (**~2.8-3 h**), snapshot (00:10) ran 04:29-04:42 (**~4.3-4.5 h**, i.e. ~10:00 IST). The case for moving the sweep and snapshot to Vercel crons (per-minute on Pro) is stronger than filed.
Corrections to the finding: add `email-queue.ts:105-106` to item 4; replace "1-2 h" with the measured 2.5-4.5 h.
Orchestrator action: none.

### L8-10 — CONFIRMED (Low)
Verdict: CONFIRMED.
Confidence in verdict: certain on the header (`next.config.ts:207`); the console line is well documented, not observed here.
Corrections to the finding: none.
Orchestrator action: none.

## Dossier at HEAD (L5 §0-6, re-read on Pro with today's measurements)

**Corrected headline — what breaks first on the way to 2,000 members.** Still not the database connection budget, and no longer Vercel. (1) The first *organic* limit is **Supabase Free egress (5 GB a month, organisation-wide)**: ~60 KB per real page view measured in early October, rising toward ~100-110 KB per view by 2,000 members because the directory streams every placed member's pin row on every render and search step. Where it is crossed depends on how active members are, not just how many there are: ~700 members at launch-week activity (3.4 views/member/day), ~1,400 at early-October activity (1.3), ~3,200 at this week's (0.37) — an estimate from the one measured per-view figure, to be replaced by the Supabase meter. Notice comes by Supabase e-mail and a grace period; the app records nothing about egress. (2) The only *hard* edge on Vercel is the owner's own **$50 on-demand cap with "Pause production" ON**, shared by both projects and reachable only by abuse: there is no WAF rule on either project, and a 10/s sign-in flood exhausts Upstash in ~7 h, after which bcrypt CPU is billed (L5-02 → L8-04). (3) Everything L5 ranked behind those — pool timeouts under a blast, whole-table aggregates, the 500 MB line — needs data volumes 10-100x above what the community has produced, and stays in milliseconds at 2,000 on measured rates.

| Dossier section | Stands / changes at HEAD | Why (measured where possible) |
|---|---|---|
| §0 headline ("pool is not what breaks first") | **Stands** | Supabase peak connections 12 of 60 (OPERATIONS); live 7 client backends; `max_connections` 60, reserved 3, `idle_in_transaction_session_timeout` 0, `statement_timeout` 120 s (re-read). Peak concurrent visits measured **16** (2026-10-01 07:06 UTC, 182 members that day), vs L5's 8; ×7 to 2,000 ≈ ~110 concurrent visits — still a few % of one pool at ms per statement. |
| §0 "what breaks first" ranking (Hobby invocations, then egress, then 500 MB, then DB CPU) | **Changes** | Hobby gone since 2026-09-21; 500 MB is an org billing quota (read-only only at 95% of 2 GB disk); DB CPU knee needs 10-100x the measured data. New order: egress (organic) → spend cap (abuse) → operational (L8-06 skew, L5-04/05 pool hygiene). |
| §0.1 ceilings table | **Changes in four rows** | Vercel row → Pro: $20 credit, then on-demand; $50 cap pauses all projects; Fluid measured ON, default timeout 300 s, memory 2 GB. Database size row → 128.5 MB, org-wide billing quota. Every DB connection now verify-full TLS (`91c07fbc`). Supavisor pool size (15 default) still unpublished — dashboard fact. |
| §0.2 statements per request | **Stands for hard loads; prefetch row was ~10x low** | L5 counted 0.5-2 prefetches per view; measured 16.6 server calls per view before `19be10b0`, 5.9 after. L5's verified-clean line "client navigation does not re-run the (main) layout" is not settled and is contradicted by the repo's own comments (`layout.tsx:138`, `link.tsx`); moot now that prefetch is off. |
| §0.3 hold time | **Stands for today; the 2k-data rows overstated** | The ~25-110 ms aggregate rows assume 10-50k-row reaction tables; measured tables are 14-554 rows after the launch month (L5-03). |
| §0.4 traffic | **Changes** | Activity has swung 9x: launch week 3.4 views/member/day, early October 1.3, now 0.37 (1,507 views, 116 visitors, 575 members, 7 days to 2026-10-24). Any 2,000 projection must say which. |
| §0.5 Little's-law table | **Stands (ample)**; the "100 simultaneous loads, 2k data" row's CPU knee does not arrive at measured data growth. |
| "What the member sees" on a checkout timeout | **Changes** | Since `e286daf0` a failed session read on a hard load shows the error screen instead of signing out (V-DRIFT: `auth()` still null on a stall elsewhere). |
| §1 unbounded reads | **Stands, one row moot, one new** | Row 7 `pulse-module.tsx` deleted (`6ac93492`) → MOOT. Rows 1 (geometry, `actions.ts:933-937`), 3 (pins, `page.tsx:279-287`), 4 (covers, `(home)/page.tsx:293-315`) unchanged. New: `api/users/first-names` (every member's name per composer focus). Their real cost is egress (L5-07), not latency. |
| §2 missing indexes | **Stands** | Live 133 indexes; `Comment.authorId`, `CatchupEntry.authorId`, `Notification.link`, `PollOption.postId`, `User.createdAt`, `Visit.startedAt`, `CatchupEntry.audioUrl` still uncovered. All latent at measured sizes. |
| §3 fanout | **Stands, smaller** | Editions now start by hand (`eb855c71`), so Catch-up transition fanout is rarer than L5's biweekly rhythm; new single-recipient writers (mentions `1f44f1e9`, added-member `077eaacf`, two bells `6fb896bd`) are bounded per event. Not re-walked line by line. |
| §4 quota table | **Changes** | Vercel rows: all billed on Pro (Oct 1-23: CPU $0.35, invocations $0.10, FOT $0.24, images $0.06; Pro fee accruing daily); "edge requests" row → Flat Rate CDN 1 M/1 TB. Supabase egress: still the binding line (L5-07 corrected). DB size: 128.5 MB, not binding. Upstash 500K: re-verified, only binds under a flood (L5-02). Resend: `RESET_RESERVE` is 10 now; 414 sent in 30 days, peak 88/day (L8). Sentry 5k errors / 5M spans (re-verified). R2: past the free 10 GB, ~$0.12/month (L8). |
| §5 growth projections | **Changes — overstated 10-100x for member content** | One month, 223 → 575 members: Comment +2, Post +8, Like →184, CatchupEntry +52, CatchupEntryLove +23, PhotoLove 50 total, ContentView +1,515, Photo +83, MetricSnapshot +1,081. Database 128.5 MB (Place 101 MB). Projection at 2,000 after a year: ~170-220 MB, not 220-630. |
| §6 k6 plan | **Stands in shape, needs five edits** | (a) §6.1(3) "invocation budget / Pro trial" → moot; the run's cost is cents, but it draws on the same team budget as production's $50 cap. (b) §6.1(1) a separate Supabase *organisation* is mandatory (quotas are org-wide) and the owner's two free projects are both used (production + demo): pause the demo or pay. (c) §6.1(4) seed sizes are a 10-100x stress case, not a forecast — label them so, and add a "measured-rate" seed. (d) §6.5 `o03_login_bounce` should also count the error screen (`e286daf0` changed the face). (e) if L8-04's WAF rule is added, the preview needs it off or k6's IP allow-listed. The prefetch counter in §6.3 should now read zero. Claims in §6.2 (JWT claims `id`, `role`, `batchType`, `batchYear`, `credentialVersion` — `auth.ts:358-366`) and §6.1(2) (`statsWritesEnabled`, `stats-exclusion.ts`) still hold. |

## New candidates

### V-L-c-01 — The "measure, never estimate" commands this project is built around now answer `payment_required`, and the same Vercel API that refuses them reports the team's plan as "hobby" with its one subscription listed as expired
- Severity: Low (operations; it removes the owner's only per-route cost meter, the one his own rule depends on). It becomes Critical if the second half means what it says — see "What would change my mind".
- Confidence: certain that the commands fail today; possible on the cause.
- Where: `docs/OPERATIONS.md` "Re-measuring" (lines ~456-462) and the "Capacity" methodology; `docs/TRAPS.md` "Next.js" ("Measure platform cost, never estimate it per visit: `vercel metrics ...`"); `docs/planning/platform-health/handover.md` "Commands".
- Taxonomy: 6f (platform limits), L9-adjacent (instructions that no longer work).
- Expected: the documented commands return per-route CPU, invocations and transfer, as they did for the platform-health session (09-29 onward) and for L8 (2026-10-23).
- Actual: on 2026-10-24 every `vercel metrics` query — `vercel.function_invocation.count`, `.function_cpu_time_ms`, `vercel.middleware_invocation.count`, with or without `--group-by`, `--since 1d` or `7d` — answers `{"error":{"code":"payment_required","message":"Observability Plus is required to run this query ... available on Pro and Enterprise plans. Upgrade your plan to continue."}}`. Vercel's page for the command (vercel.com/docs/cli/metrics, last_updated 2026-09-10) says "Metrics other than Web Analytics and Speed Insights metrics require Observability Plus", so the most likely reading is that Vercel began enforcing its documented rule between 10-23 and 10-24 (the CLI binary is unchanged since 2026-06-30). Separately, `GET /v2/teams/sanan-shankars-projects` returns `billing.plan: "hobby"`, `planIteration: "plus"`, `orbSubscriptionId: "427sYS5AxUb5srBQ"` and `expiredSubscriptions: ["427sYS5AxUb5srBQ"]`, synced 2026-10-20 19:43 UTC — while `vercel usage` keeps billing a "Pro" line daily through 2026-10-24 (its daily rate stepped from $0.667 to $0.645 on 10-20, the sync day).
- Why it matters: OPERATIONS.md and TRAPS.md tell every session to measure with these commands; the next session that tries will get an error and fall back to estimating, which is the failure the owner was burned by (brief ¶6-7).
- What would change my mind / the escalation: if Settings → Billing shows the team on Hobby, the Pro re-rulings in L8 and here invert (Hobby's 4 CPU-hours return; at the measured 0.48 s per view that is ~30,000 views a month, ~4.6x this week's traffic; no spend cap, no Skew Protection, 1-hour logs, crons ±59 min, commercial-use restriction with Razorpay live). The daily "Pro" charge makes that unlikely, which is why this is filed Low.
- Proof: the three read-only commands above, from `/tmp`.
- Fix direction: owner — one look at Settings → Billing to confirm Pro; then either buy Observability Plus (if per-route metering is worth its price) or rewrite the "Re-measuring" block around what Pro still exposes without it (the dashboard's Observability tab, `vercel usage --breakdown daily`, and `Visit` views from SQL as the divisor).
- Gate: none mechanical; the OPERATIONS block names the date it was last verified.
- Known-related: L8 §00 (whose meters are the last ones taken), platform-health handover item 1/6.

## Cross-zone notes
- **Orchestrator / report**: the audit's plan fact in `brief-common.md` §2 ("deployed on Vercel Hobby") was stale from 2026-09-21 — before every finder ran. Any other finding that leans on Hobby (cron ±59 min, 10 s/300 s durations, no Skew Protection, one-hour logs, 402 images) should be re-read on Pro; L8's Leads section already re-rules T2a-05/T7b-15's cron lateness (Vercel crons per-minute on Pro).
- **V-T7b / L3 / L11**: GitHub-scheduled jobs run 2.5-4.5 h late this week (retention ~23:40 UTC for a 21:00 cron, snapshot ~04:35 UTC for 00:10, backup ~23:20 UTC for 20:30). Anything that assumes the snapshot lands just after midnight UTC (its day boundary, "yesterday's" numbers) should be checked against a 04:30 UTC (10:00 IST) run.
- **V-T1 (T1-17)**: L5-03 folds into T1-17 as the class row; add `comment-thread.ts:159` (CommentLike) and `collection-shape.ts:108` (PhotoLove) as instances. The PhotoLove EXPLAIN V-T1 asked for is in L5-03 above (whole-table aggregate, 50 rows, 0.08 ms).
- **V-T7b (T7b-10)**: L5-12 refuted on duration; Visit is 3,999 rows and a 30-day aggregate takes 8 ms. T7b-10's own severity should use the measured size, not the 2k extrapolation.
- **V-O-L1 (O-04)**: L8-06's code half and O-04 are one change in `callAction`.
- **V-T6 / T4b**: the directory pins and the Collection geometry are now the two largest per-view egress lines (pins ~67 KB raw per unfiltered render today, ~160 B per placed member; geometry ~2,000 rows of four columns per first page). They are L5-07's levers.
- **Peer trivia work (noted, not validated)**: `trivia-log.ts` caps its unauthenticated rows at 600/hour (`:50`, `:128-136`) and has a retention rule — the L5-02 class is handled there; its comment at `:40` repeats L8-09 item 9's stale "read-only at 500 MB".

## Coverage
- Checked completely (every citation re-derived at HEAD, refutation attempted, severity ruled): L5-01, L5-02, L5-03, L5-04, L5-05, L5-06, L5-07, L5-08, L5-09, L5-10, L5-11, L8-01, L8-02, L8-03, L8-04, L8-05, L8-06, L8-07, L8-08, L8-09, L8-10.
- Checked on its premise only: L5-12 (refuted on measured duration; its admin-analytics line numbers not re-walked).
- Dossier: §0-§6 re-read against HEAD and today's measurements (section above); §3 fanout not re-walked line by line (new writers listed by commit).
- Vendor pages re-fetched 2026-10-24: Supabase database-size, Supabase egress, Vercel spend-management, Vercel routing-middleware, Vercel CLI metrics, Sentry pricing, Upstash pricing. Not re-fetched (L8's 2026-10-23 reads accepted): Vercel pro-plan/limits/bom1 pricing/skew-protection/cron/logs/WAF, Supabase billing-faq, R2, Turnstile, Resend, PostHog, GitHub Actions.
- Live, read-only: SQL on production (`pg_database_size`, `pg_stat_user_tables`, `pg_indexes`, `pg_settings`, `pg_stat_activity`, row counts and 30-day deltas, `Visit` traffic/route mix/peak concurrency, pin-column byte sums, two EXPLAIN ANALYZE); one SELECT on the demo database (`pg_database_size`); `vercel api` GETs (team, both projects); `vercel usage` (period and daily); `vercel metrics` (refused — V-L-c-01); `gh repo view`, `gh run list` (snapshot, backup, retention); `node --test` on `login-attempt-cap-rule.test.mjs` (2/2) and `link-preview-core.test.mjs` (16/16).
- Could not verify: per-route meters after 2026-10-23 (Observability Plus); Supabase egress after 10-08 and the live Supavisor pool size (dashboard); whether the demo's Supabase project is in production's organisation (dashboard); the team's plan as the dashboard shows it (V-L-c-01).

STATUS: COMPLETE at HEAD 88642426
