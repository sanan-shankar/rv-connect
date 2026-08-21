# The Pre-Release Fix Session, part three

You are continuing a job that is two thirds done. Session 1 fixed both Criticals and every
launch-blocking High. Session 2 (2026-08-21) closed **fifteen of the sixteen** remaining canonical
findings, shipped one of the two feature builds, and cleared about twenty of the Low tail. Your job
is the rest: **the one remaining feature build (B-063, already designed and approved — build it),**
the 61 remaining Medium roots, the ~97 remaining Low items, and the final sweep to "done".

**Read these two files before anything else, in this order:**

1. `docs/planning/audits/fix-log.md` — the disposition ledger. Every finding all three sessions have
   touched, the commit it shipped in, and *how it was proved*. Its "Still open" section is your
   worklist; its **"B-063 — the owner's decisions"** subsection is your spec for the feature; its
   "Things a later session should know" section will save you hours of rediscovery.
2. `docs/planning/audits/bug-report.md` — the audit itself, still the spec. §0 = owner decisions,
   §2 = the phased plan, §3 = every finding with evidence, `file:line`, a fix direction and a "pin it
   fixed" test, §3.M = the 68 Medium roots, §3.L = the 117-item Low appendix, §4 = the 2,000-user
   dossier, §5 = the verified-clean map (do not re-litigate what is in it), §6 = coverage. Raw
   per-finding evidence is in `docs/planning/audits/wave1/*.json`, keyed by the `W1-xxx` ids.

Then `CLAUDE.md` and `AGENTS.md` (hard rules; "this is NOT the Next.js you know"),
`docs/spec/DESIGN-SYSTEM.md` before any UI work, and the relevant `docs/spec/*.md` — **`catchups.md`
in particular, because the whole feature build lives there.**

---

## 1. The owner's intent, in his own words (this is still the spec)

> "I have a codebase that is quite functional. It's fine broadly. Security is decently good — a full
> ten-phase security overhaul finished, 74 findings tracked, 0 open. I'm getting ready to release it
> to the public. I just ran one very formal bug and stability audit, and now I want everything in
> that report addressed: fix the bugs, close the edge cases, make sure everything is totally stable,
> scalable up to even 2,000 users as headroom. I have no time frame. I don't care how long it takes.
> I just want it done well.
>
> Deploy agents and use whatever tools help, at whatever level of granularity you want — that's your
> call, not mine. You're the one doing it, so you decide whether it's one fix per commit or a batch,
> one agent or many, one long session or several. Usage is not much of a concern and time is not at
> all a concern, but don't waste it either.
>
> I want a level of ownership from you. When you fix a bug, don't just mechanically apply the 'fix
> direction' in the report — that's a floor, not a ceiling. If you see a better fix, take it. If you
> think a finding is wrong, verify it against the live code and say so rather than 'fixing' correct
> code. Own the work.
>
> On prompting and freedom: verbose is good — when you convey everything, all your ideas and your
> fears, it captures the intent better. Don't box yourself or your agents in. If a solution is
> obvious, be direct; where the solution space is wide, use creativity. Decisions belong to whoever
> is doing the work."

