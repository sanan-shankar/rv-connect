# Bug audit 3 — fix campaign prompt

**@ this file and invoke `/campaign`.** That is the whole handover. The skill front-loads every question
the owner must answer, then works the phases one after another, one worker per chunk, verifying each
worker's output itself before the next starts. It reads the campaign board below to know where to pick
up, and writes to it before it ends.

Audit: `docs/audit-fix/2026-09-24-bug-audit-3/`. `bug-report-3.md` is the deliverable: §2 is the phased
plan, §3 the owner section (questions already in the five-line form, and the checks only he can do), §8
the findings (a full entry for every High and Medium, a table for every Low, and the findings closed
during the audit). The evidence behind each row is its block in `work/reports/<agent>.md` and its
verdict in `work/verdicts/<zone>.md`; **the verdict wins where they differ.** `work/ledger-final.json`
is the machine-readable ledger: every finding's final severity, verdict and `phase`.

---

## Read this before you touch anything

**Trust the finding, re-derive the lines.** Every open row survived a validator whose job was to
refute it, and the High and Medium entries carry line numbers checked at `36ed27d3`. The Lows' lines
are the verdicts' (mostly `88642426`). Audit 2's verifiers found half of all findings carried a wrong
detail; this audit's corrected most of those, but the tree keeps moving. **Before you edit a cited file,
`git log --oneline 36ed27d3..HEAD -- <file>`**, and re-derive the range if anything landed.

**Nine rows were never attacked by a validator**: C8-01 to C8-09, the last completeness round's, which
closed the audit on the owner's word. They carry "not adversarially validated" in the report. A worker
re-derives one before fixing it and drops it, with a ledger line, if it does not hold.

**A peer session commits in this tree** (birds, the trivia gate, the trivia admin page). Stage by name,
commit with a pathspec (`git commit -- <paths>`), never stash, reset or touch work you did not make
(CLAUDE.md). If a file you need holds someone else's uncommitted edits, work around them or stop.

**Live data.** One database serves production and the dev server. **Never test a Catch-up control on a
real Catch-up**: Batch of 2024's Edition 2 was answering until 2026-10-25 07:00 IST; check what is live
before you press anything. Sign in as Jerry Maguire only (memory: never a real alumnus). **Never run the
`scripts/qa/phase*-probe.mjs` scripts**: they comment on a real member's newest post and ring their bell
(C1-02). Schema changes go through a dated file in `prisma/migrations-manual/`, never `prisma db push`.

**The repository is public, by the owner's choice** (ruled 2026-10-23; do not re-raise it). Name no
member in a commit message, a doc or a test you write.

**Machine load.** At most five background agents at a time (the owner's number, 2026-10-24; thirteen took
his VS Code to 5 GB).

**Deploys are git-only, and a push is a deploy.** Commit each fix as it passes `npm run check`; ask
before pushing. Every visible change is announced to the owner (memory: announce frontend changes) and
screenshotted at desktop and 390x844.

**Owner-gated rows.** Only the rows a question names wait for its answer; the rest of the phase runs.
Every question carries the answer to take if he does not reply, so a silent owner never blocks the
campaign for more than the batch he is asked in.
