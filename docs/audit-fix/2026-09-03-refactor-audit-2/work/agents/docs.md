# docs - refactor audit 2 report

Territory reader for `docs/` as a body of text: 129 tracked files, 3,347 KB, 40,581 lines
(28,123 markdown + 4,716 .txt + 790 CSV + 6,674 JSON). Charter: which specs describe code
that has changed, which planning docs are finished business, what duplicates
CLAUDE.md/AGENTS.md, whether the archive convention is being followed, and which relative
paths in docs point at files that no longer exist. Read-only; no builds, no browsers, no
database. Date: 2026-09-04. Files in territory: 129 tracked + 3 untracked `.DS_Store` and
one untracked audit folder. Read fully: 47 (every file outside the two closed audits'
`work/` archives). Classification-level: 82.

## Coverage

**Read fully (47 files, ~14,600 lines):**
- All five top-level docs: `README.md`, `ROADMAP.md`, `TRAPS.md`, `OPERATIONS.md`, `SECURITY.md`.
- All 15 `docs/spec/*`: DESIGN-SYSTEM, admin, apple-edge-light, avatars (banner + §0-2 + §7-12
  in full, §3-6 skimmed for claims), catchups, demo, directory (banner + §1-4, §5-9 skimmed),
  guide, hand-run-passes, lab-voice, letters, mascot, media, person-row-audit, profile
  (banner + §0-5, rest skimmed for claims).
- All 15 `docs/planning/**`: FEATURES, bugs, the four dialog/menus research digests,
  leads-to-follow, letterloop-research, `class-collection/spec.md`,
  `collection-rework/{brief,handover,prior-art,spec}.md`, `collection-scrubber/{brief,handover}.md`.
- `docs/content/*`: AI-WRITING-TELLS, DELIGHT, whatsapp-curation/{overflow.md, picks.md}.
- `docs/history/*` headers and structure (both files' archive banners read in full; the session
  entries themselves sampled, since they are by definition frozen).
- `docs/audit-fix/README.md`, `2026-08-21-bug-audit-1/README.md`, refactor-audit-1's
  `fix-prompt.md` header + status board, and the header of every top-level report.

**Skimmed, by charter (82 files):** every `work/` folder under
`docs/audit-fix/2026-08-22-bug-audit-2/` and `docs/audit-fix/2026-08-25-refactor-audit-1/`.
The charter names these archives by convention; I measured them and read their index files
rather than their contents. `docs/audit-fix/2026-09-03-refactor-audit-2/` is this audit's own
untracked folder and is out of scope except as a sizing question (docs-03).

**Not read:** nothing in my territory was left unread. `docs/content/whatsapp-curation/picks.json`
was inspected structurally, not line by line - it is data, and `docs/README.md` says so.

