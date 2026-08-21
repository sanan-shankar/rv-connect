# Pre-release fix session — disposition ledger

Running record of every finding in `bug-report.md`: fixed (with the commit), not-a-bug (with the
reason), or deferred (with the reason). **Session 1: 2026-08-21.**

Legend: **F** fixed · **N** not a bug · **D** deferred

---

## Session 1 — what shipped

Fourteen commits on `main`, none pushed. `npm run check` green (38 unit tests), `npm run visual`
23/23, every touched route rendered at 200 with a clean console.

### Phase 0 — safety nets

| ID | | Outcome |
|---|---|---|
| §4.1 pool config | F | `e98474a`. `max: 5`, `connectionTimeoutMillis: 5s`, `query_timeout: 20s`, `onPoolError` logging. **Correction to the report's fix direction:** `statement_timeout` is deliberately NOT set. pg ships it as a startup parameter and Supavisor silently drops it — probed live against both `:6543` and `:5432`: `SHOW statement_timeout` returned Supabase's own `2min` and a `pg_sleep(3)` under `statement_timeout=1000` ran to completion. Setting it would be config that reads like a guard and is not one. `query_timeout` (client-side) IS honoured; verified live. Pinned by `src/lib/db-pool-rule.test.mjs`. |

### Phase 1 — Criticals and mail

