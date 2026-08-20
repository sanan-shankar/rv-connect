# ultracode

# The Pre-Release Simplification Audit

You are running a complete, dedicated session with one job: perform a formal, exhaustive
**simplification audit** of this codebase and produce a report so thorough and so precise that one
or more later sessions can execute every item in it without re-deriving anything. This is an
**audit-only** session. You identify, you verify, you document. You do not fix. Not one line of
application code changes in this session.

There is no time limit. There is no meaningful usage limit. The owner has said, in his own words,
that if this takes ten hours he would be *happy*, because it means that much more effort went into
finding things. Depth and correctness are the only measures of success. Do not artificially pad the
work, but never cut a corner to finish sooner.

---

## 1. The owner's brief, in his own words

Everything below is the owner's actual intent, kept nearly verbatim because the nuance matters.
Read it as the spec:

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

The research step he asked for has already been done (see section 5): community skills were found,
verified, and **installed into this repo**, and the best published methodologies were distilled
into the checklists in section 6. Your job is to *use all of it* — and if in the course of the
audit you see a gap the research missed, you have web access; go look.

## 2. The prompting ideology — how you brief your agents

The owner has strong, explicit views on how AI should prompt AI. They bound how you write every
agent brief in this session:

- **Verbose is good.** "When you're conveying everything — all your ideas, all your fears,
  emotions — it captures it better." Do not distill an agent's brief down to bullet-point
  minimalism. Saving a thousand tokens on a brief while sitting on a fifteen-million-token budget
  is a false economy. Carry the owner's intent (section 1) into each brief nearly whole, plus the
  specific charter for that agent.
- **Do not box agents in.** "If I just needed one solution, then it's fine to be direct. But we
  don't know what we want, so we need a level of creativity." Give each agent its territory, the
  goal, the checklists, and the tools — then let it decide how to hunt within its territory. Do not
  hand it a fixed list of ten things to check and nothing else; hand it everything and tell it the
  list is a floor, not a ceiling.
- **Decisions belong to whoever is doing the work.** The owner refused to dictate granularity to
  you for exactly this reason. Extend the same courtesy downward: where an agent is better placed
  to judge something than you are, tell it so.

## 3. What this codebase is

- **App**: a Next.js 16 alumni network for Rishi Valley school. App Router, Tailwind v4, shadcn/ui
  (base-nova), Prisma 7 via the `pg` adapter on Supabase Postgres (Mumbai), NextAuth v5 beta
  (JWT sessions, email+password), images on Cloudflare R2 through `src/lib/storage.ts`, deployed
  to Vercel. Server Actions for mutations; API routes only for auth/webhooks/uploads/crons.
- **Size**: ~200,000 lines of TS/TSX in `src/` — ~56,700 in `src/app` (220 files), ~45,700 in
  `src/components` (239 files), ~13,400 in `src/lib` (85 files). ~90 routes, of which 43 are `/lab`
  dev rooms; 11 server-action files; 14 API routes.
- **Read before anything**: `CLAUDE.md` and `AGENTS.md` (project rules — they bind you),
  `docs/spec/DESIGN-SYSTEM.md`, the `docs/spec/*` file for any area an agent touches,
  `docs/ROADMAP.md` for what things are *supposed* to be, `progress.md` for session history.
- **Important nuance about `/lab`**: the 43 lab rooms are intentional, owner-approved design
  history, indexed in `src/app/lab/_registry.ts`. Do NOT write them up as "dead code to delete."
  What IS in scope: whether they leak into production bundles or build time, whether they should be
  excluded from the production build, and whether shipped pages import from lab code. Any proposal
  to actually remove a lab room is an owner decision — flag it as such, severity "owner call."
- **The demo**: there is a separate public demo deployment with a three-layer default-deny write
  system. Simplifications must never weaken it; `src/lib/security-regressions.test.mjs` pins
  security behaviors and every proposal must keep those tests green.
- **The gate**: `npm run check` runs TypeScript, ESLint, the design-protocol audit, the lab
  registry audit, and the unit tests in ~17s. `npm run visual` compares 10 routes × 2 viewports
  against committed baselines. Your report's proposals must each state which gates prove them safe.

## 4. Hard rules for this session

1. **Audit-only.** No edits to application code, styles, config, schema, or tests. The only files
   you create or modify are your report and working notes under `docs/planning/audits/`.
