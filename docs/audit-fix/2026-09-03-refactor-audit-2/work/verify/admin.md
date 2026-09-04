# verify/admin - adversarial verification of the admin + analytics cluster

Verifier charter: the admin rooms and the analytics queries. 14 finding ids
(`admin-analytics-01..06, 09..14`, plus `data-layer-12` and `duplication-20`).
Date: 2026-09-04. Read-only; no builds, no browser, no database.

**HEAD has moved since the find phase.** The audit baseline was `72b5a1d`; HEAD is now
`74cc61a` ("fix(retention): notifications are kept 30 days, everywhere"). That single commit
touched `.github/workflows/snapshot.yml`, `docs/OPERATIONS.md`, `docs/SECURITY.md`,
`progress.md`, `scripts/ops/prune.mjs`, `src/app/(main)/notice/[id]/page.tsx`,
`src/app/(policies)/privacy/page.tsx`, `src/lib/notification-reach.test.mjs`,
`src/lib/post-notifications.ts`, `src/lib/retention.ts`. **Nothing in the admin territory
changed**, so every line number below is valid at both shas. Working tree is clean apart from
this audit folder itself (the `image-viewer.tsx` WIP the finder saw has since been committed).

Headline: the finder's line numbers are unusually accurate — I re-derived the per-view query
counts independently and got 18 / 24 / 10 exactly as reported. Nothing here is refuted. Five
items carry corrections a fix session needs; **one of them is load-bearing** (finding 01 breaks
a security-adjacent rule test that the finding says it does not touch).

---

## admin-analytics-01 — retire the content list's second photo-review implementation
**Verdict: confirmed-with-correction.** The duplicate surface is real; the gate is wrong.

Verified at HEAD:
- `content-list.tsx:63` `useAdminAct()`; `:74-75` `ticked`/`approving` state; `:106-118`
  `waiting`/`tickable`/`chosen`; `:120-128` `tick`; `:129-143` `approveChosen`; `:214-244` the
  "N waiting / Tick all / Approve N" bar; `:275-293` the tick button over the thumbnail;
  `:345-368` the per-row Approve/Decline pair, `:369-397` the `else` dropdown branch. The
  finding's ranges are each off by at most one line.
- The B-042 shape is exactly as claimed. `approveChosen` calls `approvePhotos` **directly**
  (not through `callAction`) and `setApproving(false)` at `:134` is a trailing statement, not a
  `finally`. Contrast `use-admin-act.ts:71-75`, whose own comment says "finally, not a trailing
  statement: a rejected call used to leave the control that started it disabled for the rest of
  the session (audit B-042)".
- `loadContent` (the query one) applies no `approved` filter for `all` or `photo`
  (`admin-content-query.ts:131-141`), so unapproved photographs really do render in the default
  Content list with Approve/Decline. Spec `docs/spec/admin.md:440` says the queue "**used to
  be**" this filter and "what stays on this page is the count, as a link"; `:453` is the
  owner's "this is an atrocity" quote. The code contradicts the spec paragraph.
- Callers: `approvePhoto` and `approvePhotos` are called only from `content-list.tsx:353` and
  `:133`. `declinePhoto` is also called by `admin/review/actions.ts:133`, so it stays. Confirmed
  by grep across `src scripts e2e`.

