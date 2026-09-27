# Bug audit 3 — the brief every finder carries (2026-09-24)

You are one investigator in a fleet. This is the THIRD formal pre-release bug and stability audit of
this codebase (audit 1 closed 2026-08-21, audit 2 closed 2026-08-25 with 203 findings; 706 commits
have landed since). Your charter — the territory or the lens that is yours — is in the message that
pointed you here. Everything in THIS file applies to every agent.

**This session is audit-only. You find, you confirm, you document. You do not fix.** Not one line of
application code, config, schema, test or documentation changes. The ONLY file you write is your own
report under `docs/audit-fix/2026-09-24-bug-audit-3/work/reports/<your-id>.md` (plus scratch under
`/tmp`, deleted by the command that made it).

---

## 1. The owner's brief, in his own words (this is the spec — read it as such)

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

And, from the same owner on how AI should brief AI, which binds how you were briefed and how you
should think:

- **Verbose is good.** "When you're conveying everything — all your ideas, all your fears,
  emotions — it captures it better." So this brief is long on purpose, and your report may be too:
  a finding that explains itself completely is worth ten that need re-deriving.
- **Do not box yourself in.** "If I just needed one solution, then it's fine to be direct. But we
  don't know what we want, so we need a level of creativity." The taxonomy in §5 is a FLOOR, never a
  ceiling. The bug nobody listed is the one this audit exists to catch. Hunt.
- **Decisions belong to whoever is doing the work.** The owner refused to dictate granularity to
  the orchestrator; the orchestrator extends the same courtesy to you: how you read your territory,
  what you read first, when a hypothesis is worth chasing — yours to judge.

There is no time limit. "If this takes ten hours he would be happy, because it means that much more
effort went into finding things." Depth and correctness are the only measures. Do not pad; do not
cut a corner to finish sooner.

## 2. What this codebase is

- A Next.js 16 alumni network for Rishi Valley school. App Router; Server Actions for all mutations
  (API routes only for auth/webhooks/uploads/crons/presence); Tailwind v4; Prisma 7 via the `pg`
  adapter on Supabase Postgres (Mumbai); NextAuth v5 beta (JWT sessions, email+password,
  `credentialVersion` revocation, ABSOLUTE 90-day cookie); images and audio on Cloudflare R2 through
  `src/lib/storage.ts` (presigned direct uploads); Resend for mail (queued, 100/day free tier);
  Upstash for rate limiting (fails open); Razorpay for donations; Sentry (server-only) + PostHog
  (proxied via /ingest); deployed on Vercel Hobby, region bom1, `vercel.json` has two crons
  (`/api/catchups/tick` 02:00 UTC, `/api/demo/reset` 20:00 UTC, BOTH fire on BOTH Vercel projects);
  GitHub Actions run backup (20:30 UTC), retention sweep (21:00 UTC, curl with CRON_SECRET) and the
  metric snapshot (00:10 UTC).
- ~207,000 lines of TS/TSX outside `src/generated`, of which ~65,000 are `/lab` dev rooms (out of
  scope except `src/app/lab/actions.ts` and the admin gate in `src/app/lab/layout.tsx`). 22 server
  action files, 18 API routes, 41 tables. Schema: `prisma/schema.prisma` (1,750 lines, every column
  argued for in a comment — READ the comments, they say what the code promises).
- Live database at the start of this audit: 118 MB, PostgreSQL 17.6, `max_connections` = 60, 221
  users, 1,960 Collection photos, 2,053 visits, 430 notifications, 141 Catch-up entries, 25 posts,
  28 comments. Pool in `src/lib/prisma.ts`: `max: 5` per instance, `connectionTimeoutMillis: 5000`,
  `query_timeout: 20000`.
- Gates at start: `npm run check` GREEN (TypeScript, ESLint, protocol, 65 lab routes, 130/130 unit
  tests, deps, security board). So anything you find is something the gates do not catch.
- **THE ONE DANGEROUS FACT — read twice**: local dev and production share ONE Supabase database.
  There is no staging database. The database holds real roster data and real member rows.
- **The demo** is a second deployment with its own database and a three-layer default-deny write
  system (`src/proxy.ts` → per-action `IS_DEMO` guards → `demoWriteAllowed` in `src/lib/prisma.ts`).
  The public demo is KNOWN to 500 on every data route and the owner has deferred it: do not spend
  time on the demo deployment's brokenness, but the demo's code paths in THIS repo are in scope.

