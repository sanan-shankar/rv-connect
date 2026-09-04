# root-assets - refactor audit 2 report

Territory reader for the repository root, the tracked binary/asset weight, and the tooling
folders that are not application code: every root entry, `progress.md`, `package-lock.json`,
`public/`, `e2e/__screenshots__/`, `.claude/`, `.gitignore`, `.github/`, and the
ignored-but-present droppings the owner sees in `ls`. The charter's frame is his own words:
*"I very much appreciate a clean, well-maintained root directory, especially because that's
the main part that I keep looking at."* Date: 2026-09-04 (HEAD `72b5a1d`). Files in territory:
233 tracked (15 root + 58 public + 24 baselines + 9 e2e specs + 104 `.claude` + 5 `.github` +
`progress.md` + 2 `docs/history`) plus 25 untracked droppings and 6 untracked directories.
Read fully: 24 (every root config, `.gitignore`, `README.md`, `.github/**`, `visual.spec.ts`,
`_specimens.ts`, `planning-with-files/SKILL.md`, `alumni-map.tsx`'s atlas block). Everything
else was read to classification depth with per-file reference greps, per the charter.

## Coverage

- **Read fully**: `.gitignore` (119 lines, line by line), `README.md`, `package.json`,
  `components.json`, `vercel.json`, `postcss.config.mjs`, `.mcp.json`, `next-env.d.ts`,
  `.github/workflows/check.yml`, `.github/renovate.json`, `e2e/visual.spec.ts` (the ROUTES
  table and the screenshot call), `src/app/lab/crop/_specimens.ts` header + shape list,
  `.claude/skills/planning-with-files/SKILL.md`, `.claude/agents/` listing + reference greps,
  `src/components/directory/alumni-map.tsx:78-110` (the atlas block), `docs/README.md`,
  `scripts/dev/apple-edge/look.mjs:1-30`, `scripts/demo/add-photos.mjs:1-60`,
  `src/lib/demo-seed/seed.ts:305-340`, `src/lib/demo-seed/content.test.mjs:165-200`.
- **Read at classification depth with a reference grep each** (the charter's own
  instruction for these): all 58 tracked `public/` files (exact-path grep across the tree per
  file), all 24 baseline PNGs (size + history), all 53 `.claude/skills/*/SKILL.md`
  front-matter blocks (name, description, hooks), the three remaining `.github/workflows`.
- **Read only for what they claim about the root and the tooling** (charter: not their
  prose): `CLAUDE.md`, `AGENTS.md`.
- **Not read** (not mine): the *contents* of `next.config.ts`, `tsconfig.json`,
  `eslint.config.mjs`, `prisma.config.ts` (lib-core-config); `docs/` prose (docs agent);
  `scripts/` (scripts-e2e-ci) except the two lines quoted above; `package-lock.json` beyond
  size, which the charter calls a fact rather than a finding.
- **Deliberately not opened**: `sanan's stuff/` (owner decision 15). Confirmed present with
  `ls -d` only: it exists, is 130 MB, and is gitignored at `.gitignore:72`.
- **Uncommitted edits seen**: none in my territory. `git status --short` at HEAD shows only
  this audit's own untracked folder, `docs/audit-fix/2026-09-03-refactor-audit-2/`. The
  `M src/components/common/image-viewer.tsx` that was in the tree at session start landed as
  `72b5a1d` while I was reading; nothing of mine touched it.

## Summary

**The root itself is clean and I could not find a tracked file there that a tool does not
require.** Audit 1's five evictions held (`.puppeteerrc.cjs` folded into a `"puppeteer"` key,
`knip.jsonc` moved to `scripts/qa/`, `tsconfig.tsbuildinfo` relocated by `tsconfig.json:27`,
`temporary screenshots/` became `e2e/.shots/`, `.professions/` deleted). Fifteen tracked files
remain and all fifteen are root-pinned. So the honest headline is not "the root is cluttered"
— it is that **one root file is now the fourth-largest thing in the repository**:
`progress.md` at 600,161 bytes and 8,545 lines, half of the root's entire tracked weight,
grown 4,444 lines in the eight days since the last archive at ~555 lines a day. The archive
rule that would fix it already exists, in writing, in `docs/README.md:36` and inside
`progress.md` itself — *"A month moves there once it is closed"* — and August closed four days
ago and has not moved. Nothing enforces it, so it will not happen (root-assets-01). Worse,
the file has two chronologies running in opposite directions and September entries at both
ends, so there is no agreed place to append and no way to find the newest entry
(root-assets-02).

**The tracked byte weight is not in `src/`.** Of 33.76 MB tracked, `e2e/__screenshots__` is
13.03 MB (39 %) and `public/` is 6.49 MB (19 %) — 58 % of the repository is pictures.
`src/` is 6.83 MB in 771 files. The baselines are intentional (audit 1 settled that), but
their *history* is not bounded: 157 PNG blobs totalling **101 MB** have entered git in 39
rebaseline commits since 2026-08-19, and 80 % of the current 13.59 MB sits in the 14 full-page
shots, one of which (`desktop/landing.png`) is 2.5 MB on its own (root-assets-07). In
`public/` I found four never-referenced tracked binaries worth 410 KB — three of them
superseded the day after they were committed (root-assets-03).

**The biggest structural item in my territory is `.claude/skills/`**: 43 of the 53 skill
directories are imported vendor packs, 619 KB and 18,578 markdown lines, 86 % of everything
tracked under `.claude/`. Thirty-eight of them have not been edited since **2026-03-30**, five
months, and are referenced by nothing in the repo. Fourteen of those thirty-eight are the
`superpowers-*` pack, and this session's own skill listing shows **both** them and a
`superpowers:*` plugin pack offering the same fourteen skills with newer wording — the
vendored copies are a stale shadow of something already installed (root-assets-04). One of
them, `planning-with-files`, is a broken half-import: it registers a `PreToolUse` hook that
shells out before every tool call, a `Stop` hook that invokes `powershell.exe` and then a
script that does not exist in this repo, and its whole premise is to write `task_plan.md`,
`findings.md` and `progress.md` **at the project root** — which violates CLAUDE.md's closed-root
rule and collides by name with the 600 KB session history (root-assets-05).

**Structural vs cheap**: 8 structural findings (~1.03 MB of tracked bytes, ~19,700 markdown
lines out of the tree, 76 files, plus the two process mechanisms that stop the recurrence) and
6 cheap ones (stale CLAUDE.md numbers, seven dead `.gitignore` lines, the `.DS_Store` and
scratch-folder sweeps). **What surprised me**: that `progress.md`, the file audit 1 fixed, is
now nearly twice the size it was *before* that fix — the archive happened once and then the
rule went unenforced, which is the exact shape of failure CLAUDE.md's own memory note warns
about ("recurring work gets one spec + a globbing test + a keyword row"). **What audit 1 left
that is now moot**: findings 07 (tsbuildinfo), 12 (the screenshot folder's name), 14's
`public/uploads` and `dev-compare` halves, and 05 (README) are all genuinely closed — I
re-verified each. Its finding 17's `gen/` deletion landed but **missed one file**, which is
root-assets-03.

## The root directory, entry by entry (the charter's floor)

32 entries today (`ls -la` minus `.` and `..`), against "35 entries to 30" claimed by
`c8d0e87` on 2026-08-28. The two above 30 are `.DS_Store`, which regrew, and `.scratch/`,
which this audit's own orchestrator created. Verdict key: **required-here** (a tool convention
I re-verified) / **can-move** / **should-not-exist** / **owner-call**.

