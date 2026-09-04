# fresh-code - refactor audit 2 report

Cross-cutting lens over the code that has never been audited: every source file added since the
first audit closed at `033ea43` (146 commits), plus every modified file with 150+ changed lines,
read file by file for the six LLM-bloat signatures (brief 5e), the React-specific ones, the
simplification pass (5d) and the placeholder/flag hunt (5a items 2-3). Territory agents own the
feature-level structure of the same files; this report is the second pair of eyes for local bloat.
Date: 2026-09-03. Files in territory: 110 (29,336 lines); read fully: 110.

## Coverage

- **Read fully (110 files, 29,336 lines).** Computed as `git diff --name-status 033ea43..HEAD -- src scripts e2e`
  minus `png/sql/md/ico/svg`, taking every `A` file plus every `M` file whose `--numstat` adds+deletes
  reached 150. Five files on the list no longer exist (`contribute-dialog.tsx`, `lab/guide/*` x3,
  `lab/crop/_policies.ts`) and are not counted. Full list with a per-file verdict is in the
  "Per-file verdicts" section at the end.
- **Modified files skipped because under 150 changed lines** (changed-line count in brackets, for
  the orchestrator to route to the territory agents): `use-composer-uploads.ts` (147),
  `collection-photo.ts` (133), `security-regressions.test.mjs` (120), `directory-rule.test.mjs` (120),
  `globals.css` (109), `page-header.tsx` (107), `guide-overlay.tsx` (102), `generate-icons.mjs` (101),
  `alumni-map.tsx` (100), `guide-door.tsx` (98), `attach-image-dialog.tsx` (90), `collection-module.tsx`
  (83), `admin-profile-tools.tsx` (71), `turnstile.ts` (61), `lab/hoopoe-marks/page.tsx` (61),
  `rate-limit.ts` (60), `scripts/qa/check.mjs` (60), `admin/review/page.tsx` is added and was read.
  Everything below 60 was not opened. I did open `collection-photo.ts`'s import block and
  `upload-client.ts` in full because two findings turn on them.
