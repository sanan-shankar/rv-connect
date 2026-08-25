# Common brief for every simplification-audit agent

You are one agent in a fan-out. Read this whole file before opening a single source file.
Your own charter (territory or lens) is in the prompt that pointed you here. The report you
write is the deliverable; the orchestrator compiles all reports into one plan that later
sessions will execute item by item, so precision now saves hours later.

---

## 1. What this is, and what it is not

This is a formal, exhaustive **simplification audit** of a Next.js 16 alumni network for
Rishi Valley school, just before public release. It is **audit-only**. You identify, you
verify, you document. You do not fix. You do not change one line of application code,
config, schema, tests, docs or scripts. The only file you create is your own report.

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
> address all of it."

And, added today, the part that widens the scope beyond src/:

> "Simplification is not just in code but also bloat, and effectively storage space of this
> folder. I'm having to delete a bunch of docs and a bunch of script files and a bunch of
> other files because they're just left over from previous tests and previous sessions. I
> just cleaned up a lot of stuff and deleted some 30-40,000 lines, and that shouldn't have
> needed to happen. I think stricter rules about which test scripts we keep would be good."

So: leftover probes, scratch tests, stale docs, screenshot piles, config that nothing reads,
dependencies nothing imports, generated files that are committed, and the root directory are
all in scope. He is non-technical; the report must be executable by an engineer (a later
Claude session) without re-deriving anything, and readable in summary by him.

On how you should think, also his words: "When you're conveying everything, all your ideas,
all your fears, it captures it better." Do not compress your reasoning into terse bullets in
the report. Say what you saw, why it matters, what you are unsure about. A verbose, honest
finding beats a tidy, thin one.

## 2. Hard rules (these bind you absolutely)

1. **Read-only.** No edits, no `--fix`, no formatter, no `git` commands that change state
   (no add/commit/stash/checkout/reset/clean). `git log`, `git blame`, `git ls-files` are fine.
2. **Containment.** Every command runs inside `/Users/sanan/Documents/rv-connect/`. Never
   read `.env` or any secret file; you do not need them.
3. **No heavy processes.** Do NOT run `npm run build`, `npm run analyze`, `npm run visual`,
   `npm run check`, `npx tsc`, Playwright, Puppeteer, Chrome, or the dev server. The owner's
   machine has hung under parallel heavy processes, and 18 agents are running at once. The
   orchestrator already ran every tool; the outputs are on disk (section 6). You may run
   `grep`/`rg`, `wc`, `ls`, `find`, `git log/blame`, `awk`, `node -e` one-liners, `head/sed`.
4. **No database access.** No prisma commands, no SQL, no scripts under `scripts/`.
5. **Another session shares this working tree** (a `next dev` on :3000 is theirs). Uncommitted
   changes you did not make are their work in progress; audit around them and never touch
   them. If a file you read has uncommitted edits (`git status --short <file>`), say so in
   your report.
6. **No package installs.** Nothing over the network except reading docs if your charter says
   you may use web search (the dependency lens does).
7. **Your report file is the only thing you write**, at the exact path in your charter. Write
   it in full BEFORE returning (the session may die; a report on disk survives, a return value
   does not). If you are running long, write a partial report early and overwrite it later.

## 3. What this codebase is (facts you need)

- Next.js 16.3.1 App Router (Turbopack), React 19.2, Tailwind v4, shadcn/ui (base-nova on
  `@base-ui/react`), Prisma 7 with `@prisma/adapter-pg` on Supabase Postgres, NextAuth v5
  beta (JWT sessions, email + password), images on Cloudflare R2 via `src/lib/storage.ts`,
  deployed to Vercel (`bom1`). Server Actions for mutations; API routes only for auth,
  webhooks, uploads and crons. Sentry server-only. PostHog proxied through `/ingest`.
