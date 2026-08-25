# directory-profile - simplification audit report

Territory reader for the directory (map + batches), member profiles, onboarding/welcome,
places/gazetteer, houses and batches: `src/app/(main)/directory/**`, `src/app/(main)/profile/**`,
`src/app/(main)/welcome/**`, three API routes (places/search, users/search, users-by-batch),
`src/components/directory/**` (3), `src/components/profile/**` (16), `src/components/onboarding/**`
(7), and 18 lib modules (map-cluster, city-coords, geocode, place-*, directory-facets, houses,
house-spans, batch-year, contact-rows, onboarding-local, professions, vcard, normalize,
search-continuation, search-log, social). Date: 2026-08-25. Files in territory: 56 (~11,440 lines);
read fully: 56.

## Coverage

- **Read fully**: every file listed in the charter, including the 1,981-line
  `letterhead-profile.tsx` end to end, both directory server files, all three API routes, all seven
  onboarding files, all 18 libs, and all loading.tsx files.
- **Skimmed (why)**: the `*.test.mjs` files for these modules (directory-rule, directory-where,
  house-spans, houses, map-cluster, place-input, vcard, normalize, batch-year, profile-editor-rule,
  profile-email, search-continuation) - read enough of each to know what it pins and which findings
  it gates; not line-by-line.
- **Not read**: lab rooms that mirror this territory (`lab/directory/*`, `lab/profiles/*`,
  `lab/chain-lines`, `lab/houses`) - not mine; observations forwarded under "For other lenses".
- **Uncommitted edits seen**: none in my territory. The charter warned of WIP in next.config.ts,
  src/lib/admin.ts, scripts/qa/phase7-probe.mjs, manual-tour-entry.test.mjs and forbidden.tsx;
  by the time I ran, `git status --short` showed only the audit's own untracked files, so that
  work appears to have been committed. I touched none of it either way.

## Summary

This territory is in unusually good shape at the line level: the server files are dense with
audit-ID-bearing "why" comments (protected by the repo standard), onboarding genuinely reuses the
profile's editors rather than copying them, and the two scary-looking big files (houses-chain,
alumni-map) turn out to be earned complexity, not bloat - each carries an owner-dated defence for
nearly every constant. The real wins here are **not lines, they are kilobytes**: `/directory`
(1,212 KB route JS) and `/profile/[id]` (1,206 KB) are the two heaviest routes in the entire app,
and both are heavy for structural reasons this report can name - the letterhead ships its whole
edit-mode machinery to every stranger who views a profile, and the directory ships the d3 + world
atlas map stack in its main client graph. Straight line deletions are modest but real: ~90 lines of
a dead year-row editor library the chain editor replaced, ~50 lines of dead exports knip correctly
flagged, one dependency pair (supercluster, d3-scale) that the map's own header comment explains
was replaced but that never left package.json, and a 185-line component only lab imports. One
product-level drift surfaced that no spec defends: the directory's Profession filter matches an
enum vocabulary ("Technology", "Finance"...) that no live write path has produced since the old
onboarding Industry select was deleted, so the facet silently rots as new members join. Structural
vs cheap split: 8 structural, 6 cheap. What surprised me: how consistently the "second copy" I went
hunting for turned out to be in `/lab`, not in shipping code.

Answers to the charter's floor questions are woven through Findings and Not-findings; in one line
each: letterhead's sections are already parameterised where that is safe (the facts array) and
deliberately mirrored where it is not (colophon/name; owner-pinned geometry) - the real split is
edit-vs-read, not section-vs-section (F-01). The houses chain is not a 150-line path builder's job
(N-01). The three search endpoints must stay three (N-02). The place trio is three files on
purpose (N-03). Onboarding does not fork the profile editors (N-04, one 35-line exception F-12).
search-log is read back by admin analytics and pruned by retention (N-05).

## Findings

### directory-profile-01 - Split the letterhead's edit machinery out of the sheet every stranger downloads
- **Where**: `src/components/profile/letterhead-profile.tsx:45-115` (imports),
  `:319-472` (edit state + handlers), `:1308-1519` (ContactsEditor block, dark-mode tile,
  delete-account dialog, crop/attach dialogs), `:1926-1981` (CitiesPen);
  consumer: `src/app/(main)/profile/[id]/page.tsx:364-459`
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `/profile/[id]` is the #2 route in the app by client JS: 1,206 KB route JS /
  1,636 KB first load (`raw/route-js.txt`). `LetterheadProfile` is one `"use client"` module, so
  its whole import subtree ships to every viewer - but a long tail of it is only reachable when
  `draft` is present, and `draft` is only ever passed on your OWN profile
  (`page.tsx:422-458`: `isOwnProfile ? {...} : undefined`). Edit-only imports in the module head:
  `LocationPicker` (GeoNames typeahead), `ContactsEditor`, `HouseChainEditor` (which pulls the full
  `HouseOptions` picker with popover + bottom sheet), `AvatarCropDialog`, `AttachImageDialog`,
  `Dialog`+`Input` (delete-account), `updateUserPlaces`/`requestAccountDeletion`/`updateAvatar`/
  `removeAvatar`, `updateProfileField`/`updateContactMethods`, `saveOnboardingHouses`,
  `signOut` from `next-auth/react`, plus the `CitiesPen` popover rig. A member viewing a
  classmate's profile - the overwhelmingly common case - downloads all of it to render none of it.
  The brief notes the entire app has exactly ONE `next/dynamic`; this is the clearest second use.
