# collection-a - adversarial verification notes

Verifier for cluster `collection-a` (16 finding ids), 2026-09-04.
Tree state: HEAD is `74cc61a` ("fix(retention): notifications are kept 30 days"), one commit
past the audit baseline `72b5a1d`. `git diff 72b5a1d..HEAD --stat -- src/components/collection
src/app/(main)/collection src/lib/collection*` is EMPTY, so every line number the collection
report quotes is still valid at today's HEAD. `git status --short` is clean across the whole
territory (the `image-viewer.tsx` WIP the finder saw has since landed as 72b5a1d).

Method: every claim re-derived from the file itself with grep/sed, never from the report.
No builds, no browser, no database, per brief §2.

---

## collection-01 - the RSC refetch after a read action  -> UNVERIFIABLE (needs browser)

Every STATIC sub-fact checks out at HEAD:
- The comment the finding quotes is verbatim at `collection-client.tsx:209-214`, inside the
  re-seed guard, which spans `:197-252` (the finding said 196-252; 196 is blank).
- `loadPhotos` (`actions.ts:783-950`) contains no `revalidatePath` — I grepped the whole
  function body.
- `posthog-client.ts:102` is `capture_pageview: "history_change"`.
- `collection-client.tsx:418` is `window.history.replaceState(null, "", ...)`.
- `contribute-room.tsx:698` is `router.refresh()`.
- `collectionPageData` really does cost ~9 queries for a class-eligible member: 1 `user`
  + per readable half (`myPendingPhotos` findMany + 2 `photo.count`) + `loadPhotos`
  (1 `user` when class, 1 findMany, 1 groupBy).