- **Uncommitted edits seen:** none in `src/`, `scripts/` or `e2e/` at any point (`git status --short`
  was clean apart from this audit's own `docs/audit-fix/2026-09-03-refactor-audit-2/` folder). The
  session preamble reported `image-viewer.tsx` modified; by the time I ran `git status` it had been
  committed, so I audited the committed file.
- **Raw leads checked:** `tsc-unused.txt` (4 hits; 3 in my files, all confirmed, see fresh-code-19),
  `commented-out-code.txt` (29 candidates: every one is prose that happens to contain a keyword such
  as "variable", "return", "import"; the three in my files at `create-post-form.tsx:435`, `:1092`
  and `upload/finalize/route.ts:114` are sentences), `console-log.txt` (4 hits, all inside comments,
  none in my files), `todos.txt` (5 hits, all the one song-attachment TODO, not mine),
  `comment-density.txt` (photo-layout.ts 3.65, handled in Not-findings), `type-sludge.txt`
  (the eslint-disable question is answered in the Summary), `knip-repo-config.txt` (8 exports in my
  files, each confirmed below), `jscpd.txt` (34 clone pairs touch my files; the biggest cluster is
  the scripts/dev prelude, fresh-code-05).

## Summary

The territory is the Collection rebuild (river, rail, scrubber, viewer, contribute room, review
room, EXIF dating, tagging passes), the photo-layout family that the feed and Catch-ups now share,
and the QA scaffolding around them. It is unusually well argued: the comment mass is owner quotes,
dates, measurements and audit ids, and the unit tests are behavioural specs rather than shape pins
in most cases. Narrating comments (signature 6) are rare; I quote the handful that describe deleted
code. The classic LLM signatures are also rare: I found no defensive try/catch that was not
reasoned, no factory or registry with one caller, and only one `useEffect` that mirrors props into
state (`directory-client.tsx:168-173`, where `collection-client.tsx` already does the same job the
right way).

What the fresh code does have is **duplication that jscpd cannot see** because the copies are
paraphrased rather than token-identical, and **small placeholder surfaces left behind by fast
iteration**: a 150-line contribution pipeline written twice in one file (fresh-code-01), the lazy
image-viewer boilerplate and its latch written five times (02), the viewer-image mapping three times
(03), three copies whose stated cause is one file's `@/` imports (04), a 20-line script prelude
copied into six scripts (05, the biggest jscpd cluster), a prop no caller passes (16), a parameter
every caller sets to `true` (07), two byte-identical functions under different names (18), a
hand-typed easing curve six times in violation of the CLAUDE.md rule (09), and a hand-rolled
cubic-bezier solver next to a dependency that exports one (10).

**Structural vs cheap:** 12 structural (01-08, 12-15, 23), 13 cheap. Honest savings: roughly
**~420 lines of dead or duplicated code** (01 ~90, 05 ~100, 12 ~300 of one-off probe scenarios,
13-14 ~290 of self-declared one-off scripts once their gates pass, the rest small), **~16 clones**
removed at the source, **2 queries per permalink load** (23), **38 `as object` casts** (11), and
**0 KB of client JS** (nothing here ships twice; the lazy-viewer copies resolve to one chunk).
The largest single lever is the owner decision on `/lab/crop` (1.9 MB of tracked PNG/WebP under
`public/lab/crop/` plus 610 lines) which the room itself asks to be deleted.

**What surprised me:** the eslint-disable count in `raw/type-sludge.txt` (47 -> 97) is an artefact.
50 of the 97 are the `/* eslint-disable */` headers Prisma writes into gitignored
`src/generated/prisma`. The real non-generated count went from 58 to 62 (+4 net): six new lines,
two removed. Every one of the new ones is earned: eleven `@next/next/no-img-element` disables in
the new photo components (the rule is ON for `src/components`; the `off` override at
`eslint.config.mjs:64` is scoped to `src/app/lab/**` only) implement the image-cdn.ts decision not
to route R2 photographs through Vercel's optimiser; one `react-hooks/exhaustive-deps` in
`photo-carousel.tsx:246` has a four-line reason; one `react-hooks/set-state-in-effect` in
`lab/crop/page.tsx:335` reads the URL after mount. There is no unreasoned disable in my files.

**Audit-1 items now moot in this territory:** none of the open owner decisions live here except
"the Collection taxonomy SELECT" and "Collection's filter-row chrome", both of which the rebuild
answered (six buckets in `collection.ts`, the pill row replaced by `river-controls.tsx`). Details
in the carry-overs section.

## Findings

### fresh-code-01 - Fold the two Collection contribution pipelines into one ingest function
- **Where**: `src/app/(main)/collection/actions.ts:246-390` (`contributePhoto`, the FormData
  fallback) and `:454-676` (`contributePhotoDirect`, the presigned path); the shared client in
  `src/components/collection/contribute-room.tsx:599-648` (`fileOne`).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: Both actions run the same sequence in the same order: `auth` -> `IS_DEMO` ->
  `requireVerifiedMember` -> `rateLimit("collectionUploads")` -> `contributionScope` ->
  `photoQuotaError` -> `parsePhotoMeta` -> sniff -> `countImageFrames` -> `exifDateOf` ->
  `dateOnlyExif` -> `sharpImage().rotate().resize().webp()` with `withExif` chained ->
  `gridThumb` -> `putAllOrNone` -> `photoTrusted` lookup -> `autoApprove` -> `createPhotoRow` ->
  `revalidatePath`. The `let thumbUrl/url/width/height/notice/exif` blocks (305-313 and 542-549)
  are identical; the "Photo is over the 20MB limit" string appears three times (285, 556, 563);
  the `me` lookup for `photoTrusted` is written twice (361-364, 537-540). jscpd missed it because
  the two bodies differ in variable names and comment mass. The differences that are real: the
  byte source (a `File` vs a staged R2 key), the resize box (`1600` at q80 vs `storedResizeBox` at
  `COLLECTION_WEBP_QUALITY`), `sourceKey` on the row, and the `refuse` purge that only the direct
  path owes.
- **What to do**: Extract `async function ingestContribution(input: { bytes: Buffer; box: {width,height}; quality: number; filename?: string; sourceKey?: string; scope; classYears; meta; session })`
  returning `{ url, thumbUrl, width, height, notice, exif }` and doing the sniff, frame count,
  EXIF read, encode, thumb and `putAllOrNone`. Keep both exported actions as thin doors: each does
  its own gates in its own order (the direct path's every-refusal-purges invariant stays in the
  door, where `image-purge-rule.test.mjs` pins it), fetches its bytes, calls the ingest, then
  `createPhotoRow`. Hoist the two `contributionScope` + `photoQuotaError` + `me` lookups into one
  `contributorFacts(session, askedScope)` that returns scope, classYears, quota error and
  `photoTrusted` in two queries instead of three.
- **Saving**: ~90 lines; 1 large clone; 1 query per direct contribution (the `photoTrusted`
  lookup can ride on the `contributionScope` select of the same row).
- **Risk & gate**: medium. `src/lib/image-purge-rule.test.mjs` asserts by shape that no error leaves
  `contributePhotoDirect` except through `refuse` -- the refactor must keep that literal shape in
  the door. `src/lib/security-regressions.test.mjs` and `gate-coverage.test.mjs` pin the
  `IS_DEMO` and `requireVerifiedMember` gates by name; keep them at the top of each exported
  action. Then `npm run check`, then a real contribution on `/collection` via both paths (drop a
  file with R2 configured; drop one with `R2_BUCKET` unset locally to exercise the fallback).
- **Confidence**: high. What would change my mind: if the fix session finds the two encodes must
  stay different on purpose beyond the box and quality (I could not find such a reason; the form
  path's `1600`/q80 looks like the pre-full-resolution recipe that was never updated, which is a
  small correctness question for the territory agent).
- **Notes**: The fallback itself is not dead: `upload-client.ts` returns `null` when the presign
  route answers `direct: false` (no R2 locally), on a transient presign failure, on a CORS-refused
  origin (preview URLs) or on the PUT deadline, and `contribute-room.tsx:629-647` then shrinks the
  file and posts it through `contributePhoto`. Whether production ever takes that path is an owner
  question I raise under "Owner decisions"; this finding stands either way, because the two
  pipelines drift the moment one is touched (the 1600px box in the form path is already such a
  drift). Also worth folding in: `actions.ts:38` has a formatting glitch (`\n  isImageFile,} from`),
  and the comment at `:392-394` about "only objects the presign step created" sits above
  `createPhotoRow` but describes the key check at `:472-486`.

### fresh-code-02 - One lazy viewer, one preload, one latch, one photo-opener button
- **Where**: `src/components/collection/collection-client.tsx:70-73,945-955`;
  `src/components/collection/photo-river.tsx:27`; `src/components/posts/post-card.tsx:67-70,80,89-119,201-210`;
  `src/components/catchups/round/answer-photos.tsx:36-75,90-95`;
  `src/components/catchups/round/photo-wall.tsx:29-33,39-40,52-72`; also
  `src/components/letters/letter-images.tsx:19,37,51` (outside my list, same shape).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn 'import("@/components/common/image-viewer")' src` returns 10 hits in 6
  files: five `const ImageViewer = dynamic(() => import(...).then((m) => m.ImageViewer), { ssr: false })`
  and four `const preloadViewer = () => void import(...)`. Five files hold the same
  `[at, setAt] + [mounted, setMounted]` latch with the same two-line `open(index)` and the same
  `{mounted && <ImageViewer initialIndex={at ?? 0} open={at !== null} onClose={() => setAt(null)} />}`.
  `post-card.tsx:89-119` (`PhotoButton`) and `answer-photos.tsx:43-75` (`Opener`) are the same
  component: same button, same three handlers, same class string, one takes `onPreload` as a prop
  and the other reads the module constant.
- **What to do**: Add `src/components/common/lazy-image-viewer.ts` exporting `LazyImageViewer`
  (the `dynamic()` call) and `preloadViewer`; add `useViewerLatch()` returning
  `{ at, open(i), close(), mounted }`; move `PhotoButton` into `photo-frame.tsx` (or its own
  file) as `PhotoOpener` and have both cards import it. `collection-client.tsx` keeps its own
  three-strip `viewer` state (it is genuinely different) but imports `LazyImageViewer`.
- **Saving**: ~45 lines across 6 files; 5 clones; 0 KB (all copies already resolve to the same
  chunk -- verify in `raw/route-bundle-stats.json` that `/feed`, `/catchups/[id]` and
  `/collection` list one image-viewer chunk each, not two).
- **Risk & gate**: low. `npm run check`; open a post with photos on `/feed`, a Catch-up round
  with a wall, and `/collection`, press a photograph in each; `npm run visual` (feed and
  catchups are masked past the header so a red there is real).
- **Confidence**: high.
- **Notes**: This is the pattern the brief asks for by name ("the same measure-then-set-state
  effect... name every site"). It is also the one dedupe here that reads better after: five
  copies of a three-line ritual is exactly the drift-by-copy that put `preloadViewer` in
  `photo-river.tsx` as an export that `post-card.tsx` then redeclared instead of importing.

### fresh-code-03 - `toViewerImage` is written three times
- **Where**: `src/components/collection/collection-client.tsx:105-127`;
  `src/app/lab/collection/page.tsx:238-252`; `src/app/lab/collection/swap/page.tsx:267-281`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd lists the two lab copies as a 17-line clone (`app/lab/collection/page.tsx
  [236:13 - 252:5]` vs `swap/page.tsx [264:19 - 281:5]`). The shipped one at `collection-client.tsx:105`
  is the same field mapping plus `canEdit`/`editLabel`, and it carries the docblock that explains
  the date rule ("never `createdAt`"). The lab rooms say in their headers that every component on
  the page is "the REAL one"; the mapping that feeds the real viewer is the one thing they copied.
- **What to do**: Export `toViewerImage(p: PhotoData, isAdmin = false)` from a small client-safe
  module (`src/lib/collection-viewer.ts`, or from `photo-river.tsx` beside `Tile`) and import it in
  all three. Lab rooms pass `false`.
- **Saving**: ~30 lines; 2 clones.
- **Risk & gate**: low. `npm run check` (the lab registry gate) and open `/lab/collection` and
  `/lab/collection/swap`, press a photograph.
- **Confidence**: high.

### fresh-code-04 - Three copies exist because `collection-photo.ts` imports through `@/`
- **Where**: `scripts/dev/import-album.mjs:98-100,379-382` (the 480px/q72 thumbnail recipe,
  "THE SECOND COPY"); `:230-239` (`exifBlockOf`, "THE SAME TWO SOURCES ... READS");
  `src/lib/exif-date.test.mjs:173-177` ("`dateOnlyExif` ... cannot be imported here"); the cause at
  `src/lib/collection-photo.ts:19-23` (five `@/lib/...` imports).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: All three sites name the same reason in their own comments. `image.ts`,
  `exif-date.ts` and `photo-suggest.ts` were already written with relative `.ts` imports so that
  bare `node` can load them (see the note at `photo-suggest.ts:34-37`); `collection-photo.ts` was
  not, so `gridThumb`, `THUMB_PX`, `exifBlockOf` and `dateOnlyExif` are unreachable from scripts
  and tests and got re-implemented. The `THUMB_PX` export is on knip's list for exactly this reason.
- **What to do**: Move the four alias-free functions (`THUMB_PX`, `gridThumb`, `exifBlockOf`,
  `dateOnlyExif`) into `src/lib/collection-image.ts` importing only `./image.ts` and
  `./exif-date.ts`; have `collection-photo.ts` re-export them; import them in `import-album.mjs`
  and `exif-date.test.mjs` and delete the copies. (Switching all of `collection-photo.ts` is not
  worth it: its `@/lib/validators` chain is relative-but-extensionless and would need `.ts`
  extensions on six files.)
- **Saving**: ~25 lines; 2 declared clones; one test that finally pins the real `dateOnlyExif`
  rather than its shape.
- **Risk & gate**: low. `npm run check` (runs `exif-date.test.mjs`); a dry run of
  `node scripts/dev/import-album.mjs --limit 1` is a database read the fix session must ask before
  running.
- **Confidence**: high.

### fresh-code-05 - Six dev scripts carry the same 20-line prelude
- **Where**: `scripts/dev/import-album.mjs:74-79,104-119`; `tag-photos-apply.mjs:41-63`;
  `tag-photos-pick.mjs:34-67`; `tag-professions-apply.mjs:47-69`; `tag-professions-pick.mjs:40-75`;
  `backfill-image-dimensions.mjs:33-55`; `sweep-stranded-originals.mjs:46-60`; `run-sql.mjs`
  (outside my list) carries the same `DEMO_REF` guard.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rln 'const value = (name, fallback) => {' scripts` -> 6 files;
  `grep -rln 'const DEMO_REF = "cbvlzptghkuxhygyaezq"' scripts` -> 7 files. jscpd reports eight
  clone pairs among these files, all in this prelude (`backfill [31:55-40:6]` vs `import-album
  [72:73-81:6]`, vs `tag-photos-apply [39:74-50:6]`, vs `tag-photos-pick [32:21-48:6]`, vs
  `tag-professions-apply [45:42-57:55]`, vs `sweep [48:82-60:2]`, vs `run-sql [40:1-54:37]`;
  `tag-photos-apply [49:34-65:42]` vs `tag-photos-pick [51:25-69:53]`). `_env.mjs` already
  exists beside them and exports only `readEnv`/`loadEnv`.
- **What to do**: Add to `scripts/dev/_env.mjs`: `readArgs(argv)` returning `{ flag, value }`, and
  `connectionFor(envFile)` that reads the env, refuses a missing URL, applies the demo-ref guard
  and returns `{ env, url }`. Replace the prelude in all seven scripts. Keep the literal
  `const OUT = path.join(process.cwd(), "scripts", "dev", ".<name>")` and `database: envFile` lines
  in the pick/apply scripts -- `scripts/qa/hand-run-passes.test.mjs:57-70` pins those by regex.
- **Saving**: ~100 lines; 8 jscpd clones (the largest cluster in my territory).
- **Risk & gate**: low-medium (these scripts touch the live database; the change is mechanical).
  `npm run check` runs `hand-run-passes.test.mjs`; then a `--dry`/default dry run of each script
  is a database read the fix session must ask before running.
- **Confidence**: high. The brief's caution that hand-run-pass sameness "may be the protocol"
  applies to their SHAPE (dry-by-default, undo log, working folder), which the test pins; the
  argument parser and the connection guard are not part of that shape and the spec does not name
  them.

### fresh-code-06 - The six-field photo-meta normalisation is written three times, and its type twice
- **Where**: `src/app/(main)/collection/actions.ts:524-532` and `:1312-1319`;
  `src/app/(main)/admin/review/actions.ts:69-76`; the input types at `collection/actions.ts:454-467`
  (`contributePhotoDirect`), `:1279-1287` (`editPhoto`) and `admin/review/actions.ts:33-40`
  (`ReviewAnswers`); the function they all feed at `src/lib/collection-photo.ts:66-74`
  (`parsePhotoMeta`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Every call site does `caption: x.caption || undefined, buckets: x.buckets?.filter(Boolean), era: x.era || undefined, datePrecision: x.datePrecision || undefined, photoYear: x.photoYear, photoMonth: x.photoMonth` --
  and `parsePhotoMeta` itself then does `raw.caption || undefined` and `raw.buckets?.length ? raw.buckets : undefined`
  again (`collection-photo.ts:76-78`). The normalisation is happening twice per call.
- **What to do**: Export `type PhotoMetaInput` from `collection-photo.ts`, make `parsePhotoMeta`
  the one place that coerces empties (it nearly is), and have the three callers pass their input
  through directly. `ReviewAnswers` becomes `Pick<PhotoMetaInput, ...>` or is deleted.
- **Saving**: ~20 lines; 3 clones (jscpd caught two of them: `actions.ts [461:7-470:15]` vs
  `[1281:10-1290:15]`).
- **Risk & gate**: low. `npm run check`; edit a photograph from the viewer and approve one from
  `/admin/review`.
- **Confidence**: high.

### fresh-code-07 - `directory-client.tsx` mirrors props into state with an effect, and its facet renderers take a parameter every caller sets to `true`
- **Where**: `src/components/directory/directory-client.tsx:168-173` (the effect);
  `:396-399,423-424,546-547,613-614` (`renderPrimaryFacets(fullWidth, compact)` and its callers);
  `src/components/admin/content/content-list.tsx:146-147` and
  `src/components/admin/admin-filter-bar.tsx:151,178` (the same `fullWidth` param, third copy).
- **Phase**: hygiene (React signature) + placeholder
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: The effect at 168-173 (`setResults(users); setCursor(nextCursor)` keyed on the
  props) is the textbook "useEffect that mirrors props into state" from brief 5e; it paints one
  frame of the old list before correcting, and its single comment line at 169 is a 170-character
  narration. `collection-client.tsx:238-252` solves the identical problem with React's
  adjust-during-render pattern and explains why. For the parameter: `grep -rn "renderPrimaryFacets(\|renderSecondaryFacets(\|facets(true"`
  shows every call passes `true` (`(true, true)` in the popover, `(true)` in the sheet), so the
  `fullWidth ? ... : undefined` false branch at 399/424/147 is unreachable.
- **What to do**: Replace the effect with the `[seed, setSeed] = useState(users)` +
  `if (users !== seed) {...}` shape from `collection-client.tsx:238`, bumping `listGeneration`
  there. Drop `fullWidth` from both directory renderers and from `AdminFilterBar`'s `facets`
  contract (`(compact?: boolean) => ReactNode`), and inline `className = compact ? "w-full h-9" : "w-full"`.
- **Saving**: ~12 lines; one unreachable branch in three files; one frame of stale list per
  filter change.
- **Risk & gate**: low. `src/lib/directory-rule.test.mjs` pins the `startTransition` around
  `router.push` (untouched). `npm run check`; `/directory`, change a facet, press Load more;
  `/admin/content` facets in the popover and in the sheet at 390px.
- **Confidence**: high.

### fresh-code-08 - The viewer's keyboard effect re-subscribes on every render because `usePinchZoom` returns a new object each time
- **Where**: `src/components/common/image-viewer.tsx:349-388` (deps `[open, onClose, step, expanded, zoom]`);
  `src/components/common/pinch-zoom.ts:489-506` (the return literal).
- **Phase**: hygiene (React signature: effect re-running because its deps are recreated)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `usePinchZoom` memoizes every callback it returns but builds the returned
  object (and the nested `handlers` object) fresh on every render, so `zoom` is never referentially
  stable and the `keydown` listener is removed and re-added on every render of the viewer --
  which, with `chrome`/`expanded`/`overflows` state and a 400ms idle interval, is several times a
  second while it is open.
- **What to do**: Either `useMemo` the return in `usePinchZoom` keyed on its stable members, or
  change the viewer's dep list to the three members it reads (`zoom.zoomed`, `zoom.settleToFit`,
  `zoom.zoomByStep`).
- **Saving**: 0 lines; one listener churn per render removed.
- **Risk & gate**: low. `src/components/common/pinch-zoom.test.mjs` and
  `image-viewer-chrome.test.mjs` are shape pins on strings that do not change. Open a photograph,
  press `+`, `-`, `0`, arrows, Escape.
- **Confidence**: high.

### fresh-code-09 - Constants and literals written more than once
- **Where**:
  - `type BandCount = { key: string; count: number }` x3: `collection/actions.ts:761`,
    `year-rail.tsx:65`, `photo-scrubber.tsx:74` (`collection-client.tsx:61` imports the year-rail one).
  - The four river orders as a list x2: `river-controls.tsx:63-68` (`RIVER_ORDERS`) and
    `collection-data.ts:26` (`ORDERS`), beside the `RiverOrder` union at `river-cursor.ts:11`.
  - `ease: [0.22, 1, 0.36, 1]` x6: `photo-scrubber.tsx:295,328,351,386,398`, `year-rail.tsx:112`.
    Not a token in `motion.tsx` (which exports `[0.16,1,0.3,1]` and `[0.4,0,0.2,1]`). CLAUDE.md:
    "no hand-typed `cubic-bezier(...)`"; `contribute-stage.tsx:159-161` and `image-viewer.tsx:170-172`
    both explain in comments that they avoided exactly this.
  - `"rgba(24, 25, 20, 0.94)"` x2: `image-viewer.tsx:132` (`BACKDROP`), `review-room.tsx:76`
    (`STAGE`, whose comment says "the same warm ink the Collection's own viewer uses").
  - `"... is not a year we can file ..."` x2: `contribute-room.tsx:610`, `review-room.tsx:199`
    (wording differs by three words, so a reader would think they are different rules).
  - `"An admin looks at new photographs before they appear."` x2: `contribute-room.tsx:840,1006`.
  - `SWIPE_PX = 70; SWIPE_VELOCITY = 420` in `contribute-stage.tsx:168-169` copied from
    `pinch-zoom.ts:84-85` with a comment saying so.
- **Phase**: dedupe + hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **What to do**: `BandCount` lives in `river-cursor.ts` or `collection.ts` and is imported;
  `RIVER_ORDERS` moves beside `RiverOrder` in `river-cursor.ts` and `collection-data.ts` derives
  `ORDERS` from it; add `EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const` to `motion.tsx` (that is
  the curve) and import it in both files; export `VIEWER_INK` from `image-viewer.tsx` or a token
  in `globals.css` and use it in the review room; put `YEAR_UNREADABLE_MESSAGE` beside
  `yearUnreadable` in `collection.ts`; export `SWIPE_DISTANCE`/`SWIPE_VELOCITY` from
  `pinch-zoom.ts`.
- **Saving**: ~10 lines; 6 rule violations (the easing); 5 literal pairs that can drift.
- **Risk & gate**: low. `npm run check` (the protocol audit will not object to a named token).
- **Confidence**: high.

### fresh-code-10 - `photo-carousel.tsx` hand-rolls a cubic-bezier solver that `motion` already exports
- **Where**: `src/components/common/photo-carousel.tsx:71-86` (`ease`, a 12-iteration bisection
  over the Bernstein form of `EASE_OUT_SMOOTH`).
- **Phase**: library
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -rln cubicBezier node_modules/motion/dist/` -> `motion.js`, `motion.dev.js`;
  `motion` (already a dependency) exports `cubicBezier(x1, y1, x2, y2)` returning the same
  `t -> y` function. The hand version is 16 lines plus a comment defending the bisection.
- **What to do**: `import { cubicBezier } from "motion"; const ease = cubicBezier(...EASE_OUT_SMOOTH);`
- **Saving**: ~15 lines; 0 deps (already present).
- **Risk & gate**: low. Open a post with three photographs, press the arrow, watch the slide.
  `motion`'s `cubicBezier` is the same solver Motion uses for its own transitions, so the curve is
  identical by construction.
- **Confidence**: high.

### fresh-code-11 - Every `SpringPress` caller casts an object literal to `object` to smuggle button attributes past its prop type
- **Where**: `src/components/common/motion.tsx:150-161` (the cause: props are
  `{ children; className?; onClick?; as? } & MotionProps`, no HTML attributes);
  the casts in my files at `contribute-room.tsx:976`, `create-post-form.tsx:857-866,885-891`;
  the same cast at 9 other non-lab sites (`comments-section.tsx:472`, `attach-image-dialog.tsx:188`,
  `location-picker.tsx:319,362`, `tag-input.tsx:91`, `photo-attachments.tsx:151,165`,
  `progress-rail.tsx:94,158`) and 26 lab sites (`grep -rn "} as object)" src`).
- **Phase**: hygiene (type sludge)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `{...({ type: "button", disabled, title, "aria-label": ... } as object)}` is the
  shape at every site. `as object` erases the type entirely, so a typo in `aria-lable` compiles.
- **What to do**: Widen `SpringPress`'s props to `ComponentPropsWithoutRef<"button"> & { as?; ... } & MotionProps`
  (or a per-`as` union) so callers spread plain attributes. Delete the 38 casts.
- **Saving**: 38 casts; ~0 lines; a real type on 12 shipped controls.
- **Risk & gate**: low. `npm run check` (TypeScript will complain at every site that passed
  something `button` does not accept, which is the point).
- **Confidence**: high. The fix lives in `motion.tsx`, which is the common lens's file; listed
  here because the two worst callers are in my territory.

### fresh-code-12 - `drive.mjs` carries four one-off diagnosis scenarios whose findings are now pinned by unit tests
- **Where**: `scripts/qa/drive.mjs:93-236` (`dateField`, 144 lines), `:243-287` (`wells`),
  `:295-350` (`confirmDelete`), `:357-452` (`focusStates`, 96 lines).
- **Phase**: dead / relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous (with the rule stated below
  as the owner's standing instruction)
- **Evidence**: Each scenario's own docblock names the bug it was written to diagnose on a
  date, and each bug now has a pin: `dateField` -> `src/lib/collection-date.test.mjs:268-305`
  ("THE DAY THE ARCHIVE ATE FIFTEEN YEARS"); `focusStates` -> `src/components/ui/focus-recipe.test.mjs`;
  `wells` -> `src/components/common/attach-well.test.mjs`; `confirmDelete` ->
  `src/components/common/confirm-dialog.test.mjs`. `dateField` also depends on
  `e2e/.shots/date-probe.jpg` (`:120`), which is inside a gitignored folder (`.gitignore:41`), so
  it cannot run from a fresh clone. The brief quotes the owner: "stricter rules about which test
  scripts we keep would be good."
- **What to do**: Delete the four scenarios; keep `slide`, `create`, `profile`, `houses`,
  `places`, `poll` (generic flows that photograph a surface for judgment). Add one line to
  `scripts/README.md` beside `drive.mjs`: "A scenario is a way to LOOK at a flow. A scenario
  written to diagnose one bug is deleted once the bug's pin exists."
- **Saving**: ~300 lines; one gitignored fixture dependency.
- **Risk & gate**: low; nothing imports these. `node scripts/qa/drive.mjs` with no argument
  still lists the remaining scenarios.
- **Confidence**: medium. `wells` and `confirmDelete` do take screenshots a person might want to
  look at again; if the owner wants a "look at the attach well" scenario kept, keep `wells` and
  drop the other three.

### fresh-code-13 - `sweep-stranded-originals.mjs` and the `collection/` root in `COLLECTION_ORIGINAL_KEY` are self-declared one-offs
- **Where**: `scripts/dev/sweep-stranded-originals.mjs` (161 lines; header 32-36: "RUN IT TWICE
  ... After that second run this script has no live question to answer and should be deleted
  along with its line in scripts/README.md"); `scripts/README.md:79`; `src/app/(main)/collection/actions.ts:434-435`
  (the regex accepts `staging|collection`, with 429-433: "Safe to narrow to `staging/` alone once
  nothing old is in flight -- which is any time after the deploy") and `:481` (the
  `startsWith("staging/") ? "staging" : "collection"` root argument that exists only for the
  second root).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous after one live check
- **What to do**: Fix session runs `node scripts/dev/sweep-stranded-originals.mjs` (dry; reads
  the bucket and the database, so ask first). If it reports 0 to delete, delete the script and
  its README row, narrow the regex to `^staging\/...`, and drop the ternary at `:481` to
  `keyBelongsTo(input.key, session.user.id, "staging")`. If it reports more than 0, the second
  run the header asks for has not happened; run it with `--apply` (owner's call) and then delete.
- **Saving**: ~165 lines; one regex branch and one ternary in a security check.
- **Risk & gate**: low. `src/lib/image-purge-rule.test.mjs` and `security-regressions.test.mjs`
  may pin the key regex by shape -- grep them for `COLLECTION_ORIGINAL_KEY` before narrowing and
  update the pin in the same commit.
- **Confidence**: high that it is temporary (three comments say so); medium on whether the
  second run has already happened, which is the live check.

### fresh-code-14 - `backfill-image-dimensions.mjs` is a one-off whose job may be done
- **Where**: `scripts/dev/backfill-image-dimensions.mjs` (128 lines; header: "This is the
  one-off that fills them in"); `scripts/README.md:71`; its `bytesFor` at `:91-96` duplicated at
  `tag-photos-pick.mjs:122-127` (jscpd `[91:1-96:2]` vs `[122:1-127:2]`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: owner (needs a live count)
- **What to do**: Run this SELECT first (read-only):
  `SELECT count(*) FROM (SELECT DISTINCT jsonb_array_elements_text("images"::jsonb) u FROM "Post" WHERE "images" IS NOT NULL AND "images" <> '' AND "images" <> '[]' UNION SELECT DISTINCT jsonb_array_elements_text("images"::jsonb) FROM "CatchupEntry" WHERE "images" IS NOT NULL AND "images" <> '' AND "images" <> '[]') x WHERE u NOT IN (SELECT url FROM "Image");`
  If 0, delete the script and the README row. If not 0, run the backfill once more (owner's
  call), then delete. Either way move `bytesFor` into `_env.mjs` or a `_fetch.mjs` beside it if
  `tag-photos-pick.mjs` keeps needing it.
- **Saving**: ~128 lines; 1 clone.
- **Risk & gate**: low. New uploads record themselves (`image-facts.test.mjs:120-131` pins that
  every display-image path calls `describeImage` and `recordImage`), so the backfill has no
  ongoing job once the historical rows are done.
- **Confidence**: medium. The README calls it safe to re-run, which is a reason some sessions
  keep such scripts "just in case"; that is the habit the owner asked to end.

### fresh-code-15 - `apple-edge/look.mjs` writes screenshots to a repo-root folder
- **Where**: `scripts/dev/apple-edge/look.mjs:17` (`const OUT = '.tmp-shots/edge'`), `.gitignore:99`
  (`.tmp-shots/`).
- **Phase**: relocate
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: CLAUDE.md: "screenshots go to `e2e/.shots/`... Nothing puts an image at the repo
  root any more." The folder is gitignored so it never shows in `git status`, which is exactly how
  a root entry survives; `grep -rln tmp-shots scripts src docs` -> only this file.
- **What to do**: `const OUT = 'e2e/.shots/edge'`; delete `.gitignore:99`; remove the folder if it
  is on disk.
- **Saving**: one root entry; 1 gitignore line.
- **Risk & gate**: none. Not run by anything.
- **Confidence**: high.

### fresh-code-16 - `BucketTiles` takes a `mixed` prop nothing passes
- **Where**: `src/components/collection/bucket-tiles.tsx:55-64` (prop + docblock), `:78`
  (`some`), `:102-103` (the half-lit class branch).
- **Phase**: placeholder (a prop no caller passes)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -rn "mixed" src --include=*.tsx | grep -v bucket-tiles` -> no JSX usage.
  `git log -S"mixed={" -- src/components/collection` -> `0d7ae30 feat(collection): contributing
  is a carousel, not a wall` removed the only caller; `contribute-room.tsx:542-545` says the
  multi-selection "apparatus went with it". The docblock still describes "several photographs at
  once".
- **What to do**: Delete the prop, `some`, and the middle ternary branch.
- **Saving**: ~10 lines; one nested ternary becomes a plain conditional.
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.

### fresh-code-17 - Exports nothing imports (knip, confirmed), and two lib functions that exist only for their tests
- **Where** and the verification for each:
  - `src/components/collection/photo-river.tsx:27` `preloadViewer` -- IS imported (knip false
    positive from the `dynamic()` chain? no: `post-card`, `answer-photos`, `photo-wall` each
    redeclare it rather than import). Resolved by fresh-code-02, not here.
  - `photo-river.tsx:202` `bandsOf`, `:258` `READING_LINE` -- only used in-file;
    `river-query.test.mjs` reads the file as text and `collection-journeys.spec.ts:100` mentions
    it in a comment. Drop `export` on both.
  - `river-controls.tsx:63,70` `RIVER_ORDERS`, `orderLabel` -- only used in-file (moves anyway
    under fresh-code-09).
  - `hoopoe-geometry.ts:32` `H`, `:331` `PEEK_CREST` -- `H` is re-exported by
    `lab/hoopoe-marks/_parts.tsx:25` but nothing imports that re-export either; `PEEK_CREST` is
    used in-file only. Drop `export` on both (keep `G`, which `build-app-icon.mjs` imports).
  - `photo-visibility-rule.ts:23` `PHOTO_SCOPES` -- exists to derive the `PhotoScope` type; make
    it a non-exported const.
  - `edit-photo-dialog.tsx:57-67` `type PhotoPatch` -- 11 lines, `grep -rn PhotoPatch src` finds
    no other use; `onSaved` at `:79` is its only consumer and `collection-client.tsx:1421` passes
    a plain spread. Delete or inline.
  - `caption-tidy.ts:93-95` `captionNeedsTidying` -- used only by `caption-tidy.test.mjs`; its
    docblock claims "The review room says so out loud only when it did", and `review-room.tsx`
    does not call it. Delete the function and its three test cases, or wire it into the review
    room (an owner nicety; not proposed here).
  - `photo-visibility-rule.ts:116` `storedClassYears`, `:152` `PHOTO_NOT_VISIBLE`, `:70`
    `MAX_CLASS_YEARS` -- used only by their test. `storedClassYears` is the write-path reader the
    comment at 87-95 promises; nothing writes an audience list through it yet
    (`photoRowData` in `collection-photo.ts` takes `classYears` straight from `contributionScope`).
    Placeholder for a later multi-class write. Keep `MAX_CLASS_YEARS` (it bounds `classYearsOf`);
    flag `storedClassYears` and `PHOTO_NOT_VISIBLE` as parked-with-a-test rather than delete: the
    territory agent for the class collection should say whether the write path is coming.
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous (except the two parked ones)
- **Saving**: ~20 lines; 7 `export` keywords; 1 dead type.
- **Risk & gate**: `npm run check` (knip is not in the gate; `tsc` is).
- **Confidence**: high on the confirmed ones.

### fresh-code-18 - `syncGuideFromHistory` and `resetGuide` are the same function
- **Where**: `src/lib/guide-open.ts:73-77` and `:80-84`.
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Both bodies are `if (current === null) return; current = null; emit();`. The
  two names say why each is called (popstate vs route change), which is worth keeping as the
  CALL SITE's comment in `guide-layer.tsx:33,45`, not as two functions.
- **What to do**: One `closeGuideSilently()` (no `history.back()`), two callers with a one-line
  comment each; or keep one name and alias the other with `export const resetGuide = syncGuideFromHistory`.
- **Saving**: 5 lines.
- **Risk & gate**: none beyond `npm run check`.
- **Confidence**: high.

### fresh-code-19 - Stale, misplaced or orphaned comments, and the three unused locals `tsc` reports
- **Where** (each with what makes it stale rather than reasoned):
  - `src/lib/photo-layout.ts:383-391`: "`drawnSize` ... nothing in the app calls this. It exists so
    the rule can be ASSERTED" -- false since `photo-carousel.tsx:236` and `lab/crop/page.tsx:49`
    call it. Rewrite the sentence.
  - `photo-layout.ts:93-96`: "There used to be a horizontal band beside this one ... a case that
    no longer exists". Describes deleted code (audit-1 rule: comments about deleted code are
    bloat). Cut to the one line that says nothing is trimmed at the sides.
  - `src/lib/image.ts:33-49`: the `MAX_STORED_PIXELS` docblock is separated from
    `MAX_STORED_PIXELS` (line 71) by the whole `toDisplayWebp` docblock and function (50-69). Move
    `toDisplayWebp` above it.
  - `src/components/collection/photo-river.tsx:29-38`: `warmThumbs`'s docblock sits above
    `landAt` (49); `warmThumbs` is at 74 with no docblock.
  - `src/components/collection/contribute-room.tsx:43-49`: the header says "when" is decade pills
    instead of two dropdowns; `photo-questions.tsx:62-69` says the pills were scrapped on
    2026-08-28 for one numeric box. `:108-120`: three paragraphs saying where code "moved to"
    (photo-questions.tsx, lib/collection.ts, attach-image-dialog.tsx) -- 13 lines describing
    absence; the imports at 65-80 already say where things live.
  - `src/components/posts/create-post-form.tsx:69-71` ("moved to src/lib/rich-text-editing.ts
    (2026-08-13)"), `:636-640` ("No ring overlay any more ... used to draw its own inset ring").
  - `src/app/(main)/collection/actions.ts:392-394` (see fresh-code-01 notes) and `:38` (the
    `isImageFile,}` formatting glitch).
  - `tsc --noUnusedLocals`: `answer-photos.tsx:149` (`photo` in `(photo, i, cell)`),
    `photo-river.tsx:472` (`i` in `(p, i, cell)`), `post-card.tsx:553` (`photo`). Rename to `_`.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Saving**: ~40 comment lines; 3 unused parameters; one glitch.
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high. For contrast, a reasoned comment I am NOT proposing to touch:
  `collection-client.tsx:1295-1308` explains why the head sentinel is `h-px -mb-px` with the
  measurement that found the 1px shift -- that is the Owner Detail Standard working as intended.

### fresh-code-20 - `create-post-form.tsx`: repeated class strings, a one-caller parameter and three nested ternaries
- **Where**: `src/components/posts/create-post-form.tsx:927-929,944-946,977-979` (three menu
  items with an identical 170-character class string), `:1004-1013,1024-1029` (two audience
  chips, same class pair), `:223,1257` (`expand(startKind?)`, one caller, always `"post"`),
  `:216-220`, `:531-536`, `:1137-1145` (nested ternaries; 5d says none), `:216-217` (the letter
  placeholder string duplicated from `SCOPE_PLACEHOLDER.letter` at 90).
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **What to do**: A `MENU_ITEM` const (or a tiny `MenuItem` component taking `on`/`icon`/label)
  and a `CHIP` const; `expand()` with no parameter; three small lookup objects or early returns
  for the labels; `SCOPE_PLACEHOLDER[kind]` at 216.
- **Saving**: ~25 lines.
- **Risk & gate**: low. `npm run check`; open the composer on `/feed`, the `+` menu, attach a
  photo, toggle letter, post. `npm run visual` (feed is masked past the header).
- **Confidence**: high. The file is 1,287 lines with a 570-line `editorBody` JSX constant; its
  size is the feed territory agent's question, not this lens's.

### fresh-code-21 - `directory-client.tsx`: a three-way nested JSX ternary and two identical batch tiles
- **Where**: `src/components/directory/directory-client.tsx:641-779` (`browseView === "people" ? ... : browseView === "map" ? (cityPins... ? ... : ...) : ...`),
  `:752-763` and `:766-776` (two `<button>` tiles with the same 200-character class string),
  `:386-390` (`views` + `viewSegments` built from a lookup that could be a three-entry literal),
  `:651-658` and `:719-735` (two empty-state cards of the same shape). Lines 641-779 are also
  mis-indented (the JSX inside `<m.div>` is at the outer level).
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **What to do**: Three small components (`PeopleView`, `MapView`, `BatchesView`) selected by a
  lookup keyed on `browseView`; a `BatchTile` component for the two buttons; a literal
  `VIEW_SEGMENTS`. Run Prettier on the file.
- **Saving**: ~30 lines; one nested ternary; two clones.
- **Risk & gate**: low. `npm run check`; `/directory` all three views at 1440 and 390;
  `npm run visual` (directory is masked to the map and headcount, so a red there is real).
- **Confidence**: high.

### fresh-code-22 - `collection-client.tsx`: small local duplications
- **Where**: `src/components/collection/collection-client.tsx:259-263` vs `:267-271` (the queue
  seed object built twice), `:1283-1288` ("Show everything" repeats the four clears in
  `chooseScope` at 350-353 minus `setScope`), `:1106` and `:1124` (`{!trulyEmpty && (` twice
  around adjacent siblings), `:562` (`wantsNewer = useCallback(() => movingUp.current || window.scrollY <= 0, [])`
  reads only refs and globals -- a module function or a plain closure serves; it is a dep of two
  effects so keep it stable but it need not be a hook), `:356-370` (a hand-rolled 300ms debounce
  via ref + effect; `directory-client.tsx:126,175-183,270-271` and `search-pill` have their own
  shapes of the same thing).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **What to do**: `const queuesFrom = () => ({...})` used by both the initializer and the reset;
  `clearQuery()` used by "Show everything" and by `chooseScope`; one `{!trulyEmpty && (<>...</>)}`.
  The debounce: a `useDebouncedValue(value, 300)` in `src/lib` would serve the Collection and the
  directory, but audit 1's lesson applies (two callers, a docblock, two imports: line-neutral).
  Propose it only if a third debounce appears.
- **Saving**: ~15 lines.
- **Risk & gate**: low. `e2e/collection-journeys.spec.ts` and `river-query.test.mjs` pin the
  behaviours around these lines by name (`wantsNewer()`, `fetchPage`, `loadNewer`); keep those
  identifiers. `npm run check`.
- **Confidence**: high.

### fresh-code-23 - The permalink route queries the photograph and the viewer's row twice per load
- **Where**: `src/app/(main)/collection/[id]/page.tsx:51-63` (`generateMetadata`: `photo.findUnique`
  + `user.findUnique`) and `:96` -> `src/app/(main)/collection/actions.ts:957-986` (`loadPhoto`:
  the same two lookups with a wider select).
- **Phase**: architecture (efficiency)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Next runs `generateMetadata` and the page for the same request; `auth()` is
  `cache()`d (audit 1 established this) but the two Prisma calls are not, so a permalink costs 4
  row lookups where 2 would do, and the visibility decision is made twice.
- **What to do**: Wrap `loadPhoto` in React's `cache()` (it is a server action module, so put the
  cached reader in `collection-data.ts` and have `loadPhoto` and `generateMetadata` both call it),
  and have `generateMetadata` take the caption from the cached `PhotoData`.
