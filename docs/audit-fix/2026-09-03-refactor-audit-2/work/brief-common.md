# Common brief for every agent in refactor audit 2

You are one agent in a fan-out. Read this whole file before opening a single source file. Your
own charter (a territory or a cross-cutting lens) is in the prompt that pointed you here. The
report you write to disk is the deliverable; the orchestrator compiles every report into one
plan that later sessions execute item by item, so precision now saves hours later, and a
verified, verbose finding beats a tidy, thin one.

---

## 1. What this is, and what it is not

This is the second formal, exhaustive **simplification audit** of a Next.js 16 alumni network
for Rishi Valley school, just before public release. It is **audit-only**. You identify, you
verify, you document. You do not fix. You do not change one line of application code, config,
schema, tests, docs or scripts. The only file you create is your own report.

The owner's intent, in his own words, which you should treat as the spec:

> "Codebases that are largely maintained by AI tend to bloat up significantly. That is a real
> problem, and it is a problem here. I have a codebase that is quite functional. Security is
> decently good. I'm getting ready to release it to the public, and just before doing that, I
> want one very formal set of simplifications.
>
> The kind of results I want: faster load times, fewer lines of code, a lighter faster app,
> reduced build times. None of this at the cost of functionality. It's cutting dead weight, or
> rewriting things in ways that are more efficient, smarter, more modular, instead of the
> bloaty or inefficiently written ways we have now. Same functionality, lighter app.
>
> I have no time frame. I don't care how long it takes. I just want it done well. We are not
> fixing anything in this session. This is auditing: identify every place to simplify and
> write up a brief of every single thing, so that another session (or many sessions) can then
> address all of it.
>
> I want some level of ownership from you, the orchestrator. When you brief agents, you lose
> nuance — your brief is your interpretation, compressed. So carry the full intent into every
> agent brief, and when reports come back, own the compilation: check them, don't just staple
> them together."

And, from the first run, the part that widens the scope beyond `src/`:

> "Simplification is not just in code but also bloat, and effectively storage space of this
> folder. I'm having to delete a bunch of docs and a bunch of script files and a bunch of
> other files because they're just left over from previous tests and previous sessions. I
> just cleaned up a lot of stuff and deleted some 30-40,000 lines, and that shouldn't have
> needed to happen. I think stricter rules about which test scripts we keep would be good."

And on the root directory specifically: "I very much appreciate a clean, well-maintained root
directory, especially because that's the main part that I keep looking at."

So: leftover probes, scratch tests, stale docs, screenshot piles, config that nothing reads,
dependencies nothing imports, generated files that are committed, and the root directory are
all in scope. He is non-technical; the report must be executable by an engineer (a later
Claude session) without re-deriving anything, and readable in summary by him.

On how you should think, also his words: "When you're conveying everything, all your ideas,
all your fears, it captures it better." Do not compress your reasoning into terse bullets in
the report. Say what you saw, why it matters, what you are unsure about. And: "If I just
needed one solution, then it's fine to be direct. But we don't know what we want, so we need
a level of creativity." Your checklists below are a floor, not a ceiling. Hunt.

## 2. Hard rules (these bind you absolutely)

1. **Read-only.** No edits, no `--fix`, no formatter, no `git` commands that change state (no
   add/commit/stash/checkout/reset/clean/worktree). `git log`, `git blame`, `git ls-files`,
   `git diff <sha>..<sha> -- <path>` are fine.
2. **Containment.** Every command runs inside `/Users/sanan/Documents/rv-connect/`. Never read
   `.env`, `.env.demo`, or anything under `sanan's stuff/`; you do not need them.
3. **No heavy processes.** Do NOT run `npm run build`, `npm run analyze`, `npm run visual`,
   `npm run check`, `npx tsc`, `npx knip`, Playwright, Puppeteer, Chrome, the dev server, or
   any MCP browser tool. The owner's machine has hung under parallel heavy processes and up to
   six agents run at once. The orchestrator already ran every tool; the outputs are on disk
   (section 7). You may run `grep`/`rg`, `wc`, `ls`, `find`, `git log/blame/diff`, `awk`,
   `node -e` one-liners over files, `head/sed`, `du`, `stat`.
4. **No database access.** No prisma commands, no SQL, no running scripts under `scripts/`.
   Reading them is your job if they are in your territory; running them is not.