**CORRECTION 1 (important — the finding's "no rule test greps these ranges" is wrong).**
`src/lib/image-purge-rule.test.mjs:253-264`, test *"C-074/C-130: concurrent moderation is
answered, not thrown at"*, reads `src/app/(main)/collection/actions.ts` as text and asserts
`/const approved = await prisma\.photo\.updateMany\(/` and `/approved\.count === 0/`. Those two
strings exist **only** inside `approvePhoto` (:1047, :1051) and `approvePhotos` (:1087, :1093)
— `grep -n "photo.updateMany\|approved.count"` on that file returns 1047, 1051, 1087, 1093 and
1326 (`const changed =`, the member's own edit). Deleting both actions turns that test red. The
fix session must, in the same commit, re-point the pin at
`src/app/(main)/admin/review/actions.ts:89-102`, which carries the same `updateMany` +
`changed.count === 0` shape with the same C-074/C-130 comment. Do not "fix" it by relaxing the
regex.

**CORRECTION 2 (numbers).** `git show --numstat`: `65c5e94` was **+136/−7** on content-list
(not +143) and +42/−0 on collection/actions; `076be8c` was **+20/−8** on content-list (not
+28/−18). The substance — that the review-room commit left every approval control standing —
is confirmed by both the numstat and that commit's own message ("The old type=pending filter is
gone; the count on /admin/content and the worklist link both point here, and the URL
redirects").

Owner call stands as written. My only addition: if the owner keeps batch approval instead, the
minimum fix is `callAction` + `finally`, and that alone is worth doing regardless of the
bigger decision — it is a live stuck-button bug, not a style point.

## admin-analytics-02 — delete the unreachable `pending` branches
**Verdict: confirmed-with-correction.** Two corrections, both small, one of which changes a word
in the argument.

Verified: `admin-content.ts:17` (`"pending"` in `ContentType`), `:23-35` (the comment; the
finding said 24-35, it starts at 23), `:54` (`TYPES`). `admin-content-query.ts:131`
(`|| f.type === "pending"`), **`:138`** (`...(f.type === "pending" ? { approved: false } : {})`),
`:150-152` (the `orderBy` switch + its comment), `:175-181` (the comment + `merged.sort`).
`content/page.tsx:15-20` docblock ("The photo review queue lives here as a filter rather than as
its own section, which is what it always was") sitting sixteen lines above `:36`
`if (sp.type === "pending") redirect("/admin/review");`, with `readContentFilters` at `:38`.
`readContentFilters` and the query-side `loadContent` each have exactly one caller (grep across
`src scripts e2e`).

**CORRECTION 1.** The `approved: false` spread is **line 138 alone**. Line 137 is
`...(f.authorId ? { uploaderId: f.authorId } : {})`, which must stay. A fix session deleting
"137-138" as written would silently drop the author filter from the photo branch.

**CORRECTION 2 (a nuance in the "dead by control flow" argument).** The redirect compares the
**raw** `sp.type`, so it does not fire when the param is duplicated: `?type=pending&type=photo`
gives `sp.type === ["pending","photo"]`, the redirect is skipped, and `readContentFilters`'
`one()` helper takes `[0]` and returns `type: "pending"`. So the branches are reachable by a
hand-crafted URL, not strictly unreachable. This does not weaken the remedy — after the change
that URL falls through to `"all"`, which is the right answer — but the finding's sentence "false
on every possible call" is not exactly true, and the fix commit should not repeat it.

## admin-analytics-03 — collapse the count fan-outs into FILTER aggregates
**Verdict: confirmed-with-correction.** Every line reference and every query count checked out
exactly. The title overstates one thing and the gate note is over-cautious in a way that could
mislead.

Counted independently at HEAD:
- `loadPeople` (`:73-131`): 12 queries in one `Promise.all` — nine `prisma.user.count` at
  `:88,89,90,91,92,94,95,96,97`, one `userPlace.findMany` at `:93`, two `groupBy` at `:98,99`.
- `loadContent` (`:177`): seven counts at `:180-186` + a `groupBy` + a follow-up
  `user.findMany` for the author names = **9**.
- `loadCatchups` (`:226`): three counts at `:228-230` **plus a sequential `await`** —
  `answerers` at `:233` is a second wave, not part of the `Promise.all` = **4**.
- `loadMail` (`:252`): five counts at `:254-258` + groupBy = 6.
- `loadNotifications`: `:780,781` + a groupBy = 3. `loadInteractions`: counts at `:826,827,828`
  + three `$queryRaw` leaderboards = 6. `loadReading`: `:866-871`, two ContentView sums + the
  letters query = 3.
- Per view, from `analytics/page.tsx`: **PeopleView `:166-173` = 1+12+2+1+1+1 = 18**;
  **ContentView `:304-311` = 1+9+4+1+3+6 = 24**; **HealthView `:645-649` = 1+6+3 = 10.** All
  three match the finding to the query. The post-fix arithmetic (12 / 9-10 / 5) also holds.
- Precedent confirmed: `loadProfiles` `:730-752` is one `$queryRaw` with eleven
  `count(*) FILTER` columns over `User`; `loadJourney` `:1067-1086` is the same instrument
  (this is the one `data-layer-12` cites).
- `snapshot.mjs:95-119` is the scalar-subquery precedent with its "one network round trip
  instead of twenty" comment. (Aside: there are 24 subqueries, not twenty.)

**CORRECTION 1 (the title).** Items (e) `loadContent` and (f) `loadInteractions` are **not**
same-table fan-outs. `loadContent`'s seven counts span five tables (Post ×3, Comment, Like,
Bookmark, Photo) and `loadInteractions`' three span three (AdminThread, AdminMessage,
PollVote). Only the Post trio can become a `FILTER` aggregate; the rest needs the
scalar-subquery form. That is still legitimate — it is exactly what `snapshot.mjs` does — but
it is a different, slightly more coupled instrument than the headline promises, and
`data-layer-12` takes the more conservative line (fold only the three Post counts, leave the
four cross-table counts alone). **Where the two findings disagree, `data-layer-12`'s steps are
the safer ones**; `admin-analytics-03`'s buy ~4 more round trips at the cost of one statement
that names five tables.

**CORRECTION 2 (the presence-rule gate).** The gate is real but the finding describes it
backwards. `presence-rule.test.mjs:68-92` scrapes `admin-analytics.ts` for
`interval 'N days'`, `N * 86_400_000` and `days = N`. At HEAD those match at `:342, :350, :543,
:709` (interval), `:400, :436, :474, :1133` (multiplication) and `:40` (`days = 90`) — nine
windows, deepest 90, equal to `KEEP_DAYS.presence`. **`loadPeople`'s own 7- and 30-day windows
are invisible to that scrape today** because they go through the `ago()` helper. So rewriting
them as `interval '7 days'` *adds* windows rather than risking the count, and the test stays
green either way. The thing that would actually break it is deleting one of the four `interval`
sites or the `days = 90` default — which is a live risk for **finding 14**, whose proposed
signature change must keep `days = 90` spelled that way.

**Not a correction, a confirmation of the gate that does bite:** `admin-rule.test.mjs:39-44`
requires `[...ANALYTICS.matchAll(/GROUP BY u\.id/g)].length >= 10`, and the file has exactly
**10**. None of the queries this finding rewrites contains `GROUP BY u.id` (the three
leaderboards in `loadInteractions` and the `GROUP BY p.id, p."title"` in `loadReading` are
untouched), so it stays green — but there is **zero margin**, and any fix session that
collapses a leaderboard turns it red.

## admin-analytics-04 — `posts.total` / `letters.total` disagree with their sparklines
**Verdict: confirmed-with-correction.**

`admin-analytics.ts:172-175` defines `PUBLISHED = { status: "published", isHidden: false }` and
`:180-181` apply it to the two live tiles. `snapshot.mjs` counts
`(SELECT count(*) FROM "Post" WHERE kind = 'post')` and `... kind = 'letter'` with no status and
no `isHidden`. The tiles render at `analytics/page.tsx:321` and `:327` with
`trend: t("db.letters.total")` / `t("db.posts.total")`. So the sparkline's last point sits above
the number printed on it, by drafts + hidden posts.

**CORRECTION.** Those subqueries are at **`snapshot.mjs:105-106`**, not 103-104 (103 is
`members_placed`). The `add()` calls are at `:138-139`.

I spot-checked the eleven "agreeing" pairs and they do agree: `members.verified`
(`emailVerified IS NOT NULL` both sides), `members.dark_mode` (`theme = 'dark'`),
`members.active_7d`, `members.placed` (`count(DISTINCT "userId") FROM "UserPlace"` vs the
distinct `findMany`), `comments.total`, `likes.total`, `photos.total` (both unfiltered),
`catchups.entries`, `catchups.answers_per_prompt`, `mail.sent/delivered/bounced`. The
"one definition, two writers" analysis is sound and the test-that-reads-both-files remedy is
the repo's own idiom (`presence-rule` ties a lib constant to a docs table exactly that way).

## admin-analytics-05 — `MailCard` re-implements `MailRows`
**Verdict: confirmed-with-correction.** Real clone; the drop-in is not a drop-in.

`person-detail.tsx:652-723` vs `mail-rows.tsx:60-136`. Both render kind (`mailKindLabel`),
status (`mailStatusLabel` + `MAIL_STATUS_TONE`, whose export comment at `mail-rows.tsx:23-24`
already says "person-detail's mail card chips the same four states and had grown its own copy of
this map"), a meta line with `N tries`, `lastError` in destructive red under near-identical
comments, and a "Try again" that calls `retryMail` with the byte-identical toast string.

**CORRECTION 1 (behaviour the finding glosses).** Three real differences beyond "no address, no
Clear":
  (a) **the date format changes.** `MailCard` uses `formatDisplayDate` (absolute); `MailRows`
      uses `formatTimeAgo` (relative). Adopting `MailRows` silently swaps the person page from
      "3 September 2026" to "5 days ago".
  (b) **`showActions` is not row-conditional.** In `MailRows` the Try again + Clear pair renders
      for *every* row when `showActions` is set (`:106-129`); `mail/page.tsx:116` passes it only
      to the **failed** list, which is why nobody has noticed. `MailCard` gates on
      `m.status === "failed"`. Passing `showActions` on the person page — whose list is the last
      8 of everything — would put "Try again" and "Clear" on already-sent mail. The fix needs a
      per-row `status === "failed"` gate inside `MailRows`, not just the flag.
  (c) the status chip is unconditional in `MailCard` and `status !== "sent"` in `MailRows`,
      and the paddings differ (`px-3 py-2` vs `px-3.5 py-3`). Owner-visible, small.

**CORRECTION 2 (a bonus the finding missed, in its favour).** `MailCard` is the **only** caller
of `useAdminAct`'s `onDone` option (grep: 9 call sites, one with options `{ onDone }` at
`person-detail.tsx:659`, one with `{ refreshOnError: true }`), and it passes
`() => router.refresh()` (`:185`) — which is precisely the hook's own default
(`use-admin-act.ts:68-69`). The hook's docblock at `:27-31` justifies the option by claiming
"the mail card inside a person's page refreshes its own list rather than the route"; it does
not. So finding 05 also retires an option and its three-line justification from a hook whose
docblock says "Two options, deliberately not three". Add that to the saving.

## admin-analytics-06 — merge `admin-worklist.ts` into `admin-worklist-query.ts`
**Verdict: confirmed.** No corrections.

`admin-worklist.ts` is 39 lines: `WorkItem`, `QUEUE_LABEL`, `QUEUE_TONE`, nothing else.
`admin-worklist-query.ts:4-5` claims "Split from admin-worklist.ts for the usual reason: that
one is imported by a client component and this one imports `prisma`". Grep for
`admin-worklist` across `src` returns exactly four hits: the query file's own banner and its
`import type` at `:17`, and `admin/(index)/page.tsx:21` and `:22`. That page has **no**
`"use client"` (its first line is `import type { Metadata } from "next"`), calls `loadWorklist()`
inline, and defines `WorkRow` itself at `:179`, using `QUEUE_LABEL`/`QUEUE_TONE` at `:194`. The
banner's stated reason is false. The rule this file really keeps (list == rail count) is stated
in the same banner at `:7-11` and survives the merge.

I also re-checked the finder's claim that the other three pairs are real seams — `people-list`,
`content-list` and `message-composer` are all `"use client"` — so only this one moves. And the
audit-1 provenance claim holds: `report.md:251`'s admin row does not list the worklist pair.

## admin-analytics-09 — three fetch-then-`.length` counts
**Verdict: confirmed-with-correction.**

`admin-analytics.ts:93` + `:122` (`placed: placed.length`), `:233-236` + `:241`
(`people: answerers.length`), `admin/support/page.tsx:84-90` (`.then((r) => r.length)`). All
three pull one column of every matching row to count it.

**CORRECTION.** The schema relation lines are `User.places` **169**, `User.catchupEntries`
**178**, `User.contributions` **182** — not 160/169/173. The relations themselves exist, so the
proposed `some: {}` rewrites compile.

Two things in the finding's favour that I checked and it did not state: `loadCatchups`'
`answerers` is a **sequential second await**, so folding it into the `Promise.all` (or into
finding 03's raw statement) removes a whole round-trip *wave*, not just rows. And the
`admin-rule.test.mjs` slice at `:73` starts at `SUPPORT_PAGE.indexOf("contribution.count(")`,
which is line **104** of that page — after the `givers` query at 84-90 — so the pin genuinely
does not cover it. Semantics are preserved: `contributions: { some: { status: "paid",
livemode: true } }` implies the `userId IS NOT NULL` the current query spells out.

## admin-analytics-10 — the audit page's `ACTION_LABEL` is untyped
**Verdict: confirmed.**

`audit/page.tsx:27-43`, `Record<string, string>`, **15** keys (I counted them). `audit.ts:23-48`
`AuditAction`, **17** members. The three with no label are `razorpay.webhook_rejected`,
`razorpay.contribution_reversed`, `razorpay.dispute_resolved` — each of which carries a comment
in `audit.ts` explaining that it moves a money total. The precedent is verbatim at
`analytics/page.tsx:788-804`: "Keyed on LoginReason rather than string, so the gap cannot reopen
-- adding a reason without a label here is now a tsc error, not a slug that ships."

The finding's two-map remedy is required, not optional: `ACTION_LABEL` also holds
`"account.delete"`, which `audit.ts:18-22` documents as a retired event still present in old
rows and which is **not** in the `AuditAction` union. A single `Record<AuditAction, string>`
would not compile with it.

## admin-analytics-11 — `publish()` hand-lists the keys it compares
**Verdict: confirmed.**

`admin-counts.tsx:51-60`: compares `waiting`, `messages`, `reports`, `people`; `AdminCounts`
(`admin.ts:179-189`) has five keys including `photos`, whose docblock says it was added for the
Review room's row. The `Object.keys(next)` remedy is correct — all five values are numbers, so
`===` is the right comparison for every key.

## admin-analytics-12 — stale-pointer and stale-count hygiene batch
**Verdict: confirmed.** All seven sub-items verified; three more found.

(a) `admin-analytics.ts:18-21` is the `livemode` paragraph; `grep -n "livemode\|[Cc]ontribution"`
    on that file returns **only line 18**. The paragraph describes code audit 1 deleted. ✔
(b) `admin/layout.tsx:18` "There are eleven routes now" — `find src/app/(main)/admin -name
    page.tsx | wc -l` = **14**. `:21` points at "`requireAdmin()` in admin-actions.ts". ✔
(c) `admin.ts:26` carries the same stale pointer. ✔
(d) `profile/admin-actions.ts:17-19` comment + `:20` `const requireAdmin = requireAdminAction;`,
    used at `:123, :227, :286, :297` — exactly four call sites. ✔
(e) `admin-skeleton.tsx:2-3` "so nine routes cannot each invent their own" — 14. ✔
(f) `admin-nav.ts:32` `export interface AdminSectionDef`, referenced only at `:44` in its own
    file (the finding said :43). knip agrees: `raw/knip-repo-config.txt:92`
    `AdminSectionDef  interface  src/components/admin/admin-nav.ts:32:18`. ✔
(g) three "members": `admin.ts:202` `prisma.user.count()` (rail), `admin/(index)/page.tsx:80`
    `prisma.user.count({ where: { isBlocked: false } })` (Overview tile), `admin-analytics.ts:69-71`
    `countMembers()` = `prisma.user.count()`. The rail and the tile link to the same page and
    differ by the blocked count. ✔ Owner pick, as the finding says.

**THREE MORE for the same batch, found while verifying:**
1. `admin-analytics.ts:63` — "`loadPeople()` runs **thirteen** concurrent queries ... and paid
   for the other twelve". It runs **twelve** (I counted the `Promise.all` array and the
   destructure). Same class as (b) and (e), in the file that argues hardest about counts.
2. `admin-nav.ts:25-26` — "**Nine** flat rows is a list you read; **three groups of three** is a
   list you scan." `ADMIN_NAV` has **eleven** rows in groups of **4 / 3 / 4** (Waiting: Overview,
   Review, Messages, Reports; The community: People, Content, Catch-ups; The place: Support,
   Mail, Audit log, Analytics).