| ID | | Outcome |
|---|---|---|
| B-001 | F | `d762f5e`. `Group.creatorId` → nullable `SetNull`. Purge promotes the longest-standing remaining member to group admin; merge inherits ownership and carries the Keeper role. Proved in a rolled-back live transaction: deleting the group creator now leaves all 12 groups, both Catch-ups, both Editions, all 13 prompts, and takes only his own 9 of 133 entries. Pinned by `cascade-rule.test.mjs`, which walks the whole Cascade graph out of `User` rather than checking two columns. |
| B-002 | F | `95811b1`. `nextAttemptAt` + `deferrals`; every failure books a later retry; transient provider errors hand the attempt back and count on their own budget; quota errors wait for the budget window. `src/lib/mail-policy.ts` + tests. |
| B-010 | F | `d762f5e`. `CatchupPrompt.authorId` → nullable `SetNull`; three render sites guard null. |
| B-011 | F | `d762f5e`, `09e7a1b`. New `PendingImagePurge` worklist written inside the delete transaction; drained after commit, retried by the nightly sweep. Report's option (a) — delete by `uploads/<userId>/` prefix — was **not** taken: the app's R2 token is object-scoped (see `presignImagePut`'s docblock), so a `ListObjectsV2` sweep cannot be relied on. |
| B-012 | F | `d762f5e`. `collectImageUrls` reads every `AdminMessage.imageUrl` in the member's threads. `Group.coverImage` is moot: groups survive the purge now. |
| B-013 | F | `d762f5e`. `delImageByKey` returns a boolean and logs the key in every environment; the purge counts objects gone, not attempts; failures reach the audit line. |
| B-070 | F | `95811b1`. Eligible kinds derived from `PRIORITY`. Swept the live queue: no rows stranded (no deletion has ever been requested). |
| B-071 | F | `95811b1`. Budget counts `sentAt` with no status filter, plus in-flight rows. |
| B-072 | F | `95811b1`. One drain pass at a time via a `QueueLease` row; claim/block/release/re-claim proved live. |

### Phase 2 — High, member-facing

| ID | | Outcome |
|---|---|---|
| B-020 | F | `69cec9f`. One `emailField()`/`normalizeEmail()`; backfilled the one live mixed-case row; unique index on `lower(email)`. |
| B-021 | F | `1fa533e`. New `superseded` outcome; verify tokens no longer burned on remint (reset tokens still are). |
| B-022 | F | `69cec9f`. Proxy writes `next` with the query string. Verified live. |
| B-023 | F | `c3f5782`. Shared `refuseSelfOrLastAdmin`, serializable; the three controls are not rendered on your own row. |
| B-024 | F | `c3f5782`. `requireAdminPage()` on all 12 admin pages + a gate-coverage assertion. All 12 verified 200 with a clean console. |
| B-030 | F | `d254560`. One `shrinkForUpload` at four client boundaries, with a 4MB budget and honest copy for the GIF/HEIC pass-throughs. `next.config.ts` now records that `bodySizeLimit` cannot raise the real cap. |
| B-041 | F | `7b1ed2c`. `setRemoved(true)` on delete; `onSaved` from the edit dialog into card state. |
| B-043 | F | `7b1ed2c`. `failed` autosave state rendered loudly, toast once per run, plus a localStorage crash net for a letter with no row yet (and one whose save is failing), cleared on success. |
| B-044 | F | `7b1ed2c`. Both submit buttons gated on `uploading`. |
| B-045 | F | `7b1ed2c`. The rail takes a viewer and applies `cityScopeWhere` + the `targetBatches` fragment. |
| B-048 | F | `7b1ed2c`. `cityScope` fetched, seeded, sent unconditionally on a draft, re-validated server-side. |
| B-049 | F | `7b1ed2c`. `onCommit(next)`, the shape `commitPlaces`/`commitHouses` always had. |
| B-080 | F | `040b0e6`. Both awaits wrapped; the confirm path's catch reassures rather than inviting a second payment. |
| B-081 | F | `040b0e6`. The webhook writes a `contribution_received` notification linking `/pick-bird`, only when it made the transition. |
| B-093 | F | `d77197a`. `Visit` and `SearchLog` expire at 180 days (double the deepest analytics lookback, 90). `SearchLog` gained the `createdAt` index the predicate needs. `docs/SECURITY.md` retention table updated. |
| B-121 | F | `7354d5b`. `Group.batchYear Int? @unique`; `joinBatchGroup` creates and catches P2002. Nine existing groups backfilled and their `creatorId` nulled (a batch group has no keeper). Unique proved live. |

### Phase 3 — scale

| ID | | Outcome |
|---|---|---|
| B-090 | F | `be1141a`. Ten child-side FK indexes + `index-coverage.test.mjs` so the eleventh relation cannot ship without one. |
| B-091 | F | `be1141a`. `pg_trgm` GIN index on `Place.altNames`. Measured with EXPLAIN (ANALYZE) before and after: **368ms / 4,690 buffers → 7.4ms / 54 buffers**. Costs 36MB; the database went 76MB → 112MB against a 500MB ceiling. |
| B-092 | F | `52a16f2`. Twelve people per pin; counts unchanged; past the cap the drilldown hands over to `/directory?city=...`. |
| B-101 | F | `d77197a`. Heatmap double-converts (`AT TIME ZONE 'UTC'` first). Measured live: a visit stored at 06:46 wall (12:16 IST) bucketed at hour 1 before, hour 12 after. |

### Medium/Low picked up along the way

| ID | | Outcome |
|---|---|---|
| M02 | F | `d762f5e`. Merge sheds colliding `CatchupEntry` rows instead of aborting. |
| M26 | F | `c3f5782`. Last-admin check inside a serializable transaction. |
| M27 | F | `040b0e6`. The `payment.failed` branch is a conditional update. |
| M55 | F | `d77197a`. `prune.mjs` agrees with `retention.ts` (365), which is the source of truth. |
| M57 | F | `040b0e6`. `startContribution` metered by a new `contributions` bucket. |
| Low 62 | F | `d254560`. The Collection's fallback path shrinks and says so. |
| Low 64 | F | `09e7a1b`. The sweep purges at most 10 accounts a night, oldest first. |
| Low 85 | F | `d77197a`. The per-user 100-cap spares unread rows. |

### Review findings acted on

- **write-path-reviewer** on `d762f5e` found `promoteOrphanedGroups` using `update()` (throws P2025
  when the row is gone, aborting an otherwise-good purge) and the uncapped nightly purge loop. Both
  fixed in `09e7a1b`. Its other checks — no network call inside the interactive transaction, the
  demo's three layers intact (`demo.test.mjs` 19/19, `verify-guard.mts` 15/15), merge statement
  ordering, no loosened gate, no non-TypeScript reader of the now-nullable columns — came back clean.
  It misattributed an in-flight `src/lib/email.ts` edit to another session; that was this session's
  own uncommitted work and `tsc` was green.
- **screenshot-qa** ×2 on `/admin/people/<own id>` confirmed the three controls are absent (not
  hidden), the replacement card is 121px vs the 110px button version so it does not read as a hole,
  type on-token (14px / 22.75px / `--muted-foreground`), no overflow, no em dash. Two findings: an
  orphaned last word (fixed in `52a16f2`) and the Standing row now reading sparse with one pill
  (127px of 310px). Left as-is: left-aligned uneven-width content is the established idiom on that
  page, and the Careful card already explains why the other controls are gone.

---

## Still open

**Canonical (16):** B-040, B-042, B-046, B-047, B-050, B-060, B-061, B-062, B-063, B-100, B-110,
B-111, B-120, B-122, B-200, B-201.

**§3.M:** 63 of the 68 Medium roots (M02, M26, M27, M55, M57 done).

**§3.L:** 114 of the 117 Low items (62, 64, 85 done).

**Feature builds:** B-050 (profile display-email control) and B-063 (leave / archive / delete a
Catch-up with a 30-day recently-deleted). B-063's dependency on B-001 is satisfied.

---

## One thing for the OWNER, found live (not in the audit's own words)

**`EMAIL_DEV_SEND=1` is currently set in the local `.env`.** That flag makes this development
machine send REAL mail, from the production sending domain, to real member addresses in the shared
production database. It exists for the deliberate case of checking how a message renders in an
inbox; it is not meant to stay on. Nothing was sent by session 1 (the queue was empty; the only two
recent rows are from 2026-08-20 12:07 UTC, before it started), but the next drain from any local
page view will send whatever is queued.

Short answer for the owner: comment that line out in `.env` when you are not actively testing a
mail template.

This is audit item **M53** ("EMAIL_DEV_SEND marks real members' queued mail as sent in dev, shared
DB"), now confirmed live. The code fix session 2 should make: keep `queueIsSendable()` all-or-
nothing as it is, and give the drain's row selection a development-only `to: { in: [ADMIN_EMAIL] }`
filter, so a local drain can never CLAIM a row addressed to somebody else. Do NOT make `sendMail`
refuse the address instead — a refusal there is a non-transient failure, so the row would burn its
attempts and end up `failed`, which is the 2026-08-12 incident wearing a different hat.

## Things a later session should know

- **Another session shares this checkout.** It committed `d86005d copy(support): ...` mid-way
  through. Stage by name, never `git add -A`.
- **`statement_timeout` does not work through Supavisor.** Proved twice. Don't add it back.
- **`CREATE INDEX CONCURRENTLY` cannot be used with `run-sql.mjs`**: it sends the file as one simple
  query, which Postgres wraps in an implicit transaction. Plain `CREATE INDEX IF NOT EXISTS` is fine
  at this data size.
- **A rolled-back transaction is the safest way to prove a destructive behaviour** against the shared
  production database: `BEGIN; DELETE ...; SELECT counts; ROLLBACK;` through `run-sql.mjs`. Used for
  B-001 and B-121.
- **`pg_trgm` lives in the `extensions` schema** on this project and the operator class is
  schema-qualified in the migration, so the index does not depend on `search_path`.
- **Avoid backticks in `git commit -m` strings** — zsh eats them. One commit message needed amending.
