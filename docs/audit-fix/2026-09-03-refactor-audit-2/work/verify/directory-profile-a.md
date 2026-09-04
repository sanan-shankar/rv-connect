# directory-profile-a - adversarial verification notes

Verifier for cluster `directory-profile-a` (the directory, member profiles, the map, profession
tags). HEAD at time of verification: `74cc61a fix(retention): notifications are kept 30 days,
everywhere`. Working tree carried only `docs/audit-fix/README.md`, `progress.md` (modified) and
the untracked audit-2 folder -- no uncommitted edits in any source file I read.

Evidence sources: the tree at HEAD, `.scratch/audit2-build/.next/static/chunks/` (read-only),
and `work/raw/route-bundle-stats.json`, `knip-repo-config.txt`, `jscpd.txt`. No builds, no
browser, no database, per brief §2.

Ids checked: data-layer-10, dependency-diet-07, directory-profile-01, -02, -04, -07, -08, -09, -12.

---

## data-layer-10 - admin-people-query re-implements keyset - CONFIRMED WITH CORRECTION

What I verified:
- `src/lib/admin-people-query.ts:56` `const orderBy = [{ createdAt: "desc" }, { id: "desc" }]`;
  `:63` `...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})`; the recovery block is
  `:66-97` (comment `:66-79`, code `:80-97`).
- The docblock at `:42-44` does say "Keyset, not offset, following `loadPosts`". `loadPosts`
  (feed/actions.ts:1224-1233) genuinely uses `decodeKeyset`/`keysetWhere`/`encodeKeyset`, so
  the "follows loadPosts and then does not" claim is exact.
- `src/lib/keyset.ts:1-34` carries the measured proof (2026-08-24, Prisma 7 + adapter-pg) that
  a cursor row leaving the set answers 0 rows. Its `:26-27` carve-out names only the DIRECTORY
  ("sorts by name and by batch ... no timestamp key"); it does not carve out admin People,
  which sorts by `createdAt`. The proposal fits the file's own stated rule.
- `ROW_SELECT` does carry the two keyset columns: `createdAt: true` at `:36` and `id` via
  `AUTHOR_CARD_SELECT` -> `IDENTITY_SELECT` (`people-select.ts:35-40`). The finding said
  "confirm"; confirmed.
- Export route: `paged` generator at `:45-55` and `keyset(after)` at `:57-63`, with
  `cursor: { id: after }, skip: 1` at `:61`.

Corrections the fix session needs:
1. **The gate misses a pin.** `src/lib/profile-editor-rule.test.mjs:83` asserts
   `["src/lib/admin-people-query.ts", /Number\.isFinite\(loaded\)/, "the admin list's page offset"]`
   inside `test("C-174: every erased-type argument is checked before it is used")`. Deleting the
   `loaded` parameter and the recovery block makes `npm run check` RED. The C-174 row must be
   removed from that array in the same commit. The finding's "Risk & gate: low. npm run check"
   does not name it. (The sibling row for `src/app/(main)/directory/actions.ts` stays: the
   directory keeps its offset recovery by design, keyset.ts:26-27.)
2. **The export half is ten edits, not one.** `keyset(after)` is spread at route.ts lines
   146, 163, 172, 181, 200, 216, 238, 247, 256, 273, and each call site owns its own `where`
   (`{ userId }`, `{ authorId: userId, deletedAt: null }`, ...). The helper returns only
   `orderBy`/`take`/`cursor`, so `id: { gt: after }` has to be merged into ten separate `where`
   objects (or `keyset` has to start returning a `where` fragment the caller ANDs). The
   finding's "replace cursor/skip with `id: { gt: after }` in the where each fetchPage passes"
   reads like one edit.
3. Cited range `route.ts:46-64` is off by one at both ends; the real pair is `:45-63`.
4. Not a defect, but worth stating in the fix: the admin cursor's wire format changes from a
   bare `id` to `ms|id`. `loadPeoplePage` is reached only from
   `src/app/(main)/admin/people/actions.ts:60` and `(index)/page.tsx:34`, and the cursor is not
   persisted in a URL, so nothing outlives a reload. Safe, but say it.

