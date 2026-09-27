# Charter: lib-tests (T14)
Report: `work/agents/lib-tests.md`. See `_header.md`.

**You may run tests.** Grant beyond the common rules: `node --test <file>` on single files, and
`time node --test` over the whole set of `*.test.mjs` under `src/` and `scripts/qa/` (they are
pure `node:test` files reading source as text; none touches the database). Run the whole set at
most twice. Do not run `npm run check`.

## Territory (read every file in full)
- Every `*.test.mjs` under `src/` (110 in `src/lib`, 14 in `src/components`, 6 elsewhere) and
  `scripts/qa/*.test.mjs` (5) — 130 files, ~20,670 lines. Plus `src/lib/test-kit.mjs`,
  `test-fn-body.mjs`, and the discovery/runner code in `scripts/qa/check.mjs`.
- `raw/jscpd-tests.txt` (3 clones), `raw/files-added-since-audit2.txt` (the 28 test files born
  since audit 2 — each must carry a dated reason, per the survival rule).

## Context
Audit 2 §5: the suite had no vacuous tests at 102 files; the rule-test pattern (read source as
text, assert a pattern, carry an audit id) is deliberate. A pin is not bloat; a pin whose subject
is gone is. `npm run check` went from 24.8 s to 45.9 s between audits (machine shared; measure).

## Questions this territory must answer
1. **Time**: per-file wall time, sorted; which tests dominate; which re-read the same large files
   (`readFileSync` of `progress-2026-*.md`, `schema.prisma`, whole directories) many times;
   whether the runner could share reads. Give the top 15 with seconds.
2. **Vacuity**: any test that passes without asserting, asserts a tautology, or whose pattern no
   longer matches anything (a pin whose subject moved — check each rule test's target exists at HEAD).
3. **Scratch**: tests that existed to prove one session's fix and would never catch a regression.
4. **Duplication**: fixtures/helpers repeated across files that `test-kit.mjs` should own.
5. **Shape**: test-shaped files the runner would not execute; files the glob picks up that are not tests.
6. For every test born since audit 2: the dated reason, one line each.

## Cross-lens leads (from the tracked-weight report, landed 02:13 — confirm, do not assume)
- `src/lib/magazine/magazine.test.mjs:3` imports `wholeCorpus` from
  `src/app/lab/catchups/_fixtures/magazine/corpus.ts`, which parses 733 KB of JSON plus `pressure.ts`
  on every `npm run check` — the one shipped-lib test that reaches into the lab. Time it.

## Audit 2 row still open in your territory
- **E6, the rest**: `lib-tests-05`'s pre-filter, "which needs a new count guard" (audit 2 fix-prompt ledger, "What
  Phase E left"; the finding is in `docs/audit-fix/2026-09-03-refactor-audit-2/work/agents/lib-tests.md`). State?
