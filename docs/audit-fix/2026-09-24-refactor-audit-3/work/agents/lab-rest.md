# lab-rest - refactor audit 3 report

Charter T16, at classification depth: every room under `src/app/lab/` except `catchups/` (the sibling
lab-catchups covered those rooms, `actions.ts`, `_archive-state.ts` and the `LabRoomState` table), the
lab's shared kit and index machinery, the registry, `public/lab/**`, `docs/spec/lab-voice.md`,
`docs/planning/valley/**` and `docs/planning/other/**`. For the kit and each of the 45 rooms: classify
it (kit / active exploration / verdict shipped / superseded / reference or tool), date it, trace what
shipped from it and what imports what, confirm no shipped file imports it, measure what it costs
(lines, lab-only JavaScript, fonts, tracked bytes), register the lab-to-shipped clones, classify knip's
lines, and put every archive candidate to the owner as a question with "keep" as the default.
Audit-only; nothing in the tree was changed. Date 2026-09-24, HEAD `70570bcd`.
Files in territory: 140 under `src/app/lab/` outside `catchups/` (50,630 lines; cloc: 39,452 code,
8,081 comment, 3,097 blank), 15 tracked files in `public/lab/` (2.01 MB), 1 spec, 8 planning docs.
Read fully: 21 source files (2,927 lines) and 2 docs; every other file at classification depth.

## Coverage

- **Read fully**: the kit and index machinery (`_kit.tsx`, `_second-look-kit.tsx`, `_lab-client.tsx`,
  `_registry.ts`, `page.lab.tsx`, `layout.tsx`, `loading.tsx`, `lab.css`), `[dir]/page.lab.tsx`,
  `[dir]/auth/page.lab.tsx`, `centroid/page.lab.tsx`, `birds-bg/page.lab.tsx`, `birds-rv/page.lab.tsx`,
  `valley/page.lab.tsx`, `valley/_weather.ts`, `years/wall/page.lab.tsx`, `hoopoe-marks/_parts.tsx`,
  `craft/_italic-fonts.ts`, `type/_fonts.ts`, `landings/page.lab.tsx`, `valley/_sun.test.mjs`. Docs: `docs/spec/lab-voice.md`,
  `docs/planning/valley/handover.md`. Comparators outside the territory: `src/app/(main)/birds/page.tsx`,
  `src/components/landing/shots.ts`, `src/components/support/wood.tsx` (header),
  `src/components/common/motion.tsx` (`SpringPress`), `src/lib/edge-light.ts` (header),
  `src/lib/hoopoe-geometry.ts` (export list), `scripts/qa/lab-audit.mjs` (header),
  `src/components/common/motion-namespace-rule.test.mjs` (header), `src/proxy.ts` (matcher).
- **Read at classification depth** (header docblock, every import, the declaration outline, and every
  range a finding below cites): the other 119 files, room by room: transitions, composer (+`_variants`),
  feed-canvas, `_hoopoe.tsx`, landing, `_birds.tsx`, `_leaves.tsx`, feedback, loading, loading-ideas,
  eggs, mascot-moments, landings (5 variants + `_shared.ts`), hoopoe-lives, hoopoe (incl. `:325-350`),
  crop (+`_specimens.ts`), new-post (+`_room.tsx`), collection (+`_archive.ts`, scrub, swap), reach,
  viewer, comments (+`_room.tsx`), focus, support-ideas (+`_shared.tsx`, 4 variants), groups-rethink
  (+`_shell.tsx`, `_data.ts`, 4 concepts), valley (`_room`, `_hills`, `_sun`, `_seal`, `_terminator`,
  `_mark-light`, hills, seal), years (`_index`, then, wall incl. `_wall.tsx:630-670`, weave), craft
  (+`_sidebar-specimen`), spine (+`_columns`), support (+`_bars`), everything (+`_findings.ts`
  header, tallies and every cited path checked on disk), tiles (+`_specimens`), type (+`_specimens`),
  directory (8 files; `_maps.tsx:1-135`, `:925-936`), spine-marker, profiles (20 files: harness, data,
  avatar, 9 variants, chain kit and 6 treatments, their import graph), chain-lines, v2 (incl.
  `:30-60`, `:770-798`), logo, logos, glass-edges, hoopoe-marks, icon-directions, icon-colours,
  location-picker, `_shared.tsx` (outline, `:398-410`, `:553-560`).
- **Planning docs**: `docs/planning/valley/{brief,ideas-round-two,next-session}.md` and the four
  `docs/planning/other/*.md` at header depth plus a reference grep (who cites them).
- **Measured by script, not by eye**: knip's 56 lines in the territory (each symbol counted in its own
  file and across `src`, `scripts`, `e2e`); jscpd's 151 clones touching the territory; every shipped
  module's and shipped export's importer set (a `node -e` walk over `src`, then re-checked against
  `scripts` and `e2e`, which caught one false "lab-only"); the 36 CSS-in-TS blocks and their selectors;
  per-route and union lab-only chunk bytes from `raw/route-bundle-stats.json`; the 32 room ledes;
  the 65 source paths `_findings.ts` cites.
- **Not read**: the render bodies of history rooms past the ranges above (classification depth, per
  the charter). Nothing in the territory is unclassified.
- **Uncommitted edits seen**: none in the territory (`git status --short src/app/lab public/lab
  docs/spec/lab-voice.md docs/planning/valley docs/planning/other` is clean); the only untracked
  paths in the tree are the two 2026-09-24 audit folders. I did not open the bug audit's folder, and
  I read nothing under `.next/` (per my prompt), which is why two bundle-lens attributions are
  passed back as questions rather than settled (For other lenses).

## Summary

