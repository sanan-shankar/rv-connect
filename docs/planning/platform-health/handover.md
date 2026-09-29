# Platform health: handover

Started 2026-09-29. **Read `brief.md` first**: the owner's own words, numbered. This file is the
ledger: what was found, what is done (with the commit and the proof), what is left, and how to
resume. It is edited in place; the last session to touch it updates the board before stopping.

The owner's register matters (brief ¶1–¶7): he was forced onto Vercel Pro after sessions
assured him Hobby would hold 2,000 members, deleted a nightly failure email for a month
believing "the next commit will fix it", and says he "really can't tolerate any more nonsense"
(¶11). Every claim to him must be measured, not estimated, and anything not yet verified must
be said to be not yet verified. He is non-technical: plain words, no jargon without a gloss.

## The board

| # | Ask (brief ¶) | Status | Proof / next step |
|---|---|---|---|
| 1 | What is eating Fluid Active CPU (¶1, ¶2, ¶6) | **FIXED, awaiting measurement** | Cause measured: link prefetching (below). Fix `c5fee5b4`, live 2026-09-29 ~11:19 UTC. **Next:** re-measure after 2026-09-30 11:30 UTC (command below) and record the before/after in `docs/OPERATIONS.md` "Capacity". |
| 2 | The nightly failure email (¶4) | **DONE, proved** | It was `backup.yml`'s media job, failing every night since 2026-08-29 (R2 has no GetObjectTagging). Fix `5b891c92`. Run 36560742662: 111 photos copied, 0 failures, backup 6,386 objects ≥ live 6,032. |
| 3 | Backups actually work (¶4) | **DONE, proved** | `0cdfcaa3`: every night's dump is now restored into a scratch Postgres in CI. Run 36564583666: dump 984 KB (was 12 MB), restored 278 members / 234,935 places / 278 member places, no errors. **Next:** confirm the first *scheduled* run (20:30 UTC nightly) also passes and logs "Place list unchanged". |
| 4 | Supabase "Unhealthy", log ingestion 1.55 of 1 GB (¶3, ¶9) | **WAITING ON OWNER** | Empty `api` schema created in both DBs (`d4704ab0`). He was given click-by-click steps (Data API on, exposed schemas = `api` only, both projects). **Next:** his screenshot showing Home = healthy; then watch log ingestion stop climbing. Do NOT try to read the Supabase CLI token from the keychain: that was refused as credential exploration, rightly. |
| 5 | Supabase fine for the next month (¶11) | **IN PROGRESS** | Done: sign-in flood cap + DB size alarm (`ddae0afb`), backup egress cut ~1.2 GB/month (`0cdfcaa3`). Blocked on #4 for logs. **Next:** ask him for the org **Usage** page (billing-cycle dates + daily egress chart) — the cycle start is UNVERIFIED (assumed ~1st). |
| 6 | Final confirmation, 2,000 members, both plans (¶11) | **TODO** | Write a "Capacity" section in `docs/OPERATIONS.md` from measured numbers only (below), then answer him in plain words. Vercel: he accepts it needs a month of monitoring. Supabase: he wants it "perfectly fine" for the next month — say exactly what that rests on. |
| 7 | The audit's High findings (¶5) | **TODO** | Bug audit 3 is paused (`docs/audit-fix/2026-09-24-bug-audit-3/`). Two are PROVED and security: **L2-01** (lab pages render below their admin gate) and **O-07** (DB connection not encrypted). Then the rest (list below). |
| 8 | Renovate Next 16.3.7 preview failed (¶12) | **TODO (low)** | Branch `renovate/next.js`, deploy failed fetching Google fonts (`Can't resolve '@vercel/turbopack-next/internal/font/google/font'`). Production unaffected. Re-run / inspect; do not merge until it builds. |
| 9 | Explain how this was found (¶11) | **DONE** (answered in chat) | Measured with `vercel metrics` per route instead of estimating per visit. |

## What was measured (2026-09-29)

**Vercel CPU, 7 days to 09-29:** 87.6 min Active CPU (~6.3 h/month; Hobby allows 4 h). By route:
`/profile/[id]` 33% (27,841 renders), `/feed` 13% (8,190), `/directory` 8% (3,909),
`/api/presence` 7% (8,679), `/collection` 7%, `/api/photo/download` 4% (89 calls at 2.6 s each).
Real page views from `Visit.paths` in the same week: profile ~546, feed ~739, directory ~755,
3,266 in all, 144 members. Total ~67,000 page renders: **~18 server renders per real view**.
Referrers of the profile renders: `/directory` and `/feed`. Cause: every signed-in route has a
`loading.tsx`, and Next prefetches such a route on viewport entry by rendering its layouts; the
(main) layout runs auth, unread counts, the Catch-up advance, the mail drain and touchLastSeen.
One year's directory page holds 40 profile cards. Fix: `src/components/common/link.tsx`
(prefetch off by default), all 105 imports switched, `link-import-rule.test.mjs`, TRAPS.md.

**Vercel money:** Pro = $20/month including $20 usage credit (Vercel docs, fetched 2026-09-29).
September to the 29th: $1.59 of usage beyond the plan line; billed beyond the plan: $0.00. Last
full week (09-22..28): $1.125, of which ~$0.78 scales with traffic (CPU $0.32, Fast Origin
Transfer $0.16, Observability Events $0.15, invocations $0.075, provisioned memory $0.058).
Straight-line to 2,000 members BEFORE the fix: ~$25/month, i.e. slightly over the credit. The
fix targets exactly the traffic-scaled items; the post-fix figure is what item 1 measures.

