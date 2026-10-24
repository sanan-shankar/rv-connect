# Entries written by the orchestrator for findings that landed after the writers ran

## Phase G

#### C6-01 — Two accounts can queue more mail to their own addresses than the site sends in a day, so no new member's confirmation goes out
**Medium** · **Confirmed** (source; the live mail baseline matches: peak day 88 of 95 sends, so ordinary use already brushes the cap)
- **Where:** `src/components/auth/email-actions.ts:42-80` (`resendVerification`, 5 an hour); `src/components/settings/actions.ts:181-259` (`requestAccountDeletion`, no stage gate, ends the session, enqueues `deletion-scheduled`); `src/lib/auth.ts:268-295` (signing in cancels it at once, so request, sign in, request is a loop); `src/lib/email-queue.ts:435-442, 466` (per-account hourly bounds only; `deletion-scheduled` never folds); `src/lib/mail-policy.ts:26-34, 46-48` (priority 20, a reserved kind that may spend the day to zero).
- **What happens:** eight mails an hour per account to its own never-proven address; two accounts queue more than the day's 95. They drain first overnight, so new members' confirmations are never sent, every reset waits for 05:30 IST, and real members' "password changed" and "account will be deleted" notices, at the same priority and oldest first, are in practice never sent.
- **Fix direction:** one per-recipient ceiling across all kinds per rolling 24 hours in `enqueueMail` (also closes C5-02); never send `deletion-scheduled` to an address that was never confirmed; fold it like verify and reset; a per-account daily verify ceiling; a cool-down on re-requesting deletion right after a cancel.
- **Pin it:** a `mail-policy` test that one address's kinds together cannot exceed K a day; a source pin that `requestAccountDeletion` does not enqueue for an unconfirmed account.
- **Travels with:** C5-02, C4-02, T5-13, O-09.

