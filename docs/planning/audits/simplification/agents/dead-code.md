# dead-code - simplification audit report

Cross-cutting lens for dead and placeholder code across the whole repo, using knip /
depcruise / madge / tsc as leads and my own import-aware grepping plus file reading as the
confirmation. Charter: triage every one of the 244 knip unused-export/type lines, verify the
non-script unused files, hunt placeholder subsystems, unlinked routes, unused CSS, unused
public assets, always-constant env flags, and superseded components. Date: 2026-08-25.
Files in territory: the 244 symbol sites span ~90 files; opened and judged ~70 of them at the
relevant ranges; `src/app/globals.css` (662 lines) and `prisma/schema.prisma` (1,330 lines)
read fully.

## Coverage

- Read fully: `src/app/globals.css`, `prisma/schema.prisma` (model/enum level plus retired-column
  comments), `src/components/settings/actions.ts`, `src/lib/test-fn-body.mjs`,
  `docs/TRAPS.md`, `docs/planning/FEATURES.md`, all raw tool outputs named in the charter
  (knip, knip-production, madge-orphans-filtered, depcruise-metrics, tsc-unused, env-flags,
  commented-out-code, todos), `src/app/page.tsx:110-150`, `src/components/layout/logo-fact.tsx`,
  `.puppeteerrc.cjs`, `e2e/playwright.config.ts` (setup wiring), `src/lib/turnstile.ts:40-75`,
  `src/lib/db-text.ts:1-30`, `src/app/(main)/donate/page.tsx`.
- Read at ranges (the defining site plus every in-file reference of each flagged symbol):
  `src/lib/catchups.ts`, `src/app/(main)/catchups/actions.ts` (320-470), `src/lib/social.ts`,
  `src/lib/house-spans.ts`, `src/lib/utils.ts` (130-215, 488-575), `src/lib/avatar.ts`,
  `src/lib/admin-analytics.ts` (270-320), `src/components/admin/analytics/stat.tsx`,
  `src/components/profile/houses-chain.tsx` (44, 740-761), `src/lib/validators.ts` (275-300),
  `src/lib/contribution-state.ts`, `src/app/api/razorpay/webhook/route.ts` (18-25), and the
  in-file reference lists of ~55 further symbols (transcribed in the triage table below).
- Skimmed: the 62 lab-file symbols (verdicts by reference counting only; the lab lens owns the
  rooms and their savings are trivial); the 27 shadcn kit sub-exports (framework-shaped, judged
  as a class).
- Not read: the bodies of the 68 `*.test.mjs` files beyond their import blocks and the specific
  slices quoted below (lib-tests owns them); `scripts/` bodies (scripts-e2e-ci owns them);
  `jscpd` clones (not my charter).
- Uncommitted edits seen (someone else's WIP): none at audit time beyond the audit's own
  untracked `docs/planning/audits/simplification*` files. The WIP my charter warned about
  (`next.config.ts`, `src/lib/admin.ts`, `scripts/qa/phase7-probe.mjs`,
  `src/components/tour/manual-tour-entry.test.mjs`, `src/app/(main)/forbidden.tsx`) was
  committed before I started (`c74d99f` "a non-admin who asks for /admin is told 'nice try'").
  One consequence: knip's line numbers for `src/lib/admin.ts` are stale (it says
  `worklistCounts` at 224; HEAD has it at 240). Symbol names, not line numbers, are the stable
  key in everything below.

## Summary

The headline is not "202 dead exports". After import-aware verification the 244 knip lines
split roughly: **62 lab-internal** (trivial, lab lens territory), **27 shadcn kit sub-exports**
(framework convention, one class decision), **~50 exports whose only consumer is a `*.test.mjs`
file** (knip config gap, not dead - the tests import `.ts` directly under Node type-stripping),
**~55 exports used inside their own file only** (de-export hygiene, zero lines), and **~50
genuinely dead symbols**, several of which are whole functions or whole files. The real wins:
two **exported server actions with zero callers** (`updateUserProfile` ~114 lines and
`createCatchup` ~100 lines plus its schema and seeding helper) - dead weight that is also live,
invocable POST surface; two dead shadcn files (146 lines); an ~85-line dead batch-computation
block in `utils.ts`; a ~55-line dead admin-analytics loader; ~1.5MB of tracked orphan images
plus ~9MB of untracked local junk in `public/`; an always-true `IS_POSTGRES` flag copied into
three files guarding a SQLite fallback the stack left behind on 2026-07-01; and one Prisma
model (`VerificationToken`) plus two documented retired columns with zero readers. Placeholder
hunts otherwise came back clean: the two hardcoded-false flags I found are both explicit,
dated owner decisions, and the CSS/token layer is remarkably tight (4 dead items in 662 lines).
Structural-vs-cheap: about 70% of the line savings here are structural deletes; the de-export
mass item is cheap-but-worthwhile hygiene. What surprised me: how little rot there is per file
- this codebase's dead code is concentrated in a dozen superseded entry points, not smeared.

Total honest estimate: **~760-800 lines of code** removable at T1/T2 confidence, **~1.5MB
tracked assets**, **~9MB untracked local junk**, 2 files gone from `src/components/ui`, one
schema model + two columns (migration-gated), and ~55 exports made module-private.

---

## Findings

