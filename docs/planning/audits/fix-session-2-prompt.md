# The Pre-Release Fix Session, part two

You are continuing a job that is already half done. Session 1 (2026-08-21) took the findings of the
formal pre-release bug & stability audit and fixed **both Criticals, every launch-blocking High, and
the whole scale phase** — fourteen commits on `main`, none pushed. Your job is the rest: the
remaining correctness work, the long Medium and Low tails, and the **two feature builds the owner
decided on**, done to the same standard.

**Read these two files before anything else, in this order:**

1. `docs/planning/audits/fix-log.md` — the disposition ledger. Every finding session 1 touched, the
   commit it shipped in, and *how it was proved*. Its "Still open" section is your worklist and its
   "Things a later session should know" section will save you two hours of rediscovery.
2. `docs/planning/audits/bug-report.md` — the audit itself, still the spec. §0 = owner decisions,
   §2 = the phased plan, §3 = every finding with evidence, `file:line`, a fix direction and a "pin it
   fixed" test, §3.M = the 68 Medium roots, §3.L = the 117 Low appendix, §4 = the 2,000-user dossier,
   §5 = the verified-clean map (do not re-litigate what is in it), §6 = coverage. Raw per-finding
   evidence is in `docs/planning/audits/wave1/*.json`, keyed by the `W1-xxx` ids each finding cites.

Then `CLAUDE.md` and `AGENTS.md` (hard rules; "this is NOT the Next.js you know"),
`docs/spec/DESIGN-SYSTEM.md` before any UI work, and the relevant `docs/spec/*.md` for whatever you
are touching — `profile.md` and `catchups.md` in particular, because the two feature builds live
there.

---

## 1. The owner's intent, in his own words (this is the spec)

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
now works that didn't), never the mechanism.

Session 1 took him at his word and it paid: three of the report's fix directions were improved on,
and one was found to be **wrong** (see `statement_timeout` in the ledger). Do the same. The report
was validated hard, but you are the last line — trust your reading of the live code over the report
when they genuinely conflict, and write down why in the ledger.

## 2. What is already done (do not redo any of it)

Both Criticals and every launch-blocking High. In plain terms: deleting an account no longer
destroys other members' writing; a bad minute at the email provider no longer permanently kills
queued password resets; the account-deletion warning email can be sent at all; email capitalisation
is canonical everywhere and the one affected live member is fixed; the admin panel cannot be locked
shut from inside and every admin page re-checks the role; photos are shrunk in the browser so
onboarding stops failing silently; the feed card, the composer, the letters desk and the feed rail
stop losing or leaking what members wrote; payments that land while the phone kills the tab reach
the supporter; ten missing indexes plus a trigram index took the city search from 368ms to 7.4ms;
and a batch can no longer be split into two groups on launch day.

**Fixed:** the pool config, B-001, B-002, B-010, B-011, B-012, B-013, B-020, B-021, B-022, B-023,
B-024, B-030, B-041, B-043, B-044, B-045, B-048, B-049, B-070, B-071, B-072, B-080, B-081, B-090,
B-091, B-092, B-093, B-101, B-121, plus M02, M26, M27, M55, M57 and Low 62/64/85.

## 3. Your worklist, in the order I would take it

**A. Finish the canonical list (16 left).** Group them by area, not by id — most of these share a
file with a neighbour and batching them is how session 1 kept the commits coherent.

- **Catch-up lifecycle (B-060, B-061, B-062).** Both Highs. A Round that publishes while paused
  never schedules another and there is no manual recovery; pausing or ending does not stop the
  in-flight Round, which keeps advancing, keeps sending daily reminders and publishes itself; and a
  Catch-up nobody adds questions to runs the whole cycle anyway, nudging everyone daily to answer
  nothing. B-061 asks you to **decide the semantics** — freeze the Round on pause, or let it finish
  but keep the console and the countdown consistent with what the notifications say — and then
  enforce that decision in one place. That is a product call the specs do not fully answer; make it,
  and write down which you chose and why. The engine is pure and already has a real unit-test suite
  (`src/lib/catchups.test.mjs`) — that is where the pins belong, and it is one of the few places in
  this codebase where you can test behaviour rather than shape.
