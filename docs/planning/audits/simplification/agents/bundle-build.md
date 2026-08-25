# bundle-build - simplification audit report

Cross-cutting lens for client bundle weight and build time. I did not judge per-file code
quality (territory agents) or whether a dependency should exist (dependency-diet); I measured
what every byte costs on the wire and what every second of the build is spent on, using the
orchestrator's build artefacts (`raw/route-js.txt`, `raw/route-bundle-stats.json`,
`raw/build.txt`) and the Turbopack analyzer output in `.next/diagnostics/analyze/` (which I
decoded: each `analyze.data` is a u32-length-prefixed JSON with `sources`, `chunk_parts`
(source_index, output_file_index, size, compressed_size) and `output_files`, so exact
module-level composition of every chunk of every route is available and everything below is
measured, not inferred). Date: 2026-08-25. Files in territory: layouts, layout components,
mascot, next.config.ts, globals.css, package.json, tsconfig.json, the 40 largest client
files, plus the build artefacts. Read fully: the layouts, config, provider, motion kit,
app-shell, and heads/probes of the 40 largest client files; every number cross-checked
against at least two sources (analyzer data + signature greps of the real `.next/static/chunks`).

## Coverage

- Read fully: `src/app/layout.tsx`, `src/app/(main)/layout.tsx`, `src/app/(main)/template.tsx`,
  `src/components/layout/app-shell.tsx`, `src/components/common/motion.tsx`,
  `src/components/analytics/posthog-provider.tsx`, `next.config.ts` (HEAD), `tsconfig.json`,
  `package.json`, `.github/workflows/check.yml` (head), heads of `sidebar.tsx`,
  `mascot-flight-layer.tsx`, `hoopoe-warmup.tsx`, `not-found.tsx`, `alumni-map.tsx`,
  `directory-client.tsx`, `post-card.tsx` (image block), `collection-client.tsx` (image block),
  `tour-provider.tsx` (imports), `konami-eggs.tsx` (imports), spec: DESIGN-SYSTEM.md sec. 7,
  mascot.md (grep-skim), `globals.css` (head + counts).
- Skimmed (why): the 40 largest "use client" files were probed with a hook/handler-density
  scan (counts below) rather than read line-by-line; the question for this lens is only
  whether the client boundary is needed and what the file weighs, and the probe answers both.
  Territory agents own their internals.
- Not read: lab room files (out of scope for weight once leakage was proven zero); the
  catchups/letters/admin component trees beyond their measured KB.
- Uncommitted edits seen: none in my territory at read time. The orchestrator's notes said
  `next.config.ts`, `src/lib/admin.ts`, `scripts/qa/phase7-probe.mjs`,
  `src/components/tour/manual-tour-entry.test.mjs`, `src/app/(main)/forbidden.tsx` were WIP;
  by the time I ran `git status --short` those had been committed (c74d99f "feat(admin): a
  non-admin who asks for /admin is told 'nice try'") and the tree showed only the audit's own
  untracked files. I judged HEAD's `next.config.ts` per instructions; it is identical to the
  working tree now.

## Summary

The headline surprise: **the "use client" hygiene is good and the lab does not leak one byte
into shipped JavaScript** - I verified all 73 non-lab routes have exactly 0 lab-source bytes
in their client chunks. The weight problem is not misplaced boundaries; it is four deliberate
always-on choices whose loading strategy (not their existence) is costing every page:
posthog-js statically initialised at module scope (245 KB raw / 79 KB gz on all 92 pages),
full-featured framer-motion via `motion.div` (132 KB on all 92 pages, including drag and
layout-projection code on pages that use neither), the hoopoe puppet riding the root
`not-found.tsx` into every page's shared chunk set (which silently defeats the app's single
`next/dynamic`), and the directory shipping a 105 KB world atlas as JavaScript in first load.
Build time (45.6 s) splits into TypeScript 19.4 s (the single biggest lever, and CI already
duplicates the check), compile 16.9 s, Sentry's `runAfterProductionCompile` 3.0 s. Lab's
build cost is real but bounded: 43 of 92 routes, ~35% of TS lines, plus a measurable
contribution to the one 240 KB global CSS file (proven: lab-only arbitrary classes are in it).
Structural-vs-cheap: nearly everything here is structural; the top three findings alone take
/feed's first load from 1,530 KB raw to roughly 1,150 KB without touching a feature.

Numbers used throughout: first-load figures are raw (uncompressed) from the build manifest
(`raw/route-js.txt`); measured gzip ratio is ~0.40 (from `chunk_parts.compressed_size`:
/feed 1,639 KB raw -> 655 KB gz; /privacy 1,112 -> 421). The 110 KB `polyfill-nomodule`
chunk appears in analyzer totals but is loaded via `nomodule` only - modern browsers never
download it; it is excluded from the first-load numbers and nobody should chase it.

**What the ~930 KB every member page pays for actually is** (route JS beyond the 430 KB root
set, /feed = 1,100 KB route JS as the worked example, all analyzer-measured):

