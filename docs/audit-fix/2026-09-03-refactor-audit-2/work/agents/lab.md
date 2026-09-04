# lab - refactor audit 2 report

Territory reader for `/lab`: the 48-room, 112-file, 34,426-code-line design-history tree at
`src/app/lab/**`, its registry (`_registry.ts`), its gate (`scripts/qa/lab-audit.mjs`), its
assets (`public/lab/**`, 14 webp / 1.9 MB), its house voice (`docs/spec/lab-voice.md`) and its
one database object (`LabRoomState`). The charter is explicitly NOT "which rooms to delete" -
the rooms are owner-approved history and the registry rule says a retired room is *archived*,
never removed. The charter IS: does lab leak into shipped code, what does it cost that a member
or a build pays, which rooms are finished snapshots, and what would freezing them actually save.
Date: 2026-09-04. Files in territory: 112 TS/TSX + 14 webp + 1 gate script + 1 spec;
read fully: 21 files (~3,300 lines); every one of the 48 `page.tsx` header-sampled.

## Coverage

- **Read fully**: `src/app/lab/_registry.ts` (430), `_kit.tsx` (347), `layout.tsx` (19),
  `page.tsx` (52), `loading.tsx` (49), `actions.ts` (68), `_archive-state.ts` (53),
  `hoopoe-marks/_parts.tsx` (113), `type/_fonts.ts` (264), `craft/_italic-fonts.ts` (35),
  `profiles/page.tsx` (151), `houses/demo/page.tsx` (27), `[dir]/page.tsx` +
  `[dir]/auth/page.tsx` (26), `birds-rv/page.tsx` (47), `centroid/page.tsx` (44),
  `location-picker/page.tsx` (65), `directory/page.tsx` (42),
  `scripts/qa/lab-audit.mjs` (155), `docs/spec/lab-voice.md` (156),
  `prisma/schema.prisma:1094-1098` (`LabRoomState`), `src/components/support/wood.tsx` header.
- **Read in large part**: `_second-look-kit.tsx` (shell + export list), `_shared.tsx`
  (DIRECTIONS + export list), `_lab-client.tsx` (header + LabClient), `collection/_archive.ts`
  (header + the hash), `crop/_specimens.ts` (header + specimens), `directory/_room.tsx`
  (header + imports), `directory/_maps.tsx:1-50` (the import block and the module-scope
  `feature()` call - this is where lab-13 came from), `directory/_profession.tsx` (header +
  live rows), `components/directory/alumni-map.tsx:80-105` (the fetch it should have copied),
  `hoopoe-marks/page.tsx` (MARKS array + copy), `src/lib/hoopoe-geometry.ts`
  (crestPrims/facePrims call graph), `src/lib/edge-light.ts` (header).
- **Header-sampled, every one (first 30-38 lines: this repo front-loads the reason a file
  exists into its header comment, so this classifies a room reliably)**: all 48 `page.tsx`.
- **Not read line-by-line (~26,000 lines)**: the interior JSX of the variant and specimen
  files - `profiles/_variant-*` (6,669), `profiles/_chain-*` (2,845), `landings/_variant-*`
  (3,668), `support-ideas/_variant-*` (611), `directory/_chrome|_maps|_data|_ui|_people`
  (3,002), `tiles/_specimens.tsx` (1,161), `composer/_variants.tsx` (987),
  `everything/_findings.ts` (727), `feedback/page.tsx` (960), `feed-canvas/page.tsx` (897),
  `v2/page.tsx` (798), `type/_specimens.tsx` (513), `craft/_sidebar-specimen.tsx` (230),
  `groups-rethink/*` (1,571). The charter said classification-level; every knip, jscpd and
  cloc lead pointing INTO those files was chased into the file and resolved. Nothing in the
  unread JSX can change a structural finding below, because nothing outside its own room
  imports any of it (proved in lab-01 evidence).
