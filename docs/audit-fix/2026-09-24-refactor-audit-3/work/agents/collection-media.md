# collection-media - refactor audit 3 report
Territory T04: the Collection (its components, its two routes, its actions and page data), the whole
media library in `src/lib` (the `collection*`, `photo-*`, `river-*` modules, the three date readers,
`caption-tidy`, the `upload-*` and `image*` modules, `storage.ts`), the media primitives in
`src/components/common` (viewer, carousel, frame, rows, aim, opener, arrow, attach dialog), the pipeline
logic of `src/app/api/upload/**` and `src/app/api/photo/download`, and, read-only, the album / backfill /
sweep / tag-photos scripts. Audit-only. Date 2026-09-24, HEAD `70570bcd`, tree clean apart from the two
audit folders. Files in territory: 90 (68 source and script files, 22 test files); read fully: 67; the rest partly (see Coverage).

## Coverage
- Read fully (source): `src/components/collection/*` (all 14, including `river-query.test.mjs`);
  `src/app/(main)/collection/**` (all 6); `src/lib/` `collection.ts`, `collection-image.ts`,
  `collection-intake.ts`, `collection-photo.ts`, `collection-shape.ts`, `collection-viewer-facts.ts`,
  `collection-viewer-image.ts`, `photo-layout.ts`, `photo-visibility-rule.ts`, `photo-wall.ts`,
  `photo-save-name.ts`, `photo-suggest.ts`, `river-geometry.ts`, `river-cursor.ts`, `taken-date.ts`,
  `exif-date.ts`, `file-taken-date.ts`, `caption-tidy.ts`, `upload-shared.ts`, `upload-client.ts`,
  `upload-ownership.ts`, `upload-ownership-rule.ts`, `image.ts`, `image-cdn.ts`, `image-downscale.ts`,
  `image-record.ts`, `image-purge.ts`, `storage.ts` (+ `append-page.ts`, which the river owns);
  `src/components/common/` `image-viewer.tsx`, `lazy-image-viewer.tsx`, `photo-carousel.tsx`,
  `photo-frame.tsx`, `photo-rows.tsx`, `photo-aim.tsx`, `photo-opener.tsx`, `carousel-arrow.tsx`,
  `attach-image-dialog.tsx`; all six route files under `src/app/api/upload/**` and `src/app/api/photo/`;
  `scripts/dev/import-album.mjs`, `backfill-screen-copies.mjs`, `tag-photos-pick.mjs`.
- Read fully (specs): `docs/spec/media.md`, `docs/planning/collection-rework/handover.md`,
  `docs/planning/class-collection/spec.md`, `docs/spec/hand-run-passes.md`; the Photo/Image/PhotoLove/
  PendingImagePurge models and the census header in `prisma/schema.prisma`; the Class Collection block
  of `src/lib/security-regressions.test.mjs`; the M12-M17 probes in `scripts/qa/audit-status.mjs`.
- Skimmed (why): the 24 `*.test.mjs` files in `src/lib` and `src/components/common` were read by test
  name (every `test(` line) plus the bodies I needed to know what a proposal would move
  (`image-purge-rule` C-063 block, `upload-shared` HEIC sweep, `river-geometry` constants,
  `collection-viewer-image` sweep). The lib-tests lens owns their bodies. `tag-photos-apply.mjs`,
  `sweep-stranded-originals.mjs` and `backfill-image-dimensions.mjs` were read to their headers and the
  parts that touch storage (they are hand-run-pass / one-off tooling; the scripts lens owns them).
- Not read (why): `src/components/common/pinch-zoom.ts` beyond its swipe constants (its name puts it
  in T08); `src/app/(main)/image-aim.ts` beyond its code lines (T12 owns action files); the lab rooms
  under `src/app/lab/collection/**`, `/lab/viewer`, `/lab/crop` beyond the lines jscpd and grep
  pointed at (lab lenses).
- Uncommitted edits seen: none in this territory (`git status --short` shows only the two audit
  folders).
- One disclosure: a filename grep for the `public/images/collection` assets ran without excluding
  `scripts/dev/.*/`, so it matched (by name only; no contents were printed or read) four
  `scripts/dev/.exports/catchups/*/catchups.json` files. Every later grep excluded those folders.

## Summary
This territory is 23,700 lines (sources 19,300, of which 1,500 are scripts; tests 4,400) and it is mostly good code: the comment
mass is overwhelmingly reasons, owner quotes and measurements, and the obvious dedupes (one viewer
mapping, one photo-row map, one purge list) were already done by audit 2's campaign. The structural
well is not dry, though, and almost all of it is in the newest code. The single biggest item is that
the Collection now runs **two paging models at once**: the geometry model (2026-09-10) replaced the
cursor walk in Chronological order, but the upward half of the walk -- about 300 lines of the client
component, 80 of the action, two cursor helpers and ~125 lines of tests -- was left in place behind
early returns and is reachable only through a latent bug (collection-media-01). The second cluster is
the river's **database traffic**: every first page runs rows, a year tally and a full-archive shape
index one after another, ships the shape index even in the three orders that never draw from it, and
counts every approved photograph just to learn whether a half is empty (02, 06); and every year the
river fetches is a server action, which Next 16 dispatches one at a time (03). The third is
**duplication that has already drifted**: the quota rule exists three times and two copies are wrong
(07, 09 -- both handed to the bug tracker by audit 2 and still live), the Collection's master encode
exists three times (04, which also carries out an owner answer from audit 2 that never shipped), the
viewer's cross-dissolve and swipe exist twice (11). Structural vs cheap: 16 structural, 8 cheap. What
surprised me: `photo-layout.ts` (ratio 3.32) is not the comment problem -- `image-cdn.ts` is (6.57), and
both are mostly product; the one real repo-wide import cycle is a single `import type`; and the
2026-09-07 column drops have all run in production while the schema, TRAPS and media.md still say
they have not. Moot from audit 2: G10 (its subject is guarded off), FEATURES.md #5's premise, and
`photo-suggest.ts` was never an orphan.

## Findings

