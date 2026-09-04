# scripts-e2e-ci - refactor audit 2 report

Territory reader for everything that is tooling rather than product: `scripts/qa` (38 files),
`scripts/ops` (2), the non-feature half of `scripts/dev` (6), `scripts/README.md` (the ledger),
`e2e/` (config + setup + 7 specs + 24 baseline PNGs), `.github/` (4 workflows + renovate.json),
`.claude/agents/` (8), the `scripts` block in `package.json`, and `docs/OPERATIONS.md`.
Date: 2026-09-04. Files in territory: 82 tracked (63 scripts + README, 9 e2e TS + 24 PNGs,
5 .github, 8 agents, package.json, OPERATIONS.md). Read fully: 47. Baselines: listed and sized,
not opened.

## Coverage

**Read fully** (every line):
- `scripts/qa/`: `check.mjs`, `ci-parity.test.mjs`, `scripts-ledger.test.mjs`,
  `hand-run-passes.test.mjs`, `knip.jsonc`, `_probe-kit.mjs`, `_dev-login.mjs`,
  `local-base-url.mjs`, `crawl.mjs`, `screenshot.mjs`, `screenshot-auth.mjs`, `verify-shot.mjs`,
  `theme-shots.mjs`, `_dir-room-shots.mjs`, `_dir-chrome-probe.mjs`, `hoopoe-idle-check.mjs`,
  `hoopoe-zoom-probe.mjs`, `tour-mobile-verify.mjs`, `tour-mobile-verify.test.mjs`,
  `phase6-probe.mjs`, `phase9-probe.mjs`
- `scripts/ops/`: `prune.mjs`, `snapshot.mjs` (head + structure; the 20 metric collectors skimmed)
- `scripts/dev/`: `_env.mjs`, `run-sql.mjs`, `email-mark.mjs`, `set-password.mjs` (header + body
  to line 45), `import-roster.mjs` (header), `seed-curated-content.ts` (header)
- `e2e/`: `playwright.config.ts`, `auth.setup.ts`, `visual.spec.ts`, `sidebar.spec.ts`,
  `deeplink.spec.ts`, `collection-permalink.spec.ts`, `loading-fallbacks.spec.ts` (headers),
  `collection-seek.spec.ts` (header + helper block + every `page.goto`),
  `collection-journeys.spec.ts` (header + helper block)
- `.github/workflows/check.yml`, `snapshot.yml` (job body), `retention.yml` (schedule + step);
  `backup.yml` skimmed for schedule, secrets, guards
- All 8 `.claude/agents/*.md` frontmatter + opening paragraph
- `scripts/README.md`, `docs/OPERATIONS.md`, the `scripts` block of `package.json`

**Read structurally** (header, imports, every route/selector/constant it targets, plus a grep of
each target against the current tree): `phase3/4/5/7/8/10-probe.mjs`, `phase4-prod-check.mjs`,
`drive.mjs` (all 10 scenario bodies read; the harness read in full), `hover-probe.mjs`,
`map-cluster-verify.mjs`, `hoopoe-landing-check.mjs`, `protocol-audit.mjs`, `lab-audit.mjs`,
`npm-audit-gate.mjs`. Their internal quality was not my question; liveness, rot and duplication
were, and every route, `data-*` attribute and CSS selector they reach for was grepped against
`src/` at HEAD.

