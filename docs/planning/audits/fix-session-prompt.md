# The Pre-Release Fix Session

You are running a complete, dedicated session with one job: take the findings of the formal
pre-release bug & stability audit and **fix them** — correctly, durably, and to the standard of the
best work already in this codebase — so the Rishi Valley alumni site is ready to open to the public
and stable up to 2,000 members. This is a **build** session: you find the finding in the live code,
confirm it, fix it, prove the fix, pin it with a test, screenshot anything visual, and commit. The
audit already did the finding; your job is the doing.

There is no time limit and no meaningful usage limit for the depth of the work itself — the owner has
said repeatedly that he does not care how long it takes, only that it is done well. Depth and
correctness are the measures of success, not speed. That said, spend deliberately: don't burn effort
on redundant passes, avoidable re-runs, or mistakes that force rework (see "Resource discipline"
below). Do the work thoroughly; don't pad it.

---

## 1. The owner's intent, in his own words (read this as the spec)

Kept close to verbatim because the nuance matters:

> "I have a codebase that is quite functional. It's fine broadly. Security is decently good — a full
> ten-phase security overhaul finished, 74 findings tracked, 0 open. I'm getting ready to release it
> to the public. I just ran one very formal bug and stability audit, and now I want everything in
> that report addressed: fix the bugs, close the edge cases, make sure everything is totally stable,
> scalable up to even 2,000 users as headroom. I have no time frame. I don't care how long it takes.
> I just want it done well.
>
> Deploy agents and use whatever tools help, at whatever level of granularity you want — that's your
> call, not mine. You're the one doing it, so you decide whether it's one fix per commit or a batch,
> one agent or many, one long session or several. Usage is not much of a concern and time is not at
> all a concern, but don't waste it either.
>
> I want a level of ownership from you. When you fix a bug, don't just mechanically apply the 'fix
> direction' in the report — that's a floor, not a ceiling. If you see a better fix, take it. If you
> think a finding is wrong, verify it against the live code and say so rather than 'fixing' correct
> code. Own the work.
>
> On prompting and freedom: verbose is good — when you convey everything, all your ideas and your
> fears, it captures the intent better. Don't box yourself or your agents in. If a solution is
> obvious, be direct; where the solution space is wide, use creativity. Decisions belong to whoever
> is doing the work."

