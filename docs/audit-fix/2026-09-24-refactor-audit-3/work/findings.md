# Refactor audit 3 — orchestrator findings log

Running notes. Anything that later becomes a finding gets an ORCH-NN id here first.

## Baseline (measured 2026-09-24 ~01:05–01:20 IST, HEAD 70570bcd, 347 commits after audit 2's tree 72b5a1d)
- Tracked: 1,632 files · 44.90 MB (audit 2: 1,252 · 32.19 MB → +12.7 MB in three weeks).
  e2e/__screenshots__ 12.02 MB (24 files) · public/images 11.36 MB (142) · docs/audit-fix 4.16 MB (139)
  · src/app/lab 3.44 MB (201) · src/components 2.81 · src/lib 2.19 · public/lab 2.01 MB (15, tracked,
  deployed) · docs/planning 1.86 · docs/history 1.16 · src/app 0.96 · .claude 0.69 · scripts 0.58 ·
  root 0.52 · docs/spec 0.36 · prisma 0.30.
- Largest tracked: public/images/catchups/shaded-path.webp 3.19 MB, boulder-hill.webp 1.76, stone-benches.webp 1.53
  (Catch-up cover photographs in public/ — multi-MB static images; check how they are served),
  e2e/__screenshots__/desktop/landing.png 2.33 MB, login.png 1.52, birds.png 1.17.
- cloc (code lines, --vcs=git): 286,820 total (audit 2: 199,028). TS 122,795 (100,033) · MD 89,737
  (51,023) · JSON 43,491 (22,428) · JS 21,609 (17,662) · SQL 1,535 · Prisma 681 · CSS 518.
  By area: src/app/lab 49,548 TS + 18,632 JSON (12 fixture files) · src/components 41,014 TS ·
  src/lib 16,671 TS + 12,375 JS tests · src/app non-lab 13,672 TS · scripts 7,973 JS + 625 TS ·
  e2e 916 TS · docs/audit-fix 34,956 MD + 12,063 JSON + 4,936 text · docs/planning 18,345 MD ·
  docs/history 14,141 MD · .claude 15,195 MD (93 files) · docs/spec 4,208 MD.
- `npm run check`: green, 45.9 s (audit 2: 24.8 s — machine shared with a peer audit; re-time later),
  130 test files (102), 65 lab routes registered (47).
- knip (bare): 197 unused files = every page.lab.tsx (tool artefact). Repo config runs pending.
- tsc --noUnused*: 2 hits (scripts/dev/merge-cities.ts:22 CANONICAL_PLACE_ID; lab wall/_shapes.tsx:255 `g`).
- madge: 1 real cycle `app/(main)/collection/actions.ts ↔ lib/river-geometry.ts` (a lib importing an
  actions file). Orphans after framework-file filter: 5 — components/catchups/answer/answer-redirect.tsx,
  components/catchups/home/picture-picker-dialog.tsx, components/landing/showcase.tsx (owner kept, audit-2 Q1),
  lib/photo-suggest.ts (audit-2 known), types/next-auth.d.ts (declaration, not dead).
- jscpd whole (src+scripts+e2e incl. tests, min-tokens 50): 333 clones · 4,913 lines · 2.24 %. Comparable cuts pending.
- dependency-cruiser (ts6 via npx): 4 errors — 3× `server-only` unresolvable (resolver artefact, the
  package exists) + the river-geometry cycle; 13 orphan warnings (e2e specs, expected).
- Comment density: src/lib 0.83, collection 0.80, api 0.68, lab 0.23. photo-layout.ts 3.32 (160 code / 531 comment).
- Barrels: 2 (`src/lib/magazine/index.ts` NEW since audit 2; `components/guide/chapters/index.tsx`).

