# collection-b - adversarial verification notes

Cluster: **collection-b** (the Collection: client, server actions, scripts, tests, photograph
pipeline). 15 finding ids. Verified read-only at HEAD **74cc61a** (the brief's baseline was
72b5a1d; the one commit since, `fix(retention): notifications are kept 30 days, everywhere`,
touches nothing in this territory -- `git diff --stat 72b5a1d..HEAD` lists only prune.mjs,
retention.ts, notice/[id], privacy, post-notifications, two docs and progress.md).

Working tree: clean apart from the untracked audit folder. The `M src/components/common/image-viewer.tsx`
that the session opened with is now committed (it is 72b5a1d, `fix(viewer): the chrome stays
under a resting cursor`), so nothing I read was somebody's uncommitted WIP.

Verdict counts: 7 confirmed, 8 confirmed-with-correction, 0 refuted outright (one sub-claim of
lab-10 is refuted inside a finding that otherwise stands).

---

## duplication-15 - hand-rolled admin checks outside requireAdminAction
**confirmed-with-correction.**

Seen at HEAD, verbatim:
- `src/app/(main)/collection/actions.ts:1039` (`approvePhoto`), `:1078` (`approvePhotos`),
  `:1159` (`declinePhoto`), `:1231` (`adminRemovePhoto`) -- all four are exactly
  `if (session?.user?.role !== "admin") return { error: "Not authorized" };`
- `src/app/lab/actions.ts:31` -- `return { ok: false, error: "Not authorized." };` (the full stop
  audit 1 quoted is still there).
- `src/lib/admin.ts:86-93` `requireAdminAction` returns `{ error: "Not authorized" }`; its
  docblock (`:80-85`) is the banner the finding quotes.

Corrections a fix session needs:
1. **Five is the count for THIS scope, not the repo.** The same hand-rolled comparison also sits
   at `feed/actions.ts:486` and `:1019`, `messages/actions.ts:39`, `support/actions.ts:253` (each
   combined with an id check, so they are a slightly different shape). If the fix is framed as
   "the last five", it will miss those four; if it is framed as "the four in collection/actions.ts
   plus lab", it is right.
2. **`lab/actions.ts:31` is not a literal swap.** It is nested inside
   `if (process.env.NODE_ENV !== "development") { ... }` (`:29-32`) and returns `{ ok: false, error }`,
   not `{ error }`. `requireAdminActor()` (`admin.ts:104`) returns `{ ok: false; error }` and fits;
   `requireAdminAction()` does not without mapping.
3. **All four collection actions still need the session afterwards** -- `approvePhoto` writes
   `approvedById: session.user.id` (`:1049`), `approvePhotos` the same. So the swap either keeps
   the `await auth()` line as well (free: `auth()` is `cache()`d, audit 1) or uses
   `requireAdminActor()` and reads `actor.actorId`. The second is what `admin/people/actions.ts`
   does.
4. **The named gate is wrong.** `src/lib/admin-guard-rule.test.mjs` reads only
   `profile/admin-actions.ts` and `admin/people/actions.ts` -- it never opens collection/actions.ts.
   The real pin is `src/lib/gate-coverage.test.mjs:26`, whose GATE regex accepts
   `await auth(`, `requireAdminAction` and `requireAdminActor` alike, so it stays green either way.

## duplication-18 / lib-tests-14 - the two Collection e2e specs
**both confirmed.** They are the same finding from two lenses and they agree.

- `raw/jscpd-e2e.txt` lists exactly four clones, 34 lines, 2.09 %: `111:40-119:16` vs `521:43-525:16`,
  `129:80-142:8` vs `381:89-391:8`, `478:57-484:75` vs `608:23-617:73`, `561:82-568:27` vs
  `584:41-591:27` -- all inside `collection-seek.spec.ts` (623 lines). I read all four pairs.
  `readInChronologicalOrder` (111-120) and `readChronologicallyOnAPhone` (520-526) really are the
  same three steps differing only in the readiness wait (a lit rail row vs the first `h2[data-band]`).
  129-142 and 381-391 are both `desktopOnly -> readInChronologicalOrder -> pressYear("1953") -> expect the band`.
- Cross-file twins confirmed: `rail` at `collection-seek.spec.ts:37` and
  `collection-journeys.spec.ts:41` (identical selector), and `drawn` at seek `:43` (reads the
  RAIL's opacities) vs journeys `:47` (reads the RIVER's img srcs) -- the same name, two meanings,
  one file apart. That is the sharper half of the finding.
