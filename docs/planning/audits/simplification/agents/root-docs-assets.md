# root-docs-assets - simplification audit report

Territory reader for the repository root, `docs/`, `public/`, `prisma/migrations-manual/`, and the
big working files (`progress.md`, `.gitignore`, `README.md`, `CLAUDE.md`/`AGENTS.md` as documents).
Charter: the owner's verbatim request for a clean root ("Critically analyse each thing that's there -
whether it has to be there, whether it can be somewhere else"), plus a full pass over docs/ (which
are live, which are finished-audit artefacts, which point at ghosts), public/ (what is referenced,
what is dead weight), the 50 manual migrations (stay/squash/move, with numbers), and README currency.
Date: 2026-08-25. Files in territory: ~185 (36 root entries, 97 tracked docs files incl. the
untracked simplification working set, 80 public files on disk / 72 tracked, 50 migration SQL files).
Read fully: every root file and config, every docs file outside `audits/simplification/` at least to
classification depth, all public listings with per-file reference greps, migration folder headers.

## Coverage

- Read fully: all 16 tracked root files (`.gitignore`, `.mcp.json`, `.puppeteerrc.cjs`, `AGENTS.md`,
  `CLAUDE.md`, `README.md`, `components.json`, `eslint.config.mjs`, `package.json`,
  `postcss.config.mjs`, `prisma.config.ts`, `tsconfig.json`, `vercel.json`; `next.config.ts` judged
  at HEAD only, `package-lock.json` by size/lines only as generated); `docs/README.md`,
  `docs/OPERATIONS.md`, `docs/ROADMAP.md` (headers + decision log), `docs/planning/bugs.md` (header),
  `docs/planning/leads-to-follow.md` (header + privacy preamble), `docs/planning/catchups-fixes-brief.md`
  (header), `docs/spec/person-row-audit.md` (header), `docs/spec/profile.md` (banner),
  `docs/planning/audits/fix-ledger.md` (header + owner-decision list), whatsapp-curation
  (`overflow.md`, `picks.md` headers; `picks.json` reference trace), `.gitignore` line by line.
- Skimmed (why): `docs/spec/*` beyond banners (the spec CONTENT belongs to the territory agents;
  I judged staleness markers and cross-references only); `progress.md` (charter says structure and
  size only: 4,315 lines, 101 session headers, formats counted); `prisma/migrations-manual/*.sql`
  (headers/filenames only per charter; cloc numbers used for content ratios);
  `docs/planning/audits/bug-report-2.md` (748 lines; classification, not re-audit);
  `docs/content/DELIGHT.md` (reference check at line 379 only).
