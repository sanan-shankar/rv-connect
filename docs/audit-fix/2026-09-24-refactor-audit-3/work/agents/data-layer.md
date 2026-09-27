# data-layer - refactor audit 3 report

PARTIAL - agent started 2026-09-24, report is being written as the audit proceeds. Cross-cutting lens L06:
every Prisma call site in `src/`, the per-request query floor of an authenticated page at HEAD, the live
statement/index/table/column statistics in `work/raw/db-*.json` (counters since 2026-05-22), write-only
columns, zero-scan indexes, schema-vs-code drift, and the query patterns across the whole tree. Read-only;
no database command was run; the only file written is this one.

## Coverage
- In progress. Will list: every `prisma.` call site counted, files read fully, files skimmed, uncommitted edits seen.

## Metrics
(not yet - report incomplete)
