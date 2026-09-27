# Charter: bundle-build (L03, cross-cutting lens)
Report: `work/agents/bundle-build.md`. See `_header.md`.

**Grants beyond the common rules**: you may read the production build output at `.next/`
(server/, static/chunks/, diagnostics/) and `raw/build.txt`, `raw/build-setup.txt`,
`.next/diagnostics/analyze/**` (Next's `experimental-analyze --output` data, 68 MB, read in place — check
`raw/analyze-run.txt`); you may run `node -e`/`node <script>` over those files; you may write
**exactly these extra files** beside your report: `raw/route-bundle-stats.json` is ALREADY there (Next 16.3 writes `.next/diagnostics/route-bundle-stats.json` itself; the orchestrator copied it and derived `raw/route-js.txt`) — verify it, extend it (per route:
`firstLoadUncompressedJsBytes`, `firstLoadGzipBytes` if you can compute it, chunk list),
`raw/route-js.txt` (the table, sorted), `raw/chunk-sizes-top30.txt`, `raw/css-size.txt`. Do NOT
run another build; if a second build (e.g. lab-free, or with a change) would answer a question,
write the exact request in your report and the orchestrator will run it. Do not touch `.next/dev`
(the peer's dev server).

## Baselines to compare against
Audit 2 (`docs/audit-fix/2026-09-03-refactor-audit-2/work/raw/`: `build.txt`,
`route-bundle-stats.json`, `chunk-sizes-top30.txt`, `css-lab-share.txt`): build 42.3 s (compile
20.3, TypeScript 14.6, 105 pages); 100 routes (52 shipped); shipped median first-load 1,069 KB,
floor 1,055 KB (14 root chunks 621 KB + (main) shell 434 KB); /profile/[id] 1,258, /directory
1,231, /feed 1,225, /welcome 1,190, landing 899, login 907; one 233 KB / 33.5 KB-gz stylesheet
on every route, of which the lab's share was 73 KB. The campaign then shipped phase B (bundle
levers) and G1 (lab out of the demo build only). Measure what actually landed.

## What to produce
1. **The build**: wall time and phases from `raw/build.txt`; route count; artifact size
   (`du -sh .next` minus `.next/dev`; `.next/static` alone); what the 66 lab routes add (count them
   in the route list; estimate their share of `static/` and `server/app/lab`).
2. **Per-route first-load JS** for every route, derived the way audit 2 did (read its
   `route-bundle-stats.json` shape and its bundle-build report's method section); the shared floor
   (root chunks + `(main)` shell); the outliers with the module that makes them outliers.
3. **The stylesheet**: bytes raw/gz now; the lab's share now (audit 2 measured it three ways —
   pick one, reproduce it from the class names in `.next/static/chunks/*.css` vs source files).
4. **`"use client"` triage** (341 files, 214 non-lab — `raw/use-client.txt`): the 25 largest client
   subtrees by bytes; for each, is the boundary too high (a leaf needs state, the tree does not)?
   Server-only modules imported across the boundary.
5. **Dynamic imports** (84 sites, `raw/dynamic-imports.txt`): what is still eager that should be
   lazy — the image viewer, crop tool, voice recorder, d3 map stack, magazine engine, confetti/
   celebration, admin-only panels, the 50-bird SVG set (`bird-avatar-v2.tsx`, 1,621 lines), the
   rich-text editor, the calling card/vcf.
6. **`optimizePackageImports`** coverage in `next.config.ts` vs the heavy packages actually
   imported (`lucide-react`, `@phosphor-icons/react`, `motion`, `d3-*`, `@base-ui/react`); the two
   barrels (`src/lib/magazine/index.ts`, `guide/chapters/index.tsx`).
7. **Fonts**: `next/font` subsets, woff2 count in `.next/static/media`, the lab's Google fonts.
8. **Images**: `next/image` vs raw `<img>` census; the multi-MB `public/images/catchups/*.webp`
   (3.19 / 1.76 / 1.53 MB) — how are they rendered and at what size; anything served unoptimised.
9. **Third-party**: is `posthog-js` in any first-load set? Sentry in the client bundle? LazyMotion
   strays (`import { motion }` outside the lab)?
10. **Per-route server output**: the largest `server/app/**` pages and why.

Give every number with the command that produced it.