- **Saving**: 2 queries per permalink load; ~15 lines (the duplicate select and decision).
- **Risk & gate**: low. `e2e/collection-permalink.spec.ts` covers the route; also open a class
  photograph's permalink as the owner and as Jerry (`/api/dev-login`) to confirm the 404 for the
  wrong class still holds.
- **Confidence**: high.

### fresh-code-24 - The same "one reading per animation frame" scroll throttle in two files
- **Where**: `src/components/collection/photo-river.tsx:348-356` and
  `src/components/collection/photo-scrubber.tsx:194-202` (identical `let frame = 0; const onScroll = () => { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; read(); }); }` plus the `cancelAnimationFrame` cleanup).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **What to do**: `export function onScrollFrame(fn): () => void` in `src/lib/dom.ts` (or beside
  `landAt` in `photo-river.tsx`, which the scrubber already imports from) that adds the listener
  and returns the remover.
- **Saving**: ~12 lines; 1 clone. Honest note: two callers, a docblock and two imports is close
  to line-neutral (audit-1 lesson); the value is one place to get the passive flag and the
  cancel right. Mark optional.
- **Risk & gate**: low. `e2e/collection-seek.spec.ts` "the rail says where the reader is after a
  jump" exercises exactly this path on `/lab/collection`.
- **Confidence**: medium (worth it only if a third scroll reader appears; there are three
  IntersectionObserver sentinels too -- `collection-client.tsx:716-727,881-932`,
  `lab/collection/page.tsx:198-223` -- but the head one carries bespoke logic and I do not
  recommend a `useSentinel` for them).

