You are fixing the bugs found by the second pre-release audit of rv-connect. This is a FIX
session, not an audit. The report is docs/planning/audits/bug-report-2.md; the full
per-finding record (finder argument + validator reasoning + fix direction + gate, keyed by id
C-001…) is docs/planning/audits/verdicts-merged.json. The running disposition ledger is
docs/planning/audits/fix-ledger.md — it is current, read it first.

**This is the LAST session of the run.** Everything above Low is closed. What is left is the
long tail: 121 distinct Low findings, plus the four owner-only items. End by marking the whole
run complete in fix-ledger.md and progress.md.

What binds you. Read CLAUDE.md, AGENTS.md, and docs/TRAPS.md before touching code.

- No prisma db push. Schema change = edit schema.prisma, dated idempotent file in
  prisma/migrations-manual/, npx prisma generate, apply with
  node scripts/dev/run-sql.mjs <file> AND --env .env.demo <file>.
- **Commit in topic-sized batches, not one per finding.** With 121 small items this matters
  more than ever: group them by the file or the subsystem they touch — the comment-vs-code
  drift in one module, the cap mismatches, the timezone docstrings, the unbounded admin
  queries — and commit each group once `npm run check` passes on the whole of it. Eight to
  twelve commits for the whole session, each a subject somebody could review in a sitting.
  Name every finding id the commit closes in its message body, so the history and the ledger
  agree. Do not batch across unrelated subsystems: a commit nobody can bisect is the other
  failure mode. Stage by name, never git add -A. Plain conventional messages, no AI
  attribution. Work on main. Do NOT push — ask first. (Sixty commits are unpushed, the whole
  of 2026-08-23 to 2026-08-25: 997f8f0 through the last docs commit.)
- Verify, don't trust. npm run check after each fix, and confirm runtime-shaped changes live.
  The pattern that works: a throwaway probe at the repo root, run with
  `npx tsx probe-x.mts` (must be .mts — .ts gets the CJS transform and top-level await
  fails), loading .env with dotenv and importing ./src/lib/<module>.ts directly. tsx resolves
  the @/ alias; plain node does not. For browser proof, scripts/qa/_dev-login.mjs signs a
  puppeteer page in — the chrome-devtools MCP cannot be used for authed pages, because the
  dev-login secret must never enter page JavaScript. `fetchSessionCookie` from the same module
  works straight from Node when you only need to call an endpoint.
- UI changes: screenshot desktop + mobile. `npm run visual` is red on exactly 8 of 23 checks
  (feed, directory, letters, catchups × both viewports) from LIVE DATA DRIFT, not code —
  verified again at the end of the 2026-08-25 session, unchanged by twelve commits. Any NEW
  red is yours.

How to work (economy matters).

- Do the work yourself. Agents only for genuinely parallel independent jobs.
- Re-confirm each finding is still real before fixing; concurrent sessions share this tree,
  and after three fix sessions a good number of the Lows will have been swept up already by
  the Medium fixes above them. **Check the ledger and the file before assuming a Low is
  live** — several of the closed Mediums rewrote whole modules the Lows point into.
- A Low that is a comment-vs-code drift is fixed by correcting the COMMENT as often as the
  code. Read the verdict's reasoning: the validator usually says which half is wrong.
- Every fix ships its gate — but at this severity a gate is not always warranted. A corrected
  sentence in a comment does not need a test; a changed cap, a changed window or a changed
  query does. When you do write one, pin the property, not a literal, and prove it catches the
  regression by temporarily reverting the fix and watching the test fail. Every gate in this
  run was checked that way; several were vacuous until that check exposed them.

Where things stand. **Phases 1–6 (Mediums) are COMPLETE.** 74 ids closed (72 fixed, 2 refuted).

The 2026-08-25 session closed, in twelve commits: the five test-quality gaps (C-187, C-193,
C-194, C-191, C-192) and every actionable Medium — C-075, C-134, C-091, C-004, C-040, C-043,
C-006, C-052, C-054, C-198, C-163, C-164, C-044, C-086, C-108, C-161, C-149 — plus the four
Mediums that turned out to be duplicates of those (C-123, C-110, C-185, C-039).

**Start here.** Read fix-ledger.md, then work the Lows in FILE order rather than id order:
group every finding that touches one module and fix them together. The ledger's rows for the
Mediums say what was rewritten, which will save you re-reading modules that no longer match
their findings.

**One item is already scoped and waiting, from C-192:** `GroupMember` has no index on
`userId`, and `loadSavedPosts` reads memberships by userId on every request — the same shape
as B-090. It is exempted in `src/lib/index-coverage.test.mjs`'s NO_INDEX_NEEDED with that said
plainly. Fixing it means `@@index([userId])` on GroupMember, a dated file in
prisma/migrations-manual/, applied to `.env` AND `--env .env.demo`, and removing the exemption
so the derived sweep covers it.

Owner-only, not yours: C-135 (Google Pay/UPI test payment — the last open Medium),
C-165/C-166 (PostHog/Sentry free-tier ceilings), C-186 (demo project's cron env). Also owed to
the owner: a decision on the visual suite's data drift, and CRON_SECRET.

Surprises worth carrying forward

- `python3 -c "open(p,'w').write(open(p).read() + x)"` truncates the file before it reads it.
  It emptied fix-ledger.md in an earlier session. Read first, then open for write.
- **A shape test that greps for a function NAME passes against a file that only IMPORTS it.**
  This has now bitten five times in this run (C-193, C-043, C-054, and twice before). Always
  match the CALL — `name\s*\(` — and always prove the gate by reverting the fix.
- A per-FILE shape sweep passes when a file has two of the thing and you fixed one. Count the
  sites, don't detect them (see notification-reach.test.mjs).
- A cursor at a row excluded by the where does not return an empty page — it returns rows and
  SKIPS one, because skip:1 then eats a real row.
- A callback beside `setPosts` runs BEFORE React commits the DOM, so anything that looks up
  the element it just rendered finds nothing — silently. And `router.push('/feed#id')` from
  the feed itself is a same-document navigation: nothing remounts and no effect re-runs. Both
  cost a round in C-052.
- `sharp`'s `.rotate().metadata()` returns the STORED dimensions, not the upright ones. The
  upright pair is in `autoOrient`.
- A test-loaded module cannot have extensionless relative value imports, AND it cannot use the
  `@/` alias at all: the unit gate runs `node <file>.test.mjs` with no resolver. If the module
  you want to test imports through `@/`, either move the pure rule into a dependency-free lib
  module (that is what `cityFilterTargets` and `instagramHandle` are) or shape-test the source.
- Give a server action 4 seconds, not 2.5, before reading the row back in a probe.
- The classifier blocks UPDATE statements typed into bash and blocks grepping .env. Both were
  right to block; work around them (a .mts probe using Prisma, or `node -e` reading one var).
- Loading .env.demo in a probe brings the demo write guard with it, which refuses inserts no
  named action claims. Load .env alone when probing production shapes.
- Throwaway rows for a live proof are fine and were used throughout: create, prove, delete in
  a `finally`. A throwaway USER cascades its Visit and Post rows away with it.

Keep fix-ledger.md current. Log the session in progress.md as you go, in the same commit as
the work it describes. When the last Low is closed, say so at the top of the ledger and write
the run's closing entry in progress.md.