**Read before your territory** (`docs/spec/<area>.md` for what you touch — admin, avatars,
catchups, demo, directory, letters, media, profile — plus `docs/planning/catchups-rework/architecture.md`
for Catch-ups and `docs/planning/collection-rework/` + `docs/planning/class-collection/spec.md` for
the Collection). `CLAUDE.md` and `AGENTS.md` bind you. `docs/TRAPS.md` (463 lines) is the list of
things this stack has already done to somebody — every entry is a settled fact, and a bug that
contradicts one is a bug worth double-checking.

## 3. Hard rules for you, the investigator

1. **Read-only.** No edits anywhere except your report. No `git` mutations of any kind. No
   `git stash`/`checkout`/`reset`/`clean` — other sessions share this working tree.
2. **Do not run `npm run check`, `npm run visual`, `npm run verify:crawl`, Playwright, or any
   browser.** The full gates OOM when two run at once (TRAPS "Working here"), and the orchestrator
   owns the browser. You MAY run `node --test <one-file>` on a specific `*.test.mjs` to understand
   what a test actually asserts, and `npx tsc --noEmit` is unnecessary (it is green).
3. **The database: SELECT only.** `node scripts/dev/run-sql.mjs --inline "SELECT ..."` and
   `EXPLAIN (ANALYZE, BUFFERS) SELECT ...` against the shared database are allowed and encouraged
   for confirming a fact (does this index exist, does this query use it, how many rows). NOTHING
   that writes: no INSERT/UPDATE/DELETE, no BEGIN…ROLLBACK experiments, no DDL. Never sign in to
   the app, never call `/api/dev-login`, never drive the dev server with a cookie: signing in
   writes presence and login telemetry against real rows. Plain `curl` GETs of PUBLIC routes on
   `http://localhost:3000` are fine (it is running; do not restart it, it is not yours).
4. **Scratch dies with the command that made it.** Anything under `/tmp` only, deleted in the same
   command. Never add a file to the repo root or anywhere but your report path.
5. **Do not re-report what is known.** Read `docs/audit-fix/2026-09-24-bug-audit-3/work/dedup-baseline.md`
   first (bugs.md open items, TRAPS, audit 2's 203 titles, refactor audit 2's behaviour-touching
   rows). If something on that list is NOT actually fixed, or was fixed wrongly, or has regressed
   since, that IS a finding — say so and cite the ledger row.
6. **Write your report to disk incrementally.** The session that spawned you may die abruptly
   (usage cut-off kills every in-flight agent at once; it has happened, ~1.8M tokens lost with
   nothing on disk). Create the report file early, append each finding as you confirm it, and keep
   a `## Coverage` section current. Your final chat message is a SHORT summary (counts, the three
   scariest things, anything blocked); the file is the deliverable.

## 4. Method — how to hunt

The single most transferable technique from the research the owner asked for is Anthropic's own
vulnerability-hunting scaffold (Project Glasswing, 500+ real bugs): **hypothesize from code → try to
confirm or reject against the actual code, tests, schema and (read-only) database → output either a
negative result or a finding with the proof plan.** Structure your work as comprehension →
navigation → confirmation. Concretely:

1. **Comprehension.** Read the spec for your area, then the schema comments for its tables, then
   the main file(s) end to end. Build the model of what the code PROMISES (the comments say it) and
   what the data invariants are (uniques, cascades, CHECKs, the "exactly one of" rules).
