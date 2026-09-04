# lib-tests - refactor audit 2 report

Territory reader for the unit-test suite as a body of code: the 102 `*.test.mjs` files the
`npm run check` tests gate discovers (87 under `src/lib`, 11 under `src/components`, 6 under
`scripts/qa` -- the charter said 4; there are 6), the shared kit (`src/lib/test-kit.mjs`,
`src/lib/test-fn-body.mjs`), the runner (`scripts/qa/check.mjs`), and, lightly, the nine
Playwright files under `e2e/`. The job: for every test, what does it pin, is the pin still
attached to a live subject, does it use the kit or hand-roll it, does it duplicate another pin,
is it a scratch test by CLAUDE.md's rule, and is it slow by construction. Date: 2026-09-03.
Files in territory: 114 (102 tests + 2 kit + 1 runner + 9 e2e); read fully: 114.

## Coverage

- Read fully: every `*.test.mjs` under `src/` and `scripts/qa/` (102 files, 15,127 lines by
  `wc -l`; 9,297 code lines in the 87 lib tests per `raw/cloc-lib.txt`), `src/lib/test-kit.mjs`
  (103), `src/lib/test-fn-body.mjs` (73), `scripts/qa/check.mjs` (273), all nine files in
  `e2e/` (1,625 lines: `playwright.config.ts`, `auth.setup.ts`, seven `*.spec.ts`).
- Also read for context: `.claude/skills/check/SKILL.md`, the audit-1 lib-tests report
  (`docs/audit-fix/2026-08-25-refactor-audit-1/work/agents/lib-tests.md`), the phase-3 session
  log in that audit's `fix-prompt.md` (lines 436-560, what the kit was meant to end and what was
  deliberately deferred), `raw/jscpd-tests.txt`, `raw/jscpd-e2e.txt`, `raw/check-baseline.txt`,
  `raw/test-timings.txt` (the orchestrator's `node --test` TAP timings: 1,005 top-level tests,
  8,304 ms CPU in one process -- used instead of guessing at speed).
- Skimmed: none.
- Not read: the source files the tests pin (other territories). Where a pin's vacuity depended on
  the subject, I checked the subject with a grep or a replay of the test's own logic (noted per
  finding), never by running the suite.
- Uncommitted edits seen: at charter time `git status` showed `M src/components/common/
  image-viewer.tsx` (someone's WIP; it is the file `image-viewer-chrome.test.mjs` and
  `pinch-zoom.test.mjs` pin). By the time I checked it directly it was clean, so the peer had
  committed. No test file had uncommitted edits at any point.

## Summary

