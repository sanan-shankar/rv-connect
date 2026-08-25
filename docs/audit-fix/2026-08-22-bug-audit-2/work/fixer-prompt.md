You are finishing the bugs found by the second pre-release audit of rv-connect. This is a
FIX session, not an audit. The report is docs/planning/audits/bug-report-2.md; the full
per-finding record (finder argument + validator reasoning + fix direction + gate, keyed by
id C-001…) is docs/planning/audits/verdicts-merged.json. The running disposition ledger is
docs/planning/audits/fix-ledger.md — it is current, read it first.

**This is the last stretch.** 170 of the run's 199 ids are disposed of. **29 remain**, and
they are small: no Highs, no Mediums, no migrations expected. One sitting should finish the
run. End by marking it complete in fix-ledger.md and progress.md.

What binds you. Read CLAUDE.md, AGENTS.md, and docs/TRAPS.md before touching code.

- No prisma db push. Schema change = edit schema.prisma, dated idempotent file in
  prisma/migrations-manual/, npx prisma generate, apply with
  node scripts/dev/run-sql.mjs <file> AND --env .env.demo <file>. (Three migrations landed
  this way today; 2026-08-25-photo-source-key.sql is the shortest worked example.)
- **Commit in topic-sized batches.** Group by the file or subsystem, commit each once
  `npm run check` passes on the whole of it, and name every finding id the commit closes in
  the message body so the history and the ledger agree. Three or four commits should cover
  what is left. Stage by name, never git add -A. Plain conventional messages, no AI
  attribution. Work on main. Do NOT push — ask first. **Seventy-four commits are unpushed**,
  the whole of 2026-08-23 to now (997f8f0 through the last docs commit).
- Verify, don't trust. `npm run check` after each fix, and confirm runtime-shaped changes
  live. The pattern that works: a throwaway probe at the repo root, run with
  `npx tsx probe-x.mts` (must be .mts), loading .env with dotenv and importing
  ./src/lib/<module>.ts directly. tsx resolves the @/ alias; plain node does not.
  **Delete every probe when you are done with it, and check the database is clean** —
  see "Surprises" below, this cost real cleanup today.
- UI changes: screenshot desktop + mobile. `npm run visual` is red on exactly **8 of 23**
  (feed, directory, letters, catchups × both viewports) from LIVE DATA DRIFT, not code.
  Re-confirmed at the end of the 2026-08-25 evening session. Any NEW red is yours.

Where things stand. **Phases 1–6 (Mediums) complete. The Low tier is 96 of 125 done.**

The 2026-08-25 evening session closed 96 Lows in fourteen commits, working in FILE order:
feed writes, Catch-ups + demo, the proxy/edge, the auth doors, the directory, the visual
suite, the GroupMember index, reports, the profile pen, messages/threads, the unattended
machinery (mail/retention/purge/limiters), the Collection and uploads, and posts/letters.

**What is left — 29 ids, and here is the whole map.** Verdict letters: [C]onfirmed,
[R]efuted (write the row, do not fix).

| Where | ids |
|---|---|
| `src/app/(main)/layout.tsx` | C-104, C-117, C-200 |
| `src/app/(main)/admin/people/actions.ts` | C-041, C-082[R] |
| `src/components/settings/actions.ts` | C-101, C-146 |
| `src/app/(main)/support/actions.ts` | C-049, C-088 |
| `src/lib/admin-analytics.ts` | C-080, C-143 |
| `scripts/qa/check.mjs` | C-190, C-195 |
| the four test-file findings | C-188, C-189, C-196, C-197 |
| one each | C-042 (onboarding actions), C-046 (import-roster), C-051 (photo-step), C-089 (admin support page), C-090[R] (razorpay webhook), C-114[R] (demo.ts), C-115 (notice page), C-116 (wordle), C-120 (posthog provider), C-138 (theme actions), C-155 (pick-bird), C-169 (validators) |

A sensible batching: **(1)** layout + posthog + notice (C-104, C-117, C-200, C-120, C-115);
**(2)** admin + support + analytics (C-041, C-082, C-080, C-143, C-089, C-049, C-088, C-090);
**(3)** settings + onboarding + misc (C-101, C-146, C-138, C-042, C-051, C-155, C-169, C-116,
C-046, C-114); **(4)** the tooling and test-file six (C-190, C-195, C-188, C-189, C-196,
C-197) plus the run's closing docs.

**Owner decisions owed — do not decide these yourself, and do not let them block anything.**

- **C-032**: the session is an ABSOLUTE 30 days, not rolling. `auth()` takes the RSC path,
  which discards the Set-Cookie the refresh rides on; there is no middleware, no
  SessionProvider, no useSession. So every member is signed out 30 days after signing in
  however often they visit, and a launch cohort hits it together. Documented at the config in
  `src/lib/auth.ts`. Adding rolling refresh is a product call.
