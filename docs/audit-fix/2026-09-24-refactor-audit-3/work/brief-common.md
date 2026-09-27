# Common brief for every agent in refactor audit 3

You are one agent in a fan-out. Read this whole file before opening a single source file. Your
own charter (a territory or a cross-cutting lens) is in `work/charters/<key>.md`, and the prompt
that pointed you here names it. The report you write to disk is the deliverable; the orchestrator
compiles every report into one plan that a later campaign executes row by row, so precision now
saves hours later, and a verified, verbose finding beats a tidy, thin one.

---

## 1. What this is, and what it is not

This is the third formal, exhaustive **simplification audit** of a Next.js 16 alumni network for
Rishi Valley school, just before public release. It is **audit-only**. You identify, you verify,
you document. You do not fix. You do not change one line of application code, config, schema,
tests, docs or scripts. The only file you create is your own report.

The owner's intent, in his own words, which you should treat as the spec:

> "Codebases that are largely maintained by AI tend to bloat up significantly. That is a real
> problem, and it is a problem here. I have a codebase that is quite functional. Security is
> decently good. I'm getting ready to release it to the public, and just before doing that, I want
> one very formal set of simplifications.
>
> The kind of results I want: faster load times, fewer lines of code, a lighter faster app, reduced
> build times. None of this at the cost of functionality. It's cutting dead weight, or rewriting
> things in ways that are more efficient, smarter, more modular, instead of the bloaty or
> inefficiently written ways we have now. Same functionality, lighter app.
>
> I have no time frame. I don't care how long it takes. I just want it done well. Deploy
> simplification agents to get this job done, at whatever level of granularity you want — that is
> your call, not mine. You are the one actually doing it, so you decide whether it's one agent per
> feature area, three per area, or one per subsection. Usage is not much of a concern and time is
> not at all a concern.
>
> We are not fixing anything in this session. This is auditing: identify every place to simplify
> and write up a brief of every single thing, so that another session (or many sessions) can then
> address all of it. The agents report back to you; you compile a full report that will allow
> another session to address everything.
>
> I want some level of ownership from you, the orchestrator. Not zero. When you brief agents, you
> lose nuance — your brief is your interpretation, compressed. So carry the full intent into every
> agent brief, and when reports come back, own the compilation: check them, don't just staple them
> together.
>
> On skills and outside knowledge: many people have written very thorough instructions for exactly
> this kind of task. I don't want you to pick the best of them — I want to apply ALL of them.
> Append everything together so we get literally everything. And go one level above skills too:
> plugins, articles, techniques, research — anything other people have done that might be useful.
> When I ran my security audits, I appended multiple full audit prompts from different sources
> together, and it gave me really thorough results. Think: what is the goal here, and how do I best
> achieve it?"

And, from the first run, the part that widens the scope beyond `src/`:

> "Simplification is not just in code but also bloat, and effectively storage space of this
> folder. I'm having to delete a bunch of docs and a bunch of script files and a bunch of other
> files because they're just left over from previous tests and previous sessions. I just cleaned
> up a lot of stuff and deleted some 30-40,000 lines, and that shouldn't have needed to happen. I
> think stricter rules about which test scripts we keep would be good."

And on the root directory specifically, verbatim:

> "I don't want my root directory to be crowded. I understand that many of the things there have
> to be there, but just in case there's some unnecessary stuff: I very much appreciate a clean,
> well-maintained root directory, especially because that's the main part that I keep looking at.
> Critically analyse each thing that's there — whether it has to be there, whether it can be
> somewhere else — and make the root directory just a bit cleaner."

So: leftover probes, scratch tests, stale docs, screenshot piles, config that nothing reads,
dependencies nothing imports, generated files that are committed, multi-megabyte binaries in the
tree, and the root directory are all in scope. He is non-technical; the report must be executable
by an engineer (a later Claude session) without re-deriving anything, and readable in summary by
him.

On how you should think, also his words: "When you're conveying everything, all your ideas, all
your fears, it captures it better." Do not compress your reasoning into terse bullets in the
report. Say what you saw, why it matters, what you are unsure about. And: "If I just needed one
solution, then it's fine to be direct. But we don't know what we want, so we need a level of
creativity." **Your checklists below are a floor, not a ceiling. Hunt.** Where you are better
placed to judge something than the orchestrator is — and inside your territory you are — judge it,
and say so.

