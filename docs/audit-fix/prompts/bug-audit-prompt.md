# ultracode

# The Pre-Release Bug and Stability Audit

You are running a complete, dedicated session with one job: perform a formal, exhaustive **bug
detection and stability audit** of this codebase before its public release, and produce a report so
thorough and precise that one or more later sessions can fix every item without re-deriving
anything. This is an **audit-only** session. You find, you confirm, you document. You do not fix.
Not one line of application code changes in this session.

There is no time limit. There is no meaningful usage limit. The owner has said, in his own words,
that if this takes ten hours he would be *happy*, because it means that much more effort went into
finding things. Depth and correctness are the only measures of success. Do not artificially pad the
work, but never cut a corner to finish sooner.

---

## 1. The owner's brief, in his own words

Everything below is the owner's actual intent, kept nearly verbatim because the nuance matters.
Read it as the spec:

> "I have a codebase that is quite functional. Obviously things can be added, things need to be
> tweaked, but it's fine broadly. Security is decently good [a full ten-phase security overhaul
> finished 2026-08-20; 74 findings tracked, 0 open]. I'm getting ready to release it to the
> public, and just before doing that I want one very formal attempt to identify bugs: detecting all
> edge cases, finding everything that could go wrong, making sure everything is going to be totally
> stable — scalable up to even 2,000 users. You won't reach that, but I would like some headroom.
> 2,000 users would be the absolute max, so make sure everything would be fine till then.
>
> I have no time frame. I don't care how long it takes. I just want it done well. Deploy agents to
> get this job done, at whatever level of granularity you want — that is your call, not mine. You
> are the one actually doing it, so you decide whether it's one agent per feature area, three per
> area, or one per subsection. Usage is not much of a concern and time is not at all a concern.
>
> We are not fixing anything in this session. This is auditing: identify everything and write up a
> brief of every single thing, so that another session (or many sessions) can then address all of
> it. The agents report back to you; you compile a full report that will allow another session to
> address everything.
>
> I want some level of ownership from you, the orchestrator. Not zero. When you brief agents, you
> lose nuance — your brief is your interpretation, compressed. So carry the full intent into every
> agent brief, and when reports come back, own the compilation: check them, don't just staple them
> together.
>
> On skills and outside knowledge: many people have written very thorough instructions for exactly
> this kind of task. I don't want you to pick the best of them — I want to apply ALL of them.
> Append everything together so we get literally everything. And go one level above skills too:
> plugins, articles, techniques, research — anything other people have done that might be useful.
> When I ran my security audits, I appended multiple full audit prompts from different sources
> together, and it gave me really thorough results. Think: what is the goal here, and how do I best
> achieve it?"

The research step he asked for has already been done (see section 5): community skills and
Anthropic's own production review agents were found, verified, and **installed into this repo**,
and the best published bug taxonomies were distilled into section 6. Your job is to *use all of
it* — and if you see a gap the research missed, you have web access; go look.

## 2. The prompting ideology — how you brief your agents

The owner has strong, explicit views on how AI should prompt AI. They bound every agent brief you
write in this session:

- **Verbose is good.** "When you're conveying everything — all your ideas, all your fears,
  emotions — it captures it better." Do not compress an agent's brief to minimal bullets. Carry
  the owner's intent (section 1) into each brief nearly whole, plus that agent's specific charter.
- **Do not box agents in.** "If I just needed one solution, then it's fine to be direct. But we
  don't know what we want, so we need a level of creativity." Give each agent its territory, the
  goal, the checklists, the tools — then let it hunt. Its checklist is a floor, never a ceiling;
  the bug nobody listed is the one this audit exists to catch.
- **Decisions belong to whoever is doing the work.** The owner refused to dictate granularity to
  you. Extend the same courtesy downward where an agent is better placed to judge than you are.

## 3. What this codebase is

- **App**: a Next.js 16 alumni network for Rishi Valley school. App Router, Server Actions for
  all mutations (API routes only for auth/webhooks/uploads/crons), Tailwind v4, Prisma 7 via the
  `pg` adapter, NextAuth v5 beta (**JWT sessions**, email+password, `credentialVersion` revocation),
  Supabase Postgres in Mumbai, images on Cloudflare R2 through `src/lib/storage.ts` (presigned
  direct uploads shipped), Resend for mail, Upstash for rate limiting, Razorpay for donations,
  Sentry + PostHog for observability, deployed on Vercel.