- **What to do**: extract the edit half into a new client module (working name
  `letterhead-edit.tsx`): the delete-account dialog + form (1437-1519), the ContactsEditor/
  dark-mode/install/export block (1308-1390), the photo crop/attach dialogs (1414-1435), CitiesPen
  (1926-1981), and the commit/upload handlers that only they call. Load it from
  `LetterheadProfile` with `next/dynamic({ ssr: false })` gated on `editable` (the `Boolean(draft)`
  flag at :327) - the sheet's read-only text pens (PenValue/PenBlock at rest) can stay, or move
  behind the same gate keyed on first `live=true` if a deeper cut is wanted. The server actions
  themselves are only POST references and cost nothing; the weight is the editor UI components.
  Keep the exported `ProfileDraft` type where callers can reach it.
- **Saving**: 0 net lines (likely +20 for the seam); estimated 80-150 KB of client JS deferred on
  every stranger-profile view (LocationPicker + HouseOptions + crop dialog + image-downscale are
  the bulk; exact split needs one `npm run analyze` after the cut). Faster hydrate on the app's
  second-heaviest route.
- **Risk & gate**: medium. `npm run check` (profile-editor-rule.test.mjs and profile-email.test.mjs
  read these files as text - keep their pinned patterns in whichever file they land in);
  `npm run visual` (profile is a baseline route); open `/profile/[id]` as Jerry (own) and as a
  stranger, verify the pen still comes out and Done/Save still work; `?edit=1` deep link still
  opens editing.
- **Confidence**: high that the split is safe and worthwhile; medium on the KB number until the
  analyzer runs. The one thing that would change my mind: if the dynamic seam forces a visible
  loading beat on "Edit profile" that the owner rejects - preloading on hover of the button removes
  it.