## 2. Hard rules (these bind you absolutely)

1. **Read-only.** No edits, no `--fix`, no formatter, no `git` commands that change state (no
   add/commit/stash/checkout/reset/clean/worktree). `git log`, `git blame`, `git ls-files`,
   `git diff <sha>..<sha> -- <path>`, `git show <sha>:<path>` are fine.
2. **Containment.** Every command runs inside `/Users/sanan/Documents/rv-connect/`. Never read
   `.env`, `.env.demo`, or anything under `sanan's stuff/`; you do not need them.
3. **Do not re-run the heavy tools.** No `npm run build`, `npm run analyze`, `npm run visual`,
   `npm run check`, `npx tsc`, `npx knip`, `npx jscpd`, Playwright, Puppeteer, Chrome or the dev
   server unless your charter grants it explicitly (the bundle, runtime-perf and scripts lenses
   have specific grants). Not because the machine cannot take it — it can — but because the
   orchestrator already ran every tool and the outputs are on disk (section 7); re-running them is
   waste. You may run `grep`/`rg`, `wc`, `ls`, `find`, `git log/blame/diff/show`, `awk`, `sed -n`,
   `node -e` one-liners over files, `du`, `stat`, `file`, `identify`/`sips` on images.
4. **No database access.** No prisma commands, no SQL, no running scripts under `scripts/`. The
   orchestrator pulled read-only catalog statistics for you (`raw/db-*.json`). Reading the scripts
   is your job if they are in your territory; running them is not.
5. **Other sessions share this working tree.** A `next dev` on :3000 is someone else's, and a peer
   session is running a *bug* audit in `docs/audit-fix/2026-09-24-bug-audit-3/` right now. Never
   touch that folder, never read its reports as evidence, never kill a process. Uncommitted changes
   you did not make are their work in progress; audit around them. If a file you read has
   uncommitted edits (`git status --short <file>`), say so in your report.
6. **No package installs, nothing over the network** except web search/fetch if your charter
   explicitly grants it (the dependency lens does; nobody else).
7. **Your report file is the only thing you write**, at the exact path in your charter. Write it
   in full BEFORE returning (the session may die; a report on disk survives, a return value does
   not). If you are running long, write a partial report early and overwrite it later. Never write
   anywhere else — not `/tmp`, not the repo root, nowhere. A report is complete when it ends with
   its `## Metrics` section; the orchestrator uses that to know you finished.

## 3. What this codebase is (facts you need)

- Next.js 16.3.x App Router (Turbopack), React 19, Tailwind v4, shadcn/ui (base-nova on
  `@base-ui/react`), Prisma 7 with `@prisma/adapter-pg` on Supabase Postgres (Mumbai; ONE database
  serves production and local dev), NextAuth v5 beta (JWT sessions, email + password), images on
  Cloudflare R2 via `src/lib/storage.ts` behind `images.rishivalley.space`, deployed to Vercel.
  Server Actions for mutations; API routes only for auth, webhooks, uploads and crons. Sentry
  server-only. PostHog proxied through `/ingest`. TypeScript 5.9.3 (`"typescript": "^5"`; an earlier draft of this brief said 7 — wrong, corrected 2026-09-24 07:55).
- **Read `CLAUDE.md` and `AGENTS.md` first** (repo root): they are the project's rules and bind
  every proposal you make (no `transition-all`, CTAs are Canopy pills, "Rishi Valley" never
  "RV Connect", `loading.tsx` on every async route, one-spine `ContentColumn`, the repo root is
  closed, schema changes go through `prisma/migrations-manual/`, lab rooms are `page.lab.tsx`).
- `docs/spec/DESIGN-SYSTEM.md` is the design rulebook; `docs/spec/<area>.md` the deep spec per
  area (admin, avatars, catchups, demo, directory, guide, letters, mascot, media, profile,
  lab-voice, hand-run-passes); `docs/TRAPS.md` stack facts that cost sessions; `docs/OPERATIONS.md`
  every non-application tool; `docs/ROADMAP.md` what things were supposed to be;
  `docs/planning/FEATURES.md` parked ideas; `docs/planning/bugs.md` the bug tracker. Read the spec
  for your territory before judging anything in it "unnecessary".
