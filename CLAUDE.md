@AGENTS.md

# Project

Next.js 16 alumni website for Rishi Valley. Tailwind v4, shadcn/ui (base-nova), Prisma via the `pg`
adapter on Supabase Postgres (`ap-south-1` Mumbai, one database for production and local dev),
NextAuth v5 (email + password), images on Cloudflare R2, deployed to Vercel. Fonts: Libre Baskerville
(headings), Source Sans 3 (body). Icons: Lucide for UI chrome, `@phosphor-icons/react` duotone for
decorative. Motion: `motion` for micro-interactions, `@formkit/auto-animate` for lists.

# Read before working

- `docs/spec/DESIGN-SYSTEM.md` is the canonical brand and design rulebook. **Read it before any UI
  work.** Live tokens are in `src/app/globals.css`; where the two disagree, globals.css is what ships.
- `docs/spec/` holds a deep spec per area (admin, avatars, catchups, demo, directory, letters,
  mascot, media, profile, lab-voice). Read the one you are touching.
- **`docs/spec/hand-run-passes.md` is the protocol for every pass where a session judges real
  members' data and writes it back** (the Collection's photograph tags, the directory's
  profession tags). Pick -> read -> dry run -> apply, with an undo. None of them is an API
  call: the model in the loop is a session on the owner's own subscription. Read it before
  building, changing or running one -- a third pass CONFORMS to that shape rather than
  inventing its own, and `scripts/qa/hand-run-passes.test.mjs` fails if it does not.
- **`docs/TRAPS.md` is what this stack does to you** -- Postgres, Prisma, Next and Vercel facts that
  have each cost a session, every one proved before it was written down. Read it before touching the
  database, a migration, a scheduled job, or anything that looks like a race. (The tooling
  equivalents are the "Gotchas" list further down this file.)
- `docs/OPERATIONS.md` is every non-application tool and the moment each one is meant to
  fire: the visual suite, the CI gate, the nightly database backup, Sentry, Renovate.
- `docs/ROADMAP.md` is the phased plan. `docs/planning/bugs.md` is the bug tracker,
  `docs/planning/FEATURES.md` the parked ideas. **The session history is `docs/history/progress-<YYYY-MM>.md`
  for the full entry, and `progress.md` for the one line that indexes it** — that way round since
  2026-09-07; `scripts/qa/progress-log.test.mjs` fails the build if an entry body lands in the index.
- `docs/audit-fix/` holds every formal audit and its fix campaign, dated. A fix session's
  entire handover is that audit's `fix-prompt.md`: read it, execute, and update the same
  file before ending so the next session can be started by @-ing it alone. **A fix session is
  run by `/campaign`** — the globally installed skill that front-loads the owner's questions,
  then works the phases one after another, briefing one worker per unit and verifying each one
  itself. The same skill runs a design rework from `docs/planning/<campaign>/handover.md`; either
  way it resumes from the file's board, which `scripts/qa/campaign.test.mjs` keeps well-formed.
- **`/lab` is the one index of every dev and preview room.** Nothing is browsable that is not listed
  in `src/app/lab/_registry.ts`. `/lab/v2` is the approved look; `/lab/logo` documents the final mark.

# Hard Rules

- **Containment**: all commands run inside `/Users/sanan/Documents/rv-connect/`. Never execute anything
  outside it without explicit permission.
- **The repo root is closed**: never add a file or a folder to `/Users/sanan/Documents/rv-connect/`
  itself. Owner, repeatedly, most recently 2026-09-01: *"I hate cluttering root directory."* The root
  is config and entry points; everything else has a home already. A scratch probe, a one-off
  measurement, a throwaway script goes in `/tmp` or is deleted by the same command that wrote it; a
  script that stays goes in `scripts/dev/` or `scripts/qa/` with its working folder BESIDE it, never
  above it (`scripts/qa/hand-run-passes.test.mjs` fails a pass whose `OUT` climbs to the root);
  screenshots go to `e2e/.shots/`; notes go in `docs/`. Adding to the root needs a reason you can say
  out loud AND no cleaner place to put it -- a tool that only reads config from the root is a reason,
  "it was convenient" is not. **A scratch file is deleted in the same command that created it**, so a
  crashed session cannot leave one behind.
