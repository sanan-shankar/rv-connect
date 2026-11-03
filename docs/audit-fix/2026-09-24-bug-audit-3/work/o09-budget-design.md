# O-09: one budget design for what one account or one script may spend

Written 2026-11-03 by track 2, unit O1, for the orchestrator's review **before any other Phase O
instance is closed**. Nothing here is built. C5-01 shipped first, on its own (`c5cac0f4`). This file
lands with the helper once reviewed.

Every number below is argued from a measurement, dated 2026-11-03 unless it says otherwise, taken
read-only from the live database or from Vercel's and Upstash's own pages.

---

## 0. The problem in one table

The bounds the app has are per minute or per hour and per IP or per account. The things they protect
are per day or per month and shared by everyone, the demo included.

| Shared budget | Size | Today | What happens when it is spent |
|---|---|---|---|
| Vercel image transformations | 5,000 / month, whole account | ~1,300 organic (L5-11) | new images show alt text for 30 days |
| Vercel function invocations / CDN requests | 1,000,000 / month each | ~40,000 (225 views a day × ~5.9 server calls) | that feature stops for 30 days |
| Vercel Active CPU | 4 h / month, trailing 30 days | ~2 h | functions stop for up to 30 days |
| Vercel Runtime Cache (Hobby) | 1M read units, 200K write units (8 KB each) / month | unused | cache pauses; reads fall through to Postgres |
| Upstash commands | 500,000 / month | see §1.4 | every limiter in the app fails **open** for the rest of the month (L5-02) |
| Resend mail | 95 / UTC day (`DAILY_CAP`) | 5.8 a day on average, peak 87 (launch) | everyone's confirmations and resets wait for 05:30 IST |
| Supabase egress | 5 GB / month, organisation-wide | ~60 KB a page view | grace period, then restriction of both projects |
| Supabase database | 500 MB (alarm at 350 MB) | 128.5 MB | read-only or 402 |
| Every member's bell | (attention) | 12 bells a day; 52 on one link on the busiest day; 45 into one member's list | the bell stops meaning anything |

Measured per member, per day, over the last 60 days: at most 13 searches logged, 12 comments, 11
Catch-up answers, the Collection opened at most 16 times (p99 7), the directory at most 84 times
(p99 22), 243 distinct page paths at most. At most 4 mails to one address in one day, ever. Resets
peak at 3 a day. 0 letter drafts exist; 8 link previews exist. 594 members, 308 active in 30 days.

## 1. The helper

### 1.1 Shape

A new `src/lib/daily-budget.ts` beside `rate-limit.ts`, not inside it, because it has a second kind of
storage that `rate-limit.ts` must not import (Prisma).

```ts
export type BudgetName = keyof typeof BUDGETS;

/** Spend `cost` of a daily budget for `subject`. Never throws. */
export async function spendBudget(
  name: BudgetName,
  subject: string,
  cost = 1,
): Promise<{ ok: true } | { ok: false; error: string; silent: boolean }>;

/** What is left, for a surface that says so ("3 drafts left"). */
export async function budgetLeft(name: BudgetName, subject: string): Promise<number>;
```

Each entry in `BUDGETS` declares, in code, with its reason in a comment above it:

| Field | Meaning |
|---|---|
| `per` | what `subject` is: `account`, `ip`, `recipient`, `catchup`, `actor` |
| `limit` | the number, per rolling 24 hours (a standing ceiling is a count, see C6-03) |
| `store` | `rows` (count the action's own rows in Postgres) or `redis` (an Upstash sliding window) |
| `outage` | `open` or `closed`, argued per entry (§1.3) |
| `refusal` | `sentence` (the member is told) or `silent` (the action succeeds, the extra row is not written) |

### 1.2 Two stores, and why the second one exists

**`rows` is the default.** Where the action already writes a row that names its subject (a bell, a
search, a mail, a draft, an Edition), the budget is "count my rows since 24 hours ago". It costs no
Upstash command, it is exact across instances, it cannot be switched off by an attacker who empties
Upstash first, and it needs no new state. It is the pattern `enqueueMail`'s `ENQUEUE_LIMIT` and
`MAX_VISITS_PER_DAY` already use, and T2a-03's roster cap (counted inside the same serializable
write). Each `rows` budget names the index its count rides on; three need one added (§9).

**`redis` is for what writes no row**: reads, fetches, and doors keyed on an IP. It is
`Ratelimit.slidingWindow(limit, "24 h")` under its own prefix `bd:<env>:<name>`, so it never shares a
key with `rl:`. Sliding, like every limit here: nobody is locked out until midnight.

Not taken: one Upstash window for everything. L5-02 is the reason. Upstash is itself a 500K budget
and the first thing a flood drains; a ceiling that turns off when Upstash is spent protects nothing
at the moment it is needed.

### 1.3 When Upstash is unreachable or spent

