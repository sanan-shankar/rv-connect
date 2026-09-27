# Refactor audit 3 — task plan (2026-09-24)

## >>> RESUME HERE (written at the 2026-09-27 close-out; this section overrides anything below it) <<<

The session that ran 2026-09-24 → 09-27 was ended by the owner for usage. A NEW session resumes from this file.
Read this section, then `work/findings.md` (rulings, merge map, owner-question notes, ORCH-01), then the compile plan
further down. `interim-report.md` (audit folder top level) is the owner-facing summary of what exists so far.

**Done — 14 of 28 reports complete on disk** (each ends with `## Metrics`; each spot-checked by the orchestrator
except where noted): tracked-weight, collection-media, fresh-code, lab-catchups, catchups-ui, catchups-lib,
bundle-build, admin-analytics, auth-onboarding-settings, feed-posts-comments, lab-rest, common-primitives,
directory-profile, landing-mascot-avatars (**structure verified only — spot-check 3 claims first**).
`work/findings-index.json` and `work/compile/findings-table.md` hold their 274 findings (T1 87 · T2 133 · T3 37 ·
T4 17 · owner 35), generated 2026-09-27.

**To run — 14 readings**, each with its charter in `work/charters/<key>.md`:
- stopped mid-work at the pause (their files are STUBS — overwrite; `data-layer.md` has a `## Metrics` heading but is a
  13-line placeholder, so judge completeness by size and content, not the heading): shell-ui-guide (T09),
  letters-messages-support (T11), api-actions-crons (T12), data-layer (L06, Fable), lib-core-config (T13);
- never launched: lib-tests (T14), scripts-e2e-ci (T17), prisma-demo-seed (T18), dead-code (L01), duplication (L02),
  docs (T19), root-instructions-tooling (T20), dependency-diet (L04), runtime-perf (L07).
The old agent ids below cannot be messaged from a new session — relaunch fresh. Waves of <=6; write-early rule.

