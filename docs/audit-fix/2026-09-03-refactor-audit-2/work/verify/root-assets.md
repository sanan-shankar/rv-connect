# verify/root-assets — adversarial verification of cluster `root-assets`

Verifier pass, 2026-09-04. Tree HEAD has moved since the find phase: the finder measured at
`72b5a1d`; HEAD is now **`74cc61a`** ("fix(retention): notifications are kept 30 days,
everywhere"). `git status --short` shows `M docs/audit-fix/README.md`, `M progress.md` and the
untracked audit folder — another session's WIP. **Every number below was recomputed by me**,
against `72b5a1d` where the finding named that sha and against HEAD where the claim is about
"today". Read-only throughout: `git show/log/ls-files/cat-file`, `grep`, `wc`, `find`, `stat`,
`du`, one `python3` line-segmenting script over a `git show` dump in `/tmp`. No build, no
browser, no database, nothing written outside this file.

Verdict summary: **11 confirmed or confirmed-with-correction, 0 refuted, 2 with a sub-claim
that needs the live database.** The finder's territory work is unusually accurate — the exact
byte figures (108,648 / 152,102 / 61,428 / 619,393 / 420,350 / 13,589,284 / 10,881,159 /
2,708,125 / 106,153,137 / 192,612 / 40,135) all reproduce **to the byte**. The errors are
concentrated in one place: the `progress.md` growth table in root-assets-01 pairs a line count
from one sha with a byte count from a different one, and root-assets-04's *headline* counts
(53 dirs, "the repo's own ten", "38 … all trace to 6c686cb") are each off by one against a
body that is otherwise exact.

---

## root-assets-01 — archive August out of progress.md — **confirmed-with-correction**

Reproduced at `72b5a1d`: `git show 72b5a1d:progress.md | wc -l -c` → **8,545 lines /
600,161 bytes**; `grep -c '^## '` → **202**. Exact match.

The August figure is right once you count the three dateless `## Round N` headers that sit
inside block 2's August range (lines 4791, 4816, 4897). Segmenting the file by header and
summing:

| month | lines | bytes |
|---|---|---|
| 2026-08 (dated headers) | 7,397 | 518,833 |
| the three `## Round N` segments (August content) | ~444 | ~32,900 |
| **August total** | **~7,841** | **~551,700** |
| 2026-09 | 696 | 47,921 |
| `## Earlier months` + preamble | ~9 | ~500 |

So the finding's *"roughly 7,900 lines / ~555 KB"* for August is **correct**, and its projected
residue of "~640 lines / ~45 KB" is a slight undercount — the honest figure is **~705 lines /
~48 KB**. Still a 92 % cut.

**The correction is the growth table.** Each of its five rows is right against *some* commit,
but two rows pair mismatched measurements:

| the finding's row | what I measured |
|---|---|
| 2026-08-26 `dbc9c06` — 4,101 lines, "~256 KB" | `dbc9c06` is **4,101 lines / 291,911 B**. 255,986 B is the size at **`827e650`** (the archive commit itself, 3,575 lines) — a different sha. |
| 2026-08-28 `6915627` — 6,527 lines, 433,986 B | **6,527 lines / 460,613 B**. Line count right, byte count wrong by 26,627 B; I cannot reproduce 433,986 at any sha I checked. |
| 2026-08-30 `8d3f51b` — 7,483 lines | **7,483 / 527,872** ✓ |
| "2026-09-01" `1f89b86` — 7,849 lines | **7,849 / 552,240** ✓ but the commit is dated **2026-08-31**, not 09-01. |
| 2026-09-03 `72b5a1d` — 8,545 / 600,161 | ✓ exact |

Consequently the headline *"+4,444 lines and +344,175 bytes in eight days"* mixes baselines:
+4,444 lines is against `dbc9c06`, +344,175 bytes is against `827e650`. Pick one and the
figures are:
- vs `827e650` (the archive commit, 2026-08-26): **+4,970 lines / +344,175 B** in 8 days =
  621 lines/day, ~301 KB/week.
- vs `dbc9c06` (later the same day): **+4,444 lines / +308,250 B** = 555 lines/day,
  ~269 KB/week.
Either way the finding's conclusion is unaffected and if anything understated.

Verified as stated: *"86 % larger than the 322,948 bytes audit 1 condemned it at"* —
600,161 / 322,948 = 1.858 ✓ (audit 1's number is in its own
`work/findings-index.json:2645`). The archive rule exists at **`docs/README.md:36-37`** ✓ and
at `progress.md:4399-4405` ✓ (`## Earlier months` is at line 4399 exactly; the sentence *"A
month moves there once it is closed, in the same commit as an ordinary session entry"* is
line 4405, not 4404). `docs/history/progress-2026-06.md` = 650 lines, `-07.md` = 241 ✓, both
by `827e650` (2026-08-26) ✓.

**Zero path consumers confirmed.** `git grep -n "progress\.md"` outside the file returns only
prose: `CLAUDE.md:30,78,117`, `docs/README.md:12,36`, `docs/spec/admin.md:224,622`,
`next.config.ts:329` (a quote in a comment), `scripts/qa/audit-status.mjs:22,714` (both inside
comments/`console.log` strings), and the ten hits inside
`.claude/skills/planning-with-files/SKILL.md`, which mean a different file. Nothing parses it.

Root tracked bytes at HEAD: 1,211,482 across 15 files (`progress.md` 601,629 = 49.7 %,
`package-lock.json` 541,687 = 44.7 %, together 94.4 %). At `72b5a1d` that is 1,210,014 — the
finding says 1,209,974, a 40-byte discrepancy I could not source and do not care about.

**One thing the fixer must know that the finding did not flag**: the finder recommends a
7-day-grace globbing test in `scripts/qa/`. That is the right shape, but see root-assets-02 —
`docs/README.md:12` calls the file *"append-only"*, which is a written convention the reflow
proposal contradicts. Settle the order question before writing the test.

## root-assets-02 — two chronologies, September at both ends — **confirmed-with-correction**

All structural claims reproduce at `72b5a1d`:
- `## Earlier months` at **line 4399** ✓; block 2 opens at **4406** with
  `## 2026-08-11 - Forgot password, email confirmation, and a send queue` ✓.
- Block 1 (lines 1-4398): **94** `## ` headers ✓, line 3 is `## 2026-09-02 — four fast-uri
  advisories, closed with an override` ✓, last header at **4365**
  `## Session 2026-08-14 — Signup goes calm (Revolut reference) + landing frost timing` ✓ —
  newest-first.
- Block 2 (lines 4406-8545): **107** headers ✓, oldest-first, last header at **line 8515**,
  `## 2026-09-03 — the viewer stops letting go of the page, and of its own controls` ✓ —
  the newest entry in the file, at the very bottom.
- September split: **16 in block 1, 2 in block 2** ✓ exactly.

**The correction is to the recommendation, not the finding.** The finder recommends
"newest-first, appended at the top" and says the file "does not say which end is the head."
It does, once, elsewhere: **`docs/README.md:12`** reads *"`progress.md` — running session
history, **append-only**. Closed months are archived to `docs/history/` … so this file holds
the current month."* "Append-only" is the ordinary reading of add-at-the-end, i.e.
**oldest-first**, which is what block 2 does and what the two `docs/history/` archives
preserve. So the ambiguity is real and the finding stands, but a fix session must reconcile
`docs/README.md:12` in the same commit rather than assume the field is empty, and the owner
may prefer oldest-first for exactly that reason. Whichever way it goes, the losslessness diff
the finding prescribes is the right gate.

## root-assets-03 — four unreferenced tracked binaries in public/ — **confirmed** (one sub-claim needs the DB)

Byte-exact at HEAD:

| file | bytes |
|---|---|
| `public/lab/crop/pano-21x9.webp` | 153,150 |
| `public/lab/crop/phone-9x16.webp` | 141,394 |
| `public/lab/crop/grainy-420.webp` | 38,124 |
| `public/images/collection/c3-thumb.webp` | 87,682 |
| **total** | **420,350** |

`public/` tracked = **58 files / 6,806,736 B** ✓, so 420,350 is **6.2 %** ✓.

I went past the finder's grep, per my charter:
- **Reference grep**: `git grep -l -F "<basename>" -- ':!docs/audit-fix'` returns **nothing**
  for all four, not even inside `public/`.
- **CSS `url()`**: `grep -c "url(" src/app/globals.css` = **0**; the only tracked `.css` file
  containing `url(` in the whole repo is
  `.claude/skills/front-review/examples/css/dashboard.css`, a vendor example. No CSS path in.
- **Web manifest**: `src/app/manifest.ts` names exactly four icons —
  `/images/icons/icon-{192,512,1024}.png` and `icon-maskable-512.png`. None of the four.
- **Template construction**: `src/lib/demo-seed/seed.ts:317-318` builds
  `/images/collection/${ph.file}.webp` and `-thumb.webp` over
  `[...GENERATED_PHOTOS, ...DEMO_PHOTOS]`. `GENERATED_PHOTOS` is `[]`
  (`src/lib/demo-seed/photos.generated.ts:15`) and `DEMO_PHOTOS` has six `file:` values, all
  `demo-*`. `c3` is not among them.
- **The one near-miss the finder did not name**: `src/app/lab/tiles/_specimens.tsx:108` reads
  `P("c3", "Krish Chhugani")`. That `"c3"` is a fake **person id** fed to `BirdAvatar`
  (`const P = (id, name) => ({ id, name, photoUrl: null, birdOverride: null })`, line 104), not
  a photo path. Not a reference. Worth recording so nobody re-raises it.
- **Built output**: the four names appear in `.next/server/**/*.nft.json`, but that is Next's
  file-trace manifest listing **all 58** public files wholesale for every route (an API route's
  nft.json contains the same 58). **No `.next/static` chunk references any of them.**
- `git grep -n "readdirSync" -- src/app/lab` is empty ✓ — no dynamic path in.

History confirms the supersession story exactly: the three crop files were added by
**`26dc483` (2026-08-27, "six ways to hold a photograph…")** and never touched again;
**`6fb0780` (2026-08-28, "the crop room shows what we do, not what we might do")** landed the
next day; `_specimens.ts` now lists exactly **eleven** `src` values, all `/lab/crop/shape-*.webp`
(lines 36-126) ✓. `c3-thumb.webp` was added by **`c559d3e` (2026-06-28)** and has exactly one
commit in its history ✓. `77dc9da` (2026-08-26, "delete the collection images nothing loads")
removed v4-v6, c5-c6, their thumbs and the twelve `gen/` SVGs — 22 files — and did not touch
`c3-thumb` ✓, so "audit-1 finding 17 missed one file" is right. That commit's own message says
it checked *"against both databases"*, which is the same SELECT the finding prescribes.

**Sub-claim `c3-thumb` is safe to delete: unverifiable-needs-db.** Static evidence is complete;
only the live and demo `Photo` tables can close it. The SELECT the finding wrote is the correct
one and must run first.

## root-assets-04 — 38 vendored skill packs — **confirmed-with-correction**

Every *byte* figure reproduces exactly. Three *count* figures are off by one each.

**Correct as written:**
- `superpowers-*`: **14 dirs, 108,648 B** ✓ (summed file by file).
- `impeccable-*`: **21 dirs, 152,102 B** ✓.
- `planning-with-files` 8,636 B ✓; `VibeSec-Skill` 24,779 B ✓.
- The eight from `ac2827b` (2026-08-21) ✓ including `code-review-skill` 23 files / 224,125 B ✓.
- **Imported: 43 dirs / 85 files / 18,578 lines / 619,393 B** ✓ — I reproduced 18,578 with
  `git ls-files .claude/skills | grep -v <the nine repo dirs> | xargs wc -l`.
- **Repo's own: 11 files / 61,428 B** ✓ exactly.
- `.claude` tracked total **104 files / 720,956 B** ✓ (= 96 skills files + 8 agents files).

**Corrections:**
1. **`.claude/skills/` holds 52 directories, not 53.** `ls -A` returns 53 entries because one
   of them is `.DS_Store` (22,532 B). And it holds **96** tracked files, not 104 — the 104 /
   720,956 B figures in the "Where" line are `.claude/` **as a whole**; skills alone are
   **680,821 B**. 52 − 43 imported = **9** repo-owned dirs, which is also the number the
   finding lists by name while calling them "ten".
2. **The "38 … all trace to `6c686cb`" bullet enumerates only 37** (14 + 21 + 1 + 1). 38 *is*
   the correct count of dirs untouched since 2026-03-30 — but the 38th is **`liftkit-spacing`**
   (last commit 2026-03-30), which the same finding elsewhere says explicitly not to delete
   because CLAUDE.md, `.claude/agents/screenshot-qa.md` and `docs/spec/media.md` all name it.
   A fix session must not read "38" as a delete list. The delete-candidate set is **37**.

**The reference grep is exactly right.** I ran
`git grep -l -F "<dir>" -- ':!.claude/skills' ':!docs/audit-fix'` for all 52:
- **37 return nothing at all**: 21 `impeccable-*`, 14 `superpowers-*`, `VibeSec-Skill`,
  `planning-with-files`.
- **8 return `progress.md` only**: `bug-hunt-swarm`, `code-review-skill`, `code-simplifier`,
  `find-bugs`, `front-refactor`, `front-review`, `goal-sloc`, `review-swarm` — precisely the
  eight named.
- **7 are cited by rules/specs**: `check`, `liftkit-spacing` (CLAUDE.md +
  `.claude/agents/screenshot-qa.md` + `docs/spec/media.md`), `screenshot-auth` (CLAUDE.md,
  `package.json`, `e2e/playwright.config.ts`, three `scripts/qa/*`), `tag-photos`,
  `tag-professions`, `ui-audit`, `writing-for-agents`.

**The shadowing claim is confirmed by direct observation of this session's own skill listing**,
which contains both families side by side and with the wording drift the finder quoted:
- vendored `superpowers-using-git-worktrees`: *"…creates isolated git worktrees with smart
  directory selection and safety verification"*
- plugin `superpowers:using-git-worktrees`: *"…ensures an isolated workspace exists via native
  tools or git worktree fallback"*
- vendored `superpowers-finishing-a-development-branch` carries the trailing *"- guides
  completion of development work by presenting structured options for merge, PR, or cleanup"*;
  the plugin's `superpowers:finishing-a-development-branch` has dropped it.
All 14 names appear in both forms. ✓

**Front-matter/directory mismatch confirmed**: `impeccable-audit/SKILL.md` declares
`name: audit`, `impeccable-polish` → `polish`, `impeccable-typeset` → `typeset`,
`impeccable-frontend-design` → `frontend-design`, `superpowers-brainstorming` →
`brainstorming`. My own listing shows them by **directory** name. ✓

## root-assets-05 — planning-with-files is a broken half-import — **confirmed**

Every element checked and every one true.
- `ls -R .claude/skills/planning-with-files/` → **`SKILL.md` only**. 241 lines / 8,636 B ✓.
- The `hooks:` block is **lines 6-24 exactly** (`hooks:` opens line 6; the `Stop` command is
  line 24, the last line before `metadata:`) ✓.
- `Stop` (line 24) is verbatim
  `SD="${CLAUDE_PLUGIN_ROOT:-$HOME/.claude/plugins/planning-with-files}/scripts"; powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$SD/check-complete.ps1" 2>/dev/null || sh "$SD/check-complete.sh"`
  — PowerShell on a Mac, falling back to a script the repo does not contain ✓.
- `PreToolUse` matcher is `"Write|Edit|Bash|Read|Glob|Grep"` with
  `cat task_plan.md 2>/dev/null | head -30 || true` ✓.
- `UserPromptSubmit` (line 10) runs `tail -20 progress.md 2>/dev/null` ✓ — against the root
  file, which as root-assets-02 proves is the **oldest** half of a two-block document.
- `PostToolUse` (line 20) says *"Update progress.md with what you just did"* ✓.
- Body: line 58 *"**Your planning files** go in **your project directory**"*, line 64 the table
  row `| Your project directory | task_plan.md, findings.md, progress.md |`, lines 70-72 and
  203-205 the three `templates/…` links to files that do not exist ✓.
- No referrer: `git grep -l "planning-with-files"` outside the skill = **zero**.

**One thing that strengthens it beyond what the finder could say**: the skill is **registered
and live right now** — `planning-with-files` appears in this session's own available-skills
listing, with its description advertising that it "Creates task_plan.md, findings.md, and
progress.md". So it is not an inert file in a folder; it is an installed skill whose stated
convention is to write three files into the closed repo root, one of them colliding by name
with the 600 KB session history. That makes the "safety edge" framing correct rather than
theoretical. Whether the *hooks* register is still harness behaviour neither of us can prove
read-only, and that uncertainty argues for removal.

## root-assets-06 — three stale CLAUDE.md numbers and four unresolvable skill names — **confirmed**

- **`CLAUDE.md:133`**: *"the unit-test suite (75 files as of 2026-08-25)"*.
  `git ls-files | grep -c "\.test\.mjs$"` = **102** ✓.
- **`CLAUDE.md:237`**: *"compares 11 routes x 2 viewports"*. `ROUTES` at
  `e2e/visual.spec.ts:28-68` has **12** entries (landing, login, feed, directory, letters,
  catchups, collection, collection-class, support, birds, about, privacy) and
  `git ls-files e2e/__screenshots__ | wc -l` = **24** = 12 × 2 ✓. `collection-class` came from
  `f08bc5e` (2026-08-29) ✓. Tiny correction: the array is lines **28-68** (the finding said
  28-67; 68 is the closing `];`).
- **`CLAUDE.md:206`**: `/impeccable` (`/audit`, `/polish`, `/typeset`). Confirmed against my own
  skill listing: the harness offers `impeccable-audit`, `impeccable-polish`,
  `impeccable-typeset` and there is **no** `/impeccable`, `/audit`, `/polish` or `/typeset`.
  Four names that resolve to nothing ✓.
- **`CLAUDE.md:203`**: `/frontend-design` **does** resolve — to the plugin
  `frontend-design:frontend-design`, not to the vendored `impeccable-frontend-design`. The
  finding says exactly this ✓.

## root-assets-07 — the visual baselines' weight and history — **confirmed-with-correction**

Every measurement reproduces to the byte:
- 24 files / **13,589,284 B** ✓. `desktop/landing.png` **2,512,790** ✓, `desktop/login.png`
  **1,639,795** ✓, `desktop/birds.png` **1,226,110** ✓, `mobile/login.png` **17,403** ✓
  (a 94× gap on the same page — real, and worth the look the finder asks for).
- `fullPage: route.live !== "band"` at **`e2e/visual.spec.ts:268`**; the screenshot call is
  **264-271** (the finding said fullPage on 267 — off by one; the range 264-271 is right).
- Five `band` routes (feed, letters, catchups, collection, collection-class) → 10 files at
  **2,708,125 B** ✓. Seven `fullPage` routes (landing, login, directory, support, birds, about,
  privacy — `directory` is `live: "map"`, which is *not* `"band"`, so it is full-page) → 14
  files at **10,881,159 B = 80.1 %** ✓.
- History: `git rev-list --objects --all -- e2e/__screenshots__ | git cat-file --batch-check`
  → **157 blobs / 106,153,137 B** ✓, across **39** commits ✓, first `fb6b29f` **2026-08-19** ✓.
- `.git` on disk **232 MB** (finding: 231 MB) — fine.

**Correction to the percentages.** Tracked tree at HEAD = **1,252 files / 33,759,557 B**, by
top-level dir: `e2e` 13,666,079 (33 files) · `src` 7,158,967 (771) · `public` 6,806,736 (58) ·
`docs` 3,428,455 (129) · root 1,211,482 (15) · `.claude` 720,956 (104) · `scripts` 533,752 (71)
· `prisma` 208,583 (66) · `.github` 24,547 (5). Every MiB figure in the finding's Metrics
section is right, but the derived shares are understated:
- baselines = 13,589,284 / 33,759,557 = **40.3 %**, not 39 %.
- `public/` = **20.2 %**, not 19 %.
- pictures together = **60.4 %**, not 58 %.
The finding's argument is unaffected and slightly strengthened.

## root-assets-08 — seven dead lines in .gitignore — **confirmed**

`.gitignore` is **119 lines** ✓ and the file **ends on a comment**: lines 116-119 are the
tagging session's working-folder comment with **no pattern beneath it** ✓, orphaned because
line 114 `scripts/dev/.*/` generalised it and its own comment (lines 108-113) says so
(*"One line, so a third pass is covered the day it is written."*) ✓.

`supabase/.temp/` at **line 92** with its comment at 91 ✓. `git grep -ln "supabase link\|npx
supabase\|supabase/"` returns **`.gitignore` alone**, and `ls -d supabase` → no such directory ✓.
No blank line between **107** (`scripts/dev/apple-edge/*.png`) and **108** (the next block's
comment) ✓ — every other block in the file is separated.

All other line references used across the cluster check out: `.DS_Store` at `:10`,
`/e2e/.shots/` at `:41`, `.claude/*` + the two un-ignores at `:64-66`, `sanan's stuff/` at
`:72`, `.scratch/` at `:81-82`, `.tmp-shots/` at `:99`. One nit: root-assets-12 cites
"`.gitignore:52-63`" for the "existed in exactly one place on one machine" note — that block
actually runs **49-66**, with the quoted sentence on lines 59-60.

## root-assets-09 — look.mjs still writes into the closed root — **confirmed**

`scripts/dev/apple-edge/look.mjs:17` is verbatim `const OUT = '.tmp-shots/edge';` with
`mkdirSync(OUT, { recursive: true });` on line 18 ✓. `git grep -n "tmp-shots"` returns
**exactly two hits**: that line and `.gitignore:99` ✓ — the ignore rule exists solely to hide
the violation. Dates check out: `look.mjs` was added by **`45e9bb4` (2026-08-27)**, one day
before **`c8d0e87` (2026-08-28, "chore(root): five entries leave the root and nothing goes
looking for them")**, which is why it was missed ✓. `.tmp-shots/` does not exist on disk ✓.
This is a one-string fix and I have no reservation about it.

## root-assets-10 — the .DS_Store sweep did not hold — **confirmed**

`find . -name .DS_Store` excluding `node_modules`, `.next`, `.git`, `.scratch` → **25 files /
192,612 B** ✓, root one **10,244 B** ✓, **0 tracked** (`git ls-files | grep -c DS_Store` = 0) ✓,
whole-tree **281** so 256 live inside `.scratch` ✓. Audit 1 counted **19** — verified in
`2026-08-25-refactor-audit-1/work/agents/root-docs-assets.md:90` ✓, swept by `0a73211`
(2026-08-26) ✓. Nine days, +6 files.

Two nits: the per-directory enumeration lists three under `.claude/` but there are **four**
(it omits `.claude/_disabled-gsd/.DS_Store`); and there are **four** inside `sanan's stuff/`,
not three, which matters only for the "leave those alone" instruction. The totals (25 / 21
outside `sanan's stuff` / 192,612 B) are right.

I agree with the finder's own recommendation to stop treating the sweep as a fix.

## root-assets-11 — e2e/.shots is 153 MB — **confirmed-with-correction**

`du -sh e2e/.shots` → **153M**, 226 files ✓. `.claude/shots` **9.4M** ✓,
`.claude/_disabled-gsd` **7.4M** ✓ (16.8 MB together, the finding's "17 MB").

**Correction, and it is only a calendar day**: `find -mtime -7` returns **161** today, not 221.
`-mtime -8` returns **221** — i.e. the finder's number was exact when measured on 2026-09-03
and has aged by one day. Oldest file is **2026-08-26** (`e2e/.shots/drive/houses-desktop-*`),
so "none older than fourteen days" holds ✓, though "nine days" is the tighter true statement.
A fix session writing the retention rule should note that the pile is genuinely bimodal
(70 files < 5 days, 226 < 10 days), so a 7-day rule reclaims roughly two thirds of it.

## root-assets-12 — four unreferenced .claude/agents — **confirmed**

`.claude/agents/` = **8 files / 650 lines / 40,135 B** ✓, and the four named sizes are exact:
`comment-analyzer.md` 70/5,725 · `pr-test-analyzer.md` 69/4,985 · `type-design-analyzer.md`
110/5,368 · `code-reviewer.md` 47/3,985 ✓ (249 lines for three, 296 for four; 16,078 B / 20,063 B).

Reference greps reproduce exactly: `comment-analyzer`, `pr-test-analyzer`,
`type-design-analyzer` → **zero files anywhere** ✓. `code-reviewer` → **only**
`.claude/skills/superpowers-requesting-code-review/SKILL.md` and
`.claude/skills/superpowers-subagent-driven-development/SKILL.md` ✓ — both vendored copies that
root-assets-04 proposes deleting, so the circularity is real. `silent-failure-hunter` →
`progress.md` only ✓. The three CLAUDE.md agents are all well-cited; `write-path-reviewer`
appears in `.gitignore`, `CLAUDE.md`, `docs/spec/admin.md`,
`docs/planning/collection-rework/{handover,spec}.md`, `docs/planning/class-collection/spec.md`
and `progress.md` ✓.

## root-assets-13 — this audit's .scratch must die at close-out — **confirmed**

`du -sh .scratch` → **3.3G** ✓, containing `audit2-build`, `audit2-build-nolab`, `lab-aside`.
Root is at **32 entries** ✓ (the two over the post-`c8d0e87` 30 are `.DS_Store` and `.scratch`).
`.gitignore:81-82` reads *"One-off debugging probes. Throwaway by nature, never referenced by
the app."* ✓. 256 of the tree's 281 `.DS_Store` files live inside it ✓. Nothing to argue with;
it is a close-out checklist line, and the finding is right that the build baselines worth
keeping are already in `work/raw/build*.txt` and `route-bundle-stats*.json`.

---

## Cross-finding notes for the compiler

- **01 and 02 must ship together, and 02 must be settled first.** The finder says this too,
  but adds a wrinkle it did not know about: `docs/README.md:12` says the file is
  *"append-only"*, which reads as oldest-first and contradicts the finding's newest-first
  recommendation. Whichever order wins, `docs/README.md:12`, the H1 instruction line, and the
  new `scripts/qa/progress-archive.test.mjs` all have to agree in one commit.
- **04, 05 and 12 interlock.** 12's `code-reviewer.md` is kept alive only by two files 04
  proposes deleting; 05's `planning-with-files` is one of 04's 37. Do 05 first (it is the only
  one with a safety edge and it is a lone file), then put 04 and 12 to the owner together as
  one "what does `.claude/` contain" question. Doing 04 before 05 re-opens the same decision.
- **04 and 06 interlock too**: if 04 removes the impeccable pack, 06's fix for `CLAUDE.md:206`
  is to delete the row, not rewrite the names. 06's other two edits (`:133`, `:237`) are
  independent and can land immediately.
- **Overlap with other clusters**: root-assets-09 (`look.mjs`) is scripts-e2e-ci's file — the
  finding cross-lists it itself and its steps are the safer ones (change the string, then
  delete `.gitignore:99`, in that order). root-assets-07 hands the coverage judgement to the
  same agent and states no verdict, which is the correct division; whoever holds the
  `visual.spec.ts` finding should take root-assets-07's byte attribution as measured fact and
  not re-derive it.
- **Nothing in this cluster is refuted.** The two claims that cannot be closed read-only are
  `c3-thumb`'s DB safety (a SELECT the finding already wrote) and whether a skill-scoped
  `hooks:` block registers in this harness (05's secondary argument, not its main one).

## Not re-litigated

The finder's Not-findings all held up on spot checks (root config files, `package-lock.json`,
`.github/`, `public/geo/countries-110m.json`, the brand SVGs, `landing-original.jpeg`, the
documented backstop ignore lines, `sanan's stuff/`). One factual slip inside them, harmless:
the demo Collection photographs are **6 pairs / 12 files / 1,740,456 B**, not "seven pairs
(14 files, 1.86 MB)" — `DEMO_PHOTOS` has six `file:` values (`demo-banyan-benches`, `-trunk`,
`-arch`, `-canopy`, `-pillar`, `demo-assembly-wide`) and `GENERATED_PHOTOS` is empty. The
not-finding's point — that they are alive via a template and grep alone cannot see them — is
correct and important.