- **Uncommitted edits seen (someone else's WIP)**: `git status --short src/app/lab public/lab
  scripts/qa/lab-audit.mjs` is **clean**. The tree's one dirty file is
  `src/components/common/image-viewer.tsx`, which is a peer's work outside my territory and
  which I did not read or judge. Everything I judged is HEAD's version (`a13a8a9`; the
  measured builds are at `72b5a1d`).
- **Not run**: no build, no tsc, no knip, no browser, no database, no script under `scripts/`.
  Every number below is either read out of `work/raw/`, read off the two production builds
  the orchestrator left in `.scratch/`, or computed by a `node -e` one-liner over files on
  disk (the CSS attribution in lab-02, which reads `src/**` and one built stylesheet).

## Summary

**The good news first, and it is the same news as audit 1, now re-proved on fresh artifacts:
zero shipped code imports lab.** The only non-lab hits for `app/lab` in `src/` are three
comments (`proxy.ts:210`, `post-card.tsx:180`, `motion-features.tsx:21`) and the generated
Prisma client's inline schema string. Route-by-route, the 52 non-lab first-load JS figures
move by −36 to −620 bytes when the whole tree is deleted, which is module-ID renumbering, not
code. The lab has no TODOs, no `console.log`, no commented-out code, 9 eslint-disables across
112 files and 4 `any`/`as unknown as` sites. It is well-kept.

**The one thing that does reach a member is CSS, and it is now measured rather than
estimated.** Audit 1 left this open as owner decision 6; the owner reasonably asked "what are
you gonna do with the info". Here is the info, from the orchestrator's own two production
builds sitting in `.scratch/`: the single stylesheet that ships on **every page, including the
signed-out landing page**, is **238,434 bytes raw / 33,684 gzip** with lab present and
**164,037 / 24,937** with the tree moved aside. That is **−74,397 bytes raw (−31.2%) and
−8,747 bytes gzip (−26.0%)** of render-blocking CSS that every visitor downloads so that 890
utility classes only a lab room ever writes can exist. Tailwind 4.2.2 supports `@source not`,
so there is now an action behind the number, and it is not "delete a room" (lab-02).

**The build cost is no longer an estimate either.** Same two builds: compile **20.3 s → 13.7 s**,
TypeScript **14.6 s → 9.1 s**, static pages **105 → 62**, and the deployed artifact drops
**~9.7 MB** (server/app 12→7.5 MB, static/chunks 6.5→4.0 MB, static/media 3.0 MB→256 KB). The
TypeScript program loses **113 files, 44,363 lines, 21.7 % of all types and 45 % of check
time**. Audit 1 guessed "10-15 s of the 45.6 s build"; the answer is **~12 s of 42 s, 28 %**
(lab-01).

**The genuine surprise: 63 woff2 font files, 2.75 MB, exist in the deployed build for two lab
rooms.** `lab/type/_fonts.ts` pulls nine Google families and `lab/craft/_italic-fonts.ts` pulls
two more, all through `next/font/google`, which downloads and self-hosts at build time. The
full build's `static/media` holds 72 woff2; without lab it holds 9. Members never fetch them
(both stylesheets are route-scoped to `/lab/type` and `/lab/craft` - verified against the
client-reference manifests), but every cold Vercel build fetches them from Google, and
`/lab/type` is an **archived** room whose verdict never shipped (lab-04).

**The cheapest real win, and it is one line of `package.json`: `world-atlas` is still a
production dependency (7.9 MB installed) and the only file in the repo that imports it is
`src/app/lab/directory/_maps.tsx`.** Audit 1 fixed the shipped map to fetch the atlas as a
static file instead of compiling 105 KB of coastline JSON into the bundle (`b899d1a`); the lab
room that prototyped that map kept the old import. So the lab is now a museum of the exact
antipattern the shipped file's comment documents as wrong, and it is holding a runtime
dependency alive on its own (lab-13).

**Structural vs cheap**: 5 structural findings that carry real numbers (lab-01
build/artifact, lab-02 CSS, lab-03 the three eager-variant harnesses, lab-13 the stranded
dependency, lab-04 the fonts), 2 structural dead-code items (lab-05 the 48 knip exports,
lab-06 the three dead `_parts` wrappers), 2 relocate items (lab-07 the three shipped-path files
whose only consumer is lab, lab-08 the crop fixture tangle), 3 hygiene items. Nothing here is a
line-count hunting ground and I have not padded it into one: the honest line saving across every
autonomous item is about **90 lines**. The value is in one dependency, bytes, seconds and one
corrected index.

**What audit 1 left that is now moot**: its lab-02 (110 lines of dead kit exports) shipped as
`09f5ebe`. Its lab-03 shipped **two of four** - the two that did not are still wrong and are
now *more* wrong, because the symbol one of them names was deleted by the other fix (lab-09).

## The 48 rooms

The charter's first required answer. **Lines** = total lines of every file in that room's own
directory (not recursive; a parent excludes its children's rows). **Last** = the most recent
commit touching that directory; `07-30` means the `/preview`→`/lab` migration commit `a4f33de`
itself, i.e. **the room has not been changed since the day it moved**. **Leak** = does any
shipped file import this room (answer is "no" for all 48; the column records the reverse
direction, what the room reaches into). **Data** = does the room touch a database, an API or
the filesystem at request time.

The lab's 13 shared root files (`_registry` 430, `_shared` 659, `_second-look-kit` 512,
`_leaves` 469, `_birds` 439, `_kit` 347, `_lab-client` 325, `_hoopoe` 134, `actions` 68,
`_archive-state` 53, `page` 52, `loading` 49, `layout` 19) add **3,556 lines** on top of the
per-room totals below; 44,251 lines in all.

### Delight (16 routes)

| Room | Status | Lines | Prototyped | Shipped as | Last | Leak | Data |
|---|---|---|---|---|---|---|---|
| `/lab/transitions` | archived | 640 | sidebar marker slide, seg thumb, content cross-fade, landing→login pass | `layout/sidebar.tsx` marker, `(main)/template.tsx` | **07-30** | `_kit` | no |
| `/lab/composer` | archived | 1,153 | the unfurling composer pill, inline formatting, no tag walls | `posts/create-post-form.tsx` | 08-02 | `_kit` | no |
| `/lab/feed-canvas` | active | 897 | eleven right-rail modules, the empty top-right rectangle | feed right rail (partly) | **07-30** | `_kit`, `_hoopoe` | no |
| `/lab/landing` | active | 256 | leaves that part at the cursor, birds that walk between frames | `landing/ambient-leaves.tsx`, `landing/perching-birds.tsx` | **07-30** | `_kit`, `_leaves`, `_birds` | no |
| `/lab/feedback` | active | 960 | heart pop, bookmark tuck, share, RSVP, poll bars, bell dot | `common/love-button.tsx`, `common/bookmark-button.tsx` | **07-30** | `_kit`, `lib/avatar`, `bird-avatar-v2` | no |
| `/lab/loading` | active | 551 | warm valley shimmer vs grey pulse, leaves settling, the Letters draw-on | `.skeleton-warm` in `globals.css` + every `loading.tsx` | **07-30** | `_kit` | no |
| `/lab/loading-ideas` | active | 683 | round-2 loading scenes (sports day, foraging birds, a relay) | **not shipped** - gallery, parked | **07-30** | `_kit` | no |
| `/lab/eggs` | active | 374 | the logo-hover valley fact, the konami flash | `layout/konami-eggs.tsx` | 08-02 | `_kit` | no |
| `/lab/mascot-moments` | active | 755 | where the hoopoe appears across the product | `mascot/moments/*` | 08-02 | `mascot/hoopoe`, `use-hoopoe` | no |
| `/lab/landings` | active | 3,904 | five full landing directions (Postcard, Noticeboard, Editorial, Living Valley, Clarity) | `app/page.tsx` hero; the showcase half is **switched off** | 08-03 | `landing/shots`, `landing/showcase-shot` (**lab-07**) | no |
| `/lab/hoopoe` | active | 524 | every expression, gaze, cover/peek and crest fold of the real rig | `mascot/*` (the rig itself) | **07-30** | `mascot/hoopoe`, `use-hoopoe`, `hoopoe-kit` | no |
| `/lab/crop` | active | 610 (+1.9 MB webp) | what a crop does to every shape a member can post | `lib/photo-layout.ts`, `common/photo-frame.tsx` | 08-28 | `_kit`, `PostCard`, `PhotoRows`, `photo-layout` | no |
| `/lab/collection` | active | 500 | the river, the year rail, the scrubber, the seek, at 240 photographs | `collection/*` (the real components, imported) | **09-02** | six `collection/*` + `ImageViewer` | no |
| ↳ `/lab/collection/swap` | (child) | 633 | the caret swap between the two halves, with a real wait | `collection/scope-caret.tsx` | 08-31 | same | no |
| `/lab/viewer` | archived | 192 | the edge-to-edge viewer, chrome that leaves, press-open caption | `common/image-viewer.tsx` (the real one, imported) | 08-30 | `ImageViewer` | no |
| `/lab/groups-rethink` | archived | 666 | "what should Groups become", four concepts + matrix | Groups **removed**; Catch-ups took its place | 08-08 | none | no |
| ↳ `…/circles` | (child) | 218 | Concept A | superseded with the parent | **07-30** | none | no |
| ↳ `…/batches-interest` | (child) | 208 | Concept B | superseded | 08-08 | none | no |
| ↳ `…/dissolve` | (child) | 233 | Concept C | superseded | 08-08 | none | no |
| ↳ `…/gatherings` | (child) | 246 | Concept D (the recommended one) | superseded | **07-30** | none | no |
| `/lab/focus` | active | 188 | five focus treatments for a text field, in five columns | `ui/field-focus.ts` (**DESIGN-SYSTEM.md:155** names the room) | 08-29 | `_kit` | no |
| `/lab/support-ideas` | active | 1,304 | four full Support rebuilds (Plate, Aviary, Days, Stamps) | `/support` kept the photo; Aviary **parked** in `support/wood.tsx` | 08-18 | `support/wood` (**lab-07**) | no |

### Second look (10 routes)

| Room | Status | Lines | Prototyped | Shipped as | Last | Leak | Data |
|---|---|---|---|---|---|---|---|
| `/lab/craft` | archived | 814 | 4.31:1 idle nav text, 568 AA failures, real italics vs shear | contrast fixes + the one focus outline | 08-03 | `_second-look-kit`, **2 Google fonts** | no |
| `/lab/spine` | archived | 482 | eleven routes, six left edges, 224px apart | one-spine `ContentColumn` | **07-30** | `_second-look-kit` | no |
| `/lab/support` | active | 406 | a progress bar that counts up to zero | `/support` cost bar | **07-30** | `_second-look-kit`, `BirdAvatar` | no |
| `/lab/everything` | active | 996 | **68** findings (the registry says 76 - **lab-09**) across nine surfaces | many, individually | 08-04 | `_second-look-kit` | no |
| `/lab/tiles` | active | 1,813 | four gates that decide whether a border is earned | DESIGN-SYSTEM's "a box must earn its border" | 08-03 | `_second-look-kit` | no |
| `/lab/houses` | active | 195 | the picker as a bottom sheet below 1024px, the radius ladder, 44px targets | `common/house-picker.tsx` | 08-02 | `_second-look-kit`, `house-picker` | no |
| ↳ `/lab/houses/demo` | (child) | 27 | bare iframe target so the mobile picker sees a real 390px window | n/a - it is the harness | **07-30** | `house-picker` | no |
| `/lab/type` | archived | 1,516 | five type pairings measured off the font binaries | **not shipped** - the app still loads six statics | 08-03 | `_second-look-kit`, **9 Google font families** (**lab-04**) | no |
| `/lab/directory` | active | 3,951 | filter-bar chrome (4 concepts), maps (5), the Profession facet matching 0 of 21 | sentence-line chrome; the profession pass became `tag-professions` | 08-03 | `_second-look-kit`, `d3-geo/-zoom/-selection`, `topojson-client`, and **`world-atlas` - the repo's only importer** (**lab-13**) | no |
| `/lab/spine-marker` | active | 457 | six fused treatments for the sidebar's active marker | `layout/sidebar.tsx` (version F, the owner's own) | 08-03 | `PeaksMark` | no |

### Profiles (2 routes)

| Room | Status | Lines | Prototyped | Shipped as | Last | Leak | Data |
|---|---|---|---|---|---|---|---|
| `/lab/profiles` | active | **10,481** | nine profile directions + six house-chain treatments | `profile/letterhead-profile.tsx` (Letterhead III) | 08-30 | `layout/sidebar`, `profile/get-in-touch`, `admission-stamp`, `houses-chain` | no |
| `/lab/chain-lines` | active | 522 | six ways to draw only the connector line | Thread **shipped** 08-19, **reversed** by the owner 08-21; arrows again | 08-19 | `_second-look-kit`, `profiles/_chain-kit`, `lib/house-spans` | no |

### Brand (12 routes)

| Room | Status | Lines | Prototyped | Shipped as | Last | Leak | Data |
|---|---|---|---|---|---|---|---|
| `/lab/v2` | active | 798 | the whole approved shell, feed and chrome from current tokens | **the reference** - CLAUDE.md names it as the approved look | **07-30** | lucide, phosphor | no |
| `/lab/grove` (`[dir]`) | active | 13 | three early shell directions (grove / almanac / canopy) | superseded by v2 | **07-30** | `_shared` (659 lines) | no |
| ↳ `/lab/grove/auth` | (child) | 13 | the login screen for the same three | superseded | **07-30** | `_shared` | no |
| `/lab/birds-bg` | active | 171 | three avatar background treatments over 26 archetypes | shipped answer: **no background** | **07-30** | `bird-avatar-v2`, `lib/avatar` | **reads `bird-adjust.json` per request** |
| `/lab/birds-rv` | active | 47 | the full deterministic bird set, one glyph per species | the shipped `/birds` page shares `GALLERY_SPECIES` | 08-04 | `bird-avatar-v2` | no |
| `/lab/centroid` | active | 44 | one glyph at 600×600 for the optical-centering script | **a tool**: `scripts/dev/centroid.mjs` (`npm run dev:centroid`) | **07-30** | `bird-avatar-v2` | **reads `bird-adjust.json` per request** |
| `/lab/logo` | active | 77 | the PeaksMark standalone and in three real lockups | **the reference** - CLAUDE.md names it | **07-30** | `PeaksMark` | no |
| `/lab/glass-edges` | active | 371 | Apple's per-shape edge light, measured off a home screen | `lib/edge-light.ts` → `scripts/dev/generate-icons.mjs` → the app icons | 08-27 | `lib/edge-light`, `lib/hoopoe-geometry`, `hoopoe-marks/_parts` | no |
| `/lab/hoopoe-marks` | active | 542 | **seven** hoopoe-based identity directions (the registry says ten - **lab-09**) | **not shipped** - PeaksMark stayed | 08-27 | `lib/hoopoe-geometry` | no |
| `/lab/icon-directions` | active | 605 | eight/nine icon directions after the "it reads like a flag" complaint | `src/app/icon.svg` + `public/images/icons/` | 08-24 | `PEAK_PLANES` from `peaks-mark` | no |
| `/lab/icon-colours` | active | 473 | the three hills in the site's own green/cinnamon/blue | same icon set | 08-24 | `PEAK_PLANES` | no |
| `/lab/logos` | archived | 121 | six early non-bird marks | Valley+hills won, is now PeaksMark, documented at `/lab/logo` | **07-30** | `PeaksMark` | no |

### Tools, and the index (2 routes)

| Room | Status | Lines | Prototyped | Shipped as | Last | Leak | Data |
|---|---|---|---|---|---|---|---|
| `/lab/location-picker` | active | 65 | the shared LocationPicker in single and multi mode | `common/location-picker.tsx` (the real one) | **07-30** | `location-picker`, `ui/card` | **hits `/api/places/search` live** |
| `/lab` (index) | n/a | 52 + 325 + 430 | the one index; search, archive/unarchive, children folded under a card | itself | 08-31 | `_registry`, `_lab-client`, `actions` | **`prisma.labRoomState.findMany()`, `force-dynamic`** |

**Answers to the charter's questions, from the table.**
*Does any shipped file import `/lab`?* **No** - zero, in either direction of grep, confirmed by
a build-vs-build byte diff of all 52 shared routes.
*Snapshots vs live explorations?* **20 routes have not changed since the migration on
2026-07-30** and another 15 were last touched before 9 August; **12 rooms are live work**
(collection, collection/swap, viewer, profiles, focus, crop, glass-edges, hoopoe-marks,
icon-colours, icon-directions, chain-lines, support-ideas). Four more are permanently live
regardless of commit date because something outside the lab drives them (centroid,
glass-edges, houses/demo, location-picker) - see lab-10.
*Which rooms carry a runtime cost beyond their own route?* **`/lab/type` and `/lab/craft`**
(63 woff2, 2.75 MB in the deployed build - lab-04); **the ten Tailwind-styled rooms**
collectively (74 KB of shared CSS on every member page - lab-02); **`/lab` itself** (one Prisma
query per index load, `force-dynamic`); **`/lab/location-picker`** (live GeoNames calls);
**`/lab/birds-bg` and `/lab/centroid`** (a `readFileSync` per request, deliberate). Every other
room costs nothing outside its own URL.
*Rooms whose verdict is in git and whose room is now a snapshot?* transitions, composer,
loading, eggs, spine, craft, houses, spine-marker, focus, birds-bg, logos, groups-rethink,
chain-lines (verdict shipped then reversed), icon-directions, icon-colours, glass-edges.
*Rooms whose verdict never shipped?* loading-ideas, type, hoopoe-marks, grove, and the
Aviary half of support-ideas.

## Findings

---

### lab-01 - The lab's build and artifact cost, measured on two real builds, not estimated
- **Where**: `src/app/lab/**` (112 files, 48 routes); `public/lab/**` (14 webp, 1.9 MB);
  `next.config.ts` (no `pageExtensions` today); `scripts/qa/lab-audit.mjs:47` (hardcodes the
  filename `page.tsx`); `src/proxy.ts` (`/lab` no longer public, audit M19);
  `src/app/lab/layout.tsx:16-18` (admin-only, `notFound()` for everyone else).
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: the orchestrator built the repo twice at `72b5a1d`, once whole
  (`.scratch/audit2-build/`) and once with `src/app/lab` and `public/lab` moved outside the
  worktree (`.scratch/audit2-build-nolab/`, setup log `raw/build-nolab-setup.txt`). Every
  figure below is a `stat`/`du` on those two trees or a line out of the two build logs. The
  machine's load average was 6-15 during these runs, so the wall-clock figures are noisy in
  absolute terms but the *pairing* is fair (two nolab runs agree with each other).

  | | with lab | without lab | delta |
  |---|---|---|---|
  | Compile (`raw/build.txt` vs `build-nolab.txt` / `-run3`) | 20.3 s | 13.7 s / 13.6 s | **−6.6 s** |
  | TypeScript step | 14.6 s | 9.1 s / 10.2 s | **−4.9 s** |
  | Static pages generated | 105 in 682 ms | 62 in 568 ms / 492 ms | **−43 pages** |
  | Reported build steps, summed | ~36.2 s (of 42.3 s wall) | ~24.2 s / ~25.1 s | **≈ −12 s, 28 %** |
  | `.next/server/app` | 12 MB (`app/lab` = 4.0 MB) | 7.5 MB | **−4.5 MB** |
  | `.next/static/chunks` | 6.5 MB | 4.0 MB | **−2.5 MB** |
  | `.next/static/media` | 3.0 MB, 75 files (72 woff2) | 256 KB, 12 files (9 woff2) | **−2.75 MB** (see lab-04) |
  | Deployed artifact, the three above | | | **≈ −9.7 MB** |

  TypeScript program, `raw/tsc-diag-full2.txt` vs `tsc-diag-nolab2.txt` (the matched pair; the
  earlier `-full`/`-nolab` pair was taken before the tree was moved and shows a 1-file
  difference, so ignore it):

  | | with lab | without lab | delta |
  |---|---|---|---|
  | Files in program | 6,320 | 6,207 | **−113** |
  | Lines of TypeScript | 230,730 | 186,367 | **−44,363 (−19.2 %)** |
  | Types | 275,662 | 215,785 | **−59,877 (−21.7 %)** |
  | Instantiations | 926,641 | 787,561 | **−15.0 %** |
  | Check time | 9.02 s | 5.00 s | **−4.0 s (−45 %)** |

  Member-facing JS: still **zero**. I diffed `raw/route-bundle-stats.json` against
  `route-bundle-stats-nolab.json` for all 52 shared routes. Every non-lab route moves by
  −36 to −620 bytes except `/welcome` (−4,044) and `/verify-email` (−23,163); four routes get
  *bigger* by 78 bytes. That is chunk-boundary renumbering, not lab code being removed from a
  member's download - if lab were leaking, the deltas would be one-directional and would
  cluster on the routes that share components with lab rooms, and they do neither. Audit 1's
  chunk-by-chunk proof stands.

  Reachability, unchanged: `/lab` needs a session (`proxy.ts`, audit M19) **and** the admin
  role (`layout.tsx` returns `notFound()`, so a member cannot even learn the tree exists). On
  the demo deployment `/lab` is in `DEMO_CLOSED_PATHS`, so the demo compiles, type-checks and
  deploys all 48 routes plus 2.75 MB of fonts that **literally nobody can open**.
- **What to do**: this is the owner's call and it is restated in plain words under "Owner
  decisions" (#1). The mechanism, if he says yes to excluding lab from the demo build (audit
  1's option 2, which he has not answered): rename the tree's Next special files
  `page.tsx` → `page.lab.tsx` (48), `layout.tsx` → `layout.lab.tsx`, `loading.tsx` →
  `loading.lab.tsx`, and set
  `pageExtensions: IS_DEMO ? ["tsx","ts"] : ["lab.tsx","lab.ts","tsx","ts"]` in
  `next.config.ts`. `scripts/qa/lab-audit.mjs:47` matches `entry === "page.tsx"` and must
  learn the new name in the same commit or every registry href becomes a dead link and
  `npm run check` fails. Non-page modules need no rename: with no page importing them they
  never enter the demo graph. **Verify Turbopack honours multi-dot `pageExtensions` in Next
  16.3.3 before renaming anything** - if it does not, this option dies.
- **Saving**: ~12 s of a 42 s build and ~9.7 MB of artifact, **per deploy of whichever build
  you exclude it from**. Member-facing JS: 0 either way. Member-facing CSS: 0 from this
  finding (that is lab-02, and it is independent - the CSS split pays even if lab keeps
  shipping everywhere).
- **Risk & gate**: medium; it is a build-config change. Proof: `npm run check` (the lab
  registry gate must stay green), a local `next build` with and without `DEMO_MODE=1`
  comparing the route tables, `npm run verify:crawl` against the non-demo build,
  `src/lib/demo.test.mjs` and `security-regressions.test.mjs` stay green. **And the
  constraint in lab-10**: two Playwright specs and three dev scripts drive lab routes; the
  main build must keep them.
- **Confidence**: high on every measured number. Medium on the wall-clock deltas transferring
  to Vercel's builders, which are not this Mac under load 15.
- **Notes**: I looked for a cheaper lever and there is none at this level - the routes are
  already dynamic, already admin-gated, already outside `npm run visual`, and contribute
  nothing to shared JS chunks. What *is* new since audit 1 is that two of the four costs
  (CSS, fonts) turn out to be separable from the "where does lab ship" question entirely, and
  both have autonomous or near-autonomous fixes. Do those first (lab-02, lab-04); they may
  make the big decision less urgent.

---

### lab-02 - Give the lab its own stylesheet: 74 KB raw / 8.7 KB gzip off every member page
- **Where**: `src/app/globals.css:1` (`@import "tailwindcss";`, no `@source` narrowing);
  `src/app/lab/layout.tsx` (the natural mount point for a second sheet); the 890 lab-only
  utility classes are spread across `src/app/lab/**`, concentrated in the Tailwind-styled
  rooms (`tiles/`, `directory/`, `profiles/`, `landings/`, `everything/`, `craft/`,
  `spine/`, `houses/`, `type/`, `support/`) - the eleven `_kit.tsx` Delight rooms style
  themselves with a plain-CSS string and contribute almost nothing.
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: owner (it revives audit-1 owner
  decision 6, which he deferred; a fix session can execute the day he says yes)
- **Evidence**: two numbers, from two directions, and they agree.

  1. **Direct measurement**, `.scratch/audit2-build/.next/static/chunks/32v74upyu8cz7.css`
     vs `.scratch/audit2-build-nolab/.next/static/chunks/2y2xr433bn8gd.css`:

     | | with lab | without lab | delta |
     |---|---|---|---|
     | raw | 238,434 B | 164,037 B | **−74,397 B (−31.2 %)** |
     | gzip -9 | 33,684 B | 24,937 B | **−8,747 B (−26.0 %)** |

     `src/app/globals.css` is **byte-identical** in both worktrees (`diff -q`), so the entire
     difference is Tailwind compiling classes it found in `src/app/lab/**`. This sheet is
     imported by the root layout, so it is on `/`, `/login`, `/signup` and every member page,
     and it is render-blocking.

  2. **Attribution by class token** (my own `node -e` over `src/**/*.{ts,tsx}` and the built
     sheet, reproducing the orchestrator's `raw/css-source-attribution.mjs` method): of 3,058
     class rules, **895 rules / 50,961 bytes** carry a utility token that appears in
     `src/app/lab/**` and in no shipped source file. **393 of those 895 are arbitrary values**
     (`w-[437px]`-shaped) worth 18,898 bytes - exactly the tell the charter asked for. The
     remaining ~23 KB of the 74 KB delta is variant scaffolding, `@property` blocks and
     `--tw-*` declarations that only exist because a lab class needed them, which is why the
     build delta is the honest figure and the attribution is the lower bound.

     Biggest lab-only families, by bytes: `border` 64 rules/4,305 B · `text` 86/4,161 ·
     `bg` 56/3,570 · `from` 19/2,483 · `to` 12/1,526 · `focus` 13/1,497 · `rounded` 25/1,403 ·
     `max` 37/1,209 · `via` 7/1,126 · `sm:text` 23/946.
     Biggest single rules: `backdrop-blur-[2px]` 604 B · `decoration-leaf/40` 333 ·
     `via-border` 313 · `focus-visible:ring-[3px]` 296 · `via-leaf/30` 283 · `via-sky/15` 282 ·
     `ring-4` 261 · `hover:brightness-[1.14]` 254 · `from-[#4E6B54]/40` 241 ·
     `to-[#23241E]/45` 237 · `grayscale-[0.3]` 235 · `sepia-[0.2]` 223 ·
     `peer-focus:-translate-y-[1.35rem]` 155.
- **What to do**: Tailwind is **4.2.2** (`node_modules/tailwindcss/package.json`), so
  `@source not` exists and this is a two-file change plus a rebaseline.
  1. In `src/app/globals.css`, after `@import "tailwindcss";`, add
     `@source not "./lab";` (paths in `@source` resolve relative to the CSS file, and
     `globals.css` sits beside `app/lab/`). Keep a `why` comment naming this finding and the
     8.7 KB.
  2. Add `src/app/lab/lab.css` containing `@import "tailwindcss" source(none);` +
     `@source "./";`, plus a `@reference "../globals.css";` (or a re-declared `@theme`) so the
     lab's `bg-canopy`, `text-leaf`, `--radius` etc. still resolve. Import it from
     `src/app/lab/layout.tsx` - the layout is already the tree's one admin gate, so nothing
     outside `/lab` can pull it in.
  3. A class used by BOTH a shipped file and a lab file stays in `globals.css` automatically
     (shipped scanning still finds it). Only lab-exclusive classes move. Nothing a shipped
     component renders can disappear.
  4. Clear `.next` (CLAUDE.md gotcha 1: HMR does not reliably pick up token changes) and
     rebaseline only if `npm run visual` moves - it should not move at all, and if it does,
     that diff IS the bug.
- **Saving**: **8,747 bytes gzip / 74,397 bytes raw of render-blocking CSS on every route**,
  including the public landing page a prospective alumnus sees first. Zero lines. Zero visible
  change. Costs ~5 KB gz of duplicated scaffolding on the lab routes themselves, which only
  the owner ever loads.
- **Risk & gate**: medium. `npm run check` (Tailwind must still compile; the shape+colour
  protocol audit reads source, not CSS, so it is unaffected), then **`npm run visual` is the
  real gate** - 11 routes × 2 viewports against committed baselines, and a class wrongly
  dropped would show as a diff there. Then `npm run verify:crawl` and one manual pass over
  `/lab/tiles`, `/lab/directory`, `/lab/profiles` and `/lab/everything`, the four
  Tailwind-heaviest rooms. Do NOT run `check` and `visual` concurrently (project memory:
  bitten twice on 2026-08-29).
- **Confidence**: high on the number (two independent measurements, one of them a direct
  build diff). Medium on the effort: `@source not` plus a second entry point is documented
  Tailwind v4, but this repo's `@theme` lives in `globals.css` and getting the lab sheet to
  see those tokens without duplicating them is the fiddly half. The one thing that would
  change my mind: if `@reference` turns out to pull the whole theme *and* its utilities into
  the lab sheet, the split still works but the lab pages get heavier, which nobody but the
  owner would notice.
- **Notes**: this is the exact item the owner declined in audit 1 with "what are you gonna do
  with the info", and he was right to, because the number did not exist and the lever was
  described as "real work for 2-9 KB gz". It is 8.7 KB gz, at the top of that range, it is
  render-blocking, and it is on the signed-out landing page. I think that changes the answer,
  but it is still his. Related: lab-01 (if lab is excluded from the demo build, the demo's CSS
  drops by the same 74 KB for free, without this work - but the main site's does not).

---

### lab-03 - Three concept harnesses import every variant eagerly; `/lab/profiles` is the app's heaviest route
- **Where**: `src/app/lab/profiles/page.tsx:33-41` (nine static variant imports),
  `:43-53` (the CONCEPTS table); `src/app/lab/landings/page.tsx:29-33` (five);
  `src/app/lab/support-ideas/page.tsx:28-31` (four). No `next/dynamic` or `import()`
  anywhere in the lab: `raw/dynamic-imports.txt` lists 52 sites and **zero** are under
  `src/app/lab/`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: from `raw/route-js.txt` and the chunk paths in `raw/route-bundle-stats.json`
  resolved against `.scratch/audit2-build/`:

  | route | first-load | chunks | beyond the `/lab` baseline (639 KB) |
  |---|---|---|---|
  | `/lab/profiles` | **1,363 KB** - the heaviest route in the whole app, ahead of `/profile/[id]` at 1,258 | 34 | 20 chunks, **742 KB** |
  | `/lab/crop` | 1,130 KB | 28 | 14 chunks, 509 KB |
  | `/lab/landings` | 926 KB | 20 | 6 chunks, 305 KB |
  | `/lab/support-ideas` | 818 KB | 19 | 5 chunks, 197 KB |

  The profiles harness renders exactly one of nine variants (`const Active = CONCEPTS.find(...)
  .Component`) yet statically imports all nine - 6,669 lines of variant modules plus the six
  `_chain-*` treatments (2,845 lines) that only Letterhead III uses, to display roughly 800
  lines' worth. Same shape in landings (3,668 lines of variants, one shown) and support-ideas
  (611, one shown).

  This is not theoretical cost. `src/app/lab/loading.tsx`'s own header records why it exists:
  *"before this boundary existed a first click on a heavy room painted NOTHING for seconds and
  read as 'the lab doesn't load' (the owner's 60% complaint)"*. The eager imports are a large
  part of why.
- **What to do**: in each of the three harnesses, replace the static variant imports with
  `next/dynamic`, keeping the deep-link contract intact (the `?v=<key>` URLs are load-bearing
  for the screenshot tooling and are documented in each file's header - do not touch the key
  strings). Sketch for profiles:

  ```
  const CONCEPTS = [
    { key: "letterhead", label: "Letterhead",
      Component: dynamic(() => import("./_variant-letterhead")) },
    ...
  ] as const;
  ```

  `ssr: false` is not needed and should not be added - these are client components already and
  the harness is inside a `<Suspense>` boundary. Keep Letterhead III eager if a cold open of
  the default tab matters to the owner; the other eight are the saving. Do the same for the six
  `_chain-*` modules behind `?chain=`, which are a second nine-into-one of the same shape.
- **Saving**: on `/lab/profiles`, most of 742 KB of first-load JS deferred (I will not claim a
  precise figure without a build, and I am not allowed to run one - but eight of nine variants
  and five of six chain treatments is the shape of it). `/lab/landings` and
  `/lab/support-ideas` proportionally. **Zero lines.** No member sees any of this; the
  beneficiary is the one person who opens these rooms, and the complaint that produced
  `loading.tsx` is his.
- **Risk & gate**: low. `npm run check` (TypeScript will complain if a `dynamic()` return type
  is threaded wrong). Then open each of the three rooms and click every tab, plus the deep
  links `?v=passport`, `?v=terrace`, `?v=letterhead-3&chain=stave`, `?v=noticeboard`,
  `?v=stamps` - the fix-prompt records those exact URLs as the screenshot set. `npm run visual`
  does not cover lab routes, so the click-through IS the gate.
- **Confidence**: high that the imports are eager and that one variant renders at a time
  (read both files). Medium on how much Turbopack actually splits out, because one 139 KB
  chunk on `/lab/profiles` may already be the nine variants bundled together, in which case
  the saving is the whole 139 KB rather than a fraction of 742 KB. Either way it is real and
  the direction is right.
- **Notes**: I checked whether this is the LLM-bloat "registry with one caller" signature and
  it is not - the CONCEPTS table has a genuine job (label, key, deep link, tab order). The
  bloat is the import style, not the table. Related: lab-01 (this does not change build time
  meaningfully; the modules still compile).

---

### lab-13 - One lab room is the only reason `world-atlas` is still a production dependency
*(filed late in my pass; by size it belongs here, fourth. The id is stable.)*
- **Where**: `src/app/lab/directory/_maps.tsx:28`
  (`import worldData from "world-atlas/countries-110m.json"`) and `:46`
  (`const land = feature(worldData as any, (worldData as any).objects.countries)`) - against
  `src/components/directory/alumni-map.tsx:82-101`, which fetches the same atlas from
  `public/geo/countries-110m.json` instead, and `package.json:64` (`"world-atlas": "^2.0.2"`,
  in `dependencies`).
- **Phase**: relocate / library
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn 'world-atlas'` over `src/`, `scripts/`, `e2e/`, `public/`,
  `next.config.ts` and `package.json` returns **four** hits: the lab import, a comment in the
  same lab file, a comment in `alumni-map.tsx` describing the old approach, and the
  `package.json` line. **There is exactly one importer of this package in the entire repo and
  it is a lab room.**

  `alumni-map.tsx:82-101` is the fix audit 1 shipped as `b899d1a`, and its comment is the
  argument, verbatim: *"`import worldData from 'world-atlas/countries-110m.json'` compiled
  105 KB of JSON into a JavaScript module and put it in the first load of the heaviest route in
  the app - parsed on the main thread before /directory could become interactive, and
  re-downloaded on every deploy because the chunk hash moves with the build even though the
  coastlines do not."* The shipped page was fixed; the lab room that prototyped that very map
  was not, so the lab is now carrying the exact antipattern the shipped code documents as
  wrong. That reads as an oversight in `b899d1a`, not a decision.

  The consequences, measured: `node_modules/world-atlas` is **7.9 MB** and is a *runtime*
  dependency, so it is installed on every Vercel build. `/lab/directory`'s heaviest chunk is
  **198 KB** (`163zhp5dmrn-k.js`), and 105 KB of that is coastline JSON. The atlas already
  exists as a static file at `public/geo/countries-110m.json` (107,761 bytes, immutable-cached
  by a `next.config.ts` header), served on the same origin the lab room runs on.
- **What to do**: two options, both small.
  1. **Best, and it is what the room is *for*.** Make `_maps.tsx` fetch the atlas exactly the
     way `alumni-map.tsx` does - copy its `ATLAS_URL`/`loadLandPaths(signal)` shape (about 20
     lines, worked example right there) and hold `landPaths` in state. The room's whole purpose
     is judging five maps against the shipped one, so it should load its land the same way the
     shipped one does or the comparison is dishonest. Then delete `"world-atlas"` from
     `package.json` `dependencies`. Note the `as any` pair at `_maps.tsx:46` goes away too -
     `alumni-map.tsx` types it as `Parameters<typeof feature>[0]`, which is two of the lab's
     four `any` sites gone.
  2. **Minimal, if the async rewrite is unwelcome.** Change the import to the public file
     (`import worldData from "../../../../../public/geo/countries-110m.json"`, path to be
     checked) and drop the dependency. This keeps the 105 KB in the lab chunk but still removes
     the package. Strictly worse; listed only so the dependency win is available cheaply.
- **Saving**: **−1 production dependency** (7.9 MB of `node_modules`, one fewer Renovate
  target, one fewer supply-chain surface), **−105 KB from `/lab/directory`'s first load**, and
  **−2 of the lab's 4 `any` sites**. Roughly line-neutral (option 1 adds ~15 lines of fetch and
  removes ~4).
- **Risk & gate**: low. `npm run check` (the dependency advisory gate and knip both read
  `package.json`; knip currently does **not** flag `world-atlas` precisely because the lab
  import keeps it honest, so after the fix it should either be gone from `package.json` or knip
  will start reporting it - either outcome is a correct signal). Then open `/lab/directory` and
  confirm all five map concepts still draw coastlines, and `/directory` to confirm nothing
  moved there. `npm run visual` masks the directory map, so it will not catch a regression
  here - the manual look is the gate.
- **Confidence**: high. The one thing that would change my mind: if `public/geo/` is not served
  on the lab's origin for some reason I have not thought of - but `/lab` and `/directory` are
  the same Next app on the same host, so it is.
- **Notes**: **this one is really the dependency lens's prize and I am handing it over** - the
  finding lives in my territory but the payoff (`package.json`) is theirs. It is also a small
  lesson worth writing into `docs/spec/lab-voice.md`: when a shipped file is fixed, the lab
  room that prototyped it is the second place the fix has to land, or the room quietly becomes
  a museum of the bug. Related: lab-03 (the same room family's eager-import habit),
  lab-05 (`_maps.tsx`'s two knip-unused exports).

---

### lab-04 - 63 Google font files, 2.75 MB, are built and deployed for two lab rooms, one of them archived
- **Where**: `src/app/lab/type/_fonts.ts:36-116` (nine families: Fraunces, Newsreader,
  Instrument Serif, Literata, Libre Baskerville, Source Sans 3, Public Sans, Inter, Figtree -
  every one with `style: ["normal","italic"]`, three with explicit `axes`);
  `src/app/lab/craft/_italic-fonts.ts:25-35` (Source Sans 3 + Libre Baskerville, italic, no
  `preload: false`). Consumers: `type/page.tsx:6` and `craft/page.tsx:7` only - nothing else
  in the repo imports either file.
- **Phase**: relocate (dev-only weight living in the shipping path)
- **Tier**: T3     **Class**: structural     **Decides**: owner (it is really "does `/lab/type`
  still earn its keep", which is a room question)
- **Evidence**:
  - `.scratch/audit2-build/.next/static/media`: **3.0 MB, 75 files, 72 woff2**.
    `.scratch/audit2-build-nolab/.next/static/media`: **256 KB, 12 files, 9 woff2**. The
    difference is 63 woff2 and 2.75 MB, all of it these two files' doing.
  - Two extra CSS chunks exist only in the full build:
    `3m6mr8e1jtg_9.css` (23,686 B raw / 3,278 gz) and `2n0wc4xou_xzc.css` (5,824 / 1,230).
    `grep -rl` over `.next/server/app` puts them in exactly two manifests:
    `lab/type/page_client-reference-manifest.js` and
    `lab/craft/page_client-reference-manifest.js`. **So no member ever downloads a byte of
    this** - the app's own font sheet (`1vjuupxoge4ny.css`, 9,453 B) is byte-identical in both
    builds. The cost is entirely build-time and artifact-size.
  - `next/font/google` downloads and self-hosts at build time, so **every cold build fetches
    63 font files from Google's CDN** before it can finish. That is a build-time dependency on
    a third party for a room nobody opens on a deploy.
  - `/lab/type` is registered `status: "archived"` (`_registry.ts:279`), and its verdict never
    shipped: the app still loads Libre Baskerville + Source Sans 3 as statics from
    `src/app/layout.tsx`, which is precisely what the room argues against. `git log` puts its
    last change at 2026-08-03 (`45531f9`, a repo-wide a11y sweep, not a design change).
    `/lab/craft` is also `archived`, last touched by the same sweep.
  - knip lists nine of the ten exports in `_fonts.ts` as unused
    (`raw/knip-repo-config.txt:49-58`): `libre`, `sourceSans`, `fraunces`, `newsreader`,
    `instrument`, `literata`, `publicSans`, `inter`, `figtree`, `SHIPPED_SET_WIDTH`. They are
    not dead - `ALL_FONT_VARS` composes all nine at `:118-128` and `type/page.tsx` renders that
    string - but the `export` keyword on each is dead (see lab-05).
- **What to do**: three options, in increasing order of cost to the record.
  1. **Do nothing.** It is 2.75 MB of artifact and a build-time fetch, and no member pays.
     Legitimate.
  2. **Trim the room to what the argument still needs.** Four of the nine families exist only
     as the losing half of a comparison the owner declined. Dropping Newsreader, Literata,
     Figtree and Public Sans (the two heaviest pairings' four faces) would cut roughly half the
     63 files while leaving Today / Fraunces / Instrument Serif intact and the room's measured
     numbers unchanged - the `PAIRINGS` table's `kb` figures are measured constants in the
     file, not computed from the loaded fonts, so the prose survives a face going away. This
     needs a paragraph edit, not just a delete, and the room's whole point is side-by-side, so
     I am uneasy recommending it.
  3. **Freeze `/lab/type` and `/lab/craft`** with the rest of the archived set (owner decision
     #2), which removes both files from the build entirely.
- **Saving**: **2.75 MB of deployed artifact and 63 build-time HTTP fetches**, at option 1's
  price of nothing, option 2's price of ~1.4 MB, option 3's price of the two rooms leaving the
  build. Zero member bytes in every case.
- **Risk & gate**: low for option 2 (`npm run check`, then open `/lab/type` and read the five
  pairings; the room's own `SHIPPED_KB`/`setWidth` constants must still make sense against the
  remaining copy). Option 3 inherits lab-01's gate.
- **Confidence**: high on the measurement (two `du`s and a manifest grep). Medium on option 2
  being worth doing at all - the room is a specimen book and a specimen book with two specimens
  removed is a worse specimen book.
- **Notes**: `_fonts.ts` is a genuinely excellent file - its header is a 30-line explanation of
  three `next/font` traps (`style`, `weight` opting out of the variable file, `axes` being
  silently ignored) that would each cost a session to rediscover, and every number in it is
  measured off the font binaries. **It should not be deleted even if the room is frozen**; if
  anything the trap paragraph belongs in `docs/TRAPS.md`. That is a suggestion for the docs
  lens, not a finding of mine.

---

### lab-05 - The 48 unused lab exports knip lists: classified (de-export 41, dead 4, keep 3)
- **Where**: `raw/knip-repo-config.txt:12-59` (39 lab lines under "Unused exports") and
  `:83-91` (9 lab lines under "Unused exported types"). 48 total.
- **Phase**: dead (4 of them) / hygiene (44 of them)
- **Tier**: T1     **Class**: cheap (the 44) + structural (the 4)     **Decides**: autonomous
- **Evidence and the classification the charter asked for**, one row per knip line. "de-export"
  = the symbol is used inside its own file, only the `export` keyword is dead (0 lines saved,
  and knip goes quiet). "dead in room" = nothing calls it anywhere, it can go. "keep as
  documentation" = it is a labelled constant a room reader is meant to find.

  | symbol | file:line | verdict | why |
  |---|---|---|---|
  | `BASE_CSS` | `_kit.tsx:234` | **de-export** | used at `_kit.tsx:197` inside `DelightShell`; no external consumer (grepped all 15 `_kit` importers) |
  | `FilterPanel`, `describeFilters`, `SentenceLine` | `directory/_chrome.tsx:73,313,327` | de-export | internal to the chrome concepts |
  | `PLACES`, `makeMembers` | `directory/_data.ts:69,257` | de-export | `membersForScale` is the exported door |
  | `WorldCanvas`, `usePoints` | `directory/_maps.tsx:66,901` | de-export | the five `Map*` components are the door |
  | `ShippedCard`, `PersonRow`, `CompactCard`, `RuledRow` | `directory/_people.tsx:40,68,94,119` | de-export | `ResultGrid` picks one by density |
  | `LIVE_ROWS`, `LIVE_TOTAL`, `TAGGED`, `FIELDS`, `STAGES` | `directory/_profession.tsx:21,36,41,65,71` | **keep as documentation** | these are the 21 real (jobTitle, workplace) rows read off the live database on 2026-08-02, typo included, and the tag vocabulary they would map to. They are the evidence for the tagging pass that later shipped as `tag-professions`. De-exporting is fine; deleting is not |
  | `PEOPLE` | `groups-rethink/_data.ts:6` | de-export | used by `_shell.tsx` inside the room |
  | `BirdAvatar` | `groups-rethink/_shell.tsx:32` | de-export | a local re-export of the shipped one |
  | `H` | `hoopoe-marks/_parts.tsx:25` | de-export | `export { H, G } from "@/lib/hoopoe-geometry"` - `G` is imported by two rooms, `H` by none |
  | `Feather`, `Eye`, `Bill` | `hoopoe-marks/_parts.tsx:75,83,90` | **dead in room** | see lab-06 |
  | `yearRange` | `profiles/_chain-kit.tsx:101` | de-export | used inside the kit |
  | `VIEWPORT`, `SIDEBAR`, `UNI_LEFT` | `spine/_columns.tsx:19,20,156` | de-export | the room reads them through `geom()` |
  | `PLEDGE`, `SEGMENTS`, `MONTHLY`, `BUILD_COST`, `BUILD_RECOVERED` | `support-ideas/_shared.tsx:39,45,51,53,54` | **keep as documentation** | the rupee figures every one of the four Support concepts shares, so a difference between two concepts is a design difference and never a data one (the file's header says exactly this). De-export, do not delete |
  | `BUILD_COST` | `support/_bars.tsx:15` | de-export | second copy, different room, same number |
  | `LETTERS`, `GATES`, `SURFACES`, `verdictFor` | `tiles/_specimens.tsx:344,834,869,1010` | de-export | consumed by `Scorer`/`M` in the same file |
  | `libre`, `sourceSans`, `fraunces`, `newsreader`, `instrument`, `literata`, `publicSans`, `inter`, `figtree`, `SHIPPED_SET_WIDTH` | `type/_fonts.ts:46-170` | de-export | all nine feed `ALL_FONT_VARS` at `:118`; `SHIPPED_SET_WIDTH` is the comparison baseline the page prints |
  | `Sheared` | `type/_specimens.tsx:38` | **dead in room** | `craft/page.tsx:22` declares its own byte-identical `Sheared` rather than importing this one - the drift that proves the export dead |
  | `LabStatus`, `LabChildEntry` | `_registry.ts:37,47` | **keep** | `LabStatus` is the union `LabEntry.status` is typed by and `LabChildEntry` types `children`; both are read by a human editing the registry, and the registry is the one index the whole gate depends on. Naming them is the documentation |
  | `Place`, `ScaleKey` | `directory/_data.ts:59,419` | de-export | internal shapes |
  | `Person` | `groups-rethink/_data.ts:4` | de-export | internal |
  | `Shot` | `landings/_shared.ts:20` | **keep** | it is a re-export of the shipped `src/components/landing/shots.ts` type; see lab-07 |
  | `ChainMetrics` | `profiles/_chain-kit.tsx:186` | de-export | `useChainMetrics`'s return type |
  | `MockLinkKind` | `profiles/_data.ts:18` | de-export | internal |
  | `SurfaceScore` | `tiles/_specimens.tsx:861` | de-export | internal |

  Tally: **41 de-export, 4 dead in room (`Feather`, `Eye`, `Bill`, `Sheared`), 3 kept as
  documentation** (`LIVE_*`/`TAGGED`/`FIELDS`/`STAGES` counted as one group,
  `PLEDGE`-family as one, the two registry types as one).
- **What to do**: drop the `export` keyword on the 41 (mechanical, one keyword each, no line
  moves). Delete the 4 (lab-06 covers three of them; `type/_specimens.tsx:38-42`'s `Sheared` is
  five lines - leave `craft/page.tsx`'s copy alone, it is now the only one). Leave the three
  documentation groups exported *and add a one-line `// exported so knip's noise stays honest`
  comment* - or, better, add them to `scripts/qa/knip.jsonc`'s ignore list so the next audit
  does not re-litigate them. That last bit is the knip config's owner's call, not mine.
- **Saving**: ~27 lines (the four dead symbols and their now-unused imports), 48 fewer knip
  lines. Class: cheap, and I am labelling it cheap - this is not the headline and must not be
  reported as one.
- **Risk & gate**: low. `npm run check` (TypeScript catches a missed consumer immediately).
  Then open `/lab/directory`, `/lab/tiles`, `/lab/type`, `/lab/hoopoe-marks` and
  `/lab/support-ideas` once each.
- **Confidence**: high - I grepped every one of the 48 across all of `src/app/lab` and inside
  its own file. The one thing that would change my mind: a room added between this audit and
  the fix importing one of them; re-run the grep first.
- **Notes**: audit 1 did this exact sweep once (`lab-02`, shipped as `09f5ebe`, 110 lines) and
  the list has regrown to 48 in ten days because new rooms export their internals by reflex.
  That is a signature-5 pattern (over-abstraction by habit), and the durable fix is not another
  sweep - it is one line in `docs/spec/lab-voice.md`'s pre-registration checklist:
  *"a helper only your own page renders is not exported."* I would put that in with the fix.

---

### lab-06 - Three React wrappers in `hoopoe-marks/_parts.tsx` draw parts the room never uses
- **Where**: `src/app/lab/hoopoe-marks/_parts.tsx:75-77` (`Feather`), `:83-88` (`Eye`),
  `:90-95` (`Bill`), plus their imports at `:16` (`eyePrims`), `:18` (`featherPrims`),
  `:19` (`billPrims`) and `:21` (`type FeatherOptions`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the file exports six components. `grep` over the whole repo finds exactly two
  importers - `hoopoe-marks/page.tsx:15` takes `{ Body, Crest, Face, G }` and
  `glass-edges/page.tsx:46` takes `{ Crest, Face }`. `Feather`, `Eye` and `Bill` are imported
  by nobody and called by nobody inside `_parts.tsx` either (I read the file in full; `Draw`
  is the only internal helper and the five other components call it directly). knip agrees
  (`raw/knip-repo-config.txt:31-34`).

  **Important non-consequence**: the underlying `featherPrims`, `eyePrims` and `billPrims` in
  `src/lib/hoopoe-geometry.ts` are **NOT** dead - `crestPrims` calls `featherPrims` in its loop
  (`hoopoe-geometry.ts:210`) and `facePrims` calls both `billPrims` and `eyePrims`
  (`:296-299`). Deleting the three wrappers touches nothing in the lib. I checked this
  specifically because the obvious chain conclusion would have been wrong.
- **What to do**: delete `Feather`, `Eye`, `Bill` and the three now-unused prim imports and the
  `FeatherOptions` type import. Leave `type WithFilter` (used by `Crest` and `Face`).
- **Saving**: 22 lines of components + 4 import lines = **~26 lines**, and one less place where
  a future session has to work out whether a component is part of the room or scaffolding.
- **Risk & gate**: low. `npm run check`, then open `/lab/hoopoe-marks` and `/lab/glass-edges`
  and confirm the seven marks and the edge-light study still draw.
- **Confidence**: high. The one thing that would change my mind: if the owner wants a
  standalone feather mark back - and the registry note currently *claims the room has one*,
  which is lab-09's problem, not evidence that the code is live.

---

### lab-07 - Three files in the shipping path exist only for a lab room
- **Where**:
  - `src/components/support/wood.tsx` (246 lines, `"use client"`) - the only importer in the
    repo is `src/app/lab/support-ideas/_variant-aviary.tsx:23`.
  - `src/components/landing/showcase-shot.tsx` and `src/components/landing/shots.ts` - their
    only *live* importers are `src/app/lab/landings/_variant-clarity.tsx:38` and
    `src/app/lab/landings/_shared.ts:20,58`. Their only other importer,
    `src/components/landing/showcase.tsx`, is itself one of knip's seven unused files
    (`raw/knip-repo-config.txt:2-8`), because `src/app/page.tsx` has the showcase switched off.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: owner (it is entangled with audit-1's
  open landing-showcase decision, which is his)
- **Evidence**: I walked every `@/...` specifier in `src/app/lab/**` and, for each, grepped for
  a non-lab consumer (both `@/`-style and relative). Ten came back lab-only at first pass;
  seven were false positives where the shipped consumer uses a relative import from a sibling
  (`collection-client.tsx` pulls `./photo-river`, `./year-rail`, `./photo-scrubber`,
  `./river-controls`, `./scope-caret`; `app-shell.tsx` pulls `./sidebar`; `ui/card` is used by
  shadcn siblings). Two more, `src/lib/hoopoe-geometry.ts` and `src/lib/edge-light.ts`, are
  lab-plus-scripts (`scripts/dev/build-app-icon.mjs`, `scripts/dev/generate-icons.mjs`) and are
  pinned by `scripts/qa/protocol-audit.mjs:117-118` and `src/lib/mark-centring.test.mjs` - they
  are legitimate build-time lib and I am NOT calling them misplaced.

  That leaves three genuine cases. `wood.tsx`'s own header already admits it
  (*"Today its ONLY consumer is the lab reference at /lab/support-ideas?v=aviary"*), which is
  why this is a not-quite-finding for that file. `showcase-shot.tsx` + `shots.ts` are the new
  half: **the lab is the only thing keeping two shipped-path landing files alive**, and knip
  therefore does not list them among the dead five, which will mislead the next person who
  reads that list.
- **What to do**: nothing until the owner settles the landing showcase (audit-1 §4, still
  open - see "Audit-1 carry-overs"). Then, whichever way he goes:
  - If the showcase comes back on: nothing to do, all three files are shipped again.
  - If it goes: move `showcase-shot.tsx` and `shots.ts` into `src/app/lab/landings/` beside
    `_shared.ts` (which today re-exports `SHOTS` and `type Shot` from them, so the move is one
    import path in two files), delete `showcase.tsx`, `feature-section.tsx`,
    `trust-section.tsx`, `landing-footer.tsx`, `footer-hoopoe.tsx`. `wood.tsx` stays where it
    is: its header documents a specific revival recipe involving `app-shell.tsx` and a
    containing-block trap, and moving it into the lab would make that recipe a lie.
- **Saving**: 0 lines by itself. What it buys is that `src/components/landing/` stops
  containing two files that only a lab room reads, and that the next knip run tells the truth
  about the showcase family. Combined with the showcase deletion it unblocks: ~5 files.
- **Risk & gate**: low. `npm run check`, then `/lab/landings?v=clarity` and
  `/lab/support-ideas?v=aviary` must still render.
- **Confidence**: high on the import facts (grepped both directions). Low on the timing -
  this is downstream of a decision the owner has not made.
- **Notes**: there is a fourth, smaller instance in the other direction:
  `src/app/lab/profiles/_profile-avatar.tsx` (185 lines) was **moved into** the lab by audit 1
  (`0e4a264`) precisely because only lab imported it. That worked and nothing broke, which is
  the precedent for doing the same to `showcase-shot.tsx`.

---

### lab-08 - `/lab/crop` calls itself throwaway in three places, but `/lab/collection` now depends on it
- **Where**: `src/app/lab/crop/page.tsx:22-24` ("Throwaway. Delete this room, public/lab/crop/
  and its registry row"), `src/app/lab/crop/_specimens.ts:17-19` (same instruction),
  `src/app/lab/_registry.ts:166` (the registry row repeats it) - against
  `src/app/lab/collection/_archive.ts:3` (`import { SPECIMENS } from "../crop/_specimens"`)
  and `:25-27`, which contradicts all three: *"When /lab/crop is retired, its specimens and
  their eleven webp files move somewhere shared rather than going with it"*.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (the move) / owner (whether
  the room goes)
- **Evidence**: `public/lab/crop/` holds 14 webp, 1.9 MB, all eleven `shape-*.webp` added since
  audit 1 (`raw/files-added-since-audit1.txt`). `_specimens.ts` names eleven of them;
  `pano-21x9.webp`, `phone-9x16.webp` and `grainy-420.webp` are the other three and are **not**
  referenced by `_specimens.ts` - I grepped every filename. Those three are the only genuinely
  unreferenced bytes in `public/lab/`.

  `/lab/collection` and `/lab/collection/swap` are the lab's two most actively developed rooms
  (17 and 4 commits since 2026-08-01, last touched 2026-09-02) and both are driven by two
  Playwright specs (lab-10). Both get their photographs, transitively, from
  `crop/_specimens.ts`. So today the "throwaway" room is load-bearing for the room the
  Collection rework is being judged in, and for two committed E2E suites.
- **What to do**: one move, executable now, independent of any owner decision.
  1. Move `SPECIMENS`/`WIDTHS` out of `src/app/lab/crop/_specimens.ts` into a shared lab
     fixture, e.g. `src/app/lab/_photo-fixtures.ts`, and the eleven webp from
     `public/lab/crop/` to `public/lab/photos/`. Update the `src:` strings, `crop/page.tsx` and
     `collection/_archive.ts`.
  2. Delete `public/lab/crop/pano-21x9.webp`, `phone-9x16.webp`, `grainy-420.webp` - nothing
     references them (verified by filename grep across `src/`, `scripts/`, `e2e/`, `docs/`).
  3. Rewrite the three "throwaway" comments to say what is actually true: the ROOM is
     throwaway, the fixtures are not.
- **Saving**: unblocks a future room deletion; deletes 3 unreferenced webp. `du` the three for
  the exact figure before removing - I did not measure them individually because they are a
  handful of hundreds of KB out of 1.9 MB, and quoting a total I have not split would be
  dishonest.
- **Risk & gate**: low-medium. `npm run check`, then **`npx playwright test e2e/collection-seek.spec.ts
  e2e/collection-journeys.spec.ts`** (they load `/lab/collection`, which loads the fixtures) and
  open `/lab/crop`. Note that a fix session may run Playwright; I may not.
- **Confidence**: high. `collection/_archive.ts` asks for this move in its own header and cites
  the spec section that has been asking for it since the campaign opened.

---

### lab-09 - The registry describes rooms that no longer exist, and two audit-1 corrections never landed
- **Where**: `src/app/lab/_registry.ts:233` ("76 findings"), `:360` (the hoopoe-marks note),
  `:166` (the crop note, covered by lab-08); `src/app/lab/spine-marker/page.tsx:6-7`.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**, one per site:
  1. `_registry.ts:233` - `/lab/everything` is described as **"76 findings"**.
     `grep -c 'id: "' src/app/lab/everything/_findings.ts` = **68**. Audit 1 raised this exact
     line (its `lab-03` item 4) and the fix never landed, while items 1 and 3 of the same
     finding did (`actions.ts`'s publicPaths claim and the `wood-mount.tsx` pointer are both
     corrected in the current file).
  2. `spine-marker/page.tsx:6-7` - *"Not linked from anywhere (including `_kit.tsx`'s `ROOMS`
     registry) on purpose."* This was already doubly wrong at audit 1 (the room HAS a registry
     row at `_registry.ts:296`, and `ROOMS` lived in `_second-look-kit.tsx`, not `_kit.tsx`).
     It is now **triply** wrong: audit 1's own `lab-02` fix (`09f5ebe`) **deleted `ROOMS`
     entirely**, so the comment now names a symbol that does not exist anywhere in the repo.
  3. `_registry.ts:360` - `/lab/hoopoe-marks` is described as **"Ten identity directions ...
     crest, profile head, face, feather, roundel, wing bars, monogram, extreme crop."** The
     room's `MARKS` array holds **seven** entries with the keys `fan`, `fan-bled`, `peek`,
     `rising`, `portrait`, `shoulder`, `onecolour`, and the page's own header says *"Seven
     marks"*. There is no roundel, no wing-bar mark and no monogram in the room. The registry
     is describing the room as it stood before `273c969` rebuilt it on 2026-08-27. This is the
     worst of the three, because the registry is the one page the owner reads to decide which
     room to open.
- **What to do**: four string edits, no behaviour change. (1) "68 findings". (2) delete the
  sentence, or replace with "Registered in `_registry.ts`; visit directly." (3) rewrite the
  hoopoe-marks note from the room's own seven `label` strings. (4) the crop note, per lab-08.
  While in the file, re-read every note against its room - I spot-checked the other eleven
  actively-developed rooms' notes and they are accurate, but I did not check all 47.
- **Saving**: 0 lines. Correctness of the index the whole tree hangs off. In a repo where the
  owner has said the comments are the product, a note that describes a room that no longer
  exists is a real defect.
- **Risk & gate**: low. `npm run check` (`lab-audit.mjs` regexes `href:` values only, so note
  text is free to change), then load `/lab` and read the cards.
- **Confidence**: high; each verified against the current file and the commit that made it
  stale.
- **Notes**: this is the second audit in a row to file a "the lab's self-description has
  drifted" item, and half of the last one was dropped. The durable fix is a checklist line in
  `docs/spec/lab-voice.md` - *"if you rebuild a room, rewrite its registry note in the same
  commit"* - and that file already has a pre-registration checklist to put it in.

---

### lab-10 - Five things outside the lab drive lab routes; any freeze must exempt them
- **Where**: `e2e/collection-seek.spec.ts` (10 × `page.goto("/lab/collection")`, plus the
  header at `:22` explaining why: *"the live archive holds a"* [two photographs]);
  `e2e/collection-journeys.spec.ts:8` (*"drives /lab/collection"*);
  `scripts/dev/centroid.mjs:16` (`BASE = "http://localhost:3000/lab/centroid"`, the
  `npm run dev:centroid` convergence loop);
  `scripts/dev/apple-edge/compare.mjs:18` and `look.mjs:8-9,29`
  (`/lab/glass-edges`, `/lab/hoopoe-marks`);
  `scripts/qa/crawl.mjs:44` (`/lab` is in `npm run verify:crawl`'s route list);
  `scripts/qa/phase6-probe.mjs:84-98` (probes `/lab`'s three auth postures for security item
  M19); `scripts/qa/audit-status.mjs:483-490` (M19's live probe asserts `/lab` is not in
  `publicPaths`); `scripts/qa/protocol-audit.mjs:39` (filters lab OUT of the shape+colour
  audit, deliberately); `src/components/common/motion-features.tsx:21` (LazyMotion stays
  non-strict *because* lab rooms use `motion.*`).
- **Phase**: architecture (a constraint, not a saving)
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: greps above, each read in its file. The Collection one is the sharp edge:
  `/lab/collection` is not a snapshot, it is the **test fixture for the Collection rework**,
  because the real `/collection` holds two photographs that both say "asdf". Freezing it out
  of the build would break two committed Playwright suites and remove the only surface on
  which the river, the year rail, the scrubber and the seek can be exercised at all.
- **What to do**: if lab-01 goes anywhere, carry this list into the plan. The demo-only
  exclusion (lab-01 option 2) is safe against all of it, because none of these run against a
  demo build. A main-build exclusion is **not** safe: it would break `verify:crawl`,
  `dev:centroid`, the apple-edge scripts and, most importantly, the two Collection specs.
- **Saving**: none. This finding exists to stop a later session breaking five things.
- **Risk & gate**: n/a.
- **Confidence**: high.
- **Notes**: this reframes the "freeze" question. The 20 rooms that have not been touched since
  the 2026-07-30 migration are freezable in principle; the dozen live ones are working
  infrastructure. A blanket answer is the wrong shape - see Owner decisions #2.

---

### lab-11 - `/lab/type` and `/lab/craft` load two font families under the app's own family names
- **Where**: `src/app/lab/type/_fonts.ts:46-58` (`libre`, `sourceSans` - the app's two
  families, requested again with `style: ["normal","italic"]` and no `preload: false`);
  `src/app/lab/craft/_italic-fonts.ts:25-35` (the same two, again).
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `_italic-fonts.ts`'s own header flags the hazard precisely: *"next/font
  registers these under the REAL family names ('Libre Baskerville'), not hashed ones, so
  loading them here makes the real italic available page-wide. That is why the 'what ships'
  specimen reproduces the shear with a transform instead of `font-style: italic`, which would
  silently pick up these files and make the comparison a lie."* `craft/page.tsx:22-26`
  implements that workaround (`[transform:skewX(-11.3deg)]`), and so does
  `type/_specimens.tsx:38`'s dead twin.

  This is not a bug - it is documented and worked around in both rooms. I raise it because it
  is a **trap a third room would fall into**: any future lab room that imports either fonts
  file and then writes `italic` anywhere is comparing the wrong two things and will not know.
  The two files also differ (`_fonts.ts` sets `preload: false` on seven families but not on
  `libre`/`sourceSans`; `_italic-fonts.ts` sets it on neither), which is drift between two
  files doing the same job in two rooms.
- **What to do**: two options. Cheap: add `preload: false` to `libre` and `sourceSans` in both
  files (they are specimens, never the page's body face; this saves two preload links on two
  admin-only routes and makes the two files consistent). Better: delete
  `craft/_italic-fonts.ts` entirely and have `craft/page.tsx` import `libre` and `sourceSans`
  from `type/_fonts.ts`, which already loads exactly those two with the same options - one
  source, and the trap lives in one place. That removes 35 lines and one file, at the cost of
  coupling two rooms, which in a lab is usually the wrong trade. **I lean to the cheap option**
  and flag the better one for the owner's taste.
- **Saving**: option A: 0 lines, 2 fewer preload links, one drift closed. Option B: −35 lines,
  −1 file, at the price of a cross-room import.
- **Risk & gate**: low. `npm run check`, then `/lab/craft` - the "what ships" specimen must
  still show a sheared roman and not a real italic, which is the one thing that can silently
  break here.
- **Confidence**: high on the facts. Low on which option is right; it is a taste call about
  whether lab rooms may import each other, and `chain-lines` already imports
  `profiles/_chain-kit`, so the precedent exists.

---

### lab-12 - The 29 lab↔shipped clones are design history; recorded so no future audit re-files them
- **Where**: `raw/jscpd.txt`, 232 clone pairs total. My parse: **89 lab↔lab, 29 lab↔shipped,
  114 shipped↔shipped.**
- **Phase**: dedupe (declined)
- **Tier**: n/a     **Class**: structural     **Decides**: n/a - this is a not-finding with
  numbers, filed here because the charter asked me to count them
- **Evidence**: the 29 lab↔shipped pairs, biggest first:

  | lines | lab file | shipped file |
  |---|---|---|
  | 63, 27, 17, 12, 11, 10, 10, 9, 8 | `lab/chain-lines/page.tsx` | `components/profile/houses-chain.tsx` |
  | 39, 11 | `lab/profiles/_variant-letterhead-2.tsx` | `components/profile/letterhead-profile.tsx` |
  | 24, 16, 11 | `lab/profiles/_chain-kit.tsx` | `components/profile/houses-chain.tsx` |
  | 20, 7 | `lab/profiles/_variant-letterhead.tsx` | `components/profile/letterhead-profile.tsx` |
  | 18, 12, 11 | `lab/eggs/page.tsx` | `components/layout/konami-eggs.tsx` |
  | 15 | `lab/birds-bg/page.tsx` | `components/common/bird-avatar-v2.tsx` |
  | 15, 9 | `lab/mascot-moments/page.tsx` | `components/mascot/moments/*` |
  | 12 | `lab/profiles/_variant-broadsheet.tsx` | `components/profile/letterhead-profile.tsx` |
  | 9, 8 | `lab/composer/_variants.tsx` | `create-post-form.tsx`, `search-pill.tsx` |
  | 9 | `lab/landings/_variant-editorial.tsx` | `components/landing/trust-section.tsx` |
  | 9 | `lab/support-ideas/_shared.tsx` | `components/support/bird-plate.tsx` |
  | 7 | `lab/_kit.tsx` | `components/common/motion.tsx` |
  | 6 | `lab/profiles/_variant-dossier.tsx` | `components/profile/admission-stamp.tsx` |

  The largest, 63 lines, is `chain-lines` against `houses-chain` - and the room's header says
  in so many words: *"This room draws the SAME shipped geometry (packing, serpentine, turns,
  all copied from `src/components/profile/houses-chain.tsx`) six different ways, so the pick is
  about the line and only the line."* Copying the geometry **is the experiment's control**.
  Sharing it would make the room's answer untrustworthy the moment the shipped file changed.
  The same argument holds for every other row: a lab specimen that imports the shipped
  component cannot be compared against a proposal, because both sides would move together.
- **What to do**: nothing. Recorded so audit 3 does not open this as a dedupe item.
- **Saving**: 0, deliberately.
- **Confidence**: high; this is audit 1's ruling, re-counted and unchanged.

---

## Owner decisions

**1. Where the lab ships, now with real numbers instead of an estimate.** Today every build -
yours and the public demo's - spends about **12 seconds of a 42-second build** compiling 48
rooms, and ships about **9.7 MB** of them, even though only you (as an admin) can open any of
it and on the demo literally nobody can. Members download **zero** bytes of lab JavaScript;
that has now been proved twice. The demo is the pure-waste case: `/lab` is blocked there for
every visitor, so those 12 seconds and 9.7 MB buy nothing at all. **Recommendation, unchanged
from audit 1 and now better supported: keep `/lab` on your own domain exactly as it is, and
exclude it from the demo build only.** You lose nothing anyone could ever see. One caution
before anyone touches this: five other things drive lab routes (two Playwright test suites
that test the Collection through `/lab/collection`, the bird-centring script, the app-icon
comparison scripts, and the route crawler), so this must never be extended to the main build
without rehoming those first. That is lab-10.

**2. Which rooms are finished, and what "freezing" them would actually mean.** Of the 48
rooms, **20 have had no design change since the day the whole tree moved from `/preview` to
`/lab` on 2026-07-30** - five weeks, in a codebase that lands several commits a day. They are:
transitions, feed-canvas, feedback, hoopoe, landing, loading, loading-ideas, spine, support,
logo, logos, location-picker, centroid, birds-bg, v2, grove (+ its login view), houses/demo,
and two of the four groups-rethink concepts. Another dozen were last touched in early August.
Only **twelve rooms are live work**: collection (17 commits since 1 August, last touched two
days ago), collection/swap, viewer, profiles, focus, crop, glass-edges, hoopoe-marks,
icon-colours, icon-directions, chain-lines, support-ideas.

I am **not** recommending you delete any of them, and the registry's own rule says a retired
room gets flipped to "archived" rather than removed, precisely so history stops vanishing. What
I will say plainly: two rooms are described **by the registry itself** as having no purpose
left. `groups-rethink` (1,571 lines, 5 routes): *"The Groups feature was removed from the app
entirely, so this whole tree is superseded."* And `logos` (121 lines): *"Valley + hills won and
is now PeaksMark, documented live at /lab/logo."* Those two are the only ones where the file
and the index agree there is nothing more to learn. There is also precedent both ways: you
deleted `/lab/guide` outright on 2026-08-28 (`025a262`), so the archive rule is not absolute.
**Recommendation: keep everything archived rather than deleted, which is the retirement path
you designed, and revisit only if you take the demo exclusion above, where a retained room
costs nothing anyway.** Whatever you decide should be your word, not an audit's.

**3. The lab's own stylesheet: 8.7 KB off every page, and now there is a point to the
measurement.** In August you asked, about measuring the lab's CSS share, "what are you gonna do
with the info", and you were right - there was no lever behind it. There is one now. The single
stylesheet every visitor downloads before your site paints anything is **238 KB** with the lab
in it and **164 KB** without. Compressed, that is **34 KB against 25 KB** - so roughly **9 KB
of every page load, on the landing page a stranger sees first, is styling that only exists so
your lab rooms can use it**. The fix is not deleting anything: Tailwind's current version can
be told "scan the lab separately", and the lab gets its own stylesheet that only you ever
download. It is a half-day of careful work with a visual-regression run as the safety net, and
nothing on screen changes. **Recommendation: do it.** (lab-02)

**4. `/lab/type`: nine typefaces downloaded into every build for a question you answered no
to.** The font room pulls nine font families from Google at build time - **63 extra font files,
2.75 MB** - and the room is archived, and its proposal (switch to variable fonts, get real
italics) never shipped. Nobody but you can load the room, and even you rarely do; the files are
pure build weight and a build-time dependency on Google's servers. **Recommendation: leave the
`_fonts.ts` file alone - its header is the best explanation of three `next/font` traps anywhere
in this repo and is worth more than the room - but let this room be first in the queue if you
ever do exclude archived rooms from the build.** (lab-04)

**5. The Support aviary and the landing showcase, both alive only because a lab room points at
them.** `src/components/support/wood.tsx` (the field of birds you parked in August) and two
landing files (`showcase-shot.tsx`, `shots.ts`) sit in the shipping folders but are imported by
nothing except lab rooms. Neither costs a member anything. They are only worth mentioning
because they make the "what is dead" tooling lie slightly: the landing pair does not show up as
dead code purely because the lab holds the door open. **Recommendation: no action until you
settle the landing showcase question that has been open since August; then the two landing
files move into the lab beside the room that uses them, and the aviary stays where it is
because its revival instructions depend on where it lives.** (lab-07)

## Not-findings

- **The 34,426 lines are not bloat.** They are 48 owner-approved design experiments indexed in
  `_registry.ts`, gated by `scripts/qa/lab-audit.mjs`, which `npm run check` runs as a blocking
  step (`check.mjs:145`: *"a stranded room is the exact bug /lab was built to kill"*). The
  comment-to-code ratio is 0.21, the lowest of any directory in the repo - the lab is *less*
  commented than the product, not more.
- **Two kits, not one, is deliberate.** `_kit.tsx` copies the `/lab/v2` tokens into a
  `.delight`-namespaced plain-CSS string; `_second-look-kit.tsx` uses the real app tokens from
  `globals.css`. The second kit's header says why: *"The whole point of this room is comparing
  a shipped surface against a proposal, so the shipped side has to be the genuine article down
  to the hex, not a lookalike."* Merging them would destroy the Second-look rooms' control.
  Fifteen rooms use `_kit`, nine use `_second-look-kit`, and eighteen use neither (they are
  full-page concepts that style themselves). `_shared.tsx` is a third thing entirely - the
  three-direction token set for the `/lab/grove` harness - and `landings/_shared.ts` and
  `support-ideas/_shared.tsx` are per-room fixture files that happen to share a name.
- **The `.delight` CSS living in a JavaScript template string is not an antipattern here.** It
  is why the eleven Delight rooms contribute almost nothing to the shared Tailwind stylesheet,
  which is the whole of lab-02's problem for the other rooms.
- **`LabRoomState` earns its table.** Four columns, one row per room whose archived flag
  differs from its registry default, read once per `/lab` load (`_archive-state.ts:43`) behind
  a `try/catch` that degrades to the registry defaults rather than crashing the index. It
  exists because the previous mechanism (`archive-overrides.json`, written with `fs.writeFile`)
  could never work on Vercel's read-only filesystem, and because the owner curates the lab **on
  the deployed domain**. That is exactly one Prisma query per `/lab` index load and zero
  anywhere else - I grepped `prisma.` across all 112 files and found four hits, all in
  `actions.ts` and `_archive-state.ts`.
- **`/lab`'s `export const dynamic = "force-dynamic"` is right**, and so are the two others
  (`centroid`, `birds-bg`): all three read something that must be fresh per request (the
  override rows, and `bird-adjust.json` off disk for the convergence loop).
- **The lab's `motion.*` usage is pinned on purpose.** `src/components/common/motion-features.tsx:21`
  keeps LazyMotion non-strict *because* lab rooms use `motion.*` directly; a rule test enforces
  that no shipped file does. Do not "fix" the lab to use `m.`.
- **`scripts/qa/lab-audit.mjs` (155 lines) is exactly the right size for what it does**: walk
  every `page.tsx` under `src/app`, drop `(main)`, `(auth)`, `/`, `/lab` itself and two named
  product routes, regex `href:` out of the registry as *text* (so it needs no build step or
  ts-node), and reconcile in both directions with bracketed segments turned into matchers. Its
  `PRODUCT_ROUTES` escape hatch has two entries and a comment saying to keep it short. 48
  `page.tsx` on disk, 47 registry hrefs, and the difference is `/lab` itself. Clean.
- **`_registry.ts`'s eight archived rooms are the owner's own archive choices**, folded in from
  the old `archive-overrides.json` as committed defaults so they hold before the table has a
  row. The `// owner archive choice` comments say so on five of them.
- **The lab has no `next/dynamic`, and for 45 of 48 rooms that is fine** - they are single
  specimens. The three exceptions are lab-03.
- **`public/lab/` is 1.9 MB and eleven of its fourteen files are load-bearing** for both
  `/lab/crop` and `/lab/collection`'s 240-record fixture. Only three are orphans (lab-08).

## Audit-1 carry-overs in this territory

- **Owner decision 6, "lab stays deployed; optionally exclude it from the demo build;
  authorise the CSS measurement"** - still **open**. The demo exclusion was never done
  (`next.config.ts` has no `pageExtensions`). The CSS measurement was declined at fix time
  ("what are you gonna do with the info") and has now been taken anyway as a by-product of the
  no-lab build: **8.7 KB gzip**, with a concrete lever behind it (lab-02).
- **Owner decision 1, "two archived rooms the registry calls superseded"** (groups-rethink,
  logos) - still **open**, both rooms still on disk, both still archived. Restated as Owner
  decision #2 above with the `/lab/guide` deletion as new precedent.
- **`lab-01` (where the lab ships)** - open; its estimate ("~10-15 s of the 45.6 s build") is
  now measured at ~12 s of 42 s, and its "~5 MB artifact" at ~9.7 MB. Direction confirmed,
  magnitude bigger.
- **`lab-02` (110 lines of dead kit exports)** - **done**, `09f5ebe`. `ROOMS`, `useToggles`,
  `T`, `PROSE`, `CODE`, `AmbientLayer`, `RouteLink` are all gone from both kits. The list has
  regrown to 48 (lab-05), which is a process problem, not a regression.
- **`lab-03` (four stale self-descriptions)** - **half done**. `actions.ts`'s publicPaths claim
  and `_registry.ts`'s `wood-mount.tsx` pointer are both corrected. `spine-marker/page.tsx:6-7`
  and `_registry.ts:233`'s "76 findings" are not, and the first is now worse (lab-09).
- **"The lab leaks 0 bytes of JS into non-lab routes"** - re-proved against a fresh
  build-vs-build diff of all 52 shared routes. Binding, unchanged.
- **"The lab-vs-shipped jscpd clones are design history by design"** - re-counted: 29 pairs,
  largest 63 lines, all defensible (lab-12). Binding, unchanged.
- **The landing showcase family's fate** (audit-1 §4, five knip-dead files) - still open, and
  the lab is now entangled in it (lab-07).
- **`src/components/support/wood.tsx` lab-only** - unchanged and still documented as such in
  its own header and in `_registry.ts:226`.

## For other lenses

- **`package.json:64` `"world-atlas": "^2.0.2"` can be deleted** once `lab/directory/_maps.tsx`
  fetches the atlas the way `components/directory/alumni-map.tsx` already does. One production
  dependency, 7.9 MB of `node_modules`. The full case is **lab-13** and the payoff is yours.
  Note that knip does **not** currently list it, because the lab import is real - so this will
  not show up on any tool's dead-dependency list. (dependency lens)
- **`src/lib/hoopoe-geometry.ts`** exports `H` (`:32`) and `PEEK_CREST` (`:331`), both on
  knip's unused list. `H` is re-exported by `lab/hoopoe-marks/_parts.tsx:25` for nobody;
  `PEEK_CREST` I did not chase. The file is pinned by `scripts/qa/protocol-audit.mjs:117` and
  `src/lib/mark-centring.test.mjs` - do not delete it, it is the app icon's geometry. (lib lens)
- **`src/components/landing/showcase-shot.tsx` + `shots.ts`** are alive only because
  `src/app/lab/landings/` imports them; knip therefore does not list them with the other five
  showcase files. Whoever owns the showcase decision needs to know this. (landing lens)
- **`src/components/collection/photo-river.tsx`** has three knip-unused exports
  (`preloadViewer:27`, `bandsOf:202`, `READING_LINE:258`) and `river-controls.tsx` two
  (`RIVER_ORDERS:63`, `orderLabel:70`). I only noticed them because `/lab/collection` imports
  both files; they are the collection lens's. (collection lens)
- **`scripts/qa/_dir-chrome-probe.mjs`** and **`scripts/qa/_dir-room-shots.mjs`** describe
  themselves as throwaway probes for `/lab/directory`, a room last touched 2026-08-03. If the
  scripts lens is hunting leftover probes, those two are candidates - the underscore prefix
  suggests they were meant to be temporary. (scripts lens)
- **`scripts/qa/phase6-probe.mjs:84-98`** and **`scripts/qa/audit-status.mjs:483-490`** both
  probe the same M19 fact (`/lab` is not public). One reads `proxy.ts` as text, the other makes
  three HTTP requests. Possibly one probe too many; audit 1's open decision about "retiring two
  security probes" may already cover it. (scripts/security lens)
- **`src/app/(main)/support/page.tsx`** was reported by audit 1 as naming the deleted
  `wood-mount.tsx` in a comment. I did not re-check it; it is outside my territory. (member
  surfaces lens)
- **The 233 KB stylesheet's "none" bucket** - 508 rules / 66 KB that the token attribution
  cannot place (base, `@theme`, `@utility`, non-class selectors). Some of it is lab-driven
  scaffolding, which is why my 49.8 KB attribution undershoots the 74.4 KB build delta. The
  bundle lens may want to split that bucket. (bundle lens)
- **`raw/build-nolab-run2.txt`** shows 38 CSS optimiser warnings ("Unexpected token
  Delim('\u{14}')") on one of the three no-lab builds and on neither other run, which looks
  like a Turbopack CSS-cache corruption rather than a source problem. Worth a glance if anyone
  sees it again on a real build. (bundle lens)

## Metrics

- **Territory**: 112 tracked TS/TSX files (34,426 code + 7,143 comment + 2,682 blank =
  44,251 total lines), 14 tracked webp (1.9 MB), 1 gate script (155 lines), 1 spec (156
  lines), 1 Prisma model (5 lines). 48 routes; 47 registry hrefs; 40 top-level rooms + 7
  children; 8 archived, 32 active.
- **Lines read**: ~3,300 read fully or in large part, plus 48 file headers (~1,600 lines) =
  **~4,900 lines**. Not read line-by-line: ~26,000 lines of variant/specimen JSX (listed in
  Coverage).
- **Biggest files**: `profiles/_variant-letterhead-3.tsx` 1,333 · `tiles/_specimens.tsx` 1,161 ·
  `composer/_variants.tsx` 987 · `feedback/page.tsx` 960 · `directory/_chrome.tsx` 907 ·
  `directory/_maps.tsx` 903 · `feed-canvas/page.tsx` 897 · `profiles/_variant-passport.tsx` 867 ·
  `landings/_variant-noticeboard.tsx` 852 · `profiles/_variant-letterhead-2.tsx` 833.
- **Biggest room families**: profiles 10,481 · directory 3,951 · landings 3,904 · tiles 1,813 ·
  groups-rethink 1,571 (5 routes) · type 1,516 · support-ideas 1,304 · composer 1,153.
- **Comment ratio**: lab **0.21** - the lowest per-directory ratio in the repo (lib 0.67,
  collection 0.78, api 0.62, common 0.43).
- **Hygiene counters**: TODO/FIXME **0** · `console.log` **0** · commented-out code **0** ·
  `eslint-disable` **9 sites across 9 files** · `any`/`as unknown as`/`@ts-expect-error`
  **4 sites** · `"use client"` **83 of 112 files** (285 repo-wide) · `next/dynamic` **0**.
- **Cross-boundary**: shipped files importing lab: **0**. Lab files importing shipped: **215
  `@/…` specifiers over 49 distinct modules**, top five `@/lib/utils` 31,
  `@/components/common/motion` 26, `@/components/layout/peaks-mark` 24,
  `@/components/common/bird-avatar` 20, `@/components/common/verified-mark` 9.
- **Clones**: 232 pairs repo-wide; **89 lab↔lab, 29 lab↔shipped, 114 shipped↔shipped**.
- **Freshness**: 20 routes untouched since the 2026-07-30 `/preview`→`/lab` migration;
  12 rooms with a commit in the last three weeks; `/lab/collection` alone has 17 commits since
  1 August.
- **The five numbers that matter**: **1 production dependency** (`world-atlas`, 7.9 MB, one
  importer and it is a lab room) · **8.7 KB gzip** of CSS on every member page ·
  **~12 s of a 42 s build** · **~9.7 MB of deployed artifact** · **2.75 MB of Google fonts for
  two archived rooms**.
- **Ranked by what a later session can just do, no owner needed**: lab-13 (a dependency),
  lab-03 (three harnesses), lab-05 + lab-06 (~53 lines dead), lab-08 (the crop fixture move),
  lab-09 + lab-11 (hygiene). Everything else waits on the owner.
