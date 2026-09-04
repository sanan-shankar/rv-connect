# tooling-a — adversarial verification (refactor audit 2)

HEAD verified against: `72b5a1d` ("fix(viewer): the chrome stays under a resting cursor…").
Working tree clean except the untracked audit folder itself (`git status --short` → only
`?? docs/audit-fix/2026-09-03-refactor-audit-2/`). No other session's WIP touched my files.

Charter: `scripts/`, `e2e/`, `.github/`, the unit tests. Read-only throughout; no builds, no
tsc, no knip, no browser, no database, no script execution.

## The two gates my charter says to name

- **`scripts/qa/check.mjs:69` `MIN_TEST_FILES = 60`.** Today the suite is 102 files
  (`raw/check-baseline.txt`: "Unit tests 102/102 passing"). Nothing in my cluster deletes a
  test file, so the floor has 42 files of headroom and **bites none of these findings**.
  The sharper trap in the same gate is `findUnrunTests` (`check.mjs:73-87`): the gate FAILS
  if any `*.test.*`/`*.spec.*` file exists under `src/` or `scripts/` that is not named
  `*.test.mjs`. A fix session that parks a fixture as `foo.spec.mjs` reds the build.
- **`scripts/qa/ci-parity.test.mjs`.** Two pins matter here: (a) `check.yml`'s only `run:`
  steps may be `npm ci` and `npm run check` (`ALLOWED`, :56); (b) `check.mjs` must still
  contain the strings `scripts/qa/npm-audit-gate.mjs` and `scripts/qa/audit-status.mjs`
  (:82-90). Deleting the ALLOWLIST *entry* leaves both scripts in place, so ci-parity stays
  green. Deleting either *script* would fail it.
- **`scripts/qa/scripts-ledger.test.mjs`** enforces both directions (tracked script ⇒ README
  line; README name ⇒ file exists) and has its own floor `scripts.length >= 30` (:78).
  Today: 63 non-test tracked scripts, 69 including tests. Plenty of headroom.
- **`scripts/qa/hand-run-passes.test.mjs`** pins: a `-pick`/`-apply` pair; `const OUT =
  path.join("scripts","dev",".<name>")`; `database: envFile` in the picker; no
  `UPDATE|INSERT|DELETE` in the picker; `--apply`, `--undo`, `applied-` in the applier; a
  skill that exists, is in CLAUDE.md, and links the spec. It does **not** pin the argv
  helpers, `DEMO_REF`, the refusal sentence, `readJson`, or `rules:` in the manifest.

---

## collection-13 — the photograph picker does not carry its rules — CONFIRMED

- `scripts/dev/tag-photos-pick.mjs` manifest (lines 168-180) is exactly
  `{ database: envFile, taken, outstanding, photos }`. No `vocabulary`, no `rules`.
- `scripts/dev/tag-professions-pick.mjs:220-232` writes `vocabulary: PROFESSION_TAGS.map(…)`
  and `rules: TAG_RULES` with the docblock "The vocabulary and the rules travel WITH the
  batch rather than being looked up."
- `docs/spec/hand-run-passes.md:42-44`: "**Carries the vocabulary and the rules inside the
  manifest.**" `:144-145` (adding a third pass, item 2): "so the rules live where a test can
  hold them **and the picker can copy them into the manifest**."
- `.claude/skills/tag-photos/SKILL.md:83-85`: "The vocabulary and the rules are in
  `src/lib/photo-suggest.ts` — read `BUCKET_RULES` and `VALLEY_GLOSSARY` there". Confirmed
  verbatim.
- `hand-run-passes.test.mjs` read in full: no `rules:` assertion anywhere. Confirmed.
- Feasibility of step (1): `photo-suggest.ts:38` already does
  `import { BUCKET_VALUES, ERA_VALUES, bucketsOf } from "./collection.ts"` and
  `tag-photos-apply.mjs:39` already loads `photo-suggest.ts` under bare node, so
  `BUCKET_RULES`/`VALLEY_GLOSSARY`/`BUCKETS`/`ERA_VALUES` are reachable from the picker
  today. `collection.ts`'s only imports are two `import type` lines (erased by node's type
  stripping), so it loads. The proposal is executable as written.
- Step (3) overlaps fresh-code-04; see there for the correction.

## collection-17 / fresh-code-13 — the second stranded-originals sweep — CONFIRMED (they agree)