3. `admin.ts:236-239` — "The **six** queues behind the Overview list ... Deliberately **six**
   `count()`s and not one clever aggregate: they hit six different tables". `worklistCounts()`
   runs **seven** counts (`:253-259`) over six tables — `prisma.user.count` appears **twice**
   (`verifyState: "flagged"` and `verifyState: "pending"`). This matters beyond hygiene: it is
   the exact defence `admin-analytics-03` cites in its Not-findings, and it is wrong about the
   one pair `data-layer-12` proposes to merge.

## admin-analytics-13 — shape and copy batch
**Verdict: confirmed-with-correction.** All five sub-items verified.

(a) `mail/page.tsx:137-147` `type Row` (11 lines) restating `ROW_SELECT` at `:14-24` — which
    **is** `as const`, so `Prisma.OutboundEmailGetPayload<{ select: typeof ROW_SELECT }>` will
    work. `support/page.tsx:266-277` `LedgerRow` (12 lines). ✔
    **CORRECTION**: the support ledger's select is **inline at `:108-119`**, not a named const,
    so that half needs an extra step — hoist the select to a `LEDGER_SELECT ... as const` first,
    then `Prisma.ContributionGetPayload<...>`. The finding implies GetPayload "applies there
    too" without saying the select has to be extracted.
