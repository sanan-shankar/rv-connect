# Verifier v-root-docs — working notes (2026-08-25)

HEAD at verification time: `c74d99f` (same as the find phase's snapshot; this cluster's
tree did not move under it). Working tree: only the audit's own untracked files under
`docs/planning/audits/`. No uncommitted edits on any file examined here.

## root-docs-assets-08 — six dead doc pointers — CONFIRMED

All targets absent from `git ls-files` (grep for `STACK_MIGRATION|profile-concepts-brief|DELIGHT_FIX`
returns nothing). Source lines all verified verbatim at HEAD:

- `docs/ROADMAP.md:3` — "see `docs/STACK_MIGRATION.md` for the infra migration runbook"
- `docs/spec/avatars.md:3` — "See `docs/STACK_MIGRATION.md`."
- `docs/spec/media.md:3` — "Current source for the stack: `docs/STACK_MIGRATION.md`."
- `docs/spec/profile.md:3` — "Read `docs/planning/profile-concepts-brief.md`" plus
  "`/preview/delight/profiles`" at line 9; `src/app/preview` does not exist, `src/app/lab/profiles` does.
- `docs/content/DELIGHT.md` (~line 378 in the block 375-381) — "consult it for WHAT to build before
  consulting `docs/planning/DELIGHT_FIX.md` for HOW/where. Kept current for..."
- `docs/planning/bug-audit-prompt.md:305` — "`docs/planning/audits/bug-report.md`"; the folder holds
  `bug-report-2.md` and no `bug-report.md`.

`git show --stat c1aca36` confirms it deleted `docs/STACK_MIGRATION.md` (162 lines) and
`docs/planning/DELIGHT_FIX.md` (94 lines). The cited SECURITY.md idiom exists.

## root-docs-assets-09 — profile.md REJECTED banner — CONFIRMED

`docs/spec/profile.md:1-9` banner reads verbatim: "**THE SHIPPED PROFILE IS REJECTED, 2026-07-25.
Read `docs/planning/profile-concepts-brief.md` before doing any profile work.**" and cites
"`/preview/delight/profiles` (`passport`, `broadsheet`, `terrace`)". The brief is deleted, the
preview route tree is gone, the room is `/lab/profiles`. Resolution commit verified:
`22b4b6c feat(profile): ship the letterhead as everyone's profile` — its stat shows
`src/components/profile/letterhead-profile.tsx` (+603) and rewrites of
`src/app/(main)/profile/[id]/page.tsx` and `loading.tsx`, with the old header-card/about
components deleted. The spec's banner contradicts shipped reality.

## root-docs-assets-10 — doc indexes drifted — CONFIRMED

`docs/README.md:21-22`: "`docs/spec/` — area specs. Exactly: `avatars`, `catchups`, `demo`,
`directory`, `lab-voice`, `letters`, `mascot`, `media`, `profile`." — 9 names. `ls docs/spec` at
HEAD: those 9 plus `DESIGN-SYSTEM.md` (listed separately, fine) plus **`admin.md`** and
**`person-row-audit.md`** — both unlisted. `docs/README.md:25-28` planning entry names `bugs.md`
and `FEATURES.md` "plus point-in-time briefs" but not the `audits/` or `audit-assets/` directories,
both on disk. Line 3: "verified against disk on 2026-08-07" — stale by its own contract (lines 3-5).
CLAUDE.md's own spec list ("avatars, catchups, demo, directory, letters, mascot, media, profile,
lab-voice") is the second index, also missing `admin`.

## root-docs-assets-05 — README teaches forbidden operations — CONFIRMED-WITH-CORRECTION

Line numbers verified at HEAD:
- `README.md:10` — "admin bypass via `ADMIN_EMAIL`"
- `README.md:37-39` — "`ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_EMAIL` — ... also enables the
  password-less admin bypass at `/api/auth/admin-login`". That route exists only in comments and
  in `src/lib/security-regressions.test.mjs:30-33`, which pins its ABSENCE.
- `README.md:56` and `:107` — `npx prisma db push` in both local setup and deploy steps
  (CLAUDE.md hard rule forbids it; one shared prod/dev database).

Correction (an addition): the count of dangerous instructions is three, not two.
`README.md:37` and `:104-105` instruct setting **`NEXT_PUBLIC_ADMIN_EMAIL`** (locally AND in the
Vercel dashboard), but `scripts/qa/audit-status.mjs:139-145` (audit **C1-c**, severity critical,
"Admin email compiled into the browser bundle") probes that this var is referenced nowhere in
`src/` and absent from `.env` — the README tells a new machine to reopen a closed critical
finding. No app code reads it (only a comment in `login-client.tsx:547` and the probe itself).
Minor extras for the rewrite: `NEXTAUTH_URL` (`:36`, `:104`) is read by no app code
(`raw/env-flags.txt` and repo grep agree; only comments mention it), while `DEV_LOGIN_SECRET` —
which every QA script needs per `scripts/README.md:11-14` — is missing from the env list entirely.

## root-docs-assets-15 — visual-regression table duplicated — CONFIRMED-WITH-CORRECTION

- `CLAUDE.md:187-207` and `docs/OPERATIONS.md` section 1 (lines 11-42) both carry the same
  4-row table. Headers, quoted: CLAUDE.md:194 `| Command | Use |` / OPERATIONS.md:18
  `| Command | Use |`. Same four rows (`visual`, `visual:update`, `visual:report`, `test:e2e`),
  same "never run visual:update without opening the diff" rule, same masking note; OPERATIONS
  additionally owns the "Why it is not a ratio" history and the CI known-gap. Screenshot table
  duplicated too: `CLAUDE.md:177-182` vs `scripts/README.md:19-27` (which also carries the stale
  "all 14 `*.test.mjs` ... ~17s" row — see scripts-e2e-ci-07).