### collection-media-01 - Retire the upward cursor walk: geometry already replaced it in Chronological order
- **Where**: `src/components/collection/collection-client.tsx:144-147` (`topCursor` state), `:295`
  (`loadingNewer`), `:638-775` (`lastScrollY`/`movingUp`/`headNear`/`pullNewer`/`syncScrollWatch`/
  `zeroPullSpent`/`wantsNewer` and the scroll/wheel/touch listener effect), `:783-786` (zero-pull reset
  in the query effect), `:1010-1076` (`scrollAnchor`, `loadNewer`, the `pullNewer` effect),
  `:1127-1164` (the anchor correction inside the `useLayoutEffect`), `:1208-1259` (the head
  IntersectionObserver keyed on `topCursor`); `src/app/(main)/collection/actions.ts:84-91`
  (`UP_PAGE_SIZE`), `:764-794` (`pageAbove` and the `direction === "newer"` branch), `:857-878` (the
  seek's `above` page), `:690-698` (`RiverPage.topCursor`/`above`); `src/lib/river-cursor.ts:108-130`
  (`beforeCursor`, `orderByForTakenAscending`); `src/lib/append-page.ts:20-27` (`prependUnseen`);
  tests `src/components/collection/river-query.test.mjs:66-75,131-166`,
  `src/lib/river-cursor.test.mjs:135-153` and `:240-284` (plus the upward half of "a tie is split",
  `:291-294`, and the `ascending`/`pageUp` helpers), `src/lib/append-page.test.mjs:71-81`.
- **Phase**: placeholder
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: the geometry commit `d920f631` ("the river knows its own height before it loads") is
  `862 insertions(+), 33 deletions(-)`: it added the new model and removed nothing. Its progress entry
  (`docs/history/progress-2026-09.md`, 2026-09-09 later) says it outright: "`scrollAnchor`, `landAt`'s
  corrections and the zero-pull latch are all dead weight in the geometry path and stand down there;
  the cursor walk still serves /lab/collection and the orders that are not years." Neither half of
  that last clause needs this code: `/lab/collection` never renders `CollectionClient` (it drives
  `<PhotoRiver>` with its own `loadNewer` at `src/app/lab/collection/page.lab.tsx:180`), and the orders
  that are not years have no year rail seek, so they never get a `topCursor` and only ever walk down.
  Every upward entry point now opens with `if (boxesRef.current.length > 0) return;` (`more` at
  `:881`, `loadNewer` at `:1034`). `boxes` is non-empty whenever `riverOrder === "taken" &&
  shapes.length > 0 && column > 0` (`:173-178`), and every seek response carries `shapes`, so the walk
  can only run while `column === 0`. `column` is measured once, by an effect with `[]` deps on
  `head.current` (`:1196-1207`), and the head div is only rendered in the non-empty branch
  (`:1637`), so the one production route in is: the page mounts empty or with no search matches (the
  first contribution to a new class, or a cold `?q=` link that matches nothing), the river appears
  later without a remount, the column is never measured, and the rail then seeks the old way. Line
  count of the client ranges: 304 lines (116 code, 176 comment, 12 blank). The client chunk that holds
  all this is `0xu6mdx3dpb3w.js`, 17,568 bytes minified (contains `3000px 0px`, `touchmove`, `wheel`).
- **What to do**: (1) Make the column measurement robust first -- replace the `[]`-deps effect at
  `:1196-1207` with a callback ref on the head div (or observe the always-rendered `riverTop` row) so
  `column` is set whenever the river mounts. That closes the only door into the old walk and is a bug
  fix in its own right. (2) Delete the listed client ranges; in the query effect drop
  `setTopCursor(...)`, `zeroPullSpent.current = false` and the `data.above` prepend (use `data.photos`);
  in `more` drop the `loadingNewer` checks; in the `useLayoutEffect` keep only the `pendingLanding`
  branch; drop `syncScrollWatch()` calls; keep the head div (it is the column-measure target) with its
  comment rewritten. (3) Server: delete `UP_PAGE_SIZE`, `pageAbove`, the `direction` option and branch,
  the seek-above block, and `topCursor`/`above` from `RiverPage`. The server seek itself
  (`bandSeekBoundary`/`seekOlder`) can stay for this finding; see Notes for the next step. (4) Delete
  `beforeCursor`, `orderByForTakenAscending`, `prependUnseen` and their tests; delete the three
  upward pins in `river-query.test.mjs` ("loadNewer does not build its own query", "the upward pull
  needs the reader to have asked", "the scroll re-asks for the seam"); update the comments in
  `photo-river.tsx:609-614` (`[overflow-anchor:none]` cites `loadNewer`) and `:671-675` (BandSection's
  comparator cites `prependUnseen`).
- **Saving**: ~304 lines client + ~80 action + ~22 cursor lib + 8 `append-page` + ~125 test lines
  (~540 lines); ~3.5-4.5 KB of the 17.6 KB Collection client chunk (≈1.3 KB gzip); 3 source pins and
  ~9 unit tests that pin a subject nobody runs; two window-level passive listeners (wheel, touchmove)
  and one IntersectionObserver per seeked river.
- **Risk & gate**: medium. This is the most-fixed surface of September. Gate: `npm run check`,
  `npm run visual`, `e2e/collection-journeys.spec.ts` and `e2e/collection-seek.spec.ts` (the latter
  drives the LAB's copy, so it does not exercise this; journeys does), and a hand check in
  chrome-devtools on the class archive (1,718 photographs): press a year from Newest, from
  Chronological, the oldest year, and Undated; open a cold `/collection?scope=class&when=2015&order=taken`;
  contribute the first photograph to an empty half without reloading, then press a year (the case the
  column fix exists for). `security-regressions.test.mjs` is untouched.
- **Confidence**: high that the walk is unreachable once the column is measured; medium on the exact
  line total. What would change my mind: a production path where `shapes` is empty while photographs
  are drawn in Chronological order (I found none: `shapes` rides on every first page).
- **Notes**: audit 2's G10 ("one asker for the upward pull", parked by the owner) wanted to merge the
  head observer into the scroll listener; this finding is not G10 re-argued -- G10's subject has been
  guarded off since 2026-09-10, which makes G10 moot and this the honest version. Next step, not
  included in the saving: with geometry, a year press from another order could simply set the order to
  Chronological and hand `landOn` the year (the boxes effect at `:1173-1188` already lands it), which
  would retire the server seek (`band` in `RiverFilters`, `seekBoundary`, `seekOlder`,
  `bandSeekBoundary`, `eraSeekBoundary`, the `jump`/`seekBand` state) -- another ~120 lines -- and fix a
  bug I believe is live: a cold `?when=` link is seeked by the server, but the client seeds from
  `firstPage.photos` without `above` (`:142`), never sets `landOn`, and `useActiveBand`'s first
  `settle()` overwrites the lit year, so the page opens at the newest year with the seek paid for and
  thrown away. I have not run it; the bug lens should confirm in chrome-devtools before anyone relies on
  it. G5 (the three-hook split, FEATURES.md #2) gets much smaller if this lands first.

### collection-media-02 - Ship the shape index only where it is drawn, tally the years from it, and stop running the first page's three queries in series
- **Where**: `src/app/(main)/collection/actions.ts:829-836` (rows query), `:880-920` (`groupBy` of
  `photoYear, era` for `bands`, then the full-archive `geometry` query for `shapes`), consumers in
  `src/components/collection/collection-client.tsx:148,152,173-178,248-249,814-815,573`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `loadPhotos` awaits three queries in turn on every first page: the rows, then the
  `groupBy` (db-statements #31: 2,305 calls, 1.44 ms mean), then `findMany({ select: { width, height,
  photoYear, era } })` over the whole query with no `take` (#52: 637 calls, 1,077,555 rows = 1,692 rows
  a call, 3.2 ms mean). The shape index is read by nothing unless `riverOrder === "taken"`: `boxes` is
  `[]` in the other three orders (`:173-178`), the `lastIndex` effect returns while `boxesRef` is empty
  (`:559`), and `forget`/`needBand` only reshape `held` years, which exist only with boxes. The valley
  opens on Newest (`defaultOrderFor`, `src/lib/collection.ts:542-543`), so the default page view pays
  for and ships an index nothing reads. In Chronological order the tally is fully derivable from the
  geometry rows the same request just read: both use `where: filters`, and `bands` is exactly the
  histogram of `bandKeyOf(g)` over `geometry` -- the `groupBy` exists only because it predates the
  index (2026-08-30 vs 2026-09-10).
- **What to do**: in the `if (first)` block, branch on order. Chronological: run only the geometry
  query, build `shapes` and derive `bands` from the same rows in JS (one pass, the `tally` loop at
  `:902-907` fed from `geometry`). Any other order: run only the `groupBy` for `bands` and leave
  `shapes` undefined (the client already treats it as optional). Start whichever it is concurrently
  with the rows query (`Promise.all`), since neither depends on the rows. Keep `bands` in the payload so
  `security-regressions.test.mjs`'s literal `return { photos: [], nextCursor: null, bands: [] };` pin is
  untouched. Update the `RiverPage.shapes` docblock (`:700-718`) to say it rides only on a
  Chronological first page.
- **Saving**: −1 query per first page in every order; −1 full-archive read and −~12 bytes of RSC/JSON
  per photograph on every non-Chronological first page (a few KB for the valley's few hundred today,
  ≈20 KB for the class archive read in Newest, ~240 KB raw at the spec's 20,000); the first page goes
  from 3 sequential DB waits to 1 round of 2 parallel ones.
- **Risk & gate**: low. `npm run check` (the security pin above must stay green), open `/collection`
  (Newest: rail marks unchanged), switch to Chronological and back, press years, open the class half;
  compare the rail's mark lengths before and after on both halves.
- **Confidence**: high. What would change my mind: a consumer of `shapes` outside Chronological order
  that I missed (grep `shapes` in `collection-client.tsx` -- every read is listed above).
- **Notes**: considered and rejected: dropping `bands` from the wire and deriving it on the client from
  `shapes` (clean in Chronological, impossible in the other orders once `shapes` stops shipping there).
  Also considered: keeping one query for all orders by always reading geometry -- rejected because in
  Newest it trades a ~100-row aggregate for a full-archive read.

### collection-media-03 - Fetch the years the reader is approaching together: Next runs server actions one at a time
- **Where**: `src/components/collection/collection-client.tsx:489-529` (`needBand`, one `loadBand`
  action per year), `src/components/collection/photo-river.tsx:588-602` (the observer that calls
  `onNeedBand` once per intersecting box), `src/app/(main)/collection/actions.ts:925-981` (`loadBand`).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `needBand`'s docblock (`:497-499`) says "`asking` rather than a loading flag: several
  years can be in the air at once (a fast flick crosses a decade) and they do not conflict". Next 16's
  own docs say otherwise: "Server Functions are designed for server-side mutations. The client
  currently dispatches and awaits them one at a time ... If you need parallel data fetching, use data
  fetching in Server Components, or perform parallel work inside a single Server Function or Route
  Handler" (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md:207`). So a fast
  flick that brings ten reserved years inside the 1200 px margin queues ten round trips, each with its
  own `auth()`, `viewerFacts` (class half) and query, and a heart tapped meanwhile waits behind them.
- **What to do**: collect the keys an observer callback reports into one call: `needBands(keys)` ->
  one `loadBands(keys, opts)` action that reads all of them in one query (an `OR` of `takenKey` ranges,
  or `takenKey >= min AND < max` then group by `bandKeyOf`) and returns `{ [key]: PhotoData[] }`; keep
  the per-key `held`/`asking` bookkeeping. Alternative with more reach: move the river's two READS
  (`loadPhotos`, `loadBand`) to a GET route handler, which runs in parallel and can be cached privately;
  it changes the auth surface (route handler, not action) and gate-coverage, so it wants the
  write-path/security reviewer. I recommend the batch.
- **Saving**: for a flick across N unloaded years, N queued round trips become 1; fewer `auth()`/
  `viewerFacts` reads; 0 lines either way.
- **Risk & gate**: medium (the river is load-bearing). Measure first in chrome-devtools on the class
  archive: a hard flick from 2026 to 2015 at 4x throttle, count POSTs and time to the last filled box;
  then the same after. `npm run check`, `npm run visual`, `collection-journeys.spec.ts`.
- **Confidence**: medium. The docs are explicit; what would change my mind is a network trace showing
  the POSTs already overlapping in this Next version.
- **Notes**: `loadBand`'s `take: 600` guard should move into the batched query per key.

### collection-media-04 - One Collection encode for the fallback, the direct path and the album importer, which also ships the owner's audit-2 answer on the fallback
- **Where**: `src/app/(main)/collection/actions.ts:224-268` (fallback: `.resize(1600, 1600, ...)
  .webp({ quality: 80 })` at `:249-252`), `:460-553` (direct: `storedResizeBox` + `COLLECTION_WEBP_QUALITY`
  + `withExif` + `screenCopy` + `gridThumb(screen.copy, { alreadyUpright: true })`),
  `scripts/dev/import-album.mjs:410-431` (`importOne`, the same recipe written out a third time).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: the three blocks are the same pipeline -- decode, rotate, box, WebP at the archive's
  quality with the one date tag, cut the screen copy, cut the thumbnail from it -- except that the
  fallback stops at 1600 px q80 with no screen copy. Audit 2 row #20 raised exactly that difference, and
  the owner's answer was the default, Q6 (a): "the upload fallback stops shrinking; both paths keep full
  size" (`docs/audit-fix/2026-09-03-refactor-audit-2/fix-prompt.md:360`). It never shipped:
  `docs/spec/media.md:134-138` still calls it "a live question ... awaiting the owner". The importer's
  header promises "Nothing about the picture this script files is written twice any more" while
  `importOne` re-writes the encode; the direct path's comment says the thumbnail is cut "exactly as
  contributePhotoDirect does". `toDisplayWebp`'s own docblock names this failure: "a promise a comment
  cannot keep. Here it is kept by construction".
- **What to do**: add `collectionRenditions(original, { quality = COLLECTION_WEBP_QUALITY, stamp })` to
  `src/lib/collection-image.ts` (bare-node importable, relative `.ts` imports, as that file requires):
  it returns `{ master, width, height, screen, thumb }` using `storedResizeBox`, `withExif` when a
  stamp is given, `screenCopy` and `gridThumb(screen.copy, { alreadyUpright: true })`. Call it from
  both actions and from `import-album.mjs`. Each action keeps its own refusal shape (the C-063 `refuse`
  contract stays in `contributePhotoDirect`) and its own storage puts. The fallback then stores what
  the browser sent it at archive quality with a screen copy (the browser still shrinks to 2048 px for
  Vercel's 4.5 MB body cap -- `shrinkForUpload` -- so "full size" means "no second shrink", which the
  fix session should say to the owner in one line). Fix media.md §4.2's table and the "live question"
  paragraph, and `schema.prisma`'s `url` comment, in the same commit.
- **Saving**: ~35-45 lines across the three sites, 2 clones, one owner decision finally carried out,
  one encode recipe instead of three.
- **Risk & gate**: medium. `scripts/qa/audit-status.mjs` probe **M12** requires
  `/sharpImage\([^)]*\)[\s\S]*\.webp\(/` inside `contributePhotoDirect`'s own body -- moving the encode
  into the helper turns M12 "open" and fails `npm run check`; re-point the probe at the helper in the
  same commit. `image-purge-rule.test.mjs` "C-063" tests (the `refuse` exits must stay >= 5) and "C-129"
  (sourceKey) stay green. Verify with one real contribution on each path (force the fallback by
  blocking the presign in devtools), one `import-album.mjs --limit 1` dry run, and `exif-date.test.mjs`
  ("the stored copy keeps the date and loses the coordinates").
- **Confidence**: medium-high. What would change my mind: a reason the fallback must stay small that is
  not written down anywhere (I found none; the owner chose (a)).
- **Notes**: this is audit 2's E11 tail item `fresh-code-01 ⊃ collection-06 = media-viewer-04` ("the two
  Collection contribution pipelines folded into one ingest"), still open. `contributePhotoDirect` also
  reads the original's metadata up to four times (`countImageFrames`, `exifDateOf` and `dateOnlyExif`
  each call `exifBlockOf` -> `sharp().metadata()`, plus `storedResizeBox`'s own `metadata()`);
  reading the EXIF block once and passing it to both `exifDate` and `exifStamp` inside the new helper
  saves a header parse per contribution. See also 19.

### collection-media-05 - Move the river's types out of the "use server" file: the repo's only import cycle, three copies of `BandCount`, and two compatibility re-exports
- **Where**: `src/app/(main)/collection/actions.ts:621-625` (`export type { RiverOrder }`, `export type
  { PhotoData }` "so the client components and lab rooms that import PhotoData from here keep working"),
  `:627-641` (`RiverFilters`), `:675-680` (`BandCount`), `:682-724` (`RiverPage`, `PhotoShapeIndex`);
  `src/lib/river-geometry.ts:43` (`import type { PhotoShapeIndex } from "@/app/(main)/collection/actions"`);
  `src/components/collection/year-rail.tsx:65` and `src/components/collection/photo-scrubber.tsx:98`
  (two more `export type BandCount = { key: string; count: number }`).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/madge-circular.txt`: "1) app/(main)/collection/actions.ts > lib/river-geometry.ts"
  (the only cycle madge finds in 798 files); depcruise counts it as one of its 4 errors. It is a type
  import, so it erases at runtime, but it is a `lib` module depending on an `app` server-action file.
  Importers of types from `actions.ts`: `collection-client.tsx:45-54`, `photo-river.tsx:21`,
  `river-controls.tsx:44`, `edit-photo-dialog.tsx:51`, `collection-data.ts:9-13`, `river-geometry.ts:43`,
  and three lab files (`lab/collection/_archive.ts:1`, `lab/collection/page.lab.tsx:44`,
  `lab/collection/swap/page.lab.tsx:65`).
- **What to do**: move `RiverFilters`, `BandCount`, `RiverPage` and `PhotoShapeIndex` into
  `src/lib/river-cursor.ts` (already the river's pure module and the home of `RiverOrder`); repoint
  every importer (listed above, lab included) to `@/lib/river-cursor` for those and to
  `@/lib/collection-shape` for `PhotoData`; delete the two re-exports and their comment; delete the
  `BandCount` copies in `year-rail.tsx` and `photo-scrubber.tsx` and import the one. `actions.ts`
  keeps `import type` of whatever it annotates.
- **Saving**: 1 import cycle (madge/depcruise to zero cycles), 2 duplicate type definitions, 2
  re-exports + 4 comment lines; 0 runtime bytes.
- **Risk & gate**: low. `npm run check`; `raw`-style `npx madge --circular` in the fix session if it
  is allowed there.
- **Confidence**: high.
- **Notes**: considered putting the types in `river-geometry.ts` (it consumes `PhotoShapeIndex`);
  rejected because `RiverFilters`/`RiverPage` are not geometry, and one home is better than two.

### collection-media-06 - `collectionPageData`: ask "is this half empty" with an existence check, skip the admin's own count, and fetch the first page beside the facts
- **Where**: `src/app/(main)/collection/collection-data.ts:174-193` (the `Promise.all`), `:179-183`
  (`approvedByScope` `groupBy` count), `:188-192` (`mineByScope` count), `:209-212` (admin `roomLeft`),
  `:219` (`const firstPage = await loadPhotos(filters);` after the facts).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: db-statements #11 is the Collection's most expensive statement by total time:
  `SELECT COUNT(*) ... GROUP BY scope WHERE (scope=$1 OR (scope=$2 AND classYears=$3)) AND approved AND
  NOT isHidden`, 1,732 calls, **8.63 ms mean**, 14.9 s total -- counting every approved photograph in
  both halves when the only consumer is `countIn(approvedByScope, half) > 0` (`:203`). It grows
  linearly with the archive. #14 (`COUNT ... GROUP BY scope WHERE uploaderId=$1`, 1,892 calls,
  5.48 ms mean) feeds `roomLeft`, which is thrown away for an admin (`:210-212` returns
  `MAX_PHOTOS_PER_ACCOUNT`), and the heaviest uploader is the admin (the 1,718-photograph album).
  `photoQuotaError` (`actions.ts:110`) already exempts admins before counting; this does not.
  `loadPhotos` does not depend on any of the three facts but waits for them.
- **What to do**: replace the `approvedByScope` group count with one `findFirst({ where: { ...half,
  approved: true, isHidden: false }, select: { id: true } })` per readable half, inside the same
  `Promise.all`; skip the `mineByScope` query when `session.user.role === "admin"`; move
  `loadPhotos(filters)` into the same `Promise.all`. Keep the comment's reasoning about why both
  halves are answered (audit 2 C11 was declined for UX; this keeps that shape).
- **Saving**: ~8 ms DB per load today (and O(1) instead of O(archive) at 20,000), −1 query per admin
  load, one fewer sequential DB wait per page view (the facts and the first page overlap).
- **Risk & gate**: low. `npm run check`; open `/collection` as Jerry (member) and as admin, both
  halves, and an empty class; `trulyEmpty` must still draw the empty state.
- **Confidence**: high.
- **Notes**: `viewerFacts` (`:127`) is a second primary-key read of `User` beside the one `auth()`
  already makes for `credentialVersion`; folding the two is the auth lens's call (For other lenses).

### collection-media-07 - Fold the flat per-half props into `scopeFacts`, which also fixes the quota audit 2 said follows the wrong half
- **Where**: `src/app/(main)/collection/collection-data.ts:221-229` (flat `pending`, `hasApprovedPhotos`,
  `roomLeft` "spread out flat as well"); `src/components/collection/collection-client.tsx:94-95,103,
  106-112,121-125` (props), `:259-272` (`queues` seeded from both), `:288` (`facts` fallback), and
  `:1738` (`roomLeft={roomLeft}` passed to `<ContributeDialog>`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `scopeFacts` carries the same three facts for every readable half; the flat trio is the
  rendered half's copy, "kept because that is what the permalink route and the tests pass" (`:109-111`).
  Neither is true: both routes go through `collectionPageData`, and `grep -rn "hasApprovedPhotos\|roomLeft\|
  scopeFacts"` finds only these two files and `contribute-room.tsx`. The copy has already drifted: the
  contribute dialog is handed the flat `roomLeft` (`:1738`), not `facts.roomLeft`, so after a swap the
  room caps a drop by the OTHER half's remaining quota. Audit 2 recorded this as a correctness bug
  (`report.md:306`, `collection-02`: "`facts.roomLeft` is computed and never read, despite `dad5307`")
  and handed it to the bug tracker; it is not in `docs/planning/bugs.md` and is still live.
- **What to do**: make `scopeFacts` required; drop `pending`, `hasApprovedPhotos`, `roomLeft` from
  `collectionPageData`'s return and from `CollectionClient`'s props; read `facts.*` everywhere
  (including `roomLeft={facts.roomLeft}` at the dialog); seed `queues` from `scopeFacts` alone and key
  the re-seed on `scopeFacts` rather than `pending`.
- **Saving**: ~20 lines (props, docblocks, the double-seed), one bug.
- **Risk & gate**: low. Swap halves as a non-admin with photographs in both, open Contribute, check the
  promised room; `npm run check`.
- **Confidence**: high.
- **Notes**: the bug is a one-token fix even without the fold; the fold is what stops the next one.

### collection-media-08 - Narrow the staged-original key to `staging/`: the `collection/` window closed on 2026-09-05
- **Where**: `src/app/(main)/collection/actions.ts:327-345` (`COLLECTION_ORIGINAL_KEY =
  /^(staging|collection)\/.../` and its 17-line "TWO ROOTS" comment), `:384-391` (the
  `input.key.startsWith("staging/") ? "staging" : "collection"` branch).
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the comment says the `collection` alternative is there for "a presigned URL minted by
  the OLD code when the new code deploys ... Safe to narrow to `staging/` alone once nothing old is in
  flight -- which is any time after the deploy, since a presign is short-lived" (presigns expire in 600 s,
  `storage.ts:186`). The staging change is `04c90a27` (2026-08-28); `scripts/README.md:84` records the
  post-deploy sweep on 2026-09-05: "0 keys, 0.00 MB".
