# admin-analytics - refactor audit 3 report

Territory T06: the admin panel (`src/app/(main)/admin/**`: 33 files, every section, the 14 `loading.tsx`
of the 2026-09-21 series, the four `actions.ts`), the admin components (`src/components/admin/**`, 24
files), the member-side analytics components (`src/components/analytics/**`, 4 files), the admin lib
(`src/lib/admin*.ts`, `last-seen.ts`, `audit.ts`, `login-attempt.ts`, `stats-exclusion.ts`, plus
`page-label.ts`, which only the analytics room imports), the five rule tests that act as its spec, and
`src/app/api/presence/route.ts`. Audit-only; nothing in the tree was changed. Date 2026-09-24, HEAD
`70570bcd`. Files in territory: 83 (14,012 lines; cloc 9,752 code / 3,354 comment / 906 blank);
read fully: 83.

## Coverage
- Read fully: all of `src/components/admin/**` (24), `src/components/analytics/**` (4),
  `src/app/(main)/admin/**` (33, every page, layout, loading and actions file), `src/lib/admin.ts`,
  `admin-analytics.ts`, `admin-content.ts`, `admin-content-query.ts`, `admin-people.ts`,
  `admin-people-query.ts`, `admin-review.ts`, `admin-threads.ts`, `admin-threads-server.ts`,
  `admin-worklist-query.ts`, `admin-note.ts`, `last-seen.ts`, `audit.ts`, `login-attempt.ts`,
  `stats-exclusion.ts`, `page-label.ts`, `admin-rule.test.mjs`, `admin-guard-rule.test.mjs`,
  `login-attempt-rule.test.mjs`, `presence-rule.test.mjs`, `stats-exclusion-rule.test.mjs`,
  `src/app/api/presence/route.ts`; `docs/spec/admin.md` in full (726 lines).
- Read for context (outside the territory, to verify a claim): `src/app/(main)/layout.tsx` (whole),
  `src/lib/auth.ts:360-432` (session callback), `src/components/layout/sidebar.tsx:1-60, 184-200,
  326-395, 590-670`, `prisma/schema.prisma:1440-1680` (MetricSnapshot, Visit, SearchLog, ContentView,
  LoginAttempt), `src/lib/email-queue.ts:836-870` (`mailHealth`), `src/components/posts/comments-section.tsx:1-40,
  870-900`, `post-card.tsx:74-90`, `src/components/profile/admin-profile-tools.tsx` (whole),
  `src/app/(main)/profile/[id]/page.tsx:430-455`, `src/lib/contribution-state.ts:55-110`,
  `src/lib/utils.ts:465-480`, `src/lib/people-select.ts`, `scripts/ops/snapshot.mjs` (the metric
  list and the vendor collectors, read not run), `src/lib/threads-rule.test.mjs:100-162`,
  `e2e/loading-fallbacks.spec.ts:60-80`, `scripts/qa/audit-status.mjs` (the admin probes),
  `prisma/migrations-manual/2026-09-07-drop-unused-indexes.sql` and `-drop-bounce-kind.sql`, the
  `29f15f7d` version of `last-seen.ts`, the `ec979e4c` diff of the analytics page.
- Raw outputs used: `db-statements-live.json` (every statement touching Visit, User.lastSeenAt,
  MetricSnapshot, AuditLog, LoginAttempt, SearchLog, ContentView, OutboundEmail),
  `db-indexes-live.json`, `db-tables-live.json`, `db-columns-live.json`, `db-stats-reset.json`,
  `knip-repo-plus-lab.txt`, `jscpd.txt`, `cloc-by-file.csv`, `use-client.txt`,
  `dynamic-imports.txt`, `type-sludge.txt`, `route-js.txt`, `env-flags.txt`.
- Skimmed (why): none in the territory.
- Not read (why): nothing in the territory. `review-room.tsx`'s imported collection components
  (`photo-questions.tsx`, `file-says.tsx`) are collection-media's and were not read.
- Uncommitted edits seen (someone else's WIP): none — `git status --short` over every territory path
  is clean at 2026-09-24.
- Other reports consulted (their "For other lenses", as instructed): collection-media, catchups-ui,
  catchups-lib, fresh-code, tracked-weight, lab-catchups, bundle-build. catchups-ui routed two items
  here (the reading room's `intro`/`accepted`/`theme` reads, and `page-label.ts`'s retired Catch-up
  paths); both are verified and folded in (15, For other lenses). fresh-code-18 called the presence
  series clean; I agree about the series and found the drift in the surfaces around it instead.

## Summary
The admin wing is a 2026-08-18 rebuild that has been refined almost daily since, and it shows: no dead
files, three unused exports (one of them settled by audit 2), no commented-out code, every async route
with its own warm skeleton, and a comment ratio (0.34) far below the lib's. The structural well is
**moderate, not deep**, and its best water is not in admin at all but in **admin code that ships to
members**: the admin rail and its count store ride in every member's shell (01), the moderation dialog is
statically bundled into every comments chunk while its three sibling call sites load it lazily (02), and
the profile page's admin tools card (a second, drifted copy of the person page's tools, which the spec
said should be one component) is in the first load of the heaviest member route (03). Inside admin the
real wins are drift points rather than lines: the rail counts and the worklist spell the same six
predicates in two files held together by "change one, change the other" (05); the rail's value-compare
misses one of its five fields (06); the audit page ships raw slugs for three payment actions and every
sign-in reason despite a test written to stop exactly that one page over (08); the People row computes a
five-state email taxonomy and reads one state (07). One DB object is dead (04: 88 KB index, 0 scans).
Projected: ~335 source lines from the autonomous rows, ~10-15 KB raw client JS off member routes, one
index, and 5-10 fewer queries across the admin reads; 20 structural / 4 cheap.

The charter's leads all resolve, and none of them is the finding it looked like: the 95 % no-op
`lastSeenAt` UPDATE is cumulative history from before the 2026-09-05 gate; the seven `Visit` statement
shapes are one live writer plus three retired versions (the 25,177-call geo-less one is localhost, which
is the stats-exclusion story told by the statement log); the 55 ms nested count is the nightly
`snapshot.mjs`, not the Overview; `AdminCountKey` is a hand copy of `keyof AdminCounts`. And
`admin-analytics.ts` should stay one module: four rule tests use it as their choke point.

## Findings

### admin-analytics-01 - Take the admin rail and its count store out of every member's shell
- **Where**: `src/components/layout/sidebar.tsx:34-35` (`import { ADMIN_NAV, isAdminRoute, isAdminSectionActive } from "@/components/admin/admin-nav"`, `import { useAdminCounts } from "@/components/admin/admin-counts"`), `:326-395` (the "THE ADMIN NAV." docblock and `function AdminNavLinks`), its two render sites `:663-664` and `:742-743` (`{inAdmin ? (<AdminNavLinks ...`), the predicate uses `:428`, `:449`, `:601`; `src/components/admin/admin-nav.ts:1-151` (eleven lucide icons at `:1-14`, `ADMIN_NAV`, the two predicates at `:143-151`); `src/components/admin/admin-counts.tsx:1-78`.
- **Phase**: relocate
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `sidebar.tsx` is in the (main) shell tier that bundle-build measured on all 39 member routes ("sidebar + sheet + Tree + banner + next-auth/react 46.8 KB"; tier 366,738 B raw / 122,984 B gz). It imports `ADMIN_NAV` and `useAdminCounts` statically. `admin-nav.ts` imports 11 icons, of which the sidebar already imports two (`Images`, `MessagesSquare`, sidebar.tsx:6-20); the other nine (`ListChecks, Inbox, Flag, Users, FileText, IndianRupee, Mail, ChartLine, ScrollText`), the nav data, `AdminNavLinks` and the module-level count store are downloaded by every member and executed only when `user.role === "admin" && isAdminRoute(pathname)` (`:601`). Source sizes: admin-nav.ts 4,231 B, admin-counts.tsx 2,757 B, AdminNavLinks ~2 KB.
- **What to do**: (1) Move `AdminNavLinks` (sidebar.tsx:326-395) into `src/components/admin/admin-nav-links.tsx` together with the `ADMIN_NAV`/`useAdminCounts` imports. It uses `NavRow` (sidebar.tsx:184-289): move `NavRow` to `src/components/layout/nav-row.tsx` and import it from both, rather than exporting it from sidebar (avoids a sidebar ↔ lazy-module cycle). (2) Split the two predicates `isAdminRoute`/`isAdminSectionActive` out of `admin-nav.ts` into an icon-free module (or inline `isAdminRoute` in sidebar; it is two comparisons) so sidebar's remaining static import pulls no icons. (3) In sidebar: `const AdminNavLinks = dynamic(() => import("@/components/admin/admin-nav-links").then((m) => m.AdminNavLinks))`, and for admins only, warm it on mount: `useEffect(() => { if (user.role === "admin") void import("@/components/admin/admin-nav-links"); }, [user.role])`, so the first entry into /admin never shows an empty rail. (4) `(index)/page.tsx` and `(index)/loading.tsx` keep importing `ADMIN_NAV` directly (admin-only routes).
- **Saving**: an estimated 6-9 KB raw / ~3 KB gzip off the shell tier of all 39 member routes; ~0 source lines (a move). Estimate from source sizes; the bundle lens should measure with the analyzer before and after.
- **Risk & gate**: medium. The active marker is a `layoutId` pair in one marker group (`markerId="nav-desktop"`) spanning the account section's Admin row and the admin list; the lazily mounted list must render inside the same LayoutGroup/AnimatePresence it does today. Gates: `npm run check`; `e2e/sidebar.spec.ts` ("the account panel collapses when you enter admin"); `npm run visual`; by hand at 1440x900 and 390x844: click Admin from /feed, the pill must glide up into the admin list with no blank rail frame; reload /admin directly (the preload path).
- **Confidence**: medium. Would change my mind: the analyzer showing these nine icons already in the shell through another importer (the bell, the mobile drawer), which would halve the saving.
- **Notes**: Rejected alternative: drawing the admin rail from the admin layout through a portal; `admin-counts.tsx`'s docblock already explains why the admin layout cannot reach the rail (it sits above it in the tree). The count store could stay static (it is ~0.8 KB compiled) if the move of the store complicates `AdminCountsSync`, which the admin layout imports directly and is admin-only anyway; moving `useAdminCounts`' consumer is what matters. Related: 03 and 02 are the same class of leak.

