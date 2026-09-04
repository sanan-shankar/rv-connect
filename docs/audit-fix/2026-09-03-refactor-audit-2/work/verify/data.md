# data - adversarial verification notes (refactor audit 2)

Verifier charter: Prisma schema, retention, keyset pagination, query shape. Read-only; no build,
no tsc, no knip, no browser, no database. HEAD at verification: `74cc61a`
("fix(retention): notifications are kept 30 days, everywhere") — ONE commit ahead of the HEAD the
finders read (`72b5a1d`). Working tree: `docs/audit-fix/README.md` and `progress.md` modified by a
peer session, plus this audit's own untracked folder. Nothing in my territory is uncommitted.

Cluster ids: data-layer-01, -02, -03, -04, -15, -16, lib-core-config-03, lib-tests-01, lib-tests-13.

## Headline

Every one of the nine claims survives. Nothing is refuted outright. But **every schema line number
in the data-layer report is wrong** — the report cites a `prisma/schema.prisma` that is offset by
roughly +85 to +130 lines from the file at HEAD, while correctly quoting the file's content and
correctly reporting its length (1,441 lines). A fix session that trusts those ranges will edit the
wrong block. I re-derived every one below. Two findings also understate their blast radius in a way
that matters (data-layer-01 walks into the post-visibility security pair and its pinned test;
data-layer-02 walks into `image-facts.test.mjs`), and one (data-layer-15) has its mechanism
backwards in a way that makes the underlying problem *worse*, not better.

---

## data-layer-01 — Groups residue (Post.groupId, its index, Group.description, Group.coverImage)

**Verdict: confirmed-with-correction.**

What holds. `Post.groupId` has exactly two writers: `feed/actions.ts:291` (`post.create`, which
hard-writes `groupId: null` at `:302`) and `demo-seed/seed.ts:220` (`post.createMany`, which does
not name the column). The refusal branch is at `:189-208` and reads exactly as quoted. I chased
every `groupId:` in `src/app/(main)/catchups/actions.ts` (lines 1012, 1063, 1192, 1467, 2045) that
could have been a second writer — all five are `notify*` fan-out arguments carrying
`edition.catchup.group.id`, not `Post` writes. `Group.description` has the two writers named
(`auth/actions.ts:252`, `seed.ts:352`) and no reader: every `group: { select: … }` in src selects
`name`, `id`, `_count.members`. `Group.coverImage` has neither.

Correction 1 — line numbers. At HEAD: `Group.description` is `:414`, `Group.coverImage` `:415`
(report says 359-360); `Group.posts Post[]` is `:440` (report says 386); `Post.groupId` is `:600`,
the `group Group?` relation `:608`, `@@index([groupId, createdAt])` `:616` (report says 470-476
and 496).

Correction 2 — five filters, not six. The report's six `groupId: null` sites include
`feed/actions.ts:302`, which is a WRITE inside `post.create`, not a read filter. The read filters
are `feed/actions.ts:1202`, `:1315`, `letters/(index)/page.tsx:60`, `profile/[id]/page.tsx:165`,
`components/feed/rail/letters-module.tsx:36`.

Correction 3 — THE MISSED BLAST RADIUS, and the reason this is not the T3 the report describes.
`Post.groupId` has a live reader the report never mentions: the post-visibility pair, which is a
security path.
- `src/lib/post-visibility.ts:39` — `GUARD_SELECT` selects `groupId: true`.
- `src/lib/post-visibility.ts:65-68` — `isMemberOf`, a `cache()`d `groupMember.findUnique`.
- `src/lib/post-visibility.ts:81-85` — `gather()` derives `isGroupMember` and gates `cityMatches`
  on `!post.groupId`.
- `src/lib/post-visibility-rule.ts:35` (`GuardedPost.groupId`), `:53` (the `VisibilityFacts`
  docblock), `:220-224` (`if (post.groupId) return facts.isGroupMember ? … : "not-a-member"`).
- `src/lib/post-visibility-rule.test.mjs` — 13 `groupId` references, including the behavioural
  tests at `:50-57` (`not-a-member`), `:67` (group beats cityScope/targetBatches), `:124`
  (role: null), and the sweep constant `RULE_FACTS = ["isHidden", "groupId", "cityScope",
  "targetBatches"]` at `:332`, which drives the "no page refuses a post ahead of the rule" sweep.

Dropping the column therefore means deleting a denial reason (`not-a-member`) and rewriting a
security-pinned test. The report's gate names `cascade-rule.test.mjs` and `index-coverage.test.mjs`
and says both stay green — true, but it never names `post-visibility-rule.test.mjs`, which is the
one that will actually go red. A fix session must add it to the gate, and the owner call is bigger
than "three columns": it is "the app forgets that a post can belong to a private container at all".

