# Charter: catchups-lib (T03)
Report: `work/agents/catchups-lib.md`. See `_header.md`.

## Territory (read every file in full)
- `src/lib/catchups-core.ts` (1,402), `catchups.ts` (534), `catchups-types.ts` (335),
  `catchups-notify.ts` (350), `catchups-export.ts` (232), `catchups-edition-view.ts` (255),
  `batch-catchups.ts`, `batch-year.ts`, `batch-line*`, `catchup-caps.ts`, `catchup-lifecycle*`,
  `catchup-picture-pick.ts`, `catchup-pictures.ts`, `catchup-reads.ts`, `catchup-shelf.ts`,
  `vote-question-rule.ts`, `time-capsule-rule*`, `unattended-rule*`, `voice-answer-rule.ts`,
  `group-succession.ts`, `roster.ts`
- `src/lib/magazine/**` (9 files, ~2,692 lines: `index.ts` is a 325-line barrel, `grammar.ts` 696,
  `paginate.ts` 361, `measure.ts`, `types.ts`, `image.ts`, `score.ts`, `from-export.ts`)
- Their `*.test.mjs` as the behavioural spec (T14 audits them as tests).
- `scripts/dev/export-catchups.mjs` and `scripts/dev/print-magazine.mjs` — read, do not run.

## Specs and context
`docs/spec/catchups.md`, `docs/planning/catchups-rework/architecture.md` and `spec.md`. Commit
`35b75868` ("design the magazine as a layout engine, with its corpus, room and printer") and
`90aa745c` (the campaign close). The `*-rule.ts` + `*-rule.test.mjs` pattern is the house shape
for a pure rule with a pinned test — a rule module the app never imports is a finding.

## Leads from the orchestrator
- **The magazine engine**: who imports `src/lib/magazine/*`? If the only callers are the lab room
  (`src/app/lab/catchups/magazine`) and `scripts/dev/print-magazine.mjs`, then ~2,700 lines of
  `src/lib` serve nothing a member reaches — that is a relocate-or-owner-decision finding, not a
  delete. Trace every import. knip lists four unused types in `magazine/index.ts:325` and
  `FontSpec` in `measure.ts`.
- knip: `ExportedMembership`/`ExportedPref`/`ExportedImage` (catchups-export.ts) and
  `CatchupIndexCard` (catchups-types.ts) unused types.
- `catchups-core.ts` at 1,402 lines with a 1,033-line test: what is in it, and is it one module or
  four wearing one file?
- The rule files (`vote-question-rule`, `time-capsule-rule`, `unattended-rule`,
  `voice-answer-rule`, `catchup-lifecycle`): which of these are imported by app code vs only by
  their own tests?
- `group-succession.ts` and `roster.ts`: Groups "is not a feature" (docs commit `c34aae3e`), yet
  Catch-ups live on `Group`/`GroupMember`. Is the group layer earning its keep or is it a leftover
  indirection the Catch-up model could absorb? (Architecture-level; propose, do not recommend.)

## Questions
1. The six signatures per file; single-use helpers; types used once.
2. Duplication between `catchups.ts` / `catchups-core.ts` / `catchups-edition-view.ts` / the actions file (T02) — say which function lives where and whether two do the same thing.
3. The notify path: one canonical email path per audit 1 — still true?
