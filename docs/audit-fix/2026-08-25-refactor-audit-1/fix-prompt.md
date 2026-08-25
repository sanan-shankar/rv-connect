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
- [ ] Phase 1b — root, docs, assets, dependencies
      (**partially done 2026-08-26**: the "archive the closed bug audit" item — move,
      JSON-dump deletion, ledger owner-block into bugs.md — was executed by the
      `docs/audit-fix/` reorganisation, commit `docs(audit-fix)`. Also already done there:
      catchups-fixes-brief deletion + its spec banner, docs/README index refresh incl. the
      spec-list drift. Do NOT redo; the remaining 1b rows stand.)
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
| 1b | WhatsApp originals delete (#3-adjacent, rd-02); overflow PDF destination; brand 4096 PNG; xlsx path (#14) |
| 2 | Showcase fate + where the public Privacy/Terms links live NOW (#1); tour for members (#2); /donate redirect-vs-delete (#16/18); Profession filter removal (#10); LogoFact (#11); About page (#3) |
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

Template:
```
### <date> — session N (phase X)
Done: <item> → <sha>; <item> → <sha>
Skipped/awaiting owner: ...
Verification: check ✓/✗, visual ✓/✗ (+what was eyeballed)
State left: <clean | exact description of any in-flight work>
Next session: <the single next thing>
```
