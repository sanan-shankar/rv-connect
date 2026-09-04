# data-layer - refactor audit 2 report

Cross-cutting lens for the database and every query: `prisma/schema.prisma` (37 models, 1,441
lines: 632 code / 655 comment), the 65 manual migrations (968 code / 1,512 comment lines), the
client and its three pinned tests, `people-select.ts`, `keyset.ts`, and all 523 `prisma.<x>.`
call sites in `src/` (104 files; 36 `$transaction`, 31 `$queryRaw`, 1 `$executeRawUnsafe`).
No database access: every claim about live data is marked LIVE-UNVERIFIED and carries the SELECT
the fix session must run (section "The SELECTs" below). Date: 2026-09-03. Files in territory:
~75 named + every call-site range; read fully: 40; read at the call site: every hotspot named in
a finding.

## Coverage

- Read fully: `prisma/schema.prisma`; `prisma.config.ts`; `src/lib/prisma.ts`;
  `src/lib/people-select.ts`; `src/lib/keyset.ts`; `src/lib/index-coverage.test.mjs`;
  `src/lib/db-pool-rule.test.mjs`; `src/lib/cascade-rule.test.mjs`; `src/lib/db-text.ts`;
  `src/lib/content-view.ts`; `src/lib/last-seen.ts`; `src/app/(main)/layout.tsx`; the last 12
  migrations in full (`2026-08-27-drop-nextauth-adapter-tables` through
  `2026-08-30-photo-exif-date`, which includes all 9 added since audit 1) plus the DDL/DML
  statement lines of all 65 (extracted with grep, every CREATE/ALTER/DROP/UPDATE/DELETE/INSERT
  read); `docs/TRAPS.md`; `docs/spec/catchups.md` 6.4; the audit-1 data-layer report, its
  phase-6 census and the session-9 fix log; the raw tool outputs for this territory.
- Read at the call site (the surrounding function, not the whole file): the data halves of
  `catchups/[catchupId]/(home)/page.tsx`, `directory/page.tsx`, `directory/actions.ts`,
  `profile/[id]/page.tsx`, `admin/people/[id]/page.tsx`, `catchups/[catchupId]/answer/page.tsx`,
  `notice/[id]/page.tsx`, `feed/page.tsx`, `letters/(index)/page.tsx`,
  `letters/[id]/(read)/page.tsx`, `collection/[id]/page.tsx`, `admin/analytics/page.tsx`
  (structure and every loader call); `feed/actions.ts` (loadPosts, comments, the groupId
  refusal); `collection/actions.ts` (loadPhotos, buildCollectionWhere, the rail groupBy);
  `email-queue.ts` (drain entry, lease, verificationMailState); `catchups.ts`
  (advanceDueCatchups, the two engine transactions); `admin-analytics.ts` (every loader's query
  shape; the raw SQL over ContentView, Visit, LoginAttempt); `admin.ts` (loadAdminCounts);
  `admin-people-query.ts`; `api/account/export/route.ts` (the pager); `auth.ts` (session
  callback); `auth-tokens.ts` (the mint transaction); `retention.ts` (every sweep);
  `account-purge.ts` (the purge queue reader); `image-record.ts`; `demo-seed/seed.ts` (wipe order
  and every createMany); `messages/actions.ts`, `admin/people/actions.ts` (transaction arity).
- Skimmed: the other 53 migrations (statement lines only; headers not re-read - audit 1 read them
  all and nothing in them changed); the 12 remaining `$transaction` bodies (arity only, all
  multi-statement); `scripts/qa/phase*-probe.mjs` (only what they INSERT/DELETE, for the residue
  SELECTs; the scripts lens owns them).
- Not read: `src/generated/prisma/**` (gitignored output); lab rooms' Prisma use beyond
  `_archive-state.ts` (confirmed alive, 3 call sites).
- Uncommitted edits seen: none in my territory. `git status --short` at the time of reading
  showed only this audit's own `docs/audit-fix/2026-09-03-refactor-audit-2/` as untracked.
  (`src/components/common/image-viewer.tsx` was modified at session start per the git snapshot;
  it is not in my territory and I did not open it.)

## Summary

This territory is in much better shape than most: audit 1's phase 6 landed cleanly (4 tables, 9
columns and 1 index gone; `place-write.ts`, `people-select.ts`, `keyset.ts` and the `omit`
on the profile page all exist), the three pinned tests match the schema exactly, every
`$transaction` is multi-statement, and I found **one** N+1 - and it is bounded to six and
already commented as the residue of a larger one. The structural well is not dry, but the wins
are in a different unit than lines: **queries per page view**. Every authenticated page pays a
floor of **7 queries before its own** (session read, unread count, two Catch-up advance reads,
two presence writes, one mail-drain precheck), and at least three of those are avoidable on the
common path; the feed then re-runs two of them itself; four routes fetch their row twice
(`generateMetadata` + page, the exact double-fetch TRAPS names `cache()` for); the Catch-up
home runs six one-row queries that one `DISTINCT ON` would replace. Honest totals: **~5 queries
off every authenticated page view, ~9 off a Catch-up home, ~20 off the admin People view.**

The schema-side findings are smaller and mostly owner calls: the removed Groups feature still
owns three columns, one index and one relation (`Post.groupId`, `Group.description`,
`Group.coverImage`); five columns are written and never read (`ContentView.firstAt`/`lastAt`,
`MetricSnapshot.capturedAt`, `OutboundEmail.bounceKind`, `Image.greyscale` - the last computed
by sharp on every feed upload for a Collection filter that reads a different table); and
eight indexes serve no query shape the code has today, one of them made redundant by the
Collection rework's own migration on 2026-08-28. The census found ten live objects Prisma
cannot see, where TRAPS says "two". Structural vs cheap: 12 structural, 5 cheap. What surprised
me: the newest code is the cleanest (the Collection river's cursor, the class-scoped index, the
EXIF columns are all read and all indexed on purpose); the debt is in the telemetry layer added
2026-08-19 in one sitting, which promised readers it never grew.

## The floor's questions, answered up front

**Columns nothing reads** (per model, grep that proves it; all `grep -rnwE <col> src --exclude-dir=generated`, tests excluded):

| Model.column | src refs | what they are | verdict |
|---|---|---|---|
| `ContentView.firstAt` | 0 | nothing; set by `@default(now())` only | dead (finding 03) |
| `ContentView.lastAt` | 1 (`content-view.ts:32`, the upsert's `update:`) | write only | placeholder (03) |
| `MetricSnapshot.capturedAt` | 0 in src; 1 in `scripts/ops/snapshot.mjs:326` (`DO UPDATE SET ... "capturedAt" = now()`) | write only | dead (03) |
| `OutboundEmail.bounceKind` | 1 (`api/resend/webhook/route.ts:114`, a write) | write only | placeholder (03) |
| `Image.greyscale` | 4 (`image.ts:178,219,314` compute+write; `image-record.ts:84` a comment saying it is deliberately not selected) | write only | placeholder in the wrong table (02) |
| `Group.description` | 2 writers (`auth/actions.ts:252`, `demo-seed/seed.ts:352`); 0 readers (no `description: true` select outside lab) | write only | Groups residue (01) |
| `Group.coverImage` | 0 writers, 0 readers; 1 comment (`account-purge.ts:100` explaining it is never purged because nothing writes it) | dead | Groups residue (01) |
| `Post.groupId` | forced `null` in 6 read filters; refused on write (`feed/actions.ts:206`); comment says "Verified live: zero rows carry a groupId" | always NULL | Groups residue (01) |

Everything else in the schema has a reader. Specifically for the charter's suspects: **LabRoomState** (3 sites, `lab/actions.ts`, `_archive-state.ts`) alive; **SearchLog** (8 + raw SQL) alive, `results` read at `admin-analytics.ts:457`; **MetricSnapshot** read by `loadTrends` (source, metric, day, value) - only `capturedAt` is not; **ContentView** written by `recordView`, read by 9 raw-SQL blocks in `admin-analytics.ts` (`count`, `kind`, `targetId`, `viewerId` are read; `firstAt`/`lastAt` are not); **Visit**: every remaining column is grouped or selected by `loadPresence`/`loadArrivals`/`loadUsageBreakdowns`/`loadFaces` (audit 1 already dropped the three nobody read); **QueueLease** alive (drain lock, 3 sites); **PendingImagePurge** alive (10 sites); **RosterEntry** alive (`roster.ts:52,63` read both indexes' columns); **LoginAttempt** alive (`reason`, `ok`, `email`, `userId`, `createdAt` all read in `loadJourney` and the audit page). **Photo's rework columns**: `takenKey` 27 refs, `scope` 259, `classYears` 20, `exifYear` 9, `exifMonth` 4, `sourceKey` 5 - all read. **Image**: `width`/`height`/`focalX`/`focalY`/`focalSet`/`blurDataUrl` all selected by `photoFactsFor` (`image-record.ts:94-106`); `greyscale` is the one exception.

**Indexes serving no query shape** (each with the read that would have to exist): finding 04
lists eight, with `Photo_approved_isHidden_createdAt_idx` the only certain one (a strict prefix
of `Photo_river_added_idx`, which the migration that added the latter says in its own comment).
The other seven need the `pg_stat_user_indexes` SELECT first - audit 1's phase 6 proved that
view changes decisions (`SearchLog_query_idx` 1 scan, dropped; `Comment_postId_isHidden_idx`
13 scans, kept).

**N+1s**: exactly one, `catchups/[catchupId]/(home)/page.tsx:324-338` - six `findFirst` in a
`Promise.all` over the newest six published Rounds, each fetching the most-loved entry body for
a teaser. Bounded to `TEASER_ROUNDS = 6` and commented as the remainder of a worse loop. Finding
06. Nothing else in `src/` awaits Prisma inside a loop except the engine loops that are
inherently per-row (`advanceEdition` per stale Round, `openNextRoundIfDue` per due Catch-up,
`promoteGroupSuccessor` per binned copy in the nightly sweep, one `pendingImagePurge.delete`
per R2 object deleted) - each issues zero queries when nothing is due.

