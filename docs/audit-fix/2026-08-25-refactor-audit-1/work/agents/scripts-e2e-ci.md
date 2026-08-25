# scripts-e2e-ci - simplification audit report

Territory reader for the tooling that is not the app: `scripts/` (54 script files + README,
8,967 lines), `e2e/` (5 TS files, 590 lines, plus 22 baseline PNGs, 17MB), `.github/` (4
workflows + renovate.json, ~549 lines), the tracked parts of `.claude/` (8 agents = 650 lines,
93 skill files in 50 skill directories = 19,269 lines), the `scripts` block in `package.json`,
and `.puppeteerrc.cjs`. Charter also asked for the owner's "close it out" convention, designed
concretely. Date: 2026-08-25. Files in territory: ~160 tracked; read fully: 24; header+structure
read: every script in `scripts/` and every agent; listed+sampled: the 93 skill files.

## Coverage

- **Read fully**: `scripts/README.md`, `scripts/qa/check.mjs`, `scripts/qa/crawl.mjs`,
  `scripts/qa/_probe-kit.mjs`, `scripts/dev/run-sql.mjs`, `scripts/demo/run-sql.mjs`,
  `e2e/visual.spec.ts`, `e2e/playwright.config.ts`, `e2e/auth.setup.ts`, `e2e/sidebar.spec.ts`,
  `e2e/deeplink.spec.ts`, all four workflows, `.github/renovate.json`, `.puppeteerrc.cjs`,
  `package.json` scripts block, `.claude/skills/check/SKILL.md`,
  `.claude/skills/screenshot-auth/SKILL.md`, plus `docs/OPERATIONS.md` and the gates section of
  `docs/SECURITY.md` as context.
- **Header + structure read (first 20-40 lines, imports, and the routes/tables they drive)**:
  every remaining file in `scripts/qa/`, `scripts/dev/`, `scripts/demo/`, `scripts/ops/`,
  `scripts/gen-support-qr.mjs`; all 8 `.claude/agents/*.md`; the SKILL.md frontmatter of
  `liftkit-spacing`, `ui-audit`, `goal-sloc`, `code-simplifier`. For each script I verified what
  references it (grep across docs/src/.github/e2e/package.json), when it was last touched
  (`git log -1`), and that its imports and target routes still exist.
- **Skimmed (why)**: the bodies of the 2,340-line phase-probe set and the 701-line
  `audit-status.mjs` - their headers state their contract precisely, every import resolves, and
  the question for this audit was liveness and ownership, not internal quality. The 86 generic
  skill files (impeccable/superpowers/code-review-skill/front-*) - they are vendored imports;
  I counted them rather than critiqued them.
- **Not read**: the interior prose of the generic skills; the PNG baselines beyond listing and
  sizing them.