The rest of the lab is 45 rooms and a kit, 50,630 lines, born between 2026-06-27 and 2026-09-17;
26 of the 45 have had no design change since early August. Classified: 22 rooms are records of a
verdict that shipped, 10 are superseded or were never picked, 9 are references or tools, 2 are live
explorations waiting on the owner (valley, years), and 2 hold a verdict he designed but never built
(the type pairings, the sidebar marker's version F). Five rooms are URL contracts that scripts or the
Collection's end-to-end suite drive (collection, centroid, glass-edges, hoopoe-marks, directory).
Eight rooms are marked archived in the registry. No shipped file imports any of it; members download
none of its JavaScript (83 lab-only chunks, 2,812 KB, re-proved route by route) and none of its CSS
(36 injected style blocks, 2,212 lines, every one namespaced to its own room).

The structural well for autonomous work is shallow, and I say so plainly: about 80 lines of dead or
no-op code, about 130 lines of duplication (plus 110 in the four WebGL rooms if they survive the
owner's review), 26 type casts that exist only because one component's props are typed too narrowly,
one stylesheet block that another block overrides, one name list that has drifted, four room files
sitting in the kit's root, and two traps: a "throwaway, delete" instruction on the photographs the
Collection's test suite runs on, and a room drawing five screenshots the owner deleted on 2026-09-07.
The weight is in owner calls, grouped into eight questions, from the eight rooms he already archived
(6,494 lines, and 66 font files / 2.8 MB that two of them add to every build, the biggest artefact
cost in my territory) to the 16 records of shipped decisions (14,698 lines). Structural vs cheap: 13
structural findings, 3 cheap. What surprised me: the fonts, and three bundle-lens lab notes that need
correcting (`landing.jpeg` is not lab-only; the directory room no longer compiles the atlas; importing
`bird-adjust.json` in the centroid room would break its script's loop). Audit 2's lab rows are done or
parked (G4); its one lab move, the `.hoopoe` rules into `lab.css`, landed and turns out to be shadowed.

## Classification (the kit and every room)

"Own change" is the last commit that was about the room, skipping the four sweeps that touched most
rooms mechanically (`a4f33dec` the /preview move 07-30, `ed51b119` the `page.lab.tsx` rename 09-08,
`d81a7db9` Round to Edition 09-08, `40791570` the avatar fallback 09-14). "Born" follows the file
across the /preview move. "Lab JS" is the route's first-load bytes that no shipped route loads
(uncompressed; includes the lab's shared 57 KB motion chunk on 24 routes). An asterisk marks a room
the registry commits as archived; the 31 `LabRoomState` rows may archive more (lab-catchups-15).

| Room | Lines (files) | Born | Own change | Class | What it became / why it stays | Lab JS | Contract |
|---|---|---|---|---|---|---|---|
| kit + index | 1,920 (8) | 06-29 | 09-05 | kit | `_kit` (25 importers), `_second-look-kit` (8), the index | 18 (`/lab`) | lab-audit |
| `_shared`, `_birds`, `_leaves`, `_hoopoe` | 1,701 (4) | 06-27..30 | 06-29..08-26 | room files at the root | lab-rest-01 | - | - |
| transitions* | 640 | 06-29 | 06-29 | verdict shipped | the sliding marker's spring is `NAV_MARKER_SPRING` (`motion.tsx:60`, the room's values exactly) | 101 | - |
| composer* | 1,153 (2) | 06-30 | 08-02 | verdict shipped | the composer rework | 110 | - |
| feed-canvas | 897 (+134) | 07-04 | 07-04 | verdict shipped | right-rail modules (`rail-card.tsx` cites it) | 120 | - |
| landing | 256 (+908) | 06-29 | 06-29 | verdict shipped, since switched off | the landing's living section (`fba18f40`), now the parked showcase family | 96 | - |
| feedback | 960 | 06-29 | 06-29 | verdict shipped | the approved moments were ported into the app (`85cc3663`, `7c03568f`, 06-30 and 07-01) | 111 | - |
| loading | 551 | 06-29 | 06-29 | verdict shipped | the warm shimmer (`skeleton-warm`), ported in the same two commits | 94 | - |
| loading-ideas | 683 | 06-30 | 06-30 | never picked | "Nothing here is wired into the real app yet"; the 09-21 loading series went another way | 100 | - |
| eggs | 374 | 06-29 | 08-02 | verdict shipped | `konami-eggs.tsx` cites it | 84 | - |
| mascot-moments | 755 | 07-03 | 08-02 | verdict shipped | `components/mascot/moments/*`; drives the real rig | 109 | - |
| landings | 3,904 (7) | 07-05 | 08-03 | never picked, now broken | five landing concepts; the landing ships a hero only; screenshots gone (lab-rest-10) | 199 | - |
| hoopoe-lives | 89 | 09-17 | 09-17 | reference | the shipped `Finish` screen on demand | 154 | - |
| hoopoe | 524 | 06-29 | 06-29 | reference / tool | drives the real rig through every expression | 44 | - |
| crop | 613 (2) + 1.51 MB | 08-27 | 09-05 | verdict shipped | `photo-layout.ts`, `photo-frame.tsx` cite it; waiting on his look at "several at once" | 212 | specimens feed `/lab/collection` |
| new-post | 804 (2) | 09-13 | 09-14 | verdict shipped | badge + in place, 09-14; "the room stays as the record" | 147 | - |
| collection (+scrub, swap) | 1,975 (5) | 08-28 | 09-23 | tool + records | the Collection's e2e fixture; scrub became `photo-scrubber.tsx` (09-13) | 98 / 48 / 82 | `e2e/collection-seek`, `collection-journeys` |
| reach | 410 | 09-09 | 09-09 | verdict shipped | the calling card (`16758d27`) | 103 | - |
| viewer* | 197 | 07-30 | 09-05 | tool | the real shared viewer against Collection records | 16 | - |
| valley (+hills, seal) | 1,975 (13) + 0.52 MB | 09-16 | 09-16 | active exploration | reviewed 09-16, none taken as it stands; round two continues in years | 148 / 109 / 85 | `valley-terrain.mjs` output |
| years (then, wall, weave) | 2,142 (11) | 09-16 | 09-16 | active exploration | waiting on his review since 09-16; the wall needs a gitignored atlas | 77-94 | `wall-atlas.mjs` output |
| comments | 205 (2) | 09-16 | 09-16 | verdict shipped | shows the shipped `PostCard` + `CommentsSection` | 208 | - |
| focus | 188 | 08-29 | 08-29 | verdict shipped | `field-focus.ts` (`d9b7d3f9`) | 79 | - |
| support-ideas | 1,304 (6) | 08-18 | 08-18 | verdict shipped + parked design | tree shipped; aviary parked in `wood.tsx` (`2937fc45`) | 93 | - |
| groups-rethink* | 1,571 (7) | 07-18 | 08-08 | superseded | Groups removed from the app | 20-25 x5 | - |
| craft* | 814 (3) | 07-25 | 08-03 | verdict shipped | sidebar contrast (`tailwind-theme.css:74` cites it); loads 2 font families | 40 | - |
| spine* | 482 (2) | 07-25 | 07-25 | verdict shipped | the one-spine `ContentColumn` (`1ae1c066`, 07-30, "six different left edges, 224px apart") | 28 | - |
| support | 406 (2) | 07-25 | 07-25 | superseded | the bar it audits (`cost-bar.tsx`) went in the 08-18 rework | 23 | - |
| everything | 996 (2) | 07-25 | 08-04 | superseded audit log | 68 findings + 8 bests from 07-25; 25 of 65 cited paths gone (lab-rest-12) | 103 | - |
| tiles | 1,813 (2) | 07-25 | 08-03 | reference | "a box must earn its border", now a house standard; the surfaces it measured were rebuilt | 67 | - |
| type* | 1,516 (3) | 07-25 | 08-03 | verdict not taken | the app still loads static weights; 9 font families (lab-rest-11) | 72 | - |
| directory | 3,989 (8) | 08-03 | 09-05 | verdict partly shipped | `sentence-line.tsx`, `profile-card.tsx`, `directory-client.tsx`; profession half became the tag pass | 172 | `scripts/qa/_dir-room-shots.mjs` |
| spine-marker | 457 | 07-30 | 08-03 | verdict not built | his version F; the sidebar still draws pill + separate bar (`sidebar.tsx:245`) | 74 | - |
| profiles | 10,495 (20) | 07-05 | 09-09 | verdict shipped (one of nine) | Letterhead III became `letterhead-profile.tsx`; eight directions are history (lab-rest-13) | 386 | - |
| chain-lines | 522 | 08-19 | 08-19 | record | shipped 08-19, reversed 08-21 | 30 | - |
| v2 | 798 | 06-27 | 07-30 | reference | "the approved look" (CLAUDE.md) | 50 | - |
| `[dir]` (grove, almanac, canopy) | 26 (2) + 659 | 06-27 | 06-27 | superseded | three pre-v2 shell directions | 0 | - |
| birds-bg | 171 | 06-29 | 07-30 | record | "no background" shipped; its own name list has drifted (lab-rest-07) | 0 | - |
| birds-rv | 47 | 06-29 | 08-04 | superseded | shipped as `/birds` ("adapted from the /lab/birds-rv scratch page") | 0 | - |
| centroid | 53 | 06-29 | 09-11 | tool | render target for `scripts/dev/centroid.mjs` and `generate-bird-photos.mjs` | 0 | both scripts |
| logo | 77 | 06-29 | 06-29 | reference | "documents the final mark" (CLAUDE.md) | 0 | - |
| glass-edges | 371 | 08-26 | 08-27 | verdict shipped + tool | the Android icon's edge light (`generate-icons.mjs` bakes `edge-light.ts`) | 0 | `scripts/dev/apple-edge/look.mjs`, `compare.mjs` |
| hoopoe-marks | 542 (2) | 08-26 | 08-27 | verdict shipped + tool | the hoopoe peek icon (`21a67bdb`); geometry left the lab (`a6d15595`) | 0 | `look.mjs` |
| icon-directions | 605 | 08-24 | 08-24 | superseded | the icon became the hoopoe on 08-27 | 0 | - |
| icon-colours | 473 | 08-22 | 08-24 | superseded | same | 0 | - |
| logos* | 121 | 06-27 | 06-27 | superseded | the valley-and-hills direction won and is `PeaksMark` | 0 | - |
| location-picker | 65 | 07-18 | 07-18 | tool | the shared `LocationPicker` against live GeoNames; keeps `ui/card` alive (G4) | 98 | - |

Tally: kit 1; verdict shipped / record 22 (transitions, composer, feed-canvas, landing, feedback,
loading, eggs, mascot-moments, crop, new-post, reach, comments, focus, support-ideas, craft, spine,
directory, profiles, chain-lines, glass-edges, hoopoe-marks, birds-bg); superseded or never picked 10
(landings, loading-ideas, groups-rethink, support, everything, `[dir]`, birds-rv, icon-directions,
icon-colours, logos); reference or tool 9 (hoopoe-lives, hoopoe, collection, viewer, tiles, v2,
centroid, logo, location-picker); active 2 (valley, years); verdict not built 2 (type, spine-marker).

## Findings

### lab-rest-01 - Move the four room-private files out of the lab kit's root
- **Where**: `src/app/lab/_birds.tsx` (439 lines, `export function BirdField`) and `src/app/lab/_leaves.tsx`
  (469, `export function LeafCanvas`), imported only by `landing/page.lab.tsx:14-15`
  (`import { LeafCanvas } from "../_leaves"; import { BirdField } from "../_birds";`);
  `src/app/lab/_hoopoe.tsx` (134, `export function HoopoeMascot`), imported only by
  `feed-canvas/page.lab.tsx:28`; `src/app/lab/_shared.tsx` (659, `DIRECTIONS`, `FeedShell`,
  `LoginView`), imported only by `[dir]/page.lab.tsx:2` and `[dir]/auth/page.lab.tsx:2`.
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: an importer walk over every `.ts/.tsx/.mjs` in `src`, `scripts` and `e2e` finds exactly
  those importers (the three `(policies)` pages that import `"../_shared"` import their own
  `src/app/(policies)/_shared`, a different file). The root otherwise holds only the real kit
  (`_kit.tsx`, 25 importers; `_second-look-kit.tsx`, 8) and the index machinery (`_registry.ts`,
  `_lab-client.tsx`, `page.lab.tsx`, `layout.tsx`, `loading.tsx`, `lab.css`, `actions.ts`,
  `_archive-state.ts`). No gate names the four files: `scripts/qa/lab-audit.mjs` reads page files and
  the registry only, and `scripts/qa/knip.jsonc` lists none of them.
- **What to do**: `git mv` each into its only room: `landing/_birds.tsx`, `landing/_leaves.tsx`,
  `feed-canvas/_hoopoe.tsx`, `[dir]/_shared.tsx`. Update the five import lines above
  (`"../_leaves"` -> `"./_leaves"`, `"../_birds"` -> `"./_birds"`, `"../_hoopoe"` -> `"./_hoopoe"`,
  `"../_shared"` -> `"./_shared"`, `"../../_shared"` -> `"../_shared"`), and inside the three moved
  files that import the kit, `"./_kit"` -> `"../_kit"` (`_birds.tsx:4`, `_leaves.tsx:4`,
  `_hoopoe.tsx:13`).
- **Saving**: 0 lines; 1,701 lines leave the kit root, which becomes exactly the kit and the index
  (10 files). Owner decisions 3 and 7, if ever answered "move to history", become one folder each
  instead of a folder plus a root file someone has to remember.
- **Risk & gate**: very low. `npm run check` (tsc, lab registry audit); open `/lab/landing`,
  `/lab/feed-canvas`, `/lab/grove`, `/lab/grove/auth` once.
- **Confidence**: high. What would change my mind: a second importer I missed; the walk covered
  static `from`, `import()` and `require` forms.
- **Notes**: `HoopoeMascot` is the pre-rig lab mascot (06-29). The shipped rig
  (`src/components/mascot/hoopoe.tsx`) is what `/lab/hoopoe` and `/lab/mascot-moments` drive. Pointing
  feed-canvas's `ModHoopoe` at the real rig would delete `_hoopoe.tsx` outright (-134 lines), but it
  changes what a history room shows, so it is not proposed; if owner decision 7 keeps the records
  "as they are", leave it. The six-line jscpd clone `_hoopoe.tsx:99-104 <-> v2/page.lab.tsx:43-48` is
  the v2 password bird both were drawn from; history, not a dedupe.

### lab-rest-02 - Stop calling the crop room's photographs "throwaway": they are the Collection's test archive
- **Where**: the three instructions a session reads first: `src/app/lab/crop/page.lab.tsx:22-24`
  ("Throwaway. Delete this room, public/lab/crop/ and its registry row once the rules are settled"),
  `src/app/lab/crop/_specimens.ts:17-21` ("Throwaway, with the room. Delete these files,
  public/lab/crop/ and the registry row once the layout rules are settled"), `src/app/lab/_registry.ts:180`
  (the `/lab/crop` note: "Throwaway: delete it, public/lab/crop/ and this row once the rules are
  settled."). The consumer they forget: `src/app/lab/collection/_archive.ts:3`
  (`import { SPECIMENS } from "../crop/_specimens";`), which deals the 240-record `LAB_ARCHIVE` behind
  `/lab/collection`, `/lab/collection/scrub` and `/lab/collection/swap`, which `e2e/collection-seek.spec.ts`
  (ten `page.goto("/lab/collection")`) and `e2e/collection-journeys.spec.ts` drive. The files:
  `public/lab/crop/shape-*.webp`, 11 files, 1,583,430 B.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the collection-rework handover already names this as the close-out trap
  (`docs/planning/collection-rework/handover.md:31-33`, F39: "`/lab/crop`'s specimens are now shared
  with `/lab/collection`, so retiring that room MOVES them rather than deleting them"), and
  `_archive.ts:25-27` says the same. The three texts above were never updated. A session told "retire
  the crop room" reads the room and the registry, follows them, and deletes the fixture the Collection's
  end-to-end suite runs on; that suite is not part of `npm run check`, so nothing goes red until
  `npm run test:e2e` runs. (The Catch-ups wall does NOT use these files: `catchups/wall/_corpus.ts:23-31`
  explains why it cannot, because `/lab/*` is behind the proxy's session check and `next/image`'s
  optimiser fetches without a cookie.)
- **What to do**: the T1 half: rewrite the three texts to say the eleven specimens are shared with
  `/lab/collection` and move, not go, when the room retires. The T2 half, which makes the trap
  impossible rather than documented: move `crop/_specimens.ts` to a lab-wide fixture home
  (`src/app/lab/_fixtures/specimens.ts`) and `public/lab/crop/` to `public/lab/specimens/`; update the
  eleven `src: "/lab/crop/shape-…"` strings in the moved file, the imports at `crop/page.lab.tsx:29`
  and `collection/_archive.ts:3`, and the `_archive.ts:25-27` comment. If tracked-weight-07 lands (the
  eleven lab-only Collection stand-ins into `public/lab/collection/`), do both in one change.
- **Saving**: 0 lines, 0 bytes; one trap gone; owner decision 6 becomes a clean folder delete.
- **Risk & gate**: low. `npm run check`; `npx playwright test e2e/collection-seek.spec.ts
  e2e/collection-journeys.spec.ts` (or `npm run test:e2e`); open `/lab/crop` and `/lab/collection`.
- **Confidence**: high on the dependency and the stale text; the new folder name is taste.
- **Notes**: the specimens are also why `public/lab/crop/` cannot simply follow the "lab rooms retire"
  logic tracked-weight's owner decision 3 offers: option (c) there ("retire the crop room and its
  1.5 MB now") would break `/lab/collection` unless this finding lands first.

### lab-rest-03 - Remove the lab index's "editable" switch: only admins can reach the page
- **Where**: `src/app/lab/page.lab.tsx:2` (`import { auth } from "@/lib/auth";`), `:33`
  (`const [overrides, session] = await Promise.all([readOverrides(), auth()]);`), `:42-45` (the
  "Mirrors the setArchived gate ... local dev stays frictionless with no sign-in" comment and
  `const editable = process.env.NODE_ENV === "development" || session?.user?.role === "admin";`), `:49`;
  `src/app/lab/_lab-client.tsx:38` (the `editable` prop), `:194-198` (the "This is a read-only view"
  banner), `:220`, `:242-250` (`RoomCard`'s `editable` prop), `:306` (`disabled={!editable}`),
  `:308-314` (the "Sign in as an admin to archive" title branch).
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `src/app/lab/layout.tsx:16-19` returns `notFound()` for anyone whose role is not
  admin, in every environment, since `b64e44aa` (2026-08-20, security Phase 6). So every render of
  `/lab` has `session.user.role === "admin"`, `editable` is always true, the banner and the disabled
  state are unreachable, and the page's own `auth()` call exists only to compute it. This is the page
  half of lab-catchups-09 (the action's `NODE_ENV` bypass), which the sibling handed to this lens.
- **What to do**: in the page, `const overrides = await readOverrides();`, drop the `auth` import,
  the comment and the `editable` const, and render `<LabClient entries={entries} />`. In the client,
  delete the prop, the banner, the `RoomCard` prop, `disabled={!editable}` and the title's third branch
  (the title becomes `isArchived ? "Move back to Active" : "Move to Archived"`). Land in the same
  commit as lab-catchups-09 so the page and the action say the same thing.
- **Saving**: ~18 lines; one rule instead of two; one `auth()` per `/lab` view (free today, because
  `auth()` is React-cached and the layout already called it, so this is clarity, not speed).
- **Risk & gate**: low. `npm run check` (`src/lib/gate-coverage.test.mjs` sweeps `actions.ts`, not the
  page; `security-regressions.test.mjs`); open `/lab` signed in as admin and archive and restore one
  room.
- **Confidence**: high.
- **Notes**: nothing a member can reach changes; the dev-server case that "stays frictionless with no
  sign-in" already cannot happen, because the layout 404s a signed-out dev request too.

### lab-rest-04 - Delete the dead exports and wrappers in five rooms
- **Where**: `hoopoe-marks/_parts.tsx:25` (`export { H, G } from "@/lib/hoopoe-geometry";` keep `G`,
  drop `H`), `:75-77` (`export function Feather`), `:83-88` (`export function Eye`), `:90-95`
  (`export function Bill`), and the imports only they use at `:14-22` (`eyePrims`, `featherPrims`,
  `billPrims`, `type FeatherOptions`); `directory/_maps.tsx:933-936` (`/** shared helper so every concept
  gets identical input */ export function usePoints`); `directory/_profession.tsx:36`
  (`export const LIVE_TOTAL = 21;`); `directory/_data.ts:419` (`export type ScaleKey = …`);
  `type/_fonts.ts:170` (`export const SHIPPED_SET_WIDTH = 473.9;`); `landings/_shared.ts:20`
  (the `type Shot` half of `export { SHOTS, type Shot } from "@/components/landing/shots";`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/knip-repo-plus-lab.txt` lists each. Counted per symbol: each occurs once in its own
  file (the declaration) and is imported nowhere in `src`, `scripts` or `e2e` (knip's own check; the
  word-count hits elsewhere are unrelated symbols that share the name, such as other files' `Eye`).
  `hoopoe-marks/page.lab.tsx:15` imports only `Body, Crest, Face, G`; `glass-edges/page.lab.tsx:46`
  only `Crest, Face`. `SHIPPED_SET_WIDTH`'s value is typed out as a literal five times instead
  (`type/_specimens.tsx:349`, `type/page.lab.tsx:312,375,583,701`), so the constant was never wired.
- **What to do**: delete the ranges; keep `G` in the re-export. Then, in `src/lib/hoopoe-geometry.ts`,
  `featherPrims` (`:96`), `eyePrims` (`:228`), `billPrims` (`:252`) and `FeatherOptions` (`:63`) lose
  their last outside user; they are still used inside the file by `crestPrims`/`facePrims`, so drop
  only the `export` keyword (knip will ask for this on the next run). Leave `bodyPrims` exported:
  `Body` still uses it.
- **Saving**: ~35 lines; four lib exports narrowed.
- **Risk & gate**: none at runtime; nothing renders them. `npm run check` (tsc; `src/lib/mark-centring.test.mjs`
  imports only `PEEK_AXIS, PEEK_VIEW, crestPrims, facePrims`, all untouched).
- **Confidence**: high.
- **Notes**: the other 47 knip lines in the territory are `export` on symbols used inside their own
  file (listed in Metrics); harmless room API, not worth a commit each. `hoopoe-geometry.ts` is a
  shipped file (it feeds `logo-peek.tsx` and `scripts/dev/build-app-icon.mjs`); narrowing four exports
  changes no behaviour.

### lab-rest-05 - Type SpringPress's props properly: 26 casts in the lab (and 10 in shipped code) exist only to pass a `type` or a `role`
- **Where**: the lab kit's copy `src/app/lab/_kit.tsx:89-118` (`export function SpringPress`, props
  `{ children; className?; onClick?; as?: "button" | "div" | "a" } & MotionProps`, and `:101`
  `(motion as unknown as Record<string, typeof motion.button>)[as]`); the shipped original
  `src/components/common/motion.tsx:150-174` (same props, `as` adds `"span"`, `:162` the same cast).
  The casts: `composer/_variants.tsx` (17, e.g. `:200` `{...({ type: "button" } as object)}`, `:237`
  `{...({ role: "img", "aria-label": "Search (mock)" } as object)}`), `feedback/page.lab.tsx:340,679,774`
  (`{ role: "button" }`), `feed-canvas/page.lab.tsx:118,289` (`{ role: "button", tabIndex: 0 }`),
  `profiles/_variant-letterhead.tsx:250,292,423` (`{ href, target, rel }`, `{ role: "tab", … }`),
  `_lab-client.tsx:152` (`{ role: "tab", "aria-selected": on }`). Shipped, same cause (common-primitives'
  files): `contribute-room.tsx:1218`, `comments-section.tsx:621`, `location-picker.tsx:319,361`,
  `tag-input.tsx:91`, `photo-attachments.tsx:127,141`, `create-post-form.tsx:919,944`,
  `attach-image-dialog.tsx:188` (`raw/type-sludge.txt`, "as object: 13", minus two false matches).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `MotionProps` carries animation and gesture props, not HTML attributes. Hyphenated
  attributes (`aria-*`, `data-*`) pass because TypeScript does not check hyphenated JSX names against
  props, which is why `aria-pressed={isActive}` compiles bare at `landings/page.lab.tsx:80` while
  `type`, `role`, `tabIndex`, `href`, `target` and `rel` each need the `as object` spread. The lab's
  copy exists for one reason: it adds the `dl-press` class that styles the rooms' hover in plain CSS
  (`_kit.tsx:103-107`, `BASE_CSS :331-343`); the root layout mounts `MotionFeatures` (LazyMotion) around
  `/lab` too (`src/app/layout.tsx:91`), and `_lab-client.tsx` already uses the shipped `SpringPress` on
  `/lab`, so the shipped one works in the lab.
- **What to do**: (1) common-primitives' half: type the shipped props as
  `Omit<HTMLMotionProps<"button">, "ref"> & { as?: …; href?: string; target?: string; rel?: string }`
  (or an equivalent that admits the element's HTML attributes), then delete the ten shipped `as object`
  spreads, writing the attribute directly. (2) This lens's half: replace the kit's 30-line copy with
  `export function SpringPress({ className, ...rest }: ComponentProps<typeof AppSpringPress>) { return
  <AppSpringPress className={cn("dl-press", className)} {...rest} />; }` (importing the shipped one as
  `AppSpringPress`), and delete the 26 lab spreads. (3) The kit's `SPRINGS` (`_kit.tsx:28-33`) is
  byte-identical to the first three entries of the shipped `SPRINGS` (`motion.tsx:16-19`, which adds
  more below them; jscpd `_kit.tsx:26-32 <-> motion.tsx:14-20`): replace it with
  `export { SPRINGS } from "@/components/common/motion";` so the rooms that read `SPRINGS.gentle`,
  `.snappy` and `.settle` get the same numbers from one place. (4) While there, the lab's one
  `@ts-expect-error` (`hoopoe/page.lab.tsx:340`, "spread of mixed step tuples") goes if `toCall` returns
  the shipped `Step` type from `hoopoe-kit.ts:122` and `seq` is typed `Step[]`.
- **Saving**: 36 casts (26 lab, 10 shipped); ~30 lines of duplicated motion primitives and 1 clone;
  1 `@ts-expect-error` (the lab's only one); 1 `as unknown as` in the lab.
- **Risk & gate**: low-medium: the shipped half touches a primitive on most pages. `npm run check`,
  `npm run visual` (no pixel should move), and a keyboard pass on one converted control (the composer's
  format buttons in `/lab/composer` and a comment's reply control in the feed).
- **Confidence**: high on the cause (every cast carries only non-hyphenated HTML attributes); medium on
  the cleanest type expression, which the fixer should pick against motion's own exported types.
- **Notes**: the kit's `SpringPress` uses the full `motion` namespace while the shipped one uses `m`;
  wrapping the shipped one moves the lab's presses onto `m`, which is fine (LazyMotion covers the
  lab) and changes nothing visible. The lab's other `motion.` uses stay exempt by design
  (`motion-namespace-rule.test.mjs`; see Not-findings).

### lab-rest-06 - Delete `lab.css`'s hoopoe block: the v2 room's own styles override every wing rule in it
- **Where**: `src/app/lab/lab.css:17-30` (the "v2 login concept's hoopoe" comment, `.hoopoe .wing { …
  transform-origin: 40px 49px; transition: … 0.45s … }`, the two `rotate(±82deg)` rules and the two
  `.eye` rules); `src/app/lab/v2/page.lab.tsx:786-790` (the room's own injected `.hoopoe .wing {
  transition: transform .42s … }`, `.hoopoe .wing-l { transform-origin: 24px 37px; }`,
  `rotate(-68deg) translate(-2px,2px)` and the right-hand twins).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `2046bff1` (2026-09-05, audit 2's bundle-build-10) moved the block out of `globals.css`
  unchanged. Both sets are unlayered and of equal specificity (`.hoopoe .wing` against `.hoopoe .wing-l`
  is 0,2,0 each; the rotations are 0,3,0 each), and v2's `<style>` renders in the body, after the
  layout's stylesheet in the head, so v2 wins every property both declare: transition, origin and
  rotation. What still applies from `lab.css` is `transform-box: view-box` (the CSS initial value, so
  a no-op) and the two eye rules (`.hoopoe .eye { transition: opacity … }`, `.hoopoe.covered .eye {
  opacity: 0; }`), which v2 does not declare. `v2/page.lab.tsx` is the only file that renders `.hoopoe`
  (grep; `logo-peek.tsx` uses `hoopoe-mascot`).
- **What to do**: append the two `.eye` rules to v2's injected CSS after `:790`, delete `lab.css:17-30`,
  so `lab.css` is only the lab's utility sheet (its header then describes all of it).
- **Saving**: ~12 lines; the v2 bird styled in one place instead of two that disagree (82 degrees and
  a 40,49 origin against 68 degrees and 24,37).
- **Risk & gate**: low. Open `/lab/v2`, find the login concept, toggle the password eye: wings fold and
  open at 68 degrees, eyes hide while covered. `npm run check`.
- **Confidence**: medium-high: the cascade reading assumes React renders the injected `<style>` in
  place (it hoists only `<style>` with `href` and `precedence`), which is how every lab room's CSS works.
- **Notes**: bundle-build-10 was "done (moved, not deleted)"; this is the deletion it deferred, now
  that the move shows the rules are shadowed.

### lab-rest-07 - Give `/lab/birds-bg` the shipped species names instead of its own 26
- **Where**: `src/app/lab/birds-bg/page.lab.tsx:8-15` (`const NAMES = ["Hoopoe", "Indian Peafowl",
  "Spotted Owlet", "Indian Roller", …]`, 26 entries), used at `:101` (`{NAMES[i]}` under every bird),
  `:114` (`const problem = [2, 4, 14, 8, 16, 25]; // owlet, kingfisher, …`), `:154`, and the three
  section titles at `:166-168` ("ALL 26 — option A: no background"); the registry note
  `_registry.ts:452` ("across all 26 archetypes").
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the room maps over `ARCHETYPES`, which has 51 entries, so birds 26 to 50 render with no
  name, and index 3 is labelled "Indian Roller" while `SPECIES_FULL_NAMES[3]` is "Laughing Dove" since
  `f163b534` (2026-08-04, "the Indian Roller is the owner's alone, and a dove takes its slot").
  `/lab/birds-rv` and `/birds` both read `SPECIES_FULL_NAMES`/`GALLERY_SPECIES` precisely "so it can
  never drift" (`birds-rv/page.lab.tsx:6`, `bird-avatar-v2.tsx:1682`).
- **What to do**: `import { ARCHETYPES, SPECIES_FULL_NAMES } from "@/components/common/bird-avatar-v2";`,
  delete `NAMES`, use `SPECIES_FULL_NAMES[i]`, title the sections with `ARCHETYPES.length`, re-check the
  six `problem` indices' comment against the current list, and fix the registry note.
- **Saving**: ~8 lines; one drifted copy of a shipped list.
- **Risk & gate**: none beyond the room. `npm run check`; open `/lab/birds-bg`.
- **Confidence**: high.
- **Notes**: the room's per-request `readFileSync` of `bird-adjust.json` (`:110-112`) could be a JSON
  import here (it is not in the centroid convergence loop), which is what bundle-build suggests for the
  trace; in `/lab/centroid` it must stay (Not-findings).

### lab-rest-08 - Retire the kit's no-op `staggerChild` and its five dead style rules
- **Where**: `src/app/lab/_kit.tsx:85-87` (`// kept for API compatibility; … this is a no-op variant` and
  `export const staggerChild = {};`), its five uses `landing/page.lab.tsx:51,54,57,60`
  (`<motion.div variants={staggerChild}>`, `motion.h2`, `motion.p`, `motion.div`) and
  `loading/page.lab.tsx:148` plus the two import lines (`landing :9`, `loading :10`); the dead rules
  `_kit.tsx:286-290` (`.dl-routelink`, `.dl-routelink h3`, `.dl-routelink p`; `:291`
  `.dl-routelink-go` is live in `valley/_room.tsx:115,123` and `years/_index.tsx:38`) and `:310-312`
  (`/* swatch helpers used on the index */`, `.dl-swatch-row`, `.dl-swatch-card`).
- **Phase**: placeholder
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the export's own comment says it does nothing; the stagger is CSS (`.dl-stagger > *`).
  A class-by-class scan of `BASE_CSS` against every lab file: `dl-swatch-row`, `dl-swatch-card` and
  `dl-routelink` (bare) have no user; "the index" was the old Delight index, replaced by
  `_lab-client.tsx` on 2026-07-30.
- **What to do**: turn the five `motion.X variants={staggerChild}` elements into plain `div`/`h2`/`p`,
  drop the two imports and the export, delete `_kit.tsx:286-290` and `:310-312` (five rules over seven
  lines, and the comment; keep `:291`).
- **Saving**: ~12 lines; five motion elements that animated nothing become plain elements.
- **Risk & gate**: none visible (the variant is `{}`); open `/lab/landing` and `/lab/loading`.
- **Confidence**: high.
- **Notes**: cheap; bundle with lab-rest-06 or any other kit edit.

### lab-rest-09 - Write the lab's three "switch between concepts" harnesses once
- **Where**: `landings/page.lab.tsx:34-110`, `profiles/page.lab.tsx:42-151`,
  `support-ideas/page.lab.tsx:32-202`: each declares a `CONCEPTS` table, `isConceptKey`,
  `useSearchParams().get("v")`, a `select` that `router.replace`s `?v=`, a sticky `glass` header with
  the same Lab link and a row of tab pills, and a `Suspense` wrapper.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd `landings/page.lab.tsx:72-94 <-> profiles/page.lab.tsx:95-117` (23 lines),
  `:48-58 <-> :71-81` (11), `landings:39-48 <-> support-ideas:60-69` (10); the rest differs only in
  class spellings (`gap-4` against `gap-[var(--space-s)]`) and in what each wraps (profiles puts the
  concept inside the app frame; support-ideas adds a card per concept).
- **What to do**: a `VariantHarness` in `_kit.tsx` (or a new `_harness.tsx` beside it) taking
  `{ path, label, concepts: { key; label; Component }[], frame?: (node) => node, below?: (active) =>
  node }`; the three pages keep their `CONCEPTS` tables and render it.
- **Saving**: ~90 lines net and 3 clones (three ~70-line skeletons become one ~60-line component and
  three ~10-line call sites).
- **Risk & gate**: low, lab only. Open each room, switch concepts, reload with `?v=`.
- **Confidence**: medium on the net line count.
- **Notes**: only worth doing if owner decisions 4, 5 and 7 keep these rooms; if any goes to history,
  skip this. Audit 1's lesson applies: a dedupe here is clarity first, lines second.

### lab-rest-10 - `/lab/landings` draws five screenshots the owner deleted on 2026-09-07
- **Where**: `src/app/lab/landings/_shared.ts:20` (`export { SHOTS, type Shot } from
  "@/components/landing/shots";`) and its readers `_variant-editorial.tsx:392`, `_variant-clarity.tsx:385,471`,
  `_variant-postcard.tsx:377`, `_variant-noticeboard.tsx:273,644`, `_variant-livingvalley.tsx:526`;
  the table `src/components/landing/shots.ts:22-56` (`/images/landing/directory-v2.webp`,
  `feed-v2.webp`, `letters-v2.webp`, `collection.webp`, `catchups-v2.webp`); the registry row
  `_registry.ts:155-159`.
- **Phase**: placeholder
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: `public/images/landing/` does not exist. `git log --diff-filter=D -- 'public/images/landing/*'`:
  `f8ef8a20` (2026-09-07, "cleanup", the owner's own commit) deleted all five (283,284 B). Audit 2's
  owner decision D2 was "the landing showcase stays"; its pictures went three days later by his hand.
  So every concept in the room renders its feature screenshots as broken images (through `next/image`,
  which 404s a missing source), and the shipped showcase family (`showcase.tsx`, switched off) points
  at the same five.
- **What to do**: nothing autonomous; owner decision 4. The two cheap resolutions: restore the five
  files from `f8ef8a20^` (`git checkout f8ef8a20^ -- public/images/landing/`), or accept the room as a
  record of layouts and replace `SHOTS` in `_shared.ts` with a plain placeholder frame. Whichever he
  picks for the room should match what happens to the showcase family (tracked-weight's carry-over).
- **Saving**: depends on the answer: 0 lines (restore, +283 KB tracked); or ~30 lines; or 3,904 lines
  and 199 KB of lab-only JS if the room goes to history.
- **Risk & gate**: none to members; open `/lab/landings?v=clarity` after either fix.
- **Confidence**: high on the missing files; I did not open the room in a browser (no browser, per the
  brief), so "broken image" is inferred from the source and the missing files.
- **Notes**: the room's `_shared.ts` header says it re-exports `SHOTS` "so a variant never points at a
  duplicate or stale image"; it now points all five at nothing.

### lab-rest-11 - The two archived type rooms put 66 font files (2.8 MB) into every production build
- **Where**: `src/app/lab/type/_fonts.ts:32-117` (nine `next/font/google` families, each with
  `style: ["normal", "italic"]` and no `weight` array, three with optical-size axes and Fraunces with
  `SOFT` and `WONK`), `src/app/lab/craft/_italic-fonts.ts:23-35` (two more calls: Source Sans 3 and
  Libre Baskerville, again with italics); both rooms are `status: "archived"` (`_registry.ts`, `/lab/type`
  and `/lab/craft`).
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: bundle-build-09: 75 font files / 3,040 KB in `.next/static/media`, of which 66 files /
  2,818 KB are these rooms' (the app's own are 9 files / 222 KB). `rg "next/font" src` outside
  `src/app/layout.tsx` finds only these two files. The type room's verdict (variable fonts with real
  italics) was not taken: `src/app/layout.tsx:12-22` still loads Libre Baskerville at `["400", "700"]`
  and Source Sans 3 at four static weights. `next/font/google` also fetches every one of these
  families from Google during each production build.
- **What to do**: nothing autonomous; owner decision 1. If he retires the two rooms, their two
  font modules (eleven `next/font` calls) go with them and the build stops fetching and emitting 66
  files. There is no
  lighter way to keep the rooms honest: the room exists to measure `next/font`'s own output
  (`type/page.lab.tsx:121`, "How this demo is built, because it matters"; the project memory's
  "type specimens run in-app"), so loading the faces from a CDN link instead would change what it
  measures.
- **Saving**: 66 files / 2,818 KB of deployed static media per build, 2,330 lines, 112 KB of lab-only
  JS; an unknown number of build seconds (the bundle lens could not separate them).
- **Risk & gate**: none to members. After: `ls .next/static/media | wc -l` drops to about 9.
- **Confidence**: high on the attribution (only these files call `next/font` besides the root layout).
- **Notes**: `_italic-fonts.ts` requests Libre Baskerville and Source Sans 3 with the same options as
  `type/_fonts.ts:46-56`; the font files are content-hashed, so the duplication costs no bytes, only a
  second place to read.

### lab-rest-12 - `/lab/everything` compiles a July audit log whose paths have rotted
- **Where**: `src/app/lab/everything/_findings.ts` (727 lines, 87.5 KB: 68 findings and 8 "best"
  entries captured 2026-07-25, rewritten into the house voice 2026-08-04) and
  `everything/page.lab.tsx` (269, a client component that filters it); registry `_registry.ts:370-374`.
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: of the 65 distinct source paths the log cites, 25 no longer exist (checked on disk:
  `(main)/letters/page.tsx`, `components/catchups/edition/toc.tsx`, `components/support/cost-bar.tsx`,
  `components/settings/settings-form.tsx` and 21 more), and its first finding (`browse-1`, the map's
  `min(72vh, 640px)` box) survives only as a comment recording the fix
  (`src/components/directory/alumni-map.tsx:221`). The "catchups" best still praises "the published
  Round's table of contents". Because the page is a client component, the text ships as an 86 KB
  lab-only chunk (`1vwuntfzvr6vp.js`, route `/lab/everything` 103 KB). `docs/spec/lab-voice.md` says of
  exactly this shape: "If a room would be mostly a findings list, it is not a room. It is a page in
  `docs/`."
- **What to do**: nothing autonomous; owner decision 2. If he says move it: the text goes to git
  history (or `docs/history/`), the room and its row go, and `src/app/lab/layout.tsx:12-13` and
  `src/proxy.ts:209-212`, which cite `/lab/everything` as their reason for hiding the lab, keep their
  reasoning with one word changed.
- **Saving**: 996 lines, 87.5 KB tracked, 103 KB of lab-only JS; a list that no longer matches the app
  stops being on offer as current.
- **Risk & gate**: `npm run check` (lab registry). `docs/spec/lab-voice.md` quotes the file as its
  before/after example; that spec must not be edited (brief section 4), and its quote stays true as
  history, so nothing there needs touching.
- **Confidence**: high on the rot count.

### lab-rest-13 - `/lab/profiles` carries eight directions the owner did not pick, 5,566 lines of them
- **Where**: `src/app/lab/profiles/`: the eight unpicked directions `_variant-letterhead.tsx` (498),
  `_variant-letterhead-2.tsx` (835), `_variant-field-guide.tsx` (568), `_variant-editorial.tsx` (351),
  `_variant-dossier.tsx` (672), `_variant-broadsheet.tsx` (797), `_variant-passport.tsx` (869),
  `_variant-terrace.tsx` (758), plus `_houses-trail.tsx` (33) and `_profile-avatar.tsx` (185), which
  only they import; all nine are imported statically by the harness (`page.lab.tsx:33-41`). What
  shipped: Letterhead III, as `src/components/profile/letterhead-profile.tsx` (which cites the room).
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: the registry note calls Letterhead III "the current one". jscpd: 110 lab-to-lab clones
  in the territory, 1,655 lines, and the largest are `_variant-letterhead-2.tsx <-> _variant-letterhead-3.tsx`
  (92, 91, 76, 49, 32, 31, 23, 22, 20, 19, 18, 17, 15, 15, 14, 12, 8: about 510 lines), then
  broadsheet/dossier/terrace/passport among themselves. `/lab/profiles` is the heaviest route in my
  territory: 1,318 KB first load, 386 KB of it lab-only (`36q3wjbrivkvt.js` 139 KB,
  `11gartaxotlyo.js` 66 KB). `_profile-avatar.tsx` was a shipped component moved into the lab because
  only these rooms used it (`0e4a2642`, 2026-08-26).
- **What to do**: nothing autonomous; owner decision 5. The clean cut keeps the harness, `_data.ts`,
  Letterhead III, `_chain-kit.tsx` (also imported by `/lab/chain-lines`) and the six chain treatments
  its `?chain=` switch draws, and trims `CONCEPTS` to the one entry.
- **Saving**: 5,566 lines; most of the room's 386 KB lab-only JS; about 510 clone lines; optionally
  the five chain treatments that did not ship (serpentine did; `houses-chain.tsx:23` "LAID OUT AS A
  BOUSTROPHEDON"), another ~2,360 lines.
- **Risk & gate**: `npm run check`; open `/lab/profiles` and `?chain=stepped`.
- **Confidence**: high on the import graph, read from each file's imports: `_houses-trail` is
  imported only by letterhead II, broadsheet, passport and terrace; `_profile-avatar` only by passport
  and terrace; letterhead, field guide, editorial and dossier import only `_data`; Letterhead III
  imports only `_chain-kit`, the six treatments and `_data`; `chain-lines/page.lab.tsx:30` imports
  `../profiles/_chain-kit`.

### lab-rest-14 - Correct the lab's stale comments and registry notes
- **Where**: `src/app/lab/page.lab.tsx:18-20` (a find-and-replace of `/preview` mangled the history into
  "rooms under /lab were invisible from /lab and vice versa, and routes like /lab/logo had no index";
  `_registry.ts:6-8` keeps the true sentence: "/preview/delight were invisible from
  /preview/delight/second-look"); `loading.tsx:5-6` ("the lab tree is ~28k lines of TSX", now about
  65,000 lines of TypeScript, 83,000 with the Catch-ups JSON fixtures); `lab.css:20` ("/lab/v2/page.tsx is the only thing", the file
  is `page.lab.tsx`; moot if lab-rest-06 lands); `spine-marker/page.lab.tsx:4-5` ("Not linked from
  anywhere (including _kit.tsx's ROOMS registry) on purpose. Visit directly": it is registered at
  `_registry.ts:398`, and `_kit.tsx` has no ROOMS) and the matching "Visit directly." at the end of its
  registry note; `feedback/page.lab.tsx:16` ("same pattern as preview/centroid and preview/birds-bg");
  `directory/_maps.tsx:19-20` ("Both are being edited by a concurrent session", an 08-03 reason that has
  expired); registry notes `_registry.ts:356-360` (focus: "pick one; field-focus.ts becomes it", it did
  on 08-29), `:370-374` (everything: "76 findings", it holds 68 and 8 bests), `:455-459` (birds-rv: add
  that it shipped as `/birds`), `:452` (birds-bg: "26", lab-rest-07).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each claim checked against the tree (quoted above).
- **What to do**: rewrite each to what is true; one commit, docs-only inside code files.
- **Saving**: 0 lines; the index and room headers stop misdescribing the lab.
- **Risk & gate**: none; `npm run check` (the lab registry audit reads `_registry.ts`).
- **Confidence**: high.
- **Notes**: the sibling's lab-catchups-14 fixes the Catch-ups sketches row in the same file; do both
  together. `scripts/qa/lab-audit.mjs:22` still gives `src/app/preview/[dir]/page.tsx` as its example
  (scripts lens).

### lab-rest-15 - Cut 21 room ledes to the one line the lab-voice spec asks for
- **Where**: the `lede=` strings over 120 characters, longest first: `type/page.lab.tsx` (344),
  `composer/page.lab.tsx:30` (321), `groups-rethink/gatherings` (313), `landing` (311),
  `groups-rethink/batches-interest` (282), `groups-rethink/dissolve` (280), `chain-lines` (266),
  `feed-canvas` (264), `tiles` (253), `directory/_room.tsx` (239), `groups-rethink/circles` (231),
  `craft` (225), `spine` (196), `support` (166), `everything` (161), `transitions` (161),
  `mascot-moments` (159), `eggs` (155), `crop` (152), `feedback` (141), `years/weave/_weave-room.tsx` (121).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `docs/spec/lab-voice.md`, "The lede is one line": "One sentence, and under about 120
  characters ... When in doubt, cut it entirely", after the owner's 2026-08-27 "can you not have
  subtitles for labs, they're so annoying ... takes up half the page." 21 of the territory's 32 ledes
  exceed it; the 11 that comply are mostly the rooms built after it (valley, years, focus, comments,
  reach), plus loading and loading-ideas.
- **What to do**: cut each to one sentence under 120 characters, or delete it where the title carries
  the room; move any sentence that is doing real work next to the specimen it is about. Skip rooms that
  owner decisions send to history.
- **Saving**: ~0 lines (strings shrink); the rooms read the way he asked.
- **Risk & gate**: none; open two or three rooms.
- **Confidence**: high on the count.
- **Notes**: the cheapest item here and the only one about how the lab reads rather than what it
  costs.

### lab-rest-16 - If the valley and years rooms stay, give their four WebGL scenes one set of helpers
- **Where**: `valley/_hills.tsx` (967 lines), `years/then/_then.tsx` (457), `years/wall/_wall.tsx` (752),
  `years/weave/_weave.tsx` (579). Each creates a WebGL2 context with the same options, defines its own
  `compile` and `program` closures (`_then.tsx:190-202`, `const compile = (type: number, src: string)
  => { const sh = gl.createShader(type)!; …`), wires the same pointer listeners and ResizeObserver, and
  tears them down line for line (`_hills.tsx:800-807`, `_then.tsx:415-424`, `return () => { disposed =
  true; cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener("pointerdown", onDown); …`).
  Also `directory/_maps.tsx:39-52 <-> valley/_terminator.tsx:22-26` (the Natural Earth projection, 14).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (after owner decision 8)
- **Evidence**: jscpd lists 17 clones among the four files, about 160 lines (Metrics). These are the
  newest code in my territory (2026-09-16, never audited), and the rooms chose raw WebGL2 on purpose
  ("Raw WebGL2, no library; the same choice the hills made", `_wall.tsx:28`), so the shared helpers
  would be the repo's own. The valley handover's log records a real bug in exactly this boilerplate
  ("the dead context after React's double mount"), fixed in one room.
- **What to do**: only once owner decision 8 keeps two or more of these rooms: a
  `src/app/lab/_gl.ts` exporting `createGL(canvas)` (the context, its options and a typed failure),
  `program(gl, vs, fs)` and `listen(el, handlers)` returning its cleanup; each room keeps its shaders,
  camera and gestures. If one of the scenes ships to the product, the helper ships with it and the
  rooms import it from there.
- **Saving**: ~110 lines, ~17 clones, and one place to fix the next context-loss bug.
- **Risk & gate**: medium (four GPU scenes). Open each room at 390 and 1440; pinch, drag and the hour
  dial; the console stays clean; `npm run check` (`valley/_sun.test.mjs` is untouched).
- **Confidence**: medium on the line count; high on the duplication.
- **Notes**: placed last because it waits on the owner. If he shelves the round, the four files go to
  history and this refactor would have been waste.

## Owner decisions

**1. The rooms you have already archived: keep them in the Archived tab, or let their code go to history?**
- *What I'd change*: eight rooms are marked archived in the lab's own list: navigation and transitions,
  the composer lineup, the photo viewer room, why the sidebar looked 1080p, six different left edges,
  the font question, the early logo options, and the groups rethink with its four concepts. Their
  designs either shipped long ago or were set aside, and none of them has changed since early August.
  They still get built into the site every time it deploys. Two of them, the font rooms, also carry
  66 font files (2.8 MB) into every deploy, far more than any other room adds. Letting all eight go to
  history takes about 6,500 lines out of the project.
- *What you'd notice*: the Archived tab gets shorter. Members notice nothing. Any room comes back from
  history in minutes, exactly as it was.
- *If I guess wrong*: we bring the room back.
- *Options*: (a) keep all of them where they are; (b) let the two font rooms go (their 2.8 MB of fonts
  with them) and keep the rest; (c) let all eight go, except the photo viewer room, which still shows
  the real viewer; (d) let all eight go. Any of (b) to (d) also means changing the lab's rule that an
  archived room keeps its page (today the lab's checker insists every listed room has a page), either
  by removing their rows or by adding a "lives in history" kind of row.
- *If you don't reply*: (a), keep them. `[lab-rest-11; /lab/type, /lab/craft, /lab/transitions,
  /lab/composer, /lab/viewer, /lab/spine, /lab/logos, /lab/groups-rethink; check the 31 LabRoomState
  rows first, lab-catchups-15, since you may have archived more from the button]`

**2. The "everything else" audit list from July.**
- *What I'd change*: that room is a list of 68 things one review found wrong across the site on 25 July.
  A quarter of the pages and files it points at no longer exist, and some of what it calls broken has
  since been fixed. The lab's own writing rules say a room that is mostly a list of findings belongs
  in the documents, not in the lab. I would move it to the project's history.
- *What you'd notice*: one room fewer. Members notice nothing.
- *If I guess wrong*: it comes back from history as it was.
- *Options*: (a) keep it as it is; (b) move it to history; (c) keep it, with a line at the top saying
  it describes the site as it was in July.
- *If you don't reply*: (a). `[lab-rest-12; /lab/everything; 996 lines]`

**3. Directions nobody picked, and pages that went elsewhere.**
- *What I'd change*: six rooms hold ideas that were overtaken: the three early looks from before the
  approved design, the bird gallery (now the real Birds page), two rounds of app-icon colours from
  before the icon became the hoopoe, the second round of loading-screen scenes (never picked), and the
  review of the old Support page's progress bar (that bar is gone). About 2,900 lines.
- *What you'd notice*: six fewer rooms. Members notice nothing.
- *If I guess wrong*: any of them comes back from history.
- *Options*: (a) keep all six; (b) let them go to history; (c) keep the loading scenes, which you might
  still want to pick from, and let the other five go.
- *If you don't reply*: (a). `[/lab/grove (+/auth), /lab/birds-rv, /lab/icon-directions,
  /lab/icon-colours, /lab/loading-ideas, /lab/support; lab-rest-01 first]`

**4. The five landing page concepts, whose pictures are missing.**
- *What I'd change*: the room of five landing designs shows the app's screenshots in every design. You
  deleted those five screenshots on 7 September, so the room now has empty picture frames where the
  screenshots were. None of the five designs went live (the landing is now just the photograph and
  the sign-in). I need to know which way you meant it.
- *What you'd notice*: in the lab only: either the screenshots come back, or the frames become plain
  placeholders, or the room goes.
- *If I guess wrong*: the same five pictures can be restored from history at any time.
- *Options*: (a) bring the five screenshots back (they are small); (b) leave them deleted and show
  plain frames; (c) let the room go to history (about 3,900 lines).
- *If you don't reply*: (b): the room stays, with honest frames instead of broken ones.
  `[lab-rest-10; /lab/landings; ties to the landing showcase decision, audit 2 D2]`

**5. The eight profile designs you did not pick.**
- *What I'd change*: the profile room holds nine designs. Letterhead III is the one you chose and is
  live. The other eight (the first two letterheads, field guide, editorial, dossier, broadsheet,
  passport, terrace) are the paths not taken, about 5,600 lines, the biggest block in the lab outside
  Catch-ups. I would keep Letterhead III with its house-chain switcher and let the other eight go.
- *What you'd notice*: the profile room opens straight on Letterhead III with no tabs. Members notice
  nothing.
- *If I guess wrong*: any design comes back from history.
- *Options*: (a) keep all nine; (b) keep Letterhead III only; (c) keep Letterhead III and trim its
  house-chain switcher to the one that shipped (another ~2,400 lines).
- *If you don't reply*: (a). `[lab-rest-13; /lab/profiles]`

**6. The crop room.**
- *What I'd change*: the room that shows what we cut off a photograph says in its own notes that it is
  throwaway once the rules are settled, and the rules were settled on 27 August. The Collection's notes
  say it stays until you have looked at its "several at once" view, which shows the live photo rows
  beside what each page did before. Its eleven sample photographs must stay either way, because the
  Collection's test room is built from them.
- *What you'd notice*: one room fewer, if it goes. Members notice nothing.
- *If I guess wrong*: it comes back from history.
- *Options*: (a) keep it until you have looked; (b) you have looked, let it go (the photographs move
  to where the Collection's test room keeps them).
- *If you don't reply*: (a). `[lab-rest-02 first; /lab/crop; collection-rework handover close-out]`

**7. The records of decisions that already went live.**
- *What I'd change*: nothing, unless you want a lighter lab. Sixteen rooms are the record of something
  you picked and that shipped: the heart and other feedback moments, the warm loading shimmer, the easter
  eggs, the mascot moments, the living valley landing, the feed's right rail, the focus rings, the
  comment section, the bird in the New post button, the calling card, the house-chain lines, the bird
  backgrounds, the Support ideas (with the parked aviary), the border rules, the directory rethink, and
  the sidebar marker (your version F there was never built into the real sidebar). About 14,700 lines.
- *What you'd notice*: nothing either way unless some go; then those rooms leave the lab.
- *If I guess wrong*: any room comes back from history.
- *Options*: (a) keep them all as the record; (b) keep only the ones you still open, and tell me which;
  (c) keep them all, and separately tell me whether the sidebar marker's version F is still wanted.
- *If you don't reply*: (a). `[/lab/feedback, /lab/loading, /lab/eggs, /lab/mascot-moments, /lab/landing,
  /lab/feed-canvas, /lab/focus, /lab/comments, /lab/new-post, /lab/reach, /lab/chain-lines, /lab/birds-bg,
  /lab/support-ideas, /lab/tiles, /lab/directory, /lab/spine-marker]`

**8. The valley and the years rooms are waiting for you.**
- *What I'd change*: nothing. The valley rooms (the real hills, the lit mark, the day and night map,
  the wax seal) had your review on 16 September: none taken as they stand, though "the hills" were
  "obviously the coolest". The three "time, drawn" rooms that followed (every photograph at once, the
  same bench years apart, everyone as thread) have waited for your look since the same day. Together
  about 4,100 lines and the half-megabyte of terrain the hills need.
- *What you'd notice*: nothing until you look.
- *If I guess wrong*: nothing is lost.
- *Options*: (a) look when you are ready (the three "time, drawn" rooms first); (b) shelve the round,
  and the rooms go to history with your verdict written next to them.
- *If you don't reply*: (a). `[/lab/valley, /lab/years; docs/planning/valley/handover.md status board]`

## Not-findings

- **No shipped file imports my rooms**: the only `src` -> `src/app/lab` import in the repo is
  `src/lib/magazine/magazine.test.mjs:3` (the sibling's lab-catchups-03). Checked for `@/app/lab`,
  `app/lab` and relative `/lab/` specifiers across `src`, `scripts`, `e2e`.
- **Members download none of it**: my 58 routes' first loads use 83 chunks (2,812 KB) that no shipped
  route loads; 4 of them (147 KB) are shared with the Catch-ups rooms.
- **The lab's 36 injected style blocks (2,212 lines)** are each namespaced to a room prefix (`dl-`,
  `fc-`, `cx-`, `pv-`, `vh-` …); none declares `html`, `body`, `:root`, `*` or a bare element selector,
  and they render only on their own page. The member stylesheet's lab share is 0 rules (bundle-build),
  by `globals.css:21` `@source not "./lab"`; `lab.css` loads only under `/lab`.
- **`public/lab/valley/` tracked and `public/lab/wall/` ignored is one rule**: public terrain the hills
  need at deploy is tracked; the wall atlas is real members' thumbnails and never leaves this machine
  (`.gitignore:117-119`). Agreed with tracked-weight. Worth knowing for owner decision 8: every
  `/lab/*` static file sits behind the proxy's session check (the matcher at `src/proxy.ts:420` excludes
  `images/` and `uploads/`, not `lab/`), so these bytes deploy but are served only to signed-in people,
  and `next/image` cannot use them (`catchups/wall/_corpus.ts:23-31`).
- **`valley/_sun.test.mjs`**, the only test file inside the lab (35 lines, four checks on the sun's
  position, the valley clock and the sky), runs in every `npm run check` because the gate discovers
  every tracked `*.test.mjs`. It pins the one module four rooms read; keep it. If owner decision 8
  shelves the valley, it goes with the room; the gate's floor (`MIN_TEST_FILES = 60`,
  `scripts/qa/check.mjs:69`) is far below the 130 files, so nothing else moves.
- **`/lab/years/wall` cannot work on a deployed site**, by design: its atlas is gitignored and the room
  shows its "no atlas" state (`_wall.tsx:644-645`); the registry note says to run `wall-atlas.mjs`.
- **`centroid`'s per-request `readFileSync` of `bird-adjust.json`** (`centroid/page.lab.tsx:30-32`) is
  load-bearing: its header says a static import would be cached by the dev server between iterations
  of `scripts/dev/centroid.mjs`. Keep it, although bundle-build suggested an import to shrink the trace.
- **`edge-light.ts` is not lab-only**: `scripts/dev/generate-icons.mjs:31` bakes it into the Android
  icon. My first importer walk (over `src` only) said otherwise; the `scripts` re-check corrected it.
- **Shipped exports that exist for the lab** (`PEAK_PLANES`, `ARCHETYPES`, `Finish`, `drawnSize`,
  `bodyPrims` and friends): the right direction, the lab drawing the real thing. `hoopoe-geometry.ts`
  is one source for the shipped icon (`build-app-icon.mjs`), `logo-peek.tsx` and the marks room.
- **`LedgerRow.flag`** ("legacy shorthand", `_second-look-kit.tsx:268-269`) is used ten times
  (`tiles/page.lab.tsx:334` onward). Keep.
- **The lab's `motion.` namespace**: exempt by design (`motion-namespace-rule.test.mjs`); its cost is a
  57 KB eager chunk on 24 lab routes, admin only. Moving the rooms to `m.` would only let LazyMotion's
  `strict` mode replace a static test with a runtime throw, which is not better.
- **The nine, five and four statically imported variants** in the profiles, landings and support-ideas
  harnesses: admin-only rooms; `next/dynamic` would trim one admin's first load, not the build or the
  artefact.
- **The comment mass**: the territory's ratio is 0.20, the lowest in the repo. The densest files are the
  chain treatments (`_chain-stepped.tsx` 1.56), and their comments carry measurements ("19 is also
  checked, not hoped ... measured at a 390px viewport", `_chain-stepped.tsx:163-171`): the product,
  per audits 1 and 2. The narrating kind exists as section labels in long render bodies
  (`loading/page.lab.tsx:18` "small replay button used across demos", `years/then/_then.tsx:209`
  "the quad"); not worth a commit.
- **`valley`'s server weather fetch and `userPlace` read** (`valley/page.lab.tsx:17-31`,
  `_weather.ts:25-54`): admin-only, cached 15 minutes, null on failure, as the valley handover
  recommends.
- **`docs/planning/other/*`** (four research digests, 489 lines, 2026-08-29): the base for the open
  Catch-ups item L4, "popup dialogs need reworking in general" (`catchups-rework/handover.md:639`).
  Keep.
- **`docs/planning/valley/*`** (four docs, 651 lines): a live campaign whose round two waits on him.
  Keep.
- **`docs/spec/lab-voice.md`**: on the brief's do-not-touch list; checked against the rooms, which is
  lab-rest-15.
- **The 40 lab-to-shipped clones in my rooms (624 lines)**: every pair has diverged, so none is "the
  same code"; each is history (listed in Metrics). The one copy of a shipped primitive that should
  collapse is `SpringPress` (lab-rest-05).
- **`[dir]`, the one dynamic room** (charter question 8): `/lab/[dir]` and `/lab/[dir]/auth` render one
  of three pre-v2 shell directions (grove, almanac, canopy) from `DIRECTIONS` in `_shared.tsx`, as a
  feed and as a login screen. It is registered as `/lab/grove` with the child `/lab/grove/auth`
  (`_registry.ts:434-446`, the note naming the other two keys); `lab-audit.mjs` turns bracketed
  segments into matchers, so one example href satisfies it. `/lab/almanac` and `/lab/canopy` work
  with no row of their own, by design. The two 13-line pages are a 9-line jscpd clone of each other;
  not worth a helper. Superseded (owner decision 3); its inherited-key 500 is under For other lenses.
- **`location-picker`** is a working tool against the live search endpoint; its keeping `ui/card`
  alive is audit 2's parked G4, not a new finding.

## Audit carry-overs in this territory

- **Audit 2 G1/G7** (lab out of the demo's build via `page.lab.tsx`): DONE. All 58 of my routes are
  `page.lab.tsx`; `lab-audit.mjs` enforces both halves.
- **Audit 2's lab CSS share (bundle-build-02 / A-phase)**: DONE; 0 lab rules in the member sheet
  (bundle-build measured), `lab.css` 169.6 KB / 23.1 KB gz on `/lab` only.
- **Audit 2 bundle-build-10** (`.hoopoe .wing` "move, not delete"): DONE as a move; the moved rules are
  now overridden (lab-rest-06 is the deletion).
- **Audit 2 G4** (PARKED, `FEATURES.md` item 4): unchanged. `src/components/ui/card.tsx` still has one
  importer, `location-picker/page.lab.tsx:5`.
- **Audit 1 member-surfaces-04** (`wood.tsx` relocation, filed as an optional taste item after one
  agent for and one against): unchanged. `src/components/support/wood.tsx` (246 lines, "PARKED (owner,
  2026-08-18)") still has one importer, `support-ideas/_variant-aviary.tsx:34`. Not re-argued.
- **Audits 1 and 2's landing showcase** (D2 declined, "the landing showcase stays"): its five
  screenshots were deleted by the owner on 2026-09-07 (`f8ef8a20`); see lab-rest-10 and decision 4.
- **"The lab ships no JavaScript to a member"**: still true for my 58 routes, re-proved above.
- **Audit 2's world-atlas drop** (`d6e2954e`): DONE; `directory/_maps.tsx:44-50` and
  `valley/_terminator.tsx:25` fetch `/geo/countries-110m.json`.
- **The sibling's lab-catchups-09, -14 and -15** touch my files (`page.lab.tsx`, `_lab-client.tsx`,
  `_registry.ts`): -09 pairs with lab-rest-03; -14 lands with lab-rest-14; -15's SELECT should run before
  owner decisions 1 to 7 are put to him.
- No refuted row from audits 1 or 2 touches these files. Audit 2's `docs-17` to `docs-21` are the docs
  lens's (none touches `lab-voice.md` or the valley docs).

## For other lenses

- **common-primitives**: `src/components/common/motion.tsx:150-174` `SpringPress`'s props admit no HTML
  attributes, which is the whole cause of the ten shipped `{...({ type: "button" } as object)}` spreads
  (lab-rest-05 lists them); fix the type there and the lab's copy collapses to a wrapper.
- **bundle-build**: two attributions to re-check. (1) `public/images/landing.jpeg` is NOT lab-only:
  `src/components/layout/app-shell.tsx:66` (the valley back-layer on every signed-in page) and
  `src/components/landing/hero-photo.ts:16` (`HERO_IMAGE_SRC`) both use it. (2) `/lab/directory`'s
  94 KB chunk `2rghf1hhqy35w.js` is described as the world atlas, but the room has fetched the atlas
  since `d6e2954e` (`directory/_maps.tsx:44-50`); it is more likely `d3-geo` + `d3-zoom` +
  `d3-selection` + `topojson-client`, imported eagerly by the room. Harmless either way (admin-only).
  Also: `/lab/everything`'s 86 KB chunk is `_findings.ts`'s text (lab-rest-12).
- **tracked-weight**: agree with -07 (the eleven Collection stand-ins to `public/lab/`) and suggest
  landing it with lab-rest-02; its owner decision 3's option (c) needs lab-rest-02 first, because the
  crop specimens feed `/lab/collection`.
- **For the orchestrator to pass to the bug audit, at its discretion**: `src/app/lab/[dir]/page.lab.tsx:10`
  and `auth/page.lab.tsx:10` guard with `DIRECTIONS[dir as DirKey]`, so `/lab/constructor`,
  `/lab/toString` or `/lab/__proto__` get an inherited function or object, pass the `if (!t)` check, and
  `FeedShell`/`LoginView` then read `t.flags.imageforward` and throw (a 500 instead of a 404).
  Admin-only; the fix is `Object.hasOwn(DIRECTIONS, dir)`.
- **scripts-e2e-ci**: these lab URLs are contracts: `/lab/collection` (two e2e specs), `/lab/centroid`
  (`scripts/dev/centroid.mjs`, `generate-bird-photos.mjs`), `/lab/glass-edges` and `/lab/hoopoe-marks`
  (`scripts/dev/apple-edge/look.mjs`, `compare.mjs`), `/lab/directory` (`scripts/qa/_dir-room-shots.mjs`,
  whose room's verdict has mostly shipped). Any owner answer that retires one of these rooms retires or
  repoints its script. `scripts/qa/lab-audit.mjs:22` names a `src/app/preview/[dir]` example that no
  longer exists.
- **lib**: `src/lib/photo-suggest.ts` is imported only by its own test (`photo-suggest.test.mjs`); my
  importer walk found it while looking for lab-only modules. `prisma/schema.prisma:1370` names "the
  P2021 guard in src/app/lab/_archive-state.ts", which lab-catchups-10 removes; update the comment in
  the same change.
- **docs**: `docs/spec/apple-edge-light.md` (206 lines) is the spec behind `/lab/glass-edges`,
  `src/lib/edge-light.ts`, `scripts/dev/generate-icons.mjs` and `scripts/dev/apple-edge/*`; the brief's
  list of specs omits it (and `person-row-audit.md`). `src/components/layout/search-pill.tsx:33` cites
  `/lab/search`, a room that no longer exists, with a commit hash: a fair historical pointer.
- **landing**: `src/components/landing/shots.ts:22-56` names five files that do not exist (lab-rest-10).

## Metrics

- **Territory**: 140 files under `src/app/lab/` outside `catchups/` (excluding `actions.ts` and
  `_archive-state.ts`), 50,630 lines; cloc: TypeScript 39,414 code lines, comment 8,081, blank 3,097,
  comment/code 0.20. 45 rooms in 44 folders plus `[dir]`, 58 routes, 57 registry rows (with children).
  `public/lab/`: 15 tracked files, 2,108,197 B (`crop/` 11 files 1,583,430 B; `valley/` 4 files
  524,767 B); `public/lab/wall/` ignored, 1.8 MB on this disk.
- **Lines read**: 2,927 lines of territory source in full (21 files); about 6,500 more at classification
  depth (headers, imports, outlines and cited ranges across the other 119 files); ~340 lines of docs in
  full, ~1,000 at header depth; ~900 lines of comparators outside the territory.
- **Biggest files** (lines): `profiles/_variant-letterhead-3.tsx` 1,335; `tiles/_specimens.tsx` 1,161;
  `composer/_variants.tsx` 987; `valley/_hills.tsx` 967; `feedback/page.lab.tsx` 960;
  `directory/_maps.tsx` 936; `directory/_chrome.tsx` 910; `feed-canvas/page.lab.tsx` 897;
  `profiles/_variant-passport.tsx` 869; `landings/_variant-noticeboard.tsx` 852.
- **Biggest rooms** (lines): profiles 10,495; directory 3,989; landings 3,904; years 2,142; collection
  1,975; valley 1,975; tiles 1,813; groups-rethink 1,571; type 1,516; support-ideas 1,304.
- **Comment-heaviest files** (comment/code, 40+ code lines): `profiles/_chain-stepped.tsx` 1.56,
  `_chain-rail.tsx` 1.47, `_chain-kit.tsx` 1.29, `_chain-zigzag.tsx` 1.17, `_chain-route.tsx` 1.08,
  `_chain-serpentine.tsx` 1.01, `_chain-stave.tsx` 0.86, `_variant-letterhead-3.tsx` 0.68. Lightest (0.00):
  `support/page.lab.tsx`, `spine/page.lab.tsx`, `logo/page.lab.tsx`, three groups-rethink concepts.
- **Ages**: born 2026-06-27 to 2026-09-17; last own change before 2026-08-10 for 26 of 45 rooms;
  added since audit 2 and never audited before (`raw/files-added-since-audit2.txt`, 33 files):
  comments, hoopoe-lives, new-post, reach, valley (13 files), years (11), collection/scrub, and
  `lab.css`.
- **Registry**: 8 top-level rooms committed archived (transitions, composer, viewer, craft, spine, type,
  logos, groups-rethink, plus its 4 children); 31 `LabRoomState` rows unknown to this audit.
- **Build share**: 58 of the build's 118 page routes are mine (66 lab); 83 lab-only chunks, 2,812 KB
  distinct; heaviest lab-only JS per route: profiles 386 KB, crop 212, comments 208, landings 199,
  directory 172, hoopoe-lives 154, valley 148, new-post 147; 11 routes carry 0 KB (server components).
  Fonts: 66 files / 2,818 KB, all from type and craft. The lab as a whole costs a cold build about
  12 s of compile and 6 s of TypeScript (bundle-build-09, from audit 2's paired builds); I cannot
  separate my rooms' share honestly.
- **knip in the territory**: 49 unused exports + 7 unused types. Dead (lab-rest-04): `usePoints`,
  `LIVE_TOTAL`, `H` (re-export), `Feather`, `Eye`, `Bill`, `SHIPPED_SET_WIDTH`, types `ScaleKey` and
  `Shot`. Used in their own file, harmless room API: `BASE_CSS`, `FilterPanel`, `describeFilters`,
  `SentenceLine`, `PLACES`, `makeMembers`, `WorldCanvas`, `ShippedCard`, `PersonRow`, `CompactCard`,
  `RuledRow`, `LIVE_ROWS`, `TAGGED`, `FIELDS`, `STAGES`, `PEOPLE`, `BirdAvatar` (`groups-rethink/_shell`),
  `yearRange`, `VIEWPORT`, `SIDEBAR`, `UNI_LEFT`, `PLEDGE`, `SEGMENTS`, `MONTHLY`, `BUILD_COST` x2,
  `BUILD_RECOVERED`, `LETTERS`, `GATES`, `SURFACES`, `verdictFor`, the nine font objects in
  `type/_fonts.ts`, `Sheared`, `markLight`; types `Place`, `Person`, `ChainMetrics`, `MockLinkKind`,
  `SurfaceScore`. knip's `server-only` "unlisted" at `valley/_weather.ts:1` is its known false positive.
- **tsc**: 0 unused in my rooms (the charter's `wall/_shapes.tsx:255` is `catchups/wall`, lab-catchups-06).
- **Type sludge** (my rooms): `as object` 26 (composer 17, feedback 3, letterhead 3, feed-canvas 2,
  `_lab-client` 1; all `SpringPress`, lab-rest-05); `as unknown as` 5 (`_kit.tsx:101`,
  `craft/page.lab.tsx:167`, `directory/_maps.tsx:67`, `valley/_terminator.tsx:36`,
  `years/wall/_wall.tsx:572`); `@ts-expect-error` 1 (`hoopoe/page.lab.tsx:340`); `any` 1 (a
  `useRef<any>` for the d3 zoom behaviour, `directory/_maps.tsx:119-120`, with its eslint-disable);
  18 `eslint-disable` lines, 15 with a written reason and 3 without (`feedback/page.lab.tsx:438`,
  `hoopoe/page.lab.tsx:180`, `directory/_maps.tsx:119`).
- **Clones** (jscpd, 50 tokens / 5 lines) touching my rooms: 151 clones, 2,286 lines. Lab-to-shipped
  40 / 624 (largest: `chain-lines` <-> `houses-chain.tsx` 63 + 27 + 17 + 12 + 11 + 10 + 10 + 9 + 8;
  `profiles/_variant-letterhead-2` <-> `letterhead-profile.tsx` 39 + 11 + 8; `reach` <-> `get-in-touch.tsx`
  30 + 19 + 14; `collection/scrub/_scrubbers` <-> `photo-scrubber.tsx` 26 + 25 + 21 + 18 + 18 + 14 + 9;
  `eggs` <-> `konami-eggs.tsx` 18 + 12 + 11; `profiles/_chain-kit` <-> `houses-chain.tsx` 24 + 16 + 11;
  `mascot-moments` <-> `moments/*` 15 + 9; `birds-bg` <-> `bird-avatar-v2.tsx` 15). Lab-to-lab 110 /
  1,655 (letterhead II <-> III about 510; composer internal 94; spine-marker internal 69; years and
  valley WebGL boilerplate about 170; the three harnesses 44). Lab-to-Catch-ups-lab 1 / 7.
- **CSS-in-TS**: 36 blocks, 2,212 lines, all room-namespaced; the kit's `BASE_CSS` 114 lines, of which
  8 are dead (lab-rest-08).
- **Findings**: 16 (T1 7, T2 5, T3 0, T4 4; structural 13, cheap 3; autonomous 12, owner 4), plus 8
  owner decisions. Honest projected savings if every autonomous finding lands: ~320 lines (~210 without
  lab-rest-16, which waits on decision 8), 36 type casts and one `@ts-expect-error`, 1,701 lines
  relocated out of the kit root, ~21 clones (17 WebGL, the three harnesses, `SPRINGS`), one drifted
  list, two traps removed. If the owner answered every decision "move to history" (taking the
  larger option each time), the ceiling is about 41,600 lines of the territory's 50,630, 66 font
  files / 2.8 MB per build, and most of 2.8 MB of lab-only JS; the default ("keep") is 0.