5. **Another session shares this working tree** (a `next dev` on :3000 is theirs, and other
   Claude sessions are working). Uncommitted changes you did not make are their work in
   progress; audit around them and never touch them. If a file you read has uncommitted edits
   (`git status --short <file>`), say so in your report.
6. **No package installs, nothing over the network** except web search/fetch if your charter
   explicitly grants it (the dependency lens does; nobody else).
7. **Your report file is the only thing you write**, at the exact path in your charter. Write
   it in full BEFORE returning (the session may die; a report on disk survives, a return value
   does not). If you are running long, write a partial report early and overwrite it later.
   Never write anywhere else — not `/tmp`, not the repo root, nowhere.

## 3. What this codebase is (facts you need)

- Next.js 16.3.3 App Router (Turbopack), React 19.2.4, Tailwind v4, shadcn/ui (base-nova on
  `@base-ui/react`), Prisma 7 with `@prisma/adapter-pg` on Supabase Postgres (Mumbai; ONE
  database serves production and local dev), NextAuth v5 beta (JWT sessions, email +
  password), images on Cloudflare R2 via `src/lib/storage.ts`, deployed to Vercel. Server
  Actions for mutations; API routes only for auth, webhooks, uploads and crons. Sentry
  server-only. PostHog proxied through `/ingest`.
- **Read `CLAUDE.md` and `AGENTS.md` first** (repo root): they are the project's rules and bind
  every proposal you make (no `transition-all`, CTAs are Canopy pills, "Rishi Valley" never
  "RV Connect", `loading.tsx` on every async route, one-spine `ContentColumn`, the repo root
  is closed, schema changes go through `prisma/migrations-manual/`).
- `docs/spec/DESIGN-SYSTEM.md` is the design rulebook; `docs/spec/<area>.md` the deep spec per
  area; `docs/spec/hand-run-passes.md` the protocol for the tag-photos / tag-professions
  passes; `docs/TRAPS.md` stack facts that cost sessions; `docs/OPERATIONS.md` every
  non-application tool; `docs/ROADMAP.md` what things were supposed to be. Read the spec for
  your territory before judging anything in it "unnecessary".
- **Sizes today (cloc, code lines):** whole repo 199,028 (TypeScript 100,033; Markdown 51,023;
  JSON 22,428; JavaScript 17,662). `src/app` non-lab 13,636 (138 files, 70 route directories);
  `src/app/lab` 34,426 (112 files, 48 rooms); `src/components` 38,319 TS in 279 files;
  `src/lib` 12,215 TS in 138 files + 9,297 JS in 87 `*.test.mjs`; `scripts/` 7,360 JS in 64
  files (+ 4 TS); `e2e/` 1,414 TS; `docs/` 40,581 lines. Comment-to-code ratios: lib 0.67,
  collection 0.78, api 0.62, common 0.43, lab 0.21.
- **Build baseline (scratch worktree, 2026-09-03):** 42.3 s wall — compile 20.3 s, TypeScript
  14.6 s, 105 static pages 0.7 s. 100 routes in the client bundle stats, 52 non-lab. Non-lab
  first-load JS median **1,069 KB raw**; heaviest /profile/[id] 1,258, /directory 1,231, /feed
  1,225, /welcome 1,190; landing 899, login 907. 14 chunks ride on every route. One 233 KB CSS
  stylesheet ships to every page (Tailwind v4 output over ALL source, lab included).
- **`npm run check`** = TypeScript + ESLint + shape/colour protocol + lab registry + 102
  `*.test.mjs` files + dependency advisories + security status board, 24.8 s, green at HEAD
  `72b5a1d`. `npm run visual` = 11 routes × 2 viewports against `e2e/__screenshots__/`
  (13 MB of PNG baselines, tracked on purpose). `npm run verify:crawl` walks every route.
- The unit tests are plain `node:test` files discovered by glob; many are "rule" tests that
  read source as text and assert a pattern (regression pins, each carrying an audit id like
  C-189). A pin is not bloat; a pin whose subject is gone is.