2. **Containment**: every command runs inside `/Users/sanan/Documents/rv-connect/`.
3. **Never** run `prisma db push` (one live database serves prod and dev), never run any Vercel CLI
   deploy command, never push to git (a push is a deploy). Committing your report files to `main`
   at the end is allowed and expected; stage them by name, plain conventional commit message, no
   AI attribution of any kind.
4. **Other sessions may share this working tree.** Uncommitted changes you did not make are someone
   else's work in progress. Never stash, reset, checkout, or clean anything. Never kill a dev
   server you did not start.
5. Running **read-only analysis** is encouraged: `npx` tools, `npm run check`, builds
   (`npm run build`, `npm run analyze`), the test suite. If a temporary dev-dependency install is
   needed (e.g. eslint-plugin-sonarjs), install it, measure, then uninstall so the tree ends clean.
   Nothing over 200MB.
6. If any tool run mutates files (a formatter, a `--fix` flag), do not use that mode. Report-only
   flags everywhere.

## 5. Your arsenal — use all of it, not the best of it

### 5a. Skills installed in this repo (invoke each one; the owner wants ALL applied, appended, not curated)

| Skill | What it brings |
|---|---|
| `goal-sloc` (`.claude/skills/goal-sloc/`) | The spine of the whole audit: SLOC as a scoreboard with anti-gaming discipline. Read its SKILL.md **and** its `references/` folder in full. Its preflight (baseline, irreducible floor, verify-before-delete), its strict reduction order, its structural-vs-cheap classification, and its stop conditions structure this entire audit. |
| `code-simplifier` (`.claude/skills/code-simplifier/`) | Anthropic's official simplification principles: preserve functionality, clarity over brevity, no clever one-liners, kill redundant abstractions, focus and balance. Every reviewing agent applies these. |
| `front-refactor` + `front-review` (`.claude/skills/`) | Frontend-specific refactor and severity-graded review lenses for the TSX surface. |
| `/simplify` (built-in) | The reuse/simplification/efficiency/altitude review dimensions. This session runs its *review* thinking, not its apply step. |
| `impeccable-distill` + `impeccable-optimize` | UI-side essence-stripping and UI performance diagnosis (loading, rendering, bundle size). |
| `superpowers` suite | `dispatching-parallel-agents` for how you fan out; `verification-before-completion` before you declare the report done — evidence before assertions, always. |
| `planning-with-files` | Keep `task_plan.md` / `findings.md` under `docs/planning/audits/` so the session survives any interruption. |

### 5b. Static-analysis ground truth — run these YOURSELF, early, and feed raw output to agents

The community-consensus rule: **semantic tools decide what is dead; the AI decides whether it is
safe to delete.** No agent may declare code dead by grep alone. Run these first and hand each agent
the slices relevant to its territory:

```
npx knip                          # unused files, exports, types, AND dependencies; has a first-class Next.js plugin
npx knip --production             # the prod-only view
npx madge --circular --extensions ts,tsx src/    # circular dependencies = prime simplification targets
npx jscpd src --min-tokens 50 --reporters console # copy-paste duplication %, the LLM signature failure
npx tsc --noEmit --noUnusedLocals --noUnusedParameters   # unused locals/params without touching tsconfig
npx type-coverage --detail        # % of expressions with a real type; finds `any` sludge
npx depcruise src --include-only "^src" --output-type err-long   # orphan modules, rule violations
npm run analyze                   # ANALYZE=true next build → per-route client bundle treemap (@next/bundle-analyzer is already installed)
npx scc src                       # SLOC + complexity baseline for the goal-sloc scoreboard
```

Also record, as baseline metrics in the report: total `next build` wall time, the First Load JS
column per route from the build output table, and the scc per-directory line counts. The fix
sessions will re-measure against these to prove the diet worked.

### 5c. Distilled community methodology — the appended "everything" the owner asked for

These checklists were harvested from the published sources at the end of this document. Treat every
item as mandatory coverage:

**Process spine (goal-sloc + "Debloating the AI-Grown Codebase"):**
1. Preflight: define what counts as SLOC; record baseline and per-area breakdown; compute the
   irreducible floor (generated scaffolding, config); verify check/build/tests pass BEFORE
   proposing deletions, so every proposal is against a known-green tree.