- `scripts/dev/sweep-stranded-originals.mjs` is 161 lines; header lines 32-36 read "RUN IT
  TWICE … After that second run this script has no live question to answer and should be
  deleted along with its line in scripts/README.md." Confirmed verbatim.
- `scripts/README.md:79` is the ledger row, and it says "**One-off, run it twice.**"
- `src/app/(main)/collection/actions.ts:434-435` is
  `/^(staging|collection)\/[a-z0-9]+\/\d{4}\/\d{2}\/[a-z0-9]+-o\.(jpg|jpeg|png|webp|gif)$/`,
  with the "Safe to narrow to `staging/` alone once nothing old is in flight" comment at
  :430-433 (collection-17 cited 417-435, fresh-code-13 cited 429-433 and 434-435; the latter
  is the accurate pair).
- The `:481` ternary `input.key.startsWith("staging/") ? "staging" : "collection"` exists
  only for the second root. Confirmed.
- The staging change is `04c90a2` (2026-08-28) "fix(uploads): a contribution's original
  stages outside the archive folder". Confirmed by `git log -1`.
- **The first run happened; the second has not been recorded.** `progress.md:2144` records
  the first sweep ("deleted the sixty … `collection/` went from 70 objects to 10") and
  `progress.md:2151-2153` says outright: "the sweep script has to be **run once more after
  this deploys** … after that it and its ledger line should be deleted." No later entry.
- Gate check I ran that both findings only guessed at: `src/lib/image-purge-rule.test.mjs:52`
  asserts `direct.includes("COLLECTION_ORIGINAL_KEY.test(input.key)")` — a *call-site* string,
  not the regex text, so narrowing the regex does not break it.
  `security-regressions.test.mjs` contains no `staging`/`COLLECTION_ORIGINAL_KEY` reference
  at all (only `assert.match(src, /function keyBelongsTo/)` at :77). `audit-status.mjs:650`
  tests `/keyBelongsTo/` in the finalize route, not in collection actions. So **no pin
  blocks the narrowing**; fresh-code-13's "grep them first" instruction is right and the
  answer is: nothing to update.
- **Whose steps are safer: fresh-code-13's.** It names the `:481` ternary explicitly and
  flags that the dry run reads the R2 bucket *and* the database ("ask first"). collection-17
  adds the useful decision rule (autonomous if the dry run finds 0; owner if it finds
  objects). Take fresh-code-13's mechanics with collection-17's decision rule.
- The one thing I cannot settle without credentials: whether the dry run returns 0 today.
  That is a live-infrastructure question, not a code question.

## data-layer-14 — index-coverage.test.mjs stale examples — CONFIRMED WITH CORRECTION

- The comment is at **`src/lib/index-coverage.test.mjs:98-100`**, not 95-97.
- `grep -n "@@unique" prisma/schema.prisma` returns 14 composite uniques, and neither
  `(provider, providerAccountId)` nor `(identifier, token)` is among them; `providerAccountId`
  does not appear in the schema at all. Ghost confirmed.
- `0399d37` "refactor(auth): remove the NextAuth adapter that never ran" exists, and
  `prisma/migrations-manual/2026-08-27-drop-nextauth-adapter-tables.sql` is on disk.
- **Correction to "what to do":** `(userId, position)` is *already* the third clause of the
  same comment (line 100), so the fix is to delete the two ghost examples, not to add
  `(userId, position)`. The other suggested replacement, `(day, source, metric)` on
  `MetricSnapshot` (`schema.prisma:1198`), is a **three-column** unique, and the loop's regex
  is `/@@unique\(\[(\w+),\s*(\w+)\]/` — it would capture `(day, source)`, which is not the
  pair the comment would be describing. Prefer just deleting the ghosts.

## dead-code-10 / dependency-diet-11 — knip false positives — CONFIRMED (they agree)

Both findings say the same thing; dependency-diet-11 is the fuller write-up and its option
(b) (`ignoreDependencies`) is the safer of the two remedies, because option (a) (un-ignoring
`src/generated/**`) re-introduces a gitignored 43-file tree into every knip run.

- `raw/knip-repo-config.txt:9-10` → "Unused dependencies (1) / @prisma/client
  package.json:40:6". `raw/knip-repo-config-production.txt:10-12` → 2, adding
  `prisma package.json:56:6`. Both line numbers check out: `@prisma/client` is
  `package.json:40`, `prisma` is `package.json:56`, both in `dependencies`.
