# admin-analytics - refactor audit 2 report

Territory reader for the admin programme: every route under `src/app/(main)/admin/**` (32 files,
3,774 lines: 14 pages, 1 layout, 3 action files, 14 `loading.tsx`), every file under
`src/components/admin/**` (24 files, 4,832 lines), the fifteen admin libs (`admin.ts`,
`admin-analytics.ts`, the four client/server pairs, `admin-review.ts`, `admin-note.ts`,
`last-seen.ts`, `audit.ts`, `report-error.ts`; 3,165 lines), and the five rule tests that pin them
(`admin-rule`, `admin-guard-rule`, `threads-rule`, `presence-rule`, `unattended-rule`; 884 lines).
Date: 2026-09-03. Files in territory: 76; read fully: 76.

## Coverage

- Read fully: all 32 files under `src/app/(main)/admin/**`; all 24 files under
  `src/components/admin/**`; `src/lib/admin.ts`, `admin-analytics.ts`, `admin-content.ts`,
  `admin-content-query.ts`, `admin-people.ts`, `admin-people-query.ts`, `admin-review.ts`,
  `admin-threads.ts`, `admin-threads-server.ts`, `admin-worklist.ts`, `admin-worklist-query.ts`,
  `admin-note.ts`, `last-seen.ts`, `audit.ts`, `report-error.ts`; the five rule tests named above.
- Read for verification only (outside territory, judged only where the charter's questions
  required it): `src/components/profile/admin-actions.ts` (whole file: the moderation actions
  every admin list calls), the four photo actions in `src/app/(main)/collection/actions.ts`
  (lines 1030-1260), `adminRemovePost`/`adminRemoveComment` in `feed/actions.ts`, the three admin
  thread actions in `messages/actions.ts`, `src/app/(main)/layout.tsx` lines 28-110 (where
  `touchLastSeen` is called), `src/lib/people-select.ts`, `scripts/ops/snapshot.mjs` lines
  77-200 (the DB metrics the sparklines read), the `Visit`/`MetricSnapshot`/`AuditLog` models and
  the `User` relation list in `prisma/schema.prisma`, `docs/spec/admin.md` (all 622 lines), the
  audit-1 admin-analytics report (526 lines) and the audit-1 fix-prompt's session 6 log.
- Skimmed: `src/components/layout/sidebar.tsx` (only the lines that consume `ADMIN_NAV` and
  `useAdminCounts`), `src/lib/gate-coverage.test.mjs` (only the admin-page sweep).
- Not read: nothing in territory.
- Uncommitted edits seen: none in territory. `git status --short` on every territory path was
  clean at the start of the run. The one uncommitted file in the tree
  (`src/components/common/image-viewer.tsx`) is somebody else's and is not mine to judge.

## Summary

This is the most recently rebuilt wing in the app (2026-08-18..30), audited once already, and it
shows: primitives are shared, every constant is argued, and audit 1's four mechanisms (the
`useAdminAct` hook, `AdminFilterBar`, the Catch-up status maps, `countMembers()` +
`loadUsageBreakdowns()`) are all still adopted where they were installed. The structural well is
NOT dry, though, and the water is in the newest code, exactly as the brief predicted. The single
biggest item is an **owner decision**: `content-list.tsx` still carries a complete second photo
review implementation (per-row Approve/Decline, a tick-and-batch-approve bar, and the
`approvePhotos` action behind it, ~230 lines across two files) that the review room replaced two
days after it shipped, and its batch handler re-introduces the exact B-042 bug the shared hook was
built to kill. Behind that: ~25 lines of unreachable `pending` branches left in the content
filters by the same move, the analytics loaders paying nine round trips for nine counts on one
table (a `FILTER` aggregate the same file already uses elsewhere would make it one), and two
sparkline metrics whose nightly definition disagrees with the live tile above them.

Honest totals if everything autonomous executes: about 110 lines, 1 file, ~25 database round
trips per analytics view open (24 -> 12 on Content, 18 -> 10 on People, 10 -> 5 on Health), two
writes moved off the render-blocking path of every authenticated page, one silent-failure hole in
the audit log closed, one clone removed. The owner item adds ~230 lines and two server actions.
Structural-vs-cheap split: 9 structural, 5 cheap. What surprised me: the `AuditLog` covers seven
admin verbs and skips twenty, three of which destroy data by the audit page's own definition (not a
simplification item; recorded under the charter's questions and handed to the security lens).
What audit 1 left that is now moot: nothing became moot, but one finding (the worklist pair,
admin-analytics-06) never reached the compiled plan and is still true.

## Answers to the charter's questions

**How many list surfaces, how many list implementations?** Nine list surfaces (Overview worklist,
People, Content, Reports, Messages, Mail, the Support ledger, Catch-ups, the Audit log) plus one
embedded list (the mail card on a person's page) and the analytics primitives (`BarList`,
`PresenceList`, `GroupTable`, `CohortMatrix`). Nine bespoke row markups, one per surface, which
audit 1 ruled correct (row anatomies differ in kind; a config-driven table would be the
over-abstraction signature) and I re-verified: the rows share `AdminSection`, `AdminEmpty`,
`AdminCapped`, `Chip`, `AdminPersonRow` (3 surfaces), `AdminFilterBar` (2), `useAdminAct` (9 hook
instances in 5 files), `AdminSkeleton` (12 of 14 loading files). The one genuine second
implementation of a row is the person page's `MailCard` versus `MailRows` (finding 05). The review
room is not a list at all (a stage), and correctly uses none of the list kit.

