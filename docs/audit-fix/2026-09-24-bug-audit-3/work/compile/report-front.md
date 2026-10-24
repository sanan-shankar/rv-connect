# Pre-release bug & stability audit — round 3

- **Scope:** the whole application. The finders read it at `495ecdd2` (2026-09-24); the audit was paused
  on 2026-09-27 and finished on 2026-10-23/24, when every finding was re-checked against the code as it
  stood then (`88642426`, and `36ed27d3` for the last rounds). 113 commits had landed in between;
  `work/rebaseline.md` lists them. Line numbers below are today's.
- **Audit-only.** No application code, config, schema or test was changed by this audit.
- **Method:** 13 area finders and 12 cross-cutting lenses (read-only), an adversarial validator per zone
  whose only job was to refute, a drift checker that re-ruled every finding confirmed before the pause,
  four completeness rounds (nine critics), the orchestrator's own checks at source and live, and a live pass as a
  throwaway member through every input an unconfirmed member can reach. `work/report-draft-method.md`
  and `work/report-draft-live.md` hold the detail; section 6 is the coverage map.
- **Finding ids** are the finders' own (`T4a-01`, `L10-01`, `C3-01` …), not renumbered: they are already
  stable across 40 reports, 17 verdict files and the ledger, and a new numbering would break every one
  of those references. `work/ledger-final.json` is the machine-readable ledger.

## 1. Executive summary

**Recorded:** __TOTAL__ findings. **Closed during the audit:** __CLOSED__ (fixed by other work since the
audit read the code: __FIXED__; made obsolete by a rewrite: __MOOT__; disproved by a validator: __REFUTED__;
duplicates: __DUP__; already known: __KNOWN__; declined by you: 1). **Open:** __OPEN__ — **__H__ High,
__M__ Medium, __L__ Low, and no Critical.** Every open finding but nine was attacked by a validator whose job was
to disprove it, and the survivors carry corrected line numbers. The nine are the last completeness
round's (C8, what happens to things when their owner goes away): the audit closed on your word before a
validator reached them, so they are marked "not adversarially validated" wherever they appear.

**Is the site ready for the public?** It is ready to keep running, and nothing found would take it down
for everyone. Three things should be fixed before more strangers sign up, and all are small: the
office-list check that verifies a stranger as a real classmate, with the Catch-up controls unconfirmed
accounts can press (item 1 below), and the login cookies sent to Sentry (item 2). The rest is a list of things that go wrong for one member at a time, which is what
the fix campaign is for.

**Good news first.** A lot was fixed between the pause and today by other sessions, and the audit
checked each fix rather than taking it on trust: the admin-only lab pages lock themselves (all 25 that
read data, pinned by a test); the photo backup runs green every night since 3 October (the first fix
attempt had failed too; the second worked); every database connection is encrypted and verified, and
Supabase refuses plain ones; a hostile pasted link no longer burns minutes of server time; a slow
database no longer signs members out on a page load; three dead Catch-ups controls work; pages no
longer pre-load in the background (the hidden 18-fold cost the platform work measured); and a corrected
batch year moves the member to the right Catch-up.

**One pattern behind many findings.** Nothing limits what one account, or one script, can spend of
what every member shares: the day's 95 emails, the database's size, Supabase's monthly data, every
member's bell, the free plans' monthly allowances. The limits that exist are per hour or per address; the budgets are
per day or per month. Thirteen findings are instances of that (O-09); they get one design, not thirteen
patches (phase O).

**The five things that matter most**

