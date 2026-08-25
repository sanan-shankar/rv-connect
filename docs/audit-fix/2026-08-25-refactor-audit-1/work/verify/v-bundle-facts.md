# v-bundle-facts - verification notes

Verifier: v-bundle-facts. Date: 2026-08-25. HEAD at verification: c74d99f.
Charter: the measured bundle claims (bundle-build-01..04, 07, 08, 10; dependency-diet-12;
lib-core-config-03; landing-mascot-avatars-03, 08). Read-only; no build run.

## Build output status

`.next` IS still present and IS the build the find phase measured: `BUILD_ID` and every
chunk dated 2026-08-25 14:31, and every chunk name cited in the findings exists on disk
(`24740q0lmcv1n.js`, `3u7hqaj6wqdv7.js`, `0-4eyy7fi4hzu.js`, `1xz03zknym-s7.js`,
`3szri51gnxmii.js`, `0wyb_-tl2kieo.js`, `1lr26daeze4p_.css`). Analyzer data at
`.next/diagnostics/analyze/data/<route>/analyze.data` also present (14:39). A `next dev`
(`.next/dev`, 14:48) coexists but did not clobber the build chunks. All chunk-level
evidence below is measured directly, not taken from raw/. `git status` on every source
file I cite: no uncommitted edits (nobody's WIP touched).

## Measured chunk facts (bytes on disk, gzip = `gzip -c | wc -c`)

| chunk | raw | gz | routes in firstLoadChunkPaths (route-bundle-stats.json, 92 routes) |
|---|---|---|---|
| 24740q0lmcv1n.js (posthog) | 250,529 (244.7 KiB) | 81,200 (79.3 KiB) | **92 / 92** |
| 3u7hqaj6wqdv7.js (motion) | 135,084 (131.9 KiB) | 44,966 (**43.9 KiB**) | **92 / 92** |
| 0-4eyy7fi4hzu.js (hoopoe) | 36,975 (36.1 KiB) | 11,367 | **92 / 92** |
| 1xz03zknym-s7.js (birds) | 47,476 (46.4 KiB) | 13,840 (13.5 KiB) | **60** |
| 3szri51gnxmii.js (demo-bar et al) | 21,930 | - | **37** (finding said 36), all non-lab, incl. /feed |
| 0wyb_-tl2kieo.js (map) | 175,750 | - | exactly `/directory` + `/lab/directory` |
| 1lr26daeze4p_.css | 239,668 | 34,273 | the one global stylesheet |

Chunk content proofs:
- `grep -c "PostHog" 24740q0lmcv1n.js` = 1 (it is the posthog chunk).
- hoopoe path literal `M0 -3.4 Q3 0 0 3.4`: `grep -l` across all chunks hits ONLY
  `0-4eyy7fi4hzu.js` - exactly as bundle-build-04 claimed.
- motion chunk contains `projection`, `layoutId`, `drag`, `PanSession` strings
  (`createProjectionNode`/`VisualElementDragControls` names are minified away, but
  `PanSession` survives and the analyzer composition stands) - full-featured runtime
  confirmed in the shared chunk.
- `grep -c "You are in a demo" 3szri51gnxmii.js` = 1, and that chunk is in /feed's
  firstLoadChunkPaths - DemoBar's string is in a member route's first load, directly.
- `.next/diagnostics/analyze/data/feed/analyze.data` contains the strings
  `tour-panel.tsx` (1x), `demo-bar.tsx` (2x), `verify-email-banner.tsx` (2x).

## The domMax question (decides dependency-diet-12 vs bundle-build-02)

Counted at HEAD, non-lab src only:

- **`layout` JSX prop on motion components: 8 usages in 5 files** -
  `signup-client.tsx:351` (`layout="position"`), `login-client.tsx:553,613`,
  `auth/signup-form.tsx:510,554,661`, `trivia-gate.tsx:155` (`layout="position"`),
  `contacts-editor.tsx:211` (`layout="position"`). (Excluded: `letterhead-profile.tsx:1876
  layout="cards"` and `profile-author-feed.tsx:24 layout="sheet"` - custom props on
  ProfileAuthorFeed, verified not motion; `create-post-form.tsx:1139` is a comment.)
- **`layoutId`: 10 actual props in 9 files** - `auth/signup-form.tsx:489`,
  `layout/sidebar.tsx:225,233` (the active-marker pill+bar, **on every authed page's first
  paint**), `directory-client.tsx:463,490`, `common/segmented-pills.tsx:131` (shared
  component), `letterhead-profile.tsx:1859`, `catchups/home/reminder-pref-control.tsx:88`,
  `catchups/home/keeper-settings-dialog.tsx:134`, `catchups/create/cadence-control.tsx:58`.
- **drag props: 2 components** - `common/image-viewer.tsx:287-289`,
  `settings/avatar-crop-dialog.tsx:309-316`.
- **AnimatePresence: 26 non-lab files** (34 incl. lab) - irrelevant to the split;
  exit animations are in domAnimation.
- `grep -rn "LazyMotion|domAnimation|domMax|motion/mini" src` = **0** (diet-12's claim
  confirmed).
- Importer split: `from "motion/react"` in **57 non-lab + 29 lab = 86 files**
  (diet-12 said 60/26 - total right, split off by 3).

**Verdict: LazyMotion needs domMax.** layout/layoutId/drag are genuinely used in shipped
surfaces, and the sidebar layoutId marker is on every authed page at first paint. So:
- bundle-build-02's premise ("domMax, not domAnimation, because drag and layout are
  genuinely used") is CONFIRMED, and its 90-100 KB-raw first-load saving is coherent only
  because it loads domMax **async** (`loadDomMax = () => import(...)`) - the bytes defer,
  they do not disappear. One numeric correction: the motion chunk gzips to **~44 KB**
  (44,966 measured), not the "64 KB gz" in its title/evidence.
- dependency-diet-12's conditional saving lands in its **lower band (~8-12 KB gz)** for a
  sync-domMax adoption; the "if domAnimation suffices" branch is dead. Its bundlephobia
  figure (42.5 KB gz) matches the measured 43.9 KB chunk almost exactly.

## Per-finding verification

### bundle-build-01 - CONFIRMED
Chunk 250,529 raw / 81,200 gz, on all 92 routes, is posthog. Source at HEAD:
`posthog-provider.tsx:3-4` static `import posthog from "posthog-js"` + `posthog-js/react`;
mounted `src/app/layout.tsx:92` (import line 7). All load-bearing facts hold.

### bundle-build-02 - CONFIRMED with one correction
Chunk on all 92 routes, 132 KB raw confirmed; full feature set (projection/drag strings)
in the shared chunk confirmed; `common/motion.tsx:13` imports `motion` from "motion/react";
57 non-lab importer files (finding said "55 more" + motion.tsx + template.tsx = 57 ✓).
domMax requirement confirmed (counts above). **Correction: gz is ~44 KB, not 64 KB**; the
raw saving figure assumes async feature loading and should be read as critical-path
deferral, which the finding itself states.

### bundle-build-03 - CONFIRMED
`alumni-map.tsx:7-11`: d3-geo/d3-selection/d3-zoom/topojson-client imports lines 7-10,
`import worldData from "world-atlas/countries-110m.json"` line 11; statically imported by
`directory-client.tsx:28`. Chunk 175,750 bytes in exactly /directory + /lab/directory.
/directory firstLoad = 1,681,227 bytes = 1,642 KiB, matching "heaviest page". The JSON is
107,761 bytes in node_modules, matching the fix plan's number.

### bundle-build-04 - CONFIRMED
`not-found.tsx` statically imports Hoopoe + kit (imports at lines 6-9 at HEAD; finding
cited 9-12 - trivial drift). Path literal greps in exactly `0-4eyy7fi4hzu.js`; that chunk
is in all 92 firstLoads at 36,975 bytes. `mascot-flight-layer.tsx:49` is the one
`next/dynamic`; `hoopoe-warmup.tsx:42` static import + `:56 void import("./hoopoe")` with
the quoted comment, verbatim. 23 files import from the hoopoe module (matches the "21
other static importers" arithmetic: 23 minus not-found minus the flight layer's type-only
import).

### bundle-build-07 - CONFIRMED
`tour-provider.tsx:27-29` statically imports TourOffer/TourPanel/TourSpotlight;
`(main)/layout.tsx:11,16` imports VerifyEmailBanner/DemoBar; `:103`
`autoOffer={IS_DEMO}`, `:153` `{IS_DEMO && <DemoBar/>}`, `:138` VerifyEmailBanner behind
mailState. /feed analyzer data contains all three component filenames. Render gates
confirmed in tour-provider (`:239-242`: spotlight always mounted with `active` prop,
offer at phase "offering", panel gated).

### bundle-build-08 - CONFIRMED
CSS 239,668 raw / 34,273 gz - exact match. Spot-checked 3 of the 4 named classes:
`-mb-[58px]`, `h-[132px]`, `border-t-[3px]` each appear exactly once (escaped, `\[`) in
`1lr26daeze4p_.css`, and each exists in exactly 1 lab source file and 0 non-lab files.
(Grep tip for the fixer: the built CSS escapes brackets - `grep -F 'h-\[132px\]'`.)
Magnitude range (15-60 KB) remains unmeasured, as the finding itself says.

### bundle-build-10 - CONFIRMED
Chunk 47,476 raw / 13,840 gz on 60 of 92 routes; `bird-avatar-v2.tsx` is 1,840 lines.
All numbers match.

### dependency-diet-12 - CONFIRMED with corrections
Zero LazyMotion/domAnimation/domMax/motion-mini in src ✓; `next.config.ts:199` lists
"motion" in optimizePackageImports ✓; 86 importer files ✓ but the split is **57 shipped /
29 lab**, not 60/26. **domMax IS needed** (counts above), so the applicable saving is the
finding's own lower band, ~8-12 KB gz, unless the fixer takes bundle-build-02's
async-feature route.

### lib-core-config-03 - CONFIRMED with correction
Static import + `IS_DEMO` render gate at `(main)/layout.tsx:16,153` ✓; demo-bar.tsx is
163 lines "use client" ✓; "You are in a demo" is in `3szri51gnxmii.js` (21,930 bytes ✓)
which is in /feed's first load ✓. **Correction: the chunk is in 37 routes'
firstLoadChunkPaths, not 36** (all non-lab).

### landing-mascot-avatars-03 - CONFIRMED with one correction
`autoOffer = false` default (`tour-provider.tsx:102`), passed `IS_DEMO` at layout:103 ✓;
TakeTourAgainButton used only from `src/app/(main)/admin/page.tsx` ✓;
`manual-tour-entry.test.mjs` exists and pins it ✓; tour dir = 9 files, 1,023 lines
exactly ✓; tour-local.ts 55, tour-auto-offer.ts 19 ✓. **Correction: only TourOffer
(`:17`) and TourPanel (`:19`) statically import the Hoopoe rig; TourSpotlight does not** -
"each of which" overstates by one, harmless to the fix.

### landing-mascot-avatars-08 - CONFIRMED
`sidebar-hoopoe.tsx:37` and `moments/logo-easter-egg-hoopoe.tsx:37` static Hoopoe
imports ✓; mounted via `sidebar.tsx:44` (import) / `:642` (SidebarHoopoe) and `:45`/`:617`
(LogoEasterEgg) ✓; hoopoe.tsx = 1,522 lines ✓; the only dynamic `import("./hoopoe")`
callers are flight-layer (:49) and warmup (:56) ✓; 23 importer files ✓.

## Notes for the report writer
- Every chunk fact was re-measured against the still-present 14:31 build, and every source
  fact re-read at HEAD c74d99f; nothing in this cluster was invalidated by the tree moving.
- The one cross-finding decision is settled: **domMax is required**; fixers should treat
  bundle-build-02 (async domMax) as the operative plan and diet-12's lower band as the
  sync alternative.
- Corrections are all small: motion gz ~44 KB not 64; demo-bar chunk 37 routes not 36;
  motion importers 57/29 not 60/26; TourSpotlight has no Hoopoe import; not-found imports
  at lines 6-9.