### admin-analytics-02 - Load the moderation dialog lazily in the comments section, as the other three sites already do
- **Where**: `src/components/posts/comments-section.tsx:17` (`import { ModerationDialog } from "@/components/admin/moderation-dialog";`) and its one render `:881-888` (`{viewerIsAdmin && (<ModerationDialog ...`); the pattern to copy: `src/components/posts/post-card.tsx:84-87`, `src/components/letters/letter-menu.tsx:66-67`, `src/components/collection/collection-client.tsx:80-81`.
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/dynamic-imports.txt` lists three `dynamic(() => import("@/components/admin/moderation-dialog")...)` sites; `comments-section.tsx` is the fourth importer and the only static one. The comments section is itself lazy (post-card.tsx:74, reader-parts.tsx:514, letter-engagement.tsx:23) and is opened by every member who reads a thread on the feed, a letter or an Edition, so every comments chunk carries an admin-only dialog (3,621 B of source) that renders only when `viewerIsAdmin`. Audit 2's B11/B12 ("moderation dialogs lazy") is marked done in bundle-build for post-card and letter-menu; this site was missed.
- **What to do**: replace line 17 with `const ModerationDialog = dynamic(() => import("@/components/admin/moderation-dialog").then((m) => m.ModerationDialog), { ssr: false });` (add `import dynamic from "next/dynamic"`), exactly as post-card.tsx:84-87. The `{viewerIsAdmin && ...}` guard stays, so non-admins never request the chunk.
- **Saving**: ~1.5-2.5 KB raw JS out of the comments chunk for every non-admin member (the dialog's own module plus `ShieldCheck`; `Dialog`, `Textarea`, `Button`, sonner and `callAction` are shared and stay); +3 lines.
- **Risk & gate**: low. `npm run check`; as admin, open a feed post's comments and remove a comment through the dialog (it must open on first click); as a member, the comments chunk no longer contains "Remove this".
- **Confidence**: high. Would change my mind: nothing structural; only the byte figure is an estimate.
- **Notes**: bundle-build lists B11/B12 as done; this is the fourth, forgotten site of the same row.

### admin-analytics-03 - One set of admin tools, not two: the profile page's Admin tools card
- **Where**: `src/components/profile/admin-profile-tools.tsx:1-194` (whole file; note, verify/unverify with a confirm dialog, block/unblock with a confirm dialog, delete with a typed confirm), mounted from `src/app/(main)/profile/[id]/page.tsx:13` (static import) and `:440-448` (`adminNode={isAdmin && !isOwnProfile ? (<AdminProfileTools ...`); the complete set lives at `src/components/admin/people/person-detail.tsx` (Standing, Powers, Careful, NoteCard).
- **Phase**: dedupe
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: `docs/spec/admin.md` §9.4: "`src/components/profile/admin-profile-tools.tsx` (the same tools embedded on a member's public profile) and this page should share one component rather than drift into two." They drifted: the profile card confirms Verify through a dialog, the person page verifies in one click; the profile card has no merge, role, photo-trust, places or mail. Both call the same five actions in `admin/people/actions.ts`. Because `profile/[id]/page.tsx` imports the client component statically, it is part of the route's client entry for every visitor; `/profile/[id]` is already the heaviest shipped route (`raw/route-js.txt`: 1,240 KB raw, 261 KB private).
- **What to do**: owner decision OD1. (a) Replace the card with a single admin-only link "Open their admin record" to `/admin/people/${user.id}`, passed through the existing `adminNode` prop (`letterhead-profile.tsx:312, 345, 1569-1571` renders it beside the flag control, so the prop stays); delete `admin-profile-tools.tsx`. (b) Keep the card, load it with `next/dynamic` inside the admin branch, so no other visitor downloads it. (c) Leave it.
- **Saving**: (a) −194 lines, one of two drifted tool UIs, and the card's JS (est. 5-8 KB raw with its dialogs' share) off the profile route for everyone; (b) the same bytes, +4 lines; (c) nothing.
- **Risk & gate**: low for (b), low-medium for (a) (an owner habit changes). `npm run check`, `npm run visual` (profile routes are in `ROUTES`), `gate-coverage.test.mjs` (the actions do not change). For (a) screenshot a member's profile as admin at 1440 and 390 (the link sits where the card sat).
- **Confidence**: medium on the byte figure (not measured), high on the duplication.
- **Notes**: the verify-flow difference (dialog vs one click) is itself a small inconsistency the owner may want settled either way. Related: 01, 02 (the same leak class), 12 (the person page's own cleanup).

### admin-analytics-04 - Drop the MetricSnapshot index no read can use, and let the trend read ask only for what it draws
- **Where**: `prisma/schema.prisma:1477-1478` (`// The room's read: one metric's line over time.` / `@@index([source, metric, day])`); created by `prisma/migrations-manual/2026-08-19-analytics.sql:41-42`; the only reader `src/lib/admin-analytics.ts:37-52` (`export async function loadTrends(days = 90)`, `where: { day: { gte: ago(days) } }`), its stale sizing comment `:33-35` ("at 27 metrics a day, ninety days is ~2,400 rows"); callers `src/app/(main)/admin/analytics/page.tsx:183, 321, 662` (all `loadTrends(90)`).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/db-indexes-live.json`: `MetricSnapshot_source_metric_day_idx` idx_scan 0, 90,112 B, over a window open since 2026-05-22. The only query on the table filters on `day` alone and orders by `day`, which a `(source, metric, day)` btree cannot serve (leading column `source`); the unique `(day, source, metric)` could, and at 1,155 rows the planner seq-scans (`db-tables-live.json`: MetricSnapshot seq_scan 429 ≈ the 428 Live-view opens in statement #61; idx_scan 1,313 = the nightly upsert's ON CONFLICT probes of the unique key, 37 nights × ~35 rows). `rg metricSnapshot` finds one reader (`loadTrends`) and one writer (`scripts/ops/snapshot.mjs:322`, `ON CONFLICT ("day","source","metric")`). The collector writes 35 metrics a night (snapshot.mjs:130-270), not 27, and each view draws 2-8 of them (People 5, Content 7, Health 3) while fetching all 35 × up to 90 days (~3,150 rows at steady state).
- **What to do**: (1) Delete `schema.prisma:1477-1478`; write `prisma/migrations-manual/2026-09-XX-drop-metricsnapshot-source-index.sql` with `DROP INDEX IF EXISTS "MetricSnapshot_source_metric_day_idx";` plus the evidence paragraph, modelled on `2026-09-07-drop-unused-indexes.sql` (order does not matter for an index; run on production and `--env .env.demo`); `npx prisma generate`. (2) Give `loadTrends` a key list: `loadTrends(keys: string[])` → `where: { day: { gte: ago(90) }, source: "db", metric: { in: keys.map(k => k.replace(/^db\./, "")) } }`, and have each view pass the keys it reads (`PeopleView`: `db.members.total/verified/active_7d/placed/dark_mode`, etc.). (3) Fix the comment to "35 metrics" or drop the number. Note `presence-rule.test.mjs:105` scrapes `days\s*=\s*(\d+)` from this file; removing the `days = 90` default needs the window to stay visible to that scrape (keep `ago(90)` and add `ago\((\d+)\)` to the scrape, see 24).
- **Saving**: 1 DB object (88 KB, one index write per snapshot row, ~35 a night); 2 schema lines; 60-85 % fewer MetricSnapshot rows over the wire per analytics open.
- **Risk & gate**: low. Run first: `SELECT indexrelname, idx_scan FROM pg_stat_user_indexes WHERE indexrelname = 'MetricSnapshot_source_metric_day_idx';` on both databases (expect 0) and `SELECT indexdef FROM pg_indexes WHERE indexname = 'MetricSnapshot_source_metric_day_idx';` (expect a plain btree matching the declaration, i.e. not one of the eleven the schema header warns about). Gates: `npm run check`, open `/admin/analytics?view=people`, `?view=content`, `?view=health` and confirm the sparklines still draw.
- **Confidence**: high. Would change my mind: a scan count above 0 on the demo database.
- **Notes**: the prisma-demo-seed charter also lists this index among its zero-scan candidates; one migration file should carry it, whichever lens the orchestrator gives it to. The alternative of keeping the index "for when the key filter lands" does not hold: at 35 metrics × 365 days the table stays under 13k rows a year and the planner will keep choosing a scan.

### admin-analytics-05 - Keep the rail's counts beside the list they count, and delete the renaming layer between them
- **Where**: `src/lib/admin.ts:177-278` (`export interface AdminCounts`, `export async function loadAdminCounts()` which only renames `total` → `waiting`, `interface WorklistCounts` with nine fields of which four never leave the file, `async function worklistCounts()` and its six predicates); `src/lib/admin-worklist-query.ts:12-16` (the rule: "`worklistCounts()` in lib/admin.ts counts exactly these six predicates ... Change one, change the other.") and `:84-166` (`loadWorklist()` spelling the same predicates for rows); `src/components/admin/admin-nav.ts:29-30` (`export type AdminCountKey = "waiting" | "messages" | "reports" | "photos" | "people";`); `src/app/(main)/admin/(index)/page.tsx:83-94` (the Overview's own `prisma.user.count({ where: { isBlocked: false } })` and `prisma.user.count({ where: { createdAt: { gte: weekAgo } } })`).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: of the six queues, two share a constant or function (`AWAITING_REVIEW`, `overdueEditionWhere`), four are written twice in two files: `{ adminUnread: true }` (admin.ts:250 vs worklist:89), `{ status: "pending" }` (:251 vs :102), `{ status: "failed" }` (:259 vs :143), and the two verify queues, raw SQL `"isBlocked" = false AND "verifyState" = 'flagged'|'pending'` (admin.ts:254-255) against Prisma `{ isBlocked: false, verifyState: "flagged"|"pending" }` (worklist:127, :137). The house's own sentence for this is in admin.ts:196-199: "A count that disagrees with the list it points at is worse than no count at all." knip: `AdminCountKey` unused export; it is a hand copy of `keyof AdminCounts`. The Overview recounts `User` twice more on the same request the layout's FILTER aggregate already scanned it, and its "Members" tile (non-blocked, `(index)/page.tsx:85`) links to /admin/people, whose count (and the rail's People row, `count(*)` at admin.ts:256) includes blocked accounts: two member totals, one link apart.
- **What to do**: (1) Move `worklistCounts` into `admin-worklist-query.ts` and put the six `where`s in one exported table used by both functions: `export const QUEUE_WHERE = { message: { adminUnread: true }, report: { status: "pending" }, photo: AWAITING_REVIEW, flagged: {...}, verify: {...}, mail: { status: "failed" } } satisfies ...` (catchup keeps `overdueEditionWhere(now)`). Keep the User FILTER aggregate for the three User questions (the query-floor win from audit 2's C phase; see the docblock at admin.ts:229-238), but put it in the same file directly under the Prisma spelling, so the one remaining double spelling is visible in one screen. (2) Collapse `loadAdminCounts` + `WorklistCounts` into one function returning `AdminCounts` (`waiting` computed in place); export `loadAdminCounts` from `admin-worklist-query.ts` and update the one import in `(main)/admin/layout.tsx:2`. (3) `AdminCountKey` → `keyof AdminCounts` (import type), unexported. (4) Optional, same commit: wrap it in React `cache()` and add `members` (`count(*) FILTER (WHERE NOT "isBlocked")`) and `joinedWeek` (`FILTER (WHERE "createdAt" >= $weekAgo)`) to the aggregate, then read both on the Overview instead of its two `user.count`s. `admin.ts` keeps the guards (`requireAdminPage`, `requireAdminAction`, `requireAdminActor`, `refuseSelfOrLastAdmin`), which is what `admin-guard-rule.test.mjs:48-59` reads it for.
- **Saving**: ~−25 lines (the `WorklistCounts` interface, the mapping body, the duplicate `where` literals, `AdminCountKey`); one cross-file drift contract becomes one table; with step 4, −2 queries per Overview hard load.
- **Risk & gate**: low-medium. `npm run check` (admin-guard-rule still finds `refuseSelfOrLastAdmin` and `Serializable` in admin.ts); by hand: the rail's Overview count equals the number of rows on `/admin` when under 20 per queue; Review/Messages/Reports/People rail counts unchanged; `scripts/qa/audit-status.mjs` H18 reads `(index)/page.tsx` for an unbounded `user.findMany`, unaffected.
- **Confidence**: high on the duplication; medium on step 4's value (a few ms in bom1).
- **Notes**: step 4 does not change what the tile shows (it keeps the non-blocked meaning). Whether "Members" should equal the People count is a separate, tiny product question; I did not raise it as an owner decision because a blocked account is rare and the tile's meaning is defensible. Rejected: counting rows on every admin route to feed the rail (the admin.ts docblock already argues why that is worse).

### admin-analytics-06 - Compare every count when the rail decides whether anything changed
- **Where**: `src/components/admin/admin-counts.tsx:45-61` (`function publish(next: AdminCounts)`, `snapshot.waiting === next.waiting && snapshot.messages === next.messages && snapshot.reports === next.reports && snapshot.people === next.people`).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `AdminCounts` has five fields (admin.ts:181-191: waiting, messages, reports, photos, people); `publish` compares four and leaves out `photos`, the Review row's count. `waiting` is the sum of seven queues, so a photo-count change is usually carried by `waiting`, but not when another queue moves the other way in the same refresh (a photo approved while a verification request arrives): the Review row keeps its old number until something else changes. The field list is hand-maintained, which is how the fifth field was missed.
- **What to do**: replace the hand list with `const same = snapshot !== null && (Object.keys(next) as (keyof AdminCounts)[]).every((k) => snapshot![k] === next[k]);` and trim the docblock's first sentence accordingly.
- **Saving**: 0 lines; one drift class closed (a sixth count added to `AdminCounts` is compared automatically).
- **Risk & gate**: low. `npm run check`; by hand, approve a photo in /admin/review and watch the Review row's count move.
- **Confidence**: high.
- **Notes**: this is also a (small) correctness bug; flagged under For other lenses for the peer bug audit, whose folder I did not touch.

### admin-analytics-07 - The People row computes five email states and reads one
- **Where**: `src/lib/admin-people.ts:141-173` (the "How far a confirmation email has got" taxonomy docblock, `export type EmailState = "confirmed" | "waiting" | "queued" | "failed" | "none"`, `emailState` and `createdAt` on `PersonRow`); `src/lib/admin-people-query.ts:96-128` (the 13 hand-copied fields, `emailState: u.emailVerified ? "confirmed" : mailState(...)`, `createdAt: u.createdAt.toISOString()`, `function mailState`); the one reader `src/components/admin/people/people-list.tsx:225` (`if (p.emailState === "failed") return <Chip label="Email bounced" ...`).
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `rg emailState|EmailState src` finds only the type, the producer and the `=== "failed"` test. The list's own docblock (people-list.tsx:193-221) records why the other states stopped rendering ("Somebody who has not clicked their link yet is not your job ... What is left is the four states that genuinely want a person"). `createdAt` on `PersonRow` is read by nothing on the client (the keyset cursor is built from the Prisma row, admin-people-query.ts:112); 60 ISO strings travel per page for no reader. Spec §9.4 still describes two chips; the shipped list chose one, so the taxonomy is kept "verbatim" for a surface that no longer exists.
- **What to do**: replace `emailState: EmailState` with `mailFailed: boolean` on `PersonRow`; in the query, `mailFailed: !u.emailVerified && latest.get(u.id) === "failed"`; delete `mailState()` (:116-128), the `EmailState` type and its 12-line taxonomy docblock (keep one line saying the verify mail's latest status is looked up only for this page's unconfirmed ids); drop `createdAt` from `PersonRow`; build rows with a rest spread: `const { emailVerified, createdAt, ...rest } = u; return { ...rest, mailFailed }` in place of 13 field copies; update people-list.tsx:225 to `p.mailFailed`.
- **Saving**: ~−35 lines; a smaller People payload.
- **Risk & gate**: low; invisible. `npm run check`; `/admin/people?state=attention` still lists a member whose verify mail failed, with the "Email bounced" chip.
- **Confidence**: high. Would change my mind: an owner request to bring the email chip back (then restore from git).
- **Notes**: `admin.md` §4.2/§9.4 still describe the two-chip row; that doc drift is under For other lenses (docs).

### admin-analytics-08 - One label map per vocabulary: sign-in reasons and audit actions on /admin/audit
- **Where**: `src/app/(main)/admin/audit/page.tsx:26-43` (`const ACTION_LABEL: Record<string, string>` with 15 entries), `:86` (`{ACTION_LABEL[e.action] ?? e.action}`), `:113` (`<span ...>{a.reason}</span>`, the raw slug); `src/app/(main)/admin/analytics/page.tsx:804-820` (`const REASON: Record<LoginReason, string>`); `src/lib/login-attempt.ts:29-36` (`LoginReason`); `src/lib/audit.ts:11-21` (the docblock's restated list of action codes) and `:23-48` (`AuditAction`); the pin `src/lib/login-attempt-rule.test.mjs:74-90`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `AuditAction` has 17 members; `ACTION_LABEL` covers 14 of them (plus the legacy `account.delete`) and misses `razorpay.webhook_rejected`, `razorpay.contribution_reversed` and `razorpay.dispute_resolved`, all three written by `src/app/api/razorpay/webhook/route.ts:51, 59, 330, 410` — so a refund or a rejected webhook reaches the audit page as a raw dotted slug. The failed sign-ins list renders `a.reason` raw ("wrong-password"). The analytics page already labels the same reasons, keyed on `LoginReason` so that "adding a reason without a label here is now a tsc error" (page.tsx:804-811), and `login-attempt-rule.test.mjs`'s header says LoginAttempt "is written from one place and read from two" — but the test pins only one of the two readers. audit.ts:11-16's comment list omits the three razorpay actions the type below it declares.
- **What to do**: (1) Move `REASON` into `src/lib/login-attempt.ts` as `export const LOGIN_REASON_LABEL: Record<LoginReason, string>`; use it in `JourneyView` and on the audit page (`{LOGIN_REASON_LABEL[a.reason as LoginReason] ?? a.reason}`); retarget `login-attempt-rule.test.mjs:76-83` from the page to `login-attempt.ts` (same regex, new file and name). (2) Key `ACTION_LABEL` on the union: `const ACTION_LABEL: Record<AuditAction, string> = {...}` with the three new labels ("Payment webhook refused", "Gift given back", "Chargeback won" or the owner's wording), and keep the legacy strings in a small `LEGACY_ACTION_LABEL` (`"account.delete"`, `"signin.success"`, `"signin.fail"`) consulted as a fallback, since old rows carry them. (3) Delete audit.ts:11-16 (the list the type restates) and keep the legacy-actions paragraph (:18-21).
- **Saving**: ~−5 lines net; three raw slugs and every sign-in reason slug turn into words; a missing label becomes a type error in both maps.
- **Risk & gate**: low; visible to the admin only (labels instead of slugs). `npm run check` (login-attempt-rule retargeted); `scripts/qa/phase7-probe.mjs:150` checks for a "Verified" label on /admin/audit — kept.
- **Confidence**: high.
- **Notes**: the settled-report chip in `report-list.tsx:101` (`<Chip label={r.status} />`, "dismissed"/"reviewed") is the same slug-as-label pattern in a third place; fold a two-entry map in if the fixer is there anyway.

### admin-analytics-09 - Count the mail queue in one pass, the way the file next door already does
- **Where**: `src/lib/email-queue.ts:841-855` (`export async function mailHealth()`, three `prisma.outboundEmail.count(...)` over one table); callers `src/app/(main)/admin/(index)/page.tsx:89` and `src/app/(main)/admin/mail/page.tsx:42` (admin-only); the overlapping tally `src/lib/admin-analytics.ts:272-305` (`loadMail`, a five-predicate FILTER pass over the same table with the same `status IN ('queued', 'sending')` definition).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the house rule, in admin.ts:233-238: "three questions of ONE table ... one `FILTER` aggregate now ... Different tables stay different queries"; `loadMail` follows it ("Five predicates over one table, one pass. See loadPeople."), `mailHealth` does not. The layout's `worklistCounts` counts `status = "failed"` a third time on every admin hard load.
- **What to do**: rewrite `mailHealth` as one `$queryRaw` with `count(*) FILTER (WHERE "sentAt" >= ${startOfUtcDay()})`, `FILTER (WHERE status IN ('queued','sending'))`, `FILTER (WHERE status = 'failed')`. Optionally let `loadMail` call the same helper for its `queued` figure, or add `sentToday` to `loadMail`'s pass and have `mailHealth` be a projection of it; either way one definition of "waiting".
- **Saving**: −2 queries per `/admin` and `/admin/mail` load; ~−3 lines.
- **Risk & gate**: low. `mail-queue-rule.test.mjs` reads email-queue.ts for `outboundEmail.count` near the drain's precheck (`:167`, `:188`) — `mailHealth` is a different function, but re-run the suite. `npm run check`; the Mail strip reads the same three numbers before and after.
- **Confidence**: high.
- **Notes**: the file belongs to the mail/lib territory; the function's only callers are mine, so it is written up here. Audit 2 settled that email-queue.ts is not an outbox candidate; this touches one read helper, not that architecture.

### admin-analytics-10 - One person link for the admin wing
- **Where**: six hand-written "name → `/admin/people/{id}`, or a muted fallback" links: `src/components/admin/reports/report-list.tsx:69-85` (two), `src/components/admin/mail/mail-rows.tsx:91-100`, `src/components/admin/content/content-list.tsx:169-178`, `src/components/admin/review/review-room.tsx:645-650`, `src/app/(main)/admin/support/page.tsx:292-304`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `rg 'href={\`/admin/people/\${'` finds these six plus two row links that are `AdminPersonRow`s; the focus/underline class string `underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring` appears in six admin files. Four of the six also write their own "since deleted" fallback ("someone since deleted", "Account since deleted", the raw address, a muted name).
- **What to do**: add `AdminPersonLink({ id, name, fallback, className })` to `admin-chrome.tsx` (Link when `id`, muted span otherwise, the one class string, `className` for the weight each site uses: `font-semibold` in reports, `font-medium` elsewhere, `truncate` in the rows); replace the six sites.
- **Saving**: ~−20 lines; one class string instead of six.
- **Risk & gate**: low. `npm run check`; `npm run visual` (the admin routes are not in `ROUTES`, so screenshot `/admin/reports`, `/admin/mail`, `/admin/content`, `/admin/support`, `/admin/review` before and after at 1440 and 390).
- **Confidence**: medium-high; the risk is only in keeping each site's weight.
- **Notes**: deliberately not merged into `AdminPersonRow`, whose point is a fixed subtitle.

### admin-analytics-11 - One mail row mapper and one status table; the list itself can be a server component
- **Where**: `src/app/(main)/admin/mail/page.tsx:137-162` (`type Row` restating the Prisma payload, `function toRow`); `src/app/(main)/admin/people/[id]/page.tsx:138-149` (the same mapping inline, `personId: null, personName: null`); `src/components/admin/mail/mail-rows.tsx:23-59` (`MAIL_STATUS_TONE` and `STATUS_LABEL`, two parallel maps over the same four statuses; `mailStatusLabel`, a one-line wrapper; `mailKindLabel`, a switch) and `:1` (`"use client"` for a list whose only interactive part is the two buttons at `:124-145`); `src/app/(main)/admin/analytics/page.tsx:729-731` ("Kinds of email we send" renders `mail.byKind` with the raw kind slugs).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: two mappings from an `OutboundEmail` select to `MailRow` that differ only in the person pair; a hand-written `type Row` (10 lines) that Prisma already infers; two maps keyed on one vocabulary (the admin catch-up chips already use the `{ label, tone }` table shape, `catchup-status.ts`); the analytics room shows "verify", "reset", "password-changed" raw where mail-rows has words for them. `MailRows` is `"use client"` for `useAdminAct` in the failed list's two buttons; "Waiting to go" and "Recently sent" are static.
- **What to do**: (1) Export `ROW_SELECT` and `toMailRow(r)` from `mail-rows.tsx`'s server-safe sibling (e.g. `src/lib/admin-mail.ts`, client-safe, no prisma) and use it on both pages; type the input as `Prisma.OutboundEmailGetPayload<{ select: typeof ROW_SELECT }>` and delete `type Row`. (2) One `MAIL_STATUS: Record<string, { label: string; tone: ChipTone }>`; delete `mailStatusLabel`. (3) `MAIL_KIND_LABEL` as a map, exported, and used by `HealthView`'s "Kinds of email" panel. (4) Make `MailRows` a server component and move the two buttons into a `MailActions({ id })` client leaf.
- **Saving**: ~−25 lines; admin-only client JS shrinks by the static rows; raw kind slugs gone from Health.
- **Risk & gate**: low. `npm run check`; `/admin/mail` and a person page's "Mail we sent them" render identically; Try again and Clear still work on the failed list.
- **Confidence**: high.
- **Notes**: audit 2's E11 admin half (MailCard → MailRows, owner "16a") is what made the person page reuse `MailRows`; this finishes that merge on the data side.

### admin-analytics-12 - The person page: reuse StatTile and formatPaise, and write the save footer once
- **Where**: `src/components/admin/people/person-detail.tsx:765-799` (`function Tally`, a Link/div shell with `state-layer block focus-visible:... -outline-offset-2 outline-ring`, figure 17px, label 12px) and its grid `:308-330`; the primitive it re-implements `src/components/admin/admin-chrome.tsx:105-155` (`StatTile`, same shell, figure 20px) and `:165-182` (`StatStrip`, 3 or 4 columns); `:313-321` (`` `Rs ${Math.round(stats.contributionPaise / 100).toLocaleString("en-IN")}` ``); the three save footers `:558-566`, `:609-615`, `:639-645` with the three `useAdminAct` + `saving` pairs `:460-461`, `:587-588`, `:623-624`; the split import of one module `:31-44`; the two nested ternaries for the member state `:193-219`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `src/lib/utils.ts:469-480` (`formatPaise`) exists because "the admin Overview and the admin ledger each carried their own copy of the same expression, and they had already drifted on the currency mark" — this is a third copy, and it has drifted to "Rs" where the Overview and Support say "₹". `Tally` and `StatTile` share the shell, the focus ring, the Link/div branching and the tone rule; they differ in figure size and an optional icon.
- **What to do**: (1) `formatPaise(stats.contributionPaise)` for the "Given" tally (keep `"0"` for zero if wanted). (2) Replace `Tally` with `StatTile` inside `<StatStrip columns={2}>` (add `2` to `StatStrip`'s `columns` union: `grid-cols-2` without the `sm:` step). (3) A local `SaveBar({ dirty, saving, onSave, label })` for the three footers. (4) Merge the two `import {...} from "@/app/(main)/admin/people/actions"` blocks. (5) A `MEMBER_STATE: Record<"verified" | "flagged" | "other", { chip, value }>` lookup for the Standing fact.
- **Saving**: ~−40 lines.
- **Risk & gate**: low-medium; visible to the admin: the tally figures grow from 17px to 20px and "Rs" becomes "₹". Screenshot `/admin/people/<Jerry's id>` at 1440 and 390 before and after; `admin-guard-rule.test.mjs:69-76` needs `isSelf` to stay in the file.
- **Confidence**: high on the duplication; the visual delta is the one thing to show the owner.
- **Notes**: the page is `"use client"` top to bottom (799 lines) although its header, Standing facts and tallies are static; splitting it into a server shell with client cards is line-neutral and admin-only, so I am not proposing it (Not-findings).

### admin-analytics-13 - Admin reads that wait for no reason or fetch rows to count them
- **Where**: `src/app/(main)/admin/reports/page.tsx:82-89` (`const priors = await prisma.report.groupBy(...)` after the `Promise.all` at `:64-77`, independent of it); `src/lib/admin-analytics.ts:253-256` (`loadCatchups`: `answerers = await prisma.catchupEntry.findMany({ distinct: ["authorId"] })` after its `Promise.all`, independent, then `answerers.length`); `:104` (`loadPeople`: `prisma.userPlace.findMany({ distinct: ["userId"] })` → `placed.length`); `:218-221` (`loadContent`: a follow-up `user.findMany` to name the top authors); `:962-967` (`loadReading`: two separate `sum("count")` queries over ContentView differing only in `kind`); `:873-883` (`loadNotifications`: `notification.count()` and `notification.count({ where: { read: true } })`, one table).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the house rules this breaks are its own: "three questions of ONE table ... one FILTER aggregate" (admin.ts:233-238, loadMail/loadPeople comments) and C-080's "a leaderboard is keyed on who" (admin-rule.test.mjs:28-45: ten `GROUP BY u.id` leaderboards). The Content view launches 23 queries (loadTrends 1, loadContent 6+1, loadCatchups 3+1, countMembers 1, loadReading 1+3, loadInteractions 6) through a five-connection pool, two of them as serial second waves.
- **What to do**: (1) Reports: move the `priors` groupBy into the existing `Promise.all`. (2) `loadCatchups`: replace the separate `catchupEntry.count()` and the serial `answerers` findMany with one statement inside the `Promise.all`: `SELECT count(*)::int AS entries, count(DISTINCT "authorId")::int AS people FROM "CatchupEntry"` (one table, one pass; `prompts` and `loves` stay their own counts, being other tables). (3) `loadPeople`: add `(SELECT count(DISTINCT "userId") FROM "UserPlace")::int AS placed` to the FILTER tally and drop the findMany. (4) `loadContent`: replace `topAuthors` + the follow-up with a leaderboard `SELECT u.id, u."name", u."batchYear", count(*)::bigint AS n FROM "Post" p JOIN "User" u ON u.id = p."authorId" WHERE p.status = 'published' AND p."isHidden" = false GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8` through `personList` (it then also gets the duplicate-name hint every other leaderboard has). (5) `loadReading`: one query with `sum("count") FILTER (WHERE kind = 'photo')` and `FILTER (WHERE kind = 'edition')`, keeping `counted.user('"viewerId"')`. (6) `loadNotifications`: `count(*)`, `count(*) FILTER (WHERE read)` in one statement.
- **Saving**: −3 serial round trips (reports, catchups, authors) and −5 queries across the affected views (Content 23 → 20: authors, entries+answerers, the two ContentView sums; People 10 → 9; Health 6 → 5); no longer ships O(members) id rows to count them. Honest scale: functions run in `bom1` beside Supabase (`vercel.json`), so each saved round trip is a few ms; the win is pool pressure and fewer statements, not seconds.
- **Risk & gate**: low. `admin-rule.test.mjs` (the `GROUP BY u.id` count becomes 11, still ≥ 10); `stats-exclusion-rule.test.mjs` requires every Visit/SearchLog/ContentView read in the file to carry `counted.` (step 5 keeps it; the ≥ 29 site count drops by one, so recount and adjust the floor if needed); open `/admin/analytics?view=content`, `?view=people`, `?view=health`, `/admin/reports` and compare the numbers before and after.
- **Confidence**: high on each site; medium on whether the owner would feel any of it.
- **Notes**: `statsFilter()` also costs one serial round trip at the head of every activity view (its `excludedIds` lookup of the test account, stats-exclusion.ts:57-63). Hard-coding Jerry's id like `OWNER_USER_ID` would remove it, and production and local dev share one database so the id is the same in both; the file deliberately resolves it at read time, so I leave that as the owner's style and only note it. Not merged: the four `loadArrivals` groupBys and the three `loadSearches` groupBys (see Not-findings, GROUPING SETS).

### admin-analytics-14 - "Hide the post" is two server actions and ignores the first one's answer
- **Where**: `src/components/admin/reports/report-list.tsx:128-147` (`async () => { await adminHidePost(r.postId!); return adminResolveReport(r.id); }`); `src/app/(main)/admin/reports/actions.ts:22-41` (`adminHidePost`, only caller is this button) and `:92-101` (`adminResolveReport`); the Remove flow `report-list.tsx:180-191` (`adminRemovePost` then `adminResolveReport`); pin `src/lib/gate-coverage.test.mjs:197` (`adminHidePost: "admin-only moderation ..."`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: each press is two POSTs, each re-running `requireAdminAction()` and its own `revalidatePath`; the hide's `{ error }` is discarded, so a failed hide still settles the report as dealt with and tells the reporter so (`noteOnReportThread`). `rg adminHidePost` finds this caller and the gate-coverage map only.
- **What to do**: replace `adminHidePost` with `adminHideReportedPost(reportId: string, postId: string)` that checks the role once, hides, clears notifications, then calls `settleReport(reportId, "reviewed", ...)` and returns its result; update gate-coverage.test.mjs:197's key; the button calls the one action. Leave the Remove flow as is (its first half is the feed's shared `adminRemovePost`).
- **Saving**: −1 server-action round trip per "Hide the post"; ~−5 lines; the ignored error is closed.
- **Risk & gate**: low. `npm run check` (gate-coverage), `write-path-reviewer` (a server action changes), by hand on a test report.
- **Confidence**: high.
- **Notes**: also listed for the bug lens (ignored result).

### admin-analytics-15 - Dead reads, dead options and branches nothing can reach
- **Where**: (a) `src/app/(main)/admin/catchups/[catchupId]/page.tsx:71` (`intro: true`, selected, never rendered); (b) `src/app/(main)/admin/people/actions.ts:567-580` (`adminVerifyUser(userId, method: "office_list" | "admin_manual" = "admin_manual")`; all three callers pass one argument: person-detail.tsx:250, people-list.tsx:103, admin-profile-tools.tsx:144); (c) `src/lib/admin-threads-server.ts:148-182` (`openAdminNoticeThread(memberId, note, opts: { authorId?: string | null } = {})`, one caller `src/lib/admin-note.ts:25-27`, plus the 5-line note at `:159-163` about overrides removed on 2026-09-05); (d) `src/components/admin/analytics/stat.tsx:22-35, 40` (`case "money"` and `"money"`/`"count"` in the `kind` union; the page never passes either since the funnel moved to /admin/support); (e) `src/lib/page-label.ts:34-47` (`[/^\/catchups\/round\/:id/, ...]`, `[/^\/catchups\/:id\/answer/, ...]`, `[/^\/admin/, ...]` and the "most specific first" comment that exists for them); (f) `src/lib/admin.ts:34-38, 61-71` (`interface AdminSession { id; name; email }`, returned by `requireAdminPage`; the one caller that keeps the result reads `actor.id` only, people/[id]/page.tsx:30, 100); (g) `src/app/(main)/admin/content/page.tsx:33-37` and `src/lib/admin-content.ts:33-34` (the `?type=pending` → `/admin/review` redirect for pre-2026-08-30 bookmarks).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: (a) `grep -n intro` in the page: line 71 only. (b) three callers, all one-argument; the docblock itself says "both admin surfaces now let it [default]". (c) `rg openAdminNoticeThread`: one caller; `threads-rule.test.mjs:125-130` pins `kind: "notice"` inside admin-threads-server.ts. (d) `rg '"money"'`: stat.tsx only; `rg 'analytics/stat"'`: the analytics page only. (e) `pageLabel`/`trailLabels` run only on `Visit.paths` (admin-analytics.ts:409, 508-512), which only the beacon writes; the beacon and the route refuse `/admin` (presence-beacon.tsx:38, route.ts:53), and `/catchups/round/[editionId]` and `/catchups/[catchupId]/answer` are `permanentRedirect` pages, so `usePathname()` reports their destination. (f) `rg "= await requireAdminPage"`: one site. (g) no writer ever stored `type=pending` in a Notification: the only producer was the Overview's server-rendered href (`ae7d9c49`), replaced on 2026-08-30; the owner's own bookmark is the audience, and an unknown `type` already falls back to "all" (`readContentFilters`).
- **What to do**: (a) delete line 71. (b) drop the parameter, write `verifyMethod: "admin_manual"`, write `detail: "admin_manual"` in the audit call, trim the docblock to its first and last sentences. (c) fold `openAdminNoticeThread` into `notifyAdminNote` (admin-note.ts), dropping `opts` and the removed-overrides note; retarget `threads-rule.test.mjs:125-130` to admin-note.ts. (d) delete the `money` case and the two unused union members. (e) delete the three patterns and the ordering comment. (f) `requireAdminPage(): Promise<{ id: string }>`, delete `AdminSession`. (g) optional: delete the redirect, its comment, the `redirect` import, and the last paragraph of the `TYPE_OPTIONS` comment.
- **Saving**: ~−35 lines; one column not fetched per reading-room open; a server-action parameter no client can abuse (b); one exported type.
- **Risk & gate**: low. `npm run check` (threads-rule retarget for (c)); `write-path-reviewer` for (b) and (c); `/admin/catchups/<id>` renders unchanged.
- **Confidence**: high for (a)-(f); (g) is a taste call, harmless either way.
- **Notes**: the reading room's `accepted` reads (:98, :121, :229-234) and `theme` (:80, :201) are catchups-ui-21's and the data-layer's column questions; if those columns go, these lines go with them (For other lenses).

### admin-analytics-16 - One page-id pattern, not a regex in TypeScript and a copy of it in SQL
- **Where**: `src/lib/page-label.ts:12-14` (`export const ID_SEGMENT = /\/[a-z0-9]{20,}(?=\/|$)/g;`); `src/lib/admin-analytics.ts:462-470` (the comment "Ids collapse to ':id' first (the same rule as ID_SEGMENT in page-label.ts)" and the literal `regexp_replace(s.p, '/[a-z0-9]{20,}(?=/|$)', '/:id', 'g')`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip lists `ID_SEGMENT` as an unused export (its only other mention is that comment). The journey panels collapse ids in SQL and the live list collapses them in TypeScript; if the id shape changes (cuid2 is 24-25 chars), one side is updated and the Live view's pages stop matching its own trail labels.
- **What to do**: bind the pattern as a parameter: `regexp_replace(s.p, ${ID_SEGMENT.source}, '/:id', 'g')` (Postgres AREs read `\/` as `/` and support `(?=...)`), and delete the "same rule as" sentence. Keep the export.
- **Saving**: 0 lines; one drift point; knip clean.
- **Risk & gate**: low. `npm run check`; `/admin/analytics` Live view's "Pages people open" shows the same labels before and after (one live check of the regex in Postgres is worth doing: `SELECT regexp_replace('/profile/cmr1uahuj000004jx4dc4p8co', '\/[a-z0-9]{20,}(?=\/|$)', '/:id', 'g');` → `/profile/:id`).
- **Confidence**: medium-high (the ARE escape behaviour is the one thing to confirm with that SELECT).
- **Notes**: `stats-exclusion-rule.test.mjs:45` ends a raw statement at its first `GROUP BY|ORDER BY|LIMIT|backtick`; a `${...}` inside the CTE is fine.

### admin-analytics-17 - Small clones inside the wing
- **Where**: (a) the "what date is this Edition waiting on" nested ternary, twice: `src/app/(main)/admin/catchups/(index)/page.tsx:95-104` and `src/app/(main)/admin/catchups/[catchupId]/page.tsx:175-184`; (b) the stage ink: `src/components/admin/review/review-room.tsx:84-89` (`const STAGE = "rgba(24, 25, 20, 0.94)"`, whose own docblock says "Two rooms looking at one photograph should be looking at it on one material") duplicating `src/components/common/image-viewer.tsx:155` (`const BACKDROP = "rgba(24, 25, 20, 0.94)"`), and the Resolution chip's `bg-[rgba(24,25,20,0.72)]` (`:669`); (c) `BirdAvatar user={{ id, name, photoUrl, birdOverride }}` rebuilt from objects that already have that shape: `[catchupId]/page.tsx:279-285`, `src/components/admin/analytics/presence.tsx:63-70`; (d) `optionLabel` written three times — `stateLabel`, `kindLabel` (admin-people.ts:51-57), `typeLabel` (admin-content.ts:37-39) — and the allowlists that restate the option arrays: `STATES`/`KINDS` (admin-people.ts:71-72) against `STATE_OPTIONS`/`KIND_OPTIONS` (:38-49), `TYPES` (admin-content.ts:53) against `TYPE_OPTIONS` (:19-35).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: (a) byte-identical logic, the same comment ("The date this Edition is actually waiting on"); (b) the literal twice in two files that promise to agree; (c) `IDENTITY_SELECT` is exactly `{ id, name, photoUrl, birdOverride }` (people-select.ts), and `AvatarUser` is structural; (d) adding a facet option means editing two lists or the filter silently falls back to "any".
- **What to do**: (a) `export function editionDueAt(e)` in `src/components/admin/catchup-status.ts` (a `{ collecting: questionsCloseAt, answering: answersCloseAt, sealed: publishAt }[status]` lookup), used by both pages. (b) export `BACKDROP` (or a `STAGE_INK` pair with the 0.72 variant) from image-viewer.tsx, import it in review-room.tsx. (c) `user={entry.author}`, `user={r}`. (d) `export function optionLabel(options, v)` beside `FacetOption` in `components/common/filters/types`; `const STATES = STATE_OPTIONS.map((o) => o.value)` (likewise KINDS, TYPES).
- **Saving**: ~−25 lines; four drift points.
- **Risk & gate**: low. `npm run check`; open both catch-up admin pages and /admin/review.
- **Confidence**: high.
- **Notes**: (b) is also a design-token question (a warm-ink token in globals.css would be the fuller answer); leaving that to the design lens.

### admin-analytics-18 - Two admin screens that repeat each other
- **Where**: `src/app/(main)/admin/analytics/page.tsx:477-502` (`RhythmsView`: the heat map, then "Device", "Operating system", "Where visits end") against `:167-174` and `:163-165` (`LiveView`'s "Phone, tablet or computer", "Operating system", "Where visits end", from the same `loadUsageBreakdowns`); `src/components/admin/messages/thread-view.tsx:64-76` (`AdminPersonRow ... href={/admin/people/${id}}` with `action={<Link href={/admin/people/${id}}><Button ...>Their record</Button></Link>}`) and its skeleton `src/app/(main)/admin/messages/[id]/loading.tsx:24`.
- **Phase**: dedupe
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: `git show ec979e4c` shows both views drawing device, OS and last-page panels since the seven-view split (`74f6eabd`); Rhythms pays for `loadUsageBreakdowns`' three queries including the trail CTE (statement #105, 18.5 ms mean, the costliest analytics statement) to draw one of its three outputs, then two more. On the thread page, the row and the button beside it go to the same record; `admin-person-row.tsx:43-57` records the owner's rule ("clear what's clickable", "I should just be able to click on their name").
- **What to do**: owner decision OD2. If yes: `RhythmsView` = `loadRhythm()` + the heat map panel only (delete :478 `loadUsageBreakdowns()` and :489-499); delete the "Their record" action (and the `UserRound` import, and the ButtonSkeleton in `[id]/loading.tsx:24`).
- **Saving**: Rhythms 5 queries → 2 (statsFilter + rhythm), −18 lines; the thread page −8 lines.
- **Risk & gate**: low; visible to the owner. Screenshots of `/admin/analytics?view=rhythms` and one thread, 1440 and 390.
- **Confidence**: high on the duplication.
- **Notes**: `loadUsageBreakdowns`' docblock says it was split out "because RhythmsView renders only these" — if Rhythms stops rendering them, it can fold back into `loadPresence` (−8 lines more).

### admin-analytics-19 - Twenty of the thirty-five nightly numbers are shown nowhere
- **Where**: `scripts/ops/snapshot.mjs:130-270` (35 `add(...)` metrics: 27 `db.*`, `sentry.issues.unresolved`, `sentry.users.affected.24h`, `posthog.events/people/pageviews`, `github.backup.ok/age_hours/failures_last_10`; the three vendor collectors at `:181-275`, ~95 lines, with `SENTRY_AUTH_TOKEN`, `POSTHOG_PERSONAL_API_KEY`, `GITHUB_TOKEN`); readers `src/app/(main)/admin/analytics/page.tsx` (15 distinct `t("db....")` keys).
- **Phase**: placeholder
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: `rg -o 't\("[a-z0-9._]+"\)'` over the page: 15 keys, all `db.*`. Never read: `db.members.blocked`, `db.members.active_30d`, `db.bookmarks.total`, `db.photos.loves`, `db.catchups.prompts`, `db.mail.failed`, the six `db.contributions.*`, both `sentry.*`, the three `posthog.*`, the three `github.*`. The MetricSnapshot model's comment defends collecting history for its own sake ("none of it can be recovered once dropped"), so this is a question, not a cut.
- **What to do**: owner decision OD3. (a) keep; (b) draw `github.backup.ok`/`age_hours` and `sentry.issues.unresolved` on the Health view (three `t()` reads and one StatGrid); (c) stop collecting the eight vendor metrics: delete the three collectors and their secrets from the nightly workflow (scripts lens).
- **Saving**: (a) 0; (b) +15 lines, a visible health signal for backups; (c) ~−95 script lines, three secrets, three API calls a night.
- **Risk & gate**: (c) loses unrecoverable history; (b) touches only the page. For (c): the snapshot workflow and `docs/OPERATIONS.md` (the scripts lens owns both).
- **Confidence**: high on the counts.
- **Notes**: listed for the scripts lens too.

### admin-analytics-20 - Make the PostHog "provider" the leaf it is, and decide whether the demo loads it
- **Where**: `src/components/analytics/posthog-provider.tsx:31-37` (`export function PostHogProvider({ children })` → `useEffect(() => { schedulePostHog(); }, [])` and `return <>{children}</>`); mounted around the whole tree at `src/app/layout.tsx:90-107`; `src/components/analytics/posthog-client.ts:53-60, 140-151` (`start()` downloads posthog-js on every environment, and the dev opt-out happens in `loaded`, after the download).
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the component's own docblock: "This component holds no library and no state: it exists to say WHEN the library loads", and the `posthog-js/react` Provider it was named after was removed. It wraps `MotionFeatures`, `ThemeProvider` and every page to run one effect. The root layout mounts it on the public demo as well (no `IS_DEMO` gate; `demo.md` does not mention analytics), and with `KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_..."` the demo reports to the production project unless its Vercel settings override the key, which I cannot see.
- **What to do**: rename to `PostHogLoader`, return `null`, and mount it as a sibling (`<PostHogLoader />` beside `{children}`) instead of a wrapper. In `start()`, return `resolveReady(null)` without importing posthog-js when `process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_POSTHOG_DEV !== "1"` (the `loaded` opt-out can then go). Demo: owner decision OD4 (`{!IS_DEMO && <PostHogLoader />}` if he says off).
- **Saving**: ~0-3 lines; one fewer client boundary around the whole app; no 245 KB analytics download on a dev server.
- **Risk & gate**: low. `npm run check`; in production PostHog still receives a pageview (check the /ingest request in the network panel after deploy); `posthog-identify.tsx` is unaffected (it chains on `whenPostHog`, which resolves to null when not loaded).
- **Confidence**: high on the leaf; the demo half is a question.
- **Notes**: `PostHogIdentify`'s prop `isOwner={session.user.role === "admin"}` names admins "owner"; renaming to `isAdmin` is free while there.

### admin-analytics-21 - One helper for the six audit writes in people/actions.ts
- **Where**: `src/app/(main)/admin/people/actions.ts:281-288` (role), `:431-438` (merge), `:469-475` (block), `:537-548` (delete), `:608-615` (verify), `:644-650` (unverify): each `await writeAudit({ actorId: actor.actorId, action, targetType: "user", targetId: userId, ip: actor.ip, detail? })`.
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: six copies of one seven-line object differing in `action`, `detail` and (merge) the target; no test pins the literal shape (`rg writeAudit src/lib/*.test.mjs` finds none).
- **What to do**: `const auditUser = (actor: { actorId: string; ip: string | null }, action: AuditAction, targetId: string, detail?: string) => writeAudit({ actorId: actor.actorId, action, targetType: "user", targetId, ip: actor.ip, detail });` at the top of the file; six one-line calls.
- **Saving**: ~−25 lines.
- **Risk & gate**: low. `npm run check`; `scripts/qa/phase7-probe.mjs` checks an `admin.verify` row attributed to the acting admin.
- **Confidence**: high.
- **Notes**: this is not the refuted `withAdmin` gate wrapper: the role checks stay written out in every action (gate-coverage's C-189 contract).

### admin-analytics-22 - Derivable props and React leftovers
- **Where**: `src/components/admin/admin-filter-bar.tsx:69-101` (`sheetShowLabel`, which both callers build as `` `Show ${count} ${count === 1 ? singular : plural}` `` from props the bar already receives: people-list.tsx:161, content-list.tsx:125); the identical `facets(compact = false) { const className = compact ? "w-full h-9" : "w-full"; ...` preamble with the same comment in `people-list.tsx:122-125` and `content-list.tsx:84-87`; `useMemo` around the filter tokens `people-list.tsx:65-70`, `content-list.tsx:59-67` (no memoized consumer: `AdminFilterBar` re-renders with its parent); `src/components/admin/review/review-room.tsx:344, 525, 736` (`primaryLabel`, derivable from `mode` inside `Decide`); `people-list.tsx:16-17` (two imports from one module); `people-list.tsx:232-257` (`PersonCard`, a single-use wrapper around `AdminPersonRow`); `src/app/(main)/admin/catchups/(index)/page.tsx:88` (`catchups.filter((c) => !stuck.includes(c))`, a second pass where one partition would do); `src/lib/admin-guard-rule.test.mjs:22` (`const blockDelete = people;`, an alias left from when block/delete lived in another file).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: as listed; each is a §5e signature (derivable state/props, a memo with no benefit, a single-use wrapper, an intermediate alias).
- **What to do**: compute the sheet label inside the bar and drop the prop; have the bar pass the className (`facets: (className: string) => ReactNode`) and delete both preambles; drop the two `useMemo`s; compute `primaryLabel` in `Decide`; merge the imports; inline `PersonCard`'s JSX into the map; partition once; replace `blockDelete` with `people`.
- **Saving**: ~−20 lines.
- **Risk & gate**: low. `npm run check`; filter People and Content on desktop and in the phone sheet.
- **Confidence**: high.
- **Notes**: none.

### admin-analytics-23 - Stale and repeated comments in the wing
- **Where**: (a) `src/components/admin/moderation-dialog.tsx:16-23` names "the dedicated /notice/[id] page, retired 2026-09-05" as where the note opens (it opens a thread, admin-note.ts:10-15); (b) `src/app/(main)/admin/review/loading.tsx:4-11` describes `AdminSkeleton` ("That component holds the shape every other admin route arrives in"), deleted when admin-skeleton.tsx became six pieces; the same ghost in `e2e/loading-fallbacks.spec.ts:74-76` ("The nine admin screens share one AdminSkeleton and differ only in its props"); (c) `src/app/(main)/admin/messages/(index)/page.tsx:24-31` asserts "Open threads are the work queue and are never hidden", which `:35-48` then refutes ("That reasoning does not survive contact with ...") instead of the first being edited; (d) `src/lib/admin-threads.ts:57-61`, `deriveSubject`'s docblock orphaned above `cutTo`'s (two JSDoc blocks stacked; the first belongs at `:88`); (e) `src/app/(main)/admin/people/actions.ts:317-318` lists "sessions, accounts" among what a merge drops (the adapter tables were dropped 2026-08-27); (f) the "review used to be a filter on /admin/content" story told five times: `admin-content.ts:24-34`, `content/page.tsx:19-20, 33-36`, `content-list.tsx:127-131, 201-208`, `review/page.tsx:14-19`, `review-room.tsx:6-16` (keep review-room's, which carries the owner quote); (g) `src/app/(main)/admin/layout.tsx:14-23` restates `lib/admin.ts:12-31`'s guard argument; (h) `src/lib/admin-analytics.ts:315` (`/** A visit is "live" if it saw a page view in the last 15 minutes. */` orphaned above `TRACKED_SINCE`'s comment; it belongs on `ONLINE_MIN` at `:325`); (i) `review-room.tsx:409-425`, the image's comment re-explaining the portrait fix the container's comment at `:373-380` already explains, in terms of an auto-sized grid track that no longer exists; (j) `mail-rows.tsx:23-25` (the history of an export that went away).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each quoted above; (a), (b), (c), (e) and (i) describe code that no longer exists, which audit 2 §5 names as the one kind of comment that is bloat. (f) and (g) carry reasons and quotes, so only the repeats go.
- **What to do**: rewrite (a) to "relayed to the author as an `admin_note` notification that opens a notice thread (lib/admin-note.ts)"; (b) replace with "Not AdminPageSkeleton: this room arrives as a photograph with a form beside it" and fix the e2e comment to "each admin screen composes its own skeleton"; (c) merge the two docblocks into one that states both caps; (d) move lines 57-61 above `deriveSubject`; (e) drop "sessions, accounts"; (f) cut the four repeats to one line each ("Review is its own room since 2026-08-30; see review-room.tsx"); (g) shorten to one line pointing at lib/admin.ts; (h) move to `ONLINE_MIN`; (i) cut to "Fills the definite box; object-contain letterboxes and centres it"; (j) delete.
- **Saving**: ~−60 comment lines.
- **Risk & gate**: none. `npm run check` (the protocol audit reads comments in places; re-run).
- **Confidence**: high.
- **Notes**: the e2e comment is the scripts-e2e lens's file; listed there too.

### admin-analytics-24 - Small hygiene in the analytics room and the support page (use the file's own helpers, name things what they are)
- **Where**: `src/lib/admin-analytics.ts:23-24` (`const day = 86_400_000; const ago = (n) => ...`) against `:443` (`new Date(Date.now() - 30 * 86_400_000)`), `:523` (90), `:562` (30), `:1233` (7); `src/app/(main)/admin/analytics/page.tsx:802, 828` (`const totalFails = j.failures.reduce(...)` feeding "Sign-in attempts recorded"; `failures` groups every reason including `ok`, so it is every attempt, not the failures); nested ternaries `src/components/admin/analytics/heatmap.tsx:78-84` (the hour label) and `cohort.tsx:69-75` (hours/minutes/days); `src/components/admin/analytics/compare.tsx:115` (`groups.set(k, [...(groups.get(k) ?? []), r])`, a copy per member); `src/app/(main)/admin/support/page.tsx:186` and `:210-213` (`[...byMethod.entries()].sort(...)` twice), `:24-28` (a `const` between two import blocks), `:269-280` (`type LedgerRow`, restating the Prisma payload).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: as quoted. The four inline windows are also what `presence-rule.test.mjs:103-105` scrapes (`(\d+)\s*\*\s*86_?400_?000`) to prove retention equals the deepest lookback.
- **What to do**: use `ago(30)`/`ago(90)`/`ago(7)`; add `...[...analytics.matchAll(/ago\((\d+)\)/g)].map((m) => Number(m[1]))` to presence-rule's scrape in the same commit (otherwise it still passes, on `interval '...'` and `days = 90`, but on fewer sites than it claims); rename `totalFails` to `attempts`; a `hourLabel(h)` and a `durationLabel(hours)` helper; `(groups.get(k) ?? groups.set(k, []).get(k)!).push(r)`; sort `byMethod` once; move `LEDGER_LIMIT` below the imports; infer `LedgerRow` from a hoisted select.
- **Saving**: ~−12 lines.
- **Risk & gate**: low. `npm run check` (presence-rule).
- **Confidence**: high.
- **Notes**: `loadTrends`' `days = 90` default is passed explicitly by all three callers; fold into 04's key-list change.

## Owner decisions

**OD1 — The "Admin tools" box on members' profile pages**
- *What I'd change:* take the Admin tools box off a member's profile page and put one "Open their admin record" link there instead. Their admin record already has every tool in the box (note, verify, block, delete) plus the ones the box lacks (merge, make admin, photo trust, their cities, the emails sent to them).
- *What you'd notice:* on a profile you click once more to reach the tools. Members notice nothing, except that profile pages get a little lighter: every visitor currently downloads the box's code even though only you can see it.
- *If I guess wrong:* blocking or noting someone from their profile costs one extra click.
- *Options:* (a) swap the box for the link; (b) keep the box, but load its code only for admins, so nothing changes for you and nobody else downloads it; (c) leave it exactly as it is.
- *If you don't reply I'll do:* (b). [admin-analytics-03]

**OD2 — Two admin screens that repeat themselves**
- *What I'd change:* the Rhythms tab in Analytics repeats three panels from the Live tab (phone or computer, operating system, where visits end). I'd leave Rhythms as the week-at-a-glance chart only. And on a message, there is a "Their record" button right next to the person's name, which already opens the same page; I'd remove the button.
- *What you'd notice:* Rhythms becomes one chart (the three panels stay on Live), and a message has one fewer button.
- *If I guess wrong:* you switch to Live to see devices, or you miss a button you liked.
- *Options:* (a) both changes; (b) only Rhythms; (c) only the button; (d) neither.
- *If you don't reply I'll do:* (d), because both are things you see. [admin-analytics-18]

**OD3 — Numbers saved every night that no page shows**
- *What I'd change:* a job saves 35 numbers about the site every night, so their history outlives the free plans of the services that report them. Analytics shows 15. The other 20 are stored and never shown, including whether last night's backup worked, how many errors are open, the analytics service's own totals, and the daily money figures.
- *What you'd notice:* (a) nothing; (b) a small panel on the Health tab showing backup status and open errors; (c) nothing, but the nightly job stops calling three outside services and needs three fewer passwords.
- *If I guess wrong:* (c) throws away history that cannot be collected later; (b) adds a panel you may not want.
- *Options:* (a) keep saving all 35; (b) keep them and show backup health and errors; (c) stop saving the eight outside-service numbers.
- *If you don't reply I'll do:* (a); the reason those numbers are kept, that old history cannot be recovered, still holds. [admin-analytics-19]

**OD4 — Visitor analytics on the public demo**
- *What I'd change:* the public demo loads the same visitor analytics as the real site. Unless the demo's settings send it to a separate account, strangers trying the demo are counted in your real site's figures. I'd switch analytics off on the demo.
- *What you'd notice:* nothing on the real site; the demo's visits stop appearing in your analytics, and the demo loads a little less in the background.
- *If I guess wrong:* you lose any view of how people use the demo.
- *Options:* (a) switch it off on the demo; (b) keep it on.
- *If you don't reply I'll do:* (b), because I cannot see the demo's settings from here and will not change what it reports without knowing. [admin-analytics-20]

## Not-findings

- **The `lastSeenAt` UPDATE's 33,211 calls against 1,784 rows (statement #8)** — cumulative, not current. The in-memory gate (`fresh()` against `session.user.lastSeenAt`, read free on the session callback's existing row fetch, auth.ts:386-391) landed 2026-09-05 (`29582b36`); before it, `touchLastSeen` ran on every layout render including prefetches and localhost. The statement log spans that period: it still holds `Visit` shapes of code deleted on 2026-08-27 and 2026-09-15. Measurement for the fix campaign, pure SELECTs, run a day apart: `SELECT calls, rows FROM pg_stat_statements WHERE query LIKE 'UPDATE "public"."User" SET "lastSeenAt"%';` — the day's delta in calls should be within a few per cent of the delta in rows (a race is the only way to call without writing). If it is not, the gate is not reaching and the session's `lastSeenAt` needs checking. The stamp also bumps `User.updatedAt` (`@updatedAt`); harmless, nothing reads `User.updatedAt` (`rg updatedAt` finds only Post/Edition/Entry reads).
- **`Visit`'s three UPDATE and four INSERT shapes** — one live writer, three retired versions. Live: `recordVisit()` in last-seen.ts = raw UPDATE #19 (8,899 calls / 8,289 rows since 2026-09-15), then only on a miss the daily-cap COUNT #25 and the create #46 (608). Retired: #39/#40 (18-column upsert with `timezone`/`lat`/`lng`, columns the live table no longer has, `db-columns-live.json`) are the 2026-08-19 upsert that C-163 replaced; #26 and #62 are the 2026-08-25 → 09-15 `updateMany` whose `country: country ?? undefined` produced two SQL shapes — with geography (#62, production behind Vercel's headers) and without (#26, **25,177 calls**: localhost, which has no `x-vercel-ip-*` headers). That second number is the stats-exclusion rationale (dev traffic dominating the tables) read straight off the statement log; #38 is that era's create. Nothing to fix.
- **The 55 ms nested-count statement (#51, 38 calls)** — `scripts/ops/snapshot.mjs:97-...`, the nightly collector (38 calls ≈ 38 nights), not the admin Overview. 55 ms once a night needs nothing.
- **`admin-analytics.ts` as one module (1,265 lines)** — keep it. Four rule tests use the file as the choke point: `admin-rule.test.mjs` counts ten `GROUP BY u.id` leaderboards in it, `stats-exclusion-rule.test.mjs` counts ≥ 29 activity reads and fails on activity reads in any file outside a six-file allowlist, `presence-rule.test.mjs` scrapes its lookback windows to prove retention, `login-attempt-rule.test.mjs` slices its locked-out query. A per-view split is line-neutral, involves no client bundle (all server code, and each view already runs only its own loaders), and would turn a single-file gate into a folder glob. The comment ratio (263/921) is reasons and audit ids, not narration.
- **The fourteen admin `loading.tsx`** (charter question 2) — not copies: ten compose `AdminPageSkeleton`/`AdminSectionSkeleton`/`StatStripSkeleton`/`AdminFilterBarSkeleton`/`AdminPersonRowSkeleton`/`ChipSkeleton` from admin-skeleton.tsx, and draw the real `PageHeader`, the real `ADMIN_NAV`, the real `VIEWS`/`VIEW_PILL` and `ADMIN_GRID(_3)`. 533 code lines for 14 screens. What repeats is the fixed-pixel line-box idiom (`flex h-[19.5px] items-center` + a bar), which is fresh-code's cross-app finding (68 sites); the admin share is ~15 of them. `analytics/loading.tsx:25-45` re-spells `StatTile`'s box and `StatGrid`'s grid classes; exporting two class constants from stat.tsx would make it one more `VIEW_PILL`-style import, worth doing only if fresh-code's box table lands.
- **`SESSION_GAP_MIN` (knip unused export)** — settled by audits 1 and 2 as an honesty check; not re-argued.
- **The admin lib client/server pairs** (`admin-people`/`-query`, `admin-content`/`-query`, `admin-threads`/`-server`) — settled seams; each banner is accurate at HEAD (the client imports were re-checked: people-list.tsx, content-list.tsx, message-composer.tsx, thread-list.tsx).
- **`requireAdminPage()` in every page plus the B-024 one-liner** — settled (`gate-coverage.test.mjs`, commit `ae9df23e` "the B-024 argument once, not twelve times").
- **`reviewCounts()`'s three Photo counts are not one FILTER pass** — deliberate by the room's own rule: `AWAITING_REVIEW`/`SET_ASIDE`/`UNDATED` are the single Prisma spelling every count and list reads ("A count that disagrees with the list it points at is worse than no count"); a raw FILTER would be their second spelling. The same holds for the support page's `givers` (fetch-to-count, but `COUNTED_GIVERS` stays the one predicate).
- **`loadArrivals`' four and `loadSearches`' three groupBys are not a GROUPING SETS query** — functions run in `bom1` beside Supabase, so merging buys about one round trip on a page one person opens, at the price of a raw statement that must thread `counted.user(...)` through every set and pass `stats-exclusion-rule`'s per-statement regex. Not worth it.
- **The presence beat every 60 s, and each beat rewriting device/OS/place** — design (spec §9.9, presence-beacon.tsx:28-33; last-seen.ts:86-90 "where they are now"). Halving the beat halves visit-length precision.
- **No `startedAt` index on `Visit`** — 2,056 live rows, 1.2 MB; the room's window scans are sub-millisecond. Revisit near 100k rows (the retention window is 90 days).
- **`review-room.tsx` (830 lines, 217 comment)** — the newest, most owner-argued file in the wing (2026-08-30, 09-15, 09-21); every constant carries its reason and a quote. Only its duplicated comment (23i), its derivable prop (22) and its copied ink (17b) are findings.
- **`person-detail.tsx` being `"use client"` top to bottom** — a server shell with client cards is line-neutral, admin-only, and the page is at the floor + 43 KB (`route-js.txt`); not worth the churn.
- **`countMembers()`, a one-line wrapper** — it has a reason (its docblock: two views paid for `loadPeople`'s thirteen queries to get one integer), two callers, and keeps `prisma` out of the page.
- **The Overview's rows and the layout's counts querying the same six predicates** — deliberate, and argued (admin.ts:239-244); 05 only moves the two spellings into one file.
- **`use-admin-act.ts`, `admin-filter-bar.tsx`, `admin-person-row.tsx`** — completed dedupes with justified shapes (one option; props are the data the two lists differ in; no `meta` prop by design).
- **jscpd's two clones here** — `(index)/loading.tsx:43-48 ≈ (index)/page.tsx:159-164` (the skeleton draws the real section list as words, on purpose) and `admin-content-query.ts:62-70 ≈ 159-167` (three model queries share a shape; a generic job helper would add more than it removes).
- **MetricSnapshot as a key-value table, `touchLastSeen` outside `statsWritesEnabled`, the hard-coded `OWNER_USER_ID`, the beacon and the route both skipping `/admin`** — all argued in place and correct.

## Audit carry-overs in this territory
- audit-2 `admin-analytics-05` / E11 admin half (MailCard → MailRows): **done** 2026-09-07 on the owner's "16a" (person-detail.tsx:671-675); 11 finishes the data side.
- audit-2 `admin-analytics-07` (touchLastSeen behind the response without `headers()` in `after()`): **done** (`29f15f7d`; `readPresence` reads during the request, the write runs behind it; now from `/api/presence`).
- audit-2 D11a / `admin-analytics-02` (the content list's dead `pending` branches): **done** (`9c906b68`); the raw-param redirect it kept is 15(g).
- audit-2 D11 ("admin bits nobody can open", decision 17): **done** for the admin half (the Catch-ups halves are not this territory's).
- audit-2 `bundle-build-05` (person-detail's LocationPicker dynamic): **done** (person-detail.tsx:572-583).
- audit-2 B11/B12 (report and moderation dialogs lazy): **done** for post-card, letter-menu, collection; the comments-section site was missed — 02.
- audits 1/2 refuted `withMember`/`withAdmin`: still refuted; 21 is an audit-log helper and leaves every role check written out.

## For other lenses
- **bundle-build**: measure 01 (admin nav, icons and count store in the member shell tier), 02 (ModerationDialog in the comments chunk) and 03 (admin-profile-tools in `/profile/[id]`'s first load) with the analyzer; my byte figures are source-size estimates.
- **prisma-demo-seed / data-layer**: 04's index (one migration file whichever lens owns it). `CatchupEdition.theme` is read only by `admin/catchups/[catchupId]/page.tsx:80, 201` and written only by the demo seed; `CatchupSeries.intro` is selected there and never rendered (15a); if catchups-ui-21 retires `CatchupPrompt.accepted`, lines `:98, :121, :229-234` of that page go with it.
- **catchups-ui**: the `page-label.ts` retired-path labels it routed here are 15(e).
- **common-primitives**: `<Button>` nested inside `<Link>` (an interactive element inside an anchor) in 15 non-lab sites, including `person-detail.tsx:157-162` and `thread-view.tsx:69-74`, while 8 sites use Base UI's `nativeButton={false} render={<Link/>}`; person-detail's comment ("the shared Button has no `asChild`") predates the `render` idiom. One idiom would do.
- **email / lib-core**: 09 lives in `email-queue.ts`. Statement #95 (`OutboundEmail WHERE status = $1` count, 23,448 calls) and #86 (6,024) are the lazy drain's prechecks on every authenticated page view — confirm they are bounded and intended.
- **scripts / e2e**: 19's vendor collectors in `scripts/ops/snapshot.mjs:181-275`; `e2e/loading-fallbacks.spec.ts:74-76` names the deleted `AdminSkeleton` (23b). `snapshot.mjs:97-...`'s nested count subqueries (55 ms a night) need nothing.
- **design protocol**: the analytics room sets text below the spec's 12px floor (`admin.md` §5.1, §12: "No text below 12px anywhere in admin"): `heatmap.tsx:39, 67` and `compare.tsx:143` at 10.5px, `compare.tsx:224` and `presence.tsx:108` at 11px, many 11.5px. `review-room.tsx:654` and `:671` hand-type "·" separators (the reading room's comment says the protocol refuses hand-typed dots). The analytics tab and picker pills (`tabs.tsx:58-70`, `compare.tsx:84-90`) have hover and focus-visible but no active state.
- **docs**: `admin.md` §4.2/§9.4 describe a two-chip People row (one shipped); §9.4's "should share one component" is unresolved (03); §12's 12px floor is not true of analytics.
- **peer bug audit** (for the orchestrator to route; I did not open its folder): `admin-counts.tsx:52-57` compares four of five counts (06); `report-list.tsx:137` ignores `adminHidePost`'s result (14); the Overview's "Members" tile (non-blocked) links to a People list whose count and rail row include blocked accounts (05).

## Metrics
- Territory: 83 files, 14,012 lines (cloc: 9,752 code, 3,354 comment, 906 blank; comment/code 0.34 against lib 0.83). Read in full: 83. Context read outside the territory: ~2,200 lines (spec 726, layout 175, sidebar ~260, schema ~240, the rest listed under Coverage).
- Biggest files: `admin-analytics.ts` 1,265 (921 code); `analytics/page.tsx` 895 (814); `review-room.tsx` 830 (566 code / 217 comment); `person-detail.tsx` 799 (703); `people/actions.ts` 654 (361 / 226); `last-seen.ts` 351 (182 / 142); `support/page.tsx` 350.
- Comment-heaviest (comment/code): `posthog-client.ts` 1.83, `use-admin-act.ts` 1.67, `stats-exclusion.ts` 1.48, `login-attempt.ts` 1.30, `posthog-identify.tsx` 1.29, `admin-chrome.tsx` 1.03, `mail/actions.ts` 1.02, `admin-person-row.tsx` 0.99, `admin-review.ts` 0.94, `presence/route.ts` 0.93. Sampled: all are reasons, dates, owner quotes or audit ids; the bloat is the ten stale or repeated passages in 23.
- Tool leads: knip 3 in territory (`SESSION_GAP_MIN` settled, `ID_SEGMENT` → 16, `AdminCountKey` → 05); jscpd 2 clones (both Not-findings); tsc-unused 0; madge 0; type-sludge 1 (`content-list.tsx:156` eslint-disable for a 64px `<img>` thumbnail, acceptable); console-log 0; commented-out code 0.
- `"use client"` in territory: 14 files; leaf candidates: `mail-rows.tsx` (11), the PostHog loader (20).
- Admin routes' first-load JS (`route-js.txt`): nine admin routes at floor + 1 KB; `/admin/content` +90, `/admin/people` +86, `/admin/review` +73, `/admin/people/[id]` +43 (admin-only, not proposed).
- Queries per analytics view today → after 13/18: Live 8; People 10 → 9; Content 23 → 20; Rhythms 5 (→ 2 if OD2); Faces 11; Reach 9; Joining 5; Compare 2; Health 6 → 5. Rail counts: 6 per admin hard load; Overview page 13 → 11 with 05 step 4.
- Database: 1 dead index (88 KB); 0 dead columns found in this territory's tables beyond the reading room's `intro` read; statement-log shapes mapped: 7 Visit (1 live writer), 1 lastSeenAt, 1 nightly snapshot.
- Findings: 24 (T1 6 · T2 13 · T3 2 · T4 3; structural 20 · cheap 4; autonomous 21 · owner 3); owner decisions 4.
- Projected savings if every autonomous row lands: ~335 source lines (≈ 60 of them comments), ~10-15 KB raw client JS off member routes (01, 02, 03b), 1 index, −5 queries across the analytics views, −2 per `/admin` and `/admin/mail` load, −3 serial round trips, −1 server-action POST per report hide.
