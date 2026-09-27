# catchups-lib - refactor audit 3 report

Charter T03: the Catch-ups library under `src/lib` (the pure engine `catchups-core.ts`, the drivers
`catchups.ts`, the vocabulary `catchups-types.ts`, the bell `catchups-notify.ts`, the export shape
`catchups-export.ts`, the reader's loader `catchups-edition-view.ts`, the batch self-heals, the picture
pool, the read mark, the shelf, the vote/voice rule modules, `group-succession.ts`, and the files the
charter swept in by name: `batch-year.ts`, `roster.ts`, `roster-rule.ts`, `voice-answer.ts`), the
magazine engine `src/lib/magazine/**`, and the two scripts that feed it (`scripts/dev/export-catchups.mjs`,
`scripts/dev/print-magazine.mjs`). Tests were read as the behavioural spec (T14 audits them as
tests). Date 2026-09-24, HEAD `70570bcd`. Files in territory: 44 (29 source + 15 tests); read fully:
29 source files and 5 test files; the other 10 tests were read for their pins (see Coverage).

## Coverage
- **Read fully (source, 7,749 lines):** `src/lib/catchups-core.ts` (1,402), `catchups.ts` (534),
  `catchups-types.ts` (335), `catchups-notify.ts` (350), `catchups-export.ts` (232),
  `catchups-edition-view.ts` (255), `batch-catchups.ts` (313), `batch-year.ts` (100),
  `catchup-caps.ts` (24), `catchup-picture-pick.ts` (49), `catchup-pictures.ts` (289),
  `catchup-reads.ts` (73), `catchup-shelf.ts` (62), `vote-question-rule.ts` (175),
  `voice-answer-rule.ts` (239), `voice-answer.ts` (35), `group-succession.ts` (85), `roster.ts` (104),
  `roster-rule.ts` (78); `src/lib/magazine/{index,grammar,paginate,measure,types,image,score,from-export}.ts`
  (2,396); `scripts/dev/export-catchups.mjs` (404), `scripts/dev/print-magazine.mjs` (215).
- **Tests read fully:** `batch-catchups.test.mjs` (404), `magazine/magazine.test.mjs` (296),
  `catchup-shelf.test.mjs` (58), and all but a few lines of `time-capsule-rule.test.mjs` (367) and
  `catchup-lifecycle.test.mjs` (344).
- **Tests read for their pins only** (header, imports, every `test(` title, every `read("...")`
  target, and the blocks my proposals would move): `catchups-core.test.mjs` (1,033; read 1-300 and
  the Spotify, legacy-bits and C-141 blocks), `vote-question-rule.test.mjs` (read 185-243),
  `voice-answer-rule.test.mjs`, `catchup-pictures.test.mjs` (read 165-196), `catchup-reads.test.mjs`,
  `group-succession.test.mjs` (read 116-149), `roster-rule.test.mjs`, `batch-year.test.mjs`,
  `batch-line.test.mjs`, `unattended-rule.test.mjs`. These are T14's to audit as tests.
- **Read outside the territory, to answer the charter's questions:** `src/app/(main)/catchups/actions.ts`
  (2,821 lines: the vocabularies 118-140, `loadFreshEdition`/`loadMemberEdition` 262-420,
  `openAnswering`/`closeAndPublish` 1252-1455, `submitEntry`'s head 1691-1725,
  `clearCatchupNotifications` 2270-2330, `setCatchupKeeper` 2685-2750, `nudgeGroup`), `src/app/(main)/layout.tsx`
  40-121, the reader page `catchups/edition/[editionId]/page.tsx` 38-235, the home page 120-250,
  `src/lib/account-purge.ts` 1-100, `settings-surface.tsx` 160-175, `notification-bell.tsx` 55-110,
  `comment-target-rule.test.mjs` 115-140, the lab adapter `src/app/lab/catchups/sketches/_data.ts`, the
  lab corpus loader `_fixtures/magazine/corpus.ts`, the specs `docs/spec/catchups.md` (all),
  `docs/planning/catchups-rework/architecture.md` (all), `spec.md` (1-430, 540-830, 969-1100,
  1301-1330), `magazine.md` §8, the handover board, and audit 2's `catchups` agent rows.
- **Not Catch-ups at all, despite the charter listing them:** `batch-year.ts` (directory filters and
  the signup/profile year rule), `roster.ts` + `roster-rule.ts` (office-roster auto-verification),
  `batch-line.test.mjs` (tests `utils.ts`), `unattended-rule.test.mjs` (the mail queue, the purge,
  the crons). Read; their few observations are under "For other lenses".
- **Not read:** nothing in the territory.
- **Uncommitted edits seen:** none in any territory path (`git status --short` clean for them at
  start). The only untracked folders are this audit's and the peer bug audit's.

## Summary
The Catch-ups library is well-reasoned and heavily commented (`catchups-core.ts` is 613 code lines
and 701 comment lines; `catchup-pictures.ts` 59 and 214). Almost every comment carries a measured
number, a date or an owner quote. **The structural wins are not in comment mass. They are in three
places the code does a thing twice or does a thing for nobody.** (1) The Keeper's "close and send it
out" (`closeAndPublish`) rebuilds by hand the three transitions the clock already applies in
`applyEditionAction`; its own comment says "exactly as the clock's own `applyEditionAction` does it"
(-01, ~80 lines and a bug class). (2) The per-page advance, awaited on every authenticated page,
loads every live Catch-up of the viewer with all its Editions (three round trips) to decide, almost
always, that nothing is due. Narrowing the per-page `where` to "a deadline has passed" makes it one
query that returns nothing (-02). The re-read after every advance can be skipped when nothing
changed (-03, one query per reader view and per heart, comment or autosave). (3) A lot is plumbed
and unreachable: `CatchupPrompt.accepted` has been always-true since 2026-08-05, yet eight queries
filter on it and the home page builds an always-empty "pending" list (-04). The Spotify song path
(-05, owner-held since audit 2) is unreachable. So is the `draft` Edition state (-07). The three
Catch-up features built underneath on 2026-09-14 (vote, voice, time capsule: roughly 1,100 lines of
lib, route and action code plus 820 test lines) have no surface a member can reach (-18). The
magazine engine (2,692 lines of `src/lib` with its test) serves only a lab room and a spike script
(-17). What surprised me: audit 2 found and parked several of these for the rework (D3, D11's
Catch-ups half, `catchups-02`, `catchups-14`). Nothing has moved since the rework's run closed on
2026-09-14, and the unterminated comment in `catchups-core.ts` that audit 2 named is still there,
still swallowing a docblock. Split: 16 structural, 5 cheap. Seven need the owner.

## Findings

### catchups-lib-01 - Let the Keeper's "close and send it out" run the clock's own transition instead of a hand copy of it
- **Where**: `src/app/(main)/catchups/actions.ts:1322-1455` (`export async function closeAndPublish`:
  the too-few branch from `if (shouldExtendForTooFew(edition, entryCount))`, the capsule branch from
  `if (edition.timeCapsule) {`, the publish branch from `const patch = publishPatch(now);`);
  `src/lib/catchups.ts:145-222` (`async function applyEditionAction`, not exported);
  `src/lib/catchups-core.ts:991-1087` (`planNextAction`, its answering-close branch at 1007-1039).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: The three writes in `closeAndPublish` are the three writes `applyEditionAction`
  makes for the clock, clause for clause: (1) extend: `updateMany({ where: { id: editionId, status:
  "answering", remindersSent: edition.remindersSent }, data: patch })` then `notifyAnswersOpen(tx, {
  ..., onlyNonAnswerers: true })` (catchups.ts:181-188 is the same); (2) seal: `updateMany` with
  `timeCapsule: true` in the `where`, `nextOpensAt: addCadenceGap(now, cadence)` when the Catch-up is
  active, then `notifySealed` (catchups.ts:159-176, with `requires: { timeCapsule: true }` and
  `setsNextOpensAt: true`); (3) publish: the same with `timeCapsule: false` and `notifyPublished`.
  The action says so itself: *"The publish and the bell in one transaction, and `nextOpensAt` stamped
  alongside, exactly as the clock's own `applyEditionAction` does it."* The only real differences are
  `excludeUserId: session.user.id` on the seal and publish bells (the Keeper who pressed it is not
  told), the `revalidatePath` calls, and the return shapes.
