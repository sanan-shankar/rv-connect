# v-scripts-tooling — verification notes (2026-08-25, HEAD = c74d99f)

Cluster: scripts-e2e-ci-01, 04..09; lib-tests-03, 04, 07; dependency-diet-15, 16.
Method: everything re-checked at today's HEAD with read-only commands. Tree is clean apart
from the audit's own untracked files, so no finding sits on someone's WIP.

## scripts-e2e-ci-01 — the 22-unlisted-scripts list — CONFIRMED
Re-derived from scratch:
- `git ls-files scripts` = 55 files; minus `scripts/README.md` = **54 scripts**. Matches.
- README coverage counted three ways, matching the finder's implicit method:
  - 23 scripts named by filename in the demo/dev/qa/standalone tables;
  - 7 covered via the "Wired into npm run" table — verified each npm command maps to the
    script in package.json (`check`→check.mjs, `screenshot`→screenshot.mjs,
    `screenshot:auth`→screenshot-auth.mjs, `verify:shot`→verify-shot.mjs,
    `verify:crawl`→crawl.mjs, `dev:centroid`→centroid.mjs, `dev:shot-clip`→shot-clip.mjs);
  - 2 test files covered by "Has a test" rows (local-base-url.test.mjs,
    tour-mobile-verify.test.mjs).
  Total listed = 32. Unlisted = 54 − 32 = **22**, and the names match the report's list
  exactly: qa/_dev-login.mjs, qa/_probe-kit.mjs, qa/audit-status.mjs, qa/npm-audit-gate.mjs,
  qa/npm-audit-gate.test.mjs, qa/hoopoe-idle-check.mjs, qa/phase3..phase10-probe.mjs (8),
  qa/phase4-prod-check.mjs, dev/email-mark.mjs, dev/generate-icons.mjs, dev/import-roster.mjs,
  dev/set-password.mjs, demo/run-sql.mjs, ops/prune.mjs, ops/snapshot.mjs. **Zero difference
  from the report's list.**