- **`/lab` nuance (important):** the 48 lab rooms are intentional, owner-approved design
  history, indexed in `src/app/lab/_registry.ts`; `npm run check` fails if a room is not
  registered. Do NOT write them up as dead code to delete. In scope: whether they leak into
  production bundles, build time or the shared CSS; whether shipped pages import from lab
  code; whether lab code duplicates a shipped primitive it was the prototype of; whether a
  room is a finished experiment whose verdict is already shipped. Any proposal to remove or
  freeze a room is an **owner call**, never a recommendation.
- **The demo nuance:** a separate public demo deployment (`DEMO_MODE=1`) has a three-layer
  default-deny write system (`src/proxy.ts`, `src/lib/demo.ts`, `src/lib/call-action.ts`).
  `src/lib/security-regressions.test.mjs`, `gate-coverage.test.mjs` and the `*-rule.test.mjs`
  files pin security behaviours. Every proposal must keep those green; say explicitly when a
  proposal touches a pinned file and name the pin.
- **The hand-run passes** (`docs/spec/hand-run-passes.md`): `scripts/dev/tag-photos-*.mjs`,
  `tag-professions-*.mjs` and `import-album.mjs` are a shape-conforming family enforced by
  `scripts/qa/hand-run-passes.test.mjs`. Duplication between them may be the protocol; the
  test says what must match. Read the spec before calling their sameness a clone.

## 4. What the FIRST audit already did — do not re-litigate without new evidence

The first refactor audit (`docs/audit-fix/2026-08-25-refactor-audit-1/report.md`, closed
2026-08-27 after ten fix sessions) removed 48 files, 10 dependencies, 4 tables, 9 columns,
5 import cycles, and 344 KB of first-load JS on /feed. Its report §5 lists not-findings that
are binding; its `fix-prompt.md` records rows that were **re-refuted at fix time with
measurements**. Re-proposing any of these needs NEW evidence, stated as such:

- The comment mass is the product (proxy.ts, the money path, the mail queue, prisma.ts,
  globals.css, button.tsx, the migrations folder). Only comments describing deleted code or
  restating the next line are bloat.
- `email-queue.ts` is not an outbox candidate (no cron; every mechanism pins an incident).
- The lab leaks 0 bytes of JS into non-lab routes (proven chunk-by-chunk). Its CSS share is
  still unmeasured — that one IS open.
- The admin lib pairs (people/content/threads client+server) are real seams.
- The three search endpoints stay three; the place trio stays three; houses-chain's lines
  are earned; the gazetteer stays cities500; the migrations folder stays as-is.
- The rule-test pattern (read source as text) is deliberate.
- Delight features (konami, dark gauntlet, /hoopoe, stray hair, "12 birds not 14") are kept.
- `DEMO_CLOSED_PATHS` "unused" export, `SESSION_GAP_MIN`: honesty checks, kept.
- **Refuted at fix time**: the `withMember/withAdmin` action-gate wrapper (`auth()` is
  `cache()`d so the double call is free; the factory export shape collides with the C-189
  tripwire); tsconfig `exclude` of `src/generated` (no build-time gain measured); making the
  Sentry hook conditional; dynamic-loading the DemoBar/VerifyEmailBanner half; a shared
  paged-list hook for PostFeed; the admin audit-log skeleton; cuid2 → randomUUID (parked).
- **Open owner decisions carried from audit 1** (report §4): the landing showcase family's
  fate (still switched off; knip lists five files), the member tour, the About page text,
  Vercel Analytics vs PostHog, relocating the imported skill packs out of `.claude/`,
  retiring two security probes, the email queue on a paid Resend plan, a birds sprite,
  moving "sanan's stuff", the Collection taxonomy SELECT, Collection's filter-row chrome.
  If your territory contains one of these: report its CURRENT state in one paragraph
  (still open? partly done? made moot by later work?) — don't re-argue it.

The first audit's most important lesson, in the orchestrator's words at close-out: **"Deduplication
cannot save lines in this codebase"** — replacing five copies with one shared function costs a
docblock, five imports and five call sites, because the house rule is that every constant is
argued for in a comment. Its two dedupe phases were 65 commits for −90 lines. So: **project
your savings in the unit that fits** — clones removed, files removed, dependencies removed,
tracked bytes, client-bundle bytes, CSS bytes, build seconds, database objects, queries per
page load — and give a line count only when it is honest (dead code, placeholders, relocations
out of shipping paths). A finding that says "0 lines, but one fewer place for the bug" is a
good finding when the clone is real.