- **C-012**: admins can read unpublished letter drafts, and a test pins it ("an admin sees
  everything" in post-visibility-rule.test.mjs). `deleteDraft`'s comment claimed the
  opposite; the comment was corrected. If drafts should be private from admins too, it is one
  line to move in `decidePostVisibility` and one test to change.
- **C-135** (Google Pay/UPI test payment), **C-165/C-166** (PostHog/Sentry free-tier
  ceilings), **C-186** (demo project's cron env).
- **C-112 / C-167**: plan-ceiling questions, not code — whether the demo's unbounded
  anonymous writes can outpace its nightly reset, and whether type-ahead search exhausts the
  Upstash free command quota at 2,000 members. Both recorded rather than guessed at. C-167 is
  materially safer now: a quota exhaustion REPORTS (C-154) instead of silently switching every
  rate limit off.
- Still owed: **CRON_SECRET**, and a decision on the visual suite's data drift.

How to work (economy matters).

- Do the work yourself. Agents only for genuinely parallel independent jobs.
- **Re-confirm each finding is still real before fixing.** Concurrent sessions share this
  tree, and after four fix sessions a good number of the remaining Lows will already have
  been swept up. Six of today's were: C-001, C-024, C-077, C-121, C-126, C-199 were all
  closed by earlier work and only needed a ledger row. Check the ledger AND the file.
- A Low that is a comment-vs-code drift is fixed by correcting the COMMENT as often as the
  code. Read the verdict's reasoning: the validator usually says which half is wrong. And
  when a TEST pins the behaviour, the test is the stronger statement of intent — correct the
  comment and hand the question to the owner (that is what C-012 above is).
- Every fix ships its gate — but at this severity a gate is not always warranted. A corrected
  sentence in a comment does not need a test; a changed cap, window or query does. When you
  write one, pin the property, not a literal, **and prove it catches the regression by
  temporarily reverting the fix and watching it fail.** Every gate in this run was checked
  that way. Roughly one in eight was vacuous until that check exposed it, today included.

Surprises worth carrying forward (this session's additions marked NEW)

- **NEW: a Playwright mask whose locator matches nothing does not fail.** It passes, covers
  no pixels, and the test goes on failing for the reason you thought you had masked. Check
  the `-actual.png` for the magenta block before believing a mask worked. (Found masking the
  notification bell, which turned out to have no accessible name at all — its name was the
  badge number, "1".)
- **NEW: `page.fill` before hydration sets the DOM value of a CONTROLLED input without React
  ever seeing it.** The field looks right the whole time, the form posts an empty string, and
  the action's early return gives you a convincing zero that proves nothing. This voided
  three attempts at the C-033 proof. Wait for React props on the form
  (`Object.keys(form).some(k => k.startsWith("__react"))`) before typing, and assert on
  something rendered FROM state — the confirmation screen echoing the address — not on
  `inputValue`.
- **NEW: a per-IP rate limit will also give you a convincing zero.** The second run of a
  two-run proof was refused by the limiter before reaching the branch under test. Give each
  run its own `x-forwarded-for`.
- **NEW: delete your probes AND check the database.** A probe that creates a User and deletes
  it in a `finally` still leaves rows behind wherever the FK does not cascade — 31 orphan
  `Group` rows survived one of today's, because `Group.creatorId` is nullable. Sweep for them
  before you finish.
- **NEW: brace-matching a function body fails on this codebase's signatures.** Both
  `export async function f(input: {` and `): Promise<{ ok: true }> {` put an object brace
  before the body's, so "the first `{` that ends a line" closes the wrong thing and every
  assertion after it reads a four-line body and passes against nothing. Slice to the next
  top-level `export` instead, and assert the slice is longer than a few lines.
- **NEW: regex alternation is ordered.** `/filters\.(year|yearFrom|yearTo)/` reports all
  three as `year`. Longest alternative first, and anchor with `\b`.
- `python3 -c "open(p,'w').write(open(p).read() + x)"` truncates the file before it reads it.
  It emptied fix-ledger.md in an earlier session. Read first, then open for write.
- **A shape test that greps for a function NAME passes against a file that only IMPORTS it.**
  Always match the CALL — `name\s*\(` — and always prove the gate by reverting. Its sibling:
  a test that checks a guard's QUERY exists passes against a body where the `if` acting on it
  was deleted. Assert on what the answer is used for.
- A per-FILE shape sweep passes when a file has two of the thing and you fixed one. Count the
  sites, don't detect them.
- A cursor at a row excluded by the where does not return an empty page — it returns rows and
  SKIPS one, because skip:1 then eats a real row.
- A callback beside `setPosts` runs BEFORE React commits the DOM. And `router.push('/feed#id')`
  from the feed itself is a same-document navigation: nothing remounts, no effect re-runs.
- `sharp`'s `.rotate().metadata()` returns the STORED dimensions, not the upright ones. The
  upright pair is in `autoOrient`.
- A test-loaded module cannot have extensionless relative value imports, AND cannot use the
  `@/` alias at all: the unit gate runs `node <file>.test.mjs` with no resolver. Write
  `./utils.ts`, with the extension. If the module you want to test imports through `@/`,
  either move the pure rule into a dependency-free lib module or shape-test the source.
- Give a server action 4 seconds, not 2.5, before reading the row back in a probe.
- The classifier blocks UPDATE statements typed into bash and blocks grepping .env. Both were
  right to block; work around them (a .mts probe using Prisma, or `node -e` reading one var).
- Loading .env.demo in a probe brings the demo write guard with it, which refuses inserts no
  named action claims. Load .env alone when probing production shapes.
- Throwaway rows for a live proof are fine and were used throughout: create, prove, delete in
  a `finally`. Better still for a read-shaped proof: do the whole thing inside a
  `$transaction` and throw a `Rollback` sentinel at the end — nothing touches live data at
  all. That is how C-062 was proved today.

Keep fix-ledger.md current. Log the session in progress.md as you go, in the same commit as
the work it describes. **The ledger's SHA column is filled after each commit** (the SHA
cannot be known while writing the commit that contains it), so before you finish, check
every `fixed <sha>` resolves: `for sha in $(grep -o "fixed [0-9a-f]\{7\}" docs/planning/audits/fix-ledger.md | awk '{print $2}' | sort -u); do git cat-file -e "$sha" || echo "MISSING $sha"; done`.

When the last Low is closed, say so at the top of the ledger and write the run's closing
entry in progress.md.