- `page.goto("/lab/collection")` appears 10 times in seek (`grep -c`).
- The extraction is safe: `e2e/playwright.config.ts:34` is `testDir: "."`, and only the `setup`
  project overrides `testMatch` (`:103`, `/auth\.setup\.ts/`); `desktop` and `mobile` (`:105`, `:114`)
  take Playwright's default `**/*.@(spec|test).?(c|m)[jt]s?(x)`, so a helper named `e2e/_collection.ts`
  is not collected as a test. duplication-18 states this fact and lib-tests-14 does not, so
  **duplication-18's steps are the safer ones to hand a fixer.**

## fresh-code-01 - fold the two contribution pipelines
**confirmed-with-correction.** The duplication is real and larger than jscpd saw.

Verified at HEAD: `contributePhoto` 246-391; `contributePhotoDirect` 454-676; the `let` blocks at
305-313 and 542-549; `"Photo is over the 20MB limit"` at 285, 556, 563; the `photoTrusted` lookup
written twice (`361-364` and `537-541` as `mePromise`); the import glitch at `:38`
(`  isImageFile,} from "@/lib/upload-shared";`, with a stray blank line at 37); the misplaced
comment at `392-394` sitting above `createPhotoRow`'s docblock while describing the key check at
472-486. All exact.

Corrections:
1. **The "1 query per direct contribution" saving only exists for class contributions.**
   `contributionScope` (`actions.ts:200-244`) short-circuits at `:205`
   (`if (asked !== "class") return { ok: true, scope: "valley", classYears: null };`) and issues NO
   query on the valley path. So merging `photoTrusted` into its select is query-neutral for a
   valley contribution (the common case) and saves one for a class contribution.
2. **The direct path already hides that round trip.** `mePromise` is started at `:537`, before the
   sharp work, and awaited at `:634`. Hoisting it into a `contributorFacts()` called before the
   image work moves it back onto the critical path. Round trips, not wall clock, is the honest unit.
3. **The gate is understated, and this is the one thing that will bite.**
   `src/lib/image-purge-rule.test.mjs` does more than pin the `refuse` shape:
   - `:151` `assert.equal([...raw.matchAll(/await putAllOrNone\(/g)].length, 2)` over the WHOLE of
     collection/actions.ts;
   - `:152` `await Promise.all([ putImage` must appear 0 times in that file;
   - `:145-146` `await createPhotoRow(` exactly 2 and `}, [url, thumbUrl]);` exactly 2;
   - `:77` `return refuse(` at least 5 below the guard, `:59` `refuse` must still purge.
   The finding's "What to do" puts `putAllOrNone` **inside** the extracted ingest function, which
   drops the count in that file to 0 and fails `C-064: a half-stored pair is not left half-stored`.
   The fix must either leave both `putAllOrNone` calls in their doors (my preference; it is what
   media-viewer-04 proposes) or update those assertions in the same commit and say why.
4. Overlap: **media-viewer-04 is the safer first move.** It extracts only the encode
   (`encodeCollectionMaster`), which disturbs none of the pins, and it treats the 1600/q80 vs
   full-res/q100 difference as the owner's bytes decision rather than a refactor detail.

## fresh-code-02 - one lazy viewer, one preload, one latch, one opener
**confirmed-with-correction.**

`grep -rn 'import("@/components/common/image-viewer")' src` returns exactly 10 hits in 6 files, as
claimed: five `dynamic()` (collection-client:71, letter-images:19, post-card:68, photo-wall:30,
answer-photos:37), four `preloadViewer` module consts (photo-river:27 exported, post-card:80,
photo-wall:33, answer-photos:40), and one inline `onPointerEnter={() => void import(...)}` at
letter-images:51.

Corrections:
1. **The latch is in four files, not five.** letter-images (`openAt`/`mounted`, 36-37), post-card
   (`viewerAt`/`viewerMounted`, 201-206), photo-wall (`at`/`mounted`, 39-40), answer-photos
   (`at`/`mounted`, 90-91). `collection-client` has `viewerMounted` seeded
   `useState(Boolean(openPhoto))` at `:945` plus `viewer: { list, index } | null` at `:946-954` --
   the finding itself calls this "genuinely different", so the headline count should say four.
   A shared `useViewerLatch(initiallyMounted = false)` would need that seed argument if
   collection-client is ever folded in.