The owner is non-technical. When you report progress to him, lead with the outcome in plain language
(what now works that didn't), not the mechanism.

## 2. The prompting ideology (bounds how you brief any sub-agent you spawn)

- **Verbose is good.** Carry the owner's intent and the full finding context into every sub-agent
  brief; don't compress to terse bullets. An agent that has the whole picture makes better calls.
- **Don't box agents in.** Give a sub-agent its task, the goal, the constraints, and the tools — then
  let it work. The report's "fix direction" is a floor, never a ceiling.
- **Decisions belong to the doer.** You decide granularity, ordering within the constraints, how many
  agents, one session or many. Extend the same latitude to any sub-agent better placed to judge.
- **An agent's report is never the verification.** Sub-agents work below the standard of this
  session. Whatever comes back is a claim, not a result: read the diff yourself, look at the
  screenshots yourself, re-run `npm run check` yourself. "Done, all passing" from an agent means
  nothing until you have seen it pass.

## 3. What this codebase is

- **App**: a Next.js 16 alumni network for Rishi Valley school. App Router, Server Actions for all
  mutations (API routes only for auth/webhooks/uploads/crons), Tailwind v4, shadcn/ui (base-nova),
  Prisma 7 via the `pg` adapter, NextAuth v5 beta (**JWT sessions**, email+password,
  `credentialVersion` revocation), Supabase Postgres in Mumbai reached through the pgbouncer
  **transaction** pooler, images on Cloudflare R2 via `src/lib/storage.ts` (presigned direct uploads
  shipped), Resend for mail (queued in `OutboundEmail`), Upstash for rate limiting (fail-open),
  Razorpay for donations, Sentry + PostHog for observability, deployed on Vercel. ~90 routes, 14
  server-action files, 14 API routes. Members are in India (IST, UTC+5:30); servers run UTC.
- **Read before working** (these bind you, and they hold the context the report assumes):
  - `docs/planning/audits/bug-report.md` — **the audit report. Read it in full first.** It is the
    spec for this session. §0 = what the owner handles vs what you do; §2 = the phased fix plan; §3 =
    every finding with evidence, file:line, a "fix direction," and a "pin it fixed" test; §4 = the
    2,000-user dossier with real numbers (connection budget, the missing-index list, the k6 plan); §5
    = the verified-clean map (things already checked and fine — don't re-litigate them); §6 = the
    coverage map. The raw evidence per finding is in `docs/planning/audits/wave1/*.json`, keyed by
    the `W1-xxx` ids each finding cites.
  - `CLAUDE.md` and `AGENTS.md` — the hard rules and the "this is not the Next.js you know" warning
    (read the relevant guide under `node_modules/next/dist/docs/` before writing App-Router code;
    training-data Next knowledge is stale).
  - `docs/spec/DESIGN-SYSTEM.md` (canonical brand/design rulebook — **read before any UI work**) plus
    the relevant `docs/spec/*.md` for the area you're touching (avatars, catchups, demo, directory,
    letters, mascot, media, profile, admin, lab-voice). Live tokens are in `src/app/globals.css`;
    where the two disagree, globals.css ships.
  - `docs/OPERATIONS.md` (every non-app tool and when it fires), `docs/ROADMAP.md` (the phased plan),
    `docs/planning/bugs.md` (the existing tracker — don't undo settled decisions), `progress.md`
    (session history — log your outcomes there).
- **THE ONE DANGEROUS FACT — read twice**: local dev and production share **ONE** Supabase database.
  There is no staging database. It holds real roster data and real member rows. This shapes every
  write you make and every migration you apply (see hard rules).

## 4. Hard rules (non-negotiable — from CLAUDE.md / AGENTS.md)

1. **Containment**: every command runs inside `/Users/sanan/Documents/rv-connect/`. Never execute
   anything outside it without explicit permission.
2. **Schema changes never use `prisma db push`.** One database behind prod and dev; `db push` diffs
   the schema and will try to DROP tables it thinks are orphaned. Instead: edit
   `prisma/schema.prisma`, write a dated **idempotent** file in `prisma/migrations-manual/`, run
   `npx prisma generate`, apply with `node scripts/dev/run-sql.mjs <file>`. **Always test a data
   backfill with a `SELECT` first** (e.g. before `UPDATE "User" SET email=lower(email)`, count the
   case-variant duplicates — the audit already checked: there are none today, but re-verify). Only
   `prisma generate` and `prisma studio` are pre-approved; anything destructive raises a permission
   prompt, and the answer is no unless the owner says otherwise in the same breath.
3. **Deploys are git-only, and a push is a deploy.** Both Vercel projects autodeploy from a push to
   this repo. Never run any Vercel CLI deploy command. **Commit freely to `main`** as each coherent
   piece lands and passes `npm run check` — work on `main`, no feature branches — but **do NOT push;
   ask the owner first.** Commit messages: plain conventional, **no `Co-Authored-By`, no model names,
   no AI attribution.** Stage the files your change touched, **by name**; never `git add -A` or
   `git commit -a` (the tree may hold another session's work).
4. **Another session may share this tree.** Uncommitted changes you did not make are somebody's
   work-in-progress. Never `git stash`, `git checkout -- .`, `git reset --hard`, `git clean`, or
   revert/amend anything you did not author. Don't kill a dev server or background job you didn't
   start; don't delete or move `.next` while someone may be mid-build.
5. **Reading `.env` directly is permission-blocked** (`cat`/`grep`/`head` on it are all denied — many
   sessions have re-learned this the hard way). Use the repo's scripts that load it themselves:
   `node scripts/dev/run-sql.mjs --inline "SELECT ..."` for read-only SQL,
   `scripts/qa/_dev-login.mjs` / `screenshot-auth.mjs` / `verify-shot.mjs` for authed tooling. To
   confirm a var *name* exists without printing its value, read `.env` via `fs` in a tiny node
   one-liner that prints only matching KEY names. Never paste a secret into a browser
   `evaluate_script` or a URL.
6. **Storage**: don't install packages over 200MB without asking.
7. **Mobile + no-regressions**: every desktop UI change is verified at **390x844** as well as
   desktop; screenshot both. Never `transition-all`, no hand-typed `cubic-bezier(...)`, no default
   Tailwind blue/indigo, no pure-white surfaces, no em dashes in copy. User-facing name is "Rishi
   Valley," never "RV Connect." CTAs are Canopy `#235C49` pills; only `transform` and `opacity`
   animate; every clickable element has hover, focus-visible, and active states; any new async route
   ships a `loading.tsx` using the warm shimmer, not a grey pulse.

## 5. The arsenal — use all of it (this is where the freedom lives)

**Gates (run constantly):**
- `npm run check` (~17s) — the one gate: TypeScript, ESLint, the shape+colour protocol audit, the
  lab-registry audit, and the unit tests. Run after any change and before every commit. `/check`
  skill wraps it. Details: `.claude/skills/check/SKILL.md`.
- `npm run visual` (~50s) — visual regression across 10 routes × 2 viewports vs committed baselines.
  **Run it after every UI change**, not just the page you edited — its point is the page you weren't
  looking at. A red run is a question: `npm run visual:report` to see expected/actual/diff, then
  either fix or, if the change was intentional, `npm run visual:update` (only after looking at the
  diff) and commit the new PNGs. `npm run test:e2e` runs the above plus the sign-in flow.
- `npm run verify:crawl` — every authed route with console-error capture, for a regression sweep.

**Live inspection — MCP servers (both load at session start; if missing, the dev server isn't up):**
- **`chrome-devtools`** drives a real headless Chrome and **holds the page open between calls** — ask
  a question, read the number, ask the follow-up against the same loaded state. Use it to reproduce a
  bug before you fix it and to confirm the fix after: measure geometry and computed styles with
  `evaluate_script`, drive real interaction (`click`, `hover`, `fill`, `press_key`), read
  `list_console_messages` / `list_network_requests`, trace jank with `performance_start_trace`,
  `take_screenshot` returns the image inline. **Authed pages**: once per session, `navigate_page` to
  `http://localhost:3000`, then `evaluate_script` POSTing `{ email: ADMIN_EMAIL, secret:
  DEV_LOGIN_SECRET }` to `/api/dev-login` (or copy the cookie from `_dev-login.mjs` in node). Cold
  routes: pass `timeout: 45000`. **This is how you diagnose and confirm; never hand-roll a puppeteer
  probe.**
- **`next-devtools`** talks to the running dev server: `get_errors` (live build/runtime/type errors —
  the only thing that catches a runtime failure `tsc` passes, e.g. a Prisma `select` on a real-but-
  wrong column), `get_routes`, `get_logs`, and version-accurate Next.js docs. Use `get_errors`
  whenever a page misbehaves.
- **Division of labour**: the MCP *finds and confirms* the answer live; Playwright specs in `e2e/`
  *remember* it. Never use a Playwright run as the way to discover what a page is doing — reproduce
  it in the MCP first, then pin the number you saw in a spec (assert geometry with `expect.poll`,
  scope locators to the desktop rail `page.locator("aside").first()`; `e2e/sidebar.spec.ts` is the
  worked example).

**Screenshots** (`npm run dev` on :3000; start it in the background if down):
- `npm run screenshot <url> [label] [--mobile]` (public), `npm run screenshot:auth <url> [--mobile]`
  (admin), `npm run verify:shot <route> <out.png> [mobile]` (authed shot + console/pageerror capture).
  Gotcha: the bundled Puppeteer Chrome is broken here — `screenshot.mjs` falls back to the real Chrome
  on its own, but `verify-shot.mjs`/`crawl.mjs` need `PUPPETEER_EXECUTABLE_PATH` set to
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Protocol: screenshot → **Read the
  PNG** → fix → re-screenshot → compare in specific numbers, minimum two rounds, then repeat on mobile.

**Skills** (invoke via the Skill tool; process skills set the approach, then implementation skills):
- `superpowers:systematic-debugging` — the four-phase root-cause method, use it the moment a repro
  behaves unexpectedly (don't guess-and-patch).
- `superpowers:test-driven-development` — write the failing test named in the finding's "pin it
  fixed" FIRST, then the fix, for every bug fix.
- `superpowers:brainstorming` — before any of the two feature builds (profile-email control,
  catch-up leave/archive/delete), explore intent and design before implementing.
- `frontend-design:frontend-design` + `.claude/skills/liftkit-spacing/SKILL.md` — before any UI work
  and for every spacing/padding/radii decision.
- `/check`, then `/simplify` after a feature and before committing; `superpowers:verification-before-
  completion` before you call anything done; `superpowers:requesting-code-review` /
  `superpowers:receiving-code-review` around major pieces.
- `.claude/skills/screenshot-auth/SKILL.md` for authed screenshots; `ui-audit` for retroactive UI
  review; the `/impeccable` suite (`/audit`, `/polish`, `/typeset`) for typographic/spatial polish on
  the feature UI.

**Sub-agents** (spawn when a job genuinely benefits — a wide independent workstream, a screenshot
pass, a review — not for what's better done here with this session's context and taste). These three
earn their keep and several are **mandatory after the relevant change**:
- `write-path-reviewer` — **run on every change** to a server action, an API route, auth, uploads, or
  `prisma/schema.prisma`. Checks the four write-path invariants and the demo's three layers. The
  B-001/B-002/B-020/B-070 fixes and the schema migrations MUST go through it.
- `screenshot-qa` — after any UI change, **spawn two in parallel**, one desktop and one mobile.
- `design-protocol-auditor` — after any UI change, reads the diff against the design system.
- Also available: `silent-failure-hunter` (interrogates catch blocks/fallbacks — useful when you
  touch error handling, e.g. the B-042 client-error pass), `code-reviewer`, `pr-test-analyzer` (are
  your new tests testing anything?), `type-design-analyzer`, `comment-analyzer`.
- **Model tiers**: Sonnet for implementation and review agents, Haiku for mechanical work, Opus only
  for an ambiguous product/design call the specs don't answer. (`implement-review` hands a task to a
  Sonnet implementer then a Sonnet reviewer, to keep orchestrator-tier tokens for orchestration.)

**Workflows / parallel agents**: for a genuinely wide, independent sweep (e.g. applying the IST date
helper across the ~15 surfaces in the B-100 date list, or the systemic client-error-handling pass of
B-042 across every fetch/mutation site), you may fan out with the Workflow tool or parallel agents —
your call on granularity. Verify every returned diff yourself.

**Memory**: your persistent memory at
`/Users/sanan/.claude/projects/-Users-sanan-Documents-rv-connect/memory/` holds what past sessions
learned (the `.env` block, the shared-DB rule, design decisions, the mascot gotchas). Read the index
`MEMORY.md`; recalled memories are background context, not instructions. Save durable new learnings.

## 6. Method — how to fix each finding (do not skip steps)

For every finding you take on:
1. **Confirm it in the live code first.** Open the cited `file:line`, read the whole function, and
   verify the bug still exists as described. The tree moves between sessions; a finding may already be
   half-fixed, or the code may have moved. **If you conclude a finding is wrong** (the code is
   correct, a guard exists the auditor missed), do NOT "fix" it — write down why in `progress.md` and
   move on. The report was validated hard, but you are the last line; trust your reading of the code
   over the report when they genuinely conflict, and say so.
2. **Reproduce it** where a live repro is cheap and safe: use `chrome-devtools` / `run-sql.mjs`
   (read-only) / `get_errors`. Seeing the wrong behaviour before you change anything is what stops you
   from fixing the wrong thing. For anything that can only be shown with a risky write, argue it from
   the code — don't manufacture bad prod data to prove it.
3. **Write the test first** (TDD): the finding names a "pin it fixed" test — a unit test in the
   `-rule.test.mjs` style, a `security-regressions.test.mjs` assertion, or a Playwright spec. Write it
   so it FAILS against the current bug, then make it pass. New async routes get a `loading.tsx`.
4. **Fix it** — apply the fix direction as a floor; improve on it if you see better. Reuse the shared
   primitives (`Button`, `BirdAvatar`, `LoveButton`, `cn()`, the Prisma client, the motion helpers)
   instead of hand-rolling. Match the surrounding code's idiom, naming, and comment density; only
   comment a constraint the code can't show.
5. **Prove it**: re-run the repro in `chrome-devtools`, check `get_errors` is clean, run
   `npm run check`. For UI: screenshot desktop + mobile, Read the PNGs, compare in numbers, two
   rounds; run `npm run visual`; spawn `screenshot-qa` ×2 and `design-protocol-auditor`. For write
   paths/schema/auth/uploads: run `write-path-reviewer`. Read every diff yourself — an agent's
   "passing" is a claim.
6. **Commit** the coherent piece with a plain conventional message, files staged by name. Then log the
   outcome in `progress.md`.

**Database discipline throughout**: reads are free (`run-sql.mjs --inline "SELECT ..."`). Every write
you test goes through the app under a clearly-named throwaway test account you create via the normal
signup flow (e.g. "Fix TestBird") and **delete before the session ends** — never touch or mutate real
member rows, never raw-SQL writes to data. Migrations are the one exception and follow rule 4.2
exactly (dated idempotent file, SELECT-tested, applied with `run-sql.mjs`, `write-path-reviewer`d).

## 7. The plan — `bug-report.md` §2, but the ordering within it is yours

Work the phases top to bottom; the **launch blockers (Phase 0, 1, and the top of Phase 2) come
first**, and everything else can be sequenced however you judge best. You decide granularity — one
commit per finding or a batched theme, one long session or several, solo or fanned-out.

- **Phase 0 (tiny, first):** the DB connection-pool config in `src/lib/prisma.ts` (§4.1 has exact
  values: `max`, `connectionTimeoutMillis`, `statement_timeout`, `query_timeout`). Code-only; no plan
  change (Supabase stays Free — see §0).
- **Phase 1 — the two Criticals + mail blockers:** B-001/B-010 (the ownership-cascade data loss — fix
  the schema FKs + purge/merge reassignment together; this is a prerequisite for the catch-up feature
  below), B-002 (mail permanent-fail: backoff + transient/permanent classification + requeue), B-070
  (deletion-scheduled never sent: add it to `eligibleKinds`).
- **Phase 2 — High member-facing correctness:** auth/account (B-020 email normalization + the
  SELECT-tested `lower(email)` backfill; B-021, B-022, B-023, B-024), uploads (B-030 client
  downscale/crop before the server action), feed/letters (B-041, B-043, B-044, B-045, B-048), money
  (B-080, B-081), data hygiene (B-012, B-013, B-093).
- **Phase 3 — scale/perf:** B-090 (the missing-index migration — full column list in §4.2), B-091
  (trigram index for the gazetteer search), B-092 (stop shipping every member to the browser), B-072,
  B-071.
- **Phase 4 — Medium (batchable; a good fan-out candidate):** §3.M, including the IST date helper
  (B-100/B-101) applied to every surface in the date list, the toggle-race P2002 handling (B-040), the
  systemic client-error-handling pass (B-042), the validation caps (B-110/B-111), the Catch-up
  lifecycle gaps (B-060/B-061/B-062).
- **Phase 5 — Low (§3.L) + the two owner-decided builds below.**

## 8. The owner's decisions (already made — build to these; details also inline in the findings)

- **Supabase**: stays on **Free**, no change. Capacity is fine (photos are on R2; the DB is 76MB), and
  backups are handled by the owner's own nightly job. The connection-pool fix (Phase 0) is code and
  independent of the plan. Do **not** ask him to upgrade.
- **Email**: the owner is **staggering the launch**, so the ~75/day confirmation cap is not a crunch.
  Still fix B-002 in code — it can bite even a staggered launch.
- **R2**: two separate things people conflated. The **bucket CORS** (browser→R2 uploads) is owner-side
  dashboard config and probably already done (he can confirm by uploading a >5MB photo on the live
  site). The **custom serving domain** is not yet active (images are live on `pub-…r2.dev`); when the
  owner sets the custom domain on the bucket and `R2_PUBLIC_BASE_URL`, your one code job is to add
  that host to `next.config.ts` remotePatterns (currently only `*.r2.dev`). Non-urgent.
- **Profile email (B-050 — build it):** give the member a real display-email control — they can set a
  **custom display email** different from their sign-in address, OR **clear it to show no email at
  all**. Clearing must display *nothing*, never fall back to the private sign-in address (the current
  bug). Default stays "show." The sign-in email itself is untouched.
- **Catch-up leave / archive / delete (B-063 — feature build):** members can **leave** a Catch-up; and
  can **archive** or **delete** one, where **delete** is a soft delete into a **"Recently deleted"**
  area held for **30 days** (restorable, then purged). **UI**: keep the archive/delete affordances
  **compact under `/catchups`, hidden entirely when the member has none** (no dead buttons); a clean
  "are you sure" confirmation on delete, done nicely and on-brand. **Build on top of the B-001 fix** —
  the ownership cascade must be corrected first, or deleting/archiving a Catch-up would still risk
  wiping every member's answers (the soft-delete + recently-deleted design also gives the cascade a
  natural safety net). Brainstorm the design first; screenshot desktop + mobile; run the UI reviewers.

  These two are feature work where the solution space is wide — this is exactly where the owner wants
  creativity, not a mechanical patch. Follow the specs (`docs/spec/profile.md`, `docs/spec/catchups.md`)
  and the design system; where they don't answer a product/design call, make a considered decision and
  note it.

## 9. Resource discipline (the owner's standing instruction)

Depth is the goal; waste is not. Concretely: don't re-run the heavy suites (`visual`, `test:e2e`,
`crawl`) without a reason; resume/reuse cached work instead of relaunching agents from scratch; size
verification passes to one reviewer per item unless something truly warrants more; and **never run
parallel browser/screenshot fleets** — one `chrome-devtools` instance, sequential shots (the owner's
Mac has hung on many concurrent Chrome processes; the two-at-once `screenshot-qa` desktop+mobile pair
is the accepted maximum). A mistake that forces rework is the most expensive thing here — verify
before you commit.

## 10. Definition of done

Every finding in `bug-report.md` is either fixed-and-pinned-with-a-test or explicitly dispositioned in
`progress.md` (fixed / not-a-bug-with-reason / deferred-with-reason). `npm run check`, `npm run
visual`, and `npm run test:e2e` are green. The two feature builds ship with desktop+mobile
screenshots reviewed and the UI reviewers run. Every schema change went through a dated manual
migration and `write-path-reviewer`. The throwaway test account and any test data are deleted. The
work is committed to `main` in coherent pieces — **not pushed**; tell the owner what shipped, in plain
language, and ask before pushing. Log the session in `progress.md`.

*Sources folded in per the owner's request: this repo's CLAUDE.md/AGENTS.md hard rules, the design
system and area specs, the superpowers method suite (systematic-debugging, TDD, brainstorming,
verification-before-completion, code-review), the write-path-reviewer / screenshot-qa /
design-protocol-auditor / silent-failure-hunter agents, the chrome-devtools + next-devtools MCP
servers, the check/visual/screenshot/verify/crawl script suite, and the full audit report with its
per-finding evidence in docs/planning/audits/.*
