# V-L-a — adversarial validation of L2 (caching-rendering-routes) + L3 (dates-ist)
Validator: V-L-a · Model: Opus 5.5 (claude-opus-5-5[1m]) · Started: 2026-10-23
Assignment: L2-01, L2-02, L2-03, L2-04, L2-06 (L2-05 intentionally unused by the finder) and L3-01..L3-08.
Re-baseline: the audit read `495ecdd2`; every citation below is re-derived at HEAD `88642426` (113 commits later,
`work/rebaseline.md`; Next is now 16.3.8, `df260031`). Line numbers in "Citations re-derived" are HEAD's.
Method: `work/brief-validator.md` exactly. Read-only; SELECT-only database; read-only `gh run list/view`; no gates,
no browser, no sign-in, no dev server; one scratch file under /tmp, deleted by the command that made it.

## Verdict board
- L2-01 — FIXED-SINCE 8d35ff4e (every server lab room gates itself; checked all 25, not just the proved one)
- L2-02 — REFUTED (a revalidating Server Action re-renders the whole tree from the root, admin layout included)
- L2-03 — CONFIRMED-CORRECTED (Medium stands)
- L2-04 — CONFIRMED-CORRECTED (Low)
- L2-06 — CONFIRMED-CORRECTED (Medium stands; PulseModule gone, three modules + CelebrationSignals remain)
- L3-01 — FIXED-SINCE d7a8041d (`sendTimeLabel` now says "on Thursday" / "on 6 October", pinned by a test)
- L3-02 — CONFIRMED-CORRECTED (Medium stands; a fifth export, 2026-10-11, is shifted −1 h)
- L3-03 — CONFIRMED-CORRECTED (Low)
- L3-04 — MOOT-SINCE 6fb896bd (nudge half: `nudgeGroup` deleted) / REFUTED (export half: Upstash's window is the UTC day)
- L3-05 — CONFIRMED (Low)
- L3-06 — CONFIRMED (Low; replayed at HEAD)
- L3-07 — CONFIRMED-CORRECTED (Low; it has happened FOUR more times in October)
- L3-08 — FIXED-SINCE a281e855 (NOT 7f28818c, which task_plan names: that first fix never copied a thing)

Counts: CONFIRMED 2 · CONFIRMED-CORRECTED 6 · FIXED-SINCE 3 (L2-01, L3-01, L3-08) · MOOT-SINCE 0 whole (L3-04's
nudge half) · REFUTED 2 (L2-02 whole; L3-04 export half, so L3-04 falls entirely) · DUPLICATE 0 · KNOWN 0.
Severity changes: none upward or downward among the survivors (L3-07 now has a case for Medium, see it).
New candidates: 1 (V-L-a-01, Low — the surviving, real instance of L2-02's symptom).

## Verdicts

### L2-01 — FIXED-SINCE 8d35ff4e
Verdict: FIXED-SINCE 8d35ff4e ("fix(lab): every server-rendered room checks the admin role itself", 2026-09-29)
Confidence in verdict: certain
Citations re-derived: the gate now lives in `src/app/lab/_gate.ts:21-24` (`requireLabAdmin`: `auth()` + `notFound()`
for a non-admin); `src/app/lab/layout.tsx:16-19` calls it; `src/lib/gate-coverage.test.mjs:270-288` walks every
`page.lab.tsx`, skips only `"use client"` files and requires `await requireLabAdmin(` in every other one (anti-vacuity
floor of 15 server rooms). The finding's rooms at HEAD: `years/weave`, `years/wall`, `years/then`, `catchups/magazine`
(+ `_live.ts`) and `catchups/vote` are DELETED (rebaseline: `5d5c6898`, the years/valley lab clean-ups);
`valley/page.lab.tsx` no longer reads `UserPlace` (it renders `<ValleyFilm/>` behind `requireLabAdmin` at :11);
`catchups/swipe/page.lab.tsx:70` gates before `photographs()`'s `catchupEntry.findMany` (:50);
`catchups/sketches/page.lab.tsx:37` gates before `loadSketchEdition` (`_data.ts:70`) and `loadPressureEdition`.
What I tried to refute it with (the orchestrator's ask: EVERY data-reading lab page, not just the proved one):
(1) Enumerated every route file under `src/app/lab` (63 `page.lab.tsx`, one `layout.tsx`, one `loading.tsx`, no
`route.ts`, no nested layout, no `template`/`error`/`default`, no plain `page.tsx`): 25 server rooms, every one has
`await requireLabAdmin()` as its first await; 38 are `"use client"` and cannot read the database. (2) Every lab file
that touches data: `_archive-state.ts` (read by the index `page.lab.tsx:34-35`, gated first), `catchups/sketches/_data.ts`
(gated caller), `catchups/swipe/page.lab.tsx` (gated first), `everything/_findings.ts` (static text that merely quotes
`prisma` in an evidence string), and the one server-action file `lab/actions.ts` (`setArchived` checks
`requireAdminAction()` outside development; the dev bypass is the documented owner decision). (3) No lab page exports
`generateMetadata`, so nothing reads data before the gate. (4) Ran the gate test: `node --test
src/lib/gate-coverage.test.mjs` → 31/31 pass, including "every server-rendered /lab room checks the role itself".
Why it falls: the mechanism the finding proved (a crafted RSC request starts the render below `lab/layout.tsx`) is
still true of Next, but every room it can start at now repeats the role check, and the test makes the next room do so.
What survives, as defence in depth only: `loadPublishedEditionView` (`src/lib/catchups-edition-view.ts:93`) still
takes no membership decision of its own; both its callers gate first (the edition page checks membership at
`edition/[editionId]/page.tsx:150-151`; the sketch room is admin-only), so it is not a finding.
Live check run: `node --test src/lib/gate-coverage.test.mjs` (31 pass); file enumeration above. No request was made.
Corrections to the finding: none needed for the record beyond FIXED-SINCE; the fix-session board should mark it done
and drop the "extend gate-coverage" gate (it shipped in the same commit).
Orchestrator action: none.

### L2-02 — REFUTED
Verdict: REFUTED
Confidence in verdict: certain on the mechanism (read in the installed next@16.3.8 source); likely on the
member-visible outcome (not driven live: it needs an admin decision on a real row)
Citations re-derived: the page-type sites are now `collection/actions.ts:1124` (was :1103), `messages/actions.ts:140,
213, 258, 289` (unchanged), `admin/review/actions.ts:124` (unchanged), `feed/actions.ts:581` (was :502); the
`"layout"` sites `admin/people/actions.ts:43,554`, `admin/reports/actions.ts:39,77`, `admin/mail/actions.ts:61,135`.
`admin/layout.tsx:29-30` (`requireAdminPage()`, `loadAdminCounts()`), `admin-counts.tsx` `AdminCountsSync`
re-publishes on every new `counts` prop (`useEffect(..., [counts])`, value-compared).
What I tried to refute it with: how a Server Action's response is rendered, in the installed source.
(a) The client's action fetch sends `Accept: text/x-component`, `Next-Action` and `Next-Router-State-Tree` but NO
`RSC: 1` header (`client/components/router-reducer/reducers/server-action-reducer.js:51-55`).
(b) The server only honours a router-state tree when `isRSCRequest` (`server/app-render/app-render.js:196,205-206`:
`shouldProvideFlightRouterState = isRSCRequest && …`), so for an action `flightRouterState` is `undefined`.
(c) With no tree, `walk-tree-with-flight-router-state.js:59-62` sets `renderComponentsOnThisLevel = !flightRouterState`
= true at the ROOT: the whole tree is rendered, every layout included (`server-action-reducer.js:300`: "Currently the
server always renders from the root in response to a Server Action").
(d) The page is rendered at all whenever `workStore.pathWasRevalidated` is set (`action-handler.js:963,990`), and
`revalidatePath` sets it for ANY path and ANY type (`server/web/spec-extension/revalidate.js:221-222`, "TODO: only
revalidate if the path matches").
(e) The client applies that full tree as a seeded navigation with `FreshnessPolicy.RefreshAll`
(`server-action-reducer.js:296-326`).
So `saveReview` on `/admin/review` (and `adminReplyToThread`/`setThreadStatus` on `/admin/messages/[id]`) returns a
re-render of `admin/layout.tsx` with a fresh `loadAdminCounts()`, `AdminCountsSync` gets new props, and the rail is
right BEFORE the admin navigates anywhere. The `"layout"` argument only changes which server-side cache entries are
purged, and this app has none (root layout dynamic, no `use cache`/`unstable_cache`, L2's own map). The other path,
an admin action taken off `/admin` (e.g. `declinePhoto` from the Collection viewer), is followed by a navigation INTO
`/admin`, whose divergence is at the `admin` segment, so `admin/layout.tsx` renders fresh then too.
Why it falls: the finding's premise — "the layout is not re-rendered … and a page-type revalidation does not force
it" — is false for a Server Action response, which is exactly the moment the stale number would be born. The page vs
layout distinction it builds on is real for navigations (B-024, L2-01) and for server caches, neither of which
applies here. The four member-side/messages `revalidatePath("/admin")` calls are not stale-count bugs either; the two
member-side ones (`messages/actions.ts:140,213`) are merely pointless, a cleanup.
Live check run: none possible read-only (it needs a write by an admin). Source reads listed above.
Corrections to the finding: REFUTED. The same reasoning refutes T7a-22 (cross-zone note). The symptom it describes
DOES exist on one path the finder did not name, a write done inside a GET render rather than an action: filed as
V-L-a-01 below.
Orchestrator action (optional, settles "likely" → "certain"): the next time Jerry/the owner works a real review pile,
watch the rail's Review number fall after each decision without navigating. Do not manufacture a decision for it.

### L2-03 — CONFIRMED-CORRECTED (Medium stands)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the mechanism; likely on frequency
Citations re-derived: `(main)/layout.tsx:26` (`auth()`), `:28-47` (the null branch; NEW since `e286daf0`: `:33-35`
throws `SESSION_UNAVAILABLE` when the row could not be read; `:46` `return redirectToSignIn()`, through
`/api/auth/stale` since `dcad8dd8`). Page null-shapes at HEAD: `feed/page.tsx:30` (was :27-28), `letters/(index)/page.tsx:42`
(was :41-42), `letters/new/page.tsx:15`, `messages/(index)/page.tsx:41`, `directory/page.tsx:167-168` — now
`namesLocked = !IS_DEMO && !session?.user?.emailGateOpen` (renamed from `emailConfirmed` in `d7a8041d`; null session
still locks, `directory-client.tsx:725` "Confirm your email to browse the people."), `support/page.tsx:31`,
`collection/collection-data.ts:108`.
What I tried to refute it with: (1) a client-side session watcher — none: `src/lib/auth.ts:328` itself notes "no
SessionProvider and no useSession", grep confirms. (2) the O-03 fix (`e286daf0`) — it lives only in the layout
(`sessionWasUnavailable()` is read nowhere else), so on a soft navigation a pool timeout inside the session read still
reaches the page as a plain `null` session. (3) the proxy — it checks cookie presence only (`proxy.ts:175`
`isSessionCookie`), so a present-but-revoked cookie passes. (4) the layout re-running on navigation — it does not:
the render starts at the first segment where the client's tree diverges, which the orchestrator proved live for L2-01.
Why it stands: a member whose session was revoked elsewhere (password reset, block, deletion request) or whose
session read timed out under pool pressure, and who then clicks within the app, gets blank or misleading pages
("No stories yet", "Confirm your email") inside the old shell, with no route to sign in until a reload. Medium:
degradation, rare per member, but the O-03 trigger is the one that arrives for many members at once.
Live check run: none possible (needs two sessions and a credential bump). Greps listed above.
Corrections to the finding: line numbers as above; note that since `e286daf0` the hard-load face throws to the root
error screen for an unreadable session while the soft-nav face still renders `null`, so the two faces now DISAGREE —
the fix should make pages consult `sessionWasUnavailable()` too (or have `auth()`'s null path throw a typed error the
pages can rethrow). Fix direction otherwise stands.
Orchestrator action: none beyond the finder's two-browser proof with a new throwaway account, if wanted.

### L2-04 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `catchups/edition/[editionId]/page.tsx:75` (`loadEditionBase`, plain async), `:95`
(`loadMembership`, plain async), `generateMetadata` `:102-131` — its own `catchupEdition.findUnique` at `:112` and
`loadMembership` at `:122`; the page `:145` (`loadEditionBase`), `:150` (`loadMembership`), and a third edition read in
`advanceAndReload` `:89`. Unchanged in substance since the audit (the file changed 3+/4− in the rework).
What I tried to refute it with: whether React `cache()` wraps them anywhere (no `import { cache }` in the file); whether
`generateMetadata` short-circuits for most views (only for a non-published edition or a non-member, i.e. not the
common case).
Why it stands: a published-edition view pays two identical `GroupMember` reads and three edition reads; the identical
membership read would dedupe for free under `cache()` keyed on the two id strings (TRAPS "cache()").
Live check run: none needed.
Corrections to the finding: the edition reads are THREE per view (metadata, base, reload), not two; line numbers above.
Orchestrator action: none.

### L2-06 — CONFIRMED-CORRECTED (Medium stands)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the mechanism; likely on the trigger
Citations re-derived: `feed/page.tsx:77` (`<CelebrationSignals userId=…/>`), `:115` (`<FeedRail …/>`);
`feed-rail.tsx:34-36` renders `LettersModule`, `CollectionModule`, `DirectoryModule` — `PulseModule` was DELETED
(`6ac93492`, "drop Signs of life from the rail"); `celebration-signals.tsx:30-31` three-query `Promise.all`. No
`<Suspense>` anywhere in `src/app/(main)/feed`, `src/components/feed` or `feed-column.tsx`; no `try` in any rail
module; no `feed/error.tsx`, so `src/app/(main)/error.tsx` is the boundary, and it still binds `reset` (`:29,:44`,
T8b-15 unfixed at HEAD).
What I tried to refute it with: a per-module catch (none), a Suspense+error boundary pair (none), whether the feed's
posts are part of the same render (no — `FeedColumn` is `"use client"` and fetches after mount, so the error page
replaces it before it ever mounts).
Why it stands: any rejected rail/celebration query turns `/feed` into the apology with a dead "Try again".
Correction to the consequence: "although the feed itself loaded" is wrong — the posts never start loading, because the
column that fetches them is replaced; the member still loses the feed, which is the point. Also, the page's own
three-query `Promise.all` (`feed/page.tsx:47`) shares the same boundary, so isolating the rail removes about five of the
page's eight server queries from the failure surface, not all of them.
Live check run: none possible (needs an injected failure).
Corrections to the finding: lines as above; PulseModule gone; consequence wording as above. Fix direction stands.
Orchestrator action: none.

### L3-01 — FIXED-SINCE d7a8041d
Verdict: FIXED-SINCE d7a8041d ("feat(email): waiting for a confirmation email no longer locks anybody out", 2026-09-29)
Confidence in verdict: certain
Citations re-derived: `sendTimeLabel` moved out of the client file into `src/lib/confirmation-copy.ts:29-52`: it counts
valley days (`:41-43`) and returns "at …", "tomorrow at …", "on <weekday> at …" (2–6 days) or "on <d Month> at …"
(7+), 12-hour with "am"/"pm" (`:31-39`). Callers: `(main)/layout.tsx:12,195`, `verify-email-banner.tsx:7,140`,
and `resendOutcomeMessage`/`movedMessage` in the same module (the dialog and `/verify-email` go through them).
What I tried to refute it with: any remaining two-way formatter (grep "tomorrow" in the banner, the dialog and the
verify page: only comments remain); the test — `node --test src/lib/confirmation-copy.test.mjs` → 13/13 pass, pinning
"on Thursday at 5:30 am IST" and "on 6 October at 5:30 am IST" at a fixed `now`.
Why it falls: both halves of the finding (the day word and the missing "am") are fixed, with the gate the finding asked for.
Live check run: the unit test above.
Corrections to the finding: none.
Orchestrator action: none.

### L3-02 — CONFIRMED-CORRECTED (Medium stands)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (measured again at HEAD)
Citations re-derived: `scripts/dev/export-catchups.mjs:81` (`new pg.Client(...)`, still no `setTypeParser`; grep for
`setTypeParser`/`1114` across `scripts/` and `src/lib` is empty) and `:85` (`iso()`), unchanged lines. The undo file
`scripts/dev/.anon-cleanup/apply.mjs:127,146,157` (`:105` is not a timestamp line; the state object is `:101`). Both
folders are gitignored local files (`.gitignore:110`).
What I tried to refute it with: a parser installed elsewhere (none); whether exports have stopped (no — there is a FIFTH,
`scripts/dev/.exports/catchups/2026-10-11/`, taken under the Catch-ups campaign's rule that every destructive migration
is preceded by an export, `prisma/migrations-manual/2026-10-11-drop-song-columns.sql:29-31`).
Why it stands: the same Catch-up (`cmsepxoas000d04jr6xc30y3z`, live `createdAt` `2026-08-04 13:53:23.524`) reads
`2026-08-04T08:23:23.524Z` in the 09-14 export (IST laptop, −5 h 30) and `2026-08-04T12:53:23.524Z` in the 10-11 export
(BST laptop, −1 h). The archive's error moves with the laptop's zone, as the finding said.
Live check run: `node -e` over both `catchups.json` files for that id; `node scripts/dev/run-sql.mjs --inline "SELECT id,
\"createdAt\"::text FROM \"CatchupSeries\" WHERE id='cmsepxoas000d04jr6xc30y3z'"` → `2026-08-04 13:53:23.524`.
Corrections to the finding: add the 2026-10-11 export (−1 h) to the evidence; note the export is the documented
pre-migration safety step for every destructive Catch-ups migration, which is what makes it matter; London returns to
GMT on 2026-10-25, so an export taken this winter will happen to be right, and wrong again from March. The rework
campaign closed (`cdb33c56`), which lowers how often the archive is relied on but not its contract. Medium stands
(the nightly `pg_dump` remains the real floor).
Orchestrator action: none.

### L3-03 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the mechanism; likely on the window's length
Citations re-derived: `overdueEditionWhere` is now `src/lib/catchups-core.ts:720-735` (docblock `:697-719`), still raw
`questionsCloseAt: { lt: now }` / `answersCloseAt: { lt: now }`; the deadline-hour comment `:295-321` with "within thirty
minutes" at `:309`, `DEADLINE_HOUR_UTC_MS` `:323`; consumers `src/lib/admin.ts:261` (rail count) and
`src/lib/admin-worklist-query.ts:171` (label "is past its date" at `:243`); only
`admin/catchups/(index)/page.tsx:49` runs the unscoped advance first (`:79` reads the list after it).
What I tried to refute it with: (1) whether the start-by-hand rework (`eb855c71`) removed the trigger — no: the
`collecting` branch now rarely matches (an un-started Edition has `questionsCloseAt` null, live: 13 of the 15 newest
Editions), but the `answering` branch is exactly as before, and one live Edition is answering with `answersCloseAt
2026-10-25 01:30 UTC` (07:00 IST Sunday). (2) whether the admin layout or Overview now advances first — no (grep).
(3) the tick's real minute: September's four cron-written batches were at 02:53:35–36 UTC; October's only candidate is a
single `catchup_reminder` at 2026-10-23 02:00:33 UTC (could be the tick after a redeploy moved its minute, or a
member's lazy advance at 07:30 IST — not distinguishable read-only).
Why it stands: whatever minute Vercel picks inside 02:00–02:59 UTC, the alarm is up from 07:00 IST until the tick or a
member's page view advances the Edition: 30 to 89 minutes on each deadline morning.
Live check run: `SELECT … FROM "CatchupEdition" ORDER BY "createdAt" DESC LIMIT 15` (statuses and deadlines) and
`SELECT to_char("createdAt",…), type, count(*) FROM "Notification" WHERE "createdAt" > '2026-09-24' AND hour IN (01,02,03)`.
Corrections to the finding: lines as above; "83 minutes" → "30–89 minutes (Hobby's per-hour precision; measured :53 in
September)"; the `collecting` half is now mostly dormant, the `answering` half carries it. Low stands.
Orchestrator action: none (Sunday 2026-10-25 07:00–08:30 IST is a natural live look, admin-only, read-only).

### L3-04 — MOOT-SINCE 6fb896bd (nudge half) / REFUTED (export half)
Verdict: MOOT-SINCE 6fb896bd for the nudge; REFUTED for the export. The finding falls as a whole.
Confidence in verdict: certain
Citations re-derived: `nudgeGroup` is deleted — `catchups/actions.ts:2427-2432` is the tombstone comment ("Deleted
2026-10-17 …"), and `settings-surface.tsx` has no nudge copy left. The export: `api/account/export/route.ts:93` ("a few
times already today. Try again tomorrow."), `rate-limit.ts:191` (`export: { tokens: 3, window: "24 h" }`), `:231-233`
(single-region `new Ratelimit` with `Ratelimit.slidingWindow`).
What I tried to refute the export half with: the installed `@upstash/ratelimit` v2.0.8's single-region sliding window
(`node_modules/@upstash/ratelimit/dist/index.js:247-262` and `:1576-1579`). Its buckets are `Math.floor(now / window)`,
i.e. for 24 h they turn at 00:00 UTC; the previous bucket's count is weighted AND FLOORED
(`math.floor((1 - percentageInCurrent) * previous)`). With 3 tokens, a member refused after three exports gets a fourth
the moment the UTC day turns (floor(3 × 0.99…) = 2 < 3) — 05:30 IST. So "Try again tomorrow" is true for anyone
refused after 05:30 IST (most of the valley's day) and only over-cautious for someone refused between 00:00 and 05:30
IST; the finding's "refused tomorrow morning too, until 24 hours after the first export" models a true rolling window
that this library does not implement.
Why it falls: half the code path is gone; the other half's copy holds under the limiter actually installed.
Live check run: none needed (library source read).
Corrections to the finding: drop it from the fix list. If anything is kept, it is a Low note that the limiter's day is
UTC (05:30 IST), consistent with the mail budget's day (L3 table row 26).
Orchestrator action: none.

### L3-05 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `src/lib/valley-day.test.mjs:108-131` (the rendered-date sweep; regex at `:123`, unchanged),
`:154-201` (SQL sweep; `walk(..., { match: /\.ts$/ })` and `/\b(date_trunc|to_char)\(/g` at `:183`),
`src/lib/test-kit.mjs:66` (`walk` default `match = /\.tsx?$/`). Neither file changed since the audit. O-01's live
instance is still there: `src/components/letters/drafts-strip.tsx:99-102` (`"use client"`, no `timeZone`).
What I tried to refute it with: replayed the regex verbatim over six shapes in a throwaway `node -e`: the plain
statement is FLAGGED; the multi-line JSX child (O-01's own shape), a one-line JSX child, a template literal, a ternary
branch and a JSX attribute all PASS unflagged — matching the finder's eleven-shape run on the shapes I re-ran.
Why it stands: the gate is green while O-01 ships.
Live check run: the `node -e` replay above.
Corrections to the finding: none.
Orchestrator action: none.

### L3-06 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `valley-day.test.mjs:57-78` (`thisYear = new Date().getFullYear()` at `:63`, the assertion at
`:76`), `src/lib/utils.ts:73-109` (`formatTimeAgo`, `otherYear` via `Intl` in `VALLEY_TIME_ZONE` at `:92-96`). Unchanged.
What I tried to refute it with: a replay at HEAD with `Date` pinned (a `/tmp` script, deleted in the same command):
at 2026-12-31T19:00Z — `TZ=UTC` FAIL ("15 Jun 2026" vs "15 Jun"), `TZ=Europe/London` FAIL, `TZ=America/New_York` FAIL,
`TZ=Asia/Kolkata` skipped (fixture in the future); at 17:00Z under UTC, PASS.
Why it stands: exactly as filed.
Live check run: the pinned replay above.
Corrections to the finding: on a US machine the red window is longer (18:30 UTC to local midnight, e.g. 05:00 UTC for
New York); CI is UTC, so the finding's window is the one that matters.
Orchestrator action: none.

### L3-07 — CONFIRMED-CORRECTED (Low; case for Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (read from GitHub's own run logs)
Citations re-derived: `.github/workflows/backup.yml:53` (`cron: '30 20 * * *'`; the "02:00 IST, the middle of the
valley's night" comment `:43-44`), `:169` (`STAMP="$(date -u +%Y-%m-%d)"`), `:265-268` (plain `aws s3 cp` to
`postgres/rv-connect-$STAMP.dump`), prune `:317-321` (`*-01` kept forever). The workflow grew 170 lines (restore
rehearsal, place list) without touching the stamp.
What I tried to refute it with: whether it still happens after the platform work moved things. It happens MORE:
`gh run list --workflow=backup.yml` + `gh run view <id> --log | grep -o "Uploaded postgres/rv-connect-2[0-9-]*\.dump"`:
- `36943719585` (started 2026-10-01T23:59:59Z) and `37079709122` (2026-10-02T23:53:56Z) → both `rv-connect-2026-10-02.dump`
- `37398726057` (2026-10-06T01:21:16Z) and `37549244337` (2026-10-06T23:56:01Z) → both `rv-connect-2026-10-06.dump`
- `38007796632` (2026-10-10T00:09:18Z) and `38095903829` (2026-10-10T23:41:36Z) → both `rv-connect-2026-10-10.dump`
- `38335535232` (2026-10-13T02:09:24Z) and `38486325978` (2026-10-13T23:47:08Z) → both `rv-connect-2026-10-13.dump`
Four nights' dumps overwritten in 22 October nights (the nights of 1, 5, 9 and 12 October), and no file exists for
03, 05, 07 or 12 October. The 1 October monthly ("kept forever") holds the night of 30 September.
Why it stands: the stamp is the run's UTC date; GitHub now starts this job between 22:29 and 02:09 UTC, straddling
midnight, so collisions are roughly weekly rather than the one-off the finder saw.
Live check run: the `gh` commands above (read-only).
Corrections to the finding: lines as above; frequency "it happened on 2026-08-29" → "2026-08-29, then four times in
October 2026 (10-02, 10-06, 10-10, 10-13)". Severity: Low stands on the brief's scale (adjacent nights survive and the
nightly restore rehearsal `4487283b` proves each surviving dump restores), but about one restore point in five is now
silently lost; the fix session should treat it as the cheapest Medium-adjacent item in the backup family.
Orchestrator action: none.

### L3-08 — FIXED-SINCE a281e855
Verdict: FIXED-SINCE a281e855 ("fix(backup): copy media as plain CopyObjects R2 accepts", 2026-10-03) — not 7f28818c
Confidence in verdict: certain
Citations re-derived: the media job is `.github/workflows/backup.yml:331-415`; the copy step `:355-393` now runs
`aws configure set default.s3.multipart_threshold 5GB` (`:390`) and `aws s3 sync … --copy-props default` (`:391-393`);
the verify step `:395-415` (`SAVED >= LIVE` or exit 1).
What I tried to refute it with (re-check against the fix, as asked): the fix task_plan names, `7f28818c` (2026-09-29,
`--copy-props metadata-directive`), did NOT work: the workflow's own comment (`:382-387`) records that R2 refuses the
`x-amz-tagging-directive: REPLACE` it sends, "It never copied a thing … from 2026-10-01, when there was, all of it
failed (57 objects by 10-02)"; the runs of 2026-10-01T23:59:59Z and 2026-10-02T23:53:56Z are `failure`. `a281e855`
(single CopyObjects under a 5 GB threshold) is the one that works: a `workflow_dispatch` at 2026-10-03T10:09Z and every
scheduled run since are `success`. The latest run (`39872048584`, 2026-10-22T23:28Z): both jobs success, every step
success including "Verify the backup holds at least everything live", which printed `live: 6290 objects, backup: 6657
objects` — the backup holds everything live, the 111 masters included.
Why it falls: the archive's undelete is whole and its verify step now runs nightly. The "nobody reads the red job"
half is also answered: the snapshot's `github` metrics (`backup.ok`, `backup.age_hours`, `backup.failures_last_10`)
have recorded daily since 2026-10-02 (21 rows each, last 2026-10-22, one `backup.ok = 0`) — see cross-zone note on T7b-01.
Live check run: `gh run list --workflow=backup.yml --limit 60`; `gh run view 39872048584 --json jobs`; `gh run view
39872048584 --log | grep "live: "`; `SELECT metric, min/max(day), count(*) FROM "MetricSnapshot" WHERE source='github'`.
Corrections to the finding: canonical over L11-01 (fold, unchanged). The "Already fixed OUTSIDE the audit" list in
`task_plan.md` should cite `a281e855` (with `7f28818c` as the failed first attempt), not `7f28818c` alone.
Orchestrator action: none.

## New candidates

### V-L-a-01 — Reading a member's message on /admin leaves the rail's Messages badge (and the Overview total) at its old number until a reload: the "seen" write happens inside a page render that a soft navigation does not pair with a layout render
- Severity: Low
- Confidence: likely (the mechanism is certain from source and is the one the orchestrator proved live for L2-01; the
  member-visible symptom was not driven live)
- Where: `src/app/(main)/admin/messages/[id]/page.tsx:57-63` (`if (thread.adminUnread) await markThreadSeenByAdmin(...)`
  during the GET render); `src/app/(main)/messages/actions.ts:295-316` (`markThreadSeenByAdmin`: an `updateMany`, no
  `revalidatePath`, and none would help inside a render); the count it leaves stale: `src/lib/admin.ts:≈249`
  (`worklistCounts` → `prisma.adminThread.count({ where: { adminUnread: true } })`, also summed into `waiting`),
  computed only in `src/app/(main)/admin/layout.tsx:30` and published by `AdminCountsSync`
  (`src/components/admin/admin-counts.tsx`), read by the sidebar (`src/components/layout/sidebar.tsx:353,387`); the
  navigation: `src/components/admin/messages/thread-list.tsx` (`<Link>` to `/admin/messages/<id>`).
- Taxonomy: 6c (per-request state living in a layout that a navigation does not re-render) · 6a (a write in a GET)
- Expected: the rail's numbers "say what needs doing" (`admin-counts.tsx` header); a thread the admin has opened is no
  longer counted.
- Actual: the admin sees "Messages 2", opens one thread (soft navigation `/admin/messages` → `/admin/messages/[id]`;
  the trees diverge below `messages`, so `admin/layout.tsx` is not rendered and `loadAdminCounts()` does not run),
  reads it, goes back, opens the other: both are marked read in the database and the list shows them read, but the
  rail still says "Messages 2" and the Overview total is two too high, until a hard reload, leaving `/admin`, or any
  revalidating action (a reply or a status change re-renders from the root and corrects it — L2-02's refutation).
- Why: this is the one path on which L2-02/T7a-22's symptom is real: a worklist predicate changed by something that
  is NOT a Server Action, on a page reached by a sibling navigation.
- Proof: argue-only read-only. Live: with Jerry signed in and an unread thread present, open it from the list and
  read the rail before and after a hard reload. (It needs an unread admin thread to exist; do not create one for it.)
- Fix direction: move the "seen" write out of the render into a small client effect that calls
  `markThreadSeenByAdmin` and then `router.refresh()` (which also answers T7b-12's prefetch fragility, the same line);
  or have the thread view call `router.refresh()` once on mount when it rendered an unread thread.
- Gate: a shape test beside `threads-rule.test.mjs` that `admin/messages/[id]/page.tsx` performs no write in render
  (or that the client mount path refreshes).
- Known-related: T7b-12 (the same line, a different consequence: prefetch marking); T7a-22/L2-02 (refuted, this is
  the surviving case); B-024 (the layout-not-re-rendered mechanism).

## Cross-zone notes
- **V-T7a — T7a-22 is REFUTED by the same source fact as L2-02**: a Server Action that calls any `revalidatePath`
  (path and type irrelevant, `revalidate.js:221-222`) is answered with the whole tree rendered from the root
  (`server-action-reducer.js:300`; no `RSC` header on action requests → no router-state tree → `walk-tree…:59-62`),
  so `saveReview`/`declineReview` on `/admin/review` refresh `admin/layout.tsx`'s counts in the action response;
  `declinePhoto` from the Collection viewer is followed by a navigation INTO `/admin`, which renders the admin layout
  fresh. The surviving instance is V-L-a-01 (a GET-render write), which V-T7a may prefer to own.
- **V-T7b — T7b-01 appears fixed outside the repo**: `MetricSnapshot` has `github` `backup.ok`/`backup.age_hours`/
  `backup.failures_last_10` rows every day from 2026-10-02 to 2026-10-22 (21 each); no commit since `495ecdd2` touches
  `snapshot.yml`'s permissions or `snapshot.mjs`'s GitHub call (only `e29823cb`, `91c07fbc`), so the 403 was most likely
  cured by a token/secret change. Rule it FIXED-SINCE "outside the repo, ~2026-10-02". Also V-T7b: T7b-12 shares a
  line with V-L-a-01.
- **V-L-b — L11-01 folds into L3-08, and both are FIXED-SINCE a281e855**, not `7f28818c` (which failed on 10-01/10-02).
- **V-O-L1 — O-01 is still live at HEAD**: `drafts-strip.tsx:99-102` unchanged (`"use client"`, no `timeZone`);
  L3-05 is why no gate catches it.
- **V-T8 — T8b-15 is still open at HEAD**: `(main)/error.tsx:29,44` and `src/app/error.tsx:6,25` bind `reset`; L2-06's
  and L2-03's consequences inherit the dead "Try again".
- **V-T5 — on T5-07 (refusal copy promising "a minute")**: the installed Upstash sliding window turns its buckets on
  epoch-aligned windows (`Math.floor(now / window)`) with a floored carry-over; for a long window the real wait is "until
  the window boundary", which is relevant if the fix computes a retry time from `reset`.
- **task_plan.md "Already fixed OUTSIDE the audit"**: L3-08's commit should read `a281e855` (first attempt `7f28818c`
  failed); L2-01's `8d35ff4e` is confirmed across all 25 server rooms.

## Coverage
- Checked completely at HEAD 88642426: L2-01, L2-02, L2-03, L2-04, L2-06, L3-01, L3-02, L3-03, L3-04, L3-05, L3-06,
  L3-07, L3-08. Partially: none.
- Read in full for the zone: `work/brief-validator.md`, `work/brief-common.md` §1–§3, `work/dedup-baseline.md`,
  `work/validation-zones.md`, `work/rebaseline.md`, `work/reports/L2.md`, `work/reports/L3.md`; grep of `findings.md`
  and `leads-routed.md` for L2/L3 rows; `reports/T7a.md` T7a-22 and `reports/T7b.md` T7b-12 for the cross-zone rulings.
- Source read at HEAD: `src/app/lab/_gate.ts`, `lab/layout.tsx`, `lab/actions.ts`, the gate sections of all 25 server
  lab rooms (enumerated), `lab/catchups/sketches/_data.ts:60-110`, `lab/valley/page.lab.tsx`; `src/lib/gate-coverage.test.mjs:250-288`;
  `(main)/layout.tsx` (whole); `src/lib/auth.ts:530-595`; `proxy.ts` diff since `495ecdd2`; `api/auth/stale/route.ts`,
  `api/users/first-names/route.ts`, `src/lib/api-gate.ts:93-110` (new routes vs the allowlist: both gated, clean);
  every `revalidatePath("/admin"…)` site; `admin/layout.tsx`, `admin-counts.tsx`, `admin/review/actions.ts:100-125`,
  `review-room.tsx:118-250`, `admin/messages/[id]/page.tsx:40-75`, `messages/actions.ts:283-316`, `src/lib/admin.ts:180-280`;
  the null-session lines of the seven L2-03 pages; `catchups/edition/[editionId]/page.tsx:60-215`; `feed/page.tsx`
  (whole), `feed-rail.tsx`, the three rail modules' awaits, `celebration-signals.tsx:30-40`, both `error.tsx`;
  `src/lib/confirmation-copy.ts` (whole) and its test; `scripts/dev/export-catchups.mjs:60-100`; `catchups-core.ts:295-340,
  690-735`; `catchups.ts:425-460`; `catchups/actions.ts:2420-2432`; `api/account/export/route.ts:85-96`;
  `rate-limit.ts:150-233`; `valley-day.test.mjs` (whole); `utils.ts:73-109`; `drafts-strip.tsx:94-102`;
  `.github/workflows/backup.yml:42-58,160-170,260-330,331-415`.
- Next 16.3.8 source read: `server-action-reducer.js:40-80,100-175,270-330`; `app-render.js:190-212,320-380`;
  `action-handler.js:115-125,950-1010`; `walk-tree-with-flight-router-state.js:40-75`; `spec-extension/revalidate.js:80-86,
  215-224`. `@upstash/ratelimit` 2.0.8 `dist/index.js:236-262,440-470,1285-1290,1576-1602`.
- Commands run (all read-only): `node --test src/lib/gate-coverage.test.mjs` (31 pass); `node --test
  src/lib/confirmation-copy.test.mjs` (13 pass); one `/tmp` replay of L3-06 (deleted by the same command); `node -e`
  regex replay (L3-05) and export comparison (L3-02); `run-sql.mjs --inline` SELECTs on `CatchupSeries`,
  `CatchupEdition`, `Notification`, `AuditLog`, `MetricSnapshot`, `information_schema.columns`; `gh run list` /
  `gh run view --json jobs` / `gh run view --log | grep` on `backup.yml` runs.
- Not done (by rule): any live request to the dev server, any sign-in, any browser; L2-02's and V-L-a-01's member-visible
  confirmation (each needs an admin write or an unread thread).

STATUS: COMPLETE at HEAD 88642426