Verdict: confirmed-with-correction. The diagnosis is right and the two files really do carry a
bug keyset.ts was written to end; the work is bigger than billed and one pin must move with it.

---

## dependency-diet-07 - declare `@types/d3-selection` - CONFIRMED

- `package.json` declares `@types/d3-geo ^3.1.0`, `@types/d3-zoom ^3.0.8`,
  `@types/geojson ^7946.0.16`, `@types/topojson-client ^3.1.5` in devDependencies, and
  `d3-geo`, `d3-selection`, `d3-zoom`, `topojson-client` in dependencies. There is no
  `@types/d3-selection` entry.
- `node_modules/@types/d3-zoom/package.json` dependencies =
  `{ "@types/d3-interpolate": "*", "@types/d3-selection": "*" }`. `node_modules/@types/d3-selection`
  exists on disk. So the types arrive transitively, exactly as claimed.
- `node_modules/d3-selection/package.json` has no `types`, no `typings`, and its `exports` are
  `{"umd":"./dist/d3-selection.min.js","default":"./src/index.js"}` -- no declarations of its
  own. Claim exact.
- One addition: there are TWO direct importers, not one. `src/components/directory/alumni-map.tsx:8`
  and `src/app/lab/directory/_maps.tsx:25`. Doesn't change the one-line fix, but the lab room
  would break in the same invisible way.
- The `geojson` not-finding checks out: both `geojson` imports (`alumni-map.tsx:11`,
  `_maps.tsx:29`) are `import type` and `@types/geojson` IS declared.

Verdict: confirmed.

---

## directory-profile-01 - take the owner's tools out of the stranger's profile chunk - CONFIRMED

Chunk evidence, re-measured against `.scratch/audit2-build`:
- `09q2-gmyvxbq5.js` = **46,227 bytes**, and `route-bundle-stats.json` lists it on exactly one
  route, `/profile/[id]`. All six cited strings are in it and only in it (except the two
  SavedPostsFeed strings, which also appear in `2hfdbjsl37kl7.js` / `3q6hon69raj9z.js`):
  "Everywhere you call home", "Delete my account", "Request your data", "Nothing saved yet",
  "Tap the ribbon on any post", "Add it to your phone".
- `3rtx8w7ngzlsd.js` = **38,752 bytes**, also `/profile/[id]`-only, and holds both
  get-in-touch's own copy ("chose to share these ways to connect", "Save contact") and the
  verify-dialog string "verified. Try that again". 38 modules in it.
- File sizes match the finding exactly: `letterhead-profile.tsx` 2,030 lines, `pen.tsx` 456,
  `saved-posts-feed.tsx` 233, `get-in-touch.tsx` 169.
