# Bug audit 1 — closed

- **Run**: 2026-08-20 → 2026-08-21 (the first pre-release bug audit).
- **Fixes**: four sessions, closed 2026-08-21. 45 findings (2 Critical) dispositioned.
- **Artifacts**: deleted from the working tree in the owner's 2026-08-22 cleanup; they
  live in git history. Recover with:
  `git log --follow --diff-filter=D -- "docs/planning/audits/bug-report.md"` (the report)
  and the surrounding commits for its ledger. Its surviving residue is the "Settled, do
  not re-open" section of `docs/planning/bugs.md` and the fixes themselves.
- Bug audit 2 (the sibling folder) superseded this audit's dedup baseline.