The owner is **non-technical**. Lead every progress report with the outcome in plain language (what
now works that didn't), never the mechanism. He asks for a percentage from time to time; give an
honest one, weighted by effort rather than by item count.

Sessions 1 and 2 both took him at his word and it paid. Between them, **five** of the report's fix
directions were improved on and **two** were found to be wrong (`statement_timeout`, and B-046's
suggested group-post link — see the ledger). Do the same. You are the last line: trust your reading
of the live code over the report when they genuinely conflict, and write down why in the ledger.

## 2. What is already done — do not redo any of it

**Canonical (44 of 45):** the pool config, B-001, B-002, B-010, B-011, B-012, B-013, B-020, B-021,
B-022, B-023, B-024, B-030, B-040, B-041, B-042, B-043, B-044, B-045, B-046, B-047, B-048, B-049,
B-050, B-060, B-061, B-062, B-070, B-071, B-072, B-080, B-081, B-090, B-091, B-092, B-093, B-100,
B-101, B-110, B-111, B-120, B-121, B-122, B-200, B-201.

**Medium (7 of 68):** M02, M26, M27, M33, M55, M57, M65.

**Low (~22 of 117):** 19, 30, 40, 45, 47, 48, 49, 50, 52, 58, 62, 64, 65, 67, 79, 80, 85, 91, 94,
108, 112, 117.

**Only B-063 remains canonical.** Every detail of how each of the above was fixed, and every place a
better fix was taken than the report proposed, is in the ledger. Read it rather than re-deriving.

## 3. Your worklist, in the order I would take it

### A. B-063 — the Catch-up feature. Build this first; it is the largest single piece left.

**It is already designed and the owner has already answered the two questions that mattered.** The
full design is in the ledger under "B-063 — the owner's decisions"; the short version:

- **Delete is PERSONAL.** Any member may delete a Catch-up and it removes **only their own copy**.
  The owner was explicitly offered, and declined, the Keeper-only variant that soft-deletes the
  shared Catch-up for everyone. No member action may destroy anything another member relies on.
- **A leaver's published answers STAY** in the Rounds they were published in.
- **Leave** — on the Catch-up's own People panel. Immediate, confirmed, permanent. Refused for the
  creator, who is offered End or hand-over instead.
- **Archive** — moves the card to an "Archived" section on `/catchups`. Still a member. Instantly
  reversible, no confirmation.
- **Delete** — moves to "Recently deleted", stops that Catch-up's notifications to that member,
  restorable for 30 days with the days remaining on the row; after 30 days the nightly retention
  sweep removes their `GroupMember` row for real. On-brand confirmation dialog.
- **State lives on `CatchupPref`** — already unique on `(catchupId, userId)` and cascading from both
  sides, so per-member state cannot leak across members by construction. Add nullable `archivedAt`
  and `deletedAt`, plus an index on `deletedAt` for the sweep. One dated manual migration.
- **Notifications:** a deleted Catch-up stops notifying that member (`groupMemberIds` in
  `catchups-notify.ts` must exclude them). An archived one does not — archiving is filing, and
  muting already has its own control (`reminderMode`).
- **The two extra sections render only when non-empty** (owner: "hidden entirely when the member has
  none, no dead buttons").

Things you will want to know before you start:

- `/catchups` builds its cards from **`GroupMember`**, not from `Catchup` — a group with no Catch-up
  yet still gets a "Start one" card. So archive/delete affordances belong only on cards that have a
  Catch-up, and `leaveCatchup` is a `GroupMember` delete.
- The **B-001 dependency is satisfied**: the ownership cascade is fixed, `Group.creatorId` is
  nullable `SetNull`, and `promoteOrphanedGroups` hands a group to its longest-standing member.
- `advanceDueCatchups` and `openNextRoundIfDue` are both scoped by membership when given a `userId`,
  so a member who has left stops being swept automatically.
- The retention sweep to extend is `src/lib/retention.ts`; follow the shape of the existing steps and
  cap the per-run count, as the account purge does (audit Low 64).
- **Screenshot desktop and mobile, read the PNGs, compare in numbers, two rounds. Run
  `screenshot-qa` ×2 in parallel and `design-protocol-auditor`. Run `write-path-reviewer` on the
  actions and the migration. Then `/simplify`.**

### B. The Medium tail — 61 roots left (§3.M).

They cluster hard, and a family per commit is how sessions 1 and 2 kept commits coherent. The
clusters still standing, roughly largest first:

- **Fire-and-forget telemetry writes with no `after()`/`waitUntil`** — M24, and Lows 25, 35, 44, 72,
  77, 82, 87. On serverless these are stochastically lost. `src/lib/last-seen.ts` already documents
  the right shape; note also its rule that a guard which hides its own breakage is worse than no
  guard (CLAUDE.md gotcha 8).
- **Catch-ups correctness** — M08 (cadence change does not reschedule), M09 (engine failure swallowed
  to console, Sentry blind), M10 (anonymous askers unmasked to Keepers), M11 (answer marked "shared"
  when the save failed), M12, M13 (archive N+1). **M11, M36, M67 and M68 were each confirmed present
  in the live code by session 2's B-042 sweep and deliberately left alone** — they are real, they are
  next.
- **Directory** — M23 (NaN params 500 the page), M36 (stale page appended under a new filter), M38
  (`DESC NULLS FIRST` puts no-batch members first and the keyset skips them), M39, M40, and Lows 69,
  71, 73.
- **Uploads and R2** — M14 (orphaned objects: abandoned presign, `staging/`, refusal paths), M15
  (animated GIFs flattened), M16 (100MP originals re-encoded at full res), M17 (bytes deleted before
  the row, inverting the stated invariant), and Lows 41, 42, 106.
- **Money** — M03 (test-mode Razorpay counted as real), M56 (checkout retry dead after one failed
  load), M58 (refunds/disputes invisible), M59 (**signature reject answers 400, which makes Razorpay
  auto-disable the endpoint** — this one has teeth), M60 (`/pick-bird` 500s without keys), and Lows
  8, 116.
- **Mail** — M50 (claim not scoped), M51 (`failed` mapped to `imminent`, so the banner lies), M52,
  **M53 (`EMAIL_DEV_SEND`, see §5 below — the code half is still owed)**.
- **Auth and sign-up** — M07 (**Turnstile erroring client-side bricks sign-in permanently** — the
  worst one left in this group), M18 (a DB outage during login reads as "invalid password", sending
  people into a doomed reset loop), M45, and Lows 20, 22, 111, 114, 115.
- **Demo** — M61, M62, M63, M64, and Lows 66, 68.
- **Shell and perf** — M05 (one error boundary for the whole app), M06 (five async routes with no
  `loading.tsx`), M22 (root layout awaits the theme cookie, making every route dynamic).
- **Small and independent** — M01, M04, M25, M28, M29, M30, M31, M32, M34, M35, M43, M44, M46, M47,
  M48, M49, M54, M66.

### C. The Low tail — ~97 left (§3.L).

Many are one-liners and many cluster with a Medium above. The distinct families still open: the
surrogate-pair truncation family (Lows 38, 107 — `.slice()` and `[0]` cut emoji in half in
`plainExcerpt`, `letterTitle`, `getInitials`), the admin-list unbounded family (Low 55), the
GitHub-Actions family (Lows 43, 51, 102, 103, 104, 105 — including **Low 43, which disables the
nightly retention sweep after 60 days of repository inactivity**), and the cross-path
validation-disagreement family (Lows 84, 96, 109). The rest are independent.

### D. The close-out.

- Every remaining finding **dispositioned** in the ledger — fixed, not-a-bug-with-reason, or
  deferred-with-reason. That is what "done" means here.
- `npm run check`, `npm run visual` and `npm run test:e2e` green.
- Tell the owner what shipped in plain language, and **ask before pushing.**
- Log the session in `progress.md`.

**Optional, owner's call, not yours to start:** the k6 load test in §4.6. He **skipped** the
throwaway database, so it is reference material unless he says otherwise. Never load-test the shared
production database.

## 4. Hard rules (non-negotiable)

1. **Containment.** Every command runs inside `/Users/sanan/Documents/rv-connect/`.
2. **THE DANGEROUS FACT:** local dev and production share **ONE** Supabase database. There is no
   staging. It holds real roster data and real member rows.
3. **Schema changes never use `prisma db push`.** Edit `prisma/schema.prisma`, write a dated
   **idempotent** file in `prisma/migrations-manual/`, `npx prisma generate`, apply with
   `node scripts/dev/run-sql.mjs <file>`. Test every backfill with a `SELECT` first, and put a
   `DO $$ ... RAISE EXCEPTION` guard in the file so it re-checks at apply time rather than trusting
   your paragraph. `2026-08-21-catchup-pause-freeze.sql` and `2026-08-21-profile-show-email.sql` are
   session 2's worked examples.
4. **Deploys are git-only, and a push is a deploy.** Commit freely to `main` as each coherent piece
   lands and passes `npm run check` — no feature branches — but **do NOT push; ask the owner.**
   Plain conventional messages, **no `Co-Authored-By`, no model names, no AI attribution.** Stage by
   name; never `git add -A` or `git commit -a`.
5. **Another session shares this checkout.** Uncommitted changes you did not make are somebody's work
   in progress. Never `git stash`, `git checkout -- .`, `git reset --hard`, `git clean`, or revert,
   rewrite or amend anything you did not author. It happened during session 1.
6. **Reading `.env` directly is permission-blocked.** Use `node scripts/dev/run-sql.mjs --inline
   "SELECT ..."` for read-only SQL. To confirm a var *name* exists, read `.env` via `fs` in a node
   one-liner that prints only matching KEY names. **Never paste a secret — or a session token — into
   `evaluate_script`.**
7. **Mobile + no-regressions.** Every desktop UI change is verified at **390x844** too; screenshot
   both. No `transition-all`, no hand-typed `cubic-bezier(...)`, no default Tailwind blue/indigo, no
   pure-white surfaces, **no em dashes in copy**. The user-facing name is "Rishi Valley". CTAs are
   Canopy `#235C49` pills; only `transform` and `opacity` animate; every clickable element has hover,
   focus-visible and active; any new async route ships a `loading.tsx` with the warm shimmer.
8. **Storage:** don't install packages over 200MB without asking.

## 5. Still owed to the OWNER (carried forward — tell him again)

- **`EMAIL_DEV_SEND=1` is set in the local `.env`.** That flag makes this development machine send
  REAL mail from the production sending domain to real member addresses in the shared production
  database. Nothing has been sent by any session, but the next drain from any local page view will
  send whatever is queued. He should comment that line out when not actively testing a template.
  **The code half is still owed (audit M53):** keep `queueIsSendable()` all-or-nothing as it is, and
  give the drain's row selection a development-only `to: { in: [ADMIN_EMAIL] }` filter, so a local
  drain can never CLAIM a row addressed to somebody else. Do NOT make `sendMail` refuse the address
  instead — a refusal there is a non-transient failure, so the row would burn its attempts and end up
  `failed`, which is the 2026-08-12 incident wearing a different hat.
- **R2 custom serving domain** (§0.2b) is still not done: images are served from the throttled
  `pub-*.r2.dev`. Needs a custom domain on the bucket, `R2_PUBLIC_BASE_URL` in Vercel, and that
  domain in `next.config.ts` remotePatterns (the code part is yours). Audit Lows 19/56, M19.
- **Vercel env cleanup + `NEXTAUTH_URL` check** — his list, `bugs.md` 14-15, unchanged.
- **`CRON_SECRET`** — still owed from the security overhaul.

## 6. Method — how to fix each finding

1. **Confirm it in the live code first.** Open the cited `file:line`, read the whole function. The
   tree has moved a long way: sessions 1 and 2 changed well over a hundred files, so a finding may
   already be half-fixed or the code may have moved. If you conclude a finding is **wrong**, do not
   "fix" correct code — write down why in the ledger and move on.
2. **Reproduce it** where a live repro is cheap and safe: `chrome-devtools`, `run-sql.mjs`
   (read-only), `next-devtools` `get_errors`. For anything only demonstrable with a risky write, use
   a **rolled-back transaction** (`BEGIN; ...; ROLLBACK;` through `run-sql.mjs`) — that is how the
   B-001 cascade, the B-121 unique and B-040's racing insert were all proved without changing a row.
3. **Write the test first.** Each finding names a "pin it fixed". Prefer a real behavioural test on a
   pure module, extracting one if the rule is tangled with Prisma or JSX — `mail-policy.ts`,
   `email-address.ts`, `group-succession.ts`, `post-caps.ts`, `place-input.ts` and `contact-rows.ts`
   were all extracted for exactly this. Where only a shape can be pinned, use the
   `security-regressions.test.mjs` style, and **pin the property, not the instance** —
   `cascade-rule.test.mjs` walks the whole Cascade graph rather than checking the two columns the
   audit named, and `valley-day.test.mjs` sweeps every file for a date rendered without a time zone.
4. **Fix it.** The fix direction is a floor. Reuse the shared primitives; match the surrounding
   code's idiom and comment density; comment the constraint the code cannot show. This codebase's
   house style is that **every constant is argued for in a comment** — follow it.
5. **Prove it.** Re-run the repro, `get_errors` clean, `npm run check`. UI: screenshot desktop and
   mobile, **Read the PNGs**, compare in numbers, two rounds, `npm run visual`, then `screenshot-qa`
   ×2 and `design-protocol-auditor`. Write paths / schema / auth / uploads: `write-path-reviewer`.
   **Read every diff yourself** — an agent's "passing" is a claim. Session 2's reviewer produced
   three real findings on one commit, one of which (the freeze covering only the clock and not the
   Keeper's controls) was a genuine hole in work that had already passed every gate.
6. **Commit** the coherent piece, files staged by name. **Update `fix-log.md`** in the same commit or
   the next — it is the only durable record across sessions.

**Database discipline:** reads are free. Every write you test goes through the app under a clearly
named throwaway account created via the normal signup flow, deleted before the session ends. Never
mutate real member rows outside a sanctioned, SELECT-tested migration.

## 7. The arsenal

**Gates.** `npm run check` (TypeScript, ESLint, the shape+colour protocol, the lab registry, 46 unit
tests) after every change and before every commit. `npm run visual` (10 routes × 2 viewports) after
every UI change — its point is the page you were not looking at; a red run is a **question**, so open
`npm run visual:report`, look at the diff, then fix or `visual:update`. Never `visual:update` to make
a failure go away. `npm run test:e2e` adds the sign-in flow. `npm run verify:crawl` sweeps every
authed route.

**Live inspection.** `chrome-devtools` MCP drives a real headless Chrome and **holds the page open
between calls**. `next-devtools` `get_errors` catches the runtime failure `tsc` passes — session 2
shipped a change that compiled clean and 500'd every importing route, and this is what caught it.
**The MCP finds the answer; a Playwright spec remembers it.**

**Screenshots.** `node scripts/qa/verify-shot.mjs <route> <filename.png> [mobile]` is the workhorse:
authed, plus console and pageerror capture. **Call it with `node`, not `npm run verify:shot`** — npm
mangles the quoting — and pass a **bare filename**, because the script prefixes
`temporary screenshots/` itself. It needs
`PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. A cold
route outruns its 30s nav timeout; just re-run it warm.

**Agents.** `write-path-reviewer` on every server-action / API-route / auth / upload / schema change.
`screenshot-qa` ×2 (one desktop, one mobile, in parallel — that pair is the accepted maximum) after
any UI change. `design-protocol-auditor` reads the diff against the design system.
`silent-failure-hunter` for error-handling work. Sonnet for implementation and review, Haiku for
mechanical work, Opus only for an ambiguous product call the specs do not answer.

A worked example of a good fan-out, from session 2: the B-042 sweep (77 call sites across 44 files)
went to one Sonnet agent with a precise brief, an explicit list of files it must NOT touch because
another worker was in them, an instruction to flag rather than guess on four adjacent findings, and
a requirement to run `npm run check` itself. It came back correct; the whole diff was still read here
before committing.

**Skills.** `superpowers:brainstorming` before any creative work (B-063 has already been through it —
the design is approved, so go straight to building). `superpowers:systematic-debugging` the moment a
repro behaves unexpectedly. `superpowers:test-driven-development` for every fix.
`frontend-design:frontend-design` and `.claude/skills/liftkit-spacing/SKILL.md` before any UI work.
`/check`, then `/simplify` before committing a feature.
`superpowers:verification-before-completion` before calling anything done.

**Resource discipline (the owner's standing instruction).** Depth is the goal; waste is not. Don't
re-run the heavy suites without a reason. One reviewer per item. **Never run parallel browser or
screenshot fleets** — his Mac has hung on many concurrent Chrome processes; the two-at-once
`screenshot-qa` pair is the ceiling. Note also that running a subagent's `npm run check` at the same
time as your own makes both crawl (session 2 saw a 780-second check and a 12-minute visual run under
contention, and the visual run threw two false failures that did not reproduce). Serialise the heavy
gates.

## 8. Traps this codebase has already sprung — do not step in them again

Session 2's additions to the list; the earlier ones are in the ledger.

- **A non-async export in a `"use server"` file breaks every importing route at RUNTIME, and `tsc`
  passes it clean.** ("Server Actions must be async functions.") Helpers in an actions file must be
  module-private. Caught only by `next-devtools` `get_errors`.
- **A testable module must have no relative VALUE imports.** `node:test` cannot resolve an
  extensionless `./utils`, and `tsc` refuses `./utils.ts` without `allowImportingTsExtensions`.
  Type-only imports are fine (node strips them), which is how `catchups.ts` gets away with one. If a
  pure module genuinely needs a helper, inject it as a parameter — `contact-rows.ts` does.
- **`node:test` cannot load a `.tsx` file at all** (it cannot strip JSX). Extract the pure part.
- **`validators.ts` is not importable from a test** because it imports `./collection` extensionless.
  That is why `post-caps.ts` exists.
- **Deleting a route leaves stale generated types** in `.next/types/validator.ts` from an old
  `next build`, and `tsconfig` includes them, so `tsc` fails on a route that no longer exists.
  Move that one directory aside (`mv .next/types .next/types-stale-<date>`) rather than touching
  `.next` wholesale, which another session may be mid-build in.
- **Adding a plain `{ error: string }` to a server action's return union breaks TypeScript's
  narrowing** at every call site. TS synthesises `?: undefined` siblings for an action's own return
  branches, which is what makes `if (result.error)` then `result.comment` compile; a bare error
  object has none of those keys, and `if (result.error)` cannot narrow it away because `string`
  includes `""`. `call-action.ts`'s `ActionFailureLike<T>` is the fix — read it before touching it.
- **Avoid backticks in `git commit -m` strings** — zsh eats them. Use a heredoc, as every commit in
  sessions 1 and 2 did.

## 9. Definition of done

Every finding in `bug-report.md` is either fixed-and-pinned-with-a-test or explicitly dispositioned
in `docs/planning/audits/fix-log.md` (fixed / not-a-bug-with-reason / deferred-with-reason).
`npm run check`, `npm run visual` and `npm run test:e2e` green. B-063 ships with desktop and mobile
screenshots reviewed and the UI reviewers run. Every schema change went through a dated manual
migration and `write-path-reviewer`. Throwaway accounts and test data deleted. The work is committed
to `main` in coherent pieces — **not pushed**. Tell the owner what shipped, in plain language, and
ask before pushing. Log the session in `progress.md`.

---

## Appendix — one thing session 2 could not prove live, for you to close

**B-050's "hidden email shows nothing" case was proved by unit test and by a shape assertion on the
render site, but never rendered live with `showEmail = false`.** Every live row has `showEmail =
true` (the migration's default), and setting a real member's row false to take a screenshot would
have been mutating real member data outside a migration. The honest way to close it: create a
throwaway account through the normal signup flow, remove its email row through the UI, view its
profile as another verified member, confirm the Get in touch sheet offers no email and the vCard
carries no `EMAIL:` line, then delete the account. Five minutes, and it retires the last unproved
claim in session 2's work.
