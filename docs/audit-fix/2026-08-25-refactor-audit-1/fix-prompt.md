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
- [ ] Phase 4 — dedupe at component/route level (may be two sessions)
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
3. ~357 MB of unused Puppeteer Chrome in `~/.cache/puppeteer` is still his to delete.

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

Template:
```
### <date> — session N (phase X)
Done: <item> → <sha>; <item> → <sha>
Skipped/awaiting owner: ...
Verification: check ✓/✗, visual ✓/✗ (+what was eyeballed)
State left: <clean | exact description of any in-flight work>
Next session: <the single next thing>
```