### fresh-code-25 - `PhotoScope` string checks written both as `=== "class"` and via `isValley`
- **Where**: `src/app/(main)/collection/actions.ts:157` (`p.scope === "valley" ? "valley" : "class"`)
  beside `src/lib/photo-visibility-rule.ts:144-146` (`isValley`, whose docblock is the argument for
  reading the column strictly); `collection-data.ts:68` (`one("scope") === "class" ? "class" : "valley"`,
  deliberately the opposite failure direction, with a comment saying why).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **What to do**: `shape()` uses `isValley(p.scope) ? "valley" : "class"` so the strict reading
  has one name; leave `collection-data.ts:68` alone (its comment explains the reverse default for
  URL input and that is a real difference).
- **Saving**: 0 lines; one fewer hand-written copy of a security comparison.
- **Risk & gate**: `photo-visibility-rule.test.mjs` and `security-regressions.test.mjs`; `npm run check`.
- **Confidence**: high.

## Owner decisions

**The FormData fallback for contributing (`contributePhoto`).** Every photograph you add to the
Collection normally goes straight from the browser to the storage bucket; the server only
processes it afterwards. There is a second, older route that sends the whole file through the
server instead, and it is used only when the direct route is unavailable: on a laptop with no
bucket configured, on a preview address the bucket does not recognise, or when a slow upload times
out. It shrinks the photo first (so it is not full resolution) and it re-encodes at a different
size than the main route. Recommendation: keep the fallback (a stranded photograph is worse than a
smaller one) but merge its server half into the main route's (fresh-code-01) so the two cannot
drift again -- the shrink is the only thing that should differ. If you would rather it did not
exist in production at all, the cut is about 150 server lines plus `image-downscale.ts`'s use in
the contribute room, and it needs the presign route to be certain R2 is always configured.

