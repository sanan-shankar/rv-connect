# lib-tests - simplification audit report

Territory reader for the unit-test suite: the 75 `*.test.mjs` files the `npm run check` tests
gate discovers (72 under `src/`, 3 under `scripts/qa/`), plus the runner `scripts/qa/check.mjs`
and the shared extractor `src/lib/test-fn-body.mjs`. 11,093 lines total (`wc -l`). The owner's
explicit ask: "stricter rules about which test scripts we keep" - he is tired of deleting
leftovers. Date: 2026-08-25. Files in territory: 77; read fully: 77.

## Coverage

- Read fully: every file in `git ls-files src scripts | grep 'test\.mjs$'` (75 files),
  `scripts/qa/check.mjs`, `src/lib/test-fn-body.mjs`. Also read for context:
  `.claude/skills/check/SKILL.md`, `docs/planning/audits/fix-ledger.md` (grep for test pins),
  `progress.md` lines 4020-4240 (the C-188/C-189/C-190/C-195/C-196/C-197 session),
  `raw/jscpd-tests.txt`, `raw/knip.txt`.
- Skimmed: none.
- Not read: the source files under test (neighbouring territories); `e2e/` (scripts-e2e-ci).
- Uncommitted edits seen: at charter time `git status` showed another session's WIP touching
  `src/components/tour/manual-tour-entry.test.mjs` (plus next.config.ts, src/lib/admin.ts,
  scripts/qa/phase7-probe.mjs, a new forbidden.tsx). By the time I read the tree that work had
  been committed (HEAD c74d99f "a non-admin who asks for /admin is told 'nice try'"); `git
  status --short` now shows only this audit's own files. I judged HEAD throughout.

## Summary