2. Reduction order — the report's phases should follow it: dead code → no-op placeholder
   subsystems (fully plumbed but non-functional) → dev/test scaffolding shipped in production
   paths → real duplication → comment hygiene (hygiene only, never the headline number) →
   clean-room rewrites of the worst files using tests as the behavioral spec → architecture
   simplification → delegation to a library only where the library is genuinely better engineering.
3. Anti-gaming: classify every proposed reduction as **structural** vs **cheap** (comment
   deletion, line packing). If cheap dominates a section of the report, say so plainly.
4. Calibration from the 15,451-instance agentic-refactoring study (arXiv 2511.04824): AI executes
   localized and medium refactorings reliably; it is weak at design-level changes. So mark each
   finding "safe for autonomous fix" vs "propose only — owner/architect decision."

**Dead-code sweep rules:**
- Hunt: unused imports/exports/files/deps (knip output), unreachable code after return/throw,
  branches impossible by type narrowing, functions never called, commented-out blocks, feature or
  env flags that are always-true/always-false, API routes made redundant by a server action,
  components superseded by the shared primitives (`Composer`, `Feed`, `PostCard`, `BirdAvatar`).
- Safety: never mark dead anything reachable via dynamic import, reflection, string reference, or
  a framework convention (Next.js `generateMetadata`, `loading.tsx`, route files, the lab
  registry). Never propose removing error handling merely because it has not fired. Note the
  git-blame heuristic: untouched 6+ months with zero references is *likely* dead, still verify.
- Each finding must name the verification that proves it safe (knip clean, check green, visual
  green, a specific route still renders).

**Simplification pass (per file/function):**
- Nested conditionals → guard clauses; max ~3 indentation levels; a comment explaining a block
  means the block wants to be a function with that name; complex conditionals → named booleans or
  lookup tables; repeated logic → shared utility, but tolerate duplication across module
  boundaries when coupling would cost more; no nested ternaries; kill one-line wrapper
  abstractions; delete comments that restate code. Simpler = easier to understand on first read,
  not fewer characters.

**The six LLM-bloat signatures (scan for all six everywhere):**
single-use helper functions that should be inlined; type/interface definitions for internal shapes
used once; defensive try/catch around code that cannot recoverably throw; unnecessary intermediate
variables; over-abstraction (config objects, factories, options params with one caller); comments
that narrate the obvious.