- `grep -rIn "@prisma/client" src scripts prisma e2e | grep -v src/generated` → **zero hits**.
  Inside `src/generated`: **43 files**, of which **42** import
  `@prisma/client/runtime/client` and **1** imports `@prisma/client/runtime/index-browser`.
  Exactly as claimed. `src/generated/prisma/client.ts:18` is
  `import * as runtime from "@prisma/client/runtime/client"`.
- `.gitignore:33` is `/src/generated/prisma`. `scripts/qa/knip.jsonc`'s last line is
  `"ignore": [".claude/**", "docs/**", "src/generated/**"]`. So knip cannot see the importer.
- `prisma/schema.prisma:1-4` is `generator client { provider = "prisma-client"; output =
  "../src/generated/prisma" }`; `package.json:11` is `"postinstall": "prisma generate"`.
  Both halves of the `prisma`-CLI explanation confirmed.
- Configuration hints (2) confirmed verbatim at the tail of `raw/knip-repo-config.txt`:
  `src/generated/**` "Remove from ignore", `prisma.config.ts` "Remove redundant entry pattern".
- Claim (4), `photo-suggest.ts`: appears only in the **production** run's unused-files list
  (8th entry). `scripts/dev/tag-photos-apply.mjs:39` imports it. Confirmed not dead.
- Claim (5), madge orphans: `raw/madge-orphans-filtered.txt` lists `forbidden.tsx`,
  `instrumentation.ts`, `proxy.ts`, `generated/prisma/browser.ts` (plus the three real dead
  files and `photo-suggest.ts`). Confirmed as framework conventions per brief §5c.
- **Extension dead-code-10 missed.** `docs/OPERATIONS.md:335` is not the only stale number in
  §8. The section also says "the unit gate discovers its **74** test files by glob" (:326 —
  it is 102 today), "reported **131 unused files**, 75 of them tests" (still true of a
  config-less run), and "The export list (**~58**)" (:339 — knip reports 70 today). The
  "list is now **5**" sentence (:335) is wrong by two (7 today). Fix all four numbers in the
  same edit, not just the one.

## dependency-diet-03 — the npm-audit-gate allowlist entry is dead — CONFIRMED WITH CORRECTION

The core claim holds, and I could reproduce every step of it:

- `scripts/qa/npm-audit-gate.mjs:23-32` is the `ALLOWLIST` with its single
  `GHSA-ggr8-5vv4-36mx` entry and `clearsWhen: "prisma ships a 7.x release that bumps
  deepmerge-ts to >=8"`.
- `package.json:27` is `"deepmerge-ts": "^8.0.2"` inside `overrides`. `b4411f1` (2026-08-27,
  "chore(deps): close the two Dependabot highs without downgrading Prisma") added it —
  `git show b4411f1 -- package.json` contains `+ "deepmerge-ts": "^8.0.2"`.
- `package-lock.json` has exactly **one** `deepmerge-ts` node, `node_modules/deepmerge-ts @
  8.0.2`, while `node_modules/@prisma/config @ 7.10.0` still declares `"deepmerge-ts":
  "7.1.5"`. The override is doing the forcing.
- `check.mjs:207-215` does append `, N allowlisted`, and `raw/check-baseline.txt:11` reads
  `ok   Dependency advisories    clean` with no count. The entry fires zero times at HEAD.
- `ci-parity.test.mjs:82-90` requires only that `check.mjs` still *names*
  `npm-audit-gate.mjs`; removing an ALLOWLIST entry does not touch that.

Two corrections, one of which is load-bearing:

1. **`scripts/qa/phase9-probe.mjs:39` hard-codes the advisory id** and the finding does not
   mention it:
   `L.check("  ...and names the allowlisted advisory out loud", /GHSA-ggr8-5vv4-36mx/.test(live.out));`
   The gate only prints that id from `npm-audit-gate.mjs:100`
   (`console.log(\`  allowed  ${id} …\`)`), which no longer runs — so **this probe check is
   already failing today**, before any fix. The fix session must delete or invert that line
   in the same commit. phase9 is a hand-run probe, not part of `npm run check`, so it will
   not red the gate; it will just lie the next time someone runs it.
