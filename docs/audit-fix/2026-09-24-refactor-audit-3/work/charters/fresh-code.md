# Charter: fresh-code (L05, cross-cutting lens)
Report: `work/agents/fresh-code.md`. See `_header.md`.

**The diff lens.** Territory readers read areas; you read *what changed*. Overlap is deliberate —
where two readers meet by different methods, the orchestrator gets its strongest findings.

## Inputs
`raw/files-added-since-audit2.txt` (499 files; ~245 under `src/`, `scripts/`, `e2e/`, `prisma/`),
`raw/diff-numstat-since-audit2.txt` (1,159 files with +/−; sort by churn), `raw/files-deleted-since-audit2.txt`
(119), and `git log --since=2026-09-04` (347 commits — read the subjects; they name the reason for
each change, which is what you judge the code against).

## What to produce
1. **Every added file under `src/`, `scripts/`, `e2e/`, `prisma/` (~245)**: one line each —
   verdict *clean* or *N findings* — and a finding for each real one. Apply brief-common §5d, §5e
   (the six LLM-bloat signatures) and the React-specific list to each file in full. The lab's
   added files (sketches, fixtures, valley, years) get classification depth only (T15/T16 own them):
   note only what leaks or duplicates shipped code.
2. **The 60 most-changed existing files** (by `+` in the numstat): the same pass, on the changed
   regions (`git diff 72b5a1d HEAD -- <file>`), plus: did the change leave a stale comment, a dead
   branch, a prop nobody passes any more, an import nobody uses (tsc would catch unused imports
   only with `noUnusedLocals` — `raw/tsc-unused.txt` has 2; ESLint's `no-unused-vars` is on?).
3. **The series to read as wholes**, because bloat hides between commits: the loading-screen series
   (2026-09-21: `36bc5ffe` the test, `07a88bab` the refactor, then one commit per area — 35
   `loading.tsx` files: what is shared, what is copied); the comment section (09-16); the
   Catch-ups rework (09-05 → 09-14); the Collection's dates/scrubber/screen-copies (09-13 → 09-23);
   the mascot moments (09-17); the calling card (09-09); the composer redesign (09-13/14); the
   analytics rework (09-15); the admin review room (09-21).
4. **Ghost references**: for each of the 119 deleted files, anything still naming it (L01 also
   does this; you cover `src/` comments and tests, L01 covers docs).
5. **Comments describing code that no longer exists**: for each added/changed file, comments that
   name a function, constant, file or behaviour — check it still exists (`git log -S`).