- CLAUDE.md measured: **264 lines, 18,579 bytes** — matches the finding's "264 lines / 18.6KB".
- Correction (a rider for whoever edits these sections): both copies say "**10 routes x 2
  viewports**" (`CLAUDE.md:190`, `docs/OPERATIONS.md:15`) but `e2e/visual.spec.ts:25-37` `ROUTES`
  has **11 entries** (landing, login, feed, directory, letters, catchups, collection, support,
  birds, about, privacy). Fix the number in whichever copy survives the dedupe.

## root-docs-assets-18 — ROADMAP superseded claims — CONFIRMED

- `docs/ROADMAP.md:3` — STACK_MIGRATION pointer (see 08).
- `docs/ROADMAP.md:23` — "**Keep DB-backed sessions, co-located** (not a JWT migration now; the
  admin-login bypass is fragile)." Doubly stale, no superseded note: AGENTS.md states sessions
  are JWT ("the code was always JWT") and admin-login is deleted.
- `docs/ROADMAP.md:13` and `:79` — cite model names `CatchupIssue`/`CatchupQuestion`/
  `CatchupAnswer`; `prisma/schema.prisma` at HEAD has `Catchup`, **`CatchupEdition`** (859),
  **`CatchupPrompt`** (885), **`CatchupEntry`** (909), `CatchupEntryLove`, `CatchupPref` — no
  Issue/Question/Answer models exist.
- The idiom to copy exists at `docs/ROADMAP.md:19`: the dark-mode bullet's inline
  "**(Superseded 2026-08-02: ...)**".

## scripts-e2e-ci-07 — tooling docs drifted — CONFIRMED

- `scripts/README.md:21` — "all 14 `*.test.mjs` in parallel, ~17s" — verbatim at HEAD.
- `.claude/skills/check/SKILL.md:8` — "~17s from cold"; `:53` — "the 14 standalone `*.test.mjs`
  scripts". Real count: `git ls-files | grep -c '\.test\.mjs$'` = **75**; floor is
  `MIN_TEST_FILES = 60` at `scripts/qa/check.mjs:69`. CLAUDE.md says "75 files ... in about 23
  seconds".
- `.claude/skills/screenshot-auth/SKILL.md` "Authenticated Routes" list names `/groups`,
  `/groups/[id]`, `/settings` as pages — `ls src/app/(main)` has neither; `/donate` is a pure
  `redirect("/support")` (`src/app/(main)/donate/page.tsx:6`, and `crawl.mjs:16-17` documents
  it); public list names "`/verify` — Magic link verify" — no `/verify` route exists (the
  `(auth)` group has `verify-email`, and auth is credentials).
- `.claude/skills/ui-audit/SKILL.md:14-22` Step-1 list repeats `/groups`, `/settings`, `/donate`.
- The finding's "For other lenses" note ("10 routes x 2 viewports" while ROUTES has 11) verified
  true — see the 15 entry above.

## lib-tests-06 — knip entry config — CONFIRMED

- No `knip.json` / `.knip*` at root; no `"knip"` key in `package.json`; knip not installed in
  `node_modules` (the find phase ran it via npx into `raw/knip.txt`).
- `raw/knip.txt:1` — "Unused files (124)"; `grep -c 'test.mjs'` on that file = **75**.
- Proposed config parses as valid JSON, and both top-level keys (`entry: string[]`,
  `ignore: string[]`) are documented knip options with glob values — syntactically valid knip
  config. Caveats already stated in the finding stand: merge with the dependency-diet lens's
  fuller config, and note knip is not a devDependency, so running it is an `npx` fetch each time.

## root-docs-assets-06 — progress.md archive scheme — CONFIRMED

Measured at HEAD, all exact matches to the finding: `wc` = **4,315 lines, 322,948 bytes**
(315KB; the finding's "317KB" headline is the usual 10^3/2^10 rounding — the byte count it
states is exact). Header census: `^## 2026` = **70**, `^## Session 2026` = **24**, `^## Round`
= **4**, `^## Fork` = **3**, total `^## ` = **101**, and zero headers outside those four
formats. The root-pin constraint verified: `docs/README.md:12` — "`progress.md` — running
session history, append-only."

## Verdict summary

| id | verdict |
|---|---|
| root-docs-assets-05 | confirmed-with-correction (3rd hazard: NEXT_PUBLIC_ADMIN_EMAIL vs audit C1-c) |
| root-docs-assets-06 | confirmed (all counts exact) |
| root-docs-assets-08 | confirmed (all six targets absent) |
| root-docs-assets-09 | confirmed (banner verbatim; 22b4b6c verified) |
| root-docs-assets-10 | confirmed (admin.md + person-row-audit.md unlisted; audits/ folders unlisted) |
| root-docs-assets-15 | confirmed-with-correction ("10 routes" is 11 in both copies) |
| root-docs-assets-18 | confirmed (schema has Edition/Prompt/Entry, not Issue/Question/Answer) |
| scripts-e2e-ci-07 | confirmed (75 files vs "14"; routes verified dead/redirect) |
| lib-tests-06 | confirmed (config valid; 75 of 124 unused-files are tests) |