**`/lab/crop` and its 1.9 MB of photographs.** The room's own header says: "Throwaway. Delete
this room, public/lab/crop/ and its registry row once the rules are settled", and line 6 says the
rules are chosen and shipped. `public/lab/crop/` is 14 files, 1.9 MB of tracked bytes, and
`_specimens.ts` + `page.tsx` are 610 lines. One thing depends on it: `/lab/collection`'s
made-up archive (`_archive.ts:3`) uses the same eleven specimen photographs, and its header asks
that they "move somewhere shared rather than going with it" when the room is retired.
Recommendation: retire the room; move `SPECIMENS` and the eleven WebPs to a shared lab fixture
folder (`src/app/lab/_fixtures/` and `public/lab/fixtures/`) that `/lab/collection` reads. Saving:
462 lines of room, one registry row, and nothing in tracked bytes unless you also decide the
Collection room can use fewer than eleven shapes.

**`/lab/focus`.** Its verdict shipped: column A became `field-focus.ts` and `focus-modality.tsx`,
and `focus-recipe.test.mjs` holds every field to it. The room's header still says "That is the 15
lines the real thing would need in the root layout" -- those 15 lines now exist as `<FocusModality>`.
Recommendation: mark it `archived` in the registry (the way `/lab/viewer` already is) rather than
delete it; it is the record of a decision you made by looking.

