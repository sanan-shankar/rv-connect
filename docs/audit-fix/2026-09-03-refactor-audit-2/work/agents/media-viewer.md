# media-viewer - refactor audit 2 report

Territory reader for the shared photograph primitives and the image pipeline: the full-screen
image viewer and its chrome, pinch-zoom, the carousel, the frame, the rows layouts, the aim
(focal-point) tool, the attach-image well and dialog, the closing-dialog and focus-modality
hooks, the avatar crop dialog and upload hook, the three photo surfaces that open the viewer
(letters, catch-up answers, the catch-up photo wall), and the lib that turns bytes into WebP and
URLs into CDN paths (image.ts, image-cdn.ts, image-downscale.ts, image-record.ts,
image-purge.ts, storage.ts) with their tests. Date: 2026-09-03, at HEAD `72b5a1d`. Files in
territory: 29 source/test files (6,093 lines) plus 14 tracked webp under `public/lab/crop/`;
read fully: 29 of 29 source files, every line.

## Coverage

- Read fully: `src/components/common/{image-viewer.tsx, image-viewer-chrome.test.mjs,
  photo-carousel.tsx, photo-frame.tsx, photo-rows.tsx, photo-aim.tsx, pinch-zoom.ts,
  pinch-zoom.test.mjs, carousel-arrow.tsx, attach-image-dialog.tsx, attach-well.test.mjs,
  focus-modality.tsx, use-closing-dialog.ts}`, `src/app/(main)/image-aim.ts`,
  `src/components/settings/{avatar-crop-dialog.tsx, avatar-upload.ts}`,
  `src/components/letters/letter-images.tsx`, `src/components/catchups/round/{answer-photos.tsx,
  photo-wall.tsx}`, `src/components/catchups/answer/photo-attachments.tsx`,
  `src/lib/{image.ts, image-cdn.ts, image-downscale.ts, image-record.ts, image-purge.ts,
  storage.ts, image-fit.test.mjs, image-facts.test.mjs, image-purge-rule.test.mjs}`.
- Read to answer the charter's questions (not audited as territory): `src/lib/upload-shared.ts`
  (whole), `src/app/api/upload/route.ts` and `finalize/route.ts` (whole),
  `src/app/(main)/collection/actions.ts` lines 300-360 and 545-640,
  `src/lib/collection-photo.ts` (whole), `src/lib/collection-intake.ts` 90-135,
  `src/components/posts/post-card.tsx` 89-119, 195-240, 500-660,
  `src/components/posts/use-composer-uploads.ts` (whole), `src/components/messages/message-composer.tsx`
  1-140, `src/components/collection/contribute-room.tsx` 600-700, `contribute-stage.tsx`
  20-80/130-160/190-220/320-350, `collection-client.tsx` 36-115/955-975/1365-1400,
  `photo-river.tsx` 15-35/86-104/468-478, `src/lib/photo-layout.ts` 160-260/325-420 and its
  export list, `photo-step.tsx` (whole), `letterhead-profile.tsx` 138-152/400-432/1450-1475,
  the three lab pages that import the viewer (headers), `docs/spec/media.md` (whole),
  `docs/TRAPS.md` "Serving images", `docs/planning/collection-rework/spec.md` sections 4-5,
  the handover's `/lab/crop` close-out lines, the `progress.md` entry for `72b5a1d`, and the
  `72b5a1d` diff itself.
