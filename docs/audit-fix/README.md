# Audits and their fix campaigns

One dated folder per audit. What the owner needs — the report and the fix prompt or fix
ledger — sits at each folder's top level; the working evidence (plans, raw tool output,
agent reports, verification verdicts) is tucked under `work/`. `prompts/` holds the
reusable audit prompts (run audits on Fable ultracode; run fixes on Opus max by @-ing the
audit's `fix-prompt.md`, which every fix session updates in place as the living handover).

| Audit | Run | Fixes | Status |
|---|---|---|---|
| [Bug audit 1](2026-08-21-bug-audit-1/) | 2026-08-20 → 21 | 2026-08-21, four sessions | **Closed.** 45 findings dispositioned. Artifacts live in git history (see the folder's README). |
| [Bug audit 2](2026-08-22-bug-audit-2/) | 2026-08-22 | 2026-08-22 → 25, five sessions | **Closed.** All 203 findings dispositioned (`fix-ledger.md`); owner-decision leftovers carried into `docs/planning/bugs.md`. |
| [Refactor audit 1](2026-08-25-refactor-audit-1/) | 2026-08-25 | not started | **Report final** (241 findings, six-phase plan). Start a fix session by @-ing [`fix-prompt.md`](2026-08-25-refactor-audit-1/fix-prompt.md). |

House rules: an audit's artefacts move here in the commit that closes the audit; a fix
campaign edits its audit's `fix-prompt.md` (never a new file) so the next session's entire
handover is that one @; when a campaign closes, its fix prompt's final state is the record.