- **Deploys are git-only**: never run `vercel deploy`, `vercel --prod`, or any Vercel CLI command that
  ships code or edits project config. Both Vercel projects autodeploy from a push to this repo, and
  that push is the only way anything reaches production. Env vars, domains and settings are the
  owner's, in the dashboard.
- **Schema changes never use `prisma db push`**: there is ONE Supabase database behind both
  production and local dev, and `prisma.config.ts` points the CLI at `DIRECT_URL`, the live session
  pooler. `db push` diffs the schema and will try to DROP tables it considers orphaned
  (`docs/spec/catchups.md:462`). Instead: edit `prisma/schema.prisma`, write a dated idempotent file
  in `prisma/migrations-manual/`, run `npx prisma generate`, apply with `node scripts/dev/run-sql.mjs`.
  Only `prisma generate` and `prisma studio` are pre-approved in `.claude/settings.local.json`; anything destructive raises a permission prompt, and
  the answer to that prompt is no unless the owner says otherwise in the same breath.
- **Git commits**: never include `Co-Authored-By`, model names, or any AI attribution. Plain
  conventional commit messages.
- **150 words is the HARD CEILING for a commit message**, subject line included, and it is absolute, NOT A TARGET TO DRIFT     PAST ACCIDENTALLY OR IGNORE. Most commits want less: a subject line and two or three sentences saying
  what changed and why. The body is for the reasoning a future `git blame` cannot recover — not a
  retelling of the diff, not a bulleted inventory of every touched file, not the session's narration.
  Going over needs a reason you can state out loud (a migration whose ordering must be recorded, a
  security fix whose blast radius has to be spelled out); "there was a lot in this commit" is not one
  — that is a sign it should have been several commits. And don't take 10 trims to get the right count. Get it right the first time.
- **Version control is maintained, not asked for**: work on `main`, no feature branches. Commit each
  coherent piece as it lands and passes `npm run check` — do not wait to be told, and do not let a
  session end with a working tree full of unrelated changes. Stage the files your task touched, by
  name; never `git add -A` or `git commit -a`, because the tree may hold work that is not yours.
  A **push is a deploy** (see above), so committing is yours to do freely and pushing is not: ask
  first.
- **A commit is one revertable change, not one file type**: the point of a commit is a state the
  project can be rolled back to, so everything a change needs to be complete goes in **one** commit —
  the code, the test that pins it, the ledger line, the `progress.md` entry, the spec edit, the
  visual baseline it intentionally moved. Reverting the commit must undo the whole thing, docs
  included. Concretely:
  - **No trailing `docs:` commit for work already committed.** Write the doc as part of the change
    and stage it with the code. A standalone `docs:` commit is only for documentation that *is* the
    work: a new spec, a rewritten TRAPS entry, a README with no code behind it. Twenty fixes must
    not produce twenty `docs(progress)` commits — and batching them into one end-of-session docs
    commit is the same mistake, just tidier.
  - **No `test:` commit for a test that belongs to a fix.** A test that pins a bug ships in that
    bug's commit; a `test(visual): rebaseline …` for a deliberate UI change ships in that UI
    change's commit. `test:` alone is for test infrastructure or a suite added on its own.
  - **A scratch test is deleted, not committed.** If it existed only to prove a fix worked in this
    session, remove the file before staging. Keep it only if it would catch a regression later —
    and then it rides along with the fix, per above.
  - **Split a commit when the pieces are independent**, not when the file extensions differ. Two
    unrelated bug fixes are two commits. One bug fix plus its test plus its ledger line is one.