- **What to do**: `/^staging\/[a-z0-9]+\/\d{4}\/\d{2}\/[a-z0-9]+-o\.(jpg|jpeg|png|webp|gif)$/` and
  `keyBelongsTo(input.key, session.user.id, "staging")`; cut the comment to its first paragraph's reason
  (why staging, not the archive folder).
- **Saving**: ~15 lines, one widened security input.
- **Risk & gate**: low, security-adjacent (audit C2). `image-purge-rule.test.mjs:52` pins
  `COLLECTION_ORIGINAL_KEY.test(input.key)` by name -- keep the name. `npm run check`; one real direct
  contribution.
- **Confidence**: high.

### collection-media-09 - One quota rule: the composer's "add to the Collection" copy counts both halves and does not exempt admins
- **Where**: `src/lib/collection-intake.ts:67-88` (`prisma.photo.count({ where: { uploaderId: userId } })`,
  `room = MAX_PHOTOS_PER_ACCOUNT - existing`), `src/app/(main)/collection/actions.ts:93-121`
  (`photoQuotaError`: admin exempt, counted `{ uploaderId, scope }`),
  `src/app/(main)/collection/collection-data.ts:188-212` (a third reading).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `upload-shared.ts:43-50`: "COUNTED PER HALF ... `photoQuotaError` is where that counting
  happens". The intake path writes valley rows (`photoRowData` defaults to valley) but counts class rows
  too, and gives an admin a ceiling `photoQuotaError` says admins do not have (`actions.ts:104-110`,
  "of course no limits for uploading should be there for me"). The two meet on the owner: his account
  uploaded the 1,718-photograph class album (`import-album.mjs` defaults `--as` to him), so here
  `room = max(0, 1000 - 1,718) = 0` and his composer's "Also add to the Collection" tick silently
  copies nothing (the function returns 0 by design; nobody is told). Audit 2 listed "the
  intake quota counts without `scope`" as a bug (`report.md:306-307`); still live, not in bugs.md.
