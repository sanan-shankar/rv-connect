# collection - refactor audit 2 report

Territory reader for the Valley Collection and the Class Collection: the river, the year rail,
the phone scrubber, the contribute room, the edit dialog, the review room, the two halves, the
hand-run tagging pass and the album importer. Almost all of it was rebuilt after refactor audit 1
closed (2026-08-27) and none of it has been audited before. Date: 2026-09-03. Files in
territory: 51 source/test/script/spec files; read fully: 51. Specs read before judging: 9
(media.md, hand-run-passes.md, collection-rework/{brief,spec,handover,prior-art}.md,
class-collection/spec.md, collection-scrubber/{brief,handover}.md) plus the fifteen
2026-09-02 progress.md entries and the audit-1 report §4/§5.

## Coverage

- Read fully (line by line):
  - `src/app/(main)/collection/{(index)/page.tsx,(index)/loading.tsx,[id]/page.tsx,[id]/loading.tsx,actions.ts,collection-data.ts}`
  - `src/components/collection/*` (13 files incl. `river-query.test.mjs`)
  - `src/lib/{collection,collection-intake,collection-photo,river-cursor,photo-layout,photo-suggest,photo-visibility-rule,exif-date,caption-tidy,image-record}.ts`
  - `src/lib/{collection-date,collection-taxonomy,photo-layout,photo-suggest,photo-visibility-rule,exif-date,caption-tidy,image-facts,river-cursor}.test.mjs`
  - `scripts/dev/{tag-photos-pick,tag-photos-apply,import-album,backfill-image-dimensions,sweep-stranded-originals}.mjs`, `scripts/qa/hand-run-passes.test.mjs`, `.claude/skills/tag-photos/SKILL.md`
  - `e2e/{collection-journeys,collection-permalink,collection-seek}.spec.ts`
  - `src/app/(main)/admin/review/{actions,page,loading}.tsx|ts`, `src/components/admin/review/review-room.tsx`, `src/lib/admin-review.ts`
  - Read for context only (not audited, outside territory): `src/components/feed/rail/collection-module.tsx`, `src/lib/image.ts:95-175`, the `Photo`/`Image`/`PhotoLove` models in `prisma/schema.prisma`, `photoSchema` in `validators.ts`, the Collection pins in `security-regressions.test.mjs`, `image-purge-rule.test.mjs`, `upload-shared.test.mjs`, `append-page.test.mjs`, `heart.test.mjs`, `unattended-rule.test.mjs`, the lab registry entries and the header of `src/app/lab/collection/swap/page.tsx` and `_archive.ts:150-177`.
- Skimmed: none.
- Not read: `src/app/lab/collection/page.tsx` and `swap/page.tsx` bodies (lab lens; I read their imports and headers to know what they take from the shipped components), `src/components/common/photo-rows.tsx` / `photo-carousel.tsx` / `image-viewer.tsx` (media-viewer lens; I read only the constants the Collection copies).
- Uncommitted edits seen: none in the territory (`git status --short` clean on every path above). The working tree's one modified file is `src/components/common/image-viewer.tsx`, outside my territory and somebody's work in progress; I did not open it.

## Summary

This territory is 5,590 code+comment lines of components, 2,884 of lib, 1,762 of route code,
1,003 of review room, 1,189 of scripts, 950 of e2e and about 2,300 of unit tests. Comment
ratio is 0.78 in `components/collection` and 3.65 in `photo-layout.ts`. It was built in a week
of sessions each fixing the last, and the shape that history left is not dead code (knip finds
seven unused exports, all `export` keywords on internal helpers) but **duplicated sources of
truth and effects that ask the same question twice**: three flat props that repeat a map the
same component also receives (and one of the three is wired to the wrong copy, so the contribute
room still promises the other half's quota after a swap, despite commit dad5307 claiming the
fix); the viewer's class facts read from `User` in four places and up to four times on one
permalink load; two contribute paths carrying two encode recipes and parsing the same EXIF block
twice; a head sentinel and a scroll listener both deciding whether to fetch the page above; the
photograph-meta column list written three times.

