# data-layer - simplification audit report

Cross-cutting lens for the database layer: `prisma/schema.prisma` (41 models, 61 `@@index`,
17 `@@unique`, 0 enums, 1,330 lines), all 612 `prisma.*` call sites in `src/`, the 50 manual
migrations (the charter said 51; the directory holds 50 `.sql` files, 1,915 lines total),
`src/lib/prisma.ts`, the two pinned DB tests, and the live index/size dumps. Date: 2026-08-25.
Files in territory: ~60 named + 612 call-site ranges; read fully: schema.prisma, prisma.ts,
index-coverage.test.mjs, db-pool-rule.test.mjs, both live JSON dumps, all 50 migration DDL
statements, db-text.ts, prisma-errors.ts, posts.ts, and the data paths of the four heaviest
routes (feed loadPosts, directory page, profile page, catchups round page).

## Coverage

- Read fully: `prisma/schema.prisma`; `src/lib/prisma.ts`; `src/lib/index-coverage.test.mjs`;
  `src/lib/db-pool-rule.test.mjs`; `docs/planning/audits/db-indexes-live.json` (129 indexes);
  `docs/planning/audits/db-sizes-live.json`; DDL of all 50 files in `prisma/migrations-manual/`
  (headers skimmed, every CREATE/ALTER/DROP/UPDATE/DELETE statement extracted and read);
  `src/lib/db-text.ts` + its test; `src/lib/prisma-errors.ts`; `src/lib/posts.ts`;
  `src/app/(main)/directory/page.tsx`; `src/app/(main)/profile/[id]/page.tsx` (data half);
  `loadPosts` and the write actions in `src/app/(main)/feed/actions.ts`;
  `src/app/(main)/catchups/round/[editionId]/page.tsx`; `src/lib/search-log.ts`;
  `src/lib/admin-analytics.ts` (query shapes); the session callback in `src/lib/auth.ts`;
  `scripts/dev/import-places.mjs` (parse + thresholds); the relevant parts of
  `scripts/ops/snapshot.mjs`, `scripts/dev/import-roster.mjs`, `scripts/demo/verify-guard.mts`,
  `.github/workflows/backup.yml`; `docs/TRAPS.md`; catchups spec section 6 + 6.4; ROADMAP
  section 3; `src/lib/demo.ts` policy; `src/lib/demo.test.mjs` (auth-substrate test).
- Skimmed: the remaining ~500 call sites via targeted greps per model and per column (the
  census below is grep-verified, not sampled); `src/lib/catchups.ts` and
  `src/app/(main)/catchups/actions.ts` query shapes (the catchups territory agent owns the
  logic; I checked transaction and select shapes only); `src/lib/last-seen.ts` (visit
  update-then-create shape); `src/lib/place-input.ts` exports.
- Not read: the bodies of admin analytics' long raw-SQL blocks beyond their FROM/WHERE shapes
  (cold, admin-only route; nothing there changes a schema verdict); lab pages' prisma use
  (LabRoomState confirmed via `_archive-state.ts`).
