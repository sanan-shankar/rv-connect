# dependency-diet - simplification audit report

Cross-cutting lens over every entry in `package.json`: 45 runtime dependencies, 16
devDependencies, 61 total, 1.3GB / 737 folders in node_modules. For each: where it is
imported, how many sites, what it costs (wire when client-relevant, disk when not), whether
it sits in the right section, whether a lighter substitute exists, and whether anything is
imported without being listed. Date: 2026-08-25. Files in territory: package.json plus every
import site it implies; read fully: package.json, next.config.ts, prisma.config.ts,
src/lib/{auth,storage,rate-limit,prisma(1-80)}.ts, src/components/directory/alumni-map.tsx
(imports + structure), src/lib/map-cluster.ts (header), scripts/qa/npm-audit-gate.mjs,
.github/workflows/check.yml, .github/renovate.json, .puppeteerrc.cjs, and headers of
email.ts, posthog-provider.tsx, dev-login/route.ts, import-roster.mjs, gen-support-qr.mjs.

## Coverage

- Read fully: the files above, docs/OPERATIONS.md, docs/TRAPS.md, brief-common.md, CLAUDE.md,
  AGENTS.md, raw/knip.txt + raw/knip-production.txt dependency sections, raw/analyze-build.txt,
  raw/route-js.txt (head).
- Skimmed (why): docs/spec/DESIGN-SYSTEM.md — grepped for the icon and motion rules only,
  which are the parts that bind dependency verdicts. src/lib/prisma.ts below line 80 (demo
  guard, not dependency-relevant).
- Not read (why): package-lock.json linearly — queried via `npm ls` and
  `node_modules/*/package.json` instead, per charter. The 23 puppeteer scripts' bodies —
  the scripts lens owns their fate; I confirmed the import and the config.