- **Sizes today (cloc `--vcs=git`, code lines, 2026-09-24, HEAD `70570bcd`):** whole repo
  286,820 (TypeScript 122,795; Markdown 89,737; JSON 43,491; JavaScript 21,609; SQL 1,535;
  Prisma 681; CSS 518). `src/app` non-lab 13,672 TS in 138 files (51 `page.tsx`, 18 `route.ts`,
  12 `actions.ts`, 35 `loading.tsx`); `src/app/lab` 49,548 TS in 187 files + **18,632 lines of
  JSON in 12 fixture files** (66 `page.lab.tsx`, 65 registered rooms); `src/components` 41,014 TS
  in 296 files (+829 JS in 14 tests); `src/lib` 16,671 TS in 169 files + 12,375 JS in 110
  `*.test.mjs`; `scripts/` 7,973 JS in 70 files + 625 TS in 5; `e2e/` 916 TS in 10 files;
  `prisma/` 681 schema lines + 1,535 SQL in 88 migration files; `docs/` 71,650 MD lines
  (audit-fix 34,956 · planning 18,345 · history 14,141 · spec 4,208 · the rest); `.claude/`
  15,195 MD in 93 files. Comment-to-code ratios: lib 0.83, collection 0.80, api 0.68, directory
  0.67, common 0.50, (main) 0.48, admin 0.27, lab 0.23.
- **Growth since audit 2 (tree `72b5a1d`, 2026-09-03 → HEAD, 347 commits):** whole-repo code
  lines 199,028 → 286,820; TS 100,033 → 122,795; MD 51,023 → 89,737; JSON 22,428 → 43,491.
  499 files added, 119 deleted, 1,159 touched (`raw/files-added-since-audit2.txt`,
  `raw/diff-numstat-since-audit2.txt`). The lab grew +39,610 lines; `src/lib` +16,173;
  `src/components` +16,088 / −8,571; `docs/` roughly +38,700 MD lines. **Tracked weight 32.19 MB →
  44.90 MB** (1,632 files): `e2e/__screenshots__` 12.02 MB, `public/images` 11.36 MB (142 files;
  three Catch-up cover photographs are 1.5–3.2 MB each), `docs/audit-fix` 4.16 MB,
  `src/app/lab` 3.44 MB, `public/lab` 2.01 MB (tracked and deployed), `docs/planning` 1.86 MB,
  `docs/history` 1.16 MB.
- **`npm run check`** = TypeScript + ESLint + shape/colour protocol + lab registry + 130
  `*.test.mjs` files (all green) + dependency advisories + security status board. **45.9 s** at
  HEAD (24.8 s at audit 2 with 102 test files — the machine was shared, but the doubling is itself
  a lead for the lib-tests and scripts territories). `npm run visual` = routes × 2 viewports
  against `e2e/__screenshots__/` (24 PNGs, 12 MB, tracked on purpose). `npm run verify:crawl`
  walks every route.
- **Build baseline:** `raw/build.txt` (wall time, phase timings, the route list) and
  `raw/build-setup.txt` (load average before/after). `raw/analyze/` holds Next's own
  `experimental-analyze --output` data when present. The bundle lens decodes per-route first-load
  bytes from it into `raw/route-bundle-stats.json`; territory agents read that file rather than
  the build.
- The unit tests are plain `node:test` files discovered by glob; many are "rule" tests that read
  source as text and assert a pattern (regression pins, each carrying an audit id like C-189). A
  pin is not bloat; a pin whose subject is gone is.
- **`/lab` nuance (important):** the 65 registered rooms are intentional, owner-approved design
  history, indexed in `src/app/lab/_registry.ts`; `npm run check` fails if a room is not
  registered. Since 2026-09-08 (audit-2 row G1) every room is a `page.lab.tsx`, and
  `next.config.ts` drops that extension from `pageExtensions` on the public demo's build **and only
  that build** — the owner's own production build keeps the lab. Do NOT write rooms up as dead code
  to delete. In scope: whether lab code leaks into non-lab client bundles or the shared CSS; what
  the lab costs the production build in seconds and megabytes (measure, do not assume); whether
  shipped pages import from lab code; whether lab code duplicates a shipped primitive it was the
  prototype of; whether a room is a finished experiment whose verdict has shipped; whether a
  fixture is far larger than the room needs. Any proposal to remove, freeze or archive a room is an
  **owner call**, never a recommendation.
