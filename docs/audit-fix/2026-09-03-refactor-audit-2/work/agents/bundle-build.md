# bundle-build - refactor audit 2 report

Cross-cutting lens: what a member downloads and what the build spends. I did not judge code
structure inside components (territory agents) or whether a dependency should exist
(dependency-diet); I priced every byte on the wire and every second of the build, using the
orchestrator's production build at `.scratch/audit2-build/.next/` (231 chunks), Next's own
Turbopack analyzer output (`diagnostics/analyze/data/**`, decoded: a u32 big-endian length prefix
then JSON with `sources` (a parent-indexed path tree), `chunk_parts` (source, output file, size,
gzip size) and `output_files`; client chunks are the `[client-fs]/_next/static/chunks/*` entries),
and the raw tool outputs in `work/raw/`. One important wrinkle the next reader must know: **the
analyzer is a separate build with different chunk hashes**, so I matched analyzer chunks to
production chunks by size and then confirmed every load-bearing pairing by grepping a distinctive
string literal in the production file (the hoopoe's `M0 -3.4 Q3 0 0 3.4`, the guide chapter
prose, `twMerge`, and so on). Where a size match was ambiguous and I could not confirm it, I say
so. Date: 2026-09-03. Files in territory: 13 source/config files plus the build tree and 7 raw
outputs; read fully: all 13, the four CSS chunks, the analyzer data for all 100 page routes, and
the raw outputs listed under Coverage.

## Coverage

- Read fully: `next.config.ts` (387 lines), `src/app/layout.tsx`, `src/app/(main)/layout.tsx`,
  `src/app/(main)/template.tsx`, `src/app/lab/layout.tsx`, `src/app/globals.css` (726 lines),
  `src/components/common/motion.tsx`, `src/components/common/motion-features.tsx`,
  `src/components/analytics/posthog-client.ts`, `posthog-identify.tsx`, `posthog-provider.tsx`,
  `src/app/lab/type/_fonts.ts`, `src/components/guide/guide-layer.tsx`,
  `src/components/guide/chapters/index.tsx`, `tsconfig.json`, `vercel.json`, `postcss.config.mjs`;
  raw: `route-bundle-stats.json`, `route-js.txt`, `route-js.mjs`, `chunk-sizes-top30.txt`,
  `build.txt`, `build-setup.txt`, `use-client.txt`, `dynamic-imports.txt`, `barrels.txt`,
  `files-added-since-audit1.txt`; audit 1's `work/agents/bundle-build.md` (634 lines) and the
  fix-prompt's session 7 and 8 logs; DESIGN-SYSTEM.md sections 5 and 7; OPERATIONS.md sections
  3 and 5; Next docs: `package-bundling.md`, `lazy-loading.md`, `turbopackChunking.md`,
  `cssChunking.md`, `inlineCss.md`, `turbopackFileSystemCache.md`, `useLightningcss.md`, the
  default `optimizePackageImports` list in `node_modules/next/dist/server/config.js`; the Sentry
  hook `node_modules/@sentry/nextjs/build/cjs/config/handleRunAfterProductionCompile.js`.
- Skimmed (why): import blocks only of `app-shell.tsx`, `sidebar.tsx`, `notification-bell.tsx`,
  `onboarding-flow.tsx`, `guide-overlay.tsx`, `person-detail.tsx` - I needed what they pull, not
  how they work. The 20 largest client files were probed for hook/handler/browser-API density,
  not read line by line (their internals belong to territory agents).
- Not read: lab room sources beyond the two font files and the layout (out of scope for weight
  once their chunks were shown to be route-private); the base-ui and motion package internals
  beyond what the analyzer names.
