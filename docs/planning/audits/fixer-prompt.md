You are fixing the bugs found by the second pre-release audit of rv-connect. This is a FIX
session, not an audit. The report is docs/planning/audits/bug-report-2.md; the full
per-finding record (finder argument + validator reasoning + fix direction + gate, keyed by id
C-001…) is docs/planning/audits/verdicts-merged.json. The running disposition ledger is
docs/planning/audits/fix-ledger.md — it is current, read it first.

What binds you. Read CLAUDE.md, AGENTS.md, and docs/TRAPS.md before touching code.

- No prisma db push. Schema change = edit schema.prisma, dated idempotent file in
  prisma/migrations-manual/, npx prisma generate, apply with
  node scripts/dev/run-sql.mjs <file> AND --env .env.demo <file>.
- **Commit in topic-sized batches, not one per finding.** The last session made 24 commits
  for 27 findings and that is too many to read. Fix everything in one area — the five test
  gaps, the notification links, the Visit table — and commit that area as ONE change once
  npm run check passes on the whole of it. Five to eight commits in a session, each a
  subject somebody could review in a sitting. Name every finding id the commit closes in
  its message body, so the history and the ledger agree. Do not batch across unrelated
  subsystems: a commit nobody can bisect is the other failure mode. Stage by name, never
  git add -A. Plain conventional messages, no AI attribution. Work on main. Do NOT push —
  ask first. (Thirty-three commits from 2026-08-24 are already unpushed: 45f71e6
  through 9f07754.)
- Verify, don't trust. npm run check after each fix, and confirm runtime-shaped changes live.
  The pattern that works: a throwaway probe at the repo root, run with
  `npx tsx probe-x.mts` (must be .mts — .ts gets the CJS transform and top-level await
  fails), loading .env with dotenv and importing ./src/lib/<module>.ts directly. tsx
  resolves the @/ alias; plain node does not. For browser proof, scripts/qa/_dev-login.mjs
  signs a puppeteer page in — the chrome-devtools MCP cannot be used for authed pages,
  because the dev-login secret must never enter page JavaScript.
- UI changes: screenshot desktop + mobile. npm run visual is currently red on 8 of 20 routes
  from LIVE DATA DRIFT, not code — the diffs are whole-page shifts from new content, and the
  directory, which nothing recent touched, is among them. Verify any new red is yours.

How to work (economy matters).
- Do the work yourself. Agents only for genuinely parallel independent jobs.
- Re-confirm each finding is still real before fixing; concurrent sessions share this tree.
- For SUSPECTED/NEEDS-LIVE findings, run the named runtime check FIRST — three have been
  refuted that way already and cost nothing.
- Every fix ships its gate, and the gate goes in the same commit as the fix that needs it.
  Pin the property, not a literal — and prove the gate catches the regression by
  temporarily reverting the fix and watching the test fail. Every gate so far was checked
  that way; several were vacuous until that check exposed them. Batching the commits does
  not batch this: prove each gate as you write it, while the fix is fresh, not in a sweep
  at the end of the group.

Where things stand. **Phases 1, 2, 3, 4 and 5 are COMPLETE.** 48 ids closed (46 fixed,
2 refuted). Only Phase 6 remains, plus the owner-only items.

Closed: C-002, C-005, C-010, C-019, C-020, C-021, C-023, C-025, C-026, C-027, C-028, C-029,
C-030, C-031, C-050, C-056, C-063, C-064, C-065, C-066, C-067, C-069, C-070, C-071, C-072,
C-073, C-084, C-085, C-087, C-102, C-122, C-124, C-125, C-131, C-133, C-141, C-144, C-151,
C-152, C-162, C-171, C-175, C-176, C-177, C-178, C-179. Refuted: C-096, C-055.

**134 items remain: 21 Medium and 113 Low.** The owner has asked for this to take TWO more
sessions, split by effort rather than by count:

**THIS SESSION (the heavy half).** The five test-quality gaps first — they weaken every
other gate in the repo — then the 20 remaining actionable Mediums. Roughly 25 items in
something like six commits: the test gaps as one, then the Mediums grouped by the thing
they touch (auth and purge; notifications and their dead links; the Visit table; the
directory and profile; the payments and mail edges).

  1. **Start here: C-187** (`src/lib/auth.ts:314`) — the credentialVersion session-revocation
     comparison has no test anywhere. It is the mechanism that ends a blocked, deleted or
     password-reset member's session, it lives inline in the NextAuth callback, and a flipped
     `!==`, a dropped `isBlocked` clause or a `select` that stops reading the column would
     leave every such session live for the 30-day JWT window and still pass npm run check.
  2. Then C-193 (the C2 ownership sweep misses messages/actions.ts), C-194 (nothing pins that
     interaction actions CALL the visibility guard), C-191 and C-192 (two test headers that
     claim a generality their fixed lists do not have — either make them general or correct
     the header; a gate that lies about its own reach is worse than none).
  3. Then the remaining Mediums, listed below. Reachability order, not id order: C-075
     (grace-period purge races sign-in cancellation — an account erased after the member
     cancelled) and C-134 (unauthenticated /_next/image with a wildcard remotePattern) first.

