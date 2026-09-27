# catchups-ui - refactor audit 3 report

Charter T02: the whole member-facing Catch-ups surface. That is `src/components/catchups/**` (the list, the
home, the reader, answering, settings, create, join), every route under `src/app/(main)/catchups/**`
including the 2,821-line `actions.ts`, and the public invite routes in `src/app/catchups/**`. All of
it shipped between 2026-09-05 and 2026-09-22 in the Catch-ups rework and has never been audited.
Specs read first: `docs/spec/catchups.md` (in full), `docs/planning/catchups-rework/architecture.md`
(in full), `spec.md` (§1-§3.5b and §4-§11 in full, the rest by heading), `handover.md` (start,
status board, the phase rows, the relevant session-log passages), `review-2026-09-06.md`
(skimmed: its own handover says "grep, do not read"), and audit 2's `catchups.md` agent report
plus its fix-prompt board. Date 2026-09-24, HEAD `70570bcd`. Files in territory: 51. Read fully: 51.

## Coverage
- Read fully (51 files, 12,324 raw lines):
  - `src/components/catchups/**`, all 36 files, 7,585 lines, including
    `edition/reader-geometry.test.mjs`.
  - `src/app/(main)/catchups/**`, all 12 files, 4,424 lines: `actions.ts`, `layout.tsx`, the four
    pages, the four loadings and the two redirect pages.
  - `src/app/catchups/join/**`, all 3 files, 315 lines.
- Read for context, outside the territory, with no findings of mine written on them:
  - `src/lib/catchups.ts`: `EDITION_TIMING_SELECT`, `applyEditionAction`, `advanceEdition`,
    `advanceDueCatchups`.
  - `src/lib/catchups-core.ts`: the imports, `catchupDisplayName` and `catchupSurfaceTitle`,
    `isMissingCatchupTable`, the tail of `resolveSpotify`.
  - `src/lib/prisma-errors.ts` (`isMissingTable`) and `src/lib/test-kit.mjs` (`serverActionFiles`).
  - `src/components/ui/{button,sheet}.tsx` (the size list and exports), `common/photo-aim.tsx`
    (head and exports), `common/use-{wide-viewport,coarse-pointer}.ts`, and the part of
    `(main)/layout.tsx` that touches Catch-ups.
  - The lab's `sketches/_home.tsx` composer (lines 595-760), to answer charter question 3.
