# Pre-Release Bug & Stability Audit — Task Plan

**Goal**: Exhaustive audit-only bug/stability sweep of rv-connect before public release, per
`docs/planning/bug-audit-prompt.md`. Deliverable: `docs/planning/audits/bug-report.md` with
findings (Confirmed/Suspected), phased fix plan, 2,000-user dossier, verified-clean map,
coverage map. NO application code changes this session.

**Hard rules in force**: audit-only; no `db push`; no deploys/pushes; shared prod DB (writes only
via app UI under test account "Audit TestBird", cleaned up at end); other sessions' uncommitted
work in tree is untouchable; commit only the report files at the end.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 0 | Orient: read bugs.md, pipeline doc, inventory, uncommitted-diff note | complete |
| 1 | Baseline: npm run check, verify:crawl console baseline, dev-server auth | complete |
| 2 | Glasswing ranking + territory/lens partition (decomposition rationale) | complete |
| 3 | Fan-out wave 1: territory agents + cross-cutting lens agents (Workflow) | complete |
| 4 | Live reproduction + naughty-strings fuzzing via browser MCP (orchestrator only) | complete |
| 5 | Validation wave: independent refuter per canonical C/H (Workflow) | complete (44/44) |
| 6 | Completeness critic rounds until 2 consecutive dry | complete (R1 +2 Low, R2 dry) |
| 7 | Write bug-report.md + 2,000-user dossier + k6 plan | complete (1061 lines) |
| 8 | Cleanup test data (none — read-only), commit report, update progress.md | in progress |

## FINAL RESULT
45 canonical findings: 2 Critical, 22 High, 17 Medium, 4 Low. 1 candidate refuted to dossier
(B-094). Plus 68 Medium roots + 117 Low appendix. Deliverable: docs/planning/audits/bug-report.md.
Two completeness rounds converged (R2 fully dry). No test data created (read-only audit).

## Artifacts on disk (resume anchors)
- Wave-1 finders: run wf_a3eccac4-718 (26/26 done). Extracted: docs/planning/audits/wave1/*.json,
  wave1-ledger.tsv (355 rows), wave1-fullmap.json (id->full finding).
- Canonical C/H set: docs/planning/audits/canonical.py (44 findings B-001..B-122).
- Validation: run wf_2d7f31fa-fb2, script docs/planning/audits/validation-wave.mjs.js,
  items docs/planning/audits/validation-items.json. Verdicts land in that run's journal.jsonl.
- If validation was cut: resume with Workflow({scriptPath: validation-wave.mjs.js,
  resumeFromRunId: "wf_2d7f31fa-fb2"}).

## Key facts established

- Dev server IS running (200 on /). Do not restart or kill it.
- Working tree has UNCOMMITTED changes from another session (security hardening):
  `src/app/(main)/catchups/round/[editionId]/page.tsx`, `src/app/(main)/directory/where.ts`,
  `src/app/api/places/search/route.ts`, `src/app/api/users-by-batch/route.ts`,
  `src/app/api/users/search/route.ts`, `src/components/settings/actions.ts`,
  `src/lib/auth.ts`, `src/lib/rate-limit.ts`. Audit the tree AS IT STANDS; never touch these.
- `docs/planning/bugs.md` open items (do NOT re-report): #2 stale collection screenshot,
  #3 cosmetic pill trims, #5 desktop notif affordance, #5b signed-out 404→login bounce,
  #6 raw-SQL timestamp trap (timestamp without tz; IST +5:30 toLocaleDateString risk noted
  there — deeper instances ARE in scope), #9 hoopoe hero-only, #12/12b owner decisions,
  #13 copy pass, #14/15/16 owner env actions, #17 hoopoe Safari zoom (3 disproofs, don't re-theorise).
- 14 actions files, 14 API routes, ~90 files in src/lib. `src/generated/` is generated — out of
  audit scope except as evidence of schema shape.
- Security audit done 2026-08-20 (74 tracked/0 open) — do not re-run security; stability/DoS/
  resource exhaustion IS in scope.

## Resume protocol (if the session pauses mid-run — owner will say "continue")

1. Re-read this file, findings.md, and progress notes first. Do not redo Phases 0-2.
2. Wave 1 workflow: run ID `wf_a3eccac4-718`, script at
   `~/.claude/projects/-Users-sanan-Documents-rv-connect/15ec2e8b-2475-471d-8705-ac3d54e9231c/workflows/scripts/bug-audit-wave-1-wf_a3eccac4-718.js`,
   transcript/journal at
   `~/.claude/projects/-Users-sanan-Documents-rv-connect/15ec2e8b-2475-471d-8705-ac3d54e9231c/subagents/workflows/wf_a3eccac4-718/journal.jsonl`.
   - If wave 1 finished before the pause: its structured results are in the journal; read
     journal.jsonl rather than re-running anything.
   - If it was cut mid-run: relaunch with
     `Workflow({scriptPath: <above>, resumeFromRunId: "wf_a3eccac4-718"})` — completed agents
     return cached results instantly; only unfinished ones re-run. Never relaunch fresh.
3. After wave 1: compile findings into findings.md (dedupe, orchestrator-check against code),
   THEN Phase 4 live repro (single browser, test account "Audit TestBird" — check whether it
   already exists before creating a second one), THEN Phase 5 validation workflow
   (ONE refuter per finding — owner's usage-discipline instruction, see memory
   feedback_usage_and_machine_load.md), THEN completeness rounds, report, cleanup, commit.
4. Owner instructions given mid-session that bind the rest: no wasted usage; one validator per
   finding; no parallel browser/screenshot fleets; heavy suites (crawl/visual/e2e) not re-run
   without a new reason. Crawl baseline is already captured in findings.md.

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | | |
