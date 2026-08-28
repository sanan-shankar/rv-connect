# Scripts

Every script here, in plain language. **If you add one, add a line. If a line
has no owner and answers no live question, delete both.**

That rule exists because this folder reached 63 files by 2026-08-08, of which 31
were one-off probes written to answer a single question during a single session
and never run again. They were deleted. The ones below survived because each has
a reason stated here.

**The rule is now enforced.** `qa/scripts-ledger.test.mjs` runs inside
`npm run check` and fails if a tracked script has no line here, or if a line
names a script that is gone. Written down was not enough: by 2026-08-26 this
file described 32 of the folder's 50 scripts, and the eighteen it had lost
included every phase probe and the whole of `ops/`, which a nightly workflow
runs.

Most QA scripts need the dev server running (`npm run dev`) and sign in as the
admin via `/api/dev-login`, so `ADMIN_EMAIL` and `DEV_LOGIN_SECRET` must both
be set in `.env`. That route answers 404 unless NODE_ENV is not production and
the secret matches, so it exists only on a developer's machine.
Screenshots land in `e2e/.shots/`, gitignored scratch beside Playwright's own
run output. It used to be `temporary screenshots/` at the repo root; the path
moved on 2026-08-28 to keep the root readable, and nothing but these scripts
ever read it.

