# Bug audit 3 — the brief every VALIDATOR carries (2026-09-24)

You are an adversarial validator in the third pre-release bug audit of rv-connect. A fleet of
finders has produced candidate findings (`work/reports/<agent>.md`, harvested into
`work/candidates.md`). Your job is the opposite of theirs: **try to refute each candidate assigned
to you, with fresh eyes, and confirm only what survives.** Anthropic's production review pipeline,
which this audit follows, puts it in one sentence: *"If you are not certain the issue is real, do
not confirm it."* False positives cost a fix session a day each; a wrong line number costs an hour.
Audit 2's verifiers found no whole finding refuted but **54 % carried a wrong detail** — a line
range off by two, a miscounted call site, a pin named in the wrong test. Expect the same and fix it.

Read first: `work/brief-common.md` §1 (the owner's words), §2 (the codebase), §3 (the rules — they
bind you exactly as they bound the finders: read-only, SELECT-only, no gates, no browser, no
sign-in, scratch only under /tmp), and `work/dedup-baseline.md`. Then your zone's assignment in the
message that pointed you here.

## Method, per candidate

1. **Open the finding in its report** and read it whole (the finder's argument, proof plan, fix,
   gate, known-related).
2. **Re-derive every citation.** Open every `file:line` it names and check the line says what the
   finding says it says. Wrong numbers are corrected in your verdict, not tolerated.
3. **Try to refute it.** Is the behaviour handled somewhere the finder did not look (a caller, a
   wrapper, a middleware, a DB constraint, a test that already pins it)? Is the trigger state
   unreachable (a UI that cannot produce the input; a unique that stops the row; an `IS_DEMO` that
   refuses first)? Is the consequence wrong even if the mechanism is right (TRAPS: "right about the
   mechanism and wrong about the consequence")? Is it already in the dedup baseline (bugs.md, TRAPS,
   audit 2's 203, refactor audit 2's rows) — a duplicate, or a known item that IS actually fixed?
   Is it a duplicate of another candidate in the ledger (say which id is canonical and why)?
4. **Check the severity against the brief's scale** (Critical: data loss/corruption, crash for
   everyone, hard-down at load · High: wrong behaviour a member will hit · Medium: edge case or
   degradation · Low: cosmetic-with-teeth). Severity is about the member and the owner, not the
   code. Upgrade or downgrade with a one-line reason.
5. **Where read-only proof is possible, run it**: `node scripts/dev/run-sql.mjs --inline "SELECT …"`
   (counts, EXPLAIN, `information_schema`, `pg_constraint`), `node --test <one-file>`, `grep`. Never
   a write, never BEGIN/ROLLBACK, never the browser, never the dev server. If the proof needs a
   write, say exactly what the orchestrator should do with the throwaway account.
6. **Look sideways once.** Audit 2's validators surfaced 7 findings the finders missed while
   checking neighbours. If you see one, write it up in the same finding format under
   `## New candidates` with a fresh id `V<zone>-NN`.

## Your verdict file — `work/verdicts/<zone>.md`

Create it FIRST with the header and one stub line per assigned id, then fill in as you go (the
session may die; only disk survives). Per candidate:

```
### <id> — <verdict>
Verdict: CONFIRMED | CONFIRMED-CORRECTED | DOWNGRADED to <sev> | UPGRADED to <sev> | REFUTED | DUPLICATE of <id> | KNOWN (<baseline row>)
Confidence in verdict: certain | likely | possible
Citations re-derived: <every file:line, with corrections>  (or "all correct")
What I tried to refute it with: <the callers, wrappers, constraints, tests, states I checked>
Why it stands / falls: <two to six sentences>
Live check run: <the exact read-only command and its result, or "none possible / not needed">
Corrections to the finding: <severity, title, consequence, fix direction, gate — or "none">
Orchestrator action: <the exact throwaway-account or browser step that would finish the proof, if any>
```

End with `## New candidates` (or "none"), `## Cross-zone notes` (anything that changes another
zone's finding), and `## Coverage` (ids checked completely, ids only partially checked and why).
Your final chat message is a SHORT summary: verdict counts, any REFUTED/DUPLICATE ids with a
one-line reason each, any severity change, any new candidate.