The biggest win is conditional: `collection-client.tsx:209-221` records a measurement that every
`loadPhotos` call is followed by an RSC re-render of the route (an `history.replaceState` read as
a navigation, with PostHog's history patch in between). If a fix session confirms it in
chrome-devtools, every bucket press today costs `collectionPageData`'s ~9 queries and a server
render on top of the 2-query action, and the 57-line reseed guard exists only to throw that
result away. That, the per-half facts computed for both halves on every load (3 queries a load
for anyone with a class), and the four viewer reads are the queries-per-load findings; the rest
of the structural well is dedupe with modest line counts and one bug, and the cheap well is the
comment mass in `collection-client.tsx` (662 comment lines, several mechanisms narrated three or
four times) and `photo-layout.ts` (about 110 lines of superseded-version history).

Structural findings: 14. Cheap: 3. Owner decisions: 5. Not-findings: 16. What surprised me:
`collection-client.tsx` is the only component in the app with a bidirectional pager, and its
size is mostly honest; the decomposition I propose is line-neutral. What audit 1 left that is
now moot: the Collection filter-row chrome (§4 #17) no longer exists; the taxonomy SELECT (§4
#16) is now answerable and the answer is almost certainly "zero rows, go".

### The charter's questions, answered

**How many sources of truth for "the current scope/half"?** Three representations, one of them
duplicated. (1) The URL `?scope=class`, read by `riverFiltersFrom` (`collection-data.ts:68`) and
written by the client's URL-sync effect (`collection-client.tsx:412`). (2) The server prop
`filters.scope`, which seeds (3) the client state `scope` (`:284`). No cookie. The duplication is
not the scope itself but the *facts about* the scope: `scopeFacts[scope]` and the flat
`pending`/`hasApprovedPhotos`/`roomLeft` props both describe a half, and `queues` re-holds
`scopeFacts.*.pending` a third time (`:259-272`). That is collection-02.

**Is the same photo-fetch query written in several places?** Six `Photo` read shapes exist:
`includeFor`+`shape` → `PhotoData` (`actions.ts:121-170`, used by the river, the upward page,
`loadPhoto`, `myPendingPhotos`); the permalink's `generateMetadata` select (`[id]/page.tsx:52-58`);
`admin-review.ts:135-153` → `ReviewPhoto`; the feed rail's select (`collection-module.tsx:53-71`);
`admin-worklist-query.ts:70` and the account export route (outside my territory). The visibility
predicates do **not** drift: the river and the permalink go through `photoScopeWhere` /
`decidePhotoVisibility`; the review room deliberately has no scope (an admin sees every class,
spec §0); the feed rail hard-codes `scope: "valley"` and is pinned. What is duplicated is the
column list on the *write* side (collection-09) and the fact that `ReviewPhoto` and `PhotoData`
share twelve fields with two `shape()` functions (`actions.ts:121`, `admin-review.ts:81`). I do not
recommend merging those two shapes: the review room wants `url` not `thumbUrl`, `exifYear`,
`uploaderName` with a purge fallback, and no love count; forcing one type would cost each caller
fields it must not ship.

**Does photo-suggest.ts duplicate tag-photos-pick.mjs?** No. The judgement (`readVerdicts`,
`planChange`), the vocabulary (`BUCKET_VALUES`) and the rules (`BUCKET_RULES`, `VALLEY_GLOSSARY`)
live in the lib once; the applier imports them; the picker imports nothing from the lib and
carries no rules at all. The authoritative copy is `src/lib/photo-suggest.ts`. The drift is the
other way: the picker does not put the rules into the manifest as `docs/spec/hand-run-passes.md`
requires and as `tag-professions-pick.mjs:225-231` does (collection-13).

**Is exif-date's 330 lines earned?** Yes. 135 are code. It sees four containers: JPEG, WebP and
HEIF through `sharp.metadata().exif`, and PNG through its own chunk walk (`eXIf`, and the
Apple/ImageMagick `zTXt`/`tEXt` "Raw profile type APP1" hex profile), which exists because three
real PNGs in the owner's 1,719-file album were filed undated (`exif-date.ts:139-166`, pinned by
`exif-date.test.mjs:258-305` against bytes sharp actually wrote). The reader deliberately cannot
name a GPS tag, which is a security property (audit M12) the tests assert by block size. The only
excess is the "scan date, not taken date" caveat told three times (file header `:25-29`,
`review-room.tsx:580-599`, `schema.prisma` Photo.exifYear comment) -- a not-finding with a note.

**Which effects exist to work around a previous version's behaviour, by line?**
`collection-client.tsx:238-252` (re-seed guard: exists because every action is followed by a
server re-render, collection-01); `:395-419` (URL-sync `moved`/`still` guard: exists because a
`replaceState` on the permalink route was read as a navigation, F35 -- same root as 01);
`:516-588` + `:875-932` (a scroll listener and an IntersectionObserver both asking "does the
reader want the page above", because the observer reports transitions only, collection-07);
`:779-785` and `:679-682` (`loading` guards on `more`/`loadNewer` because "the generation guard
only catches pages already in flight, not one started afterwards from a stale cursor" -- a
patch on the generation mechanism, noted in 05); `:841-849` (an anchor reset inside the landing
effect because a prepend and a landing once shared a ref). The ones that should stay because
the behaviour they patch is the platform's, not ours: `:1009-1015` (dialogs mount closed so a
`dynamic()` chunk arriving after the press still animates), `:463` (`seeded` held against a
callback identity to survive StrictMode), `edit-photo-dialog.tsx:100-104` (re-seed on the open
edge because the dialog is latched for its exit animation), `contribute-room.tsx:485-486` (the
wall read through a ref so the pump's own `setPhotos` cannot cancel its uploads, F43),
`photo-river.tsx:140-153` (the seen-thumbnail latch so a re-flowed tile does not fade twice).

**Is there a second scrubber/rail/pager elsewhere that could be shared?** No, and sharing would
be the wrong call. `post-feed.tsx`, `comments-section.tsx`, `profile-author-feed.tsx` and the
directory each have a one-way foot sentinel plus a generation guard (`append-page.test.mjs:85-99`
pins all four onto `appendUnseen`); audit 1 measured and refuted a shared paged-list hook
(`fix-prompt.md:629-632`). The Collection is the only list in the app that pages *upward*,
anchors scroll by hand, and lands on a heading; nothing else has a rail, a scrubber or a seek.
The one thing genuinely shared already is the dedupe helper. Not-finding.

**What would a fix session delete first?** In this order, because each is small and the later
ones need the tree quieter: (1) collection-02 (thirty minutes, removes a bug); (2) collection-12
and collection-16 (dead prop, dead export, knip's seven `export` keywords, the repeated e2e
helper); (3) collection-08 after running its SELECT; (4) collection-17 after a dry sweep. Then
measure collection-01, and only then the structural ones (04, 06, 07, 09, 10), with the
decomposition (05) last because it moves the pins every other finding touches.

## Findings

### collection-01 - Find out why a read action re-renders the page, and stop paying for it
- **Where**: `src/components/collection/collection-client.tsx:196-252` (the re-seed guard and its rationale), `:372-419` (the URL-sync effect), `src/app/(main)/collection/collection-data.ts:104-224` (what a server re-render costs), `src/components/analytics/posthog-client.ts:102` (`capture_pageview: "history_change"`)
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (measure first; the fix may become an owner call if it means changing PostHog's page-view mode)
- **Evidence**: The component's own comment, `:209-214`: *"The prop also arrives, unasked, after every server action: Next re-fetches this route's tree once an action completes (measured -- one RSC GET per `loadPhotos` call, `navigateToUnknownRoute` in the trace, with PostHog's history patch sitting between Next's router and its own patched `replaceState`)."* `loadPhotos` calls no `revalidatePath`, so under Next's documented behaviour a read action should not refetch the tree; `navigateToUnknownRoute` is the router's reaction to a `history.replaceState` it did not make, which is exactly what `:418` does on every filter change (and F35 in the handover records the same mechanism breaking the permalink). PostHog's `capture_pageview: "history_change"` patches `history.replaceState`. If the patched call reaches Next's own patched `replaceState` with a state object missing Next's internal tree marker, Next treats the write as an external navigation and fetches the route. What that costs per bucket press, read off `collectionPageData`: one `User` read, then per readable half `myPendingPhotos` + two `photo.count`, then `loadPhotos` (a `User` read when class, a `findMany`, a `groupBy`) -- about nine queries and a full server render for a member with a class, on top of the two queries the action itself ran. The 57-line guard at `:196-252` exists to detect and discard that result, and its own history (the "weird loop of switching from 2020s to undated" the owner watched) shows what happens when the discard is wrong.
- **What to do**: (1) In chrome-devtools, signed in as Jerry, open `/collection`, press a bucket, and read `list_network_requests`: count RSC GETs (`?_rsc=`) against server-action POSTs. If there is one RSC GET per press, the measurement stands. (2) Bisect the cause: temporarily comment out the `window.history.replaceState` at `:418` and press again; if the GET disappears, the URL write is the trigger. Then test with PostHog disabled (`NEXT_PUBLIC_POSTHOG_KEY` unset in dev) to see whether it is PostHog's wrapper or Next's own reaction. (3) Fix at the cause: if PostHog, pass `capture_pageview: true` (plain load) or call `posthog.capture('$pageview')` from a `usePathname` effect and stop it patching history; if Next, write the URL through `window.history.replaceState(window.history.state, "", url)` so Next's `__PRIVATE_NEXTJS_INTERNALS_TREE` marker survives (Next 14.1+ documents `replaceState` as the supported way to update search params *without* a server round trip, which is what this component wants). (4) Once no RSC fetch follows a filter press, the re-seed guard at `:238-252` only has to handle two real cases: a `router.refresh()` from the contribute room and a fresh navigation. Replace `router.refresh()` in `contribute-room.tsx:698` with an `onAdded` callback that calls `fetchPage(null)` through the existing query effect (bump `generation`, refetch), and delete the guard: `seed`/`setSeed`, `walked`, and the `appendUnseen(...).length > photos.length` test. The URL-sync `moved`/`still` guard at `:395-407` can then be replaced by a single `syncUrl` prop that `[id]/page.tsx` passes as `false`.
- **Saving**: If confirmed: ~9 queries and one server render per filter/order/scope change, for every member; ~60 lines of guard (`:196-252` incl. comments, `:395-407`); the contribute room's `router.refresh()`. If not confirmed: 0, and the comment at `:209-221` should be corrected because it is load-bearing for the next reader.
- **Risk & gate**: medium. Gate: the chrome-devtools measurement above, written into the commit; `e2e/collection-journeys.spec.ts` (all four invariants); `e2e/collection-permalink.spec.ts` (the F35 regression); `src/components/collection/river-query.test.mjs`; manual: contribute a photograph as Jerry and confirm it appears without a reload (bug #15), then delete it through the viewer.
- **Confidence**: medium. The measurement is the component author's, not mine (the brief forbids me a browser). What would change my mind: an RSC GET that persists with the `replaceState` line removed, which would mean Next itself refetches after actions on this route and the guard is the right shape.
- **Notes**: This is the finding I am least sure of and most sure matters. Three of the owner's 2026-09-02 bugs ("a weird loop ... forever until I reload", "the page kinda reloaded when it should stay the same", the valley photographs under the class heading) were all the guard mis-deciding what to do with an unasked-for server page. Removing the unasked-for page removes the class of bug. The alternative I rejected: keeping the guard and only fixing the cost by memoising `collectionPageData` -- it still pays the render. Related: 02, 03 (both shrink what a re-render costs), 04.

### collection-02 - One source for the per-half facts, which also fixes the quota that does not follow the half
- **Where**: `src/components/collection/collection-client.tsx:129-176` (props), `:254-272` (`queues` seeded three ways, `prevPending` adjust-during-render), `:285-289` (`facts`), `:1072` (`facts.hasApprovedPhotos`), `:1404-1409` (`roomLeft={roomLeft}`); `src/app/(main)/collection/collection-data.ts:28-33` (`ScopeFacts`), `:194-206` (the flat spread), `:181-190` (admin exemption copy #2 of `photoQuotaError`, `actions.ts:178-202`)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `collectionPageData` returns `scopeFacts` (both halves) AND `pending`, `hasApprovedPhotos`, `roomLeft` flat (`:199-206`, comment: *"spread out flat as well, because that is what every consumer already reads"*). Both routes pass `{...data}` (`(index)/page.tsx:47`, `[id]/page.tsx:118`), so every consumer receives both. The client comment at `:144-147` says the flat props are *"kept because that is what the permalink route and the tests pass"* -- `grep -rln "hasApprovedPhotos\|scopeFacts" src e2e scripts` finds only `collection-data.ts` and `collection-client.tsx`; no test constructs these props. The redundancy produced a live bug: `const facts = scopeFacts?.[scope] ?? {...}` is read for `pending` and `hasApprovedPhotos` but **`facts.roomLeft` is never read**; line 1408 passes the flat `roomLeft`, which is the server-rendered half's. `git show dad5307 -- collection-client.tsx` confirms the commit that says "the quota follow the half you are looking at" changed `trulyEmpty` and the queue but never touched line 1408, and `progress.md:92-117` claims the fix. After a swap to the class, `accept()` in `contribute-room.tsx:360-363` caps the drop at the valley's room. `queues` (`:259-263`) is the same map a third time, and `prevPending` re-seeds it on every server re-render.
- **What to do**: (1) Make `scopeFacts` required and delete the `pending`, `hasApprovedPhotos`, `roomLeft` props from `CollectionClient` and the flat spread from `collectionPageData` (`:199-206`); `here` becomes unused there too. (2) `const facts = scopeFacts[scope] ?? scopeFacts.valley;` (3) `roomLeft={facts.roomLeft}` at `:1408` and `autoApproved` unchanged. (4) Seed `queues` from `scopeFacts` only (`{ valley: scopeFacts.valley.pending, class: scopeFacts.class?.pending ?? [] }`) and key the adjust-during-render on `scopeFacts` identity instead of `pending`. (5) In `collection-data.ts`, replace the inline admin exemption at `:186-189` by calling one helper shared with `photoQuotaError` -- e.g. `photoRoomLeft(count, role)` in `collection-photo.ts` beside `isPhotoAutoApproved`, returning `Infinity`/`MAX_PHOTOS_PER_ACCOUNT` for an admin; `photoQuotaError` becomes `roomLeft === 0 ? message : null`. (6) Add one line to `river-query.test.mjs`: `assert.match(source, /roomLeft=\{facts\.roomLeft\}/)`.
- **Saving**: ~35 lines (props, comments, spread, second seed), one bug, one fewer copy of the admin-has-no-ceiling rule.
- **Risk & gate**: low. `npm run check`; `e2e/collection-journeys.spec.ts` test 4 (swap and back); manual: as Jerry (who has a class), swap to the Class Collection, open Contribute, drop more files than the valley's room would allow and confirm the cap message names the class pool.
- **Confidence**: high. The unread `facts.roomLeft` is a grep fact.
- **Notes**: This is where "two sources of truth" is not a purist complaint: the second source was wired to the wrong one within hours of being added. Finding 03 can then remove `scopeFacts` for the half not on screen; do 02 first regardless.

### collection-03 - Fetch the other half's facts on the swap, not on every page load
- **Where**: `src/app/(main)/collection/collection-data.ts:139-194` (both halves' facts on every load: `myPendingPhotos` + 2 × `photo.count` per readable half), `src/app/(main)/collection/actions.ts:783-950` (`loadPhotos`, which already returns `bands` on the first page only)
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `:161-193` runs `Promise.all` over `readable` halves; for any verified member with a batch year that is 6 queries (3 per half) on every `/collection` and `/collection/[id]` load, defended at `:155-158`: *"It costs two indexed counts and one small findMany more per page load, and it buys a swap that needs no round trip."* But the swap already makes a round trip: `chooseScope` (`collection-client.tsx:342-354`) changes `scope`, which changes `fetchPage`, which fires `loadPhotos` -- a server action that already returns per-query extras (`bands`, `above`, `topCursor`) on the first page. The three facts are per-half and per-viewer, exactly the shape `bands` is.
- **What to do**: (1) Add `facts?: { pending: PhotoData[]; hasApprovedPhotos: boolean; roomLeft: number }` to `RiverPage`, populated inside `loadPhotos` when `first` is true (the same block that computes `bands`, `:919-947`), using the `viewer`/`me` row it already read for the class scope (read it for the valley too, once -- see 04 for the per-request cache). (2) `collectionPageData` computes facts for `filters.scope` only (or simply takes them off `firstPage.facts`) and drops `scopeFacts`. (3) The client keeps `queues` keyed by half but fills `queues[scope]` and a `factsByScope[scope]` from `data.facts` when a first page arrives, exactly as it sets `bands`. (4) `canSeeClass` stays server-computed (it is one `photoScopeWhere` call on the row already read).
- **Saving**: 3 queries per page load for every class-eligible member who does not swap (the common case); 3 per load for those who do, because the swap's action carries them. ~20 lines net in `collection-data.ts`.
- **Risk & gate**: medium (the swap's first page must arrive with facts before the empty-state decision runs, or the class empty state flashes; hold `trulyEmpty` on the previous half's facts until the new page commits, the same way `riverOrder` is committed with the photographs at `:623`). Gate: `e2e/collection-journeys.spec.ts` test 4; `npm run check`; manual swap as Jerry with the network throttled in chrome-devtools to watch for a flash.
- **Confidence**: medium. What would change my mind: the owner has said a swap must be instant and "cannot be caught halfway" (`progress.md:107-109`); if he considers a 466 ms swap (the lab room's measured latency) too slow, precomputing is his choice -- but that is already the swap's cost today, because the river itself is fetched.
- **Notes**: Do after 02. Together they turn `collectionPageData` into: one `User` read, the first page (with facts and bands), `canSeeClass`, `isAdmin`, `autoApproved`. Rejected alternative: caching the counts -- they change when the member contributes, which is the moment they matter.

### collection-04 - Read the viewer's class facts once per request, and the permalink's photograph once
- **Where**: `src/app/(main)/collection/collection-data.ts:123-126`; `src/app/(main)/collection/actions.ts:795-801` (`loadPhotos`), `:973-976` (`loadPhoto`); `src/app/(main)/collection/[id]/page.tsx:51-63` (`generateMetadata`: a second `photo.findUnique` and a third `user.findUnique`), `:96-102` (`loadPhoto` then `collectionPageData` with a hard-coded `order: "newest"`)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The same `prisma.user.findUnique({ select: { verifyState, batchYear } })` is written four times. On `/collection/[id]` for a class photograph the render runs: `generateMetadata` (photo + user), `PhotoPage` → `loadPhoto` (photo + user), `collectionPageData` (user with `photoTrusted`), `loadPhotos` (user again because scope is class) -- four `User` reads and two `Photo` reads before the river is queried. `auth()` is `cache()`d (audit-1 refuted row) so its repeats are free; these are not. Separately, `[id]/page.tsx:99-102` passes `order: "newest"` for every scope while `riverFiltersFrom` and `chooseScope` open a class on `defaultOrderFor("class") === "taken"` (commit d930e52, pinned by `collection-taxonomy.test.mjs:133-136`): a class permalink puts a Newest river behind the viewer where the class page would open Chronological.
- **What to do**: (1) Add `viewerFacts = cache(async (userId) => prisma.user.findUnique({ where: { id: userId }, select: { verifyState: true, batchYear: true, photoTrusted: true } }))` in a server-only module (`collection-data.ts` is server-only; `actions.ts` may import from it -- it already imports nothing from it, so put the helper in `src/lib/collection-viewer.ts` importing `prisma` and React's `cache`). Replace the four reads with it. React's request-scoped `cache()` dedupes within one render pass, including `generateMetadata` and the page. (2) Wrap `loadPhoto` in `cache()` as well (`export const loadPhoto = cache(async (id) => ...)` cannot live in a `"use server"` file -- see 10, which moves it to `collection-data.ts`), and have `generateMetadata` call it instead of re-selecting. The pin `security-regressions.test.mjs:322-333` requires a literal `decidePhotoVisibility(` in `[id]/page.tsx` and in `actions.ts`; either keep `generateMetadata`'s own call (then only the user read dedupes) or move the pin's path with the function and say so in the commit. (3) `collectionPageData({ scope: photo.scope, order: defaultOrderFor(photo.scope) })` at `[id]/page.tsx:99-102`.
- **Saving**: 3 queries per class permalink load, 1-2 per class `/collection` load, 1 per valley permalink; one correctness slip (class permalink order).
- **Risk & gate**: low. `src/lib/security-regressions.test.mjs` (the two class pins named above), `npm run verify:crawl` (the permalink route is in the crawl), `e2e/collection-permalink.spec.ts`.
- **Confidence**: high on the reads; medium on the order mismatch being unintended (nothing in the 2026-09-02 entries says the permalink should differ).
- **Notes**: `cache()` is the idiom this repo already relies on for `auth()`; it is the right tool here because the four readers are in different modules and cannot pass the row to each other without changing the action's public signature (`loadPhotos` must still read for itself when called from the client). Related: 03, 10.

### collection-05 - Decompose collection-client.tsx by responsibility, line-neutral
- **Where**: `src/components/collection/collection-client.tsx` (1,469 lines; cloc: 725 code, 662 comment, 82 blank)
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: The file by responsibility, with line ranges:
  - `1-127` header, five `dynamic()` imports, `toViewerImage` (viewer adapter)
  - `129-176` props (11, three redundant -- 02)
  - `177-252` river state + server re-seed guard (01)
  - `254-275` per-half queue + loading flags
  - `277-370` query state (`scope`, `bucket`, `order`, `searchInput`/`search`, `seekBand`, `activeBand`), the three setters that clear the seek, the search debounce
  - `372-419` URL sync
  - `421-463` `fetchPage`, `generation`, `seeded`
  - `465-514` geometry helpers (`pinnedInset`, `headOfRiver`, `topOfBand`)
  - `516-588` scroll-direction watcher (`lastScrollY`, `movingUp`, `headNear`, `pullNewer`, `syncScrollWatch`, `wantsNewer`)
  - `590-677` the query effect: fetch, warm, swap, decide the landing
  - `679-727` `more` + foot observer
  - `729-764` `seekTo`
  - `766-823` `loadNewer` + scroll anchor
  - `825-873` the landing layout effect (`tail`, `pendingLanding`, `landOn`)
  - `875-932` head observer
  - `934-942` contribute latch
  - `944-1060` viewer strips (`linked`, `listFor`/`setListFor`, `viewerImages`, `editTarget`/`removeTarget`, `patch`, love, `forget`)
  - `1062-1085` derived flags (`hasQuery`, `trulyEmpty`, `noMatches`, `railActive`)
  - `1087-1469` JSX (383 lines)
  The e2e spec's own header calls it *"this component's fourteen pieces of state disagreeing during a transition"*. Two of the groups above have no dependency on the viewer or the dialogs and one has none on the river's contents: the seek-and-landing machinery (`465-588`, `729-764`, `825-932` ≈ 330 lines with comments) touches only `photos.length`, the cursors and DOM geometry; the viewer strips (`944-1060`) touch only the three lists.
- **What to do**: Three hooks in `src/components/collection/`: `use-river.ts` (state, `fetchPage`, `generation`, the query effect, `more`, `loadNewer`; returns `{ photos, bands, cursor, topCursor, loading, loadingMore, riverOrder, more, loadNewer, setPhotos }`), `use-seek-landing.ts` (geometry, scroll watcher, landing effect, head/foot observers, `seekTo`; takes refs and the river's setters), `use-viewer-strips.ts` (`944-1060`). The component keeps props, `scope`/`bucket`/`order`/`search` state and JSX. Do it **after** 01, 02, 07 have shrunk the pieces. **Move the source pins with the code**: `river-query.test.mjs` reads `collection-client.tsx` for `loadPhotos(` call sites, `const loadNewer`, `const head = useRef`, `const onScroll = () =>`, `const pinnedInset = useCallback`, and `<PhotoRiver` props; `append-page.test.mjs:49-72` reads it for `const more = useCallback(async ()`, `generation.current += 1`, `appendUnseen(prev, data.photos)`; `heart.test.mjs:47` for `useHeartToggle(`. Each pin's `readFileSync` path must point at the new file, in the same commit, and the pins' assertion strings must keep matching (keep the identifier names).
- **Saving**: 0 lines (the comments travel with their code); the component drops to roughly 600 lines and each hook is testable in isolation.
- **Risk & gate**: medium -- purely mechanical but the pins are many. Gate: every test file above, `e2e/collection-journeys.spec.ts`, `e2e/collection-seek.spec.ts`, `npm run visual` (the `/collection` baselines are unmasked and will move if a pixel does).
- **Confidence**: medium. The size is honest for what it does; the decomposition buys legibility, not lines. What would change my mind: if 01 removes the re-seed guard and 07 removes the observer, the file is ~1,250 lines and the seam is less pressing.
- **Notes**: One patch-on-patch inside the river hook worth folding while there: `loading` guards on `more` (`:682`) and `loadNewer` (`:785`) exist because a cursor from the previous query can be used after `generation` bumps. Storing the cursors *with* their generation (`{ cursor, gen }`) and refusing a fetch whose gen is stale makes the `loading` clauses and their two long comments unnecessary.

### collection-06 - One encode recipe for both contribute paths, and one read of the EXIF block
- **Where**: `src/app/(main)/collection/actions.ts:305-358` (the FormData path's encode) and `:542-635` (the direct path's encode); `src/lib/collection-photo.ts:137-139` (`exifDateOf`), `:157-166` (`exifBlockOf`), `:189-194` (`dateOnlyExif`); `src/lib/image.ts:151-161` (`countImageFrames`), `:123-137` (`storedResizeBox`)
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: The two paths run the same sequence -- sniff, count frames, read EXIF date, build the date-only EXIF, rotate+resize+webp, `resolveWithObject`, `gridThumb`, `putAllOrNone` -- with two drifts: the fallback caps at `resize(1600, 1600)`/`quality: 80` (`:340-342`) while the direct path stores `storedResizeBox`/`COLLECTION_WEBP_QUALITY` (100) (`:594-603`); and the thumbnail is built from the original on one path and from the display buffer on the other (`:350` vs `:618`, with the reason at `:612-617`). Per contribution the original's header is parsed by sharp four times: `countImageFrames` (`metadata()` #1), `exifDateOf → exifBlockOf` (#2), `storedResizeBox(await sharpImage(original).rotate().metadata())` (#3), `dateOnlyExif → exifBlockOf` (#4). `exifDate` and `exifStamp` walk the same block; `exifDate` is literally `parseExifStamp(exifStamp(...))` (`exif-date.ts:327-330`). jscpd flags `:461-470` ≈ `:1281-1290` (the two input shapes) as a clone too.
- **What to do**: (1) In `collection-photo.ts`, `export async function encodeContribution(original: Buffer, { fullResolution }: { fullResolution: boolean })` returning `{ display: Buffer, width, height, thumb: Buffer, exif: ExifDate | null, frames: number }`: one `sharpImage(original).rotate().metadata()` (gives `autoOrient` for the box, `pages` when opened with `animated: true`, and `exif`), one `exifBlockOf` result passed to both `exifDate` and `exifStamp`, the resize box from `storedResizeBox` or a 1600 cap, the thumbnail from the display buffer on both paths. (2) Both actions call it inside their own `try` and keep their own refusal (`return { error }` vs `refuse()`), their own `putAllOrNone`, their own `createPhotoRow` -- the cleanup stories `collection-photo.ts:1-17` says must not merge stay where they are. (3) `exifDateOf`/`dateOnlyExif` become thin wrappers or go. (4) Move the pin `upload-shared.test.mjs:209` (`countImageFrames(` exactly twice in `actions.ts`) to assert once in `collection-photo.ts` plus `encodeContribution(` twice in `actions.ts`; keep `image-purge-rule.test.mjs` green: `contributePhotoDirect`'s body must still contain `COLLECTION_ORIGINAL_KEY.test(input.key)`, `const refuse = async`, `purgeImageKey(input.key`, and the file exactly two `await createPhotoRow(`, two `}, [url, thumbUrl]);`, two `await putAllOrNone(`, one `prisma.photo.create(`.
- **Saving**: ~60 lines in `actions.ts`, 1 jscpd clone, 3 fewer sharp header reads per contribution (milliseconds each on a 20 MB file -- the point is one recipe, not CPU), and the quality drift becomes a named parameter.
- **Risk & gate**: medium (the direct path is the one every real contribution takes and it is pinned three ways). Gate: `src/lib/image-purge-rule.test.mjs`, `src/lib/upload-shared.test.mjs`, `src/lib/security-regressions.test.mjs` (`contributionScope` ×2, `classYears: destination.classYears,` ×2), then contribute one JPEG with a date and one PNG through the real dialog as Jerry and read `exifYear` off the rows (`SELECT id, "exifYear", "exifMonth", width, height FROM "Photo" ORDER BY "createdAt" DESC LIMIT 2;`), then delete both through the viewer.
- **Confidence**: high that the duplication is real; medium that the 1600 cap on the fallback is unintended (its input is already canvas-shrunk by `shrinkForUpload`, so the cap rarely binds, but "the Collection stores full resolution" is a rule two sessions have been fooled by -- the memory note says so -- and a second number is a second trap).
- **Notes**: The docblock defending "three paths" (`collection-photo.ts:4-10`) is about *cleanup on failure*, not the encode; this respects it. Not touched: `collection-intake.ts` (the composer tick copies bytes that are already the display WebP, so it has no encode).

### collection-07 - One asker for "does the reader want the page above"
- **Where**: `src/components/collection/collection-client.tsx:516-588` (scroll watcher: `lastScrollY`, `movingUp`, `headNear`, `pullNewer`, `syncScrollWatch`, `wantsNewer`, the `scroll` listener) and `:875-932` (the head `IntersectionObserver` with a 3000px margin); `river-query.test.mjs:132-161` (two pins on this)
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The observer's callback says of itself (`:907-911`): *"This callback is only half of it. An IntersectionObserver reports transitions, and after a seek the seam enters range once and never leaves, so this runs once ... The scroll listener asks the same question on every scroll, which is what actually lets a reader climb out."* So the observer's only surviving job is to maintain the boolean `headNear` that the scroll listener reads (`:584`, `:912`), and to fire once at a landing where the answer is always no. The scroll listener already runs on every scroll and already reads `window.scrollY`; `head.current.getBoundingClientRect().top < window.innerHeight + 3000` is the same fact the observer maintains, computed at the moment it is needed.
- **What to do**: In the scroll listener (`:566-585`), after updating `movingUp`, compute `const near = head.current ? head.current.getBoundingClientRect().top < window.innerHeight + HEAD_MARGIN : false;` and call `pullNewer.current()` when `near && wantsNewer()`. Delete the observer effect (`:881-932`), the `headNear` ref, and its two comments. Keep `wantsNewer`'s `scrollY <= 0` clause (the landing-at-top case, `:547-562`), which then needs one call at the landing: `syncScrollWatch()` already runs there (`:859`); add `if (window.scrollY <= 0) pullNewer.current()` beside it. Throttle the listener to one read per frame with the same `requestAnimationFrame` pattern `useActiveBand` uses (`photo-river.tsx:348-356`). Move the two pins: `river-query.test.mjs:132-141` ("the upward pull needs the reader to have asked") should assert `wantsNewer()` inside the scroll listener body instead of the head effect; `:152-161` already reads the listener.
- **Saving**: ~55 lines incl. comments, one `IntersectionObserver`, one ref, one effect; the seek/landing story becomes one mechanism.
- **Risk & gate**: medium -- the seek is the most-fixed surface in the repo this week. Gate: `e2e/collection-journeys.spec.ts` test 3 (every year the rail offers lands, lit) and `e2e/collection-seek.spec.ts` "a page arriving above the reader does not move the photograph" and "the rail says where the reader is after a jump"; manual on `/lab/collection`: seek 1953, scroll up slowly and fast, confirm the year above arrives before the header shows.
- **Confidence**: medium-high. What would change my mind: if `getBoundingClientRect` on every scroll frame measurably janks on a phone (it is one rect; the scrollspy already does N of them per frame).
- **Notes**: The foot observer (`:715-727`) is the ordinary one-way sentinel and stays; it fires on entering range, which is the right semantics for appending. Only the head needed a direction.

### collection-08 - Retire the legacy Where/free-tags read plumbing (audit-1 §4 #16, now answerable)
- **Where**: `src/lib/collection.ts:136-155` (`LEGACY_AREAS`, `areaLabel`); `src/app/(main)/collection/actions.ts:89-91,145-146` (`PhotoData.area`/`freeTags`, the split), `:745-748` (search `OR` over `area` and `freeTags`), `:275-303` and `:454-467,524-532` (`area` accepted on both contribute inputs); `src/lib/collection-photo.ts:35,49,89,272,274` (`area`, `freeTags: null`); `src/lib/validators.ts:263` (`area`); `src/components/collection/collection-client.tsx:112-113` (`where: areaLabel(p.area)`, `...p.freeTags` into the viewer's tags); `src/lib/demo-seed/content.ts:702-791` (the demo writes `area: "Whole campus"` and fourteen-value `subject`s)
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous after the SELECT below (the decision itself was the owner's in audit 1: "Zero rows → ~60 lines go")
- **Evidence**: Nothing has written `freeTags` since 2026-07-18 (`photoRowData` writes `null`); D41 (handover) checked both databases on 2026-08-28: zero `freeTags`. Nothing has written `area` since D43 (the Where box removed 2026-08-28); D51 cleared the only two rows that held one (`prisma/migrations-manual/2026-08-28-clear-legacy-where.sql`). `editPhoto` deliberately does not touch `area` (`actions.ts:1275-1277`). So on production every read of `area`/`freeTags` is a read of null. The demo database is the exception: its seed writes `area` on six photographs and old-vocabulary `subject`s (which `LEGACY_BUCKETS` must keep mapping -- do not touch that).
- **What to do**: (1) The fix session runs, against production (`.env`) and the demo (`.env.demo`): `SELECT count(*) FILTER (WHERE area IS NOT NULL AND area <> '') AS areas, count(*) FILTER (WHERE "freeTags" IS NOT NULL AND "freeTags" <> '') AS tags FROM "Photo";`. (2) Production expected 0/0. For the demo, edit `demo-seed/content.ts` to drop the `area` field from the six seed photographs (it is the demo's own copy; "Whole campus" carries nothing the caption does not). (3) Remove: `LEGACY_AREAS`+`areaLabel`; `area`/`freeTags` from `PhotoData`, `shape`, `PhotoMeta`, `NO_PHOTO_META`, `parsePhotoMeta`, `photoRowData`, `photoSchema`, both contribute inputs, and the two search `OR` arms; the `where:` line and the `...p.freeTags` spread in `toViewerImage`; the picker's `said.where` (`tag-photos-pick.mjs:133`). (4) Hand the columns and their two trigram indexes (the 2026-08-28 migration built four GIN indexes; two are on `area` and `freeTags`) to the data-layer lens for a dated drop migration. (5) Check with the media-viewer lens whether `ViewerImage.where` has any producer left (catch-ups/feed do not pass it, I believe, but that file is theirs).
- **Saving**: ~40 lines in my territory + the viewer's `where` line; 2 DB columns, 2 GIN indexes (data-layer); one fewer legacy map to explain.
- **Risk & gate**: low once the SELECT is 0/0. Gate: the SELECT, `npm run check` (the `photoSchema` change touches `validators.ts`; `security-regressions` pins on `photoRowData` must still match: `scope = "valley", classYears = null,` and `classYears: scope === "class" ? classYears : null,`), `npm run verify:crawl`, and the demo seed (`DEMO_MODE=1` seed run is the demo lens's).
- **Confidence**: high for production; medium for whether the owner wants the demo's "Whole campus" gone (it is invisible everywhere except the viewer's Where line).
- **Notes**: This closes audit 1's last open §4 item. `LEGACY_BUCKETS` (`collection.ts:84-104`) is NOT part of this: the demo seeds old subject values and `bucketsOf` must keep mapping them (`collection-taxonomy.test.mjs:35-42` pins it). The "Other is a sensor" comment block at `:27-31` says "The admin side reads it" -- no admin surface reads Other today; that is a placeholder claim, noted in 16.

### collection-09 - One column map for writing a photograph's answers
- **Where**: `src/lib/collection-photo.ts:227-289` (`photoRowData`, column map #1), `src/app/(main)/collection/actions.ts:1326-1336` (`editPhoto`'s `updateMany.data`, #2), `src/app/(main)/admin/review/actions.ts:89-102` (`saveReview`'s `updateMany.data`, #3); also the three `parsePhotoMeta({...})` call shapes at `actions.ts:291-301`, `:524-532`, `:1312-1319` and `review/actions.ts:69-76`
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `editPhoto` and `saveReview` both: gate → rate-limit → `parsePhotoMeta` → `updateMany({ where: { id }, data: { caption, subject: meta.buckets, era, photoYear, photoMonth, datePrecision } })` → `changed.count === 0` → `revalidatePath` ×2. The six-column mapping (`meta.buckets` → `subject`) is written three times; a seventh column (say, a `where` that comes back, or `exifYear` being accepted from the review room) has to be added in three places, and `saveReview` already differs from `photoRowData` in not writing `area` (correct) which is the kind of difference nobody can see is deliberate.
- **What to do**: `export const photoMetaColumns = (meta: PhotoMeta) => ({ caption: meta.caption, subject: meta.buckets, era: meta.era, photoYear: meta.photoYear, photoMonth: meta.photoMonth, datePrecision: meta.datePrecision })` in `collection-photo.ts`; `photoRowData` spreads it; `editPhoto` and `saveReview` use `data: { ...photoMetaColumns(meta), ...approvalColumns }`. Leave the two actions' gates separate (uploader-or-admin vs admin) -- that is the part that must not merge.
- **Saving**: 2 clones, ~12 lines, one place to add a column.
- **Risk & gate**: low. `npm run check`; `image-purge-rule.test.mjs` ("C-074/C-130" pins `const approved = await prisma.photo.updateMany(` in `actions.ts` -- unaffected); manual: edit a caption in the viewer as Jerry and approve one in `/admin/review` as the owner's account? No -- as the admin session the crawl uses; both must land.
- **Confidence**: high.
- **Notes**: Rejected: routing `saveReview` through `editPhoto` -- the review room's `approve` flag and its `approved: false` idempotency clause (`review/actions.ts:88-90`) are its own, and the gates differ.

### collection-10 - Move the two server-only readers out of the "use server" module
- **Where**: `src/app/(main)/collection/actions.ts:957-986` (`loadPhoto`), `:996-1007` (`myPendingPhotos`); callers `collection-data.ts:9,165` and `[id]/page.tsx:10,96`
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Every export of a `"use server"` file is registered as a client-callable server action with its own action ID, whether or not any client calls it. `grep -rn "loadPhoto\b\|myPendingPhotos" src` finds callers only in server modules. Both are correct when called directly (they `auth()`), so this is surface, not a hole; but the file's own comments repeatedly say *"a server action is a public HTTP endpoint"* (`:208`, `:722`), and two endpoints nobody dials are two more things to reason about.
- **What to do**: Move both to `collection-data.ts` (server-only), keeping `shape`/`includeFor` importable -- which means exporting those two from `actions.ts` is not possible (a `"use server"` file may only export async functions), so move `shape`, `includeFor` and `PhotoData` to a new `src/lib/collection-shape.ts` (no `"use server"`; imports `bucketsOf`, `takenLabel`, `takenShort` from `collection.ts`; `PhotoData` is imported as a type by the client and the lab, and a type import erases). `loadPhoto` can then be wrapped in `cache()` (04). Update the pin `security-regressions.test.mjs:322-326` ("loadPhoto stopped deciding through the shared rule") to read `collection-data.ts`.
- **Saving**: 2 public action endpoints; 0 lines; `actions.ts` becomes writes + the two client-called reads (`loadPhotos`, and the actions).
- **Risk & gate**: low. `npm run check` (TypeScript will refuse a non-async export from the `"use server"` file if any is left behind), `security-regressions.test.mjs`, `verify:crawl`.
- **Confidence**: high.
- **Notes**: `contributePhoto` (the FormData path) IS called from the client (`contribute-room.tsx:644`) and stays. Do together with 04.

### collection-11 - A lookup table for the two halves instead of eleven ternaries
- **Where**: `src/components/collection/collection-client.tsx:1096,1116,1120,1166,1171-1181,1207,1232,1235,1278,1354`; `src/components/collection/river-controls.tsx:155`; `src/components/collection/contribute-room.tsx:238-240`; `src/app/(main)/collection/actions.ts:197-199`
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `scope === "class" ? ... : ...` decides, in the client alone: the title, two search labels, the empty-state title and body, the controls' `xl:hidden`, the river's `xl:mt-0`, the `OrderMenu` placement, the "Try a wider bucket" suffix, the rail's `xl:mt-[42px]`; in the dialog, the title; in the action, the quota message. Four of these are copy and three are layout; the copy ones are the 5d case for a table. A third half is not planned (`scope-caret.tsx:26-31` says so), but the point is reading, not extensibility: today the class half's words are scattered across four files.
- **What to do**: `export const HALVES: Record<PhotoScope, { title; searchLabel; emptyTitle; emptyBody(classYear); contributeTitle; quotaError }>` in `src/lib/collection.ts` (client-safe, already imports `PhotoScope` as a type). Replace the copy ternaries with `HALVES[scope].x`; leave the layout ternaries (`xl:hidden`, `xl:mt-0`, the `OrderMenu` mount) as JSX conditionals -- they are about the class half having no bucket line, which is structural, not copy.
- **Saving**: line-neutral (~-30 +25); every word the class half says is in one place.
- **Risk & gate**: low. `npm run visual` (both `/collection` and `/collection?scope=class` are in `ROUTES`), `npm run check`.
- **Confidence**: medium. It is a taste call whether five copy ternaries earn a table; I lean yes because two of the strings ("Search your class") already appear twice.
- **Notes**: Related to 02 (the same file gets quieter).

### collection-12 - Delete the multi-select wall's leftovers: `mixed`, and the standalone room nobody mounts
- **Where**: `src/components/collection/bucket-tiles.tsx:55-58,78,102-103` (`mixed` prop and the `some` branch); `src/components/collection/contribute-room.tsx:264-291` (`export function ContributeRoom` with optional `onWall`/`onDone`/`active`, comment: *"the standalone lab room ignores it"*), `:102` (`Staged.state` comment names a `"reading"` state that does not exist)
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "mixed" src/components/collection src/components/admin/review src/app/lab` finds no caller passing `mixed=`; `git log -S"mixed={"` shows the last caller left in 0d7ae30 (2026-08-28, "contributing is a carousel, not a wall"). `grep -rn "ContributeRoom\b" src` finds no importer outside its own file; the standalone route `/collection/add` was deleted on 2026-08-28 (D32) and no lab room mounts the room. `Staged.state` is `"waiting" | "lifting" | "here" | "failed"`; "reading" is a counter (`reading`), not a state.
- **What to do**: Delete `mixed` and the `some` branch (the tile becomes on/off). Un-export `ContributeRoom`, make `onWall`, `onDone`, `active` required (the dialog always passes them), drop the three "standalone room" sentences. Fix the `Staged.state` comment.
- **Saving**: ~14 lines; one prop that promised a mode that no longer exists.
- **Risk & gate**: low. `npm run check`; `npm run visual` (`/collection`'s contribute pop-up is not in the visual routes, so open it once at 390 and 1440 in chrome-devtools).
- **Confidence**: high.
- **Notes**: `BucketTiles` is also imported by `photo-questions.tsx` only; the review room and the edit dialog reach it through `PhotoQuestions`. That is the one-form design and is right.

### collection-13 - The photograph picker does not carry its rules; the album importer copies two helpers it could import
- **Where**: `scripts/dev/tag-photos-pick.mjs:167-183` (manifest = `{ database, taken, outstanding, photos }`); `docs/spec/hand-run-passes.md:43-45` ("Carries the vocabulary and the rules inside the manifest") and `:144-145`; `scripts/dev/tag-professions-pick.mjs:225-231` (does carry `vocabulary` and `rules`); `scripts/qa/hand-run-passes.test.mjs` (does not check it); `scripts/dev/import-album.mjs:98-100` (`THUMB`, "THE SECOND COPY of a recipe that belongs to collection-photo.ts") and `:220-239` (`exifBlockOf`, "THE SAME TWO SOURCES ... the second copy exists ... because that function sits beside code importing through the @/lib alias"); `src/lib/collection-photo.ts:19-23` (its five `@/lib` imports)
- **Phase**: architecture (protocol conformance) + dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The protocol the owner asked for ("we have to have a workflow/protocol for it", `hand-run-passes.test.mjs:14-16`) says a manifest carries its own rules so a batch picked last week is judged by the vocabulary current when picked; the professions picker does; the photographs picker does not, and its skill instead tells the session to open `src/lib/photo-suggest.ts` and read `BUCKET_RULES`/`VALLEY_GLOSSARY` from source (`SKILL.md:83-85`). The test pins only the folder, the stamp, read-only, `--apply`/`--undo`, and the skill. The importer's two copies are acknowledged and the reason is real: `collection-photo.ts` imports `@/lib/image`, `@/lib/collection`, `@/lib/exif-date`, `@/lib/utils`, `@/lib/validators`, and a plain `node` run of a `.ts` file cannot resolve `@/` -- the scripts import `../../src/lib/image.ts` etc., which works only because those modules use relative imports transitively.
- **What to do**: (1) `tag-photos-pick.mjs`: `import { BUCKET_RULES, VALLEY_GLOSSARY } from "../../src/lib/photo-suggest.ts"; import { BUCKETS, ERA_VALUES } from "../../src/lib/collection.ts";` and add `vocabulary: BUCKETS.map(({value,label,hint}) => ({value,label,hint}))`, `eras: ERA_VALUES`, `rules: BUCKET_RULES`, `glossary: VALLEY_GLOSSARY` to the manifest; the skill's "read the source" paragraph becomes "the rules are in the manifest". (2) Add to `hand-run-passes.test.mjs` a `assert.match(pick, /rules:/, ...)` under "the picker stamps its database" so a third pass cannot skip it. (3) For the importer: switch `collection-photo.ts`'s five imports to relative (`./image`, `./collection`, `./exif-date`, `./utils`, `./validators`) -- `photo-suggest.ts:34-38` already does exactly this and explains why -- **after checking** that `utils.ts` and `validators.ts` have no `@/` imports of their own (I did not open them; `validators.ts:264-269` references `BUCKET_VALUES`, so it imports `collection` somehow). If they are alias-free, `import-album.mjs` imports `gridThumb` and an exported `exifBlockOf` and deletes `THUMB` and its own `exifBlockOf`. If not, leave the copies and their honest comments.
- **Saving**: (1)+(2): 0 lines, one protocol actually enforced; (3): ~25 lines and 2 acknowledged copies, conditional.
- **Risk & gate**: low. `scripts/qa/hand-run-passes.test.mjs`, `src/lib/photo-suggest.test.mjs`; for (3) `npm run check` plus a dry run `node scripts/dev/import-album.mjs` (dry is the default and touches nothing; it reads `sanan's stuff/album`, which the fix session may not have -- then just `node --check` and the TypeScript gate).
- **Confidence**: high on (1)/(2); medium on (3).
- **Notes**: This answers the charter's "is suggestion logic in two places": it is in one, and the picker is the half that forgot to ship it.

### collection-14 - collection-client.tsx: tell each mechanism once
- **Where**: `src/components/collection/collection-client.tsx` (662 comment lines against 725 code): the head-sentinel story at `:516-531`, `:547-561`, `:574-583`, `:886-911` (four tellings); the "which half" reseed story at `:196-237` and `:421-432`; the landing story at `:629-653` and `:654-663` and `:828-856`; `:1209-1217` (a comment explaining a control that is NOT there, the deleted decade strip)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: These comments carry owner quotes with dates and measured numbers, which the brief says are not bloat -- and they are why this file can be worked on at all. But the same bug is narrated at four sites: "pressing 2020 walked the river back to 2026 ... three of six seeks landed on the wrong year" appears at `:519-521`, `:892-898`, in `river-query.test.mjs:126-131` and in `progress.md:204-211`. One earned comment, kept: `:485-488` (*"Measured off the bar itself rather than written down twice. Below its breakpoint the element is not rendered at all, so this reads 0 and falls back to the rail's 24"*). One narrating, cut: `:1209-1217` explains why a mobile decade strip that no longer exists in the file is not rendered.
- **What to do**: One paragraph per mechanism at the place the mechanism lives (the scroll watcher for "direction, not visibility"; the query effect for "hold, warm, swap, land"; the layout effect for "decide here, do after commit"), with the other sites reduced to a one-line pointer. Delete `:1209-1217`. Do it in the same commit as 07 (which deletes one of the four tellings anyway) or 05.
- **Saving**: ~150 comment lines; 0 code.
- **Risk & gate**: none. `npm run check` (the source pins match identifiers, not comments; `decomment` is used by most of them).
- **Confidence**: high that the repetition is there; medium on the exact count.
- **Notes**: Never the headline, per the brief. The reason to do it at all is that a future session reading this file reads 662 lines of prose before it can see the 14 pieces of state, and the four-times-told bug reads as four bugs.

### collection-15 - photo-layout.ts: keep the numbers, drop the version history
- **Where**: `src/lib/photo-layout.ts` (460 comment / 126 code): `:305-341` (`carouselWidth`: "Version one let the tallest ... Version two picked the MEDIAN ..."), `:90-96` ("There used to be a horizontal band beside this one"), `:258-281` (the 4:5 floor story, told again in `photo-layout.test.mjs:163-168`), `:403-448` (the flexbox block header, restating handover D16/D18/F22/F23), `:455-480` (`drawnRatio`, restating D17)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: The constants' docblocks are earned and should not move: `PHOTO_MAX_HEIGHT` (`:51-88`) carries the owner's 560→500 reversal and the arithmetic of where the ceiling binds; `AIM_Y` (`:90-121`) carries the X precedent and the "14 of 41 within 3% of an edge" measurement; `PHOTO_ROW_TARGET` (`:486-504`) carries three measured columns. What narrates is the history of superseded rules: two earlier carousel versions, the horizontal aim band that no longer exists, the JavaScript row-count that was replaced -- all recorded in the handover (D16-D21, F22-F28) and in the tests' own comments. Quote of one earned: *"At 150 a 730px card takes three ordinary frames at 151px high and a 358px one takes a single wide frame or two portraits; raise it and a laptop drops to two"*. Quote of one narrating: *"Version one let the tallest photograph pick the shape, so two landscapes beside a portrait sat in 121px of blurred bed on a phone. Version two picked the MEDIAN, and the owner found the bill for that one in his own feed"*.
- **What to do**: Replace each history paragraph with one line naming the decision and where its story is (`handover.md D21`); keep every number and every owner quote that explains a *current* constant. The header at `:403-448` shrinks to the formula and the "flexbox, not measured pixels" sentence with a pointer to D16.
- **Saving**: ~110 comment lines.
- **Risk & gate**: none. `src/lib/photo-layout.test.mjs` (pure; unchanged).
- **Confidence**: medium-high. The media-viewer lens should confirm `photo-rows.tsx` does not carry the same flexbox header verbatim (I did not open it).
- **Notes**: The tests here (`photo-layout.test.mjs`, 501 lines, 81 pairs and 729 triples at three columns) are a faithful spec; this file is a safe rewrite target if a session ever wants one, but nothing in it needs rewriting.

### collection-16 - Export, type and comment hygiene batch
- **Where** and what, one line each:
  - `BandCount` declared three times: `src/app/(main)/collection/actions.ts:761`, `src/components/collection/year-rail.tsx:65`, `src/components/collection/photo-scrubber.tsx:74`; the client imports it from `year-rail` (`collection-client.tsx:61`) while the server exports its own. One `export type BandCount` in `src/lib/collection.ts`.
  - knip's seven: `preloadViewer`, `bandsOf`, `READING_LINE` (`photo-river.tsx:27,202,258`), `RIVER_ORDERS`, `orderLabel` (`river-controls.tsx:63,70`), `THUMB_PX` (`collection-photo.ts:26`), `PHOTO_SCOPES` (`photo-visibility-rule.ts:23`) -- all used inside their files; drop the `export` keyword (for `PHOTO_SCOPES`, `type PhotoScope = "valley" | "class"` directly). Confirmed by grep: none is imported outside its own file (the name `preloadViewer` recurs as a private local in `post-card.tsx`, `answer-photos.tsx` and `photo-wall.tsx`, which is the media-viewer item above, not an import; `bandsOf` and `READING_LINE` appear outside only in test and spec prose). `landAt` and `warmThumbs`, by contrast, are imported by `/lab/collection` and stay exported.
  - `eraLabel` (`collection.ts:199`): exported, used only inside the file. `eraSortYear` (`:376`): a one-line wrapper over `ERA_START_YEAR` used only by `collection-taxonomy.test.mjs:103-104`, which can read `ERA_START_YEAR` directly. `eraPhrase`: internal plus one test line.
  - `PhotoData.createdAt` (`actions.ts:118,162`): shipped on every river row (48 ISO strings a page) and read only by `src/app/lab/collection/page.tsx:58,93,95` to sort the lab's fake archive. Drop from `PhotoData`; the lab's `_archive.ts` keeps its own `added` field (lab lens).
  - `photo-river.tsx:472`: unused `i` (tsc `noUnusedParameters`); `onOpen(photos.indexOf(p))` is O(n) per click, fine, but pass the band's offset instead and use `i`.
  - `MAX_SEARCH = 100` (`actions.ts:723`) and `.slice(0, 100)` (`collection-data.ts:61`): one constant, exported from `river-cursor.ts`.
  - `collection.ts:201`: "the contribute form's year dropdown" -- there is no dropdown since D45; `:27-31` "The admin side reads it" (Other) -- nothing does; `contribute-room.tsx:102` (see 12).
  - `collection-intake.ts:106-112`: the EXIF orientation swap on a buffer that is already the display WebP (upright, metadata stripped by `/api/upload`); harmless, four lines, and a comment that misleads. Replace with `metadata()`'s width/height and a one-line note.
  - `e2e/collection-seek.spec.ts:142-147`, `:478-497`, `:608-620` and `:154-158`, `:181-185`: the "band at the reading line" evaluate and the "move the pointer away then read the lit mark" pair are each written three times (jscpd-e2e's four clones). One helper each.
  - `import-album.mjs` and `sweep-stranded-originals.mjs` and `tag-photos-*.mjs` and `backfill-image-dimensions.mjs` share the 20-line env/DEMO_REF/argv preamble (jscpd `raw/jscpd.txt:16-42`); a `scripts/dev/_cli.mjs` exporting `flag`, `value`, `openDb(envFile)` would take ~15 lines out of each of six scripts. This belongs to whoever owns `scripts/` (the professions pass has it too); noted here, counted nowhere.
- **Phase**: hygiene / dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Saving**: ~40 lines; 7 knip lines; ~1.5 KB per river page (`createdAt`).
- **Risk & gate**: low. `npm run check` (knip is not in the gate, but tsc `noUnusedParameters` is not either -- both are audit tools); `river-query.test.mjs:107` pins `id: \`${key}#${nth}\`` in `bandsOf` -- un-exporting does not change that.
- **Confidence**: high.

### collection-17 - Run the second stranded-originals sweep and delete the script
- **Where**: `scripts/dev/sweep-stranded-originals.mjs` (161 lines), `scripts/README.md:79`, `src/app/(main)/collection/actions.ts:417-435` (`COLLECTION_ORIGINAL_KEY` still accepting `collection/` alongside `staging/`, with "Safe to narrow to `staging/` alone once nothing old is in flight -- which is any time after the deploy")
- **Phase**: dead (scheduled)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous for the dry run and the deletion if it finds nothing; owner if it finds objects to delete (it deletes bytes)
- **Evidence**: The script's own header: *"RUN IT TWICE. Once now, and once more after the change that moves new originals to `staging/` has been deployed ... After that second run this script has no live question to answer and should be deleted along with its line in scripts/README.md."* The staging change is 04c90a2 (2026-08-28); the repo has been pushed several times since (the 2026-09-02 sessions record pushes), so production mints `staging/` keys now. Nothing in `progress.md` records the second run.
- **What to do**: `node scripts/dev/sweep-stranded-originals.mjs` (dry by default; it lists). If it reports 0 to delete: delete the script, its README row, and narrow `COLLECTION_ORIGINAL_KEY` to `^staging\/...` (drop the `|collection` alternation and the `keyBelongsTo` root switch at `actions.ts:481`, ~12 lines with comments); update `image-purge-rule.test.mjs` if it matches on the regex text (it matches `COLLECTION_ORIGINAL_KEY.test(input.key)` only). If it reports objects: show the owner the list and let him say `--apply`.
- **Saving**: 1 file (161 lines), 1 ledger row, ~12 lines in `actions.ts`, one fewer accepted key shape on a public action.
- **Risk & gate**: low. The dry run's own output; `npm run check` (`scripts-ledger.test.mjs` will fail if the README row outlives the file or vice versa).
- **Confidence**: high.

## Owner decisions

**1. The album importer (`scripts/dev/import-album.mjs`, 463 lines).** It was written to put your own 2015-2023 album (1,719 files) into your Class Collection with one date per photograph, and it ran on 2026-09-02. It reads from `sanan's stuff/album`, a folder audit 1 asked to move out of the repo, and its defaults name your email. If more albums are coming (yours, or a classmate's you would run it for), keep it as is and update the default paths when the folder moves. If that import was the one job, it is a finished one-off and can be deleted with a pointer in `scripts/README.md`'s history (the undo ledger it wrote lives in `scripts/dev/.album-import/`, gitignored, and stays). Recommendation: keep until you have said "no more albums", then delete in the same commit as the folder move.

**2. `/lab/collection/swap`.** This room was the three-round design of the swap between the two halves; the verdict shipped as the caret on the title (`scope-caret.tsx`) and the "hold the old river dimmed, warm the thumbnails, then swap" mechanism. Its registry note still describes it as a live comparison ("Today's swap sits beside it, reproduced beat for beat"). It is a finished experiment whose winner is on `main`. Lab rooms are yours; the choice is archive it (status "archived" in the registry, like `/lab/viewer`) or keep it as design history. `/lab/collection` itself is different and should stay: it is the only place the rail, the scrubber and the seek can be exercised against 240 photographs, and two e2e specs drive it.

**3. The proxied contribute fallback (`contributePhoto`, `actions.ts:246-390`, and `contribute-room.tsx:629-647`).** When the direct upload to Cloudflare cannot be used (no R2 locally, a CORS refusal, a 20-second timeout on a slow connection), a photograph goes through the server instead -- shrunk in the browser first to fit Vercel's body cap, which loses resolution and the camera's date. The archive's whole point is full resolution, so this path silently files a worse copy than the member gave. The alternatives are: keep it (a slow connection still contributes, and it is the only path that works on a developer's machine, where the handover records the direct PUT simply hangs); or fail loudly ("that one did not go through, try again on wifi") and delete ~145 lines. Recommendation: keep it for now because local development depends on it, but have the room say when it fell back ("saved at reduced size") so nobody discovers a soft copy months later. Not a simplification; a product call.

**4. The black-and-white filter that was never built (`Image.greyscale`).** Every uploaded image is measured for colour at upload (spec §7.4, "a filter nobody has to tag for") and the answer is stored, but no surface reads it -- `image-record.ts:84` deliberately leaves it out of the select. Either build the filter (a seventh word on the bucket line, which the class-collection spec's "don't add a billion elements" rule argues against) or stop computing and storing it. Recommendation: stop, and let the data-layer lens drop the column; the measurement cost is small but it is a promise the page does not keep.

**5. Who approved a photograph (`Photo.approvedAt`, `Photo.approvedById`, the `approvedBy` relation).** Written on every approval, never read anywhere in the app. They are an audit trail with no reader. Keep them if you want to be able to ask "who let this in" in the database one day; otherwise they are two columns and a relation for the data-layer lens. Recommendation: keep, and note it as deliberate in the schema comment so the next audit does not ask again.

## Not-findings

- **The rail's counts (`groupBy`) on every first page in every order** (`actions.ts:919-947`): the rail and the phone scrubber are drawn in every order by decision (`collection-client.tsx:1336-1341`, `photo-scrubber.tsx:51-56`, and the e2e spec "the rail is drawn in EVERY order"), so the counts are needed whenever a first page is.
- **Three contribution paths with three cleanup stories** (`collection-photo.ts:1-17`): audits C-063/C-064/C-159 each pin a different failure mode; merging the encode (06) is allowed, merging the refusals is not.
- **`river-cursor.ts` as a separate pure module**: a `"use server"` file may only export async actions, so the cursor arithmetic could not otherwise be unit-tested (`river-cursor.ts:4-8`); 328 lines of tests including a walked archive depend on it.
- **`defaultOrderFor` living in `collection.ts` rather than beside `riverFiltersFrom`**: importing it from `collection-data.ts` dragged auth, `next/server`, Prisma and sharp into the client bundle and blanked the page with `tsc` green (`collection.ts:551-557`, pinned by `collection-taxonomy.test.mjs:138-153`).
- **`takenKey` mapping existing twice (TypeScript `ERA_START_YEAR` and the SQL CASE)**: a generated column cannot share code; `collection-taxonomy.test.mjs:84-106` compares the two.
- **The pager not being shared with the feed/directory**: see the charter answer; the Collection's is bidirectional with scroll anchoring, and audit 1 refuted the shared hook with measurements.
- **All twelve `"use client"` component files**: each holds state, effects, motion values or pointer handlers; `collection-skeleton.tsx` is correctly a server component. The five dialogs are already behind `dynamic()` and latched (`collection-client.tsx:64-89`, `:989-1015`).
- **`useMemo` on `viewerImages`** (`:984-987`): the list is unbounded and re-mapping it on every keystroke in the search box would be real work.
- **`content-visibility` windowing removed** (`photo-river.tsx:425-436`): removed for cause ("scrolling just glitched and took me elsewhere", owner 2026-08-29); the comment tells the next session what a correct version needs (computed row heights).
- **`backfill-image-dimensions.mjs` kept**: `recordImage` logs and never throws (`image-record.ts:37-52`), so a bad database minute leaves a URL rowless, and this script is the only repair. Its ledger row says "safe to re-run".
- **`exif-date.ts` at 330 lines**: see the charter answer; four containers, a security property, and bytes-level tests.
- **The `PhotoData` fields carried for the edit dialog** (`photoYear`/`photoMonth`/`datePrecision`, `actions.ts:102-108`): they save a round trip when the pencil is pressed and `typedDate` is pinned as the inverse of `photoDate`.
- **The 2:1 `PAGE_SIZE`/`UP_PAGE_SIZE`** (`actions.ts:59-77`): each number has a measured reason (a screen and a half; a visible hitch when 48 rows land above the reader).
- **The review room's seven internal components** (`review-room.tsx:468-769`): render helpers in a 769-line file, each used once, each named for what the old list repeated; not the single-use-helper signature.
- **The seven-line `Key` and `Verdict` components**, same file: fine.
- **The tests in this territory pin behaviour**: `river-cursor.test.mjs` walks an archive through the clauses; `photo-layout.test.mjs` is a matrix of 810 combinations; `photo-visibility-rule.test.mjs` is phrased as attacks; the three e2e specs assert invariants over sequences, geometry with `expect.poll`, and one opacity rule the owner asked for verbatim ("nothing half-drawn"). `river-query.test.mjs` is structural on purpose and says why. None pins styling for its own sake.

## Audit-1 carry-overs in this territory

- **§4 #16, the legacy Collection taxonomy SELECT**: still formally open in `fix-prompt.md:1605`; now answerable and almost certainly "zero rows" on production (D41, D51). Becomes collection-08, autonomous after the SELECT.
- **§4 #17, Collection's filter row vs the sentence line**: **moot**. D27 (2026-08-28) deleted the whole filter row rather than restyling it; `collection-facets.ts` is gone (handover session 5); the controls are one line of words plus the order menu. Nothing to retire.
- **Dialog/viewer deferral (feed-posts-04 = bundle-build-11)**: done for the Collection (a6be05b; five `dynamic()` imports with the latch, `collection-client.tsx:64-89`).
- **Server-render page 0 of /collection (member-surfaces FOL)**: done (7cb400f; `collectionPageData` fetches `firstPage`, `collection-client.tsx:172-175` records the 778 ms / 2.9 s it removed).
- **Paged-list hook (feed-posts-05 = duplication-12)**: refuted at fix time for PostFeed; for the Collection it is now the wrong call for a new reason (bidirectional paging, scroll anchoring) -- see the charter answer.
- **Dead collection images + gen/ (root-docs-assets-17)**: done (77dc9da).
- **`DEMO_CLOSED_PATHS`-style honesty exports**: not in this territory.

## For other lenses

- **media-viewer**: (a) `preloadViewer` and the `dynamic(() => import("@/components/common/image-viewer"))` pair are written in five files (`photo-river.tsx:27`, `collection-client.tsx:70-73`, `post-card.tsx:68,80`, `letter-images.tsx:19,51`, `answer-photos.tsx:37,40`, `photo-wall.tsx:30,33`); one `components/common/image-viewer-lazy.ts` exporting `LazyImageViewer` and `preloadViewer` removes four copies. (b) `contribute-stage.tsx:142-169` re-declares `STEP_SECONDS = 0.22` and the two opposite curves from `image-viewer.tsx:173-182` ("copied down to its two curves") and `SWIPE_PX = 70`/`SWIPE_VELOCITY = 420` "the viewer's thresholds"; export them from the viewer (or `motion.tsx`) and import. jscpd also pairs `contribute-stage.tsx:203-213` with `photo-carousel.tsx:282-292` (the `drag` props). (c) The Collection uses `PhotoStream`/`PhotoCell` from `photo-rows.tsx` with its own `Tile` (`photo-river.tsx:84-180`); it does not use `PhotoFrame`, `PhotoBed` or `PhotoAim` at all. `CarouselArrow` is used by `contribute-stage.tsx` only within my territory. (d) If collection-08 lands, check whether `ViewerImage.where` has any producer left. (e) `photo-layout.ts:403-448`'s flexbox header may be duplicated in `photo-rows.tsx`.
- **data-layer**: Photo columns I saw nothing read: `approvedAt`, `approvedById` (+ relation `approvedBy`) -- write-only; `area`, `freeTags` -- read only as null (collection-08); `updatedAt` -- not read in my territory. `Image.greyscale` -- written, deliberately never selected; `Image.createdAt` -- not selected anywhere (`photoFactsFor` selects seven named fields). `PhotoLove.id` is a surrogate key beside `@@unique([userId, photoId])`. Indexes: `@@index([approved, isHidden, createdAt])` is a strict prefix of `Photo_river_added_idx`; `Photo_river_era_idx (approved, isHidden, era)` and `@@index([era])` served the era *filter* that no longer exists (a decade is a seek since 2026-08-29; the rail's `groupBy` is by `(photoYear, era)` under the river's `where`) -- check `pg_stat_user_indexes` before dropping. Two of the four trigram GIN indexes from `2026-08-28-collection-river.sql` are on `area` and `freeTags` (collection-08).
- **lab**: `src/app/lab/collection/_archive.ts:171-176` re-implements the `takenKey` mapping with a hand-typed decade table (a third copy beside `ERA_START_YEAR` and the SQL); one import from `lib/collection` replaces it. `/lab/collection/swap` is a finished experiment (owner decision 2).
- **bundle**: `year-rail.tsx` (xl-only) and `photo-scrubber.tsx` (<xl-only) both ship in `/collection`'s first load on every viewport; a viewport-conditional `dynamic()` for the one not rendered would save one of the two chunks per device, if measured worth it. `@phosphor-icons/react` is imported in five Collection files (check `optimizePackageImports` coverage). `motion/react` is on the page anyway (river-controls' underline uses the sidebar's `NAV_MARKER_SPRING`).
- **analytics / platform**: collection-01's PostHog `capture_pageview: "history_change"` hypothesis (`posthog-client.ts:102`) would affect every page that writes `history.replaceState` (the directory's filters, the feed's), not only the Collection.
- **scripts**: the six-script CLI preamble clone (collection-16, last bullet); `tag-professions-pick.mjs` is the conformant picker and `tag-photos-pick.mjs` the one to bring into line (collection-13).
- **docs**: `docs/planning/collection-scrubber/{brief,handover}.md` describe `decade-rail.tsx` (deleted) and a rail that filters; both are superseded by the year rail and the scrubber that shipped 2026-08-30 to 09-02, and no document says so at their top the way `media.md` does. `docs/planning/collection-rework/handover.md` (1,588 lines) still has two open close-out items on its status board (`/lab/crop` retirement pending the owner's look; the sweep). The 2026-09-02 work (fifteen `progress.md` entries) has no planning document and needs none.
- **feed-posts**: the composer's "Also add to the Collection" tick (`create-post-form.tsx:153,972-988`, `feed/actions.ts:310-330`) is live and is the only caller of `collection-intake.ts`; the intake's own quota check counts `uploaderId` without `scope` (`collection-intake.ts:72`) while the app's quota is now per half (`actions.ts:191-195`) -- it writes valley rows, so it should count `scope: "valley"`; one word, correctness not simplification.

## Metrics

- Lines read: ~15,100 in the territory (5,590 components; 2,884 lib; 1,762 routes; 1,003 review room; 1,189 scripts; 950 e2e; 2,483 unit tests incl. `river-query.test.mjs`) plus ~4,100 lines of spec and ~300 of `progress.md`.
- Comment-heaviest (cloc comment/code): `photo-layout.ts` 460/126 = 3.65; `photo-visibility-rule.ts` 126/89; `collection.ts` 294/228; `exif-date.ts` 162/135; `collection-photo.ts` 147/130; `photo-scrubber.tsx` 161/219; `photo-river.tsx` 235/218; `contribute-stage.tsx` 178/161; `collection-client.tsx` 662/725; `contribute-room.tsx` 351/656; `year-rail.tsx` 213/312.
- Biggest files: `collection-client.tsx` 1,469; `actions.ts` 1,359; `contribute-room.tsx` 1,067; `review-room.tsx` 769; `photo-layout.ts` 619; `collection.ts` 560; `year-rail.tsx` 558.
- Counts: 6 `Photo` read shapes across the app (4 in my territory); 4 `User` class-fact reads; 3 column-map copies for writing a photograph's answers; 3 `BandCount` declarations; 5 `dynamic()` dialogs (all latched); 12 `"use client"` files, all justified; 7 knip unused exports, all `export` keywords on internal helpers; 1 unused parameter; eslint-disable sites in my files: 1 (`photo-river.tsx:110`, `no-img-element` on an R2 `<img>`, the same reason every photograph `<img>` in the app carries).
- Queries per load today (verified member with a class): `/collection` ≈ 10 (1 user + 6 facts + 1 user + 1 river + 1 groupBy); `/collection/[id]` for a class photograph ≈ 14 (adds 2 photo + 2 user). Findings 03 and 04 take ~5-6 off each; 01, if confirmed, stops them being paid again on every filter press.
- First-load JS: `/collection` and `/collection/[id]` 1,131,220 bytes raw (`route-bundle-stats.json`), `/admin/review` 1,152,475 -- 33 chunks each; per-chunk attribution is the bundle lens's.