#### C4-01 — An anonymous script can take over the trivia room in its first hour and, at the hourly cap kept a year, outgrow the database
**Medium** · **Confirmed** (data: row sizes measured read-only, 344 B and 136 B; arithmetic re-derived by the validator)
- **Where:** `src/components/auth/trivia-actions.ts:55-77` (`getTriviaQuestion`: public, no meter, writes `dontknow`/`shown` with up to 200 typed characters on every call; `:45-47` "no limit on swapping"); `:100-108` (`checkTrivia` writes a `limited` row with the typed answer even after the per-IP meter refused); `src/lib/trivia-log.ts:37-53, 126-141` (`TRIVIA_ROWS_PER_HOUR = 600` site-wide, count-then-insert; a cookieless call mints a new browser id, `:73-88`); `src/lib/retention.ts:83` (`gateLog: 365`).
- **What happens:** the cap is first come, first served for the whole site, so a script spending 600 slots an hour leaves none for real newcomers: their rows are dropped without a trace and the room's funnel is computed from the script. Kept a year, the cap's steady state is about 5.3 million rows, about 2.5 GB, five times the free plan; at the cap the table grows about 7 MB a day, so the 350 MB alarm fires in about a month and the database reaches its limit in about seven weeks. Five places promise a bot cannot do this (`trivia-log.ts:37-49`, `docs/spec/admin.md:699`, `docs/SECURITY.md:105-109`, `src/lib/admin-trivia.ts:20-24`, `src/lib/gate-coverage.test.mjs:42`).
- **Fix direction:** meter the writer per source before `recordTrivia` (a generous per-IP bucket, e.g. 60 rows an hour; drop the row, not the visitor's answer); a refused `checkTrivia` writes at most a counter, not a row with text; size retention to the cap (raw `shown`/`skipped` rows can go after 90 days). Make the five promises true. Check `git log` on these files first: a peer session was building this code on 2026-10-24.
- **Pin it:** extend `src/lib/trivia-log-rule.test.mjs`: a per-source meter precedes `recordTrivia` in `getTriviaQuestion`; the refused branch records no answer text; `TRIVIA_ROWS_PER_HOUR × 24 × gateLog days × 485 B` stays under a stated budget.
- **Travels with:** L5-02 (the same shape on the sign-in door; its verified-clean line "trivia refuses before it writes" is false since `42ec6fe7`), C2's L4-02 extension (these writers are silent in production), L8-04 (check D, a firewall rule, also bounds it).

#### C4-02 — After "Use another email", the banner blames the new address for the old one's bounce, and the gate stays shut
**Medium** · **Confirmed** (source; both triggers re-derived by the validator; live data shows a member at four confirmation mails in one hour, one short of the limit)
- **Where:** `src/lib/email-queue.ts:985-1018` (`verificationMailState` reads the newest verify row of any address); `src/app/(main)/layout.tsx:200-205` (labels a bounce with the current address); `src/lib/verification-mail.ts:29-36` (the queue's refusal is dropped, T5-13); `src/lib/email-queue.ts:435-440, 496-502` (5 verify mails an hour per member); `src/components/auth/change-email-actions.ts:164-191` (the comment promising "Send me the link" after a reload, which never appears); `src/lib/mail-policy.ts:357-365` (no row for the new address keeps the gate shut).
- **What happens:** the move dialog only opens from the bounced state, so at a move the newest row is the old address's bounce. If the new address's mail is not queued (the hourly limit was spent pressing "Send it again", or a step after the move throws), the member is told "Your link is on its way to n***@new", then the banner says "n***@new didn't accept it". The gate stays shut, and the only control left spends another of three moves a month.
- **Fix direction:** make `verificationMailState` address-aware (only rows whose `to` matches the current address, case-insensitively, as the fold already does), so a moved member with no row reads `none` and gets "Send me the link"; return the queue's answer through `sendVerificationEmail` (T5-13) and have the move say so honestly when the mail could not be queued; consider exempting a move's first mail from the hourly limit. Add `to` to `claimAndSend`'s claim (C4-03) in the same change.
- **Pin it:** a unit test on a pure `stateFor(rows, currentEmail)` extracted from `verificationMailState` (rows to the old address only → `none`); a source pin that `changeUnconfirmedEmail` reads `sendVerificationEmail`'s `queued`.
- **Travels with:** C4-03, T5-13.

#### C5-02 — One person can spend the whole day's mail on password resets, every day, so nobody else's reset or confirmation goes out
**Medium** · **Confirmed** (source: the meters' constants; the orchestrator re-derived the arithmetic)
- **Where:** `src/lib/rate-limit.ts:76-79` (`reset`: 5 per 15 minutes per IP, nothing per day); `src/lib/email-queue.ts:435-437` (per account 4 per 30 minutes, 8 an hour; `src/lib/auth-tokens.ts:56-59` the same for the token); `src/components/auth/email-actions.ts:238-249` (the M3 comment promising one caller can no longer burn the day's ~95 mails); the policies print a live login address as the contact.
- **What happens:** resets may spend the whole daily budget, and the bounds are per IP and per account, never per recipient per day. One known address empties the day in about 12 hours; two or three from one IP in about 5. Every real reset and confirmation then waits until 05:30 IST, the targeted inbox fills with resets, and an empty budget also leaves new signups' email gate open.
- **Fix direction:** cap what one address may receive per day (e.g. 3 resets per address per 24 hours, enforced in `enqueueMail` for `kind: "reset"`); cap resets' share of the day below the whole budget; a per-IP daily ceiling on the reset door. Consider a role inbox, not a login address, as the policies' contact.
- **Pin it:** a pure `mail-policy` rule "resets for one address in 24 h ≤ K" with a test, and a test that resets cannot consume more than the day minus a reserve.
- **Travels with:** C4-02 and T5-13 (same queue; one worker).

#### C5-03 — The entry question no longer keeps strangers out: its answers are public, and one question accepts any reply containing "egg"
**Medium** · **Confirmed** (executed: the real `judge()` passes "veggies"; the bank is on the public `origin/main`, checked by the orchestrator)
- **Where:** `src/lib/trivia-bank.ts:63-190` (every question and accepted answer, in the public repository; `:11-15` "the answers must never reach a browser", guarded only by a client-import test); `:129-148` (the Thursday-dinner question: no answers, a `contains` list) with `:277` (`guess.includes(c)` on the normalised guess); `src/components/auth/trivia-actions.ts:40-48` (swapping questions is free and unlimited).
- **What happens:** the gate is the first thing between a stranger and the feed, the letters and the map, and the privacy page promises what members share is shown "to no one else". Anyone can read every answer on GitHub, or swap until the dinner question appears and type "veggies".
- **Fix direction:** owner decision first (Q18). If the gate should hold: move the questions and answers out of the repository (the `TriviaAnswer` table the admin room already writes, or an env-held JSON), write new questions since the old ones stay in git history, keep `trivia-bank.ts` as the judge only, tighten `contains` (the mention must be most of the guess), and meter swaps per IP. If the gate is a courtesy: say in the privacy page what actually stands between a stranger and the feed.
- **Pin it:** a test that `trivia-bank.ts` holds no answer strings; a `judge` test that "veggies" and a six-dish list fail the dinner question.
- **Travels with:** C4-01 (same files, a peer session's code; check `git log` first).
- **Owner question:** Q18.

## Phase L

#### C5-01 — Changing a query string on any member photo makes Vercel transform it again, so a few thousand requests spend Hobby's month of image transformations
**High** (raised 2026-10-24 for Hobby, where production has been since 2026-10-23) · **Confirmed** (executed: Next's own `hasRemoteMatch` run as a pure function; the Vercel cache-key half is "likely")
- **Where:** `next.config.ts:382-386` (`remotePatterns` pins protocol and host only: no `search`, no `pathname`); `node_modules/next/dist/shared/lib/match-remote-pattern.js:46-50` (an absent `search` admits any query string); three comments that say this door is closed (the one at `next.config.ts:383-385` among them).
- **What happens:** `/_next/image?url=https://images.rishivalley.space/<photo>?n=1&w=3840&q=75`, then `?n=2` and so on: each is a new source URL, so each is a fresh transformation, with no account. Hobby includes 5,000 a month across the account (the site's own use is roughly 1,300); a few thousand such requests spend the rest, and new photographs then stop rendering for 30 days (L5-11). The finder measured this against Pro's $50 cap (about 1.1 million requests); on Hobby it is three orders of magnitude cheaper.
- **Fix direction:** add `search: ""` to every remote pattern (stored image URLs carry no query string), and a `pathname` per prefix actually served through the optimizer so full-resolution Collection originals cannot be requested at 3840 px; add `/_next/image` to the firewall rule of check D; correct the three comments.
- **Pin it:** an evaluated-config test (load `next.config.ts`; extends L9-01's suggestion): every remote pattern pins `search` to the empty string.
- **Travels with:** L8-04 (one budget, no firewall), L9-01.

## Phase A

#### O-08 — A stranger can become a verified member as a real classmate: confirm any mailbox, copy a name and batch year off the directory
**High** · **Confirmed** (source, re-derived by the validator; data: 119 accounts verified from the office list, about 66 of them by name and year; 81 verified members have an exact roster match, each a copyable identity)
- **Where:** `src/lib/roster.ts:48-56` (requires a confirmed address; the comment closes only the waiting-account version of this attack), `:58-78` (email match first, then name + batch year against every roster row for the account's two years, no check that the roster person already has an account), `:84-93` (sets `verified`, `office_list`); `src/lib/roster-rule.ts:46-60` (first and last name tokens); the profile save re-runs the check on a name or year change.
- **What happens:** a stranger confirms a throwaway mailbox (Stage 1), reads every member's name and batch year from the directory's year filter or one `users-by-batch?detail=1` call, types one pair into their own profile, and is verified as that classmate: Stage 2, posting under the name, reading every member's contact details. Verification is never re-checked, so they can rename afterwards. No audit row, no admin bell; "ask to be verified" returns before its admin notice when the roster matches. Nothing records which roster row an account matched, so two accounts can both be "the" same person.
- **Fix direction:** auto-verify on an email match only; a name + year match goes to the admin's verify queue with the roster row shown beside it; record the matched roster row on the account and refuse a second account claiming it; write an audit row for every automatic verification. Take Q19's default until the owner answers: it is the safe branch.
- **Pin it:** `src/lib/roster-rule.test.mjs` (or a new `roster.test.mjs`): a name-only match does not set `verified`; a second account matching an already-claimed roster row is refused.
- **Travels with:** T7a-06 and T6-01 (the same auto-verify re-verifies an account an admin unverified; one row marker fixes both).
- **Owner question:** Q19.

## Phase O

#### O-09 — CLASS: nothing bounds what one account, or one script, may spend of what every member shares
**Medium** · **Confirmed** (each instance proved at source by its finder and checked by a validator or the orchestrator)
- **Where:** the instances, each with its own entry or Low row: C4-01, C5-01, C5-02, C6-01, C6-02, C6-03, C6-04, C6-05, L5-02, L8-04, T2a-03, T2b-02, C3-02. The meters are `src/lib/rate-limit.ts` (per IP or per account, per minute or hour) and `src/lib/email-queue.ts:435-442` (per account, per hour).
- **What happens:** the budgets everyone shares are per day or per month (95 emails a day, 500 MB, 5 GB of egress, 500K Upstash commands, Vercel Hobby's monthly allowances, every member's bell); the bounds are per hour and per address, and several doors have none. One determined account, or one script, can stop the mail, fill the database, ring every member's bell or pause the site.
- **Fix direction:** one design, reviewed before any instance is closed: (1) a per-account daily budget helper beside `rateLimit`, for writes that fan out to other members, rows that persist, and mail to the account's own address; (2) per-recipient daily caps in `enqueueMail` across every kind, and a share of the day reserved for confirmations and resets; (3) a per-member read meter on the bulk cross-user reads, and a shared cache for the ones every member gets the same answer to; (4) each log's retention sized to its cap; (5) the firewall rule of check D in front. Then apply it instance by instance.
- **Pin it:** a shape test that every server action and route calls the budget helper or sits on a reviewed exemption list (the `gate-coverage.test.mjs` pattern).
- **Travels with:** all thirteen instances; C4-01, C5-02 and C6-01 are applied in Phase G, which shares their files.

#### C6-02 — One verified account can ring every member's bell at will, and a rename rings them all again
**Medium** · **Confirmed** (source; validator re-derived)
- **Where:** `src/lib/mention-notifications.ts:26-36, 77-79, 107-121` (20 mentions per save, deduped on a message containing the sender's current name); `src/app/(main)/feed/actions.ts:585-593, 783-801` (`editPost` has no meter; each save's new mentions are told); `src/lib/post-notifications.ts:52-59` with `feed/actions.ts:873-878` (like bells deduped on the sentence); `src/components/profile/profile-actions.ts:100-128, 241` (a name change: unmetered, unaudited).
- **What happens:** about 29 saves of one post reach all 575 members; `publishDraft` and `toggleLike` are unmetered too; and because every dedupe keys on a sentence holding the sender's name, a free rename re-rings everyone. Unread bells stay 30 days.
- **Fix direction:** meter the bells per actor (in `notifyMentioned`), or meter `editPost`/`publishDraft`; dedupe on the sender, not the sentence (an `actorId` on `Notification`, the Catch-up heart's `notifyLove` is the safe model); a per-post lifetime ceiling on distinct members told; audit or throttle name changes.
- **Pin it:** a second `notifyMentioned` on the same post with a changed `actorName` writes nothing; `editPost` passes a meter; a post's distinct members told cannot exceed N across saves.
- **Travels with:** O-09, V-L-b-01 (bells after commit).

#### C6-03 — An account that never confirmed its email can write a 20,000-character draft every ten seconds, kept for ever
**Medium** · **Confirmed** (source; the validator re-derived the bytes and days)
- **Where:** `src/app/(main)/feed/actions.ts:147-157` (a letter draft skips `requireVerifiedMember`; the `posts` meter, 10 per 10 minutes, is the only bound, and it fails open once Upstash's month is spent); `:293-299` (each draft also schedules up to 16 link previews); no draft ceiling or expiry anywhere; `src/lib/rate-limit.ts:71-74` (the comment that says a Stage 0 account "can write nothing").
- **What happens:** about 86 MB a day per account, kept indefinitely because never-confirmed accounts are never purged; ten accounts reach the 350 MB alarm in hours. Nothing in the admin area counts drafts (the nightly snapshot's letter count includes them by accident, T7b-14).
- **Fix direction:** a per-account draft ceiling (count, e.g. 20, which the strip already shows, and total characters), refused with a sentence; drafts of a never-confirmed account expire after N days; no link previews for a draft whose author is below Stage 2 (resolve at publish). Correct the signup meter's comment.
- **Pin it:** `createPost` refuses the ceiling-plus-one draft; a test-kit list of every row-creating action a Stage 0 session reaches, each paired with its ceiling.
- **Travels with:** O-09, L12-01 (if it is fixed by widening `editPost` to Stage 0, it adds a Stage 0 link-preview path), T2b-02, T1-08.

#### C6-04 — The search log has no per-member ceiling: alternating two words writes a row per keystroke, about 170,000 a day
**Medium** · **Confirmed** (source)
- **Where:** `src/lib/search-log.ts:49-103` (dedupes only a prefix continuation within 60 s); callers `src/app/api/places/search/route.ts:63, 147-155` (Stage 0, 120 a minute), `src/app/api/users/search/route.ts:88-95`, `src/app/(main)/feed/page.tsx:43-45` (any `?q=`, unmetered); `src/lib/retention.ts:57-74` (kept 90 days); compare `MAX_VISITS_PER_DAY = 40` in `src/lib/last-seen.ts`.
- **What happens:** one account writes about 172,800 rows a day through the city picker alone, kept 90 days, and the rows flood the owner's analytics Reach view.
- **Fix direction:** a per-member daily ceiling in `logSearch` (the `Visit` shape; 200 a day is far above any person), refused silently like every other telemetry write; optionally log page-level searches only.
- **Pin it:** `logSearch` writes at most N rows a day for one member with alternating queries.
- **Travels with:** O-09.

#### C6-05 — No read is metered, so one signed-in account can spend Supabase's monthly data allowance in hours
**Medium** · **Suspected** (the bytes are measured; the time to 5 GB depends on how fast one client can call, 30 minutes to 2 hours)
- **Where:** `src/app/(main)/collection/actions.ts:747-769, 850-857` (`loadPhotos`: `auth()` only; the valley needs no stage; `order: "taken"` returns 241 rows, about 150 KB a call); `src/app/api/users-by-batch/route.ts:23, 40-50` (`detail=1`, up to 5,000 members a call; Stage 1, 120 a minute: about 360 MB an hour); `src/lib/api-gate.ts:93-110`.
- **What happens:** about 25,000 to 33,000 `loadPhotos` calls spend the organisation's 5 GB, so one account can push the whole site over Supabase's free line in an afternoon; the batch endpoint does it in about 14 hours inside its own meter. This inverts the dossier's "egress is organic, the spend cap is abuse" for a signed-in caller.
- **Fix direction:** cache what is identical across members (the valley river's pages differ per viewer only in their own hearts: split those out; the same for first names and the directory pins, L5-07's lever); one cheap per-member read meter on the bulk read actions; size `users-by-batch?detail=1` to what a page draws.
- **Pin it:** a sweep that every exported `load*` action passes a meter or reads through a shared cache.
- **Travels with:** O-09, L5-07 (the same cut, owner-deferred until about 1,000 members; the meter half does not wait).

## Phase B

#### C8-02 — An admin's takedown of a post leaves its photographs at their public addresses (three live today)
**Medium** · **Confirmed** (live: the finder found all three hidden posts' photographs still answering 200, one hidden since July; the orchestrator confirmed at source that `adminHidePost` only sets `isHidden`) · not adversarially validated: found by the last completeness round
- **Where:** `src/app/(main)/admin/reports/actions.ts` (`adminHidePost`: `data: { isHidden: true }`, no image purge), the feed's `adminRemovePost`; compare the Collection's takedown, `src/app/(main)/collection/actions.ts:1189` (`purgeImageUrls(photoStoredUrls(photo), "moderation")`).
- **What happens:** moderation removes the words and not the picture. The case that matters most, a photograph posted without someone's consent, is the one it does not handle: the image stays at its address for anyone who has it.
- **Fix direction:** decide first whether a hide must stay reversible (an unhide after a purge restores a post without its photographs). If the photographs should go: after the hide commits, `purgeImageUrls(parseJsonArray(post.images), "moderation")` with `deletePostWithImages`' "still named by another post" check, and decide what the author sees in place of them (the Collection accepts a broken frame for the uploader, T7a-20).
- **Pin it:** extend `notification-reach.test.mjs`'s takedown discovery (L9-08): every `isHidden: true` write on `Post` or `Photo` is followed by `purgeImageUrls`.
- **Travels with:** C8-01, C8-03, L9-08.

#### C8-01 — An erased or replaced photograph stays viewable through the site's own image address for up to a year
**Medium** · **Suspected** (the mechanism is documented by Next and Vercel and nothing in the repo purges; proving it needs a deletion on the live site: delete a throwaway post's photo, then request its `/_next/image` address) · not adversarially validated
- **Where:** `src/lib/storage.ts:131, 184, 218` (every stored object: `public, max-age=31536000, immutable`); `src/proxy.ts:422-424` (`/_next/image` needs no session); nothing calls Vercel's purge for a source image.
- **What happens:** after a post is deleted, an avatar replaced, an account erased or merged, the optimizer's resized copies keep answering for up to the source's max-age, a year, across redeploys. The R2 object and Cloudflare's edge are gone at once; the copy at the site's own address is not.
- **Fix direction:** either a short shared TTL on stored objects (`max-age` of hours, a backfill of the header on existing objects, a low `images.minimumCacheTTL`; costs some re-transformations), or call Vercel's purge-by-source-image from `purgeImageUrls` and `drainPendingImagePurges`, the one place bytes are deleted.
- **Pin it:** a rule test that `storage.ts`'s `CacheControl` is not one-year immutable, or that the purge helpers call the Vercel purge.
- **Travels with:** C8-02, L11-02 (what erasure really erases), T8b-06 (the privacy page).

## Phase I

#### C8-03 — Nothing but the author can take down a Catch-up answer, its photographs or its recording
**Medium** · **Confirmed** (source: no column, no action, no report type) · not adversarially validated
- **Where:** `prisma/schema.prisma:1236-1270` (`CatchupEntry` has no `isHidden`, unlike `Post`, `Comment` and `Photo`); `src/app/(main)/admin/catchups/[catchupId]/page.tsx` (answers read-only, no actions file); blocking leaves answers up (T2b-05).
- **What happens:** an abusive answer in a published Edition can only be removed by erasing its author's whole account, or by hand-written SQL.
- **Fix direction:** owner decision on the shape; the minimum matching the rest of the app: `CatchupEntry.isHidden` (dated migration), an admin "Remove answer" in the reading room that hides it and purges its images and recording (the C8-02 shape), the reader filtering hidden rows, and a Report on an answer.
- **Pin it:** a `gate-coverage.test.mjs`-style assertion that every member-content table with a reader has an admin takedown writer.
- **Travels with:** T2b-05, Q6, C8-02.

## Phase K

#### C7a-03 — On the profile, a refused field stays on screen under "Saved" once any other field saves, and is never written
**Medium** · **Confirmed** (source, read end to end by the finder; the validator's verdict is in `work/verdicts/V-R4b.md`)
- **Where:** `src/components/profile/pen.tsx:396-424` (`useAutoSave.run` clears the message at the start of every save, and whichever save finishes last sets the mark; `:415-420`, the comment "An error stays put", is false); `src/components/profile/letterhead-profile.tsx:378-390` (the form is seeded once and never re-seeded), `:442-458` (`commitField` records success only; a refused field is never re-sent).
- **What happens:** the cross-field year check says "Check the other year too". The member does, that field saves, the mark reads "Saved", and the year that was refused is still on screen but was never written; the next visit shows the old value. Overlapping saves (a slow connection, the places picker) can hide an error before it is ever shown.
- **Fix direction:** keep failures per field and show "Not saved" until that field saves; on a cross-field refusal, re-send the refused field once its partner saves (or validate and save the pair together); never let a later success clear an unrelated failure. Make the comment true.
- **Pin it:** a pure reducer extracted from `useAutoSave`: fail(A) then succeed(B) leaves A's failure visible; a source pin that `commitField` re-sends a refused field after its partner saves.
- **Travels with:** T6-07 and T6-12 (the same profile fields' rules).

## Phase L

#### L5-01 — Vercel Hobby's 4 CPU-hours a month is the first ceiling again, and a busy month crosses it
**High** · **Suspected** (measured: about 4 minutes of Active CPU a day, about 2 hours a month, at about 575 members and this week's quiet activity; when it is crossed depends on activity and growth) · revived 2026-10-24: V-L-c ruled it moot on Pro, and the owner moved production back to Hobby on 2026-10-23
- **Where:** the steady CPU is functions plus the proxy (platform-health re-measure, 2026-10-23: functions 2.3 and proxy 1.1 minutes a day); `src/components/analytics/presence-beacon.tsx:30, 56-77` (a view ping on every navigation and a beat every 60 s while visible), `src/app/api/presence/route.ts:29-62` (each a function invocation), `src/proxy.ts:422-424` (the matcher: the proxy runs on every request it does not exclude).
- **What happens:** Hobby stops functions for 30 days once the trailing 30 days' Active CPU passes 4 hours. Steady use is about half of that today; a launch-week month (3.4 views per member per day against today's 0.37) or about twice today's members crosses it. Right after the switch the trailing meter read 4h13m of 4h, because it still held the week before the prefetch fix and the 1–2 October launch spike.
- **Fix direction:** cheap cuts first: lengthen the beacon's beat (or pause it on hidden tabs, which it may already do; check) and exclude static and image paths from the proxy matcher where it still runs; then measure from the dashboard (check B), since `vercel metrics` needs Observability Plus. If the line approaches 75%, the owner's choice is Pro again.
- **Pin it:** a source pin on `BEAT_MS` with its argued interval and a matcher test listing what the proxy must skip; the weekly check B.
- **Travels with:** L8-04 (the same allowances, by abuse), V-L-c-01 (the measuring commands no longer work on Hobby).

## Phase O

#### L5-11 — New avatars and Catch-up photographs stop rendering once a month's 5,000 image transformations are spent
**Medium** · **Confirmed** (vendor: Hobby includes 5,000 image transformations a month and a spent allowance stops for 30 days; the site's own use is roughly 1,300) · revived 2026-10-24 with the move back to Hobby
- **Where:** every `next/image` with a remote source (`next.config.ts:382-386`); the widths ladder `next.config.ts:394` and `src/lib/image-cdn.ts` (each distinct width of each image is a transformation).
- **What happens:** organic use is about a quarter of the allowance today and grows with every new photograph and member; C5-01 lets anyone spend the rest in a few thousand requests. Once spent, images not already in the cache show their alt text for 30 days.
- **Fix direction:** close C5-01 first (`search: ""`); trim the width ladder to what layouts request; consider serving already-sized WebP straight from R2 (`unoptimized`) for avatars and Catch-up pictures, which are stored small, so they never spend a transformation.
- **Pin it:** the evaluated-config test C5-01 adds; a count of distinct widths per image surface.
- **Travels with:** C5-01, O-09.
