# directory-profile - refactor audit 3 report

Territory T05, 2026-09-24, HEAD `70570bcd`. The directory (page, where builder, select, Load-more
action, grid, card, map, clustering, geocoding fallback, city facets, profession facet), the profile
(page, letterhead, pen, houses chain and its editor, contacts editor, calling card and .vcf, author
and saved feeds, admin and flag tools, the stray-hair prank, the loading sheet), the pick-bird flow
(T10 owns the bird art), the three people/place lookup routes (T12 owns their gate shape), the
directory/profile lib files and their rule tests, and `public/geo`. Audit-only: nothing was changed.
Files in territory: 51 (44 source + the 2 charter-named rule tests + 5 adjacent lib tests); read
fully: 48 (every source file, both rule tests, `houses.test.mjs`, `house-spans.test.mjs`); the
other three tests were read for their imports and test names only (see Coverage).

## Coverage
- Read fully: `src/components/directory/{directory-client,directory-grid,profile-card,alumni-map}.tsx`;
  `src/components/profile/{letterhead-profile,letterhead-sheet,get-in-touch,houses-chain,
  house-chain-editor,pen,profile-actions,contacts-editor,saved-posts-feed,profile-author-feed,
  admin-profile-tools,flag-person-dialog,admission-stamp,stray-hair}.tsx|ts` and `stray-hair-ids.ts`;
  `src/app/(main)/directory/{page,loading,actions,where,select}.ts(x)`;
  `src/app/(main)/profile/[id]/{page,loading}.tsx`; `src/app/(main)/pick-bird/{page,loading}.tsx`;
  `src/app/(main)/birds/page.tsx` (T10's, 50 lines, read anyway);
  `src/app/api/places/search/route.ts`, `src/app/api/users/search/route.ts`,
  `src/app/api/users-by-batch/route.ts`; `src/lib/{city-coords,city-scope,place-input,geocode,
  map-cluster,houses,house-spans,contact-rows,profession-tags,phone,search-log}.ts`;
  `src/lib/{directory-rule,directory-where,houses,house-spans}.test.mjs`.
- Read as context (not my territory, read because my files call them): `src/lib/place-write.ts`,
  `src/lib/vcard.ts`, `src/lib/member-gate.ts`, `src/lib/people-select.ts`, `src/lib/image-cdn.ts`,
  `src/lib/validators.ts:140-207` (`profileSchema`, `contactMethodsSchema`),
  `src/components/mascot/moments/celebration-signals.tsx:20-60`,
  `src/components/admin/people/person-detail.tsx:360-445`,
  `src/components/common/location-picker.tsx:140-200`, `src/components/settings/avatar-upload.ts`
  (grep), `src/app/(main)/admin/people/actions.ts` (revalidation lines), the Next 16 guide
  `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, `prisma/schema.prisma`
  (Place/UserPlace), `prisma/migrations-manual/2026-07-18-round6.sql` and
  `2026-08-21-gazetteer-trigram.sql`; audit 2's `work/agents/directory-profile.md`, report and
  fix-prompt for carry-over state.
- Specs read: `docs/spec/directory.md`, `docs/spec/profile.md`, `docs/spec/person-row-audit.md`
  (all in full); `docs/spec/avatars.md` skimmed (charter says skim); `docs/spec/admin.md:440-455`.
- Skimmed (why): `src/lib/{map-cluster,place-input,profession-tags}.test.mjs` - imports and test
  names only; each pins a pure function I read in full and none is touched by a finding here.
  `public/geo/countries-110m.json` - one line of TopoJSON; inspected structurally with `node -e`
  (objects, arc count, gzip size), not read.
- Not read (why): nothing in the territory.
- Uncommitted edits seen (someone else's WIP): none. `git status --short` over every territory path
  was empty at session start; the only untracked paths in the tree are the two audit folders.

## Summary
The territory is mature, heavily fixed code (three audits, two bug audits) whose comment mass is
mostly the product - audit ids, owner quotes, measured numbers - and I found very little of the
narrate-the-next-line kind. The structural well is not dry, but it is small-bore: the biggest wins are
runtime, not lines. **(1) Every autosave on your own profile renders the page twice** - the pen calls
`router.refresh()` after server actions that already `revalidatePath` the same page, which Next 16
answers in the action's own response (-01, ~19 statements and one RSC payload per save). **(2) A
stranger's Photos tab downloads up to 60 full-size 1,920 px originals into ~250 px tiles, all at
once** - the one member-facing `<img>` in the territory that bypasses the `photoSrc` ladder the feed
and letters use (-02). Then placeholders: an API response shape nobody has asked for since Groups
were retired (-03), a profile fallback unreachable since the July backfill (-05), eleven `profileSchema`
fields nothing parses (-07), the directory's never-linked `?cursor=` SSR path (-08); and two
redundant reads (-06, -09). Split: 12 structural, 5 cheap. What surprised me: the charter's lead
"two Post COUNTs per profile view" is **misattributed** - those two statements are the feed's
`CelebrationSignals`, and the profile has run one `groupBy` since 2026-09-05; and that component's
"profile complete" moment can never fire because it requires the retired `User.bio` (For other
lenses). No N+1 exists in the directory: it issues 8 concurrent reads plus one batched
`UserPlace ... IN (...)` per render. Audit 2's G3 (the letterhead's edit-only trunk) is parked by
the owner and unchanged; its `-26` batch is still entirely open; its B7/B13/C1/D8/E11/E12 rows in
this territory all shipped and held.

## Findings

### directory-profile-01 - Stop rendering your own profile twice on every autosave
- **Where**: `src/components/profile/letterhead-profile.tsx:442-460` (`function commitField`,
  `router.refresh();` at :456), `:478-485` (`function commitHouses`, `if (!("error" in result))
  router.refresh();` :482), `:491-498` (`function commitContacts`, `if (!result.error)
  router.refresh();` :495), `:415` (`useAvatarUpload({ onSaved: () => router.refresh(), ...})`),
  optionally `:462-476` (`function commitPlaces`, unconditional refresh :473, pinned). The actions
  they call all revalidate the page being edited: `src/components/profile/profile-actions.ts:250`
  (`updateProfileField`, ``revalidatePath(`/profile/${session.user.id}`)``) and `:348`
  (`updateContactMethods`); `src/components/onboarding/actions.ts:140` (`saveOnboardingHouses`);
  `src/components/settings/actions.ts:54` (`updateUserPlaces`), `:137` (`updateAvatar`), `:159`
  (`removeAvatar`). Same shape in `src/components/profile/admin-profile-tools.tsx:147` and `:167`
  (`router.refresh()` after verify/unverify and block/unblock), whose actions revalidate
  `/profile/${userId}` at `src/app/(main)/admin/people/actions.ts:42-43`.
- **Phase**: rewrite
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the Next 16 guide shipped in this repo,
  `node_modules/next/dist/docs/01-app/02-guides/server-actions.md:41-45`: "Your application code
  does not need a follow-up fetch to see the updated UI for the current page. A re-render is
  included in the same response when the action does any of these: Calls `updateTag` or
  `revalidatePath` ..."; and :150, "When `updateTag`, `revalidatePath`, or `refresh` runs, Next.js
  re-renders the current route server-side and includes a newly rendered RSC Payload in the
  action's response". Every one of the five actions above revalidates `/profile/<own id>`, which is
  the page the pen is on, so the POST already brings the fresh page back; the `router.refresh()`
  after it fetches the same page a second time. Audit 2's campaign measured `/profile/[id]` at 19
  statements per render (fix-prompt, phase C row: "`/profile/[id]` 25 -> 19"). The pen commits on
  every blur (`pen.tsx:189`, `:305`), which the letterhead's own comment calls "the commonest thing
  anyone does on this page" (`letterhead-profile.tsx:418-420`).
- **What to do**: (1) `commitField`: keep `saved.current[key] = value;`, delete `router.refresh();`.
  (2) `commitHouses`: delete the refresh line; keep the `return "error" in result ? ... : undefined`.
  (3) `commitContacts`: delete `if (!result.error) router.refresh();`. (4) `useAvatarUpload`: pass
  `onSaved: () => {}` from the letterhead, or make `onSaved` optional in
  `src/components/settings/avatar-upload.ts:31-35` (the onboarding photo step,
  `photo-step.tsx:41`, passes `setPhotoUrl` and keeps it). (5) `commitPlaces`: either leave it
  (it is the rarest save), or change it to `if (result.error) router.refresh();` - a refused
  wipe-and-recreate is the one case where the action does not revalidate, and the C-045 pin
  (`src/lib/profile-editor-rule.test.mjs:120-130`) still passes: its regex wants `router.refresh();`
  in the body and forbids only `if (!result.error) router.refresh()`. (6) In `admin-profile-tools.tsx`
  drop the two refreshes; keep `window.location.href = "/directory"` after delete (:187), which is a
  navigation away from a deleted member, not a refresh. `useRouter` stays wherever something still
  uses it.
- **Saving**: one full `/profile/[id]` server render (~19 DB statements) and one RSC payload
  download per successful autosave on your own profile, and per admin verify/block on someone
  else's; ~6 lines.
- **Risk & gate**: low-medium. Prove it before and after in chrome-devtools on your own profile as
  Jerry Maguire: blur a changed field and count network entries - today one action POST plus one
  `?_rsc=` GET; after, the POST alone - then confirm the read-only occupation line, the facts row
  (pen away), the houses chain after a pick, the contact rows after removing a phone, and a photo
  upload and removal (the circle and the perched bird swap on `user.photoUrl`). `npm run check`
  (`profile-editor-rule.test.mjs` C-045, `composer-rule.test.mjs` B-049 `function commitContacts(next?`).
  `/profile` is not a visual-suite route, so screenshot 1440 and 390 by hand.
- **Confidence**: medium-high. What would change my mind: a network trace in which the action
  response does not carry the tree (for instance if `callAction` dispatches in a way that skips the
  router's action reducer). Measure first; the change is one line per handler either way.
- **Notes**: the pen's local state (`form`, `places`, `houses`, `contactRows`) is seeded once from
  `draft` in `useState` initialisers and never re-synced from props, so the second render never fed
  the editor anything: what it refreshes is the read-only half, which the first render already did.
  The pattern is probably app-wide: there are 32 non-lab `router.refresh()` calls (grep), and any that
  follows an action revalidating the current route is the same double render - For other lenses
  (api-actions-crons, runtime-perf). Related: -06 (the same save also reads the row up to three
  times).

### directory-profile-02 - Serve the profile's Photos grid through the photo ladder, lazily, instead of 60 full-size originals at once
- **Where**: `src/app/(main)/profile/[id]/page.tsx:376-395` (`// ---- Photos tab content ----`,
  `const photosNode = ...`, `{/* eslint-disable-next-line @next/next/no-img-element */}` at :386,
  `<img src={ph.src} alt="" className="aspect-square h-full w-full object-cover ...">` at :387-391);
  the query that feeds it `:216-226` (`take: 60`, `parseJsonArray(p.images)`); rendered when the tab
  is opened at `src/components/profile/letterhead-profile.tsx:1953-1963` (`tab === "photos"`).
  Compare the feed `src/components/posts/post-card.tsx:594-595` and letters
  `src/components/letters/letter-images.tsx:42-43`, which pass the same stored URLs through
  `photoSrc()` / `photoSrcSet()` (`src/lib/image-cdn.ts:73-85`).
- **Phase**: rewrite
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `ph.src` is the stored post image, and `image-cdn.ts:33-35` says what that is:
  "`toDisplayWebp` boxes every feed/letter upload to 1920 on the long edge". The grid is three
  columns in the centered column (at most 768 px, `grid-cols-3 gap-2.5`), so a tile is ~249 CSS px on
  a laptop and ~110 px on a 390 px phone: the browser downloads a 1,920 px file for a slot that needs
  ~500 px at 2x. There is no `loading="lazy"`, so opening the tab starts every one of up to 60
  downloads at once. The bundle lens's image sweep names only the Catch-up picker as bypassing the
  ladder, from the `<img>` sites it opened; this one was not among them, and no other report or
  `docs/planning/bugs.md` mentions it (grep: "photosNode", "Photos tab", "ph.src").
- **What to do**: in `page.tsx` import `photoSrc` from `@/lib/image-cdn` and render
  `<img src={photoSrc(ph.src)} alt="" loading="lazy" decoding="async" className=...>`. Optionally add
  `srcSet={photoSrcSet(ph.src)}` with a `sizes` that states the tile (`"(max-width: 767px) 33vw,
  250px"`); the smallest rung is 750 px, which already covers a 250 px tile at 3x, so `src` alone is
  enough. Keep the eslint-disable line (it is still a raw `<img>` by the file's documented doctrine:
  a URL, not `next/image`). No layout change: `aspect-square object-cover` sizes the tile, not the file.
- **Saving**: on a Photos tab with N photos, from N x a 1,920 px WebP to only the on-screen tiles x
  the 750 px rung (roughly 4-6x fewer bytes per image, and with lazy loading typically 9-15 images
  instead of N). I could not measure absolute KB (no database, no R2): the fix session should open a
  profile of someone with 12 or more photos and read the transferred total before and after.
  0 lines. No new optimizer source images: every photo in this grid is already a feed photo the
  optimizer serves at the same `w=750` URL, which matters because the owner does not want to be
  billed for image transformations (`image-cdn.ts:21-30`).
- **Risk & gate**: low. Open someone else's profile as Jerry, press Photos, watch the network panel
  (requests are `/_next/image?url=...&w=750`, and only the visible ones load until you scroll); check
  a 390 px phone. `npm run check`. Your own profile never builds this grid (`page.tsx:216`).
- **Confidence**: high on the diagnosis; medium on the size of the win until measured.
- **Notes**: the tiles link to `/feed#<postId>`; unchanged. If the owner ever wants the grid to open
  the image viewer instead, that is a feature, not part of this.

### directory-profile-03 - Collapse `/api/users-by-batch` to the one response shape anything asks for
- **Where**: `src/app/api/users-by-batch/route.ts:25-33` (the `detail` flag and its two-shape early
  return), `:42-45` (`select: detail ? {...IDENTITY_SELECT, batchYear} : { id: true }` and the
  conditional `orderBy`), `:53-54` (`if (detail) return ...{ users }` / `{ userIds }`). The only
  shipped caller: `src/components/catchups/create/people-picker.tsx:110`
  (`/api/users-by-batch?detail=1&batches=${myBatchYear}`).
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the flag's own comment says "Opt-in so the default `{ userIds }` shape existing
  callers depend on is untouched". That caller was `src/components/groups/create-group-form.tsx:80`
  (`git grep users-by-batch 063896c0^ -- src`), and it stopped calling in the same commit that added
  the flag (`063896c0`, 2026-07-25, "retire Groups"; `git grep users-by-batch 063896c0 -- src`
  finds only the people picker). Two months with no consumer of the bare-id shape. The QA probes do
  not need it either: `scripts/qa/phase6-probe.mjs:123` passes `detail=1`; `phase3-probe.mjs:162`
  asserts only a Stage-0 403 (and sends `?year=`, a param the route never reads).
- **What to do**: delete `detail` and both shapes' ternaries; always
  `select: { ...IDENTITY_SELECT, batchYear: true }`, `orderBy: { name: "asc" }`, `take: 5000`, and
  return `{ users }` (the empty case `{ users: [] }`). Leave `detail=1` in the picker's URL or drop it
  (an ignored param either way). Keep `take:` - `scripts/qa/audit-status.mjs:282-285` (H18) greps
  for it.
- **Saving**: ~8 lines; one response shape instead of two; no DB change.
- **Risk & gate**: low. `npm run check`; in the app, "Add my batch" on `/catchups/new` as Jerry
  still adds the batch. T12 (api-actions-crons) owns this route's gate shape; this touches none of
  it (`vetLookupRequest` stays first).
- **Confidence**: high.
- **Notes**: considered turning the route into a server action (one caller, a read); rejected -
  audit 1 settled that the three lookup endpoints stay, and this one's value is that it is gated by
  the same `vetLookupRequest` as its siblings.

### directory-profile-04 - Derive the map's person type from `PIN_SELECT`, and stop sending a city the drilldown never draws
- **Where**: `src/components/directory/alumni-map.tsx:31-42` (`export type PinPerson = { id; name;
  photoUrl; birdOverride?; accountType?; verifyState?; batchType; batchYear; currentCity; jobTitle }`,
  hand-written); `src/app/(main)/directory/page.tsx:63-74` (`const base = { id: u.id, name: u.name,
  ... jobTitle: u.jobTitle }`, the same nine fields copied by hand), `:109`
  (`const person: PinPerson = { ...base, currentCity: city }`), `:134`
  (`unmappedPeople.push({ ...base, currentCity: null })`); `src/app/(main)/directory/select.ts:47-57`
  (`PIN_SELECT`, `PinRow`). The only reader of a `PinPerson`: `alumni-map.tsx:834-850` (the
  drilldown row: `id`, `name`, `photoUrl`, `birdOverride`, `batchLine(p)`, `p.jobTitle`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `currentCity` is set on every pin person and read by nothing (`grep currentCity
  alumni-map.tsx` finds only the type; `directory-client.tsx` passes the arrays through): the
  drilldown's title already names the pin's city. `verifyState` rides along from
  `AUTHOR_CARD_SELECT` (it is in the live pins statement's column list, `raw/db-statements-live.json`
  #70) and is also not drawn - the row builds `IdentityRow`'s user from four fields and no leaf.
  The hand-written `PinPerson` is the same drift audit 2 closed for `DirectoryPerson` (its `-08`,
  E12: "hand-written four times"), and it has already drifted: three fields are optional in the type
  and always present in the data.
- **What to do**: in `alumni-map.tsx` replace the type with
  `import type { PinRow } from "@/app/(main)/directory/select"; export type PinPerson = Omit<PinRow,
  "places">;` (type-only import from a server module is how `directory-client.tsx:24-28` already
  names `DirectoryPerson`). In `page.tsx` `buildPins`, replace `const base = {...}` with
  `const { places, ...base } = u;` and loop `for (const place of places)`; push `base` itself at
  :109 and :134 (no `currentCity`). Leave `verifyState` in `PIN_SELECT`: `people-select.ts:11-19`
  argues against selects that omit it, and whether the drilldown should draw the verified leaf the
  directory card draws is the person-row sweep's call (`docs/spec/person-row-audit.md` §4), not
  this finding's.
- **Saving**: ~20 lines; one hand-kept field list gone; `currentCity` (~30 bytes) off every person
  in every pin and the unmapped list in the RSC payload of every directory render and filter change.
- **Risk & gate**: low. `npm run check` (`directory-rule.test.mjs` C-098 reads `page.tsx` for
  `cities: [city]` and `existing.cities.includes(city)` - untouched); `/directory` is a visual route
  (its map is masked, `live: "map"`), open a pin's drilldown and the "Not yet on the map" sheet.
- **Confidence**: high.
- **Notes**: if -10 lands first, do this inside the moved `buildPins`.

### directory-profile-05 - Delete the profile's "migration window" city fallback, unreachable since the July backfill
- **Where**: `src/app/(main)/profile/[id]/page.tsx:228-237` (`// Cities: all UserPlace cities,
  equal, ordered. Fall back to the legacy columns only while places is still empty (migration
  window).`, two ternaries over `[user.currentCity, user.secondaryCity]`).
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the migration window closed on 2026-07-18: `prisma/migrations-manual/2026-07-18-round6.sql:60-72`
  seeded a `UserPlace` row from every non-empty `currentCity` (position 0) and `secondaryCity`
  (position 1). Since then every writer goes through `replaceUserPlaces`
  (`src/lib/place-write.ts:53-75`), which writes the list and mirrors `legacyCityColumns(cleaned)`
  (`src/lib/place-input.ts:215-222`) in the same transaction - so the legacy columns are null exactly
  when the list is empty. The branch can only fire for a row whose legacy columns were written
  without the list, and no writer does that any more (the whole-form `updateUserProfile` that could
  was deleted in audit 1, see `profile-actions.ts:6-13`).
- **What to do**: run this against production AND the demo first:
  `SELECT count(*) FROM "User" u WHERE (nullif(btrim(u."currentCity"),'') IS NOT NULL OR
  nullif(btrim(u."secondaryCity"),'') IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM "UserPlace" p
  WHERE p."userId" = u.id);`. If it returns 0, replace the two ternaries with
  `const cities = user.places.map((p) => p.city); const cityLabels = user.places.map((p) => p.label);`
  and delete the comment. Update the rationale comment of `src/lib/place-input.test.mjs:157-178`
  ("The profile falls back to [currentCity, secondaryCity] ...") - the assertion stays, because the
  directory card and the feed rail still read `currentCity`.
- **Saving**: ~8 lines; one code path nobody can reach.
- **Risk & gate**: low if the SELECT is 0 (if not, run the same repair the backfill ran for those
  rows first). `npm run check`; open a profile with two cities and one with none.
- **Confidence**: high on the code, pending the SELECT.
- **Notes**: this touches no data and no column; the columns themselves are Owner decision B. The
  owner ruled on 2026-09-07 that members' cities in these columns are not to be touched
  (audit-2 fix-prompt Q18 reading); nothing here does.

### directory-profile-06 - `updateProfileField`: read the member's row once per save, and write the field list once
- **Where**: `src/components/profile/profile-actions.ts:188-197` (year saves: `prisma.user.findUnique`
  for batchYear, yearJoined, yearLeft, taughtFrom, taughtUntil), `:212-223` (teacher fields: a
  second `findUnique` for `accountType`), `:228-238` (batchYear/yearLeft: a third `findUnique` for
  batchYear, yearLeft); `:58-84` (`const EDITABLE_FIELDS = new Set<string>([...11 names])`) and
  `:86-97` (`export type ProfileField = "name" | ... 11 names`), with the comment at :70-71 "Kept in
  step with the ProfileField union above by hand".
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: a `yearLeft` or `batchYear` save reads the row twice for overlapping columns
  (the clash check, then the batchType derivation); a `taughtFrom`/`taughtUntil` save reads it twice
  (the clash check, then the account type). All three reads select subsets of one row by the same
  primary key within one action. And the two field lists are identical today; the comment admits
  they are synchronised by hand.
- **What to do**: (a) before the `switch`, when `field` is a year or teacher field, do one
  `const row = await prisma.user.findUnique({ where: { id: session.user.id }, select: { batchYear:
  true, yearJoined: true, yearLeft: true, taughtFrom: true, taughtUntil: true, accountType: true } })`
  and use it in all three places (the clash check spreads `{ ...row, [field]: n }` exactly as now;
  `rowIsTeacher` and the batchType derivation read the same object). (b) Replace the Set and the
  union with `const PROFILE_FIELDS = ["name", ..., "taughtUntil"] as const; export type ProfileField
  = (typeof PROFILE_FIELDS)[number]; const EDITABLE_FIELDS = new Set<string>(PROFILE_FIELDS);` -
  a non-exported const and an exported type are both legal in a `"use server"` file. Keep the literal
  `EDITABLE_FIELDS.has(field)` before `prisma.user.update`.
- **Saving**: 1 query per year or tenure save (2 -> 1 for batchYear, yearLeft, taughtFrom,
  taughtUntil); ~20 lines; one hand-synchronised list gone.
- **Risk & gate**: low. `npm run check` - pins that must stay green:
  `src/lib/security-regressions.test.mjs:189-201` (M1: `EDITABLE_FIELDS\.has\(field\)` before
  `prisma\.user\.update`), `src/lib/profile-editor-rule.test.mjs` (>= 5 `outsideSchemaBound(` calls,
  `typeof raw !== "string"`), `src/lib/batch-year.test.mjs:95` (`yearClashMessage(` still called),
  `gate-coverage.test.mjs` (the `auth()` preamble). On your own profile: type a leaving year before the
  joining year (refused with the clash sentence), clear a teacher's until-year (byline flips to
  Teacher), change batch and leaving year (the ICSE/ISC line re-derives).
- **Confidence**: high.
- **Notes**: considered folding the batchType derivation into `yearClashMessage`'s module; rejected,
  the two rules are unrelated and one read is the whole win.

### directory-profile-07 - Drop the eleven `profileSchema` fields nothing validates any more
- **Where**: `src/lib/validators.ts:142-183` (`export const profileSchema = z.object({...})`): the
  fields `bio` (:151), `displayEmail` (:156), `currentCity` (:157), `secondaryCity` (:158), `phone`
  (:163), `phones` (:167), `instagram`, `linkedin`, `facebook`, `links` (:168-171) and `accountType`
  (:172). Its only runtime consumer: `src/components/profile/profile-actions.ts:52-56`
  (`outsideSchemaBound`, which indexes `profileSchema.shape[field]` for the eleven pen fields).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn profileSchema src` finds the definition, `profile-actions.ts` (the bound
  helper plus comments) and two comments in `admin/people/actions.ts:77,137`. Nothing calls
  `profileSchema.parse`/`safeParse`: the whole-form writer that did (`updateUserProfile`) was deleted
  unused in audit 1 (`profile-actions.ts:6-13`). The contact fields are re-declared, with the same
  bounds, in `contactMethodsSchema` (`validators.ts:190-207`), which is the schema that actually runs
  on those columns. `bio` has no writer at all (`src/lib/admin-analytics.ts:856`: "The old `bio`
  column is retired").
- **What to do**: delete those eleven keys from `profileSchema`, leaving `name`, `about`,
  `workplace`, `jobTitle`, `batchYear`, `yearJoined`, `yearLeft`, `admissionNumber`, `taughtFrom`,
  `taughtUntil`, `subjects` - exactly `EDITABLE_FIELDS`. Keep the literals
  `profile-editor-rule.test.mjs:56-64` asserts (`workplace: z.string().max(100)`, `jobTitle:
  z.string().max(100)`, `admissionNumber: z.number().int().min(0).max(10000)`, `batchYear: yearField({
  ahead: 7`). Consider renaming it `profileFieldBounds` with a one-line docblock saying it is the
  pen's per-field bound table - optional; the tests read it by name, so a rename moves two pins.
- **Saving**: ~25 lines; one schema describing a form that no longer exists.
- **Risk & gate**: low. `npm run check` (`profile-editor-rule.test.mjs`, `email-normalization-rule.test.mjs`
  reads `validators.ts` for `emailField(` - still used by `contactMethodsSchema`).
- **Confidence**: high.
- **Notes**: `validators.ts` belongs to another territory (lib-core-config by elimination); I list it
  here because the only consumer is my file and the dead half exists because my territory's writer
  was deleted. The orchestrator should dedupe against that lens.

### directory-profile-08 - Hand the directory's applied filters through unchanged, and delete the never-linked `?cursor=` path
- **Where**: `src/app/(main)/directory/page.tsx:141-158` (a hand-written `searchParams` type of ten
  keys, including `cursor`), `:173-183` (`const filters = { q: params.q, year: params.year, ... }`,
  the same nine keys copied again), `:208-210` (`const cursor = params.cursor || null;`), `:271`
  (`...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})`); `src/components/directory/directory-client.tsx:215-258`
  (`handleLoadMore` rebuilds the nine keys from display state at :225-235:
  `city: initialFilters.city || undefined`, ...), fed by `page.tsx:399`
  (`city: (Array.isArray(params.city) ? params.city[0] : params.city) || ""`).
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: nothing links to `/directory?cursor=`: Load more has used the server action since the
  day both were written (`ab333794`, 2026-06-29), and a grep for `cursor=` or any `/directory?`
  builder in `src`, `scripts` and `e2e` finds none that sets it. A stale `?cursor=` in a pasted URL
  would render a list starting mid-way with no way back to its top. Separately, the Load-more hand-off
  loses information: a map pin's escape link sends several cities
  (`alumni-map.tsx:63-65`, `/directory?city=A&city=B`, audit C-098), the first page filters on all of
  them (`where.ts:122-139`), but `initialFilters.city` keeps only the first (`page.tsx:399`), so page 2
  onwards filters on one town while the cursor row may belong to the other, which trips the M39
  offset fallback (`actions.ts:62-79`). Unreachable today (it needs a two-town pin holding over 60
  people), a real divergence at scale.
- **What to do**: type the prop as `searchParams: Promise<DirectoryFilters>` (import the type from
  `./where`), then `const filters = await searchParams;` replaces both the inline type and the
  nine-key copy - keep the variable name `filters` (C-099 pins `parseDirectoryYears(filters)` in this
  file). Delete `cursor` handling (:208-210, :271) so the SSR query is always the first page. Pass
  `filters` to the client as a new prop `appliedFilters: DirectoryFilters` and in `handleLoadMore`
  send `filters: appliedFilters` instead of rebuilding it. `initialFilters` stays for the chips.
- **Saving**: ~30 lines; one dead URL parameter; Load more filters by exactly what page 1 filtered by.
- **Risk & gate**: low. `npm run check` - `directory-rule.test.mjs` (C-093, C-095, C-099, C-092,
  C-097, the transition pin: exactly one `router.push(`), `profile-editor-rule.test.mjs:83`
  (`Number.isFinite(loaded)` in `actions.ts`, untouched). Then: a filtered People view with more than
  60 results (drop the page size locally to test), Load more, and a pin's "See all N".
- **Confidence**: high.
- **Notes**: `buildDirectoryWhere` returns `Record<string, unknown>` (`where.ts:66`); typing it
  `Prisma.UserWhereInput` (type-only import, so `directory-rule.test.mjs` still reads the file as
  text) would let the compiler catch a misspelt column. Cheap, optional, same commit.

### directory-profile-09 - Take the directory's batch-year range from the tile counts it already fetched
- **Where**: `src/app/(main)/directory/page.tsx:254-258` (`prisma.user.aggregate({ where: {
  isBlocked: false, deletionRequestedAt: null, batchYear: { not: null } }, _min: { batchYear: true },
  _max: { batchYear: true } })`) and its use at `:384-385` (`minBatchYear={batchYearRange._min.batchYear
  ?? valleyYear() - 40}`, `maxBatchYear=...`); the tile query that already lists every batch year,
  `:241-250` (`prisma.user.groupBy({ by: ["batchYear"], where: {..., accountType: { notIn:
  ["teacher", "ex_teacher"] } } ... })`), filtered of its null group at `:374-376`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the min and max of the tile years are the range, except when a faculty row carries a
  batch year outside the alumni range - and such a bound could only ever offer years that return
  nobody, because any batch clause makes the where exclude faculty (`where.ts:101-109`, audit C-095:
  `accountTypes.push(NON_FACULTY_TYPES)`). Live: the aggregate is statement #113 in
  `raw/db-statements-live.json` (5,408 calls), one per directory render, and every debounced search
  keystroke is a render (the search is a `router.push`, `directory-client.tsx:292-304`).
- **What to do**: drop the aggregate from the `Promise.all` (and `batchYearRange` from the
  destructure); compute `const tileYears = batchYearCounts.flatMap((b) => b.batchYear ?? []);` and pass
  `minBatchYear={tileYears.length ? Math.min(...tileYears) : valleyYear() - 40}` and the `max` twin.
- **Saving**: 1 query per directory render (8 -> 7 in the page's `Promise.all`); ~4 lines.
- **Risk & gate**: low. `npm run check` (`directory-rule.test.mjs` C-095 wants the groupBy with
  `accountType: { notIn: [...] }` - kept; C-092's batch-desc sweep is unaffected, the aggregate has no
  sort). Open Filters -> Batch on `/directory` and check both ends of the range.
- **Confidence**: high.
- **Notes**: the query itself is cheap (0.14 ms mean); the win is one fewer round trip and one fewer
  moving part on the most re-rendered page in the territory.

### directory-profile-10 - Move `buildPins` out of the page into a module the unit runner can load, and pin its rules by behaviour
- **Where**: `src/app/(main)/directory/page.tsx:23-139` (`placeCoords`, `PIN_PEOPLE_CAP`,
  `buildPins` - ~115 lines of pure logic in a page file); its current pins are regexes over the page's
  text, `src/lib/directory-rule.test.mjs:181-186` (C-098: `cities: [city]`,
  `existing.cities.includes(city)`), and nothing tests the grid-cell keying, the per-person dedupe,
  the `OWN_PIN_CITIES` rule, the unmapped count or the cap at all.
- **Phase**: relocate
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `buildPins` has taken four audit fixes (B-092 the cap, C-098 the multi-city cell,
  C-092 the ordering it relies on, the Rishi Valley own-pin rule) and every one is guarded by
  string-matching the page, because the page imports through `@/` and the test runner cannot load it
  (`directory-rule.test.mjs:13-14` says so). The function's own inputs are plain: rows, a fallback map,
  and three helpers from `city-coords.ts`, which has no imports at all.
- **What to do**: create `src/lib/map-pins.ts` holding `placeCoords`, `PIN_PEOPLE_CAP` and
  `buildPins`, importing `./city-coords.ts` and `import type { PinRow } from
  "../app/(main)/directory/select"` (type-only, erased under node's type stripping) and the pin types
  from wherever -04 leaves them. Import it in `page.tsx`. Add `src/lib/map-pins.test.mjs` asserting:
  a person with two resolvable cities plots in both; two towns in one 0.1-degree cell produce one pin
  whose `cities` lists both (C-098); a listed-twice city plots once; the thirteenth person is counted
  but not listed (B-092); Rishi Valley and Madanapalle stay two pins. Re-point or delete the two
  C-098 regexes in `directory-rule.test.mjs` in the same commit.
- **Saving**: 0 lines net (page.tsx -115, lib +115, a ~60-line test); regex pins become behaviour
  pins on the one function whose output every directory visitor sees.
- **Risk & gate**: medium (moves pins). `npm run check`; `/directory` map view and drilldowns;
  `npm run visual` (the directory map is masked, so a red there is real).
- **Confidence**: medium-high. What would change my mind: if the owner prefers the pins where they
  are because the page is "where the reasoning lives" - the comments move with the code, so I do not
  think that holds.
- **Notes**: optional. The same argument does not apply to `where.ts`, whose rule tests are
  already right-sized.

### directory-profile-11 - One set of admin person actions for the profile and the admin panel (owner picks the ceremony)
- **Where**: `src/components/profile/admin-profile-tools.tsx:19-194` - the note (`:53`,
  `adminUpdateNote`), verify/unverify, block/unblock and delete, each behind a `ConfirmDialog`
  (`:130-191`); `src/components/admin/people/person-detail.tsx` - the same acts: one-press verify,
  unverify and unblock through its `run()` helper (`:238-265`), `ConfirmDialog`s for block and delete
  (`:370-401`), the note (`:627`). The spec that decided this: `docs/spec/admin.md:452-453`
  ("`src/components/profile/admin-profile-tools.tsx` ... and this page should share one component
  rather than drift into two").
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: owner
- **Evidence**: the dialog copy is duplicated verbatim - "They stay in the database and keep
  everything they wrote, but they cannot sign in. You can undo this from the same button."
  (`admin-profile-tools.tsx:159`, `person-detail.tsx:374`) and "Their account, posts, comments,
  photos and messages go for good. Contributions survive without a name attached. There is no undo."
  (`:176`, `:390`) - and the two have already drifted: the profile asks for confirmation to verify,
  unverify and unblock, the panel does them in one press; the toasts differ ("User blocked" vs
  "Blocked", "Member verified" vs "Verified", "Verification removed" vs "No longer verified").
  The profile comment even claims the opposite: "The same words the admin panel's person-detail uses
  for the same acts (Material's rule: one verb per act, everywhere)" (`:126-129`).
- **What to do**: after the owner answers Owner decision A: extract the shared acts into
  `src/components/admin/people/person-acts.tsx` (dialogs + handlers, taking `{ id, name, isBlocked,
  verifyState }` and an `onDeleted` callback, since the profile hard-navigates to `/directory` and the
  panel `router.push`es to `/admin/people`), render it from both, and let the panel keep its extra acts
  (merge, photo-trusted, promote, places). Or, under option (c), replace the profile card with a link
  to `/admin/people/<id>` and delete `admin-profile-tools.tsx` plus the `adminNode` plumbing
  (`page.tsx:439-449`, `letterhead-profile.tsx:345`, `:1569-1574`).
- **Saving**: (a)/(b) ~50-60 lines and one copy of every admin sentence; (c) ~210 lines and one
  client chunk (only admins ever load it, so no member bytes either way).
- **Risk & gate**: medium. `npm run check` (`gate-coverage.test.mjs` is about actions, untouched;
  `focus-recipe.test.mjs` lists no admin file). As an admin: verify, unverify, block, unblock and
  delete from a profile and from `/admin/people/<id>`, and the blocked-profile admin exemption
  (`page.tsx:139-145`, audit Low 98) still lets you back onto a blocked member's profile.
- **Confidence**: high on the duplication; the direction is the owner's.
- **Notes**: the admin panel is another territory's; this finding belongs to both and the
  orchestrator should merge it with that lens.

### directory-profile-12 - Give the letterhead's three read-path sub-components their own files (file organisation only)
- **Where**: `src/components/profile/letterhead-profile.tsx` (2,047 lines, 1,294 code): `PerchedBird`
  with `CHIRP_BEAT_MS`/`CHIRP_MIN_GAP_MS` (`:1583-1853`, ~270 lines, the bird on the sheet's edge, its
  chirp and its species annotation), `Writing` with `TabKey` (`:1855-1969` and `:276`, ~115 lines,
  the Posts/Letters/Photos/Saved switcher), `CitiesPen` with the `LocationPicker` dynamic import
  (`:1977-2047` and `:128-131`, ~75 lines).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: the three are self-contained - each takes props, owns its own state and is rendered
  once (`:766`, `:1439`, `:612`); none reads the letterhead's closure. None is touched by a pin:
  `profile-editor-rule.test.mjs` reads the file for `maxLength={FULL_NAME_MAX}` and `function
  commitPlaces`, `composer-rule.test.mjs:170` for `function commitContacts(next?`,
  `upload-size-rule.test.mjs:36` and `focus-recipe.test.mjs:57` list the file for the avatar upload and
  for having no boxed text input - all of which stay in `letterhead-profile.tsx`.
- **What to do**: move each verbatim to `src/components/profile/perched-bird.tsx`,
  `profile-writing.tsx` and `cities-pen.tsx` (each `"use client"`), exporting the component and
  importing it back; keep every comment with its code. Do not touch the mirrored read/edit pairs, the
  pen state or the owner block - that is audit 2's parked G3, not this.
- **Saving**: 0 bytes and ~0 lines (three import lines added); `letterhead-profile.tsx` drops to
  ~1,590 lines, and the bird, the tab switcher and the cities popover each become a file a session can
  read without paging through the sheet.
- **Risk & gate**: low. `npm run check`; your own profile and a stranger's at 1440 and 390 (tap the
  bird, hover it for the species, switch every tab, open the cities popover with the pen out).
- **Confidence**: high that it is safe; medium that it is worth doing on its own.
- **Notes**: this is the charter's "how many would split cleanly" answer for the read path: three.
  The edit path's split is G3 (see Audit carry-overs), which the owner parked on 2026-09-07 because
  "these want you awake"; do this before G3 if G3 is ever un-parked (it shrinks the file G3 has to
  cut), or alone if it is not. It does not change what a stranger downloads - that is exactly the
  part G3 was about.

### directory-profile-13 - Merge the duplicated house-span tests into the file of the function they test
- **Where**: `src/lib/houses.test.mjs:35-72` (five `parseHouseSpans` tests plus a `houses(...)`
  helper, in the test file for `houses.ts`) and `src/lib/house-spans.test.mjs:26-48` ("a same-house
  run collapses, but a skipped year opens a new span" and "malformed stored houses parse to nothing
  rather than throwing").
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: audit Low 99's rule is asserted twice with different fixtures (Cauvery
  2014/2015/2017 in `houses.test.mjs:44-52`, Golden 2014/2015/2017 in `house-spans.test.mjs:26-40`),
  and the malformed-input case twice (`houses.test.mjs:67-72`, `house-spans.test.mjs:42-48`).
  `house-spans.test.mjs` was refilled with these in audit 1's fix (`d960b45d`) so the suite would not
  drop below its file-count floor after `seedHouseYearRows` was deleted - so both files have to keep
  at least one test, and both do after the merge.
- **What to do**: move `houses.test.mjs`'s span block (`:35-72`) into `house-spans.test.mjs`,
  replacing that file's two duplicates; `houses.test.mjs` keeps the three `normalizeHouse` tests
  (`:1-33`, dropping the `parseHouseSpans` import).
- **Saving**: ~20 lines; one rule asserted in one place; test-file count unchanged (130).
- **Risk & gate**: none. `npm run check` (the unit gate's file-count floor).
- **Confidence**: high.

### directory-profile-14 - Delete the directory rule test that can no longer fail
- **Where**: `src/lib/directory-rule.test.mjs:252-267` ("a profession tag column takes the contains
  arm with it") and the `SCHEMA` constant it alone uses (`:22`).
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: its only assertion is `doesNotMatch(WHERE, /jobTitle: \{ contains: needle/)`, gated on
  `/profession/i.test(SCHEMA)`, which has been true since `professionTags` shipped on 2026-08-28.
  `needle` was the variable of the contains arm that was deleted that day; it appears nowhere in
  `where.ts` now (grep), so the assertion can only fail if somebody re-types that exact line with that
  exact variable name. The regression it was written for - a free-text profession arm coming back -
  is guarded by the two tests above it: `:210-235` requires `where.professionTags = { has:` in the
  arm and forbids `where.workplace = filters.profession`, and `:237-250` forbids the arm assigning
  `where.OR` or `where.AND`, which any contains-over-two-columns arm would need.
- **What to do**: delete the test and `const SCHEMA`.
- **Saving**: 17 lines; one read of `prisma/schema.prisma` per test run.
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.
- **Notes**: new evidence against a settled row: audit 2's `directory-profile-24` looked at this test
  and kept it with a present-tense comment ("a live pin against the contains arm returning"). It did
  not examine what the regex matches; this does.

### directory-profile-15 - Correct the comments that describe code that is gone (batch)
- **Where** (each checked against the tree at HEAD):
  1. `src/app/api/places/search/route.ts:19-26` ("altNames is a flat comma-joined string (no index)
     ... so short queries ("de") do not force a sequential scan"), `:60-62` ("a raw LIKE scan over
     234k gazetteer rows"), `:73-80` ("the 234k-row Place table's UNINDEXED altNames column"). Since
     `prisma/migrations-manual/2026-08-21-gazetteer-trigram.sql` the column carries
     `Place_altNames_trgm_idx` (GIN trigram, 37.4 MB, 559 scans in `raw/db-indexes-live.json`), and the
     prefix arms use `Place_name_idx`/`Place_asciiName_idx` (`lower(...) text_pattern_ops`, 1,024 and
     1,028 scans). Say that, and that it is still the most expensive application query per call (current
     shape: 86.6 ms mean over 628 calls; the family's four shapes ~398 s since 2026-05-22).
  2. `src/components/directory/alumni-map.tsx:408-410` ("Any pan, wheel or pinch the USER drives
     dismisses the tooltip. d3 leaves sourceEvent null for programmatic transforms ...") - the
     tooltip and its dismissal were removed; the same file says so at `:535-543`. The handler body is
     two assignments.
  3. `src/lib/map-cluster.ts:153-154` ("Membership-derived, so a tooltip bound to this key dies the
     instant its cluster splits") - no tooltip; the key is a React key.
  4. `src/lib/house-spans.ts:45-57` - the docblock of `seedHouseYearRows` ("Build the houses-editor
     row list (onboarding step + settings editor share this) ..."), orphaned on top of
     `parseHouseSpans`'s own docblock when audit 1's fix (`d960b45d`, its `directory-profile-04`)
     deleted the function and left the comment. Delete the 13 lines.
  5. `src/components/profile/houses-chain.tsx:27-38` (the header's "NOT A GRID" paragraph: "drawn in
     a side gutter as one arc that leaves the END of the top row ... swings around outside the pills")
     - superseded by `:544-552` (every row flush left, the gutters gone) and `:559-593` (one quarter
     bend at most); `:221` (`/** Greedy row packing over the measured pill widths. */` directly above
     the docblock that says it is NOT greedy packing); `:51-64` (the `HOUSE_TINTS_PANEL` docblock
     stacked above `HOUSE_TINTS_HOVER`'s; move it down to `:86`).
  6. `src/components/profile/house-chain-editor.tsx:285-287` ("One panel, anchored to whichever pill
     asked for it. The anchor is the pill's own element rather than a wrapper") - contradicted by the
     same file's `:60-67` and by the code (`anchor={chainRef.current}`, `:292`).
  7. `src/components/directory/directory-client.tsx:340-343` ("... with the arm rewritten to a
     contains over jobTitle and workplace") - the arm is `professionTags has` (`where.ts:164`).
  8. `src/lib/profession-tags.ts:175-179` ("Empty today because this is the first vocabulary") -
     `LEGACY_TAGS` has held `studying` since 2026-08-28.
  9. `src/lib/place-input.ts:115-141` - `resolvePlaces`'s docblock is separated from its function by
     the `ResolvedPlace` type and that type's own docblock; move the type above, and use
     `ResolvedPlace[]` for `out` at `:168`.
  10. `src/lib/phone.ts:9` ("Four files need this; those four import it.") - three do.
  11. `src/lib/vcard.ts:8-12` (the NOTE is "built as ... Houses: Aravalli 2014-15, Nilgiri 2015-16")
      - houses left the NOTE on 2026-09-10 (`ff67fb46`); keep the escaping argument, put the example
      in the past tense. (`vcard.ts` is lib-core's by elimination; it is the profile's .vcf.)
  12. `src/components/profile/letterhead-profile.tsx:29-32` - the header's rule "The one engraved rule
      gets equal air above and below and is drawn only when it has a body under it to separate" - the
      same file records at `:1172-1182` that the rule was DELETED (owner, 2026-08-02). Drop the bullet;
      the header's other six rules still hold.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: as listed. For the "quote one of each" rule: a comment to KEEP is
  `where.ts:129-136` ("`equals`, not `contains` (audit Low 69) ... filtering Delhi also returned
  everyone in New Delhi") - an audit id, a measured consequence and the reason the obvious code is
  wrong; a comment to CUT is item 4, a 13-line description of a function deleted a month ago.
- **What to do**: as listed, one commit.
- **Saving**: ~55 comment lines touched, ~30 net removed; four future sessions not sent looking for a
  tooltip, a gutter, a greedy packer or an unindexed column.
- **Risk & gate**: none. `npm run check` (no pin reads any of these comments; `directory-rule.test.mjs`
  decomments before matching).
- **Confidence**: high.
- **Notes**: the page's legacy-city comment (`profile/[id]/page.tsx:228-229`) goes with -05.

### directory-profile-16 - Small dedupes, dead defaults and one unreachable branch (batch, new since audit 2)
- **Where**:
  1. `SWITCHER_SHADOW` (`src/components/profile/letterhead-sheet.tsx:43`) re-typed as a literal at
     `src/components/profile/contacts-editor.tsx:184` and `letterhead-profile.tsx:1371-1374` (the
     dark-mode tile) - both carry the byte-identical string; `letterhead-sheet.tsx` exists "so the page
     and its skeleton cannot drift apart" (`:3-9`). Import it.
  2. `letterhead-profile.tsx:727-752` - two `<GetInTouch>` mounts that differ only in `methods` and
     `lock`. The page already sends `[]` whenever contacts are withheld (`page.tsx:287`), so one mount
     does both: `contactsLock || contactMethods.length > 0 ? <GetInTouch ... methods={contactMethods}
     lock={contactsLock ?? undefined} /> : null`.
  3. `src/components/profile/get-in-touch.tsx:128-152` - the tick and copy `m.span`s share every
     prop; one `m.span key={copied ? "tick" : "copy"}` with the icon inside (`AnimatePresence
     mode="popLayout"` swaps keyed children the same way).
  4. `src/components/directory/alumni-map.tsx:647-662` - the zoom-in and zoom-out buttons carry one
     identical ~200-character class string, and reset (`:682`) is that string minus the type; one
     `CHROME_BUTTON` constant.
  5. `alumni-map.tsx:762-763` - `typeof document !== "undefined"` before `createPortal`, in a component
     that is only ever loaded with `ssr: false` (`directory-client.tsx:48-58`) and rendered by no lab
     room (grep `<AlumniMap`).
  6. Defaults no caller relies on: `alumni-map.tsx:262-263` (`unmappedPeople = []`, `namesLocked =
     false`) and `directory-client.tsx:134` (`namesLocked = false`) - the one caller always passes both.
  7. `PAGE_SIZE = 60` declared twice, `src/app/(main)/directory/page.tsx:21` and `actions.ts:8`;
     export it from `select.ts`, whose header is "in one place because two files read them".
  8. `src/components/profile/saved-posts-feed.tsx:51` - `useContainerColumns(threshold = 560)`: an
     options parameter with one caller at its default; a module constant.
  9. `letterhead-profile.tsx:1227-1231` - the read-only "You haven't written an About yet." branch is
     unreachable: it needs `isOwnProfile && !draft`, and the only caller passes `draft` exactly when
     `isOwnProfile` (`page.tsx:415`, `:462-498`). With it gone the `isOwnProfile` prop equals
     `Boolean(draft)` and can be derived.
  10. `letterhead-profile.tsx:1940-1942` - `initialCursor`/`initialHasMore` are handed to every tab
      although only "all" is seeded (`:1937-1940`); pass them with `initialPosts` (one `initial`
      object) so an unseeded tab does not start holding the All tab's cursor.
  11. `letterhead-profile.tsx:102` imports `formatPhoneDisplay` (`src/lib/phone.ts`) into the client
      module only to pre-format `draft.contacts.phones` for `buildRows` (`:393-395`); the page already
      imports it (`page.tsx:10`) and could send the draft's phones formatted
      (`phones: phoneNumbers.map(formatPhoneDisplay)` at `page.tsx:490`), which takes `phone.ts` (its
      calling-code Set and three functions) out of every stranger's profile download. Then
      `buildRows`' injected `formatPhone` parameter (`src/lib/contact-rows.ts:62-69`) goes too - and its
      stated reason is already stale: "tsc refuses "./utils.ts" without allowImportingTsExtensions",
      but `tsconfig.json:16` has had `allowImportingTsExtensions: true` since `3246db26` (2026-08-22).
      `src/lib/profile-email.test.mjs:25-62` already calls `buildRows(base)` without a formatter.
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each read in full at HEAD; none is in audit 2's lists (its still-open items are -17).
- **What to do**: as listed; one commit for the directory items, one for the profile items.
- **Saving**: ~55 lines; 2 hand-copied shadows, 1 doubled mount, 1 dead branch, 1 injected
  parameter with a stale reason, 1 small module (~1 KB raw) off strangers' `/profile/[id]`.
- **Risk & gate**: low. `npm run check`; `/directory` map controls and drilldown; your own profile
  (contacts block, dark-mode tile, Saved tab) and a stranger's (Get in touch, locked and unlocked,
  the copy tick) at 1440 and 390.
- **Confidence**: high.
- **Notes**: considered and not taken: folding `GetInTouch`'s `name` and `batchYear` props into
  `person` (seven call sites, five of them lab rooms, for ~14 lines - and `AvatarUser.name` is
  optional where the dialog needs a string); flipping `GetInTouch`'s `showSave`/`size` defaults to
  the shipped values (three lab variants rely on the current defaults, and the component's header
  records that an audit already called them dead once and was wrong).

### directory-profile-17 - Carry-over: audit 2's `directory-profile-26` is still entirely open (current lines)
- **Where**: `src/lib/geocode.ts:37-45` (`regionNames` + `countryName` with its try/catch) restating
  `src/lib/place-input.ts:62` and `:81-87`; `src/components/directory/alumni-map.tsx:315-316`
  (`// eslint-disable-next-line @typescript-eslint/no-explicit-any` / `useRef<any>(null)`), `:593-611`
  (the same `setDrill({ title, count, people, href })` built for `onClick` and again for `onKeyDown`;
  the cluster marker does the same with `onClusterClick` at `:552-560`);
  `src/components/directory/directory-client.tsx:788-816` (the batch tile and the faculty tile, one
  200-character class string twice - audit 1's F-10 fold, still two buttons), `:420-423` (`views` plus a
  nested ternary for three labels); `src/lib/map-cluster.ts:66` (`export const TAP_MIN_PX`, knip's
  only unused export in this territory) with `scripts/qa/map-cluster-verify.mjs:41` redefining it.
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: audit 2 `work/agents/directory-profile.md` row 26; re-checked item by item at HEAD,
  none done (its `range-facet-pill.tsx` item is common-primitives').
- **What to do**: as audit 2 wrote it: export `countryName` from `place-input.ts` and use it in
  `geocode.ts`; type the ref `useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)` (import the
  type from `d3-zoom`); one `openPin(pin)` and one `activate(fn)` key handler for both marker kinds;
  one `TILE` class constant (keep the faculty tile's `text-base`); a literal
  `[{ key: "map", label: "Map" }, ...]` with the `warm` added for map; import `TAP_MIN_PX` in the QA
  script (scripts already import `.ts` by path) or un-export it.
- **Saving**: ~35 lines; 3 in-file repeats (each under jscpd's 50-token floor, so no jscpd line
  moves); 1 `any`; 1 knip line.
- **Risk & gate**: low. `npm run check` (`map-cluster.test.mjs`); `/directory` Batches view and the
  map's keyboard activation (Tab to a pin, Enter). Do not run `map-cluster-verify.mjs` from an audit
  or fix session without its own command.
- **Confidence**: high.

## Owner decisions

**A. The admin buttons on a member's profile**
- *What I'd change:* the verify, block, delete and private-note buttons that admins see on someone's
  profile are a second copy of the same buttons on the admin panel's page for that person. The two
  copies already behave differently: the panel verifies and unblocks in one press, the profile asks
  "are you sure?" first, and they word their confirmations differently. I'd make them one piece so
  they cannot drift again.
- *What you'd notice:* only you and other admins would notice. Depending on the option, verify /
  unverify / unblock on a profile would stop asking for confirmation (matching the panel), or the
  panel would start asking. Block and delete keep their confirmation everywhere.
- *If I guess wrong:* an action you liked the extra check on loses it. All three of those actions can
  be undone with one more press.
- *Options:* (a) one shared set, with the panel's one-press for the undoable actions; (b) one shared
  set, confirming everything like the profile does now; (c) take the tools off profiles and leave a
  single "Open in admin" link there; (d) leave both as they are.
- *If you don't reply:* (a). *[directory-profile-11; docs/spec/admin.md §9.4 already asks for one
  component]*

**B. The second old "city" field on each member**
- *What I'd change:* every member's cities now live in one list. Two older fields still hold a copy of
  the first and second city, rewritten from that list on every save. The copy of the second city is
  read by nothing on the site except your data export. You ruled on 7 September that members' cities
  must not be touched, and I am not proposing to touch anyone's list; I am asking again only because
  we now know that field is a copy, not original data.
- *What you'd notice:* nothing on the site. The data export would show the second city once, in the
  list, instead of twice.
- *If I guess wrong:* if any member's copy differs from their list (it should not), that old value
  would be lost; a check run first tells us whether any differ, and nothing is dropped if they do.
- *Options:* (a) keep both old fields exactly as they are; (b) run the check, and if every copy
  matches its list, drop the second field after launch; (c) drop both old fields (not recommended:
  the first one is still read by the directory cards and the feed's "new in the directory" box).
- *If you don't reply:* (a). The profile's dead fallback that reads these fields is removed either
  way; that changes no data. *[directory-profile-05; audit 2 report item 14; audit 2 fix-prompt Q18
  reading]*

## Not-findings
- **`directory-grid.tsx`'s 81-line header (comment/code 1.27).** It is the measured record of a pinned
  design: frame traces (long tasks 510/466/394 ms, a 967 ms entry frame), the rejected FLIP attempt
  ("considered and not taken"), and the owner's "one frame per second". `directory-rule.test.mjs:330-437`
  pins every rule it explains. Keep.
- **`profile-card.tsx` (1.88).** The density table the owner picked from `/lab/directory`, the
  `content-visibility` measurements and the memo comparator's reasoning; pinned at
  `directory-rule.test.mjs:414-437`. Keep.
- **`profession-tags.ts` (1.85) - and yes, one source of truth.** The vocabulary is the hand-run pass's
  rulebook: `TAG_RULES` is quoted by `.claude/skills/tag-professions/SKILL.md` and printed by
  `scripts/dev/tag-professions-pick.mjs`; the page resolves `tagLabel`/`TAG_FLOOR`/`TAG_VISIBLE_MAX` on
  the server; the client imports none of it (pinned, `directory-rule.test.mjs:322-326`); the scripts
  and the demo seed use `tagsOf`/`sourceOf`/`withParents`/`TAG_MAX_PER_PERSON`; `VOCAB_MAX` is held by
  the test on purpose. The one place the facet does not go through the vocabulary (the SQL histogram
  counts stored strings) is documented at `:190-202`. Keep.
- **`map-cluster.ts`.** It replaced the `supercluster` dependency (gone from `package.json`) and derives
  the zoom ceiling from the data (the New Delhi/Gurgaon fix); tested by `map-cluster.test.mjs`. Keep.
- **`city-coords.ts` and `geocode.ts`.** `CITY_COORDS` has three consumers: the map's legacy ladder, the
  city filter's spelling variants (`cityFilterTargets`), and the demo seed
  (`demo-seed/seed.ts:192`, `content.test.mjs:164`). The gazetteer fallback is live: the July backfill
  created label-only `UserPlace` rows with no coordinates. *Considered, not taken:* geocoding
  free-typed places once at write time (in `resolvePlaces`) plus a one-off backfill, so the directory
  stops consulting `cityCoords`/`resolvePlacesFromGazetteer` on every render. Its steady-state cost
  today is zero queries (the module cache), so the win would be clarity only; decide with
  `SELECT count(*) FROM "UserPlace" WHERE lat IS NULL OR lng IS NULL;` first.
- **`UserPlace_userId_idx`.** Redundant with the leading column of `UserPlace_userId_position_key`,
  and kept on purpose (`prisma/schema.prisma:1049-1052`: "kept because the unique is stated as an
  invariant and this as the access path"). Live: 40,015 vs 40,464 scans, 16 KB. Not worth a migration.
- **`UserPlace_city_idx` (1 scan).** Backs the case-insensitive city filter (`lower(city)`); at ~100
  rows the planner seq-scans. 16 KB, there for scale.
- **The directory's eight concurrent reads per render (and per search keystroke).** All sub-millisecond,
  Vercel `bom1` beside the Mumbai database, pool max 5. Five are filter-independent and cacheable, but
  the app has no data cache anywhere (no `unstable_cache`, no `"use cache"`), caching would not shrink
  the RSC payload (the data still ships), and the first cache in the app is a cross-cutting decision.
  -09 removes the one read that is redundant outright.
- **No N+1 in the directory.** Pins are one parent SELECT plus one batched `UserPlace ... IN (...)`; the
  People page is one SELECT; statement-by-statement attribution is under For other lenses.
- **`public/geo/countries-110m.json`** (107,761 B, 38,423 B gzip): fetched once behind an `immutable`
  header (`next.config.ts:276-284`), never compiled into a chunk. `objects.land` (1.6 KB) is unused by
  the shipped map and the per-country `name`s (3.4 KB) are read only by `/lab/directory` - about 1.5 KB
  gzip of 38; not worth a second atlas file.
- **`GetInTouch`'s `showSave`/`size` and `AdmissionStamp`'s `className`.** Lab variants use them
  (`_variant-broadsheet/-terrace/-passport` take the defaults; `-dossier`/`-broadsheet` pass
  `className`); `get-in-touch.tsx:223-229` records the earlier false "unused" call.
- **`PenValue` vs `PenBlock`.** An `<input>` and a `<textarea>` on purpose (the 390 px wrap bug,
  measured `scrollLeft` 6 -> 173 px); what they share already lives in `PenSlot` and `PEN_FIELD`.
- **`phone.ts`'s two parsers** (display and edit): separate by design, sharing `splitCountryCode`
  (`:98-115`).
- **`house-chain-editor.tsx`'s `parseHouseSpans(JSON.stringify(entries))`.** Defended at `:99-102`
  (one definition of a span for the chain and its editor).
- **`DirectoryClient`'s effect mirroring `users` into `results`, and `listGeneration`.** Audit M36 (a
  Load-more page landing on a newer list); `DirectoryGrid`'s `exhaustive-deps` disable is explained
  at `:245-248`.
- **The author feed's and saved feed's mount-fetch, and the 21-line jscpd clone with `post-feed.tsx`'s
  Load more.** A shared paged-list hook was refuted at fix time twice (brief §4).
- **`letterhead-sheet.tsx`.** A server-safe module so the loading sheet and the page share geometry;
  exactly the kind of split this audit wants.
- **`stray-hair.tsx` + `stray-hair-ids.ts`.** A kept delight (audits 1 and 2); the gate is on the
  server so nobody else downloads it.
- **`search-log.ts`'s dedupe window and `isSameSearch`** (audit M25); writes run inside `after()`.
- **`/birds` has no `loading.tsx`** - the page is not async. **`/pick-bird`'s redirect** is a
  convenience; `chooseBird` enforces (its comment says so).
- **`places/search`'s alias post-pass** (the Delhi/New Delhi fix) **and its `raw.length >= 4`
  altNames threshold** (trigram needs three characters; two-letter queries still must not scan).
- **The profile's `.vcf` text built on the server** (~300 B per stranger's view): the contact gate
  (`maySeeContacts`) has to decide on the server what is serialized.
- **The two loading sheets** (`directory/loading.tsx`, `profile/[id]/loading.tsx`): the 2026-09-21
  loading-screen series, shaped from measured geometry. Keep (one visual nit under For other lenses).
- **`api/users/search`'s `MAX_SEARCH_TERMS` and opt-in `alumniOnly`**: audit fixes (C-006, M44),
  pinned by `people-search-rule.test.mjs`.
- **Client boundaries and dynamic imports (charter question 1).** Every `"use client"` file in the
  territory needs its boundary (state, effects or browser APIs; the bundle lens's probe agrees), none
  imports a server-only module (grep for `@/lib/prisma|auth|storage|email-queue`, `next/headers`,
  `server-only` over the 15 client files: zero), and the two shared pieces with no directive
  (`profile-card.tsx`, `letterhead-sheet.tsx`) are right to have none. The map is `dynamic`
  (`ssr: false`) with a hover warm (B7); the five editors are `dynamic` (audit 1). The calling card is
  static in the letterhead, which is right: it is the stranger's one action, drawn at rest; only its
  two lock dialogs could be deferred, which is G3's move (b), parked. The .vcf is built as text on the
  server; only the photo's JPEG conversion runs in the browser, started when the card opens
  (`get-in-touch.tsx:273-284`). Nothing further to split in this territory beyond G3.
- **Duplication between the directory's person row and the profile's header (charter question 2):**
  none in code. They share `BirdAvatar`, `VerifiedMark` and `batchLine`, and draw different things
  (a list lockup vs a letterhead). The duplication that does exist is between the directory card
  (batch · job · city) and the map drilldown row (batch · job): two "browse" subtitles, which is the
  person-row sweep's subject, left by the owner for a session of its own.

## Audit carry-overs in this territory
- **G3 / audit 2 `directory-profile-01` (the letterhead's edit-only trunk on every stranger's
  view): still open, parked by the owner (fix-prompt Q27), recorded in `docs/planning/FEATURES.md`
  "parked design reworks" item 1.** Unchanged in substance: `SavedPostsFeed` is still a static import
  (`letterhead-profile.tsx:76`), the two lock dialogs are still static in `get-in-touch.tsx:28-29`, and
  the trunk still holds the pen state and handlers (`:361-498`), the owner block (`:1349-1430`), the
  delete-account dialog (`:1483-1565`) and `CitiesPen` (`:1977-2047`). The file went 2,030 -> 2,047
  lines; `/profile/[id]` went 1,199 KB (campaign close) -> 1,240 KB, mostly from the tooltip and the
  hoopoe rig (bundle-build-02/-07), not the letterhead. Section map at HEAD for whoever un-parks it:
  header 1-104 · dynamic seams 106-151 · `ProfileDraft` 153-195 · `COLOPHON` 197-274 · props 276-360 ·
  pen state/handlers 361-498 (edit-only) · facts 500-640 · about/stamp/circle 642-677 · action pill
  679-752 · the sheet 754-1332 (mirrored read/edit pairs: keep) · under-sheet 1334-1455 (owner block
  1349-1430 edit-only; `Writing` mount 1432-1452) · owner dialogs 1457-1567 (edit-only) · admin/flag
  1569-1574 · `SectionLabel` 1579-1581 · `PerchedBird` 1583-1853 · `Writing` 1855-1969 · `digits`
  1971-1975 · `CitiesPen` 1977-2047 (edit-only). The read-path half that splits cleanly without
  touching G3 is -12.
- **Audit 2 `-02`/`-04` (B7):** done - the map is `dynamic` with a hover warm
  (`directory-client.tsx:32-58`, `warm: preloadAlumniMap` at `:431`); the profession label is
  resolved on the server (`page.tsx:401-408`), pinned (`directory-rule.test.mjs:306-326`).
- **`-05`, `-09`, `-12`, `-17`, `-23` (D8):** done - `HousePicker` and its lab rooms gone (grep),
  `otherCities` gone (grep), the Photos grid skipped on your own sheet (`f41e51bf`), the non-refuted
  dead props gone, the profile skeleton rewritten on 2026-09-21 with no engraved rule. (`-10` and
  `-21` are onboarding's and were not re-checked here.)
- **`-08` (E12):** done - `DirectoryPerson` is derived (`select.ts:26-34`); `PinPerson` is the
  leftover, -04.
- **`-11`, `-15`, `-16` (E11):** done - `place-write.ts` names its three writers (`:8-18`);
  `admin-actions.ts` left `components/profile/` (`bc0be4e5`); `AdminProfileTools` uses `useAdminAct`
  (`d1101cfe`).
- **`-13` (C1):** done - `loadProfile` is `cache()`d (`page.tsx:41-47`). **`-14` (B13):** done -
  `page.tsx:187-203`. **`-27` (C9):** done - both lookup routes spread `IDENTITY_SELECT`.
- **`-24` (F hygiene):** done, except new remnants listed in -15.
- **`-25` (spec banners):** `directory.md` half done (corrected 2026-09-08); `profile.md` half still
  open - §10's banner (`docs/spec/profile.md:285-296`) still calls houses, links and memories "still
  to build" with a `MEMORY_PROMPTS` placeholder (houses and links shipped as `User.houses` and
  `User.links`; `MEMORY_PROMPTS` exists nowhere), and `:31` still names the lab's
  `_houses-trail.tsx` as the reference implementation (shipped: `components/profile/houses-chain.tsx`).
- **`-26`:** entirely open - re-listed with current lines as -17.
- **`-17a`/`-17b`** (`GetInTouch`/`AdmissionStamp` "dead" props): refuted in audit 2; still refuted.
- **`-18` / report item 13** (`LocationPicker`'s single mode, recommendation "drop"): still open; only
  the lab harness `/lab/location-picker` uses it, so it is common-primitives' with an owner-room edit.
- **Report item 12** (the person-row sweep, `docs/spec/person-row-audit.md` steps 3-4): not started;
  the owner left it "for a session of its own" (fix-prompt Q26 list).
- **Report item 14** (the two legacy city columns): kept by the campaign (56 of 70 members,
  "members' own data"); see Owner decision B.
- **Audit 1 F-10** (fold the batch and faculty tiles): still open, inside -17.
- **The charter's leads, answered:** the two `Post` COUNTs are not the profile (see For other lenses);
  the two `UserPlace` SELECT shapes are the profile's `loadProfile` include (one per view) and
  `getViewerCities` (one per request that needs it, `cache()`d); `COUNT(city) ... LEFT JOIN User` is the
  directory's City facet (`page.tsx:295-300`, one per render, 44 rows = the distinct cities); the country
  `GROUP BY` is `src/lib/admin-analytics.ts:166`, not the directory; the calling card replaced the tile
  sheet in place (`16758d27`, `93d4ed1c`) and no old sheet survives - its four candidate
  constructions live in `/lab/reach` (a lab-to-shipped clone, fresh-code-06's owner decision E).

## For other lenses
- **data-layer:** statement attribution for my territory from `raw/db-statements-live.json`. **#42
  (17,445 calls) and #44 (17,444)** - `COUNT(*) ... "authorId" = $1 AND "isHidden" = $2 AND "status" =
  $3` and the same with `"kind" = $2` - are `CelebrationSignals`
  (`src/components/mascot/moments/celebration-signals.tsx:31-40`), mounted on every `/feed` and
  `/welcome` render, NOT the profile (which has run one `groupBy` over a far larger audience where
  since `4f06f4fd`, 2026-09-05). One `groupBy({ by: ["kind"] })` there saves a query per feed render.
  **#40** (32,721) = `loadProfile`'s `include: { places }` (`profile/[id]/page.tsx:41-47`, all nine
  columns, one per view); **#46** (21,786) = `getViewerCities` (`src/lib/city-scope.ts:15-27`);
  **#55** (5,410) = the directory City facet; **#70** (2,816, 73 rows/call) = the directory pins
  (`PIN_SELECT`), plus one batched child query; **#113**/**#78** = the directory batch range and tiles
  (-09 removes #113); **#53** (country `GROUP BY`) = `admin-analytics.ts:166`; **#27** (12,578) = the
  feed rail's "new in the directory" module (feed's).
- **landing-mascot-avatars / bug lens:** `CelebrationSignals`' `profileComplete` requires
  `user.bio?.trim()` (`celebration-signals.tsx:45-47`), and nothing shipped writes `User.bio` any more
  (`src/lib/admin-analytics.ts:856`: "The old `bio` column is retired"), so the profile-complete
  moment can never fire for a real member. `profileSchema.bio` is dead too (-07).
- **api-actions-crons / runtime-perf:** 32 non-lab `router.refresh()` calls; every one that follows a
  server action which already `revalidatePath`s (or `refresh()`es) the current route is a second full
  render (Next 16 `server-actions.md:41-45`). -01 covers the profile's four and the profile admin
  tools' two.
- **lib-core-config:** `src/lib/place-write.ts:55-67` creates each place with its own
  `prisma.userPlace.create` inside `$transaction([...])` - one INSERT per city (live #67: 317 calls,
  4.44 ms mean); `createMany` is one statement. `src/lib/validators.ts`' dead half is -07.
- **auth-onboarding-settings:** `src/components/settings/` is named for a `/settings` page deleted in
  August; it now holds the profile's account actions (`updateUserPlaces`, `requestAccountDeletion`,
  the avatar upload and crop dialog) and the dark-mode gauntlet. A rename/move is that lens's call.
- **common-primitives:** `LocationPicker`'s single mode (lab-only, audit 2 item 13, still open);
  `AvatarUser.avatarSpecies` (`bird-avatar.tsx:30`, `@deprecated`, "kept for older preview-mock
  callers"); the laptop-popover / phone-sheet switch in `house-chain-editor.tsx:288-313` is the third
  copy catchups-ui-25 counted.
- **runtime-perf / data-layer:** the city type-ahead queries the 234,935-row gazetteer from the first
  letter (`location-picker.tsx:143-160` fires on any non-empty query after the debounce;
  `places/search/route.ts:68-71` refuses only the empty string). It is the most expensive application
  statement family in the database (four shapes, 1,393 calls, ~398 s since 2026-05-22; the current
  shape, #6, 86.6 ms mean). Before deciding on a two-character minimum, run `EXPLAIN (ANALYZE, BUFFERS)` of the
  route's query for `q = 'a'` and `q = 'ch'`.
- **bug lens:** (1) directory Load more drops the second city of a multi-town pin's "See all" link
  (fixed as a side effect of -08; unreachable below 60 people per two-town pin). (2) The profile
  skeleton's second houses row is `justify-end` (`profile/[id]/loading.tsx:101`) while the real
  serpentine is flush left since 2026-08-03 (`houses-chain.tsx:544-552`), so a two-row chain jumps
  sideways on arrival at 390 px. (3) Facebook shows a globe in the calling card
  (`profile/[id]/page.tsx:327-335` sends `kind: "website"`; `get-in-touch.tsx:39-45` has no Facebook
  icon) but the Facebook glyph in the contacts editor (`contacts-editor.tsx:49-56`). (4) Pass on
  catchups-lib's note that a batch-year correction on the profile (`profile-actions.ts`, `batchYear`)
  leaves the member in two batch groups. (5) A crafted repeated single-value parameter 500s the
  directory: `/directory?q=a&q=b` hands an array to `escapeLike` (`src/lib/db-text.ts:49-55` calls
  `value.slice(...).replace(...)`, and an array's `slice` returns an array with no `replace`), and
  `?house=`/`?profession=` twice do the same through `escapeLike` and `has`. Only `city` is read as
  possibly-plural (`page.tsx:147-149`); normalising every other key to its first value at the page
  boundary (the `city` chip already does, `:399`) closes it. Not reachable from the UI.
- **docs:** `docs/spec/profile.md:285-296` and `:31` (audit 2 `-25`'s open half, above).
- **scripts-e2e-ci:** `scripts/qa/map-cluster-verify.mjs:41` redefines `TAP_MIN_PX` (in -17);
  `scripts/qa/phase3-probe.mjs:162` calls `/api/users-by-batch?year=`, a param the route never reads
  (harmless: the probe asserts only the Stage-0 403).
- **lab-rest / fresh-code (decision E):** 22 lab-to-shipped clones on my files - `lab/chain-lines` <->
  `houses-chain.tsx` (9 clones: 63, 27, 17, 11, 8, 12, 10, 10, 9 lines), `lab/profiles/_chain-kit.tsx`
  <-> `houses-chain.tsx` (16, 11, 24), `lab/profiles/_variant-letterhead-2.tsx` <->
  `letterhead-profile.tsx` (39, 11, 8), `_variant-letterhead.tsx` (7) and `_variant-broadsheet.tsx`
  (10) <-> the same, `_variant-dossier.tsx` <-> `admission-stamp.tsx` (6), `lab/reach` <->
  `get-in-touch.tsx` (30, 14, 19), `lab/directory/_maps.tsx` <-> `alumni-map.tsx` (imports, 7).
  The letterhead's "keep in step, or retire the concept" header (`:6-9`) is the owner's (audit 2
  item 32).
- **bundle-build:** both of my routes carry the base-ui tooltip behind `VerifiedMark` (bundle-build-07)
  and the hoopoe rig (bundle-build-02: `NoResultsHoopoe` in `directory-client.tsx:29`, `NoSavedHoopoe`
  via `SavedPostsFeed`); -16 item 11 takes `phone.ts` off the stranger's profile.

## Metrics
- **Lines read:** ~12,700 in territory (cloc over the 51 files: 7,506 code, 4,488 comment, 736 blank;
  comment/code 0.60) plus ~1,700 of context (specs 1,531; `place-write`, `vcard`, `member-gate`,
  `people-select`, `image-cdn`, `validators` excerpt, `celebration-signals`, `person-detail` excerpt,
  `location-picker` excerpt).
- **Biggest files (total / code):** `letterhead-profile.tsx` 2,047 / 1,294; `alumni-map.tsx` 883 / 528;
  `directory-client.tsx` 823 / 532; `houses-chain.tsx` 757 / 408; `profile/[id]/page.tsx` 507 / 318;
  `pen.tsx` 456 / 248; `directory-rule.test.mjs` 437 / 268; `directory/page.tsx` 421 / 243;
  `get-in-touch.tsx` 382 / 240.
- **Comment-heaviest (comment/code):** `directory/select.ts` 2.12; `profile-card.tsx` 1.88;
  `profession-tags.ts` 1.85; `directory-grid.tsx` 1.27; `phone.ts` 1.24; `where.ts` 1.22;
  `city-scope.ts` 1.22; `stray-hair.tsx` 1.17; `users/search/route.ts` 1.14. All read; the only
  cuttable comments are the ones in -15.
- **Findings:** 17 - T1 5 (-13, -14, -15, -16, -17), T2 9 (-01 to -09), T3 3 (-10, -11, -12), T4 0;
  structural 12, cheap 5; owner 1 (-11), autonomous 16. Owner decisions: 2.
- **Projected savings, in their units:** ~19 DB statements and one RSC payload per autosave (-01);
  on a stranger's Photos tab, only the visible tiles at the 750 px rung instead of up to 60 files at
  1,920 px (-02); -1 query per year/tenure save (-06); -1 query per directory render (-09); ~1 KB raw
  off strangers' `/profile/[id]` (-16.11); ~270 source lines across the batches (-03 8, -04 20, -05 8,
  -06 20, -07 25, -08 30, -09 4, -13 20, -14 17, -15 ~30, -16 ~55, -17 ~35 = ~270); 0 jscpd clones
  (the repeats in -16/-17 sit under jscpd's floor; the 22 lab-to-shipped clones are decision E's);
  1 `any` (-17); 0 files deleted (-11 option c would delete one).
- **Charter-lead numbers:** the directory issues 8 concurrent reads plus 1 batched child query per
  render (7 after -09); `/profile/[id]` is the heaviest shipped route at 1,240 KB raw / 402 KB gz, and
  `/directory` third at 1,169 / 377 (bundle-build; per-route composition is theirs).
- **Six-signature sweep, per file** (1 single-use helper · 2 single-use internal type · 3 defensive
  try/catch · 4 needless intermediate · 5 option/abstraction with one caller · 6 narrating comment ·
  R = React-specific): `directory/page.tsx` - 4 (`filters` copy, -08); `where.ts` - clean;
  `select.ts` - clean; `actions.ts` - clean (M39 recovery pinned); `directory-client.tsx` - 5
  (`namesLocked` default), 6 (stale profession note), R: `useMemo` on a 44-item map and `useCallback`s
  whose consumers mostly get fresh inline arrows (no measurable benefit; not worth a finding), the
  props-to-state mirror is audit M36's; `directory-grid.tsx` - clean; `profile-card.tsx` - R: rebuilds
  `BirdAvatar`'s user object where `user={user}` would do (the same pattern catchups-ui-24 lists);
  `alumni-map.tsx` - 2 (`PinPerson`, -04), 6 (tooltip note, -15), `any` (-17); `map-cluster.ts` -
  exported-for-nothing `TAP_MIN_PX` (-17); `letterhead-profile.tsx` - 5 (`isOwnProfile` duplicating
  `draft`, -16), R: the redundant refreshes (-01); `get-in-touch.tsx` - duplicated keyed spans (-16);
  `houses-chain.tsx` - 1 (`yearRange`, a one-line wrapper used three times: tolerable), 6 (-15);
  `house-chain-editor.tsx` - 6 (-15); `pen.tsx` - clean; `profile-actions.ts` - 2 (the field list
  twice, -06), 3 repeated reads (-06); `contacts-editor.tsx` - literal shadow (-16);
  `saved-posts-feed.tsx` - 5 (`threshold`, -16), a `data.posts as PostData[]` cast (`:148`);
  `profile-author-feed.tsx` - clean; `admin-profile-tools.tsx` - duplicated with the panel (-11);
  `flag-person-dialog.tsx`, `admission-stamp.tsx`, `stray-hair*.ts(x)`, `letterhead-sheet.tsx` - clean;
  `profile/[id]/page.tsx` - raw full-size `<img>` (-02), dead fallback (-05); `profile/[id]/loading.tsx`
  - clean (one visual nit, For other lenses); `pick-bird/*`, `birds/page.tsx` - clean;
  `api/places/search` - 6 (stale, -15); `api/users/search` - clean; `api/users-by-batch` - 5 (-03);
  `city-coords.ts`, `city-scope.ts`, `houses.ts`, `search-log.ts` - clean; `place-input.ts` - detached
  docblock (-15), duplicated `countryName` (-17); `geocode.ts` - duplicated `countryName` (-17), its
  try/catch is a documented best-effort layer (keep); `house-spans.ts` - orphan docblock (-15);
  `contact-rows.ts` - 5 (the injected `formatPhone`, whose stated reason is stale, -16.11; the
  `source` parameter's odd indentation is cosmetic); `profession-tags.ts`
  - one stale sentence (-15); `phone.ts` - one stale count (-15).
- **Tool lines in territory:** knip 1 (`TAP_MIN_PX`); tsc-unused 0; madge cycles 0; jscpd 24 clones
  touching my files, of which 22 are lab-to-shipped (decision E: `lab/chain-lines` 9, `_chain-kit` 3,
  `lab/reach` 3, the letterhead variants 5, `_variant-dossier` 1, `lab/directory/_maps` 1), 1 is route
  boilerplate (`generateMetadata` signatures, letters vs profile) and 1 is the refuted paged-list
  pattern; the tick/copy repeat inside `get-in-touch.tsx` (-16.3) shows only as part of the reach
  clone; commented-out-code 1 hit (prose, `city-coords.ts:163`);
  type-sludge 8 hits: 1 prose false positive (`profession-tags.ts:250`), 1 `as unknown as` on the
  TopoJSON cast (`alumni-map.tsx:105`), 6 `eslint-disable`s - one guards the `useRef<any>` that -17
  removes, the other five carry their reasons (`no-img-element` on the Photos grid, three
  `exhaustive-deps` with explanations, the admin tools' hard navigation).
- **Uncommitted edits in territory:** none.