This territory is in far better shape than the owner's complaint suggests, because it was
mutation-tested seventeen hours ago: the 2026-08-25 close-out reverted fixes and watched gates
fail, found "roughly one in eight" vacuous, and fixed the vacuity mechanisms themselves (C-188
truncated slices, C-189 grep-misses, C-190 crashed-tool-reads-clean, C-195 shrunken-suite,
C-196 drifted mirror, C-197 spelling-bound negatives). 55 of 75 files name the audit finding
they pin in their header; 30 carry explicit anti-vacuity counters ("only N found; the sweep has
drifted"). The rule-test pattern (read source as text, assert shape) is *deliberate and
documented* in nearly every file: the unit gate runs bare `node` with no resolver, no DB and no
browser, so server actions, `.tsx` and Prisma-importing modules genuinely cannot be imported.
That pattern is a not-finding.

What IS here: (1) the biggest win is a shared test-kit module - the same six helpers are
copy-pasted across the suite (39 files re-type the ROOT/read preamble, 33 carry one of two
*divergent* `decomment` variants, 12 hand-roll slice-to-next-export extraction, 6 define
`walk()`, 3 define a surrogate detector, and `gate-coverage` contains a verbatim 28-line copy of
`balancedBody` while only ONE file imports the shared extractor built for exactly this); ~290
net lines and, more importantly, the end of variant drift. (2) A small cohort of 2026-08-03
spelling-pin tests (Tailwind class strings, icon import spellings) that are exactly the "scratch
test committed instead of deleted" shape the owner is asking a rule for. (3) The rule itself,
proposed in full below with a ~25-line gate that enforces it. Structural vs cheap: the kit and
the knip entry are structural; everything else is cheap. Estimated honest savings: ~350 lines.

## Findings

### lib-tests-01 - Extract the six copy-pasted test helpers into one shared test kit
- **Where**: all 75 test files' preambles; concretely:
  - ROOT/read boilerplate (`resolve(dirname(fileURLToPath(import.meta.url)), "../..")` + a
    `read` lambda): 39 files (e.g. `src/lib/catchup-lifecycle.test.mjs:19-22`,
    `src/lib/purge-rule.test.mjs:22-25`, `src/lib/admin-rule.test.mjs:22-25`, ...).
  - `decomment` strong variant `(^|[^:"'`\\])\/\/` - 21 byte-identical copies (verified by
    `grep -A1 | sort | uniq`): admin-guard-rule, admin-rule, catchup-lifecycle, catchups,
    composer-rule, contribution-state, db-pool-rule, draft-rule, email-normalization-rule,
    gate-coverage, keyset, mail-queue-rule, notification-reach, people-search-rule,
    presence-rule, purge-rule, post-visibility-rule, security-regressions, session-revocation,
    upload-size-rule, verify-outcome-rule.
  - `decomment` WEAK variant `(^|[^:])\/\/` named `code`/`strip` - 12 more files:
    auth-flow-rule, directory-rule, feed-write-rule, image-purge-rule (three times inside one
    file, lines 25, 268, 278), login-attempt-rule, profile-editor-rule, place-input:202,
    rich-truncate:93, unattended-rule, valley-day:170, threads-rule, and inline in
    notification-links/security-regressions. The weak variant does not protect `//` after a
    quote character, so the two variants can disagree about the same source line.
  - slice-to-next-`export` function extraction, hand-rolled: 12 files (admin-rule,
    auth-flow-rule, catchup-lifecycle, directory-rule, draft-rule, group-succession,
    feed-write-rule, notification-reach, unattended-rule, post-visibility-rule:387-392,
    threads-rule, security-regressions), each with its own local convention and its own
    anti-vacuity check (or none).
  - `walk()` directory recursion: 6 files, 9 copies (gate-coverage x2,
    email-normalization-rule, image-purge-rule, notification-links x2, place-input,
    valley-day x2).
  - lone-surrogate detector: 3 copies (rich-truncate:47-51, text-shape:125-137,
    threads-rule:30-34).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/jscpd-tests.txt`: 12 clones, 291 duplicated lines (2.77%), and every one
  of the 12 is this preamble block (admin-guard-rule 1:1-26:6 vs mail-queue-rule,
  presence-rule, purge-rule, verify-outcome-rule, catchup-lifecycle, notification-reach,
  gate-coverage, security-regressions, directory-rule vs login-attempt-rule /
  profile-editor-rule / threads-rule, notification-reach vs people-search-rule). The two
  decomment variants are proven by grep (21 vs 12 files, outputs above). `test-fn-body.mjs`'s
  own header documents the two ways local extractors "have shipped here" and gone wrong, yet
  only `composer-rule.test.mjs` imports it.
- **What to do**: create `src/lib/test-kit.mjs` beside `test-fn-body.mjs` - plain `.mjs`, only
  `node:` imports, NOT named `*.test.mjs` (same constraints test-fn-body.mjs already documents
  at its header, lines 25-27). Export:
  `ROOT` (computed from `import.meta.url` of the CALLING file cannot work in a shared module,
  so export `repoRoot(importMetaUrl)` and `readFrom(importMetaUrl)` or simply a fixed
  `ROOT`/`read(p)` pair computed from the kit's own location - the kit lives at a fixed depth);
  `decomment(src)` (the STRONG variant, one spelling); re-export `balancedBody` from
  `./test-fn-body.mjs`; `section(src, decl)` = the slice-to-next-top-level-`export` extractor
  with the anti-vacuity assertion built in (throw if the slice is under ~5 lines, the guard
  auth-flow-rule:39 and composer-rule:47-48 each hand-wrote); `walk(dir, {skip})`;
  `hasLoneSurrogate(s)`. Then convert files mechanically, one commit: replace each local
  preamble/helper with one import line. Files whose local helper has extra behaviour
  (image-purge-rule's `blockAt` with its `bodyBrace` flag) keep it, or the kit's `balancedBody`
  absorbs it (it already skips return-type annotations). Do NOT touch `check.mjs`'s own
  `findTests`/`findUnrunTests` - the gate should stay self-contained.
- **Saving**: ~380 duplicated lines removed, ~90-line kit added: **~290 lines net**, and one
  `decomment` instead of two that can disagree.
- **Risk & gate**: low; `npm run check` (all 75 files execute; any conversion mistake fails the
  suite loudly). The kit must keep zero non-`node:` imports or every test breaks at once -
  which is itself the proof.
- **Confidence**: high. The one thing that would change my mind: if the owner values each test
  file being fully self-contained (copy-paste-runnable) above dedupe - but composer-rule
  already imports the shared extractor, so the precedent exists.
- **Notes**: the C-188 fix's progress.md entry says the extractor "now lives in
  src/lib/test-fn-body.mjs ... and both files use it", but only composer-rule imports it;
  gate-coverage carries a verbatim copy instead (see lib-tests-02). Doing 01 and 02 together
  makes that session's own claim true. Phase 2 of this finding (optional, same kit): migrate
  the 12 slice-to-next-export files to `section()` so every extraction carries the built-in
  anti-vacuity assert - about half currently have one hand-written, half have none (the ones
  with none only run positive assertions, so a lost slice fails loud rather than passing
  quietly; still, uniformity is the point of the kit).

### lib-tests-02 - gate-coverage.test.mjs duplicates balancedBody verbatim; import it instead
- **Where**: `src/lib/gate-coverage.test.mjs:62-94` (`fnBody`, with the comment "the
  audit-status version verbatim"); `src/lib/test-fn-body.mjs:33-73` is the same algorithm,
  exported, with the failure modes documented.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: side-by-side the two are the same brace/paren/angle-bracket walk; the only
  difference is fnBody anchors on `export async function ${name}` itself (which
  `balancedBody(text, \`export async function ${name}\`)` reproduces exactly, since
  balancedBody takes the declaration string).
