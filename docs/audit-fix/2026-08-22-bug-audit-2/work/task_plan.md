# Second pre-release bug & stability audit — task plan (2026-08-22)

Audit-only session. No application code changes. Report goes to
`docs/planning/audits/bug-report-2.md`. First audit's findings were all dispositioned
(4 fix sessions, closed 2026-08-21); dedup baseline = docs/TRAPS.md + bugs.md "Settled" +
bugs.md Open items (2,3,5,5b,6,9,12,12b,13,14,15,16,17,18).

## Phases
- [x] Phase 0: orient — gates green (54/54 unit, check 25.8s clean), dev server up,
      schema read, TRAPS read, bugs.md read. Uncommitted turnstile.ts diff = another
      session's TEMP repro (forced-interactive test key) — audit around it, affects live auth tests.
- [x] Phase 0b: live numbers — DB 112MB (Place 97MB/234,935 rows; 52 users), 129 indexes
      (lower()/trgm confirmed applied → db-indexes-live.json, db-sizes-live.json), pool max
      5/instance vs Supavisor ~200, crawl baseline clean (17 routes, 0 console errors).
      Leads seeded to agents: demo-reset cron on prod (RESOLVED clean — deliberate no-op),
      backup.yml IST-vs-UTC comment mismatch with catchups cron (OPEN → dates lens),
      publicPaths "//" prefix quirk (OPEN → routes lens).
- [ ] Phase 1: finder fan-out (workflow, ~22 territories+lenses, model=inherit)
- [ ] Phase 1b: my own orchestrator reads (proxy.ts, prisma.ts, auth.ts, connection math)
- [ ] Phase 2: validation workflow — one adversarial validator per candidate finding
- [ ] Phase 2b: live confirmation (single browser, serialized): BLNS fuzzing, safe repros,
      verify:crawl baseline, test account "Audit TestBird 2"
- [ ] Phase 2c: completeness critic rounds until 2 consecutive dry
- [ ] Phase 3: report + 2k dossier + verified-clean map + coverage map + owner scorecard,
      cleanup test data, commit, progress.md
- [ ] Phase 4 (owner ask 2026-08-22): DISK CLEANUP at session end. Frees ~1.6GB.
      (a) rm -rf .next-stale-cleanup-* (213MB dead moved-aside build) — safe.
      (b) rm old ~/.claude/projects/-Users-sanan-Documents-rv-connect/<uuid>/ session
          transcript dirs (1.4GB total; biggest b777c295=356MB) EXCEPT current session
          c3310be4-e97c-4705-9294-d86778bf6453 and any dir mtime < ~10min (possible live
          concurrent session). Do NOT touch .next (185MB, live build).

## Decomposition rationale
Territory agents follow write-path density (Glasswing ranking: actions files, libs with
state, crons, webhooks first); cross-cutting lenses (races, caching, IST, silent failures,
scale, validation, Vercel limits, client-React, proxy drift, test quality) get their own
agents so nothing falls between territorial cracks.

## Constraints carried into every brief
- Read-only. No DB access at all for agents (I do live checks). No npm run check (OOM
  trap). No browser (one Chrome max, mine). No git mutations.
- Dedup: TRAPS.md + bugs.md Settled/Open are known; do not re-report.
- Taxonomy is a floor not a ceiling. Report format: id/title/severity/status(candidate)/
  file:line/expected vs actual/argument/proof-plan.

## Candidate findings ledger
- Finder fan-out complete: 204 candidates (14 H, 85 M, 105 L), 292 clean areas, 144 leads.
  Raw → findings-raw.json; zone batches → batches/*.json. Heavy cross-agent dup expected.
- Validation workflow (18 adversarial validators, one per locality zone) running.

## Orchestrator hand-verifications (my own eyes, not agent claims)
- C-122 CONFIRMED High: createPost verified-gate skip reads raw saveAsDraft (line 113) but
  isDraft requires kind==="letter" (line 203). kind=post + saveAsDraft=true → gate skipped,
  status=published. Unverified account publishes to feed. Real.
- C-084 CONFIRMED (sev TBD): razorpay webhook payment.captured guards status:{not:"paid"},
  so a replayed/out-of-order capture after refund matches "refunded" and resurrects to paid +
  re-mints bird pick. Fix: transition only from created/failed. Real.
- C-091 data-check: UserPlace.city stores clean short names ("Bengaluru","Delhi"); premise of
  "stored differs from filter form" weakened → hand to directory validator with this evidence.
