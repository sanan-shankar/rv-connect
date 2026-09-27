# tracked-weight - refactor audit 3 report

Cross-cutting lens L08: every megabyte the repository tracks, where it came from, and what should
not be there, should be smaller, or should live elsewhere. The frame is the owner's own sentence:
*"Simplification is not just in code but also bloat, and effectively storage space of this
folder."* So this report attributes both the 44.90 MB git tracks (1,632 files at HEAD `70570bcd`)
and the 7.5 GB the folder occupies on disk, and it attributes the +12.71 MB gained since audit 2's
tree (`72b5a1d`, 2026-09-03) file by file. Date: 2026-09-24. Files in territory: all 1,632 tracked
files were weighed; 488 were measured individually (the 24 baselines with `sips`, all 158 `public/`
files with a reference grep each, the 139 `docs/audit-fix` files by folder, the 44 `docs/planning`
files by size, the 104 `.claude` files by directory, the 15 root files); 22 text files were read in
full (listed under Coverage). Nothing was written except this file. Nothing was run except `git`
read-only commands, `du`, `find`, `stat`, `sips`, `file`, `grep`, `awk`, `wc`.

## Coverage

- **Read fully**: `work/brief-common.md`, `work/charters/_header.md`, `work/charters/tracked-weight.md`,
  `CLAUDE.md`, `AGENTS.md`, audit 2's `work/agents/root-assets.md` (1,050 lines, every finding),
  `.gitignore` (119 lines, line by line), `e2e/visual.spec.ts` (the `ROUTES` table, `settle`, the
  screenshot call, lines 28-70 and 240-330), `e2e/playwright.config.ts:30-95`, `docs/README.md`,
  `docs/audit-fix/README.md`, `src/lib/catchup-pictures.ts` (1-60, 140-230),
  `src/lib/catchup-pictures.test.mjs:40-110`, `src/components/catchups/home/picture-picker-dialog.tsx:205-275`,
  `src/components/catchups/index/picture-door.tsx:55-82`, `src/components/landing/hero-photo.ts`,
  `src/components/landing/shots.ts`, `src/components/layout/app-shell.tsx:55-75`,
  `src/components/common/bird-avatar.tsx:30-62`, `scripts/dev/valley-terrain.mjs:1-60`,
  `scripts/dev/print-magazine.mjs:1-30`, `src/app/lab/catchups/_fixtures/magazine/corpus.ts:1-60`,
  `src/lib/magazine/magazine.test.mjs:1-40`, `prisma/migrations-manual/2026-09-10-catchup-pictures-his-three.sql:1-40`,
  the heads and status boards of `docs/planning/catchups-rework/handover.md`,
  `docs/planning/collection-rework/handover.md` and `docs/planning/valley/handover.md`, the campaign
  board of audit 2's `fix-prompt.md`.
- **Measured, not read** (the charter's own instruction for binaries): every tracked file's byte
  count at HEAD and at `72b5a1d` (both computed from `git ls-tree -r -l`, so the brief's 44.90 MB
  and 32.19 MB reproduce exactly), every blob in history (`git rev-list --objects --all | git
  cat-file --batch-check`), pixel dimensions and format of every `public/` file over 100 KB and of
  all 24 baselines, the on-disk size of every top-level and every ignored pile.
- **Skimmed**: `raw/tracked-bytes.txt` (used as the index; re-derived from git rather than trusted),
  `raw/files-added-since-audit2.txt` (499 lines, used to cross-check the growth table).
- **Not read**: the *contents* of `sanan's stuff/` and `scripts/dev/.*/` (never opened; sizes taken
  with `du -sk` on the directory names only, which appear in `.gitignore` anyway); the `.env`
  files; the peer bug audit's folder `docs/audit-fix/2026-09-24-bug-audit-3/` (its on-disk size is
  in the pie because `du .` cannot exclude it, nothing else); the prose of the 22 audit-2 agent
  reports beyond `root-assets.md`.
- **Uncommitted edits seen**: none in any file I read. `git status --short` at start and end shows
  only the two untracked audit folders (`2026-09-24-bug-audit-3/`, `2026-09-24-refactor-audit-3/`).

## Summary

**The repository is 44.90 MB, and 56.6 % of it is pictures**: 12.02 MB of visual baselines and
13.37 MB of rasters under `public/` (the remaining 0.10 MB of `public/` is the world atlas JSON).
Markdown is another 19 % (8.6 MB: `docs/` 7.77 + `.claude/` 0.69 + the root), and code of every
kind (`src/`, `scripts/`, `e2e/` specs, `prisma/`) is 23 % (10.4 MB). So a lens that asked only
"how many lines" would be looking at less than a quarter of the weight. The tables below attribute
every megabyte, and then the +12.71 MB the three weeks since audit 2 added.

**The growth has one dominant cause and it is not sprawl.** Three Catch-up cover photographs
committed on 2026-09-10 (`41a73a73`) are 6.47 MB, **51 % of everything gained**. They are the
owner's own photographs at camera resolution (4608 px wide, WebP q90) while the optimiser's top rung
is 3840 px and no shipped surface asks for more than 2360 device pixels, so at least 768 columns of
every frame can never reach a screen. The one place a member downloads the raw files is the picture
chooser, which draws all three through a plain `<img>` as thumbnails: opening that dialog is a
6.8 MB download. Re-exporting them at the optimiser's own ceiling (tracked-weight-01) is the
largest single saving in the repository (−4.0 to −5.5 MB, 9-12 % of everything tracked), is
invisible to members by construction, and needs no migration, no test change and no spec change.
The second cause is **audit 2's own working folder** (122 files, 3.65 MB, 8.1 % of the repo), which
the house rule of 2026-09-08 sends to git history the moment its campaign closes; this audit is
that moment (tracked-weight-02). Third is the Catch-ups rework's planning folder (1.45 MB), fourth
the lab's growth (+1.55 MB, half of it the twelve magazine fixtures), fifth the session log's
inversion (+0.53 MB net, and it is the record, so it stays).

**What earlier audits left that is now moot or done**: the root `progress.md` problem (audit 2's
headline, 600 KB) is fixed by the 2026-09-07 inversion and is 38.5 KB today; the four dead binaries
went on 2026-09-05; `.scratch/` is gone; `look.mjs` writes under `e2e/.shots/`. **What decayed the
way audit 2 predicted**: the screenshot scratch pile is now ~520 MB (audit 1: 91 MB, audit 2:
153 MB) even though `npm run shots:clean` has existed since 2026-09-07, because nothing runs it;
the two dead `.claude` piles (17 MB) are still there; the two dead `.gitignore` entries are still
there; the imported skill packs are byte-for-byte unchanged.

**On the baselines, a correction to the obvious plan.** Every PNG is already 8-bit RGB at 1x
(`scale: "css"`), so a `deviceScaleFactor` policy saves nothing, and the band routes are already
viewport-height. What the bytes actually are is one photograph's entropy drawn twice: the hero on
the two signed-out pages (4.69 MB, 37 %) and the same `landing.jpeg` painted at 9 % opacity behind
every signed-in page (`.valley-tree` in `app-shell.tsx`), which makes the full-page signed-in shots
run 0.5-1.0 bytes per pixel against 0.105 for the signed-out `/privacy` (the control). Hiding the
faint backdrop during the shot is worth about −3.5 MB and costs no coverage that can drift; hiding
the hero too would take the folder to ~4.3 MB but does cost coverage (tracked-weight-04, a T17
policy; I own the numbers).