(b) `people/[id]/page.tsx:102-126` — 25 lines, of which only `verifiedAt`, `emailConfirmedAt`,
    `createdAt` and `photoTrusted` change shape; `:135-143` is the nine-line mail map. ✔ (These
    two line ranges are exact.) The finder's own medium confidence on (b) is fair: the explicit
    copy is also the documented client contract.
(c) **CORRECTION**: `catchups/(index)/page.tsx` — the comment is at `:93-94` and the ternary at
    `:95-102` (the finding said 94-103, one out). `catchups/[catchupId]/page.tsx:167-176` is
    exact. A second, substantive difference: the index copy uses **optional chaining**
    (`round?.status`, because `c.editions[0]` may be undefined) and the detail copy does not, so
    a shared `roundDueDate(round)` must accept `Round | undefined`.
(d) `person-detail.tsx:574-580`, `:610-616`, `:640-646` — three byte-identical
    `{dirty && (<div className="flex justify-end"><Button size="sm" variant="primary" ...>` blocks
    differing only in the label. ✔ (The finding's first range starts at 572 to include the
    two-line comment.)
(e) `person-detail.tsx:108-112` (value+label objects) vs `people/actions.ts:67`
    (`["alumnus","teacher","ex_teacher"] as const`). ✔ `admin-people.ts` is client-safe (its only
    Prisma import is `import type`), so it is a valid home.