`rows` budgets do not care (if Postgres is down, the action fails anyway). For `redis` budgets the
default stays the house posture, **open**, because a limiter that blocks members when Redis blinks is
the worse bug (`rate-limit.ts` header). Two entries are argued **closed**:

- `previewFetches` (T2b-02): a link preview is decoration. Failing closed costs a missing thumbnail;
  failing open hands a flood a free server-side fetcher.
- `triviaMint` (C4-01): failing closed means a newcomer's entry question is still judged, but no
  funnel row is written for a browser the meter could not vouch for.

Everything else that fails open says so through `reportLimiterFailure` (once a minute per limiter),
as today.

### 1.4 What it costs in Upstash commands

| Call | Commands |
|---|---|
| `rateLimit` / `consume` (`limit()`) | 1 EVALSHA; **0** for a key this instance already saw refused (the library's ephemeral cache, on by default in v2.0.8) |
| `hasBudget` (`getRemaining()`) | 1, always; it does not consult the ephemeral cache |
| `spendBudget`, `rows` store | 0 (one indexed count, ~100 bytes of egress) |
| `spendBudget`, `redis` store | 1 |
| one sign-in today | 2 (`hasBudget` × 2) + 2 on a failure + 1 to 2 without a Turnstile token |

Upstash's documentation does not say how a script call is counted; one EVALSHA = one command is the
audit's own assumption and is used here. `INFO` reports 21,124 commands processed in all, from a
start Upstash does not document; if it counts from the limiter's install (2026-08-20) it is about
280 a day, about 8,500 a month.

New `redis` budgets add roughly 100 a day today (the read meter, about 100 bulk reads a day; previews
and trivia mints are single digits). **Today: ≤ 13,000 a month, under 3% of 500K. At 2,000 members
(×3.4): ≤ 45,000, under 10%.** The real risk to the 500K is never organic; it is a flood, which is
why L5-02's fix is first in the order (§10) and why check D stands in front.

## 2. The thirteen instances

Owner of the file in brackets. "Heavy member" is what the most active real member would meet.

| Row | Mechanism | Number, and why | Heavy member | Lands in |
|---|---|---|---|---|
| **C5-01** | config: `search: ""` + `pathname` | — | nothing | **DONE** `c5cac0f4` (`next.config.ts`) |
| **L5-11** | take avatars out of the optimizer; trim the width list | what is left after C5-01 is photos × widths: 164 × 16 ≈ 2,600 one-off transformations today, avatars the growing term (each new avatar ≈ 2 to 4 organic, L5's month estimate 2,000-6,000 at 2,000 members). Avatars stored at 256 px at upload and drawn `unoptimized`; `pathname` narrows to `/uploads/**`; the width list keeps only the widths the app's srcsets ask for (measure them across the visual routes first). Leaves ~76 uploads × ≤ 6 widths | avatars look the same (256 px covers the largest 2× slot; verify) | `next.config.ts`, `bird-avatar.tsx`, `letterhead-profile.tsx`, `settings/actions.ts` `updateAvatar`; a one-off backfill for 88 avatars [`scripts/` is track 3's] |
| **L8-04** | check D (§8) + the demo reset brake | the brake is module memory today and resets to 0 on failure. Store the last reset in the demo's own database (the demo has no Upstash keys) and refuse within 60 s; never clear it on failure | a demo visitor resets at most once a minute | `src/app/api/demo/reset/route.ts`, `docs/spec/demo.md` pin [track 3] |
| **L5-02** | check D + stop spending commands on a known-refused key | a per-instance memo: once `login-ip` or `login-account` reports no budget for a key, remember its window's reset and answer from memory until then. A one-IP flood then costs about one command per instance per 15 minutes instead of 2 to 4 per attempt. Limits unchanged (30 / 15 min per IP, 10 / 15 min per account) | nothing: the memo only ever holds keys already refused | `src/lib/auth.ts`, `src/lib/rate-limit.ts` |
| **C6-02** | `rows` `bellsSent` per actor, deduped on the actor | **150 distinct members rung per actor per day** across mentions, likes and replies: three times the busiest link-day measured (52), a quarter of the membership, so ringing everyone takes four days instead of 29 saves. Dedupe on `(actorId, type, link)`, not on the sentence, so a rename re-rings nobody. A post's mentions reach at most 40 distinct members across all its saves (20 per save stays). Name changes `rows` 3 a day, from the AuditLog line the change now writes | a 20-name letter, liked by everyone, fits ten times over | `mention-notifications.ts`, `post-notifications.ts`, `feed/actions.ts` (`editPost`, `publishDraft`, `toggleLike`), `profile-actions.ts`; schema: `Notification.actorId` + index |
| **C6-03** | standing ceiling counted at the write | **3 drafts for an account that has not confirmed its email, 20 once it has.** 20 is what the drafts strip already shows; 0 drafts exist today. 3 × 20,000 characters bounds a never-confirmed account at ~60 KB instead of 86 MB a day. Refused with a sentence. No link previews for a draft whose author is below Stage 2 (they resolve at publish). Correct `rate-limit.ts`'s "can write nothing" | twenty letters in progress | `feed/actions.ts` `createPost`/`editPost`, `rate-limit.ts` comment |
| **C6-04** | `rows` `searchRows`, silent | **200 logged searches per member per day**: fifteen times the most measured (13). Over it the search still answers; the row is not written. Bounded stock: 200 × 90 days ≈ 6 MB per account | never | `src/lib/search-log.ts`; index `SearchLog(userId, createdAt)` |
| **C6-05** | `redis` `readBytes` meter, weighted by bytes; shared cache later (§5) | **40 MB of rows per member per day**, spent by what each bulk read returned. The heaviest member-day measured (84 directory and 16 Collection opens) is ~20-25 MB at today's page sizes. An account held at the limit for a month is 1.2 GB, a quarter of the 5 GB, and Sentry hears of the first day it happens. One command per read: `consume` after the query, refuse the next read once `remaining` is gone. `users-by-batch?detail=1` returns only the batches asked for, capped at what a picker draws | twice the heaviest day | `collection/actions.ts` (`loadPhotos`, `loadBand`), `directory/actions.ts` `loadDirectoryPage`, `api/users-by-batch/route.ts`, `api-gate.ts` |
| **T2a-03** | standing ceiling inside the write | **DONE (A2)**: existing + new counted in the serializable write that adds them, refused past 100, and `catchupAdds` (200 an hour) on the door. It is the model C6-03 follows; the shape test lists `addCatchupMembers` as metered | — | — |
| **T2b-02** | `redis` `previewFetches` per member, **closed** on outage; retention | **40 new URLs per member per day**, counting only URLs with no `LinkPreview` row yet, so re-saving a letter costs nothing. 8 previews exist after two months; a link-heavy letter has about 10. Distinct links per body capped at 16 (today's per-call number) with a sentence. Retention: a row whose URL is in no body and was fetched over 90 days ago goes, with its object (`delImageByKey`). Stock bound ≈ 3,600 objects per account | four link-heavy letters a day | `link-preview.ts` (the meter lives inside `scheduleLinkPreviews`/`ensureLinkPreviews`, which gain a member id, so all four doors share it), `retention.ts`, `feed/actions.ts`; `submitEntry`'s door [track 1]; pin: `link-previews/` never joins `KNOWN_ROOTS` |
| **C3-02** | `rows` `catchupRounds` per Catch-up | **2 Editions started per Catch-up per 24 hours**, counted on `CatchupEdition` by `catchupId` (the `(catchupId, number)` unique carries it). Bounding Starts bounds hand publishes and both group-wide bells: at most 4 bells a day per Catch-up. 6 Editions were started in 30 days across all Catch-ups. Correct `startEdition`'s docblock. The routed follow-up rides along: `joinCatchupByToken` takes the `catchups` meter | a group finishing a round by hand and starting the next the same day still can | `src/app/(main)/catchups/actions.ts` **[track 1]** |
| **C4-01** | `redis` `triviaMint` per IP (closed) + `rows` per browser + `rows` site day | a new browser id is minted at most **120 times an hour per IP** (a meet's Wi-Fi of 100 newcomers mints 100); a browser writes at most **30 rows an hour** (a newcomer writes ~4); the site writes at most **1,000 rows a day**, two hundred times the measured 5 and room for a Centenary meet of 250 newcomers. Worst stock at 365 days: 365K rows ≈ 177 MB, a third of the database, instead of 2.5 GB. A refused `checkTrivia` writes no typed answer. Make the five promises true | the funnel loses no real newcomer's row | `trivia-actions.ts`, `trivia-log.ts`, `retention.ts`, the five promise sites **[Phase G]** |
| **C5-02** | mail, per recipient (§3) | resets for one address: **3 per 24 hours**; resets' share of the day: **at most 30** of 95 | three resets in a day is a member who keeps losing the link | `email-queue.ts`, `mail-policy.ts`, `email-actions.ts` **[Phase G]** |
| **C6-01** | mail, per recipient (§3) + confirmed-only notices | every kind to one address: **6 per 24 hours**; `deletion-scheduled` and `password-changed` only to an address that was confirmed; `deletion-scheduled` folds like verify and reset; `requestAccountDeletion` refuses within an hour of a cancel | the busiest address ever got 4 in a day | `email-queue.ts`, `mail-policy.ts`, `settings/actions.ts` **[Phase G]** |
| **O-09** | the class: closes when the shape test (§7) passes with every instance landed | — | — | `src/lib/daily-budget.ts`, `src/lib/budget-coverage.test.mjs` |

## 3. Mail: per recipient, and a share of the day kept back

Enforced in `enqueueMail` (refusal at the door) and in the drain's pure policy (`mail-policy.ts`,
which decides what may be sent). All counts are `rows`: `OutboundEmail` already holds `to` and
`createdAt`; add an index on `(to, createdAt)` with `to` stored lower-cased.

**At the door, per recipient address, rolling 24 hours:** 6 of every kind together; within it reset 3,
verify 3, password-changed 2, deletion-scheduled 2. The bound an attacker cannot multiply with IPs or
accounts is the address. The worst real day for one address was 4.

**In the drain, three rules** replacing today's `eligibleKindsFor(verifyRemaining)`:

1. **First contact first.** Each queued row's rank is the number of mails already sent to its address
   today. The drain orders by (rank, priority, createdAt), so any address's first mail of the day goes
   before any address's second. A flood of repeats to a few addresses can no longer starve a new
   member's first confirmation.
2. **Kind shares.** Resets at most 30 of the day (ten times the worst day measured, leaving 65); the
   two security notices at most 20 together.
3. **The reserved tail.**

| Sends left today | Who may still be sent |
|---|---|
| more than 25 | anyone, in drain order |
| 11 to 25 | a first-of-the-day confirmation or reset; a security notice to a confirmed address |
| 1 to 10 | a first-of-the-day reset; a security notice to a confirmed address (today's `RESET_RESERVE`) |

25 is about four times an ordinary day's whole mail (5.8). On launch day nearly every send was a first
contact, so the tail does not slow a real launch; it only stops repeats and notices spending the last
quarter. What it cannot stop is many distinct fresh addresses (a signup flood); that is the signup
meter's and check D's job, and the email gate's `confirmationStillWaiting` behaviour is Phase G's
(C5-02 notes an empty budget holds new signups' gate open).

## 4. Retention, sized to each cap

| Log | Cap from this design | Retention | Worst stock |
|---|---|---|---|
| `SearchLog` | 200 / member / day | 90 days (unchanged) | ~6 MB per account |
| `TriviaEvent` | 1,000 / day site; 30 / browser / hour | 365 days (unchanged; owner question 2) | ~177 MB |
| `Notification` | 150 members / actor / day | 30 days (unchanged, unread too) | ~1 MB per actor |
| `LinkPreview` + objects | 40 new / member / day | **new**: unreferenced and fetched over 90 days ago | ~3,600 objects per account |
| `OutboundEmail` | 95 / day, 6 / address | 180 days (unchanged) | ~17,000 rows |
| drafts | 3 / 20 standing | none (owner question 1) | 60 KB / 400 KB per account |
| `LoginAttempt` refusals | 120 / hour (`e29823cb`) | 365 days (unchanged) | ~210 MB, only after a year of continuous flood; noted, not changed |

## 5. The read meter and the shared cache (C6-05)

**The meter** is §2's `readBytes`, on the four bulk cross-member reads: `loadPhotos`, `loadBand`,
`loadDirectoryPage`, `users-by-batch`. Not on the rest: a member's own notifications, saved posts or
one profile are a bounded page each.

**The cache** is for reads every member gets the same answer to, through `unstable_cache` (Next 16's
`use cache` needs `cacheComponents`, a rendering-model change not worth making for this; on Vercel
`unstable_cache` is the data cache, Runtime Cache once Vercel migrates the team). Candidates: the
valley river's pages and its geometry and band tally; the composer's first-names list; the directory
pins. **Owner-deferred with L5-07** (he deferred cutting the bytes per page view on 2026-10-08,
"revisit before ~1,000"; 594 today), so it is designed here and scheduled with L5-07, not now.

Why a cached page never shows one member another's view:

- The cached function takes only what is the same for everyone who may see it: scope, order,
  cursor, and for a class page the class year. It never reads the session, cookies or headers; the
  shape test fails if its body calls `auth()`, `cookies()` or `headers()`.
- The gate runs **before** the cache read, per request, exactly as today (who may see the valley,
  who belongs to the class).
- What differs per viewer (their own hearts, their own pending photos) is a second small query keyed
  on the viewer and the page's ids, outside the cache.
- Who is hidden is decided globally, not per viewer (a blocked or leaving member is hidden from
  everyone), so the cached rows are already filtered the same way for all.
- Every write that changes what the river shows calls `revalidateTag("collection")`: contribute,
  edit, delete, admin remove, review and decline, block and unblock, deletion request and cancel, and
  C8-05's batch-year move. A 10-minute TTL is the backstop for one that is missed.
- On Hobby every project in the team shares one cache's storage, but entries are keyed by project and
  environment, so the demo and production never read each other's.

Spending the Runtime Cache's allotment pauses the cache and reads fall back to Postgres: today's cost,
never an outage. A 150 KB page is 19 read units, so 1M units is ~52,000 page reads a month.

## 6. What a refused member sees

Deliberate writes say so in one plain sentence ("You have 20 letters in progress. Publish or delete
one to start another."). Telemetry (search rows, trivia rows) and fan-out beyond the daily budget
(bells, previews) are silent: the member's own action succeeds. Every refusal of a `silent` budget
reports to Sentry at most once per subject per day, so the owner hears about the account doing it.

## 7. The shape test

`src/lib/budget-coverage.test.mjs`, in `gate-coverage.test.mjs`'s pattern, over every exported server
action (`serverActionFiles()`) and every exported method of `src/app/api/**/route.ts`. Today: 110
actions (19 pass a meter, 21 are admin-only, 70 neither) and 20 routes.

- **Passes** if its body calls one of: `rateLimit(`, `hasBudget(`, `consume(`, `spendBudget(`,
  `vetLookupRequest(`, `vetUploadRequest(`, `enqueueMail(`, or a cached read.
- **Or** it is in `BUDGET_EXEMPT`, `{ name: reason }`, where every reason starts with one of six
  categories, so the list reads in one pass:
  `admin-only:` (the owner and his admins), `own-row:` (writes one row of the caller's own, in place,
  ringing nobody: theme, guide seen, bookmark, read marks), `own-page:` (reads the caller's own rows, one
  bounded page), `own-delete:` (deletes the caller's own content), `secret-gated:` (cron or webhook
  behind a signature or `CRON_SECRET`), `dev-only:` (404 in production).
- Every exemption names a function that still exists; every `BUDGETS` entry is used somewhere; every
  `rows` budget's named index exists in `schema.prisma`; no cached function's body reads the session.
- One named assertion per instance above (for example: `notifyMentioned` spends `bellsSent`;
  `startEdition` spends `catchupRounds`), so a row cannot regress without its own test going red.

Rows still open when the test lands sit on the list as `pending: <row id>`, which the test allows only
for the ids in this file; each unit deletes its own.

## 8. Check D, for the owner

**What it is.** One rule in Vercel's firewall that slows down any single computer that hits the
site's sign-in and sign-up pages too fast. Hobby allows one such rule per project. Requests it refuses
cost nothing against any allowance. Members browsing while signed in barely touch these doors.

**Production** (Vercel → the **rv-alumni** project → **Firewall** in the left sidebar →
**Configure**, top right → **+ New Rule**):

1. **Name:** `Sign-in and sign-up doors`
2. **If** (choose **OR** between each line, and **AND** only inside the last one; keep them in this
   order):
   - `Request Path` · `Is any of` · `/` `/login` `/signup` `/forgot-password` `/reset-password` `/verify-email`
   - **OR** `Request Path` · `Starts with` · `/api/auth/`
   - **OR** `Request Path` · `Starts with` · `/catchups/join/`
   - **OR** `Request Path` · `Starts with` · `/_next/image`
     **AND** `Cookie` · `__Secure-authjs.session-token` · `Does not exist`
     **AND** `Cookie` · `__Secure-authjs.session-token.0` · `Does not exist`
3. **Then:** `Rate Limit` · `Fixed Window` · **Time Window** `600` seconds (10 minutes) ·
   **Request Limit** `1300` · **Key** `IP Address` · action **Default (429)**
4. **Save Rule** → **Review Changes** → **Publish**.

**If the dashboard will not put the two cookie conditions inside the last OR line** (the fallback):
the same rule with the fourth line left out entirely, so the `If` reads only the first three lines,
joined by **OR**, and the `Then` is unchanged (`600` seconds, `1300`, `IP Address`, 429). Nothing is
lost that matters: the image optimizer already refuses every URL it does not render (C5-01, live
from the next push), so the line only ever slowed a signed-out visitor's photographs.

**Demo** (the **rv-alumni-demo** project, same steps):

1. **Name:** `Everything on the demo`
2. **If:** `Request Path` · `Does not start with` · `/_next/static`
3. **Then:** `Rate Limit` · `Fixed Window` · `600` seconds · **Request Limit** `1000` · `IP Address` ·
   **Default (429)**

**Why those numbers: measured (O2, 2026-11-03, the dev server, signed out in the chrome-devtools
MCP; signed in as the test account in a scripted browser).** Counted are only requests the rule's
paths match; `/_next/static`, Cloudflare's widget and PostHog's `/ingest` are not.

| Step | Requests the production rule sees |
|---|---|
| The front page, signed out | 2 (`/`, one `/_next/image` for the banyan) |
| "Join the community" to the entry question | 3 (the `/signup` page's own fetch, and two server actions posting to `/signup`) |
| Answering it | 1 (one more post to `/signup`); each wrong answer or "Try a different question" adds 1 |
| The sign-up form, submitted | 5, counted from the code rather than pressed: `registerUser` posts to `/signup`, then NextAuth's `signIn` reads `/api/auth/providers` and `/api/auth/csrf`, posts `/api/auth/callback/credentials` and reads `/api/auth/session`; `/welcome` is outside the rule |
| **A newcomer, start to finish** | **11**, or about 13 with one wrong answer and one new question |
| The sign-in page, opened directly | 2 (`/login`, the banyan's `/_next/image`) |
| Signing in, submitted | 4 (the same four `signIn` requests; counted from the code, because a sign-in from the dev server writes a `LoginAttempt` row into production's table, T7b-09) |
| **A returning member signing in** | **about 8** with the front page; a signed-in member's browsing reaches none of these paths (no session polling, checked below) |
| Demo rule: five minutes of brisk signed-in browsing, a new page every 5.5 seconds (55 pages) | **389**, 77 a minute: 214 page and page-data fetches, 55 presence beats, 64 PostHog, 39 images, 17 server actions; no `/api/auth/` request at all |

So **1,300** in ten minutes is a hundred newcomers on one venue Wi-Fi in the same ten minutes at
13 each, or about 118 at a clean 11; **1,000** (the estimate this replaces) would have started
refusing at about the seventy-seventh. A script at ten requests a second makes 6,000 in the window and loses
four in five, free. On the demo, the brisk browse above is a visitor reading nothing, a ceiling no
real visitor reaches: 770 in ten minutes, so **1,000** lets that visitor through the whole window
with room for a second person on the same connection, where 600 (the estimate) cut them off at
eight minutes; a script loses five in six. The image line counts only visitors who are not signed
in, so members browsing photographs never use it up. Measured on the dev server, whose page-data
fetches may differ a little from production's; the doors' own requests (the server actions and
NextAuth's four) are the same code on both.

**What it does not do.** It counts per computer, so one machine kept just under the limit all day
still gets 144,000 requests through, and many machines are not slowed at all. The code half of this
campaign (C5-01, L5-02, the daily budgets) is what bounds those. If someone ever reports "Too many
requests" at sign-in, this rule is the first suspect: raise the limit.

Checked against Vercel's documentation on 2026-11-03: Hobby allows one rate-limit rule per project
within three custom rules, a fixed window of 10 seconds to 10 minutes, keyed by IP or JA4, with the
actions 429, Log, Deny or Challenge; refused traffic is not billed; persistent blocks are Pro-only;
Hobby includes 1,000,000 allowed requests a month through rate-limit rules, and these doors see a few
thousand.

## 9. Migrations this design needs (additive, both databases)

`Notification.actorId` (nullable) + index `(actorId, createdAt)`; index `SearchLog(userId, createdAt)`;
`OutboundEmail` index `(to, createdAt)` (with `to` written lower-cased from now on). Nothing dropped.

## 10. The order to land it

| Unit | Rows | Files | Track |
|---|---|---|---|
| **O1** | C5-01 (done), this design | `next.config.ts`, this file | 2 |
| **O2**: the helper, the test, and the cheap doors | O-09 (helper + test), L5-02, C6-03, C6-04, T2b-02 | `src/lib/daily-budget.ts` (new), `src/lib/budget-coverage.test.mjs` (new), `rate-limit.ts`, `auth.ts`, `search-log.ts`, `link-preview.ts`, `retention.ts`, `feed/actions.ts`, `security-regressions.test.mjs`; migration: SearchLog index | 2 |
| **O3**: bells, reads and images | C6-02, C6-05 (meter), L5-11 | schema + migration (`Notification.actorId`), `mention-notifications.ts`, `post-notifications.ts`, `feed/actions.ts`, `profile-actions.ts`, `collection/actions.ts`, `directory/actions.ts`, `api/users-by-batch/route.ts`, `api-gate.ts`, `next.config.ts`, `bird-avatar.tsx`, `letterhead-profile.tsx`, `settings/actions.ts` (+ the avatar backfill, with track 3) | 2 |
| **H-next** | C3-02, routed `joinCatchupByToken`, T2b-02's `submitEntry` door | `src/app/(main)/catchups/actions.ts` | 1 |
| **L-demo** | L8-04's code half | `api/demo/reset/route.ts`, `docs/spec/demo.md` | 3 |
| **G (mail)** | C5-02, C6-01 (with C4-02, T5-13, C5-04, C5-05) | `email-queue.ts`, `mail-policy.ts`, `email-actions.ts`, `settings/actions.ts`; migration: OutboundEmail index | 2 |
| **G (trivia)** | C4-01 (with C7b-01 to 03) | `trivia-actions.ts`, `trivia-log.ts`, `retention.ts` | 2 |
| **owner, at the end** | check D | the dashboard | — |

O2 goes first because L5-02 is what keeps every other `redis` budget switched on. O-09 closes when the
last of these lands and its `pending:` entries are gone.

## 11. Questions only the owner can answer

Each in his format, each with the answer the campaign takes if he says "go with your defaults".

**1. Drafts of accounts that never confirmed their email**
- What happens now: anyone who signs up, even with a made-up email, can save letter drafts, and they
  are kept for ever, because an unconfirmed account is never cleaned up.
- The problem: one such account can fill the database in days (C6-03).
- What I'd change: at most 3 drafts until the email is confirmed, 20 after. That ships either way.
  The question is whether drafts of an account still unconfirmed after 30 days are also deleted.
- What you'd notice: nothing.
- If I guess wrong: someone who signs up, writes a draft and confirms a month later finds it gone.
- Options: (a) the ceiling only; (b) the ceiling, and delete them after 30 days. **Default: (a).**

**2. The entry question's records**
- What happens now: every question shown, skipped and answered at sign-up is kept for a year, up to
  600 rows an hour.
- The problem: at that rate a script fills five times the database in a year (C4-01).
- What I'd change: at most 1,000 rows a day (two hundred times today), still kept a year: worst case a
  third of the database. Or keep only the answers a year and the shown/skipped rows 90 days.
- What you'd notice: nothing; the trivia room's numbers stay whole under (a).
- If I guess wrong: with (b), the room's "shown" and "skipped" counts stop at 90 days back.
- Options: (a) 1,000 a day, a year; (b) also cut shown/skipped to 90 days. **Default: (a).**

**3. Caching the Collection and people lists**
- What happens now: every page of the Collection and every people list is read from the database
  afresh for each member, which is most of what Supabase's 5 GB a month pays for.
- The problem: you deferred cutting that until about 1,000 members (now 594), and one determined
  account can spend a quarter of the month even with the new daily limit (C6-05).
- What I'd change: keep one shared copy for a few minutes, invalidated whenever a photo or a member
  changes.
- What you'd notice: nothing, unless an invalidation is missed somewhere, when a change can take up to
  ten minutes to appear for others.
- If I guess wrong: more moving parts before you needed them.
- Options: (a) now, with the meter; (b) later, with the rest of the bytes-per-page cut. **Default: (b).**

**4. Avatars served straight from storage**
- What happens now: every profile photo goes through Vercel's image service, which the free plan
  allows 5,000 times a month for the whole site.
- The problem: avatars are the part that grows with every member; at 2,000 members a busy month can
  spend it, and then new photos stop showing for 30 days (L5-11).
- What I'd change: save a small copy at upload and show that directly, so avatars never use the
  allowance. I'd show you the two side by side first.
- What you'd notice: nothing, if it is right.
- If I guess wrong: an avatar a touch softer at its largest size.
- Options: (a) do it, shown to you first; (b) leave avatars as they are. **Default: (a).**

**5. How many newcomers might sign up together on one Wi-Fi**
- What happens now: there is no firewall rule, so nothing slows a script at the sign-in door.
- The problem: the one rule Hobby allows counts per internet address, and everyone on a venue's Wi-Fi
  shares one. Too tight and a reunion's sign-ups are refused; too loose and it slows nobody.
- What I'd change: check D's 1,300 requests in ten minutes, which is about 100 newcomers signing up in
  the same ten minutes on one Wi-Fi (measured: a newcomer makes 11 to 13 requests through those doors).
- What you'd notice: nothing, unless a bigger crowd signs up at once, when some see "Too many
  requests" and succeed a few minutes later.
- If I guess wrong: at the Centenary meet, the crowd is bigger than that.
- Options: (a) 1,300 (about 100 at once); (b) 3,300 (about 250 at once, slows a script less).
  **Default: (a)**, unless you expect a bigger crowd at one moment.

## 12. Considered and not taken

- **One Upstash window for every budget** (§1.2): L5-02 drains Upstash first.
- **`/_next/image` counted for everyone in check D:** one counter per IP; a crowd of members browsing
  photos on one Wi-Fi would need a limit so high it stops slowing a sign-in flood at all. Counting it
  only for signed-out visitors keeps C5-01's line in the rule at no cost to members. A script that sends
  a fake cookie walks past that line; C5-01's fix and L5-11's are what bound transformations.
- **A proxy check in front of `/_next/image`:** a function call before every image, on a plan whose
  CPU is the second ceiling; the config closes the door for free.
- **Metering `editPost` with the `posts` bucket** (C6-02's alternative): it is the letter desk's
  autosave; ten in ten minutes would break writing. The per-actor bell budget bounds what it can ring.
- **Fixed UTC-day windows:** half the code, but a script can spend two days' budget across midnight,
  and every other window here slides.
- **Persistent firewall blocks and more rules:** Pro-only.

## 13. Review (the orchestrator, 2026-11-03): approved, with these binding changes

The design is approved as the shape every Phase O and G instance follows. Where this section and
§1 to §12 disagree, this section wins.

1. **No notification a member gets today for a distinct event is lost.** C6-02's dedupe on
   `(actorId, type, link)` applies only to the same mention or the same name re-rung by a re-save, an
   edit or a rename. A second reply, a new comment, a new like on a different post still ring exactly
   as today. The pin proves both halves: a re-save re-rings nobody, a second reply still rings.
2. **A refused read says so, and the first page never refuses.** C6-05's meter refuses only a further
   page of a bulk read (the next river page, the next directory page, a second `users-by-batch`), never
   the first view of a surface, and the member gets one plain sentence, not an empty list or an error
   screen. Weight the meter cheaply (rows returned times a per-surface constant, or the length of what
   the action already serialises); no extra `JSON.stringify` on a plan whose CPU is the second ceiling.
3. **`rows` budgets may overshoot by whatever lands together.** Say so in the helper's docblock, as
   demo.ts's ceilings do. Every `rows` count rides an index that exists on both databases before the
   code that counts it is committed (Q28: additive, dated idempotent file, read back, applied to
   production and the demo).
4. **Check D's numbers are measured, not estimated** (memory: platform cost is measured; prefetch was
   an 18x multiplier nobody counted). Before O2 closes, drive the signed-out flow (front page, entry
   question, sign-up form, sign-in) in the chrome-devtools MCP and count the requests that match the
   rule's paths, and count a five-minute signed-in browse's requests the demo rule would see. Re-derive
   1,000 and 600 from those counts and record the counts here. Also write a **fallback rule** for the
   owner if the dashboard cannot put two cookie conditions inside one OR line: the same rule without the
   `/_next/image` line (C5-01 already bounds transformations).
5. **L5-11's avatar half waits for the owner** (§11 question 4, asked at the close): no 256 px
   avatar at upload, no backfill of existing members' avatars, no change to `User.photoUrl` on any row,
   until he has seen the side-by-side. O3 may trim the width list (measured across the visual routes)
   and narrow `pathname`, which change no stored row.
6. **Nothing deletes a stored object without a dry run first.** `LinkPreview` retention ships with
   a count of what its first run would take (today: zero, 8 previews exist, none older than 90 days) and
   a write-path review; it never touches anything under `uploads/`, `avatars/` or `collection/`.

§11's five questions go to the owner at the close, in his format. Each default is the safe one, so no
unit waits on them except L5-11's avatar half (question 4).

## 14. As built (O2, 2026-11-03): where the build departs from §1 to §13

Each departure is the smallest correct thing where the design, built literally, would not have held.

- **The shape test has a seventh category, `bounded:`.** §7's six did not cover a door whose ceiling
  is real but is not a meter: a unique row (a heart, a vote), a parent's cap (questions per Edition),
  a transition that happens once (an Edition opens once and closes once), a deduped bell. Twenty-odd
  Catch-up, payment and token doors are like that. The reason must name what bounds it, and the test
  refuses a bare `bounded:`. `pending:` is the eighth prefix, as §7 already said.
- **Metered helpers in other files count, each proved by its own body.** `vetLookupRequest`,
  `vetUploadRequest`, `vetPhotoDownload`, `enqueueMail`, `sendVerificationEmail`,
  `isThreadRateLimited`, `isMessageRateLimited` and `recordPageView` (presence's
  `MAX_VISITS_PER_DAY`) are listed with the ceiling their body must still carry, so a helper that
  loses its meter turns every caller red at once. Without this, every door behind one of them
  would have needed an exemption that lies.
- **Admin actions are recognised by their gate** (`requireAdminAction`, `requireAdminActor`,
  `requireAdmin`), not listed one by one; the handful that check the role inline are listed.
- **L5-02's memo had to cover `login-unverified` and move the bot check ahead of the meters.** §2's
  memo on `login-ip` and `login-account` alone bounds nothing for the commonest flood: a script with
  no Turnstile token, or a junk one, is refused by `login-unverified` and never spends a `login-ip`
  failure, so the door's two paid reads ran on every attempt. `hasBudget` now remembers any key with
  nothing left (only nothing: `catchupAdds` asks for n), capped at fifteen minutes so a 30-day meter
  is asked again soon, and `authorize` asks the memo, then the bot check, then the paid reads.
- **T2b-02's meter is charged to the writer at every door, the two read loaders included.** §2 named
  the four save doors. The Edition reader and the feed and letter loaders also create rows (a link
  with none, written before the phase or refused at save), and charging the reader would let one
  account spend every reader's day on its links. `scheduleLinkPreviewsByWriter` charges each link to
  the author whose body holds it, which is what makes §4's stock bound per account true.
- **C6-03's "no previews below Stage 2" sits at that same door** (`fetchesFor` in
  `ensureLinkPreviews`), not in `createPost`: the letter page shows a draft to its author through the
  read loader, so a save-side check alone would have been walked round.
- **The `LinkPreview` window is outside `KEEP_DAYS`** (`PREVIEW_KEEP_DAYS` in `retention.ts`): every
  `KEEP_DAYS` window is personal data with its row on the privacy page, and a preview names nobody.
- **A Stage 0 list rides in the shape test** (C6-03's pin): every action an account that never
  confirmed its email can reach that writes a row, twelve today, each with the ceiling that bounds it
  and the place that ceiling must still be. One of the twelve, `startContribution`, is a rate and not
  a size (ten unpaid orders an hour, kept with the payment records); it is Phase J's file.