- **Read `CLAUDE.md` and `AGENTS.md` first** (repo root): they are the project's rules and
  they bind every proposal you make (e.g. no `transition-all`, CTAs are Canopy pills, "Rishi
  Valley" never "RV Connect", `loading.tsx` on every async route, one-spine `ContentColumn`).
- `docs/spec/DESIGN-SYSTEM.md` is the design rulebook; `docs/spec/<area>.md` is the deep spec
  for an area; `docs/TRAPS.md` lists stack facts that cost sessions; `docs/OPERATIONS.md`
  lists every non-application tool; `docs/ROADMAP.md` says what things were supposed to be.
  Read the spec for your territory before judging anything in it "unnecessary".
- **Sizes (cloc, code lines, tracked files):** whole repo 160,602 (TypeScript 92,414; Markdown
  26,760; JSON 25,083; JavaScript 13,415). `src/app` 46,497 of which `src/app/lab` is 32,196;
  `src/components` 35,028; `src/lib` 17,941 code + 7,352 in 68 `*.test.mjs`; `scripts/` 6,280;
  `docs/` 17,435; `prisma/` 799. Comments: src/lib has 9,320 comment lines against 17,941
  code (ratio 0.52); src/components 0.34; src/app (non-lab) 0.38. `src/proxy.ts` is 241
  comment lines to 126 code.
- **Build baseline:** `next build` 45.6s wall (compile 16.9s, TypeScript 19.4s); 92 routes,
  43 of them `/lab/*`, all present in the production build.
- **`/lab` nuance (important):** the 43 lab rooms are intentional, owner-approved design
  history, indexed in `src/app/lab/_registry.ts`; `npm run check` fails if a room is not
  registered. Do NOT write them up as dead code to delete. In scope: whether they leak into
  production bundles or build time, whether shipped pages import from lab code, whether lab
  code duplicates a shipped primitive it was the prototype of, whether they should be excluded
  from the production build. Any proposal to remove a room is an **owner call**, never a
  recommendation.
- **The demo nuance:** a separate public demo deployment (`DEMO_MODE=1`) has a three-layer
  default-deny write system (`src/proxy.ts`, `src/lib/demo.ts`, `src/lib/call-action.ts`).
  `src/lib/security-regressions.test.mjs` and the `*-rule.test.mjs` files pin security
  behaviours. Every proposal must keep those tests green; say so explicitly if a proposal
  touches a pinned file.
- **The gates:** `npm run check` = TypeScript + ESLint + shape/colour protocol audit + lab
  registry audit + 75 unit-test files, ~26s. `npm run visual` = 10 routes x 2 viewports
  against committed baselines in `e2e/__screenshots__/` (fails on 100 changed pixels).
  `npm run verify:crawl` walks every route signed in. Each finding names which gate proves
  it safe.
- The unit tests are plain `node:test` files (`*.test.mjs`) discovered by
  `scripts/qa/check.mjs`; many are "rule" tests that read source files as text and assert a
  pattern is present (regression pins). Knip lists them all as "unused files" because no
  runner entry is configured; that is a knip-config gap, not dead tests.

## 4. Methodology - apply ALL of it; each list is a floor, not a ceiling

### 4a. The reduction order (goal-sloc). Tag each finding with its phase.
1. **dead** - files/exports/functions/deps with no references (tool-verified, then confirmed
   by you; grep alone never declares death).
2. **placeholder** - fully plumbed subsystems that do nothing (a flag hardcoded off, a method
   that is a logged no-op, a table nothing reads, a route nothing links to).
3. **relocate** - dev/test/QA scaffolding living in shipping paths; misplaced dependencies
   (runtime vs dev); code in the wrong folder.
4. **dedupe** - genuine duplication: repeated blocks, N near-identical files, a component
   that re-implements a shared primitive. Tolerate duplication across module boundaries when
   coupling would cost more; say when that is your judgement.
5. **hygiene** - restate-the-code comments, AI-left narration, dead options, unnecessary
   intermediates. Legitimate but the cheapest lever; it must never be the headline.
6. **rewrite** - clean-room rewrite of a worst file against its tests. Only when the tests
   are a faithful spec; say whether they are.
7. **architecture** - collapse redundant layers, kill antipatterns, deepen modules. Usually
   SLOC-neutral; propose for quality, with the risk stated.
8. **library** - hand-rolled code that a dependency already does better (or the reverse: a
   dependency doing what 20 lines of native code would).

### 4b. Anti-gaming. Every finding is **structural** (dead/placeholder/relocate/dedupe/
rewrite/architecture/library) or **cheap** (comment trimming, line packing, one-line helper
extraction). Estimate savings honestly. Never propose deleting a feature, a doc the owner
reads, or error handling merely because it has not fired. Never propose editing the measuring
tools to exclude paths. If your territory is mostly cheap wins, say so plainly.

### 4c. Dead-code sweep rules
- Hunt: unused imports/exports/files/deps (knip), unreachable code after return/throw,
  branches impossible by type narrowing, functions never called, commented-out blocks,
  env/feature flags always-true/always-false, API routes made redundant by a server action,
  components superseded by shared primitives (`Composer`/`create-post-form`, `PostCard`,
  `FeedColumn`, `ContentColumn`, `BirdAvatar`, `LoveButton`, `Button`), CSS classes/tokens in
  `globals.css` nothing uses, Prisma models/columns/indexes nothing reads, migration SQL for
  columns since dropped.