## admin-analytics-14 — `loadTrends` fetches every metric for ninety days
**Verdict: confirmed-with-correction.**

`loadTrends` (`:40-55`) filters on `day` only — no `source`, no `metric`. Three call sites,
all `loadTrends(90)`: `analytics/page.tsx:167, 305, 646`. The consumers are exactly fifteen
`t("db.…")` calls: People 5 (`:180,186,193,199,210`), Content 7
(`:321,327,333,339,357,416,423`), Health 3 (`:658,664,673`). No `sentry.`/`posthog.`/`github.`
key is read anywhere in the page, and `loadTrends`/`metricSnapshot` have no other consumer in
`src`. The proposed `metric: { in: keys.map(k => k.slice(3)) }` is correct: the snapshot writes
`add("db", "members.total", …)` and `loadTrends` rebuilds the key as `${source}.${metric}`.

**CORRECTION (the arithmetic).** `snapshot.mjs` writes **27** `db` keys (`:130-171`, three of
them conditional) plus **9** `sentry`/`posthog`/`github` keys (`:196,197,202,235,236,237,265,267,270`)
= **36 rows/night**, not "26 + up to 8 = 34". Ninety days is therefore ~3,240 rows, of which
ContentView uses ~630 and HealthView ~270 — the finding's ~2,000-2,700 wasted rows is, if
anything, understated. Note also `admin-analytics.ts:36` still says "at 27 metrics a day, ninety
days is ~2,400 rows", which is the db-only count and is itself a stale-ish number.

