# Refactor audit 1 — fix campaign (LIVING HANDOVER)

**This file is the entire handover.** The owner starts a fix session by @-ing it and
nothing else. You (the fix session, running on Opus, max effort) read it top to bottom,
execute the next unfinished work, and **edit this same file before your session ends** —
status board updated, session log appended — so the next session can be started by @-ing
it again. If you die mid-item, whatever you already wrote here is the recovery point; a
session that hears "continue" re-reads this file first.

## What this campaign is

Execute the six-phase plan in [`report.md`](report.md) (§2), produced by the 2026-08-25
refactor/simplification audit: 241 verified findings, ~4,500–5,500 lines of dead and
duplicated code, ~6.4 MB of tracked dead weight, ~360–380 KB of JavaScript off every
member page, and the process mechanisms in §7. Every plan row cites finding ids; the full
evidence, exact line ranges, steps, risks and gates for an id live in
`work/agents/<prefix>.md`. **Corrections from the adversarial verification override the
agent text** — report §3 lists the load-bearing ones; `work/verify/<cluster>.md` has the
rest. Read the agent entry AND the §3 corrections for every item before touching code.

## Status board (update every session)

- [x] Phase 1a — dead code in src — **done 2026-08-26**, 21 commits, 2,320 lines deleted / 268 added (net −2,052 against a ~1,800 estimate). All 16 plan rows executed; see session 1 below for the six places the audit's text was wrong and what was done instead.
- [x] Phase 1b — root, docs, assets, dependencies — **done 2026-08-26**, 18 commits.
      All 16 rows executed (the "archive the closed bug audit" row had already been done by
      the `docs/audit-fix/` reorganisation). ~6.5 MB out of the tree, 8 packages out of the
      graph, 2 in. One row part-refused on measurement (prisma → devDependencies) and one
      row's CLAUDE.md half is blocked on the owner's uncommitted edit; see session 2.
