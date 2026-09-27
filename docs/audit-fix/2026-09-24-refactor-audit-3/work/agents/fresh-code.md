# fresh-code - refactor audit 3 report

Cross-cutting lens L05: everything added or changed since audit 2's tree (`72b5a1d`, 2026-09-03, 347 commits to HEAD `70570bcd`). The charter asked for five things: (1) a verdict on every one of the 245 files added under `src/`, `scripts/`, `e2e/` and `prisma/`, with the §5d/§5e/React lists applied and lab additions at classification depth; (2) the changed regions of the 60 most-changed existing files; (3) the post-audit-2 series read as wholes (loading screens, comment section, Catch-ups rework, Collection dates/scrubber/screen copies, mascot moments, calling card, composer, analytics, admin review room); (4) ghost references to the 119 deleted files; (5) comments describing code that no longer exists. Date: 2026-09-24. Files in territory: 245 added + 60 most-changed + 119 deleted (references only). Read fully: 141 of the 153 non-lab added files (the 12 magazine JSON fixtures were sized, not read), all 60 diffs, 23 migrations; the 92 lab additions were classified from their headers and their jscpd/knip/tsc lines, per the charter.

## Coverage
- Read fully: every added file under `src/lib/**` (44 TS + 22 `*.test.mjs` + `magazine/*`), `src/app/(main)/**` and `src/app/api/**` additions (8), `src/instrumentation-client.ts`, `src/app/tailwind-theme.css`, every added `src/components/**` file (49), all 10 added `scripts/**` files, `e2e/comments-close.spec.ts`, all 23 `prisma/migrations-manual/2026-09-*.sql`. The changed regions (`git diff 72b5a1d HEAD -- <file>`) of the 60 most-changed existing files, including the 35 `loading.tsx` files as a series, `comments-section.tsx`, `catchups-core.ts`, `catchups.ts`, `catchups/actions.ts`, `collection-client.tsx`, `image-viewer.tsx`, `schema.prisma`, `feed/actions.ts`, `admin-analytics.ts`, `last-seen.ts`, `hoopoe.tsx`, `photo-layout.ts`, `globals.css`, `directory-client.tsx`, `retention.ts`, `utils.ts`, `auth.ts`, `sidebar.tsx`, `review-room.tsx`, and the changed test files.
- Skimmed (why): the 92 `src/app/lab/**` additions - headers, exports and their tool lines only, as the charter instructs (a lab room is never proposed for deletion; what matters is what leaks or duplicates). The 12 `src/app/lab/catchups/_fixtures/magazine/*.json` fixtures (18,632 lines) were measured, not read.
- Not read (why): nothing in the charter's list was skipped. Deleted-file ghost hunting was done mechanically (every deleted file's stem grepped across `src`, `scripts`, `e2e`, `prisma`) and then by hand for the deleted symbols the summary names.
- Uncommitted edits seen (someone else's WIP): none. `git status --short -- src scripts e2e prisma` was empty at the start and at the end of this pass; the only untracked paths are the two audit folders.

## Summary
The new code is not the bloat pattern audit 1 fought. It is comment-dense in the way §4 defends (reasons, dates, owner quotes, audit ids; I found exactly one comment that restates its next line and it is quoted under Not-findings), and the changed regions of the 60 most-changed files are mostly *removals* of the things audit 2 asked for (offset paging, the Groups residue, the `preparing` state, five `revalidatePath("/feed")` calls, the nine `user.count()`s). So the structural wins here are not "trim the prose"; they are **things the rework declared dead and did not bury**, **lab-born code that shipped without its lab half being retired**, and **comments that call themselves authoritative and are wrong**.

The biggest structural items, in the honest units: one 326-line component nobody imports, whose Settings row still opens it (fresh-code-01, plus an owner call because it may be a bug rather than dead code); a Spotify resolver, a zod field, a write path and three live columns that no client can reach since 2026-07-25 (fresh-code-02, ~150 lines + 3 DB columns + 1 migration to write); a 2,396-line layout engine sitting in `src/lib` with only lab importers (fresh-code-03, a relocation); a pre-migration `P2021` guard at 10 call sites and 4 pages for tables that have existed on production since 2026-09-08 (fresh-code-04); three backend-complete features with no shipped UI, deliberately, awaiting the owner's pick (fresh-code-05, three owner decisions); and 85 lab-to-shipped clones totalling 1,652 lines, the prototypes of the Catch-ups rework left standing beside what they became (fresh-code-06, owner call, with an autonomous alternative that keeps every room).

The cheap well is also real but small: four schema comments say seven columns "are still in both databases until the owner runs" migrations he ran on 2026-09-08 (commit `c34aae3e`), and the schema header, the Photo model and `docs/TRAPS.md` all count eleven hand-written indexes where the live catalog has nine (fresh-code-07). Twelve smaller stale or orphaned comments, two ghost allowlist rows in a QA script and one ghost pointer to a deleted file are listed in fresh-code-09/10.

Split: 13 structural, 9 cheap. What surprised me: the loading-screen series (35 files, 1,725 lines) is disciplined - real `PageHeader`, real `Button` boxes, measured heights - and its one duplication is a three-line "line box" idiom written 68 times across 21 files (fresh-code-20). What earlier audits left that is now moot: audit 2's C3 (one read for both halves of the advance) shipped; the `withMember` wrapper refutation still holds and nothing here re-argues it; the CSS lab-share lever shipped as `tailwind-theme.css` + `@source not "./lab"` and should be re-measured by the bundle lens, not by me.

## Findings

### fresh-code-01 - Delete or restore the Catch-up picture picker: a 326-line component nobody imports, whose Settings row still opens it
- **Where**: `src/components/catchups/home/picture-picker-dialog.tsx:1-326` (whole file, `export function PicturePickerDialog`); `src/components/catchups/settings/settings-surface.tsx:145` (`| { shape: "picture" }` in the `Opens` union) and `:281` (`opens: c.canChangePicture ? { shape: "picture" } : undefined,`); `SettingsDialogs` in the same file handles only `shape === "confirm"` and `shape === "edit"`; `src/components/catchups/settings/types.ts` and `src/components/catchups/home/types.ts` (`canChangePicture`); `src/app/(main)/catchups/[catchupId]/(home)/page.tsx` (computes `canChangePicture` via `mayChangeCatchupPicture`); `src/app/(main)/catchups/actions.ts` (`export async function setCatchupPicture`); `src/lib/catchups-core.ts` (`mayChangeCatchupPicture`, tested in `catchups-core.test.mjs` "mayChangeCatchupPicture: the Keeper, or ANYONE in a batch"); the two rule tests that name the file by path: `src/lib/upload-size-rule.test.mjs:41` and `src/components/ui/focus-recipe.test.mjs:61` (`["src/components/catchups/home/picture-picker-dialog.tsx", "hidden file input; the visible control is a Button"]`).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: owner
- **Evidence**: `grep -rl picture-picker-dialog src scripts e2e` returns only the two rule tests above - no importer in shipped code and none in `src/app/lab` (the lab settings room has its own `PictureBody` at `src/app/lab/catchups/_settings.tsx:1222`). `git log -S "picture-picker-dialog"`: last imported in `02f9302f`, the import dropped in `b94677ce` (2026-09-09) when the settings surface was rebuilt. knip (`knip-repo-plus-lab.txt`) lists it as one of its two unused Catch-ups files. jscpd: two clones against `src/components/common/photo-aim.tsx` (24 and 17 lines). The Settings row is live: `settingsGroups()` emits `{ shape: "picture" }` when `canChangePicture` is true, and nothing renders for that shape, so a Keeper (or anyone in a batch Catch-up, per owner question 18) pressing "Picture" gets no dialog.
- **What to do**: This needs the owner's answer first (Owner decisions, A). If **delete**: remove the file; remove the `{ shape: "picture" }` arm and the Picture row from `settingsGroups()`; remove `canChangePicture` from both `types.ts` files and from the home page's panel props; remove `setCatchupPicture` from `actions.ts` (it is a `"use server"` export, so it is a public endpoint today); decide whether `mayChangeCatchupPicture` stays (it is only read to compute `canChangePicture`) and drop its test; remove the two rule-test rows that name the file (both are allowlists, so the tests go green on their own once the entry is gone, but leave no ghost row - see fresh-code-10). If **restore**: add a `shape === "picture"` arm to `SettingsDialogs` that renders `PicturePickerDialog` with `setCatchupPicture`, and keep everything else; the jscpd pair against `photo-aim.tsx` then wants the shared aim control rather than a copy.
- **Saving**: delete path: 326 lines + ~40 lines of plumbing + 1 server-action endpoint + 2 clones; restore path: 0 lines, one working control.
- **Risk & gate**: low either way. `npm run check` (the two allowlist tests, `catchups-core.test.mjs`, `batch-catchups.test.mjs` which greps `mayChangeCatchupPicture`); open `/catchups/<id>` as a Keeper and press Settings > Picture.
- **Confidence**: high that the file is unreferenced; medium on which way the owner wants it - the picture feature was specified (spec 3.4, "every Catch-up carries a photograph", his three photographs in `2026-09-10-catchup-pictures-his-three.sql`) and the pool pick (`catchup-picture-pick.ts`) is live, so the *upload-your-own* half is what went missing, not the picture.
- **Notes**: This straddles the bug audit: a row that opens nothing is a bug, and the peer session may report it. I am reporting the dead code and the plumbing that only exists to feed it. My fear on the delete path is `account-purge.ts`, which has a `restoreCatchupPicturesUploadedBy` step keyed on `uploads/<id>/` keys - with no upload path there are no such rows, and that step becomes a second placeholder; leave it if the owner restores, remove it if he deletes.

### fresh-code-02 - Retire the Spotify song trio: a resolver, a zod field, a write path and three live columns that no client sends since 2026-07-25
- **Where**: `src/lib/catchups-core.ts:1319-~1395` (the block under `// ─── Spotify (keyless oembed; the SSRF boundary)`, `export type SpotifyResult`, `export async function resolveSpotify`) and its header line 6 (`the keyless Spotify resolver`) and line 42; `src/app/(main)/catchups/actions.ts:199` (`songUrl: z.string().trim().max(2000).optional(),`), `:1734-1745` (`const hasSong = parsed.data.songUrl !== undefined;` / `sendsSong: Boolean(parsed.data.songUrl?.trim())`), `:1796-1805` (`let songPatch: { songUrl: ...; songTitle: ...; songArt: ... }` and the `await resolveSpotify(trimmedSong)` call), `:1834`, `:1843`, `:1852` (comment "Between the two sits `resolveSpotify`, a network call with a 3-second"), `:1901-1903` (the `songUrl/songTitle/songArt` select), `:1955` (`!entry.songUrl` in the empty-answer check); `src/lib/vote-question-rule.ts` (`decideVoteAnswer` takes `sendsSong`); `src/lib/catchups-export.ts` (song fields in the export select and type); `scripts/dev/export-catchups.mjs:276-278`; `src/lib/catchups-edition-view.ts:125` ("No song columns: they are null on every row and die in phase 11"); `prisma/schema.prisma` `CatchupEntry` (`songUrl String?`, `songTitle String?`, `songArt String?`); `src/lib/catchups-core.test.mjs` (the `resolveSpotify` tests) and `src/lib/catchup-lifecycle.test.mjs` (names it); `src/app/lab/catchups/sketches/_media.ts:38` (comment only).
- **Phase**: placeholder
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: The only control for a `songs` prompt is `src/components/catchups/answer/song-attachment.tsx` (`<SongNameField>`), whose header says: *"You type the name of the song. No pasted links: the owner's instruction (2026-07-25) is 'let them just type the name of the song instead of pasting links' ... the existing `songUrl`/`songTitle`/`songArt` trio is Spotify-shaped (`submitEntry` only accepts a resolvable open.spotify.com URL ...) so a name-only song written there would save as nothing and read as a dead link."* The name is stored in `body`. So no shipped client sets `songUrl`; the zod field, the resolver, the `songPatch` write and the three columns are reachable only by a hand-made call. `db-columns-live.json` confirms all three columns still exist on `CatchupEntry` (`songUrl:text, songTitle:text, songArt:text`); the edition view says they are null on every row. Phase 11 (link previews, `2026-09-14-link-previews.sql`, `link-preview-core.ts`) is what replaced pasted links, and it shipped without dropping these.
- **What to do**: (1) Run the gate SELECT below on both databases. (2) Remove `songUrl` from `submitEntrySchema`, the `hasSong`/`sendsSong` plumbing (and the `sendsSong` parameter of `decideVoteAnswer`, adjusting `vote-question-rule.test.mjs`), the `songPatch` block, the three fields in the entry select and the `!entry.songUrl` term. (3) Delete the Spotify block from `catchups-core.ts` and its header mentions; delete the `resolveSpotify` tests from `catchups-core.test.mjs` and the mention in `catchup-lifecycle.test.mjs`. (4) Drop the fields from `catchups-export.ts` and `export-catchups.mjs`. (5) Write `prisma/migrations-manual/2026-09-XX-drop-song-columns.sql` (idempotent `ALTER TABLE "CatchupEntry" DROP COLUMN IF EXISTS "songUrl", ...`) and remove the three lines from `schema.prisma`, `npx prisma generate`. (6) Leave `SongNameField`, the `songs` category and `promptKind("songs")` alone - they are the live feature. (7) Update the `catchups-edition-view.ts:125` note to say the columns are gone.
- **Saving**: ~150 lines of shipped TS (resolver ~75, action plumbing ~35, tests ~40), 3 DB columns, 1 network path (the oembed fetch, with its SSRF boundary) out of a server action, 1 optional field off a public endpoint's schema.
- **Risk & gate**: low. Gate first: `SELECT count(*) FILTER (WHERE "songUrl" IS NOT NULL OR "songTitle" IS NOT NULL OR "songArt" IS NOT NULL) AS with_song, count(*) AS total FROM "CatchupEntry";` on production and demo - expect `with_song = 0`. Then `npm run check` (`catchups-core.test.mjs`, `vote-question-rule.test.mjs`, `catchup-lifecycle.test.mjs`, `catchups-types.test.mjs` if it lists entry fields), open an Edition with a `songs` question and answer it.
- **Confidence**: high. The one thing that would change my mind: a reader that still draws `songUrl` as an "Open in Spotify" outlink - the song-attachment header says one existed in `edition/answer-card.tsx`; I found no such file at HEAD and `catchups-edition-view.ts` says the columns are null everywhere, but the fixer should grep `songUrl` in `src/components` once more.
- **Notes**: This is the cleanest "declared dead, not buried" item in the territory: three separate comments (schema, edition view, song-attachment) agree the trio is a corpse, and the write path still carries it. The reason it survived phase 11 is probably that the link-preview work was additive. `song-attachment.tsx` also carries a TODO for a `CatchupEntry.songs Json?` column; that is a product question, not this finding.

### fresh-code-03 - Move the magazine engine out of `src/lib`: 2,396 lines with only lab importers
- **Where**: `src/lib/magazine/index.ts` (325), `types.ts` (289), `from-export.ts` (129), `image.ts` (154), `score.ts` (146), `grammar.ts` (696), `paginate.ts` (361), `measure.ts` (296), `magazine.test.mjs` (296). Importers: `src/app/lab/catchups/magazine/{page.lab.tsx,_pages.tsx,_live.ts,_room.tsx,_measure.ts}` only. `scripts/dev/print-magazine.mjs` drives the lab route in headless Chrome and does not import it; `scripts/dev/export-catchups.mjs` names it in a comment. Fixtures: `src/app/lab/catchups/_fixtures/magazine/*.json` (12 files, 18,632 lines; `wall-300.json` 5,631, `no-photos.json` 3,637, `photo-heavy.json` 2,248) and `corpus.ts`, which `magazine.test.mjs` imports from the lab.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (where it lives); owner (whether the magazine is a feature - Owner decisions, F)
- **Evidence**: `grep -rl "lib/magazine" src scripts` returns the five lab files, the test, and the comment in `export-catchups.mjs`. `raw/barrels.txt` names `src/lib/magazine/index.ts` as one of the repo's two internal barrels (§5f). The shipped app never imports it, so it costs the member nothing today; what it costs is that `src/lib` (the folder every shipped module lives in, comment ratio 0.83) carries a 2,396-line subsystem with a test whose fixture corpus lives under `src/app/lab`, i.e. a lib file that depends on the lab.
- **What to do**: Move `src/lib/magazine/*` to `src/app/lab/catchups/magazine/_engine/` (or `src/app/lab/_lib/magazine/`), moving `magazine.test.mjs` with it (the test glob is every tracked `*.test.mjs`, so it keeps running; `scripts/qa/check.mjs`'s floor counts files, not paths - confirm the runner does not exclude `src/app/lab`). Update the five lab imports and the `export-catchups.mjs` comment. Leave `print-magazine.mjs` alone. If the owner says the magazine ships (Owner decisions, F), the reverse move is one `git mv` later and the fixture corpus should then be cut to what a test needs (see the tracked-weight lens on the 18,632 JSON lines).
- **Saving**: 0 lines; 1 barrel out of `src/lib`; the lib-to-lab dependency gone; the `src/lib` census honest (2,396 fewer lines that no shipped route can reach).
- **Risk & gate**: low. `npm run check` (`magazine.test.mjs` must still be discovered and green, the lab registry audit), open `/lab/catchups/magazine?data=one-writer`.
- **Confidence**: high on the importer census; medium on the destination - if `scripts/qa` deliberately keeps tests out of `src/app/lab` (I did not find such a rule, but `lab-audit.mjs` is strict about page names), the test can stay in `src/lib` as a single file that imports across.
- **Notes**: Two small things inside the engine, worth doing during the move: `from-export.ts:28-29` casts `(img as { width?: number | null }).width` although `ExportedImage` already declares `width?`, so the cast is a no-op (§5e-2 shape); and `index.ts:185-209`, the `runBeam` closure, is indented two levels short of its nesting (the `for (const story of answered)` body sits at the same column as the `const`), which reads as a pasted block - a formatter pass fixes it. `magazine.test.mjs` lays out every corpus Edition three times (the loop, the determinism test, and 11 fixture-specific tests); see fresh-code-08.

### fresh-code-04 - Retire the pre-migration `P2021` guard: tables that have existed on production since 2026-09-08
- **Where**: `isMissingCatchupTable(` call sites (10, excluding its definition and tests): `src/lib/catchups.ts` (3), `src/lib/batch-catchups.ts` (1), `src/app/(main)/catchups/actions.ts` (1), `src/app/(main)/catchups/(index)/page.tsx` (1), `src/app/(main)/catchups/[catchupId]/(home)/page.tsx` (1), `src/app/(main)/catchups/edition/[editionId]/page.tsx` (1), `src/app/(main)/catchups/new/page.tsx` (1), `src/app/catchups/join/[token]/page.tsx` (1). The `<AlmostReady/>` holding scene: `src/components/catchups/almost-ready.tsx` and its four page importers (index, home, edition, new). The definition in `src/lib/catchups-core.ts` (`export function isMissingCatchupTable`). Comments that describe the guard as current: `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:49-51` ("Every query path is wrapped so a missing Catchup* table (P2021, pre-migration) renders the shared `<AlmostReady/>` holding scene instead of a 500 (migration handoff rule 3b)"), `src/app/(main)/catchups/edition/[editionId]/page.tsx` header. Pins that name it: `src/lib/catchup-lifecycle.test.mjs`, `src/lib/catchups-core.test.mjs`.
- **Phase**: placeholder
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/db-tables-live.json` (production): `CatchupSeries` 8 live rows, `CatchupEdition` 9, `CatchupEntry` 141, `CatchupEditionRead` 23, `CatchupPromptOption` 0 (exists), `LinkPreview` 7. The migrations that create them are dated 2026-09-08 to 2026-09-14 and `c34aae3e` records that the September migrations were run "against both Supabase projects". The guard exists for "migration handoff rule 3b" - the window between a deploy and the owner running the SQL. That window closed sixteen days ago and every table the code names is present. What the guard does today: on any *other* Prisma error in those wrapped paths it re-throws (fine), and on P2021 it draws a holding scene nobody will see.
- **What to do**: Remove the try/catch + `isMissingCatchupTable` arms at the 10 sites (each is a `try { ... } catch (err) { if (isMissingCatchupTable(err)) return <AlmostReady/>; throw err; }` shape or the `advanceDueCatchups` variant); delete `almost-ready.tsx` and its imports; delete `isMissingCatchupTable` from `catchups-core.ts` and the two pins that name it (move any behaviour those pins carry that is *not* about the guard); rewrite the two header comments. Keep the general "never throw at a member" catch in `advanceDueCatchups` - it has a second job (reportSwallowed).
- **Saving**: ~120 lines across 10 files, 1 component, 1 helper, 4 fewer branches on every Catch-ups page render.
- **Risk & gate**: medium only because it is 10 files. Gate first, on BOTH databases: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'Catchup%' ORDER BY 1;` - expect the seven Catchup tables (Series, Edition, Entry, EntryLove, Prompt, PromptOption, EditionRead, ReminderPref). Then `npm run check`, `npm run verify:crawl` (every Catch-ups route 200), and `catchup-lifecycle.test.mjs` green after its pin is updated.
- **Confidence**: high on production; medium on the demo (I cannot read it; the SELECT above is the proof). The one thing that would change my mind: a *future* Catch-ups table planned for a later phase - then the guard should be re-added around that one query when the phase lands, not kept everywhere now.
- **Notes**: This is the same class as audit 2's D-phase "switched-off subsystems": a safety net whose event has passed. The `<AlmostReady/>` scene is a nice piece of copy and the mascot may be in it; if the owner wants the holding pattern kept as a *design* (a room in `/lab`), that is a lab call, not a reason to keep it in four page trees.

### fresh-code-05 - Three backend-complete features with no shipped UI: voice answers, vote questions, time capsules (owner decisions B, C, D)
- **Where**: **Voice**: `src/app/api/upload/audio/route.ts` (85) and `src/app/api/upload/audio/finalize/route.ts` (91), both headed "NOTHING CALLS THIS YET"; `src/lib/voice-answer.ts` (35), `src/lib/voice-answer-rule.ts` (239), `src/lib/voice-answer-rule.test.mjs` (213); `src/app/(main)/catchups/actions.ts` `submitEntrySchema.audio` ("NOTHING SENDS THIS YET"); `src/lib/storage.ts` (`"audio"` in `KNOWN_ROOTS`, `copyObject`, `readObjectHead` ~70 lines); `src/lib/account-purge.ts` (`audioUrl` collection); columns `CatchupEntry.audioUrl/audioSeconds/audioIsAuto` (`2026-09-14-voice-answers.sql`); the lab room `src/app/lab/catchups/voice/*` (1,688 lines). **Vote**: `src/lib/vote-question-rule.ts` (175), `vote-question-rule.test.mjs` (243), `"vote"` in `PROMPT_CATEGORIES` and `promptKind`, `CatchupPromptOption` table (0 live rows) and `CatchupEntry.pollOptionId` (`2026-09-14-vote-questions.sql`), `submitEntrySchema.pollOptionId` ("NOTHING SENDS THIS YET"); lab `src/app/lab/catchups/vote/*` (1,213 lines). **Capsule**: `src/app/(main)/catchups/actions.ts` `setEditionTimeCapsule` ("NOTHING CALLS THIS YET" - the lab capsule room names it in two comments, `capsule/page.lab.tsx:7`, `_mark.tsx:8`, and does not import it); `CatchupEdition.timeCapsule/sealedAt` and the `sealed` status, `notifySealed` in `catchups-notify.ts`, the `requires` arm of the CAS in `catchups.ts`, `src/lib/time-capsule-rule.test.mjs` (367); lab `src/app/lab/catchups/capsule/*` (1,043 lines).
- **Phase**: placeholder
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: Each is deliberate: the lab registry notes say "built underneath and switched off" and "for him to pick", and the rework's owner question 31 (the spec's recorded answers) is the reason they were built before being chosen. So they are not bloat by §4's standard; they are §5a-2 placeholders whose *duration* is the question. The three together are roughly 1,050 lines of shipped-path TS (routes, rules, actions arms, storage), ~820 lines of tests, 6 DB columns + 1 table, and 3,944 lines of lab rooms, all dated 2026-09-14/15.
- **What to do**: Nothing autonomous. Ask the three questions below. If any is shelved: delete its routes/rules/tests and lab room, write a dated `DROP COLUMN IF EXISTS` migration, remove the schema lines, and take the `"audio"` root back out of `KNOWN_ROOTS` (its comment says "an earlier root was rightly backed out of it"). If shipped: the placeholder comments ("NOTHING CALLS THIS YET") come out with the UI, and fresh-code-15's audio-route clone should be folded then.
- **Saving**: per feature shelved: ~350 lines TS, ~270 lines tests, 2-3 DB columns, ~1,200 lines of lab; per feature shipped: 0 lines and a finished feature.
- **Risk & gate**: n/a until decided; each removal is then `npm run check` (the rule tests are deleted with the feature, so the suite floor in `check.mjs` must be lowered by that many files, named), `security-regressions.test.mjs` (the audio routes are upload paths), and a live SELECT that the columns are null everywhere.
- **Confidence**: high that all three are unreachable from any shipped screen (the schema fields are optional and no client sends them); high that they were meant to be.
- **Notes**: My fear is the middle state lasting: every one of these adds a branch to `submitEntry`, a column to every `CatchupEntry` read, and a rule test to the 45-second `check`. Three dated pieces of scaffolding that nobody has picked in ten days are not a problem; the same three next spring are. The capsule is the most entangled (a status in the state machine, a CAS arm, a notification, a cron interaction) and the least removable; the voice path is the most removable (two routes and a storage root).

### fresh-code-06 - The Catch-ups rework's lab prototypes were not retired after their transplant: 85 lab-to-shipped clones, 1,652 lines (owner decision E)
- **Where**: pairs from `raw/jscpd.txt` (largest first): `src/app/lab/catchups/_settings.tsx` <-> `src/components/catchups/settings/settings-surface.tsx` (8 clones: 62, 58, 48, 35, 30, 25, 23 ... lines); `lab/catchups/sketches/_reader.tsx` <-> `components/catchups/edition/reader.tsx` (53, 31, 21); `sketches/_navigator.tsx` <-> `edition/navigator.tsx` (46); `sketches/_home.tsx` <-> `home/collecting.tsx` (45, 31, 23) and `home/people-door.tsx` (22); `sketches/_parts.tsx` <-> `edition/reader-parts.tsx` (28, 24, 23, 22); `sketches/_list.tsx` <-> `index/archived-row.tsx` (22); `lab/catchups/wall/_shapes.tsx` <-> `edition/photo-run.tsx` (29, 28) and `common/flush-avatar.tsx`; `lab/collection/scrub/_scrubbers.tsx` <-> `collection/photo-scrubber.tsx` (26, 25, 21); `lab/reach/page.lab.tsx` <-> `profile/get-in-touch.tsx` (30); plus the older pairs `lab/chain-lines/page.lab.tsx` <-> `profile/houses-chain.tsx` (63, 27) and `lab/profiles/_variant-letterhead-2.tsx` <-> `profile/letterhead-profile.tsx` (39). The false claim: `src/components/catchups/home/catchup-home.tsx:299-302` - "the panel inside them is the same component the /lab/catchups/settings room draws -- so the room he signed off and the shipped surface cannot drift." `src/app/lab/catchups/settings/_room.tsx` imports nothing from `settings-surface.tsx`; it imports the lab's own `_settings.tsx`, which defines its own `settingsGroups` (line 401) and `confirmCopy` (line 1074).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: owner
- **Evidence**: jscpd parsed at HEAD: 325 clones, of which 100 touch a file added since audit 2; 85 are lab-to-shipped pairs totalling 1,652 lines, 127 are lab-to-lab, and only 5 are shipped-to-shipped (all listed in fresh-code-15). So the duplication growth audit 2 measured (232 -> 325 clones, 1.82 % -> 2.44 %) is almost entirely the rework's sketches standing beside what they became. No shipped file imports from the lab (`grep -rn "app/lab" src/components src/lib src/app/\(main\)` finds comments only), so nothing leaks; the cost is the census and the drift: `_settings.tsx` (1,226 lines) and `settings-surface.tsx` (1,010) already differ, and the shipped comment claims they cannot.
- **What to do**: Owner call per §3 (a room is never deleted on a recommendation). Two autonomous options that keep every room: (a) make each room *import the shipped component* the way `src/app/lab/comments/_room.tsx` already does ("the shipped PostCard and CommentsSection with no props this room invented") - the registry notes for `/lab/new-post` and `/lab/collection/scrub` already say "SHIPPED ... the room stays as the record", which is exactly the state where a room should show the shipped thing; (b) leave the sketches as frozen records and fix only the false comment in `catchup-home.tsx`. Either way, correct `catchup-home.tsx:299-302`.
- **Saving**: (a) up to 1,652 clone lines out of the lab and 85 clones off the jscpd count (the rooms shrink to harnesses); (b) 0 lines, one true comment.
- **Risk & gate**: (a) medium - each room re-pointed at the shipped component must still open (`/lab/catchups/sketches`, `/lab/catchups/settings`, `/lab/collection/scrub`, `/lab/reach`), `npm run check` (lab registry audit), `npm run visual` (the lab is not in ROUTES, so no baseline moves). (b) none.
- **Confidence**: high on the numbers (the parse is reproducible from `raw/jscpd.txt`); medium on which rooms the owner considers "the record" versus "still deciding" - the settings, sketches and scrub rooms have shipped verdicts; the voice/vote/capsule rooms do not and must stay as they are.
- **Notes**: This is the largest single number in the territory and it is not a member-facing cost, which is why it is an owner call and not a T2. The honest framing for him: the drawings he approved and the built thing have quietly stopped being the same drawing, and one comment says they are.

### fresh-code-07 - Correct the schema and TRAPS comments that call themselves authoritative and are wrong: seven "still in both databases" columns and an index census of eleven that is nine
- **Where**: `prisma/schema.prisma:305-306` ("the column is still in both databases until the owner runs prisma/migrations-manual/2026-09-07-drop-image-greyscale.sql"), `:369-370` ("The columns and their two trigram indexes are still in both databases until the owner runs ... 2026-09-07-drop-collection-legacy-tags.sql"), `:522-523` (Group `description`/`coverImage` "... until the owner runs ... 2026-09-07-drop-groups-residue.sql"), `:678-679` (`bounceKind` "... until the owner runs ... 2026-09-07-drop-bounce-kind.sql"); `prisma/schema.prisma:11` ("ELEVEN INDEXES EXIST THAT THIS FILE CANNOT DESCRIBE"), `:47` ("The demo database has only SEVEN of the eleven"), `:498` ("Three GIN trigram indexes on caption, area and freeTags exist in the"); `docs/TRAPS.md:41` ("**ELEVEN indexes exist that Prisma cannot see**") and `:50` ("**The demo database has only seven of the eleven.**").
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous (the TRAPS edit is a factual correction of a do-not-touch document; the orchestrator should say whether that counts)
- **Evidence**: `git show c34aae3e` (2026-09-08, "docs: the six migrations are run"): "bounceKind, greyscale, area, freeTags, Post.groupId, Group.description and Group.coverImage dropped. Every guard passed." `raw/db-columns-live.json` at HEAD: `Image` has no `greyscale`; `Photo` has no `area`, no `freeTags`; `Group` has no `description`, no `coverImage`; `OutboundEmail` has no `bounceKind`; `Post` has no `groupId`. `raw/db-indexes-live.json`: the trigram indexes that exist are `Photo_caption_trgm_idx`, `User_name_trgm_idx`, `Place_altNames_trgm_idx` - `Photo_area_trgm_idx` and `Photo_freeTags_trgm_idx` are gone with their columns, so the hand-written census is nine, not eleven; the demo count of "seven of the eleven" is therefore also stale (five of nine, if the same four are still missing - unverified, I cannot read the demo).
- **What to do**: Rewrite the four column comments to past tense ("dropped 2026-09-08, `c34aae3e`"); change ELEVEN to NINE in the header and remove the two dropped index lines from its list (the list was written 2026-09-05, `9f0c369f`); rewrite `schema.prisma:498` to "One GIN trigram index on caption"; update `docs/TRAPS.md:41` and `:50` to match, after running on the demo `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN (<the nine>)` so the "N of nine" number is measured, not guessed.
- **Saving**: ~6 lines; the point is that these comments are the kind §4 defends *because* they carry facts, and four of them carry the wrong fact with the word "authoritative" on them.
- **Risk & gate**: none to code. `npm run check` (there is a rule test that reads the schema header? none found by grep for "ELEVEN"; `index-coverage.test.mjs` reads the schema and should stay green).
- **Confidence**: high.
- **Notes**: Related, and the same shape: `prisma/migrations-manual/2026-09-08-batch-catchups.sql` and `2026-09-08-catchup-picture.sql` both say their VALUES pool "was the six stand-ins ... moved by 2026-09-10-catchup-pictures-his-three.sql, not by editing this" while their VALUES now list his three photographs (edited to satisfy `assertPoolRows`). The migrations were run, so nothing depends on it; the note is simply false about its own file. Listed under fresh-code-09 with the other stale comments.

### fresh-code-08 - The added tests that walk the whole tree, lay out the corpus three times, or ask git instead of the disk
- **Where**: `src/lib/magazine/magazine.test.mjs` (lays out every corpus Edition in a loop, again for the determinism test, and 11 fixture-specific tests call `layoutMagazine` a third time on the same fixtures - the corpus includes `wall-300.json`, 5,631 lines); `src/lib/time-capsule-rule.test.mjs:249` and `:310` (two `walk(resolve(ROOT, "src"))` passes in one file); `src/lib/vote-question-rule.test.mjs:185` and `:217` (same); the six new whole-tree walkers `src/components/common/image-viewer-import-rule.test.mjs`, `src/components/common/motion-namespace-rule.test.mjs`, `src/lib/back-closes-rule.test.mjs`, `src/lib/collection-viewer-image.test.mjs`, `src/components/common/identity-row-overflow-rule.test.mjs`, `src/lib/rich-text-wrapping.test.mjs` (each `walk(join(ROOT, "src"))`); `src/lib/catchup-pictures.test.mjs` (runs `sharp(...).metadata()` on the three pool photographs, 6.79 MB); `src/lib/batch-catchups.test.mjs` (`execSync("git grep -lF 'advanceDueCatchups()' ...")`).
- **Phase**: hygiene
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `npm run check` went from 24.8 s (102 test files) to 45.9 s (130) between audits; the 28 new files are unaudited by §4's statement and these are the ones that do work proportional to the tree or to a 6.8 MB image set. `node --test` runs each file in its own process, so a walk cannot be shared *across* files, but two walks *within* a file are pure waste, and a sharp decode in a rule test is the only I/O-heavy test in the suite. The `git grep` in `batch-catchups.test.mjs` sees tracked files only, which `security-regressions.test.mjs` (changed in this window) explicitly rejects for the same job: "git sees TRACKED files only, so a brand-new file ... was invisible to this test until somebody staged it". An untracked new caller of `advanceDueCatchups()` passes the pin.
- **What to do**: Hoist the walk to module scope in `time-capsule-rule.test.mjs` and `vote-question-rule.test.mjs` (one walk, two tests). Replace the `execSync("git grep ...")` in `batch-catchups.test.mjs` with `walk()` + a regex, as `security-regressions.test.mjs` did on 2026-09-05. In `magazine.test.mjs`, lay each fixture out once into a `Map` at module scope and have the determinism test compare a second layout of *one* fixture, not all of them. In `catchup-pictures.test.mjs`, assert on the pool table and the committed dimensions rather than decoding the WebP (or keep one decode, not three). Measure with `node --test --test-reporter=spec` before and after; the lib-tests lens owns the suite-wide timing.
- **Saving**: check seconds (unmeasured by me; the magazine test alone is ~30 layouts of the heaviest fixture), 1 fail-open pin closed.
- **Risk & gate**: low. `npm run check`; the changed tests must still fail when their subject is mutated (the `vote-question-rule` test says it was mutation-tested - repeat that once).
- **Confidence**: medium on the seconds (not measured), high on the git-grep hole.
- **Notes**: None of these tests is vacuous; I read all 22 added `src/lib/*.test.mjs` and the three under `src/components` and each asserts on real code. This is cost, not correctness. `test-kit.mjs` is the place a memoised `walk(dir)` would go if the lib-tests lens wants one per process.

### fresh-code-09 - Twelve stale, duplicated or orphaned comments in the changed regions
- **Where** (each with its anchor):
  1. `src/components/posts/comments-section.tsx:316` and `:546` - the "treadmill, not a race" paragraph (~12 lines) appears twice, once at the focus effect and once in the `renderComposer` docblock, word for word.
  2. `src/components/posts/comments-section.tsx:251-253` - "The move itself runs in an effect rather than in the handler, and that is ... a scroll measured in the handler is measured against a ..." describes a handler-time scroll measurement that the 2026-09-16 pass removed (the move is now the effect; there is no handler scroll left to contrast with).
  3. `src/lib/catchups-core.ts:774` - "(`reviveDormantEdition` in the actions)": no such function exists or ever existed under that name (`git log -S reviveDormantEdition` finds only `d81a7db9`, the rename commit that wrote the comment); revival is inline in `submitPrompt`.
  4. `src/lib/catchups-core.ts:~1233-1250` - two stacked `/** ... */` docblocks above `export function homeStateLine(`: the first ("Not the same sentence as `catchupStageLine` below ...") belongs to `homeStateLine`, the second is `homeStateLine`'s own; the reader sees two docblocks on one function.
  5. `src/lib/catchups-core.ts:6` and `:42` - the header still lists "the keyless Spotify resolver" among the file's jobs (true only until fresh-code-02 lands; change together).
  6. `src/components/common/image-viewer.tsx:311` - "The sizes are LEARNED, not passed in. `ViewerImage` carries no dimensions" contradicts `width?: number; height?: number` at `:110-111` of the same file (added for the screen copies on 2026-09-23).
  7. `src/lib/catchup-reads.test.mjs` header - "Nothing DRAWS it yet -- the list ... is build phase 6": phase 6 shipped; `src/components/catchups/index/edition-cover-card.tsx` reads `e.read`.
  8. `src/lib/vote-question-rule.test.mjs:121` - lists `"preparing"` among Edition statuses; the state was deleted in `782d9f7b` (2026-09-08).
  9. `prisma/migrations-manual/2026-09-08-batch-catchups.sql` and `2026-09-08-catchup-picture.sql` - "not by editing this" beside VALUES that were edited (see fresh-code-07 Notes).
  10. `src/lib/batch-catchups.ts` header - says the batch heal runs from "three places" and lists two.
  11. `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:47` - "see `home/catchup-home-shell.tsx`": deleted in this window (one of the 119).
  12. `src/components/layout/notification-bell.tsx:64` - "Every `Notification.type` written anywhere in the app (feed/actions.ts, admin-actions.ts, ...)": `src/components/profile/admin-actions.ts` is deleted; those writers are `admin/people/actions.ts` and `admin/reports/actions.ts` now (both say so in their own headers); and `post-notifications.ts` is a writer the list does not name.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: quoted above; each was checked against the code at HEAD and, for 3 and 8, against `git log -S`.
- **What to do**: Delete the duplicate paragraph (1) keeping the one at the effect; delete (2); replace (3) with "inline in `submitPrompt`"; merge (4) into one docblock; (5) with fresh-code-02; rewrite (6) to say sizes are learned *unless the row carries them*; rewrite (7), (8), (9), (10); replace (11) with a sentence (the shell's two-column rule now lives in `catchup-home.tsx`); fix the list in (12) or, better, replace it with "see `CatchupNotifyKind` and the `type:` literals in `post-notifications.ts`, `admin/*/actions.ts`, `collection/actions.ts`".
- **Saving**: ~35 lines; twelve fewer places where a reader is told something false.
- **Risk & gate**: none. `npm run check` (rule tests read some of these files as text - `catchup-lifecycle.test.mjs`, `feed-write-rule.test.mjs`; none pins the comment text listed here, but run it).
- **Confidence**: high on all twelve.
- **Notes**: These are the *only* stale comments I found in ~19,000 added and ~12,000 changed lines, which is the audit-2 §4 result again: the comment mass is the product. I looked hard for restate-the-code comments in the added files and found one candidate (Not-findings).

### fresh-code-10 - Two ghost rows in the protocol audit's allowlist name files deleted on 2026-09-08
- **Where**: `scripts/qa/protocol-audit.mjs:177-178`: `["src/components/catchups/home/keeper-settings-dialog.tsx", "segmented-control selected thumb"],` and `["src/components/catchups/home/reminder-pref-control.tsx", "segmented-control selected thumb"],`. Both files are in `raw/files-deleted-since-audit2.txt`.
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `ls` confirms neither exists; the allowlist is keyed by path, so a missing file is silently never consulted. The risk is the inverse: if either name is ever reused, the new file inherits an exemption from the shape/colour protocol nobody re-argued.
- **What to do**: Delete the two rows. Consider making the allowlist assert that every path in it exists (the `lab-audit.mjs` habit), so the next deletion cannot leave a ghost.
- **Saving**: 2 lines, 1 fewer silent exemption.
- **Risk & gate**: none. `npm run check` (the protocol audit runs inside it).
- **Confidence**: high.
- **Notes**: Same class: `src/lib/rich-truncate.test.mjs` keeps its name for a deleted module, on purpose and with a reason ("several audit documents cite the tests below by this file and line"); that is a not-finding, listed below.

### fresh-code-11 - A QA helper kept "deliberately with no caller" since 2026-09-05, with two tests to keep it warm
- **Where**: `scripts/qa/local-base-url.mjs:29-36` (`export function cookieDomainForBaseUrl`, with the comment "Kept deliberately with no caller since tour-mobile-verify.mjs went on 2026-09-05 ... Delete it if that next script never arrives.") and its two assertions in `scripts/qa/local-base-url.test.mjs`.
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn cookieDomainForBaseUrl scripts src e2e` returns the definition and the test only. The comment sets its own expiry condition; nineteen days on, no script has arrived. `_dev-login.mjs:19` names the same deleted script in a history note (fine).
- **What to do**: Delete the function and its two assertions; leave the three-line trap in a comment beside `assertSameOriginAfterNavigation` if the knowledge is worth keeping.
- **Saving**: ~12 lines, 1 dead export, 2 test assertions.
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.
- **Notes**: Tiny, but it is precisely the pattern the owner named in §1 ("left over from previous tests and previous sessions") wearing a comment that admits it.

### fresh-code-12 - Drop the `export` keyword from nine symbols only their own file uses, and delete one dead pair
- **Where**: `src/lib/catchups-export.ts` (`export function everyAnswer`, `export function exportTotals` - no caller inside or outside the file, ~25 lines, plus the unused exported types beside them); `src/lib/catchup-pictures.ts` (`export const PICTURE_FOCUS_PATTERN`); `src/lib/link-preview.ts` (`export async function ensureLinkPreviews` - only `scheduleLinkPreviews` is imported elsewhere); `src/lib/link-preview-core.ts` (`decodeEntities`, `MAX_URL_LENGTH`, `LinkKind` - the `LinkKind` hit in `src/app/lab/profiles/_data.ts` is a different type of the same name); `src/components/catchups/home/home-head.tsx` (`HEAD_HEIGHT*` constants); `src/components/catchups/settings/settings-surface.tsx:357` (`export function settingsGroups`) and `:711` (`export function confirmCopy`) - both used only inside the file (the lab's `_settings.tsx` has its own, fresh-code-06); `src/lib/page-label.ts` (`ID_SEGMENT`, named only in an `admin-analytics.ts` comment); `src/lib/voice-answer-rule.ts` (the exports knip lists, all internal-only); `src/components/catchups/answer/answer-redirect.tsx:1-29` (whole file: no importer anywhere including lab; `/catchups/[id]/answer/page.tsx` is a `permanentRedirect` since build phase 7 and knip lists the file as unused).
- **Phase**: dead
- **Tier**: T1     **Class**: cheap (the export keywords) / structural (`answer-redirect.tsx`, `everyAnswer`/`exportTotals`)     **Decides**: autonomous
- **Evidence**: `raw/knip-repo-plus-lab.txt` lists each; re-grepped at HEAD across `src` (lab included), `scripts` and `e2e` - the grep table is in this session's log and reproduced in Metrics. `git log --follow` on `answer-redirect.tsx`: added 2026-09-07, last importer removed with the phase-7 redirect (2026-09-09); it is a client component, so it also has a `"use client"` boundary nobody crosses.
- **What to do**: Delete `answer-redirect.tsx`, `everyAnswer` and `exportTotals` (and their types if nothing else reads them); remove `export` from the rest so knip stops listing them. `ensureLinkPreviews`: keep the function, drop the keyword.
- **Saving**: 29 + ~25 lines, 1 file, 1 `"use client"` module, ~10 fewer knip lines (the knip gate in `check.mjs` is what the next session reads).
- **Risk & gate**: none beyond `npm run check`; `link-preview-core.test.mjs` imports from `link-preview-core.ts` - confirm it does not import any of the three before un-exporting (my grep says it does not).
- **Confidence**: high.
- **Notes**: `HEAD_HEIGHT*` may be the kind of constant a lab room *should* import (the home head's geometry); if the sketches room measures the same head, that is one more argument for fresh-code-06(a).

### fresh-code-13 - Break the one import cycle: `PhotoShapeIndex` belongs in `collection-shape.ts`
- **Where**: `src/lib/river-geometry.ts` (`import type { PhotoShapeIndex } from "@/app/(main)/collection/actions"`); `src/app/(main)/collection/actions.ts` (declares `PhotoShapeIndex` and imports `river-geometry.ts`); `src/lib/collection-shape.ts` (the natural home - it already exports `PhotoData`, `includeFor`, `shape`).
- **Phase**: architecture
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/madge-circular.txt`: the single real cycle in the repo; `raw/depcruise.txt` reports the same pair. It is `import type`, so it is erased at runtime and harmless today; it is also a `src/lib` module naming a `"use server"` file, which is the direction the rest of the codebase avoids (`collection-data.ts`'s header explains why the reads left `actions.ts`).
- **What to do**: Move `export type PhotoShapeIndex = [ratio: number, bandKey: string][]` (or whatever its exact shape is) to `collection-shape.ts`; import it from there in both `actions.ts` and `river-geometry.ts`; `river-geometry.test.mjs` imports `river-geometry.ts` directly and is unaffected.
- **Saving**: 0 lines; 1 cycle (madge and depcruise clean); one fewer lib-to-action edge.
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.
- **Notes**: Nothing else in `src/lib` imports from `src/app`; this was the only edge of that kind I found in the added files.

### fresh-code-14 - `useSettings` mirrors three props into state through three effects
- **Where**: `src/components/catchups/settings/settings-surface.tsx`, `function useSettings` (three `useState` seeded from props and three `useEffect(() => setX(prop), [prop])` blocks).
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: §5e React list, "useEffect that mirrors props into state". Its siblings in the same rework (`catchup-shelf-view.tsx`'s shelf state, `collecting.tsx`'s asked panel) use the render-time "store the previous prop, reset when it changes" pattern the React docs recommend and this repo already uses; the effect version renders once with the stale value and once with the new one on every prop change.
- **What to do**: Replace the three effects with the render-time reset (`const [prev, setPrev] = useState(prop); if (prev !== prop) { setPrev(prop); setX(prop); }`) or derive the values when the local edit is empty.
- **Saving**: ~9 lines; one fewer double render per settings open.
- **Risk & gate**: low. Open Settings on a Catch-up, change the rhythm, close, reopen; `npm run check`.
- **Confidence**: high on the pattern; I did not measure the double render.
- **Notes**: The rest of `settings-surface.tsx` (1,010 lines) is the shipped half of fresh-code-06 and reads as finished work.

### fresh-code-15 - Five small shipped-to-shipped duplications in the added files
- **Where**: (a) `src/app/api/upload/audio/finalize/route.ts` <-> `src/app/api/upload/audio/route.ts`: a 28-line identical preamble (IS_DEMO refusal + `vetUploadRequest` + body parse) - jscpd's largest shipped pair; (b) `src/components/catchups/home/collecting.tsx` and `src/components/catchups/home/people-door.tsx` each define a near-identical `RowButton`; (c) `scripts/dev/valley-terrain.mjs:32-33` and `scripts/dev/wall-atlas.mjs:34-35` each re-carry the byte-identical `opt()` argv parser that `scripts/dev/_cli.mjs` (added in the same window, "`argv()`") exists to retire - `import-album.mjs` already migrated to it (`const { flag, value } = argv();`); (d) `src/components/letters/letter-menu.tsx` is an admitted item-for-item copy of `post-card.tsx`'s header menu (its own header says so; jscpd 7 lines); (e) `src/components/catchups/edition/reader-parts.tsx` and `photo-run.tsx` hand-roll the opener + `preloadImageViewer` pair that `src/components/common/photo-opener.tsx` exists to end (its header: "It was written five times ..."), because they need a borderless variant `PhotoOpener` does not offer; (f) `scripts/dev/print-magazine.mjs`'s `CORPUS` list duplicates `magazine.test.mjs`'s; (g) `scripts/dev/export-catchups.mjs` `kindOf` is a copy of `promptKind` (acknowledged in its comment: a bare `node` cannot import the TS module's siblings).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (a: after fresh-code-05 B is decided)
- **Evidence**: jscpd lines quoted; (c) verified by reading both scripts against `_cli.mjs`; (e) `grep -rn "PhotoOpener" src` shows its callers are now only `letter-images.tsx` and `post-card.tsx`, so the primitive built to end five copies has two callers and two new bypasses.
- **What to do**: (a) fold into one `vetAudioRequest()` in the audio route folder, or delete both with the feature; (b) one `RowButton` in `home/` shared by both doors; (c) `import { argv } from "./_cli.mjs"` in both scripts; (d) lift the menu items into a shared `PostMenuItems` used by both, or accept the copy and say why on both sides (the letter's page is a server component, the card is a client one - that may be the reason); (e) add a `borderless` prop to `PhotoOpener` and use it in both reader files; (f) export `CORPUS` from `_fixtures/magazine/corpus.ts` and import it in the script (it is `.ts`, and `print-magazine.mjs` already runs under a loader that can take it? if not, leave it and note); (g) leave it - the comment gives the reason and `export-catchups.mjs` is regeneratable output.
- **Saving**: (a) 28 lines, 1 clone; (b) ~20 lines; (c) ~8 lines, 2 fewer copies of a parser with a shared bug surface; (d) 7-line clone; (e) ~30 lines, 2 fewer copies of the preload dance; (f) 1 list.
- **Risk & gate**: low. `npm run check`; (e) open an Edition with photographs and press one; (c) the scripts are hand-run and `scripts/README.md`'s ledger names them - run each with `--help` equivalent.
- **Confidence**: high on (a)(b)(c); medium on (d)(e) - both have a plausible reason the copy was made and it may be the right call; I have said which way I lean.
- **Notes**: Audit 1's lesson applies: none of these saves many lines once the docblock and the imports are paid for. The unit that matters is "one place for the bug": (c) is a parser, (a) is a security preamble on an upload route, and those are the two I would do first.

### fresh-code-16 - `healBatchCatchups` counts each batch's members and then `ensureBatchCatchup` counts them again
- **Where**: `src/lib/batch-catchups.ts`, `export async function healBatchCatchups` (reads `_count.members` per batch group) and `export async function ensureBatchCatchup` (re-counts `groupMember` for the same group before deciding on the floor `BATCH_CATCHUP_FLOOR = 10`).
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: read of the two functions; the nightly `advanceDueCatchups()` (unscoped) calls `healBatchCatchupsAndMemberships()` -> `healBatchCatchups()` -> `ensureBatchCatchup()` per group, so every batch group pays two counts per night. Also, the three exports (`ensureBatchCatchup`, `healBatchGroupMemberships`, `healBatchCatchups`) are only called inside the file; `batch-catchups.test.mjs:227` pins `export async function ensureBatchCatchup` by text, so the keyword must stay or the pin must change.
- **What to do**: Pass the count `healBatchCatchups` already holds into `ensureBatchCatchup(groupId, memberCount)` and skip the second query when given; keep the exports (or move the pin to a `balancedBody` read that does not need the keyword).
- **Saving**: 1 query per batch group per night (tens, not thousands); ~5 lines.
- **Risk & gate**: low. `batch-catchups.test.mjs` must stay green; `npm run check`.
- **Confidence**: high.
- **Notes**: Not worth doing alone; worth doing when fresh-code-09 (10) touches the same header.

### fresh-code-17 - Props no caller passes on the Edition reader's parts
- **Where**: `src/components/catchups/edition/reader-parts.tsx`: `Byline`'s `size` and `className`, `AskedBy`'s `className`, `Reactions`'s `className`.
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -rn "<Byline\b\|<AskedBy\b\|<Reactions\b" src --include=*.tsx`: the shipped reader calls `<Byline person={entry.author} />`, `<Reactions entry={entry} viewerIsAdmin={viewerIsAdmin} />`, `<AskedBy asker={q.asker} />` (`reader.tsx:167,196,255`). The lab's `sketches/_reader.tsx:158,187,236` calls its *own* `_parts.tsx` components (it passes `className="mt-2"` to its own `AskedBy`), so the lab re-grep does not rescue the shipped props.
- **What to do**: Remove the three unused props and the `cn()` merges that carry them.
- **Saving**: ~8 lines; three fewer knobs on components with one caller.
- **Risk & gate**: none. `npm run check`; `reader-geometry.test.mjs` reads `reader-parts.tsx` as text - confirm it does not pin the prop names.
- **Confidence**: high.
- **Notes**: The transplant carried the sketch's flexibility over; the shipped reader turned out to need none of it.

### fresh-code-18 - `presence-beacon`, `last-seen`, `admin-analytics`: the presence rework is clean; one stale number
- **Where**: `src/lib/post-notifications.ts:66` ("Notifications are kept until the 30-day sweep, so the window is a month") - correct at HEAD; `src/lib/retention.ts` `KEEP_DAYS.notifications: 30` with its paragraph; `docs/SECURITY.md` and the privacy policy are named in that paragraph as having promised a year - the docs lens should confirm both now say 30.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the retention diff (2026-09-04, ORCH-04) moved the number from 365 to 30 and says "30 days everywhere"; `post-notifications.ts` was updated. I did not read `docs/SECURITY.md` (outside this lens).
- **What to do**: For the docs lens: grep `365` / "a year" beside "notification" in `docs/SECURITY.md`, `src/app/(policies)/privacy/page.tsx`.
- **Saving**: 0 lines in my territory; listed so the number is checked once, not re-derived.
- **Risk & gate**: none.
- **Confidence**: medium (the code side is verified; the docs side is a pointer).
- **Notes**: The rest of the presence series (beacon, `recordPageView` behind `after()`, the trail queries, `statsFilter()`) reads as one of the better-argued changes in the window; every measured claim in it names its date.

### fresh-code-19 - The `hoopoe.tsx` poke verbs use `null as never` a dozen times for motion's "from current value" keyframe
- **Where**: `src/components/mascot/hoopoe.tsx`, `giggleRaw`, `bounceRaw`, `flusterRaw` (`scaleX: [null as never, c.crest.sx * 1.28, c.crest.sx]` and eleven siblings).
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `raw/type-sludge.txt` counts the `as never` sites; motion accepts `null` as a keyframe's first value to mean "from wherever it is", and the cast exists because `animate()`'s typing does not admit it. Twelve identical casts is a helper waiting to exist (`const FROM = null as never` or a typed `fromHere()`), which §5e-1 would normally call over-abstraction, but twelve copies of a type lie is the worse smell.
- **What to do**: One `const CURRENT = null as never;` at module scope with the reason in its comment; use it at the twelve sites.
- **Saving**: 0 lines; 11 fewer casts in the sludge count.
- **Risk & gate**: none. `npm run check`; open `/` signed out and tap the bird five times.
- **Confidence**: high.
- **Notes**: The poke feature itself (streak counting, the huff, the hover gaze) is well-reasoned and its constants are argued; nothing else in the 1,300-line diff of `hoopoe.tsx` wants touching.

### fresh-code-20 - The loading-screen series: one three-line idiom written 68 times across 21 files
- **Where**: the "line box" idiom `<div className="flex h-[<N>px] items-center"><div className="skeleton-warm h-2.5 w-<W> rounded-md" /></div>` - 68 occurrences: `src/app/catchups/join/[token]/loading.tsx` (8), `src/app/(main)/catchups/edition/[editionId]/loading.tsx` (6), `src/app/lab/loading.tsx` (6), `admin/analytics/loading.tsx` (5), `admin/people/[id]/loading.tsx` (5), and 16 more files with 1-3 each (the per-file count is in Metrics). The paragraph loop `Array.from({ length: lines }, (_, i) => <div className={\`skeleton-warm h-3 rounded-md ${i === lines - 1 ? "w-2/3" : "w-full"}\`} />)` in `catchups/edition/[editionId]/loading.tsx:87-90` and `:115-117`, `letters/[id]/(read)/loading.tsx:47-49`, `src/app/lab/loading.tsx:60-62`. The shared primitives that exist: `src/components/common/skeleton.tsx` (`ButtonSkeleton`, `TextSkeleton`, `SegmentedPillsSkeleton`, `FilterButtonSkeleton`), `src/components/admin/admin-skeleton.tsx` (six), `post-card-skeleton.tsx`, `message-composer-skeleton.tsx`, `desk-skeleton.tsx`, `collection-skeleton.tsx`, `rail-skeleton.tsx`, `letterhead-sheet.tsx`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the census above (`grep -cE 'flex h-\[[0-9.]+px\] items-center'` over the 35 files). The series' own rule is right - a placeholder sits in the line box the real text will occupy, at the real line height - and the idiom is how that rule is spelled. It is spelled by hand every time, so the pairing of box height and bar height (19.5px/h-2.5 for 13px text, 16.5px/h-2 for 11px, 32.5px/h-5 for 26px) is re-derived in each file and cannot be checked in one place.
- **What to do**: Add `LineSkeleton({ box, bar, width })` (or `Line` with the text size as the key: `Line size={13} w="w-20"`) to `common/skeleton.tsx`, and a `ParagraphSkeleton({ lines, last })` for the four loops; replace the 68 sites file by file, keeping the measured heights as the arguments. `skeleton-words-rule.test.mjs` pins that a skeleton draws only words its page says - a primitive with no words keeps it green.
- **Saving**: ~130 source lines (68 x 2), 4 loops; 0 client bytes (`loading.tsx` is a server component - the honest unit here is one place for the box/bar table). One more: `admin-skeleton.tsx` is `AdminSkeleton` replaced by six exports; the census shows all six are used (`ChipSkeleton` by six files).
- **Risk & gate**: low. `npm run visual` is the gate: every `loading.tsx` is photographed via `e2e/loading-fallbacks.spec.ts` and the visual ROUTES; a one-pixel drift in a box height goes red, which is exactly right.
- **Confidence**: high on the count; medium on whether the owner's detail standard ("every constant argued for") prefers the numbers inline where the reader sees them - the primitive keeps the numbers at the call site, so I think it satisfies it.
- **Notes**: What surprised me about this series is what is *not* duplicated: the real `PageHeader`, the real `Button` box (`ButtonSkeleton` renders the actual `Button`), the real cadence labels (`CADENCE_LABELS`), the real nav (`ADMIN_NAV`). The fragility worth naming is the hard-coded line boxes (`h-[19.5px]`, `h-[27.3px]`, `h-[15.8px]`): a change to the type scale silently mis-sizes up to 35 files, and only the visual suite would say so. A shared box/bar table is also the fix for that.

### fresh-code-21 - `tailwind-theme.css` + `@source not "./lab"`: the audit-2 CSS lever shipped; re-measure, and one comment to check
- **Where**: `src/app/globals.css:1-24` (the new header explaining the split), `src/app/tailwind-theme.css` (256 lines, imported by `globals.css` and `src/app/lab/lab.css`), `src/app/lab/lab.css` (30 lines).
- **Phase**: architecture (done)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the diff moves `@theme inline`, `@custom-variant` and the `state-layer` utility into the new file and narrows the source scan to `src/` with the lab excluded; the header says "a class name quoted in a markdown doc stops adding a rule to the stylesheet every member downloads (three did)" and "the lab ... was about a third of this sheet". Both are claims the bundle lens should re-measure at HEAD (§4: "re-measure rather than assume it stayed fixed").
- **What to do**: For the bundle lens: measure the shipped CSS with and without `@source not "./lab"` at HEAD. For this lens: nothing - the split is the right shape and its comment is the kind §4 defends.
- **Saving**: 0 (already shipped); the measurement is the deliverable.
- **Risk & gate**: n/a.
- **Confidence**: high that the lever landed; unknown on its current size.
- **Notes**: `globals.css` also gained three one-shot CSS animations (`comment-landed`, `comment-bird-land`, `comment-sent-arrow`) with a long reason for being CSS rather than Motion (a variant tree captured them); that is a real finding of the comment-section pass and reads as settled.

### fresh-code-22 - The scripts added in the window are ledgered and clean, with two notes for the tracked-weight lens
- **Where**: `scripts/dev/_cli.mjs`, `backfill-screen-copies.mjs`, `export-catchups.mjs`, `generate-bird-photos.mjs`, `print-magazine.mjs`, `valley-terrain.mjs`, `wall-atlas.mjs`, `scripts/qa/_shoot.mjs`, `campaign.test.mjs`, `progress-log.test.mjs` - all present in `scripts/README.md`'s ledger, each with its working folder beside it (the `hand-run-passes.test.mjs` rule). `generate-bird-photos.mjs` writes the 102 tracked PNGs under `public/images/birds/` (698 KB); `valley-terrain.mjs` writes `public/lab/valley/height-*.{png,json}` (4 files, 525 KB, tracked and deployed); `wall-atlas.mjs` writes the years-wall atlas.
- **Phase**: relocate (the public/ outputs; owner)
- **Tier**: T2     **Class**: structural     **Decides**: owner (deployed lab assets)
- **Evidence**: `raw/tracked-bytes.txt`; `raw/files-added-since-audit2.txt` lists the 102 PNGs and the 4 valley files. `public/lab` is 2.01 MB tracked and every byte of it deploys to production (the lab is only excluded from the *demo* build).
- **What to do**: For the tracked-weight lens (L08), which owns `public/`: decide whether lab heightmaps and the wall atlas belong in git at all (they are regenerable by the two scripts) or under a gitignored `public/lab/.generated/`. The bird PNGs are used by a shipped surface? - I did not find a `src/components` importer of `public/images/birds/<n>-<m>.png`; the lens should check `src/app/lab/years/weave` and `wall` before calling them lab-only.
- **Saving**: up to 525 KB tracked + deployed (valley) and 698 KB (birds) if lab-only; 0 if a shipped surface reads them.
- **Risk & gate**: the lab rooms `/lab/valley/hills` and `/lab/years/wall` must still open; `npm run check` (`lab-audit.mjs`).
- **Confidence**: medium - I only established that the scripts write them; the consumers are the lens's question.
- **Notes**: `backfill-screen-copies.mjs` shares a 9-line clone with `sweep-stranded-originals.mjs` (jscpd); both are backfills with the same R2 listing preamble, and the hand-run-passes spec may want them to look alike - I did not call it.

## Owner decisions

**A. The "Picture" row in a Catch-up's settings** [fresh-code-01]
- *What I'd change*: Either make the "Picture" row work again (it opens nothing today) or take the row and the unused picture-chooser out.
- *What you'd notice*: If we take it out, the row disappears; the three photographs still rotate onto every Catch-up on their own. If we fix it, pressing "Picture" opens the chooser that was built for it.
- *If I guess wrong*: Deleting means a Keeper can never put their own photograph on a Catch-up; fixing means keeping a chooser you may not want.
- *Options*: fix it; remove it; leave it (not recommended - a control that does nothing).
- *Answer to take if you don't reply*: fix it, since the chooser exists and the row was meant to open it. [fresh-code-01]

**B. Answering a question out loud (voice answers)** [fresh-code-05]
- *What I'd change*: Decide whether recorded answers ship this season or get shelved. The machinery (the upload, the checks, the storage) is built and switched off, and its lab room has the three player designs waiting for your pick.
- *What you'd notice*: Nothing today either way. If shipped: a microphone in the answering box. If shelved: nothing, ever, until it is rebuilt.
- *If I guess wrong*: Shelving throws away finished plumbing; keeping it adds a branch to every answer save and three columns to every answer row for as long as it waits.
- *Options*: pick a player and ship; keep waiting; shelve.
- *Answer to take if you don't reply*: keep waiting until the end of October, then shelve. [fresh-code-05]

**C. Questions the group votes on** [fresh-code-05]
- *What I'd change*: Same decision for vote questions: the choices, the pick and the checks are built and switched off, three result designs are in the lab.
- *What you'd notice*: Nothing today. Shipped: a new kind of question in the ask box.
- *If I guess wrong*: As B.
- *Options*: pick a result design and ship; keep waiting; shelve.
- *Answer to take if you don't reply*: as B. [fresh-code-05]

**D. The time capsule (an Edition sealed for a year)** [fresh-code-05]
- *What I'd change*: Same decision, and this one is the most woven in: it is a state in the clock, a notification, and a cron interaction. If it is not wanted, it should come out before it is forgotten.
- *What you'd notice*: Nothing today. Shipped: a "seal this Edition" switch in settings and a sealed look on the shelf.
- *If I guess wrong*: As B, plus the clock code stays more complicated than the running feature needs.
- *Options*: pick a sealed look and ship; keep waiting; shelve.
- *Answer to take if you don't reply*: as B. [fresh-code-05]

**E. The drawings that became the Catch-ups screens** [fresh-code-06]
- *What I'd change*: The lab rooms for the settings, the reader, the home, the list and the Collection scrubber still hold their own copies of the screens you approved, and those copies have quietly stopped matching what shipped. I'd have each room show the real, shipped screen instead (the comments room already does), so the room stays but there is one copy of everything.
- *What you'd notice*: Nothing on the site. In the lab, each of those rooms shows exactly what is live rather than the sketch it came from.
- *If I guess wrong*: A sketch you wanted preserved as a *sketch* (to compare against) would become a mirror of the live thing.
- *Options*: point the rooms at the live screens; keep the sketches frozen as they are; a mix (say which rooms are records).
- *Answer to take if you don't reply*: point the settings, reader/home/list and scrubber rooms at the live screens; leave the voice, vote, capsule and magazine rooms untouched. [fresh-code-06]

**F. The magazine** [fresh-code-03]
- *What I'd change*: Nothing visible; I want to know whether the printed magazine is a feature you intend to ship, because that decides where its engine lives and whether its twelve invented Editions (a very large set of test files) stay.
- *What you'd notice*: Nothing.
- *If I guess wrong*: If it is a feature, moving the engine into the lab is a move back later; if it is an experiment, leaving it where shipped code lives keeps a large thing nobody can reach.
- *Options*: it is coming (leave the engine, shrink the test files); it is an experiment (move it into the lab); undecided (move it, it moves back in one step).
- *Answer to take if you don't reply*: treat it as an experiment. [fresh-code-03]

## Not-findings
- **`photo-wall.ts` and its test (105 + 133 lines) for a question kind no Edition has ever used.** The file header says so ("NO EDITION HAS EVER USED A PHOTO-WALL QUESTION"); the owner picked "a run" from the wall room (registry note), `photo-run.tsx` is the shipped result and `photo-wall.ts` is its rule. Intentional.
- **The `/catchups/round/[editionId]` and `/catchups/[catchupId]/answer` routes still exist** as `permanentRedirect` shims (`src/app/(main)/catchups/round/[editionId]/page.tsx`, `.../answer/page.tsx`), and `page-label.ts` still knows both patterns. Bell links written before 2026-09-09 point at them (`2026-09-09-answering-moves-to-the-home.sql` rewrote most, not all). Not ghosts.
- **`src/lib/rich-truncate.test.mjs` keeps a deleted module's name.** Its header gives the reason ("several audit documents cite the tests below by this file and line") and its tests are live pins on the feed and the composer. Intentional.
- **`feed/actions.ts` keeps the `offset:` cursor guard** after offset paging was deleted: "a page left open from before this change can still hand back an `offset:N` cursor, and it reads as 'start again'". Intentional.
- **`directory-client.tsx` hard-codes `360` for the map placeholder** rather than importing `MAP_MIN_H`: importing it would pull the deferred module back in; both sides say so. Intentional.
- **`photo-layout.ts`'s `HeightAlgebra<T>`** - a single-use generic evaluated two ways (numbers for tests, CSS for the browser). It looks like §5e-5 over-abstraction and is the mechanism that keeps the two from drifting ("Writing it twice is how the two quietly stop agreeing"). Intentional.
- **`upload-client.ts` keeps the composer's own copy of the upload ceremony** instead of `uploadOneImage`: the header explains (batch, facts per response, "3 of 5"). Intentional.
- **The one restate-the-code comment I found**: `src/lib/utils.ts` above `readMinutes`/`countWords` ("Words in a body, split on whitespace") - and even that carries the reason a mention counts as a word. I am not filing it.
- **`(main)/layout.tsx`'s fourth query** (`prisma.catchup.findFirst` for the sidebar's Catch-ups row) on every non-teacher page: measured (0.117 ms) and argued; the owner asked for the hiding rule verbatim. Intentional.
- **The `A_NAME = "Anika Menon"` constant in `catchups/new/loading.tsx`**: a width sample kept as a constant so `skeleton-words-rule.test.mjs` does not read it as a promised word. Intentional and clever.
- **`storage.ts` `KNOWN_ROOTS` gains `"audio"` with a long argument**: the argument is the point (a root that is not listed makes `delImage` lie). Stays while voice stays (fresh-code-05 B).
- **`e2e/visual.spec.ts`'s live-band tail mask** and **`collection-seek.spec.ts`'s reversed scrubber test**: both explain, in the file, why the previous assertion was the opposite of the requirement. Model changes.

## Audit carry-overs in this territory
- **Audit 2 C3** (one read for both halves of the Catch-ups advance): done - `advanceDueCatchups` is one `catchup.findMany` with an `OR`; `catchup-lifecycle.test.mjs` re-pinned on `balancedBody`.
- **Audit 2 C11** (Collection per-half facts behind the swap): deliberately not done, and now moot - `collection-data.ts` asks the three questions once with `groupBy` for both halves (its comment cites C11 and the owner's requirement).
- **Audit 2 D-phase, the six migrations**: run 2026-09-08 (`c34aae3e`); the schema comments did not follow (fresh-code-07).
- **Audit 2 G1/G7** (lab out of the demo build, `page.lab.tsx`): done; the registry header explains the rule; `lab-audit.mjs` enforces both halves.
- **Audit 2 E (dedupe) PARTIAL - `catchups-02`**: the Catch-ups dedupe row is superseded by the rework; the residue is fresh-code-06 (lab vs shipped) and fresh-code-15 (b) - the orchestrator should retire `catchups-02` against those.
- **Audit 2's CSS lab-share lever**: shipped as `tailwind-theme.css` + `@source not "./lab"` (fresh-code-21); needs the bundle lens's re-measurement, not this one's.
- **Audit 2's refutation of the `withMember` action-gate wrapper**: still holds; nothing in the added `"use server"` files re-argues it, and `security-regressions.test.mjs` now walks the disk for them (`serverActionFiles()`).
- **ORCH-04 (notifications 365 vs 30)**: resolved in code (`retention.ts:30`, `post-notifications.ts:66`); docs side is fresh-code-18's pointer.

## For other lenses
- **collection-media (T04)**: `src/components/collection/collection-client.tsx` now carries two paging models - the band geometry (`river-geometry.ts`, `loadBand` per year) for `order=taken` and the older cursor walk (`more`/`loadNewer`/the zero-pull) kept for `newest`/`loved` and for `/lab/collection`. Whether the cursor walk can be retired from the shipped client (or the lab pointed at the geometry) is that territory's architecture question; the `e2e/collection-seek.spec.ts` "does not fetch itself" test is the pin.
- **lib-tests / scripts (T-lib-tests)**: fresh-code-08's timing leads; the 45.9 s check; whether `test-kit.mjs` wants a memoised `walk`.
- **tracked-weight (L08)**: `public/lab/valley` (525 KB, deployed), the 102 bird PNGs (698 KB, `generate-bird-photos.mjs`), `public/images/catchups` (3 files, 6.79 MB, `shaded-path.webp` 3.35 MB - the owner's own full-resolution cover photographs served straight from `public/`; `catchup-pictures.ts` decodes them in a rule test), the 18,632 lines of magazine JSON fixtures (fresh-code-03).
- **bundle (L-bundle)**: re-measure the shipped CSS after the `@source not "./lab"` split (fresh-code-21); `verified-mark.tsx` now imports `@base-ui/react/tooltip` on every surface that draws a leaf - is that chunk already in the shared bundle?; `directory-client.tsx` defers `alumni-map.tsx` (d3) with a hover warm - confirm the chunk is really out of the People-first path.
- **catchups-lib (T03)**: fresh-code-02, 04, 16 overlap that territory; the `songs` category TODO in `song-attachment.tsx` (a `CatchupEntry.songs Json?` column) is a product item, not bloat.
- **catchups-ui (T02)**: fresh-code-01, 06, 14, 17.
- **docs**: fresh-code-07's `docs/TRAPS.md:41,50`; fresh-code-18's SECURITY/privacy 30-day check; `docs/planning/catchups-rework/handover.md` (4,178 lines) and `spec.md` (1,376) are the largest planning documents added in the window.
- **data-layer**: after fresh-code-02/05 decisions, the columns to drop: `CatchupEntry.songUrl/songTitle/songArt` (dead now), and conditionally `audioUrl/audioSeconds/audioIsAuto/pollOptionId`, `CatchupEdition.timeCapsule/sealedAt`, `CatchupPromptOption` (0 live rows).
- **lab (T15)**: `src/app/lab/catchups/wall/_shapes.tsx(255,48)` unused `g` (`raw/tsc-unused.txt`); `src/app/lab/catchups/sketches/_shelf.ts:33` names the deleted `PREPARING_HOLD_HOURS`; `catchup-home.tsx:299-302`'s false claim about `/lab/catchups/settings` (fresh-code-06).

## Per-file verdicts (deliverable 1: every added file under src/, scripts/, e2e/, prisma/)
Format: `lines  path  -  verdict`. "clean" means read in full, nothing to file. Lab rows are classification only.

**e2e (1)**
- 109 `e2e/comments-close.spec.ts` - clean

**prisma/migrations-manual (23)**
- 47 `2026-09-07-drop-bounce-kind.sql` - clean (run; schema comment stale, fresh-code-07)
- 80 `2026-09-07-drop-collection-legacy-tags.sql` - clean (run; fresh-code-07)
- 76 `2026-09-07-drop-groups-residue.sql` - clean (run; fresh-code-07)
- 49 `2026-09-07-drop-image-greyscale.sql` - clean (run; fresh-code-07)
- 77 `2026-09-07-drop-unused-indexes.sql` - clean
- 204 `2026-09-08-batch-catchups.sql` - 1 (fresh-code-09 #9: "not by editing this")
- 71 `2026-09-08-catchup-picture.sql` - 1 (fresh-code-09 #9)
- 102 `2026-09-08-leaving-and-the-read-mark.sql` - clean
- 56 `2026-09-08-preparing-becomes-published.sql` - clean
- 82 `2026-09-08-round-becomes-edition.sql` - clean
- 58 `2026-09-09-answering-moves-to-the-home.sql` - clean
- 113 `2026-09-10-catchup-pictures-his-three.sql` - clean
- 76 `2026-09-10-comments-on-answers.sql` - clean
- 12 `2026-09-11-login-attempt-detail.sql` - clean
- 167 `2026-09-14-delete-test-catchups.sql` - clean
- 60 `2026-09-14-link-previews.sql` - clean
- 91 `2026-09-14-time-capsule.sql` - clean (fresh-code-05 D decides its columns)
- 65 `2026-09-14-voice-answers.sql` - clean (fresh-code-05 B)
- 99 `2026-09-14-vote-questions.sql` - clean (fresh-code-05 C)
- 25 `2026-09-15-photo-set-aside.sql` - clean
- 36 `2026-09-15-visit-paths.sql` - clean
- 45 `2026-09-22-batch-catchups-wait-for-questions.sql` - clean
- 29 `2026-09-23-photo-screen-copy.sql` - clean

**scripts (10)**
- 42 `scripts/dev/_cli.mjs` - clean
- 295 `scripts/dev/backfill-screen-copies.mjs` - clean (9-line clone noted, fresh-code-22)
- 404 `scripts/dev/export-catchups.mjs` - 2 (fresh-code-02 song fields; fresh-code-15 g)
- 77 `scripts/dev/generate-bird-photos.mjs` - clean (outputs: fresh-code-22)
- 215 `scripts/dev/print-magazine.mjs` - 1 (fresh-code-15 f)
- 150 `scripts/dev/valley-terrain.mjs` - 1 (fresh-code-15 c)
- 106 `scripts/dev/wall-atlas.mjs` - 1 (fresh-code-15 c)
- 198 `scripts/qa/_shoot.mjs` - clean
- 182 `scripts/qa/campaign.test.mjs` - clean
- 101 `scripts/qa/progress-log.test.mjs` - clean

**src/app non-lab (8) + src root (2)**
- 101 `src/app/(main)/admin/reports/actions.ts` - clean
- 135 `src/app/(main)/catchups/edition/[editionId]/loading.tsx` - 1 (fresh-code-20 paragraph loop x2)
- 229 `src/app/(main)/catchups/edition/[editionId]/page.tsx` - 1 (fresh-code-04)
- 99 `src/app/api/photo/download/route.ts` - clean
- 62 `src/app/api/presence/route.ts` - clean
- 91 `src/app/api/upload/audio/finalize/route.ts` - 2 (fresh-code-05 B; fresh-code-15 a)
- 85 `src/app/api/upload/audio/route.ts` - 2 (fresh-code-05 B; fresh-code-15 a)
- 256 `src/app/tailwind-theme.css` - clean (fresh-code-21)
- 10 `src/instrumentation-client.ts` - clean

**src/components (49)**
- 93 `analytics/presence-beacon.tsx` - clean
- 32 `catchups/edition/entry-comment-actions.ts` - clean
- 467 `catchups/edition/navigator.tsx` - clean (lab clone, fresh-code-06)
- 244 `catchups/edition/photo-run.tsx` - 1 (fresh-code-15 e; lab clone fresh-code-06)
- 189 `catchups/edition/reader-geometry.test.mjs` - clean
- 580 `catchups/edition/reader-parts.tsx` - 2 (fresh-code-17; fresh-code-15 e)
- 54 `catchups/edition/reader-types.ts` - clean
- 753 `catchups/edition/reader.tsx` - clean (lab clone, fresh-code-06)
- 326 `catchups/home/catchup-home.tsx` - 1 (fresh-code-06 false claim at :299-302)
- 414 `catchups/home/collecting.tsx` - 1 (fresh-code-15 b)
- 110 `catchups/home/home-head.tsx` - 1 (fresh-code-12 HEAD_HEIGHT)
- 348 `catchups/home/people-door.tsx` - 1 (fresh-code-15 b)
- 326 `catchups/home/picture-picker-dialog.tsx` - 1 (fresh-code-01, dead)
- 129 `catchups/index/archived-row.tsx` - clean (lab clone, fresh-code-06)
- 184 `catchups/index/catchup-card.tsx` - clean
- 191 `catchups/index/catchup-shelf-view.tsx` - clean
- 158 `catchups/index/edition-cover-card.tsx` - clean
- 39 `catchups/index/nothing-here.tsx` - clean
- 182 `catchups/index/picture-door.tsx` - clean
- 1010 `catchups/settings/settings-surface.tsx` - 4 (fresh-code-01 dead row; -06; -12; -14)
- 39 `catchups/settings/types.ts` - 1 (fresh-code-01 plumbing)
- 103 `collection/file-says.tsx` - clean
- 36 `common/control-geometry.ts` - clean
- 106 `common/flush-avatar.tsx` - clean (lab clone with wall/_shapes, fresh-code-06)
- 137 `common/house-options.tsx` - clean
- 91 `common/image-viewer-import-rule.test.mjs` - clean (walker, fresh-code-08)
- 54 `common/lazy-image-viewer.tsx` - clean
- 14 `common/motion-features-max.ts` - clean
- 66 `common/photo-opener.tsx` - clean (two bypasses, fresh-code-15 e)
- 122 `common/skeleton.tsx` - 1 (fresh-code-20: the primitive to add)
- 33 `common/use-coarse-pointer.ts` - clean
- 29 `common/use-leave-guard.ts` - clean
- 338 `directory/directory-grid.tsx` - clean
- 84 `feed/new-post-dock.tsx` - clean
- 56 `feed/rail/rail-skeleton.tsx` - clean
- 31 `guide/guide-body.tsx` - clean
- 87 `layout/app-bar-title.tsx` - clean
- 98 `layout/unread-store.test.mjs` - clean
- 136 `layout/unread-store.ts` - clean
- 247 `letters/letter-menu.tsx` - 1 (fresh-code-15 d)
- 97 `mascot/moments/fly-away-hoopoe.tsx` - clean
- 220 `mascot/moments/logo-peek.tsx` - clean
- 377 `mascot/moments/not-found-stage.tsx` - clean
- 19 `mascot/resident-hoopoe.tsx` - clean
- 106 `mascot/use-hoopoe-life.ts` - clean
- 68 `messages/message-composer-skeleton.tsx` - clean
- 36 `posts/feed-comment-actions.ts` - clean
- 86 `posts/post-card-skeleton.tsx` - clean
- 73 `profile/letterhead-sheet.tsx` - clean
- 132 `support/support-shell.tsx` - clean (one inline `<style>` keyframe, `support-sway`; the protocol audit allows it)

**src/lib (66)**
- 59 `back-closes-rule.test.mjs` - clean (walker, -08)
- 224 `back-closes.ts` - clean
- 404 `batch-catchups.test.mjs` - 1 (fresh-code-08 git-grep)
- 313 `batch-catchups.ts` - 2 (fresh-code-09 #10; fresh-code-16)
- 48 `bot-check-detail.test.mjs` - clean
- 56 `bot-check-detail.ts` - clean
- 49 `catchup-picture-pick.ts` - clean
- 319 `catchup-pictures.test.mjs` - 1 (fresh-code-08 sharp decode)
- 289 `catchup-pictures.ts` - 1 (fresh-code-12)
- 87 `catchup-reads.test.mjs` - 1 (fresh-code-09 #7)
- 73 `catchup-reads.ts` - clean
- 255 `catchups-edition-view.ts` - 1 (fresh-code-02 note at :125)
- 232 `catchups-export.ts` - 2 (fresh-code-12 dead pair; fresh-code-02)
- 152 `collection-image.ts` - clean
- 110 `collection-shape.ts` - clean (receives the type in fresh-code-13)
- 38 `collection-viewer-facts.ts` - clean
- 53 `collection-viewer-image.test.mjs` - clean (walker, -08)
- 91 `collection-viewer-image.ts` - clean
- 169 `comment-target-rule.test.mjs` - clean
- 330 `comment-thread.ts` - clean
- 145 `email-templates.test.mjs` - clean
- 25 `extend-days-rule.test.mjs` - clean
- 194 `file-taken-date.ts` - clean
- 71 `heart-revalidate-rule.test.mjs` - clean
- 250 `link-preview-core.test.mjs` - clean
- 518 `link-preview-core.ts` - 1 (fresh-code-12)
- 416 `link-preview.ts` - 1 (fresh-code-12)
- 129 `magazine/from-export.ts` - 1 (fresh-code-03 cast)
- 696 `magazine/grammar.ts` - clean (relocate, -03)
- 154 `magazine/image.ts` - clean (-03)
- 325 `magazine/index.ts` - 1 (fresh-code-03 indentation; barrel)
- 296 `magazine/magazine.test.mjs` - 1 (fresh-code-08 triple layout)
- 296 `magazine/measure.ts` - clean (-03)
- 361 `magazine/paginate.ts` - clean (-03)
- 146 `magazine/score.ts` - clean (-03)
- 289 `magazine/types.ts` - clean (-03)
- 18 `notification-count.ts` - clean
- 21 `origin.ts` - clean
- 66 `page-label.ts` - 1 (fresh-code-12 ID_SEGMENT)
- 60 `photo-save-name.test.mjs` - clean
- 100 `photo-save-name.ts` - clean
- 133 `photo-wall.test.mjs` - clean (not-finding)
- 105 `photo-wall.ts` - clean (not-finding)
- 92 `read-more-fold.test.mjs` - clean
- 74 `read-more-fold.ts` - clean
- 105 `rich-text-wrapping.test.mjs` - clean (walker, -08)
- 131 `river-geometry.test.mjs` - clean
- 243 `river-geometry.ts` - 1 (fresh-code-13)
- 90 `skeleton-words-rule.test.mjs` - clean
- 71 `stats-exclusion-rule.test.mjs` - clean
- 79 `stats-exclusion.ts` - clean (hard-coded `OWNER_USER_ID`, argued)
- 212 `taken-date.test.mjs` - clean
- 379 `taken-date.ts` - clean
- 367 `time-capsule-rule.test.mjs` - 1 (fresh-code-08 two walks; -05 D)
- 122 `toggle-queue.ts` - clean
- 213 `voice-answer-rule.test.mjs` - clean (-05 B)
- 239 `voice-answer-rule.ts` - 1 (fresh-code-12; -05 B)
- 35 `voice-answer.ts` - clean (-05 B)
- 243 `vote-question-rule.test.mjs` - 2 (fresh-code-08 two walks; -09 #8)
- 175 `vote-question-rule.ts` - 1 (fresh-code-02 `sendsSong`; -05 C)

**src/app/lab (92, classification only)**
- `_fixtures/magazine/*.json` (12 files, 18,632 lines) + `corpus.ts` (66) - magazine fixtures; the test in `src/lib` imports `corpus.ts` (fresh-code-03); size is the tracked-weight lens's question
- 407 `_fixtures/pressure.ts` - sketch fixtures; no shipped importer
- 1226 `_settings.tsx` - prototype of `settings-surface.tsx`; 8 clones (fresh-code-06)
- `capsule/_cases.ts` (119), `_mark.tsx` (157), `_room.tsx` (429), `_sealed.tsx` (320), `page.lab.tsx` (18) - awaiting pick (fresh-code-05 D); names `setEditionTimeCapsule` in comments only
- `magazine/_live.ts` (82), `_measure.ts` (83), `_pages.tsx` (611), `_room.tsx` (129), `page.lab.tsx` (76) - the engine's only importers (fresh-code-03)
- `settings/_room.tsx` (194), `page.lab.tsx` (31) - draws `_settings.tsx`, not the shipped panel (fresh-code-06)
- `sketches/_cover.tsx` (324), `_data.ts` (240), `_harness.tsx` (322), `_home.tsx` (970), `_list.tsx` (292), `_media.ts` (187), `_navigator.tsx` (526), `_parts.tsx` (595), `_pressure.ts` (169), `_rail.tsx` (209), `_reader.tsx` (760), `_shelf.ts` (404), `_shell.tsx` (144), `_types.ts` (94), `page.lab.tsx` (52) - prototypes of `edition/*`, `home/*`, `index/*` (fresh-code-06); `_shelf.ts:33` names the deleted `PREPARING_HOLD_HOURS`; `_media.ts:38` names `resolveSpotify` (fresh-code-02)
- `swipe/_trace.tsx` (207), `page.lab.tsx` (70) - diagnostic room for a phone-only bug; uses the shipped viewer; clean
- `voice/_clip.ts` (237), `_players.tsx` (274), `_recorder.tsx` (728), `_room.tsx` (430), `page.lab.tsx` (19) - awaiting pick (fresh-code-05 B)
- `vote/_ask.tsx` (273), `_ballot.tsx` (139), `_cases.ts` (160), `_results.tsx` (279), `_room.tsx` (344), `page.lab.tsx` (18) - awaiting pick (fresh-code-05 C)
- `wall/_corpus.ts` (275), `_room.tsx` (434), `_shapes.tsx` (938), `page.lab.tsx` (22) - verdict shipped as `photo-run.tsx` (clones, fresh-code-06); `_shapes.tsx(255,48)` unused `g` (tsc)
- `collection/scrub/_scrubbers.tsx` (617), `page.lab.tsx` (235) - verdict shipped as `photo-scrubber.tsx` (3 clones, fresh-code-06)
- `comments/_room.tsx` (170), `page.lab.tsx` (35) - imports the shipped `PostCard`/`CommentsSection`; the model for fresh-code-06(a); clean
- 89 `hoopoe-lives/page.lab.tsx` - clean
- 30 `lab.css` - the lab's own Tailwind sheet (fresh-code-21); clean
- `new-post/_room.tsx` (770), `page.lab.tsx` (34) - verdict shipped 2026-09-14 ("the room stays as the record"); no shipped import; classification: record
- 410 `reach/page.lab.tsx` - prototype of `get-in-touch.tsx` (30-line clone, fresh-code-06)
- `valley/_hills.tsx` (967), `_mark-light.tsx` (89), `_room.tsx` (171), `_seal.tsx` (161), `_sun.test.mjs` (35), `_sun.ts` (221), `_terminator.tsx` (94), `_weather.ts` (68), `hills/*` (46), `seal/*` (82), `page.lab.tsx` (41) - reviewed 2026-09-16, none taken; no shipped counterpart; its heightmaps deploy from `public/lab/valley` (fresh-code-22)
- `years/_index.tsx` (60), `page.lab.tsx` (12), `then/*` (548), `wall/*` (838), `weave/*` (684) - round two of the valley campaign; no shipped counterpart; the wall needs `wall-atlas.mjs`'s output (fresh-code-22)

## Metrics
- Files in territory: 245 added (153 non-lab: 66 `src/lib`, 49 `src/components`, 8 `src/app` non-lab, 2 `src` root, 10 `scripts`, 1 `e2e`, 23 `prisma`; 92 lab) + 60 most-changed + 119 deleted (references only).
- Read fully: 141 non-lab added files (all but the 12 JSON fixtures), roughly 19,000 lines; the changed regions of all 60 most-changed files, roughly 12,000 diff lines; 23 migrations (1,838 SQL lines). Lab: 92 files classified from headers and tool output (49,548 lab TS lines in the tree; the additions are 39,610 of them).
- Added files I did not reach: **0 of the 153 non-lab** at full depth; the 12 magazine JSON fixtures (18,632 lines) were sized, not read; the 92 lab files at classification depth as the charter allows.
- Findings: 22 - T1: 9 (fresh-code-07, 09, 10, 11, 12, 13, 17, 18, 21), T2: 9 (01, 03, 08, 14, 15, 16, 19, 20, 22), T3: 3 (02, 04, 06), T4: 1 (05). Structural 13 (01, 02, 03, 04, 05, 06, 08, 11, 12, 13, 15, 20, 22), cheap 9 (07, 09, 10, 14, 16, 17, 18, 19, 21). Decides: owner 4 (01, 05, 06, 22), autonomous 18. Owner decisions raised: 6 (A-F).
- Biggest added files: `settings-surface.tsx` 1,010; `reader.tsx` 753; `magazine/grammar.ts` 696; `reader-parts.tsx` 580; `link-preview-core.ts` 518; `navigator.tsx` 467; `link-preview.ts` 416; `batch-catchups.test.mjs` 404; `export-catchups.mjs` 404; `taken-date.ts` 379; `not-found-stage.tsx` 377; `time-capsule-rule.test.mjs` 367; `magazine/paginate.ts` 361; `directory-grid.tsx` 338; `comment-thread.ts` 330. In the lab: `_settings.tsx` 1,226; `sketches/_home.tsx` 970; `valley/_hills.tsx` 967; `wall/_shapes.tsx` 938; `sketches/_reader.tsx` 760; `new-post/_room.tsx` 770.
- Loading-screen series: 35 `loading.tsx`, 1,725 lines total; 68 line-box idioms in 21 files (join 8, edition 6, lab 6, analytics 5, people/[id] 5, catchups/(index) 3, catchups/[id] 3, letters/(index) 3, letters read 3, messages/[id] 3, profile 3, admin index 2, messages index 2, admin messages/[id] 2, reports 2, welcome 2, content 1, support 1, home 1, dark-mode 1, pick-bird 1); 4 paragraph loops; 9 files import no shared skeleton primitive.
- jscpd at HEAD (parsed from `raw/jscpd.txt`): 325 clones; 100 touch an added file; 85 lab-to-shipped (1,652 lines); 127 lab-to-lab; 5 shipped-to-shipped involving an added file (audio routes 28, picture-picker vs photo-aim 24 + 17, backfill vs sweep 9, letter-menu vs post-card 7).
- Dead-code re-grep table (each symbol, files naming it across `src` incl. lab, `scripts`, `e2e`): `picture-picker-dialog` -> 2 rule tests only; `answer-redirect` -> none; `everyAnswer`, `exportTotals` -> own file only; `PICTURE_FOCUS_PATTERN`, `ensureLinkPreviews`, `HEAD_HEIGHT`, `decodeEntities`, `MAX_URL_LENGTH` -> own file only; `settingsGroups`, `confirmCopy` -> own file + the lab's own definitions; `ID_SEGMENT` -> own file + one comment in `admin-analytics.ts`; `reviveDormantEdition` -> one comment; `setEditionTimeCapsule` -> actions.ts + generated client + 2 lab comments + its rule test; `resolveSpotify` -> core, actions, 2 tests, 1 lab comment; `cookieDomainForBaseUrl` -> definition + its test.
- Live-DB facts used: `Catchup*` tables present with rows (Series 8, Edition 9, Entry 141, EditionRead 23, PromptOption 0); `CatchupEntry` still carries `songUrl/songTitle/songArt/audioUrl/audioSeconds/audioIsAuto/pollOptionId`; `Photo` has `screenUrl` and no `area`/`freeTags`; `Image` has no `greyscale`; `Group` has no `description`/`coverImage`; `OutboundEmail` has no `bounceKind`; `Post` has no `groupId`; trigram indexes: `Photo_caption_trgm_idx`, `User_name_trgm_idx`, `Place_altNames_trgm_idx` (nine hand-written indexes, not eleven).
- Ghost references to the 119 deleted files, after the mechanical stem sweep and hand triage: 4 real (`(home)/page.tsx:47` -> `catchup-home-shell.tsx`; `notification-bell.tsx:64` -> `admin-actions.ts`; `protocol-audit.mjs:177-178` -> two deleted components; lab `_shelf.ts:33` -> `PREPARING_HOLD_HOURS`), the rest are deletion notes that say "was here until" with a reason (`people-door.tsx:7`, `photo-opener.tsx:7`, `seed.ts:311-317`, `_dev-login.mjs:19`, `admin/*/actions.ts` headers, `rich-text.ts`, `read-more-fold.test.mjs:74`, `batch-catchups.test.mjs:187-203` which pins the deletions).
- Comments describing code that no longer exists (deliverable 5), verified with `git log -S`: `reviveDormantEdition` (never existed by that name; only `d81a7db9`), `PREPARING_HOLD_HOURS` (deleted `782d9f7b`), `Photo_area_trgm_idx`/`Photo_freeTags_trgm_idx` (dropped 2026-09-08 with their columns; still listed in the schema header written `9f0c369f`), the `"preparing"` status in `vote-question-rule.test.mjs:121`, the handler-time scroll in `comments-section.tsx:251-253`, `ViewerImage carries no dimensions` in `image-viewer.tsx:311`.