- **What to do**: (1) In `catchups-core.ts`, lift the answering-close branch of `planNextAction`
  (extend if too few, else seal or publish, with its `requires`) into `export function
  closeAnsweringAction(ed: EditionTiming, entries: number, now: Date): EditionAction`, and have
  `planNextAction` call it when `next` is `published` or `sealed`. (2) Export `applyEditionAction`
  from `catchups.ts` with an optional `{ excludeUserId }` it passes to `notifyPublished`/`notifySealed`.
  (3) `closeAndPublish` keeps its preamble and `entryCount`, then `const action =
  closeAnsweringAction(edition, entryCount, now)` and `applyEditionAction(editionId, edition, action,
  meta, now, { excludeUserId: session.user.id })`, with `meta` built from `edition.catchup`; it
  branches on `action.kind`/`action.to` only for revalidation and the return shape. (4) Move the pin:
  `time-capsule-rule.test.mjs` "the compare-and-swap carries the flag, on the clock and in the
  Keeper's hand" asserts `closeAndPublish` contains both `where: { id: editionId, status:
  "answering", timeCapsule: true|false }` clauses and `sealPatch(` before `publishPatch(`. Rewrite that
  half to assert `closeAndPublish` calls `closeAnsweringAction(` and `applyEditionAction(`; the
  `applyEditionAction` half of the same test (`status: action.from, ...(action.requires ?? {})`)
  already pins the flag.
- **Saving**: ~75-85 lines out of `actions.ts` (the three transaction blocks, ~100 lines, become
  ~15-20), about +10 in the lib; 3 clones of one transition removed. Closes the drift class "the
  Keeper's close no longer matches the clock's close" by construction.
- **Risk & gate**: medium, because this is the publish path. `npm run check` (`time-capsule-rule`,
  `catchup-lifecycle`, `catchups-core`, `batch-catchups`). Then on localhost as Jerry, on a throwaway
  people Catch-up: close with zero answers (it extends, and only non-answerers get a bell), then
  close with answers (published; everyone but the Keeper is told; `nextOpensAt` stamped).
  `npm run verify:crawl`.
- **Confidence**: high on the duplication. Medium on the exact signature (whether `excludeUserId`
  rides on `meta` or in an options argument). The one thing that would change my mind: a side effect
  in `closeAndPublish` that the clock deliberately does not have. I found none besides the exclusion.
- **Notes**: `openAnswering` is deliberately NOT folded in. It counts accepted questions inside its
  own transaction and refuses "empty" (audit C-021), while the clock counts outside the
  transaction. That is a real difference; adopting the in-transaction count on the clock too would
  be a behaviour change and a separate row. `startNextEditionNow` already shares `openNextEdition`
  with the clock, which is the precedent this row follows. The action side is T02's file; coordinate.

### catchups-lib-02 - On the per-page advance, load only Catch-ups whose deadline has passed, not every live Catch-up with all its Editions
- **Where**: `src/lib/catchups.ts:436-534` (`export async function advanceDueCatchups`: the
  `findMany` at 477-500 with `const STALE = ["collecting", "answering"]`, `editions: { some: { status:
  { in: STALE } } }` and `include: { group, editions }`). It is awaited on every authenticated page at
  `src/app/(main)/layout.tsx:102` (`advanceDueCatchups(session.user.id)` inside the `Promise.all`), and
  a second time on the list at `src/app/(main)/catchups/(index)/page.tsx:81`.
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (see Notes on reminder timing)
- **Evidence**: The scoped `where` matches an active Catch-up of the viewer with ANY Edition that is
  `collecting` or `answering`. That is true through the whole ~10-day live window of every Catch-up
  (3 days of questions, 7 of answers). It is true indefinitely for a batch's first Edition waiting for
  three questions (`questionsCloseAt: null`, commit `86fb1f07` 2026-09-22; the Batch of 2023 has 39
  members) and for a dormant Edition (two empty question windows). When it matches, Prisma makes
  three sequential round trips: the parent query, then one per `include` (group; every Edition of
  that Catch-up). No `relationJoins`: `relationLoadStrategy` is absent from the generated 7.10.0
  client. Then `advanceEdition` plans in memory and almost always concludes nothing. It only acts
  when a deadline has passed, or when the reminder bucket turns once a day. The one thing the per-page
  path does that the 02:00 UTC cron (07:30 IST, `vercel.json`) does not: cross a deadline the moment it
  passes, and send the day's reminder in the half hour between 07:00 IST (`DEADLINE_HOUR_UTC_MS`, the
  hour every deadline snaps to) and the cron.
- **What to do**: Keep the unscoped query (cron and admin) exactly as it is, since it is what sends
  the daily reminders. For the scoped call only, replace the STALE arm with "a deadline has passed":
  `editions: { some: { OR: [ { status: "collecting", questionsCloseAt: { lte: graceNow } }, { status:
  "answering", answersCloseAt: { lte: graceNow } } ] } }`, where `graceNow = new Date(now.getTime() +
  TICK_GRACE_MS)`, the same grace `sealedDue` already uses. For example, `const live = userId ?
  deadlinePassed : { status: { in: STALE } }`. Keep the literals `status: "active"`, `...scope`,
  `sealedDue`, `editions: { some: sealedDue }` and `if (!userId) await
  healBatchCatchupsAndMemberships()`, because `catchup-lifecycle.test.mjs` (B-061),
  `time-capsule-rule.test.mjs` and `batch-catchups.test.mjs` pin them by regex. Optional: add
  `prompts: { some: {} }` to the collecting arm so a dormant Edition stops matching; its one-time
  empty-window extension then happens at the cron, at most 30 minutes later for a snapped deadline.
- **Saving**: 2 queries per authenticated page view (3 → 1, and the 1 returns no rows) for every
  member of a Catch-up in its live window, outside the minutes around a deadline. For the Batch of
  2023's waiting Edition, that holds for as long as it waits. The same saving applies again on each
  `/catchups` view, where the sweep runs twice.
- **Risk & gate**: medium-low. `npm run check` (the three pins above). On localhost as Jerry, before
  and after, count the `CatchupSeries`/`CatchupEdition` selects per `/feed` load with Prisma query
  logging. Behaviour to confirm on the demo database: set a test Edition's `answersCloseAt` in the
  past, and the next page view still advances it.
- **Confidence**: medium. The mechanism is certain from the code. The size depends on how many
  members sit in live windows, which the live counters cannot isolate (they are cumulative since
  2026-05-22 and mix old code: `raw/db-statements-live.json`, `CatchupEdition` select 32,576 calls
  and 561 rows). What would change my mind: the owner valuing the daily reminder landing in the first
  page view after 07:00 IST rather than at 07:30.
- **Notes**: The daily reminder keeps its once-a-day cadence, now driven only by the cron. After a
  resume, `shiftEditionPatch` deliberately leaves deadlines unsnapped, so for those the reminder that
  the first page view after the day's boundary used to send now goes at the next 07:30 IST cron:
  still one a day. The layout's reason for awaiting the advance ("the advance is what makes the page
  you are about to read correct") is fully preserved, because every state change a page could show
  is a passed deadline. The layout file belongs to another territory; the function is mine. See -03
  and "For other lenses" (runtime-perf).

### catchups-lib-03 - Stop re-reading an Edition the advance did not change
- **Where**: `src/lib/catchups.ts:241-336` (`advanceEdition` returns `Promise<void>`); the re-reads at
  `src/app/(main)/catchups/actions.ts:316-322` (`loadFreshEdition`: `await advanceEdition(base ...)`
  then `const fresh = await prisma.catchupEdition.findUnique(...)`) and
  `src/app/(main)/catchups/edition/[editionId]/page.tsx` `advanceAndReload` (~142-151).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `advanceEdition` already knows whether it applied anything (`applied` in its loop).
  For a published Edition it applies nothing and makes no query: `computeStatus` returns
  `published`, `nextEditionStatus` is null, and `dueReminder` needs `answering`. That covers every
  reader view, every heart and every comment. The same holds for an answering Edition between
  deadlines. Both callers then re-read the same row with the same select. `loadMemberEdition` →
  `loadFreshEdition` is the preamble of `submitPrompt`, `curatePrompt`, `openAnswering`,
  `closeAndPublish`, `extendDeadline`, `setEditionTimeCapsule`, `submitEntry` (the answer autosave,
  on blur), `toggleEntryLove`, `loadCommentableEntry` (every comment load and write) and `nudgeGroup`.
- **What to do**: `advanceEdition` returns `Promise<boolean>`: `let changed = false; ... if (applied)
  changed = true;`, and it keeps its never-throws contract by returning false from the catch.
  `loadFreshEdition` becomes `const changed = await advanceEdition(base); const fresh = changed ? await
  prisma.catchupEdition.findUnique(...) : base` (its return mapping already rebuilds `catchup`). The
  reader's `advanceAndReload` returns `base` when unchanged. The home page's re-read also carries the
  `prompts` include, so it stays unless that include moves into the first read (T02's call).
- **Saving**: 1 query per reader page view and per Edition-scoped action (each autosave, heart and
  comment load).
- **Risk & gate**: low. Today's re-read could observe another request's write that landed between
  the first read and the re-read. Skipping it only when THIS call changed nothing leaves each
  action's own in-transaction guard in charge, as it already is: C-027's status re-read in
  `submitEntry`, and the CAS in every transition. `npm run check` (`catchup-lifecycle` C-027/C-125,
  and `time-capsule-rule`'s reader ordering `gate < loadPublishedEditionView(`); open a published
  Edition and heart an answer.
- **Confidence**: medium-high. What would change my mind: an action that relies on the re-read to
  see a concurrent writer's change without a CAS of its own. I found none; each writer CASes on status.
- **Notes**: Do it together with -08, which removes `loadMeta`'s fallback in the same function.

### catchups-lib-04 - Retire `CatchupPrompt.accepted` (always true since the approval step died on 2026-08-05), and the two other columns nothing writes
- **Where**: `CatchupPrompt.accepted`. Writers: `actions.ts:1099` (`accepted: true`),
  `src/lib/demo-seed/seed.ts:428` (`accepted: true`); nothing writes `false`, and removing a question
  deletes it (`actions.ts:1242`, `prisma.catchupPrompt.delete`). Filters: `src/lib/catchups.ts:294`,
  `catchups-edition-view.ts:103`, `actions.ts:1083`, `:1157`, `:1210`, `:1284`,
  `admin/catchups/[catchupId]/page.tsx:98`. Guard: `actions.ts:1718` (`if (!prompt || !prompt.accepted)`).
  The always-empty pending list: `catchups/[catchupId]/(home)/page.tsx:231-236` (`const pending =
  promptPool.filter((p) => !p.accepted)`), plus `:215` and `:377`. View fields: `catchups-types.ts:182`,
  `components/catchups/home/types.ts:49`, `(home)/page.tsx:247`, `catchups-export.ts:146`,
  `export-catchups.mjs:250`. `CatchupEdition.theme`: no writer anywhere in `src`; read by
  `admin/catchups/[catchupId]/page.tsx:80`, `:201` (`metaLine(edition.theme, ...)`), exported at
  `catchups-export.ts:155` and `export-catchups.mjs:227`. `CatchupSeries.intro`: written only by
  `src/lib/demo-seed/seed.ts:378`, selected by `admin/catchups/[catchupId]/page.tsx:71` and never
  rendered there, exported at `catchups-export.ts:179`.
- **Phase**: placeholder
- **Tier**: T3     **Class**: structural     **Decides**: owner (the drops) / autonomous (the code, after the SELECTs)
- **Evidence**: `actions.ts:118-124`: *"The companion per-member pending cap is gone: since 2026-08-05
  nothing pends."* `components/catchups/home/types.ts:42` says the same. All three columns are live
  (`raw/db-columns-live.json`). Nothing in the app sets `theme`, and `intro` is only ever the demo's.
- **What to do**: First, read-only on both projects: `SELECT count(*) FILTER (WHERE NOT accepted)
  FROM "CatchupPrompt"; SELECT count(*) FROM "CatchupEdition" WHERE theme IS NOT NULL; SELECT
  count(*) FROM "CatchupSeries" WHERE intro IS NOT NULL;`. If the answers are zero, zero and zero (or
  `intro` only on the demo): delete every `accepted: true` filter, the `!prompt.accepted` half of the
  guard, the pending list and its sort, the `accepted` fields on the four view types, the admin
  page's `theme`/`intro` selects and the `metaLine` argument, the export fields and the seed's two
  writes. Then write a dated drop file for the owner's release, applied after the deploy, per
  `spec.md` §3's two-file rule. It belongs with the rework's pending phase-11 drops.
- **Saving**: ~35 lines across ~10 files; 8 `accepted: true` query clauses; 1 always-empty list; 3 DB
  columns.
- **Risk & gate**: medium if any `accepted = false` row exists (those would be old pending questions
  that would start showing); zero risk if the SELECT is 0. Gate: the SELECTs, `npm run check`, then
  open a collecting Edition's home and the admin reading room.
- **Confidence**: high for `accepted` and `theme`; medium for `intro` (the demo writes it; nobody
  reads it).
- **Notes**: Most call sites are T02's; the data-layer lens owns the drop. The rework's phase 11 already
  holds two drop items (`song*`, `CatchupReminderPref.deletedAt`). One release file should carry
  all five.

### catchups-lib-05 - The Spotify song path: unreachable since link previews, held by the owner for the rework (audit 2 D3)
- **Where**: `src/lib/catchups-core.ts:1319-1391` (`SpotifyResult`, `SPOTIFY_PATH_RE`,
  `resolveSpotify`) and its header mention at :6; `src/lib/catchups-core.test.mjs:693-761` (69 lines);
  `actions.ts:88` (import), `:199` (`songUrl: z.string()...`), `:1687-1695`, `:1734`, `:1745`,
  `:1796-1809` (the 3-second oembed call), `:1843`, `:1852`, `:1901`, `:1955`;
  `src/lib/catchups-export.ts:115-117`; `scripts/dev/export-catchups.mjs:276-278`;
  `src/app/api/account/export/route.ts:220`; the admin reading room's `songTitle` read (audit 2's
  correction); columns `CatchupEntry.songUrl/songTitle/songArt`.
- **Phase**: placeholder
- **Tier**: T3     **Class**: structural     **Decides**: owner
- **Evidence**: The only shipped caller of `submitEntry` is `components/catchups/answer/answer-experience.tsx:128-135`,
  `persist(promptId, patch: { body?: string; images?: string[] })` → `submitEntry({ promptId, ...patch,
  baseUpdatedAt })`, and it never sends `songUrl`. The named-song field stores into `body`
  (`song-attachment.tsx`, `SongNameField`). Since phase 10, pasted song links become cards
  (catchups.md §10.1). Audit 2 counted 0 of 133 entries with a song; the spec says 0 rows carry one.
- **What to do**: Only on the owner's yes (see Owner decisions). Delete `resolveSpotify` and its
  tests; `submitEntry`'s `songUrl` field and branches; the `!entry.songUrl` term in the
  empty-answer check (`actions.ts:1955`); the song fields in both exports and the admin page. Leave
  the columns for the phase-11 drop file. Edit the C-027 pin in `catchup-lifecycle.test.mjs`: its
  `body.indexOf("resolveSpotify") < body.indexOf("catchupEdition.count")` assertion passes vacuously
  once the call is gone, so delete that assertion and keep the rest.
- **Saving**: ~190 lines (audit 2's figure; my count is 73 + 69 in the lib and its test, ~40 in
  actions, ~8 elsewhere); 1 outbound network call on the answer-write path; 1 SSRF boundary that stops
  needing defence.
- **Risk & gate**: low (no row, no caller). `npm run check`; answer a question on localhost.
- **Confidence**: high that it is unreachable. The decision is not mine: the owner answered audit 2's
  Q3 with *"fixing that separately leave it alone"*, recorded as "D3 is DECLINED. The Spotify/song
  pipeline is being handled by the Catch-ups rework campaign. Touch nothing."
- **Notes**: New evidence since then. The rework's phase 11 (the owner of this) has been PARTIAL since
  2026-09-14 and the campaign's run is closed, so nothing has moved. The code half does not depend on
  the column drop: `spec.md` §3 itself prescribes code first and the drop after the deploy. So the
  question to him is only whether the rework still owns it.

### catchups-lib-06 - Delete the reader loader's fields that nobody reads
- **Where**: `src/lib/catchups-edition-view.ts:67` (`export type EditionEntry = CatchupEntryView & {
  authorMeta: string }`), `:128-140` (the author select adds `accountType`, `batchType`, `batchYear`,
  with the 5-line "Hence not `AUTHOR_CARD_SELECT`" comment), `:240` (`authorMeta:
  batchLine(e.author)`), `:45` (the `batchLine` import); `:69-73`, `:100` and `:254`
  (`PublishedEditionView.number` and its select); `:115-116` and `:209-210` (`accepted`, `position`
  copied onto the view); `src/lib/catchups-types.ts:182-183` (`CatchupPromptView.accepted/position`).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `authorMeta` has zero readers anywhere in `src` (grep finds only the loader). Spec
  §7.4: *"An answer is a paper tile ... No timestamps, no batch line."* The one shipped caller
  (`edition/[editionId]/page.tsx:210-216`) maps `view.sections` to `ReaderQuestion` using only `id`,
  `text`, `category` and `askerReading`, plus the entries, and it reads `view.publishedAt`, never
  `view.number`. Lab re-grep: the other caller, `src/app/lab/catchups/sketches/_data.ts:103-216`, reads
  `prompt.asker/showAsker/source/category/text/id` and `entry.createdAt/body/images/photos/links/
  loveCount/lovedByViewer/author`. It does not read `authorMeta`, `accepted`, `position` or `number`
  (it takes the number from its own query).
- **What to do**: Delete `authorMeta` (`EditionEntry` becomes `CatchupEntryView`, or stays as an alias
  for the components that import it), the three author columns, the `batchLine` import and the
  comment explaining the column choice. Drop `number` from the select and from `PublishedEditionView`.
  Drop `accepted` and `position` from `CatchupPromptView` and its mapping. The `where: { accepted:
  true }` and the `orderBy` on `position` stay until -04 settles the column.
- **Saving**: ~15 lines; 3 columns for every answer (141 today) on every reader page view; one string
  build per answer.
- **Risk & gate**: low. `npm run check`; open a published Edition; open `/lab/catchups/sketches`.
- **Confidence**: high.
- **Notes**: A larger optional step (T3) would have the loader return the reader's own shape
  (`ReaderQuestion`), deleting `CatchupPromptView` (19 lines), the page's mapping (~8 lines) and the
  `ReaderAsker` alias. The lab adapter would then have to derive `asker/showAsker/source` from its own
  query, which is a lab-room edit in T15's territory. The loader's header is stale too; it is in -15.

### catchups-lib-07 - Remove the `draft` Edition state that nothing creates
- **Where**: `src/lib/catchups-types.ts:32` (the union); `src/lib/catchups-core.ts:179` and `:191`
  (`STATUS_ORDER`, `CAPSULE_ORDER`), `:615-617` (the draft sentence in `decideTimeCapsuleMark`),
  `:656-667` (`computeStatus`'s docblock and `s === "draft"`), `:1065-1074` (`planNextAction`'s generic
  step, *"e.g. a staged draft opening"*), `:1190-1191` (`describeEditionStatus` "Draft"), `:1310-1315`
  (`catchupStageLine`'s default "Not open yet"); `src/components/catchups/edition/not-yet-published.tsx:37`;
  `src/app/(main)/catchups/(index)/page.tsx:161-162` (the `?? "draft"` priority fallback);
  `prisma/schema.prisma` status comment `// draft|collecting|answering|sealed|published`; tests
  `catchups-core.test.mjs:92-99`, `:687`, and the `"draft"` entry in `time-capsule-rule.test.mjs`
  "when: only while collecting questions".
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: catchups.md §3.1: *"`draft` is still in the type, but nothing creates one; every path
  opens straight into `collecting`."* The core's own comment at 1310-1313 agrees: *"Nothing creates one
  today ... and the live database holds none."* All three creation paths write `status: "collecting"`
  (`createCatchupWithPeople`, `ensureBatchCatchup` at batch-catchups.ts:177, `openNextEdition` at
  catchups.ts:379). No migration adds a status CHECK.
- **What to do**: `SELECT count(*) FROM "CatchupEdition" WHERE status = 'draft'` on both projects
  (expect 0). Remove `"draft"` from the union and both orders. Delete `planNextAction`'s generic branch
  (only draft → collecting ever reached it) and end the `if (next)` block with an exhaustive `never`
  check instead. Drop the draft cases in the three copy helpers and `not-yet-published.tsx`, and give
  the list page a literal rank. Update the two tests.
- **Saving**: ~25 lines plus 2 test cases; one state out of the machine.
- **Risk & gate**: low if the SELECT is 0. `npm run check`; tsc's exhaustiveness does the rest.
- **Confidence**: high.
- **Notes**: none.

### catchups-lib-08 - Make `advanceEdition`'s Catch-up context required: its fallback query is unreachable and its "active" default is a trap (audit 2 D11, `catchups-06`)
- **Where**: `src/lib/catchups.ts:64-73` (`AdvanceEditionInput.catchup?:` with every field optional),
  `:107-135` (`loadMeta`: the `?? "monthly"` / `?? "active"` defaults and the fallback
  `prisma.catchup.findUnique`), `:246-247` (`if (!meta) return;`).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: All four callers already pass cadence, status and group: `advanceDueCatchups`
  (catchups.ts:508, `catchup: { id: c.id, cadence: c.cadence, status: c.status, group: c.group }`),
  `loadFreshEdition` (actions.ts:297-313), the reader page (`LIGHT_EDITION_SELECT` includes
  `catchup.cadence/status/group`), and the home page (`advanceInput`, ~135-148). So the fallback query
  never runs. The `?? "active"` default is the hazard audit 2 named: a future caller that forgets
  `status` would advance a paused Catch-up past B-061's gate (`meta.catchupStatus !== "active"`).
- **What to do**: Type it as `catchup: { cadence: string; status: string; group: { id: string; name:
  string } }` (required). `loadMeta` becomes a synchronous mapping without defaults, or is inlined.
  Delete the fallback and `if (!meta) return;`. Drop the `as AdvanceEditionInput` casts where the
  widened `status: string` makes them unnecessary.
- **Saving**: ~20 lines; 1 unreachable query; a type now enforces what a default was quietly assuming.
- **Risk & gate**: low; tsc refuses any caller that omits the context. `npm run check` (B-061's regex is
  untouched).
- **Confidence**: high.
- **Notes**: Audit 2's D11 shipped "bar its Catch-ups halves" on 2026-09-07 because the rework was in
  flight. This is that half. Pairs with -03.

### catchups-lib-09 - One source of truth for the vocabularies `actions.ts` still retypes (audit 2 `catchups-02`, the column half of `catchups-09`)
- **Where**: `src/app/(main)/catchups/actions.ts:128-131` and `:140` (`CADENCE_VALUES`,
  `REMINDER_MODE_VALUES`, their `z.enum`s), `:2281-2294` (`CATCHUP_NOTIFICATION_TYPES`), `:268-287`
  (`EDITION_COLUMNS`); against `src/lib/catchups-types.ts:35-41` (the `Cadence` and `ReminderMode`
  unions) and `:97-106` (the `CatchupNotifyKind` union), and `src/lib/catchups.ts:75-85`
  (`EDITION_TIMING_SELECT`, *"Exported so an action reading an edition for `shiftEditionPatch` selects
  exactly the same set"*). Also `src/components/layout/notification-bell.tsx:62-66` ("the five
  Catch-up kinds": there are seven).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The types file argues the fix itself, in `PROMPT_CATEGORIES`'s docblock: *"This ARRAY,
  not the union, is the source of truth ... `catchups/actions.ts` used to keep its own hand-written Zod
  enum, which went stale the day the library was rewritten ... Deriving the union from the array means
  a set can never again be in the library but absent from the validator."* Three other vocabularies are
  still written twice. `EDITION_COLUMNS` already needed a hand edit for phase 14 (its comment: *"Build
  phase 14: the flag decides whether the close publishes or seals ... so it is read every time"*),
  which is exactly the drift `EDITION_TIMING_SELECT` was exported to prevent.
- **What to do**: In `catchups-types.ts`: `export const CADENCES = ["biweekly", "monthly", "quarterly"]
  as const; export type Cadence = (typeof CADENCES)[number];`, and the same for `REMINDER_MODES` and
  `CATCHUP_NOTIFY_KINDS`. `actions.ts` imports them (`z.enum(CADENCES)`, `type: { in:
  [...CATCHUP_NOTIFY_KINDS] }`). `EDITION_COLUMNS = { ...EDITION_TIMING_SELECT, id: true, catchupId:
  true, number: true, sealedAt: true }`. Move two pins. `comment-target-rule.test.mjs:125-129` slices
  `const CATCHUP_NOTIFICATION_TYPES` out of actions.ts to find `"catchup_comment"`; point it at the
  shared array. `time-capsule-rule.test.mjs` "the bell never carries a word of a sealed Edition"
  asserts actions.ts matches `/"catchup_sealed",/`; point it at `catchups-types.ts`. Fix the bell's
  "five".
- **Saving**: 0-10 lines; 4 hand-kept copies gone; a drift class closed (it has already happened once,
  for the categories).
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.
- **Notes**: Audit 2's E12 left `catchups-02` PARKED ("a peer session is rebuilding Catch-ups in this
  tree"), and `catchups-09` was parked with it. That run is closed, so both are unblocked. The other
  halves of `catchups-02` (the cadence prop drills in components) and of `catchups-09` (the
  membership lookup, still written in `actions.ts:241` `loadMembership`, the reader page's own
  `loadMembership`, the home page inline, and the join page) are T02's.

### catchups-lib-10 - Let the export script import what it retypes, and use or delete the two export helpers nobody calls
- **Where**: `scripts/dev/export-catchups.mjs:87-98` (`kindOf`, *"`promptKind` from
  src/lib/catchups-types.ts, which this .mjs cannot import through the TS path alias"*), `:187`
  (`version: 1`), `:303-317` (the totals); `src/lib/catchups-export.ts:208-231` (`everyAnswer`,
  `exportTotals`: no consumer anywhere since they were written in `1036a81b`, 2026-09-05), `:74`, `:87`
  and `:93` (`ExportedMembership`, `ExportedPref`, `ExportedImage` exported but used only inside the
  file; knip, `raw/knip-repo-plus-lab.txt:226-228`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Scripts already import `.ts` from `src/lib` by relative path under Node's type
  stripping: `scripts/dev/import-album.mjs:86-94` imports five `src/lib/*.ts` modules. The comment is
  right about the alias and wrong about the file. `catchups-types.ts` has only `import type` lines
  (erased at load), so `promptKind` loads, and `catchups-export.ts` imports only types.
- **What to do**: In the script, `import { promptKind } from "../../src/lib/catchups-types.ts";` and
  `import { CATCHUP_EXPORT_VERSION, exportTotals } from "../../src/lib/catchups-export.ts";`. Delete
  `kindOf`, use the constant, and print `{ ...exportTotals(out), prefs, filesToCopy }`. The script calls
  it `memberships` where the helper says `members`; pick one. Delete `everyAnswer` if nothing else wants
  it. Drop the `export` on the three internal types. Move the pin at `vote-question-rule.test.mjs:34`,
  which asserts the script contains `/category === "vote"/` ("the export mislabels a vote's kind"),
  so it asserts the script imports `promptKind`. That is the stronger guarantee.
- **Saving**: ~25 lines; 1 drift site (`promptKind`) closed; the version constant has one home.
- **Risk & gate**: low. The script is read-only against Postgres and dry by default. The fix session runs
  `node scripts/dev/export-catchups.mjs` (dry) before and after and compares the totals block.
- **Confidence**: high.
- **Notes**: Found while reading, for the bug lens rather than this one. Recordings are queued under
  `audio/` (`wantPhoto(e.audioUrl, "audio", e.id)`, :286), but only `photos/` and `avatars/` are
  created (`:336-339`), so every recording's copy fails with ENOENT and lands in `failed`. The
  post-copy pass then nulls `file` for images and avatars but not for `audio.file`, so a failed copy
  keeps a path that does not exist. This is latent, since no member can record yet (-18). The dry-run
  print still says Round (`R${r.number}`, `:321`).

### catchups-lib-11 - Write the notify builders as plain functions, and fold their two repeated steps
- **Where**: `src/lib/catchups-types.ts:237-335` (`CatchupDb`, `NotifyBaseCtx`, seven `Notify*Fn` types;
  header `:8-9`, *"declared here so WP2 and WP7 can compile against them independently of the notify
  implementation"*); `src/lib/catchups-notify.ts:26-36` (the imports), `:102`, `:116`, `:158`, `:209`,
  `:234`, `:251`, `:310` (`export const notifyX: NotifyXFn = async (db, ctx) =>`). The "everyone but
  the actor" step at `:103-105`, `:117-120`, `:210-212`, `:235-237`; the "still a member" step at
  `:266-269` and `:318-321`, each with its own copy of the C-030 reasoning.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Each `Notify*Fn` type has exactly one consumer (grep: `catchups-notify.ts` only). WP2
  and WP7 were the July build's parallel work packages. Nothing compiles against these separately any
  more.
- **What to do**: Write `export async function notifyX(db: CatchupDb, ctx: { ... })` with each ctx
  shape, and its doc comments, moved onto the parameter. Move `CatchupDb` into `catchups-notify.ts`
  (its only user), or use the shared type in -20. Fold `excludeUserId` into `createMany(db, ids, type,
  message, link, exclude?)`, and add one `isStillMember(db, groupId, userId)` carrying one C-030
  comment. Three pins read these builders by shape and must move with them: `comment-target-rule.test.mjs:136-141`
  (slices `export const notifyComment` to `\n};`), `catchup-lifecycle.test.mjs` C-030 (finds `export
  const notifyLove` and regex-matches the literal `groupMember.count({ where: { groupId: ctx.groupId,
  userId: ctx.authorId } })`), and `time-capsule-rule.test.mjs` (finds `export const notifySealed`).
  Re-anchor them on `export async function notifyX` and on the helper's call.
- **Saving**: ~35-45 lines; 7 single-use types gone. `catchups-types.ts` loses its only reason to
  import `Prisma`/`PrismaClient`.
- **Risk & gate**: low; tsc checks every call. `npm run check`.
- **Confidence**: high.
- **Notes**: The notify path answers charter question 3. It writes bell rows only and sends no email,
  and every Catch-up bell row is written through this one module (grep: the only other
  `notification.*` writes in Catch-ups code are the two deletes in actions.ts, `:1582` for stale
  reminders after an extension and `:2317` in `clearCatchupNotifications`). So "one canonical path"
  still holds.

### catchups-lib-12 - Delete the dead exports and types (includes audit 2 `catchups-05`)
- **Where**: `src/lib/catchups-types.ts:221-235` (`CatchupIndexCard`: 0 consumers since `5e688bb4`,
  2026-09-08, "the list becomes a shelf"; it models the old index's "Start one" row).
  `src/lib/catchup-pictures.ts:146-157` (`bandKeptFraction`: its docblock says *"Exported because the
  aiming control has to say it out loud"*, but no component imports it, and since it was written in
  `02f9302f` its only consumer has been `catchup-pictures.test.mjs:177-183`; the one aiming UI,
  `picture-picker-dialog.tsx`, is itself an unused file per knip). `src/lib/catchups-core.ts:106-107`
  (`REMINDER_TWO_DAYS`, `REMINDER_LAST_DAY`, *"legacy: superseded by the daily bucket"*; used only as
  example bits in `catchups-core.test.mjs:270`) and `:82` (`HOUR_MS`, exported, used only by tests).
  `export` keywords with no outside consumer (knip, lab entries included): `PICTURE_FOCUS_PATTERN`
  (catchup-pictures.ts:284), `VOICE_MIN_SECONDS`, `VOICE_CONTAINER_SLACK_BYTES`, `VOICE_FORMATS`,
  `STAGED_VOICE_KEY`, `STORED_VOICE_KEY` (voice-answer-rule.ts:21-155), `isStoredVoiceUrl`
  (voice-answer.ts:15), `MAX_CHOICE_ID` (vote-question-rule.ts:81), `EditionPatch`
  (catchups-core.ts:782).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: The knip lines are in `raw/knip-repo-plus-lab.txt:111-117` and `:200-206` and
  `:226-229`. I confirmed each with grep across `src` and `scripts`, the lab included.
- **What to do**: Delete `CatchupIndexCard`. Delete `bandKeptFraction` and its test block, or keep its
  arithmetic as one comment line under `PICTURE_BAND` (the handover's "58% to 90%" safe zone came from
  it). Delete the two legacy constants and give the test literal bits `1 | 2`. Drop `export` from the
  internal-only symbols. Do NOT drop `export` from `ensureBatchCatchup` and `healBatchCatchups*`:
  knip lists them too, but `batch-catchups.test.mjs` finds them by the text `export async function
  ensureBatchCatchup` / `healBatchCatchupsAndMemberships`.
- **Saving**: ~40 lines (15 + 19 with the test + 4 + small); ~12 exports narrowed.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.
- **Notes**: `CatchupIndexCard` is the rest of audit 2's D11 Catch-ups half (`catchups-05`), skipped on
  2026-09-07.

### catchups-lib-13 - Fold `catchupShelf` into its one caller now that the bin is gone
- **Where**: `src/lib/catchup-shelf.ts:1-28` (header, the `CatchupShelf` and `CatchupCopyState` types,
  `catchupShelf`); the caller `src/app/(main)/catchups/(index)/page.tsx:148` (`archived:
  catchupShelf(group.catchup.prefs[0] ?? null) === "archived"`); tests `catchup-shelf.test.mjs:7-28`.
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: It was a three-way classifier (list, archived, the thirty-day bin). Phase 5 deleted the
  bin, and the function is now `pref?.archivedAt ? "archived" : "active"`. Its one caller asks
  `=== "archived"`. The other `CatchupShelf` in the tree is a component of the same name
  (`catchup-shelf-view.tsx:98`), not this type.
- **What to do**: `archived: Boolean(group.catchup.prefs[0]?.archivedAt)` at the caller. Delete
  `catchupShelf`, both types, the bin-history header (5-11) and the three tests; the first two test the
  one-liner, and "the thirty-day bin is gone, not hidden" guards a column no query selects. Keep
  `LIST_GRID_SLOTS` and `editionSlots` with their tests.
- **Saving**: ~20 lib lines and ~22 test lines.
- **Risk & gate**: low. `npm run check`; archive and restore a Catch-up on `/catchups`.
- **Confidence**: high.
- **Notes**: Signatures 1 and 2 (a single-use helper, and types used once).

### catchups-lib-14 - One spelling for "Keeper" on a membership row: the reason for two died with group posts
- **Where**: `src/lib/catchups-core.ts:431-455` (`isEffectiveKeeper` and its docblock, *"`"admin"` is
  the GROUP's admin role, and it is read outside this feature: `deletePost` in `feed/actions.ts` lets a
  group admin delete anyone's post in that group"*); `actions.ts:2688-2697`, `:2719-2726` and
  `:2736-2739` (`setCatchupKeeper`'s docblock and its revoke, scoped to `role: "keeper"`). Writers of
  `"admin"`: `actions.ts:511` (the creator's row), `src/lib/account-purge.ts:46-80` (`promoteOrphanedGroups`
  writes `role: "admin"`), `src/app/(main)/admin/people/actions.ts:388`. Writers of `"keeper"`:
  `setCatchupKeeper`, and `group-succession.ts:80-83` (`promoteGroupSuccessor`). Readers:
  `chooseGroupSuccessor`, `promoteOrphanedGroups`, the export's `isKeeper`, and the lab's `_data.ts`
  (`m.role === "admin"`). Also the schema comment `// "admin" | "member"` and catchups.md §2.2.
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: owner
- **Evidence**: `feed/actions.ts` `deletePost` now checks only the site role
  (`post.authorId === session.user.id || session.user.role === "admin"`, ~460). `Post.groupId` was
  dropped on 2026-09-08 (`c34aae3e`). Group and GroupMember are read by Catch-ups code, the purge,
  the admin people merge and the demo, and nothing else (grep: 13 non-lab files). So `"admin"` on a
  membership now means exactly "Keeper", and the decoupling three docblocks defend protects nothing.
  What remains is an inconsistency. A successor chosen when someone leaves or is removed gets
  `"keeper"`, which another Keeper can revoke. A successor chosen by the account purge gets
  `"admin"`, which `setCatchupKeeper` cannot revoke, because its revoke is scoped to `role:
  "keeper"` and reports "they hold the group's own admin role".
- **What to do**: The full version: `SELECT role, count(*) FROM "GroupMember" GROUP BY role` on both
  projects; a dated migration `UPDATE "GroupMember" SET role = 'keeper' WHERE role = 'admin'`; every
  writer writes `"keeper"`; readers test `"keeper"` only; delete the decoupling paragraphs; update
  §2.2 and the schema comment. The minimal version (hygiene only): correct the three docblocks to
  say `"admin"` is an older spelling of Keeper, written at creation, by the purge and by the admin
  merge, and make `promoteOrphanedGroups` write `"keeper"` like `promoteGroupSuccessor`.
- **Saving**: ~30 comment lines; one spelling; one divergent successor write.
- **Risk & gate**: medium (it rewrites live membership rows). The only visible change is that a
  purge-promoted Keeper becomes removable by another Keeper. `npm run check`
  (`group-succession.test.mjs`, `time-capsule-rule`'s `mayMarkTimeCapsule` cases use `groupRole:
  "admin"` for the maker).
- **Confidence**: high on the facts; the decision is his.
- **Notes**: `promoteOrphanedGroups` (account-purge.ts:46-80) is a batched re-implementation of
  `promoteGroupSuccessor` with a different role. It belongs to the purge's lens, but if the owner says
  yes, one helper should serve both.

### catchups-lib-15 - Fix the comments that describe deleted code or point the wrong way (audit 2 `catchups-14`)
- **Where** (each item is independent):
  1. `src/lib/catchups-core.ts:37-70`: a block opened at 37 with `/* ----` that never closes until
     the `*/` meant for `askerVisible`'s docblock at 70. Its text, *"Why the runtime deps (prisma, the
     notify builders) load via dynamic import instead of a static `import` ... Do NOT convert these
     back to static imports"*, describes code deleted by `9f9a1fd8` (2026-08-27, "split the pure engine
     from the drivers"). Neither file contains an `import(` any more (grep), and `catchups.ts:8-16` says
     the opposite. Because the block swallows the `/**` at 52, `askerVisible` has no JSDoc in editor
     hovers. Audit 2 found exactly this (report §5: "a 14-line block in `catchups-core.ts` opened with
     `/* ---` and never closed").
  2. `catchups-core.ts:1209-1229`: `catchupStageLine`'s docblock ("The ONE line written under a
     Catch-up's name on the list") sits above `homeStateLine`'s docblock and function, and
     `catchupStageLine` (1278) has none.
  3. `src/lib/catchups.ts:224-239`: `advanceEdition`'s docblock is separated from its function by a
     tombstone for the deleted `restoreOwnCatchupCopy`, whose story `catchup-lifecycle.test.mjs` ("C-020
     is closed by deletion") already tells and pins.
  4. `src/lib/catchups-notify.ts:1-22`: the header says "the six Catch-up triggers in catchups.md section
     5" (there are seven, in §11), "minus anyone who has deleted their own copy (B-063; see
     `groupMemberIds`)" (the bin is gone, and `groupMemberIds`'s own docblock says so), "the two dated
     reminders" (daily since 2026-08-05), and "All copy is placeholder". catchups.md §15 already lists
     this header as drift. Also `:263-265`, a second tombstone for the bin in `notifyLove`.
  5. `src/lib/catchups-edition-view.ts:1-33`: *"An Edition is read on two surfaces, inline on the
     Catch-up home ... and at its own permalink"* (the home draws covers; only the reader calls the
     loader); the song-rule story at 4-19 (the select has had no song columns since phase 10, :125-126);
     and "spec 2.5, threat T-catchups-04" (the July spec). The same stale "shared with the home" claim
     is in T02's `edition/[editionId]/page.tsx:199-202` and `components/catchups/edition/reader-types.ts:1-11`.
  6. `src/lib/group-succession.ts:1-13` and `:33-52`: both docblocks are attached to the TYPES
     (`GroupMemberRow` :14, `SuccessionDb` :53) instead of the functions (:16, :66); `:10` cites
     "docs/spec/catchups.md §7" (July); `:42` says "the nightly sweep emptying a bin" (deleted in phase
     5; `group-succession.test.mjs:138-148` records that).
  7. `src/lib/catchups-types.ts:8-9` ("WP2 and WP7", goes with -11) and `:189` ("`askerVisible()` in
     catchups.ts is the one authority": it lives in catchups-core.ts).
  8. Stale July-spec citations (catchups.md §15 lists several): `catchups-core.ts:63` and `:65`
     (`catchups.md:257`, `:825`), `:79` ("spec section 2.3"), `:105` ("spec section 2.4"), `:203` ("spec
     section 4"), `:433` ("spec section 7"), `:780` ("the WP2 actions"); `catchups.ts:423` ("spec section
     2.4"); `catchups-notify.ts:13` and `:21`. Citations of `spec.md`'s sections (for example "spec section
     3.3", "spec 10.2") are the rework spec and are fine.
  9. The magazine: `grammar.ts:265-268` (`galleryBlock`'s docblock sits above `GALLERY_MIN_MM`);
     `grammar.ts:275-279` says *"The tallest a gallery row may be: 22 rows ... at 22 rows they are 66
     mm"* while `GALLERY_MAX_ROWS = 17`; `paginate.ts:180-183` (`layColumns`'s docblock sits above
     `takeBackOpener`'s); `types.ts:248-249` (the contents comment sits on the `cards` variant).
  10. `settings-surface.tsx:162-165` (T02's file) says `CADENCE_LABELS` "heads a column in the admin
     room"; it does not (see -21).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: As listed. For the house's rule, one of each kind. Bloat: *"Do NOT convert these back
  to static imports."* It describes deleted code and tells the next session to do the wrong thing. Not
  bloat: the `DEADLINE_HOUR_UTC_MS` block (catchups-core.ts:316-343), which carries a measured reason
  (the cron runs at 02:00 UTC, which is 07:30 IST, so a 07:00 IST deadline is picked up "within thirty
  minutes"). The rest of the file is mostly that kind.
- **What to do**: Delete 37-51 in `catchups-core.ts` so `askerVisible`'s `/**` becomes a real JSDoc.
  Move the three displaced docblocks down to their functions. Delete the two tombstones that tests
  already carry. Rewrite the notify and edition-view headers in ~8-12 lines each, keeping the
  SECRECY and phase-14 paragraphs of the latter. Re-point or drop the July citations. Fix the
  `GALLERY_MAX_ROWS` comment to 17.
- **Saving**: ~80-100 comment lines; 5 docblocks re-attached, so editor hovers show them.
- **Risk & gate**: nil. No pin reads these comments: the tests `decomment()` before matching, and the one
  raw `read()` of a notify file matches code. `npm run check`.
- **Confidence**: high.
- **Notes**: Audit 2's F unit 1 (stale comments) is DONE for every territory except Catch-ups, whose
  files belonged to the rework's session at the time. This is that remainder, grown.

### catchups-lib-16 - If the magazine engine stays: trim its unused public surface and its internal repeats
- **Where**: `src/lib/magazine/index.ts:324-325` (re-exports `A4, textWidthMm, rowsPerPage` and six
  types: 0 consumers; knip `:166-168`, `:232-235`); `grammar.ts:694-696` (`export { estimateLines,
  ratioOf }` "so a renderer can compare": 0 consumers); `from-export.ts:75` (`sourceFromExport`, used
  only inside). About 60 thresholds and helpers are exported *"so the room can print it and a test can
  pin it"* (grammar.ts:11-13, score.ts:25-26); the room prints none (knip with lab entries,
  `raw/knip-repo-plus-lab.txt:130-193`). `paginate.ts:146-153`, `:203-211`, `:272-279` and `:297-305`
  repeat four times the sequence "take back the headline, fill the gap, start a page, restore the folio,
  put the headline back". `paginate.ts:215-216` and `:237-239` (`columns`/`heights` initialised and then
  overwritten; a `splitOne` flag read once). `measure.ts:90-94`, `measure.ts:99-102` and
  `paginate.ts:95-100` are three spellings of characters-per-line. `grammar.ts:459` re-derives
  who-chose-what inline, which is the one job `voteResult()` in vote-question-rule.ts exists for.
  `from-export.ts:28-29` (`(img as { width?: number | null }).width`, where `ExportedImage` already
  declares `width` and `height`). `from-export.ts:113` (`catchup.title ?? catchup.groupName`,
  `catchupDisplayName` without its trim). `scripts/dev/print-magazine.mjs:215`: `if
  (!existsSync(path.join(OUT, "report.json"))) process.exit(1);` runs directly after
  `writeFileSync` of that file, so it can never fire. `print-magazine.mjs:49`: a hand list of fixture
  keys that duplicates `magazine.test.mjs:36`.
- **Phase**: dead
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous (only if -17 keeps the engine)
- **Evidence**: As listed; knip lines cited.
- **What to do**: Drop the re-exports and the unused `export`s. Write one `breakPage(l, paper,
  running)` helper in paginate.ts and call it four times. Use `voteResult` in the vote template, or
  keep the one-liner and cite it. Remove the two casts and the dead exit.
- **Saving**: ~35-50 lines; ~60 exports narrowed.
- **Risk & gate**: low. `node --test src/lib/magazine/magazine.test.mjs` (178 checks) and `npm run
  check`; open `/lab/catchups/magazine`.
- **Confidence**: high.
- **Notes**: Otherwise the engine is dense rather than bloated (grammar.ts is 484 code lines to 172
  comment lines). `columnsOf` (grammar.ts:541-692: 150 lines, five closures, six levels deep) is the
  one place I would want more tests before touching. The test is a faithful spec of invariants, not of
  layouts, so I do not recommend a rewrite before M2.

### catchups-lib-17 - The magazine engine lives in `src/lib` but only a lab room and a spike script use it
- **Where**: `src/lib/magazine/**` (8 files, 2,396 lines, plus the 296-line test). Consumers:
  `src/app/lab/catchups/magazine/{page.lab.tsx,_room.tsx,_pages.tsx,_live.ts,_measure.ts}` and the test,
  which imports the lab fixture loader `src/app/lab/catchups/_fixtures/magazine/corpus.ts`.
  `scripts/dev/print-magazine.mjs` drives the lab room through Chrome and imports nothing from the
  engine. `src/lib/catchups-export.ts` (232) is consumed only by lab files and the engine.
- **Phase**: relocate
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: Import trace (grep of `lib/magazine` across `src`, `scripts` and `e2e`). One commit
  (`35b75868`, 2026-09-14), untouched since. The handover board says "M1 Magazine design | DONE" and "M2+
  Magazine build | OPEN". magazine.md §8: *"Nothing after M2 starts until he has looked at a real
  Edition's PDF"*, and for M2, *"The engine moves nothing"*, so `src/lib` is its planned home.
  Handover D39: *"the magazine's existence is his wish and its schedule is ours."* What it costs today:
  nothing in a member's browser (only a lab route imports it, and the demo build drops the lab), about
  2,700 lines of `src/lib`, and a test that lays out at least 16 Editions twice at module load on every
  `npm run check`. On the owner's machine that test also lays out the real export
  (`corpus.ts:50-61` reads `scripts/dev/.exports/catchups/<latest>`). The 18,632 lines of fixture JSON
  are T15's.
- **What to do**: One of three, his call. (a) Keep it as it is, waiting for M2. (b) Move the engine and
  its test under `src/app/lab/catchups/magazine/_engine/`, so `src/lib` holds only shipped code; M2 moves
  it back. The test still runs, because `check.mjs` walks all of `src/`. (c) Archive the engine, room,
  fixtures and printer to git history with a pointer in magazine.md, and restore them when M2 starts.
- **Saving**: (b) 2,692 lines out of `src/lib`, net 0. (c) ~3,900 lines of TS/JS, plus the fixtures and
  the magazine test's share of check time (T14 to measure).
- **Risk & gate**: (b) low; (c) low and reversible with one revert. `npm run check`; the lab registry
  audit if (c) removes the room.
- **Confidence**: high on the facts.
- **Notes**: The brief calls `index.ts` "a 325-line barrel"; it is not. It holds `layoutMagazine` and the
  beam search, and its two re-export lines are the only barrel-like part (-16).

### catchups-lib-18 - Vote, voice and time capsule are built underneath and unreachable, waiting for his pick since 2026-09-14
- **Where**: Vote: `src/lib/vote-question-rule.ts` (175) and its test (243), `submitPrompt`'s choices
  and `submitEntry`'s `pollOptionId` paths in actions.ts, `CatchupPromptOption` (0 live rows, 4 dead),
  `CatchupEntry.pollOptionId`. Voice: `voice-answer-rule.ts` (239), `voice-answer.ts` (35), the test
  (213), `/api/upload/audio` (85) and `/finalize` (91), `submitEntry`'s audio path, three
  `CatchupEntry` columns, the `microphone=(self)` Permissions-Policy and the CSP `media-src` in
  `next.config.ts`. Capsule: in `catchups-core.ts`, `CAPSULE_ORDER`/`orderFor`,
  `IST_OFFSET_MS`/`capsuleOpensAt`, `mayMarkTimeCapsule`/`decideTimeCapsuleMark`, `sealPatch`, the
  sealed branches of `computeStatus`, `planNextAction`, `describeEditionStatus`, `homeStateLine` and
  `catchupStageLine`, and the `requires` compare-and-swap (~170 lines); `catchups.ts`'s `sealedDue` and
  the sealed exception (~25); `notifySealed` and its type (~35); `setEditionTimeCapsule` in actions
  (knip: exported, never imported) and `closeAndPublish`'s seal branch; `time-capsule-rule.test.mjs`
  (367), which pins shapes across nine files; three columns and a CHECK.
- **Phase**: placeholder
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: The shipped answering surface sends only `body` and `images`
  (`answer-experience.tsx:128-135`). Nothing outside the lab calls `/api/upload/audio` (grep).
  `actions.ts:204`: *"NOTHING SENDS THIS YET"*. catchups.md §16: *"No surface asks, casts or shows a
  vote yet"*, *"No surface records or plays yet"*, *"No surface marks, shows or opens one yet"*. The
  drawings at `/lab/catchups/{vote,voice,capsule}` are waiting for his pick. `voteResult()`, the only
  function that turns votes into a result, is called only by tests.
- **What to do**: His decision (see Owner decisions). If he parks them, one revertable commit per
  feature removes lib, routes, actions branches and tests, and a later drop file retires the columns.
  If he picks, nothing here changes.
- **Saving if parked**: about 1,100 lines of lib, route and action code, about 820 test lines, 1
  table, 7 columns, 1 CHECK, 1 composite foreign key, 2 API routes, and one browser permission
  narrowed back.
- **Risk & gate**: low either way; everything is additive and unreachable.
- **Confidence**: high on reachability.
- **Notes**: The carrying cost is real even while nobody uses them. Any change to the Catch-up clock,
  the readers or `submitEntry` has to keep `time-capsule-rule.test.mjs`'s nine-file walk and the vote
  and voice pins green. The default is keep, because he asked for all three and they are close to
  done.

### catchups-lib-19 - The Group layer under Catch-ups: propose folding it into a Catch-up membership table (not now)
- **Where**: `prisma/schema.prisma` (`model Group`, `model GroupMember`); `src/lib/batch-catchups.ts`
  (`joinBatchGroup`, `healBatchGroupMemberships`, `ensureBatchCatchup`); `src/lib/group-succession.ts`;
  `account-purge.ts`'s `promoteOrphanedGroups`; every `group: { members: { some: { userId } } }`
  membership join (`layout.tsx:99`, `catchups.ts:446`, the list, home and reader pages, and actions'
  `loadMembership`).
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: Group and GroupMember are read only by Catch-ups (grep: 13 non-lab files: Catch-ups,
  the purge, the admin merge, the demo). `Catchup.groupId` is unique, so the relation is 1:1. Live:
  24 groups, 257 memberships, 8 Catch-ups (`raw/db-tables-live.json`). Most groups are batch groups
  under the floor, with no Catch-up, kept as a materialised copy of `User.batchYear` so the floor can
  count them. That copy drifts. A member who corrects their batch year in the profile keeps the old
  membership (`profile-actions.ts:228-246` writes only `batchYear`/`batchType`), and the nightly heal
  adds the new one. They then sit in two batches' Catch-ups and cannot leave either
  (`BATCH_LEAVE_REFUSAL`). The layout's `hasCatchup` check compiles to `CatchupSeries LEFT JOIN "Group"
  ... WHERE EXISTS (SELECT ... FROM "GroupMember" ...)` (8,021 calls since it landed,
  `raw/db-statements-live.json`).
- **What to do**: Proposal only, not a recommendation. Add `CatchupMember(catchupId, userId, role,
  joinedAt)` replacing GroupMember, possibly absorbing `CatchupReminderPref`. The Catch-up gains `name`
  and `batchYear`. The batch floor counts `User` rows by batch year. A batch Catch-up's memberships
  are written when it is created (a backfill) and at each signup. Group and GroupMember drop. Payoff:
  one join fewer in every membership query (the per-page ones included), one or two tables fewer, no
  materialised rows for batches under ten, and the batch-year drift has one place to be fixed. Cost:
  the largest migration Catch-ups has had, on the one live database, touching most of actions.ts
  (2,821 lines), the pages, the admin room, the purge, the demo seed and both exports. The rework
  spec §14 fenced "the refactor pass" out (¶20, *"We don't have to refactor the catch-ups portion
  yet"*).
- **Saving**: 1-2 tables, 1 join per membership query, ~200 lines net (a guess; the rewrite touches
  far more than it removes).
- **Risk & gate**: high. Needs its own session, the export (`spec.md` §3.1), and a verify:crawl.
- **Confidence**: medium. The one thing that would change my mind: another feature coming back onto
  groups (then the layer earns its keep again).
- **Notes**: The batch-year drift is a bug either way and belongs to the bug lens now, not to this
  proposal.

### catchups-lib-20 - One "client or transaction" database type instead of three
- **Where**: `src/lib/catchup-picture-pick.ts:18` (`type Db = Prisma.TransactionClient | typeof prisma`),
  `src/lib/account-purge.ts:34` (the same), `src/lib/catchups-types.ts:244` (`export type CatchupDb =
  PrismaClient | Prisma.TransactionClient`); `src/lib/group-succession.ts:53-64` (`SuccessionDb`, a
  hand-written structural type).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: grep of `type .*Db.* = .*(TransactionClient|typeof prisma|PrismaClient)`: three copies.
- **What to do**: Export one `type Db` (type-only, erased at runtime) from `src/lib/prisma.ts` (lib-core's
  file) and import it in the three places. `SuccessionDb` can stay structural: its test passes a fake
  from `.mjs`, where types do not exist anyway.
- **Saving**: ~6 lines; 3 definitions become 1.
- **Risk & gate**: nil. `npm run check`.
- **Confidence**: high.
- **Notes**: Coordinate with lib-core-config.

### catchups-lib-21 - Two words for the same rhythm on two member screens
- **Where**: `src/lib/catchups-core.ts:197-201` (`CADENCE_LABELS`: "Biweekly", "Monthly", "Quarterly"),
  used by `src/app/(main)/catchups/new/page.tsx:8`, `:97` and `new/loading.tsx:3`, `:59`;
  `src/components/catchups/settings/settings-surface.tsx:162-170` (`RHYTHMS`: "Every two weeks", "Every
  month", "Every three months").
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: owner
- **Evidence**: The settings list defends its own words ("A settings row is answering 'how often?', so
  it answers in words"), and justifies the other set as the admin room's column heading. But the
  admin room does not import `CADENCE_LABELS`; the create form does. So a member starting a Catch-up
  picks "Monthly", and later changes it under "Every month".
- **What to do**: Either the create form adopts the settings words (one list, in `catchups-core.ts`,
  used by both), or both stay and the settings comment is corrected.
- **Saving**: ~6 lines; one vocabulary.
- **Risk & gate**: low; it is member-visible copy on `/catchups/new`, so `npm run visual` for that route.
- **Confidence**: high on the facts.
- **Notes**: none.

## Owner decisions

**1. The magazine layout engine (the "Catch-up as a printed magazine" work).**
- **What I'd change:** nothing unless you say so. It is finished design work waiting for you to look at
  a real Edition's PDF before the next step starts. Today it lives among the app's shipped code
  although only a lab room uses it.
- **What you'd notice:** nothing. No member can reach it today.
- **If I guess wrong:** moving or archiving it is undone with one revert.
- **Options:** (a) leave it where it is and look at the PDF when you have time; (b) move it into the lab
  beside its room until you want it built; (c) put it away in history and bring it back when you want
  the magazine.
- **If you don't reply:** (a). *(catchups-lib-17, -16)*

**2. Vote questions, recorded answers and time capsules.**
- **What I'd change:** nothing unless you say so. All three were built underneath on 14 September and
  are waiting for you to pick their looks in the lab. Until then they are about 1,900 lines of code and
  tests that every Catch-ups change has to keep working, plus microphone permission for a recorder
  nobody can open.
- **What you'd notice:** nothing, whichever you choose, until a look is picked.
- **If I guess wrong:** parked features come back from history in one revert each; the database parts
  need their columns re-added.
- **Options:** (a) pick the looks soon and ship them; (b) keep waiting as they are; (c) park any of the
  three you are no longer sure about, and keep the rest.
- **If you don't reply:** (b). *(catchups-lib-18)*

**3. The old song-link leftovers.**
- **What I'd change:** delete the code for the Spotify song field that answers used to have. Since
  pasted links became cards, nothing on screen can send one. You said "fixing that separately leave it
  alone" in the last audit because the Catch-ups rework was going to do it. That rework's run has
  ended and this part has not moved.
- **What you'd notice:** nothing. Song links in answers keep working as cards.
- **If I guess wrong:** it comes back in one revert; no member has a song stored.
- **Options:** (a) let this clean-up remove the code now, and drop the empty columns in your next
  database release; (b) keep it for the Catch-ups rework to finish.
- **If you don't reply:** (b), because you said to leave it. *(catchups-lib-05)*

**4. Three empty Catch-up database fields.**
- **What I'd change:** stop reading, then drop, three fields nothing fills: an "approved" mark on
  every question (always yes since the approval step was removed in August), an Edition "theme" nothing
  writes, and a Catch-up "intro" only the demo writes.
- **What you'd notice:** nothing.
- **If I guess wrong:** a count run first proves they are empty; if any is not, that one stays.
- **Options:** (a) do it, with the drops in the same release as the song and bin columns; (b) leave them.
- **If you don't reply:** (a) for the code, and the drops wait for your release. *(catchups-lib-04)*

**5. Two words for "Keeper" in the membership records.**
- **What I'd change:** Catch-up Keepers are stored under two different words. That split existed so
  that a Catch-up Keeper would not also moderate group posts, and group posts no longer exist. I would
  store one word everywhere.
- **What you'd notice:** nothing, except in one rare case. If a Catch-up's creator deletes their
  account, the person handed the hat could afterwards be un-made Keeper by another Keeper, as anyone
  else can.
- **If I guess wrong:** the change can be reversed; old rows are listed before the update.
- **Options:** (a) one word, with a small database update; (b) only correct the explanations in the
  code.
- **If you don't reply:** (b). *(catchups-lib-14)*

**6. The hidden "group" under every Catch-up.**
- **What I'd change:** nothing now. Every Catch-up hangs off an invisible group, left over from when
  Groups were a feature. Folding it away would make the database simpler and every Catch-up check one
  step shorter, but it is the largest Catch-ups migration yet.
- **What you'd notice:** nothing, if done well.
- **If I guess wrong:** a large migration on the live database; risky.
- **Options:** (a) leave it; (b) plan it as its own project when Catch-ups next changes.
- **If you don't reply:** (a). *(catchups-lib-19)*

**7. "Monthly" or "Every month".**
- **What I'd change:** use one set of words for how often a Catch-up comes out. Starting one says
  "Biweekly / Monthly / Quarterly"; its settings say "Every two weeks / Every month / Every three months".
- **What you'd notice:** the start form's rhythm choices would read like the settings.
- **If I guess wrong:** it is three words, changed back in a minute.
- **Options:** (a) the settings' words everywhere; (b) keep both.
- **If you don't reply:** (a). *(catchups-lib-21)*

## Not-findings
- **`catchups-core.ts` is one file with six concerns, and it should stay one file.** The concerns are
  the question library and cadence labels (~90 lines), the calendar maths (~120), who-may rules (~190),
  the state machine and patches (~465), copy helpers (~230), and the Spotify resolver with the P2021
  guard (~85; the resolver is -05). Splitting it is line-neutral (new headers and imports), would need
  `catchups.ts`'s `export *` to grow to four re-exports, and would re-point five test files. Its
  1,033-line test is a faithful spec of it. The wins are in deleting its dead parts (-05, -07, -12,
  -15) and the drift in its callers (-01), not in its shape.
- **`catchups.ts`'s `export * from "./catchups-core"`** is deliberate: server components reach the
  engine through one module, and the header says clients must not. No shipped client component imports
  a VALUE from the core any more (only `import type` in `collecting.tsx`); only two lab rooms import
  values. So none of the core's 1,402 lines, nor its `node:crypto` import, reaches a member's browser.
- **The comment mass in `catchup-pictures.ts` (59 code, 214 comment) and `batch-catchups.ts` (123,
  178)** is measurement and decision record: the crop table measured at four viewports (2026-09-08),
  his scrim corrections with their arithmetic, the Rukmini Rau heal case, and the seq-scan cost measured
  at 0.35 ms over 64 alumni. Not bloat by the audits' standing rule.
- **`isBatchCatchup(batchYear)`**, a one-line wrapper, is argued in its docblock ("the reason it means
  'batch' is not obvious from the expression") and pinned by `batch-catchups.test.mjs`.
- **`mayMarkTimeCapsule`**, an alias of `mayChangeCatchupPicture`, names the intent at its call site; its
  docblock argues why the rule is the same. It goes only if -18 parks the capsule.
- **`catchup-caps.ts`** (one constant in its own module): a `"use server"` file may export only async
  functions, so the client picker cannot import the constant from actions (same as `post-caps.ts`).
- **`catchup-picture-pick.ts` split from `catchup-pictures.ts`**: it keeps a database read out of the
  client dialog's import graph.
- **`vote-question-rule.ts` retyping `VOTE_CATEGORY`**: TRAPS.md's "no relative value imports" rule for
  `node --test`; the test reads `catchups-types.ts` to catch drift.
- **`healBatchCatchups` checking the floor before `ensureBatchCatchup` checks it again**: the pre-check
  saves one query per small batch group per night; the inner check serves the signup path.
- **`markEditionRead` swallowing its failure with a development-only log**: CLAUDE.md's `touchLastSeen`
  lesson, best-effort by design.
- **`export-catchups.mjs` and the `catchups-export.ts` shape**: `spec.md` §3.1 is LOCKED ("the export
  runs first, every time").
- **`toTiming`'s explicit field copy (catchups.ts:87-105)** keeps non-timing fields out of the
  in-memory `ed` that patches are merged into. It is 18 lines; leave it.
- **`roster.ts` / `roster-rule.ts`**: the pure rule is shared with `scripts/dev/import-roster.mjs`.
- **`src/lib/magazine/index.ts` is not a barrel** (it holds the engine's search), and **`visibleText` is
  not a duplicate**: the app has no other reducer of the composer's wire format to plain text (only
  `renderRichText`, to HTML).
- **The two test files named like rule tests with no rule module** (`time-capsule-rule.test.mjs`,
  `catchup-lifecycle.test.mjs`) pin rules that live in `catchups-core.ts` and `actions.ts`. They are
  legitimate pins; the naming is T14's call.

## Audit carry-overs in this territory
- **Audit 2 D3 (`catchups-01`, the Spotify pipeline):** DECLINED by the owner (Q3, *"fixing that
  separately leave it alone"*, the rework owns it). Still open: the code is unchanged and the rework's
  phase 11 has waited on his release since 2026-09-14. Re-asked as Owner decision 3 (-05).
- **Audit 2 D11, Catch-ups half (`catchups-05` `CatchupIndexCard`; `catchups-06` `loadMeta`'s
  fallback):** skipped on 2026-09-07 ("bar its Catch-ups halves") while the rework was in flight. Both
  are still present and now unblocked: -12 and -08.
- **Audit 2 E12 `catchups-02` (retyped cadence lists; array as the source of truth):** PARKED, still
  open. The lib half is -09; the prop-drill half is T02's.
- **Audit 2 `catchups-09` (membership lookup ×5, edition column set ×4):** PARKED, still open. The
  column half is -09; the membership half is T02's.
- **Audit 2 `catchups-10` (`newInviteToken` and `node:crypto` in the pure core):** still open, lower
  value now: no shipped client imports a value from the core; the only client value-importers are
  `lab/catchups/sketches/_home.tsx` (`CATCHUP_PROMPT_SETS`) and `lab/catchups/capsule/_mark.tsx`
  (`capsuleOpensAt`).
- **Audit 2 `catchups-14` (comments describing deleted code, including the unterminated block):** F
  unit 1 was DONE for other territories; the Catch-up files were skipped; the block is still there: -15.
- **The rework's phase 11 drops** (`CatchupEntry.song*`, `CatchupReminderPref.deletedAt`): pending the
  owner's release; -04 adds three columns to the same file.
- **`catchupSurfaceTitle`'s " catch-up" suffix** (`catchups-core.ts:427-429`): `spec.md` §6 lists it
  as deleted and catchups.md §15 lists it as still disagreeing. It is a copy change and his; untouched.

## For other lenses
- **Bug lens (the peer bug-audit session; the orchestrator decides whether to pass these on):**
  `actions.ts:394-399` `loadMemberEdition` runs `loadFreshEdition` (which advances the clock, a write)
  BEFORE it checks membership, the ordering the reader page fixed on purpose ("a non-member must not be
  able to trigger that status transition just by opening the URL"). A batch-year correction in the
  profile leaves the member in two batch groups and their Catch-ups for ever (-19). `export-catchups.mjs`
  never creates `audio/`, and keeps `audio.file` on a failed copy (-10). `roster.ts:97-104`
  `tryRosterAutoVerifyQuietly` reports its swallowed failures with `console.error` only, which the
  Catch-ups code (C-149) says "reaches nobody" on Vercel.
- **T02 catchups-ui:** -01 (actions side), -03 (`loadFreshEdition`), -04 (the always-empty `pending`
  list at `(home)/page.tsx:231-236`, the `accepted` guard at `actions.ts:1718`), -09's other halves, and
  the stale "shared with the home" comments at `edition/[editionId]/page.tsx:199-202` and
  `reader-types.ts:1-11`. knip's unused `answer-redirect.tsx`, `picture-picker-dialog.tsx`,
  `setCatchupPicture` and `setEditionTimeCapsule` (the last is part of -18).
- **runtime-perf / data-layer:** -02 and -03 (queries per page); `(index)/page.tsx:81` runs the sweep a
  second time on `/catchups` beside the layout's. `prisma/schema.prisma`'s Group comment says
  `description` and `coverImage` are "still in both databases until the owner runs
  `2026-09-07-drop-groups-residue.sql`"; they were dropped on 2026-09-08 (`c34aae3e`; the live columns
  confirm it). The `GroupMember.role` comment `// "admin" | "member"` omits `"keeper"`. -04's three
  columns belong in the drop release.
- **T14 lib-tests:** `magazine.test.mjs` lays out at least 16 Editions twice at module load, and on the
  owner's machine also the live export; measure its seconds. `batch-catchups.test.mjs` spawns `git
  grep` (execSync). `catchups-core.test.mjs`'s header is stale ("They import the real functions from
  catchups.ts ... the impure drivers (which load prisma lazily)"). C-027's `resolveSpotify` ordering
  clause turns vacuous if -05 lands. `unattended-rule.test.mjs` has nothing to do with Catch-ups (mail
  queue, purge, crons, NYT, verify state).
- **T15 lab-catchups:** the magazine room's `inventedCorpus()` reads its fixtures from
  `process.cwd()/src/app/lab/...` at request time, and `next.config.ts` has no
  `outputFileTracingIncludes`. Check whether `/lab/catchups/magazine` works in the owner's production
  build, and whether file tracing copies the 18.6k lines of fixture JSON into its function. The
  sketches adapter is the only reader of `CatchupPromptView.asker/showAsker/source` (-06's optional
  step), and it reads `m.role === "admin"` (-14).
- **lib-core-config:** `next.config.ts`'s `microphone=(self)` and `media-src` exist for a recorder no
  member can open (-18); a shared `Db` type in `prisma.ts` (-20).
- **auth / purge lens:** `account-purge.ts:46-80` `promoteOrphanedGroups` re-implements
  `promoteGroupSuccessor` in batch with the role `"admin"` (-14).
- **Territory map:** `batch-year.ts`, `roster.ts`, `roster-rule.ts`, `batch-line.test.mjs` and
  `unattended-rule.test.mjs` belong to directory-profile, auth-onboarding, lib-core and lib-tests. I read
  them; apart from the roster note above, they are clean.

## Metrics
- **Lines read in full:** 7,749 source lines (the 19 lib files 4,734; the magazine 2,396; the two
  scripts 619) plus ~1,500 test lines read fully (`batch-catchups`, `magazine`, `catchup-shelf`, most of
  `time-capsule-rule` and `catchup-lifecycle`) and about 1,200 more read for pins. Outside the territory,
  ~1,400 lines of `actions.ts`, pages, layout, purge and lab adapters, and ~2,300 lines of specs.
- **Comment-heaviest (cloc code / comment):** `catchup-pictures.ts` 59 / 214; `batch-catchups.ts` 123 /
  178; `catchups-core.ts` 613 / 701; `voice-answer-rule.ts` 105 / 113; `catchup-reads.ts` 25 / 45;
  `catchups-notify.ts` 177 / 148; `catchups-types.ts` 157 / 147. The magazine is the opposite:
  `grammar.ts` 484 / 172, `paginate.ts` 276 / 66.
- **Biggest files:** `catchups-core.ts` 1,402; `catchups-core.test.mjs` 1,033; `grammar.ts` 696;
  `catchups.ts` 534; `export-catchups.mjs` 404; `batch-catchups.test.mjs` 404.
- **Counts:** 21 findings (T1 3, T2 10, T3 5, T4 3; structural 16, cheap 5; owner 7). Exports with no
  outside consumer: `catchups-core.ts` 9 of 55. Unused magazine exports (knip, lab entries): ~64. Clones:
  closeAndPublish ↔ applyEditionAction (3 branches); paginate's page break (4×); chars-per-line (3×);
  the client-or-transaction type (3×); vocabularies retyped (4). Stale spec citations: 13. Displaced or
  swallowed docblocks: 8 (5 in the Catch-ups lib, 3 in the magazine). Queries per page: the per-page advance, 3 → 1 in a live window (-02); the reader and each
  Edition action, −1 (-03). Placeholder DB objects: 3 columns (-04), plus 1 table, 7 columns, 1 CHECK and
  1 composite foreign key behind -18.