- **The demo nuance:** a separate public demo deployment (`DEMO_MODE=1`) has a three-layer
  default-deny write system (`src/proxy.ts`, `src/lib/demo.ts`, `src/lib/call-action.ts`).
  `src/lib/security-regressions.test.mjs`, `gate-coverage.test.mjs` and the `*-rule.test.mjs`
  files pin security behaviours. Every proposal must keep those green; say explicitly when a
  proposal touches a pinned file and name the pin.
- **The hand-run passes** (`docs/spec/hand-run-passes.md`): `scripts/dev/tag-photos-*.mjs`,
  `tag-professions-*.mjs` and `import-album.mjs` are a shape-conforming family enforced by
  `scripts/qa/hand-run-passes.test.mjs`. Duplication between them may be the protocol; the test
  says what must match. Read the spec before calling their sameness a clone.
- **Where things stand after audit 2's campaign (ran 2026-09-05 → 09-08, `docs/audit-fix/2026-09-03-refactor-audit-2/fix-prompt.md`, board at the top):**
  phases A (free money), B (bundle levers), C (query floor), D (switched-off subsystems, minus what
  the owner declined), G1/G7 (lab out of the demo build) and H shipped. **E** (de-duplication) is
  PARTIAL: `E7b`, `E8`, `E11`'s mascot + UI-kit + collection tails, and `catchups-02` remain.
  **F** (hygiene) is PARTIAL: `docs-17` to `docs-21` and `scripts-e2e-ci-12` remain. **Parked by
  the owner (Q27):** `G3, G4, G5, G6, G10, G11` — written into `docs/planning/FEATURES.md`
  instead. **Declined:** `D2` (the landing showcase stays), `D3`, the reduced-motion row (Q11).
  If your territory holds one of these rows, report its CURRENT state in one paragraph (done?
  moot? still open?) under "Audit carry-overs" — do not re-argue it.

## 4. What audits 1 and 2 already settled — do not re-litigate without new evidence

Both reports' §5 are binding (`docs/audit-fix/2026-08-25-refactor-audit-1/report.md`,
`docs/audit-fix/2026-09-03-refactor-audit-2/report.md`). The list, so you do not have to open them:

- **The comment mass is the product, and this was proved, not asserted.** Audit 2 went looking for
  stale comments in `email-queue.ts` (the worst ratio in the tree) and found exactly one. Only
  comments describing *deleted* code, or restating the next line, are bloat. A comment that carries
  a reason, a date, an owner quote, a measured number or an audit id is NOT bloat. Distinguish
  them, and quote one of each when you make the call.
- `email-queue.ts` is not an outbox candidate; the admin lib client/server pairs are real seams;
  the three search endpoints, the place trio, the houses chain's lines, the `cities500` gazetteer
  and the migrations folder all stay; the rule-test pattern is deliberate; the delight features
  (konami, dark gauntlet, `/hoopoe`, stray hair, "12 birds not 14", the logo triple-click) are kept;
  `DEMO_CLOSED_PATHS` and `SESSION_GAP_MIN` are honesty checks.
- **Refuted at fix time, twice:** the `withMember`/`withAdmin` action-gate wrapper (the identical
  action preambles are `gate-coverage.test.mjs`'s C-189 contract, `auth()` is React-`cache()`d so
  the double call is free, and a non-async export in a `"use server"` file is exactly what the
  sweep refuses); a `tsconfig` `exclude` of `src/generated` or of the lab (Next's generated route
  types pull every page back in — measured twice); making the Sentry hook conditional; the
  DemoBar/VerifyEmailBanner dynamic half; a shared paged-list hook; the admin audit-log skeleton;
  cuid2 → randomUUID; the AWS SDK swap (1.31 MB of a 35.9 MB function that already carries
  libvips at 16.95 MB, and two scripts need `ListObjectsV2`); replacing `bcryptjs` (the scrypt
  migration can never finish for dormant members).
- **The lab ships no JavaScript to a member** (re-proved chunk by chunk, twice), though its CSS
  share of the one shared stylesheet was real (−73 KB) and has since been addressed by the
  campaign — re-measure rather than assume it stayed fixed.
