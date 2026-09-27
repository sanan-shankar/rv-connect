# Charter: data-layer (L06, cross-cutting lens)
Report: `work/agents/data-layer.md`. See `_header.md`.

**No database access.** Everything live is on disk: `raw/db-statements-live.json` (top 120
statements by total time from `pg_stat_statements`, counters since `raw/db-stats-reset.json` =
2026-05-22), `raw/db-tables-live.json`, `raw/db-indexes-live.json`, `raw/db-columns-live.json`.
Write the `SELECT` a fix session should run first for anything that needs a live re-check.

## Territory
Every `prisma.` call site in `src/` (count them; `grep -rn "prisma\." src --include=*.ts
--include=*.tsx | grep -v generated`), `src/lib/prisma.ts`, every `$queryRaw`/`$executeRaw`,
the request-time chain (`src/proxy.ts` → `(main)/layout.tsx` → `auth()` → `last-seen.ts` →
the page), and the crons.

## What to produce
1. **The query floor per authenticated page**: what runs before the page's own queries, at HEAD
   (audit 2 measured 7 and its C phase promised 4–5). List each statement, the file, and whether it
   is cached per request (`React.cache`, `unstable_cache`, `"use cache"`) or issued every time.
   The three `User` session-row SELECT shapes (77,364 / 45,032 / 43,673 calls with different column
   sets) — which callers, and would one `select` collapse them?
2. **The top statements, explained**: for each of the top 40 app statements in
   `db-statements-live.json`, the code path (file:line) and a verdict (fine / over-fetch / N+1 /
   no-op round trip / cacheable / missing index). In particular:
   - `UPDATE User SET lastSeenAt … WHERE lastSeenAt IS NULL OR lastSeenAt < $4`: 33,211 calls,
     1,784 rows — 95 % no-op round trips (the guard is in SQL, not in memory).
   - `Notification` unread COUNT: **100,670 calls**, the most-called statement — per render? per
     layout? audit 2 said three times per feed load.
   - `Photo` dims SELECT returning 1,692 rows per call (637 calls) — the river geometry.
   - `Photo COUNT GROUP BY scope` 8.6 ms × 1,732; `COUNT GROUP BY photoYear, era` × 2,305.
   - `CatchupEntry` SELECTs at ~130 rows/call (2,314 and 2,949 calls) with an aggregate join.
   - `Post` COUNT ×2 per profile (17,445 + 17,444 calls) — one grouped count?
   - `UserPlace` SELECT 32,721 + 21,786 calls — per row on the directory (N+1)?
   - `Visit`: 4 INSERT shapes, 3 UPDATE shapes — how many writers.
   - `Group` 93,926 seq scans on 24 rows, `GroupMember` 384,062 idx scans, `CatchupSeries` 51,350
     seq scans on 8 rows, `CatchupEdition` 82,684 seq scans on 9 rows — small tables so seq scans
     are cheap, but the *call counts* say something is asked on every render; say what.
   - The admin overview's 55 ms nested-count statement.
3. **Indexes**: the 13 zero-scan indexes (4 non-unique, 9 unique/pk) — each with the query that
   was supposed to use it (grep the `where`/`orderBy` in code) and a verdict; missing indexes for
   the hot `where` clauses (compare `db-statements` filters against `db-indexes` definitions).
4. **Columns nothing reads** (write-only), tables with 0 rows and live code paths (`Poll*`,
   `CatchupPromptOption`, `PendingImagePurge`), `LabRoomState` in production.
5. **Schema ↔ live drift** (T18 does the schema side; you do the code side: fields the code
   selects that are not live, or live columns no code selects).
6. **Patterns**: `findMany` without `take`; `include` where `select` would do; `for … await prisma`
   loops; duplicate fetches within one request (`generateMetadata` + page); transactions that could
   be one statement; `$transaction` arrays vs interactive.
7. **`prisma.ts`**: pooler settings, `connection_limit`, the dev rebuild mechanism — any waste.

## Cross-lens leads (from reports landed so far)
- (none yet for the data layer; the tracked-weight lens noted that `public/` is served
  `max-age=0, must-revalidate` on Vercel — a runtime-perf matter, listed there.)