**Next.js 16 performance levers (a dedicated agent's whole territory):**
- **Barrel files**: internal `index.ts` barrels defeat tree-shaking and slow builds (measured
  community wins: 15-70% faster dev boot, ~28% faster builds, 40% faster cold starts). Map every
  internal barrel; check `experimental.optimizePackageImports` coverage for the heavy packages
  here (`lucide-react`, `@phosphor-icons/react`, `motion`, `d3-*`).
- **`"use client"` audit**: every directive drags its whole import subtree into the client bundle.
  For each one: does this component truly need state/effects/browser APIs, or only a leaf inside
  it? Find server-only libs imported across a client boundary.
- **Dynamic imports**: `next/dynamic` for below-the-fold and behind-interaction weight — dialogs,
  editors, the map stack (`d3-geo`/`d3-zoom`/`supercluster`/`world-atlas`/`topojson-client`),
  admin-only panels, confetti/motion extras.
- **Dependency diet**: check each dependency's real cost (bundlephobia); flag anything with a
  lighter substitute or native replacement; cross-check knip's unused-dependency list against
  `package.json` (note: `dotenv`, `shadcn` as a *runtime* dependency, `xlsx`, `jsqr`, `qrcode`
  deserve a look — are they build-time-only or dev-only things living in the wrong section?).
- **Route-level weight**: the First Load JS table per route; any route whose number is an outlier
  gets a named finding. Whether `/lab/*` inflates the production build is an explicit question to
  answer with numbers.
- Images through `next/image`/Sharp (already the pattern — verify no strays), fonts via
  `next/font` with subsets.

**Cleanup-audit tiering (jonesrussell):** classify every finding into
**T1** safe deletes / **T2** small fixes / **T3** refactors / **T4** architecture, by effort × risk.
Also ask, at the macro level, the uncomfortable question: is there a feature or subsystem whose
existence no spec defends anymore? Those go in the report as owner decisions, never as
recommendations to silently cut.

## 6. How to run the audit

**Phase 0 — orient.** Read CLAUDE.md, AGENTS.md, the goal-sloc skill in full, code-simplifier,
and skim the spec folder. Run the full 5b toolkit yourself and save raw outputs under
`docs/planning/audits/raw/`. Record the baseline metrics. Verify `npm run check` is green so the
audit starts from a known-good tree; if it is not green because of someone else's in-progress work,
note it and audit around it.

**Phase 1 — fan out.** This session has workflow orchestration enabled (the ultracode marker at
the top of this prompt is deliberate): use the Workflow tool and/or parallel agents, at whatever
scale the job deserves — the default size guideline is waived; the owner explicitly authorized
however many agents it takes and however long it takes. **Granularity is your decision.** The
owner deliberately refused to choose between one-agent-per-feature and three-agents-per-subsection;
he said the one doing the work decides. Decide, and write one sentence in the report on why you
chose the decomposition you chose. Whatever the decomposition, coverage must be total: every file
in `src/`, `scripts/`, `e2e/`, `prisma/`, and the config surface belongs to some agent, and
cross-cutting lenses (bundle/build performance, dependency diet, duplication, dead code) must not
fall between territorial cracks — give cross-cutting lenses their own agents if territory agents
can't hold them.

Every agent brief carries: the owner's intent from section 1 (nearly whole), the checklists from
5c relevant to its charter, the raw tool output for its territory, the `/lab` and demo nuances
from section 3, the finding format from section 7, and the instruction that its checklist is a
floor, not a ceiling.

**Phase 2 — own the compilation.** Agent reports are claims, not results. For every finding that
makes the report: spot-verify it yourself (open the file, check the knip line, confirm the
duplication really is duplication and not deliberate decoupling). Dedupe across agents, merge
overlapping findings, kill anything you cannot verify, and note verified-by-orchestrator on each.
Then run a **completeness critic** pass: what territory got thin coverage, which lens never ran,
which tool output has entries no finding explains? Send follow-up agents until two consecutive
rounds surface nothing new.

**Phase 3 — the report.** Write it. Commit it. Log the session in `progress.md`.

## 7. The deliverable

`docs/planning/audits/simplification-report.md` (plus `raw/` outputs and any per-area appendix
files that keep the main report readable). Structure:

1. **Executive summary**: baseline metrics table (SLOC by area, First Load JS per route, build
   time, dep count, duplication %, knip totals); the expected post-diet numbers; the five biggest
   wins in plain language the owner (non-technical) can read.
2. **Phased fix plan**: findings grouped into phases a fix session can execute top-to-bottom,
   ordered by the goal-sloc reduction order and tiered T1→T4. Each phase sized to fit comfortably
   in one session, and explicitly independent or ordered (say which). This mirrors how the owner
   ran his security remediation — phases he can feed to sessions one by one, or hand the whole
   file to one long session.
3. **Findings**, each with: stable ID (S-001…); title; file:line references; evidence (tool
   output line or code excerpt); what to do, concretely enough to execute without re-analysis;
   estimated LOC/KB/build-time saving; structural-vs-cheap classification; risk and the exact
   verification gate that proves it safe (`npm run check`, `npm run visual`, a named route, the
   security regression tests); autonomous-fix vs owner-decision flag.
4. **Owner decisions**: the short list of judgment calls (feature cuts, lab-room handling,
   dependency swaps with UX implications) written in plain non-technical language with a
   recommendation each.
5. **Not-findings**: things that look like bloat but were verified intentional (with the spec or
   commit that defends them), so future audits don't re-litigate them.
6. **Coverage map**: which agent covered what, which tools ran, what was consciously left out.

**Done means**: every 5b tool ran and its output is either explained by a finding or explicitly
cleared; every 5c checklist item was applied across the whole surface; two consecutive
completeness rounds came back dry; every finding is orchestrator-verified with evidence; the
report is committed; `progress.md` is updated; the working tree holds nothing else of yours.

---

*Methodology sources appended per the owner's request: getsentry/skills (code-simplifier, vendored
from Anthropic's official agent), maxim-saplin/goal-sloc and "Debloating the AI-Grown Codebase"
(dev.to/maximsaplin), rohitg00/awesome-claude-code-toolkit (dead-code/simplify/cleanup),
Effeilo/claude-code-frontend-skills, jonesrussell's codebase-cleanup-skill write-up, BSWEN's
reduce-LOC guide (the six LLM signatures), Vercel's "How we optimized package imports in Next.js",
Catch Metrics on barrel files, knip.dev and Effective TypeScript on knip, arXiv 2511.04824 on
agentic refactoring reliability.*
