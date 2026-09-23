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
around it in ONE place now: `chromePath()` in `qa/_probe-kit.mjs`, which every
`puppeteer.launch()` in this folder calls. It answers
`PUPPETEER_EXECUTABLE_PATH` if you set one, `/Applications/Google Chrome` if it
is there, and otherwise nothing, which is puppeteer's "use your own" and the
only reading that works on a machine that is not this Mac. Until 2026-09-07 the
literal was typed out fifteen times under four policies, and two scripts
(`verify-shot.mjs`, `crawl.mjs`) made the caller export the variable; **you no
longer have to.** This setting lived in a
`.puppeteerrc.cjs` at the root until 2026-08-28; puppeteer reads `package.json`
first of all its search places (`getConfiguration.ts:112`), so the file was one
root entry buying nothing.

## Wired into `npm run`

| Command | Does |
|---|---|
| `npm run check` (`qa/check.mjs`) | **The one gate, and the same list CI runs.** Seven gates: TypeScript, ESLint, `protocol-audit`, `lab-audit`, every `*.test.mjs` (a floor of 60 files, not a fixed count -- a number written in prose rots), the dependency advisory gate and the security audit status board. The last two moved in from CI on 2026-09-02, so a green laptop can no longer push a red build; `ci-parity.test.mjs` fails if `check.yml` grows a step that this does not run. Around 30s, no dev server needed. Prints a pass/warn/FAIL table. Add a gate name (`types`, `lint`, `protocol`, `lab`, `tests`, `deps`, `security`) to run just one. Run it before every commit. |
| `npm run screenshot <url> [label]` (`qa/screenshot.mjs`) | Screenshot any public page. Add `--mobile` for a real 390x844 phone -- touch, coarse pointer, 2x -- not a 390px laptop. The workhorse. |
| `npm run screenshot:auth <url>` (`qa/screenshot-auth.mjs`) | Same, but signed in as admin first. Use for anything behind login. `--full` for a whole tall page. |
| `npm run verify:shot` (`qa/verify-shot.mjs`) | Screenshot plus a console/pageerror check, so a clean-looking page with a red console still fails. `<route> <out.png> [mobile]`. |
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
| `verify-guard.mts` | Proves at runtime that the demo cannot write to the database. Run after touching anything auth- or write-related. |

## Data and one-time-ish jobs (`dev/`)