**Puppeteer never downloads its own Chrome.** `package.json` carries
`"puppeteer": { "skipDownload": true }`, and that key is load-bearing: without
it the install step pulls a ~130MB Chrome into `~/.cache/puppeteer` on EVERY
Vercel build, into a cache directory Vercel does not restore, and again on every
local install after a puppeteer bump. Nothing that runs on Vercel launches a
browser, and the bundled one does not work on this machine anyway
(`puppeteer.launch()` with no `executablePath` dies with "Failed to launch the
browser process" -- CLAUDE.md gotcha 2, re-proved 2026-08-26). The scripts go
around it: `screenshot.mjs` and `screenshot-auth.mjs` default to
`/Applications/Google Chrome`, and `verify-shot.mjs` and `crawl.mjs` require
`PUPPETEER_EXECUTABLE_PATH` pointed there. This setting lived in a
`.puppeteerrc.cjs` at the root until 2026-08-28; puppeteer reads `package.json`
first of all its search places (`getConfiguration.ts:112`), so the file was one
root entry buying nothing.

## Wired into `npm run`

| Command | Does |
|---|---|
| `npm run check` (`qa/check.mjs`) | **The one gate.** Runs TypeScript, ESLint, `protocol-audit`, `lab-audit` and every `*.test.mjs` in parallel (a floor of 60 files, not a fixed count -- a number written in prose rots), around 25s, no dev server needed. Prints a pass/warn/FAIL table. Add a gate name (`types`, `lint`, `protocol`, `lab`, `tests`) to run just one. Run it before every commit. |
| `npm run screenshot <url> [label]` (`qa/screenshot.mjs`) | Screenshot any public page. Add `--mobile` for 390x844. The workhorse. |
| `npm run screenshot:auth <url>` (`qa/screenshot-auth.mjs`) | Same, but signed in as admin first. Use for anything behind login. |
| `npm run verify:shot` (`qa/verify-shot.mjs`) | Screenshot plus a console/pageerror check, so a clean-looking page with a red console still fails. |
| `npm run verify:crawl` (`qa/crawl.mjs`) | Walks every live route signed in, reporting HTTP status and console errors. **Its route list is hand-maintained: update it when you add or delete a page.** |
| `npm run dev:centroid` (`dev/centroid.mjs`) | Measures optical centring for the bird avatars. Cited by `docs/spec/avatars.md`. |
| `npm run dev:shot-clip` (`dev/shot-clip.mjs`) | Screenshots a horizontal band of a page (`<url> <out> <y> <height>`), for when a full-page shot is mostly whitespace. |

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
| `backfill-image-dimensions.mjs` | Measures every image already posted -- shape, focal point, colour, a 16px smear -- and fills in the `Image` table for it. New uploads record themselves; this is the one-off for everything that predates the table (2026-08-27). Safe to re-run and safe to interrupt: it only looks at urls with no row yet. `--dry` lists, `--env .env.demo` does the demo. |
| `import-places.mjs` | Imports the GeoNames gazetteer (~235k places) into the `Place` table. Powers the location picker. Run once; keep for a rebuild. |
| `seed-curated-content.ts` | Seeds the curated WhatsApp stories. Reads `docs/content/whatsapp-curation/picks.json`. |
| `city-alias-scan.ts` | Step 1 of de-duplicating city names (Bombay vs Mumbai). Read-only; prints candidates for review. |
| `merge-cities.ts` | Step 2: applies a confirmed merge. Needed again whenever members add new spellings. |
| `shot-svg.mjs` | Renders a static SVG to PNG. For illustration work without a dev server. |
| `import-roster.mjs` | Consolidates the office roster CSV into the `RosterEntry` table, which is what the trust model matches a signup against. Dry by default; `--apply` writes. |
| `set-password.mjs` | **Break glass.** Sets a password directly on one account from this laptop. It exists because deleting the password-less admin bypass (security audit C1) left no other way back in if the last admin is locked out. |
| `sweep-stranded-originals.mjs` | **One-off, run it twice.** Deletes the staged Collection originals stranded under `collection/` before new ones moved to `staging/` (60 of them, 6.7MB, on 2026-08-28). Dry by default; `--apply` deletes. Only ever considers keys ending `-o.` and refuses any key a database row points at. Run once now and once after the staging change deploys, then delete it and this line. |
| `tag-photos-pick.mjs` | Exports a batch of untagged Collection photographs into `.tagging/` as small JPEGs plus a manifest, so a session can look at them and say what they are. Read-only. `--limit N` (60), `--all` widens it past "no bucket", `--env .env.demo`. |
| `tag-photos-apply.mjs` | Puts that session's `.tagging/verdicts.json` back onto the rows. **Dry by default**; `--apply` writes. Only ever fills a field that is empty, refuses a bucket outside the six, and leaves an undo log (`--undo <file> --apply`). The procedure both halves belong to is `.claude/skills/tag-photos/SKILL.md`. |
| `tag-professions-pick.mjs` | Exports every live member's `jobTitle` + `workplace` pair into `.professions/manifest.json`, with the vocabulary and the rules alongside, so a session can say what field each person is in. Read-only, no names. `--all` takes everybody, `--tag <value>` takes everyone holding one tag (the split path), `--limit N`, `--env .env.demo`. Prints the tag histogram and the judged-but-untagged pile, which is where the next tag comes from. |
| `tag-professions-apply.mjs` | Puts that session's `.professions/verdicts.json` back onto the rows. **Dry by default**; `--apply` writes. Refuses a tag outside `src/lib/profession-tags.ts`, adds parent tags automatically, caps a person at four, and leaves an undo log (`--undo <file> --apply`). Unlike the photograph applier it OVERWRITES, because nobody types this column. The procedure is `.claude/skills/tag-professions/SKILL.md`. |
| `email-mark.mjs` | Rasterises the app mark for use in emails. |
| `build-app-icon.mjs` | Writes `public/images/brand/app-icon.svg` from `src/lib/hoopoe-geometry.ts`, so the shipped mark is the mascot's own curves and cannot drift from them. No dev server, no browser. |
| `generate-icons.mjs` | Generates every raster app icon from the two canonical marks. Bakes Apple's edge light into the Android maskable icon and leaves the Apple one flat, because iOS and macOS light it themselves. |
| `_env.mjs` | Helper: reads `.env` for the scripts in this folder. Seven of them had their own copy of the parser. |

### The Apple edge-light harness (`dev/apple-edge/`)

Built to answer one question: what exactly does iOS 26 draw inside an app
icon, and can we reproduce it. The answer, the measurements and the four
constructions that were wrong are written up in
`docs/spec/apple-edge-light.md`; these are the tools that got there. Kept
because the method — measure, fit, then LOOK — is the part that took the
longest to learn, and because anything that changes the mark will want to
re-check itself against the same screenshot.

| Script | Does |
|---|---|
| `truth.mjs` | Re-derives the ground-truth table from the owner's home-screen screenshot, so no number in the spec is eyeballed. |
| `truth-profile.mjs` | The same, for one full column through a hill rather than the peak-per-column table. Scoring only the peaks is the trap the spec describes. |
| `measure.mjs` | The shared sampler. The real icon and ours both go through it, which is the only reason the two are comparable. |
| `compare.mjs` | Writes the real tile and ours side by side at the same size. |
| `look.mjs` | Photographs any lab room's cells at 4x: `look.mjs /lab/glass-edges .row 4`. A 132px tile is too small to judge a three pixel band in, and this is what stops a good score from passing for a good result. |

Their PNG output is ignored, not committed: it is a few hundred KB that any
of them will regenerate.

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
| `hoopoe-idle-check.mjs` | Regression guard for the idle animation that used to restart whenever the tab was hidden and shown again (fixed 2026-08-11). |
| `audit-status.mjs` | Where the security audit stands, proved from the code rather than from a document that can go stale. |
| `npm-audit-gate.mjs` | The CI dependency gate (audit H16): `npm audit` with a documented per-advisory allowlist rather than a blanket pass/fail. Has a test. |
| `_dev-login.mjs` | Helper: one sign-in for every QA script, replacing nine hand-copied blocks (audit R6). The secret goes from Node, never into page JavaScript. |
| `_probe-kit.mjs` | Helper: the ledger, the sign-in, the bootstrap and the database opener the phase probes share. |

## The security probes (`qa/phase*-probe.mjs`)

Each one proves a phase of the security audit against a RUNNING server, because
the class of bug that matters here typechecks perfectly: Phase 2's probe found a
lockout that every static gate had passed. They create their own disposable
`@probe.invalid` accounts and delete them again. `docs/SECURITY.md` is what they
verify. Needs the dev server and `DEV_LOGIN_SECRET`.

| Script | Proves |
|---|---|
| `phase3-probe.mjs` | The two-gate trust model at each tier (H21, the harvesting half of M1). |
| `phase4-probe.mjs` | Sign-in rate limiting, the human pass, and the session cookie's shape. |
| `phase5-probe.mjs` | Upload ownership and what the storage layer will and will not serve. |
| `phase6-probe.mjs` | Security headers, that auth still works after a library bump, `/lab` gating, the cron secret (H7, C3, M19, M27, H18). |
| `phase7-probe.mjs` | Moderation and the audit log (the admin half). |
| `phase8-probe.mjs` | Deletion with its grace period, retention, the data export, the policy documents (H8, H9, H12, M34, M35). |
| `phase9-probe.mjs` | The dependency gate and the other checks that are themselves tooling (H16). |
| `phase10-probe.mjs` | Cross-site origin refusal, the real signup form's password rules, and that a page load makes no `/ingest` 404s (M33, M8, L9). |
| `phase4-prod-check.mjs` | The Phase 4 proof again against a local PRODUCTION build, where NextAuth behaves differently. |

## Nightly operations (`ops/`)

Both run from `.github/workflows/snapshot.yml`, not by hand. See `docs/OPERATIONS.md`.

| Script | Does |
|---|---|
| `snapshot.mjs` | Writes a nightly metric snapshot, because Sentry keeps 30 days and PostHog a year, and neither of them will say in 2028 what this site looked like in 2026. |
| `prune.mjs` | Nightly pruning of the tables that grow without bound, notifications first. |