Everything else (the ordering — code, deploy, schema, DDL, both DBs; the refuse-if-not-empty `DO $$`
block; SELECT B) is sound.

## data-layer-02 — Image.greyscale

**Verdict: confirmed-with-correction.**

What holds, exactly. `recordImage` (the only writer of the column) is imported in precisely two
places: `src/app/api/upload/route.ts:5,140` and `src/app/api/upload/finalize/route.ts:12,134` —
both the feed/letter/Catch-up upload path. `photoFactsFor`'s SELECT (`image-record.ts:94-106`)
lists url/width/height/focalX/focalY/focalSet/blurDataUrl and deliberately omits `greyscale`, with
the comment quoted in the report. Its four callers are `(main)/image-aim.ts:101`,
`letters/[id]/(read)/page.tsx:125`, `feed/actions.ts` (via `withPhotoFacts`) and
`catchups-round-view.ts:128`. Neither `collection/actions.ts` nor `collection-photo.ts` appears
anywhere in that list. Zero readers of the column in src, scripts or SQL. The claim stands.

Correction 1 — line numbers. Schema: the column is `prisma/schema.prisma:254`, not 225-228.
`src/lib/image.ts`: the `ImageFacts.greyscale` field is `:178` (report correct); the code to remove
is `GREYSCALE_CHROMA` at `:226` with its docblock from `:217`, `meanChroma` at `:235-248`, and
`isGreyscale` at `:250-252` — the report's "`:219-240`" spans the constant and half of
`meanChroma` and stops before `isGreyscale`.

Correction 2 — `image-record.ts:39` is not a named write. The upsert is
`create: { url, ...facts }, update: facts` — the column rides in on the spread. Removing the field
from `ImageFacts` is the whole edit there; there is no `greyscale:` line to delete.

Correction 3 — a test file the report's gate does not name.
`src/lib/image-facts.test.mjs` imports BOTH `isGreyscale` (`:8`) and `meanChroma` (`:9`) and
asserts on them at `:41`, `:42`, `:47`, `:48`, `:51`, `:52`, `:56`, and on `facts.greyscale` /
`describeImage(...).greyscale` at `:78`, `:109-111`. Option (a) "drop it" means deleting those
assertions and `meanChroma` too (its only non-test caller is `isGreyscale:251`). The report's gate
names only `image-purge-rule.test.mjs`, which is indeed irrelevant here. Saving is therefore a
little larger than "~25 lines" and the edit touches 3 files, not 2.

## data-layer-03 — four write-only telemetry columns + one index

**Verdict: confirmed-with-correction.** The census is exactly right; only the coordinates are wrong.

Re-run at HEAD, excluding `src/generated`:
- `firstAt`: 0 references in `src` and `scripts`. Set by `@default(now())` only.
- `lastAt`: exactly 1 — `src/lib/content-view.ts:32`, `update: { count: { increment: 1 }, lastAt:
  new Date() }`. Write-only.
- `capturedAt`: 1 in scripts (`scripts/ops/snapshot.mjs:326`, `DO UPDATE SET … "capturedAt" =
  now()`), 0 in src, 1 in the 2026-08-19 migration. Write-only.
- `bounceKind`: 1 (`src/app/api/resend/webhook/route.ts:114`). Write-only. Its neighbour
  `bouncedAt` IS read — `admin-analytics.ts:257`, alongside `deliveredAt:256` and
  `complainedAt:258`. The report's distinction is exact and its line cite `256-258` is the one
  line reference in this finding that is correct.
- `ContentView_viewerId_lastAt_idx`: every ContentView read is raw SQL in `admin-analytics.ts`
  (`:633`, `:641`, `:671`, `:859`, `:866`, `:869`, `:956`, `:960`) plus the upsert. None filters or
  orders on `lastAt`; the two that group by `viewerId` (`:641`, `:960`) sum `count`, which the
  index does not carry, so not even an index-only scan is available. No query can use it.

Correction — line numbers. `firstAt`/`lastAt` are `:1325-1326`; `@@index([viewerId, lastAt])` is
`:1335`; `MetricSnapshot.capturedAt` is `:1195`; `OutboundEmail.bouncedAt`/`bounceKind` are
`:569-570`. The report says 1240-1242 / 1250 / 1182 / 589-594.

## data-layer-04 — eight indexes no query shape can use

