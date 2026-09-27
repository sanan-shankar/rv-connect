# Refactor audit 3 — every finding from the 14 complete reports (generated)

Generated from `work/agents/*.md` by `work/raw/extract-findings.mjs` on 2026-09-27. One row per finding; the full text, evidence, steps and gate are in the report named in the first column. **Nothing here is adversarially verified yet** (see `work/task_plan.md`, compile plan step 3), and 54 % of audit 2's findings carried a wrong detail at verification: trust the finding, re-derive the line range.

**274 findings.** Tiers: T1 87 · T2 133 · T3 37 · T4 17. Class: structural 199 · cheap 75. Decides: autonomous 239 · owner 35.

## tracked-weight (11)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| tracked-weight-01 | T2 | structural | autonomous | relocate (the  | Re-export the three Catch-up covers at the optimiser's ceiling; the camera-resolution masters live in history |
| tracked-weight-02 | T1 | structural | autonomous | relocate (to h | Send audit 2's `work/` folder to git history when its campaign closes, and this audit is the moment |
| tracked-weight-03 | T1 | structural | autonomous | relocate (to h | Bug audit 2's `work/` is a closed audit's working folder still in the tree |
| tracked-weight-04 | T3 | structural | owner (it changes wh | relocate (proc | The visual baselines are 82 % one photograph's entropy; the lever is a `style` hide during the shot, not a DPR or clip policy |
| tracked-weight-05 | T2 | structural | autonomous | relocate (proc | `shots:clean` exists and nobody runs it: 520 MB of scratch screenshots, plus two dead piles under `.claude/` |
| tracked-weight-06 | T2 | structural | autonomous | relocate (a pu | The 9 %-opacity valley backdrop fetches the 498 KB hero JPEG on every member's first signed-in page; give it its own small export |
| tracked-weight-07 | T2 | structural | autonomous | relocate | Gather the eleven lab-only Collection stand-ins under `public/lab/`, so one folder is "what only the lab asks for" |
| tracked-weight-08 | T1 | cheap | autonomous | hygiene | `.gitignore` still carries the two dead entries audit 2 found, and has gained nothing that should not be there |
| tracked-weight-09 | T2 | structural | owner | relocate (proc | `scripts/dev/.magazine` is 230 MB of printed Editions holding members' words, with no retention rule |
| tracked-weight-10 | T1 | cheap | autonomous | hygiene (local | `.git` is 267 MB, of which 100 MB is loose objects a `git gc` folds away; what history rewriting would recover, and why not to |
| tracked-weight-11 | T4 | structural | owner (owner decisio | relocate (to h | Decide what a closed design campaign keeps: the Catch-ups rework's exploration files are 0.68 MB no living document links |

## collection-media (24)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| collection-media-01 | T3 | structural | autonomous | placeholder | Retire the upward cursor walk: geometry already replaced it in Chronological order |
| collection-media-02 | T2 | structural | autonomous | architecture | Ship the shape index only where it is drawn, tally the years from it, and stop running the first page's three queries in series |
| collection-media-03 | T3 | structural | autonomous | architecture | Fetch the years the reader is approaching together: Next runs server actions one at a time |
| collection-media-04 | T3 | structural | autonomous | dedupe | One Collection encode for the fallback, the direct path and the album importer, which also ships the owner's audit-2 answer on the fallback |
| collection-media-05 | T2 | structural | autonomous | architecture | Move the river's types out of the "use server" file: the repo's only import cycle, three copies of `BandCount`, and two compatibility re-exports |
| collection-media-06 | T2 | structural | autonomous | architecture | `collectionPageData`: ask "is this half empty" with an existence check, skip the admin's own count, and fetch the first page beside the facts |
| collection-media-07 | T2 | structural | autonomous | dedupe | Fold the flat per-half props into `scopeFacts`, which also fixes the quota audit 2 said follows the wrong half |
| collection-media-08 | T2 | structural | autonomous | placeholder | Narrow the staged-original key to `staging/`: the `collection/` window closed on 2026-09-05 |
| collection-media-09 | T2 | structural | autonomous | dedupe | One quota rule: the composer's "add to the Collection" copy counts both halves and does not exempt admins |
| collection-media-10 | T2 | structural | autonomous | dedupe | The post-image pipeline is written in both upload routes, and the staged-original read in two places |
| collection-media-11 | T2 | structural | autonomous | dedupe | The cross-dissolve and the swipe thresholds are written twice (viewer and contribute stage) |
| collection-media-12 | T1 | structural | autonomous | dead | Props and options nobody passes: `ViewerImage.where`, `BucketTiles.mixed`, `useImageViewer(initialAt)`, `ContributeRoom`'s lab-room optionality |
| collection-media-13 | T1 | structural | autonomous | dead | Exports that only tests read, and one re-export shim |
| collection-media-14 | T2 | structural | autonomous | dead | `Photo_caption_trgm_idx` cannot serve the only query that searches captions |
| collection-media-15 | T1 | cheap | autonomous | hygiene | The 2026-09-07 drops have run; the Photo and Image comments, the index census and media.md still say they have not |
| collection-media-16 | T2 | structural | autonomous | library | Replace the carousel's hand-rolled Bezier sampler with motion's `cubicBezier` |
| collection-media-17 | T2 | cheap | autonomous | dedupe | One "too large" refusal, and presign's hand-copied HEIC advice |
| collection-media-18 | T1 | cheap | autonomous | dedupe | The ghost cell's flex-grow is written in two files that must agree |
| collection-media-19 | T3 | structural | autonomous | dedupe | Two EXIF container readers: one on Buffers for the server, one on Blobs for the browser |
| collection-media-20 | T2 | cheap | autonomous | dedupe | Scope resolution written out twice in `loadPhotos` and `loadBand` |
| collection-media-21 | T1 | cheap | autonomous | hygiene | `storage.ts` dynamically imports a module it already imports statically |
| collection-media-22 | T1 | cheap | autonomous | hygiene | The year rail's fade is a hand-typed curve |
| collection-media-23 | T1 | cheap | autonomous | hygiene | Comments that describe designs this territory has since replaced |
| collection-media-24 | T2 | cheap | autonomous | dedupe | `contributePhoto` and `contributePhotoDirect` each look the uploader up again for `photoTrusted` |

## fresh-code (22)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| fresh-code-01 | T2 | structural | owner | dead | Delete or restore the Catch-up picture picker: a 326-line component nobody imports, whose Settings row still opens it |
| fresh-code-02 | T3 | structural | autonomous | placeholder | Retire the Spotify song trio: a resolver, a zod field, a write path and three live columns that no client sends since 2026-07-25 |
| fresh-code-03 | T2 | structural | autonomous (where it | relocate | Move the magazine engine out of `src/lib`: 2,396 lines with only lab importers |
| fresh-code-04 | T3 | structural | autonomous | placeholder | Retire the pre-migration `P2021` guard: tables that have existed on production since 2026-09-08 |
| fresh-code-05 | T4 | structural | owner | placeholder | Three backend-complete features with no shipped UI: voice answers, vote questions, time capsules (owner decisions B, C, D) |
| fresh-code-06 | T3 | structural | owner | dedupe | The Catch-ups rework's lab prototypes were not retired after their transplant: 85 lab-to-shipped clones, 1,652 lines (owner decision E) |
| fresh-code-07 | T1 | cheap | autonomous (the TRAP | hygiene | Correct the schema and TRAPS comments that call themselves authoritative and are wrong: seven "still in both databases" columns and an index census of eleven th |
| fresh-code-08 | T2 | structural | autonomous | hygiene | The added tests that walk the whole tree, lay out the corpus three times, or ask git instead of the disk |
| fresh-code-09 | T1 | cheap | autonomous | hygiene | Twelve stale, duplicated or orphaned comments in the changed regions |
| fresh-code-10 | T1 | cheap | autonomous | dead | Two ghost rows in the protocol audit's allowlist name files deleted on 2026-09-08 |
| fresh-code-11 | T1 | structural | autonomous | dead | A QA helper kept "deliberately with no caller" since 2026-09-05, with two tests to keep it warm |
| fresh-code-12 | T1 | cheap | autonomous | dead | Drop the `export` keyword from nine symbols only their own file uses, and delete one dead pair |
| fresh-code-13 | T1 | structural | autonomous | architecture | Break the one import cycle: `PhotoShapeIndex` belongs in `collection-shape.ts` |
| fresh-code-14 | T2 | cheap | autonomous | hygiene | `useSettings` mirrors three props into state through three effects |
| fresh-code-15 | T2 | structural | autonomous (a: after | dedupe | Five small shipped-to-shipped duplications in the added files |
| fresh-code-16 | T2 | cheap | autonomous | hygiene | `healBatchCatchups` counts each batch's members and then `ensureBatchCatchup` counts them again |
| fresh-code-17 | T1 | cheap | autonomous | dead | Props no caller passes on the Edition reader's parts |
| fresh-code-18 | T1 | cheap | autonomous | hygiene | `presence-beacon`, `last-seen`, `admin-analytics`: the presence rework is clean; one stale number |
| fresh-code-19 | T2 | cheap | autonomous | hygiene | The `hoopoe.tsx` poke verbs use `null as never` a dozen times for motion's "from current value" keyframe |
| fresh-code-20 | T2 | structural | autonomous | dedupe | The loading-screen series: one three-line idiom written 68 times across 21 files |
| fresh-code-21 | T1 | cheap | autonomous | architecture ( | `tailwind-theme.css` + `@source not "./lab"`: the audit-2 CSS lever shipped; re-measure, and one comment to check |
| fresh-code-22 | T2 | structural | owner (deployed lab  | relocate (the  | The scripts added in the window are ledgered and clean, with two notes for the tracked-weight lens |

## lab-catchups (15)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| lab-catchups-01 | T3 | structural | autonomous | rewrite | Rebuild the twelve magazine fixtures as typed TypeScript builders and delete the JSON |
| lab-catchups-02 | T1 | structural | autonomous | relocate | Keep the member-data export reader out of the magazine room's module graph |
| lab-catchups-03 | T2 | structural | autonomous | relocate | Move the magazine corpus beside the engine whose test depends on it |
| lab-catchups-04 | T2 | structural | autonomous | relocate | Take the 429 KB Node crypto polyfill out of two rooms (and defuse catchups-02) |
| lab-catchups-05 | T2 | structural | autonomous | dedupe | Point the lab's copies of three shipped primitives at the shipped ones |
| lab-catchups-06 | T1 | structural | autonomous | dead | Delete the dead exports in the sketches room, tsc's unused `g`, and the code tombstones |
| lab-catchups-07 | T2 | structural | autonomous | architecture | Give the Catch-ups rooms a kit folder instead of borrowing the sketches room's files |
| lab-catchups-08 | T3 | structural | autonomous | architecture | Let shipped Catch-ups components take their server actions as props, at the next transplant |
| lab-catchups-09 | T2 | structural | autonomous | placeholder | Remove the dev-mode auth bypass from the lab's archive action |
| lab-catchups-10 | T1 | structural | autonomous | placeholder | Drop the "LabRoomState table not created yet" guard |
| lab-catchups-11 | T2 | structural | autonomous | dedupe | Retire the sketches room's own link resolver; phase 10 shipped the real one |
| lab-catchups-12 | T3 | structural | autonomous | dedupe | Write the Catch-ups rooms' chrome once |
| lab-catchups-13 | T1 | cheap | autonomous | hygiene | Correct the shipped comment that says the settings room "cannot drift" |
| lab-catchups-14 | T1 | cheap | autonomous | hygiene | Fix the registry note and room headers that describe features the rooms no longer have |
| lab-catchups-15 | T2 | cheap | autonomous (the copy | hygiene | Copy the owner's 31 archive choices into the committed registry |

## catchups-ui (35)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| catchups-ui-01 | T2 | structural | autonomous | placeholder | Mount the picture picker the settings Picture row has pointed at since 2026-09-09 |
| catchups-ui-02 | T4 | structural | owner | placeholder | Give the invite link a door again, or retire the invite subsystem (owner) |
| catchups-ui-03 | T2 | structural | autonomous | placeholder | Make the on-hold card's "Start it again" start it again |
| catchups-ui-04 | T3 | structural | autonomous | architecture | Load the home's settings, composer, roster and library on demand |
| catchups-ui-05 | T2 | structural | autonomous | dead | Stop building and shipping home fields no component reads |
| catchups-ui-06 | T3 | structural | autonomous | dedupe | Let the Keeper's early close and early open go through the engine's own transition |
| catchups-ui-07 | T3 | structural | owner | placeholder | Collapse the composer to the one he approved: no song field, three photographs on a wall question |
| catchups-ui-08 | T2 | structural | owner | dead | Take the dead Spotify pipeline out of submitEntry before its columns go |
| catchups-ui-09 | T2 | structural | autonomous | relocate | Move the two permanent redirects into next.config.ts |
| catchups-ui-10 | T1 | structural | autonomous | dead | Delete answer-redirect.tsx |
| catchups-ui-11 | T1 | structural | autonomous | dead | /catchups/new: delete the missing-table branch that cannot fire |
| catchups-ui-12 | T2 | structural | autonomous | architecture | Load the "almost ready" holding scene only when it is shown |
| catchups-ui-13 | T2 | structural | autonomous | dedupe | Reader: let generateMetadata share the page's two reads |
| catchups-ui-14 | T2 | structural | autonomous | dedupe | Home: read the viewer's membership from the roster it already loaded |
| catchups-ui-15 | T2 | structural | autonomous | dedupe | /catchups runs the layout's advanceDueCatchups a second time, concurrently |
| catchups-ui-16 | T2 | structural | autonomous | dedupe | Write the Edition-cover photo loader once |
| catchups-ui-17 | T2 | structural | autonomous | dedupe | Spell the Edition's clock columns once |
| catchups-ui-18 | T2 | structural | autonomous | dedupe | One membership lookup |
| catchups-ui-19 | T2 | structural | autonomous | dedupe | One join shell and one refusal card |
| catchups-ui-20 | T2 | structural | autonomous | dedupe | Finish audit 2's catchups-02: one spelling of the cadence, reminder and notification lists, and no library in the payload |
| catchups-ui-21 | T2 | structural | autonomous | placeholder | Retire the "pending question" machinery nothing can produce |
| catchups-ui-22 | T2 | structural | autonomous | dead | Delete catchupSurfaceTitle, as he already decided |
| catchups-ui-23 | T1 | cheap | autonomous | dead | Remove dead exports and constants |
| catchups-ui-24 | T1 | cheap | autonomous | placeholder | Drop options every caller leaves at their default |
| catchups-ui-25 | T2 | structural | autonomous | dedupe | One small row button, and one dialog-or-sheet frame |
| catchups-ui-26 | T1 | cheap | autonomous | dedupe | Import the three constants that are re-typed beside the file that exports them |
| catchups-ui-27 | T2 | structural | autonomous | dedupe | Give the reader's skeleton the reader's own classes |
| catchups-ui-28 | T2 | cheap | autonomous | dedupe | Fold actions.ts's single-use member gates into one |
| catchups-ui-29 | T2 | cheap | autonomous | dedupe | startNextEditionNow reads the group it could have had |
| catchups-ui-30 | T3 | structural | autonomous | dedupe | After mounting it, give the picture picker photo-aim's drag instead of a copy |
| catchups-ui-31 | T2 | cheap | autonomous | hygiene | answer-experience: make the direction reach the exiting card, and fix the indentation |
| catchups-ui-32 | T1 | cheap | autonomous | hygiene | Rename the things whose names describe something else |
| catchups-ui-33 | T1 | cheap | autonomous | hygiene | Delete or correct the comments that describe deleted code |
| catchups-ui-34 | T2 | cheap | autonomous | placeholder | Stop drawing Edition states nothing produces |
| catchups-ui-35 | T2 | structural | owner | placeholder | The end-of-answering card links to the page it is drawn on (owner) |

## catchups-lib (21)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| catchups-lib-01 | T3 | structural | autonomous | dedupe | Let the Keeper's "close and send it out" run the clock's own transition instead of a hand copy of it |
| catchups-lib-02 | T3 | structural | autonomous (see Note | architecture | On the per-page advance, load only Catch-ups whose deadline has passed, not every live Catch-up with all its Editions |
| catchups-lib-03 | T2 | structural | autonomous | architecture | Stop re-reading an Edition the advance did not change |
| catchups-lib-04 | T3 | structural | owner (the drops) /  | placeholder | Retire `CatchupPrompt.accepted` (always true since the approval step died on 2026-08-05), and the two other columns nothing writes |
| catchups-lib-05 | T3 | structural | owner | placeholder | The Spotify song path: unreachable since link previews, held by the owner for the rework (audit 2 D3) |
| catchups-lib-06 | T2 | structural | autonomous | dead | Delete the reader loader's fields that nobody reads |
| catchups-lib-07 | T2 | structural | autonomous | placeholder | Remove the `draft` Edition state that nothing creates |
| catchups-lib-08 | T2 | structural | autonomous | dead | Make `advanceEdition`'s Catch-up context required: its fallback query is unreachable and its "active" default is a trap (audit 2 D11, `catchups-06`) |
| catchups-lib-09 | T2 | structural | autonomous | dedupe | One source of truth for the vocabularies `actions.ts` still retypes (audit 2 `catchups-02`, the column half of `catchups-09`) |
| catchups-lib-10 | T2 | structural | autonomous | dedupe | Let the export script import what it retypes, and use or delete the two export helpers nobody calls |
| catchups-lib-11 | T2 | structural | autonomous | dedupe | Write the notify builders as plain functions, and fold their two repeated steps |
| catchups-lib-12 | T1 | structural | autonomous | dead | Delete the dead exports and types (includes audit 2 `catchups-05`) |
| catchups-lib-13 | T2 | cheap | autonomous | hygiene | Fold `catchupShelf` into its one caller now that the bin is gone |
| catchups-lib-14 | T3 | structural | owner | architecture | One spelling for "Keeper" on a membership row: the reason for two died with group posts |
| catchups-lib-15 | T1 | cheap | autonomous | hygiene | Fix the comments that describe deleted code or point the wrong way (audit 2 `catchups-14`) |
| catchups-lib-16 | T2 | cheap | autonomous (only if  | dead | If the magazine engine stays: trim its unused public surface and its internal repeats |
| catchups-lib-17 | T4 | structural | owner | relocate | The magazine engine lives in `src/lib` but only a lab room and a spike script use it |
| catchups-lib-18 | T4 | structural | owner | placeholder | Vote, voice and time capsule are built underneath and unreachable, waiting for his pick since 2026-09-14 |
| catchups-lib-19 | T4 | structural | owner | architecture | The Group layer under Catch-ups: propose folding it into a Catch-up membership table (not now) |
| catchups-lib-20 | T1 | cheap | autonomous | dedupe | One "client or transaction" database type instead of three |
| catchups-lib-21 | T2 | cheap | owner | dedupe | Two words for the same rhythm on two member screens |

## bundle-build (11)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| bundle-build-01 | T2 | structural | autonomous | architecture | Keep `public/` out of every server function's trace: 13.5 MB of deployed images the CDN already serves, growing with every photograph |
| bundle-build-02 | T2 | structural | autonomous | architecture | Defer the hoopoe rig behind the empty-state and celebration wrappers: 31.9 KB raw / 8.7 KB gz eager on ten member routes for a bird that only appears when there |
| bundle-build-03 | T2 | structural | autonomous | architecture | Take the base-ui Button chain out of the root `error.tsx` boundary: a private 14 KB copy in the floor of all 118 routes |
| bundle-build-04 | T2 | structural | autonomous | library (the p | The Catch-up picture picker serves three 4,608-pixel originals as thumbnails (6.8 MB for a 5:2 strip), and the pool originals are twice the size any surface can |
| bundle-build-05 | T2 | structural | autonomous | architecture | Server source maps: 1,020 `.map` files, 108 MB, 72 % of `.next/server`, traced into no function - measure a build without them |
| bundle-build-06 | T2 | structural | autonomous (the engi | relocate | Move the magazine engine out of `src/lib`: 2,396 lines that ship to nobody but one lab room, compiled and type-checked in every build including the demo's |
| bundle-build-07 | T2 | structural | autonomous | architecture | Defer the base-ui Tooltip behind `VerifiedMark`: ~10 KB raw / ~3.5 KB gz eager on `/profile/[id]` and `/directory` for a badge's hover text |
| bundle-build-08 | T1 | cheap | autonomous | hygiene | Keep test files out of the stylesheet's source scan: 7 rules / 0.4 KB exist only because `*.test.mjs` files under `src/` quote class names |
| bundle-build-09 | T4 | structural | owner (carry-over; r | architecture | The lab's share of the production build, re-measured on this artefact: 56 % of routes, 48 % of client-chunk bytes, 42 % of the server app tree, 93 % of the font |
| bundle-build-10 | T4 | structural | n/a (a measurement n | architecture | The build, explained: 952.9 s wall is a load-average artefact, and the artefact's phases are what to compare |
| bundle-build-11 | T3 | structural | autonomous (measurem | architecture | Turbopack's per-group copies, counted on this build: three Button chains on 46 routes, the motion engine in 28 chunks, the image viewer in nine, the Sentry serv |

## admin-analytics (24)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| admin-analytics-01 | T3 | structural | autonomous | relocate | Take the admin rail and its count store out of every member's shell |
| admin-analytics-02 | T1 | structural | autonomous | relocate | Load the moderation dialog lazily in the comments section, as the other three sites already do |
| admin-analytics-03 | T4 | structural | owner | dedupe | One set of admin tools, not two: the profile page's Admin tools card |
| admin-analytics-04 | T2 | structural | autonomous | dead | Drop the MetricSnapshot index no read can use, and let the trend read ask only for what it draws |
| admin-analytics-05 | T3 | structural | autonomous | architecture | Keep the rail's counts beside the list they count, and delete the renaming layer between them |
| admin-analytics-06 | T1 | structural | autonomous | dedupe | Compare every count when the rail decides whether anything changed |
| admin-analytics-07 | T2 | structural | autonomous | placeholder | The People row computes five email states and reads one |
| admin-analytics-08 | T2 | structural | autonomous | dedupe | One label map per vocabulary: sign-in reasons and audit actions on /admin/audit |
| admin-analytics-09 | T2 | structural | autonomous | dedupe | Count the mail queue in one pass, the way the file next door already does |
| admin-analytics-10 | T2 | structural | autonomous | dedupe | One person link for the admin wing |
| admin-analytics-11 | T2 | structural | autonomous | dedupe | One mail row mapper and one status table; the list itself can be a server component |
| admin-analytics-12 | T2 | structural | autonomous | dedupe | The person page: reuse StatTile and formatPaise, and write the save footer once |
| admin-analytics-13 | T2 | structural | autonomous | architecture | Admin reads that wait for no reason or fetch rows to count them |
| admin-analytics-14 | T2 | structural | autonomous | dedupe | "Hide the post" is two server actions and ignores the first one's answer |
| admin-analytics-15 | T2 | structural | autonomous | dead | Dead reads, dead options and branches nothing can reach |
| admin-analytics-16 | T2 | structural | autonomous | dedupe | One page-id pattern, not a regex in TypeScript and a copy of it in SQL |
| admin-analytics-17 | T1 | structural | autonomous | dedupe | Small clones inside the wing |
| admin-analytics-18 | T4 | structural | owner | dedupe | Two admin screens that repeat each other |
| admin-analytics-19 | T4 | structural | owner | placeholder | Twenty of the thirty-five nightly numbers are shown nowhere |
| admin-analytics-20 | T2 | structural | autonomous | relocate | Make the PostHog "provider" the leaf it is, and decide whether the demo loads it |
| admin-analytics-21 | T2 | cheap | autonomous | hygiene | One helper for the six audit writes in people/actions.ts |
| admin-analytics-22 | T1 | cheap | autonomous | hygiene | Derivable props and React leftovers |
| admin-analytics-23 | T1 | cheap | autonomous | hygiene | Stale and repeated comments in the wing |
| admin-analytics-24 | T1 | cheap | autonomous | hygiene | Small hygiene in the analytics room and the support page (use the file's own helpers, name things what they are) |

## auth-onboarding-settings (23)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| auth-onboarding-settings-01 | T2 | structural | autonomous | dead | Stop minting the session claims nobody reads (`role`, `batchType`, `batchYear`, and `id` beside `sub`) |
| auth-onboarding-settings-02 | T2 | structural | autonomous | dedupe | The proxy runs on Node in Next 16: import the demo's closed list instead of mirroring it, and delete the mirror test |
| auth-onboarding-settings-03 | T2 | structural | autonomous | architecture | `/dark-mode` loads the hoopoe rig for a bird that appears only at step 6: make the sleep trial and the nightfall scene lazy |
| auth-onboarding-settings-04 | T2 | structural | autonomous | architecture | `/signup` loads the whole register form behind a question every visitor answers first: lazy-load it with a preload at the gate |
| auth-onboarding-settings-05 | T3 | structural | autonomous | dedupe | Carry out the owner's answer to audit-2 Q7: one help-bubble machine, look unchanged (signup's private `InfoTip` is one of the three) |
| auth-onboarding-settings-06 | T2 | structural | autonomous | dedupe | Resend-the-confirmation is written three times and has drifted; make it one hook, and make the two gate dialogs one card |
| auth-onboarding-settings-07 | T2 | structural | autonomous | relocate | Sweep dead AuthToken rows in the nightly retention pass, not in an `after()` on every mint |
| auth-onboarding-settings-08 | T1 | structural | autonomous | dead | `readToken`'s consume branch has no caller left: make it `peekToken`, and fix the docblocks that describe the old shape |
| auth-onboarding-settings-09 | T2 | structural | autonomous | dedupe | The account purge: a docblock above the wrong function, two facts read twice in one transaction, and its audit sentence written in two files |
| auth-onboarding-settings-10 | T3 | structural | autonomous | dedupe | `/login` and `/signup` each carry their own copy of the flight-destination shell: extract it once |
| auth-onboarding-settings-11 | T2 | structural | autonomous | dedupe | The onboarding wizard: `onSkip` is always `onNext`, the step list is written three times, and the footer and heading are written three times |
| auth-onboarding-settings-12 | T2 | structural | autonomous | dedupe | Seven identical step cross-fades on the auth pages: one `StepSwap` |
| auth-onboarding-settings-13 | T1 | structural | autonomous | dead | `theme-actions.ts` is "one implementation, two names; collapse to one when the flow ships". It shipped: collapse it |
| auth-onboarding-settings-14 | T1 | structural | autonomous | dead | `turnstile.ts`: an export with one internal caller, an exported type nobody imports, and a three-line wrapper |
| auth-onboarding-settings-15 | T2 | cheap | autonomous | dedupe | `api-gate.ts`: fold the six hand-built refusals into one helper, and keep every gate call literal |
| auth-onboarding-settings-16 | T1 | cheap | autonomous | dedupe | The password floor: three server checks at signup, four wordings, three hand-typed eights |
| auth-onboarding-settings-17 | T2 | cheap | autonomous | dedupe | The signup form's submit handler: one `fail()`, a module-level account-type list, one class string for the three legal links, and the shared year rule |
| auth-onboarding-settings-18 | T1 | cheap | autonomous | hygiene | `rate-limit.ts`: a docblock that argues the old number, a future tense for a shipped feature, and the demo check written three times |
| auth-onboarding-settings-19 | T2 | cheap | autonomous | dedupe | The same field rules written twice across onboarding, settings and admin: build from `profileSchema`, one account-type list, and one name for the only houses wr |
| auth-onboarding-settings-20 | T1 | cheap | autonomous | dedupe | `proxy.ts` has `isUnder()` and then writes its body out three more times |
| auth-onboarding-settings-21 | T1 | cheap | autonomous | hygiene | Four verified audit-2 rows that fell out of the plan and are still true |
| auth-onboarding-settings-22 | T1 | cheap | autonomous | hygiene | Comments that describe code that moved or no longer exists (14 sites) |
| auth-onboarding-settings-23 | T1 | cheap | autonomous | hygiene | Small code simplifications (no-op ternaries, a per-render constant, an identity transform, repeated literals) |

## feed-posts-comments (24)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| feed-posts-comments-01 | T3 | structural | autonomous | architecture | Seed `/feed`'s first page on the server and advance the "new since" marker there, the way B13 already does for a profile's Writing tab |
| feed-posts-comments-02 | T4 | structural | owner | placeholder | Post batch targeting is plumbed end to end, no member can ever set it, and the in-app guide says they can (owner decision A) |
| feed-posts-comments-03 | T4 | structural | owner | placeholder | Polls have no live rows six months after they shipped (owner decision B) |
| feed-posts-comments-04 | T3 | structural | autonomous | architecture | Let the post and comment write actions take arguments instead of FormData that every caller builds by hand |
| feed-posts-comments-05 | T2 | structural | autonomous | dedupe | `canViewPost` already returns the post row; stop fetching it again right after |
| feed-posts-comments-06 | T3 | structural | autonomous | dedupe | The composer's editor is a second copy of `<RichTextArea>`; the reasons given for the fork are two-thirds gone |
| feed-posts-comments-07 | T3 | structural | owner | dedupe | The composer's "+" menu is the last hand-rolled menu in the product (owner decision C) |
| feed-posts-comments-08 | T1 | structural | autonomous | placeholder | Delete `PostCard`'s `variant` prop: nothing, lab included, has ever passed "sheet" since the v2 design went to the lab |
| feed-posts-comments-09 | T2 | structural | autonomous | placeholder | `CreatePostForm`'s `defaultLetter` and `immersive` are one fact; delete the letter shell no caller can reach and merge the two returns |
| feed-posts-comments-10 | T1 | structural | autonomous | dead | Delete `PostFeed`'s `searchInput` state and its 300 ms debounce: nothing has typed into it since the header pill took search |
| feed-posts-comments-11 | T1 | structural | autonomous | dead | `loadPosts`' `offset:` cursor guard is already what `decodeKeyset` does; delete it and its paragraph |
| feed-posts-comments-12 | T2 | structural | autonomous | relocate | The Catch-up reader ships the SSRF classifier to the browser because `linkRanges` goes through `findLinks` |
| feed-posts-comments-13 | T2 | structural | autonomous | library | If polls stay: defer `PollDisplay` behind `post.poll`, and let motion drive its count-up |
| feed-posts-comments-14 | T2 | structural | autonomous | dedupe | The composer re-writes `uploadOneImage`'s ceremony, and the reason the helper gives for that does not hold |
| feed-posts-comments-15 | T3 | structural | autonomous | architecture | Take the composer out of `/feed`'s first load and preload it while the member reads |
| feed-posts-comments-16 | T1 | cheap | autonomous | hygiene | About ninety comment lines describe code that was deleted or changed; delete or correct them |
| feed-posts-comments-17 | T2 | structural | autonomous | dedupe | One `LetterEyebrow` and one "city only" chip instead of three and two hand-written copies, with the middle dot the design system requires |
| feed-posts-comments-18 | T2 | cheap | autonomous | dedupe | Fold the comment section's internal repeats and use `<Button>` for its send control |
| feed-posts-comments-19 | T2 | cheap | autonomous | dedupe | The comment section re-declares the serializer's type by hand |
| feed-posts-comments-20 | T1 | cheap | autonomous | dedupe | The rail: one week helper instead of two constants and two lint disables; share the card shell with its skeleton |
| feed-posts-comments-21 | T1 | cheap | autonomous | dedupe | Notifications: count unread through the cached helper, and fix the docblock that describes the old cursor |
| feed-posts-comments-22 | T1 | cheap | autonomous | hygiene | Drop the pass-through arrows in the two comment-action bundles |
| feed-posts-comments-23 | T2 | structural | autonomous | relocate | Move `use-engagement.ts` to `components/common/`: it is every heart's hook, not the post card's |
| feed-posts-comments-24 | T1 | cheap | autonomous | hygiene | The small leftovers: an unreachable guard, two intermediates, two defensive try/catches, a redundant re-check |

## lab-rest (16)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| lab-rest-01 | T1 | structural | autonomous | relocate | Move the four room-private files out of the lab kit's root |
| lab-rest-02 | T2 | structural | autonomous | relocate | Stop calling the crop room's photographs "throwaway": they are the Collection's test archive |
| lab-rest-03 | T2 | structural | autonomous | placeholder | Remove the lab index's "editable" switch: only admins can reach the page |
| lab-rest-04 | T1 | structural | autonomous | dead | Delete the dead exports and wrappers in five rooms |
| lab-rest-05 | T2 | structural | autonomous | architecture | Type SpringPress's props properly: 26 casts in the lab (and 10 in shipped code) exist only to pass a `type` or a `role` |
| lab-rest-06 | T1 | structural | autonomous | dead | Delete `lab.css`'s hoopoe block: the v2 room's own styles override every wing rule in it |
| lab-rest-07 | T1 | structural | autonomous | dedupe | Give `/lab/birds-bg` the shipped species names instead of its own 26 |
| lab-rest-08 | T1 | cheap | autonomous | placeholder | Retire the kit's no-op `staggerChild` and its five dead style rules |
| lab-rest-09 | T2 | structural | autonomous | dedupe | Write the lab's three "switch between concepts" harnesses once |
| lab-rest-10 | T4 | structural | owner | placeholder | `/lab/landings` draws five screenshots the owner deleted on 2026-09-07 |
| lab-rest-11 | T4 | structural | owner | architecture | The two archived type rooms put 66 font files (2.8 MB) into every production build |
| lab-rest-12 | T4 | structural | owner | architecture | `/lab/everything` compiles a July audit log whose paths have rotted |
| lab-rest-13 | T4 | structural | owner | architecture | `/lab/profiles` carries eight directions the owner did not pick, 5,566 lines of them |
| lab-rest-14 | T1 | cheap | autonomous | hygiene | Correct the lab's stale comments and registry notes |
| lab-rest-15 | T1 | cheap | autonomous | hygiene | Cut 21 room ledes to the one line the lab-voice spec asks for |
| lab-rest-16 | T2 | structural | autonomous (after ow | dedupe | If the valley and years rooms stay, give their four WebGL scenes one set of helpers |

## common-primitives (16)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| common-primitives-01 | T3 | structural | autonomous | dedupe | Replace nine hand-rolled media-query subscriptions with one `useMediaQuery` |
| common-primitives-02 | T3 | structural | autonomous (the owne | dedupe | Finish audit 2's Q7: one help-bubble machine instead of three, and the only `@base-ui/react/tooltip` import goes |
| common-primitives-03 | T2 | structural | autonomous | architecture | Give `SpringPress` real element props: 36 `as object` casts and six hand-inlined copies go |
| common-primitives-04 | T2 | structural | autonomous | dedupe | One people search: fold the mention dropdown's copy into `useUserSearch`, and give the Catch-up pickers the "Low 100" fix they are missing |
| common-primitives-05 | T2 | structural | autonomous (one pixe | dedupe | One action-pill shell for the five post-row buttons, and one comments toggle instead of two |
| common-primitives-06 | T2 | structural | autonomous | dedupe | Draw the Catch-up "Rhythm" control with `SegmentedPills` instead of a 78-line copy of it |
| common-primitives-07 | T2 | structural | owner (it trims a la | placeholder | Drop `LocationPicker`'s single mode, which only the lab harness uses (audit 2's row #13, never asked) |
| common-primitives-08 | T1 | structural | autonomous | placeholder | Remove the optional props no caller passes (lab re-grepped) |
| common-primitives-09 | T1 | structural | autonomous | placeholder | Delete `BirdAvatar`'s inert `ring` prop and the deprecated `avatarSpecies` field |
| common-primitives-10 | T1 | structural | autonomous | relocate | Move `HouseOptions` beside its only caller, and make its tint function required |
| common-primitives-11 | T1 | structural | autonomous | placeholder | Delete the zero "nudge" that puts a transform on every identity row |
| common-primitives-12 | T1 | cheap | autonomous | hygiene | Button: one name for the CTA fill, and stop callers restating its defaults |
| common-primitives-13 | T2 | structural | autonomous | dedupe | One removable chip for the location picker and the tag input |
| common-primitives-14 | T1 | cheap | autonomous | hygiene | Filters kit: inline the single-use popup, fold the twin year selects, and cut the comments that describe the old canopy-wash pills |
| common-primitives-15 | T1 | cheap | autonomous | hygiene | `BookmarkButton`: take its SVG id from `useId()` instead of a required prop |
| common-primitives-16 | T1 | cheap | autonomous | hygiene | Correct the primitives' docblocks that describe callers, colours or files that are gone |

## directory-profile (17)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| directory-profile-01 | T2 | structural | autonomous | rewrite | Stop rendering your own profile twice on every autosave |
| directory-profile-02 | T2 | structural | autonomous | rewrite | Serve the profile's Photos grid through the photo ladder, lazily, instead of 60 full-size originals at once |
| directory-profile-03 | T2 | structural | autonomous | placeholder | Collapse `/api/users-by-batch` to the one response shape anything asks for |
| directory-profile-04 | T2 | structural | autonomous | dedupe | Derive the map's person type from `PIN_SELECT`, and stop sending a city the drilldown never draws |
| directory-profile-05 | T2 | structural | autonomous | placeholder | Delete the profile's "migration window" city fallback, unreachable since the July backfill |
| directory-profile-06 | T2 | structural | autonomous | dedupe | `updateProfileField`: read the member's row once per save, and write the field list once |
| directory-profile-07 | T2 | structural | autonomous | dead | Drop the eleven `profileSchema` fields nothing validates any more |
| directory-profile-08 | T2 | structural | autonomous | placeholder | Hand the directory's applied filters through unchanged, and delete the never-linked `?cursor=` path |
| directory-profile-09 | T2 | structural | autonomous | dedupe | Take the directory's batch-year range from the tile counts it already fetched |
| directory-profile-10 | T3 | structural | autonomous | relocate | Move `buildPins` out of the page into a module the unit runner can load, and pin its rules by behaviour |
| directory-profile-11 | T3 | structural | owner | dedupe | One set of admin person actions for the profile and the admin panel (owner picks the ceremony) |
| directory-profile-12 | T3 | structural | autonomous | architecture | Give the letterhead's three read-path sub-components their own files (file organisation only) |
| directory-profile-13 | T1 | cheap | autonomous | dedupe | Merge the duplicated house-span tests into the file of the function they test |
| directory-profile-14 | T1 | cheap | autonomous | dead | Delete the directory rule test that can no longer fail |
| directory-profile-15 | T1 | cheap | autonomous | hygiene | Correct the comments that describe code that is gone (batch) |
| directory-profile-16 | T1 | cheap | autonomous | dedupe | Small dedupes, dead defaults and one unreachable branch (batch, new since audit 2) |
| directory-profile-17 | T1 | cheap | autonomous | dedupe | Carry-over: audit 2's `directory-profile-26` is still entirely open (current lines) |

## landing-mascot-avatars (15)

| id | tier | class | decides | phase | title |
|---|---|---|---|---|---|
| landing-mascot-avatars-01 | T2 | structural | autonomous | architecture | Take the hoopoe rig and the auth-form preview off `/`'s first load: the landing is invisible until its JavaScript runs, and ~78 KB of that JavaScript is for a c |
| landing-mascot-avatars-02 | T3 | structural | autonomous (steps 1- | architecture | The 51 bird drawings ride all 39 member routes for two shell birds: split the names from the art, then cut the two shell edges (audit 2's free half, lost in com |
| landing-mascot-avatars-03 | T2 | structural | autonomous | architecture | The cross-page flight and the mascot kit sit in the root floor of all 118 routes for a flight that only launches from `/` on a desktop: keep a listener in the r |
| landing-mascot-avatars-04 | T3 | structural | autonomous | rewrite | Draw the saved contact's bird from the bird already on the card: retire 102 pre-rendered PNGs, their generator, and the "re-run it whenever a bird changes" duty |
| landing-mascot-avatars-05 | T2 | structural | autonomous (tell the | dedupe (and a  | The empty-state moments have never played: `MomentStage` arms its IntersectionObserver while its stage is not rendered; use the one stage shape `ContributedHoop |
| landing-mascot-avatars-06 | T2 | structural | autonomous | rewrite (queri | `CelebrationSignals` runs three queries on every `/feed` and `/welcome` render; two are one `groupBy`, and the profile-complete half reads a column nothing writ |
| landing-mascot-avatars-07 | T1 | cheap | autonomous | dead / placeho | The rig's dead surface: a prop, an option, a reaction and a guard that nothing uses, in a module on 17 routes |
| landing-mascot-avatars-08 | T2 | structural | autonomous (the crou | dedupe | One small flight toolkit: the launch pose is written twice in the rig, and the quintic ease, `clamp`, `sleep` and the launch crouch are each written three to fi |
| landing-mascot-avatars-09 | T1 | structural | autonomous | dedupe | Name the flight's three deadlines once: 2500 < 5800 < 6000 live in two files and two comments, and the comments have already drifted |
| landing-mascot-avatars-10 | T1 | cheap | autonomous | rewrite | The hero's hover wash animates `background-color` on a full-viewport layer: cross-fade a black layer's opacity instead |
| landing-mascot-avatars-11 | T1 | structural | autonomous | relocate | `one-shot.ts` is the app's per-user localStorage latch, not a mascot file: move it to `src/lib/` |
| landing-mascot-avatars-12 | T1 | cheap | autonomous | dead / hygiene | Small dead surface in the avatar modules |
| landing-mascot-avatars-13 | T1 | cheap | autonomous | hygiene | Stale comments in the mascot and landing files, including three that would mislead a fixer |
| landing-mascot-avatars-14 | T1 | cheap | autonomous | hygiene | E8's residue: the one real item is the missing Strict-Mode deferral in `CelebrationHoopoe`; the waiter unification is not worth a row |
| landing-mascot-avatars-15 | T1 | structural | autonomous | placeholder | `HoopoeWarmup` on `/login` and `/signup` warms a rig those pages have already drawn (audit 2's auth-edge-04, re-verified) |

