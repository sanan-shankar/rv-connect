# Refactor audit 2 — report

Audit-only session, 2026-09-03, tree at `72b5a1d`. Working files: `work/` (task plan, findings, common brief, raw tool
output, the agent reports under `agents/`, adversarial verdicts under `verify/`). This file is the deliverable; the
agent reports are its appendices and carry the per-finding evidence, line ranges, steps, risks and gates.

## 1. Executive summary

### 1a. Baseline (measured 2026-09-03 16:40–17:10 IST, tree at 72b5a1d, 146 commits after audit 1 closed)

| Metric | Value | Tool |
|---|---|---|
| Tracked files / weight | 1,252 files · 32.19 MB (e2e baselines 13.03 · src 6.83 · public 6.49 · docs 3.27 · root 1.15, of which progress.md 0.60 · .claude 0.69 · scripts 0.51 · prisma 0.20) | git ls-files, stat |
| Code lines, whole repo | 199,028 (TS 100,033 · MD 51,023 · JSON 22,428 · JS 17,662 · SQL 968 · Prisma 632 · CSS 428) + 50,053 comment · 23,095 blank | cloc 2.06 `--vcs=git` |
| src/app non-lab / lab | 13,636 (138 files, 70 route dirs) / 34,426 (112 files, 48 rooms) | cloc |
| src/components / src/lib | 38,319 TS in 279 files (+558 JS tests) / 12,215 TS in 138 files + 9,297 JS in 87 test files | cloc |
| scripts · e2e · prisma · docs | 7,360 JS + 1,414 TS · 824 TS · 632 schema + 968 SQL (65 migrations) · 40,581 MD | cloc |
| `npm run check` | green: 24.8 s, 102 test files (1,004 tests, 5.0 s), 47 lab routes, advisories clean, 74 security items tracked | check.mjs |
| `next build` (cold, scratch worktree, load 10) | 42.3 s wall: compile 20.3 s · TypeScript 14.6 s · 105 static pages 0.7 s · Sentry hook 0.6 s | raw/build.txt |
| First-load JS (raw) | 100 routes (52 shipped). Shipped median **1,069 KB**; floor 1,055 KB (14 root chunks 621 KB + (main) shell 434 KB); /profile/[id] 1,258 · /directory 1,231 · /feed 1,225 · /welcome 1,190; landing 899, login 907, policies 630 | route-bundle-stats.json |
| CSS | one 233 KB raw / 33.5 KB gz stylesheet on all 100 routes (+9 KB on all; +23 KB and +6 KB on one lab room each) | .next/static/chunks |
| Lab's share (measured by a lab-free build) | build 30.0 s (−12.3 s); compile 13.6 s; TypeScript 10.2 s; 62 pages; stylesheet 160 KB / 24.7 KB gz (−73 KB / −8.8 KB gz); JS per route unchanged | raw/build-nolab-run3.txt |
| Dependencies | 33 runtime + 18 dev = 51; 5 overrides; package-lock 541 KB | package.json |
| knip (repo config `scripts/qa/knip.jsonc`) | 7 unused files · 70 unused exports (48 in lab) · 11 types · 1 flagged dep (false positive) | knip 6 |
| Duplication (src+scripts, tests excluded) | 232 clones · 2,888 lines · **1.82 %** (audit-1 close: 174 · 2,702 · 1.47 %); 4 clones in e2e, 2 in tests | jscpd 5, `--min-tokens 50 --min-lines 5` |
| Import cycles / depcruise violations | 0 real (40 inside the gitignored generated client) / 0 | madge, dependency-cruiser 16 |
| tsc unused locals/params | 4 | tsc |
| Type sludge (non-lab, non-generated src) | `any` 13 · `as unknown as` 13 · eslint-disable 51 (audit-1 close 7 / 11 / 47) · `as object` casts 12 shipped + 26 lab | grep |
| "use client" / dynamic-import sites (non-lab) | 202 of 285 / 52 | grep |
| Barrels · env keys · TODOs · commented-out code · console.log | 1 · 44 · 5 (one deliberate cluster) · 0 (29 regex hits, all prose) · 0 (4 hits, all in comments) | grep + agent triage |
| type-coverage | crashes on Node 26 (second audit running); grep substitute | — |

