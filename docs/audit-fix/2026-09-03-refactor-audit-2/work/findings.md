# Refactor audit 2 — findings (orchestrator working notes)

Baseline taken 2026-09-03 16:40–16:50 IST at HEAD `72b5a1d`, tree clean. Raw outputs in `raw/`.

## Orientation
- Predecessor closed 2026-08-27 at `033ea43`; 146 commits since, 122 files added (raw/files-added-since-audit1.txt,
  raw/diff-since-audit1.txt). The new mass: `src/lib` +7,631, `components/collection` +5,476 (the Collection
  rework: river, scrubber, year rail, contribute room, edit dialog), `components/common` +3,193 (photo carousel,
  frame, rows, aim, pinch-zoom, image viewer chrome), lab +2,310/−2,482, `scripts/dev` +1,886 (hand-run passes:
  tag-photos, tag-professions, import-album), `app/(main)` +1,756 (admin review room, collection index/class),
  e2e +1,069 (three collection specs + loading-fallbacks), `components/admin` +947, `scripts/qa` +724.
- The predecessor's close-out verdict binds this audit's projections: dedupe is line-neutral here (every constant
  argued for in a comment), so project clones, deps, bytes, bundle bytes, DB objects. SLOC is reported, not led with.
- Predecessor §5 not-findings and its fix-time refutations (action-gate wrapper, tsconfig exclude, Sentry hook,
  DemoBar/VerifyEmailBanner dynamic half, shared pager, audit-log skeleton) are binding unless new evidence.
- A `next dev` (PIDs 3784/3785) and two other Claude sessions were live at start. Not ours.
- `scripts/qa/knip.jsonc` exists (audit-1 mechanism, shipped 2026-08-28) — knip runs use it.

## Baseline metrics (raw/*)
| Metric | Value | Tool |
|---|---|---|
| Tracked files | 1,252 | git ls-files |
| Tracked weight | 32.19 MB — e2e 13.03 (33 files, the visual baselines) · src 6.83 · public 6.49 · docs 3.27 · root 1.15 (progress.md 0.60, package-lock 0.54) · .claude 0.69 · scripts 0.51 · prisma 0.20 | stat |
| Code lines, whole repo | 199,028 (TS 100,033 · MD 51,023 · JSON 22,428 · JS 17,662 · Text 4,716 · SQL 968 · CSV 790 · Prisma 632 · CSS 428 · YAML 259) | cloc 2.06 --vcs=git |
| Comment / blank | 50,053 / 23,095 | cloc |
| src/app non-lab | 13,636 code (138 files, 70 route dirs) | cloc |
| src/app/lab | 34,426 code (112 files, 48 page.tsx; registry says 47 routes) | cloc |
| src/components | 39,134 (291 files: 38,319 TS + 558 JS tests + 257 JSON) | cloc |
| src/lib | 21,512 (12,215 TS in 138 files + 9,297 JS in 87 test files) | cloc |
| scripts / e2e / prisma | 7,360 JS + 1,414 TS + 968 SQL + 632 schema | cloc |
| docs | 40,581 lines (128 files; 40k markdown incl. audit-1's 19k) | cloc |
| `npm run check` | green, 24.8 s, 102 test files, 47 lab routes, advisories clean | check.mjs |
| `next build` (scratch worktree, load avg 10) | 42.3 s wall: compile 20.3 s · TypeScript 14.6 s · 105 static pages 0.68 s | raw/build.txt |
| First-load JS (raw, uncompressed) | 100 routes (52 non-lab). Non-lab median **1,069 KB**; /profile/[id] 1,258 · /directory 1,231 · /feed 1,225 · /welcome 1,190; landing 899, login 907; min 621. 14 chunks on every route | route-bundle-stats.json |
| CSS | one 233 KB stylesheet + 23 + 9 + 6 KB | .next/static/chunks/*.css |
| Client chunks | 231 files, 6.5 MB; biggest 245, 224, 198, 139, 127, 126, 110 KB | raw/chunk-sizes-top30.txt |
| Dependencies | 33 runtime + 18 dev = 51; 5 overrides; node_modules 672 top-level entries | package.json |
| knip (repo config) | 7 unused files (5 landing showcase family + 2 filters) · 70 unused exports (48 in lab) · 11 types · @prisma/client flagged | knip 6 |
| knip --production | 8 files · 2 deps · 136 exports · 12 types | knip 6 |
| Duplication (src+scripts, no tests) | 232 clones · 2,888 lines · **1.82 %** (tsx 154 clones 2.06 %, ts 35 clones 0.73 %); tests 2 clones; e2e 4 | jscpd 5, --min-tokens 50 --min-lines 5 |
| Circular deps | 0 real (40 inside gitignored generated client) | madge |
| depcruise | 0 violations | dependency-cruiser 16 |
| tsc unused locals/params | 4 | tsc |
| Type sludge (non-lab, non-generated src) | `any` 13 · `as unknown as` 13 · eslint-disable **51** (audit 1 close: 7 / 11 / 47; the first grep said 97 because it counted 46 Prisma-generated headers — corrected 17:40 after fresh-code caught it) | grep |
| "use client" | 285 files (202 non-lab) | grep |
| next/dynamic + import() sites (non-lab) | 52 | grep |
| Barrels | 1 (`components/guide/chapters/index.tsx`) | find |
| process.env keys | 45 distinct | grep |
| TODO/FIXME · commented-out-code candidates · console.log | 5 · 29 · 4 | grep |
| type-coverage | crashes on Node 26 (again); grep substitute | — |

Comment ratio per dir (raw/comment-density.txt): collection 0.78, e2e 0.78, lib 0.67, api 0.62, support 0.58; lab 0.21,
demo-seed 0.14. Highest single files: photo-layout.ts 3.65 (460 cmt / 126 code), upload-shared 2.06, proxy 1.98,
mail-policy 1.97, profession-tags 1.85, next.config.ts 1.81.

## Decomposition (final, launched 17:10)
Rationale (one sentence, as the prompt asks): sixteen territory readers sized 2–9k lines so each reads every file it
owns — the Collection rework and the shared photo primitives got their own readers because they are the largest body
of never-audited code — plus six lenses (fresh-code over every file added since audit 1, dead-code, duplication,
bundle-build, data-layer, dependency-diet) for the questions that fall between territories; waves of six ordered
newest-code-first so a crash loses the least.

| Wave | Keys |
|---|---|
| 1 | collection, media-viewer, fresh-code, dead-code, duplication, bundle-build |
| 2 | feed-posts, catchups, directory-profile, admin-analytics, member-surfaces, auth-edge |
| 3 | shell-primitives, landing-mascot-avatars, lib-core-config, lib-tests, data-layer, dependency-diet |
| 4 | lab, scripts-e2e-ci, root-assets, docs |

Ownership map: every tracked file under src/, scripts/, e2e/, prisma/ and the config surface belongs to exactly one
territory (the hand-run pass scripts to their feature; apple-edge/centroid/shot-*/icon scripts to mascot; scripts/demo
to lib-core-config; tests to lib-tests for quality and to their territory for what they pin). Lenses overlap on purpose.

## Compilation notes
(spot checks, merges, refutations — appended during phase 2)

- **knip's `@prisma/client` "unused dependency" is a false positive** (orchestrator, 17:15): the only importer is the
  generated client (`src/generated/prisma/client.ts:18` imports `@prisma/client/runtime/client`), which is gitignored and
  ignored in `scripts/qa/knip.jsonc`. The package is required at runtime. Verdict: keep; the knip config could
  `ignoreDependencies: ["@prisma/client"]` with that reason — T1 hygiene for the config, not a dep finding.
- **CSS lab share, first pass** (orchestrator, 17:15, `raw/css-lab-share.mjs`): the 233 KB stylesheet's 3,058 class
  rules contain ZERO utilities that appear only in lab sources; 146 KB is attributable to shipped tokens, 68 KB is
  base/theme/@utility/non-class output. Checking whether lab gets its own CSS chunk or is excluded from scanning.
- **CSS lab share, MEASURED** (orchestrator, 17:05, `raw/css-lab-share.mjs` after fixing a path bug in the first pass):
  of the 233 KB stylesheet that every one of the 100 routes references (`32v74upyu8cz7.css`, confirmed via all 100
  client-reference manifests), **890 utility rules / 49.2 KB (21 %) exist only because a lab file uses them**; 97 KB
  is used by shipped code, 68 KB is base/theme/@utility output. Two lab rooms also get their own extra CSS chunks
  (/lab/type 23 KB, one other room 6 KB) and a 9 KB chunk rides on all 100 routes. Audit 1 left this "proven > 0 but
  unmeasured". Candidate fix: `@source not "./lab"`-style exclusion in globals.css with a lab-only stylesheet imported
  from src/app/lab/layout.tsx — the bundle lens should cost it (gzip ~8–10 KB per first visit) and the lab agent should
  say whether lab rooms can carry their own stylesheet without breaking the registry gate. Orchestrator finding
  ORCH-01 unless the bundle lens files it.
- **Lab's TypeScript cost, MEASURED** (orchestrator, 17:12, `raw/tsc-diag-*.txt`, scratch tsconfigs deleted): with
  `.next/types` out of the program so the comparison is fair, the full program is 6,320 files / 230,730 TS lines /
  check 9.0 s / total 11.3 s; without `src/app/lab` it is 6,207 files / 186,367 lines / check 5.0 s / total 7.4 s.
  **The lab is 19 % of the TS lines in the program and 44 % of the check time** (113 files, 44,363 lines incl. its
  comments). BUT a tsconfig `exclude` cannot remove it: `.next/types/validator.ts` imports every route's page, so with
  Next's route types in the program (as the real tsconfig has) excluding `src/app/lab` drops exactly one file (6,322 →
  6,321). This is why audit 1's "tsconfig exclude" lever measured nothing. The only way to take the lab out of the
  build's TypeScript phase (14.6 s of the 42 s build) is to take it out of the app directory at build time — an owner
  decision (audit-1 §4 #6: lab stays deployed). ORCH-02. A no-lab scratch build is running to put a wall-clock,
  compile-time and CSS-size number on that decision.
- **Unit-suite timing, MEASURED** (orchestrator, 17:18, `raw/test-timings.txt`): 1,004 tests in 102 files, 5.0 s in one
  `node --test` process, all passing. Slowest by construction: avatar.test.mjs 1.59 s (a third of the suite), the
  108 MP-refusal test 1.12 s (sharp), the overflow-visible rule 1.06 s; then a long tail under 220 ms. For lib-tests.
- **Lab's build cost, MEASURED with a lab-free scratch build** (orchestrator, 17:25, `raw/build-nolab.txt`, worktree
  `.scratch/audit2-build-nolab` with `src/app/lab` and `public/lab` moved aside; built at load average 15 vs 10 for the
  baseline, so the wall clock understates the saving): wall **42.3 s → 30.2 s (−29 %)**, compile **20.3 → 13.7 s**,
  TypeScript **14.6 → 9.1 s**, static pages **105 → 62**, client chunk dir **6.5 → 4.1 MB**. Per-route first-load JS
  is unchanged to the kilobyte on /feed, /profile/[id], /directory, /, /login — the lab leaks 0 bytes of JS (audit 1's
  finding, reconfirmed by a whole build). The CSS comparison from that run is INVALID: the lab folder was moved inside
  the worktree, so Tailwind still scanned it; run 2 (in progress) moves it outside. ORCH-02 now carries numbers: the
  lab costs ~12 s of every production build and every Vercel deploy. Owner decision (audit-1 §4 #6 restated with the
  price): keep deploying the lab, or build it out (e.g. exclude `src/app/lab` from the production build via a build-time
  move or a `next.config` route exclusion — the fix session must find the Next-16-sanctioned mechanism; `tsconfig
  exclude` is NOT it).
- **Tailwind scans the whole repository for class names** (orchestrator, 17:25, `raw/css-source-attribution.*`):
  Tailwind v4's automatic source detection in this project walks 1,864 files — every markdown doc, `progress.md`
  (600 KB), `.claude/**`, `scripts/**`, `e2e/**` — because `globals.css` has no `@source` scoping. Two consequences to
  quantify (attribution rerun pending): rules that exist only because prose mentions a class name, and scan time on
  every build and every HMR pass. Candidate fix: `@source "../"` scoped to `src/` (or `src/` minus lab) in
  `globals.css`, which is a one-line change with `npm run visual` as the gate. ORCH-03.
- **Stylesheet attribution, corrected** (orchestrator, 17:28, `raw/css-source-attribution.txt`): of 3,058 class rules,
  1,615 (96.1 KB) are used by shipped `src` TypeScript, **895 (49.8 KB) only by lab files**, 40 (2.5 KB) only by prose
  (DESIGN-SYSTEM.md, media.md, progress.md, a skill file, a rule test), 508 (66 KB) are theme/base/@utility/variant
  output with no class token. So ORCH-01 stands at ~50 KB raw of lab-only CSS on every route; ORCH-03's byte payoff is
  small (2.5 KB) and its real payoff is scan time — 1,864 files walked per build/HMR. Run 2 of the lab-free build will
  show the actual stylesheet size without lab sources in scan scope.