- The test suite has no vacuous tests (as of audit 2 — 130 files now, 102 then; the 28 new ones
  are unaudited). Zero commented-out code in shipped source, two audits running (14 regex hits at
  HEAD to triage, `raw/commented-out-code.txt`). `globals.css` had no dead tokens left.
- The repository root's tracked files are all root-pinned (15 today); audit 1's five evictions
  held. Re-check every entry anyway — that is the owner's verbatim ask — but know what was found.
- The documentation that must not be touched: `TRAPS.md`, `hand-run-passes.md`, `lab-voice.md`,
  `demo.md`, `bugs.md`, `AI-WRITING-TELLS.md`, `leads-to-follow.md`, `docs/history/*`,
  SECURITY.md's machinery section and the WhatsApp curation trio.

**Two standing warnings from audit 2's verification, which apply to your own findings too:**
1. **Every "no caller passes this prop" or "nothing imports this" claim needs a lab re-grep.**
   The lab is typed and compiled in the owner's build; `GetInTouch` had seven callers, five in lab
   rooms. Grep `src/app/lab` before you call anything unreferenced.
2. **Line numbers drift.** 54 % of audit 2's verified findings carried a wrong detail, almost all a
   moved range. Quote enough of the code that a fixer can find it after it moves; give the range
   AND an anchor (a function name, a string literal).

Audit 1's most important lesson, in the orchestrator's words at close-out: **"Deduplication cannot
save lines in this codebase"** — replacing five copies with one shared function costs a docblock,
five imports and five call sites, because the house rule is that every constant is argued for in a
comment. Its two dedupe phases were 65 commits for −90 lines. So: **project your savings in the
unit that fits** — clones removed, files removed, dependencies removed, tracked bytes, client-bundle
bytes, CSS bytes, build seconds, database objects, queries per page load, requests per page — and
give a line count only when it is honest (dead code, placeholders, relocations out of shipping
paths, fixtures that can shrink). A finding that says "0 lines, but one fewer place for the bug"
is a good finding when the clone is real.

## 5. Methodology — apply ALL of it; each list is a floor, not a ceiling

### 5a. The reduction order (goal-sloc). Tag each finding with its phase.
1. **dead** — files/exports/functions/deps/CSS tokens/DB columns/indexes with no references
   (tool-verified, then confirmed by you; grep alone never declares death).
2. **placeholder** — fully plumbed subsystems that do nothing (a flag hardcoded off, a method that
   is a logged no-op, a table nothing reads, a route nothing links to, a prop no caller passes, an
   option every caller leaves at its default, an index no query uses).
3. **relocate** — dev/test/QA scaffolding living in shipping paths; misplaced dependencies (runtime
   vs dev); code in the wrong folder; lab-born code that shipped without its lab half being
   retired; lab assets under `public/` that deploy to production.
4. **dedupe** — genuine duplication: repeated blocks, N near-identical files, a component that
   re-implements a shared primitive, a query written twice with drift. Tolerate duplication across
   module boundaries when coupling would cost more; say when that is your judgement.
5. **hygiene** — restate-the-code comments, AI narration, dead options, unnecessary intermediates,
   stale comments describing code that moved. Legitimate but the cheapest lever; it must never be
   the headline.
6. **rewrite** — clean-room rewrite of a worst file against its tests. Only when the tests are a
   faithful spec; say whether they are.
7. **architecture** — collapse redundant layers, kill antipatterns, deepen modules. Usually
   line-neutral; propose for quality, with the risk stated and the payoff named.
8. **library** — hand-rolled code a dependency already does better (or the reverse: a dependency
   doing what 20 lines of native code would).

### 5b. Anti-gaming. Every finding is **structural** (dead/placeholder/relocate/dedupe/rewrite/
architecture/library) or **cheap** (comment trimming, line packing, one-line helper extraction).
Estimate savings honestly, in the right unit (section 4). Never propose deleting a feature, a doc
the owner reads, or error handling merely because it has not fired. Never propose editing the
measuring tools to exclude paths. If your territory is mostly cheap wins, say so plainly — "the
structural well is dry here" is a legitimate, valuable finding.