2. **`PhotoButton` and `Opener` are near-twins, not identical.** `post-card.tsx:89-119` carries
   `border border-border` in its class string and takes `onPreload` as a prop; `answer-photos.tsx:42-75`
   has no border, reads the module const, and has a two-branch aria-label
   (`count > 1 ? "View photo N of M full screen" : "View this photo full screen"`). A shared
   `PhotoOpener` needs both as props, which is fine, but "same class string" is not true today.

## fresh-code-03 - `toViewerImage` written three times
**confirmed-with-correction.**

jscpd's pair is real and the two lab bodies are byte-identical:
`lab/collection/page.tsx:238-251` and `lab/collection/swap/page.tsx:267-280`, both
`photos.map((p) => ({ src, caption, author: p.uploader, date: p.takenLabel, where: p.area,
tags: p.subject.map(bucketLabel), href, loved, loveCount }))` inside a `useMemo`.

Correction: the shipped `toViewerImage` (`collection-client.tsx:105-127`) is **not** the same
mapping. It adds `alt`, narrows `author` to `{ id, name }`, runs `where` through
`areaLabel(p.area)`, appends `...p.freeTags` to `tags`, and adds `canEdit`/`editLabel`. Sharing it
therefore changes what the two lab rooms draw: the Where line becomes the label instead of the raw
slug, and `canEdit` goes true for the fixture rows with `isOwn: n % 17 === 0` (`_archive.ts:163`).
That last one is harmless -- `image-viewer.tsx:674` gates the pencil on `current.canEdit && onEdit`
and neither lab room passes `onEdit` -- but a fix session should know it, not discover it.
Typing is fine: `_archive.ts:165` ends `} satisfies PhotoData`, so a shared
`toViewerImage(p: PhotoData, isAdmin = false)` accepts the fixture.

## fresh-code-06 - the six-field photo-meta normalisation
**confirmed-with-correction.**

Type clone confirmed against jscpd (`raw/jscpd.txt:218-219`: `actions.ts [461:7-470:15]` vs
`[1281:10-1290:15]`). The three input shapes are `contributePhotoDirect` 454-467, `editPhoto`
1279-1287, `ReviewAnswers` 33-40 -- same six fields plus each caller's extras (`key`+`scope`+`area`,
`id`, none). `parsePhotoMeta` re-normalises at `collection-photo.ts:76-82`.

Correction: **only two of the three call sites normalise.** `editPhoto:1312-1319` and
`saveReview:69-76` both do `caption: x.caption || undefined, buckets: x.buckets?.filter(Boolean), ...`;
`contributePhotoDirect:524-531` passes the fields straight through with no `|| undefined` and no
`filter`. So "the normalisation is happening twice per call" is true of two sites, and the
`contributePhoto` FormData path (290-301) is a third, different shape again (it reads
`formData.getAll("buckets").map(String).filter(Boolean)`). The saving is still ~20 lines; the
description should not claim all three call sites are the same.

## fresh-code-16 - `BucketTiles` `mixed` prop
**confirmed**, every line as stated.

`bucket-tiles.tsx:55-57` docblock ("several photographs at once"), `:58` `mixed = []`, `:63`
`mixed?: string[]`, `:78` `const some = !on && mixed.includes(b.value);`, `:100-113` the nested
ternary whose middle arm is `some ? "border-canopy/40 bg-canopy/[0.08] text-foreground"`.
The only caller is `photo-questions.tsx:127-130` and it passes `value` and `onChange` only.
`git log -S"mixed={" -- src/components/collection` returns `0d7ae30` and `6af8433`, i.e. the prop
was added and its caller removed. `contribute-room.tsx:543-545` says the multi-select "apparatus
went with it". Nothing else in `src` uses the identifier as a prop.

## fresh-code-17 - unused exports
**confirmed**, sub-claim by sub-claim.

`raw/knip-repo-config.txt` lines 60-64, 75, 78 list `preloadViewer`, `bandsOf`, `READING_LINE`,
`RIVER_ORDERS`, `orderLabel`, `PEEK_CREST`, `PHOTO_SCOPES`. I re-grepped each over `src scripts e2e`:
- `bandsOf` (photo-river:202) used only at photo-river:403; `READING_LINE` (:258) at :286 and :329.
- `RIVER_ORDERS` (river-controls:63) at :71, :246; `orderLabel` (:70) at :240, :242.
- `PHOTO_SCOPES` (photo-visibility-rule:23) only at :24 to derive `PhotoScope`.
- `PhotoPatch` (edit-photo-dialog:57) only at :79.
- `captionNeedsTidying` (caption-tidy:95) only in `caption-tidy.test.mjs`; `review-room.tsx:65`
  imports `tidyCaption` alone.