- **Dates and IST (B-100, B-101 done, plus the ~15-surface list in §3.M/§3.L).** One helper change in
  `src/lib/utils.ts` (`formatDisplayDate`, `formatTimeAgo`'s fallback) plus every surface in the
  dates dossier. This is the single best fan-out candidate in the whole report: the sites are
  independent, mechanical, and easy to verify. Note the helper change also moves what CLIENT
  components render, so the visual baseline for `/letters` will move — look at the diff, then
  `npm run visual:update` and commit the PNGs.
- **Client error handling (B-042).** The systemic one: no client component anywhere handles a
  *rejected* server action, so one network blip strands the UI in infinite skeletons and wedged
  buttons. The report names the priority order. Introduce the one `callAction` helper it describes
  and route every await-an-action through it, converting each `setBusy` pair to try/finally. Second
  best fan-out candidate. `silent-failure-hunter` is the right reviewer for this one.
- **Toggle races (B-040).** The five like/vote/bookmark toggles are check-then-write with no P2002 /
  P2025 handling, so a double-tap throws a raw error out of the action and desyncs the UI. Make them
  idempotent at the server; add an in-flight guard client-side. Low 67 and Low 80 are the same root.
- **Notification links (B-046)** — like/comment/reply notifications all hard-code `/feed#<postId>`,
  which is wrong for group posts and letters and never scrolls anyway; the admin bell links to a
  retired route. **B-047** — `editPost` caps plain posts at 5000 while `createPost` accepts 20000, so
  a long post becomes permanently uneditable. **B-110/B-111** — the legacy `/onboarding`
  `updateProfile` and both places writers validate nothing. **B-120** — the bell badge is frozen for
  the whole session. **B-122** — "Most loved" has no deterministic tiebreaker, so pagination
  duplicates and drops photos. **B-200/B-201** — the two net-new Lows from the completeness pass.

**B. The two feature builds.** These are the biggest single chunk left and the place the owner most
wants creativity rather than a mechanical patch. **Brainstorm each before implementing**
(`superpowers:brainstorming`), read the relevant spec, and where the spec does not answer a product
or design call, make a considered decision and record it.

- **B-050 — profile email control.** The member can set a **custom display email** different from
  their sign-in address, OR **clear it to show no email at all**. Clearing must display *nothing* —
  never fall back to the private sign-in address, which is the current bug (`page.tsx:177`
  `user.displayEmail?.trim() || user.email`). Default stays "show". The sign-in email is untouched.
  Note `buildRows` in `contacts-editor.tsx` also re-seeds the row from `source.email`, so a cleared
  row currently reappears on the next edit; both halves have to go.
- **B-063 — leave / archive / delete a Catch-up.** Members can **leave** one; and can **archive** or
  **delete** one, where delete is a **soft delete into a "Recently deleted" area held for 30 days**,
  restorable, then purged. **UI:** the archive/delete affordances stay **compact under `/catchups`
  and hidden entirely when the member has none** — no dead buttons — and delete gets a clean
  "are you sure", done on-brand. The B-001 dependency is satisfied: the ownership cascade is fixed,
  so a delete can no longer wipe every member's answers. Screenshot desktop and mobile, run the UI
  reviewers, run `/simplify`.

**C. The tails.** 63 remaining Medium roots (§3.M) and 114 remaining Low items (§3.L). Many are
one-liners and many cluster (the fire-and-forget telemetry writes, the remaining missing-index
columns, the surrogate-pair truncation family, the year-validator-at-module-load family). Cluster
them and fix a family per commit. Every one of them still needs to be **dispositioned** in the
ledger — fixed, not-a-bug-with-reason, or deferred-with-reason. That is what "done" means here.

**D. Optional, owner's call, not yours to start:** the k6 load test in §4.6. The owner **skipped**
the throwaway database, so this is reference material unless he says otherwise. Do not run load
tests against the shared production database.

## 4. Hard rules (non-negotiable)

1. **Containment.** Every command runs inside `/Users/sanan/Documents/rv-connect/`.
2. **THE DANGEROUS FACT:** local dev and production share **ONE** Supabase database. There is no
   staging. It holds real roster data and real member rows.
3. **Schema changes never use `prisma db push`.** Edit `prisma/schema.prisma`, write a dated
   **idempotent** file in `prisma/migrations-manual/`, `npx prisma generate`, apply with
   `node scripts/dev/run-sql.mjs <file>`. Test every backfill with a `SELECT` first, and put a
   `DO $$ ... RAISE EXCEPTION` guard in the file so it re-checks at apply time rather than trusting
   your paragraph — see `2026-08-21-email-canonical.sql` and `2026-08-21-batch-group-identity.sql`
   for the pattern. Only `prisma generate` and `prisma studio` are pre-approved.
4. **Deploys are git-only, and a push is a deploy.** Commit freely to `main` as each coherent piece
   lands and passes `npm run check` — no feature branches — but **do NOT push; ask the owner.**
   Plain conventional messages, **no `Co-Authored-By`, no model names, no AI attribution.** Stage by
   name; never `git add -A` or `git commit -a`.
5. **Another session shares this checkout.** Uncommitted changes you did not make are somebody's
   work in progress. Never `git stash`, `git checkout -- .`, `git reset --hard`, `git clean`, or
   revert/amend anything you did not author. It happened during session 1 — a `copy(support)` commit
   landed mid-session from another window.
6. **Reading `.env` directly is permission-blocked** (`cat`/`grep`/`head` on it are denied). Use
   `node scripts/dev/run-sql.mjs --inline "SELECT ..."` for read-only SQL and the `scripts/qa/`
   helpers for authed tooling. To confirm a var *name* exists, read `.env` via `fs` in a node
   one-liner that prints only matching KEY names. Never paste a secret into `evaluate_script`.
7. **Mobile + no-regressions.** Every desktop UI change is verified at **390x844** too; screenshot
   both. No `transition-all`, no hand-typed `cubic-bezier(...)`, no default Tailwind blue/indigo, no
   pure-white surfaces, **no em dashes in copy**. The user-facing name is "Rishi Valley". CTAs are
   Canopy `#235C49` pills; only `transform` and `opacity` animate; every clickable element has hover,
   focus-visible and active; any new async route ships a `loading.tsx` with the warm shimmer.
8. **Storage:** don't install packages over 200MB without asking.

## 5. Method — how to fix each finding

1. **Confirm it in the live code first.** Open the cited `file:line`, read the whole function. The
   tree has moved: session 1 changed 40-odd files, so a finding may already be half-fixed or the code
   may have moved. If you conclude a finding is **wrong**, do not "fix" correct code — write down why
   in the ledger and move on.
2. **Reproduce it** where a live repro is cheap and safe: `chrome-devtools`, `run-sql.mjs`
   (read-only), `next-devtools` `get_errors`. For anything only demonstrable with a risky write, use
   a **rolled-back transaction** (`BEGIN; ...; ROLLBACK;` through `run-sql.mjs`) — session 1 proved
   the B-001 cascade and the B-121 unique that way without changing a row.
3. **Write the test first.** Each finding names a "pin it fixed". Prefer a real behavioural test on a
   pure module (extract the rule into one if it is tangled with Prisma — `mail-policy.ts`,
   `group-succession.ts` and `email-address.ts` were all extracted for exactly this). Where only a
   shape can be pinned, use the `security-regressions.test.mjs` style, and pin the **property** not
   the instance — `cascade-rule.test.mjs` walks the whole Cascade graph out of `User` rather than
   checking the two columns the audit named, so the next careless relation fails on the day it is
   written. Tests are auto-discovered: any `*.test.mjs` under `src/` or `scripts/`.
4. **Fix it.** The fix direction is a floor. Reuse the shared primitives; match the surrounding
   code's idiom and comment density; comment the constraint the code cannot show. This codebase's
   house style is that **every constant is argued for in a comment** — follow it.
5. **Prove it.** Re-run the repro, `get_errors` clean, `npm run check`. UI: screenshot desktop and
   mobile, **Read the PNGs**, compare in numbers, two rounds, `npm run visual`, then
   `screenshot-qa` ×2 and `design-protocol-auditor`. Write paths / schema / auth / uploads:
   `write-path-reviewer`. **Read every diff yourself** — an agent's "passing" is a claim, and session
   1's reviewer produced two real findings and one misattribution in the same report.
6. **Commit** the coherent piece, files staged by name. **Update `fix-log.md`** in the same commit or
   the next one — it is the only durable record across sessions.

**Database discipline:** reads are free. Every write you test goes through the app under a clearly
named throwaway account created via the normal signup flow, deleted before the session ends. Never
mutate real member rows outside a sanctioned, SELECT-tested migration.

## 6. The arsenal

**Gates.** `npm run check` (~25s: TypeScript, ESLint, the shape+colour protocol, the lab registry,
38 unit tests) after every change and before every commit. `npm run visual` (~1.5min, 10 routes × 2
viewports) after every UI change — its point is the page you were not looking at; a red run is a
question, so open `npm run visual:report`, look at the diff, then fix or `visual:update`.
`npm run test:e2e` adds the sign-in flow. `npm run verify:crawl` sweeps every authed route.

**Live inspection.** `chrome-devtools` MCP drives a real headless Chrome and **holds the page open
between calls** — measure with `evaluate_script`, drive real interaction, read
`list_console_messages`, trace jank with `performance_start_trace`. `next-devtools` `get_errors`
catches the runtime failure `tsc` passes. **The MCP finds the answer; a Playwright spec remembers
it** — never use a Playwright run to discover what a page is doing.

**Screenshots.** `npm run verify:shot <route> <out.png> [mobile]` is the workhorse: authed, plus
console and pageerror capture, output under `temporary screenshots/` (gitignored). It needs
`PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` — the
bundled Chrome is broken here. A cold route can outrun its 30s nav timeout; just re-run it warm.

**Agents.** `write-path-reviewer` on every server-action / API-route / auth / upload / schema change.
`screenshot-qa` ×2 (one desktop, one mobile, in parallel — that pair is the accepted maximum) after
any UI change; give it the *context* of what changed and what you want measured, and it will come
back with real numbers. `design-protocol-auditor` reads the diff against the design system.
`silent-failure-hunter` for B-042. Sonnet for implementation and review, Haiku for mechanical work,
Opus only for an ambiguous product call the specs do not answer.

**Skills.** `superpowers:brainstorming` before either feature build.
`superpowers:systematic-debugging` the moment a repro behaves unexpectedly.
`superpowers:test-driven-development` for every fix. `frontend-design:frontend-design` and
`.claude/skills/liftkit-spacing/SKILL.md` before any UI work. `/check`, then `/simplify` before
committing a feature. `superpowers:verification-before-completion` before calling anything done.

**Resource discipline (the owner's standing instruction).** Depth is the goal; waste is not. Don't
re-run the heavy suites without a reason. One reviewer per item. **Never run parallel browser or
screenshot fleets** — his Mac has hung on many concurrent Chrome processes; the two-at-once
`screenshot-qa` pair is the ceiling. A mistake that forces rework is the most expensive thing here.

## 7. Definition of done

Every finding in `bug-report.md` is either fixed-and-pinned-with-a-test or explicitly dispositioned
in `docs/planning/audits/fix-log.md` (fixed / not-a-bug-with-reason / deferred-with-reason).
`npm run check`, `npm run visual` and `npm run test:e2e` green. The two feature builds ship with
desktop and mobile screenshots reviewed and the UI reviewers run. Every schema change went through a
dated manual migration and `write-path-reviewer`. Throwaway accounts and test data deleted. The work
is committed to `main` in coherent pieces — **not pushed**. Tell the owner what shipped, in plain
language, and ask before pushing. Log the session in `progress.md`.