| shared chunk (real build) | KB raw | on N pages | contents (module-level) | pulled in by | lever | est. KB saved (first-load) |
|---|---|---|---|---|---|---|
| root set (6 files) | 430 | 93 | react-dom-client 196K, Next app-router + segment-cache/router 126K, misc runtime | framework | keep | 0 |
| `24740q0lmcv1n.js` | 245 | 92 | `posthog-js/dist/module.js` 244.7K - one module | `PostHogProvider` (root layout), static import + module-scope `init()` | defer: lazy `import()` at idle/hydration | 245 on every page |
| `3u7hqaj6wqdv7.js` | 132 | 92 | motion-dom 99.5K (24K `create-projection-node` = layout animations, JSAnimation, springs) + framer-motion 47.7K (7.8K drag controls, 3.8K PanSession) | `common/motion.tsx` + 57 non-lab files importing `motion/react`; reaches even /privacy via `not-found.tsx` -> `Hoopoe` | `LazyMotion` + `m`, features async | ~90-100 on every page |
| `0-4eyy7fi4hzu.js` | 36 | 92 | `hoopoe.tsx` 26.3K + `hoopoe-kit` 3.3K + moment glue | `src/app/not-found.tsx` static import (root boundary is in every page's graph); on (main) also `sidebar-hoopoe` | dynamic in not-found; keep static where the bird is visible at paint | 36 on public static pages only |
| `41dfoajox-uk3.js` | 36 | 92 | sonner 33.4K + `ui/sonner` + `motion.tsx` module 1.2K | `Toaster` in root layout | keep - toasts fire everywhere | 0 |
| `1g5xa6eu3m5ss.js` | 30 | 92 | tailwind-merge 25.5K + clsx + `lib/utils` (`cn()`) | every component | keep | 0 |
| `3pmq9o7grdiw5.js`, `3y6cn2czum8jf.js` | 23+23 | 92 | Next client internals, next-themes | framework/providers | keep | 0 |
| `07jo8ilzo4wyb.js` | 17 | 92 | @vercel/analytics 3.7K, posthog-js/react, providers | root layout | keep | 0 |
| `0qlybwl87trsi.js` | 15 | 92 | @floating-ui/utils + @base-ui shared bits | ui primitives | keep | 0 |
| `3z1a3zakqu4-5.js` | 8 | 92 | `mascot-flight-layer.tsx` 4.1K + misc | root layout, by design (mascot.md: flight survives navigation) | keep | 0 |
| `1xz03zknym-s7.js` | 46 | 60 | `bird-avatar-v2.tsx` 43.4K (the 50 glyphs) + `bird-adjust.json` 2.1K + `lib/avatar` | every avatar render on (main) | owner option: SVG sprite / server render | ~40 (owner call) |
| `0heki7lot9uax.js` | 59 | 41 | @base-ui floating-ui-react: FloatingFocusManager 9.6K, useDismiss 7.8K, tabbable 5.4K, reselect 4.9K, scroll-lock | menus/selects/dialogs in page chrome | keep (needed at paint for chrome) | 0 |
| `0c24ma7j9wedd.js` | 45 | 38 | @base-ui menu components + @formkit/auto-animate 7.8K + `ui/dropdown-menu` | sidebar account menu, card menus | keep | 0 |
| `02wmkgtptyp-e.js` | 29 | 37 | `sidebar.tsx` 10.0K + nav + peaks-mark | (main) shell | keep | 0 |
| `3_nxof6uc7mp6.js` | 27 | 37 | `notification-bell` 7.4K, tour glue, search-pill | (main) shell | tour part deferrable (see 10) | ~12 |
| `3szri51gnxmii.js` | 21 | 37 | shell misc: `tour-panel` 4.0K, `demo-bar` 3.5K, `verify-email-banner` 3.1K | (main) layout static imports | conditional dynamic | ~10 |

(The remaining ~100-500 KB per route is genuinely route-specific: /feed adds the composer
21.2K + post-card/comments/viewer + @base-ui select/menu + phosphor 23.4K; /directory adds
the 175 KB map chunk; /profile adds letterhead-profile 25.2K; per-route package totals are
in the Metrics section.)

## Findings

### bundle-build-01 - Defer posthog-js off the critical path (245 KB raw / 79 KB gz on every page)
- **Where**: `src/components/analytics/posthog-provider.tsx:3-4,47-130` (static import +
  module-scope init), mounted at `src/app/layout.tsx:92`; consumer that constrains the fix:
  `src/components/analytics/posthog-identify.tsx`
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (the defer variant; the
  "lite" variant is owner - see Owner decisions)
- **Evidence**: chunk `24740q0lmcv1n.js` is 245 KB raw (analyzer: a single module,
  `posthog-js/dist/module.js`, 244.7 KB; gzip 79 KB) and sits in the
  `firstLoadChunkPaths` of all 92 pages (`raw/route-js.txt` line 122). It is the single
  largest first-load item after react-dom - bigger than the entire Next router. It loads,
  parses and initialises before hydration completes on /privacy just as on /feed. The
  provider's own comment block records why init is at module scope (bug audit M42: child
  effects run before parent effects, so `PostHogIdentify` used to find `__loaded` false and
  never identify). posthog-js already lazy-loads its optional feature bundles at runtime
  from `/ingest/static/...` (the versioned-path rewrite in next.config.ts exists for
  exactly that), so the library itself is designed to be split - only our static import
  forces the 245 KB core into first load.
- **What to do**: replace the static `import posthog from "posthog-js"` with a small
  module-level loader that (a) exposes `let posthogPromise: Promise<PostHog> | null`, (b) on
  first call from a client effect does `import("posthog-js")`, runs the exact same
  `init(...)` options object, and resolves; schedule it post-hydration
  (`requestIdleCallback` with a ~2 s timeout, falling back to `setTimeout`). Rewrite
  `PostHogIdentify` to `posthogPromise?.then(ph => ph.identify(...))` instead of touching the
  global - this PRESERVES the M42 guarantee by construction (identify chains on init, never
  races it) rather than by effect-ordering. `posthog-js/react`'s `<Provider>` can stay
  (13 KB chunk) or be dropped for the same promise. Keep every init option verbatim,
  including `capture_pageview: "history_change"` - the initial pageview is captured at init
  time whether init happens at 0 ms or 1,500 ms. Autocapture, DNT, masking: unchanged.
- **Saving**: 245 KB raw / 79 KB gz off the first load of all 92 pages (the bytes still
  download, but async after interactive, and no longer block hydration; on the landing page
  funnel the parse cost moves entirely off the critical path)
- **Risk & gate**: medium. The one behavioural edge: a click within the first ~1-2 s is not
  autocaptured (today it is). Gates: `npm run check` (`security-regressions.test.mjs` pins
  the /ingest CSP wiring - unchanged), then a manual PostHog live-events check from a dev
  server with `NEXT_PUBLIC_POSTHOG_DEV=1` (the escape hatch the provider comment documents),
  verifying $pageview + identify still arrive on a hard load of a signed-in route (the exact
  M42 scenario).
- **Confidence**: high that the bytes move; medium on zero analytics regression - the thing
  that would change my mind is the owner valuing first-2-seconds click capture on the
  landing page above load speed, in which case load posthog eagerly on `/` only.
- **Notes**: I considered and rejected recommending `posthog-js-lite` (~10 KB): it has no
  autocapture, and autocapture is the owner's stated purpose ("ask a question in three
  months that nobody thought to instrument today"). Deferring keeps every capability.
  Vercel Analytics (3.7 KB) already covers the pageview-before-idle window as a backstop.
  This finding is the largest single number in this report.