- **Another session may be working in this same tree**: several Claude sessions run against this one
  checkout, so uncommitted changes you did not make are somebody's work in progress, not noise.
  Never `git stash`, `git checkout -- .`, `git reset --hard`, `git clean`, or revert, rewrite or
  amend anything you did not author. If a file you need already has unrelated edits, work around
  them and leave them staged as you found them; if that is impossible, stop and say so. The same
  goes for shared processes: don't kill a dev server or a background job you did not start, and
  don't delete or move `.next` while someone else may be mid-build.
- **Storage**: don't install packages over 200MB without asking.
- **Mobile**: every desktop UI change is verified at 390x844 as well. Screenshot both.
- **No `transition-all`**, no hand-typed `cubic-bezier(...)`, no default Tailwind blue/indigo, no pure
  white surfaces, no em dashes in copy. User-facing naming is "Rishi Valley", never "RV Connect".
- **The bar is a test, not an adjective.** Everything above is a prohibition; this is the thing to
  clear. Two questions decide whether a surface is finished, both his: *does it give you any
  dopamine*, and *can you tell it belongs to this app while looking like nothing already in it*
  (the Action Button analogy, `docs/planning/catchups-rework/brief.md` ¶3 and ¶42). Something that
  breaks none of the rules above and answers neither is not done. "Beautiful", "delightful",
  "premium" and their friends are **not** the bar and do not go in a brief: they have no referent,
  so they get filled with the median of everything ever called that, which is the house style of
  every AI-built app. Name what it should feel like, or what it must not resemble, and let the two
  questions judge the result.

# Working agreement

**Before**: read DESIGN-SYSTEM.md plus the relevant `docs/spec/*`. Browse `/lab` for the room that
already explored the area. Import the shared primitives (`Button`, `BirdAvatar`, `LoveButton`,
`FeedColumn`, `ContentColumn`, `src/components/common/motion.tsx`) instead of hand-rolling; do not
rebuild what exists. Check `components.json` before adding a shadcn component. Reuse `cn()` from
`src/lib/utils.ts` and the Prisma client from `src/lib/prisma.ts`.

**After**: run `npm run check` (below). Every clickable element has hover, focus-visible and active.
CTAs are Canopy `#235C49` pills. Only `transform` and `opacity` animate. Any new async route ships a
`loading.tsx` using the warm shimmer, not a grey pulse. Screenshot desktop and mobile, minimum two
rounds. Run `/simplify`. Log the session — the full entry in `docs/history/progress-<YYYY-MM>.md`,
one line in `progress.md` — written before you commit, and staged
in the same commit as the work it describes.

## "kowalski"

When the owner says `kowalski` (any casing, on its own or inline), reply immediately with a
compact progress report: what is happening right now; percent through the
current item list (n of m, name the current item); percent of effort remaining; percent of
estimated wall-clock remaining; anything blocked or waiting on him. No preamble, no
re-planning, and no tool calls beyond what counting requires. Continue your work, don't stop after reporting

# Tooling

## `npm run check` (or the `/check` skill)

The one gate, and it is the SAME list CI runs on a push: TypeScript, ESLint, the shape+colour
protocol audit, the lab registry audit, every `*.test.mjs` the repo tracks, the
dependency advisory gate and the security audit status board, in about 30 seconds. Run it after any
change and before every commit. A single gate while iterating: `npm run check -- lint`. Details and
how to read a failure: `.claude/skills/check/SKILL.md`.

`check.yml` runs `npm run check` and nothing else, on purpose: the two security gates used to be
extra CI-only steps, so a green local run could still fail the push. Never add a step to that
workflow — add a gate to `check.mjs`, or `scripts/qa/ci-parity.test.mjs` fails the build.

Three things it will now tell you that it used to swallow (audit C-190/C-195): a lint or protocol
run that CRASHED reports "tool crashed" rather than "clean", and the test gate fails if the suite
drops below its floor or if a test-shaped file exists that the runner would not execute.

## MCP servers (`.mcp.json`)