- **Uncommitted edits seen (someone else's WIP)**: my charter warned that
  `scripts/qa/phase7-probe.mjs` (plus `next.config.ts`, `src/lib/admin.ts`, a test, and a new
  `forbidden.tsx`) carried uncommitted edits from another session. By the time I ran, those had
  been **committed** as `c74d99f feat(admin): a non-admin who asks for /admin is told 'nice try'`;
  `git status` in my territory is clean apart from this audit's own untracked output. I judged
  the committed (HEAD) versions throughout. Nothing was touched.

## Summary

This territory is in far better shape than the owner's complaint would suggest - but the
complaint is still exactly right about the one thing that matters. The scripts folder has a
written rule ("if a line has no owner and answers no live question, delete both", README line 3)
and **nothing enforces it**: 22 of the 54 scripts are absent from the README today, including the
entire 2,340-line phase-probe set, both `ops/` scripts that a nightly workflow depends on, and
four `dev/` tools. Almost none of those 22 are actually dead - I traced every one to a live
reference (SECURITY.md's verification arm, check.yml, snapshot.yml, comments in the code they
regenerate) - but nothing distinguishes them from the next session's abandoned scratch probe,
which is precisely how the folder got to 63 files once before. The fix is one small test file
that check.mjs already knows how to discover, plus a six-line session-close checklist; both are
specified verbatim in finding 01.

The genuinely large number in this territory is not scripts at all: **18,881 of the 19,269
tracked skill lines (98%) are generic imports** - vendored public skill packs
(code-review-skill with its LICENSE and .hive/ working files, 21 impeccable rooms, 14
superpowers files that duplicate an installed plugin, two front-* packs) - and 5 of the 8
agents are generic imports too (they address a user named "Daisy" and one pins `model: opus`
against this repo's own tier rule). Those are relocations, not deletions, and they are owner
calls; the numbers are in findings 02 and 03.

The e2e suite, the four workflows, and renovate.json are the opposite of bloat: small,
argued-for, and current. All 22 baseline PNGs map 1:1 onto live ROUTES entries; all four
workflows fire on valid schedules with the secrets OPERATIONS.md names. Structural vs cheap:
findings 01-05 are structural, 06-08 are cheap/hygiene. What surprised me: the discipline
gradient - the newest tooling (check.mjs, the workflows, e2e) is exemplary, and the drift is
concentrated in exactly the places no gate reads: the README ledger, the skill route lists, and
crawl.mjs's hand-maintained route array.

## Findings

### scripts-e2e-ci-01 - Enforce the scripts README ledger with a test the check gate already discovers, and adopt the "close it out" checklist
- **Where**: `scripts/README.md` (whole file, 74 lines); new file `scripts/qa/scripts-ledger.test.mjs`; `CLAUDE.md` "Working agreement" section (checklist insertion point)
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (the gate); the checklist wording is a one-paragraph owner sign-off
- **Evidence**: README line 3 states the rule; README line 6 records the last manual cull (63 -> 32 files, 2026-08-08). Today `git ls-files scripts` shows 54 scripts and the README names 32 of them. The 22 unlisted: `qa/_dev-login.mjs`, `qa/_probe-kit.mjs`, `qa/audit-status.mjs`, `qa/npm-audit-gate.mjs` (+ its `.test.mjs`), `qa/hoopoe-idle-check.mjs`, `qa/phase3-probe.mjs` through `qa/phase10-probe.mjs` (8 files), `qa/phase4-prod-check.mjs`, `dev/email-mark.mjs`, `dev/generate-icons.mjs`, `dev/import-roster.mjs`, `dev/set-password.mjs`, `demo/run-sql.mjs`, `ops/prune.mjs`, `ops/snapshot.mjs` (the README has no `ops/` section at all, though `snapshot.yml` runs both nightly). Every one of these traces to a live owner (see Not-findings), so the ledger is wrong, not the folder - but the ledger being silently wrong is the exact failure mode that cost the owner a 30-40k-line manual cleanup. This repo already solved this class of problem twice: check.mjs's test-floor (C-195) and lab-audit.mjs (the anti-stranding check) are both "a written rule, now enforced".
- **What to do**:
  1. Add `scripts/qa/scripts-ledger.test.mjs` (~45 lines). It (a) runs `git ls-files scripts`
     and keeps every `*.mjs|*.mts|*.ts` except `*.test.mjs`; (b) reads `scripts/README.md` and
     collects every backticked token ending in one of those extensions plus every bare filename
     in table rows; (c) throws, naming names, if any tracked script has no README line
     ("no owner and no line - write the line or delete the script") or any README-named script
     no longer exists on disk. No wiring needed: check.mjs's `findTests` walks `scripts/` for
     `*.test.mjs` automatically, and check.yml runs `npm run check` on every push, so the gate
     is in CI the moment the file exists.
  2. Backfill the 22 missing README lines in the same commit (one line each; the headers I
     quote in this report are the source - each script already states its own reason).
  3. Add the six-line "close it out" checklist to CLAUDE.md's Working agreement:
     - *Scratch files*: every probe/test this session created is deleted, unless it would catch
       a future regression - in which case it gets its README line now (the ledger gate forces
       this).
     - *Tree*: `git status --short` shows only (a) files committed by name this session,
       (b) other sessions' WIP, left exactly as found.
     - *Gates*: `npm run check` green; `npm run visual` run if any UI changed.
     - *Record*: `progress.md` entry staged inside the work's commit, including what is left
       undone so "continue" works after a crash.
     - *Disk*: this session's shots pruned from `temporary screenshots/` (folder is 91MB today;
       see finding 09).
     - *Nothing pushed* unless the owner asked.
- **Saving**: 0 lines now (~+120: the test + 22 README lines); prevents the next 30k-line
  manual cleanup, which is the owner's stated problem
- **Risk & gate**: low; the new test is itself run by `npm run check`, and a false positive is
  a one-line README fix
- **Confidence**: high. The one thing that would change my mind: if the owner prefers the
  opposite rule (delete-by-default at session end, no ledger), the gate inverts to "scripts/qa
  may not gain files without a README line" - same mechanism either way.
- **Notes**: I considered putting the enforcement inside check.mjs as a sixth gate and rejected
  it: a standalone `*.test.mjs` needs zero changes to check.mjs, is discovered by the existing
  walk, and rides the existing `tests` gate's blocking behaviour. I also considered a broader
  "no file older than N days with zero references" rule and rejected it as unenforceable
  without the false positives that train people to ignore gates (npm-audit-gate.mjs's header
  makes this exact argument). Do not add a new npm command for the checklist - the owner's
  standing feedback is "no tooling for its own sake", and six lines of prose plus one test file
  is the whole machine.

### scripts-e2e-ci-02 - Owner decision: move the generic imported skill packs out of the repo once the audit rounds finish
- **Where**: `.claude/skills/` - 46 of the 50 skill directories: `code-review-skill/` (23 files,
  7,874 lines), `impeccable-*` (21 dirs, 3,490 lines), `superpowers-*` (14 dirs, 3,157 lines),
  `front-refactor/` + `front-review/` (20 files, 2,635 lines), `VibeSec-Skill/` (758),
  `planning-with-files/` (241), `goal-sloc/` (3 files, 187), `bug-hunt-swarm/` +
  `review-swarm/` (4 files, 348), `code-simplifier/` (116), `find-bugs/` (75)
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: owner
- **Evidence**: Tracked skill lines total 19,269; the four repo-authored skills (`check` 62,
  `screenshot-auth` 72, `liftkit-spacing` 162, `ui-audit` 92) are 388 lines - **2%**. The
  `.gitignore` comment that justifies tracking `.claude/skills/` (lines 80-86) argues these
  files "were written for this repo, encode the design system... and existed in exactly one
  place on one machine" - true of the four, and of none of the imports: `code-review-skill/`
  ships a `LICENSE`, a `.nojekyll`, its own `.gitignore` and a `.hive/` working directory
  (vendored from a public GitHub repo); the `superpowers-*` files are byte-siblings of the
  **installed superpowers plugin** - this session's own skill listing shows every one twice,
  once as repo `superpowers-brainstorming` and once as plugin `superpowers:brainstorming`, so
  the repo copies are pure duplication on any machine with the plugin; five agents and skills
  address a user named "Daisy" (imported verbatim). The audit packs (`code-review-skill`,
  `find-bugs`, `code-simplifier`, `front-*`, `goal-sloc`, `bug-hunt-swarm`, `review-swarm`)
  were imported deliberately for the two pre-release audits (`docs/planning/bug-audit-prompt.md`
  references them 9 times) - that reason expires when the audit's fixes are executed.
- **What to do**: after the simplification fixes are executed (not before - this audit's own
  agents are using goal-sloc and code-simplifier right now): move the 46 generic directories to
  `~/.claude/skills/` (user-level skills resolve identically; CLAUDE.md's `/impeccable`,
  `/frontend-design` and "superpowers systematic debugging" references keep working), or simply
  delete the 14 `superpowers-*` dirs (the plugin already provides them). Keep `check`,
  `screenshot-auth`, `liftkit-spacing`, `ui-audit` tracked - they are named by path in CLAUDE.md
  and are this repo's own work. Update the `.gitignore` exception comment if the policy narrows.
- **Saving**: ~18,881 lines / 96 files of markdown out of the repo (a move, not a deletion -
  counted separately from code savings); repo tracked-line count drops ~12%
- **Risk & gate**: low; skills are never imported by application code. Gate: `npm run check`
  still green (nothing in src/ references them), and a smoke-test that `/impeccable` and
  `/frontend-design` still resolve from the user dir in a fresh session.
- **Confidence**: high on the mechanics; the decision is genuinely the owner's because it
  trades "one `git clone` restores everything" against "the repo carries 19k lines of someone
  else's prose". My recommendation: do it - the superpowers duplication alone shows the repo
  copies drifting from their upstream, and the .gitignore's own stated rationale does not cover
  them.
- **Notes**: If the owner keeps any pack in-repo, `code-review-skill/.hive/` (PROTOCOL.md,
  memory.md, tasks.md - another tool's working state) and `.nojekyll` should go regardless;
  they are not skill content. Related: finding 03 (same decision for agents).

### scripts-e2e-ci-03 - Owner decision: the five generic agents ride along untracked-by-CLAUDE.md; move or delete them
- **Where**: `.claude/agents/code-reviewer.md` (47 lines), `comment-analyzer.md` (70),
  `pr-test-analyzer.md` (69), `silent-failure-hunter.md` (130), `type-design-analyzer.md` (110)
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: owner
- **Evidence**: CLAUDE.md's subagent table names exactly three agents (`screenshot-qa`,
  `design-protocol-auditor`, `write-path-reviewer`) - the three that were written for this repo
  (scoped tools, `model: sonnet`, repo-specific instructions). The other five are generic
  imports: three of them address the user as "Daisy" in their own examples
  (`pr-test-analyzer.md`, `silent-failure-hunter.md`, `type-design-analyzer.md`), and
  `code-reviewer.md` pins `model: opus`, contradicting CLAUDE.md's own rule ("Model tiers:
  Sonnet for implementation and review agents... Opus only for an ambiguous product or design
  call"). Nothing in the repo references any of the five.
- **What to do**: move the five to `~/.claude/agents/` (or delete; `code-reviewer`'s job is
  covered by the built-in `/code-review` skill this environment ships). Keep the three
  CLAUDE.md names. 426 lines leave the repo.
- **Saving**: 426 lines / 5 files (a move)
- **Risk & gate**: low; agents are configuration, not code. Gate: none needed beyond a fresh
  session listing its agents.
- **Confidence**: high. Would change my mind: evidence in progress.md that a past session was
  told to use one of the five by name (I found none).
- **Notes**: every agent definition loads into every session's context as a description line,
  so this is one of the few findings here with a per-session token cost, not just repo weight.

### scripts-e2e-ci-04 - Delete `scripts/demo/run-sql.mjs`; it is superseded by `dev/run-sql.mjs --env`, which is the documented path
- **Where**: `scripts/demo/run-sql.mjs` (67 lines); `scripts/dev/run-sql.mjs:43-55` (the guard
  gets ported here)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Zero references: `grep -rn "demo/run-sql"` across docs, src, scripts, CLAUDE.md,
  AGENTS.md hits only the file's own usage comments; `docs/spec/demo.md` (the demo runbook)
  never mentions it; the README's demo table lists four scripts and not this one. The
  documented way to run SQL against the demo database is `scripts/dev/run-sql.mjs --env
  .env.demo` (docs/TRAPS.md:20-21, and dev/run-sql's own header explains the `--env` flag was
  added 2026-08-21 for exactly this). Timeline confirms supersession: demo/run-sql last touched
  2026-08-20, dev/run-sql gained `--env` 2026-08-21. The one thing demo/run-sql has that
  dev/run-sql lacks is the safety check at its lines 24+41: it refuses any connection string
  not carrying the demo project ref `cbvlzptghkuxhygyaezq`.
- **What to do**: port the guard - in `dev/run-sql.mjs`, when `envFile` is `.env.demo`, refuse
  a connection string that does not contain the demo ref (~8 lines, keep the constant and the
  refusal message verbatim); then delete `scripts/demo/run-sql.mjs`. No README line to remove
  (it never had one - see finding 01).
- **Saving**: ~59 net lines, 1 file
- **Risk & gate**: low-medium - both scripts touch live databases, so the port must be exact.
  Gate: `npm run check` (the ledger test from 01, once it exists, confirms the README matches);
  proof of the guard is a dry read, not a run - do NOT test by executing SQL.
- **Confidence**: high. Would change my mind: any session log showing demo/run-sql chosen over
  dev/run-sql for a reason (I searched progress.md references and found none).
- **Notes**: the inverse (keep demo/run-sql, drop `--env` from dev/run-sql) loses TRAPS.md's
  documented single-tool story and touches three doc files instead of zero. jscpd already
  flags the clone between `demo/apply-schema.mjs` and `demo/run-sql.mjs` (6 lines, 81 tokens);
  this deletion clears it.

### scripts-e2e-ci-05 - Owner decision: retire phase6-probe and phase9-probe, whose questions were one-time; keep the rest of the probe set as SECURITY.md's verification arm
- **Where**: `scripts/qa/phase6-probe.mjs` (146 lines), `scripts/qa/phase9-probe.mjs` (86
  lines); context: the full set `phase3..phase10 + phase4-prod-check` is 2,340 lines
- **Phase**: dead (these two); the rest are a not-finding
- **Tier**: T1     **Class**: structural     **Decides**: owner
- **Evidence**: docs/SECURITY.md:128-130 names `phase{4..10}-probe.mjs` as the standing
  behavioural verification: "Run the relevant one after touching its area." That defends the
  set as a whole - these are not leftover scratch probes, whatever they look like. But two
  members answer questions that cannot recur: **phase6** proved that the one-time dependency
  upgrade (next-auth beta.30 -> beta.32, Next 16.2 -> 16.3) did not break sign-in - a fact
  about an upgrade that already shipped; its other checks (headers present, a session opens a
  members-only route) are pinned statically by audit-status and behaviourally by every other
  probe's sign-in step. **phase9** proves that check.yml's gates gate - by *renaming check.yml
  aside mid-run* to watch audit-status fail, a trick that mutates the working tree and would
  corrupt a parallel session's view of it (this repo's own multi-session rule); its two halves
  are each already proven in both directions elsewhere (npm-audit-gate has a unit test feeding
  it a crafted advisory; audit-status runs with `--fail-on-open` on every push).
