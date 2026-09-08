# Audits and their fix campaigns

One dated folder per audit. What the owner needs — the report and the fix prompt or fix
ledger — sits at each folder's top level; the working evidence (plans, raw tool output,
agent reports, verification verdicts) is tucked under `work/` **while the campaign is
running**, and goes to git history when it closes (see the house rules below). `prompts/`
holds the reusable audit prompts (run audits on Fable ultracode; run fixes on Opus max by
@-ing the audit's `fix-prompt.md` **and invoking `/campaign`**, which every fix session
updates in place as the living handover).

| Audit | Run | Fixes | Status |
|---|---|---|---|
| [Bug audit 1](2026-08-21-bug-audit-1/) | 2026-08-20 → 21 | 2026-08-21, four sessions | **Closed.** 45 findings dispositioned. Artifacts live in git history (see the folder's README). |
| [Bug audit 2](2026-08-22-bug-audit-2/) | 2026-08-22 | 2026-08-22 → 25, five sessions | **Closed.** All 203 findings dispositioned (`fix-ledger.md`); owner-decision leftovers carried into `docs/planning/bugs.md`. |
| [Refactor audit 1](2026-08-25-refactor-audit-1/) | 2026-08-25 | 2026-08-26 → 27, ten sessions | **Closed.** All six phases executed; every plan row done, consciously refused with a reason, or owner-declined. Measured at close-out (report §1b): −8.00 MB tracked, −10 dependencies, 4 tables / 9 columns / 3 indexes dropped from production and demo, duplication 2.04 % → 1.47 %, real import cycles 5 → 0, first-load JS −344 KB on /feed and −323 KB at the median member route. The one projection that missed is the one the audit led with: code lines, −1,067 against an expected −4,500 to −5,500. The record is [`fix-prompt.md`](2026-08-25-refactor-audit-1/fix-prompt.md)'s final state; its `work/` folder was archived to git history on 2026-09-08. |
| [Refactor audit 2](2026-09-03-refactor-audit-2/) | 2026-09-03 → 09-04 | not started | **Audit closed, fixes open.** 369 findings across 22 territory and lens reports (T1 169 · T2 146 · T3 40 · T4 13); 46 put a question to the owner. Verification: 28 adversarial verifiers re-tested **348 of the 369 findings** — **no whole finding refuted**, 6 sub-claims fell, and **54 % carried a wrong detail** — so the standing instruction is *trust the finding, re-check the line numbers*. Headline levers: −73 KB CSS on every route (the lab's share of the shared stylesheet, measured three ways), −74 MB of `node_modules` and −21.7 % of the lockfile (`shadcn`, `world-atlas`), ~−150 KB of first-load JS on every public page (a tooltip the sign-in pages never draw), and an authenticated page's query floor from 7 to 4–5. One live bug was found and fixed mid-audit with the owner's answer (`74cc61a`): notifications were being deleted at 30 days while the privacy policy promised a year. Start a fix session by @-ing [`fix-prompt.md`](2026-09-03-refactor-audit-2/fix-prompt.md) and invoking `/campaign`. |

House rules: an audit's artefacts move here in the commit that closes the audit; a fix
campaign edits its audit's `fix-prompt.md` (never a new file) so the next session's entire
handover is that one @; that fix-prompt carries a `## Campaign board`, `## Owner questions`
and `## Owner answers` so `/campaign` can resume it without a human; when a campaign
closes, its fix prompt's final state is the record.

**And when it closes, its `work/` folder goes.** The owner made this the rule on
2026-09-08 (refactor audit 2, question 21): a closed audit keeps `report.md` and
`fix-prompt.md`, and git keeps the working notes. Refactor audit 1's 72 files and 1.9 MB
went that way; bug audit 1 went the same way in August. The commit that removes a `work/`
folder must in the same breath tell the surviving files that their `work/…` citations are
now history — a path that no longer resolves is worse than the folder was. Recover any of
it with `git log --diff-filter=D -- "docs/audit-fix/<folder>/work/*"` and then
`git show <sha>^:<path>`.
