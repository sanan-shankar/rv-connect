# docs-report-a — adversarial verification (docs-01 … docs-11)

Verifier: `docs-report-a`. Date: 2026-09-04. HEAD at verification: `74cc61a`
("fix(retention): notifications are kept 30 days, everywhere").
Parent report: `work/agents/docs.md`. Method: read-only; every claim re-derived from the
tree at HEAD with `grep`/`sed`/`stat`/`git ls-files`. No builds, no browser, no database.

Working tree state seen (someone else's WIP, audited around):
`docs/audit-fix/README.md` and `progress.md` are both **modified**; the audit-2 folder is
untracked. `docs/SECURITY.md` — which the parent report saw dirty — has since been
COMMITTED as `74cc61a`, so the 30-day notification retention is now HEAD, not WIP.

Headline: **0 refuted outright; 8 of 11 need a correction.** The two corrections that
matter are (a) docs-02's "never existed" is too strong — the 1600px/q80 row IS a live code
path, just the fallback one, and (b) docs-01's "nothing reads `work/`" is wrong: the two
files it proposes to keep cite `work/` thirteen times between them.

---

## docs-01 — archive refactor audit 1's `work/` — CONFIRMED WITH CORRECTION

Re-measured:

```
git ls-files -z docs/audit-fix/2026-08-25-refactor-audit-1/work | xargs -0 stat -f %z
  → 1,866,717 bytes across 72 files          (finding said 1,867,024 — off by 307 B)
docs/ tracked        → 3,429,475 B = 3,349.1 KB, 129 files   (finding: 3,347 KB ✓)
repo tracked         → 32,972 KB                              (finding: 32,965 ✓)
work/agents   798.1 KB / 18 files   ✓
work/raw      446.9 KB / 34 files   ✓
work/verify   173.8 KB / 13 files   ✓
findings-index.json  282,984 B = 276.4 KB ✓
workflow-find.js      60,654 B =  59.2 KB ✓
refactor-audit-1 whole folder → 1,984.7 KB / 74 files  (finding: 1,985 ✓)
bug-audit-1 → 0.62 KB / 1 file ✓   bug-audit-2 → 275.5 KB / 9 files ✓
```

54.5 % of `docs/` ✓. **5.5 %** of the tracked repo, not 5.7 % (trivial).
Option A (1,823 KB / 72 files) and Option B (447+276 = 723 KB / 35 files) both check out.
Bug audit 1's README precedent reads exactly as quoted.

**Correction the fixer must not miss.** The finding says a grep for `refactor-audit-1/work`
outside the folder "returns only `fix-prompt.md`'s own line". It does not. Both files that
Option A/B propose to KEEP cite `work/` repeatedly:

- `report.md:11` (`work/agents/<prefix>.md`), `:15` and `:318` (`work/verify/`), `:293`,
  `:500` ("raw output in `work/raw/`"), `:510`.
- `fix-prompt.md:23-24`, `:149`, `:724` ("read `work/verify/v-member-admin.md` first"),
  `:999` and `:1155` (`work/raw/route-js.mjs`, the script behind the close-out's measured
  bundle figures), `:1509` (`work/verify/v-pinned-safety.md` §3).

So removing `work/` manufactures ~13 new dead path mentions inside the record that is kept
— the exact rot docs-08 is about. Whichever option the owner picks, the same commit must
rewrite those citations to the `git show <sha>:<path>` form bug audit 1's README uses.
Note also that `fix-prompt.md:999/1155` treats `work/raw/route-js.mjs` as a re-runnable
tool, which is an argument for Option B keeping `raw/` scripts even if it drops the dumps.

Verdict: **confirmed-with-correction**.

---

## docs-02 — media.md §4.2/§4.4 vs the real pipeline — CONFIRMED WITH CORRECTION (the important one)

Doc, at HEAD:
- Banner blessing at `docs/spec/media.md:31-33`: *"What is still true here: §1 (the name),
  §4.1–4.2 and §4.4 (variants and the storage budget) …"* ✓ verbatim.
- §4.2 table at `:124-126`: `thumbUrl` 480px q72 · `url` 1600px q80 · `originalUrl` up to
  3000px q82 ✓. §4.4 budget at `:141` ("thumb ~35KB + display ~250KB + original ~600KB ≈
  under 1MB … 5,000 accepted photos ≈ under 5GB") ✓.

Code, at HEAD:
- `src/lib/upload-shared.ts:91` `export const COLLECTION_WEBP_QUALITY = 100;` ✓, with a
  30-line docblock (`:69-90`) recording the owner's 2026-09-02 measurement (q90 = 38 % of
  source bytes, q95 66 %, q100 93 %) and stating "IT IS NOT A RESOLUTION … Nothing here
  downsizes".
- Direct path `contributePhotoDirect`, `src/app/(main)/collection/actions.ts:594-603`:
  `storedResizeBox(await sharpImage(original).rotate().metadata())` → `.resize(box…)
  .webp({ quality: COLLECTION_WEBP_QUALITY })`. `storedResizeBox` (`src/lib/image.ts:123-137`)
  applies `MAX_STORED_PIXELS = 40_000_000` (`:71`) and `WEBP_MAX_DIM = 16383` (`:100`).
- `prisma/schema.prisma:269-270`: only `thumbUrl` and `url`. **No `originalUrl` column
  anywhere.** Line 270 reads `url String // 1600px — detail view, reusable as a post/cover
  image` — the stale schema comment the finding flags for the data lens ✓.
- `docs/TRAPS.md:163-186` reads exactly as quoted, including the owner's line.

**Three corrections.**

1. **The thumb row is RIGHT, not wrong.** `gridThumb` (`src/lib/collection-photo.ts:206-215`)
   is `THUMB_PX = 480` (`:26`) at `.webp({ quality: 72 })`. media.md's 480px/q72 row is
   accurate today and should be kept as-is, not "verified then rewritten".
2. **"a pipeline that has never existed" is too strong for the `url` row.** The proxied
   fallback `contributePhoto` (`src/app/(main)/collection/actions.ts:339-342`) does, at
   HEAD: `.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
   .webp({ quality: 80 })` — literally media.md's 1600px/q80. It is reached from
   `src/components/collection/contribute-room.tsx:628-644` whenever a staged R2 key is
   absent (its own comment: *"Vercel refuses a body over about 4.5MB before the action
   runs … which is why it is the fallback and not the path"*). So the Collection has **two
   encode paths that disagree**: direct = full resolution at q100, fallback = 1600px at
   q80. The fix must say that, not "full resolution, unconditional" — and TRAPS.md's flat
   "The Collection does NOT downscale" is itself true only of the direct path. The finding
   anticipated this in its own confidence line; I am promoting it from a caveat to the
   correction, because a fix session that writes "full resolution" as unconditional will
   have introduced the fourth wrong version of this fact.
3. **`originalUrl` and §4.4 are fully dead** ✓ — delete the row, rewrite the budget.

**One extra stale number the finding missed**, in code, same subject:
`src/app/(main)/collection/actions.ts:616` says *"It is a second lossy pass (q90 then q72)"*
— q90 is no longer the setting. That is a fourth place the wrong number lives (the finding
already names the owner's memory file as a third). Cross-lens: collection.

Verdict: **confirmed-with-correction**. Still the highest-value item in this cluster.

---

## docs-03 — what an audit's `work/` may weigh — CONFIRMED WITH CORRECTION

- `du -sk docs/audit-fix/2026-09-03-refactor-audit-2` → **4,332 KB today** (the finding
  measured 3,336 KB mid-run; it has grown by the verify pass, exactly as predicted).
  `work/raw` → 956 KB ✓, 65 entries.
- Trajectory verified: bug audit 1 0.62 KB, bug audit 2 275.5 KB, refactor audit 1
  1,984.7 KB ✓. Closed audits are **67.5 %** of tracked `docs/` today; committing audit 2
  as it now stands makes `docs/` ≈ 7,681 KB and audits ≈ **85 %** of it (the finding said
  ~72 %, computed off the smaller mid-run figure).
- File sizes ✓: `test-timings.tap` 217,064 B, `route-bundle-stats.json` 121,966 B,
  `route-bundle-stats-nolab.json` 76,356 B; four `tsc-diag-*` dumps ✓.

**Two sub-claims refuted** (both in the "cheap half" advice, neither load-bearing):
- `build-nolab.txt` and `build-nolab-run3.txt` are the same SIZE (2,915 B each) but are
  **not byte-identical**: `diff` shows four differing lines (config-load 1128ms vs 305ms,
  pid, compile 13.7s vs 13.6s, TypeScript 9.1s vs 10.2s). They are two real runs, and the
  second is the evidence that the first was not a fluke. Do not delete one as a duplicate.
- There is **one** `cloc-by-file.csv`, not two; `raw/` holds eight distinct `cloc-*` cuts
  (summary, by-file, lab, docs, lib, components, src-app-no-lab, scripts-e2e-prisma).

Verdict: **confirmed-with-correction**.

---

## docs-04 — August never archived out of progress.md — CONFIRMED WITH CORRECTION

- `docs/README.md:12-13` and `:35-36` carry the rule verbatim ✓; both `docs/history/`
  banners repeat it ✓.
- `awk '/^## 2026-08-/'` → **162** August entries ✓. September → **20** (was 18).
- `wc` → **8,604 lines / 604,390 B (590 KB)**; the finding measured 8,545 / 586 KB. August
  still spans **637–8514** ✓ (`## 2026-08-31` first at 637, last August heading at 8450).

**Correction to the "one trap".** There are now **three** entries below the August block,
not one: `8515 ## 2026-09-03 — the viewer stops letting go of the page`,
`8547 ## 2026-09-04 — thirty days, said in one place`, and
`8569 ## 2026-09-04 — the second refactor audit …`. All three must be lifted to the top
with the other September entries; the bottom-appending habit is ongoing, not a one-off.

**The finding's own gate now fires**: `git status --short progress.md` → ` M`. The file is
dirty with another session's work at this moment, so the move is blocked until that lands.

Verdict: **confirmed-with-correction**.

---

## docs-05 — docs/README.md has drifted — CONFIRMED

- Promise at `:3-5` verbatim ✓ ("A map that lists folders which do not exist is worse than
  no map").
- Spec bullet is `docs/README.md:22-27` (finding said 22-25): says *"Exactly:"* twelve
  names. `ls docs/spec` → **15**: those twelve + `DESIGN-SYSTEM.md` (listed separately,
  fine) + **`guide.md`** + **`hand-run-passes.md`**, both absent from the list, and
  `hand-run-passes.md` is bolded read-before-working in CLAUDE.md ✓.
- Planning bullet `:28-30` names 4 files; disk holds **15** (8 files + 3 campaign folders:
  `collection-rework/` 4, `collection-scrubber/` 2, `class-collection/` 1) ✓.
- `git log -1 -- docs/README.md` → **2026-08-26** `5be3952` ✓, the very day it claims to
  have been verified.

Verdict: **confirmed** (line range 22-27, not 22-25).

---

## docs-06 — letters.md is ~73 % superseded — CONFIRMED

- File is 430 lines ✓. Section offsets all check out: §0 15-48, §1 49-80, §2 81-135,
  §3 136-233, §4 224-233, §5.2 257-364, §5.3 365-381, §7 402, §8 411, grounding 420-428 ✓.
- Banner at `:3` ✓ verbatim, and its successor model names are wrong: it says
  `CatchupIssue`/`CatchupQuestion`/`CatchupAnswer`/`CatchupAnswerLove`/`CatchupPref`.
  `prisma/schema.prisma` has `Catchup` (944), `CatchupEdition` (976), `CatchupPrompt`
  (1002), `CatchupEntry` (1026), `CatchupEntryLove` (1048), `CatchupPref` (1060), and
  `docs/spec/catchups.md:454` states *"`CatchupEdition` (not `CatchupIssue`) and
  `CatchupPrompt` (not `CatchupQuestion`) are genuinely fresh names for genuinely absent
  tables."* Precision: **four of the six names in the banner are wrong**; `Catchup` and
  `CatchupPref` do exist (as Prisma models — see docs-07 on their `@@map`).
- `:363` — *"the `datasource` provider in the current schema is hardcoded `sqlite`"* ✓
  (schema is `postgresql`). Render Cron at `:199` and `:416` ✓.
- Grounding list `:420-428` names `src/components/groups/group-feed.tsx`,
  `src/app/(main)/groups/[id]/page.tsx`, `src/app/preview/v2/page.tsx` — all three absent
  ✓; the other four paths in that list all still exist, so the cut is exactly three.
- `docs/planning/letterloop-research.md` is 376 lines ✓.

Verdict: **confirmed**.

---

## docs-07 — catchups.md still specifies Groups — CONFIRMED WITH CORRECTION

Confirmed as written:
- §3.1 (`:171-192`) empty state CTAs *"Find a group" → `/groups`* and *"Create a group" →
  `/groups/new`* ✓; `ls src/app/(main)` has no `groups` ✓.
- §3.2 (`:195-223`) group picker and `?group=` ✓, against
  `src/app/(main)/catchups/new/page.tsx:14-35` whose own header comment says *"Groups are
  now being retired as a user-facing feature (owner, 2026-07-25)"* and *"`?group=<id>` …
  is gone (2026-08-21, owner's call)"* ✓.
- §7 (`:794-812`) grants Keeper powers to *"any group admin (`GroupMember.role = 'admin'`)"* ✓.
- §9 (`:836-895`) is a seven-work-package build plan for shipped work ✓.

Corrections:
1. §5's notification table (`:429-437`) has **seven** rows interpolating `{group}`, not six
   (the finding's "all six" misses `catchup_love`).
2. The join routes DO exist, but not where the finding implies: they are
   `src/app/catchups/join/page.tsx` and `src/app/catchups/join/[token]/page.tsx` —
   **outside** the `(main)` group, deliberately public and allow-listed in
   `src/proxy.ts:35, 212-215, 291` so a shared invite link opens signed-out. Any new §3.8
   must say that, or a reader will look under `(main)` and conclude it is missing.
3. **§6.4 attribution is wrong.** Refactor audit 1 did not drop the six orphan tables: its
   −4 models were the NextAuth adapter trio plus `GroupInvite`
   (`docs/audit-fix/2026-08-25-refactor-audit-1/report.md:70, 154`), and the same report
   `:284` lists *"Verify/DROP the six orphan reverted-Catchup tables (spec 6.4)"* as an
   unresolved **owner-A** row. What the tree actually says:
   `prisma/migrations-manual/2026-08-03-demo-purge-and-drift.sql:5-10` — *"the six legacy
   Catch-ups tables … were already gone when this ran; information_schema showed only the
   six live ones"* — while `prisma/schema.prisma:940-942` still says they are *"left
   untouched (contain leftover rows from the reverted build)"*. The two disagree; settling
   which is true needs a live query (`SELECT tablename FROM pg_tables WHERE tablename LIKE
   'Catchup%';`), so the §6.4 rewrite is **unverifiable-needs-db** as to the fact, though
   the finding's action (cut §6.4 to one line) is right either way.
   Safety note for the fixer: the live models `@@map` to different physical names —
   `Catchup → "CatchupSeries"` (`schema.prisma:973`) and
   `CatchupPref → "CatchupReminderPref"` (`:1082`) — so §6.4's `DROP TABLE "Catchup"` /
   `"CatchupPref"` would NOT hit live data. Say so in the rewrite; the name collision is
   the thing a reader will get wrong.

Verdict: **confirmed-with-correction** (the §6.4 sub-claim: unverifiable-needs-db).

---

## docs-08 — dead path mentions across docs — CONFIRMED WITH CORRECTION

I re-ran an independent extraction (my own regex over every `.md`/`.txt` under `docs/`,
excluding all audit folders, `stat`-ing each token). I get **65 distinct missing paths
across 21 files**, against the finding's 94 across 14 + history. The gap is regex
tolerance, not disagreement: the ranking is the same.

My per-file counts: `history/progress-2026-06.md` 16 (frozen, deliberate),
`spec/avatars.md` 8 (finding 9), `history/progress-2026-07.md` 7 (deliberate),
`spec/media.md` 6 (5), `planning/collection-rework/handover.md` 6 (3),
`content/DELIGHT.md` 6 (9 of 12), `spec/directory.md` 5 (4), `spec/profile.md` 5 (4),
`SECURITY.md` 3, `spec/catchups.md` 3, `spec/admin.md` 3 (2), `spec/letters.md` 3 (1),
`spec/mascot.md` 3 (4), `spec/guide.md` 2 (1), `spec/DESIGN-SYSTEM.md` 2,
`planning/bugs.md` 2 ✓, `OPERATIONS.md` 1, `ROADMAP.md` 1, `planning/FEATURES.md` 1,
`collection-scrubber/handover.md` 1 ✓, `collection-rework/spec.md` 1 ✓.

Top ghosts by mention count (mine): `src/components/common/user-avatar.tsx` **12**,
`src/app/preview/v2/page.tsx` **9**, `src/components/auth/hoopoe.tsx` 4,
`src/lib/motion.ts` 4, `src/components/layout/navbar.tsx` 3,
`src/components/settings/settings-form.tsx` 3, `src/components/motion/` 3,
`src/app/(main)/groups/[id]/page.tsx` 2, `src/lib/avatar.test.ts` 2,
`src/components/groups/group-feed.tsx` 2, `src/lib/collection-facets.ts` 2,
`src/app/lab/crop/_policies.ts` 2. The deliberate "lives in git history" pointers show up
too (`docs/STACK_MIGRATION.md` 3, `planning/PUNCHLIST.md` 3, `planning/AUDIT.md` 3,
`planning/FEEDBACK_CHECKLIST.md` 3, `SECURITY-AUDIT.md` 2, `catchups-fixes-brief.md` 2) —
so the finding's ~40-deliberate split is the right shape.

Successor map spot-checked at HEAD: `src/components/common/bird-avatar-v2.tsx` ✓,
`src/components/common/motion.tsx` ✓, `src/components/mascot/` ✓, `src/lib/collection.ts` ✓,
`src/components/collection/year-rail.tsx` ✓, `src/app/lab/` ✓, `src/lib/avatar.test.mjs` ✓;
`src/components/collection/decade-rail.tsx` and `src/components/tour/` absent ✓.

Correction: treat **94 / 54 / 40 as approximate**. The count is a function of the regex and
of a judgement call per sentence; the fix session should re-derive with its own extraction
and classify by reading, exactly as the finding already advises. The finding's substance —
a real, mechanical, one-commit-per-file sweep, `/preview/` → `/lab` being the single
largest cause — holds.

Verdict: **confirmed-with-correction**.

---

## docs-09 — media.md's tombstoned sections — CONFIRMED WITH CORRECTION

- §2 `:75-88` under *"DEAD, 2026-08-28"* still argues *"The taxonomy has no 'people' or
  'reunion' category … There is nowhere to file a selfie"* ✓ — flatly contradicted by
  `src/lib/collection.ts:40-43`, where `BUCKETS` **leads with `label: "People"`** ✓.
- §3's route table `:97-102` still lists `/collection/contribute` and calls
  `/collection/[id]` a detail page ✓; the same paragraph `:91` names the deleted
  `src/components/layout/navbar.tsx` and `preview/v2/page.tsx`.
- §5 `:145-165`, §6 `:166-178` tombstoned and printed ✓. §10 `:294-308` plans 40-60
  founding photographs ✓. §11 `:310-317` specifies the masonry entrance and the "A wander"
  cross-fade that the banner itself calls dead ✓.
- §12 `:319-327` — **four of five answered, not five.** Q1 `originalUrl` → no such column ✓;
  Q2 Blob vs R2 → the doc marks it resolved itself ✓; Q4 `photoTrusted` → exists ✓;
  Q5 dark mode → shipped ✓. **Q3 (user-facing photo reports and "the `Report.photoId`
  change") is still unbuilt**: the only `photoId` in the schema is on `PhotoLove`
  (`prisma/schema.prisma:398-408`), `Report` has none. The recommendation ("defer to v2")
  was followed, so it can be closed as settled — but say that, don't say it was answered.
- Grounding list: it runs **`:329-338`**, not `:330-337`, and its dead paths are
  `src/app/preview/v2/page.tsx` (`:337`), plus `src/components/common/user-avatar.tsx` and
  `src/components/layout/navbar.tsx` (both on `:338`), plus
  `src/components/admin/report-management.tsx` (`:335`) — which the finding missed.
  `public/uploads/YYYY/MM/` is at **`:114`** in §4.1 (and is a dev-only runtime directory,
  so it is arguably not rot at all).
- Note `wc -l` reports 337 because the final line has no trailing newline; the file has 338
  lines. Any line-range edit must account for that.

Verdict: **confirmed-with-correction**.

---

## docs-10 — five counted facts in OPERATIONS/SECURITY — CONFIRMED WITH CORRECTION

Every fact verified; every line citation in the finding is wrong. Real locations:

| Claim | Real line | Truth at HEAD |
|---|---|---|
| "11 routes x 2 viewports" | `docs/OPERATIONS.md:15` | `ROUTES` in `e2e/visual.spec.ts:28-68` holds **12** |
| "~80 seconds" | `docs/OPERATIONS.md:16` | CLAUDE.md:238 says 50s; `collection-scrubber/handover.md:29` says ~70s |
| "Four routes photograph a live database" | `docs/OPERATIONS.md:38` | **six** carry `live:` — feed, directory, letters, catchups, collection, collection-class |
| "`/collection` is deliberately not in that list" | `docs/OPERATIONS.md:54` | masked `live: "band"` since 2026-08-29, and `?scope=class` since **2026-09-02**, with a 12-line comment in the spec explaining the 1,719-photograph import |
| "the unit gate discovers its 74 test files" | `docs/OPERATIONS.md:328` | `find src scripts e2e -name '*.test.mjs' \| wc -l` → **102** |
| "all 25+ unit test files" | `docs/SECURITY.md:128` | same 102 |

The spec's own comment on the class route is worth carrying into OPERATIONS verbatim, as
the finding says: *"the empty state, which is what every class sees on its first day, is no
longer compared … the honest answer is that it is uncovered."*

Verdict: **confirmed-with-correction** (facts right, citations off).

---

## docs-11 — admin.md says "Nothing here is built yet" — CONFIRMED WITH CORRECTION

- `docs/spec/admin.md:5` ends *"Nothing here is built yet."* ✓
- `:80` *"## 2. The shape: nine sections, three groups"*; `:82` *"Two of them (People and
  Messages) carry a detail route as well, so eleven routes in all."* ✓
- Disk: `ls src/app/(main)/admin` → **11 section directories** ((index), analytics, audit,
  catchups, content, mail, messages, people, reports, review, support) ✓ — `audit` and
  `review` are in neither §2's diagram nor its count.
- **Route count correction: 14 page routes, not 13.** `find … -name page.tsx` returns
  fourteen; besides `people/[id]` and `messages/[id]`, **`catchups/[catchupId]/page.tsx`**
  is a third detail route, so §2's "two of them carry a detail route" is wrong as well as
  its number.
- §9 spans `:350-569` with **ten** subsections: 9.1 (`:352`) … 9.5 (`:435`), **9.5b Review**
  (`:449`), 9.6 (`:508`) … 9.9 (`:545`) ✓. No section anywhere for `/admin/audit` ✓.
  Analytics carries "(stub, see 9.9)" in the §2 diagram ✓ while `/admin/analytics` ships.
- Dead paths ✓ at `:223` (`src/components/admin/user-management.tsx:86`) and `:366`
  (`src/components/tour/tour-steps.ts`) — **plus a third** at `:603`, which names
  `user-management.tsx` again in a cleanup list.
- Minor: `SECURITY.md` names `/admin/audit` **twice** (`:77`, `:106`), not three times. The
  argument (the panel is where "is the sweep running" is answered) survives intact.

Verdict: **confirmed-with-correction**.

---

## Cross-finding notes for the compiler

- **docs-02 + docs-09 must ship as one commit** (the finding already says so) and the
  rewrite must state BOTH encode paths. If only the direct path is written down, media.md
  becomes wrong in a new direction and TRAPS.md's absolute "does NOT downscale" keeps a
  known exception undocumented.
- **docs-01 + docs-03 are one owner conversation** ✓, and docs-01 has a hidden
  prerequisite (rewriting `report.md`/`fix-prompt.md`'s 13 `work/` citations) that must be
  priced into the option the owner picks.
- **docs-05 → docs-13/docs-14** (outside my cluster) as the finding says; nothing I saw
  contradicts that ordering.
- Overlap: docs-08 and docs-09 both count media.md's dead paths; docs-08 says 5, my own
  extraction says 6 for that file, and docs-09 attributes 4 to the grounding list. Count
  once, at fix time, from a fresh extraction — do not add the two findings' numbers.
- Cross-lens (collection/data): `prisma/schema.prisma:270` `// 1600px — detail view` and
  `src/app/(main)/collection/actions.ts:616` `"(q90 then q72)"` are both stale against
  `COLLECTION_WEBP_QUALITY = 100`.
