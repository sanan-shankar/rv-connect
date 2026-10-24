# V-T7a — adversarial validation of T7a (admin: people, merge, delete, purge, verification, moderation, reports, content, review room write side, audit log)
Validator: V-T7a · Started: 2026-09-27 · Model: Opus 5.5 (claude-opus-5-5)
Assignment: T7a-01..T7a-23 (23 findings). Cross-references cited, not re-validated: L12-04, L12-05, L12-07, L10-05, L10-06, L4 (T7a-09's class), L11-02, L11-07, L3 (sweep timing).
Method: brief-validator.md exactly — read-only, SELECT-only against the shared database, no gates, no browser, no sign-in, no git.

Resumed: 2026-10-23 · Model: Opus 5.5 (claude-opus-5-5[1m]) · Re-baseline: every citation re-checked at HEAD `88642426` (113 commits past `495ecdd2`); line numbers below are HEAD's. Added verdict values FIXED-SINCE <sha> / MOOT-SINCE <sha>.

## Status board (one line per id)
- T7a-01 — CONFIRMED-CORRECTED (Medium; merge also loses reports AGAINST the duplicate)
- T7a-02 — CONFIRMED-CORRECTED (Medium)
- T7a-03 — CONFIRMED-CORRECTED (Medium; now live: 1 member with a pending deletion request)
- T7a-04 — CONFIRMED-CORRECTED (Medium; widened by mention bells since 1f44f1e9)
- T7a-05 — DOWNGRADED to Low (Fluid compute is ON and the project is on Pro: 300 s default)
- T7a-06 — CONFIRMED-CORRECTED (Medium)
- T7a-07 — DOWNGRADED to Low (from Medium-Low; no live instance)
- T7a-08 — CONFIRMED-CORRECTED (Low)
- T7a-09 — DOWNGRADED to Low (failure is loud: 502 + red job, retried nightly)
- T7a-10 — CONFIRMED (Low)
- T7a-11 — CONFIRMED-CORRECTED (Low)
- T7a-12 — CONFIRMED-CORRECTED (Low)
- T7a-13 — CONFIRMED (Low)
- T7a-14 — CONFIRMED-CORRECTED (Low; Editions now start by hand, eb855c71)
- T7a-15 — CONFIRMED-CORRECTED (Low; item 5 REFUTED, item 6 has a third site)
- T7a-16 — CONFIRMED-CORRECTED (Low)
- T7a-17 — CONFIRMED-CORRECTED (Low; title's message is wrong, a worse consequence found)
- T7a-18 — CONFIRMED-CORRECTED (Low)
- T7a-19 — CONFIRMED-CORRECTED (Low; the sweep's real arrival time)
- T7a-20 — CONFIRMED (Low; proved live: 20 hidden photos, sampled thumbs 404)
- T7a-21 — DOWNGRADED to Low (no member today exceeds the cap; bytes are durably queued)
- T7a-22 — REFUTED (Next 16.3 re-renders the whole tree, admin layout included, on any revalidating action)
- T7a-23 — CONFIRMED-CORRECTED (Low)

Counts: CONFIRMED 3 · CONFIRMED-CORRECTED 15 · DOWNGRADED 4 (T7a-05, -07, -09, -21) · REFUTED 1 (T7a-22) · DUPLICATE 0 · FIXED-SINCE 0 · MOOT-SINCE 0. Three new candidates (V-T7a-01..03).

Re-baseline result: of the 113 commits, the ones touching this zone are `e49e6265` (adminUpdatePerson now also calls `syncBatchGroupQuietly`), `d845872a` (occupationCase), the 2026-09-29 email/roster work (`c41893f0`, `d7a8041d`: roster.ts gained a comment, `MAIL_NEEDING_ADMIN`, `dismissMail` guard, `account.email_change` audit label), `eb855c71` (Editions start by hand; admin Catch-up pages lost cadence/paused), `1f44f1e9` (mention bells), and the `Link` import swap (`19be10b0`) across admin components (line counts unchanged). `account-purge.ts`, `retention.ts`, `report-action.ts`, `admin-people.ts`, `reports/*`, `review/*` are byte-identical to `495ecdd2`. None of the 23 is fixed; none is moot.

## Verdicts

### T7a-01 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands)
Confidence in verdict: certain
Citations re-derived: `src/lib/account-purge.ts:354-362` correct (unchanged file). `prisma/schema.prisma:829` → **:834** (`reporter User @relation("ReportsFiled", ...)`, no onDelete); reports-against Cascade `:831` → **:836**; `Comment.authorId` SetNull `:780`/`746-755` → **:758 / :785** (argued at :751-757); `AdminMessage.authorId` `:953` → **:958**. Merge `admin/people/actions.ts:405-407` → **:408-410**. `privacy/page.tsx:168-171` correct ("reports that were part of moderation decisions" at :169-170). `retention.ts:32-34` correct. `docs/spec/admin.md` §9.3 at :400-409 correct.
What I tried to refute it with: the live FK (`pg_constraint`: `Report_reporterId_fkey` `ON DELETE RESTRICT`, `Report_postId_fkey` and `Report_reportedUserId_fkey` `ON DELETE CASCADE`); any later commit moving reports instead of deleting them (none — account-purge.ts and the merge's report line are unchanged since `495ecdd2`); a test that pins report preservation (none; `purge-rule.test.mjs` pins only the worklist/conditional delete).
Why it stands / falls: the purge's `tx.report.deleteMany({ where: { reporterId } })` and the merge's identical line delete every report the member filed, pending or settled, against anyone, while the public privacy page promises the moderation-relevant ones outlive deletion. The Report FK is the only one of the three "who wrote it" FKs (Comment, AdminMessage, Report) that never got the SetNull shape. Widening (L12's routed lead, confirmed): the merge's `prisma.user.delete({ where: { id: sourceId } })` at **:412** also cascades every report filed AGAINST the duplicate (`:836` Cascade), so a merged-away duplicate takes the human's "reported N times" history with it; the merge should re-point `reportedUserId` to the target (shedding rows that would collide on `@@unique([reporterId, reportedUserId])`).
Live check run: `SELECT conname, confdeltype FROM pg_constraint WHERE conrelid='"Report"'::regclass` → reporterId `r`, postId `c`, reportedUserId `c`. Reports today: 4 (all post-type, 0 pending); 1 `kind='report'` AdminThread with `reportId IS NULL` (orphaned; `adminUnread` now false).
Corrections to the finding: line numbers above; add the reports-against loss on merge to the fix (re-point `reportedUserId` in the merge batch before the delete).
Orchestrator action: none needed (source + live FK is enough).

### T7a-02 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands)
Confidence in verdict: certain on mechanism, likely on consequence
Citations re-derived: `schema.prisma:830` → **:835** (`post Post? ... onDelete: Cascade`); `AdminThread.reportId` comment `:922-923`/`:931` → **:924-927 / :936**. `feed/actions.ts:447-466` + helper `~66-102` → `deletePost` **:526-546**, `deletePostWithImages` **:72-119** (touches PendingImagePurge, the post, `clearPostNotifications` at :115, the drain; never Report or AdminThread). `admin-threads-server.ts:119-124` correct (`noteOnReportThread`, only caller `reports/actions.ts:75` inside `settleReport`). `reports/page.tsx:42-53` correct. `report-action.ts:54` (`adminUnread: true`) correct.
What I tried to refute it with: any report clean-up in the post-delete path at HEAD (none); any listing of report-kind threads with a null `reportId` that would prompt the admin (none: the thread is just a Messages row); whether the deleted post's report could be re-found (no — the row is gone by cascade).
Why it stands / falls: an author deleting a reported post cascades the Report away before any decision, and nothing writes the closing line into the reporter's thread; the schema comment knows the conversation outlives the report but nobody closes it. One live orphan thread proves the state is reachable.
Live check run: `SELECT count(*) FROM "AdminThread" WHERE kind='report' AND "reportId" IS NULL` → 1 (of 1 report thread); it has since been read (`adminUnread` false), so the finding's "still adminUnread: true" is true only until an admin opens Messages.
Corrections to the finding: the reporter's promise for a POST report is "An admin will read it." (`report-action.ts:220`); "An admin will look into it." is the USER-flag opening (`:308`). Consequence otherwise as written.
Orchestrator action: none needed.

### T7a-03 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands; now live-affected)
Confidence in verdict: certain
Citations re-derived: `admin/people/[id]/page.tsx:33-60` correct (select has no `deletionRequestedAt`). `admin-people.ts:159-173` (`PersonRow`) and `STATE_OPTIONS:38-43` correct. `admin-worklist-query.ts:84-166` → **:99-181** (`loadWorklist`; +15 lines from `MAIL_NEEDING_ADMIN`). `adminMergeUsers` target read `:348-356` → **:351-356** (`select: { id, photoUrl }`). `person-detail.tsx:176-274` and merge dialog `:403-444` correct.
What I tried to refute it with: grep of `deletionRequestedAt` across `src/app/(main)/admin`, `src/components/admin`, `src/lib/admin*.ts`, `admin-profile-tools.tsx` → zero hits. The member's public profile (`profile/[id]/page.tsx:133-145`) lets an admin through with no "leaving" note (only the 404 guard reads the column). No commit since the baseline touched these reads.
Why it stands / falls: the "leaving" state is held out of every member surface but is invisible on every admin surface, and the merge accepts a leaving (or blocked) target, so a merge INTO an account with a maturing request feeds the sweep everything moved.
Live check run: `SELECT ... FROM "User" WHERE "deletionRequestedAt" IS NOT NULL` → **1 row today**: a verified member, requested 2026-10-05 (due ~2026-12-04), 0 posts/photos/reports. That member currently reads as an ordinary verified member on /admin/people and their person page. (Audit: 2 `account.delete_request`, 1 `account.delete_cancel`.)
Corrections to the finding: line numbers; "today `deletion_requested = 0`, so nothing is live-affected" is out of date — one member is affected now.
Orchestrator action: none needed.

### T7a-04 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands)
Confidence in verdict: certain on mechanism
Citations re-derived: `account-purge.ts:344-397` correct (no `notification` anywhere in the file). `schema.prisma:716` → **:721** (Post.author Cascade); `:893` → **:898** (Notification.user Cascade). `post-notifications.ts:61-70, 81-91` correct. `feed/actions.ts:447-466` + helper → **:526-546 / :72-119** (clear at :115); `:495` (`adminRemovePost`) → **:574**.
What I tried to refute it with: any other path that clears bell rows on purge (none); whether the 30-day sweep makes it moot (it bounds it to a month, which is the C-054 window the code already treats as worth closing).
Why it stands / falls: the purge relies on the FK cascade for the member's posts, so no app code runs `clearPostNotifications`; other members' like/comment/reply bells (and their messages carrying the erased name) dangle for up to 30 days. Widening since the baseline: `1f44f1e9` (2026-09-27) added "mentioned you" bells (`mention-notifications.ts:104`, `postNotificationLink`), a fourth row type that dangles the same way.
Live check run: dangling `/letters/%` and `/feed#%` links → 0 and 0 (579 notifications; 0 mention rows yet). Only 1 admin delete since the audit (2026-09-28, "0 stored image(s) removed").
Corrections to the finding: line numbers; add mention rows to the consequence.
Orchestrator action: none.

### T7a-05 — DOWNGRADED to Low
Verdict: DOWNGRADED to Low
Confidence in verdict: certain on the plan facts; certain on the ordering defect
Citations re-derived: `admin/people/actions.ts:532-548` → **:535-551** (purge at :535, refusal at :536-538, audit at :540-551). `account-purge.ts:411` and `limit = 500` at `:430` correct. No `maxDuration` on `admin/people/[id]/page.tsx` or `profile/[id]/page.tsx` (grep at HEAD lists only collection pages, upload/download routes, tick, demo reset, sweep). `unattended-rule.test.mjs:165-167` correct.
What I tried to refute it with: the platform question the finder could not answer. **The platform-health session settles it:** `docs/planning/platform-health/brief.md` ¶1 — the owner "had to upgrade to Vercel Pro" when "my fluid active CPU thing just hit 100%"; `handover.md` board row 1 is "What is eating Fluid Active CPU", measured per route with `vercel metrics`; `docs/OPERATIONS.md` "Capacity" prices the project on Pro. Fluid Active CPU is only metered under Fluid compute, so **Fluid is ON and the plan is Pro**: function default 300 s (Pro max 800 s). A 30 s transaction plus ≤500 sequential deletes (~50 s) fits.
Why it stands / falls: the kill-mid-drain trigger is gone. What survives is the ordering: `writeAudit("admin.delete")` and `revalidatePath` run after the in-request drain, so a crash or an R2 hang in the drain window leaves a completed deletion with no audit line and an admin told "That did not go through". A crash-window defect, Low.
Live check run: none needed (the plan facts are in the platform-health docs).
Corrections to the finding: severity Low; drop the "10 s Hobby default" scenario; keep the fix "write the audit line right after the transaction, then drain" (the `after()` move becomes optional).
Orchestrator action: none (owner question 7 can be closed as "Fluid, Pro").

### T7a-06 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands)
Confidence in verdict: certain
Citations re-derived: `adminUnverifyUser` `:630-654` → **:633-657** (writes `verifyState: "unverified", verifyMethod: null`). `roster.ts:49` → **:57**; CAS `:77-86` → **:85-93** (`verifyState: { in: ["unverified","pending"] }`). Callers at HEAD: `verification-actions.ts:47` → **:49**; `profile-actions.ts:246-248` → **:247-248**; `email-actions.ts:406` (reset) → **:424**; `email-actions.ts:200` (confirm link) → **:218**; admin's own `adminUpdatePerson` `:190` → **:189**.
What I tried to refute it with: the 2026-09-29 roster change (`roster.ts:48-56`) only re-explains the existing `emailVerified` precondition; nothing reads an admin's prior hand. The session re-reads `verifyState` from the row (`auth.ts:382, :422`), so a de-verified member does see "Ask to be verified". The confirm-link caller only matters for an account whose address was still unconfirmed when the admin acted (edge). `src/lib/admin-rule.test.mjs:161` PINS that `adminUpdatePerson` calls `tryRosterAutoVerifyQuietly(` — so the fix must keep that call and make the roster refuse an admin-withheld row (the finder's `verifyMethod` sentinel shape), not delete the call.
Why it stands / falls: an admin's "Remove verification" leaves the row in exactly the state the roster treats as "not looked at yet"; four member paths plus the admin's own next edit silently re-verify an on-roster member with `office_list`, unaudited.
Live check run: the two `admin.unverify` rows (2026-09-07, 2026-09-20) were each followed by an `admin.verify` by hand, so no live instance of the roster undoing an admin; argued from code.
Corrections to the finding: line numbers; note the test pin in the fix direction.
Orchestrator action: none (live proof needs a roster-matching throwaway; argue-only is enough).

### T7a-07 — DOWNGRADED to Low
Verdict: DOWNGRADED to Low (finder wrote "Medium-Low")
Confidence in verdict: certain on mechanism
Citations re-derived: merge `:383-389` → **:386-392** (`data: { role: "admin" }` at :391). `account-purge.ts:76-79` correct (`role: "admin"` at :78). `group-succession.ts:80-83` correct (`"keeper"`). Revoke `catchups/actions.ts:2727-2745` → **:2373-2390** (revoke `where ... role: "keeper"`, `count === 0` + `stillHere > 0` falls through to success at :2382-2393). `catchups-core.ts:445` → **:416**; `:431-455` → **:402-426** (`isEffectiveKeeper` reads both roles at :425). The revoke's "deletePost lets a group admin delete" comment → **catchups/actions.ts:2339-2343** (stale since Post.groupId left).
What I tried to refute it with: whether Keeper powers still exist after `eb855c71`/`daec81ec` (yes: six `loadKeeperScope` callers for people Catch-ups; batch Catch-ups bypass the Keeper test entirely); live rows.
Why it stands / falls: three writers, two vocabularies, a revoke scoped to one; a merge or a purge can mint an un-revocable Keeper and the revoke reports success. Low because it needs a merge or a purge of a Keeper, the extra power is one people Catch-up's curation, and there is no live instance.
Live check run: `GroupMember` roles: admin 3, keeper 1, member 576; all 3 `admin` rows are the group creator's own row (`userId = Group.creatorId`), i.e. none app-minted.
Corrections to the finding: severity Low; line numbers.
Orchestrator action: none.

### T7a-08 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: writers — none (grep of `verifyState: "flagged"`/`= "flagged"` outside where-clauses finds none). `report-action.ts:322-327` correct; threshold `:339-345` → **:334-345** (groupBy then `notifyAdmins`). Readers: `admin.ts:254` → **:255**; `admin-worklist-query.ts:126-131, 196-203` → **:141-146, :211-218**; `admin-people.ts:106-113` correct (:110); `people-list.tsx:224` correct; `person-detail.tsx:207-215` correct; `verification-actions.ts:40-42` → **:42-44**; `roster.ts:26` correct. Also `member-gate.ts:36` and `photo-visibility-rule.ts:29` describe it.
What I tried to refute it with: any admin action or script that writes it (none); the live count.
Why it stands / falls: a whole vocabulary value with readers, a queue and copy, and no writer.
Live check run: `count(*) FILTER (WHERE "verifyState"='flagged')` → 0 of 572 users.
Corrections to the finding: line numbers.
Orchestrator action: none.

### T7a-09 — DOWNGRADED to Low
Verdict: DOWNGRADED to Low (harvested as Low-Medium, validated as Medium)
Confidence in verdict: certain on mechanism; likely on severity
Citations re-derived: `account-purge.ts:400-409` correct. `admin/people/actions.ts:533-535` → **:536-538**. `retention.ts:297-303` correct; `:172-181` correct (`reportSwallowed` at :178). Merge sibling (L4's routed lead) `:411-414` → **:414-416** ("Check the server log.").
What I tried to refute it with: whether the failure is actually silent. It is not: `errors.push("purge:<id>")` → `sweep/route.ts:68` answers 502 → `retention.yml` `--fail-with-body` turns the job red with the body, and the next night retries (the account stays due). What is missing is the exception itself (no `reportSwallowed`, so Sentry never sees the cause) and an admin-facing sentence that names a log he cannot read.
Why it stands / falls: real silent-failure-hunter gap (the cause is console-only on the one unattended destructive path), but the failure is loud and self-retrying; the member's erasure is delayed, not lost. That is Low, and it is one instance of L4-08's class (every nightly failure path that is not the sweep's `step()`). Fold the merge's identical sentence into the same fix.
Live check run: last 30 `retention.sweep` audit rows all `"errors":[]`; `accountsPurged` 0 throughout.
Corrections to the finding: severity Low; add the merge sibling.
Orchestrator action: none.

### T7a-10 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: likely (PostgreSQL's documented REPEATABLE READ behaviour; not reproducible read-only)
Citations re-derived: all correct — `account-purge.ts:333-338` (comment says READ COMMITTED), `:395` (`isolationLevel: "RepeatableRead"`), `retention.ts:297-303`, `purge-rule.test.mjs:131-181`, `@prisma/adapter-pg/dist/index.js:539-542` (40001 → `TransactionWriteConflict`). Sign-in's cancel write: `auth.ts:268-271`.
What I tried to refute it with: whether the only write to the member's own User row inside the purge transaction is the final `deleteMany` (yes — every other step touches other tables or other users), so a sign-in committed after the snapshot can only surface at that DELETE, as 40001 rather than a re-evaluated predicate.
Why it stands / falls: the C-075 comment describes the pre-C-076 isolation; under RR the cancel race becomes a red night instead of "spared". Safe outcome, misleading comment.
Live check run: none possible (needs two concurrent sessions).
Corrections to the finding: none.
Orchestrator action: none.

### T7a-11 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: name `:98-107` → **:104-105** (`titleCase`, refuses empty, no max; `FULL_NAME_MAX` is `utils.ts:212`, used by `validators.ts:150`); `person-detail.tsx:489-491` → **:489-490** (no `maxLength`), occupation inputs **:532, :540** carry `maxLength={100}` (the server now caps occupation via `OCCUPATION_MAX`, `d845872a`). Role `:260-263` → **:263-282**; `method` `:577-579` → **:580-583**; `trusted` `:238-241` → **:241-251**; note `:555-565` → **:558-568** (client cap `person-detail.tsx:636`, none in `admin-profile-tools.tsx:69-74`); verify of a missing id `:590-606` → **:593-609** (count 0 → `{ success: true }`).
What I tried to refute it with: a Zod or runtime check added since (only occupation's cap moved to a shared constant); whether a crafted role could grant admin (no: `requireAdmin*` compares to "admin").
Why it stands / falls: admin-only callers, so Low; the gaps are real.
Live check run: none needed.
Corrections to the finding: line numbers; occupation is now capped server-side by the shared constant.
Orchestrator action: none.

### T7a-12 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `person-detail.tsx:403-444` correct (pasted id at :422-429, `confirmWord={person.name}` — the DUPLICATE's — at :433); `adminMergeUsers` target read `:348-356` → **:351-356**.
What I tried to refute it with: a server-side preview or a target check since (none). After success the client routes to the target (:440), so the admin sees the wrong target only after an irreversible merge.
Why it stands / falls: the one irreversible admin act confirms against the wrong half.
Live check run: 0 `admin.merge` rows ever.
Corrections to the finding: line numbers.
Orchestrator action: none.

### T7a-13 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain
Citations re-derived: all correct — `reports/page.tsx:82-89` (groupBy `reportedUserId`), `:107`; `report-list.tsx:93-99` (chip only for `targetType === "user"`); `admin/people/[id]/page.tsx:80`.
What I tried to refute it with: a second groupBy through Post (none).
Why it stands / falls: the pattern count ignores post reports, which are every report today.
Live check run: 4 reports, all `targetType='post'`.
Corrections to the finding: none.
Orchestrator action: none.

### T7a-14 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; the at-scale Medium is weaker now)
Confidence in verdict: likely
Citations re-derived: index `catchups/(index)/page.tsx:54-78` → **:53-82** (no `take` on the series list; `advanceDueCatchups()` at **:49**); reading room `[catchupId]/page.tsx:66-129` → **:66-127** (no `take` on editions, prompts or entries; a sealed capsule's prompts are not queried, :93); messages `:97, :103` and `:40-47` correct (`?open=all` and `?sorted=all` both drop the cap).
What I tried to refute it with: the rhythm change — since `eb855c71` (2026-10-17) Editions start only when a member presses Start, so the finder's "24 monthly Editions over two years" is no longer the growth model; the reading room grows with however many Editions a group actually runs.
Why it stands / falls: still three admin reads without a bound; the reading room is still the one that grows without limit, more slowly than argued.
Live check run: 22 Catch-ups, max 2 Editions per Catch-up, 193 entries in all; 11 admin threads, 4 open.
Corrections to the finding: line numbers; replace the arithmetic's monthly cadence with "Editions on demand".
Orchestrator action: none.

### T7a-15 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low; item 5 REFUTED)
Confidence in verdict: certain for 1-4 and 6; likely for the refutation of 5
Citations re-derived: (1) `admin-profile-tools.tsx:130-134` → **:133-136** (the line is :136) — stands: unverify writes "unverified", the review queue reads "pending". (2) `admin-worklist-query.ts:229-234` → **:244-249**; `catchups-core.ts:753` → **:732** (sealed arm) — stands. (3) `mail-rows.tsx:48-59` correct; `"deletion-scheduled"` is a `MailKind` (`mail-policy.ts:20`) and prints raw; `schema.prisma:632` → **:636** still lists three kinds — stands. (4) `audit/page.tsx:27-43` → **:27-44**; `razorpay.*` in `audit.ts:38-48` → **:46-53** — stands. (6) `catchups/(index)/page.tsx:122` correct, `[catchupId]/page.tsx:134` → **:132**, and a THIRD site the finder missed: `admin-worklist-query.ts:243` (`${e.catchup.group.name} Catch-ups`) — member-facing is `catchupSurfaceTitle` (`catchups-core.ts:398-400`).
What I tried to refute it with: for (5), how the review room gets its counts. `ReviewRoom` reads the `counts` PROP directly (`review-room.tsx:564-566, :808`); the page passes fresh server counts (`review/page.tsx:46-54`, `key={mode}` so no remount). `saveReview` and `declinePhoto` both call `revalidatePath`, and in Next 16.3 any `revalidatePath` inside a server action marks the action as revalidating (`next/dist/server/web/spec-extension/revalidate.js:220-223`, "TODO: only revalidate if the path matches"), which makes the action response re-render the current page from the root (see T7a-22). So the header's "Waiting N" and the Done card's counts move with every decision.
Why it stands / falls: five of six copy lies stand; (5) does not.
Live check run: none (item 5's refutation is source-level; see T7a-22's orchestrator action for a one-look confirmation).
Corrections to the finding: drop item 5; add the worklist as item 6's third site.
Orchestrator action: same as T7a-22.

### T7a-16 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `admin.ts:256` → **:257** (`count(*)::int AS people`); `admin/(index)/page.tsx:85` correct (`isBlocked: false`); `people/(index)/page.tsx:35` correct.
What I tried to refute it with: the live data — 0 blocked members today, so the two numbers agree until the first block.
Why it stands / falls: two definitions of "people" in one panel; visible only once somebody is blocked.
Live check run: 572 users, 0 blocked.
Corrections to the finding: line number; note it is latent today.
Orchestrator action: none.

### T7a-17 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; title's second half wrong, a different consequence found)
Confidence in verdict: certain
Citations re-derived: `reports/actions.ts:26-30` correct (`prisma.post.update`, no precondition); `report-list.tsx:128-147` correct (hide, then resolve, hide's result ignored); `:184-190` correct.
What I tried to refute it with: the actual error path. When the post has vanished, `adminHidePost` THROWS P2025, so `adminResolveReport` never runs: `useAdminAct` → `callAction` turns the throw into `ACTION_FAILED` "That did not go through. Check your connection and try again." (`call-action.ts:23`). The "Another admin has already settled this report" the title quotes is NOT what the vanished-post case shows. It IS what a different, worse case shows: a second admin with a stale queue presses "Hide the post" after the first admin chose "Nothing wrong here" — `adminHidePost` succeeds (unconditional) and hides a post the first admin decided to leave up, then `settleReport`'s CAS refuses and the toast says another admin already settled it, implying nothing happened.
Why it stands / falls: the compose order (hide first, unconditionally; settle CAS second) is the real defect; both consequences follow from it. Rare with two admins.
Live check run: none needed.
Corrections to the finding: title → "'Hide the post' hides unconditionally before the settle check: on a vanished post it reports a connection failure; on a report another admin dismissed it hides the post anyway and then says the report was already settled". Fix: settle first (CAS), hide only on success; `updateMany` + count in `adminHidePost`.
Orchestrator action: none.

### T7a-18 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `scripts/dev/import-roster.mjs:178-201` → **:179-202** (one import line added by `91c07fbc`); no `BEGIN`/`COMMIT` anywhere in the file.
What I tried to refute it with: the TLS change (`withDatabaseTls`) touched only the client construction.
Why it stands / falls: unchanged.
Live check run: none.
Corrections to the finding: line numbers.
Orchestrator action: none.

### T7a-19 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `settings/actions.ts:206` → **:212** (`purgeAt`), email date `:234-245` → **:249-254**, audit day **:235**; `retention.ts:274` correct; `retention.yml:24` correct. The email says "On <date> the account ... will be permanently removed" (`email-templates.ts:378`).
What I tried to refute it with: the sweep's real arrival time. Raw `AuditLog."createdAt"::text` (UTC, `timestamp without time zone`) for the last 30 nights: **22:40 to 02:18 UTC, mostly 23:00-00:50** — 1 h 40 m to 5 h 18 m after the 21:00 cron (04:10-07:48 IST). NB: `run-sql.mjs`'s JSON shows these one hour EARLY (node-pg parses a naive timestamp as the laptop's BST); the finder's "22:20-22:45 UTC" was most likely read that way.
Why it stands / falls: the purge lands on D+60 only for requests made before the sweep's actual time of day; later requests are purged the morning of D+61. Member-favourable; the promise and the act name different days.
Live check run: `SELECT to_char("createdAt",'MM-DD HH24:MI') FROM "AuditLog" WHERE action='retention.sweep' AND "createdAt" > now()-'30 days'` (raw values above).
Corrections to the finding: the threshold is the sweep's real run time (~04:10-07:50 IST), not 02:30 IST; line numbers.
Orchestrator action: none.

### T7a-20 — CONFIRMED
Verdict: CONFIRMED (Low stands), proved live
Confidence in verdict: certain
Citations re-derived: `adminRemovePhoto` `collection/actions.ts:1153-1177` → **:1174-1197** (purge at :1189); `admin-content-query.ts:155, 171` → **:155, :170**; `content-list.tsx:155-162` correct (`{item.thumbUrl && <img src=...>}`).
What I tried to refute it with: another writer of `Photo.isHidden = true` that keeps the bytes (none: `adminRemovePhoto` is the only one).
Why it stands / falls: the row keeps a URL to bytes the same action purged; the list renders it.
Live check run: 20 hidden photos, all 20 with a `thumbUrl`; `curl -sI` on the three newest → **404 404 404**.
Corrections to the finding: none (count is 20 now, was 9).
Orchestrator action: none.

### T7a-21 — DOWNGRADED to Low
Verdict: DOWNGRADED to Low (mechanism CONFIRMED as the orchestrator hand-verified; severity re-ruled)
Confidence in verdict: certain on mechanism; likely on severity
Citations re-derived: `account-purge.ts:428-437` correct (`limit = 500` :430, `take: limit` :435, sequential `await delImage` :448); `:411-417` correct; `retention.ts:340` correct; audit lines `retention.ts:315-318` and `people/actions.ts:543-547` → **:546-550**; `image-purge.ts:58` correct (parallel).
What I tried to refute it with: the real exposure and the sweep's order. On the SWEEP path the purge's own drain takes 500 and the same night's `pendingImages` step (`retention.ts:339-344`, after the purges) takes another 500, so a member must exceed ~333 photographs (1,000 objects) before anything waits a second night; on the ADMIN path, >166 photographs (500 objects). Live: the largest non-admin contributor has **110** photographs (330 objects); only the owner's own admin account (1,740 photographs, 5,220 objects) exceeds either threshold. The leftovers are durably queued (`PendingImagePurge`, which `imagesStillPending` reports in the sweep's JSON), and their URLs are unlinked cuid keys no row names.
Why it stands / falls: the cap and the silent remainder in the `admin.delete`/`account.purge` line are real; the consequence is a delay of nights for a member nobody is today, with nothing lost. Low.
Live check run: `SELECT u.role, count(*) FROM "Photo" p JOIN "User" u ... GROUP BY uploaderId ORDER BY 2 DESC LIMIT 6` → 1740 (admin), 110, 79, 72, 18, 6. `PendingImagePurge` empty.
Corrections to the finding: severity Low; "500 a night" is 1,000 on the first night of a sweep purge; keep the fix (parallel chunks + a time budget, and "N still queued" in the audit line).
Orchestrator action: none.

### T7a-22 — REFUTED
Verdict: REFUTED
Confidence in verdict: likely (source-level in Next 16.3's own code; not driven live)
Citations re-derived: `review/actions.ts:124` correct (`revalidatePath("/admin")`); `declinePhoto`'s `collection/actions.ts:1103` → **:1124**; `people/actions.ts:41-44` correct; `mail/actions.ts:61, 113` → **:61, :135**; `admin/layout.tsx:30` correct; `review-room.tsx:123-127` correct.
What I tried to refute it with: how a server action's response is built in this Next. (a) `revalidatePath` sets `workStore.pathWasRevalidated = ActionDidRevalidateStaticAndDynamic` for ANY path and type (`next/dist/server/web/spec-extension/revalidate.js:220-223`, "TODO: only revalidate if the path matches"). (b) The action handler then renders the page (`action-handler.js:963, :990`, `skipPageRendering` false). (c) An action POST carries no `RSC` header, so `parseRequestHeaders` gives `flightRouterState: undefined` (`app-render.js:205-206`) and `walkTreeWithFlightRouterState` renders every segment from the root (`walk-tree-with-flight-router-state.js:58-61`) — the client reducer says so in as many words: "Currently the server always renders from the root in response to a Server Action" (`client/.../server-action-reducer.js:300`). (d) The client applies it with `FreshnessPolicy.RefreshAll` (`:296`). So `AdminLayout` (`admin/layout.tsx:29-34`, uncached `loadAdminCounts`) re-runs inside every `saveReview`/`declinePhoto` response and `AdminCountsSync` publishes fresh numbers. B-024's "a soft navigation skips the shared layout" is true for NAVIGATIONS; it does not apply to an action's response, which already carried the fresh layout.
Why it stands / falls: the mechanism the finding depends on does not exist in this Next version: the page-type `revalidatePath("/admin")` is cosmetically inconsistent with the panel's `"layout"` convention but changes nothing a member or the owner can see. Same reason refutes T7a-15 item 5.
Live check run: none possible within the rules (needs a signed-in admin write).
Corrections to the finding: withdraw. The consistency nit (use `"layout"` like the siblings) can ride along with any edit to those files.
Orchestrator action: one look if wanted — signed in as Jerry on `/admin/review` (chrome-devtools), press "Set aside" then "Back" on one photograph (both are reversible `updateMany`s), and read the rail's Review count and the room's "Waiting" chip after each press without reloading: they should move.

### T7a-23 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `admin-people.ts:92-139` correct (no exclusion); block/delete `people/actions.ts:455-553` → **:458-502 / :504-556**; merge `:339-444` → **:342-447**; `batch-catchups.ts:224-228` → **:301-325** (`healBatchGroupMemberships`, predicate `u."batchYear" IS NOT NULL AND u."accountType" = 'alumnus'` at :310-311); `roster.ts:49` → **:57**.
What I tried to refute it with: whether the app knows the row. The finder's "`grep -rn ANONYMOUS src/lib src/app` finds no reference" is WRONG (case-sensitive grep): `utils.ts:379` (`batchLine` returns "" for `id === "anonymous"`, :346-351 explains it) and `avatar.ts:101` (`HOOPOE_RESERVED_USER_ID = "anonymous"`) both existed at the baseline. Both are display-only; nothing in the admin controls, the directory or the batch heal consults them, so the finding's thrust stands.
Why it stands / falls: the curated-stories byline is an ordinary verified alumnus to Block, Delete and Merge. Widening since the baseline: `adminUpdatePerson` now also calls `syncBatchGroupQuietly` (**:193**, `e49e6265`), so an admin giving it a batch year joins it to that batch's group and Catch-up immediately, not only at the nightly heal.
Live check run: `id='anonymous'`: role member, verified, confirmed, alumnus, batchYear NULL, not blocked, 16 posts, 0 memberships.
Corrections to the finding: the "no reference" sentence → "referenced only for display (`utils.ts:379`, `avatar.ts:101`)"; the fix's "constant id list in one module" already half-exists as `HOOPOE_RESERVED_USER_ID` — reuse it; line numbers; the widening.
Orchestrator action: none.

## New candidates

### V-T7a-01 — The person page's "Comments" tally counts the member's own deleted comments
- Severity: Low (a number on the owner's panel that disagrees with the Content list and with every member-facing count)
- Confidence: certain
- Where: `src/app/(main)/admin/people/[id]/page.tsx:68` (`prisma.comment.count({ where: { authorId: id, isHidden: false } })`, no `deletedAt: null`) vs `src/lib/admin-content-query.ts:93-97` (the Content list excludes `deletedAt`, "Same reason it is excluded from every member-facing count").
- Actual: a member who deleted a comment that had replies keeps a blanked tombstone with their `authorId` (purge-detached ones have `authorId` null and do not count). Those tombstones inflate the tally. The routed lead's second half (Catch-up answer comments counted with feed comments) is NOT a defect: the Content list shows both kinds too, so the two agree.
- Live: 8 tombstones (`deletedAt IS NOT NULL AND NOT "isHidden"`), all with a living author, across 2 members.
- Fix: add `deletedAt: null` to the count. Gate: none needed beyond the one-line shape.
- Source: T1's routed lead to the T7a validator (leads-routed.md, "From T1").

### V-T7a-02 — A merge drops the duplicate's colliding Catch-up answers without queueing their photographs or recordings, which then sit in R2 forever with no row naming them
- Severity: Low (needs one human with two accounts who answered the same question, one answer carrying a photo or a voice clip, then a merge; the bytes are unlinked but permanent — the H9 failure mode by the merge's door)
- Confidence: certain on mechanism
- Where: `src/app/(main)/admin/people/actions.ts:373-375` (`catchupEntry.deleteMany` of the duplicate's colliding answers inside the batch `$transaction`); the docblock `:333-338` accounts for the replies under them, not their bytes; the merge already guards the one other stranded object, the duplicate's avatar (`:419-432`, `purgeImageUrls`). `CatchupEntry.images` and `.audioUrl` are exactly what `collectImageUrls` collects for a purge (`account-purge.ts:116, :144-157`).
- Fix: before the batch, read the colliding rows' `images` and `audioUrl`; add `prisma.pendingImagePurge.createMany(...)` for them to the same batch (so the queue and the delete commit together), and `drainPendingImagePurges(urls)` after the commit, as `deletePostWithImages` does.
- Gate: `purge-rule.test.mjs`-style shape assertion that the merge names `pendingImagePurge` beside its `catchupEntry.deleteMany`.
- Source: L12's routed lead to T7a (leads-routed.md, "From L12"); not filed by L12.

### V-T7a-03 — `phase4-prod-check.mjs` deletes from the dropped "Session" table, so its cleanup throws and leaves a confirmed probe alumnus in production
- Severity: Low (a QA script run by hand; latent until the next run)
- Confidence: certain
- Where: `scripts/qa/phase4-prod-check.mjs:84` (`DELETE FROM "Session" WHERE "userId" IN ...`) runs before `:85` deletes the probe user inserted at `:46-50` with `"emailVerified" = now()`. The table was dropped by `2026-08-27-drop-nextauth-adapter-tables.sql`.
- Actual: the next run throws at :84 and leaves `Probe ProdCheck <prodcheck_<hex>@probe.invalid>` in the one shared database as a confirmed account: in the directory, in "N people", in the admin queues.
- Live: `to_regclass('public."Session"')` → NULL; 0 `@probe.invalid` users today (not run since the drop).
- Fix: delete line 84; wrap the cleanup in `try/finally` so a failed check can never strand the probe row.
- Source: L11's routed lead to "T7a / L9" (leads-routed.md, "From L11"); not filed as a finding by L11 or L9.

## Cross-zone notes
- **Everyone reading timestamps with `run-sql.mjs` (orchestrator, L3, L11, T7b)**: Prisma writes `timestamp without time zone` columns in UTC, but `run-sql.mjs`'s node-pg returns them parsed as the LAPTOP's local time, so JSON output on a BST machine shows every `createdAt` one hour early (raw `2026-10-22 23:47:03` prints as `22:47:03Z`). Read `"createdAt"::text` or `to_char(...)`. T7a's own "22:20-22:45 UTC" sweep times were most likely shifted this way; the real nightly sweep lands 22:40-02:18 UTC (T7a-19).
- **L2 / L2-02 and T1-06**: T7a-22's refutation applies to L2-02's premise. In Next 16.3 a `revalidatePath` of ANY path and type inside a server action re-renders the CURRENT page from the root in the action's response; page-type vs `"layout"` changes no visible staleness on these dynamic routes. The member-side `revalidatePath("/admin")` calls are now FOUR (`messages/actions.ts:140, 213, 258, 289`) — dead, but removing them saves nothing while the same actions revalidate other paths, because one call is enough to trigger the full re-render (the CPU cost T1-06 measures).
- **T6 / T6-12**: the admin batch-year window is still `1930..valleyYear()+10` at HEAD (`admin/people/actions.ts:117`) against the member's `1926` floor (`validators.ts:25`, `profile-actions.ts:34`).
- **L6 / L6-02**: the flagged-member escalation bell (`report-action.ts:340-345`) prints the reported member's name first, so their own bidi control scrambles the alert about them. One instance of L6-02's app-wide class; not a separate T7a finding.
- **L10 / security owner**: the roster "already claimed" question — the 2026-09-29 write-path review closed the unconfirmed-mailbox door (`roster.ts:48-56`); two CONFIRMED accounts matching one roster row is still possible and is a trust-model decision, not filed.
- **L11**: `OutboundEmail.user` Cascade handing back a spent daily-budget slot when an admin deletes a same-day signup — real, bounded by the 5-message margin; not filed.
- **T7b**: `MAIL_NEEDING_ADMIN` (`admin-worklist-query.ts:34-37`, 2026-09-29) now keeps bounced confirmations off the badge and the worklist, but the People "Needs a look" filter (`admin-people.ts:106-113`) still includes any failed verify mail, so the two definitions of "needs the admin" differ. Nothing counts into "Needs a look", so cosmetic.
- **L9 (comment lies seen in passing)**: `prisma/schema.prisma:1137` and `:1324` say the legacy `"Catchup"` and `"CatchupPref"` tables still exist; live `to_regclass` is NULL for both. `src/app/(main)/feed/actions.ts:113-114` says a dangling bell row "answers 404 for a year, which is how long notifications are kept"; the window is 30 days (`retention.ts` KEEP_DAYS, `post-notifications.ts:67-68`). `catchups/actions.ts:2339-2343` and `catchups-core.ts:406-412` still describe a `deletePost` group-admin power that left with `Post.groupId` (T7a's own lead).
- **Owner question 7 (Fluid)**: settled by the platform-health docs, Fluid ON and Pro (see T7a-05). Any other finding whose severity hung on "Hobby 10 s" should be re-read with a 300 s default.

## Coverage
- Checked completely at HEAD `88642426`, every citation re-opened: T7a-01 through T7a-23 (23 of 23).
- Files read at HEAD for this pass: `src/lib/account-purge.ts` (whole), `src/app/(main)/admin/people/actions.ts` (whole), `src/lib/roster.ts` (whole), `src/lib/admin-worklist-query.ts:95-260`, `src/lib/admin-people.ts:30-180`, `src/lib/retention.ts:25-40, 165-185, 255-364`, `src/app/api/retention/sweep/route.ts:20-70`, `.github/workflows/retention.yml:15-45`, `src/app/(main)/admin/{layout,people/[id]/page,reports/page,reports/actions,messages/(index)/page,catchups/(index)/page,catchups/[catchupId]/page,audit/page}.tsx` (relevant ranges), `src/app/(main)/admin/review/actions.ts:110-126`, `src/components/admin/{people/person-detail,reports/report-list,content/content-list,mail/mail-rows,use-admin-act,review/review-room}` (relevant ranges), `src/components/profile/admin-profile-tools.tsx:60-140`, `src/app/(main)/feed/actions.ts:60-125, 520-600`, `src/app/(main)/collection/actions.ts:1174-1197`, `src/app/(main)/catchups/actions.ts:2335-2395`, `src/lib/catchups-core.ts:395-426, 698-735`, `src/lib/group-succession.ts:60-85`, `src/lib/post-notifications.ts:55-91`, `src/lib/image-purge.ts:40-69`, `src/components/posts/report-action.ts:30-70, 315-350`, `src/components/auth/verification-actions.ts`, `src/components/settings/actions.ts:205-259`, `src/lib/email-templates.ts:366-388`, `scripts/dev/import-roster.mjs:174-215`, `scripts/qa/phase4-prod-check.mjs:40-85`, schema blocks Report/AuditLog/Notification/AdminThread/AdminMessage/Post/Comment; Next 16.3 internals for T7a-22 (`revalidate.js`, `action-handler.js`, `app-render.js`, `walk-tree-with-flight-router-state.js`, `base-server.js`, client `server-action-reducer.js`).
- Diffs `495ecdd2..HEAD` read for every changed file this zone cites (people actions, admin.ts, audit.ts, audit page, roster.ts, import-roster, worklist, mail actions, catchup-status, admin Catch-up pages, the Link-swap components, privacy page).
- Live read-only checks run: Report FKs (`pg_constraint`), report/thread counts, user states (flagged/leaving/blocked/admins), the pending deletion's facts, audit action counts and the last sweeps, admin.delete detail tail, PendingImagePurge, GroupMember roles and whether `admin` rows are creators', admin.unverify follow-ups, dangling bell links, photo concentration per uploader, hidden photos + three thumbnail HEADs (404), the anonymous row, open threads / Catch-up sizes, tombstone counts, `Session`/legacy table existence, sweep arrival times (raw text).
- Routed leads addressed (leads-routed.md rows naming the T7a validator): T1 (comment tally, V-T7a-01), T2b (no retention row for LinkPreview — L11/T2b-02's, not re-ruled here), T6 (admin edit re-runs roster: folded in T7a-06; batch-year window: cross-zone to T6-12), T4b (replaceState: owned by T4b-08's ruling, not re-ruled), L4 (merge sentence: folded in T7a-09), L6 (bidi in the flag bell: cross-zone to L6-02), L10 (roster claims: cross-zone), L12 (merge bytes: V-T7a-02; reports against: folded in T7a-01), L2 (page-type revalidates: cross-zone, refuted with T7a-22), L11 (phase4 probe: V-T7a-03; mail budget: cross-zone).
- Not checked: nothing in the assignment left partial. T7a-22 is refuted at source level; the orchestrator's one optional live look is written under it.

STATUS: COMPLETE at HEAD 88642426