- **What to do**: one `collectionRoom(userId, role, scope)` (in `collection-intake.ts` or a server
  module beside it) returning the remaining room (`Infinity`/`MAX` for an admin), used by
  `photoQuotaError` (`room <= 0` -> `HALVES[scope].quotaError`) and by `copyPostImagesToCollection`
  with `scope: "valley"`. `collectionPageData` keeps its two-halves-in-one-groupBy for the page.
- **Saving**: ~5 lines, one drifted copy, one bug.
- **Risk & gate**: low. `scripts/qa/audit-status.mjs` M17 probes for `photoQuotaError(` in the actions
  file -- keep that call. First confirm the owner case read-only:
  `SELECT p.scope, u.role, count(*) FROM "Photo" p JOIN "User" u ON u.id = p."uploaderId" GROUP BY
  p."uploaderId", p.scope, u.role HAVING count(*) >= 1000;` -- any row means somebody's tick is a
  silent no-op today. Then `npm run check`; tick "Also add to the Collection" on a post as that
  account and as Jerry.
- **Confidence**: high.

### collection-media-10 - The post-image pipeline is written in both upload routes, and the staged-original read in two places
- **Where**: `src/app/api/upload/route.ts:99-138` and `src/app/api/upload/finalize/route.ts:102-137`
  (sniff -> `countImageFrames` -> `toDisplayWebp` -> `putImage` -> `describeImage` -> `recordImage`;
  jscpd `finalize/route.ts [77:57-93:63]` = `upload/route.ts [56:55-78:63]`); the staged read (HEAD size,
  GET, `MAX_UPLOAD_BYTES + 1024` re-check, sniff) at `finalize/route.ts:103-125` and
  `src/app/(main)/collection/actions.ts:461-477`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the jscpd clone above; the two staged reads are line-for-line the same audit-M16 rule
  with the same "Belt to the HEAD's braces" comment.
- **What to do**: `readStagedImage(key): Promise<{ bytes: Buffer } | { error: string }>` beside
  `headObjectSize` in `storage.ts` (or `image-purge.ts`), used by finalize and `contributePhotoDirect`
  (each routes the error through its own `abort`/`refuse`); `storePostImage(buffer, userId)` returning
  `{ url, facts, notice? }` used by both post routes.
