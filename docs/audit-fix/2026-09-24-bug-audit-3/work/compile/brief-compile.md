# Compile brief — bug audit 3 final report, the High and Medium entries

You turn validated findings into the entries a FIX session will execute from. The fix session reads only
your entry and the code; make the entry enough to act on without re-analysis, without dictating the code.

Inputs per row (listed in `compile/hm-rows.md`): the finding in its report (`work/reports/<agent>.md`,
`### <id> — …` block), its verdict (`work/verdicts/<zone>.md`, the `### <id>` block — the verdict's
corrections WIN over the report: line numbers, severity, fix direction, consequence), the V-DRIFT row
if the id is T1-/T5-/T8- (`work/verdicts/V-DRIFT.md`), and `work/task_plan.md`'s 2026-10-23 Done-list
lines (orchestrator rulings). The final severity is the one in hm-rows.md. Line numbers must be HEAD's:
where the verdict gives "at HEAD" lines use them; where it does not and the file changed since
`495ecdd2` (`git diff --stat 495ecdd2..HEAD -- <file>`), open the file and correct the lines yourself.

Entry format (keep each entry to 6-12 lines; no padding, no restating the title):

```
#### <id> — <title, rewritten plainly in under 20 words, what goes wrong for whom>
**<Severity>** · **Confirmed** (<evidence tag: live | data | executed | source>) — or **Suspected** (<the proof that would settle it>)
- **Where:** `path:line-line` (HEAD lines), up to four citations, the decisive one first.
- **What happens:** expected vs actual in one or two sentences, member-facing where possible.
- **Fix direction:** what must become true, and any trap the verdict found (e.g. "a deleteMany does not close it under READ COMMITTED; lock the Edition row").
- **Pin it:** the gate or test that should fail before the fix and pass after (name the existing test file if one fits).
- **Travels with:** other ids that must be fixed in the same change (same lines, same root cause), or "—".
- **Owner question:** Qn if the fix waits on an owner answer, else omit the line.
```

Status rule (the audit's vocabulary): **Confirmed** = reproduced or observed (live browser, live rows,
executed the real code, EXPLAIN) OR a deterministic path that an adversarial validator AND the
orchestrator each re-derived from source with nothing environmental in the way. **Suspected** = the
mechanism is argued from code but depends on timing, vendor behaviour or load not safely provable.

Rules: read-only except your own output file. No gates, no browser, never write to git (read-only
log/show/diff is fine), no database writes. Do not name individual members in your entries (the repo
is public); say "a member", "seven members". Write your output file FIRST with the phase headings,
then fill entries in phase order as you go; the session may die and only the file survives. End the
file with `## Coverage` listing every id written and any you could not settle, then "STATUS: COMPLETE".