**Uncommitted edits seen (someone else's WIP):** `docs/SECURITY.md` is modified in the working
tree right now. The change I can see is the retention table's Notifications row moving from
**1 year to 30 days**, matching a decision the owner made **today (2026-09-04)** that also
landed in `scripts/ops/prune.mjs`'s header comment. I have audited around it and treated 30
days as the truth. It has a consequence that session may not have noticed - see **docs-12**.
`src/components/common/image-viewer.tsx` is also modified; not mine.

## Summary

`docs/` is **3,347 KB of a 32,965 KB tracked repo - 10.2%** - and **59% of that is one folder**:
`docs/audit-fix/2026-08-25-refactor-audit-1/`, at 1,985 KB, of which 1,823 KB is its `work/`
archive. This audit's own folder, still untracked, is already **3,328 KB**. Committing it
as-is more than doubles `docs/` and makes closed audits ~72% of the project's documentation
by weight. That is the single biggest structural question in this territory and it is the
owner's, not a session's (docs-01, docs-03).

The *prose* half is in better health than I expected. `TRAPS.md`, `demo.md`, `guide.md`,
`hand-run-passes.md`, `lab-voice.md` and `bugs.md` are current, dense, load-bearing and
contain almost nothing I would cut. `AI-WRITING-TELLS.md` and the WhatsApp curation files are
live inputs, not residue. The relative *markdown links* in `docs/` are essentially clean:
three hits, all false positives on `[id]` route syntax.

What has rotted is **numbers and file paths inside otherwise-good documents**, and the worst
case of it is dangerous rather than untidy. `docs/spec/media.md`'s own supersession banner
blesses §4.2 and §4.4 as "still true"; §4.2 describes a three-variant 480/1600/3000px pipeline
that has never existed, and §4.4 computes a storage budget from it. The real encode is full
resolution at WebP quality **100**. That is precisely the hallucination `TRAPS.md` was written
to stop - twice - after the owner asked *"this is the second time a session has hallucinated
that we're compressing collection photos why??"*. Nobody checked media.md. It is 42 lines of
wrong numbers in the one file `CLAUDE.md` sends a media session to (docs-02).

Beyond that: **94 path mentions in docs point at files that do not exist**, of which ~54 are
real rot and ~40 are deliberate "lives in git history" pointers (docs-08). `docs/README.md` -
the index whose own opening line is *"A map that lists folders which do not exist is worse
than no map"* - lists 12 spec files where disk holds 15, and lists two planning docs where
disk holds fifteen across three campaign folders (docs-05). `OPERATIONS.md` says the visual
suite covers 11 routes (it is 12) and that `/collection` is deliberately unmasked (it has been
masked since 2026-09-02); it and `SECURITY.md` say the unit gate has 74 and "25+" test files
respectively, against a real 102 (docs-10). `admin.md` still opens **"Nothing here is built
yet"** for a surface that shipped eleven routes (docs-11).

Three planning documents are finished business: `dialog-standards-findings.md` (every one of
its five findings verified shipped), the `collection-scrubber/` pair (shipped, and its
operational context now actively wrong), and most of `collection-rework/` (all six phases
shipped; two close-out items and eleven unseen-by-owner questions keep it alive for now).
And the **archive rule in `docs/README.md` is not being followed**: August 2026 closed four
days ago and its 162 entries - roughly 7,878 lines and 540 KB - are still sitting in the root
`progress.md`, which is now 8,545 lines (docs-04).

Structural-vs-cheap split: of 21 findings, **11 are structural** (dead sections, relocations,
the audit archive, the freed route) and 10 are hygiene. The honest total that could leave or
move: **~1,823 KB of tracked audit archive** (owner call), **~540 KB relocated** out of
`progress.md`, **~900 lines of verifiably dead spec prose**, **132 lines of shipped route code
freed 11 months early**, and **54 dead path mentions**. What must never be touched:
`TRAPS.md`, `hand-run-passes.md`, `lab-voice.md`, `SECURITY.md`'s machinery section,
`demo.md`, `bugs.md`, `AI-WRITING-TELLS.md`, `leads-to-follow.md`, `docs/history/*`, and the
whatsapp-curation trio.

## Findings

### docs-01 - Archive refactor audit 1's `work/` folder the way bug audit 1's own README already did
- **Where**: `docs/audit-fix/2026-08-25-refactor-audit-1/work/` (72 files, 1,823 KB);
  contrast `docs/audit-fix/2026-08-21-bug-audit-1/README.md:1-10`
- **Phase**: relocate     **Tier**: T2     **Class**: structural     **Decides**: owner
- **Evidence**: `git ls-files -z docs/audit-fix/2026-08-25-refactor-audit-1/work | xargs -0
  stat -f %z` sums to **1,867,024 bytes across 72 files**. The whole `docs/` tree is 3,347 KB,
  so this one archive is **54.5% of all documentation by weight** and 5.7% of the entire
  tracked repo (32,965 KB). Inside it: `work/agents/` 798 KB (18 files), `work/raw/` 447 KB
  (34 files), `work/findings-index.json` 276 KB in one file, `work/verify/` 174 KB,
  `work/workflow-find.js` 59 KB. The precedent for what to do already exists **in the same
  folder tree and in the owner's own hand**: `docs/audit-fix/2026-08-21-bug-audit-1/README.md`
  is ten lines and says *"Artifacts: deleted from the working tree in the owner's 2026-08-22
  cleanup; they live in git history. Recover with `git log --follow --diff-filter=D -- ...`"*.
  Bug audit 2 sits in between at 275 KB total (84 KB of `work/`). Refactor audit 1 kept
  everything. Nothing in the repo reads `work/`: `grep -rl "refactor-audit-1/work"` outside
  that folder returns only `fix-prompt.md`'s own line *"the full evidence ... live in
  `work/agents/<prefix>.md`"* - and that campaign **closed 2026-08-27** ("Nothing here is
  waiting for a fix session").
- **What to do**: this is the owner's call, so present it as a choice, not an action. Option A
  (bug audit 1's precedent): remove `docs/audit-fix/2026-08-25-refactor-audit-1/work/` from
  version control, keep `report.md` (47 KB) and `fix-prompt.md` (118 KB) at the top level, and
  add six lines to the folder naming the removal commit and the
  `git log --follow --diff-filter=D` recovery incantation, exactly as bug audit 1's README
  does. Option B (middle): keep `work/agents/*.md` and `work/verify/*.md` (972 KB - the
  reasoning), drop `work/raw/` (447 KB of tool output regenerable in minutes) and
  `work/findings-index.json` (276 KB, a machine index for a compiler that has finished).
  Option C: keep as is and accept that closed audits are the majority of `docs/`. My
  recommendation is **B**: the agent reports contain judgement that cost real money to produce
  and cannot be regenerated; `raw/` is `cloc`, `knip`, `jscpd` and a build log, every one of
  which the next audit re-ran from scratch anyway (this audit did exactly that). Whichever is
  chosen, update `docs/audit-fix/README.md`'s house-rules paragraph so the next audit knows
  what survives.
- **Saving**: Option A **1,823 KB / 72 files**; Option B **723 KB / 35 files**. Zero code, zero
  build time, zero runtime. Pure tracked weight and clone time.
- **Risk & gate**: low. Nothing imports these; `npm run check` cannot see them. The only real
  loss is convenience: recovering a removed `work/agents/dead-code.md` means a `git show`
  rather than an open. Gate: `npm run check` (it will pass either way) plus a `grep -rn
  "refactor-audit-1/work" --include=*.md --include=*.ts --include=*.mjs .` returning only
  intentional references first.
- **Confidence**: high that the weight is real and the precedent exists. Medium on the
  recommendation - what would change my mind is the owner saying he re-reads agent reports.
- **Notes**: this pairs with **docs-03**, which is the same question asked before the mistake is
  made again rather than after. I deliberately did not extend this to bug audit 2 (275 KB is
  not a problem) or to the top-level `report.md`/`fix-prompt.md` of either audit, which are
  the record the README promises and are cited from `CLAUDE.md`.

### docs-02 - `media.md` §4.2/§4.4 state a Collection image pipeline that has never existed, and its own banner calls them "still true"
- **Where**: `docs/spec/media.md:118-144` (§4.2 variants table, §4.3, §4.4 storage budget);
  the blessing is at `docs/spec/media.md:31-33`. Ground truth:
  `src/lib/upload-shared.ts:91` (`COLLECTION_WEBP_QUALITY = 100`),
  `src/app/(main)/collection/actions.ts:594-603`, `src/lib/image.ts:123-137`
  (`storedResizeBox`), `docs/TRAPS.md:163-186`, `prisma/schema.prisma:269-271`.
- **Phase**: dead     **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: media.md's supersession banner says: *"What is still true here: §1 (the name),
  **§4.1-4.2 and §4.4 (variants and the storage budget)**, §8 ... and §9."* §4.2 then prints a
  three-row table: `thumbUrl` 480px q72, `url` **1600px q80**, `originalUrl` up to 3000px q82,
  and states *"A gallery cannot serve 1920px WebPs into a grid; that is the expensive
  mistake."* §4.4 computes *"thumb ~35KB + display ~250KB + original ~600KB = under 1MB stored
  per accepted photo. 5,000 accepted photos = under 5GB."*

  None of that is the code. `contributePhotoDirect` does
  `storedResizeBox(await sharpImage(original).rotate().metadata())` then
  `.webp({ quality: COLLECTION_WEBP_QUALITY })`, and `COLLECTION_WEBP_QUALITY` is **100**, not
  80. `storedResizeBox` is not a 1600px box: it applies a 40-megapixel *area* cap and a 16383px
  side cap that exist to stop a decompression bomb and, in the code's own words
  (`actions.ts:585`), *"is a no-op on anything a phone or a flatbed produces"*. `originalUrl`
  is not a column - the `Photo` model has exactly `thumbUrl` and `url`. So the stored copy is
  the contributor's photograph at full resolution, re-compressed, and the per-photo budget is
  several times §4.4's figure.

  `docs/TRAPS.md:163` exists solely because of this error: *"The Collection does NOT downscale,
  and `toDisplayWebp` will tell you it does. **Two sessions have now** read `src/lib/image.ts:63`
  ... and concluded that the Collection stores 1920px copies."* The owner, quoted there,
  2026-09-02: *"this is the second time a session has hallucinated that we're compressing
  collection photos why??"*. TRAPS blames a well-named function. It is not only the function.
  `CLAUDE.md` tells every session to *"read the one you are touching"* in `docs/spec/`, and the
  one it sends a Collection session to prints "1600px" in a table under a banner that says
  that table is current. This is a third loaded gun in the same room.
- **What to do**: (1) Rewrite §4.2's table to two rows and the real numbers: `thumbUrl` 480px
  (verify the quality against `contributePhotoDirect` before writing it down), `url` = **full
  resolution, WebP quality 100, bounded only by a 40MP area cap and a 16383px side cap**, and
  delete the `originalUrl` row - there is no such column. Keep the "a gallery cannot serve big
  WebPs into a grid" sentence only if it is rewritten to say the grid uses `thumbUrl` and the
  viewer takes the full file. (2) Rewrite §4.4's arithmetic from the real per-photo cost, or
  delete the numbers and point at the live quota code rather than inventing a second source of
  truth. (3) Amend the banner at `media.md:31-33` so it stops blessing §4.2/§4.4. (4) Add one
  line to `docs/TRAPS.md`'s Collection paragraph naming `docs/spec/media.md` §4.2 as the second
  place the wrong number lived, so the trap entry is complete. (5) Cross-lens, not mine to fix:
  `prisma/schema.prisma:269-270` carries the same wrong comment - `url String // 1600px - detail
  view` - see "For other lenses".
- **Saving**: 0 lines net (~42 rewritten, ~10 deleted). The unit here is **sessions**: this is
  the third time the same wrong fact has been reachable, and the previous two each cost a
  session and an owner complaint.
- **Risk & gate**: low - documentation only. Gate: none automatic. The fix session must read
  `contributePhotoDirect` and `storedResizeBox` and quote the constants it writes down, not
  paraphrase this finding.
- **Confidence**: high. `COLLECTION_WEBP_QUALITY = 100` and the absent `originalUrl` column are
  both single greps. The one thing that would change my mind is `contributePhotoDirect` having
  a second, bounded path I did not read - it has a proxied fallback (`contributePhoto`) that
  the fix session should check before writing "full resolution" as unconditional.
- **Notes**: I rate this the most valuable finding in my territory, and it is not a line count.
  Also note the owner's own project memory says "full-res WebP q90" - **q90 is wrong too, it is
  100**. That is outside my territory but it means three of the four places this number is
  written down disagree with the code.

### docs-03 - Decide what an audit's `work/` folder is allowed to weigh BEFORE this audit commits 3,328 KB
- **Where**: `docs/audit-fix/2026-09-03-refactor-audit-2/` (untracked, 3,336 KB today, of which
  `work/` is 3,328 KB and `work/raw/` alone is 956 KB); the rule it would land under is
  `docs/audit-fix/README.md:3-6`
- **Phase**: architecture     **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: `du -sk` on the untracked folder returns 3,336 KB **before** the compiler has
  written its final report. `docs/` is 3,347 KB tracked today. Committing this folder as it
  stands makes `docs/` ~6,700 KB and makes the two closed audits plus this one **~72% of all
  documentation by weight**. The trajectory is visible: bug audit 1 kept 0.6 KB, bug audit 2
  kept 275 KB, refactor audit 1 kept 1,985 KB, refactor audit 2 is on course for 3,300 KB.
  `work/raw/` at 956 KB is the fastest-growing part and is entirely regenerable - it holds
  `test-timings.tap` (217 KB), `route-bundle-stats.json` (122 KB),
  `route-bundle-stats-nolab.json` (76 KB), two `cloc-by-file.csv`, four tsc diagnostic dumps
  and two duplicate build logs (`build-nolab.txt` and `build-nolab-run3.txt` are byte-identical
  at 2,915 bytes).
- **What to do**: the owner decides one rule and `docs/audit-fix/README.md` records it, e.g.
  *"an audit commits its report, its fix prompt and its agent reports; `work/raw/` is
  gitignored, because every tool in it is a one-line re-run."* Then add
  `docs/audit-fix/*/work/raw/` to `.gitignore` and let this audit be the first to follow it.
  If the owner would rather keep raw evidence, the cheap half is still worth taking: drop the
  byte-identical duplicate build logs and the four `tsc-diag-*` dumps, and compress nothing (a
  committed binary is worse than a big text file).
- **Saving**: **~956 KB not added** if `raw/` is excluded; ~2,400 KB if the rule is
  report-plus-agents-only. The honest framing is prevention, not reduction.
- **Risk & gate**: low. The risk is losing the ability to answer "what did the tools say on the
  day", which git history preserves for anything that was ever committed and does not preserve
  for anything gitignored - that asymmetry is the whole decision.
- **Confidence**: high on the numbers. Medium on the recommendation; a future audit comparing
  itself to this one would want `raw/route-bundle-stats.json` specifically.
- **Notes**: pairs with docs-01. Answering them together is one conversation with the owner and
  one edit to `docs/audit-fix/README.md`.

### docs-04 - August was never archived out of `progress.md`, though `docs/README.md` says a closed month moves
- **Where**: `progress.md:637-8514` (162 entries dated 2026-08-01 to 2026-08-31);
  the rule is `docs/README.md:12-13` and `docs/README.md:35-36`; the pattern is
  `docs/history/progress-2026-06.md:1-4` and `docs/history/progress-2026-07.md:1-4`
- **Phase**: relocate     **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `docs/README.md` says *"`progress.md` - running session history, append-only.
  Closed months are archived to `docs/history/` (see below), so this file holds the current
  month"* and *"`docs/history/` - closed months of `progress.md`, moved here unedited once the
  month ends, in the same commit as an ordinary session entry."* Both archived files repeat it
  verbatim in their own banner. June and July were moved on 2026-08-26. August closed on
  2026-08-31; today is 2026-09-04. `awk '/^## 2026-08-/{c++}'` counts **162 August entries**;
  `awk '/^## 2026-09-/{c++}'` counts 18. The file is **8,545 lines / 586 KB**, and August is
  lines 637 through 8514 - roughly **7,878 lines and ~540 KB**. For scale, that one file is
  larger than every `docs/spec/*` put together (384 KB).
- **What to do**: create `docs/history/progress-2026-08.md` with the same four-line banner the
  other two carry, move lines 637-8514 into it unedited, and leave `progress.md` holding
  September. **One trap to fix on the way past**: `progress.md` is newest-first everywhere
  except its last entry - `## 2026-09-03 - the viewer stops letting go of the page` sits at
  line 8515, at the BOTTOM, below all of August. Somebody appended where everyone else
  prepends. That entry must move to the top with the other September entries, not travel into
  the August archive with the block around it. Do the move and the reorder in one commit so the
  diff is readable.
- **Saving**: **~540 KB and ~7,878 lines relocated** out of the file the owner and every session
  opens most often. Not deleted - relocated, which is the honest unit. Secondary: a session
  reading `progress.md` for context currently reads 586 KB to find this week.
- **Risk & gate**: low, but not zero - this is the one file the brief warns may hold another
  session's uncommitted work. Check `git status --short progress.md` immediately before the
  move and abandon if it is dirty. No gate; nothing reads `docs/history/`, by its own banner.
- **Confidence**: high.
- **Notes**: `progress.md` itself is root-assets' territory; the **archive rule** is mine, and
  the rule is what is broken. I have put the file-weight observation under "For other lenses"
  as well so the two agents do not both cost it.

### docs-05 - `docs/README.md` is the index that polices drift, and it has drifted
- **Where**: `docs/README.md:22-25` (the spec list), `docs/README.md:28-30` (the planning list),
  `docs/README.md:3-5` (its own promise)
- **Phase**: hygiene     **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the file opens *"Every path below was verified against disk on 2026-08-26. If
  you add a doc directory, add it here in the same change; if you delete one, delete its line.
  A map that lists folders which do not exist is worse than no map."* Then:
  - It says `docs/spec/` holds **"Exactly:** `admin`, `avatars`, `catchups`, `demo`,
    `directory`, `lab-voice`, `letters`, `mascot`, `media`, `profile`, plus `person-row-audit`
    ... and `apple-edge-light`". Disk holds fifteen: those twelve plus `DESIGN-SYSTEM` (listed
    separately above, fine), **`guide`** and **`hand-run-passes`** - both missing, and
    `hand-run-passes.md` is one of the three documents `CLAUDE.md` marks in bold as
    read-before-working.
  - It says `docs/planning/` holds `bugs.md`, `FEATURES.md`, *"plus point-in-time reference
    material (`leads-to-follow.md`, `letterloop-research.md`)"*. Disk holds fifteen files: those
    four, four dialog/menu research digests, and three campaign folders
    (`collection-rework/` 4 files, `collection-scrubber/` 2, `class-collection/` 1) totalling
    3,181 lines. None is mentioned.
  - `git log -1 --date=short -- docs/README.md` is **2026-08-26** - it has not been touched
    since the day it was verified, while eight files were added under it.
- **What to do**: rewrite the two bullets from `ls`. Add `guide` and `hand-run-passes` to the
  spec list. Replace the planning bullet with three sentences: the trackers (`bugs.md`,
  `FEATURES.md`), the point-in-time research (`leads-to-follow.md`, `letterloop-research.md`,
  the four dialog/menu digests), and the design campaigns (one folder each, each with a
  `handover.md` or `spec.md` that is the entry point). While there, say which campaigns are
  closed - see docs-13 and docs-14.
- **Saving**: 0 lines; the unit is one fewer wrong map. It is the cheapest finding here and it
  makes six others findable.
- **Risk & gate**: none.
- **Confidence**: high.
- **Notes**: the word "Exactly" is what makes this worth a finding rather than a shrug - it is
  an explicit completeness claim, and a session that trusts it will not open `hand-run-passes.md`.

### docs-06 - `letters.md` is 430 lines of which ~315 specify a feature that was renamed, rebuilt and respecified elsewhere
- **Where**: `docs/spec/letters.md:15-48` (§0), `:49-80` (§1), `:136-233` (§3 + §4),
  `:257-364` (§5.2), `:365-381` (§5.3), `:402-418` (§7-§8), `:420-428` (grounding list).
  Successor: `docs/spec/catchups.md`. Duplicate source: `docs/planning/letterloop-research.md`.
- **Phase**: dead     **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the file's own banner (line 3) says the whole `Roundup`/`RoundupIssue`/
  `RoundupQuestion`/`RoundupAnswer`/`RoundupPref` family and *"'Roundup(s)' naming throughout
  this document are **superseded** by `docs/spec/catchups.md`"*. Then 98 lines of §3 and 108
  lines of §5.2 go on printing `model Roundup { groupId String ... }` and a Roundup lifecycle.
  Worse, the banner names catchups.md's models as `CatchupIssue`/`CatchupQuestion`/
  `CatchupAnswer` - which **catchups.md §6 explicitly says do not exist**; the real models are
  `CatchupEdition`/`CatchupPrompt`/`CatchupEntry`. So the pointer in the banner is itself
  wrong, in the same way `ROADMAP.md` already carries a "(Superseded: ...)" note about.
  Beyond §3: §0 (34 lines) is a condensed retelling of `docs/planning/letterloop-research.md`,
  which is 376 lines of the same research and is what `catchups.md` actually cites. §1 (32
  lines) argues a naming collision decided in July 2026 and locked in DESIGN-SYSTEM §8. §5.3
  proposes folding `GroupPost` into `Post`, which shipped and was then made moot when Groups
  was removed from the product. §5.2's own body says *"the schema stays the same SQLite-local /
  Postgres-prod shape; only the deploy target moves ... the `datasource` provider in the
  current schema is hardcoded `sqlite`"* - three stack generations out of date. §7-§8 plan a
  **Render Cron** tick. The grounding list at the end names `src/components/groups/group-feed.tsx`,
  `src/app/(main)/groups/[id]/page.tsx` and `src/app/preview/v2/page.tsx`, none of which exists.
  What is genuinely current is §2 (Letters, lines 81-135) and §6's reuse map.
- **What to do**: cut the file to its current half. Delete §0 and replace it with one line
  pointing at `docs/planning/letterloop-research.md`. Delete §1 and replace with one line
  pointing at DESIGN-SYSTEM §8. Delete §3, §4, §5.2, §5.3, §7 and §8 outright and replace the
  whole block with a two-line pointer to `docs/spec/catchups.md`. Fix the banner's model names
  (`CatchupEdition`/`CatchupPrompt`/`CatchupEntry`/`CatchupEntryLove`, not the
  Issue/Question/Answer trio). Delete the three dead paths from the grounding list.
- **Saving**: **~315 lines of 430** (73%), ~28 KB. Plus three dead path mentions closed
  (counted once, under docs-08).
- **Risk & gate**: low. Nothing reads it programmatically; `docs/README.md` lists it (update
  per docs-05). Before cutting, `grep -rn "letters.md" docs/ CLAUDE.md AGENTS.md` to catch any
  section-anchor citation.
- **Confidence**: high on §3/§5.2/§5.3/§7/§8 being dead. Medium on §0 - it is a *condensed*
  parity target and somebody may prefer the short version to the 376-line one. If in doubt,
  keep §0 and cut the other 280 lines.
- **Notes**: the same "spec renamed to a successor but kept in full" shape appears in
  `media.md` (docs-09) and `catchups.md` (docs-07). Three specs, one habit: a supersession
  banner gets added and the superseded body is never removed, so the file grows a second,
  wrong reading path that only a careful reader avoids.

### docs-07 - `catchups.md` specifies a feature built on Groups, and Groups was removed from the product
- **Where**: `docs/spec/catchups.md:171-223` (§3.1 index, §3.2 create flow),
  `:424-450` (§5 notifications table), `:794-812` (§7 permissions), `:836-895` (§9 build plan),
  `:768-793` (§6.4 optional cleanup). Reality:
  `src/app/(main)/catchups/new/page.tsx:17-31`, and the absence of `src/app/(main)/groups/`.
- **Phase**: dead     **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the file already carries a 30-line review banner that ends *"Groups are being
  retired as a user-facing feature; a Catch-up is created from a set of PEOPLE and the Group
  row survives only as the hidden membership container"*, and it lists what remains binding.
  But the sections underneath were never edited. §3.1 specifies empty states whose primary CTA
  is *"Find a group" -> `/groups`* and *"Create a group" -> `/groups/new`*; neither route
  exists. §3.2 specifies `?group=<groupId>` and a group picker; the shipped page's own header
  comment says *"`?group=<id>` used to preload a group's name and roster into this form ...
  Groups are now being retired"*. §5's notification table interpolates `{group}` into all six
  message templates. §7 grants Keeper powers to *"any group admin (`GroupMember.role =
  'admin'`, the group 'Keeper')"*. §9's WP7 has a "Coordinated insert" instructing a builder
  to edit `src/app/(main)/groups/[id]/page.tsx` - with a parenthetical two paragraphs earlier
  admitting that file is gone. There are also two routes shipped that the spec does not
  mention at all: `/catchups/join` and `/catchups/join/[token]`. And §6.4's optional cleanup
  SQL drops six orphan tables that refactor audit 1 already dropped (report §1b: "4 tables ...
  dropped from production and demo").
- **What to do**: three edits, in order of value. (1) Rewrite §3.1 and §3.2's empty states and
  entry points against the shipped `/catchups/new`, and add a short §3.8 for the join-link
  flow (`/catchups/join/[token]`), reading the code rather than guessing. (2) Rewrite §7 in
  terms of what actually gates a Catch-up now, and delete the `GroupMember.role` sentence.
  (3) Delete §9 entirely - it is a build plan for work that shipped seven months ago, and its
  WP7 actively instructs a session to edit a deleted file. Leave §2, §4, §6.1-6.3 and §8
  alone; the banner is right that those are still binding. §6.4 can be cut to one line saying
  the cleanup was done.
- **Saving**: **~120 lines** deleted (§9 is 59 of them), ~90 lines rewritten. The real unit is
  that the app's second-largest feature stops shipping a spec whose flows point at 404s.
- **Risk & gate**: low. `catchups.md` is cited from `CLAUDE.md`, `ROADMAP.md` and
  `docs/spec/admin.md` §9.6, all by file not by section. Read `src/app/(main)/catchups/**`
  before rewriting §3; do not transcribe this finding.
- **Confidence**: high. `ls src/app/(main)` has no `groups`, and the shipped page's own comment
  is the primary evidence.
- **Notes**: the Group *model* survives in `prisma/schema.prisma:411` as the hidden membership
  container, so a fix session must not conclude "Group is gone" and start deleting. The spec
  should say that explicitly, because it is the exact thing a reader will get wrong.

### docs-08 - 54 real dead path mentions across 14 documents (94 total, ~40 of them deliberate)
- **Where**: worst offenders `docs/spec/avatars.md` (9), `docs/content/DELIGHT.md` (9 real of
  12), `docs/spec/media.md` (5), `docs/spec/directory.md` (4), `docs/spec/profile.md` (4),
  `docs/spec/mascot.md` (4), `docs/planning/collection-rework/handover.md` (3),
  `docs/spec/admin.md` (2), `docs/planning/bugs.md` (2), `docs/spec/letters.md` (1),
  `docs/spec/guide.md` (1), `docs/planning/collection-rework/spec.md` (1),
  `docs/planning/collection-scrubber/handover.md` (1),
  `docs/audit-fix/prompts/bug-audit-prompt.md` (1)
- **Phase**: hygiene     **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: I extracted every token matching `(src|scripts|e2e|docs|prisma|public|.github|
  .claude)/...` from every `.md` and `.txt` under `docs/` (excluding the three audit archives)
  and `stat`ed each one. 94 distinct missing paths. Separately I resolved every relative
  markdown link `](...)` against disk: **three hits, all false positives** on `[id]` route
  syntax - so the *links* are clean and only the *prose path mentions* have rotted.

  About 40 of the 94 are deliberate and must be left alone: `docs/STACK_MIGRATION.md`,
  `docs/planning/SECURITY-AUDIT.md`, `docs/planning/catchups-fixes-brief.md`,
  `docs/planning/profile-concepts-brief.md`, `docs/planning/DELIGHT_FIX.md` and
  `docs/spec/color.md` are each named in a sentence that says the file was deleted and lives in
  git history, and both `docs/history/progress-2026-0{6,7}.md` are frozen archives whose whole
  job is to name the files that existed then.

  The rest are unflagged. The most-repeated ghosts, with what replaced them:
  `src/components/common/user-avatar.tsx` (7 mentions - now `BirdAvatar`/`bird-avatar-v2.tsx`),
  `src/app/preview/v2/page.tsx` and the whole `src/app/preview/` tree (7 - now `/lab`),
  `src/lib/motion.ts` + `src/components/motion/` (6 - now
  `src/components/common/motion.tsx`), `src/components/auth/hoopoe.tsx` (3 - now
  `src/components/mascot/`), `src/components/layout/navbar.tsx` (3 - now the sidebar),
  `src/app/lab/crop/_policies.ts` and `_justified.ts` (3 - deleted in phase 3, and the same
  handover says so 1,200 lines later), `src/lib/collection-facets.ts` (2 - now
  `src/lib/collection.ts`), `src/components/settings/settings-form.tsx`,
  `src/components/ui/skeleton.tsx`, `src/components/ui/tabs.tsx`,
  `src/components/admin/user-management.tsx`, `src/components/tour/` (deleted 2026-08-27, and
  `guide.md` names it on purpose), `src/components/collection/decade-rail.tsx` (now
  `year-rail.tsx`), `scripts/gen-support-qr.mjs`, `src/lib/avatar.test.ts` (now `.mjs`).
- **What to do**: a mechanical sweep, one commit per file so a wrong repoint is revertable.
  For each: repoint to the successor if there is one, or delete the parenthetical if the point
  survives without it. **Do not repoint by name-similarity** - `TRAPS.md:163` is a whole
  paragraph about how a similarly-named function fooled two sessions. Check the caller.
  Then consider a `scripts/qa/doc-paths.test.mjs` that fails `npm run check` when a doc names a
  `src/`-shaped path that does not exist, with an allowlist for the ~40 deliberate history
  pointers - the owner's own standing rule is *"one protocol, enforced by a test"*, and this is
  the only reason the fix would stay fixed. I have not proposed the test as a finding of its own
  because a new gate is an owner call and the allowlist is fiddly; flagging it as the option.
- **Saving**: 54 corrected references. No lines. The unit is sessions sent to the wrong file.
- **Risk & gate**: low. `npm run check` is unaffected. The risk is a careless repoint, which
  the one-commit-per-file rule contains.
- **Confidence**: high on the count (scripted, then spot-verified twelve by `ls`). Medium on
  which are deliberate - I classified by reading the surrounding sentence, and a fix session
  should re-read each rather than trusting my split.
- **Notes**: the `/preview/` -> `/lab` rename is the single largest cause and is worth one
  targeted pass: `grep -rn "src/app/preview\|/preview/" docs/ --include=*.md | grep -v history`.

### docs-09 - `media.md`'s dead sections are marked dead and kept anyway (~119 of 337 lines)
- **Where**: `docs/spec/media.md:75-88` (§2), `:89-105` (§3's route table), `:145-178`
  (§5 and §6), `:294-337` (§10, §11, §12 and the grounding list)
- **Phase**: dead     **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the banner marks §2 *"dead in full"*, §5 *"dead"*, §6 *"dead"*, and §3's routes
  wrong. Those sections are still printed underneath their own tombstones - §2 still explains
  *"The taxonomy has no 'people' or 'reunion' category ... There is nowhere to file a selfie"*,
  which is the opposite of the shipped six-bucket taxonomy that leads with **People**. §3's
  table still lists `/collection/contribute` (never existed) and describes `/collection/[id]`
  as a detail page (it is a permalink that opens the viewer). Three sections the banner does
  **not** mention are also dead: §10 "Seeding and marketing" plans how to reach 40-60 founding
  photographs for an archive that now holds 1,719 from one album import; §11 specifies the
  masonry tile entrance and *"'A wander' sort gently cross-fades the grid"* - the banner itself
  says there is no masonry and no "A wander"; §12's five open questions are all answered
  (`originalUrl` - no such column; Blob vs R2 - resolved and noted; `photoTrusted` - the toggle
  already exists per collection-rework F45; dark mode - shipped 2026-08-02). The grounding
  list at `:330-337` names four files that do not exist
  (`src/components/common/user-avatar.tsx`, `src/components/layout/navbar.tsx`,
  `src/app/preview/v2/page.tsx`, and `public/uploads/YYYY/MM` as a live path).
- **What to do**: delete §2, §5, §6, §10, §11 and §12 and leave one line each saying where the
  answer lives (`src/lib/collection.ts` for buckets, `src/components/collection/*` for the
  page, `docs/planning/collection-rework/spec.md` for the rest). Rewrite §3's route table from
  `src/app/(main)/collection/`. Delete the four dead paths from the grounding list. Fold the
  five-item banner into the two or three lines that survive.
- **Saving**: **~119 lines of 337** (35%), ~12 KB, plus five dead paths.
- **Risk & gate**: low. Do this in the same commit as **docs-02**, because a session that reads
  a shortened media.md and a corrected §4.2 gets a file it can trust end to end.
- **Confidence**: high - the banner does most of my work for me.
- **Notes**: a tombstone is not a delete. Three specs here (letters, media, catchups) show the
  same pattern, and the cost is not disk: it is that the file is now twice as long as its true
  content and a reader has to hold "which half am I in" the whole way down. If the owner wants
  the dead text preserved, `git log --follow` already preserves it - which is exactly the
  argument `SECURITY.md:3-6` and `profile.md:8` already make for three other deleted documents.

### docs-10 - `OPERATIONS.md` and `SECURITY.md` state five counted facts that are now wrong
- **Where**: `docs/OPERATIONS.md:9-11` ("11 routes x 2 viewports"), `:36-38` ("Four routes
  photograph a live database"), `:52-54` ("`/collection` is deliberately not in that list"),
  `:5-7` ("~80 seconds"), `docs/OPERATIONS.md` §8 ("the unit gate discovers its 74 test files
  by glob"), `docs/SECURITY.md` "The gates" ("all 25+ unit test files").
  Truth: `e2e/visual.spec.ts:28-68`; `find src scripts e2e -name '*.test.mjs' | wc -l` = 102.
- **Phase**: hygiene     **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `ROUTES` in `e2e/visual.spec.ts` now holds **12** entries, not 11 - landing,
  login, feed, directory, letters, catchups, collection, **collection?scope=class**, support,
  birds, about, privacy. **Six** carry `live:` masks, not four: feed, directory, letters,
  catchups and **both** collection entries. `/collection` was added to the masked set on
  2026-09-02 with a long comment in the spec explaining exactly why - *"the admin account's own
  class gained 1,719 photographs when the owner's album was imported"* - so OPERATIONS' claim
  that it is *"deliberately not in that list ... it is the one that catches image-sizing
  regressions"* is not merely stale, it contradicts a decision made two days ago. The test-file
  counts are off by 28 and 77 respectively; the brief's own baseline says 102, and
  `raw/check-baseline.txt` agrees. `CLAUDE.md` separately says the visual suite takes 50s where
  OPERATIONS says ~80s and `collection-scrubber/handover.md:29` says ~70s - three numbers for
  one measurement.
- **What to do**: reread `e2e/visual.spec.ts` and rewrite OPERATIONS §1's first three
  paragraphs from it: 12 routes, six live-masked, and a sentence saying what `/collection`'s
  masking cost (the spec's own comment says the empty state is now uncovered - that is worth
  carrying into OPERATIONS, because it is a real coverage hole the owner should know about).
  Replace both test-file counts with "the whole `*.test.mjs` glob" rather than a number, so
  they cannot rot again - the number is not the point in either sentence. Pick one figure for
  the visual suite's runtime, or say "under two minutes".
- **Saving**: 0 lines. The unit is that `OPERATIONS.md` is the file that exists to say *"a tool
  nobody runs is worse than no tool"*, and it is currently wrong about what the tool covers.
- **Risk & gate**: none.
- **Confidence**: high; all four are single commands.
- **Notes**: `OPERATIONS.md` is 16 commits deep and last touched 2026-09-02, so this is not a
  neglected file - it is a file whose prose is maintained and whose counts are not. The
  "replace the number with the glob" move is the durable fix.

### docs-11 - `admin.md` opens "Nothing here is built yet" for a surface that shipped, and its section map is two rooms short
- **Where**: `docs/spec/admin.md:3-6` (status), `:81-100` (§2's nine sections / eleven routes),
  `:350-569` (§9's ten subsections). Truth: `ls src/app/(main)/admin` = eleven sections,
  thirteen page routes.
- **Phase**: hygiene     **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the header says *"Status: written 2026-08-18 ... Approved in chat on 2026-08-18
  before writing. **Nothing here is built yet.**"* Every route in §2's diagram exists today,
  plus two the spec never mentions: **`/admin/audit`** and **`/admin/review`**. §9 has a
  `9.5b Review` (so Review was retro-fitted into §9 but not into §2's diagram or its "nine
  sections, three groups" framing), and **`/admin/audit` has no section anywhere** - despite
  `SECURITY.md` leaning on it three separate times (*"Every pass writes a `retention.sweep`
  audit line, so 'is it running' is answered on /admin/audit"*, and the
  `AuditLog`/`LoginAttempt` paragraph). §2 also says *"eleven routes in all"*; the real count
  is thirteen. §9.9 marks Analytics *"(stub, see 9.9)"* though `/admin/analytics` is a built
  surface reading `MetricSnapshot`. Two dead paths inside:
  `src/components/admin/user-management.tsx` (:223) and `src/components/tour/tour-steps.ts` (:366).
- **What to do**: change the status line to what it is - a spec that was written as a plan and
  shipped, with the shipped panel as the successor where they disagree (the same banner shape
  `profile.md` already uses well). Update §2's diagram and its route count to eleven sections /
  thirteen routes and move Review out of `9.5b` into its own numbered slot. Write a §9.10 for
  `/admin/audit` - short, but it needs to exist, because it is the surface `SECURITY.md`
  promises the owner can answer "is the sweep running" from. Drop "(stub)" from Analytics.
  Delete the two dead paths.
- **Saving**: 0 lines net; ~30 rewritten, ~15 added. The unit is that the admin spec stops
  telling a reader the panel does not exist.
- **Risk & gate**: low. Read the eleven route directories before rewriting §2; do not
  transcribe my list.
- **Confidence**: high on the counts. Medium on whether `/admin/audit` wants a full §9.10 or
  three lines - a session that opens the page will know.

### docs-12 - `/notice/[id]` can be deleted now, not in August 2027, because the notification retention cap changed today
- **Where**: `docs/planning/bugs.md:462-467` (the dated-cleanup entry);
  `src/lib/retention.ts:54` (`notifications: 30`); `scripts/ops/prune.mjs:11-17`;
  `docs/SECURITY.md` retention table (uncommitted, "30 days"); the code
  `src/app/(main)/notice/[id]/page.tsx` (119 lines) + `loading.tsx` (13 lines)
- **Phase**: dead     **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: bugs.md says *"**After 2027-08-01: delete `/notice/[id]`.** It resolves legacy
  links to moderation notes that predate the 2026-07-24 notes-to-messages migration.
  `retention.ts` caps notifications at **365 days**, so after that date no notification old
  enough to point here can still exist. Deleting it earlier 404s links sitting in real
  inboxes."* The date is derived arithmetic: 2026-07-24 + 365 days, rounded up.

  `src/lib/retention.ts:54` now reads `notifications: 30`. `scripts/ops/prune.mjs`'s header
  records why: *"The default here was 30 days ... that fix raised this default to 365 -- and
  left --days 30 in ... **The owner settled it on 2026-09-04: 30 days is the real policy**"*.
  The `docs/SECURITY.md` edit sitting uncommitted in the tree right now is the same session
  updating the retention table.

  Redo the arithmetic with 30 days and the answer moves eleven months: the last notification
  that could point at `/notice/[id]` was created on or before 2026-07-24, and the nightly sweep
  removes anything older than 30 days, so **nothing that could link there has existed since
  roughly 2026-08-23**. Today is 2026-09-04. The premise of the deferral - "links sitting in
  real inboxes" - is already false.
- **What to do**: (1) In `docs/planning/bugs.md`, either delete the dated-cleanup entry and do
  the work, or restate the date as "already past" so it is not read as 2027 again. (2) Have a
  session verify against the live database before deleting anything - the honest gate is one
  read-only SELECT: `SELECT count(*) FROM "Notification" WHERE link LIKE '/notice/%';` (and
  `SELECT min("createdAt") ...` for the same rows). If it returns 0, the route is unreachable.
  (3) Then execute what bugs.md already specifies: delete `src/app/(main)/notice/`, drop
  `openAdminNoticeThread`'s `createdAt` override if this is still its only caller, and reword
  the four comments citing the route.
- **Saving**: **132 lines of shipped route code, one route directory, two route entries out of
  the build** (the brief counts 52 non-lab routes in the bundle stats), eleven months earlier
  than planned. Plus a stale entry off the tracker.
- **Risk & gate**: medium, and the risk is entirely in the SELECT. If any live notification
  still carries a `/notice/` link, deleting the route 404s a real member's inbox - which is
  exactly what the deferral existed to prevent. **Do not skip the query.** After deleting:
  `npm run check` (a deleted route leaves a stale `.next/types/validator.ts` - see TRAPS) and
  `npm run verify:crawl`.
- **Confidence**: high on the arithmetic, medium on the conclusion, because the retention
  change landed *today* and I could not query the database to confirm the sweep has actually
  run since. The SELECT is what closes that gap, which is why I wrote it out.
- **Notes**: I found this only because another session was editing `SECURITY.md` while I read
  it. It is worth saying plainly: **a retention constant is a load-bearing input to a dated
  cleanup, and nothing links the two.** If more dated cleanups are ever added to bugs.md, each
  should name the constant its date is derived from, so changing the constant surfaces the
  entries that depend on it. Cross-lens: `member-surfaces` owns the route itself (this was
  originally its finding, member-surfaces-05).

### docs-13 - `dialog-standards-findings.md` is finished business: all five of its findings shipped
- **Where**: `docs/planning/dialog-standards-findings.md` (182 lines, 11 KB). Verified against
  `src/components/ui/field-focus.ts`, `src/components/ui/focus-recipe.test.mjs`,
  `src/components/ui/menu-material.ts:41`, `src/components/ui/dropdown-menu.tsx`,
  `src/components/collection/contribute-room.tsx:210`
- **Phase**: relocate     **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the file says of itself *"Working notes, 2026-08-29. Evidence gathered before
  any code moved. This is the shared evidence base for four separate specs, not a spec itself.
  ... Nothing here is a proposal."* Its five findings, each checked:
  - "focus states executed on `input.tsx` only" -> `field-focus.ts` exists and
    `focus-recipe.test.mjs` walks every file that renders a text field. **Shipped.**
  - "the Collection contribute dialog: real title `sr-only`, a 22px paragraph impersonating it"
    -> `contribute-room.tsx:210` now carries a comment in the past tense: *"state hid it
    (sr-only) and let a 22px 'Drag and drop, browse or...'"*. **Shipped.**
  - "8 call sites still calling `window.confirm`" -> 3 remain outside `/lab`. **Mostly
    shipped**; the 3 are worth a look by whoever owns them, but they are not this document's job.
  - "Zero `DropdownMenuSeparator` usages" -> now in `post-card.tsx`,
    `catchups/home/people-panel.tsx`, `catchups/index/catchup-card-menu.tsx`. **Shipped.**
  - "Trigger hit targets under-size on touch" -> `MENU_TRIGGER_HIT` exists in
    `menu-material.ts:41` and DESIGN-SYSTEM §3 documents it. **Shipped.**
  Its conclusions live on in `DESIGN-SYSTEM.md` §2 (Focus states) and §3 (Menus, Dialogs, the
  item level). Nothing cites the findings file: `grep -rn "dialog-standards-findings" .`
  outside itself returns nothing. Its three sibling research digests **are** cited -
  `DESIGN-SYSTEM.md:341` says *"the research is in docs/planning/dialog-*-research.md"* - so
  those three stay.
- **What to do**: delete it, and add one line to `docs/planning/dialog-standards-research.md`'s
  header saying the codebase evidence that produced these rules is in git history
  (`git log --follow -- docs/planning/dialog-standards-findings.md`). That is the pattern this
  repo already uses in five places (`SECURITY.md:3-6`, `profile.md:8`, `catchups.md:4-6`,
  `ROADMAP.md:3`, `avatars.md:3`), so it needs no new convention. Moving it to `docs/history/`
  is the alternative, but that folder's own banner says it holds closed months of
  `progress.md`, so that would widen its meaning.
- **Saving**: **182 lines / 11 KB / 1 file.**
- **Risk & gate**: low. Confirm with `grep -rn "dialog-standards-findings" . --include=*.md
  --include=*.ts --include=*.mjs` before deleting.
- **Confidence**: high. Each of the five was verified by opening the successor file, not by
  reading a changelog.
- **Notes**: the one thing in it worth not losing is the thesis - *"in every area the owner
  flagged, a correct standard already exists in this repo, written down, argued for, dated, and
  was never enforced past the surface it was written on"* - which produced the owner's standing
  "one protocol, enforced by a test" rule. That rule is already in `CLAUDE.md`, so the thesis
  has landed and the evidence for it can go.

### docs-14 - `collection-scrubber/` is shipped, and its operational context has gone actively wrong
- **Where**: `docs/planning/collection-scrubber/handover.md` (249 lines) +
  `brief.md` (194 lines) = 443 lines / 26 KB. Stale claims at `handover.md:23`, `:29`, `:104`,
  `:231-233`. Shipped as commits `ab4cc8f`, `2400547`, `8211f64`.
- **Phase**: relocate     **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the last four commits on `main` are the scrubber landing: *"fix(collection):
  the phone's scrubber travels instead of teleporting"*, *"feat(collection): a seek keeps the
  archive above it, and the page is tested as a journey"*, *"fix(collection): stop rebuilding a
  year when a page arrives above it"*. `src/components/collection/photo-scrubber.tsx` and
  `year-rail.tsx` exist. All three "pieces of work" the handover lists are done.

  Left in place, it now misinforms. `:231-233`: *"`/collection` is deliberately **not** masked
  in the visual suite, so its baseline moves whenever a photograph is added - read the diff, and
  if it is only new photographs, rebaseline and say so."* Both `/collection` entries have been
  masked since 2026-09-02 and the spec's own comment calls rebaselining on photographs *"the
  one way to make this suite worthless"* - so the handover instructs the exact behaviour the
  suite's author forbade. `:23`: *"There are four real photographs in it today"* - the archive
  took 1,719 in one import on 2026-09-02. `:104` names
  `src/components/collection/decade-rail.tsx`, which is now `year-rail.tsx`. `:29` gives a
  third figure for the visual suite's runtime (~70s).
- **What to do**: delete the folder and record it the way this repo records deletions - one
  line in `docs/planning/collection-rework/handover.md`'s session log or in
  `docs/README.md`'s planning bullet saying the scrubber campaign closed on 2026-09-03 and its
  brief and handover live in git history. If the owner would rather keep the verbatim brief
  (`brief.md` is his own words, which this repo treats as precious), keep `brief.md` alone and
  delete `handover.md`, which is the half that has rotted.
- **Saving**: **443 lines / 26 KB / 2 files** (or 249 lines / 15 KB for the handover only).
- **Risk & gate**: low. Nothing cites it.
- **Confidence**: high that it shipped, high that `:231` is wrong. Medium on deleting
  `brief.md` - the owner's verbatim words are the thing this project preserves most carefully,
  and `collection-rework/handover.md:6-9` says he asked twice that no session work from a
  condensed version. Default to keeping `brief.md`.
- **Notes**: whichever way this goes, `:231-233` must not survive. If the folder stays, that
  paragraph gets corrected in the same commit - it is the one line here that could cause real
  damage, because it tells a session to rebaseline `/collection` without reading the diff.

### docs-15 - `directory.md`'s supersession banner is itself out of date about the one thing it says is live
- **Where**: `docs/spec/directory.md:12-19` (the "NOT stale" paragraph),
  `:96-199` (§3's City/HouseYear/ProfileTag deltas), `:192-199` (§3.5 "SQLite local, Postgres
  on Render"). Truth: `prisma/schema.prisma:865` (`model Place`), `:892` (`model UserPlace`);
  `grep 'model City\|model HouseYear\|model ProfileTag\|cityId' prisma/schema.prisma` returns
  **nothing**.
- **Phase**: hygiene     **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the banner correctly flags the Render/SQLite framing as dead, then says: *"The
  `City` / `HouseYear` / `ProfileTag` schema deltas in §3 are **not yet in
  `prisma/schema.prisma`** (no `City`, `HouseYear`, `ProfileTag`, or `cityId` model/field
  exists as of this check) - that remains a **live, unimplemented plan**, not a stale fact."*
  That was true when written. It is not now: the location work **shipped**, as `Place` +
  `UserPlace` with a 234,934-row GeoNames gazetteer (`demo.md` cites the count), a
  `lower(city)`/`lower(asciiName)` expression index (`TRAPS.md`), and a map that
  `visual.spec.ts` calls *"the most fragile layout in the app"*. So §3's 100 lines are not a
  live plan, they are a superseded design for a shipped feature - and the banner is the thing
  telling a reader otherwise. The house-per-year half also shipped, as the houses chain
  (`DESIGN-SYSTEM.md`: the leaf/cinnamon/sky tint trio *"first shipped in the profile houses
  chain"*; `profile.md` §4.1). §3.5's whole migration plan targets SQLite and Render.
- **What to do**: rewrite the banner's second paragraph: the map stack shipped as specced
  (that part is right and worth keeping), the location model shipped as `Place`/`UserPlace`
  rather than `City`/`cityId`, and house-per-year shipped. Then either delete §3.1-3.5 or mark
  each subsection with its successor. Delete the four dead paths (§0/§4.4/§5's `UserAvatar` -
  already flagged in the banner but the mentions are still there and would be cheaper gone -
  plus `src/components/ui/skeleton.tsx`, `src/app/preview/v2/page.tsx`,
  `src/components/directory/map`).
- **Saving**: ~100 lines if §3 goes; ~20 lines if only the banner and paths are fixed.
- **Risk & gate**: low. The map sections (§4) are still the best explanation of why the
  clustering works the way it does - do not touch them.
- **Confidence**: high. `grep 'model City' prisma/schema.prisma` is empty and `model Place`
  is at line 865.
- **Notes**: the general lesson worth writing down somewhere: **a supersession banner is itself
  a dated claim** and rots exactly like the body it annotates. Three banners in `docs/spec/`
  are now wrong about their own subject (`directory.md` here, `media.md` in docs-02,
  `letters.md`'s model names in docs-06). A banner that says "as of this check" without a date
  next to the claim is the shape to avoid.

### docs-16 - Three campaign documents each restate CLAUDE.md's operating rules in full
- **Where**: `docs/planning/collection-rework/spec.md:700-724` (§15, 25 lines),
  `docs/planning/collection-scrubber/handover.md:20-44` (§0, 25 lines),
  `docs/planning/collection-rework/handover.md:36-58` (~23 lines).
  Source of truth: `CLAUDE.md` Hard Rules + Gotchas, `AGENTS.md`, `docs/TRAPS.md`.
- **Phase**: dedupe     **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: each of the three prints the same eight rules: repo path and no feature
  branches, several sessions share the checkout so stage by name, `npm run check` is the gate,
  a push is a deploy, one Supabase database behind production and local dev, never
  `prisma db push`, never a Vercel CLI command, the Jerry Maguire test account, and
  chrome-devtools-finds-Playwright-remembers. `grep -rln "push is a deploy"` matches
  `CLAUDE.md` plus exactly these three. The copies have already drifted from each other and
  from the source: `CLAUDE.md` says `npm run check` takes ~30s, `collection-rework/spec.md:711`
  says ~25s, `collection-scrubber/handover.md:29` says ~25s and adds `npm run visual` at ~70s
  where `OPERATIONS.md` says ~80s and `CLAUDE.md` says 50s.

  There is a worse case in the same family. `collection-rework/handover.md:40-46` says: *"**The
  chrome-devtools MCP cannot sign in** ... `scripts/qa/_dev-login.mjs` exists precisely because
  the secret must not enter page JavaScript ... **CLAUDE.md still says to POST the secret from
  `evaluate_script`; do not.**"* So one copy of the rules is now openly contradicting
  `CLAUDE.md`, in a planning document most sessions will never open - which means the
  correction is effectively invisible while the thing it corrects sits in the file every
  session reads. Either `CLAUDE.md` is wrong and should be fixed, or this note is wrong and
  should go; leaving them in disagreement is the worst of the three states.
- **What to do**: replace each of the three blocks with two lines - *"Operating rules are
  `CLAUDE.md` and `AGENTS.md`; stack traps are `docs/TRAPS.md`. What follows is only what is
  specific to this campaign."* - and keep only the campaign-specific facts (which lab room to
  build in, which database holds the specimens, the `globals.css` Turbopack gotcha if it is not
  already in `CLAUDE.md`). Then resolve the dev-login disagreement: read
  `scripts/qa/_dev-login.mjs`, decide which instruction is right, and fix the loser. That
  decision belongs in `CLAUDE.md`, not in a planning folder.
- **Saving**: **~55 lines** across three files, and - the real point - **two fewer places for
  an operating rule to drift**. Audit 1's lesson applies: this saves few lines and removes a
  genuine second source of truth, which is the good kind of dedupe.
- **Risk & gate**: low, with one caveat: `CLAUDE.md` is the owner's file and edits to it were
  blocked once before by his own uncommitted work (refactor audit 1, phase 1b session 2). Do
  the three planning files autonomously; raise the `CLAUDE.md` half with him.
- **Confidence**: high on the duplication. Medium on the dev-login question - I did not read
  `_dev-login.mjs` closely enough to say which side is right, and a fix session must.
- **Notes**: `class-collection/spec.md` does **not** do this - it opens by pointing at
  `collection-rework/spec.md` and saying it *"does not repeat what is already true there"*.
  That is the model.

### docs-17 - `DESIGN-SYSTEM.md` carries three claims the code has since answered
- **Where**: `docs/spec/DESIGN-SYSTEM.md:360-369` (§4, glass and z-index in the future tense),
  `:373-375` (the type scale "matches `/preview/v2`"), `:416-418` (LoveButton "today it only
  works in the feed"). Checked-and-correct, listed for honesty: `:378` (no mono font),
  `:451-454` (the rail-card kit).
- **Phase**: hygiene     **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: five spot-checks against `src/app/globals.css` and `src/components/`:
  1. §7: *"**One shared `<LoveButton>`** ... used **everywhere** - Catch-ups, groups, the
     Collection, comments. **Today it only works in the feed; that is the exact modularity
     failure we are fixing.** Extract it once, reuse it."* It was extracted.
     `src/components/common/love-button.tsx` is imported by eleven files across letters, posts,
     comments, catchups (three), collection and the image viewer. The sentence now reads as an
     open defect on the canonical rulebook. It also still says "groups", which is gone.
  2. §4: *"**Frosted glass: yes** - implement a `.glass` utility"* and *"**Z-index:** define
     named tokens ... and migrate the scattered ad-hoc values onto them."* Both done:
     `globals.css:604` defines `.glass`; `globals.css:54-56` defines `--z-elevated: 10`,
     `--z-floating: 30`, `--z-overlay: 50`. Two instructions to build things that exist.
  3. §5: *"**Type scale** (documented ladder, matches `/preview/v2`)"* - `src/app/preview/` does
     not exist; the successor is `/lab/v2`, which `CLAUDE.md` names as the approved look.
  4. §5: *"No mono font (the dead `--font-mono` token is removed)"* - correct;
     `grep font-mono src/app/globals.css` is empty. **Not a finding.**
  5. §9: *"**Right rail:** a shared rail-card kit is still missing (currently one monolithic
     component) - a future reuse target"* - **still true**; nothing named `rail` exists in
     `src/components/common/`. Correct, leave it.
- **What to do**: rewrite §7's LoveButton bullet to state the rule (one shared LoveButton, used
  everywhere, `#E03A33` with `transition: none`) and drop the "today it only works in the feed"
  clause and the "groups" mention. Change §4's two bullets from instructions to descriptions,
  naming the tokens and the utility so a reader can find them. Repoint `/preview/v2` to
  `/lab/v2`. Leave the mono-font line and the rail-card line exactly as they are.
- **Saving**: 0 lines; ~10 rewritten. The unit is that the canonical rulebook stops listing
  finished work as outstanding - which matters more here than anywhere, because `CLAUDE.md`
  makes this the first file every UI session reads.
- **Risk & gate**: low. `npm run check` runs `scripts/qa/protocol-audit.mjs`, which reads code,
  not this file, so nothing breaks either way.
- **Confidence**: high; all five were greps.
- **Notes**: I read all 531 lines. This is a genuinely well-maintained document - 18 commits,
  last touched 2026-08-30, with dated reversals, owner quotes and measured dL* values
  throughout. The three items above are the only rot I found, which is a good result for a file
  this size and this old.

### docs-18 - `DELIGHT.md`'s build-spec half describes a route tree that no longer exists
- **Where**: `docs/content/DELIGHT.md:241-344` (the `/preview/delight` showcase build-spec, the
  "Build status (live, 2026-06-27)" block and the salvaged specs), plus 9 real dead paths
  throughout
- **Phase**: dead     **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `DELIGHT.md` is 551 lines / 48 KB and is cited from `docs/planning/bugs.md:16`
  as *"authoritative, with a verdict per item"* - so the owner-verdict half (lines 374-551) is
  live and must stay. Lines 241-344 are a different thing: a build spec for seven routes under
  `src/app/preview/delight/`, followed by *"**Build status (live, 2026-06-27).** All seven
  routes are BUILT and compiling ... Self-contained under `src/app/preview/delight/`"*. There
  is no `src/app/preview/` directory. The whole `/preview` tree became `/lab`; `profile.md:8`
  says so explicitly (*"the `/preview/` tree, which no longer exists"*). The block ends
  *"Next, once favourites are chosen: promote winners into real components ... lifting the kit
  into `src/lib/motion.ts` + `src/components/motion/`"* - a next step that was taken, to a
  different address (`src/components/common/motion.tsx`). Nine dead paths sit in this file:
  `src/lib/motion.ts` (x3), `src/components/motion` (x3), `src/app/preview/delight`,
  `docs/spec/delight.md`, `src/components/common/user-avatar.tsx`.
  (`docs/planning/DELIGHT_FIX.md` x2 is a deliberate git-history pointer and stays.)
- **What to do**: delete lines 241-344 - the showcase build-spec and the build-status block -
  and replace with two lines saying the delight lab became `/lab`, indexed in
  `src/app/lab/_registry.ts`, and the motion kit landed as
  `src/components/common/motion.tsx`. Keep the "Salvaged detailed specs" section (it already
  carries its own honest note that it predates the shipped avatar system) but repoint its
  paths. Keep everything from line 374 down untouched - that is the owner's verdict record and
  `bugs.md` points at it.
- **Saving**: **~103 lines / ~9 KB**, plus 6 dead paths (counted once, under docs-08).
- **Risk & gate**: low. `grep -rn "DELIGHT.md" docs/ CLAUDE.md` first - only `bugs.md:16` and
  `progress.md` cite it, both by file.
- **Confidence**: high.
- **Notes**: the header banner already says *"This is a catalog, not a status tracker"* - which
  is exactly right and is the argument for cutting the status block that follows it.

### docs-19 - `ROADMAP.md` ends with a path into a temp directory, and its Phase 7 is a feature that was removed
- **Where**: `docs/ROADMAP.md:134` (the last line), Phase 7 in §4, §2's component inventory,
  Phase 0's definition of done
- **Phase**: hygiene     **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the file's final line reads *"Full plan written to
  `/private/tmp/claude-501/-Users-sanan-Documents-rv-alumni/d5fa1925-.../scratchpad/BUILD_PLAN.md`."*
  - a temp path from a session in a differently-named repo, pointing at a file that cannot
  exist. It is the last thing a reader sees in the document `docs/README.md` calls *"the phased
  build plan; source of truth for decisions, shared components, data model, and the 13 phases."*

  The body is better than it looks: seven of its claims already carry inline **(Superseded:
  ...)** corrections written by later sessions, including the Catch-ups model family, dark
  mode, and the JWT-vs-database-sessions error. That habit is good and I would keep it. But
  three things escaped it: **Phase 7 is "Groups"** in full (rewrite `/groups/[id]`, group rail,
  `<GroupHeader>`/`<GroupCard>`), the shared-component inventory in §2 lists `Groups` in the
  sidebar order and `<RailGroupRow>` in the rail kit, and Phase 0's DoD says *"login + **admin
  bypass** verified, clean `prisma db push`"* - both of which the security work deleted and
  forbade respectively.
- **What to do**: delete the temp-path line. Add three more inline `(Superseded: ...)` notes in
  the file's existing style - one on Phase 7 saying Groups was removed as a user-facing feature
  and the `Group` model survives only as Catch-ups' hidden membership container, one on §2's
  sidebar order, one on Phase 0's DoD naming the admin-bypass deletion (audit C1-b) and the
  `db push` prohibition. Do **not** rewrite the document: it is a historical plan and the
  supersession-note habit is the right treatment for it.
- **Saving**: 1 dead path, ~12 lines added. Zero deleted, deliberately. The unit is that the
  roadmap stops telling a reader to build a removed feature.
- **Risk & gate**: none.
- **Confidence**: high.
- **Notes**: I considered proposing that `ROADMAP.md` move to `docs/history/` - all thirteen
  phases have shipped or been superseded, and nothing plans from it any more. I am not
  proposing it, because `CLAUDE.md` and `docs/README.md` both cite it as current and the
  decision log in §1 is still the only written record of several naming decisions. Making that
  call is the owner's; see Owner decisions.

### docs-20 - `mascot.md`, `FEATURES.md` and `demo.md` each carry a small, checkable staleness
- **Where**: `docs/spec/mascot.md:18` and `:205-209`; `docs/planning/FEATURES.md:67-72` and
  `:89-97`; `docs/spec/demo.md:24-26` and `:132-134`
- **Phase**: hygiene     **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: grouped because each is two lines, not because they share a cause.
  - `mascot.md:18` gives the lab room's path as `src/app/preview/delight/hoopoe/page.tsx` and
    then appends *"Now at `src/app/lab/hoopoe/page.tsx`"* - the correction is there, the wrong
    path is still first. `:205-209`, under "Open follow-ups", says *"Old
    `src/components/auth/hoopoe.tsx` and the placeholder
    `src/app/preview/delight/_hoopoe.tsx` can be removed once all usages are repointed"*. Both
    files are already gone. A follow-up list whose last item is already done teaches a reader to
    stop trusting the list.
  - `FEATURES.md:67-72` is a whole section: *"## 5. Groups - [have] Groups with membership and a
    group feed"* plus four idea bullets. Groups was removed. `:89-97` §9 says *"[have] Email +
    password (local), **admin bypass**, trivia gate"* - the admin bypass was deleted in the
    2026-08-20 security work and `security-regressions.test.mjs` pins it deleted forever, so
    this line describes a removed vulnerability as a feature the project has.
  - `demo.md:24-26`: *"The real database currently holds 37 people, 16 posts and one
    photograph"*; `OPERATIONS.md` §7 measured 63 members on 2026-08-25 and the Collection took
    1,719 photographs on 2026-09-02. `:132-134`: *"This repository owns exactly one photograph
    ... so the demo seeds six framings of it"* - true of the repo, and it reads as though it is
    true of the live archive.
- **What to do**: `mascot.md` - put the real path first and delete the last follow-up bullet.
  `FEATURES.md` - mark §5 superseded in the file's own `[x] SUPERSEDED` style (it already uses
  that notation at line 20) rather than deleting, since it is an idea backlog and someone may
  want the group ideas back; delete "admin bypass" from §9 and say so. `demo.md` - replace both
  counts with a sentence that cannot rot ("the real database holds real members and a real
  archive; the demo holds neither"), or date the numbers.
- **Saving**: ~15 lines. Small; grouped so the compiler can take them in one pass.
- **Risk & gate**: none.
- **Confidence**: high.
- **Notes**: `demo.md` is otherwise the best-written document in this territory and I would not
  touch anything else in it.

### docs-21 - `docs/` has three untracked `.DS_Store` files
- **Where**: `docs/.DS_Store`, `docs/audit-fix/.DS_Store`, `docs/planning/.DS_Store`
  (6,148 bytes each, 18 KB total); `.gitignore:10`
- **Phase**: dead     **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `find docs -name .DS_Store` returns three. `git ls-files docs | grep -i
  ds_store` returns nothing, and `.gitignore:10` is `.DS_Store`, so they are correctly ignored
  and none is in the repo. They are Finder residue in a folder the owner opens.
- **What to do**: remove the three files. That is the whole fix. They will come back the next
  time Finder opens the folder, so this is a tidy, not a mechanism.
- **Saving**: 18 KB on disk, 0 tracked bytes.
- **Risk & gate**: none.
- **Confidence**: high.
- **Notes**: reported because the owner said, in the brief, *"I very much appreciate a clean,
  well-maintained root directory, especially because that's the main part that I keep looking
  at"* - and these are one folder down from it. It is the smallest finding here and I have
  ranked it last on purpose.

## Owner decisions

**1. How much of a closed audit does the repo keep?** Right now the answer is inconsistent:
bug audit 1 kept a ten-line README and pushed everything into git history, bug audit 2 kept 275
KB, and refactor audit 1 kept 1,985 KB - which is 59% of all your documentation and 6% of the
whole repo. This audit's folder is already 3,336 KB and has not been committed yet. Three
audits in, the number is going up every time, and nothing has decided that it should. My
recommendation is a middle rule: keep each audit's report, its fix prompt and its agent
reports (the thinking, which cost real money and cannot be regenerated), and stop committing
`work/raw/` (the tool output, which every audit re-runs from scratch anyway - this one did).
Applied backwards that takes 723 KB out; applied forwards it stops ~956 KB going in. Either
way the decision wants writing into `docs/audit-fix/README.md` so the next audit inherits it.
(docs-01, docs-03)

**2. The Collection - the biggest surface in the app - has no spec in `docs/spec/`.** Its real
design lives in two planning documents (`collection-rework/spec.md`, 744 lines, and
`class-collection/spec.md`, 570 lines) plus a 1,587-line living handover, while the file
`CLAUDE.md` sends a session to, `docs/spec/media.md`, is a 337-line document whose own banner
marks five sections dead and which - as docs-02 shows - carries a wrong storage number in the
one section it blesses as current. That is why sessions keep getting the Collection wrong. The
fix is not more documentation: it is that when the rework campaign closes, its spec becomes
`docs/spec/collection.md`, `class-collection/spec.md` folds into it as a section, and
`media.md` is deleted with a one-line pointer. My recommendation is to do exactly that at
close-out. The cost is one session; the return is that the app's most-worked-on surface has one
spec at the address every other surface uses.

**3. Is `ROADMAP.md` still a plan, or is it history?** All thirteen phases have shipped or been
superseded; seven of its claims already carry inline "(Superseded:)" corrections written by
later sessions; Phase 7 specifies Groups, which you removed; Phase 0's definition of done
includes the admin bypass that the security work deleted. Nothing plans from it any more - the
work is planned from `bugs.md`, `FEATURES.md` and the campaign folders. But its section 1 is
still the only written record of several naming decisions ("Catch-ups" over "Roundups", "The
Valley Collection", the bird avatars), so it cannot simply go. My recommendation is to keep it
where it is, add three more supersession notes (docs-19), and leave the question of moving it
until those naming decisions have a home in `DESIGN-SYSTEM.md` §8, where most of them already
half live.

**4. The person-row sweep has been waiting for your go-ahead since 2026-08-19.**
`docs/spec/person-row-audit.md` is a 168-line audit that found the app draws a person ten
different ways across ten surfaces, proposes three shared wrappers, and stops: *"which leaves
steps 3 and 4 as the actual sweep, and they still need the owner's go-ahead."* Nothing has
happened in six weeks. It is a real inconsistency and the document is careful (it even records
one fix that was tried, reverted, and is now a permanent exception). But it touches the feed,
the directory, comments, messages, letters, the Collection, Catch-ups and the map in one pass -
most of what members look at - right before launch. My recommendation is to say no for now and
write that down in the document, so it stops reading as a pending decision; revisit after
launch. The alternative is to say yes and schedule it. What is not worth doing is leaving it in
a third state for another six weeks.

**5. The collection-rework campaign has eleven things built that you have not looked at.**
`collection-rework/handover.md`'s "Open questions for the owner" lists eleven items - the whole
Collection page, the whole viewer, the carousel, the crop handle, the approval queue's ticks,
the tagging pass's two judgement calls - each built, screenshotted, measured and unseen. The
handover says it plainly: *"if he is in the room, that is worth more than any new work."* This
is not a documentation problem and I am not proposing a documentation fix. It is the reason
that campaign cannot be archived yet, and it is the largest single block of finished-but-
unjudged work in the project.

## Not-findings

- **`docs/content/whatsapp-curation/` is live, not residue.** All three files are inputs:
  `scripts/dev/seed-curated-content.ts:68` reads `picks.json` at runtime, and the same script's
  comments cite `picks.md` (line 7) and `overflow.md` (line 213) by name. `docs/README.md:38-40`
  says so and warns that `picks.json` is data, not prose. Refactor audit 1 already dispositioned
  this (`work/agents/root-docs-assets.md:601-603`) and deleted the two genuinely dead artefacts
  (`overflow-stories.pdf`, `.html`) at that time. Leave all three alone.
- **`docs/TRAPS.md` is the highest-value document in this territory.** 306 lines, every entry a
  proved incident with a date and usually an owner quote. I found nothing stale in it. It is
  the file I would protect first.
- **`docs/spec/hand-run-passes.md`** (156 lines) is current, matches
  `scripts/dev/tag-photos-*.mjs` and `tag-professions-*.mjs`, and is enforced by
  `scripts/qa/hand-run-passes.test.mjs`. It is the worked example of the owner's "one protocol,
  enforced by a test" rule. Do not touch it.
- **`docs/spec/lab-voice.md`** (155 lines) is current and answers a specific owner complaint
  quoted at the top. `docs/spec/guide.md` (257 lines) is current, was written after the work
  shipped, and its one "dead" path (`src/components/tour`) is deliberate - it names what was
  deleted. Neither is bloat.
- **`docs/spec/demo.md`** (314 lines) is accurate about the three write layers, the reset
  transaction, the identity pinning and the invented people, and every mechanism it names
  exists. Only two counts in it have rotted (docs-20).
- **`docs/spec/apple-edge-light.md`** (206 lines) looked like a candidate - a measurement
  write-up for one lab room - and is not. Its harness is live (`scripts/dev/apple-edge/`, five
  files), its subject `/lab/glass-edges` exists, and it is the only record of four
  reconstructions that were wrong plus two traps (a transform rescaling an SVG filter; a fit
  scored against peaks rather than profiles). Deleting it would cost the next person those
  three rounds again.
- **The three dialog/menu *research* digests stay** (`dialog-hierarchy-research.md`,
  `dialog-standards-research.md`, `menus-focus-research.md`, 307 lines together).
  `DESIGN-SYSTEM.md:341` cites them by name - *"the research is in
  docs/planning/dialog-*-research.md"* - and they carry the primary-source citations and the
  debunked-claims register that the rulebook deliberately does not. Only the *findings* file,
  which nothing cites, is finished business (docs-13).
- **`docs/planning/leads-to-follow.md`** (110 lines) holds real people's names, roles and email
  addresses for the school's centenary, with a careful "read this first" about not scraping
  them. It is the owner's, it is not about code, and it should never be judged by a code audit.
- **`docs/planning/letterloop-research.md`** (376 lines) is finished business in the sense that
  Catch-ups shipped, but `catchups.md`'s footer cites it as *"Source research"* and
  `docs/README.md` files it as point-in-time reference material. I considered proposing it for
  archive and decided against: it is the only record of the parity target, and cutting it would
  make `letters.md` §0 (docs-06) the last copy, which is the wrong way round.
- **The relative markdown links in `docs/` are clean.** I resolved every `](...)` against disk:
  three hits, all false positives on `[id]` route syntax. Only prose path mentions have rotted
  (docs-08). Worth recording so nobody re-runs this check.
- **`docs/history/`'s archive rule is right; it is the *following* that lapsed.** Both files
  carry the same four-line banner, both were moved unedited, and their internal dead paths are
  correct for the month they describe. Do not "fix" a dead path inside `docs/history/`.
- **`AI-WRITING-TELLS.md`** (79 lines) is cited from `DESIGN-SYSTEM.md:28`, `lab-voice.md:76`
  and `guide.md:171`, and its "quiet as a reflex adjective" entry is quoted back in
  `DESIGN-SYSTEM.md` §1. Live and load-bearing.
- **`docs/planning/bugs.md`** (468 lines, 27 commits, last touched 2026-08-28) is the best-kept
  document in `docs/planning/`. Its "Settled, do not re-open" section is doing real work and
  its "Dated cleanups" idea is a good one - the only problem with it is that one entry's date
  arithmetic has been overtaken (docs-12), not the mechanism.
- **`docs/planning/class-collection/spec.md`** (570 lines) is a live spec: phases 1-4 shipped,
  phase 5 (the year rail, EXIF dates, notifications, the profile nudge) is open and §13 says so
  honestly. It is also the one campaign document that does *not* restate CLAUDE.md (docs-16).

## Audit-1 carry-overs in this territory

- **Owner decision 18, "does CLAUDE.md stay self-contained?"** - still open, and the shape of
  the problem has changed since audit 1. The duplication I found is not `CLAUDE.md` vs
  `docs/`; it is three planning documents each holding their own copy of `CLAUDE.md`'s rules,
  one of which now openly contradicts it (docs-16). My read: `CLAUDE.md` should stay
  self-contained, and the *planning* copies should go.
- **"Relocating the imported skill packs out of `.claude/`"** - not in my territory; I saw no
  docs-side consequence either way.
- **"Moving `sanan's stuff`"** - still present as a path; `docs/spec/apple-edge-light.md:7`
  cites `sanan's stuff/Inspiration/` as the ground truth for its measurements, so moving that
  folder would break one documented reference. Worth knowing before the move, not a reason
  against it.
- **The `docs/audit-fix/` reorganisation shipped** (audit 1 phase 1b) and the convention in
  `docs/audit-fix/README.md` is being followed *structurally* - dated folders, report and fix
  prompt at the top, evidence under `work/`. What was never decided is how much `work/` may
  weigh, which is docs-01 and docs-03.
- **"The visual suite's live-data drift"** is recorded in `bugs.md` as still owed to the owner
  (*"8 of 23 shots red on data, not code"*). Since then `/collection` and
  `/collection?scope=class` were both masked, so the drift has been *handled* rather than
  decided - and `OPERATIONS.md` has not caught up (docs-10) while
  `collection-scrubber/handover.md` still tells sessions the opposite (docs-14).
- **The landing showcase family** (still switched off, knip lists five files) is not in my
  territory, but `SECURITY.md` records a docs-side consequence: *"The landing footer links
  exist but sit behind `SHOW_SHOWCASE=false`; owner declined a hero link."* Whatever is decided
  about the showcase, that sentence and the legal-layer paragraph it sits in move together.

## For other lenses

- `prisma/schema.prisma:269-270` - the `Photo` model's column comments say
  `thumbUrl // 480px - grid` and `url // 1600px - detail view, reusable as a post/cover image`.
  The `url` comment is wrong for the same reason `docs/spec/media.md` §4.2 is wrong (docs-02):
  the stored copy is full resolution at `COLLECTION_WEBP_QUALITY = 100`. **data-layer** should
  fix the comment in the same campaign as docs-02, or the doc and the schema will disagree
  again in a month.
- `src/lib/upload-shared.ts:91` - `COLLECTION_WEBP_QUALITY = 100`. The owner's own project
  memory records it as q90. Not a doc I can edit; **the compiler should flag it to him**,
  because "q90" is now the fourth different number written down for one constant.
- `progress.md` - 8,545 lines / 586 KB, and its final entry (`## 2026-09-03`, line 8515) sits
  at the bottom of a file that is newest-first everywhere else. **root-assets** owns the file's
  weight; I own the archive rule it is breaking (docs-04). Whoever fixes it should do the
  reorder and the August archive in one commit.
- `docs/audit-fix/2026-09-03-refactor-audit-2/work/raw/` - `build-nolab.txt` and
  `build-nolab-run3.txt` are byte-identical (2,915 bytes each). Trivial, but it is this
  audit's own folder and **the orchestrator** can drop one before committing.
- `src/app/lab/crop/` - `collection-rework/handover.md` says twice that `/lab/crop` is kept
  only until the owner has looked at phase 3 in it, and that retiring it *moves*
  `public/lab/crop/` rather than deleting it, because `/lab/collection` shares those specimens.
  **The lab lens** should have that context before proposing anything about the room.
- `scripts/dev/sweep-stranded-originals.mjs` - `collection-rework/handover.md`'s close-out says
  this must be run once more after the next deploy and only then deleted, together with its
  `scripts/README.md` line. The file still exists. **scripts-e2e-ci** should not call it dead;
  it is a one-shot with a pending trigger.
- `window.confirm` survives at 3 non-lab call sites, against
  `src/components/common/confirm-dialog.tsx`, whose header argues *"that is the browser's
  chrome, not the app's"*. Down from 8 (docs-13), so somebody has been working through them.
  **shell-primitives** or **duplication** may want the last three.
- `docs/planning/collection-rework/handover.md:165` says the tagging picker exports into a
  gitignored `.tagging/`; the real folder is `scripts/dev/.tagging/`, and
  `.gitignore:112-114` records that the root version was deliberately moved. One word, but the
  root-is-closed rule is exactly what the move enforced. **scripts-e2e-ci** may see the same
  drift in `scripts/README.md`.
- `docs/spec/catchups.md` §6.4 still prints the optional SQL that drops six orphan Catch-up
  tables. Refactor audit 1 dropped four tables from production and demo. **data-layer** should
  say whether `CatchupAnswer`, `CatchupAnswerLove`, `CatchupIssue`, `CatchupQuestion`,
  `Catchup` and `CatchupPref` are all gone from the live database, so docs-07 can replace §6.4
  with one accurate line rather than a guess.

## Metrics

- **Lines read in full**: ~14,600 across 47 files. Territory total 40,581 lines / 129 tracked
  files / 3,347 KB.
- **Tracked bytes by area**: `audit-fix/2026-08-25-refactor-audit-1` 1,985 KB (59%) ·
  `spec/` 384 KB (11%) · `planning/` 359 KB (11%) · `audit-fix/2026-08-22-bug-audit-2` 275 KB ·
  `content/` 134 KB · `history/` 76 KB · `audit-fix/prompts/` 54 KB · the five top-level docs
  79 KB · the two audit READMEs 2.5 KB.
- **Files over 1,000 lines** (the charter asks for these by name, with what each is for):
  `audit-fix/2026-08-25-refactor-audit-1/fix-prompt.md` 1,636 - the closed campaign's living
  handover, and per its own README the record; keep ·
  `planning/collection-rework/handover.md` 1,587 - a live handover for a campaign with two
  close-out items and eleven unseen owner questions; keep for now, archive at close-out ·
  `audit-fix/2026-08-25-refactor-audit-1/work/findings-index.json` 3,134 - a machine index for
  a compiler that has finished; the first thing docs-01 Option B drops ·
  `work/raw/route-bundle-stats.json` 2,724 and `work/raw/cloc-by-file.csv` 781 - regenerable
  tool output. **Outside the audit archives, exactly one document exceeds 1,000 lines.**
- **Largest live prose files**: `spec/catchups.md` 895 · `planning/collection-rework/spec.md`
  744 · `history/progress-2026-06.md` 650 · `spec/admin.md` 622 ·
  `planning/class-collection/spec.md` 570 · `content/DELIGHT.md` 551 ·
  `spec/DESIGN-SYSTEM.md` 531 · `spec/avatars.md` 482 · `spec/profile.md` 472 ·
  `planning/bugs.md` 468 · `spec/letters.md` 430.
- **Dead path mentions**: 94 total, ~54 real, ~40 deliberate git-history pointers. Worst single
  cause: the `/preview/` -> `/lab` rename (7 mentions across 5 files).
- **Dead relative markdown links**: 0 (3 false positives on `[id]`).
- **Docs last touched before 2026-08-13** (more than three weeks stale):
  `spec/letters.md` (2026-08-08), `content/AI-WRITING-TELLS.md` (2026-08-08),
  `content/whatsapp-curation/picks.md` (2026-08-08), `overflow.md` (2026-07-18),
  `planning/letterloop-research.md` (2026-07-05). Only the first is a finding; the rest are
  correct-and-finished.
- **Honest totals if every autonomous finding is executed**: **~900 lines of dead prose
  deleted** (letters 315, catchups 120, media 119, DELIGHT 103, dialog-findings 182, scrubber
  handover 249 - overlapping and partial ranges netted down), **3 files removed**, **~54 dead
  paths corrected**, **132 lines of shipped route code freed eleven months early**, **~540 KB
  relocated** out of `progress.md`, **18 KB of `.DS_Store` swept**. Owner decisions on top of
  that: **723-1,823 KB of tracked audit archive removed** and **~956 KB not added**.
