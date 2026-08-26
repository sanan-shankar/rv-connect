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
- [ ] Phase 2 — placeholders, flags, Groups residue
- [ ] Phase 3 — dedupe at lib level
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
- **root-docs-assets-10 is only half done.** `docs/README.md` was already correct (the
  audit-fix reorganisation fixed it). **CLAUDE.md's spec list still omits `admin`** — left
  untouched because CLAUDE.md carries the owner's uncommitted one-word edit and staging it
  would have staged his work. One line for whoever picks it up after he commits.
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

**Awaiting owner**:
1. Session 1's two are still open: the visual suite's four content routes will keep going red
   as members post (mask, seed, or accept?), and the `gate-coverage.test.mjs` widening.
2. **~357 MB of unused Puppeteer Chrome** in `~/.cache/puppeteer` — outside the repo, so his
   to delete.
3. CLAUDE.md's spec list needs `admin` once his edit is committed.

**State left**: clean — every file I touched is committed. `CLAUDE.md` is still modified in the
tree and is **not mine**. `c095f4c fix(lab): ...` landed mid-session from another session in
this same tree; untouched.

**Next session**: phase 2 (placeholders, flags, Groups residue). It needs owner input first —
report §4 #1 (showcase fate + where the public Privacy/Terms links live now), #2 (tour for
members), #16/#18 (/donate redirect vs delete), #10 (Profession filter), #11 (LogoFact), #3
(About page). Note phase 1a deliberately deferred `feed-posts-13`'s `scope`/`groupId`/
`composerScope`/`FeedScope` half into phase 2's Groups-residue item.

Template:
```
### <date> — session N (phase X)
Done: <item> → <sha>; <item> → <sha>
Skipped/awaiting owner: ...
Verification: check ✓/✗, visual ✓/✗ (+what was eyeballed)
State left: <clean | exact description of any in-flight work>
Next session: <the single next thing>
```
