# V-DRIFT -- the three finished validator zones (T1, T5, T8) re-read at HEAD
Checker: V-DRIFT · 2026-10-23 · Model: Opus 5.5
Baseline: the verdicts were written against `495ecdd2`. HEAD `88642426` (113 commits later).
Method: for each standing finding (CONFIRMED, CONFIRMED-CORRECTED, DOWNGRADED, UPGRADED, and every new candidate), the
verdict's corrected citations were checked against `git diff --name-only 495ecdd2..HEAD`. Unchanged files -> "unchanged -- stands".
A changed file was opened at HEAD and the defect re-derived; fixes found with `git log -p` / `git log -L`.
Rulings: STANDS (lines unchanged) · STANDS (lines moved to ...) · FIXED-SINCE <sha> · MOOT-SINCE <sha> · CHANGED.

## T1 (feed, posts, letters, comments) -- verdicts/V-T1.md

| id | severity (from the verdict) | at HEAD | evidence (sha / new lines / one line) |
|---|---|---|---|
| T1-01 | Medium | STANDS (lines moved) | Serializer wrap now `rich-text-editing.ts:61-64` (+9 from the mention-token branch, 5164de0f); renderer edge `rich-text.ts:78-84` (+33, MENTION_PATTERN hoisted); Ctrl+B `create-post-form.tsx:448`; field `rich-text-area.tsx:74,96`; answer card `answer-card.tsx:151`. Wrap/edge logic byte-identical. |
| T1-02 | Medium | STANDS (lines moved) | `use-letter-persistence.ts` and `letter-desk.tsx` lines unchanged (desk diff is the Link import only). Composer: markSaved/clearLocalDraft/onDraftSaved `create-post-form.tsx:564-579`, finally `:617-619`, contentEditable `:679-691`. Twin guard `feed/actions.ts:247-273` (exact-content match at `:250`). |
| T1-03 | Medium | STANDS (lines moved) | Hook unchanged. Composer await `create-post-form.tsx:483`; version guard `feed/actions.ts:741-747`, refusal text `:761-766`. |
| T1-06 | Low | STANDS (lines moved) | Unconditional letter revalidation now `feed/actions.ts:805-809`. (main) layout still does auth + the same four-way read; its diff (e286daf0, d7a8041d, 46d4408f, dcad8dd8) adds no query and removes none. |
| T1-07 | Low | STANDS (lines unchanged) | `letters/(index)/page.tsx` diff is the Link import swap (same line count); `keyset.ts` unchanged. |
| T1-08 | Low | STANDS (lines moved) | Strip query `letters/(index)/page.tsx:95-106` unchanged; `drafts-strip.tsx` import-only; deleteDraft's revalidate now `feed/actions.ts:471`. |
| T1-09 | Low | STANDS (lines moved) | loadPosts empty return `feed/actions.ts:1207`, loadComments `:1428`. e286daf0 (O-03/T5-17) kept `auth()` answering null for every guard and only taught the LAYOUT to throw (`sessionWasUnavailable`), so case (b) (failed session read) still reaches these empty returns from a server action; the verdict's "T5-17's fix would convert this" did not happen. |
| T1-10 | Low | STANDS (lines moved) | `post-card.tsx:410` (`shareHref = /feed#id`) and `:758` (ShareButton "Copy link to post"); `letter-engagement.tsx`, `notification-links.ts`, `post-feed.tsx` unchanged. |
| T1-11 | Low | STANDS (lines moved) | +1 (import line): Escape handler `comments-section.tsx:606-609`, contract comment `:270-275`, inline box `:560-562`, send clears `:437-438`. |
| T1-13 | Low | unchanged -- stands | `report-action.ts`, `report-dialog.tsx`, `notification-links.ts` unchanged; `letter-menu.tsx` diff is import-only (same lines). |
| T1-14 | Low | STANDS (lines moved) | `validators.ts:209-251` unchanged (diff is OCCUPATION_MAX in profileSchema). `wantedPollOptions` `feed/actions.ts:219-222`; votePoll `:475-524`; PollDisplay non-letter branch `post-card.tsx:574`; composer `create-post-form.tsx:512-515`. |
| T1-15 | Low | STANDS (lines moved) | Validators unchanged (`:211,213,279`). `wantedTitle` `feed/actions.ts:231`; editPost content check `:620-622`; title trim `:737`; client guards `create-post-form.tsx:471`, `comments-section.tsx:415`. |
| T1-16 | Low (downgraded) | STANDS (lines moved) | editPost still queues/drains removed urls with no other-row check: `removedImages` `feed/actions.ts:638`, `droppedImages` `:667`, queue `:750-754`, drain `:770`; deletePostWithImages' still-named filter `:90-101`. |
| T1-17 | Low | STANDS (lines moved) | `postInclude` `feed/actions.ts:1137`, filtered comment `_count` `:1140`, poll vote `_count` `:1145`; `VISIBLE_COMMENT` `posts.ts:89-93`; letters index `:85`; letter page `letters/[id]/(read)/page.tsx:44`. cd1ec452 adds one batched `linkPreview` read per page (`withLinkCards`), not a new aggregate. |
| T1-18 | Low | STANDS (lines moved) | `after()` copy `feed/actions.ts:336-347`; `collection-intake.ts` and `unattended-rule.test.mjs` unchanged; `grep maxDuration` at HEAD still has no `/feed` or `/letters/new` entry. |
| T1-19 | Low | STANDS (lines moved) | `before.match(/@(\w*)$/)` now `rich-text-editing.ts:87`. Note: 5164de0f added a second, Unicode-aware way in (typed first names of 3+ `\p{L}` letters are underlined and tap-to-tag, `mention-editing.ts:116`, `api/users/first-names`), which softens the accented-name half; the `@` path and `asha@gmail` half are unchanged. |
| T1-20 | Low | STANDS (lines moved) | `model PollOption` `schema.prisma:963-971`, still no `@@index`; live `pg_indexes` = `PollOption_pkey` only (re-run today); query `feed/actions.ts:1143-1146`. |
| T1-21 | Low | STANDS (lines moved) | `post-notifications.ts` unchanged; callers `feed/actions.ts:115`, `:574`; `admin/reports/actions.ts:36` unchanged. Live: still no index on `Notification.link` (re-run today). |
| T1-22 | Low | STANDS (lines unchanged) | `directory-module.tsx:30-40` same query (`take: 6` -> `take: 7`, 10987ae6; gate now `emailGateOpen`, d7a8041d); `feed-rail.tsx:36`. |
| T1-23 | Medium | STANDS (lines moved) | Hook and desk lines unchanged; version guard now `feed/actions.ts:741-747`. |
| T1-24 | Low | STANDS (lines moved) | `loadSavedPosts` where `feed/actions.ts:1331-1348`, city arm alone `:1346`; feed `audienceWhere` `:1224`; `posts.ts:119-133`; `post-visibility-rule.test.mjs` unchanged. |
| T1-25 | Low | STANDS (lines moved) | `keyset.ts` unchanged; callers `feed/actions.ts:1283`, `comment-thread.ts:128`, `notifications/actions.ts:31`, `admin-people-query.ts:66`. |
| V-T1-01 | Low | STANDS (lines moved) | Hook unchanged; guard/refusal now `feed/actions.ts:741-747, 761-766`. |
| V-T1-02 | Low | STANDS (lines moved) | `collection-intake.ts`, `image-purge.ts`, `image-purge-rule.test.mjs` unchanged; the contrast users of `putAllOrNone` moved to `collection/actions.ts:276, 556`. |
| V-T1-03 | Low | unchanged -- stands | `post-feed.tsx` unchanged. |