- **Lab-free build, run 2 (lab sources outside the scan root) — the CSS number is now real** (orchestrator,
  `raw/build-nolab-run2.txt`): the shared stylesheet drops **233 KB → 175 KB raw (−58 KB, −25 %), 34.3 KB → 27.7 KB
  gzipped (−6.6 KB on every member's first visit)**, and the two lab-only CSS chunks (23 KB, 6 KB) vanish. That is
  ORCH-01 measured by a build rather than estimated by attribution (the attribution said 49.8 KB; the extra ~8 KB is
  variant/theme output the lab alone triggered). Combined ORCH-01/02 price of the lab in production: ~12 s per build,
  −58 KB CSS per route, 43 fewer static pages, 2.4 MB fewer client chunk bytes on disk, 0 bytes of JS. The fix does not
  require deleting anything: a lab-only stylesheet (lab layout imports its own `lab.css` with `@source "./"`) plus
  `@source` scoping in `globals.css` keeps every room working at its own URL while members stop paying for it; the
  build-time seconds need the routes out of the production build, which is the owner's call.
- **CORRECTION to the run-2 CSS number above — run 2 FAILED** (`raw/build-nolab-run2.txt`, exit 1, "Turbopack build
  failed with 3 errors: Parsing CSS source code failed"). Cause: I had moved the first run's `.next` to `.next-run1`
  inside the worktree, a name the `.gitignore` pattern `.next-stale*/` does not cover, so Tailwind's unscoped source
  scan walked a build cache of binaries and emitted utilities like `.gap-[var(--\x14Ys)]` (38 warnings, then 3 fatal
  parse errors). The 175 KB figure came from a partial emit and is withdrawn until run 3 (caches renamed to
  `.next-stale-*`, in progress). **This is ORCH-03's strongest evidence**: with no `@source` scoping, anything in the
  tree that is not gitignored — a moved-aside cache, a scratch folder, a screenshot pile — becomes Tailwind input, and
  the failure mode is a broken production build with a cryptic CSS parse error. CLAUDE.md's own advice (`mv .next
  .next-stale`) only works because the ignore pattern happens to match that name.
- **Lab-free build, run 3 — CLEAN, the numbers to use** (`raw/build-nolab-run3.txt`, exit 0, load average 11.6):
  wall **30.0 s vs 42.3 s**, compile **13.6 vs 20.3 s**, TypeScript **10.2 vs 14.6 s**, static pages **62 vs 105**,
  client chunks on disk **4.0 vs 6.5 MB**, shared stylesheet **164,037 vs 238,434 B raw (−74,397 B, −31 %)**, **25,289 vs
  34,274 B gzipped (−8,985 B on every first visit)**; the two lab-only CSS chunks gone; per-route JS unchanged. The
  attribution script's 49.8 KB undercounted because the lab also triggers variant/theme output it cannot attribute.
  ORCH-01 = −74,397 B raw / −8,985 B gz CSS per route (achievable WITHOUT removing the lab, via a lab-only stylesheet and
  `@source` scoping); ORCH-02 = −12 s per build / −43 static pages (needs the lab out of the production build: owner).

## Compilation notes — per report

### media-viewer (61 KB, 18 findings, 2 owner decisions, 13 not-findings) — read in full
Spot checks at HEAD (orchestrator): **01 confirmed** — five `dynamic(() => import("@/components/common/image-viewer"))`
sites (collection-client:71, post-card:68, letter-images:19, answer-photos:37, photo-wall:30) plus four preload
imports and photo-river's exported one. **02 confirmed** — nine chunks in the scratch build match both
"Copy a link to this photo" and `data-viewer-chrome`. **03 confirmed** — the opener class string is at exactly the
five lines named. **04 confirmed** — collection/actions.ts:339-342 is `.resize(1600,1600).webp({quality:80})` on the
FormData fallback while :594-603 is `storedResizeBox` + `COLLECTION_WEBP_QUALITY`; image.ts:67 is the feed's q80.
Quality: excellent — every finding carries line ranges, a gate and the pin it touches. Structural 8 / cheap 10, as the
agent says. Notable: **18 is a correctness lead** (Catch-up answers open the aim dialog at 50 % instead of the saved
focal point) — goes to §3 as a finding AND to docs/planning/bugs.md's candidate list in the report; **09** records that
`IDLE_MS` moved 2.6 → 3.6 s inside a bug-fix commit without a stated reason (a hygiene question for the owner, not a
finding against the fix). Owner decisions: /lab/crop room + 1.58 MB of specimens (throwaway by its own header); the
Collection fallback encode (1600/q80 vs full-res/q100). Cross-boundary items for collection, feed-posts, catchups and
bundle are listed in its "For other lenses" — merge when those reports land.

### collection (79 KB, 17 findings, 5 owner decisions, 14 not-findings) — read in full
Spot checks at HEAD (orchestrator): **02 CONFIRMED, and it is a live bug** — collection-client.tsx:288 builds
`facts` from `scopeFacts[scope]` but :1408 passes the flat server-rendered `roomLeft`; `facts.roomLeft` is read
nowhere; only collection-data.ts and collection-client.tsx mention `scopeFacts`/`hasApprovedPhotos` (no test does).
**04 confirmed, and undercounted** — `select: { verifyState: true, batchYear: true }` on `user.findUnique` is at
collection-data.ts:125, actions.ts:232, :799, :975 and [id]/page.tsx:61 = five sites (agent said four).
**04b confirmed** — [id]/page.tsx:101 hard-codes `order: "newest"` while collection-data.ts:100 uses
`defaultOrderFor(scope)`. **01's premise confirmed** — posthog-client.ts:102 sets `capture_pageview:
"history_change"` and the component's own comments at :376-387 describe Next reading a `replaceState` as a
navigation; the RSC-refetch claim itself is the component author's measurement and needs a chrome-devtools
re-measure (the agent says so; the verify pass should do it with the MCP — orchestrator can, agents cannot).
Quality: excellent, and the honest ordering ("what would a fix session delete first") is exactly what the fix
prompt needs. Two correctness leads beyond simplification: 02 (quota cap follows the wrong half after a swap,
despite dad5307's claim) and the intake quota counting without `scope` (For other lenses → feed-posts).
Collection, continued: findings 05-17 read. 05 (three-hook decomposition, line-neutral, moves ~10 source pins — do
LAST), 06 (one encode helper — same as media-viewer-04; MERGE), 07 (drop the head IntersectionObserver, the scroll
listener already answers; −55 lines; medium risk, the most-fixed surface this week), 08 (legacy `area`/`freeTags`
retirement = audit-1 §4 #16 with the exact SELECT — closes that owner item; hands 2 columns + 2 GIN indexes to
data-layer), 09 (one column map for photo meta writes, 3 → 1), 10 (move `loadPhoto`/`myPendingPhotos` out of the
"use server" file: 2 fewer public action endpoints), 11 (HALVES copy table; taste), 12 (`mixed` prop + un-mounted
standalone ContributeRoom: placeholder), 13 (tag-photos picker does not carry its rules into the manifest — a
PROTOCOL violation the hand-run-passes test does not catch; + album importer's two acknowledged copies), 14 (~150
comment lines narrating the same bug four times), 15 (~110 lines of version history in photo-layout.ts), 16
(hygiene batch incl. `BandCount` ×3, `PhotoData.createdAt` shipped for the lab only ~1.5 KB/page, knip's seven),
17 (run the second stranded-originals sweep, then delete the script + narrow the key regex). Owner decisions: album
importer's fate; /lab/collection/swap archive; the proxied fallback (keep but announce "saved at reduced size");
`Image.greyscale` computed-never-read (recommend stop + drop); `Photo.approvedAt/approvedById` write-only audit
trail (recommend keep, comment it). Data-layer handoffs: `approvedAt`, `approvedById`, `area`, `freeTags`,
`Image.greyscale`, `Image.createdAt` unread; `PhotoLove.id` surrogate beside a unique; `@@index([approved,
isHidden, createdAt])` is a prefix of `Photo_river_added_idx`; `Photo_river_era_idx` + `@@index([era])` served a
filter that no longer exists; 2 trigram GINs on `area`/`freeTags`. Overlaps to merge: collection-06 = media-viewer-04;
collection-16's preloadViewer = media-viewer-01; the intake quota `scope` bug → feed-posts + bugs list.

### fresh-code (71 KB, 25 findings, 6 owner decisions, per-file verdicts on 110 files / 29,336 lines) — read in full
Spot checks at HEAD: **05 confirmed** (prelude `const value = (name, fallback)` in 6 scripts, `DEMO_REF` in 7);
**07 confirmed** (directory-client.tsx:168-173 mirrors props into state; every `renderPrimaryFacets`/`Secondary`
caller passes `true`); **08 confirmed** (pinch-zoom.ts:489-506 returns a fresh literal; image-viewer.tsx:388 lists
`zoom` in the keydown effect's deps). 09, 11, 18 checked below. Its big service is the **eslint-disable correction**:
the 47 → 97 jump in raw/type-sludge.txt is 50 Prisma-generated headers (my grep did not exclude `src/generated`);
the real non-generated count is 58 → 62, every new one reasoned. Baseline table must carry the corrected number.
Overlaps to merge in the index: fc-01 (whole contribute pipeline ×2, ~90 lines) ⊃ collection-06 = media-viewer-04
(the encode); fc-02 = media-viewer-01 + 03; fc-06 ≈ collection-09 (meta normalisation vs column map — adjacent, list
both); fc-09 ∪ collection-16 (BandCount ×3) + the hand-typed `[0.22,1,0.36,1]` ×6 (a CLAUDE.md rule violation);
fc-10 = media-viewer-11; fc-13 = collection-17; fc-16 = collection-12; fc-17 ≈ collection-16 (knip lines);
fc-23 = collection-04 (permalink double read); fc-19's image.ts docblock = media-viewer-05. New and cross-cutting:
**fc-11** (SpringPress's prop type forces `as object` casts at 12 shipped + 26 lab sites — a type-sludge root cause
in motion.tsx), **fc-12** (drive.mjs: four diagnosis scenarios now pinned by unit tests, ~300 lines, one gitignored
fixture dependency), **fc-14** (backfill script with its SELECT), **fc-15** (a script writing to a root folder
`.tmp-shots/` — a CLAUDE.md root-rule breach hidden by gitignore), fc-21 (directory-client nested ternary +
mis-indentation). Owner decisions overlap collection's (fallback, /lab/crop, swap room) plus /lab/focus archive,
one-off scripts, drive scenarios.

### dead-code (63 KB, 10 findings, 5 owner decisions, ~20 not-findings, floor deliverables A–J) — read in full
Spot checks at HEAD: **02 confirmed** — `showControls` has one caller (feed/page.tsx:85, `false`); the
`{showControls && (...)}` block at post-feed.tsx:281 has never rendered since the header search pill; this is the
"second switched-off subsystem" (~150 lines end to end incl. two Prisma orderings and three audit-fixed bugs no
member can reach) → owner decision, recommend cut. **08 confirmed** — button.tsx `link`, `icon-xs`, `icon-lg` have
0 usages. **04 confirmed** — `primary-foreground`/`accent-foreground` have no consumer outside globals.css; the
`.hoopoe .wing` block at globals.css:672-681 has no shipped markup. **01** (two orphan filter-kit files, 80 lines)
closes audit-1 §4 #17 as moot — matches collection's reading. **05** corrects four of audit 1's triage verdicts with
evidence (MAX_IMAGES re-export direction, TAP_MIN_PX hand-copy, dailyBudget comment-not-import, AdminSectionDef
in-file use). **06** 421 KB tracked orphans (3 crop leftovers = media-viewer-08, + c3-thumb with its SELECT) and
audit-1's never-executed untracked 6 MB. **10** knip config hygiene (= my ORCH note on @prisma/client). Floor
deliverables are the valuable part: env keys 44/44 read (Upstash fail-open is an OWNER question with security
weight — production config unverifiable here); API routes 14/14 called; routes: /guide index reachable only from its
own child (owner: link it); no vacuous test pin (102 files swept, one weak first-assertion in mail-queue-rule noted);
zero commented-out code for the second audit running. Honest totals: ~280 lines, ~17 CSS lines, ~421 KB tracked,
20 exports narrowed, 0 deps. Clean hunts recorded so nobody repeats them.

### duplication (76 KB, 21 findings, 5 owner decisions, ~20 not-findings; all 238 clones classified) — read in full
Spot checks at HEAD: **01 confirmed, incl. the guard gap** — `DEMO_REF` is in 7 dev scripts and absent from
`import-album.mjs` (0 matches), the one script that writes photographs; **04 confirmed** — `_probe-kit.mjs` exports
`bootstrap`, `openDb`, `makeLedger`, and `phase3-probe.mjs:25` imports the first two while keeping its own `check`
at :40; **05 confirmed** — `audit-status.mjs:85` still defines a private `fnBody`; **02 confirmed** — only
`use-composer-uploads.ts:182-189` has the 60 s `AbortController`; photo-attachments and message-composer have none
(a wedged-busy drift, member-visible); **07 confirmed** — five hand-typed `text-[27px]` h1s beside `AuthHeading`
(auth-panel.tsx:163), and `auth-first-frame.test.mjs:41` pins the literal class string (the fixer must widen it).
Census: a 47 (522 lines) / b 115 (lab, 1,866) / c 1 / d 38 (the C-189 preamble contract — NOT duplication, and
the wrapper stays refuted) / e 31. Honest projection: ~110 copies removed, ~700 duplicated lines to single owners,
net SLOC ≈ −180 (almost all scripts), two behavioural drifts closed (upload timeout, avatar HEIC blank-MIME), one
missing guard. Overlaps: dup-01 = fc-05 (+ the guard); dup-02 = media-viewer-06 (+ the timeout drift); dup-03's
settings HEIC gap is new (correctness lead); dup-14 = fc-06 (types half); dup-04 ⊃ fc per-file puppeteer note;
dup-09 item 1 (requirePhotoOwner) is adjacent to collection-09; dup-15 admin checks in collection/actions (+ lab
actions). Carry-overs: audit-1 dup-24 items 3/4 never done (dup-11, dup-13/09.5); dup-16 type half not done
(dup-06); dup-20 five residues (dup-15). Owner decisions: letterhead concept "keep in step" header (restated with a
third variant now), three off-ladder heading sizes (27/26/24 px; bless one), lab importing SPRINGS, "group" wording
in four catch-up refusals, the plural ternary (recommend leave). Correctness leads for the bugs list: upload timeout
missing on two surfaces; avatar HEIC check misses blank MIME; import-album has no destination guard.

### bundle-build (67 KB, 10 findings, 6 owner decisions, ~14 not-findings) — read in full
Spot check at HEAD: **01 confirmed** — motion-features.tsx:31 is `import("motion/react").then(m => m.domMax)`;
built chunk 02l-4doqbe4qr (72 KB) contains `Reorder` and `useInvertedScale`, 0i3ir (60 KB) is the real domMax
(contains drag), and 02l is in 0 first-loads (post-hydration on all 100 routes). Reconciliation with my own
measurements: **bundle-build-02 = ORCH-01 + ORCH-03**. The agent's rule-removal method gives 60.8 KB raw / 7.2 KB
gz lab-only + 5.1 KB docs-only; my lab-free BUILD gives 73 KB raw / 9.0 KB gz (it also drops variant/theme output
the lab alone triggers and the two lab-private CSS chunks). Report both: the attribution is the floor, the build is
the ceiling. The agent supplies the mechanism (`@import "tailwindcss" source("../")` + `@source not "./lab"` + a
lab-only `lab.css` with `@reference`), which ORCH-01 lacked. **bundle-build-07 = ORCH-02**, with my measured
cold numbers replacing its estimate: 42.3 → 30.0 s wall, compile 20.3 → 13.6, TS 14.6 → 10.2 (both cold; the agent
rightly notes Vercel restores the Turbopack cache so a warm deploy pays less) — and its important correction that
a build-only tsconfig excluding the lab WOULD work (nothing shipped imports the lab) while `.next/types` pulls it
back into the main program; it recommends against it for the deploy-type-check reason the owner already chose. Its
verdict and mine agree: keep the lab deployed, take the CSS. New and strong: **01** (motion barrel, ~70-90 KB raw /
17-22 KB gz post-hydration on every route; two-line fix), **04** (Turbopack module duplication: 23 byte-identical
chunk pairs, 68-156 KB repeated per route; an experiment with a measurement gate), **03** (guide chapters eager on
39 routes, 14 KB), **05** (Combobox eager on /welcome and /admin/people/[id], 53 KB), **06** (Phosphor six-weight
defs, ~5 KB gz on heavy routes; owner-visible), **09** (Sentry telemetry:false). **10 = dead-code-04** (wing rules).
Not-findings re-proven chunk-by-chunk: posthog off the critical path, 0 lab JS leak, 0 server-only modules in
client chunks, optimizePackageImports complete (OPERATIONS §5 sentence now stale → docs), fonts correct, the 20
biggest client files all need the boundary. Carry-overs: every audit-1 bundle row accounted for; bird sprite and
map deferral still owner-open. Floor of a member page measured: 1,055 KB raw / ~340 KB gz JS + 233 KB CSS.

- **collection-01 browser measurement DEFERRED** (orchestrator, 17:45): the RSC-refetch-per-filter-press claim can
  only be settled in a signed-in browser. Signing the MCP browser in needs `DEV_LOGIN_SECRET`/`ADMIN_EMAIL` from
  `.env`, and this session's permission gate refused the read (correctly — the audit rules say never read `.env`).
  Verdict for the report: **unverifiable-needs-browser**; the fix session measures it first with chrome-devtools
  (count `?_rsc=` GETs vs action POSTs after one bucket press, then repeat with the `replaceState` line commented
  out), exactly as collection-01's step (1)-(2) prescribes. The finding's premise (PostHog `history_change` +
  a raw `history.replaceState`) is confirmed at HEAD; only the consequence is unmeasured here.

### feed-posts (65 KB, 17 findings, 4 owner decisions, ~12 not-findings) — read in full
Spot checks at HEAD: **02 confirmed** — `revalidatePath("/feed")` at feed/actions.ts:449, 697, 958, 1006, 1035 are
the five (of 20 revalidate calls in the file) on actions whose effect is already in client state; **03 confirmed**
— post-card.tsx:36 static import, :649-656 always mounted; **10 confirmed** — notifications/actions.ts:123,136
`revalidatePath("/")`; **16 confirmed** — the KEEP=100 `skip`/`deleteMany` prune runs on every first-page bell
open while retention.ts sweeps the same table nightly. **01 = dead-code-02** (the hidden sort/time filters):
independent agreement, same recommendation (cut); feed-posts gives the exact edit list and the C-003/C-016 pins.
Charter answers are clean and valuable as not-findings: the 11+2 action preambles are byte-identical (no drift;
wrapper stays refuted), one rich-text pipeline in three files by design, keyset implemented once, all three upload
routes live (none legacy), one Composer/Feed/PostCard honoured, no client-for-a-leaf files. Structural: 02 (~11
queries + an RSC render per comment/vote from /feed — the same mechanism that caused the heart scroll-jump), 04
(M33 one-per-unread rule written twice + 4 inline notification creates), 05 (comment payload ×3), 06 (MAX_IMAGES
literal ×6 = dead-code-05's re-export), 07 (poll parse = audit-1's parseJsonArray sweep missed it; also a
whitespace-option hole), 08 (own-city query ×3), 13 (rAF count-up → motion), 14 (report transaction ×2 + a
"use server" file under components/), 16 (bell prune → retention cron). Owner: A = dead-code-02; B polls (keep;
SELECT written); C loading skeleton draws a composer tile that no longer exists (= fresh-code notes); D media.md
still ignores presign (docs). Correctness/efficiency leads for the report: every 2.5 s letter-draft autosave
revalidates /feed (02's note); editPost enforces the photo cap twice; the poll option `.trim()` after Zod `.min(1)`.
Overlap with duplication-02 / media-viewer-06 noted in its For-other-lenses (the /api/upload client ×3).

### admin-analytics (62 KB, 14 findings, 3 owner decisions, ~15 not-findings; 76 files read) — read in full
Spot checks at HEAD: **01 confirmed** — content-list.tsx imports `approvePhotos`/`declinePhoto` (:37-38) and calls
`approvePhotos` at :133 (its only caller; defined collection/actions.ts:1076); the batch bar and per-row buttons are
still there two days after the review room replaced the queue; `approveChosen` bypasses `useAdminAct` with no
`finally` (B-042 shape). **02 confirmed** — four `f.type === "pending"` branches at admin-content-query.ts:131,
138, 152, 178 behind a page that redirects `?type=pending` first. **07 confirmed** — `touchLastSeen` sits in the
render-blocking `Promise.all` at layout.tsx:78 while an `after()` block exists at :92 and the comment at :53 names it
as the tool. **08 confirmed** — audit.ts:81 and last-seen.ts:243 swallow to `console.error` while
`reportSwallowed` (report-error.ts:25) exists for exactly them. Structural and well-argued: 03 (nine `count`s on one
table → one FILTER aggregate, the shape the same file already uses; ~25 round trips per view), 04 (two sparkline
metrics disagree with their live tiles — snapshot.mjs counts drafts/hidden; correctness), 05 (MailCard = MailRows),
06 (worklist pair's banner is false — audit-1 finding dropped in compilation, now restored), 09 (fetch-all-then-
length counts ×3), 14 (loadTrends fetches ~3,000 rows for ≤7 keys). Charter answers as not-findings: nine list
surfaces, nine bespoke rows, one kit (audit 1's mechanisms all still adopted); every loader field is rendered;
presence cost proportionate. **Security lead (not simplification)**: 20 admin verbs write no audit log, three of
which destroy data (`declinePhoto`, `dismissMail`, `adminRemovePhoto`) — for the report's "outside scope, tell the
owner" list. **Data question**: `User.bio` — analytics comment says retired, `celebration-signals.tsx:34-46` still
requires it for the "profile complete" moment (→ data-layer + mascot). Owner decisions: batch approval vs the room
(recommend remove), the Compare tab (carry-over, keep), three spec-drift items in admin.md (→ docs).

### member-surfaces (66 KB, 16 findings, 6 owner decisions, ~17 not-findings; 80 files read) — read in full
Spot checks at HEAD: **02 confirmed** — letter-engagement.tsx:8-9 imports `CommentsSection`/`ModerationDialog`
statically while post-card.tsx:63-76 lazy-loads both; **03 confirmed** — letters/(index)/page.tsx:100 selects
`content: true` for up to 20 drafts and the strip reads only id/title/updatedAt; **04 confirmed** — wood.tsx has one
importer, the lab aviary variant (plus the registry note); **06 confirmed** — theme-actions.ts:73-74 is the
`setThemePreference → setTheme` alias audit 1 asked to collapse; **09 confirmed** — privacy says "20 August 2026",
last commit 2026-08-26 (bd7da7d). **01 = bundle-build-03** (guide chapters eager on every (main) route; byte offsets
in the chunk agree with the analyzer attribution — two independent methods). Structural: 01, 02, 03 (a 1-line
delete worth up to 400 KB of DB transfer per index load for a drafter), 04, 13 (count-up → motion, like
feed-posts-13), 16 (letter page: 3 post reads → 2). Cheap but true: 05 (three "fourteen-bird" comments,
a composer that left, a barrel rationale that never held), 07 (`generateStaticParams` + "static" claims on routes
the root layout's cookie read makes dynamic — root cause for bundle/owner: could the public pages be prerendered?),
08 (guide.md describes the intercepting route removed 2026-08-27), 10, 11, 12, 14, 15 (another hand-typed EASE_POP).
Owner decisions: About page still "indefinitely procrastinated" (audit-1 #3, restated with the guide as a fourth
option the owner already declined), the PWA tile admin-only "for now" since 08-22 (recommend open it), costs card
constants in three copies (fine; know where to edit), letter reading page lacks Report/Edit/Delete (product, not
simplification), dark-mode cluster stays whole, /notice needs nothing. Leads outside scope: account export omits
`birdOverride`, `showEmail`, `professionTags`… (GDPR completeness → owner/security); demo-bar and guide `hover:scale`
/`-translate-y` on controls (design protocol); the three policy pages + landing + /login could be prerendered if
the theme class were applied differently for the public group (owner/bundle).

### auth-edge (58 KB, 13 findings, 2 owner decisions, ~16 not-findings; 64 files read) — read in full
Spot checks at HEAD: **01 confirmed** — float-field.tsx:5 statically imports `InfoTooltip`, which imports the
base-ui Popover (info-tooltip.tsx:5); the only FloatField caller passing `hint=` is photo-questions.tsx:171 (the
person-detail hits are a different `Field` component); route table: /login 907 KB, /forgot-password 899, / 899 vs
/verify-email 745 (no FloatField) — a ~150 KB raw first-load gap on the four auth pages and the landing for a
tooltip they never render. **This is the largest single first-load lever found by any lens on the public routes**
and the bundle lens missed it (it sized the shell tier and the top-20 client files, not this leaf import) — a
cross-lens catch to give the verify pass. **07 confirmed** — auth-tokens.ts:61-79's docblock argues an export for a
caller that `claimToken` replaced. Charter answers as not-findings (all careful): 3 of 32 lib files are
one-export-one-importer and each is a protocol shape; one canonical email path (two write-side spellings outside
the sweep → 10); three gates for three shapes, one composition chain, nothing to absorb without tripping C-189; the
trivia gate is live; the login page's extra 40 KB over the landing is its own form code, the mascot rig (~85 KB)
is shared and owner-signature (recommend keep, priced); proxy.ts's 262 comment lines re-read and defended.
Structural: 01, 02 (Turnstile sentinel→sentence map ×3 → one `proof()`), 03 (two HMAC-stamp implementations kept
equal by a comment; the trivia pass lacks the human pass's nine attack tests), 04 (`HoopoeWarmup` on pages that
already mount the rig — mascot lens to co-sign), 05 (two handles to one bird ×3), 06 (a no-op route-group layout),
07, 08 (a type re-export + four `User` augmentation fields nothing sets). Cheap: 09-13. Owner: the (i)-tooltip canon
(audit-1 #15, now with a price tag — recommend the signup one), the login bird (keep, priced). Carry-over: the
five `*-message.ts` merge (audit-1 optional, not done; now has two more natural consumers). Cross-lens leads:
nine `callAction` non-adopters outside this slice (B-042 class) listed by file; Button-in-Link siblings to grep.

### directory-profile (91 KB, 27 findings, 5 owner decisions, 16 not-findings; 93 files / ~17,250 lines read) — read in full
Spot checks at HEAD: **02 confirmed** — directory-client.tsx:23 statically imports `AlumniMap`, rendered once at
:742 inside the map view; the 66 KB d3 chunk is directory-only. **04 confirmed** — the profession-tags `hint`
string "Software, data, product, IT…" is in the /directory chunk 0kinxjn443emk.js while page.tsx:296-301 says the
client never imports the vocabulary. **09 confirmed** — `otherCities` produced at directory/page.tsx:125-129,
typed at alumni-map.tsx:45, read nowhere. **13 confirmed** — profile/[id]/page.tsx:39 and :120 are two
`user.findUnique`s per view. **05**: `<HousePicker` renders only in lab/houses (JSX grep); shipped files import
`HouseOptions` from the same module. Structural headline: 01 (the letterhead's ~900 edit-only lines + pen.tsx +
SavedPostsFeed + delete dialog on every stranger's profile view — audit 1 split the leaves, not the trunk; three
independently shippable moves), 02 (66 KB d3 on People-first arrivals), 03 (/welcome loads all five wizard steps
for one sentence, ~115 KB), then a clean dead/placeholder list (05 HousePicker 190 lines lab-only; 06 = dead-code-01
+ 03; 07 HOUSE_OPTIONS = dead-code-03; 09; 10 a server action + skeleton for a column the page already has; 12
photos grid built for a tab that does not exist on your own sheet; 17 six dead props; 18 LocationPicker single
mode — owner; 21 onboarding-local = one-shot latch; 23 skeleton draws a deleted rule = audit-1 F-11 half-applied),
efficiency (08 a column fetched per row + type ×4 = duplication-06; 11 onboarding hand-rolls the places
transaction that place-write.ts claims has "exactly two writers"; 13; 14 first page fetched after hydration;
16 AdminProfileTools bypasses useAdminAct ×4 = the B-042 class), and scripts (19 = duplication-01/fc-05; 20 a
script working in a ROOT folder `.geonames-tmp` — CLAUDE.md root rule — + merge-cities dead const). Owner
decisions: the person-row sweep (docs/spec/person-row-audit.md, steps 3-4 never green-lit), the lab Letterhead
III "keep in step" header (= duplication's), LocationPicker single mode, the two legacy city columns (SELECT
written; after launch), merge/scan city scripts (keep). Two spec banners (directory.md, profile.md) describe a
plan that shipped in a different shape (→ docs). Bug leads: Facebook filed as `kind: "website"`; photo-step copy
points members at a /settings page that 404s.

### catchups (80 KB, 18 findings, 6 owner decisions, ~18 not-findings; 70 files / ~12,900 lines read) — read in full
Spot checks at HEAD: **01 confirmed** — `songUrl` appears outside generated/lab/tests only in actions.ts (schema +
upsert), catchups-round-view.ts (select + rule), catchups-types.ts, spotify-card.tsx and the account-export select;
no client sends it (`answer-experience.tsx` patches `{ body, images }` only) — a fully plumbed pipeline with no
writer since the owner's 2026-07-25 instruction, 0 of 133 entries at audit-1 close; the SELECT to re-prove is
written. **10 confirmed** — catchups-core.ts:25 imports `node:crypto` into the "pure, client-safe" half.
**18 confirmed** — actions.ts:171 `console.error` in `runAction` while the engine file beside it routes the same
class through `reportSwallowed`. The actions.ts responsibility map (22 actions, ~57 code lines each, 19 through
the three gate helpers, preamble byte-identical ×22) is the honest answer to "the biggest file": keep it whole
(audit-1 catchups-05 restated as an owner decision to record). Charter answers as not-findings: lifecycle written
once; three consoles are one shell; join flow copies itself, not auth; dates one voice; photos on the shared kit.
Structural: 01 (~190 lines + 3 columns + one outbound fetch on a write path + an SSRF boundary that no longer needs
defending — owner; its C-027 pin becomes vacuous when the name goes: the fixer must delete that one assert), 02
(audit-1 catchups-03's prop-drill half, recorded as "not done" in the fix log, still not done; 5 spellings of the
cadence set), 03 (every Keeper-only dialog + a 17 KB Tooltip chunk for one (i) ship to every member of a Catch-up
home), 04 (= duplication-02 / media-viewer-06, with the stalest copy: a 5 MB pre-check BEFORE the shrinker — a
member-visible drift), 05 (a "Start one" state no loader produces), 06 (an unreachable fallback query with less
safe semantics), 07-09 (preparing scene ×2 with drifted copy; join shell ×3; membership lookup ×5 + edition select
×4). Cheap: 10-18 incl. **14a**, a 14-line comment block in the core opened with `/* ---` and never closed, that
swallows the next docblock — describing machinery the split deleted. Owner: Spotify pipeline (remove), the (i)
tooltip (native title), photo-size parity (match the feed), actions.ts split (record "no"), `draft` status and
`Catchup.title` (carried; unchanged). Cross-lens: the teacher test written at 8 sites with no helper; the
enrollable-user WHERE ×4 → people-select; `advanceDueCatchups` on every authenticated page view is belt over the
nightly tick's braces (perf lens / owner).

## Merge groups (cross-report overlaps found so far; the report lists every id with "=")
| Programme | Ids | Owner of the steps |
|---|---|---|
| Lab CSS out of the shared sheet + `@source` scoping | ORCH-01 = bundle-build-02 (mechanism) ; ORCH-03 = bundle-build-02 step 1 | bundle-build |
| Lab out of the production build (owner) | ORCH-02 = bundle-build-07 (with ORCH's measured cold numbers) | bundle-build + orchestrator |
| One lazy image-viewer entry point + one opener button + latch | media-viewer-01 + 03 = fresh-code-02 = collection-16 (preloadViewer) = dead-code-05 (the export) = duplication FOL | media-viewer |
| Viewer emitted nine times (bundle) | media-viewer-02 (bundle lens to re-count after 01) | media-viewer / bundle |
| Collection contribute pipeline ×2 / encode recipes | fresh-code-01 ⊃ collection-06 = media-viewer-04 (encode) ; owner half: fallback quality | collection (+ media-viewer-04's owner note) |
| The /api/upload client ×3 + missing timeout + 5 MB pre-check | duplication-02 = media-viewer-06 = catchups-04 = feed-posts FOL | feed-posts owns upload-client.ts; catchups-04 supplies the drift |
| Server image intake ×4 + avatar HEIC gap | duplication-03 | feed-posts / settings |
| Dev-script prelude + demo-ref guard (+ import-album gap) | duplication-01 = fresh-code-05 = directory-profile-19 = collection-16 (last bullet) | scripts |
| QA kit adoption (bootstrap, ledger, launch block, sign-up drive, shot) | duplication-04 (+ fresh-code per-file note) | scripts-e2e-ci decides which scripts survive first |
| audit-status.mjs private fnBody | duplication-05 (audit-1 dup-03 residue) | scripts |
| Hidden feed sort/time filters | dead-code-02 = feed-posts-01 (owner: recommend cut) | feed-posts |
| Two orphan filter-kit files + SortPill + HOUSE_OPTIONS | dead-code-01 + 03 = directory-profile-06 + 07 ; closes audit-1 §4 #17 | directory-profile |
| Directory person type ×4 + byline select + inline birdOverride selects | duplication-06 = directory-profile-08 + 27 = feed-posts-17.13 + catchups FOL (enrollable WHERE) | directory-profile / people-select |
| Photo meta normalisation + column map + input types | fresh-code-06 ≈ collection-09 = duplication-14 | collection |
| Permalink / profile / letter pages reading the row twice | collection-04 = fresh-code-23 ; directory-profile-13 ; member-surfaces-16 | each territory (same `cache()` idiom) |
| Guide chapters eager on every (main) route | bundle-build-03 = member-surfaces-01 | member-surfaces (mechanism agreed by both) |
| Combobox/LocationPicker + wizard steps eager on /welcome | bundle-build-05 = directory-profile-03 (+ 18 single mode, owner) | directory-profile |
| FloatField → InfoTooltip → Popover on auth pages + landing | auth-edge-01 (bundle lens missed it) ; owner: tooltip canon (audit-1 #15) | auth-edge / shell |
| Motion barrel + engine twin + chunk duplication | bundle-build-01 + 04 (+ media-viewer-02's animate note) | bundle-build |
| Hand-typed easing arrays | fresh-code-09 (×6 in collection) + member-surfaces-15 + catchups (none) — one EASE constant each | motion.tsx |
| clamp ×6, BandCount ×3, WEBP_QUALITY ×2, constants | duplication-17 ; fresh-code-09 = collection-16 ; media-viewer-15 | cheap batch |
| `as object` casts (SpringPress prop type) | fresh-code-11 | shell-primitives (motion.tsx) |
| Swallowed errors → reportSwallowed | admin-analytics-08 (audit, last-seen) ; catchups-18 (runAction) ; member-surfaces FOL (search-log) | each file |
| Stale/deleted-code comments batches | media-viewer-13 ; fresh-code-19 ; collection-14/15 ; dead-code (none) ; feed-posts-17 ; admin-analytics-12 ; member-surfaces-05/07 ; auth-edge-11 ; directory-profile-24 ; catchups-14 | one hygiene phase |
| One-off scripts with a live check before deletion | fresh-code-12 (drive scenarios), 13 = collection-17 (sweep), 14 (backfill) ; directory-profile-20 (root folder) | scripts + collection |
| Landing showcase family (owner, audit-1 #1) | dead-code-06/07 (bytes + rider) ; duplication FOL ; bundle-build carry-over | owner |
| /lab/crop retirement + orphan specimens | media-viewer-08 = dead-code-06 (3 files) ; fresh-code owner ; lab lens | owner + lab |
| Legacy `area`/`freeTags` (audit-1 §4 #16) | collection-08 (+ data-layer for 2 columns + 2 GIN) | collection |
| Spotify link pipeline | catchups-01 (+ account-export select; data-layer 3 columns) | catchups (owner) |
| Batch photo approval on the content list vs the review room | admin-analytics-01 (+ collection: approvePhoto/approvePhotos become dead) | admin (owner) |
| Analytics count fan-outs → FILTER aggregates | admin-analytics-03 + 09 + 14 | admin |
| touchLastSeen behind `after()` | admin-analytics-07 | layout (lib-core) |
| Bell prune → retention cron ; `revalidatePath("/")` on mark-read ; five `/feed` revalidates | feed-posts-16, 10, 02 | feed-posts |
| Letterhead's edit-only trunk ; d3 map on demand ; profession hints in the client | directory-profile-01, 02, 04 | directory-profile |
| Catch-up home: Keeper dialogs + (i) tooltip ; cadence/prompt-library drills | catchups-03, 02 | catchups |

## Owner decisions gathered so far (plain-language versions live in each report)
1. Lab in the production build: keep deployed (take the CSS via ORCH-01) or build it out for ~12 s/build (ORCH-02).
2. Landing showcase family: ship / retire (audit-1 #1; ~2,500 lines + 283 KB dormant; policy links still homeless).
3. Feed sort/time filters: cut (recommended) or surface with a design decision.
4. Polls: keep (recommended); SELECT written.
5. Batch photo approval on /admin/content vs the review room: remove (recommended).
6. Spotify link pipeline: remove (recommended); SELECT written.
7. Collection fallback encode (1600/q80 vs full-res/q100): match the direct path (recommended); proxied fallback stays.
8. /lab/crop room + 1.58 MB specimens: look once, retire (recommended); 3 orphans go regardless.
9. /lab/collection/swap and /lab/focus: archive in the registry (recommended).
10. The (i)-tooltip canon (audit-1 #15) now with a ~100-135 KB price on auth pages: keep the signup one.
11. The login bird (~85 KB): keep (priced, no cut proposed).
12. The Catch-up home's (i) tooltip (17 KB): native title (recommended).
13. Photo-size parity on the answer page: match the feed (recommended; member-visible).
14. Phosphor icons repackaged by weight (~5 KB gz on heavy routes): do with screenshots, or decline.
15. About page still "indefinitely procrastinated" (audit-1 #3).
16. PWA tile admin-only "for now" since 08-22: open it (recommended).
17. Letter reading page lacks Report/Edit/Delete: product call.
18. The person-row sweep (docs/spec/person-row-audit.md steps 3-4): green-light (recommended).
19. Letterhead concept "keep in step" header + lab variant snapshot note (audit-1 carry).
20. Three off-ladder heading sizes (27/26/24 px): bless one.
21. Lab importing SPRINGS from motion.tsx (re-export only).
22. "group" wording in four Catch-up refusals; the plural ternary (leave).
23. LocationPicker single mode (lab-only demo): drop or keep.
24. Two legacy city columns: after launch, SELECT first.
25. merge-cities / city-alias-scan scripts: keep (mop vs rule).
26. Album importer's fate; one-off scripts (sweep, backfill) after their live checks; drive.mjs scenarios.
27. `Image.greyscale` computed-never-read: stop + drop (recommended); `Photo.approvedAt/By` write-only: keep + comment.
28. Upstash keys in production: confirm set (security weight).
29. /guide index reachable only from its child: link it from the account menu (recommended).
30. Privacy policy "Last updated" date (legal doc; trivial edit).
31. Feed loading skeleton draws a composer tile that no longer exists (member-visible for 300 ms).
32. Compare tab in analytics (audit-1 carry, keep); admin.md spec drift ×3; costs card constants ×3 (know where to edit).
33. actions.ts (catch-ups) split: record "no"; `draft` status and `Catchup.title` (carried, unchanged).
34. Public pages prerendering (theme cookie in the root layout makes every route dynamic): owner/bundle.
Leads OUTSIDE simplification (for the bugs list / security): collection-02 quota follows the wrong half; intake
quota counts without `scope`; upload timeout missing on two surfaces; avatar HEIC blank-MIME gap; import-album
has no demo-destination guard; 20 admin verbs write no audit log (3 destructive); account export omits
`birdOverride`/`showEmail`/professionTags; media-viewer-18 aim dialog opens at 50 %; Facebook filed as
`kind:"website"`; photo-step copy points at a 404; `User.bio` dead-or-alive; snapshot sparklines count drafts.

### lib-tests (57 KB, 14 findings, 3 owner decisions, ~18 not-findings; 114 files / 15,127 test lines read) — read in full
Spot check at HEAD: **01 confirmed** — 9 test files shell out to `git grep`/`git ls-files` (17 mentions), the
fail-open shape gate-coverage's own C-189 header documents; the walk-based fix is one kit helper. Headline
verdict, valuable as a not-finding: **zero accidentally vacuous tests** (two declared, one guardless sweep in
keyset = 13, one dead guard in purge-rule), **zero scratch files** (two scratch-shaped tests = 09), every file born
since audit 1 carries a dated reason — the survival rule held without the gate audit 1 planned (owner decision:
close that item). Structural: 01 (10 spawns + a fail-open class in two security sweeps), 02 (security-regressions'
C2 sweep is a weaker copy of gate-coverage's detector — one `serverActionFiles` in the kit), 04 (49 hand-rolled
function slicers in 25 files vs 4 uses of `balancedBody`; two files justify hand-rolling with a limitation the kit
removed; the tail hazard is C-188's shape). Cheap but measurable: 03 (60 redundant reads; catchup-lifecycle reads
the 2,054-line actions file 11×), 05 + 12 (~2.4 s of the suite's 8.3 s CPU: avatar's 200k-iteration loop, a
decomment-everything sweep; the 108 MP sharp test is kept on purpose), 06/07 (kit adoption residue incl. three
post-kit files), 08 (seven pins that repeat/disagree/describe a day that came), 10 (suite floor 60 vs 102 files —
raise to 90), 11 (CLAUDE.md says 75 files), 14 (= duplication-18, e2e helpers). Owner: auth-first-frame's 20
styling pins exist because the landing hand-copies the login column (a shared fragment deletes both); the
pinch-zoom tuning-literal pin. Cross-lens: auth.ts session select could be a `satisfies` type instead of a text pin.

### data-layer (76 KB, 17 findings, 6 owner decisions, ~20 not-findings; 523 call sites censused) — read in full
Spot checks at HEAD: **01 confirmed** — `groupId: null` forced at 8 sites; schema still carries `Post.groupId`
(:600), the relation (:608) and `@@index([groupId, createdAt])` (:616); the feed action's comment says zero rows
carry one. **03 confirmed** — `ContentView.firstAt` has 0 readers; `MetricSnapshot.capturedAt` is written only by
snapshot.mjs:326. **02 confirmed** — `Image.greyscale` written at image.ts:314, "deliberately not selected" at
image-record.ts:84, on the FEED's table while the Collection's rows are `Photo` (= collection's owner decision 4,
now with the wrong-table diagnosis). The floor answers are the report's spine: **every authenticated page pays 7
queries before its own** (07: the no-op `lastSeenAt` UPDATE 14 minutes in 15; two Catch-up advance joins that can
be one), the queries-per-render table (admin content view 39, Catch-up home 22, feed 14+3), one N+1 (06, bounded
to six → one DISTINCT ON), four double-fetch routes (08 = collection-04 / fc-23 / dp-13 / ms-16, one `cache()`
idiom), the feed page re-running two layout reads (09), admin-people-query re-implementing keyset with the
recovery block keyset.ts made unnecessary (10), six hand-typed avatar selects (11 = duplication-06 / dp-27 /
fp-17.13), FILTER folds (12 = admin-analytics-03 + 09, plus the profile's two kind counts). Schema: 01 Groups
residue (3 columns + index + relation; owner), 03 four write-only telemetry columns + an index, 04 eight indexes
no query shape uses (one certain: a strict prefix the river migration's own comment records), 05 **eleven live
objects Prisma cannot see where TRAPS says two** (+ `User_lastSeenAt_idx` missing from the schema — a `migrate
diff` would offer to drop it), 13 the demo seed writes the retired bucket vocabulary nightly, 14/16 stale
comments, 15 QA-probe residue (SELECT D) and a schema comment enshrining a probe as a provenance value, 17 the
relation-load strategy nobody has measured. Six migration reversal pairs listed for the record only. Every DB
claim carries its SELECT (section "The SELECTs", A–F). Cross-lens: `phase4-probe.mjs:75` still `DELETE FROM
"Session"` (dropped 08-27) → scripts; `Photo.subject` comma-joined `contains` vs a `text[]`+GIN like
professionTags → collection (a rework, not a cut).

## Merge groups, additions from lib-tests and data-layer
| Programme | Ids |
|---|---|
| generateMetadata + page double fetch → `cache()` | data-layer-08 = collection-04 = fresh-code-23 = directory-profile-13 = member-surfaces-16 |
| Hand-typed avatar selects | data-layer-11 = duplication-06 = directory-profile-27 = feed-posts-17.13 |
| Admin count fan-outs → FILTER | data-layer-12 = admin-analytics-03 + 09 (+ profile kind counts) |
| Image.greyscale | data-layer-02 = collection owner decision 4 |
| Legacy bucket vocabulary in the demo seed / LEGACY_BUCKETS | data-layer-13 → collection-08's neighbour |
| e2e Collection helpers | lib-tests-14 = duplication-18 = collection-16 (e2e bullet) |
| Layout query floor (lastSeenAt no-op UPDATE; two advance joins → one) | data-layer-07 ; admin-analytics-07 (after()) ; catchups FOL (advanceDueCatchups) |
| Feed page re-runs layout reads | data-layer-09 ; feed-posts not-finding (the bell count ×3, argued) — the two disagree on the unread count: verify pass decides |
| Groups schema residue | data-layer-01 (new; audit-1 stopped at GroupInvite) ; feed-posts not-finding keeps the code residue — reconcile: code stays until the column goes |
| Test-kit adoption (git → walk, serverActionFiles, section(), read cache) | lib-tests-01/02/03/04/06/07 |

## Salvaged from the two agents that died mid-write on the Fable limit (2026-09-04 ~12:50)
Both wrote the brief's required early partial before dying; the numbers below are theirs, verified locally by
them but NOT yet spot-checked by the orchestrator. The relaunched agents must re-derive rather than trust these.

**shell-primitives (partial)**: the sidebar's idle-rest hoopoe statically imports the 1,512-line rig, so a 28 KB
chunk rides the first load of all 40 authenticated routes for a bird that mounts only after 90-120 s idle (or
Ctrl+Shift+H) — a `next/dynamic` swap of the kind `mascot-flight-layer.tsx` and `not-found.tsx` already use. The
notification badge is counted by the (main) layout, again by the feed page, and again by the bell's mount effect
(the CSS-hidden mobile bell still runs it on desktop): 1-2 redundant queries per load [= data-layer-09,
feed-posts not-finding — three lenses now disagree; the verify pass settles it]. `not-found.tsx`'s flight
director (~6 KB) is in every route's first load including /privacy. The admin nav table + 11 lucide icons ship
in every member's sidebar chunk. globals.css: `.valley-tree--fade` dead since 2026-06-29; the `.hoopoe .wing`
rules serve only /lab/v2 [= dead-code-04 = bundle-build-10]; `--primary-foreground` unused [= dead-code-04];
four `.dark` lines restate their `:root` value; ~9 stale comments. Kit: `ui/separator` has one caller inside a
DropdownMenu that has its own; `ui/card` is imported only by a lab room; three Button rows have no caller
[= dead-code-08 found three cva entries — reconcile].

**dependency-diet (partial)**: lockfile 1,082 package keys (970 top-level + 112 nested), 572 dev-only, 202
optional, 38 peer. Exclusive disk per direct dependency (MB / packages that leave with it): next 262/13,
prisma 210/107, @sentry/nextjs 96/99, @prisma/client 71/2, shadcn 59/236 (dev), posthog-js 50/12,
lucide-react 35/1, @phosphor-icons/react 32/1, eslint-config-next 27/176 (dev), puppeteer 23/18 (dev),
typescript 22/1, @playwright/test 18/3, @tailwindcss/postcss 12/30, motion 8/4, world-atlas 8/1, eslint 7/46,
react-dom 7/2, @base-ui/react 7/10, @aws-sdk/client-s3 5/28, next-auth 4/6, cuid2 1/4. The 14 chunks on every
non-lab route = 636 KB raw: react-dom 229, Next runtime 129+31+27+13+15+11, motion core 50 (17 gz),
sonner+next-themes+m 37 (10 gz), tailwind-merge+clsx 29 (9 gz), button/base-ui/cva 23+15, hoopoe loader 6
[cross-checks bundle-build-08's 621 KB floor — reconcile]. posthog-js 250 KB raw / 81 gz, 0 routes first-load;
domMax 72/17 async [= bundle-build-01]. Map stack 68 KB / 23 gz on /directory only [= directory-profile-02];
the lab map chunk is 203 KB with the atlas compiled in [lab]. Overrides: `deepmerge-ts` and `mysql2` are exact
upstream pins (live); `browserslist`, `postcss-selector-parser`, `fast-uri` are floor pins whose parents'
ranges already admit the fix — candidates to drop. **npm-audit-gate's ALLOWLIST entry GHSA-ggr8-5vv4-36mx is
dead since b4411f1 (the override superseded it), and `phase9-probe.mjs:39` asserts it is still named** — a
two-file fix, and a live example of a probe pinning a stale allowlist.

### lab (70 KB, 12 findings, 5 owner decisions, ~10 not-findings; 48 rooms classified, 21 files read fully) — read in full
Spot checks at HEAD, all confirmed: **06** — `_parts.tsx`'s only importers are `hoopoe-marks/page.tsx`
(Body, Crest, Face, G) and `glass-edges/page.tsx` (Crest, Face); `Feather`/`Eye`/`Bill` are imported by nobody
(the `ICONS.Feather` hits are lucide, a different symbol). **09** — the registry says "76 findings" and
`_findings.ts` has 68; `spine-marker/page.tsx:6` names `_kit.tsx`'s `ROOMS` registry, a symbol audit 1's own fix
deleted, so the comment now points at nothing anywhere in the repo; the hoopoe-marks note describes ten marks
including a roundel and a monogram the room does not have (7-8 keys). **04** — 72 woff2 in the full build's
`static/media`, 9 without the lab. **02 — the CSS numbers match my own builds to the byte** (238,434 → 164,037
raw), reached by a second method (class-token attribution: 895 rules / 50,961 B lab-only, of which 393 arbitrary
values), which is why the attribution undershoots the build delta and the build delta is the number to quote.

**Three measurements now agree on ORCH-01**: mine (build diff), bundle-build-02 (rule attribution) and lab-02
(both). The lab's share of the stylesheet every visitor downloads is **74,397 B raw / 8,985 B gzip** (I re-measured both builds at close-out; the lens's 8,747 B undercounted the gzip half), it is
render-blocking, and it is on the signed-out landing page. lab-02 supplies the fullest mechanism: `@source not
"./lab"` in globals.css + a `lab.css` mounted from the lab layout (Tailwind is 4.2.2, so `@source not` exists).

**lab-01 supersedes and corrects ORCH-02.** Measured on the same two builds: compile 20.3→13.7 s, TypeScript
14.6→9.1 s, 105→62 static pages, **~12 s of a 42 s build**, and **~9.7 MB of deployed artifact**
(server/app −4.5, static/chunks −2.5, static/media −2.75). TypeScript program −113 files, −44,363 lines,
−21.7 % types, −45 % check time. Member JS: **zero** either way, re-proved by diffing all 52 shared routes
between the two builds (deltas −36 to −620 B = module renumbering, non-directional). The mechanism for a
demo-only exclusion is spelled out (`page.lab.tsx` renames + `pageExtensions`, and `lab-audit.mjs:47` must learn
the new name in the same commit or `npm run check` fails).

**The correction that matters most — lab-10.** A main-build exclusion is NOT safe: `/lab/collection` is the
**test fixture for the Collection rework** (the real `/collection` holds two photographs that both say "asdf"),
driven by two committed Playwright suites; plus `dev:centroid`, two apple-edge scripts, `verify:crawl`,
`phase6-probe` and `audit-status`'s M19 probe all drive lab routes. The demo-only exclusion is safe against all
of it. Any plan row for ORCH-02 must carry this list.

**New and strong**: lab-04 (63 Google font files / 2.75 MB built and deployed for two ARCHIVED rooms, and a
build-time fetch from Google on every cold build — 0 member bytes, verified against the client-reference
manifests), lab-03 (three concept harnesses import every variant eagerly; `/lab/profiles` at 1,363 KB is the
heaviest route in the app, ahead of `/profile/[id]`; zero `next/dynamic` in the whole lab), lab-05 (48 knip
exports classified: 41 de-export, 4 dead, 3 keep-as-documentation — with the durable fix being one line in
lab-voice.md's checklist, not a third sweep), lab-07 (`showcase-shot.tsx` + `shots.ts` are alive ONLY because a
lab room imports them, which is why knip does not list them with the other five showcase files — the landing
lens needs this), lab-08 (`/lab/crop` calls itself throwaway in three places while `/lab/collection` and two
Playwright suites now depend on its fixtures; 3 orphan webp confirmed = media-viewer-08 = dead-code-06).
Not-findings worth keeping: two kits are deliberate (the second-look kit must use the genuine shipped tokens or
the comparison is a lie); the `.delight` CSS-in-a-string is why eleven rooms cost the shared sheet nothing;
`LabRoomState` earns its table; the lab's `motion.*` is pinned on purpose. lab-12 re-counts the 29 lab↔shipped
clones as design history (the 63-line `chain-lines` ↔ `houses-chain` pair IS the experiment's control).

## Merge groups, additions from lab
| Programme | Ids |
|---|---|
| Lab CSS out of the shared sheet | ORCH-01 = bundle-build-02 = **lab-02** (three agreeing measurements; lab-02 has the mechanism) |
| Lab out of the production build (owner) | ORCH-02 = bundle-build-07 = **lab-01** (measured) **+ lab-10 (the five drivers that constrain it — demo-only is the safe form)** |
| /lab/crop fixtures + 3 orphan webp | lab-08 = media-viewer-08 = dead-code-06 (the fixture move is new and unblocks the room's retirement) |
| Landing showcase family | lab-07 (the lab is why two of the files look alive) + dead-code-06/07 + duplication FOL |
| Lab-only knip exports | lab-05 (48, classified) ⊃ dead-code-05's lab table (48, listed) |
| Google fonts in the build | lab-04 (new; bundle-build's fonts not-finding said "ships to nobody but the admin", lab-04 adds the 2.75 MB artifact + build-time fetch) |

**lab, addendum (the agent overwrote its report at 82 KB with the charter's required room table).** All 48 rooms
classified in five families with status, lines, what each prototyped, where its verdict shipped, last commit,
what it reaches into, and whether it touches data at request time. The load-bearing answers: **20 routes have not
changed since the `/preview`→`/lab` migration on 2026-07-30** and 15 more predate 9 August, so only **12 rooms
are live work** (collection, collection/swap, viewer, profiles, focus, crop, glass-edges, hoopoe-marks,
icon-colours, icon-directions, chain-lines, support-ideas) — plus **four that are permanently live regardless of
commit date because something outside the lab drives them** (centroid, glass-edges, houses/demo,
location-picker). Rooms whose verdict never shipped: loading-ideas, type, hoopoe-marks, grove, and the Aviary
half of support-ideas. `/lab/profiles` is 10,481 lines, by far the largest room. Three rooms do work at request
time: `/lab` itself (one Prisma query, `force-dynamic`), `/lab/location-picker` (**live GeoNames API calls**),
and `/lab/birds-bg` + `/lab/centroid` (a `readFileSync` per request, deliberate). The 13 shared root files are
3,556 of the 44,251 lines. This table is a deliverable for the owner in its own right — it is the first time his
48 rooms have been listed with "did this ship, and when did it last move".

**lab-13 (added in the agent's third write, 89 KB) — VERIFIED, and it is a dependency win the dependency lens
would not have found.** `world-atlas` is a **production** dependency (package.json:64, 7.9 MB of node_modules,
installed on every Vercel build) whose only importer in the entire repo is `src/app/lab/directory/_maps.tsx:28`.
The other two hits are comments. The shipped map was fixed by audit 1 (`b899d1a`) to fetch the same atlas from
`public/geo/countries-110m.json` (107,761 B, immutable-cached), and `alumni-map.tsx:85` states the reason
verbatim: the import compiled 105 KB of JSON into a module in the first load of the heaviest route. **The lab
room that prototyped that map kept the antipattern the shipped file documents as wrong** — an oversight in
b899d1a, not a decision. Fix: make `_maps.tsx` fetch it the way `alumni-map.tsx` does (a worked example 20 lines
long, and the room's whole purpose is comparing against the shipped map, so it should load its land the same
way), then delete the dependency. Saving: −1 production dependency, −7.9 MB node_modules, −105 KB off
`/lab/directory`'s first load, −2 of the lab's 4 `any` sites. Note for the fix session: knip does **not**
currently flag `world-atlas` precisely because the lab import keeps it honest, so after the fix either the
package.json line is gone or knip starts reporting it — both are correct signals. The general lesson the agent
draws is worth a line in lab-voice.md: **when a shipped file is fixed, the lab room that prototyped it is the
second place the fix has to land, or the room quietly becomes a museum of the bug.**

## ⚠ ORCH-04 — A LIVE BUG, NOT A SIMPLIFICATION: the nightly job prunes notifications 335 days early, against the published privacy policy
Found by scripts-e2e-ci-02, **verified by the orchestrator at HEAD, four files read in full**:
- `.github/workflows/snapshot.yml:92` — `run: node scripts/ops/prune.mjs --days 30` (nightly).
- `scripts/ops/prune.mjs:33` — `const DEFAULT_DAYS = 365;` and its header (lines 11-16), written by the
  **bug-audit M55 fix**, says in its own words: *"ONE policy, not two. The default used to be 30 days while
  src/lib/retention.ts deleted the same table at KEEP_DAYS.notifications — a year — so the app documented one
  rule and this script quietly enforced a stricter one (bug audit M55). retention.ts is the source of truth;
  this matches it."* Line 21 even documents the intended call as `[--days 365]`, and line 22 names snapshot.yml
  as the caller.
- `src/lib/retention.ts:42` — `notifications: 365`.
- **`src/app/(policies)/privacy/page.tsx:150` — the published retention table tells members `["Notifications",
  "1 year"]`.**

So the M55 fix changed the script's default and **never touched the caller**, and the explicit `--days 30`
overrides it every night. The stray comment at `prune.mjs:60-61` ("the owner asked for a flat 30 days") is a
leftover from *before* M55 and contradicts the header the fix wrote above it — it is stale, not a counter-argument
(the same stale-comment class this audit found in eleven territories).

**Effect**: every night, notifications between 30 and 365 days old are deleted, while the app's public legal
document says they are kept a year. Not catastrophic (notifications are derived data — likes, comments,
mentions) but it is member-visible loss and a policy-vs-practice divergence on a published page.
**Fix**: delete ` --days 30` from `snapshot.yml:92` (the script's default is already correct), and delete the
stale comment at `prune.mjs:60-61`. One word and two lines. **Gate**: `--dry` run first to see the row count the
next real run would delete; `ci-parity.test.mjs` does not read snapshot.yml, so nothing pins the flag.
**This is audit-only: I have not changed it.** It goes at the top of the report's "outside simplification" list
and into `docs/planning/bugs.md`.

### scripts-e2e-ci (94 KB, 21 findings, 6 owner decisions; 82 files, 47 read fully) — read in full
The largest report and the one with the most *live defects* rather than bloat. Spot checks at HEAD, **all five
confirmed**: **01** — zero `data-tour` anywhere in `src/`, while `tour-mobile-verify.mjs:107,168` still looks for
`[aria-label="Product tour"]` and a "hoopoe tour" button (removed by `ae5bc9a` on 2026-08-27); its 26-line test
runs in `npm run check` every day, **a security pin on a corpse**. **03** — `screenshot.mjs:50` has
`{390×844, deviceScaleFactor: 2, isMobile: true, hasTouch: true}`; `screenshot-auth.mjs:44` has a bare
`{width: 390, height: 844}`, so `(hover:hover)` matches and `(pointer:coarse)` does not. **08** — the HTML
reporter is registered only under `process.env.CI` and `e2e/.report` does not exist on this machine. **12** —
the five imported agents' descriptions total ~8.4 KB against ~0.9 KB for the three the project uses. **13** —
`crawl.mjs` has zero mentions of `/guide`.

**ORCH-04 (the retention bug) is this report's finding 02**, already verified and escalated above.

The three that matter beyond bloat, because they break the QA loop the owner's design process runs on:
- **03**: every mobile screenshot of an *authed* page — which is every interesting surface, since they are behind
  login — has been photographed with desktop hover/pointer semantics. Concretely the Collection carousel arrows
  appear in "mobile" shots a phone never draws, and the comment overflow menu is hidden in shots where a phone
  always shows it. The public `screenshot.mjs` was fixed and says the flag "was documented in the CLAUDE.md table
  but only ever implemented in the auth variant"; the authed one never was. The agent's caution is worth carrying:
  in Tailwind v4 **every** `hover:` class is wrapped in `@media (hover:hover)`, so this may mislead far beyond the
  three call sites it names.
- **08**: `npm run visual:report` cannot work locally, so OPERATIONS.md's "**one rule**" — never rebaseline
  without opening the diff — has had no working tool behind it. The diff PNGs *are* written to `e2e/.output/`;
  only the viewer is missing. One-line config fix. The agent calls it "the highest-leverage zero-line finding in
  my territory" and I agree: the entire 13 MB baseline apparatus rests on somebody looking at the diff.
- **01 + 07**: 338 lines of scripts guard features deleted on 2026-08-27 and now report success while doing
  nothing (`_dir-chrome-probe.mjs` prints "toolbar not found" twelve times and exits 0) — the failure mode this
  repo hates most. `/lab/directory` still cites that probe in the room's own UI as the source of its numbers.

Structural: 05 (`drive.mjs` is a 90-line harness plus ten dated one-off investigations, ~500 lines, one of which
cannot run at all because it needs a gitignored fixture — the charter's "which probes should have died" question,
answered), 06 (`phase9-probe` asserts a `check.yml` that ci-parity deliberately emptied on 2026-09-02; two checks
fail today), 04 + 15 (three screenshot scripts with four different answers to "which Chrome" — 15 hardcoded paths,
one policy resolving to `undefined` — and `_probe-kit.mjs` already solved it for the phase probes), 09 (=
lib-tests-02/04: the brace-matcher written twice, and **the `audit-status.mjs` copy decides the security board**;
the gate for changing it is a byte-identical `--json` diff before and after), 14 (`e2e/auth.setup.ts` is the tenth
copy of the dev-login block `_dev-login.mjs` was built to delete — and its `devLoginContext` export is currently
dead), 16 (`_env.mjs` hand-rolls dotenv, which is already a dependency), 18 (`npm run lint` lints a different
scope from the gate that decides), 20 (**baselines: 157 blobs / 101.2 MB across 39 commits, up from 81 / 62.9 MB
ten days ago — ~3.8 MB of permanent git history a day**; five desktop `fullPage` shots are 55 % of it; a
threshold, not an action, with the "do not touch" list spelled out).
Documentation drift, all verified: 10 (nine of the ledger's lines are false, incl. `local-base-url.mjs`
described as "finds which port the dev server is on" when it is the loopback/same-origin guard that stops the
owner's admin cookie leaving the machine), 11 (OPERATIONS + CLAUDE describe an 11-route suite that is 12, "four
live routes" that are six, four masks that are five, and disagree with each other on runtime — audit 1 fixed
10→11 and it rotted again in ten days), 19 (OPERATIONS says "**One** overrides entry"; there are five, four
added since, only one with a stated exit condition), 21.
Security-adjacent for the report's outside-scope list: **17** — `snapshot.yml:76-81` interpolates
`${{ inputs.day }}` straight into a shell command with `SUPABASE_DIRECT_URL` and two API keys in scope; severity
genuinely low (`workflow_dispatch` is owner-only) but it is the only such instance and the fix is three lines.
Owner decisions: keep `prune.mjs` as a safety valve after the bug is fixed; `drive.mjs`'s nine closed
investigations; **retire phase9 but KEEP phase6** (the agent argues against audit 1 here, and well: phase6 is the
only thing that proves a real credentials sign-in survives a next-auth bump, and Renovate holds those for 7 days
precisely because auth breaking is the worst failure this site has — it is also the only probe that needs no
browser); has `sweep-stranded-originals` been run its second time; the five imported agents (~2.1k tokens in
every session, forever); repair vs retire `_dir-chrome-probe`.

## Merge groups, additions from scripts-e2e-ci
| Programme | Ids |
|---|---|
| ⚠ Notification retention bug | **ORCH-04 = scripts-e2e-ci-02** (verified; top of the outside-scope list) |
| Dead tour tooling | scripts-e2e-ci-01 + 07 (338 lines; both caused by `ae5bc9a`) |
| Screenshot family: one kit, one "mobile", one Chrome | scripts-e2e-ci-03 + 04 + 15 = duplication-04 (P-S3/S8) |
| Brace-matcher written twice | scripts-e2e-ci-09 = lib-tests-02/04 = duplication-05 (audit-1 dup-03 residue) |
| dev-login hand-rolled | scripts-e2e-ci-14 = duplication-04 (P-S6 neighbour) |
| Probe rot (phase9) + probe retirement | scripts-e2e-ci-06 = audit-1 owner decision 9 (recommendation now differs: keep phase6) |
| `_env.mjs` over dotenv | scripts-e2e-ci-16 ; the demo-ref guard half is duplication-01 = fresh-code-05 = directory-profile-19 |
| Ledger + OPERATIONS + CLAUDE drift | scripts-e2e-ci-10 + 11 + 19 → the docs lens's pass |
| Visual suite tooling | scripts-e2e-ci-08 (report viewer) + 20 (baseline growth) |
| Imported .claude agents | scripts-e2e-ci-12 = audit-1 owner decision 8 (now priced in tokens) |

### shell-primitives (70 KB, 16 findings; 74 files read) — read in full
Spot checks at HEAD, all confirmed: **01** — `page-header.tsx:2` statically imports `SearchPill` and exactly one
of its 31 call sites passes `showSearch` (`feed/page.tsx:76`). **02** — `sidebar.tsx:652` mounts `SidebarHoopoe`,
which statically imports the puppet, for a bird gated behind `IDLE_MIN_MS = 90_000`. **04** — `ui/card.tsx`'s only
importer in the entire repo is `lab/location-picker/page.tsx`.
Its headline is the same shape twice, and both are measured off the committed build rather than estimated:
**a server component that imports a client component puts that module in the route's bundle whether the branch
renders or not.** (1) 22 routes carry an 8.5 KB chunk holding only `search-pill.tsx` and two Phosphor glyphs
(six weights each) for a control they never draw — ~187 KB across the app. (2) The 28 KB hoopoe puppet is in the
first load of **46 of 52 non-lab routes** for a bird that cannot appear for 90-120 seconds and never mounts on a
phone; `not-found.tsx` already ships the exact deferral pattern two directories away, including the gotcha
(`next/dynamic` does not forward refs, so fill the controller from `onReady` or the bird is silently inert).
**The agent also caught a comment that would stop the fixer**: `not-found.tsx:20-22` says "Do NOT copy this to
login, signup, the landing or the sidebar — all four show the bird at first paint by design" — **wrong about the
sidebar**, and it must be corrected in the same commit. (3) `shell-primitives-03` = data-layer-09 = the
partial's note: **three identical `notification.count` queries per /feed load** (layout, page, and the bell's
mount effect), two on every other authenticated page — and it resolves the three-lens disagreement I flagged
earlier by splitting it into two independently safe halves: `cache()` the count for layout+page, and drop the
bell's *mount* call while keeping its `focus` listener (whose docblock argues only for the listener).
Structural: 04 (`ui/card` maintained for one lab room while 70 non-lab files hand-write its class string — audit
1's sub-primitive sweep could not see it because the lab keeps it alive; **owner**), 05 (13 pure pass-through
`ui/` wrappers), 07 (`not-found.tsx`'s 413 lines of flight machinery ride all 52 routes' first load), 08
(`ui/combobox.tsx`, 167 lines and ten exports for one caller), 09 (`VerifiedMark` is a third tooltip system,
hand-rolled, with state per row — cf. auth-edge-01's tooltip canon and catchups-03's 17 KB Tooltip chunk: **the
report should present all three together as one owner decision**), 10 (the z-index tokens are a migration that
stopped: three tokens, four call sites, `z-50` everywhere else), 16 (`search-pill.tsx` adds a resize listener on
every mount for three surfaces). Cheap: 06 (three dead Button variants = dead-code-08), 11, 12 (audit-1 hygiene
rows that never landed + four new), 13 (`not-found.tsx` gates a flight on the OS reduced-motion setting, which
DESIGN-SYSTEM §7 forbids — same violation member-surfaces found in `showcase-shot.tsx`), 14, 15.
**A significant not-finding**: the agent re-grepped every token in `globals.css` by hand and found **no dead
tokens left** — audit 1's cuts all landed, so `dead-code-04`'s two token pairs are the whole remainder. It also
confirms the `m`-namespace rule holds: zero non-lab files import the full `motion` namespace.

## Merge groups, additions from shell-primitives
| Programme | Ids |
|---|---|
| Server component importing a client component it may not render | shell-primitives-01 (SearchPill, 22 routes) + 02 (hoopoe, ~30 routes) + 07 (not-found flight) ; same root cause, one phase |
| Unread count queried 2-3× per load | shell-primitives-03 = data-layer-09 (resolves the feed-posts not-finding: the *mount* call goes, the *focus* listener stays) |
| Three tooltip systems | auth-edge-01 (FloatField→Popover, ~100-135 KB) + catchups-03 (17 KB chunk for one (i)) + shell-primitives-09 (VerifiedMark, hand-rolled) → **one owner decision, not three** |
| `ui/` kit kept alive by the lab | shell-primitives-04 (`ui/card`) + lab-05 ; cf. dead-code's "keep the shadcn kit" class decision |
| reduced-motion violations | shell-primitives-13 (`not-found.tsx`) + member-surfaces FOL (`showcase-shot.tsx`) |

### lib-core-config (90 KB, 17 findings) — read in full
**Its finding 01 is ORCH-04, found independently — the third lens to reach it**, and it adds two facts the
others did not: `docs/SECURITY.md`'s retention table also states the untrue number, and because the workflow
prunes at 30 days three hours after the sweep already ran at 365, **one step of the nightly sweep permanently
deletes zero rows**. Three documents say one year; the machine does thirty days.
The agent's own headline is a not-finding and I am keeping it: *"the structural well for comment trimming here
is genuinely dry"* — in `email-queue.ts` (508 code / 471 comment) it found **exactly one** comment describing
code that no longer exists, and one block duplicated out of OPERATIONS.md. That is the strongest defence of the
comment-mass rule any lens has produced. Structural: 02 (every email is written twice, HTML and plain text, from
two hand-kept copies of the same sentences — **three of the four have already drifted**, so a member can read two
different wordings of one message), 03 (the retention sweep spells out eight identical cutoff deletes a small
table collapses), 04 (**the demo photograph pipeline has never produced a single photograph** — a 201-line
script, a generated file and a seeder merge — and its documented working directory is the repo root the owner
has closed), 05 (`scripts/demo` holds three hand-written copies of the same `.env` parser, one reading `.env`
twice), 09 (the canonical origin is a string literal in seven places). Config surface, five lines of
`next.config.ts` worth changing: 06 (Sentry's wrapper silently injects `experimental.clientTraceMetadata`,
stamping two meta tags on every HTML document — ~400 bytes — to feed a **browser SDK this project deliberately
does not have**), 07 (two CSP entries contradict the comment directly above them), 08 + 15. Everything else in
that file is defended and in several cases pinned. **This territory ships zero bytes to the browser**; its
honest total is ~−140 lines, one dead sweep step, three corrected documents.

### landing-mascot-avatars (82 KB, 16 findings, 3 owner decisions) — read in full
Two measurements carry it, both off the committed build. **(1)** The 51 bird glyphs are one `ARCHES` array
literal that no bundler can tree-shake: **44,428 B raw / 12,182 gz on 39 of 52 non-lab routes** — and they are
in the *client* bundle only because two always-mounted shell components (`sidebar` → `IdentityRow` →
`BirdAvatar`, and `konami-eggs`) each need exactly **one** bird. Audit-1 owner decision 13 (the birds sprite)
now has its number. **(2)** The hoopoe rig is **28,691 B raw / 7,874 gz on 46 of 52 routes**, and audit-1's
finding 08 was executed for the 404 boundary but **not** for `sidebar-hoopoe.tsx:37` or
`logo-easter-egg-hoopoe.tsx:36` — *one static importer is enough to defeat the flight layer's lone
`next/dynamic`*. This is shell-primitives-02 from the other side; two lenses, same conclusion, same two files.
**03** prices the switched-off showcase precisely: 11 files, 2,477 lines, **of which 828 are referenced by
nothing at all** (the rest are reachable only through the switched-off entry) — the sharpest number yet on
audit-1 owner decision 1. Verified dead props: **06** — `BirdAvatar`'s `ring` is applied unconditionally in the
photo branch but only `if (clipped)` in the bird branch (`bird-avatar.tsx:104`), so it silently does nothing for
the two shipped call sites that pass it (`your-catchups-card.tsx:76,100`) — **I confirmed this line by line**;
also 04 (`point()`'s `label` is declared, documented, passed and never read) and 05 (`initialExpression`).
Structural: 07 (**four independent "one hoopoe at a time" wait loops with four different constants and no shared
owner**), 08 (`hoopoe-geometry.ts` + `edge-light.ts` = 506 lines of build-time and lab-only tooling living in
`src/lib/`), 09 (three `apple-edge` scripts hard-wired to a file inside `sanan's stuff/` — the folder the owner
has an open decision to move), 14 (the `/birds` and `/pick-bird` grids kept identical by three comments instead
of one constant), 15. Docs: 10 (`mascot.md` lists a shipped feature as an open follow-up and omits four of the
eight moments), 11, 12.

### dependency-diet (76 KB, 14 findings + a full census) — read in full
Confirms audit 1's three biggest levers actually landed: **posthog-js is in the first-load set of zero of the
100 built routes**, LazyMotion shipped (181 `m.` call sites, 0 stray `motion.` outside lab), the six dead deps
and the puppeteer download are done. What is left is smaller but real, and the headline is one I verified:
**`shadcn`**. Audit 1 recorded it as "a CLI with zero imports"; that is not quite true — `globals.css:2` does
`@import "shadcn/tailwind.css"` and the import is load-bearing (base-ui's Separator needs its
`data-horizontal`/`data-vertical` variants). But that file is **95 lines, of which ~40 are used**, and inlining
them lets the package leave with **234 packages — 21.6 % of the entire 1,082-entry lockfile — and 92.3 MB of
node_modules**, including `@ts-morph/common` 12.3 MB, `@modelcontextprotocol/sdk` 8.2 MB, `msw` 6.4 MB and
`web-streams-polyfill` 8.7 MB, none of which this project has any business installing. It also kills one of the
five overrides. I verified the premise: zero JS/TS imports of `shadcn`, one CSS import, 95-line file.
**02 = lab-13** (world-atlas, cross-confirmed from the other side). **03** = the salvaged partial's find (the
`npm-audit-gate` ALLOWLIST entry is dead because the override already closed it, and
`check-baseline.txt` proves it by printing "clean" with no ", 1 allowlisted"). **05** classifies the five
overrides honestly (two force something, three only raise a floor, one is about to be parentless).
**The two refusals are as valuable as the findings, and both close questions audit 1 left open**: the
**AWS SDK swap is not worth it** — traced through `/api/upload`'s real serverless output, `@aws-sdk` + `@smithy`
are **1.31 MB of a 35.9 MB function**, beside `@img/sharp-libvips` at 16.95 MB, and two scripts use
`ListObjectsV2Command` which a hand-signer would not cover; **bcryptjs is not replaceable at all** — 140 KB with
zero transitive dependencies, and *the scrypt migration can never finish, because a dormant member's bcrypt hash
can only be re-hashed on a successful sign-in that may never come*. Also: 12 (two full browser-automation stacks
installed — puppeteer 34.3 MB and Playwright 31.2 MB), 13 (`@phosphor-icons/react` is 56.7 MB for 17 icons),
10 (`optimizePackageImports`' unconfirmed bet on Phosphor is now **confirmed**, closing OPERATIONS §5's
admission that it "has never been confirmed by anything but reasoning"), 11 (knip reports `@prisma/client`
unused only because its own config hides the generated client — = my ORCH note and dead-code-10).

## Merge groups, additions from the last three
| Programme | Ids |
|---|---|
| ⚠ Notification retention | ORCH-04 = scripts-e2e-ci-02 = **lib-core-config-01** (three lenses; lcc adds SECURITY.md + the dead sweep step) |
| Hoopoe rig deferral (audit-1 finding 08, half-done) | shell-primitives-02 = **landing-mascot-avatars-02** (same two files, both lenses) |
| Bird glyphs on 39 routes (audit-1 owner decision 13) | landing-mascot-avatars-01 (now measured: 44 KB raw / 12 KB gz) |
| shadcn package removal | **dependency-diet-01** (234 lockfile entries, 92.3 MB, by inlining ~40 CSS lines) |
| world-atlas | dependency-diet-02 = lab-13 |
| Dead advisory allowlist + override census | dependency-diet-03 + 04 + 05 = scripts-e2e-ci-19 (OPERATIONS §4) |
| Landing showcase family | landing-mascot-avatars-03 (11 files, 2,477 lines, **828 referenced by nothing**) + dead-code-06/07 + lab-07 |
| Build/lab-only tooling in src/lib | landing-mascot-avatars-08 (`hoopoe-geometry`, `edge-light`) — but lab-07 warns both are pinned by protocol-audit + mark-centring: **relocate carefully, do not delete** |
| Email written twice, already drifted | lib-core-config-02 (member-visible: two wordings of one message) |

## ORCH-04 — RESOLVED IN THIS SESSION (the one exception to audit-only)
Escalated to the owner by push notification on 2026-09-04. His answer, verbatim: *"about the
notification deletion, 30 days is good. you can update the privacy policy to 30 days for
notifications."* So the divergence was closed in the owner's direction rather than the finding's:
the **behaviour** was right and the three documents were wrong.

Shipped as `74cc61a` (`fix(retention): notifications are kept 30 days, everywhere`):
`KEEP_DAYS.notifications` 365 → 30 with the M55 history in its comment; `prune.mjs` `DEFAULT_DAYS`
365 → 30 and its header rewritten; **the `--days 30` flag deleted from `snapshot.yml`** so the
window exists in one place; the privacy table and `docs/SECURITY.md`'s retention table both say
30 days, with a dated footnote in SECURITY.md; OPERATIONS.md's two mentions fixed (the
`lib-core-config` verifier caught me missing them mid-commit); the privacy page's "last updated"
moved to 4 September, since a published document whose text changed must say so (`member-surfaces-09`);
and the four comments that dated themselves off the old year corrected (`post-notifications.ts`, `notification-reach.test.mjs`,
`/notice/[id]/page.tsx`, `prune.mjs`). Gate green (102/102). One consequence worth carrying into
the fix plan: **`/notice/[id]` is now provably retirable.** Its audience is Notification rows
minted before 2026-07-24, and at 30 days none has existed since 2026-08-23; the file says so.
Deleting the route (plus its `loading.tsx`, the `createdAt` override in `openAdminNoticeThread`
and four history comments) is a fix-session job, listed in the plan.

## Coverage gap: `root-assets` never landed; `docs` landed as a partial only
`root-assets` (the repo root, `public/`, images, fonts, `.claude/`, `sanan's stuff/`) was in wave 4
of run 3 and died on the model limit before writing anything. It is the one territory with no
report. Mitigation: its highest-value questions were answered by other lenses anyway — `public/`
bytes and the Google font artefact by `lab-04`, the root-folder rule breaches by `fresh-code-15`
and `directory-profile-20`, `.claude/` agent weight by `scripts-e2e-ci-12`, and node_modules /
lockfile weight by `dependency-diet`. What is genuinely unaudited: `public/` image weight outside
the lab, the icon set, and `sanan's stuff/`. Say so in the coverage map rather than implying cover.

**`docs` salvage (its early partial, 3.1 KB, written for crash safety before the agent died).**
Verified by the agent, not re-checked by me except where noted:
- `docs/` is 3,347 KB of 32,965 KB tracked = **10.2 %**; `docs/audit-fix/2026-08-25-refactor-audit-1/`
  alone is **1,985 KB (59 % of docs, 6 % of the repo)**, of which `work/` is 1,806 KB / 72 files.
  Bug audit 1 set the precedent of deleting artefacts and keeping a pointer; refactor audit 1 kept
  everything. **This audit's own folder is 3,336 KB and would double `docs/` if committed whole** —
  which is why the close-out prunes `work/raw/` (orchestrator note, acted on).
- **94 dead path mentions** across docs (script-verified); ~40 are deliberate "lives in git history"
  pointers, the rest are real.
- `progress.md` is 8,545 lines / 586 KB; **August was never archived** to `docs/history/` though
  `docs/README.md` says a closed month moves there.
- Stale spec claims, spot-checked by the agent: DESIGN-SYSTEM §7 says `LoveButton` "only works in
  the feed" (11 call sites); OPERATIONS §1 says 11 routes (12) and that `/collection` is unmasked
  (both entries are `live: "band"` since 2026-09-02) [= scripts-e2e-ci-11]; OPERATIONS §8 says the
  unit gate finds 74 files (102); SECURITY.md's gates say "all 25+ unit test files" (102);
  `spec/admin.md` still opens "Nothing here is built yet" with the whole 11-route admin shipped;
  `spec/directory.md`'s banner calls `City`/`HouseYear`/`ProfileTag` "a live, unimplemented plan"
  when the work shipped as `Place`/`UserPlace`; `spec/catchups.md` §§3.1/3.2/5/7/9 assume a
  user-facing Groups feature that was removed; `spec/letters.md` §3 + §5.2 (~230 of 430 lines) are
  superseded by `spec/catchups.md`; `spec/media.md`'s own banner marks ~150 of 337 lines dead;
  `content/DELIGHT.md` describes `/preview/delight`, a route tree that no longer exists.
- Finished business: `planning/dialog-standards-findings.md` (182 lines) has shipped in full;
  `planning/collection-rework/` (2,638 lines) shipped all six phases but holds 11 unanswered owner
  questions, so not archivable yet; `planning/collection-scrubber/` (443 lines) shipped and carries
  the same two stale operational facts.

### root-assets (77 KB, 13 findings, 5 owner decisions; the root entry by entry) — read in full, ARRIVED LATE
It landed at 15:26 on 2026-09-04, hours after the run that spawned it died. Spot checks at HEAD:
**04 CONFIRMED exactly** — `git log -1` per skill directory gives **38 dated 2026-03-30** and nothing
since, against 8 on 2026-08-21 and five later; 52 skill directories, 864 KB. **01 confirmed and now
understated** — `progress.md` is 8,567 lines / 601,629 B as I write, having grown again during the
audit. **05 needs a correction I am making myself**: the `PreToolUse` hook is described inside
`planning-with-files/SKILL.md` but is **not registered** in `.claude/settings.json` or
`settings.local.json` (I grepped both), and the pack contains only `SKILL.md` — no `scripts/`, no
hook JSON. So nothing shells out before every tool call in *this* repo. The finding survives in its
important half: the skill instructs every session that loads it to write `task_plan.md`,
`findings.md` and `progress.md` **at the project root**, which breaks CLAUDE.md's closed-root rule
and collides by name with the 600 KB session history. (This session was handed that skill and wrote
its planning files inside the audit folder instead, which is the behaviour the rule wants and the
skill does not describe.)

Its honest headline is a good one: **the root itself is clean** — all fifteen tracked files are
root-pinned and audit 1's five evictions held — and the real finding is that one root file,
`progress.md`, is now the fourth-largest thing in the repository and half the root's tracked weight,
because the archive rule that exists in writing in two places has nothing enforcing it. `docs-04`
found the same thing from the docs side. The byte census is the other service: **58 % of the tracked
repo is pictures** (`e2e/__screenshots__` 13.03 MB / 39 %, `public/` 6.49 MB / 19 %) against `src/`
at 6.83 MB, and the baselines' *history* is unbounded — 157 PNG blobs / 101 MB across 39 rebaseline
commits since 2026-08-19, 80 % of the current weight in 14 full-page shots, one of them 2.5 MB.
Also: 4 never-referenced tracked binaries in `public/` (410 KB, three superseded the day after they
were committed — the file audit 1's finding 17 missed), 7 dead `.gitignore` lines, 25 `.DS_Store`
regrown in nine days, `e2e/.shots` at 153 MB growing 68 % faster than audit 1 measured, 4 unreferenced
`.claude/agents`, and **13 — this audit's own `.scratch/` is 3.3 GB and must die at close-out**
(acted on).

### docs (88 KB, 21 findings, 5 owner decisions; 129 files) — read in full, ARRIVED LATE
Its early partial was salvaged above; the full report supersedes it and every salvaged number held.
Spot check at HEAD: **02 CONFIRMED, and it is the most valuable finding in the report** —
`docs/spec/media.md:124-126` specifies a three-variant pipeline (`thumbUrl` 480px q72, `url` 1600px
q80, `originalUrl` 3000px q82) that **has never existed**, and `:130` and `:215-217` build on it,
under a supersession banner that blesses §4.2 and §4.4 as "still true". The Collection stores full
resolution. This is the exact hallucination the owner has complained about twice — *"this is the
second time a session has hallucinated that we're compressing collection photos why??"* — and
`TRAPS.md` was written to stop it, while the file `CLAUDE.md` sends a media session to still teaches
it. **Promote this out of the docs hygiene phase: it causes bugs.**
Also strong: docs-12 reaches `/notice/[id]`'s early retirement independently (it read the tree after
`74cc61a` and says so); docs-08's 94 dead path mentions, ~54 real; docs-05, in which the index whose
own opening line is *"A map that lists folders which do not exist is worse than no map"* lists 12
spec files where disk holds 15; docs-06 and docs-07 (~315 lines of `letters.md` and the Groups-based
half of `catchups.md` specify features that were renamed or removed); docs-11 (`admin.md` opens
"Nothing here is built yet" for eleven shipped routes). Its refusals are as useful: `TRAPS.md`,
`hand-run-passes.md`, `lab-voice.md`, `demo.md`, `bugs.md`, `AI-WRITING-TELLS.md`, `leads-to-follow.md`,
`docs/history/*`, the WhatsApp curation trio and SECURITY.md's machinery section are named as
must-not-touch. The structural question it puts to the owner is the same one root-assets raises:
**closed audits are about to become ~72 % of the project's documentation by weight** unless this
audit's `work/` is pruned before it is committed (acted on) and audit 1's `work/` is archived to a
pointer the way bug audit 1's README already did.

## Adversarial verification (phase 2b), first pass — 84 verdicts, ZERO refuted
Five of 25 clusters completed before the subagent session limit stopped the run (`work/verify/`:
`lib-misc`, `media`, `shell-a`, `tooling-a`, `tooling-b`). **38 confirmed · 45
confirmed-with-correction · 1 unverifiable-needs-db · 0 refuted.** No finding in the verified fifth
was wrong; slightly more than half carried a wrong detail. That ratio is the headline for the fix
prompt: **trust the finding, re-check the line numbers.**

Corrections that change a recommendation rather than a citation:
- **admin-analytics-07 — the `after()` move is UNSAFE as written.** `touchLastSeen` calls
  `await headers()` (`last-seen.ts:189`), and Next's own docs say a Server Component cannot use
  `headers()` inside `after()` and will throw at runtime. Its catch logs only outside production, so
  **the naive fix breaks presence in production and says nothing**. The fix must read the headers
  during render and pass the facts in: a signature change, not a one-line move.
- **auth-edge-01 — `hint` belongs to `FloatArea`, not `FloatField`**, so the finding's alternative
  fix "give the one caller `trailing` instead" is impossible as written. The mechanism is proven
  though: chunk `2154mzuydk5m6.js` (17,014 B) carries InfoTooltip's "More info" and lands on exactly
  the five named routes, and `/verify-email` uses `Button` and carries none of the five base-ui
  chunks — so Popover, not Button, is the cause.
- **dead-code-07 — a foot-gun in the stated range.** `nudgeVariants` is `:112-116`; `:118-122` is
  `sectionVariants`, which is live at `:249`. Deleting `:112-122` as written breaks the hero's stagger.
- **media-viewer-09 — one sub-claim REFUTED.** `IDLE_MS` did not move 2.6 → 3.6 s: `git log -S` finds
  only `d84b34c`, which introduced it at 3600. The instruction to consider putting it "back to 2.6 s"
  must be dropped.
- **bundle-build-05** — 126 KB is really 115.7 KB, and `directory-profile-03` supersedes its
  `/welcome` half; keep only the `person-detail.tsx:25` half.
- **duplication-05** — the proposed `balancedBody(text, m.index)` would coerce a number through
  `text.match()` and silently match elsewhere; pass the two-form RegExp the helper already accepts.
- **dependency-diet-03** — `phase9-probe.mjs:39` is **already failing today**, and the claimed saving
  ("one fewer accepted advisory on the status board") does not exist: `audit-status.mjs` has no
  ALLOWLIST reference.
- **shell-primitives-13** — not the only reduced-motion violation: `landing/footer-hoopoe.tsx:176`
  does the same and declares itself a scoped exception, so the owner is deciding about two files.
- **lib-core-config-01** — it caught that `OPERATIONS.md:117` and `:153` were still unfixed while my
  retention commit was in progress. Both are now corrected in `74cc61a`.
- **member-surfaces-09** — the privacy policy's "Last updated" had to move to 4 September because of
  that same commit. Done in `74cc61a`.

## Authoritative CSS measurement (orchestrator, close-out, supersedes every figure in the notes above)
Measured directly off the two committed scratch builds at 19:05 on 2026-09-04, `stat` and `gzip -c`:

| | full build | lab-free build | delta |
|---|---|---|---|
| shared stylesheet, raw | 238,434 B | 164,037 B | **−74,397 B (−31.2 %)** |
| shared stylesheet, gzipped | 34,274 B | 25,289 B | **−8,985 B (−26.2 %)** |
| lab-private CSS chunks | 23,686 B + 5,824 B | none | both gone |
| the 9,453 B chunk on all routes | present | present | unchanged |

The working notes above quote 33.5 / 34.3 KB and 25.3 / 24.7 KB in different places because some are
KiB and some decimal kB. **These byte figures are the ones to quote**; the report uses them.

## Orchestrator measurement of auth-edge-01 (close-out, 19:08) — the finding holds, with bytes
`/login` carries nine chunks `/verify-email` does not, 236,347 B in total. Grepping each for
`useFloating` / `base-ui` / `Popover` splits them cleanly:

| chunk | bytes | contains |
|---|---|---|
| `2154mzuydk5m6.js` | 17,014 | "More info", Popover, useFloating — **InfoTooltip itself** |
| `0jlq6l4f8yx9k.js` | 60,552 | base-ui, useFloating |
| `3lg6rokqb517_.js` | 25,513 | base-ui, useFloating |
| `0mmkcfgfeodk3.js` | 35,021 | useFloating |
| `0xndweaykjp80.js` | 23,006 | useFloating |
| **floating stack total** | **161,106** | |
| `0o8o--shg75rg.js` | 34,665 | (the login form) |
| `33tpczt5r6c49.js` | 16,857 | (the login form) |
| `18-v7zo6xad7k.js` | 18,546 | hoopoe, turnstile |
| `1qjxkpe2rvmms.js` | 5,173 | hoopoe, turnstile |

So the finding's "~150 KB" is if anything conservative, and the verifier's mechanism check is right:
`/verify-email` uses the same `Button` and carries none of the floating chunks, so the Popover chain
is the cause, not `Button`. **Caveat the fix session must clear**: 161,106 B is the whole floating
stack, and only the 17,014 B tooltip is provably tooltip-only. If anything else on those four pages
opens a popover, select or dropdown, part of the stack stays. Measure with a before/after build.

## Orchestrator measurement of dependency-diet-01 (close-out, 19:12) — count exact, disk figure corrected
Recomputed against `package-lock.json` using npm's own resolution rule (a dependency resolves to the
nearest `<ancestor>/node_modules/<name>` present in the lockfile — my first attempt collapsed packages
by name, missed nested duplicates and undercounted at 157):

- reachable from the root today: **1,082**; with `shadcn` removed: **848**
- **exclusive to `shadcn`: 234 packages = 21.6 % of the lockfile** — the lens's number, exactly
- on disk: **65.8 MB apparent, 79.1 MB allocated** (`du -sk`). The lens's 92.3 MB is above both
  figures I could reproduce; quote 66 MB, or 79 MB if you mean what the disk gives back
- biggest: `@ts-morph/common` 11.8 MB, `web-streams-polyfill` 8.6 MB, `@modelcontextprotocol/sdk`
  5.1 MB, `msw` 4.8 MB, `shadcn` itself 4.2 MB, a private `zod` copy 3.4 MB
- `world-atlas`: 7.8 MB apparent / 7.9 MB allocated, one package

Combined: **−235 lockfile entries, −73.6 MB apparent / −87.0 MB allocated.**

## Orchestrator check of the real Collection encode (close-out) — for docs-02's fix
Read at HEAD so the fix session does not have to guess what `media.md` should say instead:
- **direct path** — `collection/actions.ts:600-603`: `.resize(box.width, box.height, {fit:"inside",
  withoutEnlargement:true}).webp({ quality: COLLECTION_WEBP_QUALITY })`, where `box` is
  `storedResizeBox` (a 40 MP **area** cap that only ever downsizes, `upload-shared.ts:78`) and
  `COLLECTION_WEBP_QUALITY = 100` (`upload-shared.ts:91`).
- **FormData fallback** — `actions.ts:338-342`: `.resize(1600,1600,{fit:"inside",
  withoutEnlargement:true}).webp({quality:80})`.
- **the feed** — `image.ts:66-67`: 1920×1920 at q80. This is the one `toDisplayWebp` box that has
  fooled two sessions into thinking the Collection compresses.
So `media.md`'s 480 / 1600 / 3000 at q72 / q80 / q82 is wrong in every variant, every dimension and
every quality number, and the file is the one `CLAUDE.md` sends a media session to.

## ORCH-02 CORRECTED at close-out — the "0 bytes of member JS" claim was wrong
A verifier on the `lab` cluster refuted `lab-01`'s member-JS paragraph, and since I had made the same
claim in stronger form, I recomputed all 52 shared routes from `raw/route-bundle-stats.json` against
`raw/route-bundle-stats-nolab.json` myself:

- **49 of 52 routes are SMALLER without the lab; 3 are 78 B larger; none is identical.**
- Range −23,163 B to +78 B. **Mean −1,077 B ≈ 0.101 % of a median route.**
- Largest: `/verify-email` −23,163 B **across the same 20 chunks**; `/welcome` −4,044 B while *gaining*
  a chunk (35 → 36); `/collection` and `/collection/[id]` −1,790 B each; `/profile/[id]` −1,326 B.
- The three that grow (`/`, `/signup`, `/reset-password`) each gain one chunk and 78 B.

The conclusion survives — no lab *component* reaches a member, which audit 1 proved chunk by chunk and
which chunk-count parity supports — but the mechanism is that the lab's presence in the module graph
changes how member chunks are packed. "Zero bytes" is not true; "about a tenth of a percent, 3 % on one
route" is. The report's ORCH-02, §4 #1 and §5 all now say so.

## docs-02 CORRECTED at close-out — and my own compilation note with it
I recorded earlier that `media.md`'s 480/1600/3000 table describes a pipeline that "has never
existed". A verifier checked it against the code and I re-read the source: **two of the three rows are
real.**
- `thumbUrl` **480 px at q72 is correct** — `collection-photo.ts:26` (`THUMB_PX = 480`) and `:197`
  ("The grid thumbnail: 480px longest side, WebP at 72"), and `schema.prisma:269` says so.
- `url` **1600 px at q80 is correct for the FormData fallback only** (`actions.ts:338-342`). The
  primary direct path keeps a 40 MP area cap at `COLLECTION_WEBP_QUALITY = 100`
  (`actions.ts:600-603`). `schema.prisma:270`'s own `// 1600px` comment is wrong for that path too.
- `originalUrl` **3000 px at q82 has never existed** — the schema has only `thumbUrl` and `url`.

So the defect is narrower and more interesting than "all wrong": the spec documents one `url` recipe
where there are two paths, and invents a third variant. The fix must document both paths, and
`TRAPS.md`'s flat "does NOT downscale" carries the same gap. The report's A11 now says this.