| Script | Does |
|---|---|
| `run-sql.mjs` | Runs a SQL file against the database. This is how every manual migration in `prisma/migrations-manual/` was applied. |
| `backfill-image-dimensions.mjs` | Measures every image already posted -- shape, focal point, colour, a 16px smear -- and fills in the `Image` table for it. New uploads record themselves; this is the one-off for everything that predates the table (2026-08-27). Safe to re-run and safe to interrupt: it only looks at urls with no row yet. `--dry` lists, `--env .env.demo` does the demo. |
| `backfill-screen-copies.mjs` | Gives every Collection photograph already stored its **screen copy** (`Photo.screenUrl`, 3200px WebP q82), the file the viewer opens instead of the full-resolution master (2026-09-23; media.md §4.2). New contributions make their own; this is the one-off for the rest. Reads each master from the bucket's S3 endpoint, not the public address, which crawls on a cache miss (TRAPS.md). **Dry by default**: makes five copies in memory and prints what they would save. `--apply` writes, ledgering each copy into `scripts/dev/.screen-copies/` before its row is touched; `--undo <ledger> --apply` empties the column and deletes the objects; `--reconcile <ledger> --apply`, run once a build that purges screen copies is live, deletes any copy whose photograph was deleted or hidden by the build before it. Safe to re-run and to interrupt: it only reads rows whose column is still null, and a copy's key is its master's with `-s` added. `--limit N`, `--env .env.demo`. |
| `import-places.mjs` | Imports the GeoNames gazetteer (~235k places) into the `Place` table. Powers the location picker. Run once; keep for a rebuild. |
| `seed-curated-content.ts` | Seeds the curated WhatsApp stories. Reads `docs/content/whatsapp-curation/picks.json`. |
| `city-alias-scan.ts` | Step 1 of de-duplicating city names (Bombay vs Mumbai). Read-only; prints candidates for review. |
| `merge-cities.ts` | Step 2: applies a confirmed merge. Needed again whenever members add new spellings. |
| `shot-svg.mjs` | Renders a static SVG to PNG. For illustration work without a dev server. |
| `import-roster.mjs` | Consolidates the office roster CSV into the `RosterEntry` table, which is what the trust model matches a signup against. Dry by default; `--apply` writes. |
| `set-password.mjs` | **Break glass.** Sets a password directly on one account from this laptop. It exists because deleting the password-less admin bypass (security audit C1) left no other way back in if the last admin is locked out. |
| `sweep-stranded-originals.mjs` | **One-off, and its question is closed.** Deletes the staged Collection originals stranded under `collection/` before new ones moved to `staging/` (60 of them, 6.7MB, on 2026-08-28). Dry by default; `--apply` deletes. Only ever considers keys ending `-o.` and refuses any key a database row points at. Re-run after the staging change deployed, on 2026-09-05: **0 keys, 0.00 MB.** Nothing is stranded, so the script and this line are kept only until the owner says to retire them. |
| `import-album.mjs` | Puts a whole folder of photographs into a member's **Class Collection**, one date each. Built for the owner's own 2015-2023 album (1,719 files) because the contribute room caps a drop at 200, refuses a file over 20MB, and applies ONE date to a whole drop, which a nine-year album cannot use. Dates come from each file's EXIF; a provenance file names the ones dated by hand so they file at year precision rather than claiming a month. **Dry by default**; `--apply` writes. Every write is ledgered before the next photograph starts and `--undo <ledger> --apply` removes the rows AND their stored objects, which matters because the app has no way to un-file a class photograph. `Photo.sourceKey` is unique, so a crashed run resumes by re-running and re-encodes nothing. `--as <email>`, `--album <dir>`, `--quality N`, `--limit N`. `--scope valley` files into the shared Valley Collection instead (admins only, rows land approved), with `--folder <name>` for one folder, `--buckets a,b`, and `--captions <tsv>` of `file<TAB>caption` that must cover the folder exactly or nothing runs. |
| `export-catchups.mjs` | Every Catch-up, Round, question, answer, heart, membership and reminder preference out of the database into `scripts/dev/.exports/catchups/<date>/`, **with the photograph bytes copied beside the JSON** so the folder alone can rebuild them. Read-only against Postgres and **dry by default**; `--write` writes, `--no-photos` skips the copies, `--out <dir>` moves the destination. Written for the Catch-ups rework, whose one condition from the owner was that nothing members wrote can be lost: the shape is `src/lib/catchups-export.ts`, and the lab rooms and the magazine engine load their fixtures in that same shape. The invite token is deliberately not exported. |
| `print-magazine.mjs` | Prints a Catch-up Edition's magazine to PDF through the real Chrome on this Mac: signs in, opens `/lab/catchups/magazine?print=1&data=<key>`, waits for the fonts and every image, and writes `scripts/dev/.magazine/<key>.pdf` beside a page-count, file-size, wall-clock and font-embedding report, plus a PNG of each page through `pdftoppm` when it is installed. The M1 feasibility spike (docs/planning/catchups-rework/magazine.md); an ordinary dev script, not a hand-run pass (handover F16). `--data <key>` picks a fixture, `--all` prints the whole corpus. |
| `valley-terrain.mjs` | The ground under the school as a heightmap: fetches the public Mapzen terrarium elevation tiles (AWS Open Data, no key) round Rishi Valley School, decodes them to metres, crops a square and writes `public/lab/valley/height-<km>km.png` (16-bit height in R and G) with a JSON of its bounds. Two crops are committed, `--km 16 --zoom 14` for the campus and `--km 64 --zoom 12` for the far ridge; `/lab/valley/hills` reads both. Re-run only to change the crop. |
| `wall-atlas.mjs` | Every approved Collection thumbnail fitted inside 64px and shelf-packed into 2048px WebP sheets under `public/lab/wall/` (gitignored: real photographs, served by the dev server only, never deployed), with `atlas.json` mapping each id to its tile. `/lab/years/wall` draws all of them at once from it. Read-only against Postgres; skips a thumbnail the host no longer has. Re-run after photographs are added. |
| `tag-photos-pick.mjs` | Exports a batch of untagged Collection photographs into `scripts/dev/.tagging/` as small JPEGs plus a manifest, so a session can look at them and say what they are. Read-only. `--limit N` (60), `--all` widens it past "no bucket", `--env .env.demo`. |
| `tag-photos-apply.mjs` | Puts that session's `scripts/dev/.tagging/verdicts.json` back onto the rows. **Dry by default**; `--apply` writes. Only ever fills a field that is empty, refuses a bucket outside the six, and leaves an undo log (`--undo <file> --apply`). The procedure both halves belong to is `.claude/skills/tag-photos/SKILL.md`. |
| `tag-professions-pick.mjs` | Exports every live member's `jobTitle` + `workplace` pair into `scripts/dev/.professions/manifest.json`, with the vocabulary and the rules alongside, so a session can say what field each person is in. Read-only, no names. `--all` takes everybody, `--tag <value>` takes everyone holding one tag (the split path), `--limit N`, `--env .env.demo`. Prints the tag histogram and the judged-but-untagged pile, which is where the next tag comes from. |
| `tag-professions-apply.mjs` | Puts that session's `scripts/dev/.professions/verdicts.json` back onto the rows. **Dry by default**; `--apply` writes. Refuses a tag outside `src/lib/profession-tags.ts`, adds parent tags automatically, caps a person at four, and leaves an undo log (`--undo <file> --apply`). Unlike the photograph applier it OVERWRITES, because nobody types this column. The procedure is `.claude/skills/tag-professions/SKILL.md`. |
| `email-mark.mjs` | Rasterises the app mark for use in emails. |
| `build-app-icon.mjs` | Writes `public/images/brand/app-icon.svg` from `src/lib/hoopoe-geometry.ts`, so the shipped mark is the mascot's own curves and cannot drift from them. No dev server, no browser. |
| `generate-bird-photos.mjs` | Writes `public/images/birds/`, every bird BirdAvatar can deal (51 species x 2 poses) as a 480px PNG on `--card`, for the saved contact card's photo. Drives `/lab/centroid` in a real browser, because Next will not compile a manual `renderToStaticMarkup` inside `app/`. Needs `npm run dev`. Re-run when a bird's drawing changes. |
| `generate-icons.mjs` | Generates every raster app icon from the two canonical marks. Bakes Apple's edge light into the Android maskable icon and leaves the Apple one flat, because iOS and macOS light it themselves. |
| `_env.mjs` | Helper: reads `.env` for the scripts in this folder, and answers `databaseUrl(envFile)` with the one destination guard. Seven of them had their own copy of the parser, and seven of the connection guard; `import-album.mjs`, the one script here that writes photographs, had no guard at all until it went through here. |
| `_cli.mjs` | Helper: `argv()` (`flag`/`value`/`rest`) and `bytesFor(url)`. Six scripts carried the first byte-identically and two the second. |

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
| `protocol-audit.mjs` | Static gate for the shape and colour protocol: raw hex in production code, drab green-on-green pairings. Whether it is clean today is what running it tells you; a status written here rots on its own schedule. |
| `theme-shots.mjs` | Captures any surface in both themes at both viewports. Generic. |
| `drive.mjs` | Authenticated interaction harness: click through a flow and shoot each step. The harness is generic; most of the file is not. Ten dated one-off scenarios sit inside it, each written for a question somebody asked on the day. Read the one nearest your problem before adding an eleventh. |
| `hover-probe.mjs` | Measures what a hover *actually* renders, in pixels, rather than what the class list implies. |
| `map-cluster-verify.mjs` | Directory map: cluster resolution and touch-target sizes. The DOM half of `src/lib/map-cluster.test.mjs`. |
| `hoopoe-landing-check.mjs` | Measures the mascot's landing frame by frame off the DOM. `mascot-flight-layer.tsx` has a QA hook for it. |
| `hoopoe-zoom-probe.mjs` | **Keep.** Regression guard for `docs/planning/bugs.md` #17, whose cause is now known: it is Safari. The probe no longer hunts the cause; it guards `transform-box: view-box` so the fix cannot be undone by accident. |
| `_dir-room-shots.mjs` | Section-by-section capture of `/lab/directory`. |
| `local-base-url.mjs` | Helper: the loopback and same-origin guards for authenticated QA, so a dev-login cookie cannot be minted against a non-local origin. It rejects a non-loopback or credentialed base URL, re-checks the origin after navigation, and brackets IPv6 cookie domains. Used by the Playwright config and its auth setup. Has a test. |
| `hoopoe-idle-check.mjs` | Regression guard for the idle animation that used to restart whenever the tab was hidden and shown again (fixed 2026-08-11). |
| `audit-status.mjs` | Where the security audit stands, proved from the code rather than from a document that can go stale. |
| `npm-audit-gate.mjs` | The dependency gate (audit H16): `npm audit` with a documented per-advisory allowlist rather than a blanket pass/fail. A gate inside `npm run check`, so it is not something only CI sees. Has a test. |
| `_dev-login.mjs` | Helper: one sign-in for every QA script, replacing nine hand-copied blocks (audit R6). The secret goes from Node, never into page JavaScript. |
| `_probe-kit.mjs` | Helper: the ledger, the sign-in, the bootstrap and the database opener the phase probes share, plus `chromePath()` -- the one answer to "which Chrome" for every browser script in the repo. |
| `_shoot.mjs` | Helper: the shot itself, for the three screenshot commands at the top of this file. Owns which Chrome, what `--mobile` means (a phone's pointer, not a 390px laptop), where the file lands and how long to wait. The three stay three commands; what they keep is argument parsing. |

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