- **`next-devtools`** talks to the running dev server. Use `get_errors` whenever a page misbehaves:
  it returns live build, runtime and type errors, which is the only thing that catches the failure
  mode in gotcha 3 below. Also `get_routes`, `get_logs`, and version-accurate Next.js docs.
- **`chrome-devtools`** drives a real headless Chrome and **holds the page open between calls**, so
  you can ask one question, read the number, and ask the follow-up against the same loaded state.
  That is the point: **never hand-roll another puppeteer probe script.** Measure geometry and computed
  styles with `evaluate_script`, drive real interaction (`click`, `hover`, `fill`, `press_key`),
  read `list_console_messages` and `list_network_requests` without wiring listeners, and trace jank
  with `performance_start_trace` instead of a rAF sampler. `take_screenshot` returns the image
  inline, so a quick look costs no file.
  - **Authed pages work here.** Once per session: `navigate_page` to `http://localhost:3000`, then
    `evaluate_script` POSTing `{ email: ADMIN_EMAIL, secret: DEV_LOGIN_SECRET }` to
    `/api/dev-login` (the old `/api/auth/admin-login` is deleted -- security audit C1-b, it
    needed no secret and existed in production). The cookie holds
    for every later call. `--isolated` gives a fresh profile, so redo it if the browser restarts.
  - **If a test needs a profile that is not yours, it is Jerry Maguire** (`sanan.shankar@gmail.com`),
    which exists for exactly that. Never sign in as a real alumnus: dev-login writes presence
    telemetry against whoever it signs in as, and on 2026-08-25 a guard check run as a 1978 alumnus
    put him on the admin panel in the owner's own analytics room.
  - First hit of a cold route outruns the 10s default. Pass `timeout: 45000`.
  - The **scripts** still own what must repeat without you: `npm run check` gates, sweeps across many
    routes (`verify:crawl`, `theme-shots`), the numbered PNGs the two-round compare reads, and the
    Playwright specs in `e2e/`. The division of labour: **the MCP finds the answer, Playwright
    remembers it** — never use a Playwright run as the way to discover what the page is doing
    (gotcha 7 below).

Both load at session start. If a tool is missing, the dev server is probably not running.

## Subagents

**The default is to do the work yourself.** An agent is worth spawning only when it is materially
useful: a job whose output would flood this context without teaching it anything (a screenshot
pass, a crawl, a sweep across many files), or several genuinely independent jobs that can run at
once. Anything short, or anything needing the taste and history in this session, is done better here.

**An agent's report is never the verification.** They work below the standard of this session, so
whatever comes back is a claim, not a result: read the diff yourself, look at the screenshots
yourself, re-run `npm run check` yourself. "Done, all passing" from an agent means nothing until you
have seen the thing pass.

These three still earn their keep:

| Agent | When | Notes |
|---|---|---|
| `screenshot-qa` | after any UI change | spawn **two in parallel**, one desktop and one mobile |
| `design-protocol-auditor` | after any UI change | reads the diff against the design system, triages the gates |
| `write-path-reviewer` | server actions, API routes, auth, uploads, schema | checks the four write-path invariants and the demo's three layers |