**GATE WARNING the finding does not carry.** `presence-rule.test.mjs:78` scrapes this file for
`days\s*=\s*(\d+)`, and `loadTrends(days = 90)` at `:40` is the only match for that third
pattern. The proposed `loadTrends(keys: string[], days = 90)` keeps it; dropping the default (or
moving the 90 to the call sites) removes one of the nine scraped windows. The test would still
pass — `windows.length` stays at 8 ≥ 5 and the deepest is still 90 via `interval '90 days'` at
`:543` — but it is the kind of thing to know before touching that signature.

## data-layer-12 — fold the admin count fan-outs into FILTER aggregates
**Verdict: confirmed.** It overlaps `admin-analytics-03` and the two **agree**.

Verified the two claims `admin-analytics-03` does not make:
- `admin.ts:199-260`: `loadAdminCounts` = `worklistCounts()` (7 counts, `:253-259`) +
  `prisma.user.count()` = **8 queries on every `/admin/*` render**, via `admin/layout.tsx:30`
  (`const counts = await loadAdminCounts();`) — and there are 14 admin routes. Two of the seven
  are `prisma.user.count({ where: { isBlocked: false, verifyState: … } })` differing only in the
  state, i.e. one `groupBy(["verifyState"])`. Real, and the file's own "six different tables"
  defence (`:238`) does not cover it, because those two are the same table (see my extra item 3
  under finding 12).
