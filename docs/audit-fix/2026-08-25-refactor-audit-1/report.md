# Pre-release simplification audit — report

Audit-only session, 2026-08-25. Working files: `docs/audit-fix/2026-08-25-refactor-audit-1/work/`
(`work/task_plan.md`, `findings.md`, `brief-common.md`, `raw/` tool output, `agents/` — the 18
full agent reports, `verify/` — adversarial verdicts). This file is the deliverable; the
agent reports are its appendices and carry the per-finding evidence, exact line ranges,
steps, risks and gates.

How to read this: section 2 is the plan — six fix sessions plus one owner conversation,
executable top to bottom. Every item carries its finding id(s); the full detail for an id
lives in the agent report named by its prefix (`work/agents/<prefix>.md`). A fix
session takes a phase, and reads each item's full entry before touching code.
Verification: every finding came from a reader agent, ~30 were hand-checked by the
orchestrator (one refuted and corrected), and the high-risk clusters were re-tested
adversarially at HEAD (verdicts in `work/verify/`, summarized in §6).

Decomposition rationale (one sentence, as the prompt asks): thirteen territory readers
sized 4–13k lines so each could read every file it owned, plus five cross-cutting lenses
(bundle/build, dependencies, duplication, dead code, data layer) for the questions that
fall between territories — granularity chosen so no file went unread and no lens went
unheld.

## 1. Executive summary

### 1a. Baseline (measured 2026-08-25 14:30, tree at 1d3f996)

| Metric | Value | Tool |
|---|---|---|
| Tracked files | 1,041 | `git ls-files` |
| Code lines, whole repo | 160,602 (TS 92,414 · MD 26,760 · JSON 25,083 · JS 13,415 · other ~3,000) | cloc 1.86 `--vcs=git` |
| Comment / blank lines | 36,721 / 18,038 | cloc |
| `src/app` code | 46,497 — `/lab` 32,196, product 14,301 | cloc |
| `src/components` code | 35,028 (247 files) | cloc |
| `src/lib` code | 17,941 + 7,352 in 68 test files | cloc |
| `scripts/` code | 6,280 (54 scripts) · `docs/` 17,435 lines | cloc |
| Comment/code ratio | src/lib 0.52 · src/app product 0.38 · components 0.34 · proxy.ts 1.91 | cloc |
| `next build` cold / warm | 45.6 s / 23.9 s (compile 16.9 · TypeScript 19.4 · Sentry hook 3.0 · static 0.6) | timed |
| `npm run check` | 26.0 s, 75 test files, all green | check.mjs |
| Routes in production build | 92 (42–43 are `/lab/*`) | build table |
| First-load client JS | root 430 KB every route; member pages ~1,370 KB median; /directory 1,642 · /profile 1,636 · /feed 1,530 (raw; gzip ≈ ×0.40) | build manifests |
| Dependencies | 45 runtime + 16 dev; node_modules 1.3 GB | package.json |
| knip (configured) | 2 unused files · 158 unused exports · 37 types · 7 unused deps · 5 unlisted | knip 6.32 |
| Duplication | 275 clones, 3,819 lines (2.74 %) + 12 in tests | jscpd 5 |
| Circular deps | 5 real (43 more inside gitignored generated client) | madge/depcruise |
| Type sludge (non-lab src) | `any` 9 · `as unknown as` 11 · eslint-disable 52 | grep |
| Database | 41 models · 129 live indexes · 112 MB (Place gazetteer 97 MB) | schema + live dumps |

Tool notes: `scc` is not on npm (cloc used, same convention); `type-coverage` crashes on
Node 26 under three invocations (grep substitute in `raw/type-sludge.txt`); and
**`npm run analyze` has been a silent no-op the whole time** — `@next/bundle-analyzer` is
incompatible with Turbopack builds (verified live); `next experimental-analyze` works and
produced the chunk-level data this audit used.

### 1b. Expected after the diet (honest ranges; fix sessions re-measure)

**Closed out 2026-08-27.** The measured column below was taken at `033ea43`, with the
campaign's baseline commit `1d3f996` extracted to a scratch tree and measured by the SAME
tool invocation, so every comparison here is like-for-like rather than against the numbers
in §1a (which used whatever flags that session used).

| Metric | Today | Expected | **Measured 2026-08-27** | Main levers |
|---|---|---|---|---|
| Code lines (net, src+scripts) | — | **−4,500 to −5,500** | **−1,067**, campaign commits only (167 of the 196 in the window). A **~4× miss**; see the per-phase table below. Whole-tree net for context: −2,275 in product `src` — components 35,028→34,019, lib 17,941→17,778, app-minus-lab 14,301→13,198 | dead ~1,800 · dedupe ~2,300 · placeholder/flag strips ~700 (cross-agent overlaps already deduplicated) |
| Tracked repo weight | — | **−6.4 MB**, plus ~19,300 lines of imported skill prose relocated (owner call) | **−8.00 MB** (37.89 → 29.89 MB) — and that is NET of this audit's own artefacts, which added 19,355 lines of markdown to `docs/` | WhatsApp originals 3.05 MB · overflow PDF/HTML 1.79 MB · audit JSON dumps 0.99 MB · QR SVGs 0.2 MB · brand PNG 0.38 MB |
| First-load JS, /feed | 1,530 KB raw | **1,150–1,220 KB** | **1,186 KB**, from a clean production build at close-out (`.next/diagnostics/route-bundle-stats.json`, `firstLoadUncompressedJsBytes` — the same metric §1a used). **In range.** | posthog defer 245 KB · LazyMotion (async domMax) 50–100 KB critical-path · conditional shell UI ~19 KB · dialog deferral ~12 KB |
| First-load JS, /directory | 1,642 KB raw | **1,070–1,150 KB** | **1,218 KB**, same build. **ABOVE the range by 68 KB** — three of the phase's levers were re-refuted with measurements at fix time, see session 7 | the same + atlas-as-fetch 105 KB + d3 defer ~80 KB |
| Every member page | ~1,370 KB median | **−360–380 KB each** | **median non-lab route 1,047 KB, down from ~1,370 — −323 KB at the median**; on the three routes §1a named, −344 (/feed), −411 (/profile/[id]), −424 (/directory). Lightest route /catchups/join 621 KB, heaviest /profile/[id] 1,225 KB, 52 non-lab routes of 98 | shared-chunk levers apply everywhere |
| `next build` | 45.6 s | **~37–42 s** autonomous; **~18–23 s** with the owner's duplicate-TS-check call | **measured, and the wall clock is not comparable.** Built in a throwaway git worktree under `.scratch/` so the shared `.next` was never touched: warm rebuild **42.8 s**, but at load average 13–36 (another session was working), against a baseline taken at unknown load. The phase timings are the honest read: **compile 16.9 → 12.1 s (−28 %)**, **TypeScript 19.4 → 14.5 s (−25 %)**, static generation 0.6 → 1.5 s for 102 pages. The Sentry hook's 3.0 s is absent from this run because it was built without an auth token, so it is excluded from both sides. Note the two autonomous levers §1b counted on were themselves re-refuted with measurements in session 7 — the compile and TypeScript gains come from there being less code and fewer packages, not from the projected changes | tsconfig exclude · Sentry hook · TS-in-CI-only (owner) |
| Dependencies | 61 | **−7 now** (+2–3 more via owner/deferred calls), 6 re-sectioned, production graph −~145 MB | **−10**: 44 runtime + 17 dev → 33 runtime + 18 dev (51) | see phase 1b |
| Database | 41 models | **−4 models · −8 columns · −3 indexes** (migration-gated) | **−4 models · −9 columns · −3 indexes**, applied to BOTH production and demo on 2026-08-27 and verified after (session 9) | adapter tables, GroupInvite, retired columns + the write-only Visit trio |
| Local disk | — | **−135 MB+**, screenshots bounded | **not re-measured** — the owner's own "sanan's stuff" move (§4 #15) is his to do | stuff folder move, tsbuildinfo, retention rule |