- Uncommitted edits seen (someone else's WIP): none by the time I read. The charter warned of
  uncommitted edits to next.config.ts, src/lib/admin.ts and others; those landed as commit
  `c74d99f` ("feat(admin): a non-admin who asks for /admin is told 'nice try'") before my
  first read, and `git status --short` showed only this audit's own untracked files. Every
  judgement here is against committed state.
- Verification method note: all import counts are `grep -rE "from \"<pkg>[\"/]"` over
  src/scripts/e2e/prisma plus the root configs, with `.css` checked separately (that second
  pass is what caught tw-animate-css, which a `.ts*`-only grep calls unused). Wire sizes
  marked "(bundlephobia)" were fetched live for the installed version; sizes marked "(est.)"
  are reasoned from disk size and are honestly softer.

## Summary

This is a disciplined dependency list by AI-maintained-codebase standards — most of the 61
entries are real, used, and defensible, and the repo's own docs already argue for the
expensive ones (two icon sets, two analytics SDKs, motion everywhere). The rot is
concentrated in three places. First, the **map's history**: the shipped map hand-rolled its
own clustering (`map-cluster.ts`, which says so in its header) and its own radius math, but
`supercluster`, `d3-scale` and their two @types packages were never removed — four dead
runtime deps confirmed dead by knip and by zero non-comment references. Second, **section
placement**: two CLIs (`prisma`, `shadcn`) and three build/dev-time packages (`pg`, `dotenv`,
`tw-animate-css`, plus four `@types/*`) sit in runtime `dependencies`; harmless on Vercel,
which installs devDependencies, but wrong, and in prisma's case it keeps ~121MB of CLI
machinery (`prisma` 42MB + `effect` 33MB + `@electric-sql/pglite` 26MB + `@prisma/dev` 19MB)
inside the production dependency graph that `npm audit --omit=dev` gates — the one
owner-accepted allowlist entry (deepmerge-ts via @prisma/config) exists only because of this
placement. Third, **three unlisted transitive imports** (`d3-selection`, `geojson` types,
`@auth/core/jwt`) that work today by hoisting luck and break the day a lockfile refresh
reshuffles them. The genuinely removable code-level find is `@auth/prisma-adapter`: sessions
are JWT, the only provider is Credentials, no app code touches Account/Session/
VerificationToken, so the adapter is a two-line deletion that also orphans three Prisma
models (schema lens's call). Structural vs cheap: essentially all structural — the whole
lens is dead/relocate. Client-JS wins are modest and honest: ~1.6KB (Vercel Analytics, owner
call) and ~15-20KB gz (LazyMotion, T3); everything else removable is server- or dev-side.
What surprised me: the installed prisma family disagrees with itself (client 7.5.0, adapter
7.8.0, CLI 7.9.1) in direct violation of the repo's own Renovate rule, and nothing noticed
because the drift lives in the lockfile, not package.json.

## The full 61-row table

Site counts are grep hits (import/require lines) across src + scripts + e2e + root configs;
"src N / scr M" splits them where the split matters. "KB" is min+gzip where known. Section
verdicts: OK = right section; DEV = should be devDependencies; RM = remove.

### dependencies (45)

| # | package (installed) | sites | cost | sect. | verdict | gate |
|---|---|---|---|---|---|---|
| 1 | @auth/prisma-adapter 2.11.3 | 1 (auth.ts:4,58) | 36KB disk, server | RM | **remove** — JWT strategy + Credentials-only; adapter never called (finding 04) | `npm run test:e2e` sign-in, security-regressions.test.mjs |
| 2 | @aws-sdk/client-s3 3.1076.0 | 1 (storage.ts) | 11MB disk (with @aws-sdk shared), server-only | OK | keep; aws4fetch noted as later lever (finding 17) | `npm run check` |
| 3 | @aws-sdk/s3-request-presigner 3.1098.0 | 1 (storage.ts:8) | (in above) | OK | keep (presigned direct PUT is load-bearing, TRAPS "direct-upload PUT") | upload flow |
| 4 | @base-ui/react 1.3.0 | 14 files (ui/*, filters, location-picker) | 14MB disk; per-component tree-shaken | OK | keep — shadcn base-nova base (brief §3) | — |
| 5 | @formkit/auto-animate 0.9.0 | 12 files | ~3KB gz (est.) | OK | keep — "Auto-animate is mandatory on every list" (DESIGN-SYSTEM.md:349) | — |
| 6 | @paralleldrive/cuid2 3.3.0 | 12 (7 src, all server; 5 QA probes) | 0KB client; 0.9MB + @noble/hashes 2.0.1 disk | OK | optional **replace with crypto.randomUUID** (finding 14) | `npm run check`, upload+support flows |
| 7 | @phosphor-icons/react 2.1.10 | 16 files (12 shipped, 4 lab; 14 distinct icons; 3 via /dist/ssr) | 57MB disk; per-icon after optimizePackageImports | OK | keep — deliberate dual set (not-finding 1) | — |
| 8 | @prisma/adapter-pg 7.8.0 | 3 (prisma.ts + 2) | server | OK | keep; align version with family (finding 10) | `npm run check` |
| 9 | @prisma/client 7.5.0 | 46 (src+scripts, via src/generated) | 174MB disk (@prisma total), server | OK | keep; **installed version lags CLI by 4 minors** (finding 10) | `npm run check` |
| 10 | @sentry/nextjs 10.70.0 | 3 (instrumentation.ts, next.config.ts, report-error.ts) | 86MB disk; 0KB client (no instrumentation-client.ts exists — verified) | OK | keep — server-only confirmed (not-finding 8) | — |
| 11 | @types/bcryptjs 2.4.6 | 0 | 20KB disk | RM | **remove** — bcryptjs 3.0.3 ships own types (`umd/index.d.ts`); this types the OLD v2 API (finding 07) | `npm run check` (tsc) |
| 12 | @types/d3-scale 4.0.9 | 0 | 144KB disk | RM | **remove** with d3-scale (finding 01) | `npm run check` |
| 13 | @types/d3-zoom 3.0.8 | 0 direct (tsc-implicit for 2 d3-zoom sites) | 48KB disk | DEV | **move to devDependencies** (finding 09) | `npm run check` |
| 14 | @types/supercluster 7.1.3 | 0 | 20KB disk | RM | **remove** with supercluster (finding 01) | `npm run check` |
| 15 | @upstash/ratelimit 2.0.8 | 1 (rate-limit.ts; 14 limits, 17 importer files) | server | OK | keep (not-finding 6) | — |
| 16 | @upstash/redis 1.38.2 | 1 (rate-limit.ts:2) | server | OK | keep | — |
| 17 | @vercel/analytics 2.0.1 | 1 (app/layout.tsx:3,109) | 1,571B gz (bundlephobia) + third-party loader script | OK | **owner-call: remove** — PostHog is the documented analytics (finding 13) | `npm run visual`, console clean |
| 18 | bcryptjs 3.0.3 | 13 (4 src: auth, auth-actions, email-actions, settings; 9 scripts) | 140KB disk, server-only | OK | keep — hashing swap is a data migration, flagged not proposed (not-finding 9) | — |
| 19 | class-variance-authority 0.7.1 | 4 (3 `cva()` calls: button, badge, tabs; 1 type import) | ~1KB gz (est.) | OK | keep — shadcn convention, cost negligible | — |
| 20 | clsx 2.1.1 | 1 (utils.ts `cn()`, fan-in 165) | ~0.4KB gz | OK | keep | — |
| 21 | d3-geo 3.1.1 | 2 (alumni-map.tsx, lab/_maps.tsx; only geoNaturalEarth1+geoPath) | ~6KB gz tree-shaken (est.) | OK | keep (shipped map) | — |
| 22 | d3-scale 4.0.2 | **0** (comments only) | 244KB disk + sub-deps | RM | **remove** — replaced by `sqrtRadius` in map-cluster.ts (finding 01) | `npm run check`, /directory |
| 23 | d3-zoom 3.0.0 | 2 (same two maps) | 15.5KB gz with deps (bundlephobia) | OK | keep | — |
| 24 | dotenv 17.4.2 | 16 (0 src; prisma.config.ts, e2e/playwright.config.ts, 14 scripts) | dev-time only | DEV | **move to devDependencies** (finding 08) | CI `npm ci` + postinstall generate |
| 25 | lucide-react 0.577.0 | 141 files, 115 distinct icons | 46MB disk; per-icon, auto-optimised by Next | OK | keep — the UI-chrome set (CLAUDE.md) | — |
| 26 | motion 12.38.0 | 86 files, all `motion/react`; zero LazyMotion | 42,562B gz full (bundlephobia); wrapper 708KB + framer-motion 5.6MB disk | OK | keep; **LazyMotion opportunity ~15-20KB gz** (finding 12) | `npm run visual` |
| 27 | next 16.3.1 | 286 | framework | OK | keep | — |
| 28 | next-auth 5.0.0-beta.32 (exact) | 9 | ~30KB server (est.) | OK | keep — pin is deliberate (renovate.json) | — |
| 29 | next-themes 0.4.6 | 4 (layout, sonner, lights-on, dark-gauntlet) | ~2KB gz (est.) | OK | keep — dark mode | — |
| 30 | pg 8.22.0 | 16 (0 src; run-sql.mjs, importers, probes, ops) | 140KB disk | DEV | **move to devDependencies** — runtime pg arrives via @prisma/adapter-pg's own `"pg":"^8.16.3"` dependency, verified in its package.json (finding 08) | `npm run check`; a probe script run |
| 31 | posthog-js 1.418.1 | 3 files (provider, identify + /react subpath) | 81,584B gz (bundlephobia) | OK | keep — the chosen analytics, proxied via /ingest (OPERATIONS §7) | — |
| 32 | prisma 7.9.1 | 1 (prisma.config.ts `prisma/config`) + postinstall script | **121MB disk tree** (prisma 42MB + effect 33MB + @electric-sql 26MB + @prisma/dev 19MB) | DEV | **move to devDependencies** (finding 02) | CI run (postinstall on `npm ci`), Vercel deploy |
| 33 | react 19.2.4 (exact) | 220 | framework | OK | keep | — |
| 34 | react-dom 19.2.4 (exact) | 2 | framework | OK | keep | — |
| 35 | resend 6.20.0 | 1 (email.ts, the one mail choke point) | 268KB disk, server | OK | keep | — |
| 36 | shadcn 4.1.0 | **0 imports** (CLI; components.json is its config) | ~21.7MB tree (shadcn 6.4 + @ts-morph 12.5 + ts-morph 1.4 + @dotenvx 1.4) | DEV | **move to devDependencies** (or drop and use npx) (finding 03) | `npx shadcn add` still works |
| 37 | sharp 0.35.3 | 8 (server libs + gen-support-qr) | 18MB (@img), server, in serverExternalPackages | OK | keep | — |
| 38 | sonner 2.0.7 | 58 files | 9,390B gz (bundlephobia) | OK | keep — the toast system | — |
| 39 | supercluster 8.0.1 | **0** (comments only in map-cluster.ts, city-coords.ts, alumni-map.tsx) | 72KB + kdbush 52KB disk | RM | **remove** — replaced by hand-rolled screen-space clustering, documented in map-cluster.ts:6-10 (finding 01) | `npm run check`, /directory, map-cluster tests |
| 40 | tailwind-merge 3.5.0 | 1 (utils.ts `cn()`) | ~7KB gz (est.) | OK | keep | — |
| 41 | topojson-client 3.1.0 | 2 (both maps) | ~2.5KB gz (est.) | OK | keep | — |
| 42 | tw-animate-css 1.4.0 | 1 (globals.css:2 `@import`; utilities consumed only by ui/popover.tsx) | ~0KB wire (Tailwind v4 emits only used utilities); 56KB disk | DEV | **move to devDependencies** — build-time CSS source, same class as tailwindcss itself (finding 09) | `npm run check`, `npm run visual` (popover open state) |
| 43 | world-atlas 2.0.2 | 2 (`world-atlas/countries-110m.json`) | 107.8KB raw / **39.0KB gz** (measured), statically imported into a "use client" file | OK | keep; dynamic-import is bundle-build's lever (For other lenses) | — |
| 44 | zod 4.3.6 | 6 (5 × `zod/v4`, 1 × type-only `zod`) | 58.4KB gz full (bundlephobia); tree-shakes | OK | keep; unify the `zod` vs `zod/v4` split (For other lenses) | — |
| 45 | next-auth's `@auth/core` — not listed, imported at dev-login/route.ts:38 | 1 | — | — | **fix**: import from `next-auth/jwt` instead (finding 06) | security-regressions.test.mjs, `npm run screenshot:auth` |

### devDependencies (16)

| # | package (installed) | sites | cost | sect. | verdict | gate |
|---|---|---|---|---|---|---|
| 46 | @next/bundle-analyzer 16.3.1 | 1 (next.config.ts:2,292) | 16KB + webpack-bundle-analyzer 1.6MB | RM | **remove** — provably inert on Turbopack (finding 05) | `npm run check`; a build log without the warning |
| 47 | @playwright/test 1.62.1 | 5 (e2e specs + config) | 14MB playwright-core | OK | keep — the visual suite | — |
| 48 | @tailwindcss/postcss 4 | 1 (postcss.config.mjs) | build | OK | keep | — |
| 49 | @types/d3-geo 3.1.0 | tsc-implicit | — | OK | keep (d3-geo has no bundled types) | — |
| 50 | @types/node 20 | tsc | — | OK | keep; note engines mismatch — CI runs Node 24, types say 20 (For other lenses) | — |
| 51 | @types/pg 8.20.0 | tsc-implicit for scripts | — | OK | keep (scripts import pg) | — |
| 52 | @types/react 19 | tsc | — | OK | keep | — |
| 53 | @types/react-dom 19 | tsc | — | OK | keep | — |
| 54 | @types/topojson-client 3.1.5 | tsc-implicit | — | OK | keep | — |
| 55 | eslint 9 | 1 (config) | — | OK | keep | — |
| 56 | eslint-config-next 16.2.0 (exact) | 2 (eslint.config.mjs) | — | OK | **bump to 16.3.x with next** — latest is 16.3.2, next is 16.3.1 (finding 11) | `npm run check -- lint` |
| 57 | jsqr 1.4.0 | 1 (gen-support-qr.mjs decode-back check) | 328KB disk | OK | keep (not-finding 11; knip false positive) | — |
| 58 | puppeteer 24.43.1 | 23 script files | 188KB + puppeteer-core 13MB + chromium-bidi 20MB; ~130MB Chrome in ~/.cache | OK | keep; extend skipDownload (finding 16); consolidation onto Playwright is a scripts-lens rewrite | `npm run screenshot`, `npm run verify:crawl` |
| 59 | qrcode 1.5.4 | 1 (gen-support-qr.mjs) | 948KB disk | OK | keep (committed SVG outputs; script is the regenerator) | — |
| 60 | tailwindcss 4 | 1 (globals.css:1) | build | OK | keep | — |
| 61 | typescript 5 | tsc | 23MB | OK | keep | — |
| 62 | xlsx 0.18.5 | 1 (import-roster.mjs via `createRequire` — invisible to knip AND to my first grep) | 7.4MB disk | OK | keep-with-eyes-open — known npm advisories, no npm-side fix exists (finding 15) | roster dry-run |

(45 + 16 = 61 listed; row 45 is the unlisted import, called out in place.)

### Floor totals

- **Removable now**: 7 — supercluster, @types/supercluster, d3-scale, @types/d3-scale,
  @types/bcryptjs, @auth/prisma-adapter, @next/bundle-analyzer. Plus 1 owner-call
  (@vercel/analytics) and 1 optional (@paralleldrive/cuid2). None of the 7 requires more
  than a 2-line code change.
- **Re-section (deps → devDeps)**: 6 — prisma, shadcn, pg, dotenv, @types/d3-zoom,
  tw-animate-css.
- **Additions required (the unlisted-transitive fix)**: 2 — `d3-selection: ^3.0.0` to
  dependencies, `@types/geojson` to devDependencies; plus 1 import rewrite
  (`@auth/core/jwt` → `next-auth/jwt`), which needs no addition.
- **Client JS attributable to replaceable deps**: ~1.6KB gz certain (@vercel/analytics,
  owner call) + ~15-20KB gz probable (motion → LazyMotion, T3). Everything else removable
  is server- or dev-side: honest client-KB-from-removals is small; this codebase's client
  weight lives in how deps are loaded (one `next/dynamic` in the whole app), which is
  bundle-build's charter.
- **Production dependency-graph disk** (what `--omit=dev` installs shed): ~121MB from
  prisma alone, ~22MB from shadcn, plus the seven removals ≈ **145MB, about 11% of
  node_modules, out of the production graph** — and the npm-audit-gate allowlist entry
  becomes deletable.

## Findings

### dependency-diet-01 - Remove the four dead map dependencies (supercluster, d3-scale, and their @types)
- **Where**: `package.json:37` (@types/d3-scale), `package.json:39` (@types/supercluster), `package.json:47` (d3-scale), `package.json:64` (supercluster)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip and knip-production both list all four as unused (raw/knip.txt:126-131).
  Confirmed independently: `grep -rn "supercluster" src --include=*.ts*` returns only
  comment lines — `src/lib/map-cluster.ts:6` ("The map used to cluster with supercluster,
  whose grouping radius..."), `src/lib/city-coords.ts:188`, `src/components/directory/
  alumni-map.tsx:98`. `grep -rE "from \"d3-scale"` over src, scripts, e2e: zero hits. No
  script imports either (`grep -rln "supercluster\|d3-scale" scripts` is empty — the
  map-cluster-verify.mjs QA script drives the browser, it does not import the library).
  Both were introduced by `790f7a3` ("feat: directory map-default browse, working world map
  with clustering") and orphaned when the shipped map hand-rolled screen-space clustering
  (`map-cluster.ts` header documents the New Delhi / Gurgaon bug that forced the rewrite)
  and radius maths (`sqrtRadius`).
- **What to do**: delete the four lines from package.json, run `npm install` to update the
  lockfile (also drops transitive `kdbush` and d3-scale's sub-deps). No source change: the
  comments that mention supercluster are history-carrying "why" comments and stay.
- **Saving**: 4 deps, ~500KB node_modules, 0 lines of code, 0 client KB (they were already
  never bundled — this is graph hygiene, not wire weight).
- **Risk & gate**: low. `npm run check` (tsc proves no type reference), then open
  `/directory` and zoom the map; `src/lib/map-cluster.test.mjs` (if present in the 75-file
  suite) must stay green.
- **Confidence**: high. The one thing that would change my mind: a dynamic
  `import("supercluster")` somewhere — I grepped for the string across src and scripts and
  there is none.
- **Notes**: this is the cleanest possible dependency kill: the replacement code documents,
  in its own header, why the dependency was abandoned. The @types pair dies with the
  packages; they are separately dead anyway (nothing imports the types).

### dependency-diet-02 - Move the prisma CLI to devDependencies (and reclaim the audit allowlist)
- **Where**: `package.json:57` (`"prisma": "^7.5.0"` in dependencies); `package.json:11`
  (`"postinstall": "prisma generate"`); `scripts/qa/npm-audit-gate.mjs:23-31` (the
  allowlist entry this placement forces)
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the only imports of the CLI's code are `prisma.config.ts:2`
  (`from "prisma/config"`) and the `postinstall` script — both build/dev-time. The CLI's
  dependency tree is enormous and measured: `node_modules/prisma` 42.9MB, `effect` 33.5MB
  (via @prisma/config), `@electric-sql/*` 25.9MB + `@prisma/dev` 18.8MB (the local-dev
  pglite server) ≈ **121MB**. Because it sits in `dependencies`, that whole tree is inside
  the graph `npm audit --omit=dev` gates (npm-audit-gate.mjs:64), which is the only reason
  the gate needs its one allowlist entry: GHSA-ggr8-5vv4-36mx, "deepmerge-ts... pulled only
  via @prisma/config" (npm-audit-gate.mjs:24-31). Vercel installs devDependencies before
  running the build (default `npm install`), and CI runs `npm ci` (check.yml), so
  `postinstall` still finds the CLI in both places. Prisma's own documentation has always
  put `prisma` in devDependencies and `@prisma/client` in dependencies.
- **What to do**: move the `"prisma"` line to devDependencies; `npm install`; verify
  `npm run check` locally (postinstall re-runs generate); after the next successful Vercel
  deploy, delete the GHSA-ggr8-5vv4-36mx entry from npm-audit-gate.mjs's ALLOWLIST (the
  advisory leaves the gated graph — its own `clearsWhen` is satisfied by a different route)
  and update the entry's companion test if `npm-audit-gate-rule` style tests pin the
  allowlist shape.
- **Saving**: 0 lines of app code; ~121MB out of the production dependency graph; minus ~10
  lines when the allowlist entry goes; a cleaner answer to every future `npm audit`.
- **Risk & gate**: low-medium, entirely deploy-side: the one failure mode is an install
  environment that omits devDependencies before postinstall (a future `npm ci --omit=dev`
  in some new pipeline would break generate — today none exists; check.yml uses plain
  `npm ci`). Gate: CI green on the commit, one Vercel deploy observed building.
- **Confidence**: high for local/CI, medium-high for Vercel (its devDep install behaviour
  is default but is platform config the owner could in principle have overridden; the
  fixer should watch the first deploy log).
- **Notes**: this does NOT shrink local node_modules (devDeps install locally regardless).
  The wins are correctness of the production graph, the audit-gate simplification, and any
  future `--omit=dev` consumer. Related: finding 10 (version skew inside the same family).

### dependency-diet-03 - shadcn is a CLI living in runtime dependencies
- **Where**: `package.json:61` (`"shadcn": "^4.1.0"` in dependencies)
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: zero imports anywhere (`grep -rE "from \"shadcn" src scripts e2e` = 0; it
  ships a `bin`, verified in its package.json). It exists to be run as `npx shadcn add
  <component>` against `components.json`. Its tree costs ~21.7MB (shadcn 6.4MB + @ts-morph
  12.5MB + ts-morph 1.4MB + @dotenvx 1.4MB) inside the production graph, including a
  second copy of @noble/hashes via @dotenvx/eciesjs.
- **What to do**: move the line to devDependencies (keeps the version pinned for
  reproducible `npx shadcn` resolution, which the base-nova setup arguably wants), or
  delete it outright and rely on `npx shadcn@latest` (npx resolves from the registry when
  the package is absent). Recommend the move, not the delete: this repo pins its shadcn
  style deliberately and a floating `@latest` CLI against `components.json` is how a
  base-nova project gets a default-style component pasted into it.
- **Saving**: 1 dep re-sectioned; ~22MB out of the production graph; 0 lines.
- **Risk & gate**: near-zero. Gate: `npx shadcn --version` still answers; nothing else can
  notice.
- **Confidence**: high.
- **Notes**: CLAUDE.md's "Check components.json before adding a shadcn component" workflow
  is unchanged by this.

### dependency-diet-04 - @auth/prisma-adapter is wired in and never called
- **Where**: `src/lib/auth.ts:4` (import), `src/lib/auth.ts:58` (`adapter:
  PrismaAdapter(prisma as any)`), `package.json:26`
- **Phase**: dead (a plumbed-in no-op — placeholder by the brief's taxonomy)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: sessions are JWT (`strategy: "jwt"`, auth.ts:283; AGENTS.md states it and
  notes the docs previously lied about this). The only provider is Credentials
  (auth.ts:59-256). NextAuth consults an adapter for: database sessions (none — JWT), OAuth
  account linking (no OAuth provider), and Email-provider verification tokens (no Email
  provider — the adapter arrived with `fa7120e` "feat: add authentication with magic
  links", an era that is over; today's verify/reset tokens live in the app's own
  `AuthToken` model, written directly). No application code touches the adapter's models:
  `grep -rn "prisma.account\|prisma.session\|verificationToken" src` hits only
  `src/generated/prisma/*`. The `as any` cast on line 58 (with its eslint-disable on 57) is
  itself a smell the deletion removes.
- **What to do**: delete auth.ts:4 and auth.ts:57-58 (the eslint-disable + adapter line);
  remove the dependency; `npm install`. Then hand to the schema lens: `Account`, `Session`
  and `VerificationToken` models (prisma/schema.prisma:310, 328, 336, plus the relation
  fields at User lines 143-144) become fully orphaned — dropping them is a manual
  migration and an owner-visible database change, NOT part of this finding.
- **Saving**: 1 dep, 3 lines (incl. one eslint-disable), one `as any` gone.
- **Risk & gate**: low-medium — auth is the worst thing to be wrong about, so the gate is
  the full battery: `npm run check`, `src/lib/security-regressions.test.mjs` green,
  `npm run test:e2e` (the sign-in flow check), and one manual dev-login +
  password sign-in + sign-out cycle. The behaviour that would falsify me: any NextAuth
  v5-beta internal path that calls `adapter.getSessionAndUser` even under JWT strategy —
  there is none in the documented design, and this app additionally never calls
  `GET /api/auth/session` (auth.ts:257-281 explains the RSC-only session path).
- **Confidence**: high on "never called"; medium on "nothing exotic in a beta" — which is
  why the gate list is long. next-auth is pinned exact (beta.32), so behaviour cannot
  drift under this finding's feet.
- **Notes**: keep the `handlers, signIn, signOut` export shape untouched. If the owner ever
  adds Google OAuth (ROADMAP question, not mine to answer), the adapter comes back — say so
  in the commit message so nobody re-derives the history.

### dependency-diet-05 - @next/bundle-analyzer is provably inert on Turbopack; remove it and repoint OPERATIONS §5
- **Where**: `next.config.ts:2`, `next.config.ts:283-294` (the wrapper),
  `package.json:22` (`"analyze"` script), `package.json:72` (the dep),
  `docs/OPERATIONS.md:177-184` (§5, which documents it as a live tool)
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: raw/analyze-build.txt, twice in one run: "The Next Bundle Analyzer is not
  compatible with Turbopack builds, no report will be generated. Consider trying the new
  Turbopack analyzer via `next experimental-analyze`." The build then completes with no
  report. Every build here is Turbopack (`✓ Next.js 16.3.1 (Turbopack)`), so the wrapper
  has never produced anything on this project's build path. OPERATIONS §5 even confesses
  the consequence: the optimizePackageImports bet "has never been confirmed by anything
  but reasoning."
- **What to do**: delete next.config.ts:2 and the `analyzed` wrapper block (283-294),
  passing `nextConfig` directly to `withSentryConfig`; change the `analyze` script to
  `next experimental-analyze` (or delete it and document the command); remove the dep;
  rewrite OPERATIONS §5 to name `next experimental-analyze` as the treemap tool, in the
  same commit (CLAUDE.md: docs ride with the change). Do NOT reach for the log's other
  suggestion (`--webpack`): a webpack build of a Turbopack-configured Next 16 project is
  an untested second build system, exactly the kind of config that reads like a tool and
  is not one.
- **Saving**: 1 dep (+1.6MB webpack-bundle-analyzer), ~14 lines of config, one permanently
  misleading npm script replaced by one that works.
- **Risk & gate**: low. `npm run check`; the next `npm run build` (any session's) shows the
  warning gone. The route-js.txt raw output proves per-route sizes are already obtainable
  without this package (it was built from the build manifest).
- **Confidence**: high — the tool's own output is the evidence.
- **Notes**: bundle-build lens should confirm `next experimental-analyze` works on 16.3.1
  before OPERATIONS names it; if it is still too experimental, the honest §5 rewrite is
  "use raw/route-js.txt's manifest method", which the orchestrator has already scripted.

### dependency-diet-06 - Three imports resolve only by hoisting luck: d3-selection, geojson, @auth/core/jwt
- **Where**: `src/components/directory/alumni-map.tsx:8` and
  `src/app/lab/directory/_maps.tsx:25` (`from "d3-selection"`); `alumni-map.tsx:12` and
  `_maps.tsx:29` (`import type { Feature, Geometry } from "geojson"`);
  `src/app/api/dev-login/route.ts:38` (`import { encode } from "@auth/core/jwt"`)
- **Phase**: relocate (unlisted transitive dependencies)
- **Tier**: T1 for the first two, T2 for the third     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip "Unlisted dependencies (5)" (raw/knip.txt:136-141), all confirmed.
  `d3-selection@3.0.0` is installed only as a dependency of d3-zoom (via d3-drag /
  d3-transition — `npm ls d3-selection`). The `geojson` module is not installed at all as
  a package; the type import resolves to `@types/geojson@7946.0.16`, itself a transitive of
  devDep `@types/d3-geo`. `@auth/core@0.41.3` is next-auth's own dependency. All three
  work today; any lockfile reshuffle that nests them (or a d3-zoom major that drops
  d3-transition, or an @types/d3-geo bump that inlines its geojson types) breaks the build
  with an error pointing nowhere useful.
- **What to do**: (a) add `"d3-selection": "^3.0.0"` to dependencies — matches the already
  installed version, so the lockfile barely moves; (b) add `"@types/geojson"` (current:
  7946.0.16) to devDependencies; (c) change dev-login/route.ts:38 to
  `import { encode } from "next-auth/jwt"` — verified: `node_modules/next-auth/jwt.js` is
  exactly `export * from "@auth/core/jwt"`, so this is the same function reached through
  the listed, exact-pinned package, and it keeps the JWT shape in lock-step with the
  next-auth version the sessions are minted by.
- **Saving**: 0 lines; two package.json lines added; one import rewritten. This is
  insurance, not weight loss — negative SLOC and proud of it.
- **Risk & gate**: (a)/(b) near-zero, `npm run check`. (c) low: dev-login is dev-only
  (404s in production), gate is `npm run screenshot:auth` succeeding (it signs in through
  this route) plus `security-regressions.test.mjs` (which pins this route's behaviours).
- **Confidence**: high on all three.
- **Notes**: the alternative for (c) — listing `@auth/core` explicitly — was rejected: its
  version must then be hand-synced with whatever next-auth pins, which is precisely the
  class of two-things-that-must-agree this repo keeps getting bitten by
  (prisma.config.ts's own comment about the two env files says it best).

### dependency-diet-07 - @types/bcryptjs types a major version that is not installed
- **Where**: `package.json:36`
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: installed bcryptjs is 3.0.3 and its package.json declares
  `"types": "umd/index.d.ts"` — it ships its own definitions (bcryptjs grew bundled types
  in v3). The DefinitelyTyped package is 2.4.6, written for the v2 API. When a package
  bundles types, TypeScript prefers them, so the @types package is at best ignored and at
  worst a source of confusion the day resolution order changes. knip flags it in both runs.
- **What to do**: delete the line, `npm install`, `npm run check` (tsc over the 4 src
  bcryptjs call sites: auth.ts, auth/actions.ts, email-actions.ts, settings/actions.ts).
- **Saving**: 1 dep. 0 lines.
- **Risk & gate**: near-zero; `npm run check`.
- **Confidence**: high.
- **Notes**: also mis-sectioned (a @types package in dependencies), but removal moots that.

### dependency-diet-08 - pg and dotenv are dev-time packages in the runtime section
- **Where**: `package.json:55` (pg), `package.json:49` (dotenv)
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip-production lists both as unused in the production graph
  (raw/knip-production.txt:144-145) and the greps agree: zero imports under src/. `pg` is
  imported by 16 script files (both run-sql.mjs migration runners, the importers, the
  phase probes, ops/snapshot + prune); `dotenv` by prisma.config.ts:1,
  e2e/playwright.config.ts:2, and 14 scripts. The part that needs explaining (the charter
  asked): **the app's runtime does not need top-level pg at all** — `src/lib/prisma.ts`
  passes a config object to `PrismaPg`, and `@prisma/adapter-pg` carries its own
  `"pg": "^8.16.3"` as a full dependency (verified in its package.json), so the driver is
  installed and version-governed by the adapter whether or not the app lists it. The
  top-level listing exists for the scripts, and scripts are dev tooling. Next.js loads
  `.env` itself at runtime (AGENTS.md architecture; no src file touches dotenv).
- **What to do**: move both lines to devDependencies; `npm install`. Nothing else changes —
  local scripts and CI (`npm ci`, full install) see both exactly as before; Vercel's build
  (which runs prisma.config.ts via postinstall generate, needing dotenv) installs devDeps.
- **Saving**: 2 deps re-sectioned; ~280KB out of the production graph; 0 lines.
- **Risk & gate**: low. Same deploy-side caveat as finding 02 and the same gate: CI green,
  one Vercel deploy observed. Locally: `node scripts/dev/run-sql.mjs --help` (or any
  read-only invocation) still runs.
- **Confidence**: high.
- **Notes**: keep `@types/pg` (already a devDep) — the scripts are .mjs but nothing breaks
  by keeping types for future TS scripts. One honest wrinkle: with pg in devDeps, the
  version the SCRIPTS use and the version the ADAPTER uses can drift apart (today both
  resolve to 8.22.0). That is acceptable — the scripts' pg talks to the same database with
  its own connection semantics — but the fixer should not "helpfully" pin them together.

### dependency-diet-09 - @types/d3-zoom and tw-animate-css belong in devDependencies
- **Where**: `package.json:38` (@types/d3-zoom), `package.json:67` (tw-animate-css)
- **Phase**: relocate
- **Tier**: T1     **Class**: structural (barely)     **Decides**: autonomous
- **Evidence**: @types/d3-zoom is a type-only package (consumed by tsc for the two d3-zoom
  import sites); every sibling @types package already lives in devDependencies.
  tw-animate-css is a CSS source file imported once, `src/app/globals.css:2` — it is
  compiled by Tailwind v4 at build time, and Tailwind emits only the utilities actually
  used, which is currently the popover open/close set in `src/components/ui/popover.tsx:55`
  (`data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 ...`) — the only real
  consumer in src (the other grep hits are a comment, a `cursor-zoom-in`, and prose).
  It is the same build-time class as `tailwindcss` itself, which is a devDep.
- **What to do**: move both lines to devDependencies; `npm install`; `npm run check`; open
  a popover (the directory filter or any dropdown) and confirm the entrance animation.
- **Saving**: 2 deps re-sectioned. 0 lines, 0 client KB.
- **Risk & gate**: near-zero (Vercel installs devDeps at build, and the CSS is compiled
  into the output at build). Gate: `npm run visual` — the popover state is animated, so if
  the utilities vanished, a page with an open popover would... actually none of the 10
  baseline routes holds a popover open; the honest gate is a manual popover open plus
  `npm run check`.
- **Confidence**: high.
- **Notes**: considered recommending removal of tw-animate-css by inlining ~10 lines of
  keyframes for the popover — rejected: future shadcn components added via the CLI will
  expect these utilities to exist, and the wire cost is already near zero.

### dependency-diet-10 - The prisma family disagrees with itself: client 7.5.0, adapter 7.8.0, CLI 7.9.1
- **Where**: `package.json:33-34,57` (ranges `^7.8.0`, `^7.5.0`, `^7.5.0`); the installed
  reality in package-lock.json
- **Phase**: hygiene (but on the one family the repo says must never drift)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: installed versions read from node_modules: @prisma/client **7.5.0**,
  @prisma/adapter-pg **7.8.0**, prisma CLI **7.9.1** (TRAPS.md confirms 7.9.1 — "npm audit
  fix --force would take Prisma from 7.9.1 back to 6.12.0"). The repo's own renovate.json
  rule: "Prisma's client and CLI MUST share a version -- a mismatch produces a generated
  client that does not match the schema, which typechecks and then fails at runtime." The
  drift is invisible to Renovate's grouping because it lives in the lockfile: the caret
  ranges all admit the newest 7.x, but the three were installed at different moments and
  nothing since has re-resolved them. It works today only because `prisma generate` (7.9.1)
  writes generated code into src/generated that happens to be compatible with the 7.5.0
  runtime — exactly the luck the renovate rule says not to rely on.
- **What to do**: in one commit: set all three to the same version (either pin
  `7.9.1`-era exact across the family, or set all ranges to `^7.9.1`), `npm install`,
  `npx prisma generate`, `npm run check`, and commit the regenerated client if
  src/generated is tracked (it appears under src/generated/prisma — check its gitignore
  status first; raw/madge notes call it gitignored, in which case only package.json and
  the lockfile move).
- **Saving**: 0 lines; removes a latent runtime-failure class the repo has already named.
- **Risk & gate**: low-medium — a minor-version bump of @prisma/client is involved. Gate:
  `npm run check` (75-file suite includes DB-shape rule tests), then one authed page load
  via `npm run verify:shot /feed` to prove the client talks to the schema (CLAUDE.md
  gotcha 3: verify at runtime, not just tsc).
- **Confidence**: high that the skew exists; medium on "it has caused no silent damage yet"
  — nothing observed suggests it has, but that is what "typechecks and then fails at
  runtime" means.
- **Notes**: Renovate's monthly lockFileMaintenance would eventually re-float these
  together; do not wait for it — the fix is one install away. Related: finding 02 (the CLI
  moves section in the same breath if sequenced together; do 02 and 10 in one commit to
  touch package.json once).

### dependency-diet-11 - eslint-config-next 16.2.0 lags next 16.3.1; latest is 16.3.2
- **Where**: `package.json:82` (exact pin `16.2.0`); next installed 16.3.1 (`^16.3.1`)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: registry dist-tags (fetched live): eslint-config-next latest is
  **16.3.2**. renovate.json's "next.js" group exists precisely so "Next and its eslint
  config disagreeing on version" cannot produce "confusing lint failures" — yet they
  disagree today (the group means Renovate will PR the pair together; either the PR has
  not arrived or was not merged).
- **What to do**: bump both in one commit — `next` to `^16.3.2` (or leave `^16.3.1` and let
  the lockfile float) and `eslint-config-next` to `16.3.2` (keep the exact-pin style it
  already uses). `npm install`, `npm run check -- lint`.
- **Saving**: 0 — this is drift repair, not reduction.
- **Risk & gate**: low; `npm run check` (lint + tsc). A next patch bump also wants one
  `npm run visual` since the framework renders every page.
- **Confidence**: high.
- **Notes**: alternatively just merge Renovate's next weekly "next.js" group PR if one is
  open — check the repo's PRs before doing it by hand.

### dependency-diet-12 - motion ships its full 42.5KB-gzip runtime to every page; LazyMotion would roughly halve it
- **Where**: 86 files import `from "motion/react"` (60 shipped, 26 lab — e.g.
  `src/components/common/motion.tsx`, love-button, sidebar, tour/*, catchups/*);
  `next.config.ts:199` (optimizePackageImports already lists "motion")
- **Phase**: library
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (zero visual change by
  design; the gate proves it)
- **Evidence**: bundlephobia for motion@12.38.0: 42,562B gz / 128KB raw, side-effect-free.
  Zero occurrences of `LazyMotion`, `domAnimation`, or `motion/mini` in src (grepped). The
  full `motion.div` component drags the whole animation runtime (layout animations,
  drag, exit) into the shared client chunk; `LazyMotion features={domAnimation}` + the `m`
  component loads a ~6KB shell with a ~18-25KB feature set, and this app's usage (per
  DESIGN-SYSTEM §7: micro-interactions on EASE_POP, scale/fade, one origin animation) is
  exactly the domAnimation subset. `optimizePackageImports` does not help here — it fixes
  barrel resolution, not runtime size. With `src/components/common/motion.tsx` at fan-in
  90 (depcruise), a central swap point already exists.
- **What to do**: (1) add a `<LazyMotion features={domAnimation} strict>` provider in the
  root layout (client boundary already exists via PostHogProvider's file, but LazyMotion
  should wrap in its own tiny client component); (2) mechanical codemod `motion.` → `m.`
  and the import to `{ m } from "motion/react"` across the 86 files — `strict` mode makes
  any missed `motion.` component THROW in dev, so stragglers cannot hide; (3) check the
  few places that may use features outside domAnimation (grep for `drag`, `layout`,
  `AnimatePresence` — AnimatePresence works under LazyMotion; `layout` props need
  domMax instead, and MEMORY notes "Framer: layout prop stretches" suggesting layout
  animations exist somewhere — if `domMax` is required the saving shrinks to ~10KB and
  the finding should be re-costed before execution).
- **Saving**: ~15-20KB gz off the shared client chunk on every route (against a 430KB-raw
  root main-files baseline, route-js.txt) if domAnimation suffices; ~8-12KB if domMax is
  needed. 0 lines (slightly negative).
- **Risk & gate**: medium — 86 files, but mechanical. Gate: `npm run check`, full
  `npm run visual` (all 10 routes x 2 viewports; motion is masked only where volatile, so
  a broken entrance animation shows), plus the hoopoe idle check
  (`scripts/qa/hoopoe-idle-check.mjs`) since the mascot is the heaviest motion consumer.
- **Confidence**: medium — the one thing that would change my mind is a `layout` or `drag`
  usage census coming back heavy (then domMax is forced and the ROI is half). The fixer
  should run that grep first and abort if the saving drops under ~8KB.
- **Notes**: coordinate with bundle-build; their chunk table should show framer-motion's
  contribution to the shared chunk, and this finding's KB must agree with it. Do NOT
  attempt this in the same commit as anything else.

### dependency-diet-13 - Two analytics SDKs ship to the browser; the repo's own commit argues one is enough (OWNER)
- **Where**: `package.json:42` (@vercel/analytics), `src/app/layout.tsx:3,107-109`;
  CSP entries `next.config.ts:81` (script-src) and `:124` (connect-src) exist only for it
- **Phase**: library / macro
- **Tier**: T2     **Class**: structural     **Decides**: owner
- **Evidence**: both installed and both active: `<Analytics />` in the root layout (Vercel
  Web Analytics, 1,571B gz + a third-party loader request from va.vercel-scripts.com on
  every page), and PostHog (81.6KB gz, proxied through /ingest). The PostHog install
  commit `86d5475` opens by dismissing the older one: "Vercel Analytics answers '34%
  India, 22% iOS' and nothing else, by design -- it has no concept of a person and no paid
  tier changes that." posthog-provider.tsx repeats the same paragraph. OPERATIONS.md
  documents PostHog as a numbered tool (§7) and never mentions Vercel Analytics at all —
  by the project's own standard ("a tool nobody runs is worse than no tool", OPERATIONS
  header), an analytics surface the operations doc does not even list is a strong
  candidate for not existing.
- **What to do** (if the owner agrees): remove the dep, layout.tsx:3 and :107-109, the
  two `va.vercel-scripts.com` CSP entries; leave `vitals.vercel-insights.com` to the
  security/config lens (see For other lenses — it is dead either way). Then `npm run
  visual` and a console check on any page.
- **Saving**: 1 dep, ~1.6KB gz + one third-party script request per page view, 5 lines.
- **Risk & gate**: low technically. The real cost is product: the owner loses the traffic
  panel inside the Vercel dashboard he may glance at. PostHog holds a superset of the
  data.
- **Confidence**: high on mechanics; the decision is genuinely his, hence owner.
- **Notes**: recommendation — remove. Two pageview counters double-count nothing useful,
  and the one that stays is the one the operations doc teaches him to read. Counter-
  argument stated fairly: it is nearly free (1.6KB), needs no account beyond Vercel, and
  survives a PostHog quota blackout (OPERATIONS §7 warns launch-month ingestion could
  halt at the 1M-event ceiling — Vercel Analytics would keep counting page views through
  exactly that window). If that resilience argument lands with him, the verdict flips to
  keep, and this becomes a not-finding.

### dependency-diet-14 - @paralleldrive/cuid2 does the job of crypto.randomUUID at 12 sites
- **Where**: `src/app/api/upload/{route,presign,finalize}/route.ts`,
  `src/app/(main)/collection/actions.ts:188,432-433`, `src/app/(main)/support/actions.ts:83`,
  `src/components/settings/actions.ts:235`, `src/lib/collection-intake.ts:124,130`;
  5 QA probe scripts
- **Phase**: library
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: every call site generates a filename for putImage/presign
  (`${createId()}.webp`) or an opaque receipt token (support/actions.ts:83). None is a
  database primary key (Prisma ids come from `@default(cuid())` inside the generated
  client, untouched by this). All sites are server-side, so the wire cost is zero — the
  cost is one dependency plus @noble/hashes@2.0.1 (cuid2's hash engine; the @noble tree
  is 5.5MB, shared with shadcn's copy at a different major). `crypto.randomUUID()` is
  native, collision-safe, and filename-safe (hyphens are fine in object keys; keyForUrl
  parses roots and traversal, never filename shape — verified in storage.ts:263-291).
- **What to do**: replace the 7 src import lines + 8 call sites with
  `crypto.randomUUID()` (global in Node 20+, no import needed); update the 5 QA probe
  scripts or leave them (they are scripts-lens territory and the dep could stay devDep for
  them — better: they use crypto too and the dep goes entirely); remove the dep.
- **Saving**: 1 dep (+@noble/hashes@2.0.1 transitive), 7 import lines. 0 client KB.
- **Risk & gate**: low. Gate: `npm run check`; one upload through the app
  (`/api/upload` path and the collection contribute flow); the receipt path on /support.
  The one behavioural difference: UUIDs are 36 chars vs cuid2's 24, and contain hyphens —
  grep for any code slicing or regex-matching these ids before executing (I found none in
  keyForUrl/keyBelongsTo, the only parsers of keys).
- **Confidence**: high on safety, medium on worth-it — it is a small win; do it in a
  quiet moment, not before launch.
- **Notes**: honest counter: cuid2 ids are shorter and the codebase's ids "look cuid"
  uniformly today. Purely aesthetic; nothing parses the shape.

### dependency-diet-15 - xlsx: knip is wrong (it IS used), but it is abandoned-on-npm with open advisories
- **Where**: `package.json:88` (devDep), `scripts/dev/import-roster.mjs:36`
  (`createRequire(import.meta.url)("xlsx")` — invisible to knip's resolver AND to a
  naive import-grep; the file's own comment at :34-35 explains the CJS/ESM dance)
- **Phase**: library / owner-adjacent
- **Tier**: T2     **Class**: structural     **Decides**: owner (jointly with the scripts lens)
- **Evidence**: knip lists xlsx as an unused devDependency (raw/knip.txt:135); refuted —
  the roster importer requires it at :36 to read the two office spreadsheets. But
  xlsx@0.18.5 is the LAST version SheetJS ever published to npm (2022-vintage); the
  prototype-pollution and ReDoS advisories against it (GHSA-4r6h-8v6p-xvw6,
  GHSA-5pgg-2g8v-p4x9) are fixed only in 0.19.3+/0.20.2+ distributed from SheetJS's own
  CDN, never npm — so Renovate's vulnerabilityAlerts can never PR a fix, and
  npm-audit-gate never sees it because the gate runs `--omit=dev` (npm-audit-gate.mjs:64).
  A permanently unfixable-by-bot advisory sitting where neither watchdog looks.
- **What to do**: three options for the owner, with my recommendation last: (a) leave it —
  the script parses only the owner's own two spreadsheets from a gitignored local folder,
  so the attacker model is "the school office sends a malicious .xlsx", which is not
  nothing but is close; (b) retire the script if the roster import is finished (scripts
  lens should say whether RosterEntry re-imports are still expected — the file's own
  usage notes suggest re-runs are anticipated: "--apply replaces every imported row
  wholesale"); (c) repoint the dependency at SheetJS's CDN tarball
  (`https://cdn.sheetjs.com/xlsx-0.20.x/xlsx-0.20.x.tgz`) to clear the advisories.
  Recommend (c) if the script stays: one package.json line, no code change.
- **Saving**: (b) 1 dep + 7.4MB; (c) 0 deps but 2 advisories.
- **Risk & gate**: low; gate for (c) is a dry-run `node scripts/dev/import-roster.mjs`
  against the sheets (counts only, no --apply).
- **Confidence**: high on the facts; the option choice is the owner's.
- **Notes**: cross-filed to the scripts lens: import-roster.mjs is on knip's unused-FILES
  list too, which is the same resolver gap, not evidence of death — the trust-model
  matching (Phase 3) reads the table this script fills.

### dependency-diet-16 - Puppeteer downloads a ~130MB Chrome this machine never uses
- **Where**: `.puppeteerrc.cjs` (`skipDownload: process.env.VERCEL === "1"`)
- **Phase**: hygiene (dev-environment weight)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: puppeteer is genuinely needed — 23 script files import it (the whole QA
  screenshot/crawl apparatus) — so the charter's "is it still needed" is answered yes.
  But CLAUDE.md gotcha 2 states flatly "The bundled Puppeteer Chrome is broken here":
  screenshot.mjs falls back to real Chrome by itself, and verify-shot.mjs/crawl.mjs
  require `PUPPETEER_EXECUTABLE_PATH` pointed at real Chrome or they stack-trace. The
  .puppeteerrc.cjs already skips the download on Vercel for exactly this
  logic ("the scripts point PUPPETEER_EXECUTABLE_PATH at real Chrome anyway") — but only
  on Vercel, so every local `npm install` after a puppeteer bump re-downloads ~130MB into
  ~/.cache/puppeteer for a browser that is documented broken.
- **What to do**: change to `skipDownload: true` with a comment carrying the CLAUDE.md
  gotcha-2 rationale; verify `npm run screenshot http://localhost:3000/login` still works
  (it should — it prefers real Chrome), and one `PUPPETEER_EXECUTABLE_PATH=... npm run
  verify:crawl` when a dev server is up (NOT during this audit; heavy-process rule).
- **Saving**: ~130MB of ~/.cache per puppeteer major, install seconds. 0 lines, 0 deps.
- **Risk & gate**: low-medium — if any script secretly still worked with bundled Chrome,
  it would now need the env var. The gate (one screenshot + one crawl) settles it in two
  commands. If either fails, revert; the finding is falsified.
- **Confidence**: medium — resting on CLAUDE.md's word "broken" rather than my own run
  (running browsers is banned in this audit). Priced accordingly.
- **Notes**: the deeper question — retiring puppeteer entirely by moving the QA scripts to
  playwright-core (already installed, 14MB, its own working browsers) — is a scripts-lens
  rewrite of ~23 files and NOT proposed here; noted for their report.

### dependency-diet-17 - The AWS SDK pair is 11MB of server weight for five S3 verbs (note, not a push)
- **Where**: `package.json:27-28`; `src/lib/storage.ts` (the only importer, both packages)
- **Phase**: library
- **Tier**: T3     **Class**: structural     **Decides**: owner
- **Evidence**: storage.ts uses exactly PutObject, GetObject, DeleteObject, HeadObject and
  presigned PUT. `aws4fetch` (~6KB, zero deps, Cloudflare's own recommendation for R2)
  covers all five with hand-built requests; the @aws-sdk tree is ~11MB in node_modules and
  a real contributor to serverless cold-start (SDK client init is famously heavy).
- **What to do**: nothing now. If post-launch cold-start numbers on upload routes ever
  matter, swap inside storage.ts only — the file's own header promises "Switching
  providers again later is a change in this file only", and that promise is the reason
  the swap is tractable.
- **Saving**: (deferred) 2 deps, ~11MB server graph, some cold-start ms.
- **Risk & gate**: medium-high if done — storage.ts is the C2-audited ownership/deletion
  choke point; the gate would be the full upload/delete/purge battery plus
  security-regressions. That risk against a launch deadline is why the verdict is
  "keep now".
- **Confidence**: high that keep-now is right.
- **Notes**: filed as a finding rather than a not-finding because the charter explicitly
  asked for the trade-off stated, and because the option should not be re-derived later.

## Owner decisions

1. **Vercel Analytics or PostHog, not both** (finding 13). Two different tools currently
   watch members' page views. PostHog is the one the operations manual documents and the
   one that answers real questions (funnels, search terms, map-vs-list). Vercel Analytics
   only counts visits by country and device, costs a tiny script on every page, and the
   commit that installed PostHog explains it can do nothing more "at any price". My
   recommendation: remove Vercel Analytics. The one honest reason to keep it: if PostHog's
   free-tier ceiling is hit in launch month (a documented risk in OPERATIONS §7), Vercel's
   counter would keep working through the blackout. If that safety matters to you, say
   "keep", and this becomes settled either way.
2. **The spreadsheet-reader (xlsx)** (finding 15). The tool that reads the office's two
   alumni spreadsheets is stuck on an old version with known (theoretical, low-risk here)
   security flaws, and no automatic update can ever fix it because its maker left npm. If
   fresh spreadsheets will still arrive from the office, the fix is one line: fetch the
   same library from its maker's own site instead. If the roster import is finished
   business, the script and library can go. Which is it?
3. **The map's networking library (AWS SDK)** (finding 17). The photo-storage code uses a
   large general-purpose library for five simple operations. A much smaller one exists and
   is recommended by Cloudflare for exactly this use. Swapping is a real but contained
   project touching the most security-audited file in the app. Recommendation: not before
   launch; keep the note.

## Not-findings

1. **Two icon sets (lucide-react + @phosphor-icons/react)** — deliberate and documented:
   "Icons: Lucide for UI chrome, `@phosphor-icons/react` duotone for decorative"
   (CLAUDE.md Project block). Quantified so nobody re-litigates: lucide 141 files / 115
   distinct icons; phosphor 16 files / 14 distinct icons (3 sites already use the
   `/dist/ssr` subpath). Disk is 103MB combined but wire cost is per-icon:
   `optimizePackageImports` covers phosphor (next.config.ts:195-199) and Next
   auto-optimises lucide. The second set's marginal client cost is roughly a dozen icon
   modules, single-digit KB. Defensible; keep.
2. **sonner (58 files), next-themes (4), @formkit/auto-animate (12), @base-ui/react (14),
   clsx + tailwind-merge (cn(), fan-in 165)** — each is the designated tool for a
   design-system mandate (toasts, dark mode, "Auto-animate is mandatory on every list"
   DESIGN-SYSTEM.md:349, shadcn base-nova, `cn()`), all cheap on the wire (sonner 9.4KB gz
   measured). Keep.
3. **@upstash/ratelimit + @upstash/redis** — one importer (`src/lib/rate-limit.ts`), 14
   named limits, 17 files importing the wrapper; the file's header explains why in-process
   limits cannot work on serverless (audit M7). Both packages needed (ratelimit is the
   algorithm, redis the transport). Keep.
4. **resend** — one importer, `src/lib/email.ts`, the single mail choke point, webhook
   verified by hand to avoid the svix package (OPERATIONS §6 records that refusal —
   this project already declines dependencies on purpose). Keep.
5. **posthog-js (81.6KB gz)** — the heaviest deliberate client dependency, and the
   documented analytics choice (OPERATIONS §7, commit 86d5475). Its `core-js` 15MB
   node_modules footprint is dependency-graph-only, not bundled. Keep.
6. **sharp** — 8 sites, server-only, `serverExternalPackages` (next.config.ts:175). Keep.
7. **bcryptjs** — 4 src sites + probes; per charter this lens does NOT propose changing
   password hashing: every stored hash is bcrypt, so any swap (node:crypto scrypt, argon2)
   is a live-data migration with a rolling re-hash-on-login scheme, a project not a
   cleanup. The pure-JS implementation is also the right call on Vercel (no native builds).
   Keep, explicitly.
8. **@sentry/nextjs client weight** — the charter asked whether the client SDK is
   tree-shaken out. Confirmed structurally: no `instrumentation-client.ts` and no
   `sentry.client.config.ts` exists (checked), `widenClientFileUpload: false` with a
   comment saying "No browser SDK is initialised (server-only)" (next.config.ts:332-334),
   and OPERATIONS §3 documents the ~30KB-gz browser SDK as deliberately not installed.
   The 86MB disk cost is server/build tooling. Keep.
9. **The map stack (d3-geo, d3-zoom, topojson-client, world-atlas)** — all four used by
   the shipped `/directory` map (plus its lab prototype). Keep. HOW they load is the
   problem (see For other lenses), not THAT they exist.
10. **`.puppeteerrc.cjs` on knip's unused-files list** — false positive; it is config
    puppeteer's installer reads, and its Vercel skipDownload guard is doing real work on
    every deploy. (Its scope could widen — finding 16 — but the file is load-bearing.)
11. **jsqr + qrcode** — both consumed by `scripts/gen-support-qr.mjs`, which renders the
    committed /support UPI QR SVGs and decodes each back from its own PNG before writing
    ("a build that succeeds is a build whose codes scan"). knip flags them only because
    the script itself has no runner entry. Correct section (dev), keep.
12. **pg on knip-production's unused list** — true for the production graph and correctly
    so; the runtime driver arrives via @prisma/adapter-pg's own dependency. Explained in
    finding 08; the package still must exist for the 16 scripts.
13. **dotenv at 16 sites** — all dev-time (configs + scripts); Next loads .env itself.
    Re-sectioned by finding 08, not removed: prisma.config.ts and playwright.config
    genuinely need it.
14. **zod 4** — 6 entry files; the validation layer AGENTS.md names. The `zod/v4` subpath
    imports are the current-major path and fine. Keep.

## For other lenses

- **bundle-build**: `/directory` is the heaviest route in raw/route-js.txt (1,212KB route
  JS, 1,642KB first load) and `alumni-map.tsx` is a `"use client"` file statically
  importing `world-atlas/countries-110m.json` (measured 107.8KB raw / 39.0KB gz) plus the
  d3 stack — while the app contains exactly one `next/dynamic`
  (mascot-flight-layer.tsx:30). Dynamic-importing the map component is your charter; my
  per-dep numbers above are for your chunk table to agree with.
- **security/config (next.config.ts owner)**: `connect-src` allows
  `https://vitals.vercel-insights.com` "Vercel Speed Insights beacon" (next.config.ts:125)
  but `@vercel/speed-insights` is not installed and nothing in src references it — a CSP
  allowance for a beacon that cannot fire. Dead either way; dies naturally if finding 13
  removes the sibling entries.
- **schema lens**: if finding 04 lands, Prisma models `Account` (schema.prisma:310),
  `Session` (:328), `VerificationToken` (:336) and the two relation fields on User
  (:143-144) have zero readers. Dropping them is a manual migration against BOTH databases
  (TRAPS: the demo DB drifts) and an owner call.
- **scripts lens**: (a) puppeteer→playwright-core consolidation of ~23 QA scripts is
  yours if wanted (finding 16 notes); (b) import-roster.mjs's fate decides xlsx (finding
  15); (c) the five phase*-probe scripts are the only script importers of bcryptjs and
  cuid2 — if the probes retire, those script sites vanish (the runtime deps' verdicts do
  not change).
- **territory agent for src/components/profile**: `profile-actions.ts:26` imports
  `type { ZodTypeAny } from "zod"` while the other five zod files import `zod/v4` —
  unify (one-line hygiene).
- **docs lens**: OPERATIONS.md §5 (bundle analyzer) must be rewritten in finding 05's
  commit; OPERATIONS has no entry for Vercel Analytics at all, which finding 13 resolves
  in either direction.
- **CI lens**: check.yml runs Node 24 while `@types/node` is `^20` — types lag the
  runtime two majors; harmless today, one line to fix when someone is in that file.
- **whoever owns e2e**: `e2e/auth.setup.ts` is on knip's unused-files list — not mine to
  judge, but if it is truly orphaned, its dotenv/playwright usage counts shift slightly.

## Metrics

- Dependencies audited: 61 of 61 (45 runtime + 16 dev), plus 3 unlisted transitives and
  2 phantom references (framer-motion — only via motion; @vercel/speed-insights — CSP
  only).
- Verdict tally: keep 44; remove now 7; re-section 6; add 2; bump 2 (eslint-config-next,
  prisma family); owner-call 3 (@vercel/analytics, xlsx path, AWS SDK later).
- node_modules: 1.3GB total. Largest audited trees: next 199MB, @prisma 174MB, @sentry
  86MB, @next 86MB, @phosphor-icons 57MB, posthog-js 46MB, lucide-react 46MB, prisma CLI
  cluster ~121MB (prisma+effect+@electric-sql+@prisma/dev).
- Wire sizes fetched (bundlephobia, installed versions): motion 42,562B gz; posthog-js
  81,584B gz; sonner 9,390B gz; zod 58,449B gz; @vercel/analytics 1,571B gz; d3-zoom
  15,468B gz (with deps). Measured locally: world-atlas/countries-110m.json 39,0 KB gz.
- Client JS honestly attributable to this lens's proposals: ~1.6KB certain (owner call)
  + 15-20KB probable (T3 LazyMotion). The rest of the reduction is graph/disk/risk, and
  the report says so rather than inflating.
- Grep passes: ~60 per-package import scans + per-site verifications; files read in full
  listed under Coverage.