## T5 (auth, signup, sign-in, reset, verification, mail queue, Turnstile, rate limiting) -- verdicts/V-T5.md

| id | severity (from the verdict) | at HEAD | evidence (sha / new lines / one line) |
|---|---|---|---|
| T5-01 | High | CHANGED | c41893f0 fixed the BOUNCED half: an unconfirmed member whose confirmation bounced gets "Use another email" (`verify-email-banner.tsx:274-281`, `change-email-actions.ts`: password-checked, metered, re-addresses queued verify rows, `account.email_change` audit). Survives for a typo that does NOT bounce (delivered to somebody else's real inbox, or failed/suppressed, which the unchanged webhook still ignores, L11-05): the button only appears in state `bounced`; the resend failure copy still says "Check the email address on your profile" (`email-actions.ts:110`, T6-06's trap); `retryMail` still requeues with `RETRY_RESET` and no `to` (`admin/mail/actions.ts:53-56`, `mail-policy.ts:135-142`); `adminUpdatePerson` still refuses email (`admin/people/actions.ts:93`). Frozen-`to` lines now `email-queue.ts:508, 601, 612, 333`. Severity should be re-ruled down (Medium suggested): the likeliest typos (no such mailbox/domain) now hard-bounce into a self-service fix. |
| T5-02 | Medium (downgraded) | CHANGED | The "database outage puts nothing in Sentry" half, which the verdict called the strongest, is fixed by e286daf0: the session callback's failed read is reported, throttled once a minute per instance (`auth.ts:595-602`). Still console-only: the door's own catch `auth.ts:315`, Turnstile lines (`turnstile.ts` unchanged), key-missing `email-queue.ts:127`, `email.ts:196, 225, 230, 244`, the layout's `after(drain)` catch `(main)/layout.tsx:129`; signup/reset bot-check refusals still unrecorded (`actions.ts:33`, `email-actions.ts:246`). |
| T5-03 | Medium (downgraded) | STANDS (lines moved) | `hasBudget` still awaits `getRemaining` with no race: `rate-limit.ts:300-311` (+14, the two new LIMITS rows); `consume` `:315-324`; `timeout: 3000` `:240`. Door `auth.ts:107-108, 175`; reauth `settings/actions.ts:204`. New caller with the same stall: `change-email-actions.ts:93, 104` (c41893f0). |
| T5-04 | Medium | STANDS (lines moved) | Read/spend/verdict now `auth.ts:175, 178, 179-181` (+2 imports); meter comment unchanged; `login-client.tsx` import-only. |
| T5-05 | Medium | STANDS (lines unchanged) | `trivia-actions.ts`, `signup-form.tsx` unchanged; `actions.ts:20-25` unchanged (its diff is the bird deal at :141); `signup-client.tsx` import-only. e91dbb77's "I don't know" touches `trivia-gate.tsx`, not the cookie window. |
| T5-06 | Medium | CHANGED | Mechanism intact at `proxy.ts:307-329` (page 307 `:328`, /api 401 `:318-320`), `call-action.ts` unchanged. Reach WIDENED by dcad8dd8: a signed-out page load now goes through `/api/auth/stale`, which deletes a revoked/expired/undecodable cookie (`api/auth/stale/route.ts`, `sessionIsStale` `auth.ts:557-562`). So after a password reset/block/deletion request elsewhere, the first hard load in one tab deletes the cookie and every other open tab's save then takes this path ("Check your connection") instead of the action's "Not authenticated". The verdict's "revoked sessions do not take this path" no longer holds once any tab has loaded a page. Fix direction unchanged. |
| T5-07 | Medium | STANDS (lines unchanged) | LIMITS `rate-limit.ts:70, 75, 79, 84` unchanged; key read now `:345-352`; `actions.ts:105-106` unchanged; still no AAAA record (`dig`, today). |
| T5-08 | Medium | CHANGED | False claim survives: key missing -> `queueIsSendable` false -> `{state:"imminent"}` (`email-queue.ts:123-133, 1022`) -> banner "A link has been sent to your email" with no button (`verify-email-banner.tsx:221-228`). Harm shrank with d7a8041d: with nothing ever sent, `confirmationStillWaiting` keeps every email gate OPEN (`email-gate-open.ts`, a weighed choice in its header), so no member is locked out; `EMAIL_UNVERIFIED` and `/verify-email`'s waiting copy no longer say "we sent you a link when you joined". Now a misleading banner, not a misleading banner plus a shut gate: Low suggested. |
| T5-09 | Medium | STANDS (lines moved) | `turnstile.ts`, `turnstile-widget.tsx` unchanged; `actions.ts:31-34` unchanged; reset refusal `email-actions.ts:244-246`; door `auth.ts:137-186`. |
| T5-10 | Medium | STANDS (lines moved) | Per-instance throttle Map `rate-limit.ts:263-272`; `report-error.ts` unchanged. (e286daf0 applied the same lesson to the session read, not to the limiter.) |
| T5-11 | Low | STANDS (lines moved) | `human-pass-rule.ts`, `human-pass.ts` unchanged; `auth.ts` +2: cookie read `:121-127` inside the try at `:93`, catch `:313-317`. |
| T5-12 | Low | STANDS (lines unchanged) | `login-client.tsx` import-only (same lines). |
| T5-13 | Low | STANDS (lines moved) | `verification-mail.ts` unchanged (still `{ok:true}` whatever `enqueueMail` answers); refusal `email-queue.ts:502`; `resendVerification` `email-actions.ts:65-133`; banner flash `verify-email-banner.tsx:113`. |
| T5-14 | Low (owner decision) | STANDS (lines moved) | Door `auth.ts:251-258`; reset `email-actions.ts:258-268`; `forgot-client.tsx` import-only. |
| T5-16 | Low | STANDS (lines moved) | Race `email.ts:218-226`; transient branch `email-queue.ts:266-294`; re-mint `:601`; `auth-tokens.ts` unchanged. |
| T5-17 (DUPLICATE of O-03; listed as fixed outside the audit) | High | FIXED-SINCE e286daf0 (hard-load face) | Confirmed: the session callback catches the row read (`auth.ts:370-404`, `.catch(sessionReadFailed)` at `:399`), `guardedSession` sets a per-request flag (`:543-546`), the (main) layout throws `SESSION_UNAVAILABLE` to the error screen instead of redirecting (`(main)/layout.tsx:33-34`), Sentry ignores that throw (`instrumentation.ts:71-76`), pinned by `session-unavailable-rule.test.mjs`. NOT done, as the V-T5 correction asked: `auth()` still answers null, so pages that `return null`/redirect on a null session (L2-03) and actions (T1-09) still treat a slow database as "signed out". |