## 5. Methodology — apply ALL of it; each list is a floor, not a ceiling

### 5a. The reduction order (goal-sloc). Tag each finding with its phase.
1. **dead** — files/exports/functions/deps/CSS tokens/DB columns with no references
   (tool-verified, then confirmed by you; grep alone never declares death).
2. **placeholder** — fully plumbed subsystems that do nothing (a flag hardcoded off, a method
   that is a logged no-op, a table nothing reads, a route nothing links to, a prop no caller
   passes, an option every caller leaves at its default).
3. **relocate** — dev/test/QA scaffolding living in shipping paths; misplaced dependencies
   (runtime vs dev); code in the wrong folder; lab-born code that shipped without its lab
   half being retired.
4. **dedupe** — genuine duplication: repeated blocks, N near-identical files, a component that
   re-implements a shared primitive, a query written twice with drift. Tolerate duplication
   across module boundaries when coupling would cost more; say when that is your judgement.
5. **hygiene** — restate-the-code comments, AI narration, dead options, unnecessary
   intermediates, stale comments describing code that moved. Legitimate but the cheapest
   lever; it must never be the headline.
6. **rewrite** — clean-room rewrite of a worst file against its tests. Only when the tests are
   a faithful spec; say whether they are.
7. **architecture** — collapse redundant layers, kill antipatterns, deepen modules. Usually
   line-neutral; propose for quality, with the risk stated and the payoff named.
8. **library** — hand-rolled code a dependency already does better (or the reverse: a
   dependency doing what 20 lines of native code would).

### 5b. Anti-gaming. Every finding is **structural** (dead/placeholder/relocate/dedupe/
rewrite/architecture/library) or **cheap** (comment trimming, line packing, one-line helper
extraction). Estimate savings honestly, in the right unit (section 4). Never propose deleting
a feature, a doc the owner reads, or error handling merely because it has not fired. Never
propose editing the measuring tools to exclude paths. If your territory is mostly cheap wins,
say so plainly — "the structural well is dry here" is a legitimate, valuable finding.

### 5c. Dead-code sweep rules
- Hunt: unused imports/exports/files/deps (knip), unreachable code after return/throw,
  branches impossible by type narrowing, functions never called, commented-out blocks,
  env/feature flags always-true/always-false, API routes made redundant by a server action,
  components superseded by shared primitives (`create-post-form`, `PostCard`, `FeedColumn`,
  `ContentColumn`, `BirdAvatar`, `LoveButton`, `Button`, `PhotoCarousel`, `ImageViewer`,
  `ConfirmDialog`), CSS classes/tokens in `globals.css` nothing uses, Prisma models/columns/
  indexes nothing reads, migration SQL for columns since dropped, props no caller passes,
  test pins whose subject no longer exists.
- Safety: never mark dead anything reachable via dynamic import, string reference, reflection,
  or a framework convention (Next `generateMetadata`, `loading.tsx`, `error.tsx`,
  `forbidden.tsx`, route files, `instrumentation.ts`, `proxy.ts`, `manifest.ts`, the lab
  registry, `next-auth.d.ts`, Playwright/`node:test` discovery globs, `scripts/README.md`'s
  ledger). Check `git log --follow -- <file>` and `git log -S<symbol>`: untouched 6+ months
  with zero references is likely dead; added last week with zero references is probably
  in-progress work — say which.
- Each finding names the verification that proves it safe.

### 5d. Simplification pass (per file, per function)
Nested conditionals → guard clauses; max ~3 indentation levels; a comment explaining a block
means the block wants to be a function with that name; complex conditionals → named booleans
or lookup tables; repeated logic → shared utility (with the coupling caveat); no nested
ternaries; kill one-line wrapper abstractions; delete comments that restate code. "Simpler"
means easier to understand on first read, never fewer characters. Follow the repo's own idiom
(CLAUDE.md, the surrounding code); the repo wins over any imported style. This repo
deliberately writes long "why" comments; a comment that carries a reason, a date, an owner
quote, a measured number or an audit id is NOT bloat. A comment that says what the next line
obviously does IS. Distinguish them, and quote one of each when you make the call.

