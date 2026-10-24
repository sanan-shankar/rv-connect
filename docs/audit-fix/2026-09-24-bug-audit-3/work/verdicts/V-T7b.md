# V-T7b — adversarial validation of T7b (analytics, presence, messages, notifications)
Validator: V-T7b · Started: 2026-10-23 · Model: Opus 5.5 (claude-opus-5-5)
Assignment: T7b-01..T7b-22 (22 findings). Re-baseline: the audit read `495ecdd2`; every citation is checked at HEAD `88642426`.
Cross-references cited, not re-validated: T3-16 (= T7b-03; V-T3 picks canonical), L3-08 / L11-01 (backup media job, fixed in `7f28818c`/`4487283b`), T8b's PostHog lead (T7b-21/22), T5-15 (DUPLICATE of T7b-04 per V-T5).
Method: brief-validator.md exactly — read-only, SELECT-only against the shared database, no gates, no browser, no sign-in, no git writes.
Verdict values in use: CONFIRMED · CONFIRMED-CORRECTED · DOWNGRADED · UPGRADED · REFUTED · DUPLICATE · KNOWN · FIXED-SINCE <sha> · MOOT-SINCE <sha>.

## Status board (one line per id; filled in as each verdict lands)
- T7b-01 — DOWNGRADED to Low (corrected: the 403 stopped on 2026-10-02 when the repository went PUBLIC, no commit; the metric now records nightly; the silent-source and no-reader halves stand)
- T7b-02 — CONFIRMED-CORRECTED (Medium stands; lines moved, logic unchanged at HEAD)
- T7b-03 — DUPLICATE of T3-16 (pair; V-T3 picks canonical) — live consequence EXPIRED: 0 `/answer` rows today, aged out by the 30-day sweep; the migration was never run; the false comment and the no-ledger gap remain (Low)
- T7b-04 — CONFIRMED-CORRECTED (Low; layout line moved to :140; one more reader, the snapshot's active_7d/30d)
- T7b-05 — CONFIRMED-CORRECTED (Low; lag now median 5 h 19 m past midnight UTC, 29 nights since the audit, none under 4 h 19 m)
- T7b-06 — CONFIRMED-CORRECTED (Low; the panel now hits its LIMIT 30 — 86 qualify; 4 of the 30 never confirmed their e-mail, 29 never posted)
- T7b-07 — CONFIRMED (Low; citations exact at HEAD, total moved to admin.ts:277)
- T7b-08 — CONFIRMED (Low; no live collision today; same-named members with the SAME batch year also collide)
- T7b-09 — CONFIRMED-CORRECTED (Low; writer still ungated at HEAD; `e29823cb` added a site-wide failure cap, not a gate; 18 locked-out addresses today, none test-shaped)
- T7b-10 — CONFIRMED-CORRECTED (Low; mechanism true, consequence and fix wrong: the seq scan is 3 ms of a 113 ms query, the cost is the per-step regexp and sorts, and a 30-of-90-day window is too unselective for a startedAt index to be chosen)
- T7b-11 — CONFIRMED (Low; last night's prune: 577 rows, 0 older than 30 days)
- T7b-12 — FIXED-SINCE 19be10b0 (every Link defaults to prefetch=false, pinned by link-import-rule.test.mjs; the prefetch that was the only trigger no longer happens)
- T7b-13 — CONFIRMED-CORRECTED (Medium stands, worse at HEAD: Profile opens 387 vs 2,829; found-nothing 17 vs 73; languages 8 vs 13; Got no response 30 vs 86; notification types correct today at 9)
- T7b-14 — CONFIRMED-CORRECTED (Low; gap larger: posts trend 25 vs tile 17, letters 7 vs 6; the photos sub-claim is not a two-definition drift)
- T7b-15 — CONFIRMED-CORRECTED (Medium stands; mechanism and wording unchanged through the Catch-ups rework; live today: one Edition answering, `answersCloseAt` 2026-10-25 01:30 UTC; reminders are default-off since 6fb896bd, so the bell half now reaches only opted-in members, the page half everyone)
- T7b-16 — CONFIRMED-CORRECTED (Low; proxy lines moved :370-374/:395-403; the new /api/auth/stale route deliberately leaves rv-visit; live upper bound now 10 of 124)
- T7b-17 — CONFIRMED-CORRECTED (Low; feed logSearch at feed/page.tsx:44 still passes no results — 8 of 8 feed rows NULL; the 12 erased-account `people` rows still in window to 2026-11-18)
- T7b-18 — CONFIRMED (Low; citations exact, file unchanged)
- T7b-19 — CONFIRMED-CORRECTED (Low; argued from CSS, no browser; bell lines moved to :485-486, panel :429)
- T7b-20 — CONFIRMED (Low; owner still #1 commenter, now #2 photo-lover; Jerry no longer on a top-8 list today)
- T7b-21 — CONFIRMED (Low; canonical over T8b's routed lead; posthog-identify.tsx unchanged; letterhead sign-out moved to :1528)
- T7b-22 — CONFIRMED-CORRECTED (Medium stands; fix direction corrected: posthog-js 1.418.1 sets `attr__href` from the chain's anchor whatever `mask_all_element_attributes` says, so only `ph-no-capture`/`ph-sensitive` or autocapture off keeps the mailto/tel out)

## Verdicts

### T7b-01 — DOWNGRADED to Low
Verdict: DOWNGRADED to Low (CONFIRMED at audit time; at HEAD the 403 half is dormant for a reason outside the code)
Confidence in verdict: certain
Citations re-derived (HEAD `88642426`; `snapshot.mjs` changed in `91c07fbc` TLS and `e29823cb` size alarm, which moved every line): `collectGithub` is `scripts/ops/snapshot.mjs:263-290` (was 241-272); the request `:268-271`; `throw new Error(\`GitHub ${res.status}\`)` `:272` (was 254); the comment "Everything else here is replaceable; that one is not" `:260-261`; the catch that prints and continues `:317-321` (was 295-304). `.github/workflows/snapshot.yml` is UNCHANGED since the audit: `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` `:75`, no `permissions:` key in any workflow (`grep -rn "permissions:" .github/workflows/` empty at HEAD), "Report" step `:97-98`. The room: `grep -rin "github\|backup"` over `src/app/(main)/admin/analytics/page.tsx`, `src/components/admin/analytics/` and `src/lib/admin-analytics.ts` is still EMPTY at HEAD.
What I tried to refute it with: (1) the live table — `SELECT source, count(DISTINCT day) … FROM "MetricSnapshot" GROUP BY source` now returns a `github` source with 21 days, 2026-10-02 → 2026-10-22. (2) the run logs — run 36969205550 (2026-10-02 05:30Z, day 2026-10-01) still prints `github   FAILED -- GitHub 403`; run 37099092517 (2026-10-03, day 2026-10-02) prints `github   ok  -- last backup failure`; the latest, 39901729544 (2026-10-23), `github   ok  -- last backup success`. (3) what changed between those two nights: no commit touched `snapshot.yml` or `collectGithub`; `gh repo view` reports `visibility: PUBLIC`, and commit `44516525` (2026-10-02 20:59 BST, "rewrite the README as the public overview … The repository is public and goes out with job applications") dates the switch. A public repository's Actions runs endpoint answers a token that lacks `actions: read`, so the 403 disappeared with the visibility change. (4) whether the new backup work (`7f28818c`, `4487283b`) touched this: it changed `backup.yml` only; the snapshot's collector is untouched.
Why it stands / falls: the finding's headline (the metric 403s every run) was true for every night from 2026-08-19 to 2026-10-01 and is NOT true now: `backup.ok`, `backup.age_hours` and `backup.failures_last_10` are written nightly, and they tell the L3-08 story correctly (2026-10-02: ok 0, 5 failures in the last 10; from 2026-10-03: ok 1; failures fall to 0 by 2026-10-11 after `a281e855`). It is now true only conditionally: make the repository private again and the 403 returns silently, because the workflow still declares no `actions: read`. The two other halves stand unchanged at HEAD: a failed source still exits 0 (`main()` sets `process.exitCode = 1` only for `dbAlarm`, `:325-329`, and for a crash, `:360`), so the job stays green on any vendor failure; and nothing in `/admin/analytics` reads a `github.*` metric, so the backup state the comment calls irreplaceable is collected into a table no surface draws. With the backup's own job now failing red when it fails (L3-08's fix), this is a monitoring-gap Low, not a Medium.
Live check run: `node scripts/dev/run-sql.mjs --inline "SELECT source, count(DISTINCT day), min(day)::text, max(day)::text FROM \"MetricSnapshot\" GROUP BY source"` → db/posthog/sentry 65 days each, github 21 days from 2026-10-02. `gh run view <id> --log | grep github` on runs 36969205550 / 37099092517 / 39901729544 (403 / ok / ok). `gh repo view --json visibility` → PUBLIC.
Corrections to the finding: severity Medium → Low. Title at HEAD: "The nightly snapshot's backup metric has no reader and a failed source leaves the job green; it 403'd for 44 nights until the repository went public, and would again if it went private." Fix direction (1) `permissions: { contents: read, actions: read }` is still right (it makes the metric independent of the repository's visibility); (2) and (3) stand as written. The Sentry side note (point 4): the issues endpoint is paginated, so `issues.length` is one page; not verified which page size Sentry applies by default (25 or 100), harmless at today's 0-4 issues.
Orchestrator action: none needed; optionally note for the owner that making the repository private again silently re-breaks this metric unless the `permissions:` line lands.

### T7b-02 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands)
Confidence in verdict: certain on the mechanism (a pure rule pinned by a test), likely on frequency
Citations re-derived: `src/components/layout/unread-store.ts` is UNCHANGED since the audit: comment `:89-94` and `:96-101`, `seedVerdict` `:107-116`, `seedUnread` `:123-129` — all correct. `notification-bell.tsx` gained 5 lines above the hooks (two icon imports, the `mention` and `catchup_added` rows), so: `refreshCount` `:186-190`, the `focus` listener `:192-196` (was 185-189), the mount effect `:203-205` (was 196-198), `handleOpen` (panel open, sets the server's count) `:217-235` (was 210-230). `page-header.tsx:158-163` (bell rendered only when `unreadCount !== undefined`, `:163` the mount) — correct. `src/app/(main)/feed/page.tsx` count is now `:47` (in a `Promise.all`) and passed at `:100` (was `:84`). `sidebar.tsx:809` (the band bell) — correct. `unread-store.test.mjs:67` `assert.equal(seedVerdict(0, new Set([3]), 3), "agrees")` — correct.
What I tried to refute it with: (1) any other refresh path — none: the bell refreshes only on `window` `focus`, panel open and a "verify" verdict; no poll, no push, no `visibilitychange`; (2) whether reading a notification adds to `seenProps` — it does not (`setUnread`/`decrementUnread` never touch the set), so after "read the one" the store is 0 and the set still holds 1; (3) whether the feed header bell really remounts with a fresh prop — it is rendered inside the feed PAGE (`page-header.tsx:163` under `feed/page.tsx:100`), so it unmounts when the member leaves `/feed` and mounts again with the count that request computed; (4) whether `19be10b0` (prefetch off) or the new `@/components/common/link` changes this — it changes what is prefetched, not whether a soft navigation re-renders `/feed`; (5) whether the 2026-09-27 mention work touched the store — `25c21c28`/`1f44f1e9` touched writers and the icon map only.
Why it stands / falls: the rule is pure and the test pins the exact case as "agrees": with the store at 0 and 1 in the seen set, a fresh `/feed` render counting 1 is ignored and no verify fetch is made. On a desktop tab with no focus change, the badge on the page's own header stays dark until the member opens the panel or re-focuses the window. bugs.md #5 (no desktop bell outside the feed) means there is no second bell to correct it. The comment's "exactly three" is an understatement: any count the document has ever been handed is blind.
Live check run: none possible (needs a signed-in desktop session and a second actor). The pure-rule proof stands: `seedVerdict(0, new Set([1]), 1)` returns "agrees" by `:114`.
Corrections to the finding: line numbers above only. Severity Medium stands (a member-facing missing badge on the one desktop bell, the steady state for a low-volume member).
Orchestrator action: optional live proof with a throwaway on a desktop viewport, as the finding's proof plan describes (read the one unread on /feed, go to /letters, have a second account like the throwaway's post, return to /feed by the sidebar: no dot until a window refocus).

### T7b-03 — DUPLICATE of T3-16 (pair; V-T3 picks canonical); live consequence expired
Verdict: DUPLICATE of T3-16 (the same skipped migration; V-T3 rules which id is canonical — V-T3's file still shows T3-16 as pending at the time of writing). At HEAD the DATA half has EXPIRED; the residual is a Low comment-lie plus the process gap.
Confidence in verdict: certain
Citations re-derived: `prisma/migrations-manual/2026-09-09-answering-moves-to-the-home.sql` unchanged. `src/lib/catchups-notify.ts` was rewritten in the Catch-ups rework: the claim now sits at `:168-174` ("The rows written before that are rewritten by `prisma/migrations-manual/2026-09-09-answering-moves-to-the-home.sql`", was `:126-131`). `docs/spec/catchups.md:511-513` (was 455-457) still lists the file as the migration that keeps reminders matchable. `docs/audit-fix/2026-09-24-refactor-audit-3/work/agents/fresh-code.md:322` still says the old links exist (the shim note).
What I tried to refute it with: the live table today, and any record of the migration having been run (`grep -rn answering-moves docs/history progress.md` → nothing; L11's 88-file sweep at the audit already ruled it the only unapplied data migration).
Why it stands / falls: the migration was never run, but the 30-day sweep has since done its job: `SELECT … FROM "Notification" WHERE link LIKE '/catchups/%/answer'` → 0 rows, and the oldest Notification in the table is 2026-09-23 06:31 UTC. The 11 stale reminders and 11 answers-open rows aged out around 2026-10-04 as the finding predicted. No writer has produced an `/answer` link since 2026-09-09, so the data defect cannot recur. What survives at HEAD: the comment at `catchups-notify.ts:170-174`, a second one at `src/app/(main)/catchups/actions.ts:1321-1324` ("A stale reminder still pointing at `/catchups/<id>/answer` is left alone by this delete and cleared by the dated migration instead") and the spec line at `:511-513` all describe a rewrite that never happened (L9), and `prisma/migrations-manual/` still has no ledger of what was applied (the process gap, shared with L11).
Live check run: `SELECT type, count(*), … FROM "Notification" WHERE link LIKE '/catchups/%/answer' GROUP BY type` → 0 rows; `SELECT min("createdAt")::text FROM "Notification"` → 2026-09-23 06:31:34.
Corrections to the finding: the 22 rows are gone (aged out, not migrated). Running the migration now is a no-op; the fix reduces to correcting the comment and the spec sentence (say the old rows aged out unrewritten) and, if wanted, the ledger. Severity Low stands for the residual.
Orchestrator action: none.

### T7b-04 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; DUPLICATE target of T5-15 per V-T5, T7b-04 canonical)
Confidence in verdict: certain
Citations re-derived: `src/lib/stats-exclusion.ts:17-20` (WRITE promise) and `:22-26` (READ) — unchanged, correct. `src/lib/last-seen.ts:284-288` (the "not gated … app state" comment), `:298-312` (`touchLastSeen`) — unchanged, correct. `src/app/(main)/layout.tsx:131` → now `:140` (`after(() => touchLastSeen(session.user.id, session.user.lastSeenAt))`). Readers: `admin-analytics.ts:98-100`, `:742-747` (lurkers, the `WHERE u."lastSeenAt" IS NOT NULL` is `:744`), `:803-804`, `:1183` — exact; `auth.ts:391,429` → `:396,449` (the throttle's feed). One reader the finding missed: `scripts/ops/snapshot.mjs:103-104` (`active_7d`, `active_30d` from `"lastSeenAt"`), so the nightly history the room's sparklines draw is skewed the same way. `stats-exclusion-rule.test.mjs:21` `ACTIVITY` regex still names only Visit/SearchLog/ContentView. `docs/spec/admin.md:634` ("People counts off `User.lastSeenAt` are not filtered: they are out by two at most").
What I tried to refute it with: (1) whether a member-facing surface now reads `User.lastSeenAt` (which would make the "app state" argument true) — no: the feed's `lastSeenAt` prop (`feed/page.tsx:111`, `post-feed.tsx:74`) is `marker.feedSeenAt`, a different column; every `User.lastSeenAt` read is in the analytics room, the snapshot, or the auth throttle that feeds the write itself. (2) whether `touchLastSeen` gained a `statsWritesEnabled()` gate — no. (3) whether the layout stopped rendering for prefetches (19be10b0 turned prefetch off, which removes one inflation source but not the localhost one).
Why it stands / falls: the comment promises development records nothing; the layout stamps `lastSeenAt` on every authenticated render on any deployment; nine numbers (seven in the room, two in the nightly history) read it with no exclusion. Low stands (numbers, not behaviour).
Live check run: `SELECT u."lastSeenAt"::text, (SELECT max("endedAt")::text FROM "Visit" WHERE "userId"=u.id) FROM "User" u WHERE id='cmseq4ys6000t04jr8068e1qs'` → 2026-10-22 09:52:07 / 09:52:43 — today's stamp is paired with a production visit, so it does not re-prove the localhost write; the audit-time proof (2026-09-24 07:03 stamp with no Visit) stands and the mechanism is unchanged.
Corrections to the finding: line numbers above; add `snapshot.mjs:103-104` to the reader inventory and to the fix (whatever exclusion is chosen should apply there too).
Orchestrator action: none.

### T7b-05 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `scripts/ops/snapshot.mjs` shifted by the TLS/size-alarm commits: the "ten minutes after that day ended … honest read" comment `:42-47` (was 40-47), `DAY` `:48`, `startOfUtcYesterday` `:53-56` (was 52-55), `daysAgo` `:57-59`, `d7`/`d30` `:84-85` (was 82-83), the point-in-time counts `:97-127`. `.github/workflows/snapshot.yml:11-23` unchanged ("well before the site sees any real morning traffic in IST" `:22-23`). `prisma/schema.prisma:1427` ("The UTC day this describes", was 1463-1465). `admin-analytics.ts:37-52` unchanged.
What I tried to refute it with: whether the schedule or the day anchoring changed (no: `snapshot.yml` untouched since `0cecf115`, before the audit), and whether GitHub's lag shrank.
Why it stands / falls: the lag is now larger than at the audit. Over the 29 nights since 2026-09-24 (`max("capturedAt") − (day+1)` for `source='db'`): minimum 4 h 19 m, median 5 h 19 m, maximum 6 h 44 m past midnight UTC (the 2026-10-12 row was captured 2026-10-13 06:44 UTC, 12:14 IST). Every row stamped "yesterday" folds in the Indian morning to about 10:30–12:15 IST, and `active_7d` is an ~8-day-5-hour window labelled seven. With membership going from 203 (audit) to 570 (last night's run), a launch-period signup morning lands in the wrong day's `members.total`.
Live check run: `SELECT percentile_disc(0.5) …, min(lag), max(lag) FROM (SELECT day, max("capturedAt") - (day + 1)::timestamp AS lag FROM "MetricSnapshot" WHERE source='db' AND day >= '2026-09-24' GROUP BY day)` → med 05:18:40, min 04:19:32, max 06:44:17, n 29. `gh run list --workflow=snapshot.yml` → every run since 2026-09-25 created 04:19–06:43 UTC, all `schedule`.
Corrections to the finding: line numbers above; the lag figures above replace "median 4 h 29".
Orchestrator action: none.

### T7b-06 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `admin-analytics.ts:742-747` (lurkers) and `:748-770` (isolated, `LIMIT 30` at `:769`) — unchanged, exact. `page.tsx:519-523` (the tile) and `:540-565` (the panel; "Worth saying hello to." is `:542`) — exact.
What I tried to refute it with: whether `isolated` gained any identity filter (no), whether the `anonymous` system row or the excluded accounts appear in today's thirty (they do not), and what the list is made of today.
Why it stands / falls: the panel's query, run read-only with the room's own `counted` filter on the ContentView subquery, now returns its full 30 rows out of 86 that qualify: 4 of the 30 have never confirmed their e-mail (`emailVerified` null), 2 are not `verified`, and 29 of the 30 have never written a post, so "nobody has responded to them" is, for almost every row, "they have never posted". The list cannot tell "ignored" from "never arrived". The "Only ever read" tile (`lurkers`) counts 542 today; 1 of them is an excluded account; 18 have answered a Catch-up and 10 have contributed Collection photographs, confirming run 2's extension (two views of the room disagree about who writes).
Live check run: the `isolated` query with an identity breakdown → total 30 (LIMIT), unconfirmed 4, not verified 2, deletion-requested 0, never posted 29, special rows 0; uncapped count 86. `lurkers` → 542, excluded-in 1, Catch-up answerers 18, photo contributors 10.
Corrections to the finding: today's numbers above (run 1's "Audit TestBird" row is gone with the throwaway account). The cap interaction is T7b-13's.
Orchestrator action: none.

### T7b-07 — CONFIRMED
Verdict: CONFIRMED (Low)
Confidence in verdict: certain on the mechanism; possible on occurrence
Citations re-derived: `src/components/admin/admin-counts.tsx:51-58` (`publish` compares `waiting`, `messages`, `reports`, `people`, not `photos`) — exact, file unchanged. `src/lib/admin.ts:182-192` (`AdminCounts`, `photos` at `:190`) — exact; `total = …` moved `:276` → `:277` (one import line added by `MAIL_NEEDING_ADMIN`). `failedMail` is now `outboundEmail.count({ where: MAIL_NEEDING_ADMIN })` (`:260`), which does not change the arithmetic.
What I tried to refute it with: whether `waiting` could ever differ when `photos` moves alone (it cannot: `total` sums `photos`, so `photos` alone moving changes `waiting`); the masking case is `photos` +n with any other queue −n.
Why it stands / falls: unchanged at HEAD; the compensating-move case is real but rare.
Live check run: none needed (pure comparison).
Corrections to the finding: `admin.ts:277`.
Orchestrator action: none.

### T7b-08 — CONFIRMED
Verdict: CONFIRMED (Low)
Confidence in verdict: certain on the key shapes; occurrence nil today
Citations re-derived: `page.tsx:397` (`<li key={l.title}>`), `admin-analytics.ts:972` (`title ?? "Untitled"`), `stat.tsx:168` (`key={\`${i.label}-${i.hint ?? ""}\`}`), `admin-analytics.ts:670-678` (`personList`; `hint` only when the name repeats AND `batchYear != null`), `:237-239` (`topAuthors` labelled by name, no hint) — all exact, files unchanged.
What I tried to refute it with: live collisions. `SELECT coalesce(title,'Untitled'), count(*) … WHERE kind='letter' AND status='published' AND NOT "isHidden" GROUP BY 1 HAVING count(*)>1` → none; same-named members with a null batch year → none.
Why it stands / falls: the shapes are as described; no collision exists today, so the effect is latent. One case the finding missed: two same-named members of the SAME batch year get the same hint (`'98`), the same label and the same key, so `personList`'s fix needs more than "hint with the batch when available".
Live check run: the two collision queries above (0 rows each).
Corrections to the finding: add the same-name-same-batch case; occurrence "none today".
Orchestrator action: none.

### T7b-09 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `src/lib/login-attempt.ts` gained 22 lines in `e29823cb` (a site-wide cap of `FAILURE_ROWS_PER_HOUR = 120` refused rows per hour, `:38-47` and `:62-72`), so `recordLoginAttempt` is now `:49-106`; still no `statsWritesEnabled()` anywhere in the file. `admin-analytics.ts:1199-1234` (`failures`, `lockedOut` with the purge-aware LEFT JOIN, `LIMIT 20`, `failsThisWeek`) — exact. `src/lib/retention.ts:122-123` (`loginAttempts` on `KEEP_DAYS.securityLogs`) — exact. `stats-exclusion-rule.test.mjs:21` still omits `LoginAttempt`.
What I tried to refute it with: (1) the new cap — it bounds a flood, it does not gate dev or test traffic; (2) the read side — the `bool_and(l."userId" IS NULL OR u.id IS NOT NULL)` clause removes PURGED probe accounts (the 2026-08-25 fix), but a typo'd address from a local sign-in has `userId` NULL and is kept, and an abandoned throwaway that still exists is kept; (3) whether today's list holds such rows.
Why it stands / falls: the mechanism is unchanged and the comment-level claim (THE LIST THAT MATTERS is real people) depends on nobody signing in through the form from localhost or with a probe account. Today the list holds 18 addresses (cap 20, see T7b-13), none test-shaped by address, so the pollution is latent rather than present.
Live check run: the `lockedOut` query read-only → 18 rows, 0 matching `%example%|%probe%|%test%|%audit%`, max 9 tries. `SELECT reason, count(*) FROM "LoginAttempt" GROUP BY reason` → ok 790, no-account 59, wrong-password 44, bot-check 13, no-password-set 1.
Corrections to the finding: note the `e29823cb` cap (not a gate); occurrence "latent today".
Orchestrator action: none.

### T7b-10 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; the consequence and the fix direction are corrected)
Confidence in verdict: certain on the plan; likely on the index not being chosen
Citations re-derived: `prisma/schema.prisma` Visit `@@index([endedAt])` `:1508`, `@@index([userId, endedAt])` `:1511` (was 1543-1547); live `pg_indexes` → `Visit_pkey`, `Visit_endedAt_idx`, `Visit_userId_endedAt_idx`. The `startedAt` filters: `admin-analytics.ts:387,396,453,459,472,569,576,583,590` — exact (file unchanged). `index-coverage.test.mjs` has no Visit row.
What I tried to refute it with: a fresh `EXPLAIN (ANALYZE, BUFFERS)` of the journey CTE (`:467-489`) and of one `loadArrivals` groupBy at today's volume (4,254 Visit rows, 2,039 in the last 30 days, 2.4 MB).
Why it stands / falls: the plan is a `Seq Scan on "Visit"` as claimed, but the scan costs 3.3 ms of the CTE's 112.9 ms; the rest is `regexp_replace` over 9,636 unnested steps and the three sorts (in memory, 813 kB max). The language groupBy is 2.6 ms in total. A 30-day window over a 90-day-retained table selects a third to a half of the heap (48 % today), where Postgres prefers a seq scan anyway, so the proposed `@@index([startedAt])` would most likely not be used and would not move the time. At 2,000 members (≈3.5× today's 570) the journey query extrapolates to roughly 0.4 s, not 1.2 s, and the room still opens. Low stands as an advisory; the index is the wrong fix.
Live check run: journey CTE `EXPLAIN (ANALYZE, BUFFERS)` → Seq Scan 3.266 ms (2,039 rows, 2,215 removed), CTE scan 64.5 ms, Execution 112.863 ms. `EXPLAIN ANALYZE` of the language groupBy → Execution 2.635 ms.
Corrections to the finding: consequence "~1.2 s, sorts spilling" → "~0.4 s at 2,000 members, dominated by the regexp over every step, not the scan". Fix direction: if anything, collapse ids at write time (store the `:id` form beside the trail) or bound the steps; an index is unlikely to be chosen. Gate: none needed.
Orchestrator action: none.

### T7b-11 — CONFIRMED
Verdict: CONFIRMED (Low)
Confidence in verdict: certain
Citations re-derived: `scripts/ops/prune.mjs:39-40` (`/** Matches KEEP_DAYS.notifications … Change it there. */ const DEFAULT_DAYS = 30`, was 38-40; one import line added by `91c07fbc`), `:13` ("ONE policy, not two"). `src/lib/retention.ts:50` (`notifications: 30`), `:120-121` (the deleteMany) — exact. `.github/workflows/snapshot.yml:84-95` — exact; the false "this follows it" at `:89-91` and the stale "~800MB" at `:85-88` stand. No test pins the two (`grep -rl "prune.mjs\|DEFAULT_DAYS" src scripts --include='*.test.mjs'` empty).
What I tried to refute it with: whether prune now imports `KEEP_DAYS` (it does not; it imports only `db-tls.ts`).
Why it stands / falls: unchanged at HEAD, and the redundancy is proved by the job's own output.
Live check run: `gh run view 39901729544 --log` → "Notifications: 577 total, 0 older than 30 days".
Corrections to the finding: `prune.mjs:39-40`.
Orchestrator action: none.

### T7b-12 — FIXED-SINCE 19be10b0
Verdict: FIXED-SINCE 19be10b0 ("fix(platform): links stop prefetching pages nobody opens", 2026-09-29)
Confidence in verdict: certain
Citations re-derived: the two writes during render are unchanged — `src/app/(main)/messages/[id]/page.tsx:63-72` and `src/app/(main)/admin/messages/[id]/page.tsx:61-63`; both `[id]/loading.tsx` still exist. What changed: `src/components/messages/thread-list.tsx` and `src/components/admin/messages/thread-list.tsx` now import `Link` from `@/components/common/link`, which defaults `prefetch = false` (`src/components/common/link.tsx`), and `src/components/common/link-import-rule.test.mjs` fails any file that imports `next/link` directly. The installed Next docs (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md:304`): "`false`: Prefetching will never happen both on entering the viewport and on hover." No `router.prefetch` targets a thread (`grep -rn prefetch src` → only the landing page's `/login` and `/signup`).
What I tried to refute it with: any remaining path that renders a thread page without the member opening it (explicit `prefetch` props, `router.prefetch`, the proxy) — none.
Why it stands / falls: the finding's risk was a prefetch render marking a thread seen if the `loading.tsx` boundary ever moved. Prefetching is now off app-wide and pinned by a test, so the boundary is no longer the only guard; a thread is rendered only when opened. The write-during-render shape remains (a style point, not a defect).
Live check run: none needed.
Corrections to the finding: ruled fixed by an unrelated commit; the gate it asked for (a test that both `loading.tsx` exist) is no longer load-bearing.
Orchestrator action: none.

### T7b-13 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands; worse at HEAD on four tiles, one tile correct today)
Confidence in verdict: certain
Citations re-derived (files unchanged): `page.tsx:118-123` (On the site now, `p.online.length`; `take: 40` at `admin-analytics.ts:357`), `:518-523` (Got no response, `faces.isolated.length`, `LIMIT 30`), `:524-528` (Profile opens, sum of `mostViewed`, `LIMIT 8` at `admin-analytics.ts:725-730`), `:611-616` (found nothing, sum of top-10 `empty`, `admin-analytics.ts:542-548`), `:617-621` (Arrived from another site, top-8 referrers), `:622-626` (Browser languages, `arrivals.language.length`, top 8), `:715-719` (Types of notification, `byType.length`, `take: 10` at `admin-analytics.ts:877-882`), `:837-842` (Still locked out, `LIMIT 20`) — all exact.
What I tried to refute it with: each tile's true value today, with the room's own exclusion.
Why it stands / falls: today, Profile opens shows 387 against a true 2,829 (14 %, was 23 %); Searches that found nothing shows 17 against 73 (66 distinct empty queries in 90 days); Browser languages shows 8 against 13 stored values (en-IN, en-US, en-GB, en-AU, en-CA, en-SG, en, en-DE, en-NZ, de-DE, it-IT, de, en-NP — still overwhelmingly English); Got no response from anyone has HIT its cap — 30 shown, 86 qualify (T7b-06's query); Still locked out shows 18 of a cap of 20. Types of notification is CORRECT today (9 distinct types in the 30-day table, under the cap of 10) but the code writes more than ten types (`NOTIFICATION_ICON_META` maps 17), so it breaks again on a busy month. Arrived from another site reads 0 (no referrer rows in 30 days).
Live check run: `sum(cv."count")` profile opens with the exclusion → 2829 vs top-8 sum 387; `count(DISTINCT type) FROM "Notification"` → 9; zero-result searches in 90 days → 73, top-10 sum 17, distinct 66; distinct languages in 30 days → 13; uncapped isolated → 86; lockedOut → 18.
Corrections to the finding: today's numbers above; "Types of notification" correct today (not wrong); "Got no response" is now wrong in practice, not only at 2,000.
Orchestrator action: none (a look at `/admin/analytics?view=faces` would show 387 and 30).

### T7b-14 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `snapshot.mjs:107-108` (`posts_total`, `letters_total`, no `status`/`isHidden` filter; was 105-106), `:112` (`photos_total`, was 110), `:142-143,147` (the `add` calls). `page.tsx:334-345` (the two tiles with `trend: t("db.letters.total")` / `t("db.posts.total")`) — exact. `admin-analytics.ts:196-197` (the tiles' published+visible predicate) — exact. `stat.tsx:113` (`rising = last >= first`), `:130` (leaf when rising) — exact.
What I tried to refute it with: the photos sub-claim. The tile "Photos in the Collection" is `prisma.photo.count()` (`admin-analytics.ts:204`) with NO status filter, and the snapshot's `photos_total` is the same unfiltered count, so tile and trend AGREE; both include photographs waiting in the review room. That is a definition question about the tile, not the two-definitions drift this finding is about. Drop it from the finding (or file it separately as "the tile counts waiting photographs").
Why it stands / falls: the posts and letters halves stand and the gap has grown: `Post` today is letters 6 published+visible + 1 hidden (trend 7 vs tile 6); posts 17 visible + 8 hidden (trend 25 vs tile 17). The last 20 nights of `db.posts.total` read `21,21,22,23,…,25`, where moderation hiding posts draws as growth.
Live check run: `SELECT kind, status, "isHidden", count(*) FROM "Post" GROUP BY 1,2,3` and the 20-night `string_agg` of both metrics.
Corrections to the finding: line numbers; drop the photos sub-claim as stated.
Orchestrator action: none.

### T7b-15 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands). The orchestrator verified it at source at the audit; re-derived here at HEAD after the Catch-ups rework (`eb855c71`, `6fb896bd`, `44b20a91`, `5d5c6898`), which rewrote `catchups-core.ts`, `catchups-notify.ts`, `catchups.ts` and the settings surface.
Confidence in verdict: certain on the arithmetic and the copy; likely on members being misled (no member report exists)
Citations re-derived (HEAD):
- The instant: `src/lib/catchups-core.ts:323` `DEADLINE_HOUR_UTC_MS = 90 * 60 * 1000; // 01:30 UTC = 07:00 IST` (was 343); `snapToDeadlineHour` `:331-334`, `deadlineIn` `:337-339` (was 349-359); every answer window is still minted through it (`:779` `answeringPatch`, `:813` and `:870` extensions; question windows `:810`, `:863`, `catchups.ts:368`, `catchups/actions.ts:553`). `TICK_GRACE_MS` `:629` (was 651); `computeStatus` `:637-668` (was 659-681), `passed()` = `t >= m - TICK_GRACE_MS` `:641`, answering → published/sealed `:651-658`. So answering still ends at 06:55 IST on the named day.
- The words: `homeStateLine` `:1210-1229`, the sentence `:1226` (unchanged text); `catchupStageLine` `:1231-`, the sentence `:1266` (was 1302); both rendered (`catchups/(index)/page.tsx:165`, `catchups/[catchupId]/(home)/page.tsx:450`). `formatDayAndDate` (`utils.ts:302-`, `timeZone: VALLEY_TIME_ZONE`, `weekday: "long"`, no hour). The Keeper row: `src/components/catchups/settings/settings-surface.tsx:187` (`formatDayMonth(c.answersCloseAt)`) and `:195` (`` `Answers close ${closes}` ``) (was 204-212). The bell: `answerReminderMessage` `:1097-1106` (was 1137-1146), written by `catchups-notify.ts:242-248` inside `notifyReminder` `:201-249`.
- When the last reminder is written: `daysLeftUntil` `:168-175` (was 158-165); `dueReminder` `:690-696` (was 712-720); `valleyDaysLeft` `:1068-1076`. The `daysLeft = 1` bucket opens at close − 24 h = 07:00 IST the day before; `valleyDaysLeft` then returns 1 → "Answers close tomorrow"; the `days === 0` "Last day to answer" branch (`:1103`) still needs a write between IST midnight and 06:55 on the closing day, which the bucket has already spent. Unreachable for every snapped deadline.
- Never withdrawn: `catchup_reminder` rows are deleted only by the next reminder (`catchups-notify.ts:226-229`), by "Give everyone longer" (`catchups/actions.ts:1317-1327`, was 1583-1590), by leaving (`clearCatchupNotifications`, now in `src/lib/catchup-notifications.ts:38-61`, moved from actions.ts in `e49e6265`), and by the 30-day sweep (`retention.ts:120-121`). The publish/seal transition (`src/lib/catchups.ts:162-164`, `notifyPublished`/`notifySealed`, create-only, `catchups-notify.ts:252-`) and `submitEntry` (`catchups/actions.ts:1433-`) still touch none.
What I tried to refute it with: (1) whether the rework changed the close hour, the grace, or the sentence — no; (2) whether "Editions start by hand" removed answering windows — no, an Edition still collects, then answers on a snapped `answersCloseAt`; (3) whether a withdrawal was added on publish or submit — no; (4) a fifth surface: `editionCountdownLabel` (`:1117-1128`, "closes tomorrow" / "last day") feeds `countdownLabel` on the home (`(home)/page.tsx:269-277`) and `describeEditionStatus` — but no component renders `countdownLabel` (only `home/types.ts:65` declares it) and `not-yet-published.tsx:41` calls `describeEditionStatus` without dates, so it is not member-visible today; (5) the owner's 2026-10-17 decision "No reminders unless you've turned them on yourself" (`6fb896bd`, `2026-10-17-reminders-default-off.sql`, `DEFAULT_REMINDER_MODE` off).
Why it stands / falls: every surface that names the deadline still names a DAY on which answering is already shut at 06:55 IST, and the bell's last reminder still says "tomorrow" and is never withdrawn. Live, now: one Edition is answering with `answersCloseAt = 2026-10-25 01:30:00` UTC, so its home and list card read "Answers close Sunday 25 October" while answering ends at 06:55 IST that Sunday — 18:25 Saturday in California, 21:25 Saturday in New York, 01:25 Sunday in London (GMT that morning). Its `remindersSent` is 512 (daily bucket 2 at `DAILY_BUCKET_SHIFT = 8`), so the "tomorrow" reminder is due at 07:00 IST Saturday for the members who opted in. The rework narrows the BELL half: reminders are default-off since `6fb896bd`, and today 10 prefs say daily and 4 say last-day (3 off), so the misleading final nudge reaches those 14 members — and the 4 "last day only" members receive exactly and only that sentence (`isLastDay = days <= 1`, `catchups-notify.ts:216`). The PAGE half (home, list card, Keeper row) reaches everyone taking part.
Live check run: `SELECT status, count(*), max("answersCloseAt")::text FROM "CatchupEdition" GROUP BY 1` → answering 1 (2026-10-25 01:30:00), published 3, collecting 20. `SELECT "reminderMode", count(*) FROM "CatchupReminderPref" GROUP BY 1` → all 10, last 4, off 3. The answering Edition: `remindersSent` 512, 1 `catchup_reminder` row live. Node: `new Date(Date.parse("2026-10-25T01:25:00Z")).toLocaleString(..., {timeZone:"America/Los_Angeles"})` → 24/10/2026 18:25.
Corrections to the finding: every line number above; "never withdrawn" now also via `catchup-notifications.ts` (moved); the bell half reaches only opted-in members since 2026-10-17 (severity unchanged: the page wording alone misleads every member on every Edition, and the members who asked for a last-day nudge are told the wrong day). Fix direction unchanged; when withdrawing on publish, use the same type+link delete the extend path uses (`actions.ts:1321-1326`).
Orchestrator action: none needed; an owner question on the wording ("Last day to answer: Saturday 24 October" vs "Answers close 7 am Sunday, India time") was already drafted.

### T7b-16 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain on the mechanism; possible on frequency
Citations re-derived: `src/proxy.ts` changed in `dcad8dd8` (the session cookie is now found with `isSessionCookie`, chunk-aware) — the cookie-first rule is `:370-374` (was 367-371), the slide on non-action requests `:395-403` (was 393-401); public paths return at `:299-306`, the signed-out branch at `:307-`. `last-seen.ts:91-111` (UPDATE scoped `id AND userId`), `:125-152` (create; P2002 swallowed), comment `:147-150` — unchanged, exact. Sign-out: `sidebar.tsx:485`, `letterhead-profile.tsx:1528` (was 1519).
What I tried to refute it with: (1) the new `/api/auth/stale` route (`dcad8dd8`) that clears dead session cookies — `stale-session-rule.test.mjs:44` asserts `rv-visit` is NOT a session cookie and must not be cleared, and it only runs for a dead session, not on sign-out; (2) any other writer of `rv-visit` — none (`grep -rn "rv-visit\|VISIT_COOKIE" src` hits only the proxy and two tests).
Why it stands / falls: unchanged. A cookie minted under member A's session outranks the id B's session would derive; B's UPDATE matches nothing and B's create loses to A's primary key silently.
Live check run: members with `lastSeenAt` in the last 7 days and no Visit started in the last 7 days (owner and Jerry excluded) → 10 of 124 (was 2 of 165). Still an upper bound (it includes members whose JavaScript never ran), not proof.
Corrections to the finding: line numbers; the upper bound figure.
Orchestrator action: none.

### T7b-17 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `src/app/(main)/feed/page.tsx:43-45` (`after(() => logSearch({ scope: "feed", query: q, userId: session.user.id }))`, no `results`, was 38-40). The other three writers still pass a count: `directory/page.tsx:331`, `api/users/search/route.ts:89`, `api/places/search/route.ts:149`. `schema.prisma` `SearchLog.user … onDelete: SetNull` (`:1537`). `stats-exclusion.ts:70-73` keeps every NULL-user row. People search refuses signed-out callers (`api-gate.ts` 401 at `:96`). `admin-analytics.ts:542-548` builds "found nothing" from `results: 0`. Hints: `page.tsx:609` and `:636` still name three boxes, not the directory.
What I tried to refute it with: whether the feed now logs after its query (no) and whether the NULL rows have aged out (no, still inside the 90-day window).
Why it stands / falls: live, `feed` 8 rows, 8 with `results` NULL; `people` 26 rows, 12 NULL-user (the 2026-08-20/21 probe searches; 90-day window ends 2026-11-18); `directory` 162 and `places` 718, none NULL.
Live check run: `SELECT scope, count(*), count(*) FILTER (WHERE results IS NULL), count(*) FILTER (WHERE "userId" IS NULL) FROM "SearchLog" GROUP BY scope`.
Corrections to the finding: line numbers and counts above.
Orchestrator action: none.

### T7b-18 — CONFIRMED
Verdict: CONFIRMED (Low)
Confidence in verdict: certain on the mechanism; possible on occurrence
Citations re-derived: `src/app/(main)/messages/actions.ts` unchanged: `DOUBLE_SUBMIT_MS` used at `:111` (startThread) and `:179` (replyToThread) only; `adminReplyToThread` `:218-261` has no twin probe. `message-composer.tsx:55-59,83,125` (the `canSend` closure and Cmd/Ctrl+Enter); `admin/messages/thread-view.tsx:89` mounts it. `threads-rule.test.mjs:58-72` names exactly the two member actions.
What I tried to refute it with: Next's one-at-a-time action dispatch per client (`07-mutating-data.md:207`) — it serialises the two calls, it does not drop the second, so without a server twin check both land; the composer clears the body only after the first resolves.
Why it stands / falls: unchanged; the third write path C-128 missed.
Live check run: `grep -n DOUBLE_SUBMIT_MS` (two uses).
Corrections to the finding: none.
Orchestrator action: none.

### T7b-19 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; argued from CSS, not observed)
Confidence in verdict: likely
Citations re-derived: `conversation.tsx:96-98` (body `<p className="whitespace-pre-wrap …">`) and `:47-49` (system note) — unchanged, exact. `globals.css` gained only the `mention-wave` keyframes; still no `overflow-wrap`/`word-break` rule anywhere in it. `messages/[id]/page.tsx` and `admin/messages/thread-view.tsx` changed only their `Link` import. `notification-bell.tsx:485-486` (`<span className="min-w-0 flex-1"><p className="text-sm text-foreground">{notif.message}</p>`, was 478-479), panel `w-80` `:429` (was 422); `ui/dropdown-menu.tsx:44` `overflow-x-hidden` — exact.
What I tried to refute it with: a global or Tailwind-preflight wrap rule (none in `globals.css`; Tailwind v4's preflight sets none), and any `break-words` on the four elements (none).
Why it stands / falls: an unbroken token wider than its box overflows a `whitespace-pre-wrap` paragraph and is clipped by the card or the viewport; unchanged at HEAD.
Live check run: none possible without a browser.
Corrections to the finding: bell line numbers.
Orchestrator action: the finding's one-URL message at 390×844 settles it (needs a throwaway account).

### T7b-20 — CONFIRMED
Verdict: CONFIRMED (Low)
Confidence in verdict: certain
Citations re-derived: `stats-exclusion.ts:22-24` ("left out of every activity number in /admin/analytics") — exact. `admin-analytics.ts:684-693` (heartsGiven/heartsGot, no `counted`), `:916-933` (topCommenters/bookmarkers/photoLovers, no `counted`), `:742-770`, `:190-239`, `:246-266`, `:1165-1234` — exact (file unchanged; the `counted` at `:1210` is inside a comment). `stats-exclusion-rule.test.mjs:21` sweeps three tables only.
What I tried to refute it with: today's ranks.
Why it stands / falls: the owner is still #1 in "Who replies the most" (13 comments; next 12, then 1s) and is #2 in "Who hearts photos the most" (7, behind 21); the test account is no longer in either top 8 today, so the Jerry half is latent. The two tabs still disagree (Compare filters him out).
Live check run: the commenter and PhotoLove rank queries with the two ids flagged.
Corrections to the finding: today's ranks (owner #2, not #1, on photo hearts; Jerry off the lists).
Orchestrator action: owner decision as the finding says.

### T7b-21 — CONFIRMED
Verdict: CONFIRMED (Low). Canonical over T8b's routed lead (T8b holds it only as a lead, `reports/T8b.md:714-720`; no T8b finding).
Confidence in verdict: certain on the code path; likely on the consequence
Citations re-derived: `posthog-identify.tsx` unchanged: the "no reset() on the way out … a full page load" comment `:48-50`, `opt_out_capturing` `:52`, `identify` `:53`, the opt-out-outlives-sign-out note `:19-21`. No `reset()` on PostHog and no `opt_in_capturing` anywhere in `src` (the only `.reset()` calls are Turnstile, the image zoom and a lab composer). Sign-out: `sidebar.tsx:485`, `letterhead-profile.tsx:1528` (was 1519). `src/app/layout.tsx:90-107` mounts the provider at the root. posthog-js is still 1.418.1.
What I tried to refute it with: whether `signOut` now clears storage (no; it is `next-auth/react` `signOut({ callbackUrl: "/" })`), and whether the provider is scoped to the signed-in shell (no, the root).
Why it stands / falls: unchanged at HEAD.
Live check run: none possible (needs a browser).
Corrections to the finding: `letterhead-profile.tsx:1528`.
Orchestrator action: in a browser after signing out, `posthog.get_distinct_id()` on `/` still returns the member's cuid.

### T7b-22 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands; the fix direction is corrected). Verified at source by the orchestrator at the audit; re-derived here against the installed library.
Confidence in verdict: certain on the configuration and the library's behaviour; likely on volume (last night's snapshot: 1,240 PostHog events)
Citations re-derived: `posthog-client.ts:91` `autocapture: true`, `:133` `mask_all_element_attributes: false`, no `mask_all_text` (library default `mask_all_text:!1` in `node_modules/posthog-js/dist/module.js`), `:80-85` session-replay-off comment, `:86-90` the autocapture rationale, `:134` `mask_personal_data_properties: true`. No `ph-no-capture`/`ph-sensitive` anywhere in `src`. The contact links: `profile/[id]/page.tsx:287-309` (`href: \`mailto:${contactEmail}\`` `:294`, `href: \`tel:${p}\`` `:307`), rendered as a plain `<a href={method.href}>` with the visible value in `src/components/profile/get-in-touch.tsx:92-110`. The broken promises: `posthog-identify.tsx:10-13`, `posthog-client.ts:80-84`, `privacy/page.tsx:65` and `:133`.
What I tried to refute it with: (1) `mask_personal_data_properties: true` — in 1.418.1 it masks campaign/URL query parameters (`update_campaign_params`, the `$current_url`/`$referrer` handling), not element attributes or text; (2) the library's own filters: `tn()` refuses only `ph-sensitive`/`ph-no-capture` ancestors, hidden/password inputs and card/SSN-like names; `hn()` refuses only card- and SSN-shaped values; an e-mail address, a phone number and a name pass both; (3) `respect_dnt: true` — removes members with Do Not Track on, not the class.
Why it stands / falls: in `yl()` (the autocapture element builder) `$el_text` is added for `a`/`button` and their spans unless `maskAllText`, and — the detail that changes the fix — the nearest anchor's `href` is collected as `b` independently of `maskAllElementAttributes` and written as `m[0].attr__href = b` AFTER the per-element attribute loop, so `mask_all_element_attributes: true` would still send `attr__href: "mailto:<address>"` / `"tel:<number>"` for a tap on the contact sheet. Only `ph-no-capture` (or `ph-sensitive`) on the sheet and on other-member surfaces, or autocapture off, keeps them out; `mask_all_text: true` removes the names.
Live check run: none possible (no PostHog key here); source of posthog-js 1.418.1 read directly (`function yl`, `function tn`, `function hn`, the config defaults).
Corrections to the finding: fix direction — drop "either `mask_all_element_attributes: true` or `ph-no-capture`" in favour of "`mask_all_text: true` AND `ph-no-capture` on `get-in-touch.tsx`'s rows, the directory cards and every surface rendering another member's details (or autocapture off)". Gate: the source test should assert `mask_all_text: true` and a `ph-no-capture` class on `get-in-touch.tsx`'s anchor, not only the config flag.
Orchestrator action: the one-tap network-panel proof in the finding (an `/ingest/e/` body carrying `attr__href: "mailto:…"`), with a throwaway account on its own profile.

## New candidates

### VT7b-01 — "Which site sent them" has read "Everyone arrived directly" since 2026-09-15: the beacon moved the Visit write onto `/api/presence`, whose Referer is always the site itself, so no referrer has been recorded on any of ~2,540 tracked visits
- Severity: Low (an analytics panel and a headline tile silently report zero, and say so in words, for the whole tracked period; no member is affected)
- Confidence: certain (code path and live table)
- Where:
  - `src/lib/last-seen.ts:246-251` — `const referrer = refererHost(h.get("referer"), h.get("host"))`, with the comment "Same-origin referrers are dropped: every internal navigation would otherwise report this site as its own source"; `refererHost` `:345-354` returns null when the referring host equals the request's host.
  - `readPresence` (`last-seen.ts:234-262`) has exactly one caller, `src/app/api/presence/route.ts:57`, i.e. the beacon's `fetch("/api/presence", { …, keepalive: true })` (`src/components/analytics/presence-beacon.tsx:40-44`). The Referer of that POST is the member's current page on this site (`Referrer-Policy: strict-origin-when-cross-origin`, `next.config.ts:195`), so `refererHost` always drops it. `presencePingSchema` (`validators.ts:315-321`) carries only `{ kind, path }`, so `document.referrer` never reaches the server.
  - Readers: `admin-analytics.ts:576` (`loadArrivals` referrer groupBy, `take: 8`), the tile "Arrived from another site" (`page.tsx:617-621`, hint "Visits that came from a link somewhere else rather than typing the address or using a bookmark") and the panel "Which site sent them" (`page.tsx:644-646`, empty state "Everyone arrived directly.").
- Taxonomy: 6a silent failure (a telemetry column that can only ever be NULL); L9 (a comment true of the old writer, false of the new one); regression from `b1467c5d` (2026-09-15, "count visits from the browser").
- Expected: the domain a member clicked through from (WhatsApp, Gmail, LinkedIn) on the first page of a sitting, as the panel's note promises.
- Actual, live: `Visit` rows by week — before the beacon 2–5 referrers a week (17 in total, 2026-08-17 → 09-14, all from the old layout writer); since the week of 2026-09-21, `count(referrer) = 0` on 613 + 965 + 414 + 366 + 182 tracked visits. The tile reads 0 and the panel says "Everyone arrived directly." The audit-time finding T7b-13 called this tile "correct today (2 distinct hosts, 15 visits)" — those were pre-beacon rows still inside the 30-day window; they have since aged out of it.
- Why: the beacon commit moved the write from the layout's page request (whose Referer was the external site on an arrival) to a same-origin `fetch`, and kept the header read.
- Proof: read-only, done. `SELECT to_char(date_trunc('week', "startedAt"),'YYYY-MM-DD'), count(*), count(referrer), count(*) FILTER (WHERE cardinality(paths)>0) FROM "Visit" GROUP BY 1 ORDER BY 1`.
- Fix direction: send `document.referrer` with the first `view` ping of a sitting (add an optional `ref` to `presencePingSchema`, host-only, same-origin dropped as today), and record it only on the create; or accept the loss and remove the tile and panel. Either way correct the comment at `:246-250`.
- Gate: a `presence-rule.test.mjs` case that the beacon's first ping carries a referrer field the route reads, or a source test that `readPresence`'s referrer does not come from the request's own `referer` header.
- Known-related: T7b-13 (the tile is one of the capped six; its "correct today" note is superseded); C-163/T7b-16 (same beacon write path).

## Cross-zone notes
- **T7b-01 and V-L-b's suggestion of FIXED-SINCE.** Not ruled FIXED-SINCE because no commit fixed it: `snapshot.yml` and `collectGithub` are untouched since the audit, and the metric began recording on the night of 2026-10-02 because the REPOSITORY WENT PUBLIC (`gh repo view` → PUBLIC; `44516525`, the README rewrite of 2026-10-02 20:59 BST, says "The repository is public"). Runs before that night still print `GitHub 403`. The workflow still lacks `actions: read`, so a return to private re-breaks it silently, and the no-reader and green-on-failure halves are unchanged. Ruled DOWNGRADED to Low with that correction. L3-08 / L11-01 (the media backup) read correctly from the metric since 10-03: `backup.ok` 1, `failures_last_10` falling to 0 by 2026-10-11.
- **T7b-03 = T3-16.** V-T3 picks the canonical id (its file showed T3-16 pending when this was written). Whichever is canonical, the live data has aged out (0 rows) and the migration never ran; add the second lying comment, `catchups/actions.ts:1321-1324`.
- **T7b-04 = canonical for T5-15** (V-T5's ruling stands). Add `scripts/ops/snapshot.mjs:103-104` as a reader.
- **T7b-12** is closed by the platform-health session's `19be10b0` (app-wide `prefetch=false`, pinned by `link-import-rule.test.mjs`), not by anything in this zone.
- **T7b-13** (for whoever compiles the scariest list): "Got no response from anyone" has now hit its LIMIT 30 (86 qualify), the case the finding predicted for 2,000 members, at 570.
- **T7b-15** (V-T2 / T2a owns the Catch-ups surfaces): reminders are default-off since `6fb896bd` (the owner's 2026-10-17 "No reminders unless you've turned them on yourself"), which narrows the bell half to opted-in members (10 daily, 4 last-day) but not the page wording. One Edition is answering now and closes 2026-10-25 01:30 UTC, so the live pages say "Answers close Sunday 25 October" over a 06:55 IST Sunday close.
- **T7b-21 / T7b-22** are canonical for T8b's two routed PostHog leads (T8b filed them as leads only). T8b-06 item 6 (the privacy page's "first-party usage analytics") is the policy-text half of T7b-22; they can share a fix unit.
- **T8b's chunked-cookie lead** (run 1's lead on `proxy.ts:64-66`): the proxy now finds the session with the chunk-aware `isSessionCookie` (`dcad8dd8`), so the derived visit id no longer falls back to the user agent when the token chunks. That lead can be closed.

## Coverage
- Checked completely at HEAD `88642426` (every citation re-opened, every changed file diffed against `495ecdd2`, a refutation attempted, live read-only proof run where one was possible): T7b-01, T7b-02, T7b-03, T7b-04, T7b-05, T7b-06, T7b-07, T7b-08, T7b-09, T7b-10, T7b-11, T7b-12, T7b-13, T7b-14, T7b-15, T7b-16, T7b-17, T7b-18, T7b-19, T7b-20, T7b-21, T7b-22 (22 of 22).
- Proved only by argument (no browser or sign-in allowed): T7b-02 (the pure rule and its test), T7b-12's former prefetch path (now moot), T7b-16 (shared-browser sequence), T7b-19 (CSS clipping), T7b-21 (`get_distinct_id` after sign-out), T7b-22 (the `/ingest` body; settled from posthog-js 1.418.1's source instead). The orchestrator actions under each say what would finish them.
- Live read-only checks run this session: `MetricSnapshot` sources, the github metric series and the snapshot lag (`::text`); `gh run view` on three snapshot runs and `gh run list`; `gh repo view` visibility; `Notification` `/answer` rows and the oldest notification; Jerry's `lastSeenAt` vs his visits; the `isolated` and `lurkers` queries with identity breakdowns; the `lockedOut` list and `LoginAttempt` reasons; `pg_indexes` on Visit and two `EXPLAIN (ANALYZE)` plans; the capped tiles' true values; `Post` by kind/status/hidden and the 20-night series; the answering Edition, its `remindersSent` and reminder rows; `CatchupReminderPref` modes; the presence upper bound; `SearchLog` by scope; the commenter and photo-love ranks; `Visit.referrer` by week (VT7b-01). All SELECT/EXPLAIN.
- Source read for this zone at HEAD: `scripts/ops/{snapshot,prune}.mjs`, `.github/workflows/snapshot.yml`, `src/components/layout/{unread-store.ts,notification-bell.tsx,page-header.tsx}`, `src/lib/{stats-exclusion,last-seen,login-attempt,catchup-notifications,catchups-notify,admin}.ts`, `src/lib/catchups-core.ts` (deadline, status, reminder and wording functions), `src/lib/admin-analytics.ts` (every cited range), `src/app/(main)/admin/analytics/page.tsx` (every cited tile), `src/components/admin/admin-counts.tsx`, `src/components/catchups/settings/settings-surface.tsx:183-200`, `src/proxy.ts:299-403`, `src/components/common/link.tsx`, `src/components/common/link-import-rule.test.mjs`, `src/app/(main)/messages/actions.ts`, `src/components/messages/{conversation,message-composer}.tsx`, `src/components/analytics/{posthog-identify.tsx,posthog-client.ts:76-140}`, `src/components/profile/get-in-touch.tsx:80-110`, `src/app/(main)/profile/[id]/page.tsx:246-309`, posthog-js 1.418.1 `yl`/`tn`/`hn`/config defaults, Next's `link.md:304`.
- Not done: the demo database (deferred by the owner); PostHog's project time zone (still an owner check); V-T3's choice of canonical between T3-16 and T7b-03.

STATUS: COMPLETE at HEAD 88642426