- **What to do**: `import { balancedBody } from "./test-fn-body.mjs";` and replace the fnBody
  body with `const fnBody = (text, name) => balancedBody(text, new RegExp(String.raw`export\s+async\s+function\s+${name}\b`));`
  (balancedBody already accepts a RegExp). Delete lines 62-94.
- **Saving**: ~28 lines, and one algorithm instead of two that must be fixed twice.
- **Risk & gate**: low; `npm run check` - gate-coverage is itself a blocking security sweep
  (H17/C-194/B-024 pins), so its own pass/fail is the proof. Run once before and after and
  diff the reported test names.
- **Confidence**: high.
- **Notes**: subsumed by lib-tests-01 if that lands first; listed separately because it is a
  five-minute standalone fix and it closes the gap between what the C-188 progress entry
  claims and what the tree does.

### lib-tests-03 - The 2026-08-03 spelling-pin component tests: trim to the decision, drop the styling
- **Where**:
  - `src/components/common/verified-mark.test.mjs:14-21` (second test): pins exact Tailwind
    spellings - `px-[var(--space-m)] py-[var(--space-xs)]`, `text-[0.6875rem] leading-[1.25]`,
    `className="translate-y-px"`.
  - `src/components/landing/landing-auth-ui.test.mjs` (whole file, 23 lines): pins the
    sidebar Support icon's import spelling `Tree as PhosphorTree` and the exact nav-row
    literal. Its own header admits it "sat red for three weeks asserting a reverted decision".
    Also misnamed: it tests `../layout/sidebar.tsx`, not landing auth UI.
  - `src/components/tour/tour-provider.test.mjs` (whole file, 23 lines): pins exact source
    spellings of the provider's wiring (`\[autoOffer, pathname, phase, userId\]`,
    `<TourContext.Provider value={{ start }}>`) - every legitimate refactor of the file breaks
    it, and the behaviour it cares about is already properly tested in
    `src/lib/tour-auto-offer.test.mjs` (71 behavioural lines against the imported function).
- **Phase**: hygiene (with a dead-test flavour: these are fix-session probes that were
  committed, the exact shape the owner is asking a rule for)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous (one sub-item owner, below)
- **Evidence**: `git log --diff-filter=A`: all three were born 2026-08-03 in commit 1d7294b
  "repositioned the verify mark, turned off the tour to work on it properly, removed about
  section slop" (landing-auth-ui earlier, a2279ff 2026-07-18 "changed support icon") - i.e.
  each was written to prove that session's edit landed, then committed. None names an audit
  finding. A padding change to VerifiedMark or a dep-list reorder in TourProvider breaks the
  suite without any behaviour changing; that is a test costing attention, not protecting it.