### 5e. The six LLM-bloat signatures (scan for all six in every file)
1. single-use helper functions that should be inlined;
2. type/interface definitions for internal shapes used once;
3. defensive try/catch around code that cannot recoverably throw;
4. unnecessary intermediate variables;
5. over-abstraction: config objects, factories, options params, registries with one caller;
6. comments that narrate the obvious.
Plus the React-specific ones: `useEffect` that mirrors props into state, `useMemo`/`useCallback`
with no measurable benefit, prop drilling a composition would remove, client components whose
only client need is a leaf, state that could be derived, refs that could be state (or the
reverse), effects that run on every render because their deps are recreated.

### 5f. Next.js 16 performance levers (the bundle lens owns these; territory agents flag what
they see in their files)
- Barrel files: exactly one internal barrel exists (`components/guide/chapters/index.tsx`).
- `"use client"`: 285 files (202 outside lab). For each in your territory: does it need
  state/effects/browser APIs, or only a leaf inside it? Does it import a server-only lib?
- `next/dynamic` / `import()`: 52 sites outside lab. Are dialogs, editors, the map stack
  (`d3-geo`, `d3-zoom`, `d3-selection`, `topojson-client`, `world-atlas`), admin-only panels,
  the image viewer, the crop tool, and the 50-bird SVG set behind interaction where they can be?
- `experimental.optimizePackageImports` in `next.config.ts` — check coverage.
- Images through `next/image`/Sharp; fonts via `next/font` with subsets; no strays.
- The 233 KB stylesheet: which of its rules exist only because of lab files?

### 5g. Tiering (every finding gets one): **T1** safe delete or move, minutes, near-zero risk;
**T2** small fix, one file or one concept, low risk; **T3** refactor across files, needs
tests/visual run; **T4** architecture or product-level, needs owner or a design decision. And
the calibration from the 15,451-instance agentic-refactoring study (arXiv 2511.04824): AI
executes localized and medium refactorings reliably and is weak at design-level changes, so
mark each finding **autonomous** (a later session can just do it) or **owner** (a judgement
call: feature cuts, lab rooms, dependency swaps with UX impact, anything a member sees).

### 5h. The uncomfortable macro question
Is there a feature, subsystem, route, script, doc, table or lab room in your territory whose
existence no spec defends anymore? Those go in your report under "Owner decisions", written in
plain non-technical language with your recommendation. Never as a silent cut.

## 6. How to hunt

- **Read every file in your territory in full** unless your charter says otherwise. Skimming is
  how bloat survives audits. If the territory is too big to finish, write the report for what
  you did read and list the rest under "Not read" so the orchestrator sends another agent;
  never pretend coverage.
- Before calling anything unnecessary, check the spec for your area and `git log -3 -- <file>`
  for the reason it exists. This repo records reasons unusually well; use them.
- **The newest code is the likeliest bloat.** 146 commits landed since the first audit closed
  (`raw/files-added-since-audit1.txt`, `raw/diff-since-audit1.txt`). Read fresh files with
  extra suspicion: they have never been audited.
- Use the raw tool outputs (section 7) as leads, then open the file and confirm. A knip line
  is a claim; your confirmation is the finding.
- Think in numbers. "This file is 1,469 lines, of which ~300 are three near-identical
  reducers that one 90-line reducer with a `scope` parameter would replace" is a finding.
  "This file is long" is not.
