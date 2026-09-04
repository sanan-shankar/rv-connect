# Refactor audit 2 — task plan

Started 2026-09-03 ~16:45 IST at HEAD 72b5a1d (tree clean, 1,252 tracked files). Audit-only:
no application code, config, schema or test changes. Everything this session writes lives under
`docs/audit-fix/2026-09-03-refactor-audit-2/` — `report.md` + `fix-prompt.md` at the top, the
working mess under `work/` (this plan, `findings.md`, `raw/` tool output, `agents/` reports,
`verify/` verdicts). One `progress.md` entry and one row in `docs/audit-fix/README.md` at close.

Spec: `docs/audit-fix/prompts/refactor-audit-prompt.md` (read it first on resume). Standing rules
from its last section apply: crash-safe (agents write their own report to disk before returning;
waves of ~6 with a dead-wave stop and a done-list), usage discipline, artefacts under the dated
folder, scratch dies before the closing commit.

Predecessor: `docs/audit-fix/2026-08-25-refactor-audit-1/` (closed 2026-08-27, ten fix sessions).
Its §5 not-findings and its fix-prompt's fix-time refutations are binding: do NOT re-propose them
without new evidence. Its close-out verdict: project clone counts, dependency counts, byte weight,
bundle bytes and database objects — NOT SLOC (dedupe is line-neutral here because every constant
is argued for in a comment).

## STATE AT 2026-09-04 20:15 — AUDIT CLOSED
`report.md` and `fix-prompt.md` are final. 22 reports, 369 findings. **Verification complete: 28
clusters, 381 verdicts, 348 of 369 findings covered, 6 refuted sub-claims, 200 corrections.** Five
completeness rounds, last two dry. `npm run check` green. ORCH-04 shipped as `74cc61a`.

**One thing left for the owner, because this session's safety net blocked it (correctly):**
`.scratch/audit2-build-nolab` is a 2.5 GB throwaway git worktree from this audit's lab-free build.
`git worktree remove` refuses it because it still holds my own uncommitted deletions, and the two
commands that would clear those are both blocked for an agent. Run by hand:

    git worktree remove --force .scratch/audit2-build-nolab
    git worktree prune

and delete `.scratch/lab-aside` (4 MB) with it. `.scratch/audit2-build` (2.1 GB) was removed
cleanly. `.scratch/` is gitignored, so none of this affects the repository.

## RESUME PROTOCOL (read this first if you are a new session)
1. Read this file, then `findings.md` in this folder.
2. `ls agents/` — every `*.md` there is a finished agent report. `ls raw/` — finished tool
   outputs. Do not rerun what exists.
3. The phase table below says where we are. Continue from the first unchecked item.
4. Workflow runs cannot be resumed across sessions; re-launch the workflow passing the list of
   already-written report files in `args.done` so the script skips them.
5. Another session shares this tree (a `next dev` on :3000, PIDs 3784/3785 at start, is NOT ours;
   two other Claude sessions were alive at start). Never stash/reset/clean; never kill it. Never
   run two builds or two headless Chromes at once; never run `npm run check` and `npm run visual`
   concurrently.

## Phases
- [x] 0a. Orient (check green 24.8 s, 102 tests; done 16:42): CLAUDE.md, AGENTS.md, goal-sloc (+references), code-simplifier, front-refactor,
      front-review read. Predecessor report + fix-prompt close-out read. `npm run check` green?
- [x] 0b. Static toolkit DONE 16:55 (see findings.md table) → raw/: cloc, knip (configured + production), madge circular/orphans,
      jscpd, tsc --noUnused*, depcruise, type-coverage (or grep substitute), use-client census,
      env-flag census, comment density, TODOs.
- [x] 0c. Baseline build DONE 16:47: worktree `.scratch/audit2-build` (KEEP until close-out; at close-out remove BOTH scratch worktrees, .scratch/audit2-build and .scratch/audit2-build-nolab (the lab-free pricing build, 17:15), with git worktree remove, then git worktree prune), 42.3 s in a throwaway worktree under `.scratch/` (never the shared `.next`);
      route-bundle-stats.json → per-route first-load JS. Build wall time + phase timings.