**`/lab/collection/swap`.** Round three of the scope-swap design, built to your own brief
("something clean, move in the title and somehow a cute loading"). The shipped `collection-client`
still does the "Today" behaviour the room reproduces for comparison (dim, hold, swap). So the room
is either a decision still pending or one you made against it. Recommendation: say which. If you
picked "nothing until everything", it is a feature request for the collection territory agent; if
not, archive the room. Either way the viewer-image copy inside it goes (fresh-code-03).

**One-off scripts: `sweep-stranded-originals.mjs` and `backfill-image-dimensions.mjs`.** Both
say in their own words that they are one-offs. Each needs one live check before deletion
(fresh-code-13 and 14 write the check). Recommendation: let the fix session run the two read-only
checks and delete whichever reports nothing left to do. This is the "stricter rules about which
scripts we keep" you asked for, applied.

**`drive.mjs` scenarios.** Four of its ten scenarios were written to diagnose specific bugs on
specific days and each bug now has a unit test. Recommendation: delete the four and write the
rule into `scripts/README.md` (fresh-code-12). If you like having a way to screenshot the attach
well or the delete confirmation on demand, keep those two and drop the other two.

## Not-findings

- **`src/lib/photo-layout.ts` at 3.65 comment-to-code (460 comment lines, 126 code).** Every
  paragraph carries an owner quote with a date, a measured number (728px columns, 41 photographs,
  14 within 3% of an edge), a spec section or a rejected alternative with the reason. It is the
  written record of the crop decision the owner made in `/lab/crop`, which is exactly what the
  Owner Detail Standard asks for. Only two paragraphs describe deleted code (fresh-code-19).
- **`collection-client.tsx` at 1,469 lines, ~60% comment.** Fourteen pieces of state, each with a
  paragraph naming the owner report it answers ("a weird loop of switching from 2020s to
  undated", "2017 wasn't at the top of the page"). The size is the collection territory agent's
  call; from this lens the file has no narration, no unearned hook and one small duplication set
  (fresh-code-22). The seek/anchor machinery at 465-932 would be a single-caller hook if
  extracted, which brief 5e lists as a signature, so I do not propose the extraction.
- **The photo-questions / bucket-tiles / edit-photo-dialog / review-room sharing.** Three rooms ask
  the same three questions through one component, as `photo-questions.tsx:11-21` explains. That is
  dedupe already done right.
- **`useClosingDialog`'s one-frame `requestAnimationFrame` open** (`use-closing-dialog.ts:35-43`):
  measured, explained, and it replaces the `somethingMounted` latch pattern for row dialogs. Kept.
- **`photo-scrubber.tsx:242-246` try/catch around `setPointerCapture`** and
  **`exif-date.ts:203-246,270-318` try/catch around byte parsing**: both explain the throw they
  catch (an inactive pointer; hostile bytes inside an upload). Signature 3 does not apply.
  `image-viewer.tsx:196-203` `basename()` try/catch is the one that cannot throw
  (`split`/`slice` on a string) -- 3 lines, folded into fresh-code-19's spirit but not worth its own
  row.
- **The eleven `@next/next/no-img-element` disables in the new photo components.** The rule is
  on for `src/components` (the `off` at `eslint.config.mjs:64` is scoped to `src/app/lab/**`);
  `image-cdn.ts` and the comment at `photo-aim.tsx:287-289` give the reason (`next/image` is the
  metered optimiser spec §4 spent a campaign getting off). Earned. A single config override for
  `src/components/common/photo-*.tsx` would remove eleven lines but hide the decision; not
  proposed.
- **The hand-run pass family's structural sameness** (pick/apply pairs, dry-by-default, undo
  logs, working folders): that is the protocol `docs/spec/hand-run-passes.md` demands and
  `hand-run-passes.test.mjs` enforces. Only the argument parser and connection guard are outside
  it (fresh-code-05).