- **Size**: ~200,000 lines of TS/TSX; ~90 routes (43 are `/lab` dev rooms), 11 server-action
  files, 14 API routes. Schema in `prisma/schema.prisma`.
- **Read before anything**: `CLAUDE.md` and `AGENTS.md` (they bind you), `docs/ROADMAP.md`,
  `docs/spec/*` for each area, `docs/planning/bugs.md` (the existing bug tracker — don't re-report
  what's already tracked), `progress.md` (session history), and the security reference docs (the
  2026-08-20 overhaul is done; do not re-run a security audit, but stability/DoS/resource
  exhaustion — which security audits deliberately exclude — is squarely yours).
- **THE ONE DANGEROUS FACT — read twice**: local dev and production share ONE Supabase database.
  There is no staging database. The app is pre-launch, but the database holds real roster data and
  real member rows. This shapes how you reproduce bugs (section 7).
- **The demo**: a separate public demo deployment exists with a three-layer default-deny write
  system; `src/lib/security-regressions.test.mjs` pins its guarantees.
- **Gates**: `npm run check` (~17s: TypeScript, ESLint, protocol audit, lab registry, unit tests),
  `npm run visual` (20 screenshot baselines), `npm run test:e2e`, `npm run verify:crawl` (every
  authed route with console-error capture).
- **Live tooling**: the `chrome-devtools` MCP drives a real browser and holds pages open between
  calls (auth via `POST /api/dev-login` with `DEV_LOGIN_SECRET` — see
  `.claude/skills/screenshot-auth/`); `next-devtools` MCP gives `get_errors`, `get_logs`,
  `get_routes` from the running dev server. Use them to *confirm* hypotheses live.

## 4. Hard rules for this session

1. **Audit-only.** No edits to application code, config, schema, or tests. The only files you
   create or modify are your report and working notes under `docs/audit-fix/<yyyy-mm-dd>-bug-audit-N/work/`.
2. **Containment**: every command runs inside `/Users/sanan/Documents/rv-connect/`.
3. **Never** run `prisma db push`, never run any Vercel CLI deploy command, never push to git (a
   push is a deploy). Committing your report files to `main` at the end is allowed and expected;
   stage them by name, plain conventional commit message, no AI attribution.
4. **Other sessions may share this working tree.** Uncommitted changes you did not make are
   someone's work in progress. Never stash, reset, checkout, or clean. Never kill a dev server or
   background job you did not start.
5. **Database discipline** (because dev = prod): reads are free; writes only ever through the app
   itself under a dedicated, clearly-named test account (create one, e.g. via the normal signup
   flow, named so no human could mistake it: "Audit TestBird"), never touch or mutate real member
   rows, and delete everything the audit created before the session ends. No raw SQL writes. If a
   bug can only be proven with a risky write, don't prove it live — argue it from the code and
   mark it "suspected."
6. Temporary read-only tool installs are fine (report-only flags everywhere); nothing over 200MB;
   uninstall so the tree ends clean.
7. **Resource discipline.** The no-time-limit grant is for depth, not waste: don't burn usage on
   preventable retry loops, re-derivation, or agents doing what a grep answers. And the owner's
   machine has hung before under parallel heavy processes: reading agents may fan out freely, but
   run at most ONE headless Chrome and ONE build (or e2e/visual run) at a time — all live browser
   reproduction and fuzzing is serialized through that single browser.

## 5. Your arsenal — use all of it, not the best of it

### 5a. Skills and agents installed in this repo (apply each; the owner wants ALL appended, not curated)