- Uncommitted edits seen (someone else's WIP, untouched): `next.config.ts`,
  `src/lib/admin.ts`, `scripts/qa/phase7-probe.mjs`,
  `src/components/tour/manual-tour-entry.test.mjs`, new `src/app/(main)/forbidden.tsx`. Of
  these only `src/lib/admin.ts` is in my blast radius (it holds a `$transaction` at :138); I
  judged only its transaction arity, which is multi-statement in the working tree, and
  proposed nothing that touches the file. Every file this report proposes editing is clean in
  `git status`.

## Summary

This is the best-audited territory in the repository: B-090/B-091/B-092/B-093 already fixed
the index story, C-015 capped the LIKE scans, keyset pagination is real, every hot include is
a hand-tuned `select`, and the two pinned tests (index-coverage, db-pool-rule) both match the
schema exactly. I found **no N+1, no unbounded hot-route reads that are not deliberate, no
single-statement transactions**. The bloat that remains is at the edges: an entire NextAuth
adapter + three database tables that the JWT strategy made dead on arrival (the single biggest
win, ~40 schema lines, a runtime dependency, three tables and five indexes), a dead
GroupInvite model from the removed Groups feature, five dead-or-write-only columns, a
SQLite-era provider gate copy-pasted into three files five migrations after SQLite left, two
indexes nothing can use, one 25-line transaction cloned across two writers, and 14 exact
copies of the avatar `select` shape. Structural vs cheap: roughly 7 structural, 2 cheap. The
surprise: the Place gazetteer (97MB, 87% of the database) is already trimmed (altNames capped
at 400 chars at import) and its one scary index is proven load-bearing by a live measurement,
so the headline number the charter pointed me at is mostly a not-finding with one owner
option attached.

## Model census (the floor)

Reader/writer counts are `grep -rn "prisma.<model>." src|scripts` excluding `src/generated`,
then string-checked against raw SQL (`"TableName"` in `$queryRaw`, scripts, and workflows).
Rows from `db-sizes-live.json` (2026-08-22, top-12 only; blank = below 112kB / unknown).

| Model | src refs | script refs | raw-SQL/other | rows | verdict |
|---|---|---|---|---|---|
| User | 103 | 9 | analytics SQL, backup verify | 52 | alive |
| Post | 37 | 4 | analytics SQL | 17 | alive |
| Comment | 17 | 2 | | | alive |
| Like | 5 | 2 | | | alive |
| CommentLike | 3 | 0 | | | alive |
| Bookmark | 6 | 0 | | | alive |
| PollOption / PollVote | 1 / 4 | 0 | | | alive |
| Photo | 27 | 2 | backup verify | | alive |
| PhotoLove | 4 | 0 | | | alive |
| Group | 4 | 0 | demo seed | | alive (batch groups + Catch-up roster); `visibility` column is write-only, see 03 |
| GroupMember | 20 | 0 | | | alive |
| **GroupInvite** | **0** | **0** | demo-seed `deleteMany` only | | **dead** - finding 02 |
| **Account** | **0** | **0** | demo policy denies it by string | | **dead** - finding 01 |
| **Session** | **0** | **1** (verify-guard deny canary) | | | **dead** - finding 01 |
| **VerificationToken** | **0** | **0** | | | **dead** - finding 01 |
| AuthToken | 7 | 0 | | | alive |
| OutboundEmail | 43 | 0 | | 30 | alive |
| Report | 13 | 1 | | | alive |
| AuditLog | 4 | 0 | | | alive (append-only by design) |
| Notification | 31 | 0 | | 224 | alive |
| AdminThread / AdminMessage | 26 / 8 | 0 | | | alive |
| Place | 2 | import script | places/search raw SQL, geocode.ts | 234,935 | alive - owner decision B |
| UserPlace | 14 | 0 | delhi-canonical migration | 57 | alive |
| Catchup | 19 | 0 | | | alive |
| CatchupEdition | 24 | 0 | analytics | | alive |
| CatchupPrompt | 10 | 0 | | | alive |
| CatchupEntry | 17 | 0 | backup verify | 133 | alive |
| CatchupEntryLove | 4 | 0 | | 508 | alive |
| CatchupPref | 8 | 0 | | | alive |
| LabRoomState | 3 | 0 | | | alive (`_archive-state.ts`) |
| Contribution | 28 | 0 | backup verify | | alive |
| MetricSnapshot | 1 (admin-analytics read) | writer: `scripts/ops/snapshot.mjs` via raw INSERT | | | alive |
| Visit | 13 | 0 | analytics | 243 | alive |
| SearchLog | 9 | 0 | | | alive; one dead index, finding 07 |
| ContentView | 1 + `recordView` writer (4 pages) | 0 | 5 raw-SQL reads in admin-analytics.ts | 24 | alive |
| LoginAttempt | 5 | 0 | purge migration | 22 | alive |
| RosterEntry | 2 (roster.ts) | writer: `import-roster.mjs` raw INSERT | | 2,134 | alive |
| PendingImagePurge | 5 | 0 | | | alive |
| QueueLease | 3 | 0 | | | alive |

Lesson from the census: a naive `prisma.<model>` grep undercounts three models
(MetricSnapshot, RosterEntry, ContentView) whose writers or readers are raw SQL. Every
"dead" verdict above was re-checked against string references before being called dead.

## Column census (the floor)

**User (44 scalar columns).** All grep-verified with word-boundary searches; the noisy counts
were re-checked with precise patterns. Alive: everything except one -
**`openTo`: 0 references anywhere** (the schema comment itself says "retired 2026-07-30...
no reader or writer remains"). `phone`/`currentCity`/`secondaryCity` look legacy but are
deliberately mirrored by `legacyCityColumns()` (audit C-101) - alive. `consentAt` has only
2 refs (write at signup, read in export) - alive, it is a legal record.

**Post (12 scalar columns).** Alive: all except **`tag`: 0 real references** (only the
comment in `validators.ts:217` noting its retirement 2026-08-02). `targetBatches` is very
alive (the batch-audience system).

**Photo (19 scalar columns).** Alive: all except **`blurhash`: 0 references anywhere**
(schema: "not generated in MVP" - a placeholder that never became real) and
**`originalUrl`: never written** - its 6 references are all defensive reads in purge paths
(`collection/actions.ts:666,677,736,745`, `account-purge.ts:109,126`); no create/update ever
sets it, so it is NULL on every row.

## Index census (the floor)

129 live indexes (dump dated 2026-08-22). The three schema indexes absent from the dump -
`GroupMember_userId_idx`, `Photo_sourceKey_key`, `Report_open_post_per_reporter_key` - are
all created by migrations dated 2026-08-25, i.e. newer than the dump. **Not drift**, but see
Owner decision E: I cannot verify read-only that they were applied to BOTH databases (TRAPS:
the demo DB drifts).

Indexes with **no query that can use them** (verified by grepping every filter/orderBy):

| Index | Columns | Query that uses it | Verdict |
|---|---|---|---|
| `SearchLog_query_idx` | (query) | none found: the three `groupBy(["query"])` reads filter on `createdAt` and hash-aggregate; the dedupe `findFirst` filters (userId, scope, createdAt); nothing filters or orders by `query` | drop - finding 07 |
| `Group_visibility_createdAt_idx` | (visibility, createdAt) | none found: `visibility` is written with constants at 3 sites, never read, never filtered (Groups browse removed) | drop - finding 07 / owner decision on the column in 03 |
| `Comment_postId_isHidden_idx` | (postId, isHidden) | partially subsumed: every comment read now filters `VISIBLE_COMMENT` (isHidden + deletedAt + author.isBlocked) and `Comment_postId_createdAt_idx` serves the same postId prefix | marginal drop - folded into 07, lowest priority |

Overlaps that are **deliberate and defended** (not-findings, listed so nobody re-litigates):
`UserPlace_userId_idx` beside `UserPlace_userId_position_key` (schema comment argues access
path vs invariant); `User_email_key` beside `User_email_lower_key` (Prisma needs its own
@unique for `findUnique({email})`; the lower() one is the canonicalisation guard, TRAPS);
`SearchLog_createdAt_idx` beside `SearchLog_scope_createdAt_idx` (B-093: the retention sweep's
bare-createdAt predicate); `AuditLog_createdAt_idx` beside its two composites (different
leading columns, all four reads named in the schema); `Post_createdAt_idx` beside
`Post_kind_createdAt_idx` (main feed vs letters index). Every one of the ten B-090 child-side
FK indexes is present and pinned by `index-coverage.test.mjs`.

## Findings

### data-layer-01 - Remove the inert NextAuth Prisma adapter and the three dead auth tables
- **Where**: `src/lib/auth.ts:4` (import), `src/lib/auth.ts:58` (`adapter: PrismaAdapter(prisma as any)`);
  `prisma/schema.prisma:310-342` (Account, Session, VerificationToken models),
  `prisma/schema.prisma:143-144` (User back-relations `accounts`, `sessions`);
  `scripts/demo/verify-guard.mts:121` (uses `prisma.session.create` as a deny canary);
  `package.json:26` (`@auth/prisma-adapter": "^2.11.3"`).
- **Phase**: placeholder (fully plumbed subsystem that does nothing)
- **Tier**: T3     **Class**: structural     **Decides**: autonomous for the code and schema; **owner** for the physical `DROP TABLE`s
- **Evidence**: `src/lib/auth.ts:283` sets `strategy: "jwt"` explicitly, and the only provider
  is Credentials. NextAuth only calls an adapter for OAuth account linking, the email
  provider's VerificationToken flow, or database sessions - none of which exist here.
  AGENTS.md states it plainly: "Session strategy: JWT... NOT database sessions".
  `grep -rn "prisma.session\.\|prisma.account\.\|prisma.verificationToken\."` across src and
  scripts finds exactly one hit: the verify-guard canary. The three tables carry 5 live
  indexes and 0 rows anyone reads. Revocation is `credentialVersion` (audits M4/M5/H4), not
  Session rows. Because `strategy` is explicit, the adapter's presence changes NextAuth's
  behaviour in no way at all - it is a listed runtime dependency and three database tables
  wired to nothing.
- **What to do**: (1) delete `src/lib/auth.ts:4` and the `adapter:` line at :58 (and the
  eslint-disable above it for the `as any`); (2) delete the Account, Session,
  VerificationToken models and the two User back-relations from schema.prisma; run
  `npx prisma generate`; (3) swap the verify-guard canary at
  `scripts/demo/verify-guard.mts:121` to another denied model, e.g.
  `prisma.authToken.create` (the demo policy is a string set in `src/lib/demo.ts`, so
  `demo.test.mjs:58`'s `["Account","Session","VerificationToken"]` loop still passes
  unchanged - the policy denies by name whether or not the model exists; leave both files
  alone); (4) hand the `@auth/prisma-adapter` removal to dependency-diet; (5) the physical
  `DROP TABLE`s are a separate, owner-approved dated migration applied to BOTH databases.
- **Saving**: ~40 schema lines, 2 auth.ts lines, 1 runtime dependency, 3 tables + 5 indexes
  in the live DB, and one less thing the RLS loop and backup carry.
- **Risk & gate**: medium (auth is auth). Gates: `npm run check`;
  `npm run test:e2e` (sign-in flow); `security-regressions.test.mjs` (280 lines - grep
  confirms it references none of Session/Account/VerificationToken/PrismaAdapter);
  `cascade-rule.test.mjs` (walks the schema's Cascade graph - re-run, removing leaf models
  should not trip it); a real sign-in + sign-out on localhost.
- **Confidence**: high on inertness (explicit `strategy: "jwt"` is the documented switch);
  the one thing that would change my mind is a future plan to add an OAuth provider, which
  would need the adapter back - grep ROADMAP finds no such plan.
- **Notes**: Do the code change and the schema change in one commit, table drops separately
  and later (order matters: code first, drops after a deploy has proven nothing touches
  them). The `as any` cast at :58 exists only to shut the adapter's type mismatch up - it
  disappears with the line, which also deletes one of the repo's few `any`s. Fear checked:
  `next-auth.d.ts` augments Session types only; no import of `next-auth/adapters` anywhere.

### data-layer-02 - Delete the GroupInvite model; the feature it served is gone
- **Where**: `prisma/schema.prisma:277-291` (model), `:150-151` (User relations
  `groupInvitesSent`/`groupInvitesReceived`), `:271` (Group relation `invites`);
  `src/lib/demo-seed/seed.ts:119` (`tx.groupInvite.deleteMany({})`).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous for schema+code; **owner** for the table drop
- **Evidence**: `prisma.groupInvite` has zero readers and zero writers in src and scripts;
  the only call site is the demo reset wiping a table nothing fills. No invite UI exists;
  the Groups feature was removed (memory: "Groups removed"; the only Group rows are
  auto-created batch groups and Catch-up rosters, whose membership paths -
  `joinBatchGroup`, catchup join-token - never create invites). `demo.ts:80`'s comment even
  narrates wiping "groupMember, groupInvite and group" as reset hygiene, not as a feature.
- **What to do**: remove the model, the three back-relations, and seed.ts:119; run
  `npx prisma generate`; `npm run check`. The live table (3 indexes) is dropped in the same
  owner-approved cleanup migration as 01's tables. Prisma never touches a table with no
  model, so code can ship before the drop.
- **Saving**: ~20 schema lines, 1 seed line, 1 table + 3 indexes live.
- **Risk & gate**: low. `npm run check` (tsc catches any missed reference);
  `scripts/demo/verify-guard.mts` still passes (it never names GroupInvite);
  `group-succession.test.mjs` stays green (it concerns creators, not invites).
- **Confidence**: high. Changes my mind: a spec resurrecting private-group invites -
  `docs/ROADMAP.md` and `docs/planning/FEATURES.md` are where to look; I found none.
- **Notes**: If the owner half-expects Groups to return, the model could stay - but the
  repo's own standard is that a table nothing reads is a placeholder, and re-adding a
  15-line model later is cheaper than every future audit re-deriving that this one is dead.

### data-layer-03 - One cleanup migration for the five dead/write-only columns
- **Where**: `prisma/schema.prisma:20` (`User.openTo`), `:480` (`Post.tag`), `:178`
  (`Photo.blurhash`), `:177` (`Photo.originalUrl`), `:245` (`Group.visibility`);
  defensive readers of originalUrl at `src/app/(main)/collection/actions.ts:666,677,736,745`
  and `src/lib/account-purge.ts:109,126`; visibility writers at
  `src/components/auth/actions.ts:252`, `src/app/(main)/catchups/actions.ts:516`,
  `src/lib/demo-seed/seed.ts:349`.
- **Phase**: dead / placeholder
- **Tier**: T2     **Class**: structural     **Decides**: **owner** sign-off on the drops (live data on a shared DB), execution autonomous
- **Evidence**: column census above. `openTo` and `tag` were retired by owner call and their
  schema comments explicitly promise "a future cleanup migration" - this is that migration.
  `blurhash` was never generated (0 refs). `originalUrl` has no writer, so every row holds
  NULL and the six defensive reads can never see a value. `visibility` is written with
  constants and read by nothing (0 hits for `visibility: true` in any select; no where
  filters it).
- **What to do**: (1) schema: delete the five fields; (2) code: remove the three `visibility:`
  write lines (Prisma then applies the column default - which is also being dropped, so just
  remove them), and simplify the three originalUrl purge sites to two-element URL arrays;
  (3) `npx prisma generate`; (4) one dated idempotent migration
  (`ALTER TABLE ... DROP COLUMN IF EXISTS` x5, plus `DROP INDEX IF EXISTS
  "Group_visibility_createdAt_idx"`), applied via `run-sql.mjs` to BOTH databases;
  (5) `npm run check`.
- **Saving**: ~12 schema lines + ~10 code lines; five columns and one index off every future
  backup, export and `SELECT *`.
- **Risk & gate**: low-medium (destructive DDL on the shared live DB - the reason this is an
  owner call even though the columns are provably dead). Gates: `npm run check`;
  `npm run verify:crawl` (any missed reader 500s); the account-export route
  (`/api/account/export` selects photo fields - confirm it does not name originalUrl/blurhash;
  grep says it selects `era: true` and friends but check at execution time);
  demo guard tests stay green (none name these columns).
- **Confidence**: high for openTo/tag/blurhash (sanctioned or zero-ref); medium for
  originalUrl (a NULL-only column is still a promise of "full-size later" - if the owner
  wants that future, keep it and this line of the finding dies); medium for visibility (if
  Groups ever return as a browsable feature it comes back - but so can the column).
- **Notes**: TRAPS forbids `db push`; the migration must be hand-written and dated, and the
  demo DB must get it too. `Post.tag` at 82 bare-word grep hits shrank to zero real ones on
  precise patterns - the fixer should not be alarmed by the noisy count.

### data-layer-04 - Retire the SQLite-era provider gate; it is dead code copied into three files
- **Where**: `src/lib/db-text.ts:12-14` (`IS_POSTGRES` + conditional `insensitive`);
  `src/app/(main)/feed/actions.ts:129-131` (local copy `searchInsensitive`);
  `src/app/(main)/collection/actions.ts:491-494` (local copy `insensitive`).
- **Phase**: library (leftover Turso/libSQL-era compatibility) + dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the app migrated off Turso/libSQL on 2026-07-01 (AGENTS.md); schema.prisma
  says `provider = "postgresql"`; the client is `PrismaPg` and `prisma.ts` throws without a
  DATABASE_URL. `mode: "insensitive"` is therefore always valid, and
  `(process.env.DATABASE_URL ?? "").startsWith("postgres")` is always true in every build
  that can run. Worse, the gate is duplicated: db-text.ts calls itself "the one definition"
  (directory/where.ts imports it) while feed and collection actions each carry a private
  copy with the same three-line SQLite comment. These are the only `libsql/turso/sqlite`
  traces left in src - the migration was otherwise clean.
- **What to do**: in db-text.ts, `export const insensitive = { mode: "insensitive" } as const;`
  and delete IS_POSTGRES + rewrite the header comment (keep the "spread this into every
  contains a human types" rule - that part is alive); in feed/actions.ts delete :129-131 and
  import `insensitive` from `@/lib/db-text` (rename the four `searchInsensitive` spread
  sites); in collection/actions.ts delete :491-494 and import it (three spread sites).
- **Saving**: ~15 lines and one false branch per file; ends the drift where three files
  claim to be the single source of a rule.
- **Risk & gate**: low. `db-text.test.mjs` pins only `escapeLike` (verified - the gate is
  unpinned); `npm run check`; search a name on /feed, /directory and /collection once.
- **Confidence**: high. Changes my mind: nothing realistic - a return to SQLite would be a
  migration project in which this constant is the smallest item.
- **Notes**: `directory/where.ts:2` already documents importing "the one definition"; this
  finding just makes that sentence true.

### data-layer-05 - One shared person-select fragment instead of 14+ hand-copies
- **Where**: exact string `select: { id: true, name: true, photoUrl: true, birdOverride: true }`
  x14 across `src/app/(main)/messages/[id]/page.tsx:59`,
  `src/app/(main)/admin/messages/[id]/page.tsx:74`,
  `src/app/(main)/admin/catchups/[catchupId]/page.tsx:112,121`,
  `src/app/catchups/join/[token]/page.tsx:69`, and ten more; the 8-field card shape
  (`+ accountType, verifyState, batchType, batchYear`) in `feed/actions.ts:1196-1206`
  (loadPosts include) and `catchups/round/[editionId]/page.tsx:271-281`; the directory keeps
  its own `PERSON_SELECT`/`PIN_SELECT` (`directory/page.tsx:22-60`).
- **Phase**: dedupe
- **Tier**: T3 (many files, zero behaviour change)     **Class**: structural     **Decides**: autonomous
- **Evidence**: grep counts above; jscpd's catchups clone cluster (raw/jscpd.txt lines
  185-224) is partly this shape repeated. The repo already proves the pattern works and why
  it matters: `posts.ts` exists because "the COUNT on a card and the LIST in the thread must
  be the same question" (audit C-003) - the person-shape has the same drift risk (a new
  avatar-affecting field, e.g. a future `birdPickedAt` perk marker, would today need 14+
  edits and would miss some).
- **What to do**: add to a small lib module (`src/lib/person-select.ts`, or beside the
  fragments in posts.ts): `export const AVATAR_SELECT = { id: true, name: true, photoUrl:
  true, birdOverride: true } as const;` and `export const PERSON_CARD_SELECT = {
  ...AVATAR_SELECT, accountType: true, verifyState: true, batchType: true, batchYear: true }
  as const;` then replace the copies mechanically. Leave the directory's PERSON_SELECT
  (carries currentCity/jobTitle/workplace) and PIN_SELECT (carries places) alone or compose
  them from PERSON_CARD_SELECT.
- **Saving**: ~10-20 net lines (each replacement is line-for-line); the real value is that
  the person shape becomes one decision. Honest: this is drift-proofing more than shrink.
- **Risk & gate**: low. Pure constant extraction; `npm run check` (tsc verifies every site
  still selects what its renderer reads), `npm run visual`.
- **Confidence**: high. Changes my mind: if the shapes genuinely diverge per surface (some
  sites legitimately need fewer fields), in which case only the exact-14 get the shared
  constant and the rest stay.

### data-layer-06 - Extract the duplicated wipe-and-recreate UserPlace transaction
- **Where**: `src/app/(main)/admin/people/actions.ts:223-245` and
  `src/components/settings/actions.ts:161-183` (jscpd: raw/jscpd.txt line 173, 25 lines /
  115 tokens duplicated).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: both writers run the identical
  `$transaction([userPlace.deleteMany, ...creates at position i, user.update(legacyCityColumns)])`.
  The schema itself documents that exactly these two writers exist and must behave
  identically (`UserPlace` comment: "Both writers -- the member's own settings and the
  admin's person page -- are wipe-and-recreate transactions"). `src/lib/place-input.ts`
  already holds every shared half (parsePlaces, resolvePlaces, legacyCityColumns); the
  transaction is the last piece written twice.
- **What to do**: add `export function replaceUserPlaces(userId: string, cleaned: ResolvedPlace[])`
  in place-input.ts (returns the `prisma.$transaction([...])` promise; note place-input.ts
  currently has no prisma import - if keeping it pure matters for its testability under
  node:test, put the helper in a sibling `place-write.ts` instead, since TRAPS requires
  testable modules to avoid relative value imports); call it from both actions.
- **Saving**: ~25 lines; the C-101 legacy-mirror rule and the Low-2 unique-race behaviour
  become one implementation.
- **Risk & gate**: low. `npm run check`; save cities in /settings and in the admin person
  page once each; `index-coverage.test.mjs` (UserPlace unique untouched).
- **Confidence**: high.

### data-layer-07 - Drop the two (plus one marginal) indexes no query can use
- **Where**: live DB + `prisma/schema.prisma:1182` (`SearchLog @@index([query])`),
  `:274` (`Group @@index([visibility, createdAt])`), `:549` (`Comment @@index([postId, isHidden])`).
- **Phase**: dead
- **Tier**: T2 (schema edit + dated migration on both DBs)     **Class**: structural     **Decides**: autonomous for SearchLog/Group; the Comment one is marginal - skip it if in doubt
- **Evidence**: index census above. `SearchLog_query_idx`: `admin-analytics.ts:493-521`
  groups by query but filters on createdAt (a btree on query serves neither the hash
  aggregate nor the filter); `search-log.ts:63` filters (userId, scope, createdAt). Nothing
  else touches SearchLog. `Group_visibility_createdAt_idx`: `visibility` appears in zero
  where/orderBy clauses. `Comment_postId_isHidden_idx`: every read now goes through
  `VISIBLE_COMMENT` (isHidden AND deletedAt AND author join), and
  `Comment_postId_createdAt_idx` serves the same postId prefix; at this app's
  comments-per-post the second index buys nothing measurable.
- **What to do**: remove the `@@index` lines from the schema, `npx prisma generate`, one
  dated migration with `DROP INDEX IF EXISTS` x2 (or x3) via run-sql.mjs on both DBs.
- **Saving**: ~6 schema lines; trivially small bytes today, but each is write amplification
  on a per-keystroke insert path (SearchLog) forever.
- **Risk & gate**: low - dropping an index can never break correctness, only speed, and no
  query uses these. Gate: `npm run check` (index-coverage.test.mjs pins none of the three -
  verified), then the admin analytics searches panel still loads.
- **Confidence**: high for SearchLog/Group, medium for Comment (a future "hidden comments"
  moderation list filtering `postId+isHidden` without dates would want it back - it is one
  CREATE INDEX away).
- **Notes**: if finding 03 drops `Group.visibility` the visibility index goes in that same
  migration; do not do it twice.

### data-layer-08 - Stop fetching the password hash on the profile page
- **Where**: `src/app/(main)/profile/[id]/page.tsx:111-114`
  (`prisma.user.findUnique({ where: { id }, include: { places: ... } })`).
- **Phase**: hygiene (over-selection on a hot route)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `include` without `select` returns every User scalar - all 44 columns,
  including `password`, `credentialVersion` and `email` - on the most-visited people page.
  Nothing leaks (page.tsx:369-410 hand-picks every prop it passes to the client, verified),
  but the hash sits in server memory per view and every new sensitive column is fetched by
  default forever. The session callback (`auth.ts:311`) shows the house style: a tight
  select even on its own hot path.
- **What to do**: smallest honest change is Prisma 7's `omit`: add
  `omit: { password: true }` to the findUnique (one line). A full `select` would be ~25
  lines listing the ~20 fields the page reads - more code for marginal gain; the omit is
  the right size.
- **Saving**: 0 lines (adds one); defence-in-depth only.
- **Risk & gate**: low; `npm run check`, open a profile.
- **Confidence**: high.
- **Notes**: cross-checked for the write-path lens: no serialization leak exists today.

### data-layer-09 - Delete the never-called `isRecordNotFound`
- **Where**: `src/lib/prisma-errors.ts:26-29`.
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: knip lists it; direct grep confirms the only occurrence in src is the
  definition. Callers import `isUniqueViolation` (5 files) and `isForeignKeyViolation` (1);
  the P2025 helper was written for symmetry and never used - the double-tap deletes it was
  meant for are all `deleteMany` (count 0 is fine, no P2025 thrown).
- **What to do**: delete the function and its doc comment; update the module header's "three
  Prisma error codes" to two.
- **Saving**: ~6 lines.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high. Changes my mind: a pending change that starts using `update` where
  it now uses `updateMany` - none visible.

## The floor's remaining direct questions

**Query shape on the four heaviest routes - verdict: clean.** `loadPosts`
(`feed/actions.ts:1107-1305`): keyset pagination on values (not Prisma cursor), `take:
PAGE_SIZE + 1`, per-viewer filtered sub-includes, offset fallback only for count-sorts with
a clamped offset - nothing to fix. Directory (`directory/page.tsx:293-356`): a deliberate
7-leg `Promise.all` (matches the pool comment in prisma.ts: `max 5` sized to exactly this
fan-out "in two waves"); the one unbounded `findMany` (map pins) is defended by B-092's
serialization cap and genuinely needs every located row for counts. Profile: three counts in
one round trip plus a `take: 60` photo read (the postCount/letterCount pair could be one
`groupBy(["kind"])`, but they already share the Promise.all round trip - not worth a
finding). Catchups round page: three sequential reads that are gate-then-write-then-read by
design; the published payload is a fully hand-selected nested read. **No `await prisma`
inside a loop anywhere in src** (the closest is catchups' reorder building an array of
updates for one `$transaction`, which is the correct batch form). All 30+ `$transaction`
sites are multi-statement (spot-checked the array forms: messages x2, settings, admin
people, admin-threads-server - all 2-3 statements). Raw SQL is confined to
places/search+geocode (trigram queries Prisma cannot express), admin-analytics
(aggregations), and migrations - each defensible.

**The two pinned tests match the schema.** `index-coverage.test.mjs` pins the ten B-090
child-side FK indexes (all present), sweeps every composite `@@unique`'s trailing FK with a
three-entry reviewed exemption list (all consistent), asserts the trigram migration and that
the search route still ILIKEs altNames (it does, route.ts:85), and pins
`Group.batchYear @unique` + the P2002 answer in `joinBatchGroup` (both present).
`db-pool-rule.test.mjs` pins max 1-10 (actual 5), connectionTimeoutMillis <= 15000 (actual
5000), query_timeout <= 60000 (actual 20000), and onPoolError (present). Nothing in my
findings touches what they pin except 07, which pins none of the three indexes (verified by
name).

**Migrations verdict.** 50 files, 1,915 lines, all idempotent, all dated. The only
add-then-drop in the whole history is `OutboundEmail_status_priority_createdAt_idx` (created
2026-08-11, replaced 2026-08-21 by the wider drain index in mail-backoff.sql) - a real
evolution, not net-zero noise. No column is created and later dropped. See Owner decision C
for the squash question (recommendation: keep).

**Turso-era leftovers.** Exactly one, in three copies: finding 04. Nothing else in src,
prisma, scripts or package.json mentions libsql/turso/sqlite.

**src/generated/prisma vs tsconfig (charter item 7, handed to bundle-build).** Confirmed:
`.gitignore:56` ignores `/src/generated/prisma`, while `tsconfig.json` includes `**/*.ts`
with only `node_modules` excluded - so the entire generated client is typechecked as root
files on every `tsc` run (the build's 19.4s TypeScript phase includes it), and
madge counts its 43 internal cycles as repo cycles. Excluding it from `include` (it would
still be typechecked on demand via imports) is bundle-build's call.

## Owner decisions

**A. The six orphan Catch-up tables from the reverted build.** The spec
(`docs/spec/catchups.md` 6.4) says the reverted 2026-07 build left `Catchup`,
`CatchupAnswer` (22 rows), `CatchupAnswerLove`, `CatchupIssue` (4 rows), `CatchupPref`,
`CatchupQuestion` (10 rows) as dead physical tables, and ships the exact DROP script for
them. Curiously, the 2026-08-22 live index dump lists **no indexes for any of them**, which
suggests they may have been dropped already - or the dump query was filtered. Someone with
database access should run one `SELECT tablename FROM pg_tables WHERE schemaname='public'`
and, if they are still there, run the 6.4 script (checking the 36 leftover rows for anything
worth keeping first, as the spec asks). Recommendation: verify, then drop; the spec already
wrote the runbook.

**B. The Place gazetteer is 97MB - 87% of a 112MB database. Keep it.** The numbers: 234,935
rows from GeoNames cities500 (every settlement with population >= 500), with `altNames`
already truncated to 400 characters at import (`import-places.mjs:35`), two lower()
expression indexes, and a 36MB trigram index that a live measurement proved is the
difference between 368ms/4,690 buffers and 7.4ms/54 buffers per keystroke (B-091, quoted in
index-coverage.test.mjs). The database plan is 500MB, so this leaves ~400MB of headroom; the
nightly pg_dump compresses the whole database to ~15MB (backup.yml's own comment), so the
backup cost is small. Trimming to population >= 1,000 (GeoNames' cities1000 is roughly 140k
rows) would save around 35-40MB but silently removes the villages - and this membership is
precisely the crowd with someone in a small place; a member whose town vanishes falls back
to a free-typed entry with no coordinates and drops off the map. Recommendation: keep
cities500 as is; revisit only if the database ever approaches its plan limit, and trim by
population then.

**C. Do not squash the 50 manual migrations.** They are 1,915 lines of applied history,
idempotent, and dense with the WHY comments this repo treats as a standard. Two practical
reasons beyond sentiment: the demo database drifts (TRAPS: found fourteen behind once) and
catching it up means replaying exactly these files; and a squashed baseline would be a new,
never-applied artefact that can silently disagree with what production actually ran.
Recommendation: keep all 50; if a fresh-database story is ever needed, generate a baseline
from schema.prisma at that moment instead.

**D. The dead-column drops (finding 03) need your one-word approval.** `openTo` and `tag`
you already retired - the schema comments promise this cleanup. `blurhash` and `originalUrl`
were "maybe later" placeholders that never grew a writer; dropping them costs nothing and
re-adding a column later is a one-line migration. `Group.visibility` is the only one with a
future attached (a returning Groups feature would want it); dropping it is my
recommendation, keeping it is defensible.

**E. Confirm the three 2026-08-25 migrations reached both databases.** `GroupMember_userId_idx`,
`Photo_sourceKey_key` and `Report_open_post_per_reporter_key` are in the schema and in
today's migration files but postdate the live index dump, and I cannot check the demo
database read-only. One `run-sql.mjs --env .env.demo` replay of the three files is cheap
insurance (they are idempotent).

## Not-findings

- **`prisma.ts` at 147 lines for ~30 lines of code** - every comment carries a probe date,
  an audit ID, or a measured number (the Supavisor statement_timeout probe, the pool-sizing
  arithmetic, the 2026-08-19 triple-forget). This is the owner's documented standard; pinned
  by db-pool-rule.test.mjs. Leave it.
- **`UserPlace_userId_idx` beside the `(userId, position)` unique** - schema comment argues
  invariant vs access path explicitly. Deliberate redundancy.
- **`User_email_key` beside `User_email_lower_key`** - Prisma requires its own @unique for
  `findUnique({ email })`; the lower() twin is the canonical-email guard
  (2026-08-21-email-canonical.sql). Both earn their keep; TRAPS documents the migrate-diff
  noise.
- **`SearchLog_createdAt_idx` beside `(scope, createdAt)`** - B-093: the retention sweep's
  bare createdAt predicate cannot use the composite. Defended in the schema comment.
- **Legacy `User.phone` / `currentCity` / `secondaryCity` mirroring** - alive by design;
  `legacyCityColumns` (audit C-101) keeps both written from one place, and the profile
  falls back to them during the migration window.
- **The directory's unbounded pin `findMany`** - needs every located row for honest counts;
  B-092 already capped what serializes (PIN_PEOPLE_CAP = 12). The page comment carries the
  measurement (1-2MB per load before the cap).
- **`@@map("CatchupSeries")` / `@@map("CatchupReminderPref")`** - not gratuitous renaming;
  the reverted build left incompatible same-named tables (spec 6, live introspection
  2026-07-05).
- **The Report partial unique existing only in SQL** - TRAPS documents why Prisma cannot
  hold it and why the sentinel-column alternative is worse; the schema comment at
  `Report:596-604` warns db push would drop it.
- **`Visit`/`SearchLog`/`ContentView`/`LoginAttempt` telemetry tables** - each carries the
  owner's explicit 2026-08-19 request in its header, has live writers and admin-analytics
  readers, and a retention sweep. Not speculative plumbing.
- **`last-seen.ts` update-then-create instead of upsert** - the comment explains the race
  (upsert on a non-unique window is not atomic); shape is deliberate.
- **The 50-migration folder size** - see Owner decision C.

## For other lenses

- **bundle-build**: tsconfig `include: ["**/*.ts", ...]` sweeps gitignored
  `src/generated/prisma` (and `.next/types`) into every typecheck as root files; the build's
  19.4s TS phase and madge's 43-cycle floor both inherit it. Confirmed here (charter item 7).
- **dependency-diet**: `@auth/prisma-adapter@^2.11.3` (package.json:26) has exactly one use,
  the inert adapter line in finding 01 - removable with it. Also knip flags `@auth/core/jwt`
  as an unlisted dependency reached from `src/app/api/dev-login/route.ts:38`.
- **scripts-e2e-ci**: knip lists `scripts/demo/apply-schema.mjs` as unused - if real, it is
  a schema-applying script nobody calls, worth their verdict. Also
  `scripts/demo/verify-guard.mts:121` must swap its Session canary if finding 01 lands.
- **catchups**: the jscpd clone cluster inside `catchups/actions.ts` (lines 340-460, 617-702,
  1363-1774: repeated membership-gate + author-select blocks, 8+ clones) is their logic to
  fold; my finding 05 covers only the select constants.
- **lib-core-config**: `placeSchema` (place-input.ts:25) and `reportSchema`
  (validators.ts:283) are exported but only used in-module per knip - the `export` keywords
  can go.
- **admin-analytics**: `admin-analytics.ts` mixes Prisma groupBys with long raw-SQL blocks;
  on a cold admin route this is fine by me, but it is the one file where "raw SQL where the
  query builder would do" is worth their look.

## Metrics

- Lines read: schema.prisma 1,330; prisma.ts 147; the two DB tests 236; migrations DDL
  ~1,915 (statements extracted from all 50 files); live dumps 717 JSON lines; plus the four
  route data paths (~1,600 lines) and ~15 supporting lib files.
- Models 41; scalar columns on the big three: User 44, Photo 19, Post 12. Call sites:
  612 `prisma.*` in src (plus 21 in scripts), 67 `$queryRaw`/`$executeRaw`/`$transaction`
  sites, ~30 `$transaction` blocks - all multi-statement.
- Live indexes 129; dead-or-unusable found: 2 certain + 1 marginal (finding 07) + 8 on dead
  tables (findings 01/02: 5 auth + 3 GroupInvite).
- Dead models: 4 of 41 (Account, Session, VerificationToken, GroupInvite). Dead columns on
  the big models: 4 certain + 1 write-only (finding 03). Dead exports: 1 (finding 09).
- Biggest table: Place 97MB / 234,935 rows of a 112MB database; next largest is RosterEntry
  at 688kB - the entire member-generated dataset currently fits in ~15MB.
- Comment-heaviest file in territory: prisma.ts at roughly 3.5 comment lines per code line -
  intentional (see Not-findings).
- Estimated honest line saving across findings: ~120-140 lines of schema+code, 1 runtime
  dependency, 4 tables + 11-12 indexes live, 5 columns.