- [x] Phase 2 — placeholders, flags, Groups residue — **done 2026-08-26**, 11 commits.
      All 8 plan rows executed, plus the two owner-decided items (#11 LogoFact delete, #2
      tour lazy-load). The owner answered five §4 decisions at session start; see session 3.
      One row (#10 Profession) had already been executed by the phase-1a session as a
      one-off while the owner's answer was live — not redone.
- [x] Phase 3 — dedupe at lib level — **done 2026-08-26**, 21 commits. All 14 rows executed
      (lib-tests-02 had already landed as `9cee0d5`). Two pieces deliberately deferred with
      reasons: shell-primitives-09's utils.ts module split belongs to phase 5's measurement,
      and lib-tests-01's optional `section()` migration is not safe as a sweep. See session 4.
- [x] Phase 4 — dedupe at component/route level — **done 2026-08-26** over two sessions,
      39 commits (25 + 14). All 21 rows executed or consciously refused. Part 1 is session
      5; part 2 is session 6, which took the admin programme and the five remaining rows.
      Three deliberate refusals across the phase, each with its reason in its session log:
      the shared pager (feed-posts-05), the audit-log skeleton (admin-analytics-09), and
      the halves of duplication-07/08 that would over-delete or point at the wrong database.
- [ ] Phase 5 — bundle & build (+ before/after measurements vs report §1a)
- [ ] Phase 6 — schema & architecture (owner-gated throughout)
- [ ] Close-out: re-measure §1b's table, write the deltas into report §1b, flip this
      audit's row in `../README.md` to Closed, archive per report §7.4.

Within a phase, mark finished items inline in the session log with their commit SHA.
Phases 1–4 are mutually independent; 5 after 1–2; 6 needs owner approvals.

## Owner input map

The owner gives input before the phase that needs it — ask at phase start, in plain
language, only for that phase's decisions (report §4 has the full wording + recommendations):

| Before | Decisions needed (§4 #) |
|---|---|
| 2 | Showcase fate + where the public Privacy/Terms links live NOW (#1); tour for members (#2); /donate redirect-vs-delete (#16/18); Profession filter — #10 is PART-ANSWERED (owner wants the feature long term; only the facet's launch fate is open, see report §4 #10); LogoFact (#11); About page (#3) |
| 5 | Duplicate TS check on deploys (#5); Vercel Analytics (#7); lab CSS measurement authorisation (#6) |
| 6 | ALL database drops (#4, incl. the Visit trio and the orphan reverted-Catchup tables); Collection taxonomy SELECT verdict (#16); avatarColor column |
| any time | Skills/agents relocation after the campaign (#8); probe retirement (#9); email queue (#12, post-launch); birds sprite (#13, quiet week); "sanan's stuff" move (#15, owner does it himself); §7 CLAUDE.md wording sign-off |

If a decision hasn't arrived, do the phase's autonomous items, skip the gated ones, and
list them under "awaiting owner" in the session log.

## Rules (non-negotiable)

1. One revertable commit per coherent item — code + its test edits + doc edits + moved
   visual baselines together. Plain conventional messages, no AI attribution, never push.
2. `npm run check` before every commit; `npm run visual` after any UI-touching item (read
   diffs before `visual:update`, stage updated PNGs with the item). ⚠ items name pinned
   tests — those test edits ride the same commit or check fails honestly.
3. The tree is shared: stage by name, never `git add -A`, never touch others' WIP. Never
   `prisma db push`; schema changes go schema-edit → dated file in
   `prisma/migrations-manual/` → `npx prisma generate` → `run-sql.mjs`, BOTH databases.
4. **Every item gets a pre-flight before any edit — never execute blind.** The audit ran
   against a moving tree, and its own verification refuted one finding a same-day commit
   had invalidated. Per item, before touching code: (a) open the cited lines at today's
   HEAD and confirm the claim still holds — the dead symbol still has zero callers (one
   grep), the clone still exists, the comment is still wrong; (b) check the finding's own
   falsifier — every entry carries "the one thing that would change my mind" — and check
   that thing; (c) read report §3's corrections and the item's `work/verify/` cluster
   verdict, which override the agent text. If the claim no longer holds, or the evidence
   does not convince you, do NOT force the fix: skip it and record it in the session log
   as "re-refuted at fix time" with the reason. A logged skip is a correct outcome; a
   blind edit is not.
5. Usage discipline: this is mostly hand-work; agents only where the report says a sweep
   is mechanical and big (e.g. the 57-file `m.` rename). No fan-out without a wave plan.
6. Owner-visible changes (anything a member could see, incl. side effects) get named to
   the owner in the session summary — his standing rule.
7. DB checks the audit couldn't run (marked in items): run the exact SQL given, read-only,
   before the dependent deletion.
8. On "kowalski": instant compact progress report (item n/m + %s), per CLAUDE.md.
9. On "close it out": scratch files deleted or ledgered, tree clean of yours,
   `temporary screenshots/` pruned, progress.md entry staged with the work.

## Suggested session slicing

1a · 1b · 2 · 3 · 4 (×2 if needed) · 5 · 6 — seven-to-eight sessions. Take the next
unchecked phase unless the owner names one. Finish an item's commit before ending; never
leave a half-item uncommitted without describing its exact state in the session log.

## Session log (append; newest last)

### 2026-08-26 — session 1 (phase 1a)

**Done** (in order; every item pre-flighted at HEAD per rule 4):
bug-lead filing → `1639bba` · ui/badge+ui/tabs → `a88ff68` · 23 shadcn sub-primitives →
`a8486d9` · utils.ts dead trio → `747297e` · updateUserProfile → `d5da4d7` · createCatchup
→ `6ae9d98` · loadSupport + 8 analytics fields → `b301cc4` · legacy mono avatar path
(734→118 lines) → `f8094ac` · dead-with-a-test trio → `aebeb88` · house-spans year-row
library → `d960b45` · ProfileAvatar→lab + directory sort stub → `0e4a264` · auth
metadata-only layouts → `99dcc4e` · globals.css dead tokens → `bdfadf4` ·
LOGIN_TRANSITION_FLAG → `17fcfeb` · tour `enabled` → `5ec94b2` · flight `speed` →
`a4f89cb` · bindPassword/parallel/EASE_POP → `71e6c70` · lib dead exports →
`e23e80c` · component dead props → `2ecb5f2` · lab kit exports → `09f5ebe` · de-export
sweep → `2f43a3d`.

**Where the audit was wrong, and what was done instead** (rule 4 outcomes):
- `ContactKind` (dead-code-11, "P") — **re-refuted**: `contacts-editor.tsx:42` imports it.
  Left exported. tsc caught it.
- `Profession` (dead-code-11, "P, verify with tsc") — verified: fully dead, not internal.
  **Deleted** rather than de-exported.
- `AdminSectionDef` — correction honoured, kept (used at `admin-nav.ts:43`); only
  `ADMIN_SECTIONS` went.
- `CONTRIBUTION_STATUSES`/`canBecomePaid` — withdrawal honoured, untouched.
- `MAX_INPUT_PIXELS` (dead-code-10, "P") — it is a *re-export line* in image.ts, not a
  declaration. Deleted the line; the const lives in upload-shared.
- `TourStopId`, `CatchupRoundSection` — listed "D", actually used in-file. De-exported,
  not deleted (CatchupRoundSection then died with CatchupRoundView anyway).
- `SORT_OPTIONS` — a cascade the audit missed: it existed only for
  `directorySortOptions`, so it went too.
- `prisma-errors.test.mjs` does **not** empty when `isRecordNotFound` goes (the audit
  feared it would) — it pins three predicates, two of which are live. No floor change.
  `house-spans.test.mjs` *would* have emptied, so it was rewritten to pin the live
  parsers, including a regression pin for audit Low 99.

**Deliberately deferred** (not skipped — they belong to a later phase):
- `feed-posts-13`'s `scope` / `groupId` / `composerScope` / `FeedScope` half is Groups
  plumbing; it must land with **phase 2**'s Groups-residue item, as the finding says.
  Only the uncoupled props (`emptyTitle`/`emptyHint`/`placeholder`) were taken here.

**One test was widened, deliberately** — `src/lib/gate-coverage.test.mjs`. Its delegation
pass built the "gated" set from EXPORTED actions only, so de-exporting `setTheme` (an
accidentally-public server action) orphaned `setThemePreference`'s inherited gate. It now
reads every async function in the file; the assertion still runs only over exported ones,
so it is strictly wider, not weaker. Verified by injecting an ungated exported action and
watching it fail, then removing it. **Owner should sight this one.**

**Verification**: `npm run check` ✓ green before every commit and at session end (TS,
ESLint, protocol, lab registry 42, unit 75/75). `npm run verify:crawl` ✓ all 17 routes 200.
Eyeballed: all four `/admin/analytics` views, `/admin/support`, own profile, `/feed`,
`/catchups`, `/catchups/new`, `/directory`, `/lab/profiles` (+passport/terrace),
`/lab/craft`, `/lab/type`, `/lab/transitions`, `/lab/location-picker`, `/dark-mode`; the
landing→Sign in flight sampled frame by frame; the /login password peek-a-boo clicked.

**`npm run visual` is RED and it is not this work** — 8 failures, the same 8 before and
after every change: `/feed`, `/directory`, `/letters`, `/catchups` at both viewports. Cause
is **live database drift** (a new post at the top of the feed, new directory signups), which
shifts everything below it. The other 15 pass, including `/birds`. **Not rebaselined**:
these are real rows, not an intentional UI change, and staging today's data as a baseline
would both misattribute the movement to this commit and go stale on the next post. This is
an owner decision (see below), and the next session should not treat those 8 as its own.

**Also found in passing, not fixed** (both belong to phase 1b/scripts-e2e-ci territory):
- `scripts/qa/crawl.mjs:11` — the hardcoded `OWN` profile id
  (`cmmz0vvws0000ynsg3ueb9scp`) no longer exists, and the crawler reports it **`OK 200`
  while the page renders the 404**. The crawl's two profile rows are therefore proving
  nothing. Same for `OTHER`.
- `next build`'s `.next/types/validator.ts` was stale and referenced the deleted auth
  layouts; moved aside to `validator.ts-stale` rather than rebuilding, because another
  session was mid-build. Harmless, regenerates on the next real build.

**Awaiting owner** (nothing blocked phase 1a; these are new):
1. The visual suite's four content routes will keep going red as members post. Mask, seed,
   or accept? (Not a regression; a suite-design question.)
2. Sight the `gate-coverage.test.mjs` widening above.

**State left**: clean — every file I touched is committed. `CLAUDE.md` is modified in the
tree and is **not mine** (the owner's 150-word commit rule).

**Next session**: phase 1b (root, docs, assets, dependencies). Read the status-board note
first — several 1b rows were already executed by the `docs/audit-fix/` reorganisation and
must not be redone. 1b needs owner input before it starts: WhatsApp originals, overflow
PDF destination, brand 4096 PNG, xlsx path (report §4 #14, #3-adjacent).


### 2026-08-26 — session 2 (phase 1b)

**Owner decisions taken at session start**: WhatsApp originals, overflow PDF and the 4096
brand PNG all **moved to `sanan's stuff/moved out of the repo/`** (not deleted), with a note
file there explaining each and how to recover it. xlsx: **no more spreadsheets are coming**,
so the workbooks were converted to CSV and the dependency deleted (below).

**Done** (in order; every item pre-flighted at HEAD per rule 4):
QR pipeline → `01b069d` · asset eviction (WhatsApp + overflow + brand PNG) → `5258628` ·
dead collection images + gen/ → `77dc9da` · six dead deps out, three borrowed ones listed,
dev-login via next-auth/jwt → `931a4cd` · prisma family aligned + shadcn/pg/dotenv/@types
re-sectioned → `fd62729` · next + eslint-config-next to 16.3.3 → `6411d77` · puppeteer
skipDownload → `cb3709d` · crawl.mjs profile rows → `b97dc24` · tsbuildinfo relocation →
`4cf744d` · .gitignore trim + .DS_Store sweep → `0a73211` · README + AGENTS.md → `fe57798` ·
six dead doc pointers + profile.md banner + ROADMAP notes → `3c398a1` · progress.md June/July
archive → `827e650` · zod/v4 + @types/node 24 + dead vitals CSP → `c85658f` · SECURITY probe
range + OPERATIONS snapshot.yml section → `0a3b7ef` · drive.mjs dead route → `04faee1` ·
popover onto menu material (+ tw-animate-css out) → `add8dd2` · roster CSV + xlsx out →
`938a898`.

**Where the audit was wrong, and what was done instead** (rule 4 outcomes):
- **dependency-diet-02 (prisma → devDependencies): part re-refuted, NOT executed.**
  `@prisma/client` declares `prisma` as an **optional peer**, so npm keeps it in the
  `--omit=dev` graph whichever section lists it — measured with `npm ls prisma --omit=dev`
  before and after the move, and the audit gate still reports the same allowlisted advisory.
  The finding's two payoffs (~121 MB out of the production graph; retiring the
  GHSA-ggr8-5vv4-36mx allowlist entry) therefore do not exist, leaving only deploy risk, so
  prisma stays in `dependencies`. **Do not retry this, and do not delete the allowlist entry.**
  The rest of the row stands: shadcn genuinely leaves (~22 MB), as does @types/d3-zoom; pg and
  dotenv were moved on correctness grounds (nothing under src imports either; pg reaches the
  runtime through @prisma/adapter-pg) while honestly saving nothing.
- **dependency-diet-11**: latest is now **16.3.3**, not the 16.3.2 the report names. Bumped
  both to 16.3.3. The newer eslint-config adds `no-location-assign-relative-destination`,
  which flags three deliberate hard navigations (demo reset, admin user deletion, password
  reset); each keeps its behaviour under a disable comment stating why. Note the rule fires on
  the **literal** relative path, not a computed one.
- **root-docs-assets-10**: `docs/README.md` was already correct (the audit-fix reorganisation
  fixed it). CLAUDE.md's half was closed later in the session, once the owner said his own
  uncommitted edit could ride along — `1178e4a`.
- **root-docs-assets-06 (progress.md archive)**: the file is not chronological — lines 1–467
  are a newest-first head block, then the full chronology. June and July happen to be one
  contiguous run (468–1348), so only those moved; August is the live month. Proved lossless by
  rebuilding the original from the three files: all 3,913 non-blank lines identical.
- **root-docs-assets-14**: the .DS_Store sweep was done with explicit `rm` after a preview —
  a bare `find -delete` is blocked by a safety hook. The three inside `sanan's stuff/` were
  left alone. The two stale `public/uploads/2026/03` webps were **not** deleted: local-only,
  gitignored, 58 KB, and the finding itself says removing them can only inconvenience this
  machine.

**Beyond the plan, because they were gates reporting success on nothing:**
- `crawl.mjs` (session 1 flagged this): two hardcoded profile cuids, both users deleted. A
  missing profile answers **200** with the app shell, so two rows printed `OK 200` for blank
  pages. Ids now come from the database; each profile row must render that person's name.
  Negative-tested.
- `drive.mjs`: the houses and places scenarios drove `/settings`, gone since `22b4b6c`. Both
  repointed at the member's own profile; the houses scenario now asserts the popover is really
  on screen. This is what verified the popover change.

**The roster migration is bigger than the plan row.** The owner's answer to #14 was neither
"CDN" nor "delete the script": convert the workbooks to CSV, keep the script, lose the library.
Done — `roster.csv` carries every column of all four person-sheets (2,602 rows / 44,646 cells,
checked back cell by cell, zero differences), the workbooks moved to `moved out of the repo/`,
`xlsx` deleted. **The CSV reader surfaced a live bug in `toEntry`**: an empty email escaped the
truthiness guard as `""`, and since the dedupe key is `email ?? name|year` and `""` is not
nullish, every person without an email collapsed onto one key — 2,134 people became 1,333.
Caught by diffing both readers' entries; both now produce byte-identical output. **The
workbooks were never in git** (the folder is ignored), so `moved out of the repo/roster
spreadsheets/` holds the only copies — its note file says so.

**Verification**: `npm run check` ✓ green before every commit (TS, ESLint, protocol, lab
registry 42, unit 75/75). `npm run visual` run three times — **the same 8 failures before and
after everything**, identical to session 1's set, and the diff is content (a new Catch-up
round, a lit notification bell), not layout. `npm run verify:crawl` ✓ 17/17 routes 200 with the
fixed crawler. `npm run screenshot:auth` and `verify:shot /feed` ✓ after the dev-login and
prisma changes. `npm run analyze`'s replacement command verified present in Next 16.3.1's CLI.
The bundled-Chrome claim was re-proved by launching it (it dies), not taken on trust.

**Closed after the owner read the summary** (same session):
- **The visual suite is green, 23/23**, for the first time since 2026-08-25 — he asked for the
  call rather than the options. `e2e/visual.spec.ts` gained a `live` mode: `"band"` (feed,
  letters, catchups) shoots at viewport height and masks the content under the page header,
  because one inserted post moves everything below it; `"map"` (directory) masks only the map
  drawing and the headcount, keeping the search field, filters, toggle and map box full page.
  `spine()` pins the content column's x and width as numbers on all four. A first attempt that
  masked all of `main` was discarded after looking at the result — a sidebar and a magenta
  rectangle. Failure was re-proved by swapping a baseline. **`/collection` is deliberately NOT
  live-masked**; if full coverage of the four is ever wanted back, the answer is seeded content,
  not a bigger mask. → `900546f`
- **CLAUDE.md's spec list gained `admin`**, committed with his own uncommitted wording tweak at
  his say-so, so root-docs-assets-10 is fully closed. → `1178e4a`

**Awaiting owner**:
1. Sighting session 1's `gate-coverage.test.mjs` widening (nothing to decide; a security test
   changed shape and he should know).
2. **~357 MB of unused Puppeteer Chrome** in `~/.cache/puppeteer`. A safety hook blocks
   recursive deletes outside the repo, so clearing that folder is his to run.

**State left**: clean — every file I touched is committed, `CLAUDE.md` included (the owner
released his own uncommitted edit to ride with it). `c095f4c fix(lab): ...` landed mid-session from another session in
this same tree; untouched.

**Next session**: phase 2 (placeholders, flags, Groups residue). It needs owner input first —
report §4 #1 (showcase fate + where the public Privacy/Terms links live now), #2 (tour for
members), #16/#18 (/donate redirect vs delete), #10 (Profession filter), #11 (LogoFact), #3
(About page). Note phase 1a deliberately deferred `feed-posts-13`'s `scope`/`groupId`/
`composerScope`/`FeedScope` half into phase 2's Groups-residue item.

### 2026-08-26 — session 3 (phase 2)

**How this session started, because it matters for the next one**: the board said phase 2,
but the tree had uncommitted edits hiding the Profession facet, touched three minutes
earlier, with three peer sessions live in this checkout. I read that as phase 2 already
being worked and started phase 3 instead. It was not: `rv-connect-ad` (the phase-1a session,
still alive) had executed the §4 #10 row as a one-off because the owner answered it
mid-session. **Ask the peers before inferring from the tree** — `ListAgents` + one
`SendMessage` settled in a minute what the tree could not. One phase-3 commit had already
landed by then and was kept (below).

**Owner decisions taken at session start** (§4): showcase **decoupled now**, ship-vs-retire
still his before launch · tour stays **demo-only and lazy-loaded**, not armed for members ·
About page **keeps the joke** as-is · LogoFact **deleted** · /donate **redirects**.

**Done** (every item pre-flighted at HEAD per rule 4):
`insensitive` unconditional + 2 copies → `92b28c9` · /donate → proxy redirect → `9714b09` ·
LogoFact deleted, Brand absorbs its aria-label + nowrap → `76624d1` · landing showcase
decoupled to showcase.tsx → `a808af8` · tour UI lazy-loaded → `d698bf2` · tour
catchups-explainer anchor restored → `0419828` · dead group_invite bell glyph → `89ee007` ·
letters group branches → `1903525` · Groups feed plumbing → `a54d7b9` · skeletons mocking
retired pages → `34a77b4` · stale-comment batch → `c6057ea` · /notice retirement dated →
`4219a1d`.
Phase 3, out of order: gate-coverage adopts balancedBody → `9cee0d5`.

**Where the audit was wrong, or thinner than the tree** (rule 4 outcomes):
- **lib-tests-02's suggested regex would have re-broken a security sweep.** It says to call
  `balancedBody(text, /export\s+async\s+function .../)`. Session 1 had *widened* fnBody to
  make `export` OPTIONAL so the delegation pass can see gates living in private helpers.
  Hardcoding `export` back would make setTheme's inherited gate invisible and the sweep pass
  on nothing. Kept `(?:export\s+)?`; proved by injecting an ungated exported action.
- **The Groups residue is bigger than the row.** The findings name feed/actions.ts,
  post-feed, feed-column. It also runs through **create-post-form** (a `group` ComposerScope,
  its placeholder, the formData groupId, the "Posted to the group" toast, and an
  audience-options branch) and **post-card**'s type. All removed; `authorized` in deletePost
  had to become a const, which is how ESLint found the tail of it.
- **The "no cron on this project" claim is not just stale, it is false.** critic-1 said five
  files; all five said there is NO cron. There are two Vercel crons and three scheduled
  workflows. The true statement — none of them drains the mail queue — is what each says now.
- **utils.ts:193's color.md pointer is already gone**, taken out with pickAvatarColor in
  phase 1a. Nothing to do; recorded so nobody hunts for it.
- **member-surfaces-05 has no ledger to write to** — no dated-cleanup ledger exists in this
  repo. Created a "Dated cleanups" section in `docs/planning/bugs.md` and put the note in the
  file header too, so it is found either way.
- **landing-mascot-avatars-04's element choice was the whole finding.** GroupFirstGuidance
  looks like "the explainer" but renders ONLY when a member has no Catch-ups, and the demo's
  seeded visitor is the first entry in CATCHUP_MEMBERS — so it never renders for the one
  audience the tour has. The anchor went on the first Catch-up card instead, via a new
  `TourAnchorSlot` (the card is server-rendered and the registry needs a client ref).

**Verification**: `npm run check` ✓ green before every commit and at session end (TS, ESLint,
protocol, lab registry 42, unit 75/75). `npm run visual` ✓ **23/23** — the eight
data-drift failures sessions 1 and 2 both hit are gone; another session masked them in
`900546f` mid-session. `npm run verify:crawl` ✓ 17/17.
Proved rather than asserted, where a claim was load-bearing: the showcase move is lossless
(rendered old-flag-on vs new-showcase-on and diffed the whole 4,701px document — identical
height, headings, all five shot alts, all ten links); the sidebar rail is pixel-identical
after LogoFact (0 differing pixels over its full height); the tour anchor registers (one
match, real 764x91 box); Saved still loads after the loadSavedPosts change (its card renders,
no console or page errors); /donate answers 307 → /support → /login?next=/support signed out.

**A note on commit messages**: six of this session's exceeded the 150-word ceiling before I
caught it (159-212). HEAD was amended to 144. **The other five were left over-length
deliberately**: they sit above two other sessions' commits in a shared tree that took new
commits twice during this session, and a six-commit rebase there risks clobbering work that
lands mid-rebase. Worth a `git rebase` at a quiet moment, or leaving. Count words BEFORE
committing, not after.

**Awaiting owner**:
1. **The public landing still links to no Privacy / Terms / Guidelines.** They live in
   LandingFooter, which is inside the showcase and therefore still off. Security audit H12
   calls these "the documents a stranger should be able to find before an account exists".
   Decoupling did not change this, and it is the one thing in §4 #1 the audit said to do
   "immediately" regardless of the showcase's fate. Not done: it is new UI on the public
   landing, which is his to approve.
2. Session 1's `gate-coverage.test.mjs` widening is still unsighted.
3. ~357 MB of unused Puppeteer Chrome in `~/.cache/puppeteer` is still his to delete.

**State left**: clean — every file I touched is committed.

**Next session**: phase 3 (dedupe at lib level). `9cee0d5` already did lib-tests-02; the big
remaining piece is lib-tests-01, the shared test kit. Two things learned while starting it
and then backing out: all 38 ROOT/read preamble copies are in `src/lib`, so a kit at
`src/lib/test-kit.mjs` shares their depth exactly; and the three `hasLoneSurrogate` copies
agree while the two `decomment` variants do NOT (the weak `[^:]` spelling eats a `//` inside
a string that the strong one keeps), so converting weak→strong changes what survives
decommenting and every such file needs its assertions re-run, not just typechecked.


### 2026-08-26 — session 4 (phase 3)

**All 14 phase-3 rows executed, 21 commits**, except one half of one row, deferred with a
reason (below). Every item pre-flighted at HEAD per rule 4.

**Done** (in order):
test kit + 39 preamble copies → `68d4ad6` · weak `decomment` retired → `5caaa92` · walk ×7 +
hasLoneSurrogate ×3 + hygiene trio → `fa4863b` · spelling-pin cohort trimmed, tour-provider
test deleted, landing-auth-ui → layout/sidebar-support-icon → `12d1fd5` · knip.jsonc +
OPERATIONS §8 → `fe51a6c` · escapeLike one-home → `20af678` · readMinutes + plainExcerpt →
`5cf90cc` · links schema + displayEmail normalisation → `64f8297` · prisma-errors adoption +
isMissingTable → `f950d6e` · localStorage kit → `7b1ba04` · fnv1a shared → `352ebe4` · one
date voice → `c7f3c73` · IDENTITY/AUTHOR_CARD selects + directory PERSON_SELECT → `ab82f30` ·
profile omits the password hash → `cb7dcc5` · MIN_PASSWORD + gazeFor → `2630812` · composer
adopts rich-text-editing → `04133c1` · parseImageUrls → parseJsonArray → `fd47d70` · loadPosts
/loadSavedPosts share include+serializer → `96dc9d6` · requireVerifiedMember composes Stage 1
→ `89315d9` · claimToken → `d3b1b79` · splitCountryCode → `ffb3ae8`.

**Where the audit was wrong, or thinner than the tree** (rule 4 outcomes):
- **The weak/strong `decomment` split was worse than "they can disagree".** Measured over 592
  source files: they disagree on 7, and every disagreement is the weak variant cutting a LIVE
  line in half — `validators.ts` loses `/^https:\/\//i.test(v)`, `next-path.ts` loses the
  `startsWith("//")` open-redirect guard. No assertion happened to sit on one, so nothing was
  vacuous; profile-editor-rule reads validators.ts through the weak variant and slices
  elsewhere by luck. The next pin written there would have been silently dead.
- **Sharing helpers created two NEW vacuity points. Both were caught by mutation and closed.**
  Gutting the shared `walk` to return `[]` left notification-links and image-purge-rule
  GREEN — every assertion in them reads "no file does X". Both now count what they swept.
  `hasLoneSurrogate` was the same shape (six negative assertions, three files, nothing proving
  the detector fires), so text-shape gained the positive case. **Anyone extending the kit must
  re-run that mutation.** Gutting `read` reddens 31 files, `decomment` 20, `walk` 5.
- lib-tests-05 says move THREE escapeLike tests to db-text; only two moved. The third ("an
  ordinary term passes through untouched") duplicates db-text's own first test, which asserts
  the same property over four inputs. Dropped, not moved.
- lib-tests-06's suggested knip config **does not load**: knip 6 rejects unknown keys, so a
  `$comment` in plain JSON is a hard error. It is `knip.jsonc`. Its globs also needed widening
  — `scripts/**/*.mjs` alone leaves the `.mts`/`.ts` scripts reported dead. 131 unused files →
  **5**, and all 5 are the landing showcase (§4 #1, still the owner's).
- **feed-posts-08's "this is visible today" is false.** None of the eight letters holds a
  markdown image, so the `!alt` excerpt bug is reachable only by hand-typed markdown. The
  dedupe is still right. Also plainExcerpt already appends the callers' "..." via
  truncateGraphemes, so no ellipsis work was needed.
- **auth-edge-05's displayEmail drift is worse than described.** The bare `z.email()` did not
  merely save capitals un-lowercased (it does); it **rejected outright** a pasted address with
  a leading or trailing space, with "Please enter a valid email" — the half a member would hit.
- **duplication-15's "fourth nearby" is not theme.ts**, which never touches localStorage
  (next-themes does). It is `create-post-form.tsx`, which needed `safeRemove` too.
- **duplication-06: the shapes are three clusters, not two**, and `avatarColor` is dead weight
  — BirdAvatar's banner says it "is accepted on the type ... but is intentionally ignored". It
  is kept OUT of AUTHOR_CARD_SELECT; four sites add it for their own types. The constants live
  in a new `src/lib/people-select.ts`, NOT posts.ts as the audit says: that file's banner is
  "Shared Post query fragments" and most readers here have nothing to do with posts.
  39 hand-typed `birdOverride: true` selects → 12.
- **feed-posts-03 needs no `{ bookmarked: true }` override.** loadSavedPosts' query already
  joins the viewer's own bookmark rows, so `p.bookmarks.length > 0` is the same value.
  Verified on the live Saved tab: the card reads "Remove bookmark".
- **catchups-07: four of the five formatter swaps change no pixel** (en-IN and en-GB render
  both forms identically — checked before editing). Only the index rail moved, "Aug 16" →
  "16 Aug", and it keeps a local formatter because dropping the YEAR is a real choice for a
  column that narrow.
- **The audit's bug lead (b) — masthead's missing `timeZone` — is refuted**; all six catchups
  formatters pass VALLEY_TIME_ZONE. Session 1 already closed it in bugs.md; recorded so nobody
  re-opens it.
- `catchups.ts` and `avatar.ts` are **import-clean on purpose** — their tests import them under
  bare `node`, which has no `@/` alias and no extensionless resolution. Both new imports had to
  be relative and extension-qualified. This bit twice; expect it again.

**Test pins that went red and why** (each edit rode its own commit):
five pins asserted a literal that a shared helper replaced — `P2002` inside two function
bodies, `/localStorage/` in the composer, `birdOverride`-shaped selects — and all now accept
either spelling, because what they pin is that the behaviour happens, not which helper does
it. `feed-write-rule`'s C-003 counter drops **4 → 3** with the vanished site named in the
file; lowering that number is the dangerous edit there. The B-020 email sweep caught
`claimToken` correctly (it cannot see that `sentToEmail` came off the User row); its allowlist
entry moved with the code and claimToken's docblock now states the promise it rests on —
re-proved the sweep still bites by feeding it a raw address.

**Deliberately NOT done, with reasons:**
1. **shell-primitives-09** (move the rich-text renderer and the phone kit out of utils.ts into
   their own modules). Architecture-class, and its actual payoff is bundle-shaped: utils.ts
   builds an `Intl.Segmenter`, a 30-entry Set and five RegExp at import time, so every client
   chunk importing only `cn` evaluates them. That is a number **phase 5 measures**, and moving
   ~240 lines across ~15 importers now would spend the churn with nothing to show. Do it in
   phase 5, with the before/after. shell-primitives-11 (the phone clone) IS done.
2. **lib-tests-01's optional "phase 2"** — migrating the 12 hand-rolled slice-to-next-`export`
   extractors to a shared `section()`. The kit does not export one. Each of the 12 has its own
   convention and about half carry a hand-written anti-vacuity assert; a shared extractor must
   reproduce every one or quietly weaken it. If wanted, one file at a time with the mutation
   check above — never as a sweep.
3. `src/app/lab/hoopoe/page.tsx` keeps its own gaze clamp, and one `walk` copy survives in
   `email-normalization-rule.test.mjs` (the audit never listed it). Both are one-line jobs for
   whoever is next in those files.

**Verification**: `npm run check` ✓ green before every commit (TS, ESLint, protocol, lab
registry 42→43, unit 75→74 files). `npm run visual` ✓ 23/23, run four times across the
session. `npm run verify:crawl` ✓ 17/17, three times.
Proved rather than asserted, wherever a claim was load-bearing: the 75 test files emit
byte-identical output before and after the kit (same 705 names); five mutation tests of the
shared helpers; 28 session×IS_DEMO combinations through both the old and composed write gate,
zero differences; 34 phone inputs byte-identical; the letters index, a letter, the feed, the
directory, /lab, a Catch-up home and a published Round read on screen; the composer's Cmd+B
and plain-paste driven in a real browser; a draft written to localStorage and restored on
reload; /lab applying all 20 archive overrides (proving the wrapper did not fail open).

**A mistake worth knowing about**: `5cf90cc` (the readMinutes commit) also contains an
in-progress version of THIS section, because a `git add $(git diff --name-only)` swept it in.
Rule 3 says stage by name and I did not, twice. The end state is correct — this entry replaces
it — but a revert of `5cf90cc` would take a stale handover entry with it.

**Awaiting owner** (unchanged from session 3, plus nothing new):
1. **The public landing still links to no Privacy / Terms / Guidelines** (security audit H12).
2. Session 1's `gate-coverage.test.mjs` widening is still unsighted.
3. ~~~357 MB of unused Puppeteer Chrome in `~/.cache/puppeteer`.~~ **DONE — the owner
   deleted it 2026-08-26.** Nothing depended on it: `.puppeteerrc.cjs` (session 2's
   `cb3709d`) already sets `skipDownload`, so it cannot come back, and Playwright keeps
   its own browsers in `~/Library/Caches/ms-playwright`, untouched. Re-verified after the
   delete, one at a time: `verify:shot /about` 200, `verify:crawl` 17/17, `npm run visual`
   green, and — the check that mattered — `npm run screenshot` with PUPPETEER_EXECUTABLE_PATH
   **unset**, which found /Applications/Google Chrome on its own. Do not re-raise this.

**A not-finding for phase 4, from `rv-connect-da`**: `src/app/lab/hoopoe-marks/_parts.tsx`
deliberately copies geometry constants out of `src/components/mascot/hoopoe.tsx` — same
curves, different proportions, reasons in its own header. If a duplication row ever flags the
two as identical they must NOT be merged: the point is that one is a character and the other
is a logo cut from it.

**Peer traffic**: `rv-connect-da` worked in this tree all session on brand/logo under
`src/app/lab/`, `src/app/icon.*`, `public/images/icons/` and `scripts/dev/generate-icons.mjs`,
told not to commit yet — so those sit modified/untracked and are NOT mine. It cleared me to
touch `src/app/lab/_archive-state.ts` and its warning changed how I checked that item (green
gates would not have caught a wrapper failing open). It also reported history being rewritten
under its own commits earlier in the day; that was not this session.

**State left**: clean — every file I touched is committed. The lab registry reads 43 because
a peer added a room mid-session.

**Next session**: phase 4 (dedupe at component/route level, may be two sessions). Nothing in
phase 3 blocks it. Read the two deferrals above first: shell-primitives-09 belongs to phase 5,
not phase 4.

### 2026-08-26 — session 5 (phase 4, part 1)

**15 of phase 4's 21 rows executed, 25 commits.** Every item pre-flighted at HEAD per rule 4.
This is part 1: the plan allowed two sessions for phase 4 and it needs them.

**Done** (in order):
auth flight machinery → `0dd055a` · AuthPhotoPanel → `76d999e` · PasswordField adopted →
`da091ca` · bug lead filed → `529c5fd` · Keeper gates 14→2 → `5fba13b` · EDITION_COLUMNS +
aggregate destructure → `146ba8a` · published-Round loader → `47433ba` · title helpers →
`8c600a0` · NotAvailableCard → `57e06aa` · QuestionRow → `2d09e6e` · photo-intake prep →
`04993fb` · MomentStage → `7a55fa2` · LetterDeskSkeleton → `e12a505` · viewer byline →
`1947c59` · useWideViewport → `f48062f` · appendUnseen adopted → `4ef5a6e` ·
useHeartToggle/useBookmarkToggle → `3f004d3` · handover → `86c6439` · ui/skeleton retired for
the warm shimmer → `a6d57c5` · bell variants collapsed → `e13d191` · report preamble →
`c5025c5` · the transition-property sweep → `e83f39f` · place-search clamp → `ccbfc37` ·
Sentry branches + prisma.config signpost → `9c12779` · shared places transaction → `329ef62`.

**Where the audit was wrong, or thinner than the tree** (rule 4 outcomes):
- **catchups-12 is already done** — all four pieces (`keeperName`, `initialPeople`,
  ArchiveShelf's `groupName`, the MemberStrip comment) are gone at HEAD, the `createdBy`
  include with them, and :177's comment already reads as the finding prescribes. Not redone.
- **duplication-19 names four useWideViewport sites; only two are that hook.** auth-panel's
  matchMedia moved into `useFlightArrival` earlier this session, where it is a deliberate
  ONE-SHOT decision at mount with no listener; landing-hero's is a bare `.matches` read inside
  a click handler. Folding either in would change behaviour. Two sites converted.
- **catchups-14's two selects are not identical** (the verification already said so): the
  first also nests the Catch-up and its group. `EDITION_COLUMNS` is the nine scalars only.
- **feed-posts-06's "fourth copy" is two**: `entry-love-button` AND `photo-love-button`. All
  five hearts now share the toggle, which is what let heart.test.mjs's five-file pin collapse
  into "each asks for the shared hook" + one direct check of the hook.
- **The stale `FeedScope` comment feed-posts-05 wants deleted is already gone**, taken with
  phase 2's Groups plumbing.
- **auth-edge-03's PasswordField needed one more prop than listed**: `focusHint` must accept
  `null`. /login shows no hint (it asks for a password that already EXISTS), and the
  component's default is "8+ characters", so `undefined` would have added a hint to /login.

**Deliberately NOT done, with reasons:**
1. **The shared pager (feed-posts-05 = duplication-12).** The three lists are not variants of
   one thing: the Collection pages by OFFSET and carries a `total`, the feed and the profile
   tab page by CURSOR; the feed and the Collection re-arm the skeleton on a filter change and
   the profile tab deliberately does not (it remounts by key, and says so); the feed and the
   profile tab carry the C-180 ref-guard and the Collection does not. A hook covering them
   needs four options, which is what both findings say not to invent — duplication-12's own
   falsifier and feed-posts-05's brief-4a.4 escape both point here. What WAS shared is the
   part that is genuinely one rule: `appendUnseen`, now used by all four lists and pinned.
2. Nothing else was skipped.

**A rule, not just a sweep.** `transition-[colors,transform]` was on eleven shipped surfaces.
`transition-property` takes real CSS property names; `colors` is a Tailwind shorthand that
only exists as the whole utility `transition-colors`, and inside the arbitrary-value bracket
it passes through verbatim — so the transform eased and the colour SNAPPED, silently. Each
site now names its own hover's properties, and `protocol-audit.mjs` refuses the broken form,
so it cannot come back. Measured after: a message thread row ramps through 12 border colours
where it used to jump. Four comments in the tree still QUOTE the bad form while explaining it;
they are the documentation, not violations, and the audit reads code lines only.

**Test pins that went red, and why** (each rode its own commit): B-061 (refuseIfFrozen per
body) — five Keeper actions reach the freeze through `loadKeeperEdition` now, so it takes
either spelling AND fails a caller that delegates without a `pausedHint`, which would look
gated and not be; C-029's orderBy follows the query into the shared Round loader; C-180's
dedupe takes either spelling; heart.test's five-heart pin as above. **Every one of them was
mutation-tested** — gut the helper, or the caller, and the suite goes red. Do the same for any
pin you widen: three of these would have passed on a helper that had quietly lost its guard.

**Owner-visible changes** (his standing rule; all deliberate):
1. The **answering screen's "not available" card** takes the home's corrected geometry:
   padding 48px → `var(--space-l)` (~26px), measure 768px → 672px. It missed the owner's own
   2026-07-25 correction because it was a second copy.
2. The **answering console's question labels** take the collecting console's wording: "asked
   by you" → "You" / "You (anonymous)", "asked by {name}" → the name, "asked anonymously" →
   "Someone in the group". The collecting voice won because it is the only one that tells you
   whether the question you asked is showing your name.
3. **Eleven hovers now ease instead of snapping** (see the rule note above): directory cards,
   message threads and their image links, the composer's remove button, the landing CTA, the
   Collection's dialog and filter row, the flag control, an onboarding skip.
4. **The loading feed and a profile's Posts tab shimmer warm** instead of pulsing grey.
   `ui/skeleton.tsx` was stock shadcn and is deleted; the eight uses take the `skeleton-warm`
   utility the other 201 skeletons already use.
5. **Latent, nothing on screen today**: the Catch-up home now prints a song whenever there is
   a NAME for one, matching the permalink, where it previously needed a URL. No live entry has
   a song at all (checked: 0 of 133), so this changes nothing until one does.

**Verification**: `npm run check` ✓ green before every commit. `npm run visual` ✓ 23/23, run
five times; one red `/support` mobile in the middle of the session was a flake and passed on
re-run — read the diff before ever rebaselining. `npm run verify:crawl` ✓ 17/17.
Proved rather than asserted, wherever a claim was load-bearing:
`hoopoe-landing-check` all four arrivals pixel-exact after the flight extraction (dx/dy 0.00,
two overlap frames, no correction jump); the AuthPanel mobile fly-in sampled frame by frame
(43 veiled frames, no flash, first visible frame 139px above the viewport, 407px descent);
all 16 catchups actions resolved through the new helpers and diffed against HEAD for identical
refusal sentences; 44 photo-row and trust comparisons, byte-identical, refusal messages
included; thumbnail bytes identical on both intake paths, and an EXIF-rotated image proving
the `alreadyUpright` flag is really the `.rotate()`; the Catch-up home re-shot 8 pixels off
1,296,000 and the Round permalink 0; the empty-search moment sampled across 3s (30 distinct
poses, so the autoplay and solo guard both survive); and a REAL heart driven on the owner's
own post — single tap, then a double tap in one tick that flipped once — then restored and
re-checked in the database (11 likes, his like present).

**A gotcha, then its fix**: deleting or renaming a tracked file made `npm run check` CRASH
(not fail) in the protocol audit, with a raw ENOENT. It reads `git ls-files`, which names
paths rather than contents, and the two disagree for a whole pass while a deletion is
unstaged — or, as `rv-connect-da` hit while this session renamed `not-available.tsx`
underneath it, while a rename lands mid-pass in a checkout several sessions share. The
audit now skips a path with nothing behind it and SAYS SO, so "clean" can never quietly mean
"clean over the files I could open". Both cases reproduced against the old and new versions.

**Also found in passing, not fixed**: `verify-shot.mjs` swallows a failed screenshot in a bare
`try {} catch {}` and still prints `out` as though it wrote one — pass it a path whose parent
does not exist and it reports success on nothing. Same class as the crawler session 2 fixed.

**Awaiting owner** (unchanged from session 4):
1. **The public landing still links to no Privacy / Terms / Guidelines** (security audit H12).
2. Session 1's `gate-coverage.test.mjs` widening is still unsighted.

**Peer traffic**: `rv-connect-da` confirmed its four uncommitted lab rooms carry no
`transition-[` and no `ui/skeleton` import, so neither of this session's sweeps reaches them.
Two new tracked things of its own are deliberate and must NOT be swept as unreferenced:
`docs/spec/apple-edge-light.md` and `scripts/dev/apple-edge/` (five `.mjs` and two generated
PNGs), a dev-only measurement harness for an icon lighting effect that nothing in the app
imports. It also held brand/logo work uncommitted in this tree all session
(icons, `lab/glass-edges`, `lab/hoopoe-marks`, `lab/icon-*`, `generate-icons.mjs`,
`public/images/brand/`, and a new `docs/spec/apple-edge-light.md`); untouched. It asked that
`peaks-mark.tsx`'s `PEAK_PLANES`/`ridge` exports not be moved without a ping, because two
importers are uncommitted on disk and a grep will not see them — nothing here moved them.
`rv-connect-c6` finished phase 3 and left.

**State left**: clean — every file I touched is committed.

**Next session**: phase 4 part 2. **Six rows left**, in the report's order:

1. **The admin programme** — the biggest single row in the phase, and the reason part 2
   exists: act-hook, filter bar, status maps, MAIL_TONE, audit skeleton, hygiene, a shared
   `loadThreadWindow`, and the ~24 unread queries per analytics view (`countMembers()`, split
   `loadPresence`). ⚠ — read `work/verify/v-member-admin.md` first.
2. Upload guard + `toDisplayWebp`; the cron-secret helper; the lookup guard ⚠
   (feed-posts-07 = duplication-09 = lib-core-config-07). Report §3 has two corrections on
   this one: duplication-09's true text-readers are image-purge-rule/upload-shared, anchored
   BELOW the preamble so extraction is safe, and each cron route must keep its own
   `export const maxDuration`.
3. The probe/dev-script kits (duplication-07/08 + scripts-e2e-ci-06).
4. email-queue's duplicated doc block + its misplaced one (lib-core-config-05). The
   instrumentation and prisma.config halves of that row are already done, in `9c12779`.
5. The avatar-upload hook (directory-profile-12). Its real payoff is a behaviour gap, not
   lines: photo-step shrinks an undecodable file in-browser (B-030) and the letterhead does
   not, so the same phone HEIC can hit Vercel's body cap from the profile today.
6. Scripts ledger gate + README backfill + close-out + crawl list + SKILL counts; delete
   demo/run-sql (scripts-e2e-ci-01/04/07/08). Plus the optional tail if there is time.

Two things this session learned that part 2 will need. **Widening a pin is not free**: five
went red here and every one was mutation-tested afterwards, because three of them would
otherwise have passed on a helper that had quietly lost the guard the pin exists for. And
**a deletion must be staged before `npm run check`**, or the protocol audit crashes on a
file `git ls-files` still lists.

Template:
```
### <date> — session N (phase X)
Done: <item> → <sha>; <item> → <sha>
Skipped/awaiting owner: ...
Verification: check ✓/✗, visual ✓/✗ (+what was eyeballed)
State left: <clean | exact description of any in-flight work>
Next session: <the single next thing>
```

### 2026-08-26 — session 6 (phase 4, part 2)

**All six remaining rows executed, 14 commits. Phase 4 is closed.** Every item
pre-flighted at HEAD per rule 4.

**Done** (in order):
mail tone map → `a987cbc` · Catch-up chip vocabulary → `7d6ae13` · admin hygiene batch →
`18e2f0d` · B-024 comment ×12 → `ae9df23` · analytics query trim → `dbeda7e` · thread
contract + message window → `fe9eaf6` · useAdminAct → `0cada95` · AdminFilterBar →
`d16746f` · api-gate + toDisplayWebp → `60e8ee0` · useAvatarUpload → `5745fa2` ·
email-queue doc blocks → `6277a3e` · probe + dev script kits → `6763918` · scripts ledger
gate + demo/run-sql supersession + crawl list → `c3d8a4d` · three SKILL files → `c02cfb7`.

**Where the audit was wrong, or thinner than the tree** (rule 4 outcomes):
- **admin-analytics-09 is RE-REFUTED at fix time.** It says `audit/loading.tsx` should
  become `<AdminSkeleton rows={8} columns={1} toolbar={false} />`. But the audit log page
  renders TWO `<ul>` of text events with `divide-y` inside one bordered card and no avatar
  anywhere, while AdminSkeleton draws separate bordered cards each with an `size-10
  rounded-full` avatar. Adopting it makes the loading state hold a shape that never
  arrives — which is precisely what AdminSkeleton's own banner says a skeleton is for
  ("hold the shape of what is arriving"). 12 lines is not worth teaching the shared
  component to lie. The local file is left as it is. **Do not retry this without also
  fixing the local skeleton to the real two-section shape, which is a UI job, not a dedupe.**
- **scripts-e2e-ci-08 names five missing routes; two of them are not routes.**
  `src/app/(main)/notifications/` holds only `actions.ts` and `notice/` only an `[id]`
  segment, so neither has a page to crawl. Added the three real ones (`/birds`,
  `/pick-bird`, `/welcome`) with a comment saying to cross-check `ls src/app/(main)` AND
  that not every directory there is a route. `verify:crawl` now reports 20/20 at 200.
- **duplication-09's suggested home for the upload guard is wrong and would have cost a
  bundle.** It says put `guardUploadRequest` in `src/lib/upload-shared.ts`. Five `"use
  client"` components import that file, so giving it `auth` puts NextAuth and Prisma into
  five browser bundles — the exact failure that once broke /messages with "Module not
  found: Can't resolve 'dns'" while tsc stayed green. It went in a new server-only
  `src/lib/api-gate.ts`, and `toDisplayWebp` beside `sharpImage` in `image.ts`.
- **`gate-coverage.test.mjs` sweeps `"use server"` files only**, so no API route was ever
  covered by it — which is why the eight route handlers could each drift. Recorded because
  it is a real coverage gap; the two new pins below close it for uploads and crons only.
- **lib-core-config-05's optional half is deliberately not done.** Collapsing
  `scheduleSend`/`scheduleDrain` into `runDetached` would take the
  `try { after(x) } catch { void x() }` shape away from `scheduleDrain`, and `docs/TRAPS.md:75`
  sends readers to that function BY NAME to see it. The finding's own escape clause.
- **duplication-07's `makeProbeUser` is not done.** The five cleanup blocks are not copies:
  each deletes the tables its own probe wrote (phase5 seven tables, phase6 two, phase7/8
  four plus mail, phase10 one and a cascade). A shared one either over-deletes on the live
  shared database or takes a per-probe table list, which is the copy again.
- **duplication-08's shared db opener is not done either.** Those scripts open a database
  four different ways (pg with relaxed SSL, pg without, Prisma behind the pg adapter), and
  a shared opener with a default connection string is the same convenience the finding
  itself says to keep a wall against for `scripts/demo/*`. The **env parser** IS shared —
  seven copies, five of them carrying the same leftover `[".env", ".env"]` where the second
  entry was a file that stopped existing.
- **admin-analytics-05's two reconciled differences** (both flagged by the verification):
  People wrapped its navigations in `startTransition` and Content did not, so filtering
  Content dropped the list to its skeleton where People kept it — both transition now. And
  Content listed the search token third of four while People listed it last, which with a
  three-token cap changed which token hid behind "+N more"; the term goes last on both.
- **admin-analytics-08's `SERIES_STATUS` shapes differ**, as the verification said. The
  fuller map won, so the list page now takes the tone as well as the label. Latent: no
  Catch-up is paused today, and "Ended" was already idle on both.
- **admin-analytics-03's ContentView reads `people.total` ONCE, not twice** — the
  verification's correction, confirmed.

**Four new mechanisms, all mutation-checked** (this is the phase's real output, more than
the line count):
1. `scripts/qa/scripts-ledger.test.mjs` — the README rule "add a script, add a line" is now
   a gate, both directions. It found 18 unlisted scripts including every phase probe and
   all of `ops/`. **Tracked files, not a filesystem walk** — the opposite of what
   `gate-coverage` does for admin pages, and deliberately: several sessions share this
   checkout and a gate that fails on a peer's WIP is a gate people learn to ignore.
2. `upload-shared.test.mjs` — every route under `src/app/api/upload/` must call
   `vetUploadRequest`. Nothing failed before if a fourth route arrived with three of the
   four checks.
3. `proxy-rule.test.mjs` — every cron in `vercel.json` must call `requireCronSecret`,
   derived from the config rather than listed.
4. `upload-size-rule.test.mjs` — gained `letterhead-profile.tsx`, which was missing from
   both the guard and the list, accepts the shared hook as shrinking, AND separately pins
   that the hook really shrinks, so the two delegating callers cannot go hollow.

**Test pins that went red, and why**: only one, `upload-size-rule`, and it went red for
the right reason (photo-step's `shrinkForUpload` moved into the hook). Widened as above
rather than loosened. Everything else stayed green through fourteen commits, which is
itself worth noticing given how much moved.

**Owner-visible changes** (his standing rule; all deliberate, all admin-only except 5):
1. **Filtering `/admin/content` keeps the list on screen** instead of dropping to the
   skeleton, matching `/admin/people`. Same change puts the search term last in the filter
   sentence on Content, so with three tokens showing it is a different one that hides
   behind "+N more".
2. **A paused Catch-up will chip cinnamon on `/admin/catchups`** rather than grey, matching
   the reading room. Nothing on screen today: no Catch-up is paused.
3. **The analytics room's Content, Faces and Rhythms views load faster.** Content and Faces
   were each running 13 queries for one integer; Rhythms was fetching two user-joined
   lists and two raw aggregates over `Visit` and rendering none of them.
4. **Twelve admin pages lost a four-line comment** each; the argument moved to
   `lib/admin.ts`, which needed it anyway — its banner claimed the layout guard was what
   protected a new section, which is the belief B-024 disproved.
5. **A phone photo the browser cannot decode (HEIC, mostly) now works from the profile.**
   It shrinks in the browser first, as it always has during onboarding; before this it was
   sent whole and died at Vercel's ~4.5MB body cap with a stuck spinner and no message
   (B-030). This is the one member-facing change in the session.

**Verification**: `npm run check` ✓ green before every commit and at session end (TS,
ESLint, protocol, lab registry 43, unit 74 → 77 files). `npm run visual` ✓ 23/23, twice.
`npm run verify:crawl` ✓ 20/20 with the three new routes.
Proved rather than asserted, wherever a claim was load-bearing:
- a thread marked sorted and reopened through the shared hook, and a note saved on Jerry's
  record and put back, **both restored in the database afterwards**;
- both upload paths driven against the REAL R2 bucket — 401 signed out, 403 cross-site, a
  photo through the proxy and a photo through presign-then-finalize arriving
  byte-identically (an EXIF-orientation-6 300x120 JPEG landing as a 120x300 WebP on both,
  which is the `.rotate()` proving itself), another member's staging key still refused
  ("Bad staging key"), and **all four test objects deleted from the bucket afterwards**;
- `phase6-probe` 16/16 before and after the kit conversion, the same 16;
- the whole avatar flow driven as Jerry on BOTH surfaces — pick, crop, save, remove — plus
  a deliberately truncated JPEG reaching `onDecodeError`, which answered "That photo looks
  corrupted or only partially uploaded", a sentence that comes from `image-downscale` and
  therefore could not have appeared before this change;
- `splitThreadWindow` mutation-tested by removing its `.reverse()` and watching the admin
  thread really read newest-first on screen;
- the shared dev env parser proved to return the old parser's 22 keys and values exactly;
- the ported demo-ref guard proved by pointing a `.env.demo`-named file at another host;
- `/admin/people` really paging 60 → 63 rows through the re-gated `loadMorePeople`.

**Also found in passing, not fixed:**
- `verify-shot.mjs`'s swallowed-screenshot bug that session 5 flagged is still live, and it
  bit me: given a path whose parent does not exist it printed `{"status":200,...,"out":...}`
  for a file it never wrote. One `try {} catch {}`.
- `scripts/qa/phase3-probe.mjs:127,129` has two assigned-and-unused locals (`u0`, `u2`)
  and `scripts/dev/merge-cities.ts:22` one (`CANONICAL_PLACE_ID`). Pre-existing; left alone
  because each sits inside logic I did not otherwise touch.

**A note on commit messages**: two exceeded the 150-word ceiling before I caught it —
`d16746f` (174) and `0cada95` (158). They are **left over-length deliberately**: a peer's
commit (`d703d91`) landed between them, so rewording either means rebasing over somebody
else's work in a checkout with two live sessions. Same call session 3 made, same reason.
Everything after that was word-counted BEFORE committing, which is the habit to keep.

**Awaiting owner**:
1. **The public landing still links to no Privacy / Terms / Guidelines** (security audit
   H12). Unchanged since session 3; it is new UI on the public landing, so it is his.
2. Session 1's `gate-coverage.test.mjs` widening is still unsighted.
3. **NEW — the "close it out" checklist for CLAUDE.md.** scripts-e2e-ci-01's gate half is
   done; its second half is six lines of prose for the Working agreement, and the finding
   marks the wording as an owner sign-off. Report §4 lists CLAUDE.md wording under his
   column. The draft is in the finding; nothing blocks on it.

**Peer traffic**: `rv-connect-4f` worked in this tree all session on the landing → signup
entrance (`landing-hero.tsx`, `signup-client.tsx`, `login-client.tsx`, `mascot-flight.ts`,
`use-flight-arrival.ts`, new `signup-first-frame.tsx`) and landed `d703d91` and `2a3f0ec`
mid-session; untouched by me. It broke `npm run check` briefly with a `react-hooks/refs`
error in its own uncommitted file, fixed it within a minute of being told, and confirmed it
is not touching `settings/`, `onboarding/` or `profile/`. The icon/lab/brand files still
sitting uncommitted (`public/images/icons/`, `src/app/icon.svg`, `lab/glass-edges`,
`lab/hoopoe-marks`, `scripts/dev/apple-edge/`, `docs/spec/apple-edge-light.md`,
`public/images/brand/app-icon.svg`) belong to **neither** of us — 4f confirms they predate
its session. They are an earlier session's Apple-edge-lighting favicon work and have now
been sitting uncommitted for two days. **Somebody should ask the owner whether they land or
go.** Note `scripts/dev/generate-icons.mjs` is among them and IS tracked, so it has a
README line now; the untracked `scripts/dev/apple-edge/*.mjs` do not, and the ledger gate
correctly ignores untracked files, which is the case that decided that design.

**State left**: clean — every file I touched is committed. The `temporary screenshots/`
folder is pruned of this session's 48 files (125MB → 97MB) and both scratch drivers I wrote
(`_scratch-p4b.mjs`, `_scratch-avatar.mjs`) are deleted, which is what the new ledger gate
would have demanded anyway.

**Next session**: **phase 5 — bundle & build**, with the before/after measurement against
report §1a. Two things are waiting for it specifically:
- **shell-primitives-09**, deferred out of phase 3 for exactly this session: moving the
  rich-text renderer and the phone kit out of `utils.ts`. Its payoff is bundle-shaped —
  utils.ts builds an `Intl.Segmenter`, a 30-entry Set and five RegExp at import time, so
  every client chunk importing only `cn` evaluates them. Measure before moving.
- Phase 5 needs owner input first: report §4 #5 (duplicate TS check on deploys), #7 (Vercel
  Analytics), #6 (lab CSS measurement authorisation).