- **Notes**: I considered instead splitting per-section (About-pen, Houses-pen...) and rejected it:
  the comments in this file document a year of owner-tuned geometry that depends on the editable
  and read-only branches rendering byte-identical boxes ("Byte-for-byte the read-only lockup
  below, with the number swapped for a field"). Splitting along the `editable` axis leaves every
  one of those pairings intact in one file. Related: F-12 (the photo-upload handlers this would
  move are near-duplicates of photo-step's). The duplication lens comparing this file with
  `lab/profiles/_variant-letterhead-3.tsx` should note the concept header's own rule: "Keep them
  in step, or retire the concept" - an owner call, not mine.

### directory-profile-02 - Load the map stack on demand instead of in the directory's main client graph
- **Where**: `src/components/directory/directory-client.tsx:28` (static
  `import { AlumniMap } from "./alumni-map"`), `src/components/directory/alumni-map.tsx:7-12`
  (d3-geo, d3-selection, d3-zoom, topojson-client, `world-atlas/countries-110m.json`, geojson)
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `/directory` is the #1 route in the app: 1,212 KB route JS / 1,642 KB first load
  (`raw/route-js.txt`). `alumni-map.tsx` statically inlines `world-atlas/countries-110m.json`
  (105 KB raw on disk, checked: `wc -c node_modules/world-atlas/countries-110m.json` = 107,761)
  plus four d3/topojson libraries into `DirectoryClient`'s import graph. The map is the default
  view on a bare `/directory`, but when any filter is active the initial view is "people"
  (`directory-client.tsx:116-118`) and the map may never render; either way a separate chunk loads
  in parallel and costs nothing when it IS the first view.
- **What to do**: replace the static import with
  `const AlumniMap = dynamic(() => import("./alumni-map").then(m => m.AlumniMap), { ssr: false, loading: () => <MapSkeleton/> })`
  (a `div` with the map's exact `min(72vh, 640px)` box and `skeleton-warm`, so nothing jumps).
  The `CityPin`/`PinPerson` types the page imports (`page.tsx:11`) are type-only and survive
  unchanged. Note the projection and `landPaths` are computed at module top level
  (`alumni-map.tsx:76-89`) - with the dynamic import that parse/project cost also moves off the
  route's critical path.
- **Saving**: ~150-200 KB out of the main `/directory` chunk (atlas JSON + d3-geo + d3-zoom +
  d3-selection + topojson-client); 0 lines.
- **Risk & gate**: low-medium. `npm run check` - **directory-rule.test.mjs reads
  `alumni-map.tsx` source as text** (C-092/C-098 pins); the file itself is unchanged so those hold.
  `npm run visual` on `/directory` both viewports (mask nothing new: the map draws the same);
  click a pin, open the drilldown, go fullscreen.
- **Confidence**: high. Would change my mind: if the owner reads the one-frame skeleton on the
  default map view as a regression - the loading box above is designed to make it invisible.
- **Notes**: this is bundle-lens territory by charter; I claim it because the fix is one line in a
  file I own and the evidence is specific to my code. The lab's `_maps.tsx` imports the same stack
  for `/lab/directory` (908 KB) - same lever available there, lab lens's call.

### directory-profile-03 - Remove supercluster and d3-scale; declare d3-selection and geojson
- **Where**: `package.json:37` (`@types/d3-scale`), `:39` (`@types/supercluster`), `:47`
  (`d3-scale`), `:64` (`supercluster`); `src/components/directory/alumni-map.tsx:8` and
  `src/app/lab/directory/_maps.tsx:25` (undeclared `d3-selection` imports), both files' `geojson`
  type imports
- **Phase**: dead / library
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "from \"supercluster\"\|from \"d3-scale\"" src scripts e2e` - zero hits;
  every remaining mention of either name is prose in comments (`map-cluster.ts:6-19` documents WHY
  supercluster was replaced: its web-mercator tile-pixel radius could never split New Delhi from
  Gurgaon, so clustering moved to the screen-space implementation in `map-cluster.ts`; `sqrtRadius`
  at `map-cluster.ts:105` replaced d3-scale's scaleSqrt). knip flags all four packages. Meanwhile
  `d3-selection` IS imported (alumni-map.tsx:8) but only rides in as a transitive dependency of
  d3-zoom (verified in `node_modules/d3-zoom/package.json` dependencies), and `geojson` types
  likewise arrive transitively - knip lists both as "unlisted dependencies". A d3-zoom upgrade that
  reshuffles its own deps would break the build with no change in this repo.
- **What to do**: `npm uninstall supercluster d3-scale @types/supercluster @types/d3-scale`;
  add `d3-selection` (and `@types/d3-selection`, `@types/geojson` if not already hoisted) to
  package.json as real dependencies. Fix the two stale comment references while there:
  `city-coords.ts:188` ("the map's existing supercluster merges them") and
  `alumni-map.tsx:98` (historical, fine to keep - it is explicitly past tense).
- **Saving**: 4 dependencies removed, 2 declared honestly; ~0 KB client JS (they were never
  bundled - nothing imported them); install/audit surface shrinks.
- **Risk & gate**: low. `npm run check` (map-cluster.test.mjs and
  `scripts/qa/map-cluster-verify.mjs` exercise the real clustering); load `/directory`, zoom the
  map.
- **Confidence**: high. Nothing would change my mind short of a hidden string-based import, and I
  greped for those.
- **Notes**: this fully answers the charter's "explain what the map actually uses": **d3-geo**
  (geoNaturalEarth1 projection + geoPath), **d3-zoom + d3-selection** (pan/zoom wiring on the SVG
  group), **topojson-client + world-atlas countries-110m.json** (the land geometry, 105 KB),
  **geojson** (types only), and its own `src/lib/map-cluster.ts` for clustering. supercluster and
  d3-scale are fossils of the pre-2026-08 design the spec (docs/spec/directory.md §4.3.2)
  described; the code moved on and the manifest did not.

### directory-profile-04 - Delete the dead year-row houses-editor library (replaced by the chain editor)
- **Where**: `src/lib/house-spans.ts:14-21` (`HouseYearRow`), `:36-51` (`groupHouseYearEntries`),
  `:71-104` (`seedHouseYearRows`), `:106-124` (`missingYears`), `:126-143` (`restoreAllYearRows`);
  `src/lib/house-spans.test.mjs` (33 lines, almost entirely seedHouseYearRows pins)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn` for all four functions + the type across src (ts/tsx/mjs): the only
  hits outside the module are (a) `src/lib/house-spans.test.mjs`, (b) a quote inside
  `src/app/lab/everything/_findings.ts:241` citing the DELETED `settings-form.tsx`, and (c) a
  prose mention in a comment at `house-chain-editor.tsx:120`. Their one real consumer was the old
  settings form's column-of-year-rows editor; `houses-step.tsx`'s header comment records the
  replacement ("This step used to be a column of year rows with a HousePicker on each... the chain
  editor IS the preview") and `src/components/settings/settings-form.tsx` was deleted in c994c02.
  The live path uses only `academicSpanLabel`, `parseHouseYearEntries`, `parseHouseSpans` and the
  `HouseSpan` type from this module.
- **What to do**: delete the four functions + `HouseYearRow` (~92 lines incl. their doc comments);
  rewrite `house-spans.test.mjs` to keep only the `academicSpanLabel` assertions (or fold those
  into houses.test.mjs) - the seedHouseYearRows tests pin dead behaviour and go with it. Update the
  comment at `house-chain-editor.tsx:120` ("the same end-exclusive convention seedHouseYearRows
  uses") to name `career`'s own convention instead.
- **Saving**: ~92 lines lib + ~25 lines test.
- **Risk & gate**: low. `npm run check` - note the unit-test gate has a file-count floor
  (C-190/C-195); shrinking rather than deleting house-spans.test.mjs keeps the count stable.
- **Confidence**: high. Would change my mind: a plan to resurrect the year-row editor - I found
  none in ROADMAP or FEATURES.
- **Notes**: `parseHouseSpans`, `parseHouseYearEntries`, `academicSpanLabel` stay; they are load-
  bearing across the profile page, chain editor, letterhead and houses step.

### directory-profile-05 - The Profession filter matches a vocabulary nothing writes anymore
- **Where**: `src/lib/professions.ts:1-27`, `src/lib/directory-facets.ts:10`,
  `src/components/directory/directory-client.tsx:331-338`, `src/app/(main)/directory/where.ts:141`
  (`if (filters.profession) where.workplace = filters.profession;`)
- **Phase**: placeholder
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: `professions.ts`'s own header says the list works because "the onboarding
  'Industry' select already writes [it] into `User.workplace` (src/app/(auth)/onboarding/
  page.tsx)". That file was **deleted in commit c994c02** (`git log --diff-filter=D`). Both live
  writers of `workplace` today are free text: the register step's "Organisation" input
  (`register-step.tsx:184-192`, placeholder "e.g. Apple", title-cased on save) and the profile
  pen's "where" hole (`letterhead-profile.tsx:1105-1116`). The filter is an exact equality against
  "Technology"/"Finance"/... - so it matches only rows written under the old select, and every new
  member is invisible to it forever. The facet still renders in the desktop popover and the mobile
  sheet as if it worked.
- **What to do**: an owner decision, three honest options: (a) **retire the facet** - delete
  `PROFESSION_OPTIONS` from directory-facets, the two `FacetSelect` blocks that render it, the
  `profession` arm in where.ts/sentence tokens/facet count, and `professions.ts` itself (~60 lines
  across 4 files; lab's `_chrome.tsx` keeps its own copy); (b) **make it real** - a structured
  "field of work" question somewhere a member actually answers it (product work, out of audit
  scope); (c) leave it and accept it decays. My recommendation is (a) for launch: a filter that
  quietly excludes everyone who joined after August misleads precisely the people the directory is
  for, and (b) can be built later against a real column.
- **Saving**: option (a): ~60 lines, one facet fewer to explain.
- **Risk & gate**: low for (a). `npm run check` (directory-where.test.mjs - check it does not pin
  the profession arm; my skim says it pins year/city/accountType folding, not profession);
  `npm run visual` on `/directory` (the toolbar loses one pill - baseline update rides the change).
- **Confidence**: high on the diagnosis (verified both writers and the deleted select); the remedy
  is genuinely the owner's.
- **Notes**: this also resolves professions.ts's stale header either way. The owner's own note in
  the file ("professions need a defined vocabulary eventually - backlog item") suggests he half-
  knows; what he may not know is that the current filter is already broken for new members, not
  merely provisional.

### directory-profile-06 - profile-avatar.tsx ships in components/ but only lab imports it
- **Where**: `src/components/profile/profile-avatar.tsx` (185 lines, "use client");
  importers: `src/app/lab/profiles/_variant-passport.tsx:78`, `_variant-terrace.tsx:80` - only
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "ProfileAvatar" src` minus its own file: two lab variants plus one prose
  mention in a letterhead comment. The shipped profile replaced it with `PerchedBird` inside
  letterhead-profile.tsx (same chirp + species-name idea, rebuilt to the owner's 2026-08-13/18
  notes). docs/spec/profile.md §1's superseded note still names it as "the profile-specific
  wrapper", which is stale. The file even carries a corrupted class string
  (`"group- group- focus-visible:..."` at :159) nobody noticed - a tell that no shipping surface
  renders it.
- **What to do**: move the file to `src/app/lab/profiles/_profile-avatar.tsx`, update the two lab
  imports, and drop the stale sentence in docs/spec/profile.md §1 (or annotate it). Do NOT delete:
  the lab rooms are owner-kept design history and both variants render it.
- **Saving**: 185 lines out of `src/components/profile` (net 0 moved; the win is that the shipped
  components dir stops advertising a superseded profile avatar as available for reuse).
- **Risk & gate**: low. `npm run check` (lab registry audit passes untouched; imports compile);
  open `/lab/profiles` and switch to Passport and Terrace.
- **Confidence**: high.
- **Notes**: the duplication lens should treat PerchedBird (letterhead:1557-1805) as the canonical
  implementation of "bird that chirps and names its species"; ProfileAvatar is its prototype.

### directory-profile-07 - Dead exports: HousesChain, the sort helpers, isAliasedPlaceId, socialIcon/socialHost
- **Where**: `src/components/profile/houses-chain.tsx:758-761` (`HousesChain`);
  `src/lib/directory-facets.ts:19-34` (`SORT_OPTIONS`, `directorySortOptions`,
  `directoryDefaultSort`); `src/lib/place-aliases.ts:69-72` (`isAliasedPlaceId`);
  `src/lib/social.ts:9` (`export { instagramHandle }` re-export), `:25-41` (`socialIcon`),
  `:53-61` (`socialHost`)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: each verified by grep across src/scripts/e2e, not knip alone:
  - `HousesChain` - zero references anywhere including lab; the shipped profile calls `HouseTrail`
    with pre-parsed spans (`letterhead-profile.tsx:1269`). Its wrapper (parse JSON then draw) is
    exactly `parseHouseSpans` + `HouseTrail`, both public.
  - `directorySortOptions`/`directoryDefaultSort`/`SORT_OPTIONS` - the sort control was removed
    from the directory chrome (owner, 2026-08-03, quoted at `directory-client.tsx:245-249`:
    "I think we just remove sorting"); the server still honours `?sort=` via `directoryOrderBy`
    in where.ts, which stays. Nothing imports these three.
  - `isAliasedPlaceId` - the alias pipeline works through `canonicalPlaceId`/
    `canonicalIdForTypedCity` (places/search dedupe + resolvePlaces); the "should this row be
    offered" predicate was never wired to anything.
  - `socialIcon`/`socialHost` - the two surfaces that draw contact icons each keep their own map
    (`get-in-touch.tsx:24-30` ICONS, `contacts-editor.tsx:55-62` ICON); nothing imports these. The
    `instagramHandle` re-export is bypassed too - its one consumer imports from `@/lib/normalize`
    directly (`profile-actions.ts:23`).
- **What to do**: delete the listed spans (~50 lines). While in houses-chain.tsx, drop the stale
  half of the HOUSE_TINTS comment ("exported because the PICKER uses it too" - the picker imports
  HOUSE_TINTS_HOVER/HOUSE_TINTS_PANEL, not HOUSE_TINTS) and un-export the internals knip flags
  that are only used in-module (`HOUSE_TINTS`, `PenRule` in pen.tsx, `cityNameVariants` and
  `OWN_PIN_CITIES` in city-coords.ts) - keep `FIRST_BATCH_YEAR`/`LAST_BATCH_YEAR` exported, their
  tests import them.
- **Saving**: ~50 lines dead code + ~6 `export` keywords.
- **Risk & gate**: low. `npm run check`; `directory-rule.test.mjs` and `directory-where.test.mjs`
  do not reference any of these names (checked); houses.test.mjs untouched.
- **Confidence**: high on all five; the un-exports are cosmetic and skippable if contested.
- **Notes**: I deliberately did NOT propose deleting the ICONS/ICON duplication by reviving
  socialIcon: the two maps key different unions (`ContactMethod["kind"]` has no "phone"-less form;
  `ContactKind` has "link" not "website") and merging them couples an editor to a viewer for ~10
  lines. Tolerated duplication, per the brief's coupling caveat.

### directory-profile-08 - places/search hand-rolls escapeLike, minus the clamp the shared one has
- **Where**: `src/app/api/places/search/route.ts:53-57` (local `escapeLike`), `:73` (`raw` read
  with no length cap); the shared version: `src/lib/db-text.ts:30-57`
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the local function is character-for-character the shared one's replace, but
  without `SEARCH_TERM_MAX` (100 chars). db-text.ts's own comment documents why the clamp exists
  (audit C-015: a 20KB `q` against unindexed contains turns into hundreds of millions of
  comparisons holding a pool connection). This route runs `ILIKE '%q%'` against the 234,934-row
  Place table's UNINDEXED `altNames` column for any query >= 4 chars, with `raw` taken at whatever
  length the client sends - the exact shape C-015 closed elsewhere. The rate limit (:68) caps the
  request count, not the per-query cost.
- **What to do**: delete the local function; `import { escapeLike } from "@/lib/db-text"` (the
  clamp comes along free and is invisible to a real city name); optionally also slice `raw` itself
  at 100 before building `lowerQuery`, so the ORDER BY equality comparisons carry the same bound.
- **Saving**: ~6 lines; closes a real per-query cost hole as a side effect.
- **Risk & gate**: low. `npm run check`; type "rishi", "delhi", a 200-char paste into the
  location picker on `/profile` edit - results unchanged for the first two, refused-by-truncation
  for the third.
- **Confidence**: high. Would change my mind: nothing - the shared function exists precisely for
  this call shape.
- **Notes**: flagging the unbounded `raw` to the security/bug lens too, since "simplify" and
  "close the C-015 shape" happen to be the same edit here.

### directory-profile-09 - Four hand-copies of the directory person shape, two of PERSON_SELECT
- **Where**: `src/components/directory/directory-client.tsx:33-45` (`interface User`),
  `src/app/(main)/directory/actions.ts:9-22` (`PERSON_SELECT`) and `:24-37` (`DirectoryUser`),
  `src/app/(main)/directory/page.tsx:22-35` (`PERSON_SELECT` again),
  `src/components/directory/profile-card.tsx:44-58` (inline props user)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the same 11-13 field person projection is written out four times as types and
  twice as a Prisma select literal. The two PERSON_SELECT objects are today byte-identical; the
  page's and the action's results must stay interchangeable (the client seeds its list from one
  and appends from the other at `directory-client.tsx:189-193`), so drift here is a real bug
  class, the same shape the repo's own audits (C-004, C-093) keep finding.
- **What to do**: export `PERSON_SELECT` and `DirectoryUser` from `where.ts` (already the shared
  home of the query logic; it stays server-safe), import in page.tsx and actions.ts; have
  directory-client and profile-card type their props as `DirectoryUser` (or
  `Pick<DirectoryUser, ...>` for the card, which does not read `workplace`).
- **Saving**: ~40 lines, and the page/action pair becomes drift-proof by construction.
- **Risk & gate**: low. `npm run check` (directory-rule.test.mjs greps page.tsx/where.ts text -
  it pins `where.accountType` folding and nulls-last, not the select literal; moving the literal
  keeps those matches intact - verify the `PAGE` pattern pins still find their lines);
  browse `/directory`, filter, Load more.
- **Confidence**: high.
- **Notes**: `PinPerson` (alumni-map.tsx:31-48) overlaps too but legitimately differs (adds
  `otherCities`, drops `workplace`); leave it.

### directory-profile-10 - Leftover sort-control stub and a one-array Batches/Faculty tile pair
- **Where**: `src/components/directory/directory-client.tsx:510-515` (comment + empty
  `<div className="sm:hidden"></div>` inside FilterSheet), `:619-647` (two near-identical tile
  buttons)
- **Phase**: dead / dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the div is empty; the comment above it ("Sort rides in the sheet too below sm")
  describes the control the owner removed - the stub and its stale caption survived the removal.
  The batch tile and the faculty tile differ only in key, onClick value, label and count-noun;
  28 lines where ~16 would do with a `[...batchYearCounts.map(...), ...(facultyCount ? [faculty] : [])]`
  array.
- **What to do**: delete lines 510-515. Optionally fold the two tiles over one array; if folded,
  keep the faculty tile's `text-base` (vs `text-lg`) distinction - it is a deliberate size step
  for a word vs a two-digit year.
- **Saving**: ~6 lines certain; ~12 more if the tiles fold.
- **Risk & gate**: low. `npm run visual` on `/directory?view=batches` (or switch the toggle);
  the mobile FilterSheet renders identically minus an invisible node.
- **Confidence**: high on the stub; medium on folding the tiles being worth the diff.
- **Notes**: nothing else in the FilterSheet depends on child count.

### directory-profile-11 - Skeletons that draw a page that no longer exists
- **Where**: `src/app/(main)/directory/loading.tsx:11-21` (centred stacked-avatar card grid),
  `src/app/(main)/profile/[id]/loading.tsx:30-31` (the "engraved rule" skeleton)
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the directory skeleton still sketches the pre-redesign directory: a 3-up grid of
  cards with a 64px avatar centred over stacked text - but the shipped default view is the MAP
  (one large rounded rectangle), and results render as compact rows (`profile-card.tsx`'s header
  comment records the owner's rejection of exactly the big centred card this skeleton draws). The
  profile skeleton draws a 3px full-width rule between facts and About that the real sheet
  deleted (letterhead-profile.tsx:1153-1163: "The engraved rule that used to sit here is DELETED
  ... Deleting it also buys back 29px"). The profile skeleton's stated contract is "the page with
  the ink drained out ... so nothing re-corners, re-pads or jumps"; both files currently break it.
- **What to do**: profile: delete lines 30-31 (2 lines, done). Directory: replace the card grid
  block with one `skeleton-warm` box at the map's geometry
  (`height: min(72vh, 640px)`, `rounded-[var(--radius)]`, border) under the existing
  toolbar-shaped rows.
- **Saving**: ~8 lines net; removes a visible layout jump on every cold directory load.
- **Risk & gate**: low. Throttle network, load `/directory` and a profile; `npm run visual` is
  unaffected (baselines capture settled pages).
- **Confidence**: high.
- **Notes**: loading.tsx files are framework conventions - edit, never delete (brief §4c safety
  list).

### directory-profile-12 - Photo-upload plumbing written twice (letterhead + photo-step)
- **Where**: `src/components/profile/letterhead-profile.tsx:364-404` (`uploadAvatarBlob`,
  `handlePhotoPick`, `handlePhotoRemove`) and `:1414-1435` (dialog wiring);
  `src/components/onboarding/steps/photo-step.tsx:50-107` (`upload`, `handlePick`,
  `uploadUnframed`) and `:122-140` (dialog wiring)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: both build the same FormData for `updateAvatar`, run the same `isImageFile` +
  15MB checks, open the same `AttachImageDialog` -> `AvatarCropDialog` pair, and route
  `onDecodeError` to an unframed upload. ~70 lines total across the two, of which ~35 are the
  shared core. They differ at the edges: photo-step shrinks the undecodable file in-browser
  (`shrinkForUpload`, the B-030 Vercel body-cap fix) while the letterhead sends the original;
  photo-step keeps the returned URL in state, the letterhead calls `router.refresh()`.
- **What to do**: extract a `useAvatarUpload({ onDone })` hook (suggested home:
  `src/components/settings/avatar-upload.ts`, beside the action it calls) holding pick-validate ->
  crop -> upload -> busy-state; both callers keep their own dialogs' JSX. In passing this would
  give the letterhead the `shrinkForUpload` guard photo-step has and it lacks - the same HEIC-
  from-a-phone case can hit Vercel's ~4.5MB cap from the profile today.
- **Saving**: ~30 lines; one behaviour gap closed.
- **Risk & gate**: medium-low. `npm run check`; upload/crop/remove a photo as Jerry from both the
  wizard and the profile; audit pins B-042 (finally-resets) must survive in the hook.
- **Confidence**: medium. The honest alternative is to tolerate it: two callers, different
  refresh semantics, and a hook adds a seam. I lean extract because of the shrink-guard gap, not
  the line count.
- **Notes**: if F-01 lands first, the letterhead's copy moves into the edit module; do this one
  second and extract from there.

### directory-profile-13 - The onboarding type cycle madge flags is one type-import away from clean
- **Where**: `src/components/onboarding/onboarding-flow.tsx:49-67` (`OnboardingStepId`,
  `OnboardingUser`); `steps/register-step.tsx:14`, `steps/houses-step.tsx:12`,
  `steps/photo-step.tsx:14` (each `import type { OnboardingUser } from "../onboarding-flow"`)
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `raw/madge-circular.txt` cycles 46-48 (3 of the 5 real cycles in the app) are
  flow -> step -> flow. All three back-edges are `import type`, erased at compile time, so this is
  cosmetic at runtime - but it is 60% of the app's real cycle count, it keeps madge noisy for
  every future audit, and `welcome/page.tsx` imports the flow too, so the types sit in a client
  module a server component reaches into.
- **What to do**: move `OnboardingStepId`, `STEP_ORDER`'s type, and `OnboardingUser` to
  `src/components/onboarding/types.ts`; update the four importers (flow, three steps,
  welcome/page.tsx).
- **Saving**: 0 lines; madge's real-cycle count drops from 5 to 2.
- **Risk & gate**: low. `npm run check` (pure type move).
- **Confidence**: high.
- **Notes**: the remaining two real cycles (catchups, feed-rail) are other territories'.

### directory-profile-14 - Comments that describe deleted code (batch fix)
- **Where**: `src/app/(main)/welcome/page.tsx:13-18` (claims "(auth)/onboarding" exists as dead
  code whose "URL cannot be reused without deleting someone else's file" - the file WAS deleted,
  commit c994c02); `src/app/(main)/profile/[id]/page.tsx:418-421` ("`?edit=1` is how /settings
  hands you one: that route redirects here" - there is no /settings route at all; a request to it
  404s; the sidebar links straight to `/profile/{id}` with no param, sidebar.tsx:553-566);
  `src/lib/professions.ts:2-8` (covered by F-05 but stale regardless of the owner's choice);
  `src/lib/city-coords.ts:186-190` ("the map's existing supercluster");
  `src/components/profile/letterhead-profile.tsx:49+95` (two separate `lucide-react` import
  statements - merge)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each checked against the tree: `find src/app -type d -name settings` - none;
  `ls src/app/(auth)/` - no onboarding; grep for `?edit=1` senders - none in app code (the
  `ProfileDraft.startEditing` doc at letterhead:126-129 already says truthfully that nothing sets
  it and defends keeping the capability - that comment is correct and stays).
- **What to do**: rewrite the five comment spans to describe the present tree (welcome/page.tsx's
  can shrink to one line: "/welcome, not /onboarding: the old (auth)/onboarding page was deleted
  in c994c02"); merge the lucide imports.
- **Saving**: ~12 lines, and three future sessions not sent looking for files that are not there.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.
- **Notes**: this repo's comments are its institutional memory, which is exactly why the false
  ones are worth fixing: they are believed.

## Owner decisions

**The Profession filter (F-05).** The directory has a "Profession" dropdown with choices like
Technology, Finance, Education. It only ever matches people who joined before late August, because
the sign-up question that used to feed it was replaced by a free-typed "Organisation" box - new
members can never appear under any profession no matter what they type. Recommendation: remove the
dropdown for launch. If you want profession search later, it needs a real question on the profile
first; the filter can come back the day that exists.

**The lab letterhead concept (for the duplication lens, but the call is yours).** The shipped
profile sheet was transplanted from `/lab/profiles`' Letterhead II and the two have since drifted
apart across ~15 cloned blocks. The shipped file's own header says "Keep them in step, or retire
the concept." Keeping them in step is recurring manual work nobody has done; retiring the concept
room's variant (the room survives, one variant goes) is one deletion. Recommendation: retire the
variant; the shipped sheet is now the record of what won.

## Not-findings

- **N-01 - The houses chain is not doing a 150-line job in 860 lines.** Of houses-chain.tsx's 761
  lines, 288 are comment (cloc), nearly all owner-dated reasoning (the serpentine, "ARROWS, not
  lines" with the 2026-08-19..21 reversal, the flush-left rule, the one-90-degree-bend rule, three
  photographed turn-collision cases). The 411 code lines buy: a hidden measuring pass over real
  DOM pill widths (fonts change widths; an SVG path builder cannot know them), Knuth-Plass-style
  minimum-raggedness row balancing (the documented 4+4+1 -> 5+4 fix), three distinct turn
  geometries each answering a specific owner screenshot, the editor's pending-pill threading
  through the same layout, and the sr-only sentence. house-spans.ts adds 99 code lines of parsing/
  collapsing shared server+client (minus the ~92 F-04 removes). A "150-line SVG path builder"
  reproduces none of the measured-text or editing behaviour. Verified intentional; leave it.
- **N-02 - The three search endpoints stay three.** users/search (name typeahead over User, 8
  rows, mention/picker consumers, M44/C-006 pins), users-by-batch (bulk ids/details over
  batchYear, H18's 5000-row ceiling and Low 70's list parser), places/search (raw SQL prefix scan
  over the 234,934-row gazetteer with alias collapse). Different tables, different query engines
  (Prisma vs $queryRaw), different caps, different consumers; the shared parts they SHOULD share
  (auth, email gate, the "search" rate-limit bucket, logSearch-in-after) they already do share.
  One merged route would be a switch statement over three bodies plus one blended attack surface.
- **N-03 - The place trio is three modules on purpose.** place-input.ts is pure (its own comment:
  testable by node:test because it takes the gazetteer lookup as a callback); place-lookup.ts is
  the 10-line Prisma callback extracted so three writers cannot each hand-roll the findMany
  (audit R6); place-aliases.ts is a data-rule file whose 60 lines of comment ARE the owner's
  Delhi/New Delhi decision record. Merging them either drags Prisma into the testable module or
  achieves nothing but concatenation.
- **N-04 - Onboarding does not fork the profile editors.** houses-step renders the profile's own
  `HouseChainEditor`; register-step uses the shared `LocationPicker` and the shared
  `resolvePlaces`/`placesSchema` gate; photo-step calls the settings `updateAvatar` and the shared
  crop dialog. The one 35-line overlap is F-12.
- **N-05 - search-log is not write-only.** `src/lib/admin-analytics.ts:493-521` runs five reads
  (top searches by scope, zero-result searches, counts) for the admin analytics room, and
  `src/lib/retention.ts:203` prunes old rows. Purpose: the owner asked for "the most common
  searches" (C-097); the prefix-dedupe (`search-continuation.ts`) is what keeps a live typeahead
  from writing nine rows per word (M25).
- **N-06 - The letterhead's mirrored editable/read-only lockups are deliberate, not lazy.** The
  colophon pair (:860-920) and the name pair (:925-983) are annotated "Byte-for-byte the read-only
  lockup below, with the number swapped for a field" - the mirror-in-flow technique in pen.tsx
  exists precisely so the resting editable sheet is pixel-identical to a stranger's (owner,
  2026-08-07: "Who asked you to move things around?"). Fusing each pair into one parameterised
  component would save ~60 lines and re-open the geometry class of bug the file spent three owner
  rounds closing. The facts row (:488-614) already IS the parameterised form.
- **N-07 - The directory page's always-run batch/faculty/range queries are needed.** The view
  toggle is client-side state (no navigation), so the Batches tiles and the FilterSheet's year
  bounds must be in props on every load; the queries are one groupBy, one count, one aggregate
  inside the existing Promise.all.
- **N-08 - `?edit=1` with no sender is a documented capability, not dead plumbing.** ProfileDraft's
  own doc (letterhead:126-129) says nothing sets it and why it is kept (a link can hand somebody
  an editable sheet). Three lines of plumbing; keep.
- **N-09 - FIRST_BATCH_YEAR/LAST_BATCH_YEAR "unused exports"** (knip) are imported by
  batch-year.test.mjs; the brief's own note about knip and the test runner applies.
- **N-10 - The stray-hair prank** (155 lines across two files) is owner-sanctioned, server-gated
  to one user id so nobody else's bundle loads it, and carries its own one-line kill switch.
  Not bloat; a decision.

## For other lenses

- **duplication**: `app/lab/chain-lines/page.tsx` clones ~167 lines of `houses-chain.tsx` across
  ~10 jscpd blocks; `lab/profiles/_chain-kit.tsx` clones the pill/measure core;
  `lab/profiles/_variant-letterhead-2/3.tsx` clone ~15 blocks of `letterhead-profile.tsx`
  (shipped file is source of truth; see Owner decisions).
- **bundle**: `lab/directory/_maps.tsx` inlines the same world-atlas JSON + d3 stack a second time
  for `/lab/directory` (908 KB route); `/welcome` at 1,062 KB likely carries the 50-bird SVG set
  via BirdAvatar plus the crop dialog - the F-01/F-02 dynamic-import pattern generalises.
- **shell-primitives**: the directory does NOT re-implement the filter kit - it imports
  FacetSelect/FacetSearchSelect/RangeFacetPill/FilterSheet/FilterButton/FilterPopover/SentenceLine
  from `components/common/filters` (directory-client.tsx:10-19). Confirmed from the consumer side.
- **security/bugs**: places/search has no length clamp on `q` before an ILIKE-contains over the
  unindexed altNames column (C-015 shape; F-08 fixes it as a side effect of the dedupe).
- **lab**: `lab/everything/_findings.ts:241` quotes the deleted `settings-form.tsx` as if live.
- **shell/naming**: `src/components/settings/` still exists as a directory (actions, crop dialog,
  dark-mode pieces) though the settings page is gone and the sidebar comment says "There is no
  settings page any more" - contents are live, the name is historical.
- **docs**: docs/spec/directory.md and profile.md both carry large superseded-but-kept headers;
  profile.md §1's superseded note still names profile-avatar.tsx as the live wrapper (stale after
  F-06).

## Metrics

- Lines read: ~11,440 across 56 territory files (+ test skims).
- Biggest files: letterhead-profile.tsx 1,981 (611 comment / 1,297 code); houses-chain.tsx 761
  (288/411); alumni-map.tsx 736 (211/487); directory-client.tsx 651 (96/525); profile/[id]/page.tsx
  467 (136/310); pen.tsx 456 (190/248).
- Comment-heaviest (ratio): directory/where.ts 1.02, place-input.ts 0.89, map-cluster.ts 0.85,
  pen.tsx 0.77, profile-actions.ts 0.72 - all dominated by audit-ID/owner-quote comments the brief
  protects.
- Route weight: /directory 1,212 KB route JS (app #1), /profile/[id] 1,206 KB (#2),
  /welcome 1,062 KB (#5).
- Dead code found: ~142 lines certain (F-04 ~117 incl. tests, F-07 ~50 minus overlap with
  export-keyword items); 4 removable dependencies; 185 lines relocatable (F-06).
- Estimated direct line saving if every autonomous finding lands: ~230; estimated client-JS
  saving on the two heaviest routes: ~150-200 KB (/directory) + 80-150 KB (stranger profile
  views), to be confirmed by one analyzer run.
