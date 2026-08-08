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
  in `src/app/lab/_registry.ts`. (The old `/preview/*` tree was moved under `/lab` on 2026-07-30 and
  its URLs are not redirected. `/lab/v2` is the approved look; `/lab/logo` documents the final mark.)

# Hard Rules

- **Containment**: all commands run inside `/Users/sanan/Documents/rv-alumni/`. Never execute anything
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
  Twelve migrations have shipped that way. Only `prisma generate` and `prisma studio` are
  pre-approved in `.claude/settings.local.json`; anything destructive raises a permission prompt, and
  the answer to that prompt is no unless the owner says otherwise in the same breath.
- **Git commits**: never include `Co-Authored-By`, model names, or any AI attribution. Plain
  conventional commit messages.
- **Storage**: don't install packages over 200MB without asking.
- **Mobile**: every desktop UI change is verified at 390x844 as well. Screenshot both.
- **No `transition-all`**, no hand-typed `cubic-bezier(...)`, no default Tailwind blue/indigo, no pure
  white surfaces, no em dashes in copy. User-facing naming is "Rishi Valley", never "RV Alumni".

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
- **`chrome-devtools`** drives a real headless Chrome. Use it to **measure** (what a hover actually
  renders in pixels, why something is slow, a performance trace) instead of writing a throwaway probe
  script. It is configured with real Chrome, a 1440x900 viewport and WebP screenshots. It does not
  replace the screenshot scripts, which encode the auth bypass.

Both load at session start. If a tool is missing, the dev server is probably not running.

## Subagents

Spawn these rather than doing the work inline; they keep the main context clean.

| Agent | When | Notes |
|---|---|---|
| `screenshot-qa` | after any UI change | spawn **two in parallel**, one desktop and one mobile |
| `design-protocol-auditor` | after any UI change | reads the diff against the design system, triages the gates |
| `write-path-reviewer` | server actions, API routes, auth, uploads, schema | checks the four write-path invariants and the demo's three layers |

**Model tiers**: this session orchestrates. Sonnet for implementation and review agents. Opus only
for an ambiguous product or design call the specs do not already answer. Haiku for mechanical work.

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
