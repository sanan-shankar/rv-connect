# Charter: duplication (L02, cross-cutting lens)
Report: `work/agents/duplication.md`. See `_header.md`.

## Inputs
`raw/jscpd.txt` and `raw/jscpd-json/jscpd-report.json` (325 clones · 4,812 lines · 2.44 % over
src+scripts with tests excluded; audit 2: 232 · 1.82 %; audit 1 closed at 174 · 1.47 % — the
trend is up), `raw/jscpd-tests.txt` (3), `raw/jscpd-e2e.txt` (5). Audit 2's classification of
its 232 is in `docs/audit-fix/2026-09-03-refactor-audit-2/work/agents/duplication.md` — reuse its
categories, do not redo its verdicts on pairs that have not changed.

## What to produce
1. **Every clone pair classified**: (a) lab↔shipped design history — register only; (b) lab↔lab —
   register; (c) shipped↔shipped genuine — a finding; (d) hand-run-pass protocol
   (`hand-run-passes.test.mjs` says what must match) — not-finding; (e) the 22 action preambles —
   the C-189 contract, not-finding; (f) test fixtures; (g) generated/vendored. Counts per class.
2. **Drift**: for every (c) pair, diff the two copies — identical, or diverged? A diverged copy is
   the dangerous kind (one got a fix the other did not). Name the divergence.
3. **Beyond jscpd** — structural near-duplicates it cannot see, by reading: the two comment action
   files (feed vs Catch-up entries); the 35 `loading.tsx` skeletons after the 2026-09-21 refactor
   ("skeletons share their controls' boxes") — is skeleton code still repeated per page?; the
   `*-rule.ts` files' shared shape; the four `INSERT INTO Visit` and three `UPDATE Visit` statement
   shapes (how many code paths write a visit); the sheets/dialogs after the shared bottom sheet;
   the lab kit vs the shipped primitives; the admin section pages (list + filters + table ×N);
   `catchups-core.ts` vs `catchups.ts` vs `catchups/actions.ts`; email templates.
4. **The honest saving** per programme: clones removed and files removed, and lines only where a
   copy is deleted outright. Audit 1's lesson stands: a shared helper in this house costs a
   docblock and N imports. Say when the dedupe is worth it for correctness (drift) even at zero
   lines, and when it is not worth the coupling.
5. Top 30 programmes, biggest first, each with the dedupe shape a fixer would implement.