- Skimmed: `docs/spec/avatars.md` (grep only: it has no crop section; the only crop sentence is
  line 379, superseded. The avatar crop dialog's spec IS its own header, "owner item 13").
- Not read: nothing in territory.
- Uncommitted edits seen: none in territory. The conversation-start snapshot listed
  `src/components/common/image-viewer.tsx` as modified; by the time I read it,
  `git status --short` was clean for that path and HEAD was still `72b5a1d`, so whichever
  session had it open had either committed nothing new or reverted its edit. Everything below
  is judged against the committed file.

## Summary

This territory is the newest code in the repo (23 of its 29 files were added or rewritten after
audit 1 closed, most between 2026-08-27 and 2026-09-03) and it is unusually well argued: the
comment-to-code ratios are high because the comments carry owner quotes, dates, measured
numbers and audit ids, which audit 1 ruled is the product. The structural well is not dry, but
it is shallow in lines and deep in *places*: the wins are "one place instead of five" rather
than big deletions.

The biggest structural findings, in their honest units:

1. The image viewer has ONE component and FIVE hand-wired entry ramps (six with the
   Collection's exported preload). Each caller repeats the `dynamic()` import, the preload
   import, the `mounted` latch and the `at`/open/close state: roughly 15 lines x 5. One
   `lazy-image-viewer.tsx` module and a small hook would make it one ramp (~40 lines, 5 clones,
   and the one place the latch bug can live). See 01.
2. The production build emits the viewer NINE times (9 chunks, 15.9-27.4 KB raw each,
   5.6-9.4 KB gzip); /feed and /profile each load two copies. It is never in a first load, so
   this is a per-route re-download cost (~5.7 KB gz per route family, five families), not a
   first-load one. Whether one import() site collapses it is a rebuild-and-count question. See 02.
3. The "press that opens the viewer" button is written five times with the same 300-character
   class string and the same aria-label (post-card, answer-photos, letter-images, photo-wall,
   photo-river). See 03.
4. The charter's pipeline question, answered: there is not one resize pipeline, there are FIVE
   server-side encode recipes in four files, and the Collection alone has THREE depending on
   which door the photograph came in (full-res q100 direct; 1600px q80 on the FormData fallback,
   unchanged since June; a straight copy of the feed's 1920px q80 bytes from the composer tick).
   TRAPS.md's "the Collection does NOT downscale" is true of one of the three. See 04.
5. The thing that fooled two sessions (`toDisplayWebp`'s 1920 box is the feed's) is written down
   in TRAPS.md and in image-cdn.ts but NOT on the function itself, and the constant that
   describes the Collection's real budget (`MAX_STORED_PIXELS`) sits 22 lines away from its own
   docblock because the feed's function was inserted between them. See 05.

Structural-vs-cheap split: 8 structural (01-04, 06, 10, 12, 18) and 10 cheap (05, 07-09, 11,
13-17); about 20 KB of tracked+deployed bytes are simply dead (three orphan lab specimens,
332 KB). What surprised me: today's viewer fix (`72b5a1d`) is sound at the root (the body lock
never worked; the html lock does) but the chrome-idle mechanism it extended is now three effects,
a ref, an interval, a tri-state and a `:hover` poll for one idea, and the fix quietly moved
`IDLE_MS` from 2.6 s to 3.6 s inside a bug commit. Nothing audit 1 left open touches these files.

The charter's explicit questions are answered in a block after the findings.

## Findings

### media-viewer-01 - Give the image viewer one entry point instead of five hand-wired ramps
- **Where**: `src/components/posts/post-card.tsx:67-80, 201-209, 640-646`;
  `src/components/letters/letter-images.tsx:18-21, 36-37, 48-50, 71-78`;
  `src/components/catchups/round/answer-photos.tsx:36-40, 90-95, 182-189`;
  `src/components/catchups/round/photo-wall.tsx:29-33, 39-40, 54-57, 104-115`;
  `src/components/collection/collection-client.tsx:70-73, 938-945, 1258, 1316, 1375-1388`;
  `src/components/collection/photo-river.tsx:27` (the exported `preloadViewer` knip lists as
  unused - it is used inside the file, only the `export` is dead).
- **Phase**: dedupe (with an architecture edge)
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: every caller writes the same four things: (1) `const ImageViewer = dynamic(() =>
  import("@/components/common/image-viewer").then((m) => m.ImageViewer), { ssr: false })`;
  (2) `const preloadViewer = () => void import("@/components/common/image-viewer")`;
  (3) a `mounted`/`viewerMounted` latch plus an `at`/`viewerAt` index, set together in an
  `open(i)`; (4) `{mounted && <ImageViewer images=... initialIndex={at ?? 0} open={at !== null}
  onClose={() => setAt(null)} />}`. post-card.tsx:201-209 carries the argument for the latch
  ("must STAY mounted after it closes ... must not mount before the first open"); the other four
  copy the mechanism without the argument. `use-closing-dialog.ts:18-21` names the same latch
  as the pattern "everywhere else in this codebase". Six files know the viewer's module path.
- **What to do**: add `src/components/common/lazy-image-viewer.tsx` exporting
  `LazyImageViewer` (the one `dynamic()`), `preloadImageViewer` (the one `import()`), and
  `useImageViewer()` returning `{ at, mounted, open(i), close }` (three `useState` lines and the
  latch, with post-card's comment moved in). Replace the four things in each of the five callers
  with `const viewer = useImageViewer()` and `{viewer.mounted && <LazyImageViewer images=...
  initialIndex={viewer.at ?? 0} open={viewer.at !== null} onClose={viewer.close} />}`.
  collection-client keeps its own `viewer` object (it carries WHICH strip, `ViewerList`) but can
  still take the lazy component and preload from the new module; photo-river imports
  `preloadImageViewer` and drops its own export. Then delete the per-file `dynamic`/`import`
  lines. Keep `ImageViewer` itself untouched.
- **Saving**: ~40 lines net (5 x ~12 removed, ~20 added), 5 clones -> 1, one place for the
  latch bug. Possibly fewer viewer chunks in the build (02).
- **Risk & gate**: medium. `npm run check` (image-viewer-chrome.test.mjs, pinch-zoom.test.mjs and
  the C-157 pin in image-purge-rule.test.mjs read the viewer file, which does not change);
  `e2e/collection-permalink.spec.ts` (viewer open on a shared link); open and close a photograph
  on /feed, /letters/[id], a Catch-up round (card and wall), /profile/[id] and /collection, and
  watch the CLOSE animation on each (the latch exists for it); `npm run visual`.
- **Confidence**: high that the clone is real; medium that a hook is the right shape (an
  alternative is a `<PhotoViewerHost>` component that owns the state and takes an `onOpen`
  render prop, but the callers already thread `open` into deeply nested buttons, so a hook fits
  them better).
- **Notes**: the collection-client's viewer has the extra `list` dimension and `showCount=false`,
  `onToggleLove`, `onEdit`; do not try to fold that into the hook, just share the lazy component
  and preload. This is the finding that answers "do they all go through one entry point": one
  component, five doors.

### media-viewer-02 - The viewer is emitted nine times in the production build; /feed and /profile each fetch two copies
- **Where**: `.scratch/audit2-build/.next/static/chunks/{0czqfvpi1d0d3, 0nxsg2mdm6uxj,
  0oy1wl0rg584e, 172f7wyg930dy, 1g-kxdkg5db2g, 1mknvk_koqi1h, 2soaqx7e1xiuq, 3apbwbzl8qo8i,
  3ay-dhmyr-d1r}.js`; the import sites are the ones in 01.
- **Phase**: architecture (bundle)
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (measure first)
- **Evidence**: `grep -l "data-viewer-chrome"` over the build's chunks returns nine files, and
  every one also contains pinch-zoom (`hasPointerCapture`) and the viewer's copy strings ("Copy a
  link to this photo"). Sizes raw/gzip: 23,876/8,904 (lab/crop), 27,415/9,354 (/collection,
  carries ShareButton and LoveButton too), 22,320/7,822 (catch-ups), 16,178/5,741 (/feed),
  16,430/5,838 (/letters/[id]), 15,931/5,643 (/profile/[id]), 16,141/5,722 (a SECOND copy on
  /feed, loaded from the same parent chunk `0dg3o7twddv0h.js` under a different module id),
  18,191/6,392 (/lab/viewer), 15,894/5,624 (a SECOND copy on /profile, loaded by the same two
  parent chunks as the first). The feed's two chunks begin with byte-identical module bodies
  (module 927657, the Download icon, then the viewer). None of the nine appears in any
  production route's `firstLoadChunkPaths` in `raw/route-bundle-stats.json` (only the three lab
  rooms that import it statically list one), so the viewer costs 0 KB first-load everywhere
  that ships.
- **What to do**: do 01 first, so the app has exactly one `dynamic()` and one bare `import()`
  of the module. Rebuild in the scratch worktree and count again: `grep -l 'Copy a link to this
  photo' .next/static/chunks/*.js | wc -l`. If Turbopack still emits one per route family, that
  is its per-entry chunking and the count will be five; report that number as the floor. If the
  feed's and profile's duplicates are what the two import sites (dynamic vs bare preload) cost,
  the count drops by two at least.
- **Saving**: honest unit is per-session bytes, not first-load: today a member who opens a
  photograph on /feed, /letters, a Catch-up, /profile and /collection downloads the viewer five
  times (~29 KB gz), and on /feed or /profile possibly twice more. Build output: 172 KB raw /
  61 KB gz of nine copies could become one to five.
- **Risk & gate**: low; the gate is the rebuilt count plus opening the viewer on each route.
- **Confidence**: high on the measurement, low on how much a single import site recovers
  (Turbopack's chunk groups are per entry; I could not confirm why letters gets one chunk and
  feed gets two from the same two-site pattern).
- **Notes**: for the bundle lens. Related: `pinch-zoom.ts` imports `animate` and `useMotionValue`
  from `motion/react` while the app animates through `LazyMotion`/`m` (commit 8314f24); if
  `animate` is not already in a shared chunk it rides inside each viewer copy. The chunk sizes
  (16 KB for viewer+pinch) suggest it is shared, but the bundle lens should confirm.

### media-viewer-03 - The "open this photograph full screen" button is written five times
- **Where**: `src/components/posts/post-card.tsx:89-119` (`PhotoButton`);
  `src/components/catchups/round/answer-photos.tsx:43-75` (`Opener`);
  `src/components/letters/letter-images.tsx:44-54` (inline);
  `src/components/catchups/round/photo-wall.tsx:52-62` (inline);
  `src/components/collection/photo-river.tsx:94-103` (`Tile`, collection territory, same class
  string minus the border).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "block w-full overflow-hidden rounded-\[var(--radius-md)\]" src` hits
  exactly those five lines. Four of them carry `aria-label={\`View photo ${i + 1} of ${n} full
  screen\`}` (post-card:110, answer-photos:64-65, letter-images:52, photo-wall:60 varies the
  wording), and all five wire `onPointerEnter`/`onFocus` to the preload. `PhotoButton` and
  `Opener` are the same component with different names and a different `count === 1` label.
- **What to do**: move `Opener` (the more general of the two: it already handles the lone
  photograph's label) to `src/components/common/photo-opener.tsx` as `PhotoOpener`, taking
  `onPreload` from 01's module so callers stop passing it; replace `PhotoButton` in post-card and
  the two inline buttons in letter-images and photo-wall. photo-river's `Tile` keeps its own
  markup (it has a scrim and no border) but can wear the shared class via a `PHOTO_OPENER_CLASS`
  export if the collection agent wants it.
- **Saving**: ~40 lines, 4 clones -> 1 (5 -> 1 if photo-river joins).
- **Risk & gate**: low. `npm run visual` (feed, letters, catch-ups routes are masked past the
  header, so also open each surface and Tab to a photograph: the focus ring and the aria-label
  must survive); `npm run check`.
- **Confidence**: high.
- **Notes**: this is the cheapest of the structural findings and the one most likely to be
  undone by the next surface someone adds; the shared module is what stops the sixth copy.

### media-viewer-04 - The Collection stores three different encodes depending on which door a photograph came through; the app has five server recipes in four files
- **Where**: `src/app/(main)/collection/actions.ts:339-342` (FormData fallback: `.resize(1600,
  1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 })`, unchanged since
  `21eb32f` 2026-06-27); `src/app/(main)/collection/actions.ts:585-611` (direct path:
  `storedResizeBox` + `COLLECTION_WEBP_QUALITY` = 100, full resolution, decided 2026-09-02);
  `src/lib/collection-intake.ts:105-129` (composer tick: `putImage(original, ...)` copies the
  feed's already-encoded 1920px q80 bytes as-is); `src/lib/image.ts:63-69` (feed/letters/
  catch-ups/messages display: 1920 box, q80, via `/api/upload` and `/api/upload/finalize`);
  `src/components/settings/actions.ts:102-105` (avatar: 512 cover, q82). Browser-side, two more
  pre-encoders: `src/lib/image-downscale.ts:24-25` (2048 box, WebP 0.82) and
  `src/components/settings/avatar-crop-dialog.tsx:52-56` (512 canvas, WebP 0.82).
- **Phase**: dedupe / architecture
- **Tier**: T3     **Class**: structural     **Decides**: owner (it changes what the archive
  stores on one path; a bytes-and-quality call)
- **Evidence**: `collection-photo.ts:1-17` says the three Collection paths were deliberately kept
  three for their cleanup stories, and that "what had no business being three" (meta, trust,
  thumbnail, row) was unified - but the master encode was not on the list. The fallback path's
  comment (actions.ts:328-331) says only that the browser canvas-downscales for it; nothing
  argues for 1600/q80 against the direct path's full-res/q100, and the number predates the
  owner's 2026-09-02 quality decision by ten weeks. `storage.ts:147-150` documents that a browser
  whose origin is not in the R2 CORS allowlist "quietly take[s] the slower proxied path instead
  of failing loudly" - so on that browser a heritage scan is stored at 1600px q80 in an archive
  whose TRAPS entry promises full resolution. `TRAPS.md:163-166` ("The Collection does NOT
  downscale ... full resolution, bounded only by a 40-megapixel AREA cap") describes the direct
  path only.
- **What to do**: (1) owner decides whether the fallback should match the direct path (full-res
  within `storedResizeBox`, q100; the input is already boxed to 2048 in the browser, so
  "full-res" here means at most 2048px) or stay tight. My recommendation: match it - the
  fallback is meant to be the same archive on a worse network, not a different archive.
  (2) Either way, add `encodeCollectionMaster(input: Buffer, keepDate)` to `collection-photo.ts`
  beside `gridThumb` (rotate, `storedResizeBox`, `COLLECTION_WEBP_QUALITY`, `withExif` when
  dated, `toBuffer({ resolveWithObject: true })`) and call it from both dialog paths, so the
  recipe has one home the way the thumbnail already does. (3) Leave the composer tick as a copy
  but say so in its comment: a feed photograph tipped into the Collection is the feed's 1920px
  q80 derivative, never the original, because the original was purged at upload. (4) Update
  TRAPS.md:163-166 to name which path it is describing. `scripts/dev/import-album.mjs:314-379`
  re-implements the direct recipe; under `docs/spec/hand-run-passes.md` that conformance is
  deliberate and stays.
- **Saving**: ~10 lines, 1 clone, and one answer to "what does the archive store".
- **Risk & gate**: medium. `src/lib/image-purge-rule.test.mjs` pins `contributePhotoDirect`'s
  body shape (C-063: every refusal below the guard goes through `refuse`, `putAllOrNone` count
  == 2, `Promise.all([putImage` count == 0) - a helper that only builds the encode does not
  disturb those, but run `npm run check` and read that test before moving lines.
  `image-fit.test.mjs` covers `storedResizeBox`. Then contribute one photograph through each door
  in dev (direct, and the FormData fallback by unsetting the R2 env) and compare stored
  dimensions.
- **Confidence**: high on the facts; the recommendation is the owner's call.
- **Notes**: cross-boundary - `collection/actions.ts` and `collection-intake.ts` are the
  collection agent's; it is here because the charter asked me this exact question. This also
  answers "is there one resize pipeline or three": five recipes server-side, two browser-side,
  and the only shared function (`sharpImage`) is the decoder policy, not a recipe.

### media-viewer-05 - Say at `toDisplayWebp` whose recipe it is, and put `MAX_STORED_PIXELS` back under its own docblock
- **Where**: `src/lib/image.ts:33-49` (the 40MP docblock), `50-69` (`toDisplayWebp`, inserted
  between the docblock and its constant by `60e8ee0`, 2026-08-26), `71` (`export const
  MAX_STORED_PIXELS`). The sentence that would have stopped both hallucinations lives at
  `docs/TRAPS.md:163-176` and `src/lib/image-cdn.ts:32-34`, not on the function.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: reading image.ts top-down, the docblock beginning "The most pixels this app will
  STORE in a re-encoded image ... 40MP" is immediately followed by "The display copy of an
  uploaded photograph: uprighted, boxed to 1920" and a function - the exact juxtaposition TRAPS
  says produced "this is the second time a session has hallucinated that we're compressing
  collection photos". `toDisplayWebp`'s own docblock (50-62) speaks of "both processing routes"
  without naming them or excluding the Collection.
- **What to do**: move lines 50-69 above line 33 (or the constant up under its docblock), and add
  one sentence to `toDisplayWebp`'s docblock: "This is the FEED's derivative (callers:
  /api/upload and /api/upload/finalize). The Collection never calls it; its master is
  `storedResizeBox` + `COLLECTION_WEBP_QUALITY` in collection/actions.ts, full resolution." Then
  trim the duplicate explanation at image-cdn.ts:32-34 to a pointer.
- **Saving**: 0 lines; prevents the third session.
- **Risk & gate**: none beyond `npm run check` (image-fit.test.mjs imports the constants by name).
- **Confidence**: high.
- **Notes**: charter question "does the code say so once, in one place" - no: it is said in
  TRAPS.md and image-cdn.ts, twice, and not at the function.

### media-viewer-06 - The `/api/upload` client is written three times (cross-boundary clone with line ranges)
- **Where**: `src/components/catchups/answer/photo-attachments.tsx:86-115` (FormData, fetch,
  `res.json()`, error toast, notice toasts, facts merge, `onChange`);
  `src/components/messages/message-composer.tsx:72-82` (FormData, fetch, json, error toast,
  notice toasts, `setImageUrl`); `src/components/posts/use-composer-uploads.ts:178-212`
  (`uploadOneFile`: FormData, fetch with a 60 s abort, json, error, `keep(images)`, notice
  toasts). The facts merge is verbatim twice: `photo-attachments.tsx:101-109` ==
  `use-composer-uploads.ts:113-122`. The charter named letter-images as the third copy; it is
  not - `letter-images.tsx` is a display component, and the letters desk attaches through
  `create-post-form` -> `use-composer-uploads` (letter-desk.tsx imports create-post-form).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: all three build `FormData` with `append("files", f)`, `fetch("/api/upload", {
  method: "POST", body })`, read `{ urls, images, notices, error }`, toast `notices` with the same
  audit-M15 comment, and differ only in the timeout (composer) and what they do with `urls`.
- **What to do**: add `postImages(files: File[], opts?: { timeoutMs })` to
  `src/lib/upload-client.ts` (feed-posts territory; it already owns `directUploadPut`) returning
  `{ urls, images }` and throwing an `Error` with the server's sentence, toasting notices inside
  it; have the three callers call it. Keep `shrinkForUpload` at the CALL SITES, not inside the
  helper: `src/lib/upload-size-rule.test.mjs` pins that each sender file matches
  `/shrinkForUpload|downscaleImage|useAvatarUpload/`, and a helper that swallowed the shrink
  would turn that pin red for the right reason. Move the facts merge into 01's sibling or into
  the helper's return shape (`Record<string, PhotoFacts>` keyed by url) so both composers stop
  writing the loop.
- **Saving**: ~30 lines, 2 clones (3 fetch blocks -> 1, 2 facts merges -> 1).
- **Risk & gate**: low-medium. `upload-size-rule.test.mjs` must stay green; attach a photograph
  in a Catch-up answer, in a support message and in the composer with the R2 env unset (so the
  proxied path is the one taken); `npm run check`.
- **Confidence**: high.
- **Notes**: for the feed-posts lens, which owns upload-client.ts; listed here because two of the
  three copies are in my files.

### media-viewer-07 - Options every caller leaves at their default, and props no caller passes
- **Where**: `src/components/common/image-viewer.tsx:113-114, 471` (`ViewerImage.downloadName`:
  no caller anywhere, including the three lab rooms); `src/components/common/photo-frame.tsx:82,
  109` (`alt`, never passed: every photograph in feed, letters and catch-ups renders `alt=""`)
  and `85, 120-123` (`eager`, never passed); `src/components/common/photo-rows.tsx:83, 90-91`
  (`PhotoRows.gap`, never passed), `86, 95-97` (`PhotoRows.keyOf`, never passed - only
  `PhotoStream` callers pass it), `161, 170-171` (`PhotoStream.targetHeight`, never passed),
  `162, 172-179` (`PhotoStream.maxScale`, never passed);
  `src/components/common/carousel-arrow.tsx:58, 70` (`size`, never passed);
  `src/components/common/attach-image-dialog.tsx:102, 106, 116, 173` (`AttachImageWell` is
  exported with no importer - the header at 22-24 says the Collection does not embed it - and
  its `className` is never passed).
- **Phase**: placeholder
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: per-prop greps over `src/components` and `src/app` excluding the defining files
  and lab; each listed prop has zero call sites (the `eager` and `size=` hits belong to
  bird-avatar, hoopoe-warmup and unrelated ui files).
- **What to do**: delete `downloadName` (the `basename()` fallback stays); delete `eager`
  (`loading="lazy"` unconditionally, which is what every caller gets today); delete `PhotoRows`'s
  `gap` and `keyOf` (position keys are right for a post's fixed handful, the comment already says
  so); delete `PhotoStream`'s `targetHeight` and `maxScale` params and inline
  `PHOTO_GRID_TARGET` and `2.5` with their existing comments; delete `CarouselArrow.size`
  (inline 16); drop the `export` and `className` from `AttachImageWell`. KEEP `PhotoFrame.alt`
  but wire it: pass the letter's or post's caption from letter-images and post-card, because
  `alt=""` on every photograph in the app is an accessibility gap this prop was written to
  close and nobody finished.
- **Saving**: ~20 lines, six fewer option surfaces.
- **Risk & gate**: low. `npm run check` (TypeScript catches any caller I missed);
  `attach-well.test.mjs` pins `export function wellClass` and one `border-dashed` in the file -
  neither moves.
- **Confidence**: high for the deletions; medium on `alt` (a design choice whether the caption
  is the right alt text - the viewer already uses `current.alt ?? caption`).
- **Notes**: `PhotoStream.as` ("ul" for the photo wall) and `gap` (photo-wall passes 16) are
  used and stay. `ImageViewer`'s `showCount`, `onToggleLove`, `onEdit` and the six
  Collection-only `ViewerImage` fields are one caller's, and that is the design (spec section 5:
  one component shared by feed, letters and Collection) - a not-finding, listed below.

### media-viewer-08 - Three orphan crop specimens are tracked and deployed for nothing
- **Where**: `public/lab/crop/grainy-420.webp` (38,124 B), `public/lab/crop/pano-21x9.webp`
  (153,150 B), `public/lab/crop/phone-9x16.webp` (141,394 B).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: added by `26dc483` (2026-08-27, "six ways to hold a photograph"); `6fb0780`
  (2026-08-28, "the crop room shows what we do") replaced the room's specimen set with the eleven
  `shape-*.webp` files, whose paths are the only ones in `src/app/lab/crop/_specimens.ts`. A
  grep for the three names across `src`, `docs`, `e2e`, `scripts` and `public` finds them only
  in the audit's own `raw/tracked-files.txt`. Everything under `public/` ships to Vercel's static
  output, so they are deployed on every push as well as tracked.
- **What to do**: `git rm` the three files. Nothing else changes.
- **Saving**: 3 files, 332,668 tracked bytes, the same bytes off every deploy.
- **Risk & gate**: none. `npm run check` (the lab registry audit does not read `public/`).
- **Confidence**: high.
- **Notes**: the eleven live specimens (1,583,430 B) and the room are an owner decision - see
  "Owner decisions". Do not delete those on the strength of this finding.

### media-viewer-09 - Today's viewer fix is sound at the root, but the chrome-idle mechanism it extended wants its own hook, and it re-tuned a constant inside a bug fix
- **Where**: `src/components/common/image-viewer.tsx:227-232` (tri-state), `244` (`lastNudge`),
  `279-282` (`onTapPhoto` toggles), `396-416` (nudge listeners: pointermove, wheel, keydown),
  `418-440` (400 ms interval: focus check, `:hover` poll behind `matchMedia("(hover: hover)")`,
  time check), `150` (`IDLE_MS` 2600 -> 3600 in `72b5a1d`), plus five `data-viewer-chrome`
  marks (625, 639, 651, 695) and one `data-viewer-scroll` (742). Scroll lock: `321-342`.
- **Phase**: architecture (hygiene edge)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the charter asked whether `72b5a1d` is a patch on a patch. Verdict, in two
  halves. (a) The page-behind fix is the ROOT cause corrected, not a patch: `document.body.style
  .overflow = "hidden"` never reached the viewport because `globals.css` clips `<html>`
  sideways, so the lock was a no-op for a fortnight; moving it to `documentElement` is the right
  fix, and the non-passive wheel/touchmove guard with the `data-viewer-scroll` exemption is a
  reasoned belt (iOS rubber-band). It is now pinned four ways in `image-viewer-chrome.test.mjs`.
  (b) The chrome-idle half IS accretion: the concept "hide the chrome when nobody is using it"
  is spread across one state, one ref, three effects (396-416, 418-440, and the `expanded`
  dependency), an interval, a media query, and a `:hover` poll added because a parked mouse
  sends no pointermove. Each increment is argued in a comment and each is right on its own; the
  sum is 60 lines in the middle of an 800-line component that a reader has to hold together.
  Separately, `IDLE_MS` moved from 2.6 s to 3.6 s in the same commit; the progress entry and the
  commit subject describe two bugs and do not mention a timing change, and the constant's
  comment was not updated with a reason for the new number.
- **What to do**: extract `useViewerChrome({ open, expanded, dialogRef, stageRef })` into
  `src/components/common/viewer-chrome.ts` (beside `pinch-zoom.ts`, same shape: a hook returning
  `{ chrome, hidden, show(), toggle() }`), moving lines 227-232, 244, 396-440 and the `IDLE_MS`
  block with their comments verbatim. `image-viewer.tsx` drops ~65 lines and reads as
  layout+keyboard+download; the mechanism reads as one file with one header. Add one line to
  `IDLE_MS`'s comment saying when and why it became 3.6 s (or put it back to 2.6 s if the change
  was accidental - that is a question for the session that made it). Do NOT replace the `:hover`
  poll with per-control pointer listeners; the comment at 427-435 argues the poll and the test
  pins `[data-viewer-chrome]:hover`.
- **Saving**: 0 lines net (relocation), one 800-line file becomes ~735 + ~90; clarity.
- **Risk & gate**: low-medium. `image-viewer-chrome.test.mjs` reads `image-viewer.tsx` for
  `[data-viewer-chrome]:hover`, `matchMedia("(hover: hover)")`, the `wheel`/`nudge` listener and
  the absence of a `pointerdown` nudge - move those regexes to read the new file (or make the
  test read both) in the same commit. `pinch-zoom.test.mjs` is untouched. Then the measured
  checks from the progress entry: cursor parked on Next for 20 s, chrome still there; cursor on
  the photograph, gone by 18 s.
- **Confidence**: high on the diagnosis, medium on whether the owner wants a second hook file
  (it mirrors `pinch-zoom.ts`, which he accepted yesterday).
- **Notes**: three wheel listeners now live on the overlay (pinch-zoom's surface `onWheel`,
  non-passive; the viewer's window `block`, non-passive; the viewer's window `nudge`, passive).
  Each has a stated reason and they do not conflict (the surface handler runs first and zooms;
  `block` then prevents the default the surface already prevented). Worth one sentence in the
  new hook's header so the next person does not "simplify" one away.

### media-viewer-10 - The viewer's SSR portal guard exists for three lab rooms
- **Where**: `src/components/common/image-viewer.tsx:235-239` (`portal` state + effect),
  `459-462, 467` (the `useLayoutEffect` has `portal` in its deps because the first render is
  null), `528` (`if (!portal) return null`). Static importers: `src/app/lab/viewer/page.tsx:22`
  (registry status: archived), `src/app/lab/collection/page.tsx:7`, `src/app/lab/collection/
  swap/page.tsx:57` - all "use client" pages, which Next still renders on the server.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (touches one import line
  in each lab room, not the rooms' content)
- **Evidence**: every shipped caller loads the viewer with `dynamic(..., { ssr: false })`, so in
  production the component never renders on the server and `document.body` is always available
  on its first render. The comment at 235-237 says the guard is for `/lab/viewer`. The
  `useLayoutEffect` dependency at 459-462 is a bug fix for a symptom the guard itself caused.
- **What to do**: after 01 exists, have the three lab rooms import `LazyImageViewer` from the
  new module instead of `ImageViewer` from the component; then replace the `portal` state with
  `createPortal(..., document.body)` and drop `portal` from the layout effect's deps (and its
  four-line comment).
- **Saving**: ~8 lines, one state, one effect, one dependency hack.
- **Risk & gate**: low. Open `/lab/viewer`, `/lab/collection` and `/lab/collection/swap` and
  press a photograph; `npm run check` (the lab registry audit); the caption "More" must still
  appear on a long caption (that is what 459-462 was for).
- **Confidence**: high.
- **Notes**: a lab room importing the real module is the point of `/lab/viewer` ("the REAL
  shared module, not a copy"); importing it lazily keeps that true.

### media-viewer-11 - The carousel evaluates a cubic-bezier by bisection that the motion library already exports
- **Where**: `src/components/common/photo-carousel.tsx:71-86` (`ease`, 16 lines: a bezier
  sampler with a 12-step bisection).
- **Phase**: library
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `node_modules/motion-utils/dist/index.d.ts:89` declares `cubicBezier(mX1, mY1,
  mX2, mY2): (t: number) => number` and exports it (line 140); `motion` depends on it. The
  carousel's `ease(t)` is exactly `cubicBezier(...EASE_OUT_SMOOTH)(t)`.
- **What to do**: `const ease = cubicBezier(...EASE_OUT_SMOOTH)` and delete lines 71-86.
  Confirm the import path first: `framer-motion` re-exports motion-utils' easings, so
  `import { cubicBezier } from "motion"` should resolve; importing `motion-utils` directly would
  reach through a transitive dependency and is not worth the fragility.
- **Saving**: ~14 lines.
- **Risk & gate**: low. Press an arrow on a three-photograph post on /feed and watch the slide;
  `npm run check`. No pin reads this function.
- **Confidence**: medium (I did not confirm the `motion` entry re-exports `cubicBezier`; if it
  does not, this is a not-finding).
- **Notes**: bloat signature 1 ("single-use helper") is not the objection - the objection is a
  hand-rolled numeric solver beside a dependency that ships one.

### media-viewer-12 - The viewer's cross-dissolve and the carousel's arrow-key handler are copied into the Collection's contribute stage
- **Where**: `src/components/common/image-viewer.tsx:173-184` (`STEP_SECONDS`,
  `FRAME_VARIANTS`) == `src/components/collection/contribute-stage.tsx:145-163` (`STEP_SECONDS`,
  `CARD`, plus `pointerEvents: "none"` on exit); the argument for the opposite curves is written
  out at image-viewer.tsx:152-172 and summarised again at contribute-stage.tsx:39-51. And
  `src/components/common/photo-carousel.tsx:283-292` == `contribute-stage.tsx:203-213`
  (jscpd: 11 lines, 57 tokens - the ArrowRight/ArrowLeft `onKeyDown`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/jscpd.txt` line 632-633 for the key handler; the variants clone is by
  reading (contribute-stage's header says "it is <ImageViewer>'s step, copied down to its two
  curves"). Both files carry the sentence "motion.tsx has no ease-IN twin to import; if one is
  ever added, use it".
- **What to do**: export `CROSS_DISSOLVE = { seconds: 0.22, enter, center, exit }` from
  `src/components/common/motion.tsx` with the opposite-curves argument moved there once (it is a
  motion rule, and motion.tsx is where `EASE_OUT_SMOOTH` lives); import it in both. For the key
  handler, a four-line `arrowKeys(at, go)` helper in the carousel-arrow module (`onKeyDown={
  arrowKeys(at, go)}`) removes one copy.
- **Saving**: ~20 lines, 2 clones, and the dissolve argument in one place.
- **Risk & gate**: low. Step through a post carousel and the contribute stage; `npm run visual`.
- **Confidence**: high.
- **Notes**: cross-boundary with the collection agent (contribute-stage.tsx is theirs). Related
  to the not-finding on motion.tsx having no ease-in constant: adding `EASE_IN_STEP = "easeIn"`
  there is what both comments ask for.

### media-viewer-13 - Small hygiene inside the viewer and three stale comments about it elsewhere
- **Where**: `src/components/common/image-viewer.tsx:196-203` (`basename` wraps
  `split`/`slice` in try/catch; string methods on a string cannot throw), `495-503` (`hasMore =
  overflows` - an alias kept from the version where "More" also hid the tags, with a seven-line
  comment; the owner quote is a why-comment and belongs on the caption block, the alias does
  not), `627` and `641` (the two step arrows carry the same 330-character class string, differing
  only in `left-4`/`right-4`; `ICON_BUTTON` at 193 shows the house pattern);
  `src/components/letters/letter-images.tsx:14-17` ("is 444 lines carrying the app's only drag
  gesture" - it is 804 lines and the gesture is in pinch-zoom.ts);
  `src/components/settings/avatar-crop-dialog.tsx:296-297` ("Drag precedent: image-viewer.tsx
  (dragElastic 0.14, the house rubber-band)" - the viewer no longer uses Motion drag and
  `pinch-zoom.test.mjs:30-39` pins that it never comes back);
  `src/components/common/attach-image-dialog.tsx:4-8` lists "the Collection" among the places
  that use the well while lines 22-29 say it does not.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: by reading; the two arrow lines differ at one token.
- **What to do**: drop the try/catch (keep the `|| "photo"`); use `overflows` directly and move
  the owner quote up to the caption block's comment; hoist `ARROW_BUTTON` beside `ICON_BUTTON`;
  rewrite the three stale sentences (letter-images can just say "the viewer is deferred so a
  letter never tapped into never fetches it"; the crop dialog's precedent is now
  `pinch-zoom.ts`'s swipe constants; the well header's first sentence loses "the Collection").
- **Saving**: ~12 lines and three lies.
- **Risk & gate**: `npm run check`. `image-viewer-chrome.test.mjs` counts `data-viewer-chrome`
  occurrences (>= 5) - hoisting the class string does not move the attribute.
- **Confidence**: high.

### media-viewer-14 - `headObjectSize` dynamically imports `fs/promises` that the file already imports
- **Where**: `src/lib/storage.ts:199-208` (`const { stat } = await import("fs/promises")` inside
  a try) against line 9 (`import { writeFile, mkdir, unlink, readFile } from "fs/promises"`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: by reading; the local-dev branch is the only one that uses `stat`.
- **What to do**: add `stat` to the static import and write the branch as `try { return (await
  stat(path.join(process.cwd(), "public", key))).size; } catch { return null; }`.
- **Saving**: 3 lines, one fewer await-import in a server module.
- **Risk & gate**: `npm run check`; `security-regressions.test.mjs` and `purge-rule.test.mjs`
  read storage.ts (for `keyForUrl`/`KNOWN_ROOTS`, not this function) - run them.
- **Confidence**: high.

### media-viewer-15 - Constants and one-liners declared twice with a comment promising they match
- **Where**: `src/components/settings/avatar-crop-dialog.tsx:56` and
  `src/lib/image-downscale.ts:25` (`WEBP_QUALITY = 0.82`, the first with "Same quality the
  pre-upload downscaler uses"); `clamp` at `src/components/common/pinch-zoom.ts:64`,
  `src/components/settings/avatar-crop-dialog.tsx:82-84`, `src/lib/photo-layout.ts:203` (and
  three more in the mascot files, outside territory); `quantise` at `photo-aim.tsx:63` is a
  fourth clamp with rounding.
- **Phase**: dedupe (cheap)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: greps above. `motion-utils` also exports `clamp`.
- **What to do**: export `BROWSER_WEBP_QUALITY` from image-downscale.ts and import it in the crop
  dialog (the crop dialog already dynamic-imports nothing from that file, and the constant is a
  number, so it costs no bundle). Leave the `clamp`s alone unless touching those files: audit 1
  measured this kind of dedupe at zero or negative lines.
- **Saving**: 1-4 lines; one promise kept by construction instead of by comment.
- **Risk & gate**: `npm run check`.
- **Confidence**: high that it is cheap; do it only alongside 07 or 13.

### media-viewer-16 - Two directives that claim more than they need to
- **Where**: `src/components/common/carousel-arrow.tsx:1` (`"use client"` on a component with no
  hooks, no browser API and no client-only import; both importers, photo-carousel and
  contribute-stage, are client modules already); `src/components/common/photo-carousel.tsx:243-247`
  (`// eslint-disable-next-line react-hooks/exhaustive-deps` because `frames` is rebuilt every
  render).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `raw/use-client.txt:159` lists carousel-arrow; `raw/type-sludge.txt:119` lists the
  disable. A module imported only from client modules is client whether or not it says so; the
  directive changes no bundle, it is just a false claim of need.
- **What to do**: remove the directive; `const frames = useMemo(() => photos.map(...),
  [photos])` and put `frames` in the effect's deps in place of `photos`, deleting the disable and
  its three-line justification.
- **Saving**: ~4 lines, one eslint-disable.
- **Risk & gate**: `npm run check` (lint); swipe a carousel.
- **Confidence**: high.

### media-viewer-17 - A comment in answer-photos says its multi-photo branches are legacy-only; they are not
- **Where**: `src/components/catchups/round/answer-photos.tsx:129-131` ("Only legacy rows reach
  any of this -- the answer form has taken one photograph per answer since it shipped
  (`PhotoAttachments max={1}`)").
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `src/components/catchups/answer/answer-card.tsx:123` renders `<PhotoAttachments
  images=... onChange=... />` with the default `max = 3` for text answers; only the `photo`
  prompt (line 128) passes `max={1}`. So the carousel (>2) and rows (==2) branches at 128-176
  are live for any text answer with photographs, and the comment would lead a future session to
  delete ~50 lines of live code.
- **What to do**: rewrite the sentence: "A photo prompt takes one photograph (`max={1}`); a text
  answer takes up to three, and this is the branch those take." I considered and rejected
  proposing the branches' removal on the strength of the comment - the `max` default says
  otherwise.
- **Saving**: 0 lines; one future mistake.
- **Risk & gate**: none.
- **Confidence**: high.
- **Notes**: `raw/tsc-unused.txt` flags the unused `photo` render-prop parameter at line 149;
  rename to `_` when touching the file.

### media-viewer-18 - Two answers to one gap: the aim tool measures the file itself for the Catch-up form while the composer asks the server, and the Catch-up form opens hand-aimed photographs at the wrong place
- **Where**: `src/components/common/photo-aim.tsx:94-102, 115-146` (the `facts?` optional path:
  when the caller has no facts it decodes the image to learn width/height and then assumes
  `focalX/focalY = 0.5`); `src/app/(main)/image-aim.ts:82-108` (`myImageFacts`, written so a
  resumed draft's photographs open on the machine's aim, "the one thing this dialog must never
  do" otherwise); `src/components/posts/use-composer-uploads.ts:124-142` (the composer calls
  it on mount); `src/components/catchups/answer/photo-attachments.tsx:49-50, 142-146` (the
  Catch-up form never calls it, so a saved answer's photographs have `facts[src] === undefined`
  and the aim dialog opens at 50%, not where the card is drawing it).
- **Phase**: dedupe (with a behaviour note)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: photo-aim.tsx:98-101 says "a RESUMED draft holds nothing but URLs" and measures;
  image-aim.ts:88-90 says the same sentence and fetches the facts including `focalY` and
  `focalSet`. The measurement path cannot know the aim, so it opens centred - exactly the
  first-frame the composer's path was built to avoid. A Catch-up answer is autosaved
  (`photo-attachments.tsx:12-13`), so "resumed" is its normal state.
- **What to do**: in photo-attachments, on mount and when `images` gains a url with no facts,
  call `myImageFacts(images)` and merge (the same eight lines the composer has at
  use-composer-uploads.ts:129-142; with 01/06 landed, share them). Then make `facts` required in
  `PhotoAimButton` and delete the `Image()` measurement (lines 115-137, ~20 lines) and the
  "measures the file itself" paragraph.
- **Saving**: ~15 lines net, one fewer way to open the dialog wrong.
- **Risk & gate**: low-medium. Open a saved Catch-up answer that has a photograph the member
  aimed by hand and press the crop handle: the window must open where the card draws it. `npm run
  check`. `myImageFacts` runs the C2 ownership check, so a photograph that is not the member's
  own returns nothing and the handle simply does not appear - which is what happens today for an
  image with no facts.
- **Confidence**: medium-high (I have not run the app; the behaviour is read from the code).
- **Notes**: this is a correctness observation that fell out of a duplication hunt. If the fix
  session prefers to keep the self-measure as a fallback, then at least the two paragraphs that
  each claim to be the answer to "resumed drafts" should point at each other.

## Answers to the charter's questions

- **How many surfaces open the image viewer, and do they all go through one entry point?**
  Six surfaces: the feed card (which also serves a member's profile and Saved via post-feed,
  profile-author-feed and saved-posts-feed), a letter's photo stack, a Catch-up answer card, a
  Catch-up photo wall, the Collection river (plus its pending queue and a shared link), and the
  Collection's contribute stage only by comment. One component; five separately wired ramps
  (01), producing nine chunk copies in the build (02).
- **Are photo-rows/photo-frame/photo-carousel three layouts or one layout with three names?**
  Three layouts on one arithmetic. `PhotoFrame` is "one photograph in a column"; `PhotoRows` is
  justified rows that FILL their last row (a card); `PhotoStream` is justified rows that let
  the last row run short with a ghost cell (an archive); `PhotoCarousel` is one-at-a-time with
  the frame's height following the slide. All four call `framePhoto`/`photoRatio`/
  `photoBasis`/`photoGrow` from `photo-layout.ts`, and `photo-rows.tsx:1-40` argues why rows and
  stream differ. The one thing that is the same across them and could be shared is the opener
  button (03). Not a rename problem.
- **Is pinch-zoom used outside the viewer?** No: `grep -rn pinch-zoom src` returns
  image-viewer.tsx and its own test. The avatar crop dialog has its own, smaller gesture model
  (Motion `drag` for one finger, buttons and a wheel for zoom, no swipe, no double tap) and the
  two share only the wheel rate (0.002, both files say so). Sharing them would be forcing a
  two-finger state machine onto a circle that Motion's drag already serves.
- **Does the aim tool have both a Collection and an avatar implementation?** Neither. The
  Collection never crops (spec D11; `PhotoStream` passes `objectPosition: "50% 50%"` and the
  photograph's own ratio), so it has no aim tool. The avatar cropper is a different tool
  (circular window, canvas output, 512px WebP) with a different write path (`updateAvatar`).
  There is exactly one aim implementation (`photo-aim.tsx` + `image-aim.ts`) with two callers
  (the composer and the Catch-up form), and 18 is about those two callers feeding it
  differently.
- **Which of these files are client components only because a leaf needs a ref?** None in
  the strict sense. `photo-frame.tsx` and `photo-rows.tsx` are server-safe (no directive, no
  hooks) - the right shape. `letter-images.tsx`, `answer-photos.tsx` and `photo-wall.tsx` are
  client only because a press opens the viewer, and each says so in its header (answer-photos:
  "the card around it stays on the server"); that IS the leaf pattern, already applied. The one
  directive with no need behind it is `carousel-arrow.tsx` (16). `image-viewer.tsx`,
  `pinch-zoom.ts`, `photo-carousel.tsx`, `photo-aim.tsx`, `attach-image-dialog.tsx`,
  `focus-modality.tsx`, `use-closing-dialog.ts`, `avatar-crop-dialog.tsx`, `avatar-upload.ts`
  and `photo-attachments.tsx` all genuinely hold state, effects or browser APIs.
- **What is the byte cost of the viewer on routes that rarely open it?** 0 KB first-load on
  every shipped route (no viewer chunk appears in any production route's `firstLoadChunkPaths`;
  only `/lab/viewer`, `/lab/collection` and `/lab/collection/swap` carry it statically). It is
  fetched on the first `pointerenter`/`focus` of any photograph button - so on a desktop it is
  usually fetched by mousing over the feed, at 16.2 KB raw / 5.7 KB gz for /feed, 16.4/5.8 for a
  letter, 15.9/5.6 for a profile, 22.3/7.8 for a Catch-up (carries ShareButton), 27.4/9.4 for
  /collection (carries ShareButton and LoveButton). Because each route has its own chunk id,
  the browser cache never shares it across routes (02).
- **Is there dead handling for image formats the pipeline never produces (GIF, AVIF, HEIC)?**
  GIF: live, four sites re-encode GIF to a still and say so (`countImageFrames`,
  `stillPictureNotice`, pinned by C-073), and `sniffImageType` accepts it. HEIC: live as a
  refusal path with a sentence (`isUnsupportedHeic`, the presign route, the downscaler's
  pass-through, the crop dialog's `onDecodeError`), all pinned by the B-030 tests. AVIF, BMP,
  TIFF: the only handling anywhere is `IMAGE_EXTENSIONS` at `src/lib/upload-shared.ts:161`
  (`/\.(jpe?g|png|gif|webp|avif|bmp|tiff?|hei[cf])$/i`), which lets a blank-MIME `.avif`/`.bmp`/
  `.tiff` past the client's "is it a picture" check so the server can refuse it by magic bytes
  with a different sentence. That is dead handling in the sense the charter means - three
  extensions the pipeline can neither decode nor store - but it lives in upload-shared.ts
  (feed-posts territory); noted under "For other lenses". The viewer itself has no per-format
  code at all.

## Owner decisions

**The `/lab/crop` room and its eleven specimens (1,583,430 tracked and deployed bytes).** The
room's own header says "Throwaway. Delete this room, public/lab/crop/ and its registry row once
the rules are settled", the rules are settled (the header also says "Not a decision room any
more -- the rules are chosen and shipped"), and the handover's close-out list says the room stays
"until the owner has looked at phase 3 in it", because it is the only place the shipped
justified rows are drawn beside what each surface did before. So this is yours: either look at
it once (the "several at once" mode, at phone and laptop widths) and let the next session retire
the room, its registry row and the eleven files, or keep it as design history like the other
rooms. My recommendation: look and retire; it was built as a throwaway and every other room in
the registry was not. The three orphan files (08) go regardless.

**The Collection's fallback encode (04).** When a browser cannot PUT straight to R2, a
contribution is stored at 1600 px and quality 80 instead of full resolution at quality 100.
This is invisible: the upload succeeds and nobody is told. Decide whether the fallback should
store the same thing the direct path stores (my recommendation: yes; it costs the same bytes as
any other Collection photograph and it keeps the archive's promise on every browser), or stay
tight to save bytes on a path that should be rare.

## Not-findings

- **`ImageViewer`'s Collection-only props** (`showCount`, `onToggleLove`, `onEdit`, and the
  `href`/`where`/`tags`/`loved`/`loveCount`/`canEdit`/`editLabel` fields of `ViewerImage`): one
  caller passes them, by design - the collection-rework spec section 5 locks "same component,
  still shared by feed, letters and Collection" with love and buckets in the bottom row, and
  the viewer's header quotes the owner on the counter. Not a branch per caller; the richest
  caller fills the shape.
- **The `mounted` latch itself**: defended at post-card.tsx:201-209 and use-closing-dialog.ts:
  18-21 (the close animation needs the tree to stay); 01 moves it, it does not remove it.
- **`PhotoBed` always rendered, even where the bed cannot be seen**: photo-frame.tsx:42-49
  records that hiding it hung `e2e/visual.spec.ts`'s settle() (a `display:none` lazy image never
  loads). Keep.
- **`PhotoRows` vs `PhotoStream` as two components**: photo-rows.tsx:10-28 argues the
  fill-the-last-row / let-it-run-short difference; they are not one component with a flag.
- **The Collection's three contribution paths staying three**: collection-photo.ts:1-17 and the
  C-063/C-064/C-159 pins; 04 unifies the encode, not the paths.
- **`image-record.ts` importing only the TYPE from `image.ts`**: lines 15-19 - keeps sharp out
  of the account-purge and retention bundles. Correct boundary.
- **Test-only exports in `image.ts`** (`meanChroma`, `isGreyscale`, `focalFraction`,
  `UNKNOWN_FOCAL`, `MAX_STORED_PIXELS`, `WEBP_MAX_DIM`, `storedPixelFit`): imported by
  `image-facts.test.mjs`/`image-fit.test.mjs`; the rule-test pattern audit 1 kept.
- **`focus-modality.tsx`**: a 21-line client component in the root layout whose only job is a
  `data-modality` attribute read by `field-focus.ts:62-70` and `search-pill.tsx:249`. Owner
  decision of 2026-08-29 (/lab/focus column A). Needed and minimal.
- **`use-closing-dialog.ts`**: two call sites, both in collection-client; the rAF-late open is
  measured in its header. Not a one-caller abstraction - it is the fix for a bug that two dialogs
  had.
- **Comment mass** in image-cdn.ts (137 comment / 21 code), photo-layout.ts (3.65), image.ts
  (1.27), image-aim.ts (1.50): each carries measured numbers (500 -> 424, 1096 -> 732), dates,
  owner quotes and audit ids. Audit 1's ruling stands; the only comment defects I found are the
  three stale ones in 13 and the misplaced docblock in 05.
- **The avatar dialogs' JSX repeated in `photo-step.tsx:58-76` and
  `letterhead-profile.tsx:1457-1475`**: avatar-upload.ts:22-25 says the hook deliberately left
  "their dialogs' JSX, their words" with each caller. Twenty lines twice; an `<AvatarPicker>`
  would be line-neutral. Defended.
- **`image-downscale.ts` passing GIF and HEIC through untouched**: intentional (animation, and no
  browser decoder), with the size check after it naming the reason. Live.
- **`storage.ts`'s local-filesystem branches**: dev only; the spec's storage shim design
  (media.md section 4.1) and AGENTS.md. Keep.
- **`/lab/viewer` importing the real component while archived**: the registry's archive status
  is the owner's; the room exists to exercise the real module. 10 changes only how it imports.
- **`usePinchZoom`'s 240 ms held single tap** and the other constants: each is argued in the
  header; the tests pin the swipe numbers as "the feel the owner settled".

## Audit-1 carry-overs in this territory

None of report section 4's open owner decisions or refuted rows touches these files. The
Collection's filter-row chrome and taxonomy SELECT are the collection agent's. The
"dynamic-loading half" refutation concerned DemoBar/VerifyEmailBanner, not the viewer, which
was already deferred on every surface when audit 1 closed (letter-images and post-card had it;
the Catch-up surfaces gained it with the 2026-08-28 rebuild).

## For other lenses

- **collection agent**: `photo-river.tsx:27` exported `preloadViewer` (knip; subsumed by 01);
  `contribute-stage.tsx:145-163` and `203-213` clones (12); `collection/actions.ts:339-342` the
  1600/q80 fallback encode and `collection-intake.ts:105-129` the feed-bytes copy (04);
  `photo-river.tsx:94-103` `Tile` shares the opener class string (03).
- **feed-posts agent**: `upload-client.ts` is where `postImages()` belongs (06);
  `use-composer-uploads.ts:113-122` `keep()` is verbatim in `photo-attachments.tsx:101-109` (06)
  and its `myImageFacts` mount effect at 124-142 is what photo-attachments lacks (18);
  `post-card.tsx:89-119` `PhotoButton` -> common (03); `post-card.tsx:67-80, 201-209, 640-646`
  viewer ramp (01); `upload-shared.ts:161` `avif|bmp|tiff?` in `IMAGE_EXTENSIONS` are formats
  the pipeline never accepts (dead-format answer above); `raw/tsc-unused.txt` post-card.tsx:553
  unused `photo` param.
- **bundle lens**: nine viewer chunks, two on /feed and two on /profile (02); whether `animate`
  from `motion/react` (pinch-zoom.ts:61) sits in a shared chunk or inside each copy; the three
  lab rooms that carry the viewer in their first load (expected, static import).
- **catchups agent**: `answer-photos.tsx:129-131` misleading legacy comment (17);
  `photo-attachments.tsx` never fetches facts for saved answers (18); its `handleFiles` is one of
  the three `/api/upload` clients (06).
- **profile/settings agent**: the avatar dialog JSX pair is defended (not-findings), noted so
  nobody re-litigates it.
- **docs lens**: `docs/spec/media.md:31-34` banner says section 4.2 "still true", but 4.2's table
  (display 1600 px q80, an `originalUrl` variant) is superseded by full-resolution q100
  (`upload-shared.ts:80-107`, 2026-09-02) and the viewer fetching `url`; `docs/TRAPS.md:163-166`
  "the Collection does NOT downscale" is true of the direct path only (04).
- **scripts lens**: `scripts/dev/import-album.mjs:314-379` re-implements the direct encode; the
  hand-run-passes protocol says it conforms, so this is context, not a finding.
- **tests lens**: `image-viewer-chrome.test.mjs` reads `image-viewer.tsx` by regex for the idle
  mechanism; 09 moves that mechanism, so the pins move with it in the same commit.

## Metrics

- Lines read in territory: 6,093 across 29 files (every line), plus ~1,900 lines outside it to
  answer the charter's questions.
- Biggest files: image-viewer.tsx 804 (478 code / 291 comment), pinch-zoom.ts 507 (329/141),
  photo-carousel.tsx 407 (241/147), avatar-crop-dialog.tsx 370 (240/109), image.ts 327
  (134/170), photo-aim.tsx 320 (189/113), storage.ts 307 (166/123).
- Comment-heaviest (comment/code): image-cdn.ts 6.5 (137/21), use-closing-dialog.ts 2.3
  (52/23), image-aim.ts 1.5, image.ts 1.27, photo-frame.tsx 1.02, focus-modality.tsx 1.05,
  photo-rows.tsx 0.95. Every one of these ratios is owner quotes, dates and measured numbers
  except the ordering defect in 05 and the three stale sentences in 13.
- Fresh code: 23 of 29 files added or rewritten since audit 1 closed (`raw/files-added-since-
  audit1.txt` lists 17 of them as new files; image-viewer.tsx, image-cdn.ts, image.ts,
  attach-image-dialog.tsx, avatar-crop-dialog.tsx and avatar-upload.ts were rewritten in place).
- Viewer callers: 5 production surfaces + 3 lab rooms; opener-button clones: 5; `/api/upload`
  client clones: 3; server encode recipes: 5 in 4 files (Collection: 3); browser pre-encoders: 2.
- Build: 9 chunks carry the viewer (172 KB raw / 61 KB gz total); 0 KB on any shipped route's
  first load.
- Tracked bytes: `public/lab/crop/` 1,916,098 B in 14 files, of which 332,668 B in 3 files are
  referenced by nothing (08).
- Optional props with zero callers: 9 across 5 components (07).
- Pins that read these files: image-viewer-chrome.test.mjs (4 tests), pinch-zoom.test.mjs (7),
  attach-well.test.mjs (3), image-purge-rule.test.mjs (C-157 on the viewer, C-069 on delImage
  callers, the purge queue shape), image-facts.test.mjs (describe/record pairing on both upload
  routes, forgetImages in two files), upload-size-rule.test.mjs (every sender shrinks),
  focus-recipe.test.mjs (the hidden file input), e2e/collection-permalink.spec.ts (viewer open
  on a shared link).