- **Rule tests that read source as text** (`river-query.test.mjs`, `image-viewer-chrome.test.mjs`,
  `pinch-zoom.test.mjs`, `attach-well.test.mjs`, `focus-recipe.test.mjs`, `loading-boundary-rule.test.mjs`,
  `identity-row-overflow-rule.test.mjs`, `confirm-dialog.test.mjs`, `ci-parity.test.mjs`,
  `hand-run-passes.test.mjs`): audit 1 settled that this pattern is deliberate. Every one names the
  incident it pins. None has lost its subject.
- **`useColumnHeight` and `useRailModel` in `year-rail.tsx`** (single-caller hooks): the first
  isolates a `useLayoutEffect` + resize listener, the second a 115-line `useMemo`; both are
  extractions for readability inside a 558-line file, not abstractions. Kept.
- **`scripts/qa/knip.jsonc`, `ci-parity.test.mjs`, `hand-run-passes.test.mjs`, `focus-modality.tsx`,
  `field-focus.ts`, `guide-layer.tsx`, `carousel-arrow.tsx`, `scope-caret.tsx`, `contributed-hoopoe.tsx`,
  `turnstile-origin-rule.ts`, `text-width.ts`, `caption-tidy.ts` (bar its unused export),
  `admin-review.ts`, `admin/review/*`, `image-record.ts`, `river-cursor.ts`, `photo-rows.tsx`,
  `photo-frame.tsx`, the four e2e specs and the 24 tests**: read in full, clean.

## Audit-1 carry-overs in this territory

- **"The Collection taxonomy SELECT"** (audit 1 §4): moot. The rebuild replaced the dropdown
  with six buckets (`collection.ts:40-72`) and a mapping from the fourteen old values
  (`LEGACY_BUCKETS`), pinned by `collection-taxonomy.test.mjs`.
- **"Collection's filter-row chrome"** (audit 1 §4): moot. The pill row became one line of
  words with a gliding underline (`river-controls.tsx`), search moved onto the title line
  (`search-pill.tsx` live mode), and "When" became the year rail.