| Entry | Size | Tracked | Verdict | Which tool requires it, and how I know |
|---|---|---|---|---|
| `package.json` | 3,117 B | yes | required-here | npm root convention. Now also carries the `"puppeteer": {"skipDownload": true}` key that replaced `.puppeteerrc.cjs` (audit 1, `c8d0e87` — verified present at the end of the file). |
| `package-lock.json` | 541,687 B | yes | required-here | npm writes it beside `package.json`; it cannot move. **A fact, not a finding** (charter). 45 % of the root's tracked bytes. |
| `next.config.ts` | 20,683 B | yes | required-here | Next loads it from the project root only. Contents belong to lib-core-config. |
| `tsconfig.json` | 1,472 B | yes | required-here | tsc/Next resolve from root. Line 27 now sets `"tsBuildInfoFile": "node_modules/.cache/tsconfig.tsbuildinfo"` — audit-1 finding 07 landed; no `tsconfig.tsbuildinfo` at the root today. |
| `eslint.config.mjs` | 3,032 B | yes | required-here | ESLint flat config resolves from cwd. |
| `postcss.config.mjs` | 94 B | yes | required-here | `node_modules/next/dist/docs/02-pages/02-guides/post-css.md` — the config goes in the project root. Tailwind v4 hangs off it. |
| `components.json` | 520 B | yes | required-here | shadcn CLI preflight resolves `components.json` from the directory it runs in. CLAUDE.md tells sessions to check it before adding a component. |
| `prisma.config.ts` | 1,629 B | yes | required-here | Prisma CLI discovers `prisma.config` from cwd; the file itself records the one-env-file decision. |
| `vercel.json` | 278 B | yes | required-here | Vercel reads project config from the repo root; holds `bom1` + the two crons. |
| `.mcp.json` | 670 B | yes | required-here | Claude Code project-scope MCP config; being checked in at the root *is* the sharing mechanism. |
| `.gitignore` | 4,260 B | yes | required-here | git convention. **Content**: root-assets-08. |
| `.github/` | 20 KB, 5 files | yes | required-here | GitHub reads workflows only from `.github/workflows`. Contents are exemplary; see Not-findings. |
| `CLAUDE.md` | 22,871 B | yes | required-here | Claude Code convention, loaded into every session. **Content**: root-assets-06 (three stale tooling numbers). Grew 4.3 KB since audit 1. |
| `AGENTS.md` | 3,419 B | yes | required-here | Its top block is written and re-added by `next dev` (`node_modules/next/dist/server/lib/generate-agent-files.js`, named in the file itself). Moving it recreates an untracked copy forever. |
| `README.md` | 6,121 B | yes | required-here | Repo convention. Re-read in full: audit-1 finding 05 is **fully closed** — it now says "Never run `prisma db push`", documents the manual-migration path, and describes `ADMIN_EMAIL` correctly with no admin-bypass route. |
| `progress.md` | 600,161 B | yes | **owner-call** | `docs/README.md:7-13` pins repo-discovery files at the root deliberately and names this one. Its *location* is correct; its *size* is root-assets-01 and its *shape* is root-assets-02. |
| `next-env.d.ts` | 296 B | no (ignored `:31`) | required-here | Regenerated by Next on every dev/build (mtime 2026-09-03 16:25, the other session's dev server). Correct as-is. |
| `.env`, `.env.demo` | 3,105 / 846 B | no (ignored `:17`) | required-here | `prisma.config.ts` loads `.env` by explicit root path; README documents it as the only env file; `.env.demo` is named by `docs/TRAPS.md` and `docs/spec/demo.md`. Not opened. |
| `.DS_Store` | 10,244 B | no (ignored `:10`) | should-not-exist | Finder dropping. Swept by audit 1 on 2026-08-26 (`0a73211`); back at the root within nine days. root-assets-10. |
| `.claude/` | 0.69 MB tracked / 17.7 MB on disk | partly | required-here (location); **owner-call** (contents) | Claude Code reads project skills and agents from `.claude/`. `.gitignore:64-66` tracks only `agents/` and `skills/`. root-assets-04, -05, -12, -14. |
| `.next/` | ~5 GB | no (`:7`) | required-here | Turbopack's. Belongs to the other session's dev server; untouched. |
| `node_modules/` | — | no (`:4`) | required-here | npm's. |
| `.git/` | 231 MB | — | required-here | 72.87 MiB packed + 156.99 MiB loose objects. A local `git gc` would reclaim most of the loose half; noted in root-assets-07's notes, not a finding on its own. |
| `.scratch/` | **3.3 GB** | no (`:82`) | should-not-exist **after this audit** | Two full build worktrees (`audit2-build`, `audit2-build-nolab`) plus `lab-aside`, created by this audit's orchestrator on 2026-09-03. `.gitignore:81` calls the folder "one-off debugging probes. Throwaway by nature." root-assets-13. |
| `src/`, `prisma/`, `public/`, `docs/`, `scripts/`, `e2e/` | — | mixed | required-here | The project's shape; each judged by its own agent. `public/` is mine: root-assets-03. |
| `sanan's stuff/` | 130 MB | no (`:72`) | **owner-call, unchanged** | Owner decision 15. Confirmed present via `ls -d` only, per the charter. Nothing in the tracked tree references it except `.gitignore`. |

**Net: nothing tracked at the root can move without breaking a tool convention, and nothing
tracked at the root is an artefact.** The only entries that should not be there are
`.DS_Store` (regrowth) and `.scratch/` (this audit's own, due at close-out). Every cleanup in
my territory is therefore about *weight and recurrence*, not about relocation.

## Findings

### root-assets-01 - Archive August out of progress.md, and put a gate under the rule that already exists
- **Where**: `progress.md` (8,545 lines, 600,161 bytes, 202 `## ` headers). August occupies
  lines 637-4398 (block 1, newest-first) **and** lines 4406-8483 (block 2, oldest-first) —
  roughly 7,900 lines / ~555 KB. The rule it violates: `docs/README.md:36` and
  `progress.md:4401-4404`, both saying a month moves to `docs/history/` once it is closed.
  Existing archives: `docs/history/progress-2026-06.md` (650 lines) and
  `progress-2026-07.md` (241 lines), both written 2026-08-26 by `827e650`.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (the archive is executing
  a written rule); owner only if he wants the stricter variant in the Notes
- **Evidence**: measured at four points in git, all `git show <sha>:progress.md | wc -l`:

  | date | sha | lines | bytes |
  |---|---|---|---|
  | 2026-08-26 (after `827e650` archived June+July) | `dbc9c06` | 4,101 | ~256 KB |
  | 2026-08-28 | `6915627` | 6,527 | 433,986 |
  | 2026-08-30 | `8d3f51b` | 7,483 | — |
  | 2026-09-01 | `1f89b86` | 7,849 | — |
  | 2026-09-03 (HEAD) | `72b5a1d` | 8,545 | 600,161 |

  **+4,444 lines and +344,175 bytes in eight days = 555 lines/day, ~3,890 lines/week,
  ~301 KB/week.** The file is now 86 % larger than the 322,948 bytes audit 1 condemned it at,
  *after* that audit's fix. September alone (2026-09-01 to 09-03) added ~636 lines in block 1
  plus 2 entries in block 2. Nothing parses the file: `git grep "progress\.md"` outside itself
  returns CLAUDE.md (3 prose lines), `docs/README.md` (2), `docs/history/*` (2 headers),
  `next.config.ts:329` (a quote in a comment), `docs/spec/admin.md` and
  `docs/planning/**` (prose citations), and `.claude/skills/planning-with-files/SKILL.md`
  (which means a *different* file — see root-assets-05). Zero path consumers.
- **What to do**:
  1. Create `docs/history/progress-2026-08.md` with the same three-line header the June and
     July archives use ("Archived from the root `progress.md` on <date>, unedited and in its
     original order"). Move every `## 2026-08-*` entry into it. **Read root-assets-02 first**:
     August exists in two blocks with opposite orderings, so this is not one contiguous cut.
     The June/July archive got to be one `sed` range by luck; this one will not.
  2. Leave root `progress.md` with September only (~640 lines / ~45 KB) plus the existing
     `## Earlier months` pointer, updated to name all three archived months.
  3. Add the gate. This repo's own convention (memory: *"recurring work gets one spec + a
     globbing test + a CLAUDE.md keyword row"*) says the rule needs a test, and `npm run check`
     already runs 102 `*.test.mjs` files by glob. Write `scripts/qa/progress-archive.test.mjs`:
     parse every `^## (\d{4})-(\d{2})-` header in root `progress.md`; fail if any header's
     month ended more than **7 days** ago. The grace window means a push on the 1st is never
     red, and the gate fires on the 8th if nobody archived. Today (Sep 4) it passes; on Sep 8
     it would fail until August moves — which is exactly the behaviour wanted.
  4. One sentence in CLAUDE.md's working-agreement bullet: the archive rides in the same
     commit as an ordinary session entry (its one-commit-per-change rule already implies this).
- **Saving**: root `progress.md` **600 KB -> ~45 KB (-92 %)**, 8,545 -> ~640 lines. Zero cloc
  lines net (moved, not deleted) — stated honestly. The root's tracked bytes fall from
  1,209,974 to ~655,000, i.e. `package-lock.json` becomes the largest thing at the root, which
  is correct. The recurring value is the gate: without it this is a one-off that decays again
  in three weeks, which is precisely what happened to audit 1's version of this fix.
- **Risk & gate**: low. `git grep -c "progress.md"` before and after to confirm no path
  consumer appeared; `npm run check` (the new test must pass at HEAD after the move, and must
  be shown to FAIL before it — write the test, watch it go red, then archive).
- **Confidence**: high. What would change my mind: a hook or a `.claude/settings.local.json`
  entry that reads the root file for recent-session context. I found none in the tracked tree,
  and `settings.local.json` is gitignored so I did not read it — a fixer with permission should
  glance at it before moving anything.
- **Notes**: the honest limitation of a monthly rule is that it only caps the file at roughly
  a month of growth. At September's current ~212 lines/day the root file would reach ~6,400
  lines (~450 KB) by 2026-09-30 before the archive fires. Two stricter variants, both owner
  calls, are in **Owner decisions #1**. I am recommending the monthly rule here because it is
  already written down and merely unenforced; changing the convention is a separate decision
  and should not block executing the one that exists.

### root-assets-02 - progress.md has two chronologies running in opposite directions, and September is at both ends
- **Where**: `progress.md:1-4398` (block 1, newest-first: line 3 is 2026-09-02, line 4365 is
  2026-08-14); `progress.md:4399-4405` (the `## Earlier months` pointer);
  `progress.md:4406-8545` (block 2, oldest-first: line 4406 is 2026-08-11, line 8515 is
  2026-09-03). 94 headers in block 1, 107 in block 2.
- **Phase**: architecture (of a document)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the newest entry in the file — `## 2026-09-03 — the viewer stops letting go of
  the page, and of its own controls`, matching HEAD `72b5a1d` — is at **line 8515, the very
  bottom**, while line 3 is a 2026-09-02 entry. Sixteen September entries are in block 1 and
  two are in block 2. Two sessions working in this shared checkout on the same day appended to
  opposite ends of the same file, and neither was wrong, because the file does not say which
  end is the head. `head -30 progress.md` and `tail -30 progress.md` return different months in
  different orders. Audit 1 hit the same structure ("lines 1-467 are a newest-first head block,
  then the full chronology") and worked around it rather than fixing it; the ambiguity has
  since eaten twelve weeks of entries instead of one.
- **What to do**: pick one order and state it in the file's first two lines, then reflow.
  My recommendation, because the file's own `# Progress Log` heading is followed immediately by
  the newest entry and because that is what `head` shows: **newest-first, appended at the top**,
  with a one-line instruction under the H1 — "Newest first. New sessions add their entry
  directly below this line. Closed months move to `docs/history/`." Reflowing means reversing
  block 2 and merging it into block 1 by date. Do this **in the same commit as
  root-assets-01's archive**, because after the archive only ~640 September lines remain and
  the reflow is then trivial; doing it before means reordering 8,500 lines. Prove it lossless
  the way `827e650` did: rebuild the original from the pieces and diff every non-blank line.
- **Saving**: 0 lines. One file with one order, and an append convention two concurrent
  sessions cannot both follow correctly by accident. This is the "0 lines, but one fewer place
  for the bug" case the brief calls a good finding.
- **Risk & gate**: low, but it is a 600 KB text move — the gate is the losslessness diff
  (`sort` both versions' non-blank lines and `diff`; must be empty), then `npm run check`.
- **Confidence**: high. The line numbers above are reproducible with
  `grep -n '^## ' progress.md`.
- **Notes**: related to root-assets-01 (do them together) and to root-assets-05 (the vendored
  `planning-with-files` skill runs `tail -20 progress.md` as a hook, which on this file returns
  the *oldest* half of a two-block document — a small illustration of why the ambiguity costs
  something).

### root-assets-03 - Four tracked binaries in public/ that nothing references (410 KB)
- **Where**:
  - `public/lab/crop/pano-21x9.webp` — 153,150 B
  - `public/lab/crop/phone-9x16.webp` — 141,394 B
  - `public/lab/crop/grainy-420.webp` — 38,124 B
  - `public/images/collection/c3-thumb.webp` — 87,682 B
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous (one live-DB SELECT
  first, written below, for the `c3-thumb` half only)
- **Evidence**: I ran an exact-path grep for all 58 tracked `public/` files
  (`git grep -c -F "/lab/crop/pano-21x9.webp" -- ':!public' ':!docs/audit-fix'` and the same
  for each). These four return zero, and nothing in `src/app/lab` does a `readdir` of `public`
  (`git grep -n "readdirSync" -- src/app/lab` is empty), so there is no dynamic path in.
  - The three `lab/crop` files were added by `26dc483` (2026-08-27, *"six ways to hold a
    photograph"*) and **superseded the next day** by `6fb0780` (2026-08-28, *"the crop room
    shows what we do, not what we might do"*), which added the eleven `shape-*.webp` fixtures
    and rewrote `src/app/lab/crop/_specimens.ts` around them. `SPECIMENS` lists exactly eleven
    `src` values, all `/lab/crop/shape-*.webp`. The three older files were simply never
    deleted. This is not a lab-history question: they are not what any room renders.
  - `c3-thumb.webp` was added 2026-06-28 (`c559d3e`) and **has never been touched since**.
    `c3.webp` itself is live (three references: `src/lib/demo-seed/content.ts:115` uses it as
    a post image, and `lab/profiles/_variant-letterhead-2.tsx:117` and `-3.tsx:135` as
    `DEMO_PHOTO`). Its thumbnail is not: `src/app/lab/viewer/page.tsx:80-87` lists six thumbs
    (`v1`, `c1`, `v3`, `v2`, `c4`, `c2`) and `c3-thumb` is not among them; the demo seed's
    `thumbUrl` template at `src/lib/demo-seed/seed.ts:319` interpolates `${ph.file}-thumb.webp`
    over `DEMO_PHOTOS`, and `c3` is not a `file` in that list (the seven that are —
    `demo-banyan-{benches,trunk,arch,canopy,pillar}`, `demo-assembly-wide` — are all alive and
    pinned by `src/lib/demo-seed/content.test.mjs:170-200`, which opens both the display and
    the thumb with sharp and asserts the ratios match). **`c3-thumb` is the file audit-1
    finding 17's fix session missed**: `77dc9da` deleted `v4-v6`, `c5-c6`, their thumbs and the
    twelve `gen/` SVGs, but c3's thumb survived because its display copy did.
- **What to do**: `git rm` the four files. No code change: nothing imports them, nothing
  templates their names. For the `lab/crop` three, add one line to the `_specimens.ts` header
  comment noting that the room's fixtures are the eleven `shape-*` files only — the header
  already says *"Delete these files, `public/lab/crop/` and the registry row once the layout
  rules are settled"*, so it is the right place to record which files it means.
- **Saving**: **420,350 tracked bytes (410 KB)**, 4 files, 6 % of everything under `public/`.
  0 lines of code. Also 410 KB less to deploy to Vercel's CDN on every build.
- **Risk & gate**: low.
  - `c3-thumb` needs the same live-DB check audit 1 wrote for its siblings, because grep cannot
    see the database and a June-era seed wrote local paths into `Photo` rows:
    `SELECT id, url, "thumbUrl" FROM "Photo" WHERE url LIKE '%/images/collection/%' OR "thumbUrl" LIKE '%/images/collection/%';`
    Run it against the live database **and** against the demo database (via `.env.demo`,
    passed by path to `scripts/dev/run-sql.mjs`). If any row names `c3-thumb.webp`, keep that
    file and delete only the other three.
  - Then `npm run check` (`src/lib/demo-seed/content.test.mjs` must stay green — it enumerates
    `DEMO_PHOTOS` on disk and would fail loudly if a live file went), and open `/lab/crop`,
    `/lab/viewer` and `/collection` once each. The three crop files have no route that could
    404 on them, since no `src` attribute names them.
- **Confidence**: high on the three `lab/crop` files (the supersession is a one-day-apart
  commit pair and the replacement list is explicit). Medium-high on `c3-thumb` until the SELECT
  runs — which is why the SELECT is step one.
- **Notes**: I checked the rest of `public/` the same way and everything else earns its place.
  The four brand-mark SVGs (3,955 B total) still have zero references and audit 1 decided to
  keep them as the brand source of truth; I agree and did not re-litigate. The five
  `public/images/landing/*.webp` (283,284 B) are referenced by
  `src/components/landing/shots.ts` and reachable today only through `/lab/landings`, because
  the showcase is switched off — that is audit-1 owner decision #1, restated under
  Audit-1 carry-overs, not a deletion I am proposing.

### root-assets-04 - 38 vendored skill packs, untouched for five months, 14 of them shadowed by a live plugin
- **Where**: `.claude/skills/` — 53 directories, 104 tracked files, 720,956 bytes. The 38 in
  question all trace to one commit, `6c686cb` (2026-03-30, *"Mega workflow update"*), and none
  has been modified since:
  - `superpowers-*` — 14 dirs, 108,648 B
  - `impeccable-*` — 21 dirs, 152,102 B
  - `planning-with-files` — 8,636 B (see root-assets-05, which supersedes this row for it)
  - `VibeSec-Skill` — 24,779 B, 758 lines
  A further 8 came from `ac2827b` (2026-08-21, the pre-release audit armoury) and were last
  touched by `61994c9` the same day: `code-review-skill` (23 files, 224,125 B, 7,874 lines),
  `front-review` (43,921 B), `front-refactor` (40,568 B), `goal-sloc`, `code-simplifier`,
  `find-bugs`, `review-swarm`, `bug-hunt-swarm`.
  **Totals: 43 imported dirs, 85 files, 18,578 lines, 619,393 bytes = 86 % of `.claude`'s
  tracked weight.** The repo's own ten (`check`, `tag-photos`, `tag-professions`,
  `writing-for-agents`, `screenshot-auth`, `liftkit-spacing`, `ui-audit`, plus `goal-sloc`,
  `code-simplifier` which arrived imported but are named by this repo's process) are 11 files,
  1,163 lines, 61,428 bytes.
- **Phase**: relocate (or dead, for the shadowed fourteen)
- **Tier**: T2 mechanically     **Class**: structural     **Decides**: **owner** — this is
  audit-1 owner decision 8, still open, and it governs what every future session can reach for
- **Evidence**, three independent strands:
  1. **Nothing in the repo names 37 of the 43.** `git grep -l -F "<dirname>" -- ':!.claude/skills' ':!docs/audit-fix'`
     returns zero files for every `impeccable-*`, every `superpowers-*`, `VibeSec-Skill` and
     `planning-with-files`. Eight (`code-review-skill`, `find-bugs`, `review-swarm`,
     `bug-hunt-swarm`, `front-review`, `front-refactor`, `goal-sloc`, `code-simplifier`) are
     named only in `progress.md` — a historical entry about importing them. Only `ui-audit`,
     `writing-for-agents`, `liftkit-spacing`, `screenshot-auth`, `tag-photos`,
     `tag-professions` and `check` are named by CLAUDE.md, an agent file or a spec.
  2. **Fourteen are shadowed by an installed plugin.** This session's own skill listing
     contains *both* `superpowers-brainstorming` … `superpowers-writing-skills` (the fourteen
     from this repo's `.claude/skills/`) *and* `superpowers:brainstorming` …
     `superpowers:writing-skills` — the same fourteen names, from a plugin. They are not the
     same version: the vendored `superpowers-using-git-worktrees/SKILL.md` front matter reads
     *"creates isolated git worktrees with smart directory selection and safety verification"*
     while the plugin's reads *"ensures an isolated workspace exists via native tools or git
     worktree fallback"*; the vendored `finishing-a-development-branch` carries a trailing
     *"- guides completion of development work by presenting structured options for merge, PR,
     or cleanup"* the plugin's has dropped. The vendored copies are five months stale and
     shadow a maintained pack. CLAUDE.md's row for them ("A bug that survived two attempts →
     superpowers systematic debugging") reaches the plugin either way.
  3. **Their front-matter names do not match their directories.** `impeccable-audit/SKILL.md`
     declares `name: audit`; `impeccable-polish` declares `polish`; every `superpowers-x`
     declares `x`. Whoever imported them prefixed the directories and left the front matter
     alone. The harness lists them by directory (`impeccable-audit`), so the front-matter
     names are dead metadata — and CLAUDE.md's row tells sessions to type `/audit`, `/polish`,
     `/typeset`, three names that do not resolve to anything (root-assets-06).
- **What to do** — three options, in the order I would put them to the owner:
  1. **Delete the 14 `superpowers-*` directories** (108,648 B, ~2,800 lines). The plugin
     supplies all fourteen by the same names, newer. This is the one part I would call
     autonomous-adjacent: it removes nothing a session can currently reach, because the plugin
     answers the same invocation. Verify first, in a fresh session, that
     `superpowers:systematic-debugging` is present without this repo's copy — the cheapest
     proof is to check the plugin list before deleting.
  2. **Move the remaining 24 imported dirs out of the repo** into `~/.claude/skills/` (the user
     scope), which is where a general-purpose pack belongs. They then work in every project of
     the owner's, not just this one, and stop being 500 KB of vendor markdown that every
     `git clone`, every `git grep` and every future audit walks through. `.claude/skills/`
     keeps only what encodes *this* project: `check`, `tag-photos`, `tag-professions`,
     `writing-for-agents`, `screenshot-auth`, `liftkit-spacing`, `ui-audit` — 7 dirs,
     ~40 KB — plus `goal-sloc` and `code-simplifier` if the owner wants the audit playbooks
     versioned with the repo (`goal-sloc` is cited by name in this audit's own brief, so it
     has a live consumer).
  3. **Or keep everything and write down why**, in one line in `docs/OPERATIONS.md`, so the
     next audit does not raise this a third time. That is a legitimate answer — but the
     fourteen shadowed ones should go regardless, because a stale copy of a live pack is worse
     than either having it or not.
- **Saving**: option 1 alone: **106 KB tracked, 14 files, ~2,800 markdown lines**. Options
  1+2: **~605 KB tracked, 78 files, ~18,300 markdown lines** out of the repository — 1.8 % of
  everything tracked, and it takes `.claude/` from 720 KB to ~100 KB. No runtime effect
  whatever: none of this ships, builds or is imported. The value is the repo stopping being a
  vendor mirror.
- **Risk & gate**: low, and entirely about capability rather than correctness. `npm run check`
  does not read `.claude/skills`; nothing in `src`, `scripts` or `e2e` does either (verified by
  grep). The real gate is a human one: after the move, start a fresh session and confirm the
  skills the owner actually uses still appear in its listing. Do **not** delete
  `liftkit-spacing` (CLAUDE.md, `.claude/agents/screenshot-qa.md` and `docs/spec/media.md` all
  name it) or `screenshot-auth`/`ui-audit` (CLAUDE.md names both by path, and both were
  adapted to this repo on 2026-08-26 by `c02cfb7`).
- **Confidence**: high on the measurements and on the shadowing. Medium on the recommendation,
  because it is the owner's working environment and "I might want that one day" is a real
  answer for a 7 KB markdown file. What would change my mind on the fourteen: evidence that
  the project-scope copy takes precedence over the plugin *and* that the older wording is
  preferred — I saw no such preference recorded anywhere.
- **Notes**: `code-review-skill` at 224 KB in 23 files is the single largest imported item and
  its own SKILL.md says it has been *"pruned to this repo's stack — other-language guides
  removed"*, which is a real adaptation and an argument for keeping it here rather than in the
  user scope. I would keep that one wherever the owner keeps the rest. `VibeSec-Skill`
  (24.8 KB, 758 lines, never referenced, never edited since March) is the clearest single
  candidate for deletion after the fourteen: this project has its own security regime
  (`docs/SECURITY.md`, the audit-status board, `security-regressions.test.mjs`) and a generic
  "write secure web applications" skill adds nothing to it.

### root-assets-05 - planning-with-files is a broken half-import whose hooks target the closed root and collide with progress.md
- **Where**: `.claude/skills/planning-with-files/SKILL.md` — 241 lines, 8,636 B, the only file
  in the directory. Front matter lines 6-24 (the `hooks:` block), body lines 58, 64, 70-72,
  93, 135, 183, 203-205 (the file paths it creates and reads).
- **Phase**: dead (as shipped) / placeholder (as intended)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous to delete the hooks block;
  owner to decide whether the skill's prose is worth keeping at all
- **Evidence**: three separate ways this file is broken or hazardous.
  1. **Its assets do not exist.** `ls -R .claude/skills/planning-with-files/` returns exactly
     one entry, `SKILL.md`. The body links `templates/task_plan.md`, `templates/findings.md`
     and `templates/progress.md` (lines 70-72, 203-205) — none present. The `Stop` hook (line
     24) runs
     `SD="${CLAUDE_PLUGIN_ROOT:-$HOME/.claude/plugins/planning-with-files}/scripts"; powershell.exe … || sh "$SD/check-complete.sh"`
     — a Windows PowerShell invocation on a Mac, falling back to a script under a plugin path
     this repo does not install. It cannot succeed. Whoever imported this took the SKILL.md and
     left the plugin behind.
  2. **Its hooks fire on every tool call.** The `PreToolUse` matcher is
     `"Write|Edit|Bash|Read|Glob|Grep"` and the command is
     `cat task_plan.md 2>/dev/null | head -30 || true` — a shell process before essentially
     every tool a session uses. The `UserPromptSubmit` hook runs `tail -20 progress.md` on
     every prompt. I have not proved when skill-scoped hooks register (that is harness
     behaviour, not repo behaviour, and the charter forbids me running anything to find out),
     which is exactly why this should not sit in the tree unexamined.
  3. **Its whole convention violates two of this project's rules.** It creates `task_plan.md`,
     `findings.md` and `progress.md` *in the project directory* (line 64: "Your project
     directory | `task_plan.md`, `findings.md`, `progress.md`"). CLAUDE.md's hard rule is
     *"The repo root is closed: never add a file or a folder to `/Users/sanan/Documents/rv-connect/`
     itself"*, quoting the owner: *"I hate cluttering root directory."* And its `progress.md`
     is **the same filename as this project's 600 KB session history** — a skill instructed to
     "Update progress.md with what you just did" (its `PostToolUse` hook, line 20) would append
     planning noise into the owner's own log, or overwrite it. The two audits that did use this
     pattern both wrote their `task_plan.md` and `findings.md` into
     `docs/audit-fix/<date>/work/`, i.e. the sessions corrected for the skill rather than
     following it.
- **What to do**: minimum, delete the `hooks:` block (lines 6-24) — it references a Windows
  shell, a nonexistent script and a filename that collides with a live file, and it can only
  do harm. Preferred: delete the directory. If the owner values the Manus-style planning
  pattern (and the two audits suggest he does), replace it with a short repo-native skill that
  writes into `docs/audit-fix/<date>/work/` or a caller-supplied folder, never the root — that
  is a rewrite of ~40 lines, not a 241-line vendor import. Either way this row must be settled
  before root-assets-04 moves the rest of the pack, so the decision is made once.
- **Saving**: 1 file, 241 lines, 8,636 B tracked — small. The real saving is removing the only
  file in the tree that instructs a session to write to the closed root and to a filename that
  already means something else.
- **Risk & gate**: low. Nothing references it (`git grep -l "planning-with-files"` outside the
  skill itself: zero). Gate: `npm run check` (unaffected), then confirm in a fresh session that
  no `[planning-with-files]` banner appears in the transcript.
- **Confidence**: high on the brokenness (the missing files are a `ls`). Medium on the hook
  hazard, because when a skill's hooks register is harness behaviour I could not test under
  the read-only rule. That uncertainty argues for removal, not against it.
- **Notes**: this is the one finding in my territory with a safety edge rather than a weight
  argument, which is why it is above the cheap items despite being 8 KB.

### root-assets-06 - CLAUDE.md states three tooling numbers that are wrong, and names four skills that do not resolve
- **Where**: `CLAUDE.md:133` ("the unit-test suite (75 files as of 2026-08-25)");
  `CLAUDE.md:237` ("compares 11 routes x 2 viewports against committed baselines in
  `e2e/__screenshots__/`"); `CLAUDE.md:206` ("| Typography, spatial polish, removing AI-slop |
  `/impeccable` (`/audit`, `/polish`, `/typeset`) |"); `CLAUDE.md:203`
  ("| Before any UI code or design decision | `/frontend-design` |").
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**:
  - `git ls-files | grep -c "\.test\.mjs$"` = **102**, not 75. The brief's own baseline says
    102. The number is nine days stale and drifts every time a test lands.
  - `e2e/visual.spec.ts:28-67` `ROUTES` has **12** entries — landing, login, feed, directory,
    letters, catchups, collection, collection-class, support, birds, about, privacy — and
    `e2e/__screenshots__` holds **24** PNGs, which is 12 x 2. CLAUDE.md says 11.
    `collection-class` was added by `f08bc5e` on 2026-08-29 and the doc never followed.
  - The front matter of `.claude/skills/impeccable-audit/SKILL.md` declares `name: audit`, but
    the harness lists the skill as `impeccable-audit` (its directory). There is no
    `/impeccable`, no `/audit`, no `/polish` and no `/typeset`. A session following CLAUDE.md
    literally types four names that resolve to nothing. `/frontend-design` does resolve, but to
    an installed *plugin* (`frontend-design:frontend-design`), not to this repo's vendored
    `.claude/skills/impeccable-frontend-design` — so the vendored copy is doing nothing for
    that row either (see root-assets-04).
- **What to do**: three edits.
  1. `:133` — either update to 102, or better, delete the parenthetical entirely and say "the
     unit-test suite". A count in prose is a number that goes stale on the next commit; the
     floor is already enforced by `check.mjs`, which is the thing that actually matters, and
     which the sentence two paragraphs below already describes.
  2. `:237` — "12 routes x 2 viewports". Better still: "every route in `ROUTES` in
     `e2e/visual.spec.ts`, at two viewports", which cannot drift.
  3. `:206` and `:203` — write the names the harness actually accepts:
     `impeccable-audit`, `impeccable-polish`, `impeccable-typeset`. If root-assets-04 removes
     the pack, delete the row instead. Do not leave it as it is: a rules file that names
     non-existent commands teaches every session to distrust it.
- **Saving**: ~4 lines. Zero bytes. The value is that CLAUDE.md is force-fed into every session
  and is the owner's most personal file; a wrong number in it is a wrong number in every future
  session's context.
- **Risk & gate**: none; prose. `npm run check` for form.
- **Confidence**: high on all three; the counts are one command each.
- **Notes**: I deliberately did not audit CLAUDE.md's prose (the charter reserves that), only
  its factual claims about the root and the tooling. The docs agent may find more of these; I
  am flagging the class as well as the three instances.

### root-assets-07 - The visual baselines are 39 % of the tracked repo and 101 MB of git history, with 80 % of it in 14 full-page PNGs
- **Where**: `e2e/__screenshots__/desktop/*.png` (12) and `mobile/*.png` (12) — 24 files,
  **13,589,284 bytes**. The screenshot call is `e2e/visual.spec.ts:264-271`; the full-page
  decision is `fullPage: route.live !== "band"` on line 267.
- **Phase**: relocate (process) — **judgement on redundancy belongs to scripts-e2e-ci; this
  row records the weight, the growth and the attribution so that agent has numbers to work
  from**
- **Tier**: T3     **Class**: structural     **Decides**: owner (a format or coverage change
  moves what the suite can catch)
- **Evidence**:
  - **Share of the repo**: `raw/tracked-bytes-by-dir.txt` — `e2e` 13.03 MB / 33 files, against
    `src` 6.83 MB / 771 files and a whole-repo 32.19 MB / 1,252 files. The PNGs alone are 39 %
    of everything tracked. `public/` adds 19 %. **58 % of this repository is pictures.**
  - **History, not just the tree**:
    `git rev-list --objects --all -- e2e/__screenshots__ | git cat-file --batch-check` returns
    **157 blobs totalling 106,153,137 bytes (101 MB)**, from **39 commits** since the baselines
    landed on 2026-08-19 (`fb6b29f`). That is ~87 MB added in fifteen days by rebaselining —
    every `visual:update` writes up to 24 new blobs that live in the pack forever. `.git` is
    231 MB on disk (72.87 MiB packed, 156.99 MiB loose).
  - **Where the weight is**: the seven routes shot `fullPage` (landing, login, directory,
    support, birds, about, privacy) account for **10,881,159 of the 13,589,284 bytes (80 %)**
    across their 14 files. The five `band` routes, shot at viewport height since `900546f`,
    are 2,708,125 bytes across 10 files. The single heaviest is
    `desktop/landing.png` at 2,512,790 B; `desktop/login.png` is 1,639,795 B against
    `mobile/login.png` at 17,403 B — a 94x gap on the same page, which is worth a look on its
    own, because it suggests the desktop login shot is capturing the full-height hero
    photograph while the mobile one is capturing a form.
- **What to do** (for scripts-e2e-ci to decide; I am handing over measurements, not a verdict):
  1. Ask whether the seven `fullPage` routes need to be full page. `/privacy` at 580 KB
     desktop + 502 KB mobile is a policy document; a viewport-height shot plus a masked band
     would catch the same token drift the route's own `why` claims it is there for ("a canary
     for global token drift"). That single change is the cheapest large cut available.
  2. If full-page coverage is wanted, the run-rate problem is still the rebaseline count, not
     the file count. A note in `docs/OPERATIONS.md` §1 that a deliberate UI change rebaselines
     *only the routes it moved* (`--update-snapshots` with the spec's grep) would stop 24
     blobs entering the pack when 2 moved.
  3. Do **not** propose deleting baselines. Audit 1 settled that they are the picture memory
     and are committed on purpose (`OPERATIONS.md` §1); I am re-confirming that, not
     reopening it.
- **Saving**: nothing autonomous here. If the seven full-page routes went to viewport height
  the tracked tree would fall by roughly 8-9 MB (27 % of everything tracked) and the per-update
  history cost would fall in the same proportion. Stated as a range because the exact size
  depends on what the shorter shots contain, which needs a run to know.
- **Risk & gate**: medium — this is the regression suite's coverage. Anything here is gated by
  `npm run visual` before and after, plus `npm run visual:report` read by eye, plus the rule
  CLAUDE.md already states ("never run `visual:update` to make a failure go away without
  looking at the diff first").
- **Confidence**: high on every number (each is one command). Low on any recommendation, by
  design: the coverage judgement is the other agent's and the owner's.
- **Notes**: a local `git gc` would reclaim most of the 157 MiB of loose objects in `.git`,
  which is disk on the owner's machine and nothing else. Worth a line in the close-out
  checklist, not a finding.

### root-assets-08 - Seven dead lines in .gitignore: an orphan comment block and one rule with no subject
- **Where**: `.gitignore:116-119` (a four-line comment with no pattern under it);
  `.gitignore:91-92` (`supabase/.temp/` and its comment); missing blank line between `:107`
  and `:108`.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the file is 119 lines with 34 active patterns — an 85-line comment mass that is
  the house idiom and which audit 1 explicitly defended, so this row is only about lines whose
  subject is gone.
  - **:116-119** is the tagging session's working-folder comment, and there is no pattern
    beneath it — the file ends on a comment. It was orphaned on 2026-08-28 when `c8d0e87`
    generalised it into `scripts/dev/.*/` at `:114`, whose own comment says so in as many
    words: *"One line, so a third pass is covered the day it is written."* The generalisation
    landed; the block it replaced did not get deleted.
  - **:91-92** `supabase/.temp/` — *"Supabase CLI local link state, written by `supabase link`"*.
    There is no `supabase/` directory at the root, and
    `git grep -ln "supabase link\|npx supabase\|supabase/"` returns exactly one file:
    `.gitignore` itself. The Supabase CLI is not used in this project (the database is reached
    through Prisma and `scripts/dev/run-sql.mjs`). This is not one of the documented backstops
    — those (`.planning/`, `.codex/`, `.agents/`, `recovery-codes.txt`, `.next-stale*/`) each
    carry a reason and a date for why the *absent* thing is still guarded; this one just
    describes a tool nobody runs.
  - **:107/:108** — `scripts/dev/apple-edge/*.png` is immediately followed by the next block's
    comment with no blank line, unlike every other block in the file.
- **What to do**: delete `:115-119` (the trailing blank and the orphan comment) and `:90-92`
  (the blank, the comment and the `supabase/.temp/` rule); insert a blank line after `:107`.
  Leave everything else: I checked all 34 patterns against disk and the rest are either live
  (`public/uploads/` is the dev storage fallback in `src/lib/storage.ts` and will be recreated;
  `.tmp-shots/` is live but should not be — root-assets-09; `e2e/.shots/`, `.scratch/`,
  `sanan's stuff/`, `next-env.d.ts`, `/src/generated/prisma`, `landing-original.jpeg`,
  `scripts/dev/.*/` all have subjects on disk) or documented backstops.
- **Saving**: ~7 lines; a config file where every line means something again.
- **Risk & gate**: `git status --short` before and after must be identical (nothing matching
  `supabase/.temp/` exists, so nothing can become newly visible). `npm run check`.
- **Confidence**: high.
- **Notes**: `*.tsbuildinfo` at `:30` is now a backstop rather than a live rule, since
  `tsconfig.json:27` writes the buildinfo into `node_modules/.cache` (already covered by
  `/node_modules`). It costs one line and still catches a stray `tsc` run from a different
  cwd, so I would keep it — but its comment could gain "(relocated to node_modules/.cache by
  tsconfig.json, 2026-08-26)" so the next reader is not puzzled by it. Cosmetic; fold into
  this commit if convenient.

### root-assets-09 - One screenshot script still writes a folder into the closed root
- **Where**: `scripts/dev/apple-edge/look.mjs:17` — `const OUT = '.tmp-shots/edge';` followed by
  `mkdirSync(OUT, { recursive: true })` on line 18. The path is relative to the process cwd,
  which for `node scripts/dev/apple-edge/look.mjs …` is the repo root. `.gitignore:99`
  (`.tmp-shots/`) exists solely to hide the result.
- **Phase**: relocate
- **Tier**: T1     **Class**: structural (it is a rule violation, not bytes)
  **Decides**: autonomous
- **Evidence**: `c8d0e87` (2026-08-28) moved every screenshot consumer to `e2e/.shots/` and
  updated nine scripts by name — `screenshot.mjs`, `screenshot-auth.mjs`, `verify-shot.mjs`,
  `theme-shots.mjs`, `drive.mjs`, `map-cluster-verify.mjs`, `tour-mobile-verify.mjs`,
  `_dir-room-shots.mjs`, plus `scripts/README.md`. `look.mjs` was written the day before
  (2026-08-27) and was missed. It is the only writer left that creates a directory at the root,
  and CLAUDE.md's hard rule is explicit: *"screenshots go to `e2e/.shots/`"* and *"never add a
  file or a folder to the repo root."* `git grep -n "tmp-shots"` returns exactly two hits: this
  line and the `.gitignore` line that covers for it.
- **What to do**: change line 17 to write under `e2e/.shots/` — matching its siblings, e.g.
  `const OUT = 'e2e/.shots/edge';` (or resolve it from `import.meta.dirname` the way
  `add-photos.mjs` resolves `ROOT`, which is sturdier against cwd). Then delete `.gitignore:99`
  and, if the block's comment is left with only Playwright entries, tidy it. `.tmp-shots/`
  does not currently exist on disk, so there is nothing to move.
- **Saving**: 0 bytes. One fewer script that can dirty the folder the owner looks at, and one
  fewer `.gitignore` line existing only to conceal a rule violation.
- **Risk & gate**: negligible. Run nothing — the fix is a string. Gate: `npm run check`
  (ESLint reads `scripts/`), and the next person who runs `look.mjs` sees its shots in
  `e2e/.shots/edge`.
- **Confidence**: high.
- **Notes**: this belongs half to scripts-e2e-ci (it is their file) and half to me (it is my
  root). Cross-listed under "For other lenses" so the orchestrator can put it wherever the fix
  campaign wants it. It is one line either way.

### root-assets-10 - The .DS_Store sweep is not a fix: 25 of them regrew in nine days
- **Where**: 25 `.DS_Store` files in the repo proper (excluding `node_modules`, `.next`,
  `.git`, `.scratch`), 192,612 bytes. 21 of those are outside `sanan's stuff/`, including one
  at the root (10,244 B), one in `.claude/`, one in `.claude/skills/`, one in `.claude/scripts/`,
  three in `docs/`, three in `e2e/` (root, `.shots/`, `__screenshots__/`), one in `prisma/`,
  two in `public/`, two in `scripts/`, five in `src/`. (The full-tree count is 281, but 256 of
  those are inside `.scratch/audit2-build*/node_modules` and die with root-assets-13.)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous to sweep; owner for the
  permanent fix
- **Evidence**: none is tracked (`git ls-files | grep -c DS_Store` = 0) and all are ignored by
  `.gitignore:10`, so git is already fully defended — this is purely what the owner sees in
  Finder and in `ls -la`. Audit 1 counted 19 and swept them on 2026-08-26 (`0a73211`).
  Nine days later there are 25. **The sweep does not hold; only ~2.3 a day of regrowth does.**
  Note also that `.DS_Store` regenerating inside `e2e/__screenshots__/` and `public/` is what
  makes them appear in casual `find`/`du` output over those folders.
- **What to do**: sweep once (`find . -name .DS_Store -not -path "./node_modules/*" -not -path
  "./.next/*" -not -path "./.scratch/*" -print` first, then delete the printed list explicitly —
  a bare `-delete` is blocked by a safety hook, per audit 1's own note, and the three inside
  `sanan's stuff/` should be left alone). Then stop treating the sweep as the answer: the
  durable fix is the one-line macOS setting
  `defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool true` for network
  volumes, or simply accepting them — they are invisible to git and cost 190 KB. My honest
  recommendation to the owner is **accept them and stop sweeping**: they will come back every
  time Finder opens a folder, a periodic sweep is a chore that produces no lasting result, and
  the only real cost is cosmetic in a listing that already hides dotfiles by default.
- **Saving**: ~190 KB of local disk, zero tracked bytes. A cleaner `ls -la`, until Finder next
  opens a folder.
- **Risk & gate**: none.
- **Confidence**: high on the count and the regrowth rate.
- **Notes**: this is the cheapest item in my report and I would not have raised it except that
  the charter asks for the census explicitly and the *regrowth* is the actual finding: a
  cleanup that a previous audit performed and that reverted within nine days is evidence about
  the process, not about the files.

### root-assets-11 - e2e/.shots is 153 MB and growing 68 % faster than when audit 1 measured it
- **Where**: `e2e/.shots/` — 226 files, **153 MB**, of which **221 are less than seven days
  old** and none is older than fourteen. Ignored at `.gitignore:41`.
- **Phase**: relocate (process)
- **Tier**: T2     **Class**: structural (the mechanism, not the megabytes)
  **Decides**: autonomous
- **Evidence**: audit-1 finding 12 measured the same pile at 91 MB / 177 files / all under
  seven days, i.e. ~91 MB per week, and recommended a retention rule in the close-out
  checklist. **The folder was renamed (`c8d0e87`) and the retention rule was never adopted.**
  The run rate is now ~150 MB/week — 68 % higher — because the Collection rework ran twelve
  screenshot-heavy sessions in ten days. Related untracked piles under tracked folders, both
  named by audit 1 and both untouched since: `.claude/shots` (9.4 MB) and
  `.claude/_disabled-gsd` (7.4 MB); the latter is a disabled scaffold from an abandoned
  workflow and nothing in the tree references it (it is ignored by `.claude/*`).
- **What to do**: one line in whatever close-out convention the fix campaign adopts —
  `find e2e/.shots -type f -mtime +7 -print` then delete the printed list. Nothing in that
  folder is load-bearing: the shots that matter are either committed as
  `e2e/__screenshots__` baselines or attached to a report. Separately, delete
  `.claude/_disabled-gsd` outright (it is a dead scaffold, 7.4 MB) and let `.claude/shots`
  follow the same seven-day rule. The deeper fix belongs to scripts-e2e-ci and is unchanged
  from audit 1: the QA scripts write full-page PNGs of ~1 MB where the chrome-devtools MCP
  already screenshots WebP at q72 (`.mcp.json`), which would cut the run rate by roughly 70 %.
- **Saving**: bounds ~150 MB/week of local growth at a ~40 MB steady state; 17 MB of dead
  `.claude` piles immediately. Zero tracked bytes.
- **Risk & gate**: none — the folder is disposable by its own gitignore comment ("Screenshot
  scratch from the QA scripts"). Do not delete files another session may be mid-run on; the
  seven-day filter handles that.
- **Confidence**: high.

### root-assets-12 - Four .claude/agents nobody references, one of them kept alive only by a skill pack that is itself proposed for deletion
- **Where**: `.claude/agents/` — 8 files, 650 lines, 40,135 B. The four with no repo-side
  reference: `comment-analyzer.md` (70 lines, 5,725 B), `pr-test-analyzer.md` (69, 4,985),
  `type-design-analyzer.md` (110, 5,368), `code-reviewer.md` (47, 3,985).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: owner (agents are his tooling, and
  `.gitignore:52-63` records that these files "existed in exactly one place on one machine"
  and were un-ignored on purpose after a near-loss)
- **Evidence**: `git grep -l -F "<name>" -- ':!.claude/agents' ':!docs/audit-fix'` per file.
  `comment-analyzer`, `pr-test-analyzer` and `type-design-analyzer` return **zero files** —
  not CLAUDE.md, not a spec, not even `progress.md`, so no session has ever recorded using
  them. `code-reviewer` returns two files, both of them vendored superpowers skills
  (`superpowers-requesting-code-review/SKILL.md`,
  `superpowers-subagent-driven-development/SKILL.md`) which root-assets-04 proposes deleting —
  so its only referrers are themselves shadowed vendor copies. The three CLAUDE.md names
  (`screenshot-qa`, `design-protocol-auditor`, `write-path-reviewer`) are all live and
  well-cited: `write-path-reviewer` alone appears in CLAUDE.md, `docs/spec/admin.md`, two
  collection-rework docs and a class-collection spec. `silent-failure-hunter` (130 lines,
  7,807 B) is named once, in `progress.md` — a historical use.
- **What to do**: put the four in front of the owner as a group. My recommendation: delete
  `comment-analyzer`, `pr-test-analyzer` and `type-design-analyzer` (never used, never cited,
  arrived 2026-08-20 with the security-audit armoury and were never wired into CLAUDE.md's
  subagent table, which is deliberately three rows and says so: *"These three still earn their
  keep"*). Keep `code-reviewer` only if root-assets-04 keeps the superpowers pack; otherwise it
  goes with them. Keep `silent-failure-hunter` — CLAUDE.md gotcha 8 documents a live class of
  bug it is built for (*"A guard that hides its own breakage is worse than no guard"*), so it
  has a standing reason even though it has been used once.
- **Saving**: 3-4 files, 249-296 lines, ~16-20 KB tracked. Small in bytes; the value is that
  `.claude/agents/` becomes exactly the set CLAUDE.md documents, which is how a session finds
  the right one.
- **Risk & gate**: low. Nothing executes these; they are prompt files a session may reference
  by name. `npm run check` does not read them. The gate is the owner saying yes.
- **Confidence**: high on the reference counts. Medium on the recommendation, because an agent
  file is cheap to keep and occasionally useful — but "occasionally useful and never once used
  in five months" is what the brief calls an uncomfortable macro question.

### root-assets-13 - This audit's own .scratch/ is 3.3 GB and must die at close-out
- **Where**: `.scratch/audit2-build/`, `.scratch/audit2-build-nolab/`, `.scratch/lab-aside/` —
  created 2026-09-03 by this audit's orchestrator; 3.3 GB, including two full
  `node_modules` trees and 256 of the tree's 281 `.DS_Store` files.
- **Phase**: hygiene (process)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous at close-out
- **Evidence**: `.gitignore:81-82` describes the folder as *"One-off debugging probes.
  Throwaway by nature, never referenced by the app."* CLAUDE.md's hard rule is stronger:
  *"A scratch file is deleted in the same command that created it, so a crashed session cannot
  leave one behind."* Two 1.6 GB build worktrees cannot follow that rule literally, which is
  why they need an explicit close-out step instead. The brief itself points agents at
  `.scratch/audit2-build/.next/` as read-only evidence, so it must survive until the report is
  compiled — and then go.
- **What to do**: one line in the audit's own close-out: remove `.scratch/audit2-build`,
  `.scratch/audit2-build-nolab` and `.scratch/lab-aside` in the commit that closes this audit,
  and record in the fix-prompt that the build baselines are preserved in
  `work/raw/build.txt`, `build-nolab*.txt` and `route-bundle-stats*.json`, which are the parts
  anyone will actually want later.
- **Saving**: 3.3 GB of local disk; the root loses an entry, back to 30.
- **Risk & gate**: none, once the reports are written. Do not do it while other audit agents
  are still reading.
- **Confidence**: high.

## Owner decisions

1. **How aggressively should `progress.md` be kept short?** The rule you already have — a
   month moves to `docs/history/` once it closes — is not being followed (August is four days
   overdue), and even when followed it lets the root file reach roughly 450 KB by the end of a
   busy month, because the log is currently growing at about 550 lines a day. Three options.
   (a) **Execute the rule you have and put a test under it** — this is root-assets-01, takes
   the file from 600 KB to 45 KB today, and needs nothing from you. (b) **Archive by size
   rather than by month**: whenever the root file passes 2,000 lines it splits into
   `docs/history/progress-2026-09a.md`, `-09b.md` and so on. Same mechanics, fires three or
   four times a month instead of once, keeps the root file always under ~140 KB. (c) **Invert
   the file**: the full session entry always gets written into the month's file in
   `docs/history/`, and root `progress.md` keeps one line per session — date, title, commit —
   so it never grows past a couple of hundred lines and never needs archiving at all. (c) is
   the real fix and the only one that cannot decay, but it changes what every session does at
   the end of its work, so it is yours to call. My recommendation: do (a) now regardless, and
   consider (c) at launch when session volume drops.

2. **What happens to the 43 imported skill packs in `.claude/skills/`?** This was owner
   decision 8 in the last audit and is still open; it is now the largest single lump in my
   territory at 619 KB and 18,578 lines of markdown, 86 % of everything tracked under
   `.claude/`. Two facts are new since last time. First, fourteen of them — the `superpowers-*`
   set — are duplicates: this session can see both your repo's copies and a newer installed
   plugin offering the same fourteen skills, and your copies have not been touched since
   30 March. Second, thirty-eight of the forty-three have never been edited in five months and
   are named by nothing in your project. My recommendation: delete the fourteen duplicates,
   move the rest to your personal `~/.claude/skills/` where they work in every project instead
   of just this one, and keep in the repo only the ten that encode *this* project — the ones
   CLAUDE.md actually points at. Nothing about the site changes; the repository stops being a
   mirror of other people's tooling.

3. **Should `/lab/crop` and its eleven photographs stay?** The room's own header says
   *"Throwaway, with the room. Delete these files, `public/lab/crop/` and the registry row once
   the layout rules are settled"* — and the collection-rework handover records that the crop
   policy was decided by you on 2026-08-27. The complication is that `/lab/collection` now
   imports the room's specimens (`src/app/lab/collection/_archive.ts:3`), so the eleven
   photographs (1.58 MB) are shared, not orphaned. I am **not** proposing you remove them:
   lab rooms are approved design history. I am flagging that the room told a future session to
   delete it and that session will need to know the specimens moved somewhere first. The three
   files I *am* proposing to delete (root-assets-03) are the pre-rename leftovers that no room
   renders at all.

4. **Four subagent prompt files nobody has used** — `comment-analyzer`, `pr-test-analyzer`,
   `type-design-analyzer` and `code-reviewer` (root-assets-12). They arrived with the security
   audit in August, are not in CLAUDE.md's deliberately-three-row subagent table, and no
   session has ever mentioned three of the four. They cost 20 KB and nothing else, so this is
   purely about whether `.claude/agents/` should be the set your instructions describe or a
   drawer. I recommend deleting the three unused ones and keeping `silent-failure-hunter`,
   which has a documented reason to exist even though it has been used once.

5. **`e2e/.shots` is producing about 150 MB a week of throwaway screenshots** and nothing ever
   deletes them (root-assets-11). Last audit measured 91 MB/week and proposed a retention rule;
   the folder got renamed and the rule never happened. A single line in the close-out routine
   ("delete anything in `e2e/.shots` older than a week") fixes it permanently, and none of what
   it deletes is ever needed — the screenshots that matter are either committed as visual
   baselines or pasted into a report. There is also 17 MB of dead scaffolding under `.claude/`
   (`_disabled-gsd`, 7.4 MB, from a workflow abandoned in August, plus 9.4 MB of old shots)
   that can simply go.

## Not-findings

- **Every tracked root config file.** All fifteen re-verified root-pinned by their own tool's
  convention (see the table). `components.json` carries two empty keys (`"tailwind": {"config": ""}`,
  `"registries": {}`) which are the shadcn schema's defaults, not bloat.
- **`package-lock.json` at 541,687 bytes.** Required beside `package.json`, generated, never
  hand-edited. The charter calls it a fact and it is one. It is 45 % of the root's tracked
  bytes and there is nothing to do about it.
- **`progress.md` existing at the root.** `docs/README.md:7-13` pins repo-discovery files
  there deliberately and names this one. My findings are its size (01) and its internal
  ordering (02), never its location.
- **`e2e/__screenshots__` being committed at all.** The visual-regression picture memory, on
  purpose, per `docs/OPERATIONS.md` §1 and audit-1's own not-finding. root-assets-07 records
  weight and growth only and explicitly hands the coverage judgement elsewhere.
- **`README.md`.** Audit-1 finding 05 said it taught two forbidden operations; `fe57798` fixed
  both. Re-read in full: it now says *"Never run `prisma db push`"* with the manual-migration
  path spelled out, describes `ADMIN_EMAIL` correctly, warns against `NEXT_PUBLIC_ADMIN_EMAIL`
  by its security-finding id, and states that deploys are git-only. Nothing to do.
- **`.github/` in full.** `check.yml` is 60 lines of which 25 are comments explaining the
  minute budget and the one-step rule that `scripts/qa/ci-parity.test.mjs` enforces;
  `renovate.json` is 78 lines with a written reason for every packageRule (the Prisma
  client/CLI pairing, the next-auth beta never being grouped, Playwright's browser/package
  coupling). This is the best-documented corner of the repository and I would not change a
  line.
- **`public/geo/countries-110m.json` (107,761 B).** Served, not bundled, on purpose:
  `src/components/directory/alumni-map.tsx:82-100` explains that importing it compiled 105 KB
  of JSON into the heaviest route's first load, and `next.config.ts:200-208` gives `/geo/:path*`
  an immutable cache header. The comment even records that replacing the atlas requires
  renaming the file because of that header. Exactly the right shape; audit-1's "the gazetteer
  stays cities500" ruling is a different file and also still stands.
- **The four brand-mark SVGs (3,955 B, zero references).** Audit 1 decided to keep them as the
  brand source of truth and evicted the 381 KB PNG instead (`5258628`). Re-verified: the PNG is
  gone, the SVGs remain, `rishi-valley-mountain-mark-light-200.png` is still the Razorpay logo
  in `support-contribute.tsx` and `email/mark.png` is still used by `src/lib/email-templates.ts`.
- **The seven `demo-banyan-*` / `demo-assembly-wide` pairs (14 files, 1.86 MB).** They look
  unreferenced to an exact-path grep because `src/lib/demo-seed/seed.ts:319` builds their URLs
  from a template (`/images/collection/${ph.file}.webp` and `-thumb.webp`) over `DEMO_PHOTOS` in
  `content.ts:682-800`. `src/lib/demo-seed/content.test.mjs:170-200` opens every one with sharp
  and asserts the recorded dimensions and the thumbnail ratio. Fully alive, and a good
  illustration of why grep alone never declares death.
- **`public/images/landing-original.jpeg` (6.2 MB, untracked).** `.gitignore:35-37` documents
  it as the uncompressed hero source kept locally to re-export from. Working as designed; it is
  why `public/` is 13 MB on disk and 6.49 MB tracked.
- **The documented backstop ignore lines** (`.planning/`, `.codex/`, `.agents/`,
  `recovery-codes.txt`, `.next-stale*/`, `.geonames-tmp/`, `.vercel`). Each carries a written
  reason and often a date; audit 1 defended them and I re-checked each subject on disk. The one
  ignore rule with no reason and no subject anywhere is `supabase/.temp/` — that is
  root-assets-08.
- **`next-env.d.ts` at the root, untracked.** Regenerated by Next on every dev/build,
  gitignored at `:31`. Correct.
- **`sanan's stuff/`.** Not opened, per owner decision 15. Present, 130 MB, ignored at `:72`,
  referenced by nothing tracked. Reported as state only.

## Audit-1 carry-overs in this territory

- **Owner decision 8 — relocating the imported skill packs out of `.claude/`: STILL OPEN**, and
  now measurable at 43 dirs / 85 files / 18,578 lines / 619,393 B, with 38 of them untouched
  since 2026-03-30 and 14 shadowed by an installed plugin. See root-assets-04 and owner
  decision 2 above.
- **Owner decision 1 — the landing showcase's fate: STILL OPEN.** Current state: `src/app/page.tsx`
  renders the hero only; the showcase import sits in a comment block at `:18-28` behind the
  removed `SHOW_SHOWCASE` flag, and `a808af8` decoupled it into
  `src/components/landing/showcase.tsx`. Its five images (`public/images/landing/*.webp`,
  283,284 B) are still tracked and are reachable through `/lab/landings`, which imports
  `shots.ts` directly. So the assets are not dead, but they ship for a page nobody sees. No
  action from me; the decision is whether the showcase returns.
- **Owner decision 5 — `sanan's stuff` leaves the repo folder: NOT DONE.** Still present at
  130 MB (audit 1 measured 132 MB). Reported as state only, per the charter.
- **Owner decision 15 (this audit's brief) — do not open `sanan's stuff/`:** honoured; `ls -d`
  only.
- **Finding 06 (progress.md archive): PARTLY DONE and already decayed.** June and July moved on
  2026-08-26; the rule was written into `docs/README.md:36`; nothing enforced it and the file
  is now 86 % larger than when the finding was written. root-assets-01.
- **Finding 07 (tsbuildinfo out of the root): DONE.** `tsconfig.json:27` sets
  `"tsBuildInfoFile": "node_modules/.cache/tsconfig.tsbuildinfo"`; no root file exists.
- **Finding 12 (a retention rule for the screenshot dump): NOT DONE — only the rename was.**
  `temporary screenshots/` became `e2e/.shots/` (`c8d0e87`); the retention rule was never
  adopted and the run rate rose from 91 to ~150 MB/week. root-assets-11.
- **Finding 13 (dead `.gitignore` lines): DONE, and a new orphan has appeared since.** The Yarn
  PnP, coverage, build and SQLite blocks are gone (`0a73211`); the file is now 119 lines with
  34 patterns. The new dead lines are the 2026-08-28 consolidation's leftovers. root-assets-08.
- **Finding 14 (the `.DS_Store` sweep and the two `public/` droppings): DONE and reverted.**
  `public/images/dev-compare/` and `public/uploads/2026/` are both gone from disk; the
  `.DS_Store` sweep held for nine days and there are 25 again. root-assets-10.
- **Finding 16 (evict the 381 KB brand PNG): DONE** (`5258628`); the four SVGs correctly stayed.
- **Finding 17 (thin the collection images): DONE except one file.** `77dc9da` removed
  `v4-v6`, `c5-c6`, their thumbs and all twelve `gen/` SVGs. `c3-thumb.webp` (87,682 B) was
  missed. root-assets-03.
- **Finding 05 (README): DONE** (`fe57798`), re-read in full and correct.
- **Not-finding: `.puppeteerrc.cjs`.** Audit 1 defended it as root-required; the fix session
  disproved that by folding it into a `"puppeteer"` key in `package.json` and proving
  `skipDownload` still applied. The key is present at `package.json:98-100`. A good example of
  a not-finding being overturned by measurement rather than argument.

## For other lenses

- **scripts-e2e-ci** — `scripts/dev/apple-edge/look.mjs:17` writes `.tmp-shots/edge` at the
  repo root while its nine siblings write to `e2e/.shots/` (root-assets-09); it was written the
  day before the 2026-08-28 consolidation and missed it. Also: the visual suite's weight is 80 %
  concentrated in the seven `fullPage: true` routes (`e2e/visual.spec.ts:267`), and
  `desktop/login.png` is 1.64 MB against `mobile/login.png` at 17 KB — worth one look.
  And 39 rebaseline commits have put 101 MB of PNG blobs into git history in fifteen days.
- **dependency-diet** — `world-atlas` sits in `dependencies` but is imported by exactly one
  file, `src/app/lab/directory/_maps.tsx:28`; the shipped map fetches
  `public/geo/countries-110m.json` instead (`alumni-map.tsx:101`). So a production dependency is
  retained for a lab room plus as the source you regenerate the public copy from. Whether that
  justifies `dependencies` over `devDependencies` is yours; the public JSON would need a
  documented regeneration step either way.
- **lab** — `src/app/lab/crop/_specimens.ts`'s header instructs a future session to delete
  `public/lab/crop/` and the registry row when the layout rules settle, but
  `src/app/lab/collection/_archive.ts:3` now imports `SPECIMENS`, so the eleven photographs are
  shared. The handover already knows (`collection-rework/handover.md:986-987`, F39); flagging so
  the two do not get out of step. Three files in that folder are dead and are my
  root-assets-03.
- **docs** — `docs/README.md:36` states the progress-archive rule that nothing enforces
  (root-assets-01); `CLAUDE.md:133,237` carry two stale tooling counts and `:206` names four
  slash commands that do not resolve (root-assets-06). Both files are mine only for these
  factual claims; their prose is yours.
- **dead-code** — public files with zero references, named so you can cross-check:
  `public/lab/crop/{pano-21x9,phone-9x16,grainy-420}.webp` and
  `public/images/collection/c3-thumb.webp`. The four `public/images/brand/*.svg` are also
  zero-reference but are deliberately kept (audit-1 finding 16).
- **bundle-build** — `public/` ships 6.49 MB to the CDN on every deploy, of which 1.58 MB is
  `/lab/crop` fixtures that only a lab room renders and 283 KB is the switched-off showcase.
  None of it is JavaScript, so it costs no first-load bytes; noting it because "does lab leak
  into production" has a static-asset answer as well as a JS one.

## Metrics

- **Tracked repository**: 33,755,851 bytes (32.19 MiB) across 1,252 files. By directory:
  `e2e` 13.03 MB / 33 files (39 %), `src` 6.83 MB / 771, `public` 6.49 MB / 58 (19 %),
  `docs` 3.27 MB / 129, root 1.15 MB / 15, `.claude` 0.69 MB / 104, `scripts` 0.51 MB / 71,
  `prisma` 0.20 MB / 66, `.github` 0.02 MB / 5. **Pictures are 58 % of the repository.**
- **Root**: 32 entries (`ls -la` minus `.`/`..`); 15 tracked files totalling 1,209,974 B, of
  which `progress.md` is 49.6 % and `package-lock.json` 44.8 % — together 94.4 %. Four ignored
  files present (`.DS_Store` 10,244 B, `.env` 3,105 B, `.env.demo` 846 B, `next-env.d.ts` 296 B)
  and six ignored directories (`.git`, `.next`, `.scratch`, `node_modules`, `sanan's stuff`,
  plus `.claude` partially tracked).
- **progress.md**: 8,545 lines / 600,161 B / 202 `## ` headers, in two opposed chronologies
  (94 headers newest-first in lines 1-4398; 107 oldest-first in lines 4406-8545). Growth since
  the last archive: +4,444 lines / +344,175 B in 8 days = 555 lines/day, ~301 KB/week.
  Archived to date: `docs/history/progress-2026-06.md` 650 lines, `-07.md` 241 lines.
- **public/**: 58 tracked files / 6,806,736 B; 61 on disk / 13 MB (the difference is the 6.2 MB
  ignored `landing-original.jpeg`). Subdirectories by tracked bytes:
  `images/collection` 3,832,336 / 26 files; `lab/crop` 1,916,098 / 14; `images/landing.jpeg`
  498,076 / 1; `images/landing` 283,284 / 5; `images/icons` 152,371 / 4; `geo` 107,761 / 1;
  `images/brand` 15,349 / 6; `images/email` 1,461 / 1. Zero-reference files: 4, totalling
  420,350 B (plus 4 brand SVGs, 3,955 B, deliberately kept).
- **e2e/__screenshots__**: 24 files / 13,589,284 B tracked; **157 blobs / 106,153,137 B in git
  history** across 39 commits since 2026-08-19. Largest: `desktop/landing.png` 2,512,790 B,
  `desktop/login.png` 1,639,795 B, `desktop/birds.png` 1,226,110 B. Full-page routes hold
  10,881,159 B (80 %) in 14 files; band routes 2,708,125 B in 10.
- **.claude/**: 104 tracked files / 720,956 B. Imported skill packs 43 dirs / 85 files /
  18,578 lines / 619,393 B (86 %); this repo's own 9 dirs / 11 files / 1,163 lines / 61,428 B;
  agents 8 files / 650 lines / 40,135 B. Untracked under it: `shots` 9.4 MB,
  `_disabled-gsd` 7.4 MB, `hooks`/`scripts`/`workflows`/`settings.local.json` (all ignored by
  `.claude/*`), `commands/` empty. Largest single pack: `code-review-skill` 23 files /
  7,874 lines / 224,125 B. Skill dirs untouched since 2026-03-30: **38**.
- **.gitignore**: 119 lines, 34 active patterns, 85 comment/blank lines (2.5:1). Patterns whose
  subject is absent from disk *and* undocumented: 1 (`supabase/.temp/`). Comment blocks with no
  pattern: 1 (lines 116-119).
- **.DS_Store**: 281 in the whole tree; **25** in the repo proper (192,612 B) excluding
  `node_modules`, `.next`, `.git` and `.scratch`; 21 excluding `sanan's stuff`. Zero tracked.
  Audit 1 counted 19 on 2026-08-25 and swept them on 08-26.
- **Local disk outside git**: `.scratch` 3.3 GB, `e2e/.shots` 153 MB / 226 files,
  `sanan's stuff` 130 MB, `.git` 231 MB (72.87 MiB packed + 156.99 MiB loose),
  `.claude/shots` 9.4 MB, `.claude/_disabled-gsd` 7.4 MB.
- **Comment-heaviest files in territory** (by hand, not cloc): `.gitignore` 85 comment lines to
  34 patterns (2.5); `.github/workflows/check.yml` 25 to 35 (0.71);
  `.github/renovate.json` 8 `description` blocks over 78 lines. All three are the house idiom
  and are defended above.