**Supabase (his screenshots, 11:57 IST, and SQL):** egress 1.83 / 5 GB this cycle; database
140 / 500 MB on Supabase's meter (Postgres's own `pg_database_size` 119–125 MB; `Place` is 97 MB
of it with indexes, member data < 20 MB); log ingestion **1.55 / 1 GB (over)**; peak connections
12/60; CPU 2%, RAM 53%; Security Advisor 0 errors, 0 warnings, 41 info = RLS on with no policy
(deliberate deny-all, fine). 2,688 Postgres errors/24 h, all `schema "pg_pgrst_no_exposed_schemas"
does not exist` every 32 s = item 4. Supabase's billing FAQ (fetched): over a Free quota there is
a grace period, then possible pause / read-only / 402 on every request. Postgres logging settings
are minimal (`log_statement=ddl`, no connection logging), so the app is not the log source.

## Commands

- CPU by route (run from `/tmp`; the repo is not `vercel link`ed; `--since 30d` times out):
  `vercel metrics vercel.function_invocation.function_cpu_time_ms -p rv-alumni -a sum --since 1d --group-by route --order-by value -l 20 -F json`
  and the same with `vercel.function_invocation.count`. Compare against the 7-day baseline above
  scaled to a day (~12.5 min/day; profile ~3,980 renders/day).
- Money: `vercel usage --from YYYY-MM-DD --to YYYY-MM-DD -F json`.
- Real views: `node scripts/dev/run-sql.mjs --inline "SELECT count(*) FROM \"Visit\" v, unnest(v.paths) p WHERE v.\"startedAt\" > now() - interval '1 day' AND p LIKE '/profile/%'"`.
- Backup runs: `gh run list --workflow backup.yml --limit 3`; logs `gh run view <id> --log | grep -E "restored:|Place list"`.

## Item 7: the audit's Highs, in the order to take them

All RECOMMENDED order; the session may reorder with a reason. Before each, `git log --oneline -15`
and `git status`: another session has been doing email work in this tree and may have taken one
(T5-01 especially).

1. **L2-01, PROVED.** `/lab`'s admin check lives only in `src/app/lab/layout.tsx`; a crafted
   RSC request renders a page below it. Eight server lab pages read data (the lab index,
   new-post, directory, comments, catchups/settings, sketches, swipe, magazine); 25 are server
   components. RECOMMENDED: a lab gate helper (keep `notFound()`, matching the layout's
   hide-that-it-exists posture) called at the top of all 25 server `page.lab.tsx`, and a test in
   `src/lib/gate-coverage.test.mjs` beside "every /admin page checks the role itself" requiring
   it in every non-`"use client"` lab page. Full finding: `work/reports/L2.md`, "L2-01".
2. **O-07, PROVED locally.** `pg` is given no `ssl` and the connection string asks for none.
   Production needs one check of the Vercel env (owner's; don't read secrets). Read the finding
   in `work/reports/O.md` before touching `src/lib/prisma.ts`.
3. Then, from `bug-report-3.md`'s table: L8-01 (Fast Origin Transfer: the photo-download
   converter re-encodes every photo through a function, 2.6 s CPU a call; the directory re-sends
   its map per keystroke), L8-05 (a hostile link in one answer burns CPU), O-03/T5-17 (a 5-second
   pool wait signs a member out), T5-01 (mistyped signup email is stuck), T3-01/T3-02/T3-03
   (Catch-up picture picker never mounted; library question loses its kind; "Start it again"
   does nothing), T6-02 (batch-year change leaves the old group). Each: read the finding, prove
   it, fix, pin with a test, one commit each.
4. When an audit finding is fixed here, say so in that audit's `work/task_plan.md` so its paused
   campaign does not redo it. Already fixed here: L3-08/L11-01 (backup), L5-02 (flood cap and the
   size half of L5-08), part of L5-07 (backup egress).

## Operating notes

- **Shared tree.** Another session commits here (email work). Never `git add -A`. When
  `progress.md` or `docs/history/progress-2026-09.md` holds someone else's uncommitted entry,
  stage `HEAD` + your entry only: write the blob with `git hash-object -w --stdin` and set it with
  `git update-index --cacheinfo 100644,<sha>,<path>`, then `git commit` with no pathspec after
  checking `git diff --cached --stat` shows only yours. Same for any code file with their edits.
- **The Mac is memory-starved** (10–12 GB swap on 2026-09-29): the full `npm run check` took
  10 minutes. Single gates: `npm run check -- types|lint|tests|security`. Never run it alongside
  `npm run visual`.
- **Pushing is authorised** for this work (brief ¶11: "push when you need"). A push deploys.
- Test account: Jerry Maguire, `sanan.shankar@gmail.com`, via `scripts/qa/_dev-login.mjs`.
- Supabase project ref (main): `vxnbuifngfuubbueslem`. Vercel projects: `rv-alumni`,
  `rv-alumni-demo`, team `sanan-shankars-projects`.
- RECOMMENDED for him (dashboard, his call): a Vercel **Spend Management** cap on Pro, so a bot
  can never run up a bill silently; Vercel's default only *notifies*, at $200.