Every number above is dated 2026-09-03. The `root-assets` lens re-measured the tree a day later and
got 33.76 MB tracked, the difference being one day of visual baselines — which is itself its finding
(§4 #8). Where §1c and §4 quote proportions of the tracked repo, they use its later figure.

Tool notes: `scc` is not on npm (cloc used, same convention as audit 1); `next experimental-analyze -o` produced
the per-route chunk→module data the bundle lens decoded; the first eslint-disable grep counted 46 Prisma-generated
headers and was corrected; Tailwind's unscoped source scan turned a moved-aside build cache into a failed build
during this audit (ORCH-03's evidence).

### 1b. What the diet is worth

Projected in the units audit 1's close-out said matter here — dependencies, lockfile entries, bytes on
disk, bundle bytes, CSS bytes, build seconds, database objects — with SLOC reported rather than led with,
because in this codebase every constant is argued for in a comment and de-duplication comes out roughly
line-neutral.

| Unit | Now | After the autonomous work | After the owner's calls as well |
|---|---|---|---|
| Dependencies | 33 runtime + 18 dev | **32 + 17** (`world-atlas` is a runtime dep; `shadcn` is a dev one, and both are installed on every Vercel build) | 32 + 17 |
| Lockfile entries | 1,082 | **847** (−235: 234 with `shadcn`, 1 with `world-atlas`) | 847 |
| `node_modules` | — | **−74 MB apparent / −87 MB allocated** (`shadcn` 65.8 + `world-atlas` 7.8) | same |
| CSS on every route | 238,434 B raw / 34,274 B gz | **164,037 B / 25,289 B** (−31 %) | same |
| First-load JS, public routes | /login 907 KB, / 899 KB | **~750 KB, ~742 KB** (the popover stack, if all of it goes) | −44 KB more if the birds become a sprite |
| First-load JS, member routes | median 1,069 KB | **~1,030 KB**, and route-dependent (guide −11.3 KB on 39 routes; hoopoe −28.7 KB but only on the 23–28 that do not keep it another way; search pill −8.5 KB on the 10 where its chunk is isolated) | **~985 KB** if the birds become a sprite (−44.4 KB on 39) |
| `/directory` | 1,231 KB | **~1,100 KB** (d3 on demand, profession hints) | same |
| `/welcome` | 1,190 KB | **~1,060 KB** (wizard steps) | same |
| Production build | 42.3 s | 42.3 s | **~30 s** if the lab leaves the production build |
| Deployed artifact | — | — | **−9.7 MB** with the lab out |
| Queries per authenticated page | 7 before the page's own | **4–5** | same |
| Database objects | — | **−8 unused indexes, −4 write-only columns** | −3 Groups, −2 legacy + 2 GIN, −3 Spotify, −1 greyscale |
| Clones (jscpd) | 232 · 1.82 % | **~120 · ~1.0 %** | same |
| Tracked bytes | 32.19 MB | **−831 KB** of orphans (421 KB `src`/lab leftovers + 410 KB of never-referenced `public/` binaries) | −1.8 MB more if audit 1's `work/` is archived to a pointer |
| Shipped SLOC | — | ~−1,400 | **~−3,900** with the switched-off subsystems |

The SLOC row is the least interesting number in the table and the easiest to inflate; it is here because
the prompt asked for honest floor arithmetic. Roughly 1,400 lines come out with no decision needed
(dead files, orphan exports, dead tour tooling, stale comment blocks, kit adoption). Getting past that
needs the owner to retire things that work but nobody reaches: the hidden feed filters, the landing
showcase family, the Spotify pipeline, the second photo-review UI, the legacy tag columns. Below about
−4,000 there is nothing left but features, and that is a product decision, not an engineering one.

### 1c. The five biggest wins, in plain language

1. **Every member downloads the design lab's stylesheet.** One stylesheet serves all 100 routes, and
   74 KB of it — about a third — exists only because a file under `/lab` uses those classes. It is
   render-blocking, and it is on the signed-out landing page. Three independent measurements agree on
   the number. Nothing has to be deleted: the lab gets its own stylesheet and keeps working at its own
   URL. **−74,397 bytes raw and roughly −8.8 KB gzipped, on every page anyone ever loads.**
2. **Your sign-in pages carry a tooltip they never draw.** A floating-label field imports an info
   tooltip, which imports a whole popover library, so `/login`, `/signup`, `/forgot-password` and the
   landing page each carry it for a hint only one screen in the app ever shows. I measured this
   directly rather than take it on report: `/login` carries **five chunks totalling 161,106 bytes**
   that `/verify-email` does not, and every one of them contains `useFloating` — the tooltip itself
   (17,014 B) plus the base-ui popover stack it drags behind it (144,092 B). `/verify-email` uses the
   same `Button` and carries none of them, so the popover is the cause. These are the first pages a
   new alumnus sees, on whatever connection they have. **The largest single lever found on a public
   route** — though the fix session must confirm nothing else on those pages needs the floating stack
   before claiming all 161 KB.
3. **Two `node_modules` residents are paying no rent.** `shadcn` is installed for forty lines of CSS
   and brings **234 packages with it — 21.6 % of the entire lockfile** — including a mock-server
   framework, a TypeScript compiler and an MCP SDK this project has no use for. I recomputed that
   myself against npm's own resolution rules and it matches the report's count exactly; the disk
   figure does not, so use mine: **66 MB of files, 79 MB as the disk actually allocates them.**
   `world-atlas` is a *production* dependency (7.8 MB) kept alive by exactly one lab file, which still
   does the thing the shipped map was fixed to stop doing. Both are installed on every Vercel build.
   Inline the CSS, change one lab import, and they leave: **−242 packages and about −74 MB.**
4. **Every authenticated page runs seven queries before its own.** An `UPDATE` that changes nothing
   fourteen minutes in every fifteen, two Catch-up joins that could be one, the unread-notification
   count asked three times per feed load, and five routes that read the same row twice because
   `generateMetadata` and the page each fetch it. All five are ordinary fixes with a known idiom.
5. **Your quality tooling has been lying to you in two specific ways.** Every "mobile" screenshot of a
   signed-in page — which is every interesting surface, because they are behind a login — has been
   taken with desktop pointer semantics. `screenshot.mjs` sets `deviceScaleFactor: 2, isMobile: true,
   hasTouch: true`; `screenshot-auth.mjs`, `verify-shot.mjs` and `theme-shots.mjs` set a bare
   390×844 and nothing else. I checked all five scripts and both figures myself. So `(hover: hover)`
   matches when it should not and `(pointer: coarse)` does not match when it should, and controls
   appear in "mobile" shots that a phone never draws. The blast radius is narrower than the finding
   feared — the shipped stylesheet has only 7 `@media (hover:` blocks against 169 bare `:hover`
   selectors — but those blocks are exactly where the touch-only affordances live. And separately,
   `npm run visual:report`, the tool behind OPERATIONS' one rule about never rebaselining blind, has
   never worked on this machine: the HTML reporter is registered only under `process.env.CI`, while
   the command reads a folder nothing local ever writes. Both are one-line fixes, and both have been
   shaping design decisions for weeks.

### 1d. What the audit changed (the one exception to audit-only)

**ORCH-04**, found independently by three lenses, was a live divergence between behaviour and a
published legal document: `snapshot.yml` deleted notifications at 30 days every night while
`retention.ts`, `docs/SECURITY.md` and the privacy page all promised a year. The bug-audit M55 fix had
seen the same split and closed it the wrong way round — it raised the script's default to 365 and left
the `--days 30` flag in the workflow, so the override outlived its own repair.

Escalated to the owner mid-audit. His answer: *"30 days is good. you can update the privacy policy to
30 days for notifications."* So it closed in his direction — **the behaviour was right and the
documents were wrong** — and shipped as `74cc61a`: `KEEP_DAYS.notifications` and `prune.mjs`'s default
both 30, the `--days` flag deleted from the workflow so the window lives in one place, and four
documents corrected (the privacy table and its "last updated" date, `SECURITY.md`'s retention table
with a dated footnote, and `OPERATIONS.md`'s two mentions, which the `lib-core-config` lens caught me
missing while the commit was in progress). Four comments elsewhere had dated themselves off the old
year and are fixed with it.

Consequence for the plan: **`/notice/[id]` becomes retirable.** Its whole audience is notification
rows minted before the 2026-07-24 moderation-notes migration, and at 30 days none has existed since
2026-08-23. That is row A10, eleven months earlier than the route's own comment expected.

## 2. Phased fix plan

Seven phases, ordered so that everything cheap and reversible lands before anything that needs a
decision or a measurement. Each row names the merged finding ids (the per-finding evidence, line
ranges, steps and risks are in `work/agents/`), the unit it saves, and the gate that proves it.
**Tier**: T1 mechanical · T2 needs care · T3 needs a measurement · T4 owner's call.
Phases A–C are worth doing whatever the owner decides about D and G. **The plan carries the
load-bearing findings, not all 369** — the hygiene tail is in Phase F by class rather than by id, and
`work/findings-index.json` is the exhaustive list.

### Phase A — free money (T1, autonomous, no behaviour change)

| # | What | Ids | Saves | Gate |
|---|---|---|---|---|
| A1 | Give the lab its own stylesheet (`@source not "./lab"` + `lab.css` from the lab layout) | ORCH-01 = lab-02 = bundle-build-02 | **−74,397 B raw** on all 100 routes (three methods agree to the byte); gzipped ≈8.7–9.0 KB depending on compressor level, so quote the raw figure | `npm run visual` + open three lab rooms |
| A1b | **Separately**, scope Tailwind's source root (`source("../")`) so it stops walking the whole repository | ORCH-03 = bundle-build-02 step 1 | only ~1.7 KB of CSS — **do not add it to A1's saving** — but it stops a non-gitignored folder breaking a production build | `npm run visual` |
| A2 | Inline the ~40 used lines of `shadcn/tailwind.css`, drop the package | dependency-diet-01 (count confirmed by the orchestrator, disk figure corrected) | −234 lockfile entries (21.6 %), −65.8 MB apparent / −79.1 MB allocated, −1 override | `npm run visual` (Separator variants), and `base-ui` Separator's `data-horizontal`/`data-vertical` in particular |
| A3 | Make `/lab/directory/_maps.tsx` fetch the atlas the way `alumni-map.tsx` does, drop `world-atlas` | dependency-diet-02 = lab-13 | −1 production dep, −7.8 MB, −105 KB off `/lab/directory` | open `/lab/directory`; knip will start reporting the package if the line is left behind — both signals are correct |
| A4 | Give `screenshot-auth.mjs`, `verify-shot.mjs` and `theme-shots.mjs` the `deviceScaleFactor: 2, isMobile, hasTouch` that `screenshot.mjs` and `map-cluster-verify.mjs` already have | scripts-e2e-ci-03 (corrected: three scripts, not one) | every future mobile QA shot becomes true | a before/after pair on `comments-section.tsx`'s overflow menu — **not** the carousel arrows, which are `opacity-0` without a hover and prove nothing |
| A5 | Register the Playwright HTML reporter outside CI so `npm run visual:report` works | scripts-e2e-ci-08 | the rule against blind rebaselining gets its tool back | run it against a deliberate diff |
| A6 | Delete the tour probe and `_dir-chrome-probe` machinery for features removed on 2026-08-27 | scripts-e2e-ci-01 + 07 | −338 lines; two green-but-vacuous checks stop lying | `npm run check` |
| A7 | Drop the dead `GHSA-ggr8-5vv4-36mx` allowlist entry and the `phase9-probe` assertion that names it — **which verification found is already failing today** | dependency-diet-03 (corrected: the claimed status-board saving does not exist) | a stale security allowlist stops being pinned; one probe stops failing | `npm run check`, then `phase9-probe` |
| A8 | Delete orphan files and dead variants: two filter-kit files, `SortPill`, `HOUSE_OPTIONS`, three `button.tsx` cva rows (`dead-code-08` and `shell-primitives-06` are the same three lines), three orphan `.webp`, four never-referenced tracked binaries in `public/`. **The `.hoopoe .wing` CSS block is a MOVE, not a delete** — `/lab/v2` renders those class names, so it belongs in the lab stylesheet A1 creates. **Take `directory-profile-06`'s step list, not `dead-code-01/03`'s** — verification found it is the superset and the only one that also removes the comments naming the deleted files, and that `dead-code-07`'s stated range would delete the landing hero's live `sectionVariants` | dead-code-01 + 03 + 06 + 07 + 08 = directory-profile-06 + 07 ; shell-primitives-06 ; root-assets-03 | −280 lines, −831 KB tracked | `npm run check` + `npm run visual` |
| A9 | Turn off Sentry's injected `clientTraceMetadata` (two meta tags per document for a browser SDK this project does not have), set `telemetry: false`, and fix the two CSP lines that contradict the comment directly above them | lib-core-config-06 + 07 + bundle-build-09 | −~400 B per HTML document; the config stops disagreeing with its own comments | `npm run check`, load any page |
| A10 | Retire `/notice/[id]` and its `loading.tsx`; **delete `src/lib/threads-rule.test.mjs`'s C-115 pin at `:155-187` in the same commit** — it reads the page file and asserts on its text, so the deletion reddens `npm run check` without it. Both the `createdAt` *and* `db` options of `openAdminNoticeThread` fall out with the route. Reword the four history comments that cite it, and `bugs.md:462-467`, which still says 365 days | docs-12 (corrected) | −1 route row, −132 lines, 11 months early | `npm run check` — expect it red until the pin goes |
| A11 | **Correct `docs/spec/media.md` §4.2/§4.4** — the file `CLAUDE.md` sends a media session to, blessed by its own banner as "still true". **Be precise, because the finding overstates it and so did an earlier draft of this report:** the `thumbUrl` row (480 px, q72) is *correct* (`collection-photo.ts:26,197`); the `url` row (1600 px, q80) is correct **only for the FormData fallback** (`actions.ts:338-342`) and wrong for the primary direct path, which keeps a 40 MP area cap at `COLLECTION_WEBP_QUALITY = 100` (`actions.ts:600-603`); and `originalUrl` (3000 px, q82) **has never existed** — `schema.prisma:269-270` has only `thumbUrl` and `url`. The rewrite must document **two** Collection encode paths, and `TRAPS.md`'s flat "does NOT downscale" has the same gap. `schema.prisma:270`'s own `// 1600px` comment is wrong for the direct path too | docs-02 (corrected) | stops the recurring hallucination without introducing a new one | read it against both encode sites and the schema |
| A12 | Move `loadPhoto` and `myPendingPhotos` out of the `"use server"` file — **two fewer publicly callable action endpoints** for functions that only read | collection-10 | smaller attack surface, no behaviour change | `npm run check`; the Collection still loads |
| A14 | Delete `(auth)/layout.tsx`, a no-op wrapper with a stale comment, and `hashToken`, exported under a docblock naming a caller that `claimToken` replaced | auth-edge-06 + 07 | −2 dead surfaces | `npm run check`; sign in |
| A15 | Retire the npm `overrides` that no longer override anything, and correct the doc saying there is one when there are five. **Three findings rewrite the identical `OPERATIONS.md` paragraph (at `:224-229`, not where two of them say) — collapse them into `lib-core-config-08`'s gated version** | lib-core-config-08 + dependency-diet-04 + dependency-diet-05 + scripts-e2e-ci-19 | −3 floor pins whose parents' ranges already admit the fix | `npm run check` (the advisory gate) |
| A16 | Give `/api/demo/reset` the pool bounds and duration ceiling its two sibling cron routes already have | lib-core-config-10 | one route stops being the exception | `npm run check` |
| A19 | `@sentry/cli`'s install script is approved for a source-map upload that is switched off | dependency-diet-06 | one approved postinstall script fewer | `npm run check` |
| A17 | **`BirdAvatar`'s `ring` prop silently does nothing on the bird path** — it is applied unconditionally in the photo branch (`:58`) but only `if (clipped)` in the bird branch (`:104`), while `your-catchups-card.tsx:76,100` pass it and the chip beside them hand-writes the same `box-shadow`. I confirmed this line by line; verification adds two more lab call sites | landing-mascot-avatars-06 | a prop that lies, and a duplicated shadow | screenshot the Catch-ups card before and after — **this one changes pixels** |
| A18 | The viewer's SSR portal guard exists only for three lab rooms; `media-viewer-02` re-counts the viewer's nine emitted chunks after B10 lands | media-viewer-10 + 02 | a guard with no shipped reason | `npm run check` |
| A13 | The `tag-photos` picker does not carry its rules into the manifest — a **hand-run-pass protocol violation that `hand-run-passes.test.mjs` does not catch.** Fix the picker *and* widen the test, per `docs/spec/hand-run-passes.md` | collection-13 | the protocol starts enforcing itself | `npm run check` with the test widened first, red then green |

### Phase B — bundle levers (T2/T3, each gated by a first-load re-measure)

Root cause of B1–B4, worth stating once because it explains findings from four independent lenses: **a
server component that statically imports a client component puts that module in the route's client
bundle whether or not the branch renders.**

| # | What | Ids | Saves | Gate |
|---|---|---|---|---|
| B1 | `FloatArea` → `InfoTooltip` → base-ui Popover: lazy-load the tooltip. (Verification correction: `hint` is `FloatArea`'s prop, not `FloatField`'s, so the finding's "use `trailing` instead" alternative does not exist) | auth-edge-01 (corrected) | **up to 161,106 B raw off `/login`, `/signup`, `/forgot-password`, `/`** — five chunks, all containing `useFloating`, that `/verify-email` does not carry (orchestrator-measured off the committed build) | `route-js.mjs` before/after; sign-in flow. **First confirm nothing else on those pages needs the floating stack** |
| B2 | Defer the hoopoe rig in `sidebar-hoopoe.tsx` and `logo-easter-egg-hoopoe.tsx` (audit 1's finding 08 was only half executed) — **and correct `not-found.tsx:20-22`, which tells the fixer the sidebar shows the bird at first paint; it does not** | shell-primitives-02 = landing-mascot-avatars-02 (corrected) | the 28,691 B chunk is on 46 of 52 routes, but **this step does not free them all.** Two verifiers walked the import graph independently and disagree on the count (one says ~23–25, one says 28), because the routes that keep the rig anyway differ: the six `/catchups*` routes through `almost-ready.tsx`, `completion-card` and `group-first-guidance`; `/welcome` through `CelebrationSignals`; `/directory`, `/profile/[id]` and `/messages` through `moments/moment-hoopoe.tsx`. **Measure the delta, do not quote a route count** | idle 120 s and Ctrl+Shift+H on desktop; `next/dynamic` drops refs, so fill the controller from `onReady` |
| B3 | `SearchPill` off the routes that never pass `showSearch` (only `feed/page.tsx:76` does) | shell-primitives-01 (corrected) | the 8,508 B marker chunk is on 26 of 52 non-lab routes, but **isolated on only 10 of them** — on the other 16 it is bundled with code those routes do use, so the saving is smaller than 26 × 8.5 KB | first-load diff on three of the 10 |
| B4 | `not-found.tsx`'s flight machinery out of every route's first load | shell-primitives-07 | −~6 KB on all 52 including `/privacy` | visit a 404 |
| B5 | Guide chapters lazy on the `(main)` routes that never open the guide | bundle-build-03 = member-surfaces-01 | the chunk is 23,588 B on exactly 39 routes; **the guide's share of it is ~11.3 KB**, re-found by byte offset under verification | open the guide |
| B6 | `/welcome` loads five wizard steps for one sentence; Combobox eager on `/admin/people/[id]` | directory-profile-03 (the `/welcome` half) + bundle-build-05 (the person-detail half only — verification found they overlap) | −115.7 KB on `/welcome`, −54 KB on `/admin/people/[id]` | walk the wizard |
| B7 | d3 + the map on demand for People-first arrivals; keep the profession vocabulary out of the client chunk | directory-profile-02 + 04 | −66 KB and −the hint strings on `/directory` | switch to Map view |
| B8 | Import `domMax` directly instead of through the motion barrel | bundle-build-01 (corrected: the barrel chunk is in `/verify-email`'s first load, and 15 lab routes', so "no first-load anywhere" is too strong) | −70–90 KB raw / 17–22 KB gz **post-hydration** on every route; this is not a first-load number | drag, reorder and the hoopoe flight |
| B9 | Investigate Turbopack's duplicated chunks. **"23 byte-identical pairs" is wrong** — verification found the md5s differ; what is real is one confirmed pair at token-Jaccard 1.0000 (`0o8o--shg75rg.js` 34,665 B ≈ `3310zq7p7go82.js` 34,758 B, the first on 45 non-lab routes), and `turbopackChunking` is unset | bundle-build-04 (corrected) | unknown until measured — an experiment with a measurement gate, not a fix | first-load table |
| B11 | `ReportDialog` is mounted on every card and statically imported — latch and defer it the way the viewer already is | feed-posts-03 | a dialog module on every post card in every feed | open a report from a card |
| B12 | Lazy-load the moderation dialog on the letter page, and measure the comments block beside it | member-surfaces-02 (corrected) | **~22.6 KB for both components in one chunk, not ~44 KB** — the finder's markers were JSX prop names living in the caller's chunk; a verifier re-proved the conclusion from callee-body strings | open the dialog |
| B13 | The Writing tab fetches its first page after hydration — the shape audit 1 closed on `/collection` | directory-profile-14 | one round trip a member waits through | watch the network panel on a profile |
| B10 | **One lazy entry point for the image viewer, one opener button, one preload latch.** Five call sites each write their own `dynamic(() => import(...))`, four more preload it, and nine built chunks contain the viewer | media-viewer-01 + 03 = fresh-code-02 = collection-16 = dead-code-05 | the viewer stops being emitted nine times; re-count the chunks after | open a photograph from all five surfaces |

### Phase C — the query floor (T2, autonomous, measurable)

| # | What | Ids | Saves | Gate |
|---|---|---|---|---|
| C1 | `cache()` the row that `generateMetadata` and the page both fetch, on all five routes | data-layer-08 = collection-04 = fresh-code-23 = directory-profile-13 = member-surfaces-16 | −5 queries per view | query log on each route |
| C2 | Unread count: `cache()` it for layout+page, drop the bell's *mount* call, keep its `focus` listener | shell-primitives-03 = data-layer-09 | −2 queries per feed load, −1 elsewhere | the bell still updates on window focus |
| C3 | The no-op `lastSeenAt` UPDATE (fires 14 minutes in 15) and the two Catch-up advance joins | data-layer-07 | −2 queries on every authenticated page | presence still moves |
| C4 | `touchLastSeen` out of the render-blocking `Promise.all`. **Not the one-line `after()` move the finding proposes** — verification killed that: it calls `await headers()`, which throws inside `after()` in a Server Component, and its error handler is silent in production. Read the headers during render, pass the facts in | admin-analytics-07 (corrected) | render no longer waits on telemetry | the row still fills **in a production build**, not just in dev |
| C5 | Nine `count`s → one `FILTER` aggregate, in the shape the same file already uses | admin-analytics-03 + 09 + 14 = data-layer-12 | −~25 round trips per analytics view | numbers identical before/after |
| C6 | The one N+1 (bounded to six) → `DISTINCT ON`; `admin-people-query`'s hand-rolled keyset → `keyset.ts` | data-layer-06 + 10 | −5 queries; −a recovery block `keyset.ts` made unnecessary | paging still lands on the same rows |
| C7 | Five `revalidatePath("/feed")` calls whose effect is already in client state; `revalidatePath("/")` on mark-read; the bell's per-open prune (retention does it nightly). Two verification notes: `revalidatePath` from a Server Function *also* refreshes previously visited pages on the way back, so test one back-navigation; and `feed-posts-16`'s replacement SQL partitions on `WHERE read`, which keeps 100 **read** rows per member rather than reproducing today's cutoff | feed-posts-02 + 10 + 16 (both corrected) | −a full RSC render per comment, vote and 2.5 s letter autosave | scroll position holds through a comment; one back-navigation |
| C8 | Letters index selects `content` for up to 20 drafts and renders id/title/updatedAt | member-surfaces-03 | up to −400 KB of DB transfer per load for a drafter | the strip is unchanged |
| C9 | Six hand-typed avatar selects → one | data-layer-11 = duplication-06 = directory-profile-27 = feed-posts-17.13 | one owner for the shape | `npm run check` |
| C11 | Fetch the other Collection half's facts on the swap, not on every page load | collection-03 | one query per load nobody reads until they swap | swap halves; the counts still match |
| C10 | **Reconcile the schema with the database.** Use the corrected line map at the end of `work/verify/data.md` — every `schema.prisma` citation in the `data-layer` report is off by 85–130 lines. Eleven live objects exist that Prisma cannot see, where `TRAPS.md` records two — and `User_lastSeenAt_idx` is missing from `schema.prisma` entirely, so a `prisma migrate diff` would offer to **drop a live index**. List them, add the ones that must stay, and rewrite the TRAPS entry with the real count | data-layer-05 | removes a foot-gun that would look like a routine migration | `migrate diff` against the live schema, read before running anything |

### Phase D — switched-off subsystems (T4, owner decides each; §4 has the questions)

Everything here works and nobody can reach it. These are the rows that move SLOC.

| # | What | Ids | Size |
|---|---|---|---|
| D1 | The feed's sort and time filters — fully implemented server-side and unreachable **since 2026-06-28**, not since the search pill: `git log -S'showControls={false}'` returns one commit, `096a034`. Take `feed-posts-01`'s steps and `dead-code-02`'s import list; drop its causal note | feed-posts-01 = dead-code-02 (corrected) | ~150 lines (the block is `:281-344`, the offset arm `:1234-1270`), 2 Prisma orderings, 3 audit-fixed bugs no member can reach |
| D2 | The landing showcase family | landing-mascot-avatars-03 + dead-code-06/07 + lab-07 | 11 files, 2,477 lines, **828 referenced by nothing at all** |
| D3 | The Spotify link pipeline — plumbed end to end, no writer since 2026-07-25, 0 of 133 entries. **Verification adds a file the finding's list misses**: `admin/catchups/[catchupId]/page.tsx:103,281` reads `songTitle` | catchups-01 (corrected) | ~190 lines, 3 columns, one outbound fetch on a write path, one SSRF boundary that stops needing defence |
| D4 | The second photo-review UI on `/admin/content`, two days after the review room replaced it | admin-analytics-01 | per-row buttons, batch bar, `approvePhotos` |
| D5 | Legacy `area` / `freeTags` (audit 1 §4 #16, now with the SELECT written) | collection-08 | 2 columns, 2 trigram GIN indexes |
| D6 | Groups schema residue — `Post.groupId` forced null at 8 sites | data-layer-01 | 3 columns, 1 index, 1 relation |
| D7 | Write-only telemetry columns and eight indexes no query shape uses | data-layer-03 + 04 | 4 columns, 9 indexes |
| D8 | `HousePicker` (lab-only), a server action for a column the page already has, a photos grid for a tab that does not exist, six dead props | directory-profile-05 + 09 + 10 + 12 + 17 + 21 + 23 | ~400 lines |
| D9 | `Image.greyscale`, computed on every feed image and deliberately never selected | data-layer-02 = collection owner decision | 1 column, 1 write |
| D11 | Four dead branches: the unreachable `pending` filters the review-room move left behind; the composer's `placeholder` prop, `ComposerScope` type and `SCOPE_PLACEHOLDER` map with no caller; `CatchupIndexCard`'s "Start one" row the owner removed on 2026-08-21; and `loadMeta`'s unreachable fallback query, which has **less safe semantics** than the path that replaced it | admin-analytics-02 ; feed-posts-09 ; catchups-05 + 06 | four branches, one of them a safety regression waiting to be reached |
| D10 | **The demo photograph pipeline has never produced a single photograph** — a 201-line script, a generated file that is an empty array with one commit in its history, and a seeder merge. Its documented working directory is the repo root you closed | lib-core-config-04 | ~250 lines + one instruction that breaks a house rule |

### Phase E — de-duplication that closes a drift (T2)

Line-neutral by design; the value is that four of these copies have already drifted, and two of the
drifts are member-visible.

| # | What | Ids | Why now |
|---|---|---|---|
| E1 | One `/api/upload` client | duplication-02 = media-viewer-06 = catchups-04 = feed-posts FOL | **only one of the three has the 60 s abort timeout**, and the Catch-up copy still runs a 5 MB pre-check *before* the shrinker |
| E2 | One server-side image intake — **five** hand-rolled copies, not four (`contribute-room.tsx:326-337` is the fifth) | duplication-03 (corrected) | **the blank-MIME HEIC claim is refuted**: `sniffImageType` refuses it safely, just with a misleading message. So this is drift, not a hole — and the pin that constrains the fix is `image-purge-rule.test.mjs:104-129`, not `upload-size-rule.test.mjs`, which reads no route file |
| E3 | Every email written twice, HTML and plain text, from two hand-kept copies | lib-core-config-02 | **three of the four have already drifted** — a member can read two wordings of one message |
| E4 | One dev-script prelude + the demo-destination guard, and one `.env` reader for `scripts/demo` instead of three copies (one of which reads `.env` twice) | duplication-01 = fresh-code-05 = directory-profile-19 = collection-16 ; lib-core-config-05 | `import-album.mjs` — the one script that writes photographs — has no guard at all. **Verification correction: do not write a fourth parser.** `scripts/dev/_env.mjs` already exports `readEnv`/`loadEnv`, and a verifier ran both parsers over the same input: they disagree on **values**, not just keys — the hand-rolled one keeps inline comments, trailing spaces and mangles multiline. Adopt `dotenv`, which is already a dependency |
| E5 | QA kit adoption: one bootstrap, one ledger, one brace-matcher, one dev-login, `dotenv` over the hand-rolled `_env.mjs`, one answer to "which Chrome" | scripts-e2e-ci-04 + 09 + 14 + 15 + 16 = lib-tests-02/04 = duplication-04/05 | the `audit-status.mjs` copy of the brace-matcher decides the security board — gate it with a byte-identical `--json` diff |
| E6 | Test-kit adoption: `git grep` → walk (a fail-open shape in two security sweeps), `serverActionFiles`, 49 hand-rolled function slicers → `balancedBody`, 60 redundant file reads | lib-tests-01 + 02 + 03 + 04 + 06 + 07 | one sweep reads a 2,054-line file eleven times |
| E7 | Turnstile sentinel→sentence map ×3 → one `proof()`; two HMAC-stamp implementations kept equal by a comment | auth-edge-02 + 03 | security-sensitive: the trivia pass lacks the human pass's nine attack tests |
| E8 | **One "one hoopoe at a time" primitive, six mechanisms** — four independent retry loops with four different constants (8000 / 3000×10 / none / 4000), plus the flight bus's single slot and the arrival veil | landing-mascot-avatars-07 | four constants nobody owns, and one file missing the Strict-Mode guard its three siblings each document at length |
| E9 | Five hand-typed `text-[27px]` h1s beside the `AuthHeading` that exists for them | duplication-07 | `auth-first-frame.test.mjs:41` pins the literal class string — widen it in the same commit |
| E10 | The canonical origin as a string literal in seven places; the retention sweep's eight identical cutoff deletes as a small table | lib-core-config-09 + 03 | one owner each |
| E12 | Finish audit 1's `catchups-03`: two prop drills and three retyped cadence lists still there (`catchups-02`); merge `admin-worklist.ts` into `admin-worklist-query.ts`, whose claimed seam does not exist (`admin-analytics-06`, an audit-1 finding dropped in compilation and now restored); a lookup table for the Collection's two halves instead of eleven ternaries (`collection-11`); the directory person type hand-written four times (`directory-profile-08`); `toViewerImage`'s third copy, which exists only because `collection-photo.ts` imports through `@/` (`fresh-code-04`) | as listed | each closes a carry-over |
| E11 | **The rest of the dedupe tail, by class rather than by row** — the M33 one-per-unread rule written twice plus four inline notification creates (`feed-posts-04`); the comment payload ×3 (`05`); `MAX_IMAGES` ×6 (`06`); the own-city query ×3 (`08`); the report transaction ×2 (`14a` — but **decline `14b`**: its premise that this is the only `"use server"` file under `components/` is false, there are twelve); the Catch-up preparing scene ×2 with drifted copy, the join shell ×3, the membership lookup ×5 and the edition select ×4 (`catchups-07/08/09`); the photo-meta column map (`collection-09` ≈ `fresh-code-06` = `duplication-14`); the places transaction hand-rolled in onboarding beside a `place-write.ts` that claims "exactly two writers" (`directory-profile-11`); `MailCard` = `MailRows` (`admin-analytics-05`); two rAF count-ups that `motion` already does (`feed-posts-13`, `member-surfaces-13`); `HoopoeWarmup` on pages that already mount the rig and two handles to one bird ×3 (`auth-edge-04` + `05`); one `EmptyCard` for five empty states (`duplication-08`); `useResendVerification` for the banner and the dialog that call themselves twins (`duplication-12`); the filters kit's pill trigger spelled four times (`duplication-13`); `StepFooter` for the onboarding steps (`duplication-11`, audit 1's item 3, still not done); the hand-rolled admin checks still outside `requireAdminAction` (`duplication-15`); `toViewerImage` written three times (`fresh-code-03`); the two Collection contribution pipelines folded into one ingest (`fresh-code-01` ⊃ `collection-06` = `media-viewer-04`); `admin-actions.ts` living under `components/profile/` with three of its eight actions being post moderation (`directory-profile-15`); `AdminProfileTools` hand-writing four times the busy/try/toast that `useAdminAct` exists for (`directory-profile-16`); the join route's page shell ×3 and refusal card ×2 (`catchups-08`); the launch pose written twice inside `hoopoe.tsx` (`landing-mascot-avatars-15`); the `/birds` and `/pick-bird` grids kept identical by three comments instead of one constant (`landing-mascot-avatars-14`); the viewer's cross-dissolve and arrow-key handler copied into the contribute stage — **which verification says needs a rename plus a spread, not a drop-in**, because the variant keys differ and the stage's `leave` carries a `pointerEvents` justification the viewer has no equivalent for (`media-viewer-12`) | see `work/findings-index.json` | each is small, each has an owner named in its report |

### Phase F — hygiene (T1, do it last, in one pass)

Comment blocks describing deleted code, in eleven territories (`media-viewer-13`, `fresh-code-19`,
`collection-14/15`, `feed-posts-17`, `admin-analytics-12`, `member-surfaces-05/07`, `auth-edge-11`,
`directory-profile-24`, `catchups-14`, `shell-primitives-12`) — including a 14-line block in
`catchups-core.ts` opened with `/* ---` and never closed, which swallows the docblock after it. Plus:
hand-typed easing arrays ×7 (a CLAUDE.md rule breach), the stalled z-index token migration, the two
`reduced-motion` violations of DESIGN-SYSTEM §7 (`not-found.tsx` and `landing/footer-hoopoe.tsx` —
verification found the second, which declares itself a scoped exception, so this is one decision about
two files), two scripts writing folders into the closed repo root (`.tmp-shots/`, `.geonames-tmp`),
`--space-xxl`, whose only non-lab consumer is a file knip lists as unused (`shell-primitives-11`), and
the two "Back to settings" controls on a page that has no settings to go back to
(`member-surfaces-10` — member-visible copy, so screenshot it).

Then the documentation pass, which is larger than it sounds because two lenses measured it:
**54 genuinely dead path mentions across 14 documents** (94 total, ~40 of them deliberate "lives in
git history" pointers, `docs-08`); `docs/README.md`, the index whose own opening line is *"A map that
lists folders which do not exist is worse than no map"*, listing 12 spec files where disk holds 15
(`docs-05`); `OPERATIONS.md` and `SECURITY.md` stating five counted facts that are wrong, including a
unit gate of "74" and "25+" test files against a real 102 (`docs-10` = `dead-code-10` = `scripts-e2e-ci-11`);
`admin.md` opening *"Nothing here is built yet"* for eleven shipped routes (`docs-11`); **`CLAUDE.md`
itself, a fifth stale document nobody's territory covered — lines 133, 237-238 and 245, including a
test suite of "75 files" against a real 102**; ~315 lines of
`letters.md` and the Groups-based half of `catchups.md` specifying features that were renamed or removed
(`docs-06`, `docs-07`); the ledger's nine false lines (`scripts-e2e-ci-10`); and the three finished
planning campaigns (`docs-13`, `docs-14`); and the three campaign documents that each restate CLAUDE.md's
operating rules in full (`docs-16`).

And the two recurrence mechanisms, which matter more than any single line they remove:
**`progress.md` is now the fourth-largest file in the repository** — 8,567 lines, 601 KB, half the
root's tracked weight, grown 4,444 lines in eight days — because the archive rule that already exists
in writing in two places (`docs/README.md:36` and `progress.md` itself: *"A month moves there once it
is closed"*) has nothing enforcing it, and August closed five days ago and has not moved
(`root-assets-01` = `docs-04`). It also has **two chronologies running in opposite directions with
September entries at both ends** (`root-assets-02`), so there is no agreed place to append. Both want
the shape CLAUDE.md's own memory note prescribes: one rule, one globbing test, one keyword row.

### Phase G — architecture and taste (T3/T4, last, one at a time)

| # | What | Ids | Note |
|---|---|---|---|
| G1 | The lab out of the production build | ORCH-02 = bundle-build-07 = lab-01 **+ lab-10** | −12 s per build, −9.7 MB deployed, 0 member bytes either way. **A main-build exclusion is not safe**: `/lab/collection` is the Collection's test fixture, and eight things outside the lab reach lab routes (`centroid.mjs`, two `apple-edge` scripts, `crawl.mjs`, `phase6-probe`, `audit-status`'s M19 probe, `protocol-audit.mjs`, `motion-features.tsx`). Verification refuted one sub-claim: **one** committed Playwright suite depends on `/lab/collection`, not two. The demo-only exclusion is the safe form, and `lab-audit.mjs:47` must learn the new filename in the same commit |
| G2 | **Two systems, not three — and verification made the case stronger.** The "17 KB Tooltip chunk" on the Catch-up home is *the same base-ui Popover* the sign-in pages carry; two lenses named the same chunk differently and agree on what it is. So it is one popover library appearing on two surfaces, plus `VerifiedMark`'s hand-rolled third with per-row state | auth-edge-01 + catchups-03 + shell-primitives-09 (reconciled) | **one decision**; audit 1 §4 #15 restated with prices |
| G3 | The letterhead's edit-only trunk on every stranger's profile view | directory-profile-01 | ~900 lines; audit 1 split the leaves and left the trunk; three independently shippable moves |
| G4 | `ui/card` maintained for one lab room while 70 non-lab files hand-write its class string; `ui/combobox` 167 lines and ten exports for one caller; 13 pure pass-through `ui/` wrappers | shell-primitives-04 + 05 + 08 | the lab is why audit 1's sub-primitive sweep could not see these. **Trap:** `shell-primitives-05` says the `data-slot` attribute is read in one place; it is not — `hover-probe.mjs` and `theme-shots.mjs` both select on it, and **neither runs under `npm run check`**, so option (a) breaks them silently |
| G5 | The Collection's three-hook decomposition | collection-05 | line-neutral, moves ~10 source pins — **do it last**, after everything else in the Collection has settled |
| G6 | `Photo.subject` as a comma-joined `contains` where `professionTags` uses `text[]` + GIN | data-layer cross-lens | a rework, not a cut |
| G7 | **63 Google font files — 2.75 MB — are built and deployed for two archived lab rooms, and every cold build fetches them from Google.** 0 member bytes, verified against the client-reference manifests | lab-04 | if G1 happens this goes with it; otherwise it is its own row |
| G8 | Three concept harnesses import every variant eagerly; `/lab/profiles` at 1,363 KB is the heaviest route in the app, ahead of `/profile/[id]`; there is **zero `next/dynamic` in the entire lab** | lab-03 | costs members nothing, costs you every time you open a room |
| G10 | One asker for "does the reader want the page above" — the Collection's head `IntersectionObserver` duplicates what the scroll listener already answers (−55 lines). **Medium risk: this is the most-fixed surface of the past fortnight** | collection-07 | do it after G5, or not at all |
| G11 | The composer's "+" menu and its attachment strip are the two regions of `editorBody` with narrow enough seams to extract | feed-posts-15 | the only part of the composer worth touching |
| G9 | `hoopoe-geometry.ts` + `edge-light.ts` are 506 lines of build-time and lab-only tooling living in `src/lib/`. **Relocate carefully, do not delete** — the protocol audit and the mark-centring script both pin them | landing-mascot-avatars-08 (+ lab-07's warning) | a seam, not a cut |

### Outside simplification — hand these to the bug tracker, not to a fix session

Found while auditing, out of scope, listed so they are not lost. `docs/planning/bugs.md` is their home.

- **Correctness**: the Collection's quota cap follows the wrong half after a swap (`collection-02` —
  `facts.roomLeft` is computed and never read, despite `dad5307`); the intake quota counts without
  `scope`; the aim dialog opens Catch-up answers at 50 % instead of the saved focal point
  (`media-viewer-18`); the feed loading skeleton draws a composer tile that no longer exists; two
  analytics sparklines count drafts and hidden posts while their live tiles do not; Facebook is filed
  as `kind: "website"`; a photo-step points members at a `/settings` page that 404s; `editPost`
  enforces the photo cap twice.

  **Two leads the find phase reported and verification refuted** — do not "fix" them: the poll
  option whitespace hole does not exist (`createPost`'s pre-parse filter at `:155` strips
  whitespace-only options on every path, and the proposed fix would turn a silent drop into a refused
  post), and the avatar path's blank-MIME HEIC is safely refused by `sniffImageType`, which merely
  says the wrong thing about why.
- **Security / privacy**: 20 admin verbs write no audit log, three of which destroy data
  (`declinePhoto`, `dismissMail`, `adminRemovePhoto`); the account export omits `birdOverride`,
  `showEmail` and `professionTags` (Art. 20 completeness); `snapshot.yml:77-82` (moved by `74cc61a`) interpolates
  `${{ inputs.day }}` into a shell command at `:78` and `:79` with `SUPABASE_DIRECT_URL`,
  `POSTHOG_PROJECT_ID`, `GITHUB_TOKEN` and two API keys in scope (`workflow_dispatch` is owner-only,
  so severity is genuinely low; the fix is three lines);
  **`phase3-probe.mjs:63` and `phase4-probe.mjs:75` both still run `DELETE FROM "Session"` against a
  table dropped on 2026-08-27, so both probes have been failing — and leaving `User` rows behind —
  ever since.** Verification found this is worse than the finding described.
- **Owner-only**: confirm the Upstash keys are set in production — the rate limiter fails open and this
  session cannot see production config.

## 3. Findings

**369 findings across all 22 reports**, indexed in `work/findings-index.json` (id, title, where,
phase, tier, class, decides, saving, gate, claim) and written out in full in `work/agents/`. Each report
carries its own not-findings, its owner decisions, and the charter questions it was asked. This
section is the map, not the territory: the plan in §2 is what a fix session works from, and these
tables say which reports back each row, and where two lenses found the same thing from opposite sides.

By tier: **T1 169 · T2 146 · T3 40 · T4 13**. 46 findings put a question to the owner (§4).

### 3a. The reports

| Report | Findings | Read | Headline |
|---|---|---|---|
| `directory-profile` | 27 | 93 files / ~17,250 lines | the letterhead's edit-only trunk on every stranger's profile; d3 on People-first arrivals |
| `fresh-code` (lens) | 25 | 110 files / 29,336 lines added since audit 1 | per-file verdicts on every new file; the `eslint-disable` count correction |
| `scripts-e2e-ci` | 21 | 82 files, 47 fully | the most *live defects* of any report: mobile shots, the missing visual report, 338 lines guarding deleted features |
| `duplication` (lens) | 21 | all 238 clones classified | ~110 copies, ~700 lines to single owners, **two behavioural drifts** |
| `catchups` | 18 | 70 files / ~12,900 lines | the Spotify pipeline; Keeper dialogs shipped to every member |
| `media-viewer` | 18 | — | one lazy viewer entry point; the aim-dialog correctness lead |
| `collection` | 17 | — | a live quota bug; the contribute pipeline written twice |
| `data-layer` (lens) | 17 | 523 call sites censused | seven queries before every page's own; **eleven live DB objects Prisma cannot see** where TRAPS says two |
| `feed-posts` | 17 | — | the hidden sort/time filters; five needless `/feed` revalidations |
| `lib-core-config` | 17 | — | every email written twice and already drifted; the demo photo pipeline has never produced a photograph |
| `landing-mascot-avatars` | 16 | — | 51 bird glyphs on 39 routes, measured; the showcase family priced at 2,477 lines |
| `member-surfaces` | 16 | 80 files | guide chapters everywhere; 400 KB of draft `content` per letters load |
| `shell-primitives` | 16 | 74 files | the RSC-boundary root cause, twice, measured off the build |
| `dependency-diet` (lens) | 15 | full lockfile census | `shadcn`'s 234 packages; **two well-argued refusals** (AWS SDK, bcryptjs) |
| `admin-analytics` | 14 | 76 files | nine counts on one table; 20 unaudited admin verbs |
| `lib-tests` | 14 | 114 files / 15,127 test lines | **zero vacuous tests**; the `git grep` fail-open class |
| `auth-edge` | 13 | 64 files | `FloatField` → Popover on every public page |
| `lab` | 13 | 48 rooms classified, 21 read fully | the room table; `world-atlas`; the CSS number confirmed by a second method |
| `docs` | 21 | 129 files | **`media.md` teaches a Collection image pipeline that is wrong in two of its three rows** — the hallucination the owner has complained about twice |
| `root-assets` | 13 | the root entry by entry | the root is clean; `progress.md` is now the fourth-largest file in the repo; 38 vendored skill packs untouched since March |
| `dead-code` (lens) | 10 | env keys 44/44, API routes 14/14, every route | the hidden feed filters; four of audit 1's triage verdicts corrected |
| `bundle-build` (lens) | 10 | every chunk in the build | the motion barrel; the mechanism ORCH-01 lacked |

`root-assets` and `docs` were killed by a usage limit in the find phase and finished hours later, so
their findings arrived after the first verification wave had already launched; they are compiled and
spot-checked like the rest, and flagged in §3d as unverified by an adversary.

### 3b. Where two lenses met

The point of running territory readers and cross-cutting lenses over one tree is that the same defect
gets found from two sides by two methods, and the agreement is the evidence.

| Programme | Ids | Why the agreement matters |
|---|---|---|
| Lab CSS on every route | ORCH-01 = bundle-build-02 = lab-02 | **three methods**: a lab-free build diff, rule attribution, class-token attribution. The two attribution methods agree with each other to the byte (238,434 → 164,037 B) and both undershoot the build, because the lab also triggers variant and theme output no attribution can see. Quote the build |
| The lab's build cost | ORCH-02 = bundle-build-07 = lab-01 **+ lab-10** | lab-01 measured what I measured; lab-10 is the correction that matters — a main-build exclusion would break the Collection's own test fixture |
| Hoopoe rig deferral | shell-primitives-02 = landing-mascot-avatars-02 | audit 1's finding 08 was executed for the 404 boundary and not for two other files. One static importer defeats a `next/dynamic` |
| The unread count | shell-primitives-03 = data-layer-09 vs `feed-posts`' not-finding | **three lenses disagreed.** `shell-primitives` resolved it by splitting the claim in two: `cache()` the layout+page pair, drop the bell's *mount* call, keep its `focus` listener — whose own docblock only ever argued for the listener |
| `world-atlas` | dependency-diet-02 = lab-13 | found from the dependency side and the lab side independently. The shipped map was fixed in audit 1 to stop compiling the atlas into a module; **the lab room that prototyped it kept the antipattern the shipped file documents as wrong** |
| Notification retention | ORCH-04 = scripts-e2e-ci-02 = lib-core-config-01 | three lenses, three routes to one divergence. Resolved in §1d |
| Guide chapters eager | bundle-build-03 = member-surfaces-01 | chunk byte-offsets and analyzer attribution agree |
| `generateMetadata` double fetch | data-layer-08 = collection-04 = fresh-code-23 = directory-profile-13 = member-surfaces-16 | four territories found their own instance; the data lens found the pattern |
| Hand-typed avatar selects | data-layer-11 = duplication-06 = directory-profile-27 = feed-posts-17.13 | same shape, four owners |
| Admin count fan-outs | data-layer-12 = admin-analytics-03 + 09 | same |
| The `/api/upload` client ×3 | duplication-02 = media-viewer-06 = catchups-04 | the duplication lens found the copies; `catchups` found which copy had drifted furthest |
| Brace-matcher written twice | scripts-e2e-ci-09 = lib-tests-02/04 = duplication-05 | an audit-1 residue, and one copy decides the security board |
| Dev-script prelude + demo guard | duplication-01 = fresh-code-05 = directory-profile-19 | three lenses; the missing guard on `import-album.mjs` is `duplication`'s alone |
| Orphan filter kit | dead-code-01 + 03 = directory-profile-06 + 07 | closes audit 1 §4 #17 as moot |
| Hidden feed filters | dead-code-02 = feed-posts-01 | independent agreement, same recommendation, and `feed-posts` supplies the exact edit list |
| `/lab/crop` fixtures | lab-08 = media-viewer-08 = dead-code-06 | the room calls itself throwaway in three places while two Playwright suites depend on its fixtures |
| The landing showcase family | landing-mascot-avatars-03 + dead-code-06/07 + lab-07 | **lab-07 explains why knip lists five of the eleven files and not the other two**: a lab room imports them |
| Three tooltip systems | auth-edge-01 + catchups-03 + shell-primitives-09 | three lenses each found one. It is one decision |
| Swallowed errors | admin-analytics-08 + catchups-18 + member-surfaces FOL | `reportSwallowed` exists for exactly these |
| Stale-comment blocks | eleven territories | the only finding class every single lens produced |

### 3c. The orchestrator's own findings

Measured with builds and scripts the agents were forbidden to run (raw output in `work/raw/`).

- **ORCH-01 — the lab's CSS ships to every member page.** The single shared stylesheet is **238,434 B raw /
  34,274 B gzipped** on all 100 routes. A build with the lab's sources outside Tailwind's scan scope
  produces **164,037 B / 25,289 B**, and the two lab-private CSS chunks (23,686 B and 5,824 B) vanish
  entirely. I re-measured both builds byte for byte at close-out: **−74,397 B raw**, and −8,985 B
  gzipped at `gzip -6`; a verifier measuring independently got −8,747 B, so **quote the raw delta** —
  it is identical across all three methods — and treat the gzip figure as ≈8.7–9.0 KB. Nothing needs deleting: scope
  `globals.css`, give `src/app/lab/layout.tsx` its own stylesheet. **T2, autonomous.** → A1
- **ORCH-02 — the lab costs about 12 s of every production build and deploy.** 42.3 → 30.0 s wall,
  compile 20.3 → 13.6 s, TypeScript 14.6 → 10.2 s, 105 → 62 static pages, 6.5 → 4.0 MB of client chunks
  on disk.

  **Correction to my own earlier claim, made after a verifier challenged it and I recomputed.** I wrote
  that the lab makes "0 bytes of JS difference on any of the 52 shared routes". That is false. Of the
  52 shared routes, **49 are smaller without the lab, 3 are 78 bytes larger, and none is identical**;
  the mean delta is **−1,077 B, about 0.1 % of a median route**, and the extreme is `/verify-email` at
  **−23,163 B across the same 20 chunks**. So the lab does not *ship components* to members — audit 1's
  chunk-by-chunk proof of that stands, and chunk-count parity supports it — but its presence in the
  module graph changes how member chunks are packed, and that is not nothing. Anyone repeating "zero
  bytes" should say "about a tenth of a percent, and 3 % on one route" instead. `tsconfig` `exclude` cannot do it: Next's generated `.next/types/validator.ts` imports every
  route, so excluding `src/app/lab` drops exactly one file from a 6,322-file program. That is why audit
  1's version of this lever measured nothing. **T4, owner.** → G1
- **ORCH-03 — Tailwind scans the whole repository.** With no `@source` scoping it walks 1,864 files per
  build and per HMR pass: every markdown doc, the 600 KB `progress.md`, `.claude/`, `scripts/`, `e2e/`.
  Only 2.5 KB of CSS comes from prose, so the byte payoff is small — **the real finding is the failure
  mode.** During this audit I moved a build cache aside as `.next-run1`, a name `.gitignore`'s
  `.next-stale*/` pattern does not cover. Tailwind scanned a directory of binaries, emitted utilities
  like `.gap-[var(--\x14Ys)]`, and **broke a production build with three CSS parse errors**. Anything
  in this tree that is not gitignored is Tailwind input; CLAUDE.md's own `mv .next .next-stale` advice
  works only because that name happens to match the ignore pattern. **T1.** → A1
- **ORCH-04 — notifications pruned 335 days early, against the published privacy policy.** Resolved in
  this session at the owner's direction; see §1d.

### 3d. Adversarial verification — 348 of the 369 findings re-tested by a hostile reader

Every finding is a claim until somebody re-reads the tree and tries to break it. **Twenty-eight
cluster verifiers ran to completion**, each told to default toward *refuted* when uncertain, each
writing its working notes to `work/verify/` before returning. Between them they returned **381 verdicts
covering 348 distinct findings — 94 % of the audit.**

| Verdict | Count |
|---|---|
| Confirmed | 170 |
| Confirmed with a correction | 200 |
| **Refuted** | **6** (all sub-claims; no whole finding fell) |
| Unverifiable without a live database | 4 |
| Unverifiable without a browser | 1 |

**Not one finding was refuted outright, and 54 % carried a wrong detail** — an off-by-two line range,
a miscounted call site, a pin named in the wrong test file, a headline number the evidence underneath
does not support. That ratio is the most useful thing this phase produced, and it is the first
instruction in the fix prompt: **trust the finding, re-check the line numbers.**

**The six refutations**, each a sub-claim that would have cost a fix session real time:

1. **`dead-code-05`** — dropping `export` from `hoopoe-geometry.ts:32` fails TypeScript, because a lab
   file re-exports the symbol. The finder read only the named-import block above it.
2. **`directory-profile-17a`** and **3. `-17b`** — `GetInTouch`'s and `AdmissionStamp`'s "dead" props
   are passed by five lab profile-variant rooms, which are typed and compiled. **This generalises:
   every "no caller passes this prop" claim in the audit needs a lab re-grep.**
4. **`lab-01`'s member-JS paragraph** — and with it **my own stronger version of the same claim**. I
   had written that the lab makes zero bytes of difference to member routes. Recomputing all 52 shared
   routes: 49 are *smaller* without it, mean −1,077 B (0.1 %), extreme −23,163 B on `/verify-email`
   across the same 20 chunks. See ORCH-02.
5. **`lab-11`** — the "dead twin" `Sheared` has three uses in its own file.
6. **`docs-03`** — two build logs are the same size but not byte-identical.

**Corrections that change a recommendation rather than a citation** — all folded into §2 already:

- **`admin-analytics-07` (C4)**: the one-line `after()` move is unsafe. `touchLastSeen` calls
  `await headers()`, which throws inside `after()` in a Server Component, and its error handler is
  silent in production — so the naive fix breaks presence and says nothing.
- **`auth-edge-01` (B1)**: `hint` belongs to `FloatArea`, not `FloatField`.
- **`auth-edge-03`**: the merge changes trivia's token acceptance by one branch, on a signup gate.
- **`dead-code-07`**: the stated range includes the landing hero's live `sectionVariants`.
- **`docs-02` (A11)**: two of `media.md`'s three rows are *right*. An earlier draft of this report
  overcorrected in the other direction until a verifier caught it.
- **`feed-posts-07`** and **`duplication-03`**: two of the correctness leads this audit was about to
  hand the bug tracker **do not exist**. The poll-option whitespace hole is closed by a pre-parse
  filter, and the blank-MIME HEIC is safely refused by `sniffImageType`.
- **`media-viewer-09`**: `IDLE_MS` never moved from 2.6 s; do not "restore" it.
- **Every `prisma/schema.prisma` line number in the `data-layer` report is wrong** — content right,
  coordinates off by 85–130 lines. The corrected map is at the end of `work/verify/data.md`.

**The 21 findings with no adversarial verdict** are the tail of three clusters that returned before
enumerating every id. They carry the orchestrator's spot-checks but not an adversary's; §6 says so.

## 4. Owner decisions

**46 findings put a question to you, and the table below carries 50 rows because four of them merge
two.** Most are small and have a recommendation you can accept in a word. These eight are the ones
worth reading properly, because they are about what the project *is*,
not about how a file is written. Everything else is in the table below, and every one of them is
argued in full in its own report.

### The eight that matter

**1. Does the design lab keep shipping to production?** It costs about 12 seconds of every build and
9.7 MB of every deploy. It does **not** ship lab components to members — but nor is it free: diffing
all 52 shared routes between the two builds, 49 get *smaller* without it, by about a tenth of a
percent on average and by 23 KB on `/verify-email`. (I had written "zero bytes" until a verifier
challenged it and I recomputed. It is a rounding error, not a zero.) The CSS cost is a separate finding you should take regardless (A1). The
caution that changes the shape of this: `/lab/collection` is the Collection's own test fixture, driven
by a committed Playwright suite, and eight more things outside the lab reach lab routes, so a
main-build exclusion would break your test apparatus. The safe form is a *demo-only* exclusion.
**Recommendation: take the CSS now, leave the lab in the main build, and only exclude it from the
public demo.**

**2. The landing showcase family.** Eleven files, 2,477 lines, 283 KB of tracked images, switched off
behind one flag — and **828 of those lines are referenced by nothing at all**, even with the flag on.
It ships 0 KB of JavaScript, so it costs nothing to leave. This was audit 1's first owner decision and
it is still open. **Recommendation: decide it this time, either way.** If it ships, someone needs to
read its two animation loops for load cost before it goes public; if it goes, the policy links it
carries need a new home.

**3. Four subsystems that work and nobody can reach.** The feed's sort and time filters (~150 lines,
unreachable since the header search pill arrived); the second photo-review interface on `/admin/content`,
still there two days after the review room replaced it; the Spotify link pipeline, plumbed end to end
with no writer since your 2026-07-25 instruction and 0 of 133 entries using it; and the legacy
`area`/`freeTags` columns. **Recommendation: cut all four.** Each has its exact edit list and, where a
database column is involved, the `SELECT` to run first.

**4. The 43 imported skill packs in `.claude/skills/`.** (`root-assets-04`, and `root-assets-12` for the four unused `.claude/agents`) 619 KB and 18,578 lines of markdown, 86 % of
everything under `.claude/`. Thirty-eight have not been touched since 30 March and are named by nothing
in your project; fourteen of those are duplicates of a plugin that is already installed and newer.
**Recommendation: delete the fourteen duplicates, move the rest to your personal `~/.claude/skills/`
where they work in every project instead of just this one, and keep in the repo only the ones CLAUDE.md
actually points at.** Nothing about the website changes.

**5. `progress.md` has become the fourth-largest file in the repository** — 8,567 lines, 601 KB, half
the root's weight, growing about 550 lines a day. The rule that would fix it already exists in writing
in two places, and August closed five days ago and has not moved. Three ways: execute the rule you have
and put a test under it (takes it to 45 KB today, needs nothing from you); archive by size instead of by
month; or invert it, so the full entry always goes to the month's file and the root keeps one line per
session. **Recommendation: do the first now regardless; consider the third at launch.**

**6. What is an audit's `work/` folder allowed to weigh?** (`docs-01`, `docs-03`) Closed audits are already 59 % of `docs/`,
and this one's folder would more than double it — after which closed audits would be about 72 % of your
documentation by weight. Bug audit 1 set the precedent: delete the working artefacts, keep a pointer,
the git history has the rest. **Recommendation: adopt that as the rule.** I have pruned this audit's
own working files before committing rather than assume the answer.

**7. Tooltips: one library on two surfaces, plus a hand-rolled third.** Three lenses each found one
piece and none saw the other two — and verification then showed that two of the three are *the same
base-ui Popover*, named differently by two reports. So: the popover on the sign-in pages and on the
Catch-up home is one thing, and `VerifiedMark` hand-rolls a separate one with per-row state. This is
audit 1's question #15 with prices attached.
**Recommendation: one system; keep the signup tooltip, make the Catch-up one a native `title`.**

**8. The visual baselines are unbounded in history.** (`root-assets-07`, `root-assets-11`, `scripts-e2e-ci-20`) They are 39 % of the tracked repository and
intentional — audit 1 settled that. What was never settled is that **157 PNG blobs totalling 101.2 MiB
have entered git across 39 rebaseline commits since 19 August** — every one of those numbers
reproduced exactly under verification — and **five desktop full-page shots are 55 % of the 13.6 MB
working copy**, one of them 2.5 MB alone. Separately, `e2e/.shots` (the throwaway folder) is 153 MB
and nothing ever deletes it. **Recommendation: a size threshold on full-page baselines and one line in
the close-out routine that clears `e2e/.shots` older than a week.** No decision needed on the baselines
themselves.

### The rest, in one table

Each row names the report that argues it. "Rec" is my recommendation; a blank means it is genuinely
yours to weigh.

| # | Question | Report | Rec |
|---|---|---|---|
| 9 | The About page, still "indefinitely procrastinated" (audit 1 #3) | member-surfaces | — |
| 10 | The PWA install tile, admin-only "for now" since 22 August | member-surfaces | open it |
| 11 | Letter reading pages have no Report / Edit / Delete | member-surfaces | product call |
| 12 | The person-row sweep (`docs/spec/person-row-audit.md` steps 3–4) | directory-profile | green-light |
| 13 | `LocationPicker`'s single mode — a lab-only demo | directory-profile-18 | drop |
| 14 | The two legacy city columns | directory-profile | after launch, `SELECT` first |
| 15 | `merge-cities` / `city-alias-scan` scripts | directory-profile | keep |
| 16 | The 51 bird glyphs as a sprite (audit 1 #13) — now measured at 44 KB raw / 12 KB gz on 39 routes | landing-mascot-avatars | prototype in a lab room first |
| 17 | The login bird (~85 KB) | auth-edge | keep; priced, no cut proposed |
| 18 | Phosphor icons ship six weights per glyph. **Verification refuted `dependency-diet-13`'s "client cost is near-optimal"**: `Tree`'s unused `thin` weight is present in the shell chunk on 39 non-lab routes. Per-route cost: `/feed` 25.7 KB, `/profile` 21.8, `/catchups` 21.4 | bundle-build-06 (the parent of #48) | do it with screenshots, or decline |
| 19 | Photo size parity on the Catch-up answer page | catchups | match the feed |
| 20 | The Collection's FormData fallback encodes at 1600 px / q80 while the direct path keeps 40 MP at q100 — a member who hits the fallback silently gets a smaller photograph | media-viewer-04 + collection | match the direct path, or say "saved at reduced size". `TRAPS.md:165-167` already names the direct path; the edit it needs is the fallback's exception |
| 21 | `/lab/crop`: the room calls itself throwaway, but `/lab/collection` now imports its specimens | lab + root-assets | move the specimens, then retire the room |
| 22 | `/lab/collection/swap` and `/lab/focus` | fresh-code + collection | archive in the registry |
| 23 | The album importer's fate, and three one-off scripts after their live checks — `sweep-stranded-originals`, `backfill-image-dimensions`, and `drive.mjs`'s scenarios. **Verification note: `backfill` cannot be judged without running its `SELECT`, and `scripts/README.md:73` keeps `import-places.mjs` as "run once; keep for a rebuild" — that is the counter-precedent** | collection-17 + fresh-code-12 + 14 | run each check, then delete |
| 24 | `drive.mjs`'s ten closed investigations (~365 lines of a 727-line file). Verification found the fixture the finding thought was missing **does** exist here, so one more scenario still runs | scripts-e2e-ci-05 | retire |
| 25 | Retire `phase9-probe` (`scripts-e2e-ci-06`) but **keep** `phase6` — it is the only thing proving a real sign-in survives a next-auth bump | scripts-e2e-ci | keep phase6 (differs from audit 1) |
| 26 | Four `.claude/agents` nobody references, plus the five imported ones unchanged since audit 1 that cost ~2.1k tokens in every session, forever | root-assets-12 + scripts-e2e-ci-12 | delete the three unused; CLAUDE.md's subagent table is deliberately three rows |
| 27 | `Image.greyscale`, computed on every feed image and deliberately never read | data-layer + collection | stop computing it, drop the column |
| 28 | `Photo.approvedAt` / `approvedById`, written and never read | collection | keep, and comment why |
| 29 | Catch-ups' `actions.ts` split (audit 1 asked; the report argues against) | catchups | record "no" |
| 30 | `draft` status and `Catchup.title` (carried from audit 1, unchanged) | catchups | — |
| 31 | Three off-ladder heading sizes (27 / 26 / 24 px) | duplication | bless one |
| 53 | ~~The privacy policy's "Last updated" predates its last edit~~ | member-surfaces-09 | **done** in `74cc61a`; it had to move when the retention row changed |
| 54 | The feed's loading skeleton draws a composer card that no longer exists — member-visible for about 300 ms | feed-posts-12 | fix it; it is a skeleton lying about the page |
| 32 | The letterhead's "keep in step" header and its lab variant | duplication + directory-profile | — |
| 33 | "group" wording in four Catch-up refusals; the plural ternary | duplication | leave the ternary |
| 34 | The lab importing `SPRINGS` from `motion.tsx` | duplication | fine |
| 35 | `ui/card`, maintained for one lab room while 70 files hand-write its class string; `ui/combobox`, 167 lines and ten exports for one caller | shell-primitives-04 + 08 | — |
| 36 | Costs-card constants in three copies | member-surfaces | fine; know where to edit |
| 37 | The Compare tab in analytics (audit 1 carry) | admin-analytics | keep |
| 38 | Could the public pages be prerendered? The root layout's theme cookie makes every route dynamic | member-surfaces + bundle-build | worth an experiment |
| 39 | `/guide`'s index is reachable only from its own child page | dead-code | link it from the account menu |
| 40 | Has `sweep-stranded-originals` been run its second time? | collection + scripts-e2e-ci | run, then delete |
| 41 | The `auth-first-frame` test's 19 styling pins exist because the landing hand-copies the login column | lib-tests | a shared fragment deletes both |
| 42 | The pinch-zoom tuning-literal pin | lib-tests | — |
| 43 | Close audit 1's planned "test survival" gate — the rule held for a year without it | lib-tests | close it |
| 44 | `admin.md` spec drift ×3 | admin-analytics + docs | — |
| 45 | **Confirm the Upstash keys are set in production.** The rate limiter fails open and no session can see your production config | dead-code | needs you |
| 46 | `Photo.subject` as a comma-joined `contains` where `professionTags` uses `text[]` + GIN | data-layer | a rework, not a cut |
| 47 | **Two full browser-automation stacks are installed** — Puppeteer 34.3 MB (exact: 18 packages, verified) and Playwright, whose exclusive subtree is **18.1 MB, not the 31.2 MB reported**. Both are used: the screenshot scripts are Puppeteer, the visual suite is Playwright | dependency-diet-12 (corrected) | consolidate on one, eventually |
| 48 | `@phosphor-icons/react` is 56.7 MB of `node_modules` for 20 icons — **the second-largest single package after `next`**, ahead of `posthog-js` and `lucide-react`, which the report ranked above it | dependency-diet-13 (corrected) | decide with #18, which is now the parent item |
| 49 | `resend` is one HTTP POST behind five packages, and the SDK's missing `AbortSignal` is already worked around | dependency-diet-08 | leave it; the swap buys little |
| 51 | `sonner` and the motion core are the only vendor code left riding every route that could conceivably move | dependency-diet-14 | leave both; priced for the record |
| 52 | `@paralleldrive/cuid2` stays parked, and the case for unparking it has weakened — verification found 27 call sites in 14 files, not the 17 reported, and ~1.3 MB not 2.2 MB | dependency-diet-09 | stay parked |
| 50 | **The `(main)` shell tier is 434 KB raw / 147 KB gz on 39–46 routes.** The report attributes it line by line and asks which parts are genuinely chrome | bundle-build-08 | read the attribution before Phase B, it decides how much B can reach |

## 5. Not-findings (verified intentional — do not re-litigate)

**Carried forward from audit 1 §5, re-checked this run where a lens touched them** (the full text is in the
audit-1 report; nothing below has changed): the comment mass is the product (only comments describing deleted
code are bloat — the fresh-code lens lists those line by line); `email-queue.ts` is not an outbox candidate; the lab ships no
JavaScript *component* to a member — re-proven chunk by chunk, and by chunk-count parity — **though
this run corrected the stronger "0 bytes" form of the claim: see ORCH-02**; its CSS and build-time
costs are new findings, not a reversal; the admin lib client/server pairs are real seams; the three search endpoints, the place trio, the
houses chain's lines, the cities500 gazetteer and the migrations folder all stay; the rule-test pattern is
deliberate; the delight features are kept; `DEMO_CLOSED_PATHS` and `SESSION_GAP_MIN` are honesty checks; there is
zero commented-out code in shipped source.

**Re-refuted at fix time in audit 1 and NOT reopened here** (every lens checked): the `withMember/withAdmin`
action-gate wrapper (27 preamble clones are the C-189 tripwire's contract and `auth()` is cached); `tsconfig`
`exclude` of `src/generated` and of the lab (Next's route types pull every page back in — measured again, one
file dropped); making the Sentry hook conditional (a one-line `telemetry: false` is the whole trim); the
DemoBar/VerifyEmailBanner dynamic half; a shared paged-list hook (the Collection's bidirectional pager makes it
wronger now); the admin audit-log skeleton; cuid2 → randomUUID (parked).

**New this audit.** Each was checked by a lens that wanted to cut it and could not. They are here so
the next audit does not spend a session re-deriving them.

- **The comment mass is not bloat, and this is now proved rather than asserted.** `lib-core-config`
  went looking for stale comments in `email-queue.ts` — 508 lines of code, 471 of comment, the worst
  ratio in the shipped tree — and found **exactly one** comment describing code that no longer exists,
  plus one block duplicated out of OPERATIONS.md. Its own verdict: *"the structural well for comment
  trimming here is genuinely dry."* Only comments describing *deleted* code are bloat, and Phase F
  lists those line by line.
- **The test suite has no vacuous tests.** `lib-tests` swept all 102 files: two declared no-ops, one
  guardless sweep, one dead guard — and nothing that passes without asserting. **Zero scratch files**,
  and every test file born since audit 1 carries a dated reason. The survival rule held for a year
  without the gate audit 1 planned to build, which is why closing that item is a recommendation.
- **Zero commented-out code in shipped source, for the second audit running.** 29 regex hits, all
  prose. Same for `console.log`: four hits, all inside comments.
- **`globals.css` has no dead tokens left.** `shell-primitives` re-grepped every token by hand. Audit
  1's cuts all landed; `dead-code-04`'s two pairs are the entire remainder. The `m`-namespace rule
  holds too: zero non-lab files import the full `motion` namespace.
- **Audit 1's three biggest bundle levers actually landed.** `posthog-js` is in the first-load set of
  **zero of the 100 built routes**; LazyMotion shipped (181 `m.` call sites, no strays outside the
  lab); the six dead dependencies and the Puppeteer download are gone. The lab leaks **0 bytes** of
  JavaScript — re-proved chunk by chunk *and* by diffing two whole builds.
- **Two dependency swaps refused, with the tracing to back it.** The AWS SDK is not worth replacing:
  `@aws-sdk` + `@smithy` are 1.31 MB of a 35.9 MB serverless function that already carries
  `@img/sharp-libvips` at 16.95 MB, and two scripts use `ListObjectsV2Command`, which a hand-signer
  would not cover. And **`bcryptjs` cannot be replaced at all** — 140 KB with zero transitive
  dependencies, and *the scrypt migration can never finish, because a dormant member's bcrypt hash can
  only be re-hashed on a successful sign-in that may never come.*
- **The 38 identical action preambles are the C-189 tripwire's contract, not duplication.** They are
  byte-identical with no drift, `auth()` is already cached, and `gate-coverage.test.mjs` refuses any
  non-async export in a `"use server"` file. The `withMember`/`withAdmin` wrapper stays refuted; every
  lens that could have re-proposed it was told not to, and none did.
- **The lab↔shipped clones are design history, not duplication.** A verifier re-parsed all 232 jscpd
  blocks: **29 pairs / 435 lines** (`lab-12`) is the right count; `duplication-21`'s 27 / 418 omits
  two and should be dropped. Both are registers, not proposals. The 63-line `chain-lines` ↔
  `houses-chain` pair *is* the experiment's control; a second-look kit must use the genuinely shipped
  tokens or the comparison it exists for is a lie.
- **The floor answers, recorded so nobody repeats the hunt**: 44 of 44 environment keys read; 14 of 14
  API routes called; every analytics loader field rendered; one rich-text pipeline in three files by
  design; keyset pagination implemented once; all three upload routes live, none legacy; the Catch-up
  lifecycle written once; one canonical email path; the three search endpoints, the place trio, the
  `cities500` gazetteer and the migrations folder all stay.
- **The repository root is clean.** All fifteen tracked files are root-pinned, and audit 1's five
  evictions held. The root problem is not clutter; it is one file's size.
- **The documentation that must not be touched**, named by the lens that read all 129 files:
  `TRAPS.md`, `hand-run-passes.md`, `lab-voice.md`, `demo.md`, `bugs.md`, `AI-WRITING-TELLS.md`,
  `leads-to-follow.md`, `docs/history/*`, SECURITY.md's machinery section and the WhatsApp curation
  trio. The relative links inside `docs/` are essentially clean — three hits, all false positives on
  `[id]` route syntax.

## 6. Coverage map

**Decomposition.** 16 territory readers, sized 2–9k lines so each could read every file it owns, plus
6 cross-cutting lenses (`fresh-code` over every file added since audit 1, `dead-code`, `duplication`,
`bundle-build`, `data-layer`, `dependency-diet`) for the questions that fall between territories. The
Collection rework and the shared photo primitives got their own readers because they are the largest
body of never-audited code. Every tracked file under `src/`, `scripts/`, `e2e/`, `prisma/`, `docs/`,
`public/`, `.claude/` and the config surface belongs to exactly one territory; the lenses overlap on
purpose, and §3b is what that overlap bought. Launched in waves of six with a done-list, newest code
first, so a crash lost the least.

**All 22 reports landed.** Four usage limits killed 23 agent launches across four runs and cost nothing
but wall-clock, because the brief requires every agent to write its report to disk before returning;
each relaunch passed the finished keys in a skip-list. `root-assets` and `docs` finished hours after
the run that spawned them died, which is why they are absent from the first verification wave.

**Tools run by the orchestrator** (raw output in `work/raw/`): `cloc` (7 cuts), `knip` ×4, `madge` ×2,
`jscpd` ×3, `tsc --noUnusedLocals/Parameters`, `dependency-cruiser` ×2, grep censuses (use-client,
dynamic imports, barrels, env keys, TODOs, commented-out code, console, type sludge, comment density),
`next build` ×4 (one baseline, three lab-free — of which one failed and became ORCH-03's evidence),
`next experimental-analyze`, a per-route first-load derivation, a stylesheet source attribution,
`tsc --extendedDiagnostics` ×4, and `node --test` timings. `type-coverage` crashes on Node 26 (a grep
census substituted); `scc` is not on npm, so `cloc` was used, matching audit 1's convention.

**Verification, in three layers.**
1. *Orchestrator spot-checks on every one of the 22 reports* — at least three claims each, read at
   HEAD, quoted in `work/findings.md`. All confirmed; two undercounts were corrected upward and one
   claim (`root-assets-05`'s registered hook) was corrected downward by me.
2. *Adversarial cluster verification* — **28 verifiers, all completed**, each told to default toward
   refuted. **381 verdicts over 348 of the 369 findings: 170 confirmed, 200 confirmed-with-correction,
   6 refuted sub-claims, 5 unverifiable without a database or a browser.** §3d has the ratio, the six
   refutations and the corrections that change a recommendation.
3. *Cross-lens agreement*, which is verification by construction — §3b lists 20 programmes where two
   or three independent readers reached the same finding by different methods.

**Completeness rounds** (the prompt asks for two consecutive dry ones). Round 1, by hand against the
compilation record, found roughly fifteen load-bearing findings the plan had dropped — the lazy image
viewer, the lab's Google fonts, the schema-vs-database drift, `ReportDialog` on every card. Round 2,
mechanical, diffed every id in the index against the report and found eleven more, including the
`BirdAvatar` `ring` prop and three of the four dead branches now in D11. Round 3 came at it from the
owner's side and found three. **Round 4 (findings) and round 5 (tools) were both dry**: every
structural T3/T4 finding is named or merged into a named row, every owner-decides finding is in §4,
and every tool in `work/raw/` is either a row of the §1a baseline, the evidence under a finding, or
explicitly cleared (`type-coverage`, which crashes on Node 26).

173 of the 369 ids are named in this report by hand; the rest are reached through a merged row
(`A + B`), a class row (E11, E12, F), or the index. That is deliberate — a report that lists 369 rows
is not a plan.

**Consciously left out, and why.**
- **Live database queries.** Every claim that rests on row counts carries the `SELECT` a fix session
  should run first; none was run here.
- **The signed-in browser measurement for `collection-01`** (does a filter press trigger a full RSC
  refetch?). It needs `DEV_LOGIN_SECRET` from `.env`, which the audit's own rules forbid this session
  to read. The finding's premise is confirmed at HEAD; only its consequence is unmeasured. Verdict:
  **unverifiable-needs-browser** — the fix session measures it first with chrome-devtools, counting
  `?_rsc=` GETs against action POSTs before and after commenting out the `replaceState` line.
- **21 of the 369 findings have no adversarial verdict** — the tail of three clusters that returned
  before enumerating every id. They carry the orchestrator's spot-checks but not an adversary's.
  Given that 54 % of the verified 348 needed a correction, assume the same of those 21.
- Running probes or Playwright suites; lab room interiors beyond classification depth; `sanan's stuff/`
  (named in three scripts, flagged, not entered).

## 7. Process

**What worked.** Writing the report to disk *before* returning it, imposed on every agent by the common
brief, is the only reason four usage limits cost nothing. Two agents died mid-write and left partials
dense enough to salvage into the record. Running territory readers and cross-cutting lenses over the
same tree, rather than partitioning cleanly, is what produced §3b — and three of the audit's five
biggest findings exist only because two lenses disagreed or agreed by different methods.

**What I would do differently.** The verification phase should have been launched in waves of three
against a smaller cluster count, so that a usage limit costs a fifth of the phase rather than four
fifths. And the two territories that arrived late (`root-assets`, `docs`) should have been in wave 1,
not wave 4: they turned out to hold the finding with the widest blast radius in the whole audit
(`docs-02`, the Collection image pipeline stated wrongly in the file `CLAUDE.md` sends a media session
to — and which an earlier draft of this report then overstated in the other direction, until a
verifier caught it).

**A gap in the decomposition, found by a verifier rather than a finder.** Sixteen territories and six
lenses covered every tracked file — except `CLAUDE.md` and `AGENTS.md` themselves, which sit at the
root and belong to `root-assets` by path but to nobody by subject. `root-assets-06` caught three wrong
tooling numbers in `CLAUDE.md`; a verifier working on the docs cluster found three more (lines 133,
237-238, 245). The instruction file that every session reads first is the one the ownership map made
nobody responsible for. A third audit should give it a territory.

**A correction to my own method, recorded because it cost a build.** I moved a build cache aside as
`.next-run1` inside a scratch worktree. `.gitignore`'s pattern is `.next-stale*/`, which does not match
it, and Tailwind — scanning the whole repository for want of `@source` scoping — walked a directory of
binaries and broke the build with CSS parse errors. I kept the failed run as ORCH-03's evidence rather
than discarding it, and withdrew the invalid CSS figure it had produced.

**What verification was actually worth.** Twenty-eight hostile readers were told to default to
*refuted*. **Not one whole finding fell, six sub-claims did, and 54 % carried a wrong detail.** That is the more useful number, and it is not the one I expected: the risk
in this codebase is not that a finding is invented, it is that its line range has moved. Several
corrections would have caused a production failure (`admin-analytics-07`'s `after()` move), a red
build (`dead-code-05`, `docs-12`), deleted live code (`dead-code-07`'s range), or a "fix" to a bug
that does not exist (`feed-posts-07`, `duplication-03`). A verification phase that only asked "is this
real?" would have passed every one of them.

**And a note against myself.** Of the five headline claims in §1c, I re-measured all five personally
and **two were wrong as drafted** — and a sixth claim of mine, that the lab costs members zero bytes,
was refuted outright by a verifier and corrected only because it challenged me — the gzip figures mixed KiB with decimal kB, and `shadcn`'s disk
cost was 92.3 MB in the report against 66 MB apparent / 79 MB allocated when I computed it. The
package count (234, 21.6 % of the lockfile) was exact. The lesson is the same one the verify phase
produced from the other direction: the claims survive, the numbers drift, and an orchestrator who
compiles without re-measuring is just a very expensive stapler.

**Honest structural-vs-cheap split** (the goal-sloc self-audit, and the reason SLOC is not the headline
number in §1b): counted from the index rather than estimated, **218 of the 369 findings are structural
and 151 are cheap — 59 %** — dead subsystems, relocations, deferred imports, query
collapses, dependency removals, three recurrence mechanisms — against 41 % hygiene. The hygiene half is worth doing and worth almost no lines. In this codebase the levers that
move real numbers are **bytes, dependencies, queries and build seconds**, not source lines, exactly as
audit 1's close-out concluded. Anyone who reports this work in lines removed will report it wrongly.