## Orchestrator leads (to verify / hand to lenses)
- ORCH-lead-1: public/images is 11.36 MB tracked and deployed; three Catch-up covers are 1.5–3.2 MB webp each.
- ORCH-lead-2: public/lab/valley (2.01 MB elevation PNGs) is tracked and deployed to production static.
- ORCH-lead-3: src/app/lab/catchups/_fixtures/magazine/*.json = 18.6k lines of JSON (wall-300 5,631; no-photos 3,637 ...).
- ORCH-lead-4: docs grew +38.7k MD lines in three weeks; docs/audit-fix/2026-09-03-refactor-audit-2/work still on disk (house rule: goes to history when the campaign closes; E and F are PARTIAL).
- ORCH-lead-5: `pg` is a devDependency but `@prisma/adapter-pg` needs it at runtime (works only because Vercel installs dev deps).
- ORCH-lead-6: `npm run check` 24.8 → 45.9 s. Test files 102 → 130. Re-time on a quiet machine.
- ORCH-lead-7: the river-geometry ↔ actions cycle.
- ORCH-lead-8: e2e baselines 12 MB, landing.png 2.33 MB.

## Build (2026-09-24 01:16–01:32, HEAD 70570bcd, IN the working tree, NOT a scratch worktree)
- 952.9 s wall (user 162 s, sys 242 s); load average 6.3 at start, 14.8–19.0 at end, 27.6 ten minutes later
  (six audit agents + the peer bug-audit session + my knip variants running alongside). Phases: config 11.5 s,
  compile 8.3 min, runAfterProductionCompile 2.4 s, TypeScript 6.8 min, "writing to filesystem cache" 4.9 min,
  109 static pages 9.3 s. Audit 2 (scratch worktree, load 10): 42.3 s = compile 20.3 + TS 14.6 + pages 0.7.
  **Not comparable.** Two confounders: load, and Next 16.3's `turbopackFileSystemCacheForBuild` (default on
  since 16.3.0 — a cold cache is written on the first build; Vercel restores `.next/cache` so warm builds are
  what production sees). TODO: warm re-run when quiet; record both.
- `experimental-analyze --output`: 4.6 min, 68 MB under `.next/diagnostics/analyze` (in place for L03).
- Next 16.3 writes `.next/diagnostics/route-bundle-stats.json` itself (136 KB) → `raw/route-bundle-stats.json`;
  `raw/route-js.txt` is the derived table (shipped median, floor from chunks common to every shipped route).
- `.next` total 4.7 G of which `.next/dev` (the peer's dev server) 3.8 G; `static` 12 M; `server` 149 M.
- ORCH-lead-9: with the FS cache on by default, a cold Vercel build pays the cache write; is `.next/cache`
  restored on Vercel (yes by default) — L03 to confirm from the docs and say whether the write is worth it.

## Orchestrator spot-checks per report (claims read at HEAD; "confirmed" = I reproduced the number)
### tracked-weight (L08) — landed 2026-09-24 02:13, 936 lines, 11 findings (T1 4 · T2 5 · T3 1 · T4 1)
- 01 covers: `sips` → boulder-hill 4608×2303 (1,840,694 B), shaded-path 4608×2306 (3,346,288 B), stone-benches
  3456×1716 (1,601,734 B); catalogue at `src/lib/catchup-pictures.ts:197-206`. **Confirmed** (one of the three is
  3456 px, not 4608 — a detail to carry into the finding).
- 02 audit-2 `work/`: `du` 3.8 M, 122 files. **Confirmed.** Citation count: my grep finds 3 *files* outside the
  folder naming `2026-09-03-refactor-audit-2/work` (the agent says 25 citations — occurrences, presumably; the
  verifier should count both).
- 05 `e2e/.shots`: 506 MB, 908 files; `shots:clean` appears only in `package.json` and CLAUDE.md, never in
  `check.mjs`. **Confirmed.**
- 09 `scripts/dev/.magazine`: 225 MB on disk, gitignored (`scripts/dev/.*/`), holds rendered PNGs. **Confirmed**
  as a disk fact; the retention question is the owner's.

### collection-media (T04) — landed 02:20, 837 lines, 24 findings (T1 7 · T2 13 · T3 4), 15 not-findings
- 05 the cycle: `src/lib/river-geometry.ts:43` is `import type { PhotoShapeIndex } from "@/app/(main)/collection/actions"`
  and `actions.ts:66` imports `ratioOf` back. **Confirmed** — type-only, so a runtime no-op; moving the type ends it.
- 01 the old upward walk: `topCursor` state at `collection-client.tsx:147`, `movingUp` ref at `:656`, `loadNewer` referenced
  at `:146/:422`. **Anchors confirmed**; the "behind early returns" claim is for the verifier.
- 15 the 2026-09-07 drops ran: live `Photo` has no `area`/`freeTags`, `Image` no `greyscale`, `OutboundEmail` no
  `bounceKind`; `schema.prisma` still says "still in both databases until the owner runs" at :305, :370, :523, :679.
  **Confirmed** (fresh-code-07 found the same independently). Audit 2's board line "the five SQL files are written
  and UNRUN" is therefore stale too.
- Bugs handed on (07 quota follows the wrong half; 09 add-to-Collection counts both halves, no admin exemption): NOT
  simplification — route to `docs/planning/bugs.md` / the peer bug audit in the report's "outside simplification" list.

### fresh-code (L05) — landed 02:27, 22 findings (T1 9 · T2 9 · T3 3 · T4 1), per-file verdicts for all 245 added files
- 01 picker orphan: `picture-picker-dialog.tsx` has no importer in `src/` (only two rule tests name its path);
  `settings-surface.tsx:281` still emits `{ shape: "picture" }`. **Confirmed** (catchups-ui-01 agrees).
- 02 Spotify trio: `resolveSpotify` still imported at `catchups/actions.ts:88`; live `CatchupEntry` carries
  `songUrl, songTitle, songArt`. **Confirmed** as present; "no client sends songUrl" is for the verifier.
- 07 schema drift comments ×4. **Confirmed** (see collection-media-15).

### lab-catchups (T15) — landed 02:27, 15 findings (T1 5 · T2 7 · T3 3)
- 01 fixtures: 12 JSON files, 18,632 lines (cloc), 736,386 tracked bytes. **Confirmed.**
- 04 `catchups-core.ts:25` = `import { randomUUID } from "node:crypto"`; `lab/catchups/capsule/_mark.tsx` and
  `sketches/_home.tsx` are `"use client"` importers. **Confirmed** (the 429 KB polyfill figure is for the verifier).
- 02 `.next/server/app/lab/catchups/magazine/page.js.nft.json` lists **156** `scripts/dev/.exports` paths. **Confirmed exactly.**
- 09 `src/app/lab/actions.ts:28` gates on `NODE_ENV !== "development"` only — dev-server-only exposure; hand to the bug audit as a note.

### catchups-ui (T02) — landed 02:30, 1,433 lines, 35 findings (T1 7 · T2 23 · T3 4 · T4 1), 6 owner decisions
- 01 = fresh-code-01 (two lenses, different methods). **Confirmed.**
- 02 invite token still serialised to every visitor: `catchups/[catchupId]/(home)/page.tsx:414` and
  `components/catchups/home/types.ts:84`. **Confirmed** that it reaches the client type; "no screen reads it" for the verifier.
- Vote/voice/capsule unreachable from the UI: consistent with `CatchupPromptOption` 0 rows and T15's owner question 4.

### catchups-lib (T03) — landed 02:40, 970 lines, 21 findings (T1 3 · T2 10 · T3 5 · T4 3), 7 owner decisions
- 01 `closeAndPublish` re-implements the clock: the comment at `catchups/actions.ts:1405` says "exactly as the clock's own
  `applyEditionAction` does it". **Confirmed.**
- 02 the per-page advance: `(main)/layout.tsx:7` imports `advanceDueCatchups`, called at `:102` on every signed-in page,
  with a long comment (`:40-111`) defending it as deliberate. **Confirmed** that it runs per page; the "three round trips,
  almost always nothing due" claim is for the verifier, and the layout comment's reasoning must be quoted in the finding
  (the fix must keep what the comment defends).
- Correction accepted: `src/lib/magazine/index.ts` has 1 re-export line and 11 real exports — the barrel census
  (`raw/barrels.txt`) counts filenames; index.ts is the engine's search module, not a barrel. Brief-common §5f is wrong on
  that point; the compilation says so.
- Three bug-lens hand-offs (advance before membership check; batch-year correction leaves both groups; export script
  never creates `audio/`) go to the "outside simplification" list.
- Wave 1 complete: six of six reports on disk, all spot-checked.

## Warm build + check (2026-09-24 07:49–07:52, HEAD 70570bcd)
- **Warm build: 68.2 s wall** (load 2.9 at start, 7.5 at end as agents launched): config 0.5 s, **compile 18.5 s**
  (audit 2: 20.3), runAfterProductionCompile 1.2 s, **filesystem cache compaction 12.1 s** (new in Next 16.3 —
  `turbopackFileSystemCacheForBuild` default-on), **TypeScript 20.6 s** (audit 2: 14.6 — +6 s), 109 static pages 6.0 s
  (audit 2: 105 pages in 0.7 s). 141 route-table lines. **This is the baseline** (raw/build-warm.txt); the 01:16
  build (952.9 s, load 15–27, cold cache) is recorded but not used.
- `npm run check`: green, **103.9 s** under load 10–18 (six agents launched at the same second) — NOT a baseline.
  The 01:07 run (45.9 s) was also shared. A quiet run is owed at close; T17 times each gate alone.

### bundle-build (L03) — report 888 lines, landed 02:54 (before the cutoff), 11 findings
- 01 `public/` in every server trace: `src/lib/storage.ts:137,139,224` join `process.cwd()` + `"public"` + a dynamic
  key; the fresh `/feed` trace lists **771 files, 162 under `public/`**. **Confirmed exactly.**
- 03 root `src/app/error.tsx:3` imports `Button` from `@/components/ui/button`. **Confirmed.**
- 05 `.next/server`: **1,020 `.map` files, 106.5 MB of 149 MB**. **Confirmed** (agent said 108 MB — rounding/binary MB).
- Stylesheet: `3b2mor7o303i_.css` = **171,870 B** on every route; the lab's own sheet 169,614 B. **Confirmed exactly.**
- Second builds requested: (a) source maps off, (b) lab-free, (c) Sentry chunk collapse. **Not run, by decision:**
  (a)/(c) need a `next.config.ts` edit, which this audit may not make in a tree the peer's dev server watches (a config
  change restarts it); the fix session measures them paired, and the findings carry the protocol. (b) is answerable
  with `DEMO_MODE=1` (the demo build is exactly the lab-free build), but the owner's 2026-09-08 decision keeps the
  lab in his own build and the artefact-derived share (bundle-build-09) states the cost; a refresh is not worth a
  build + a restore build over the verifiers' `.next`.

## Merge map (cross-report overlaps, as reports land) — the compilation's skeleton
| Programme | Rows | Ruling |
|---|---|---|
| **M-picker** the Catch-up picture picker has no door | catchups-ui-01, fresh-code-01, catchups-ui-30, bundle-build-04 (+tracked-weight-01 picker note) | **Regression, restore — not dead code.** `docs/spec/catchups.md` §6 "Changing it (`setCatchupPicture`)" and §3 table line 210 spec the capability. fresh-code-01's "delete" option is refuted by the spec. Goes to the bug list with a simplification guard: the dead-code phase must NOT delete `picture-picker-dialog.tsx` or `setCatchupPicture`. When mounted, it must use `next/image` or small copies (bundle-build-04 / tracked-weight-01). |
| **M-invite** the Keeper's invite link has no door | catchups-ui-02 | **Regression** (spec §7.6 describes the join route; the copy-link control died with `people-panel.tsx` in `b94677ce`). Owner question, default **restore**. |
| **M-song** Spotify/song pipeline | fresh-code-02, catchups-lib-05, catchups-ui-07, catchups-ui-08 | Spec §16 "Phase 11, the rest" already plans the removal (code + 4 columns), waiting on a DDL release that is the owner's. Code first is always safe (stop reading/writing before the drop) → **autonomous code removal**; the column drop is a gate-2 hard stop. Audit 2 D3's "leave it alone" is superseded by the rework spec written after it. |
| **M-magazine** the engine in `src/lib` | catchups-lib-16, catchups-lib-17, fresh-code-03, bundle-build-06, lab-catchups-01/02/03 | **Do not relocate.** The rework handover's board has `M2+ Magazine build | OPEN` — four planned phases that ship it from the app, so `src/lib` is its destination, not a mistake. It ships 0 bytes to members. Keep the real wins: fixtures → builders (lab-catchups-01), the export reader out of the room graph (-02), the corpus beside the engine (-03), trim unused surface (catchups-lib-16). One owner question: is the magazine still wanted (default: yes, as planned). |
| **M-cycle** the one import cycle | collection-media-05, fresh-code-13 | Same fix: `PhotoShapeIndex` → `collection-shape.ts`. Merge. |
| **M-p2021** pre-migration guards | fresh-code-04, catchups-ui-11, catchups-ui-12, lab-catchups-10 | **fresh-code-04 REFUTED by the orchestrator (07:59): the guard stays.** It is a deploy-ordering belt, not a pre-migration leftover: deploys ship on push while DDL is run by hand (CLAUDE.md), so a future `Catchup*` table whose migration lands after a push degrades to `AlmostReady` instead of a 500; `isMissingTable` matches any P2021/42P01. Spec §7.7 describes it and the rework handover's phase 2 kept it on purpose ("almost-ready.tsx ... SURVIVE, with the reason in each docblock"). fresh-code-04's own mind-changer ("a future Catch-ups table") holds: voice/vote/capsule and M2+ are open. Surviving rows: catchups-ui-11 (the one site where it cannot fire), catchups-ui-12 (load `AlmostReady` only when shown), lab-catchups-10 (the lab table's guard — optional). Not-finding for the report §5. |
| **M-drops-ran** 2026-09-07/08 migrations ran; comments say not | collection-media-15, fresh-code-07 | Merge. Also stale: audit 2 fix-prompt board line "the five SQL files are written and UNRUN". |
| **M-clock** Keeper close/open re-implement the engine | catchups-lib-01, catchups-ui-06 | Merge; one pin in `time-capsule-rule.test.mjs` moves. |
| **M-advance** per-page Catch-up advance | catchups-lib-02, catchups-lib-03, catchups-ui-15 | One programme (query floor). Quote the layout's own defence (`(main)/layout.tsx:40-111`) in the brief. |
| **M-vocab** audit 2 `catchups-02` | catchups-lib-09, catchups-ui-20, lab-catchups-04 | Merge, carrying lab-catchups-04's warning: a naive client import of `catchups-core.ts` ships the 429 KB `node:crypto` polyfill. `randomUUID` → `globalThis.crypto.randomUUID()` first. |
| **M-pending** always-true `accepted` / pending machinery | catchups-lib-04, catchups-ui-21 | Merge; the column drop is gate 2. |
| **M-states** states nothing produces | catchups-lib-07, catchups-ui-34 | Merge. |
| **M-labproto** lab prototypes beside what they became | fresh-code-06, lab-catchups-05, lab-catchups owner Q1/Q2, catchups-ui (settings room claim) | Owner question (default keep); autonomous half = point lab copies at shipped primitives (the `/lab/comments` pattern). |
| **M-covers** the three 1.6–3.3 MB covers | tracked-weight-01, bundle-build-04 | Merge: re-export at ≤3840 px AND draw thumbnails through the optimiser. |
| **M-deadexports** | catchups-lib-12, catchups-ui-23, fresh-code-12, collection-media-13, lab-catchups-06 | Class row; L01 (dead-code) consolidates. |
| **M-comments** stale comments | catchups-lib-15, catchups-ui-33, collection-media-23, fresh-code-09/10, lab-catchups-13/14 | Phase F-style hygiene, one pass, last. |
| **M-testweight** | fresh-code-08, lab-catchups-03 (+ tracked-weight lead) | T14 times it. |

## Rulings against the spec (orchestrator, 2026-09-24 07:54)
- `photo-suggest.ts` is NOT an orphan: `scripts/dev/tag-photos-{pick,apply}.mjs` and `hand-run-passes.test.mjs`
  import it; madge walks only `src/`. collection-media's not-finding stands; madge's line is cleared.

## Audit 2's open rows (for the carry-over phase; state comes from the territory reports)
E5 rest (bootstrap/dev-login/which-Chrome; 11 bare dotenv `config()` banners) → T17 · E6 rest (lib-tests-05 pre-filter
+ count guard) → T14 · E7b (auth-edge-02 Turnstile sentinel map; needs `TURNSTILE_DEV_CHALLENGE=1` + dev restart —
unverifiable in an audit) → T07 · E8 ("one hoopoe at a time" primitive) → T10 · E11 tails: mascot → T10, UI-kit → T08,
collection → T04 (reported) · E12 `catchups-02` → M-vocab · F: docs-17..21 → T19, scripts-e2e-ci-12 → T20/T17.
Plan: this audit's fix-prompt absorbs whatever is still real as its own phase, so the owner has ONE campaign; audit 2's
fix-prompt gets its closing banner in that phase (not by this audit — outside its write set), and its `work/` goes to
history then (tracked-weight-02). This audit's closing commit corrects audit 2's stale README row ("not started").

## Correction to my own brief (07:55)
- brief-common §3 said "TypeScript 7 (the native compiler)". **Wrong**: `package.json` has `"typescript": "^5"`,
  installed 5.9.3. I inferred 7 from dependency-cruiser's "missing-typescript-transpiler" warning, which was about
  the npx cache having no TypeScript, not the repo. Corrected in the brief for agents launched after 07:55; agents
  launched before (feed, directory, admin, common, lab-rest, auth, and all of wave 1) read the wrong line — check
  their reports for any claim resting on "TS 7" and strike it.

## Owner-question merge notes (from the seven landed reports; consolidate at compile)
- **Covers size conflict**: tracked-weight Q1 says re-export at 3,840 px (the optimiser's top rung); bundle-build Q1
  says 2,560 px. Ruling: **2,560** — the widest shipped request is 1,180 CSS px ×2 = 2,360 device px; Next picks the
  next deviceSize (3,840) and serves min(source, 3,840), so a 3,840 source makes retina laptops download 3,840-wide
  bytes they cannot show; 2,560 caps it with margin. Invisible either way. Keep originals out of the repo.
- **Three waiting features** (voice / vote / capsule): catchups-ui Q2, catchups-lib Q2, fresh-code B/C/D,
  lab-catchups Q4, collection-media B → ONE question. Defaults differ: fresh-code proposes "wait until end of
  October, then shelve"; the others "keep waiting". Take **keep waiting, no deadline** (least surprising; he asked
  for them on 09-14 and the cost is weight only).
- **Magazine**: catchups-lib Q1 (leave), fresh-code F (treat as experiment → move to lab), lab-catchups Q3 (keep +
  shrink fixtures). The rework board's `M2+ Magazine build | OPEN` decides: default **keep in src/lib, shrink the
  fixtures**. fresh-code's default is overruled by the board.
- **Lab rooms that became screens**: fresh-code E (default: point rooms at live screens), lab-catchups Q1 (default
  keep all three), Q2 (default keep settings room as the record), collection-media C (default leave scrub room).
  Two defaults point opposite ways. Take **keep as records** (the lab is owner-approved history; a mirror of
  the live screen is a different room than the one he approved) and fix the false "cannot drift" comment;
  "point at live" stays an option.
- **Song code**: catchups-ui Q6 (default: code now) vs catchups-lib Q3 (default: leave, per his audit-2 words).
  Spec §16 Phase 11 plans the removal of both code and columns; his "leave it alone" (audit 2 D3) handed it to the
  rework, whose spec now schedules it. Take **code now, columns at his release**; quote both.
- **Picture row**: fresh-code A asks fix-or-remove; spec §6 says the Keeper can change it → **fix** (regression);
  fold into a notice rather than a question unless compile finds the list short.
- Standalone Catch-ups questions kept: invite link (default restore), read mark (keep), end-of-answering button
  (remove), empty fields (code now, drops at release), Keeper spelling (fix comments only), hidden group layer
  (leave), Monthly/Every month (settings' words), LabRoomState button (copy choices into the registry), swipe
  tester (keep), one answer box (as he decided 09-09 — likely a notice, not a question).
- Others: campaign-close rule for design folders (tracked-weight Q2, default adopt), lab-only pictures (Q3, default
  gather in `public/lab/`), baseline backdrop hide (Q4, default hide the faint backdrop), printed magazines on disk
  (Q5, default keep latest), sweep script (collection-media A, delete), lab in prod build (bundle Q2, keep —
  a notice, his decision stands), bird sprite and Phosphor weights (bundle Q3/Q4, carried, not urgent).

### admin-analytics (T06) — landed ~08:30, 420 lines, 24 findings (T1 6 · T2 13 · T3 2 · T4 3), 4 owner Qs
- 02 `comments-section.tsx:17` statically imports `ModerationDialog` (4 other files import it). **Confirmed.**
- 06 `admin-counts.tsx` has no `photos` at all (claim: compares 4 of 5 counts, skips photos). **Consistent**; bug-list item.
- 04 `MetricSnapshot_source_metric_day_idx` present live, 0 scans. **Confirmed.** Merge with T18's index row.
- Charter leads resolved: lastSeen UPDATE count is pre-gate history (gate shipped 09-05); 6 of 7 Visit shapes are dead code
  versions; the 55 ms statement is the nightly snapshot. Bugs to the list: 06, 14 (Hide the post settles the report anyway).

### auth-onboarding-settings (T07) — landed ~08:45, 1,216 lines, 23 findings (T1 9 · T2 12 · T3 2), 2 owner Qs
- 01 `auth.ts:357-359` write `token.role/batchType/batchYear`; zero reads of those token claims in `src/`. **Confirmed.**
- 02 `src/lib/demo.ts` has 0 imports; Next 16 `proxy.md:255` "Proxy defaults to using the Node.js runtime". **Confirmed.**
  This RE-OPENS audit 1's settled `DEMO_CLOSED_PATHS` honesty check on NEW evidence (the edge premise is false).
  Demo security layer → **high-scrutiny row**: its verifier must re-read `security-regressions.test.mjs` and the demo spec.
- The three User session-row statement shapes = one caller across three eras of its select → not-finding (my lead was wrong).
- Audit-2 carry-overs: E7b still open, smaller (login differs by design since 09-11); auth-edge-09/-10/-12/-13 fell out of
  audit 2's plan and are re-issued here as -16/-17/-21.

### feed-posts-comments (T01) — landed ~08:50, 1,070 lines, 24 findings (T1 8 · T2 9 · T3 5 · T4 2), 3 owner Qs
- 01 `(main)/feed/page.tsx` references no initial page (0 hits for initialPosts/firstPage/getFeed) → first page is
  client-fetched after arrival. **Consistent**; the verifier confirms the 2 requests / 3 queries.
- 02 `targetBatches`: read in 6 files (feed actions, post-visibility, db-text, letters page, rail-viewer, guide copy),
  set by no component. **Consistent**; owner Q A (default remove after a live SELECT).
- 03-class `PostCard` `variant: "card" | "sheet"` at `post-card.tsx:172/377`. Anchor confirmed.
- Leads refuted (not-findings): one heart path; comment-action files are the right split; second comment look gone;
  Like seq scans normal; link-preview pair justified (SSRF); the three Post shapes are one query + dropped columns.

### lab-rest (T16) — landed ~09:00, 16 findings (T1 7 · T2 5 · T4 4), 8 owner Qs (default: nothing removed)
- 02 `lab/crop/page.lab.tsx:22` "Throwaway. Delete this room, public/lab/crop/ and its registry row" while
  `lab/collection/_archive.ts` reads `lab/crop` (2 refs). **Confirmed** — the header is a trap.
- 05 `as object` casts: 12 shipped / 26 lab (matches raw/type-sludge). The "all on SpringPress" attribution is not
  same-line greppable → verifier.
- 11 66 lab font files / ~2.8 MB per build — **matches bundle-build's independent count** (lab 66 / 2,818 KB).
- Corrections to other lenses accepted: `landing.jpeg` is shipped (app-shell + hero-photo); `edge-light.ts` is shared with
  `generate-icons.mjs` (not lab-only); the centroid room's `readFileSync` is needed. Bug note: `/lab/constructor` 500s.

### common-primitives (T08) — landed ~09:05, 580 lines, 16 findings (T1 8 · T2 6 · T3 2), 2 owner Qs
- 02 one non-lab `@base-ui/react/tooltip` importer left (the three-machines claim). **Consistent.** MERGE **M-tooltip**:
  common-primitives-02 + bundle-build-07 + auth-onboarding-settings-05 = audit 2's Q7 answer ("(a) one machine, look
  unchanged") never carried out. Do ONE of the two shapes (Popover everywhere vs defer Tooltip), not both.
- 06 `catchups/create/cadence-control.tsx:27` beside `common/segmented-pills.tsx:70`. Anchors **confirmed**.
- 03 SpringPress casts = lab-rest-05 → MERGE **M-springpress**. 01 matchMedia: 21 non-lab lines (agent: nine subscriptions).
- Owner B (button press jumps since Tailwind v4 — `scale` missing from transition lists) is a BUG → bug list.
- Orchestrator gap flagged: audit-2 G2/Q7, row #13, fresh-code-11, shell-primitives-14 fell through with no ledger line.

### directory-profile (T05) — landed ~09:05, 975 lines, 17 findings (T1 5 · T2 9 · T3 3), 2 owner Qs
- 01 7 `router.refresh()` in `src/components/profile`. **Consistent** (double render after revalidatePath).
- 02 `letterhead-profile.tsx:846` comment "<img> pointed at the R2 original". **Consistent.**
- Lead correction accepted: the two Post COUNTs are `CelebrationSignals` on /feed and /welcome (not the profile);
  its "profile complete" moment needs retired `User.bio` and cannot fire → mascot lens / owner. No N+1 on the directory.
- Owner A (profile admin buttons = second copy of the admin person page) MERGES with admin-analytics OD1 → **M-admintools**.

## ORCH-01 — the September session history was overwritten (found 2026-09-27 at close-out)
- `9ef7d821` (2026-09-27, "feat(catchups): a batch Catch-up runs every three months") changed
  `docs/history/progress-2026-09.md` by **+15 / −8,363 lines**: it replaced the month's full record (~587 KB) with its
  own entry. Every later commit did the same (`81bb7d11` +19/−15, `1b6e5fd3` +11/−21, `bda5571c` +10/−11, `60b8fc16`
  +8/−10), so the file now holds one entry (703 B) while `progress.md` still indexes every September session.
- Recoverable: `git show 9ef7d821^:docs/history/progress-2026-09.md`, then re-add the five entries written since.
  Not fixed by this audit (other sessions' commits; the owner decides). Reported to the owner at close-out.
- **Test gap (a finding for the docs/tests lens):** `scripts/qa/progress-log.test.mjs` checks history → index only
  ("every archived entry is indexed"). An index → history check (every `- YYYY-MM-DD …` line in a month section has its
  `## ` heading in that month's file) would have failed this commit at `npm run check`.