- Not read (why): the two audit JSON dumps' contents (`findings-raw.json`, `verdicts-merged.json` -
  machine output of a closed audit; only their size, line count and referrers matter here);
  `overflow-stories.pdf` (binary); `sanan's stuff/` contents beyond `du` (owner's private folder;
  listing sizes was enough and reading further felt wrong); `docs/planning/audits/simplification/`
  (this audit's own working set - excluded from findings, it is live WIP).
- Uncommitted edits seen (someone else's WIP): at my read time `git status --short` showed only
  `?? docs/planning/audits/simplification-report.md` and `?? docs/planning/audits/simplification/`
  (this audit's own outputs). The WIP my charter warned about (next.config.ts, src/lib/admin.ts,
  scripts/qa/phase7-probe.mjs, manual-tour-entry.test.mjs, forbidden.tsx) had been committed as
  `c74d99f feat(admin): a non-admin who asks for /admin is told 'nice try'` before I started, so the
  tree I judged is HEAD = c74d99f. I touched nothing.

## Summary

The root directory is already unusually disciplined: of its 36 entries, **every tracked config file
is pinned to the root by a tool convention I verified** (table below), so the honest answer to the
owner is that the crowding he sees is five things, not twenty: the two gitignored personal folders
(`sanan's stuff/` 132MB, `temporary screenshots/` 91MB), the 317KB `progress.md`, a 1.2MB
`tsconfig.tsbuildinfo` that can be relocated with one tsconfig line, and `.DS_Store`. The real
weight in my territory is elsewhere: **docs/planning/audits/ holds ~1.24MB of a bug audit that
closed today** (all 203 findings dispositioned) with no archive convention, **public/ carries
3.05MB of never-referenced WhatsApp originals** (33% of everything tracked under public/) plus
199KB of QR codes orphaned by the Razorpay switch, and **docs/content/ holds a 1.79MB PDF+HTML
compilation nothing references**. Six docs point at files that no longer exist, and README.md
actively instructs two things the project now forbids (`prisma db push` against the shared live DB,
and the deleted `/api/auth/admin-login` bypass) - the worst single doc defect I found, because
README is what a fresh machine follows. Structural-vs-cheap split: roughly 10 structural findings
(~6.4MB tracked shed, ~8,850 cloc lines, an archive scheme that prevents recurrence) and 5 cheap
ones (ignore-file trimming, .DS_Store, a duplicated table). What surprised me: the migrations
folder, which I expected to condemn, is the best-kept part of the territory - 50 dated idempotent
files whose 1.24 comment/code ratio is the owner's documented standard, and I recommend not
touching it.

## The root directory, entry by entry (the charter's floor)

Verdict key: **required-here** (tool convention, verified how) / **can-move** / **should-not-exist**
/ **owner-call**. "Verified" means I read the installed tool's own docs or code in `node_modules`,
or the file's own documented reason, not my memory.

| Entry | Size | Tracked | Verdict | Evidence and (for moves) the exact edits |
|---|---|---|---|---|
| `package.json`, `package-lock.json` | 3KB / 574KB (15,982 lines) | yes | required-here | npm root convention; lockfile must sit beside it. |
| `next.config.ts` | 18KB | yes | required-here | Next.js loads it from the project root only. (Content belongs to lib-core-config.) |
| `tsconfig.json` | 1.2KB | yes | required-here | tsc/Next resolve it from root; `.next/types` include paths are root-relative. |
| `eslint.config.mjs` | 3KB | yes | required-here | ESLint flat config resolves from cwd/root. |
| `postcss.config.mjs` | 94B | yes | required-here | Verified in `node_modules/next/dist/docs/02-pages/02-guides/post-css.md:89`: "create a `postcss.config.json` file in the **root** of your project" (js variant same). Tailwind v4 hangs off this. |
| `components.json` | 520B | yes | required-here | Verified in `node_modules/shadcn/dist/index.js`: preflight does `resolve(e.cwd, "components.json")` - the CLI looks in the directory it runs in, i.e. the repo root. CLAUDE.md instructs checking it before adding a component. |
| `prisma.config.ts` | 1.2KB | yes | required-here | Prisma CLI discovers `prisma.config` from cwd (`node_modules/prisma/build/cli.js:179`); the file itself documents the one-env-file decision of 2026-08-08. |
| `vercel.json` | 278B | yes | required-here | Vercel reads project config from repo root; holds `bom1` + the two crons. |
| `.mcp.json` | 670B | yes | required-here | Claude Code project-scope MCP config; the checked-in-at-root location is the sharing mechanism itself. |
| `.puppeteerrc.cjs` | 512B | yes | required-here | Puppeteer/cosmiconfig resolves rc from project root; the config is dynamic (`process.env.VERCEL === "1"`) so it cannot fold into a package.json key, which only takes static JSON. Its header comment justifies its existence (saves a ~130MB Chrome download per Vercel build). Not-finding. |
| `.gitignore` | 3KB | yes | required-here (content finding 13) | git convention. |
| `.github/` | - | yes | required-here | GitHub only reads workflows from `.github/workflows`. (Contents: scripts-e2e-ci.) |
| `CLAUDE.md` | 18.6KB, 264 lines | yes | required-here (size: finding 15 + owner decision) | Claude Code convention; loaded into every session. |
| `AGENTS.md` | 3.2KB | yes | required-here | Top block is written and re-added by `next dev` (`node_modules/next/dist/server/lib/generate-agent-files.js`, named in the file itself); moving it recreates the untracked copy forever. |
| `README.md` | 4.5KB | yes | required-here (content: finding 05) | GitHub/repo convention. |
| `progress.md` | 317KB, 4,315 lines | yes | owner-call (finding 06: archive, never delete) | `docs/README.md:7` deliberately keeps "repo-discovery files" at root and names it. |
| `next-env.d.ts` | 288B | no (ignored) | required-here | Generated by Next on every dev/build; gitignored at `.gitignore:54`. Correct as-is. |
| `tsconfig.tsbuildinfo` | 1.2MB | no (ignored) | can-move (finding 07) | Product of `"incremental": true` + `npx tsc --noEmit` in `scripts/qa/check.mjs:99`; tsc writes it beside tsconfig unless `tsBuildInfoFile` says otherwise. One-line relocation. |
| `.DS_Store` | 16KB (19 files repo-wide, ~168KB) | no (ignored) | should-not-exist (finding 14) | Finder droppings; already ignored at `.gitignore:24`. |
| `.env`, `.env.demo` | 3KB / 846B | no (ignored) | required-here | `prisma.config.ts` loads `.env` by explicit root path; README documents it as the only env file; `.env.demo` is named by `docs/TRAPS.md:21` and `docs/spec/demo.md:46` as the demo credential file, passed by path to `run-sql.mjs`. Both ignored via `.env*`. |
| `node_modules/`, `.next/` | - / 5.1GB dev | no | required-here | Toolchain-owned. `.next` belongs to the other session's dev server; untouched. |
| `src/`, `prisma/`, `public/`, `docs/`, `scripts/`, `e2e/`, `.claude/`, `.git/` | - | mixed | required-here | The project's shape; contents judged separately. |
| `sanan's stuff/` | 132MB | no (ignored `.gitignore:94`) | owner-call (finding 11) | Not part of the app; contains `recovery-codes.txt` (credentials), WhatsApp export 104MB, Razorpay docs 13MB. |
| `temporary screenshots/` | 91MB, 177 PNGs (all < 7 days old) | no (ignored `.gitignore:63`) | owner-call on name; keep + retention rule (finding 12) | The designated screenshot dump; its exact name is hardcoded in 9+ scripts (`scripts/qa/screenshot.mjs:14`, `verify-shot.mjs:37`, `theme-shots.mjs:31`, `drive.mjs:37`, `map-cluster-verify.mjs:151`, `tour-mobile-verify.mjs:23`, `screenshot-auth.mjs:27`, `_dir-room-shots.mjs:15`) and `scripts/README.md:15`. |

Net: **nothing tracked at the root can move without breaking a tool convention.** The cleanups that
exist are findings 06, 07, 11, 12, 14 below.

## Findings

### root-docs-assets-01 - Archive the closed bug audit; delete its two machine dumps
- **Where**: `docs/planning/audits/` - `bug-report-2.md` (748 lines, 122.5KB),
  `bug-report-2-appendix-refuted-and-dupes.md` (31 lines, 6.1KB), `fix-ledger.md` (241 lines,
  73.7KB), `fixer-prompt.md` (159 lines, 11.6KB), `task_plan.md` (59 lines, 4.1KB),
  `findings-raw.json` (4,615 lines, 559KB), `verdicts-merged.json` (3,152 lines, 435KB),
  `db-indexes-live.json` (651 lines, 25.8KB), `db-sizes-live.json` (66 lines, 0.9KB); plus at
  `docs/planning/`: `bug-audit-prompt.md` (345 lines, 27.2KB) and `audit-assets/` (`blns.txt` 742
  lines + `anthropic-code-review-pipeline.md` 109 lines, 37KB together).
- **Phase**: relocate (the .md files) + dead (the two JSON dumps)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous (the archive move); owner only
  on whether the prompts are kept as reusable playbooks (see Owner decisions)
- **Evidence**: `fix-ledger.md:6`: "**THE RUN IS COMPLETE (2026-08-25).** All **203** ids of the
  second pre-release audit are disposed of... Nothing is left open." Nothing executable reads any of
  these paths: `.github/workflows` contains zero `docs/` references; `scripts/qa/audit-status.mjs`
  probes the code, not these files (its only "progress"/audit-doc mentions are prose in comments).
  Source comments cite findings by NAME ("bug-report-2 C-198" in `src/proxy.ts:119`, C-006 in
  `src/app/api/users/search/route.ts:74`, C-086, C-004, C-044, C-194, C-052 and more) - by id, never
  by path, so a folder move breaks nothing. The JSON dumps are the machine intermediates of the
  finished run; `fix-ledger.md:10-11` says the ledger and `verdicts-merged.json` "reconcile exactly
  - 203 against 203", so the human-readable ledger now carries the same disposition data.
- **What to do**: `git mv` the nine audits/ files plus `docs/planning/bug-audit-prompt.md` and
  `docs/planning/audit-assets/` into `docs/planning/audits/archive/2026-08-bug-audit/` (keep every
  filename unchanged so the C-id citations stay one `git grep bug-report-2` away). Then `git rm`
  `findings-raw.json` and `verdicts-merged.json` from the archive - git history is their archive,
  and the ledger + report are the readable record. Before archiving `fix-ledger.md`, copy its
  "still the owner's to decide" block (C-032, C-012, C-138, C-135, C-165/C-166, C-186, C-112/C-167)
  into `docs/planning/bugs.md` so the only live content in the ledger keeps living in the live
  tracker. Add one line to `docs/README.md`'s planning entry naming the archive convention. When
  THIS simplification audit closes, its working set (`audits/simplification/`,
  `audits/simplification-report.md`, `docs/planning/simplification-audit-prompt.md`) follows the
  same route into `archive/2026-08-simplification/`.
- **Saving**: 7,767 cloc JSON lines and ~994KB deleted; ~1.28MB of md relocated out of the working
  docs tree; and a convention that stops the next audit's leftovers accumulating (the owner's stated
  meta-complaint).
- **Risk & gate**: low. `npm run check` (proves no test read them); `git grep -l "findings-raw\|verdicts-merged"`
  returns only intra-archive references afterwards.
- **Confidence**: high. The one thing that would change my mind: if the owner still opens
  `fix-ledger.md` weekly for the owner-decision list - which is exactly why the What-to-do copies
  that block into bugs.md first.
- **Notes**: I considered proposing deletion of `bug-report-2.md` itself (122KB) and rejected it:
  eight-plus source comments cite its finding ids, the owner reads it, and it is the project's best
  evidence of pre-release diligence. Archive, don't delete. `db-indexes-live.json` is still being
  used as an input by this simplification audit's data-layer lens - move it only when this audit
  closes, or move it now and update the one path in `docs/planning/simplification-audit-prompt.md`;
  I flagged it in the file list so the fixer decides with current knowledge.

### root-docs-assets-02 - Delete the two never-referenced WhatsApp originals from public/
- **Where**: `public/images/collection/WhatsApp Image 2026-05-13 at 7.37.16 am.jpeg` (1,593,201
  bytes) and `...7.37.17 am.jpeg` (1,459,007 bytes) - both filenames contain U+202F (narrow
  no-break space) between the time and "am".
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: owner (he committed them; recommend delete)
- **Evidence**: Added in `ba61ac1 "adding photos to demo"` alongside two (since-deleted) security
  docs, and never wired to anything: `grep -rIl "WhatsApp Image" src scripts prisma docs` hits only
  audit output. The demo photos that actually shipped are the `demo-banyan-*.webp` /
  `demo-assembly-wide.webp` set (Aug 7, referenced from `src/lib/demo-seed/content.ts`), which
  superseded whatever these were for. The U+202F in the names broke cloc outright ("Unable to
  read", `raw/cloc-summary.txt:3-4`) and will break any shell script that touches them unquoted.
  They are 3.05MB = 33% of the 9.13MB tracked under `public/`, and being under `public/` they are
  **served on the production domain** at a guessable URL, full resolution, no access control.
- **What to do**: `git rm` both files (quote carefully or use `git rm 'public/images/collection/WhatsApp*'`).
  If the owner wants the originals kept, they belong in `sanan's stuff/` or the R2 backup bucket,
  not in the deploy. Optionally note in the commit that git history still holds them; a history
  rewrite to purge them is a separate, heavier owner decision I am NOT recommending pre-launch.
- **Saving**: 3.05MB tracked and deployed; two filenames that tooling cannot read.
- **Risk & gate**: low. Verification before delete: `git grep -F "7.37.1"` (already 0 hits in code),
  and because old DB rows could in theory hold a URL, run
  `SELECT url FROM "Photo" WHERE url LIKE '%WhatsApp%'` in the fix session (which has DB access) -
  I could not, read-only. Then `npm run verify:crawl` for /collection.
- **Confidence**: high on "unreferenced in the repo"; medium on "unreferenced by live DB rows"
  until that one query runs.
- **Notes**: This is the single biggest tracked-file deletion available in my whole territory.

### root-docs-assets-03 - Move or delete the 1.79MB overflow-stories PDF + HTML
- **Where**: `docs/content/whatsapp-curation/overflow-stories.pdf` (1,586,517 bytes) and
  `overflow-stories.html` (203,493 bytes, 1,198 lines - this one file is the repo's entire cloc
  HTML count, 1,064 code lines).
- **Phase**: relocate (or dead, owner's choice)
- **Tier**: T1     **Class**: structural     **Decides**: owner
- **Evidence**: Zero inbound references from CLAUDE.md, README, docs, src, scripts, .github, e2e,
  prisma (basename grep). Committed as `876ddf3 "docs: overflow stories compiled to PDF for later
  use"` - an output kept "for later", not an input. The actual live inputs of the curation pipeline
  are `picks.json` (read by `scripts/dev/seed-curated-content.ts:91`), `picks.md` and `overflow.md`
  (both cited by that script's comments at lines 7 and 190-248) - none of which is the PDF/HTML.
- **What to do**: Move both to `sanan's stuff/` (they are exactly its kind of content: compiled
  personal material) or delete from the tree; either way `git rm` them - git history keeps the
  compiled artifact if it is ever wanted. `docs/README.md`'s content/ entry needs no edit (it never
  mentions them).
- **Saving**: 1.79MB tracked; 1,064 cloc HTML lines (the whole HTML language row disappears).
- **Risk & gate**: none beyond owner preference; `npm run check`.
- **Confidence**: high. Would change my mind: the owner saying the PDF is his distribution copy for
  the alumni group - then it still doesn't need to be in a git repo that deploys a website.

### root-docs-assets-04 - Delete the five orphaned support-QR SVGs
- **Where**: `public/images/support-qr.svg`, `-500.svg`, `-1000.svg`, `-2000.svg`, `-5000.svg`
  (199,326 bytes total).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `git log -S "support-qr" -- src` shows the arc: added for the UPI support page
  (`46c375c`, `1f549b3 "added actual qr codes"`), then removed from src by
  `0fc7160 "payment through razorpay!"`. Today `grep -rIn "support-qr" src --exclude-dir=generated`
  returns nothing; the only referrers are the generator (`scripts/gen-support-qr.mjs`),
  `scripts/README.md`, and a done-item in `docs/planning/bugs.md:369`. The support page's only
  image today is `brand/rishi-valley-mountain-mark-light-200.png`
  (`src/components/support/support-contribute.tsx:217`, the Razorpay checkout logo).
- **What to do**: `git rm` the five SVGs. Cross-territory consequence for scripts-e2e-ci and
  dependency-diet: `scripts/gen-support-qr.mjs` then generates files nothing uses, and the
  `qrcode` + `jsqr` devDeps exist for it (knip already lists them unused) - the three should go in
  the same commit, minus the scripts/README line. If the owner might revive scan-to-pay, the
  generator's git history is the archive.
- **Saving**: 199KB tracked (+ ~150 script lines and 2 devDeps in the neighbours' territory).
- **Risk & gate**: low; `npm run verify:crawl` (the /support route), `npm run check`.
- **Confidence**: high. Would change my mind: a QR rendered anywhere I can't grep - but the
  bug-audit crawled every route 3 days ago and the support flow is Razorpay's modal.

### root-docs-assets-05 - Rewrite README.md: it teaches two forbidden operations
- **Where**: `README.md:10` and `:37-39` (admin bypass), `:54-58` and `:107-108` (db push),
  `:66-90` (project structure), `:1` (title).
- **Phase**: rewrite (of a doc)
- **Tier**: T2     **Class**: structural (correctness of the front-door doc)     **Decides**: autonomous
- **Evidence**: (a) Line 10/37-39 documents "admin bypass via `ADMIN_EMAIL`... enables the
  password-less admin bypass at `/api/auth/admin-login`" - that route was **deleted** in the
  2026-08-20 security work (audit C1-b) and its deletion is pinned by
  `src/lib/security-regressions.test.mjs`; AGENTS.md says so explicitly. README tells a new machine
  to rely on a hole the project closed. (b) Steps 4 ("Push the database schema: `npx prisma db
  push`") and deploy-step 4 instruct the exact command CLAUDE.md's Hard Rules forbid because one
  Supabase database backs production AND local dev and `db push` "will try to DROP tables it
  considers orphaned" (`docs/spec/catchups.md:462` area, quoted in CLAUDE.md). A newcomer following
  README verbatim points a destructive diff at production data. (c) The structure sketch lists a
  pre-July app: no catchups, letters, collection, lab, proxy.ts; "components/profile/ Admin profile
  tools". (d) The env list omits `DEV_LOGIN_SECRET`, which `scripts/README.md:12` says every QA
  script needs. (e) Title "RV Connect" - the naming rule is user-facing-only, so this is legal, but
  a one-line "(internal name; the site is Rishi Valley)" would prevent the next confusion.
- **What to do**: Rewrite in place, ~same length: swap the bypass paragraph for
  `ADMIN_EMAIL` = role-on-first-login + `DEV_LOGIN_SECRET`/`/api/dev-login` for tooling; replace
  both `db push` steps with the real procedure (schema edit -> dated file in
  `prisma/migrations-manual/` -> `npx prisma generate` -> `node scripts/dev/run-sql.mjs`), or for
  first-time setup point at applying the migrations-manual folder in order; refresh the structure
  block from `ls src/app src/components`; keep the good parts (env table, Vercel notes, R2).
- **Saving**: 0 lines (quality); removes the two most dangerous sentences in the repo.
- **Risk & gate**: none; it is prose. Gate: `security-regressions.test.mjs` stays green (it pins the
  route's absence in code, not the README, but the README must stop advertising it).
- **Confidence**: high.
- **Notes**: I checked whether anything else instructs `db push`: AGENTS.md's "Commands:
  `npx prisma db push`" line under Database has the same defect - one line to fix in the same
  commit (AGENTS.md's architecture section is human-maintained; only the top block is
  next-dev-generated).

### root-docs-assets-06 - An archive scheme for progress.md (317KB at the root)
- **Where**: `progress.md` (4,315 lines, 322,948 bytes, 101 session entries in four header formats:
  70 `## 2026-...`, 24 `## Session 2026-...`, 4 `## Round...`, 3 `## Fork...`; content spans
  2026-06 to 2026-08, overwhelmingly August).
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous mechanics, owner blesses the convention
- **Evidence**: `docs/README.md:12` pins it at root deliberately ("running session history,
  append-only"), so deletion is off the table and moving the live file breaks the convention every
  session follows. But at 4,315 lines it is no longer a discovery file - it is a tar pit that every
  full-file read or naive grep pays for, and it is the second-largest markdown file in the repo.
  References that constrain the move: CLAUDE.md (log outcomes there; stage the entry with the work),
  `docs/README.md:12`, prose mentions in `scripts/qa/audit-status.mjs:22,692` (comments only - it
  never opens the file), and audit prompts (archived by finding 01). Nothing parses it.
- **What to do**: Create `docs/history/` and split by month: `progress-2026-06.md`,
  `progress-2026-07.md`, `progress-2026-08.md` (through some cut date), leaving root `progress.md`
  with the current month plus a two-line header pointing at `docs/history/`. Split key: first date
  in each `## ` header; the four header formats all begin with a parseable `2026-MM`. Edits:
  one sentence added to `docs/README.md:12` ("archived monthly to docs/history/") and one to
  CLAUDE.md's working-agreement bullet. Rule going forward (matches the orchestrator's process
  draft #5): archive when root progress.md passes ~2,000 lines, in the same commit as a session
  entry, never as its own docs commit... which CLAUDE.md's own one-commit rule already implies.
- **Saving**: root file 317KB -> ~40KB; 0 cloc lines (moved, not deleted) - stated honestly.
- **Risk & gate**: low; `git grep -c "progress.md"` before/after to confirm no path consumer;
  `npm run check`.
- **Confidence**: high. Would change my mind: a hook or skill that greps root progress.md for
  recent-session context - I found none in the tracked tree (`.claude/skills/planning-with-files`
  manages its own per-task progress.md pattern, not this file).

### root-docs-assets-07 - Relocate tsconfig.tsbuildinfo out of the root with one line
- **Where**: `tsconfig.tsbuildinfo` (1,221,099 bytes at root, regenerated on every
  `npx tsc --noEmit`); cause: `tsconfig.json:24` `"incremental": true` with no `tsBuildInfoFile`.
- **Phase**: relocate
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `scripts/qa/check.mjs:99` runs `npx tsc --noEmit`; with `incremental` on, tsc drops
  the buildinfo next to tsconfig - i.e., the root the owner looks at. Already gitignored
  (`.gitignore:53` `*.tsbuildinfo`), so this is purely a visible-clutter fix, which is exactly the
  owner's request.
- **What to do**: Add `"tsBuildInfoFile": "node_modules/.cache/tsconfig.tsbuildinfo"` to
  compilerOptions (node_modules/.cache is the conventional tool-cache dump and is already ignored
  wholesale), delete the root file. No other consumer: nothing greps or reads it.
- **Saving**: 1.2MB out of the root listing; incremental type-check speed unchanged.
- **Risk & gate**: negligible; `npm run check` twice (second run should still be fast, proving the
  cache is found at the new path).
- **Confidence**: high.

### root-docs-assets-08 - Six docs point at files that no longer exist; fix the pointers
- **Where**: `docs/ROADMAP.md:3` -> `docs/STACK_MIGRATION.md` (deleted in `c1aca36`);
  `docs/spec/avatars.md:3` -> same; `docs/spec/media.md:3` -> same;
  `docs/spec/profile.md:3` -> `docs/planning/profile-concepts-brief.md` (deleted) and
  `/preview/delight/profiles` (route no longer exists; the room is `/lab/profiles`);
  `docs/content/DELIGHT.md:379` -> `docs/planning/DELIGHT_FIX.md` (deleted in `c1aca36`, yet the
  line says "Kept current"); `docs/planning/bug-audit-prompt.md:305` -> `docs/planning/audits/bug-report.md`
  (the artifact was actually written as `bug-report-2.md`; moot once finding 01 archives the prompt).
- **Phase**: hygiene (doc correctness)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each target verified absent from `git ls-files`; deletion commits found via
  `git log --follow`. The repo already has the right idiom for this: `docs/SECURITY.md:4-6` cites
  its own deleted predecessors and says explicitly they live in git history
  (`git log --follow -- docs/planning/SECURITY-AUDIT.md`) - that is the pattern to copy.
- **What to do**: In ROADMAP/avatars/media, replace the `docs/STACK_MIGRATION.md` mention with
  "(migration runbook lives in git history: `git log --follow -- docs/STACK_MIGRATION.md`)". In
  DELIGHT.md:379 drop the "Kept current" clause and point at history. profile.md's banner is
  finding 09 (it is more than a pointer). Also for the shell-primitives agent:
  `src/lib/utils.ts:193` comments "see docs/spec/color.md", which DESIGN-SYSTEM.md:6 absorbed -
  one-word pointer fix in code, listed under For other lenses.
- **Saving**: ~0 lines; removes six invitations to go looking for ghosts.
- **Risk & gate**: none; prose. `npm run check`.
- **Confidence**: high.

### root-docs-assets-09 - docs/spec/profile.md still says the shipped profile is REJECTED
- **Where**: `docs/spec/profile.md:1-12` (banner) and, in consequence, the 465-line body.
- **Phase**: hygiene / rewrite (doc)
- **Tier**: T2     **Class**: structural (a spec that misstates reality misleads every future session)     **Decides**: autonomous banner fix; owner if the body is to be rewritten
- **Evidence**: The banner: "**THE SHIPPED PROFILE IS REJECTED, 2026-07-25. Read
  `docs/planning/profile-concepts-brief.md` before doing any profile work**" - the brief is deleted,
  the `/preview/delight/profiles` routes it cites are gone (the lab room is `/lab/profiles`), and
  the rejection was RESOLVED: `git log -- "src/app/(main)/profile"` shows
  `22b4b6c 2026-07-30 feat(profile): ship the letterhead as everyone's profile`. CLAUDE.md orders
  every session to read the spec of the area it touches; a session touching profile today is
  ordered to read a banner that (a) forbids work without a file that no longer exists and (b)
  describes as rejected a page that was replaced four weeks ago.
- **What to do**: Minimum viable fix, autonomous: replace the banner with a dated resolution -
  "The rejection of 2026-07-25 was resolved on 2026-07-30 by the letterhead profile (`22b4b6c`);
  the concepts brief lives in git history; the shipped page is the spec's successor where they
  disagree. See `/lab/profiles` for the exploration." The full fix - rewriting the 465-line body to
  describe the letterhead profile - is real work the owner may or may not want pre-launch; flagged
  in Owner decisions.
- **Saving**: 0 lines (banner swap) - honesty over theatre.
- **Risk & gate**: none; prose.
- **Confidence**: high on the facts; medium on how much rewrite the owner wants.

### root-docs-assets-10 - The two doc indexes have drifted from the spec folder
- **Where**: `docs/README.md:21-24` ("Exactly: `avatars`, `catchups`, `demo`, `directory`,
  `lab-voice`, `letters`, `mascot`, `media`, `profile`") vs. disk, which also holds
  `admin.md` (31KB, 2026-08-18) and `person-row-audit.md` (8.8KB, 2026-08-19); `docs/README.md:25-28`
  (planning/ entry) which names bugs.md and FEATURES.md but not the `audits/` or `audit-assets/`
  folders; `docs/README.md:3` "verified against disk on 2026-08-07"; and `CLAUDE.md:14-15`, whose
  spec list ("avatars, catchups, demo, directory, letters, mascot, media, profile, lab-voice")
  omits `admin`.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `ls docs/spec` vs. the quoted lines. docs/README.md:3-5 states its own contract:
  "If you add a doc directory, add it here in the same change... A map that lists folders which do
  not exist is worse than no map." The map now under-lists instead - the same disease, mirrored.
  `admin.md` is a real area spec (the admin rebuild); a session pointed at "the spec for your area"
  for admin work will not find it via either index.
- **What to do**: Add `admin` (and `person-row-audit`, marked as an audit-note rather than an area
  spec) to both lists; add one line for `planning/audits/` naming the archive convention from
  finding 01; refresh the verified-on date. Three files, ~6 lines.
- **Saving**: 0 lines; index correctness.
- **Risk & gate**: none.
- **Confidence**: high.

### root-docs-assets-11 - "sanan's stuff" (132MB) should live outside the repo folder
- **Where**: `sanan's stuff/` at root: WhatsApp 104MB (the chat export the curation came from),
  Razorpay Docs 13MB, Inspiration 11MB, rough databases 2.3MB, Progress Pictures 1MB,
  `recovery-codes.txt` 4KB.
- **Phase**: relocate
- **Tier**: T1 mechanically     **Class**: structural     **Decides**: owner (it is his personal folder)
- **Evidence**: Gitignored (`.gitignore:94`) so it ships nowhere - the cost is local: it is the
  largest thing in the owner's root listing (his stated pain point), every tool that does not
  honour .gitignore (Finder, Spotlight, `du`, naive `find`/grep) wades through it, and
  `recovery-codes.txt` - live credentials - sits inside a folder whose only protection is one
  gitignore line staying intact. `.gitignore:95` separately ignores a root-level
  `recovery-codes.txt`, which suggests the credentials have already lived in two places.
- **What to do**: Owner moves the folder to e.g. `~/Documents/rv-connect materials/` (outside the
  repo; agents' containment rule means they will never touch it there, which is a feature - nothing
  in this repo references it). Move `recovery-codes.txt` to a password manager rather than any
  folder. Keep the two `.gitignore` lines for a release as a backstop, per the repo's own
  documented backstop idiom (`.gitignore:66-71`).
- **Saving**: 132MB out of the working tree; the root's biggest visible entry gone.
- **Risk & gate**: none technical. Nothing in the repo references the folder
  (`grep -rn "sanan's stuff" src scripts docs` - only .gitignore and audit notes).
- **Confidence**: high.

### root-docs-assets-12 - Bound "temporary screenshots" with a retention rule (91MB/week run rate)
- **Where**: `temporary screenshots/` - 177 files, 91MB, and every one is less than 7 days old
  (`find ... -mtime +7` = 0), i.e. this is ~91MB of churn PER WEEK, previously purged by hand.
- **Phase**: relocate (process)
- **Tier**: T2     **Class**: structural (it is the recurrence mechanism, not the megabytes)     **Decides**: autonomous rule; owner if renaming
- **Evidence**: The folder is the designated dump - `scripts/README.md:15` "Screenshots land in
  `temporary screenshots/`" - and 8 QA scripts hardcode the exact name (listed in the root table
  above). It is gitignored, so the only costs are disk and the owner's root view. The all-under-7-days
  age profile proves the hand-purge already happened at least once; the owner's brief for this whole
  audit says that manual deleting "shouldn't have needed to happen".
- **What to do**: Fold into the orchestrator's close-out checklist (process draft #2 in
  `findings.md`): the close-out step runs
  `find "temporary screenshots" -type f -mtime +14 -delete` (or simply empties it - nothing in it
  is load-bearing; the shots that matter are committed as e2e baselines or attached to reports).
  Do NOT rename the folder to `.screenshots/`: hiding it would clean the Finder view but costs
  edits in 9 files + docs, and a visible folder named "temporary" is honest about its contents.
  If the owner wants it invisible anyway, the 9 hardcoded paths are:
  screenshot.mjs:14, screenshot-auth.mjs:27, verify-shot.mjs:37-38, theme-shots.mjs:31,
  drive.mjs:37, map-cluster-verify.mjs:151, tour-mobile-verify.mjs:23, _dir-room-shots.mjs:15,
  scripts/README.md:15 (plus CLAUDE.md's screenshot section implicitly).
- **Saving**: bounds ~90MB/week of local growth at ~90MB steady-state.
- **Risk & gate**: none; the folder is documented as disposable by its own name.
- **Confidence**: high.
- **Notes**: The deeper fix is upstream and belongs to scripts-e2e-ci: the QA scripts write
  full-page PNGs of 0.9-1.6MB each; WebP/JPEG at quality 80 would cut the run rate ~70% (the
  chrome-devtools MCP already screenshots as webp q72 per `.mcp.json`). Cross-referenced there.

### root-docs-assets-13 - .gitignore carries ~14 lines of dead template and dead-stack entries
- **Where**: `.gitignore:6-11` (`.pnp`, `.pnp.*`, `.yarn/*` + 4 un-ignore lines - Yarn PnP, in an
  npm repo), `:14` (`/coverage` - no tool writes it), `:19` (`/build` - Next emits `.next`, never
  `/build`), `:27-31` (yarn/pnpm debug logs), `:37-40` ("prisma sqlite" block: `*.db`,
  `*.db-journal`, `prisma/dev.db*` - SQLite left on 2026-07-01 per AGENTS.md).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: package-lock.json + `npm run` scripts = npm; no yarn/pnpm artifacts in the tree;
  `grep -rn coverage package.json scripts/qa/check.mjs` shows no coverage writer; the SQLite block's
  reason left with the Turso migration. Contrast with the *good* backstops this file keeps on
  purpose with documented reasons (`.planning/.codex/.agents` at :66-79, `recovery-codes.txt`,
  `.next-stale*` with its dated owner story) - those stay; the difference is a written reason.
- **What to do**: Delete the ~14 template lines. Keep `/out` only if `next export` is ever
  plausible (it is not configured); keep `*.pem`, `.DS_Store`, everything with a comment.
- **Saving**: ~14 lines; a config file where every line has a reason again.
- **Risk & gate**: `git status` before/after shows no newly-visible files (nothing matching these
  patterns exists on disk - verified for /coverage, /build, .pnp*, *.db at root).
- **Confidence**: high.

### root-docs-assets-14 - Sweep the 19 .DS_Store files and the two local droppings in public/
- **Where**: 19 `.DS_Store` files (~168KB) at root, docs/, docs/content/, prisma/, public/ (x4),
  scripts/, e2e/ (x2), src/ (x4), .claude/, sanan's stuff (x3); plus `public/images/dev-compare/`
  (empty directory, created Aug 23) and `public/uploads/2026/03/` (two dev-upload webps, 58KB,
  dated March - stale local test uploads; the whole of `public/uploads/` is gitignored).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `find . -name ".DS_Store"` output in my session log; all gitignored
  (`.gitignore:24`), so local-only clutter. `dev-compare/` contains zero files and no code
  references it. The two uploads webps are from the March-era dev filesystem driver
  (`storage.ts` falls back to `public/uploads/` locally per README:43-44) and no current local DB
  row needs them - but as they are local-only, deleting them can inconvenience only this machine.
- **What to do**: One-time: `find . -name .DS_Store -not -path "./node_modules/*" -not -path
  "./.next/*" -delete`, `rmdir public/images/dev-compare`, and optionally empty
  `public/uploads/2026/`. Recurring: make the .DS_Store sweep a line in the close-out checklist
  (they regenerate whenever Finder opens a folder; ignoring them in git, which is done, is the real
  defence - this is cosmetic).
- **Saving**: ~230KB local, zero tracked; a cleaner `ls -la` everywhere, which is the owner's ask.
- **Risk & gate**: none.
- **Confidence**: high.

### root-docs-assets-15 - The visual-regression table is maintained verbatim in two files
- **Where**: `CLAUDE.md:187-207` ("Visual regression" section incl. the 4-row command table) and
  `docs/OPERATIONS.md:11-42` (section 1, same four commands, same one rule, same masking note).
  Similarly the screenshot-commands table exists in both `CLAUDE.md` (Screenshots section) and
  `scripts/README.md:17-27`.
- **Phase**: dedupe (docs)
- **Tier**: T2     **Class**: cheap     **Decides**: owner (CLAUDE.md is his agent operating manual; trimming it changes what every session is force-fed)
- **Evidence**: The two visual tables are row-for-row the same four commands with the same
  warnings; OPERATIONS.md §1 additionally carries the history ("why it is not a ratio") that
  CLAUDE.md omits. Two copies of a table drift the way the "all 14 test files" line in
  scripts/README already has (checks says 75). CLAUDE.md is 264 lines / 18.6KB, injected into every
  session's context; roughly 40 of those lines restate what OPERATIONS.md and scripts/README.md
  own.
- **What to do**: If the owner wants CLAUDE.md leaner: keep in CLAUDE.md the RULES (run visual
  after UI work; never visual:update without reading the diff; a red run is a question) and replace
  the duplicated tables with one-line pointers to `docs/OPERATIONS.md` §1 and `scripts/README.md`.
  If he prefers CLAUDE.md self-contained (defensible - it is the one file agents reliably read),
  then instead mark OPERATIONS §1 as the canonical copy and have CLAUDE.md's table say "copied from
  OPERATIONS.md - edit there first". Either way, ONE file owns the table.
- **Saving**: ~15-25 lines of CLAUDE.md (≈0.5-1KB of every session's context), or zero lines and a
  drift-prevention note - owner's pick.
- **Risk & gate**: none; prose. The check/visual behaviour is untouched.
- **Confidence**: medium - this is a taste call about his most personal file, which is why it is
  Decides: owner.

### root-docs-assets-16 - The unreferenced brand masters: keep the SVGs, evict the 381KB PNG
- **Where**: `public/images/brand/rishi-valley-mountain-mark-dark-4096.png` (381,413 bytes,
  0 references) plus the four mark SVGs (`-dark.svg`, `-light.svg`, `-white.svg`, bare `.svg`,
  ~4KB total, 0 references). The only referenced file in brand/ is
  `rishi-valley-mountain-mark-light-200.png` (`support-contribute.tsx:217`, the Razorpay logo).
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: owner (brand assets)
- **Evidence**: `grep -rIn "mountain-mark" src scripts e2e docs .github` -> exactly one hit, the
  light-200.png. `/lab/logo` "documents the final mark" (CLAUDE.md) but renders it inline - it does
  not load these files. The 4096px PNG was added with the delight-lab commit `d5f1e0c` and is a
  render of the SVG at poster size: regenerable from the 1.1KB vector at will.
- **What to do**: Keep the four SVGs where they are (they are the brand source of truth, 4KB, and
  public/ is a fine canonical home for marks that emails or future pages may hotlink). Move the
  4096 PNG to `sanan's stuff/` (or delete; one `npx sharp` call recreates it from the SVG). Do NOT
  touch light-200.png or `email/mark.png` (`src/lib/email-templates.ts` uses it).
- **Saving**: 381KB tracked and deployed.
- **Risk & gate**: `git grep "4096"` (0 hits today); `npm run check`.
- **Confidence**: high.

### root-docs-assets-17 - The lab-only and possibly-DB-referenced collection images: verify, then thin
- **Where**: `public/images/collection/` - `v1..v6.webp` + thumbs (1,506,382 bytes, referenced only
  by lab rooms: `src/app/lab/viewer/page.tsx`, `lab/everything/_findings.ts`, `lab/profiles/_data.ts`);
  `c1..c6.webp` + thumbs (~1.9MB, referenced by `lab/viewer` and - c1/c3 only - by
  `src/lib/demo-seed/content.ts`); `gen/` - 12 cuid-named placeholder SVGs (~19KB, ZERO code
  references; added by `e22e795 "give each collection photo a distinct placeholder tile"` /
  `c1fab47 "...collection seed variety"`).
- **Phase**: dead (gen/) + relocate/owner (v-series)
- **Tier**: T2 (needs one DB query first)     **Class**: structural     **Decides**: owner for
  anything lab-adjacent (per the brief, lab assets are design history); autonomous for gen/ once
  the query is clean
- **Evidence**: greps above; the live Valley Collection stores uploads on R2
  (`images.rishivalley.space`), but the June-era seed wrote local `/images/collection/...` URLs
  into Photo rows at some point in history, and grep cannot see the database.
- **What to do**: In a session with DB access run
  `SELECT url FROM "Photo" WHERE url LIKE '%/images/collection/%'` (and the same against the demo
  DB via `.env.demo` for c1/c3/demo-*). Whatever the query returns keeps its files. If gen/ comes
  back empty (expected - they were placeholder TILES, superseded per e22e795's successor commits),
  delete the 12 SVGs. The v-series is then lab-only: it STAYS (lab rooms are owner-approved
  history and public/ files cost nothing at build time), unless the owner wants public/ minimal,
  in which case moving lab-only images under a clearly-named `public/images/lab/` folder is the
  cosmetic option - I recommend leaving them and simply knowing they are lab's.
- **Saving**: 19KB certain (gen/); up to ~1.5MB more only if the owner evicts lab assets, which I
  do not recommend.
- **Risk & gate**: the DB query IS the gate; then `npm run verify:crawl` + opening `/lab/viewer`
  and `/collection`.
- **Confidence**: high that gen/ is dead in code; low-medium on the DB until queried - which is
  exactly why the query is step one.

### root-docs-assets-18 - ROADMAP.md carries three superseded claims without their reversal notes
- **Where**: `docs/ROADMAP.md:3` (STACK_MIGRATION pointer - finding 08), the "Keep DB-backed
  sessions" decision bullet (superseded: sessions are JWT with credentialVersion revocation, per
  AGENTS.md which says "This paragraph previously claimed database-backed sessions; the code was
  always JWT"), and the Catch-ups naming bullet citing model names `Catchup`/`CatchupIssue`/
  `CatchupQuestion`/`CatchupAnswer` (the current schema and spec use the CatchupEdition/
  CatchupEntry family; `docs/spec/catchups.md` §6 is the truth).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: ROADMAP already contains the right idiom - the dark-mode bullet carries a bold
  "(Superseded 2026-08-02: ...)" annotation inline. These three bullets never got theirs.
  CLAUDE.md sells ROADMAP as "the phased plan", i.e. it is still a read-first doc.
- **What to do**: Add the same style of dated supersession notes to the three bullets (JWT + where
  revocation lives; current model names + pointer to catchups.md §6; git-history pointer for the
  runbook). Do not rewrite the document - it is deliberate history.
- **Saving**: 0 lines; stops the phased plan contradicting the architecture doc beside it.
- **Risk & gate**: none; prose.
- **Confidence**: high.

## Owner decisions

1. **The archive convention itself (finding 01).** Recommendation: adopt
   `docs/planning/audits/archive/<yyyy-mm>-<name>/` and make "archive the artefacts in the commit
   that closes the audit" a one-line rule in docs/README.md. Everything about finding 01 except the
   JSON deletion can be executed today without you; the JSONs I recommend deleting because git
   history keeps them and the readable ledger duplicates their verdicts.
2. **The two audit prompts** (`bug-audit-prompt.md`, `simplification-audit-prompt.md`, together
   51KB). They encode a methodology you may want to rerun after launch. Recommendation: archive
   them with their runs anyway - a future audit should start from the current tree, and the prompts
   are one `git log` away. If you would rather keep a reusable playbook visible, keep them and add
   a "ran on 2026-08-22/25, results in archive/" line to each.
3. **The WhatsApp originals in public/ (finding 02).** You committed them, so the deletion is
   yours to bless. They are 3MB, publicly served, referenced by nothing, and their filenames break
   tools. My recommendation is delete from the tree today; whether to also purge them from git
   history (a rewrite, disruptive) is a separate call I recommend deferring.
4. **The overflow-stories PDF/HTML (finding 03)** - your compiled anthology material. Keep it in
   `sanan's stuff/` or wherever you keep the anthology project; it does not belong in the website's
   repository.
5. **"sanan's stuff" leaves the repo folder (finding 11)** - and `recovery-codes.txt` goes to a
   password manager. Nothing in the codebase will notice; your root listing halves visually.
6. **How self-contained should CLAUDE.md be (finding 15)?** Leaner-with-pointers or
   complete-but-duplicated. Both are defensible; pick one and the fixer implements it in minutes.
7. **docs/spec/profile.md's body (finding 09).** The banner fix is mechanical, but the 465-line
   spec still describes the pre-letterhead profile. Rewriting it properly is an afternoon of work;
   the alternative is an honest "historical - the letterhead profile (22b4b6c) supersedes the
   layout sections" note. Recommendation: the note now, the rewrite only if profile work is planned.
8. **prisma/migrations-manual stays exactly as it is** (see Not-findings) - flagged here only
   because the charter marks it an owner call. 50 files, 787 lines of SQL, 973 lines of comments,
   ~230KB. Squashing into a baseline would save ~0.2MB and destroy the applied-history audit trail
   of a database that has no other migration record (there is no `_prisma_migrations` table in this
   workflow). The comment ratio is your own documented standard. My recommendation, strongly: keep.

## Not-findings

- **Every tracked root config file** (see table): each verified root-required by its tool's own
  docs or code. `components.json`, `postcss.config.mjs`, `prisma.config.ts`, `vercel.json`,
  `.mcp.json`, `.puppeteerrc.cjs` were the charter's named suspects; all six stay, with evidence.
- **`.puppeteerrc.cjs`**: looks like root clutter, is actually a documented deploy-cost fix
  (~130MB per Vercel build avoided); its logic is dynamic so it cannot fold into package.json.
- **`prisma/migrations-manual/` comment density (1.24 ratio)**: deliberate, owner-standard ("every
  constant argued for in a comment"), and CLAUDE.md's Hard Rules make the folder the load-bearing
  schema-change mechanism. Not bloat.
- **`progress.md` existing at root**: `docs/README.md:7-12` pins repo-discovery files at root by
  design. The finding is its size, never its location or existence.
- **`public/images/landing-original.jpeg` (6.2MB on disk, untracked)**: `.gitignore:57-59`
  documents it - the uncompressed hero source kept locally to re-export from; only the optimised
  landing.jpeg is committed. Working as designed.
- **`docs/planning/leads-to-follow.md`**: zero inbound references but LIVE - it is the launch
  outreach map (centenary contacts) and opens with a privacy warning that is itself valuable. Keep.
- **`docs/planning/catchups-fixes-brief.md`**: still binding - `docs/spec/catchups.md:3` defers to
  it ("COPY AND LAYOUT SUPERSEDED... by catchups-fixes-brief.md. Read that first"). Folding it into
  the spec would be nice but is the catchups territory's call, not an archive candidate today.
- **`docs/SECURITY.md` referencing deleted files**: intentional - it names them AS deleted and
  gives the `git log --follow` incantation. This is the model finding 08 copies.
- **The backstop ignore lines** (`.planning/`, `.codex/`, `.agents/`, `recovery-codes.txt`,
  `.next-stale*/`): each carries a written reason with a date; the repo's documented idiom.
- **whatsapp-curation `picks.json` / `picks.md` / `overflow.md`**: live inputs -
  `seed-curated-content.ts:91` reads picks.json at runtime; its comments cite the other two by
  line. docs/README.md:30 even warns picks.json "is data, not prose".
- **`e2e/__screenshots__` 17MB of PNGs**: they are the visual-regression picture memory,
  committed on purpose (OPERATIONS.md §1). Noted for scripts-e2e-ci only as a size fact.
- **`package-lock.json` at 574KB / 15,982 lines**: answers the charter's "where are the 25,083
  cloc JSON lines" - lockfile 15,982 + findings-raw 4,615 + verdicts-merged 3,152 + db-indexes 651
  = 24,400 of them (97%). The lockfile is required; the other three are finding 01.

## For other lenses

- **scripts-e2e-ci**: `scripts/README.md:20` says check runs "all 14 `*.test.mjs`" - it is 75;
  same file does not list the phase3..phase10 probes. `gen-support-qr.mjs` + `qrcode`/`jsqr`
  devDeps become deletable if finding 04 lands. QA screenshots are ~1MB PNGs; webp/jpeg would cut
  the 91MB/week churn ~70% (`.mcp.json` already screenshots webp q72). `.claude/_disabled-gsd`
  (7.4MB) and `.claude/shots` (9.4MB) are untracked disk under a tracked folder - same close-out
  sweep candidate as my finding 14.
- **shell-primitives**: `src/lib/utils.ts:193` comment cites deleted `docs/spec/color.md`
  (absorbed into DESIGN-SYSTEM.md Appendix B) - one-word pointer fix.
- **lib-core-config**: AGENTS.md "Commands: `npx prisma db push`" line - same forbidden-command
  defect as README (my finding 05 covers both, flagging here since AGENTS architecture prose may
  be your file).
- **data-layer**: `docs/planning/audits/db-indexes-live.json` is your input; findings 01 moves it
  only after this audit closes - coordinate.
- **catchups**: `catchups-fixes-brief.md` fold-into-spec opportunity (Not-findings above).
- **dependency-diet**: finding 04 releases `qrcode` + `jsqr`; finding 01/03 do not touch deps.
- **lab**: the v-series/c-series public images are your rooms' assets (finding 17); if `/lab` is
  ever excluded from production builds, note their public/ files ship regardless.

## Metrics

- Root entries: 36 (16 tracked files, 5 ignored files, 13 directories, `.git`/`.` aside). Tracked
  root files verified root-required: 16 of 16.
- docs/: 97 tracked files (charter said ~40 before this audit's own working set landed);
  17,435 cloc md lines. Zero-inbound-reference docs: `overflow-stories.pdf`, `overflow-stories.html`,
  `fixer-prompt.md`, `bug-audit-prompt.md`, `simplification-audit-prompt.md`, `leads-to-follow.md`
  (live anyway - outreach map), `spec/media.md` (path-level only; CLAUDE.md names the area, so live).
- Docs referencing dead paths: 6 files, 7 pointers (finding 08/09) + 1 in src (utils.ts:193).
- public/: 80 files on disk (15MB), 72 tracked (9.13MB). Unreferenced tracked files by name+size:
  2 WhatsApp jpegs 3,052,208B; 5 support-qr SVGs 199,326B; mark-dark-4096.png 381,413B; 4 mark
  SVGs 3,955B (keep - brand masters); 12 gen/ SVGs ~19KB (pending one DB query); v1-v6+thumbs
  1,506,382B (lab-only, keep).
- prisma/: schema.prisma 1,330 lines / 63KB; migrations-manual 50 files, 787 SQL code / 973
  comment / 155 blank lines, ~230KB.
- progress.md: 4,315 lines, 322,948 bytes, 101 session headers (70 `## 2026-`, 24 `## Session`,
  4 `## Round`, 3 `## Fork`), June:July:August date mentions 29:6:102.
- **Total the repo sheds if all recommendations land**: tracked tree ~6.4MB
  (3.05 WhatsApp + 1.79 overflow + 0.95 JSON dumps + 0.20 QR + 0.38 brand PNG + 19KB gen/),
  ~8,850 cloc lines (7,767 JSON + 1,064 HTML + ~20 config/doc lines); local disk ~135MB
  (132MB moved out + tsbuildinfo relocated + droppings) with `temporary screenshots` newly bounded
  at ~90MB steady-state instead of unbounded.
- Comment-heaviest file in territory: `prisma/migrations-manual/` aggregate at 1.24 (intentional);
  biggest files: progress.md 317KB (md), overflow-stories.pdf 1.6MB (binary),
  findings-raw.json 559KB (JSON).
