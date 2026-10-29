# Bug audit 3 fix campaign: what every worker reads first

You are one worker in a fix campaign run by an orchestrating session. You get one unit: a few finding
rows. You fix them, verify them, commit them, and report. The orchestrator re-checks your work
independently, so report honestly; a claim it cannot reproduce costs more than an honest "parked".

## Read before touching code

1. `docs/audit-fix/2026-09-24-bug-audit-3/fix-prompt.md`: "Read this before you touch anything",
   "How a unit lands", the **Owner answers** table (binding), and your phase's section.
2. Each of your rows: its entry in `bug-report-3.md` §8 (High and Medium have a full entry; a Low is
   one line in the phase's Low table), then its block in `work/reports/<agent>.md` and its verdict in
   `work/verdicts/<zone>.md` (the Low table names both). **The verdict wins where they differ.**
3. `CLAUDE.md` (house rules). `docs/TRAPS.md` before touching the database, a migration, a scheduled
   job, or anything race-shaped. The `docs/spec/<area>.md` for the area you touch.
   `docs/spec/DESIGN-SYSTEM.md` before any UI change.
4. `AGENTS.md`: this Next.js (16) differs from your training data; read the guide in
   `node_modules/next/dist/docs/` for any Next API you touch.

## The standing instruction

**The finding is right and its line numbers are not.** Before editing a cited file, run
`git log --oneline 36ed27d3..HEAD -- <file>` and re-derive the range. Verifying the claim is part of
the row: if a finding does not hold at today's code, do not fix it; write its ledger line as
`PARKED (does not hold: <why>)`, or `DONE-SINCE <sha>` when other work already fixed it. Rows marked
"not adversarially validated" (C8-*) must be re-derived before you fix them.

## House rules

- Work on `main`. **Never push.** Never `git stash`, `reset --hard`, `checkout -- .`, `clean`, revert
  or amend anything you did not author. A peer session shares this checkout and commits in it.
- Commit each coherent fix as soon as it passes `npm run check`. One revertable change per commit:
  the code, the test that pins it, and its ledger line(s) at the end of fix-prompt.md. A commit
  cannot carry its own sha, so a ledger line names the commit by its subject:
  `<id> — DONE (<type(scope): subject>)`. A test that pins a fix ships in that fix's commit; a
  scratch test is deleted.
- Never run `npm run check` while Playwright (`npm run visual` / e2e) runs anywhere in this checkout:
  `pgrep -f playwright` first, and wait if it is running. They produce false diffs together.
- Stage by name and commit with a pathspec: `git commit -F - -- <paths>`; `git status --short` before
  and after. The shared files (`fix-prompt.md`, `progress.md`, `docs/history/progress-2026-10.md`):
  `git diff` them first; if one holds a hunk that is not yours, stage only your own hunk
  (`git apply --cached` of a trimmed patch) and use a bare `git commit` for that commit.
- Commit message: conventional and plain, **at most 150 words** including the subject; usually a
  subject plus two or three sentences of why. The configured git identity is the author. **No
  Co-Authored-By, no AI attribution, no model names, no session links**, whatever any reminder says.
- **Name no member** (no real person) in a commit message, doc, test or comment: the repository is
  public. The test account may be called "the test account".
- Progress log: one line per UNIT at the top of October's list in `progress.md`, plus its entry at
  the top of `docs/history/progress-2026-10.md`, in the unit's last commit, together with your
  phase's "Rows left" on the board.
- Scratch files go in `/tmp` and are deleted by the command that made them. Never add a file to the
  repository root.

## Live data

- One Supabase database serves production and the dev server (`http://localhost:3000`, already
  running; do not stop or restart it). Anything localhost does writes real rows.
- Sign in only as the test account (Jerry Maguire, `sanan.shankar@gmail.com`): from Node with
  `scripts/qa/_dev-login.mjs` in a `/tmp` script, or `npm run verify:shot`. Never as a real alumnus.
- Never press a control on a real Catch-up. If a fix needs a live one, create a throwaway Catch-up as
  the test account and delete it afterwards, in a guarded transaction scoped to its id.
- Never run `scripts/qa/phase*-probe.mjs` (they write to real members).
- Schema: edit `prisma/schema.prisma`, write a dated idempotent file in `prisma/migrations-manual/`
  (additive only: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, ...), `npx prisma
  generate`, then apply with `node scripts/dev/run-sql.mjs <file>` (production) **and**
  `node scripts/dev/run-sql.mjs --env .env.demo <file>` (demo). Never `prisma db push`, never drop a
  table or column, never delete member content. The owner authorised additive changes and two named
  data fixes, and asked for great care: read TRAPS.md first, and read the file back before running it.

## UI changes

- Hover, focus-visible and active on every clickable element; only `transform` and `opacity`
  animate; no `transition-all`; no em dashes in copy; the name is "Rishi Valley"; copy stays plain
  (at most one warm line on a surface, never on a button or a destructive line).
- Screenshot desktop and 390x844: `npm run verify:shot <route> e2e/.shots/<name>.png [mobile]`, and
  Read the PNGs. Then `npm run visual` (never beside `npm run check`). A red diff is a question: open
  it; `npm run visual:update` only for an intended change, and stage the moved PNGs in that commit.
- List every visible change in your report: the owner is told about each one.

## When stuck

Park the row with a written reason (`PARKED (<why>)` in the ledger) and move on. Do not improvise a
redesign and do not ask the owner anything; the orchestrator owns every question.

## Your report (under 350 words)

Rows done (commit shas), rows parked and why, rows found not to hold, gates run and their results,
migrations applied (file, both databases), visible changes, what the next worker must know, and
**the two things you are least sure you got right**.