| Resource | What it brings |
|---|---|
| `find-bugs` skill (`.claude/skills/find-bugs/`) | Sentry's bug/quality hunting method. Written for branch diffs — you apply its lenses to whole subsystems instead. |
| `bug-hunt-swarm` skill | Parallel read-only root-cause investigation: bug packet → four investigator lenses (reproduction/scope, code path/failure seam, regression history, proof plan) → ranked diagnosis with confidence. Use it on every "suspicious behavior" an agent surfaces. |
| `review-swarm` skill | Parallel high-signal review: behavioral regressions, reliability, performance, contract gaps, prioritized fix path. |
| `code-review-skill` (`.claude/skills/code-review-skill/`) | ~21k lines of review reference. The gold is in `reference/common-bugs-checklist.md`, `reference/typescript.md`, `reference/react.md`, and `reference/cross-cutting/` (async/concurrency, N+1 queries — some deep-dives are in Chinese; read them anyway, you read Chinese fine). |
| Anthropic's PR-review agents, now project agents (`.claude/agents/`) | `silent-failure-hunter` (interrogates EVERY catch block, fallback, and error path — spawn it over the whole `src/lib` + actions surface, not just a diff), `code-reviewer`, `pr-test-analyzer` (are the tests testing anything?), `type-design-analyzer`, `comment-analyzer` (comments that lie about the code are bug evidence). |
| `docs/audit-fix/2026-08-22-bug-audit-2/work/audit-assets/anthropic-code-review-pipeline.md` | Anthropic's production review pipeline, downloaded verbatim. Its architecture is MANDATORY here (see section 7): parallel finders → **one independent validation agent per finding** → filter. Its false-positive exclusions apply too: pre-existing-and-tracked, pedantic nitpicks, things a linter catches, style. |
| `write-path-reviewer` agent | This repo's own four write-path invariants + the demo's three layers. Run it across every actions.ts and API route, not just diffs. |
| `superpowers` suite | `systematic-debugging` (four-phase root cause) whenever a repro behaves unexpectedly; `verification-before-completion` before you call the report done; `dispatching-parallel-agents` for the fan-out. |
| `VibeSec-Skill` | Web-app secure-patterns lens; its checklist overlaps stability (mass assignment, validation gaps). |
| `planning-with-files` | Keep `task_plan.md` / `findings.md` under `docs/audit-fix/<yyyy-mm-dd>-bug-audit-N/work/` so the session survives interruption. |
| `docs/audit-fix/2026-08-22-bug-audit-2/work/audit-assets/blns.txt` | The Big List of Naughty Strings (742 lines), downloaded. Feed it through every text input via the browser MCP: posts, comments, letters, names, bios, search, catch-up answers. Also mine github.com/kdeldycke/awesome-falsehood taxonomies (time, names, emails) for input designs. |

### 5b. The distilled community + Anthropic methodology, appended as the owner asked

The single most transferable technique found in research is Anthropic's own vulnerability-hunting
scaffold (Project Glasswing, 500+ real bugs found): **hypothesize from code → run the actual app to
confirm or reject → output either a negative result or a report with reproduction steps.** And its
diversity trick: **first rank every file by likelihood of containing interesting bugs, then
partition files across agents by that ranking** so no two agents chase the same hot spot while cold
spots go unread. Use both. The fault-localization literature (AgentFL, MemFL, FLAME) adds:
structure each agent's work as comprehension → navigation → confirmation; feed condensed project
context (the spec docs) rather than raw everything; and prefer several independent reviewers whose
verdicts are aggregated over one big reviewer.

## 6. The master bug taxonomy — total coverage required

Every item below must be applied across the whole surface by some agent. This is the floor.

**6a. Universal correctness:** off-by-one in loops/slices/pagination; boundary values (0, 1, max,
max+1, negative); boolean-logic inversions; missing null/undefined handling and optional chaining
that silently hides real failures; **missing `await`** (fire-and-forget writes); unhandled promise
rejections; `Promise.all` where one rejection shouldn't abort siblings; stale closures; collection
modified during iteration; `parseInt` without radix; float equality; resource leaks (listeners,
timers, subscriptions never cleaned); empty or over-broad catch blocks; errors logged then
execution continues into invalid state; swallowed exceptions in telemetry (this repo's own
`touchLastSeen` incident — a guard that hides its own breakage — is documented in CLAUDE.md).

**6b. React/Next component layer:** conditional hooks; incomplete `useEffect` deps; missing effect
cleanup → setState-after-unmount and out-of-order response races; components defined inside
components; index keys on reorderable lists; `"use client"` too high; `useFormStatus` in the same
component as its form; `useOptimistic` on destructive operations; one Suspense boundary gating a
whole page; Suspense without an error boundary; sequential awaited fetches that should be
`Promise.all` (waterfalls).