**Structural vs cheap**: 9 structural findings (about 8.3-9.9 MB of tracked bytes out of the tree,
~520 MB and 17 MB of local piles bounded, one member-facing download cut from 6.8 MB to ~1.3 MB,
one 450 KB first-load asset shrunk) and 2 cheap ones (the two dead ignore entries and a `git gc`;
the folder move in 07 is a relocate, structural by the brief's own definition, at 0 bytes). Nothing here proposes deleting a feature, a record or a
baseline. **What surprised me**: that the single biggest lump the owner could be shown is his own
three photographs, committed with a comment that argues, correctly, that the optimiser serves
resized copies, and then stores 33 % more pixels than the optimiser can ever ask for.

**Where the 44.90 MB is** (1,632 files; `git ls-tree -r -l HEAD`, MiB throughout, pictures in bold):

| Bucket | MB | files | share | what it is, and the verdict |
|---|---|---|---|---|
| **`e2e/__screenshots__`** | 12.02 | 24 | 26.8 % | the visual suite's picture memory, committed on purpose (OPERATIONS §1). Intentional; its bytes are one photograph's entropy (04) |
| **`public/images/catchups`** | 6.47 | 3 | 14.4 % | the three Catch-up covers at camera resolution. Should be smaller (01) |
| `src/` outside the lab | 5.99 | 737 | 13.3 % | `components` 2.81, `lib` 2.19, `app` non-lab 0.96, `types`/root 0.03. Code; other lenses |
| `docs/audit-fix` | 4.16 | 139 | 9.3 % | audit 2's `work/` is 3.65 MB / 122 files of it. Goes to history at close (02); bug audit 2's `work/` 0.08 (03) |
| **`public/images/collection`** | 3.57 | 25 | 8.0 % | 14 files / 2.04 MB the demo seed templates + c1/c3 (pinned by `content.test.mjs`); 11 files / 1.46 MB only lab rooms use (07) |
| `src/app/lab` | 3.44 | 201 | 7.7 % | 65 rooms; the 12 magazine fixtures are 0.73 MB (21 %) of it. Weighed here, judged by T15 |
| **`public/lab`** | 2.01 | 15 | 4.5 % | `crop/` 1.51 (11 specimens, lab-only), `valley/` 0.50 (two DEM heightmaps + 2 JSON). Deploys to both sites (owner decision 3) |
| `docs/planning` | 1.86 | 44 | 4.1 % | `catchups-rework/` 1.45 in 25 files (handover 0.33, `directions/` 0.50); `collection-rework/` 0.22; the rest 0.19 (11) |
| `docs/history` | 1.16 | 4 | 2.6 % | the session record, one file a month (08: 552 KB, 09: 587 KB). Keep |
| **`public/images` other** | 1.33 | 115 | 3.0 % | `landing.jpeg` 0.48 (hero + the 9 % backdrop, 06), `birds/` 0.67 (102 PNG for the contact card, alive), `icons/` 0.15, `brand/` 0.01, `email/` 0.00 |
| `.claude` | 0.69 | 104 | 1.5 % | 86 % of it the 43 imported skill packs, byte-identical to audit 2. Carry-over |
| `scripts` | 0.58 | 77 | 1.3 % | scripts lens |
| root | 0.52 | 15 | 1.2 % | `package-lock.json` 0.41 (83 % of the root), `progress.md` 0.04, `CLAUDE.md` 0.03, `next.config.ts` 0.03 |
| `docs/spec` + `docs/content` + `docs/*.md` | 0.61 | 25 | 1.4 % | specs 0.36, WhatsApp curation trio 0.15, the five top-level docs 0.10 |
| `prisma` | 0.30 | 89 | 0.7 % | schema 0.09 + 88 manual migrations 0.21. Settled by audits 1-2 |
| `public/geo` | 0.10 | 1 | 0.2 % | the world atlas, served not bundled (not-finding) |
| `e2e` specs + `.github` | 0.11 | 15 | 0.2 % | — |

Pictures (the bold rows plus `landing.jpeg`, `birds/`, `icons/`, `brand/`): 25.4 MB, 56.6 %.

**Where the +12.71 MB came from** (32.19 MB / 1,252 files at `72b5a1d` → 44.90 MB / 1,632 at HEAD;
per-file deltas computed from both trees; ±0.1 MB rounding across rows):

| Contributor | MB | share of the gain |
|---|---|---|
| Three Catch-up covers, `public/images/catchups/` (`41a73a73`, 2026-09-10) | +6.47 | 51 % |
| Audit 2's own folder: `work/` 3.65 + `report.md` 0.09 + `fix-prompt.md` 0.10 | +3.85 | 30 % |
| The lab: +89 files (`valley`, `years/wall`, the Catch-ups rooms, the magazine), of which the 12 JSON fixtures +0.73 | +1.55 | 12 % |
| `docs/planning`: `catchups-rework/` +1.45 (new), `valley/` +0.05, `collection-rework/` +0.02 | +1.51 | 12 % |
| Non-lab code: `src/lib` +0.61 (magazine engine, Catch-up libs and tests), `src/components` +0.36, `src/app` non-lab +0.09 | +1.06 | 8 % |
| 102 bird PNGs for the saved contact card, `public/images/birds/` (`bcec4cdc`, 2026-09-11) | +0.67 | 5 % |
| The session log's inversion: `docs/history` +1.09 (Aug moved out, Sep written there), root `progress.md` −0.56 | +0.53 | 4 % |
| The valley heightmaps, `public/lab/valley/` (`2d3efebf`, 2026-09-16) | +0.52 | 4 % |
| `prisma/migrations-manual` +0.08, `scripts` +0.07, `docs/content` +0.02, `e2e` specs +0.01 | +0.18 | 1 % |
| Audit 1's `work/` sent to history (`9e5fbecb`, 2026-09-08; README: "72 files and 1.9 MB") | −1.9 | |
| Baselines: `catchups` desktop −0.63 and mobile −0.14 after the band mask, `landing` −0.07 | −0.94 | |
| `public/` deletions: 5 showcase shots −0.28 (`f8ef8a20`), 3 crop leftovers −0.33 and `c3-thumb` −0.09 (`2046bff1`) | −0.70 | |
| `package-lock.json` −0.11 (the audit-2 dependency cuts), `docs/spec` −0.02 | −0.13 | |
| **Net** | **+12.71** | |

Two things the table says that the brief's per-directory totals hide. First, **the audit machinery is
itself a source of tracked weight**: audit 2 added 3.85 MB and audit 1's removal took 1.9 MB away in
the same window, so the audits net +1.95 MB, 15 % of the gain; this audit's `work/raw/` is already
1.6 MB on disk before a single report is written. The rule that fixes it exists and works
(`docs/audit-fix/README.md:24`); it only has to fire. Second, **the three photographs and the
audit folder together are 81 % of the gain**, and both have a one-commit answer. Everything else
in the table is the product growing (the lab, the Catch-ups rework, the record) and is not a weight
problem at all: the whole non-lab `src/` tree is smaller than the screenshot folder.

**On disk, the folder is 7.51 GB, and the tracked tree is 0.6 % of it** (`du -sk .` = 7,511,516 KiB):

| On disk | KiB | share | tracked? |
|---|---|---|---|
| `.next/` | 4,945,064 | 65.8 % | no; Turbopack's cache ("several GB is normal", CLAUDE.md gotcha 1). No `.next-stale*` orphans present |
| `node_modules/` | 1,205,120 | 16.0 % | no; dependency lens |
| `e2e/` | 558,380 | 7.4 % | 12.4 MB tracked; **`.shots/` 518,652 (05)**, `.report/` 14,600, `.output/` 12,652 (per-run, ignored) |
| `.git/` | 273,272 | 3.6 % | 3 packs 166.0 MiB + 4,589 loose objects 99.7 MiB (10) |
| `scripts/` | 256,332 | 3.4 % | 0.58 MB tracked; **`dev/.magazine/` 230,700 (09)**, `dev/.exports/` 23,796, six other working folders 1,072 |
| `sanan's stuff/` | 205,956 | 2.7 % | no (`.gitignore:72`); was 130 MB at audit 2, 132 at audit 1. Not opened |
| `public/` | 21,996 | 0.3 % | 13.5 MB tracked; `landing-original.jpeg` 6,060 (ignored master), `lab/wall/` 1,824 (ignored atlas) |
| `.claude/` | 18,228 | 0.2 % | 0.7 MB tracked; **`shots/` 9,604 and `_disabled-gsd/` 7,548 are dead (05)** |
| `src/` 15,544 · `docs/` 10,472 · `prisma/` 516 · `.github/` 36 | 26,568 | 0.4 % | mostly tracked |

## Findings

### tracked-weight-01 - Re-export the three Catch-up covers at the optimiser's ceiling; the camera-resolution masters live in history
- **Where**: `public/images/catchups/shaded-path.webp` (3,346,288 B, 4608x2306), `boulder-hill.webp`
  (1,840,694 B, 4608x2303), `stone-benches.webp` (1,601,734 B, 3456x1716); all added by `41a73a73`
  (2026-09-10, "his first three photographs replace the six stand-ins"). The reasoning that put them
  in at this size: `src/lib/catchup-pictures.ts:160-172`, the comment block beginning `HIS FIRST
  THREE, 2026-09-10` and `AT THEIR FULL RESOLUTION, uncropped ... WebP at q90 ... the size on disk is
  what the widest screen can use, not what every card downloads`. The ceiling: `next.config.ts:394`
  `deviceSizes: [640, 750, 828, 1080, 1200, 1456, 1920, 2048, 3840]`. The largest `sizes` any shipped
  consumer declares: `src/components/catchups/home/home-head.tsx:66` `sizes="(min-width: 1180px)
  1180px, 100vw"`; `index/picture-door.tsx:82` `CARD_IMAGE_SIZES = "(min-width: 1180px) 548px,
  (min-width: 768px) 760px, 100vw"`; `index/edition-cover-card.tsx:107` `366px / 508px / 68vw`. The
  one raw path: `src/components/catchups/home/picture-picker-dialog.tsx:222-227` and `:264-268`,
  `<img src={option.src} ...>` for every pool entry, with the reason at `:218-221` ("next/image is
  the metered optimiser the media work spent a campaign getting off").
- **Phase**: relocate (the masters leave the tree the way `landing-original.jpeg` already does,
  `.gitignore:35-37`; a web-sized copy stays at the same path)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous for a 3840 px cap (provably
  invisible: it is the optimiser's own top rung); owner for the tighter 2560 px cap (owner decision 1)
- **Evidence**:
  - The optimiser never emits a width above 3840 and never upscales. A member on a 2x laptop viewing
    the home head at its 1180 CSS px maximum needs 2360 device px; the browser picks the 3840
    candidate from the srcset and the optimiser downsamples the 4608 source to 3840. A 3840-wide
    source goes through the identical pipeline minus one downsample that now happens offline. So
    columns 3841-4608 of two of the three files (768 px, 17 % of every frame's pixels) cannot reach
    any screen through any shipped surface. `stone-benches.webp` at 3456 px is already under the rung;
    its saving is the quality setting alone.
  - q90 is far above the optimiser's default output quality (75). The only place q90 pixels reach a
    member unre-encoded is the picker dialog, which draws them at 155x62 CSS px on a phone and about
    180x72 on a laptop (its own comment at `:236-239`: "Two up gives 155x62"). Opening that dialog
    therefore fetches **6,788,716 bytes** of originals for three thumbnails, on every member's first
    open (Vercel serves `public/` with `max-age=0, must-revalidate`, so later opens are 304s).
  - Bytes per pixel today: shaded-path 0.315 B/px, stone-benches 0.270, boulder-hill 0.173 (sky; it
    compresses). A WebP photograph at q80-82 runs 0.10-0.15 B/px. So: capped at 3840 wide and q82,
    the three come to roughly 2.0-2.5 MB; capped at 2560 wide, roughly 1.0-1.3 MB.
  - Every pin survives either cap. `src/lib/catchup-pictures.test.mjs:75-84` requires `width >= 2400`
    and `Math.abs(width/height - 2) < 0.05`; 3840x1921 and 2560x1281 both pass (today's 4608x2306 is
    1.998:1). `:52-58` requires the path to start with `/images/catchups/` and to exist in `public/`:
    unchanged, because the file names do not change. `docs/spec/catchups.md` §6 ("Adding one is a
    file in `public/images/catchups/`") and the schema default `prisma/schema.prisma:1116`
    (`@default("/images/catchups/shaded-path.webp")`) are untouched. The migration
    `prisma/migrations-manual/2026-09-10-catchup-pictures-his-three.sql` wrote these paths into rows;
    a same-path re-export needs no migration.
  - The masters are not lost by overwriting: `git show 41a73a73:public/images/catchups/shaded-path.webp`
    recovers any of them at any time, and the 6.47 MB of blobs stays in every clone's history
    regardless of what the tree does (see finding 10). The saving is in the checkout, the deploy
    artefact of both sites, `git grep`/`du`, and the picker's download; not in the clone.
- **What to do**:
  1. In the fix session (never in `check.mjs`): for each file, `sharp` with
     `.resize({ width: 3840, withoutEnlargement: true }).webp({ quality: 82, effort: 6 })`, metadata
     stripped as today (the comment says a Lumix writes GPS). `sharp` is already a dependency.
     `stone-benches.webp` keeps 3456 wide; only its quality changes.
  2. Confirm with `sips -g pixelWidth -g pixelHeight` that each result is 2:1 within 0.05 and
     ≥ 2400 wide; run `node --test src/lib/catchup-pictures.test.mjs`.
  3. Rewrite the comment block at `catchup-pictures.ts:168-172` to say the true ceiling: "3,840 px
     wide, the optimiser's top rung (next.config.ts deviceSizes), at q82; nothing shipped asks above
     2,360 device px. The camera-resolution originals are his, and git keeps the committed ones at
     41a73a73." Keep the sentence about the crop being `object-fit: cover` plus `focus`; that is
     the part that matters and it is unaffected.
  4. Do not rename the files. `src/components/landing/shots.ts:12-17` warns that `/_next/image`
     caches by URL and may serve a stale render after an in-place overwrite; here a stale render is
     the same downsample of the same photograph at the same rung, so the warning does not bite.
  5. Commit the three binaries with the comment edit and this audit's ledger line in one commit.
- **Saving**: **−4.0 to −4.5 MB tracked at the 3840 cap; −5.2 to −5.5 MB at 2560** (9-12 % of the
  whole repository; 62-85 % of the largest folder under `public/`). The picker dialog's download
  falls from 6.8 MB to ~2.2 MB or ~1.2 MB. Both deploys shrink by the same amount. 0 lines.
- **Risk & gate**: low. Gate: the test above; open `/catchups` and one Catch-up's home at 1440x900
  and 390x844 signed in as Jerry and compare the head and a card against the current render (they
  are the optimiser's output either way, so a diff would mean the export went wrong, not that the
  policy did); `npm run visual` (the `catchups` baseline is a band route with the photograph under
  the mask, so it should not move; if it does, read the diff before `visual:update`). Nothing in
  `security-regressions.test.mjs` touches this.
- **Confidence**: high on every number and on invisibility at 3840 (it is arithmetic on
  `deviceSizes` and `sizes`). What would change my mind: a shipped surface with `sizes` above 1180
  CSS px, or an `unoptimized` prop on one of the `<Image>`s. I grepped both: none outside the lab,
  and the lab's `capsule/_room.tsx:147` also stops at `sizes="1180px"`.
- **Notes**: the comment that put them in is right about the mechanism and wrong about the ceiling,
  which is why this is a finding and not a quarrel: "the size on disk is what the widest screen can
  use" is true only up to the rung ladder. The 2560 option is tighter than any device needs today
  (a 5K display still shows the head at ≤ 1180 CSS px) but he asked for "2,400 or better" from the
  photographs he will add, and 2560 leaves only 160 px of margin over that brief, so I put it to him
  rather than taking it. The picker's raw `<img>` is a separate matter for the catchups lens (the
  pool entries are static public paths and could go through the optimiser with a `sizes` of
  ~180px even if uploads stay raw); it is listed under "For other lenses". When he adds the
  seventeen photographs he mentioned ("I was supposed to provide 20. I have three."), the same
  export step should be the rule, or the folder grows by ~2 MB per photograph instead of ~0.7.

### tracked-weight-02 - Send audit 2's `work/` folder to git history when its campaign closes, and this audit is the moment
- **Where**: `docs/audit-fix/2026-09-03-refactor-audit-2/work/` — 122 tracked files, 3,654,755 B:
  `agents/` 22 files 1,644,690 B; `verify/` 28 files 683,789 B; `raw/` 64 files 547,399 B; the eight
  top-level files 778,877 B (`findings-index.json` 476,609 B, `findings.md` 108,769,
  `workflow-find.js` 88,779, `workflow-verify.js`, `db-indexes-live.json` 51,994, `task_plan.md`,
  `brief-common.md`, `clusters-final.json`). The rule: `docs/audit-fix/README.md:24-31`, "**And when
  it closes, its `work/` folder goes.** The owner made this the rule on 2026-09-08 (refactor audit 2,
  question 21)". The precedent: `9e5fbecb` (2026-09-08, "docs(audit1): the working notes go to git
  history, citations with them"). The campaign state: `fix-prompt.md:83-90` board, rows E and F
  `PARTIAL`, everything else `DONE`.
- **Phase**: relocate (to history)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous, gated on the orchestrator's
  decision that audit 3's plan absorbs audit 2's open rows (the brief §3 already asks every
  territory to report those rows' current state, which is the absorption)
- **Evidence**: the folder is 8.1 % of every byte git tracks and 47 % of `docs/audit-fix`; it holds
  the third-largest single document in the repository (`findings-index.json`, a machine index) and 64
  raw tool outputs that this audit has re-run and superseded (`raw/cloc-by-file.csv` 70 KB,
  `raw/jscpd.txt` 44 KB, `raw/knip*.txt` 4 files 77 KB, and so on). `report.md` cites `work/` 15
  times and `fix-prompt.md` 10 times; the two bug-audit-2 survivors cite it 0 times. Audit 1's
  eviction (`9e5fbecb`) is the worked example of the citation edit the README demands.
- **What to do**:
  1. In the commit that closes audit 2 (the same commit that marks its README row Closed and folds
     rows E7b/E8/E11/catchups-02 and docs-17..21/scripts-e2e-ci-12 into audit 3's plan, or marks
     them consciously refused): `git rm -r docs/audit-fix/2026-09-03-refactor-audit-2/work`.
  2. Edit the 25 `work/` citations in `report.md` and `fix-prompt.md` the way `9e5fbecb` did: a
     one-line note at the top of each ("the `work/` folder went to history on <date>; recover with
     `git log --diff-filter=D -- "docs/audit-fix/2026-09-03-refactor-audit-2/work/*"`") rather
     than 25 rewrites, so the citations stay legible as history pointers.
  3. Update the audit-2 row in `docs/audit-fix/README.md` to Closed with what was measured.
  4. **Apply the same rule to this audit at its own close-out.** `work/raw/` is already 1.6 MB on
     disk (before agent reports); with 20-odd reports it will land at 3-5 MB, and the README's rule
     means it should be committed when the audit closes and removed when its campaign closes, not
     kept. Put that sentence in audit 3's fix-prompt so the campaign's last session does it.
- **Saving**: **−3,654,755 B tracked (3.49 MB), −122 files** now; a further ~3-5 MB when audit 3's
  own campaign closes. 0 code lines; ~13,000 markdown/JSON lines out of the tree (cloc counts the
  `.md` and `.json`), which is honest because they are moved to history, not deleted.
- **Risk & gate**: low. `npm run check` (`scripts/qa/campaign.test.mjs` reads the fix-prompt's board
  and must stay well-formed; nothing reads `work/`). `git grep -n "refactor-audit-2/work/"` after the
  edit must return only the history-pointer lines.
- **Confidence**: high. The one thing that would change it: a decision to keep audit 2's campaign
  open as its own thing after audit 3 ships, in which case the folder stays until that closes.
- **Notes**: this is the finding that most directly answers his sentence about deleting "a bunch of
  docs ... left over from previous sessions": the mechanism that stops it recurring already exists
  and worked once. What it lacks is a trigger. A `scripts/qa/*.test.mjs` that fails when a
  `docs/audit-fix/*/work/` folder exists under an audit whose README row says "Closed" would make
  the rule self-enforcing at the cost of ~20 lines; I would write it, and the memory rule ("one
  spec + a globbing test + a keyword row") says the same.

### tracked-weight-03 - Bug audit 2's `work/` is a closed audit's working folder still in the tree
- **Where**: `docs/audit-fix/2026-08-22-bug-audit-2/work/` — 7 tracked files, 85,880 B:
  `audit-assets/blns.txt` 30,079 (the Big List of Naughty Strings), `db-indexes-live.json` 25,769,
  `fixer-prompt.md` 11,623, `audit-assets/anthropic-code-review-pipeline.md` 7,297,
  `appendix-refuted-and-dupes.md` 6,107, `task_plan.md` 4,082, `db-sizes-live.json` 923.
- **Phase**: relocate (to history)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `docs/audit-fix/README.md:15` marks bug audit 2 **Closed** ("All 203 findings
  dispositioned"). The rule at `:24` was made on 2026-09-08, after this audit closed, and its
  sentence "bug audit 1 went the same way in August" shows the intent covered the bug audits; bug
  audit 2's folder was simply not swept. `bug-report-2.md` and `fix-ledger.md` cite `work/` zero
  times, so no citation edit is needed. `git grep -n "blns.txt"` outside the folder: nothing reads
  the list.
- **What to do**: `git rm -r docs/audit-fix/2026-08-22-bug-audit-2/work`, plus one line in the
  README row ("its `work/` went to history on <date>"). Ride it in the same commit as finding 02.
- **Saving**: −85,880 B tracked, −7 files, ~1,400 lines of text/JSON out of the tree.
- **Risk & gate**: none beyond `npm run check`.
- **Confidence**: high.
- **Notes**: small, but it is the same rule as 02 and the test proposed there would have caught it.

### tracked-weight-04 - The visual baselines are 82 % one photograph's entropy; the lever is a `style` hide during the shot, not a DPR or clip policy
- **Where**: `e2e/__screenshots__/desktop/*.png` (12, 9,744,034 B) and `mobile/*.png` (12,
  2,856,825 B); total 12,600,859 B. The photograph: `src/components/landing/hero-photo.ts:16`
  `HERO_IMAGE_SRC = "/images/landing.jpeg"`, drawn full-bleed by `landing-hero.tsx:289-299`
  (`<Image fill priority sizes="100vw">`) on `/` and, as the right-hand panel, on `/login`; and drawn
  again behind every signed-in page by `src/components/layout/app-shell.tsx:63-67`
  (`className="valley-tree ... fixed inset-0 z-0 bg-cover bg-center opacity-[0.09]
  dark:opacity-[0.04]" style={{ backgroundImage: "url(/images/landing.jpeg)" }}`). The shot:
  `e2e/visual.spec.ts:321-328` (`fullPage: route.live !== "band"`, `mask: [...]`); the options:
  `e2e/playwright.config.ts:74-81` (`threshold: 0.2`, `maxDiffPixels: 100`, `animations:
  "disabled"`, `scale: "css"`).
- **Phase**: relocate (process; the policy is T17's, the attribution is mine)
- **Tier**: T3     **Class**: structural     **Decides**: owner (it changes what the suite can catch;
  owner decision 4)
- **Evidence**, all measured with `sips` and `git ls-tree -l`:
  - Every baseline is 8-bit RGB, no alpha, at 1x: 1440 px wide for the 1440 viewport and 390 for the
    390 one (`scale: "css"`). **A `deviceScaleFactor` or `scale: "device"` policy can save nothing;
    it is already at the floor.** Six routes are already shot at viewport height (`band`).
  - Bytes per pixel is the tell. Signed-out `/privacy`, full page, 1440x3832, text on cream:
    **0.105 B/px** (580,499 B). Signed-in full-page routes with the 9 % backdrop under them:
    `/about` 1440x900 **0.836 B/px** (1,083,678 B, a page with no image of its own), `/birds`
    1440x1561 0.545, `/support` 1440x1375 0.502. The two hero pages: `/` 1440x900 **1.885 B/px**
    (2,442,705 B), `/login` 1.232 (1,597,144 B; its mobile twin, which has no photo panel, is 17,403
    B, 0.053 B/px). A flat UI page under a mask, `/feed`: 0.179. A photograph at 9 % opacity is still
    full-entropy noise to a lossless encoder; it just has 23 luminance levels instead of 255.
  - So the folder divides as: the hero on `/` and `/login`, both viewports: **4,686,782 B (37.2 %)**;
    the three signed-in full-page routes carrying the backdrop, both viewports: **4,534,149 B
    (36.0 %)**; `/privacy` both viewports 1,082,950 B (8.6 %); the six band routes 2,296,978 B
    (18.2 %), of which `letters` desktop is 515,275 B because its header band and paper cards sit
    over the backdrop. **82 % of the bytes are the one JPEG, drawn plainly or faintly.**
  - History since audit 2: `e2e/__screenshots__` went from 157 blobs / 101 MB to **225 blobs /
    127.08 MB** (+68 blobs, +26 MB) in 11 rebaseline commits. Three of them were global and
    legitimately so (`9600932d` the brand lockup, 23 files; `bed93ca1` the sidebar mark, 18;
    `0651abd3` the header controls, 12); the other eight touched 1-2 files. The "rebaseline only the
    routes that moved" practice audit 2 asked for is being followed (not-finding below).
  - No orphan PNG: the 12 `ROUTES` names x 2 match the 24 files exactly.
- **What to do** (for T17 to decide; the numbers are what I can supply):
  1. **Hide the faint backdrop during the shot.** `toHaveScreenshot` accepts a `style` option (CSS
     injected for the capture); `style: ".valley-tree { visibility: hidden }"` keeps layout (it is
     `fixed inset-0 z-0` and lays out nothing) and removes the noise from every signed-in shot.
     Coverage lost: none that can drift per page; the backdrop's geometry is `bg-cover bg-center`
     on a fixed full-viewport box and its opacity is one token. Estimated effect from the B/px
     figures: `/about`, `/birds`, `/support` and their mobile twins fall from 4.53 MB to ~1.3 MB, the
     band routes lose ~0.4 MB in their exposed header strips: **about −3.5 MB (−29 %)**. A global
     rebaseline then costs ~8.5 MB of history instead of 12.
  2. **Whether to hide the hero on `/` and `/login` is the real coverage question.** Hiding it
     (`style` on the hero `<img>`) saves a further ~4.2 MB (the two pages would land near `/feed`'s
     0.18 B/px), taking the folder to ~4.3 MB. But `hero-photo.ts:1-15` documents a designed
     continuity — the hero slides left by `AUTH_FORM_VW` into exactly the crop the `/login` panel
     shows — and a shot without the photograph cannot see that crop. My recommendation is to keep
     the hero and hide only the backdrop, and to pair the change with finding 06 so the signed-in
     routes are rebaselined once, smaller.
  3. Not worth doing: a lossless `oxipng` pass over the folder (typically −10 to −25 % on
     Playwright PNGs) because `--update-snapshots` rewrites the files and undoes it at the next
     rebaseline; a lossy quantisation, because `threshold: 0.2` per pixel would go red on every
     photographic region.
- **Saving**: **−3.5 MB tracked (estimate; unmeasured, the way to measure is one run with the
  `style` set and `du`)**, and ~30 % off every future global rebaseline's history cost. −7.7 MB if
  the hero is hidden too, at a coverage cost stated above.
- **Risk & gate**: medium — it is the regression suite's coverage. `npm run visual` before,
  `visual:update` with the report read by eye (the diff must be exactly the backdrop's disappearance
  and nothing else), `npm run visual` green after; never concurrently with `npm run check`
  (memory: the interleave bit twice).
- **Confidence**: high on the attribution (the `/privacy` control and the mobile `/login` control
  are one command each). Medium on the −3.5 MB estimate; low on any policy recommendation by
  design, since T17 and the owner own it.
- **Notes**: audit 2's root-assets-07 measured the same folder at 13.59 MB and attributed 80 % to
  "the seven full-page routes"; that was right about the routes and wrong about the cause, which is
  why the "shoot `/privacy` at viewport height" it suggested would have saved almost nothing
  (`/privacy` is the cheapest full-page shot in the folder). The band mask on `catchups`
  (`e2761a96`, `5e688bb4`) is what took 0.78 MB off since then, for the same reason: it replaced
  photograph pixels with flat pink. The one part of the folder that is genuinely its subject is
  `/support` (the tree backdrop the route exists to watch) and `/birds` (50 glyphs); those bytes stay.

### tracked-weight-05 - `shots:clean` exists and nobody runs it: 520 MB of scratch screenshots, plus two dead piles under `.claude/`
- **Where**: `e2e/.shots/` (ignored, `.gitignore:41`): 908 files, 518,652 KiB; 230 files older than
  seven days (131 MB); 475 files written on 2026-09-21 alone (the loading-screen series). The command:
  `package.json:15` `"shots:clean": "find e2e/.shots -type f -mtime +7 -delete; echo 'cleared
  scratch screenshots older than a week'"`, added by `29790d82` (2026-09-07, "one scratch folder for
  screenshots, and a command that empties it"). The rule: CLAUDE.md, Screenshots section, "run it at
  the end of a session". The dead piles: `.claude/shots/` (9,604 KiB, 31 files, newest 2026-08-19)
  and `.claude/_disabled-gsd/` (7,548 KiB), both ignored by `.claude/*` (`.gitignore:64`), both
  named for deletion by audit 2's root-assets-11 on 2026-09-04.
- **Phase**: relocate (process)
- **Tier**: T2     **Class**: structural (the mechanism; the bytes are local)     **Decides**: autonomous
- **Evidence**: three audits, three run rates, one direction: audit 1 measured ~91 MB/week, audit 2
  ~150 MB/week, and 2026-09-13 → 09-24 produced 518,652 KiB in eleven days, **~330 MB/week**. The
  oldest file is dated 2026-09-13, so the command has been run at least once since 09-07 and not
  since; 131 MB is what it would delete today. This is the same shape of failure as the old
  `progress.md` archive rule audit 2 diagnosed: a rule with a command and no trigger. The two
  `.claude` piles are 17 MB that no session has touched in five weeks; `_disabled-gsd` is the
  scaffold `.gitignore:49-52` says was abandoned the week it was made.
- **What to do**:
  1. Give `shots:clean` a trigger that already fires every session. The cleanest is `check.mjs`: it
     is the one gate every session provably runs before a commit (`scripts/qa/ci-parity.test.mjs`
     pins CI to it), and a delete of gitignored files older than seven days cannot touch anyone's
     in-progress work. If a delete inside a gate feels wrong, the alternative is a `"previsual"` /
     `"prescreenshot"` npm hook on the scripts that write the folder, so producing a new shot sweeps
     the week-old ones. Either way, one line, and the CLAUDE.md sentence changes from "run it at the
     end of a session" to "it runs itself".
  2. Delete `.claude/shots/` and `.claude/_disabled-gsd/` outright (17 MB, nothing references
     either; `git grep -n "_disabled-gsd\|\.claude/shots"` outside `.gitignore` and audit reports
     returns nothing).
  3. Leave `e2e/.output/` (12.7 MB) and `e2e/.report/` (14.6 MB) alone: Playwright rewrites them
     every run and `npm run visual:report` reads the latter.
- **Saving**: 0 tracked bytes. **~520 MB of local disk now, bounded at ~40-60 MB steady state**
  (a week of shots at the current rate); 17 MB of dead piles. 7 % of the folder's on-disk size.
- **Risk & gate**: none to the repo. The seven-day filter is what keeps another session's mid-run
  shots safe (CLAUDE.md: never delete what another session may be mid-run on). Gate: `npm run
  check` still green with the step added; `ls e2e/.shots | wc -l` before and after.
- **Confidence**: high.
- **Notes**: the deeper cut audit 1 and 2 both named still stands and belongs to the scripts lens:
  the QA scripts write full-page PNGs of ~1 MB where the chrome-devtools MCP writes WebP at q72
  (`.mcp.json`). At 908 files / 519 MB the mean shot is 570 KB; the folder would be a third of the
  size at the same file count in WebP.

### tracked-weight-06 - The 9 %-opacity valley backdrop fetches the 498 KB hero JPEG on every member's first signed-in page; give it its own small export
- **Where**: `src/components/layout/app-shell.tsx:63-67`, the `aria-hidden` div with
  `className="valley-tree pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-[0.09]
  dark:opacity-[0.04]"` and `style={{ backgroundImage: "url(/images/landing.jpeg)" }}`. The file:
  `public/images/landing.jpeg`, 498,076 B, 1680x1260, referenced by `hero-photo.ts:16` (the hero, via
  `next/image`), this one CSS `url()` in shipped code, and eleven CSS/`<img>` uses in nine lab files
  (`src/app/lab/_shared.tsx:136,271,404`, `v2/page.lab.tsx:198,382,532,636,729`, `logo/page.lab.tsx:41`,
  `hoopoe-lives/page.lab.tsx:21`, `catchups/sketches/_parts.tsx:63`, `profiles/page.lab.tsx:129`).
- **Phase**: relocate (a purpose-sized asset for a purpose the hero file was not exported for)
- **Tier**: T2 (one line, one new 40 KB file, one rebaseline pass)     **Class**: structural
  **Decides**: autonomous — at 9 % opacity nothing a member can see changes, and the gate below is
  a side-by-side
- **Evidence**: a CSS `url()` bypasses the optimiser, so the raw JPEG is served as-is; `next/image`
  on the hero requests resized WebP rungs instead and never touches the raw file on a signed-in
  page. Every `(main)` route mounts this shell, so the first signed-in page a member opens fetches
  498 KB for a wash whose maximum contribution to any pixel is 0.09 x 255 = 23 luminance levels.
  An 800x600 JPEG at q55 of the same frame is ~35-50 KB and, blended at 9 % and stretched by
  `bg-cover` over a 1440 px viewport (1.8x), is indistinguishable: the softening from the upscale is
  bounded by those 23 levels. (Vercel serves `public/` files with `Cache-Control: public, max-age=0,
  must-revalidate`, so this is a first-load cost per browser and a 304 afterwards; it is still the
  largest single non-JS asset on a member's first signed-in load.)
- **What to do**:
  1. Export `public/images/valley-wash.jpeg` (or `.webp`) at 800 px wide, q55, from
     `landing-original.jpeg` (the ignored 6.2 MB master, `.gitignore:35-37`) or from `landing.jpeg`.
  2. Point `app-shell.tsx:66` at it. Leave the hero and the lab rooms on `landing.jpeg`.
  3. This moves the backdrop pixels under every signed-in baseline, so **do it in the same commit
     as finding 04's `style` hide if T17 adopts it** — the rebaseline then happens once and shrinks
     the files instead of merely churning them. Without 04, expect 10-14 baselines to move and read
     each diff before `visual:update`.
- **Saving**: **~450 KB per member's first signed-in page load** (498 KB → ~45 KB), on both sites;
  +45 KB tracked. 0 lines.
- **Risk & gate**: low. Gate: screenshots of `/feed` at 1440x900 and 390x844 before and after,
  compared at the wash (they should be indistinguishable; if the wash is visibly blockier the
  export is too small, go to 1000 px); `npm run visual` then `visual:update` with the diff read.
- **Confidence**: high on the cost, high on invisibility (the arithmetic above); medium on the
  exact export size, which one screenshot settles.
- **Notes**: the hero itself has the opposite problem and belongs to the landing lens: with
  `sizes="100vw"` a 1440 CSS px viewport at 2x asks for 2880 device px and the source is 1680, so
  the optimiser serves 1680 and the browser upscales it 1.7x. The 6.2 MB master exists locally to
  re-export from; a 2880-wide q75 export would be ~350-450 KB, sharper on every retina laptop at
  about the same bytes. Not a weight finding; listed under "For other lenses".

### tracked-weight-07 - Gather the eleven lab-only Collection stand-ins under `public/lab/`, so one folder is "what only the lab asks for"
- **Where**: `public/images/collection/{v1,v2,v3,c2,c4}.webp` (1,234,420 B) and
  `{v1,v2,v3,c1,c2,c4}-thumb.webp` (296,590 B): 11 files, **1,531,010 B**, every reference in
  `src/app/lab/` (`viewer/page.lab.tsx:36,85`, `hoopoe-lives/page.lab.tsx:23`,
  `catchups/wall/_corpus.ts`, `catchups/sketches/_pressure.ts:56`, `profiles/_variant-letterhead-2.tsx:117`
  and `-3.tsx:135`, `everything/_findings.ts:251` (a quoted evidence string; leave it), and the URL
  fields inside `catchups/_fixtures/magazine/*.json`, e.g. `wall-300.json:1156` onward). The 14 files
  the demo seed templates (`demo-banyan-*`, `demo-assembly-wide`, display + thumb;
  `src/lib/demo-seed/content.ts:698-781`, `seed.ts:319`) and `c1.webp`/`c3.webp`
  (`content.ts:115`, post images) stay where they are.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural (a rule, not bytes)     **Decides**: autonomous
- **Evidence**: per-file reference grep over `src`, `scripts`, `e2e` excluding `src/app/lab`: `v1`
  7 lab files / 0 non-lab, `v2` 8 / 0, `v3` 9 / 0, `c2` 2 / 0, `c4` 2 / 0, each thumb 1 / 0. The only
  non-lab mentions of the folder are `c1` and `c3` in the demo seed, `c3` in a stale-map unit test
  (`catchup-pictures.test.mjs:161`, a string key, not a file read), and a comment in
  `catchup-pictures.ts:166` recording that the stand-ins stay "because the demo's Collection uses
  them" — which is true of the fourteen and of `c1`/`c3`, and not of these eleven. `public/lab/`
  already exists as the lab-only home (`crop/`, `valley/`, the ignored `wall/`), and the audit-2
  finding that landed on 2026-09-05 (`2046bff1`) used exactly that distinction to delete three files.
- **What to do**: `git mv` the eleven to `public/lab/collection/`; update the lab references (a
  `sed` over the listed `.tsx`/`.ts` files and the twelve fixture JSONs' `"url"` fields for the
  five display names; the thumbs are named only by `viewer/page.lab.tsx:80-87`). Do not touch
  `everything/_findings.ts:251` (it quotes historical code). Open `/lab/viewer`, `/lab/hoopoe-lives`,
  `/lab/catchups/wall`, `/lab/catchups/magazine`, `/lab/profiles` once each.
- **Saving**: **0 tracked bytes.** After it, `public/lab/` is 3.47 MB and is exactly the set of
  static files both deploys carry for rooms the demo cannot even route to — which turns owner
  decision 3 into one folder, one sentence, one answer, instead of a list scattered across two.
- **Risk & gate**: low; lab only. `npm run check` (the lab registry audit and
  `src/lib/demo-seed/content.test.mjs`, which opens only the fourteen seed files, must stay green);
  `git grep -n "/images/collection/" -- src/app/lab` afterwards should return only `c1`/`c3`.
- **Confidence**: high on the reference counts (the grep is in the report's method). The one thing
  that would change my mind: a Photo row in the live or demo database still pointing at one of the
  eleven from the June-era seed — audit 2 wrote the SELECT for this class and it applies here
  before any *deletion*; for a *move* it does not matter, because nothing is deleted, but a fixer
  who later deletes them must run it: `SELECT id, url, "thumbUrl" FROM "Photo" WHERE url LIKE
  '%/images/collection/%' OR "thumbUrl" LIKE '%/images/collection/%';` on both databases.
- **Notes**: I considered deleting the eleven instead and rejected it: nine lab rooms render them,
  the rooms are approved design history, and the brief forbids writing rooms up as dead code. I
  also considered leaving everything alone; the reason not to is that owner decision 3 cannot be
  put to him cleanly while "lab-only pictures" live in two folders with different names.

### tracked-weight-08 - `.gitignore` still carries the two dead entries audit 2 found, and has gained nothing that should not be there
- **Where**: `.gitignore:88-89` (`# Supabase CLI local link state, written by \`supabase link\`.
  Machine-specific.` + `supabase/.temp/`); `.gitignore:112-115` (the four-line "The tagging
  session's working folder (scripts/dev/tag-photos-*.mjs) ..." comment with no pattern under it,
  now sandwiched between the `scripts/dev/.*/` rule at `:110` and the `public/lab/wall/` block at
  `:117-119`); the missing blank line between `:103` (`scripts/dev/apple-edge/*.png`) and `:104`.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: audit 2's root-assets-08 named all three on 2026-09-04; the file has been edited
  three times since (`29790d82` 09-07, `a53827c2` 09-08, `6302bae2` 09-16, per `git log --
  .gitignore`) and each edit added or removed its own line without touching these. `git grep -ln
  "supabase link\|npx supabase\|supabase/"` still returns only `.gitignore` and audit-2 reports;
  there is no `supabase/` directory. Every other pattern has a subject on disk or a written reason:
  I re-checked all 34 against disk (`.pw-browsers`, `.backups`, `.geonames-tmp`, `.vercel`,
  `.demo-db-password`, `recovery-codes.txt`, `public/uploads`, `.planning`, `.codex`, `.agents` are
  all absent today and all documented as backstops; `e2e/.output`, `.report`, `.auth`,
  `e2e/.shots`, `scripts/dev/.*`, `public/lab/wall`, `landing-original.jpeg`, `.DS_Store`,
  `next-env.d.ts`, `/src/generated/prisma` all present and covered). The charter's other question —
  things that should be ignored and are not — has an empty answer: `git status --short` shows
  nothing untracked but the two audit folders, and the 28 `.DS_Store` files are all ignored by
  `:10`. `public/lab/valley/` should stay tracked (not-finding below), so it is not a candidate.
- **What to do**: delete `:87-89` (the blank, the comment, the rule) and `:111-115` (the blank and
  the orphan comment); insert a blank line after `:103`. Fold it into any commit that touches the
  file next; it is not worth its own.
- **Saving**: ~8 lines; a config file where every entry means something again.
- **Risk & gate**: `git status --short` identical before and after; `npm run check`.
- **Confidence**: high.
- **Notes**: the reason to bother is the same as audit 2's: a rule whose subject is gone teaches
  the next reader that the file is not maintained, and this file's 85 comment lines are the house
  idiom for *why* a thing is ignored, which only works if every entry earns its reason.

### tracked-weight-09 - `scripts/dev/.magazine` is 230 MB of printed Editions holding members' words, with no retention rule
- **Where**: `scripts/dev/.magazine/` (230,700 KiB on disk; ignored by `.gitignore:110`
  `scripts/dev/.*/`; **not opened**, sized with `du -sk` on the name only). Its writer:
  `scripts/dev/print-magazine.mjs:21-24` ("Output goes beside it in `scripts/dev/.magazine/`, which
  `scripts/dev/.*` already gitignores; a live Edition's PDF holds members' words and must never be
  committed"), and `:17-19` (every PDF page also rasterised to PNG when `pdftoppm` is present).
  Beside it: `scripts/dev/.exports/` 23,796 KiB (the Catch-ups export `export-catchups.mjs` writes,
  read by `corpus.ts:53-62` as the "live" corpus), `.album-import/` 472, `.screen-copies/` 452,
  `.anon-cleanup/` 92, `.tagging/` 36, `.professions/` 8, `.probe/` 4.
- **Phase**: relocate (process)
- **Tier**: T2     **Class**: structural (a retention rule)     **Decides**: owner — it is his
  members' data and his working output (owner decision 5)
- **Evidence**: 230 MB is 3.4 % of the folder and the second-largest untracked pile after
  `e2e/.shots`. The hand-run-passes spec (`docs/spec/hand-run-passes.md`) and `.gitignore:104-110`
  describe these folders as "Regenerated by a picker in seconds; never committed", which is an
  argument that nothing in them needs keeping once a run is read. `print-magazine.mjs` is, by its
  own header, "an ORDINARY dev script ... it judges nobody's data and writes nothing back", i.e. its
  output is a measurement, and the measurement is recorded in `docs/planning/catchups-rework/magazine.md`
  ("The spike"). What is on disk is the PDFs and their page rasters — from `--all` runs over the
  whole corpus, going by the size (twelve fixtures plus the live Edition, each as a PDF and as
  PNG pages). I cannot say how many runs or which dates without opening it, and I did not.
- **What to do**: put one line in the script's header and one in `docs/spec/hand-run-passes.md`'s
  close-out (or `scripts/README.md`'s ledger row): a run's output is read and then deleted, and
  `print-magazine.mjs` deletes its previous run's folder before writing a new one (the way
  `import-places.mjs` deletes `.geonames-tmp/` itself, `.gitignore:22-24`). Then, once, with the
  owner's yes: delete the folder. The same one-line rule fits `.exports/` (keep the newest date
  folder, which `corpus.ts` reads; delete older ones).
- **Saving**: 0 tracked bytes; **~230 MB of local disk now**, bounded at one run afterwards; ~20 MB
  more if `.exports/` keeps only its newest date.
- **Risk & gate**: none to the repo. Gate: `node --test src/lib/magazine/magazine.test.mjs` still
  passes with `.exports/` reduced to its newest date (the loader takes the newest and ignores the
  rest, `corpus.ts:55-62`).
- **Confidence**: high on the size and the writer; low on what exactly is inside, by design.
- **Notes**: this is the one pile in the folder that is real members' words rather than
  screenshots or caches, which is why it is a retention question for him and not a sweep for a
  script. If he would rather keep every printed magazine, the honest fix is a folder outside the
  repo (`sanan's stuff/` is already that) and the script writing there.

### tracked-weight-10 - `.git` is 267 MB, of which 100 MB is loose objects a `git gc` folds away; what history rewriting would recover, and why not to
- **Where**: `.git/` 273,272 KiB on disk. `git count-objects -v`: 4,589 loose objects, 102,052 KiB
  (99.66 MiB); 18,680 objects in 3 packs, 169,982 KiB (166.00 MiB): `pack-c7f20e9c` 97.4 MB,
  `pack-dfa29565` 41.9 MB, `pack-fc337590` 34.2 MB. 1,483 commits.
- **Phase**: hygiene (local)
- **Tier**: T1 for `git gc`     **Class**: cheap     **Decides**: autonomous for `git gc`; the
  history question is described only, per the charter ("History rewriting is an owner question at
  most — describe, do not recommend")
- **Evidence**:
  - Audit 2 measured 231 MB with 157 MiB loose and 73 MiB packed; today 100 MiB loose and 166 MiB
    packed, so something packed ~90 MiB since (auto-gc fires at 6,700 loose objects; 4,589 is under
    the line, so this was a manual or a `git fetch`-triggered pack). The loose half is zlib per
    object with no deltas, which is where the 151 full copies of `docs/history/progress-2026-09.md`
    (64.35 MB of blob versions) and the 541 of the old root `progress.md` (170.0 MB) cost the most;
    packed, an append-only text file deltas to a few KB per version.
  - Summed over every version of every file, history holds roughly 570 MB of blob bytes. The
    heaviest paths, and whether they are still in the tree: root `progress.md` 170.0 MB / 541
    versions (the file is now a 38 KB index); `e2e/__screenshots__` 127.08 MB / 225 blobs (24 live,
    201 superseded baselines); `docs/history/progress-2026-09.md` 64.35 MB / 151; `src/components`
    36.5 MB / 2,786; `src/app` 31.7 MB / 2,172; **`docs/contract/` 26.86 MB / 11 blobs, deleted on
    2026-08-08 (`5bcbf611`)** — ten full-page reference PNGs of 1.4-5.9 MB each plus one; `docs/planning`
    25.1 MB (the Catch-ups handover alone 10.83 MB / 56 versions); `public/images` 23.8 MB / 217, of
    which `landing.jpeg` once carried the 6.2 MB master (blob `d4f8e30a`, the same bytes as the
    ignored `landing-original.jpeg`), two `WhatsApp Image 2026-05-13 ...jpeg` files 3.05 MB, and the
    three current covers 6.79 MB; `docs/content/whatsapp-curation/overflow-stories.pdf` 1.59 MB,
    deleted; `package-lock.json` 18.6 MB / 39 versions.
  - So a history rewrite (`git filter-repo` dropping `docs/contract/`, the superseded baselines, the
    master JPEG, the two WhatsApp JPEGs, the PDF) would remove on the order of 150 MB of blob bytes
    before compression, perhaps 100-120 MB of pack. Against that: every commit id would change, and
    this repository cites commit ids everywhere — `progress.md`'s index lines, every `docs/history`
    entry, `docs/TRAPS.md`, both audit reports, the fix prompts, dozens of source comments ("audit
    C1-b", "`77dc9da` deleted ..."). Vercel's two projects would need a force-push each. The cost is
    real and permanent; the benefit is a faster `git clone` of a repository one person clones.
- **What to do**: `git gc` (plain; not `--aggressive`, not `--prune=now`) once, in a quiet moment
  when no other session is mid-commit; it is non-destructive and reversible in the sense that it
  changes no object anyone can name. Expected: loose objects → ~0, one or two packs, `.git` on the
  order of 150-180 MB. For the history question: describe it to the owner once (owner decision
  none — I am not raising it as a decision, because my recommendation is not to, and the brief says
  to raise decisions I would put to him). If he ever wants it, the list above is the shopping list.
- **Saving**: 0 tracked bytes; ~90-110 MB of local disk from `git gc`.
- **Risk & gate**: none for `git gc`. `git fsck` before and after if anyone is nervous; `git log
  --oneline -3` unchanged.
- **Confidence**: high on the numbers; medium on the post-gc size (packing ratios vary).
- **Notes**: the structural lesson is about *rate*, not *size*: 225 baseline blobs in five weeks and
  151 versions of one 587 KB file in seventeen days are what make the loose half grow between packs.
  Finding 04 lowers the first rate by ~30 % per global rebaseline; the second is the record and is
  fine once packed. The `AGENTS.md` block that `next dev` re-adds is 8 blobs and 0.02 MB; not a factor.

### tracked-weight-11 - Decide what a closed design campaign keeps: the Catch-ups rework's exploration files are 0.68 MB no living document links
- **Where**: `docs/planning/catchups-rework/directions/` — 10 files, 522,332 B (`01-front-door.md`
  54,550 … `10-letter.md` 54,556); `directions.md` 77,647 B; `library-draft.md` 7,935;
  `front-runner.md` 11,916. The living document: `handover.md` (343,356 B; 56 versions in history).
  The folder in total: 25 files, 1.45 MB, 3.2 % of everything tracked. The rule for audits:
  `docs/audit-fix/README.md:24`; the rule for campaigns: `docs/README.md:43-53`, which names only
  "a `brief.md` in the owner's own words and a living `handover.md` or `spec.md`" as what a
  campaign folder holds, and says nothing about the rest.
- **Phase**: relocate (to history, at close)
- **Tier**: T4 (a rule)     **Class**: structural     **Decides**: owner (owner decision 2)
- **Evidence**: the handover's own link inventory (every `](x.md)` in it) points at
  `review-2026-09-07.md` (6), `review-2026-09-09.md` (4), `review-2026-09-06.md` (3),
  `front-runner.md` (3), `features.md` (3), `architecture.md` (3), `spec.md` (2), `prior-art.md` (2),
  `brief.md` (2), `recon.md`, `magazine.md`, `library-draft.md`, `flows.md` (1 each) — **and never at
  `directions.md` or `directions/`**, which it mentions twice in prose. The status board
  (`handover.md:174-175`) records what those files were for: "S3 Directions ... ten directions, ten
  sketches. Second pass the same day, after he rejected most of them ('80% of t…')" and "Owner culls
  the sketches — DONE 2026-09-06: he went through all fifteen out loud, one at a time, and rejected
  all fifteen. Verbatim in `review-2026-09-06.md`". The memory rule about keeping near-misses
  ("considered and not taken") is about alternatives recorded *in the page* that decides
  (`handover.md:2362-2369` says so in as many words); it does not ask for the ten rejected room
  briefs to stay as files. `architecture.md` supersedes `directions.md` Part 1 (memory:
  "architecture.md is the settled shape"). The campaign is not closed: `S6+ Build` and `Build phase
  11` are `PARTIAL` (`:190-191`), so nothing should move today.
- **What to do**: when the campaign closes, apply the audit rule to it: keep `brief.md` (his words),
  `spec.md`, `architecture.md`, the three `review-*.md` (his verdicts, verbatim), `features.md`,
  `magazine.md`, `recon.md`, `flows.md`, `prior-art.md` and the final `handover.md`; send
  `directions/`, `directions.md`, `library-draft.md` and `front-runner.md` to history with the same
  one-line pointer the audit folders use. Write the rule into `docs/README.md:43-53` so the next
  campaign (`collection-rework/` is at "the close-out and the owner's own eyes", `valley/` is open)
  follows it without a session having to decide.
- **Saving**: **−619,830 B tracked (0.59 MB), −13 files**, ~9,000 markdown lines out of the tree
  (moved, not deleted); more when the handover stops being rewritten (its 56 versions are 10.8 MB
  of history already).
- **Risk & gate**: low; `git grep -n "directions/"` after the move must return only the pointer
  lines; `npm run check` (nothing reads `docs/planning` except `progress-log.test.mjs`, which reads
  `progress.md` and `docs/history`).
- **Confidence**: high on the link inventory and the board; the recommendation is the owner's to
  take or leave, which is why it is a T4 and an owner decision rather than a T1.
- **Notes**: I am deliberately not proposing to touch `prior-art.md` (143 KB) or `recon.md` (64 KB):
  the handover tells every session to read both before disagreeing with a recommendation, so they
  are live while the campaign is. The docs lens may weigh their prose; I only weigh bytes.

## Owner decisions

1. **Where should the full-size originals of the three Catch-up photographs live?** *What I'd
   change*: keep a web-sized copy in the code (about a quarter to a fifth of today's size, at the
   largest size any screen can ask for) and treat the camera-resolution files as originals, which
   already live in your photo library and in git's history. *What you'd notice*: nothing on the
   site; it already serves resized copies of these, and the one place the raw file is shown is a
   thumbnail in the picture chooser, which would open about 5 MB lighter. *If I guess wrong*: a
   future surface that wanted more than 3,840 pixels across (no screen does today) would re-export
   from the original. *Options*, in plain words: (a) shrink them in place, same file names, nothing
   else moves; (b) also move the whole pool onto the image host, which saves the full 6.5 MB from the
   code but needs a database change and a test change, because every Catch-up stores its picture's
   path; (c) leave them. *If you don't reply*: (a), at the 3,840-pixel size. `[tracked-weight-01]`

2. **When a design campaign finishes, what stays in the folder?** *What I'd change*: give design
   campaigns the same rule the audits already have — the brief in your words, the spec, the
   architecture page, your review notes and the final handover stay; the exploration (for the
   Catch-ups, the ten rejected direction briefs and two drafts, about 0.6 MB) goes to git history
   with a pointer. *What you'd notice*: nothing on the site; a shorter folder to read next time.
   *If I guess wrong*: any of it comes back with one git command, and the pointer says which.
   *Options*: (a) adopt the rule and apply it when each campaign closes; (b) keep everything
   forever; (c) apply it now to the Catch-ups folder even though phases 7-11 are still open.
   *If you don't reply*: (a). `[tracked-weight-11]`

3. **Pictures only the lab uses are shipped to both websites.** *What I'd change*: first put them in
   one folder (`public/lab/`, about 3.5 MB: the eleven crop specimens, the two terrain heightmaps,
   and eleven old Collection stand-ins only lab rooms still draw), then decide once whether they
   stay in the code, move to the image host, or go when the crop room goes, as that room's own
   header says it should one day. *What you'd notice*: nothing; no member's page asks for any of
   them, and the public demo cannot even reach the rooms that do. *If I guess wrong*: a lab room
   shows a broken picture, and only you look at the lab. *Options*: (a) gather them and leave them
   (costs 3.5 MB in the code and in every deploy, nothing else); (b) move them to the image host
   (3.5 MB out of the code; the rooms then need the internet, and the terrain room needs one
   cross-origin line); (c) retire the crop room and its 1.5 MB now. *If you don't reply*: (a).
   `[tracked-weight-07]`

4. **The picture memory carries the valley photograph twice over.** *What I'd change*: during the
   screenshot the suite takes of each page, hide the faint valley photograph that sits at 9 %
   behind every signed-in page — it is what makes those files 5-8 times heavier than a page of text
   — and keep the front door's photograph visible, because the front door's crop is designed. *What
   you'd notice*: nothing on the site; the folder of reference pictures would be about a third
   smaller and every future "everything moved" rebaseline would cost a third less. *If I guess
   wrong*: the one thing the hidden layer could ever catch — someone changing its opacity or its
   photograph — would go unwatched; that is a one-token change nobody makes by accident. *Options*:
   (a) hide the faint backdrop only; (b) hide the front-door photograph too (folder drops by two
   thirds, but the designed crop is no longer watched); (c) leave it. *If you don't reply*: (a).
   `[tracked-weight-04, with the T17 lens]`

5. **The printed magazines on disk.** *What I'd change*: the script that prints a Catch-up Edition
   to PDF keeps every run it has ever made (about 230 MB of PDFs and page images, holding members'
   words) beside itself; I would have it keep only the latest run and delete the rest once, with
   your yes, because it is your members' writing and your measurement. *What you'd notice*: 230 MB
   back on disk; nothing on the site. *If I guess wrong*: a printed magazine you wanted to keep is
   gone — so say if any of them matter, and they go into your own folder instead. *Options*: (a)
   keep the latest run, delete the rest, the script cleans up after itself from then on; (b) move
   them all into your own folder outside the code; (c) leave them. *If you don't reply*: (a).
   `[tracked-weight-09]`

## Not-findings

- **`e2e/__screenshots__` being committed at all** (12.02 MB). The picture memory, on purpose
  (`docs/OPERATIONS.md` §1; audit 1 and 2 both re-confirmed). Finding 04 is about what the pixels
  contain, never about whether they are tracked.
- **The rebaseline practice.** Audit 2 asked that a deliberate UI change rebaseline only the routes
  it moved. Of the 11 baseline commits since, eight touched 1-2 files and the three that touched
  12-23 were the brand lockup, the sidebar mark and the header controls — global by nature. Being
  followed.
- **`public/images/birds/` (102 PNG, 0.67 MB, 480 px).** Alive: `bird-avatar.tsx:46-51`
  `contactPhotoSrc` builds `/images/birds/${species}-${flip}.png`, called by
  `src/components/profile/get-in-touch.tsx:274` for the saved contact card's photo (re-encoded to
  JPEG on a canvas because Apple Contacts takes no WebP). Generated by
  `scripts/dev/generate-bird-photos.mjs`, documented in `docs/spec/avatars.md:24`. WebP sources
  would decode on the same canvas and halve the folder, but 102 files at 6.6 KB each is not a
  weight problem.
- **The demo seed's fourteen Collection images plus `c1`/`c3` (16 files, 2.04 MB).** Templated by
  `src/lib/demo-seed/seed.ts:319` over `DEMO_PHOTOS` (`content.ts:698-781`) and opened with sharp by
  `content.test.mjs` to assert dimensions and thumb ratios; `c1`/`c3` are post images at
  `content.ts:115`. They deploy to the owner's site too, where the seed never runs, and there is no
  static-asset switch that follows `DEMO_MODE` — accepted as the price of a self-contained seed.
- **`public/lab/valley/` tracked while `public/lab/wall/` is ignored.** One rule, consistent: the
  wall atlas is real members' thumbnails (`.gitignore:117-119`) and is regenerated locally; the
  heightmaps are public Mapzen/SRTM terrain (`valley-terrain.mjs:5-12`), fetched by the room at
  runtime (`_hills.tsx:65-67`), so a deploy must carry them and regenerating needs the network.
  Worth one sentence in `.gitignore`'s wall comment ("public data a room needs at deploy is
  tracked; members' data is not") so a third lab asset follows it; folded into finding 08's edit
  if convenient. 16-bit heights packed into R and G at 512x512 compress to 242-282 KB; a
  single-channel 16-bit PNG would be about the same size, so no re-encode.
- **`public/geo/countries-110m.json` (107,761 B).** Served, not bundled, with an immutable header
  (`next.config.ts:276-286`); audit 2's not-finding, re-verified.
- **`public/images/icons/` (4 PNG, 152 KB) and `src/app/apple-icon.png`.** The manifest icons
  (`src/app/manifest.ts:31-55`), generated by `scripts/dev/generate-icons.mjs`; the maskable one is
  pinned by `src/lib/app-icon-safe-zone.test.mjs:38`.
- **`docs/history/` (4 files, 1.16 MB).** The record, by rule (`docs/README.md:57-59`: "Nothing
  reads them; they are the record"). `progress-2026-09.md` grew 387 → 587 KB from 09-08 to 09-24,
  ~88 KB a week — a third of the rate audit 2 measured on the old root file. Its 151 rewrites are a
  `.git` matter (finding 10), not a tracked-weight one.
- **Root `progress.md` (492 lines, 38,544 B).** Audit 2's 600 KB headline, closed by the 2026-09-07
  inversion (`25bf7033`); `scripts/qa/progress-log.test.mjs` keeps it an index.
- **`package-lock.json` (431,593 B, 83 % of the root's tracked bytes).** Generated, root-pinned,
  and 110 KB smaller than at audit 2 thanks to the dependency cuts. A fact, not a finding.
- **The twelve magazine fixtures (733 KB).** Their size is their purpose: `wall-300.json` is a
  300-note wall and `no-photos.json` a photograph-less Edition because `magazine.test.mjs:12-27`
  runs the grammar over "literally every type of content we might come across" (his ¶51). Where
  they live is a question for T15 (see "For other lenses"); how big they are is not.
- **The imported skill packs (43 dirs, 0.62 MB) and the four uncited agents.** Byte-identical to
  audit 2 (`.claude/skills` +0.00 MB, four commits since, all to the repo's own skills). Audit 2's
  owner decisions 2 and 4 are still the place they are decided; not re-argued here.
- **The 28 `.DS_Store` files.** All ignored (`:10`), zero tracked, 25 at audit 2 and 19 at audit 1
  after a sweep. Audit 2's recommendation stands: accept them; a sweep does not hold.
- **`e2e/.output/` and `e2e/.report/` (27 MB).** Per-run Playwright output, ignored, rewritten each
  run; `npm run visual:report` reads the latter.
- **`.next/` at 4.9 GB and `node_modules/` at 1.2 GB.** The former is normal by CLAUDE.md's own
  words; the latter is the dependency lens's. Together they are 82 % of the folder, which is worth
  the owner knowing when he looks at "storage space of this folder": the tracked repository is
  0.6 % of it.
- **`sanan's stuff/` (206 MB).** Audit 1's owner decision 5, unchanged; not opened; state only.

## Audit carry-overs in this territory

- **root-assets-01 and -02 (progress.md's size and its two chronologies): DONE**, 2026-09-07
  `25bf7033`, by inverting the convention (index at the root, full entries in `docs/history/`,
  `progress-log.test.mjs` enforcing). Root file 600 KB → 38.5 KB. Audit 2's owner decision 1 was
  answered with its option (c).
- **root-assets-03 (four dead binaries, 410 KB): DONE**, `2046bff1` 2026-09-05. The five landing
  showcase shots (283 KB) also went, `f8ef8a20` 2026-09-07 — but the code that names them stayed
  (see "For other lenses", landing).
- **root-assets-04, -05, -12 (imported skill packs, `planning-with-files`, four uncited agents):
  OPEN, unchanged.** 52 skill dirs today (audit 2 counted 53), 0.65 MB, the 38 March imports
  untouched; `planning-with-files/SKILL.md` and its hooks block still present; the four agents still
  present. Audit 2's fix-prompt row 18 records the owner's words on the agents ("delete all and stop
  writing info except to [three named] ... they seem useful so let's keep them for now").
- **root-assets-06 (CLAUDE.md's stale numbers): PARTIAL.** The test-file count and the "11 routes"
  sentence are gone (CLAUDE.md now says "every `*.test.mjs` the repo tracks" and "every route in
  `ROUTES`"); the skills table still names `/impeccable` (`/audit`, `/polish`, `/typeset`), which
  do not resolve.
- **root-assets-07 (the baselines' weight): re-measured here as finding 04**, with the cause
  corrected (the photograph, not the full-page routes). No policy change landed; the catchups band
  mask took 0.78 MB off.
- **root-assets-08 (dead `.gitignore` lines): OPEN**, finding 08.
- **root-assets-09 (`look.mjs` writing to the root): DONE**, `scripts/dev/apple-edge/look.mjs:21`
  writes `e2e/.shots/edge`; the `.tmp-shots/` ignore line is gone.
- **root-assets-10 (`.DS_Store`): 28 today; accept**, as audit 2 recommended.
- **root-assets-11 (a retention rule for `e2e/.shots`; delete the two `.claude` piles): PARTIAL
  and decayed.** The command exists (`shots:clean`, `29790d82`); nothing runs it; the pile is 3.4x
  audit 2's; the two `.claude` piles are still there. Finding 05.
- **root-assets-13 (`.scratch/` 3.3 GB): DONE**, gone from disk.
- **Audit 1 owner decision 1 (the landing showcase): the assets were deleted 2026-09-07 while the
  code was kept** (knip lists the showcase family as unused-but-kept per audit-2 Q1).
  `src/components/landing/shots.ts:22-56` now names five files that do not exist
  (`/images/landing/*-v2.webp`, `collection.webp`), and `src/app/lab/landings/_shared.ts` and
  `showcase.tsx:97` read that table. Nothing shipped renders them; `/lab/landings` is registered
  (`_registry.ts:155`) and would show broken pictures. For the landing/lab lens.
- **Audit 1 owner decision 5 (`sanan's stuff/` leaves the repo folder): OPEN**, 206 MB.
- **Audit 2 owner decision 5 (the `e2e/.shots` line in a close-out routine): became the command,
  not the routine.** Finding 05 is the routine.

## For other lenses

- **catchups** — `src/components/catchups/home/picture-picker-dialog.tsx:222-227, 264-268` draws
  every pool photograph through a raw `<img>` at thumbnail size (155x62 CSS px on a phone), so
  opening the picker downloads 6.8 MB today and ~1.2-2.2 MB after finding 01. The comment at
  `:218-221` explains the raw element for R2 uploads; the pool entries are static public paths and
  could go through `next/image` with `sizes="180px"` without touching the upload path. Also: when
  he adds the next seventeen photographs, the export size in finding 01 should be the rule.
- **landing / lab** — `src/components/landing/shots.ts` names five deleted files (see carry-overs);
  either the table and `showcase.tsx`/`_variant-*` go with the images, or the images come back. And
  the hero: `landing.jpeg` is 1680 px wide under `sizes="100vw"`, so a 2x 1440 laptop gets it
  upscaled 1.7x; the 6.2 MB master is on disk to re-export a 2880-wide q75 copy at ~400 KB.
  `app-shell.tsx:66`'s raw CSS `url()` of the same file is my finding 06.
- **T15 (lab)** — `src/app/lab/catchups/_fixtures/magazine/*.json` (12 files, 733 KB, 21 % of the
  lab's bytes) are test data for shipped code: `src/lib/magazine/magazine.test.mjs:3` imports
  `wholeCorpus` from `src/app/lab/catchups/_fixtures/magazine/corpus.ts`, the one place a shipped
  `src/lib` test reaches into the lab. A move to `src/lib/magazine/__fixtures__/` (with the room
  importing from there) is 0 bytes and removes the cross-boundary import; whether the room or the
  engine owns the corpus is T15's call. Separately, `src/app/lab/everything/_findings.ts` (87.5 KB)
  is a July audit log compiled into the owner's build as a room; the fourth-largest lab file.
- **lib-tests** — the same test parses 733 KB of JSON plus `pressure.ts` on every `npm run check`
  (`corpus.ts:39-47`); if the 45.9 s gate is being attributed, that is one measurable slice.
- **docs** — `CLAUDE.md` is 354 lines / 26.8 KB (+3.9 KB since audit 2, +8 KB since audit 1) and is
  loaded into every session's context — roughly 6,500 tokens per session before a word of work;
  its skills table still names four commands that do not resolve (carry-over 06). The Catch-ups
  handover (343 KB, 56 versions) is the largest living document; finding 11 is what happens to its
  siblings at close. `docs/audit-fix/README.md:24`'s rule needs a trigger (finding 02's note).
- **scripts** — finding 05 (wire `shots:clean`), finding 09 (`print-magazine.mjs` cleaning its own
  previous run; `.exports/` keeping the newest date), and audits 1-2's standing note that the QA
  scripts write ~570 KB PNGs where WebP at q72 would be a third of that.
- **T17 (e2e)** — finding 04 in full: `toHaveScreenshot`'s `style` option against `.valley-tree`;
  the hero stays. The numbers to expect are in the finding; measure with one run before deciding.
- **T20 (`.claude`)** — 0.69 MB, 86 % imported, byte-identical to audit 2; the weight argument has
  not changed, so I have not repeated it.
- **bundle / runtime-perf** — `deviceSizes` tops out at 3840 (`next.config.ts:394`) and every
  shipped `sizes` tops out at 1180 CSS px, which is the arithmetic behind finding 01; and the
  member-facing bytes in findings 01 (picker) and 06 (backdrop) are first-load, not repeat-load,
  because Vercel serves `public/` with `max-age=0, must-revalidate`.
- **orchestrator** — this audit's own `work/raw/` is 1.6 MB before any report; the README's rule
  means it is committed at close and removed when the campaign closes (finding 02, step 4). A
  ~20-line `scripts/qa/*.test.mjs` that fails on a `work/` folder under a README-Closed audit would
  make the rule self-enforcing.

## Metrics

- **Lines read**: about 3,300 (audit 2's `root-assets.md` 1,050; the brief and charters 540;
  `CLAUDE.md`/`AGENTS.md` 404; `.gitignore` 119; `visual.spec.ts` 130; `playwright.config.ts` 65;
  the two docs READMEs 100; `catchup-pictures.ts` 105 and its test 70; the picker 70; the
  picture door 26; `hero-photo.ts` 30; `shots.ts` 60; `app-shell.tsx` 21; `bird-avatar.tsx` 33;
  `valley-terrain.mjs` 60; `print-magazine.mjs` 30; `corpus.ts` 60; `magazine.test.mjs` 40; the
  migration 40; three campaign handovers' heads and boards ~120; the audit-2 board 80; assorted
  excerpts ~140). Files measured individually: 488. Commands run: ~60, all read-only.
- **Tracked**: 44.90 MB / 1,632 files at `70570bcd`; 32.19 MB / 1,252 at `72b5a1d`; +12.71 MB /
  +380 files (499 added, 119 deleted). By extension: 507 tsx, 302 ts, 237 md, 201 mjs, 135 png,
  88 sql, 56 txt, 39 webp, 32 json, 6 svg, 6 css, 5 js, 4 yml, 2 yaml, 2 mts, 1 jpeg. Pictures
  (png+webp+jpeg+svg) 25.4 MB = 56.6 %; markdown 8.6 MB = 19 %; code 10.4 MB = 23 %.
- **Biggest tracked files**: `shaded-path.webp` 3,346,288; `desktop/landing.png` 2,442,705;
  `boulder-hill.webp` 1,840,694; `stone-benches.webp` 1,601,734; `desktop/login.png` 1,597,144;
  `desktop/birds.png` 1,226,045; `desktop/about.png` 1,083,678; `desktop/support.png` 992,978;
  `mobile/landing.png` 629,530; `docs/history/progress-2026-09.md` 587,129; `desktop/privacy.png`
  580,499; `progress-2026-08.md` 552,367; `mobile/birds.png` 548,461; `desktop/letters.png` 515,275;
  `mobile/privacy.png` 502,451; `landing.jpeg` 498,076; audit-2 `findings-index.json` 476,609;
  `package-lock.json` 431,593. The largest source file in the repository is
  `src/app/(main)/catchups/actions.ts` at 126,037 B (52nd overall); the largest lab file is
  `wall-300.json` at 196,917 B.
- **`public/`**: 158 tracked files, 13.47 MB (`images/catchups` 6.47 / 3; `images/collection` 3.57
  / 25; `lab/crop` 1.51 / 11; `images/birds` 0.67 / 102; `lab/valley` 0.50 / 4; `landing.jpeg` 0.48;
  `images/icons` 0.15 / 4; `geo` 0.10 / 1; `brand` 0.01 / 6; `email` 1,461 B). On disk 21,996 KiB:
  `landing-original.jpeg` 6.2 MB (ignored master) and `lab/wall/` 1.8 MB (ignored atlas) make the
  difference. Files over 100 KB: 29, all measured (table in the Findings' evidence). Files with zero
  references outside `.gitignore`: 0 binaries (the four brand SVGs, 3,955 B, are the kept brand
  source per audit 1).
- **`e2e/__screenshots__`**: 24 files, 12,600,859 B (desktop 9,744,034; mobile 2,856,825); all 8-bit
  RGB, 1x; hero pages 4,686,782 (37.2 %), backdrop-carrying full pages 4,534,149 (36.0 %), `/privacy`
  1,082,950 (8.6 %), band routes 2,296,978 (18.2 %). History: 225 blobs / 127.08 MB (157 / 101 MB at
  audit 2; +68 blobs in 11 commits). Bytes per pixel: `/` 1.885, `/login` 1.232, `/about` 0.836,
  `/birds` 0.545, `/support` 0.502, `/letters` 0.398, `/directory` 0.263, `/catchups` 0.193,
  `/collection` 0.192, `/feed` 0.179, `/privacy` 0.105; mobile `/login` 0.053.
- **`docs/`**: 212 files, 7.77 MB: `audit-fix` 4.16 / 139 (audit 2's `work/` 3.65 / 122; bug audit
  2's `work/` 0.08 / 7); `planning` 1.86 / 44 (`catchups-rework` 1.45 / 25, of which `directions/`
  0.50 / 10 and `handover.md` 0.33); `history` 1.16 / 4; `spec` 0.36 / 15; `content` 0.15 / 5; the
  five top-level docs 0.10.
- **`src/app/lab`**: 201 files, 3.44 MB (1.89 / 112 at audit 2); 12 JSON fixtures 733,268 B; 66
  `page.lab.tsx`.
- **`.claude/`**: 104 tracked files, 0.69 MB, +0.00 since audit 2; 52 skill dirs; 8 agents. On disk
  18,228 KiB, of which `shots/` 9,604 and `_disabled-gsd/` 7,548 are dead.
- **Root**: 15 tracked files, 0.52 MB; 31 entries in `ls -la` (audit 2: 32, `.scratch/` gone);
  `progress.md` 492 lines / 38,544 B; `CLAUDE.md` 354 / 26,812; `next.config.ts` 26,576;
  `package-lock.json` 431,593 (83 % of the root).
- **`.git`**: 273,272 KiB; 4,589 loose / 99.66 MiB; 18,680 packed / 166.00 MiB in 3 packs; 1,483
  commits (347 since audit 2). History blob bytes ~570 MB, led by root `progress.md` 170.0 MB / 541
  versions, `e2e/__screenshots__` 127.1 MB / 225, `docs/history/progress-2026-09.md` 64.4 MB / 151,
  the deleted `docs/contract/` 26.9 MB / 11, `package-lock.json` 18.6 MB / 39.
- **On disk**: 7,511,516 KiB total; `.next` 65.8 %, `node_modules` 16.0 %, `e2e` 7.4 % (`.shots/`
  518,652 KiB, 908 files, 230 older than 7 days = 131 MB), `.git` 3.6 %, `scripts` 3.4 %
  (`dev/.magazine/` 230,700, `dev/.exports/` 23,796), `sanan's stuff/` 2.7 %, everything tracked
  0.6 %. `.DS_Store`: 28 (all ignored).
- **Projected savings if every autonomous row lands**: tracked −8.3 to −9.9 MB (01: 4.0-5.5; 02:
  3.49; 03: 0.08; 04: ~3.5 at the owner's yes, counted separately; 06: +0.05), i.e. 18-22 % of the
  repository without an owner decision and ~26-30 % with decision 4; local disk −520 MB (05),
  −230 MB (09, owner), −17 MB (05), −90-110 MB (10); one member-facing dialog 6.8 MB → ~1.2-2.2 MB;
  one first-load asset 498 KB → ~45 KB. Structural findings 9, cheap 2; autonomous 8, owner 3; tiers T1 4 (02, 03, 08, 10), T2 5 (01, 05, 06, 07, 09), T3 1 (04), T4 1 (11).