- Safety: never mark dead anything reachable via dynamic import, string reference, reflection,
  or a framework convention (Next `generateMetadata`, `loading.tsx`, `error.tsx`, route files,
  `instrumentation.ts`, `proxy.ts`, `manifest.ts`, the lab registry, `next-auth.d.ts`).
  Check `git log --follow -- <file>` and `git log -S<symbol>`: untouched 6+ months with zero
  references is likely dead; recently added with zero references is probably in-progress work.
- Each finding names the verification that proves it safe.

### 4d. Simplification pass (per file, per function)
Nested conditionals -> guard clauses; max ~3 indentation levels; a comment explaining a block
means the block wants to be a function with that name; complex conditionals -> named booleans
or lookup tables; repeated logic -> shared utility (with the coupling caveat); no nested
ternaries; kill one-line wrapper abstractions; delete comments that restate code. "Simpler"
means easier to understand on first read, never fewer characters. Follow the repo's own idiom
(CLAUDE.md, the surrounding code); the repo wins over any imported style. Note: this repo
deliberately writes long "why" comments ("every constant argued for in a comment" is an
owner standard). A comment that carries a reason, a date, an owner quote or an audit ID is
NOT bloat. A comment that says what the next line obviously does IS. Distinguish them.

### 4e. The six LLM-bloat signatures (scan for all six in every file)
1. single-use helper functions that should be inlined;
2. type/interface definitions for internal shapes used once;
3. defensive try/catch around code that cannot recoverably throw;
4. unnecessary intermediate variables;
5. over-abstraction: config objects, factories, options params, registries with one caller;
6. comments that narrate the obvious.
Plus the React-specific ones: `useEffect` that mirrors props into state, `useMemo`/`useCallback`
with no measurable benefit, prop drilling that a composition would remove, client components
whose only client need is a leaf.

### 4f. Next.js 16 performance levers (the bundle lens owns these; territory agents flag
what they see in their files)
- Barrel files: internal `index.ts` re-exports defeat tree-shaking and slow builds. Map them.
- `"use client"`: every directive drags its import subtree to the client. For each: does this
  component need state/effects/browser APIs, or only a leaf inside it? Server-only libs
  imported across the boundary? There are 258 client files (180 outside lab), 41,433 lines
  outside lab, and exactly ONE `next/dynamic` in the whole app.
- Dynamic imports for below-the-fold / behind-interaction weight: dialogs, editors, the map
  stack (`d3-geo`, `d3-zoom`, `supercluster`, `world-atlas`, `topojson-client`), admin-only
  panels, confetti/motion extras, the 50-bird SVG set.
- `experimental.optimizePackageImports` is set to `["@phosphor-icons/react", "motion"]`;
  `lucide-react` is auto-optimised by Next. Check coverage of anything else heavy.
- Images through `next/image`/Sharp; fonts via `next/font` with subsets; no strays.

### 4g. Tiering (every finding gets one): **T1** safe delete or move, minutes, near-zero
risk; **T2** small fix, one file or one concept, low risk; **T3** refactor across files,
needs tests/visual run; **T4** architecture or product-level, needs owner or a design
decision. And the calibration from the 15,451-instance agentic-refactoring study (arXiv
2511.04824): AI executes localized and medium refactorings reliably and is weak at
design-level changes, so mark each finding **autonomous** (a later session can just do it)
or **owner** (a judgement call: feature cuts, lab rooms, dependency swaps with UX impact,
anything that changes what a member sees).

### 4h. The uncomfortable macro question
Is there a feature, subsystem, route, script, doc, or table in your territory whose
existence no spec defends anymore? Those go in your report under "Owner decisions", written
in plain non-technical language with your recommendation. Never as a silent cut.

## 5. How to hunt

- **Read every file in your territory in full** unless your charter says otherwise. Skimming
  is how bloat survives audits. If the territory is too big to finish, write the report for
  what you did read and list the rest under "Not read" so the orchestrator can send another
  agent; never pretend coverage.
- Before calling anything unnecessary, check the spec for your area and `git log -3 --
  <file>` for the reason it exists. This repo records reasons unusually well; use them.
- Use the raw tool outputs (section 6) as leads, then open the file and confirm. A knip line
  is a claim; your confirmation is the finding.