- **What to do**: owner says yes/no. On yes: delete the two files, edit SECURITY.md:128 from
  `phase{4..10}` to name the surviving set, and give the survivors their README lines (finding
  01 forces this). On no: just the README lines.
- **Saving**: 232 lines / 2 files
- **Risk & gate**: low. Gate: `security-regressions.test.mjs` stays green (it does not
  reference the probes); SECURITY.md edit reviewed by eye.
- **Confidence**: medium-high. Would change my mind: an owner practice of re-running phase6
  after every next-auth Renovate PR - if that is the intent, it should say so in the README
  line instead of being deleted (next-auth is on a beta that Renovate holds for 7 days
  precisely because it can change shape).
- **Notes**: I explicitly considered and rejected recommending deletion of the whole probe set
  (2,340 lines would be this territory's biggest code number): phase4 (rate limiting), phase5
  (upload/deletion against real R2), phase8 (retention purge including R2 objects) and
  phase10 (origin checks) verify behaviour that no unit test in this repo can reach, they are
  the documented re-verification path in the canonical security doc, and the owner's security
  memory treats that overhaul as a keystone. Deleting them to score lines would be exactly the
  anti-gaming failure the brief warns about. phase3 sits outside SECURITY.md's `{4..10}` range
  but is named twice by audit-status.mjs output ("run phase3-probe for behaviour",
  audit-status.mjs:307,316) - keep, and fix the SECURITY.md range to `{3..10}` while in there.

### scripts-e2e-ci-06 - Four probes hand-roll the same .env parsing loop next to the shared helper that exists for it
- **Where**: `scripts/qa/phase6-probe.mjs:28-35`, `phase7-probe.mjs:30-36`,
  `phase8-probe.mjs` (same block), `phase10-probe.mjs` (same block); the helper:
  `scripts/qa/_probe-kit.mjs:12-14` (`loadEnv`)
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each carries an identical ~8-line `readFileSync(".env")` parse loop with quote
  stripping and no-override semantics; `_probe-kit.mjs` exports `loadEnv()` (dotenv, which also
  never overrides existing vars - same semantics) and its header exists precisely because
  "audit R6 was nine hand-copied sign-in blocks quietly diverging". All four files already
  import from `_probe-kit.mjs` for `makeLedger`. jscpd flags the sibling clones.
- **What to do**: replace each loop with `loadEnv(repoRoot)` (already imported-adjacent);
  ~8 lines removed per file. If finding 05 retires phase6, three files remain.
- **Saving**: ~24-32 lines
- **Risk & gate**: low; the semantics match (dotenv does not override). Gate: none automated
  runs these - a careful diff is the proof, plus the next manual probe run.
- **Confidence**: high
- **Notes**: same-day authorship explains it: the probes and the kit landed within hours on
  2026-08-20. This is the LLM-bloat signature 4/5 in miniature - not worth doing alone, worth
  doing while executing 05.

### scripts-e2e-ci-07 - The tooling's own docs have drifted: stale test counts and dead routes in three SKILL files and the README
- **Where**: `scripts/README.md:21` ("all 14 `*.test.mjs` in parallel, ~17s");
  `.claude/skills/check/SKILL.md:8` ("~17s") and `:53` ("the 14 standalone `*.test.mjs`
  scripts"); `.claude/skills/screenshot-auth/SKILL.md:59-73` (route list);
  `.claude/skills/ui-audit/SKILL.md:14-22` (route list)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the suite is 75 test files (CLAUDE.md, "75 files as of 2026-08-25") with a
  floor of 60 (`check.mjs:69 MIN_TEST_FILES`), not 14; the run is ~23-26s. screenshot-auth's
  "Authenticated Routes" list names `/groups`, `/groups/[id]`, `/settings` and `/donate` as
  pages - `src/app/(main)/` contains no `groups` or `settings` route, and `/donate` survives
  only as a redirect to `/support` (crawl.mjs:16-17 documents this); it also names `/verify`
  "magic link" (the auth is credentials now). ui-audit's Step-1 list has the same three dead
  routes. An agent following these skills verbatim screenshots 404s.
- **What to do**: README line 21 -> "all 75 `*.test.mjs` (floor 60), ~23s"; check/SKILL.md same
  two spots; replace both route lists with the live set (`/feed`, `/directory`, `/letters`,
  `/catchups`, `/collection`, `/support`, `/birds`, `/about`, `/admin`, `/messages`,
  `/notifications`, `/profile/[id]`, `/welcome`, `/pick-bird`, `/notice`, `/dark-mode`) or -
  better - point both at crawl.mjs's list as the single source, since README already declares
  that list hand-maintained.
- **Saving**: 0 lines; correctness of the instructions every future session reads
- **Risk & gate**: none. Gate: eyeball.
- **Confidence**: high
- **Notes**: counts in prose rot on a schedule; where a number must appear, the repo's own
  pattern (a floor, not a count - C-195) is the better shape. "10 routes x 2 viewports" in
  OPERATIONS.md/CLAUDE.md has the same disease (ROUTES has 11) - that file is another lens's
  territory; listed under "For other lenses".

### scripts-e2e-ci-08 - crawl.mjs's hand-maintained route list has lost five live routes
- **Where**: `scripts/qa/crawl.mjs:18`
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the README's own line for `verify:crawl` says "Its route list is hand-maintained:
  update it when you add or delete a page." The list covers 17 destinations;
  `src/app/(main)/` also contains `birds`, `notice`, `notifications`, `pick-bird`, `welcome` -
  none crawled. `/birds` is in the visual suite (so a 500 there is caught), but the other four
  have no automated eye on them at all; `verify:crawl`'s whole point per CLAUDE.md is "every
  live route signed in".
- **What to do**: append `'/birds','/notifications','/notice','/pick-bird','/welcome'` to the
  array (one line). Consider a comment: "cross-check against `ls src/app/(main)` when adding".
- **Saving**: -1 line (it grows); restores the tool's stated contract
- **Risk & gate**: low. Gate: the next `npm run verify:crawl` run reports 200s (do not run it
  in this audit session).
- **Confidence**: high
- **Notes**: I considered proposing the list be derived from the filesystem and rejected it:
  dynamic segments need seed ids anyway (OWN/OTHER profile cuids at lines 11-12), and a
  hand-list with a gate note is this folder's idiom. If drift recurs, the ledger-test pattern
  from 01 extends naturally ("every `(main)` dir appears in crawl.mjs or in an exempt list").

### scripts-e2e-ci-09 - Untracked disk weight the close-out convention should own: 138MB of session leftovers
- **Where**: `temporary screenshots/` (91MB, gitignored), `e2e/.output/` (40MB, last failure
  artifacts), `.claude/_disabled-gsd/` (7.4MB, gitignored, a disabled workflow system)
- **Phase**: dead (disk, not repo)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous for the first two;
  owner for `_disabled-gsd`
- **Evidence**: none of the three is tracked, so the repo is clean - but the owner's complaint
  is explicitly about "storage space of this folder". `temporary screenshots/` is the declared
  dump for every QA script (README line 15) and nothing ever empties it. `e2e/.output` is
  Playwright's per-run scratch; it self-overwrites per test but keeps the latest failure set
  including traces. `.claude/_disabled-gsd` is an entire retired agent framework (its own
  agents, workflows, templates, a migration journal from June) kept under a `_disabled-` prefix.
- **What to do**: the close-out checklist (finding 01) prunes `temporary screenshots/` per
  session; a periodic `find "temporary screenshots" -type f -mtime +14 -delete` is enough -
  no new tool. `e2e/.output`: leave; it is self-limiting. `_disabled-gsd`: ask the owner once -
  it has been disabled since June; if no session has re-enabled it by now, delete (7.4MB, and
  its files surface in repo-wide greps, which is how it kept appearing in this audit's
  searches).
- **Saving**: ~98-138MB disk; 0 repo lines
- **Risk & gate**: none for the screenshot prune (they are, by name, temporary); the
  `_disabled-gsd` delete is irreversible - hence owner.
- **Confidence**: high
- **Notes**: I did not touch any of it. The `.DS_Store` situation is already correct (ignored
  at `.gitignore:24`, zero tracked).

### scripts-e2e-ci-10 - Owner note: the visual baselines have already written 63MB into git history and grow ~17MB per rebaseline
- **Where**: `e2e/__screenshots__/` (22 PNGs, 17MB working copy; 81 blobs / 62.9MB across 15
  commits in history)
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: `git rev-list --objects --all -- e2e/__screenshots__` -> 81 blobs, 62.9MB.
  Every intentional UI change that runs `visual:update` re-commits up to 17MB (desktop 13MB -
  full-page shots of image-heavy routes like /collection and /feed dominate; mobile 4.1MB).
  History only grows; at the current cadence (15 baseline commits in ~6 days since 2026-08-19)
  this is on the order of 1-2GB of history within a year of active development.
- **What to do**: nothing yet - this is a heads-up with a threshold, not a change request. The
  suite's value (OPERATIONS.md section 1) comfortably outweighs 63MB. When clone size starts
  to hurt (say, history over 500MB), the options in order of preference: (a) shallow-clone for
  CI (free, no repo change); (b) `git lfs` for `e2e/__screenshots__/**` (keeps workflow
  identical, needs LFS quota); (c) trim ROUTES' fullPage on the two heaviest routes to
  viewport-height shots (loses below-fold coverage - a real trade, owner call).
- **Saving**: 0 today; caps a growth curve
- **Risk & gate**: none today
- **Confidence**: high on the numbers; medium on the growth projection (rebaseline cadence
  should fall as the design settles)
- **Notes**: all 22 PNGs are live - names map exactly onto the 11 ROUTES x 2 projects; there
  are no orphaned baselines to delete, which was my charter's direct question. Do NOT propose
  shrinking `maxDiffPixels` or the viewport to save bytes; the config's comments document why
  both are the size they are.

## Owner decisions

1. **Move the imported skill packs and generic agents out of the repo** (findings 02, 03).
   Your repo carries 19,269 lines of Claude "skill" instructions, of which 98% are public
   packs imported from elsewhere - one of them duplicated line-for-line by a plugin already
   installed on this machine, several addressed to a stranger named Daisy. They cost nothing
   at runtime, but they are 96 files of someone else's prose in your project's history, and
   they are why `.claude/` looks so much bigger than the four skills actually written for
   this site. Recommendation: after the current audit's fixes are done, move them to your
   user-level Claude folder (they keep working exactly the same) and keep only the four
   repo-specific ones tracked. Zero behaviour change; the repo sheds ~19k lines.
2. **Retire two of the ten security probes** (finding 05). Two probes answered questions that
   cannot be asked twice ("did that one upgrade break login", "does the CI gate gate") and one
   of them moves files around in the working tree while it runs, which your own multi-session
   rule forbids. The other eight remain your security suite's hands-on verification and I
   recommend keeping every one. Recommendation: retire the two, 232 lines.
3. **Delete `.claude/_disabled-gsd/`** (finding 09). A whole retired agent system, disabled
   since June, 7.4MB. If nothing has re-enabled it in two months it is a museum piece.
   Recommendation: delete.
4. **The screenshot-baseline history** (finding 10). Nothing to do now; the number to remember
   is that every approved visual change writes ~17MB into permanent git history. Revisit if
   cloning ever feels slow.
5. **The close-out checklist wording** (finding 01) - the mechanism is autonomous, but the
   convention binds your sessions, so the six lines should go in with your sign-off.

## Not-findings

Things that look like bloat and are verified intentional - do not re-litigate:

- **The phase3-10 probe set as a whole** (2,340 lines, none in the README): defended by
  docs/SECURITY.md:128-130 as the standing behavioural verification arm ("Run the relevant one
  after touching its area") and cross-referenced from audit-status.mjs output at lines 219,
  307, 316, 346, 373, 507. The README omission is finding 01; the files are not dead (except
  the two in finding 05).
- **`audit-status.mjs` at 701 lines**: wired as `npm run audit:status` AND run in CI with
  `--fail-on-open=critical,high` (check.yml:66); it is the mechanism that makes a silently
  un-fixed security finding stop a deploy. Its size is 74 findings' probes, each argued.
- **`_dir-chrome-probe.mjs` / `_dir-room-shots.mjs`** (self-described "throwaway"): README
  lines 64-65 defend both - the lab directory room's stated numbers are read off the DOM by
  the first, and the room's UI names it. Lab rooms are owner-approved history (brief section 3).
- **`hoopoe-zoom-probe.mjs`**: README line 63 marks it "Keep" as the regression guard for open
  bug #14, specifically so nobody re-tests the disproved wing-pivot theory.
- **`hoopoe-idle-check.mjs`**: referenced by OPERATIONS.md:36 and by visual.spec.ts's masking
  comment; its 25-line header explains why no other gate can see the bug it guards.
- **All four GitHub workflows fire and are healthy**: check.yml on every push to main (no
  secrets needed - it deliberately uses placeholder DB URLs, check.yml:31-37); backup.yml
  nightly 20:30 UTC (needs SUPABASE_DIRECT_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY, R2_BACKUP_BUCKET) with dump verification and a public-bucket refusal
  guard; retention.yml nightly 21:00 UTC (needs CRON_SECRET - OPERATIONS.md notes the job
  fails loudly with 401 until the owner sets it, which the project memory says is still owed);
  snapshot.yml nightly 00:10 UTC (needs SUPABASE_DIRECT_URL; Sentry/PostHog keys optional by
  design). All cron syntax valid; all have workflow_dispatch, concurrency groups and
  timeout-minutes. The comment quality in backup.yml is the best in the repo.
- **renovate.json does what the owner wants**: weekly batch, majors split out, prisma and
  react pinned together, next-auth held 7 days with a review label, Playwright bumps labelled
  "run npm run visual after merging", security fixes immediate. Whether the Renovate app is
  actually installed on the GitHub repo cannot be verified from the tree; the config is right.
- **`.puppeteerrc.cjs`**: knip lists it as unused; it is a framework convention read by
  puppeteer's installer, and its 8-line comment justifies its existence (saves a ~130MB Chrome
  download on every Vercel build).
- **The e2e suite entire** (590 lines): every constant argued (maxDiffPixels vs ratio proven
  by regression, the 90s timeout traced to a real cold-compile failure, reducedMotion nested
  for a Playwright 1.62 quirk); sidebar.spec and deeplink.spec are the worked examples of the
  repo's own geometry-over-presence testing rule. Nothing to cut.
- **knip's "45 unreferenced scripts"** (raw/knip.txt lines 10-50): a config artifact, not
  death. Scripts are spawned by name (`node scripts/...`) from check.mjs, check.yml,
  snapshot.yml and npm scripts - string references knip cannot see. My per-script trace above
  supersedes the knip list for this territory.
- **`package.json` scripts block**: all 15 entries point at existing files that run; no dead
  commands.
- **The 22 baseline PNGs**: all map to live ROUTES entries (11 x 2); zero orphans.
- **`import-roster.mjs`, `set-password.mjs`, `email-mark.mjs`, `generate-icons.mjs`**: each
  header states a live reason (roster re-import is re-runnable by design; set-password is the
  documented break-glass for the C1 fix; the two generators are named in the code they
  regenerate - src/lib/email-templates.ts and src/app/manifest.ts). Missing README lines only
  (finding 01). `set-password` is also pinned by src/proxy.ts and auth code references.
- **`ops/snapshot.mjs` (337) + `ops/prune.mjs` (97)**: run nightly by snapshot.yml; prune's
  header documents the M55 policy-unification. README lines only.

## For other lenses

- **root-docs-assets**: docs/OPERATIONS.md has no section for snapshot.yml/`ops/snapshot.mjs` -
  the fourth workflow is absent from the document whose charter is "everything installed that
  is not application code". Also OPERATIONS.md section 1 and CLAUDE.md both say "10 routes x 2
  viewports"; e2e/visual.spec.ts ROUTES has 11.
- **root-docs-assets**: docs/SECURITY.md:128 says `phase{4..10}-probe.mjs`; phase3-probe exists
  and is pointed at by audit-status output - the range should be `{3..10}` (or the survivors,
  if finding 05 executes).
- **lib-tests**: `src/lib/unattended-rule.test.mjs:284` allowlists `scripts/dev/import-roster.mjs`
  by path - any relocation of scripts must update that test; it is the one test that reaches
  into my territory by string.
- **lib-tests / orchestrator**: the charter's claim that `drive.mjs` is absent from
  scripts/README.md is wrong - README line 59 lists it. Only the 22 files named in finding 01
  are actually unlisted.
- **deps lens**: `jsqr`, `qrcode`, `xlsx`, `puppeteer` in devDependencies exist solely for
  scripts in this territory (gen-support-qr reads QR codes back with jsqr as self-verification;
  import-roster reads .xlsx). All four are genuinely used; none should be flagged as unused.

## Metrics

- scripts/: 54 script files + README, 8,967 lines. Largest: audit-status.mjs 701,
  phase4-probe 456, phase3-probe 416, phase5-probe 403, seed-curated-content.ts 399,
  phase8-probe 382, ops/snapshot.mjs 337. The phase set (3-10 + prod-check) totals 2,340.
- Classification of the 54: **wired via npm run**: 10 (check, screenshot, screenshot-auth,
  verify-shot, crawl, centroid, shot-clip, audit-status, + protocol-audit and lab-audit spawned
  by check.mjs). **Run by CI/workflows**: 4 (npm-audit-gate, audit-status again, ops/snapshot,
  ops/prune). **Test files run by the check gate**: 3 (local-base-url.test,
  npm-audit-gate.test, tour-mobile-verify.test). **Documented-manual (README or spec/TRAPS)**:
  24. **Referenced-by-doc-or-code only (no README line)**: 22 (finding 01). **True orphans
  (zero references anywhere)**: 1 (`demo/run-sql.mjs`, finding 04).
- Last-touched spread: oldest `dev/shot-clip.mjs` 2026-06-29; 34 of 54 touched in the
  2026-08-20 security overhaul; newest 2026-08-25.
- e2e/: 5 TS files, 590 lines; 22 PNGs, 17MB working / 62.9MB history (81 blobs, 15 commits).
- .github/: 549 lines across 5 files.
- .claude tracked: 101 files; agents 650 lines (repo-specific 224, generic 426); skills 19,269
  lines (repo-specific 388, generic imports 18,881 across 46 dirs / 96 files). Untracked:
  `.claude/_disabled-gsd` 7.4MB.
- Disk leftovers (untracked): `temporary screenshots/` 91MB, `e2e/.output` 40MB.
- Honest savings ledger: autonomous code deletions ~85-90 lines (findings 04, 06); owner-gated
  deletions 232 lines (05); owner-gated relocations ~19,307 lines of markdown out of the repo
  (02, 03); disk ~100-138MB (09). The structural headline of this territory is the gate in 01,
  which saves zero lines and is worth more than all the rest.