This territory is healthier than its size suggests, and the reason is audit 1: the kit landed
(61 of 102 files import it; the two `decomment` spellings are one), the 2026-08-25 mutation run
closed the vacuity mechanisms, and every one of the 27 files born since audit 1 closed carries a
header that says what it pins and why. **I found zero tests that pass vacuously today by
accident.** Two pass vacuously by design and say so in their own comments (`profession-tags`'s
parent-chain loop, `security-regressions`'s empty `MINTS_ITS_OWN_BYTES` mirror); one sweep is
vacuity-prone because it has no count guard (`keyset`, replayed: 6 files, 19 blocks, 3 assertions
run today); one guard is dead (`purge-rule`'s `assert.ok(del)` is always truthy). There are **no
whole files to delete**: no file is a scratch probe. Two individual tests are scratch-shaped
(`pinch-zoom`'s three tuning literals; `upload-shared`'s one-line arithmetic repeat).

What IS here is structural, and it is the pattern audit 1 fixed in one place and left in nine
others. **Ten sweeps still shell out to `git grep`/`git ls-files`** (nine files), which is the
exact fail-open shape `gate-coverage.test.mjs`'s own header documents as C-189 -- tracked files
only, so an untracked new action file is invisible until staged -- and each spawns a process.
`security-regressions.test.mjs`'s C2 sweep is a weaker copy of the very detector gate-coverage
rebuilt after C-189. The hand-rolled slice-to-next-`export` extractors audit 1 counted at 12 files
are now **25 files, 49 sites** (the kit exports `balancedBody`; four files use it), and two of
them carry a written justification ("cannot brace-match, the return annotation") that the kit made
false a week before the comment was written. One test file re-reads and re-decomments a
2,050-line action file eleven times. Eight tests walk all 667 source files; one of them is a full
second of CPU because it decomments every file to look for a class name it could `includes()` for
first.

Rule vs behaviour: by file, 39 pure text-pin, 32 hybrid, 31 pure behaviour; the rule pattern is a
not-finding (audit 1 §5). Two rule tests have ESLint equivalents (`no-alert`; a
`no-restricted-syntax` for `motion.`) but `check.mjs` makes lint non-blocking whatever its
severity, so moving them would demote blocking pins to warnings: rejected, and recorded below.

Honest savings: ~1.5 s of the suite's 8.3 s CPU (wall-clock impact small: the gate is bound by
`tsc`'s 14.6 s), ~10 process spawns per check, ~60 redundant file reads, ~120 lines across the
kit adoptions and the pin merges, one fewer fail-open class in a security sweep, four e2e
clones. The suite floor (60) is 42 files below the count (102): deleting is free, and the floor
no longer means much. Structural-vs-cheap: 01, 02, 04 are structural; the rest cheap.

## Findings

### lib-tests-01 - Ten sweeps still shell out to git (nine files): tracked-only, fail-open, one process each
- **Where**:
  - `src/lib/keyset.test.mjs:88-93` (`git grep -l 'cursor: { id'`)
  - `src/lib/people-search-rule.test.mjs:46-49` (`git grep -l 'api/users/search\|useUserSearch('`)
  - `src/lib/post-visibility-rule.test.mjs:335-340` (`git grep -l 'canViewPost(' -- 'src/app/**/page.tsx'`)
  - `src/lib/contribution-state.test.mjs:161-164` (`git grep -l 'prisma.contribution'`)
  - `src/lib/security-regressions.test.mjs:51-58` (C1-c, `git grep -l NEXT_PUBLIC_ADMIN_EMAIL`) and `:100-107` (C2, `git grep -l '"use server"'`)
  - `src/lib/catchups-core.test.mjs:733-740` (`git grep -l 'asker:'`, at module load)
  - `src/lib/notification-reach.test.mjs:78-84` (`git grep -l 'isHidden: true\|post.delete('`)
  - `src/components/ui/focus-recipe.test.mjs:70-76` (`git grep -lE '<input|<textarea|contentEditable'`)
  - `src/components/common/confirm-dialog.test.mjs:23-28` (`git ls-files 'src/app/*.ts*' 'src/components/*.ts*'`)
  - NOT included: `scripts/qa/scripts-ledger.test.mjs:43` (`git ls-files scripts`) -- its header
    lines 27-32 argue for tracked-only on purpose (a peer's untracked script must not fail a
    shared checkout's gate). That reasoning is sound for a ledger and wrong for a security sweep.
- **Phase**: architecture (one shared helper; closes a fail-open class)
- **Tier**: T2 per file, T3 as a set     **Class**: structural     **Decides**: autonomous
- **Evidence**: `gate-coverage.test.mjs:84-97` documents, in the repo's own words, why this shape
  is wrong: "`git grep` only sees TRACKED files, so a new action file was invisible to this sweep
  until somebody staged it, which is precisely the moment you would want it to speak up. Every one
  of those produces NO assertion rather than a failing one." That fix (C-189) was applied to
  gate-coverage and to `every /admin page checks the role itself` (line 266, "Walked, not `git
  ls-files`") and to nowhere else. Nine files still carry it. I replayed the two `"use server"`
  detectors against the tree: walk-and-strip-comments (gate-coverage) and git-grep-then-first-
  statement (security-regressions) both find 22 files today, so nothing is missed *now*; the gap
  opens the next time someone writes an action file and runs `npm run check` before `git add`.
  The timings file shows the spawn cost: `no time-ordered query pages by naming a row` 118.7 ms,
  `no native confirm/alert/prompt dialogs` 113.3 ms, `no money surface reads ... gross` 101.4 ms,
  `every people-search caller` 99.3 ms, `every text field ... FIELD_FOCUS` 85.8 ms, `every way a
  post stops being readable` 57.9 ms -- each is mostly the `git` process, since the equivalent
  walk-based sweeps over the same tree cost 30-90 ms including the reads.
- **What to do**: add one helper to `src/lib/test-kit.mjs`, beside `walk`:
  ```js
  /** Files under `dir` whose text matches `re`. A filesystem walk, not `git grep`: a
   *  new file is swept the moment it exists, not the moment it is staged (C-189). */
  export const grepFiles = (dir, re, opts) =>
    walk(dir, opts).filter((f) => re.test(readFileSync(f, "utf8"))).map((f) => relative(ROOT, f));
  ```
  Then, file by file, replace each `execSync("git grep ...")` with `grepFiles(resolve(ROOT,
  "src"), /pattern/, { skip: [...], match: ... })`, keeping the same post-filters. Specifics:
  keyset needs `match: /\.tsx?$/` and the existing `':!*.test.*'` exclusion becomes
  `skip: (name) => name.endsWith(".test.mjs")`; post-visibility-rule's `'src/app/**/page.tsx'`
  becomes `walk(resolve(ROOT,"src/app"), { match: (n) => n === "page.tsx" })`; confirm-dialog's
  `git ls-files 'src/app/*.ts*' 'src/components/*.ts*'` becomes two walks (and its `> 100`
  count guard stays); focus-recipe's `':!src/app/lab'` is a `skip` of the lab dir (copy
  motion-namespace-rule's predicate at line 29). Drop the `execSync` imports. Leave scripts-ledger
  alone. Run the mutation the audit-1 fix log demands for any kit change: make `grepFiles`
  return `[]` and confirm each of the ten tests goes red -- eight have count guards
  (`>= 3`, `>= 6`, `> 0`, `>= 15`, `> 100`), and two do not: keyset (see lib-tests-13) and
  security-regressions C1-c, which is a must-be-empty sweep and can only be guarded by asserting
  the walk saw files (`assert.ok(walked.length > 300)`).
- **Saving**: 10 process spawns per `npm run check` (~0.4-0.5 s CPU across the parallel gate),
  0 lines net (the helper is ~6 lines, each site loses ~4), and one fewer class of silent miss
  in two security sweeps (C2 ownership, C1-c admin email).
- **Risk & gate**: medium for `security-regressions.test.mjs` (a pinned file: the C2 sweep must
  report the same 22 candidate files before and after -- print `files.length` once in each
  state), low elsewhere. `npm run check` green; the ten reddening mutations above.
- **Confidence**: high. What would change my mind: a walk over `src` that is materially slower
  than `git grep` on this machine -- it is not (identity-row walks 667 files in ~1 s *with*
  decomment; without it the walk is tens of ms).
- **Notes**: catchups-core runs its `git grep` at module load (line 733), so the spawn is paid
  even by `node --test --test-name-pattern` runs that never reach that test; a walk inside the
  test fixes that too. Related: lib-tests-02 (the C2 detector), lib-tests-13 (keyset's missing
  count).

### lib-tests-02 - security-regressions' C2 sweep is a weaker copy of gate-coverage's server-action detector
- **Where**: `src/lib/security-regressions.test.mjs:100-107` vs `src/lib/gate-coverage.test.mjs:100-117`
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: gate-coverage's `serverActionFiles()` strips a leading docblock before testing for
  `'use server'` in either quote, over a filesystem walk. security-regressions' C2 candidate list
  is `git grep -l '"use server"'` (double quotes only) followed by `/^\s*(['"])use server\1/` on
  the raw file, which admits single quotes but drops any action file that opens with a comment --
  the "likely shape in a codebase as comment-heavy as this one" (gate-coverage:89-90). Today the
  two agree (22 = 22, replayed); the day an action file gains a header comment, gate-coverage
  still sweeps it and the C2 ownership sweep silently does not. Two detectors for one question,
  and the security-critical one is the weaker.
- **What to do**: move `serverActionFiles(dir)` from gate-coverage into `test-kit.mjs` (it depends
  only on `walk`, `readFileSync`, `relative`, `ROOT`, all already there), export it, import it in
  both files. In security-regressions replace lines 100-107 with
  `const files = serverActionFiles(resolve(ROOT, "src")).filter((f) => /\bimages\b|\bimageUrls?\b/.test(decomment(read(f))));`
  and keep the `>= 3` guard. Delete the C-189 prose from gate-coverage's header only if the kit
  copy carries it (move it, do not lose it: it is the reason the function is shaped that way).
- **Saving**: ~12 lines; one detector instead of two; the C2 sweep gains the three C-189 fixes.
- **Risk & gate**: low-medium; `security-regressions.test.mjs` and `gate-coverage.test.mjs` must
  both stay green and report the same file counts (22 and 22). The audit-1 fix log's warning
  applies: "lib-tests-02's suggested regex would have re-broken a security sweep" -- so do not
  change what `serverActionFiles` matches, only where it lives.
- **Confidence**: high.
- **Notes**: subsumed by lib-tests-01 if that lands first with `serverActionFiles` as one of the
  kit additions; listed separately because it is a ten-minute standalone fix to a security pin.

### lib-tests-03 - Memoise `read` (and add a `code` = decomment(read) helper): 60 redundant reads inside single files
- **Where**: `src/lib/test-kit.mjs:36` (`read`); the repeat offenders, from a grep of
  `read("...")` per file: `catchup-lifecycle.test.mjs` reads `src/app/(main)/catchups/actions.ts`
  **11 times** (lines 34, 48, 110, 138, 168, 218, 230, 252, 271, 349, plus `catchups.ts` 3x and
  two pages 2x each), `image-purge-rule.test.mjs` reads `collection/actions.ts` 5x (45, 138,
  150, 246, 256), `purge-rule.test.mjs` reads `account-purge.ts` 4x and `retention.ts` 4x,
  `security-regressions.test.mjs` reads `collection/actions.ts` 3x and three others 2x,
  `presence-rule.test.mjs` reads `last-seen.ts` 3x, `unattended-rule`, `session-revocation`,
  `directory-rule`, `people-search-rule`, `profile-editor-rule`, `proxy-rule`, `threads-rule`,
  `notification-reach` 2x each. 23 duplicate groups in 14 files, ~60 reads that return the same
  bytes as a read already made in the same process. 189 call sites in the suite spell
  `decomment(read(...))`.
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the grep above. `catchups/actions.ts` is ~2,050 lines; catchup-lifecycle
  decomments it eleven times per run (each pass is two regexes over ~80 KB). The charter's
  question -- where two tests read the same file, could one read it -- has a one-place answer.
- **What to do**: in the kit,
  ```js
  const cache = new Map();
  export const read = (p) => cache.get(p) ?? (cache.set(p, readFileSync(resolve(ROOT, p), "utf8")), cache.get(p));
  export const code = (p) => codeCache.get(p) ?? ...   // decomment(read(p)), memoised the same way
  ```
  Tests are read-only and every process is one test file, so a per-process cache cannot go
  stale. Then, optionally and file by file, `decomment(read(x))` -> `code(x)` (189 sites; a
  sed-able change but each file should be run after). Independently of the kit, hoist
  catchup-lifecycle's eleven reads to one module-level `const ACTIONS = decomment(read(...))`,
  the way composer-rule (lines 21-34) and threads-rule (19-20) already do.
- **Saving**: ~60 file reads and ~60 decomment passes per check (tens of ms CPU); ~40 lines if
  the call sites adopt `code`; clarity in catchup-lifecycle.
- **Risk & gate**: low; `npm run check`. Gutting `read` reddens 31 files (audit-1 measured), so
  the cache cannot fail silently.
- **Confidence**: high.
- **Notes**: a kit change means re-running the audit-1 mutation ("gutting `read` reddens 31
  files, `decomment` 20, `walk` 5") -- note the numbers before and after.

### lib-tests-04 - 49 hand-rolled function-slicers in 25 files; the kit's `balancedBody` is used by 4; two files justify the hand-rolling with a reason the kit already removed
- **Where** (sites per file, from `indexOf("\nexport` / `indexOf("export async function", ` /
  `indexOf("\n}` / `indexOf("\n  }`): catchup-lifecycle 8, unattended-rule 3, threads-rule 3,
  purge-rule 3, proxy-rule 3, index-coverage 3, demo 3, profile-editor-rule 2, mail-queue-rule
  2, feed-write-rule 2, auth-flow-rule 2, admin-rule 2, and one each in verify-outcome-rule,
  security-regressions, river-cursor, rich-truncate, post-visibility-rule, notification-reach,
  group-succession, draft-rule, directory-rule, composer-rule, catchups-core (line 857-858, the
  literal `indexOf("\n  }\n")` shape test-fn-body.mjs's header names as the C-188 trap),
  append-page, admin-guard-rule. `balancedBody` call sites: catchup-lifecycle:93,
  composer-rule:43, gate-coverage:82, river-cursor:314.
  The stale justifications: `auth-flow-rule.test.mjs:19-27` ("Deliberately NOT brace-matched:
  these signatures ... carry object types in ... the return annotation, so 'the first brace that
  ends a line' lands on the parameter object") and `directory-rule.test.mjs:81-84` ("Sliced to
  the next top-level `export`, not brace-matched: this signature carries an object RETURN TYPE
  ... The same trap cost a round in auth-flow-rule.test.mjs").
- **Phase**: dedupe (with a latent-vacuity flavour)
- **Tier**: T1 for the two comments; T3 for the migration (one file at a time)     **Class**: structural     **Decides**: autonomous
- **Evidence**: `test-fn-body.mjs:22-25` says `balancedBody` was built to "step over a `:
  Promise<{ ... }> return annotation (whose braces are NOT the body -- the naive `indexOf("{")`
  landed inside one and reported a gated action as ungated)". So the two comments describe a
  limitation of a slicer the kit replaced. Audit 1 counted 12 files hand-rolling this and its
  fix log deferred the migration ("each of the 12 has its own convention and about half carry a
  hand-written anti-vacuity assert; a shared extractor must reproduce every one or quietly weaken
  it. If wanted, one file at a time with the mutation check"). The population has doubled since,
  because the convention was never given a kit home. The latent hazard: every
  `src.slice(start, src.indexOf("\nexport ...", start))` returns the WHOLE TAIL when the sliced
  function is the last export (`slice(start, -1)`), which is the C-188 shape. I checked the five
  subjects that are last in their file today: `nudgeGroup` (catchups/actions.ts) is sliced only
  inside catchup-lifecycle's loop, which guards `-1`; `reportUser` (report-action.ts) is sliced
  in security-regressions:237 and profile-editor-rule:101, both guarded. So nothing is vacuous
  today; the guard is re-typed at each site and absent at most of the 49.
- **What to do**: (1) now, T1: rewrite the two stale comments to say what is true -- "sliced to
  the next export rather than brace-matched because this file predates `balancedBody`; either
  works" -- or convert those two files to `balancedBody` (their assertions are on body text, so
  the extraction method is interchangeable; run the file after). (2) add `section(src, decl)` to
  the kit: from `decl` to the next top-level `\nexport `, throwing (not returning the tail) when
  `decl` is absent, and asserting the slice is more than ~5 lines -- the guard auth-flow-rule:34
  and admin-rule:53/75/103/147 each hand-wrote. (3) migrate one file per commit with the
  reddening check (revert the guarded fix, watch the test fail), starting with the eight-site
  file (catchup-lifecycle) and the three-site ones. Do not sweep.
- **Saving**: ~60-80 lines once migrated; one guard instead of ~15 hand-typed ones; the tail
  hazard closed in one place. 0 lines for step (1); its value is that the next reader is not told
  the kit cannot do what it does.
- **Risk & gate**: low for (1); medium for (3) because these are regression pins -- every
  migrated file needs its fix reverted once to prove it still bites. `npm run check`.
- **Confidence**: high on the stale comments and the count; medium on how many of the 49 should
  move (the `\n}\n` slicers on top-level functions are fine as they are; the value is in the
  next-export ones, which are the tail-prone shape).
- **Notes**: catchup-lifecycle slices `submitEntry` twice in two tests (lines 139-141 and
  169-170) and imports `balancedBody` but uses it once -- the file is the natural first
  migration. `image-purge-rule`'s `blockAt(..., bodyBrace)` (lines 24-35) is a third
  brace-balancer with a feature `balancedBody` also has (the return-annotation skip); see
  lib-tests-07.

### lib-tests-05 - Eight full-tree sweeps; one costs a second because it decomments 667 files to find a class name
- **Where**: `src/lib/identity-row-overflow-rule.test.mjs:45-60` (1,064 ms: walks all of `src`
  including 112 lab files, `decomment(read(...))` every one, splits every file into lines, to
  test for `overflow-y-visible` / `overflow-x-visible`); `src/lib/notification-links.test.mjs:
  25-34` and `:46-64` (two separate walks + reads + decomments of all of `src`, 165 + 189 ms);
  `src/lib/image-purge-rule.test.mjs:190-197` (`sources()` walks and reads 300+ files, 218 ms);
  `src/lib/place-input.test.mjs:188` (99 ms); `src/lib/email-normalization-rule.test.mjs:119`
  (94 ms); `src/lib/valley-day.test.mjs:81` and `:145` (85 ms; two walks with different
  skip/match, legitimately); `src/components/common/motion-namespace-rule.test.mjs:28` (32 ms);
  `src/lib/loading-boundary-rule.test.mjs:53-57` (73 ms: walks `app` once, then walks each
  `loading.tsx` directory again for a `page.tsx`).
- **Phase**: hygiene (efficiency)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `raw/test-timings.txt` lines 3, 7, 9 (the three sweeps in the top nine), and the
  code: identity-row calls `decomment` before it has any reason to (a file with no
  `overflow-` in it cannot offend). The whole suite is 8,304 ms CPU; these sweeps are ~1.9 s of
  it, walking the same 667 files eight times in eight processes.
- **What to do**: identity-row: `const raw = readFileSync(file,"utf8"); if (!raw.includes("overflow-")) continue;`
  before the decomment (this alone should take it from ~1,060 ms to ~60 ms; the assertion is
  unchanged). notification-links: hoist one `walk` + read + decomment into a module-level
  `SOURCES` array (the two tests differ only in whether lab is skipped -- filter the array by
  path for the second). loading-boundary: the orphan check can use the first walk's `page.tsx`
  list instead of re-walking each directory. Leave valley-day's two walks (different
  `match`/`skip`). Consider skipping `lab` in identity-row (the rule is about members' screens;
  motion-namespace-rule and valley-day already skip it with a stated reason) -- but that is a
  judgement, not a bug: the header says "repo-wide rather than in the one component that had it".
- **Saving**: ~1.3 s CPU per `npm run check` (of 8.3 s test CPU). Wall-clock: small, and I want
  to be honest about why -- the tests gate runs 102 processes in parallel beside `tsc` (14.6 s of
  the 24.8 s gate), so shaving CPU inside one test file moves the gate's total by little. The
  gain is on `node --test` runs of the single file and on CI minutes.
- **Risk & gate**: low; `npm run check`; each edited sweep keeps its existing count guard
  (`files.length > 300`), so a pre-filter that accidentally empties the loop is caught.
- **Confidence**: high.
- **Notes**: a cross-file shared file list is not possible (one process per file, by design --
  audit-1 not-finding), so the ceiling here is per-file hygiene, not a shared index.

### lib-tests-06 - Twelve files hand-roll what the kit's `read`/`ROOT` provide; three were born after the kit
- **Where**: `readFileSync(resolve(ROOT, p))` where `read(p)` is the same thing: `db-pool-rule:23`,
  `cascade-rule:33,201`, `index-coverage:31,141,161`, `post-visibility-rule:344,396,419`,
  `keyset:96` (the other five users of that spelling read paths a `walk` returned, which is the
  natural call). `readFileSync(new URL("../x", import.meta.url))`: `append-page:49,97`,
  `heart:52,64`, `collection-taxonomy:92,142,144` (born 2026-08-28), `mark-centring:68,78`
  (2026-08-27), `river-cursor:312,322` (2026-08-28), `group-succession:118-119` (via a
  dynamic `await import("node:fs")` and a local `read` lambda), `upload-shared:158-160,203,208,
  212,218,251-256` (dynamic `import("node:fs")` and `import("node:url")` inside five tests,
  plus a `fileURLToPath`). `fileURLToPath`-built roots: `catchups-core:728` (`CATCHUP_ROOT`,
  used at 735, 739, 853, in a file that imports `read` from the kit on line 58),
  `river-query:32-34` (born 2026-09-02, no kit import at all). cwd-relative:
  `scripts/qa/hand-run-passes.test.mjs:30,40,82,98,102` (`readdirSync("scripts/dev")`,
  `readFileSync("CLAUDE.md")`) -- works only because `check.mjs` does `process.chdir(ROOT)`;
  `node scripts/qa/hand-run-passes.test.mjs` from any other directory throws ENOENT.
  `identity-row-overflow-rule:48` does `read(relative(ROOT, file))` where `read(file)` already
  works (`resolve(ROOT, absolute)` is the absolute path).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the kit's header: "37 identical ROOT/read preambles" was the audit-1 finding; the
  survivors above are the ones it missed plus the ones written since. The three post-kit files
  (`collection-taxonomy`, `river-query`, `river-cursor`) show the convention is not yet the
  default a new session reaches for.
- **What to do**: mechanical: `readFileSync(resolve(ROOT, "x"))` -> `read("x")`;
  `readFileSync(new URL("../app/(main)/x", import.meta.url), "utf8")` -> `read("src/app/(main)/x")`;
  in upload-shared and group-succession, a top-level `import { read, decomment, walk, ROOT } from
  "./test-kit.mjs"` replaces the five dynamic imports; catchups-core drops `CATCHUP_ROOT` and the
  three `node:path`/`node:url` imports; river-query imports the kit
  (`../../lib/test-kit.mjs`) and reads `src/components/collection/collection-client.tsx`;
  hand-run-passes joins `ROOT` (import from `../../src/lib/test-kit.mjs`, as ci-parity does) so it
  runs from any cwd. Leave `verified-mark`, `sidebar-support-icon`, `tour-mobile-verify` (one
  `readFile` each on a sibling; converting buys nothing).
- **Saving**: ~40 lines; one convention. 0 behaviour change.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.
- **Notes**: if lib-tests-03's `code()` lands first, do this conversion straight to `code(...)`.

### lib-tests-07 - email-normalization-rule still carries its own `walk`; three brace-balancers live outside the kit
- **Where**: `src/lib/email-normalization-rule.test.mjs:92-100` (a `walk` identical to the kit's
  with `skip` = generated/node_modules/lab); `:103-115` (`whereBlock`: the balanced `{...}` after
  a `where:`); `src/lib/catchup-lifecycle.test.mjs:372-383` (an inline brace balancer for each
  `catch` block); `src/lib/image-purge-rule.test.mjs:24-35` (`blockAt(src, from, bodyBrace)`).
  `test-fn-body.mjs:58-71` is the same loop, as the tail of `balancedBody`.
- **Phase**: dedupe
- **Tier**: T1 (walk) / T2 (balancer)     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the audit-1 fix log, session 4: "one `walk` copy survives in
  `email-normalization-rule.test.mjs` (the audit never listed it). Both are one-line jobs for
  whoever is next in those files." Nobody has been next. The three balancers are byte-for-byte
  the same depth-counting loop.
- **What to do**: `walk(resolve(ROOT, "src"), { skip: [...SKIP_DIRS, "lab"] })` replaces lines
  92-100 (drop `readdirSync`, `statSync`, `join` from the imports). Extract the loop at
  `test-fn-body.mjs:58-71` into `export function balancedBlock(text, at)` ("the `{...}` beginning
  at the first `{` at or after `at`"), have `balancedBody` call it, re-export from the kit, and
  use it for `whereBlock`, catchup-lifecycle's catch-block slice, and `blockAt`'s
  `bodyBrace=false` path (the `bodyBrace=true` path IS `balancedBody`'s annotation skip; convert
  `bodyOf` there to `balancedBody(src, "function " + name + "(")` -- check the `contributePhotoDirect`
  extraction test at line 48 still passes, it is the guard for exactly this).
- **Saving**: ~25 lines; three loops become one that is already tested.
- **Risk & gate**: low; `npm run check`; the walk change reddens if its count guard
  (`sites >= 5`) is violated. The audit-1 mutation for `walk` ("gutting walk reddens 5 files")
  becomes 6.
- **Confidence**: high.

### lib-tests-08 - Pins that repeat, disagree, or describe a day that already came
- **Where** and what:
  - (a) `src/lib/rich-truncate.test.mjs:87-95` (C-180) asserts, over `post-feed.tsx` and
    `profile-author-feed.tsx`, EITHER the hand-rolled `new Set(prev.map((p) => p.id))` OR
    `appendUnseen(prev, data.posts)`. `src/lib/append-page.test.mjs:84-104` (C-071) asserts, over
    the same two files plus two more, `appendUnseen(` AND `doesNotMatch` the hand-rolled Set. The
    older pin admits what the newer one forbids; the first alternative is dead.
  - (b) `src/lib/upload-shared.test.mjs:95-98` (`C-072: 12000x9000 really is over the limit`) is
    one arithmetic line repeating what the test above it already proves at line 86
    (`assert.ok(thrown, "12000x9000 no longer exceeds the decode ceiling")`).
  - (c) `src/lib/directory-rule.test.mjs:252-268` (`a profession tag column takes the contains
    arm with it`) is written as a tripwire for the future ("The day that column exists this
    fails"). The day was 2026-08-28: `professionTags` is in the schema, `tagShipped` is true, the
    assertion runs, and it passes because the arm was rewritten in the same commit. It is now a
    permanent negative pin ("no `jobTitle: { contains: needle`") with a comment describing the
    plan as still ahead, and `:225-234` already pins the same arm positively
    (`where.professionTags = { has:`). Merge: one test, one paragraph, no conditional.
  - (d) `src/lib/directory-rule.test.mjs:270-279` (`the profession filter arm survives for
    bookmarked links`) exists half to protect another test's slice boundary (its own comment,
    lines 273-277: "C-098's test above slices WHERE using `indexOf("if (filters.profession)")` as
    its END boundary -- delete this arm and that slice runs to end-of-file"). A test guarding a
    test's `indexOf`. Slice the C-098 branch with `balancedBlock` from the `if (filters.city)`
    brace instead and the guard's second purpose disappears; keep the one-line bookmark rationale
    as a positive `match`.
  - (e) `src/lib/gate-coverage.test.mjs:120` message: "only found N; the git grep broke" -- it has
    been a walk since C-189 (its own header says so). `:191` says post-visibility-rule "attacks
    the rule itself in 311 lines" (423 now).
  - (f) `src/lib/catchup-lifecycle.test.mjs:139-141` and `:169-170` slice `submitEntry` twice
    with the same four lines.
  - (g) `src/lib/purge-rule.test.mjs:142-143`: `const del = body.slice(body.indexOf("tx.user.deleteMany")); assert.ok(del, ...)`
    -- `slice(-1)` is a one-character string, so the guard is always truthy. The next line's
    `match` would still catch the deletion, so this is a dead guard rather than a vacuity.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: quoted above; for (c) `grep -c professionTags prisma/schema.prisma` is non-zero.
- **What to do**: (a) delete the `const seen = new Set...|` alternative from C-180 and its two
  surrounding lines, leave the three `loadingMoreRef` pins, and add a one-line comment pointing
  at append-page.test.mjs for the dedupe. (b) delete the four-line test. (c) delete lines 252-268
  and fold the `doesNotMatch(/jobTitle: \{ contains: needle/)` into the test at 210-235 with a
  dated sentence ("the free-text contains stood in for the tag until 2026-08-28"). (d) as above.
  (e) reword two strings. (f) hoist `submitEntry`'s slice to a module-level const. (g) replace
  with `assert.ok(body.includes("tx.user.deleteMany"), ...)`.
- **Saving**: ~35 lines; one contradiction and one stale future tense fewer.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.

### lib-tests-09 - Two scratch-shaped tests by CLAUDE.md's rule, and one file of styling pins that only exists because the subject is duplicated
- **Where**:
  - `src/components/common/pinch-zoom.test.mjs:41-55` (`the swipe kept the numbers it was tuned
    with`): pins the literals `SWIPE_FOLLOW = 0.14`, `SWIPE_DISTANCE = 70`, `SWIPE_VELOCITY =
    420` as source text. Born 2026-09-02 with the gesture rewrite (`122ac26`); its own message
    says why it was written: "Moving the swipe off Motion's drag was a gesture rewrite, not a
    re-tuning: these three ... carry over verbatim." That is a proof that the rewrite carried
    the numbers -- the fix session's own check -- and it stays green until somebody re-tunes,
    at which point it fails on a change that is not a regression. CLAUDE.md: "A scratch test is
    deleted, not committed. If it existed only to prove a fix worked in this session, remove the
    file before staging." Here it is one test of six, not a file.
  - `src/lib/upload-shared.test.mjs:95-98`: see lib-tests-08(b); same shape.
  - `src/components/auth/auth-first-frame.test.mjs` (125 lines, 21 tests): 20 class-string and
    copy snippets (`"px-[var(--space-l)] py-[var(--space-l)]"`, `"mt-1.5 text-right leading-none"`,
    `"text-[12.5px] font-medium text-muted-foreground"`, ...) each asserted to appear in BOTH the
    landing's stand-in and the real signup/login/trivia-gate file. This is a drift guard for a
    hand-copied column, and it is honest about that ("Nothing in the type system connects them,
    so this is the connection"). It is also, by construction, the "pin decisions, not styling"
    violation audit 1's survival rule named: every spacing tweak to /login breaks the suite. The
    test is the price of the duplication in `src/components/auth/auth-first-frame.tsx`; the
    duplication is the finding, and it is not in my territory.
- **Phase**: dead (the first two) / architecture (the third)
- **Tier**: T1 / T4     **Class**: cheap / structural     **Decides**: autonomous for the first
  two; owner for auth-first-frame (see Owner decisions)
- **Evidence**: quoted; `git log -1 -- src/components/common/pinch-zoom.test.mjs` = `122ac26
  2026-09-02 feat(viewer): the photograph can be pinched open`.
- **What to do**: delete the pinch-zoom constants test (the other five in that file pin
  mechanisms -- `touch-none`, no Motion `drag`, non-passive wheel, the 1:1 ceiling -- and stay).
  If the owner wants the feel frozen, the honest pin is a behavioural one against
  `pinch-zoom.ts` (does a 70px/420px-per-s gesture step?), not three literals. auth-first-frame:
  no change here; see the owner decision and the note to the auth lens.
- **Saving**: ~19 lines; one false-positive class on re-tuning.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high on the two scratch tests; the auth-first-frame call is the owner's.
- **Notes**: I looked hard for whole scratch FILES and found none. `verified-mark` (16 lines),
  `sidebar-support-icon` (22), `tour-mobile-verify` (26) are the audit-1 trims and each pins one
  owner decision. Every file born since 2026-08-27 (27 of them) opens with a dated reason and
  most quote the owner. That is the survival rule working without the gate it was going to get.

### lib-tests-10 - The suite floor is 42 files slack; raise it, and let the gate say which files are slow
- **Where**: `scripts/qa/check.mjs:59-70` (`MIN_TEST_FILES = 60`, "Raise it if it ever starts
  feeling close"), `:113-138` (the tests gate).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: 102 files today; audit 1 called 60-vs-75 "deliberately slack ... a taste call, not
  a finding". At 60-vs-102, 41% of the suite could stop being discovered before the floor
  noticed, which is past slack. The charter's question -- does the floor make deleting a
  vacuous test a chore -- answers itself: no, there is room for 42 file deletions, and deleting a
  *test* inside a file never touches the floor at all (it counts files). The gate also has no
  per-file timing, so the 1.6 s and 1.1 s files in lib-tests-12 were invisible until the
  orchestrator ran `node --test` by hand; `run()` already captures the moment each child closes.
- **What to do**: `MIN_TEST_FILES = 90` with the date and count in the comment (the fix session
  that deletes anything from this report should set it in the same commit, so the floor is never
  above the count). Optionally, in the tests gate, record `Date.now()` around each `run()` and
  append the three slowest files to the `detail` line (`... 102/102 passing; slowest avatar
  1.6s, upload-shared 1.1s, identity-row-overflow-rule 1.1s`) -- ~5 lines, so a slow test is
  seen the day it lands rather than at the next audit. The `findUnrunTests` guard is fine as is.
- **Saving**: 0 lines; the floor means something again.
- **Risk & gate**: low; `npm run check`; `scripts/qa/ci-parity.test.mjs` reads `check.mjs` and
  must stay green (it only asserts the two script names are present).
- **Confidence**: high on the floor; medium on the timing line (it is a nicety; skip if it
  clutters the one-line-per-gate output the header prizes).

### lib-tests-11 - Stale sentences about the suite in the docs that describe it
- **Where**: `CLAUDE.md:133` ("the unit-test suite (75 files as of 2026-08-25)" -- 102);
  `src/lib/avatar.test.mjs:2` ("run: `node src/lib/avatar.test.mjs`") -- still true and fine;
  `src/lib/catchups-core.test.mjs:4`, `map-cluster.test.mjs:1`, `app-icon-safe-zone.test.mjs:32`
  ("Run: node --test ...") -- true; `.claude/skills/check/SKILL.md:56` was corrected after audit
  1 and is right ("every standalone `*.test.mjs` the walk finds").
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **What to do**: CLAUDE.md line 133 -> "(102 files as of 2026-09-03)" or, better, drop the
  number so it cannot go stale again ("the unit-test suite, every `*.test.mjs` under `src/` and
  `scripts/`"). Ship it inside whichever lib-tests fix commit lands first (the one-commit rule).
- **Saving**: 0 lines.
- **Risk & gate**: none.
- **Confidence**: high.

### lib-tests-12 - The five slowest tests by construction, and what each one buys
- **Where** (from `raw/test-timings.txt`, `node --test` in one process):
  1. `src/lib/avatar.test.mjs` -- **1,593 ms**, the whole file (it is not `node:test`; it is a
     top-level script). Lines 151-163 run `hashSpeciesFor` **200,000** times to prove the hash
     never reaches the reserved Roller/Hoopoe indices; lines 68-80 run the mirror 16,000 times
     for the distribution bands; lines 116-127 compare mirror and real hash over 2,000 seeds.
     The 200k loop is the cost. Its purpose ("the assertion that would catch someone helpfully
     raising BIRD_SPECIES_COUNT") is statistical: if the pool were 51, each draw has a 1/51
     chance of landing on the Roller, so 5,000 draws miss with probability (50/51)^5000, about
     1e-43. 200,000 is 40x more than certainty.
  2. `a 108MP photo is refused in words that name the way out` (`upload-shared.test.mjs:67-93`) --
     **1,124 ms**: sharp encodes a 12,000x9,000 JPEG (108 megapixels) so that decoding it can be
     refused by `MAX_INPUT_PIXELS`. The test's reason for the real bytes is good ("the message is
     taken from sharp itself rather than typed from memory, so an upgrade that rewords it fails
     here"). I do not have a cheaper construction that keeps that property honestly: the refusal
     is raised on decode, and a hand-built header claiming 108 MP without the pixels is the kind
     of fixture exif-date.test.mjs argues against. Keep, and know what it costs.
  3. `overflow-*-visible is always written with the other axis clipped`
     (`identity-row-overflow-rule.test.mjs:45-60`) -- **1,064 ms**: lib-tests-05; fixable to ~60 ms.
  4. `every Collection photo's recorded size matches the file on disk`
     (`demo-seed/content.test.mjs:170-202`) -- **220 ms**: sharp `metadata()` on 2 x 18 WebP
     files. Audit-1 not-finding ("measuring beats trusting"); keep.
  5. `C-069: nothing calls delImage directly except the two places allowed to`
     (`image-purge-rule.test.mjs:199-214`) -- **218 ms**: reads 300+ files (`sources()`, line
     191) and decomments each. Pre-filter on `includes("delImage(")` before `decomment`, as in
     lib-tests-05.
  Sum of the five: 4,219 ms of the suite's 8,304 ms CPU (51%).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous (1, 3, 5); not proposed (2, 4)
- **What to do**: avatar: `200000` -> `20000` at line 153 with the arithmetic above in the
  comment (still 4x past certainty); the 16,000-sample distribution loop stays (its bands are
  tuned to N). identity-row and image-purge: the `includes` pre-filter.
- **Saving**: ~2.4 s CPU per check (avatar ~1.4 s, identity-row ~1.0 s, image-purge ~0.15 s).
  Wall-clock: small for the reason given in lib-tests-05; real for CI minutes and single-file
  runs.
- **Risk & gate**: low; avatar prints its own spans (`reserved: hash spans species a..b`) --
  compare before and after; `npm run check`.
- **Confidence**: high.
- **Notes**: sharp is imported at module level (not lazily) by `app-icon-safe-zone`,
  `exif-date`, `image-facts` and lazily by four others; each sharp load is ~50-100 ms of a
  process that then runs 20 ms of assertions. That is the price of testing against real bytes
  and I am not proposing to change it.

### lib-tests-13 - keyset's sweep has no count guard (the one vacuity-prone sweep left)
- **Where**: `src/lib/keyset.test.mjs:87-107`
- **Phase**: hygiene (anti-vacuity)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the test lists files by `git grep`, then for each `findMany({ ... })` block (a
  lazy regex to the first `\n  })`) asserts that a block containing `cursor: { id` does not
  order by `createdAt`. Nothing counts how many blocks were examined or how many contained a
  cursor, so an empty grep, a regex that stops before the `cursor:` line, or the last such
  query being migrated all yield a silent pass. I replayed its exact logic: 6 files, 19
  `findMany` blocks, 3 blocks with a cursor, 3 assertions run. Not vacuous today; the only
  full-tree sweep in the suite without the "only N found; the sweep has drifted" line that
  audit 1 added to the others (41 files now carry one).
- **What to do**: count `withCursor` and assert `>= 2` with the two legitimate sites named in
  the message (the directory and the admin people list, per the comment at lines 81-85). Do it
  when converting the `git grep` (lib-tests-01).
- **Saving**: 0 lines; one silent pass closed.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.

### lib-tests-14 - e2e: four clones inside collection-seek.spec.ts and helpers duplicated across the two Collection specs
- **Where**: `e2e/collection-seek.spec.ts` (623 lines): `raw/jscpd-e2e.txt` lists all four clones
  inside this one file -- 111-119 vs 521-525 (`readInChronologicalOrder` vs
  `readChronologicallyOnAPhone`: identical except the readiness wait), 129-142 vs 381-391 (the
  press-1953-and-wait opener, twice), 478-484 vs 608-617 (the scrollspy read: "which
  `h2[data-band]` is above 20% of the viewport", twice), 561-568 vs 584-591 (the
  wheel-then-grab-the-scrubber sequence, twice). Across files: `rail()` is defined in
  `collection-seek.spec.ts:37` and `collection-journeys.spec.ts:41`; `orderButton`/the Order
  menu click is in both; both define a `drawn()`-shaped evaluator with different fields.
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `raw/jscpd-e2e.txt` (4 clones, 34 lines, 2.09%); the two files read side by side.
- **What to do**: an `e2e/_collection.ts` (underscore so Playwright's `testMatch` never treats it
  as a spec; `playwright.config.ts` uses `testDir: "."`) exporting `rail`, `orderButton`,
  `chooseOrder`, `bandAtTop(page)` (the scrollspy read), `grabScrubber(page)`. Fold the two
  `read*Chronological*` helpers into one with a `readiness: "rail" | "heading"` argument.
- **Saving**: ~45 lines, 4 clones.
- **Risk & gate**: low; `npm run test:e2e` (needs the dev server and `/lab/collection`; the
  orchestrator's rules say a fix session runs it, this audit did not).
- **Confidence**: high.
- **Notes**: the other charter questions for e2e, answered: presence vs geometry --
  `collection-seek` 14 `toBeVisible()` / 8 `.poll(` / 15 rect reads; `collection-journeys` 9 / 2
  / 2; `deeplink` 1 / 2 / 1; `sidebar` 2 / 1 / 2; `collection-permalink` 0 / 1 / 0;
  `loading-fallbacks` asserts on the streamed HTML's first flush (neither); `visual` is the
  baseline suite (`toHaveScreenshot` + a `spine()` geometry check). Nearly every `toBeVisible`
  is a readiness wait before a geometry read, which is gotcha 7 applied correctly. Unit-rule
  duplicates: `loading-fallbacks.spec.ts` <-> `loading-boundary-rule.test.mjs` and
  `deeplink.spec.ts` <-> `notification-reach.test.mjs` are deliberate pairs (each names the
  other in its header: static rule + behavioural proof). `collection-seek` and
  `collection-journeys` drive different pages (`/lab/collection` fixture vs live `/collection`)
  for a stated reason. No e2e test duplicates a unit pin.

## Owner decisions

- **The landing's auth stand-in and the 20 styling pins that hold it together**
  (`src/components/auth/auth-first-frame.test.mjs`). The landing page draws a copy of the
  login/signup column while the bird flies in, so the handover to the real page is invisible.
  Because the copy is a hand-made duplicate, there is a test that checks twenty pieces of it
  still match the original, character for character -- padding, font sizes, the words "Welcome
  back". That test will fail every time somebody adjusts the spacing on the login page, which is
  the kind of failure that teaches sessions to ignore the suite. Two honest options: keep it as
  the price of the seamless landing (it is a real drift guard, and it says so), or have the
  landing render the actual column component so there is nothing to drift and the test shrinks to
  the two wiring assertions at its end. The second is the auth territory's call and yours; my
  recommendation is the second, because the pins are doing a job a shared component would do for
  free.
- **The tuning-number pin in the image viewer** (`pinch-zoom.test.mjs`, "the swipe kept the
  numbers it was tuned with"). Three numbers that set how the swipe feels are frozen in a test.
  If you consider the feel settled and want any change to it to be a deliberate act, keep it. If
  a session should be free to re-tune, delete it (my recommendation: delete; a settled feel is
  better recorded in the constant's own comment, which already exists).
- **Audit 1's survival-rule gate** (lib-tests-08 there): you asked for "stricter rules about
  which test scripts we keep". CLAUDE.md got one clause ("A scratch test is deleted, not
  committed"); the mechanical half -- `check.mjs` refusing a test file whose header names no
  finding or contract -- was never built. Reading all 102 files today: every file written since
  carries a dated reason, 63 name an audit id, 41 carry a drift guard, and I found no scratch
  file. The rule held without the gate. My recommendation is to close that item as not needed
  and spend the effort on lib-tests-01 instead; if you would rather have the gate anyway, it is
  the ~25 lines audit 1 described and is autonomous.

## Not-findings

Looked like bloat, verified intentional; do not re-litigate:

- **Rule tests that read source as text** -- audit 1 §5, and every such file states why in its
  header (no resolver, no `@/`, no Prisma, no browser under bare `node`).
- **Two rule tests with ESLint equivalents** (`confirm-dialog.test.mjs` <-> `no-alert`;
  `motion-namespace-rule.test.mjs` <-> a `no-restricted-syntax` on `motion.`). Rejected:
  `check.mjs:88-90` makes the lint gate `blocking: false` regardless of rule severity, so moving
  either pin to ESLint demotes a blocking tripwire to a warning a human triages. The tests are
  the only blocking home these rules can have. (A third, `session-revocation`'s "the select
  fetches every column the rule reads", could become a type in the auth lens's territory; noted
  below.)
- **`catchups-core.test.mjs` at 874 lines** -- it is `catchups.test.mjs` renamed on 2026-08-27
  (`9f9a1fd`, the pure-engine split); audit 1 already judged it earned and nothing has changed
  except the name.
- **`photo-layout.test.mjs` (501 lines, 729 triples x 3 columns)** -- 30 ms; the brief's own
  words ("all kinds of combinations of aspect ratios in the same post") are the reason.
- **`demo-seed/content.test.mjs` loading sharp over 36 files; `avatar.test.mjs`'s plain-JS
  mirror; `app-icon-safe-zone` reading a 512px PNG; `exif-date` building real EXIF/PNG bytes;
  `image-facts` compositing test images** -- each tests against real bytes for a reason its
  header gives; the cost is in lib-tests-12 for the record, not as a finding.
- **`text-width.test.mjs`'s twelve measured widths** -- a calibration table read off a real
  canvas, dated; that is a behaviour test, not a spelling pin.
- **The exemption tables** (`PUBLIC_BY_DESIGN`, `AUTHORISED_OTHERWISE`, `NO_INDEX_NEEDED`,
  `OWN_CONTENT`, `FROM_THE_DATABASE`, `SEARCHES_EVERYONE`, `BORDERLESS`, `MINTS_ITS_OWN_BYTES`),
  each entry reasoned, each with a "names only things that still exist" mirror -- the reviewed-
  decision pattern working. `MINTS_ITS_OWN_BYTES` is empty, so its mirror test runs over nothing
  today; its comment says so ("Empty today"), and the five lines are the slot an entry goes in.
- **`profession-tags.test.mjs:97-109`** -- says in its own words "Today nothing has a parent, so
  this passes vacuously -- and starts doing real work the day Healthcare splits". Declared, not
  accidental.
- **`scripts-ledger.test.mjs` using `git ls-files`** -- its header (lines 27-32) argues the
  opposite of C-189 on purpose: a ledger should not fail a shared checkout on a peer's untracked
  script. Correct for a ledger; the security sweeps are a different case (lib-tests-01).
- **`scripts/qa/hand-run-passes.test.mjs`** -- enforces `docs/spec/hand-run-passes.md` by
  discovering `*-pick.mjs`; the brief says the family's sameness may be the protocol, and this is
  the test that says what must match.
- **`ci-parity.test.mjs`** -- born 2026-09-02 after two CI-only failures; its YAML walker is the
  right size for a two-command allowlist.
- **`check.mjs`'s 102 parallel spawns** -- audit 1 §5; isolation per file is the point.
- **`test-kit.mjs` and `test-fn-body.mjs` in `src/lib`** -- audit 1 §5; bare-node relative
  import, nothing in production imports them, knip's config lists tests as entries.
- **`e2e/collection-seek.spec.ts` driving `/lab/collection`** -- documented (lines 22-25): the
  live archive is too small to exercise the rail; the room's 240 are deterministic.
- **`visual.spec.ts`'s masks and `live:` routes** -- every mask names the day it cried wolf.
- **`auth.setup.ts`, `playwright.config.ts`** -- every constant argued (the `maxDiffPixels`
  paragraph is the owner-detail standard at its best).
- **Em dashes in a handful of assertion messages** (`cascade-rule:140`, `purge-rule:26`,
  `verify-outcome-rule:58`) -- the house rule is about member-facing copy; a test failure message
  is not that.

## Audit-1 carry-overs in this territory

- **lib-tests-01 (shared kit)**: done (`68d4ad6`, `5caaa92`, `fa4863b`). Its optional "phase 2"
  (migrate the slice-to-next-export extractors to a kit `section()`) was deferred at fix time
  and is still open; the population grew from 12 files to 25 (lib-tests-04 here).
- **lib-tests-02 (gate-coverage adopts balancedBody)**: done (`9cee0d5`).
- **lib-tests-03 (spelling-pin cohort)**: done (`12d1fd5`); the survivors are one-decision files.
- **lib-tests-04 (tour-mobile-verify trimmed to the four security pins)**: done.
- **lib-tests-05 (escapeLike one home)**: done (`20af678`, two of three moved, third dropped as a
  duplicate -- correct).
- **lib-tests-06 (knip entries)**: done as `knip.jsonc` (`fe51a6c`).
- **lib-tests-07 (hygiene trio)**: done except the `walk` copy in `email-normalization-rule`,
  which the fix log itself flagged as left behind (lib-tests-07 here).
- **lib-tests-08 (survival rule + gate)**: CLAUDE.md clause landed; the gate did not; see Owner
  decisions.
- **Audit-1 refuted rows touching tests**: "the withMember/withAdmin wrapper collides with the
  C-189 tripwire" -- still true; `gate-coverage`'s `no action file exports a shape this sweep
  cannot see` (lines 123-151) is that tripwire and is intact.

## For other lenses

- **auth territory**: `src/components/auth/auth-first-frame.tsx` hand-copies 20 class strings
  and copy lines from `signup-client.tsx`, `login-client.tsx`, `trivia-gate.tsx`; the 125-line
  test exists to hold the copies together. A shared column fragment would delete both the
  duplication and most of the test (Owner decision above).
- **auth territory**: `src/lib/auth.ts`'s session `select` could carry `satisfies` against the
  parameter type of `sessionRevoked` (or the rule's row type could be `Pick<User, ...>` derived
  from the select), which would make `session-revocation.test.mjs:84-105` a type rather than a
  text pin.
- **catchups territory**: `src/app/(main)/catchups/actions.ts` is the file one test reads eleven
  times; at ~2,050 lines it is the largest action file the suite slices (17 hand-rolled slices
  target it across catchup-lifecycle, demo, group-succession).
- **docs lens**: `CLAUDE.md:133` says "75 files as of 2026-08-25" (102).
- **scripts lens**: `scripts/qa/hand-run-passes.test.mjs` reads `scripts/dev` and `CLAUDE.md`
  relative to cwd; it works under `check.mjs`'s `chdir` and from the repo root only.
- **collection territory**: `river-query.test.mjs:1-24` and `collection-journeys.spec.ts:3-39`
  are the best written account of the 2026-09-02 state-machine bugs (duplicate keys, the
  runaway climb); if the collection agent proposes touching `collection-client.tsx`'s fourteen
  pieces of state, these two files are the spec.
- **the peer's WIP**: `src/components/common/image-viewer.tsx` was modified and uncommitted at
  charter time and is clean now; `image-viewer-chrome.test.mjs` (born today) and
  `pinch-zoom.test.mjs` pin it.

## Metrics

- Files: 102 tests (87 `src/lib`, 11 `src/components`, 6 `scripts/qa`) + 2 kit + 1 runner + 9
  e2e = 114; all read fully. Lines: 15,127 in the tests (`wc -l`), 9,297 code in the lib tests
  (cloc); kit 176; runner 273; e2e 1,625. Tests: 1,005 top-level (`node --test` TAP; 926 by a
  `test(` grep, the rest generated in loops); 8,304 ms CPU in one process.
- Kind split, by file: **39 pure text-pin** (no `./*.ts` import), **32 hybrid** (import a real
  module AND read source), **31 pure behaviour**. So "rule tests" are 71 of 102 files by a
  strict reading (any source reading), 39 by a narrow one.
- Kit adoption: 61/102 import `test-kit.mjs`; 1 imports `test-fn-body.mjs` directly
  (composer-rule); 3 still build a root with `fileURLToPath`; 16 files hand-roll `readFileSync`
  where `read` would do (lib-tests-06); 9 files / 10 sites shell out to git (lib-tests-01);
  `balancedBody` used in 4 files; hand-rolled slicers 49 sites in 25 files (lib-tests-04);
  `decomment(read(` spelled 189 times.
- Vacuity: 0 accidental; 2 declared (profession-tags parent loop, MINTS_ITS_OWN_BYTES mirror);
  1 sweep without a count guard (keyset); 1 dead guard (purge-rule:143). 41 files carry an
  explicit drift guard phrase; 63 name an audit/bug id.
- Scratch by CLAUDE.md's definition: 0 files, 2 tests (pinch-zoom constants, upload-shared
  C-072 arithmetic).
- Duplicate/disagreeing pins: 7 sites (lib-tests-08 a-g).
- Slow by construction: avatar 1,593 ms, upload-shared 108MP 1,124 ms, identity-row 1,064 ms,
  demo-seed 220 ms, image-purge C-069 218 ms = 51% of suite CPU; full-tree sweeps in 8 files.
- Age: 27 files born after audit 1 closed (2026-08-27 or later); the oldest surviving shape is
  avatar.test.mjs (2026-08-04, top-level script, deliberately).
- Biggest files: catchups-core 874, photo-layout 501, post-visibility-rule 423,
  catchup-lifecycle 401, security-regressions 398, unattended-rule 353, river-cursor 328 -- each
  itemised per finding id; none padded.
- Runner: `MIN_TEST_FILES = 60` vs 102 discovered; `findUnrunTests` excludes `e2e/` by design.
- jscpd: tests 2 clones (both intra-file: photo-layout 431-441/453-458, purge-rule 35-40/131-139
  -- both are the same `read` + slice preamble the memoised `code()` of lib-tests-03 would
  absorb); e2e 4 clones, all in collection-seek.spec.ts (lib-tests-14).
- Estimated honest total: ~2.4 s CPU per check, 10 process spawns, ~60 redundant reads, ~120
  lines, 4 e2e clones, one fewer fail-open class in two security sweeps, the suite floor made
  meaningful. The structural well here is lib-tests-01/02/04; the rest is cheap and should ride
  along in the same files' commits.