1. **Anyone can become a verified member, as somebody else** (O-08, High), **and an unconfirmed account
   can run its batch's Catch-up** (L10-01, High). The first: a stranger confirms any throwaway mailbox,
   reads a real classmate's name and batch year off the directory, types them into their own profile,
   and the office-list check verifies them as that classmate at once. Nobody is told, nothing records
   which roster person was matched, and two accounts can both be "the" same alumnus; 81 verified members
   today are ready-made identities to copy. The fix is to auto-verify on an email match only (Q19).
   The second: a batch Catch-up lets
   every member close and publish the Edition early, extend it, open answering or delete questions,
   and none of those buttons checks that the member confirmed their email. Signing up with a batch
   year enrols the account at once. Today 54 unconfirmed accounts sit in 20 batch Catch-ups. Related:
   pressing "Close and send it out" before anyone has answered quietly cuts the week short, and a second
   press publishes an empty Edition to everyone (C3-01). The fix is one check in four places (Phase A).
2. **Every server error sends the member's login cookie and location to Sentry** (T8b-14, High). The
   code and the privacy page say it does not; the installed Sentry version ignores the setting that used
   to stop it. Anyone holding that cookie *is* that member until it expires. Reproduced offline.
   Fix: one filter in the Sentry setup (Phase B), and a look at Sentry's own scrubbing settings (check A).
3. **The Collection loses work** (T4b-03, T4b-01, T4a-01, High). A batch upload with one failure throws
   away the photographs that did upload, captions and all; the photo viewer silently switches to a
   different photograph when the river changes under it; and your own "also add to the Collection"
   tick on a post does nothing, because it counts your 1,740 class photographs against a member's
   quota (Phase E).
4. **Editing a published letter, and Back on a dialog** (T8b-17, T8b-01, High). The edit window is a
   small box with no height limit, so for a typical letter the Save button is off the screen; and
   pressing Back on a dialog that refuses to close (busy, or "discard 40 photographs?") makes the
   *next* Back leave the page and lose the work (Phase F).
5. **The first ceilings on the way to 2,000 members are the free plans' monthly allowances, and abuse
   reaches them first.** You moved production back to Vercel's free Hobby plan on 23 October. Going over
   any Hobby allowance stops that feature for 30 days. Hobby allows 4 hours of server CPU a month; steady
   use measures about 2 at today's 575 members and this week's quiet activity, so a busy month or about
   twice the members crosses it (L5-01, High). Supabase's free 5 GB of data a month is the other one
   (L5-07, High; you deferred that fix until about 1,000 members). A script reaches the Hobby lines far
   sooner: changing a query string on a member photo spends the month's 5,000 image transformations in a
   few thousand requests, after which new photos stop showing for 30 days (C5-01, High), and any page hit
   ten times a second spends a month's million requests in about a day (L8-04, High). Hobby allows one
   firewall rate-limit rule per project (check D). The audit's agents measured on 23 October partly
   before your switch and reasoned about Pro; the Hobby facts here are from Vercel's pages, fetched
   24 October. Section 4 has the numbers.

Also worth knowing: the voice recorder can put back a recording the member removed while it was still
saving, and a double tap during the microphone prompt can leave the microphone open (L7-09); an
anonymous script can fill the newcomers' trivia log, which is kept for a year (C4-01); one person can
spend the whole day's email on password resets (C5-02); changing a query string on any member photo
makes Vercel bill a fresh transformation, so about a million requests would pause the site (C5-01);
and the repository is public, which you have ruled is fine (C1-06), with one consequence you have not
ruled on: the entry question's answers are readable there, and one question accepts any reply
containing "egg" (C5-03, Q18).

## 2. Phased fix plan

Run in the table's order. Each phase is one area, so one worker holds one set of files; Lows ride with
the phase whose files they touch. **A goes first** (it is live today). **B, E and F** carry the other
Highs. **O** is one design (a per-account budget) applied to thirteen doors; it is independent of the
others except G, which shares the mail queue.
C and D both edit the error-reporting helpers (`src/lib/report-error.ts`, the error boundaries): run D
first, or give both to one worker. A and H both edit `src/app/(main)/catchups/actions.ts`: never in
parallel. Every other pair of phases is independent.

| Phase | What | Rows | H / M / L | Owner questions it waits on (only those rows wait) |
|---|---|---:|---|---|
__PHASE_TABLE__