### 5c. Dead-code sweep rules
- Hunt: unused imports/exports/files/deps (knip), unreachable code after return/throw, branches
  impossible by type narrowing, functions never called, commented-out blocks, env/feature flags
  always-true/always-false, API routes made redundant by a server action, components superseded by
  shared primitives (`create-post-form`, `PostCard`, `FeedColumn`, `ContentColumn`, `BirdAvatar`,
  `LoveButton`, `Button`, `PhotoCarousel`, `ImageViewer`, `ConfirmDialog`, the shared bottom sheet
  of 2026-09-15), CSS classes/tokens in `globals.css` nothing uses, Prisma models/columns/indexes
  nothing reads (`raw/db-indexes-live.json` has live scan counts), migration SQL for columns since
  dropped, props no caller passes, test pins whose subject no longer exists, `loading.tsx` files
  whose page is no longer async.
- Safety: never mark dead anything reachable via dynamic import, string reference, reflection, or
  a framework convention (Next `generateMetadata`, `loading.tsx`, `error.tsx`, `forbidden.tsx`,
  route files, `instrumentation.ts`, `proxy.ts`, `manifest.ts`, the lab registry, `next-auth.d.ts`,
  Playwright/`node:test` discovery globs, `scripts/README.md`'s ledger, `pageExtensions`). Check
  `git log --follow -- <file>` and `git log -S<symbol>`: untouched 6+ months with zero references is
  likely dead; added last week with zero references is probably in-progress work — say which.
- Each finding names the verification that proves it safe.

### 5d. Simplification pass (per file, per function)
Nested conditionals → guard clauses; max ~3 indentation levels; a comment explaining a block means
the block wants to be a function with that name; complex conditionals → named booleans or lookup
tables; repeated logic → shared utility (with the coupling caveat); no nested ternaries; kill
one-line wrapper abstractions; delete comments that restate code. "Simpler" means easier to
understand on first read, never fewer characters. Follow the repo's own idiom (CLAUDE.md, the
surrounding code); the repo wins over any imported style.

### 5e. The six LLM-bloat signatures (scan for all six in every file)
1. single-use helper functions that should be inlined;
2. type/interface definitions for internal shapes used once;
3. defensive try/catch around code that cannot recoverably throw;
4. unnecessary intermediate variables;
5. over-abstraction: config objects, factories, options params, registries with one caller;
6. comments that narrate the obvious.
Plus the React-specific ones: `useEffect` that mirrors props into state, `useMemo`/`useCallback`
with no measurable benefit, prop drilling a composition would remove, client components whose only
client need is a leaf, state that could be derived, refs that could be state (or the reverse),
effects that run on every render because their deps are recreated, a `"use client"` file that
imports a server-only module.

### 5f. Next.js 16 performance levers (the bundle lens owns these; territory agents flag what they
see in their files)
- Barrel files: two internal barrels exist (`src/lib/magazine/index.ts` — new since audit 2 — and
  `components/guide/chapters/index.tsx`).
- `"use client"`: 341 files (214 outside lab). For each in your territory: does it need
  state/effects/browser APIs, or only a leaf inside it? Does it import a server-only lib?
- `next/dynamic` / `import()`: 84 sites (83 outside lab). Are dialogs, editors, the map stack
  (`d3-geo`, `d3-zoom`, `d3-selection`, `topojson-client`), admin-only panels, the image viewer,
  the crop tool, the recorder, and the 50-bird SVG set behind interaction where they can be?
- `experimental.optimizePackageImports` in `next.config.ts` — check coverage.
- Images through `next/image`/Sharp or the R2 image domain; fonts via `next/font` with subsets;
  no strays; nothing multi-megabyte served straight from `public/`.
- The shared stylesheet: which of its rules exist only because of lab files? (Re-measure.)

### 5g. Tiering (every finding gets one): **T1** safe delete or move, minutes, near-zero risk;
**T2** small fix, one file or one concept, low risk; **T3** refactor across files, needs
tests/visual run; **T4** architecture or product-level, needs owner or a design decision. And the
calibration from the 15,451-instance agentic-refactoring study (arXiv 2511.04824): AI executes
localized and medium refactorings reliably and is weak at design-level changes, so mark each
finding **autonomous** (a later session can just do it) or **owner** (a judgement call: feature
cuts, lab rooms, dependency swaps with UX impact, anything a member sees).