### dead-code-01 - Delete the superseded `updateUserProfile` server action
- **Where**: `src/components/settings/actions.ts:26-139` (the function), plus the then-unused
  imports it strands (`profileSchema` from `@/lib/validators`, `batchTypeFromLeaving` from
  `@/lib/utils` - verify with eslint after the cut)
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip `unused export updateUserProfile src/components/settings/actions.ts:26`.
  Import-aware grep: the file's importers are `letterhead-profile.tsx` (imports
  `updateUserPlaces, requestAccountDeletion, updateAvatar, removeAvatar` - lines 86-91) and
  `onboarding/steps/photo-step.tsx` (imports `updateAvatar`). Every other textual match for
  `updateUserProfile` in src is a comment: `profile-actions.ts:8` ("whole FORM:
  updateUserProfile reads fourteen names off one FormData"), `utils.ts:468`,
  `validators.ts:102,128`. The profile edit surface moved to the per-field actions in
  `src/components/profile/profile-actions.ts` (which itself documents the supersession). No
  rule test slices this function (`grep updateUserProfile src/**/*.test.mjs` - zero).
- **What to do**: delete lines 26-139 of `src/components/settings/actions.ts`; remove the
  `profileSchema` import (profile-actions.ts has its own) and `batchTypeFromLeaving` from the
  utils import if nothing else in the file uses them; update the three comments that name it
  (`profile-actions.ts:8`, `validators.ts:102`, `utils.ts:468`) to name the live path instead.
- **Saving**: ~114 lines code, minus one exported server action (i.e. one fewer publicly
  invocable POST endpoint carrying a full user-update write path)
- **Risk & gate**: low. `npm run check` (tsc + the profile-editor rule tests must stay green);
  open `/profile/<own id>` and save an inline edit; `security-regressions.test.mjs` untouched.
- **Confidence**: high. The one thing that would change my mind: a form somewhere binding the
  action by `<form action={...}>` through a re-export I missed - grep for
  `settings/actions` importers found exactly the two files above, so I do not expect it.
- **Notes**: this is the pattern to internalize from this whole report: in Next.js an exported
  server action is an HTTP endpoint whether or not any component references it. Dead server
  actions are the one category of dead code that is also attack surface. The write-path
  reviewer agent should get a one-line rule out of this: "an actions-file export with no
  importer is a finding, not a style nit." Related: dead-code-02 (same pattern), and the
  `setTheme` de-export in dead-code-10 (an internally-wrapped action that need not be exported).

### dead-code-02 - Delete the group-based `createCatchup` creation path (action + schema + seeding helper)
- **Where**: `src/app/(main)/catchups/actions.ts:337-421` (the action, including its 17-line
  doc comment), `:115-124` (`seedPromptSchema` + the `seedPrompts` field of
  `createCatchupSchema` - the whole `createCatchupSchema` object at 120 dies with the action);
  `src/lib/catchups.ts:295-311` (`suggestSeedPrompts` and its doc comment);
  `src/lib/catchups.test.mjs:46` (import) and `:684-690` (the `suggestSeedPrompts` test)
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip flags both `createCatchup` (actions.ts:337) and `suggestSeedPrompts`
  (catchups.ts:300). Every external textual match is a comment or a QA ledger line:
  `src/components/auth/actions.ts:233` ("Same shape createCatchup uses"),
  `scripts/qa/audit-status.mjs:613` (an audit-history probe description). The successor is
  right below it in the same file: `createCatchupWithPeople` (actions.ts:424+), whose doc
  comment records the owner decision ("owner, 2026-07-25: 'for now, let us have basically no
  groups, let's just have catch-ups'"). `seedPrompts` exists only in the dead action's input;
  `suggestSeedPrompts` has zero production callers (self=1 in catchups.ts) and one test.
  `demo.test.mjs:305` slices from `createCatchupWithPeople`, not `createCatchup`, so the demo
  pin survives the cut.
- **What to do**: delete `createCatchup` (337-421); delete `createCatchupSchema` and
  `seedPromptSchema` (115-124) - `MAX_ACCEPTED_PROMPTS_PER_EDITION` at :95 stays, it is used at
  :153 and :919; delete `suggestSeedPrompts` from catchups.ts; remove `suggestSeedPrompts` from
  the test's import block and delete the test at catchups.test.mjs:684-690; update
  `scripts/qa/audit-status.mjs` L4 probe if it greps the source for `createCatchup` (read it
  first - if it only carries the string in a title, leave it); fix the comment in
  `auth/actions.ts:233` to reference `createCatchupWithPeople`. Check
  `docs/spec/catchups.md` sec 3.2 - if it still describes group-based creation with seed
  prompts, the spec edit ships in the same commit (CLAUDE.md one-commit rule).
- **Saving**: ~130 lines code, minus one more dead-but-invocable server action
- **Risk & gate**: low-medium (the file is the busiest actions file in the app). `npm run
  check`; `catchups.test.mjs` green after the trim; create a Catch-up end to end at
  `/catchups/new`.
- **Confidence**: high on the action; medium on `suggestSeedPrompts` only in the sense that
  the owner picked its opening prompt by name ("What does an ordinary day look like for you
  now?") - but that quote lives in the prompt-set data (`CATCHUP_PROMPT_SETS`), which stays;
  only the dead selector function goes.
- **Notes**: I checked where new rounds get their prompts now: members submit them during
  `collecting`, and the library picker reads `CATCHUP_PROMPT_SETS` directly. Nothing seeds at
  creation. If the owner ever wants Round-1 auto-seeding back, it is a 10-line function against
  data that still exists.

### dead-code-03 - Delete `src/components/ui/badge.tsx` and `src/components/ui/tabs.tsx`
- **Where**: `src/components/ui/badge.tsx` (56 lines), `src/components/ui/tabs.tsx` (90 lines)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip "unused files"; depcruise `Ca=0` for both (the only two Ca=0 non-test
  component modules in the repo); madge orphans lists both. Import grep: zero importers of
  either path; zero `<Badge` JSX anywhere; the only "tabs" import in the app is
  `@/components/admin/analytics/tabs` (a different, live file). `badgeVariants` referenced
  nowhere outside the file.
- **What to do**: `git rm` both files. Nothing else changes - `components.json` is a shadcn
  CLI config, not a registry of installed files, and `npx shadcn add badge tabs` regenerates
  either in seconds if a future feature wants them.
- **Saving**: 146 lines, 2 files
- **Risk & gate**: near-zero. `npm run check` (tsc proves no importer).
- **Confidence**: high.
- **Notes**: these are the classic shadcn leftovers - generated during setup, never adopted.
  The rest of `components/ui` is genuinely used.

### dead-code-04 - Delete the `computeBatchFromSchooling` block in utils.ts
- **Where**: `src/lib/utils.ts:493-~575` (`BatchComputation` type + doc comment +
  `computeBatchFromSchooling`), plus the pointer comment at `:386`
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip flags both the function (:522) and the type (:493). External matches:
  only the comment at utils.ts:386. Its own doc claims it is "used by both the live sign-up
  preview (client) and registration (server)" - neither is true any more: signup and
  `updateUserProfile`'s successor both derive `batchType` via `batchTypeFromLeaving`
  (settings/actions.ts:93 before its own deletion, profile-actions since). `git log
  -S computeBatchFromSchooling` shows it last touched in the 2026-08-08 dead-code sweep
  (`5bcbf61`) - it survived that sweep because it still had a caller then; the caller has
  since gone.
- **What to do**: delete the type and function (493 through the function's closing brace,
  ~575); delete the stale pointer comment at :386; this also clears the `tsc-unused` hit
  (utils.ts:205 is a separate finding, dead-code-15). Verify `valleyYear` (which it calls)
  still has other callers before assuming it stays - it does (grep shows several).
- **Saving**: ~85 lines
- **Risk & gate**: low. `npm run check`; sign up a throwaway account and confirm the batch
  preview still computes (it uses the sibling helpers, not this).
- **Confidence**: high.
- **Notes**: the doc comment on this function is excellent and wrong, which is the most
  dangerous kind. Worth quoting in the fix commit message so nobody resurrects it from the
  doc alone.

### dead-code-05 - Delete `loadSupport` in admin-analytics.ts
- **Where**: `src/lib/admin-analytics.ts:279-~330` (function + its section banner comment)
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip flags it; self=1 (definition only); the admin analytics page's 20-name
  import block does not include it (verified by reading the import list in
  `src/app/(main)/admin/analytics/page.tsx:24-40+); `/admin/support` (the page that shows this
  data) runs its own queries via `contribution-state` imports. It duplicates seven
  `prisma.contribution` aggregations that the support page already does its own way.
- **What to do**: delete the function and its banner comment ("Support: the funnel the owner
  asked about first"). If the orchestrator's admin-analytics lens found the support page and
  this loader disagree on a number, prefer consolidating INTO one of them instead - but as of
  HEAD nothing calls this one.
- **Saving**: ~55 lines
- **Risk & gate**: low. `npm run check`; open `/admin/support` and `/admin/analytics`.
- **Confidence**: high.
- **Notes**: cross-check with the admin-analytics territory agent; if they proposed reusing
  `loadSupport` from the support page (dedupe direction), that supersedes this delete.

### dead-code-06 - Tracked orphan images in public/: ~1.5MB nothing references
- **Where**: `public/images/collection/{v4,v5,v6,c5,c6}.webp` + their `-thumb` twins
  (~1,280KB, all git-tracked); `public/images/support-qr.svg`, `support-qr-{500,1000,2000,5000}.svg`
  (~208KB); `public/images/collection/gen/*.svg` (12 files, ~48KB);
  `public/images/brand/rishi-valley-mountain-mark-dark-4096.png` (376KB) and the four
  `rishi-valley-mountain-mark*.svg` (16KB) - the brand items are an owner call, see Owner
  decisions
- **Phase**: dead
- **Tier**: T2 (needs one DB check)     **Class**: structural     **Decides**: autonomous for
  collection/QR/gen; owner for brand marks
- **Evidence**: per-file reference grep of every basename (with and without extension) across
  src, scripts, e2e, next.config.ts: `v4 v5 v6 c5 c6` = 0 refs anywhere; code names only
  `c1-c4`, `v1-v3` (+thumbs) and the `demo-*` set (`demo-banyan-*`/`demo-assembly-wide` ARE
  referenced - `src/lib/demo-seed/content.ts:699,717,736...` uses extensionless `file:` keys,
  which is why a naive filename grep misses them; they stay). The QR SVGs lost their last src
  reference in `0fc7160` ("payment through razorpay!"); only `scripts/gen-support-qr.mjs` (the
  generator) and docs mention them now. The `gen/*.svg` placeholder tiles were added in
  `e22e795` ("give each collection photo a distinct placeholder tile") with cuid filenames
  that matched then-live Photo rows; no code builds those paths today.
- **What to do**: (1) one read-only SQL against the live DB before deleting:
  `SELECT url, thumbUrl FROM "Photo" WHERE url LIKE '%/images/collection/%' OR "thumbUrl" LIKE '%/images/collection/%'`
  (and the same against the demo DB) - any row naming v4-v6/c5-c6/gen/* means that file is
  data-referenced and stays until the row is cleaned; (2) delete the unreferenced ones;
  (3) the QR pipeline: delete the five SVGs; `scripts/gen-support-qr.mjs` plus the `jsqr` and
  `qrcode` devDependencies ride on this - flagged to scripts-e2e-ci and dependency-diet.
- **Saving**: ~1.5MB repo weight (also cloned into every Vercel build's checkout), 22+ files
- **Risk & gate**: low once the SQL comes back empty. `npm run verify:crawl` (collection and
  support pages render); the demo reset+seed still succeeds next time it runs.
- **Confidence**: high on QR and v4-v6/c5-c6 (code truly never builds these paths); medium on
  `gen/*` only because their whole reason for existing was DB rows I cannot read.
- **Notes**: I nearly wrote up `demo-banyan-*` as dead - 0 refs on a filename grep - before
  finding the extensionless `file:` keys in content.ts. That trap is why the SQL check above
  is written into the instruction rather than left to judgement.

### dead-code-07 - Untracked junk in public/: ~9MB of local dirt, and the gitignore gap that invites it
- **Where**: `public/images/landing-original.jpeg` (6.0MB), `public/images/collection/WhatsApp
  Image 2026-05-13 at 7.37.1{6,7} am.jpeg` (2.9MB), four `.DS_Store` files (~40KB),
  `public/uploads/2026/03/*.webp` (2 dev-upload leftovers, 60KB) - all confirmed untracked
  (`git ls-files public` = 72 vs 80 files on disk)
- **Phase**: dead (local)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `comm -13 <(git ls-files public|sort) <(find public -type f|sort)` lists
  exactly these. `landing-original.jpeg` is the raw source of the shipped 488KB
  `landing.jpeg`; the WhatsApp files are raw sources of collection webps. Zero references to
  any of them.
- **What to do**: delete the raw jpegs, the WhatsApp files, the `.DS_Store`s, and the two
  `public/uploads` leftovers (dev-mode `storage.ts` writes there; the `.gitkeep` stays). Add
  `.DS_Store` and `public/uploads/**` (except `.gitkeep`) to `.gitignore` if not already
  covered, so this class of dirt cannot be staged by accident. This answers the owner's "I'm
  having to delete a bunch of files left over from previous sessions" complaint directly for
  public/.
- **Saving**: ~9MB local disk; 0 lines
- **Risk & gate**: none beyond "is the raw source wanted as an archive" - if the owner wants
  the original landing photograph kept, it belongs outside the repo folder.
- **Confidence**: high.
- **Notes**: these being untracked means another session created them and left them; deleting
  untracked files brushes against the shared-tree rule, so the fixer should re-run `git
  status` at fix time and skip anything that has become tracked or newly modified since.

### dead-code-08 - `IS_POSTGRES` is always true: one dead SQLite branch, defined three times
- **Where**: `src/lib/db-text.ts:12-14` (canonical), `src/app/(main)/feed/actions.ts:133-134`
  (local copy `searchInsensitive`), `src/app/(main)/collection/actions.ts:493-494` (local copy
  `insensitive`)
- **Phase**: placeholder (always-true flag) + dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `env-flags.txt` shows the three sites. `DATABASE_URL` has begun with
  `postgres` in every environment since the 2026-07-01 Turso migration (AGENTS.md: "Migrated
  off Turso/libSQL on 2026-07-01"); the demo's DB is also Supabase Postgres. The guarded
  branch (`{}` instead of `{ mode: "insensitive" }`) can never be taken, and if it ever WERE
  taken it would be a silent correctness bug (case-sensitive people search), not a graceful
  fallback. Both actions files already import from `db-text.ts` (`escapeLike`), so the copies
  are not avoiding a new dependency.
- **What to do**: in `db-text.ts`, make it unconditional: `export const insensitive =
  { mode: "insensitive" } as const;` and cut the SQLite paragraph of the doc comment down to a
  line of history; in `feed/actions.ts` and `collection/actions.ts`, delete the local
  `IS_POSTGRES`/`insensitive` pairs and import `insensitive` from `@/lib/db-text` (feed's
  local name `searchInsensitive` can keep its alias as `city-scope.ts:3` already does).
- **Saving**: ~8 lines, one env read x3, and one fewer way for the three copies to drift
- **Risk & gate**: low. `npm run check`; search the feed and the directory for a
  mixed-case name.
- **Confidence**: high. Would change my mind: any stated intention to run tests against
  SQLite - I found none, and the test suite never touches a database by design.
- **Notes**: this is the only always-constant env flag with a genuinely dead branch. The other
  dev-flag suspects the charter named are all real switches - see Not-findings.

### dead-code-09 - Dead-with-a-test: six functions whose only consumer is their own unit test
- **Where**: `src/lib/social.ts:26-45` (`socialIcon`, ~17 lines incl. its Lucide imports
  `Instagram, Linkedin, Facebook, Globe, ExternalLink` if then unused) and `:54-62`
  (`socialHost`, ~9 lines); `src/lib/contribution-state.ts:22` (`CONTRIBUTION_STATUSES`) and
  `:42-44` (`canBecomePaid`); `src/lib/prisma-errors.ts:27-33` (`isRecordNotFound`);
  `src/lib/house-spans.ts:84-111` (`seedHouseYearRows`) and `:135-176` (`restoreAllYearRows`);
  `src/lib/utils.ts:204-210` (`formatBatch`, which also carries the tsc-unused `batchType`
  param)
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: for each: knip flags it; in-file self-count shows no internal caller;
  import-aware grep shows the only non-comment consumer is a `*.test.mjs`. Specifics:
  `canBecomePaid` - the razorpay webhook imports `PAYABLE_FROM, REVERSED_STATUSES,
  foldReversal, unfoldDispute` and NOT this (route.ts:18-24); `restoreAllYearRows` has zero
  references of any kind; `seedHouseYearRows`'s only src match is a comment in
  `house-chain-editor.tsx:120`; `formatBatch`'s three src matches are all comments explaining
  why callers use `batchLine` INSTEAD ("batchLine, not formatBatch, so a teacher reads..."),
  and `batch-line.test.mjs` imports only `batchLine, metaLine`.
- **What to do**: delete each function; trim the corresponding test blocks
  (`normalize.test.mjs`, `contribution-state.test.mjs:13,31-42,154`,
  `prisma-errors.test.mjs:5,12-23`, `house-spans.test.mjs`). ONE TRAP written down so the
  fixer does not trip it: `normalize.test.mjs:71` uses `indexOf("export function socialIcon")`
  as the END BOUNDARY of a text slice over social.ts - deleting `socialIcon` breaks that slice
  silently unless the boundary is repointed (to `socialHost`'s decl or end-of-file). Fix the
  slice in the same commit. Also confirm the Lucide icon imports in social.ts become unused
  and remove them (eslint will say).
- **Saving**: ~110 lines across code and tests
- **Risk & gate**: low. `npm run check` - and the check gate now fails if the suite count
  drops below its floor, so deleting a whole test FILE (prisma-errors.test.mjs would be nearly
  empty) needs the floor adjusted consciously, not silently; that is a deliberate speed bump,
  respect it in the commit message.
- **Confidence**: high on all six. The philosophical question the charter asked - "is the test
  worth the export?" - I answer no for all six because none of them pins production behaviour;
  each pins a function production abandoned. A test of dead code is documentation of nothing.
- **Notes**: contrast with the ~45 test-consumed exports I did NOT list (catchups engine,
  image fit math, upload rules, grapheme helpers): those all also have production callers
  (internal or external) and their tests pin real behaviour. Full split in the triage table.

### dead-code-10 - Make ~55 internally-used exports module-private (the de-export sweep)
- **Where**: one mechanical pass across ~35 files; the full list with in-file evidence is in
  the triage table below. Representative: `PER_QUEUE` (admin-worklist-query.ts, 7 internal
  uses), `worklistCounts` (admin.ts), `cityNameVariants`/`OWN_PIN_CITIES` (city-coords.ts),
  `placeSchema` (place-input.ts), `tryRosterAutoVerify` (roster.ts - the exported loud variant
  wrapped by the used `tryRosterAutoVerifyQuietly`), `setTheme` (theme-actions.ts - an
  exported "use server" action whose only caller is `setThemePreference` in the same file),
  `TOUR_STOPS`, `reportSpotlight`, `readTourState`, `SPECIES_PINS`, `DRAWN_SPECIES_COUNT`,
  `contributorsCopy`, `archeTransform`, `PILL_BASE`, `PILL_IDLE`, `AUTH_PANEL_VW`,
  `RARE_IDLE_CHANCE`, `formatValue`/`StatTile`/`Sparkline` (stat.tsx), `correlate`
  (compare.tsx), `WORDMARK_LOGO_SIZE`/`WORDMARK_FONT_SIZE`, `isWideRoute`, `HOUSE_TINTS`,
  `MAX_SUBJECT_LENGTH`, `RESERVED_KINDS`, `EMAIL_MAX`, `groupHouseYearEntries`,
  `missingYears`, `instagramHandle` re-export, `SUBJECTS`/`AREAS` (collection.ts),
  `DEMO_VISITOR`/`DEMO_PEOPLE`, `ANSWER_WINDOW_DAYS`/`PREPARING_HOLD_HOURS`/`EXTEND_DAYS`/
  `STATUS_ORDER`/`dueReminder`/`shouldExtendForNoQuestions`/`questionsExtendPatch`
  (catchups.ts - these seven are NOT in catchups.test.mjs's import block, verified against the
  block at test lines 24-57)
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: knip flags each as an unused export; my per-symbol in-file grep shows each IS
  used inside its own file (counts in the table). An export nothing imports is a public API
  by accident: it invites lab rooms and future code to couple to internals, and in two cases
  (`setTheme`, `tryRosterAutoVerify`) the accidental export is again an invocable server
  action.
- **What to do**: remove the `export` keyword symbol by symbol. Two guard rails: (1) before
  each, grep the `*.test.mjs` corpus for the symbol - if a RULE test slices source text using
  the literal string `export function <name>` or `export const <name>` (the
  `test-fn-body.mjs` / `balancedBody` pattern documents exactly this idiom), the decl string
  in the test must be updated in the same change; (2) `"use server"` files allow non-exported
  helpers of any shape, so `setTheme` going private is safe (TRAPS.md's "non-async export"
  trap concerns exports, which this removes). Run the full unit suite, not just tsc.
- **Saving**: 0 lines (a few where the `export` was the whole point of a line), pure API
  narrowing; knip goes quiet, which is worth something on every future audit
- **Risk & gate**: low. `npm run check` end to end.
- **Confidence**: high per mechanism; each symbol individually verified in the table.
- **Notes**: I deliberately did NOT include the ~45 test-consumed exports (they must stay
  exported - the tests import the real `.ts` under Node type-stripping, per the header of
  catchups.test.mjs) or anything in `components/ui` (finding 12 handles that as a class).

### dead-code-11 - Delete ~18 dead type aliases and interfaces
- **Where** (all knip "unused exported types", each verified to have no non-definition use
  in its own file and no importer): `src/lib/admin-analytics.ts:27` (`Metric`), `:37`
  (`Slice`); `src/lib/admin-threads.ts:17` (`ThreadKind`), `:21` (`ComposerKind`);
  `src/lib/catchups-types.ts:154,159,179,204` (`CatchupRoundSection`, `CatchupRoundView`,
  `CatchupViewerRole`, `CatchupArchiveRow`); `src/lib/catchups.ts:646,667` (`EditionAction`,
  `EditionCounts` - these two are internal-use, de-export instead); `src/lib/tour-local.ts:17`
  (`TourLocalState` - internal, de-export); `src/components/tour/tour-steps.ts:17`
  (`TourStopId`); `src/lib/houses.ts:36` (`HouseName` - internal, de-export);
  `src/lib/post-visibility.ts:12` (drop `DenialReason` from the type re-export line);
  `src/lib/utils.ts:493` (`BatchComputation` - dies in dead-code-04); plus the
  internal-only ones folded into dead-code-10 (`WorklistCounts`, `ActionFailure`, `Budget`,
  `VerifiedViewer`, `HouseYearRow`, `EyeShape`, `ContactKind`, `AnswerAsker`, `NotifyBaseCtx`,
  `DemoComment`, `DemoEntry`, `PeopleState`, `PeopleKind`, `ContentType`, `Profession`,
  `AdminSectionDef` - dies in dead-code-15 with `ADMIN_SECTIONS`)
- **Phase**: dead / hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: knip's 42 type lines, minus the 10 lab types (lab lens) and the
  internal-use ones redirected to the de-export sweep. Types are erased at runtime, so the
  only gate needed is the compiler.
- **What to do**: delete the truly-referenceless ones, de-export the internal ones; where a
  deleted alias documents a data shape a future reader would want (`CatchupArchiveRow` is a
  good example), fold its content into a comment on the function that returns that shape
  rather than keeping a dead alias.
- **Saving**: ~40 lines
- **Risk & gate**: near-zero. `npm run check` (tsc is the whole proof).
- **Confidence**: high. Caveat: knip can miss `import type` usage in odd configs - tsc at fix
  time is authoritative; anything tsc defends, keep and de-export instead.

### dead-code-12 - The shadcn kit sub-exports: keep as a class, do not chase (a decision, recorded)
- **Where**: 27 knip lines across `src/components/ui/{card,combobox,dialog,dropdown-menu,
  popover,select,sheet}.tsx` (`CardFooter`, `CardAction`, `DialogOverlay`, `DialogPortal`,
  eleven `DropdownMenu*` parts, five `Select*` parts, `SheetFooter`, `SheetDescription`,
  `PopoverClose`, three `Combobox*` parts)
- **Phase**: dead (nominally)
- **Tier**: T4 (class decision)     **Class**: cheap     **Decides**: owner
- **Evidence**: knip flags each; none has an importer today. But these files are generated
  shadcn/Base-UI kits whose contract is "the full part set is exported so composition works
  the day you need `DropdownMenuSub`"; pruning them makes every future use a re-generation,
  and re-generating a hand-tuned kit (these have local edits - the dialog's overlay carries
  bespoke classes) risks losing the tuning. Tree-shaking already drops unused parts from the
  bundle, so the runtime cost is zero.
- **What to do**: my recommendation is to leave all 27 and instead add them to knip's
  `ignoreExportsUsedInFile`/per-path exceptions so the report stays readable. If the owner
  prefers a hard prune, it is mechanical and tsc-gated - but it buys ~50 lines in exchange
  for friction every time a menu grows a submenu.
- **Saving**: 0 as recommended (or ~50 lines if pruned)
- **Risk & gate**: n/a as recommended
- **Confidence**: high that pruning is not worth it here.
- **Notes**: exception: `tabs.tsx` and `badge.tsx` are whole dead FILES, which is a different
  thing entirely - dead-code-03.

### dead-code-13 - globals.css: exactly four dead items in 662 lines
- **Where**: `src/app/globals.css:64` (`--z-base`), `:101` (`--space-3xl`), `:27-31` +
  `:166-170` + `:326-330` (`--chart-1..5`: the five `@theme` bindings and both raw value
  sets), `:624-627` (`.animate-bell`) plus the stale half of the comment at `:615-616`
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: token-by-token grep of every custom property, class, keyframe and utility in
  the file against src. `--z-base`: 1 occurrence total (its definition; z-elevated=10,
  z-floating=2, z-overlay=4 are real). `--space-3xl`: definition only (the other seven
  LiftKit steps have 8-189 uses each). `chart-1..5`: zero uses outside the css file - the
  admin sparklines color via `tone` classes, and no chart library is installed.
  `.animate-bell`: zero class writers anywhere (the bell animates via `.bell-trigger:hover`
  at :629, which stays, as does the `bell` keyframe it uses). Everything else in the file is
  alive - including every colour token, `state-layer`, `--radius-input` (used via
  `rounded-[var(--radius-input)]` in ui/input, textarea, select, combobox), the shimmer, the
  hoopoe rules, and all sidebar tokens (4-29 uses each).
- **What to do**: delete the four items; in the `:615` comment, drop the sentence "Trigger by
  toggling .animate-bell..." and keep the hover note; leave the `--z-*` comment but remove
  `base` from it.
- **Saving**: ~21 lines
- **Risk & gate**: `npm run visual` (its whole point); the bell still shakes on hover over
  the header bell.
- **Confidence**: high. Chart tokens are also a shadcn convention like dead-code-12 - but
  unlike component parts, re-adding five CSS custom properties costs nothing, so I do
  recommend deleting these.
- **Notes**: I owned the definitive list per the charter: dead CSS = `--z-base`,
  `--space-3xl`, `--chart-1..5` (x2 themes + @theme), `.animate-bell`. Nothing else.

### dead-code-14 - Placeholder schema: `VerificationToken` model, `User.openTo`, `Post.tag`, `GroupInvite`
- **Where**: `prisma/schema.prisma:336-346` (`VerificationToken` + its own comment saying the
  email provider is "(unused)"), `:20` (`User.openTo` - comment: "retired 2026-07-30 ...
  Column kept for a future cleanup migration; no reader or writer remains"), `:480`
  (`Post.tag` - same wording, retired 2026-08-02), `:277-291` (`GroupInvite`)
- **Phase**: placeholder
- **Tier**: T3 (migration + demo DB)     **Class**: structural     **Decides**: autonomous for
  openTo/tag (the schema itself schedules them); owner-adjacent for VerificationToken and
  GroupInvite (auth plumbing and the groups substrate)
- **Evidence**: `prisma.<model>.` call-site counts across src+scripts: `verificationToken` 0;
  `groupInvite` 1 (the demo reset's `deleteMany` wipe only); `account` 1 and `session` 2
  (also demo-wipe only - but these two ARE exercised by the `@auth/prisma-adapter` configured
  in auth.ts:58, so they stay). `VerificationToken` belongs to the NextAuth email provider,
  which was killed ("Kill magic links everywhere" - FEATURES.md sec 9, shipped); the adapter
  never touches it under a Credentials+JWT setup. `openTo` and `tag` document their own
  deadness in the schema.
- **What to do**: one dated idempotent migration in `prisma/migrations-manual/` dropping
  `VerificationToken`, `User.openTo`, `Post.tag` (and `GroupInvite` if the owner confirms
  invites are not coming back with the retired groups); remove the model/fields from
  `schema.prisma`; `npx prisma generate`. TRAPS.md discipline applies in full: apply to BOTH
  databases (`run-sql.mjs` and `--env .env.demo`), never `db push`, and prove the drop with a
  rolled-back transaction first. Coordinate with the data-layer agent, who owns the wider
  schema questions (the legacy `Catchup`/`CatchupPref` tables the schema comments at
  :813-823 describe are theirs).
- **Saving**: ~35 schema lines, three dead DB objects, and one less model in the generated
  client
- **Risk & gate**: medium purely because it is DDL against the shared production database.
  Gates: the rolled-back-transaction proof, `npm run check`, sign-in and password-reset flows
  exercised (they use `AuthToken`, not `VerificationToken` - verify that claim at fix time by
  grepping the reset flow, I did and found `authToken` only).
- **Confidence**: high on openTo/tag (self-documented); high on VerificationToken (zero call
  sites, provider gone); medium on GroupInvite (groups substrate is deliberately retained
  under Catch-ups, and an invites revival is plausible - hence the owner check).

### dead-code-15 - The small-dead sweep: a dozen one-to-ten-line deletions
- **Where / What** (each verified zero-reference incl. internally):
  - `src/lib/admin-threads-server.ts:11` - re-export of `isUploadedImageUrl`; consumers all
    import from `@/lib/upload-shared`. Delete the line.
  - `src/lib/member-gate.ts:30` and `src/lib/email-verification.ts:29` - re-export lines for
    `MEMBER_UNVERIFIED` / `EMAIL_UNVERIFIED`; consumers import from the `*-message` modules.
    Delete both lines (keep the imports both files genuinely use).
  - `src/lib/social.ts:9` - `export { instagramHandle }` pass-through; consumers use
    `@/lib/normalize`. Delete.
  - `src/lib/auth.ts:380` - `export const { handlers, signIn, signOut } = nextAuth;` - knip
    says `signIn`/`signOut` unexported-anywhere-used (the client-side `signIn` everywhere is
    `next-auth/react`'s). Narrow to `export const { handlers } = nextAuth;` (keep `auth`
    however it is currently exported).
  - `src/components/admin/admin-nav.ts:129` - `ADMIN_SECTIONS` (self=1) + `AdminSectionDef`
    (:31). Delete both (~13 lines with comment).
  - `src/lib/razorpay.ts:42-44` - `razorpayConfigured()`; last caller went with `0fc7160`.
  - `src/lib/validators.ts:283-286` - `reportSchema`; the report dialog validates via its own
    action path. Delete.
  - `src/components/catchups/home/types.ts:41` - `MAX_ACCEPTED_PROMPTS_PER_EDITION`;
    actions.ts:95 has its own local. Delete.
  - `src/lib/directory-facets.ts:28-36` - `directorySortOptions` + `directoryDefaultSort`
    (self=1 each; the client uses the other exports of the file).
  - `src/lib/email-queue.ts:840` - `MAIL_DAILY_CAP` alias of `DAILY_CAP` (self=1).
  - `src/lib/place-aliases.ts:70-73` - `isAliasedPlaceId` (self=1).
  - `src/lib/utils.ts:200-202` - `pickAvatarColor` (self=1; bird avatars superseded random
    colours long ago) - AVATAR_COLORS itself: check remaining callers before touching.
  - `src/lib/collection.ts:40-41` - `SUBJECT_VALUES` / `AREA_VALUES` (derived, never read).
  - `src/components/profile/houses-chain.tsx:758-761` - `HousesChain` 3-line wrapper (callers
    all use `HouseTrail`).
  - `src/components/mascot/hoopoe-kit.ts:34` (`EASE_POP` - motion.tsx has its own) and
    `:127,130` + `src/components/mascot/hoopoe.tsx:1144-1146` - the `parallel` step
    constructor and the player's `"parallel" in st` branch: no step anywhere is built with
    `parallel()` or a `{parallel: [...]}` literal. Delete constructor, union member, branch.
  - `src/components/common/bird-avatar-v2.tsx:1611` - `ARCHETYPE_COUNT` (self=1).
  - `src/components/ui/combobox.tsx:3`, `src/components/ui/popover.tsx:3` - the unused
    `React` imports (the two src hits in `tsc-unused.txt`).
  - `scripts/qa/_dev-login.mjs:102` - `devLoginContext` (zero users even among scripts) -
    flagged here for completeness, scripts-e2e-ci owns the file.
- **Phase**: dead
- **Tier**: T1     **Class**: structural (small)     **Decides**: autonomous
- **Evidence**: per-symbol reference counts in the triage table; each was individually
  grepped with word boundaries and import-path awareness.
- **What to do**: as listed. Batch into one commit ("chore: remove dead exports the audit
  proved unreferenced") with the triage table cited.
- **Saving**: ~75 lines across ~18 files
- **Risk & gate**: low. `npm run check`; `npm run visual` for the two component files.
- **Confidence**: high.

### dead-code-16 - Delete the `/donate` redirect stub (owner sign-off, one minute)
- **Where**: `src/app/(main)/donate/page.tsx` (7 lines), one route in every build
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: owner
- **Evidence**: zero references to `/donate` anywhere in src (the only unlinked non-API,
  non-legacy route in the build's 92 - full route sweep in the table below). The file's own
  comment defends it: "Keep this redirect so old links never break." But the site has never
  been publicly released, so there are no external old links - only members' possible
  bookmarks from earlier phases.
- **What to do**: if the owner agrees pre-launch bookmarks are not worth a route: delete the
  directory. Otherwise mark it a permanent not-finding with a date so no future audit
  re-litigates.
- **Saving**: 7 lines, 1 route
- **Risk & gate**: `npm run verify:crawl` (404 on /donate is then expected and correct).
- **Confidence**: high on the facts; the call is genuinely the owner's.

### dead-code-17 - Lab-file unused exports: 62 symbols, one bulk verdict
- **Where**: 52 exports + 10 types across `src/app/lab/**` (`_kit.tsx`, `_second-look-kit.tsx`,
  `_shared.tsx`, `directory/_*`, `groups-rethink/_*`, `profiles/_chain-kit.tsx`,
  `spine/_columns.tsx`, `support-ideas/_shared.tsx`, `support/_bars.tsx`,
  `tiles/_specimens.tsx`, `type/_fonts.ts`, `type/_specimens.tsx`, `landings/_shared.ts`,
  `_registry.ts` types)
- **Phase**: dead (inside owner-protected history)
- **Tier**: T3     **Class**: cheap     **Decides**: owner (via the lab lens)
- **Evidence**: knip lines 148-199 + types 346-355 of `raw/knip.txt`; my reference counts
  confirm all are lab-internal or fully dead. Two are worth naming because they are UNUSED
  FONT LOADERS: `type/_fonts.ts` exports ten `next/font` Google-font instances
  (`fraunces`, `newsreader`, `instrument`, `literata`, `publicSans`, `inter`, `figtree`...)
  of which several have no importer - each unused loader still declares a font subset request
  in the build. That is a build-weight fact the lab and bundle lenses should weigh.
- **What to do**: nothing unilaterally - the brief is explicit that lab rooms are
  owner-approved history. Recommendation to the lab lens: de-export or delete only the
  symbols with zero references even within lab (the table marks them), and especially the
  unused font loaders.
- **Saving**: ~0-150 lines depending on the lab lens's call; possible build-time win from
  dropped font subsets
- **Risk & gate**: `npm run check` includes the lab registry audit; `/lab` rooms still render.
- **Confidence**: high on the counts, deferring on the action.

### dead-code-18 - Close the knip config gap so this audit stays cheap
- **Where**: `docs/planning/audits/simplification/knip.json` (the audit's ad-hoc config);
  whatever knip config the repo adopts
- **Phase**: architecture (tooling)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: 68 of knip's 124 "unused files" are the `*.test.mjs` suite and ~45 are
  scripts with real entry points (`package.json` scripts, README-documented invocations,
  probe kits imported by probes). The brief itself pre-classifies these as config gaps.
  `fetchSessionCookie` (scripts/qa/_dev-login.mjs) illustrates the export-level cost: knip
  calls it unused while seven phase probes import it.
- **What to do**: give knip `entry` globs for `src/**/*.test.mjs`, `scripts/**/*.mjs`,
  `e2e/**`, and `project` settings that respect the runner; then knip's remaining output IS
  the dead-code list and the next audit takes an hour, not a day. Coordinate with
  scripts-e2e-ci, who own the scripts half of the noise.
- **Saving**: 0 lines; every future audit
- **Risk & gate**: none (tooling config).
- **Confidence**: high.

---

## The floor deliverables

### A. Full triage of the 244 knip export/type lines

Legend: **D** = delete (dead, no consumer at all) · **DT** = delete + trim its test
(dead-with-test, finding 09) · **P** = make module-private / de-export (internal use only,
finding 10) · **K-test** = keep, a `*.test.mjs` imports it (knip config gap) · **K-fw** =
keep, framework/kit convention · **K-used** = keep, real consumer knip missed ·
**LAB** = lab-internal, deferred to lab lens (finding 17) · **X-ref** = delete the re-export
line only. Evidence column: `self=N` is occurrences in the defining file; `t` = test
importers; `c` = confirmed code consumers after import-path verification (raw grep counts in
my first pass were inflated by same-name collisions - e.g. `BirdAvatar` in a lab shell vs the
shipped one - and every verdict below is post-verification).

| # | Symbol | File:line | Verdict | Evidence |
|---|--------|-----------|---------|----------|
| 1 | fetchSessionCookie | scripts/qa/_dev-login.mjs:54 | K-used | 7 phase probes import it; knip entry gap (scripts lens) |
| 2 | devLoginContext | scripts/qa/_dev-login.mjs:102 | D | self=1, zero users anywhere (finding 15) |
| 3 | assertSameOriginAfterNavigation | scripts/qa/local-base-url.mjs:23 | K-used | auth.setup.ts + tour-mobile-verify use it |
| 4 | cookieDomainForBaseUrl | scripts/qa/local-base-url.mjs:30 | K-used | tour-mobile-verify.mjs + its test |
| 5 | createCatchup | src/app/(main)/catchups/actions.ts:337 | D | finding 02; external matches are comments only |
| 6-57 | 52 lab symbols (AmbientLayer, RouteLink, BASE_CSS, T, PROSE, CODE, ROOMS, useToggles, PreviewStyles, FilterPanel, describeFilters, SentenceLine, PLACES, makeMembers, WorldCanvas, usePoints, ShippedCard, PersonRow, CompactCard, RuledRow, LIVE_ROWS, LIVE_TOTAL, TAGGED, FIELDS, STAGES, PEOPLE, BirdAvatar, yearRange, VIEWPORT, SIDEBAR, UNI_LEFT, PLEDGE, SEGMENTS, MONTHLY, BUILD_COST x2, BUILD_RECOVERED, LETTERS, GATES, SURFACES, verdictFor, libre, sourceSans, fraunces, newsreader, instrument, literata, publicSans, inter, figtree, SHIPPED_SET_WIDTH, Sheared) | src/app/lab/** | LAB | finding 17; all lab-internal or fully dead; the unused `_fonts.ts` loaders are the only ones with build cost |
| 58 | ADMIN_SECTIONS | components/admin/admin-nav.ts:129 | D | self=1 (finding 15) |
| 59 | correlate | admin/analytics/compare.tsx:184 | P | used at :247 in-file |
| 60 | formatValue | admin/analytics/stat.tsx:22 | P | used at :66 |
| 61 | StatTile | admin/analytics/stat.tsx:54 | P | used at :82 |
| 62 | Sparkline | admin/analytics/stat.tsx:97 | P | used at :69 |
| 63 | MAX_ACCEPTED_PROMPTS_PER_EDITION | catchups/home/types.ts:41 | D | actions.ts:95 has its own local (finding 15) |
| 64 | contributorsCopy | catchups/round/masthead.tsx:26 | P | used at :92 |
| 65 | archeTransform | common/bird-avatar-v2.tsx:87 | P | used at :1794 |
| 66 | ARCHETYPE_COUNT | common/bird-avatar-v2.tsx:1611 | D | self=1 (finding 15) |
| 67 | PILL_BASE | common/filters/pill-shell.tsx:34 | P | used at :113 |
| 68 | PILL_IDLE | common/filters/pill-shell.tsx:42 | P | used at :113 |
| 69 | AUTH_PANEL_VW | landing/hero-photo.ts:23 | P | `AUTH_FORM_VW` derives from it at :26 |
| 70 | isWideRoute | layout/content-column.tsx:52 | P | used at :60 |
| 71 | WORDMARK_LOGO_SIZE | layout/peaks-mark.tsx:22 | P | default param at :144 |
| 72 | WORDMARK_FONT_SIZE | layout/peaks-mark.tsx:23 | P | same pattern |
| 73 | EASE_POP | mascot/hoopoe-kit.ts:34 | D | motion.tsx has its own; zero refs (finding 15) |
| 74 | parallel | mascot/hoopoe-kit.ts:130 | D | no step ever built with it; player branch dies too (finding 15) |
| 75 | RARE_IDLE_CHANCE | mascot/moments/rare-idle-behaviors.ts:24 | P | used at :36 |
| 76 | HOUSE_TINTS | profile/houses-chain.tsx:44 | P | used at :410 (the 9 other-file matches are lab locals with the same name) |
| 77 | HousesChain | profile/houses-chain.tsx:759 | D | 3-line wrapper, callers use HouseTrail (finding 15) |
| 78 | PenRule | profile/pen.tsx:84 | P | letterhead imports other names from ./pen; PenRule referenced in-file (self=2) - verify at fix time, de-export |
| 79 | updateUserProfile | components/settings/actions.ts:26 | D | finding 01 |
| 80 | setTheme | components/settings/theme-actions.ts:31 | P | wrapped by setThemePreference at :74; de-export removes an invocable action |
| 81 | reportSpotlight | tour/tour-anchors.ts:28 | P | used at :83 |
| 82 | TOUR_STOPS | tour/tour-steps.ts:56 | P | ENABLED_TOUR_STOPS derives at :112 |
| 83-109 | 27 shadcn kit parts (CardFooter, CardAction, Combobox{Icon,Clear,Collection}, Dialog{Close,Overlay,Portal}, DropdownMenu{Portal,Group,Label,CheckboxItem,RadioGroup,RadioItem,Separator,Shortcut,Sub,SubTrigger,SubContent}, PopoverClose, Select{Group,Label,ScrollDownButton,ScrollUpButton,Separator}, Sheet{Footer,Description}) | components/ui/* | K-fw | finding 12: keep as a class, silence in knip config |
| 110 | loadSupport | lib/admin-analytics.ts:279 | D | finding 05 |
| 111 | isUploadedImageUrl | lib/admin-threads-server.ts:11 | X-ref | pure re-export line (finding 15) |
| 112 | THREAD_KINDS | lib/admin-threads.ts:16 | P | ThreadKind type derives at :17 |
| 113 | MAX_SUBJECT_LENGTH | lib/admin-threads.ts:24 | P | used at :90 |
| 114 | PER_QUEUE | lib/admin-worklist-query.ts:19 | P | 7 internal uses |
| 115 | worklistCounts | lib/admin.ts (~:240 at HEAD) | P | called in-file by the overview loader at :193 |
| 116 | signIn | lib/auth.ts:380 | D | drop from the destructure; all other `signIn` matches are next-auth/react (finding 15) |
| 117 | signOut | lib/auth.ts:380 | D | same (sidebar/letterhead use the client signOut) |
| 118 | DRAWN_SPECIES_COUNT | lib/avatar.ts:66 | P | used at :130-132 |
| 119 | SPECIES_PINS | lib/avatar.ts:86 | P | used at :134 |
| 120 | HOOPOE_HASH_REMAP_INDEX | lib/avatar.ts:108 | K-test | avatar.test.mjs imports it |
| 121 | fnv1a | lib/avatar.ts:140 | K-test | internal use at :165 + avatar.test.mjs |
| 122 | FIRST_BATCH_YEAR | lib/batch-year.ts:24 | K-test | batch-year.test.mjs |
| 123 | LAST_BATCH_YEAR | lib/batch-year.ts:25 | K-test | batch-year.test.mjs |
| 124 | ACTION_FAILED | lib/call-action.ts:23 | K-test | internal + call-action.test.mjs |
| 125 | DAY_MS | lib/catchups.ts:109 | K-test | catchups.test.mjs imports it (retention/shelf hits are their own locals) |
| 126 | HOUR_MS | lib/catchups.ts:110 | K-test | same |
| 127 | ANSWER_WINDOW_DAYS | lib/catchups.ts:129 | P | used at :512; NOT in the test's import block |
| 128 | PREPARING_HOLD_HOURS | lib/catchups.ts:130 | P | used at :560 |
| 129 | EXTEND_DAYS | lib/catchups.ts:132 | P | used at :624,631 |
| 130-132 | REMINDER_TWO_DAYS / _LAST_DAY / _EXTENDED | lib/catchups.ts:135-137 | K-test | test imports all three |
| 133 | dailyBucket | lib/catchups.ts:173 | K-test | test imports |
| 134 | withDailyBucket | lib/catchups.ts:178 | K-test | test imports; internal x4 |
| 135 | daysLeftUntil | lib/catchups.ts:187 | K-test | test imports; internal x5 |
| 136 | STATUS_ORDER | lib/catchups.ts:197 | P | internal x3; not in test imports |
| 137 | suggestSeedPrompts | lib/catchups.ts:300 | DT | finding 02 |
| 138 | catchupTitle | lib/catchups.ts:354 | K-test | test imports (the two page-file matches are comments) |
| 139 | TICK_GRACE_MS | lib/catchups.ts:414 | K-test | test imports |
| 140 | computeStatus | lib/catchups.ts:422 | K-test | test imports; internal x4 |
| 141 | nextEditionStatus | lib/catchups.ts:448 | K-test | test imports |
| 142 | dueReminder | lib/catchups.ts:465 | P | called at :736; not in test imports |
| 143 | shouldExtendForNoQuestions | lib/catchups.ts:491 | P | called at :683 |
| 144 | questionsExtendPatch | lib/catchups.ts:622 | P | called at :686 |
| 145 | planNextAction | lib/catchups.ts:676 | K-test | test imports; the actions.ts match is a comment |
| 146 | valleyDaysLeft | lib/catchups.ts:767 | K-test | test imports; page match is a comment |
| 147 | cityNameVariants | lib/city-coords.ts:157 | P | used at :154 |
| 148 | OWN_PIN_CITIES | lib/city-coords.ts:195 | P | hasOwnPin uses it at :200 |
| 149 | SUBJECTS | lib/collection.ts:4 | P | SUBJECT_LABELS derives at :44 |
| 150 | AREAS | lib/collection.ts:21 | P | AREA_LABELS derives at :45 |
| 151 | SUBJECT_VALUES | lib/collection.ts:40 | D | derived, never read (finding 15) |
| 152 | AREA_VALUES | lib/collection.ts:41 | D | same |
| 153 | CONTRIBUTION_STATUSES | lib/contribution-state.ts:22 | DT | finding 09; webhook uses PAYABLE_FROM et al., not this |
| 154 | canBecomePaid | lib/contribution-state.ts:42 | DT | finding 09 |
| 155 | SEARCH_TERM_MAX | lib/db-text.ts:31 | K-test | internal + feed-write-rule pin |
| 156 | DEMO_VISITOR | lib/demo-seed/people.ts:53 | P | ALL_DEMO_PEOPLE derives at :585 |
| 157 | DEMO_PEOPLE | lib/demo-seed/people.ts:69 | P | same |
| 158 | DEMO_CLOSED_PATHS | lib/demo.ts:284 | K-test | proxy.ts carries a deliberate mirror copy "kept honest by demo.test.mjs" (proxy.ts:28) - the export IS the honesty check |
| 159 | directorySortOptions | lib/directory-facets.ts:28 | D | self=1 (finding 15) |
| 160 | directoryDefaultSort | lib/directory-facets.ts:32 | D | self=1 |
| 161 | EMAIL_MAX | lib/email-address.ts:32 | P | used at :43 |
| 162 | dailyBudget | lib/email-queue.ts:394 | K-used | admin mail actions import it (knip line-drift; verify at fix time) - if knip is right and that match is a comment, P (internal x4) |
| 163 | MAIL_DAILY_CAP | lib/email-queue.ts:840 | D | alias of DAILY_CAP, self=1 (finding 15) |
| 164 | EMAIL_UNVERIFIED | lib/email-verification.ts:29 | X-ref | re-export line; consumers use email-gate-message (finding 15) |
| 165 | SEND_TIMEOUT_MS | lib/email.ts:77 | K-test | internal x2 + mail-queue-rule pin |
| 166 | groupHouseYearEntries | lib/house-spans.ts:40 | P | used at :89 |
| 167 | seedHouseYearRows | lib/house-spans.ts:84 | DT | finding 09; only a comment + test reference it |
| 168 | missingYears | lib/house-spans.ts:112 | P | used at :140 |
| 169 | restoreAllYearRows | lib/house-spans.ts:135 | D | zero refs of any kind (finding 09) |
| 170 | UPLOAD_BODY_LIMIT | lib/image-downscale.ts:88 | K-test | upload-size-rule pin |
| 171 | MAX_INPUT_PIXELS | lib/image.ts:16 | P | internal x4 (upload-shared.ts has its OWN const of the same name) |
| 172 | MAX_STORED_PIXELS | lib/image.ts:51 | K-test | image-fit.test.mjs |
| 173 | storedPixelFit | lib/image.ts:62 | K-test | internal at :112 + test |
| 174 | WEBP_MAX_DIM | lib/image.ts:80 | K-test | image-fit.test.mjs |
| 175 | SESSION_GAP_MIN | lib/last-seen.ts:17 | K-used | comment at :15-16: "Kept as documentation of the window; the window itself is now enforced by the rolling cookie's max-age in src/proxy.ts" - deliberate, see Not-findings |
| 176 | RESERVED_KINDS | lib/mail-policy.ts:46 | P | used at :58 |
| 177 | drainEligible | lib/mail-policy.ts:109 | K-used | email-queue.ts consumes (mail-policy tests too) |
| 178 | drainHasWork | lib/mail-policy.ts:328 | K-used | same |
| 179 | TAP_MIN_PX | lib/map-cluster.ts:66 | K-used | internal x2 + scripts/qa/map-cluster-verify.mjs |
| 180 | hitRadiusU | lib/map-cluster.ts:119 | K-test | internal x4 + map-cluster.test.mjs |
| 181 | MEMBER_UNVERIFIED | lib/member-gate.ts:30 | X-ref | re-export line (finding 15) |
| 182 | isAliasedPlaceId | lib/place-aliases.ts:70 | D | self=1 (finding 15) |
| 183 | MAX_PLACES | lib/place-input.ts:23 | K-test | internal (placesSchema) + place-input.test.mjs |
| 184 | placeSchema | lib/place-input.ts:25 | P | placesSchema + PlaceInput derive from it |
| 185 | batchTargetsInclude | lib/post-visibility-rule.ts:155 | K-test | internal at :236 + rule test |
| 186 | isRecordNotFound | lib/prisma-errors.ts:27 | DT | finding 09 |
| 187 | razorpayConfigured | lib/razorpay.ts:42 | D | self=1 (finding 15) |
| 188 | stripRosterInitials | lib/roster-rule.ts:34 | K-used | scripts/dev/import-roster.mjs + roster-rule test |
| 189 | tryRosterAutoVerify | lib/roster.ts:33 | P | wrapped by tryRosterAutoVerifyQuietly at :99 |
| 190 | instagramHandle | lib/social.ts:9 | X-ref | pass-through of normalize's (finding 15) |
| 191 | socialIcon | lib/social.ts:26 | DT | finding 09 - and normalize.test.mjs:71 uses its decl as a slice BOUNDARY; repoint it |
| 192 | socialHost | lib/social.ts:54 | DT | finding 09 |
| 193 | readTourState | lib/tour-local.ts:38 | P | used at :45 |
| 194 | ownUploadsPrefix | lib/upload-ownership-rule.ts:37 | K-test | upload-ownership-rule test |
| 195 | MAX_IMAGES | lib/upload-ownership.ts:5 | K-used | upload-ownership-rule.ts consumes |
| 196 | MAX_IMAGE_URL | lib/upload-ownership.ts:5 | K-used | same |
| 197 | firstGrapheme | lib/utils.ts:138 | K-test | internal (getInitials :165-166) + text-shape test |
| 198 | truncateGraphemes | lib/utils.ts:156 | K-test | internal x2 + test |
| 199 | pickAvatarColor | lib/utils.ts:200 | D | self=1 (finding 15) |
| 200 | formatBatch | lib/utils.ts:204 | DT | finding 09; all matches are "not formatBatch" comments; kills the tsc-unused `batchType` hit |
| 201 | computeBatchFromSchooling | lib/utils.ts:522 | D | finding 04 |
| 202 | reportSchema | lib/validators.ts:283 | D | self=1 (finding 15) |

Types (203-244): LabStatus, LabChildEntry, Room, Place(lab), ScaleKey, Person(lab), Shot,
ChainMetrics, MockLinkKind, SurfaceScore = **LAB** (10). AdminSectionDef **D** (with
ADMIN_SECTIONS). AnswerAsker **P** (self=2; the test hit is a name collision - types are
stripped, a .mjs cannot import one). EyeShape **P**. ContactKind **P** (self=7). TourStopId
**D**. Metric **D**, Slice **D**. ContentType **P** (self=3; the storage.ts hit is its own
`ContentType`). PeopleState **P**, PeopleKind **P**. ThreadKind **D**, ComposerKind **D**.
WorklistCounts **P**. ActionFailure **P** (the dialog hits import `ActionFailureLike`).
CatchupRoundSection / CatchupRoundView / CatchupViewerRole / CatchupArchiveRow **D**.
NotifyBaseCtx **P** (self=5). EditionAction **P**, EditionCounts **P**. DemoComment **P**,
DemoEntry **P**. Budget **P**. VerifiedViewer **P**. HouseYearRow **P** (self=7). HouseName
**P**. DenialReason(rule) **P** / DenialReason(post-visibility) **X-ref** (drop from the
`export type` line at :12). Profession **P** (the 9 file hits carry their own lab locals /
import other names - verify with tsc at fix time). TourLocalState **P**. BatchComputation
**D** (finding 04).

Tallies: **D/DT 27** · **X-ref 5** · **P ~58** · **K-test 26** · **K-used 12** · **K-fw 27**
· **LAB 62** · scripts-owned 4. (27+5+58+26+12+27+62+4 = 221 export lines + the 23 type
verdicts embedded above = 244.)

### B. Unlinked-route sweep (all 92 build routes checked for inbound hrefs)

Candidates with zero or comment-only inbound links, and verdicts:
- `/donate` - 0 refs -> finding 16 (owner).
- `/dark-mode` - linked (letterhead-profile.tsx:1354, the profile's theme tile). Alive.
- `/notice/[id]` - no static links BY DESIGN: legacy notifications in the database point at
  it and it self-resolves into a thread (`lib/admin-note.ts:13`, page's own comment). Alive;
  data-linked. Do not delete while any `admin_note` notification rows predate the threads
  system.
- `/hoopoe` (4 refs), `/birds` (3), `/pick-bird` (5), `/welcome` (6), `/about` (2),
  `/guidelines` (7) - all linked. Alive.
- Everything else has 5+ inbound refs or is an API/framework route.

### C. Placeholder subsystems

- Hardcoded-false flags: `SHOW_SHOWCASE` (`src/app/page.tsx:127`) and
  `LOCKUP_FUN_FACT_ENABLED` (`src/components/layout/logo-fact.tsx:39`) - both carry dated
  owner quotes explicitly asking for the code to be kept. Not-findings for deletion; the
  bundle lens should note page.tsx still imports the showcase stack (ShowcaseShot, SHOTS,
  AmbientLeaves, PerchingBirds, LandingNav) whose ~350KB of landing webps and component code
  ride the flag.
- Prisma models with no reader: `VerificationToken` (0 call sites), `GroupInvite`
  (demo-wipe only) - finding 14. `Account`(1)/`Session`(2) stay: the configured
  `@auth/prisma-adapter` owns them.
- Empty handlers / return-null components: the `return null` sites found are all guard
  clauses in live components (admin-counts, install-prompt, posthog-identify), not stubs.
- "coming soon / not yet / unavailable" greps: only real placeholder-text props and comments.
  No stub screens found outside lab.
- The dead `parallel()` hoopoe step-combinator + its player branch (finding 15) is the one
  true miniature placeholder: machinery for a step type never constructed.

### D. Unused CSS

Definitive list (finding 13): `--z-base`, `--space-3xl`, `--chart-1..5` (three blocks),
`.animate-bell`. Everything else in globals.css verified in use, including all LiftKit
`--space-*` steps, `--radius-input`, `state-layer`, all sidebar tokens, all keyframes
(`warm-shimmer`, `deeplink-fade`, `bell`).

### E. Unused public assets (KB)

Tracked, zero-referenced: `collection/v4.webp+thumb` 196KB · `v5+thumb` 176KB · `v6+thumb`
244KB · `c5+thumb` 356KB · `c6+thumb` 272KB · `support-qr{,-500,-1000,-2000,-5000}.svg`
208KB · `collection/gen/*.svg` (12) 48KB · `brand/rishi-valley-mountain-mark-dark-4096.png`
376KB + 4 brand SVGs 16KB (owner). Untracked local junk: `landing-original.jpeg` 6,060KB ·
2 WhatsApp jpegs 2,984KB · 4 `.DS_Store` ~40KB · 2 `public/uploads` webps 60KB.
Total: ~1,892KB tracked (~1.5MB excluding brand) + ~9,144KB untracked. Alive-but-looks-dead:
`demo-banyan-*`/`demo-assembly-wide` (extensionless `file:` keys in demo-seed/content.ts).

### F. Always-constant env flags

- `IS_POSTGRES` (DATABASE_URL prefix, 3 copies) - always true; dead SQLite branch ->
  finding 08. The only real one.
- `TURNSTILE_DEV_CHALLENGE` / `TURNSTILE_DEV_REAL` - dev-machine switches with documented
  incident history (2026-08-22: "invisible locally meant untested locally"). Keep.
- `SENTRY_DEV`, `NEXT_PUBLIC_POSTHOG_DEV`, `EMAIL_DEV_SEND` - same pattern: constant in any
  one deployment, but the dev branch is the feature. Each guards 1-3 lines. Keep.
- `NEXT_RUNTIME` edge/nodejs split in instrumentation.ts - framework convention. Keep.

### G. Removable totals

**T1 confidence**: findings 03, 07, 13, 15, 16, the D/DT/X-ref rows executed with
tsc+unit-suite gates ≈ **420 lines / 2 files / ~9.1MB local disk**. **T2 confidence**
(adds one verification step each - a DB SELECT, a spec edit, a test-slice repoint):
findings 01, 02, 04, 05, 06, 08, 09 ≈ **a further ~340 lines and ~1.5MB tracked assets**.
Migration-gated (T3): finding 14, ~35 schema lines + 3 DB objects. Combined code estimate:
**~760 lines**, deliberately excluding the lab lens's possible ~150 and the de-export sweep's
zero-line hygiene.

---

## Owner decisions

- **/donate** (finding 16). The page is a 7-line redirect kept "so old links never break",
  but the site has not launched, so the only possible old links are members' own bookmarks
  from testing. My recommendation: delete it now, before launch mints real external links
  that would then justify keeping it forever.
- **The brand-mark files** (`rishi-valley-mountain-mark-dark-4096.png`, 376KB, plus four SVG
  variants, 16KB). Nothing in the app or even in /lab references them; the shipped mark is
  drawn in code and the small `-light-200.png` serves email. These look like the source
  exports of the final logo. My recommendation: keep the SVGs (they are the master vectors,
  16KB, cheap insurance), move or delete the 4096px PNG - a rasterisation the SVGs can
  regenerate at any size.
- **The shadcn kit sub-exports** (finding 12). Recommendation: keep, and silence in knip
  config, for the re-generation-risk reasons given there.
- **GroupInvite** (finding 14). Groups are retired as a user-facing feature but survive as
  the membership substrate under Catch-ups. Invites have no code path at all today. If
  invites-to-a-catchup is a possible future (the join-token flow already covers it, which is
  the strongest argument it is not), the model could stay; my recommendation is to drop it
  with the other schema cleanup and re-add if ever needed - re-adding a table is cheap, and
  the join-token flow already does this job.
- **Lab unused exports and font loaders** (finding 17): the lab lens should bring the
  specific list; the ten-font `_fonts.ts` is the only piece with real build cost.

## Not-findings

(verified intentional; do not re-litigate)

- **The 68 `*.test.mjs` "unused files" and every K-test export above** - the unit suite
  imports real `.ts` modules under Node type-stripping (catchups.test.mjs header documents
  it); knip simply has no entry for them (brief sec 3 pre-confirms). Finding 18 closes the
  gap.
- **`DEMO_CLOSED_PATHS` in demo.ts** - looks dead (proxy has its own copy); the proxy copy's
  comment says the mirror is "kept honest by demo.test.mjs", i.e. the export exists so the
  test can compare the two lists. Load-bearing.
- **`SESSION_GAP_MIN`** - kept "as documentation of the window; the window itself is now
  enforced by the rolling cookie's max-age in src/proxy.ts" (last-seen.ts:15). Deliberate.
- **`.puppeteerrc.cjs`** - read by Puppeteer's installer; skips a ~130MB Chrome download on
  every Vercel build. Its own comment is the defence.
- **`e2e/auth.setup.ts`** - Playwright setup project (`e2e/playwright.config.ts:103`
  `testMatch: /auth\.setup\.ts/`, dependencies at :106,115). Framework convention.
- **`SHOW_SHOWCASE = false`** - owner, 2026-08-04, quoted in the file: "I don't want to
  delete everything under the landing page." Kept on purpose, one-flag reversible.
- **`LOCKUP_FUN_FACT_ENABLED = false`** - "Disabled per owner request; the reveal logic below
  is left intact ... so this can go back to `true` later without reconstructing it."
- **`/dark-mode` and `/notice/[id]`** - linked (profile tile) and data-linked (legacy
  notification URLs in the database) respectively.
- **`demo-banyan-*` / `demo-assembly-wide` images** - referenced extensionlessly by
  demo-seed `file:` keys; the demo Collection renders from them.
- **Turnstile/Sentry/PostHog/email dev flags** - real switches with incident history (sec F).
- **`commented-out-code.txt`'s 16 candidates** - all 16 are prose lines that merely resemble
  code (comment continuations like "// <Button>, and it had no hover at all before...") plus
  one documented JSDoc usage example (`verify-email-dialog.tsx:35`). Zero actual
  commented-out code in shipped src - genuinely impressive.
- **`todos.txt`'s 5 hits** - one cluster, the song-attachment column migration, explicitly
  deliberate ("needs a migration, deliberately not done in this pass",
  `song-attachment.tsx:13`). Tracked work, not rot.
- **`prisma/schema.prisma`'s expression indexes and partial-unique notes** - TRAPS.md defends
  each ("Do not 'fix' it").
- **The `--space-*` LiftKit tokens** - 19-189 uses each (except `--space-3xl`, finding 13).

## For other lenses

- **scripts-e2e-ci**: `gen-support-qr.mjs` is now a generator for five SVGs nothing serves
  (dead-code-06); `devLoginContext` in `_dev-login.mjs` is dead; `fetchSessionCookie` is
  live (7 probes) despite knip; knip-production additionally lists `check.mjs`, `crawl.mjs`,
  `screenshot*.mjs` etc. as unused - all entry-config gaps, not verdicts.
- **dependency-diet**: `jsqr` + `qrcode` exist only for the dead QR pipeline; `supercluster`
  + `@types/supercluster` + `d3-scale` + `@types/d3-scale` are knip-unused and
  `lib/map-cluster.ts` looks like the hand-rolled replacement (checked: no `supercluster`
  import anywhere in src); `xlsx` serves only `scripts/dev/import-roster.mjs`; unlisted
  `d3-selection`/`geojson` are typed-only reaches into d3 packages from `alumni-map.tsx` and
  a lab map; `@auth/core/jwt` unlisted in dev-login route.
- **data-layer**: finding 14 overlaps you (VerificationToken, openTo, tag, GroupInvite); the
  schema's collision notes (:813-823) describe LEGACY TABLES still standing in the live
  database (`Catchup`, `CatchupPref`, `CatchupAnswer`...) that no schema model maps - the
  biggest dead-DB item is yours, not mine. Also: whether `@auth/prisma-adapter` earns its
  keep under Credentials+JWT (Account/Session are otherwise demo-wipe-only).
- **bundle/perf**: `src/app/page.tsx` imports the full showcase stack behind
  `SHOW_SHOWCASE=false` - confirm the minifier actually drops it from the client bundle;
  lab's `type/_fonts.ts` loads ten Google fonts of which several have no importer.
- **lab**: finding 17's 62-symbol list, and `_fonts.ts` specifically.
- **shell-primitives**: the CSS list in sec D is definitive per my charter; nothing further
  to hunt there.
- **lib-tests**: finding 09 deletes test blocks in five files and repoints one slice
  boundary (`normalize.test.mjs:71`); the check gate's suite-count floor will need a
  conscious bump if `prisma-errors.test.mjs` empties.
- **root-docs-assets**: sec E is the definitive code-referenced-images list; the brand-mark
  question is in Owner decisions.

## Metrics

- knip lines triaged: 244/244 (202 exports, 42 types); unused files triaged: 8 of 124
  (the rest pre-assigned to scripts/tests lenses); verdict distribution: 27 delete,
  5 re-export-line deletes, ~58 de-exports, 65 keeps with reasons, 62 lab-deferred, 27
  framework-keeps.
- Routes swept: 92; unlinked found: 1 (/donate).
- globals.css: 662 lines read, ~60 custom tokens/classes/keyframes individually grepped,
  4 dead.
- public/: 80 files, every basename grepped (with the extensionless re-check that saved the
  demo images); 22+ tracked orphans, 9 untracked junk files.
- Prisma: 41 models call-site-counted; 1 zero-reader model, 1 demo-wipe-only model, 2
  self-documented dead columns.
- Biggest single dead blocks found: `updateUserProfile` 114 lines; `createCatchup` cluster
  ~130; `computeBatchFromSchooling` ~85; `loadSupport` ~55; `restoreAllYearRows` +
  `seedHouseYearRows` ~65.
- Estimated honest total: ~760 lines of code, ~1.5MB tracked assets, ~9MB local disk, 2
  component files, 1 schema model + 2 columns, ~55 exports narrowed.
