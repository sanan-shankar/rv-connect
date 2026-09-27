# Charter: admin-analytics (T06)
Report: `work/agents/admin-analytics.md`. See `_header.md`.

## Territory (read every file in full)
- `src/components/admin/**` (24 files, ~4,771), `src/components/analytics/**` (4, ~383)
- `src/app/(main)/admin/**` — every section (index, analytics, audit, catchups, content, mail,
  messages, people, reports, review, support), every `loading.tsx` (2026-09-21 series), the four
  `actions.ts`
- `src/lib/`: `admin.ts`, `admin-analytics.ts` (1,265), `admin-content.ts`,
  `admin-content-query.ts`, `admin-people.ts`, `admin-people-query.ts`, `admin-review.ts`,
  `admin-threads.ts`, `admin-threads-server.ts`, `admin-worklist-query.ts`, `admin-note.ts`,
  `last-seen.ts` (351), `audit.ts`, `login-attempt.ts`, `admin-rule*`/`admin-guard-rule*` (tests = spec)
- `src/app/api/presence/route.ts`

## Specs and context
`docs/spec/admin.md` (43 KB, 2026-09-21). Commits: `ec979e4c` (count visits from the browser and
keep each visit's pages), `9a7412a2` (keep dev and the owner's own use out), `f2ba4c90`/`6eabd7d7`
(the review room), `a9277835`/`4c9c4491` (admin loading screens), `f44418c9`. The admin lib
client/server pairs are real seams (audit 1 §5) — not a finding.

## Leads from the orchestrator
- `raw/db-statements-live.json`: `UPDATE "User" SET "lastSeenAt" … WHERE lastSeenAt IS NULL OR
  lastSeenAt < $4` — **33,211 calls, 1,784 rows updated**: the guard is in the WHERE, so 95 % of
  calls are round trips that change nothing. Audit 2's C phase called this fixed. Is the
  client-side/in-memory gate missing, or is it deliberate?
- `Visit` has three `UPDATE` statement shapes and four `INSERT` shapes with different column sets.
  How many code paths write a visit, and why do they differ?
- The admin overview runs one 55 ms statement of nested `SELECT count(*)` subqueries (38 calls).
- `MetricSnapshot_source_metric_day_idx` has zero scans since 2026-05-22 (`raw/db-indexes-live.json`).
- `AdminCountKey` type unused (knip). `admin-analytics.ts` 1,265 lines: one module or several?

## Questions
1. Everything admin-only that is in a shared client bundle (dynamic-import candidates).
2. The 11 admin `loading.tsx` files after the 09-21 refactor: shared skeleton pieces or eleven copies?
3. The six signatures; over-abstraction (registries, config objects with one caller).