**Verdict: confirmed-with-correction.** I checked each of the six that are this finding's own (the
other two belong to 01 and 03) and could not break any of them.

- `Photo_approved_isHidden_createdAt_idx` (`:380`) vs `Photo_river_added_idx`
  (`:389`, `approved, isHidden, createdAt DESC, id DESC`). The dominance argument is correct:
  the leading three columns match and Postgres reads a DESC btree backwards for an ASC order.
  Certain, as the report says.
- `Photo @@index([era])` (`:381`): no `where` in non-lab `src` filters `era`. I read the decade
  rail at `collection/actions.ts:905-947` — it is `groupBy({ by: ["photoYear","era"], where:
  filters })` at `:937`, and `filters` is `buildCollectionWhere`, which never sets `era`. The one
  `era: true` outside the Collection is a SELECT in the account export (`api/account/export/
  route.ts:194`). Confirmed.
- `Photo_river_era_idx` (`:390`): "likely dead, SELECT A decides" is the right hedge. The groupBy
  above filters on (approved, isHidden) and groups by (photoYear, era), so the planner could still
  pick this over `Photo_river_added_idx` for the filter; it cannot pre-group. Do not drop this one
  without SELECT A.
- `LoginAttempt_email_createdAt_idx` / `LoginAttempt_userId_createdAt_idx`
  (`:1365`, `:1366`): every reader confirmed. `admin/audit/page.tsx:52` filters `{ ok: false }` and
  orders by `createdAt`; `admin-analytics.ts:1099` is `groupBy({ by: ["reason"] })`;
  `:1122-1130` is the raw `GROUP BY l.email` with a `LEFT JOIN "User" u ON u.id = l."userId"` (a
  join on User's PK, not a filter on this column, exactly as the report argues); `:1132` is
  `count({ where: { ok: false, createdAt: { gte } } })`. Retention deletes on `createdAt` only
  (`retention.ts:193-197`). No filter on `email` or `userId` anywhere. Confirmed.
- `AuditLog_actorId_createdAt_idx` / `AuditLog_targetId_idx` (`:746`, `:747`): the complete set of
  `prisma.auditLog.*` call sites in src+scripts is four — `razorpay/webhook/route.ts:49`
  (`findFirst` on action+createdAt), `admin/audit/page.tsx:51` (`orderBy createdAt desc, take 100`),
  `retention.ts:199` (`deleteMany` on createdAt), `audit.ts:69` (`create`). Nothing filters on
  `actorId` or `targetId`; the audit page resolves ids in a second `user.findMany`
  (`audit/page.tsx:63-66`). Confirmed.

The pin claim checks out: `index-coverage.test.mjs`'s `REQUIRED` (`:47-59`) is the ten B-090
child-side keys and names none of the eight; `NO_INDEX_NEEDED` (`:74-83`) names three unrelated
columns; the composite-unique sweep (`:88-113`) only looks at `@@unique([a, b])` pairs.

Correction — line numbers. Photo `:380`, `:381`, `:390`; AuditLog `:746-747`; LoginAttempt
`:1365-1366`; ContentView `:1335`; Post `:616`. The report says 311/312/321, 687-688, 1287-1288.

## data-layer-15 — QA-probe residue

**Verdict: confirmed-with-correction, and the correction makes the problem larger.**

Refuted as written: *"The probes clean up after themselves at their next start, not at their end."*
Both probes call `cleanup()` twice — `scripts/qa/phase3-probe.mjs:68` and `:394`,
`scripts/qa/phase4-probe.mjs:86` and `:442`. On the report's own model, a clean run leaves nothing.

But the real mechanism is worse, and the report half-saw it in a parenthetical it left unresolved
("it now throws `undefined_table` into a `.catch`? — it is not wrapped; verify"). I verified.
`DELETE FROM "Session"` sits at `phase3-probe.mjs:63` and `phase4-probe.mjs:75`, **unwrapped**,
inside `if (ids.length) { … }`, and **before** `DELETE FROM "User"`. The `Session` table was
dropped on 2026-08-27 (`prisma/migrations-manual/2026-08-27-drop-nextauth-adapter-tables.sql:48`)
and has no `model Session` in the schema. So:

1. A run creates `@probe.invalid` users.
2. Its own end-of-run `cleanup()` deletes Comment/Like/Post/AuthToken, then throws `undefined_table`
   on the `Session` line — a top-level `await` rejection that kills the script.
3. The `User` rows survive. In phase3, the `DELETE FROM "RosterEntry" WHERE source =
   'phase3-probe'` at `:67` sits after the `if` block and is never reached either.
4. The NEXT run's start-of-run `cleanup()` finds those ids and throws at line 68/86 before doing
   anything at all. The probe cannot run again.

`phase6-probe.mjs:33` and `phase7-probe.mjs:33` wrap the same statement in `.catch(() => {})`;
these two do not. So residue is not a possibility to check for, it is the expected state since
2026-08-27, and both probes have been unrunnable since. SELECT D is still the right first step, but
the fix is not only a schema comment: it is deleting or `.catch()`-ing those two lines. That belongs
to the scripts lens as much as to this one.

Correction — the schema comment is `prisma/schema.prisma:1387`, not 1302 (`RosterEntry` starts at
`:1381`). Everything else in the finding — the `admin-analytics.ts:1108-1120` precedent, the
2026-08-25 purge migration as the shape to copy — checks out.

## data-layer-16 — BEGIN/COMMIT inside migration files

**Verdict: confirmed.** Line numbers exact for once:
`2026-08-28-era-1940s-1950s.sql:29`/`:63`, `2026-08-28-profession-tags.sql:35`/`:55`,
`2026-08-28-profession-student-rename.sql:33`/`:39`. TRAPS quote verified at
`docs/TRAPS.md:33-35`.

I tried to widen this into a repo-wide pattern and could not: 25 of the 65 migration files contain
a line beginning `BEGIN` or `COMMIT`, but exactly **three** contain a top-level `BEGIN;` — the rest
are PL/pgSQL `DO $$ BEGIN … END $$;` blocks, which are not transactions. The report's "three of the
nine post-audit-1 files" is right and the pattern is genuinely new (all three landed 2026-08-28).

Two notes for the fixer. The finding's TITLE says "Two migrations" while its body, evidence and
`Where` all say three; the title is the error. And the era file's `COMMIT;` is its last statement,
so the semantics really are equivalent — nothing runs outside the block. Also worth knowing:
`docs/TRAPS.md:34-36` ALREADY warns that `CREATE INDEX CONCURRENTLY` cannot be used through
`run-sql.mjs` because the file is one simple query in an implicit transaction. The proposed new
sentence should attach to that paragraph rather than repeat it.

## lib-core-config-03 — collapse retention's eight cutoff deletes

**Verdict: confirmed-with-correction.**

The eight blocks exist and are exactly the eight named — reports, contributions, notifications,
loginAttempts, auditLogs, outboundEmails, visits (the only `endedAt`), searches — and
`sed -n '178,218p' | wc -l` is exactly the 41 lines the report counted. The three that must NOT be
folded in (`adminMessages` at `:150`, `catchupCopies` at `:235`, the purge at `:295` and
`pendingImages` at `:362`) are correctly excluded.

Correction 1 — line numbers, shifted by commit `74cc61a`, which added ten comment lines to
`KEEP_DAYS.notifications`. At HEAD: the eight steps are `:178-218` (not 166-206); `KEEP_DAYS` is
`:31-88` (not 32-75); `SweepResult` is `:90-111` (not 77-99); `const result: SweepResult` is `:369`
(not 357-373).

Correction 2 — the finding's closing note is now moot AND was wrong. It says *"if the owner picks
30 days there, `notifications` leaves this table before it is written."* The owner did pick 30
(`74cc61a`), and `KEEP_DAYS.notifications: 30` at `:53` feeds the same unchanged plain-cutoff step
at `:188-192`. Nothing leaves the table; the proposal is unaffected. What the 30-day change does
leave behind is a different duplication, one nobody in this cluster claimed: notifications are now
deleted in **two** places on the same 30-day window — `retention.ts:188` and
`scripts/ops/prune.mjs`, run nightly by `.github/workflows/snapshot.yml:95`. That is a real
follow-up for the orchestrator, not a defect in this finding.

Correction 3 — the "confirm no test greps for a literal `prisma.report.deleteMany`" homework, done.
Nothing does. `purge-rule.test.mjs:103` pins `adminMessage.deleteMany` and `:142` `tx.user.
deleteMany`; `unattended-rule.test.mjs:137,141` pin the `adminThread`/`adminMessage` ordering;
`image-purge-rule.test.mjs:261` pins `tx.photo.deleteMany`; `cascade-rule.test.mjs:209` pins
`comment.deleteMany`. All are in steps the proposal leaves alone. The one pin that reads `KEEP_DAYS`
is `presence-rule.test.mjs:84`, `/presence:\s*(\d+)/` over the decommented file — `KEEP_DAYS`
survives the refactor verbatim, so it stays green.

## lib-tests-01 — ten git-grep sweeps in nine files

**Verdict: confirmed.** This is the most precisely-cited finding in my cluster. All ten sites are at
the exact lines given: `confirm-dialog.test.mjs:23`, `focus-recipe.test.mjs:70`,
`catchups-core.test.mjs:733` (module load — the "paid even by a `--test-name-pattern` run" claim is
right, it is a top-level `const`), `contribution-state.test.mjs:161`, `keyset.test.mjs:88`,
`notification-reach.test.mjs:78`, `people-search-rule.test.mjs:46`,
`post-visibility-rule.test.mjs:335`, `security-regressions.test.mjs:51` and `:100`. `execSync` count
across `src/**/*.test.mjs` is exactly 10; there is no eleventh.

The scaffolding is in place: `src/lib/test-kit.mjs` already exports `ROOT` (`:36`), `decomment`
(`:52`) and `walk(dir, { skip, match })` (`:66`), so the proposed `grepFiles` drops in beside them.
The C-189 precedent reads exactly as quoted (`gate-coverage.test.mjs:84-97`, with the walk-based
guard at `:120`, `files.length >= 15`).

The guard census is right. `security-regressions` C2 (`:100`) HAS a guard — `assert.ok(files.length
>= 3)` at `:109`; C1-c (`:51-58`) has none and is a must-be-empty `assert.deepEqual(hits, [])`,
which is precisely the shape that cannot fail open loudly. So the two guardless sweeps really are
C1-c and keyset.

Small corrections: `scripts-ledger.test.mjs` uses `execFileSync` at `:44` (the report says line 43),
and its tracked-only argument is at `:29-36` (the report says 27-32) — its exclusion from the list
is correct and well reasoned. I could not fully replay the "both detectors find 22 files" claim
without running the filter chain, but the two candidate sets agree at the point I can check:
`git grep -l '"use server"' -- 'src/**/*.ts'` returns 28 and a filesystem `grep -rl` over
`src/**/*.ts` returns the same 28. The timing figures rest on a timings file I did not run; treat
the "~0.4-0.5 s" saving as the finder's measurement, not mine.

## lib-tests-13 — keyset's sweep has no count guard

**Verdict: confirmed.** `src/lib/keyset.test.mjs:87-107` is the test, exactly as cited. It splits
`git grep -l 'cursor: { id'` output, loops `src.matchAll(/findMany\(\{[\s\S]*?\n\s*\}\)/g)`,
`continue`s on any block without `cursor:\s*\{\s*id`, and asserts only inside the survivors. There
is no `files.length` guard, no block counter, no cursor counter — an empty grep, a regex that
terminates early, or the migration of the last cursored query all pass silently. The two
legitimate sites are named in the comment at `:80-85` (the directory and the admin people list), so
the proposed `>= 2` assertion has its message ready-made.

---

## Overlaps between findings

- **lib-tests-01 ∩ lib-tests-13** — same file, same test, and they agree. lib-tests-01's sequencing
  is the safer one: convert the `git grep` to `grepFiles` and add the count guard in one edit, so
  the guard is written against the walk's file list rather than git's. Doing 13 alone would pin a
  number that 01 then changes.
- **data-layer-04 ∩ data-layer-01** (`Post_groupId_createdAt_idx`) **and ∩ data-layer-03**
  (`ContentView_viewerId_lastAt_idx`) — they agree; each index is claimed once and cross-referenced.
  For the two columns' indexes, 01 and 03's ordering (code → deploy → schema → DDL → both DBs) is
  the safer procedure, because the column goes with the index. For the six index-only drops,
  data-layer-04's SELECT A gate is the safer one and should run first regardless; only
  `Photo_approved_isHidden_createdAt_idx` is safe to drop without it.
- **data-layer-03 ∩ data-layer-02** — same phase ("written, never read"), no file overlap.

## What a fix session must not trust

Every `prisma/schema.prisma:NNN` in the data-layer report. The content is right, the coordinates are
not. Use: Group.description `:414`, Group.coverImage `:415`, Group.posts `:440`, Post.groupId
`:600`, Post.group `:608`, Post `@@index([groupId, createdAt])` `:616`, AuditLog indexes `:746-747`,
Image.greyscale `:254`, MetricSnapshot.capturedAt `:1195`, OutboundEmail.bouncedAt/bounceKind
`:569-570`, ContentView.firstAt/lastAt `:1325-1326`, ContentView `@@index([viewerId, lastAt])`
`:1335`, LoginAttempt indexes `:1365-1366`, RosterEntry.source comment `:1387`, Photo indexes
`:380`, `:381`, `:389`, `:390`.