- `profile/[id]/page.tsx:180-184`: I did not read this file in depth (it is the
  directory-profile lens's territory), but it is the only claim here outside admin.

**Which steps are safer**: `data-layer-12`'s. For `loadContent` it folds only the three `Post`
counts and leaves the four cross-table counts alone; `admin-analytics-03` puts five tables in one
statement. For `loadAdminCounts` it proposes a Prisma `groupBy` rather than raw SQL. A fix
session should execute `data-layer-12`'s version of the overlap and take
`admin-analytics-03`'s extra loaders (`loadMail`, `loadNotifications`, `loadCatchups`,
`loadReading`) on top, since those are genuinely same-table or already raw.

## duplication-20 — the analytics room's four repeated idioms
**Verdict: confirmed-with-correction.** Two of the four are clean; two are weaker than stated.

Exact, verified by grep: the empty note
`<p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">` at **cohort.tsx:22,
compare.tsx:215, heatmap.tsx:28, presence.tsx:72, stat.tsx:161** — five sites, character for
character. The three intensity floors: **cohort.tsx:62 `0.15 + share * 0.85`,
compare.tsx:263 `0.16 + Math.abs(r) * 0.84`, heatmap.tsx:59 `0.18 + (n / max) * 0.82`.** Both
of those are real and the `EmptyNote` extraction is unambiguous.

**CORRECTION 1 (the "bar-behind-text row").** `stat.tsx:168-184` (BarList) and
`compare.tsx:150-172` (GroupTable) are not the same row. What they share is a **five-line
absolutely-positioned background div** (`absolute inset-y-0 left-0 rounded-[var(--radius-sm)]
bg-leaf/[0.13]` + a `width: max(pct, 2)%` style) and the `relative z-10 … text-[12.5px]` label
span. BarList then has one value column; GroupTable has four fixed-width columns plus a
`sm:block` fifth. A `BarRow` serving both needs children or a columns prop — which is the
over-abstraction signature audit 1 warned about, on a page where the honest saving is ~8 lines.
My recommendation: extract only the background div (call it `BarFill`), leave the rows alone.

**CORRECTION 2 (the chip-link).** `tabs.tsx:51-69` and `compare.tsx:81-93` share the colour
idiom (`bg-canopy text-white` / `bg-secondary text-muted-foreground hover:bg-card
hover:text-foreground`) but differ in size: `px-3 py-1.5 text-[12.5px] font-medium` versus
`px-2.5 py-1 text-[12px]`, and the tabs version also carries `aria-current` and `title`. A single
`LinkChip` either needs a size prop or it **changes the tab bar's appearance**, which is
owner-visible. The finding flags only the ramp floor as owner-visible.

So: ~40 lines is optimistic. Honest estimate ~20, of which the `EmptyNote` (5 sites) is most of
it. Still worth doing; `stat.tsx`'s banner is the right home.

---

## Cross-cutting notes for the fix sessions

1. **Order matters between 01, 02 and 03.** 02 is independent of 01 and can land first. 09
   should land *inside* 03 rather than before it (its first two items become `count(DISTINCT …)`
   columns in 03's raw statements; doing 09 first means writing them twice).
2. **The two tripwires with no margin in this territory**: `admin-rule.test.mjs`'s
   `GROUP BY u.id >= 10` against exactly 10 sites, and `image-purge-rule.test.mjs`'s
   `const approved = await prisma.photo.updateMany(` against the two actions finding 01 deletes.
   Both are text-greps over source, so `npm run check` catches them — but only if the session
   runs it before committing rather than after.
3. **Nothing in this cluster needs the database or a browser to decide.** The one thing a fix
   session should do live is the finding-03 gate as written: open each of the three analytics
   views, write down every tile value, then compare after the rewrite.
