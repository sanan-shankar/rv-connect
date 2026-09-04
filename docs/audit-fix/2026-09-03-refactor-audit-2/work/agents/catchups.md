# catchups - refactor audit 2 report

Territory reader for Catch-ups, the recurring group newsletter: `src/app/(main)/catchups/**`
(five routes, their skeletons, and `actions.ts`, the repo's largest source file at 2,054
lines), the public join flow under `src/app/catchups/**`, the cron tick route, the 42
components under `src/components/catchups/**`, the eight lib modules (`catchups.ts` engine,
`catchups-core.ts` pure half, `-notify`, `-round-view`, `-types`, `catchup-caps`,
`catchup-shelf`, `group-succession`) and the four test files that pin them. Charter: map
`actions.ts` by responsibility and say which actions are thin over the core and which carry
core-shaped logic; check the lifecycle is written once; check the Keeper/member gates stayed
deduped after audit 1; answer the floor questions (one-use wrappers, one shell or three,
preamble count, join flow vs auth, date/cadence formatting, static dialogs, Spotify's status).
Date: 2026-09-03. Files in territory: 70 (12 + 3 + 1 + 42 + 8 + 4); read fully: 69, and the
core unit test read by header, import list and all 60 test titles (bodies skimmed).

## Coverage

- Read fully: `src/app/(main)/catchups/actions.ts` (all 2,054 lines), `(index)/page.tsx`,
  `[catchupId]/(home)/page.tsx`, `[catchupId]/answer/page.tsx`, `round/[editionId]/page.tsx`,
  `new/page.tsx`, `layout.tsx`, all five `loading.tsx`; `src/app/catchups/join/page.tsx`,
  `join/[token]/page.tsx`, `join/[token]/loading.tsx`; `src/app/api/catchups/tick/route.ts`;
  all 42 files in `src/components/catchups/**`; `src/lib/catchups.ts`, `catchups-core.ts`,
  `catchups-notify.ts`, `catchups-round-view.ts`, `catchups-types.ts`, `catchup-caps.ts`,
  `catchup-shelf.ts`, `group-succession.ts`; `src/lib/catchup-lifecycle.test.mjs` (all 401
  lines, because it pins source text every fixer will touch), `catchup-shelf.test.mjs`,
  `group-succession.test.mjs`. Also read: `docs/spec/catchups.md` (895 lines), the audit-1
  catchups report (667 lines) and the fix-prompt passages that record what happened to its
  16 findings, `src/lib/member-gate.ts` (the gate helper), the relevant halves of
  `src/components/posts/use-composer-uploads.ts` and `src/lib/image-downscale.ts` (to answer
  the photo-attachments question), `src/lib/upload-ownership.ts` and `upload-client.ts`
  (signatures only), `src/components/admin/catchup-status.ts` (to answer the admin
  duplication question).
- Skimmed (why): `src/lib/catchups-core.test.mjs` bodies (874 lines; the import list and the
  60 titles tell me what each export is pinned by, which is all findings 01, 02, 06 and 10
  need); `src/app/(main)/admin/catchups/**` (not mine; grepped for what it reads from my
  files).
- Not read: nothing in territory.
- Uncommitted edits seen: none in my territory (`git status --short` over every territory
  path is empty). The tree's one modified file, `src/components/common/image-viewer.tsx`, is
  somebody's WIP; the two round components that dynamically import it (`answer-photos.tsx`,
  `photo-wall.tsx`) were judged on their committed text only.
- Tool-output leads checked: every `raw/jscpd.txt` clone under my paths (20 inside
  `actions.ts`, 3 in components, 1 in `catchups.ts`), the 11 `knip-repo-config-production`
  hits on `catchups-core.ts`, `raw/tsc-unused.txt`'s `answer-photos.tsx:149 'photo'`,
  `raw/use-client.txt` (30 of the 42 components are client files), `raw/route-js.txt` and
  `route-bundle-stats.json` (chunk-level diffs between the five routes, below).

## Summary

The shape of this territory changed a lot since audit 1 closed and almost all of it for the
better: `createCatchup` is gone, the Keeper preamble is three helpers (`loadMemberEdition`,
`loadKeeperEdition`, `loadKeeperScope`) that 19 of the 22 actions go through, the pure engine
is its own file and the last import cycle went with it, the published Round is loaded once
for both readers, `NotAvailableCard` and `QuestionRow` each exist once, the dates speak in one
voice. The lifecycle is genuinely written once: `computeStatus`/`planNextAction` live only in
`catchups-core.ts`, every action applies a core patch behind a compare-and-swap, every page
freshens through `advanceEdition`, and not one of the 42 components computes a status. The
three consoles are one shell with three bodies. The comment mass (`actions.ts` 1,246 code /
627 comment, `catchups-core.ts` 500 / 351) is the owner's argued-for standard and stays.

What is left is real but smaller, and the biggest item is not a clone but a **placeholder**:
the whole Spotify link pipeline (the SSRF-guarded oembed resolver in the core, the `songUrl`
branch of `submitEntry`, the three `CatchupEntry.song*` columns, the linked half of
`SpotifyCard`, ten unit tests) has had no writer since the owner replaced pasted links with a
typed song name on 2026-07-25, and the audit-1 fix session counted 0 songs in 133 live
entries. About 190 lines, three columns and one outbound network call on the write path,
for an owner decision (finding 01). Behind it: the half of audit-1's catchups-03 that was
recorded as "not done, still worth doing" is still not done (three retyped cadence lists, two
prop drills, 1 KB of question library serialized into every Catch-up home render, three
docblocks still explaining a lazy-import architecture that no longer exists; finding 02);
the Catch-up home is the heaviest Catch-ups route because it ships every Keeper-only dialog
to every member plus a 17 KB Tooltip chunk for one (i) (03); the answer page's photo upload
is a third hand-rolled copy of the composer's pipeline, still on the 5 MB proxied path the
composer left behind (04); and a dozen small things that are cheap on their own but add up
to the type system and the comments telling the truth again (05-18).