**Pages by queries per render** (counted by hand from the page, its loaders, and the layouts
above it; the `(main)` layout floor is 7 - see finding 07 for the breakdown; `/admin/*` adds
`loadAdminCounts`' 8 from `admin/layout.tsx`):

| Route | own | layouts | total | notes |
|---|---|---|---|---|
| `/admin/analytics?view=content` | 24 | 15 | **39** | countMembers 1, loadTrends 1, loadContent 9, loadCatchups 4, loadReading 3, loadInteractions 6 |
| `/admin/analytics?view=people` | 18 | 15 | **33** | loadPeople alone is 12 counts/groupBys over `User` |
| `/admin` (index) | 13 | 15 | **28** | loadWorklist 7 + 2 counts + mailHealth 3 + aggregate 1 |
| `/admin/analytics?view=faces` / `health` | 10 | 15 | **25** | |
| `/catchups/[catchupId]` (home) | 15 | 7 | **22** | metadata 1 + loadHome 13 (incl. 6 teasers) + round view 1; more when a Round is due |
| `/admin/people/[id]` | 7 | 15 | 22 | |
| `/feed` | 7 (+3 via the first `loadPosts` action) | 7 | 14 (+3) | page re-runs the layout's unread count; `loadPosts` re-runs the page's cities read |
| `/directory` | 8 | 7 | 15 | the deliberate 7-leg fan-out + profession `$queryRaw`; pool max 5 |
| `/profile/[id]` | 8 | 7 | 15 | metadata 1 + row 1 + cities 1 + 3 counts + photos 1 + contacts rule 1 |
| `/catchups/[catchupId]/answer` | 7 | 7 | 14 | |

Audit 1's admin-analytics cut is **confirmed landed**: `ContentView` and `FacesView` call
`countMembers()` (`admin/analytics/page.tsx:308,491`) instead of `loadPeople()`'s 12, and
`RhythmsView` calls `loadUsageBreakdowns()` (3) rather than `loadPresence()` (7). The page is
tabbed by `?view=`, so one view renders per request; the 39 is a worst case, not a sum.

**Who bypasses `people-select`** (finding 11): six hand-typed avatar selects that are exact or
superset copies of `IDENTITY_SELECT`/`AUTHOR_CARD_SELECT` -
`catchups-round-view.ts:104-112` (an exact `AUTHOR_CARD_SELECT` clone in a file that already
imports `IDENTITY_SELECT`), `api/users/search/route.ts:65-70`, `welcome/page.tsx:31-36`,
`catchups/new/page.tsx:55`, `admin/people/[id]/page.tsx:35-43`,
`components/feed/rail/directory-module.tsx:31-39`. `auth.ts:325,413` is deliberate (the
session's own tight select); `pick-bird/page.tsx:50` is not a person shape.

**Who bypasses `keyset`** (finding 12): `admin-people-query.ts:57-97` sorts by exactly the key
`keyset.ts` was built for - `(createdAt desc, id desc)` - yet uses Prisma's `cursor: { id }`
plus a 25-line M39-style recovery block that the value cursor makes unnecessary.
`api/account/export/route.ts:58-64` pages its own rows by `id asc` through `cursor: { id }`.
`directory/actions.ts:59` and `directory/page.tsx:292` sort by name/batch and are the documented
exception in `keyset.ts`'s own header (not a bypass). `collection/actions.ts` has its own
`river-cursor.ts` on `takenKey` (a different key; correct).

**Migration pairs that reverse each other** (for the record only - the folder stays as-is per
audit 1 owner decision C):

| Earlier file | Later file | What reversed |
|---|---|---|
| `2026-08-19-presence-detail.sql` (adds `Visit.timezone/lat/lng`) | `2026-08-27-drop-visit-geolocation.sql` | three columns added, dropped 8 days later (data-minimisation decision, owner-approved) |
| `2026-08-19-presence-detail.sql` (creates `SearchLog_query_idx`) | `2026-08-27-drop-searchlog-query-index.sql` | index created, dropped (1 scan in 96 days) |
| `2026-08-11-auth-tokens.sql` (creates `OutboundEmail_status_priority_createdAt_idx`) | `2026-08-21-mail-backoff.sql` | index replaced by the wider `(status, nextAttemptAt, priority, createdAt)` drain index |
| `2026-08-28-collection-river.sql` (adds generated `takenKey` + `Photo_river_taken_idx`) | `2026-08-28-era-1940s-1950s.sql` | same day: column DROPped and re-ADDed with a wider CASE; the index goes and comes back. Replay order matters: on a fresh database the first file's `ADD COLUMN IF NOT EXISTS` is a no-op after the second has run, so the second file is the effective definition |
| `2026-08-28-profession-tags.sql` (column whose first pass wrote `studying`) | `2026-08-28-profession-student-rename.sql` | a stored value renamed hours later |
| `2026-07-30-lab-archive.sql` (`LabRoomState.updatedAt` as `timestamptz`) | `2026-08-03-demo-purge-and-drift.sql` | column type altered to `TIMESTAMP(3)` |

The four `2026-08-27-drop-*` files reverse CREATEs that predate the folder (the `db push` era),
so they have no in-folder pair. `2026-08-25-purge-synthetic-login-attempts.sql` reverses a QA
probe's writes, not a migration. No column is created, dropped and re-created except `takenKey`
(above, deliberate).

**The exact SELECTs a fix session must run before any drop** are in the section "The SELECTs"
at the end, keyed by finding.

## Findings

### data-layer-01 - Retire the Groups feature's schema residue: Post.groupId, its index, Group.description, Group.coverImage
- **Where**: `prisma/schema.prisma:470-476` (`Post.groupId` column and `group Group?` relation),
  `:496` (`@@index([groupId, createdAt])`), `:359-360` (`Group.description`, `Group.coverImage`),
  `:386` (`posts Post[]` back-relation); `src/app/(main)/feed/actions.ts:168` (reads `groupId`
  off the form), `:189-208` (the refusal branch and its 15-line comment), `:302`, `:1202`,
  `:1315` (`groupId: null` filters); `src/app/(main)/letters/(index)/page.tsx:60`,
  `src/app/(main)/profile/[id]/page.tsx:165`, `src/components/feed/rail/letters-module.tsx:36`
  (three more `groupId: null` filters); `src/lib/validators.ts:234` (`groupId: z.string().optional()`);
  `src/components/auth/actions.ts:252` (writes `description: "Everyone from the batch of ..."`);
  `src/lib/demo-seed/seed.ts:352` (writes `description`); `src/lib/account-purge.ts:100` (a
  comment explaining `coverImage` is skipped because nothing writes it).
- **Phase**: placeholder
- **Tier**: T3     **Class**: structural     **Decides**: owner (the column stays if Groups are coming back; the code is autonomous either way)
- **Evidence**: The feed action's own comment (`feed/actions.ts:189-203`): *"The Groups feature was
  removed: there is no /groups route, no composer passes a groupId, and every read path in this
  file forces `groupId: null` ... Verified live before writing this: zero rows in Post carry a
  groupId. ... the group-feed plumbing is gone from the read paths too, so `groupId: null` is now
  a plain filter rather than one arm of a branch."* Every `Post.create` in src is that one action
  (`feed/actions.ts:291`) plus the demo seed; the action refuses a groupId at `:206`. So the
  column is NULL on every row for ever, six read paths carry a filter that matches everything,
  and `Post_groupId_createdAt_idx` is a btree over a column of NULLs. `Group.description` has
  two writers and zero readers (`grep -rn "description: true" src` outside `lab/` finds nothing;
  the Catch-up home selects `group: { select: { id, name, members } }`). `Group.coverImage` has
  neither a writer nor a reader. `Group` itself stays: batch groups (`batchYear @unique`, B-121)
  and Catch-up rosters are live, and `creatorId`/`members` are read everywhere.
- **What to do**: Code first (deploy), then schema, then DDL to BOTH databases, in that order -
  the phase-6 gate applies (Prisma names every column in its SELECT; a dropped column under a
  live old build is an outage). (1) Delete the six `groupId: null` lines and the `groupId` line
  in `validators.ts:234` and `feed/actions.ts:168`; keep the refusal branch's *intent* but it
  loses its input, so delete `:189-208` too. (2) Delete `description:` at `auth/actions.ts:252`
  and `seed.ts:352`. (3) Schema: remove `Post.groupId`, `Post.group`, the `@@index([groupId,
  createdAt])`, `Group.posts`, `Group.description`, `Group.coverImage`; `npx prisma generate`;
  `npm run check`. (4) One dated idempotent file: `ALTER TABLE "Post" DROP COLUMN IF EXISTS
  "groupId"; DROP INDEX IF EXISTS "Post_groupId_createdAt_idx"; ALTER TABLE "Group" DROP COLUMN
  IF EXISTS "description"; ALTER TABLE "Group" DROP COLUMN IF EXISTS "coverImage";` with a
  refuse-if-not-empty `DO $$` block for `groupId` like `2026-08-27-drop-group-invite.sql`.
  `cascade-rule.test.mjs` walks Cascade edges out of `User`; `Post.group` is a Post -> Group
  edge and is not on that walk, so it stays green (re-run it anyway).
- **Saving**: 3 columns, 1 index, 1 relation pair in the live DB (both databases); ~35 lines of
  code and schema; six filters that can no longer drift.
- **Risk & gate**: medium (destructive DDL on the shared DB). Gates: SELECT B in "The SELECTs"
  (must return `group_posts = 0`); `npm run check`; `npm run verify:crawl`; open `/feed`,
  `/letters`, a profile's Posts tab; `cascade-rule.test.mjs`, `index-coverage.test.mjs`
  (neither names these). The demo DB gets the same file with `--env .env.demo`.
- **Confidence**: high that it is dead today; the owner decides whether Groups return. If they
  do, `Post.groupId` comes back as one migration and the filters as six lines - cheaper than
  carrying a phantom feature through every future audit.
- **Notes**: Audit 1 dropped `GroupInvite` and `Group.visibility` and stopped there; the
  `Post.groupId` half was hidden behind a comment that reads as a security fix. The `Group_...`
  batch-year unique and the Catch-up roster path are untouched by this. `Group.description`'s
  only value is a generated sentence ("Everyone from the batch of 2010."), so SELECT B's
  `with_description` count is expected to equal the number of batch groups; that is not a reason
  to keep it.

### data-layer-02 - Image.greyscale is computed on every feed upload for a Collection filter that reads a different table
- **Where**: `prisma/schema.prisma:225-228` (the column and its four-line comment citing spec
  §7.4); `src/lib/image.ts:178,219-240,314` (`isGreyscale` measured from the probe buffer inside
  `photoFacts`); `src/lib/image-record.ts:39` (`upsert` writes it), `:84-86` (*"`greyscale` is
  deliberately not selected. It is a filter for the Collection (spec §7.4)"*);
  `prisma/migrations-manual/2026-08-27-image-dimensions.sql:35`;
  `scripts/dev/backfill-image-dimensions.mjs:108-114`.
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: owner (spec §7.4 promises the filter; the question is where it should live)
- **Evidence**: `Image` is keyed by URL and written by exactly two callers, `api/upload/route.ts`
  and `api/upload/finalize/route.ts` - the FEED's upload path (`grep -rn image-record src`).
  `collection/actions.ts` and `collection-photo.ts` never call `recordImage` or `photoFacts`
  (grep: no hits). So every `Image.greyscale` value describes a feed, letter or Catch-up
  photograph, and the Collection - whose rows are `Photo`, which has its own `width`/`height` and
  no `greyscale` - can never read it. The column is written on every upload (a pixel loop over
  the sharp probe buffer at `image.ts:314`), read by nothing, and the filter it exists for
  would have to be a column on `Photo`. `docs/planning/collection-rework/spec.md:363-365` ("7.4
  Black and white, for free ... Detected at upload with sharp (the `greyscale` column in §2) and
  offered as a filter") is the promise; §2 of that spec put the column on the URL-keyed table,
  and the Collection kept `Photo`.
- **What to do**: Owner picks one: (a) **drop it** now - remove the field from the schema, the
  `greyscale:` line from `image.ts:314` and the `isGreyscale` function (`:219-240`), the
  `greyscale` column from the backfill script's INSERT, `npx prisma generate`, dated `ALTER TABLE
  "Image" DROP COLUMN IF EXISTS "greyscale"` to both DBs; or (b) **move it** to `Photo` the day the
  filter is built (a new column on `Photo`, computed in `contributePhotoDirect`'s encode chain -
  TRAPS warns that chain is not `toDisplayWebp`). Recommendation: (a); (b) is a one-column
  migration later and the measurement code is 20 lines to bring back from git.
- **Saving**: 1 column; ~25 lines (`isGreyscale` + its comment + the write); one pixel pass per
  feed upload.
- **Risk & gate**: low. `npm run check`; upload one feed image and one Collection photograph on
  localhost; `image-purge-rule.test.mjs` (names `pendingImagePurge`, not `Image` columns - verify
  by grep at fix time).
- **Confidence**: high on the mechanism (two writers, zero readers, wrong table); medium on the
  recommendation - if the owner wants the B&W filter this quarter, (b) is the answer.
- **Notes**: SELECT C reports how many `Image` rows are flagged greyscale, purely for the
  record. The schema comment for the column is good writing about a thing that cannot work;
  keep the sentence about sepia reading as colour with the measurement code if (b) is chosen.

### data-layer-03 - Four telemetry columns and one index nothing reads: ContentView.firstAt/lastAt (+ its index), MetricSnapshot.capturedAt, OutboundEmail.bounceKind
- **Where**: `prisma/schema.prisma:1240-1242` (`ContentView.count/firstAt/lastAt`), `:1250`
  (`@@index([viewerId, lastAt])`), `:1182` (`MetricSnapshot.capturedAt`), `:589-594`
  (`OutboundEmail.bouncedAt/bounceKind`); `src/lib/content-view.ts:29-33`;
  `scripts/ops/snapshot.mjs:322-326`; `src/app/api/resend/webhook/route.ts:110-118`;
  `src/lib/admin-analytics.ts:256-258` (counts `deliveredAt`/`bouncedAt`/`complainedAt` NOT NULL
  - never `bounceKind`).
- **Phase**: placeholder (firstAt/lastAt, bounceKind) / dead (capturedAt)
- **Tier**: T2     **Class**: structural     **Decides**: owner for the analytics pair (they are members' data and a feature promise); autonomous for `capturedAt`
- **Evidence**: Column census table above. `firstAt`: zero references in src or scripts - it is
  set by the default and never selected, never in raw SQL (`grep -rn '"firstAt"' src scripts`:
  0). `lastAt`: one reference, the upsert's `update: { lastAt: new Date() }`; the schema comment
  promises *"firstAt/lastAt keep what the counter would otherwise lose: whether an interest is
  old or current"* and no panel draws that - `loadFaces` sums `count` by `targetId`/`viewerId`,
  `loadReading` sums `count` by kind. `ContentView_viewerId_lastAt_idx` ("What has this person
  been looking at, and recency") has no query: every ContentView read filters on `kind` (served
  by `(kind, targetId)`) or scans. `MetricSnapshot.capturedAt`: written by the nightly upsert's
  `DO UPDATE SET ... "capturedAt" = now()`, never read (`loadTrends` selects day/source/metric/
  value). `bounceKind`: written by the webhook from Resend's `bounce.type`, never read; the
  schema says *"the two deserve different handling and that decision is not made here"* -
  and it has not been made anywhere since 2026-08-19.
- **What to do**: (1) `capturedAt`: remove the field and the `"capturedAt" = now()` clause in
  `snapshot.mjs:326`; dated `DROP COLUMN IF EXISTS`. Autonomous. (2) `firstAt`/`lastAt` and the
  index: owner chooses keep-for-a-panel or drop. If drop: remove both fields, the `@@index`, the
  `lastAt:` write at `content-view.ts:32`; dated DDL. If keep: nothing to do but the index should
  still go unless SELECT A shows scans. (3) `bounceKind`: owner chooses; if the hard/soft
  distinction is wanted, `loadMail` is where it would be read; if not, drop with the webhook
  write at `route.ts:114-117`. Order for every drop: code, deploy, schema, DDL, both DBs.
- **Saving**: up to 4 columns + 1 index; ~12 lines; one fewer index to maintain on a
  per-view upsert path (ContentView is written on every profile/letter/photo/Round view).
- **Risk & gate**: low-medium (DDL on shared DB). SELECT A (index scans) and SELECT C (row
  counts, and how many ContentView rows have `lastAt <> firstAt`, which is the only information
  the pair carries) first; `npm run check`; open `/admin/analytics?view=faces` and
  `?view=health` after.
- **Confidence**: high on every "never read"; medium on the recommendation for the analytics
  pair - a "recently looked at" panel is a plausible thing to build and the columns cost almost
  nothing to keep. The index is the part that costs on every write.
- **Notes**: The pattern here is the one to watch across this territory: the 2026-08-19
  analytics sitting added ten tables' worth of columns with their readers promised in comments.
  Most were built. These were not.

### data-layer-04 - Eight indexes no current query shape can use; one is certainly redundant
- **Where**: `prisma/schema.prisma` - `Photo @@index([approved, isHidden, createdAt])` (`:311`),
  `Photo @@index([era])` (`:312`), `Photo_river_era_idx` (`:321`), `LoginAttempt @@index([email,
  createdAt])` and `@@index([userId, createdAt])` (`:1287-1288`), `AuditLog @@index([actorId,
  createdAt])` and `@@index([targetId])` (`:687-688`), `ContentView @@index([viewerId, lastAt])`
  (in 03), `Post @@index([groupId, createdAt])` (in 01); live: the same names, plus
  `prisma/migrations-manual/2026-08-28-collection-river.sql:128-137` (which created the river
  indexes and says the older one "stops one column short").
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous after SELECT A; the one certain drop needs no vote
- **Evidence**, index by index:
  - `Photo_approved_isHidden_createdAt_idx`: a strict prefix of `Photo_river_added_idx
    (approved, isHidden, createdAt DESC, id DESC)`. Postgres walks a DESC btree backwards for
    ASC and uses any leading prefix, so every predicate and order the old one served, the new one
    serves. The migration comment (`collection-river.sql:131-132`) records exactly this and left
    the old one in place. **Certain.**
  - `Photo_era_idx` (bare `era`): no `where` in src filters `era` alone since the 2026-08-29
    rework made the decade rail "a seek rather than a filter" (`collection/actions.ts:911-935`).
    `buildCollectionWhere` (`:731-757`) filters scope/approved/isHidden/subject-contains/
    search-contains only; `grep -rnE 'era:\s*\{' src` finds no filter.
  - `Photo_river_era_idx (approved, isHidden, era)`: created for "the decade rail counts every
    decade in one grouped query"; the rail now groups `by: ["photoYear", "era"]` (`:936-939`),
    which this index cannot pre-group, and its `where` prefix is already served by
    `Photo_river_added_idx`. Likely dead; SELECT A decides.
  - `LoginAttempt_userId_createdAt_idx`: `userId` appears only in `loadJourney`'s
    `LEFT JOIN "User" u ON u.id = l."userId"` (`admin-analytics.ts:1122-1130`) - a join keyed on
    `User.id`, not a filter on this column. No `where userId` anywhere.
  - `LoginAttempt_email_createdAt_idx`: `email` is only ever `GROUP BY l.email` in the same raw
    query (a hash aggregate) - no filter, no range, no order.
  - `AuditLog_actorId_createdAt_idx` and `AuditLog_targetId_idx`: the two readers are
    `admin/audit/page.tsx:51` (`orderBy createdAt desc, take 100`, then resolves ids in code) and
    the Razorpay webhook's `findFirst({ where: { action, createdAt: { gt } } })` (`:49-55`,
    served by `(action, createdAt)`). Nothing filters on `actorId` or `targetId`. Audit 1's "all
    four reads named in the schema" is not what the schema says today: the AuditLog block has no
    per-index comments.
  - The two in findings 01 and 03 as stated there.
- **What to do**: (1) Run SELECT A and note `stats_reset` - a window shorter than a month is not
  evidence. (2) Drop `Photo_approved_isHidden_createdAt_idx` regardless (it is provably
  dominated). (3) For the rest, drop those with `idx_scan` near zero over a real window; keep any
  the planner is actually choosing (on tables this small it may pick a tiny index over a tiny seq
  scan, which the census warned means nothing - but a real reader would show as hundreds of
  scans on the admin routes). (4) Remove the matching `@@index` lines, `npx prisma generate`,
  one dated `DROP INDEX IF EXISTS` file, both DBs. `index-coverage.test.mjs` pins none of these
  eight (its REQUIRED list is the ten B-090 child-side keys; verified by name).
- **Saving**: up to 8 DB objects (both DBs); ~8 schema lines; write amplification off
  `LoginAttempt` (every sign-in), `AuditLog` (every sign-in and admin action), `ContentView`
  (every view) and `Photo` (every contribution and approval).
- **Risk & gate**: low - an index can only cost speed, never correctness. Gate: SELECT A before;
  `npm run check`; after, open `/collection` in both orders and press a year, open
  `/admin/audit` and `/admin/analytics?view=journey`.
- **Confidence**: high for the Photo prefix; medium for the other seven (the one thing that
  changes my mind is `idx_scan` in the hundreds with a plausible planner reason).
- **Notes**: Not re-litigated: `Comment_postId_isHidden_idx` (kept 2026-08-27 on 13 scans),
  `SearchLog_createdAt_idx` beside `(scope, createdAt)` (B-093), `UserPlace_userId_idx` beside
  its unique, `User_email_key` beside `User_email_lower_key`. A related performance note that is
  not bloat: the bucket filter is `subject: { contains: "people" }` on a comma-joined column
  (`:741`), and the trigram set covers `caption`/`area`/`freeTags`, not `subject` - at twenty
  thousand photographs every bucket press is a scan under the (approved, isHidden) prefix. The
  right instrument is the one `professionTags` already uses (a `text[]` with a GIN and `has`),
  which is the Collection lens's call; noted under "For other lenses".

### data-layer-05 - The schema is not the whole truth about the live database in ten places, and TRAPS says "two"
- **Where**: `docs/TRAPS.md:33-35` (*"Two expression indexes exist that Prisma cannot see"*);
  `prisma/schema.prisma:158` (User has one `@@index`, the GIN); the live objects:
  `User_email_lower_key` (`2026-08-21-email-canonical.sql:39`), `Place_asciiName_idx` and
  `Place_name_idx` as `lower()` expressions (`2026-07-18-round6.sql:30-31`),
  `UserPlace_city_idx` as `lower(city)` (`:48`), `Place_altNames_trgm_idx`
  (`2026-08-21-gazetteer-trigram.sql:27`), `Photo_caption_trgm_idx`, `Photo_area_trgm_idx`,
  `Photo_freeTags_trgm_idx`, `User_name_trgm_idx` (`2026-08-28-collection-river.sql:162-174`),
  `Report_open_post_per_reporter_key` (`2026-08-25-report-one-open-per-post.sql:53`), and
  **`User_lastSeenAt_idx`** (`2026-08-19-analytics.sql:22`) - a plain btree Prisma CAN express
  and the schema never received.
- **Phase**: hygiene (documentation that is a trap) + one real schema line
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -n "lower\|trgm\|partial\|cannot see\|CANNOT SEE" prisma/schema.prisma`
  finds the Place note (`:774-781`), the UserPlace note (`:812-813`), and the Report note
  (`:660-667`). Nothing in the schema mentions `User_email_lower_key`, the four Collection
  trigram indexes, `User_name_trgm_idx` or `User_lastSeenAt_idx`. `User_lastSeenAt_idx` serves
  three real reads (`admin-analytics.ts:94-95` two range counts; `loadFaces` `lastSeenAt IS NOT
  NULL`), so it should be in the schema as `@@index([lastSeenAt])` on User; today a `migrate
  diff` would offer to DROP it, and a session that trusts the schema would think the two admin
  counts are unindexed. The trigram quartet is load-bearing for `contains` searches on
  `/collection` (`:745-749`), `/directory` (`where.ts:75`), `/feed` (`feed/actions.ts:1181`),
  `api/users/search` (`route.ts:45`) and `admin-people.ts:99` - all five are `name ILIKE '%x%'`
  shapes a GIN trigram serves and nothing else can.
- **What to do**: (1) Add `@@index([lastSeenAt])` to `User` with a two-line comment naming the
  three reads; `npx prisma generate` (no DDL: the index already exists on both DBs - verify
  with SELECT E). (2) Rewrite the TRAPS paragraph to say "these objects exist only in SQL" and
  list them by name and migration file, or point at one authoritative list in the schema header;
  ten names, one place. (3) Add a one-line pointer in the `Photo` model to the three trigram
  indexes and in `User` to `User_name_trgm_idx` and `User_email_lower_key`, so the next reader of
  `Photo` does not "fix" a search that looks unindexed.
- **Saving**: 0 lines (adds ~12); prevents the exact class of mistake TRAPS was written for.
- **Risk & gate**: none. `npm run check`; `index-coverage.test.mjs` still asserts the trigram
  migration and the ILIKE on `altNames`.
- **Confidence**: high. SELECT E confirms the live list.
- **Notes**: This is the census that audit 1 did not have a live dump for since 2026-08-22; the
  next audit will need a fresh `pg_indexes` dump on disk, which the fix session can save beside
  the audit-1 one (`docs/audit-fix/2026-08-22-bug-audit-2/work/db-indexes-live.json`) - not in my
  power read-only.

### data-layer-06 - The Catch-up home's six teaser queries are one DISTINCT ON
- **Where**: `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:311-338` (`TEASER_ROUNDS = 6`,
  the `Promise.all(teasered.map(async (ed) => prisma.catchupEntry.findFirst({...})))`).
- **Phase**: rewrite (one query shape)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Six `findFirst` per render, each `where: { editionId, body: { not: null } },
  orderBy: [{ loves: { _count: "desc" } }, { id: "asc" }], select: { body }`. Prisma compiles the
  relation-count order into a correlated subquery, so this is six correlated one-row queries in
  parallel on a `max: 5` pool - i.e. two waves. The file's own comment says the block *"exists
  to have removed"* the N+1 over every Round; it capped it at six rather than removing it. The
  page already runs a `groupBy(["editionId","authorId"])` over the same edition ids (`:302-306`),
  so the shape of "one aggregate over the shelf" is right there.
- **What to do**: Replace the block with one raw query (Prisma has no `DISTINCT ON`):
  ```sql
  SELECT DISTINCT ON (e."editionId") e."editionId", e.body
  FROM "CatchupEntry" e
  LEFT JOIN "CatchupEntryLove" l ON l."entryId" = e.id
  WHERE e."editionId" = ANY(${ids}) AND e.body IS NOT NULL
  GROUP BY e.id
  ORDER BY e."editionId", count(l.id) DESC, e.id ASC
  ```
  via `prisma.$queryRaw` with `Prisma.sql`, then the same 140-char trim. Keep the tiebreak
  comment. `CatchupEntry_editionId_idx` and `CatchupEntryLove_entryId_idx` serve it.
- **Saving**: 5 queries per Catch-up home render (6 -> 1); ~10 lines.
- **Risk & gate**: low. `npm run check`; open a Catch-up home with 2+ published Rounds and
  compare the teasers before/after; `catchup-lifecycle.test.mjs` untouched (it sweeps for
  swallowed errors, not this).
- **Confidence**: high.
- **Notes**: `notice/[id]/page.tsx:82-115` runs a `$transaction` with `FOR UPDATE` inside a
  page render - a write during GET. I read the 40-line justification (M46/C-115); it is
  deliberate and the alternative (a partial unique) was declined for a stated reason. Not a
  finding; recorded so nobody re-opens it.

### data-layer-07 - Every authenticated page view pays 7 queries before its own; three are avoidable on the common path
- **Where**: `src/app/(main)/layout.tsx:23,56-78,95-101` (the layout's `Promise.all` and the
  `after()` drain); `src/lib/auth.ts:311-331` (session callback `user.findUnique`);
  `src/lib/last-seen.ts:60-73,226-236` (`visit.updateMany` + `user.updateMany`);
  `src/lib/catchups.ts:391-413` (`advanceDueCatchups`' two `findMany`);
  `src/lib/email-queue.ts:727-737` (drain precheck `count`).
- **Phase**: architecture (queries per load)
- **Tier**: T3     **Class**: structural     **Decides**: autonomous for (a); autonomous with the catchups tests for (b); (c) is a not-finding
- **Evidence**: The floor, per authenticated render: (1) `auth()` -> session callback
  `user.findUnique` (revocation check; `cache()`d per request); (2) `notification.count`; (3)
  `advanceDueCatchups`: `catchupEdition.findMany` with a `group.members.some` join **and** (4)
  `catchup.findMany` with the same join; (5) `visit.updateMany`; (6) `user.updateMany ... WHERE
  lastSeenAt IS NULL OR lastSeenAt < now - 15min`; (7) in `after()`, `outboundEmail.count` (the
  C-104 precheck; returns when 0). Seven, nine on a fresh visit (`visit.count` + `visit.create`),
  eight or nine for an unconfirmed member (`verificationMailState` findFirst + `verifySendingAt`
  count).
  (a) **(6) is a no-op UPDATE fourteen minutes in every fifteen** - the WHERE makes it write
  nothing, but it is still a round trip and a row lock attempt on `User` on every page view for
  every member. The session callback at (1) has already read this member's row in this same
  request; it selects twelve columns and not `lastSeenAt`.
  (b) **(3)+(4) are two joins to answer "is anything due for this member"**, and for a member in
  no Catch-up - the majority - both return nothing. They are the engine's spec-2.4 read-time
  advance and must stay *somewhere* on every view (the cron at `vercel.json` `/api/catchups/tick`
  02:00 exists, but `CRON_SECRET` is still owed by the owner per memory, so the piggyback is
  the only proven engine). They can be one query: `catchup.findMany({ where: { status:
  "active", group: { members: { some: { userId } } }, OR: [{ nextOpensAt: { lte: now } },
  { editions: { some: { status: { in: ["collecting","answering","preparing"] } } } }] },
  include: { group: {...}, editions: { where: { status: { in: [...] } } ... } } })` and then the
  same two loops over the result.
  (c) **(7) is already the cheapest it can be** (audit C-104 took it from nine statements to
  one) and (2) is what the bell needs. Not findings.
- **What to do**: (a) Add `lastSeenAt: true` to the session select at `auth.ts:317-329`, expose
  it on `session.user` (`next-auth.d.ts`), and in `touchLastSeen` skip the `user.updateMany`
  when `session.user.lastSeenAt` is within `LAST_SEEN_STALE_MS` - pass it in from the layout
  rather than re-reading. Saves 1 query on ~93% of views. (b) Collapse `advanceDueCatchups`'
  two reads into the one above; `advanceEdition` and `openNextRoundIfDue` keep their inputs
  (`ed.catchup.cadence/status/group` come from the parent row now, `latest` is
  `editions[0]` ordered `number desc` - fetch both the stale set and the latest in the include,
  or take the latest separately only when `nextOpensAt <= now`, which is rare). Saves 1 query on
  every view; the catchups territory agent should co-sign the shape.
- **Saving**: 2 queries per authenticated page view, on every route (with 06, 08 and 09: ~5 on
  most pages, ~9 on a Catch-up home).
- **Risk & gate**: (a) low-medium - it touches `auth.ts`'s select, which `security-regressions.test.mjs`
  pins for the revocation fields (adding a field does not remove one; grep the pin for the
  select shape at fix time); gate `npm run check`, sign in, load two pages 16 minutes apart and
  confirm `lastSeenAt` moved once. (b) medium - the engine; gate `catchup-lifecycle.test.mjs`,
  `catchups*.test.mjs`, and driving a Round through collecting -> answering -> published on
  localhost with Jerry.
- **Confidence**: high for (a); medium for (b) (the one thing that changes my mind is a
  freshness subtlety the engine depends on - `advanceEdition` re-checks status itself, so it
  should not).
- **Notes**: The layout comment (`:38-56`) already argues why the advance is awaited rather than
  `after()`ed; nothing here changes that. `touchLastSeen`'s presence write (5) is deliberately
  per-view ("Visit is NOT throttled") and stays. I did not count PostHog or Sentry - they are
  not database queries.

### data-layer-08 - Four routes fetch their row twice: generateMetadata and the page, with no cache()
- **Where**: `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:47-63` (metadata
  `catchup.findUnique`) vs `:87-119` (`loadHome`'s `catchup.findUnique`);
  `src/app/(main)/profile/[id]/page.tsx:26-50` vs `:120-123`;
  `src/app/(main)/letters/[id]/(read)/page.tsx:20-48` (metadata: `post.findUnique` + `canViewPost`,
  itself a fetch) vs `:59-75`; `src/app/(main)/collection/[id]/page.tsx:35-60` (metadata:
  `photo.findUnique` + `user.findUnique`) vs the page body.
- **Phase**: dedupe (query)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -n 'cache(' ` on the four files: none. TRAPS (`docs/TRAPS.md:66-68`):
  *"`cache()` from React is the tool for the `generateMetadata` + page double-fetch. Key it on
  STRINGS."* Next renders `generateMetadata` and the page in the same request; the metadata's
  select is a subset of the page's in every case (profile: name/isBlocked/deletionRequestedAt
  vs the whole row; catchup: title+group.name vs the home include; letter: title/content/kind
  vs the full include; photo: seven columns vs the viewer's read). Each route pays one extra
  round trip per view (letters and collection pay two, because the metadata also re-runs the
  visibility rule's own fetch).
- **What to do**: Per route, one `const loadX = cache(async (id: string, viewerId: string) =>
  prisma.x.findUnique({ ...the page's select }))` at module scope, called by both. Keyed on the
  string ids, never on the session object (TRAPS: `auth()` returns a fresh object per call). For
  letters and collection, have the metadata call the cached loader and derive the title from the
  same row the page renders, then apply the same rule function once.
- **Saving**: 1 query per view on `/catchups/[id]` and `/profile/[id]`; 2 per view on
  `/letters/[id]` and `/collection/[id]`; ~15 lines net removed (the metadata selects go).
- **Risk & gate**: low. `npm run check`; open each route and read the tab title; the letters
  M31 pin (the metadata must apply `canViewPost`) stays satisfied because the rule still runs -
  confirm `security-regressions.test.mjs` does not grep for the current metadata shape.
- **Confidence**: high.
- **Notes**: The profile's metadata guards Stage 1 names before fetching; keep that branch in
  front of the cached call.

### data-layer-09 - The feed page re-runs two of the layout's reads
- **Where**: `src/app/(main)/feed/page.tsx:39-55` (`notification.count({ userId, read: false })`,
  `userPlace.findMany({ userId, orderBy position, select city })`, `user.findUnique({ select:
  feedSeenAt })`); `src/app/(main)/layout.tsx:56-61` (the identical unread count);
  `src/lib/city-scope.ts:6-12` (`getViewerCities`: the identical `userPlace.findMany`), called
  from `loadPosts` (`feed/actions.ts`) on the first page action.
- **Phase**: dedupe (query)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The layout already computes `unreadCount` for the bell and passes it to
  `AppShell`; the feed page computes the same count again in the same request for the same
  member (what it does with it is the feed territory's business; the query is a duplicate
  either way). The page's `userPlaces` select and `getViewerCities` are the same query minus
  an `orderBy`; `loadPosts` calls `getViewerCities` again when the client asks for the first
  page (`post-feed.tsx:99`). And `feedSeenAt` is one more single-column read of the row the
  session callback already holds.
- **What to do**: (1) Drop the page's `notification.count`; read the count where the layout
  already has it, or move the bell count into a `cache()`d helper both call. (2) Make
  `getViewerCities` a `cache()`d function keyed on `userId` and use it in the page too (the
  `orderBy position` is harmless to add to the shared one; the feed reads cities as a set).
  (3) Fold `feedSeenAt` into the session select the way 07(a) folds `lastSeenAt`, or leave it -
  it is one indexed PK read.
- **Saving**: 1-2 queries per `/feed` render, plus 1 on the first `loadPosts` action.
- **Risk & gate**: low. `npm run check`; open `/feed`, confirm the bell count and the "New since
  you were last here" divider.
- **Confidence**: high on the duplicate count and the cities pair; the feed territory agent
  owns whether the page needs its own count for a reason I did not see (I read only the data
  half).

### data-layer-10 - admin-people-query re-implements keyset with Prisma's cursor and a 25-line recovery block keyset.ts made unnecessary
- **Where**: `src/lib/admin-people-query.ts:50-97` (`orderBy = [{ createdAt: "desc" }, { id:
  "desc" }]`, `cursor: { id }, skip: 1`, and the `if (cursor && found.length === 0)` recovery
  with its `findFirst` + offset fallback); `src/app/api/account/export/route.ts:46-64` (the
  `paged` generator and `keyset()` helper on `id asc` via `cursor: { id }`).
- **Phase**: dedupe / library (the repo's own)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `keyset.ts`'s header is the proof that `cursor: { id }` answers nothing when the
  cursor row leaves the set, and its `keysetWhere(after, "desc")` is exactly the `(createdAt,
  id)` comparison this file sorts by. The file's own comment (`:43-45`) says it follows
  `loadPosts` - which uses `keysetWhere` - and then does not. The recovery block (`:73-97`,
  audit Low 12) exists only because of the Prisma cursor's failure mode. The export pages by
  `id asc`, where the value form is `where: { ...where, id: { gt: after } }` - no library
  needed, and a row deleted mid-export (the member's own, during their own export) no longer
  truncates the file.
- **What to do**: `admin-people-query.ts`: `import { decodeKeyset, encodeKeyset, keysetWhere }`;
  encode the cursor from the last row (`createdAt`, `id` are in `ROW_SELECT` - confirm), decode
  on entry, `where: after ? { AND: [where, keysetWhere(after, "desc")] } : where`; delete the
  recovery block and the `loaded` parameter (and its caller's argument in the admin people
  page). Export: replace `cursor/skip` with `id: { gt: after }` in the `where` each `fetchPage`
  passes (the generator already carries `after`).
- **Saving**: ~25 lines; 1 fewer query on the last page of an admin scroll; two files that no
  longer carry a documented bug.
- **Risk & gate**: low. `npm run check`; `/admin/people` "Show more" through two pages; run the
  export once as Jerry and diff the row count against a `SELECT count(*)` for that user.
- **Confidence**: high.
- **Notes**: The directory's two cursor sites stay (documented exception; it sorts by name/batch
  and has no timestamp key). The Collection's `river-cursor.ts` is its own keyset on `takenKey`
  and is correct.

### data-layer-11 - Six hand-typed avatar selects bypass people-select; one is an exact AUTHOR_CARD clone in a file that already imports the module
- **Where**: `src/lib/catchups-round-view.ts:104-112` (imports `IDENTITY_SELECT`? no - it imports
  `photoFactsFor`; the seven-field block equals `AUTHOR_CARD_SELECT` byte for byte);
  `src/app/api/users/search/route.ts:65-70` (`IDENTITY_SELECT` + `batchYear`);
  `src/app/(main)/welcome/page.tsx:31-36` (`IDENTITY_SELECT` + `accountType` + profile fields);
  `src/app/(main)/catchups/new/page.tsx:55` (`IDENTITY_SELECT` minus `id`, plus `batchYear`);
  `src/app/(main)/admin/people/[id]/page.tsx:35-43` (`AUTHOR_CARD_SELECT` + admin fields);
  `src/components/feed/rail/directory-module.tsx:31-39` (`IDENTITY_SELECT` + `accountType`,
  `batchYear`, `currentCity`).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -rn 'birdOverride: true' src` minus `people-select.ts` and `auth.ts`: the
  six above. `people-select.ts`'s header says the rule: *"Anything else spreads one of them and
  adds what it needs, so the addition is visible in the diff."* Fourteen files already do.
- **What to do**: Replace each block with `{ ...IDENTITY_SELECT, <extras> }` or
  `{ ...AUTHOR_CARD_SELECT, <extras> }`; `catchups/new` keeps its `id`-less shape only if
  something depends on `id` being absent (nothing does - it reads `viewer.batchYear/name/
  photoUrl/birdOverride`; spreading `IDENTITY_SELECT` adds `id`, harmless).
- **Saving**: 0 lines (line-for-line); 6 fewer places the avatar shape can drift; the
  `catchups-round-view` one is the exact drift the module exists to prevent.
- **Risk & gate**: low. `npm run check` (tsc proves every renderer still gets its fields);
  `npm run visual`.
- **Confidence**: high.

### data-layer-12 - Fold the admin count fan-outs into FILTER aggregates
- **Where**: `src/lib/admin-analytics.ts:87-116` (`loadPeople`: 8 `user.count` with different
  predicates + 2 `user.groupBy` + 1 `userPlace.findMany distinct` + 1 more count = 12 queries);
  `:253-259` (`loadMail`: 5 `outboundEmail.count` + 1 groupBy); `:179-187` (`loadContent`: 3
  `post.count` + 4 table counts + 1 groupBy); `src/lib/admin.ts:199-260` (`loadAdminCounts`:
  `user.count()` + 7 counts, two of them `user.count` by `verifyState`, on EVERY `/admin/*`
  render via `admin/layout.tsx:30`); `src/app/(main)/profile/[id]/page.tsx:180-184` (two
  `post.count` by `kind`).
- **Phase**: rewrite (query shape)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The same file already knows the right instrument: `loadJourney`
  (`:1067-1086`) is ONE `$queryRaw` with six `count(*) FILTER (WHERE ...)` columns over `User`.
  `loadPeople`'s eight `user.count`s are eight sequential-scan-or-index-scan passes over the
  same 63 (soon 2,000) rows, run in parallel on a `max: 5` pool - three waves for one row of
  numbers. `loadAdminCounts`' two `verifyState` counts are one `groupBy(["verifyState"])`; the
  profile's two `kind` counts are one `groupBy(["kind"])` (audit 1 noted this and declined; it
  is worth one line now that the pattern is being fixed elsewhere).
- **What to do**: `loadPeople`: one raw `SELECT count(*) AS total, count(*) FILTER (WHERE
  "emailVerified" IS NOT NULL) AS confirmed, ... FROM "User"` for the eight predicates, keep the
  two groupBys and the distinct. `loadMail`: one raw with five FILTERs, keep the groupBy.
  `loadContent`: one raw over `Post` with three FILTERs; the four table counts stay (different
  tables). `loadAdminCounts`: replace the two `verifyState` counts with one groupBy. Profile:
  one `post.groupBy({ by: ["kind"], where: visiblePostsWhere, _count: { _all: true } })`.
- **Saving**: ~7 queries off `?view=people`, 4 off `?view=health`, 2 off `?view=content`, 1 off
  every `/admin/*` render, 1 off every profile view. ~0 lines (raw SQL is about as long).
- **Risk & gate**: low - admin-only except the profile. `npm run check`; open each analytics view
  and the profile and compare the numbers to before (they are exact counts, easy to diff).
- **Confidence**: high.
- **Notes**: Audit 1's admin-analytics-03 cut the cross-view waste; this is the within-loader
  waste it did not name. The `Promise.all` comment at `directory/page.tsx:248-252` argues for a
  fan-out because the reads are *different* questions; these are the same question asked eight
  ways.

### data-layer-13 - The demo seed writes the Collection's dead bucket vocabulary on every reset
- **Where**: `src/lib/demo-seed/content.ts:702,720,739,756,773,790` (`subject:
  "assembly-dining,campus"`, `"banyan,flora"`, `"banyan,campus"`, `"assembly-dining,landscape"`,
  `"banyan,weather-sky"`, `"buildings,historical"`); `src/lib/collection.ts:40-70` (the six
  buckets: people, birds, nature, campus, school-life, other), `:84` (`LEGACY_BUCKETS` mapping
  the old fourteen on read); `prisma/migrations-manual/2026-08-28-collection-river.sql:28-60`
  (the one-time UPDATE that remapped stored values).
- **Phase**: hygiene (seed vs schema)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: The column keeps its name and `bucketsOf()` maps legacy values on read, so the
  demo renders correctly - but every nightly reset (`/api/demo/reset`, `vercel.json`) rewrites
  six rows in a vocabulary that the production migration retired on 2026-08-28, and the
  `LEGACY_BUCKETS` table's comment about "the demo database's own seeds" is now the only reason
  that map must exist for `subject`. The six photographs' subjects in the new vocabulary are
  obvious from the mapping in the migration (`campus`, `nature,campus`, `campus`,
  `school-life,nature`, `campus,nature`, `campus,other`).
- **What to do**: Rewrite the six `subject:` strings; `content.test.mjs` (259 lines) may pin
  the vocabulary - read it first; if it asserts membership in `BUCKETS`, it will go green rather
  than red.
- **Saving**: 0 lines; retires one reason for `LEGACY_BUCKETS` (the other - a browser holding a
  pre-deploy form - expires on its own; that map is then a candidate for the Collection lens to
  delete, with the `areaLabel`/`LEGACY_AREAS` pair at `:148-155` for the same reason).
- **Risk & gate**: low. `node --test src/lib/demo-seed/content.test.mjs`; `npm run check`.
- **Confidence**: high.
- **Notes**: Everything else the seed writes has a reader (checked against the column census;
  `Group.description` is finding 01's). What the seed does NOT write is worth one line for the
  demo lens: no `Image` rows for the seeded feed photographs, so the demo feed lays photographs
  out without dimensions (the `photoFactsFor` fallback) - a fidelity gap, not bloat.

### data-layer-14 - index-coverage.test.mjs explains its exemptions with two uniques that were dropped on 2026-08-27
- **Where**: `src/lib/index-coverage.test.mjs:95-97` (*"(provider, providerAccountId) and
  (identifier, token) are opaque strings from someone else's system"*).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Those were `Account @@unique([provider, providerAccountId])` and
  `VerificationToken @@unique([identifier, token])`, removed with the NextAuth adapter
  (`0399d37`, `2026-08-27-drop-nextauth-adapter-tables.sql`). The filter that comment explains
  (`isRelationColumn` on both halves) is still right; only the example is a ghost.
- **What to do**: Replace the two examples with the one that still exists: `(userId, position)`
  on `UserPlace` is an ordering, and `(day, source, metric)` on `MetricSnapshot` is a key of
  strings. Two lines.
- **Saving**: 0 lines; one fewer stale reference for the next reader to grep for and not find.
- **Risk & gate**: none; `node --test src/lib/index-coverage.test.mjs`.
- **Confidence**: high.

### data-layer-15 - QA-probe residue in live tables: SELECT before launch, and stop documenting "phase3-probe" as a valid roster source
- **Where**: `prisma/schema.prisma:1302` (`source String // "centenary-2026" | "master" |
  "phase3-probe"`); `scripts/qa/phase3-probe.mjs:52,66,72-74` (writes `@probe.invalid` users and
  `RosterEntry` rows with `source = 'phase3-probe'`, deletes its own on the next run);
  `scripts/qa/phase4-probe.mjs:71-91` (writes users, deletes by email suffix - including a
  `DELETE FROM "Session"`, a table that no longer exists, in its cleanup);
  `prisma/migrations-manual/2026-08-25-purge-synthetic-login-attempts.sql` (the precedent:
  residue was found once and needed a migration).
- **Phase**: hygiene (data) / placeholder (the documented value)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous for the SELECTs and the schema comment; owner for any DELETE
- **Evidence**: The probes clean up after themselves at their next start, not at their end,
  so the last run of each leaves its rows until someone runs it again - and the schema comment
  has enshrined a QA fixture as one of three legitimate provenance values on a table the owner
  described as "somebody who never signed up ... liability with no function". The
  `admin-analytics.ts:1108-1120` comment records that `phase2-probe-...@example.invalid` kept
  the locked-out tile red for six days.
- **What to do**: Run SELECT D. If anything comes back: a dated `DELETE ... WHERE email LIKE
  '%.invalid'` / `source = 'phase3-probe'` file in the shape of the 2026-08-25 purge (with the
  refuse-if-live guard). Either way, remove `"phase3-probe"` from the schema comment and have the
  probe write `source = 'probe'` under a comment saying it is never a real value. The
  `DELETE FROM "Session"` at `phase4-probe.mjs:75` is a scripts-lens item (it now throws
  `undefined_table` into a `.catch`? - it is not wrapped; verify), noted under "For other lenses".
- **Saving**: 0 lines; possibly some rows; one fewer lie in the schema.
- **Risk & gate**: none for the SELECT; the DELETE is owner-approved and guarded.
- **Confidence**: high that the value should not be documented; unknown whether rows exist
  (LIVE-UNVERIFIED).

### data-layer-16 - Two migrations carry their own BEGIN/COMMIT inside a runner that already wraps the file
- **Where**: `prisma/migrations-manual/2026-08-28-era-1940s-1950s.sql:29,63`,
  `2026-08-28-profession-student-rename.sql:33,39`, `2026-08-28-profession-tags.sql:35,55`;
  `docs/TRAPS.md:28-30` (*"`run-sql.mjs` sends the file as one simple query, which Postgres wraps
  in an implicit transaction"*).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous - but only as a note for the NEXT migration; do not edit applied files
- **Evidence**: Three of the nine post-audit-1 files open an explicit transaction that the
  runner's simple-query protocol already provides; the era file's comment argues "both inside one
  transaction" as if it were a choice. Harmless (an explicit block inside a multi-statement
  simple query is legal and equivalent), but the next author will copy it, and one day someone
  will add `CREATE INDEX CONCURRENTLY` inside it and get a confusing error for the wrong reason.
- **What to do**: Nothing to the three files (applied history, per audit 1 owner decision C).
  One sentence in TRAPS under the `run-sql.mjs` paragraph: "do not write BEGIN/COMMIT in a
  migration file; the runner's implicit transaction is the transaction."
- **Saving**: 0 lines; one fewer cargo-cult pattern.
- **Risk & gate**: none.
- **Confidence**: high.

### data-layer-17 - Verify Prisma 7.10's relation-load strategy once, and write the number down
- **Where**: `src/app/(main)/feed/actions.ts:1206-1230` (`postInclude(userId)`: author,
  `_count` of comments/likes, the viewer's like/bookmark rows, poll options with vote counts);
  `catchups-round-view.ts:71` (a four-level include); `catchups/[catchupId]/(home)/page.tsx:87-119`.
- **Phase**: architecture (a measurement, not a change)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: I could not determine from the installed client whether Prisma 7.10 with
  `@prisma/adapter-pg` emits one SQL statement per nested `include` (the classic "query"
  strategy: one round trip per relation level) or one statement with lateral joins
  (`relationLoadStrategy: "join"`). The generated client and `@prisma/client/runtime/*.d.ts`
  contain no `relationLoadStrategy` symbol at all (grep: 0), and the runtime is the WASM query
  compiler (`query_compiler_fast_bg.postgresql.wasm`). If it is the query strategy, every feed
  page is ~5 round trips per `loadPosts` rather than 1, and the per-page table above is an
  undercount on every include-bearing route. Nobody has logged it.
- **What to do**: In dev, construct the client once with `log: ["query"]`, load `/feed` and one
  Catch-up home, count statements per `loadPosts`/`loadHome`. Record the answer in TRAPS (one
  paragraph) and in `prisma.ts`'s pool comment, which sizes `max: 5` to "the widest fan-out" -
  a number that depends on this. If it is the query strategy, the follow-up is the fix session's
  call: Prisma exposes `relationLoadStrategy: "join"` per query when the client supports it; if
  the symbol is genuinely gone in 7.x, the joins are already the default and there is nothing to
  do but write that down.
- **Saving**: unknown until measured; possibly 4+ round trips per feed page, possibly 0.
- **Risk & gate**: none for the measurement.
- **Confidence**: low on the outcome, high that the question matters and has not been asked.

## Owner decisions

**A. The Groups feature's last three columns (finding 01).** The feature was removed months
ago; `Post.groupId` is empty on every row and refused on write, `Group.description` holds only
a generated sentence nobody displays, `Group.coverImage` was never written. If Groups are not
coming back, these go with a small code change and one migration to both databases.
Recommendation: drop; a returning feature re-adds a column in one line.

**B. Image.greyscale (finding 02).** A "black and white" filter was promised in the Collection
rework spec, and the column that would power it was put on the table the feed uses, not the
Collection's. Every feed upload measures it; nothing reads it; the Collection cannot.
Recommendation: drop it now and add it to `Photo` on the day the filter is built.

**C. ContentView.firstAt/lastAt and OutboundEmail.bounceKind (finding 03).** Three columns
collected for a panel ("what has this person looked at lately") and a distinction (hard vs soft
bounce) that were never built. Keeping them costs one index write per view and nothing else.
Recommendation: drop the index either way; keep `lastAt` and `bounceKind` only if you want
those panels within the next quarter, otherwise drop all three.

**D. The lazy Catch-up advance on every page view (finding 07b).** The engine runs two reads on
every authenticated page for every member. It can be one read. It could also be *no* read on
non-Catch-up pages once the nightly cron is proven live - which needs the `CRON_SECRET` you
still owe the project. Recommendation: do the one-read version now; revisit "off the layout"
when the cron has run for a month.

**E. LabRoomState.** A production table whose only reader is the `/lab` index's archive toggle
(three call sites). It is tiny and works. Recommendation: keep; it is listed only so no future
audit calls it dead.

**F. Probe residue (finding 15).** Run the SELECT; if rows come back, approve the guarded
DELETE. Recommendation: yes, before launch.

## Not-findings

- **`prisma.ts` at 175 lines for ~40 of code** - every comment carries a probe date, a pool
  arithmetic, or the 2026-08-19/20/28 incidents the fingerprint exists for. Pinned by
  `db-pool-rule.test.mjs`. The dev-only `schemaFingerprint()` reads the schema file at module
  evaluation, in dev only; correct.
- **`prisma.config.ts`** - 31 lines, two comments each defending a deliberate absence (`.env.local`,
  the `migrations` block). Nothing to cut.
- **`keyset.ts`, `people-select.ts`** - both are audit-1 fixes, both used (2 and 14 importers);
  their headers are the proofs that justify them.
- **The 65-migration folder** - audit 1 owner decision C; reversals listed above for the
  record only. The `2026-08-28-era-1940s-1950s.sql` drop-and-recreate of a generated column is
  the only way Postgres allows an expression change; correct.
- **`Comment_postId_isHidden_idx`** - kept 2026-08-27 on 13 scans; not re-litigated.
- **`SearchLog_createdAt_idx` beside `(scope, createdAt)`**, **`UserPlace_userId_idx` beside its
  unique**, **`User_email_key` beside `User_email_lower_key`**, **`Post_createdAt_idx` beside
  `(kind, createdAt)`** - all defended in schema comments or TRAPS; audit-1 not-findings.
- **`Photo_class_river_idx` leading with `(scope, classYears)`** - the class river filters both
  as equality then orders by `takenKey`; the leading columns are right and the trailing `id` is
  the B-122 tiebreak. Every one of the Collection rework's columns is read.
- **Every `$transaction` is multi-statement** - 36 sites, spot-read 20. The one that can be a
  single statement (`auth-tokens.ts:181-196`, a `[create]` array when the kind does not burn)
  is an array transaction Prisma batches without a `BEGIN`; not worth a branch.
- **`include` sites** (15) - every one is `include: { relation: { select } }` or `_count`; the
  only whole-row include is the profile's, which audit 1 gave `omit: { password }`. No
  include-everything.
- **Raw SQL** (31 `$queryRaw`) - 26 in `admin-analytics.ts` (aggregations Prisma cannot express:
  FILTER, percentile_cont, DISTINCT date_trunc), 2 gazetteer trigram queries, the directory's
  `unnest` facet, the notice page's `FOR UPDATE`. Each is the right instrument.
- **`notice/[id]/page.tsx`'s write-in-a-GET transaction** - 40 lines of reasoning (M46/C-115)
  and a declined alternative; deliberate.
- **`last-seen.ts` update-then-create** - C-163 explains why not an upsert; `MAX_VISITS_PER_DAY`
  is a real ceiling with a measured consequence (660k rows fills the disk).
- **`email-queue.ts` drain precheck** - C-104 already took it from nine statements to one.
- **`Visit`, `SearchLog`, `LoginAttempt`, `ContentView`, `MetricSnapshot`, `RosterEntry`,
  `QueueLease`, `PendingImagePurge`** as tables - each has live writers, live readers (or a
  live consumer script + workflow: `snapshot.yml` -> `snapshot.mjs` -> `loadTrends`), and a
  retention sweep where one is needed. Only the columns in finding 03 are unread.
- **The directory's 7-leg `Promise.all` and unbounded pin `findMany`** - audit 1 not-finding;
  the pool comment sizes `max: 5` to it.
- **`ContentView` has no retention sweep** - by design it is bounded by distinct pairs, not by
  traffic (schema comment, with the arithmetic).
- **`retention.ts`'s per-row `promoteGroupSuccessor` loop** - batched to 200 nightly rows, under
  Serializable, with a stated reason; not an N+1 that hurts.
- **`admin-analytics.ts` at 1,165 lines** - the admin-analytics territory's; from this lens its
  query shapes are defensible and audit 1's cut is confirmed landed.

## Audit-1 carry-overs in this territory

- **Owner decision A (six orphan Catch-up tables)** - closed: the phase-6 census proved all six
  return NULL from `to_regclass`; the spec 6.4 runbook is moot. Nothing to do.
- **Owner decision B (Place gazetteer, 97 MB)** - unchanged; still cities500, still defended by
  the B-091 measurement in `index-coverage.test.mjs`.
- **Owner decision C (do not squash migrations)** - honoured; the folder is 65 files now.
- **Owner decision D (dead-column drops)** - executed 2026-08-27 (`openTo`, `tag`, `blurhash`,
  `originalUrl`, `visibility`, `avatarColor`, the Visit trio); every schema line and every
  reader is gone (grep-verified).
- **Owner decision E (confirm the 2026-08-25 migrations reached the demo DB)** - the session-9
  log says every phase-6 file was applied to both; the three 08-25 files predate that and their
  status on the demo DB is still unrecorded. SELECT E on `--env .env.demo` answers it.
- **Report §4 #16 "the legacy Collection taxonomy SELECT"** - moot: the 2026-08-28 river
  migration remapped `Photo.subject` in SQL and `bucketsOf()` maps stragglers on read. The demo
  seed is the last writer of the old vocabulary (finding 13).
- **Refuted rows** - none touched here; the `withMember/withAdmin` wrapper and cuid2 stay
  parked.
- **data-layer-04 (SQLite gate), 05 (person select), 06 (place transaction), 07 (indexes),
  08 (profile omit), 09 (`isRecordNotFound`)** - all landed; `db-text.ts` keeps one historical
  sentence about `IS_POSTGRES` that is fine.

## For other lenses

- **collection**: `Photo.subject` is a comma-joined text column filtered with `contains`
  (`collection/actions.ts:741`); the trigram indexes do not cover it. The right shape is the
  `professionTags` one (`text[]` + GIN + `has`), which also deletes `LEGACY_BUCKETS`'
  read-time mapping. A rework, not a cut. Also: `LEGACY_BUCKETS` and `LEGACY_AREAS`
  (`collection.ts:84,148`) become deletable once finding 13 lands and one deploy has passed.
- **catchups**: finding 07(b) reshapes `advanceDueCatchups`' two reads into one; the jscpd
  cluster in `catchups/actions.ts` (raw/jscpd.txt lines 164-210: the membership gate +
  author-select block repeated 8+ times) is still there from audit 1 and is theirs.
- **feed-posts**: finding 09 (the page's duplicate unread count); `collection/actions.ts:1009-1019`
  vs `feed/actions.ts:344-354, 404-417, 513-525, 1341-1349` (jscpd lines 221-231) is one
  `auth()` + verified-member gate spelled five times across two territories.
- **admin-analytics**: finding 12's FILTER folds live in their file; `loadPresence`'s two
  user-joined `visit.findMany` `include: { user: { select } }` are fine.
- **scripts-e2e-ci**: `scripts/qa/phase4-probe.mjs:75` still `DELETE FROM "Session"`, a table
  dropped 2026-08-27 - the cleanup will throw on a real run. `scripts/demo/apply-schema.mjs`
  (audit-1 knip hit) is the only fresh-database story and depends on `prisma migrate diff`;
  since the folder now contains DROPs whose CREATEs are not in it, a fresh demo database is
  "diff from schema, then replay the folder" - worth one sentence in `scripts/README.md`.
- **lib-core-config / demo**: the seed writes no `Image` rows for its feed photographs (finding
  13 notes); `Group.description` write at `seed.ts:352` goes with finding 01.
- **auth-edge**: finding 07(a) adds one field to the session select and to `next-auth.d.ts`.
- **root-docs**: TRAPS "Two expression indexes" (finding 05) and the BEGIN/COMMIT sentence
  (finding 16); the next audit wants a fresh `pg_indexes` dump saved beside the 08-22 one.
- **bundle-build**: nothing new; `src/generated/prisma` in the tsc sweep was theirs in audit 1.

## The SELECTs

All read-only; run through `node scripts/dev/run-sql.mjs` on the production URL, then again with
`--env .env.demo` where a drop will be applied to both. Every drop finding above names its letter.

```sql
-- A. Index usage, for findings 01/03/04/05. Read stats_reset first: a window
--    under a month is not evidence (audit 1 used 96 days).
SELECT stats_reset FROM pg_stat_database WHERE datname = current_database();
SELECT relname, indexrelname, idx_scan, idx_tup_read,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
  FROM pg_stat_user_indexes
 WHERE indexrelname IN (
   'Photo_approved_isHidden_createdAt_idx','Photo_era_idx','Photo_river_era_idx',
   'Photo_river_added_idx','Photo_river_taken_idx','Photo_class_river_idx',
   'LoginAttempt_userId_createdAt_idx','LoginAttempt_email_createdAt_idx',
   'LoginAttempt_createdAt_idx','AuditLog_actorId_createdAt_idx','AuditLog_targetId_idx',
   'AuditLog_action_createdAt_idx','ContentView_viewerId_lastAt_idx','ContentView_kind_targetId_idx',
   'Post_groupId_createdAt_idx','User_lastSeenAt_idx','User_name_trgm_idx',
   'Photo_caption_trgm_idx','Photo_area_trgm_idx','Photo_freeTags_trgm_idx',
   'Comment_postId_isHidden_idx')
 ORDER BY idx_scan, indexrelname;

-- B. Groups residue, finding 01. Expect group_posts = 0 (the code comment says so).
SELECT count(*) FILTER (WHERE "groupId" IS NOT NULL) AS group_posts, count(*) AS posts FROM "Post";
SELECT count(*) AS groups,
       count(*) FILTER (WHERE "batchYear" IS NOT NULL) AS batch_groups,
       count(*) FILTER (WHERE description IS NOT NULL) AS with_description,
       count(*) FILTER (WHERE "coverImage" IS NOT NULL) AS with_cover
  FROM "Group";

-- C. Write-only columns, findings 02/03. For the record before any drop.
SELECT count(*) AS rows,
       count(*) FILTER (WHERE "lastAt" <> "firstAt") AS revisited,
       min("firstAt") AS oldest
  FROM "ContentView";
SELECT count(*) AS rows, count(*) FILTER (WHERE "bounceKind" IS NOT NULL) AS with_kind,
       array_agg(DISTINCT "bounceKind") FILTER (WHERE "bounceKind" IS NOT NULL) AS kinds
  FROM "OutboundEmail";
SELECT count(*) AS rows, count(*) FILTER (WHERE greyscale) AS greyscale FROM "Image";
SELECT count(*) AS rows, max("capturedAt") AS last_capture FROM "MetricSnapshot";

-- D. Probe residue, finding 15.
SELECT source, count(*) FROM "RosterEntry" GROUP BY 1 ORDER BY 2 DESC;
SELECT count(*) FROM "User" WHERE email LIKE '%.invalid';
SELECT count(*) FROM "LoginAttempt" WHERE email LIKE '%.invalid';
SELECT count(*) FROM "OutboundEmail" WHERE "to" LIKE '%.invalid';
SELECT count(*) FROM "AuditLog" WHERE detail ILIKE '%probe%' OR detail ILIKE '%.invalid%';
SELECT count(*) FROM "Post" p JOIN "User" u ON u.id = p."authorId" WHERE u.email LIKE '%.invalid';

-- E. Every index Prisma cannot see, finding 05 (and audit-1 owner decision E on the demo DB).
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND (indexdef ILIKE '%lower(%' OR indexdef ILIKE '%USING gin%'
        OR indexdef ILIKE '% WHERE %' OR indexname = 'User_lastSeenAt_idx')
 ORDER BY indexname;
-- and the three 2026-08-25 objects audit 1 could not confirm on the demo DB:
SELECT to_regclass('"GroupMember_userId_idx"'), to_regclass('"Photo_sourceKey_key"'),
       to_regclass('"Report_open_post_per_reporter_key"');

-- F. The seed's vocabulary on the DEMO database only (--env .env.demo), finding 13.
SELECT subject, count(*) FROM "Photo" GROUP BY 1 ORDER BY 2 DESC;
```

## Metrics

- Lines read in full: schema 1,441; prisma.ts 175; the three pinned tests 448; keyset 82;
  people-select 57; prisma.config 31; db-text 60; content-view 41; last-seen 260; layout 140;
  the last 12 migrations ~620; TRAPS 306; audit-1 data-layer report 578; phase-6 census 132;
  session-9 log ~100. Call-site reads: ~2,400 lines across the 30 files named above.
- Models 37 (audit 1: 41, minus Account/Session/VerificationToken/GroupInvite, plus Image).
  `@@index` 60 + 3 named river indexes; `@@unique` 16. Call sites: 523 `prisma.<x>.` in 104
  files (audit 1: 612 - the drop is the removed adapter, GroupInvite, avatarColor and the
  catchups core/engine split); per model: user 113, post 43, outboundEmail 42, photo 37,
  catchupEdition 35, notification 34, adminThread 28, catchup 25, groupMember 22, contribution
  21, catchupEntry 21, comment 19 ... contentView 1, metricSnapshot 1.
- `$transaction` 36 (all multi-statement), `$queryRaw` 31 (26 in admin-analytics),
  `$executeRawUnsafe` 1 (a comment in prisma.ts, not a call).
- Migrations: 65 files, 968 code / 1,512 comment lines; 6 reversal pairs, 0 columns created
  and dropped inside the folder except `takenKey` (deliberate, same day).
- Dead or write-only columns found: 8 (finding 01: 3; 02: 1; 03: 4). Indexes with no query
  shape: 8 (1 certain). Objects Prisma cannot see: 11 (10 expression/partial/GIN + 1 plain).
- Queries per authenticated page view, floor: 7 (9 on a new visit). Heaviest render:
  `/admin/analytics?view=content` at ~39. Heaviest member-facing: `/catchups/[id]` at ~22.
- Honest saving if every finding lands: ~5 queries off every authenticated page view (07a,
  07b, 08, 09), 9 off a Catch-up home (06, 07, 08), ~20 off the admin People view (12), 1 off
  every profile view (12); 8 columns, up to 9 indexes, 1 relation pair in both databases;
  ~110 lines of code and schema; one pixel pass per feed upload; one fewer place for the
  avatar shape, the keyset and the invisible-index list to drift.