2. **The "one fewer accepted advisory on the security status board" saving does not exist.**
   `scripts/qa/audit-status.mjs` contains no `ALLOWLIST` reference; its H16 probe (:276-288)
   only checks that `check.yml` runs `npm run check` and that `check.mjs` names
   `npm-audit-gate.mjs` and `audit-status.mjs`. The board's "74 tracked, none open at high"
   is unaffected either way. The finding's own gate note ("audit-status.mjs mentions the
   allowlist and may count it") is wrong; it does not.
3. Minor: "three tests that read `Object.keys(ALLOWLIST)[0]`" — two do
   (`npm-audit-gate.test.mjs:35` and `:42`); the third (`:86`) iterates
   `Object.entries(ALLOWLIST)` and passes vacuously on an empty object, exactly as the
   finding later says.
4. The audit-1 counter-quote is real and correctly contextualised:
   `docs/audit-fix/2026-08-25-refactor-audit-1/fix-prompt.md:281` says "**Do not retry this,
   and do not delete the allowlist entry**", but the paragraph is about the
   prisma→devDependencies move, and it explicitly reasons that the move would not clear the
   advisory. The override, five weeks later, did. New evidence, correctly flagged.

## dependency-diet-09 — cuid2 still parked — CONFIRMED WITH CORRECTION (counts and MB are both off)

The *state* report is right — nothing has changed since audit 1, and the finding's
recommendation is "leave it parked". But three numbers are wrong:

- **Call sites in `src`: 10, not 8.** `grep -rno "createId()" src | grep -v generated` → 10,
  across 7 files (upload/route 1, finalize 1, presign 1, collection/actions 3, support/actions
  1, settings/actions 1, collection-intake 2). Ironically the finding's own "Where" list
  enumerates all 10 line numbers; only the "8" in the prose is wrong.
- **Call sites in `scripts`: 17, not 9**, across 7 files (`phase5/6/7/8/10-probe.mjs`,
  `dev/import-album.mjs`, `dev/seed-curated-content.ts`). So a swap touches **27 call sites in
  14 files**, not 17 in 10.