**Rows that must travel together** (one change each; a worker must not split them): L10-01 + V-T2-01
(folded) + T2a-03 + T3-22; C3-01 + T3-06; T4a-01 + V-T1-02 + T1-18 + V-T4a-A (all `collection-intake.ts`);
T8b-01 + T8b-17 + T4b-02 (the Dialog primitive); L7-03 + T9-04 + T8b-07 (lazy-chunk failure and the
missing global boundary); T8b-15 + O-03's residual (L2-03, T1-09, T8a-12); V-O-B + L6-02 (one bidi
strip, every sink); V-O-C + T6-09 (phone trunk zero); L12-02 + V-L-d-01 (Catch-up images never
deleted); L5-02 + L8-04 (one firewall rule, check D); T8b-06 + L11-02 + C4-04 (the privacy page);
T7b-03 + T3-16 (one migration, one comment set); C4-02 + C4-03 + T5-13 + C5-02 + C6-01 (the
confirmation-mail queue, one worker); C4-01 + C5-03 (the trivia gate, a peer session's code); C5-01 +
L8-04 + L5-02 + L5-11 (the Hobby allowances: one config line and check D); O-09 and its thirteen instances (one budget
design, phase O, applied in G to the three that share G's files). The entries' "Travels with" lines carry the rest.

## 3. Owner section

### 3.1 Questions for you

Each is written the way the fix campaign will ask it, with the answer it takes if you don't reply.
__QUESTIONS__

### 3.2 Things only you can do (checks and switches, not decisions)

- **A. Sentry → Settings → Security & Privacy:** confirm "Data Scrubber" and "Use Default Scrubbers" are
  on, and search stored issues for `authjs`. If a session token was stored, rotating `AUTH_SECRET`
  signs everyone out; that is your call. (rows: T8b-14)
- **B. Vercel → Usage, weekly: Active CPU and Image Transformations.** Hobby since 23 October; the meter is
  the trailing 30 days (it read 4h13m of 4h right after the switch, carrying the pre-fix week), and Vercel
  emails at 75%. `vercel metrics` stops working on Hobby, so the dashboard is the only meter. (rows: L5-01,
  L5-11, C5-01, V-L-c-01)
- **C. Hobby's terms.** Vercel's fair-use rules limit Hobby to non-commercial, personal use; the site takes
  contributions on /support. Your call whether that matters. (Skew Protection, which the audit first
  listed here, is Pro-only, so L8-06 becomes a code row.)
- **D. Vercel → Firewall: add the one rate-limit rule Hobby allows per project** (production and demo).
  Neither has any, and the demo's traffic counts against the same account's allowances. One rule also
  closes the sign-in flood that drains Upstash. (rows: L8-04, L5-02, C5-01)
- **E. Supabase → Organization → Usage → Egress:** this cycle's reading. It is the first limit (section 4);
  the app records nothing about it. (rows: L5-07)
- **F. Sentry → Spike Protection on.** (rows: T5-10, T8b-18)
- **G. Cloudflare → R2:** add a lifecycle rule on `staging/` (the repo records it was never added); and
  check the app's R2 keys reach only the live bucket, not the backup. (rows: T4a-03, L11 lead)
- **H. Resend → Webhooks:** subscribe the webhook to `email.failed` and `email.suppressed`. (rows: L11-05)
- **I. The demo:** confirm `.env.demo` holds no R2 keys (if it does, the photo-import undo could delete
  production photographs); consider pausing the demo's Vercel project, which has not built since
  7 August but still runs two crons and shares the budget; run `npx tsx scripts/demo/verify-guard.mts`
  when it returns. (rows: T4a-06, L8-04, L12)
- **J. Move `sanan's stuff/` out of the project folder.** It holds a plain-text `recovery-codes.txt`
  that every Claude session working in this checkout can read. It is gitignored, so it was never
  published. (C2)
- **K. Supabase → Database → Pooler:** the pool size (a dashboard fact the audit could not read). (L5)

## 4. The 2,000-member dossier

**What breaks first, in order** (corrected at today's code and measurements, `work/verdicts/V-L-c.md`
"Dossier at HEAD"):

1. **Supabase Free egress, 5 GB a month, organisation-wide** (L5-07). Measured at about 60 KB per real
   page view in early October, rising to about 100–110 KB by 2,000 members, because the directory sends
   every placed member's map pin on every render and search step. Where the line is crossed depends on
   how active members are, not only how many there are: about 700 members at launch-week activity
   (3.4 views per member per day), about 1,400 at early-October activity (1.3), about 3,200 at this
   week's (0.37). These are estimates from one measured per-view figure; the Supabase usage page is the
   real number (check E). You deferred the cut on 8 October ("revisit before ~1,000"); about 575 members
   today. Supabase Pro ($25 a month) lifts the line.
2. **Vercel Hobby's 4 hours of Active CPU a month** (L5-01). You moved back to Hobby on 23 October.
   Measured steady use is about 4 minutes a day, about 2 hours a month, at about 575 members and this
   week's quiet activity (0.37 views per member per day; the platform-health re-measure in memory). It
   grows with page views, so a busy month or about twice today's members crosses it, and going over stops
   functions for 30 days. The meter is the trailing 30 days.
3. **Abuse against the Hobby allowances** (O-09's class). Hobby includes 5,000 image transformations,
   1,000,000 CDN requests, 1,000,000 function invocations and 10 GB of Fast Origin Transfer a month,
   shared by every project in the account, the demo included, and a spent allowance stops that feature
   for 30 days. A few thousand query-string variations of one member photo spend the transformations
   (C5-01, L5-11); a script at ten requests a second spends the requests in about a day (L8-04); a
   10-per-second sign-in flood drains Upstash's month in about 7 hours, after which every rate limit is
   off (L5-02). Hobby allows one firewall rate-limit rule per project (check D). The $50 spend cap the
   L8 lens described belonged to Pro and went with it.
4. **Operational, not capacity:** a tab on the previous build after a deploy (L8-06; Skew Protection is
   Pro-only, so this needs a code fix), pool hygiene under Fluid compute (L5-04, L5-05).

**Not what breaks first:** the connection pool (peak 12 of 60 connections; 16 concurrent visits measured
at the busiest moment, roughly 110 at 2,000 members, each statement taking milliseconds); the 500 MB
database line (now an organisation billing quota; the database is 128.5 MB, of which the place list is
101 MB, projected at 170–220 MB at 2,000 members after a year); whole-table counts and missing indexes
(real at 10–100 times today's data, which the community is not producing: in one month comments grew
by 2 and posts by 8).

**The lists** (all in `work/reports/L5.md`, re-ruled in `V-L-c.md`): unbounded reads (§1: the
Collection geometry, the directory pins, Catch-up covers, and the new composer first-names route; their
real cost is egress), missing indexes (§2: `Comment.authorId`, `CatchupEntry.authorId`,
`Notification.link`, `PollOption.postId`, `User.createdAt`, `Visit.startedAt`, `CatchupEntry.audioUrl`;
all latent at measured sizes), fanout (§3: smaller since Editions start by hand), the quota table (§4),
growth projections (§5, overstated 10–100x for member content) and a k6 load-test plan for a *preview*
deployment (§6, with five edits listed in V-L-c: it must use a separate Supabase organisation).
`r2.dev` is settled: every stored image is on `images.rishivalley.space`.

## 5. Verified-clean map

What was examined and came back clean, so the fix sessions and the next audit know what was actually
checked, not just what was found. The full taxonomy table (every row 6a–6k of the audit prompt, which
agent applied it where, and whether it came back clean, with findings, or thin) is in
`work/reports/C2.md`; each report's own `## Verified clean` section lists its clean checks line by line.
The headlines:

- **Clean across the whole codebase:** `map(async …)` ordering (four sites, one known fault); parsing and
  compare arithmetic (radix, float equality, money in paise); collection modified during iteration and
  slice off-by-ones; request waterfalls in production terms (Mumbai region beside the Mumbai database).
- **Auth:** `/api/auth/stale` (no open redirect, CSRF or loop); the email change's authentication, rate
  limits, compare-and-swap and audit row; the session re-reads the address on every request; Stage 2
  and the roster match still require a confirmed address and a verified profile; every lab page that
  reads data checks the admin role, pinned by `gate-coverage.test.mjs`.
- **Catch-ups:** every Edition phase change rings its bell inside the same transaction; two members
  pressing Start make one Edition; every clock-starting action refuses an idle Edition; batch Catch-ups
  still refuse rename, end, add, remove and Keeper changes; the voice answers' server reads and the
  purge of recordings with the account.
- **Scripts:** all 77 scripts' imports resolve and every route they name exists; each script read is
  listed in `C1.md` with what it writes.
- **Mascot core files** unchanged since the audit base; the bird dealt at signup reached all 24 signups
  since its deploy.
- **The root is closed:** 15 tracked config and entry files; `e2e/.shots` is being cleared.

## 6. Coverage map

| Stage | Agents | Output |
|---|---|---|
| Orientation | orchestrator | `work/findings.md` (live fact sheet, vendor limits), `glasswing-ranking.md`, `dedup-baseline.md`, `charters.md` |
| Finders, 13 areas | T1 feed/letters, T2a+T2b Catch-ups engine, T3 Catch-ups UI, T4a+T4b Collection, T5 auth, T6 directory/profile, T7a admin, T7b analytics/notifications, T8a support/payments/demo, T8b shell/primitives/observability, T9 mascot | `work/reports/T*.md` |
| Lenses, 12 | L1 concurrency, L2 caching/routes, L3 dates, L4 silent failures, L5 scale/2k, L6 input validation, L7 client React, L8 platform limits, L9 tests and comment lies, L10 identity states, L11 jobs/webhooks, L12 write-path invariants | `work/reports/L*.md` |
| Orchestrator | own reads and live proofs | `work/reports/O.md`, `work/live/` |
| Validators, 15 zones + drift + rounds | V-T1 … V-T9, V-O-L1, V-L-a … V-L-d, V-DRIFT (re-ruled the zones finished before the pause), V-C, V-R4a, V-R4b (the completeness rounds; C8 was not reached) | `work/verdicts/*.md` |
| Completeness rounds | C1 scripts against the one database; C2 taxonomy critic and repo bloat; C3 the four hottest files; C4 server code written after the audit base; C5 every anonymous surface and the confirmation-mail state machine; C6 what a signed-in member, at each trust stage, can make the server write, send or spend; C7a and C7b every file nobody had read closely (149); C8 what happens to everything when its owner goes away | `work/reports/C*.md` |
| Compile | two writers drafted the High and Medium entries; the orchestrator read them, ruled the disagreements, and wrote the rest | `work/compile/` |

**Models:** the first half of the finders ran on Fable 5.1; from 2026-09-24 07:55 BST everything ran on
Opus 5.5. **Consciously left out:** live writes as a confirmed member (posts, letters, answers): a
confirmed throwaway could not be made without the owner's inbox, and Jerry is not an audit account, so
those paths are argued from code and the entries say so; the demo database (it writes, so
`verify-guard` was not run; check I); dashboards only the owner can read (checks A–K); and the trivia
admin page a peer session was still building on 2026-10-24 (read at `36ed27d3`). **Completeness:**
__ROUNDS__

## 7. Cleanup

The throwaway account "Audit TestBird" was created through the real signup on 2026-09-24 and deleted on
2026-09-25 in one guarded transaction; on 2026-09-27 the orchestrator confirmed nothing remains. The one
thing that cannot be undone is the verification email production sent to the owner's inbox (O-05).
No scratch file of the audit remains outside `work/`; the ledger tools ran from `/tmp` and are gone.

## 8. Findings

The High and Medium entries are written for the fix session to act on. The Lows are a table: each row
names the report block and the verdict to read, and the verdict's corrections win.
