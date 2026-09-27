# bundle-build - refactor audit 3 report

Cross-cutting lens L03: what a member downloads and what the build and the deploy carry. I priced
every first-load byte of every route (118 routes, 52 shipped), every stylesheet byte, every font
file, every server-function byte the deploy traces, and every second of the build, against the
audit-2 baselines and against what the audit-2 campaign (phase B, G1) promised to leave behind. I
did not judge code structure inside components (territory agents) or whether a dependency should
exist (dependency-diet). Method, so the next reader can repeat it: the production build at
`.next/` (HEAD `70570bcd`, built 2026-09-24 01:16 to 01:32 under load 15 to 27 with a cold
Turbopack filesystem cache), Next's own `.next/diagnostics/route-bundle-stats.json` for the eager
chunk list per route (`node` over it, gzip -6 of each chunk file for the compressed figures),
Next's `experimental-analyze --output` data at `.next/diagnostics/analyze/data/**/analyze.data`
(decoded: a u32 big-endian length prefix then JSON with `sources`, a parent-indexed path tree,
`chunk_parts` with per-module `size` and `compressed_size`, and `output_files`) for what is inside
each chunk, and `.next/server/app/**/page.js.nft.json` for what the deploy's function carries. **The
analyzer is a separate compile with different chunk hashes**, exactly as audit 2 warned: I matched
analyzer chunks to production chunks by size AND by route frequency, and then confirmed every
load-bearing attribution by grepping a distinctive string literal in the production chunk (the
hoopoe's `M0 -3.4 Q3 0 0 3.4`, motion-dom's `Spring duration must be 10 seconds or less`, base-ui's
`getStateAttributesProps`, the gauntlet's `Are you sure you want dark mode?`). Where I only had a
size match I say so, and I do not build a finding on it. Date: 2026-09-24. Files in territory: 21
source/config files plus the build tree, the analyzer data for all 145 entries, and 14 raw outputs;
read fully: all 21.

## Coverage

- Read fully: `next.config.ts` (461 lines), `src/app/layout.tsx`, `src/app/(main)/layout.tsx`,
  `src/app/error.tsx`, `src/app/not-found.tsx` (imports and the Button lines), `src/app/lab/layout.tsx`,
  `src/app/lab/lab.css`, `src/app/globals.css` (lines 1-40 and every `@source`/`@import` line),
  `src/components/common/motion-features.tsx`, `motion-features-max.ts`,
  `src/components/analytics/posthog-client.ts`, `src/instrumentation-client.ts`,
  `src/instrumentation.ts` (head), `src/lib/report-error.ts` (head), `src/lib/storage.ts` (the
  `process.cwd()` branch, lines 120-145 and 350-370), `src/lib/prisma.ts` (the schema fingerprint),
  `src/lib/catchup-pictures.ts` (the pool and the band), `src/components/catchups/home/home-head.tsx`
  (the `<Image>`), `src/components/catchups/home/picture-picker-dialog.tsx` (both `<img>`),
  `src/components/guide/guide-layer.tsx`, `src/components/guide/chapters/index.tsx`,
  `src/lib/magazine/index.ts`, `src/components/mascot/hoopoe-warmup.tsx`,
  `src/components/mascot/moments/moment-hoopoe.tsx` (head), `resident-hoopoe.tsx`,
  `celebration-detector.tsx` (head), `src/components/common/bird-avatar.tsx` (head),
  `src/components/common/verified-mark.tsx` (imports), `src/components/ui/button.tsx` (imports),
  `package.json`; the five built CSS files; `.next/build-manifest.json`, `app-path-routes-manifest.json`,
  `next-font-manifest.json`, `required-server-files.json`; raw: `build.txt`, `build-setup.txt`,
  `analyze-run.txt`, `build-diagnostics.json`, `route-bundle-stats.json`, `route-js.txt`,
  `use-client.txt`, `dynamic-imports.txt`, `barrels.txt`, `routes.txt`; audit 2's
  `work/agents/bundle-build.md` (800 lines), its raw `build.txt`, `build-nolab*.txt`,
  `chunk-sizes-top30.txt`, `css-lab-share.txt`, `css-source-attribution.txt`, `route-js.mjs`,
  `tsc-diag-*.txt`, and the fix-prompt's board, phase-B rows and "What Phase B actually taught";
  Next docs `output.md` (tracing includes/excludes), `memory-usage.md` (source maps),
  `08-turbopack.md` (the options table), `06-cli/next.md`; Next's default
  `optimizePackageImports` list in `node_modules/next/dist/server/config.js:1122-1211`.
- Skimmed (why): the import blocks and mount sites of `post-feed.tsx`, `directory-client.tsx`,
  `saved-posts-feed.tsx`, `messages/(index)/page.tsx`, `almost-ready.tsx`, `completion-card.tsx`,
  `nothing-here.tsx`, `celebration-signals.tsx`, `signup-form.tsx`, `turnstile-widget.tsx`,
  `catchup-card.tsx`, `edition-cover-card.tsx`, `magazine/page.lab.tsx`, `_live.ts` - I needed what
  they pull and when, not how they work. The 25 largest client files were probed for hook, handler
  and browser-API density (the audit-2 method), not read line by line.
- Not read: lab room sources beyond the layout, `lab.css` and the magazine room's import block
  (their chunks are route-private and admin-only, so their weight is a lab-lens question); the
  base-ui, motion-dom and Sentry package internals beyond what the analyzer and the chunk strings
  name; the `.next/server/chunks/ssr/*.js` bodies beyond string counts.
- Uncommitted edits seen (someone else's WIP): none in my territory. `git status --short` shows only
  the two audit folders untracked. Every number here is from HEAD `70570bcd`.

## Summary

The audit-2 campaign's bundle work held, all of it, and one lever nobody has pulled is bigger
than anything it did. The member-page floor is **979 KB raw / 312 KB gz of JavaScript** before a
byte of page content (14 root chunks on every route 621 KB / 192 KB gz, unchanged since audit 2,
plus a (main) shell tier of 13 chunks 358 KB / 120 KB gz, down from 16 chunks / 434 KB), the
shipped median first load is **985 KB raw / 315 KB gz** (audit 2: 1,069; campaign close: 992), and
the stylesheet every member downloads is **171,870 B raw / 26,544 B gz** (audit 2: 238,434 /
33,666), with the lab's share of it now **0 rules** and its own 169.6 KB sheet loaded only under
`/lab`. PostHog is in the eager set of zero routes, LazyMotion's `domMax` module holds, no
server-only module reaches any of the 311 client chunks (18 patterns, 0 hits), the fonts are
unchanged (two preloads, 62.6 KB), and `optimizePackageImports` coverage is complete. Since the
campaign closed, 347 commits added back **+41 KB to /profile/[id], +43 KB to /directory, +20 KB to
/welcome, +22 KB to /letters/[id]**, and the sum across the shipped routes stayed flat (48.99 MB
over 51 routes then, 48.34 MB over 52 now), which is the codebase re-growing at roughly the rate
the campaign cut.

The thing nobody measured: **the deploy's server function carries the whole `public/` folder**,
because `src/lib/storage.ts`'s local-dev branch joins `process.cwd()` with `"public"` and a dynamic
key, and Next's file tracer resolves that to `public/**`. Every route's `.nft.json` lists 162
public files (21.2 MB on this disk, 13.5 MB of them git-tracked and therefore deployed) next to the
17.3 MB of libvips and 4.6 MB of Prisma's query compiler. That is 13.5 MB of a roughly 50 MB
function that the CDN already serves, growing by every photograph added under `public/`, and one
`outputFileTracingExcludes` line removes it (finding 01). Three more structural items are
first-load bytes with a source-level fix: the hoopoe rig rides eagerly on ten member routes
including the three heaviest, through empty-state and celebration wrappers the campaign's B2 did
not cover (31.9 KB raw / 8.7 KB gz, finding 02); the root `error.tsx` boundary drags a private
14 KB copy of the base-ui Button chain into the floor of all 118 routes (finding 03, and the
honest explanation of B9's "three copies of the button" that a chunker flag could not fix); and
the Catch-up picture picker draws three 4,608-pixel originals through plain `<img>` (6.8 MB for
three thumbnails, finding 04). The build's own artefact has a 108 MB blind spot: 1,020 server
source-map files, 72 % of `.next/server`, deployed nowhere (finding 05, a second-build request).
Structural-vs-cheap: 01-07 and 09 are structural; 08 is the one cheap item and it is 0.4 KB. What
surprised me: the build log (952.9 s) is useless as a baseline and I say so rather than pretend;
the numbers that matter come from the artefact, not the clock.

## Findings

### bundle-build-01 - Keep `public/` out of every server function's trace: 13.5 MB of deployed images the CDN already serves, growing with every photograph
- **Where**: `src/lib/storage.ts:137-139` (`path.join(process.cwd(), "public", path.dirname(key))`,
  `writeFile(path.join(process.cwd(), "public", key), buffer)`), `:224-225` (`copyFile`), `:244`
  (`open`), `:271` (`readFile`), `:288` (`stat`), `:321` (`unlink`) - the local-filesystem branch
  behind `useR2`; the fix goes in `next.config.ts` at the top level of `nextConfig` (beside
  `serverExternalPackages: ["sharp"]`). Built result: every one of the 143 `.next/server/app/**/*.nft.json`
  files lists `../../../public/**`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `node` over `.next/server/app/(main)/feed/page.js.nft.json`: 771 traced files,
  52.5 MB, of which **162 files under `public/` = 22,186,925 B (21.2 MB)**; `git ls-files public`
  intersected with that list = **13.47 MB git-tracked** (the rest is the untracked
  `landing-original.jpeg` 5.9 MB and the gitignored `public/lab/wall/` atlases, which never reach
  Vercel). The five largest traced files of a feed request are libvips 17.32 MB,
  `landing-original.jpeg` 5.92, Prisma's `query_compiler_fast_bg.postgresql.wasm-base64.mjs` 4.37,
  `catchups/shaded-path.webp` 3.19, the Sentry SSR chunk 1.92. The union across all 143 route traces
  is 97.7 MB / 1,957 unique files: `scripts/dev` 22.92 MB (the magazine room, see Notes), server
  chunks 22.39, `public/` 21.16, libvips 17.33, `@prisma/client` 4.58. The cause is the tracer's
  handling of a partially static path: `@vercel/nft` sees `path.join(process.cwd(), "public", <expr>)`
  and includes the directory. It was already true at audit 2 (`git show 72b5a1d:src/lib/storage.ts`
  has the same three joins at lines 118-186); audit 2's "35.9 MB function" already carried the
  public folder of that day, and it has grown by the three Catch-up photographs (6.8 MB, 2026-09-10)
  since. The branch never runs on Vercel (`useR2` is true there), so nothing in the function ever
  opens one of those files. `prisma/schema.prisma` is NOT traced (`schemaFingerprint()` guards on
  `NODE_ENV`), so `prisma.ts:140` is fine.
- **What to do**: add to `nextConfig` in `next.config.ts`:
  `outputFileTracingExcludes: { "/*": ["./public/**"] },` with a comment in the house style
  (the `storage.ts` local branch joins `process.cwd()`/`public`, the tracer globs the folder, the
  CDN serves `public/` on its own, and the branch is dev-only). Next 16 documents the option at the
  top level (`output.md:80-113`; keys are route globs matched with picomatch, values are globs from
  the project root). Also consider the sibling line for the two lab rooms that `readFileSync`
  `src/components/common/bird-adjust.json` through `process.cwd()` (`src/app/lab/birds-bg/page.lab.tsx:111`,
  `src/app/lab/centroid/page.lab.tsx:31`), which pull 0.70 MB of `src/**` into their two traces -
  harmless, lab-only, but the same shape; an `import` of the JSON would trace one file instead.
  Verify: run `npm run build`, then `node -e` over `(main)/feed/page.js.nft.json` and confirm no
  `public/` entry and a total near 31 MB; run `npm run dev` and upload a photo with no R2 env to
  confirm the local branch still writes to `public/uploads/` (tracing does not touch dev, but the
  proof is cheap).
- **Saving**: ~13.5 MB off every deployed server function bundle today (of ~50 MB), ~21 MB on a
  developer's `next build` trace, and a growth curve that stops: every future `public/` asset
  (the roadmap's Catch-up pool, the collection stand-ins) would otherwise ride into the function.
  Vercel unzips the function on every cold start; smaller is faster, though I cannot put a
  millisecond figure on it without a deploy.
- **Risk & gate**: low. The only code that reads `public/` at runtime is the dev branch. Gates:
  the `.nft.json` check above; `npm run check`; one real deploy's function size in the Vercel
  dashboard (the owner's, on request) before and after.
- **Confidence**: high on the measurement and the cause; high that the exclude works (documented,
  top-level, picomatch on `/*`). What would change my mind: a production code path that reads a
  file under `public/` with `fs` - I grepped `src/` for `process.cwd`, `"public"`, `fs` and
  `node:fs` outside the lab and found only `storage.ts` and `prisma.ts`.
- **Notes**: two related traces are local-only and belong to the lab lens: `/lab/catchups/magazine`
  reads `scripts/dev/.exports/catchups/**` (gitignored by `.gitignore:110`, 23.8 MB on this disk)
  through `sourcesFromFile`, so its trace lists 170 export files it can never have on Vercel; and
  `.next/server/app/lab` is 6.1 MB of the 14.7 MB server app tree. Neither reaches a member. The
  `meriyah` parser (0.62 MB, two copies) in every trace comes from `@sentry/nextjs` >
  `@sentry/server-utils` > `@apm-js-collab/code-transformer` (`npm ls meriyah`); it is Sentry's
  server-side instrumentation transformer and is not ours to drop. Related: 05 (the other thing the
  server artefact carries that the deploy does not need).

### bundle-build-02 - Defer the hoopoe rig behind the empty-state and celebration wrappers: 31.9 KB raw / 8.7 KB gz eager on ten member routes for a bird that only appears when there is nothing to show
- **Where**: `src/components/mascot/moments/moment-hoopoe.tsx:16` (`import { Hoopoe } from
  "@/components/mascot/hoopoe"`, the shared `MomentStage` used by `no-results-hoopoe.tsx`,
  `messages-empty-hoopoe.tsx`, `no-saved-hoopoe.tsx`); `src/components/mascot/resident-hoopoe.tsx:11`
  (`ResidentHoopoe`, used by `catchups/almost-ready.tsx:29`, `catchups/answer/completion-card.tsx:13`,
  `catchups/index/nothing-here.tsx:26`); `src/components/mascot/moments/celebration-hoopoe.tsx:22`
  (via `celebration-detector.tsx:20` and `celebration-signals.tsx`, mounted by
  `src/app/(main)/welcome/page.tsx:5` and `src/app/(main)/feed/page.tsx:15`). Mount sites of the
  moments: `posts/post-feed.tsx:295` (`<NoResultsHoopoe size={76} />` in the no-results branch),
  `directory/directory-client.tsx:709` (same), `messages/(index)/page.tsx` (`MessagesEmptyHoopoe`),
  `profile/saved-posts-feed.tsx` (`NoSavedHoopoe`). Built result: production chunk
  `1gnprwog56le7.js` = **31,884 B raw / 8,650 B gz**, confirmed by the puppet's path literals
  (`M0 -3.4 Q3 0 0 3.4 Q-3 0 0 -3.4 Z`, `M42 84 Q26 82 7 89 ...`), in the first load of exactly 20
  routes: `/profile/[id]`, `/feed`, `/directory`, `/catchups/[catchupId]`, `/catchups/edition/[editionId]`,
  `/catchups/new`, `/dark-mode`, `/messages`, `/catchups`, `/welcome` (the ten member routes),
  `/signup`, `/login`, `/`, `/reset-password`, `/forgot-password`, `/verify-email`, `/hoopoe`
  (drawn at first paint by design, keep), `/lab/hoopoe-lives`, `/lab/mascot-moments`, `/lab/hoopoe`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the campaign's B2 deferred the sidebar perch and the logo egg (`sidebar-hoopoe.tsx:56`
  and `mascot-flight-layer.tsx:48` now `dynamic(() => import("./hoopoe"))`) and delivered -74.4 KB on
  26 routes; what it left is every other static `import { Hoopoe }` (15 non-lab sites, listed by
  `grep -rn 'from "@/components/mascot/hoopoe"' src`). Of those, the ones that are drawn at rest
  (login, signup, the auth panel, the landing hero and footer, the gauntlet, the playground, the
  404 stage which is already dynamic) are correct. The three moment wrappers and `ResidentHoopoe`
  are not: `MomentStage` renders "inside an already-drawn empty state" (its own docblock) and only
  when `useSoloHoopoe` says no other bird is on screen, which is decided in a mount effect, so the
  server never renders the bird; `CelebrationDetector` "decides, once per mount, whether any of the
  three earned one-shot moments should fire" and enqueues a kind - also mount-time. So on `/feed`
  with posts, `/directory` with people, `/messages` with threads, a profile with saved posts and a
  Catch-up that is not "almost ready", the 1,700-line puppet is downloaded, parsed and never
  mounted. The wrappers are July-2026 code (`git log --diff-filter=A`: `no-results-hoopoe` and
  `moment-hoopoe` 2026-07-06, `messages-empty-hoopoe` 2026-08-26, `resident-hoopoe` 2026-09-17,
  `celebration-hoopoe` 2026-07-06), so audit 2's "hoopoe eager on 46 of 52 routes by design"
  counted them under the perch; once B2 moved the perch, these became the reason the rig is still
  eager on the ten heaviest member routes.
- **What to do**: one lazy boundary per wrapper, using the shape the repo already has. In
  `moment-hoopoe.tsx` replace the static import with `const Hoopoe = dynamic(() =>
  import("@/components/mascot/hoopoe").then((m) => m.Hoopoe), { ssr: false })` - `ssr: false` is
  right here because the guard already returns null on the server ("False during SSR and until
  that first check runs", the docblock at the top of the file), so there was never server HTML to
  lose; keep the `ref` forwarding the way `sidebar-hoopoe.tsx:50` documents (next/dynamic does not
  forward refs, so the wrapper takes the ref and hands it down). Same in `resident-hoopoe.tsx`,
  but WITHOUT `ssr: false`: `nothing-here.tsx` and `almost-ready.tsx` are drawn at rest for a member
  with no Catch-ups, so the server render stays and the chunk is fetched only when the empty state
  actually renders (the B6 lesson: "the bytes leave first-load either way"). Same in
  `celebration-hoopoe.tsx` with `ssr: false` (a celebration is enqueued after mount). Warm the chunk
  the way `hoopoe-warmup.tsx:55` does (`void import("./hoopoe")`) from `MomentStage`'s mount effect
  when `useSoloHoopoe` says yes, so the bird lands within the moment's own 450 ms autoplay delay.
  Measure at the browser on `next start` (the B2 method): `performance.getEntriesByType("resource")`
  on `/feed` should no longer list the rig chunk until a search returns nothing.
- **Saving**: ~31.9 KB raw / ~8.7 KB gz off the first load of `/profile/[id]`, `/feed`, `/directory`,
  `/catchups`, `/catchups/[catchupId]`, `/catchups/edition/[editionId]`, `/catchups/new`,
  `/messages` and `/welcome` (`/dark-mode` keeps it: the gauntlet is the bird). Per the campaign's
  own lesson ("every row beat its estimate") this is a floor: the wrappers also pull
  `use-hoopoe-life.ts`, `use-hoopoe.ts` and the imperative `animate()` sequence API, which the
  analyzer shows in the same routes' chunks (`2wbtaw6h76x2l.js` 16.7 KB on the Catch-up routes
  carries `almost-ready 2.6 + sequence/create 2.2 + GroupAnimation 1.1 + use-hoopoe-life 1.0 +
  use-hoopoe 0.9`).
- **Risk & gate**: low-medium. The one-hoopoe rule must keep holding: the guard runs before the
  lazy import resolves, so the check order is unchanged; but a moment that used to appear on the
  same frame as the empty state will now appear a beat later on a cold cache (the warm-up covers
  the common case). Gates: `npm run visual` (feed, directory and catchups are baseline routes;
  their empty states are not, so screenshot `/directory?q=zzzz` and an empty inbox as Jerry Maguire
  by hand at both viewports); `src/components/mascot/one-hoopoe-*` tests if any, and
  `motion-namespace-rule.test.mjs` (untouched by this); `npm run check`.
- **Confidence**: high on the bytes and the routes (string-confirmed in the production chunk);
  high on the mechanism. What would change my mind: a design decision that the empty-state bird
  must be in the server HTML for a member whose feed is empty on first paint - then `ssr: false`
  comes off `MomentStage` too and the saving on that one route is smaller, but the others stand.
- **Notes**: `hoopoe-warmup.tsx` still statically imports the puppet (its comment says it is "a
  harmless no-op on pages that already statically import it"); it is mounted only by
  `login-client`, `signup-client` and `landing-hero`, all of which draw the bird anyway, so it
  costs nothing extra and needs no change. Related: 07 (the same "eager for a conditional surface"
  shape, smaller), and audit 1's finding 07 / audit 2's finding 03, which this is the third
  instance of.

### bundle-build-03 - Take the base-ui Button chain out of the root `error.tsx` boundary: a private 14 KB copy in the floor of all 118 routes
- **Where**: `src/app/error.tsx:3` (`import { Button } from "@/components/ui/button"`) and `:23-29`
  (`<Button onClick={reset} variant="primary" className="mt-6">Try again</Button>`); built result:
  production chunk `0k5088p4zukar.js` = **14,903 B raw / 5,845 B gz**, one of the 14 chunks on every
  route, confirmed by the boundary's own heading (`"Something went wrong"`) and base-ui's
  `getStateAttributesProps` (2 hits) in the file.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the analyzer's twin of that chunk (`3bg7li_drr_yv.js`, 14.6 KB, on 117 of the
  analyzer's page entries) is **14.0 KB of button/base-ui cluster and 0.6 KB of `error.tsx`**:
  `@floating-ui/utils/floating-ui.utils.dom` 2.6, `ui/button.tsx` 2.4, `use-button/useButton` 1.7,
  `utils/useRenderElement` 1.4, `merge-props/mergeProps` 1.3, `useMergedRefs` 1.0,
  `class-variance-authority` 0.7, `useStableCallback` 0.4, `useFocusableWhenDisabled` 0.3, plus
  the rest of the chain. The same cluster is ALSO in the root chunk `0yi2wu4snop5p.js` (22.5 KB,
  every route: `next/link` 3.3 + the same button chain, which `not-found.tsx:46` and the root layout
  need) and a third time in the (main) shell's dialog chunk `3pzucchb2cy16.js` (28.4 KB on 40
  routes: `ui/dialog.tsx` 3.3 + the same chain + the Dialog store). Counted in the production
  files: `getStateAttributesProps` is present in **3 first-load chunks on 46 of the 52 shipped
  routes, 2 on the other 6**. Why the boundary gets its own copy: a Next error boundary is its own
  client chunk group, loaded so it can render when the tree beneath it fails, and Turbopack's merge
  step gives a group its own copy of a module below `minChunkSize` rather than a cross-group
  reference. The campaign's B9 tried the two chunker knobs the docs offer (`generateComponentChunks`,
  `requestCost`) and reverted both on measurement - this is the source-level version of that row:
  stop the boundary from needing the module at all. `(main)/error.tsx` and `(auth)/error.tsx` also
  import `Button`, but their chunks are 1.0 KB and 0.4 KB because the chain is already in their
  segment's shell; they can stay as they are or change for consistency.
- **What to do**: in `src/app/error.tsx` drop the import and render a plain element with the
  primary pill's classes: `<button type="button" onClick={reset} className="mt-6 inline-flex h-11
  items-center justify-center rounded-full bg-canopy px-6 text-base font-semibold text-white
  state-layer ...">Try again</button>` - copy the exact class string `ui/button.tsx`'s `cva` emits
  for `variant="primary"` (read it there; do not retype from memory), so the pill, its hover,
  focus-visible and active states are byte-identical, and say in a comment why this file may not
  import the primitive (it is the root boundary; every route pays for what it imports; the chain it
  would pull is already in the root chunk beside it). Then read `route-bundle-stats.json` after a
  build: the floor should drop from 14 chunks / 635,585 B to 14 chunks / ~621,000 B, or the error
  chunk should shrink to ~1 KB. If the design-protocol audit (`scripts/qa/protocol-audit.mjs`)
  objects to a raw `<button>`, the alternative is a tiny `PillLink`/`PillButton` in
  `src/components/ui/` with no base-ui dependency that the boundaries and `not-found.tsx` share - the
  root chunk's copy would then also shrink, but that is a second measurement.
- **Saving**: ~14 KB raw / ~5.8 KB gz off the first load of every one of the 118 routes (52
  shipped, all 66 lab): the largest per-route floor saving available anywhere in this report, and
  the only one that touches `/privacy`, `/terms`, `/guidelines` and `/_not-found` (629/621 KB).
- **Risk & gate**: low. The boundary is rarely seen; when it is, the pill must still look like the
  pill. Gates: force the boundary once in dev (`throw` in a page, then remove it), screenshot it at
  both viewports; `npm run check` (the protocol audit runs inside it); `npm run visual` is blind to
  the boundary, so the hand screenshot is the proof; the floor number above.
- **Confidence**: high on the bytes (string-confirmed) and on the cause (the analyzer's module list
  for the twin is 96 % the chain). Medium on the exact residual size after the change, because
  Turbopack may re-merge the 0.6 KB boundary into another root chunk; either outcome is the saving.
- **Notes**: this is the concrete answer to B9's "three copies of `button.tsx`". The other two
  copies are legitimate: the root chunk's is what `not-found.tsx` and the root layout use, the
  shell's is what the app uses. I considered and rejected making `ui/button.tsx` itself lighter
  (dropping base-ui's `useButton` for a plain element): it changes the primitive every surface
  uses and its focus/disabled semantics, for the same 11 KB, and that is a design-system change,
  not a boundary fix. Related: 11 (the duplication metrics), audit 2's 04 / B9.

### bundle-build-04 - The Catch-up picture picker serves three 4,608-pixel originals as thumbnails (6.8 MB for a 5:2 strip), and the pool originals are twice the size any surface can show
- **Where**: `src/components/catchups/home/picture-picker-dialog.tsx:222-228` (the aim frame:
  `<img src={src} ... className="h-full w-full object-cover" style={{ objectPosition: ... }} />`
  with the eslint-disable comment "next/image is the metered optimiser the media work spent a
  campaign getting off") and `:264-269` (the pool strip: `<img src={option.src} ... />` per
  option, `aspectRatio: "5 / 2"`); the pool: `src/lib/catchup-pictures.ts:197,202,206`
  (`/images/catchups/shaded-path.webp` focus `center 66%`, `stone-benches.webp` 68%,
  `boulder-hill.webp` 48%); the files: `public/images/catchups/shaded-path.webp` **3,346,288 B,
  4608x2306**, `boulder-hill.webp` **1,840,694 B, 4608x2303**, `stone-benches.webp` **1,601,734 B,
  3456x1716** (`stat`, `sips -g pixelWidth -g pixelHeight`); the surfaces that draw them:
  `catchups/home/home-head.tsx:62-72` (`<Image fill sizes="(min-width: 1180px) 1180px, 100vw" priority>`
  in a 1520x240 band, 172 px tall on a phone), `catchups/index/catchup-card.tsx:103-111`
  (`<Image sizes={CARD_IMAGE_SIZES}>`), `catchups/index/edition-cover-card.tsx:103-107`
  (`sizes="(min-width: 1180px) 366px, (min-width: 768px) 508px, 68vw"`).
- **Phase**: library (the picker) + relocate (the bytes)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous for the picker; owner for
  re-encoding his photographs
- **Evidence**: the three surfaces that members see go through `next/image`, so they are fine:
  the optimizer serves a 1,200-wide WebP to a phone and, for a 1,180 CSS-px band on a 2x screen, the
  3,840 rung (the ladder in `next.config.ts` `deviceSizes` has nothing between 2,048 and 3,840) -
  a ~400-700 KB `priority` (preloaded) image for a strip 240 px tall, which is its own small
  inefficiency and the reason the band's `sizes` might state `2360px` as its ceiling instead of
  `1180px`. The picker does not go through it: opening Catch-up settings and pressing the picture
  control fetches the raw files, **6,788,716 B for three thumbnails** drawn at roughly 200 CSS px
  wide, plus a fourth fetch of the chosen one for the aim frame. The eslint comment's reason (the
  media campaign moved uploaded photographs off the metered optimizer, because every unique R2
  URL costs a transformation) does not apply to three static pool files whose transformations
  are cached forever after the first request. Separately, the originals are 4,608 px wide; the
  widest any surface asks for is 1,180 CSS px at 2x = 2,360 px, so half the pixels can never be
  shown, and Sharp decodes a 3.3 MB WebP for every new width it is asked for.
- **What to do**: (1) In the picker, draw pool options and the aim frame with `next/image`
  (`sizes="(min-width: 640px) 200px, 33vw"` for the strip, the band's `sizes` for the aim frame),
  keeping the plain `<img>` only for an uploaded R2 URL (`src.startsWith("http")`), which is what
  the comment is actually protecting; or, if the picker must stay `<img>`, add a 480-px `thumbs/`
  copy of each pool file (`sharp` one-liner, ~25 KB each) and point the strip at it. (2) Owner
  call: re-encode the three originals to 2,560 px wide at WebP quality 82 (`sips`/`sharp`; keep the
  focus values, they are fractions) - I expect ~500-800 KB each - and note in
  `catchup-pictures.ts`'s "ADDING a photograph" paragraph that 2,560 is the ceiling and why. (3)
  Optional: `home-head.tsx`'s `sizes` can cap at the band's true width so the optimizer's largest
  rung is 2,048 rather than 3,840.
- **Saving**: ~6.6 MB per opening of the picture picker (every Catch-up keeper who touches the
  setting, on a phone, on a rural connection - the type room's own phrase); ~4.5 MB of tracked
  bytes and the same off every deploy and every clone if the originals shrink; a few hundred KB off
  the preloaded band on 2x laptops if (3) is taken.
- **Risk & gate**: low for (1) and (3); (2) is the owner's eye - screenshot the band, the card and
  the cover card at 1440 and 390 before and after, and compare the three photographs at 2x zoom.
  Gates: `npm run visual` (`/catchups` is a baseline route with its picture masked as live data, so
  the hand screenshots are the proof); `npm run check`.
- **Confidence**: high on the picker bytes (the file sizes are the fetch sizes; no optimizer in the
  path); high on the dimensions; medium on the exact re-encoded sizes.
- **Notes**: the tracked-weight lens will have these three files as the largest tracked images;
  this finding is the runtime half of the same item, and the two should land together. The
  landing photograph (`public/images/landing.jpeg`, 498 KB, 1680x1260) is used only by lab rooms
  (`_shared.tsx`, `hoopoe-lives`, `v2`) - the shipped landing hero draws its own; a lab-lens note.
  `landing-original.jpeg` (6.2 MB, untracked, `.gitignore:37`) is local-only and costs nothing but
  this disk and the local trace in 01.

### bundle-build-05 - Server source maps: 1,020 `.map` files, 108 MB, 72 % of `.next/server`, traced into no function - measure a build without them
- **Where**: `.next/server/chunks/**/*.js.map` (1,020 files; `find .next/server -name '*.map'`;
  `du` 108,336 KB under `server/chunks`, 572 KB under `server/app`), against 26,788 KB of `.js`
  in `server/chunks`; the config that governs it would be `experimental.serverSourceMaps` (webpack
  path, `build/webpack-config.js:1963`) and/or `experimental.turbopackSourceMaps` (the option table
  in `08-turbopack.md:399`: "Enable source maps", default `true` in dev, `productionBrowserSourceMaps`
  in build) in `next.config.ts`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous, after one measured build
- **Evidence**: `.next/server` is 149 MB; the maps are 108.9 MB of it; the real server code is
  26.8 MB of chunks plus 14.7 MB of `server/app`. None of the 143 `.nft.json` files lists a `.map`
  (`grep -c '\.map'` on `required-server-files.json` is 0; the feed trace's 771 files include 0
  maps), so the deploy never ships or reads them; `productionBrowserSourceMaps` is off (0 `.map`
  under `static/chunks`), so browser maps are not the question. What they cost is what the build
  spends writing them and what the 718 MB Turbopack cache stores about them, on every deploy, plus
  local disk. What they buy: readable server stack traces in `next start` on THIS machine, and
  Sentry's server traces if `SENTRY_AUTH_TOKEN` were ever set (it is not, on purpose, and
  `sourcemaps.disable` follows it). I could not find where Turbopack decides to emit server maps in
  a production build (the docs mention `serverSourceMaps` only under `--debug-prerender` and the
  memory guide), which is why this is a request and not a prescription.
- **What to do**: orchestrator, one build on a quiet machine with `experimental: { serverSourceMaps:
  false, turbopackSourceMaps: false }` added (both, then each alone if the first run says
  something), recording: `du -sk .next/server`, the count of `.map` files, "Compiled successfully
  in", "Finished writing to filesystem cache in", and whether the Sentry hook still says
  "Completed runAfterProductionCompile". If the maps go and the compile or cache-write time moves
  by more than noise, keep the flag with a comment that says the deploy never carried them and
  Sentry never received them; if the flags do nothing under Turbopack, close this as a not-finding
  with the numbers.
- **Saving**: ~108 MB of build output per build and whatever share of the 4.9 min cache write and
  8.3 min compile was spent producing it (unknown until measured; on this loaded machine the
  phases are not separable); 0 bytes to a member; 0 bytes to the deploy.
- **Risk & gate**: low. If the flag were to strip maps Next needs at runtime, `next start` would
  print minified frames in a stack trace and nothing else; the gate is one `next start`, one
  forced error, one look at the server log.
- **Confidence**: high on the measurement; low on which flag (or whether any) removes them under
  Turbopack; medium on the build-time saving.
- **Notes**: this is not the webpack-era `productionBrowserSourceMaps`; nobody proposed browser
  maps and they are off. The Sentry wrapper does not set either option (grep of
  `@sentry/nextjs/build/cjs/config/*.js` for both names: 0 hits). Related: 10.

### bundle-build-06 - Move the magazine engine out of `src/lib`: 2,396 lines that ship to nobody but one lab room, compiled and type-checked in every build including the demo's
- **Where**: `src/lib/magazine/` (`index.ts` 325 lines, `grammar.ts` 696, `paginate.ts` 361,
  `measure.ts` 296, `types.ts` 289, `image.ts` 154, `score.ts` 146, `from-export.ts` 129, plus
  `magazine.test.mjs` 16,987 B); importers: `src/app/lab/catchups/magazine/_room.tsx:22`
  (`layoutMagazine`), `page.lab.tsx:24-25`, `_pages.tsx:26-27`, `_measure.ts:13`, `_live.ts:13-14`,
  and `src/app/lab/_registry.ts:255` (prose). No file outside `src/app/lab/` imports it
  (`grep -rn 'lib/magazine' src scripts` minus the folder itself: six lab files and one comment in
  `scripts/dev/export-catchups.mjs:348`).
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (the engine is not a room; no
  owner decision about the lab is being made)
- **Evidence**: `raw/barrels.txt` lists `src/lib/magazine/index.ts` as one of the repo's two
  barrels; it is not a barrel in the harmful sense (it IS the engine, `layoutMagazine` and the
  beam search, and re-exports six names at the bottom), so there is no tree-shaking cost - the
  cost is placement. The Catch-ups spec makes the magazine a lab experiment whose verdict has not
  shipped (`docs/spec/catchups.md` and the sketches room; `/lab/catchups/magazine` is 863 KB first
  load with its own 56 KB private chunk `1pxqqs7lh8g6k.js`). Under `src/lib` it rides in the
  TypeScript program of every build, including the public demo's (`pageExtensions` drops the lab's
  PAGES from the demo, not files under `src/lib`), and it reads to the next auditor as shipped
  library code, which cost me twenty minutes here. The build cost is modest (about 2 % of the
  122,795 TS lines) and the bundle cost is zero; the honesty cost is the reason.
- **What to do**: `git mv src/lib/magazine src/app/lab/catchups/magazine/_engine` (the underscore
  keeps Next from treating it as a route segment; every existing lab room uses the same
  convention), update the six import paths and the registry note, keep `magazine.test.mjs` beside
  it (the test runner globs `src/**/*.test.mjs`, so it stays discovered; `check.mjs`'s
  `findUnrunTests` requires the `*.test.mjs` name, which it has), and put one line in
  `docs/spec/catchups.md` saying where the engine lives until the magazine ships. If the magazine
  ships, the move back is the same command.
- **Saving**: 0 member bytes; ~2,400 lines out of a shipping path (a relocation, not a deletion,
  so it does not count as lines cut); the demo build type-checks 2,400 fewer lines; one fewer
  false lead for the next audit.
- **Risk & gate**: low. Gates: `npm run check` (TypeScript and the 130 tests, `magazine.test.mjs`
  among them; `scripts/qa/lab-audit.mjs` reads only the registry and page files); open
  `/lab/catchups/magazine` as admin once.
- **Confidence**: high. What would change my mind: a shipped Catch-up feature that lays out
  editions (the spec's "magazine" delivery) landing before the fix session; then the engine is
  shipped code and stays.
- **Notes**: the other barrel, `components/guide/chapters/index.tsx`, is fine and already behind
  the B5 lazy boundary (`guide-layer.tsx:28`, `dynamic(() => import("./guide-body"))`, with the door
  warming it on hover and focus): the chapters are in no member route's first load. Not reopened.

### bundle-build-07 - Defer the base-ui Tooltip behind `VerifiedMark`: ~10 KB raw / ~3.5 KB gz eager on `/profile/[id]` and `/directory` for a badge's hover text
- **Where**: `src/components/common/verified-mark.tsx:4` (`import { Tooltip } from
  "@base-ui/react/tooltip"`), rendered by two non-lab files (`grep -rl 'verified-mark"'`: the
  letterhead and the directory's person card); built result: `2n-_7gei0w2qu.js` 18,190 B raw /
  6,830 B gz on `/profile/[id]` (+1 route) and `19vq_rsnelmav.js` 17,552 B / 6,613 B gz on
  `/directory`, both confirmed by the literal `"Verified former teacher"` and base-ui's
  `disableHoverablePopup`/`data-activation-direction`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the analyzer's twins list `tooltip/root/TooltipRoot` 2.2, `useClientPoint` 2.0,
  `TooltipStore` 1.7, `TooltipPositioner` 1.6, `FloatingDelayGroup` 1.5, `TooltipTrigger` 1.4,
  `verified-mark.tsx` 1.6 and `segmented-pills.tsx` 1.4-1.5 in each; the tooltip stack is ~10 KB
  of the 17.5-18.2 KB, the rest is the pills and the mark, which stay. The campaign's B1 did this
  exact split for `InfoTooltip` (`float-field.tsx:22`, `dynamic(() => import("@/components/common/info-tooltip"))`),
  so the pattern, the loading state and the verification exist. A verified badge is on screen at
  rest; its tooltip is not, and a leaf that opens on hover is the textbook `ssr: false` case
  (Phase B lesson 2).
- **What to do**: in `verified-mark.tsx`, render the leaf `<Leaf>` glyph statically (it is 0.5 KB
  and visible) and move the `Tooltip.Root/Trigger/Popup` into a sibling `verified-mark-tip.tsx`
  loaded with `dynamic(..., { ssr: false })` on first hover or focus of the badge (the B1 latch:
  a `useState` that flips on `onPointerEnter`/`onFocus`, rendering the tip component only after),
  so the badge is server-rendered and the tooltip stack arrives on intent. Alternatively use the
  same `InfoTooltip` primitive B1 already lazy-loads, if its copy matches.
- **Saving**: ~10 KB raw / ~3.5 KB gz off `/profile/[id]` (the heaviest route, 1,240 KB) and
  `/directory` (1,169 KB); the letterhead route is every member's own page.
- **Risk & gate**: low. Gates: hover a teacher's badge on `/directory` and on a teacher's profile
  in a production build and see the tip; `npm run visual` (directory is a baseline route; the badge
  itself does not move).
- **Confidence**: high on the chunk contents (string-confirmed); medium on the exact KB the tooltip
  stack alone accounts for (the analyzer's per-module sizes are attributions inside a merged
  chunk).
- **Notes**: small, but it is the same shape as 02 and the campaign's B1, and `/profile/[id]` and
  `/directory` are the two routes that grew most since the campaign (+41 KB, +43 KB), which is
  where I went looking. The other private chunks on those two routes are all visible at rest
  (the post card, the letterhead, the houses chain with its popover, the filters' popover, the
  search pill) and were already deferred where they could be (the location picker, the crop, the
  editors, the viewer).

### bundle-build-08 - Keep test files out of the stylesheet's source scan: 7 rules / 0.4 KB exist only because `*.test.mjs` files under `src/` quote class names
- **Where**: `src/app/globals.css:1` (`@import "tailwindcss" source("../");`) and `:21`
  (`@source not "./lab";`); the tokens: `top-4`, `overflow-x-visible`, `overflow-y-clip`,
  `outline-solid`, `focus-visible:outline-destructive`, `focus-visible:outline-transparent`,
  `focus-visible:ring-inset`, reachable only from `src/**/*.test.mjs` (the rule tests quote the
  class strings they pin, e.g. `identity-row-overflow-rule.test.mjs`, which audit 2's attribution
  already named as a prose-only source).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: my attribution of the member sheet's 2,242 leaf rules against the whitespace and
  quote-delimited tokens of every file under `src/` (lab excluded, `src/generated` excluded):
  2,025 rules / 136.0 KB reachable from shipped `.ts/.tsx/.css` source, 146 class-less rules /
  15.1 KB, **7 rules / 0.4 KB reachable only from a `*.test.mjs`**, 0 rules reachable only from the
  lab (the campaign's `@source not "./lab"` holds completely), and ~64 attribute-selector variants
  my parser could not split (`aria-expanded:bg-muted[aria-expanded=true]` and friends), all of them
  shipped.
- **What to do**: add `@source not "../**/*.test.mjs";` under line 21 (Tailwind 4.1+ syntax;
  paths relative to the CSS file; verify the glob form against `node_modules/tailwindcss`'s docs at
  fix time the way the lab line was verified), rebuild, and confirm the member sheet shrinks by
  ~400 B and that no shipped surface lost a rule (`npm run visual`).
- **Saving**: ~0.4 KB raw / ~0.1 KB gz on every route. A footnote; listed because it is the one
  remaining leak in the mechanism the campaign built, and because the test suite grew by 28 files
  since audit 2 and will keep growing.
- **Risk & gate**: none found. Gate: `npm run visual` (24 baselines).
- **Confidence**: high.
- **Notes**: the stylesheet is otherwise clean: the lab is out, the docs are out (`source("../")`),
  the `.hoopoe .wing` block audit 2 called dead moved to `lab.css` with a comment that names the
  one room that uses it. Nothing else in `globals.css` is dead by this measurement.

### bundle-build-09 - The lab's share of the production build, re-measured on this artefact: 56 % of routes, 48 % of client-chunk bytes, 42 % of the server app tree, 93 % of the font files, 40 % of the TypeScript lines
- **Where**: `next.config.ts:206` (`pageExtensions: IS_DEMO ? [...] : [..., "lab.tsx"]`, the G1
  mechanism); the artefact: `.next/static/chunks` (311 JS chunks, 8,094 KB), `.next/server/app`
  (14,664 KB), `.next/static/media` (75 files, 3,040 KB); the program: `raw/cloc-summary.txt`
  (lab 49,548 of 122,795 TS lines).
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner (carry-over; restated with the
  numbers, not re-argued)
- **Evidence**: routes: 66 of 118 page routes are `/lab/**` (the build log and
  `app-path-routes-manifest.json`: 143 entries, 18 API, 66 lab, 119 pages). Client JS: of the 311
  chunks, **108 chunks / 3,871 KB are in the first load of lab routes only**, 111 chunks / 2,535 KB
  are in some shipped route's first load, 92 chunks / 1,688 KB are lazy-only (posthog 245 KB, the
  polyfill 110 KB, nine private copies of the image viewer, the lab's eager `domMax` and its
  fixtures among them); so the lab is at least 48 % and plausibly 55 % of `static/chunks`. Server:
  `server/app/lab` 6,148 KB of 14,664 KB. Media: 66 of the 75 font files (2,818 KB of 3,040 KB) are
  the type and craft rooms' Google fonts (audit 2's 72 woff2 minus the app's 9, unchanged). The
  lab's five heaviest routes are the five heaviest routes in the app: `/lab/catchups/sketches`
  1,380 KB and `/lab/catchups/capsule` 1,323 KB (both carry `1h284jke63n28.js`, **429 KB raw /
  128.7 KB gz, the largest chunk in the build**, which is the Catch-ups fixture data compiled into
  a client module - the 18,632 lines of JSON the brief mentions), `/lab/profiles` 1,318 KB
  (`36q3wjbrivkvt.js` 142 KB of profile variants), `/lab/crop` 1,102, `/lab/comments` 1,098. Build
  time: this log cannot separate the lab's seconds (see 10); the campaign's own paired cold builds
  at G1 are the best figure on record - **compile 34.1 -> 21.8 s, TypeScript 36.0 -> 29.9 s, static
  pages 98 -> 57, -9,888 KB of artefact** without the lab, and "16 s against 15 s" warm - and audit
  2's scratch pair said 42.3 -> 30.0 s wall. A member downloads none of it: no lab-sourced module
  is in any shipped route's eager set (the 111 shipped-eager chunks contain no `src/app/lab` module
  in the analyzer; the two size matches that suggested otherwise - `2fcjgjaah3bgl.js` to the valley
  room, `43zrrkbqnb727.js` to the eggs room - are false, confirmed by strings: the first is
  `sonner`, the second is Next's error boundary and `instrumentation-client.ts`), and the
  stylesheet's lab share is 0 rules (08). So the lab costs the member nothing and costs the build
  roughly a third of its cold time and half its client artefact, which is the same verdict as
  audit 2 with fresher numbers.
- **What to do**: nothing autonomous. If the owner wants the build seconds: the honest step
  remains a paired build on a quiet machine (second-build request below). If he does not: the
  Catch-ups fixture chunk (429 KB) and `/lab/profiles`' variants (142 KB) are the two lab items
  that dominate the artefact and belong to the lab lens as "a fixture far larger than the room
  needs".
- **Saving**: 0 autonomous; ~12 s cold / ~1 s warm per build and ~4 MB of client artefact + 2.8 MB
  of fonts + 6 MB of server app if the lab left the owner's build (owner, and he has said no
  twice).
- **Risk & gate**: n/a here.
- **Confidence**: high on every artefact number; medium on the build-second estimate (borrowed
  from the campaign's paired builds, machine-dependent).
- **Notes**: the `lab.css` sheet (169.6 KB / 23.1 KB gz) loads on top of the member sheet under
  `/lab`, so an admin opening a room downloads 341 KB / 49.6 KB gz of CSS; that is the cost the
  campaign chose so that members download 66 KB less. Fine.

### bundle-build-10 - The build, explained: 952.9 s wall is a load-average artefact, and the artefact's phases are what to compare
- **Where**: `raw/build.txt` ("Running next.config.ts took 11.5s", "Compiled successfully in
  8.3min", "Completed runAfterProductionCompile in 2.4s", "Finished writing to filesystem cache
  in 4.9min", "Finished TypeScript in 6.8min", "Generating static pages using 7 workers (109/109)
  in 9.3s", `real 952.93 user 161.99 sys 242.31`); `raw/build-setup.txt` (load averages 6.34 8.88
  6.72 before, 14.76 18.97 15.96 after); `raw/analyze-run.txt` (the analyzer's own compile wrote
  its cache in 3.1 min and finished in 4.6 min); `.next/cache` 718,932 KB (audit 2 wrote 618 MB).
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: n/a (a measurement note; no action)
- **Evidence**: the process used **404 s of CPU (162 user + 242 system) over 953 s of wall**, i.e.
  the build waited for the machine more than it worked, and `sys` exceeding `user` says the time
  went into the filesystem (the cold Turbopack cache: "Finished writing to filesystem cache in
  4.9min" is the largest single line, and the analyzer's second compile spent another 3.1 min
  writing its own). Audit 2's build on a lightly loaded machine: `next.config.ts` 1.08 s (11.5 s
  here, 10x, for the same file plus `withSentryConfig`'s module graph), compile 20.3 s (498 s),
  TypeScript 14.6 s (408 s), static 0.68 s for 105 pages (9.3 s for 109), Sentry hook 0.63 s
  (2.4 s), wall 42.3 s. Every phase is 10-25x slower and the ratios between phases are roughly
  preserved (TypeScript ~70 % of compile then, ~82 % now), so **nothing in this log says the
  build got slower**; it says the machine was busy. What did change in the artefact: 118 routes
  (100 at audit 2; +18, of which +18 lab: the years, valley, loading, catchups sub-rooms), 311
  client chunks (231), 8,094 KB of client JS (audit 2 did not total it), the Sentry hook now has
  `telemetry: false` (audit 2's finding 09, applied), the `.next/cache` grew 618 -> 719 MB with
  the program. The 109 statically generated pages are the 118 page routes less the nine error and
  metadata boundaries; every page is still `ƒ` (dynamic) by design (the theme cookie, `auth()`).
- **What to do**: nothing in code. For the record and for the fix campaign's before/after: measure
  build time only on a quiet machine (load under 3) with the cache in the state you are comparing
  (cold: `mv .next/cache` aside; warm: leave it), and quote `user`+`sys` beside `real`, because
  the wall clock alone has now misled two audits' readers. The Vercel deploy log prints the same
  three phase lines and is the number the owner actually pays.
- **Saving**: 0.
- **Risk & gate**: n/a.
- **Confidence**: high.
- **Notes**: the second-build requests in this report (05, 09) should run on that quiet machine
  and be paired (same commit, same cache state), or their numbers will be as unusable as this
  log's.

### bundle-build-11 - Turbopack's per-group copies, counted on this build: three Button chains on 46 routes, the motion engine in 28 chunks, the image viewer in nine, the Sentry server chunk four times
- **Where**: the built output. Client: `getStateAttributesProps` (the base-ui button/composite
  cluster) in 3 first-load chunks on 46 shipped routes and 2 on 6; motion-dom's engine literal
  `Spring duration must be 10 seconds or less` in **28 client chunks** (one per route chunk group:
  `0et6nzrgew7fc.js` 33.7 KB eager on 45 routes, `0w69krr8x6ruu.js` 33.8 KB eager on `/hoopoe` and
  `/verify-email`, `2avi24dbv-kk-.js` 18.5 KB on the two Collection routes, and 25 route-private or
  lazy copies of 9-53 KB), but **never twice in one route's first load** (checked per shipped
  route); the image viewer (`pinch`/`ImageViewer` strings) in 9 lazy-only chunks of 33-40 KB (one
  per route group that can open it). Server: four SSR chunks of exactly 2,013,435 B
  (`_0ysx5q5`, `_0j2_f0h`, `_0blzpsg`, `_02duyrj`, differing by 6 bytes per `cmp -l`), the
  Sentry/OpenTelemetry/zod/cuid2/upstash vendor bundle, referenced by 105, 1, 3 and 1 route traces
  respectively; two of 1,843,553 B and three of 399,775 B likewise.
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (measurement only; the
  config lever is closed)
- **Evidence**: the campaign's B9 measured `generateComponentChunks: true` (0.9 % worse cold
  `/feed` for 1.0 % better across a three-page session) and `requestCost: 100000` (byte-identical)
  and reverted both, and `docs/TRAPS.md` records that `route-bundle-stats.json` under-reports by
  half under `generateComponentChunks`. I do not reopen the flag. What is new is the count and the
  shape: the duplication is per chunk GROUP, which is per route segment and per boundary, so it
  scales with the number of routes that can reach a module, and the only source-level levers are
  (a) not importing the module from a boundary (03) and (b) the number of routes (09). The
  server-side quadruplication is 6 MB in the union of traces (97.7 MB) and therefore in the deploy;
  I do not know a flag for it and did not find one in the docs.
- **What to do**: record; land 03 and re-count `getStateAttributesProps` per route (expect 2 on
  46 routes). For the server chunks, one question for the orchestrator's second build: does
  `serverExternalPackages` for `@sentry/nextjs`'s transitive `@opentelemetry/*` change the four
  copies to one? Only if it is cheap to try beside 05; otherwise close with the numbers.
- **Saving**: 0 on its own; the member-facing part is 03's 14 KB; the deploy part is up to 6 MB if
  the server copies could be collapsed (unmeasured, low confidence).
- **Risk & gate**: n/a for the record; medium for any server-external experiment (Sentry's
  instrumentation must stay bundled - `src/instrumentation.ts`).
- **Confidence**: high on the counts (string tests on the production files); low on any remedy
  beyond 03.
- **Notes**: audit 2's "23 byte-identical pairs" became "29 pairs at Jaccard 1.0" at B9 and is now
  this; the numbers keep going up with the route count, which is one more reason the lab's 66
  routes cost the artefact more than their own chunks.

## Owner decisions

1. **The Catch-up photographs at half the pixels** (bundle-build-04, part 2).
   - *What I'd change*: shrink the three pool photographs you chose for Catch-ups from 4,608 pixels
     wide to 2,560, which is still more than any screen in the app can show (the widest use is
     about 2,360 pixels on a retina laptop).
   - *What you'd notice*: nothing on any screen; the picture picker in Catch-up settings would open
     several megabytes lighter, and the repository would be about 4.5 MB smaller.
   - *If I guess wrong*: a future surface wanting a full-bleed 4K print of one of them would need
     the original again (keep the originals outside the repo).
   - *Options*: (a) shrink them (b) leave them and only fix the picker (c) both, and also cap the
     home band's request size.
   - *If you don't reply I'll do*: (c). *(rows: bundle-build-04)*
2. **The lab in the production build** (bundle-build-09, carried from audits 1 and 2). Restated
   with this build's numbers: the lab is 66 of 118 routes, about half of the client artefact,
   nine tenths of the font files and none of what a member downloads. Recommendation unchanged:
   keep it deployed; the CSS win the campaign took was the only member-facing cost, and it is
   gone. *(rows: bundle-build-09, lab-*)*
3. **The bird glyphs as one cached file** (carried from audits 1 and 2), with a new fact: since
   2026-09-11 there are 102 pre-rendered 480x480 bird PNGs in `public/images/birds/` (702 KB,
   `scripts/dev/generate-bird-photos.mjs`) for the saved-contact card. The 43.5 KB SVG set still
   rides in the (main) shell on 80 routes. There is now a raster set to point small avatars at if
   you ever want the code out of the bundle; the drawing is yours to judge. Recommendation
   unchanged: not urgent; your eyes on before and after. *(rows: bundle-build-13)*
4. **Phosphor icons packaged by weight** (carried from audit 2's 06). Now 16 icons in 20 shipped
   files, 42 KB of definitions of which roughly two thirds are weights never drawn; the admin
   review room alone carries 14.5 KB for four decorative glyphs. Same recommendation as audit 2:
   do it with before/after screenshots, or decline and keep the freedom to change a weight in a
   prop. *(rows: bundle-build-12)*

## Not-findings

- **PostHog stays off the critical path**: `24740q0lmcv1n.js` (245 KB raw / 79.3 KB gz) is in the
  eager set of 0 of 118 routes; `posthog-client.ts` still schedules `import("posthog-js")` on
  `requestIdleCallback` with a 2 s ceiling. `instrumentation-client.ts` is new since audit 2 and
  is 2.6 KB inside the react-dom floor chunk (`noteNavigationStart` for `back-closes.ts`); fine.
- **LazyMotion holds**: `motion-features-max.ts` is the static `domMax` module the campaign's B8
  made; the 72 KB barrel chunk is gone; 74 non-lab files import from `motion/react` and the named
  imports are `m` (66), `AnimatePresence` (37), `useMotionValue` (7), `useTransform` (5),
  `useSpring`/`useAnimate`/`animate` (3 each), `useScroll` (1, still only the switched-off
  `showcase-shot.tsx`), `LayoutGroup` (1, `feed/new-post-dock.tsx`, legitimate), `LazyMotion`,
  `domMax`; zero `motion.` namespace imports outside the lab (25 lab files keep it, by design, and
  their 57 KB eager `domMax` chunk `3w4oue-auieyk.js` is on 25 lab routes only).
- **No server-only module reaches a client chunk**: over all 311 production JS chunks,
  `PrismaClient`, `@prisma/client`, `sharp`, `@aws-sdk`, `S3Client`, `bcrypt`, `nodemailer`,
  `pg-pool`, `@sentry`, `DATABASE_URL`, `AUTH_SECRET`, `process.env`, `upstash`, `cities500`,
  `server-only` all 0 files; `prisma` 1 (inside `/lab/everything`'s quoted audit prose), `resend`
  13 (the `resendVerification` action name), `razorpay` 1 (the support checkout client). Zero of
  the 214 non-lab `"use client"` files import `@/lib/prisma`, `@/lib/auth`, `next/headers`, `fs`,
  `@/lib/storage`, `@/lib/email-queue` or `@aws-sdk`. `@sentry/nextjs` is imported only by
  `src/instrumentation.ts` and `src/lib/report-error.ts`, whose nine importers are all server
  modules.
- **`optimizePackageImports` coverage is complete**: `lucide-react` is on Next's default list
  (`config.js:1125`; 90 distinct icons used outside the lab), `@phosphor-icons/react` and `motion`
  are configured, `@base-ui/react` is imported by subpath at all 12 non-lab sites
  (`/select`, `/popover`, `/dialog`, `/tooltip`, `/separator`, `/menu`, `/input`, `/combobox`,
  `/button`), `d3-geo`/`d3-selection`/`d3-zoom`/`topojson-client` are imported only by
  `alumni-map.tsx` (behind B7's `dynamic`) and two lab rooms. Two files import
  `@phosphor-icons/react/dist/ssr` (`support-shell.tsx`, `letters-module.tsx`), the server-render
  entry, which is a barrel on the server side only; ESM tree-shaking handles it and no client
  bytes are involved. Nothing to add.
- **The 25 largest client files all need the boundary at file level** (probe: hooks / handlers /
  browser-API references): letterhead-profile 19/48/3, collection-client 61/26/44, hoopoe 28/3/0,
  create-post-form 22/26/8, contribute-room 26/24/14, image-viewer 25/12/33, comments-section
  21/19/13, alumni-map 11/12/12, photo-river 13/7/21, directory-client 18/19/1, reader 14/4/38,
  sidebar 6/14/1, settings-surface 7/17/0, post-card 19/24/2, review-room 20/20/5, houses-chain
  1/2/2 (rendered inside client parents), mascot-flight-layer 6/1/14, ambient-leaves 6/0/28 and
  perching-birds 6/0/14 (switched-off showcase), signup-form 21/22/11, person-detail 13/26/0,
  reader-parts 7/14/7, year-rail 18/4/11, dark-gauntlet 17/24/10, landing-hero 11/7/8. Fifteen
  client files have no hook, handler or browser reference at all - seven `ui/*` wrappers over
  base-ui primitives, the three moment wrappers, `auth-first-frame.tsx`, `admission-stamp.tsx`,
  `letter-title.tsx`, `guide-body.tsx`, `motion-features.tsx` - but dropping `"use client"` from a
  leaf that a client tree renders moves no bytes across the boundary, so there is nothing to
  gain. Same verdict as audits 1 and 2: the opportunities are behind-interaction splits (02, 07),
  not boundary moves. 214 non-lab client files total 2,371 KB of source.
- **`next/dynamic` coverage of the named heavy pieces**: the image viewer is lazy everywhere
  (B10's `lazy-image-viewer.tsx` is the one entry; no eager chunk contains it; nine lazy copies,
  see 11); the crop tool is lazy in the letterhead and in the onboarding photo step (B6); the
  d3 map stack is lazy with a preload (B7); the guide's chapters and overlay are lazy with a
  hover/focus warm-up (B5); the comments section is lazy on cards, letters and editions with a
  preload; the poll creator, mention dropdown and attach dialog are lazy with a focus warm-up;
  the location picker is lazy in the letterhead and the admin person page; the letters editor
  IS the `/letters/new` page (visible at rest, keep); the recorder lives inside the Catch-up
  answer surfaces, whose route (`/catchups/[catchupId]/answer`) carries 0 KB above the shell floor,
  so nothing to defer; the calling card is 4.8 KB (`get-in-touch.tsx`) with the JPEG conversion
  on demand; the 50-bird set is the shell-tier item in Owner decision 3; the admin panels are
  server-rendered and the admin routes sit at the floor (980 KB) plus 0-90 KB. The three things
  still eager that should not be are 02 and 07 above.
- **Fonts are correct as shipped and unchanged**: two families via `next/font/google`, latin,
  2 + 4 static weights, 9 woff2 files, one 9,453 B / 1,108 B gz font CSS on every route, two files
  preloaded per page (`next-font-manifest.json`: `38df7484…s.p.` 33,852 B and `47df9ba1…s.p.`
  28,792 B = 62.6 KB, the same two as audit 2). The lab's 66 extra font files (2,818 KB) are
  referenced only by the type and craft rooms' CSS. No external font request, no `@font-face` in
  `globals.css`.
- **Images**: 13 non-lab files use `next/image`, 25 non-lab `<img>` sites, and every `<img>` I
  opened carries the media campaign's reason (an R2 URL through `image-cdn.ts`'s ladder, the
  viewer's zoom copy, the carousel, the photo frame) - the one that does not is the Catch-up
  picker (04). The world atlas is fetched from `/geo/` with an immutable header, not compiled
  in (audit 1's row, holding).
- **Third-party scripts**: Turnstile loads `challenges.cloudflare.com/turnstile/v0/api.js` from
  a `document.createElement("script")` when the widget mounts on `/signup` (once, memoised in
  `scriptPromise`); Razorpay's checkout script is on the support page's contribution flow. Neither
  is in any first-load chunk set; both are CSP-allowlisted by host. Sentry has no browser SDK
  (`instrumentation.ts`'s decision; `clientTraceMetadata` deleted in `next.config.ts`).
- **The member stylesheet has no dead rules by this measurement** (08's 0.4 KB aside): 2,025 of
  2,242 leaf rules reach shipped source, 146 are class-less base/preflight/`@property`/keyframes,
  0 are lab-only. The campaign's predicted "near 172 KB raw / 25.7 KB gz" landed at 171,870 /
  26,544 and has not re-grown in 347 commits.
- **`/dark-mode` at 1,085 KB is by design**: the gauntlet (`dark-gauntlet.tsx`, 603 lines) draws
  the bird and runs the sequence API at rest; its private 106 KB is the rig 31.9, the engine 33.7,
  the field/sequence chunk 27.5 and the gauntlet's own 14.5 KB ("Are you sure you want dark
  mode?"), all on screen.
- **Every page is dynamic (`ƒ`)**: unchanged and still right (theme cookie, `auth()`); the five
  `○` entries are icons, the manifest, robots and the sitemap.
- **The (main) layout's `DemoBar`/`VerifyEmailBanner` static imports**: 3.5 KB + 3.1 KB in the
  shell chunk `29vabufhtu26_.js`, unchanged from audit 2's re-check; tried, measured and reverted
  in audit 1; not reopened.
- **`inlineCss`**: still wrong here for the same reason (26.5 KB gz of CSS on every HTML response
  for members who return daily). Recorded so nobody proposes it.

## Audit carry-overs in this territory

- audit-2 `bundle-build-01` / B8 (domMax feature module): **done** (`motion-features-max.ts`);
  holds; the 72,472 B barrel chunk is gone.
- audit-2 `bundle-build-02` / A-phase CSS rows (lab and docs out of the sheet): **done**;
  member sheet 171,870 B / 26,544 gz; lab share 0 rules; `lab.css` on `/lab` only; the
  `.hoopoe .wing` block (audit 2's 10) moved there.
- audit-2 `bundle-build-03` / B5 (guide chapters): **done**; `guide-layer.tsx:28` dynamic with
  the door's hover/focus warm-up; chapters in no member first load.
- audit-2 `bundle-build-04` / B9 (chunk duplication): **closed as not-finding by the campaign
  with numbers**; this report's 11 re-counts it and 03 is the source-level lever it lacked.
- audit-2 `bundle-build-05` / B6 (Combobox on `/welcome` and `/admin/people/[id]`): **done**
  (`onboarding-flow.tsx:61-68` lazy steps with preloads, `person-detail.tsx:582` lazy picker);
  `/welcome` 1,190 -> 1,062 KB, `/admin/people/[id]` 1,157 -> 1,022.
- audit-2 `bundle-build-06` (phosphor by weight): **open, owner**; restated in Owner decision 4
  with 16 icons / 42 KB.
- audit-2 `bundle-build-07` / G1 (lab in the build): **the demo half shipped** (`pageExtensions`);
  the owner's-build half **owner-declined, still open**; restated in 09 and Owner decision 2.
- audit-2 `bundle-build-08` (the shell tier): **the denominator moved** - 16 chunks / 434 KB ->
  13 chunks / 358 KB raw (120 KB gz) after B2, B3, B5.
- audit-2 `bundle-build-09` (Sentry telemetry): **done** (`telemetry: false` in `next.config.ts`).
- audit-2 `bundle-build-10` (`.hoopoe .wing`): **done** (moved to `lab.css`, not deleted, with the
  room that uses it named).
- B2 (hoopoe rig deferral): **done for the perch and the logo egg; incomplete for the moments** -
  this report's 02.
- B7 (d3 map on demand): **done**; `directory-client.tsx:46-48`; `/directory` 1,231 -> 1,169.
- B10 (one lazy viewer entry): **done**; `lazy-image-viewer.tsx`; nine lazy copies remain by
  chunking (11).
- B11/B12 (report and moderation dialogs lazy): **done**; `letter-menu.tsx:55-67`,
  `post-card.tsx:74-85`.
- Audit-1 `bundle-build-10` (bird sprite): **open, owner**; new fact in Owner decision 3.
- Audit-1 `bundle-build-03` step 2 (dynamic map): superseded by B7 (done with a preload).
- Landing showcase family (Q1, keep): **still switched off**; `showcase-shot.tsx` still the one
  `useScroll` importer; ships nowhere.

## For other lenses

- tracked-weight: `public/images/catchups/*.webp` (3.35 / 1.84 / 1.60 MB, 4,608 px) - 04 is the
  runtime half; `public/images/birds/` 102 PNGs / 702 KB (2026-09-11) is new since audit 2;
  `public/images/landing.jpeg` (498 KB) is used only by lab rooms; `landing-original.jpeg` (6.2 MB)
  is untracked and local-only.
- lab: `/lab/catchups/sketches` and `/lab/catchups/capsule` carry `1h284jke63n28.js` (429 KB raw /
  128.7 KB gz), the fixture JSON compiled into a client chunk - the largest chunk in the build;
  `/lab/profiles` carries 142 KB of profile variants; `/lab/catchups/magazine` reads
  `scripts/dev/.exports/**` at request time (23.8 MB traced locally); `/lab/birds-bg` and
  `/lab/centroid` `readFileSync` a JSON they could import; `/lab/directory` still compiles the
  world atlas (`2rghf1hhqy35w.js` 94 KB) that the shipped map fetches from `/geo/`; the magazine
  engine's home (06).
- catchups: `picture-picker-dialog.tsx`'s two `<img>` (04); `home-head.tsx`'s `sizes` ceiling.
- mascot / shell: the three moment wrappers and `ResidentHoopoe`/`CelebrationHoopoe` (02);
  `hoopoe.tsx` is 1,701 lines / 79 KB of source, the third-largest client file.
- shell-primitives: `src/app/error.tsx` (03); `verified-mark.tsx` (07).
- lib-core-config: `storage.ts`'s `process.cwd()`/`public` joins (01) - the fix is in
  `next.config.ts`, the cause is there; `prisma.ts`'s schema fingerprint is production-guarded
  (fine).
- dependency-diet: `meriyah` (two copies, 0.62 MB in every trace) is Sentry's, not ours; `d3-*`
  and `topojson-client` are runtime dependencies used only by a lazily loaded map and two lab
  rooms (correctly placed); `shadcn` is still a build dependency in dev clothing (audit 2's note).
- docs: OPERATIONS.md's analyzer paragraph should say the analyzer is a separate compile and that
  `route-bundle-stats.json` is the first-load source of truth (TRAPS already says the
  `generateComponentChunks` half); the "Cold vs warm" build note in 10.
- scripts-e2e-ci: nothing in `scripts/` is in a shipped bundle; `scripts/dev/.exports` is read by
  one lab room at request time.

## Metrics

- **Build** (`raw/build.txt`, load 15-27, cold cache): wall 952.9 s = config 11.5 s + compile
  498 s + Sentry hook 2.4 s + TypeScript 408 s (cache write 294 s overlaps it) + static 9.3 s +
  finalize; CPU 162 s user + 242 s sys; 118 page routes (66 lab, 52 shipped) + 18 API + 5 static
  metadata; 109 pages generated; `.next` 924 MB excluding `dev` = cache 719 MB + server 149 MB
  (108.9 MB of it source maps) + diagnostics 68 MB + static 12 MB; `static/chunks` 311 JS files
  8,094 KB raw / 2,727 KB gz + 5 CSS files 380 KB; `static/media` 75 files 3,040 KB. Audit 2:
  wall 42.3 s (compile 20.3, TS 14.6, static 0.68, hook 0.63), 100 routes, 231 chunks, cache
  618 MB - not comparable on time, comparable on counts.
- **Floor of a member page**: 14 root chunks on all 118 routes = **635,585 B raw / 196,655 B gz**
  (audit 2: 621.1 KB / 192.6 KB; unchanged): react-dom client 226 KB (gz 70.6), Next
  segment-cache + router 126 KB (33.9), sonner + `m` 45.6 KB (14.0), motion-dom core 38.6 KB
  (13.4), react + navigation 31.1 KB (8.5), tailwind-merge + `cn` 28.9 KB (9.6), RSC client 26.2 KB
  (8.5), link + button chain 22.5 KB (8.8), providers/theme/mascot kit 19.4 KB (7.6), root
  error boundary + button chain 14.6 KB (5.8 - finding 03), layout-router 14.5 KB (3.9), global
  error + instrumentation 14.7 KB (4.5), Turbopack runtime 10.7 KB (4.3), one-hoopoe guard 1.5 KB.
  Plus the (main) shell tier, 13 chunks on all 39 member routes = **366,738 B raw / 122,984 B gz**
  (audit 2: 16 chunks / 434.4 KB / 147.4 KB): base-ui focus/dismiss/portal 59.3 KB, sidebar +
  sheet + Tree + banner + next-auth/react 46.8 KB, bird-avatar-v2 46.3 KB, base-ui Menu 39.5 KB,
  floating-ui core/dom 34.2 KB, base-ui list/hover/typeahead 31.4 KB, dialog + button chain
  28.4 KB, next/image + link + bird wrapper 25.9 KB, auto-animate + popup store 23.6 KB, bell +
  demo-bar + konami + presence + guide-layer 21.1 KB, (main) error 1.0 KB, template 0.4 KB, 0.3 KB.
  **Member-page floor = 979 KB raw / 312 KB gz** (audit 2: 1,055 / ~340), plus the stylesheet
  171,870 / 26,544, the font CSS 9,453 / 1,108 and two preloaded woff2 62.6 KB. Public pages stop
  at the root set: 621-629 KB raw / 192-196 KB gz.
- **Per route** (`raw/route-js.txt`, 52 shipped, raw KB / gz KB / private KB above floor+shell):
  `/profile/[id]` 1,240 / 402 / 261; `/feed` 1,188 / 383 / 209; `/directory` 1,169 / 377 / 190;
  `/catchups/[catchupId]` 1,148 / 370 / 169; `/catchups/edition/[editionId]` 1,104 / 355 / 125;
  `/catchups/new` 1,089 / 350 / 111; `/dark-mode` 1,085 / 348 / 106; `/messages` 1,073 / 345 / 95;
  `/catchups` 1,072 / 345 / 93; `/admin/content` 1,068 / 343 / 90; `/admin/people` 1,065 / 342 /
  86; `/welcome` 1,062 / 341 / 83; `/collection` and `/collection/[id]` 1,059 / 342 / 81;
  `/admin/review` 1,052 / 338 / 73; `/letters/new` and `/letters/[id]/edit` 1,026 / 329 / 47;
  `/admin/people/[id]` 1,022 / 327 / 43; `/letters/[id]` 1,006 / 322 / 27; `/letters` 1,002 / 321 /
  23; `/support` 994 / 317 / 16; `/messages/[id]` 994 / 318 / 15; `/admin/reports` 991 / 317 / 12;
  `/pick-bird` 987 / 316 / 8; `/admin/mail` 985 / 315 / 6; twelve routes at 979-980 / 312-313 / 0-1
  (the admin index pages, `/about`, `/birds`, `/guide`, `/guide/[area]`, the two Catch-up
  sub-routes); `/signup` 780 / 248; `/login` 765 / 244; `/catchups/join/[token]` 764 / 242; `/` 763
  / 242; `/reset-password` 761; `/forgot-password` 758; `/verify-email` 745; `/hoopoe` 732;
  `/guidelines`, `/privacy`, `/terms` 629 / 196; `/_not-found`, `/catchups/join` 621 / 192.
  Shipped median 985 / 315 (audit 2: 1,069 raw; campaign close: 992); sum 48.34 MB over 52 (48.99
  over 51 at campaign close); lab sum 51.29 MB over 66 (36.70 over 48). Since the campaign closed:
  `/profile/[id]` +41, `/directory` +43, `/welcome` +20, `/letters/[id]` +22, `/` +14, `/login` +9,
  `/signup` +9, `/feed` -13.
- **What makes the outliers**: `/profile/[id]` = post-card + carousel + phosphor 50.7 KB,
  letterhead + profile tools 45.0, the motion engine 32.9, the hoopoe rig 31.1 (02), houses-chain +
  popover 23.2, get-in-touch + pen 22.1, verify dialogs + sequence 18.0, field validation 18.0,
  tooltip + verified mark 17.8 (07), poll creator 2.0; `/feed` = post-card 50.7, post-feed +
  search pill + photo-aim + composer CTA 49.7, engine 32.9, rig 31.1 (02), composer 23.9, field
  18.0; `/directory` = engine 32.9, dialog + field 31.2, rig 31.1 (02), directory client + search
  30.4, filters + popover 25.1, people search + empty states 20.1, tooltip + verified mark 17.1
  (07); `/catchups/[catchupId]` = settings surface + attach + photo-aim 43.8, engine 32.9, rig
  31.1 (02), home + answer surfaces 26.0, field + caret 17.9, almost-ready + sequence 16.7.
- **Stylesheet**: member 171,870 B raw / 26,544 B gz, 2,242 leaf rules (2,025 shipped, 146
  class-less, 7 test-only, 0 lab-only); lab 169,614 / 23,105 on `/lab` only; font CSS 9,453 /
  1,108; lab font CSS 23,686 + 5,824. Audit 2: one sheet 238,434 / 33,666 with 874 lab-only rules.
- **Chunks**: 311 JS, 8,094 KB raw / 2,727 KB gz; 108 chunks / 3,871 KB eager on lab routes only;
  111 / 2,535 KB eager on some shipped route; 92 / 1,688 KB lazy-only. Top five: `1h284jke63n28`
  429 KB (lab fixtures), posthog 245 KB (lazy), react-dom 226 KB (floor), `36q3wjbrivkvt` 139 KB
  (lab profiles), `2toa029--llh9` 135 KB (lab landings). `raw/chunk-sizes-top30.txt`.
- **Duplication**: button cluster in 3 first-load chunks on 46 routes; motion engine in 28
  chunks (never twice per route); viewer in 9 lazy chunks; Sentry SSR chunk 4 x 2,013,435 B.
- **Server trace**: `/feed` 771 files / 52.5 MB (libvips 17.3, `public/` 21.2 of which 13.5
  tracked, Prisma 4.6, server chunks ~4, Sentry SSR 1.9); union over 143 traces 97.7 MB / 1,957
  files (`scripts/dev` 22.9 local-only, server chunks 22.4, `public/` 21.2, libvips 17.3, Prisma
  4.6, `server/app` non-lab 2.4, lab 1.1). Audit 2: "a 35.9 MB function".
- **"use client"**: 341 files, 214 non-lab (2,371 KB source); 0 import server-only modules; 15
  have no hook/handler/browser reference.
- **Fonts**: 75 files / 3,040 KB; app 9 woff2 / 222 KB, 2 preloaded (62.6 KB); lab 66 / 2,818 KB.
- **Images**: `public/` 22.0 MB on disk (17.9 MB `images`, 3.9 MB `lab`, 0.1 MB `geo`); three
  Catch-up pool files 6.8 MB at 4,608 px; 102 bird PNGs 702 KB; 13 `next/image` files, 25 `<img>`
  sites outside the lab.
- **Second builds requested** (on a quiet machine, paired with a plain build of the same commit
  and cache state): (a) `experimental.serverSourceMaps: false` + `experimental.turbopackSourceMaps:
  false` - record `du -sk .next/server`, `.map` count, the three phase lines (05); (b) a lab-free
  build via a temporary `pageExtensions` without `"lab.tsx"` - record routes, `static/chunks`,
  `static/media`, `server/app`, the three phase lines (09); (c) optional, beside (a): whether any
  setting collapses the four 2 MB Sentry SSR chunks to one (11).
- Lines read: ~2,600 of source and config directly (next.config 461, the two layouts, the
  boundaries, the motion and analytics kit, storage's branch, the picture files, the wrappers), ~800
  of Next docs and config, ~1,100 of audit-2's report and fix-prompt, plus the decoded analyzer
  data for all 145 entries, 311 chunk files by size/gzip/string, five CSS files, 143 `.nft.json`
  files and the four raw files I wrote (`route-bundle-stats.json` extended with
  `firstLoadGzipBytes`, `firstLoadChunkCount` and a per-chunk `{file, bytes, gzip}` list;
  `route-js.txt`; `chunk-sizes-top30.txt`; `css-size.txt`).
