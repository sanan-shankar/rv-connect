# Simplification audit — working findings

Running notes. Verified findings get S-ids here before they go into the report.

## Orientation (2026-08-25)
- Tracked files: 1041. Root has 16 tracked files. `.DS_Store` and `tsconfig.tsbuildinfo`
  exist at root but are gitignored (not tracked). `sanan's stuff/` (132MB) and
  `temporary screenshots/` (90MB, 175 PNGs) are gitignored local folders.
- `.claude/` is 18MB on disk: `_disabled-gsd` 7.4MB and `shots` 9.4MB are untracked
  (gitignored via `.claude/*`); `agents/` and `skills/` are tracked (101 files).
- `.next/dev` is 5.1GB (another session's dev server). Not ours.
- Raw tracked line counts (wc -l, code files only): src/app 62,464 (233 files),
  src/components 49,590 (247), src/lib 29,584 (185, of which 72 are *.test.mjs),
  proxy.ts 388, instrumentation.ts 88. scripts/ 9,028; docs/ 18,437 (md); prisma 1,915;
  e2e 444. progress.md alone is 317KB.
- Largest tracked files: e2e baselines PNGs (17MB total), two `public/images/collection/
  WhatsApp*` files (~1.5MB each), `docs/content/whatsapp-curation/overflow-stories.pdf`
  (1.6MB), `docs/planning/audits/findings-raw.json` (560KB) + `verdicts-merged.json`
  (435KB), package-lock 574KB.
- scripts/README.md already states the rule "if a line has no owner and answers no live
  question, delete both" and records the 2026-08-08 cull (63 → 32). Yet scripts/qa/ now
  holds phase3..phase10 probes + hoopoe-idle-check + `_probe-kit` + `_dev-login` that the
  README does not list → candidates.
- `npm run check` claims 75 test files; scripts/README says "all 14" — stale doc.
- Dependencies: 45 runtime + 16 dev. `shadcn`, `dotenv`, `prisma` (CLI) in runtime deps;
  `xlsx`, `jsqr`, `qrcode` in devDeps; `@types/*` for bcryptjs, d3-scale, d3-zoom,
  supercluster in runtime deps.
- `next.config.ts` is 17.5KB (CSP + headers + rewrites, heavily commented).
- Config surface at root: next.config.ts, tsconfig.json, eslint.config.mjs,
  postcss.config.mjs, components.json, prisma.config.ts, vercel.json, .puppeteerrc.cjs,
  .mcp.json, next-env.d.ts, package.json(+lock), CLAUDE.md, AGENTS.md, README.md,
  progress.md, .env/.env.demo (ignored), .gitignore, .github/.

## Baseline metrics
(filled in phase 0d)

## Decomposition
(filled before phase 1)

## Verified findings
(phase 2)

## Decomposition (decided 2026-08-25 ~15:00)
One sentence on why: territory readers (one per cohesive feature slice, sized 4-13k lines
so each can actually read every file it owns) apply the per-file checklists with full local
context, and five cross-cutting lenses hold the questions that only make sense across
territories (bundle/build, dependencies, duplication, dead code, data layer); the lab gets
its own reader with a different charter (leakage, not deletion), and tests, tooling and the
root/docs/assets get readers because the owner's bloat complaint is about them as much as
about src/.

Territories (key → ownership; every tracked file belongs to exactly one):
- `auth-edge`: src/app/(auth), src/app/api, src/proxy.ts, src/instrumentation.ts,
  src/components/auth, lib: auth.ts, auth-tokens, auth-flow-rule, login-attempt,
  human-pass*, rate-limit, app-secret, double-submit, email-verification, email-address,
  email-gate-message, bot-check-message, mask-email, validators, call-action, audit.ts,
  turnstile*, password*, session*, security-regressions.test.mjs (awareness only).
- `feed-posts`: src/app/(main)/feed, src/components/feed, src/components/posts, lib: heart,
  keyset, draft-*, draft-images, image*, upload-shared, content-view, post-visibility-rule,
  feed-write-rule, composer-rule, city-scope, mention*, poll*, link*, markdown*.
- `catchups`: src/app/(main)/catchups, src/app/catchups, src/components/catchups, lib:
  catchups*.ts, catchup-*, group-succession.
- `directory-profile`: src/app/(main)/directory, profile, pick-bird, birds, welcome,
  src/components/directory, profile, onboarding, lib: map-cluster, city-coords, geocode,
  place-*, directory-*, houses*, house-spans, batch-*, contact-rows, onboarding-local,
  profile*.
- `landing-mascot-avatars`: src/app/page.tsx, src/app/hoopoe, src/components/landing,
  mascot, tour, pwa, src/components/common/bird-avatar*.tsx, lib: avatar*, bird*,
  tour-local, hoopoe*.
- `admin-analytics`: src/app/(main)/admin, src/components/admin, src/components/analytics,
  lib: admin*.ts, retention, last-seen, telemetry*, metric*, presence*.
- `member-surfaces`: src/app/(main)/{collection,letters,support,donate,messages,
  notifications,notice,about,dark-mode}, src/app/(policies), src/components/{collection,
  letters,support,messages,settings}, lib: collection*, contribution*, razorpay*, thread*,
  notification*, settings*, theme*.
- `shell-primitives`: src/components/ui, src/components/common (minus bird-avatar*),
  src/components/layout, src/app/{layout,error,not-found,globals.css,manifest,robots,
  sitemap}, src/app/(main)/{layout,template,error}, src/types, lib: utils.ts, motion*,
  format*, time*, text*, cn.
- `lib-core-config`: lib: prisma.ts, storage.ts, email*.ts, mail-*, db-*, account-purge,
  image-purge, demo.ts, demo-seed/, keyset?, anything in src/lib not claimed above;
  src/components/demo; next.config.ts, tsconfig.json, eslint.config.mjs,
  postcss.config.mjs, components.json, prisma.config.ts, vercel.json, .puppeteerrc.cjs.
- `lib-tests`: every src/lib/*.test.mjs (72 files, 10.5k lines) + scripts/qa/check.mjs +
  test helper files; lens = redundancy, spelling-bound pins, scratch leftovers, shared
  fixtures, and the owner's "which tests survive" rule.
- `lab`: src/app/lab (102 files, 41k lines) + src/app/lab/_registry.ts + LabRoomState +
  any lab-only lib. Charter: production leakage, shipped→lab imports, registry hygiene,
  archived rooms, duplication of shipped primitives. Never "delete a room" (owner call).
- `scripts-e2e-ci`: scripts/, e2e/, .github/, .claude/ (tracked: agents, skills, hooks,
  scripts), package.json scripts block.
- `root-docs-assets`: repo root (owner's verbatim request), docs/ (40 files, 17.4k md
  lines), public/ (15MB), prisma/migrations-manual (51 files), progress.md (317KB),
  .gitignore, README.md.

Lenses:
- `bundle-build`: "use client" audit, barrels, next/dynamic candidates,
  optimizePackageImports coverage, build route table + analyzer treemaps, lab in the prod
  build, fonts/images. Needs raw/build.txt + raw/analyze.
- `dependency-diet`: all 61 deps: import sites, real cost, substitutes, misplaced
  runtime/dev, knip's unused-deps list.
- `duplication`: raw/jscpd.txt (275 clones) triage + semantic near-duplicates.
- `dead-code`: raw/knip*.txt, raw/tsc-unused.txt, raw/madge-orphans-filtered.txt,
  raw/depcruise.txt triage; env/feature flags; commented-out blocks; superseded components.
- `data-layer`: prisma/schema.prisma vs usage (models/columns/indexes never read),
  query shape (over-select, include bloat, N+1), audits/db-indexes-live.json.

## Baseline metrics (phase 0d, measured 2026-08-25 14:30)
- `next build` cold: **45.6s wall** (compile 16.9s, TypeScript 19.4s, runAfterProductionCompile
  3.0s, static gen 0.6s; 92 routes, 43 = /lab). Warm rebuild (cache): 23.9s (compile 4.1s,
  TS 8.1s). Command: `SENTRY_AUTH_TOKEN= npm run build` (token blanked so no Sentry release).
- `npm run check`: 26.0s, 75 test files.
- cloc (tracked): 160,602 code lines. TS 92,414 / MD 26,760 / JSON 25,083 / JS 13,415 / HTML
  1,064 / SQL 787 / CSS 445 / SVG 373 / YAML 261. Comments 36,721, blanks 18,038.
- src/app 46,497 code (lab 32,196 → non-lab 14,301); src/components 35,028; src/lib 17,941
  code + tests 7,352 (68 files); scripts 6,280; docs 17,435; prisma 799; e2e 233;
  .claude tracked 15,023 (skills+agents).
- Comment/code ratio: src/lib 0.52, src/app non-lab 0.38, src/components 0.34,
  prisma/migrations-manual 1.24, proxy.ts 1.91.
- Deps: 45 runtime + 16 dev = 61. knip: unused deps d3-scale, supercluster, @types/bcryptjs,
  @types/d3-scale, @types/supercluster; unused devDeps jsqr, qrcode, xlsx (transitively via
  unreferenced scripts); prod-only extra: dotenv, pg (pg is a real peer of adapter-pg → FP);
  unlisted: d3-selection, geojson (alumni-map.tsx + lab/_maps), @auth/core/jwt (dev-login).
- knip: 124 unused files (68 are *.test.mjs = config gap; ~45 scripts; badge.tsx, tabs.tsx,
  .puppeteerrc.cjs, e2e/auth.setup.ts FP), 202 unused exports, 42 unused types.
- jscpd: 275 clones / 3,819 duplicated lines (2.74%) in src+scripts+e2e (tests excluded);
  12 clones in tests.
- madge: 5 real cycles (catchups.ts<->catchups-notify.ts; feed-rail<->rail/letters-module;
  onboarding-flow<->3 steps). depcruise (TS6 pinned): same 5 + 2 orphans (badge, tabs).
- tsc unused-locals/params: 4 hits (merge-cities CANONICAL_PLACE_ID; combobox/popover React
  import; utils.ts batchType param).
- Type sludge (non-lab src): `: any` 5, `as any` 4, `as unknown as` 11, eslint-disable 52,
  console.* 63. TODO/FIXME: 6. process.env reads: 34 distinct keys.
- "use client": 258 files (180 outside lab; 41,433 raw lines outside lab). "use server": 20.
  `next/dynamic`: 1. Internal barrel: `src/components/common/filters/index.ts` (only one).
- **Tool finding (orchestrator, verified):** `npm run analyze` (`ANALYZE=true next build`)
  prints "The Next Bundle Analyzer is not compatible with Turbopack builds, no report will
  be generated" and produces nothing. `@next/bundle-analyzer` devDep + `withBundleAnalyzer`
  wrapper in next.config.ts + the `analyze` script are inert on Next 16. → S-finding for
  dependency-diet/lib-core. Replacement: `next experimental-analyze`.
- type-coverage: crashed on Node 26 (`ts.SyntaxKind` undefined at load) with three
  different invocations; substituted by raw/type-sludge.txt grep. Recorded in coverage map.

## Orchestrator probes during the fan-out (2026-08-25 ~14:55)
- Shared chunk `static/chunks/24740q0lmcv1n.js` (245 KB raw, referenced by all 92 pages)
  contains 66 `posthog` string markers → it is the full `posthog-js` SDK, loaded on every
  page including /login and the landing page. Lead for bundle-build + dependency-diet:
  `posthog-js/lite`, or `next/dynamic`/idle-time init, or the `/ingest` proxy with a
  deferred loader. (Verified by grep on the built chunk; minified chunks carry no module
  paths so package attribution needs the analyzer data or the manifests.)
- Root main files (every route incl. static ones): 6 chunks, 430 KB raw (React/Next runtime
  223 KB + 126 KB + smaller). Not reducible by app code.
- Lesson logged: Bash cwd persists across calls; a `cd` into .next made a later relative
  `ls` fail and looked like the analyzer output had been wiped. Always use absolute paths.

## Process proposal (draft, orchestrator; to be refined with lib-tests + scripts-e2e-ci reports)
The owner's ask: "stricter rules about which test scripts we keep" and "maybe I end each
session by saying close it out". Draft of what the report will propose:
1. **A session-scratch convention.** Anything created to answer a question during a
   session (a probe script, a one-off test, a screenshot, a JSON dump) is written under
   ONE gitignored folder (`.scratch/` is already in .gitignore and unused) or under
   `temporary screenshots/`, never under scripts/, src/, docs/ or the root. If it needs to
   survive, it is promoted deliberately: a line in scripts/README.md, a header comment
   naming the bug/finding it pins, and a commit that ships it with the fix (CLAUDE.md
   already says this for tests: "a scratch test is deleted, not committed").
2. **"Close it out" = a named checklist**, run only when the owner says so: (a) delete
   `.scratch/`; (b) list untracked files outside the gitignored folders and ask; (c) run
   the orphan gate (below) and delete what it flags; (d) confirm progress.md has the
   session entry and the tree is clean of the session's work. Written into CLAUDE.md as a
   short section; no automation deletes anything on its own.
3. **An orphan gate inside `npm run check`** (T2, autonomous): a script that fails when
   (a) a file under scripts/ is neither in package.json scripts nor listed in
   scripts/README.md nor imported by another script; (b) a `*.test.mjs` has no header
   comment naming what it pins (a bug id, a finding id, or a spec section) - the same
   idea as the lab registry gate, which is the one gate that provably stopped a rot. Draft
   the exact check with the scripts-e2e-ci and lib-tests findings.
4. **A test-survival rule** for CLAUDE.md: a test file survives only if it (i) imports and
   exercises the function OR reads a source file for a pattern AND names the regression it
   pins in its first comment; (ii) would fail if the fix were reverted (mutation-tested
   once, noted in the header); (iii) is not a duplicate of another file's assertion.
5. **A docs-archive rule**: finished audit artefacts move to a dated archive folder in
   the same commit that closes the audit; progress.md gets archived by month once it
   passes ~2,000 lines (it is 317KB now).
- knip with a proper config (raw/knip.json: scripts, tests, e2e as entries): unused files
  drop to 2 (ui/badge.tsx, ui/tabs.tsx); unused exports 158, types 37; unused runtime deps
  now ALSO `shadcn` (CLI, never imported) and `tw-animate-css` (knip cannot see CSS
  @import - check globals.css before believing it); unused devDeps `tailwindcss` (FP: used
  by @tailwindcss/postcss + CSS import) and `xlsx` (no script imports it). jsqr/qrcode are
  used by scripts (gen-support-qr / a QR verifier) so they are fine as devDeps IF those
  scripts survive.
- Root layout (read by orchestrator): mounts PostHogProvider (full posthog-js), ThemeProvider,
  MascotFlightLayer, Toaster, @vercel/analytics on EVERY route incl. signed-out. (main)
  layout adds TourProvider, InstallPromptCapture, PostHogIdentify, AppShell (sidebar +
  bell + search + eggs + mascot), plus per-request DB work (notification count, catch-up
  advance awaited, last-seen, mail-queue drain in after()). template.tsx is a client
  `motion.div` from "motion/react" (full runtime) wrapping every page - the cross-fade.
  Comment drift: (main)/layout.tsx:81 says "There is no cron on this project" while
  vercel.json defines two crons (catchups tick, demo reset).

## Orchestrator verification log (phase 2a, running)
- auth-edge: 4 spot checks (signIn/signOut importers=0; LOGIN_TRANSITION_FLAG 3 files as
  claimed; zero tests reference the five message files; both (auth) layouts are 13-line
  metadata-only). ALL CONFIRMED.
- feed-posts: 3 spot checks (no /groups route + createPost refusal + letter-engagement's
  two /groups fallbacks; post-card excerpt regex lacks the image rule plainExcerpt
  documents fixing; parseImageUrls === parseJsonArray semantics). ALL CONFIRMED.
- catchups: 3 spot checks. createCatchup dead: CONFIRMED (one comment ref only).
  Unadopted view-model types: CONFIRMED (zero refs).
  **catchups-16 REFUTED**: `CatchupEdition.theme` IS read - the admin reading room
  (`admin/catchups/[catchupId]/page.tsx:95` selects it, `:205` renders `round.theme`),
  added in commit 6d5609e (2026-08-25, after the agent's mental model formed). The
  demo-seed themes render there. Finding must be dropped or rewritten as "no
  member-facing reader"; column stays. Lesson: the tree moved mid-audit; verify every
  dead claim against HEAD at verification time.
- directory-profile: 4 spot checks (supercluster/d3-scale zero imports; ProfileAvatar only
  lab + one prose mention; HousesChain zero code refs BUT one prose mention in
  house-spans.ts:6 to clean with the fix; professions vocabulary has no writer, onboarding
  dir gone). ALL CONFIRMED (one addendum).
- landing-mascot-avatars: 4 spot checks (USE_V2=true + early return at :682; SHOW_SHOWCASE
  false + gated JSX; catchups-explainer registered nowhere; bindPassword zero callers).
  ALL CONFIRMED.
- admin-analytics: 3 spot checks (loadSupport zero importers; byHouse/photoLoves zero
  readers; admin-worklist imported only by the server page + query file). CONFIRMED.
  Sub-claim for the verify pass: confirm which variable holds loadSearches().recent on
  analytics/page.tsx (two other `.recent` reads exist and ARE rendered).
- Tally after wave 1: 84 findings (37 T1 / 33 T2 / 12 T3 / 2 T4), 17 claims sampled by
  orchestrator: 16 confirmed, 1 refuted (catchups-16), 1 sub-claim to verify.
- findings-index.json built by raw/extract-findings.mjs (re-run it as reports land).

## Verification-scope decision (2b), 19:45
One adversarial verifier per finding across ~250 findings would cost more than the find
pass itself. Scope instead: verify (a) every T3/T4, (b) every finding touching pinned or
security files (rule-test paths, proxy, auth, upload, demo), (c) every dead/unused claim
(the class where catchups-16 failed), (d) anything my sampling flagged. Skip standalone
adversarial agents for T1 hygiene items whose evidence is a quoted comment/grep already
double-checked by tool + agent; `npm run check` at fix time is their gate. Waves of 6-8.

## Phase 2a compilation notes (all 18 reports read in full, 2026-08-25 ~21:00)
Spot-checks by orchestrator this phase: member-surfaces (updateUserProfile comments-only ✓,
QR 199KB+0 refs ✓, about page verbatim ✓, SettingsLoading name ✓); shell-primitives
(computeBatchFromSchooling/pickAvatarColor 0 refs ✓, bird-avatar ignores avatarColor ✓,
leaf-variant only hit is the alias comment ✓, the `dark: ` no-op + doubled focus trio
verbatim ✓); lib-core-config (87,384 generated lines ✓, demo-bar string in chunk
3szri51gnxmii.js ✓, prisma/migrations dir absent ✓); lab (zero code leakage ✓, 3.6M/11M
server bundle ✓); root-docs (README db-push lines 56+107 and admin-login line 39 ✓,
AGENTS db-push line 31 ✓, WhatsApp 0 refs ✓, mountain-mark 1 ref ✓).

### Cross-agent CONFLICTS to resolve in the report
1. catchups-16 (CatchupEdition.theme dead): REFUTED by orchestrator — admin reading room
   (6d5609e, same day) selects+renders it. Rewrite as "no member-facing surface".
2. CONTRIBUTION_STATUSES/canBecomePaid: dead-code-09 says delete; member-surfaces-11 says
   keep (tested spec of the C-084/C-085 rule whose prod form is PAYABLE_FROM inline).
   RESOLVED: keep (matches lib-tests-08 clause 3 preference for behavioural pins).
3. /donate: member-surfaces-08 (proxy redirect, keeps old links, drops the route) vs
   dead-code-16 (delete outright). RESOLVED: present proxy-redirect as the recommendation.
4. Five *-message.ts merge: auth-edge-04 (merge, no pins — verified) vs duplication
   not-finding (keep, banners differ). RESOLVED: optional/low-priority with disagreement noted.
5. wood.tsx move to lab: member-surfaces-04 (move + rewrite revival note) vs lab not-finding
   (leave; revival recipe references app-shell). RESOLVED: fix the three stale references
   (both agree); the move itself optional-taste.
6. Account/Session models: dead-code-14 said keep (adapter configured); superseded by
   dependency-diet-04 + data-layer-01 (adapter itself inert). Sequence: adapter removal
   first, then all three models orphan.
### Major cross-agent MERGES (programme entries for the report)
insensitive x4 reports; cron-secret helper x3; upload preamble x2; places transaction x3;
person/author selects x3; optimistic heart x2; paged-list hook x2; empty-state hoopoes x2;
test kit x2 (lib-tests-01/02 + duplication-03); legacy avatar x2 (+sprite owner option);
badge/tabs x3; utils dead trio x2; updateUserProfile x2; createCatchup x2; loadSupport x2;
adapter+auth tables x3; QR pipeline x3; tsconfig exclude x3; analyzer inert x2 (+orchestrator);
DemoBar x2; tour dynamic x2; auth flight machinery x2; links schema x2; groups-residue
programme x6 fragments; knip config x3; de-export sweep x6 fragments; excerpt/readMinutes x2;
loading-skeleton fixes x2; sidebar-test rename x2; close-out convention x4 fragments.