Two rows the table cannot carry, both measured the same like-for-like way:

| Metric | Baseline `1d3f996` | Measured 2026-08-27 |
|---|---|---|
| Duplication in `src` + `scripts` (jscpd 4.3, `--min-lines 5 --min-tokens 50`, run over both trees) | 235 clones · 3,641 duplicated lines · **2.04 %** | 174 clones · 2,702 duplicated lines · **1.47 %** |
| Type sludge (non-lab `src`) | `any` 10 · `as unknown as` 11 · eslint-disable 52 | `any` 7 · `as unknown as` 11 · eslint-disable 47 |

`npm run check` went from 75 test files to 76 and stays green; its wall-clock is not
comparable run to run (§1a's 26.0 s against 36–48 s here) because this machine routinely
carries several sessions at once — session 9 once recorded 1,429 s on an unchanged tree.

**The code-lines row, measured properly — and it is a miss.** The −2,275 above is a
whole-tree net and therefore not the campaign's own figure; the tree was never frozen, and
peer feature work (the guide, the Collection rework, 2,367 lines of new `/lab` rooms) landed
in the same directories throughout. So at close-out the 196 commits in the window were
partitioned by hand: **167 are this campaign's, 29 are peer feature work.** Summing only the
campaign's diffs, restricted to `src/`, `scripts/`, `prisma/` and `e2e/` (excluding baseline
PNGs):

| Phase | Commits | + | − | net |
|---|---|---|---|---|
| 1a dead code in src | 26 | 244 | 2,314 | **−2,070** |
| 1b root, docs, assets, deps | 20 | 198 | 234 | −36 |
| 2 placeholders, flags, Groups | 18 | 734 | 648 | **+86** |
| 3 lib dedupe | 22 | 1,097 | 1,216 | −119 |
| 4 component/route dedupe | 43 | 3,418 | 3,389 | **+29** |
| 5 bundle & build | 18 | 1,664 | 1,010 | **+654** |
| 6 schema & architecture | 15 | 1,319 | 1,185 | +134 |
| 10 last rows + close-out | 5 | 828 | 573 | +255 |
| **Total** | **167** | **9,502** | **10,569** | **−1,067** |

Against an expected −4,500 to −5,500, that is **off by roughly 4×, and essentially all of the
delivered saving is phase 1a.** The two dedupe phases — 65 commits, the single largest
investment in the campaign — netted **−90 lines between them**.

**Why, and it was knowable in advance.** Deduplication cannot save lines in this codebase.
The comment-to-code ratio is 0.34–0.52 (§1a) because the house rule is that every constant is
argued for in a comment. Replacing five copies of a ten-line block with one shared function
costs a docblock explaining why the shared function exists, five imports, and five call
sites — it is line-neutral by construction. The audit projected SLOC savings against a style
that forbids them, and it led with that number.

**What dedupe did buy, in the currency that fits it**: 61 fewer clones, 939 fewer duplicated
lines, and the duplication rate down 28 % relative. Ten hand-rolled Keeper guards became two;
thirty-nine spellings of "who wrote this" became two named shapes. A bug in any of those now
gets fixed once. That is the real return, and a line count cannot see it.

**Every projection this audit made in a unit OTHER than lines was met or beaten** — tracked
weight, dependencies, database objects, import cycles, duplication, and first-load JS on two
of the three named routes. For the next audit: project clone counts, dependency counts, byte
weight, bundle bytes and database objects. Do not project SLOC here.

Two more measurements taken at close-out, neither of which §1b had a row for:

| Metric | Baseline `1d3f996` | Measured 2026-08-27 |
|---|---|---|
| Real import cycles (`madge --circular --ts-config`, excluding the generated Prisma client) | 5 | **0** |
| Files deleted outright by the campaign | — | **48** |

Floor honesty (goal-sloc): a member page's framework floor in this design is ~950–1,000 KB
raw JS (react-dom, router, Base UI chrome, the 50 birds, the mascot, toasts, cn). Going
lower means removing product; this audit does not propose it. The repo floor includes the
17 MB visual baselines and the 32k-line lab history — both owner-defended features.

### 1c. The five biggest wins, in plain language