- Think in numbers. "This file is 1,981 lines, of which ~600 are five near-identical section
  renderers that one 80-line component with a `variant` prop would replace" is a finding.
  "This file is long" is not.
- Look across your files for the same thing written twice, and across the boundary of your
  territory for the same thing your neighbour probably has (put those under "For other
  lenses" with the file names; the orchestrator merges).
- Do not pad. Ten verified findings beat forty speculative ones. But do not stop early
  either: the owner would rather have 300 real items across the whole report than a tidy 60.
- Include **not-findings**: things that look like bloat and are verified intentional, with
  the spec line or commit that defends them, so no future audit re-litigates them.

## 6. Raw tool output on disk (`docs/planning/audits/simplification/raw/`)

Grep these for your paths instead of re-running anything:
- `cloc-summary.txt`, `cloc-per-dir.csv`, `cloc-by-file.csv` (language,file,blank,comment,code)
- `comment-density.txt` - top-50 files by comment/code ratio, and per-dir totals
- `knip.txt`, `knip-production.txt` - unused files/exports/types/deps, unlisted deps
- `tsc-unused.txt` - `--noUnusedLocals --noUnusedParameters` (only 4 hits; the lint already
  catches most)
- `madge-circular.txt` (48 cycles; 43 are inside gitignored `src/generated/prisma` = floor;
  5 real), `madge-orphans-filtered.txt` (non-framework orphans)
- `depcruise.txt`, `depcruise-metrics.txt` (fan-in "Ca" / fan-out "Ce" per module; highest
  fan-in: `lib/utils.ts` 165, `lib/prisma.ts` 92, `common/motion.tsx` 90, `ui/button.tsx` 79)
- `jscpd.txt` (275 clones, 2.74% of lines, min 50 tokens), `jscpd-tests.txt` (12 in tests)
- `type-sludge.txt` (explicit any / as-unknown-as / eslint-disable / console.* sites)
- `env-flags.txt` (every `process.env.X` read), `todos.txt`, `commented-out-code.txt`
- `use-client.txt` (every "use client" file with line count; "use server" files; dynamic
  imports), `build.txt` (baseline build log + route table), `analyze-build.txt`,
  `route-js.txt` (per-route client JS from the build manifest, when present)
- `type-coverage` could not run on Node 26 (crashes at load); `type-sludge.txt` is the
  grep substitute.

## 7. Finding format (use exactly this; the orchestrator parses it)

```
### <key>-NN - <short imperative title>
- **Where**: `path/file.ts:120-168` (every location; ranges, not just a file)
- **Phase**: dead | placeholder | relocate | dedupe | hygiene | rewrite | architecture | library
- **Tier**: T1 | T2 | T3 | T4     **Class**: structural | cheap     **Decides**: autonomous | owner
- **Evidence**: the tool line, the excerpt, the grep count, the git log line - whatever
  proves it. Quote code sparingly but precisely.
- **What to do**: concrete steps a later session can execute without re-analysis
  (which lines go, what replaces them, which imports change, which test to update).
- **Saving**: ~N lines code / N KB client JS / N s build / N deps / N files (be honest; "0
  lines, clarity only" is a valid answer for architecture items)
- **Risk & gate**: low | medium | high, and the exact proof: `npm run check`,
  `npm run visual`, `npm run verify:crawl`, a named route to open, a named test file that
  must stay green, "security-regressions.test.mjs".
- **Confidence**: high | medium | low, and the one thing that would change your mind.
- **Notes**: fears, alternatives you rejected, related findings (by id), anything the
  fixer should know. Be verbose here, not above.
```

## 8. Report file structure (write to the path in your charter)

```
# <key> - simplification audit report
Agent charter in one paragraph. Date. Files in territory: N; read fully: N.

## Coverage
- Read fully: <list or glob>
- Skimmed (why): ...
- Not read (why): ...
- Uncommitted edits seen (someone else's WIP): ...

## Summary
5-10 lines: the shape of this territory, the biggest wins, the structural-vs-cheap split,
what surprised you.

## Findings
(section 7 format, numbered <key>-01 upward, biggest structural wins first)

## Owner decisions
(plain language, one paragraph each, with a recommendation)

## Not-findings
(looked like bloat, verified intentional, with the defending spec/commit/comment)

## For other lenses
(things outside your territory you noticed: file + one line each)

## Metrics
Lines read; comment-heaviest files in territory; biggest files; anything countable.
```

Then return the short structured summary the prompt asks for. The report on disk is the
deliverable; the summary is only a pointer.