**THE SESSION AFTER (the long tail).** The 113 Lows — comment-vs-code drift, cap mismatches,
timezone docstrings, unbounded admin queries. Individually cheap, but 113 of anything is real
time. That session closes the audit out and should end by marking the whole run complete in
fix-ledger.md and progress.md.

End THIS session by printing an updated copy of this prompt for the final one: where you
reached, which ids are closed, any surprise, and the exact next finding to start on.

### The 21 remaining Mediums

- **C-187** `src/lib/auth.ts:314` — credentialVersion session-revocation comparison has no test anywhere
- **C-193** `src/lib/security-regressions.test.mjs:86` — C2 ownership-gate sweep pins 2 of the 3 write paths that accept image URLs; messages/actions.ts is unswept
- **C-194** `src/lib/post-visibility.ts:90` — no test pins that interaction actions actually CALL the visibility guard (the H3 wiring)
- **C-075** — grace-period purge races sign-in cancellation: account erased after the member cancelled
- **C-134** — unauthenticated /_next/image plus the *.r2.dev wildcard remotePattern is an open image-optimization proxy
- **C-004** — profile page ignores targetBatches: tab counts disagree with the tab lists
- **C-006** — @-mentions cannot find teachers: the shared people-search endpoint excludes them
- **C-040** — pasting a full Instagram URL stores it verbatim and renders a double-prefixed dead link
- **C-043** — signup accepts batchYear earlier than yearLeft, the impossible pair the profile editor refuses
- **C-044** — demo: contact editing, admission number and photo removal fail with a misleading "check your connection"
- **C-052** — feed post notifications deep-link to /feed#<postId> but nothing implements the scroll
- **C-054** — deleting or hiding a letter leaves bell rows whose links 404
- **C-086** — dispute-won and dispute-closed events are ignored, so a chargeback the owner WINS stays uncounted
- **C-091** — city facet filter and map "See all" return zero results for any stored city whose string differs
- **C-108** — DRAIN_LEASE_MS (45s) is shorter than a worst-case mail pass (~80s), so the lease can expire mid-pass
- **C-149** — advanceEdition swallows engine failures with console.error only, bypassing the M09 Sentry report
- **C-161** — launch-day verify-mail backlog: the last confirmation sends ~3 days after signup at 300 signups
- **C-163** `src/lib/last-seen.ts:119` — Visit rows minted from a client-controlled cookie with no throttle
- **C-164** `prisma/schema.prisma:1060` — Visit alone approaches the 500MB free-tier cap at 2,000 users
- **C-198** (NEEDS-LIVE) — /ingest PostHog reverse proxy forwards members' live session cookies to a third party
- **C-135** (NEEDS-LIVE) — **owner-only**, do not attempt: verify Google Pay/UPI past `payment=()` with a real test payment

### Surprises worth carrying forward

- **`python3 -c "open(p,'w').write(open(p).read() + x)"` truncates the file before it reads
  it.** It emptied fix-ledger.md mid-session. Read first, then open for write.
- **A cursor at a row excluded by the `where` does not return an empty page** — it returns
  rows and SKIPS one, because skip:1 then eats a real row. Check consequences against the
  database, not just the source.
- **A shape test that slices at `indexOf("someFn(")` finds the IMPORT, not the call**, and
  passes vacuously. Anchor on `function name(` and brace-match. Two more traps in the same
  family, both hit this session: a function's body brace is NOT the first `{` after the
  parameter list when there is a return-type annotation (`): Promise<{ ok: true }> {`), and
  prose in a comment counts as code unless you strip comments before counting exits.
- **sharp's `.rotate().metadata()` returns the STORED dimensions**, not the upright ones —
  `metadata()` reads the header and does not run the pipeline. The upright pair is in
  `autoOrient`. A test now pins this so a sharp upgrade cannot silently halve people's photos.
- **A test-loaded module cannot have extensionless relative value imports** — node cannot
  resolve `./utils`, and tsc refuses `./utils.ts` without allowImportingTsExtensions, which
  this repo has on. Use the explicit `.ts` specifier (see contact-rows.ts's comment).
- **Give a server action 4 seconds, not 2.5, before reading the row back in a probe.** A 2.5s
  read produced a completely false picture of the heart/like behaviour and nearly sent a
  session chasing a bug that did not exist.
- **No Catch-up edition is in `answering`** and none has zero accepted prompts, so those paths
  cannot be exercised live without writing to the owner's real Catch-ups. Two Phase 4 fixes
  are gated by shape and reasoning only, and the ledger says so at C-021 and C-125.
- **The classifier blocks UPDATE statements against the live database and blocks grepping
  .env.** Both were right to block; work around them rather than through them.
- **Loading .env.demo in a probe brings the demo write guard with it**, which refuses inserts
  no named action claims. Load .env alone when probing production shapes.

Owner-only, not yours: C-135 (Google Pay/UPI test payment), C-165/C-166 (PostHog/Sentry
free-tier ceilings), C-186 (demo project's cron env). Also owed to the owner: a decision on
the visual suite's data drift.

Keep fix-ledger.md current. Log the session in progress.md when you stop.
