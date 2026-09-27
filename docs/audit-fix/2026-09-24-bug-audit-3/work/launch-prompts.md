# Launch prompts (for any session that has to relaunch a finder or validator)

Model: `opus` since 07:55 BST 2026-09-24 (the owner switched the session off Fable after the session
limit; the first half of the fleet ran on Fable 5.1). `subagent_type: general-purpose`,
`run_in_background: true`. Keep ≤ 7 in flight.

## Lens template (L2–L12)

> You are lens **<ID> — <name>** in the third pre-release bug and stability audit of rv-connect at
> /Users/sanan/Documents/rv-connect. All tools work; do not test them.
>
> [If a partial report exists: "A previous run was killed by an API usage limit. Its partial report is
> at `work/reports/<ID>.md`. Read it first, keep what it holds, continue from its Coverage."]
>
> Read, in this order and IN FULL: `docs/audit-fix/2026-09-24-bug-audit-3/work/brief-common.md` (the
> owner's words, the rules — read-only, SELECT/EXPLAIN-only database, no gates, no Playwright, no
> browser, never sign in, never touch git, scratch under /tmp only — the method, the taxonomy, the
> exact report format), your charter `## <ID> — ...` in `work/charters.md`, `work/dedup-baseline.md`,
> `work/leads-routed.md` (every row addressed to <ID> is a seeded question), `work/findings.md`
> (orchestrator notes, live fact sheet, vendor limits, live-pass results), `work/candidates.md`
> (every candidate already found — do not re-report; cite and extend), and the territory reports
> named in the lens-specific note below. Then `docs/TRAPS.md`, `CLAUDE.md`.
>
> A lens sweeps the whole codebase with one question; territory finders have read their areas deeply
> and their findings are in `work/reports/*.md` — your value is the cross-cutting table and the
> interleavings/classes nobody in a territory saw. Your report is `work/reports/<ID>.md`: create it
> FIRST, put your table in early, append findings as you confirm them, keep `## Coverage` current.
> When done, reply with a SHORT summary only.

Lens-specific notes:
- **L2 caching-rendering-routes** — cite T1-05/T1-06/T1-12, T7a-22, O-02, T4b-08 (REFUTED live:
  the Collection's replaceState does NOT refetch; the directory's router-driven search DOES issue an
  RSC GET per debounce step). Build the route map and the revalidation map; the installed Next docs
  are under `node_modules/next/dist/docs/`.
- **L3 dates-ist** — cite O-01 (the only timezone-less date render, and why `valley-day.test.mjs:123`
  misses it), T2a-05/T2a-12, T7a-19, T7b's analytics date table. Build the date-computation table.
- **L4 silent-failures** — you ARE `.claude/agents/silent-failure-hunter.md` over all of `src/lib`,
  every actions file and route, `proxy.ts`, `instrumentation*.ts`, and the production-writing scripts.
  Cite T5-02 (console-only alarms on the auth/mail path; Sentry has no console capture), T2a-04
  (`runAction` console.error), T7a-09, T2b-07, O-05 (dev-queued mail sent by production).
- **L6 input-validation** — build the input inventory and cap-mismatch table; the orchestrator's live
  naughty-strings table is `work/live/blns-live.md` (NUL rejected by Postgres on every text column →
  O-06; bidi overrides stored and rendered raw → V-O-B; phone trunk zero → V-O-C). Extend the NUL and
  bidi classes to every write path statically.
- **L7 client-react** — pattern sweep over all 189 useEffects and 97 listener/timer sites; cite
  T4b/T3/T9/T6 client findings; Base UI's DialogPopup stops Arrow/Home/End propagation
  (`node_modules/@base-ui/react/esm/dialog/popup/DialogPopup.js:91-95`) — know it before claiming a
  global key handler fires under a dialog.
- **L8 platform-limits** — the vendor numbers already fetched are in `work/findings.md` (Vercel Hobby
  Fluid 300 s, 4.5 MB bodies, cron ±59 min, 100 crons; Supabase Nano/Micro 60/200); re-verify any you
  rely on and add R2, Resend, Upstash, Turnstile, PostHog, Sentry with source URLs.
- **L9 test-quality-and-comment-lies** — every comment lie already found is in the reports (T4a-10,
  T2a-11, T5-02, T6-13, T4b-11 ...); your value is the gate-test sweep (what each rule test would miss)
  and the invariants with no test.
- **L10 identity-states-empty-states-chaos** — identity states on every surface, empty states, and the
  chaos experiments; cite O-03/T5-17, T2a-13, T2b-05, T6-05, T7a-23, the live pass.
- **L11 jobs-webhooks-queues** — cite T2a-14 (the tick records nothing), L1's webhook table, T5's
  queue verification, O-05 (production drains dev rows), T7a-19/21, the GitHub scheduler lateness.
- **L12 write-path-invariants** — you ARE `.claude/agents/write-path-reviewer.md` over every action
  and route; build the mutation × invariant matrix; cite T4a-07 (togglePhotoLove skips visibility),
  T4a-09 (deleteOwnPhoto skips IS_DEMO), T2b's loadMemberEdition-before-membership lead.

## Validator template

> You are adversarial validator **<zone>** ... (as launched for V-T1: brief-validator.md, brief-common
> §1–§3, dedup-baseline, validation-zones.md row, the zone's reports, findings.md; verdicts to
> `work/verdicts/<zone>.md`, stub first; SHORT summary on return).