- Uncommitted edits seen (someone else's WIP): `src/components/common/image-viewer.tsx` is
  modified in the working tree (`git status` at session start). I did not open it; my numbers
  come from the HEAD build (`72b5a1d`), which the scratch worktree was built from.

## Summary

The first audit did the big, obvious bundle work and it held: posthog-js (245 KB raw / 79 KB gz)
is in the eager first-load of **zero** routes now, LazyMotion's `m.` split keeps the 59 KB domMax
feature bundle out of every shipped page's first load (it is eager only on 15 lab rooms, which
still use `motion.*` on purpose), the lab leaks 0 bytes of JavaScript into shipped routes, and no
server-only module (prisma, pg, sharp, aws-sdk, resend, bcrypt, sentry) is reachable from any
client chunk. The **floor of a member page is 1,064 KB raw / ~340 KB gz of JavaScript** before a
byte of page content: 14 root chunks on every route (621 KB raw / 193 KB gz, of which ~445 KB is
framework and ~176 KB is the app's providers) plus a (main)-shell tier of 16 chunks on 39-46
routes (434 KB raw / 147 KB gz), plus a 233 KB raw / 33.5 KB gz stylesheet. Three structural
things survive, and two of them are new since audit 1 closed:

1. **The stylesheet is 27% lab.** Measured (not estimated this time): 874 rules / 60.8 KB raw /
   7.2 KB gz exist only because of `src/app/lab/**`, plus 5.1 KB raw from class tokens Tailwind v4
   found in `docs/`, `progress.md` and audit reports, because its auto-source scan covers the
   whole repository. `/lab` is admin-only (`src/app/lab/layout.tsx` returns `notFound()` for
   everyone else), so members download 66 KB of render-blocking CSS they cannot ever use. There
   is a mechanism to keep the lab deployed and out of the shared sheet (finding 02).
2. **The motion feature loader dynamic-imports the whole `motion/react` barrel**, so every page
   downloads ~70 KB raw / 17 KB gz of Reorder, useScroll, view-transition, legacy-frameloop and
   stats code after hydration that nothing uses, on top of the 59 KB domMax actually wanted, and
   the 34 KB motion animation engine is fetched twice (once eagerly, once inside that async
   group). A two-line feature module is Motion's documented fix (finding 01).
3. **Turbopack's chunk merging duplicates modules**: 68 KB (/privacy) to 156 KB (/profile) of
   module bytes appear in more than one chunk of the same route, 23 production chunk pairs are
   byte-identical, and the base-ui Popover stack is re-merged into six route-private chunks. Some
   of this is the chunker's designed trade-off (documented in `turbopackChunking.md`), some folds
   into finding 01; the rest is a config experiment with a measurement gate (finding 04).

Smaller but real: the guide's six chapters ride every member page though the layer "renders
nothing until somebody presses a page title" (15 KB, 39 routes); the base-ui Combobox behind
`LocationPicker` is eager on /welcome and /admin/people/[id] (53 KB each) though the letterhead
already defers the same picker; Phosphor icons ship six weights per glyph (57 KB of defs for 23
icons, ~2/3 never drawn). Build time: the 20.3 s compile is a **cold** number (the scratch
worktree had no `.next/cache`; the build wrote a 618 MB Turbopack cache that Vercel restores), the
14.6 s TypeScript is owner-declined, static generation is 0.7 s for 105 routes of which 48 are
lab, and excluding the lab from the build would honestly save ~8-11 s cold / ~4-6 s warm - the
only member-facing lab cost is the CSS. Structural-vs-cheap: 01-06 are structural; 09-10 are
cheap footnotes. Nothing here re-opens a refuted row: I did not re-propose tsconfig excludes, the
Sentry wrapper, or the DemoBar split, and I re-checked all three against the current build.

## Findings

### bundle-build-01 - Load only `domMax`, not the whole `motion/react` barrel: ~70-90 KB raw / ~17-22 KB gz of unused motion code downloaded on every page after hydration
- **Where**: `src/components/common/motion-features.tsx:31` (`const loadDomMax = () =>
  import("motion/react").then((mod) => mod.domMax);`), mounted from `src/app/layout.tsx:99`
  (`<MotionFeatures>` wraps every route). Built result: production chunks `02l-4doqbe4qr.js`
  (70.8 KB raw / 17.0 KB gz), `0i3ir-6v25wb4.js` (58.6 KB / 18.1 KB gz, the real domMax),
  `3310zq7p7go82.js` (33.9 KB / 12.9 KB gz), plus two smaller lazy motion chunks (11.4 KB and
  7.3 KB), all referenced by all 100 routes and none in any shipped route's first load.
- **Phase**: library
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the analyzer attributes the 70.8 KB chunk (`1ktv4t7u1s7nj.js` in analyzer
  space) to 81 modules that are exports of the `motion/react` barrel and nothing else:
  `value/use-inverted-scale.mjs` 27.9 KB, `frameloop/index-legacy.mjs` 10.2, `components/Reorder`
  3.5, `layout/LayoutAnimationBuilder.mjs` 3.4, `stats/index.mjs` 2.1, `animation/optimized-
  appear` 1.9, `view/start.mjs` + `view/index.mjs` 3.4, `easing/steps` 1.5, `animation/waapi`
  1.3, `effects/*` 2.7, `MotionConfig`, `LayoutGroup`, `useInView`, `useCycle`, `useTime`,
  `useVelocity`, `AnimateSharedLayout`, `useWillChange`... The domMax object itself is the
  separate 58.6 KB chunk (`projection/node` 24.5 KB, `gestures/drag` 9.4, `motion/features` 4.6,
  `gestures/pan` 4.6, `render/utils` 3.4, `projection/geometry` 2.5 - exactly the layout, drag,
  pan, hover, tap, focus, inView and measureLayout features the file's comment says the app
  uses). A dynamic `import()` of a namespace cannot be tree-shaken: the bundler must evaluate
  every export of the barrel to hand back `mod`, so `.then(m => m.domMax)` selects at runtime
  what static analysis could have selected at build time. The non-lab source imports exactly
  these names from `motion/react` (grep, 61 files): `m` (61), `AnimatePresence` (29),
  `useMotionValue` (4), `useTransform` (3), `useSpring` (1), `useScroll` (1, in the switched-off
  `showcase-shot.tsx`), `useReducedMotion` (1, same file), `useAnimationControls` (1),
  `animate` (1, `hoopoe.tsx`), `LazyMotion` (1). Nothing imports Reorder, view transitions,
  stats, LayoutGroup, MotionConfig or the legacy frameloop, and the analyzer shows none of them
  in any eager chunk.
- **What to do**: create `src/components/common/motion-features-max.ts` containing exactly
  `import { domMax } from "motion/react"; export default domMax;` (with a two-line comment
  saying why it is its own module: a static named import is tree-shaken, a dynamic namespace
  import is not - this is Motion's own documented "features.js" pattern for `LazyMotion`).
  Change `motion-features.tsx:31` to `const loadDomMax = () =>
  import("./motion-features-max").then((mod) => mod.default);`. Nothing else changes; the
  `LazyMotion` element, the always-on policy and the `no-strict` reasoning stay as written.
  Verify at the browser, not with `route-js.mjs` (it cannot see lazy chunks): on `next start`
  read `performance.getEntriesByType("resource")` on /feed and confirm the lazy motion chunks
  total roughly 60-95 KB raw instead of ~180; grep the downloaded chunks for the string
  `"Reorder"` or `useInvertedScale` and confirm absent. Then the two domMax behaviours session 7
  used as its proof: the sidebar marker glides through intermediate positions (layout), and the
  image viewer attaches `touch-action: pan-y` when its drag gesture arms (drag).
- **Saving**: ~70 KB raw / ~17 KB gz of post-hydration download on every one of the 100 routes
  (52 shipped), probably more: the 11.4 KB `animate`/sequence chunk and the 7.3 KB `useScroll`
  chunk that are also lazily referenced on every route are barrel fallout of the same import and
  should disappear with it (I could not prove their parent from the analyzer, so they are not
  counted). Also likely to shrink finding 04's eager/lazy overlap (the 33.9 KB animation-engine
  twin), because the async group will be computed from domMax's real graph. Honest caveat: this
  is not first-load weight; it is bytes every page fetches a moment after it is interactive, on
  connections the type room's own copy calls "rural Indian".
- **Risk & gate**: low. The one thing that could go wrong is Turbopack refusing to tree-shake the
  static import from the barrel, in which case the chunk stays the same size and the change is a
  no-op to revert. Gates: `npm run check` (`src/components/common/motion-namespace-rule.test.mjs`
  must stay green - it pins `LazyMotion` mounted and `domMax`, and this change keeps both), the
  browser measurement above, `npm run visual` (23/23).
- **Confidence**: high that the barrel is the cause (the module list is the barrel's export
  list); medium-high on the exact KB (the analyzer's per-module sizes for a few files, e.g.
  27.9 KB for `use-inverted-scale.mjs`, look like concatenated-module attributions rather than
  that one file, so the chunk total is the number to trust, not the line items).
- **Notes**: `experimental.optimizePackageImports: ["motion"]` in `next.config.ts` does not help
  a dynamic namespace import; it only rewrites static barrel imports. Audit 1's report said
  the same about `optimizePackageImports` and runtime weight. Keep `domMax` (not `domAnimation`):
  the file's comment is right that layout and drag are both used. Related: 04.

### bundle-build-02 - Take the lab's 874 rules (60.8 KB raw / 7.2 KB gz) and the docs' tokens (5.1 KB) out of the stylesheet every member downloads, without unstyling the lab
- **Where**: `src/app/globals.css:1` (`@import "tailwindcss";` with no `source()` and no
  `@source` directives, so Tailwind v4 auto-detects sources from the project root, honouring
  `.gitignore`); built result `.next/static/chunks/32v74upyu8cz7.css` (238,434 bytes raw /
  33,666 gz), on all 100 routes; `src/app/lab/layout.tsx` (admin-only gate; the natural home for a
  lab-only stylesheet); Tailwind 4.2.2 installed (`@source not` needs 4.1+).
- **Phase**: relocate
- **Tier**: T3     **Class**: structural     **Decides**: owner (the lab is his; the mechanism
  is autonomous)
- **Evidence**: method, since audit 1 could not size this: I parsed the compiled sheet into
  3,134 leaf rules, extracted the class names from each selector, and tested each class (and
  its variant-stripped base) against the set of whitespace-delimited tokens in every file under
  `src/` split into lab (112 files, 31,309 distinct tokens) and non-lab (701 files, 79,494
  tokens). Result: 2,059 rules (139.5 KB) are reachable from non-lab source; **874 rules
  (59.3 KB of rule text, 60.8 KB with separators) match only lab tokens**; 51 rules (5.0 KB)
  match neither - and those come from outside `src/`: `-mb-[58px]` and `h-[188px]` are quoted in
  `docs/audit-fix/2026-08-25-refactor-audit-1/work/agents/bundle-build.md` (audit 1's own report
  put them there), `h-[86dvh]` and `min-w-[640px]` are in `progress.md` and `docs/spec/admin.md`,
  `pt-[106px]` in `docs/history/progress-2026-06.md`, `w-80/96` in an audit-1 verify note. 150
  rules (15.2 KB) have no class selector (preflight, base layer, keyframes, `@property`). I then
  rebuilt the sheet with the lab-only rules removed and gzipped both: **238,434 -> 177,671 raw,
  33,666 -> 26,426 gz; removing the docs-sourced rules too: 172,539 raw / 25,711 gz.** Of the
  lab's share, 477 rules (33.2 KB) are arbitrary-value utilities (`top-[46%]`, `-top-[11px]`,
  `border-t-[3px]`, `h-[132px]`...) that can never be reused by the app. Audit 1's spot-checks
  (`h-[132px]`, `border-t-[3px]`) are confirmed present in the built CSS and lab-only.
  `src/app/lab/layout.tsx` returns `notFound()` for any non-admin, so no member can render a
  lab class.
- **What to do**: two independent steps, the first trivial.
  (1) Scope the scan to `src/`: change line 1 of `globals.css` to `@import "tailwindcss"
  source("../");` (paths are relative to the CSS file, so `../` from `src/app/` is `src/`).
  Removes the 51 docs-sourced rules (5.1 KB raw / 0.7 KB gz) and stops every future audit
  report, spec and progress entry from growing the production stylesheet. Zero visual risk: no
  shipped component can depend on a class that only a markdown file mentions.
  (2) Give the lab its own sheet. In `globals.css` add `@source not "./lab";` (Tailwind 4.1+
  syntax, relative to the CSS file - verify against `node_modules/tailwindcss` docs at fix time;
  the 4.2.2 changelog is not in the package). Create `src/app/lab/lab.css` containing
  `@reference "../globals.css";` (so `bg-mist`, `font-heading`, the radius ladder and every
  `@theme` token resolve without being re-emitted) followed by `@import "tailwindcss/utilities.css"
  layer(utilities) source("./");` so utilities are generated over the lab folder only; import
  it once from `src/app/lab/layout.tsx`. Lab rooms then load the global sheet (theme, preflight,
  components, app utilities) plus their own utilities sheet; a utility both sides use exists in
  both, which is harmless. Then run one production build and read the three numbers: the global
  sheet should land near 172 KB raw / 25.7 KB gz; the lab sheet near 60 KB; open `/lab/v2`,
  `/lab/craft` and `/lab/profiles` as admin and compare against screenshots taken before.
  If `@reference` + `utilities.css` with a `source()` proves awkward in this Tailwind version,
  the fallback is a full `@import "tailwindcss" source("./")` in `lab.css` with
  `@config`-free theme duplication accepted (the lab would carry its own copy of the theme,
  ~3 KB), which is still a net win for members.