1. **Every page gets meaningfully lighter, losing nothing.** The analytics library (the
   biggest single thing on every page after React) and the animation engine's unused
   halves stop loading up front; dialogs, the tour, the demo bar and the world map load
   when used. Roughly a quarter of every page's JavaScript comes off with the autonomous
   changes alone.
2. **About 5,000 lines of dead or duplicated code go** — including a ~595-line avatar
   renderer unreachable since June, two live-but-uncalled server write endpoints, the same
   auth preamble pasted ~75 times, and a test helper pasted 33 times in two silently
   different versions. Two small visible bugs get fixed free (the "!alt" letter-preview
   artifact, the demo tour's 2.5 s stall).
3. **The repo and root get visibly cleaner**: 6.4 MB of unreferenced tracked files (some
   publicly served), the build-cache file out of the root, the closed bug audit archived,
   the README corrected (it teaches two forbidden operations today), and — owner call —
   19k lines of imported skill prose moved out of the repo.
4. **The database sheds what the code abandoned**: the never-called NextAuth adapter and
   its three tables, the Groups-invite table, eight dead columns (five retired + the write-only Visit location trio), three unused indexes —
   each proven unread, each gated on the owner's approval because it is DDL on the live DB.
5. **The leftovers problem gets a mechanism**: a scripts-ledger gate inside `npm run
   check`, a six-clause test-survival rule, a knip config that makes it a real leftovers
   detector, an audit-archive convention, and the "close it out" checklist (§7). This is
   what prevents the next 30–40k-line manual purge.

## 2. Phased fix plan

Rules for every fix session: read each item's full entry in its agent report first; one
revertable commit per coherent item (docs/tests/baselines ride along); `npm run check`
before each commit, `npm run visual` after UI phases; never `db push`; the tree is shared —
stage by name. Phases 1–4 are mutually independent unless an item says otherwise; phase 5
after 1–2 (less code to move); phase 6 is owner-gated. ⚠ = touches pinned/security files;
the agent entry names the exact test pins that must ride in the same commit.

### Phase 1a — dead code in src (one session, ~1,800 lines)
| Item | Findings | Saving | Gate |
|---|---|---|---|
| Legacy mono avatar renderer behind `USE_V2` | landing-mascot-avatars-01 = duplication-01 | ~560–595 lines | check · visual · /birds |
| `updateUserProfile` + 3 comment repoints | member-surfaces-01 = dead-code-01 | ~118 | check; save a profile field |
| `createCatchup` + schemas + `suggestSeedPrompts` (+test trim) ⚠ | catchups-01 = dead-code-02 | ~130 | check; create a Catch-up |
| `loadSupport` + 8 computed-never-rendered analytics fields | admin-analytics-01/02 = dead-code-05 | ~106 + 9 queries/view | open all analytics views |
| `ui/badge.tsx`, `ui/tabs.tsx` | shell-primitives-02 = dead-code-03 | 146, 2 files | check |
| Dead shadcn sub-primitives (24 symbols) | shell-primitives-01 | ~280 | check · visual menus |
| utils.ts dead trio | shell-primitives-03 = dead-code-04/09 | ~101 | check |
| Dead-with-test functions ⚠ normalize.test slice boundary | dead-code-09 (CONTRIBUTION_STATUSES kept, §5) | ~110 | check, suite floor conscious |
| Small-dead sweep (~18 sites) | dead-code-15 + catchups-12 + feed-posts-13/15 + auth-edge-09/10 + shell-primitives-12 + lab-02 | ~240 | check |
| Full dead year-row library out of house-spans (4 fns + type + test rewrite; leaves the file's live parsers) | directory-profile-04 ⊃ dead-code-09's two | ~117 incl. test | check, suite floor conscious |
| profile-avatar.tsx → lab (only lab imports it); directory sort-stub delete + tile fold | directory-profile-06/10 | 185 relocated + ~18 | check; /lab/profiles |
| De-export sweep (~55 symbols) ⚠ rule-test decl strings | dead-code-10/11 table | 0 (API narrowing) | full suite |
| globals.css dead tokens | shell-primitives-05 = dead-code-13 | ~32 | visual |
| Dead flags: LOGIN_TRANSITION_FLAG, flight `speed`, `bindPassword`, tour `enabled` | auth-edge-06 + landing-…-05/06/07 | ~100 | check; flight look |
| Metadata-only auth layouts | auth-edge-07 | 24 | tab titles |

### Phase 1b — root, docs, assets, dependencies (one session)
| Item | Findings | Saving | Gate |
|---|---|---|---|
| QR pipeline (script + 5 SVGs + jsqr/qrcode + README row) | member-surfaces-02 = root-docs-assets-04 = dead-code-06 | 147 lines + 199 KB + 2 deps | /support |
| WhatsApp originals out of public/ (owner; DB check first) | root-docs-assets-02 | 3.05 MB | SQL + crawl |
| overflow-stories PDF+HTML out | root-docs-assets-03 | 1.79 MB | none |
| Archive closed bug audit; delete its 2 JSON dumps | root-docs-assets-01 | ~1 MB + convention | grep + check |
| Brand 4096 PNG out (SVG masters stay) | root-docs-assets-16 | 381 KB | grep |
| gen/ + v4–v6/c5–c6 collection files (DB check first) | root-docs-assets-17 = dead-code-06 | ~1.3 MB | SQL + crawl |
| README rewrite (db push, admin-login) + AGENTS.md line | root-docs-assets-05 | correctness | security-regressions |
| Dead doc pointers ×6 + profile.md banner + ROADMAP notes + indexes | root-docs-assets-08/09/10/18 | correctness | eyeball |
| progress.md monthly archive (docs/history/) | root-docs-assets-06 | root −280 KB | grep |
| tsbuildinfo → node_modules/.cache | root-docs-assets-07 | 1.2 MB off root | check ×2 |
| .gitignore trim; .DS_Store sweep; dev droppings | root-docs-assets-13/14 = dead-code-07 | ~9 MB local | git status |
| Dead deps out; d3-selection/@types/geojson in; dev-login via next-auth/jwt ⚠ | dependency-diet-01/05/06/07 = directory-profile-03 = auth-edge-11 = lib-core-config-02 | 7 deps; analyzer works again | check; screenshot:auth |
| Re-section prisma/shadcn/pg/dotenv/@types/d3-zoom/tw-animate (+popover onto menu material); prisma versions aligned; eslint-config bump | dependency-diet-02/03/08/09/10/11 + shell-primitives-07 | prod graph −145 MB; 1 dep | check; watch first deploy |
| Puppeteer `skipDownload: true` (bundled Chrome documented broken here; scripts use real Chrome) | dependency-diet-16 | ~130 MB local per major | one screenshot + one crawl |
| Small config/docs hygiene: unify `zod` → `zod/v4` (1 import); `@types/node` 20 → 24 (CI runs 24); SECURITY.md probe range {4..10}→{3..10}; OPERATIONS gains its missing snapshot.yml section; drop the dead `vitals.vercel-insights.com` CSP allowance with the analytics decision | dependency-diet FOL + scripts-e2e-ci FOL + critic-1 G1 | drift repair | check |

### Phase 2 — placeholders, flags, Groups residue (one session)
| Item | Findings | Saving | Gate |
|---|---|---|---|
| `insensitive` unconditional; 2 copies deleted | lib-core-config-04 = dead-code-08 = data-layer-04 = feed-posts-11 | ~20 | feed search |
| Groups residue (feed plumbing, letters branches, FeedScope, bell icon, Saved query) ⚠ | feed-posts-01/13 + member-surfaces-13 + shell-primitives-08 note | ~140 + 1 query/load | check · visual · letters |
| /donate → proxy redirect ⚠ proxy pins | member-surfaces-08 | 7 + 1 route | crawl + security-regressions |
| Landing showcase decoupled to showcase.tsx (fate: owner) | landing-mascot-avatars-02 | page.tsx −130 | visual zero-diff |
| Tour anchor `catchups-explainer` restored | landing-mascot-avatars-04 | demo stall gone | run the tour |
| Skeletons mocking retired pages (4 sites) | member-surfaces-15 + directory-profile-11 | ~20 + 3 jumps | throttled loads |
| Stale-comment batch (bird-pick; the "no cron on this project" claim in FIVE files per critic-1, not one; lab claims; wood-mount refs; ghosts; utils.ts:193's deleted color.md pointer) | member-surfaces-14 · lab-03 · directory-profile-14 · auth-edge-14 · catchups-15 · landing-mascot-avatars-09 · critic-1 G2 | truth | check |
| /notice retirement: dated line (after 2027-08-01) | member-surfaces-05 | ~120 deferred | none now |

### Phase 3 — dedupe at lib level (one session)
| Item | Findings | Saving | Gate |
|---|---|---|---|
| Shared test kit + fnBody adoption + spelling-pin trim + escapeLike one-home + tour-mobile pin trim + misfiled sidebar test rename + hygiene trio + knip.json ⚠ | lib-tests-01..07 = duplication-03 = dead-code-18 + landing-mascot-avatars-10 | ~360 | check, 75 files |
| readMinutes + plainExcerpt adoption (2 bug fixes) | feed-posts-08 = member-surfaces-07/10 | ~35 | visual |
| links schema + displayEmail normalization | auth-edge-05 = duplication-21 | ~22 | save links |
| prisma-errors adoption + isMissingTable | duplication-17/22 = catchups-10 | ~20 | check |
| localStorage kit ×3 | duplication-15 | ~40 | check |
| fnv1a shared (wordle←avatar) | duplication-24.7 | ~9 | check |
| Valley date formatter (locale = owner veto) | catchups-07 = duplication-18 | ~40 | visual, intentional diffs |
| Identity/author/thread-member select constants + the directory person type/PERSON_SELECT (explicitly outside data-layer-05's scope) | duplication-06 = data-layer-05 + admin-analytics-10 + directory-profile-09 = duplication-16 | ~210 | check + crawl |
| MIN_PASSWORD from password-rule (7 spellings) + shared gazeFor | auth-edge-13 | ~10 + one floor | check |
| Profile page stops fetching the password hash (`omit: { password: true }`) | data-layer-08 | defence-in-depth | open a profile |
| utils.ts: rich-text + phone move out; phone split helper | shell-primitives-09/11 | structure | check |
| Composer adopts rich-text-editing; parseImageUrls→parseJsonArray | feed-posts-09/10 | ~28 | Cmd+B, paste |
| claimToken; requireVerifiedMember composes Stage 1 ⚠ | auth-edge-08/12 | ~29 | gate tests |
| loadPosts include/serializer dedupe | feed-posts-03 | ~60 | feed + Saved |

### Phase 4 — dedupe at component/route level (one–two sessions)
| Item | Findings | Saving | Gate |
|---|---|---|---|
| Auth flight-perch hook + photo panel + PasswordField | auth-edge-01/02/03 = duplication-04 | ~330 | visual · flight watch · e2e |
| Catchups keeper/member gates + EDITION_SELECT ⚠ | catchups-02/14 = duplication-05 | ~125 | keeper refusals |
| Published-round loader (song drift closed) | catchups-04 = duplication-11 | ~90 | both round views |
| Catchup titles, NotAvailableCard, QuestionRow, dead props | catchups-08/09/11/12 | ~85 | screenshots |
| Photo-intake shared prep ⚠ | member-surfaces-03 | ~60 | both upload paths |
| Empty-state hoopoe stage | member-surfaces-06 = duplication-14 | ~70 | 3 empty states |
| Letters loading twins; viewer byline; useWideViewport | member-surfaces-09 + shell-primitives-13 + duplication-19/23 | ~70 | check |
| Paged-list hook (Profile/Collection; PostFeed only if clean) | feed-posts-05 = duplication-12 | ~70 | scroll ×3 |
| Optimistic heart/bookmark hook | feed-posts-06 = duplication-13 | ~50 | taps ×3 |
| Report preamble; bell variant collapse; ui/skeleton→warm | feed-posts-14 + shell-primitives-08/14 | ~85 | check + visual |
| Admin: act-hook, filter bar, status maps, MAIL_TONE, audit skeleton, hygiene, shared `loadThreadWindow`, and the ~24 unread queries per analytics view (countMembers(); split loadPresence) ⚠ | admin-analytics-03/04/05/08/09/11/12/13 + member-surfaces FOL | ~283 + 24 queries/view | drive both admin lists + analytics views |
| `transition-[colors,transform]` sweep: 14 shipped files animate a property that does not exist (`colors`); spell the real properties per letters/page.tsx:178's documented pattern | member-surfaces FOL + critic-1 G1 | 0 lines; hovers start animating colour as intended | visual + hover pass |
| Upload guard + toDisplayWebp; cron-secret helper; lookup guard ⚠ | feed-posts-07 = duplication-09 = lib-core-config-07 | ~145 | one upload each path |
| Places transaction helper | duplication-10 = data-layer-06 | ~30 | settings + admin save |
| Probe/dev-script kits | duplication-07/08 + scripts-e2e-ci-06 | ~230 | dry reads only |
| places/search escapeLike clamp | directory-profile-08 | 6 + closes C-015 shape | typeahead |
| email-queue comment merge; instrumentation collapse; prisma.config stanza | lib-core-config-05/08 | ~35 | check |
| Avatar-upload hook (closes shrink gap) | directory-profile-12 | ~30 | both upload paths |
| Scripts ledger gate + README backfill + close-out + crawl list + SKILL counts; delete demo/run-sql | scripts-e2e-ci-01/04/07/08 | mechanism + 59 | gate names offenders |
| Optional small tail (take-or-leave): catchups join-page shared shell ~15; message-composer/photo-attachments shared upload fetch; FadeSlide primitive; a privacy-page retention drift-test | catchups FOL · feed-posts FOL · duplication FOL · lib-core FOL | ~40 | check |

### Phase 5 — bundle & build (one session + measurement pass)
| Item | Findings | Saving | Gate |
|---|---|---|---|
| tsconfig excludes src/generated | lib-core-config-01 = bundle-build-05c | up to ~5 s/build | extendedDiagnostics before/after |
| Defer posthog-js (idle init; identify chains on promise) | bundle-build-01 | 245 KB/page | PostHog live events |
| LazyMotion + `m`, async-domMax variant (census settled: domMax required) | bundle-build-02 = dependency-diet-12 | ~90–100 KB/page off the critical path (~8–12 KB gz truly sync) | visual + hoopoe idle check |
| not-found.tsx dynamic Hoopoe (+warmup import) | bundle-build-04 | 36–168 KB public pages | 404 look |
| Directory atlas as fetch (+ optional dynamic map) | bundle-build-03 = directory-profile-02 | 105–185 KB | visual + zoom |
| Letterhead edit-half dynamic split ⚠ | directory-profile-01 | 80–150 KB stranger profiles | profile pins + visual |
| Dialog/viewer deferral (feed, collection, profile) | feed-posts-04 = bundle-build-11 | ~12–15 KB/route | click-throughs |
| Delete the filters index barrel; 4 importers go direct | shell-primitives-10 | a few KB on 3 routes | /directory, /collection |
| DemoBar / tour surfaces / verify banner conditional-dynamic | lib-core-config-03 = bundle-build-07 = landing-…-03/08 | ~19 KB/page + rig off shared chunk | DEMO_MODE=1 look |
| Sentry hook conditional | bundle-build-06 | ~3 s/build | build log + Sentry event |
| Feed image responsive sizing (measure first) | bundle-build-12 | possibly the largest real-world win | network audit |
| Measure-first option: server-render page 0 of /collection and /directory (both currently fetch it client-side after mount) | member-surfaces FOL + critic-1 | perceived latency on two cold surfaces | screenshots + timing |

### Phase 6 — schema & architecture (owner-gated)
| Item | Findings | Saving | Gate |
|---|---|---|---|
| @auth/prisma-adapter out + 3 auth models (code first, DROPs later) ⚠ | dependency-diet-04 = data-layer-01 | 1 dep + ~42 lines + 3 tables | full auth battery |
| GroupInvite + dead columns (now incl. write-only `Visit.timezone/lat/lng`, critic-2's find) + 2–3 indexes | data-layer-02/03/07 + critic-2 | ~35 lines + DB objects | both DBs, crawl |
| cuid2 → crypto.randomUUID at 12 server sites (quiet-moment item, not pre-launch) | dependency-diet-14 | 1 dep | uploads + receipt flow |
| Verify/DROP the six orphan reverted-Catchup tables (spec 6.4) | data-layer owner-A | DB hygiene | pg_tables |
| Action-gate wrapper (withMember/withAdmin), one-file pilot ⚠ | duplication-02 (+ -20) | ~220 + double-auth gone | full suite per file |
| create-post-form hook split ⚠ | feed-posts-02 | structure | crash-net drill |
| catchups core/engine split (kills cycle) | catchups-03 | ~40 + cycle + RSC bytes | check + visual |
| Last two type cycles (onboarding, feed-rail) | directory-profile-13 + feed-posts-12 | madge → 0 | check |
| avatarColor retirement sweep (column drop separate) | shell-primitives-04 | ~45 + JWT bytes | crawl + e2e |

## 3. Findings

All 241 findings live in the 18 agent reports under `work/agents/`, in a fixed
format (Where / Phase / Tier / Class / Decides / Evidence / What to do / Saving / Risk &
gate / Confidence / Notes), with ids `<agent>-NN`. The machine-readable index is
`work/findings-index.json` (241 entries: 94 T1 · 110 T2 · 30 T3 · 7 T4).
Section 2 above is the deduplicated execution ordering; where two agents found the same
thing independently the plan row lists every id with `=`, and merged programmes carry
their fragment ids. Two critic rounds diffed the index against the plan; everything is
now either named in a row, folded into a named programme, listed in §4/§5, or recorded
as below-threshold in `verify/critic-2.md` §C.

Corrections from verification (authoritative over the agent text):
- **catchups-16 (CatchupEdition.theme "dead") is WITHDRAWN**: the admin reading room
  committed the same day (6d5609e) selects and renders `theme`; the demo seed writes it.
  True statement: no member-facing surface reads it. No action.
- **dead-code-09's CONTRIBUTION_STATUSES / canBecomePaid deletion is WITHDRAWN** in favour
  of member-surfaces-11's keep: they are the unit-testable statement of the C-084/C-085
  state machine whose production form is `PAYABLE_FROM` inline. Keep, exported.
- **dead-code-14's "Account/Session stay (adapter configured)" is superseded** by the
  adapter-inertness finding (dependency-diet-04 = data-layer-01): remove the adapter first
  and all three models orphan together.
- The five `*-message.ts` merge (auth-edge-04) and the wood.tsx relocation
  (member-surfaces-04) each had one agent for and one against; both are filed as optional
  taste items — the stale references they found are fixed regardless (phase 2).
- **The adversarial pass (161 verdicts: 120 confirmed, 40 confirmed-with-correction, 1
  refuted — catchups-16 above) added these load-bearing corrections**; a fix session
  executing any ⚠ item must still read its cluster's file in `work/verify/`:
  - **LazyMotion settled**: `domMax` IS required (8 `layout` props in 5 files, 10 `layoutId`
    in 9 incl. the sidebar marker on every authed page, drag in viewer + crop). So the
    sync-adoption saving is the ~8–12 KB gz band; the operative plan is bundle-build-02's
    async-domMax variant, whose ~90–100 KB raw is critical-path deferral, not deleted bytes.
    Measured: the motion chunk is 135,084 B raw / ~44 KB gz (not 64 KB gz as first written).
  - **`AdminSectionDef` is NOT deletable** (used at admin-nav.ts:43); only `ADMIN_SECTIONS`
    goes. **Deleting `socialIcon` AND `socialHost` breaks TWO silent slice boundaries** in
    normalize.test.mjs (:71 and :72) — both must be repointed in the same commit.
    **house-spans.test.mjs empties** once the year-row pins go — add a survivor test or
    consciously adjust the suite floor.
  - **Adapter/GroupInvite commits must also touch**: demo-seed/seed.ts:119,126-127 (the
    deleteMany wipes), cascade-rule.test.mjs:101/:112/:123 (OWN_CONTENT entries), and
    verify-guard.mts:121's deny canary (swap to another denied model).
  - **The WhatsApp originals are git-TRACKED** (core.quotePath hid them from the
    untracked comparison): root-docs-assets-02's `git rm` governs; dead-code-07's local
    saving drops to ~6.3 MB, and `landing-original.jpeg` is deliberately kept local
    (.gitignore:58-60) — do not delete it.
  - **README has THREE dangerous instructions, not two**: also `NEXT_PUBLIC_ADMIN_EMAIL`
    (:37, :104-105), which closed critical C1-c requires absent; and the env table omits
    `DEV_LOGIN_SECRET` while listing `NEXTAUTH_URL`, which nothing reads.
  - **Same-commit pin lists grew**: feed-posts-02 adds rich-truncate.test.mjs:113/:122,
    upload-shared.test.mjs:188, upload-size-rule.test.mjs:37; duplication-02 adds
    catchup-lifecycle.test.mjs (B-061 refuseIfFrozen-per-body + C-026 literal
    `await rateLimit(`), and its wrapper must be CALLED inside `export async function`
    bodies (gate-coverage hard-fails HOF-const exports); duplication-09's true text-readers
    are image-purge-rule/upload-shared (anchored BELOW the preamble — extraction safe) and
    cron routes must each keep their own `export const maxDuration`; catchups-03 notes
    catchup-lifecycle reads catchups.ts three times and the C-149 catch-floor is then
    zero-slack.
  - Smaller precision fixes (use verify/ files): letter-engagement props at :18/:26;
    gitignore trim by CONTENT not line number (keep npm-debug and the :37 uploads line);
    v4–v6/c5–c6 have zero references anywhere (dead-code-06's account is the accurate one);
    identity-select is 20 occurrences in 14 files (stronger than written); report-list's
    act() refreshes on error (M01 — the shared hook keeps that variant); ReportDialog/
    ImageViewer are deliberately always-mounted (defer via dynamic import, keep mount
    semantics); SERIES_STATUS copies differ in shape (label vs label+tone); people-list's
    setParam wraps startTransition; workplace has a third free-text writer
    (admin/people/actions.ts:144/184); '10 routes x 2 viewports' in CLAUDE.md/OPERATIONS
    should read 11; the scripts-ledger test must match README entries by path, not
    basename; verified-mark.test.mjs was born in abb9381.

**Bug leads surfaced in passing** (not simplifications — file into `docs/planning/bugs.md`
in the first fix session): (a) `catchups/round/question-section.tsx:41-44` prints
`entry.body` raw while `answer-card.tsx:105` renders the same field through
`renderRichText` — a caption with formatting markers shows them literally on the photo
wall and formatted on the card; (b) check `round/masthead.tsx:50`'s date formatting passes
`timeZone: VALLEY_TIME_ZONE` — if not, a publish date can shift a day across midnight IST.

**Completeness rounds**: critic round 1 found the "For other lenses" channel had dropped
six verified cross-territory items (now restored above), plus the corrections in §6; its
full notes are `verify/critic-1.md`. Rounds 2 and 3 (`verify/critic-2.md`, `critic-3.md`) diffed the 241-id index against this plan twice; round 3 closed dry.

## 4. Owner decisions

Plain language, one paragraph each, with a recommendation. Nothing here is executed
without your word.

1. **The landing showcase** (~2,200 finished lines switched off since 2026-08-04). Ship it,
   keep waiting (we decouple it either way so the landing stops carrying it), or retire it
   to the lab. Two things regardless: with it off, the public landing links to **no
   Privacy/Terms/Guidelines** (the audit-H12 "front door" documents) — they need a small
   home in the hero this week; and the trust card's five invented names must never render
   as-is. *Recommendation: decouple now, decide ship-vs-retire before launch, add the
   policy links immediately.* Rider: five `public/images/landing/*.webp` (283 KB, tracked,
   publicly served) are referenced only behind the flag and follow the showcase's fate;
   bugs.md #2 (a stale collection webp) connects to the same folder. (landing-mascot-avatars-02, critic-1 G4)
2. **The tour at launch.** Today it auto-offers only on the demo; members can never see it.
   Turn it on for members (one word + the anchor fix), or keep it owner/demo-only and we
   lazy-load it so members stop paying for it. *Recommendation: turn it on — it is the best
   60 seconds of onboarding the site has.* (landing-mascot-avatars-03)
3. **The About page ships saying "indefinitely procrastinated."** Write three short
   paragraphs, point the nav elsewhere, or keep the joke on record. *Recommendation: write
   the three paragraphs; About is what a cautious alumnus reads before trusting the site.*
   (member-surfaces owner note)
4. **Database drops** (adapter tables, GroupInvite, eight dead columns — five retired plus the write-only `Visit.timezone/lat/lng` trio — three indexes, and
   the six orphan tables the reverted Catch-ups build left — spec 6.4 has the runbook).
   All proven unread; all DDL on the shared live database. *Recommendation: yes to all,
   code-first then drops, both databases.* (data-layer-01/02/03/07 + owner-A)
5. **Deploy speed vs a second type-check.** Every deploy re-runs the TypeScript check CI
   already ran (~19 s of 46). Dropping it makes deploys ~40 % faster; the risk is a push
   that skipped CI shipping a type error. *Recommendation: only if you treat a red X as
   fix-immediately; otherwise keep paying.* (bundle-build-05)
6. **Lab stays deployed** (measured: zero member-facing JS; ~10–15 s of build; a small CSS
   sliver). *Recommendation: keep it on your domain; optionally exclude it from the DEMO
   build only, where /lab is blocked for everyone anyway; authorise the one-build CSS
   measurement.* (lab-01, bundle-build-08/09)
7. **Analytics: PostHog or Vercel Analytics, not both.** *Recommendation: remove Vercel
   Analytics — unless you value its counter as a backstop for PostHog's launch-month
   free-tier ceiling, in which case say "keep" and it becomes settled either way.*
   (dependency-diet-13)
8. **The imported skill packs and generic agents** (~19,300 lines, 98 % of tracked .claude
   content; five agents address a stranger named "Daisy"). *Recommendation: after the fix
   sessions finish, move them to your user-level folder — identical behaviour, repo sheds
   ~12 % of its tracked lines.* (scripts-e2e-ci-02/03)
9. **Two security probes with one-time questions** (phase6: a shipped upgrade; phase9:
   renames check.yml mid-run, violating the shared-tree rule). *Recommendation: retire
   both, keep the other eight.* (scripts-e2e-ci-05)
10. **The Profession filter matches a vocabulary nothing writes** since the Industry select
    was deleted — new members can never appear under any profession. *Recommendation:
    remove the filter for launch; rebuild it the day a real profession question exists.*
    (directory-profile-05)
    > **ANSWERED — owner, 2026-08-26.** Profession filtering **stays as a goal**; do not
    > treat this as "the feature is unwanted". His plan: at ~150 members, run every
    > `workplace` + `jobTitle` pair through an LLM, derive the buckets, and write each
    > member a **backend tag**. Recorded in `docs/planning/FEATURES.md` §2.
    > What that does NOT change: today's facet is `where.workplace = <exact value>` against
    > free text, and re-measured on the live database on 2026-08-26 it matches **0 of 63
    > members** (28 have a workplace; none is one of the 18 vocabulary values). The tag
    > needs its own column, so none of the current arm is reusable.
    > **Still the owner's call for phase 2**, now narrowed to: (a) hide the facet until the
    > tag exists — one-line change, deletes nothing; (b) delete it and rebuild from scratch
    > later; (c) ship it visible and matching nobody. *Recommendation: (a).* It stops
    > misleading people at launch without spending the rebuild twice.
11. **The sidebar logo's switched-off "Did you know" feature** ships 128 lines + facts on
    every page. On, or delete (the lab room keeps it). *Recommendation: delete.*
    (shell-primitives-06)
12. **The email queue exists because Resend's free tier is 100 mails/day.** A ~$20/month
    plan would retire roughly a third of the most intricate file in the project — after
    launch, when real volume is known. *Recommendation: revisit in a quiet month; not now.*
    (lib-core-config owner note)
13. **The bird glyphs as one cached sprite instead of 46 KB of code on 60 routes.**
    *Recommendation: worth doing in a quiet week with before/after screenshots; not
    urgent.* (bundle-build-10)
14. **xlsx** (roster importer) is stuck on an npm-abandoned version with advisories no bot
    can fix. If fresh spreadsheets still arrive: repoint at SheetJS's own CDN (one line).
    If the import is finished business: delete script + dep. *(dependency-diet-15)*
15. **"sanan's stuff" (132 MB, credentials inside) moves out of the repo folder**, and
    `recovery-codes.txt` to a password manager. *(root-docs-assets-11)*
16. **The legacy Collection taxonomy** (subject chips + species free-tags): every writer
    has pinned them empty since 2026-07-18; one SELECT tells whether any real row still
    carries values. Zero rows → ~60 lines of display/search plumbing go; nonzero → keep
    and record the count. *(member-surfaces-12)*
17. **Collection's filter row vs the sentence line.** Directory and both admin lists use
    the sentence-line chrome you picked in the lab; Collection still runs the older
    two-piece chrome, keeping both systems alive (~80 lines). *Recommendation: migrate
    Collection in a later UI session, then retire the old pieces — member-visible, so
    yours to schedule.* (shell-primitives owner note)
18. **Small taste calls**: date-order unification (recommend day-first), confirm() vs
    ConfirmDialog (recommend unify), one (i)-tooltip canon (recommend the signup one),
    CLAUDE.md self-contained vs pointer-to-docs for the duplicated tables, /donate delete
    vs proxy-redirect (recommend redirect), keep-or-not the letterhead lab variant's
    "keep in step" header fiction (recommend the one-line snapshot note), the survival-rule
    wording for CLAUDE.md (§7), and the close-out checklist wording (§7).

## 5. Not-findings (verified intentional — do not re-litigate)

The full lists live in each agent report; the ones that will tempt every future audit:
- **The comment mass is the product, not bloat.** proxy.ts (1.91 comment/code), the money
  path, the mail queue, prisma.ts, globals.css, button.tsx, the migrations folder — read
  block by block; they carry audit ids, owner quotes and measured numbers. The one
  systematic exception found: comments describing *deleted* code (fixed in phase 2).
- **email-queue.ts (1,061 lines) is not an outbox candidate** — no cron exists; every
  mechanism pins a dated incident.
- **The lab does not leak into shipped JS** — 0 bytes across all 73 non-lab routes,
  proven chunk-by-chunk. The lab-vs-shipped jscpd clones are design history by design.
- **The admin lib pairs (people/content/threads) are real client/server seams** (the
  `dns`-in-browser failure is documented in each banner); only the worklist pair lacks a
  client importer (merged in phase 4).
- **The three search endpoints stay three; the place trio stays three; the houses chain's
  860 lines are earned** (measured-DOM row balancing, not an SVG path builder's job).
- **The gazetteer stays cities500** (97 MB): trimming would silently drop villages, and
  this membership is precisely the crowd with someone in a small place.
- **The migrations folder stays as-is** (50 dated idempotent files = the only applied
  history; the demo DB drifts and is caught up by replaying exactly these).
- **The rule-test pattern (read source as text) is deliberate** — the unit gate runs bare
  node; the suite was mutation-tested 17 h before this audit.
- **konami-eggs, the dark-mode gauntlet, the /hoopoe playground, the stray-hair prank,
  the "12 birds not 14" plate** — owner-sanctioned delight, priced and kept.
- **`DEMO_CLOSED_PATHS`'s "unused" export is the honesty check** for proxy's mirror copy;
  **`SESSION_GAP_MIN`** documents a window enforced elsewhere; **`.puppeteerrc.cjs`**
  saves ~130 MB per Vercel build.
- **Zero commented-out code in shipped src** — all 16 tool candidates were prose.

## 6. Coverage map

- **Agents**: 13 territory readers (auth-edge, feed-posts, catchups, directory-profile,
  landing-mascot-avatars, admin-analytics, member-surfaces, shell-primitives,
  lib-core-config, lib-tests, lab, scripts-e2e-ci, root-docs-assets) + 5 lenses
  (bundle-build, dependency-diet, duplication, dead-code, data-layer). Every tracked file
  belonged to exactly one territory; each report's Coverage section names what was read
  fully vs sampled and why. Combined reading: ~100k lines.
- **Tools run** (raw output in `work/raw/`): cloc (4 cuts), knip ×3 (default,
  production, configured), madge ×2, jscpd ×2, tsc-unused, dependency-cruiser ×2 (TS-6
  pinned), grep suites (type-sludge, env-flags, todos, commented-out, use-client,
  comment-density), timed `next build` ×2, `next experimental-analyze` (decoded),
  per-route JS derivation (route-js.mjs). Every tool line is explained by a finding, a
  not-finding, or an agent's triage table. **type-coverage could not run on Node 26**
  (three attempts; grep substitute recorded) — the one tool gap, disclosed.
- **Verification**: ~30 orchestrator hand-checks during compilation (1 refutation);
  10 adversarial cluster-verifiers re-tested the dead-code, schema/auth, bundle-facts,
  Groups-residue, dedupe-evidence, pinned-file-safety, root-docs, scripts and
  member/admin clusters at HEAD (verdicts: `work/verify/`).
- **Consciously left out**: live-database queries (read-only audit; every DB-dependent
  claim is marked and carries the exact SQL for the fix session); running probes,
  Playwright, browsers (owner's machine-load rule); lab room interiors beyond
  classification depth (owner-protected history); `sanan's stuff/` contents.
- **Completeness rounds**: round 1 (critic-1.md) restored six dropped cross-territory
  items (above), confirmed every sampled raw-tool file is explained, confirmed src
  ownership was total except `forbidden.tsx` (born mid-audit; critic read it: clean),
  and applied by hand the micro-lenses no agent had named (nested ternaries, indentation,
  useMemo/useCallback hygiene, console.log) — low yield, now on record. Round 2 in
  critic-2.md.
- **Clean-room rewrites (goal-sloc order item 6): considered and rejected.** The four
  biggest files' size is predominantly justified (responsibility maps in their agent
  reports) and their test suites are pins, not full behavioural specs — a rewrite would
  be risk without payoff. The sanctioned structural moves are the hook/module splits in
  phases 4–6.
- **Known blind spots**: the lab CSS share is proven >0 but unmeasured (one scratch build
  measures it); LazyMotion's exact saving depends on the domMax census (verify pass);
  Photo rows referencing local collection images need one SELECT before those files go.

## 7. Process: keeping the repo lean after this audit

The owner's ask: stricter rules on what survives a session, and a "close it out"
convention. The mechanism, assembled from lib-tests-08, scripts-e2e-ci-01,
root-docs-assets-01/06/12 (wording ships in phase 4; CLAUDE.md edits get owner sign-off):

1. **A scripts-ledger gate inside `npm run check`**: a ~45-line test that fails, naming
   names, when a tracked script has no `scripts/README.md` line or a README line names a
   ghost. The lab registry gate proved this shape stops rot.
2. **A six-clause test-survival rule for CLAUDE.md** (full wording in lib-tests-08): a
   test names what it pins; has been seen to fail; text pins go through the shared kit
   with anti-vacuity guards; pin decisions, not styling; one home per rule; scratch probes
   die in their own session. Plus a ~25-line check.mjs arm enforcing clauses 1 and 3.
3. **A knip config** that makes `npx knip`'s unused-files list a true leftovers detector
   (today 124 false positives; after, a leftover shows up the day it is orphaned).
4. **An audit-archive convention**: `docs/audit-fix/<yyyy-mm>-<name>/`,
   applied to the closed bug audit now and to this audit when its fixes finish.
5. **The "close it out" checklist** (six lines, run only when the owner says so):
   scratch files deleted or ledgered; `git status` shows only named commits and others'
   WIP; check green (+visual if UI); progress.md entry staged with the work; this
   session's screenshots pruned (`temporary screenshots/` −14 days); nothing pushed
   unless asked.
6. **progress.md archives monthly** past ~2,000 lines; `temporary screenshots/` is
   bounded by the checklist; `.DS_Store` stays gitignored and gets swept in passing.
