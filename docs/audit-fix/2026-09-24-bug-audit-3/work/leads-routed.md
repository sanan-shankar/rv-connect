# Leads routed between agents (orchestrator-maintained)

A finder that reads this file before hunting takes the rows addressed to it as SEEDED
QUESTIONS: confirm, refute, or fold into a finding of its own, and say which in its report.
Rows are appended as reports come in; the source agent is named so duplicates fold cleanly.

## From L1 (races-mutations), 2026-09-24 01:50 BST

- **T7a / T6 / L10** — `src/app/(main)/admin/people/actions.ts:630-654` + `src/lib/roster.ts:77-86`:
  `adminUnverifyUser` writes `verifyState: "unverified"`, and `tryRosterAutoVerify`'s CAS admits
  `unverified` → the next name/batch edit, email confirmation or "ask to be verified" by a
  roster-matched member silently RE-VERIFIES them with `office_list`, undoing the admin's decision.
  A state-machine hole, not a race (an admin who means "keep them out" has to use "flagged").
  Orchestrator's view: this reads as at least Medium — an admin's explicit decision reverts on its own.
- **T1 / L12** — `src/app/(main)/feed/actions.ts:579,662-666,682`: `editPost` queues `removedImages`
  for purge with no "still named by another post" check, unlike `deletePostWithImages:85-96` (C-018).
  Reachable only by attaching one owned upload url to two drafts through a hand-made call.
- **L11 / L5** — `src/lib/email-queue.ts:995-1025`: the page-view send (`verificationMailState`,
  sendInline or `scheduleSend`) is deliberately OUTSIDE the drain lease; N unverified members' first
  page views at the budget boundary each pass `verifyRemaining > 0` before any claim is counted, so
  the day's cap can overshoot by N (5 of margin). Recoverable; worth a number at launch.
- **L11** — `src/lib/retention.ts:294-304`: two overlapping sweeps both list the same due account; the
  second purge's `deleteMany` matches nothing → `PurgeCancelled` → counted as `accountsSpared` (wrong
  word, right outcome).
- **L11** — `src/app/api/resend/webhook/route.ts:103-151`: an `email.delivered` arriving after
  `email.bounced` leaves `status: "failed"` with `deliveredAt` set; no ordering rule.
- **L5** — every interactive `$transaction` without options inherits `maxWait: 2000` against a pool of
  5 with `connectionTimeoutMillis: 5000`: under a burst a transaction that cannot get a connection
  in 2 s throws P2028 rather than waiting the pool's 5 s.
- **T2a** — `src/app/(main)/catchups/actions.ts:749-761`: `updateCatchupCadence` decides
  `shouldReschedule` from a `nextOpensAt` read before its write; if the clock's `openNextEdition` CAS
  clears it in between, the cadence change re-stamps a `nextOpensAt` under a freshly opened Edition
  (self-heals at publish; the home may print a wrong "next Edition opens" date meanwhile).
- **T2a / L3** — `src/app/(main)/catchups/actions.ts:1581-1589`: `extendDeadline` deletes stale
  reminders AFTER its CAS; a reminder transaction committing between the two leaves one "last day to
  answer" bell alive with a week left.
- **T7a / L9** — `src/app/(main)/admin/people/actions.ts:383-389`: a merge carries a Keeper
  duplicate's role over as `"admin"`, not `"keeper"`, which `setCatchupKeeper`'s revoke
  (`role: "keeper"` only, C-025) can then never take back.
- **L4** — three `update`/`delete` calls that throw P2025 to a second actor in the same instant and
  surface as the generic sentence: `catchups/actions.ts:1242` (curatePrompt remove),
  `admin/reports/actions.ts:26-30` (adminHidePost), `collection/actions.ts:1163` (adminRemovePhoto).
- **T2b** — `src/app/(main)/catchups/actions.ts:1955-1960`: the empty-answer
  `deleteMany({ where: { id } })` runs after the tx with no content precondition; unreachable today
  because every writer holds a version.
- **T8a** — `src/app/(main)/support/actions.ts:274-293`: `chooseBird`'s "one pick per contribution"
  is a read-then-write; benign today, but the comment's "the second is refused" is only true
  sequentially.
- **L6** — the double-submit twin match is BYTE equality on stored text (`feed/actions.ts:242-263`,
  `comment-thread.ts:277-287`, `messages/actions.ts:108-115,173-182`): an NFD retry against an NFC
  original is not a twin. Razorpay `refund.entity.id` lands in `reversalIds String[]` with no length cap.

## From the orchestrator's own reads, 2026-09-24

- **T1 / L3 / L9** — `src/components/letters/drafts-strip.tsx:99-102`: `toLocaleDateString("en-GB",
  {day, month})` with NO timeZone inside a JSX expression → live hydration mismatch in the dev log
  ("23 Sept" server vs "24 Sept" client). `valley-day.test.mjs:123`'s regex does not match a call that
  closes with `})}`, so the gate is green with the bug present. Orchestrator finding O-01 — T1 need not
  re-derive it; L9 should say why the sweep missed it and what else that regex shape misses.