- **Saving**: **60.8 KB raw / 7.2 KB gz of render-blocking CSS on every one of the 52 shipped
  routes** (step 2), plus 5.1 KB raw / 0.7 KB gz (step 1); together 27.6% of the stylesheet. In
  the owner's units: every page a member opens gets its styles about 8 KB compressed sooner,
  and the stylesheet stops growing when he writes a doc.
- **Risk & gate**: low for (1); medium for (2) (a lab room could lose a utility if the second
  sheet's source scope misses a file, e.g. lab code importing a class from `src/components`,
  which is generated by the global sheet anyway). Gates: `npm run check` (the lab registry
  audit `scripts/qa/lab-audit.mjs` reads only the registry and page files, so a layout CSS
  import does not trip it); `npm run visual` (11 routes, no lab routes in ROUTES, so it proves
  the app side is untouched); a manual admin walk of three lab rooms; the CSS byte numbers above.
  The security pins do not touch globals.css.
- **Confidence**: high on the measurement (two independent methods agree: rule classification
  and the rebuilt-and-gzipped sheet); medium on the exact Tailwind incantation for the lab
  sheet, which is why the report gives a fallback.
- **Notes**: this answers audit 1's open question and the owner's fair challenge ("what are you
  gonna do with the info"): the info is 7.2 KB gz on every page, for a surface only he can see,
  and there is a one-file mechanism that keeps the lab deployed. `experimental.cssChunking:
  'graph'` is not the lever - there is a single CSS module (`globals.css`) so there is nothing
  for the graph algorithm to split; scoping the source is the only way. `inlineCss` is the
  wrong direction (see Not-findings). Related: 08 (the lab's other build costs).

### bundle-build-03 - Defer the guide's chapters and overlay: 15 KB raw on 39 member routes for a sheet that opens only when a page title is pressed
- **Where**: `src/components/guide/guide-layer.tsx:15-16` (static `import { CHAPTERS } from
  "./chapters"` and `import { GuideOverlay } from "./guide-overlay"`), mounted from
  `src/app/(main)/layout.tsx:167` (`<GuideLayer />`, "Renders nothing until somebody presses a
  page title"); `src/components/guide/chapters/index.tsx` (the repo's one internal barrel, six
  chapter components). Built result: production chunk `3hd4ups9q-ds3.js` (23.0 KB raw / 8.2 KB
  gz) on 39 routes, confirmed by the chapter prose in the chunk ("Everyone who has joined, and
  where they are now", "A group newsletter on a schedule").
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the analyzer's twin of that chunk (`1iq6ao7_hxnc2.js`, 23.1 KB on 39 routes)
  is: demo-bar 3.5 KB, guide-kit 2.9, chapters/catchups 2.6, chapters/collection 2.3,
  chapters/feed 1.9, konami-eggs 1.7, chapters/directory 1.2, guide-overlay 1.2,
  chapters/letters 1.1, chapters/birds 1.0, lib/guide-areas 0.8, install-prompt 0.6,
  guide-layer 0.6, content-column 0.5, posthog-identify 0.4, upload-shared 0.3, local-storage
  0.2, onboarding-local 0.2, chapters/index 0.1. The guide half (kit + six chapters + overlay =
  ~14.2 KB) is inert until `currentGuide()` returns an area. `GuideLayer` already gates render on
  `found && Chapter`; only the import is eager. `guide-areas.ts` (0.8 KB) must stay static -
  its own comment says the sidebar and the door import it as plain data.
- **What to do**: move `CHAPTERS` and `GuideOverlay` behind one lazy boundary. Create
  `src/components/guide/guide-body.tsx` (client) that takes `{ slug, title }`, imports the
  chapters barrel and the overlay, and renders `<GuideOverlay title><Chapter/></GuideOverlay>`.
  In `guide-layer.tsx`: `const GuideBody = dynamic(() => import("./guide-body").then(m =>
  m.GuideBody), { ssr: false })` (a client component, so `ssr: false` is legal and correct - the
  server always renders null here, the file says so) and render `<GuideBody .../>` only when
  `found`. Prefetch on intent, the way session 8's latch did for the composer's dialogs: in
  `guide-door.tsx` (the page-title control) add `onPointerEnter`/`onFocus` -> `void
  import("./guide-body")`, so the chunk is in cache before the press. The overlay "mounts shut
  and opens on the next frame" by design; with the prefetch the open is unchanged, and without it
  the fetch of a ~10 KB gz chunk lands well inside the sheet's 200 ms.
- **Saving**: ~14 KB raw / ~5 KB gz off the first load of 39 member routes (every (main)
  page); the demo-bar / konami / install-prompt / posthog-identify remainder of the chunk stays
  (see the DemoBar carry-over below - that half was measured and refuted in session 7).
- **Risk & gate**: low. Gates: press a page title on /feed and /collection in a production
  build and watch the sheet arrive and leave (entrance and exit both animate, the two things the
  overlay's comment says were measured); `npm run check`; `npm run visual`.
- **Confidence**: high. What would change my mind: if the guide door is meant to open on the
  very first frame for the demo's auto-offer - then keep the prefetch unconditional on mount for
  `IS_DEMO`, which is one line.
- **Notes**: this is the same shape as audit 1's finding 07 (statically importing a surface the
  server knows is conditional) and the tour half of that finding, which was done in phase 2 and
  carried the weight. `guide-layer.tsx` is the one file in my territory added since audit 1
  closed (`raw/files-added-since-audit1.txt`), so it was never audited for weight. The barrel
  `chapters/index.tsx` is fine as a barrel: it is the single import site for six siblings and
  is what makes the one-boundary deferral clean.

### bundle-build-04 - Turbopack merges duplicate modules across chunks: 68-156 KB of repeated module bytes per route, 23 byte-identical production chunk pairs, and the motion engine fetched twice on 45 routes
- **Where**: the built output, not a source file: 23 near-duplicate production chunk pairs
  (size within 2%, token Jaccard >= 0.96) totalling 305 KB of duplicated bytes on disk, e.g.
  `0o8o--shg75rg.js` (33.9 KB, eager on 45 routes) ~ `3310zq7p7go82.js` (33.9 KB, lazily
  referenced by all 100) at Jaccard 1.00; `ui/button.tsx` + `@base-ui/react` useButton /
  useRenderElement / mergeProps + `@floating-ui/utils` dom (~10 KB) present in two of the 14
  root chunks (`42rp5c5ri0wnd.js` 22.7 KB and `3a2yhi2ln2r_k.js` 14.7 KB, both on all 100
  routes); the base-ui Popover stack (PopoverStore/Trigger/Root/Positioner/Popup, 14.7 KB)
  re-merged into six different route-private chunks (`/directory`, `/profile/[id]`, `/welcome`,
  `/catchups/[catchupId]`, `/admin/people`, `/admin/content`); `image-viewer.tsx` + `pinch-zoom`
  (15.6 KB) as two distinct lazy chunks on /profile and on /feed; `comments-section.tsx`
  (13.3 KB) likewise. Config that governs it: `experimental.turbopackChunking` (not set;
  defaults `minChunkSize: 50000`, `maxChunkCountPerGroup: 40`, `maxMergeChunkSize: 200000`,
  `generateComponentChunks: false`, `requestCost: 200000`).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (an experiment with a
  measurement gate; no product change)
- **Evidence**: per route, summing the size of every module that appears in more than one of
  that route's chunks (analyzer space, eager and lazy together): /privacy 68.1 KB, /login 99.2,
  / 98.6, /about 98.6, /directory 99.5, /welcome 98.6, /catchups/[catchupId] 98.6, /feed 136.8,
  /collection 137.3, /profile/[id] 155.9. The ~98 KB baseline on a plain page is the same list
  everywhere: `button.tsx` x3, `floating-ui.utils.dom` x3, `framer-motion/animation/sequence/
  create` x3, `motion-dom` JSAnimation / spring / AsyncMotionValueAnimation x2, `next/link` x2,
  `next/shared/lib/utils` x2. Two mechanisms, both documented in `turbopackChunking.md`:
  merging small chunks up to `minChunkSize` inside each chunk group ("the trade-off being made
  is an improvement to performance on initial page loads at the cost of navigation performance"
  - the same module lands in several routes' merged chunks, so a member navigating /feed ->
  /profile -> /directory downloads the Popover stack three times), and async chunk groups: the
  LazyMotion feature group is created at the root layout, where the (main) shell's eager
  motion modules are not "available", so the engine is emitted again inside it.
- **What to do**: in order, each with a browser measurement. (a) Land 01 first and re-run the
  duplicate check (`node` one-liner: pairs of chunks within 2% size with Jaccard > 0.8) - the
  eager/lazy motion twin should shrink or vanish once the async group is computed from domMax's
  own graph. (b) Try `experimental.turbopackChunking: { generateComponentChunks: true }` in
  `next.config.ts`: the doc says each merged chunk also emits its component chunks so "chunks
  that were already loaded as part of a merged chunk will not be re-downloaded" on navigation -
  exactly the Popover / button / viewer case. It is experimental; measure a two-page navigation
  (/feed then /profile/[id] as a stranger) with `performance.getEntriesByType("resource")` on
  `next start` before and after, comparing total decoded JS for the pair. (c) If (b) is not
  ready, try `requestCost: 100000` (halves the chunker's bias toward merging) and measure the
  same pair plus a cold /feed first load, since the doc warns the trade is more requests. Keep
  whichever wins on the pair without losing on the cold load; otherwise revert and close this as
  a not-finding with the numbers attached.
- **Saving**: honestly ranged: 0 KB on a cold first paint of any single route (this is
  repeat-download weight), 30-100 KB raw per member session across navigations, and the 34 KB
  raw / 13 KB gz motion twin on 45 routes if 01 alone dissolves it.
- **Risk & gate**: medium (experimental flags; more requests on a cold load). Gates: the
  navigation measurement above, `npm run visual`, `npm run verify:crawl`.
- **Confidence**: high on the measurement (the Jaccard pairs are exact; the per-route sums come
  straight from the analyzer); medium on which knob pays, which is why it is written as an
  experiment with a revert condition rather than a prescription.
- **Notes**: I want to be clear that some duplication is the chunker doing its job - the doc
  explains why it merges. What made me write this up is the scale (a plain /privacy page holds
  68 KB of modules twice) and the fact that one of the twins is fetched on every page. Related:
  01, and audit 1's not-finding on the 110 KB `polyfill-nomodule` chunk, which is still
  correctly absent from every first load (modern browsers never fetch it).

### bundle-build-05 - Defer the base-ui Combobox behind `LocationPicker` on /welcome and /admin/people/[id]: 53 KB raw / 16 KB gz eager for a control on a later step or behind an edit
- **Where**: `src/components/onboarding/steps/register-step.tsx` (static `LocationPicker`
  import; the flow at `src/components/onboarding/onboarding-flow.tsx:193-203` switches steps by
  state, `step === "register" && <RegisterStep/>`), `src/components/onboarding/steps/photo-
  step.tsx` (static `AvatarCropDialog` and `AttachImageDialog`), `src/components/admin/people/
  person-detail.tsx` (static `LocationPicker`); built result: production chunk
  `0_mmjokhy1byo.js` (53.1 KB raw / 16.0 KB gz: `@base-ui/react` combobox 45.4 KB +
  `location-picker.tsx` 5.8 KB) eager on exactly `/welcome`, `/admin/people/[id]` and
  `/lab/location-picker`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/route-bundle-stats.json` lists the chunk in the first load of those three
  routes only; /welcome is 1,190 KB raw, the fourth-heaviest shipped route, and 126 KB of that
  is route-specific: this chunk 53.1 KB, the onboarding steps chunk 32.9 KB (register-step 3.6,
  house-chain-editor 3.6, avatar-crop-dialog 3.4, onboarding-flow 2.6, attach-image-dialog 2.6,
  houses-step 2.4, photo-step 2.1), the houses-chain + Popover chunk 29.5 KB. The letterhead
  already defers this exact picker (`src/components/profile/letterhead-profile.tsx:128`,
  session 8's `d68d923`, "LocationPicker ... each through next/dynamic behind the gate each
  already had"), so the pattern, the loading state and the verification are known.
- **What to do**: in `register-step.tsx` replace the static import with
  `const LocationPicker = dynamic(() => import("@/components/common/location-picker").then(m =>
  m.LocationPicker))` - keep SSR on (do not pass `ssr: false`): session 8's lesson is that
  "anything visible at rest keeps its server render", and the register step IS the initial step
  for a member whose `initialStep` is not "welcome". In `onboarding-flow.tsx` add a mount effect
  `void import("@/components/common/location-picker")` so the chunk is warm before the welcome
  step is dismissed. Same for `AvatarCropDialog` and `AttachImageDialog` in `photo-step.tsx`
  (both open on a click, so `ssr: false` is fine there; prefetch when the houses step mounts).
  In `person-detail.tsx`, the picker sits behind the admin's edit affordance; defer it the same
  way with a prefetch on the edit control's hover. Measure at the browser (the session-7 method),
  not with `route-js.mjs`.
- **Saving**: ~53-60 KB raw / ~16-18 KB gz off /welcome's first load (every new member's first
  page), ~53 KB off /admin/people/[id] (the owner's own most-used admin page).
- **Risk & gate**: low-medium: the city search must still open instantly on the register step
  (the prefetch covers it) and must not pop in after paint when register is the initial step
  (SSR kept). Gates: walk the whole onboarding on a production build as Jerry Maguire (never a
  real alumnus - it writes presence telemetry), including the city search, the house pill, the
  photo dialog and the crop; `npm run check`; `npm run visual` is blind here (/welcome is not in
  ROUTES), so screenshot both viewports by hand.
- **Confidence**: high.
- **Notes**: `src/components/onboarding/types.ts` also imports from `location-picker` - check
  whether that is a type-only import (it should become `import type`, otherwise it re-anchors
  the chunk). Flagged to the onboarding and admin territory agents under "For other lenses".

### bundle-build-06 - Phosphor icons ship six weights per glyph: 23 icons cost 57 KB of defs, ~2/3 of it paths for weights the app never draws
- **Where**: 14 non-lab import sites of `@phosphor-icons/react` (`grep -rl 'from "@phosphor-
  icons/react"' src | grep -v app/lab`), 23 distinct icons; heaviest defs in the build:
  `Sparkle.es.js` 4.6 KB, `UsersThree` 4.5, `Tree` 4.5 (the sidebar's Support glyph, on 39
  routes), `Bird` 3.8, `Images` 3.6, `Buildings` 3.5, `Heart` 3.3, `ShareFat` 3.3, `Feather` 3.2,
  `Bell` 3.0. Per route the analyzer totals `@phosphor-icons/react` at 25.7 KB on /feed, 21.8 on
  /profile, 21.4 on /catchups/[catchupId], 20.0 on /lab/profiles, 8.5 on the admin pages.
- **Phase**: library
- **Tier**: T3     **Class**: structural     **Decides**: autonomous, with a visual gate (the
  paths are copied verbatim, so the rendered glyphs are byte-identical; but icons are brand, so
  screenshots before and after)
- **Evidence**: each `defs/<Icon>.es.js` is a map of all six weights (thin, light, regular,
  bold, fill, duotone) to their path data; `optimizePackageImports` already gives one module per
  icon (confirmed: `defs/Feather.es.js` and friends are separate analyzer entries, which is
  what OPERATIONS.md section 5 says "has never been confirmed by anything but reasoning"), but
  it cannot split a weight out of a def. The non-lab source renders phosphor at `weight=`
  duotone (6 sites), bold (9), regular (5), fill (3): at most four of six weights per icon, and
  any one icon typically at one. Lucide, by contrast, is 124 icons at 0.49 KB each (60.9 KB
  total across 110 import sites) - a fifth of the per-icon cost - because a lucide icon is one
  drawing.
- **What to do**: the cheapest honest version: for each of the 23 icons, copy only the used
  weight's path strings from `node_modules/@phosphor-icons/core/assets/<weight>/<icon>.svg` into
  one local module `src/components/common/phosphor-glyphs.tsx` exporting small components with
  the same props the call sites use (`size`, `weight` fixed, `className`), rendered through one
  shared `<svg viewBox="0 0 256 256">` wrapper; keep the design rule (Lucide for chrome,
  Phosphor duotone for decorative) exactly as it is - only the packaging changes. Then remove the
  14 imports and let dependency-diet decide whether `@phosphor-icons/react` stays for the lab.
  Screenshot every surface that shows one (feed card, letterhead, sidebar, catch-up round,
  collection tiles) at both viewports before and after.
- **Saving**: ~35-40 KB raw of icon code across the app; per heavy route ~12-16 KB raw /
  ~4-5 KB gz off first load (/feed, /profile, /catchups/*, /collection); ~3 KB off every (main)
  page for the sidebar's `Tree`.
- **Risk & gate**: medium (any drift in a duotone's two-layer opacity would be visible). Gates:
  `npm run visual` (feed, directory, letters, catchups, collection, support, birds are all in
  ROUTES), the hand screenshots above, `npm run check`.
- **Confidence**: medium. What would change my mind: if the owner wants to keep the freedom to
  switch a glyph's weight in a JSX prop without touching a glyph file - then leave it and record
  this as the price of that freedom (~5 KB gz on the heavy routes).
- **Notes**: I considered and rejected replacing phosphor with lucide equivalents: it changes the
  look, and DESIGN-SYSTEM.md assigns phosphor duotone a role. I also rejected per-icon dynamic
  imports (request overhead). This is the same class of finding as audit 1's bird-sprite item
  (data packaged as code), at a fifth of the size.

### bundle-build-07 - Build time, explained: the 20.3 s compile is cold, TypeScript is owner-declined, static generation is trivial, and excluding the lab would honestly save ~8-11 s cold / ~4-6 s warm
- **Where**: `raw/build.txt` ("Compiled successfully in 20.3s", "Finished TypeScript in 14.6s",
  "Generating static pages (105/105) in 682ms", "Completed runAfterProductionCompile in 631ms",
  wall 42.3 s); `raw/build-setup.txt` (a fresh detached worktree with node_modules hard-linked
  in, load average 10.15 at start); `.scratch/audit2-build/.next/cache/turbopack` (618 MB,
  written by this very build); `tsconfig.json` (`include: ["**/*.ts", "**/*.tsx", ...]`);
  `.next/app-path-routes-manifest.json` (121 entries: 14 API, 107 pages, 48 of them lab);
  `.next/prerender-manifest.json` (7 static routes: `_global-error` and six metadata files).
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: (a) Compile. `turbopackFileSystemCacheForBuild` is on by default since 16.3 and
  the doc says builds "only get faster when that directory is restored before each build"; the
  scratch build started with no `.next/cache` and finished with 618 MB of it, so 20.3 s is the
  cold figure. Vercel restores `.next/cache` between deploys; audit 1 measured a warm analyze
  compile at 4.1 s. The lab is 48 of 100 client chunk groups and 34,426 of ~100,000 TypeScript
  lines; compile work scales with modules, so the lab's cold share is plausibly 20-30% (4-6 s)
  and its warm share about a second. (b) TypeScript 14.6 s: the owner decided in session 7 that
  the deploy keeps re-checking types ("bundle-build-05 is closed as owner-declined"). The lab's
  share of the program is ~30-35% of lines, and unlike `src/generated` (audit 1's re-refuted
  row: excluded roots are pulled back in by imports), nothing shipped imports the lab, so a
  build-only tsconfig that excludes `src/app/lab/**` WOULD drop those files from the program.
  Next reads one tsconfig (`typescript.tsconfigPath` in `next.config.ts` can point at a
  `tsconfig.build.json` that extends the main one); `npm run check` would keep the full one.
  Estimated 3-5 s of the 14.6, at the cost that a lab type error reaches Vercel unchecked until
  `check.yml` catches it minutes later - the exact asymmetry the owner declined to accept for the
  app itself. I do not recommend it. (c) Static generation: 105 = every non-API route the build
  walks (107 in the manifest less the two error boundaries); every page is dynamic (`ƒ`) because
  the root layout reads the theme cookie and (main) awaits `auth()`, so only 7 metadata routes
  produce static output. The phase is 0.68 s; the lab's 48 routes are ~0.3 s of it. (d) The
  Sentry hook is 0.6 s (see 09). (e) What excluding the lab from the production build would
  actually buy: ~4-6 s cold compile (~1 s warm), ~3-5 s TypeScript, ~0.3 s static, the 60.8 KB
  of CSS in 02, and a lighter deploy artifact (about 1.2 MB of lab-only chunks and the type
  room's 2.95 MB of fonts). Total: ~8-11 s on a cold build, ~4-6 s on a warm Vercel build. What
  it would cost: the mechanism (a `pageExtensions` gate or moving the lab out of `src/app`),
  updates to `scripts/qa/lab-audit.mjs` and the registry check, and the loss of the browsable
  design history that CLAUDE.md treats as a feature.
- **What to do**: nothing autonomous. Present as one owner decision (below): keep the lab
  deployed and take the CSS via 02, which is the only member-facing cost; do not chase the
  TypeScript seconds. If he wants the build seconds anyway, the honest first step is to measure
  a warm build on Vercel's own logs (the deploy log prints the same three phase timings) before
  deciding anything, because the 20.3 s here overstates what a deploy pays.
- **Saving**: 0 s autonomous; ~4-6 s warm / ~8-11 s cold per build if the lab left the build
  (owner); ~3-5 s if only its TypeScript left (owner, not recommended).
- **Risk & gate**: high for lab exclusion (touches the check gate, the registry, the deploy
  story); gate would be `npm run check` and `npm run verify:crawl`.
- **Confidence**: high on the phase numbers and on "cold"; medium on the lab-share estimates
  (I could not run a build, per the rules, so they are proportional guesses from line and
  route counts, stated as such).
- **Notes**: the previous-session progress note (`progress.md:3230`, "TypeScript 19.4 -> 14.5 s;
  the wall clock is not comparable at load 36") already warns that these wall-clock numbers
  move with machine load; the scratch build ran at load 10.

### bundle-build-08 - The (main) shell tier, attributed: 434 KB raw / 147 KB gz on 39-46 routes, and what in it is not chrome
- **Where**: the 16 production chunks present on 39-46 of the 52 shipped routes (the (main)
  layout's client graph): `0jlq6l4f8yx9k.js` 59.1 KB (base-ui FloatingFocusManager 9.6,
  useDismiss 7.8, tabbable 5.4, reselect 4.9, useScrollLock 3.7, composite 3.5, FloatingPortal
  2.5 - on 45 routes incl. auth), `42nji2hh4aeuo.js` 46.3 KB (bird-avatar-v2 43.4 + bird-adjust
  2.1 + lib/avatar, 39 routes), `30j3xf_e9guai.js` 37.1 KB (base-ui Menu 35.5 + dropdown-menu
  1.6), `1pzph7teog9_8.js` 34.3 KB (sidebar 10.2, phosphor Tree 4.1, sheet 2.7, next-auth/react
  2.4, sidebar-hoopoe 2.0, peaks-mark 2.0, admin-nav 1.6, identity-row 1.1, logo easter egg 1.1),
  `0mmkcfgfeodk3.js` 34.2 KB (floating-ui core 11.6 + dom 8.4 + useAnchorPositioning 5.6 +
  react-dom 2.9, 44 routes), `0o8o--shg75rg.js` 33.9 KB (motion-dom animation engine, 45
  routes), `0qa8au6zlhx7_.js` 28.0 KB (hoopoe.tsx, 46 routes), `3lg6rokqb517_.js` 24.9 KB
  (base-ui popup store / useButton / useRole, 45 routes), `2ubf39t7y-ouz.js` 24.9 KB (next/image
  component 3.5 + get-img-props 4.8 + image-loader 1.1 + head 1.7 + link 3.5 + utils 2.3 +
  bird-avatar wrapper 1.1), `3g_schw6o0b02.js` 23.8 KB (auto-animate 7.7 + useListNavigation 7.5
  + useTypeahead 2.0 + CompositeList 3.0), `3hd4ups9q-ds3.js` 23.0 KB (guide + demo-bar +
  konami + install-prompt + posthog-identify, finding 03), `2_0scenai75_p.js` 22.5 KB
  (notification-bell 6.7 + the imperative `animate()`/sequence API 8.3 + lucide icons 2.8 +
  separator + guide-open), `0xndweaykjp80.js` 22.5 KB (base-ui hover interactions 11.8 +
  usePopupViewport 2.8 + safePolygon 2.6 + usePopupAutoResize 2.4 + dialog root/store, 44
  routes), `3-fo1nn435yes.js` 18.6 KB (verify-email-banner 3.1 + button 2.6 + the base-ui Dialog
  stack 11.4), `2qidg9di5lejj.js` 1.0 KB ((main)/error.tsx), `26rz0vjjbjgec.js` 0.4 KB
  ((main)/template.tsx).
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner (this is the answer to "what is
  the floor", with the levers already itemised elsewhere)
- **Evidence**: every pairing above was made by size and then confirmed by a string in the
  production chunk (sidebar's "Sign out", the bell's notification strings, the hoopoe's path,
  the guide prose, `autoAnimate`, `data-sonner`, `twMerge`) or by the analyzer's own per-route
  frequency matching the production count exactly (59.0 KB on 45, 46.3 on 39, 37.1 on 39, 34.3
  on 39, 34.2 on 44, 24.9 on 45, 23.8 on 39/40, 23.1 on 39, 22.6 on 39, 22.3 on 44, 18.6 on 39,
  1.0 on 39, 0.4 on 39). Totals: 434.4 KB raw / 147.4 KB gz (gzip level 6 over the real files).
  Package rollup of everything a (main) page can hydrate (eager + lazy): next 578 KB,
  posthog-js 245, motion-dom 176, app source 173, @base-ui/react 153, framer-motion 117, sonner
  33, tailwind-merge 25.5, @base-ui/utils 20, floating-ui 30, lucide 11.5, auto-animate 8,
  phosphor 5 (shell only), next-themes 3.2, next-auth 3.1.
- **What to do**: nothing as a unit. The deferrable slices are 03 (guide, ~14 KB) and, if the
  owner ever takes the sprite decision, the birds (46 KB, carried from audit 1). Everything else
  is chrome that is visible or armed at paint: the sidebar and its menu, the bell, the perch
  hoopoe (mascot.md), the dialog/popover/menu material (one material, DESIGN-SYSTEM section 3),
  next/image for photo avatars, auto-animate (mandatory on lists, section 7).
- **Saving**: 0 on its own; it is the denominator for every other finding.
- **Risk & gate**: n/a.
- **Confidence**: high.
- **Notes**: audit 1 estimated the "framework + chrome floor for this app's design" at 950-1,000
  KB raw; measured today it is 1,055 KB (621 + 434), and /admin, /guide, /birds sit at 1,064 KB
  because they add ~9 KB of their own. So the floor is where audit 1 said it would be, and the
  remaining per-route weight above it is genuinely per-route (see the top-8 table in Metrics).

### bundle-build-09 - Sentry's `runAfterProductionCompile` (0.6 s): what it does, and the one-line trim that is safe
- **Where**: `next.config.ts` (the `withSentryConfig(nextConfig, {...})` tail; `sourcemaps:
  { disable: !process.env.SENTRY_AUTH_TOKEN }`, `release: { create: false }`);
  `node_modules/@sentry/nextjs/build/cjs/config/handleRunAfterProductionCompile.js:8-56`;
  `node_modules/@sentry/bundler-plugin-core/dist/cjs/index.js:5127` (`telemetry:
  userOptions.telemetry ?? true`) and `:5387` (`if (telemetry === false) return false`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: with no auth token the hook still (1) `loadModule`s the bundler plugin core,
  (2) `createSentryBuildPluginManager`, (3) `emitBundlerPluginExecutionSignal()` - Sentry's own
  usage telemetry, sent over the network unless `telemetry: false`, (4) `createRelease()` (a
  no-op without a token), (5) skips `injectDebugIds` because `sourcemaps.disable` is true, (6)
  `uploadSourcemaps` (no-op), (7) `deleteArtifacts`. The 0.6 s is module loading plus the
  telemetry round trip. Audit 1's fix session re-refuted the "drop the wrapper" row on
  magnitude (612 ms-1.6 s across six builds, mean ~1 s, against a wrapper that strips debug
  logging from the server bundle and carries two owner decisions in its comments); I agree and
  do not reopen it.
- **What to do**: add `telemetry: false,` to the `withSentryConfig` options with a one-line
  comment ("Sentry's usage telemetry from the build plugin, not error reporting; off so a deploy
  makes no call Sentry does not need"). Nothing else.
- **Saving**: ~0.2-0.5 s per build (the network call and its flush; unmeasured, bounded by the
  0.6 s total). A footnote, listed only because the charter asked what the hook is.
- **Risk & gate**: none to the app; error reporting is `src/instrumentation.ts`, untouched.
  Gate: the next build log still says "Completed runAfterProductionCompile".
- **Confidence**: high on what the hook does (read); low on the exact seconds saved.
- **Notes**: keep every existing comment in that block; two of them are owner decisions (no
  token on the laptop, no release mail).

### bundle-build-10 - Dead CSS in globals.css: the `.hoopoe .wing` login-delight block has no user
- **Where**: `src/app/globals.css:673-682` (`.hoopoe .wing { transform-box ... }`,
  `.hoopoe:not(.covered) .wing-l`, `.wing-r`, `.hoopoe .eye`, `.hoopoe.covered .eye`).
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -rn "wing-l\|wing-r\|className=\"wing" src` returns nothing outside the
  lab, and inside the lab `src/app/lab/_hoopoe.tsx` drives a `pose === "covered"` state on SVG
  attributes, not these classes; the shipped login rig is the motion puppet (`hoopoe.tsx`,
  `PARTS.leftWing` / `rightWing` animated through `animate()`), which the comment on line 673
  ("login password delight: wings open like curtains") predates. Every other hand-written class
  in the file is used: `state-layer` 65 non-lab files, `card-elevated` 55, `skeleton-warm` 35,
  `dotsep` 6, `glass` 13, `valley-tree` 4, `deeplink-flash` 3, `bell-trigger` 2,
  `has-scrubber` 2; the `--space-*`, `--z-*`, `--ease-*`, `--radius-input` tokens 73/5/6/22.
- **What to do**: delete lines 673-682 after one more grep for `wing` and `covered` as class
  names across `src/` and `e2e/`.
- **Saving**: ~10 lines of source, ~350 bytes of compiled CSS on every page.
- **Risk & gate**: none found. Gate: `npm run visual` (login is a baseline route and shows the
  hoopoe).
- **Confidence**: high. What would change my mind: a class composed at runtime (`"wing-" +
  side`); I found no such string.
- **Notes**: the rest of globals.css is the product - the surface-ladder measurements, the
  state-layer reasoning, the dotsep arithmetic are exactly the "why" comments the brief says to
  keep, and I quote none of them as bloat.

## Owner decisions

1. **The lab's share of the stylesheet, now measured** (bundle-build-02). Every page a member
   opens downloads about 233 KB of styles (33.5 KB compressed), and 61 KB of that (7.2 KB
   compressed, 27%) exists only for the /lab rooms, which only you can open. A further 5 KB is
   there because Tailwind reads class names out of the docs folder and progress.md. Both can go
   without touching a single room: one line scopes the scan to `src/`, and one small extra
   stylesheet loaded only under /lab keeps the rooms styled. Recommendation: yes to both; the
   first is a one-line change with no risk, the second is a half-day with screenshots of three
   rooms before and after. This closes the question you asked in session 7 with a number.
2. **The lab in the production build** (bundle-build-07). Keeping it deployed costs members
   nothing in JavaScript (re-proven chunk by chunk) and costs the build roughly 4-6 seconds on
   a normal warm deploy, more on a cold one. Recommendation: keep it deployed, take the CSS win
   above, and do not chase the seconds - especially not by weakening the type check on deploys,
   which you already decided to keep.
3. **The bird glyphs as one cached file** (carried from audit 1, unchanged). Still 46 KB of code
   (13.5 KB compressed) on every member page. Nothing has been done; no sprite exists in
   `public/`. Recommendation unchanged: worth a quiet week, not urgent, your eyes on before and
   after.
4. **The directory map's instant appearance** (carried from audit 1, unchanged). Deferring the
   map (~76 KB) would put a shimmer where the site's showpiece is. Still your call; still
   declined by default.
5. **PostHog's size** (carried from audit 1, resolved as "keep"). It is off the critical path
   now, but it remains the single largest thing a member downloads (79 KB compressed on every
   page, a couple of seconds after it loads). You chose full autocapture over a lighter client;
   this report records that as settled and proposes nothing.
6. **Phosphor icons packaged by weight** (bundle-build-06). Identical drawings, a fifth of the
   bytes, but it touches icons. Recommendation: do it with before/after screenshots; if you
   would rather keep the freedom to change an icon's weight in one prop, decline and the cost is
   ~5 KB compressed on the heavy pages.

## Not-findings

- **PostHog is off the critical path** - confirmed in the built chunks: `24740q0lmcv1n.js`
  (244.7 KB raw / 79.3 KB gz) appears in the `firstLoadChunkPaths` of 0 routes and is referenced
  lazily by all 100; `posthog-client.ts` schedules `import("posthog-js")` on
  `requestIdleCallback` with a 2 s ceiling and re-establishes the M42 identify ordering by
  promise. Nothing to do.
- **The lab leaks 0 bytes of JavaScript into shipped routes** - re-proven: every lab-sourced
  module in the analyzer sits in a chunk whose route count is 1-2 lab routes (`_findings.ts`
  79.7 KB on /lab/everything, the profile variants 138 KB on /lab/profiles, the atlas 106 KB on
  /lab/directory). The two size-matches that suggested otherwise (`1wzeccabdjyp3.js` ~ the lab
  landings chunk) were false: the production chunk is Next's segment-cache/router (confirmed by
  `segment-cache` strings), and the lab twin is 127.2 KB on /lab/landings only.
- **No server-only module is reachable from a client chunk.** Grep of all 224 production JS
  chunks: `PrismaClient` 0, `@prisma/client` 0, `sharp` 0, `@aws-sdk` 0, `S3Client` 0, `bcrypt`
  0, `nodemailer` 0, `pg-pool` 0, `@sentry` 0, `DATABASE_URL` 0, `process.env` 0, `AUTH_SECRET`
  0. Four string hits, all innocuous: `prisma` once, inside the text of an audit finding quoted
  by `/lab/everything`'s `_findings.ts`; `resend` in 12 chunks as the `resendVerification` action
  name; `Sentry` once, inside posthog-js's own `SentryIntegration` class; `razorpay` once, the
  support page's checkout client. The boundary held.
- **`optimizePackageImports` coverage is complete.** `lucide-react` is on Next's default list of
  75 (read from `server/config.js`); `@phosphor-icons/react` is configured and the analyzer
  proves it works (per-icon `defs/*.es.js` modules) - this is the confirmation OPERATIONS.md
  section 5 says never existed, so that sentence is now stale (docs lens). `motion` is
  configured and harmless but irrelevant to finding 01 (a dynamic import is not a barrel
  import). `@base-ui/react` is imported by subpath (no barrel); `d3-geo`, `d3-selection`,
  `d3-zoom` are per-package ESM; `sonner`, `tailwind-merge`, `posthog-js`, `next-themes`,
  `@formkit/auto-animate` are single-module. Nothing to add.
- **The 20 biggest "use client" files all need the boundary at file level.** Probe (hooks /
  handlers / browser-API refs): letterhead-profile 27/27/0, hoopoe 18/0/0 (all
  `useAnimate`-style refs), create-post-form 29/20/7, person-detail 11/23/0, collection-client
  67/6/17, contribute-room 25/12/10, directory-client 21/14/1, people-panel 11/20/3,
  comments-section 19/6/0, signup-form 24/15/8, review-room 15/11/3, alumni-map 19/12/4,
  post-card 17/9/0, sidebar 4/5/1 (usePathname, useState, signOut - it is the nav),
  perching-birds 8/3/10, ambient-leaves 11/11/21, image-viewer 21/18/22, dark-gauntlet 10/21/2,
  houses-chain 5/3/1 (rendered inside client parents; a split would move nothing across the
  boundary), content-list 7/8/0. Same verdict as audit 1; the remaining opportunities are
  behind-interaction splits (03, 05), not boundary moves.
- **`next/dynamic` coverage of the named heavy pieces**: crop dialog - lazy in the letterhead,
  static only in `photo-step.tsx` (05); image viewer - lazy at all five sites with the session-8
  latch; poll creator and mention dropdown - lazy with prefetch on composer focus; the map -
  static by owner decision (carry-over); the letters editor (`LetterDesk`) - it IS the
  /letters/new page, visible at rest, keep; admin analytics - hand-rolled server-rendered panels
  (`heatmap.tsx`, `cohort.tsx`, `stat.tsx`, `presence.tsx`), no chart library, and the route
  weighs exactly the shell floor (1,064 KB) - nothing to defer; the guide - static (03);
  `KeeperSettingsDialog` / `LibraryPickerDialog` - still static, and session 8's reason still
  holds (each renders its own trigger); dark-gauntlet - its own route; `hoopoe-warmup.tsx`
  still statically imports the puppet, but it is only mounted on pages that already ship it.
- **The hoopoe is eager on 46 of 52 shipped routes (28 KB raw / 7.7 KB gz)** - by design: the
  sidebar perch on every (main) page (mascot.md), the rig on login/signup/verify at first paint.
  The six without it are the three policy pages, `/_not-found`, `/catchups/join` and one more
  public page. Audit 1's not-found chain fix holds: /privacy is 630 KB and carries no puppet.
- **Fonts are correct as shipped.** Two families via `next/font/google`, `subsets: ["latin"]`,
  2 + 4 static weights, self-hosted: 9 woff2 files (222 KB in the build, of which the browser
  fetches only the unicode-range files a page needs; two are preloaded), one 9.4 KB font CSS
  module (1.1 KB gz) on every page. No `@font-face` in globals.css, no external font request.
  The lab type room's `_fonts.ts` loads nine families with italics and axes (72 woff2 files,
  2.95 MB in `static/media`, a 23.7 KB CSS module) and the craft room a third instantiation of
  the app's two faces with true italics (18 files, 441 KB): both are referenced only from their
  one route's CSS, so **they ship to nobody but the admin opening that room**. They do ride in
  every deploy artifact (~3.4 MB), which is the lab-in-the-build question (07), not a member
  cost. The type room's own measured verdict (four variable files, +18.6 KB, real italics,
  "zero design risk") is a parked design decision the room exists to present; not bloat.
- **`inlineCss`** would be wrong here: with a 33.5 KB gz stylesheet, inlining puts 33 KB into
  every HTML response for a logged-in app whose members return daily; the doc's own trade-off
  says skip. Recorded so nobody proposes it.
- **Every page is dynamic (`ƒ`), no static HTML exists** - by design: the root layout reads the
  `rv-theme` cookie per request (C-119, no theme flash) and (main) awaits `auth()`. It means the
  policy pages and the landing are rendered per request rather than served from the CDN; at this
  site's traffic that is not a cost worth a finding, and changing it would trade the no-flash
  theme for it. Noted for completeness.
- **The 110 KB `polyfill-nomodule` chunk** (`0cz1d0mv5g_q7.js`, the one chunk whose name is
  identical in both builds) is in 0 routes' first load; `nomodule` only. Still not a target.
- **The (main) layout's `DemoBar` / `VerifyEmailBanner` static imports** (3.5 KB + 3.1 KB, in
  the chunks of finding 03 and 08): audit 1's fix session tried the split, measured identical
  bytes before and after (a Server Component cannot `ssr: false` and Turbopack did not split
  it), and reverted. I re-checked the current build: both modules are still in 39-route chunks,
  as expected. Not reopened; a client-side wrapper could split it, for 6.6 KB, and it is not
  worth the indirection the session rejected.
- **Comment text in client chunks**: 19.4 KB across 16 chunks, but every byte is inside a
  template-literal `<style>` string in lab rooms (`/* Every SpringPress in these rooms carries
  dl-press...`) - minification cannot strip a string. Lab-only; a note for the lab lens.
- **`tw-animate-css`** (audit 1 flagged it in globals.css) is gone; globals.css imports only
  `tailwindcss` and `shadcn/tailwind.css` (1.7 KB: two accordion keyframes and the data-state
  variants). Fine.

## Audit-1 carry-overs in this territory

- bundle-build-01 (posthog defer): **done** (`b8010bc`), confirmed off the critical path above.
- bundle-build-02 (LazyMotion + `m`): **done** (`8314f24`), holds; the LazyMotion core is 49.1 KB
  raw / 27.6 KB gz in the root set, matching session 7's "49 KB, not 15-30"; the barrel import
  left behind is this report's 01.
- bundle-build-03 step 1 (atlas fetched): **done** (`b899d1a`) for the shipped map; the lab copy
  still compiles the JSON (lab lens). Step 2 (dynamic map): **owner-declined, unchanged**.
- bundle-build-04 (404 bird): **done** (`36288fa` + the `one-hoopoe-guard` move); /privacy 630 KB
  carries no puppet.
- bundle-build-05 (TypeScript on deploy): **owner-declined in session 7; unchanged; not
  reopened** (07 explains the lab's share for completeness only).
- bundle-build-05c / lib-core-config-01 (tsconfig exclude of `src/generated`): **re-refuted with
  measurement; not reopened.**
- bundle-build-06 (Sentry hook): **re-refuted on magnitude; not reopened**; 09 is a one-line
  telemetry footnote, not the wrapper.
- bundle-build-07 (tour / DemoBar / verify banner): tour half **done** (phase 2); DemoBar/banner
  half **tried, measured, reverted; not reopened**.
- bundle-build-08 (lab CSS share): **was unmeasured by owner choice; now measured** - 02.
- bundle-build-09 (lab in prod): **owner decision, still open**; 07 restates it with the cold/warm
  nuance and the CSS number.
- bundle-build-10 (bird sprite): **open, untouched** (no sprite commit, nothing in `public/`).
- bundle-build-11 (dialog deferral): **done** (`a6be05b`, `d68d923`) with the latch; the two
  catch-ups dialogs skipped with reason; unchanged.
- bundle-build-12 (feed photo sizing): **done** (`b87b75e`, `b2216d5`); session 7's "if a future
  session wants one number to care about it is image bytes" still stands and is outside this
  lens's JavaScript arithmetic.
- Landing showcase family: **still switched off** (`SHOW_SHOWCASE` comment in `src/app/page.tsx`),
  knip lists five files; `showcase-shot.tsx`, `perching-birds.tsx` and `ambient-leaves.tsx` are
  reachable only from `showcase.tsx` and two lab landings, so they cost shipped pages nothing.
- Vercel Analytics vs PostHog: **resolved** (Vercel Analytics removed, `bd7da7d`).

## For other lenses

- landing / design lens: `src/components/landing/showcase-shot.tsx:5` imports
  `useReducedMotion` and `useScroll` from `motion/react`; DESIGN-SYSTEM section 7 says never gate
  motion on the OS setting. It is in the switched-off showcase family, so it ships nowhere, but
  it is the one file in `src/` that contradicts the rule.
- lab lens: `/lab/everything` ships `_findings.ts` (79.7 KB) as a client module - 86 KB of audit
  prose in a chunk; `/lab/directory` still compiles `world-atlas/countries-110m.json` (106.5 KB)
  into its 198 KB chunk (the shipped map fetches it from `/geo/`); the 30 lab files still on
  `motion.*` make the 59 KB domMax bundle eager on 15 lab routes (by design per the
  motion-features comment); the type room's fonts are 2.95 MB of the deploy artifact.
- dependency-diet lens: packages by weight per shipped route (analyzer, eager + lazy): `next`
  578 KB, `posthog-js` 245 (lazy), `motion-dom` + `framer-motion` 294 (of which ~90 is barrel
  fallout, finding 01), `@base-ui/react` 150-260 depending on route, `sonner` 33.4,
  `tailwind-merge` 25.5, `@phosphor-icons/react` 20-26 on the heavy routes (23 icons, 06),
  `lucide-react` 11-23 (124 icons at 0.49 KB), `@formkit/auto-animate` 8, the d3 stack 66 on
  /directory, `world-atlas` 0 on shipped routes. `shadcn` and `pg` sit in devDependencies;
  `globals.css` imports `shadcn/dist/tailwind.css` at build time, so `shadcn` is a build
  dependency in dev clothing (fine on Vercel, which installs devDependencies; worth a comment).
- docs lens: OPERATIONS.md section 5's "The optimizePackageImports bet on @phosphor-icons/react
  has never been confirmed by anything but reasoning" is now false (confirmed above; the
  analyzer method in this report's header is how). `next.config.ts`'s own closing comment says
  the same thing and could cite this.
- onboarding lens: `photo-step.tsx` static `AvatarCropDialog` / `AttachImageDialog`,
  `register-step.tsx` static `LocationPicker`, `onboarding/types.ts` imports from
  `location-picker` (type-only?) - finding 05.
- admin lens: `person-detail.tsx` static `LocationPicker` - finding 05.
- guide lens (fresh-code agent): `guide-layer.tsx` - finding 03; the chapters barrel is fine.
- messages lens: `message-composer.tsx` and `attach-image-dialog.tsx` appear in a 24.9 KB chunk
  I first matched to the shell tier by size; on confirmation that production chunk is the
  next/image + link chunk, so the composer is NOT on every page. No action; recorded so the size
  match is not repeated.

## Metrics

- **Floor of a member page**: 14 root chunks on all 100 routes = **621.1 KB raw / 192.6 KB gz**;
  framework ~445 KB (react-dom-client 196.0, Next segment-cache + router reducers 125.6, react +
  react-dom + navigation 30.4, RSC client 26.8, layout-router 14.6, error boundaries 12.6,
  Turbopack runtime 10.7, polyfill-module 1.5, misc); non-framework ~176 KB (LazyMotion core
  49.1, sonner 33.4 + `ui/sonner` 1.1 + `motion.tsx` 1.2, tailwind-merge 25.5 + clsx 0.4 +
  `lib/utils` 2.5, `ui/button` + base-ui button chain + floating-ui utils + cva ~12 KB in each
  of two chunks, next-themes 3.2, mascot-flight-layer 4.0 + hoopoe-kit 3.1 + mascot-flight 0.6 +
  use-hoopoe 0.9 + one-hoopoe-guard 0.3, posthog-client 0.8 + provider 0.2, focus-modality 0.5,
  not-found 4.8, error.tsx 0.6, next/link 3.3). Plus the (main) shell tier (16 chunks, 434.4 KB
  raw / 147.4 KB gz, finding 08) = **1,055 KB raw / ~340 KB gz of JavaScript** before page
  content, plus the stylesheet (232.8 KB raw / 33.5 KB gz) and the font CSS (9.4 KB / 1.1 KB gz)
  and two preloaded woff2 (62.6 KB). Public pages (policies) stop at the root set: 630 KB raw.
- **Top-8 shipped routes, route-specific weight above the 1,064 KB floor** (production first
  load; analyzer composition): /profile/[id] 1,258 (+194: post-card chunk 45.1 for the author
  feed, letterhead 45.0, pen/get-in-touch/love/segmented 37.9, houses-chain + Popover 23.7,
  field 18.0, image-viewer/comments/house-picker lazy); /directory 1,231 (+167: d3 stack 66.4,
  filters 30.8, alumni-map + directory-client 30.1, Popover 16.9); /feed 1,225 (+161: post-card
  57.1, post-feed + search-pill + photo-aim 37.9, composer 23.8, field 18.0; viewer/comments/
  poll/mention/attach all lazy); /welcome 1,190 (+126: Combobox + picker 53.1, onboarding steps
  32.9, houses-chain + Popover 29.5 - finding 05); /catchups/[catchupId] 1,181 (+117: round
  47.2, home shell 43.4, field 18.0, Popover 16.6); /admin/content 1,157 (+93: content-list 26.1,
  filters + Popover 23.8, dialog + field 20.4); /admin/people/[id] 1,157 (+93: Combobox + picker
  53.1 - finding 05, person-detail 30.1, field 18.0); /admin/people 1,147 (+83: filters +
  Popover 23.8, field 18.8, people-list 17.7). /lab/profiles 1,363 is the heaviest route in the
  app because a lab route is its own chunk group outside (main): it carries 138.8 KB of eight
  profile variants plus private copies of post-card (42.6), sidebar (26.4), the bell (22.0),
  houses-chain (19.1), the viewer and comments, and the eager 58.6 KB domMax bundle (lab still
  uses `motion.*`).
- **Top five levers, KB per route x routes**: (1) lab + docs CSS out of the sheet: 66 KB raw /
  8 KB gz x 52 shipped routes (100 total); (2) motion barrel -> feature module: ~70-90 KB raw /
  17-22 KB gz post-hydration x 100; (3) motion engine twin dissolving with it or via chunking
  config: 34 KB raw / 13 KB gz x 45; (4) guide deferral: 14 KB raw / 5 KB gz first-load x 39;
  (5) Combobox deferral: 53 KB raw / 16 KB gz x 2 (/welcome, /admin/people/[id]). Then phosphor
  weights: 12-16 KB raw / 4-5 KB gz x ~30.
- **Stylesheet**: 238,434 bytes raw / 33,666 gz; 3,134 leaf rules; app 2,059 rules (139.5 KB),
  lab-only 874 (59.3 KB, 477 of them arbitrary-value = 33.2 KB), docs-only 51 (5.0 KB),
  class-less 150 (15.2 KB); 6 keyframes, 30 `@media`, 76 `@property`, 278 `@supports`; variants
  emitted: `sm:` 213, `lg:` 158, `hover:` 119, `md:` 38, `dark:` 20, `xl:` 17, `2xl:` 0.
- **Fonts**: 75 files / 3.04 MB in `static/media` (72 woff2 = 2.95 MB); app 9 woff2 = 222 KB, 2
  preloaded; lab type room 72 woff2 = 2.95 MB; lab craft 18 = 441 KB.
- **Duplication**: 23 near-duplicate production chunk pairs, 304.9 KB duplicated on disk;
  per-route repeated module bytes 68-156 KB (list in 04).
- **"use client"**: 285 files, 202 non-lab; the 25 largest non-lab by cloc code lines run from
  letterhead-profile 1,295 (662 comment lines) down to landing-hero 308; comment-heaviest in the
  set: collection-client 662/725, letterhead-profile 662/1,295, houses-chain 287/408,
  image-viewer 291/478, alumni-map 290/517 - all of the "why" kind the brief protects.
- **Build**: wall 42.3 s = compile 20.3 (cold; 618 MB cache written) + Sentry hook 0.6 +
  TypeScript 14.6 + page-data/static 0.7 + finalize; 121 manifest routes (14 API, 107 pages,
  48 lab); 7 prerendered outputs; every page route dynamic.
- **Server-only sweep**: 224 JS chunks, 18 patterns, 0 real hits (details in Not-findings).
- Lines read: ~2,900 of source and config directly (next.config 387, globals.css 726, the
  layouts, the motion and analytics kit, the fonts file, the guide layer, the lab layout, the
  Sentry hook 118), ~1,300 of Next docs, ~900 of audit-1 report and fix logs, plus the decoded
  analyzer data for all 100 page routes and the 224 + 4 production chunk files by grep.
