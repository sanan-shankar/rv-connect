# directory-profile - refactor audit 2 report

Territory reader for the directory (map + batches + facets + profession tags), member profiles
(the 2,030-line letterhead), houses/batches, onboarding/welcome, places/gazetteer, and the
filters kit the directory is the main consumer of. Files in territory: 93 (5 directory route,
2 profile route, 2 welcome, 3 API routes, 3 directory components, 15 profile components, 8
onboarding, 10 filters, 4 common pickers, 22 lib modules, 5 scripts, 18 tests) plus the four
specs and the audit-1 report/fix log. Date: 2026-09-03. Read fully: 93 of 93 (~17,250 lines of
territory source, plus ~1,700 lines of spec and audit history).

## Coverage

- **Read fully**: every file in the charter, line by line, including `letterhead-profile.tsx`
  end to end in three passes, both directory server files, all three API routes, all eight
  onboarding files, the ten filters-kit files, the four common pickers, all 22 lib modules, the
  five scripts, and all 18 tests (for what they pin and which findings they gate).
- **Also read for grounding**: `docs/spec/directory.md`, `docs/spec/profile.md`,
  `docs/spec/hand-run-passes.md`, `docs/spec/person-row-audit.md`, `docs/planning/FEATURES.md`
  section 2, `.claude/skills/tag-professions/SKILL.md`, both profession migrations,
  `scripts/qa/hand-run-passes.test.mjs`, `scripts/dev/_env.mjs`, the audit-1 directory-profile
  report and the fix-prompt's outcome notes for its 14 findings; and for the cross-boundary
  questions, `identity-row.tsx`, `person-name.tsx`, `admin-person-row.tsx`,
  `feed/rail/directory-module.tsx`, `mascot/moments/one-shot.ts`,
  `posts/use-letter-persistence.ts`, `admin/use-admin-act.ts`, `settings/avatar-upload.ts`
  (head), and the fetch region of `posts/mention-dropdown.tsx`.
- **Measured, not guessed**: the per-route chunk lists in `raw/route-bundle-stats.json` were
  joined against the chunk files in `.scratch/audit2-build/.next/static/chunks/` (read-only) to
  attribute route-specific kilobytes to modules by their string literals. Every KB figure below
  comes from that join.
- **Skimmed**: nothing.
- **Not read**: the lab rooms that mirror this territory (`lab/directory/*`, `lab/profiles/*`,
  `lab/houses`, `lab/chain-lines`, `lab/location-picker`) beyond their import lines and
  headers; they are the lab lens's. `avatar-crop-dialog.tsx`, `attach-image-dialog.tsx`,
  `settings/actions.ts`, `admin/people/*` were opened only for import/consumer checks.
- **Uncommitted edits seen**: none in my territory. `git status --short` over every path in
  the charter was empty; the one modified file in the tree
  (`src/components/common/image-viewer.tsx`) is somebody else's and I did not open it.

## Summary

The territory is in the state audit 1 left it, plus one new feature (profession tags, three
files, one comment ratio of 1.85 that is entirely owner-quoted reasoning) and one chrome
rewrite (the sentence line). The structural well is not dry, but the water is kilobytes and
queries, not lines: **/profile/[id] is still the heaviest shipped route (1,258 KB first
load)** and its 45 KB route chunk still carries the delete-account dialog, the cities picker
popover, the owner-only Saved tab and the "Add it to your phone" tile for every stranger who
opens a profile; **/directory (1,231 KB) still statically imports the map**, so a 66 KB
d3-geo/d3-zoom chunk sits on the first load of a `?q=` link that never renders it; and
**/welcome (1,190 KB) loads all five wizard steps** on a screen that shows one sentence and a
button. Those three are the headline: roughly 66 KB removable outright from People-first
directory arrivals, ~115 KB deferrable on /welcome, and a second, honest cut of the letterhead
that audit 1's fix session declined to attempt (it split the leaves; the trunk is still edit
code on a read path).

Straight deletions are modest but real: `HousePicker` (190 lines) has no shipped caller, only
`/lab/houses`; two filters-kit files and `SortPill` are dead since the sentence line landed;
`HOUSE_OPTIONS` is dead since House lost its control; `otherCities` is computed and serialized
into every directory payload and read by nothing; `PERSON_SELECT` fetches a column nothing
draws under a comment that is false. Two audit-1 findings were only half applied (the person
type dedupe, the profile skeleton) and three of its stale-comment items are still in the tree.
Five small query wins on the profile and welcome pages (a user fetched twice, photos built for
a tab that does not exist on your own sheet, the first page of posts fetched after hydration,
houses fetched by an action the page already loaded). Structural vs cheap split: 18
structural, 9 cheap. What surprised me: the profession vocabulary's tagging-session `hint`
strings are in the /directory client chunk, contradicting the server comment that says they
never leave the server. What audit 1 left that is now moot: the Profession facet (its owner
decision was superseded by the tags, which are a real column now).

The six charter questions, in one line each, with the finding that carries the detail:
1. *Stranger's critical path on /profile/[id]*: ~900 of the letterhead's 2,030 lines are
   edit-only, plus `pen.tsx` (456), `contact-rows`, the avatar-upload hook, `SavedPostsFeed`
   with its hoopoe, the delete dialog's `Dialog`/`Input`/`signOut`, and CitiesPen's `Popover`
   rig (directory-profile-01).
2. *Profession vocabulary defined once*: yes, in `profession-tags.ts`; the picker copies it
   into the manifest at runtime by design, the skill and migrations restate nothing, the demo
   seed imports it. The only second copy is the lab's `_profession.tsx` FIELDS (lab lens). But
   the vocabulary with its session-only hints also ships to the browser (directory-profile-04).
3. *Filters-kit files with zero shipped importers*: `active-filter-chips.tsx` and
   `result-count.tsx` (zero importers anywhere); `SortPill` in `facet-select.tsx`. Nothing in
   the kit is lab-only: `/lab/directory` deliberately re-implements rather than imports
   (`_ui.tsx:6`). Two files are directory-only (`facet-search-select`, `range-facet-pill`); the
   rest are shared with admin, not Collection, which the kit's comments still name
   (directory-profile-06).
4. *Second member-row implementation*: yes, several, and already catalogued in
   `docs/spec/person-row-audit.md` (2026-08-19) with a proposal that still needs the owner's
   go-ahead; the list with line counts is under Owner decisions.
5. *onboarding-local vs the composer's draft persistence*: no. It duplicates
   `mascot/moments/one-shot.ts`'s per-user latch, not the letter crash-net; both already sit on
   `lib/local-storage.ts` (directory-profile-21).
6. *Unreachable in the place trio*: nothing by code; by data, `geocode.ts` and the
   `city-coords` ladder only fire for rows with null coordinates, which still arrive today
   (a place typed while the search is down), so they stay. The SELECT that would say how many
   legacy rows still need them is in Not-findings N-03. Structural vs cheap: 18 structural,
   9 cheap; 26 autonomous, 1 owner.

## Findings

### directory-profile-01 - Take the owner's tools out of the sheet every stranger downloads (the letterhead's second cut)
- **Where**: `src/components/profile/letterhead-profile.tsx` -- edit-only state and handlers
  `:362-411` and `:428-488`; the preload effect `:419-426`; the "reaching" block that replaces
  the tab strip in edit mode `:1346-1427` (ContactsEditor mount, dark-mode tile, `installNode`,
  export/delete links); the delete-account dialog and form `:1477-1559`; `CitiesPen`
  `:1960-2030`; the edit-only imports `:55-62` (Popover rig), `:63` (GetInTouch is read-path),
  `:66` (contact-rows), `:67-73` (pen.tsx), `:75` (SavedPostsFeed), `:81-101` (settings
  actions, Input, avatar-upload, Camera/X, callAction, profile-actions, saveOnboardingHouses,
  signOut, Dialog). Consumer: `src/app/(main)/profile/[id]/page.tsx:376-459`.
  Also `src/components/profile/get-in-touch.tsx:13-14,115-118` (both verify dialogs imported
  statically for the `lock` branch).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: The route's own chunk, `.next/static/chunks/09q2-gmyvxbq5.js` (45 KB raw,
  present on `/profile/[id]` only), contains the strings "Everywhere you call home"
  (CitiesPen), "Delete my account" and "Request your data" (the owner block), "Nothing saved
  yet" and "Tap the ribbon on any post" (SavedPostsFeed), and "Add it to your phone"
  (InstallAppTile) -- none of which a stranger can ever render. Audit 1's fix session split the
  five *leaf* editors behind `next/dynamic` (`:127-150`, measured 73 KB + 23 KB saved) and
  explicitly declined the trunk: "Split at the leaves rather than by extracting an 'edit half',
  because the editable and read-only branches in here render byte-identical boxes on purpose"
  (`:116-121`). That reasoning protects the *mirrored lockups* (colophon `:876-936`, name
  `:941-999`, occupation `:1011-1143`, facts `:506-610`, about `:1190-1219`, houses
  `:1236-1298`). It does not protect the pieces listed above, none of which has a read-only
  twin. Mapping the file by responsibility: header + imports 1-103; dynamic seams 105-150;
  `ProfileDraft` 160-194 (edit-only type); geometry constants 196-268; props 270-350; edit state
  and handlers 351-488 (edit-only, ~135 lines, all of which run for strangers because hooks
  cannot be conditional); facts 494-630 (105 editable / 20 read-only); stamp + circle measure
  632-671; action pill 673-736; the sheet 738-1329 (mirrored pairs, keep); under-sheet
  1331-1449 (reaching block edit-only 80 lines / Writing read); gated dialogs 1451-1561
  (edit-only 110 lines); admin/flag 1563-1568; PerchedBird 1577-1847 (read, with a `live` hook);
  Writing 1849-1952 (read); helpers 1954-2030 (CitiesPen edit-only 70 lines). Roughly 900 of
  2,030 lines are reachable only when `draft` is present, and `draft` is only ever passed on
  your own profile (`page.tsx:419-459`). `pen.tsx` (456 lines, `"use client"`) is imported
  statically and every use of `PenValue`/`PenBlock`/`PenSlot`/`SaveMark`/`useAutoSave` is
  inside an `editable` branch. `SavedPostsFeed` (233 lines) renders only on the owner's Saved
  tab (`:1888-1890`) yet imports `@phosphor-icons/react` and `NoSavedHoopoe` into the
  stranger's graph. `GetInTouch` statically imports `VerifyEmailDialog` and
  `MemberVerifyDialog` (`get-in-touch.tsx:13-14`), rendered only when `lock` is set; the chunk
  carrying it (`3rtx8w7ngzlsd.js`, 38 KB, profile-only) holds the string "You're verified. Try
  that again and it will go through."