- **Size: ~1.3 MB on disk, not 2.2 MB.** `du -sk`: `@paralleldrive/cuid2` 928 KB (which
  already contains its nested `@noble/hashes@2.0.1`, 868 KB of it), `bignumber.js` 368 KB,
  `error-causes` 52 KB → 1,348 KB. Apparent size is lower still (~1.1 MB). The **4 packages**
  count is right, and `bignumber.js`/`error-causes` are indeed cuid2-only dependants
  (checked the lockfile's reverse-dependency map); `@noble/hashes` is shared with
  `@noble/curves` and `eciesjs` at a *different* major, so the nested copy really would go.
- The behavioural constraint is intact: `src/app/(main)/support/actions.ts:83` is
  `const receipt = createId();` and `:101` carries the comment "Razorpay caps receipt at 40
  characters; a cuid2 is 24." A 36-char UUID is inside the cap. Confirmed.

The recommendation ("leave it parked") is unaffected by the corrections — if anything the
smaller MB figure strengthens it.

## directory-profile-19 / fresh-code-05 — the dev-script preamble — CONFIRMED (they agree)

Both describe the same duplication from different ends; they do not contradict each other.

- `grep -rln 'const value = (name, fallback) => {' scripts` → **6 files**: `tag-photos-pick`,
  `tag-photos-apply`, `tag-professions-pick`, `tag-professions-apply`, `import-album`,
  `backfill-image-dimensions`. Matches fresh-code-05 exactly.
- `grep -rn 'cbvlzptghkuxhygyaezq' scripts` → **8 files**: `dev/run-sql.mjs:52`,
  `dev/backfill-image-dimensions.mjs:51`, `dev/sweep-stranded-originals.mjs:56`,
  `dev/tag-photos-apply.mjs:59`, `dev/tag-photos-pick.mjs:63`,
  `dev/tag-professions-apply.mjs:65`, `dev/tag-professions-pick.mjs:71`, and
  `demo/apply-schema.mjs:25` (as `EXPECTED_REF`). directory-profile-19's "eight copies" and
  fresh-code-05's "7 files with `const DEMO_REF =`" are both right, counted differently.
- `scripts/dev/_env.mjs` exports only `readEnv`/`loadEnv`; its banner (:19-23) is
  "Deliberately NOT a shared database opener as well … a shared opener with a default
  connection string is the same convenience that scripts/demo/* keeps a wall against."
  Confirmed verbatim.
- Line-number corrections: in `tag-professions-pick.mjs` the argv helpers are at **:40-45**
  (directory-profile-19 says 34-41) and the env/URL/DEMO_REF/pg block at **:61-77**
  (it says 60-78). fresh-code-05's ranges (`:40-75`) are the closer ones.
- **Whose steps are safer: directory-profile-19's.** It proposes sharing only three things —
  `DEMO_REF`, a `refuseUnlessDemo(envFile, url)` guard, and `argv()` — and explicitly keeps
  each script's own *reason* comment and its own `pg.Client` line. fresh-code-05's
  `connectionFor(envFile)` returns `{ env, url }`, which is one step closer to the shared
  opener `_env.mjs`'s banner refuses to become; it is defensible (no default connection
  string) but it is the one that needs an argument made in front of the owner. Take
  directory-profile-19's decomposition, fresh-code-05's file list.
- Neither breaks `hand-run-passes.test.mjs`: the pinned strings (`OUT = path.join("scripts",
  "dev", ".<name>")`, `database: envFile`, `--apply`, `--undo`, `applied-`) all live outside
  the preamble. Verified by reading the test in full.

## directory-profile-20 — import-places' root folder + merge-cities' dead const — CONFIRMED WITH CORRECTION

- `scripts/dev/import-places.mjs:32` is `const TMP_DIR = resolve(process.cwd(),
  ".geonames-tmp");` with `ZIP_PATH`/`CITIES_TXT_PATH`/`ADMIN1_PATH` under it at :33-35.
  (Finding says :30-34; it is **:32-35**.)
- `.gitignore:24` is `.geonames-tmp/`, preceded by its two-line comment at :22-23. **The fix
  must delete lines 22-24, not just 24.**
- `.gitignore:114` is `scripts/dev/.*/`, so a relocated `scripts/dev/.geonames` is already
  ignored with no new line. Confirmed — this is the part that makes the fix free.
- `scripts/dev/merge-cities.ts:22` is
  `const CANONICAL_PLACE_ID = null as number | null; // resolved below by lookup`, and
  `raw/tsc-unused.txt` line 1 is exactly
  `scripts/dev/merge-cities.ts(22,7): error TS6133: 'CANONICAL_PLACE_ID' is declared but its
  value is never read.` The canonical row is looked up by name at :32-38. The header's "edit
  VARIANTS/CANONICAL_PLACE_ID below per merge" is at :10-11. All confirmed.
- `scripts-ledger.test.mjs` names scripts, not folders — confirmed by reading it; moving
  `TMP_DIR` cannot fail it.

## directory-profile-26 (script sub-claim only) — TAP_MIN_PX redefined — CONFIRMED

Only the `scripts/qa/map-cluster-verify.mjs` half is mine; the rest of the batch belongs to
the directory/profile verifier.

- `src/lib/map-cluster.ts:66` is `export const TAP_MIN_PX = 44;` and knip lists it under
  unused exports (`raw/knip-repo-config.txt`: `TAP_MIN_PX  src/lib/map-cluster.ts:66:14`).
- `scripts/qa/map-cluster-verify.mjs:40` is `const TAP_MIN_PX = 44;`, used at :241, :245 and
  :251. The script that should import it redefines it. Confirmed exactly as claimed.
- Feasibility: `src/lib/map-cluster.ts` has **no imports at all**, so bare node can load it
  by relative `.ts` path the way `tag-professions-pick.mjs:38` loads `profession-tags.ts`.
  The proposed fix works.
- Caveat for the fixer: `map-cluster-verify.mjs` is a puppeteer script CLAUDE.md's tooling
  rules discourage; if the scripts lens deletes it, this dedupe is moot.

## duplication-04 — finish adopting the QA kit — CONFIRMED WITH CORRECTION

Everything checkable is right except the file list under the browser-launch half.

- **The inline preamble: exactly 14 files.** `grep -rn "process.chdir" scripts`, minus
  `_probe-kit.mjs:33` and `check.mjs:32`, gives precisely the 14 the finding names:
  `qa/{drive,crawl,hoopoe-landing-check,hover-probe,map-cluster-verify,screenshot,
  screenshot-auth,verify-shot,theme-shots,tour-mobile-verify,phase9-probe}.mjs` and
  `dev/{import-roster,centroid,shot-clip}.mjs`. No more, no fewer.
- **`phase9-probe.mjs` really does both**: `import { makeLedger } from "./_probe-kit.mjs"`
  at :20 and its own `process.chdir(repoRoot)` at :23.
- **`phase3-probe.mjs`: clone 24 confirmed at the line.** `:25` is
  `import { bootstrap, openDb } from "./_probe-kit.mjs";`, `:29` calls `bootstrap`, and
  `:38-48` is a hand-written `let pass/let fail/function check` identical to
  `makeLedger()`'s. `hoopoe-idle-check.mjs:37-41` and `hoopoe-landing-check.mjs:30-34` carry
  the `PASS/FAIL` variant. All three ranges are accurate.
- **CORRECTION — the 18 puppeteer-launch files are the wrong 18.** The count is right by
  coincidence. `grep -rln "Google Chrome.app/Contents/MacOS/Google Chrome" scripts` (minus
  README) → 18 files, but the **six phase probes are not among them**: they get the path from
  `bootstrap(…, { chrome: true })`, which sets `PUPPETEER_EXECUTABLE_PATH` at
  `_probe-kit.mjs:34`. The real carriers of the literal are
  `dev/apple-edge/compare.mjs`, `dev/apple-edge/look.mjs`, `dev/centroid.mjs`,
  `dev/shot-clip.mjs`, `dev/shot-svg.mjs`, `qa/_dir-chrome-probe.mjs`,
  `qa/_dir-room-shots.mjs`, `qa/_probe-kit.mjs`, `qa/drive.mjs`, `qa/hoopoe-idle-check.mjs`,
  `qa/hoopoe-landing-check.mjs`, `qa/hoopoe-zoom-probe.mjs`, `qa/hover-probe.mjs`,
  `qa/map-cluster-verify.mjs`, `qa/screenshot-auth.mjs`, `qa/screenshot.mjs`,
  `qa/theme-shots.mjs`, `qa/tour-mobile-verify.mjs`. Note `screenshot.mjs` uses a
  *candidates array* rather than the `||` one-liner, so it is a near-clone, not an exact one.
  The finding's list adds the six phase probes (already converted) and omits
  `compare.mjs`, `shot-clip.mjs`, `shot-svg.mjs`, `_dir-chrome-probe.mjs`, `screenshot.mjs`.
- **The sign-up drive is real**, at `phase4-probe.mjs:243-266`, `phase8-probe.mjs:313-336`
  and `phase10-probe.mjs:90-110` — same trivia gate (`banyan`/`cauvery` off a
  `/tree|house/i` test of `p.font-heading`), same `Batch of \d{4}` lookup, same six typed
  fields. phase10 also ticks consent; phase8's whole point is the untouched box.
- **The numbered-shot clone is real**, with corrected ranges: `screenshot.mjs:17-26`
  (finding said 14-22), `screenshot-auth.mjs:30-40` (said 27-35),
  `tour-mobile-verify.mjs:23-27` (exact). The `networkidle2` fallback goto is at
  `screenshot.mjs:54-60` (exact) and the `ADMIN_EMAIL` guard at `screenshot-auth.mjs:21-25`
  and `tour-mobile-verify.mjs:17-21` (both exact).
- **The `tour-mobile-verify.test.mjs` warning is exactly right.** Its four assertions are at
  `:22-25` and pin literal source text: `requireLoopbackBaseUrl(process.argv[2]`,
  `assertSameOriginAfterNavigation(baseUrl, page.url())`, the
  ``await fetch(`${baseUrl}/api/dev-login``` template, and the ABSENCE of
  `page.evaluate(async (email)`. Any refactor of that file must keep all four strings.

## duplication-05 — audit-status.mjs's own fnBody — CONFIRMED WITH CORRECTION

- `scripts/qa/audit-status.mjs:85-116` is `function fnBody(text, name)`; the algorithm
  (balance parens, step over a `:` return annotation by angle depth, then balance braces) is
  character-for-character the same shape as `balancedBody`. 9 call sites in audit-status
  (:130, :186, :193, :203, :371, :408, :418, :479, :501).
- **CORRECTION 1: `balancedBody` is at `src/lib/test-fn-body.mjs:33`, not :22** (:1-32 is the
  docblock). The finding's "vs `test-fn-body.mjs:22-73`" is the docblock+function span.
- **CORRECTION 2, and this one would break the fix: the signature is
  `balancedBody(text, decl)` where `decl` is a *string or RegExp*, NOT an index.** The
  finding says "check the signature first (`balancedBody(text, at)`, :38)" and then proposes
  `return balancedBody(text, m.index)`. Passing a number falls to
  `text.match(decl)` — which coerces the number to a regex of its digits and silently matches
  somewhere else entirely. The good news is that `balancedBody` accepts a RegExp directly, so
  the adapter should pass audit-status's two-form regex object, not `m.index`, and the whole
  `fnBody` reduces to a two-line `decl` builder plus one call.
- Audit-1's dup-03 prescription is real and half-done: `src/lib/test-kit.mjs:29` re-exports
  `balancedBody`; the only importers of `test-fn-body.mjs` today are `test-kit.mjs`,
  `src/lib/composer-rule.test.mjs:3` and `scripts/qa/knip.jsonc:25`. audit-status is not
  among them. Confirmed.
- Gate note is right: `check.mjs` runs `audit-status.mjs`, and the board currently prints
  "74 tracked, none open at high" (`raw/check-baseline.txt`), which must be identical after.

## duplication-19 — hand-run family: protocol vs copy — CONFIRMED

- Every "REQUIRED" item in the finding is a real assertion in
  `scripts/qa/hand-run-passes.test.mjs` (read in full): the `-pick`/`-apply` pair; the
  `OUT` regex `/"scripts",\s*"dev",\s*"\.[a-z-]+"/`; `/database:\s*envFile/`;
  `assert.doesNotMatch(pick, /\b(UPDATE|INSERT|DELETE)\s/i)`; `--apply`, `--undo`,
  `applied-`; the skill's existence, its CLAUDE.md row, and its link to the spec.
- Every "MERELY COPIED" item is genuinely unpinned: no assertion mentions the argv helper,
  the env/URL/`DEMO_REF` block, `pg.Client`, `readJson`, `writeRow` or the undo branch.
- **The drift is exactly where claimed.** `scripts/dev/tag-photos-apply.mjs:230` writes
  `{ database: envFile, applied: new Date().toISOString(), changes }`;
  `scripts/dev/tag-professions-apply.mjs:242` writes
  `{ database: envFile, at: new Date().toISOString(), changes }`. One key apart, both at the
  cited lines.
- The `applied-` pin is on the undo-log *filename*, not this key, so renaming `at:` →
  `applied:` cannot fail the test. Safe.
- The aside about `import-album.mjs` not being a pass is right: it has no `-pick.mjs`, and
  `PASSES` is built by `readdirSync(DEV).filter(f => f.endsWith("-pick.mjs"))`, so the test
  never sees it.

## fresh-code-04 — three copies because collection-photo.ts imports through `@/` — CONFIRMED WITH CORRECTION (and there is a FOURTH copy)

- `src/lib/collection-photo.ts:19-23` are five alias imports: `@/lib/image`,
  `@/lib/collection`, `@/lib/exif-date`, `@/lib/utils`, `@/lib/validators`. Confirmed.
- `scripts/dev/import-album.mjs:98-100` is `/** The grid thumbnail. THE SECOND COPY of a
  recipe that belongs to src/lib/collection-photo.ts (THUMB_PX, gridThumb) … */ const THUMB =
  { px: 480, quality: 72 };`, used at **:378-382** (finding said 379-382).
- `import-album.mjs:220-239` is the `exifBlockOf` docblock + function, whose comment reads
  "THE SAME TWO SOURCES `exifBlockOf` IN collection-photo.ts READS, and the second copy exists
  … because that function sits beside code importing through the `@/lib` alias".
- `src/lib/exif-date.test.mjs:173-177` says `dateOnlyExif` "cannot be imported here: it lives
  in collection-photo.ts, which imports through the `@/lib` alias that a plain .test.mjs
  cannot resolve. So the SHAPE is pinned instead."
- `THUMB_PX` is on knip's unused-exports list (`src/lib/collection-photo.ts:26:14`).
- **A fourth copy the finding missed:** `scripts/demo/add-photos.mjs:36` is
  `const THUMB_PX = 480;` and `:163` repeats
  `.resize(THUMB_PX, THUMB_PX, { fit: "inside", withoutEnlargement: true })`. So the
  thumbnail recipe exists in **three** places outside `collection-photo.ts`, not one. Note
  that `scripts/demo/` keeps a deliberate wall against importing from `scripts/dev` and from
  app code (see `_env.mjs`'s banner and the demo spec) — the fixer should decide, not assume,
  whether the demo copy is meant to stay.
- **Correction to the plan:** the proposed `src/lib/collection-image.ts` cannot import "only
  `./image.ts` and `./exif-date.ts`". `dateOnlyExif` (`collection-photo.ts:189-194`) calls
  `valleyYear()` from `@/lib/utils`, and `exifDate(…, valleyYear())` is used at :138 too.
  `src/lib/utils.ts` imports only `clsx` and `tailwind-merge` (both resolvable from
  node_modules), so `./utils.ts` is a safe third relative import — or pass the year in as a
  parameter. Either way the finding's import list is one short.
- `src/lib/image.ts` imports `./upload-shared.ts` (extension present) and
  `src/lib/exif-date.ts` imports `./collection.ts` (extension present), so both are already
  bare-node-loadable. The plan is otherwise executable.

## fresh-code-12 — drive.mjs's four one-off scenarios — CONFIRMED WITH CORRECTION

- `scripts/qa/drive.mjs` is 727 lines. `const SCENARIOS = {` at :91, then
  `async dateField({ page, shot })` :107, `async wells` :243, `async confirmDelete` :295,
  `async focusStates` :357, followed by the keepers `slide` :460, `create` :519,
  `profile` :549, `houses` :571, `places` :621, `poll` :643. Every scenario the finding names
  exists at the line it names.
- All four claimed pins exist: `src/lib/collection-date.test.mjs:269` literally reads
  "THE DAY THE ARCHIVE ATE FIFTEEN YEARS"; `src/components/ui/focus-recipe.test.mjs`,
  `src/components/common/attach-well.test.mjs` and
  `src/components/common/confirm-dialog.test.mjs` are all on disk.
- `drive.mjs:120` is `await input.uploadFile("./e2e/.shots/date-probe.jpg");`. The file
  exists locally (6,681 bytes, 2026-08-30) but `/e2e/.shots/` is gitignored at
  **`.gitignore:40`** (finding said 41), so `dateField` genuinely cannot run from a fresh
  clone. Confirmed.
- Nothing pins the scenario names: `grep` across `*.test.mjs` and `e2e/*.ts` for
  `dateField|focusStates|confirmDelete` returns nothing, and `scripts/README.md:118`
  describes `drive.mjs` generically ("Authenticated interaction harness … Generic."), so
  `scripts-ledger.test.mjs` is unaffected by deleting scenarios.
- **Correction to the saving:** the four scenarios span roughly :93-459 including their
  docblocks — about **365 lines**, not ~300. (Body-only, excluding docblocks, is ~330.)
  The saving is larger than claimed.
- The "medium confidence" caveat about keeping `wells` is a taste call for the owner; I do
  not adjudicate it.

## Cross-finding overlaps, summarised

| Pair | Agree? | Take which |
|---|---|---|
| collection-17 ↔ fresh-code-13 (sweep script) | yes | fresh-code-13's mechanics (`:481` ternary, "ask before the dry run"), collection-17's decision rule (autonomous if 0, owner if >0) |
| dead-code-10 ↔ dependency-diet-11 (knip) | yes | dependency-diet-11's option (b) `ignoreDependencies`; add dead-code-10's OPERATIONS.md edit, extended to all four stale numbers |
| directory-profile-19 ↔ fresh-code-05 (script preamble) | yes | directory-profile-19's decomposition (guard, not opener), fresh-code-05's file list |
| collection-13(3) ↔ fresh-code-04 | yes | fresh-code-04's plan, corrected to include `./utils.ts` |
| dependency-diet-03 ↔ phase9-probe | finding is silent | must also fix `phase9-probe.mjs:39` |

## Things I could not settle from the tree

- Whether `node scripts/dev/sweep-stranded-originals.mjs` returns 0 today. Needs R2
  credentials and the live database; it is the one live check both collection-17 and
  fresh-code-13 correctly gate on.