- **What to do**:
  - verified-mark.test.mjs: keep the first test (tooltip says "Verified", not "Verified
    member" - that is an owner copy decision, abb9381) and delete the second (the four class
    assertions). Visual drift is `npm run visual`'s job (the login/landing baselines cover the
    leaf).
  - landing-auth-ui.test.mjs: keep only the assertion with a reason behind it -
    `assert.doesNotMatch(source, /\bPiggyBank\b/)` (rejected on meaning: "read as a donation
    box") - and the one-line `Tree` presence check if desired; delete the exact-literal nav-row
    pin; rename the file `sidebar-support-icon.test.mjs` (or fold the two assertions into an
    existing components test) so the name says what it tests.
  - tour-provider.test.mjs: delete the file; add one wiring pin to
    `src/lib/tour-auto-offer.test.mjs` if wanted (`tour-provider.tsx` calls
    `shouldAutoOfferTour(` and defaults `autoOffer = false`) - two lines in the file that
    already owns this behaviour, per the one-home rule (lib-tests-08).
- **Saving**: ~45 lines, minus ~4 re-added; more valuable is the reduction in false-positive
  breakage on legitimate UI work.
- **Risk & gate**: low; `npm run check` still green (the tests gate's file-count floor is 60,
  and 75→74 files stays above it). `npm run visual` covers the visual half.
- **Confidence**: high on tour-provider and the class-string pin; medium on how much of
  landing-auth-ui to keep - the PiggyBank line is genuinely a decision pin.
- **Notes**: `src/components/tour/manual-tour-entry.test.mjs` is the same 2026-08-03 cohort
  but has been actively maintained through three rebuilds (ae7d9c4, c74d99f) and now pins real
  authorisation shape (requireAdminPage in the layout, `forbidden()` not redirect, isOwner
  gating). Keep it. Its first test ("About is a minimal, generously spaced placeholder") pins
  an owner decision through class spellings; see Owner decisions.

### lib-tests-04 - tour-mobile-verify.test.mjs: keep the two security pins, drop the copy pins
- **Where**: `scripts/qa/tour-mobile-verify.test.mjs:7-33` (both tests grep the SOURCE of the
  manual QA script `scripts/qa/tour-mobile-verify.mjs` for exact strings).
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: assertions include the exact retry log line
  `/Could not find "hoopoe tour" button; retrying\./` and `console.error('admin nav
  warning:'` - rewording a log message in a manual dev script fails `npm run check`. The
  script itself is run by hand (documented in scripts/README.md, no npm script). But two
  assertions ARE load-bearing security pins from the C1 work (c70f244): the script must sign
  in via `POST /api/dev-login` (`doesNotMatch /page\.evaluate\(async \(email\)/` pins the
  deleted no-secret path) and must go through `requireLoopbackBaseUrl` /
  `assertSameOriginAfterNavigation` (so a typo'd base URL can never send the dev secret to a
  remote origin).
- **What to do**: reduce the file to those four assertions (dev-login fetch, no
  page.evaluate-login, requireLoopbackBaseUrl on argv, same-origin re-check) with a header
  naming C1/H16; delete the log-copy and tour-stop-list pins (the stops belong to the script's
  own runtime failure output, which a human reads when running it by hand).
- **Saving**: ~15 lines; removes a class of false failures on harmless script edits.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.
- **Notes**: if the scripts-e2e-ci lens proposes retiring `tour-mobile-verify.mjs` itself,
  this test goes with it - but the dev-login discipline pin should then move to
  `scripts/qa/_dev-login.mjs`'s vicinity or security-regressions.test.mjs, because "no local
  tool signs in without the secret over loopback" is worth keeping somewhere.

### lib-tests-05 - escapeLike behaviour is tested in two files; give it one home
- **Where**: `src/lib/db-text.test.mjs` (28 lines: metacharacter escaping, backslash-first)
  and `src/lib/feed-write-rule.test.mjs:99-115` (C-015: clamp length, passthrough, no dangling
  escape) - both import `escapeLike` from `./db-text.ts` and exercise it behaviourally.
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: import lists (both files: `from "./db-text.ts"`); the three C-015 behaviour
  tests in feed-write-rule assert on the same function db-text.test.mjs owns, in a file whose
  charter is the feed's write paths.
- **What to do**: move the three C-015 escapeLike behaviour tests (clamp, passthrough,
  dangling-escape) into db-text.test.mjs under a `/* C-015 */` header; leave in
  feed-write-rule only the two call-site pins (`escapeLike(opts.search)` in the feed,
  `escapeLike(filters.q)` in the directory), which are about the feed, not the function.
- **Saving**: ~5 lines net; the win is the one-home rule made real (lib-tests-08 cites it).
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.

### lib-tests-06 - knip counts all 75 test files as "unused files": add the knip entry config
- **Where**: repo root (no `knip.json` exists); `raw/knip.txt` line 1: "Unused files (124)",
  of which 75 are `*.test.mjs`.
- **Phase**: relocate (tooling config)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -c 'test.mjs' raw/knip.txt` → 75. The brief itself flags this as a
  config gap, not dead tests. With 75 false positives, knip's unused-file report is unusable
  as a leftovers detector - which is exactly the tool the owner's "I keep deleting leftovers"
  problem wants.
- **What to do**: add `knip.json` at the repo root:
  ```json
  {
    "entry": [
      "src/**/*.test.mjs",
      "scripts/**/*.mjs",
      "prisma.config.ts",
      "e2e/**/*.spec.ts"
    ],
    "ignore": ["src/generated/**"]
  }
  ```
  (The dependency/tooling lens owns the full knip config; this is the minimum that makes the
  test files entries. `scripts/**/*.mjs` is deliberate: every QA script is invoked by hand or
  by check.mjs, so none is reachable from src.) After this, a `*.test.mjs` knip still lists as
  unused would be a REAL orphan - the exact signal the survival rule below wants.
- **Saving**: 0 lines; converts 124 false positives into a usable leftovers detector.
- **Risk & gate**: low; run `npx knip` once after and eyeball that the unused-files list drops
  to genuinely suspicious files.
- **Confidence**: high on the entry patterns; medium on interaction with whatever the
  dependency lens proposes - merge with theirs.

### lib-tests-07 - Small hygiene batch inside otherwise-healthy files
- **Where**:
  - `src/lib/avatar.test.mjs:4` - header says "No test runner is wired into this project, so
    this is a standalone assertion script". Stale twice over: check.mjs has run it since
    2026-08-08, and the file is also the only test not using `node:test` (it is a top-level
    script that exits 1). The header's run instruction (`node --test src/lib/avatar.test.mjs`
    vs line 2's `node src/lib/avatar.test.mjs`) is also self-inconsistent.
  - `src/lib/image-purge-rule.test.mjs:268,278` - two tests re-type the decomment regex
    inline as a local `const code = src.replace(...)` although the file defines the identical
    helper at line 25 (the local const shadows the outer function's name, which is why it was
    re-typed instead of called).
  - `src/lib/catchups.test.mjs:838-839` - re-imports `readFileSync` via a dynamic
    `await import("node:fs")` and re-declares a local `read` although both exist at the top of
    the file (lines 19, 730-743 context).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: quoted lines above; all three are confusion hazards, not bugs.
- **What to do**: fix avatar.test.mjs's header sentence (it IS run by the gate; keep the
  "mirror on purpose" and C-196 parity prose, which is load-bearing); in image-purge-rule
  rename the outer helper's uses (e.g. `const src2 = code(read(...))`) and delete the two
  inline regex copies; in catchups.test.mjs use the file's own imports. All trivially subsumed
  by lib-tests-01's conversion pass if that lands.
- **Saving**: ~10 lines, clarity mostly.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.

### lib-tests-08 - The survival rule: what a test file must have to be committed, and the gate that enforces it
- **Where**: policy text for `CLAUDE.md` (NOT written there by this audit - proposed here per
  charter); enforcement in `scripts/qa/check.mjs` tests gate (or a new
  `src/lib/test-suite-rule.test.mjs` in the gate-coverage style).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: owner (the policy is his ask; the
  gate implementation is autonomous once he nods)
- **Evidence**: the suite's own history is the argument for each clause. 55/75 files already
  name the finding they pin; 30/75 already carry anti-vacuity counters; the 2026-08-25 session
  measured "roughly one in eight gates was vacuous" until revert-the-fix testing exposed them;
  the 2026-08-03 cohort (lib-tests-03) shows what gets committed without a rule; and
  landing-auth-ui sat red three weeks because nothing said who owned it.
- **What to do**: adopt the following as a CLAUDE.md section (wording is drafted to match the
  house voice; trim as desired):

  > ## Unit tests: what earns a commit
  > A `*.test.mjs` is a permanent regression pin, not a session note. Before staging one:
  > 1. **It says what it pins.** The header (or each test title) names the finding id
  >    (C-/B-/M-/H-/Low) or states the behaviour contract in one sentence. A test that cannot
  >    say what regression it would catch is a scratch probe: delete it before the commit.
  > 2. **It has been seen to fail.** Revert the fix (or mutate the guarded line) and watch it
  >    go red once; a test that has never failed is a rumour. Note the proof in the header
  >    ("proved by reverting X").
  > 3. **A text pin is a last resort, and it is never only a grep.** If the subject imports
  >    with bare `node` (a pure function, no `@/` alias, no Prisma/next), the test imports and
  >    exercises it. Reading source as text is allowed only when the unit gate cannot load the
  >    subject (server actions, .tsx, schema.prisma, proxy.ts) - and then: extraction goes
  >    through `src/lib/test-kit.mjs` (`balancedBody`/`section`/`decomment`), never a local
  >    `indexOf("\n  }")`; every slice or sweep carries an anti-vacuity check ("only N sites
  >    found - the sweep has drifted"); assertions match a CALL or a whole fragment, never a
  >    bare imported name; sweep sites are COUNTED, not merely detected.
  > 4. **Pin decisions, not styling.** Class strings, icon imports and copy phrasings are not
  >    pinnable unless the exact spelling IS the decision ("Rishi Valley" never "RV Connect",
  >    no em dashes, "Verified" not "Verified member"). Visual drift belongs to `npm run
  >    visual`, not to a grep of a className.
  > 5. **One home per rule.** Before creating a file, grep the suite for the module under
  >    test; extend the existing file. Two files asserting on one function is how they drift.
  > 6. **Scratch probes die in their own session.** Anything that drives a browser, screenshots,
  >    or probes a live route is not a `*.test.mjs`: it lives in `scripts/qa/` (prefixed `_`
  >    if temporary) or `e2e/`, and a temporary one is deleted before the closing commit. The
  >    unit gate stays static, offline and dev-server-free.

  And add the mechanical half to check.mjs's tests gate (~25 lines), so clause 1 and the
  vacuity half of clause 3 are enforced rather than hoped:
  - For every discovered test file, require that the first comment block or the file body
    matches `/\b(?:C|B|M|H)-?\d{1,3}\b|\baudit\b|\bLow \d+\b|@contract:/` - i.e. it names a
    finding or declares a contract. Report offenders the way `findUnrunTests` reports renames
    ("test files with no stated pin: ...", non-blocking `warn` for existing files, or seed the
    20 current id-less behavioural files with one-line `@contract:` headers in the same
    commit and make it blocking).
  - For every test file that calls `readFileSync|execSync` but has no `./*.ts` import (a pure
    text-pin file), require at least one drift-guard marker
    (`/has drifted|vacuous|is gone|stopped matching|retarget this test|only \d|the grep broke/`).
    Today that flags roughly 5 files, each genuinely worth a guard.
  This is the same shape as the C-195 floor: cheap, fails closed, and catches the next
  leftover at commit time instead of at the next 30k-line cleanup.
- **Saving**: 0 lines now; it is the mechanism that prevents the next cleanup. (The smallest
  rule set that would have prevented the last one, per the charter's question: clauses 1, 5
  and 6 plus lib-tests-06's knip entry - id-less files become visible, siblings stop
  multiplying, probes stop landing in the suite, and knip's unused-files list becomes a real
  signal for everything else.)
- **Risk & gate**: low; the gate change is proved by adding a scratch file with no header and
  watching `npm run check` name it (and by renaming it `.spec.mjs` to confirm C-195 still
  fires).
- **Confidence**: high on the clauses; medium on making clause 1 blocking immediately -
  seeding ~20 `@contract:` one-liners is a mechanical prerequisite, listed in Metrics.

## Owner decisions

- **The "About is a placeholder" pin** (`src/components/tour/manual-tour-entry.test.mjs`,
  first test). This test freezes the About page as a minimal placeholder - it fails if anyone
  adds a section, a card, a border or the old "How to use it" copy. If you still want About to
  stay a deliberate placeholder until you write it, the pin is doing its job and should stay
  (it is your decision written as a tripwire). If About is going to be written before launch,
  the test should be deleted in that same change rather than "fixed" to match the new page.
  My recommendation: keep it until the About page is really written, then delete, not update.
- **The survival rule text** (lib-tests-08): the six clauses change how every future session
  behaves in this repo, so the wording should get your eyes before it lands in CLAUDE.md. The
  content is drawn entirely from rules the suite already half-follows; nothing in it makes
  existing tests fail without the small seeding pass described there.

## Not-findings

Things that look like bloat and are verified intentional - do not re-litigate:

- **"Rule" tests that read source as text instead of importing it.** Deliberate and correct:
  the unit gate runs each file with bare `node` - no `@/` resolver, no DB, no browser - so
  server actions, `.tsx`, `proxy.ts` (edge bundle) and Prisma-importing modules cannot be
  imported. Nearly every such file states this in its header (e.g. directory-rule:15-17,
  admin-rule:17-19, presence-rule:23-25), and the pattern was hardened by mutation testing on
  2026-08-25 (progress.md: "revert the fix and watch the gate fail... roughly one in eight was
  vacuous until that check exposed it").
- **catchups.test.mjs at 880 lines.** The largest file, and it earns it: the pure engine's
  state machine at every boundary, the C-141 hour-by-hour sweep of four surfaces across 96
  hours, the C-019 renderer sweep - each block headed by its finding id. Not a split
  candidate; splitting would only multiply preambles.
- **The whole-file mirrors in avatar.test.mjs.** The test re-implements the hash in plain JS
  ON PURPOSE ("so a bug in avatar.ts cannot hide behind the same bug in its test") and the
  C-196 parity block ties mirror and real module together over 2,000 seeds. The 200k-iteration
  reserved-species scan runs in well under a second.
- **demo-seed/content.test.mjs loading sharp and reading 2x18 image files.** Justified in situ:
  the recorded width/height size the masonry boxes before load, three were once guessed wrong,
  and "measuring beats trusting". It is also the pre-flight that replaces a crashed
  half-written seed against live Supabase.
- **check.mjs's MIN_TEST_FILES floor of 60 vs 75 actual files.** Deliberately slack: the
  comment at check.mjs:59-68 explains a floor "well below the real count, so it never nags on
  an ordinary day and fires the moment a chunk of the suite goes missing" (C-195). Raising it
  to ~70 would be reasonable but is a taste call, not a finding.
- **75 parallel `node` spawns in the tests gate.** Looks like a fork storm; measured at ~23s
  for the whole five-gate run and isolates each file (a top-level throw in one cannot mask
  another). Consolidating under one `node --test` run would save little and lose isolation.
- **PUBLIC_BY_DESIGN / AUTHORISED_OTHERWISE / NO_INDEX_NEEDED / OWN_CONTENT / FROM_THE_DATABASE
  exemption tables inside meta-tests**, each entry carrying its reason, each with a paired
  "names only things that still exist" staleness test. This is the repo's reviewed-decision
  pattern working as designed (C-189/C-191/C-192 fixes).
- **`src/lib/test-fn-body.mjs` living in src/lib though only tests use it.** It must be
  importable by bare-node tests via a relative path with no resolver; nothing in production
  imports it, so it reaches no bundle. The test kit (lib-tests-01) belongs beside it for the
  same reason.

## For other lenses

- **scripts-e2e-ci**: `scripts/qa/phase3..phase10-probe.mjs` + `phase4-prod-check.mjs`
  (~110KB, born 2026-08-20) are one-shot security-audit probes; `_dir-chrome-probe.mjs`,
  `_dir-room-shots.mjs`, `hoopoe-*-{check,probe}.mjs`, `hover-probe.mjs` are older one-shots.
  Prime candidates for the owner's leftovers complaint; not mine to judge.
- **lib territory**: three separate grapheme/surrogate-safe text-cutting implementations exist
  in src/lib (`truncateGraphemes` in utils.ts, `previewOf`/`deriveSubject` in
  admin-threads.ts, `safeTruncateIndex` in rich-truncate.ts) - their tests are distinct
  because the functions are; whether the functions should converge is a lib question.
- **docs lens**: CLAUDE.md says the tests gate runs "75 files as of 2026-08-25" - correct
  today; if lib-tests-03 deletes one, that sentence and `.claude/skills/check/SKILL.md`'s
  stale "the 14 standalone `*.test.mjs` scripts" (SKILL.md:53 still says 14; CLAUDE.md was
  corrected in C-195 but the skill was not) should be corrected together. The SKILL.md "14"
  is a live doc bug either way.
- **dependency lens**: merge lib-tests-06's knip entry block with your knip proposal.

## Metrics

- Lines in territory: 11,093 (75 test files 10,807; check.mjs 213; test-fn-body.mjs 73).
- Read fully: all 77.
- Kind split (a file can be both): pure-behavioural (imports the real function, no source
  reading) ~24 files; hybrid behavioural + wiring pins ~26; pure text-pin (`*-rule` style, no
  non-node imports) ~20; meta-sweeps over the whole tree/schema: gate-coverage,
  index-coverage, cascade-rule, plus repo-wide sweeps embedded in valley-day, keyset,
  email-normalization-rule, notification-links, catchups, security-regressions,
  post-visibility-rule, image-purge-rule, place-input, heart, upload-size-rule; scratch/spelling
  cohort: 4 (lib-tests-03/04) plus one test inside manual-tour-entry.
- Files naming an audit/bug id: 55/75. Files with explicit anti-vacuity guards: 30/75. The
  ~20 id-less files are almost all pure-behavioural (vcard, houses, roster-rule, origin-rule,
  password-rule, human-pass-rule, call-action, catchup-shelf, map-cluster, prisma-errors,
  db-text, batch-line, tour-auto-offer, local-base-url, npm-audit-gate...) and would take the
  proposed `@contract:` one-liner each.
- Helper duplication counted: ROOT/read preamble 39 files; decomment 21 strong + 12 weak
  copies; slice-to-next-export 12 files; walk() 9 copies in 6 files; lone-surrogate 3 copies;
  balancedBody re-implementations 2 (gate-coverage verbatim, image-purge-rule variant).
  jscpd: 12 clones, 291 lines, all preamble.
- Biggest files: catchups 880, post-visibility-rule 428, catchup-lifecycle 375,
  unattended-rule 330, demo 325, image-purge-rule 307, gate-coverage 301 - each itemised per
  finding id; none padded (see Not-findings).
- Age: 60 of 75 files were born on or after 2026-08-20 (the security overhaul and two bug
  audits); the pre-audit stragglers of 2026-08-03 are exactly the spelling-pin cohort.
- Estimated honest total savings across findings: ~350 lines (01 ~290, 03 ~41, 04 ~15,
  05 ~5, 07 ~10, 02 subsumed by 01 when both land; 06 and 08 are 0-line structural).