- **Saving**: ~25 lines, 2 clones, one home for the M16 size rule.
- **Risk & gate**: medium because of the security board: `audit-status.mjs` **M13** requires
  `sniffImageType(` in `upload/route.ts`, `finalize/route.ts` and `collection/actions.ts`, and **M16**
  requires `headObjectSize(` in finalize and the actions -- re-point both probes at the helpers in the
  same commit. `image-purge-rule.test.mjs` C-063/C-064 (abort/refuse must still take back what was
  stored) must stay green. Gate: `npm run check`, one post upload each way, one direct contribution.
- **Confidence**: medium-high.

### collection-media-11 - The cross-dissolve and the swipe thresholds are written twice (viewer and contribute stage)
- **Where**: `src/components/common/image-viewer.tsx:175-207` (`STEP_SECONDS`, `FRAME_VARIANTS` and a
  21-line argument for the opposite curves), `src/components/collection/contribute-stage.tsx:55-62`
  (the same argument again), `:143-170` (`STEP_SECONDS`, `CARD`, `SWIPE_PX = 70`,
  `SWIPE_VELOCITY = 420`), `:236` (`dragElastic={0.14}`); `src/components/common/pinch-zoom.ts:83-85`
  (`SWIPE_FOLLOW = 0.14`, `SWIPE_DISTANCE = 70`, `SWIPE_VELOCITY = 420`); the arrow-key handler
  (jscpd `contribute-stage.tsx [204:63-214:11]` = `photo-carousel.tsx [228:51-238:11]`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `contribute-stage.tsx:143` "The step, and every number in it is <ImageViewer>'s";
  `:167` "the viewer's thresholds"; `:160-162` "motion.tsx has no ease-IN twin to import; if one is ever
  added, both this and the viewer take it" -- three numbers kept equal by comments.
- **What to do**: export `CROSS_DISSOLVE_SECONDS`, a `crossDissolve` variants factory (keys renamed at
  the call site: the stage's `leave` adds `pointerEvents: "none"`, which audit 2's verification noted is
  why this is "a rename plus a spread, not a drop-in") and `SWIPE = { distance, velocity, follow }`
  from `src/components/common/motion.tsx` (or `pinch-zoom.ts`), and use them in all three places; keep
  the curve argument once, at the export.
- **Saving**: ~25 lines (mostly the duplicated argument), 3 constants that can no longer drift.
- **Risk & gate**: low. `npm run visual`; step photographs in the viewer and in the contribute stage.
- **Confidence**: high.
- **Notes**: audit 2 E11 `media-viewer-12`, still open.

### collection-media-12 - Props and options nobody passes: `ViewerImage.where`, `BucketTiles.mixed`, `useImageViewer(initialAt)`, `ContributeRoom`'s lab-room optionality
- **Where**: `src/components/common/image-viewer.tsx:127-128` (`where?`), `:712` (`const where`),
  `:1016-1018` (the render); `src/components/collection/bucket-tiles.tsx:55-58,63,78,99-100` (`mixed`
  and the half-lit branch); `src/components/common/lazy-image-viewer.tsx:35-44` (`initialAt`, "for a
  surface that arrives already open -- /collection/[id]"); `src/components/collection/contribute-room.tsx:
  323-354` (`export function ContributeRoom`, `active = true`, `scope = "valley"`, optional
  `onWall`/`onDone`/`onFlyAway`, "the standalone lab room ignores it").
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `where` is passed only by `src/app/lab/viewer/page.lab.tsx:41,54`; the column behind it
  (`Photo.area`) is dropped in production (`raw/db-columns-live.json`). `mixed` is passed by no caller
  (`PhotoQuestions` passes `value`/`onChange` only; the multi-select room it served was replaced by the
  carousel). Every `useImageViewer(` call site (9, lab included) passes no argument; `CollectionClient`,
  the surface the docblock names, does not use the hook. `ContributeRoom` is referenced only inside its
  own file (no lab room renders it; `lab/hoopoe-lives` imports only `Finish`).
- **What to do**: delete the `where` field, its read and its render (and the two lab fixture values and
  the lab room's "where it was taken" sentence); delete `mixed` and the `some` branch; delete
  `initialAt` (and the docblock sentence); un-export `ContributeRoom` and make its always-passed props
  required.
- **Saving**: ~25 lines.
- **Risk & gate**: low. `npm run check`; `/lab/viewer` still renders.
- **Confidence**: high.

### collection-media-13 - Exports that only tests read, and one re-export shim
- **Where**: `src/lib/collection.ts:359` (`eraSortYear`, read only by `collection-taxonomy.test.mjs:
  102-105`); `src/lib/photo-visibility-rule.ts:115-119` (`storedClassYears`) and `:148-152`
  (`PHOTO_NOT_VISIBLE`), both read only by `photo-visibility-rule.test.mjs`; `src/lib/caption-tidy.ts:
  93-95` (`captionNeedsTidying`, read only by its test); `src/lib/collection-photo.ts:25-31` (re-exports
  `THUMB_PX, dateOnlyExif, exifBlockOf, gridThumb, screenCopy` from `collection-image`, "so that
  nothing in src/ has to know"; knip flags `THUMB_PX` and `exifBlockOf` as unused);
  `src/components/collection/river-controls.tsx:64,71` (`RIVER_ORDERS`, `orderLabel`, used only in the
  file; knip); `src/lib/collection.ts:178` (`eraLabel`, used only in the file).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: grep counts above (outside the defining file, tests only). `storedClassYears` is "The
  value to STORE for an audience", but the only writer (`contributionScope`, `actions.ts:140-160`)
  stores `classKey(...)` directly. `PHOTO_NOT_VISIBLE` states the one-message rule, but no path shows
  it: `loadPhoto` returns null and the page answers `notFound()`.
- **What to do**: delete `eraSortYear` (point the test at `ERA_START_YEAR`), `storedClassYears`,
  `PHOTO_NOT_VISIBLE` (keep the one-message reasoning as a comment on `decidePhotoVisibility`'s refusal
  branch), `captionNeedsTidying` with their test cases; delete the re-export shim and import
  `dateOnlyExif`/`gridThumb`/`screenCopy` from `@/lib/collection-image` in `actions.ts` and
  `collection-intake.ts`; drop `export` from `RIVER_ORDERS`, `orderLabel`, `eraLabel`.
- **Saving**: ~25 source lines, ~20 test lines.
- **Risk & gate**: low. `photo-visibility-rule` is a security module; its behavioural tests for the rule
  itself stay. `npm run check`.
- **Confidence**: high.

### collection-media-14 - `Photo_caption_trgm_idx` cannot serve the only query that searches captions
- **Where**: `src/app/(main)/collection/actions.ts:654-673` (`buildCollectionWhere`: `OR: [{ caption:
  { contains } }, { uploader: { name: { contains } } }]`); the index (created by
  `prisma/migrations-manual/2026-08-28-collection-river.sql`, listed in `schema.prisma:21`).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/db-indexes-live.json`: `Photo_caption_trgm_idx`, 147,456 bytes, **0 scans** since
  2026-05-22, while `User_name_trgm_idx` has 6. The search OR puts a relation arm (an EXISTS/join on
  `User`) beside the caption arm, and Postgres can only BitmapOr conditions on one table, so no plan can
  use the caption index for this query at any archive size -- not merely at 1,960 rows. Nothing else
  filters `caption`. The schema comment (`schema.prisma:498-501`, "which nothing but a trigram index
  serves. It is not unindexed; do not 'fix' it") and `actions.ts:617-618` ("served by trigram
  indexes, not scanned") are claims the live stats contradict.
- **What to do**: in the fix session run `EXPLAIN (ANALYZE, BUFFERS)` of the generated search query on
  production; if it confirms no use, drop the index in a dated `prisma/migrations-manual/` file (demo
  too) and correct the census (`schema.prisma:11-47`, `docs/TRAPS.md:41-56`) and the two comments.
  Alternative if search speed at 20,000 matters later: split the search into two indexable lookups
  (caption via this index, uploader via `User_name_trgm_idx`) and union the ids -- more code, not
  worth it now.
- **Saving**: 1 DB object, 147 KB, GIN maintenance on every Photo insert and caption edit (the album
  import paid it 1,719 times).
- **Risk & gate**: low. The EXPLAIN above is the gate; `npm run check`.
- **Confidence**: medium (reasoned from the query shape and the scan count, not from an EXPLAIN I could
  not run). What would change my mind: an EXPLAIN showing a BitmapOr using it.
- **Notes**: `PhotoLove_photoId_idx` also shows 0 scans and should stay: see Not-findings.

### collection-media-15 - The 2026-09-07 drops have run; the Photo and Image comments, the index census and media.md still say they have not
- **Where**: `prisma/schema.prisma:11-47` (census "ELEVEN INDEXES", rows 22-23 `Photo_area_trgm_idx`,
  `Photo_freeTags_trgm_idx`), `:301-307` (Image `greyscale` "still in both databases"), `:366-371`
  (Photo `area`/`freeTags` "still in both databases"), `:498-501` ("Three GIN trigram indexes on
  caption, area and freeTags exist"); `docs/spec/media.md:217-220` ("unrun. The columns still exist.");
  `docs/TRAPS.md:41,50`.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `raw/db-columns-live.json`: `Photo` has no `area` or `freeTags`, `Image` has no
  `greyscale`; `raw/db-indexes-live.json` lists `Photo_caption_trgm_idx` and no area/freeTags index.
  The drop file itself says the census "can be corrected to NINE the day this runs".
- **What to do**: nine (eight if 14 lands) in the census and TRAPS; delete the three "still in both
  databases" paragraphs (the migration file keeps the history); media.md §5's last sentence.
- **Saving**: ~20 comment lines; three claims a future session would otherwise act on.
- **Risk & gate**: none. `npm run check`. TRAPS.md is on the do-not-trim list; this is a factual
  correction of a number, which the migration file itself asks for.
- **Confidence**: high.
- **Notes**: `Group.description/coverImage`, `OutboundEmail.bounceKind` and `Post.groupId` are also gone
  live while `schema.prisma:521-523` and friends say otherwise -- data-layer lens.

### collection-media-16 - Replace the carousel's hand-rolled Bezier sampler with motion's `cubicBezier`
- **Where**: `src/components/common/photo-carousel.tsx:71-86` (`const ease = (t) => { ... bisection over
  bez(x1, x2, mid) ... }`).
- **Phase**: library
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `motion@12.38.0` re-exports `motion-utils`, whose `index.d.ts:89` declares
  `cubicBezier(mX1, mY1, mX2, mY2): (t: number) => number`; `motion/react` re-exports `framer-motion`,
  which does `export * from 'motion-utils'`.
- **What to do**: `import { cubicBezier } from "motion/react"; const ease = cubicBezier(...EASE_OUT_SMOOTH);`
  and delete the sampler and its comment.
- **Saving**: ~15 lines; tree-shakes to a few hundred bytes the app already ships.
- **Risk & gate**: low. Press a carousel arrow at 1440 and compare the glide; `npm run visual`.
- **Confidence**: high.

### collection-media-17 - One "too large" refusal, and presign's hand-copied HEIC advice
- **Where**: "over the 20MB limit" spelled 8 times: `actions.ts:196,466,473`,
  `api/upload/route.ts:94`, `api/upload/finalize/route.ts:110,117`, `api/upload/presign/route.ts:70`
  ("Photos can be up to 20MB"), `components/collection/contribute-room.tsx:413-414` (plus
  `posts/use-composer-uploads.ts:201` and `catchups/home/picture-picker-dialog.tsx:146` outside the
  territory); presign's `:59-64` copies `heicWayOut`'s text by hand.
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `MAX_UPLOAD_BYTES` (`upload-shared.ts:31`) is the source of truth; every sentence
  hard-codes "20MB". `upload-shared.ts` already consolidated the HEIC and GIF sentences for exactly this
  reason ("Four surfaces said this four ways"); the HEIC sweep test (`upload-shared.test.mjs:155`) only
  catches the MIME/regex predicate, so presign's copied advice slipped past it.
- **What to do**: `tooLargeRefusal(bytes?, filename?)` in `upload-shared.ts` deriving the number from
  `MAX_UPLOAD_BYTES`; use it at every site; presign's refusal becomes
  `That photo format isn't supported. ${heicWayOut(false)}`.
- **Saving**: 0 lines; 8 spellings -> 1; one constant no longer restated in prose.
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.

### collection-media-18 - The ghost cell's flex-grow is written in two files that must agree
- **Where**: `src/components/common/photo-rows.tsx:233` (`flexGrow: photoGrow(24)`),
  `src/lib/river-geometry.ts:105` (`const ghost = photoGrow(24);`).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `river-geometry.ts:103-104`: "`photoGrow` rather than the numbers it returns, so this
  cannot drift from the component it is predicting" -- but the `24` itself is a literal in both, and
  `river-geometry.test.mjs` pins the gap and margins against the markup, not this.
- **What to do**: `export const GHOST_GROW = photoGrow(24)` in `photo-layout.ts` beside `photoGrow`,
  with the one-line reason from `photo-rows.tsx:215-230`; use it in both.
- **Saving**: 0 lines; one drift point (a mismatch makes every reserved year the wrong height).
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.

### collection-media-19 - Two EXIF container readers: one on Buffers for the server, one on Blobs for the browser
- **Where**: `src/lib/exif-date.ts:40-118` (`exifFromPng`, Buffer + `inflateSync`), `src/lib/collection-image.ts:
  94-103` (`exifBlockOf`: `sharp().metadata().exif` then the PNG reader), `src/lib/file-taken-date.ts:
  67-194` (`tagsOfFile`: JPEG APP1, WebP EXIF chunk, PNG eXIf/zTXt/tEXt on a `Blob`, `DecompressionStream`).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `file-taken-date.ts:136-138`: "The same stopping rule as the server's reader
  (`exifFromPng`), so the two find the same block." Both hand the block to the same `readTiffTags`.
  HEIC never reaches either (refused before sniffing on both paths), so sharp's HEIF support buys
  nothing here. Node 26 has `Blob` and `DecompressionStream` globally.
- **What to do**: let the server call `tagsOfFile(new Blob([buffer]))` and derive both `exifDate`
  (`judgeTakenDate({ tags })`) and `exifStamp` (first parseable of `original`/`digitized`/`modified`) from
  the tags; delete `exifFromPng`, `exifBlockOf` and the PNG half of `exif-date.ts`; the album importer
  follows. Move `exif-date.test.mjs`'s PNG cases onto `tagsOfFile`.
- **Saving**: ~70 lines, one container reader instead of two, one fewer `sharp().metadata()` per
  contribution.
- **Risk & gate**: medium. `exif-date.test.mjs` (all), `taken-date.test.mjs`, one real JPEG, WebP and
  Apple-PNG contribution, and an `import-album.mjs` dry run over the owner's album (1,719 files, 3 PNGs
  with the hex profile) comparing the planned dates before and after.
- **Confidence**: medium. What would change my mind: a JPEG whose EXIF sharp finds and the APP1 walker
  does not (e.g. an APP1 past `MAX_SEGMENTS`).

### collection-media-20 - Scope resolution written out twice in `loadPhotos` and `loadBand`
- **Where**: `src/app/(main)/collection/actions.ts:738-748` and `:954-961` (jscpd
  `[730:76-748:39]` = `[949:63-961:39]`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the same `viewerFacts` + `photoScopeWhere({...})` + null-bail sequence.
- **What to do**: `async function riverWhere(session, opts)` returning `buildCollectionWhere(...)` or
  null; both actions call it. `security-regressions.test.mjs` "the river cannot be queried without a
  resolved scope" matches `photoScopeWhere(`, `function buildCollectionWhere(\s*scopeWhere:`,
  `...scopeWhere,` and the exact bail literal `if (!scopeWhere) return { photos: [], nextCursor: null,
  bands: [] };` -- keep that literal in `loadPhotos` (e.g. `const scopeWhere = await riverScope(...);
  if (!scopeWhere) return ...`), i.e. extract only the fact-gathering half.
- **Saving**: ~8 lines, 1 clone.
- **Risk & gate**: low, security-adjacent. `npm run check` (the pin).
- **Confidence**: medium (the pin constrains the shape more than the saving justifies; skip if it fights).

### collection-media-21 - `storage.ts` dynamically imports a module it already imports statically
- **Where**: `src/lib/storage.ts:10` (`import { writeFile, mkdir, unlink, readFile } from "fs/promises"`),
  `:223` (`const { copyFile } = await import("fs/promises")`), `:243` (`open`), `:287` (`stat`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `raw/dynamic-imports.txt:83-85`.
- **What to do**: add `copyFile, open, stat` to the line-10 import; delete the three `await import`s.
- **Saving**: 3 dynamic import sites, 3 lines.
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.

### collection-media-22 - The year rail's fade is a hand-typed curve
- **Where**: `src/components/collection/year-rail.tsx:122` (`const FADE = { duration: 0.26, ease:
  [0.22, 1, 0.36, 1] as const };`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the only hand-typed Bezier in the territory; every other fade uses `EASE_OUT_SMOOTH`
  (`[0.16, 1, 0.3, 1]`, `motion.tsx:41`). CLAUDE.md: "no hand-typed `cubic-bezier(...)`". It is also the
  one constant in the rail with no reason given.
- **What to do**: `ease: EASE_OUT_SMOOTH`.
- **Saving**: 0 lines; one protocol breach.
- **Risk & gate**: none visible (both are strong ease-outs over 260 ms). `npm run visual`.
- **Confidence**: high.

### collection-media-23 - Comments that describe designs this territory has since replaced
- **Where** (each verified against the code it sits beside):
  `components/collection/contribute-room.tsx:11-26` (photographs "land straight into the justified rows"
  and "Every photograph is selected when it lands" -- the room is a one-at-a-time carousel, see
  `:915-925` and `contribute-stage.tsx:6-24`), `:448-451` ("The rows are justified");
  `app/api/upload/presign/route.ts:16-18` ("kind 'collection': lands under `collection/` as a `-o`
  original that IS the stored full-resolution photo" -- it stages under `staging/`, `:79-103` of the
  same file, and is re-encoded and purged); `components/common/image-viewer.tsx:42-46` (the buckets are
  "one press on the caption away" -- they are always shown, `:1011-1016`), `:300-301` (cites
  `heightAt` in photo-carousel.tsx, which no longer exists), `:311-319` ("`ViewerImage` carries no
  dimensions" -- it has `width`/`height`, `:107-111`), `:1037` ("a caption longer than its two lines" --
  `CAPTION_CLAMP` is four); `components/common/photo-carousel.tsx:281-287` ("at rest the frame IS this
  photograph's height ... nothing is ever bedded" -- the box is fixed per set since 2026-09-16 and
  beds by design, `photo-layout.ts:355-380`); `lib/photo-layout.ts:195-197` (`kept`: "Nothing renders
  this ... what a future crop handle shows" -- `photo-aim.tsx:146` reads it), `:466-467` ("or at 375px
  if it is tall" -- tall frames reach 500 since the 4:5 change), `:500-504` ("the carousel's height
  table"), `:634-639` (the "same target as a NUMBER" docblock sits on `PHOTO_GRID_MAX_SCALE` but
  describes `PHOTO_GRID_TARGET_PX`); `components/collection/river-controls.tsx:18-20` ("the count is a
  sentence, and the order is the last word of that sentence" -- the count was cut, `:183-188`), `:150`
  ("the decade strip below it"); `components/collection/photo-scrubber.tsx:66-73` ("The river is
  cursor-paginated"); `lib/collection.ts:180-185` (a docblock for `PHOTO_YEAR_MIN` stranded above
  `DECLINE_REASON_MAX`, naming a "year dropdown" that is now a box), `:331-340` ("pre-1960s is
  everything before that", "the `takenYear` generated column" -- it is `takenKey`, and the floor is
  pre-1940s); `app/(main)/collection/actions.ts:612-618` (search reads "the Where line, the legacy free
  tags" -- it reads caption and name, `:664-670`; and see 14 on "served by trigram indexes");
  `components/collection/collection-client.tsx:1462-1466` (the same Where/free-tags claim);
  `lib/image.ts:215-233` (19-line tombstone for the deleted black-and-white measurement), `:255`
  ("shape, focal point, colour" -- no colour), `:65` ("quality 90" -- the archive is q100);
  `lib/image-cdn.ts:45-47` ("the VIEWER fetches the original" -- it opens the screen copy, and Download
  goes through `/api/photo/download`), `:109-114` and `:150-154` (history of the removed HALF and
  `sheet` variants); `components/collection/photo-questions.tsx:48-54` ("the viewer still prints it,
  and editing one leaves it alone" -- `area` is dropped), `:19-21`; `lib/collection-viewer-image.ts:41-42`
  ("the Where line"); `app/api/photo/download/route.ts:57` ("the four roots" -- `KNOWN_ROOTS` has five);
  `components/common/lazy-image-viewer.tsx:6,36` ("Six files", "five surfaces" -- four shipped callers);
  `app/(main)/collection/[id]/page.tsx:72-74` (a second comment restating the one below it).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each pair of line references above is the claim and the code that contradicts it.
- **What to do**: correct each to what the code does, or cut it where the only content is the removed
  design (the B&W tombstone belongs in `docs/planning/FEATURES.md` if the filter is ever wanted, which is
  where a parked idea lives; git keeps the code). Do not trim reasons, dates, owner quotes or
  measurements around them.
- **Saving**: ~70 comment lines cut, ~20 corrected.
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.
- **Notes**: the presign docblock matters most: the Collection's staging model is exactly the kind of
  thing TRAPS.md exists because sessions misread (the `toDisplayWebp` trap).

### collection-media-24 - `contributePhoto` and `contributePhotoDirect` each look the uploader up again for `photoTrusted`
- **Where**: `src/app/(main)/collection/actions.ts:270-274` and `:444-448`
  (`prisma.user.findUnique({ where: { id }, select: { photoTrusted: true } })`);
  `src/lib/collection-viewer-facts.ts:33-38` (`viewerFacts`, `cache()`d, already selects `photoTrusted`
  "for the callers that need it").
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: a class contribution already calls `viewerFacts` in `contributionScope` (`:149`), so the
  class path reads the same row twice.
- **What to do**: `const me = await viewerFacts(session.user.id)` in both (the direct path keeps its
  early-started promise: `const mePromise = viewerFacts(...)`).
- **Saving**: ~8 lines; −1 query per class contribution.
- **Risk & gate**: low. `npm run check`; one valley and one class contribution.
- **Confidence**: medium-high (React `cache()` scoping inside a server action is per request in this
  app's other actions; confirm by query log).

## Owner decisions

**A. Retire the script that swept up photographs stranded in August.**
- *What I'd change*: delete a one-off clean-up tool that already did its job twice, and its line in the
  scripts list.
- *What you'd notice*: nothing; it has not had anything to do since 5 September.
- *If I guess wrong*: if stray photographs ever reappear in that old place, the tool is one command away
  in history.
- *Options*: (a) delete it now; (b) keep it.
- *If you don't reply*: (a). *(sweep-stranded-originals.mjs, scripts/README.md:84, collection-rework
  handover close-out)*

**B. The voice answers for Catch-ups are fully wired on the server and switched off.**
- *What I'd change*: nothing yet. The two upload doors for recordings were built on 14 September and are
  waiting for you to pick the recorder's look in the lab.
- *What you'd notice*: nothing either way until the recorder ships.
- *If I guess wrong*: about 700 lines of code and tests are kept for a feature you may not want.
- *Options*: (a) keep waiting; (b) park it (remove the doors and note the idea in the ideas list).
- *If you don't reply*: (a). *(api/upload/audio/**, voice-answer-rule.ts, storage.copyObject/readObjectHead)*

**C. The phone-scrubber design room keeps its own copy of the design you picked.**
- *What I'd change*: have that lab room show the real, shipped scrubber for the face you chose, instead
  of its own copy, while keeping the three faces you did not choose.
- *What you'd notice*: in the lab only; the room might show small differences that have crept into the
  real one since you picked it.
- *If I guess wrong*: the room stops showing the exact version you judged.
- *Options*: (a) point the room at the real one; (b) leave the room exactly as it is.
- *If you don't reply*: (b). *(lab/collection/scrub/_scrubbers.tsx vs photo-scrubber.tsx, 7 jscpd clones,
  ~130 lines)*

## Not-findings
- **`photo-suggest.ts` is not an orphan.** madge only walks `src/`; the file is imported by
  `scripts/dev/tag-photos-pick.mjs:35` and `tag-photos-apply.mjs:40`, and `docs/spec/hand-run-passes.md`
  ("A `<NAME>_RULES` exported string beside the vocabulary") puts it in `src/lib` on purpose. It never
  ships (no app module imports it). knip, which reads `scripts/`, correctly does not flag it.
- **`photo-layout.ts`'s comment ratio (3.32) is the product.** Reason, kept: `PHOTO_MAX_HEIGHT`'s
  docblock -- "500, the owner's number on 2026-08-27 ... '560 makes one post take up my entire desktop
  screen which shouldn't happen.'" Restatement/stale, cut in 23: `drawnSize`'s "the carousel's height
  table" and `kept`'s "Nothing renders this". Of ~531 comment lines I would cut or fix about 25.
  `image-cdn.ts` (6.57) is the same story with more history in it (23).
- **`HeightAlgebra` in `photo-layout.ts`** evaluates one expression as CSS and as numbers so the tests
  can assert the CSS rule; `carouselHeight` is test-only by design. Keep.
- **`LEGACY_BUCKETS`** (`collection.ts:84-104`) is the hand-run-pass protocol's vocabulary-evolution
  mechanism, and the demo seed still writes old values (`demo-seed/content.ts`, e.g. `"banyan,flora"`).
- **`PhotoLove_photoId_idx` (0 scans)** is the foreign-key index for cascade deletes and love counts on a
  14-row table the planner always seq-scans; keep.
- **The hand-written TIFF walker** (`taken-date.ts`) rather than `exifr`/`exif-reader`: it is
  isomorphic, date-only by construction and "cannot name a GPS tag" (audit M12). Keep.
- **`public/images/collection/` (25 files, 3.6 MB)**: every file is referenced -- the six `demo-*-thumb`
  files through `demo-seed/seed.ts:325`'s `${ph.file}-thumb.webp` template. Six thumbnails (~297 KB) are
  used only by `/lab/viewer`.
- **Two contribute actions** stay two: the direct path's every-exit-must-purge (C-063, pinned) is not
  something to share; 04 shares the encode, not the refusals.
- **The viewer's learned-shapes map** is still needed: feed, letters and Catch-ups pass no dimensions,
  and the Collection needs the screen copy's own pixel count to decide when to fetch the master.
- **`maxDuration = 60` on both Collection pages**: the contribute actions run in the page's function.
- **The permalink loads the photograph before the page data** (sequential on purpose: the river behind
  it depends on the photograph's half).
- **`collection-intake.ts` copies bytes instead of aliasing the post's object** (audit M11).
- **`storage.ts`'s local-filesystem branch**: the only way a checkout without R2 works.
- **`/api/photo/download` streams**: Vercel caps a buffered response at 4.5 MB.
- **`keyBelongsTo` (storage) vs `ownUploadsPrefix` (upload-ownership-rule)**: the rule module has no
  imports so a bare `node --test` can load it. Deliberate.

## Audit carry-overs in this territory
- **E11 collection tail (PARTIAL)**: `toViewerImage` x3 (`fresh-code-03`) DONE (`1f6f9e43`, pinned by
  `collection-viewer-image.test.mjs`); photo-meta column map (`collection-09`) DONE in the app
  (`photoRowData`), the album importer keeps its own raw INSERT; two contribution pipelines into one
  ingest (`fresh-code-01 ⊃ collection-06 = media-viewer-04`) STILL OPEN -> 04; viewer cross-dissolve
  copied into the stage (`media-viewer-12`) STILL OPEN -> 11.
- **Row #20 / Q6 (a), "the upload fallback stops shrinking"**: DECIDED 2026-09-07, NOT DONE; media.md
  still calls it open -> 04.
- **G5 (three-hook split, FEATURES.md #2)**: PARKED; 01 removes ~300 lines from the file first.
- **G10 (one asker for the upward pull)**: MOOT; its subject is guarded off by the geometry model -> 01.
- **FEATURES.md #5 ("sport also matches transport")**: premise MOOT for the six buckets (no value is a
  substring of another; `actions.ts:603-606` records the check); only index use is left as a reason.
- **Audit 2's bug hand-offs** "quota follows the wrong half after a swap" and "intake quota counts
  without scope": STILL LIVE, never filed in bugs.md -> 07, 09.
- **D5 (drop `area`/`freeTags`, `collection-08`)**: DONE in production; schema/TRAPS/media.md still say
  unrun -> 15.
- **C11 (fetch the other half's facts on swap)**: DECLINED for UX; 06 does not reopen it.
- **C1 (cache the permalink's row)**: DONE (`loadPhoto` is `cache()`d, pinned).

## For other lenses
- bug: a cold `/collection?...&when=YYYY&order=taken` link seeks on the server but opens at the newest
  year (client ignores `above`, never sets `landOn`); `collection-client.tsx:1196-1207` never measures
  the column if the river mounts after the page (empty half, no-match search); `/api/photo/download`
  accepts `staging/` and `audio/` keys via `keyForUrl` (`keepExif` on a staged original would keep its
  GPS; an audio key would throw mid-stream); Tailwind v4 `transition-[...,transform]` with
  `active:scale-*` animates nothing in `common/carousel-arrow.tsx:93-94` and `common/photo-aim.tsx:160`
  (the trap `photo-river.tsx:193-212` documents).
- data-layer: every 2026-09-07 drop has run (Group, OutboundEmail, Post.groupId too) while
  `schema.prisma` says otherwise; `schema.prisma`'s 91 KB (mostly comments) is embedded verbatim as
  `inlineSchema` in `src/generated/prisma/internal/class.ts` (92,393 chars), i.e. in every server
  function bundle that imports Prisma -- worth measuring whether Prisma 7 needs it and whether comments
  can be kept out.
- auth: every Collection request reads `User` twice by primary key (`auth()`'s credentialVersion check
  and `viewerFacts`).
- lab: `lab/collection/scrub/_scrubbers.tsx` clones `photo-scrubber.tsx` (7 clones, ~130 lines; owner
  decision C); `lab/collection/page.lab.tsx:177-215` keeps its own upward walk, which is what
  `e2e/collection-seek.spec.ts` drives, so that spec does not test `CollectionClient`; `/lab/viewer` is
  the only caller of `ViewerImage.where` (12).
- catchups: `lib/photo-wall.ts` + `components/catchups/edition/photo-run.tsx` render a category with
  zero prompts in the database (the file says so); `lab/catchups/wall/_corpus.ts:266` duplicates
  `byContributor`; `catchups/home/picture-picker-dialog.tsx` (knip: unused file) clones `photo-aim.tsx`.
- feed: `posts/use-composer-uploads.ts:154-164` re-writes `uploadOneImage`'s finalize ceremony (jscpd).
- common-primitives: `SpringPress`'s typing forces `{...({...} as object)}` spreads
  (`attach-image-dialog.tsx:176-188`, `contribute-room.tsx:1218`).
- docs: `docs/spec/media.md:34` is leftover agent narration ("I now have a thorough grounding ... This
  is my deliverable, returned directly as my final message"); §4.3 (blurhash), §7, §8 and §9 still teach
  the pre-rework design; `collection-rework/handover.md` (1,587 lines) is a finished campaign's living
  doc.
- scripts: the R2 client + env check is written out in `import-album.mjs:122-148`,
  `backfill-screen-copies.mjs:72-91` and `sweep-stranded-originals.mjs:51-62` (jscpd found the last
  pair); `backfill-image-dimensions.mjs:5` and `scripts/README.md:75` still say it measures "colour";
  `backfill-screen-copies.mjs` re-downloads every "not lighter" master on each run (it cannot tell them
  from rows it has not reached).
- prisma-demo-seed: `demo-seed/content.ts:655-677` still describes "CSS-columns masonry".

## Metrics
- Lines read fully: ~19,000 (components/collection 6,776; app/(main)/collection 1,782; lib sources
  6,099; common media sources 2,679; API routes 689; scripts 1,005) plus ~170 lines of script headers,
  specs 2,700, and ~700 lines of test bodies; ~4,400 test lines read by test name.
- Biggest files: `collection-client.tsx` 1,799 (863 code / 836 comment); `contribute-room.tsx` 1,338;
  `actions.ts` 1,282 (657 / 517); `image-viewer.tsx` 1,113 (595 / 472); `photo-river.tsx` 773;
  `photo-layout.ts` 731 (160 / 531); `collection.ts` 608.
- Comment-heaviest (comment/code): `image-cdn.ts` 6.57, `collection-viewer-facts.ts` 3.50,
  `photo-layout.ts` 3.32, `caption-tidy.ts` 3.20, `collection-image.ts` 2.51, `upload-shared.ts` 2.03.
- jscpd clones touching the territory: 33 (7 of them the lab scrubber; 6 the `togglePhotoLove`-shaped
  auth/gate preamble shared with the feed and Catch-ups actions, which is the C-189 gate contract and not
  a finding; 2 the tag-photos/tag-professions pair, which is the hand-run-pass protocol).
- Findings: 24 (T1 7, T2 13, T3 4; structural 16, cheap 8); owner decisions 3; not-findings 15.
- DB: 16 statements touching Photo/Image are in the top 120 by total time; about 8 of them come from
  the Collection's page and river code as it stands (#11, #14, #22, #31, #51, #52, #80, #102), the rest
  from the feed rail, the admin list, the album import, a backup COPY and superseded code. The most
  expensive per call on a page view is the half-emptiness count (#11: 8.63 ms mean, 14.9 s total).
- Projected savings if all land: ~820 source+test lines (01 ~540, the rest ~280), ~4 KB minified client
  JS, 1 import cycle, 1 DB index (147 KB), 2-3 queries and 2-3 sequential DB waits per Collection page
  view, 2 live bugs closed (07, 09) and 1 owner decision shipped (04).