**Model tiers**: Sonnet for implementation and review agents, Haiku for mechanical work. Opus only
for an ambiguous product or design call the specs do not already answer. Fable for heavy
orchestration and for highly creative work -- a wide audit that has to hold a whole area in its
head at once, or a piece of writing or design that needs invention rather than execution. Pass
`model: "fable"` to the Agent tool; it overrides whatever the agent definition asks for. (The one
exception: `subagent_type: "fork"` always inherits this session's model.)

## Skills

| Trigger | Skill |
|---|---|
| Before any UI code or design decision | `/frontend-design` |
| Every UI task (spacing, padding, radii) | `.claude/skills/liftkit-spacing/SKILL.md` |
| After a feature, before committing | `/check`, then `/simplify` |
| Typography, spatial polish, removing AI-slop | `/impeccable` (`/audit`, `/polish`, `/typeset`) |
| Screenshotting authenticated pages | `.claude/skills/screenshot-auth/SKILL.md` |
| Reviewing existing pages retroactively | `.claude/skills/ui-audit/SKILL.md` |
| Tagging Collection photographs nobody filed | `.claude/skills/tag-photos/SKILL.md` |
| Filing members under a profession for the directory filter | `.claude/skills/tag-professions/SKILL.md` |
| Building, changing or running ANY of the above hand-run passes | read `docs/spec/hand-run-passes.md` first |
| Handed a campaign's `fix-prompt.md` or `handover.md`, or asked to run, continue or finish a fix or rework campaign | `/campaign` |
| A bug that survived two attempts | superpowers systematic debugging |
| Writing a prompt, spec, plan or handover another session works from | `.claude/skills/writing-for-agents/SKILL.md` |

# Screenshots

Dev server: `npm run dev` on `http://localhost:3000`. Start it in the background if it is not up.

| Command | Use |
|---|---|
| `npm run screenshot <url\|/path> [label] [--mobile]` | public pages; falls back to real Chrome on its own |
| `npm run screenshot:auth <url\|/path> [--mobile]` | signed in as admin |
| `npm run verify:shot <route> <out.png> [mobile]` | authed shot **plus** console and pageerror capture |
| `npm run verify:crawl` | every live route signed in, with status and console errors |
| `npm run shots:clean` | clear scratch shots older than a week |

All five use `e2e/.shots/` -- gitignored scratch, beside Playwright's own run output, and **the only
folder any of them writes to**. `.tmp-shots/` at the repo root was a second one until 2026-09-07;
`apple-edge/look.mjs` was the last thing writing there and now writes beside the rest. The folder had
reached 630 MB with nothing ever clearing it, which is what `shots:clean` is for -- run it at the end
of a session.
Nothing puts an image at the repo root any more (`temporary screenshots/` moved there on
2026-08-28), so if that folder reappears at the root, something hand-rolled a path instead
of using these commands.

Protocol: screenshot, **Read the PNG**, make fixes, re-screenshot, compare in specific numbers ("the
heading gap is 24px, should be 16px"). Minimum two rounds, then repeat on mobile.

## Visual regression: `npm run visual` — run it after every UI change

The above catches what you thought to look at. **`npm run visual` catches what you didn't**: it
compares every route in `ROUTES` (`e2e/visual.spec.ts`) x 2 viewports against committed baselines in
`e2e/__screenshots__/` and fails on a diff of 100 pixels. Run it before you commit any UI work, not
just on the page you edited — its whole point is the page you were not looking at.

| Command | Use |
|---|---|
| `npm run visual` | compare every route against its baseline |
| `npm run visual:update` | **the change was intentional** — rewrite the baselines, and stage the PNGs with the UI change that moved them, not as a `test(visual):` commit of their own |
| — | Six routes photograph a live database, so they are masked: feed, letters, catchups and both halves of the Collection past the page header, the directory just its map and headcount. A red run on those six is real. See OPERATIONS §1. |
| `npm run visual:report` | open the three-up expected/actual/diff view of the last failure |
| `npm run test:e2e` | the above plus the sign-in flow checks |

A red run is a question, not a verdict: open the report, look at the diff, then either fix the
regression or accept it with `visual:update`. **Never run `visual:update` to make a failure go away
without looking at the diff first** — that is the one way to make this whole thing worthless.

Adding a route: one line in `ROUTES` in `e2e/visual.spec.ts`, each with its reason. Something that
moves on its own (a live counter, a relative timestamp, the idling hoopoe) goes in
`volatileRegions()` so it is masked rather than making the suite cry wolf.

Those numbers come from `chrome-devtools` (above), not from squinting at the PNG: `resize_page` to
390x844 or 1440x900, then `evaluate_script` for the real rects and computed styles. The scripts are
for the shots that go on the record and for sweeps; the MCP is for the measuring in between.

**Gotchas that have bitten past sessions:**

1. **Stale `.next` cache.** If every route 404s or a `globals.css` change does not appear, the
   Turbopack cache is corrupt. `rm -rf` is blocked, so move it aside: `mv .next .next-stale` then
   restart. Always clear and restart after editing `globals.css`; HMR does not reliably pick up token
   changes. The folder reaching several GB is normal.
2. **The bundled Puppeteer Chrome is broken here, and nothing asks you about it any more.** Every
   `puppeteer.launch()` in `scripts/` goes through `chromePath()` in `scripts/qa/_probe-kit.mjs`,
   which falls back to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` on its own.
   `verify-shot.mjs` and `crawl.mjs` used to need `PUPPETEER_EXECUTABLE_PATH` exported by hand;
   since 2026-09-07 they do not. Set the variable only to point at some other browser.
3. **Verify at runtime, not just `tsc`.** `tsc --noEmit` once passed a Prisma `select` on a column
   that did not exist, which then 500'd the feed. Screenshot the surface and check the console, or ask
   `next-devtools` for `get_errors`.
4. **`verify-shot.mjs` and `crawl.mjs` sign in first**, so `/` redirects to `/feed`. Use
   `screenshot.mjs` for anything that must be seen signed out.
5. **Every new dev/preview page must be registered** in `src/app/lab/_registry.ts` in the same change.
   `npm run check` fails if it is not.
6. **A lab room has a house voice.** Read `docs/spec/lab-voice.md` before writing one, and do not
   infer the style from whichever room you read last. That is how every room ended up opening with a
   stats scoreboard it had no numbers for. Short sentences, plain words, something to actually look
   at, and a stats block only when the numbers are the finding.
7. **A Playwright spec is written after the answer is known, never as the way to find it.** The
   2026-08-19 sidebar test burned three failed rounds re-running the suite to debug locators while
   `chrome-devtools` sat there with the same page open. Reproduce the behaviour in the MCP first
   (click it, read the rects, watch the DOM), and only then write the spec that pins the number you
   already saw. When writing one against this UI, two locator traps are known: the mobile drawer
   renders the same components again through a Radix portal, so scope every locator to the desktop
   rail (`page.locator("aside").first()`), and a node mid exit-animation still answers
   `toBeVisible()`, so animated UI is asserted on **geometry with `expect.poll`**, not element
   presence. `e2e/sidebar.spec.ts` is the worked example of both.

8. **Adding a Prisma model used to need a dev server restart. It no longer does.**
   `src/lib/prisma.ts` caches the client on `globalThis` to survive HMR, so `npx prisma generate`
   never reached the running server and the new model was simply `undefined` -- from code that
   typechecks perfectly, because `tsc` reads the fresh types off disk while the server holds the
   old object. There WAS a guard: a hand-written `clientKey` string to bump in the same commit as
   any schema change. Three schema changes in a row forgot it on 2026-08-19.
   The key now derives itself from `Prisma.ModelName`, which hot reload re-imports fresh even
   while the cached client stays stale, so the client rebuilds on its own and logs
   `[prisma] schema changed; rebuilding the dev client`. Nothing to remember. If you ever see
   `Cannot read properties of undefined (reading 'findMany')` again, that mechanism has broken.

   Related: anything writing telemetry from a layout must **log its own failures in development**.
   `touchLastSeen` swallows errors so no member ever sees an error page over a statistics row, and
   the first time it broke the only symptom was an empty table with no clue why. A guard that hides
   its own breakage is worse than no guard.

# Reference images

When the owner supplies a screenshot of another site: match layout, spacing, typography and colour
faithfully, then swap in this project's brand colours, fonts and real data. Screenshot the result,
compare against the reference, and do at least two rounds with specific callouts on spacing, font
size/weight/line-height, exact hex, alignment, radius and shadow.