- README:3 states the rule; README:6 records the 63→32 cull ("reached 63 files by
  2026-08-08... 31 were one-off probes... They were deleted"). README:21 says "all 14
  `*.test.mjs` in parallel, ~17s" — stale, see 07.
- One design caution for the fix session, not a refutation: `run-sql.mjs` appears in the dev
  table, and `demo/run-sql.mjs` shares that basename — a ledger test matching bare basenames
  would wrongly count demo/run-sql.mjs as listed. Match on path or on section context.

## scripts-e2e-ci-04 — demo/run-sql.mjs superseded — CONFIRMED
- Zero referrers: `grep -rn "demo/run-sql"` over the repo (node_modules/.next/.git excluded)
  hits only the file's own usage comments (:13,:14,:51), the audit's own report files, and
  the raw knip/jscpd outputs. docs/spec/demo.md: no mention. README demo table lists four
  scripts, not this one.
- `--env` exists in dev/run-sql.mjs — header line 8: `node scripts/dev/run-sql.mjs --env
  .env.demo path/to/file.sql`; code lines 45-48: `if (argv[0] === "--env") { envFile =
  argv[1]; argv.splice(0, 2); }`. TRAPS.md:20-21 documents exactly that invocation as the
  path for both databases.
- The guard the port must keep — demo/run-sql.mjs:24: `const EXPECTED_REF =
  "cbvlzptghkuxhygyaezq";` and :41-44: `if (!conn.includes(EXPECTED_REF)) {
  console.error(\`refusing: connection host does not carry the demo ref ${EXPECTED_REF}\`);
  process.exit(1); }`.
- Timeline confirmed: demo/run-sql.mjs last touched eb1665e 2026-08-20; the `--env` flag
  landed in b3a2f4a 2026-08-21 "chore(db): let run-sql target the demo's own database".
- Note for the fix session: demo/run-sql reads `.env.demo` ONLY and cannot inherit a stray
  var; dev/run-sql's loadEnv reads whatever file `--env` names. The ported guard ("when
  envFile is .env.demo, require the ref") reproduces the protection; keep the constant
  verbatim as the finder says.

## scripts-e2e-ci-05 — phase6/phase9 one-time-ness — CONFIRMED
- phase6-probe.mjs (146 lines, matches) header: "The one that most needs proving is C3: the
  auth library moved beta.30 -> beta.32 and Next moved 16.2 -> 16.3. A static check cannot
  tell whether authentication still works after that" — a question about an upgrade that
  already shipped; one-time.
- phase9-probe.mjs (86 lines, matches) DOES rename check.yml mid-run:
  `const yml = ".github/workflows/check.yml"; const aside =
  ".github/workflows/check.yml.probe9-aside"; renameSync(yml, aside);` (restored in a
  `finally`, plus an existsSync check). That mutates the shared working tree exactly as the
  finder says — hostile to the multi-session rule.
- Totals: phase3..phase10 + phase4-prod-check = 416+456+403+146+175+382+86+189+87 = **2,340
  lines** (matches); phase6+phase9 = **232 lines / 2 files** (matches).
- SECURITY.md (window 124-132) names `scripts/qa/phase{4..10}-probe.mjs` with "Run the
  relevant one after touching its area." — matches the report's :128-130 cite.
- audit-status.mjs:307 and :316 both name phase3-probe ("run phase3-probe for behaviour"),
  supporting the report's keep-phase3 note.

## scripts-e2e-ci-06 — duplicated .env parse loops — CONFIRMED
- The identical `for (const line of readFileSync(resolve(repoRoot, ".env"), ...))` loop with
  quote-stripping and `if (!(m[1] in process.env))` no-override: phase6:28-34, phase7:29-35
  (finder said 30-36 — off by one, immaterial), phase8:44+, phase10:36+.
- _probe-kit.mjs:12-14 exports `loadEnv(repoRoot)` via dotenv ("dotenv never overrides
  variables already set") and its header carries the audit-R6 rationale verbatim. All four
  probes already import `makeLedger` from _probe-kit (phase6:22, phase7:22, phase8:37,
  phase10:29).

## scripts-e2e-ci-07 — stale SKILL/README counts and routes — CONFIRMED
- .claude/skills/check/SKILL.md:8 "Runs all five gates in parallel, ~17s from cold"; :53
  "the 14 standalone `*.test.mjs` scripts". scripts/README.md:21 "all 14 `*.test.mjs` in
  parallel, ~17s". Reality: `git ls-files '*.test.mjs'` = **75**; floor is
  `MIN_TEST_FILES = 60` at check.mjs:69.
- screenshot-auth/SKILL.md "Authenticated Routes" (in the 59-73 window) names `/groups`,
  `/groups/[id]`, `/settings`, `/donate`, and public `/verify` "Magic link verify".
  ui-audit/SKILL.md Step 1 (14-22) names `/groups`, `/settings`, `/donate`.
- `src/app/(main)/` contains NO `groups` or `settings` directory (verified by ls). `/donate`
  exists but its page.tsx is only `redirect("/support")` with a comment saying the framing
  was dropped. So the lists send an agent to 404s/redirects as claimed.

## scripts-e2e-ci-08 — crawl.mjs missing five routes — CONFIRMED
- crawl.mjs:18 routes array, exactly 17 destinations: /feed, /directory, /letters,
  /catchups, /collection, /about, /support, /donate, /admin, /messages, /dark-mode, two
  profiles, /, /login, /signup, /lab.
- `src/app/(main)/` also holds `birds`, `notice`, `notifications`, `pick-bird`, `welcome` —
  none in the array. `/birds` IS in e2e/visual.spec.ts ROUTES (line 34: "50 avatar glyphs;
  catches a broken plumage path fast"), so only the other four are fully unwatched — exactly
  the report's nuance.

## scripts-e2e-ci-09 — 138MB untracked leftovers — CONFIRMED
- `du -sh`: `temporary screenshots/` **91M**, `e2e/.output` **40M**, `.claude/_disabled-gsd`
  **7.4M**. All three ignored (`git check-ignore -v`: .gitignore:63, :111, :86), none tracked.

## lib-tests-03 — the 2026-08-03 spelling-pin cohort — CONFIRMED-WITH-CORRECTION
- Birth commits (`git log --diff-filter=A`):
  - tour-provider.test.mjs → **1d7294b 2026-08-03** ✓ ("repositioned the verify mark, turned
    off the tour...").
  - landing-auth-ui.test.mjs → **a2279ff 2026-07-18** ✓ ("changed support icon").
  - verified-mark.test.mjs → **abb9381 2026-08-03** — same day but a DIFFERENT commit
    ("leaf verification from 'verified member' to 'verified'"), not 1d7294b as the report's
    lead sentence says. Correction of a detail; the cohort story stands.
- Content at HEAD, all as claimed: verified-mark second test (:14-21) pins
  `px-\[var\(--space-m\)\] py-\[var\(--space-xs\)\]`, `text-\[0\.6875rem\] leading-\[1\.25\]`,
  `className="translate-y-px"`. landing-auth-ui reads `../layout/sidebar.tsx`, pins
  `Tree as PhosphorTree` and the exact nav-row literal, header admits it "sat red for three
  weeks asserting a reverted decision". tour-provider pins
  `\[autoOffer, pathname, phase, userId\]` and `<TourContext.Provider value={{ start }}>`;
  src/lib/tour-auto-offer.test.mjs is 71 lines ✓.

## lib-tests-04 — tour-mobile-verify.test.mjs — CONFIRMED
- File is 33 lines, both tests grep the manual script's source. Copy pins present verbatim:
  `/Could not find "hoopoe tour" button; retrying\./` and `console\.error\('admin nav
  warning:'`. The four security pins present verbatim:
  `requireLoopbackBaseUrl\(process\.argv\[2\]`,
  `assertSameOriginAfterNavigation\(baseUrl, page\.url\(\)\)`,
  `await fetch(\`\${baseUrl}/api/dev-login\``, and
  `doesNotMatch(source, /page\.evaluate\(async \(email\)/)`.
- The script is manual: README:67 documents it, no npm script maps to it.

## lib-tests-07 — small hygiene batch — CONFIRMED-WITH-CORRECTION
- image-purge-rule.test.mjs: helper `const code = (src) => ...` at **line 25**; the two
  inline re-typings at exactly **:268 and :278** (identical regex, `const code =
  src.replace(...)` shadowing the helper). ✓ verbatim.
- catchups.test.mjs: :838 `const { readFileSync } = await import("node:fs");` and :839
  `const read = (p) => ...` while `readFileSync` is imported at the top (:19). ✓ for the
  redundant re-import. CORRECTION: there is no other `read` helper anywhere in the file
  (grep: :839 is the only `const read`), so "re-declares a local read although both exist at
  the top" is half wrong — only readFileSync is duplicated. The fix (use the top import) is
  unchanged.
- avatar.test.mjs: line 4's "No test runner is wired into this project" IS present and IS
  stale (check.mjs:157 findTests walks src/ + scripts/ for *.test.mjs), and the file uses no
  node:test (grep count 0) ✓. CORRECTION/part-refuted: the claimed self-inconsistent run
  instruction (`node --test ...` vs `node ...`) does NOT exist at HEAD — the file's only run
  instruction is line 2's `node src/lib/avatar.test.mjs`; there is no `--test` anywhere in
  the file. (Today's f7b9ada only added a 35-line parity block, not a header edit, so this
  was not fixed out from under the finder — it was mis-read.)

## dependency-diet-15 — xlsx is used but npm-abandoned — CONFIRMED
- import-roster.mjs:36 verbatim: `const XLSX = createRequire(import.meta.url)("xlsx");`
  with the CJS/ESM comment at :34-35 ("xlsx ships CJS-first; namespace-importing it under
  ESM yields a module object whose functions sit one level down. require() gets the real
  thing.").
- package.json:88 `"xlsx": "^0.18.5"` in **devDependencies** (not dependencies); installed
  node_modules/xlsx is 0.18.5. knip raw output line 135: `xlsx package.json:88:6` under
  unused devDependencies — so knip IS wrong and the refutation-of-knip is right.
- npm-audit-gate.mjs:64: `npm audit --omit=dev --json` — the gate genuinely never audits
  devDeps, so the advisory-blindness mechanism is real.
- The external facts (0.18.5 is SheetJS's last npm release; GHSA-4r6h-8v6p-xvw6 and
  GHSA-5pgg-2g8v-p4x9 fixed only in 0.19.3+/0.20.2+ off-npm) match my training knowledge and
  nothing in the repo contradicts them; not re-fetched (no-network rule), flagged as
  externally sourced but low-doubt.

## dependency-diet-16 — puppeteer Chrome download scope — CONFIRMED
- .puppeteerrc.cjs at HEAD is exactly `module.exports = { skipDownload: process.env.VERCEL
  === "1" };` — the skip fires ONLY on Vercel; every local install still downloads. The
  file's own header even says "Local installs keep downloading as before (the scripts point
  PUPPETEER_EXECUTABLE_PATH at real Chrome anyway)".
- 23 files under scripts/ + e2e/ import puppeteer (count matches). puppeteer ^24.40.0
  devDep. `~/.cache/puppeteer` currently holds **357MB** (chrome + chrome-headless-shell) —
  the waste is real and larger than the ~130MB-per-download figure implies.
- The behavioural half ("screenshots still work without the bundled browser") rests on
  CLAUDE.md gotcha 2 and cannot be run in this audit (no browsers); the finder priced that
  at medium confidence, and the checkable facts all hold.

## Summary of corrections a fix session must carry
1. lib-tests-03: verified-mark.test.mjs born in **abb9381**, not 1d7294b (same day).
2. lib-tests-07: drop the "node --test vs node" sub-claim (does not exist); catchups' local
   `read` is the file's only one — only the readFileSync re-import is redundant.
3. scripts-e2e-ci-06: phase7's loop is at :29-35, not :30-36 (cosmetic).
4. scripts-e2e-ci-01 (design note): a basename-matching ledger test would wrongly count
   demo/run-sql.mjs as listed via the dev table's `run-sql.mjs` row — match on path/section.