TWO CORRECTIONS TO THE REMEDIATION, both from reading the installed Next 16.3.3:
1. Step (3) "if Next, write the URL through `window.history.replaceState(window.history.state,
   ...)` so Next's `__PRIVATE_NEXTJS_INTERNALS_TREE` marker survives" is a NO-OP.
   `node_modules/next/dist/client/components/app-router.js:84-95` (`copyNextJsInternalHistoryState`)
   reads the marker off `window.history.state` and copies it into whatever `data` the caller
   passed — including `null` (`if (data == null) data = {}`). Passing `null` cannot lose it.
   The patched `replaceState` (`:268-278`) then dispatches `ACTION_RESTORE`, which does not
   fetch.
2. `navigateToUnknownRoute`, named in the component's comment as the trace evidence, lives in
   `node_modules/next/dist/client/components/segment-cache/navigation.js:237` and is reached
   only from `navigateImpl` (`:79-119`) — i.e. from a real `ACTION_NAVIGATE`, not from the
   `ACTION_RESTORE` that a `replaceState` produces. So the trace, if it is real, points at
   `router.refresh()` / the router, or at PostHog's own history wrapper re-entering Next's
   patched `pushState`, rather than at line 418 directly.
So: the measurement the finding asks for is still the right first step, but the bisection
should start at `router.refresh()` and PostHog, not at the `replaceState`.

## collection-02 - the flat per-half props, and the quota bug  -> CONFIRMED

- `collection-data.ts:199-206` returns `scopeFacts` AND flat `pending`/`hasApprovedPhotos`/
  `roomLeft`, with the "spread out flat as well" comment at `:201-203`.
- Both routes spread it whole: `(index)/page.tsx:47` `<CollectionClient {...data} />`,
  `[id]/page.tsx:118` `<CollectionClient {...data} openPhoto={photo} />`.
- `grep -rn "hasApprovedPhotos\|scopeFacts" src e2e scripts` returns 19 lines, ALL in
  `collection-data.ts` and `collection-client.tsx`. No test or e2e spec constructs these
  props, so the prop docblock at `:144-147` ("kept because that is what the permalink route
  and the tests pass") is itself wrong.
- THE BUG IS REAL. `const facts = scopeFacts?.[scope] ?? { pending, hasApprovedPhotos,
  roomLeft }` at `:288`; `facts` is read at `:289` (`facts.pending`) and `:1072`
  (`facts.hasApprovedPhotos`) and NOWHERE ELSE — `grep -n "facts\." ` returns exactly those
  two. Line 1408 passes `roomLeft={roomLeft}`, the flat server-rendered half's number, into
  `<ContributeDialog>`, which forwards it to `<ContributeRoom roomLeft={roomLeft}>` (`:253`),
  where `accept()` caps the drop at `Math.max(0, roomLeft - photos.length)`
  (`contribute-room.tsx:361`). After a browser-side swap the cap is the other half's.

## collection-03 - both halves' facts on every load  -> CONFIRMED

`collection-data.ts:160-193`: `readable` is `["valley","class"]` whenever `classWhere` is
non-null, and each half runs `myPendingPhotos` + 2 × `photo.count` = 3 queries. The defence
quoted at `:155-158` is verbatim. The counter-argument holds: `chooseScope`
(`collection-client.tsx:342-354`) only sets client state, which flows through `fetchPage` to
`loadPhotos`, so the swap already pays a round trip; and `loadPhotos` already carries
first-page-only extras (`page.bands` computed under `if (first)` at `:918-947`).

## collection-04 - four User reads, two Photo reads, and the permalink's order  -> CONFIRMED

On `/collection/[id]` for a class photograph, at HEAD:
1. `generateMetadata` `photo.findUnique` (`[id]/page.tsx:52-58`) + `user.findUnique`
   (`:59-62`, selects `verifyState, batchYear`).
2. `loadPhoto` `photo.findUnique` (`actions.ts:960-963`) + `user.findUnique` (`:973-976`).
3. `collectionPageData` `user.findUnique` (`collection-data.ts:123-126`, adds `photoTrusted`).
4. `loadPhotos` `user.findUnique` (`actions.ts:795-801`, class scope only).
The order slip is real: `[id]/page.tsx:99-102` hard-codes `order: "newest"`, while
`defaultOrderFor` (`collection.ts:559-560`) returns `"taken"` for `"class"` and is what both
`riverFiltersFrom` (`collection-data.ts:100`) and `chooseScope` (`:349`) use. Pinned by
`collection-taxonomy.test.mjs:133-136`.
Pin note the finding got right: `security-regressions.test.mjs:317-332` requires a literal
`decidePhotoVisibility(` in BOTH `actions.ts` and `[id]/page.tsx`.

## collection-05 - decompose collection-client.tsx  -> CONFIRMED WITH CORRECTION

cloc row confirmed: `TypeScript,./src/components/collection/collection-client.tsx,82,662,725`.
I spot-checked EVERY boundary line in the finding's responsibility map (127, 176, 252, 275,
370, 419, 463, 514, 588, 677, 727, 764, 823, 873, 932, 942, 1060, 1085, 1087) and each one is
exactly where the finding says. JSX is 1087-1469 = 383 lines. Map accurate to the line.

CORRECTION — the pin list is incomplete, and one of the omissions is not a path rewrite but a
structural constraint:
- `append-page.test.mjs:94` (inside the `LISTS` loop, `:85-105`) asserts that
  `collection-client.tsx` itself still contains `appendUnseen(` and does NOT contain a
  hand-rolled `new Set(x.map((y) => y.id))`. Move the river hook out and that assertion
  fails on the file path it names.
- `append-page.test.mjs:65-66` asserts `src.indexOf("generation.current += 1;") < start`
  where `start` is the index of `const more = useCallback(async ()` — an ORDERING assertion
  inside ONE file. The query effect (which bumps the generation, `:590`) and `more` (`:679`)
  must therefore stay in the same file as each other, or the pin needs rewriting rather than
  repointing. The finding's `use-river.ts` keeps both together, so the plan survives — but
  the fixer must know the constraint before splitting differently.
- `heart.test.mjs:47` and `river-query.test.mjs:33` read the file by path, as stated.

## collection-06 - one encode recipe  -> CONFIRMED

Both sequences read exactly as described. The two drifts are verbatim:
`actions.ts:340-342` `.resize(1600, 1600, ...)`/`.webp({ quality: 80 })` vs `:594-603`
`storedResizeBox(...)`/`.webp({ quality: COLLECTION_WEBP_QUALITY })`, and
`COLLECTION_WEBP_QUALITY = 100` at `upload-shared.ts:91`. Thumb source differs: `gridThumb(input)`
at `:350` (the original) vs `gridThumb(display.data, { alreadyUpright: true })` at `:618`.
Four sharp header reads on the direct path confirmed: `countImageFrames` (`:571`),
`exifDateOf`→`exifBlockOf` (`collection-photo.ts:137-139`, `:157-166`),
`storedResizeBox(await sharpImage(original).rotate().metadata())` (`:602`), `dateOnlyExif`→
`exifBlockOf` (`:189-194`). Pin confirmed: `upload-shared.test.mjs:209` asserts exactly two
`countImageFrames(` in the collection actions, so it must move with the refactor.
Bonus (not in the finding): the comment at `actions.ts:611-617` says the thumbnail is "a second
lossy pass (q90 then q72)" while the constant is 100 — a stale number in a load-bearing comment.

## collection-07 - one asker for the page above  -> CONFIRMED

The observer's self-description is verbatim at `:907-911`. `headNear` is written only by the
observer (`:912`) and by the cleanup (`:930`), and read only by the scroll listener (`:584`).
The scroll listener (`:566-586`) already reads `window.scrollY` every event. `loadNewer`
(`:771`) opens with `if (!topCursor || loadingNewer || loadingMore || loading) return;`, so
dropping the observer's `topCursor` mount-gate is safe.
Both pins exist and both must be rewritten, as the finding says:
`river-query.test.mjs:132-141` slices from `const head = useRef` to `}, [topCursor` and asserts
`wantsNewer()`; `:152-161` slices from `const onScroll = () =>` and asserts the literal
`headNear.current && wantsNewer()` — which the proposed fix deletes.

## collection-08 - retire area / freeTags  -> CONFIRMED WITH CORRECTION

The read plumbing is exactly where the finding says (`collection.ts:148-155` LEGACY_AREAS +
areaLabel; `actions.ts:89-91,124-125,144-146,747-748`; `collection-photo.ts:35,50,68,77,86,90,272,274`;
`validators.ts:263`; `collection-client.tsx:112-113`). No UI writes `area` any more —
`photo-questions.tsx:48` records its removal, and grep finds no `area` field in any collection
or review component. The demo seed's six `area: "Whole campus"` rows are at
`demo-seed/content.ts:703-791` with the type at `:686`.

TWO FILES THE FINDING'S "WHAT TO DO" LIST MISSES, both of which BREAK if the columns drop:
- `scripts/dev/import-album.mjs:405` names `"area"` and `"freeTags"` in an explicit
  `INSERT INTO "Photo" (...)` column list (passing NULL for both). A dropped column makes that
  INSERT a runtime error the next time the album importer runs.
- `src/app/lab/collection/_archive.ts:147` (`area: pick(WHERE, n, 43) || null`) and `:149`
  (`freeTags: []`) construct `PhotoData`-shaped rows. Removing the two fields from `PhotoData`
  is a TypeScript error there, so the lab file ships in the same commit.
The "every production read is a read of null" half still rests on the SELECT the finding
prescribes; the code-side deadness is confirmed, the data-side is not (needs DB).

## collection-09 - one column map  -> CONFIRMED

Three copies of the same six-column mapping, verbatim:
`collection-photo.ts:270-277` (inside `photoRowData`), `actions.ts:1328-1335` (editPhoto),
`admin/review/actions.ts:91-98` (saveReview, plus its `...(input.approve ? {...} : {})`).
`saveReview` indeed omits `area` where `photoRowData` writes it, and the `approved: false`
idempotency clause in saveReview's WHERE (`:90`) is genuinely its own — the finding's refusal
to route saveReview through editPhoto is right.

## collection-10 - move the two server-only readers  -> CONFIRMED

`loadPhoto` is `actions.ts:957-985`, `myPendingPhotos` `:996-1007`. `grep -rn "loadPhoto\b\|
myPendingPhotos" src e2e scripts` finds callers only at `collection-data.ts:9,165` and
`[id]/page.tsx:10,96` (plus a comment and a test-pin string). `shape` (`:121`) and
`includeFor` are NOT exported today, so the finding is right that they have to move to a
non-`"use server"` module rather than being exported.
Sharp detail worth flagging to the fixer: `decidePhotoVisibility(` appears in `actions.ts`
EXACTLY ONCE (`:977`, inside `loadPhoto`). Moving `loadPhoto` therefore makes
`security-regressions.test.mjs:322-326` fail — it is not a nice-to-have repoint, it is
mandatory in the same commit.

## collection-11 - a lookup table for the two halves  -> CONFIRMED WITH CORRECTION

Every cited site exists. Counted at HEAD, `scope === "class"` appears at
`collection-client.tsx:412,1096,1116,1120,1166,1171,1207,1232,1235,1278,1354` (11 in the
client, one of which — 412 — is the URL sync, not copy or layout), `river-controls.tsx:155`,
`contribute-room.tsx:238`, `actions.ts:197`, and `scope-caret.tsx:50,90`. So "eleven ternaries"
undercounts the sites and overcounts the ternaries (several are `&&`, not `? :`).
CORRECTION to the plan: the class empty-state BODY at `:1171-1181` is JSX (a fragment with
`{myClassYear}` interpolated), so it cannot move into `src/lib/collection.ts` as the finding
proposes — that module is a plain `.ts` and putting JSX in it would need a rename. Either
`emptyBody` returns a string with a `{year}` placeholder the component fills, or that one
entry stays in the component. Also worth the fixer's eye: `contribute-room.tsx:232-239` carries
a long comment arguing WHY the two titles have different voices; moving the strings away from
that argument is exactly the "comment describing code that moved" the brief warns about.

## collection-12 - `mixed` and the standalone room  -> CONFIRMED

`mixed` exists only at `bucket-tiles.tsx:58` (default), `:63` (type) and is read at `:78`
(`const some = !on && mixed.includes(b.value)`) and `:102-103` (the half-lit branch).
`grep -rn "mixed" src e2e scripts` finds no `mixed=` caller anywhere.
`ContributeRoom` is exported at `contribute-room.tsx:264` and referenced exactly once, at
`:250`, inside its own file. The dialog passes all five props (`scope`, `autoApproved`,
`roomLeft`, `active={open}`, `onWall`, `onDone`) at `:250-256`, so making the three optional
ones required is safe.
`Staged.state` at `:103` is `"waiting" | "lifting" | "here" | "failed"`; the docblock above it
(`:102`) names a `"reading"` state that is a counter (`const [reading, setReading] = useState(0)`).

## collection-14 - tell each mechanism once  -> CONFIRMED WITH CORRECTION

662 comment / 725 code confirmed by cloc. The four tellings of the head-sentinel story are all
present (`:516-531`, `:547-561`, `:574-583`, `:886-911`), and the same owner quote ("all the
years above 2017 have disappeared") appears at `:554-556` and `:895-897`.
CORRECTION/UPGRADE: the comment at `:1209-1217` is stale in TWO ways, not one. It explains the
absent mobile decade strip AND says "a real scrubber down the right edge is a later, separate
piece" — that scrubber has since shipped and is rendered by this very file at `:1363`
(`<PhotoScrubber`). The paragraph now misdescribes the component it sits in.

## collection-16 - the hygiene batch  -> CONFIRMED WITH CORRECTION (sub-claim by sub-claim)

- `BandCount` declared three times, character-identical: `actions.ts:761`, `year-rail.tsx:65`,
  `photo-scrubber.tsx:74`; `collection-client.tsx:61` imports the year-rail copy. CONFIRMED.
- The knip seven: `preloadViewer` (photo-river:27, used 97-98), `bandsOf` (:202, used :403),
  `READING_LINE` (:258, used :286,:329), `RIVER_ORDERS` (river-controls:63, used :71,:246),
  `orderLabel` (:70, used :240,:242), `THUMB_PX` (collection-photo:26, used :212),
  `PHOTO_SCOPES` (photo-visibility-rule:23, used :24). Every one verified as in-file-only by
  word-boundary grep over `src`, `scripts`, `e2e`. CONFIRMED. Addition: `THUMB_PX = 480` has a
  hand-copied twin at `scripts/demo/add-photos.mjs:36` — a copy, not an importer, so
  de-exporting is still safe, but it is a third place the 480 recipe lives.
- `eraLabel` (collection.ts:199) used only at `:248,:503,:535` — CONFIRMED internal.
  `eraSortYear` (`:376`) has exactly one consumer, `collection-taxonomy.test.mjs:103-104` —
  CONFIRMED. `eraPhrase` (`:499`) used at `:520` plus `collection-date.test.mjs:56` — CONFIRMED.
- `PhotoData.createdAt` (declared `actions.ts:118`, filled `:162`) is read only by
  `src/app/lab/collection/page.tsx:58,93,95`. CONFIRMED. Note the lab's `_archive.ts` supplies
  it at `:165` from a local `added` (`:135`), so the lab file changes with it.
- `photo-river.tsx:472` unused `i`: CONFIRMED, and `raw/tsc-unused.txt` has it at exactly
  `(472,18)`.
- `MAX_SEARCH = 100` (`actions.ts:723`, used `:735`) vs the bare `.slice(0, 100)` at
  `collection-data.ts:61`: CONFIRMED.
- `collection.ts:201` "the contribute form's year dropdown": CONFIRMED stale — the field is a
  text input (`photo-questions.tsx:237-270`), and `PHOTO_YEAR_MIN`'s real consumers are
  `collection-data.ts:82`, `collection.ts:231` and `exif-date.ts:133`.
- `collection.ts:27-31` "The admin side reads it" (Other as a sensor): CONFIRMED as an unpaid
  promise — `review-room.tsx` touches buckets only to SET them (`:209`), and no admin surface
  greps for `"other"` or aggregates `subject`.
- `collection-intake.ts:106-112` orientation swap: CONFIRMED DEAD. The bytes it inspects came
  from `/api/upload` or `/api/upload/finalize`, both of which store `toDisplayWebp(...)`
  output (`image.ts:63-69`), which is `.rotate()`d and re-encoded to WebP — so
  `md.orientation` can only be 1/undefined and `swap` is always false. Only a pre-toDisplayWebp
  legacy object could differ.
- The e2e repetition: `page.mouse.move(20, 400)` appears SIX times in
  `e2e/collection-seek.spec.ts` (`:96,154,181,223,241,297`), not three, and the reading-line
  `window.innerHeight * 0.2` evaluate twice (`:484,:617`) plus a related `evaluateAll` at
  `:142-145`. The duplication is worse than stated, so the helper is more worthwhile.
- CORRECTION on the scripts preamble: `scripts/dev/_env.mjs` ALREADY EXISTS and is imported by
  ELEVEN scripts (`backfill-image-dimensions`, `import-places`, `import-roster`,
  `import-album`, `run-sql`, `set-password`, `sweep-stranded-originals`, `tag-photos-pick`,
  `tag-photos-apply`, `tag-professions-pick`, `tag-professions-apply`). The env half of the
  proposal is done. What actually duplicates is the four-line `flag`/`value` argv pair in SIX
  files (e.g. `tag-photos-pick.mjs:35-39`, `import-album.mjs:75-79`) — about 24 lines total,
  not "~15 lines out of each of six scripts". Note `sweep-stranded-originals.mjs` is NOT one
  of the six; the professions pair is.

## dead-code-05 - the sixteen de-exports  -> CONFIRMED WITH ONE HARD CORRECTION

I re-grepped all 16 symbols plus the two types with word-boundary greps over `src`, `scripts`
and `e2e`. Fifteen of sixteen are in-file-only exactly as claimed: `preloadViewer`, `bandsOf`,
`READING_LINE`, `RIVER_ORDERS`, `orderLabel`, `useMomentAutoplay`, `hashToken`,
`BIRD_SPECIES_COUNT`, `BIRD_POSE_COUNT`, `THUMB_PX`, `PEEK_CREST`, `TAP_MIN_PX`,
`FORMAT_SHORTCUTS`, `SEND_TIMEOUT_MS`, `PHOTO_SCOPES`, plus the two types `AdminSectionDef`
and `ComposerScope`. The recurrences the finding calls out (a private `preloadViewer` local in
post-card/answer-photos/photo-wall, `scripts/qa/map-cluster-verify.mjs:40` defining its OWN
`TAP_MIN_PX = 44`, `mail-queue-rule.test.mjs:127` reading `SEND_TIMEOUT_MS` by regex over the
text) are all as described.

**`H` is WRONG.** `src/app/lab/hoopoe-marks/_parts.tsx:25` is
`export { H, G } from "@/lib/hoopoe-geometry";` — a compile-time reference to the export. The
finding states "Importers of the module ... none imports `H` or `PEEK_CREST`"; it read the
named-import list at `:13-23` and missed the re-export line two lines below it. Dropping
`export` from `hoopoe-geometry.ts:32` makes `npm run check` fail on TypeScript, not on knip.
(Nothing then imports `H` from `_parts` — `hoopoe-marks/page.tsx:15` takes `Body, Crest, Face,
G` — so the correct move is to delete `H` from the `_parts.tsx:25` re-export line in the same
commit, or leave `H` exported.) `PEEK_CREST` is fine: only `hoopoe-geometry.ts:336` uses it.
The `upload-ownership.ts:3,5` re-export claim is right: `upload-ownership-rule.test.mjs:4-9`
imports from `./upload-ownership-rule.ts` directly, and nothing imports `MAX_IMAGES` or
`MAX_IMAGE_URL` from `upload-ownership.ts`.

## duplication-14 - PhotoMetaInput typed three times  -> CONFIRMED

`contributePhotoDirect`'s input (`actions.ts:454-467`, note 467 not 466), `editPhoto`'s
(`:1279-1287`), `ReviewAnswers` (`admin/review/actions.ts:33-40`), owner `parsePhotoMeta`'s
parameter (`collection-photo.ts:66-74`). The only field differences are `area` (present in
contributePhotoDirect and parsePhotoMeta, deliberately absent from editPhoto per its header at
`:1275-1277`) and the per-action `key`/`scope`/`id`.
SEQUENCING NOTE: do collection-08 FIRST. Once `area` is gone, three of the four shapes are
literally identical and this becomes a one-line type alias instead of a judgement call.

---

## Cross-finding notes for the compiler

- collection-02 and collection-03 overlap: 02 removes the flat props, 03 removes `scopeFacts`
  itself. 02's steps are the safer ones (pure prop plumbing plus a one-word JSX fix, gated by
  `npm run check`); 03 changes when the facts arrive and can flash the wrong empty state. Do 02
  first and independently — it fixes a live bug on its own.
- collection-04 and collection-10 must land together: 04 wants `loadPhoto` wrapped in `cache()`,
  which is impossible while it lives in a `"use server"` module, and 10 is the move that frees
  it. Both touch `security-regressions.test.mjs:317-332`.
- collection-01 and collection-05 conflict in ordering: 01 deletes ~60 lines of the guard 05
  wants to relocate. 01's measurement is cheap (one chrome-devtools session) and should run
  before anyone opens the file for 05.
- collection-06 and duplication-14 both touch the two contribute inputs; 06's encode extraction
  and 14's type merge are independent but in the same 200 lines, so one commit each, in that
  order, keeps `image-purge-rule.test.mjs`'s literal counts readable.