- `PEEK_CREST` (hoopoe-geometry:331) only at :336.
Safety check the finding implies but does not spell out: `river-query.test.mjs` reads
`photo-river.tsx` with `readFileSync` (`:34`) and none of its regexes mention `export`, so dropping
the keyword on `bandsOf`/`READING_LINE` cannot fail it.
One thing to make explicit for the fixer: `storedClassYears`, `PHOTO_NOT_VISIBLE` and
`MAX_CLASS_YEARS` are **imported by** `photo-visibility-rule.test.mjs:5-13`, so their `export`
must stay; the finding says keep them, and that is right for a mechanical reason as well as the
parked-feature one.

## fresh-code-22 - collection-client local duplications
**confirmed.** All five sites read as described:
- the queue seed object at `259-263` and again at `267-271` (identical three keys including the
  computed `[filters.scope ?? "valley"]`);
- the four clears at `350-353` inside `chooseScope` and at `1284-1287` inside "Show everything";
- `{!trulyEmpty && (` at `1106` and `1124`, adjacent siblings inside one fragment;
- `wantsNewer = useCallback(..., [])` at `562`;
- the hand-rolled 300 ms debounce from `356`.

Small correction for the fixer: `setSeekBand("")` appears at 319, 330, 353, 365 and 1287, but only
353 and 1287 are the four-clear group. `chooseBucket` (317-320) and `chooseOrder` (328-331) clear
the seek ALONE and deliberately (their docblocks at 313-316 and 322-327 say why), so a `clearQuery()`
helper must not be pushed onto them.

## fresh-code-23 - the permalink queries twice
**confirmed.** `generateMetadata` runs `Promise.all([photo.findUnique, user.findUnique])` at
`[id]/page.tsx:51-63` and decides visibility at `:66-72`; the page then calls `loadPhoto(id)` at
`:96`, which runs `photo.findUnique` at `actions.ts:960-963` and the same
`user.findUnique({ select: { verifyState, batchYear } })` at `:973-976` and decides visibility again
at `:977-983`. Four row lookups, one decision made twice.

Useful detail the finding gets right and a fixer will need: `collection-data.ts` has **no**
`"use server"` directive (line 1 is an import), while `collection/actions.ts:1` is `"use server"` --
so `loadPhoto` cannot be wrapped in `cache()` where it lives, and the finding's instruction to put
the cached reader in `collection-data.ts` is the correct route.

## fresh-code-24 - the rAF scroll throttle in two files
**confirmed-with-correction.**

Both blocks exist: `photo-river.tsx:348-356` with cleanup at `362-366`, and
`photo-scrubber.tsx:194-203` with cleanup at `207-210`. Both use
`let frame = 0 ... if (frame) return; frame = requestAnimationFrame(...)`, both add the listener
`{ passive: true }`, both `cancelAnimationFrame` on teardown.

Correction: **they are not identical.** The scrubber's handler is
```
const wake = () => {
  setShown(true);          // every scroll event, OUTSIDE the frame guard
  if (frame) return;
  ...
};
```
`setShown(true)` at `:196` is the scrubber's whole reason for listening at all (it is what makes
the thumb appear when the river moves). A bare `onScrollFrame(fn)` helper as proposed would
swallow it. The helper needs a second "on every event" callback, or the scrubber keeps its own.
That pushes this further toward the finding's own "mark optional" and its medium confidence.

## fresh-code-25 - `PhotoScope` compared by hand
**confirmed.** `actions.ts:157` is `scope: p.scope === "valley" ? "valley" : "class",` and its own
comment at `153-156` says "Read strictly, the same way `isValley` reads it" -- the finding's point
made by the code itself. `isValley` is `photo-visibility-rule.ts:144-146` with the fail-closed
docblock at `141-143`. `collection-data.ts:68` is the opposite default with the reason spelled out
at `62-67`, and the finding is right to leave it alone.

## lab-10 - things outside the lab that drive lab routes
**confirmed-with-correction**, and the correction matters because the finding exists to stop a
later session breaking something.

