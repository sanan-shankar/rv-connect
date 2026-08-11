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
- `docs/spec/` holds a deep spec per area (avatars, catchups, demo, directory, letters, mascot,
  media, profile, lab-voice). Read the one you are touching.
- `docs/ROADMAP.md` is the phased plan. `docs/planning/bugs.md` is the bug tracker,
  `docs/planning/FEATURES.md` the parked ideas. `progress.md` is the session history; log outcomes there.
- **`/lab` is the one index of every dev and preview room.** Nothing is browsable that is not listed
  in `src/app/lab/_registry.ts`. `/lab/v2` is the approved look; `/lab/logo` documents the final mark.

# Hard Rules

- **Containment**: all commands run inside `/Users/sanan/Documents/rv-connect/`. Never execute anything
  outside it without explicit permission.
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
- **Version control is maintained, not asked for**: work on `main`, no feature branches. Commit each
  coherent piece as it lands and passes `npm run check` — do not wait to be told, and do not let a
  session end with a working tree full of unrelated changes. Stage the files your task touched, by
  name; never `git add -A` or `git commit -a`, because the tree may hold work that is not yours.
  A **push is a deploy** (see above), so committing is yours to do freely and pushing is not: ask
  first.
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

# Working agreement

**Before**: read DESIGN-SYSTEM.md plus the relevant `docs/spec/*`. Browse `/lab` for the room that
already explored the area. Import the shared primitives (`Button`, `BirdAvatar`, `LoveButton`,
`FeedColumn`, `ContentColumn`, `src/components/common/motion.tsx`) instead of hand-rolling; do not
rebuild what exists. Check `components.json` before adding a shadcn component. Reuse `cn()` from
`src/lib/utils.ts` and the Prisma client from `src/lib/prisma.ts`.

**After**: run `npm run check` (below). Every clickable element has hover, focus-visible and active.
CTAs are Canopy `#235C49` pills. Only `transform` and `opacity` animate. Any new async route ships a
`loading.tsx` using the warm shimmer, not a grey pulse. Screenshot desktop and mobile, minimum two
rounds. Run `/simplify`. Log the session in `progress.md`.

# Tooling

## `npm run check` (or the `/check` skill)

The one gate. Runs TypeScript, ESLint, the shape+colour protocol audit, the lab registry audit and
the 14 unit tests in about 17 seconds. Run it after any change and before every commit. A single gate
while iterating: `npm run check -- lint`. Details and how to read a failure: `.claude/skills/check/SKILL.md`.

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
    `evaluate_script` POSTing `{ email: ADMIN_EMAIL }` to `/api/auth/admin-login`. The cookie holds
    for every later call. `--isolated` gives a fresh profile, so redo it if the browser restarts.
  - First hit of a cold route outruns the 10s default. Pass `timeout: 45000`.
  - The **scripts** still own what must repeat without you: `npm run check` gates, sweeps across many
    routes (`verify:crawl`, `theme-shots`), and the numbered PNGs the two-round compare reads.

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
for an ambiguous product or design call the specs do not already answer.

## Skills

| Trigger | Skill |
|---|---|
| Before any UI code or design decision | `/frontend-design` |
| Every UI task (spacing, padding, radii) | `.claude/skills/liftkit-spacing/SKILL.md` |
| After a feature, before committing | `/check`, then `/simplify` |
| Typography, spatial polish, removing AI-slop | `/impeccable` (`/audit`, `/polish`, `/typeset`) |
| Screenshotting authenticated pages | `.claude/skills/screenshot-auth/SKILL.md` |
| Reviewing existing pages retroactively | `.claude/skills/ui-audit/SKILL.md` |
| A bug that survived two attempts | superpowers systematic debugging |

# Screenshots

Dev server: `npm run dev` on `http://localhost:3000`. Start it in the background if it is not up.

| Command | Use |
|---|---|
| `npm run screenshot <url> [label] [--mobile]` | public pages; falls back to real Chrome on its own |
| `npm run screenshot:auth <url> [--mobile]` | signed in as admin |
| `npm run verify:shot <route> <out.png> [mobile]` | authed shot **plus** console and pageerror capture |
| `npm run verify:crawl` | every live route signed in, with status and console errors |

Protocol: screenshot, **Read the PNG**, make fixes, re-screenshot, compare in specific numbers ("the
heading gap is 24px, should be 16px"). Minimum two rounds, then repeat on mobile.

Those numbers come from `chrome-devtools` (above), not from squinting at the PNG: `resize_page` to
390x844 or 1440x900, then `evaluate_script` for the real rects and computed styles. The scripts are
for the shots that go on the record and for sweeps; the MCP is for the measuring in between.

**Gotchas that have bitten past sessions:**

1. **Stale `.next` cache.** If every route 404s or a `globals.css` change does not appear, the
   Turbopack cache is corrupt. `rm -rf` is blocked, so move it aside: `mv .next .next-stale` then
   restart. Always clear and restart after editing `globals.css`; HMR does not reliably pick up token
   changes. The folder reaching several GB is normal.
2. **The bundled Puppeteer Chrome is broken here.** `screenshot.mjs` falls back to
   `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` by itself. `verify-shot.mjs` and
   `crawl.mjs` do **not**: set `PUPPETEER_EXECUTABLE_PATH` to that path or they exit with a stack trace.
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

# Reference images

When the owner supplies a screenshot of another site: match layout, spacing, typography and colour
faithfully, then swap in this project's brand colours, fonts and real data. Screenshot the result,
compare against the reference, and do at least two rounds with specific callouts on spacing, font
size/weight/line-height, exact hex, alignment, radius and shadow.
