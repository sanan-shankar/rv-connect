# Scripts

Every script here, in plain language. **If you add one, add a line. If a line
has no owner and answers no live question, delete both.**

That rule exists because this folder reached 63 files by 2026-08-08, of which 31
were one-off probes written to answer a single question during a single session
and never run again. They were deleted. The ones below survived because each has
a reason stated here.

Most QA scripts need the dev server running (`npm run dev`) and sign in as the
admin via `/api/dev-login`, so `ADMIN_EMAIL` and `DEV_LOGIN_SECRET` must both
be set in `.env`. That route answers 404 unless NODE_ENV is not production and
the secret matches, so it exists only on a developer's machine.
Screenshots land in `temporary screenshots/`.

## Wired into `npm run`

| Command | Does |
|---|---|
| `npm run check` | **The one gate.** Runs TypeScript, ESLint, `protocol-audit`, `lab-audit` and all 14 `*.test.mjs` in parallel, ~17s, no dev server needed. Prints a pass/warn/FAIL table. Add a gate name (`types`, `lint`, `protocol`, `lab`, `tests`) to run just one. Run it before every commit. |
| `npm run screenshot <url> [label]` | Screenshot any public page. Add `--mobile` for 390x844. The workhorse. |
| `npm run screenshot:auth <url>` | Same, but signed in as admin first. Use for anything behind login. |
| `npm run verify:shot` | Screenshot plus a console/pageerror check, so a clean-looking page with a red console still fails. |
| `npm run verify:crawl` | Walks every live route signed in, reporting HTTP status and console errors. **Its route list is hand-maintained: update it when you add or delete a page.** |
| `npm run dev:centroid` | Measures optical centring for the bird avatars. Cited by `docs/spec/avatars.md`. |
| `npm run dev:shot-clip` | Screenshots a horizontal band of a page (`<url> <out> <y> <height>`), for when a full-page shot is mostly whitespace. |

## The demo build (`demo/`)

The public no-login demo is a separate Vercel project and a separate database.
Full runbook in `docs/spec/demo.md`. These four are that pipeline.

| Script | Does |
|---|---|
| `apply-schema.mjs` | Applies a generated schema to the demo database. Refuses to touch the real one. |
| `seed-demo.mts` | Wipes and re-seeds the demo database with fictional people and posts. Refuses to run unless it is pointed at the demo DB. |
| `add-photos.mjs` | Turns a folder of photographs into Collection entries for the demo. |
| `verify-guard.mts` | Proves at runtime that the demo cannot write to the database. Run after touching anything auth- or write-related. |

## Data and one-time-ish jobs (`dev/`)

| Script | Does |
|---|---|
| `run-sql.mjs` | Runs a SQL file against the database. This is how every manual migration in `prisma/migrations-manual/` was applied. |
| `import-places.mjs` | Imports the GeoNames gazetteer (~235k places) into the `Place` table. Powers the location picker. Run once; keep for a rebuild. |
| `seed-curated-content.ts` | Seeds the curated WhatsApp stories. Reads `docs/content/whatsapp-curation/picks.json`. |
| `city-alias-scan.ts` | Step 1 of de-duplicating city names (Bombay vs Mumbai). Read-only; prints candidates for review. |
| `merge-cities.ts` | Step 2: applies a confirmed merge. Needed again whenever members add new spellings. |
| `shot-svg.mjs` | Renders a static SVG to PNG. For illustration work without a dev server. |

## QA and gates (`qa/`)

| Script | Does |
|---|---|
| `lab-audit.mjs` | Fails if a room exists under `/lab` but is missing from the registry, or vice versa. **This is what stops `/lab` rotting into unreachable pages, which is the exact problem it was built to fix.** Required by CLAUDE.md. |
| `protocol-audit.mjs` | Static gate for the shape and colour protocol: raw hex in production code, drab green-on-green pairings. Currently reports real findings. |
| `theme-shots.mjs` | Captures any surface in both themes at both viewports. Generic. |
| `drive.mjs` | Authenticated interaction harness: click through a flow and shoot each step. Generic. |
| `hover-probe.mjs` | Measures what a hover *actually* renders, in pixels, rather than what the class list implies. |
| `map-cluster-verify.mjs` | Directory map: cluster resolution and touch-target sizes. The DOM half of `src/lib/map-cluster.test.mjs`. |
| `hoopoe-landing-check.mjs` | Measures the mascot's landing frame by frame off the DOM. `mascot-flight-layer.tsx` has a QA hook for it. |
| `hoopoe-zoom-probe.mjs` | **Keep.** Regression guard for an open bug (`docs/planning/bugs.md` #14): it proves the wing pivots are *not* the cause, so nobody re-tests that theory. |
| `_dir-chrome-probe.mjs` | Measures the live directory chrome so `/lab/directory`'s stated numbers stay true. Named in that room's UI. |
| `_dir-room-shots.mjs` | Section-by-section capture of `/lab/directory`. |
| `local-base-url.mjs` | Helper: finds which port the dev server is on. Has a test. |
| `tour-mobile-verify.mjs` | Checks the first-run walkthrough on mobile. Has a test. |

## Standalone

| Script | Does |
|---|---|