## T8 (T8a money + demo, T8b shell + common components + config) -- verdicts/V-T8.md

| id | severity (from the verdict) | at HEAD | evidence (sha / new lines / one line) |
|---|---|---|---|
| T8a-01 | Low | STANDS (lines moved) | `snapshot.mjs` gained TLS and a DB-size alarm (91c07fbc, e29823cb); the four `give_*` subqueries are now `:123-127` and the six `contributions.*` metrics `:163-175`, still summing `amount` with no `refundedAmount` and no `COUNTED_GIVERS`. |
| T8a-02 | Medium | unchanged -- stands | `api/razorpay/webhook/route.ts`, `contribution-state.ts` unchanged. |
| T8a-04 | Low | unchanged -- stands | `route.ts`, `razorpay.ts` unchanged. |
| T8a-05 | Low | STANDS (lines unchanged) | `support/actions.ts` unchanged; `bird-picker.tsx` diff is one comment word at :107. |
| T8a-06 | Low | STANDS (lines unchanged) | `support/page.tsx` import-only (same lines, `.catch(() => 0)` `:46`, `.catch(() => null)` `:56`); `pick-bird/page.tsx` +1 import (C-155 reasoning now `:31-41`). |
| T8a-07 | Low | STANDS (lines moved) | Export dropped the song/vote fields (3c6ee660, 5d5c6898); the `contributions` entry is now `api/account/export/route.ts:275-290`, select `:279-287`, still no `refundedAmount` or Razorpay ids. |
| T8a-08 | Low (partially checked) | STANDS (lines unchanged) | Repo side only, as in the verdict: `verify-guard.mts` unchanged (still asserts users and the rename only); `bugs.md:537-539` sentence unchanged (the one bugs.md edit is the fundraiser figure at :460); seed's Place write unchanged (its diff drops two Catch-up rhythm columns at :376); reset route +1 line (TLS). Demo database not re-queried. |
| T8a-09 | Low | STANDS (lines moved) | `DEMO_CLOSED_APIS` `proxy.ts:80-85` (+2 import); `demo.ts` -6 and `demo.test.mjs` -1 (CatchupPromptOption dropped with the vote, 5d5c6898); still no test naming the support actions or the API list; support sentences `support/actions.ts:58, 155, 244` unchanged. |
| T8a-10 | Low | unchanged -- stands | `verify-guard.mts:142` and `demo-seed/people.ts` unchanged. |
| T8a-11 | Medium | STANDS (lines moved) | `route.ts` unchanged; `pick-bird/page.tsx` redirect now `:77`; bell click handler `notification-bell.tsx:262-279` (its diff adds the mention and catchup_added icons); `support-shell.tsx` diff is the "See all" count. |
| T8a-12 | Medium | STANDS (lines moved) | `support/actions.ts`, `support-contribute.tsx` unchanged. Session callback now `auth.ts:370-404`, `guardedSession` `:541-548`. e286daf0 keeps `auth()` answering null inside a server action, so the pool-timeout half the verdict expected `SessionUnavailable` to cure is still live: "Not authenticated" after the money moved, button re-enabled. |
| T8a-13 | Low | unchanged -- stands | `support-contribute.tsx` unchanged. |
| T8a-14 | Low | STANDS (lines unchanged) | `admin/support/page.tsx` import-only. |
| T8a-15 | Medium | unchanged -- stands | `route.ts:110-128`, `razorpay.ts` unchanged. |
| T8a-16 | Medium | STANDS (lines moved) | `bird-avatar.tsx:47, 90` (photo first) unchanged; promise `bird-picker.tsx:173` unchanged; letterhead's `hasPhoto` now `letterhead-profile.tsx:362, 769, 799` (+4, the About easter egg). ad390fd0 now deals every new member a `birdOverride` at signup; the photo still beats it. |
| T8a-17 | Low | STANDS (lines moved) | `demo-bar.tsx` unchanged; reset's 500 now `api/demo/reset/route.ts:96-99`. |
| T8a-18 | Low | STANDS (lines unchanged) | `costs-card.tsx` is still `"use client"`; `BUILD_COST_PAISE` at `:36` changed value only (400000 -> 500000 x 100); `fundPct` `:106`; `support/page.tsx:61`. |
| T8b-01 | High | STANDS (lines unchanged) | `back-closes.ts`, `confirm-dialog.tsx`, `edit-photo-dialog.tsx`, `avatar-crop-dialog.tsx`, `moderation-dialog.tsx` unchanged; `ui/dialog.tsx:15-29` unchanged (its diff is MODAL_CLOSE's styling, 08d25d12); contribute-room's refusal now `contribute-room.tsx:229-238` (9c992844, 105e056c). |
| T8b-02 | Medium | STANDS (lines moved) | Layout `auth()` `:26`; the four-way `Promise.all` `(main)/layout.tsx:92-111` (inline `catchup.findFirst` `:105-109`), `notification-count.ts` unchanged, `verificationMailState` still uncaught; `advanceDueCatchups` swallow `catchups.ts:493-499`. e286daf0 now sends the session-read failure to the same root boundary on purpose. |
| T8b-04 | Low (downgraded) | STANDS (lines moved) | `formatTimeAgo` `utils.ts:73-75` unchanged; profile-seeded site now `post-card.tsx:442`; admin sites unchanged (import-only diffs); `conversation.tsx` is `src/components/messages/conversation.tsx:88`. |
| T8b-05 | Low (downgraded) | unchanged -- stands | `info-tooltip.tsx`, `float-field.tsx`, `photo-questions.tsx` unchanged. |
| T8b-06 | Medium | STANDS (lines moved) | Privacy page import-only (lines unchanged); `retention.ts` unchanged; `ContentView` now `schema.prisma:1562-1592` (`@@unique` `:1585`), `Visit` from `:1461`. The ninth item (Sentry, T8b-14) is still true. |
| T8b-07 | Low | STANDS (lines moved) | Root `layout.tsx`, `motion-features.tsx` unchanged; still no `global-error.tsx`; `onRequestError` now `instrumentation.ts:92`. |
| T8b-08 | Low | STANDS (lines unchanged) | `not-found.tsx` import-only; `app-shell.tsx` unchanged; still no `(main)/not-found.tsx` (only `forbidden.tsx`). |
| T8b-09 | Low | STANDS (lines unchanged) | `page.tsx`, `showcase.tsx` unchanged; `landing-footer.tsx` import-only. |
| T8b-10 | Low | STANDS (lines moved) | `"/"` first in `publicPaths` `proxy.ts:240-241`; prefix match `:299-301`; `NextResponse.next()` `:303-305`. |
| T8b-11 | Low | STANDS (lines moved) | The "stays statically rendered" comment is now `proxy.ts:176-181` (rewritten around the stale-cookie hop, dcad8dd8, but the false claim survives at :179-180); root layout unchanged. |
| T8b-12 | Low (informational) | STANDS (lines moved) | Layout lines as T8b-02 (`after()`s now `:125-131`, `:140`); `revalidatePath(` call lines 105 -> 100 in the same 14 non-lab files (`git grep`, both revisions). |
| T8b-14 | High (upgraded) | STANDS (lines moved) | No commit adds a `beforeSend` or touches `sendDefaultPii`/`dataCollection` (`git log -S beforeSend` finds only the interim-report docs commit); the only `instrumentation.ts` change is the `SESSION_UNAVAILABLE` ignore. Comment `:50-53`, `onRequestError` `:92`; `@sentry/nextjs` still 10.70.0. One more in-request reporter now exists, `reportSwallowed("auth.session-read")` (`auth.ts:599`, e286daf0), which fires during exactly the incidents the verdict describes (throttled to once a minute per instance). |
| T8b-15 | Medium | CHANGED | Code unchanged (`src/app/error.tsx:25`, `(main)/error.tsx:44`, `(auth)/error.tsx:34` all bind `reset`; no `global-error.tsx`; Next 16.3.8's `error-boundary.js` still offers `retry` at :43/:114). Reach WIDENED by e286daf0: a database stall on a hard load is now DESIGNED to land on the root boundary (`(main)/layout.tsx:29-34`, whose comment says its "Try again" re-asks), but `reset` re-renders the cached errored payload with no request, so O-03's fix leaves the member on a screen whose only button cannot recover (a manual reload does). Should be fixed with O-03's follow-up; Medium stands, priority up. |
| T8b-16 | Low | MOOT-SINCE 46d4408f | "Plain-text chapters" deleted `Doorway` and the six same-page doorways; the only in-chapter link left is `GuideLink href="/messages"` (`chapters/collection.tsx:35`, a pathname change, so the layer's close at `guide-layer.tsx:86-90` fires), and the admin replay is a full-load `<a href="/feed?tour=replay">` (`guide-body.tsx:136`). Nothing in the guide now navigates to the pathname it was opened on. |
| T8b-17 | High (upgraded) | STANDS (lines moved) | Popup className `ui/dialog.tsx:113` (+4, MODAL_CLOSE comment), still no `max-h`/`overflow`; `edit-post-dialog.tsx` unchanged; field `rich-text-area.tsx:98` (minHeight only); callers `letter-menu.tsx:211`, `post-card.tsx:800`. Live today: 7 published letters, median 4,278 chars, max 7,494 (unchanged). |
| T8b-18 | Low | STANDS (lines unchanged) | `instrumentation.ts:31-33, 39-40, 48` unchanged (insertion is at :71). |
| T8b-19 | Low | STANDS (lines unchanged) | `landing-hero.tsx` import-only; `motion-features.tsx` unchanged. |
| T8b-20 | Low | STANDS (lines moved) | `useSwipeDownToClose` `sheet.tsx:164-239` unchanged (SETTLE now also eases opacity); `close` useCallback now `:311`; unstable callers `people-door.tsx:325`, `house-chain-editor.tsx:299`. 46d4408f/f7b3c5d9 added media/overlay props to `BottomSheet`, not to the drag hook. |
| T8b-21 | Low | STANDS (lines unchanged) | Two independent selects `range-facet-pill.tsx:86-112` (its diff is a preset chip's fill at :134-144); `directory/where.ts:99-100` unchanged. |
| V-T8-01 | Low | unchanged -- stands | `route.ts`, `support/actions.ts`, `admin-rule.test.mjs` unchanged; `admin/support/page.tsx` import-only. |

## Counts

77 standing findings (T1 25, T5 15, T8 37) plus one extra confirmation row (T5-17, a DUPLICATE of O-03 listed as fixed outside the audit).
- unchanged -- stands (no cited file changed): 9
- STANDS (lines unchanged; the file changed elsewhere or by an import swap of equal length): 16
- STANDS (lines moved): 46
- CHANGED: 5 -- T5-01, T5-02, T5-06, T5-08, T8b-15
- MOOT-SINCE: 1 -- T8b-16 (46d4408f)
- FIXED-SINCE: 0 among the standing findings; T5-17 / O-03 confirmed FIXED-SINCE e286daf0 for its hard-load face only.

Cross-cutting facts a fix session should carry:
- e286daf0 (O-03/T5-17) did NOT make `auth()` throw. It keeps answering null and only the (main) layout reads `sessionWasUnavailable()`. So every server-action and page-level null-session branch still treats a slow database as "signed out": T1-09, T8a-12 and L2-03 keep their pool-timeout halves, and the layout's throw lands on a root boundary whose "Try again" is `reset` (T8b-15).
- dcad8dd8 (a dead cookie is deleted through `/api/auth/stale`) turns a revoked session into an ABSENT cookie after the first hard load, which feeds T5-06's proxy-307 path from more triggers.
- The many "lines moved" in `feed/actions.ts` come from 1f44f1e9 (mention notifications) and cd1ec452 (link cards); neither touches the guards, revalidations or reads these findings are about.
- Next moved 16.3.3 -> 16.3.8 (df260031). The Next internals the verdicts cite were spot-checked at 16.3.8 and sit unchanged, mostly at the same line numbers: `action-handler.js:199` (`redirect: 'manual'`) and `:227` (`fromStatic('{}')`), `server-action-reducer.js:110` (x-action-redirect) and `:143` (the unexpected-response throw), `error-boundary.js:43, 114` (`retry`).

## Coverage

- Every standing row in `V-T1.md` (22 verdicts + V-T1-01..03), `V-T5.md` (T5-01..14, T5-16) and `V-T8.md` (T8a-01, 02, 04..18; T8b-01, 02, 04..12, 14..21; V-T8-01) has a row above. Not ruled, because they are not standing: T1-04, T1-05, T1-12 (REFUTED); T5-15 (DUPLICATE of T7b-04); T8a-03 (DUPLICATE of T8a-02); T8b-03 (DUPLICATE of T5-06, covered by T5-06's row); T8b-13 (KNOWN; noted only that `/guide` is still linked from `guide/[area]/page.tsx` alone, as at baseline).
- Method: `git diff --name-only 495ecdd2..HEAD` (793 paths) against every cited file. Each changed file was diffed and the cited construct re-located at HEAD by grep/sed, and the defect re-derived from the HEAD text. Fix commits were identified with `git log` / `git log -S` on the touched files (e286daf0, c41893f0, d7a8041d, dcad8dd8, 46d4408f, 1f44f1e9, cd1ec452, 5164de0f, 08d25d12, 9c992844, df260031).
- Known fixes from `task_plan.md` checked against the code: O-03/T5-17 (`e286daf0`) confirmed, with the residue above; T5-01's bounced half (`c41893f0`) confirmed, with the non-bounce residue above; T8b-14: no commit touched Sentry's `beforeSend`, `sendDefaultPii` or `dataCollection`, so it stands.
- Live, read-only (SELECT only): `pg_indexes` for `PollOption`/`Notification` (T1-20, T1-21: unchanged); published-post length distribution (T8b-17: unchanged). `dig AAAA rishivalley.space` (T5-07: still none). No writes, no browser, no sign-in, no gates; one scratch file `/tmp/vdrift-changed.txt` (the changed-path list), deleted at the end.
- Not re-derived: anything the verdicts themselves left to the orchestrator (live browser proofs, the demo database for T8a-08, Sentry dashboard settings).

STATUS: COMPLETE at HEAD 88642426