- **T5 / L5 / L10** — `node_modules/@auth/core/lib/actions/session.js:58-62`: a throw inside
  `callbacks.session` (auth.ts's `prisma.user.findUnique`) is logged as JWTSessionError and the session
  is NULL → `(main)/layout.tsx:28-38` redirects to `/login?next=…`. The dev log shows 12 such entries
  with cause "Connection terminated due to connection timeout" during today's visual run. Orchestrator
  finding O-03 (High): a 5 s pool timeout signs a member out mid-form. T5: confirm nothing in auth.ts
  distinguishes "DB unavailable" from "no session"; L5: this is the shape of the 2k failure under Fluid
  compute's per-instance concurrency; L10: the chaos row "DB slow mid-request".
- **L2 / L4 / T8b** — dev log (one occurrence, during the crawl's aborted /profile/<id> load):
  "Route /profile/[id] used `cookies()` inside `after()` while rendering". `profile/[id]/page.tsx:403`
  awaits `getThemeCookie()` DURING render; the likely cause is an aborted request starting the route's
  `after()` callbacks while the render was still in flight. Suspected artefact; say whether Next's
  after-scope can misattribute like this, and whether any after() body on that route reads cookies.
- **L8 / L11 / T2a / L3** — Vercel Hobby crons have per-hour precision (±59 min; doc last_updated
  2026-07-15) and 100 crons per project (the "two slots, both spent" in retention.yml,
  catchups/tick/route.ts and retention/sweep/route.ts is stale). The tick at 02:00 UTC fires 07:30–08:29
  IST, always after the 07:00 IST deadlines: anything computing "today" or a grace window from the run
  time must tolerate an hour of lateness.
- **L5 / L8** — Vercel Fluid compute: one instance serves MANY concurrent invocations, so prisma.ts's
  `max: 5` is shared by every request on that instance; 1,024 file descriptors per instance. The
  prisma.ts comment's "5 × ~40 instances" model predates Fluid. Supavisor transaction mode QUEUES
  clients for a server connection; prepared statements are not supported in transaction mode.
- **L9** — the visual suite's letters shot went red on the account chip's bird at the sidebar's foot
  although `.hoopoe-mascot` is masked (`e2e/visual.spec.ts:91`): the mask can miss on a green-code run.
- **T7a / L11** — the tick route returns `{ok:true}` unconditionally and `advanceDueCatchups` "can never
  throw": a broken advance is invisible to the cron log. Does anything record what a run did?

## From T4a (collection-pipeline), 2026-09-24 02:05 BST

- **T7a** — `account-purge.ts:428-436` + `retention.ts:340`: `drainPendingImagePurges` takes `limit = 500` for both the immediate post-purge drain and the nightly sweep; a member at the 2,000-photo ceiling books 6,000 objects → their photographs stay publicly fetchable for up to eleven nights after "Delete my account", and the audit line reports "500 removed" with the remainder unsaid (`imagesFailed` 0).
- **T7a / L2** — `declinePhoto`/`saveReview` call `revalidatePath("/admin")` while the queue lives at `/admin/review` and the counts render on `/admin/content` and the people page; check the Overview's "waiting on you" count for staleness after a decline.
- **T7a** — `adminRemovePhoto` keeps the row with url/thumbUrl/screenUrl pointing at purged objects; any admin list rendering hidden rows' thumbnails shows a broken image.
- **T1** — `ownedUploadUrls` permits one uploaded object on two of a member's posts; `deletePostWithImages` purges every image of the deleted post — does it check "still named by another post"? (L1 raised the editPost twin; this is the delete side.)
- **T1 / L8** — `feed/actions.ts:299-307` runs `copyPostImagesToCollection` inside `after()` on `/feed`, which exports no `maxDuration`; three images = three R2 GETs, three sharp passes, six PUTs; the helper swallows everything by contract.
- **T4b** — every first page (each filter/order/debounced search change) runs three queries: the page, the rail `groupBy`, and the full-archive `geometry` select with no `take` (~20KB per 1,700 rows); the search box fires it on every pause in typing.
- **T8a** — the demo's `Photo` table lacks `exifYear`/`exifMonth` (`2026-08-30-photo-exif-date.sql` never applied there): a concrete cause of the demo's `/collection` 500. Owner has deferred the demo; record, do not fix.
- **L6** — `togglePhotoLove(photoId)`, `deleteOwnPhoto(photoId)`, `editPhoto({id})`, `declinePhoto(photoId, reason)`, `loadBand(key)` take unvalidated strings; a NUL byte reaches Postgres → `ACTION_FAILED`; in `declinePhoto` that happens AFTER the row is erased and before the uploader's notification is written.
- **L3** — nothing in the Collection computes a server-side "today"; `buildKey`'s `YYYY/MM` partition uses the server's UTC month (cosmetic).
- **L9 / everyone** — T4a-10: the schema header's "ELEVEN indexes", TRAPS.md:41, media.md:219, the "still in both databases until the owner runs" comments, and the presign route's "lands under collection/ as a -o original" comment are all stale against production (see the corrected dedup baseline row D).

## From T5 (auth-email-tokens), 2026-09-24 02:10 BST

- **T1 / L10** — `src/components/posts/use-letter-persistence.ts:322` mentions `credentialVersion`; confirm the local belt also covers the EXPIRED-COOKIE rejection path (T5-06: the proxy answers an action POST with a redirect to /login, `callAction` maps it to "Check your connection").
- **T2b / T4b** — the same question for Catch-up answers and upload finalize: what does the member see when the 90-day cookie lapses mid-answer or mid-upload?
- **T8b / L8** — `next.config.ts:328-329` `serverActions.bodySizeLimit: "25mb"` is far above Vercel's 4.5 MB hard cap; `src/proxy.ts:296-320` answers a server-action POST without a session with a page redirect (T5-06's root) instead of a machine-readable 401.
- **T7b** — `last-seen.ts:284-298` vs `stats-exclusion.ts:17-20`: `lastSeenAt` IS written from localhost for whoever dev-login signs in as (T5-15); the exclusion comment says nothing is.
- **T7b** — `@auth/core` prints `[auth][error] CredentialsSignin` to console for EVERY wrong password; if console capture is ever enabled in Sentry that becomes noise — budget for it.
- **T6** — there is NO signed-in "change password" action anywhere (only the mailbox reset); together with T5-01 (no email change) the mailbox is the single credential path. Owner decision.
- **T6 / T7a** — the `anonymous` system row is `verifyState: verified`, `emailVerified` set, `accountType: alumnus`, with a real-looking email; confirm every people surface, the roster matcher and the batch-group builder exclude it.
- **T7a** — `RETRY_RESET` (`mail-policy.ts:135-142`) does not clear `bouncedAt`/`deliveredAt`/`providerId`; a retried-then-sent row keeps a stale `bouncedAt`.
- **L5** — the (main) layout runs `verificationMailState` (a findFirst + two counts) on every unconfirmed member's every page view and the drain's pre-check count for everyone (`layout.tsx:93-95,116-122`): a write-path connection on the hottest read path.
- **L4** — T5-02's list of console-only alarms (auth.ts:181-183/291/313, turnstile.ts:153/180/195-197/202, email-queue.ts:117-121/133-137/226-230/767-770, email.ts:193/222/227/241, auth/actions.ts:215, email-actions.ts:274, roster.ts:101, resend webhook :29/42/80/178/184, layout.tsx:120) is already a finding; L4 should extend the same question to every OTHER territory's catch blocks and say which of them reach `reportSwallowed`.

## From T2a (catchups-lifecycle), 2026-09-24 02:20 BST

- **T3** — `catchups/[catchupId]/(home)/page.tsx:70-78`: the People roster has no standing filter (blocked / deletion-pending members listed, T2a-13); and the list's "spare slot" covers by `publishedAt` should be checked against a capsule opening AFTER a later Edition (its publishedAt is newer than Edition N+1's).
- **T3** — `catchups/settings/settings-surface.tsx:302-307, 745-750, 760-765`: the Hold and End copy — T2a-06 (Hold freezes the CURRENT Edition against the owner's O3 ruling) and T2a-07 (End mid-answering strands a week of answers, unreadable for ever) are the words a fix will change; say what the member sees on those surfaces today.
- **T6** — `profile-actions.ts:228-240` and `admin/people/actions.ts:114-174` are the `batchYear` writers that must MOVE the batch membership (T2a-01, High, 7 live cases); also `api/users-by-batch/route.ts:36-41` filters isBlocked/deletionRequestedAt but not accountType, so a teacher row with a batchYear would be offered by the "everyone from my batch" picker and silently dropped at creation.
- **T7a** — `admin/catchups/(index)/page.tsx:122` and `[catchupId]/page.tsx:134`: the admin fallback title is the plural "`${group.name} Catch-ups`" the spec says was deleted (cosmetic). And `admin/people/actions.ts:378`: the account merge rewrites `Group.creatorId` — does it also move `GroupMember` rows and `Catchup.createdById`, or can a merged creator lose the Keeper's hat?
- **T2b** — `catchups-edition-view.ts:141-166`: entries by BLOCKED authors are shown while their comments are hidden (`VISIBLE_COMMENT` at :169); one rule wanted.
- **L4 / L8** — `(main)/layout.tsx:83-103` + `catchups.ts:334, :532`: `reportSwallowed` runs on every authenticated page view with no throttle; a ten-minute database brownout at launch traffic emits one Sentry event per page view from this path alone (free plan 5,000/month).
- **L6** — `catchups/actions.ts:467-480`: `createCatchupWithPeople` never checks the CREATOR's accountType; a verified teacher can start and keep a Catch-up by calling the action directly (the layout only hides the form).
- **L5** — `catchups/actions.ts:1583-1590`: `notification.deleteMany({ type, link })` with no userId is a sequential scan of Notification per "Give everyone longer" press.
- **L8** — `api/catchups/tick/route.ts:31` `maxDuration = 120`: the build accepting it is the only evidence Hobby honours it (orchestrator: Vercel's doc says Hobby default AND max are 300 s under Fluid — honoured).
- **L9** — the comment lies in T2a-11 plus `prisma/migrations-manual/2026-09-08-batch-catchups.sql`'s header ("tells the batch its questions are open", false since 2026-09-22), `catchups-core.ts:317-335` and `catchups-core.test.mjs:314` ("within thirty minutes" — 89 on Hobby).
- **L11** — T2a-14: nothing records that the nightly tick ran; the retention sweep and the snapshot have the same shape — say for each job what evidence of a run exists anywhere.

## From T7a (admin-purge-retention), 2026-09-24 02:50 BST

- **L8 / owner question** — `admin/people/[id]/page.tsx` and `profile/[id]/page.tsx` host the delete action with no `maxDuration`; `sweep/route.ts:37` says "300 seconds is the Hobby plan's ceiling" (the Fluid number). Orchestrator: Vercel's doc (2026-08-24) says Hobby default AND max are 300 s under Fluid compute, and Fluid is on by default for new projects; whether THIS project (created 2026-06/07) runs Fluid is a dashboard fact → owner question, default assumption "Fluid" (T7a-05 = Low under that assumption).
- **T2a / L9** — `catchups-core.ts:436-441` and `catchups/actions.ts:2692-2696` say the group "admin" role "lets a group admin delete anyone's post in that group" via deletePost; `Post.groupId` left the schema 2026-09-07 and `deletePost` has no group clause. `docs/spec/admin.md` §9.6 still names a `preparing` state.
- **T6 (and T4b for the viewer)** — `collection/actions.ts:1030-1066` (`erasePhoto` via declinePhoto/deleteOwnPhoto) and `:1153-1177` (`adminRemovePhoto`) never clear `User.coverPhoto` on OTHER members' profiles pointing at the erased bytes; only the account purge does (`account-purge.ts:288-301`). A member deleting their own approved photograph leaves everyone wearing it as a banner with a dead URL.
- **L6 / T1** — `keyset.ts:58-60`: `decodeKeyset` bounds `ms >= 0` and `isSafeInteger` but not the Date range; `new Date(8.7e15)` is Invalid, Prisma rejects it, so a crafted cursor THROWS out of every keyset-paged action (feed, bell, comments, admin people) instead of serving page one.
- **L3 / L11** — T7a-19's three clocks (email day, audit day, sweep instant: "erased on D+60" vs the sweep purging on the first run after request+60d, i.e. D+61 morning for requests after 02:30 IST); AND `retention.yml`'s 21:00 UTC lands 80–105 min late on GitHub's scheduler (42 audit rows: 22:20–22:45 UTC) — the "30 minutes after the backup so the two never share a pooler connection" reasoning does not hold; check the backup's actual run times too.
- **T8b / T5** — `(policies)/privacy/page.tsx:145-154`: the retention table has no row for presence/search telemetry (`Visit`, `SearchLog`, 90 days per SECURITY.md:87) although :191 discloses the visit statistics.
- **T7b** — `components/admin/analytics/presence.tsx` carries `animate-pulse` (the grey pulse the house rule forbids); `admin-counts.tsx:51-58` `publish()` value-compares four of five counts and omits `photos`.
- **T5 / T6** — `retention.ts:126-127`: OutboundEmail rows deleted at 180 days by `createdAt` regardless of status; a member who signed up 181 days ago and never confirmed loses their `verify` row, so `verificationMailState` and the People list's email state read "none" — what does the member's banner say then?
- **L9** — `docs/planning/bugs.md` #21 ("Done is not a button") appears FIXED in code (`review-room.tsx:815` passes `nativeButton={false}`) but is still listed open.
- **Everyone** — T7a-08: the "flagged" verifyState has NO writer anywhere (0 rows); every surface built on it is dead copy. Do not propose "use flagged" as a fix.

## From T1 (feed-posts-letters-comments), 2026-09-24 03:05 BST

- **T7a validator** — `admin/people/[id]/page.tsx:68`: `comment.count({ authorId, isHidden: false })` counts soft-deleted rows (no `deletedAt` filter) and Catch-up answer comments together with feed comments.
- **T6** — `api/account/export/route.ts:178`: confirm both comment owners (post / Catch-up entry) are labelled in the export.
- **T7b** — `feed/page.tsx:38-40`: `logSearch` receives the raw `q` with no cap (`SEARCH_TERM_MAX` applies only inside `escapeLike`); check `SearchLog.query`'s stored length and `isSameSearch` on a 100 KB string.
- **T2b** — `catchups-edition-view.ts:146`: the same whole-table `_count.comments` aggregate as T1-17, on `CatchupEntry` (Prisma compiles a filtered relation `_count` into an uncorrelated GROUP BY over the whole Comment table joined to User).
- **L5** — `clearCatchupNotifications` and `post-notifications.ts:83-92` delete Notification by `link` with no index (T1-21's shape); `PollOption` has no `postId` index (T1-20); `User` has no `createdAt` index (T1-22).
- **T8b / L2** — `(main)/layout.tsx:83-131`: every revalidating action anywhere re-runs this layout (T1-06 measures the multiplier: a draft autosave every 2.5 s re-renders page + layout, ~8 queries + a drain attempt + a presence touch); `after(drainMailQueue)`/`after(touchLastSeen)` run on each action-triggered refresh, not only navigations.
- **L9** — `feed/actions.ts:750-767` attributes an "occasional scroll-to-top" to `revalidatePath`; Next 16.3.1 `ppr-navigations.js:306-320` shows a same-structure refresh never scrolls (comment mechanism stale, rule still right). `notification-links.test.mjs:42` sweeps WRITERS only, so `post-card.tsx:374`'s share link escapes it (T1-10). `post-visibility-rule.test.mjs:385` passes while `loadSavedPosts` composes one arm (T1-24): the sweep does not see a nested `post:` where.
- **T5 validator / T5-06** — `use-letter-persistence.ts:332`: with the cookie present but the JWT revoked (credentialVersion bump), the autosave toasts the raw "Not authenticated"; the redirect variant says "check your connection".
- **T4a validator — NEW CANDIDATE V-T4a-A** — `collection-intake.ts:105`: `getImageBuffer(key)` reads the FEED's display copy (the 1920px WebP from `/api/upload/finalize`), so a post photograph ticked into the Collection is stored as a downscaled second-generation WebP, unlike a contributed one. TRAPS says the direct path does not downscale; the tick's copy is not archive quality and nothing tells the member. Deliberate or not — validate and rate.
- **T4a validator — NEW CANDIDATE V-T4a-B** — `use-composer-uploads.ts:187`: `remaining = MAX_IMAGES - shots.length` reads the closure's `shots`; two drops in quick succession can stage more than three thumbnails and the server then refuses the whole post ("Up to 3 photos") with four on screen.
- **L6 / T6** — the mention query reaches `/api/users/search` as `\w*` (ASCII only, T1-19); the endpoint's own cap and limiter are theirs.
- **L10** — `loadPosts`/`loadComments` return "empty" for a missing session (T1-09): the identity-state row for the whole feed surface — sweep the other read actions for the same shape.

## From T2b (catchups-answers), 2026-09-24 02:30 BST

- **T3** — `catchups/actions.ts:1740-1747` + `vote-question-rule.ts:109-113`: a non-vote question REFUSES `pollOptionId: null` ("This question isn't a vote."); a ballot surface that always includes the key would break every text answer — send the key only on a vote. And `answer-experience.tsx:131-142`: a signed-out save is toasted as "Check your connection" and the typed answer has no local belt (T5-06's face here).
- **L12 / T2a validator** — `catchups/actions.ts:394-401` `loadMemberEdition` runs `loadFreshEdition` (which runs `advanceEdition`, a WRITE) BEFORE the membership check; a non-member holding an editionId/entryId (`toggleEntryLove:1996-2006`, `loadEntryComments:2108-2121`) can drive the clock of an Edition they are not in. Idempotent, but spec §3.4(2) promises "a non-member cannot trigger a write by opening a url".
- **T1 validator / L6** — `comment-thread.ts:124`: `take` is not coerced; the feed's `loadComments` shares T2b-11's NaN hole.
- **L8** — `catchups-edition-view.ts:183` + `link-preview.ts:90-91,307-335`: one page render can leave up to 16 resolves × (5 s page + 5 s image + decode) running in `after()`, ~40 s of background function time per view of a fresh Edition.
- **T7a validator / L11** — no retention row for `LinkPreview` (T2b-02); any DB↔R2 reconciliation built for C-064 must include `audio/` and `link-previews/`.
- **T4a validator / L4** — `image-purge.ts:53-69` `purgeImageUrls` also calls `forgetImages(present)` for audio URLs (harmless; the name lies for one caller).
- **L9** — `voice-answer-rule.ts:43-52` states only the short direction of the length/bytes mismatch (T2b-04); `export-catchups.mjs:40` documents an `audio/` output the script cannot produce (T2b-03).
- **L5** — `catchups/actions.ts:2305-2334` `clearCatchupNotifications` builds one `startsWith` OR-arm per Edition plus the type list; per-user scan, grows with Editions.
- **Orchestrator live pass** — naughty-strings inputs for the answer body, prompt text, vote choices ("Yes"/"Yеs" Cyrillic fold trap), link-preview titles (`&#x202E;` decodes to a real RTL override in a card title), recording fields, `loadEntryComments` opts — all listed in T2b's report §Inputs.

## From T6 (people-profile-directory), 2026-09-24 02:40 BST

- **T7a validator** — `admin/people/actions.ts:190`: the admin's OWN person edit re-runs `tryRosterAutoVerifyQuietly` (an admin who unverifies someone and then corrects their name re-verifies them by hand); `:114-122` the admin batch-year window (1930, +10) disagrees with the pen's (1926, +7) — T6-12.
- **T3 / T2a validator** — T6-02: what `/catchups` renders for a member holding two batch-group rows (two batch Catch-ups? which one the home leads with?); and `/api/users-by-batch` needs the batch tiles' `accountType` exclusion.
- **T1 validator** — `profile/[id]/page.tsx:383`: the Photos grid links each image to `/feed#<postId>`; confirm C-052's scroll works for a link arriving from another route, not only from the bell.
- **T8b** — `(policies)/privacy/page.tsx:177`: "You can see and change everything on your profile in settings" — there is no /settings route and the login email is not changeable (T5-01/T6-06); `:177-178` promises "a copy of your data", which T6-03 says the export is not.
- **L5** — the directory's eight-leg `Promise.all` is single-digit ms per leg at 2,000 rows; the risk is many concurrent directory renders sharing one Fluid instance's `max: 5`, not one render. The pin query fetches every member with a place (~2,000 rows at the ceiling).
- **L9** — comment lies: `places/search/route.ts:22-26` (altNames "no index" — it has a GIN trigram the planner uses, T6-13); `account/export/route.ts:22-31` "never holding more than a page" (true of the DB side only); `roster.ts:13-16` says the hook fires "when onboarding writes the batch year" — onboarding no longer writes one.
- **T5 validator** — `validators.ts:102` signup phone has no minimum while the contact editor's `phoneList()` has `min(4)`: a member who signed up with "123" cannot save ANY change to the Reaching you card until they delete that row (T6-12).
- **T7b** — `ContentView` bounded per (viewer, kind, target) as designed (1,077 rows); `SearchLog` gains one row per 300 ms typing pause on the directory, covered by the 90-day sweep.
- **Orchestrator (live, resolved)** — T6's clean note on O-02 agrees: the profile route's only `after()` body is `recordView`, which reads no cookies; the log line was an attribution artefact of an aborted render.

## From T4b (collection-surfaces), 2026-09-24 02:50 BST

- **T8b / L7 — the Dialog primitive** — `ui/dialog.tsx:15-29` + `back-closes.ts:170-184, 215-223`: every dialog or sheet that REFUSES a close inside `onOpenChange` (a dirty form, a save in flight) loses its back-closes entry on the first Back and the NEXT Back navigates the page (T4b-02 is the Collection's instance: "Discard 40 photographs?" → Cancel → Back → the page is gone). The letters desk, the composer, `confirm-dialog.tsx` (refuses while busy), `edit-photo-dialog.tsx:142` (refuses while saving) and any "unsaved changes" guard on a Dialog are the same shape. Grep `onOpenChange` handlers that return early.
- **L2 / T6 / T7a validator — replaceState as a navigation** — `collection-client.tsx:397-419` writes filters with `window.history.replaceState`; Next 16.3's patched `replaceState` dispatches a RESTORE that spawns an RSC GET of the new URL (T4b-08, "likely"; the orchestrator will settle it with one network-tab look). If it holds, the directory's URL-driven filters (`directory-client.tsx`) and the admin filter sheet pay the same second server render per interaction.
- **T4a validator** — `actions.ts:977` `loadBand` returns 600 rows with no `complete` flag or continuation; T4a-02's client half needs one. `loadPhotos`' cold `?when=` seek plus `pageAbove` is work the client never lands on (T4b-09).
- **T3** — `photo-rows.tsx:186-189` says a `PhotoStream` without `keyOf` is "wrong for anything that filters, sorts or paginates"; confirm the Catch-up photo wall and the answer photographs pass it.
- **T4a validator / L10 / owner** — a BLOCKED member's photographs stay on the river, the permalink and the feed rail card with their name (`buildCollectionWhere` filters scope/approved/isHidden only; `decidePhotoVisibility` knows nothing of block state). The schema's `isBlocked` comment says the Collection is deliberately exempt (an admin approved the photograph into a shared archive) — so this is BY DESIGN unless the owner wants otherwise; the post rule has a comment, the Collection rule should too.
- **T9** — `contribute-room.tsx:214-221`: the `FlyAwayHoopoe` flight is held OUTSIDE the Dialog so it can outlive the glass; check its lifetime and cleanup when the room unmounts mid-flight.
- **L9** — `docs/OPERATIONS.md:36-40` still calls the phone scrubber "a timer rather than a state" (a fixed chip since 2026-09-12, T4b-11); `collection-data.ts:64-69` promises a valley fallback for an unreadable scope that the code does not perform (T4b-05); `collection-client.tsx:376-377` "this must not refetch the route" (T4b-08 if confirmed).
- **Orchestrator live pass** — T4b's §Inputs: an SVG drop with no intrinsic size collapses the stage (NaN heights), a NUL in a caption turns an input edge into a lost contribution via T4b-03, 20,000-char search in the URL.

## From T8a relaunch (money-demo), 2026-09-24 08:30 BST

- **Every finder and validator quoting database times** — `scripts/dev/run-sql.mjs` prints `timestamp without time zone` columns one hour EARLY on this BST machine (node-pg parses them as local time). Cast with `::text` in the SELECT, or add the hour; relative gaps are unaffected. (Sent to T3, T7b, L5 by message.)
- **T5 validator** — T8a-12 is T5-17/O-03's money-path consequence: a session read that times out makes `confirmContribution` answer "Not authenticated" in red AFTER payment and re-enables the Contribute button. T5-17's `SessionUnavailable` throw would route it to the "went through" branch by itself.
- **T8b** — T8a-16's fix may land in `src/components/common/bird-avatar.tsx` (photo outranks a paid bird pick everywhere) if the owner picks "a paid pick outranks the photo". (Sent by message.)
- **L9** — three comments still call a reversal terminal (`schema.prisma:1401-1402`, `contribution-state.ts:35`, `:46`) although C-086's `unfoldDispute` moves "disputed" back to "paid"; `prisma.ts:64-68` over-claims the demo guard's reach over nested writes (only `User`'s object values are refused, `demo.ts:275-278`); `webhook/route.ts:111-124` and `razorpay.ts:136-143` rest on M59's refuted premise (T8a-15); `route.ts:231-240` says the browser callback usually wins (it has lost 4 of 4, T8a-11); `pick-bird/page.tsx:18-19` promises a standing door from /support that the owner removed.
- **T4a/T4b validator** — `/collection` and `/collection/[id]` read `Photo` with `include:` (`collection-data.ts:274-277, 317-326`), so a single missing column 500s the whole page, not just its reader (only the demo database can drift today: it lacks `Photo.exifYear/exifMonth`).
- **Owner / support spec** — `confirmContribution` records Razorpay's AUTHORIZATION as "paid"; right only while the Razorpay account auto-captures (true today, a dashboard setting outside the repo).
- **L11** — T8a-15 (bad-signature 200 silences Razorpay's retry and disable alarm), T8a-11 (the webhook wins the race 4 of 4, so the bell fires on the ordinary path), T8a-17 (the demo Reset reloads on a 500).

## From T8b (shell-common-config, relaunch complete), 2026-09-24 08:50 BST

- **T7b** — `posthog-identify.tsx:48-53` and `sidebar.tsx:485`: there is no `posthog.reset()` at sign-out, so
  the device keeps the previous member's `distinct_id`. The landing and login events after sign-out are
  attributed to them. A second member signing in on that browser switches ids without an `$identify`
  (posthog-js only sends one from an anonymous state, `posthog-core.js:2343+`), so their person record never gets
  its `$set` properties. Worse, `opt_out_capturing()` for an excluded account (`posthog-identify.tsx:52`)
  persists in storage, and there is no `opt_in_capturing()` for a non-excluded member, so everyone who later
  signs in on a browser the owner, an admin or the test account used is silently opted out.
- **T7b** — `posthog-client.ts:91`: `autocapture: true` with no `mask_all_text`. `$el_text` of a clicked
  non-input element (a directory card, an identity row, a mention) carries other members' names to PostHog's
  EU cloud, which the privacy page calls "first-party usage analytics" (T8b-06 item 6).
- **T5** — `sidebar.tsx:485` `signOut({ callbackUrl: "/" })` has no catch. A failed CSRF or signout fetch
  (`next-auth/react.js:187-199`) is an unhandled rejection and the button silently does nothing.
- **T6** — `directory/where.ts:99-100` is T8b-21's server half. `common/filters/facet-search-select.tsx:70-72`
  matches options with a plain `toLowerCase().includes`, with no diacritic folding ("Sao Paulo" does not find
  "São Paulo", "Zurich" does not find "Zürich") and no aliases. C-091 fixed the server's city facet, not this
  client-side option filter.
- **T1** — T8b-17 is `edit-post-dialog.tsx`'s geometry. T1's data-path verdict on it (T1.md:361) stands.
- **T8a** — the T8a-16 question is answered in Verified clean: three places encode photo-first.
- **L8 / owner** — `next.config.ts:207` `interest-cohort=()`: an unrecognised Permissions-Policy feature in
  current Chromium, which logs "Error with Permissions-Policy header: Unrecognized feature: 'interest-cohort'" on
  every page (likely; the same class of console noise the rewrites at `:353-362` were added to remove). Drop it.
- **L8 / owner** — the CSP has no `report-to`/`report-uri`, so every future directive miss stays a console line.
  TRAPS records three that were found by chance (the image host move, the R2 PUT, Spotify art). Sentry accepts
  CSP reports on the same project.
- **L5** — T8b-18's quota point: one bad hour of T8b-02's pool timeouts at 2,000 members can spend the month's
  Sentry error budget. Spike Protection is a dashboard setting.
- **L7** — `ui/input.tsx:33` and `ui/textarea.tsx:11` drop to `md:text-sm` (14px) from 768px up. iPadOS
  Safari zooms the page when an input under 16px takes focus (possible: iPad's desktop mode may not).
- **Owner (copy)** — `(main)/about/page.tsx:13-15`: the whole About page reads "indefinitely procrastinated",
  and it has a row in the sidebar (`sidebar.tsx:68`).
- **T3** — T3-01 independently confirmed: `PicturePickerDialog` has zero importers.

## From T9 (mascot, relaunch complete), 2026-09-24 08:52 BST

- **T8b / L8** — every `next/dynamic` import in the app has no failure path (`React.lazy` rethrows a
  rejected import into the nearest boundary and caches it). T9-04 is the sidebar's instance, which
  fires with no click; `src/app/not-found.tsx`'s stage, the moments, and any other `dynamic()` in the
  `(main)` layout's tree have the same shape. There is no `global-error.tsx` and no ChunkLoadError
  handling anywhere in src.
- **L9 (visual suite)** — the 3,044px red at the sidebar's foot on /letters cannot be the mascot:
  `SidebarHoopoe` renders `null` until 90-120s of idleness or Ctrl+Shift+H after each fresh mount, and
  the suite shoots within seconds. The pixels there are `AccountSection` (`sidebar.tsx:675-677`): look at
  the account chip (avatar decode timing, a badge, a presence dot), not at `.hoopoe-mascot`.
- **L5** — `CelebrationSignals` adds three parallel queries (one a duplicate read of the member's row)
  to every /feed render and gates its stream (T9-12); fold into the connection-budget arithmetic.
- **T5 / L7** — `signup-form.tsx:290-352`: the tuck effect depends on `hoopoe`, a rest-spread object that
  signup-client recreates on every render. Any signup-client re-render after the form mounts (today only
  the flight reveal's `setHoopoeShown`, which lands before anyone can pass the trivia) tears down the
  busy-poll and tucks immediately, mid-animation: the exact strand the poll exists to prevent. Latent;
  a trap for the next state added to signup-client. Same object makes `login-client.tsx:108-112` and
  `hoopoe-playground.tsx:364-367` re-run on every render (harmless there, idempotent writes).
- **L7** — two Strict-Mode-hostile shapes worth an app-wide grep: `useRef(true)` "mounted" flags flipped
  false in a `[]` cleanup (`footer-hoopoe.tsx:166, 204-210`: never true again after the dev dance), and
  a parent's `[]` cleanup clearing a timer that a child's one-shot callback armed (`login-client.tsx:117-121`).
- **T5** — any auth-page observation of the bird made on localhost is unreliable (T9-02): /login,
  /reset-password, /forgot-password, /verify-email and /signup's greet all start their beat inside the
  rig's one-shot onReady.
- **T3** — the Catch-ups resting birds (`almost-ready.tsx:84`, `completion-card.tsx:41`,
  `nothing-here.tsx:33`) freeze under T9-03 after a few minutes on screen.
- **L9 (test quality)** — the three hoopoe probes (`scripts/qa/hoopoe-*.mjs`) are not in `npm run
  check`, and none of them would catch T9-01, T9-02, T9-03 or T9-05; `perch-report.test.mjs` is a
  source-grep tripwire for one observer line.

## From T3 (catchups-surfaces, relaunch complete), 2026-09-24 08:55 BST

- **T2a / L9** — `src/app/(main)/catchups/actions.ts:1536-1545`: `extendDeadline`'s docblock says two Keepers "each tapping … on their own stale copy" are settled by "matching on the timestamp they both saw"; the CAS at `:1569-1576` matches the value `loadKeeperEdition` read in the same request, so it never fires in that scenario (T3-06).
- **T2a / T7a** — T3-16: `prisma/migrations-manual/2026-09-09-answering-moves-to-the-home.sql` was never applied to the live database (22 rows); check the demo database and whether `2026-09-08-round-becomes-edition.sql` was applied there too (the live one has 0 `/round/` links).
- **T2a / L9** — `src/lib/photo-wall.ts:11-14`, `src/components/catchups/edition/photo-run.tsx:58-61`, `docs/spec/catchups.md` §10.2: "no Edition has ever used a photo-wall question / the live database has zero prompts carrying it" is false — the published Edition of Catch-up `cmt5ru8c1000c04larumy3b0z` holds two `photo-wall` prompts (one keeper, one library, 2026-08-23 UTC), each with a photographed answer, plus a `songs` prompt; the run has rendered for real members.
- **L9 (comment lies)** — `src/components/catchups/home/types.ts:89-92` ("The rail's 'Start it now' prints it": nothing reads `nextOpensAt`); `:68-69` (`answeredAuthorIds` "The count is derived from this": nothing reads it); `src/components/catchups/settings/settings-surface.tsx:822-824` ("`router.refresh()` after a success": never called) and `:952-959` ("it opens the picker that shipped in build phase 3": nothing mounts it, T3-01); `src/components/common/photo-rows.tsx:181-183` ("which the Catch-up wall is": the wall does not use `PhotoStream`); `src/lib/catchups-types.ts:221-235` (`CatchupIndexCard`: no consumer); `src/components/catchups/answer/answer-redirect.tsx` (no consumer; the page's `AnswerRedirect` is a different function); `docs/spec/catchups.md` §7.1 describes a cinnamon/hairline read mark that `edition-cover-card.tsx:50-57` says was removed on 2026-09-10; `docs/planning/bugs.md:322-324` #19 records a fix in `src/components/catchups/round/photo-wall.tsx`, a file that no longer exists, while the viewer path still prints raw (T3-10).
- **T4b** — `src/components/common/image-viewer.tsx:710, 1059, 1070`: `caption` is printed as text; Catch-ups hands it markdown (T3-10). `visibleText` in `src/lib/magazine/measure.ts:40-56` already strips the markers if the reader would rather pre-render.
- **L5** — `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:294-324`: the covers' photo query (`images: { not: null }`, no `take`) spans EVERY published Edition of the Catch-up on every home view — 26 Editions a year on a biweekly rhythm; and `submitEntry`'s `revalidatePath` (`actions.ts:1968`) re-renders the whole home (≈10 queries incl. `advanceEdition`) on every autosave blur. `src/app/(main)/catchups/edition/[editionId]/page.tsx:103-132`: `generateMetadata` repeats the edition and membership reads without `cache()` (TRAPS names `cache()` for exactly this).
- **T8b / L2** — `src/app/(main)/layout.tsx:40-58` says the awaited advance "is what makes the page you are about to read correct"; layout and page render concurrently in the App Router, and the page's own `advanceEdition` never opens Edition N+1 (`src/lib/catchups.ts:241-336` has no `openNextEditionIfDue`), so the first home view after `nextOpensAt` can draw the old cover until the next request (self-heals; sibling of T3-07).
- ~~**T5 / T6** — `src/app/(main)/catchups/layout.tsx:17-19` reads `accountType` off the JWT~~ RETRACTED in the continuation run: `src/lib/auth.ts:411` sets `session.user.accountType = dbUser.accountType` from the row on every session read, so the gate is fresh. Nothing to route.
- **T2a** — `src/components/catchups/settings/settings-surface.tsx:202-203, 249-260`: no "Start the next Edition now" row when the latest Edition is `sealed`, though `startNextEditionNow` and spec §4 allow it (unreachable today; zero capsules).
- **T7b** — 11 members hold an unread `catchup_reminder` from 2026-09-04 for an Edition that published on 2026-09-06 (T3-16); nothing clears reminders on publish (`notifyPublished`, `catchups-notify.ts:209-222`, only creates rows). Corrected in the continuation run: the 30-day retention sweep (`retention.ts:50`, `:120-121`) does remove them, around 2026-10-05 for these; this line used to call the 100-row prune the only sweeper.
- **T6** — `src/app/api/users/search/route.ts` and `src/app/api/users-by-batch/route.ts` return the caller among the results (T3-14).
- **L7** — T3-11 is the largest client render cost I read in the app: a state update per scroll frame at the root of a 141-tile tree.
- **T2b** — `catchups-edition-view.ts:118-127` does not select `audioUrl`/`pollOptionId`, and `said()` (`reader-parts.tsx:576-580`) drops an entry with neither body, photos nor links — so if a voice answer with no transcript or a vote with no line ever lands (both are accepted by `submitEntry` today, `actions.ts:1741-1747, 1780-1795`), the published reader silently omits it. Documented as "no surface yet", but the write path is open.
- **T6 (T6-05's Catch-ups half), continuation run** — `src/app/api/users/search/route.ts:44-64` returns the `anonymous` system row for "anon" even with `alumniOnly=1` (it is an unblocked alumnus), and both Catch-ups pickers call it (`create/people-picker.tsx:87`, `home/people-door.tsx:190`). Neither `createCatchupWithPeople` (`catchups/actions.ts:496-509`) nor `addCatchupMembers` (`:2458-2468`) refuses id `anonymous`, so a Keeper can enrol the site's Anonymous profile, after which "answers are open" and reminder bells are minted for it and it sits in the People roster. One `id: { not: HOOPOE_RESERVED_USER_ID }` in the endpoint and in the two actions' `findMany` closes all four.
- **L7 / design protocol, continuation run** — "Only `transform` and `opacity` animate" (CLAUDE.md) is broken by three layout animations in Catch-ups: the answer marks (`answer-experience.tsx:199`, `transition-[width,background-color]`), the run's progress bar (`photo-run.tsx:220`, `transition-[width]`) and the Archived shelf (`archived-row.tsx`, motion `height: 0 → "auto"`). Not bugs; the protocol audit does not flag them.
- **T1 / L7, continuation run** — T3-13's class outside Catch-ups: `posts/create-post-form.tsx:837` and `common/photo-aim.tsx:160` (`transition-[filter,transform] ... active:scale-95`: the press never animates). A repo-wide version of the sweep in Verified clean would find the rest.
- **T1 / T4b / T6 / L7, continuation run** — hover-only reveals without a coarse-pointer guard, the T3-19 shape: `posts/comments-section.tsx:1120` and `:1147` (the comment menu and the admin remove), and the `group-hover:opacity-100` sites in `collection/photo-river.tsx` and `directory/alumni-map.tsx`. Each is invisible on a phone unless its surface has another path.
- **L9, continuation run** — `create/create-catchup-form.tsx:46-50` documents a `?group=<id>` preload prop the component no longer takes; `answer/song-attachment.tsx:13-25` points its TODO at `edition/answer-card.tsx`, which does not exist; `catchups/actions.ts:2503-2505` ("The picker never offers an existing member", false since 2026-09-09, T3-22); `home/types.ts:82-84` (the "Keeper's invite card", which is not drawn, T3-17).

## From V-T1 (validator), 2026-09-24 09:02 BST
- **V-T4 validator** — V-T1-02: `src/lib/collection-intake.ts` copies a ticked post photo with a raw `Promise.all` over two uploads; if one lands and the other fails the landed object is orphaned with no row and no purge entry, and its comment says the opposite. `putAllOrNone` exists for exactly this; the C-064 test checks only one file. Rule it with T4a-01 (same file).
- **V-O-L1 validator** — V-T1-03 changes O-06's picture when a search starts from an already-loaded feed: the old list stays under the new "Showing posts for X" banner and Load more pages the new search from the old cursor.
- **L9** — T1-18: the C-079 maxDuration test misses both `/feed` and `/letters/new`.

## From T7b (analytics-presence-messages, both runs complete), 2026-09-24 09:12 BST

- **T2a / T3 / L3**: T7b-15's day-only deadline wording lives on their surfaces: `homeStateLine` (`catchups-core.ts:1268`), `catchupStageLine` (`:1302`), the Keeper row (`settings-surface.tsx:204-212`), and the "Last day to answer" branch of `answerReminderMessage` (`:1143`), which a snapped deadline can never reach. Whoever owns the copy decides "Last day to answer: Wednesday" or the hour ("7 am Thursday, India time"). The arithmetic is right. It is the meaning that is off by a day, and for members in the Americas by a day and a night.
- **T8b / T5 (privacy text)**: `SearchLog.user` is `onDelete: SetNull` and the purge leaves the table alone, so an erased member's typed searches (names of people they looked up) outlive the erasure, unattributed, for up to 90 days. The privacy page's "A few things outlive deletion" list (`privacy/page.tsx:167-171`) does not mention them, and its retention table has no search row (the existing T8b lead). LoginAttempt keeps the address for a year under "Sign-in and security logs", which IS disclosed.
- **L9 (comment lies found here, code right)**: `admin-analytics.ts:697-700` (the loyalty comment's first example is inverted) and `:895-897` (the growth comment's example cannot misfile; the real case is 00:00–05:29 IST on the 1st). `snapshot.yml:85-91` ("this follows it" is false, and "grows without bound … ~800MB" is stale; T7b-11 extension). `stats-exclusion.ts:22-24` ("every activity number", T7b-20). `last-seen.ts:147-150` ("the row that won is the right one", false for a shared browser, T7b-16). `.github/workflows/snapshot.yml:21-23` ("well before the site sees any real morning traffic in IST", false at a 4.5 h median lag, T7b-05).
- **Design protocol**: `src/components/admin/analytics/heatmap.tsx:49-51`: the cell `title` is `"<Day> HH:00 — N visits"`, an em dash in copy (CLAUDE.md "no em dashes in copy"). Admin-only tooltip; the protocol audit presumably does not scan `title` strings.
- **T7a / L11 (QA against the one database)**: `scripts/qa/phase8-probe.mjs:238-252` inserts `Notification`/`OutboundEmail`/`LoginAttempt` rows into the shared database and then calls the REAL `/api/retention/sweep` on the local dev server with `CRON_SECRET` (`:260`). That runs every production sweep step early from a laptop, including the purge of any real member whose grace has expired and, because `storage.ts:28-34` picks R2 whenever the credentials are present, real R2 deletions. The effect is what the nightly job would do anyway, so this is a consent/timing question for the owner, not data loss. Worth one line in OPERATIONS.md or the probe's header.
- **T6 / L10**: `catchups-notify.ts:58-61` `groupMemberIds` (every Catch-up fan-out) includes blocked, deletion-requested and unconfirmed members. Their rows are written and never seen (blocked members cannot sign in). Harmless at this size; say so if the identity sweep wants a list.
- **L5 (sizing the presence beacon, for the O-03 question)**: at 2,000 members and ~300 simultaneously active on a publication morning, the beacon is ~5 POST/s. Each is one `User.findUnique` (the session callback) plus one Visit UPDATE after the response, both a few ms in-region. That is a small, steady share of the 5-connection pool, not the thing that exhausts it.

(run 1's leads were routed at 02:xx; the new ones above. Two run-1 rows matter for lenses not yet launched: **L11/L9** — `prisma/migrations-manual/` keeps no record of what has been applied, and `2026-09-09-answering-moves-to-the-home.sql` was skipped in production (T7b-03/T3-16); **L11** — `scripts/qa/phase8-probe.mjs:238-252,260` inserts rows into the shared database and calls the REAL `/api/retention/sweep` with `CRON_SECRET` from a laptop, running every production sweep step (purges, R2 deletions) early. **L10/T7a** — Jerry Maguire, the owner's designated test profile, carries `role: admin` in production, so every member message fans out a bell to it.)

## From L5 (scale-2k), 2026-09-24 09:22 BST

- **T8b / orchestrator (security-adjacent, verify in Vercel)** — `src/lib/prisma.ts:45-51` passes `connectionString` with no `ssl`, and the local `DATABASE_URL` carries no `sslmode`; `pg` then connects in PLAINTEXT (`node_modules/pg/lib/connection-parameters.js:25-38,85`: `PGSSLMODE` unset -> `defaults.ssl` = false). If production's `DATABASE_URL` in Vercel is the same shape, every query — including `authorize`'s read of the password hash — crosses from Vercel to Supabase's public pooler endpoint unencrypted. `scripts/dev/run-sql.mjs` sets `ssl` explicitly; the app does not. One look at the Vercel env var settles it.
- **L8** — the Vercel Hobby monthly allowances (invocations incl. routing middleware, Active CPU, edge requests) are the first ceiling at 2,000 members (L5-01); please confirm the edge-request overage behaviour on Hobby and whether `/ingest` rewrites count as function invocations beyond the proxy's own.
- **L8 / T5** — once Upstash's month is exhausted (L5-02), every sign-in attempt reaches the dummy `bcrypt.compare` at cost 12 (`auth.ts:208`): a distributed sign-in flood spends Hobby's 4 Active-CPU-hours in ~58,000 attempts. A Vercel WAF custom rule (Hobby allows 3) on `POST /api/auth/callback/credentials` is the cheapest door.
- **T7b / owner** — the snapshot (`scripts/ops/snapshot.mjs`) records no database size and no egress; L5-07/L5-08 need both in the room.
- **T6** — `Place` is 97 MB (36 MB of it the `altNames` trigram) for a picker whose members use 85 distinct places; a slimmer gazetteer is the largest single saving against the 500 MB line (L5-08).
- **T4b / T6 / T3** — cross-user identical reads worth a short cache: the Collection geometry per (scope, filter, order), the directory pins when unfiltered, the feed rail's four modules (identical for everyone but the viewer's own row) — each is egress (L5-07) and aggregate CPU (L5-03).
- **L11** — `backup.yml`'s nightly `pg_dump` reads the whole static gazetteer every night through the session pooler (~36 of ~42 MB), the single largest steady egress line (L5-07); `--exclude-table-data='"Place"'` with a one-off gazetteer dump.
- **L4** — `recordPageView`/`touchLastSeen`/`recordLoginAttempt` swallow in production (`last-seen.ts:274-282,297-320`, `login-attempt.ts:50-60`): under a pool-timeout burst the Visit and login statistics silently lose exactly the peak (no count of dropped writes).
- **Orchestrator (operations)** — the owner's laptop, the visual suite, the crawl and the agent fleet reach Postgres through the SAME transaction-mode Supavisor pool (15) as production; a local interactive transaction holds a production pooler server connection for ~200 ms per statement (London RTT). Heavy local QA during member traffic takes a real share of the 15.

## From L3 (dates-ist), 2026-09-24 09:47 BST

- **L11 / T7a / L4 / orchestrator — written up in full as L3-08 (High); summary kept here for routing — INCIDENTAL, CONFIRMED: the nightly MEDIA backup has failed on all 27 scheduled runs since 2026-08-29 02:51 UTC (every night from 28 August to 23 September), and every photograph over 8 MiB is missing from the backup bucket.** Found while answering the seeded "check the backup's actual run times". `gh run list --workflow=backup.yml --event schedule`: 27 consecutive `failure` (first 2026-08-29T02:51:42Z, last 2026-09-23T23:01:34Z), after 9 successes; per job, `dump=success media=failure` every night; last green media job 2026-08-28. The failing step is `.github/workflows/backup.yml` media job, `aws s3 sync "s3://rv-alumni-media" "s3://$BUCKET/media/" --endpoint-url "$ENDPOINT" --no-progress` (`.github/workflows/backup.yml:188` the `media:` job, `:230-231` the sync). Last night's log: 111 × `copy failed: s3://rv-alumni-media/collection/<user>/2026/09/<key>.webp ... An error occurred (NotImplemented) when calling the GetObjectTagging operation: GetObjectTagging not implemented`, then `Process completed with exit code 1`. Every failing object sampled is over the AWS CLI's 8 MiB (8,388,608-byte) multipart threshold (`curl -sI` on the public host, 22 of the 111: 8,422,738 to 12,760,188 bytes): for a multipart bucket-to-bucket copy the CLI calls `GetObjectTagging` to carry tags (its `--copy-props` default), which R2 does not implement. These are the Collection's full-resolution masters (full-res WebP q90 since late August), i.e. exactly the heritage originals the mirror exists for. The database dump is fine. Fix direction: add `--copy-props metadata-directive` (or `none`) to the sync, or raise `multipart_threshold` above the largest object; make the job's failure reach the owner (it is red every night and nothing reads it — T7b-01 is the metric that was meant to say so and has never recorded). Proof: `gh run view <id> --log-failed | grep -c "copy failed"` → 111 on 2026-09-23's run.
- **T8b / L7 (extends T8b-04)** — `src/components/messages/conversation.tsx:88` renders `formatTimeAgo(...)` and is imported into the `"use client"` `src/components/admin/messages/thread-view.tsx:1,9-11,86`, so on `/admin/messages/[id]` it IS a client component rendered on the server and hydrated: T8b-04's "server-only callers (safe)" list is wrong for this one (it is server-only on the member's `/messages/[id]` page).
- **L9** — `src/components/mascot/moments/rare-idle-behaviors.ts:15-18` cites "the feed's 'on this day' copy"; no "on this day" feature or copy exists anywhere in `src` (grep for "on this day", "years ago", "anniversary", "birthday" finds none).
- **L6** — `src/lib/river-cursor.ts:74-75` accepts any string `new Date(key)` can parse, so a crafted Collection cursor such as `-100000-01-01T00:00:00Z` (valid in JS, before Postgres's 4713 BC floor) reaches Postgres and throws instead of falling back to page one — the same class as T1-25 (`keyset.ts`), on the river's own cursor. The same hole in the letters index: `src/app/(main)/letters/(index)/page.tsx:48-50` guards only `Number.isNaN`, so `/letters?before=-010000-01-01T00:00:00Z` (JS parses it: year −10000) reaches Postgres as an out-of-range timestamp and the page falls into the error boundary instead of ignoring the cursor as its comment promises (argue-only; /letters needs a session).

## From L4 (finished 09:11 BST 2026-09-24; routed after the 3-day stop, 2026-09-27)

- **T2a** — `src/lib/catchups.ts:272` — `advanceEdition`'s 12-step bound exits SILENTLY: a planner bug that oscillates would spend up to 12 transactions per Edition per page view (and per tick) with no report; one `reportSwallowed("catchups", new Error("advance did not settle"), { editionId })` after the loop closes it.
- **T2a / L9** — `src/lib/catchups.ts:67-72, :114-115` — `AdvanceEditionInput.catchup.status` is OPTIONAL and `loadMeta` defaults a missing one to `"active"` (and cadence to `"monthly"`); every caller passes it today, but through `as AdvanceEditionInput` casts (`catchups/actions.ts:316`, `catchups/edition/[editionId]/page.tsx:89`) that would hide a select that dropped it — and a paused or ended Catch-up would then advance and notify. Make it required, or read it when absent.
- **T1** — `src/components/posts/use-letter-persistence.ts:405-416` + `src/lib/local-storage.ts:34-41` — the exit-save failure toasts "It is kept on this device" after a `safeSet` whose failure (storage blocked or full) is swallowed; the words may be nowhere. `safeSet` could return a boolean the toast reads.
- **T1 / T2b / L1** — a toggle whose PRIMARY write succeeded but whose notification side effect then throws reports the whole gesture as failed: `feed/actions.ts:744-760` (`toggleLike` → `notifyMemberOnceUnread` → throw → "Check your connection"), `catchups/actions.ts:2031-2041` (`toggleEntryLove` → `notifyLove` inside `runAction` → "Something went wrong"). The client reverts to "not loved", the row says loved, and the member's retry deletes it (delete-first).
- **T7a** — `admin/people/actions.ts:411-414` — the merge's "Check the server log." is T7a-09's sibling; one fix for both admin sentences.
- **T6** — `api/account/export/route.ts:331-338` — a mid-stream failure hands the member a truncated JSON file that will not parse, with no message.
- **T4a** — `scripts/dev/import-album.mjs:448, :495` — cleanup deletes `.catch(() => {})` without printing the key they failed to delete (the backfill script does print, `backfill-screen-copies.mjs:120-124`).
- **T8a / L11** — `api/razorpay/webhook/route.ts:172-174` — an event we act on that arrives without `payment.order_id` is answered 200 with no log line at all; unreachable for order-based payments today, but a payload-shape change would drop refunds with no trace.
- **T8b** — the three `error.tsx` show no `error.digest`; when a member writes "I got an error", nothing lets the owner find the Sentry event. A small "Reference: <digest>" line costs nothing.
- **L9** — `src/instrumentation.ts:63-68` (the `ignoreErrors` comment describes a protection Next now provides upstream); the "loud" comments listed in L4-08; `src/app/(main)/image-aim.ts:61-66` (the comment says P2025 "is not an error worth showing anybody"; the catch shows "could not be re-aimed just now" for P2025 AND hides every other error); `src/lib/upload-shared.ts:368-370`.
- **L5 / L8** — see the seeded-question answer below on the per-page-view reporter.

## From L6 (finished 09:12 BST 2026-09-24; routed after the 3-day stop, 2026-09-27)

- **T2b / T1 (extends T2b-11)** — `src/app/(main)/notifications/actions.ts:23` has the same unguarded `take` as `comment-thread.ts:124`: `Math.min(Math.max(NaN, 1), 50)` is NaN and `1.5` is not an Int, so a crafted `getNotifications({ take })` throws out of the bell's action. One `Number.isInteger` guard in both places.
- **T4a** — `contributePhotoDirect`: validate the caption (and every text field) before `purgeImageKey`/the staged-original consumption; a NUL caption is a deterministic trigger for T4a-12.
- **T4a / T7a** — `declinePhoto` (`collection/actions.ts:1081-1101`): compose and validate the notification before `erasePhoto`; a failing notification write today leaves the photograph erased and the uploader untold (your routed lead, confirmed).
- **T5** — `auth-tokens.ts:271-279`: `readToken` should refuse a non-string before hashing (L6-07's root). Email falsehoods for the owner: IDN domains and RFC-legal locals are refused at signup (`email-address.ts:43`), and because the login email cannot be changed (T5-01) a member refused here has no second route.
- **T5** — `resetPassword` has no password maximum while signup caps at 128 (`email-actions.ts:312-318` vs `validators.ts:98-101`).
- **T6** — `instagramHandle` (`normalize.ts:154-163`) keeps interior spaces; `house-options.tsx:111` needs `maxLength={60}`; `profileSchema.currentCity` (100) is a dead rule beside the live 160.
- **T7a** — the flagged-member bell (`report-action.ts:339-343`) prints the flagged person's name first, so their own bidi control scrambles the moderation alert about them (L6-02).
- **T3** — T3-11's per-scroll re-render multiplies L6-05's `trimTail` cost; a hostile answer freezes the reader.
- **L9** — comment lies: `create-post-form.tsx:251-253` and `rich-text-area.tsx:12-15` ("its inverse, so the draft round-trips", L6-01); `catchups/actions.ts:180-183` (the choices message says "under 80" on a `max(1000)`); `rich-text.ts:92-93` ("A NUL cannot be typed into a textarea" — true of typing, not of paste or a crafted call).

## From L10 (finished 09:12 BST 2026-09-24; routed after the 3-day stop, 2026-09-27)

- **T7a / security owner** — `src/lib/roster.ts:58-72`: the name+batch path verifies an account whose (normalised) name and batch match ANY roster row, with no "already claimed" check. Two accounts, one roster person, both `verified`, and the first one might be an impostor who confirmed their own mailbox. The trust model chose name+batch deliberately (SECURITY.md "email match, or name+batch"). The missing piece is uniqueness: an "office_list" verification that could note which roster row it consumed, and a second match against the same row could go to `pending` for the admin. Not filed here, because it is the security audit's settled design, not an identity-state bug.
- **L9** — `src/lib/api-gate.ts:41-45` says the upload door requires "A CONFIRMED address"; the code at `:68` requires Stage 2 (`requireVerifiedMember`). Stricter than stated, harmless, but the next reader will relax it to match the comment.
- **L9 / T2b** — `src/lib/catchups-edition-view.ts:211-213`: "A null author is a member who has since left, or an asker who deleted their account". Leaving does not null `CatchupPrompt.authorId` (`leaveCatchup` touches only `GroupMember`, the pref and bells, `catchups/actions.ts:2596-2647`), so the question of someone who LEFT keeps their name. Only deletion nulls it.
- **T6 / L6** — the profile editor writes `batchYear` with auth only (`profile-actions.ts:160-202`), and the heal turns every edit into a batch-group membership overnight (L10-01 door 1b). A rate on batch-year edits (or T2a-01's move-not-add) closes the "one batch a night" collection.
- **L5** — `(main)/layout.tsx:99` `advanceDueCatchups(userId)` runs for Stage 0 members too (it is the member's Catch-ups that advance). It is not wrong, but it is per-page write-path load for accounts that can do nothing in a Catch-up. After L10-01's fix the batch join moves, and so does this.

## From L12 (write-path invariants), 2026-09-27 ~03:00 BST

- **T7a** — `admin/people/actions.ts:370-372`: the merge's `catchupEntry.deleteMany` of the duplicate's colliding answers drops their photographs and recordings with no purge (the docblock at :330-336 accounts for the replies, not the bytes). And reports AGAINST the duplicate cascade away with its delete at :409 (the reported-user FK), the same moderation-history loss T7a-01 raises for reports it filed.
- **T1** — `post-visibility-rule.ts:190, :200` sit above the hidden and draft refusals (:212, :217), which is right for READING; the six interaction actions reuse the same rule as their write gate (`toggleLike` :710, `votePoll` :409, `toggleBookmark` :790, `createComment` :834, `toggleCommentLike` :1202, `reportPost` :193), so an author can like, comment on, vote in or report their own draft or hidden post, and an admin can comment on a member's unpublished draft, which rings the author's bell ("X commented on your letter") and stays on the letter when it publishes. The pages hide engagement on drafts (`letters/[id]/(read)/page.tsx:262`), so only a crafted call reaches it. A `post.status === "published" && !post.isHidden` condition for writes that others will see closes it.
- **L4** — `report-action.ts:263-273` and `:340-353`: `notifyAdmins` then `writeAudit` run after the report transaction commits; a throw in `notifyAdmins` rejects the action with the report already on the desk, and the reporter's retry answers "already reported", so that report's admin bell and its `report.*` audit row are never written.
- **L4** — `admin/people/actions.ts:590-624`: verify is CAS, audit, then `notification.create`; a failure in the bell rejects after the verification, and a retry finds `count === 0` and never tells the member.
- **T2a / L9** — `catchups/actions.ts:2273-2276`: `DEMO_SHARED_COPY_REFUSAL`'s docblock says `GroupMember` is not on `ALLOWED_WRITE_MODELS`; it has been since C-113 (`demo.ts:82-83`). And `setReminderPref` stays open on the demo while archive and leave are refused as "shared copy" (same reasoning would refuse it; cosmetic).
- **T3 / T2a** — `catchups/actions.ts:843-846`: `setCatchupPicture` never purges the previous uploaded picture when it is replaced. Unreachable while T3-01 stands (the picker is not mounted); wire the purge when the picker returns.
- **T6 / L6** — `api/upload/finalize/route.ts` (the `keys` read after `request.json()`): `body.keys` is used as an array without a check, so a crafted string is a `TypeError` and a 500 rather than a 400.
- **T4a** — `api/photo/download/route.ts` + `storage.ts:83`: the converter accepts the `staging/` and `audio/` roots; no disclosure (the bucket is public), but a staged original converted with `.keepExif()` keeps its GPS, and an `audio/` key fails inside sharp's stream. Restricting the route to `collection/` and `uploads/` costs nothing.
- **L9** — `.claude/agents/write-path-reviewer.md:13-14` says "18 files exporting server actions and 10 API routes" and that `feed/actions.ts` "calls `auth()` sixteen times"; today it is 22 files, 18 routes and 17 calls. The agent brief's census is stale.
- **L9** — `docs/spec/catchups.md:163-168` (§3.4) lists three drivers of the clock; the actions' `loadFreshEdition` is a fourth (L12-03).
- **L9** — `docs/SECURITY.md:104-106` "covering every admin action" (L12-05).
- **T8a** — `scripts/demo/verify-guard.mts` was NOT run by this lens: it loads `.env.demo` (`:17-25`) and attempts writes against the demo database, both outside this audit's rules. The write-path-reviewer brief asks for its exit code; the orchestrator or the owner has to run it.

## From L2 (caching-rendering-routes), 2026-09-27 ~02:30 BST

- **L9 (comment lies)** — `(main)/layout.tsx:40-58`: the comment "the awaited advance is what makes the page you are about to read correct" overclaims; the layout and page render as concurrent sibling segments (RSC), so the page has no ordering guarantee it sees the layout's `advanceDueCatchups` write. The page's own advance is what makes it correct. (Sibling of T3-07; routed to L9/T3.)
- **T3 / L5** — `catchups/edition/[editionId]/page.tsx:76,96,113,123,146,151`: `generateMetadata` + page double-fetch the edition and membership because `loadEditionBase`/`loadMembership` are not `cache()`-wrapped (L2-04). The membership read is identical and would dedupe for free.
- **T8b / security** — L2-01 is the lab-gate half of the same class T8b owns for `/admin`; the fix (page-level role checks + a gate-coverage test walking `src/app/lab/**/page.lab.tsx`) is T8b/T7a-shaped. `loadPublishedEditionView`/`loadSketchEdition` (`catchups-edition-view.ts:93`, lab `_data.ts:70`) should refuse a non-member viewer regardless of the caller (defence in depth).
- **T7a / L11** — the seven page-type `revalidatePath("/admin")` sites (L2-02): the two member-side message writes (`messages/actions.ts:140,213`) revalidate `/admin` for a surface no member sees; that is dead revalidation to remove, and the five admin-side ones should be `"layout"`.
- **L8 / T8b** — no `global-error.tsx` and `next/dynamic` imports without `.catch` (T8b-07/T9-04): a failed chunk after a deploy (Hobby, no Skew Protection) lands members on the `reset`-only apology (T8b-15). One fix unit with the client-error-reporter question.

## From L11 (jobs-webhooks-queues), 2026-09-27 ~03:15 BST

- **Orchestrator / O-07 (plaintext database connections)** — the two scripts that run every night from GitHub's hosted runners, across the public internet to Mumbai, open `pg` with no `ssl`: `scripts/ops/snapshot.mjs:65-67` and `scripts/ops/prune.mjs:47-49` (`new pg.Client({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })`). node-pg's default is no TLS (O-07), unlike `pg_dump` in the same window (libpq defaults to `sslmode=prefer`). Whether `SUPABASE_DIRECT_URL` carries `sslmode=require` is a secret's content the owner can check. The same shape on the laptop: `scripts/dev/import-roster.mjs:175` (the roster), `scripts/dev/set-password.mjs:84` (break-glass), `scripts/dev/backfill-image-dimensions.mjs:39`, `scripts/qa/_probe-kit.mjs:80-82`, `scripts/qa/crawl.mjs:21`, `scripts/qa/phase4-prod-check.mjs:37`; every other dev script passes `ssl: { rejectUnauthorized: false }` (`run-sql.mjs:53` and eleven more).
- **T7a / L9 (QA residue in production)** — `scripts/qa/phase4-prod-check.mjs:83` runs `DELETE FROM "Session" …` before deleting its probe user at `:84`, but the `Session` table was dropped by `2026-08-27-drop-nextauth-adapter-tables.sql` (live: no such table). The next run throws at `:83` and leaves `Probe ProdCheck <prodcheck_<hex>@probe.invalid>`, inserted at `:45-49` with `emailVerified` set, as a real alumnus row in production: listed in the directory, counted in "N people". 0 such rows today, so it has not been run since the drop. Delete the line.
- **L9 (verification apparatus that no longer runs)** — `scripts/qa/phase5-probe.mjs:37-41` and `scripts/qa/phase8-probe.mjs:45` load app modules with plain `node`, and `src/lib/storage.ts:12` now imports `@/lib/upload-shared` through the TS path alias, which plain node cannot resolve (`ERR_MODULE_NOT_FOUND: Cannot find package '@/lib'`, reproduced by importing `storage.ts` alone). Both probes therefore die at load: the behavioural proofs of H9 (a purge removes the R2 objects), H8, M34/M35 (phase 8) and the upload ownership/sniffing checks (phase 5) have not been runnable since that import landed, and nothing in `npm run check` runs them to notice. (Neither `docs/SECURITY.md` nor `OPERATIONS.md` names them, so the loss has no reader either.)
- **L9 (comment lies found on the job paths)** — `src/app/api/resend/webhook/route.ts:78-79` ("400, not 401: Svix retries on 5xx") — Svix treats any non-2xx, 3xx included, as a failed delivery (docs.svix.com/retries, read 2026-09-27); the behaviour is right, the reason is wrong. `src/app/api/demo/reset/route.ts:13-15` ("On the real deployment it is a 404") — the GET answers 200 `{ skipped }` there (`:110`); `:34-39` justifies `maxDuration` by a `reportSwallowed` the route never calls. `src/lib/email-queue.ts:362-368` (L11-03). `src/lib/mail-policy.ts:252-256` ("ONLY production ever gets it", true of `NODE_ENV`, not of the deployment: L11-04). `src/lib/retention.ts:277-284` (L11-07). `src/lib/storage.ts:130` ("Images are content-addressed (cuid filenames)") — link-preview thumbnails are keyed by the URL's hash (`link-preview.ts:308`, `:296`), not their content, under the same `immutable` header.
- **T2b (link previews, a concrete trigger for T2b-07)** — the in-flight set is per process (`link-preview.ts:338`); two instances resolving the same link PUT the same key (`link-previews/YYYY/MM/<sha>.webp`) within the same second, and R2 limits concurrent writes to one key to about one per second; a refused PUT makes `rehost` return null (`:286-300`), that instance's upsert can land last, and a row with a title is never re-resolved (`link-preview-core.ts:435-438`). Also: a process without R2 (`directUploadAvailable()` false, `:287`) writes rows WITH a title and WITHOUT a thumbnail into the shared table, which production then never re-resolves (the comment at `:282-284` names the laptop case and chooses null, but null is permanent).
- **T5 (the banner after a suppressed resend)** — `verify-email-banner.tsx:217-223` renders "We sent a link to <address>" for any `sent` row; after L11-05 the member whose address Resend suppresses reads that on every resend. T5 owns the copy; the fix is L11-05's.
- **T8b / owner (workflow hygiene)** — `.github/workflows/snapshot.yml:78-79` interpolates `${{ inputs.day }}` straight into the `run:` script, GitHub's documented script-injection shape; only repo writers can dispatch, so hygiene rather than exposure: pass it through `env:` and quote it.
- **T7a (budget accounting under a purge)** — `OutboundEmail.user` is `onDelete: Cascade` (`schema.prisma:689`), so an admin deleting a spam signup the same UTC day its verify mail went out removes a `sentAt` row `dailyBudget` counts (`email-queue.ts:407`): one slot handed back that Resend already spent (B-071's phantom slot by another road). Bounded by the 5-message margin; worth a line if the margin is ever cut.
- **Owner question (backup integrity, cannot be read from the repo)** — `backup.yml` authenticates with `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`, the same names the app uses in Vercel (`storage.ts:20-23`). The media mirror is only an undelete if whatever can delete from `rv-alumni-media` cannot also delete from the backup bucket: if the Vercel token is the same token, or any account-wide token, a leaked app key (or a future app bug that takes a bucket name from input) reaches the backups too. Cloudflare scopes R2 API tokens per bucket; the owner can confirm the Vercel token is scoped to `rv-alumni-media` alone and the GitHub one is the only token that can write the backup bucket.
- **L4 (a reporter that cannot see its own failures)** — every nightly job's failure path that is not the sweep's `step()` is a console line on a process whose console nobody reads: the demo reset (`route.ts:96,123`), the snapshot's sources (T7b-01), the purge (T7a-09), the drain in the layout (`layout.tsx:120`). L4-08 is the class; the job table's last column is the inventory for this lens.