### bundle-build-02 - Adopt LazyMotion + `m`: full framer-motion runtime ships on all 92 pages (132 KB raw / 64 KB gz)
- **Where**: `src/components/common/motion.tsx:13` (`import { motion } from "motion/react"`),
  `src/app/(main)/template.tsx:19`, plus 55 more non-lab files (list via
  `grep -rl 'from "motion/react"' src | grep -v app/lab`; 29 lab files may stay as they are)
- **Phase**: library
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: chunk `3u7hqaj6wqdv7.js` (132 KB raw, 64 KB gz) is on all 92 pages'
  first load. Analyzer composition: motion-dom 99.5 KB - including 24.0 KB
  `projection/node/create-projection-node.mjs` (layout animations) - and framer-motion
  47.7 KB - including 7.8 KB `VisualElementDragControls` and 3.8 KB `PanSession` (drag).
  Plain `motion.div` bundles every feature; the app's actual per-page needs are tap/hover/
  variants nearly everywhere, `layout`/`layoutId` on a handful of controls (sidebar marker,
  segmented pills), drag in the image viewer and avatar crop. Even /privacy and /terms carry
  the full 132 KB (via `not-found.tsx` -> `Hoopoe` -> `motion/react`, see 04). The design
  system (DESIGN-SYSTEM.md sec. 7) mandates the motion LANGUAGE (SpringPress everywhere,
  always-on); it says nothing about the loading strategy, and LazyMotion changes zero
  rendered frames once features arrive.
