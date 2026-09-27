## 2026-09-27 (audit) — refactor audit 3 paused at fourteen of twenty-eight readings, compiled for a later session

Refactor audit 3 ran from `docs/audit-fix/prompts/refactor-audit-prompt.md`, starting 2026-09-24. The owner paused
it on 2026-09-27 for usage. It is audit-only: no application code changed.

**Done.**
- Baseline measured into `docs/audit-fix/2026-09-24-refactor-audit-3/work/raw/`: cloc, knip in four variants, madge,
  jscpd in three cuts, `tsc --noUnused*`, dependency-cruiser, grep censuses, read-only live-database catalog
  statistics, a cold build and a warm quiet build (68.2 s, against 42.3 s at audit 2), `next experimental-analyze`,
  and `npm run check` (green).
- Twenty-eight charters were written; 14 agent reports are complete, holding 274 findings.
- Every complete report was spot-checked. Conflicting reports were ruled on in `work/findings.md`:
  - the picture chooser is a regression to restore;
  - the magazine engine stays in `src/lib`;
  - the "almost ready" guard stays;
  - the song code goes before its columns;
  - the covers are re-exported at 2,560 px.
- `interim-report.md` compiles everything so far for the owner.

**Two usage limits and one interrupt killed agents mid-read.** The write-early rule meant nothing on disk was lost.

**Found at close-out (ORCH-01).** `9ef7d821` overwrote `docs/history/progress-2026-09.md` (−8,363 lines), and each
later commit replaced the previous entry. The file is recoverable from git. It was reported to the owner and not
fixed here. This entry is added to the file as it now stands.

**Resume:** @ `docs/audit-fix/2026-09-24-refactor-audit-3/work/task_plan.md` and say continue. Its top section lists
the 14 readings left and the compile steps.

## 2026-09-27 (audit) — the third bug audit is paused with its findings compiled

The third pre-release bug and stability audit (`docs/audit-fix/2026-09-24-bug-audit-3/`) ran from
2026-09-24 and was paused by the owner on 2026-09-27 to save usage, after two session-limit stops.
All 13 territory finders and 10 of 12 lenses finished; 3 of 15 validation zones finished and 4 are
part-done. 340 findings are recorded, 96 attacked by a validator, 4 refuted. The orchestrator proved
the worst personally: a crafted router-state header renders `/lab` pages below their only admin check
(229 members' records returned); the nightly media backup has failed since 2026-08-29 on every
original over 8 MB (GitHub logs); Sentry receives the session cookie and location (offline repro);
the app's `pg` connection is plaintext (live socket check); a repeated `token=` 500s the reset and
confirm pages. `bug-report-3.md` is an interim compilation; `work/task_plan.md` holds the resume
steps, including re-baselining on the seven commits that landed during the pause. Audit-only: no
application code changed. The throwaway account was deleted on 2026-09-25 at the owner's request.




## 2026-09-27 (ui) — the decade presets and the post's audience chips lose the tan fill

Owner: "if you click on batch and then all of these decades [...] also use that shit brown color. Hate
that color." The Batch filter's decade presets and the composer's "Show to" chips were `--secondary`
and `--muted` on a white menu. Both are outlines at rest now, the facet pills' own treatment, with
canopy only when chosen; the chips carry a border in both states so choosing one does not resize it.
Measured: decade chips transparent with a #DFD8CB border. The rest of the tan (content wells, the
admin chips and toggles, the Support buttons, segmented-control tracks) is left for his call. check green.