- **What to do**: three moves, each independently shippable, in this order.
  (a) `SavedPostsFeed` -> `next/dynamic` (`ssr: false` is fine: it is behind a tab click on the
  owner's own sheet, never in the first paint), preloaded in the existing `editable` effect
  (`:419-426`). (b) The two lock dialogs in `get-in-touch.tsx` -> `next/dynamic` keyed on
  `lock`; a locked viewer is a minority and the dialogs open on a click. (c) A new client
  module, working name `letterhead-owner.tsx`, holding: `CitiesPen` (with its Popover imports
  and the `LocationPicker` dynamic), the reaching block `:1346-1427` as `<OwnerTools>` taking
  `contactRows/onChange/onCommit/deviceTheme/installNode/onDelete`, and the delete-account
  dialog `:1477-1559` with its four state hooks (`confirmDelete`, `deleting`, `deletePassword`,
  `deleteError`), `Dialog*`, `Input`, `signOut`, `requestAccountDeletion`, `callAction`. Load it
  with `dynamic(..., { ssr: false })` gated on `editable`, preloaded in the same effect. The
  form state (`form`, `places`, `houses`, `contactRows`) and the four `commit*` handlers stay in
  the parent because the mirrored facts row reads them; `useAvatarUpload` and `useAutoSave`
  stay because their hooks are called unconditionally. Do NOT touch the mirrored lockups.
  Keep `maxLength={FULL_NAME_MAX}` (`:967`) and `function commitPlaces` with its unconditional
  `router.refresh()` (`:452-466`) in `letterhead-profile.tsx`: `profile-editor-rule.test.mjs`
  reads both from that file by name.
- **Saving**: 0 net lines (about +30 for the seams); an estimated 10-14 KB raw of the 45 KB
  letterhead chunk plus SavedPostsFeed's share of the phosphor/hoopoe imports, and whatever
  share of the 38 KB GetInTouch chunk the two verify dialogs are, off every stranger's profile
  view. The exact number needs one `npm run analyze` after (c); I have not run one (the brief
  forbids it). The fix session should quote before/after `firstLoadUncompressedJsBytes` for
  `/profile/[id]` from `route-js.mjs` and note the fix-prompt's warning that `ssr:false`
  savings only show at the browser.
- **Risk & gate**: medium. `npm run check` (`profile-editor-rule.test.mjs` C-172 and C-045
  read `letterhead-profile.tsx` as text; `profile-email.test.mjs` reads `page.tsx`); `/profile`
  is NOT in `e2e/visual.spec.ts` ROUTES, so verify by hand at 1440 and 390 as Jerry (own sheet:
  Edit, every pen, cities popover, contacts rows, dark-mode tile, delete dialog opens and
  cancels, Saved tab) and as a stranger to Jerry (Get in touch, Photos tab, Flag); `?edit=1`
  still opens editing.
- **Confidence**: high that (a) and (b) are safe and worthwhile; medium-high on (c). The one
  thing that would change my mind on (c): if the owner reads any beat between pressing Edit and
  the contact rows appearing. The preload effect is what prevents it; verify on a throttled
  connection that the rows arrive with the pen, not after.
- **Notes**: This is the honest answer to "is the split honest": the leaves are dynamic, the
  trunk is not, and the trunk still holds ~900 lines of edit-only code plus `pen.tsx` whole.
  The full cut (editable JSX branches into a second file so `pen.tsx` and `contact-rows` leave
  the stranger's graph entirely) would save more but re-opens the geometry class of bug the
  file spent three owner rounds closing; I do not recommend it without the owner asking. Two
  smaller things worth fixing in passing: the two separate `lucide-react` imports (`:50`, `:84`,
  audit-1 F-14 said merge; still two) and the orphaned docblock at `:206-210` ("The identity
  lockup's geometry, declared once...") which describes `IDENTITY_VARS` forty lines below it,
  not the COLOPHON block it sits above. Related: directory-profile-14 (the Writing tab's
  first page), directory-profile-17 (dead props on GetInTouch/ProfileAuthorFeed).

### directory-profile-02 - Load the map component on demand; the 66 KB d3 chunk rides every directory arrival
- **Where**: `src/components/directory/directory-client.tsx:23` (static
  `import { AlumniMap, type CityPin, type PinPerson } from "./alumni-map"`), `:742-747` (the
  one render site, inside `browseView === "map"`); `src/components/directory/alumni-map.tsx:7-10`
  (d3-geo, d3-selection, d3-zoom, topojson-client).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `/directory` first load is 1,231 KB; of its route-specific chunks the largest is
  `191l0aock336-.js` at **66 KB raw, present on /directory only**, and it contains the
  `geoNaturalEarth1` and `scaleExtent` symbols (d3-geo + d3-zoom + d3-selection +
  topojson-client). A second 30 KB directory-only chunk holds the map component itself with the
  client and card. Audit 1's F-02 asked for both halves; the fix session moved the atlas JSON to
  a fetch (`alumni-map.tsx:83-101`, done, 105 KB) and left the component static (fix-prompt row
  269 lists the dynamic map as "optional"). Since then the view logic changed: a directory that
  opens with `?q=` or `?year=` starts on **People**, not the map (`directory-client.tsx:123-125`,
  "A first load already carrying a query or a batch year ... opens on People"), so every shared
  search link and every batch-tile drilldown reloaded via URL downloads 66 KB of d3 it never
  executes. On a bare `/directory` the map is the first view, and a dynamic chunk fetched in
  parallel after hydration costs one skeleton frame the loading box already reserves.
- **What to do**: `const AlumniMap = dynamic(() => import("./alumni-map").then((m) => m.AlumniMap), { ssr: false, loading: () => <div className="card-elevated relative flex-1 overflow-hidden rounded-[var(--radius)] border border-border" style={{ minHeight: 360, background: "var(--muted)" }} /> })`
  -- the same box `MAP_MIN_H` and the ocean colour the real map paints first (`:207`, `:470`),
  so the swap is "a world appearing on water", exactly what `directory/loading.tsx` already
  does for the page. Keep the two `type` imports as `import type` (they are erased). Preload
  on the Map segment hover if the owner sees a beat. Note `projection`/`pathGen` are computed
  at module top level (`:74-81`); with the dynamic import that parse moves off the route's
  critical path too.
- **Saving**: 66 KB raw client JS removed from the first load of every People-first arrival
  (`?q=`, `?year=`, batch tiles opened by URL), and moved off the critical path (parallel,
  after hydration) for map-first arrivals; 0 lines.
- **Risk & gate**: low-medium. `npm run check` -- `directory-rule.test.mjs` reads
  `alumni-map.tsx` as text for C-092/C-098 and reads `directory-client.tsx` for the Profession
  gate; neither pins the import statement. `npm run visual` on `/directory` both viewports (the
  map is masked as `live: "map"`, but the frame is not, so the loading box must match the
  card's border/radius). Click a pin, open the drilldown, go fullscreen, zoom to a cluster.
- **Confidence**: high. Would change my mind: nothing found; the atlas half already proved the
  map copes with a late-arriving backdrop.
- **Notes**: This is the bundle lens's territory by charter; I claim it because the evidence is
  a chunk I can name and the fix is one import in a file I own. The lab's `_maps.tsx` imports
  the same stack for `/lab/directory` (965 KB); same lever, lab lens's call.

### directory-profile-03 - /welcome downloads all five wizard steps to show one sentence and a button
- **Where**: `src/components/onboarding/onboarding-flow.tsx:43-47` (five static step imports),
  `:193-203` (one step rendered at a time); `steps/register-step.tsx:10-11` (LocationPicker,
  TagInput); `steps/houses-step.tsx:8` (HouseChainEditor -> houses-chain + house-picker +
  popover + sheet); `steps/photo-step.tsx:8-10` (AttachImageDialog, AvatarCropDialog,
  useAvatarUpload).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `/welcome` first load is 1,190 KB. Its route-specific chunks:
  `0_mmjokhy1byo.js` **53 KB** (LocationPicker + the combobox primitive; the strings "Search
  for a city or town", "Could not reach the place list"), `3pjjd0j35m8w1.js` **33 KB** (the
  register/houses/photo steps; "A few details for the register", "That doesn't look like a
  photo"), `3-rm-aar02utb.js` **29 KB** (HouseOptions + HouseTrail; the arrow path
  "M11.5 1.5 L15 5 L11.5 8.5"). All three arrive for the Welcome step, which renders a
  heading, one paragraph and a button (`welcome-step.tsx`). The register step needs the
  53 KB picker the moment it mounts, but that is one click later, and the houses and photo
  steps are two and three clicks later (teachers never see houses at all,
  `onboarding-flow.tsx:73-74`). This is also the profile's own pattern already
  (`letterhead-profile.tsx:127-150` + preload effect), so the idiom exists in the territory.
- **What to do**: In `onboarding-flow.tsx`, make `RegisterStep`, `HousesStep` and `PhotoStep`
  `next/dynamic` (server render is irrelevant: the flow returns `null` until its mount effect
  decides `ready`, `:83-125`, so nothing here is in the first HTML anyway). Preload the *next*
  step whenever `step` changes (`void import("./steps/register-step")` on mount of Welcome, and
  so on), so "Let's go" never waits. Keep `WelcomeStep` and `DoneStep` static (tiny).
- **Saving**: ~115 KB raw client JS deferred off the first load of `/welcome` (53 + 33 + 29,
  minus whatever the shared step shell is); ~0 lines. Every new member pays this once, on the
  slowest connection they will ever use the site on (a phone, straight after signup).
- **Risk & gate**: low. `npm run check`; walk the wizard as a fresh Jerry (`?step=register`,
  `?step=houses`, `?step=photo` deep links must still render immediately -- the `ready` latch
  at `:83` already handles deep links, and a dynamic step behind it shows its `loading` for one
  fetch); teacher account skips Houses. `/welcome` is not a visual-suite route.
- **Confidence**: high.
- **Notes**: The `HouseChainEditor` deferral on the profile keeps SSR because it is visible at
  rest (`letterhead-profile.tsx:131-135`); here nothing is, so `ssr: false` is correct for all
  three. Related: directory-profile-05 shrinks the 29 KB houses chunk further (HousePicker is
  dead weight inside it), directory-profile-10 removes the houses step's own fetch.

### directory-profile-04 - The profession vocabulary and its tagging-session hints ship in the /directory client chunk
- **Where**: `src/components/directory/directory-client.tsx:19` (`import { tagLabel } from "@/lib/profession-tags"`), `:314-326` (the one use: the chip label for an active `?profession=`);
  `src/lib/profession-tags.ts:43-93` (`PROFESSION_TAGS` with a `hint` string per entry);
  `src/app/(main)/directory/page.tsx:296-301` (the comment "Resolved on the server so the client
  never imports the whole vocabulary to render twelve strings").
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: The directory's route chunk `0kinxjn443emk.js` (30 KB) contains "Engineering
  that is not software: civil, mechanical, electrical", "Medicine, nursing, public health,
  veterinary, mental health", "Still in full-time education" -- the `hint` strings whose own
  doc says "`hint` is for the tagging session, not for the UI" (`profession-tags.ts:38-40`).
  They are there because `tagLabel` reads `TAG_LABELS`, which is built from `PROFESSION_TAGS`,
  and a `const` array of object literals cannot be tree-shaken field by field. `TAG_RULES` is
  NOT in the chunk (it is a separate export and was shaken), so this is the 17 hints plus the
  labels/values/parents: roughly 2 KB raw. Small, but the server comment that says the client
  never imports the vocabulary is false, and a session reading it will believe it.
- **What to do**: In `page.tsx`, add `professionLabel: params.profession ? tagLabel(params.profession) : ""`
  to `initialFilters` (beside `profession`); in `directory-client.tsx` read
  `initialFilters.professionLabel` for the token at `:323` and delete the import at `:19`.
  **Move the pin**: `directory-rule.test.mjs:307-311` asserts
  `label: tagLabel(initialFilters.profession)` in CLIENT; change it to assert the server
  computes the label (`professionLabel:.*tagLabel\(` in PAGE) and the client reads it, in the
  same commit. Then the comment at `page.tsx:296-301` becomes true.
- **Saving**: ~2 KB raw client JS off every /directory load; one false comment made true.
- **Risk & gate**: low. `npm run check` (the moved pin); open `/directory?profession=law`
  and `/directory?profession=environment` (below the floor: the chip must still read
  "Environment" and clear).
- **Confidence**: high on the diagnosis (string present in the chunk); high on the fix.
- **Notes**: This also answers the charter's vocabulary question honestly: defined once in
  TypeScript, copied into the manifest by the picker (by design, hand-run-passes.md "Carries
  the vocabulary and the rules inside the manifest"), restated by neither the skill nor the
  migrations, imported by the demo seed -- and, until this lands, also shipped to every
  member's browser.

### directory-profile-05 - `HousePicker` has no shipped caller; only /lab/houses renders it
- **Where**: `src/components/common/house-picker.tsx:52-231` (`HousePicker`), `:237-242`
  (`TRIGGER_CLASS`, used only by it); the sole render site `src/app/lab/houses/_houses.tsx:59`;
  the only shipped import is `HouseOptions` from `src/components/profile/house-chain-editor.tsx:36`.
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "<HousePicker" src` finds one JSX site, in the lab. The two other
  textual hits are comments (`houses-step.tsx:23`, describing the year-row editor it replaced;
  `use-wide-viewport.ts`). The chain editor replaced the year-row picker on 2026-08-07
  (`house-chain-editor.tsx:24-31`: "THE PANEL IS THE SHIPPED ONE. <HouseOptions> is the same
  body the year-row picker has always used"); the wrapper that hung that panel off a year row
  survived in `components/common/` with a 30-line docblock describing an interaction nothing
  shipped runs. It rides in `/welcome`'s 29 KB houses chunk and the owner's dynamic editor
  chunk because `house-picker.tsx` is one module.
- **What to do**: Move `HousePicker` + `TRIGGER_CLASS` + its docblock to
  `src/app/lab/houses/_house-picker.tsx` (the room keeps it; it is owner-approved design
  history); rename what remains `src/components/common/house-options.tsx` exporting
  `HouseOptions`; update the two importers (`house-chain-editor.tsx:36`, the lab). Update the
  `houses-step.tsx:23` comment to say "a HousePicker (now lab-only)".
- **Saving**: ~190 lines out of shipped components (net 0 moved); ~4-5 KB raw off the
  `/welcome` houses chunk and the profile's editor chunk (the lab room pays it instead, which
  is where it is used).
- **Risk & gate**: low. `npm run check` (lab registry audit unchanged: no new room); open
  `/lab/houses` (both iframes), `/welcome?step=houses` as Jerry, and Edit on Jerry's profile
  and tap a house.
- **Confidence**: high.
- **Notes**: This also dissolves the one real duplication in the houses-chain/editor pair the
  charter asked about: the Popover-on-wide / Sheet-on-narrow shell with the "Which house in
  {year}?" title exists twice, in `HousePicker` (`house-picker.tsx:162-230`) and in the editor
  (`house-chain-editor.tsx:288-313`). With the picker in the lab, the shipped code has one.
  The pair otherwise shares nothing beyond `HouseTrail` and `HOUSE_INK`, which is the right
  seam; I did not re-litigate `houses-chain.tsx`'s size (N-01).

### directory-profile-06 - Filters kit: two dead files, one dead component, and comments that name a consumer the kit no longer has
- **Where**: `src/components/common/filters/active-filter-chips.tsx` (61 lines, whole file),
  `result-count.tsx` (19, whole file), `facet-select.tsx:110-146` (`SortPill`) and `:28-61`
  (`FacetOptionsPopup`'s `anyItem?` optional exists only for SortPill); stale references:
  `pill-shell.tsx:10` ("RangeFacetPill, SortPill"), `filter-sheet.tsx:10-11` ("Same shell for
  Directory and Collection") and `:58` ("Kept identical to the Clear all in
  active-filter-chips.tsx, its desktop twin"), `sentence-line.tsx:120-121` ("Matches its twins
  in active-filter-chips.tsx"), `types.ts:1-2` ("Shared types for the Directory + Collection
  filter kit").
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip lists both files as unused and `SortPill` as an unused export; confirmed
  by grep across `src`, `scripts`, `e2e` including the lab: zero importers of either file, zero
  JSX uses of `SortPill`. `git log -S` puts the last real importer of `ActiveFilterChips` and
  `ResultCount` at `bfabfea feat(directory): the filter chrome becomes one sentence` and of
  `SortPill` at `8a0ba37 feat(collection): the archive is a river` -- the Collection left the
  kit that day and now owns its own river controls, so the kit's second consumer is **admin**
  (`admin-filter-bar.tsx`, `content-list.tsx`, `people-list.tsx` import facet-select,
  filter-popover, filter-sheet, sentence-line, types), not Collection. The lab room
  deliberately does not import the kit (`lab/directory/_ui.tsx:6`: "Deliberately NOT importing
  src/components/common/filters/*"), so there is no lab-only file to report.
- **What to do**: delete the two files and `SortPill`; make `anyItem` a required prop of
  `FacetOptionsPopup` (or inline the popup into `FacetSelect`, its only remaining caller);
  rewrite the four comments to name admin as the second consumer and drop the "twin"
  references. `PILL_SET` stays (sentence-line uses it).
- **Saving**: 2 files, ~115 lines (61 + 19 + 37 SortPill + the optional-prop plumbing).
- **Risk & gate**: low. `npm run check` (knip's unused-file count drops by two; no test names
  these); `npm run visual` on `/directory` (no pixel changes expected); open the admin People
  and Content lists and their filter sheet at 390.
- **Confidence**: high.
- **Notes**: The four facet pills still carry four copies of the same trigger block
  (`facet-select.tsx:96-103`, `facet-search-select.tsx:90-97`, `range-facet-pill.tsx:65-72`,
  and SortPill's); with SortPill gone that is three, differing only in the Base UI primitive
  (`Select.Trigger` vs `PopoverTrigger`). A `FacetTrigger` taking a `render` prop would fold
  them, ~20 lines; I list it under directory-profile-26 as cheap and optional, because the
  three primitives are the coupling cost the brief says to weigh.

### directory-profile-07 - `HOUSE_OPTIONS` is dead and `directory-facets.ts` is now an 8-line config file with one consumer
- **Where**: `src/lib/directory-facets.ts:14` (`HOUSE_OPTIONS`), `:11` (its `HOUSES` import),
  `:16-19` (`TYPE_OPTIONS`), `:1-9` (a header explaining what is NOT in the file); consumer
  `src/components/directory/directory-client.tsx:18,354,465`.
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip flags `HOUSE_OPTIONS`; grep confirms zero readers since
  `37e6f32 feat(directory): one chrome row, search on the title line, Profession for House`
  (the owner, 2026-08-28: "remove filtering by house", quoted at `directory-client.tsx:341-345`).
  What is left is a two-entry array (`TYPE_OPTIONS`) whose only reader is `directory-client.tsx`
  and whose name collides with a different `TYPE_OPTIONS` in `src/lib/admin-content.ts:19`.
  The file's nine-line header lists four things that are deliberately not in it, which is a
  tell that the file has stopped being a place.
- **What to do**: delete `HOUSE_OPTIONS` and the `HOUSES` import; move `TYPE_OPTIONS` into
  `directory-client.tsx` above `batchRangeText` (keeping the `FacetOption` type import from the
  kit); delete `directory-facets.ts`. Keep the one sentence worth keeping from the header (City
  and Profession are live option sets from `page.tsx`) as a comment on the moved constant.
- **Saving**: 1 file, 19 lines.
- **Risk & gate**: low. `npm run check`; `/directory`, open Filters, pick Type: Teachers.
- **Confidence**: high.

### directory-profile-08 - The directory person type is hand-written four times, one fetched column is never drawn, and the comment that defends it is false
- **Where**: `src/app/(main)/directory/select.ts:15-22` (`PERSON_SELECT`; `workplace: true` at
  `:21`; the comment at `:17-18` "BirdAvatar ignores this (see its banner) but DirectoryUser
  still declares it, so the column is fetched to satisfy a type rather than a pixel" on
  `currentCity`); `src/app/(main)/directory/actions.ts:10-22` (`DirectoryUser`, imported
  nowhere); `src/components/directory/directory-client.tsx:28-39` (`interface User`);
  `src/components/directory/profile-card.tsx:44-57` (inline props type);
  `src/app/(main)/directory/page.tsx:23-35` (`PinRow`, a hand copy of `PIN_SELECT`'s shape).
  jscpd: `alumni-map.tsx [30:25-40:27]` = `directory-client.tsx [28:16-38:27]` =
  `profile-card.tsx [45:9-56:4]` (= `post-card.tsx [139:9-147:30]`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Audit 1's F-09 asked for two things: one `PERSON_SELECT` (done, `select.ts`,
  commit `ab82f30`) and one person type (not done; the fix-prompt row 230 folded it into the
  select constants work and only the select landed). Today: `ProfileCard` reads `currentCity`
  (`profile-card.tsx:68`, `shortPlaceLabel(user.currentCity)`), so the `select.ts:17-18`
  comment is wrong -- that column IS a pixel (the card's city). `workplace`, by contrast, is
  fetched for every one of the 60 rows per page and read by nothing: neither `interface User`
  nor `ProfileCard` declares it; `DirectoryUser` declares it and `DirectoryUser` has no
  importer. `PinRow` restates `PIN_SELECT` field by field.
- **What to do**: in `select.ts`: drop `workplace: true`; replace the comment; add
  `export type DirectoryPerson = Prisma.UserGetPayload<{ select: typeof PERSON_SELECT }>` and
  `export type PinRow = Prisma.UserGetPayload<{ select: typeof PIN_SELECT }>` (import `Prisma`
  from `@/generated/prisma/client`; `select.ts` is server-safe and already imports from
  `people-select`). Delete `DirectoryUser` in `actions.ts` and type the return as
  `DirectoryPerson[]`; delete `PinRow` in `page.tsx`; have `directory-client.tsx` and
  `profile-card.tsx` import `DirectoryPerson` (the card can `Pick` the eight fields it reads).
  `PinPerson` in `alumni-map.tsx` legitimately differs (see directory-profile-09) and stays,
  but it can extend `Pick<DirectoryPerson, ...>`.
- **Saving**: 1 column per row per page (60 per first page, 60 per Load more); ~35 lines
  across four files; the page/action pair becomes drift-proof by construction.
- **Risk & gate**: low. `npm run check` -- `directory-rule.test.mjs` reads `page.tsx` for
  `cities: [city]` and `existing.cities.includes(city)` (unchanged); none of the pins name the
  types. Browse `/directory`, filter, Load more, open a pin.
- **Confidence**: high.
- **Notes**: `Prisma.UserGetPayload` in a client component file (`directory-client.tsx`) is a
  type-only import and erases; `import type { DirectoryPerson } from "@/app/(main)/directory/select"`
  is the safe spelling.

### directory-profile-09 - `otherCities` is computed and serialized into every directory payload and read by nothing
- **Where**: `src/app/(main)/directory/page.tsx:88-92` (comment), `:113` (`allMappedCities`),
  `:125-130` (`otherCities` on every `PinPerson`); `src/components/directory/alumni-map.tsx:41-45`
  (the type field and its comment "Kept for matching only; the drilldown no longer displays an
  'Also in ...' line (owner call, 2026-07)").
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn otherCities src` returns exactly those five lines: the producer and
  the type. Nothing in `alumni-map.tsx`'s drilldown (`:803-822`) or anywhere else reads it. The
  comment says it was kept "for matching", but no matching code exists. The page's own B-092
  note (`:132-141`) explains that everything in `people` is serialized into the RSC payload of
  every directory load and every filter change -- this field is part of that payload, one
  string array per person per pin, for a person with several cities.
- **What to do**: delete `:113` and `:125-130`'s `otherCities` (keep `currentCity: city`),
  delete the type field and comment at `alumni-map.tsx:41-45`, trim the comment at
  `page.tsx:88-92` to its first sentence.
- **Saving**: ~13 lines; bytes off every directory RSC payload (small today: 12 people per pin
  at most; it scales with members who list several cities, which the owner explicitly wants).
- **Risk & gate**: low. `npm run check` (`directory-rule.test.mjs` C-098 pins `cities: [city]`
  and `existing.cities.includes(city)`, which are the pin's `cities`, not `otherCities`);
  open a pin whose person lists two cities.
- **Confidence**: high.

### directory-profile-10 - The houses step fetches, through a server action and a skeleton, a column the page already loaded
- **Where**: `src/components/onboarding/steps/houses-step.tsx:53-79` (state, `useEffect`,
  `callAction(getOnboardingHouses)`, `parseHouseYearEntries`), `:120-124` (the skeleton);
  `src/components/onboarding/actions.ts:162-181` (`getOnboardingHouses`, 20 lines, its only
  caller is that effect); `src/app/(main)/welcome/page.tsx:29-48` (the page's `select`, which
  has no `houses`); `src/components/onboarding/types.ts:15-28` (`OnboardingUser`).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The page fetches the user once (`welcome/page.tsx:29`) and hands eleven fields
  to the flow. The houses step then makes a second round trip on mount to read a twelfth
  (`houses`) from the same row, showing a two-bar skeleton meanwhile. The profile does the
  obvious thing instead: `houses: parseHouseYearEntries(user.houses)` in the page
  (`profile/[id]/page.tsx:439`). `welcome/page.tsx:55-66` explains that the page re-runs after
  every server action invoked from it, so `user.houses` would be fresh after the register step
  saves, exactly as `admissionNumber` is.
- **What to do**: add `houses: true` to the page select; add `houses: HouseYearEntry[]` to
  `OnboardingUser` and pass `parseHouseYearEntries(user.houses)` from the page; in
  `houses-step.tsx` replace the effect/`loading` state with `useState(user.houses)` and delete
  the skeleton branch; delete `getOnboardingHouses` and `GetHousesResult` from `actions.ts`.
- **Saving**: 1 server action (20 lines) + ~28 lines in the step; 1 query and one skeleton
  flash per houses-step mount.
- **Risk & gate**: low. `npm run check`; `/welcome?step=houses` as Jerry with saved houses
  (they appear immediately, no skeleton), pick a house, Save & continue, Back, the chain is
  still there.
- **Confidence**: high.

### directory-profile-11 - Onboarding is the third places writer, and it hand-rolls the transaction `place-write.ts` says has "exactly two writers"
- **Where**: `src/components/onboarding/actions.ts:78-108` (the `$transaction`: user update +
  `userPlace.deleteMany` + `userPlace.createMany`); `src/lib/place-write.ts:7-9` ("There are
  exactly two writers -- a member editing their own in /settings, and an admin editing
  someone's on the person page") and `:27-51` (`replaceUserPlaces`); the other two writers
  `src/components/settings/actions.ts:41-46` and `src/app/(main)/admin/people/actions.ts:217-221`,
  both of which call `resolvePlaces` then `replaceUserPlaces`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `place-input.test.mjs:174-217` ("every place writer mirrors the legacy columns
  from the one helper") already counts three writers and explicitly allows a writer to
  *delegate* to `replaceUserPlaces` (`delegates = /replaceUserPlaces\(/`). Onboarding does not
  delegate; it re-implements wipe-and-recreate with `createMany` (the other two use `create`
  per row) inside a transaction that also writes `admissionNumber`, `workplace`, `jobTitle`,
  `subjects`. The `place-write.ts` header is therefore false, and the `/settings` it names no
  longer exists either.
- **What to do**: give `replaceUserPlaces` an optional third argument
  `userData?: Prisma.UserUpdateInput` merged into its own `prisma.user.update` (one
  transaction, atomicity kept), then have `saveOnboardingRegister` call
  `replaceUserPlaces(userId, cleanedPlaces, { admissionNumber: ..., workplace, jobTitle, subjects })`
  and delete `:78-108`. Rewrite the header at `place-write.ts:7-9` to "three writers -- sign-up,
  the profile's cities pen, and the admin person page".
- **Saving**: ~25 lines in onboarding; one fewer copy of the wipe-and-recreate; a false comment
  made true.
- **Risk & gate**: low-medium. `npm run check` -- `place-input.test.mjs` must still count 3
  writers (delegation counts) and must find no hand-rolled `currentCity:` mirror; run
  `/welcome?step=register` as Jerry, save two cities, reload, both present in order.
- **Confidence**: high.
- **Notes**: The comment block at `onboarding/actions.ts:24-30` ("Three writers, one gate")
  already knows there are three; only `place-write.ts` was never updated.

### directory-profile-12 - Own-profile views build a Photos grid for a tab that does not exist on your own sheet
- **Where**: `src/app/(main)/profile/[id]/page.tsx:186-196` (`photoPosts` findMany, `take: 60`,
  `photos` flatten), `:351-372` (`photosNode`, up to 60 `<Link><img>` nodes), `:408-410`
  (`photoCount`, `photosNode` props); `src/components/profile/letterhead-profile.tsx:1884-1891`
  (the fourth tab is Saved on your own sheet, Photos on anyone else's).
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `Writing`'s TABS array picks `isOwnProfile ? saved : photos`; `photosNode` and
  `photoCount` are read only inside `tab === "photos"`. On your own profile the query runs, the
  grid is built server-side, serialized into the RSC payload, and never mounted.
- **What to do**: wrap the query and the node in `!isOwnProfile` (`const photos = isOwnProfile ? [] : ...`),
  pass `photoCount={photos.length}` and `photosNode={isOwnProfile ? null : photosNode}` as
  before. Consider a second step for strangers too: the grid is serialized eagerly on every
  stranger view though the tab is behind a click; a client fetch on first open (the same shape
  as `ProfileAuthorFeed`) would move it off the payload -- but see directory-profile-14, which
  argues the opposite direction for the posts list, so weigh them together.
- **Saving**: 1 query per own-profile view (the most visited profile for any member is their
  own); up to 60 image nodes off that payload; 0 lines.
- **Risk & gate**: low. `npm run check`; Jerry's own sheet shows Saved, a stranger's shows
  Photos with the grid.
- **Confidence**: high.

### directory-profile-13 - The profile page looks the member up twice per view
- **Where**: `src/app/(main)/profile/[id]/page.tsx:28-50` (`generateMetadata`: `auth()` +
  `prisma.user.findUnique` for `name/isBlocked/deletionRequestedAt`), `:121-125` (the page's
  `findUnique` with `omit: { password: true }` and `places`).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Next dedupes `fetch()` between `generateMetadata` and the page, not Prisma
  calls; `auth()` is `cache()`d (audit 1 established this) but the two `findUnique`s are two
  round trips to Mumbai on every profile view. The metadata query's three columns are a subset
  of the page's.
- **What to do**: `const getProfileUser = cache(async (id: string) => prisma.user.findUnique({ where: { id }, omit: { password: true }, include: { places: { orderBy: { position: "asc" } } } }))`
  at module scope (React `cache`, the pattern `next-devtools` docs recommend for exactly this
  pair); call it from both. The metadata's Stage-1 check stays as is (it only reads the
  session).
- **Saving**: 1 query per profile view; ~4 lines.
- **Risk & gate**: low. `npm run check`; `profile-email.test.mjs` reads `page.tsx` for
  `user.showEmail ?` and the vCard line (unchanged); tab title still shows the name for a
  confirmed viewer and "Profile" for an unconfirmed one.
- **Confidence**: high.

### directory-profile-14 - The Writing tab fetches its first page after hydration, the shape audit 1 closed on /collection
- **Where**: `src/components/profile/profile-author-feed.tsx:71-92` (mount `useEffect` calling
  `loadPosts({ authorId, kind })`), `:123-153` (the skeleton it shows meanwhile, sized from
  `expectedCount`); the page that could have rendered it: `src/app/(main)/profile/[id]/page.tsx`
  (which already runs `loadPosts`'s own audience builder to count the posts, `:149-178`).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: The page counts posts and letters server-side (`:180-185`) and hands the counts
  down so the skeleton can be honest about its height (the `expectedCount` machinery, `:34-46`,
  exists to hide this round trip). The list itself arrives only after the client mounts, calls
  the server action, and re-renders: one extra request and one skeleton on every profile view.
  Audit 1's fix log (fix-prompt "member-surfaces FOL / critic-1") re-refuted this for
  `/directory` because it seeds from server props, and fixed it for `/collection`; the profile's
  author feed was not on that list.
- **What to do**: have `page.tsx` call the same loader the action uses (the query behind
  `loadPosts` in `feed/actions.ts:1135` -- a `"use server"` export can be invoked from a server
  component, or extract its body to a plain function if the feed lens prefers) for the "all"
  scope and pass `initialPosts`/`initialCursor`/`initialHasMore` to `ProfileAuthorFeed`; keep
  the effect for the Posts/Letters scopes, which the segmented switcher remounts with a fresh
  `key`. With the first page in props, `expectedCount` is only needed for the two filtered
  scopes.
- **Saving**: 1 round trip and one skeleton flash on every profile view; ~0 lines (the
  `expectedCount` doc shrinks).
- **Risk & gate**: medium. `npm run check`; Jerry's profile and a stranger's at both viewports,
  switch All/Posts/Letters, Load more; the count pill and the list must still agree
  (`f47102a fix(profile): the feed opens at the height it is going to be` is the last time this
  pair was tuned).
- **Confidence**: medium-high. Would change my mind: if the feed lens rules that `loadPosts`
  must stay action-only; then the extraction is theirs to sequence.
- **Notes**: Cross-boundary with feed-posts (the charter says the PostFeed reuse is theirs).
  `SavedPostsFeed` has the same effect-fetch shape but is owner-only and behind a tab; leave it.

### directory-profile-15 - `admin-actions.ts` lives under `components/profile/` but three of its eight actions are report/post moderation used only by admin
- **Where**: `src/components/profile/admin-actions.ts:226-305` (`adminHidePost`,
  `settleReport`, `adminDismissReport`, `adminResolveReport`), whose only importer is
  `src/components/admin/reports/report-list.tsx`; `:22-224` (block/delete/note/verify/unverify),
  imported by `admin/people/person-detail.tsx`, `admin/people/people-list.tsx`,
  `app/(main)/admin/people/actions.ts`, and `profile/admin-profile-tools.tsx`.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: consumer grep above. The admin area's own `app/(main)/admin/people/actions.ts`
  reaches into `components/profile/` for `adminDeleteUser`; the reports queue reaches into the
  profile folder for actions that have nothing to do with a profile. The file's own comment
  (`:17-19`) records that the guard "moved to src/lib/admin.ts on 2026-08-19, when the admin
  rebuild added a second and third file of these actions" -- the actions themselves never
  moved.
- **What to do**: move the three moderation actions into the admin reports area (beside
  `report-list.tsx`, or into `src/lib/admin-threads-server.ts`'s neighbourhood); move the five
  user actions to `src/app/(main)/admin/people/actions.ts` (already `"use server"`, already
  imports one of them) and have `admin-profile-tools.tsx` import from there. Drop the
  `const requireAdmin = requireAdminAction` alias (`:20`) while there.
- **Saving**: 0 lines; a file in the right folder; `components/profile` stops exporting
  moderation.
- **Risk & gate**: low. `npm run check` -- `gate-coverage.test.mjs` and
  `security-regressions.test.mjs` walk `"use server"` files by path for the admin guard; the
  fix session must confirm the moved file is still in their glob (state which pin names the
  path). Verify/block/delete from a stranger's profile as admin, dismiss/resolve a report.
- **Confidence**: high on the diagnosis; medium on which pins name the path (I did not read
  those two suites; they are the auth lens's).

### directory-profile-16 - `AdminProfileTools` hand-writes the busy/try/toast pattern four times that `useAdminAct` was extracted to replace
- **Where**: `src/components/profile/admin-profile-tools.tsx:40-107` (four handlers, each with
  its own `try/catch`, `toast.error("Something went wrong. Please try again.")`, and a local
  state mirror: `blocked`, `verified`, `verifying`, `saving` at `:32-36`);
  `src/components/admin/use-admin-act.ts:8-17` ("Nine functions across six files wrote this
  out ... here it is one line that cannot be forgotten").
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The hook's own docblock counts the copies it replaced; this file was missed
  because it lives under `profile/`, not `admin/`. Three of the four handlers also skip
  `callAction`, so a rejected action (deploy skew) surfaces as the generic catch rather than
  the app's standard message; and `blocked`/`verified` mirror server truth in local state
  instead of `router.refresh()`, which is the bloat signature the brief names (state that
  could be derived; the props are already re-fetched by `revalidatePath` in the actions).
- **What to do**: `const { busy, act } = useAdminAct()`; each button calls
  `act("verify", () => adminVerifyUser(userId), "Member verified")` etc.; delete the four
  handlers and the two mirror states (`isBlocked`/`verifyState` props drive the labels after
  refresh); keep `handleDelete`'s hard navigation via `act`'s `onDone` option.
- **Saving**: ~45 lines; one fewer copy of B-042's `finally`.
- **Risk & gate**: low. `npm run check`; as admin on Jerry's profile: verify, unverify, block,
  unblock, save a note, cancel a delete.
- **Confidence**: high.

### directory-profile-17 - Options every caller leaves at the default (six props across five files)
- **Where**: `src/components/profile/get-in-touch.tsx:51-52,58-59` (`showSave = true`,
  `size = "sm"`), `:95,97,103` (three size ternaries), `:101-106` (the outer Save contact
  button): the only caller passes `showSave={false} size="default"` both times
  (`letterhead-profile.tsx:726-735`). `src/components/profile/profile-author-feed.tsx:25,54,119,126-131,135-139,176-180,186`
  (`layout` and its "sheet" branches; the only caller passes `"cards"`), `:23,163` (`emptyBody`,
  never passed). `src/components/profile/admission-stamp.tsx:21-22,31` (`className`, never
  passed). `src/components/profile/contacts-editor.tsx:87-90` (re-exports of
  `buildRows`/`rowsToPayload`/types "so the profile keeps importing its editor's vocabulary
  from the editor" -- the profile imports from `@/lib/contact-rows` directly,
  `letterhead-profile.tsx:66`). `src/components/directory/directory-client.tsx:396,423`
  (`fullWidth` parameter; all four call sites `:546-547,613-614` pass `true`).
  `src/components/common/location-picker.tsx:56,189,340` (`disabled`; no caller passes it).
- **Phase**: placeholder
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: grep of every JSX site for each component (listed in Coverage's consumer
  checks): one caller each, always the non-default value or never the prop.
- **What to do**: remove the props and their dead branches; in `get-in-touch.tsx` hard-code
  `size="default"` and delete the outer Save button (the dialog keeps its own); in
  `profile-author-feed.tsx` keep the "cards" rendering only; delete the four re-export lines
  and their comment in `contacts-editor.tsx`; fold `renderPrimaryFacets`/`renderSecondaryFacets`
  into one `renderFacets(compact)` (they are always called together in the same order, and the
  comment above them `:392-395` describes a "desktop toolbar row" and a "More filters"
  disclosure that no longer exist, `filter-popover.tsx:14-26`).
- **Saving**: ~70 lines across six files.
- **Risk & gate**: low. `npm run check`; profile Get in touch (stranger, locked email, locked
  member), the Writing tab, the directory Filters popover and sheet.
- **Confidence**: high.
- **Notes**: `GetInTouch`'s JSDoc `:38-39` still names "Letterhead II's masthead"; the shipped
  sheet is the letterhead, full stop.

### directory-profile-18 - `LocationPicker` ships a `mode="single"` that only the lab harness renders
- **Where**: `src/components/common/location-picker.tsx:62-74` (the discriminated props
  union), `:192-196` (`initialQuery`, `lastAppliedRef`), `:200-206` (the sync effect),
  `:250-258` (the single branch of `handlePick`), `:288-295` (`clearSingle`, `showClear`),
  `:352-366` (the clear button); callers: `register-step.tsx:130-136`,
  `letterhead-profile.tsx:2018-2024`, `admin/people/person-detail.tsx:603-604` -- all
  `mode="multi"`; `src/app/lab/location-picker/page.tsx:41` is the only `mode="single"`.
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: owner
- **Evidence**: grep above. The header comment `:40-41` still says "Wiring to onboarding /
  settings / directory happens in a later phase; this file is deliberately standalone", which
  was true in July. Single mode is ~55 lines of state, an effect and a branch that ride in the
  53 KB `/welcome` chunk, the admin person page and the profile's cities popover, exercised by
  nothing a member can reach.
- **What to do**: owner call, because `/lab/location-picker` is registered design history that
  "demonstrates both modes" (`page.tsx:8-9`). If the room may lose the single demo (the shipped
  product never used it), delete the mode: `value: PlaceSelection[]`, `onChange(next[])`, no
  union, no sync effect, no clear button; the lab page keeps its multi demo. If not, leave it
  and only fix the stale header.
- **Saving**: ~55 lines and one effect; a simpler props contract; ~1-2 KB raw off three
  routes.
- **Risk & gate**: low. `npm run check` (lab registry unchanged); `/lab/location-picker`,
  `/welcome?step=register`, Jerry's cities popover, admin person page cities.
- **Confidence**: high on the facts; the decision is the owner's.

### directory-profile-19 - Eight copies of the demo project ref and the same twenty-line script preamble
- **Where**: `scripts/dev/tag-professions-pick.mjs:34-41` (argv `flag`/`value` helpers),
  `:60-78` (env read, `DEMO_REF`, the refusal, the pg client); `scripts/dev/tag-professions-apply.mjs:41-52,58-73`
  (the same); the literal `"cbvlzptghkuxhygyaezq"` also in `run-sql.mjs:52`,
  `tag-photos-pick.mjs:63`, `tag-photos-apply.mjs:59`, `backfill-image-dimensions.mjs:51`,
  `sweep-stranded-originals.mjs:56`, and `scripts/demo/apply-schema.mjs:25` (as
  `EXPECTED_REF`); jscpd clones at `raw/jscpd.txt` lines 26-57 (pick/apply/photos/backfill
  pairs).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `hand-run-passes.md` says a third pass copies the closest pair, and the
  `hand-run-passes.test.mjs` pins the *shape* (`database: envFile` in the picker, `--apply`,
  `--undo`, `applied-` in the applier, no UPDATE/INSERT/DELETE in a picker). None of those pins
  names the argv helpers, the `DEMO_REF` literal or the refusal sentence, so the protocol does
  not require them to be copied. `_env.mjs:19-23` refuses to become a shared *database opener*
  for a stated reason; a shared *guard* (a constant and a `refuseWrongDatabase(envFile, url)`
  that exits) and the two five-line argv helpers are not that, and are the same text in eight
  files. A project ref that changes (a new demo project) is today an eight-file edit.
- **What to do**: in `scripts/dev/_env.mjs` add `export const DEMO_REF`,
  `export function refuseUnlessDemo(envFile, url)` (the exact three lines the scripts carry),
  and `export function argv()` returning `{ flag, value }`; replace the copies. Keep every
  script's own comment about *why* it refuses (those differ and are earned). Leave
  `scripts/demo/apply-schema.mjs` to the scripts lens (it has a wall against `scripts/dev`
  imports by design; note the ref there too).
- **Saving**: ~7 clones, ~50 lines across five `scripts/dev` files; one place for the demo ref.
- **Risk & gate**: low. `npm run check` (`hand-run-passes.test.mjs` and
  `scripts-ledger.test.mjs` must stay green; the `database: envFile` literal must remain in
  each picker's manifest write). Do not run the scripts.
- **Confidence**: high.
- **Notes**: Answering the charter: the pick/apply *bodies* are not clones of each other
  (jscpd's two pick/apply hits are exactly this preamble, lines 45-76 of apply against 38-84
  of pick). The judgement logic differs per pass as the spec intends.

### directory-profile-20 - `import-places.mjs` works in a repo-root folder, and `merge-cities.ts` carries a dead constant
- **Where**: `scripts/dev/import-places.mjs:30-34` (`TMP_DIR = resolve(process.cwd(), ".geonames-tmp")`
  and the three paths under it), `.gitignore:24` (`.geonames-tmp/`);
  `scripts/dev/merge-cities.ts:22` (`const CANONICAL_PLACE_ID = null as number | null; // resolved below by lookup`,
  never read; `raw/tsc-unused.txt` line 1).
- **Phase**: relocate / dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: CLAUDE.md: "a script that stays goes in `scripts/dev/` ... with its working
  folder BESIDE it, never above it"; `hand-run-passes.md` moved both passes' folders out of the
  root for the same reason (owner: "I don't like items in my root directory if they don't have
  to be"). The import script predates the rule; it deletes its folder when done, but a crashed
  run leaves `.geonames-tmp/` at the root. `hand-run-passes.test.mjs` only checks `*-pick.mjs`,
  so nothing pins this one. The merge script's header (`:10-11`) says to "edit
  VARIANTS/CANONICAL_PLACE_ID below per merge", but the constant is assigned `null` and the
  canonical row is looked up by name (`:32-38`); it is one of four `noUnusedLocals` hits in the
  whole repo.
- **What to do**: `TMP_DIR = resolve(process.cwd(), "scripts", "dev", ".geonames")` (covered by
  the existing `scripts/dev/.*/` ignore line); delete `.gitignore:24`; delete
  `merge-cities.ts:22` and the header's mention of it; point both city scripts' headers at
  `src/lib/place-aliases.ts`, the durable rule that replaced the by-name merge for new rows
  (see Owner decisions on whether the scripts stay).
- **Saving**: 1 root path retired, 1 `.gitignore` line, 1 dead line, `tsc --noUnusedLocals`
  hits 4 -> 3.
- **Risk & gate**: low. `npm run check` (`scripts-ledger.test.mjs` names the scripts, not
  their folders). Do not run either script.
- **Confidence**: high.

### directory-profile-21 - `onboarding-local.ts` is `one-shot.ts`'s latch with a different prefix
- **Where**: `src/lib/onboarding-local.ts:1-28` (`hasSeenOnboarding`/`markOnboardingSeen` over
  `safeGet`/`safeSet`, key `rv:onboarding:seen:<userId>`);
  `src/components/mascot/moments/one-shot.ts:26-34` (`hasFired`/`markFired` over the same two
  helpers, key `rv:moment:<moment>:<userId>`); callers `onboarding-flow.tsx:41,109,116,119,139`
  and `demo/demo-bar.tsx:35,57`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: The two files' own headers cross-reference each other ("Scoped per user id,
  same convention as mascot/moments/one-shot.ts"). Both are `safeGet(key) === marker` /
  `safeSet(key, marker)`; only the prefix and the marker string differ. `local-storage.ts`
  already absorbed the SSR/try-catch boilerplate they used to share, so what is left of
  `onboarding-local.ts` is 28 lines that are `hasFired(userId, "onboardingSeen")`. This is the
  charter's answer: onboarding's persistence does NOT duplicate the composer's crash net
  (`use-letter-persistence.ts` is a JSON payload with timers, `pagehide`, restore prompts and
  version tokens); it duplicates the mascot's one-shot latch.
- **What to do**: delete `onboarding-local.ts`; in the two callers use
  `hasFired(user.id, "onboardingSeen")` / `markFired(user.id, "onboardingSeen")`. The stored
  key changes, so a member who bailed out of the wizard before saving an admission number
  would see the Welcome step once more; anyone with an admission number is bounced before the
  flag is read (`onboarding-flow.tsx:112-115`). If that one-time re-greet is unwanted, add a
  `keyOverride` to `storageKey` -- but that is more code than it saves; accept the re-greet.
- **Saving**: 1 file, 28 lines.
- **Risk & gate**: low. `npm run check`; sign up a fresh account, "Finish later" on Welcome,
  revisit `/welcome` and land on Register; the demo bar still suppresses the wizard.
- **Confidence**: high.

### directory-profile-22 - Onboarding small dedupes: the step order twice, the guard reasoning twice, the footer three times
- **Where**: `src/app/(main)/welcome/page.tsx:19` (`STEP_IDS`) vs
  `src/components/onboarding/onboarding-flow.tsx:49` (`STEP_ORDER`, the same five strings);
  `welcome/page.tsx:55-66` vs `onboarding-flow.tsx:85-103` (the same twelve lines of reasoning
  about why the "already onboarded" guard is client-side, written twice); the step footer
  (Back / Skip for now / Save & continue with `Loader2`) at `register-step.tsx:196-211`,
  `houses-step.tsx:135-150`, `photo-step.tsx:103-116` (jscpd: houses `[132-144]` = register
  `[193-205]`) and the centred header pair at `register-step.tsx:112-121`,
  `houses-step.tsx:106-115`, `photo-step.tsx:47-55`; `welcome-step.tsx:13` and
  `done-step.tsx:17` (`name.trim().split(/\s+/)[0] || "there"`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: as located. `types.ts` was created by audit 1 precisely to hold the flow's
  shared shapes and holds the union but not the ordered list; the page re-types it.
- **What to do**: export `STEP_ORDER` from `types.ts` and import it in both; keep the guard
  paragraph in `onboarding-flow.tsx` and reduce the page's to one line pointing at it; a
  `StepFrame` (heading, blurb, children, footer with `back/skip/next/saving`) in
  `onboarding/steps/step-frame.tsx` used by the three data steps; a `firstNameOf` in
  `lib/utils.ts` (there is already one, private, in `lib/email-templates.ts:219`, and four
  other `.split(" ")[0]` sites listed in Coverage).
- **Saving**: ~45 lines across six files; 1 clone.
- **Risk & gate**: low. `npm run check`; walk the wizard at 390.
- **Confidence**: high on the first two; medium on `StepFrame` being worth its seam (three
  callers, one of which has a form `onSubmit` rather than an `onClick`; pass `as="form"` or
  leave photo-step's footer alone).

### directory-profile-23 - The profile skeleton still draws the engraved rule the sheet deleted (audit-1 F-11, profile half, not applied)
- **Where**: `src/app/(main)/profile/[id]/loading.tsx:30-31`
  (`{/* the engraved rule */}<div className="skeleton-warm mt-[var(--space-l)] h-[3px] w-full rounded-full" />`);
  the sheet: `src/components/profile/letterhead-profile.tsx:1169-1179` ("The engraved rule that
  used to sit here is DELETED ... Deleting it also buys back 29px of sheet height").
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `git log -- src/app/(main)/profile/[id]/loading.tsx` shows no commit since
  `22b4b6c feat(profile): ship the letterhead as everyone's profile`; audit 1's F-11 named
  these two lines and the fix-prompt (row 216) records the skeleton batch as done for four
  sites -- the directory's was rewritten (`directory/loading.tsx` is now correct), this one
  was not. The skeleton's own contract (`:1-7`, "the page with the ink drained out ... so
  nothing re-corners, re-pads or jumps") is broken by a 3px bar plus two `--space-l` steps
  (~29px, the number the sheet's comment quotes) that the real page does not have.
- **What to do**: delete lines 30-31.
- **Saving**: 2 lines; one layout jump on every cold profile load.
- **Risk & gate**: low. Throttle network, open a profile.
- **Confidence**: high.

### directory-profile-24 - Comments that describe deleted code or moved code (batch), including one member-facing sentence
- **Where**:
  - `src/components/onboarding/steps/photo-step.tsx:52-54` -- **member-facing copy**: "Upload
    a photo any time you like, from here or from settings." There is no settings page
    (`page.tsx:415-418`: "there is no /settings any more (a request to it 404s)"). Say "from
    your profile".
  - `src/lib/city-coords.ts:186-190` -- "the map's existing supercluster merges them at low
    zoom": supercluster left in `f5db59d`; audit-1 F-14 named this line; still present (last
    touch `2f43a3d` un-exported symbols only). Say "the map's screen-space clustering
    (map-cluster.ts)".
  - `src/lib/city-coords.ts:129-135` -- an orphaned docblock for `cityNameVariants` stacked
    above `cityFilterTargets`'s own; move it down to `:157`.
  - `src/components/profile/houses-chain.tsx:41-43` -- "The chain's palette, exported because
    the PICKER uses it too" on a `const` that is not exported (audit-1 F-07 named it).
  - `src/components/profile/letterhead-profile.tsx:206-210` (orphan `IDENTITY_VARS` doc above
    the COLOPHON block), `:322-324` (a JSDoc for a removed boolean `contactsLocked` stacked on
    the real one for `contactsLock`), `:635-637` (three lines saying `hasBody` was deleted),
    `:50` + `:84` (two `lucide-react` imports).
  - `src/components/profile/profile-actions.ts:254-270` -- a docblock for `updateContactMethods`
    separated from its function by a second docblock for a `yearClash` that moved to
    `batch-year.ts` and a comment saying so; delete `:260-270`, keep `:254-259` directly above
    `:282`.
  - `src/app/(main)/directory/where.ts:32-38` -- `buildDirectoryWhere`'s docblock stacked
    above `parseDirectoryYears`'s; move it to `:67`; "case-insensitive where the provider
    allows it" -> Postgres-only since 2026-07-01 (`db-text.ts:4-7`).
  - `src/components/directory/directory-client.tsx:503-523` -- two consecutive comment blocks
    that both explain why the search pill is on the title line (the second, dated 2026-08-28,
    restates the first's "68vw ... swallowed the toggle" argument); keep the second.
    `:169` -- "Resyncs the list from freshly server-rendered props when the query changes. The
    server is the source of truth here; this mirrors it into the local paging state." narrates
    the three lines under it (a restate-the-code comment, the kind the brief says to trim).
    `:392-395` -- "Primary = the facets that stay visible on the desktop toolbar row (City,
    Batch); secondary stays behind 'More filters'": neither exists (`filter-popover.tsx:14-26`).
  - `src/components/directory/alumni-map.tsx:480-481` -- "// on click, which runs after
    pointerdown, so tapping one still works." is the second half of a sentence whose first half
    left with the tooltip rig; `:404-406` and `:601-602` blank-line runs.
  - `src/components/common/location-picker.tsx:40-41` -- "Wiring to onboarding / settings /
    directory happens in a later phase".
  - `src/lib/place-write.ts:7-9` -- "exactly two writers ... in /settings" (three; no
    /settings) -- covered by directory-profile-11.
  - `src/lib/directory-rule.test.mjs:209` ("the Profession facet: rendered now, tag owed
    later") and `:252-268` (a test whose comment says "The plan is still to run every
    workplace + jobTitle pair through an LLM ... The day that column exists this fails" -- the
    column exists, the test passes because the arm is gone; it is a live pin against the
    contains arm returning, with a comment from before the tag shipped). Rewrite both comments
    to the present tense; keep the assertions.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each checked against the tree as described. For the brief's "quote one of
  each" rule: a comment to KEEP in this territory is `where.ts:99-107` ("`equals`, not
  `contains` (audit Low 69) ... filtering Delhi also returned everyone in New Delhi") -- it
  carries an audit id, a measured consequence and the reason the obvious code is wrong; a
  comment to CUT is `directory-client.tsx:169` above, which says what `setResults(users);
  setCursor(nextCursor)` says.
- **What to do**: as listed, one commit, ~60 comment lines and one string.
- **Saving**: ~60 lines; one member-facing sentence that points at a 404; three future
  sessions not sent looking for supercluster, a settings page or a "More filters" row.
- **Risk & gate**: low. `npm run check` (`directory-rule.test.mjs` edits are comment-only; run
  it).
- **Confidence**: high.

### directory-profile-25 - Both specs' "superseded" banners now describe a plan that shipped in a different shape
- **Where**: `docs/spec/directory.md:15-19` ("The `City` / `HouseYear` / `ProfileTag` schema
  deltas in §3 are not yet in `prisma/schema.prisma` ... that remains a live, unimplemented
  plan, not a stale fact") and `:186-190` (§3.4, already correctly superseded);
  `docs/spec/profile.md:285-296` (§10's banner: "Still to build ... the `UserHouse`/`houses`
  (house-per-year), `UserLink`/`links` ... and `UserMemory`/`memories` tables -- today the
  memory prompts render from a hardcoded `MEMORY_PROMPTS` array with a 'Memory prompts are
  coming to your settings' placeholder").
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `City` became the `Place` gazetteer + `UserPlace` (migration
  `2026-07-18-round6`, `import-places.mjs`); `HouseYear` became the `User.houses` JSON column
  the chain editor writes (`onboarding/actions.ts:131-160`); `ProfileTag` became
  `User.professionTags` (2026-08-28); `UserLink` became the `User.links` JSON column
  (`social.ts:37-58`); `MEMORY_PROMPTS` and the placeholder no longer exist anywhere in `src`
  (grep). A session told "this remains a live plan" will build a `City` table.
- **What to do**: rewrite the two banners to say what shipped instead of each model, with the
  file that owns it; leave the bodies (they are the reasoning record). Also `profile.md:29-31`
  names `src/app/lab/profiles/_houses-trail.tsx` as the chain's reference implementation;
  the shipped chain is `components/profile/houses-chain.tsx`.
- **Saving**: 0 code lines; truth in the two documents every session in this territory is
  told to read first.
- **Risk & gate**: none beyond reading it back.
- **Confidence**: high.
- **Notes**: the docs lens may fold this into a broader specs pass; listing it here because
  the charter told me to read these two before judging anything, and they misled me for a
  minute.

### directory-profile-26 - Small dedupes and one `any` (batch)
- **Where**: `scripts/qa/map-cluster-verify.mjs:40` (`const TAP_MIN_PX = 44`) restating
  `src/lib/map-cluster.ts:66` (exported, knip says unused: the script that should import it
  redefines it); `src/lib/geocode.ts:37-45` (`regionNames` + `countryName` with try/catch)
  restating `src/lib/place-input.ts:62,81-87`; `src/components/directory/alumni-map.tsx:280-281`
  (`useRef<any>` with an eslint-disable: d3-zoom exports `ZoomBehavior<SVGSVGElement, unknown>`),
  `:561-579` (the same `setDrill({...})` object built twice for `onClick` and `onKeyDown`);
  `src/components/common/filters/range-facet-pill.tsx:86-97` = `:101-112` (jscpd; two
  `<select>` blocks); the three facet trigger blocks named in directory-profile-06's note;
  `src/components/directory/directory-client.tsx:751-777` (the batch tile and the faculty tile,
  audit-1 F-10's optional fold, still two buttons) and `:386-390` (`views` + a nested ternary
  for labels where a three-entry literal would do).
- **Phase**: dedupe / hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **What to do**: import `TAP_MIN_PX` in the QA script (scripts already import `.ts` modules
  by path, see `tag-professions-pick.mjs:38`); export `countryName` from `place-input.ts` and
  use it in `geocode.ts`; type the ref; an `openPin(pin)` closure; a local `YearSelect`; fold
  the tiles over one array keeping the faculty tile's `text-base`; a literal `viewSegments`.
- **Saving**: ~35 lines; 3 clones; 1 `any`.
- **Risk & gate**: low. `npm run check` (`map-cluster.test.mjs`, and `scripts/qa/map-cluster-verify.mjs`
  is a browser script -- do not run it; the fix session runs it once via its own command);
  `/directory` batches view.
- **Confidence**: high.

### directory-profile-27 - Two routes in this territory spell their own `select` instead of spreading the shared shape
- **Where**: `src/app/api/users/search/route.ts:63-75` (id, name, photoUrl, birdOverride,
  batchYear, accountType); `src/app/(main)/welcome/page.tsx:31-42` (id, name, photoUrl,
  birdOverride + eight profile fields); `src/lib/people-select.ts:11-19` ("Anything else
  spreads one of them and adds what it needs, so the addition is visible in the diff").
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -rn "birdOverride: true" src` outside `people-select.ts` finds nine
  hand-typed selects; these two are mine. Both are exactly `IDENTITY_SELECT` plus extras.
- **What to do**: `select: { ...IDENTITY_SELECT, batchYear: true, accountType: true }` and
  `select: { ...IDENTITY_SELECT, accountType: true, admissionNumber: true, ... }`. The other
  seven are listed under For other lenses.
- **Saving**: ~6 lines; two fewer places for the C-004/C-093 class of drift.
- **Risk & gate**: low. `npm run check` (`people-search-rule.test.mjs` reads the route for the
  `alumniOnly` shape, not the select).
- **Confidence**: high.

## Owner decisions

**The person row, across the app (the charter's "second member-row implementation"
question).** Yes, there are several. Your own words on 2026-08-18 ("we just do it in like a
billion different ways") led to `docs/spec/person-row-audit.md`, which found four components
and ten subtitle formulas and proposed three wrappers over `IdentityRow`; admin was fixed the
same day and the rest ("steps 3 and 4 ... still need the owner's go-ahead") has not been
started. The list as it stands today, with line counts: `directory/profile-card.tsx` (107,
bespoke bird + name + meta lockup, the density-measured pick you approved -- any wrapper must
reproduce it, not replace it); `catchups/home/people-panel.tsx` (728, three hand-rolled
rows at `:236`, `:431`, `:577`); `catchups/create/people-picker.tsx` (268, three at `:183`,
`:225`, `:242`); `posts/comments-section.tsx` (700, bare 34px avatar at `:606`);
`messages/conversation.tsx` (136, bare 36px at `:74`); `admin/analytics/presence.tsx` (131,
`:82`); `admin/people/person-detail.tsx` (844, `:159-165`, hand-built header); plus three
avatar stacks (catchups masthead, your-catchups-card, answer-experience) and eight surfaces
already on `IdentityRow` with their own `meta`. `admin-person-row.tsx` (145) is the one that
does it right. My recommendation: green-light the sweep as the spec wrote it, one surface at a
time, screenshots each; the brief's dedupe caveat applies (the win is one place for the bug,
not lines), and the spec already knows the traps (the 10.5px byline is yours, keep it).

**The lab Letterhead III variant vs the shipped sheet** (carried over from audit 1). The
shipped file's header still says "Keep them in step, or retire the concept"
(`letterhead-profile.tsx:6-9`); nobody has kept them in step (the shipped sheet moved through
`d68d923`, `83ec7fc`, `f47102a` and the variant did not), and the lab registry now describes
Letterhead III as "the current one: the shipped sheet plus the 2026-08-02 tweaks" -- which
means the variant is the design record of a *proposal*, and the shipped sheet is the record
of what won. What the shipped one should be: the source of truth, and its header should stop
promising a sync nobody does. Recommendation: retire the variant's sync promise (one sentence
in the header) and let the lab lens decide whether the room keeps the variant frozen with a
"superseded 2026-07-30 by the shipped sheet" note; the room itself stays.

**`LocationPicker`'s single mode** (directory-profile-18): the only thing rendering it is a
lab harness. Drop the mode (55 lines, three routes lighter) if the harness may lose that demo.

**The two legacy city columns.** `User.currentCity` and `User.secondaryCity` predate
`UserPlace` (2026-07-18) and are still mirrored on every place write
(`place-input.ts:215-222`) and read by: the directory card (`select.ts:19`, via
`shortPlaceLabel`), the feed rail's "New in the directory" (`directory-module.tsx:38,71`),
the profile's fallback while `places` is empty (`page.tsx:199-207`), the account export
(`export/route.ts:114-115`), the demo seed, three analytics counts (`admin-analytics.ts:745,
979,1073`) and the celebration detector (`celebration-signals.tsx:34,46`). Retiring them is a
schema change (two columns, one index-free), a mirror helper, two fallbacks, and switching two
readers to `places[0]` -- worth it only if no live row still depends on the fallback. The fix
session must run first, against the live database:
`SELECT count(*) FROM "User" u WHERE ("currentCity" IS NOT NULL OR "secondaryCity" IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM "UserPlace" p WHERE p."userId" = u.id);`
If it is 0, the fallback is unreachable and the sequence is: readers to `places`, drop the
mirror, migration in `prisma/migrations-manual/`. If it is not 0, a one-off backfill (typed
cities -> `UserPlace` rows with null coordinates, which the geocode ladder then resolves)
comes first. Recommendation: do it after launch, not before; it is a database change on the
one database.

**`merge-cities.ts` and `city-alias-scan.ts` (177 lines, 2026-07).** Both predate the
write-time alias rule (`place-aliases.ts`, 2026-08-22) that stops new Delhi/New Delhi splits
at the source, and their by-name merge is what that file's header says "did not" hold. The
ledger says keep ("Needed again whenever members add new spellings"). They are still the only
way to fix *legacy* rows and the scan's third report (same name, several `placeId`s) is how
Delhi was found. Recommendation: keep both, apply directory-profile-20's two small fixes, and
point their headers at `place-aliases.ts` so the next session knows which tool is the rule and
which is the mop.

## Not-findings

- **N-01 -- The comment mass in `where.ts` (1.22) and `profession-tags.ts` (1.85) is the
  product.** Every long comment in `where.ts` carries an audit id and the consequence it
  closes (C-093, Low 73, C-095, C-098, Low 69, C-099, M38, M23, M35). `profession-tags.ts`'s
  200 comment lines are owner quotes with dates ("student boolean isn't scalable", "why is it
  studying"), a measured decision ("IT WAS FIVE FIRST, and five was wrong ... Student 25, then
  Education, Healthcare and Law on 2 each"), and the `TAG_RULES` product text a session reads.
  The one restate-the-code comment I found in the territory is `directory-client.tsx:169`,
  listed in directory-profile-24. Verified intentional; do not trim.
- **N-02 -- `houses-chain.tsx` and `house-chain-editor.tsx` share no code that should be
  shared.** Per the charter I did not re-litigate the chain's 756 lines (audit-1 N-01 stands:
  measured-DOM widths, minimum-raggedness rows, three turn geometries, each with an owner
  screenshot). The editor imports `HouseTrail` and `HOUSE_INK` and adds only what editing
  needs (`Target`, `firstGap`, `housesInSpan`, the panel). The one duplicated shell (Popover /
  Sheet with the year title) is between the editor and the *dead* `HousePicker`, which
  directory-profile-05 removes from shipped code.
- **N-03 -- The place trio stays three, and nothing in it is unreachable by code.**
  `place-input.ts` (pure, node-tested), `place-lookup.ts` (the one Prisma callback),
  `place-write.ts` (the one transaction) each have live callers (Coverage's consumer table).
  `geocode.ts` and `city-coords.ts`'s table are the second and third rungs of a ladder whose
  first rung is a row's own lat/lng; they fire only for rows with null coordinates. Those still
  arrive: a city typed while `/api/places/search` is unreachable is saved with
  `placeId: null, lat: null` (`location-picker.tsx:95`, `resolvePlaces` leaves it), so the
  ladder is what puts that person on the map. For the *legacy* rows the fix session can
  measure: `SELECT count(*) FROM "UserPlace" WHERE lat IS NULL OR lng IS NULL;` -- if 0, the
  `needsFallback` loop in `page.tsx:359-369` runs empty on every load and `geocode.ts`'s
  module cache is never warm, but the code is still the right answer for the next typed row.
  Keep.
- **N-04 -- The three search endpoints stay three** (audit-1 N-02, re-verified: different
  tables, engines, caps and callers; `users/search` gained `alumniOnly` since, pinned by
  `people-search-rule.test.mjs`).
- **N-05 -- The profession vocabulary is defined once** (see Summary Q2 and
  directory-profile-04 for the one place it leaks to).
- **N-06 -- No onboarding step is unreachable.** All five render from `STEP_ORDER`; teachers
  skip Houses by design (`onboarding-flow.tsx:73-74`); `?step=` deep links are validated
  against the union (`welcome/page.tsx:56-58`) and a teacher's `?step=houses` lands on
  Register (`:75-79`). Every "Skip for now" advances; "Finish later" is always present. The
  charter's question has a clean no.
- **N-07 -- The `sort` and `house` arms in `where.ts` and the client state that carries them
  are kept on purpose** for bookmarked URLs, with the owner's removal of each control quoted
  (`directory-client.tsx:299-303`, `:341-345`; `where.ts:143-151`); `directory-rule.test.mjs:270-279`
  pins the profession arm for the same reason and explains a slice-boundary dependency on it.
- **N-08 -- The directory page's always-run batch/faculty/range queries** (audit-1 N-07) are
  still needed: the view toggle is client state.
- **N-09 -- `SavedPostsFeed`'s masonry balancer** (60 lines of JS for a two-column layout) is
  a deliberate stable-placement rule ("a later single-item removal never reshuffles the
  survivors"); CSS columns would reflow on unsave. Owner-visible behaviour; keep.
- **N-10 -- `stray-hair`** is owner-sanctioned, server-gated to one id, with a one-line kill
  switch (audit-1 N-10). Not bloat.
- **N-11 -- `text-width.ts`** is a measured glyph table with a calibration test that fails if
  the face drifts; it exists because the feed rail chooses a photograph server-side. It is in
  my charter list but is the feed rail's; verified earned.
- **N-12 -- `search-continuation.ts` is a 25-line file on purpose**: `search-log.ts` imports
  Prisma and cannot be loaded by `node --test`; the rule lives where the test can reach it
  (its own header says so). Same reason `contact-rows.ts`, `vcard.ts`, `batch-year.ts` and
  `place-input.ts` are pure.
- **N-13 -- `year-input.tsx` is used only by signup** but is a shared primitive by intent
  ("Every year field in the app ... should use this"); the letterhead's year pens cannot be a
  `FloatField` and use `digits()` instead. Not a duplicate worth folding.
- **N-14 -- `IdentityRow`'s 10.5px `META_CLASS`** is an owner reversal, documented in the
  constant and in `person-row-audit.md` §3.2. Not drift.
- **N-15 -- The `?edit=1` capability with no sender** (audit-1 N-08) stands; the comment at
  `page.tsx:415-418` is now truthful.
- **N-16 -- `PIN_PEOPLE_CAP = 12` and the pin `people` list** are B-092's cap; the drilldown
  hands over to the paginated directory past it. Earned.

## Audit-1 carry-overs in this territory

- **F-01 letterhead split**: done at the leaves (73 KB + 23 KB); the trunk is this report's 01.
- **F-02 map on demand**: the atlas half done (fetch, 105 KB); the component half is 02.
- **F-03 supercluster/d3-scale out, d3-selection declared**: done.
- **F-04 dead year-row library**: done (`house-spans.test.mjs:6-10` records the rewrite).
- **F-05 the Profession facet (owner decision)**: made moot by the profession tags
  (2026-08-28); the facet now filters a real column and `directory-rule.test.mjs` pins the
  pair. Closed.
- **F-06 profile-avatar.tsx to lab**: done (no longer in `components/profile`).
- **F-07 dead exports**: `HousesChain`, the sort helpers, `isAliasedPlaceId`,
  `socialIcon`/`socialHost` gone; the `HOUSE_TINTS` "exported because" comment it also named
  is still there (24).
- **F-08 `escapeLike` shared in places/search**: done (`route.ts:63-72`).
- **F-09 one person type + one PERSON_SELECT**: the select half done (`select.ts`); the type
  half not (08).
- **F-10 sort stub + tile fold**: stub gone; tiles still two buttons (26, optional).
- **F-11 skeletons**: directory rewritten; profile's engraved rule still drawn (23).
- **F-12 avatar-upload hook**: done (`settings/avatar-upload.ts`).
- **F-13 onboarding type cycle**: done (`onboarding/types.ts`).
- **F-14 stale comments**: welcome route comment and profile `?edit` comment fixed,
  `professions.ts` deleted; `city-coords` supercluster line and the two lucide imports not (24).
- **Open owner decision, the lab letterhead variant**: still open; restated above.
- **Refuted rows touching my files**: none (the withMember wrapper, tsconfig exclude, DemoBar
  deferral and the paged-list hook were other territories').

## For other lenses

- **feed-posts**: `posts/mention-dropdown.tsx:25-60` hand-rolls the debounce + stale-response
  guard that `common/use-user-search.ts` was extracted to own on 2026-08-05 ("the debounced
  people search behind every 'find someone by name' field"); `people-search-rule.test.mjs:27-30`
  already lists that file as an everyone-searcher, so switching it to `useUserSearch(query)`
  passes the pin. ~30 lines. Also directory-profile-14 (the profile's first page of posts) is
  theirs to sequence if `loadPosts` must stay action-only.
- **data-layer**: seven more hand-typed `birdOverride: true` selects outside my routes --
  `feed/rail/directory-module.tsx:31-39`, `app/(main)/admin/people/[id]/page.tsx:35-50`,
  `app/(main)/catchups/new/page.tsx:55`, `lib/auth.ts:329,413`, `lib/catchups-round-view.ts:108`,
  `app/(main)/pick-bird/page.tsx:50` -- against `people-select.ts`'s own rule.
- **bundle-build**: (a) the `PostCard` graph is bundled per route (45 KB on /profile, 57 + 38
  on /feed) rather than shared; (b) a 31 KB chunk `1__iv020l1buv.js` is /directory-only and
  contains the feed's search placeholder "Search posts, by their words or by who wrote them"
  (PageHeader/SearchPill pulling feed copy into the directory?); (c) the get-in-touch chunk
  (38 KB, profile-only) carries both verify dialogs (01b); (d) `/lab/directory` inlines its own
  d3 stack (965 KB route).
- **shell-primitives**: the bottom-sheet shell (`SheetContent side="bottom" className="max-h-[..vh] rounded-t-[var(--radius)] p-0"` + `SheetHeader` + title) is written four times:
  `filters/filter-sheet.tsx:32-35`, `house-picker.tsx:205-216`, `house-chain-editor.tsx:303-309`,
  `alumni-map.tsx:752-770` (side="right" variant). A `BottomSheet` variant of `Sheet` would own
  the safe-area padding `filter-sheet.tsx:37-48` documents once.
- **lab**: `lab/directory/_profession.tsx` carries its own `FIELDS`/`STAGES` (knip: unused
  exports) -- a second profession vocabulary in the lab, from before the real one;
  `lab/profiles/_variant-letterhead-3.tsx` (1,333 lines) vs the shipped sheet, see Owner
  decisions; `lab/houses` is the only renderer of `HousePicker` (05); `lab/location-picker`
  the only renderer of single mode (18).
- **scripts-e2e-ci**: `scripts/demo/apply-schema.mjs:25` holds the demo project ref as
  `EXPECTED_REF`, the ninth copy (19); the `hand-run-passes.test.mjs` pins are compatible with
  a shared guard.
- **root-docs-assets**: the two spec banners (25); `docs/spec/directory.md` still carries a
  368-line Render-era plan with two stacked superseded notes -- whether the body stays is the
  docs lens's call.
- **auth-edge**: which of `gate-coverage.test.mjs` / `security-regressions.test.mjs` name
  `components/profile/admin-actions.ts` by path (15 needs to know before moving it).
- **bug lens, not simplification**: `profile/[id]/page.tsx:230-238` files Facebook under
  `kind: "website"` so it draws a Globe in Get in touch while `contacts-editor.tsx:55-62` has a
  Facebook icon for the same row; `alumni-map.tsx` hard-codes five hex colours for land and
  pins (`:488-489`, `:531-532`, `:582-583`) -- the protocol audit presumably allows SVG
  fills, but they are not tokens.

## Metrics

- Lines read: ~17,250 across 93 territory files, plus ~1,700 lines of spec/audit history and
  ~600 lines of cross-boundary files opened for consumer checks.
- Biggest files: `letterhead-profile.tsx` 2,030 (of which ~900 edit-only); `alumni-map.tsx`
  852; `directory-client.tsx` 785; `houses-chain.tsx` 756; `profile/[id]/page.tsx` 479;
  `pen.tsx` 456; `location-picker.tsx` 453; `directory/page.tsx` 434.
- Comment-heaviest (ratio, from `raw/comment-density.txt`): `profession-tags.ts` 1.85 (200
  cmt / 108 code), `where.ts` 1.22 (121 / 99), `stray-hair.tsx` 1.17; per-dir
  `components/profile` 0.47, `components/directory` 0.49, `components/onboarding` 0.35. All
  three top files verified as reasoning, not narration (N-01).
- Route weight (`raw/route-js.txt` / bundle stats): `/profile/[id]` 1,258 KB first load
  (route-specific: 45 KB letterhead, 45 KB PostCard, 38 KB GetInTouch + dialogs, 24 KB
  houses-chain); `/directory` 1,231 KB (66 KB d3, 30 KB map+client+card, 31 KB sentence/header);
  `/welcome` 1,190 KB (53 KB location-picker+combobox, 33 KB steps, 29 KB houses).
- Dead code found (certain): `HousePicker` 190 lines (lab-only), filters kit 115 lines / 2
  files, `HOUSE_OPTIONS` + `directory-facets.ts` 19 lines / 1 file, `otherCities` 13 lines,
  `getOnboardingHouses` 20 lines, `onboarding-local.ts` 28 lines / 1 file, dead props ~70
  lines, `merge-cities` 1 line, profile skeleton 2 lines. Total ~460 lines certain, 4 files.
- Client JS: ~66 KB removable from People-first directory arrivals (02); ~115 KB deferrable
  on /welcome (03); ~10-14 KB + two dialogs' share off every stranger profile view (01);
  ~2 KB profession hints off /directory (04); ~4-5 KB HousePicker off two chunks (05).
- Queries per page load: -1 on every profile view (13), -1 on every own-profile view (12),
  -1 round trip on every profile view (14), -1 on every houses-step mount (10); -1 column per
  directory row (08).
- Tests read: 18 files, 1,814 lines; pins that gate a finding are named inside it
  (`directory-rule` for 02/04/08/09/24, `profile-editor-rule` and `profile-email` for 01/13,
  `place-input` for 11, `people-search-rule` for 27, `hand-run-passes` and `scripts-ledger`
  for 19/20, `map-cluster` for 26).
- Owner decisions: 5. Not-findings: 16. Findings: 27 (18 structural, 9 cheap; 26
  autonomous, 1 owner -- directory-profile-18).