Verified present: `scripts/dev/centroid.mjs:16` (`BASE = "http://localhost:3000/lab/centroid"`),
`scripts/dev/apple-edge/compare.mjs:18` (`/lab/glass-edges`), `look.mjs:8-9` and `:29`
(default route `/lab/glass-edges`, documented `/lab/hoopoe-marks`), `scripts/qa/crawl.mjs:44`
(`'/lab'` is the last entry of the `routes` array), `scripts/qa/phase6-probe.mjs:84-98` (M19's
three postures), `scripts/qa/audit-status.mjs:483-490` (M19 asserts `"/lab"` is absent from
`publicPaths`), `scripts/qa/protocol-audit.mjs:39` (`return includeLab ? out : out.filter(...)`),
`src/components/common/motion-features.tsx:19-22` (not `strict`, because the lab rooms use `motion.*`).

**Refuted sub-claim: `e2e/collection-journeys.spec.ts` does not drive `/lab/collection`.** Its only
navigation is `page.goto("/collection")` at `:91` -- the real route, against the live archive, with
each test skipping itself when the data cannot exercise it (header, `:36-38`). Line 8, which the
finding cites, is prose *about* the other spec: "the seek spec drives /lab/collection". So exactly
**one** committed Playwright suite (`collection-seek.spec.ts`, 10 gotos, 10 tests) depends on
`/lab/collection`, not two. The constraint itself stands unchanged -- freezing the room out of a
main build still breaks that suite, `verify:crawl`, `dev:centroid` and the apple-edge scripts.
Second, smaller: the seek spec's header at `:22-24` says the live archive holds "a handful of
photographs", not two; the "two photographs that both say asdf" is a live-database claim I cannot
check here and it is not load-bearing.

## media-viewer-04 - three encodes, five recipes
**confirmed-with-correction.** Every recipe verified at HEAD:
- fallback `actions.ts:339-342`: `.resize(1600, 1600, {fit:"inside", withoutEnlargement:true}).webp({quality: 80})`
- direct `actions.ts:600-603`: `storedResizeBox(...)` + `.webp({ quality: COLLECTION_WEBP_QUALITY })`,
  and `upload-shared.ts:91` is `export const COLLECTION_WEBP_QUALITY = 100;`
- composer tick `collection-intake.ts:126-131`: `putImage(original, ...)` -- the feed's already-encoded
  bytes copied as-is, exactly as claimed
- feed/letters/catchups `image.ts:63-69` (1920, q80), avatar `settings/actions.ts:104-105` (512 cover, q82)
- `scripts/dev/import-album.mjs:365-374` re-implements the direct recipe (`storedResizeBox`,
  `QUALITY` defaulting to `COLLECTION_WEBP_QUALITY`)
- `storage.ts:147-150` ("quietly take the slower proxied path instead of failing loudly") and
  `TRAPS.md:163-170` both quoted accurately.

Corrections:
1. **`git blame` softens "unchanged since 21eb32f 2026-06-27" slightly.** Line 341 (the 1600 box)
   is indeed 21eb32f; line 342 (`.webp({ quality: 80 });`) is `f648e52b 2026-09-02` -- that commit
   split both chains to introduce `const encode` for `withExif`, and in it the DIRECT path was
   still `quality: 90`. So the q80 value has never been reconsidered, but the line was touched on
   the very day the finding says the decision was made, by a commit that left it alone. The
   substance (nothing argues for 1600/q80) is unaffected.
2. **Item (4) is aimed slightly wrong.** `TRAPS.md:165-167` already names the path:
   "The Collection's real encode is an anonymous chain inside `contributePhotoDirect`". What the
   entry lacks is the fallback's exception, so the edit is "add: the FormData fallback still boxes
   to 1600 at q80", not "name which path".
3. The gate reasoning is right where fresh-code-01's is wrong: an `encodeCollectionMaster` helper
   that builds only the sharp chain leaves `image-purge-rule.test.mjs`'s counts
   (`putAllOrNone` == 2 at `:151`, `Promise.all([putImage` == 0 at `:152`, `createPhotoRow` == 2 at
   `:145`) untouched. **If the fix session takes fresh-code-01 instead, those three assertions move.**

---

## Cross-finding notes for the compiler
- fresh-code-01 and media-viewer-04 are the same seam from two sides. media-viewer-04's step (2)
  is the safe increment; fresh-code-01 is the ambitious version and needs the image-purge pins
  edited. Sequence them that way, and let the owner answer media-viewer-04's question (does the
  fallback store the same archive?) before either lands, because the answer changes what the
  merged function does.
- duplication-18 and lib-tests-14 are one item. Ship duplication-18's version.
- fresh-code-02 and fresh-code-03 both touch `collection-client.tsx`'s viewer block and both are
  low risk; they can be one commit.
- Nothing in this cluster needs the database or a browser to settle.
