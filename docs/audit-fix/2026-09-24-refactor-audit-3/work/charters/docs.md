# Charter: docs (T19)
Report: `work/agents/docs.md`. See `_header.md`.

## Territory (read every file; for `docs/history/*` and `docs/audit-fix/*/work/**`, skim structure only)
- `docs/**`: `spec/` (15 files, 4,208 lines), `planning/` (44 files, 18,345 lines:
  `catchups-rework/` incl. `handover.md` 0.33 MB, `collection-rework/`, `class-collection/`,
  `valley/`, `other/`, `FEATURES.md`, `bugs.md`, `leads-to-follow.md`, `letterloop-research.md`),
  `history/` (4 files, 14,141 lines; `progress-2026-09.md` 0.56 MB), `audit-fix/` (README + four
  audit folders; audit 2's `work/` 90 files / 4.16 MB is still on disk because its campaign's E
  and F phases are PARTIAL), `content/` (5 files), `TRAPS.md`, `OPERATIONS.md`, `ROADMAP.md`,
  `SECURITY.md`, `README.md`, and any other top-level doc.
- `README.md` (root), `progress.md` (root index, 482 lines).
- **Do not touch or judge** `docs/audit-fix/2026-09-24-bug-audit-3/` (a peer session, live) or
  `docs/audit-fix/2026-09-24-refactor-audit-3/` (this audit).

## Context
`docs/README.md` (the map of the docs), the house rules in `docs/audit-fix/README.md` (a closed
campaign's `work/` goes to git history; citations must be rewritten in the same commit), the
protected list in brief-common §4 (`TRAPS.md`, `hand-run-passes.md`, `lab-voice.md`, `demo.md`,
`bugs.md`, `AI-WRITING-TELLS.md`, `leads-to-follow.md`, `docs/history/*`, SECURITY.md's machinery
section, the WhatsApp curation trio — do not propose cutting these; do check them for staleness).
The owner hand-deleted 30–40k lines of leftover docs once and does not want to again: docs grew
~+38,700 Markdown lines in the three weeks since audit 2.

## Questions this territory must answer
1. **Spec vs code**: for each `docs/spec/*.md`, take at least five concrete claims (a file path, a
   constant, a behaviour) and check them at HEAD. List every stale claim with the line. The specs
   that changed most since audit 2: `catchups.md`, `media.md`, `admin.md`, `mascot.md`, `letters.md`.
2. **Closed campaigns**: which `docs/planning/<campaign>/` folders belong to a campaign whose board
   is DONE (catchups-rework closed 2026-09-14; collection-rework; valley; class-collection)? Per
   the house rule, what should move to history, and what must stay because a spec or CLAUDE.md
   points at it (`grep -rn` the path across the repo, `.claude/` included).
3. **audit-fix**: audit 2's `work/` (90 files, 4.16 MB) — the rule says it goes when the campaign
   closes; E and F are PARTIAL. What is left, and what would closing them take? The README row for
   audit 2 says "not started" — stale.
4. **history**: `progress-2026-09.md` grows ~550 lines/day. Anything to do, or is that the record?
   (The owner reads `progress.md`; is the index still one line per session?)
5. **Duplication across docs**: the same paragraph in two files (spec + planning + CLAUDE.md is the
   usual triangle). Use a shingle check in `node -e` (in memory; write nothing).
6. **Dead links**: every relative link in `docs/**` resolves? (`[id]` route syntax is a known
   false positive.)
7. `docs/content/`: what loads it (T11 checks the code side).
8. Audit 2's PARTIAL rows `docs-17` … `docs-21`: current state, one line each.

## Cross-lens leads (from the tracked-weight report, landed 02:13 — confirm, do not assume)
- `docs/audit-fix/README.md:24`'s rule (a closed campaign's `work/` goes to history) has no trigger;
  audit 2's `work/` (122 files, 3.65 MB) is still here with 3 files / ~25 citations pointing into it.
  The lens suggests a ~20-line `scripts/qa/*.test.mjs` that fails on a `work/` folder under an audit
  the README marks Closed — say whether that is the right shape (one protocol, one test).
- The Catch-ups handover is 343 KB in 56 versions, the largest living document; its exploration
  siblings (`directions/` etc., 0.68 MB) have no living link — the lens's finding 11.
- `CLAUDE.md` is 354 lines / 26.8 KB (+8 KB since audit 1), loaded into every session (~6,500 tokens
  before any work). T20 owns its accuracy; you own its overlap with `docs/`.