**Queries per analytics view today** (per open, counted per exported loader, excluding the
layout's `loadAdminCounts` which is 8 on every admin route and the cached `auth()`):
Live 7 · People 18 · Content 24 · Rhythms 4 · Faces 10 · Reach 8 · Joining 5 · Compare 1 ·
Health 10. Per loader: loadTrends 1, countMembers 1, loadPeople 12, loadGeography 2, loadContent 9,
loadCatchups 4, loadMail 6, loadPresence 4 (+3 via loadUsageBreakdowns), loadUsageBreakdowns 3,
loadSearches 4, loadArrivals 4, loadRhythm 1, loadFaces 9, loadRetention 1, loadProfiles 1,
loadNotifications 3, loadGrowth 1, loadInteractions 6, loadReading 3, loadMemberMetrics 1,
loadJourney 5. Audit 1's fix is in place: ContentView and FacesView call `countMembers()`
(page.tsx:308, :491), RhythmsView calls `loadUsageBreakdowns()` (:462). Finding 03 takes the three
heaviest views down by roughly half.

**Which computed fields does no view render?** After audit 1's trim: none. Every field returned
by every loader is consumed by the view that calls it (checked each destructure against the
JSX). `loadPresence` returns `avgViews`/`visits30d`/`people30d`, all read at page.tsx:122-130.

**Is there a metric-snapshot path AND a live path for the same number?** Yes, by design and
documented in the file banner ("TWO KINDS OF NUMBER"): 15 sparkline keys, 13 of which have a
live tile above them. The two paths are supposed to agree on the last point. Two do not:
`posts.total` and `letters.total` (finding 04). The other eleven match predicate for predicate.

**Which admin actions skip the audit log?** `writeAudit` is the only `auditLog.create` in the
tree (verified: one hit in `src` and `scripts`, excluding `generated`). Audited admin verbs, 7:
block, unblock, delete, role, verify, unverify, merge. Unaudited admin verbs, 20:
`adminUpdatePerson`, `adminUpdatePlaces`, `adminSetPhotoTrusted`, `adminUpdateNote`,
`adminHidePost`, `adminDismissReport`, `adminResolveReport`, `adminRemovePost`,
`adminRemoveComment`, `adminRemovePhoto`, `approvePhoto`, `approvePhotos`, `declinePhoto`,
`saveReview`, `declineReview`, `retryMail`, `dismissMail`, `setThreadStatus`,
`adminReplyToThread`, `markThreadSeenByAdmin`. By the audit page's own definition ("WHO did the
things that change standing or destroy data", audit/page.tsx:13-17) three of those destroy data
and leave no record: `declinePhoto` (erases the row and purges the bytes; reached from both the
content list and the review room), `dismissMail` (deletes the row), `adminRemovePhoto` (purges
the bytes). This is not a simplification finding and I have not written it as one; it is under
"For other lenses" for security.

**Does the review room duplicate the reports list?** No. It shares nothing with `ReportList` and
should not. It duplicates the **content list** (finding 01), which is the list it was carved out
of.

**Is presence/last-seen's cost proportionate?** Per authenticated page render, `touchLastSeen`
issues two `UPDATE` round trips (`visit.updateMany` with `views: { increment: 1 }`, and a
conditional `user.updateMany` on `lastSeenAt` that matches nothing 14 minutes in 15 but is still
a round trip); a new visit adds a `count` and a `create`. They run inside the (main) layout's
render-blocking `Promise.all` (`layout.tsx:74-78`), concurrent with the notification count and
the Catch-up advance, so they add no serial latency but are part of the set the render waits on.
The table is swept at 90 days, pinned to the deepest analytics window by `presence-rule`. The 266
lines are 99 comment lines recording C-163/C-164 and 144 code lines, four behaviours of which are
pinned. Verdict: proportionate. The one improvement is moving the call behind the response
(finding 07), which the layout's own comment already names as the tool.

**Any admin UI for a feature that no longer exists (Groups residue)?** None. Nothing under admin
links to a groups route or renders a Groups section. `adminMergeUsers` still moves `Group` and
`GroupMember` rows (people/actions.ts:371-387) and that is correct: `Group` is the container a
Catch-up lives in (schema line 411) and the merge's B-001 fix depends on it. What I did find is
the reverse: three things the spec promises that the code no longer has or never got
(see Owner decisions, "Spec drift").

## Findings

### admin-analytics-01 - Retire the content list's second photo-review implementation (per-row Approve/Decline, the tick-and-batch bar, and `approvePhotos`)
- **Where**: `src/components/admin/content/content-list.tsx:7,14,16` (the `Check`, `X`, `toast`
  imports), `:34-39` (`approvePhoto`, `approvePhotos`, `declinePhoto` imports; `adminRemovePhoto`
  stays), `:65-76` (`ticked`/`approving` state and its comment), `:106-144` (`waiting`,
  `tickable`, `chosen`, `tick`, `approveChosen`), `:210-245` (the "N waiting / Tick all /
  Approve N" bar), `:259-295` (the tick checkbox drawn over the thumbnail), `:346-368` (the
  per-row Approve/Decline buttons; the `else` branch at 369-398 stays);
  `src/app/(main)/collection/actions.ts:1037-1055` (`approvePhoto`), `:1057-1099`
  (`approvePhotos` and its docblock). Related dead branches are finding 02.
- **Phase**: dedupe (with a placeholder half: the batch bar can only appear on a list that is no
  longer the queue)
- **Tier**: T3     **Class**: structural     **Decides**: owner
- **Evidence**: Two commits two days apart. `65c5e94` (2026-08-28, "a page of the photo queue
  clears in one press") added +143 lines to content-list and +42 to collection/actions: the tick
  set, the batch bar, `approvePhotos`. `076be8c` (2026-08-30, "a room for reviewing photographs,
  one at a time and big") built `/admin/review`, removed the `pending` option from
  `TYPE_OPTIONS`, and had the content page redirect `?type=pending` to the room -- but touched
  content-list by only +28/-18 lines and left every approval control in place. The spec was
  rewritten in the same commit: §9.5 now says "The photo approval queue **used to be** the
  `Photos awaiting review` filter here. It moved out to its own room on 2026-08-30; what stays on
  this page is the count, as a link." The code does not match that sentence. Because
  `loadContent` applies no `approved` filter for `type=all` or `type=photo`
  (admin-content-query.ts:135-140), unapproved photographs still appear in the general list with
  a 64px thumbnail, an Approve button, a Decline button, and -- once two are waiting -- the tick
  bar. That is the surface the owner called "an atrocity" (spec §9.5b, verbatim), still reachable
  from the default Content view.
  Grep: `approvePhoto(` and `approvePhotos(` are called from content-list.tsx and nowhere else
  (`declinePhoto` is also called by `review/actions.ts:133`, so it stays). Retiring the controls
  makes both `approvePhoto` and `approvePhotos` dead.
  A second problem rides with it. `approveChosen` (content-list.tsx:130-144) was written two days
  AFTER `useAdminAct` landed (`0cada95`, 2026-08-26) and hand-rolls the hook's job without either
  of its two safeguards: it calls `approvePhotos` directly rather than through `callAction`, and
  `setApproving(false)` is a trailing statement, not a `finally`. A rejected call (network drop,
  a thrown P-error) leaves `approving` true and the "Approve N" button disabled for the rest of
  the session -- which is B-042, the bug the hook's docblock names as its reason for existing.
  This is the charter's "a new list that hand-rolls what use-admin-act does" case, found.
- **What to do**: If the owner keeps the review room as the one place photographs are decided
  (my recommendation, below): delete the ranges listed under Where; keep the "Waiting for you"
  chip at :318-320 but make it a `<Link href="/admin/review">` so the row still says where the
  job is; drop the three action imports and the two icon imports; delete `approvePhoto` and
  `approvePhotos` from collection/actions.ts (the collection lens owns that file; coordinate).
  Optionally give the photo branch of `loadContent` an `approved: true` filter so the Content
  list is "everything that is IN the site" and the room owns the pile outright -- say so in the
  page docblock. If the owner keeps batch approval instead: at minimum rewrite `approveChosen`
  through `callAction` with a `finally`, or extend `useAdminAct` to return the action's result so
  the count-bearing toast can use it (one more option on a hook whose docblock says "Two options,
  deliberately not three" -- which is why I would rather remove the caller).
- **Saving**: ~150 lines in content-list, ~60 in collection/actions (two server actions), 3
  action imports, 1 fewer approval writer (the approve write then exists only in `saveReview`),
  and one B-042-shaped handler gone. Probably ~10 KB off the `/admin/content` chunk
  (`3tuzyfox2fbgc.js`, 26 KB, is content-list plus the dialog and dropdown).
- **Risk & gate**: medium (behaviour removed on an admin surface). `npm run check`; open
  `/admin/content` with a photograph waiting and confirm the row shows the chip-link and no
  buttons; open `/admin/review` and approve one; `npm run visual` (the content route is not in
  the suite, so also screenshot desktop and 390px). No rule test greps these ranges (checked
  `admin-rule`, `admin-guard-rule`, `gate-coverage`: the latter's exemption table names
  `adminRemovePost`/`adminHidePost`, not the photo actions).
- **Confidence**: high that it is a duplicate surface; medium on the owner's answer. The one
  thing that would change my mind: if the owner wants a "hundred photographs from the school
  photographer" path that does not go one-at-a-time -- but spec §8 gap 4 already gives him one
  (`photoTrusted`, wired at person-detail.tsx:292-305), and `approvePhotos`'s own docblock says
  it "answers the first hundred; blessing him photoTrusted answers the second".
- **Notes**: The recommendation, in the owner's own terms: the review room exists because
  approving a photograph at 64px was approving something you cannot see, and a tick box on a
  64px thumbnail is the same act with a bigger blast radius. The room approves as fast as the
  batch bar once the keyboard is used (`A`, `→`, one press per photograph), and every press is
  a photograph somebody looked at. Keeping both means two approval writers, two places the
  "already dealt with" race is handled slightly differently (`approvePhoto` has no `approved:
  false` guard; `approvePhotos` and `saveReview` do), and a list whose own spec paragraph
  contradicts it. Fear: removing the per-row Decline from the list takes away the one place an
  admin could decline WITHOUT the room's four-second arm -- I think that is a feature, not a
  loss.

### admin-analytics-02 - Delete the unreachable `pending` branches the review-room move left in the content filters
- **Where**: `src/lib/admin-content.ts:17` (`"pending"` in `ContentType`), `:24-35` (the
  thirteen-line comment explaining an option that is not there), `:54` (`"pending"` in `TYPES`);
  `src/lib/admin-content-query.ts:131` (`|| f.type === "pending"`), `:137-138`
  (`approved: false` spread), `:150-152` (the `asc`/`desc` switch and its comment), `:175-181`
  (the `merged.sort` direction switch and comment); `src/app/(main)/admin/content/page.tsx:15-20`
  (a docblock that says "The photo review queue lives here as a filter rather than as its own
  section, which is what it always was", eleven lines above the redirect that says the opposite).
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `loadContent` has exactly one caller, `content/page.tsx:41`, and that page
  redirects `sp.type === "pending"` at :36 BEFORE calling `readContentFilters` at :38. So inside
  `loadContent`, `f.type === "pending"` is false on every possible call, which makes all four
  branches in admin-content-query.ts dead by control flow, not by taste. The comment at
  admin-content.ts:33-35 says "`pending` is still UNDERSTOOD by readContentFilters below, and the
  page redirects it" -- but the page redirects on the raw search param, so the reader's
  understanding is never consulted. `git log`: the option was removed in `076be8c` (2026-08-30);
  the branches survived it.
- **What to do**: In admin-content.ts drop `"pending"` from `ContentType` (:17) and `TYPES` (:54)
  and shrink the :24-35 comment to two lines ("Reviewing photographs moved to /admin/review on
  2026-08-30; the page redirects the old `?type=pending` link there"). In admin-content-query.ts
  make :131 `if (want("photo"))`, delete :137-138, replace :150-152 with
  `orderBy: { createdAt: "desc" }`, replace :175-181 with
  `merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt))`. Rewrite the page docblock
  :15-20 to describe the redirect. The redirect at :32-36 stays exactly as it is.
- **Saving**: ~25 lines, one impossible state removed from a union type.
- **Risk & gate**: low. `npm run check` (tsc will catch any stray `"pending"` comparison). Open
  `/admin/content?type=pending` and confirm it lands on `/admin/review`; open
  `/admin/content?type=photo` and confirm newest-first.
- **Confidence**: high. Nothing would change my mind short of a second caller of `loadContent`
  appearing, and there is none in HEAD.
- **Notes**: Do this together with 01 or on its own; they are independent. If 01 is declined,
  this still stands.

### admin-analytics-03 - Collapse same-table count fan-outs in the analytics loaders into one `FILTER` aggregate each (the shape `loadProfiles` already uses)
- **Where**: `src/lib/admin-analytics.ts:88-97` (loadPeople: nine `user.count` on one table),
  `:254-258` (loadMail: five `outboundEmail.count`), `:780-781` (loadNotifications: two
  `notification.count`), `:228-236` (loadCatchups: three counts plus a `findMany` used as a
  count), `:180-186` (loadContent: seven counts over five tables), `:826-828` (loadInteractions:
  three counts), `:865-870` (loadReading: two `sum(count)` over `ContentView` split on `kind`).
  The precedent is in the same file: `loadProfiles` (`:731-752`) answers twelve questions about
  `User` with one `count(*) FILTER (WHERE ...)` statement.
- **Phase**: architecture (efficiency)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Counted with awk per exported function (see Metrics). PeopleView opens with 18
  round trips of which 12 are `loadPeople`, and nine of those twelve are `SELECT count(*) FROM
  "User" WHERE <one predicate>`. Each is an index lookup, they run concurrently, and on a
  `force-dynamic` page against Mumbai each is still a pooled connection and a Prisma query
  lifecycle. The file's own banner argues concurrency is fine for `worklistCounts` ("six
  different tables"); that argument does not transfer to nine predicates on ONE table, where a
  single scan with `FILTER` is strictly less work for Postgres and one round trip for us.
  `scripts/ops/snapshot.mjs:87-118` computes the same members/mail/content numbers nightly as
  ONE statement of scalar subqueries, with a comment that says why: "the whole thing costs one
  network round trip instead of twenty".
- **What to do**: (a) `loadPeople`: replace :88-97 with one `$queryRaw` returning `total,
  verified, blocked, dark, with_photo, active7, active30, never_seen, joined30` via `count(*)
  FILTER`, keep the two `groupBy`s (`byType`, `byBatch`); compute `placed` per finding 09.
  12 -> 4 queries. (b) `loadMail`: one FILTER statement for `sent, queued, delivered, bounced,
  complained` + the `byKind` groupBy. 6 -> 2. (c) `loadNotifications`: FILTER for `total, read`
  + groupBy. 3 -> 2. (d) `loadCatchups`: one statement
  `SELECT (SELECT count(*) FROM "CatchupPrompt"), (SELECT count(*) FROM "CatchupEntry"),
  (SELECT count(*) FROM "CatchupEntryLove"), (SELECT count(DISTINCT "authorId") FROM
  "CatchupEntry")`. 4 -> 1. (e) `loadContent`: one scalar-subquery statement for the seven counts
  (posts/letters/drafts with `status`/`isHidden` predicates as today), keep the `topAuthors`
  groupBy and its name follow-up. 9 -> 3. (f) `loadInteractions`: fold the three counts into one
  scalar-subquery statement. 6 -> 4. (g) `loadReading`: merge the two `ContentView` sums into one
  `FILTER` query. 3 -> 2. Keep every bigint -> `Number()` conversion at the edge as the file
  already does. Add nothing to `worklistCounts` (see Not-findings).
- **Saving**: ~25 round trips per view open: ContentView 24 -> 12, PeopleView 18 -> 10,
  HealthView 10 -> 5. Roughly line-neutral (a 12-way destructure becomes a 20-line SQL literal).
- **Risk & gate**: low-medium. The numbers must not move: before executing, open each of the
  three views and note every tile value, then compare after. `npm run check`;
  `admin-rule.test.mjs` must stay green -- it greps this file for `GROUP BY u\.id` (needs >= 10;
  none of these queries are leaderboards, so untouched) and for the absence of `GROUP BY
  u."name"`. `presence-rule.test.mjs` scrapes the file for lookback windows (`interval 'N days'`,
  `N * 86_400_000`, `days = N`) and requires the deepest to equal `KEEP_DAYS.presence` (90); the
  rewritten `loadPeople` must keep spelling its 7/30-day windows in one of those three forms.
- **Confidence**: high on the mechanics; medium on how much wall-clock it buys, because
  `Promise.all` already overlaps the round trips -- the honest win is pool pressure (twelve
  concurrent connections from one click) and Prisma per-query overhead, not latency alone.
- **Notes**: I considered leaving this as "admin is owner-only, deprioritise". Two things
  changed my mind: the room advertises itself as getting FASTER as it grows (tabs.tsx:14-16), and
  the pattern is already in the file, so the fix is imitation rather than invention. Related:
  finding 09 (fetch-to-count), finding 14 (`loadTrends` rows).

### admin-analytics-04 - `posts.total` and `letters.total` sparklines are computed nightly with a different predicate from the live tile above them
- **Where**: `src/lib/admin-analytics.ts:172-175` (`PUBLISHED = { status: "published",
  isHidden: false }`), `:180-181` (the live `posts`/`letters` counts);
  `scripts/ops/snapshot.mjs:103-104` (`count(*) FROM "Post" WHERE kind = 'post'` /
  `kind = 'letter'` -- no status, no isHidden); read together at
  `src/app/(main)/admin/analytics/page.tsx:321,327` (`t("db.letters.total")`,
  `t("db.posts.total")`).
- **Phase**: architecture (one definition per number)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (the script belongs to the
  scripts lens; the definition belongs here)
- **Evidence**: I compared all thirteen keys that have both a tile and a sparkline. Eleven match
  predicate for predicate (`members.total/verified/dark_mode/active_7d/placed`,
  `comments.total`, `likes.total`, `photos.total`, `catchups.entries/answers_per_prompt`,
  `mail.sent/delivered/bounced`). Two do not: the snapshot counts drafts and hidden posts, the
  tile does not. The tile's own comment (:172-174) says drafts "must never be counted as things
  the community can read". So the sparkline's last point sits above the number printed on it by
  exactly the number of drafts plus removed posts, and nothing on the page can show that.
- **What to do**: In `snapshot.mjs:103-104` add `AND status = 'published' AND NOT "isHidden"` to
  both subqueries. Then pin it: one test in `admin-rule.test.mjs` that reads the script and
  asserts both `Post` subqueries carry `status = 'published'` (the file already reads
  `admin-analytics.ts` for exactly this class of "a number nobody can check" bug). History rows
  already written stay as they are; say so in the commit.
- **Saving**: 0 lines; two numbers that will agree from the next nightly run.
- **Risk & gate**: low. The script is run by a GitHub workflow, not locally (brief rule 4: do not
  run it). `npm run check` for the new pin.
- **Confidence**: high.
- **Notes**: The structural alternative -- export the predicate once and import it in the
  script -- does not work: the script is plain `pg` JS with no build step, so it cannot import a
  TypeScript constant. A test that reads both files is the honest substitute, and it is the
  repo's idiom (`presence-rule` already ties a lib constant to a docs table the same way).

### admin-analytics-05 - `MailCard` on the person page re-implements `MailRows`
- **Where**: `src/components/admin/people/person-detail.tsx:652-723` (`MailCard`), versus
  `src/components/admin/mail/mail-rows.tsx:60-136` (`MailRows`); the feeding select at
  `src/app/(main)/admin/people/[id]/page.tsx:83-96` and the mapping at `:135-143`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Read side by side, the two render the same row: kind label (`mailKindLabel`),
  status chip (`mailStatusLabel` + `MAIL_STATUS_TONE`), a date-or-sent line with `N tries`, the
  `lastError` in destructive red with the same "recorded and never rendered" comment, and a
  "Try again" button calling `retryMail` with the identical toast string ("Back in the queue. It
  goes out on the next page load."). `MailCard` differs only in omitting the recipient address
  and the Clear button, and in `useAdminAct({ onDone })` where `onDone` is `router.refresh()` --
  which is what the hook does by default. Audit 1 already merged the tone map between these two
  files (`a987cbc`); the row itself was left.
- **What to do**: In `people/[id]/page.tsx` add `to: true` to the mail select and map rows to
  `MailRow` (`personId: user.id, personName: user.name`). Replace `MailCard`'s body with
  `<MailRows rows={mail} showActions />` inside the existing `AdminSection` (keep the empty-state
  paragraph and the "The whole queue" link). Delete `DetailMail` (:98-106) in favour of `MailRow`
  imported from mail-rows. If the owner does not want Clear on the person page, give
  `showActions` a `"retry" | "both"` shape rather than cloning the row again -- but I would let
  Clear through: dismissing a dead send while looking at the person it failed for is the natural
  place to do it.
- **Saving**: ~55 lines, 1 clone (jscpd did not flag it because the JSX differs in attribute
  order; it is the same row by reading).
- **Risk & gate**: low. `npm run check`; open a person with a failed send and press Try again;
  screenshot desktop and 390px (the row gains the address line and an info chip for the kind).
- **Confidence**: high.
- **Notes**: The person page's row will look slightly different (kind as a chip rather than
  text). That is the point of one component; note it as owner-visible in the commit.

### admin-analytics-06 - Merge `admin-worklist.ts` into `admin-worklist-query.ts`: the seam it claims still is not there (audit-1 finding 06, never compiled into the plan)
- **Where**: `src/lib/admin-worklist.ts:1-39` (whole file), `src/lib/admin-worklist-query.ts:1-5`
  (banner: "Split from admin-worklist.ts for the usual reason: that one is imported by a client
  component and this one imports `prisma`"), `:17` (the type import);
  `src/app/(main)/admin/(index)/page.tsx:21-22` (two imports that become one).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Stated as new evidence per brief §4: audit 1's `admin-analytics-06` made this
  case, but the compiled report's admin row (report.md:251) lists the act-hook, filter bar,
  status maps, MAIL_TONE, skeleton, hygiene, `loadThreadWindow` and the query trim -- not the
  worklist pair -- and the fix-prompt never mentions `admin-worklist`. It was dropped, not
  refuted. Re-verified today: `grep -rln '@/lib/admin-worklist"' src` returns exactly
  `admin/(index)/page.tsx` (a server component, no `"use client"`, which calls `loadWorklist()`
  inline) and the query file itself. No client component imports it; `WorkRow` and `QUEUE_ICON`
  live in the server page. The banner's stated reason is false, and a false banner is the worst
  kind of comment: it tells the next reader to preserve a split that protects nothing.
- **What to do**: Move `WorkItem`, `QUEUE_LABEL`, `QUEUE_TONE` to the top of
  `admin-worklist-query.ts`; delete `admin-worklist.ts`; collapse the two imports in the
  Overview page into one; rewrite the banner's first paragraph to the rule it actually keeps
  (the count/list contract). If a client worklist component ever appears, the split is one
  `git revert` away.
- **Saving**: 1 file, ~12 lines (the second banner and one import), and one false claim removed.
- **Risk & gate**: low. `npm run check`; open `/admin`. No rule test greps either path (checked
  `admin-rule`, `admin-guard-rule`, `threads-rule`, `unattended-rule`, `security-regressions`).
- **Confidence**: high.
- **Notes**: The three OTHER pairs (people, content, threads) are real seams and stay; each is
  imported by a `"use client"` file (`people-list.tsx`, `content-list.tsx`,
  `message-composer.tsx`) and each banner records the `Can't resolve 'dns'` failure. Not
  re-litigated.

### admin-analytics-07 - Move `touchLastSeen` behind the response with `after()`
- **Where**: `src/app/(main)/layout.tsx:74-78` (the render-blocking `Promise.all`; the call is
  at :78), `:53-55` (the comment that names `after()` as the tool), `:92-98` (the existing
  `after()` block, which the drain already uses); `src/lib/last-seen.ts:185-246`
  (`touchLastSeen`, which reads `headers()` itself).
- **Phase**: architecture (efficiency)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The layout awaits four things before rendering any authenticated page:
  notification count, mail state, the Catch-up advance, and presence. The comment at :40-55
  argues at length why the Catch-up advance must block ("the advance is what makes the page you
  are about to read correct") and says of the alternative: "If it ever needs to stop blocking,
  `after()` is the tool". That argument does not apply to presence: nothing rendered depends on
  the `Visit` row or `lastSeenAt` having been written. So two `UPDATE`s (four on a fresh visit)
  sit in the critical path of every page for no reason the file can state. The comment on :75-77
  ("must never add a serial round trip") is satisfied either way; `after()` removes them from the
  parallel set too.
- **What to do**: Delete the call from the `Promise.all` and add
  `after(() => touchLastSeen(userId, path))` beside the drain (compute `await currentPath()`
  before, outside the callback, or confirm `headers()` is readable inside `after()` on this
  Next version -- read `node_modules/next/dist/docs/` for `after` first, per AGENTS.md).
  `touchLastSeen` already swallows every error, so no try/catch is needed around it. Update the
  :75-77 comment.
- **Saving**: 2 database writes per authenticated page view (and the `count`+`create` pair on a
  new visit) off the render-blocking set; 0 lines.
- **Risk & gate**: medium-low. The one real risk is `headers()` inside `after()`: if the request
  store is not available there, `touchLastSeen` will throw inside its own try and log in dev --
  which is loud by design, so the failure is visible on the first `npm run dev` page load.
  `presence-rule.test.mjs` greps `last-seen.ts` only (untouched). Verify with the analytics Live
  view showing the visit after a page load.
- **Confidence**: medium. What would change my mind: a measured latency trace showing the visit
  UPDATE is never the slowest of the four (then the win is pool pressure only, still real, but
  smaller than it sounds).
- **Notes**: I am NOT proposing to touch `advanceDueCatchups`; its blocking is argued and
  correct. I am also not proposing to drop the `lastSeenAt` write into the visit row: the file's
  comment on :225-227 makes the case for the indexed column and it is used by seven analytics
  queries.

### admin-analytics-08 - `last-seen.ts` and `audit.ts` swallow failures to a dev-only console line instead of the `reportSwallowed` reporter that exists for exactly them
- **Where**: `src/lib/last-seen.ts:236-245`, `src/lib/audit.ts:79-83`;
  `src/lib/report-error.ts:5-11` (its banner names "presence telemetry" as one of the three
  reasons it exists), `:25-46` (`reportSwallowed`).
- **Phase**: dedupe (and it closes a hole)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `report-error.ts` was written (bug audit M09) because "`console.error` on Vercel
  is a line in a log nobody reads, and Sentry only ever sees what is THROWN". Twelve call sites
  adopted it (`email-queue`, `retention`, `rate-limit`, `catchups`, `collection-intake`, auth).
  The two files whose contract the banner cites as the model ("the same contract touchLastSeen
  keeps", audit.ts:53) did not: both still do `if (NODE_ENV !== "production") console.error`,
  which in production is nothing at all. For presence that is a missing statistics row. For the
  audit log it means a failed `auditLog.create` -- the non-repudiation record for a block, a
  delete or a role change -- leaves no trace anywhere. `search-log.ts:44` carries the same
  dev-only shape ("Silent for the same reason touchLastSeen is"); that file is the
  member-surfaces lens's.
- **What to do**: Replace each catch body with `reportSwallowed("presence", err, { userId })` and
  `reportSwallowed("audit", err, { action: entry.action, targetId: entry.targetId })`.
  `reportSwallowed` keeps the console line in every environment and adds the Sentry capture in
  deployment, so the dev-loud behaviour the comments defend is preserved. Trim each comment to
  one line pointing at report-error.ts.
- **Saving**: ~6 lines; one silent-failure hole in the audit log closed; the third copy of the
  "loud in development" paragraph gone.
- **Risk & gate**: low. `npm run check`. `presence-rule.test.mjs` asserts `throw err` inside
  `recordVisit` (untouched) and nothing about the outer catch. `unattended-rule.test.mjs` pins
  `reportSwallowed` call shapes in email-queue and rate-limit only.
- **Confidence**: high.
- **Notes**: This is the brief's "dedupe" phase applied to an error-handling idiom, so the line
  count is tiny and the value is that the three guards stop disagreeing about what "swallowed"
  means.

### admin-analytics-09 - Three "fetch every row, then `.length`" counts should be counts
- **Where**: `src/lib/admin-analytics.ts:93,122` (`loadPeople.placed`: `userPlace.findMany({
  distinct: ["userId"], select: { userId: true } })` then `.length`), `:233-236,241`
  (`loadCatchups.answerers`: `catchupEntry.findMany({ distinct: ["authorId"] })` then
  `.length`); `src/app/(main)/admin/support/page.tsx:84-90` (`givers`:
  `contribution.findMany({ distinct: ["userId"] }).then(r => r.length)`).
- **Phase**: architecture (efficiency)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: Each pulls one column of every matching row across the wire to Vercel to count
  it. Prisma has no `count(DISTINCT)`, but every one of these has a relation filter that
  compiles to `EXISTS`: `User.places`, `User.catchupEntries`, `User.contributions` (schema User
  relation list lines 160, 169, 173). At 51 members the difference is nothing; at the 2,000 the
  spec plans for, `placed` is 2,000+ `UserPlace` rows per PeopleView open.
- **What to do**: `prisma.user.count({ where: { places: { some: {} } } })`;
  `prisma.user.count({ where: { catchupEntries: { some: {} } } })`;
  `prisma.user.count({ where: { contributions: { some: { status: "paid", livemode: true } } } })`.
  Or, if finding 03 is executed first, fold the first two into its raw statements as
  `count(DISTINCT ...)` subqueries (the snapshot script does exactly that at snapshot.mjs:101).
- **Saving**: rows over the wire (three lists -> three integers); 0 round trips; ~6 lines.
- **Risk & gate**: low. `npm run check`; compare the three numbers before and after.
  `admin-rule.test.mjs`'s support-page slice starts at `contribution.count(` and does not touch
  the `givers` query.
- **Confidence**: high. One caveat: the `givers` semantics include `userId IS NOT NULL` today;
  the relation form implies it.

### admin-analytics-10 - The audit page's `ACTION_LABEL` is untyped and already half-covers its vocabulary, the exact failure JourneyView was fixed for
- **Where**: `src/app/(main)/admin/audit/page.tsx:26-43` (`Record<string, string>` with 15
  keys); `src/lib/audit.ts:23-48` (`AuditAction`, 17 members, of which
  `razorpay.webhook_rejected`, `razorpay.contribution_reversed`, `razorpay.dispute_resolved`
  have no label); compare `src/app/(main)/admin/analytics/page.tsx:788-804` (`REASON:
  Record<LoginReason, string>` and the comment explaining why it is keyed on the union).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: The analytics page carries a nine-line comment about a bar that "sat on this
  page ... until somebody read it as a member being locked out", and its fix: "Keyed on
  LoginReason rather than string, so the gap cannot reopen -- adding a reason without a label
  here is now a tsc error". The audit page, written by the same hand for the same kind of map,
  is `Record<string, string>` and is already missing three actions the writer can emit, so a
  refund shows on the audit log as the raw slug `razorpay.contribution_reversed`.
- **What to do**: `const ACTION_LABEL: Record<AuditAction, string> = { ...three razorpay labels
  added... }` plus a separate `LEGACY_LABEL: Record<string, string>` for `account.delete` and
  the old sign-in events, looked up second. Import the type from `@/lib/audit`.
- **Saving**: ~0 lines; a class of bug made a compile error, matching the file next door.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.

### admin-analytics-11 - `publish()` in `admin-counts.tsx` hand-lists the keys it compares and has already fallen behind the interface
- **Where**: `src/components/admin/admin-counts.tsx:51-61`; `src/lib/admin.ts:179-189`
  (`AdminCounts`, which gained `photos` in `076be8c`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: The value-compare checks `waiting, messages, reports, people` and not `photos`.
  It is masked in practice because `waiting` is the sum that includes `photos`, so a photo
  landing changes both -- but the interface and the compare are now two lists that must be kept
  in step by hand, and the first divergence took five days.
- **What to do**: `const same = snapshot !== null && (Object.keys(next) as (keyof
  AdminCounts)[]).every((k) => snapshot![k] === next[k]);` -- shorter and cannot drift.
- **Saving**: ~4 lines.
- **Risk & gate**: low; `npm run check`; open two admin routes and confirm the rail count
  updates.
- **Confidence**: high.

### admin-analytics-12 - Stale-pointer and stale-count hygiene batch
- **Where**: (a) `src/lib/admin-analytics.ts:18-21` -- "Money filters on `livemode` EVERYWHERE
  ... turns a developer's test payment into revenue on a page the owner reads as fact": there is
  no money query left in this file (audit 1 deleted `loadSupport`); this paragraph describes
  deleted code. (b) `src/app/(main)/admin/layout.tsx:18-22` -- "There are eleven routes now" (14)
  and "`requireAdmin()` in admin-actions.ts" (the guard is `requireAdminAction` in `lib/admin.ts`;
  admin-actions.ts keeps only a one-line alias). (c) `src/lib/admin.ts:26-27` -- same stale
  pointer. (d) `src/components/profile/admin-actions.ts:17-20` -- the alias
  `const requireAdmin = requireAdminAction` and its comment, kept only so four call sites
  (:123, :227, :286, :297) can use the old name. (e) `src/components/admin/admin-skeleton.tsx:2-3`
  -- "so nine routes cannot each invent their own" (14). (f) `src/components/admin/admin-nav.ts:32`
  -- `export interface AdminSectionDef` is used only inside its own file (`AdminNavGroup.sections`);
  the sidebar imports `AdminCountKey`, not this. knip flags it; audit 1 said "used at
  admin-nav.ts:43", which is true and is exactly why the `export` is unneeded. (g)
  `src/lib/admin.ts:202` vs `src/app/(main)/admin/(index)/page.tsx:80` vs
  `src/lib/admin-analytics.ts:69-71` -- three definitions of "members": the rail's People count is
  every row, the Overview tile "Members" is `isBlocked: false`, analytics' `countMembers()` is
  every row. The rail and the tile link to the same page and can disagree by the number of
  blocked accounts.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous (g is an owner pick between two
  correct answers)
- **Evidence**: read directly; each counted or grepped as stated. The repo's own rule for
  counts-in-comments is written at analytics/page.tsx:54-56 ("this used to name a count, and the
  count was wrong") and tabs.tsx:5-6.
- **What to do**: (a) delete the four lines. (b)(c)(e) replace the numbers with "every route"
  and the pointer with `requireAdminAction()` in `lib/admin.ts`. (d) rename the four call sites
  and delete the alias and its comment. (f) drop the `export`. (g) pick one -- I would count
  `isBlocked: false` everywhere a number is called "members" and leave the People list's own
  filtered count as it is, since that list can show blocked rows.
- **Saving**: ~15 lines; four stale statements gone; knip's admin line cleared.
- **Risk & gate**: low; `npm run check`. `admin-guard-rule.test.mjs` slices `adminBlockUser`
  and `adminDeleteUser` bodies and looks for `refuseSelfOrLastAdmin` -- renaming `requireAdmin`
  does not touch that. `gate-coverage.test.mjs`'s exemption table names `adminHidePost` with the
  note "(requireAdmin)" in prose only.
- **Confidence**: high.

### admin-analytics-13 - Shape and copy batch: hand-typed row types, a 25-line field-by-field copy, two duplicated ternaries, three "dirty -> Save" blocks, and `ACCOUNT_TYPES` twice
- **Where**: (a) `src/app/(main)/admin/mail/page.tsx:137-147` (`type Row`, eleven lines
  restating `ROW_SELECT`) and `src/app/(main)/admin/support/page.tsx:266-277` (`LedgerRow`,
  twelve lines restating the ledger select). (b) `src/app/(main)/admin/people/[id]/page.tsx:102-126`
  (25 lines copying `user` into `DetailPerson` field by field; only three fields change shape)
  and `:135-143` (nine lines for two ISO conversions). (c) the "which date is this Round waiting
  on" ternary written twice: `src/app/(main)/admin/catchups/(index)/page.tsx:94-103` and
  `src/app/(main)/admin/catchups/[catchupId]/page.tsx:167-176`, with the same comment above each.
  (d) `src/components/admin/people/person-detail.tsx:572-580`, `:610-616`, `:640-646` -- three
  copies of `{dirty && (<div className="flex justify-end"><Button ...>{saving ? "Saving..." :
  "Save X"}</Button></div>)}`. (e) `ACCOUNT_TYPES`: `person-detail.tsx:108-112` (values with
  labels) and `people/actions.ts:67` (values only) -- a fourth account type is two edits and the
  validator would silently coerce a label the form offers.
- **Phase**: hygiene / dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: read directly. For (a), `Prisma.OutboundEmailGetPayload<{ select: typeof
  ROW_SELECT }>` is the type Prisma already infers; for the support ledger `(typeof
  rows)[number]` cannot be used outside the component, so the `GetPayload` form applies there
  too. For (b), `{ ...user, verifiedAt: user.verifiedAt?.toISOString() ?? null,
  emailConfirmedAt: ..., createdAt: ..., photoTrusted: user.photoTrusted ?? false }` is
  type-checked against `DetailPerson` by the prop, and the extra `emailVerified` key is harmless
  in a spread. For (c), a `roundDueDate(round)` beside `ROUND_STATUS` in `catchup-status.ts`
  (already the two pages' shared vocabulary file) removes both copies. For (d), a local
  `SaveRow({ dirty, saving, label, onSave })` at the bottom of person-detail beside `Fact`/`Field`.
  For (e), export the values array from `admin-people.ts` (client-safe, already imported by the
  list) and derive the labelled list in person-detail from it.
- **What to do**: as per item. One commit, or fold into whichever finding touches each file.
- **Saving**: ~60 lines across five files; one vocabulary (account types) defined once.
- **Risk & gate**: low; `npm run check`; open a person page, both Catch-up pages, mail and
  support. `admin-rule.test.mjs` slices `adminUpdatePerson` and requires
  `batchTypeFromLeaving(`, `yearLeft`, `batchType,`, `tryRosterAutoVerifyQuietly(` -- moving
  `ACCOUNT_TYPES` out of the file does not touch that body.
- **Confidence**: high on (a)(c)(d)(e); medium on (b) -- a reviewer may prefer the explicit
  copy as documentation of the client contract; if so, skip (b) and lose ~20 of the 60 lines.

### admin-analytics-14 - `loadTrends` fetches every metric for ninety days when each view reads at most seven
- **Where**: `src/lib/admin-analytics.ts:40-55`; call sites
  `src/app/(main)/admin/analytics/page.tsx:167,305,646`; the keys each view reads are the fifteen
  `t("db.…")` calls (People 5, Content 7, Health 3).
- **Phase**: architecture (efficiency)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: The snapshot writes 26 `db` keys plus up to 8 `sentry`/`posthog`/`github` keys a
  night (snapshot.mjs `add(` calls, counted: 34); ninety days is ~3,000 rows per view open, of
  which ContentView uses ~630 and HealthView ~270. The function's own comment ("one query for
  the whole page rather than one per tile") is right about the query count and silent about the
  rows. Still one query either way.
- **What to do**: `loadTrends(keys: string[], days = 90)` with `where: { day: {...}, source:
  "db", metric: { in: keys.map(k => k.slice(3)) } }`; each view passes its list. Or leave the
  signature and add the filter with a per-view constant. Not worth more than that.
- **Saving**: ~2,000-2,700 rows over the wire per view open (roughly 50-70 KB of result set);
  0 round trips; ~0 lines.
- **Risk & gate**: low; `npm run check`; sparklines still draw on the three views.
- **Confidence**: high on the mechanics, low on whether it is felt -- it is a cheap win, listed
  last for that reason.

## Owner decisions

**Batch approval versus the review room (finding 01).** Two days before you asked for a room
where you could actually see a photograph, a "tick several and approve them in one press" bar
was added to the Content list. The room shipped, but the bar and the per-row Approve/Decline
buttons were left on the list, so today there are two places a photograph can be let in: the
room, one at a time and big, and the list, several at a time and 64 pixels tall. My
recommendation is to remove the list's approval controls and keep only the "N photos are waiting
for you" link into the room. If you want a way to let a trusted person's hundred photographs
through without looking at each one, that already exists: the "Skip the photo queue" switch on
their person page. Keeping both costs ~230 lines, two server actions, and a handler with a known
stuck-button bug; removing it costs nothing you asked for after 2026-08-30.

**The Compare tab and the per-member metrics query (carry-over from audit 1, unchanged).**
Still the largest single removable block in the analytics room (`compare.tsx` 282 lines +
`loadMemberMetrics` ~120 lines, one heavy CTE query). Nothing else depends on it. Audit 1
recommended keeping it and nothing has changed my view; recording that it is still there and
still optional.

**Spec drift, three items -- for you to say "build it" or "strike it".** (1) `docs/spec/admin.md`
§9.1 says the hoopoe tour button lives on `/admin`, gated on your email, and that a test asserts
its markup. No admin page reads `ADMIN_EMAIL` any more and `src/components/tour/` does not
exist; the tour entry lives in the demo bar. The paragraph is stale. (2) §9.5b's last paragraph
promises announcements (gap 10) and posting as the office account (gap 11) "also here" in the
review room. Neither is built anywhere (`grep -i announcement` finds only the lab and the demo
seed). (3) §2 says nine sections and eleven routes; there are eleven sections (Review and Audit
log were added) and fourteen routes. None of this is code to delete; it is a spec that has
drifted from a wing that moved fast, and a later session reading the spec first will be misled
by all three.

## Not-findings

Things that look like bloat and are verified intentional; do not re-litigate:

- **`worklistCounts()` running seven `count()`s on every admin page** (`lib/admin.ts:249-271`).
  Argued in-file at :235-247: seven tables, concurrent, each an index lookup, and the
  alternative is every route fetching rows so the rail can report a length. The argument holds
  for seven DIFFERENT tables; finding 03 is confined to fan-outs on ONE table, where it does not.
- **`requireAdminPage()` on all fourteen pages on top of the layout.** Pinned by
  `gate-coverage.test.mjs` ("every /admin page checks the role itself", B-024). The per-page
  comment was already cut to one line in audit 1 (`ae9df23`).
- **Fourteen `loading.tsx` files.** Framework convention; twelve are five-line `AdminSkeleton`
  wrappers. The audit log's bespoke one was RE-REFUTED at audit-1 fix time (its real shape is two
  bordered lists with no avatar) and the review room's bespoke one (`review/loading.tsx:1-9`)
  argues the same thing for a photograph-and-form shape. Both stand.
- **The admin-people / admin-content / admin-threads pair splits.** Each half's banner records
  the `Can't resolve 'dns'` production failure; each non-query half has a `"use client"`
  importer. Only the worklist pair lacks one (finding 06).
- **The review room's eight local components and 206 comment lines** (`review-room.tsx`). Each
  helper is used once, which is signature 1 of the six, but each carries a measured reason (the
  portrait `object-contain` fix, the `overflow-hidden` kills `sticky` note, the 110px swipe
  threshold argued against the contribute stage's 70px) and the file reads top-down because of
  them. Inlining would make a 769-line file harder, not easier.
- **The review room's own busy/`callAction`/toast handler** (`review-room.tsx:179-227`) rather
  than `useAdminAct`. Deliberate and documented at :107-112: the pile is local state and a
  `router.refresh()` per decision would refetch sixty rows between one photograph and the next.
  It uses `callAction` and a `finally`, so it has both of the hook's safeguards. This is the
  legitimate exception; `approveChosen` (finding 01) is not.
- **`people-list.tsx`'s hand-rolled `verify()` and `showMore()`.** Audit 1's not-finding holds:
  `verify` needs a per-row in-flight Set (two rows may be in flight at once; the hook holds one
  key) and an optimistic row update; `showMore` is pagination. Both have their `finally`.
- **`AdminCountsSync`'s module-level store** (`admin-counts.tsx`). The banner enumerates and
  rejects the three simpler options; the rail renders above the admin layout in the tree.
- **`parseAgent` hand-rolled** (`last-seen.ts:140-176`). Three buckets is the whole requirement;
  a UA-parsing dependency would be phase 8 in reverse.
- **The Overview's "Everything else" section repeating the sidebar's nav.** Spec §3: "`/admin`
  itself also lists the nine sections as rows, so the drawer is never the only way in"; it is
  `md:hidden`.
- **Two components named `StatTile`** (`analytics/stat.tsx:54` local, `admin-chrome.tsx:105`
  exported). Different props for different jobs (sparkline tile vs linked strip tile); only one
  is exported, so no name clash outside the folder. A merged tile would need the union of both
  prop sets.
- **`SESSION_GAP_MIN` still exported** (`last-seen.ts:18`, knip). Brief §4 lists it as a kept
  honesty check. Not re-proposed.
- **`admin-note.ts` (35 lines, one function) and `report-error.ts` (46 lines, one function).**
  Three and twelve callers respectively; each is the one place its contract is written down.
- **The 1.03 comment ratio in `admin-chrome.tsx`, 0.98 in `admin-review.ts`, 1.42 in
  `use-admin-act.ts`.** Read in full: owner quotes with dates, measured pixel numbers, audit ids.
  The repo's argued-constant idiom, not narration. One stale paragraph found in the whole
  territory (finding 12a).
- **`admin-analytics.ts`'s `PUBLISHED` constant versus `posts.ts`'s `PUBLISHED_ONLY`.** Not a
  duplicate: `PUBLISHED_ONLY` is `{ status: "published" }` alone; the analytics one adds
  `isHidden: false`. Different predicates, both correct for their readers.

## Audit-1 carry-overs in this territory

- `admin-analytics-01/02` (dead `loadSupport`, eight unread fields): **done** (`dbeda7e`); no
  unread field remains.
- `admin-analytics-03` (`countMembers`, `loadUsageBreakdowns`): **done**; both call sites verified.
- `admin-analytics-04` (`useAdminAct`): **done** (`0cada95`, plus `44e2b77` widening the return
  type); nine instances in five files. One new hand-rolled handler has appeared since (finding 01).
- `admin-analytics-05` (`AdminFilterBar`): **done** (`d16746f`); both lists use it.
- `admin-analytics-06` (worklist pair): **never compiled into the plan; still true** (finding 06).
- `admin-analytics-07` (dead exports): partly done; `AdminSectionDef` still exported (finding
  12f); `SESSION_GAP_MIN` deliberately kept.
- `admin-analytics-08` (Catch-up status maps): **done** (`7d6ae13`, `catchup-status.ts`).
- `admin-analytics-09` (audit skeleton): **re-refuted at fix time**; not re-proposed.
- `admin-analytics-10` (thread member select): **done** (`fe9eaf6`, `THREAD_MEMBER_SELECT`).
- `admin-analytics-11` (`MAIL_TONE`): **done** (`a987cbc`); the row itself was not (finding 05).
- `admin-analytics-12/13` (hygiene, B-024 comment): **done** (`18e2f0d`, `ae9df23`).
- Owner decision "Compare tab": still open, unchanged (above).
- Owner decision "four kinds of telemetry": `@vercel/analytics` was removed 2026-08-26
  (spec §9.9 records it); three remain (Visit, PostHog, MetricSnapshot). Moot.
- Refuted row "the admin audit-log skeleton": respected.

## For other lenses

- **security / write-path**: the twenty unaudited admin verbs listed under Answers; specifically
  `declinePhoto` (`collection/actions.ts:1157`), `dismissMail` (`admin/mail/actions.ts:73`) and
  `adminRemovePhoto` (`collection/actions.ts:1229`) destroy data with no `writeAudit`. The
  `AuditAction` union would need `admin.decline_photo`, `admin.dismiss_mail`,
  `admin.remove_photo` (and arguably `admin.remove_post`/`admin.remove_comment`). Not bloat; the
  opposite.
- **collection**: `approvePhoto` and `approvePhotos` (`collection/actions.ts:1037-1099`) become
  dead if finding 01 executes; `approvePhoto` also lacks the `approved: false` guard that
  `approvePhotos` and `saveReview` both carry, so two of the three approval writers are
  idempotent and one is not.
- **scripts**: `scripts/ops/snapshot.mjs:103-104` (finding 04); and, still true from audit 1,
  the snapshot writes eleven `db` keys no page reads (`members.blocked`, `members.active_30d`,
  `bookmarks.total`, `photos.loves`, `catchups.prompts`, `mail.failed`, six `contributions.*`)
  plus every `sentry`/`posthog`/`github` key. Probably deliberate history-accumulation; confirm.
- **member-surfaces**: `src/lib/search-log.ts:44-70` swallows to a dev-only console line, the
  same shape finding 08 fixes in two files.
- **data-layer / mascot**: `User.bio` (schema line 17). `admin-analytics.ts:761-764` says it is
  "retired -- nothing in the shipped profile renders it, and its one remaining writer is a stale
  onboarding action". But `components/mascot/moments/celebration-signals.tsx:34-46` still READS it
  as one of four fields that must all be filled for the "profile complete" moment; if nothing
  writes `bio` any more that moment can never fire. Somebody should decide whether `bio` is dead
  (drop the column, fix the mascot signal to read `about`) or alive (fix the analytics comment).
- **bundle**: the three heaviest admin routes are +93 KB, +93 KB and +61 KB raw over `/admin`'s
  1,064 KB, attributed by string search of the chunks: `/admin/content` = content-list with the
  moderation dialog and dropdown inlined (`3tuzyfox2fbgc.js`, 26 KB), a textarea/dialog chunk
  (20 KB), the filters kit (`0k9tt65hqnnyo.js`, 23 KB, shared with `/admin/people`) and the
  combobox behind `FacetSelect` (`1unb30olej8fp.js`, 31 KB, shared); `/admin/people/[id]` =
  `LocationPicker` plus its combobox (`0_mmjokhy1byo.js`, 53 KB), person-detail (30 KB), and a
  17 KB chunk I could not name; `/admin/review` = `PhotoQuestions` with popover and dropdown
  (31 KB), review-room with motion's drag (21 KB), and a 17 KB popover chunk. All owner-only
  routes; `ModerationDialog` is statically imported by content-list and report-list while
  `post-card.tsx:76` and `collection-client.tsx:83` load it with `next/dynamic` -- a
  consistency nit worth ~5 KB on two admin routes, not a finding on its own.
- **lib-core-config**: `src/app/(main)/layout.tsx:74-78` (finding 07) is that lens's file; the
  proposal is here because the cost is presence's.
- **docs**: `docs/spec/admin.md` §2, §9.1, §9.4 (two-chip rule vs the shipped one-chip rule
  argued at `people-list.tsx:191-219`), §9.5b last paragraph -- the drift listed under Owner
  decisions.

## Metrics

- Lines read in territory: 12,655 (routes 3,774; components 4,832; libs 3,165; tests 884) plus
  ~2,800 outside it for verification (spec 622, audit-1 report 526, admin-actions.ts 306, the
  collection/feed/messages action excerpts ~330, snapshot.mjs ~130, the (main) layout excerpt,
  people-select.ts, schema excerpts, fix-prompt session 6).
- Biggest files: `admin-analytics.ts` 1,165 (850 code / 240 comment), `analytics/page.tsx` 879,
  `person-detail.tsx` 844, `review-room.tsx` 769 (517 code / 206 comment), `people/actions.ts`
  438, `content-list.tsx` 427.
- Comment-heaviest (comment/code, cloc): `use-admin-act.ts` 1.42, `admin-chrome.tsx` 1.03,
  `admin-person-row.tsx` 0.99, `admin-review.ts` 0.98, `admin.ts` 0.83, `people/actions.ts` 0.79,
  `last-seen.ts` 0.69, `audit.ts` 0.78. All verified as argued constants; one stale paragraph
  (finding 12a) in ~1,400 comment lines.
- `components/admin` comment ratio 0.25 (charter's lead): the low ratio is `person-detail.tsx`
  (41/757), `content-list.tsx` (44/363), `compare.tsx` (23/240), `report-list.tsx` (7/176) --
  JSX-heavy files where narration would be noise. No copy-paste found in them beyond findings
  05 and 13.
- `"use client"` files in territory: 11 of 24 components (`admin-counts`, `admin-filter-bar`,
  `content-list`, `mail-rows`, `thread-view`, `moderation-dialog`, `people-list`,
  `person-detail`, `report-list`, `review-room`, `use-admin-act`); every one holds state or
  handlers. `thread-list`, `admin-person-row`, `admin-chip`, `admin-chrome`, `admin-skeleton`
  and all six analytics components are server components. The analytics room renders fully on
  the server.
- Database calls per exported analytics loader (awk over `prisma.` and `$queryRaw`): listed
  under Answers; per view: Live 7, People 18, Content 24, Rhythms 4, Faces 10, Reach 8,
  Joining 5, Compare 1, Health 10; layout adds 8 to every admin route.
- Sparkline keys read by the page: 15; keys the snapshot writes: 34 (26 `db`); drifted: 2.
- `useAdminAct` instances: 9 in 5 files. Hand-rolled equivalents: 3 (two argued, one new).
- `AdminPersonRow` consumers: 3 (`people-list`, `thread-list`, `thread-view`).
  `AdminFilterBar` consumers: 2. `catchup-status.ts` consumers: 2. `ModerationDialog`
  importers: 7 (2 in admin).
- `writeAudit` call sites: 16 across 9 files; `auditLog.create` sites: 1.
- Rule-test pins with live subjects: all 5 files; no pin whose subject is gone. `admin-rule`'s
  `keyed >= 10` matches exactly ten `GROUP BY u.id` sites today (7 in `loadFaces`, 3 in
  `loadInteractions`); finding 03 does not touch those queries.
- Route first-load JS (raw): 14 admin routes from 1,064 KB (`/admin`) to 1,157 KB
  (`/admin/content`, `/admin/people/[id]`); all within +93 KB of the wing's baseline.
- Estimated honest saving if every autonomous finding executes: ~110 lines, 1 file, ~25 round
  trips per analytics view open on the three heaviest views, 2 writes off the render-blocking
  path of every authenticated page, 1 clone, 2 metric definitions reconciled, 1 silent-failure
  hole closed. Plus, if the owner accepts finding 01: ~230 lines, 2 server actions, 1 approval
  writer.