**Launch prompt shape** (proven, keeps the orchestrator's context small): quote the owner's three paragraphs from
brief-common §1 verbatim + the two "how to think" sentences, name the key and report path, then: read
`work/brief-common.md` in full, `work/charters/_header.md`, `work/charters/_launch.md`, and the charter; follow
`_launch.md`; return its short summary. Model: Opus for territories, Fable for the cross-cutting lenses.

**Before relaunching, account for the moving tree.** The raw tool outputs are from HEAD `70570bcd` (2026-09-24);
the tree has moved since (`git log 70570bcd..HEAD --oneline | wc -l`). If it moved a lot, re-run the cheap tools
(cloc, knip with `raw/knip.repo-plus-lab.json`, jscpd, madge — commands in the Errors table and findings.md) into
`work/raw/` first, and tell agents the new HEAD. Findings already landed are re-verified at compile time anyway.

**Untracked on purpose:** `work/raw/jscpd-json/` (456 KB) duplicates `work/raw/jscpd.txt` and was left out of the 2026-09-27 commit; if it is gone, regenerate it with the jscpd command in findings.md.

**Then** follow "Compile plan (Phase 2/3)" below. At close, `report.md` supersedes `interim-report.md` (delete it in
the closing commit) and the README row changes from "paused" to closed/open.


Audit-only session, run from `docs/audit-fix/prompts/refactor-audit-prompt.md` on Fable.
Artifacts: `docs/audit-fix/2026-09-24-refactor-audit-3/` — `report.md` and `fix-prompt.md` at the
top, everything else under `work/`. No application code, config, schema, tests or docs outside this
folder change in this session (the closing commit also adds this audit's row to
`docs/audit-fix/README.md` and one line to `progress.md` + the month's history file).

Previous: refactor audit 1 (2026-08-25, closed 2026-08-27), refactor audit 2 (2026-09-03, campaign
ran 2026-09-05 → 09-08; phases A B C D G H DONE, E and F PARTIAL; README row still says "not
started" — stale, fix in the closing commit). Both reports' §5 not-findings are binding.

## Resume protocol
A fresh session that hears "continue": read this file top to bottom, then `work/findings.md`.
Agent reports on disk under `work/agents/<key>.md` are DONE — never relaunch one whose report exists
(check the file is complete: it ends with a `## Metrics` section). Verifier verdicts under
`work/verify/` likewise. Raw tool output under `work/raw/` is done unless listed as missing below.

## Coexistence
- A peer session is running **bug audit 3** in this same checkout today
  (`docs/audit-fix/2026-09-24-bug-audit-3/`, untracked). Never touch that folder; never stage it.
- The dev server on :3000 (PID 75607) is not mine. Do not restart or kill it.
- `npm run check` and `npm run visual` must never run at the same time (spurious diffs). I run
  neither `visual` nor Playwright in this audit; the peer may.
- Stage by pathspec only: `git add docs/audit-fix/2026-09-24-refactor-audit-3 docs/audit-fix/README.md progress.md docs/history/progress-2026-09.md`.

## Phases
- [x] Phase 0a: orient — CLAUDE/AGENTS, goal-sloc (+references), code-simplifier, campaign skill,
      audit-2 report §1a/§5/§6/§7 and brief-common read. `npm run check` GREEN at HEAD 70570bcd
      (45.9 s, 130/130 tests, 65 lab routes).
- [x] Phase 0b: tools — cloc, knip ×(bare, prod, repo config, repo+lab), madge (circular, orphans),
      jscpd ×3 cuts (+json), tsc --noUnused*, type-coverage (CRASHES on Node 26, third audit running;
      grep census substitutes), dependency-cruiser (via npx typescript@6), censuses.
- [x] Phase 0c: `next build` ran (raw/build.txt) but under load 15–27 with a cold Turbopack
      filesystem cache: 952.9 s wall (compile 8.3 min, TS 6.8 min, cache write 4.9 min) — NOT a
      usable baseline; **re-run warm when the machine is quiet** (todo). Next's own
      `route-bundle-stats.json` copied to raw/, `raw/route-js.txt` derived. `experimental-analyze
      --output` wrote 68 MB to `.next/diagnostics/analyze` (read in place). Live DB catalog read
      done (raw/db-*.json: 41 tables, 128 indexes, 120 statements, columns).
- [x] Phase 0d: write `work/brief-common.md` (owner's words verbatim + rules + methodology + raw map
      + finding format) and one charter file per agent under `work/charters/<key>.md`.
- [~] Phase 1: fan out in WAVES of 6 — **W1 launched 2026-09-24 01:40** (catchups-ui, catchups-lib, collection-media, lab-catchups on opus; fresh-code, tracked-weight on fable) (Agent tool, run_in_background, each writes
      `work/agents/<key>.md` BEFORE returning). Stop-if-whole-wave-failed guard. Done-list below.
- [ ] Phase 1b: orchestrator's own reads (next.config.ts, prisma.ts, proxy.ts, the cycle, the
      public/ weights, the lab fixtures, CLAUDE.md numbers).
- [ ] Phase 2: compile — spot-verify ≥3 claims per report; extract-findings → findings-index.json;
      dedupe/merge; adversarial cluster verification in waves of 3–4 → `work/verify/`.
- [ ] Phase 2b: completeness critic until two consecutive dry rounds.
- [ ] Phase 3: report.md, fix-prompt.md (campaign board, owner questions/answers, ledger),
      README row (+ fix audit-2's stale row), progress line + history entry; commit by pathspec.

## Decomposition (decided 2026-09-24; one sentence for the report: territories sized so one
## agent can read every file it owns, plus lenses for what falls between them)
Territory readers (read every file they own):
T01 feed-posts-comments · T02 catchups-ui · T03 catchups-lib · T04 collection-media ·
T05 directory-profile · T06 admin-analytics · T07 auth-onboarding-settings · T08 common-primitives ·
T09 shell-ui-guide · T10 landing-mascot-avatars · T11 letters-messages-support ·
T12 api-actions-crons · T13 lib-core-config · T14 lib-tests · T15 lab-catchups · T16 lab-rest ·
T17 scripts-e2e-ci · T18 prisma-demo-seed · T19 docs · T20 root-instructions-tooling
Cross-cutting lenses (whole tree):
L01 dead-code · L02 duplication · L03 bundle-build · L04 dependency-diet · L05 fresh-code ·
L06 data-layer · L07 runtime-perf · L08 tracked-weight

Waves (newest/largest first, so a crash loses the least):
W1: T02 T03 T04 T15 L05 L08 · W2: T01 T05 T06 T08 T16 L03 · W3: T07 T09 T10 T11 T12 L06 ·
W4: T13 T14 T17 T18 L01 L02 · W5: T19 T20 L04 L07

## Done-list (agents whose complete report is on disk — a report is complete when it ends with `## Metrics`)
- tracked-weight (L08) — DONE 02:13, 936 lines, spot-checked (findings.md)
- collection-media (T04) — DONE 02:20, 837 lines, spot-checked
- fresh-code (L05) — DONE 02:27, spot-checked
- lab-catchups (T15) — DONE 02:27, spot-checked
- catchups-ui (T02) — DONE 02:30, 1,433 lines, spot-checked
- catchups-lib (T03) — DONE 02:40, 970 lines, spot-checked. **Wave 1 complete (6/6).**
- bundle-build (L03) — DONE (report 02:54, 888 lines), spot-checked 07:55
- warm build 68.2 s (baseline) + check green (103.9 s, loaded — not a baseline) at 07:52
- **USAGE CUTOFF ~03:00 (session limit, reset 07:00 London)**: feed-posts-comments, directory-profile, admin-analytics,
  common-primitives, lab-rest died mid-read with 9–26-line stubs. Relaunched 07:50 with auth-onboarding-settings (W3) to make six.
  **The owner's interrupt at ~07:51 stopped all six relaunches before they wrote anything** (ListAgents at 08:03 showed
  no in-process subagents). Relaunched again 08:04, same six, same prompts.
- DONE after relaunch (all spot-checked, logged in findings.md): admin-analytics, auth-onboarding-settings,
  feed-posts-comments, lab-rest, common-primitives, directory-profile. **13 of 28 complete.**
- IN FLIGHT (09:10): shell-ui-guide, landing-mascot-avatars, letters-messages-support, api-actions-crons,
  data-layer (fable), lib-core-config.
- STILL TO LAUNCH: lib-tests (T14), scripts-e2e-ci (T17), prisma-demo-seed (T18), dead-code (L01),
  duplication (L02), docs (T19), root-instructions-tooling (T20), dependency-diet (L04), runtime-perf (L07).
  Launch prompts: quote the owner's paragraphs + point at brief-common, _header, _launch, the charter.
- W2 fully launched · W3: T07 T09 T10 T11 T12 L06 · W4: T13 T14 T17 T18 L01 L02 · W5: T19 T20 L04 L07

## Errors encountered
| Error | Attempt | Resolution |
|---|---|---|
| cloc timed out on audit-2's `work/workflow-find.js` | 1 | re-run with `--timeout 0` |
| knip bare config: 197 "unused files" (all `page.lab.tsx`) | 1 | Next plugin does not know `pageExtensions`; re-run with `scripts/qa/knip.jsonc` and a copy that adds `src/app/**/page.lab.tsx` as entry |
| madge: 43 cycles, all in gitignored `src/generated` | 1 | `--exclude '^generated/' --ts-config tsconfig.json` → 1 real cycle |
| dependency-cruiser: repo has TypeScript 7, cruiser needs <7 | 1 | `npx --package=dependency-cruiser --package=typescript@6 depcruise` (npx cache, nothing installed in the tree) |
| depcruise cruised `e2e/.report` (playwright output) | 1 | exclude added to my copy of the config |
| zsh expanded `--include=*.tsx` globs | 1 | quote the pattern |
| type-coverage crashes (ts.SyntaxKind undefined) | 4 | Root cause found, first time in three audits: NOT Node 26. npx resolves the tool's typescript peer to 7.0.2, whose JS API has no SyntaxKind (same crash under Node 22 and with -p typescript@5.9.3). A local install pinned to TS 5.9.3 would work, but the repo's Safety Net refuses the recursive delete of the scratch folder (twice; the command never ran; nothing was created). CLEARED; the grep census raw/type-sludge.txt substitutes. For a later session: npm i --no-save --ignore-scripts type-coverage@2, then npx type-coverage --detail --strict, then npm uninstall --no-save type-coverage (uses the repo's TS 5.9.3). |
| Usage limit (HTTP 429, session limit) killed all six in-flight wave-2 agents at ~03:00 | 1 | wave 1's six reports were complete on disk (the write-early rule held); bundle-build had finished its report at 02:45; five territory stubs relaunched at 07:50 after the 07:00 reset. Cost: ~5 agents' partial reading, nothing on disk lost |

## Context discipline (owner, 2026-09-24 08:06: "manage your context properly you're at 46% now")
- The orchestrator does NOT read report bodies into its own context any more. Per landed report: at most a
  3-claim spot-check with outputs capped (`| head -5`, `cut -c1-160`), logged to findings.md in <=6 lines.
- Everything decided lives in `work/findings.md` (merge map + rulings + owner-question notes) — never only in context.
- Heavy reading is delegated: digest agents write condensed files to `work/compile/`; the orchestrator reads digests.
- Agent completion messages are the only report text the orchestrator takes in whole.

## Compile plan (Phase 2/3) — written 08:06 so a fresh context can run it
1. When all 28 reports have landed: `node work/raw/extract-findings.mjs work` → `work/findings-index.json`.
2. **Digest agents** (Fable, 4 in parallel, each ~7 reports): per finding → one line (id · tier · class · decides ·
   saving · merge key); list cross-report duplicates; flag any finding that contradicts a ruling in findings.md.
   Output `work/compile/digest-<n>.md`.
3. **Adversarial verifiers** (Opus, waves of 4–6, clustered by territory, default toward refuted, re-derive line
   ranges): output `work/verify/<cluster>.md` with a verdict per id (confirmed / corrected / refuted / unverifiable).
4. **Completeness critic** (Fable): coverage map vs every tracked file; every raw tool output explained or cleared;
   loop until two consecutive dry rounds → `work/compile/critic-<n>.md`.
5. **Report**: orchestrator writes §1 (exec summary, baselines from findings.md), §4 (owner questions, merged per
   findings.md notes), §5 (not-findings incl. the rulings), §6 coverage, §7 process; a Fable **writer** agent assembles
   §2 (phases) and §3 (findings by phase) from index + digests + verdicts + rulings; orchestrator reviews §2/§3 by
   sampling, not by reading whole.
6. **fix-prompt.md**: `/campaign` first line; `## Campaign board` (Phase | Status | Rows left | Blocked on);
   empty `## Owner questions` / `## Owner answers`; `## Ledger`; rows-that-travel-together; audit 2's open rows
   absorbed as their own phase. Must pass `scripts/qa/campaign.test.mjs`.
7. Close: README row (+ correct audit 2's stale "not started"), `progress.md` one line + `docs/history/progress-2026-09.md`
   entry, `npm run check` quiet, commit by pathspec (no attribution), leave `work/` committed.


## PAUSED by the owner ("pause all agents. i'll resume later")
Six agents were stopped mid-work. Their reports on disk are partials unless they end with `## Metrics`.
On resume: first try SendMessage to each agent id below (continues with its context intact); if that fails,
relaunch the key fresh with the standard prompt (owner's paragraphs + brief-common + _header + _launch + charter).
| key | agent id |
|---|---|
| shell-ui-guide | a7345003da67e9531 |
| landing-mascot-avatars | a9ce3bfedbd04e7d2 |
| letters-messages-support | aa0578b950962feb9 |
| api-actions-crons | a3dedeafd40413558 |
| data-layer (fable) | ae730a46781e90439 |
| lib-core-config | a1b46581a104a05e6 |
Then launch the nine still queued (list above), verify each landing, and run the compile plan.

State on disk at the pause (09:15): landing-mascot-avatars 900 lines WITH Metrics (it was fixing line numbers — verify it is complete before counting it done); data-layer 13-line stub that already has a Metrics heading (a placeholder, NOT complete — check size, not the heading); shell-ui-guide 30, api-actions-crons 38, lib-core-config 23, letters-messages-support 12 (stubs). Four of the six had said "writing the full report now" when stopped.