### 5h. The uncomfortable macro question
Is there a feature, subsystem, route, script, doc, table or lab room in your territory whose
existence no spec defends anymore? Those go in your report under "Owner decisions", written in
plain non-technical language with your recommendation. Never as a silent cut. Write each one the
way he will be asked — five lines: *What I'd change* · *What you'd notice* (member-facing, or
"nothing, this is invisible") · *If I guess wrong* · *Options* in plain words · *the answer to
take if he doesn't reply*. No jargon, no file paths in the question; put ids in a trailing tag.

## 6. How to hunt

- **Read every file in your territory in full** unless your charter says otherwise. Skimming is
  how bloat survives audits. If the territory is too big to finish, write the report for what you
  did read and list the rest under "Not read" so the orchestrator sends another agent; never
  pretend coverage.
- Before calling anything unnecessary, check the spec for your area and `git log -3 -- <file>` for
  the reason it exists. This repo records reasons unusually well; use them.
- **The newest code is the likeliest bloat.** 347 commits landed since audit 2. Read files in
  `raw/files-added-since-audit2.txt` with extra suspicion: they have never been audited. The
  Catch-ups rework, the comment section, the loading-screen series (2026-09-21), the Collection's
  screen copies (2026-09-23), the magazine engine, the valley and years rooms, the calling card,
  the composer redesign, the analytics rework and the admin review room are all post-audit-2.
- Use the raw tool outputs (section 7) as leads, then open the file and confirm. A knip line is a
  claim; your confirmation is the finding.
- Think in numbers. "This file is 1,469 lines, of which ~300 are three near-identical reducers that
  one 90-line reducer with a `scope` parameter would replace" is a finding. "This file is long" is
  not.
- Look across your files for the same thing written twice, and across the boundary of your
  territory for the same thing your neighbour probably has (put those under "For other lenses"
  with the file names; the orchestrator merges).
- Do not pad. Ten verified findings beat forty speculative ones. But do not stop early either: the
  owner would rather have 300 real items across the whole report than a tidy 60.
- Include **not-findings**: things that look like bloat and are verified intentional, with the
  spec line or commit that defends them, so no future audit re-litigates them.

## 7. Raw tool output on disk (`docs/audit-fix/2026-09-24-refactor-audit-3/work/raw/`)

Grep these for your paths instead of re-running anything:
- `cloc-summary.txt`, `cloc-by-file.csv` (language,file,blank,comment,code), `comment-density.txt`
  (top-40 non-lab TS files by comment/code ratio + per-directory ratios)
- `knip-repo-plus-lab.txt` — **the authoritative run**: the repo's own `scripts/qa/knip.jsonc`
  plus `src/app/**/page.lab.tsx` as entries. 7 unused files (five are the landing showcase family
  the owner chose to keep, audit-2 Q1; two are Catch-ups files), 187 unused exports (mostly lab),
  30 unused types, `@prisma/client` flagged (false positive, the generated client imports it),
  `server-only` "unlisted" in three files (false positive: Next aliases it, the package need not be
  installed), three poppler binaries unlisted for `scripts/dev/print-magazine.mjs`.
  `knip-repo-config.txt` is the repo config as it stands — it reports 197 unused files because it
  does not know about `page.lab.tsx`, which is itself a finding for the scripts territory.
  `knip.txt`/`knip-production.txt`/`*-production.txt` are noisier variants; ignore unless curious.
- `tsc-unused.txt` (2 hits), `madge-circular.txt` (**1 real cycle**:
  `app/(main)/collection/actions.ts ↔ lib/river-geometry.ts`), `madge-orphans.txt` and
  `madge-orphans-filtered.txt` (5 after framework files are removed)
- `depcruise.txt` (4 "errors": the cycle above + 3 `server-only` resolver artefacts; 13 orphan
  warnings, all e2e specs and the like), `depcruise-metrics.txt` (fan-in/fan-out per module)
- `jscpd.txt` (src+scripts, tests excluded, `--min-tokens 50 --min-lines 5`: **325 clones · 4,812 lines · 2.44 %** — audit 2 measured 232 · 2,888 · 1.82 %, audit 1 closed at 174 · 1.47 %; every clone listed
  with both locations; `jscpd-json/jscpd-report.json` is the same data as JSON),
  `jscpd-tests.txt` (the `*.test.mjs` files: 3 clones), `jscpd-e2e.txt` (5 clones)