2. **Navigation.** For every write path in your territory, walk it from the entry (form field,
   search param, route param, webhook body) to the row. For every read path, walk it from the query
   to the pixel. Grep for callers, not names (TRAPS: "a function that sounds like the thing you are
   looking for is not evidence that it is").
3. **Confirmation.** A finding needs the exact lines quoted, the mechanism, AND the consequence a
   member would see. TRAPS: "a report can be right about the mechanism and wrong about the
   consequence — verify the scenario, not just the mechanism." Before writing a finding, try to
   refute it yourself: is it handled elsewhere? Is there a test? Does the unique constraint save it?
   Is the state unreachable? State your confidence honestly.
4. **Negative results are deliverables.** The report needs a "verified clean" map so the fix
   session and the next audit know what was actually checked, not just what was found. List
   specific checks that came back clean ("every heart toggle in T1 uses delete-first + P2002 retry:
   post-card:412, comments-section:388, …").
5. **Leads across the fence.** Anything you notice outside your charter goes in a `## Leads for
   other territories` section with the file:line — the orchestrator routes it. Do not chase it
   yourself unless it is on the path of your own confirmation.

**Apply ALL of these lenses, not the best of them** (the owner's instruction). Read what you need
of each — they are on disk:

- `.claude/skills/find-bugs/SKILL.md` — Sentry's phased method (input gathering → attack-surface
  map → checklist → verification → pre-conclusion audit). Written for diffs; apply its lenses to
  your whole territory, and do its Phase 5 pre-conclusion audit honestly (list every file you read
  completely, every checklist item, every area you could NOT verify).
- `.claude/skills/code-review-skill/reference/common-bugs-checklist.md`, `reference/typescript.md`,
  `reference/react.md`, `reference/cross-cutting/` (async/concurrency, error handling, N+1,
  injection; some deep-dives are in Chinese — read them anyway).
- `.claude/agents/silent-failure-hunter.md` — interrogate EVERY catch block, fallback and error path
  you meet: is the failure surfaced to a human or a log that is read? Does execution continue into
  an invalid state? A guard that hides its own breakage is worse than no guard (CLAUDE.md, the
  `touchLastSeen` incident).
- `.claude/agents/comment-analyzer.md` — a comment that lies about the code IS bug evidence: the
  code drifted from its own contract. Audit 2 turned five of these into real findings.
- `.claude/agents/write-path-reviewer.md` — the repo's own four write-path invariants and the
  demo's three layers; apply to every action and route you touch.
- `.claude/skills/VibeSec-Skill/` — mass assignment, validation gaps, IDOR (security proper was
  audited on 2026-08-20; stability, DoS and resource exhaustion — which security audits exclude —
  are squarely in scope here).
- `docs/audit-fix/2026-08-22-bug-audit-2/work/audit-assets/blns.txt` — the naughty strings; for
  any text input you meet, reason about what each class does to it (the orchestrator runs the live
  pass; you tell it which inputs and which payloads matter).
- github.com/kdeldycke/awesome-falsehood taxonomies (time, names, emails, addresses, phone numbers)
  — use them as input designs where they fit.

## 5. The master taxonomy — every row applied across your whole territory (the floor)

**6a. Universal correctness:** off-by-one in loops/slices/pagination; boundary values (0, 1, max,
max+1, negative); boolean-logic inversions; missing null/undefined handling and optional chaining
that silently hides real failures; **missing `await`** (fire-and-forget writes); unhandled promise
rejections; `Promise.all` where one rejection shouldn't abort siblings; stale closures; collection
modified during iteration; `parseInt` without radix; float equality; resource leaks (listeners,
timers, subscriptions never cleaned); empty or over-broad catch blocks; errors logged then execution
continues into invalid state; swallowed exceptions in telemetry.

**6b. React/Next component layer:** conditional hooks; incomplete `useEffect` deps; missing effect
cleanup → setState-after-unmount and out-of-order response races; components defined inside
components; index keys on reorderable lists; `"use client"` too high; `useFormStatus` in the same
component as its form; `useOptimistic` on destructive operations; one Suspense boundary gating a
whole page; Suspense without an error boundary; sequential awaited fetches that should be
`Promise.all` (waterfalls).

**6c. App Router caching and server actions (Next 16):** the four cache layers (request
memoization, data cache, full route cache, router cache) invalidated inconsistently — audit every
`revalidatePath`/`revalidateTag` call site for the layer it doesn't purge, and the Router Cache
serving stale client-side navigations after a mutation; `use cache` scopes that capture per-user
data (cross-user poisoning); errors thrown after the shell streamed (200-with-broken-page);
per-request logic living in layouts (they don't re-render on navigation); `src/proxy.ts` public
allowlist drift vs the actual route set. **Server-action races, all three classes, on every
action**: (1) double-invocation before pending state disables the control → duplicate rows — the DB
unique constraint is the only real guard, so sweep `schema.prisma` for a `@@unique` behind every
"only one per user" rule and check the P2002 handler exists; (2) read-modify-write without a
transaction or atomic `increment` → lost updates; (3) out-of-order completion of rapid successive
actions clobbering newer state with older results. Server actions are public HTTP endpoints: every
one must re-check auth/ownership itself and Zod-validate everything including IDs.

**6d. Prisma + pgbouncer (transaction pooler):** confirm `?pgbouncer=true` on `DATABASE_URL` and
that no runtime path ever touches `DIRECT_URL`; session-level features that silently break through
a transaction pooler (`SET`, advisory locks, LISTEN/NOTIFY, prepared statements, temp tables);
interactive `$transaction`s holding pooled connections — check every multi-step transaction against
the 5s default timeout and for partial-write handling; the connection budget math (Vercel
concurrency × pool `max` vs Supavisor's pool to a Postgres whose `max_connections` is 60);
multi-table writes without `$transaction` (post + notification + counter); `onDelete` cascades vs
app-level cleanup (orphaned R2 objects, orphaned notifications); check-then-insert TOCTOU
everywhere.

**6e. NextAuth v5 JWT:** every session read compares `credentialVersion` and every security event
bumps it; what is denormalized into the token (name, avatar, role) and where it goes stale until
re-login; cookie 4KB chunking; `maxAge`/`updateAge` interplay; credentials flow — timing-safe
compare, identical error and timing for no-such-user vs wrong-password, rate limiting on authorize,
email case/unicode normalization consistent between signup and login; deleted/blocked user's
still-valid JWT window.

**6f. Vercel limits (audit against exact numbers):** 4.5MB request/response body hard cap — every
upload must be presigned-direct, and any `FormData` action that could receive a file inherits the
cap; function duration ceiling (Hobby: 10s default, 60s max with `maxDuration`; find every route
and action that loops over rows, sends mail or processes images and check what `maxDuration` it
exports, if any); nothing runs after the response without `after()`/`waitUntil` — find every
fire-and-forget; module-scope init multiplying cold starts; burst concurrency exhausting the DB
pool; the build itself opening DB connections during static generation.

**6g. R2/uploads:** 1 write/second per object key; `pub-*.r2.dev` throttling (the custom domain
`images.rishivalley.space` shipped 2026-08-21 — check nothing still writes or reads the old host
where it matters); presigned-URL edge cases (header/Content-Type mismatch → 403, expiry vs slow
uploads, client uploading different bytes than validated — server must re-verify); orphaned objects
when presign succeeds but the DB write fails or the user abandons; delete-path ordering (DB row gone
but `delImage` failed, and vice versa); Sharp on malformed/EXIF-rotated/animated/decompression-bomb
inputs; the new AUDIO path (`/api/upload/audio`, 2026-09-14) and the new `Photo.screenUrl`
(2026-09-23) in every deleter; the demo's upload story.

**6h. Input edge cases — the six-value rule on EVERY input:** empty, one, exactly-at-limit, limit+1,
negative/invalid, unicode-hostile. Strings additionally: whitespace-only, 100k chars, emoji ZWJ
sequences, combining characters, RTL overrides, `O'Brien`, HTML/JS payloads, the naughty-strings
file. Numbers: 0, -1, MAX_SAFE_INTEGER, NaN from `Number(input)`. Pagination: empty, exactly one
page, page-size+1, cursor at a deleted row, page beyond end, concurrent insert mid-pagination.
**Dates: the server is UTC, the members are IST (+5:30) — every "today", day boundary, streak,
digest window, deadline (Catch-up deadlines "land on a civil hour, 07:00 IST" since 2026-09-08; a
time capsule opens "a year on at 07:00 IST"), and relative timestamp computed server-side shifts by
5:30; this class is almost certainly present somewhere and it is exactly the audit's job to find
where.** Identity states: deleted user referenced by live posts/comments/notifications/entries;
blocked user's content in feeds/search/mentions/Catch-ups; deletion-requested user; unverified user;
teacher (no batch year!) on every batch-keyed surface; account deleted mid-session; two tabs, two
devices; brand-new user with nothing — every empty state on every list surface.

**6i. Concurrency and jobs:** double-submit on every form (pending-disable is UI courtesy, not a
guard); two surfaces mutating the same row (profile edit vs admin action, like vs unlike racing,
Keeper vs Keeper); `map(async …)` with ordering assumptions; crons (`/api/catchups/tick`,
`/api/retention/sweep`, `/api/demo/reset`, the snapshot, the backup) — overlapping runs,
idempotency on double-fire, partial failure mid-sweep, the run that lands on the same minute;
webhooks (Razorpay, Resend) — replay, out-of-order delivery, duplicate delivery, signature-check
failure paths; transactions held across network calls (R2, email, Spotify/YouTube/link fetch)
pinning pooled connections; the mail queue's lease.

**6j. Scale to 2,000 users (the owner's explicit headroom target):** every `findMany` without
`take`; offset pagination on feeds (verify keyset shipped everywhere); N+1 — grep every loop body
for `prisma.`; `@@index` coverage in `schema.prisma` against actual query shapes (every
`where`/`orderBy`/FK-join column; composite indexes ordered high-cardinality-first) — list every
missing index as its own finding, with the EXPLAIN if you ran one; over-fetching (no `select` on rows
with big text columns feeding list views); identical cross-user work not cached, per-user data
accidentally cached shared; O(n-users) loops inside a request (notification fanout, Catch-up
reminders, batch Catch-up creation) — must be batched; third-party quotas under load (Resend 100/day,
Turnstile, Sentry during an error storm, Upstash free command quota, PostHog); unbounded tables
(Visit, ContentView, SearchLog, LoginAttempt, AuditLog, LinkPreview, PendingImagePurge) vs the
retention sweep.

**6k. Chaos-lite thought experiments (argue from code):** DB slow/down mid-request — does the member
see something actionable?; R2 returns 500/429; email provider down mid-signup (can the user ever
verify?); session expires mid-form (is the half-written letter or Catch-up answer lost?); Turnstile
unreachable; Sentry quota exhausted; the cron fired twice; a webhook arrived twice; a link preview
target hangs; the Spotify/YouTube oEmbed changes shape.

## 6. Your report — the exact shape

File: `docs/audit-fix/2026-09-24-bug-audit-3/work/reports/<your-id>.md`. Create it FIRST with the
header and empty sections, then fill it in as you go.

```
# <your-id> — <territory or lens name>
Agent: <your-id> · Started: <time> · Model: <model>
Charter: <one paragraph, in your words, of what you took responsibility for>

## Findings

### <your-id>-01 — <one-line title that names the consequence, not the mechanism>
- Severity: Critical | High | Medium | Low
    (Critical: data loss/corruption, crash-for-everyone, hard-down at load / High: wrong behavior a
     member will hit / Medium: edge case or degradation / Low: cosmetic-with-teeth)
- Confidence: certain | likely | possible   (and one line on what would change your mind)
- Where: `path/file.ts:line` — every location involved, exact line numbers
- Taxonomy: 6c(1) | 6h dates | ... (the rows it belongs to)
- Expected: what the code, the spec or the comment promises
- Actual: what happens, in the member's terms
- Why: the code-level argument, QUOTING the exact lines; the data state that triggers it
- Proof: how the orchestrator can prove it read-only or with the throwaway test account, OR the
  test that would fail today. If it cannot be safely proven live, say "argue-only" and why.
- Fix direction: enough to execute without re-analysis, without dictating the implementation
- Gate: the test or gate that should pin it fixed
- Known-related: any dedup-baseline row it touches (and why this is not that)

## Verified clean
- <specific check> — <files/lines> — <why it holds>
(as many as you actually did; these are deliverables, not filler)

## Leads for other territories
- <territory/lens> — <file:line> — <one sentence>

## Inputs for the live naughty-strings pass
- <input surface> — <where it lands: column, render path> — <which payload classes matter and why>

## Coverage
- Read completely: <files>
- Skimmed: <files> (why)
- Not read: <files> (why)
- Taxonomy rows applied with zero findings and genuinely verified clean: <list>
- Taxonomy rows NOT applied or not applicable here: <list>
- Could not verify: <what, and what would settle it>
```

Severity is about the member and the owner, not the code. A one-character typo that publishes an
unverified account's post to the whole feed is High; a race that needs two Keepers on two tabs in the
same second is Medium; a comment that lies is Low unless the lie has already misled a fix.

## 7. The fleet — who owns what (so your leads find their owner)

Territories: T1 feed-posts-letters-comments · T2a catchups-lifecycle (server: actions, core, tick,
notify, batch, succession, capsule) · T2b catchups-answers (entries, votes, voice+audio upload, link
previews, comments-on-answers, export) · T3 catchups-surfaces (pages + components + magazine) · T4a
collection-pipeline (server: actions, image libs, upload routes, storage, download, backfill/import
scripts) · T4b collection-surfaces (components: river, viewer, contribute room, rail, back-closes) ·
T5 auth-email-tokens · T6 people-profile-directory (profile, settings, onboarding, directory, places,
avatars, export) · T7a admin-purge-retention (admin pages/actions, purge, retention sweep, roster,
review room) · T7b analytics-presence-messages (analytics, presence, search log, admin threads,
notifications, bell, snapshot) · T8a money-demo (support, Razorpay, contributions, demo layers, demo
reset) · T8b shell-common-config (proxy, layouts, error/not-found/forbidden, layout + common + ui +
landing + guide + pwa components, config, instrumentation, lab gate) · T9 mascot.

Lenses (whole-codebase, one question each): L1 races-mutations · L2 caching-rendering-routes · L3
dates-ist · L4 silent-failures · L5 scale-2k-and-connection-budget · L6 input-validation ·
L7 client-react · L8 platform-limits · L9 test-quality-and-comment-lies · L10 identity-states-
empty-states-chaos · L11 jobs-webhooks-queues · L12 write-path-invariants.

If your charter is a territory, the lenses will ALSO sweep your files with their one question; you
still apply every taxonomy row yourself — overlap is deliberate (several independent reviewers whose
verdicts are aggregated beat one big reviewer). If your charter is a lens, the territory agents know
their areas better than you; your value is the question nobody in a territory is asking across the
whole codebase at once.