- [x] 0d. Baseline metrics table written to findings.md 16:58 table in findings.md.
- [~] 1.  Fan-out: run 1 delivered 6/22 (wave 1); RUN 2 LAUNCHED 23:04 for the remaining 16 (done-list skips the six on disk). Originally LAUNCHED 17:10: 22 agents (16 territories + 6 lenses), waves of 6, script at `work/workflow-find.js`.
      Keys: collection, media-viewer, fresh-code, dead-code, duplication, bundle-build | feed-posts, catchups,
      directory-profile, admin-analytics, member-surfaces, auth-edge | shell-primitives, landing-mascot-avatars,
      lib-core-config, lib-tests, data-layer, dependency-diet | lab, scripts-e2e-ci, root-assets, docs.
      Run wf_e7082c2b-ad0 launched 17:10 (transcripts under ~/.claude/projects/-Users-sanan-Documents-rv-connect/2660608e-bfe7-4e3d-a6d6-3a5c40d7ee22/subagents/workflows/wf_e7082c2b-ad0). RELAUNCH after a crash: Workflow({scriptPath: work/workflow-find.js, args: {done: [<keys whose agents/<key>.md
      exists and ends with a Metrics section>]}}).
- [~] 2a. Orchestrator compilation IN PROGRESS (2026-09-04 15:15): 20/22 reports ON DISK, 17 read + spot-verified (334 indexed). ORCH-04 escalated to the owner by push notification: a LIVE BUG (snapshot.yml prunes notifications at 30 days against a published 1-year privacy policy). RUN 4 (Opus) still writing root-assets + docs (notes in findings.md 'Compilation notes'); index built by raw/extract-findings.mjs → findings-index.json (re-run after each report).
- [ ] 2b. Adversarial verification: script staged at `work/workflow-verify.js`; launch with Workflow({scriptPath, args: {clusters: [...], total: N, done: []}}) once 2a is complete.
- [ ] 2c. Completeness critic rounds until two consecutive rounds are dry.
- [ ] 3a. Report + fix-prompt written.
- [ ] 3b. progress.md entry, README row, commit by name, scratch deleted, tree clean of ours.

## Decisions
| When | Decision | Why |
|---|---|---|
| 16:45 | Folder `docs/audit-fix/2026-09-03-refactor-audit-2/` | Second run of the prompt; README convention |
| 16:45 | SLOC via `npx cloc --vcs=git` (same tool as audit 1, so the delta is like-for-like) | scc is not on npm |
| 16:45 | Tools via `npx --yes`, no devDependency installs | package.json/lock are shared with live sessions |
| 16:45 | Baseline production build in a `.scratch/` worktree with hard-linked node_modules | Audit 1 session 10's method; the shared `.next` belongs to the running dev server |

## Errors encountered
| Error | Attempt | Resolution |
|---|---|---|
| Run wf_e7082c2b-ad0: wave 1 (6 agents, 5.3M subagent tokens, 49 min) delivered all six reports; wave 2's six agents all failed instantly on the session usage limit (reset 21:20 IST); the dead-wave guard stopped the run at 17:53. Nothing lost: wave 1 was fully compiled before the cutoff. | Waves of 6 with a done-list, as the standing rules require | Relaunched 23:04 as run 2 with `args.done` = the six finished keys; 16 agents remain in waves of 6 |
| Run 2 (wf_7671c7fc-e33): wave 2 delivered all six; wave 3's six agents hit the session limit (reset 04:00 IST) at ~00:35 — but lib-tests and data-layer had already written complete reports (wrote-then-died), so only four were lost. | Waves of 6, reports written early | Relaunched 2026-09-04 12:48 as run 3 with `args.done` = 14 keys; 8 agents remain (shell-primitives, landing-mascot-avatars, lib-core-config, dependency-diet, lab, scripts-e2e-ci, root-assets, docs) in waves of 6 + 2 |