Structural-vs-cheap split: findings 01-10 are structural (about 350 honest lines, three DB
columns, five clones, one client-bundle lever); 11-18 are cheap. What surprised me: how much
of the remaining bloat is *stale explanation* -- comments and docblocks describing code the
first audit deleted (a 14-line block in the core that is not even syntactically closed, a
comment for a constant that no longer exists, three "do not import lib/catchups from a
client file" warnings for a rule the split retired). That is exactly the "comments describing
deleted code" category the brief names as bloat, and it is the one class of thing the
dedupe-heavy first audit could not see. What audit 1 left that is now moot: catchups-16 (the
`theme` column) has a reader now (the admin reading room), so it is no longer dead.

**The `actions.ts` responsibility map** (current line ranges; 22 exported actions):

| Lines | Responsibility | Contents |
|---|---|---|
| 1-86 | header docblock, imports | - |
| 88-153 | the one cap + seven Zod schemas | `MAX_ACCEPTED_PROMPTS_PER_EDITION`, `CADENCE_VALUES`, `REMINDER_MODE_VALUES`, `cadenceSchema`, `promptCategorySchema`, `reminderModeSchema`, `extendDaysSchema`, `createCatchupWithPeopleSchema`, `submitPromptSchema`, `curateRemoveSchema`, `curateReorderSchema`, `submitEntrySchema` |
| 155-363 | shared helpers | `runAction` 164, `loadMembership` 176, `EditionContext` 183, `EDITION_COLUMNS` 206, `loadFreshEdition` 226, `loadCatchupContext` 263, `refuseIfFrozen` 297, `loadMemberEdition` 318, `loadKeeperEdition` 341 |
| 365-750 | series lifecycle | `createCatchupWithPeople` 383-492, `joinCatchupByToken` 510-554, `updateCatchupCadence` 557-617, `pauseCatchup` 620-647, `resumeCatchup` 650-724, `endCatchup` 727-750 |
| 752-963 | prompts | `submitPrompt` 767-885, `curatePrompt` 904-963 |
| 965-1205 | round transitions | `openAnswering` 968-1026, `closeAndPrepare` 1033-1089, `extendDeadline` 1106-1155, `publishNow` 1158-1205 |
| 1207-1479 | entries + hearts | `submitEntry` 1218-1409, `toggleEntryLove` 1416-1479 |
| 1481-1982 | people + personal copy | helpers 1508-1633 (`DEMO_SHARED_COPY_REFUSAL`, `CATCHUP_NOTIFICATION_TYPES`, `clearCatchupNotifications`, `loadOwnCatchupCopy`, `upsertCatchupPref`, `MEMBERSHIP_REFUSAL`, **`loadKeeperScope` 1615**), `addCatchupMembers` 1641-1732, `removeCatchupMember` 1747-1781, `leaveCatchup` 1803-1846, `setCatchupArchived` 1857-1875, `setCatchupDeleted` 1895-1919, `setCatchupKeeper` 1936-1982 |
| 1984-2054 | prefs + nudge | `setReminderPref` 1987-2012, `nudgeGroup` 2015-2054 |

**Thin wrappers over the core** (auth + gate + one core patch + CAS + notify, nothing else
to move): `openAnswering` (`answeringPatch`), `closeAndPrepare` (`shouldExtendForTooFew`,
`extendPatch`, `preparingPatch`), `extendDeadline` (`extendPhasePatch`), `publishNow`
(`publishPatch`, `addCadenceGap`), `resumeCatchup` (`shiftEditionPatch`, `shiftPausedInstant`,
`addCadenceGap`), `pauseCatchup`, `endCatchup`, `toggleEntryLove`, `nudgeGroup`,
`setReminderPref`, the four personal-copy actions. **Logic that is core-shaped but lives
here**: (a) `updateCatchupCadence` 594-607, the "reschedule from the same origin, clamp to
now" rule (audit M08) is a pure function of `(origin, cadence, now)` written as an inline
IIFE, and it has no unit test -- `catchups-core.test.mjs` covers `addCadenceGap` but not the
clamp; (b) `submitPrompt` 870-874, the dormant-Round revival predicate `wasDormant` (four
conditions on the edition) mirrors `planNextAction`'s dormancy rule, and the core's own
docblock at `catchups-core.ts:468` refers to it as "`reviveDormantRound` in the actions", a
function that does not exist under that name; nothing pins the revival condition today;
(c) the enrollable-user WHERE clause (`isBlocked: false, deletionRequestedAt: null,
accountType notIn teachers`) at 414-422 and 1669-1675, written twice here and twice more
outside the territory. Those three are recorded inside findings 12 and the "For other
lenses" list rather than as their own headline, because each is ~10 lines. **Verdict on
size**: honest. 22 actions at ~57 code lines each including their gates and CAS writes, plus
the argued-for comments. The physical split mapped in audit-1's catchups-05 is still not
recommended (see Owner decisions).

**The charter's questions, answered:**

1. *How many of the 42 components are one-use wrappers of another component?* Zero are pure
   wrappers. `EntryLoveButton` and `PublishNowButton` wrap a shared primitive but carry real
   action wiring and have two callers each. `AnswerRedirect` (29 lines) and `SongNameField`
   (65, of which 24 are the load-bearing songs TODO) are single-use thin leaves and fine. Two
   components are the opposite problem: they keep props and docblocks for a second caller
   that no longer exists (`GroupFirstGuidance`'s six optional props, `LibraryPickerDialog`'s
   three trigger props; finding 11).
2. *Are the three consoles one shell with three bodies or three shells?* One shell.
   `CatchupHomeShell` (`catchup-home-shell.tsx:55-87`) branches once on
   `catchupStatus`/`edition.status` and mounts `ConsoleCollecting` (369 lines),
   `ConsoleAnswering` (148) or `ConsolePublished` (89), with the paused/ended banner, the
   no-edition card and the preparing scene inline in the shell. The right rail is built once.
   No console computes a status; each only renders the one it was given. The one thing they
   each re-declare is the tile class string (`const TILE`, four copies; finding 17), and the
   preparing scene is written a second time on the permalink page with drifted copy (07).
3. *How many actions share the same preamble?* All 22. Each opens `return runAction(async
   () => { const session = await auth(); if (!session?.user?.id) return { error: "Not
   authenticated" }; ...` (22 exact copies of the two-line session check), 20 of them follow
   with one or more `if (typeof x !== "string" || !x) return { error: "Invalid request." };`
   guards, and 6 add `const gate = await requireVerifiedMember(); if (!gate.ok) return {
   error: gate.error };`. Quoted from `extendDeadline` (1107-1112):
   ```ts
   return runAction(async () => {
     const session = await auth();
     if (!session?.user?.id) return { error: "Not authenticated" };
     if (typeof editionId !== "string" || !editionId) return { error: "Invalid request." };
     const parsedDays = extendDaysSchema.safeParse(days);
     if (!parsedDays.success) return { error: "Pick 1, 2, 4 days or a week." };
   ```
   Does a plain helper exist, and is it used consistently? A gate helper exists
   (`requireVerifiedMember` in `src/lib/member-gate.ts`) and is used consistently by the six
   actions that reach other members; it returns `{ ok, error }` and not the session, so every
   action still calls `auth()` first (which is `cache()`d, so the second call is free -- the
   fix log's own measurement). No `requireSession()`-style helper returning the user exists
   anywhere in `src/lib` (`admin.ts` has the admin trio; nothing for a plain member). The
   22 copies are consistent to the character. Per the brief, the `withMember` wrapper is not
   re-proposed: it was refuted at fix time (the C-189 tripwire collides with the factory
   export shape).
4. *Is the join flow's UI a copy of components/auth pieces?* No. It links to `/signup` and
   `/login` with `?next=` back to itself and reuses `Button`, `BirdAvatar`, `Wordmark`;
   `components/auth` holds no public-page shell (the `(auth)` layout is a bare
   `min-h-screen` div and each auth page owns its layout). What the join flow does copy is
   *itself*: the Wordmark-over-a-420px-card shell is written three times inside the route
   and the refusal card twice (finding 08).
5. *Where is the same date/cadence formatting written more than once?* Dates: solved by
   audit-1's 07 -- every date now goes through `formatDisplayDate`/`formatDisplayDateLong`
   except the two deliberate locals (`extend-deadline-card.tsx:49` for the weekday,
   `fresh-off-the-press.tsx:28` to drop the year, both argued for in comments). Cadence
   labels: `CADENCE_LABELS` in the core, retyped as `CADENCE_OPTIONS` in
   `keeper-settings-dialog.tsx:31-35` (finding 02). The round label: `roundLabel()` exists in
   the core and four surfaces bypass it with a literal `Round {n}` (`archive-shelf.tsx:44`,
   `console-published.tsx:49`, `catchup-home-shell.tsx:74`, `answer/page.tsx:272`; 17).
6. *Which dialogs load statically and could defer?* All of them. `catchup-home-shell.tsx`
   statically imports `KeeperSettingsDialog` (Keeper-only), `ExtendDeadlineCard` (Keeper-only),
   `LibraryPickerDialog` (behind a click), and `PeoplePanel`, whose file carries
   `PeopleDialog`, `AddPeople`, `InviteLink` and `LeaveCatchupDialog` (about 520 of its 728
   lines, all behind the "See everyone" press). The chunk-level numbers are in finding 03.
7. *Is spotify-card / song-attachment a feature with real use or a placeholder?*
   `song-attachment.tsx` (`SongNameField`) is real: it is the control for the `songs` prompt
   kind and writes the typed name into `body`. The Spotify *link* pipeline that
   `spotify-card.tsx`'s linked branch renders is a placeholder: no client sends `songUrl`,
   the owner removed the link field, and the live table held 0 songs in 133 entries when
   last counted. Owner decision, finding 01.

Two more charter items: the tick route is the thin wrapper the spec asked for (not-finding),
and Catch-ups notifications never touch the email queue (in-app `Notification` rows only,
by spec fence; not-finding). The photo wall and answer photos use the shared
`PhotoFrame`/`PhotoRows`/`PhotoCarousel` and open the shared `ImageViewer` through
`next/dynamic` with a pointer-enter preload -- the catch-up uses the shared carousel, not its
own.

## Findings

### catchups-01 - Retire the Spotify link pipeline: a fully plumbed subsystem with no writer since 2026-07-25
- **Where**: `src/lib/catchups-core.ts:839-911` (`SpotifyResult`, `SPOTIFY_PATH_RE`,
  `resolveSpotify`, 73 lines with docblocks); `src/app/(main)/catchups/actions.ts:31-33`
  (header paragraph), `:149` (`songUrl` in `submitEntrySchema`), `:1259`, `:1278-1292` (the
  resolve block), `:1316`, `:1359-1361` (the three song columns in the upsert `create`),
  `:1392` (`!entry.songUrl` in the withdraw test); `src/lib/catchups-round-view.ts:157-168`
  (the comment) and `:178` (the song rule); `src/lib/catchups-types.ts:119-123`
  (`CatchupSongView.url`/`art`); `src/components/catchups/round/spotify-card.tsx:4-8`,
  `:26-40` (the art branch), `:54-75` (the linked branch); `src/lib/catchups-core.test.mjs:584-643`
  (ten `resolveSpotify` tests); `prisma/schema.prisma` `CatchupEntry.songUrl`, `songTitle`,
  `songArt`; `docs/spec/catchups.md` 3.4.1. Outside the territory:
  `src/app/api/account/export/route.ts:212` selects `songUrl`.
- **Phase**: placeholder
- **Tier**: T3     **Class**: structural     **Decides**: owner
- **Evidence**: (1) No UI writes a Spotify link. `answer-experience.tsx:178` `persist(promptId,
  patch: { body?: string; images?: string[] })` is the only caller of `submitEntry` in the app
  and it never sends `songUrl`; `SongNameField` (`song-attachment.tsx`) writes the song's name
  into `body` via `onBodyBlur`. `grep -rn songUrl src` outside the four lib/action files finds
  only the account-export select and the TODO comment. The demo seed writes no song fields
  (`grep songUrl src/lib/demo-seed`: nothing). (2) The owner ordered it: `song-attachment.tsx:5-7`
  quotes him (2026-07-25) "let them just type the name of the song instead of pasting links",
  and the spec header records "The per-question Spotify link field is removed; music is its
  own question kind" (`catchups.md:28`). (3) The data agrees: the audit-1 fix log
  (`fix-prompt.md`, owner-visible change 5) says "No live entry has a song at all (checked: 0
  of 133)". (4) The resolver is the feature's one outbound network call on a write path
  (`fetchImpl` to `open.spotify.com/oembed` with a 3 s budget) and the reason threat
  T-catchups-01 and the C-027 re-read-at-write-time guard exist in the first place
  (`actions.ts:1326-1336` explains the guard as "between the two sits `resolveSpotify`, a
  network call with a 3-second budget"). (5) What survives without it is exactly what the
  reader already does for a typed name: `round/answer-card.tsx:44-47` builds `namedSong = {
  url: "", title: bodyText, art: null }` from `body` when `kind === "songs"`, and
  `SpotifyCard` renders the `!song.url` branch as a plain row.
- **What to do**: (a) delete `resolveSpotify`, `SpotifyResult`, `SPOTIFY_PATH_RE` and the
  "Spotify (keyless oembed; the SSRF boundary)" section from the core, and the ten tests at
  `catchups-core.test.mjs:584-643` plus `resolveSpotify` in its import list; (b) in
  `submitEntry`, remove `songUrl` from the schema, `hasSong`, `songPatch`, `songWarning`, the
  resolve block, the three columns in `create`, and change the withdraw test at 1392 to
  `!entry.body && !entry.images` (drop `songUrl` from `columns`); delete the header paragraph
  at 31-33; (c) in `catchups-round-view.ts` stop selecting `songUrl/songTitle/songArt` and set
  `song: null` (or drop the field and let `AnswerCard` derive `namedSong` as it already does);
  (d) `CatchupSongView` becomes `{ title: string }`, `SpotifyCard` becomes the unlinked row
  only (rename to `SongRow`; keep the `MusicNotes` placeholder), and its docblock's "two
  shapes" paragraph goes; (e) schema: remove the three fields from `prisma/schema.prisma`,
  `npx prisma generate`, and write a dated file in `prisma/migrations-manual/`
  (`ALTER TABLE "CatchupEntry" DROP COLUMN IF EXISTS "songUrl", DROP COLUMN IF EXISTS
  "songTitle", DROP COLUMN IF EXISTS "songArt";`) applied with `scripts/dev/run-sql.mjs`,
  never `db push`; (f) drop `songUrl` from the account-export select (account-export lens);
  (g) strike 3.4.1 in the spec with a one-line note; (h) update `catchup-lifecycle.test.mjs`'s
  C-027 test: the assertion `body.indexOf("resolveSpotify") < body.indexOf("catchupEdition.count")`
  becomes vacuous once the name is gone (`-1 < n` is always true) -- delete that one `assert.ok`
  and keep the transaction and CAS assertions, which are the guard.
- **Saving**: ~190 lines of code and tests (73 core + ~30 actions + ~15 round-view + ~25
  spotify-card + ~10 types + ~60 tests, minus ~10 for the simplified song row), 3 DB columns,
  1 outbound fetch on the write path, 1 SSRF boundary that no longer needs defending.
- **Risk & gate**: medium (schema touch, crown-jewel reader). Gates: a live-DB SELECT the fix
  session runs FIRST, `SELECT count(*) FROM "CatchupEntry" WHERE "songUrl" IS NOT NULL OR
  "songTitle" IS NOT NULL OR "songArt" IS NOT NULL;` -- proceed only on 0; `npm run check`
  (`catchups-core.test.mjs`, `catchup-lifecycle.test.mjs` C-027 edited as above,
  `demo.test.mjs`); open a published Round with a `songs` question as Jerry on both the home
  and the permalink; `npm run visual`.
- **Confidence**: high that it is unreachable from the UI; high on the 0-rows claim as of
  2026-08-27 (re-prove with the SELECT). The one thing that would change my mind: the owner
  wanting pasted links back. Nothing in `ROADMAP.md`/`FEATURES.md` asks for it, and his
  recorded instruction is the opposite.
- **Notes**: This intersects the songs TODO in `song-attachment.tsx:13-25`, which plans a
  `CatchupEntry.songs Json?` column for up-to-five songs. The two are independent: the TODO
  is about *several typed names*, and its own text says the Spotify trio cannot hold them.
  Whether he wants (a) one typed song per answer forever or (b) the multi-song column later,
  the Spotify resolver goes either way. Fear: a hand-crafted call sending `songUrl` today
  still writes a row that renders as an outlink; after the change it is rejected by Zod's
  strict object (unknown keys are stripped, not refused -- fine either way). The `songTitle`
  legacy-rows comment in the round-view (157-160) describes rows that the 0-count says do not
  exist.

### catchups-02 - Finish audit-1 catchups-03: kill the two prop drills and the three retyped cadence lists, and apply the "array is the source of truth" pattern to the other two unions
- **Where**: `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:21`, `:371`
  (`promptLibrary: CATCHUP_PROMPT_SETS`); `src/components/catchups/home/types.ts:19`,
  `:100-101`; `home/console-collecting.tsx:55`, `:75`, `:81`, `:169`;
  `home/library-picker-dialog.tsx:23`, `:26`, `:32`; `src/app/(main)/catchups/new/page.tsx:8`,
  `:96` (`cadenceLabels={CADENCE_LABELS}`); `create/create-catchup-form.tsx:19-22` (stale
  docblock), `:38`, `:43`, `:142`; `create/cadence-control.tsx:12-17` (stale docblock), `:25`
  (`OPTIONS`), `:30`, `:34`; `home/keeper-settings-dialog.tsx:5-8` (stale docblock), `:31-35`
  (`CADENCE_OPTIONS`); `actions.ts:99-100` (`CADENCE_VALUES`, `REMINDER_MODE_VALUES`),
  `:1517-1523` (`CATCHUP_NOTIFICATION_TYPES`); `src/lib/catchups-types.ts:32`, `:35`, `:85-90`
  (the three hand-typed unions); `home/reminder-pref-control.tsx:25-29` (keep: the labels are
  owner copy).
- **Phase**: dedupe (and relocate: data out of the RSC payload into a client chunk)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The audit-1 fix log records this half as open in so many words
  (`fix-prompt.md:1382-1388`: "The prop-drill half of the finding (the re-typed
  `CADENCE_OPTIONS`, the `cadenceLabels` and `promptLibrary` drills, `CATCHUP_PROMPT_SETS` in
  the RSC payload) is **not done** and is still worth doing"). The reason the drills existed
  is gone: `catchups-core.ts` has no Prisma in its graph, `library-picker-dialog.tsx` (a
  client file) already imports from it (type-only), and the chunk grep proves the library is
  not in client JS today -- `grep -l "A photo from everyone" .scratch/audit2-build/.next/static/chunks/*.js`
  returns nothing -- so its 1,020 bytes of literal (about 1.1 KB as JSON) are serialized into
  the RSC payload on every Catch-up home render and re-sent on every `router.refresh()` the
  shell fires after each action. The cadence trio is spelled five times: the `Cadence` union
  (`types:32`), `CADENCE_VALUES` (`actions:99`), the keys of `CADENCE_LABELS` (`core:176`),
  `OPTIONS` (`cadence-control:25`), `CADENCE_OPTIONS` (`keeper-settings:31`). The reminder
  trio three times, the notify-kind quintet twice (`CatchupNotifyKind` union and
  `CATCHUP_NOTIFICATION_TYPES`). `catchups-types.ts:49-55` already states the rule for
  `PROMPT_CATEGORIES`: "This ARRAY, not the union, is the source of truth, and every validator
  must import it rather than retyping the ids" -- and tells the story of the validator that
  went stale. The three stale docblocks each say a client component must not import
  `@/lib/catchups` because of "lazy-loaded Prisma/notify code paths"; `catchups.ts:40-51`
  now documents the real rule (import `./catchups-core` directly) and the paths they warn
  about were deleted in `9f9a1fd`.
- **What to do**: (1) In `catchups-types.ts`: `export const CADENCES = ["biweekly", "monthly",
  "quarterly"] as const; export type Cadence = (typeof CADENCES)[number];` and the same for
  `REMINDER_MODES`/`ReminderMode` and `CATCHUP_NOTIFY_KINDS`/`CatchupNotifyKind`; delete
  `CADENCE_VALUES`, `REMINDER_MODE_VALUES` and `CATCHUP_NOTIFICATION_TYPES` from `actions.ts`
  (`z.enum(CADENCES)`, `z.enum(REMINDER_MODES)`, `type: { in: [...CATCHUP_NOTIFY_KINDS] }`);
  `cadence-control.tsx` maps `CADENCES` and imports `CADENCE_LABELS` from `@/lib/catchups-core`;
  `keeper-settings-dialog.tsx` builds its options as `CADENCES.map((value) => ({ value,
  label: CADENCE_LABELS[value] }))` and drops the literal. (2) `LibraryPickerDialog` imports
  `CATCHUP_PROMPT_SETS` from the core and loses its `sets` prop; delete `promptLibrary` from
  `CatchupHomeData`, from `loadHome`, from `SubmissionPanel`'s props. (3) Delete the
  `cadenceLabels` prop from `CreateCatchupForm` and `labels` from `CadenceControl`;
  `new/page.tsx` stops importing `CADENCE_LABELS`. (4) Delete the three stale docblock
  paragraphs (keeper-settings 5-8, cadence-control 12-17, create-catchup-form 19-22). Do
  finding 10 first so the core carries no Node built-in when it becomes a value import in
  client files.
- **Saving**: ~30 lines; 5 -> 1 spellings of the cadence set, 3 -> 1 of the reminder set,
  2 -> 1 of the notify kinds; ~1.1 KB off every Catch-up home RSC render and every
  post-action refresh; 3 stale docblocks.
- **Risk & gate**: low. `npm run check` (tsc walks every import; `catchups-core.test.mjs`
  imports `CATCHUP_PROMPT_SETS` from the core, unaffected); open `/catchups/new` and a
  Catch-up home as Jerry, open the library dialog and the settings dialog; `npm run visual`
  (`/catchups` is a baseline route; nothing on it changes).
- **Confidence**: high.
- **Notes**: `reminder-pref-control.tsx`'s `OPTIONS` keeps its local labels ("Daily", "Last
  day", "Off" are owner copy from 2026-08-05) but should map over `REMINDER_MODES` so a fourth
  mode cannot exist in the validator and not on the control. `PROMPT_CATEGORIES` is the
  worked example: copy its shape, including the docblock's reason.

### catchups-03 - The Catch-up home ships every Keeper-only dialog and a 17 KB Tooltip chunk to every member
- **Where**: `src/components/catchups/home/catchup-home-shell.tsx:31-40` (static imports),
  `:110-135` (the Keeper-gated rail); `home/keeper-settings-dialog.tsx` (201 lines);
  `home/extend-deadline-card.tsx` (135); `home/people-panel.tsx:256-729` (`PeopleDialog`,
  `PersonRow`, `AddPeople`, `InviteLink`, `LeaveCatchupDialog`: everything behind the "See
  everyone" press); `home/reminder-pref-control.tsx:15`, `:63-65` (`InfoTooltip`);
  `home/library-picker-dialog.tsx`.
- **Phase**: relocate (behind interaction / behind the Keeper check)
- **Tier**: T3     **Class**: structural     **Decides**: autonomous for the dialogs; owner for
  the tooltip
- **Evidence**: `raw/route-js.txt`: `/catchups/[catchupId]` 1,181 KB first-load, the heaviest
  Catch-ups route, versus `/catchups` 1,095, `/answer` 1,101, the permalink 1,085.
  `route-bundle-stats.json` diffed chunk by chunk: five chunks load on the home and not on the
  index, 125 KB raw. Grepping each for identifying strings from the build at
  `.scratch/audit2-build/`: `1eizugyixie1y.js` (43 KB) carries "Everyone in this catch-up",
  "Catch-up settings", "Ask something from the library", "More time", "Last day", the
  masthead's "wrote in", `useSyncExternalStore`, the Dialog and DropdownMenu markers -- that
  is the whole home component tree, Keeper controls included, in one chunk;
  `370feaobakd1f.js` (47 KB) carries `AnimatePresence`, the shared `Textarea`
  (`field-sizing`) and `Input`; `3evj1hvsedjp7.js` (18 KB) the `ConfirmDialog` shape;
  `3vrge4av51cxl.js` (17 KB) matches only the Tooltip marker and nothing else -- it is loaded
  by the home and by neither `/catchups` nor `/feed`, and the only Tooltip in the home tree is
  the one `InfoTooltip` on the reminder card. For a non-Keeper member (most members),
  `KeeperSettingsDialog`, `ExtendDeadlineCard` and `OpenAnsweringButton` are parsed and never
  rendered (`viewer.isKeeper` gates all three at 110-135).
- **What to do**: (1) `next/dynamic` the two Keeper-only pieces in the shell:
  `const KeeperSettingsDialog = dynamic(() => import("./keeper-settings-dialog").then(m =>
  m.KeeperSettingsDialog))` and the same for `ExtendDeadlineCard`; they already render only
  inside `viewer.isKeeper &&`. (2) Split `people-panel.tsx`: keep `PeoplePanel` + `PersonPill`
  (lines 1-251) in place and move `PeopleDialog`, `PersonRow`, `AddPeople`, `InviteLink`,
  `LeaveCatchupDialog` into `home/people-dialog.tsx`, loaded with `next/dynamic` on first
  `open`; the `DialogTrigger` button stays in the panel so the first paint is unchanged
  (`useUserSearch` and the dropdown go with the dialog). (3) The tooltip is an owner call: the
  (i) exists because the 2026-07-25 review deleted the sub-copy under this heading
  (`reminder-pref-control.tsx:59-62`); the cheapest equivalents are a native `title` on the
  Bell icon (zero bytes) or a 4-word line of sub-copy (which the review banned). Present the
  17 KB number and let him choose; do not decide it in a fix session.
- **Saving**: honest estimate 20-30 KB raw client JS off the home for a non-Keeper (the
  Keeper-only code plus the roster dialog; `Dialog`/`DropdownMenu`/`ConfirmDialog` primitives
  are shared with the sidebar and feed and stay), plus 17 KB if the tooltip goes; 0 lines.
  The exact figure needs `npm run analyze` on the branch, which the fix session may run.
- **Risk & gate**: medium (the roster dialog is the feature's most-used control). Gates:
  `npm run check`; open a Catch-up home as Jerry (non-Keeper: no settings, no More time; the
  "See everyone" press opens the roster with no visible delay) and as the Keeper of one;
  `npm run visual` (the home is not a baseline route; `/catchups` is and is unaffected).
- **Confidence**: medium on the byte numbers (chunk grep, not a bundle analyzer), high on the
  shape (the Keeper-only code is provably behind `isKeeper`).
- **Notes**: The 47 KB `AnimatePresence`/`Textarea` chunk is shared with `/catchups/new`
  (`1jwit-p8riw08.js` also matches `presence`), so it is `motion`'s exit-animation half riding
  the shell's `FadeRise`; that belongs to the bundle lens. I did not propose deferring
  `LibraryPickerDialog`: it is 86 lines and every member uses it. Rejected: deferring
  `ConfirmDialog` (shared, app-wide).

### catchups-04 - The answer page's photo upload is a third hand-rolled copy of the composer's pipeline, and it kept the 5 MB proxied path the composer left behind
- **Where**: `src/components/catchups/answer/photo-attachments.tsx:27` (`MAX_BYTES = 5 * 1024 *
  1024`), `:60-116` (`handleFiles`: cap, `shrinkForUpload`, `FormData`, `fetch("/api/upload")`,
  notices loop, facts keep, `onChange`); compare `src/components/posts/use-composer-uploads.ts`
  (`uploadViaPresign` + `uploadOneFile`, `MAX_UPLOAD_BYTES` 20 MB, 60 s timeout, the same
  notices loop and facts keep) and `src/components/messages/message-composer.tsx:60-85` (the
  same shrink-and-POST shape a third time). `src/lib/upload-shared.ts:31` `MAX_UPLOAD_BYTES =
  20 * 1024 * 1024`; `src/lib/upload-client.ts:20` `directUploadPut(file, kind: "post" |
  "collection")`; `src/app/(main)/catchups/actions.ts:1264-1269` (`ownedUploadUrls`).
- **Phase**: dedupe (across a module boundary; see the coupling caveat in Notes)
- **Tier**: T3     **Class**: structural     **Decides**: autonomous, with one owner-visible
  side effect to announce
- **Evidence**: Three `fetch("/api/upload")` callers in `src/components` (grep), each carrying
  its own cap, its own error copy and its own copy of the M15 "say what the server changed"
  loop. The composer's comment at `use-composer-uploads.ts:~200` says "20MB is the real
  ceiling now that the direct path PUTs originals straight to storage; only the proxied
  fallback still shrinks in the browser" -- and project memory records the R2 direct path as
  unblocked on 2026-08-21. `photo-attachments.tsx` never got it: it refuses anything over 5 MB
  at line 69 BEFORE calling `shrinkForUpload` at 80, so a 6 MB phone JPEG that the shrinker
  exists to make uploadable is rejected with "Each photo must be under 5MB." on the answer
  page and accepted on the feed. `upload-size-rule.test.mjs:27` lists this file and pins only
  that it calls `shrinkForUpload(` (line 65), so the cap is unpinned.
- **What to do**: Two honest options. (a) Minimal, T2: replace `MAX_BYTES` with
  `MAX_UPLOAD_BYTES` from `@/lib/upload-shared` and let `shrinkForUpload` do its job; one
  line, one import, the toast copy updated. (b) Structural, T3: lift the transport out of
  `useComposerUploads` into `src/lib/upload-client.ts` beside `directUploadPut` as
  `uploadImages(files, kind): Promise<{ urls: string[]; images: PhotoFacts[]; notices:
  string[] }>` (presign-then-finalize with the proxied `/api/upload` fallback, the 60 s
  timeout, the size check), and have the composer hook, the message composer and
  `PhotoAttachments` all call it; `PhotoAttachments` keeps its list UI and its `imagesRef`
  guard (C-182). Before (b): confirm `directUploadPut`'s `kind` union accepts a catch-up kind
  (today it is `"post" | "collection"`) and that the URLs the direct path mints pass
  `ownedUploadUrls` (`upload-ownership.ts:34-44`, which checks `isUploadedImageUrl` and the
  key's owner prefix) -- `submitEntry` refuses any image it cannot prove is the member's own.
- **Saving**: (a) 0 lines, one drift closed; (b) ~40 lines across three files, 3 -> 1 upload
  contracts, one place for the notices loop and the timeout.
- **Risk & gate**: (a) low; (b) medium. Gates: `npm run check` (`upload-size-rule.test.mjs`
  must stay green -- it greps for `shrinkForUpload|downscaleImage|useAvatarUpload` in each
  listed file, so a file that delegates to a shared helper must still match, or the pin moves
  to the helper with the file list unchanged: read the test before editing); manual: as Jerry,
  attach a 6 MB photo on the answer page, then a 25 MB one (refused with the shared copy);
  `security-regressions.test.mjs` does not name these files (verified by the fix log's
  upload-ownership coverage, but grep it).
- **Confidence**: high on the drift and the three copies; medium on (b)'s effort (the
  composer hook is coupled to its `Shot` preview list and drafts, which is why it did not
  come out cleanly before -- the transport alone does).
- **Notes**: Owner-visible either way: catch-up photos start accepting the same sizes the
  feed does. Say so. This is the audit's answer to "photo-attachment vs the posts composer's
  upload hook: clone?": the UI halves are different (a plate strip vs the composer's preview
  rail) and should stay apart; the transport is the same function written three times, with
  the catch-up copy the stalest. Cross-boundary: also listed under For other lenses for the
  media/messages readers.

### catchups-05 - `CatchupIndexCard` still models the "Start one" row the owner removed on 2026-08-21, so four branches and three nullable fields describe a state no loader produces
- **Where**: `src/lib/catchups-types.ts:157-171` (`catchupId: string | null`, `catchupStatus:
  CatchupStatus | null`, `editionId`, `editionStatus`, `cta: ... | null`, the "null = this group
  has no Catch-up yet (card shows 'Start one')" comment); `src/app/(main)/catchups/(index)/page.tsx:148-152`
  (the guard and its four-line "Unreachable" comment), `:222` (`c.catchupId as string`),
  `:239-240` (`a.catchupId ? ... : 90`); `src/components/catchups/index/your-catchups-card.tsx:29-32`
  (docblock: "dormant 'Start one' row"), `:45` (`card.catchupId ? tone : ...`), `:46`
  (`card.cta?.href ?? "/catchups"`), `:61`, `:88`, `:93-95`, `:116`, `:127-136` (`{card.catchupId
  && <CatchupCardMenu/>}` under the comment "The 'Start one' rows are built from a group with
  none").
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `(index)/page.tsx:82` `where: { userId, group: { catchup: { isNot: null } } }`,
  with the owner's decision quoted at 69-81 ("Offered the choice between making the button
  attach to that group and dropping the row, the owner took the row"). Every card the loader
  builds sets `catchupId: group.catchup.id`, `catchupStatus`, and a non-null `cta` from
  `buildCta` (32-56, whose every branch returns an object). The page's own comment at 148-151
  calls the null path "Unreachable". So `catchupId` is never null, `cta` is never null, and
  the card's four conditionals, the sort's `: 90` arm and the two `as string` casts are dead
  by construction while the type and three comments keep the old state alive.
- **What to do**: make `catchupId: string`, `catchupStatus: CatchupStatus`, `cta: { label;
  href }` required in `CatchupIndexCard`; move the type into `index/your-catchups-card.tsx`
  (its only consumer; audit-1 called this optional, and with the type now describing only
  this screen it is the right home) or keep it in `catchups-types.ts` -- either, but delete
  the "Start one" sentences; keep the Prisma-narrowing `if (!group.catchup) return null;` with
  a one-line comment (the relation is optional in Prisma's type); delete the `: 90` sort arm,
  the `as string` casts, the four `card.catchupId ?`/`card.cta ?` branches and the two
  "Start one" comments in the card.
- **Saving**: ~20 lines; the type stops describing a screen that no longer exists.
- **Risk & gate**: low. `npm run check` (tsc is the whole proof); open `/catchups` as Jerry;
  `npm run visual` (`/catchups` baseline: the rendered output is identical).
- **Confidence**: high.

### catchups-06 - `loadMeta`'s fallback query is unreachable: all five `advanceEdition` callers already pass the Catch-up and its group
- **Where**: `src/lib/catchups.ts:63-72` (`AdvanceEditionInput.catchup?` with every field
  optional), `:103-131` (`loadMeta`, the `findUnique` branch at 114-130 and the `?? "monthly"`
  / `?? "active"` defaults at 110-111).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: grep `advanceEdition(` finds five call sites and each passes the relation:
  `actions.ts:227-243` (`loadFreshEdition` selects `catchup: { createdById, cadence, status,
  group }`), `[catchupId]/(home)/page.tsx:139-154` (builds `catchup: { cadence, status, group }`
  by hand), `answer/page.tsx:169-173` (spreads `catchup: { cadence, status, group }`),
  `round/[editionId]/page.tsx:96` (`LIGHT_EDITION_SELECT` includes `catchup.group`),
  `catchups.ts:405-411` (`advanceDueCatchups` includes `catchup: { id, cadence, status, group }`).
  The `included?.group` test at 105 is therefore always true. The fallback is also the less
  safe path: it reads `cadence`/`status` from the database while `applyEditionAction`'s CAS
  trusts the caller's snapshot -- two sources for one decision.
- **What to do**: make `catchup: { cadence: string; status: string; group: { id: string; name:
  string } }` required on `AdvanceEditionInput`; delete lines 114-130 and the two `??`
  defaults; `loadMeta` becomes a six-line synchronous mapper (or inline it at 252). tsc then
  forces any future caller to include the relation, which is what all five do today.
- **Saving**: ~20 lines and one never-executed query path.
- **Risk & gate**: low. `npm run check`; `catchup-lifecycle.test.mjs` B-061 pins the literal
  `meta.catchupStatus !== "active")\s*return;` -- keep that line verbatim; `catchups-core.test.mjs`
  never touches the engine.
- **Confidence**: high. The one thing that would change my mind: a caller I cannot see
  (there is none in `src`; `scripts/` does not import the engine).

### catchups-07 - The preparing ritual is written twice, and its two sentences have already drifted
- **Where**: `src/components/catchups/home/catchup-home-shell.tsx:71-83`;
  `src/app/(main)/catchups/round/[editionId]/page.tsx:189-204`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Both render `<AlmostReady eyebrow=... title="Putting your Catch-up together."
  body=... />` followed by `{keeper && <PublishNowButton editionId />}` in a centred wrapper.
  The body differs: the home says "They all appear together the moment this Round publishes."
  and the permalink "They all appear at once when this Round publishes." Both sentences
  entered in the same commit (`145ac49`, 2026-07-25), so neither is the corrected one; they
  are two drafts of one line. The wrappers differ too (`FadeRise` + `mt-[var(--space-m)]` vs
  `div.py-10` + `mt-[var(--space-l)]` + `max-w-3xl`). This is the shape audit-1's catchups-04
  and catchups-08 were about: one moment, two renderers, drifting.
- **What to do**: `src/components/catchups/preparing-scene.tsx` (server-safe; `PublishNowButton`
  is already a client leaf) exporting `PreparingScene({ eyebrow, editionId, isKeeper })`; both
  call sites use it with one body sentence (pick one; "at once" reads plainer against the
  spec's ban on soft words -- an owner-copy call, flag it in the commit).
- **Saving**: ~12 lines, 1 clone, 1 copy drift closed.
- **Risk & gate**: low. `npm run check`; screenshot a preparing Round on the home and at its
  permalink as Keeper and as a member (desktop and 390x844).
- **Confidence**: high.

### catchups-08 - The join route writes its own page shell three times and its refusal card twice
- **Where**: `src/app/catchups/join/page.tsx:25-33` (shell) and `:34-44` (refusal card);
  `src/app/catchups/join/[token]/page.tsx:172-186` (`Shell`) and `:78-95` (refusal card);
  `src/app/catchups/join/[token]/loading.tsx:22-29` (shell again, around the skeleton).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The same nine-line `min-h-screen ... Wordmark ... card-elevated w-full
  max-w-[420px] ...` markup is in all three files (grep `max-w-\[420px\]` in `src/app/catchups`:
  three hits, plus one lab variant). `join/page.tsx`'s docblock says its card "says exactly
  what the [token] page says about a token it does not recognise" -- the same `h1 + p + <Button
  variant="outline">Go to Rishi Valley</Button>` block, retyped. Audit-1 listed the shell
  under "For other lenses" (~15 lines); nothing moved. The (policies) layout's Wordmark chrome
  is a different shape (header/main/footer, `max-w-2xl`), so there is no app-level shell to
  adopt; this is a route-private primitive.
- **What to do**: `src/app/catchups/join/_shell.tsx` (route-private, underscore-prefixed so
  Next does not route it) exporting `JoinShell({ children })` and `JoinRefusal({ title, body })`;
  `page.tsx` becomes `<JoinShell><JoinRefusal .../></JoinShell>`, `[token]/page.tsx` deletes
  its local `Shell` and its expired-card markup, `loading.tsx` wraps its skeleton in
  `JoinShell`. Keep the loading skeleton's measured line boxes exactly (its comment explains
  each height).
- **Saving**: ~25 lines; 3 -> 1 shells, 2 -> 1 refusal cards.
- **Risk & gate**: low. `npm run check`; screenshot `/catchups/join` and
  `/catchups/join/0000000000000000000000000000dead` signed OUT with `npm run screenshot`
  (not `verify:shot`, which signs in; gotcha 4); `catchup-lifecycle.test.mjs` C-020 pins
  `await restoreOwnCatchupCopy(catchup.id, session.user.id);` and its position before the
  redirect in `[token]/page.tsx` -- untouched by a shell extraction.
- **Confidence**: high.

### catchups-09 - The membership lookup is written five times and the edition's column set four times, one file apart from a shared spelling of each
- **Where**: membership: `src/app/(main)/catchups/actions.ts:176-181` (`loadMembership`),
  `round/[editionId]/page.tsx:103-108` (the identical function), `[catchupId]/(home)/page.tsx:123-126`,
  `[catchupId]/answer/page.tsx:109-112`, `src/app/catchups/join/[token]/page.tsx:101-104`;
  outside the territory `src/lib/post-visibility.ts:64-70` (`isMemberOf`, `cache()`d,
  boolean). Edition columns: `actions.ts:206-216` (`EDITION_COLUMNS`), `answer/page.tsx:66-75`
  (`editionSelect`), `round/[editionId]/page.tsx:51-60` (`LIGHT_EDITION_SELECT`),
  `src/lib/catchups.ts:76-83` (`EDITION_TIMING_SELECT`, exported precisely "so an action
  reading an edition ... selects exactly the same set").
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/jscpd.txt` does not flag these (each is 6-9 lines, under its threshold),
  which is why they survived audit 1. `EDITION_TIMING_SELECT`'s own docblock states the
  intent that the other three do not follow: `EDITION_COLUMNS` is `{ id, catchupId, number,
  ...EDITION_TIMING_SELECT }` retyped, `editionSelect` is the same minus `catchupId`,
  `LIGHT_EDITION_SELECT` the same plus the nested Catch-up.
- **What to do**: export `loadGroupMembership(groupId, userId)` (select `role`) from the
  engine `src/lib/catchups.ts` (server-only, beside `restoreOwnCatchupCopy`) and use it in the
  five sites (the answer page selects `id` today and can take `role`); write the three selects
  as spreads of `EDITION_TIMING_SELECT`. `post-visibility.ts`'s `isMemberOf` can wrap the
  same helper (feed lens).
- **Saving**: 0 lines honestly (the brief's rule: a docblock plus five imports); 4 membership
  clones -> 0, 3 select clones -> 0, and the "which columns does a fresh read ask for"
  question has one answer.
- **Risk & gate**: low. `npm run check`; `catchup-lifecycle.test.mjs` pins none of these
  names (it pins `refuseIfFrozen`/`loadKeeperEdition`/`pausedHint` and the answer page's
  `select: { promptId: true, body: true, images: true, updatedAt: true }`, which is the
  entries select, not this one).
- **Confidence**: high.

### catchups-10 - `newInviteToken` (and its `node:crypto` import) sits in the client-safe pure core
- **Where**: `src/lib/catchups-core.ts:25` (`import { randomUUID } from "node:crypto"`),
  `:84-97`; the only consumer is `actions.ts:57`, `:463`, through the engine's `export *`.
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: The core's header (lines 2-9) defines it as the half with "No database, no
  clock of its own"; audit-1's catchups-03 warned "needs `node:crypto`, which is fine for RSC
  but NOT client; if any client component ever needs core, put `newInviteToken` in the engine
  instead" -- and `library-picker-dialog.tsx` (a client file) now imports from the core. It is
  a type-only import today, so the import is erased and no client chunk carries `randomUUID`
  (grep of `.next/static/chunks`: 0 hits); finding 02 turns it into a value import.
- **What to do**: move `newInviteToken` and its docblock to `src/lib/catchups.ts` next to
  `restoreOwnCatchupCopy`; the engine re-exports the core, so `actions.ts`'s import line does
  not change; delete the `node:crypto` import from the core. Do this before 02.
- **Saving**: 0 lines; the core carries no Node built-in.
- **Risk & gate**: low. `npm run check`; `join/[token]/page.tsx:42` mentions `newInviteToken`
  in a comment only.
- **Confidence**: high.

### catchups-11 - Two components keep props and docblocks for a second caller that no longer exists
- **Where**: `src/components/catchups/index/group-first-guidance.tsx:5-9` (docblock: "Used two
  places: the index ... and the create flow's no-group short-circuit"), `:23-37` (six optional
  props, all defaulted); `src/components/catchups/home/library-picker-dialog.tsx:5-8` ("Reused
  by both call sites so there is one place this list is rendered ... the Keeper rail's own
  quick add"), `:21-22` (`buttonVariants`, `VariantProps` imports), `:28-36` (`triggerLabel`,
  `triggerVariant`, `triggerSize`).
- **Phase**: hygiene (bloat signature 5: options params with one caller)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: grep: `GroupFirstGuidance` has one caller (`(index)/page.tsx:370`, no props);
  the create flow's short-circuit died with the people-first rewrite (`new/page.tsx` docblock:
  "all three collapse into one form"). `LibraryPickerDialog` has one caller
  (`console-collecting.tsx:169`, `sets` + `onPick` only); the "Keeper rail's own quick add"
  was deleted in the 2026-07-25 review ("There is no 'Keeper controls' box",
  `catchup-home-shell.tsx:14`).
- **What to do**: strip the props and inline the defaults in both; delete the two
  `class-variance-authority` type imports; rewrite the two docblocks to name the one caller.
- **Saving**: ~20 lines.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.

### catchups-12 - Two actions still inline the gate that `loadOwnCatchupCopy` provides, and `loadKeeperScope` is defined 1,050 lines after its first call
- **Where**: `src/app/(main)/catchups/actions.ts:1811-1813` (`leaveCatchup`: the exact three
  lines of `loadOwnCatchupCopy` 1556-1561, same two sentences); `:1995-2001` (`setReminderPref`:
  `findUnique` + `loadMembership` with "You are not a member of this group."); `:1615-1633`
  (`loadKeeperScope`, first called at 565, 626, 656, 734); `:1599-1602` (`MEMBERSHIP_REFUSAL`).
  Also core-shaped logic recorded in the Summary: `:594-607` (the cadence reschedule IIFE),
  `:870-874` (`wasDormant`).
- **Phase**: dedupe / hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Audit-1's catchups-02 deduped 14 preambles into three helpers; these two were
  added afterwards (leave on 2026-08-21) or predate the helper's shape and never adopted it.
  Function hoisting makes the late `loadKeeperScope` compile, but the file's section banners
  ("Shared helpers", 155) promise a reading order the definition breaks.
- **What to do**: `leaveCatchup` -> `const copy = await loadOwnCatchupCopy(catchupId,
  viewerId); if ("error" in copy) return copy;` then `copy.createdById`/`copy.groupId`;
  `setReminderPref` the same, which changes its not-a-member sentence to "You are not in
  this Catch-up." (owner-reviewed copy; flag, or thread the sentence in). Move
  `loadKeeperScope` and `MEMBERSHIP_REFUSAL` up under `loadKeeperEdition` (after 363).
  Optional, T2, for the two core-shaped rules: lift `rescheduleNextOpens(origin, cadence,
  now)` and `isDormantRound(ed, now)` into `catchups-core.ts` and pin each with one unit test
  (the M08 clamp and the B-062 revival have none today); rename the core's phantom
  `reviveDormantRound` reference (`catchups-core.ts:468`) to whatever exists.
- **Saving**: ~8 lines; reading order; two untested rules become testable.
- **Risk & gate**: low. `npm run check`; `catchup-lifecycle.test.mjs` B-060 pins
  `resumeCatchup`'s body and C-026 the fanout meters -- neither touches these two.
- **Confidence**: high.

### catchups-13 - Types that lie or live in the wrong house: `AnswerAsker`, `HomePromptView.category`, `RoundEntry`, and the five spellings of "a person"
- **Where**: `src/components/catchups/answer/types.ts:12-16` (`AnswerAsker`), `:37`;
  `src/components/catchups/home/types.ts:45` (`category: string | null`);
  `src/components/catchups/round/answer-card.tsx:34` (`export type RoundEntry = CatchupEntryView
  & { authorMeta: string }`) imported by `src/lib/catchups-round-view.ts:40`,
  `home/console-published.tsx:17`, `round/photo-wall.tsx:26`, `round/question-section.tsx:25`;
  person shapes: `CatchupPersonRef` (`catchups-types.ts:111`), `HomePersonRef`
  (`home/types.ts:21`), `AnswerAsker`, `PickedPerson` (`create/people-picker.tsx:36`),
  `AvatarUser` (bird-avatar).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `AnswerAsker` and the `category` widening are the two halves of audit-1's
  catchups-06 that did not land (the fix log records the four view-model deletions; these
  two remain). `AnswerAsker` `{ id, name, photoUrl }` lacks `birdOverride` while the answer
  page passes `IDENTITY_SELECT` rows (which carry it) and `BirdAvatar` reads it -- the type
  understates what flows through it. `RoundEntry` is a lib-imported type defined in a
  component (`catchups-round-view.ts` reaches into `components/catchups/round/answer-card`);
  depcruise has no rule against it (0 violations), but the vocabulary file exists to hold
  exactly this.
- **What to do**: `asker: CatchupPersonRef | null` and delete `AnswerAsker`;
  `category: PromptCategory | null` (cast at `(home)/page.tsx:245`); add `authorMeta: string`
  to `CatchupEntryView` in `catchups-types.ts` and delete the `RoundEntry` alias (four import
  sites rename); make `HomePersonRef` extend `CatchupPersonRef` (`& { isKeeper?; isCreator? }`)
  so a bird-avatar field cannot go missing on one screen. `PickedPerson` stays (it carries
  `batchYear`).
- **Saving**: ~8 lines; 5 -> 3 person spellings; lib no longer imports a component's type.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.

### catchups-14 - Comments and docblocks that describe deleted code
- **Where** (every one verified against the code beside it):
  a. `src/lib/catchups-core.ts:36-49`: a 14-line block explaining "Why the runtime deps
     (prisma, the notify builders) load via dynamic import" and ending "Do NOT convert these
     back to static imports" -- the exact machinery the split deleted; the file's own header
     at 18-21 says "That workaround is gone". The block is opened with `/* ---` at 36 and never
     closed: the next `*/` is at 69, so it swallows `askerVisible`'s docblock (51-68) into
     itself. `git blame -L36,49`: all 14 lines from `9f9a1fd`, the split commit, which moved
     the paragraph instead of deleting it.
  b. `catchups-core.ts:83`: `/** Question window: 3 days. Answer window: 7 days. Preparing
     hold: 24h. */` sits above `newInviteToken`'s docblock; the constants are at 99-103.
     (Audit-1 catchups-15, half one, still open.)
  c. `src/lib/catchups.ts:215-221`: `advanceEdition`'s docblock is separated from
     `advanceEdition` (247) by `restoreOwnCatchupCopy` and its docblock (222-245), so
     `advanceEdition` reads as undocumented. (Catchups-15, half two, still open.) And `:395`
     is indented two levels deep for no reason.
  d. `src/components/catchups/home/types.ts:37-41`: a five-line comment ("Kept in sync with
     the server ceiling, but the UI must NOT print it...") for `MAX_ACCEPTED_PROMPTS_PER_EDITION`,
     which audit-1's catchups-06 deleted from this file; the comment stayed, followed by
     nothing.
  e. `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:398-401`: `{/* Explicit copy: the
     component's own default body still carries the banned "gentle"/"warm" words */}` above
     `<AlmostReady title="Catch-ups are almost ready." body="Check back in a moment." />` --
     `almost-ready.tsx:33-34`'s defaults are "Catch-ups are almost ready." and "Everyone
     answers a few questions, and their replies become one issue the whole group reads. Check
     back in a moment.": no banned word (grep of the territory for
     `gentle|quiet|warm|a round of` in copy finds only `SPRINGS.gentle` and comments). The
     `title` override equals the default. The index and answer pages already render a bare
     `<AlmostReady />`.
  f. `home/keeper-settings-dialog.tsx:5-8`, `create/cadence-control.tsx:12-17`,
     `create/create-catchup-form.tsx:19-22`: three docblocks explaining that `@/lib/catchups`
     pulls "lazy-loaded Prisma/notify code paths" into the browser (deleted in `9f9a1fd`;
     folded into finding 02).
  g. `round/[editionId]/page.tsx:76`: `/** Bring one Round's status current against the
     clock, then return the fresh row. */` directly above `/* The plain read, WITHOUT
     advancing...` -- the orphaned docblock of the combined loader the C-something fix split.
  h. `src/app/api/catchups/tick/route.ts:5-23` and `:25-31`: two stacked docblocks; the
     route's story (M27, `vercel.json`, the public path) is separated from `GET` by
     `maxDuration`'s docblock, so `GET` reads as documented by the wrong paragraph. Swap the
     order.
  i. `answer/photo-attachments.tsx:41-50`: the C-182 comment for `imagesRef` sits above
     `facts`' docblock (51); the ref it explains is at 52.
  j. `round/answer-photos.tsx:129-131`: "the answer form has taken one photograph per answer
     since it shipped (`PhotoAttachments max={1}`)" -- false for text prompts, which take
     three (`answer/answer-card.tsx:123` passes no `max`, default 3; `submitEntrySchema.images
     max(3)`); only `photo` prompts are `max={1}`. The "only legacy rows reach any of this"
     claim is wrong for every text answer with two or three photos.
  k. `src/lib/catchups-core.test.mjs:9-10`: "They import the real functions from catchups.ts
     ... the impure drivers (which load prisma lazily)" -- the import at 51 is
     `./catchups-core.ts` and the drivers are static.
  l. `home/library-picker-dialog.tsx:5-8` and `index/group-first-guidance.tsx:5-9`: each names
     a second caller that is gone (finding 11).
  m. `src/components/catchups/answer/types.ts:1-8` and `catchups-types.ts:138`: "`askerVisible()`
     in catchups.ts is the one authority" -- it is in `catchups-core.ts` now. Trivial.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: quoted above per item. The brief's test (5d) applied: a keeper, from the same
  file as (a): `catchups-core.ts:371-392`, the `TICK_GRACE_MS` docblock, carries the C-142
  audit id, the measured failure ("roughly half the time, for any non-zero jitter") and the
  reason for five minutes -- that is the product. Bloat, from (a): "Loading prisma / the
  notify module lazily inside the impure drivers keeps the pure top level dependency free" --
  there are no impure drivers in this file.
- **What to do**: delete (a) outright and close nothing (the `*/` at 69 then belongs to
  `askerVisible`'s docblock, which is what it was meant to be); move (b) beside line 99; move
  `restoreOwnCatchupCopy` below `advanceDueCatchups` for (c); delete (d); replace (e) with
  `<AlmostReady />`; delete the three paragraphs in (f); delete the one-line docblock in (g);
  reorder (h); move the comment in (i) down two declarations; correct (j) to "a text answer
  may carry up to three; a `photo` prompt exactly one"; fix (k) and (m).
- **Saving**: ~45 lines of comment; two audit-1 items closed; one syntactically merged
  comment block un-merged.
- **Risk & gate**: low. `npm run check` (the C-149 sweep in `catchup-lifecycle.test.mjs`
  reads `catchups.ts` after `decomment`, so moving a function is invisible to it; C-020 pins
  `restoreOwnCatchupCopy`'s BODY by `indexOf("export async function restoreOwnCatchupCopy(")`
  and the next `\nexport `, which survives a move).
- **Confidence**: high.

### catchups-15 - `closesLabel` wraps a null check `answersCloseSentence` already performs
- **Where**: `src/app/(main)/catchups/[catchupId]/answer/page.tsx:54-64`, `:272`.
- **Phase**: hygiene (bloat signature 1)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `catchups-core.ts:764-768`: `if (closeAt == null) return "Answering now.";` --
  the identical sentence `closesLabel` returns for null before delegating. Its nine-line
  comment retells the C-141/C-031 story that the core's `valleyDaysLeft` docblock (729-744)
  already tells at the source.
- **What to do**: `subtitle={answersCloseSentence(edition.answersCloseAt, new Date())}`;
  delete `closesLabel`.
- **Saving**: 12 lines.
- **Risk & gate**: low. `npm run check`; `catchup-lifecycle.test.mjs` pins this page's
  `catchup.status !== "active"` and the entries select, not `closesLabel`.
- **Confidence**: high.

### catchups-16 - Two components named `AnswerCard` are two different things; rename the editing one
- **Where**: `src/components/catchups/answer/answer-card.tsx` (`AnswerCard`: the editable
  sheet -- `RichTextArea`, `PhotoAttachments`, `SongNameField`, Back/Next) and
  `src/components/catchups/round/answer-card.tsx` (`AnswerCard`: the published card --
  `IdentityRow`, `renderRichText`, `AnswerPhotos`, `SpotifyCard`, `EntryLoveButton`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the charter asked whether these are the same thing; they share no line and
  no prop, only the export name. One import site for the editing one
  (`answer-experience.tsx:22`, `:230`).
- **What to do**: rename `answer/answer-card.tsx` to `answer/answer-sheet.tsx` and the
  export to `AnswerSheet`; update the one import; the docblock's first line already calls it
  "one question and the control that answers it".
- **Saving**: 0 lines; the two readers of `AnswerCard` stop meaning different files.
- **Risk & gate**: low. `npm run check`; the protocol audit crashed once on a mid-pass rename
  in a shared checkout (fix log) -- stage the rename and run `check` in one go.
- **Confidence**: high.

### catchups-17 - The tile class string is spelled ten times, the B-042 comment eleven times, and four surfaces bypass `roundLabel`
- **Where**: `card-elevated rounded-[var(--radius)] border border-border bg-card
  p-[var(--space-m)]` as `const TILE` in `home/console-collecting.tsx:34`,
  `home/console-answering.tsx:32`, `home/console-published.tsx:29`, `home/people-panel.tsx:79`,
  and inline in `home/archive-shelf.tsx:27`, `home/extend-deadline-card.tsx:96`,
  `home/reminder-pref-control.tsx:53`, `index/filed-away.tsx:76`,
  `index/fresh-off-the-press.tsx:37`, `answer/answer-card.tsx:74` (10 files, nowhere else in
  `src`). The two-line "finally, not a trailing statement: a rejected call used to leave ...
  (audit B-042)" comment in 10 files, 11 copies (`grep -rn "audit B-042" src/components/catchups`),
  while `src/lib/call-action.ts:15-17` already carries the B-042 explanation and the
  "pair it with try/finally" rule at the source. Literal `Round {n}` where `roundLabel()`
  exists: `home/archive-shelf.tsx:44`, `home/console-published.tsx:49`,
  `home/catchup-home-shell.tsx:74`, `[catchupId]/answer/page.tsx:272`.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: counted above. The B-042 comment is the "carries an audit id" kind the brief
  protects -- once. Copies two to eleven restate the first, and the canonical text is in the
  helper every one of them calls.
- **What to do**: `export const CATCHUP_TILE = "..."` in one place (`src/components/catchups/tile.ts`,
  or better, check with the components/common lens whether the feed's card class deserves a
  `tile` utility in `globals.css`, since the consoles' own comment says the tile "match[es] the
  feed's cards"); ten sites import it. Shorten copies two to eleven of the B-042 comment to
  `// finally: see callAction (B-042).` or drop them. Use `roundLabel(n)` at the four sites.
- **Saving**: ~25 lines of comment, 10 -> 1 tile spellings, 5 -> 1 round-label spellings.
- **Risk & gate**: low. `npm run check`; `npm run visual` (`/catchups` baseline; identical
  classes, identical pixels).
- **Confidence**: high on the counts; medium on whether a global utility is wanted (the
  design-system lens decides).

### catchups-18 - `runAction` swallows unexpected errors with `console.error`, which the engine file beside it says reaches nobody on Vercel
- **Where**: `src/app/(main)/catchups/actions.ts:164-174`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `src/lib/catchups.ts:320-332` and `:433-440` route every swallowed failure
  through `reportSwallowed("catchups", err, ...)` and explain why ("A console line on Vercel
  reaches nobody"); `catchup-lifecycle.test.mjs` C-149 enforces it for that file. `runAction`
  is the same shape one file over -- catch, swallow into `{ error: "Something went wrong" }`,
  `console.error` -- for all 22 actions. `reportSwallowed` is already used from an actions
  file (`src/components/auth/actions.ts`), so the pattern exists.
- **What to do**: `reportSwallowed("catchups", err, { step: "action" })` in place of the
  `console.error`; optionally extend the C-149 sweep's file list to `actions.ts` (it is a
  sweep over `catch` blocks and would pass immediately).
- **Saving**: 0 lines; one silent-failure class fewer. Not a simplification on its own;
  recorded because the file's own sibling argues for it and a fixer touching `runAction` for
  01 will be there anyway.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.

## Owner decisions

- **The Spotify link pipeline (catchups-01).** In plain terms: the code that lets a member
  paste a Spotify link and see album art has no button anywhere in the app any more -- on
  2026-07-25 you asked for people to type a song's name instead, and that is what the songs
  question does. The pasting machinery is still fully built underneath: a network call to
  Spotify inside the save, three database columns, a security boundary the code defends, and
  ten tests. Nobody has used it (0 songs in 133 answers when last counted). Recommendation:
  remove it. If you later want "up to five songs per answer" (the plan written in
  `song-attachment.tsx`), that is a different, small piece of work and does not need any of
  this. The only thing lost is the ability to bring pasted links back without rewriting
  them, which nothing on your roadmap asks for.
- **The (i) on the reminder card (catchups-03).** The little information circle next to
  "Reminders" costs the Catch-up home a 17 KB script that no other Catch-ups page loads. It
  is there because your 2026-07-25 review deleted the line of sub-copy under that heading.
  Options: keep it (17 KB), replace it with a native browser tooltip on hover (free, plainer),
  or allow one short line of sub-copy back. Recommendation: the native tooltip; it says the
  same thing and the page gets lighter.
- **Photo size parity on the answer page (catchups-04).** The feed accepts photos up to
  20 MB and shrinks them in the browser; the answer page still refuses anything over 5 MB
  before it even tries. Recommendation: match the feed. You will see it as "a phone photo
  that used to be refused on a Catch-up now goes through".
- **Splitting `actions.ts` into files (audit-1 catchups-05, carried).** Still my
  recommendation not to: 2,054 lines is 22 actions of about 57 code lines each with the
  argued-for comments you asked for, in seven banner-labelled sections, and the two rule tests
  that read it by path would have to be re-pointed for zero functional gain. Recording the
  decision would stop the next audit re-opening "the biggest file in the repo".
- **The `draft` Round status (carried from audit 1).** Unchanged: it is in the state machine,
  the status copy, the index sort and the redirect copy, and no code path creates one. About
  15 lines. Keep it; it is a reserved seat, not weight.
- **`Catchup.title` with no writer (carried).** Unchanged: four surfaces fall back from a
  custom title nobody can set (only the demo seed writes one). Either add a "rename" field to
  the Keeper settings dialog one day, or accept that the fallbacks serve the demo. Not urgent.

## Not-findings

- **The lifecycle is written once.** `computeStatus`, `nextEditionStatus`, `planNextAction`
  and every patch helper live only in `catchups-core.ts` (grep `computeStatus`: the core and
  the types file); the actions apply the core's patches behind CAS writes; the pages call
  `advanceEdition`; not one of the 42 components computes or compares timestamps -- they
  branch on the `status` string they are handed. The consoles are one shell with three
  bodies (`catchup-home-shell.tsx:55-87`).
- **The Keeper/member gates stayed deduped.** `loadMemberEdition` (3 callers),
  `loadKeeperEdition` (7), `loadKeeperScope` (7), `loadOwnCatchupCopy` (2) cover 19 of 22
  actions; `joinCatchupByToken` has no membership gate by design (the token is the
  authorisation, `actions.ts:497-500`); the two stragglers are finding 12. The B-061 pin in
  `catchup-lifecycle.test.mjs:47-107` mutation-tests the helper shape.
- **The tick route is the thin wrapper spec 2.4 prescribed**: `requireCronSecret` (shared
  since audit 1) + `advanceDueCatchups()` + `maxDuration`, 39 lines, no logic.
- **Notifications never touch the email queue.** In-app `Notification` rows only, by spec
  fence (`catchups.md:821`); no file in the territory imports `email-queue` or Resend.
- **Photos use the shared kit**: `PhotoFrame`, `PhotoRows`/`PhotoStream`, `PhotoCarousel`,
  and the shared `ImageViewer` through `next/dynamic` with a pointer-enter preload
  (`answer-photos.tsx:36-40`, `photo-wall.tsx:29-33`). Two identical `dynamic()` declarations
  in two files is the price of two client leaves; a shared `useImageViewer` would couple them
  for six lines.
- **`answer/answer-card.tsx` vs `round/answer-card.tsx`**: two things (finding 16 is only the
  name).
- **`catchup-caps.ts` / `catchup-shelf.ts` / `group-succession.ts` as three files**: audit-1's
  verdict stands (server-file export rule; shared with `retention.ts`; shared with
  `retention.ts` + `account-purge.ts`), and the succession test's C-023 sweep ("every path
  that removes a membership promotes first") depends on the module being importable alone.
- **The `(index)` and `[catchupId]/(home)` route groups** exist to scope each `loading.tsx`
  to its own route (`e2e/loading-fallbacks.spec.ts:67` pins that `/catchups/new` shows its
  own skeleton); not layout bloat.
- **The five `loading.tsx` skeletons (~290 lines)**: mandated per async route, each mirrors
  its page's measured geometry (the join one explains every pixel). Correct by rule.
- **`loadPublishedIssue` (`(home)/page.tsx:75-84`)**, a ten-line wrapper turning the loader's
  `Date` into an ISO string: the repo's convention for client props (`home/types.ts:7-9`).
- **`REMINDER_TWO_DAYS` / `REMINDER_LAST_DAY` and the 11 knip-production "unused" core
  exports** (`DAY_MS`, `HOUR_MS`, `dailyBucket`, `withDailyBucket`, `daysLeftUntil`,
  `TICK_GRACE_MS`, `computeStatus`, `valleyDaysLeft`, ...): every one is imported by
  `catchups-core.test.mjs:26-58`; the known knip-runner gap, and the same list audit-1
  told fixers not to "clean". `catchups.ts:40-51` `export *` is a deliberate re-export with
  its rule written beside it, not an accidental barrel.
- **The people-search row in `create/people-picker.tsx:172-204` vs `home/people-panel.tsx:568-593`**
  (jscpd, 12 lines): the create picker builds a basket, the panel adds on tap; sharing the row
  couples the create flow to the home for ~12 lines. Audit-1's judgement stands: tolerate.
- **`progress-rail.tsx`'s two renderings** (jscpd self-clone 76-85 vs 146-155): the desktop
  rail and the phone's dot bar are different DOM by spec 3.4; the shared part is the
  `answeredIds`/`onJump` contract, which they already share.
- **`catchups.ts:173-178` vs `200-205`** (jscpd, the two CAS `updateMany`s in
  `applyEditionAction`): six lines, different `where` semantics per branch, argued for at
  192-199 (Low 23). Leave.
- **`upsertCatchupPref`'s P2002 catch** (`actions.ts:1563-1594`): the docblock records the
  live measurement (C-127, 75 simultaneous writes, zero violations) and why the belt stays.
- **`CatchupEdition.theme` (audit-1 catchups-16)**: no longer dead -- the admin reading room
  selects and prints it (`admin/catchups/[catchupId]/page.tsx:80`, `:190`) and the demo seed
  writes it (`demo-seed/seed.ts:402`). Refuted by later work.
- **The comment mass**: `actions.ts` 627 comment lines, `catchups-core.ts` 351,
  `catchups-notify.ts` 88 -- audit ids, owner quotes with dates, measured numbers, race
  reasoning. Finding 14 lists the exceptions individually; everything not on that list was
  read and kept.
- **`runAction` existing only in this feature**: no other actions file has one; the P2021
  pre-migration degrade is Catch-ups-specific and documented (`actions.ts:26-29`).

## Audit-1 carry-overs in this territory

- catchups-01 (dead `createCatchup`): done (`d5da4d7`); no trace remains.
- catchups-02 (gate helpers): done; two late stragglers, finding 12.
- catchups-03 (core/engine split): first half done (`887a95f`); the prop-drill half is
  recorded as not done in the fix log and is still not done -- finding 02.
- catchups-04 (shared Round loader): done (`catchups-round-view.ts`); the song rule it
  unified is now the placeholder in finding 01.
- catchups-05 (physical split of `actions.ts`): recommendation unchanged, see Owner decisions.
- catchups-06 (dead view-model types): the four types and `NotifyBaseCtx`'s export are gone;
  `AnswerAsker` and `HomePromptView.category` remain -- finding 13.
- catchups-07 (date formatters): done except the index rail, which keeps a local formatter
  with its reason (`fresh-off-the-press.tsx:21-25`).
- catchups-08 (two `NotAvailableCard`s): done (`8c600a0`); one component, two routes.
- catchups-09 (`QuestionRow`): done (`57e06aa`).
- catchups-10 (`isUniqueConstraintError`): done; `isUniqueViolation` at both sites.
- catchups-11 (title one-liner): done; `catchupDisplayName`/`catchupSurfaceTitle` in the core.
- catchups-12 (dead props): done before the fix session reached it.
- catchups-13 (de-export seven core symbols): done; all seven are `const`/`function` without
  `export` now.
- catchups-14 (`EDITION_COLUMNS`, aggregate destructure): done.
- catchups-15 (misfiled docblocks): **not done** -- finding 14 (b) and (c).
- catchups-16 (`theme` column): moot; the admin room reads it (Not-findings).
- Owner decisions from audit 1 (`draft` status, `Catchup.title`, the split): all three
  unchanged in state; restated above so nobody re-derives them.

## For other lenses

- **account-export**: `src/app/api/account/export/route.ts:212` selects `CatchupEntry.songUrl`
  (and presumably its siblings); goes with catchups-01.
- **uploads / media / messages**: three hand-rolled `/api/upload` transports
  (`posts/use-composer-uploads.ts`, `messages/message-composer.tsx:60-85`,
  `catchups/answer/photo-attachments.tsx:60-116`); the catch-up copy is the stalest (5 MB
  pre-check before shrink). Finding 04 proposes the shared transport.
- **feed / posts**: `lib/post-visibility.ts:64-70` `isMemberOf` is a sixth spelling of the
  membership lookup (finding 09); `feed/actions.ts` `toggleLike` and `toggleEntryLove`
  share the delete-first-then-create shape by design (`actions.ts:1438-1446` says so) -- a
  shared `toggleUniqueRow(tx, ...)` would serve both if the feed lens wants one.
- **people / auth**: the teacher test `accountType === "teacher" || === "ex_teacher"` is
  written at eight sites across `src` (`catchups/layout.tsx:19`, `catchups/actions.ts:521`,
  `profile/[id]/page.tsx:147`, `sidebar.tsx:644,730`, `letterhead-profile.tsx:366`,
  `verified-mark.tsx:30`, `profile-actions.ts:218`) with no `isTeacherAccount()` helper;
  the enrollable-user WHERE (`isBlocked: false, deletionRequestedAt: null, accountType notIn
  teachers`) at `catchups/actions.ts:414-422`, `:1669-1675`, `api/users/search/route.ts:62`,
  `directory/page.tsx:264` -- an `ENROLLABLE_USER_WHERE` beside `IDENTITY_SELECT` in
  `people-select.ts` would serve all four.
- **layout / perf**: `(main)/layout.tsx:74` runs `advanceDueCatchups(userId)` on every
  authenticated page view: two `findMany`s per view, scoped and swallow-safe. Audit-1 flagged
  it; the 2k-user headroom reader should time it. The nightly tick (`/api/catchups/tick`)
  now exists, so the per-page sweep is belt over braces.
- **admin-analytics**: `components/admin/catchup-status.ts` keeps its own Round/series
  vocabulary on purpose (its docblock: "the panel's words for the panel's chips"); it does
  not duplicate `describeEditionStatus`. Nothing to merge.
- **bundle**: the 47 KB `AnimatePresence`/`Textarea` chunk (`370feaobakd1f.js`) rides
  `/catchups/[catchupId]` and `/catchups/new` but not `/catchups` or `/feed`; whether `motion`'s
  exit half can be avoided by `FadeRise` is the bundle lens's question.
- **components/common / design-system**: the tile string in finding 17 appears in exactly
  the ten Catch-ups files, but the consoles' comment says it "match[es] the feed's cards" --
  if the feed spells the same tile another way, a `tile` utility in `globals.css` is the
  real fix.
- **components/auth**: nothing in the join flow duplicates `auth-panel`; the join route's
  public shell is route-private (finding 08).
- **bugs**: `answer-photos.tsx:129-131`'s claim that only legacy rows have more than one
  photo is false (finding 14j); harmless today, misleading tomorrow.
- **tests**: `raw/tsc-unused.txt` `answer-photos.tsx(149,11): 'photo' is declared but never
  read` -- `PhotoRows`'s render-prop `(photo, i, cell)` names its first argument and the body
  reads `images[i]`; rename to `_photo` or use it. One token.

## Metrics

- Territory: 70 files, 13,581 lines (app/(main)/catchups 5,853 in 12 files; app/catchups 312
  in 3; tick 39; components/catchups 4,131 in 42; libs 2,219 in 8; tests 1,469 in 4). Read
  fully: ~12,900 territory lines plus 895 (spec), 667 (audit-1 report), ~250 (fix-prompt
  slices), ~200 (upload hook, downscale, ownership, member-gate) outside it.
- Biggest files: `actions.ts` 2,054 (1,246 code / 627 comment); `catchups-core.ts` 922
  (500 / 351); `catchups-core.test.mjs` 874; `people-panel.tsx` 728; `(home)/page.tsx` 444;
  `catchups.ts` 441; `catchup-lifecycle.test.mjs` 401; `(index)/page.tsx` 395;
  `console-collecting.tsx` 369.
- Comment-heaviest (comment/code, cloc): `catchup-caps.ts` 22/1; `catchup-shelf.ts` 35/18;
  `group-succession.ts` 39/43; `catchups-core.ts` 0.70; `catchups-notify.ts` 0.57;
  `catchups-types.ts` 0.62; `catchups-round-view.ts` 0.52; `actions.ts` 0.50;
  `components/catchups` 0.29 (the lowest of the five directories in the repo's top-40 list).
- Client components: 30 of 42 (`raw/use-client.txt`); the reader path (`round/*`) is
  server-first except the three viewer/heart/TOC leaves.
- Actions: 22 exported, 22 copies of the session preamble, 20 `typeof` guards, 6
  `requireVerifiedMember` gates, 19 through the three gate helpers.
- Client JS: `/catchups/[catchupId]` 1,181 KB first-load (heaviest Catch-ups route); 5 chunks
  / 125 KB not loaded by `/catchups`, of which 43 KB is the home tree with every Keeper
  control, 17 KB a Tooltip for one (i).
- Duplication: 20 jscpd clones inside `actions.ts` are the 22 shared preambles (deliberately
  not re-proposed); 4 spellings of the edition select; 5 of the membership lookup; 5 of the
  cadence set; 3 of the join shell; 2 of the preparing scene; 10 of the tile string; 11 of
  the B-042 comment.
- Honest savings total across findings: ~350 lines (of which ~190 are the Spotify placeholder,
  ~90 stale comments), 3 DB columns, 1 outbound network call on a write path, ~1.1 KB per
  Catch-up home RSC render, an estimated 20-45 KB raw client JS off the Catch-up home, 5 -> 1
  cadence spellings, 3 -> 1 join shells, 2 -> 0 preparing scenes, 4 -> 0 membership clones,
  3 -> 0 select clones.