- `type-sludge.txt` (any / as-unknown-as / eslint-disable / as-object sites, non-lab src, with lab
  counts at the end), `env-flags.txt` (every `process.env.X` with counts), `todos.txt` (3),
  `commented-out-code.txt` (14 regex candidates, most will be prose), `console-log.txt` (8)
- `use-client.txt` (341 files), `dynamic-imports.txt` (84 sites), `barrels.txt` (2)
- `build.txt` (baseline build log + route table + timings), `build-setup.txt`, `analyze/`
  (Next's bundle-analyzer data, when present), `route-bundle-stats.json` (per route first-load
  bytes, written by the bundle lens — may not exist yet when you start)
- `tracked-bytes.txt` (every tracked file, bytes, largest first), `tracked-files.txt`
- `files-added-since-audit2.txt` (499), `files-deleted-since-audit2.txt` (119),
  `diff-numstat-since-audit2.txt` (1,159 files with +/−)
- `routes.txt` (every `page.tsx`, `page.lab.tsx`, `route.ts`)
- `db-indexes-live.json` (128 indexes with `idx_scan` counts and bytes, live production),
  `db-tables-live.json` (41 tables: live/dead rows, seq/idx scans, bytes), `db-columns-live.json`
  (every column per table, to diff against `schema.prisma`), `db-statements-live.json` (top 120
  statements by total time from `pg_stat_statements`), `db-stats-reset.json` (when the counters
  last reset — an `idx_scan` of 0 only means something since then)
- `check-baseline.txt`
- `type-coverage` crashed on Node 26 (third audit running); `type-sludge.txt` is the substitute.

## 8. Finding format (use exactly this; the orchestrator parses it)

```
### <key>-NN - <short imperative title>
- **Where**: `path/file.ts:120-168` (every location; ranges, not just a file; plus an anchor
  such as the function name or a string literal, because line numbers drift)
- **Phase**: dead | placeholder | relocate | dedupe | hygiene | rewrite | architecture | library
- **Tier**: T1 | T2 | T3 | T4     **Class**: structural | cheap     **Decides**: autonomous | owner
- **Evidence**: the tool line, the excerpt, the grep count, the git log line — whatever proves it.
  Quote code sparingly but precisely.
- **What to do**: concrete steps a later session can execute without re-analysis (which lines go,
  what replaces them, which imports change, which test to update, which pin to move).
- **Saving**: in the honest unit — ~N lines / N files / N KB client JS / N KB CSS / N s build /
  N deps / N clones / N queries per load / N requests per page / N DB objects / N tracked KB.
  "0 lines, clarity only" is a valid answer for architecture items.
- **Risk & gate**: low | medium | high, and the exact proof: `npm run check`, `npm run visual`,
  `npm run verify:crawl`, a named route to open, a named test file that must stay green,
  `security-regressions.test.mjs`, a live-DB SELECT the fix session must run first (write it).
- **Confidence**: high | medium | low, and the one thing that would change your mind.
- **Notes**: fears, alternatives you rejected, related findings (by id), anything the fixer should
  know. Be verbose here, not above.
```

## 9. Report file structure (write to the path in your charter)

```
# <key> - refactor audit 3 report
Agent charter in one paragraph. Date. Files in territory: N; read fully: N.

## Coverage
- Read fully: <list or glob>
- Skimmed (why): ...
- Not read (why): ...
- Uncommitted edits seen (someone else's WIP): ...

## Summary
5-10 lines: the shape of this territory, the biggest wins in the right units, the
structural-vs-cheap split, what surprised you, what earlier audits left that is now moot.

## Findings
(section 8 format, numbered <key>-01 upward, biggest structural wins first)

## Owner decisions
(the five-line format from 5h, one per decision, with your recommendation as the default)

## Not-findings
(looked like bloat, verified intentional, with the defending spec/commit/comment)

## Audit carry-overs in this territory
(state of each open owner decision, PARTIAL row or refuted row from audits 1 and 2 that touches
your files: one line each)

## For other lenses
(things outside your territory you noticed: file + one line each)

## Metrics
Lines read; comment-heaviest files in territory; biggest files; anything countable.
```

Then return the short structured summary the prompt asks for. The report on disk is the
deliverable; the summary is only a pointer.