- Build artefacts read (read-only, from the orchestrator's build): the 13 route-specific chunks of the
  Catch-ups routes in `.next/static/chunks`, split at turbopack module boundaries to size what each
  holds. No build was run.
- Skimmed (why): `review-2026-09-06.md` past its part headings (owner verdicts on rejected sketches,
  no code facts); `handover.md` session-log passages not about a file I judge.
- Not read: none of the territory.
- Uncommitted edits seen: none (`git status --short` on every path in the territory was clean at
  start).

## Summary
This territory is a freshly rebuilt feature. It is carefully argued and heavily commented (cloc:
7,556 code lines, 4,000 comment lines, ratio 0.53), and most of the comment mass is owner quotes and
measurements. By the rule audits 1 and 2 proved, that is the product, not bloat.

The rebuild did leave damage, all of it from build phase 7 (`b94677ce`, 2026-09-09), which swapped
the home's files wholesale.
- Two features are plumbed end to end with no door. The settings **Picture** row opens nothing (the
  326-line picker and `setCatchupPicture` are orphaned), and the Keeper's **invite link** vanished
  with `people-panel.tsx`, so the three join routes, `AcceptInvite`, `joinCatchupByToken` and the
  `inviteToken` column serve only links shared before 9 September.
- The on-hold card's **Start it again** calls `router.refresh()` and nothing else.
- The composer kept a song field and a one-photo wall that his LOCKED spec (§10.1) deleted.

The structural wins, in the right units:
- About **25-45 KB of first-load JS** can come off the Catch-up home (3rd-heaviest shipped route,
  1,147.5 KB). Settings, the composer's photo stack, the roster and the library all load for every
  state.
- **3-4 queries per load** go across the home and the reader. The home runs a `distinct` query to
  fill a field no component reads, and repeats a membership read it already holds; the reader's
  metadata reads the Edition and membership a second time.
- **About 60-80 lines** of `actions.ts` re-implement the engine's own close and open transitions.
- **Two route files** are 308s that belong in `next.config.ts`.
- **One dead file**, and a `/catchups/new` error branch that cannot fire.
- **About 20 unread fields** are serialized into every home render.

The cheap half (dead exports, unused options, stale comments, re-typed constants) is real but
small: roughly 150 lines. Split: 26 structural, 9 cheap.

What surprised me:
- The damage is **regression by transplant**. Every dead control traces to `b94677ce`.
- Audit 2's parked rows (catchups-02/08/09) mostly **survived the rework**, re-created rather than
  fixed. Only catchups-07 went moot, with `preparing`.

Not worth splitting: `actions.ts` into files. It is line-neutral, would re-point 12 path-based pins,
and would make its private gates importable app-wide. Cut its duplicates and its stale history
instead (≈200 lines).

## Findings

### catchups-ui-01 - Mount the picture picker the settings Picture row has pointed at since 2026-09-09
- **Where**:
  - `src/components/catchups/settings/settings-surface.tsx:142-145`: the `Opens` union's
    `| { shape: "picture" }`.
  - Same file `:276-282`: the `catchupGroup` row with key `"picture"`,
    `opens: c.canChangePicture ? { shape: "picture" } : undefined`.
  - Same file `:952-1008`: `SettingsDialogs` renders only
    `const shown = open?.shape === "confirm" || open?.shape === "edit";`, while its docblock says
    "The picture is the exception ... it opens the picker that shipped in build phase 3".
  - `src/components/catchups/home/picture-picker-dialog.tsx:1-326`: `PicturePickerDialog`, which
    nothing imports.
  - `src/app/(main)/catchups/actions.ts:768-851`: `setCatchupPicture`, whose only caller is that
    dialog.
  - `src/components/catchups/home/catchup-home.tsx:299-323`: where the settings frames and
    `SettingsDialogs` mount.
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - `raw/knip-repo-plus-lab.txt` lists `picture-picker-dialog.tsx` as an unused file and
    `setCatchupPicture` (`actions.ts:797`) as an unused export. madge and depcruise agree.
  - `git show b94677ce` deletes `keeper-settings-dialog.tsx`, the picker's only importer
    (`-import { PicturePickerDialog } from "./picture-picker-dialog";` and
    `-      <PicturePickerDialog`). The `settings-surface.tsx` added in the same commit gives the row
    a `picture` shape and no renderer.
  - So pressing Picture sets `dialog` state to `{ shape: "picture" }` and nothing appears.
  - The capability is his LOCKED decision: spec.md §3.4, architecture §1b ("whoever may run the
    Catch-up may replace it ... anyone in the batch"). `docs/spec/catchups.md` §6 still describes it
    as working.
- **What to do**:
  - Mount it in `catchup-home.tsx` beside `<SettingsDialogs {...s.dialogs} />`, loaded on demand:
    `const PicturePickerDialog = dynamic(() => import("./picture-picker-dialog").then((m) => m.PicturePickerDialog));`
    then
    `<PicturePickerDialog open={s.dialogs.open?.shape === "picture"} onOpenChange={(o) => !o && s.dialogs.onClose()} catchupId={data.catchupId} picture={data.picture} onChanged={() => router.refresh()} />`.
  - Or mount it inside `SettingsDialogs`, which already has `c.catchupId` and `c.picture`
    (`settings/types.ts:14-38`).
  - Do NOT delete the picker or the action to satisfy knip. That would cut a locked feature.
- **Saving**: 0 lines removed (about 8 added). 2 knip "unused" items resolved and 1 dead control made
  live. Loaded on demand, the picker's upload and aiming code stays out of first load.
- **Risk & gate**: low.
  - `npm run check`: `upload-size-rule.test.mjs:41` and `focus-recipe.test.mjs:61` already list the
    picker file; `catchup-pictures.test.mjs` must stay green.
  - As Jerry, the Keeper of a people Catch-up: Settings, then Picture, pick a pool photograph, save,
    see the head and the list card change. Repeat as a member of a batch Catch-up (anyone may).
  - Check 390x844 and 1440, and screenshot both.
  - On the demo the pool works and uploads are refused by sentence (`actions.ts:814-816`).
- **Confidence**: high. What would change my mind: an owner line after 2026-09-09 withdrawing picture
  changes. There is none in handover.md, review-2026-09-09.md or catchups.md.
- **Notes**:
  - This is also a bug-audit item. I list it here because the simplification view of it (two knip
    "unused" hits) would otherwise invite a fixer to delete a locked feature.
  - Pairs with catchups-ui-30: the picker's drag loop is a copy of photo-aim's.

### catchups-ui-02 - Give the invite link a door again, or retire the invite subsystem (owner)
- **Where**:
  - What was deleted: the `InviteLink` component inside `home/people-panel.tsx`, removed in
    `b94677ce`. `git show b94677ce -- src/components/catchups/home/people-panel.tsx` shows
    `-{data.inviteToken && data.catchupStatus !== "ended" && ( <InviteLink token={data.inviteToken} />`
    and `-  const path = \`/catchups/join/${token}\`;`.
  - Still present, but only reachable through links shared before 2026-09-09:
    - the routes: `src/app/catchups/join/[token]/page.tsx` (185 lines),
      `src/app/catchups/join/[token]/loading.tsx` (83), `src/app/catchups/join/page.tsx` (47);
    - the code: `src/components/catchups/join/accept-invite.tsx` (71), `actions.ts:591-647`
      (`joinCatchupByToken`), `newInviteToken` and its `node:crypto` import in
      `src/lib/catchups-core.ts` (line 25 and ~84-97);
    - the data: the `CatchupSeries.inviteToken` column;
    - the plumbing: the public paths in `src/proxy.ts:37, 214-217, 293` and `src/lib/demo.ts:302`,
      and the C-204 tests in `src/lib/proxy-rule.test.mjs:112-127`;
    - `inviteToken` serialized into every member's home payload (`[catchupId]/(home)/page.tsx:414`,
      `home/types.ts:82-84`) and read by no component.
- **Phase**: placeholder
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**:
  - `grep -rn "catchups/join" src e2e scripts` finds only the join routes, proxy, demo, tests and a
    lab-audit comment. No component builds a join URL.
  - `grep inviteToken src/components` returns 0.
  - `flows.md:167` says "Invite someone | People dialog → copy link", and architecture §6 lists
    "invite by link" among the Catch-up's controls.
  - The phase-7 row in handover.md says the roster's "three verbs (add, remove, make a Keeper) came
    with it onto the People door" and never mentions the link.
  - The notes that say "the roster shows no invite link" (handover.md:3306, progress-2026-09.md:6001)
    are about BATCH Catch-ups, whose token is NULL on purpose.
- **What to do**: default is restore; the owner decides (see Owner decisions).
  - **Restore.** Add a "Copy invite link" control to `PeoplePanel` for `canManage` (the Keeper of an
    active people Catch-up), built from the token. Send `inviteToken` only when
    `isKeeper && !isBatch && status !== "ended"`; today every member's browser receives it. The old
    `InviteLink` at `b94677ce^` is the reference, about 25 lines.
  - **Retire.**
    - Delete the three join files, `AcceptInvite`, `joinCatchupByToken` and `newInviteToken`.
      Removing `newInviteToken` also removes `node:crypto` from the core and unblocks
      catchups-ui-20.
    - Delete the proxy and demo public-path entries, and the C-204 tests.
    - Remove the home's not-member "Join ..." copy.
    - A dated migration drops `inviteToken` after the deploy.
- **Saving**: restore: +~25 lines, and one fewer secret sent to non-Keepers. Retire: about −450 lines
  (315 route + 71 + ~45 action + ~15 core + proxy/test lines), 4 files, 1 column, 2 public paths.
- **Risk & gate**:
  - Restore: low. `people-search-rule.test.mjs`; open as a Keeper, copy, then open the link signed
    out with `npm run screenshot` (not `verify:shot`, which signs in; gotcha 4) and as a second
    account.
  - Retire: medium. Edit `proxy-rule.test.mjs` and `security-regressions.test.mjs` in the same commit.
- **Confidence**: high that no door exists; medium on intent, because there is no decision record
  either way.
- **Notes**:
  - The join page prints `catchup.group.name` (`[token]/page.tsx:133`) and the join toast says
    "You're in {groupName}" (`accept-invite.tsx:42`). A Catch-up renamed with `renameCatchup` invites
    people under its old group name. The list page fixed exactly this bug (`(index)/page.tsx:99-105`).
    For the bug lens.

### catchups-ui-03 - Make the on-hold card's "Start it again" start it again
- **Where**:
  - `src/components/catchups/home/catchup-home.tsx:189-199`:
    `<Button size="sm" className="mt-4" onClick={onChanged} data-resume>Start it again</Button>`.
  - `onChanged` is `refresh = () => router.refresh()`, at line 248.
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - `grep -rn "data-resume" src e2e scripts` finds only this line; nothing listens for it.
  - `git log -L` on the block shows it was born this way in `b94677ce`.
  - Architecture §5's region table makes "Start it again" the on-hold state's one primary action.
    The working resume is the settings row (`settings-surface.tsx:294-300`: key `"resume"`, then
    `confirm("resume")`, then `resumeCatchup`).
- **What to do**: route the button to the settings confirmation that already exists. Pass
  `onResume={() => s.panel.onOpen({ shape: "confirm", key: "resume" })}` from `CatchupHome` into
  `EditionRegion` and use it. `SettingsDialogs` is already mounted at line 323 on both widths.
  Drop `data-resume`.
- **Saving**: 0 lines. One dead Keeper control made live, one unused attribute gone.
- **Risk & gate**: low.
  - `catchup-lifecycle.test.mjs:117-135` pins `EditionRegion`'s ended, then paused, then answering
    order. Keep the function name and the order.
  - Pause a disposable Catch-up as its Keeper, press the card's button, confirm, and see the Edition
    region return, at 390 and 1440.
- **Confidence**: high.
- **Notes**: bug-lens item too. The confirmation copy is owner-reviewed (`confirmCopy` "resume").

### catchups-ui-04 - Load the home's settings, composer, roster and library on demand
- **Where**:
  - `catchup-home.tsx:63-75` statically imports `AnswerExperience`,
    `SettingsDialogs`/`SettingsPanel`/`useSettings`, `PeoplePanel` and `AskBox`/`AskedPanel`.
  - `home/collecting.tsx:160-168, 192-234`: `LibraryDialog`, always mounted inside `AskBox`.
  - `home/home-head.tsx:37`: `import { PictureDoor } from "@/components/catchups/settings/settings-surface"`.
  - `settings-surface.tsx:782-809` (`PictureDoor`) and `:811-950` (`useSettings`).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - `raw/route-bundle-stats.json`: `/catchups/[catchupId]` is 1,147.5 KB of uncompressed first-load
    JS, 3rd among shipped routes (after /feed 1,188.0 and /directory 1,168.7). That is 168.7 KB above
    the `(main)` floor (the two redirect routes, 978.8 KB).
  - Its route-only chunks, split at turbopack module boundaries:
    - `3rtn_s1dam7mc.js`, 43.8 KB, loaded only on this route: the settings module (~13.1 KB; strings
      "Every two weeks", "Cannot be undone"), attach-image-dialog (~2.7), photo-aim (~3.9), the
      downscaler and upload client (~2.9), and about 20 small icon modules.
    - `2m3okxzem0lk3.js`, 26.5 KB: one hoisted module holding the ask box, the composer and the
      roster.
    - `2wbtaw6h76x2l.js`, 16.7 KB: AlmostReady, the hoopoe, motion's `animate`, useUserSearch.
    - `11d8jg3d0flbf.js`, 17.9 KB: base-ui field and input.
  - When each piece is actually needed:
    - the composer renders only while `answering` (`catchup-home.tsx:221-229`);
    - settings and people only after a press;
    - the library only after "From the library".
  - `next/dynamic` has exactly one site in the whole territory (comments, `reader-parts.tsx:513-517`).
- **What to do**:
  - (1) Move `PictureDoor` (`settings-surface.tsx:782-809`) into `home-head.tsx`, its only shipped
    consumer. Update the lab import at `src/app/lab/catchups/capsule/_room.tsx:24` in the same commit.
    Without this, the head statically drags the whole settings module into first load.
  - (2) Split `settings-surface.tsx` (1,010 lines, the territory's biggest component):
    - `use-settings.ts` keeps the hook, eager: it is small and holds the optimistic name the head
      prints. While there, replace its three mirroring effects (`:839-841`,
      `useEffect(() => setCadence(c.cadence), [c.cadence])` and friends) with the render-time adjust
      that `catchup-shelf-view.tsx:130-135` already uses. That is one fewer stale paint.
    - `settings-panel.tsx` takes the rows, pills, confirm and edit bodies and `confirmCopy`, and is
      loaded lazily.
  - (3) Use `next/dynamic` in `catchup-home.tsx` for `AnswerExperience`, `SettingsPanel`,
    `SettingsDialogs` and `PeoplePanel`, and inside `collecting.tsx` for `LibraryDialog` (mount it
    only once opened).
    - Preload on the doors' pointer-enter and focus, the way `reader-parts.tsx:517` preloads
      comments.
    - Give the answering region a card-sized placeholder while its chunk arrives; the home's
      `loading.tsx` already draws that card.
- **Saving**: estimated 25-45 KB of uncompressed first-load JS on `/catchups/[catchupId]`: settings
  ~13-18, the composer's photo stack ~9-12 plus its share of the 26.5 KB hoisted module, roster and
  search ~3-5. Measure with a build; turbopack's re-split decides the exact number.
- **Risk & gate**: medium.
  - `npm run build`, then compare the route's `firstLoadUncompressedJsBytes` before and after.
  - `npm run check`: `extend-days-rule.test.mjs` reads `LONGER` in `settings-surface.tsx`; re-point
    it if the constant moves. `catchup-lifecycle.test.mjs` pins `EditionRegion`.
  - `npm run visual`.
  - Open the home in collecting, answering, published, paused and ended, at 390 and 1440, pressing
    both doors in each.
- **Confidence**: high on the direction, medium on the KB. A build showing turbopack already defers
  these would change my mind; the chunk list above says it does not.
- **Notes**:
  - Audit 2's catchups-03 was this same shape on files the rework deleted; the rebuild re-created it.
  - Keep `HomeHead` and `EditionCoverCard` static: both are on screen at rest.

### catchups-ui-05 - Stop building and shipping home fields no component reads
- **Where** (all in `[catchupId]/(home)/page.tsx` unless noted):
  - `:201-209`: a `catchupEntry.findMany({ distinct: ["authorId"] })` while answering, which fills
    `answeredAuthorIds`.
  - `:270-280`: `countdownLabel`, via `editionCountdownLabel`.
  - `:260-263`: `editionView.number`, `questionsCloseAt`, `answersCloseAt` and `publishedAt`.
  - `:243-255`: `HomePromptView.accepted`, `position`, `showAsker` and `category`.
  - `:414-420`: `inviteToken`, `groupId`, `groupName`, the top-level `cadence` and `nextOpensAt`.
  - `:424-435` and `:193`: `viewer.name` and `viewerName`, `viewer.canChangePicture`,
    `viewer.reminderMode`. The same values also travel on `settings`.
  - `:123`: the not-member result's `groupId`.
  - The matching type fields in `home/types.ts:45-144`.
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - A per-field grep over `src/components/catchups/**`, excluding the type files: `inviteToken` 0,
    `groupId` 0, `nextOpensAt` 0, `countdownLabel` 0, `answeredAuthorIds` 0, `questionsCloseAt` 0,
    `accepted` 0, `category` 0.
  - Of `viewer`, only `id` and `isKeeper` are read (`catchup-home.tsx:193, 214, 287, 292`), and
    `data.cadence` is never read.
  - `answer-experience.tsx:36-41` records that the "N people have answered so far" line and its birds
    were deleted, which was the only reader of `answeredAuthorIds`.
- **What to do**:
  - Delete the `distinct` query.
  - Trim `HomeEditionView` to `{ id, status, prompts }`, and `HomePromptView` to
    `{ id, text, isOwn, author }`.
  - Remove `inviteToken` (unless catchups-ui-02 restores the link; then send it to Keepers only),
    `groupId`, `groupName`, the top-level `cadence` and `nextOpensAt`.
  - Reduce `viewer` to `{ id, isKeeper }`, and drop `groupId` from the not-member variant.
  - Drop the `editionCountdownLabel` import, and tell the lib lens whether it has callers left.
  - Update `home/types.ts` in the same commit.
- **Saving**:
  - Queries: −1 per home render while answering.
  - Lines: about 45 (page ~25, types ~20).
  - Payload: roughly 0.3-0.5 KB of JSON off every home render and every post-action refresh.
- **Risk & gate**: low. tsc points at any stray reader. Run `npm run check` and open the home in all
  five states.
- **Confidence**: high. A consumer of `CatchupHomeData` outside `src/components/catchups` would
  change my mind; grep found none, and the lab has its own shapes.
- **Notes**: `promptLibrary` is the one heavy field that IS read (`collecting.tsx`). Removing it
  needs catchups-10 first; see catchups-ui-20.

### catchups-ui-06 - Let the Keeper's early close and early open go through the engine's own transition
- **Where**:
  - `actions.ts:1322-1443`, `closeAndPublish`: the too-few extension (`:1341-1366`), the seal
    (`:1368-1402`) and the publish (`:1404-1441`).
  - `actions.ts:1252-1310`, `openAnswering`: its compare-and-swap plus notification, `:1271-1301`.
  - The engine: `src/lib/catchups.ts:137-215`, `applyEditionAction` (private). It handles
    `transition` (a compare-and-swap on `status: action.from` plus `requires`, then `nextOpensAt`,
    then `notifyPublished`, `notifySealed` or `notifyAnswersOpen`), `extend` (a compare-and-swap on
    `remindersSent`, then `notifyAnswersOpen({ onlyNonAnswerers: true })`), `extend-questions` and
    `reminder`.
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - jscpd: `actions.ts [1378:23-1387:14] ↔ [1418:20-1427:12]`, the seal and publish transactions.
  - The action says so itself at `:1404-1405`: "exactly as the clock's own `applyEditionAction` does
    it".
  - Read side by side, `closeAndPublish`'s three branches are the engine's `extend` and `transition`
    retyped. The only difference is `excludeUserId: session.user.id`, so the Keeper is not told about
    their own act.
  - Phase 14 (`76aac5ac`) had to add the capsule path in both places.
- **What to do**:
  - Export a narrow engine entry from `lib/catchups.ts`, e.g.
    `applyKeeperClose(edition, entryCount, now, { excludeUserId })`. It builds the same
    `EditionAction` the clock would: extend if `shouldExtendForTooFew`, seal if `timeCapsule`,
    otherwise publish.
  - It calls `applyEditionAction` with an optional `excludeUserId` threaded through `meta` into the
    notify calls.
  - `closeAndPublish` keeps its gates (`loadKeeperEdition`, the status check) and maps the result to
    its three return shapes and revalidations.
  - Do the same for `openAnswering`'s transition. Keep its in-transaction empty-Edition count (C-021),
    either inside the engine call's transaction or as a precondition.
- **Saving**: about 60-80 lines of `actions.ts`. Three near-copies of the clock's close become none,
  and "the Keeper's early close is the clock's close" becomes structural rather than a comment.
- **Risk & gate**: medium-high, because this path publishes and notifies.
  - `time-capsule-rule.test.mjs` reads `closeAndPublish`'s body (the `timeCapsule: false` guard on
    the publish write); move those pins onto the engine function.
  - `catchup-lifecycle.test.mjs` (the B-061 frozen refusals) and `catchups-core.test.mjs`.
  - On a disposable people Catch-up, never "in the loop":
    - close early with zero answers: it extends, and non-answerers get one bell each;
    - close with answers: it publishes, one bell per member, the Keeper excluded;
    - close a capsule: it seals.
- **Confidence**: medium. A behavioural difference between the action's and the engine's write
  conditions would change my mind; read both `where`s line by line first.
- **Notes**: the biggest honest line cut in `actions.ts` that is not a feature decision.

### catchups-ui-07 - Collapse the composer to the one he approved: no song field, three photographs on a wall question
- **Where**:
  - `answer/answer-card.tsx:104-138`, the kind switch:
    - `text` gets `RichTextArea` + `PhotoAttachments`;
    - `photo` gets `PhotoAttachments … max={1}`;
    - `songs` gets `SongNameField`.
  - `answer/song-attachment.tsx:1-65`.
  - `answer/photo-attachments.tsx:7-10, 31-35, 56-57, 61-64, 96-102, 143-146`: `max`, `single`, the
    plate sizes and the single-photo copy.
  - `answer/types.ts:4-8, 21-25`, and `[catchupId]/(home)/page.tsx:391-393` (`kind` for the
    composer).
- **Phase**: placeholder
- **Tier**: T3     **Class**: structural     **Decides**: owner
- **Evidence**:
  - spec.md §10.1, LOCKED 2026-09-09, says both things outright:
    - "The song field is deleted, not drawn ... there is one writing box";
    - "The photo-wall answering control is the photo strip, UNCHANGED ... *'cap photo wall also at 3
      each'*".
  - `docs/spec/catchups.md` §10.2 agrees: "The cap is the ordinary three per answer".
  - The approved drawing (`src/app/lab/catchups/sketches/_home.tsx:603-760`) has one `Textarea` plus
    `Attachments` capped at `PHOTO_CAP` for every kind.
  - The shipped card caps a wall answer at ONE. The shipped reader (`photo-run.tsx:38-41`) says "THE
    CAP IS THREE ... the photo strip already in the composer is the whole of it".
  - Zero `photo-wall` prompts exist live (handover phase-8 row), so no member has been affected yet.
- **What to do**:
  - `AnswerCard` renders the writing box plus `<PhotoAttachments images onChange />` for every kind.
  - Delete `song-attachment.tsx`.
  - Delete `max`, `single` and the single-plate branches, so `PhotoAttachments` has one shape.
  - Drop `kind` from `AnswerPromptData` and the loader's `promptKind` call. Say in the commit that the
    vote and voice kinds will reintroduce a branch when he picks them.
- **Saving**: −1 file (65 lines) and about −25 lines across answer-card, photo-attachments and
  types. Three composer shapes become one, and the wall cap matches the server's three.
- **Risk & gate**: medium (member-visible).
  - `npm run check`: `upload-size-rule.test.mjs` lists `photo-attachments.tsx`; keep its upload path.
  - Answer a songs-category question and a photo-wall question on a disposable Catch-up, desktop and
    390.
- **Confidence**: high on the spec; medium on whether he still wants a one-line song box for the
  songs set. `library-draft.md` is his to cut.
- **Notes**: the TODO in `song-attachment.tsx` proposing a `CatchupEntry.songs` column is explicitly
  overruled in catchups.md §15. See Owner decision 4.

### catchups-ui-08 - Take the dead Spotify pipeline out of submitEntry before its columns go
- **Where** (`actions.ts`):
  - the file header, `:31-33`, and the import at `:88` (`resolveSpotify`);
  - the schema, `:199` (`songUrl` in `submitEntrySchema`);
  - the docblock, `:1682-1690`, and the input type, `:1695`;
  - the logic: `:1734` (`hasSong`), `:1745` (`sendsSong`) and `:1796-1810` (`songPatch` and the
    `resolveSpotify` call);
  - the writes: `:1843` (`songUrl` in `columns`) and `:1901-1903` (the create);
  - the tail: `:1955` (`!entry.songUrl` in the empty-row test) and `:1959, :1975` (`songWarning`).
  - The engine half is for the lib lens: `resolveSpotify` in `src/lib/catchups-core.ts`
    (~1315-1391).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: owner
- **Evidence**:
  - No client sends `songUrl`: across components the only hit is a comment in
    `song-attachment.tsx`.
  - Spec §16 counts "0 rows carry one", and audit 2's catchups-01 made the same case.
  - The spec bundles this code with the column drop "for a release that is the owner's". But spec §3's
    own ordering rule makes code-first the SAFE order. Dropping a column the running code still reads
    breaks production; removing the code first breaks nothing.
- **What to do**:
  - Remove the listed lines. The empty-row test becomes
    `!entry.body && !entry.images && !entry.audioUrl && !entry.pollOptionId`.
  - `decideVoteAnswer` loses `sendsSong` (vote-question-rule lens).
  - **Re-pin `catchup-lifecycle.test.mjs:204-212`.** Its
    `body.indexOf("resolveSpotify") < body.indexOf("catchupEdition.count")` would become `-1 < n` and
    pass vacuously. Rewrite it against a surviving anchor or delete that one assertion.
  - Leave `schema.prisma` and the export's `songUrl` select for the drop commit.
- **Saving**: about 45 lines of `actions.ts`, plus about 75 of `resolveSpotify` (lib lens), and one
  outbound network path gone.
- **Risk & gate**: low for the code half.
  - `npm run check`, watching `catchup-lifecycle.test.mjs` and `vote-question-rule.test.mjs`.
  - Answer with text and a photo on a disposable Catch-up.
- **Confidence**: high.
- **Notes**: Owner decision 6. This is the code half of audit-2 catchups-01.

### catchups-ui-09 - Move the two permanent redirects into next.config.ts
- **Where**:
  - `src/app/(main)/catchups/[catchupId]/answer/page.tsx` (35 lines,
    `permanentRedirect(\`/catchups/${catchupId}\`)`).
  - `src/app/(main)/catchups/round/[editionId]/page.tsx` (30 lines, to
    `/catchups/edition/${editionId}`).
  - `next.config.ts`, which has no `redirects()` today.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - Both pages sit in `(main)`, so every old-link hit first runs the signed-in layout (auth, the
    notification count, the `hasCatchup` findFirst and `advanceDueCatchups`, `(main)/layout.tsx:84-99`)
    before the 308.
  - `raw/build.txt:72, 77` lists both as dynamic server functions.
  - No test reads either file (grep).
- **What to do**:
  - Add `async redirects() { return [{ source: "/catchups/round/:editionId", destination: "/catchups/edition/:editionId", permanent: true }, { source: "/catchups/:catchupId/answer", destination: "/catchups/:catchupId", permanent: true }]; }`.
    Next answers `permanent: true` with a 308.
  - Carry each file's one-paragraph reason as a comment there, then delete both page folders.
  - `src/lib/page-label.ts:34, 41` keeps a label for `/catchups/:id/answer`; the admin-analytics lens
    decides whether history needs it.
- **Saving**: −2 route files (−65 lines, mostly comments; about +12 in config) and −2 server functions
  in the build. An old-link hit costs 0 DB queries instead of the whole `(main)` layout.
- **Risk & gate**: low.
  - Config redirects run before `proxy.ts`, so a signed-out old link now redirects first and then
    meets the login gate on the new path. The end state is the same.
  - Check with `curl -sI <your own dev server>/catchups/round/x`: expect a 308 to
    `/catchups/edition/x`.
- **Confidence**: high.

### catchups-ui-10 - Delete answer-redirect.tsx
- **Where**: `src/components/catchups/answer/answer-redirect.tsx:1-29` (`AnswerRedirect`, a
  client-side toast and `router.replace`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - knip lists it as an unused file; madge-orphans-filtered and depcruise (no-orphans) agree.
  - `git show b94677ce -- "src/app/(main)/catchups/[catchupId]/answer/page.tsx"` removes its only
    import (`-import { AnswerRedirect } from "@/components/catchups/answer/answer-redirect";`) when
    the route became a server 308.
  - It carries the territory's only `react-hooks/exhaustive-deps` disable (`raw/type-sludge.txt`).
- **What to do**: `git rm` it. The server page's own default export is also named `AnswerRedirect`
  (`answer/page.tsx:28`); that one is unrelated.
- **Saving**: −1 file, −29 lines, −1 eslint-disable.
- **Risk & gate**: nil; `npm run check`.
- **Confidence**: high.

### catchups-ui-11 - /catchups/new: delete the missing-table branch that cannot fire
- **Where**: `src/app/(main)/catchups/new/page.tsx:42-81` (`tableMissing`, the try/catch around
  `prisma.user.findUnique`, the `AlmostReady` return), and the imports at `:4-5` and `:8`
  (`isMissingCatchupTable`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - The only query inside the `try` reads `User`.
  - `isMissingCatchupTable` is `isMissingTable(err, /Catchup/)` (`src/lib/prisma-errors.ts:50-57`),
    which is true for ANY P2021/42P01 whatever the table. So the branch could only fire if `User` were
    missing.
  - But `auth()` at line 39, outside the `try`, reads the member's row first (credentialVersion,
    AGENTS.md), and would already have thrown.
  - This page reads no Catch-ups table at all. The `?group=` queries went on 2026-08-21, per the page's
    own docblock at `:29-36`.
- **What to do**: keep the `me` fallback, since a null `viewer` is still possible mid-session. Delete
  the try/catch, `tableMissing`, the `AlmostReady` return and both imports.
- **Saving**:
  - About −20 lines.
  - `AlmostReady` (≈2.7 KB) leaves `/catchups/new`'s client graph. It is that route's only reason to
    load `ResidentHoopoe`, `useHoopoeLife` and motion's imperative `animate`: ≈8 KB more in chunk
    `2wbtaw6h76x2l.js`, which the home shares. Measure.
- **Risk & gate**: low. `npm run check`; open `/catchups/new` at 390 and 1440.
- **Confidence**: high.

### catchups-ui-12 - Load the "almost ready" holding scene only when it is shown
- **Where**: `src/components/catchups/almost-ready.tsx`, a 125-line client component
  (`ResidentHoopoe`, `useSoloHoopoe`, `FadeRise`). Static imports at `(index)/page.tsx:8`,
  `[catchupId]/(home)/page.tsx:7` and `edition/[editionId]/page.tsx:36`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - The string "Catch-ups are almost ready" is in the first-load chunk of all four Catch-ups routes:
    `0ob8-qo_th8qs.js` (/catchups), `2wbtaw6h76x2l.js` (home and new) and `0hxfms4bl_p2r.js`
    (reader).
  - On the reader nothing else uses the hoopoe; no `edition/` file imports a mascot. The module split
    of `0hxfms4bl_p2r.js` shows AlmostReady 2,680 B, ResidentHoopoe 256 B, useHoopoeLife 1,057 B and
    motion `animate` 6,718 + 679 B.
  - The scene renders only on P2021, a deploy-ordering moment.
- **What to do**: at the three call sites,
  `const AlmostReady = dynamic(() => import("@/components/catchups/almost-ready").then((m) => m.AlmostReady))`.
  A server component may do this: the client chunk is split out and fetched only when rendered. Keep
  the guard itself (see Not-findings).
- **Saving**: the reader loses at least 4 KB of uncompressed first-load JS, about 11 KB if motion's
  `animate` has no other user there (measure). The list and the home lose about 2.7 KB each; the
  hoopoe stays there for `NothingHere` and `CompletionCard`.
- **Risk & gate**: low. Rebuild and compare `route-bundle-stats`. The scene itself needs a missing
  table to render, so rely on tsc plus one render with the table name temporarily misspelled on a
  scratch branch.
- **Confidence**: high on direction, medium on bytes.

### catchups-ui-13 - Reader: let generateMetadata share the page's two reads
- **Where**: `edition/[editionId]/page.tsx`:
  - `:103-132`: `generateMetadata`, with its own `catchupEdition.findUnique` and `loadMembership`;
  - `:76-81`: `loadEditionBase`;
  - `:96-101`: `loadMembership`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - Both functions run on the same request.
  - The home already solved this: `const loadCatchup = cache(...)` (home page.tsx:54-98, "React's
    cache() collapses that into the read `loadHome` was going to do anyway").
  - The reader never adopted it, so every reader load reads its Edition three times (metadata, base,
    reload) and the viewer's membership twice.
- **What to do**:
  - Make `loadEditionBase` a `cache()`d function keyed on the id, and add a `cache()`d
    `loadMembership(groupId, userId)`.
  - `generateMetadata` calls both and takes the title from `LIGHT_EDITION_SELECT`'s `catchup.title`
    and `group.name`, which that select already carries.
  - The post-advance reload stays uncached: it must see the new state.
- **Saving**: −2 queries per reader load, the most-read Catch-ups page. About 2-5 ms at bom1 to the
  Mumbai database.
- **Risk & gate**: low.
  - `time-capsule-rule.test.mjs` asserts the reader's gate order; keep `loadMembership` before
    `advanceAndReload`.
  - Open a published Edition, a collecting one (NotYetPublished) and a non-member's link (404).
- **Confidence**: high.

### catchups-ui-14 - Home: read the viewer's membership from the roster it already loaded
- **Where**: `[catchupId]/(home)/page.tsx`:
  - `:119-123`: `prisma.groupMember.findUnique` for the viewer's role, after `loadCatchup` (`:58-98`)
    has already selected every member's `role` and `user.id`;
  - `:360-363`: `catchupPref.findUnique`, run sequentially.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - `catchup.group.members` holds `{ role, user }` for every member, so the viewer's row is in it
    exactly when they are a member.
  - Today the page makes 7 sequential Prisma calls at rest and 9 while answering.
- **What to do**:
  - `const me = catchup.group.members.find((m) => m.user.id === viewerId); if (!me) return { kind: "not-member", groupName: catchup.group.name };`
    then use `me.role`.
  - Run the `pref` read in a `Promise.all` with `publishedEditions`; neither depends on the other.
- **Saving**: −1 query and −1 sequential round trip per home render. With catchups-ui-05 applied too,
  the home goes from 7 to 5 round trips at rest and from 9 to 6 while answering.
- **Risk & gate**: low. Open the home as a member and as a non-member (NotAvailableCard).
- **Confidence**: high.
- **Notes**: the whole roster (every member's identity) is loaded on every home render for a dialog
  behind a press. Lazy-loading it would slow the People door, and at today's sizes (largest group 39)
  I would not do it.

### catchups-ui-15 - /catchups runs the layout's advanceDueCatchups a second time, concurrently
- **Where**:
  - `(index)/page.tsx:78-81`: `await advanceDueCatchups(userId)` at the top of `loadIndexData`.
  - `(main)/layout.tsx:84-99`: the same call inside the layout's `Promise.all`.
  - `src/lib/catchups.ts:436-535`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - Layout and page render concurrently in one request, so `/catchups` issues the scoped
    `catchup.findMany` (with its `group` and `editions` includes) twice per load.
  - The page's call is the one that guarantees its own reads see the advance, so it cannot simply be
    deleted.
- **What to do**: export a request-memoised wrapper from `lib/catchups.ts`, e.g.
  `export const advanceDueCatchupsFor = cache((userId: string) => advanceDueCatchups(userId))`.
  The layout and this page both call it; the second caller awaits the first's promise. The
  catchups-lib lens owns the helper.
- **Saving**: −1 findMany (plus its include statements) per `/catchups` load.
- **Risk & gate**: low. `batch-catchups.test.mjs` and `time-capsule-rule.test.mjs` read
  `advanceDueCatchups`'s body, which a wrapper does not change. Open `/catchups` as Jerry and check
  the server log shows one advance.
- **Confidence**: high on the double call; medium that React `cache` spans layout and page here. It
  should: one request, one React render.

### catchups-ui-16 - Write the Edition-cover photo loader once
- **Where**:
  - `(index)/page.tsx:198-224` and `[catchupId]/(home)/page.tsx:300-324` carry the same code: a
    `Promise.all` of `catchupEntry.findMany({ where: { editionId: { in }, images: { not: null } }, orderBy: { createdAt: "asc" }, select: { editionId, images } })`
    and `readEditionIds(...)`, then the same `photosByEdition` fold capped at `COVER_SHOTS`.
  - The two pages also build `ListEdition` the same way (`index:226-242`, `home:327-338`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - jscpd: `(index)/page.tsx [208:28-216:22] ↔ (home)/page.tsx [308:29-316:20]` and
    `[216:28-224:6] ↔ [316:28-324:4]`.
  - The comment above each copy is the same paragraph twice.
  - pg_stat_statements [8] (`CatchupEntry id, editionId, images … IN ($1) AND images IS NOT NULL ORDER BY createdAt`,
    576 calls) returns about 20 rows per call to keep three urls.
- **What to do**:
  - Add `loadEditionCovers(viewerId, editions, fallbackFor)` returning `ListEdition[]`, in
    `src/lib/catchup-reads.ts` or `catchup-shelf.ts`; both pages call it.
  - Optionally bound the read per Edition with `take: COVER_SHOTS`. Each entry holds at most three
    photos, so three rows always suffice.
- **Saving**: about −15 lines net and 2 clones gone. With the bound, about −17 rows per cover read.
- **Risk & gate**: low. `npm run visual` (`/catchups` is a baseline); a home with back numbers.
- **Confidence**: high.

### catchups-ui-17 - Spell the Edition's clock columns once
- **Where**:
  - `actions.ts:268-287`: `EDITION_COLUMNS`, which is `id`, `catchupId`, `number` and `sealedAt`
    plus the seven `EDITION_TIMING_SELECT` fields typed out.
  - `edition/[editionId]/page.tsx:43-65`: `LIGHT_EDITION_SELECT`, the same seven typed out.
  - `[catchupId]/(home)/page.tsx:84-94`: the editions select, the same seven plus an unread
    `createdAt: true` at `:93`.
  - `[catchupId]/(home)/page.tsx:135-150`: `advanceInput`, rebuilt field by field.
  - The source of truth: `src/lib/catchups.ts:77-85`, `EDITION_TIMING_SELECT`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - `EDITION_TIMING_SELECT` exists so every reader of an Edition "selects exactly the same set"
    (audit-2 catchups-09).
  - Phase 14 (`76aac5ac`) had to add `timeCapsule` and `publishAt` at all four sites.
  - `latestRaw.createdAt` is read nowhere (grep).
- **What to do**:
  - `EDITION_COLUMNS` becomes `{ id: true, catchupId: true, number: true, sealedAt: true, ...EDITION_TIMING_SELECT }`.
  - The reader's becomes `{ id: true, catchupId: true, number: true, ...EDITION_TIMING_SELECT, catchup: {...} }`.
  - The home's becomes `{ id: true, ...EDITION_TIMING_SELECT }`.
  - Replace the home's advance input with `{ ...latestRaw, catchupId: catchup.id, catchup: {...} } as AdvanceEditionInput`,
    as the reader already does (`base as AdvanceEditionInput`).
- **Saving**: about −30 lines and 3 clones gone. The next clock column is one edit, not four.
- **Risk & gate**: low. Check `time-capsule-rule.test.mjs`'s regexes before moving anything: some
  assert that a select contains `timeCapsule`, and the literal will now live in lib.
- **Confidence**: high.

### catchups-ui-18 - One membership lookup
- **Where**:
  - `actions.ts:241-246` (`loadMembership`) and `edition/[editionId]/page.tsx:96-101` (the identical
    function).
  - `[catchupId]/(home)/page.tsx:119-122` (inline; catchups-ui-14 removes it).
  - `src/app/catchups/join/[token]/page.tsx:101-104` (inline, selecting `id`).
  - Outside the territory: `src/lib/post-visibility.ts` `isMemberOf`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: audit-2 catchups-09 (parked) counted five copies. The answer page's copy died with
  its redirect, leaving four in the territory, three once catchups-ui-14 lands.
- **What to do**: export `loadGroupMembership(groupId, userId)` (selecting `role`) from
  `src/lib/catchups.ts`; `actions.ts` and the two pages import it.
- **Saving**: 0 lines (the house rule on docblocks); 3 clones gone.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.

### catchups-ui-19 - One join shell and one refusal card
- **Where**:
  - `src/app/catchups/join/page.tsx:26-45`: a shell and a refusal card.
  - `src/app/catchups/join/[token]/page.tsx:80-96` (refusal) and `:170-185` (`Shell`).
  - `src/app/catchups/join/[token]/loading.tsx:22-29`: the shell again.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - Audit-2 catchups-08, unchanged since: the same nine-line
    `min-h-screen … Wordmark … card-elevated w-full max-w-[420px]` block in three files.
  - The C-020 pin that constrained `[token]/page.tsx` in audit 2 now asserts an ABSENCE
    (`catchup-lifecycle.test.mjs:256-261`), so extraction is freer than it was.
- **What to do**: create `src/app/catchups/join/_shell.tsx` exporting `JoinShell` and
  `JoinRefusal({ title, body })`, and use them in all three files. Keep the loading skeleton's measured
  line boxes.
- **Saving**: about −25 lines. Three shells become one; two refusal cards become one.
- **Risk & gate**: low. `proxy-rule.test.mjs` asserts the join files exist. Screenshot `/catchups/join`
  and `/catchups/join/0000…dead` signed out with `npm run screenshot`.
- **Confidence**: high.
- **Notes**: this falls away entirely if the owner retires invites (catchups-ui-02).

### catchups-ui-20 - Finish audit 2's catchups-02: one spelling of the cadence, reminder and notification lists, and no library in the payload
- **Where**:
  - Retyped lists in `actions.ts`: `:128-129` (`CADENCE_VALUES`, `REMINDER_MODE_VALUES`) and
    `:2280-2294` (`CATCHUP_NOTIFICATION_TYPES`).
  - The cadence control: `create/cadence-control.tsx:12-17` (a stale reason), `:25` (`OPTIONS`) and
    `:34` (the `labels` prop).
  - The create form's drill: `create/create-catchup-form.tsx:19-22` (stale reason), `:38, 42, 155`
    (`cadenceLabels`), fed from `new/page.tsx:8, 97`.
  - `settings/settings-surface.tsx:167-177`: the values of `RHYTHMS` and `REMINDERS`. Their labels
    stay; they are owner copy.
  - The library drill: `[catchupId]/(home)/page.tsx:22, 476` (`promptLibrary`), then
    `home/types.ts:137-138`, then `catchup-home.tsx:208`, then `collecting.tsx:65-70, 160-163,
    192-201`.
  - The prerequisite: `src/lib/catchups-core.ts:25`, `import { randomUUID } from "node:crypto"`
    (audit-2 catchups-10, still open).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - Audit 2's fix-prompt parked catchups-02 because "a peer session is rebuilding Catch-ups".
  - The rebuild deleted three of the files it named, but:
    - re-created the library drill: 56 source lines, about 2 KB of question text, re-sent on every
      home render and every post-action refresh;
    - added a fifth cadence spelling, `RHYTHMS`.
  - The two stale docblocks blame Prisma. The real blocker is `node:crypto` in the client-safe core.
- **What to do**:
  - First catchups-10: move `newInviteToken` into the server-only engine, or delete it if invites
    retire.
  - Then add `CADENCES`, `REMINDER_MODES` and `CATCHUP_NOTIFY_KINDS` arrays in `catchups-types.ts`,
    in the `PROMPT_CATEGORIES` pattern, feeding the unions, the Zod enums, `OPTIONS` and the values of
    `RHYTHMS`/`REMINDERS`.
  - `LibraryDialog` imports `CATCHUP_PROMPT_SETS` itself, and the `promptLibrary`/`library` props go.
  - `CadenceControl` imports `CADENCE_LABELS`.
  - Delete the two stale docblock paragraphs.
- **Saving**: about −30 lines. Cadence goes from 5 spellings to 1, reminders from 3 to 1, notify kinds
  from 2 to 1. About 2 KB comes off every home RSC render and moves into a cached client chunk, which
  is lazy once catchups-ui-04 lands.
- **Risk & gate**: low. `npm run check` (`extend-days-rule.test.mjs` and `catchups-core.test.mjs`
  import these lists); open `/catchups/new`, the library dialog and settings.
- **Confidence**: high.

### catchups-ui-21 - Retire the "pending question" machinery nothing can produce
- **Where**:
  - The home: `[catchupId]/(home)/page.tsx:211-236` (the non-Keeper `promptPool` filter, the `pending`
    partition and its sort), `:247` (`accepted` on `HomePromptView`), and `home/types.ts:40-55`.
  - `actions.ts:1083, 1099, 1157, 1167, 1207-1216, 1718`: the `accepted: true` filters and writes.
  - `src/app/(main)/admin/catchups/[catchupId]/page.tsx:98, 121, 229-232` (T06's).
  - `prisma/schema.prisma:1220` (`accepted Boolean @default(false)`).
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - The only two writers of `CatchupPrompt` both write `accepted: true` (`actions.ts:1099`,
    `src/lib/demo-seed/seed.ts:428`).
  - A grep for `accepted: false` finds nothing, and the schema default of `false` is never used.
  - `curatePrompt`'s docblock (`:1180-1186`) records "zero pending ones"; the approval step went on
    2026-08-05.
- **What to do**:
  - Now: delete the `pending` partition and the non-Keeper filter, which can only remove rows that do
    not exist. Drop `accepted` from `HomePromptView`. Keep `accepted: true` in the `where` clauses
    until the column goes; it is harmless.
  - At the owner's next release: a dated migration drops the column, and the `where`s go with it.
- **Saving**: about −15 lines now; later −1 column and about −8 lines.
- **Risk & gate**: low. First run on the live database:
  `SELECT count(*) FROM "CatchupPrompt" WHERE accepted = false;` (expect 0). Then open a collecting
  home as the Keeper and as a member.
- **Confidence**: high.

### catchups-ui-22 - Delete catchupSurfaceTitle, as he already decided
- **Where**: `edition/[editionId]/page.tsx:30, 127, 173`; `src/lib/catchups-core.ts:424-429`;
  `src/lib/catchups-core.test.mjs:616-618`.
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - spec.md §6 "What is deleted" lists "the `-catch-up` suffix in `catchupSurfaceTitle`".
  - §7 says "'In the loop', not 'In the loop catch-up' (¶25)", and catchups.md §15 lists it as a known
    disagreement between code and plan.
  - Its only consumer is the reader page: the tab title and the NotYetPublished eyebrow.
- **What to do**:
  - Use `catchupDisplayName` at both call sites, and delete the helper and its three test lines.
  - Correct `catchupDisplayName`'s docblock ("no 'catch-up' appended, because the page around it has
    already said so") to the general rule.
  - Quote spec.md §6 in the commit.
- **Saving**: −1 exported helper, about −12 lines; one naming rule instead of two.
- **Risk & gate**: low. Member-visible: a Catch-up with no title of its own loses " catch-up" in its
  reader tab. `npm run check`.
- **Confidence**: high.

### catchups-ui-23 - Remove dead exports and constants
- **Where**:
  - `home/home-head.tsx:40-41`: `HEAD_HEIGHT_PHONE` and `HEAD_HEIGHT` have zero consumers; the classes
    at `:59` are literals.
  - `export` on three functions used only in their own files: `settings-surface.tsx:357`
    (`settingsGroups`), `:711` (`confirmCopy`) and `edition/reader.tsx:114` (`RAIL_MIN_WINDOW`).
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**:
  - knip unused exports, `raw/knip-repo-plus-lab.txt:101-105`.
  - `grep -rn "HEAD_HEIGHT\|RAIL_MIN_WINDOW"` across the whole repo (tests and lab included) finds only
    the definitions.
  - The lab has its own `settingsGroups` and `confirmCopy` in `_settings.tsx`.
- **What to do**: delete the two constants; the docblock above them already carries the 172 and 240
  reasoning. Drop the three `export` keywords.
- **Saving**: −2 lines, −3 exports.
- **Risk & gate**: nil. `reader-geometry.test.mjs` reads reader constants by a `const NAME = N` regex,
  and `RAIL_MIN_WINDOW` is not one of the names it reads.
- **Confidence**: high.

### catchups-ui-24 - Drop options every caller leaves at their default
- **Where**:
  - `create/people-picker.tsx:64, 74-81, 241, 252`: `canRemove`. There is one caller, it never passes
    the prop, and the docblock justifies it with an "edit surface" that does not exist.
  - `edition/reader-parts.tsx`: `:74` (`Byline size = 40`), `:76` (`Byline className`), `:195`
    (`AskedBy className`), `:423` (`LinkCard className`), `:521-522` (`Reactions viewerIsAdmin = false`
    and `className`).
  - `edition/navigator.tsx`: `:93-94, 101-102` (`Strip`'s optional `open`/`onToggle`, always passed)
    and `:354, 363, 388` (`QuestionList className`).
  - `people-picker.tsx:183-190, 225-232, 242-249`: three hand-built
    `{ id, name, photoUrl, birdOverride }` objects where `user={person}` suffices, because `BirdAvatar`
    takes the structural `AvatarUser`.
- **Phase**: placeholder
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each of these components has exactly one call site
  (`grep "<Byline\|<Reactions\|<AskedBy\|<LinkCard\|<Strip\|<PeoplePicker"`), and none of those calls
  passes the option.
- **What to do**: delete the props and their docblocks, and pass `person` and `me` straight to
  `BirdAvatar`.
- **Saving**: about −40 lines.
- **Risk & gate**: nil. `npm run check`.
- **Confidence**: high.

### catchups-ui-25 - One small row button, and one dialog-or-sheet frame
- **Where**:
  - `RowButton`, twice: `home/collecting.tsx:385-414` and `home/people-door.tsx:143-178`. Same
    `rounded-md p-1.5 … active:scale-95 disabled:opacity-30` recipe and destructive variant;
    people-door adds a `title` and a hover reveal.
  - The laptop-dialog / phone-sheet switch at `people-door.tsx:323-347` and `catchup-home.tsx:299-322`.
    A third copy lives outside the territory, in `src/components/profile/house-chain-editor.tsx:94,
    302-312`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: read side by side. Both dialogs repeat
  `DialogContent initialFocus={panel} ref={panel} tabIndex={-1}` with the same comment about Base UI
  focusing the first child. `Button`'s smallest icon size is `icon-sm` (36px), too big for a 26px row
  control, so no existing primitive fits.
- **What to do**: move `RowButton` into one file (`home/row-button.tsx`, with a `reveal` flag), and add
  a `ResponsiveDialog({ open, onOpenChange, title, phone, children })` in `src/components/ui/` that
  owns the `initialFocus` fix. The common-primitives lens decides where it lives.
- **Saving**: about −25 lines here, −35 with the profile copy. 2 clones gone and the focus fix in one
  place.
- **Risk & gate**: low. The People door and Settings at 390 and 1440, including keyboard focus on
  open.
- **Confidence**: high.

### catchups-ui-26 - Import the three constants that are re-typed beside the file that exports them
- **Where**:
  - `home/home-head.tsx:79`:
    `<span aria-hidden className="absolute inset-0" style={{ background: PICTURE_SCRIM }} />` is
    exactly `CardScrim()` in `index/picture-door.tsx:123-125`, and its own comment says "The list
    card's fade, exactly".
  - `home/catchup-home.tsx:137`: `aspect-[16/9] min-[500px]:aspect-[5/2]` is `CARD_FRAME`
    (`picture-door.tsx:50`), whose docblock says both card types import it "so [they] can never
    drift".
  - The label class `text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground` at
    `create/create-catchup-form.tsx:126, 146, 153`, and `new/loading.tsx:76` (`LABEL`).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each literal compared against its export.
- **What to do**: import `CardScrim` and `CARD_FRAME`; export one `FIELD_LABEL` from the form and use it
  in the loading file too.
- **Saving**: about −4 lines; 3 drift points closed.
- **Risk & gate**: nil. `npm run visual`.
- **Confidence**: high.

### catchups-ui-27 - Give the reader's skeleton the reader's own classes
- **Where**: `edition/[editionId]/loading.tsx` retypes four class strings from the reader:
  - `:38` is `reader.tsx:631`'s grid, verbatim;
  - `:39` is `:632`'s column;
  - `:53` is `:701`'s padding;
  - `:40` (`max-md:h-16`) is `:653`, and the `space-y-[60px] md:space-y-[72px]` matches `:716`.
  `reader-geometry.test.mjs` pins `reader.tsx` and `navigator.tsx` but not the skeleton.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - The skeleton cannot import from `reader.tsx`: a `"use client"` module's exports reach a server
    component as client references.
  - The list page already solved this by exporting class strings from a non-client module:
    `picture-door.tsx` into `(index)/loading.tsx`.
- **What to do**: move the four strings to `edition/reader-frame.ts` (no directive) and import them in
  both files. Re-point `reader-geometry.test.mjs`'s class regexes (the 280, 48 and 1180 ones) at the
  new file.
- **Saving**: 0 lines; 4 verbatim clones gone; the skeleton can no longer drift from its page.
- **Risk & gate**: low. `npm run check`; load an Edition cold at 390, 1100 and 1440 and watch for a
  jump.
- **Confidence**: high.

### catchups-ui-28 - Fold actions.ts's single-use member gates into one
- **Where** (all `actions.ts`):
  - `:2329-2345`: `loadOwnCatchupCopy`, with one caller, returning three facts that caller ignores.
  - `:2347-2378`: `upsertCatchupPref`, with one caller; its P2002 retry is one its own docblock
    calls unnecessary.
  - `:2754-2774`: `setReminderPref` spells the same gate again and upserts without the retry.
  - `:821-831`: `setCatchupPicture`'s inline gate. `:2604-2606`: `leaveCatchup`'s inline gate.
  - `loadKeeperScope` is defined at `:2399` and first used at `:684`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**:
  - grep: `loadOwnCatchupCopy(` and `upsertCatchupPref(` each have one call site.
  - The membership refusal is spelled three ways across these five sites ("You are not in this
    Catch-up." / "You are not a member of this Catch-up." / "You are not a member of this group."),
    and members have not seen the word "group" since 2026-07-25.
- **What to do**:
  - One `loadMemberCatchup(catchupId, viewerId)` returning `{ catchup, membership }` or the refusal,
    used by `setCatchupArchived`, `setReminderPref`, `setCatchupPicture` and `leaveCatchup`.
  - Either inline the pref upsert in both callers or keep the helper and use it in both; pick one.
  - Move `loadKeeperScope` and `MEMBERSHIP_REFUSAL` up beside `loadKeeperEdition` (~line 447), so the
    gates read together.
  - Whether the three sentences become one is copy: ask him in one line.
- **Saving**: about −20 lines; four spellings of one gate become one.
- **Risk & gate**: low. `batch-catchups.test.mjs` pins the batch refusal INSIDE `leaveCatchup` and its
  ABSENCE from `setCatchupArchived`; keep both exactly where they are.
- **Confidence**: high.

### catchups-ui-29 - startNextEditionNow reads the group it could have had
- **Where**: `actions.ts:1508-1512` (`prisma.group.findUnique({ select: { id, name } })`) runs after
  `loadKeeperScope` (`:1480`), whose `loadCatchupContext` (`:336-355`) already selects
  `group: { select: { batchYear: true } }`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **What to do**: add `id: true, name: true` to `loadCatchupContext`'s group select and use
  `scope.catchup.group`.
- **Saving**: −1 query per press, about −5 lines.
- **Risk & gate**: nil. `time-capsule-rule.test.mjs` reads `startNextEditionNow` (the sealed allowance)
  and is unaffected.
- **Confidence**: high.

### catchups-ui-30 - After mounting it, give the picture picker photo-aim's drag instead of a copy
- **Where**:
  - `home/picture-picker-dialog.tsx:51-61` (`KEY_STEP`, `quantise`), `:113-141` (`overflow`, `grab`)
    and `:199-217` (the slider element).
  - `src/components/common/photo-aim.tsx:53, 63, 172-270`: the same three, inside `AimDialog`.
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd `picture-picker-dialog.tsx [120:7-143:17] ↔ photo-aim.tsx [198:47-224:17]` and
  `[199:11-215:23] ↔ [252:9-268:21]`. The picker's own docblock (`:20-24`) says it "borrows" both
  rules from photo-aim.
- **What to do**: extract `useVerticalAim({ initial, overflow })` into `common/`: pointer capture, the
  arrow-key step, `quantise`, and the slider's aria attributes. Both dialogs use it. Do this only after
  catchups-ui-01, so the dedupe is not done on dead code.
- **Saving**: about −30 lines; 2 clones gone.
- **Risk & gate**: low-medium. Aim a feed photo and a Catch-up picture with mouse, touch and arrow
  keys.
- **Confidence**: medium. photo-aim's frame maths is bound to `framePhoto`, so share the gesture, not
  the frame.

### catchups-ui-31 - answer-experience: make the direction reach the exiting card, and fix the indentation
- **Where**: `answer/answer-experience.tsx:212-244`: `<AnimatePresence mode="wait" custom={direction}>`
  and `m.div custom={direction}`, with `initial` and `exit` computed inline from `direction`. The
  block at `:213-243` is misindented.
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `custom` only reaches an exiting child through variant functions. Here `exit` is a
  plain object captured at the leaving card's last render, so after Next then Back the leaving card
  slides the old way, and the two `custom` props do nothing as written.
- **What to do**: use variants,
  `variants={{ enter: (d) => ({ opacity: 0, x: d > 0 ? 28 : -28 }), center: { opacity: 1, x: 0 }, exit: (d) => ({ opacity: 0, x: d > 0 ? -28 : 28 }) }}`
  with `initial="enter" animate="center" exit="exit"`; or drop `custom` and accept the lag. Re-indent.
- **Saving**: 0 lines; a motion that says what it means.
- **Risk & gate**: low. Answer three questions forward then back, at 390 and 1440.
- **Confidence**: medium. Inferred from motion's documented `custom` semantics, not observed in a
  browser.

### catchups-ui-32 - Rename the things whose names describe something else
- **Where**:
  - Two different exported `PictureDoor`s: `index/picture-door.tsx:86` is a card-as-link;
    `settings/settings-surface.tsx:789` is an icon button on the head. Rename the latter `HeadDoor`;
    catchups-ui-04 moves it anyway.
  - `home/people-door.tsx:272` exports `PeoplePanel`, the name of the deleted 733-line file.
  - The prop `groupName` in `answer/answer-experience.tsx:44` and `completion-card.tsx:21` receives
    `data.title`, the Catch-up's display name (`catchup-home.tsx:225`).
  - `join/[token]/page.tsx:118`: `others` counts everyone.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: audit 2's catchups-16 found "two AnswerCards". That pair is gone and these took its
  place.
- **What to do**: rename each. The lab capsule room imports `PictureDoor` from settings-surface
  (`src/app/lab/catchups/capsule/_room.tsx:24`); update it in the same commit.
- **Saving**: 0 lines; four names that stop misleading.
- **Risk & gate**: nil.
- **Confidence**: high.

### catchups-ui-33 - Delete or correct the comments that describe deleted code
- **Where** (each quoted, so it can be found after lines move):
  - `actions.ts:7`: "the conventions already used by `collection/actions.ts` and
    `groups/actions.ts`". `src/app/(main)/groups/` no longer exists.
  - `actions.ts:825-826`, in `setCatchupPicture`: "Batch Catch-ups arrive in build phase 4; the guard
    is written now so that phase does not have to widen it."
  - `actions.ts:1457-1462`, in `startNextEditionNow`: "the control lives in the rail, wears a
    cinnamon dot and confirms" and "that case arrives with the batch Catch-up itself, in phase 4".
    There is no rail and no dot now; there is a settings list saying "Cannot be undone".
  - `actions.ts:1532` and `:1539`: "push the current phase's deadline out by 1, 2, 4 or 7 days" and
    "each tapping '2 days'". The schema at `:146` accepts 3, 7 and 14.
  - `actions.ts:1849-1859`, the C-027 comment: "a Keeper's 'close and prepare' ... being made ready to
    publish". `preparing` is gone; edit it with catchups-ui-08.
  - `actions.ts:2250-2265`, the "Who is in it" header: "A second Keeper is a `GroupMember.role` of
    'admin' ... it is the role flip". It contradicts `setCatchupKeeper` (`:2689-2697`), which writes
    "keeper" and says "Deliberately NOT 'admin'".
  - `actions.ts:2267-2276`, `DEMO_SHARED_COPY_REFUSAL`: "leaving, archiving and deleting ... these
    three". There are two now.
  - `actions.ts:2280-2285`, `CATCHUP_NOTIFICATION_TYPES`: "a member who has left, or binned their
    copy".
  - `actions.ts:2296-2304` and `:2558-2560`: "point at a ROUND" and "link to a ROUND".
  - `actions.ts:2490-2505`: "(This cleared the thirty-day bin too ...)" and "drag their own copy back
    out of their bin".
  - `actions.ts:2638-2640`, in `leaveCatchup`: "any archived/deleted stamp ... resurrect a bin".
  - `actions.ts:2679-2686`: the `setCatchupDeleted` tombstone paragraph. Git has the history, and
    `batch-catchups.test.mjs:130-142` already pins the absence.
  - `actions.ts:403-404`: "the seven edition-scoped Keeper controls" (five actions and six call sites
    now);
    `:2389-2397`: "seven actions ... the four lifecycle controls ... the three membership controls"
    (nine callers now, six of them lifecycle).
  - `[catchupId]/(home)/page.tsx:44-47`: "Asymmetric two-column shape ... see
    `home/catchup-home-shell.tsx`" (deleted in `b94677ce`).
  - Same file `:169-173`: "the people panel shows only the first PILLS_SHOWN". No such constant
    exists.
  - `edition/[editionId]/page.tsx:69`: a JSDoc describing `advanceAndReload`, sitting above
    `loadEditionBase`. `:73-75`: "The two sibling pages (catchups/[catchupId] and its answer page)".
  - `home/types.ts`:
    - `:40-43`: an orphaned comment ("Kept in sync with the server ceiling ... 'N questions in this
      Edition'") with no code under it;
    - `:3-5`: "WP4's exclusive ownership ... (WP1's file)";
    - `:64`: `countdownLabel` "beside the Catch-up name in the page heading";
    - `:82-84`: `inviteToken` "the Keeper's invite card";
    - `:94-99`: `picture` "Nothing on this page RENDERS it yet -- the head is build phase 7".
  - `catchup-home.tsx:299-302`: "the panel inside them is the same component the
    /lab/catchups/settings room draws -- so the room he signed off and the shipped surface cannot
    drift". This is FALSE. The room draws `src/app/lab/catchups/_settings.tsx`, a separate 1,226-line
    copy frozen on 2026-09-09 (`b49a0552`), and the shipped one has since moved (`334d7907`,
    `d422de66`).
  - `settings-surface.tsx:811-824`, in `useSettings`: "the same shape `ReminderPrefControl` already
    used" (deleted), and "`router.refresh()` after a success". The code never calls it; the actions'
    `revalidatePath` refreshes the current route.
  - `index/catchup-card.tsx:41-49`: "Leaving moves behind Settings on the home, which is build phase 7,
    and until then the home's people dialog still offers it".
  - `answer/answer-experience.tsx:3-9`: "a sticky left progress rail ... a slim sticky bar". `:61-67`:
    "the progress rail, the 'N of M have written in' line".
  - `answer/answer-card.tsx:6-9, 12-13`: "photo -> exactly one picture", "lives in the progress rail".
    `answer/types.ts:4-8, 21-24` and `answer/photo-attachments.tsx:7-10` say the same. Edit all three
    with catchups-ui-07.
  - `edition/reader-parts.tsx:40-42`: "The replies control beside it is build phase 9; there is
    nothing to open yet, so nothing is drawn". It is drawn at `:480-572`.
  - `edition/navigator.tsx:14-17`: "one strip, always there. At rest it says '15 August 2026'". On a
    laptop it is absent until the first question (his 2026-09-10 note, `reader.tsx:477-492`).
  - `create/create-catchup-form.tsx:46-48`: a JSDoc for a `?group=` prop removed 2026-08-21. The Prisma
    paragraphs in the create files go with catchups-ui-20.
  - `join/[token]/page.tsx:106-111`: the C-020 "thirty-day bin" paragraph can be one line.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: every claim above was checked against the tree today.
- **What to do**: delete where the comment is only history; correct it where it still carries a
  reason. Keep every comment that carries an owner quote, a measurement or an audit id and is still
  true (see Not-findings).
- **Saving**: about −60 lines.
- **Risk & gate**: nil; comments only. `npm run check` (a few pins grep prose; the tests strip comments
  with `decomment` before matching code).
- **Confidence**: high.

### catchups-ui-34 - Stop drawing Edition states nothing produces
- **Where**: `(index)/page.tsx:66-72` (`draft: 2` in `STATUS_PRIORITY`) and `:161-162`
  (`?? "draft"`); `edition/not-yet-published.tsx:36-41` (the `status === "draft"` line);
  `[catchupId]/(home)/page.tsx:452` and `settings/types.ts:21` (`"none"`).
- **Phase**: placeholder
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: catchups.md §3.1: "`draft` is still in the type, but nothing creates one; every path
  opens straight into `collecting`". architecture §5: "`no Round yet` is deleted".
- **What to do**: once the lib removes `draft` from `EditionStatus` (catchups-lib lens), delete these
  branches. Until then they are type-driven; leave them.
- **Saving**: about −6 lines.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: medium, because it depends on the lib change.

### catchups-ui-35 - The end-of-answering card links to the page it is drawn on (owner)
- **Where**: `answer/completion-card.tsx:55-57`
  (`<Link href={\`/catchups/${catchupId}\`} …><Button variant="primary">Back to the Catch-up</Button></Link>`),
  and its `catchupId` prop, passed from `answer-experience.tsx:241`.
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: owner
- **Evidence**:
  - Answering moved onto the Catch-up's home in phase 7 (N77). The completion card now renders on
    `/catchups/[id]` itself, so its one primary action navigates to the current page.
  - architecture §3 lists "'open it on its own page' printed inside a tile that was itself on that
    page (¶35)" among the faults the "a card is a door" rule retired.
- **What to do**: remove the Link, the Button and the `catchupId` prop, unless he wants a different
  action there (Owner decision 5).
- **Saving**: about −6 lines, and one control that does nothing.
- **Risk & gate**: low, member-visible. Finish every question on a disposable Catch-up.
- **Confidence**: high.

## Owner decisions

**1. The invite link.**
- *What I'd change*: put "Copy invite link" back in the People window for whoever runs a hand-made
  Catch-up. It disappeared by accident when the Catch-up page was rebuilt on 9 September, so nobody
  can invite anyone by link right now; only links shared before then still work.
- *What you'd notice*: Keepers get their copy-link back. Batch Catch-ups are unchanged: they never
  had one.
- *If I guess wrong*: if you meant invites to go, we would be restoring something you removed. It is
  easy to take out again.
- *Options*: (a) bring the link back. (b) Retire invite links for good and delete the pages and code
  behind them, about 450 lines lighter. (c) Leave it as it is: the pages stay, unreachable.
- *Answer to take if he doesn't reply*: (a). [catchups-ui-02]

**2. Three finished features nobody can see yet.**
- *What I'd change*: nothing, but I'd like a decision date. Voice answers, votes and time capsules
  have been fully built on the server since 14 September, and each is waiting for you to pick its look
  in the lab. Until then they are about 220 lines inside the Catch-ups actions alone, plus database
  columns and a table, an upload route and tests, none of which a member can reach.
- *What you'd notice*: nothing, until you pick.
- *If I guess wrong*: keeping them costs only weight. Removing them throws away working, tested
  plumbing you asked for.
- *Options*: (a) keep waiting and pick when you are ready. (b) Set a date and remove whatever is still
  unpicked by then. (c) Remove them now and rebuild later.
- *Answer to take if he doesn't reply*: (a). [catchups-ui (no finding); spec §16 phases 12-14;
  `actions.ts:174-181, 200-214, 1024-1111, 1368-1402, 1600-1678, 1736-1794`]

**3. The "read" mark on Edition covers.**
- *What I'd change*: nothing by default. The app still records which Editions each member has opened,
  and looks that up on every Catch-ups list and home. But since you asked on 10 September for the
  small line beside the date to be orange either way, the record's only effect is a hidden sentence
  for screen readers ("Not read yet").
- *What you'd notice*: nothing either way, unless you want read and unread to look different again.
- *If I guess wrong*: removing it loses the history; bringing it back later starts it from zero.
- *Options*: (a) keep it as is. (b) Show read versus unread again, one small change. (c) Remove the
  record: a table, a background write and two lookups.
- *Answer to take if he doesn't reply*: (a). [`src/lib/catchup-reads.ts`,
  `index/edition-cover-card.tsx:50-57, 154`]

**4. One answer box for every question.**
- *What I'd change*: make song questions and photo-wall questions use the same answer box as every
  other question, as you decided on 9 September ("cap photo wall also at 3 each", and the separate
  song field deleted). Today a song question still has its own one-line "Song name and artist" box,
  and a photo-wall question accepts only one photo.
- *What you'd notice*: song questions get the normal writing box, where a pasted Spotify or YouTube
  link becomes a card. Photo-wall questions take up to three photos.
- *If I guess wrong*: song questions lose their music-note box.
- *Options*: (a) do it as decided. (b) Keep the song box and fix only the photo cap. (c) Leave both.
- *Answer to take if he doesn't reply*: (a). [catchups-ui-07]

**5. The button at the end of answering.**
- *What I'd change*: remove "Back to the Catch-up". When you finish answering, the card says "See you
  when it's out" and offers that button, but answering now happens on the Catch-up's own page, so the
  button takes you to the page you are already on.
- *What you'd notice*: the end card has no button.
- *If I guess wrong*: someone who wanted a clear "done" loses it. A different button is possible, for
  example "Read the last Edition".
- *Options*: (a) remove it. (b) Replace it with something useful. (c) Keep it.
- *Answer to take if he doesn't reply*: (a). [catchups-ui-35]

**6. The old song code, ahead of its database columns.**
- *What I'd change*: delete the old "paste a Spotify link into a special field" code now, and leave
  dropping its database columns for your next release, as planned. Removing the code first is the safe
  order; the columns can go whenever you say.
- *What you'd notice*: nothing.
- *If I guess wrong*: nothing breaks. The plan only said to do both together.
- *Options*: (a) code now, columns later. (b) Both together at your release, the plan as written.
- *Answer to take if he doesn't reply*: (a). [catchups-ui-08]

## Not-findings
- **The "almost ready" P2021 guard on the list, home and reader stays.** It is a live deploy-ordering
  belt: `isMissingTable` matches any P2021/42P01, so a future `Catchup*` table whose migration lands
  after a push degrades to this screen, not a 500. Spec §7.7 describes it, and handover phase 2 kept it
  on purpose ("almost-ready.tsx ... SURVIVE, with the reason in each docblock"). Only its bundle cost
  is a finding (catchups-ui-12), plus the one site where it cannot fire (catchups-ui-11).
- **Why `src/app/catchups/**` sits outside `(main)`** (charter question):
  - It is not a route group. It is a plain `catchups` folder at the app root holding only `join/`.
    `(main)` adds no URL segment, so both folders serve `/catchups/*`.
  - It must be outside, because `(main)`'s layout requires a session and an invitation has to open for
    a stranger (docblock `[token]/page.tsx:20-25`; `src/proxy.ts:37` makes it public).
  - The static `join` segment beats the dynamic `[catchupId]`. The tokenless `/catchups/join/page.tsx`
    exists so the bare path does not fall into `[catchupId]` with id "join" (audit C-204, pinned by
    `proxy-rule.test.mjs`).
- **The 26 action preambles** (auth, then the verified gate, then `typeof id` checks; most of
  jscpd's 23 intra-`actions.ts` clones) are `gate-coverage.test.mjs`'s C-189 contract. A wrapper was
  refuted twice (brief §4). `gate-coverage` finds action files by their `"use server"` first
  statement (`test-kit.mjs:127-142`), so even a split file would stay covered.
- **`refuseIfFrozen`, `loadKeeperEdition` and `loadKeeperScope`, with per-call refusal sentences.**
  They carry B-061, pinned by `catchup-lifecycle.test.mjs`. The sentences are owner-reviewed copy,
  passed in on purpose (`actions.ts:402-416`).
- **The comment mass in the reader and the list** (`reader.tsx` 0.94, `picture-door.tsx` 2.02,
  `edition-cover-card.tsx` 1.23, `catchup-card.tsx` 1.12). Almost every block carries an owner quote,
  a measured number or an F/R/N id. A bloat example, now: `actions.ts:1532` "push the current phase's
  deadline out by 1, 2, 4 or 7 days", which describes deleted code (catchups-ui-33). A keep example:
  `reader.tsx:645-652`, the Tailwind "`md:` emitted after `min-[1180px]:`" trap with the measured
  88px, which is what makes `reader-geometry.test.mjs` intelligible.
- **The reader's layout in CSS, with `useMedia` only for scroll offsets** (`reader.tsx:36-54, 417-433`).
  It is deliberate: one server render is correct at every width. His "different UI for a second"
  note is the reason.
- **`glide()` and `useSpy`** (`reader.tsx:306-406`): owner-specified motion (his "fast forward"
  complaint). No dependency does it better, and `useSpy`'s value-equality bail-out keeps it cheap.
- **`said()`** (`reader-parts.tsx:574-580`) is his R21, "If it's empty, just delete it".
- **`entry-comment-actions.ts`** reuses the feed's `deleteComment` and `adminRemoveComment` on
  purpose: one soft-delete rule. It is 32 lines; its two forwarding arrows are harmless.
- **`EntryLoveButton`** is the only standalone heart wrapper. The other four `useHeartToggle` sites
  embed the hook in bigger components. No clone.
- **The lab-to-shipped clones** (about 42 jscpd pairs between `sketches/_*.tsx`, `_settings.tsx`,
  `wall/_shapes.tsx` and shipped files) are the transplant record. The lab is owner-approved history,
  and no shipped file imports from `src/app/lab` (grep: every hit outside the lab is a comment).
- **Seq scans on the Catch-ups tables** (charter lead): CatchupSeries has 8 rows and 51,350 seq
  scans; CatchupEdition 9 rows; Group 24; GroupMember 257. At these sizes the planner is right to
  scan one page rather than use an index. Not a problem today (L06 owns the query lens).
- **pg_stat_statements [0] and [2]**, the CatchupEntry reads returning ~130 rows per call (2,314 and
  2,949 calls). They have accumulated since 2026-05-22 (`db-stats-reset.json`). Their column lists
  (`songUrl`, `songTitle`, `songArt`, plus a loves count) match the pre-rework reader and home, not
  today's `loadPublishedEditionView` (`catchups-edition-view.ts:146`, no song columns). Reading every
  answer of an Edition is inherent to a reader that draws every answer (the live one has 133).
  Statement [11] (Editions ordered by entry count) matches no current code; it is from a deleted
  surface. [1] and [4] (CatchupEdition, 32,576 and 19,794 calls, ~0 rows) are the advance's
  stale-Edition reads, in shapes the current single `findMany` replaced. [6] (8,021 calls) is the
  layout's `hasCatchup` findFirst, measured at 0.117 ms in its own comment.
- **`CatchupPromptOption` with 0 live rows**: the vote feature, owner-gated (Owner decision 2). It is
  not dead.
- **The loading skeletons' measured numbers** (the 2026-09-21 series) are owner-driven fidelity. Only
  catchups-ui-27's drift proposal touches them.
- **Render-time state adjustment in `catchup-shelf-view.tsx:130-135` and `collecting.tsx:272-276`**
  is React's own recommended pattern for props-derived state, not effect mirroring. The only true
  mirrors are `useSettings`' three effects (folded into catchups-ui-04).
- **Leaving `actions.ts` as one file** (charter lead). Splitting it into four or five concern files is
  line-neutral, would re-point 12 path-based pins, and would force the 12 private gates into an
  importable module. Cut its duplicates instead (catchups-ui-06, -08, -17, -28, -33): about 200 lines.

## Audit carry-overs in this territory
- **catchups-01** (audit 2), retire the Spotify pipeline: still open. The code half is here as
  catchups-ui-08; the columns are gated on his release (spec §16).
- **catchups-02**, cadence trios and prop drills: PARKED, then partly moot. keeper-settings-dialog,
  console-collecting and library-picker-dialog were deleted in `b94677ce`, but the library drill and a
  fifth cadence spelling were re-created. Now catchups-ui-20, still blocked on catchups-10.
- **catchups-03**, Keeper-only dialogs shipped to every member: moot in its files, re-created in shape
  on the new home. Now catchups-ui-04.
- **catchups-04**, the answer page's hand-rolled upload: moot. The answer page is a redirect, and
  `PhotoAttachments` uses the shared `shrinkForUpload`, `postImages` and `AttachImageDialog`.
- **catchups-05**, `CatchupIndexCard`'s "Start one" model: its consumer is gone. The type survives
  unused (`catchups-types.ts:222`, knip); that is for the catchups-lib lens.
- **catchups-07**, the preparing ritual written twice: moot. `preparing` was deleted 2026-09-08,
  `catchup-home-shell.tsx` was deleted, and the round page is a 308.
- **catchups-08**, the join shell three times and the refusal card twice: still open, unchanged. Now
  catchups-ui-19.
- **catchups-09**, membership and Edition column clones: still open, fewer copies (4 membership, 3
  column sets). Now catchups-ui-17 and -18.
- **catchups-10**, `newInviteToken` and `node:crypto` in the client-safe core: still open
  (`catchups-core.ts:25`). It is the prerequisite for catchups-ui-20; catchups-ui-02's retire option
  would delete it outright.
- **catchups-12**, inline gates, and `loadKeeperScope` defined far below its first call: still open.
  The distance is now about 1,700 lines (`:2399` against first use at `:684`). Now catchups-ui-28.
- **catchups-14**, stale comments: a new batch, now catchups-ui-33.
- **catchups-16**, two components named `AnswerCard`: moot, but two `PictureDoor`s took their place.
  Now catchups-ui-32.
- **catchups-17**, the tile class spelled ten times: `roundLabel` is gone, but the recipe
  `card-elevated … rounded-[var(--radius)] border border-border bg-card` is now spelled 20 times in
  this territory. For the common-primitives lens (a `@utility` or a constant); it is line-neutral, so
  not a finding of mine.
- **catchups-18**, `runAction`'s `console.error`: still open (`actions.ts:236`). The engine reports
  through `reportSwallowed`; the actions do not. For the observability or bug lens.
- **Audit-2 E-phase `E12 (bar catchups-02)`**: the "bar" is still open (above).

## For other lenses
- **Bug audit** (not read by me as evidence):
  - catchups-ui-01, -02 and -03: three dead controls since `b94677ce`.
  - catchups-ui-07: the photo-wall composer caps at 1 against his locked 3.
  - catchups-ui-31: `custom` is inert, so the exit slides the wrong way after Back.
  - `join/[token]/page.tsx:133` and `accept-invite.tsx:42` print the group's name, not the Catch-up's
    (renamed Catch-ups invite under their old name).
  - `create/people-picker.tsx:110-112`: `addMyBatch` calls `res.json()` with no `res.ok` check. A 4xx
    or 5xx reads as "Everyone from your batch is already here".
  - The home's not-member card says "Join {group}" (`page.tsx:526-527`) when no join path exists.
- **catchups-lib**:
  - `resolveSpotify` (catchups-core ~1315-1391) goes with catchups-ui-08.
  - `newInviteToken` and `node:crypto` (catchups-10).
  - Export a Keeper entry to `applyEditionAction` (catchups-ui-06).
  - A request-`cache`d `advanceDueCatchups` for the layout and the list (catchups-ui-15).
  - `loadGroupMembership` (catchups-ui-18).
  - `editionCountdownLabel` may be dead after catchups-ui-05.
  - `isMissingCatchupTable`'s docblock names "the group card" (`catchups-core.ts:1395-1398`).
  - `draft` in `EditionStatus` (catchups-ui-34); `CatchupIndexCard` unused.
- **admin-analytics (T06)**:
  - `admin/catchups/[catchupId]/page.tsx` selects `intro` (no writer since the rework except the demo
    seed) and `songTitle`, and renders "not in the Edition" rows for `accepted = false`, which cannot
    exist (`:98, 111, 121, 229-232, 296`).
  - `src/lib/page-label.ts:34, 41`'s `/catchups/:id/answer` label after catchups-ui-09.
- **common-primitives**:
  - A `ResponsiveDialog` (3 sites, catchups-ui-25).
  - A `useMediaQuery(query, serverValue)` built like `reader.tsx:131-144` (`useSyncExternalStore`).
    `use-wide-viewport.ts` and `use-coarse-pointer.ts` are identical `useState` + `useEffect` mirrors;
    the home's `phone` flag renders the sheet branch for one frame on every laptop mount.
  - `SpringPress as="button"` needs `{...({ type, "aria-label" } as object)}` casts
    (`photo-attachments.tsx:127, 141`).
  - The 20 spellings of the tile recipe.
- **data-layer / prisma-demo-seed**:
  - `CatchupSeries.intro` is written only by the demo seed and read only by the admin page and the
    export.
  - `CatchupEdition.theme` is read only by the admin page.
  - `CatchupPrompt.accepted` is always true (catchups-ui-21).
  - `CatchupReminderPref.deletedAt` and the song columns are unread (spec §16).
- **bundle-build**:
  - The home's route chunks, measured in catchups-ui-04.
  - `AlmostReady` sits in four routes' first load (catchups-ui-11, -12).
  - The bird-glyph chunk `1gnprwog56le7.js` (31.1 KB) is on 17 shipped routes, /catchups included.
  - `next.config.ts` has no `redirects()` yet (catchups-ui-09).
- **lab-catchups**:
  - `_settings.tsx` (1,226 lines) is a frozen pre-transplant copy that the shipped surface has
    diverged from, while `catchup-home.tsx:299-302` claims they cannot drift (catchups-ui-33).
  - `capsule/_room.tsx:24` imports the shipped `PictureDoor`; update it when catchups-ui-04 or -32
    moves it.
- **runtime-perf**: sequential Prisma calls per render, on top of the `(main)` layout's own:
  - `/catchups`: about 4-5, including a duplicate advance;
  - home: 7 at rest, 9 while answering;
  - reader: 5, plus 2 in metadata, plus 2 `after()` writes.
- **feed (T01)**: `entry-comment-actions.ts` compared with the feed's actions. It reuses the feed's
  two moderation actions deliberately; there is no clone beyond that.

## Charter leads and questions, answered
- **knip `setCatchupPicture` and `setEditionTimeCapsule`: dead or in progress?**
  - `setCatchupPicture` is neither: it was orphaned by regression in `b94677ce`, and the fix is to
    mount the picker (catchups-ui-01).
  - `setEditionTimeCapsule` is in progress and owner-gated. It carries "NOTHING CALLS THIS YET"
    (`actions.ts:1634`), is pinned by `time-capsule-rule.test.mjs:229-239`, and its lab drawing waits
    at `/lab/catchups/capsule`.
  - `answer-redirect.tsx` is dead (catchups-ui-10). `picture-picker-dialog.tsx` is the orphaned half
    of catchups-ui-01.
- **Are vote, voice and capsule reachable from the UI?** None of the three. Each is built through the
  server and waits on his pick in the lab: vote at `/lab/catchups/vote`, voice at
  `/lab/catchups/voice`, capsule at `/lab/catchups/capsule`. No component sends `choices`, `audio`,
  `pollOptionId` or calls `setEditionTimeCapsule`. `CatchupPromptOption` has 0 live rows. See Owner
  decision 2.
- **Which page issues the heavy statements?** See Not-findings for the statement map. By page:
  - every authenticated page: `hasCatchup` [6] and the advance;
  - `/catchups`: the advance twice (catchups-ui-15) and the cover photos [8];
  - home: `loadCatchup`, membership, the fresh Edition, covers, pref, and the dead `distinct`;
  - reader: base, membership, reload, the published view (every answer, which is inherent), and 2
    metadata reads (catchups-ui-13).
- **How many actions, how much shared validation, how many would a fixer split?**
  - 27 exported functions: 26 wrapped by `runAction`, plus `loadEntryComments`. There are 12 internal
    helpers, 10 Zod schemas and 3 retyped value lists.
  - The shared validation is the C-189 preamble (26 times, keep) and five gates: `loadMemberEdition`
    (6 call sites), `loadKeeperEdition` (6), `loadKeeperScope` (9), `loadCommentableEntry` (3) and
    `loadCatchupContext` (3).
  - A split into five concern files is possible without behaviour change (gate-coverage keys on the
    directive), but not recommended; see Not-findings.
  - Cut about 200 lines instead: catchups-ui-06 (~70), -08 (~45), -33 (~40 in this file), -17, -28
    and -29 (~30), and -20 (~10).
- **Q1: every `"use client"` boundary, and every dialog or sheet that could be dynamic.**
  - 26 of the 36 component files are client files. All need state, effects or motion except:
    - `almost-ready.tsx` and `nothing-here.tsx`, client only for `useSoloHoopoe`;
    - `completion-card.tsx`, the same;
    - `answer-redirect.tsx`, which is dead.
  - Non-client and correct: `picture-door.tsx` (exports class strings to a server `loading.tsx`),
    `edition-cover-card.tsx`, `not-yet-published.tsx`, `not-available.tsx`, the type files and
    `entry-comment-actions.ts`.
  - Dynamic candidates: the settings panel and dialogs, the people roster, the library dialog, the
    composer, the picture picker and `AlmostReady` (catchups-ui-01, -04, -12). Already dynamic: the
    comments section.
- **Q2: components that re-implement a shared primitive.**
  - Bottom sheet: both dialog-or-sheet sites use the shared `BottomSheet`, and only the switching is
    duplicated (catchups-ui-25).
  - `LoveButton`: used as intended via `EntryLoveButton`.
  - `ImageViewer`: reached through `lazy-image-viewer` everywhere (`reader-parts.tsx:255-262`,
    `photo-run.tsx:116`), as F36 requires.
  - `BirdAvatar` and `FlushAvatar`: used everywhere; no hand-rolled avatar.
  - Found instead: two `RowButton`s (catchups-ui-25), a scrim and a frame re-typed next to their
    exports (catchups-ui-26), and a picker drag loop copied from photo-aim (catchups-ui-30).
- **Q3: lab-born code that shipped, clone or divergence?** Every transplant diverged, so every lab
  room is now history, not a mirror:
  - `sketches/_list.tsx` → `catchup-card.tsx` and `archived-row.tsx`;
  - `_cover.tsx` → `picture-door.tsx` (`onOpen` became `href`);
  - `_home.tsx` → `collecting.tsx` and `people-door.tsx`, plus a composer the shipped one diverged
    from against the spec (catchups-ui-07);
  - `_navigator.tsx` → `navigator.tsx` (clamps swapped, no grabber);
  - `_parts.tsx` → `reader-parts.tsx` (rich text, the real heart, comments);
  - `_reader.tsx` → `reader.tsx` (the layout moved into CSS);
  - `_settings.tsx` → `settings-surface.tsx` (bottom sheet, back-closes, no picker);
  - `wall/_shapes.tsx` `Run` → `photo-run.tsx` (band as a custom property), and `_corpus.ts` →
    `lib/photo-wall.ts`.
  The one false claim of sameness is `catchup-home.tsx:299-302` (catchups-ui-33). No room proposal
  from me: the rooms are his.
- **Q4: the six signatures and the React list.**
  - 1, single-use helpers: `loadOwnCatchupCopy`, `upsertCatchupPref` (catchups-ui-28).
  - 2, types for internal shapes used once: `home/types.ts` carries about 20 unread fields
    (catchups-ui-05). `AnswerAsker` and `ReaderAsker` are aliases worth keeping.
  - 3, defensive try/catch around code that cannot throw recoverably: `/catchups/new`
    (catchups-ui-11). `generateMetadata`'s catch-all on the home is harmless.
  - 4, intermediates: the home's hand-built advance input (catchups-ui-17) and the `BirdAvatar`
    objects (catchups-ui-24).
  - 5, options nobody passes: catchups-ui-24.
  - 6, narration: little of it. The stale history is catchups-ui-33.
  - React: effects mirroring props into state only in `useSettings` (catchups-ui-04). No `useMemo` or
    `useCallback` without a reason: the one `useMemo` (`answeredIds`) guards a derived Set, and the
    `useCallback`s in `reader.tsx` feed `useSyncExternalStore`, which needs stable functions. No
    client file imports a server-only module.

## Metrics
- **Size read**: 51 files, 12,324 raw lines (components 7,585; `(main)/catchups` 4,424; join 315).
  cloc for the territory: 7,556 code, 4,000 comment, 768 blank; comment-to-code ratio 0.53.
- **Biggest files, raw lines (cloc code / comment)**: `actions.ts` 2,821 (1,619 / 976);
  `settings-surface.tsx` 1,010 (740 / 226); `reader.tsx` 753 (362 / 341); `reader-parts.tsx` 580
  (350 / 204); `[catchupId]/(home)/page.tsx` 539 (396 / 107); `navigator.tsx` 467 (286 / 157).
- **Most comment-heavy files (comment/code ratio)**: `[catchupId]/answer/page.tsx` 2.67;
  `round/[editionId]/page.tsx` 2.11; `index/picture-door.tsx` 2.02; `edition/reader-types.ts` 1.94;
  `index/nothing-here.tsx` 1.57; `index/edition-cover-card.tsx` 1.23; `settings/types.ts` 1.18;
  `entry-comment-actions.ts` 1.14; `catchup-card.tsx` 1.12; `home/types.ts` 1.09.
- **Client components**: 26 of 36 component files are `"use client"`. `next/dynamic` sites in the
  territory: 1.
- **`actions.ts`**: 27 exported functions, 12 internal helpers; 12 test files pin its text by path.
- **First-load uncompressed JS, with the amount above the 978.8 KB `(main)` floor**:
  - `/catchups` 1,072.1 KB (+93.3);
  - `/catchups/[catchupId]` 1,147.5 KB (+168.7);
  - `/catchups/edition/[editionId]` 1,103.8 KB (+125.0);
  - `/catchups/new` 1,089.4 KB (+110.6);
  - `/catchups/join/[token]` 764.2 KB; `/catchups/join` 620.7 KB.
- **Sequential Prisma calls per render, excluding the layout**: `/catchups` about 4-5; home 7 (9
  while answering); reader 5, plus 2 in metadata and 2 `after()` writes.
- **Tool items in the territory**:
  - knip: 2 unused files and 7 unused exports. After verification, 3 are dead (answer-redirect,
    `HEAD_HEIGHT` ×2), 3 are unneeded `export` keywords, 2 are orphaned by regression (the picker and
    `setCatchupPicture`) and 1 is owner-gated work in progress (`setEditionTimeCapsule`).
  - jscpd: 31 non-lab clones involving the territory (23 inside `actions.ts`, most of them the C-189
    preambles; 4 between the actions files; 2 list/home; 2 picker/photo-aim), plus about 42 lab-shipped
    transplant pairs.
- **Findings: 35.**
  - By tier: T1 7, T2 23, T3 4, T4 1.
  - By class: structural 26, cheap 9.
  - By who decides: autonomous 31, owner 4 (catchups-ui-02, -07, -08, -35).
  - Owner decisions raised: 6.
- **Estimated savings if everything autonomous lands**:
  - about −540 lines in the territory (about −585 with the owner-gated catchups-ui-08), most of it
    catchups-ui-05, -06, -09, -10, -11, -17, -24, -33;
  - 3 files removed (answer-redirect and the two redirect pages; song-attachment as well if Owner
    decision 4 is taken);
  - about 25-45 KB of first-load JS off the home and about 4-11 KB off the reader;
  - 3-4 queries fewer per home, reader and list load;
  - 3 dead controls brought back to life.
  - If invites are retired (Owner decision 1), a further ~450 lines, 4 files and 1 column.
