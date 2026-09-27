# Charter: prisma-demo-seed (T18)
Report: `work/agents/prisma-demo-seed.md`. See `_header.md`.

**No database access.** The live catalog is on disk: `raw/db-columns-live.json` (every column of
41 tables), `raw/db-tables-live.json` (rows, dead rows, scans, bytes), `raw/db-indexes-live.json`
(128 indexes, scan counts since 2026-05-22), `raw/db-statements-live.json`. Never run
`prisma`, `run-sql.mjs`, or any script.

## Territory (read every file in full)
- `prisma/schema.prisma` (1,750 lines: 681 code / 904 comment — audit 1 ruled the comments are the
  product; look for comments describing columns that no longer exist)
- `prisma/migrations-manual/**` (88 SQL files; 23 added since audit 2), `prisma.config.ts`
- `src/lib/demo-seed/**` (5 files, ~2,479: `content.ts` 957, `people.ts` 630, `seed.ts` 548,
  `places.ts`), `scripts/demo/**` (`apply-schema.mjs`, `seed-demo.mts`, `verify-guard.mts`),
  `scripts/dev/seed-curated-content.ts` (475), `src/lib/demo.ts` (T12 owns; read for the seed's
  contract), `docs/spec/demo.md`.

## Questions this territory must answer
1. **Drift**: diff every model in `schema.prisma` against `db-columns-live.json` — columns in the
   schema but not live, live but not in the schema, type mismatches. Audit 2's D phase wrote five
   SQL files that were **never run** (the fix-prompt board says so): find them in
   `migrations-manual/`, and say from the live columns whether each is still unapplied.
2. **Dead objects**: tables with 0 live rows and what reads them (`PollOption`, `PollVote`,
   `CatchupPromptOption`, `PendingImagePurge`); columns nothing in `src/` reads (grep each column
   name — audit 2 found four write-only columns; L06 co-owns, you own the schema side); the 13
   zero-scan indexes (4 non-unique: `Photo_caption_trgm_idx`, `MetricSnapshot_source_metric_day_idx`,
   `PhotoLove_photoId_idx`, `PollVote_pollOptionId_idx`; 9 unique/pk — a unique index enforces a
   constraint, keep unless the constraint is dead).
3. **Groups**: "Groups is not a feature" (`c34aae3e`) yet `Group` (24 rows, 93,926 seq scans) and
   `GroupMember` (257 rows, 384,062 idx scans) carry Catch-ups. What of the Groups model is still
   load-bearing and what is a leftover (`Group` columns nothing reads?).
4. **Migrations**: files whose effect is undone by a later file; files for columns since dropped;
   whether the folder's idempotency convention holds in every file (a fixer needs to know which
   are safe to re-run).
5. **Seed**: `demo-seed/` 2,479 lines vs `seed-curated-content.ts` 475 — one seed vocabulary or
   two? Content that duplicates `docs/content/`? Does the demo seed still match the schema (every
   field it writes exists live)?
6. `Place` is 101 MB / 234,935 rows (the gazetteer, kept by audit 1) — note only.

## Owner decisions
Any drop (table, column, index) is an owner decision with a `SELECT` a fix session runs first.
Write each in the 5-line format.