**6c. App Router caching and server actions (Next 16):** the four cache layers (request
memoization, data cache, full route cache, router cache) invalidated inconsistently — audit every
`revalidatePath`/`revalidateTag` call site for the layer it *doesn't* purge, and the Router Cache
serving stale client-side navigations after a mutation; `use cache` scopes that capture per-user
data (cross-user poisoning); errors thrown after the shell streamed (200-with-broken-page);
per-request logic living in layouts (they don't re-render on navigation); `src/proxy.ts` public
allowlist drift vs the actual route set. **Server-action races, all three classes, on every
action**: (1) double-invocation before pending state disables the control → duplicate rows — the
DB unique constraint is the only real guard, so sweep `schema.prisma` for a `@@unique` behind
every "only one per user" rule and check the P2002 handler exists; (2) read-modify-write without a
transaction or atomic `increment` → lost updates; (3) out-of-order completion of rapid successive
actions clobbering newer state with older results. Server actions are public HTTP endpoints:
every one must re-check auth/ownership itself and Zod-validate everything including IDs.

**6d. Prisma + pgbouncer (transaction pooler):** confirm `?pgbouncer=true` on `DATABASE_URL` and
that no runtime path ever touches `DIRECT_URL` (session pool ≈ 15 connections); session-level
features that silently break through a transaction pooler (`SET`, advisory locks, LISTEN/NOTIFY);
interactive `$transaction`s holding pooled connections — check every multi-step transaction
against the 5s default timeout and for partial-write handling; **the connection budget math**:
max concurrent Vercel instances × Prisma `connection_limit` (explicitly set? the default is
num_cpus×2+1 per instance — far too high for serverless) vs the Supavisor cap for the compute
tier — do the arithmetic and put the numbers in the report; multi-table writes without
`$transaction` (post + notification + counter); `onDelete` cascades vs app-level cleanup (orphaned
R2 objects, orphaned notifications); check-then-insert TOCTOU everywhere.

**6e. NextAuth v5 JWT:** audit that EVERY session read compares `credentialVersion` and every
security event bumps it; what is denormalized into the token (name, avatar, role) and where it
goes stale until re-login; cookie 4KB chunking; `maxAge`/`updateAge` interplay (sessions silently
immortal or dying mid-action); credentials flow — timing-safe compare, identical error and timing
for no-such-user vs wrong-password, rate limiting on authorize, email case/unicode normalization
consistent between signup and login (can one address register twice?); deleted/blocked user's
still-valid JWT window.

**6f. Vercel limits (audit against exact numbers):** 4.5MB request/response body hard cap — every
upload must be presigned-direct, and any `FormData` action that could receive a file inherits the
cap; 60s default duration ceiling — any action looping over rows, sending emails, or processing
images; nothing runs after the response without `after()`/`waitUntil` — find every fire-and-forget;
module-scope init multiplying cold starts; burst concurrency exhausting the DB pool (see 6d);
the build itself opening DB connections during static generation.

**6g. R2/uploads:** **1 write/second per object key** — rapid avatar re-upload to the same key
429s; `pub-*.r2.dev` is throttled and explicitly not for production traffic — flag it for the
2,000-user target (a custom domain is already planned; make the report say whether it's now
blocking); presigned-URL edge cases (header/Content-Type mismatch → 403, expiry vs slow uploads,
client uploading different bytes than validated — server must re-verify);
orphaned objects when presign succeeds but the DB write fails or the user abandons; delete-path
ordering (DB row gone but `delImage` failed, and vice versa); Sharp on malformed/EXIF-rotated/
animated/decompression-bomb inputs; the demo's upload story.

**6h. Input edge cases — the six-value rule on EVERY input:** empty, one, exactly-at-limit,
limit+1, negative/invalid, unicode-hostile. Strings additionally get: whitespace-only, 100k chars,
emoji ZWJ sequences, combining characters, RTL overrides, `O'Brien`, HTML/JS payloads, and the
naughty-strings file. Numbers: 0, -1, MAX_SAFE_INTEGER, NaN from `Number(input)`. Pagination:
empty, exactly one page, page-size+1, cursor at a deleted row, page beyond end, concurrent insert
mid-pagination. **Dates: the server is UTC, the members are IST (+5:30) — every "today", day
boundary, streak, digest window, and relative timestamp computed server-side shifts by 5:30; this
class is almost certainly present somewhere and it is exactly the audit's job to find where.**
Identity states: deleted user referenced by live posts/comments/notifications; blocked user's
content in feeds/search/mentions; account deleted mid-session; two tabs, two devices; brand-new
user with nothing — every empty state on every list surface.

**6i. Concurrency and jobs:** double-submit on every form (pending-disable is UI courtesy, not a
guard); two surfaces mutating the same row (profile edit vs admin action, like vs unlike racing);
`map(async …)` with ordering assumptions; crons (`/api/catchups/tick`, `/api/retention/sweep`,
`/api/demo/reset`) — overlapping runs, idempotency on double-fire, partial failure mid-sweep;
webhooks (Razorpay, Resend) — replay, out-of-order delivery, duplicate delivery, signature-check
failure paths; transactions held across network calls (R2, email) pinning pooled connections.

**6j. Scale to 2,000 users (the owner's explicit headroom target):** every `findMany` without
`take`; offset pagination on feeds (slow at depth + skips/duplicates under concurrent inserts —
the roadmap says keyset, verify it shipped everywhere); N+1 — grep every loop body for `prisma.`;
`@@index` coverage in `schema.prisma` against actual query shapes (every `where`/`orderBy`/FK-join
column, composite indexes ordered high-cardinality-first) — list every missing index as its own
finding; over-fetching (no `select` on rows with big text columns feeding list views); identical
cross-user work not cached, per-user data accidentally cached shared; O(n-users) loops inside a
request (notification fanout, catch-up issue emails) — must be batched; third-party quotas under
load (Resend, Turnstile, Sentry during an error storm, Upstash); and a written **load-test plan**
(k6: smoke → average → spike 0→200 concurrent, since 2,000 registered ≈ tens-to-low-hundreds
concurrent → 30-60min soak watching Supabase connection count, with `http_req_failed<1%`,
`p95<500ms` thresholds) for the fix session to run against a preview deployment — designing it is
in scope, running it against the shared production DB is not.

**6k. Chaos-lite thought experiments (argue from code, or prove with the test account where
safe):** DB slow/down mid-request — does the member see something actionable?; R2 returns
500/429; email provider down mid-signup (can the user ever verify?); session expires mid-form
(is the half-written letter lost?); Turnstile unreachable; Sentry quota exhausted; the cron fired
twice; a webhook arrived twice.

## 7. How to run the audit

**Phase 0 — orient.** Read CLAUDE.md, AGENTS.md, `docs/planning/bugs.md`, the pipeline document in
`assets/`, and skim every spec. Start the dev server if it isn't running; authenticate the browser
MCP; verify `npm run check` and `npm run visual` are green so you audit a known state (if they're
red from someone else's in-progress work, note it and audit around it). Run `npm run verify:crawl`
for a console-error baseline across every route. Then do the Glasswing ranking: score every file in
`src/` for bug-likelihood (write-paths, concurrency, date math, money, auth > static display) and
partition territories by it.

**Phase 1 — fan out.** This session has workflow orchestration enabled (the ultracode marker at
the top is deliberate): use the Workflow tool and/or parallel agents at whatever scale the job
deserves — the default size guideline is waived; the owner explicitly authorized however many
agents and however long it takes. **Granularity is your decision**; the owner deliberately refused
to make it. Write one sentence in the report on why you chose the decomposition you chose.
Coverage must be total — every file belongs to some agent, and the cross-cutting lenses (races,
caching, dates/IST, connection budget, silent failures, the 2,000-user sweep, live input fuzzing
through the browser) must not fall between territorial cracks: give lenses their own agents.

Every brief carries: the owner's intent (section 1) nearly whole, the taxonomy slices for its
charter, the shared-database rule from section 4, the finding format from section 8, and the
instruction that the taxonomy is a floor. Investigator agents are read-only; only you, through the
single test account, do live write reproductions.

**Phase 2 — validate like Anthropic does.** Every candidate finding gets an **independent
validation agent** whose only job is to try to refute it with fresh eyes ("if you are not certain
the issue is real, do not confirm it"). Where live confirmation is safe (read-only, or test-account
writes), do it and capture the evidence: the console error, the duplicate row, the 429, the
screenshot, the stale render. Findings that survive validation are **Confirmed**; plausible ones
that can't be safely proven are **Suspected** and say exactly what proof would settle them. Filter
out the noise classes: already in `bugs.md` or the security audit board, pedantic nitpicks,
linter-catchable, style. Then run a completeness critic — which taxonomy row produced zero
findings and was that verified-clean or just unexamined? — and send follow-up agents until two
consecutive rounds surface nothing new.

**Phase 3 — the report.** Write it, clean up every trace of the test account and its data, commit
the report, log the session in `progress.md`.

## 8. The deliverable

`docs/audit-fix/<yyyy-mm-dd>-bug-audit-N/bug-report-N.md` (plus appendices under `docs/audit-fix/<yyyy-mm-dd>-bug-audit-N/work/` where needed).
Structure:

1. **Executive summary** in plain language the owner (non-technical) can read: is this app ready
   for the public, what are the five scariest things found, and what does 2,000-user headroom
   actually look like after the connection-budget math.
2. **Phased fix plan**: findings grouped into phases a fix session can execute top-to-bottom —
   ordered by severity and by dependency (state which phases are independent). This mirrors how
   the owner ran his security remediation: phases he can feed to sessions one at a time or hand to
   one long session.
3. **Findings**, each with: stable ID (B-001…); title; severity (Critical: data loss/corruption,
   crash-for-everyone, hard-down at load / High: wrong behavior a member will hit / Medium: edge
   case or degradation / Low: cosmetic-with-teeth); status **Confirmed** (with the captured
   evidence and exact reproduction steps) or **Suspected** (with the code-level argument and the
   proof that would settle it); file:line references; expected vs actual; the concrete fix
   direction (enough to execute without re-analysis, without dictating implementation); which gate
   or new test should pin it fixed.
4. **The 2,000-user dossier**: the connection-budget arithmetic with real numbers, the missing-
   index list, the unbounded-query list, the fanout list, the r2.dev question, and the ready-to-run
   k6 load-test plan for a preview deployment.
5. **Verified-clean map**: taxonomy rows and territories that were examined and came back clean —
   so the fix sessions and future audits know what was actually checked, not just what was found.
6. **Coverage map**: which agent covered what, what was consciously left out and why.

**Done means**: every taxonomy row in section 6 was applied across the whole surface; every
finding is validated per Phase 2 with orchestrator-verified evidence; naughty strings went through
every text input; the crawl baseline is explained; two consecutive completeness rounds came back
dry; all test data is cleaned up; the report is committed; `progress.md` is updated; the working
tree holds nothing else of yours.

---

*Methodology sources appended per the owner's request: Anthropic's production code-review pipeline
and pr-review-toolkit agents (anthropics/claude-code), Anthropic's security-review action (its
DoS exclusion re-included here since stability is the point), Project Glasswing's
hypothesize→execute→confirm scaffold, Dimillian's bug-hunt-swarm and review-swarm,
awesome-skills/code-review-skill, Sentry's find-bugs and code-review skills, obra/superpowers,
minimaxir/big-list-of-naughty-strings, kdeldycke/awesome-falsehood, Prisma+pgbouncer and Supabase
connection-management docs, Vercel function-limit docs, Cloudflare R2 limits doc, next-auth issues
#9183/#11782/#8788, the Next.js four-cache-layer literature, k6 load-testing methodology, and the
fault-localization research line (AgentFL, MemFL, FLAME, CONCUR).*

## Standing session rules (owner, 2026-08-25 — these apply to every run of this prompt)

1. **Crash-safe by construction.** The session may die abruptly (usage limits or anything
   else). Every agent writes its own report to disk BEFORE returning; the orchestrator
   keeps a `task_plan.md` with a resume protocol, updated per phase, so a fresh session
   that hears "continue" picks up without redoing anything. Fan-outs run in WAVES (~6
   agents) with a stop-if-the-whole-wave-failed guard and a done-list so relaunches skip
   reports already on disk — a usage cutoff kills every in-flight agent at once, so one
   big parallel batch can lose everything (it did once: ~1.8M tokens, nothing on disk).
2. **Usage discipline.** Quality is the priority and is never traded away — but where a
   slower or cheaper route gives the same thoroughness, take it. No preventable retries,
   no re-derivation, no agent doing what a grep answers, and verification sized to the
   evidence (cluster verifiers over one-per-item where the claim class allows it).
3. **Artifacts.** Everything lands under `docs/audit-fix/<yyyy-mm-dd>-<name>/`: the
   report at the top level, the working mess (plans, raw tool output, agent reports,
   verdicts) under `work/`. Prepare `fix-prompt.md` beside the report as the fix
   campaign's living handover, and add the audit's row to `docs/audit-fix/README.md`
   in the closing commit.
4. **Scratch discipline.** Anything created only to answer a question this session dies
   before the closing commit unless it earns its ledger line; repo bloat — leftover
   scripts, stale docs, screenshot piles, the root directory — is in scope for every
   audit, not just the code.
