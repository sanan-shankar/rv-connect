# Charter: catchups-ui (T02)
Report: `work/agents/catchups-ui.md`. See `_header.md`.

## Territory (read every file in full)
- `src/components/catchups/**` (36 files, ~7,585 lines: `edition/`, `home/`, `index/`, `settings/`, `answer/`)
- `src/app/(main)/catchups/**` — every page, loading, layout and **`actions.ts` (1,619 lines, the
  largest actions file in the repo)**; `src/app/catchups/**` (a top-level route group — find out what
  it is and why it is outside `(main)`)
- `src/app/(main)/admin/catchups/**` is T06's; read it only to see what the admin side duplicates.
- `src/components/catchups/edition/entry-comment-actions.ts` (T01 compares it with the feed's).

## Specs and context
`docs/spec/catchups.md` (rewritten 2026-09-14 "to describe what shipped"), then
`docs/planning/catchups-rework/architecture.md`, `spec.md`, `handover.md` (its status board and
ledger), `review-2026-09-06.md`. The whole surface shipped between 2026-09-05 and 09-22 and has
never been audited. Key commits: `b94677ce` (the home becomes a place), `5eccd80d` (the reader is
the front runner), `5e688bb4` (the list becomes a shelf), `02f9302f` (every Catch-up carries a
photograph), `552dc442`/`86fb1f07` (batch Catch-ups), `76aac5ac` (time capsule), `6e663ba5`/
`a8f4ea6f` (vote and voice), `cb001228` (comments on entries), `9d583974` (a heart stops
rebuilding the whole Edition), `35b75868` (the magazine).

## Leads from the orchestrator
- knip (`raw/knip-repo-plus-lab.txt`): `setCatchupPicture` (actions.ts:797) and
  `setEditionTimeCapsule` (actions.ts:1636) are exported and never imported;
  `src/components/catchups/answer/answer-redirect.tsx` and `home/picture-picker-dialog.tsx` are
  unused files. Confirm with `git log -S` — dead, or in-progress?
- `CatchupPromptOption` has 0 live rows; vote/voice/capsule shipped 09-14. Are all three reachable
  from the UI, or is one plumbed but not exposed?
- `raw/db-statements-live.json`: `CatchupEntry` SELECTs return ~130 rows per call (2,314 and
  2,949 calls); `CatchupEdition` SELECT 32,576 calls; `Group`/`GroupMember`/`CatchupSeries` are among
  the most seq-scanned tables. Which pages issue these, and how many per render? (L06 has the
  query lens; you have the pages — say which page does what.)
- Audit 2 parked `catchups-02`, `catchups-07/08/09` because the rework was in flight. Report
  their current state (`docs/audit-fix/2026-09-03-refactor-audit-2/work/agents/catchups.md`).
- 1,619 lines of actions: how many distinct actions, how much shared validation, how many would a
  fixer split out without changing behaviour?

## Questions
1. Every `"use client"` boundary; every dialog/sheet that could be `next/dynamic`.
2. Components that reimplement a shared primitive (bottom sheet, LoveButton, ImageViewer, BirdAvatar).
3. Lab-born code (`src/app/lab/catchups/**`) that shipped: is the shipped copy the same as the lab
   copy (a clone), or did it diverge (then the lab room is history and a register entry)?
4. The six signatures, per file; the React-specific list, per client file.