**Not read**: the 24 baseline PNGs (listed and byte-sized only); `backup.yml`'s 340 lines of
shell in detail (schedule, guards and secret names verified); the bodies of the 20 metric
collectors in `snapshot.mjs`; the hand-run pass scripts and `scripts/demo/` (not my territory);
the `*.test.mjs` under `src/lib` (lib-tests').

**Uncommitted edits seen**: none in my territory. `git status --short` over `scripts/`, `e2e/`,
`.github/`, `.claude/`, `package.json` and `docs/OPERATIONS.md` is clean. The one modified file
in the tree (`src/components/common/image-viewer.tsx`) is somebody else's and outside my scope.

## Summary

The tooling is in better shape than the folder's size suggests, and the drift is concentrated in
one predictable place: **anything that reaches into the app by selector or by flag, and is not
itself run by a gate.** `npm run check` is green, `ci-parity.test.mjs` and `scripts-ledger.test.mjs`
(both born of audit 1) are doing exactly what they were built to do, and the workflows, renovate
config and e2e specs are argued line by line. But four things rotted in the ten days since audit 1
closed and nothing noticed:

1. **364 lines of scripts guard features that were deleted on 2026-08-27.** `feat: remove the
   hoopoe tour` (ae5bc9a) took out every `data-tour` attribute and the "hoopoe tour" button.
   `tour-mobile-verify.mjs` (248) still clicks that button and would exit 2 INCONCLUSIVE after
   four retries; its 26-line test still runs inside `npm run check` every day, keeping the corpse
   warm. `_dir-chrome-probe.mjs` (90) still selects `[data-tour="directory-search"]` and would
   print "toolbar not found" twelve times and exit 0 — while `/lab/directory` names it in the
   room's own UI as the source of its numbers.
2. **A nightly job deletes members' notifications 335 days early.** `snapshot.yml:92` passes
   `--days 30` to `prune.mjs`, whose own header records that exact divergence as bug-audit **M55**
   and says it was fixed. The fix (2026-08-21) changed the script's default to 365 and never
   touched the caller. `src/lib/retention.ts` — the declared source of truth — keeps notifications
   a year. This is the single most important item in my territory and it is not a bloat finding.
3. **`npm run screenshot:auth --mobile` is not a mobile.** It sets a 390×844 box with no
   `isMobile`, no `hasTouch` and DPR 1, so `@media (hover:hover)` and `@media (pointer:coarse)`
   resolve the desktop way. The app ships eight such rules: the Collection carousel arrows appear
   in mobile shots that a phone never draws, and the comment overflow menu is hidden in shots
   where a phone always shows it. `drive.mjs` gets this right and says why in a comment;
   `screenshot.mjs` gets it right; the authed one — the one CLAUDE.md's mandatory
   "verify at 390×844" round actually uses — does not.
4. **`npm run visual:report` cannot work locally.** `playwright.config.ts:57` only registers the
   HTML reporter when `process.env.CI`, so `e2e/.report` is never written on this machine (it does
   not exist). The rule OPERATIONS.md calls "the single action that turns this from a safety net
   into a rubber stamp" — never rebaseline without opening the diff — has no working tool behind it.

The honest structural numbers: **~640 removable lines with zero behaviour change** (the two dead
scripts, phase9's rotted block, drive.mjs's closed scenarios), plus **3 fewer files**, **1 fewer
test in the gate**, and one live data-retention bug fixed. Deduplication offers less: the three
screenshot scripts genuinely overlap (~60 lines) and the `fnBody`/`balancedBody` brace-matcher is
written twice (~28 lines), but audit 1's lesson holds — the value there is one fewer place to be
wrong, not the lines.

What surprised me: **25 puppeteer bootstraps** exist across `scripts/` (20 in `qa/`, 5 in `dev/`)
with the macOS Chrome path hardcoded in 15 of them under **four different fallback policies**, one
of which (`executablePath: process.env.PUPPETEER_EXECUTABLE_PATH` with nothing behind it) resolves
to `undefined` and walks straight into CLAUDE.md gotcha 2. `_probe-kit.mjs` already solved this
for the phase probes and no screenshot script uses it.

What audit 1 left that is now moot: its finding 01 (the ledger gate) shipped and works; finding 04
(delete `demo/run-sql.mjs`, port the demo-ref guard) shipped exactly as specified; finding 06 (the
four hand-rolled `.env` parsers in the probes) shipped; finding 09's `temporary screenshots/` moved
to `e2e/.shots/`; `.puppeteerrc.cjs` folded into `package.json`. **Its finding 10 got worse**: the
baseline history has gone from 63 MB / 81 blobs to **101 MB / 157 blobs across 39 commits** in ten
days, about 3.8 MB of permanent git history a day. Owner decisions 8 (the generic agents) and 9
(retire two probes) are **untouched**, and finding 06's evidence for retiring phase9 has since been
strengthened by phase9 actually rotting.

## Findings

### scripts-e2e-ci-01 - Delete `tour-mobile-verify.mjs` and its test: the tour they check was removed on 2026-08-27
- **Where**: `scripts/qa/tour-mobile-verify.mjs` (248 lines, whole file);
  `scripts/qa/tour-mobile-verify.test.mjs` (26 lines, whole file); `scripts/README.md:126`;
  cascade: `scripts/qa/local-base-url.mjs:29-32` (`cookieDomainForBaseUrl`) and
  `scripts/qa/local-base-url.test.mjs:42-43`
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `ae5bc9a 2026-08-27 feat: remove the hoopoe tour` — its own message says
  "Also removed: isOwner, whose only caller was the admin page's tour button, and the anchors in
  the composer, directory, collection and Catch-ups index." `grep -rn "Product tour" src/` returns
  nothing; `grep -rn "data-tour" src/` returns nothing. The script's core reads
  `document.querySelector('[role="dialog"][aria-label="Product tour"]')` (line 107) and its main
  loop finds the trigger by `b.textContent?.trim() === 'hoopoe tour'` on `/admin` (line 168).
  Neither exists. It would log `Could not find "hoopoe tour" button; retrying.` four times and
  `process.exit(2)` — "INCONCLUSIVE", which is the one exit code a reader would blame on the dev
  server rather than on the script. The four tour stops it walks (`/feed`, `/directory`,
  `/collection`, `/catchups`) still exist as routes, which is why nothing else caught this.
  `tour-mobile-verify.test.mjs` is one of the 102 files the `tests` gate runs on every
  `npm run check`, and it passes: it only asserts that the dead script's *source* still contains
  `requireLoopbackBaseUrl(process.argv[2]`, `assertSameOriginAfterNavigation(...)` and a
  `fetch(\`${baseUrl}/api/dev-login\``. A security pin on a corpse.
- **What to do**: delete both files. Delete `scripts/README.md:126`
  (`| tour-mobile-verify.mjs | Checks the first-run walkthrough on mobile. Has a test. |`) in the
  same commit — `scripts-ledger.test.mjs`'s second test fails if the line outlives the file.
  Then decide `cookieDomainForBaseUrl`: `tour-mobile-verify.mjs` is its only non-test caller
  (`grep -rn cookieDomainForBaseUrl scripts/ e2e/ src/` → 1 use + 2 assertions in
  `local-base-url.test.mjs`). Either delete the export and its two test lines, or keep it and say
  in a comment that it is kept for the next script that sets a cookie against `[::1]` — I lean
  keep, it is 3 lines and the IPv6 bracketing is a real trap, but say so explicitly rather than
  leaving it looking used.
- **Saving**: 274 lines, 2 files (+1 README line); the `tests` gate drops from 102 to 101 files
  and stops running a test whose subject is gone
- **Risk & gate**: low. `npm run check` must stay green — the `tests` gate's floor is
  `MIN_TEST_FILES = 60` (`check.mjs:69`) so 101 is fine, and `scripts-ledger.test.mjs` covers both
  directions of the README edit. Nothing in `src/`, `e2e/`, `.github/` or `package.json`
  references either file (`grep -rn tour-mobile-verify` outside `scripts/` and the audit folders:
  zero hits).
- **Confidence**: high. The one thing that would change my mind: if the owner intends to bring the
  tour back. He does not — `ae5bc9a`'s message records the decision as final and says the removal
  is "total rather than a flag", and `/guide` shipped as its replacement (`503a00a`).
- **Notes**: this is also the resolution of an audit-1 open owner decision ("the member tour"):
  the tour was removed, so the decision is closed and only its tooling survives. The test file is
  a good illustration of a real hazard in this repo's rule-test pattern — a source-reading pin
  cannot tell a live script from a dead one, because the source is still there. If a future session
  wants a guard against that class, the shape is the ledger test's: assert that every
  `*.test.mjs` in `scripts/qa` names a file that some *other* file also names.

### scripts-e2e-ci-02 - `snapshot.yml` deletes notifications 335 days early, re-opening bug-audit M55
- **Where**: `.github/workflows/snapshot.yml:89-92`; `scripts/ops/prune.mjs:11-16` (the header
  that records the fix) and `:32-34` (`DEFAULT_DAYS = 365`); `src/lib/retention.ts:41-42`
  (`notifications: 365`) and `:176-179` (the sweep that deletes them);
  `docs/OPERATIONS.md:153`
- **Phase**: dead (a flag that outlived its policy) — but the effect is a correctness bug
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `prune.mjs`'s own banner, verbatim: *"ONE policy, not two. The default used to be
  30 days while src/lib/retention.ts deleted the same table at KEEP_DAYS.notifications -- a year --
  so the app documented one rule and this script quietly enforced a stricter one (bug audit M55).
  retention.ts is the source of truth; this matches it."* `git log -S"DEFAULT_DAYS = 365" --
  scripts/ops/prune.mjs` → `d77197a 2026-08-21`. `git log -S"prune.mjs --days 30" --
  .github/workflows/snapshot.yml` → `6adb61c 2026-08-19`, never touched since. So the M55 fix
  changed the default and left the caller passing the old number. The workflow step is even
  *named* `Prune notifications older than 30 days`. It runs nightly at 00:10 UTC. Every night it
  deletes every notification between 30 and 365 days old, which the retention policy says members
  keep. `retention.yml` runs 3h10m earlier and correctly deletes only >365 days, so the two
  scheduled jobs enforce two different policies against one table. `docs/OPERATIONS.md:153`
  repeats the wrong number as if it were the design.
- **What to do**: in `.github/workflows/snapshot.yml`, change `run: node scripts/ops/prune.mjs
  --days 30` to `run: node scripts/ops/prune.mjs` (let the script's argued default win — that is
  the whole point of the M55 fix) and rename the step to `Prune notifications past the retention
  window`. Update the block comment above it (lines 85-88) which also says "30 days". Update
  `docs/OPERATIONS.md:153` to drop `--days 30`. Then, in the same commit, fix
  `prune.mjs:59-62`, whose comment still says *"the owner asked for a flat 30 days"* four lines
  below `DEFAULT_DAYS = 365` — a stale sentence that is exactly what would make the next reader
  re-add the flag.
- **Saving**: 0 lines. One data-retention policy instead of two, and members keep eleven months of
  notifications the site promises them.
- **Risk & gate**: low to change; the *consequence* of the current state is medium and ongoing.
  No test covers this — nothing in `npm run check` reads workflow arguments, and
  `ci-parity.test.mjs` deliberately scopes itself to `check.yml` only (its header says so). Gate:
  eyeball the diff, then the next nightly run's step summary. A fix session may want to run
  `node scripts/ops/prune.mjs --dry` first to see the count that has been going: it prints
  `Notifications: N total, M older than 365 days`, and comparing that against a `--days 30` dry run
  shows exactly how many rows the bug has been taking each night.
- **Confidence**: high. Would change my mind: an owner instruction after 2026-08-21 asking for 30
  days specifically for the *pruner* while leaving the retention sweep at a year. I searched
  `progress.md` and `docs/planning/bugs.md` for one and found the opposite — M55 is listed as
  fixed.
- **Notes**: there is a second-order question the fix session should raise but not decide.
  Once `--days 30` goes, `prune.mjs` becomes a nightly near-no-op: `retention.yml` ran three hours
  earlier with the same 365-day cutoff, so `prune.mjs` will report "Nothing to prune" essentially
  forever. Its header already answers why it still exists — *"exists alongside it only because a
  large backlog wants the batched delete below rather than one long statement"* — and that backlog
  is now gone. See Owner decisions §1: keep it as the batched escape hatch (my recommendation,
  it is 97 lines and it is the thing you reach for the day the sweep times out), or fold it into
  the retention sweep and lose a workflow step. Do not delete it in the same commit as this fix;
  they are separate revertable changes.

### scripts-e2e-ci-03 - `screenshot:auth --mobile` emulates a desktop at 390px, so hover- and pointer-branched UI photographs backwards
- **Where**: `scripts/qa/screenshot-auth.mjs:43-45` and `:54`; contrast
  `scripts/qa/screenshot.mjs:47-52` (correct) and `scripts/qa/drive.mjs:673-681` (correct, with the
  reason in a comment); `scripts/qa/verify-shot.mjs:17` (same defect);
  `scripts/qa/theme-shots.mjs:45` (same defect); `scripts/qa/_dir-room-shots.mjs:46` (same defect);
  `scripts/qa/map-cluster-verify.mjs` (asserts a 44px coarse-pointer target — check its viewport
  too); affected product code: `src/components/common/photo-carousel.tsx:369-376`,
  `src/components/posts/comments-section.tsx:674`, `src/components/ui/menu-material.ts:42`
- **Phase**: dead (a flag that does not do what its name says) / hygiene
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `screenshot-auth.mjs` sets `const viewport = mobileFlag ? { width: 390, height:
  844 } : ...` — no `isMobile`, no `hasTouch`, no `deviceScaleFactor`. Puppeteer only enables touch
  emulation and the mobile device-metrics flag when you ask, so `(hover: hover)` matches and
  `(pointer: coarse)` does not. The shipped stylesheet has these rules — counted in the audit's own
  production build, `.scratch/audit2-build/.next/static/chunks/32v74upyu8cz7.css`: six
  `@media (hover:hover)`, one `@media (hover:hover) and (pointer:fine)`, one
  `@media (pointer:coarse)`, one `@media (pointer:fine)`. Concretely: `photo-carousel.tsx:376`
  is `[@media(pointer:fine)]:grid` on top of `hidden`, so the carousel's prev/next arrows appear
  in an authed "mobile" shot and never on a phone; `comments-section.tsx:674` is
  `opacity-0 ... [@media(pointer:coarse)]:opacity-100`, so the comment overflow menu is invisible
  in an authed "mobile" shot and always visible on a phone. `drive.mjs:674-676` has the comment
  that proves the project already knows: *"hasTouch/isMobile, not just a narrow window: surfaces
  now branch on `(hover: hover) and (pointer: fine)` ... and a 390px viewport with a fine pointer
  is a squeezed laptop, not a phone."* `screenshot.mjs:50` also got it right and explains that the
  flag "was documented in the CLAUDE.md table but only ever implemented in the auth variant". The
  irony is complete: the public one was fixed and the authed one — which CLAUDE.md's mandatory
  "every desktop UI change is verified at 390x844 as well" round actually uses, because every
  interesting surface is behind login — was not.
- **What to do**: make every authed viewport the same object the visual suite uses. In
  `screenshot-auth.mjs`, `verify-shot.mjs`, `theme-shots.mjs` and `_dir-room-shots.mjs`, replace
  the bare `{ width: 390, height: 844 }` with
  `{ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }` — copy it
  from `screenshot.mjs:50` verbatim, including its comment. Best done as part of finding 04, which
  gives all four one shared `viewport(mobile)` helper so this cannot drift a third time. Check
  `map-cluster-verify.mjs`'s `--mobile` path in the same pass: it asserts "on a coarse pointer
  every hit disc is at least 44 CSS px across", and if it is not actually emulating a coarse
  pointer, that assertion is testing the desktop branch.
- **Saving**: 0 lines. Every mobile screenshot this project takes of an authed page becomes true.
  That is not a cleanup, it is the correctness of the QA loop the owner's design process runs on.
- **Risk & gate**: low. Nothing in `npm run check` reads these. Proof is a before/after pair: run
  `npm run screenshot:auth http://localhost:3000/collection/<id> --mobile` and confirm the carousel
  arrows are gone from the second shot. `npm run visual` is unaffected — Playwright's mobile
  project already sets `isMobile: true, hasTouch: true` (`playwright.config.ts:120-124`) and its
  baselines are correct.
- **Confidence**: high on the mechanism and on the CSS (both grepped out of the shipped bundle).
  Medium on how many surfaces it has actually misled somebody about — I found three product
  call-sites; there may be more behind Tailwind's `hover:` variant, which in v4 is itself wrapped
  in `@media (hover:hover)`, meaning *every* `hover:` class in the app renders in these shots.
  That last point, if it holds, makes this considerably worse than the three call-sites suggest.
- **Notes**: `deviceScaleFactor: 2` is a separate half of the same problem and matters less: it
  changes the PNG's pixel size, not which rules match. Keep it anyway so the two commands agree.
  Related: finding 04 (fold the three screenshot scripts), which is where the permanent fix lives.

### scripts-e2e-ci-04 - Three screenshot scripts, three drifted answers to the same four questions
- **Where**: `scripts/qa/screenshot.mjs` (65), `scripts/qa/screenshot-auth.mjs` (85),
  `scripts/qa/verify-shot.mjs` (41); the duplicated blocks are
  `screenshot.mjs:14-26` ≡ `screenshot-auth.mjs:27-41` (the output dir + auto-increment, verbatim),
  `screenshot.mjs:54-60` ≡ `screenshot-auth.mjs:71-77` (the networkidle2-then-domcontentloaded
  fallback, verbatim), and the launch block in all three
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd names two of the three pairs directly (`qa/screenshot-auth.mjs [27:1-37:6]`
  ≡ `qa/screenshot.mjs [14:1-23:6]`, 11 lines / 97 tokens; and `[71:1-76:39]` ≡ `[54:1-59:39]`,
  6 lines / 51 tokens). The four questions each script answers, and the four different answers:
  (a) **which Chrome** — `screenshot.mjs` probes candidates with `existsSync` and falls back to
  puppeteer's bundled browser; `screenshot-auth.mjs` uses `env || macPath`; `verify-shot.mjs`
  passes nothing and relies on the caller exporting `PUPPETEER_EXECUTABLE_PATH` (which is why
  `scripts/README.md:36` has to warn about it, and why CLAUDE.md gotcha 2 exists);
  (b) **what mobile means** — three different viewports, see finding 03;
  (c) **where the file goes** — two auto-increment from `e2e/.shots`, one takes a name;
  (d) **how long to wait** — `screenshot.mjs` networkidle2 + 2s fallback; `screenshot-auth.mjs`
  the same + a flat extra `4000ms`; `verify-shot.mjs` the same + `500ms`. `verify-shot.mjs`
  additionally hardcodes `http://localhost:3000` twice rather than deriving it, so it cannot be
  pointed anywhere else.
- **What to do**: one module, `scripts/qa/_shoot.mjs`, exporting
  `shoot({ url, authed = false, mobile = false, out, watchConsole = false })`. It owns: the Chrome
  resolution (import it from `_probe-kit.mjs`, which already has `MAC_CHROME` and the
  `||=` fallback at line 35 — see finding 09), the two viewport objects, `mkdirSync`, the
  auto-increment, `devLogin` when `authed`, the goto-with-fallback, the console/pageerror listeners
  when `watchConsole`, and the screenshot. Then the three entry points become argument parsing:
  `screenshot.mjs` ≈ 20 lines, `screenshot-auth.mjs` ≈ 20, `verify-shot.mjs` ≈ 15. Keep all three
  npm scripts — they are in CLAUDE.md's table and in `.claude/skills/screenshot-auth/SKILL.md`, and
  three named commands with different defaults is a better interface than one with three flags.
  Do finding 03 inside this change, not before it.
- **Saving**: ~55-70 lines net, 3 clones cleared, and — the real prize — one definition of "mobile"
  and one definition of "which Chrome" instead of six
- **Risk & gate**: medium, because these are the tools every future session's screenshot round
  depends on and a broken one fails in a way that looks like a broken page. Gate: run each of the
  three commands once, desktop and mobile, against `/feed`, and Read the PNGs. `npm run check`
  proves nothing here (nothing runs them); `scripts-ledger.test.mjs` needs a README line for the
  new `_shoot.mjs` in the same commit.
- **Confidence**: high that the duplication is real and worth collapsing; medium on the line
  saving, because a shared module in this repo pays a docblock and three imports (audit 1's
  standing lesson). Take this one for the correctness in 03, not for the lines.
- **Notes**: I considered folding `theme-shots.mjs` and `_dir-room-shots.mjs` in too and rejected
  it: `theme-shots` loops themes × viewports and asserts `html.dark` matched, `_dir-room-shots`
  scrolls to anchors and shoots elements. Both would need options nobody else passes, which is
  bloat signature 5. Give them the shared *viewport* and *Chrome* helpers and leave their bodies
  alone.

### scripts-e2e-ci-05 - `drive.mjs`: keep the 90-line harness, retire the 10 closed investigations inside it
- **Where**: `scripts/qa/drive.mjs` — harness at `1-40` and `667-727`; scenarios at `91-666`
  (`dateField` 107-242, `wells` 243-294, `confirmDelete` 295-356, `focusStates` 357-459,
  `slide` 460-518, `create` 519-548, `profile` 549-570, `houses` 571-620, `places` 621-642,
  `poll` 643-666); `scripts/README.md:118`
- **Phase**: dead (the scenarios) / architecture (the rule that stops it refilling)
- **Tier**: T2     **Class**: structural     **Decides**: owner
- **Evidence**: this is the file my charter's question — "which of these were discovery probes that
  should have died?" — is really about. `git log -S"async <name>("` dates every scenario to the
  session that asked its question: `slide`, `create`, `profile`, `houses`, `places`, `poll` all
  land on **2026-07-25** (`1875992 docs: record the owner review decisions and add a QA interaction
  harness`, plus two same-day fix commits); `focusStates`, `confirmDelete` and `wells` on
  **2026-08-29**; `dateField` on **2026-08-30**. Every one names a specific past question in its
  own docblock — `slide` measures a landing curve that shipped, `create` re-tests a Prisma
  case-sensitivity bug that was fixed, `houses` checks a popover that stopped covering year rows,
  `places` checks that a combobox empties after a pick. `dateField` cannot run at all for anybody
  but its author: line 120 is
  `await input.uploadFile("./e2e/.shots/date-probe.jpg")`, and `e2e/.shots/` is gitignored scratch.
  Meanwhile CLAUDE.md's MCP section is explicit: *"never hand-roll another puppeteer probe
  script"* — the chrome-devtools MCP is now the discovery tool, and `drive.mjs` is the pattern it
  replaced, with a shared bootstrap. The **harness** is not the problem: `NO_AUTH`, the `shot()`
  ledger, the touch-correct viewport, the 120s navigation timeouts for a shared dev server and the
  failure screenshot are all good and all reusable. The 576 lines of accumulated scenarios are.
- **What to do**: owner decision (see Owner decisions §2). On yes: keep `drive.mjs:1-90` and
  `667-727`, keep **at most one** scenario as the worked example of the shape (I would keep
  `focusStates` — it is the newest, it needs no fixture, and focus rings are the thing most likely
  to be re-checked), delete the other nine, and add six lines to the file's header stating the
  rule: *a scenario is written to answer a live question and deleted in the same session, unless
  it would catch a regression later — in which case it is a Playwright spec in `e2e/`, not a
  scenario here* (that is CLAUDE.md gotcha 7's rule, applied to this file). Update
  `scripts/README.md:118` from "Generic." to say what it is and what the rule is.
- **Saving**: ~500-576 lines from the largest file in `scripts/`, which drops from 727 to ~150
- **Risk & gate**: low — nothing runs `drive.mjs` except a human with a scenario name, and an
  unknown name already exits 1 with the list of options. Gate: `node scripts/qa/drive.mjs`
  (no argument) prints the surviving list; `scripts-ledger.test.mjs` covers the README edit.
- **Confidence**: high that the nine are closed questions; medium on whether the owner wants them
  kept as a record. The thing that would change my mind for any one of them is a note in
  `progress.md` saying "re-run drive.mjs <name> after touching X" — I searched and found none.
- **Notes**: I deliberately did **not** propose deleting `drive.mjs` outright. It is the only
  authenticated *interaction* harness in the repo, the MCP cannot be scripted for a repeatable
  run, and a fresh session that needs one would rebuild it worse. The value at risk if this is done
  carelessly is the reasoning in the docblocks — `dateField`'s in particular records a real
  investigation into fifteen photographs contributed without dates. If the owner wants that kept,
  it belongs in `docs/planning/bugs.md` as prose, not as 135 lines of unrunnable puppeteer.

### scripts-e2e-ci-06 - `phase9-probe.mjs` has rotted: two of its checks assert a `check.yml` that was deliberately emptied
- **Where**: `scripts/qa/phase9-probe.mjs:78-84`; the thing it asserts about:
  `.github/workflows/check.yml:51-60`; the probe that was correctly updated instead:
  `scripts/qa/audit-status.mjs:276-291` (H16); `scripts/README.md:149`
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: owner (it is audit-1 owner decision 9)
- **Evidence**: `phase9-probe.mjs:82-83` runs
  `L.check("check.yml runs the npm-audit gate", /npm-audit-gate\.mjs/.test(w))` and
  `L.check("check.yml fails on a re-opened critical/high", /audit-status\.mjs --fail-on-open=critical,high/.test(w))`
  against the text of `check.yml`. `grep -c` for both patterns in `check.yml` today: **0** and
  **0**. On 2026-09-02 both gates moved *into* `check.mjs` on purpose — `check.yml:51-59` says
  "THE ONLY GATE STEP, and it must stay that way", `ci-parity.test.mjs` now fails the build if a
  step is added back, and `audit-status.mjs:280-290` carries a five-line comment explaining that
  H16's probe was moved off `check.yml` onto `check.mjs` for exactly this reason. `phase9` was the
  one place that did not get the memo. Running it today prints 2 FAILs and exits 1. Its other
  five checks still pass, including the `renameSync(check.yml, ...aside)` trick — which still
  works only because H16's first line is `if (!has(".github/workflows/check.yml"))`. That trick is
  the other half of audit 1's case against this file: it mutates the working tree mid-run, which
  CLAUDE.md forbids because several sessions share this checkout.
- **What to do**: this is audit-1 owner decision 9, still open, now with fresh evidence. On
  **retire**: delete `phase9-probe.mjs` and `phase6-probe.mjs`, delete their two `scripts/README.md`
  lines (146, 149), and fix `docs/SECURITY.md`'s `phase{4..10}` range to name the survivors.
  On **keep**: fix lines 78-84 to read `scripts/qa/check.mjs` instead of `.github/workflows/check.yml`
  (three-line change, mirroring `audit-status.mjs:287-289`) and replace the `renameSync` trick with
  something that does not touch the tree — the honest substitute is to run `audit-status.mjs` in a
  temp copy of the repo, or simply to accept that `npm-audit-gate.test.mjs` already proves the
  "gate closes" direction and drop that half.
- **Saving**: 216 lines / 2 files if retired (phase9 86 + phase6 130); ~6 lines changed if kept
- **Risk & gate**: low either way. `security-regressions.test.mjs` does not reference the probes.
  If retiring, `scripts-ledger.test.mjs` fails until both README lines go, which is the desired
  behaviour.
- **Confidence**: high on the rot (I checked both regexes against the file). Medium on the
  recommendation — see Owner decisions §3. The thing that would change my mind about phase6: an
  owner practice of re-running it after every next-auth Renovate PR. Renovate holds next-auth for
  7 days with a `review-carefully` label precisely because auth breaking is the worst failure this
  site has, and phase6 is the only thing in the repo that proves a real credentials login still
  mints a session after a bump. If that is the intent, phase6 should be **kept and its README line
  rewritten to say so** — "run after any next-auth or Next bump" — which is a better outcome than
  either deleting it or leaving it looking like a one-off.
- **Notes**: phase6 is also the *only* phase probe that does not need Chrome (`bootstrap()` with
  no `{ chrome: true }`), so it is the cheapest of the set to run. That is an argument for keeping
  it that audit 1 did not make.

### scripts-e2e-ci-07 - `_dir-chrome-probe.mjs` has measured nothing since 2026-08-27, and `/lab/directory` still cites it
- **Where**: `scripts/qa/_dir-chrome-probe.mjs:48` (`document.querySelector('[data-tour="directory-search"]')`),
  and the whole file (90 lines) hangs off it; the citations:
  `src/app/lab/directory/_room.tsx:158`, `src/app/lab/directory/_chrome.tsx:11`,
  `src/app/lab/directory/_data.ts:485`; `scripts/README.md:123`
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: owner (it is cited in a lab room's UI)
- **Evidence**: `grep -rn "data-tour" src/` returns **nothing** — every anchor went in
  `ae5bc9a 2026-08-27 feat: remove the hoopoe tour`. The probe's `page.evaluate` starts
  `const anchor = document.querySelector('[data-tour="directory-search"]'); if (!anchor) return
  null;`, and its caller prints `${s.label}: toolbar not found` and continues. So it now runs
  clean, exits 0, and produces twelve "toolbar not found" lines instead of the measurement table —
  the failure mode this repo hates most, a tool that reports success while doing nothing. The room
  it serves says, in the page a member of the project would read:
  `<code>scripts/qa/_dir-chrome-probe.mjs</code>` (`_room.tsx:158`), and `_chrome.tsx:11` and
  `_data.ts:485` both carry the comment *"so '3 rows, 142px' here means the same thing it means on
  the real page"*. Those numbers are no longer re-derivable.
- **What to do**: two honest options, and the owner picks. **(a) Repair**: replace the anchor with
  a selector that still exists on `/directory` — the toolbar's own wrapper. A fix session should
  open `/directory` in the chrome-devtools MCP, find the stable hook (a `role`, or the search
  input's `aria-label`), and use that rather than a class chain; note that line 65 already reaches
  for `.inline-flex.rounded-full.border.border-border.bg-card.p-1`, which is a six-class Tailwind
  chain and will rot the same way. ~6 lines changed. **(b) Retire**: delete the file (90 lines),
  delete `scripts/README.md:123`, and edit the three lab citations to say the numbers were measured
  on a stated date rather than pointing at a tool that no longer exists. (a) is more work and keeps
  a promise the room makes; (b) is honest and cheaper. I recommend (a) — the room is owner-approved
  design history and a citation that dangles is worse than no citation.
- **Saving**: 90 lines / 1 file if retired; 0 lines if repaired, and one lab room stops lying
- **Risk & gate**: low. Nothing automated runs it. Gate for (a): run it and confirm a real table of
  control boxes comes out; for (b), `scripts-ledger.test.mjs` and a read of the three lab files.
- **Confidence**: high on the rot. Medium on which option the owner wants — it turns on whether
  `/lab/directory`'s numbers are still meant to be live.
- **Notes**: the sibling `_dir-room-shots.mjs` is **not** rotted — I checked all seven of its
  `SECTIONS` anchors against the slugs `_second-look-kit.tsx:167-192` generates from the room's
  `<Rule>` headings and all seven resolve. It has drifted in a smaller way: the room now has
  eleven `<Rule>` sections and the shot list names seven, so four ("The filter set is written out
  by hand eight times", "The back arrow, and why it goes away", "The Top cities strip",
  "Appendix: the batch grid at scale") are never photographed. One-line fix, worth doing while in
  the file.

### scripts-e2e-ci-08 - `npm run visual:report` produces nothing locally, so the rule against blind rebaselining has no tool
- **Where**: `e2e/playwright.config.ts:57`; `package.json` `"visual:report"`;
  `docs/OPERATIONS.md:22-24` and `:26-28`; `CLAUDE.md` Screenshots table
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder:
  "e2e/.report" }]] : [["list"]]`. The HTML reporter — the thing that writes the three-up
  expected/actual/diff view — is registered **only under CI**. `npm run visual:report` is
  `playwright show-report e2e/.report`, and `e2e/.report` does not exist on this machine
  (`ls e2e/.report` → no such directory; `find . -name playwright-report` → nothing). Both
  documents that describe the workflow name this command as the way to look at a failure:
  OPERATIONS.md §1's table (*"the three-up expected/actual/diff view of the last failure"*) and,
  two paragraphs later, *"**The one rule:** never run `visual:update` to silence a failure without
  opening the diff first. That is the single action that turns this from a safety net into a rubber
  stamp."* CLAUDE.md repeats both. The mechanism for obeying the one rule has never worked on the
  owner's laptop. The diff PNGs themselves *do* get written — `outputDir: ".output"` means
  Playwright drops `*-expected.png`, `*-actual.png` and `*-diff.png` under `e2e/.output/<test>/`
  on failure — so the data is there and only the viewer is missing. Nobody noticed because the
  `list` reporter prints the paths, and a session that reads a PNG directly gets what it needs
  without realising the documented path is broken.
- **What to do**: change the reporter to always include the HTML one:
  `reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder: "e2e/.report" }]]
  : [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]]`. `open: "never"` keeps
  it from launching a browser on every local run, which is presumably why it was CI-only in the
  first place — but that flag already handles it, so the exclusion buys nothing. Nothing else is
  needed: `.gitignore:97` already ignores `/e2e/.report/`, which is itself evidence the folder was
  meant to exist locally and never has.
- **Saving**: 0 lines; the visual suite's stated safety rule becomes executable
- **Risk & gate**: low. Gate: deliberately break one baseline comparison (e.g. run `npm run visual`
  while the dev server serves a changed page — do **not** do this in an audit session), then
  `npm run visual:report` and confirm the three-up view opens. Do not run `visual:update` while
  proving this.
- **Confidence**: high — I verified the absence of `e2e/.report` and the conditional in the config.
  The one thing that would change my mind: if the owner has been reading diffs out of
  `e2e/.output/` directly and prefers no HTML report at all. In that case the fix is the other
  direction — delete the `visual:report` script and correct both documents — but leaving a
  documented command that cannot work is not an option either way.
- **Notes**: this is the highest-leverage zero-line finding in my territory. The whole 13 MB
  baseline apparatus rests on somebody looking at the diff, and the project has been one broken
  command away from the rubber-stamp failure it explicitly fears.

### scripts-e2e-ci-09 - The function-body brace-matcher is written twice, and one copy decides security findings
- **Where**: `scripts/qa/audit-status.mjs:72-116` (`fnBody`) ≡ `src/lib/test-fn-body.mjs:33-73`
  (`balancedBody`)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd flags it as the largest clone touching `scripts/`:
  `qa/audit-status.mjs [91:36 - 116:2]` ≡ `lib/test-fn-body.mjs [38:31 - 73:2]`, **26 lines /
  259 tokens**. The two are the same algorithm arrived at independently — balance the parameter
  parens, step over a `: Promise<{...}>` return annotation by angle depth, then balance the body's
  braces — and *both* carry a long comment about the same trap. `audit-status.mjs:78-82`:
  *"loadDirectoryPage(...): Promise<{ users }> -- brace in a RETURN type ... getting it wrong is
  dangerous rather than merely annoying: it makes a guarded function look unguarded."*
  `test-fn-body.mjs:20-23`: *"step over a `: Promise<{ ... }>` return annotation (whose braces are
  NOT the body -- the naive `indexOf("{")` landed inside one and reported a gated action as
  ungated)."* Two files, one bug, two independent fixes. The dangerous direction is the one neither
  comment states: a matcher that stops *early* returns a short body, and a probe asking
  `/auth\(\)/.test(body)` on a short body answers "unguarded" — visible — while a matcher that
  runs *long* answers "guarded" against text from the next function down, which is silent. That is
  precisely audit C-188's failure mode, recorded in `test-fn-body.mjs`'s own header. `audit-status.mjs`
  is a blocking gate in `npm run check` (`check.mjs:221-239`, `--fail-on-open=critical,high`) and
  ~20 of its 74 probes go through `fnBody`.
- **What to do**: in `audit-status.mjs`, `import { balancedBody } from "../../src/lib/test-fn-body.mjs"`
  and replace `fnBody(text, name)` with a six-line adapter that turns a bare *name* into the
  declaration regex `balancedBody` wants — `fnBody` today builds two: `function <name>` and the
  method form `(^|[\s,{])(async\s+)?<name>\s*\(`. Keep the adapter and its comment in
  `audit-status.mjs`; delete lines 85-116 of the shared walk. The import path is already an
  established pattern in this folder: `scripts/qa/scripts-ledger.test.mjs:4` and
  `ci-parity.test.mjs:4` both import `../../src/lib/test-kit.mjs`, and `test-fn-body.mjs` is a
  plain `.mjs` with no imports of its own precisely so bare `node` can load it.
  `scripts/qa/knip.jsonc:25` already lists it as an entry point.
- **Saving**: ~28 lines, 1 clone cleared, and one brace-matcher instead of two behind a security
  gate
- **Risk & gate**: low-medium — this is the gate that reads the codebase for the security board, so
  a subtle behaviour change would silently move findings. Proof: run
  `node scripts/qa/audit-status.mjs --json > /tmp/before.json` **before** the change and again
  after, and `diff` them. They must be byte-identical (74 checks, same states, same notes). That
  diff is the whole gate; do not accept the change without it. Then `npm run check`.
- **Confidence**: high. Would change my mind: if `balancedBody`'s string/regex `decl` interface
  cannot express one of `fnBody`'s two forms without contortion — it can (the second form is
  already a regex).
- **Notes**: the direction matters. Move `audit-status` onto the `src/lib` copy, not the reverse:
  `test-fn-body.mjs` is imported by `test-kit.mjs` and `composer-rule.test.mjs` and carries the
  C-188 incident in its header, which is the better home for the reasoning.

### scripts-e2e-ci-10 - The README ledger exists and is enforced, but nine of its lines are no longer true
- **Where**: `scripts/README.md:46, 50, 79, 116, 118, 122, 123, 125, 126`
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `scripts-ledger.test.mjs` enforces *existence* in both directions and explicitly
  not truth — its own comment says it pins "a tracked script with no line" and "a line naming a
  file that is gone". Nothing reads the sentence. Line by line, checked against HEAD:
  - **:46** `npm run check` — *"Runs TypeScript, ESLint, `protocol-audit`, `lab-audit` and every
    `*.test.mjs`"* and *"Add a gate name (`types`, `lint`, `protocol`, `lab`, `tests`)"*. Both lists
    omit **`deps`** and **`security`**, which have been two of the seven gates since 2026-09-02 —
    the two whose whole point was to become visible locally instead of CI-only. The gate's own
    output names them (`check-baseline.txt`: "Dependency advisories", "Security audit status").
  - **:50** `verify:crawl` — the list is hand-maintained by design, and `/guide` (shipped
    2026-08-27, `503a00a`) is not in it. See finding 13.
  - **:79** `sweep-stranded-originals.mjs` — the line ends *"Run once now and once after the
    staging change deploys, then delete it and this line."* The staging change landed in the same
    commit (`04c90a2 2026-08-28`) and a push is a deploy, so the second run's precondition passed
    a week ago. Either it has been run twice and both should go, or it has not and somebody owes
    it a run. The line as written cannot tell you which.
  - **:116** `protocol-audit.mjs` — *"Currently reports real findings."* It does not:
    `check-baseline.txt` shows `ok Shape + colour protocol  clean`.
  - **:118** `drive.mjs` — *"Generic."* 576 of its 727 lines are ten dated one-off scenarios
    (finding 05).
  - **:122** `hoopoe-zoom-probe.mjs` — *"Regression guard for an open bug (`docs/planning/bugs.md`
    #14)"*. bugs.md #14 is now *"Vercel environment variable duplicates (owner will handle)"*; the
    hoopoe zoom bug is **#17**, and its heading now reads *"ROOT CAUSE FOUND: it is Safari"*.
  - **:123** `_dir-chrome-probe.mjs` — *"Measures the live directory chrome"*. It does not
    (finding 07).
  - **:125** `local-base-url.mjs` — *"Helper: finds which port the dev server is on."* It does
    nothing of the kind. It validates that a base URL is loopback and credential-free, re-checks
    the origin after navigation, and brackets IPv6 cookie domains — three security guards for
    authenticated QA, pinned by `tour-mobile-verify.test.mjs` and used by `playwright.config.ts:25`
    and `auth.setup.ts:32`. The line undersells the one helper in the folder that stops the owner's
    admin cookie leaving the machine.
  - **:126** `tour-mobile-verify.mjs` — the feature is gone (finding 01).
- **What to do**: rewrite the nine lines. For **:46**, add `deps` and `security` to both lists and
  say what they are. For **:116**, drop the "currently reports" clause entirely rather than
  swapping it for "currently clean" — a status in prose rots on a schedule; that is the repo's own
  C-195 lesson. For **:125**, replace with *"Helper: the loopback and same-origin guards for
  authenticated QA, so a dev-login cookie cannot be minted against a non-local origin. Used by the
  Playwright config and its auth setup. Has a test."* For **:122**, point at #17 and say the bug's
  cause is known and the probe now guards `transform-box: view-box` rather than hunting the cause.
  For **:79**, ask the owner (Owner decisions §4). **:50**, **:118**, **:123**, **:126** are
  covered by findings 13, 05, 07, 01 and should be edited inside those commits, not here.
- **Saving**: 0 lines. The ledger is the first thing a new session reads about this folder; nine
  wrong sentences in 160 is where the next mis-run comes from.
- **Risk & gate**: none. `npm run check` (the ledger test only cares about names, so it stays green
  either way, which is exactly why this drifted).
- **Confidence**: high — each of the nine was checked against the tree or against a tool's own
  output.
- **Notes**: the gate audit 1 built works. What it cannot do is check a sentence, and after ten
  days the sentences are 6% wrong. I considered proposing a second test (e.g. "a README line naming
  a `docs/planning/bugs.md` number must match a live heading") and rejected it: too narrow to be
  worth the machinery, and the repo's standing rule is one protocol per recurring problem, not a
  test per sentence. The realistic guard is the close-out checklist audit 1 proposed — when you
  touch a script, re-read its line.

### scripts-e2e-ci-11 - OPERATIONS.md §1 and CLAUDE.md describe a visual suite that is two routes and two masks out of date
- **Where**: `docs/OPERATIONS.md:16-18` ("11 routes x 2 viewports", "~80 seconds"), `:31-36` (the
  masked list), `:38-56` ("Four routes photograph a live database", "/collection is deliberately
  not in that list"); `CLAUDE.md` Screenshots section ("11 routes x 2 viewports", "Takes 50s",
  "Feed, directory, letters and catchups photograph a live database ... A red run on those four is
  real"); the truth: `e2e/visual.spec.ts:28-68` and `:75-112`
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `ROUTES` holds **12** entries, not 11 — `collection-class` was added 2026-09-02 and
  `privacy` is there too. Six of them carry `live:`, not four: `feed`, `directory`, `letters`,
  `catchups`, **`collection`** (marked live 2026-08-29, spec.ts:35-44) and **`collection-class`**
  (2026-09-02, spec.ts:45-63). So OPERATIONS.md's *"`/collection` is deliberately not in that list
  -- photos arrive rarely enough that its picture still means something, and it is the one that
  catches image-sizing regressions"* is now the opposite of the code, and the code's own comment
  explains why it changed (the archive went from four photographs to twelve mid-session, then the
  owner's 1,719-photograph album landed in the class half). CLAUDE.md's *"A red run on those four
  is real"* names four of six. `volatileRegions()` masks **five** things; OPERATIONS.md:31-36 lists
  four — the Collection scrubber (`spec.ts:101-110`, added 2026-09-02) is missing. And the two
  documents disagree with each other on runtime: 80s vs 50s.
- **What to do**: OPERATIONS.md §1: change 11→12, add the scrubber to the masked list, change
  "Four routes" to "Six", move `/collection` and `/collection-class` from the counter-example into
  the list with the spec's own reason, and cut the second half of the "deliberately not in that
  list" paragraph — it is now a record of a decision that reversed. Say what was *lost* when they
  became live, because the spec does: the Collection's empty state is no longer photographed
  anywhere. CLAUDE.md: 11→12, "those four"→"those six", and either reconcile the runtime with
  OPERATIONS.md or — better, and in this repo's own idiom — drop the number from both. A wall-clock
  figure in prose rots every time a route is added.
- **Saving**: 0 lines. Two documents that stop contradicting the suite they describe.
- **Risk & gate**: none. Eyeball.
- **Confidence**: high — every number counted out of `visual.spec.ts` at HEAD.
- **Notes**: audit 1's finding 07 raised the same "10 routes x 2" drift and it was fixed to 11;
  ten days later it is 12. The number is going to keep rotting. The durable fix is to stop printing
  a count and say "one line per route in `ROUTES`, each with its reason" — which is what both
  documents already say two sentences later.

### scripts-e2e-ci-12 - The five imported `.claude/agents` are unchanged since audit 1, and cost ~2.1k tokens in every session
- **Where**: `.claude/agents/code-reviewer.md` (47 lines), `comment-analyzer.md` (70),
  `pr-test-analyzer.md` (69), `silent-failure-hunter.md` (130), `type-design-analyzer.md` (110)
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: owner (audit-1 owner decision 8)
- **Evidence**: state report first, because the charter asks for it: **nothing has changed.** All
  eight agents are still tracked; the same five are generic imports; three of them
  (`pr-test-analyzer`, `silent-failure-hunter`, `type-design-analyzer`) still address the user as
  **"Daisy"** in their examples; `code-reviewer.md` still pins `model: opus`, against CLAUDE.md's
  own rule ("Sonnet for implementation and review agents ... Opus only for an ambiguous product or
  design call"). CLAUDE.md's subagent table still names exactly three (`screenshot-qa`,
  `design-protocol-auditor`, `write-path-reviewer`) — the three written for this repo, all
  `model: sonnet`, all with scoped `tools:`. `grep -rn` for the other five outside `.claude/` and
  the audit folders: zero hits. New measurement audit 1 did not have: an agent's **description**
  loads into every session's system prompt, and the five generic descriptions total **8,336 bytes**
  (code-reviewer 1,998; comment-analyzer 1,966; pr-test-analyzer 1,522; silent-failure-hunter
  1,442; type-design-analyzer 1,408) against **863 bytes** for the three the project uses
  (design-protocol-auditor 275, screenshot-qa 260, write-path-reviewer 328). That is roughly
  **2,100 tokens of somebody else's onboarding prose in the context window of every session this
  repo will ever run**, ten times the cost of the agents that are actually used.
- **What to do**: owner decision (Owner decisions §5). On yes: `git rm` the five, or move them to
  `~/.claude/agents/` where they resolve identically for any project. Nothing else changes — no
  code imports them, `npm run check` does not read them, and `knip.jsonc:33` already ignores
  `.claude/**`.
- **Saving**: 426 lines / 5 files out of the repo; ~8.3 KB (~2.1k tokens) out of every session's
  context
- **Risk & gate**: low. Gate: a fresh session's agent list shows the three CLAUDE.md names.
- **Confidence**: high. Would change my mind: a `progress.md` entry showing a session was told to
  use one of the five by name. I searched and found none.
- **Notes**: the token number is the argument audit 1 was missing and the reason I would do this
  before launch rather than after. The three repo-written agents are good and stay:
  `screenshot-qa.md` was rewritten 2026-08-28 and now names `hover-probe.mjs` correctly.

### scripts-e2e-ci-13 - `crawl.mjs` claims to walk every live route and misses `/guide`
- **Where**: `scripts/qa/crawl.mjs:44` (the `routes` array); `scripts/README.md:50`;
  CLAUDE.md's Screenshots table ("every live route signed in")
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the array holds 20 destinations. `find src/app -name page.tsx` at HEAD shows
  `(main)/guide` and `(main)/guide/[area]`, shipped 2026-08-27 (`503a00a feat(guide): the guide
  ships, and the title is the way in`) as the replacement for the removed tour. Neither is crawled.
  The comment above the array (lines 40-43) explicitly instructs *"Cross-check against
  `ls src/app/(main)` when adding: /birds, /pick-bird and /welcome had each shipped without being
  added here"* — the same failure, one route later, four weeks on. Also absent, and worth a
  decision rather than a silent add: `/privacy`, `/terms`, `/guidelines` (public policy pages;
  `/privacy` is in the visual suite, the other two are watched by nothing), `/catchups/new`,
  `/letters/new`, and the fourteen `/admin/*` sub-pages (these last are covered by
  `gate-coverage.test.mjs` for *authorization*, not for 500s).
- **What to do**: add `'/guide'` to the array. Decide about the policy pages and the two `new`
  routes in the same edit — I would add `/guide`, `/terms`, `/guidelines`, `/letters/new` and
  `/catchups/new` (five strings, one line) and leave `/admin/*` out with a comment saying
  `gate-coverage.test.mjs` owns that surface, so the next reader does not think it was forgotten.
- **Saving**: -1 line (it grows). Restores the tool's stated contract and puts an automated eye on
  the route that replaced the tour.
- **Risk & gate**: low. Gate: the next `npm run verify:crawl` reports 200s for the new entries.
  Do not run it in an audit session — it signs in and writes presence telemetry.
- **Confidence**: high.
- **Notes**: audit 1 raised the identical finding (its 08) about five other routes and it was
  fixed. Twice now the list has fallen behind within a month of the fix. I still would not derive
  it from the filesystem — the dynamic segments need real ids, which is why `pickProfiles()`
  exists — but the *shape* of a durable fix is available and cheap: a `*.test.mjs` asserting that
  every directory under `src/app/(main)` containing a `page.tsx` appears either in `crawl.mjs`'s
  array or in a named exempt list. That is the same device `lab-audit.mjs` and
  `scripts-ledger.test.mjs` already use, it needs no dev server, and it is ~30 lines. Worth raising
  with the owner as a third instance of the pattern rather than doing unasked.

### scripts-e2e-ci-14 - `e2e/auth.setup.ts` hand-rolls the dev-login that `_dev-login.mjs` exists to own
- **Where**: `e2e/auth.setup.ts:13-49`; the helper it does not use:
  `scripts/qa/_dev-login.mjs:102-109` (`devLoginContext`)
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `_dev-login.mjs`'s header is explicit about why it exists — *"Replaces the nine
  hand-copied `fetch('/api/auth/admin-login')` blocks that used to live in these files"* — and it
  ships `devLoginContext(context, baseUrl, email)` specifically for Playwright. `auth.setup.ts`
  imports `assertSameOriginAfterNavigation` from the sibling `local-base-url.mjs` but not this,
  and re-implements the sign-in: its own `ADMIN_EMAIL` check, its own `DEV_LOGIN_SECRET` check, its
  own `POST /api/dev-login`, its own status assertion. Three behaviours diverge as a result:
  the helper passes `redirect: "error"` so a proxy misconfiguration fails loudly (its comment
  explains why), `auth.setup.ts` does not; the helper knows both cookie names
  (`authjs.session-token`, `__Secure-authjs.session-token`), `auth.setup.ts` leans on
  `storageState()` to capture whatever is there; the helper's 404 message names all three causes,
  `auth.setup.ts` has its own wording for the same three. This is the tenth copy of the block the
  helper was built to delete, in the one file nobody thought of as a "QA script".
- **What to do**: replace lines 21-42 with
  `await devLoginContext(page.context(), baseURL!, adminEmail)` (import from
  `../scripts/qa/_dev-login.mjs`, same relative style as the `local-base-url.mjs` import already
  there). Keep lines 29-32 (the goto + origin assertion — the helper does not navigate) and keep
  lines 44-49 verbatim: proving the cookie authenticates by loading `/feed` is real extra value
  that the helper deliberately does not do. `requireSecret()` inside the helper already throws the
  better message when `DEV_LOGIN_SECRET` is missing, so that check goes; keep the `ADMIN_EMAIL`
  one only if its CLAUDE.md pointer is worth the three lines (the helper's message says "No email
  given and ADMIN_EMAIL is not set in .env", which is nearly as good — I would drop it).
- **Saving**: ~20 lines; one sign-in path instead of two for the whole authenticated QA surface
- **Risk & gate**: low-medium — if this breaks, every Playwright run fails at setup, loudly and
  immediately, which is the good kind of breakage. Gate: `npm run visual` completes its `setup`
  project. Note `_dev-login.mjs` is a `.mjs` imported from a `.ts` file under Playwright's own
  transpile; `playwright.config.ts:3` already imports `local-base-url.mjs` the same way, so the
  path is proven.
- **Confidence**: high.
- **Notes**: the counter-argument is that `e2e/` should not reach into `scripts/qa/` — but it
  already does, twice, and `_dev-login.mjs` exports `devLoginContext` for no other caller. That
  export is currently dead: `grep -rn devLoginContext` finds only its definition. Either this
  finding lands or that export should go; leaving a Playwright-shaped helper nothing Playwright
  uses is the worse outcome.

### scripts-e2e-ci-15 - Fifteen hardcoded Chrome paths, four fallback policies, one of which is `undefined`
- **Where**: `scripts/qa/` — `theme-shots.mjs:39-40`, `map-cluster-verify.mjs:44-46`,
  `drive.mjs:677-679`, `hover-probe.mjs:117-118`, `_dir-room-shots.mjs:42`,
  `screenshot-auth.mjs:49`, `hoopoe-landing-check.mjs:39-41`, `hoopoe-idle-check.mjs:45-47`,
  `tour-mobile-verify.mjs:51`, `hoopoe-zoom-probe.mjs:22+27`, `_dir-chrome-probe.mjs:19+32`,
  `screenshot.mjs:30-34`, `phase3:251`, `phase4:211`, `phase5:268`, `phase7:121`, `phase8:101`,
  `phase10:84`, `crawl.mjs:45`, `verify-shot.mjs:18`; the helper that already owns it:
  `scripts/qa/_probe-kit.mjs:20+35`
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: 25 `puppeteer.launch()` call sites exist across `scripts/` (20 in `qa/`, 5 in
  `dev/`). The literal `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` is typed out
  **15 times**. Four distinct policies: (1) `env || macPath` — nine scripts; (2) `env ?? macPath` —
  one; (3) the literal with no env override at all — `_dir-chrome-probe.mjs:32`,
  `dev/shot-clip.mjs:10`, `dev/apple-edge/compare.mjs:12`; (4) `executablePath:
  process.env.PUPPETEER_EXECUTABLE_PATH` with nothing behind it — the six phase probes, which is
  safe *only* because `_probe-kit.mjs:35` does `process.env.PUPPETEER_EXECUTABLE_PATH ||=
  MAC_CHROME` first, and would resolve to `undefined` — CLAUDE.md gotcha 2, "Failed to launch the
  browser process" — the day one of them stops calling `bootstrap(..., { chrome: true })`.
  `crawl.mjs:45` and `verify-shot.mjs:18` pass no `executablePath` at all and require the caller to
  export the variable, which is why `scripts/README.md:36` has to carry a paragraph about it and
  why CLAUDE.md gotcha 2 singles those two out by name.
- **What to do**: export the resolution from `_probe-kit.mjs` (it already has `MAC_CHROME`) as
  `export function chromePath() { return process.env.PUPPETEER_EXECUTABLE_PATH ||
  (existsSync(MAC_CHROME) ? MAC_CHROME : undefined); }` — the `existsSync` half is
  `screenshot.mjs:30-34`'s, and it is the only version that degrades to puppeteer's bundled browser
  on a machine that is not this Mac, which matters the first time somebody runs this on Linux. Then
  every launch becomes `executablePath: chromePath()`. Fold it into finding 04's `_shoot.mjs` for
  the screenshot family and apply it directly elsewhere. Once done, delete
  `scripts/README.md:27-40`'s instruction that `verify-shot.mjs` and `crawl.mjs` "require
  `PUPPETEER_EXECUTABLE_PATH`" and CLAUDE.md gotcha 2's second half, because they will no longer be
  true — that is the real prize.
- **Saving**: ~25-30 lines, 14 duplicate literals, and two paragraphs of documentation about a trap
  that stops existing
- **Risk & gate**: low, but it touches every browser script at once, so do it as one commit and
  smoke-run three of them (`screenshot`, `verify:shot`, one phase probe) before committing.
  `npm run check` proves nothing here.
- **Confidence**: high on the count and the four policies. Medium on whether it is worth doing on
  its own — it is a cheap win by the brief's own definition. Do it inside finding 04.
- **Notes**: this is the clearest answer to my charter's "could one kit own them": yes, and the kit
  already exists and is already imported by nine of the twenty. The screenshot family simply never
  learned about it, because `_probe-kit.mjs` was written for the phase probes on 2026-08-20 and the
  screenshot scripts predate it.

### scripts-e2e-ci-16 - Three ways to read `.env`, one of them hand-rolled beside a dependency that does it
- **Where**: `scripts/dev/_env.mjs` (53 lines, hand-rolled parser, 14 dev callers);
  `scripts/qa/_probe-kit.mjs:12-16` (`loadEnv`, dotenv, 9 probe callers); bare
  `config({ path: ".env" })` in `crawl.mjs:11`, `screenshot-auth.mjs:12`, `verify-shot.mjs:14`,
  `theme-shots.mjs:22`, `drive.mjs:24`, `_dir-chrome-probe.mjs:17`, `hover-probe.mjs:38`,
  `map-cluster-verify.mjs:26`, `hoopoe-idle-check.mjs:28`, `tour-mobile-verify.mjs:15`,
  `e2e/playwright.config.ts:20`, `scripts/ops/prune.mjs:28`, `scripts/ops/snapshot.mjs:35`
- **Phase**: library
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `dotenv@^17.3.1` is a direct dependency. `_env.mjs` reimplements it: a regex line
  parser, quote stripping, first-writer-wins, and a `loadEnv` that does not override
  `process.env` — all four are dotenv's documented behaviour. Its docblock justifies *consolidation*
  ("Seven of them carried this parser verbatim") but never says why it is hand-rolled rather than
  three lines over dotenv. The one stated reason is the `readEnv`/`loadEnv` split, for
  `run-sql.mjs --env .env.demo`: *"its credentials must not end up in `process.env`."* dotenv
  supports exactly that — `config({ path, processEnv: {} }).parsed` returns the variables and
  writes nowhere. So `_env.mjs` could be ~15 lines instead of 53 with identical semantics.
- **What to do**: rewrite `_env.mjs`'s two exports over `dotenv`, keeping the *entire* docblock
  (it records a real leftover — the `[".env", ".env"]` double-read — and the deliberate refusal to
  become a shared database opener, which is a rule worth keeping). Leave the 14 call sites
  untouched. Separately, the eleven bare `config({ path: ".env" })` calls are fine and should stay
  bare: routing them through a helper would buy one line and cost an import, which is precisely the
  dedupe-does-not-pay lesson.
- **Saving**: ~35 lines, one fewer hand-rolled parser of a format with quoting rules
- **Risk & gate**: low-medium — fourteen scripts that touch the live database read their
  credentials through this. Proof before merging: `node -e "import('./scripts/dev/_env.mjs').then(m
  => console.log(Object.keys(m.readEnv()).sort().join(',')))"` before and after must print the
  identical key list. Do not diff values into a terminal.
- **Confidence**: medium-high. The one thing that would change my mind: a quoting or comment case
  where the hand-rolled parser and dotenv disagree on this specific `.env` (dotenv handles `#`
  comments and multiline values; the hand parser's regex `^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$` silently
  ignores lowercase keys and treats a trailing `# comment` as part of the value). That difference
  is an argument *for* the change, but the before/after key-list check must confirm nothing in the
  real file relied on the looser behaviour.
- **Notes**: honestly a small item. I include it because my charter asked about env handling and
  because `raw/env-flags.txt` shows these scripts reading twelve distinct keys — a parser
  disagreeing with the app's own loader on one of them is the kind of bug that takes an afternoon.

### scripts-e2e-ci-17 - `snapshot.yml` interpolates a workflow input straight into a shell command
- **Where**: `.github/workflows/snapshot.yml:76-81`
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**:
  ```
  run: |
    if [ -n "${{ inputs.day }}" ]; then
      node scripts/ops/snapshot.mjs --day "${{ inputs.day }}"
  ```
  `${{ }}` is substituted into the shell script *before* bash sees it, so a `day` input containing
  a quote plus a semicolon executes on the runner with the job's secrets in scope
  (`SUPABASE_DIRECT_URL`, `SENTRY_AUTH_TOKEN`, `POSTHOG_PERSONAL_API_KEY`). GitHub's own hardening
  guidance names this pattern specifically. Severity here is genuinely **low** — `workflow_dispatch`
  is restricted to users with write access, i.e. the owner alone — so this is hygiene, not an open
  door. It is the only instance in the four workflows; `check.yml`, `retention.yml` and
  `backup.yml` all pass values through `env:`.
- **What to do**: add `env: { DAY: "${{ inputs.day }}" }` to the step and use `"$DAY"` in the
  script. Three lines. `snapshot.mjs` already validates the value it receives
  (`new Date(\`${dayArg}T00:00:00Z\`)`), so nothing downstream changes.
- **Saving**: 0 lines; one class of workflow injection gone from the repo
- **Risk & gate**: none. Gate: dispatch the workflow once with a `day` and confirm the backfill
  still records (owner action; do not dispatch from an audit session).
- **Confidence**: high on the mechanism, low on the exploitability — hence low severity, reported
  because it is cheap and because the security lens will want it on the list.
- **Notes**: for the security lens rather than for the simplification headline.

### scripts-e2e-ci-18 - `npm run lint` lints a different scope from the gate that decides
- **Where**: `package.json` `"lint": "eslint"`; `scripts/qa/check.mjs:109` (`npx eslint src`)
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -rn "npm run lint"` across `*.md`, `*.yml` and `*.json` outside
  `node_modules` and the audit folders returns **nothing** — no document, no workflow, no skill
  names it. It is the `create-next-app` default that survived. With ESLint 9 flat config and no
  patterns it lints the current directory, i.e. the whole repo including `scripts/` and `e2e/`,
  while the gate lints `src` only. So the one command a newcomer would reach for reports a
  different answer from the one that blocks a commit.
- **What to do**: either delete the entry (the gate is `npm run check -- lint`, which CLAUDE.md
  already documents as the single-gate shortcut) or make it `eslint src` so the two agree. I
  recommend **delete**: two commands for one job is how the disagreement got here, and
  `check.mjs`'s per-gate argument already covers the "just lint" case.
- **Saving**: 1 npm script; one fewer way to get a different answer to the same question
- **Risk & gate**: low. `npm run check` unaffected (it shells out to `npx eslint src` directly).
  Confirm nothing in `.claude/skills/check/SKILL.md` names it first.
- **Confidence**: high.
- **Notes**: the rest of the block is live. Of the 18 scripts, 17 point at files that exist and are
  reachable: `dev`/`build`/`start` (Next), `check`, `postinstall`, the four screenshot/crawl
  commands, `dev:centroid`, `dev:shot-clip`, the four Playwright ones, `analyze`, `audit:status`.
  `visual:report` exists but cannot work (finding 08). So: one dead, one broken, sixteen fine.

### scripts-e2e-ci-19 - `docs/OPERATIONS.md` §4 says one dependency override; there are five
- **Where**: `docs/OPERATIONS.md:238-247`; `package.json` `overrides`
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: OPERATIONS.md, bolded: *"**One `overrides` entry lives in `package.json`, and it is
  not permanent.**"* It then documents `deepmerge-ts` and ends *"Delete the entry the moment
  `@prisma/config` ships depending on 8 — an override that outlives its reason is a pin nobody
  remembers making."* `package.json` today: `browserslist ^4.28.8`, `deepmerge-ts ^8.0.2`,
  `mysql2 ^3.24.3`, `postcss-selector-parser ^7.1.5`, `fast-uri ^3.1.7` — **five**. Four arrived
  after the paragraph was written, the newest in `a13a8a9 build(deps): close four fast-uri
  advisories with an override` (HEAD~1). Each is presumably an advisory response, but only one has
  its reason and its exit condition written down, and the document's own rule is that an override
  without a stated exit is a pin nobody remembers making. Four of five are now exactly that.
- **What to do**: rewrite §4's override paragraph as a small table — package, the GHSA or reason,
  and what clears it — with a line per entry, and change the bolded claim. The reasons are
  recoverable from the commits that added them (`git log -S'"fast-uri"' -- package.json`, etc.).
  Consider whether these belong in `npm-audit-gate.mjs`'s `ALLOWLIST` shape instead, which already
  demands `reason` and `clearsWhen` per advisory — an override and an allowlist entry are the two
  answers to the same question and only one of them is currently forced to justify itself.
- **Saving**: 0 lines; four dependency pins acquire an expiry
- **Risk & gate**: none for the doc edit. Do not touch `package.json`.
- **Confidence**: high.
- **Notes**: for the dependency lens too — it will have the advisory details I do not.

### scripts-e2e-ci-20 - The baseline history has grown 38 MB in ten days, and five desktop shots are 55% of it
- **Where**: `e2e/__screenshots__/` — 24 PNGs, 12,959 KB working copy; git history 157 blobs /
  101.2 MB across 39 commits
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: my charter asks what the 13 MB protects and whether any pair is redundant, so:
  every one of the 24 maps 1:1 onto a live `ROUTES` entry × the two Playwright projects — **zero
  orphans**, same as audit 1. Sizes (desktop / mobile, bytes): landing 2,512,790 / 628,810;
  login 1,639,795 / 17,403; birds 1,226,110 / 548,776; about 1,083,591 / 330,902;
  support 992,723 / 352,640; catchups 883,474 / 221,978; privacy 580,068 / 502,068;
  letters 517,881 / 80,514; directory 344,122 / 121,361; collection 253,573 / 99,617;
  collection-class 237,738 / 99,492; feed 234,663 / 79,195. Five desktop files — landing, login,
  birds, about, support — are **7.46 MB, 55% of the total**, because they are `fullPage: true` on
  tall image-heavy pages. The growth: audit 1 measured 81 blobs / 62.9 MB across 15 commits on
  2026-08-25. Today: **157 blobs / 101.2 MB across 39 commits** — 24 rebaseline commits and
  ~38 MB of permanent history in ten days, about 3.8 MB a day. `.git` is 231 MB on disk
  (`size-pack` 72.9 MiB packed; PNGs barely compress, so the pack does not rescue this).
  On redundancy: the closest pair is `collection` and `collection-class`, both `live: "band"`,
  both therefore shot at viewport height with everything under the page header masked — so
  337 KB of the two desktop+mobile files exist to compare a title string, a caret direction and
  the absence of a bucket line. The spec argues for it explicitly (`visual.spec.ts:45-62`) and I
  am not calling it redundant; it is the honest example of what a picture costs versus what a
  three-line DOM assertion would cost.
- **What to do**: nothing today — this is a threshold, restated with a slope. When the history hurts
  (say `.git` over 500 MB), in order of preference: (a) shallow clone for CI, free, no repo change;
  (b) `git lfs` for `e2e/__screenshots__/**`, workflow unchanged, needs quota; (c) `fullPage:
  false` on landing, login and birds — which is a real loss of below-fold coverage on the three
  pages a stranger sees, so it is an owner call, not a cleanup. What a fix session **can** do now
  at zero cost: nothing to the images. What it must **not** do: shrink `maxDiffPixels`, change the
  viewports, or drop a route to save bytes — every one of those constants has its reasoning in
  `playwright.config.ts:61-81` and `visual.spec.ts`, and OPERATIONS.md records the regression that
  proved the ratio version wrong.
- **Saving**: 0 today; names a curve that has doubled since it was last measured
- **Risk & gate**: none today
- **Confidence**: high on every number (measured with `git rev-list --objects --all --
  e2e/__screenshots__` piped through `git cat-file --batch-check`). Medium on the projection:
  24 rebaselines in ten days reflects an unusually heavy design period (the Collection rework),
  and the rate should fall as the design settles before launch.
- **Notes**: also worth the owner knowing that `collection-class`'s existence is itself a small
  ongoing cost: it was added because the class half is a different page, and then within four days
  it had to be masked because the owner's 1,719-photograph album landed in it. Both facts are in
  the spec's comment, honestly. What it now compares — after the mask — could be a
  `expect(title).toHaveText(...)` in `collection-journeys.spec.ts` at 337 KB less. Raising it, not
  recommending it: the picture also catches the caret and the spacing, which text assertions do not.

### scripts-e2e-ci-21 - `seed-curated-content.ts` documents an env loader it no longer has
- **Where**: `scripts/dev/seed-curated-content.ts:19`
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: line 19 reads *"Env is loaded by hand (.env then .env, same precedence as
  scripts/dev/run-sql.mjs)"*. It is not loaded by hand any more — line 41 is
  `import { loadEnv } from "./_env.mjs"` and line 43 is `loadEnv()`, which defaults to `[".env"]`.
  The stray `(.env then .env)` is the exact leftover `_env.mjs`'s own docblock was written to
  record and eliminate: *"five of those carried the same leftover with it: `for (const file of
  [".env", ".env"])`, the second entry a `.env.local` that stopped existing."* The code was fixed;
  this sentence is the fossil.
- **What to do**: change line 19 to "Env is loaded by `_env.mjs`, before any import that could
  construct a client or read R2 config." The rest of that paragraph (why the Prisma client and the
  storage shim are dynamic imports) is correct and valuable — keep it.
- **Saving**: 0 lines
- **Risk & gate**: none.
- **Confidence**: high.
- **Notes**: trivial on its own; included because it is the one place in my territory where a
  comment describes deleted code, which is the brief's stated bar for comment bloat in a repo that
  otherwise earns its comments.

## Owner decisions

1. **The nightly notification pruner, after its bug is fixed** (finding 02). Once the workflow
   stops passing `--days 30`, `scripts/ops/prune.mjs` will find nothing to delete on almost every
   run, because the retention sweep already ran three hours earlier with the same one-year rule.
   The script's own note says it exists alongside the sweep only because a big backlog wanted a
   *batched* delete rather than one long statement, and that backlog is gone. Two honest choices:
   keep it as the tool you reach for the day the sweep times out on a large table (97 lines, one
   workflow step, costs nothing), or fold it away and let the sweep own notifications entirely.
   **My recommendation: keep it, and change its workflow step's name and comment to say what it now
   is — a safety valve, not the primary mechanism.** A no-op that runs nightly and prints
   "Nothing to prune" is a cheap early warning that the sweep has stopped running.

2. **`drive.mjs`'s ten stored investigations** (finding 05). This file is a browser harness plus
   ten little scripted stories, each written to answer one question in one session: how does the
   landing slide move, does the houses picker cover the year rows, does the location box empty
   after you pick a city. All ten questions were answered and the answers shipped. One of them
   cannot even run any more — it needs a photograph that only ever existed on the machine that
   wrote it. The harness underneath is genuinely useful and should stay. **My recommendation:
   keep the harness and one example, delete the other nine (~500 lines), and write the rule into
   the file: a story is written to answer a live question and deleted the same day, unless it
   would catch a future regression — and then it belongs in the Playwright folder instead.** If you
   want any of the reasoning kept, it belongs in the bug tracker as prose. Nothing a member sees
   changes either way.

3. **The two security probes audit 1 asked you about, one of which has since broken** (finding 06,
   and it is your open decision 9). `phase9-probe.mjs` checks that the CI gate really gates. Two of
   its eight checks now fail, because on 2026-09-02 the CI file was deliberately emptied down to
   one line and the checks still look for the old contents. It also does its work by moving a file
   out of the way mid-run, which your own rule against disturbing other sessions' working trees
   forbids. `phase6-probe.mjs` proved that one particular library upgrade did not break signing in.
   **My recommendation, which differs from audit 1's: retire `phase9` (86 lines) and KEEP
   `phase6`.** Phase 9's job is already done twice over by things that run automatically. Phase 6
   is the only thing in the whole repo that proves a real email-and-password sign-in still works
   after an auth-library bump — and Renovate deliberately holds those bumps for a week because
   auth breaking is the worst thing that can happen here. It is also the only one of the ten that
   does not need a browser, so it is the cheapest to run. Rather than delete it, its one-line
   description should say when to run it: *after any next-auth or Next upgrade.*

4. **`sweep-stranded-originals.mjs`, a one-off with an expiry that has passed** (finding 10, README
   line 79). Its own entry says: run it once now, once after the staging change deploys, then
   delete it and this line. The staging change deployed on 2026-08-28. It is a week later and both
   the script and the line are still here. **One question only: has it been run the second time?**
   If yes, delete both (161 lines plus its ledger line). If no, run it once with `--apply` and then delete both. I have
   not run it and cannot tell from the tree — which is the point: a script that says when it should
   die needs somebody to notice the date.

5. **The five imported agent files, unchanged since I last asked** (finding 12). Your `.claude/agents`
   folder holds eight helper definitions. Three were written for this site and are named in
   CLAUDE.md. The other five came from elsewhere; three of them address a user named Daisy, one
   asks for your most expensive model against your own written rule, and nothing in the project has
   ever referred to any of them. New number since last time: every one of these files puts its
   description into *every* session's opening context, and the five strangers take about ten times
   the space of the three you use — roughly 2,000 words of somebody else's instructions in every
   conversation, forever. **Recommendation: move them to your user-level Claude folder (they keep
   working identically for every project) or delete them. Do it before launch, not after.**

6. **`_dir-chrome-probe.mjs` and the promise `/lab/directory` makes** (finding 07). That lab room
   tells the reader its measurements came from a named script. That script stopped working on
   2026-08-27, when the tour removal took away the attribute it looks for, and now silently reports
   nothing. Either it gets repaired (~6 lines, and someone opens the page to find a hook that will
   not rot the same way) or it goes and the room's three citations change to "measured on
   2026-08-27". **Recommendation: repair it.** The room is design history you approved, and a
   citation pointing at a broken tool is worse than a dated number.

## Not-findings

Verified intentional. Do not re-litigate.

- **`audit-status.mjs` at 723 lines and 74 checks.** My charter asked whether its data file is
  live: **there is no data file.** Every check reads the tree at run time; `read()` returns `""`
  for a missing path so nothing throws. I resolved every `read("...")` and `has("...")` path in the
  file against disk — 100% exist except `src/app/api/auth/admin-login/route.ts`, which is the
  C1-b check asserting the route stays deleted. It is a blocking gate in `npm run check`
  (`check.mjs:221-239`) and its H16 probe was correctly updated when the CI gates moved on
  2026-09-02, which is more than phase9 managed. Its size is 74 arguments, each with its own
  reasoning. Keep.
- **The phase probe set as a whole** (2,228 lines across 9 files + `phase4-prod-check`). I checked
  every route each one hits against the API routes on disk: `/api/upload`, `/api/upload/presign`,
  `/api/upload/finalize`, `/api/account/export`, `/api/retention/sweep`, `/api/catchups/tick`,
  `/api/dev-login`, `/api/users-by-batch`, `/signup`, `/login`, `/feed`, `/forgot-password`,
  `/admin/people/[id]`, `/profile/[id]` — **all live**. Only phase9's `check.yml` assertions have
  rotted. `docs/SECURITY.md` names them as the standing behavioural verification and they reach
  behaviour no unit test can (rate limiting, real R2 deletion, retention purging actual objects,
  cross-origin refusal). Audit 1 rejected deleting the set to score lines and it was right.
- **`hoopoe-idle-check.mjs` and `hoopoe-landing-check.mjs`.** These are the "remembering" half of
  my charter's question and they earn it. `hoopoe-idle-check` guards a promise that never settles —
  a defect literally invisible in a screenshot, as its 24-line header explains — and is cited by
  `visual.spec.ts:88-90` as the reason the mascot can be masked there. `hoopoe-landing-check`
  measures four flight arrivals frame by frame off `[data-mascot-flyer]` and `[data-hoopoe-perch]`;
  I confirmed both attributes still exist (`mascot-flight-layer.tsx:579`, `login-client.tsx:242`,
  `signup-client.tsx:156`) and that `mascot-flight-layer.tsx:576` names the script as the reason
  the hook is there. Keep both.
- **`hoopoe-zoom-probe.mjs`.** Its verdict block is the best small piece of writing in this folder:
  it records that the probe's *first draft asserted the wrong invariant and reported 15 confident
  failures against a correct rig*. `docs/planning/bugs.md` #17 cites it as the disproof that stops
  the wing-pivot theory being re-tested. Only its README line is stale (finding 10). Keep.
- **`hover-probe.mjs`.** All five of its target selectors still resolve — I checked the composer
  pill's `h-11 rounded-full` chain against `create-post-form.tsx:1263` and the four `data-slot`
  values against `src/components/ui`. It reports SKIP rather than silently passing when a selector
  is absent, which is the discipline `_dir-chrome-probe` lacks. `.claude/agents/screenshot-qa.md:43`
  names it. Keep.
- **`e2e/collection-seek.spec.ts` driving `/lab/collection` rather than `/collection`.** This looks
  wrong and is right, and the header says why: the live archive holds a handful of photographs and
  cannot exercise a year rail, while the lab room's 240 are deterministic. Worth flagging to the
  lab lens as a dependency in the other direction — `/lab/collection` is now a **test fixture** for
  a shipped feature and cannot be retired without rewriting 623 lines of spec.
- **Every e2e spec's existence.** `sidebar.spec.ts`, `deeplink.spec.ts`,
  `collection-permalink.spec.ts`, `loading-fallbacks.spec.ts` each open by naming the dated bug
  they pin and the two locator traps that made the first attempt fail. `loading-fallbacks.spec.ts`
  is the behavioural half of `loading-boundary-rule.test.mjs` and says so. Nothing to cut.
- **`check.mjs`'s `MIN_TEST_FILES = 60` against a real count of 102.** A floor, deliberately well
  below, so it never nags and fires when a chunk of the suite disappears (audit C-195). The comment
  says to raise it if it starts feeling close. It is not close.
- **`ci-parity.test.mjs`, `scripts-ledger.test.mjs`, `hand-run-passes.test.mjs`, `knip.jsonc`.**
  All four are audit-1-era enforcement of a written rule, all four current, all four with their
  reasoning in the file. `scripts-ledger.test.mjs`'s choice of `git ls-files` over a filesystem
  walk — so a peer session's WIP cannot fail the gate — is exactly right for a shared checkout.
- **`backup.yml`, `retention.yml`, `renovate.json`.** Schedules valid and in UTC with the IST
  conversion written out (audit C-147); every secret named in OPERATIONS.md; `backup.yml` refuses
  to run against the public media bucket and verifies the dump's table of contents before trusting
  it. `renovate.json` splits majors, pins react, holds next-auth 7 days, and labels Playwright
  bumps "run npm run visual". The comment quality in `backup.yml` remains the best in the repo.
- **`set-password.mjs`, `run-sql.mjs`, `email-mark.mjs`, `import-roster.mjs`.** Each states a live
  reason. `run-sql.mjs` now carries the demo-ref guard ported from the deleted
  `scripts/demo/run-sql.mjs` exactly as audit 1's finding 04 specified — that fix shipped and is
  correct. `import-roster.mjs` is pinned by path in `src/lib/unattended-rule.test.mjs`; any
  relocation must update that test.
- **The `puppeteer.skipDownload` key in `package.json` and the paragraph explaining it**
  (`README:27-40`). Load-bearing: without it every Vercel build pulls a ~130 MB Chrome into a cache
  Vercel does not restore. Correctly moved out of a root `.puppeteerrc.cjs` on 2026-08-28.

## Audit-1 carry-overs in this territory

- **Finding 01 (ledger gate)** — SHIPPED. `scripts-ledger.test.mjs` exists, runs in the gate, and
  all 63 tracked scripts have a line. The *truth* of nine lines has since drifted (my finding 10).
- **Finding 02 (imported skill packs)** — UNCHANGED, still the owner's call. 52 skill directories,
  96 tracked files, 19,741 lines; the four repo-authored ones are still ~2% of that. Not my
  territory to re-argue; state only.
- **Finding 03 / owner decision 8 (the five generic agents)** — UNCHANGED. My finding 12, now with
  a per-session token measurement audit 1 did not have.
- **Finding 04 (delete `scripts/demo/run-sql.mjs`)** — SHIPPED, exactly as written. `scripts/demo/`
  holds four files; the demo-ref guard is at `scripts/dev/run-sql.mjs:52-56`.
- **Finding 05 / owner decision 9 (retire phase6 + phase9)** — UNCHANGED and now overtaken by
  events: phase9 has genuinely rotted (my finding 06), and I recommend the opposite of audit 1 on
  phase6.
- **Finding 06 (four hand-rolled `.env` parsers in the probes)** — SHIPPED. No `readFileSync` of
  `.env` remains in `scripts/qa`; all nine probes go through `_probe-kit.mjs`'s `bootstrap`.
- **Finding 07 (stale counts in README and SKILL files)** — PARTLY SHIPPED. The test-count line is
  gone in favour of a floor. Nine other lines have drifted since (finding 10), and the "11 routes"
  number that was fixed to 11 is now wrong again at 12 (finding 11).
- **Finding 08 (`crawl.mjs` route list)** — SHIPPED for the five routes named, and drifted again
  by one (`/guide`, my finding 13).
- **Finding 09 (`temporary screenshots/`)** — SHIPPED. Everything writes to `e2e/.shots/` and the
  root folder is gone. `e2e/.output` holds only `.last-run.json` today.
- **Finding 10 (baseline history)** — WORSE, as predicted: 63 MB → 101 MB, 15 → 39 commits, in ten
  days (my finding 20).
- **Open owner decision: "the member tour"** — RESOLVED by `ae5bc9a 2026-08-27`, the tour was
  removed and `/guide` replaces it. Its tooling was not removed (my findings 01 and 07).

## For other lenses

- **collection lens / hand-run passes**: `scripts/dev/sweep-stranded-originals.mjs` (161 lines)
  is a self-declared one-off whose README line (`scripts/README.md:79`) says to delete it after the
  second run, and the staging change it waits on deployed 2026-08-28. Somebody who knows whether it
  has been run should close it out.
- **lab lens**: `/lab/collection` is now a **test fixture**, not only design history —
  `e2e/collection-seek.spec.ts` (623 lines) drives it exclusively, by explicit design. Retiring or
  reshaping that room breaks the spec. Also `/lab/directory` cites a broken measuring script in its
  own UI (`_room.tsx:158`, `_chrome.tsx:11`, `_data.ts:485`) — my finding 07.
- **lib-tests lens**: `scripts/qa/tour-mobile-verify.test.mjs` is a source-reading pin whose subject
  is a dead script (my finding 01) — an instance of the rule-test pattern's one blind spot: it
  cannot tell a live file from a corpse, because the source is still there.
  `src/lib/test-fn-body.mjs`'s `balancedBody` is duplicated in `scripts/qa/audit-status.mjs`
  (my finding 09) — the fix imports *into* scripts, so lib-tests should know the file is about to
  gain a caller.
- **root-docs-assets lens**: `docs/OPERATIONS.md` needs three edits from me (findings 11, 19, and
  the `--days 30` line in §2 from finding 02); `CLAUDE.md`'s Screenshots table needs the 12-route
  and six-live-route correction (finding 11); `docs/planning/bugs.md` #14 vs #17 is the target of a
  stale README cross-reference (finding 10).
- **security lens**: `.github/workflows/snapshot.yml:76-81` interpolates a `workflow_dispatch` input
  straight into a shell command (my finding 17, low severity, owner-only trigger).
  `scripts/qa/phase9-probe.mjs:53-63` renames `check.yml` aside mid-run, which can corrupt a
  parallel session's view of the tree.
- **deps lens**: `package.json` `overrides` has grown from one to five and only one has a written
  exit condition (my finding 19). `puppeteer`, `sharp`, `jsqr`/`qrcode` (if still present) and
  `bcryptjs` are used exclusively by scripts in my territory — none is unused.

## Metrics

- **Lines read in full**: ~4,900 (47 files). Structurally read with every target grepped against
  the tree: ~3,700 more (12 files).
- **Territory sizes**: `scripts/qa` 5,050 code / 1,401 comment across 37 files (`raw/lines-by-dir.txt`);
  `scripts/dev` 2,125 / 976 across 21; `scripts/ops` 260 / 126 across 2; `e2e` 824 / 646 across 9;
  `.github` 5 files, ~21 KB; `.claude/agents` 650 lines (repo-written 224, imported 426).
- **Biggest files in territory**: `drive.mjs` 727, `audit-status.mjs` 723,
  `collection-seek.spec.ts` 623, `phase4-probe.mjs` 445, `phase3-probe.mjs` 398,
  `phase5-probe.mjs` 386, `phase8-probe.mjs` 365, `seed-curated-content.ts` 363,
  `ops/snapshot.mjs` 337, `map-cluster-verify.mjs` 315.
- **Browser bootstraps**: 25 `puppeteer.launch()` call sites (20 in `scripts/qa`, 5 in
  `scripts/dev` incl. `apple-edge`); the macOS Chrome literal typed 15 times under 4 fallback
  policies; 1 Playwright config (2 projects) that needs none of it.
- **Scripts inventory**: 63 tracked non-test scripts + 6 `*.test.mjs` under `scripts/`; all 63 have
  a README line (the gate passes); **9 of those lines are factually wrong** (finding 10);
  **3 scripts are dead** (`tour-mobile-verify.mjs`, `_dir-chrome-probe.mjs`, and — pending the
  owner — `phase9-probe.mjs`).
- **e2e baselines**: 24 PNGs = 12 routes × 2 viewports, 12,959 KB working copy, **zero orphans**.
  Five desktop shots are 55% of the bytes. Git history: 157 blobs / 101.2 MB across 39 commits
  (`.git` 231 MB on disk, `size-pack` 72.9 MiB).
- **npm scripts**: 18 entries — 16 live, 1 dead (`lint`), 1 documented-but-broken (`visual:report`).
- **Gate state at HEAD** (`raw/check-baseline.txt`): 7 gates, all green, 24.8 s, 102/102 tests,
  74 security findings tracked with none open at high.
- **Honest savings ledger for this territory**: autonomous deletions **364 lines / 3 files**
  (findings 01, 07); owner-gated deletions **~586 lines** (finding 05's ~500, finding 06's 86), plus 161 if the sweep script is closed out;
  owner-gated relocation **426 lines / 5 files + ~2.1k tokens per session** (finding 12); dedupe
  **~110 lines** across findings 04, 09, 14, 15, 16; hygiene and correctness with **0 lines**:
  one live nightly data-retention bug (02), one broken mobile emulation across four scripts (03),
  one unusable diff viewer (08), and fourteen wrong sentences in the two documents future sessions
  read first (10, 11, 19). The structural headline is not a line count: it is that four things
  rotted in ten days, in exactly the places no gate looks.