- **"A shared paged-list hook for PostFeed" (refuted at fix time)**: still refuted; the
  Collection's river has its own two-direction paging that would not fit such a hook, and I have
  not proposed one (see fresh-code-24's note on sentinels).
- **"The comment mass is the product"**: holds in this territory (see Not-findings). The
  exceptions are listed line by line in fresh-code-19.
- **The 40 madge cycles** are all inside `src/generated/prisma`; none of the new files introduce
  a real cycle (`depcruise.txt` reports 0 violations).

## For other lenses

- `src/components/common/motion.tsx:150-161`: `SpringPress` prop type is the cause of 38
  `as object` casts (fresh-code-11); the fix belongs to whoever owns `common/`.
- `src/components/common/attach-image-dialog.tsx:188`, `location-picker.tsx:319,362`,
  `tag-input.tsx:91`, `catchups/answer/photo-attachments.tsx:151,165`, `progress-rail.tsx:94,158`,
  `posts/comments-section.tsx:472`: the same cast, outside my list.
- `src/components/letters/letter-images.tsx:19,37,51`: a fifth copy of the lazy-viewer + latch
  (fresh-code-02) outside my list.
- `src/components/directory/alumni-map.tsx:30-40` vs `directory-client.tsx:28-38`: the `User`
  interface written twice (jscpd).
- `src/components/directory/profile-card.tsx:45-53` vs `posts/post-card.tsx:139-147`: the author
  shape written twice (jscpd).
- `scripts/dev/run-sql.mjs:40-54`: the same connection/demo-ref prelude (fresh-code-05).
- `scripts/qa/_dir-room-shots.mjs:40-46` vs `drive.mjs:675-688`, and `dev/apple-edge/look.mjs:18-26`
  vs `qa/screenshot-auth.mjs:45-54` vs `qa/tour-mobile-verify.mjs:49-56`: the puppeteer launch
  block (executablePath fallback, `--no-sandbox`) is written at least four times; a `_browser.mjs`
  in `scripts/qa/` would serve all of them.
- `src/app/lab/glass-edges/page.tsx:81-89` (`C` palette) overlaps `src/lib/hoopoe-geometry.ts:48-55`
  (`G`) on canopy/pine/ink/paper; lab lens.
- `src/app/lab/collection/_archive.ts:61` redeclares the six bucket values instead of importing
  `BUCKET_VALUES` from `collection.ts` (which it already imports from).
- `src/app/lab/viewer/page.tsx:37,50` fixture tags ("Weather & Sky", "The Banyan", "Flora") are the
  fourteen-item vocabulary the taxonomy replaced; archived room, cosmetic.
- `src/app/(main)/collection/actions.ts:339-342` encodes the fallback path at `1600`px q80 while
  the direct path stores full resolution at `COLLECTION_WEBP_QUALITY`; the collection territory
  agent should say whether that difference is intended (the memory note says the 1920 box "is the
  FEED's and has fooled two sessions").
- `src/lib/photo-visibility-rule.ts:116` `storedClassYears`: a write-path reader with no write
  path yet; class-collection territory to confirm it is coming.

## Metrics

- Lines read: 29,336 across 110 files (TypeScript/TSX 21,939; test .mjs 3,809; scripts .mjs
  2,720; e2e .ts 1,030; jsonc 34).
- Biggest files: `collection-client.tsx` 1,469; `collection/actions.ts` 1,359;
  `create-post-form.tsx` 1,287; `contribute-room.tsx` 1,067; `image-viewer.tsx` 804;
  `directory-client.tsx` 785; `review-room.tsx` 769; `drive.mjs` 727; `post-card.tsx` 689.
  New files over ~400 lines and their responsibilities: `collection-client` (river state,
  query, URL sync, scroll/seek/anchor, viewer, three dialogs, empty states, render);
  `collection/actions.ts` (two contribute pipelines, river query, permalink, love, approve x2,
  decline, delete, admin remove, edit); `contribute-room` (dialog shell, room state, drop/paste,
  upload lanes, filing, apply-to-all, invitation, finish); `review-room` (pile, keyboard, swipe,
  header, provenance, file-says, verdict tints, decide row, done); `swap/page.tsx` (lab room);
  `collection-seek.spec.ts` (10 Playwright tests); `photo-layout.ts` (one rule, argued);
  `year-rail.tsx` (model, layout, dock); `pinch-zoom.ts` (one gesture state machine);
  `photo-river.tsx` (tile, bands, scrollspy).
- Comment-heaviest in territory (comment/code): `photo-layout.ts` 3.65, `profession-tags.ts` 1.85,
  `image-aim.ts` 1.50, `photo-visibility-rule.ts` 1.42, `collection.ts` 1.29, `image.ts` 1.27,
  `exif-date.ts` 1.20; `src/components/collection` as a directory 0.78.
- eslint-disable: 58 -> 62 non-generated (+4 net); 6 new lines: `@next/next/no-img-element` x4
  (photo-frame/photo-carousel/photo-aim/photo-river), `react-hooks/exhaustive-deps` x1
  (photo-carousel.tsx:246), `react-hooks/set-state-in-effect` x1 (lab/crop/page.tsx:335). The 47 ->
  97 in `raw/type-sludge.txt` includes 50 Prisma-generated headers.
- `tsc --noUnusedLocals`: 3 of 4 hits in my files, all unused destructured parameters.
- jscpd clone pairs touching my files: 34; 8 are the scripts/dev prelude, 2 the lab viewer-image
  mapping, 4 the collection actions (feed-actions love twin, the meta normalisation), the rest
  under 12 lines.
- knip exports in my files: 8, all confirmed (fresh-code-17).
- `"use client"` files in territory: 34; none imports a server-only lib (the one attempt --
  `defaultOrderFor` in `collection-data.ts` -- was caught and moved, `collection.ts:551-558`).
- Hand-typed cubic-bezier arrays in shipped code: 6 (all one curve, fresh-code-09).

## Per-file verdicts

Verdict key: **clean** = read in full, nothing to report; **items** = the finding ids that touch
it; **territory** = fine at this lens but large enough that feature-level structure is the
territory agent's question.

| File | Lines | Verdict |
|---|---|---|
| src/components/collection/collection-client.tsx | 1469 | items 02, 03, 09, 22; territory |
| src/app/(main)/collection/actions.ts | 1359 | items 01, 06, 09, 13, 19, 23, 25 |
| src/components/posts/create-post-form.tsx | 1287 | items 11, 19, 20; territory |
| src/components/collection/contribute-room.tsx | 1067 | items 09, 11, 19 (+ owner: fallback) |
| src/components/common/image-viewer.tsx | 804 | items 08, 09 |
| src/components/directory/directory-client.tsx | 785 | items 07, 21 |
| src/components/admin/review/review-room.tsx | 769 | items 09 (STAGE literal, message) |
| scripts/qa/drive.mjs | 727 | items 12 |
| src/components/posts/post-card.tsx | 689 | items 02, 19; territory |
| src/app/lab/collection/swap/page.tsx | 633 | items 03 (+ owner: room verdict) |
| e2e/collection-seek.spec.ts | 623 | clean |
| src/lib/photo-layout.ts | 619 | items 19 |
| src/lib/collection.ts | 560 | items 09 (`YEAR_UNREADABLE_MESSAGE` home); clean otherwise |
| src/components/collection/year-rail.tsx | 558 | items 09 |
| src/components/common/pinch-zoom.ts | 507 | items 08, 09 |
| src/lib/photo-layout.test.mjs | 501 | clean (spec-grade) |
| src/components/collection/photo-river.tsx | 480 | items 02, 17, 19, 24 |
| scripts/dev/import-album.mjs | 463 | items 04, 05 |
| src/app/lab/crop/page.tsx | 462 | owner: retire room |
| src/components/admin/content/content-list.tsx | 427 | items 07 |
| src/components/common/photo-carousel.tsx | 407 | items 10 |
| src/components/collection/photo-scrubber.tsx | 406 | items 09, 24 |
| src/app/lab/glass-edges/page.tsx | 371 | clean (lab); palette overlap noted for lab lens |
| src/components/collection/photo-questions.tsx | 367 | clean |
| src/lib/hoopoe-geometry.ts | 361 | items 17 |
| src/components/layout/search-pill.tsx | 360 | clean |
| src/components/collection/contribute-stage.tsx | 352 | items 09 (swipe numbers); indentation at 268-311 |
| src/lib/profession-tags.ts | 332 | clean |
| src/lib/exif-date.ts | 330 | clean |
| src/lib/river-cursor.test.mjs | 328 | clean (spec-grade) |
| src/lib/image.ts | 327 | items 19 |
| src/app/lab/collection/page.tsx | 323 | items 03; `by` sort type annotations repeated x3 (cosmetic) |
| src/components/common/photo-aim.tsx | 320 | clean (`stageOf` returns an unused `frame`; cosmetic) |
| src/lib/exif-date.test.mjs | 305 | items 04 |
| src/lib/collection-date.test.mjs | 305 | clean (spec-grade) |
| e2e/collection-journeys.spec.ts | 276 | clean |
| src/lib/photo-suggest.ts | 272 | clean |
| src/components/common/float-field.tsx | 272 | clean |
| src/components/collection/river-controls.tsx | 264 | items 09, 17 |
| src/lib/photo-visibility-rule.test.mjs | 259 | clean |
| scripts/dev/tag-professions-apply.mjs | 248 | items 05 |
| scripts/dev/tag-professions-pick.mjs | 245 | items 05 |
| scripts/dev/tag-photos-apply.mjs | 245 | items 05 |
| src/lib/photo-visibility-rule.ts | 240 | items 17, 25 |
| src/components/common/photo-rows.tsx | 236 | clean |
| src/lib/photo-suggest.test.mjs | 232 | clean |
| src/app/(main)/collection/collection-data.ts | 224 | items 09, 23 |
| src/components/collection/edit-photo-dialog.tsx | 196 | items 17 (`PhotoPatch`) |
| src/components/catchups/round/answer-photos.tsx | 192 | items 02, 19 |
| src/app/lab/viewer/page.tsx | 192 | clean (archived room) |
| scripts/dev/tag-photos-pick.mjs | 192 | items 05, 14 (`bytesFor`) |
| src/app/lab/focus/page.tsx | 188 | owner: archive (verdict shipped) |
| src/app/lab/collection/_archive.ts | 177 | clean; local `BUCKET_VALUES` noted for lab lens |
| src/components/common/photo-frame.tsx | 176 | clean |
| src/components/collection/river-query.test.mjs | 173 | clean |
| src/lib/admin-review.ts | 171 | clean |
| src/lib/river-cursor.ts | 167 | items 09 (home for `RIVER_ORDERS`/`BandCount`) |
| scripts/dev/sweep-stranded-originals.mjs | 161 | items 05, 13 |
| src/lib/collection-taxonomy.test.mjs | 153 | clean |
| src/app/lab/crop/_specimens.ts | 148 | owner: retire with room (move SPECIMENS first) |
| src/lib/edge-light.ts | 145 | clean |
| src/lib/profession-tags.test.mjs | 143 | clean |
| src/lib/image-facts.test.mjs | 139 | clean |
| src/lib/image-record.ts | 138 | clean |
| src/components/collection/bucket-tiles.tsx | 136 | items 16 |
| src/app/(main)/admin/review/actions.ts | 134 | items 06 |
| scripts/dev/backfill-image-dimensions.mjs | 128 | items 05, 14 |
| src/lib/app-icon-safe-zone.test.mjs | 122 | clean |
| src/components/catchups/round/photo-wall.tsx | 119 | items 02 |
| src/app/(main)/collection/[id]/page.tsx | 119 | items 23 |
| src/app/lab/hoopoe-marks/_parts.tsx | 113 | clean |
| src/components/ui/focus-recipe.test.mjs | 111 | clean |
| src/app/(main)/image-aim.ts | 108 | clean |
| scripts/qa/hand-run-passes.test.mjs | 106 | clean |
| src/components/common/image-viewer-chrome.test.mjs | 104 | clean |
| src/components/common/carousel-arrow.tsx | 101 | clean |
| src/components/common/pinch-zoom.test.mjs | 100 | clean |
| src/lib/caption-tidy.ts | 95 | items 17 |
| src/components/collection/scope-caret.tsx | 95 | clean |
| scripts/qa/ci-parity.test.mjs | 90 | clean |
| src/lib/caption-tidy.test.mjs | 88 | items 17 (three cases go with the export) |
| src/lib/guide-open.ts | 84 | items 18 |
| src/lib/mark-centring.test.mjs | 83 | clean |
| src/components/common/use-closing-dialog.ts | 81 | clean |
| e2e/loading-fallbacks.spec.ts | 80 | clean |
| src/components/ui/field-focus.ts | 73 | clean |
| src/lib/identity-row-overflow-rule.test.mjs | 72 | clean |
| src/lib/text-width.ts | 70 | clean |
| scripts/dev/build-app-icon.mjs | 70 | clean |
| src/lib/turnstile-origin-rule.test.mjs | 69 | clean |
| src/lib/text-width.test.mjs | 67 | clean |
| src/lib/rich-text-editing.test.mjs | 67 | clean |
| src/components/common/attach-well.test.mjs | 66 | clean |
| src/lib/loading-boundary-rule.test.mjs | 61 | clean |
| src/lib/turnstile-origin-rule.ts | 60 | clean |
| src/app/(main)/admin/review/page.tsx | 58 | clean |
| src/components/guide/guide-layer.tsx | 57 | clean |
| src/components/mascot/moments/contributed-hoopoe.tsx | 56 | clean |
| e2e/collection-permalink.spec.ts | 51 | clean |
| src/app/(main)/collection/(index)/page.tsx | 48 | clean |
| src/components/common/focus-modality.tsx | 45 | clean |
| scripts/dev/apple-edge/look.mjs | 45 | items 15 |
| src/app/(main)/letters/(index)/loading.tsx | 44 | clean |
| src/app/(main)/admin/review/loading.tsx | 42 | clean |
| src/app/(main)/letters/[id]/(read)/loading.tsx | 40 | clean |
| src/components/common/confirm-dialog.test.mjs | 38 | clean |
| scripts/qa/knip.jsonc | 34 | clean |
| src/lib/valley-year.test.mjs | 27 | clean |
| src/components/collection/collection-skeleton.tsx | 27 | clean |
| src/app/(main)/collection/(index)/loading.tsx | 5 | clean |

Answers to the charter's explicit questions, in one place:

- **Six signatures per file**: listed in the table; no file shows more than two. Signature 1
  (single-use helper) appears only as `keptAt` in `photo-layout.ts:207` (kept; it names a
  concept). Signature 2 (once-used type) appears as `PhotoPatch` (17) and `ReviewAnswers` (06).
  Signature 3 (defensive try/catch) only in `basename()` (19 note). Signature 4 (intermediates)
  only `hasMore = overflows` at `image-viewer.tsx:503`. Signature 5 (one-caller config) does not
  appear. Signature 6 (narration) at the lines in fresh-code-19.
- **An effect that exists to undo another effect**: none. The closest is the pair in
  `collection-client.tsx:590-677` (query effect) and `:835-873` (layout effect that lands the
  scroll), which is one decision carried across a commit boundary and explained at 654-663.
- **A prop threaded through three levels**: `onSeek` goes `collection-client -> YearRail -> RailRow`
  and `collection-client -> PhotoScrubber` (two levels); `onAnswer` goes
  `review-room/contribute-room/edit-photo-dialog -> PhotoQuestions -> WhenField` (two levels). No
  three-level threading; no context proposed.
- **A hook extracted for a single caller**: `useColumnHeight`, `useRailModel` (year-rail),
  `useActiveBand` (photo-river), `useClosingDialog` (two callers). All kept, reasons in
  Not-findings.
- **New files over ~400 lines**: nine, listed under Metrics with responsibilities.
- **Patterns that repeat across the set**: the lazy viewer + latch (5 sites, 02); the
  viewer-image mapping (3, 03); the script prelude (7, 05); the meta normalisation (3, 06); the
  rAF scroll reader (2, 24); the hand-rolled debounce (collection-client, directory-client;
  22); the `mounted` latch for dialogs (`collection-client` x2, `create-post-form:191`,
  `post-card:206` -- all replaceable by `useClosingDialog` only where the dialog is about a row);
  the `as object` cast (38, 11).
- **New eslint-disable lines and their rules**: six, itemised under Metrics; all earned.