- **What to do**: introduce `<LazyMotion features={loadDomMax} strict>` (where `loadDomMax
  = () => import("motion/react").then(m => m.domMax)`) once, high in the tree (root layout
  client wrapper or inside `common/motion.tsx`'s exports), and mechanically replace
  `motion.` with `m.` across the 57 non-lab files (`import { m } from "motion/react"`).
  `strict` makes any missed `motion.` call throw in dev, so the migration self-verifies.
  `domMax` (not `domAnimation`) because drag and layout are genuinely used. SPRINGS/EASE
  exports unchanged; `AnimatePresence` unchanged. Lab files can migrate later or never
  (their full-motion chunk would then load only on lab routes).
- **Saving**: ~90-100 KB raw / ~45 KB gz off first load of all 92 pages (LazyMotion core +
  `m` is roughly 15-30 KB of the current 132; the feature bundle still downloads but async).
  Honest caveat: total transferred bytes are roughly unchanged; this is critical-path
  weight, TTI and main-thread parse, not disk.
- **Risk & gate**: medium - it is a 57-file mechanical rename with one new provider. The
  behavioural edge: an interaction in the first few hundred ms before the feature bundle
  lands animates late (elements still render; `initial` styles apply). Gates:
  `npm run check`, then `npm run visual` (10 routes x 2 viewports - animations are masked
  in volatile regions, layout must not shift), then a manual pass on the sidebar marker
  glide and the image-viewer drag (the two feature-dependent behaviours).
- **Confidence**: high on the mechanism, medium on the exact KB (the split point between
  LazyMotion core and domMax is motion-version-dependent; measure with one route converted
  before doing all 57). What would change my mind: if the owner perceives the first-paint
  FadeRise on /feed arriving late, keep `domAnimation` loaded sync (~smaller win, ~50-60 KB)
  and only `domMax` async.
- **Notes**: `optimizePackageImports: ["motion"]` in next.config.ts does not and cannot help
  here - it optimises barrel resolution, not the runtime feature set of `motion.div`. Related:
  04 (the import chain that puts this chunk on public static pages).

### bundle-build-03 - /directory ships a 105 KB world atlas as JavaScript, plus the d3 stack, in first load (185 KB raw)
- **Where**: `src/components/directory/alumni-map.tsx:7-11` (`import worldData from
  "world-atlas/countries-110m.json"` + d3-geo/d3-selection/d3-zoom/topojson-client),
  statically imported by `src/components/directory/directory-client.tsx:28`, which is the
  page's client root
- **Phase**: relocate (asset out of the JS graph) + architecture (defer)
- **Tier**: T2 (atlas-as-fetch) / T3 (dynamic map)     **Class**: structural     **Decides**: autonomous
- **Evidence**: chunk `0wyb_-tl2kieo.js` (175 KB raw) is in the first load of exactly
  `/directory` and `/lab/directory` (route-bundle-stats.json). Analyzer for /directory:
  world-atlas 105.3 KB (the JSON compiled into a JS module), d3-geo 18.9, d3-selection 11.9,
  d3-transition 10.1, d3-zoom 9.0, d3-color 7.1, plus dispatch/timer/interpolate glue and
  `alumni-map.tsx` 9.8 KB - ~190 KB of map on the route's 1,642 KB first load, the heaviest
  page in the app. Wrinkle that shapes the fix: `directory-client.tsx:114-115` - "the
  zero-typing browse opens on the Map", i.e. the map IS the default view, so a naive
  `next/dynamic` `ssr:false` shows a shimmer where the site's showpiece should be.
- **What to do**: two independent steps. (1) T2, no visible cost: stop importing the JSON.
  Copy `countries-110m.json` (107,761 bytes in node_modules) to `public/geo/` and fetch it
  in the map's mount effect (`useEffect` + `fetch("/geo/countries-110m.json")`), drawing
  pins immediately and land shapes when it arrives (~one frame later on broadband; it is
  static, immutable, and cacheable with a far-future header, which the JS chunk version
  re-downloads on every deploy hash change). Saves 105 KB of parsed JS outright. (2) T3,
  owner-visible: `next/dynamic` the `AlumniMap` itself with a map-shaped warm shimmer as
  the loading state (CLAUDE.md: warm shimmer, not grey pulse), deferring the ~57 KB d3
  stack too. If (2) feels wrong for the default view, (1) alone is 60% of the win.
- **Saving**: 105 KB raw (step 1) + ~80 KB raw (step 2) off /directory first load; nothing
  anywhere else
- **Risk & gate**: low for (1) - the map already handles an empty-features frame; medium
  for (2). Gates: `npm run visual` (directory is in ROUTES), open /directory and zoom/pan,
  `npm run check`. The demo deployment serves the same route - verify there too.
- **Confidence**: high. The thing that would change my mind on (2): the owner calling the
  map's instant appearance a landing-page-grade moment; (1) survives that objection.
- **Notes**: d3-transition/d3-color arrive via d3-selection/d3-zoom's graph even though only
  geo/zoom/select are imported directly - normal, tree-shaking is working, per-module paths
  visible in the analyzer. `supercluster` is NOT in any chunk (the hand-rolled
  `map-cluster.ts` replaced it, its own comment says so) - the package is a dead dependency;
  flagged to dependency-diet, wire cost already zero.

### bundle-build-04 - The root not-found.tsx statically imports the hoopoe puppet, putting bird + full motion into every page's shared chunk set and defeating the app's one next/dynamic
- **Where**: `src/app/not-found.tsx:9-12` (`import { Hoopoe } from
  "@/components/mascot/hoopoe"` + kit imports); the defeated split:
  `src/components/mascot/mascot-flight-layer.tsx:49` (`dynamic(() => import("./hoopoe"),
  { ssr: false })`); the honest accomplice: `src/components/mascot/hoopoe-warmup.tsx:42`
  (static import, its comment admitting "Harmless / instant if this page already has it (it
  does, via every static `import { Hoopoe }` elsewhere)")
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: chunk `0-4eyy7fi4hzu.js` (36 KB: hoopoe.tsx 26.3 KB + hoopoe-kit 3.3 KB +
  glue) is in the first load of all 92 pages (route-js.txt line 124), and I proved the
  puppet is really in it: the distinctive path literal `"M0 -3.4 Q3 0 0 3.4"` from
  hoopoe.tsx greps in exactly that chunk and no other. The root not-found boundary is part
  of every route's client graph, so its static Hoopoe import hoists the puppet - and,
  transitively, `motion/react` (hoopoe.tsx imports it), i.e. the whole 132 KB chunk of
  finding 02 - into the root-shared set. That is why /privacy, /terms and /guidelines
  (static text pages) each carry 168 KB of bird+motion they never render. On (main) pages
  this costs nothing extra - the sidebar perch (`sidebar-hoopoe.tsx`, by design, mascot.md)
  and 20 other intentional importers need the puppet at paint - so the fix's benefit is
  confined to the public static pages, and to making the existing `next/dynamic` in the
  flight layer actually mean something.
- **What to do**: in `not-found.tsx` only, load the bird the way the flight layer already
  does: `const Hoopoe = dynamic(() => import("@/components/mascot/hoopoe").then(m =>
  m.Hoopoe), { ssr: false })` (the 404 bird animating in a beat late is invisible - the
  page is an apology screen). Move the `useHoopoe`/`clamp`/`rand` kit imports as needed
  (hoopoe-kit is 3.3 KB and motion-free; it can stay static). Do NOT touch the 21 other
  static importers - login, signup, landing, sidebar all show the bird at first paint by
  design. Optionally do the same inside `hoopoe-warmup.tsx` (its static import exists only
  as a type/fallback and its own dynamic `import("./hoopoe")` already does the work).
- **Saving**: 36 KB (puppet chunk) + 132 KB (motion chunk, if 02 is not done first) off
  first load of /privacy, /terms, /guidelines, /catchups/join and any future public page;
  0 KB on (main) pages (bytes relocate from root-shared to main-shared, which is still a
  correctness win: public pages stop paying for members' chrome). After 02 lands, the
  incremental saving here is the 36 KB puppet only.
- **Risk & gate**: low. Gates: `npm run check`; open a bad URL signed out and watch the 404
  bird still fly; `npm run visual` (not-found is not in ROUTES, so the manual look matters).
- **Confidence**: high. Would change my mind: nothing found; the chunk membership is proven.
- **Notes**: this is the cleanest illustration of the repo's one systemic bundle bug: one
  static import at a boundary quietly hoists a subtree into every page. Worth a line in
  TRAPS.md when fixed (the fixer's call, per the one-commit rule).

### bundle-build-05 - Build time: TypeScript is 19.4 s of the 45.6 s build and CI already runs the same check
- **Where**: `raw/build.txt` ("Finished TypeScript in 19.4s", "Finished writing to
  filesystem cache in 10.5s"); `tsconfig.json` include globs (`**/*.ts`, `**/*.tsx`,
  `**/*.mts`, excluding only node_modules); `src/generated/prisma/` (87,384 lines of
  generated TS, gitignored but type-checked - Prisma 7 emits .ts source, which
  `skipLibCheck` does not skip); `.github/workflows/check.yml` (runs `npm run check` -
  TypeScript included - on every push to main)
- **Phase**: architecture
- **Tier**: T2 (config change) but **Decides**: owner (it changes what a deploy verifies)     **Class**: structural
- **Evidence**: the build's own phase timings. The TS step re-checks exactly what
  `.github/workflows/check.yml` checks minutes earlier on the same commit ("A push to this
  repo IS a deploy" - the workflow's own comment), so every Vercel deploy pays 19.4 s to
  re-prove a thing already proven. Contributors to those 19.4 s, measured by line count of
  what tsc sees: generated Prisma client 87 K lines, src 92 K lines TS (of which lab 32 K),
  `.next/types` glue, plus a 10.5 s incremental-cache write on cold builds. The
  scripts/e2e `.ts` surface is only 1,311 lines - excluding it is cosmetic, not a lever.
- **What to do**: present to the owner as one decision with three sizes. (a) Biggest:
  `typescript: { ignoreBuildErrors: true }` in next.config.ts - the deploy stops
  type-checking, CI's check.yml remains the gate; saves ~19 s per deploy. The honest risk:
  a push made without waiting for CI deploys type-broken code that CI would have flagged
  minutes later (Vercel does not gate on the workflow). (b) Middle: leave the build check
  on; accept 19 s as the price of a second gate. (c) Investigate-first: run
  `tsc --noEmit --extendedDiagnostics` once (a later session, not this audit) to get the
  real per-file cost of `src/generated/prisma` - if it dominates, a Prisma-side fix
  (checking the generated client once at `prisma generate` time and excluding it from the
  app project via project references) is the durable answer, but I could not find a clean
  supported Prisma 7 switch for d.ts-only emission, so I will not promise that one.
- **Saving**: ~19 s per production build (option a); unknown-but-real for (c)
- **Risk & gate**: low technically, medium procedurally (a). Gate: `npm run check` locally
  stays mandatory; check.yml unchanged; one deliberately type-broken scratch branch NOT
  pushed (rule: push is a deploy) - verify instead that check.yml fails on a PR.
- **Confidence**: high on the numbers, medium on the recommendation - this is a policy call.
- **Notes**: compile (16.9 s cold) has no config-level lever worth its risk; the analyze
  build compiled in 4.1 s warm, so Vercel's build cache already absorbs most of it.
  Related: 08/09 (lab's share of both phases), 06 (the other 3.0 s).

### bundle-build-06 - Sentry's runAfterProductionCompile costs 3.0 s per build while doing nothing (source maps are disabled)
- **Where**: `next.config.ts` (the `withSentryConfig(analyzed, { sourcemaps: { disable:
  !process.env.SENTRY_AUTH_TOKEN }, release: { create: false } ... })` tail);
  `raw/build.txt` ("Completed runAfterProductionCompile in 3.0s"); hook ownership proven:
  `node_modules/@sentry/nextjs/build/cjs/config/handleRunAfterProductionCompile.js`
- **Phase**: placeholder (a build phase plumbed in that has nothing to do)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (investigate), owner if
  the answer is "drop the wrapper"
- **Evidence**: there is no SENTRY_AUTH_TOKEN by explicit owner decision (the config's own
  comment: the wizard would have written it to the laptop). With upload disabled and
  release creation off, the hook still walks the build output for 3.0 s on every build,
  6.6% of the total. The wrapper's remaining live value is `webpack.treeshake.
  removeDebugLogging` (server-bundle Sentry log stripping) and config injection for the
  server-only SDK.
- **What to do**: a later session times `withSentryConfig` conditionally:
  `export default process.env.SENTRY_AUTH_TOKEN ? withSentryConfig(analyzed, {...}) :
  analyzed;` - then verifies (i) the build drops the 3.0 s phase, (ii) server errors still
  reach Sentry from a prod build (`src/instrumentation.ts` initialises the SDK at runtime
  independent of the build wrapper), (iii) the server bundle does not balloon from
  un-stripped debug logging (check `.next/server` sizes before/after). If (ii) or (iii)
  fails, close this as a not-finding with the measurement attached.
- **Saving**: ~3 s per build
- **Risk & gate**: medium (the wrapper does undocumented small things). Gate: a prod build
  log showing the phase gone + a thrown test error visible in Sentry.
- **Confidence**: medium - I did not execute the hook to see where the 3 s goes; the
  conditional is cheap to try and cheap to revert.
- **Notes**: keep the comment block; it carries two owner decisions (no token on laptop,
  no release mail) that must survive any change here.

### bundle-build-07 - The (main) layout statically mounts UI that most members never render: tour panel/offer/spotlight, demo bar, verify banner (~19 KB on every member page)
- **Where**: `src/components/tour/tour-provider.tsx:27-29` (static TourOffer, TourPanel,
  TourSpotlight); `src/app/(main)/layout.tsx:11,16` (VerifyEmailBanner, DemoBar);
  measured in the analyzer on every (main) route: tour-panel 4.0 KB + tour-steps 3.1 KB +
  offer/spotlight/anchors ~5 KB, demo-bar 3.5 KB, verify-email-banner 3.1 KB
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: analyzer src listings for /feed, /welcome, /collection, /admin/people/[id],
  /catchups/[catchupId] all contain `tour-panel.tsx 4.0K` and `demo-bar.tsx 3.5K` in
  first-load chunks. The tour is opt-in on the real site (layout comment: "On the real site
  it stays opt-in"); `DemoBar` renders only when `IS_DEMO` (build-separated deployment -
  every production member downloads a component that is constitutionally false for them);
  the verify banner renders only for unconfirmed members ("everybody after their first
  day" has it null, the layout's own words).
- **What to do**: (1) inside TourProvider, load the three surfaces on demand: keep the
  provider and its context/state static (it is the thing pages call), but
  `next/dynamic(() => import("./tour-panel"), ...)` etc., rendered only once
  `offered || active` - the provider already has that state. (2) In (main)/layout, DemoBar
  becomes `IS_DEMO ? <DynamicDemoBar .../> : null` via next/dynamic - the server knows
  IS_DEMO, so the chunk is referenced only on the demo deployment. (3) VerifyEmailBanner
  likewise behind `mailState ?` - the condition already exists at the call site. Steps are
  independent; do (2) first, it is the purest (a member can never need it).
- **Saving**: ~15-19 KB raw per (main) page first load (~7 KB gz); 3 files' worth of parse
  off the shell
- **Risk & gate**: low. The tour must still open instantly when a member clicks "take the
  tour" - dynamic chunks load in well under the panel's own entrance animation; the demo
  deployment must still show its bar (open the demo root after deploy). Gates:
  `npm run check` (manual-tour-entry.test.mjs exists in the tour area - keep green),
  `npm run visual`.
- **Confidence**: high. Would change my mind: if TourOffer must paint in the first frame on
  the demo (autoOffer) - then keep offer static on demo builds via the same IS_DEMO branch.
- **Notes**: these are small numbers individually; they are here because they are the
  layout-shell pattern the next feature will copy, and the pattern - "statically import a
  surface the server already knows is conditional" - is the same bug as 04 in miniature.

### bundle-build-08 - Lab inflates the single global CSS file every page loads (240 KB raw / 34 KB gz) - the one place lab DOES leak into production weight
- **Where**: `.next/static/chunks/1lr26daeze4p_.css` (239,668 bytes raw, 34,273 gz,
  measured); source scanning: Tailwind v4 auto-detection over `src/**` including
  `src/app/lab/**` (32,196 code lines); proof of leakage: 126 arbitrary-value utility
  classes appear in lab sources and nowhere else in the app (comm of sorted class
  extractions), and spot-checks `-mb-[58px]`, `h-[132px]`, `h-[188px]`, `border-t-[3px]`
  each appear exactly once in the built CSS
- **Phase**: relocate
- **Tier**: T3     **Class**: structural     **Decides**: owner (coupled to the lab-in-prod
  question, 09)
- **Evidence**: as above - lab-only selectors are demonstrably compiled into the stylesheet
  that /feed and /login serve to every member. What I cannot measure without a scratch
  build is the SIZE of lab's share: the 126 arbitrary classes are maybe 8-15 KB raw, but
  lab's standard-utility surface (utilities only lab uses) is invisible to my method. Range
  honestly: 15-60 KB raw (2-9 KB gz) of the 240 KB.
- **What to do**: only as part of whatever 09 decides. If lab stays in the prod build:
  Tailwind v4.1 supports `@source not "./app/lab";` in globals.css - but that unstyles lab
  rooms in production, so it requires either (a) accepting broken lab rooms in prod (bad:
  they are browsable by design), or (b) a second, lab-only stylesheet imported by
  `src/app/lab/layout.tsx` - real work, only worth it if the scratch measurement says the
  share is at the top of the range. First step for a later session: run one build with
  `@source not` temporarily in place and diff the CSS size - that number decides.
- **Saving**: 15-60 KB raw / 2-9 KB gz on every page (unverified range; measure first)
- **Risk & gate**: medium (visual regressions in lab rooms if done carelessly).
  Gate: `npm run visual` + opening /lab/v2 and two other rooms.
- **Confidence**: high that leakage exists (proven), low on magnitude (stated as such).
- **Notes**: `tw-animate-css` and `shadcn/tailwind.css` are also imported wholesale in
  globals.css:1-3; Tailwind v4 emits only used utilities from them, so I do not flag them -
  but the dependency-diet agent should know `shadcn` (the CLI package) is a runtime
  dependency because of that CSS import.

### bundle-build-09 - The lab's production cost, measured: zero JS on shipped routes, ~35% of TS lines, 43 of 92 built routes (the macro answer)
- **Where**: `src/app/lab/**` (32,196 code lines, 43 routes); evidence artefacts:
  `.next/diagnostics/analyze/data/*` (all 73 non-lab routes), `raw/build.txt` route table
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: I walked the analyzer data for every one of the 73 non-lab routes and
  summed client chunk-part bytes whose source path contains `app/lab`: **0 bytes on all
  73**. Shared chunks stay clean because Turbopack splits by import graph and nothing
  shipped imports from lab (the registry/`_kit` direction is lab -> app, never app -> lab).
  Lab's big chunks are route-private: `1uujlq1zmrj3x.js` 142 KB -> /lab/profiles only,
  `2-0i8fu_0bq5x.js` 109 KB -> /lab/landings only, `1850681g3m4k9.js` 95 KB ->
  /lab/directory only. So excluding lab from the production build is **a build-time and
  repo-hygiene item, not a member-facing performance item** - with the single exception of
  the CSS share in 08. What exclusion would buy: some slice of compile 16.9 s (lab is 35%
  of TS lines; est. 3-6 s cold), a slice of TypeScript 19.4 s (est. 3-5 s), 43 fewer routes
  in page-data collection, and 08's CSS share. What it would cost: the mechanism (rename
  lab `page.tsx` -> `page.lab.tsx` and gate `pageExtensions` on an env var, or move lab
  out of `src/app`), updates to `scripts/qa/lab-audit.mjs` and the registry check, and the
  loss of browsable owner-approved design history on the deployed site - which CLAUDE.md
  treats as a feature ("/lab is the one index of every dev and preview room").
- **What to do**: nothing autonomous. Present to the owner (Owner decisions below). If the
  answer is "keep lab deployed", close this permanently with this report as the evidence
  that it costs members nothing in JS.
- **Saving**: ~6-11 s build, 43 routes of build output, plus 08's range - all only if the
  owner says so
- **Risk & gate**: high (touches the check gate, the registry, the deploy story).
  Gates: `npm run check` (lab registry audit), `npm run verify:crawl`.
- **Confidence**: high on the measurements; the recommendation is deliberately withheld.
- **Notes**: this closes the question my charter said "decides whether excluding lab from
  prod is a performance item or only a hygiene item": **hygiene + build time, except the
  CSS sliver**. No future audit should re-run the leakage check without cause; the method
  (analyzer chunk_parts by source path) is in this report's header.

### bundle-build-10 - The 50-bird glyph set is 46 KB of JavaScript on 60 routes' first load
- **Where**: `src/components/common/bird-avatar-v2.tsx` (1,840 lines; 43.4 KB in chunk
  `1xz03zknym-s7.js` with `bird-adjust.json` 2.1 KB + `lib/avatar` 0.9 KB), reached via
  `bird-avatar.tsx` (the public wrapper) from ~40 shipped components
- **Phase**: relocate (data out of code)
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: route-bundle-stats.json: the chunk is in first load of 60 routes (every
  page that can render an avatar - feed, directory, profile, catchups, admin...). The
  glyphs are hand-tuned SVG path data (owner design rules in memory: "clearly-a-bird",
  Flameback beak ceiling) compiled as JSX. Every member pays 46 KB raw / ~13 KB gz of
  parse on nearly every page for all 50 birds when a feed page might show 8 distinct ones.
- **What to do**: only with the owner's eyes on it, because the birds are a signature.
  Options in ascending disruption: (a) leave it - 13 KB gz for the identity system of the
  site is defensible, and this report records that as legitimate; (b) an SVG sprite sheet
  (`public/birds.svg`, `<use href="/birds.svg#flameback">`) - JS drops ~40 KB, the sprite
  is fetched once and browser-cached across deploys, glyphs appear identically; risk is
  the known centroid-clipping gotcha (memory: bird-avatars) and `<use>` styling limits
  (currentColor theming must be re-verified per bird); (c) server-render the glyph SVG
  inline where the avatar is inside a server component - inapplicable for most call sites
  (cards are client).
- **Saving**: ~40 KB raw / ~12 KB gz on 60 routes (option b)
- **Risk & gate**: medium-high (visual identity). Gates: `npm run visual` across all 10
  baseline routes, plus dark-mode shots (the dark palette differs, Appendix B).
- **Confidence**: medium. Would change my mind: if `<use>` cannot reproduce the per-bird
  `bird-adjust.json` transforms cleanly, the sprite loses; measure one bird first.
- **Notes**: I deliberately did not propose per-bird code-splitting (50 dynamic imports):
  request overhead and waterfall would cost more than 13 KB gz saves.

### bundle-build-11 - Defer behind-interaction dialogs on the hot routes: image viewer, edit/report dialogs, contribute, avatar crop (~15-20 KB per route + they anchor motion's drag features)
- **Where**: `src/components/posts/post-card.tsx:16,24-25` (static ImageViewer,
  ReportDialog, EditPostDialog); `src/components/collection/collection-client.tsx`
  (contribute-dialog 5.8 KB, viewer 8.2 KB); `src/components/profile/letterhead-profile.tsx`
  + `src/components/onboarding/steps/photo-step.tsx` (avatar-crop-dialog);
  `src/components/catchups/home/keeper-settings-dialog.tsx`, `library-picker-dialog.tsx`
- **Phase**: architecture
- **Tier**: T2 per site     **Class**: structural     **Decides**: autonomous
- **Evidence**: analyzer, /feed: image-viewer.tsx 8.2 KB + report-dialog 1.6 + edit-post-
  dialog 1.6 in first-load chunks; /collection: viewer 8.2 + contribute-dialog 5.8;
  /profile: viewer 8.2 + crop ~6. All open only on click. The viewer and crop are also the
  app's only `drag` users, which matters for 02: with them deferred, the sync motion
  surface needs even less.
- **What to do**: standard `next/dynamic` with `ssr: false` at each call site, state-gated
  render (`viewerAt !== null && <ImageViewer .../>` - post-card already gates render, so
  only the import changes). Respect the viewer-step motion spec (DESIGN-SYSTEM.md sec. 7)
  - deferral must not skip the film-advance entrance; the dialog mounts after its chunk
  arrives, which is the same AnimatePresence entrance as today.
- **Saving**: ~12 KB (/feed), ~15 KB (/collection), ~15 KB (/profile) raw first-load each;
  small individually, and the pattern completes 07
- **Risk & gate**: low-medium: the viewer opening must not visibly lag a click on a slow
  connection (chunk ~10 KB, arrives inside the 140/200 ms cross-fade). Gates:
  `npm run visual`, click-through on feed image -> viewer -> arrow keys.
- **Confidence**: high.
- **Notes**: I checked create-post-form (21.2 KB on /feed) and letterhead-profile (25.2 KB
  on /profile) as deferral candidates and rejected both: the composer is above the fold on
  /feed and the letterhead IS the profile page; deferring either would visibly delay the
  page's own content. They are listed so the next audit does not re-open them.

### bundle-build-12 - Feed and letter photos are served as stored-size `<img>` with no responsive sizing
- **Where**: `src/components/posts/post-card.tsx:430-441` (raw `<img src={img}` with
  `loading="lazy"`, eslint-disable comment); `src/components/letters/letter-images.tsx`;
  contrast: `src/components/collection/collection-client.tsx:41` (uses `photo.thumbUrl` -
  the collection DID build a thumbnail path)
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: owner-adjacent (media spec owns
  the pipeline; this lens only prices it)
- **Evidence**: not a JS-bytes item - an image-bytes item, and on a photo-heavy feed image
  bytes dwarf every JS finding above. The upload pipeline shrinks client-side
  (`shrinkForUpload`, B-030) and converts to WebP via Sharp, so the stored asset is sane -
  but a feed card displays at ~600 px and downloads the stored width whatever it is, with
  no `srcset`/`sizes`. next/image was deliberately constrained (remotePatterns are
  security-scoped, C-134) and IS used elsewhere (11 files), so the machinery exists.
- **What to do**: a later session measures first (one feed screenshot session, network tab:
  actual downloaded KB per card image vs rendered px), then either routes card images
  through `next/image` with `sizes="(max-width: 640px) 100vw, 600px"` (hosts already
  allowlisted) or extends the collection's thumbUrl pattern to posts. Do not touch the
  viewer's full-size fetch (Download button reasoning is in next.config.ts connect-src).
- **Saving**: unmeasured here; plausibly hundreds of KB per feed screenful on photo-heavy
  days, i.e. potentially the largest real-world load-time item in this report
- **Risk & gate**: medium (the C-134 security reasoning must hold: next/image endpoints are
  public). Gate: screenshot + network audit before/after; `security-regressions.test.mjs`.
- **Confidence**: medium - I did not measure stored widths (no DB access in this audit).
- **Notes**: flagged jointly to the media/feed territory agents; recorded here because
  "faster load times" was the owner's first-listed goal and JS is not where feed
  load time mostly goes once photos enter.

## Owner decisions

1. **Should the deploy keep re-running TypeScript?** (bundle-build-05) Every publish spends
   ~19 of its 46 seconds re-checking types that GitHub's check workflow already checks on
   the same push. Turning the duplicate off makes deploys ~40% faster; the cost is that a
   push which somehow skipped the checks could reach members with a type error. My
   recommendation: turn it off only if you treat a red X on GitHub as "fix immediately";
   otherwise keep paying the 19 seconds.
2. **Lab rooms in the public build.** (bundle-build-09, -08) Measured: the lab costs members
   nothing in JavaScript - every shipped page is clean, proven route by route. It costs
   the BUILD roughly 6-11 seconds and adds a small, unmeasured slice (likely 2-9 KB
   compressed) to the stylesheet every member downloads. Removing lab from the public
   build is therefore mostly a tidiness/build-speed call, not a speed-for-members call.
   My recommendation: keep lab deployed (it is your design history and it is cheap);
   authorise only the one-build CSS measurement so the stylesheet question closes with a
   number.
3. **The bird glyphs as a shared file instead of code.** (bundle-build-10) All 50 birds
   ship as ~13 KB (compressed) of code on almost every page. Moving them to one cached
   image file saves most of that and cannot change how a bird looks - but the birds are
   hand-tuned and any packaging change deserves your eyes on before/after screenshots.
   Recommendation: worth doing in a quiet week, not urgent.
4. **PostHog's first two seconds.** (bundle-build-01) Deferring analytics makes every page
   meaningfully lighter but a visitor's very first click (within ~1-2 s of landing) would
   no longer be auto-captured. Vercel Analytics still counts the visit. Recommendation:
   defer everywhere; if the landing-page funnel's first-click data matters to you, we keep
   PostHog eager on the landing page only.

## Not-findings

- **Lab leaks into shipped JS** - disproven: 0 lab-source bytes in the client chunks of all
  73 non-lab routes (analyzer walk; method in 09). The one lab leak is CSS (08).
- **`optimizePackageImports` gaps** - none worth adding. Configured: `@phosphor-icons/react`
  (works - per-icon modules like `defs/Feather.es.js` visible in chunks), `motion`
  (irrelevant to runtime weight, see 02). `lucide-react` is on Next's default list and
  per-icon modules (`icons/map-pin.js`) confirm it. `@base-ui/react` is imported by subpath
  (`@base-ui/react/menu`, 12 distinct subpaths in `src/components/ui`) - no barrel to
  optimise. d3 is per-package. posthog-js/sonner/tailwind-merge are single-module.
- **zod in the client bundle** - not present: `ZodError` greps zero chunks; validation
  stayed server-side. The boundary held.
- **The 110 KB `polyfill-nomodule` chunk** (`0cz1d0mv5g_q7.js`) - loaded via `nomodule`,
  modern browsers never fetch it. Present in analyzer totals; not a target.
- **Internal barrel files** - only `src/components/common/filters/index.ts` exists;
  trivial. No barrel-driven tree-shaking failures found in any measured chunk.
- **Fonts** - `next/font/google`, latin subsets, 2+4 weights, self-hosted by Next; no
  @font-face or external font requests in globals.css. Correct as-is.
- **sonner (33 KB) and tailwind-merge (25.5 KB) on every page** - both genuinely global
  (toasts fire from every surface; `cn()` is in every component). Legitimate cost.
- **The hoopoe on every (main) page's first load** - by design: the sidebar perch is
  visible at paint (mascot.md; owner's always-on motion decision, DESIGN-SYSTEM.md sec. 7).
  This report quantifies (26.3 KB + kit) and does not propose removing it; only the
  not-found chain (04) is a defect.
- **`/hoopoe` as a shipped route** - deliberate public playground, documented in the page
  file itself ("a link handed to people who have no account"); its 601 KB first load is
  its own business.
- **Raw `<img>` in collection/post-card as a lint violation** - each carries an
  eslint-disable with reasoning, lazy loading, and (collection) a real thumbnail URL. The
  finding that remains is responsive sizing on posts (12), not the element choice.
- **`(main)/layout.tsx`'s awaited `Promise.all`** - the layout documents why the catch-up
  advance is awaited (audit Low 24) and why mail drains in `after()`. Server-latency
  design, deliberate, out of this lens.

## For other lenses

- `supercluster` + `@types/supercluster`: in package.json, absent from every chunk and every
  src import (replaced by `src/lib/map-cluster.ts`, whose comments say so) - dead dependency
  (dependency-diet).
- `d3-scale` + `@types/d3-scale`: zero imports anywhere in src (dependency-diet).
- `shadcn` (^4.1.0) sits in runtime `dependencies` and is a CLI - but globals.css line 3
  imports `shadcn/tailwind.css`, so removal needs that import resolved first
  (dependency-diet + whoever owns globals.css).
- `bird-avatar.tsx` (734 lines) wrapping `bird-avatar-v2.tsx` (1,840) - two-layer avatar API;
  possible dedupe/flatten (common-components territory).
- `letterhead-profile.tsx` at 1,981 client lines is the repo's largest component; internals
  are profile-territory, but any split should keep the client boundary question from
  finding 11's notes in mind.
- `hoopoe-warmup.tsx`'s static Hoopoe import contradicts its own dynamic-import comment
  (mascot territory; also see 04).
- The `Connection: close` dev header and dev-only CSP notes in next.config.ts are excellent
  TRAPS.md material if not already there (docs territory).
- posthog rewrites: the versioned-static rewrite comment documents "three 404s" noise -
  worth keeping verbatim through any config edit (docs/ops).

## Metrics

- First-load JS (raw, build manifest): root 430 KB on all pages; /directory 1,642 KB,
  /profile/[id] 1,636, /feed 1,530, /welcome 1,493, /collection 1,485; lightest real page
  /verify-email 1,045; static legal pages 1,003. Median (main) page ~1,370 KB.
- Measured gzip ratio 0.38-0.40 across routes (so /feed ≈ 610 KB gz today).
- Per-route package totals (analyzer, /feed): next 578 K, posthog-js 248 K, @base-ui/react
  199.7 K, motion-dom 99.5 K, framer-motion 47.7 K, sonner 33.4 K, tailwind-merge 25.5 K,
  phosphor 23.4 K, lucide 16.3 K, floating-ui 32 K, auto-animate 8.3 K.
- Heaviest src modules in client bundles: bird-avatar-v2 43.4 K, hoopoe 26.3 K,
  letterhead-profile 25.2 K, create-post-form 21.2 K, person-detail 16.4 K,
  people-panel 11.0 K, comments-section 10.8 K, sidebar 10.0 K.
- "use client": 180 non-lab files, 41,433 lines; exactly one `next/dynamic` in the app
  (mascot-flight-layer), currently defeated by 22 static Hoopoe importers (04).
- Hook/handler probe of the 20 heaviest client files (lines / hook-refs / handler-refs):
  letterhead-profile 1981/29/27, create-post-form 1683/48/22, hoopoe 1522/18/0,
  person-detail 911/16/23, houses-chain 761/5/3, sidebar 755/4/5, alumni-map 736/17/12,
  signup-form 718/24/16, comments-section 718/20/6, people-panel 717/8/20,
  ambient-leaves 676/11/11, perching-birds 664/8/3, login-client 654/28/6,
  directory-client 651/16/16, mascot-flight-layer 622/10/0, post-card 548/17/7,
  dark-gauntlet 504/10/21, collection-client 466/22/14, pen 456/8/9,
  location-picker 453/17/10. **Verdict: all 20 (and the next 20 probed) genuinely need
  `"use client"` at file level** - state, effects and handlers are woven through each; none
  is a static tree with a client leaf. The boundary-lowering opportunities that exist are
  architectural splits (letterhead-profile, post-card) with modest KB payoffs, noted in 11.
- Build: 45.6 s = compile 16.9 + Sentry hook 3.0 + TypeScript 19.4 (incl. 10.5 s cache
  write) + page data + static 0.6. tsc surface: src 92 K lines + generated prisma 87 K
  lines + scripts/e2e 1.3 K lines.
- Global CSS: 239.7 KB raw / 34.3 KB gz, single file, all pages; contains proven lab-only
  selectors (08). 3 `@keyframes` in globals.css source (662 lines) - modest.
- Expected post-diet first load, honestly ranged (raw, gz at 0.40):
  - **/feed**: today 1,530 KB. After 01+02+07+11 (autonomous set): **1,150-1,220 KB
    (~460-490 KB gz)**. Adding owner item 10: **~1,110-1,180 KB**. Framework+chrome floor
    for this app's design (react-dom, router, base-ui chrome, birds, mascot, sonner,
    cn): ~950-1,000 KB raw; going lower means removing product, which this audit does not
    propose.
  - **/directory**: today 1,642 KB. After the same set + 03: **1,070-1,150 KB
    (~430-460 KB gz)**; with 10: **~1,030-1,110 KB**.
  - Every other (main) page moves down by the shared ~360-380 KB (01+02+07) automatically.
- Lines read: ~2,600 directly (layouts, config, providers, motion kit, file heads) plus
  ~1,900 lines of tool output and the decoded analyzer data for 78 routes.