- The audit-1 reasoning it quotes is real and at the cited place: `letterhead-profile.tsx:116-121`
  ("Split at the leaves rather than by extracting an 'edit half' ... a year of owner-tuned
  geometry lives in those pairings"). The five dynamic leaves are `:127-150`; the preload effect
  is `:419-426`; `const editable = Boolean(draft)` is `:362`; `draft` is passed only when
  `isOwnProfile` (`page.tsx:434-436`). Every structural claim I sampled held.
- Both named pins exist and are quoted correctly: `profile-editor-rule.test.mjs:68`
  (`/maxLength=\{FULL_NAME_MAX\}/` read out of `letterhead-profile.tsx`) and `:117-118`
  (C-045 slices from `function commitPlaces` in the same file). The finding's instruction to
  keep both in `letterhead-profile.tsx` is the right call.
- `get-in-touch.tsx:13-14` statically imports `VerifyEmailDialog` and `MemberVerifyDialog`;
  they render only under `lock === "email"` / `lock === "member"` at `:115-118`.

One nuance the fix session should hold, not a refutation of (b): the verify-dialog code appears
in ten chunks across the app (create-post-form, comments-section, collection contribute, three
catch-ups surfaces all import `useEmailGate`), so making it dynamic in `get-in-touch.tsx` does
NOT remove it from the app -- it removes it from `/profile/[id]`'s first load, which is real
because `3rtx8w7ngzlsd.js` is route-only and nothing else on the profile page pulls it
statically (post-card already loads `comments-section` via `next/dynamic`, `post-card.tsx:63-79`).

The 10-14 KB saving is an estimate the finding itself flags as unmeasured (the brief forbade a
build). I did not verify it and neither did the finder; the fix session must quote
before/after `firstLoadUncompressedJsBytes` for `/profile/[id]`.

Verdict: confirmed (diagnosis and every quoted location); the saving figure stays a projection.

---

## directory-profile-02 - load AlumniMap on demand - CONFIRMED WITH CORRECTION

- `191l0aock336-.js` = **67,946 bytes** (66.4 KB), and it contains `geoNaturalEarth1`,
  `scaleExtent` and `zoomIdentity`. Correct.
- **Correction:** `route-bundle-stats.json` puts that chunk on TWO routes, `/directory` **and**
  `/lab/directory` -- not "/directory only" as the Evidence line says. (The finding's own Notes
  paragraph mentions `/lab/directory` separately, so this is a wording slip, not a mistake in
  substance; the lab room is a second beneficiary, not a blocker.)
- `/directory` `firstLoadUncompressedJsBytes` = 1,260,200 = 1,230.7 KB. "1,231 KB" is right.
- Static import at `directory-client.tsx:23`
  (`import { AlumniMap, type CityPin, type PinPerson } from "./alumni-map"`); `grep -rn AlumniMap src`
  returns exactly one render site, `:742`, inside the `browseView === "map"` branch. The
  People-first rule is at `:123-125` (`initialFilters.q || initialFilters.year ? "people" : "map"`).
  `MAP_MIN_H = 360` is at `alumni-map.tsx:207` and used at `:717` -- the loading box the finding
  prescribes is buildable from the real constant.
- No test pins the import: `directory-rule.test.mjs:20-21` reads both files as text, and its
  assertions are on `cities: string[]`, the `!namesLocked && drill?.href &&` guard, and the
  Profession gate. None names an import statement.

**Gate correction the finding undersells.** `e2e/visual.spec.ts:32` runs `/directory` with
`live: "map"`, and `liveRegions()` at `:194` masks `page.locator("main svg.touch-none")`. With
`ssr: false` there is no `svg` in the server HTML, so at screenshot time the mask can resolve to
zero elements -- either the placeholder box is compared unmasked, or a half-hydrated map is. The
fix session should expect `/directory` to go red on both viewports, open `visual:report`, and
only then decide between `visual:update` and adding a `waitFor` on the svg. "npm run visual on
/directory both viewports" is in the gate; the mask mechanics are not, and that is the part that
will eat an hour.

Verdict: confirmed-with-correction.

---

## directory-profile-04 - the profession vocabulary ships to the client - CONFIRMED

Measured directly out of `0kinxjn443emk.js` (30,755 bytes, `/directory`-only per
route-bundle-stats):
- The minified `PROFESSION_TAGS` literal runs 5,106 -> 7,336, i.e. **2,230 bytes**, of which the
  seventeen `hint:"..."` strings are **1,402 bytes**. "roughly 2 KB raw" is accurate.
- Both quoted hints are verbatim in the chunk ("Engineering that is not software: civil,
  mechanical, electrical, manufacturing.", "Medicine, nursing, public health, veterinary, mental
  health...", "Still in full-time education...").
- `TAG_RULES` is absent (0 matches) -- the finding's tree-shaking claim holds.
- Extra, and it strengthens the finding: the chunk also evaluates and discards
  `P.map(e=>e.value)` (`TAG_VALUES`) and `Object.fromEntries(P.map(e=>[e.value,e.parent]))`
  (`TAG_PARENTS`). Only `T = Object.fromEntries(P.map(e=>[e.value,e.label]))` is read.
- The false comment is at `page.tsx:296-301` as claimed; the single client use is
  `directory-client.tsx:323` `label: tagLabel(initialFilters.profession)`.
- The pin is exactly where the finding says: `directory-rule.test.mjs:307-311`,
  `/label: tagLabel\(initialFilters\.profession\)/` against CLIENT, with a comment explaining
  the chip is deliberately outside the Profession gate. Moving it is mandatory, and the
  replacement assertion must keep the "a bookmarked ?profession= below the floor still draws a
  clearable chip" property the comment protects.

Verdict: confirmed.

---

## directory-profile-07 - `HOUSE_OPTIONS` is dead; directory-facets.ts has one consumer - CONFIRMED WITH CORRECTION

- `grep -rn HOUSE_OPTIONS src scripts e2e prisma` returns exactly one line: its own definition
  at `src/lib/directory-facets.ts:14`. knip agrees (`raw/knip-repo-config.txt:71`).
- `git log -S HOUSE_OPTIONS -- src/components/directory/directory-client.tsx` names `37e6f32
  feat(directory): one chrome row, search on the title line, Profession for House` as the commit
  that removed the last consumer. Exact.
- `TYPE_OPTIONS` has one importer, `directory-client.tsx:18`, used at `:354` and `:465`. The
  name collision with `src/lib/admin-content.ts:19` is real.
- The file is 19 lines, 9 of them the header.

**Correction, in the finding's favour: it undercounts the saving.** `HOUSE_OPTIONS` is not merely
dead source -- it SHIPS. In `33-d60cn80mq0.js` (17,230 bytes, `/directory`-only) the build emits
`e.i(437404).HOUSES.map(e=>({value:e,label:e}));` with the result discarded, and module `437404`
is `src/lib/houses.ts` (the 22 house names, the alias map, `normalizeHouse`), occupying roughly
1,077 bytes at the tail of that chunk. `directory-facets.ts:11` is the **only** importer of
`@/lib/houses` anywhere in the `/directory` client graph (the other importers are the profile
house-chain editor, the common house picker, onboarding and a lab room). So deleting
`HOUSE_OPTIONS` also drops houses.ts off `/directory`'s first load: ~1 KB raw client JS on top of
the source cleanup.

Second correction, against it: "1 file, 19 lines" overstates. `TYPE_OPTIONS` relocates (4 lines
plus the sentence the finding wants kept), so net source is ~13-15 lines, not 19.

Overlap: **dead-code-03** ("Delete `SortPill` and `HOUSE_OPTIONS`") covers the same
`HOUSE_OPTIONS` deletion plus `SortPill` in `facet-select.tsx`. The two agree; they are not in
conflict. dead-code-03 is the narrower, safer step (delete the export and its `HOUSES` import,
nothing moves); directory-profile-07 additionally deletes the file and relocates `TYPE_OPTIONS`.
Recommend doing them as one commit with dead-code-03's deletion first, because if the fix session
takes only half, the half worth having is the deletion -- the relocation is taste.

Verdict: confirmed-with-correction.

---

## directory-profile-08 - the directory person type is written four times; `workplace` is fetched and never drawn - CONFIRMED

- The four shapes are at the exact cited lines: `select.ts:15-22` (`PERSON_SELECT`, with
  `workplace: true` at `:21`), `actions.ts:10-22` (`DirectoryUser`), `directory-client.tsx:28-39`
  (`interface User`), `profile-card.tsx:44-57` (inline props). `page.tsx:23-34` is `PinRow`, a
  hand copy of `PIN_SELECT`'s shape. Counting `PinPerson` (`alumni-map.tsx:29-45`) it is really
  five, which the finding acknowledges as a legitimate fifth.
- `grep -rn DirectoryUser src` returns three lines, all inside `actions.ts` plus one comment in
  `select.ts`. It has no importer -- confirmed.
- `workplace`: selected at `select.ts:21`, declared at `actions.ts:21`, and read by **no**
  renderer. The only other occurrences under the directory are `where.ts:76`
  (`{ workplace: { contains: q, ...insensitive } }`), which is a WHERE predicate and needs no
  select, and three prose comments. Dropping the column is safe.
- The false comment is real: `select.ts:17-18` says `currentCity` is "fetched to satisfy a type
  rather than a pixel", but `profile-card.tsx:68` renders it
  (`user.currentCity ? shortPlaceLabel(user.currentCity) : null` inside `metaLine`).
- jscpd backs the clone triple at `raw/jscpd.txt:644-650`, with the exact ranges quoted.
- `PERSON_SELECT` has two consumers (`page.tsx:289`, `actions.ts:56` and `:84` -- note it is
  used TWICE in actions.ts, once in the recovery path), `PIN_SELECT` one (`page.tsx:302`).
  Nothing outside the directory imports either, so the type refactor is contained.
- No pin names any of these types; `directory-rule.test.mjs` reads `page.tsx` for
  `cities: [city]` / `existing.cities.includes(city)`, both untouched.

Verdict: confirmed.

---

## directory-profile-09 - `otherCities` is computed and read by nothing - CONFIRMED

- `grep -rn otherCities src` returns four lines, not five: `page.tsx:90` (inside the comment),
  `:125` (`const otherCities = allMappedCities.filter(...)`), `:129` (the field on `PinPerson`),
  and `alumni-map.tsx:45` (the optional type field, with its comment at `:41-44`). The finding
  counted `page.tsx:113` (`allMappedCities`) as a fifth; that is a different identifier, but it
  is used ONLY at `:125`, so it dies with `otherCities` and the delete list is right.
- The type comment says verbatim "Kept for matching only; the drilldown no longer displays an
  'Also in ...' line (owner call, 2026-07)" and there is no matching code anywhere -- confirmed.
- The B-092 payload note the finding leans on is at `page.tsx:132-141` and is exactly about
  everything in `people` being serialized into the RSC payload of every load and filter change.
- C-098's pin is about `cities` (the pin's cell list), not `otherCities`: `directory-rule.test.mjs:169`
  asserts `/cities: string\[\]/` against MAP. Deleting `otherCities` leaves it green.

Verdict: confirmed.

---

## directory-profile-12 - own-profile views build a Photos grid for a tab that is not there - CONFIRMED

- `grep -n "photos\b\|photoPosts"` on `src/app/(main)/profile/[id]/page.tsx` returns exactly
  five lines: `:187` (the `findMany`), `:193` (the flatten), `:353` and `:355` (inside
  `photosNode`), `:408` (`photoCount={photos.length}`). Nothing else -- no metadata, no OG image.
- `letterhead-profile.tsx:1884-1891`: `TABS` ends with
  `isOwnProfile ? { key: "saved", ... } : { key: "photos", count: photoCount }`. The only reader
  of `photosNode` is `:1936-1937` under `{tab === "photos" && ...}`, and `tab` can only be set
  from a `TABS` button, so on your own sheet "photos" is unreachable. `savedCount` feeds
  `<SavedPostsFeed>` at `:1948`.
- The query is `await`ed on its own at `:187`, outside the `Promise.all` at `:180-184`, so it
  costs a separate round trip, not a parallel one. That makes the saving slightly better than
  billed.
- Small range corrections: the query block is `:186-195` (finding said 186-196) and `photosNode`
  is `:352-370` (said 351-372).

Verdict: confirmed.

---

## Cross-cutting notes for the report writer

- Three findings all touch `src/components/directory/directory-client.tsx`
  (-02 the import at `:23`, -04 the import at `:19`, -07 the import at `:18`) and two touch
  `src/app/(main)/directory/page.tsx` (-04 adds `professionLabel`, -08/-09 change the selects and
  the pin builder). They do not conflict, but they should be sequenced in one lane, not handed to
  parallel sessions: -07 then -04 then -08 then -09 then -02, cheapest and least testable first.
- Two `directory-rule.test.mjs` assertions move as part of this cluster: the `tagLabel` chip pin
  (-04) and nothing else. One `profile-editor-rule.test.mjs` assertion must be DELETED (data-layer-10,
  the C-174 admin row). Nobody outside this cluster should touch those two files in the same window.
- `/profile` is not in `e2e/visual.spec.ts` ROUTES, so -01 and -12 have no baseline safety net --
  they are hand-verification items at 1440 and 390, as Jerry and as a stranger to Jerry.