- Look across your files for the same thing written twice, and across the boundary of your
  territory for the same thing your neighbour probably has (put those under "For other
  lenses" with the file names; the orchestrator merges).
- Do not pad. Ten verified findings beat forty speculative ones. But do not stop early either:
  the owner would rather have 300 real items across the whole report than a tidy 60.
- Include **not-findings**: things that look like bloat and are verified intentional, with
  the spec line or commit that defends them, so no future audit re-litigates them.

## 7. Raw tool output on disk (`docs/audit-fix/2026-09-03-refactor-audit-2/work/raw/`)

Grep these for your paths instead of re-running anything:
- `cloc-summary.txt`, `cloc-by-file.csv` (language,file,blank,comment,code), `lines-by-dir.txt`,
  `comment-density.txt` (top-40 files by comment/code ratio + per-dir ratios)
- `knip-repo-config.txt` (the authoritative run, via `scripts/qa/knip.jsonc`: 7 unused files,
  70 exports, 11 types, 1 dep), `knip-repo-config-production.txt`, `knip.txt` (no config —
  noisy), `knip-configured.txt` (the orchestrator's variant)
- `tsc-unused.txt` (4 hits), `madge-circular.txt` (40 cycles, ALL inside gitignored
  `src/generated/prisma` = floor; 0 real), `madge-orphans-filtered.txt`
- `depcruise.txt` (0 violations), `depcruise-metrics.txt` (fan-in/fan-out per module)
- `jscpd.txt` (232 clones, 1.82 %, src+scripts, tests excluded — every clone listed with both
  locations), `jscpd-tests.txt` (2), `jscpd-e2e.txt` (4)
- `type-sludge.txt` (any / as-unknown-as / eslint-disable / ts-ignore sites, non-lab src),
  `env-flags.txt` (every `process.env.X` with counts), `todos.txt`, `commented-out-code.txt`
  (29 regex candidates, most will be prose), `console-log.txt`
- `use-client.txt` (285 files), `dynamic-imports.txt` (52 sites), `barrels.txt`
- `build.txt` (baseline build log + route table), `route-bundle-stats.json` (per route:
  `firstLoadUncompressedJsBytes` + chunk list), `route-js.txt` (the table), `chunk-sizes-top30.txt`
- `largest-files.txt` (by lines), `largest-tracked-bytes.txt`, `tracked-bytes-by-dir.txt`,
  `tracked-files.txt` (every tracked path)
- `files-added-since-audit1.txt`, `diff-since-audit1.txt`
- `check-baseline.txt`
- `type-coverage` crashed on Node 26 (again); `type-sludge.txt` is the grep substitute.
- The production build itself is at `.scratch/audit2-build/.next/` (read-only for you):
  `static/chunks/*.js|*.css` for byte attribution, `server/app/**` for per-route server output.

## 8. Finding format (use exactly this; the orchestrator parses it)

```
### <key>-NN - <short imperative title>
- **Where**: `path/file.ts:120-168` (every location; ranges, not just a file)
- **Phase**: dead | placeholder | relocate | dedupe | hygiene | rewrite | architecture | library
- **Tier**: T1 | T2 | T3 | T4     **Class**: structural | cheap     **Decides**: autonomous | owner
- **Evidence**: the tool line, the excerpt, the grep count, the git log line — whatever proves
  it. Quote code sparingly but precisely.
- **What to do**: concrete steps a later session can execute without re-analysis (which lines
  go, what replaces them, which imports change, which test to update, which pin to move).
- **Saving**: in the honest unit — ~N lines / N files / N KB client JS / N KB CSS / N s build /
  N deps / N clones / N queries per load / N DB objects / N tracked KB. "0 lines, clarity
  only" is a valid answer for architecture items.
- **Risk & gate**: low | medium | high, and the exact proof: `npm run check`, `npm run visual`,
  `npm run verify:crawl`, a named route to open, a named test file that must stay green,
  `security-regressions.test.mjs`, a live-DB SELECT the fix session must run first (write it).
- **Confidence**: high | medium | low, and the one thing that would change your mind.
- **Notes**: fears, alternatives you rejected, related findings (by id), anything the fixer
  should know. Be verbose here, not above.
```

## 9. Report file structure (write to the path in your charter)

```
# <key> - refactor audit 2 report
Agent charter in one paragraph. Date. Files in territory: N; read fully: N.

## Coverage
- Read fully: <list or glob>
- Skimmed (why): ...
- Not read (why): ...
- Uncommitted edits seen (someone else's WIP): ...

## Summary
5-10 lines: the shape of this territory, the biggest wins in the right units, the
structural-vs-cheap split, what surprised you, what audit 1 left that is now moot.

## Findings
(section 8 format, numbered <key>-01 upward, biggest structural wins first)

## Owner decisions
(plain language, one paragraph each, with a recommendation)

## Not-findings
(looked like bloat, verified intentional, with the defending spec/commit/comment)

## Audit-1 carry-overs in this territory
(state of each open owner decision or refuted row that touches your files: one line each)

## For other lenses
(things outside your territory you noticed: file + one line each)

## Metrics
Lines read; comment-heaviest files in territory; biggest files; anything countable.
```

Then return the short structured summary the prompt asks for. The report on disk is the
deliverable; the summary is only a pointer.
