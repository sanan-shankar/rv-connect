# Pre-release simplification audit — task plan

Started 2026-08-25 ~14:30 IST. Audit-only: no application code, config, schema or test
changes. Everything this session writes lives under `docs/audit-fix/2026-08-25-refactor-audit-1/work/`
plus the final `docs/audit-fix/2026-08-25-refactor-audit-1/report.md` and one `progress.md` entry.

Spec: `docs/audit-fix/prompts/refactor-audit-prompt.md` (read it first on resume).
Owner's extra instructions this session (2026-08-25, verbatim intent):
- The session may die abruptly (usage limit or otherwise). Progress must survive: every
  agent report is written to disk by the agent itself, this plan tracks what is done, and
  a fresh session saying "continue" picks up from here without redoing anything.
- Usage: quality is the priority, never be stingy, but do not burn usage where a slower or
  cheaper route gives the same thoroughness. No preventable retries, no re-derivation.
- Repo bloat is in scope, not just code: leftover scratch scripts, stale docs, screenshot
  piles, the root directory. He just deleted 30-40k lines of leftovers by hand and does not
  want that to recur. He wants STRICTER RULES about which test scripts / files survive a
  session, and a "close it out" convention rather than auto-deleting everything (so a
  session can still be continued). Propose the mechanism in the report.
- The report will be executed across several later sessions (4-10). Cover everything;
  do not pad the to-do list, do not trim it either.

## RESUME PROTOCOL (read this first if you are a new session)
1. Read this file, then `findings.md` in this folder.
2. `ls agents/` — every `*.md` there is a finished agent report. `ls raw/` — finished tool
   outputs. Do not rerun what exists.
3. The phase table below says where we are. Continue from the first unchecked item.
4. Workflow runs cannot be resumed across sessions; re-launch the workflow passing the
   list of already-written report files in `args.done` so the script skips them.
5. Another session shares this tree (a `next dev` on :3000, PID 5900 at start, is NOT
   ours; HEAD moved 3 commits during orientation). Never stash/reset/clean; never kill it.

## Phases
- [x] 0a. Orient: CLAUDE.md, AGENTS.md, goal-sloc (+references), code-simplifier read.
      Repo mapped (see findings.md "Orientation"). `npm run check` green: 26.0s, 75/75
      tests, TS/ESLint/protocol/lab all ok. Tree clean at start (1041 tracked files).
- [x] 0b. Static toolkit → raw/ (cloc, knip x2, madge x2, jscpd x2, tsc-unused, depcruise x2, greps). type-coverage cannot run on Node 26; grep substitute.
      jscpd, tsc --noUnusedLocals/Parameters, type-coverage, depcruise.
- [x] 0c. Baseline build 45.6s cold / 23.9s warm → raw/build.txt. `npm run analyze` is inert on Turbopack (finding); per-route JS derived from manifests instead.
      running) → `raw/build.txt`. Then `npm run analyze` → `raw/analyze/*.html` + notes.
- [x] 0d. Baseline metrics table written to findings.md.
- [x] 1.  Fan-out (Workflow) COMPLETE 20:10: 18/18 reports in agents/ (runs 2+3). run wf_1d00968a-bf6 (14:50) DIED on usage limit; run wf_41f9fc27-574 (19:07) delivered wave 1 = 6 reports (3 returned, 3 wrote-then-died);
      12 remaining RELAUNCHED 19:32 as run wf_bf3457d9-a07 (waves of 6, early-stop on dead wave)
      (13 territories + 5 lenses; keys in findings.md "Decomposition"). Script copied to
      `workflow-find.js` in this folder. Each agent writes `agents/<key>.md` itself.
      RELAUNCH after a crash: Workflow({script: <contents of workflow-find.js>, args: {done:
      [<keys whose agents/<key>.md exists and ends with a Metrics section>]}}).
- [x] 2a. Orchestrator compilation DONE ~21:10: ALL 18 reports read in full; ~30 spot checks
      (1 refutation: catchups-16); conflicts+merges recorded in findings.md; index = 241 findings. read every agent report, spot-verify, dedupe, merge
      into `findings.md` with S-ids and "verified-by-orchestrator" marks.
- [x] 2b. Adversarial verification DONE ~22:00 (run wf_22596b93-7ae): 10/10 clusters, 161
      verdicts = 120 confirmed / 40 corrected / 1 refuted (catchups-16, already caught).
      Corrections folded into report §3. Full evidence in verify/*.md.
- [~] 2c. Critic round 1 DONE ~22:20: found the For-other-lenses drop channel (6 restored
      items + 2 bug leads), G2-G8 minor; report patched. Round 2 NOT DRY ~22:40:
      index-vs-report diff found ~15 unlisted executable findings + 2 missing owner
      decisions + Visit write-only columns; ALL repaired into the report ~22:50.
      Round 3 DRY ~23:00 (verify/critic-3.md): repair verified 100%, independent 241-id diff clean, spot-audits faithful. AUDIT CLOSED.
- [x] 3a. Report FINAL: all corrections + both critic repairs folded; critic-3 verified.
- [x] 3b. progress.md entry appended; everything committed by name (see git log); draft scratch deleted; tree clean of ours.

## Decomposition (final list lives in findings.md "Decomposition")
Territory agents by directory (every file in src/, scripts/, e2e/, prisma/, config and
docs belongs to exactly one) plus cross-cutting lens agents (bundle/build, dependency
diet, duplication, dead code, data layer, test-suite quality). Rationale: territory
readers apply the per-file checklists with full local context; lenses hold the
cross-file questions that fall between territories.

## Crash-safety design
- Agents write their own report file before returning (`agents/<key>.md`).
- Workflow script receives `args.done` (list of keys) and skips those.
- This plan and findings.md are updated after every phase and after every batch of
  verified findings (not at the end).
- Raw tool output is on disk under raw/ and never re-run once present.

## Decisions
| When | Decision | Why |
|---|---|---|
| 14:30 | Working files under `docs/audit-fix/2026-08-25-refactor-audit-1/work/`, report at `docs/audit-fix/2026-08-25-refactor-audit-1/report.md` | The prompt names the report path; `audits/task_plan.md` already belongs to the bug audit and must not be clobbered |
| 14:30 | SLOC measured with `npx cloc` (code lines, comments and blanks reported separately) | `scc` on npm is an unrelated package; cloc is the same convention (non-blank, non-comment) |
| 14:30 | Tools run via `npx --yes <pkg>`, no devDependency installs | package.json / lock are shared with another live session; npx leaves the tree untouched |
| 14:30 | Finder agents inherit the session model | Same as the bug audit's finder fan-out; false positives cost more verification than a cheaper tier saves |

## Errors encountered
| Error | Attempt | Resolution |
|---|---|---|
| All 18 finder agents died on the session usage limit (reset 6pm IST); ~1.8M subagent tokens, 0 reports written (run wf_1d00968a-bf6, 14:50) | Single parallel(18) fan-out | THE avoidable waste of this session; owner rightly angry. Waves of 6 from then on; lesson saved to memory |
| Usage window died again 19:20 (resets 12am) mid run wf_41f9fc27-574 | Waves of 6 | Contained: all 6 wave-1 reports survived on disk (3 returned, 3 wrote-then-died); the 12 later agents failed fast. Added early-stop on a fully-failed wave. Run 3 (wf_bf3457d9-a07, 19:32) covers the remaining 12 with done-skip |
