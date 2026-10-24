# V-L-b — adversarial validation of L4 (silent failures), L10 (identity states, empty states, chaos), L11 (jobs, webhooks, queues)
Validator: V-L-b · Model: Opus 5.5 · Started: 2026-10-23 at HEAD 88642426 (113 commits past the audit's 495ecdd2; work/rebaseline.md).
Method: `work/brief-validator.md`. Read-only; SELECT-only database; no gates, no browser, no sign-in; scratch only under /tmp, deleted by the command that made it. Every citation re-checked at HEAD; line numbers below are HEAD's unless marked "(495ecdd2)".
Verdict values in use: CONFIRMED · CONFIRMED-CORRECTED · DOWNGRADED · UPGRADED · REFUTED · DUPLICATE · KNOWN · FIXED-SINCE <sha> · MOOT-SINCE <sha>.

## Verdict board
- L4-01 — CONFIRMED-CORRECTED (Medium; the `openNextEditionIfDue` caller is MOOT-SINCE eb855c71, a new `syncBatchGroupQuietly` caller took its place)
- L4-02 — CONFIRMED-CORRECTED (Medium)
- L4-03 — CONFIRMED-CORRECTED (Medium)
- L4-04 — CONFIRMED-CORRECTED (Medium)
- L4-05 — CONFIRMED-CORRECTED (Low)
- L4-06 — CONFIRMED-CORRECTED (Medium; WIDER than filed: a DNS failure is silent too, re-measured at HEAD)
- L4-07 — CONFIRMED (Low, possible)
- L4-08 — CONFIRMED-CORRECTED (Medium, umbrella; counts re-taken)
- L10-01 — UPGRADED to High (door 3 is no longer latent: since daec81ec every batch member, unconfirmed included, holds four Keeper verbs with no stage gate; 54 unconfirmed accounts sit in 20 live batch Catch-ups and Batch of 2024 is answering now)
- L10-02 — CONFIRMED-CORRECTED (Low)
- L10-03 — CONFIRMED-CORRECTED (Low)
- L10-04 — CONFIRMED (Low)
- L10-05 — CONFIRMED (Low, owner decision)
- L10-06 — CONFIRMED-CORRECTED (Low; consequence corrected: the move is now immediate and the old membership is removed, e49e6265)
- L11-01 — FIXED-SINCE a281e855 (DUPLICATE of L3-08 canonical; NOT 7f28818c, which broke every October upload's copy; two Low residuals remain)
- L11-02 — CONFIRMED-CORRECTED (Medium)
- L11-03 — CONFIRMED-CORRECTED (Low)
- L11-04 — CONFIRMED-CORRECTED (Low)
- L11-05 — CONFIRMED-CORRECTED (Medium; sharpened by c41893f0: the new "Use another email" door closes on a suppressed resend)
- L11-06 — CONFIRMED-CORRECTED (Low)
- L11-07 — CONFIRMED (Low)

Counts: CONFIRMED 4 · CONFIRMED-CORRECTED 15 · UPGRADED 1 (L10-01 Medium → High) · FIXED-SINCE 1 (L11-01, a281e855) · MOOT-SINCE 0 whole findings (one caller of L4-01 and four Keeper actions named in L10-01 are moot) · REFUTED 0 · DUPLICATE 0 beyond L11-01's known fold into L3-08 · DOWNGRADED 0. New candidates: 1 (V-L-b-01, Low).

## Verdicts

### L4-01 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `prisma-errors.ts:50-57` correct (`isMissingTable`; comment :38-49). `catchups-core.ts:1400-1402` → **:1290-1292**. Callers at HEAD: `catchups.ts:324` → **:320** (`advanceEdition`, early `return` before the `reportSwallowed` at :329); `:519` (`openNextEditionIfDue`) is **MOOT-SINCE eb855c71** (Editions start by hand; nothing opens on the clock, the function is gone); `:527` → **:494** (`advanceDueCatchups`); `batch-catchups.ts:310` → **:399** (`healBatchCatchupsAndMemberships`) and a NEW one at **:265** (`syncBatchGroupQuietly`, added by e49e6265 for the batch-year move); `catchups/actions.ts:233` → **:205-206** (`runAction`); pages: `(index)/page.tsx:257` → **:267**, `[catchupId]/(home)/page.tsx:495-503` → **:508-516**, `edition/[editionId]/page.tsx:155-163` correct, `new/page.tsx:69-71` → **:88-89**, `app/catchups/join/[token]/page.tsx:73-77` → **:74-76**. The test exemption `catchup-lifecycle.test.mjs:300-343` → **:349** (it now asserts `reportSwallowed(` somewhere in the block, which both engine catches satisfy AFTER their early return, so the branch still passes).
What I tried to refute it with: (1) whether the regex fallback was narrowed since — no, `isMissingTable` is byte-identical. (2) Reproduced offline at HEAD by importing `src/lib/prisma-errors.ts` in Node: a typed P2022 message "The column `CatchupEntry.songUrl` does not exist…" → `true`; a raw P2010/42703 "column CatchupEntry.x does not exist" → `true`; the same on `Notification` → `false`. (3) Whether the trigger is still one ordering slip away: YES, and there are now TWO pending Catch-up column drops. `2026-10-11-drop-song-columns.sql` (CatchupEntry.songUrl/songTitle/songArt + CatchupReminderPref.deletedAt) and `2026-10-17-drop-rhythm-columns.sql` (CatchupSeries.cadence/nextOpensAt/pausedAt) are both "NOT APPLIED"; live `information_schema` still has all of those columns. The model no longer names them (schema.prisma:1089-1094, 3c6ee660), so the DROP order is now safe if the headers are followed, and both headers DO spell out "only once the commit that stopped reading these columns is LIVE" — which is half of the finding's fix direction, done. The ADD direction (a new `Catchup*` field reaching production before its ALTER) is untouched.
Why it stands: the guard still turns any column error on a table whose name contains "Catchup" into silence across the engine, the heal, the batch-year sync, every Catch-up action and five pages; none of those branches reports. With two hand-applied drops pending on the one shared database and `origin/main` three commits behind HEAD, the trigger is live, and the failure would read as "Catch-ups are almost ready" to every member with no alarm.
Live check run: `node scripts/dev/run-sql.mjs --inline "SELECT table_name, column_name FROM information_schema.columns WHERE table_name LIKE 'Catchup%' AND column_name IN (…)"` → CatchupEntry.songUrl/songTitle/songArt, CatchupReminderPref.deletedAt, CatchupSeries.cadence/nextOpensAt (+pausedAt) all still present. Offline `isMissingTable` probe as above.
Corrections to the finding: line numbers as above; drop the `openNextEditionIfDue` site (moot); add `syncBatchGroupQuietly` (`batch-catchups.ts:261-268`) to the list; the "pending phase-11 drop" in trigger (b) is now two files, each correctly gated in its header on the deploy. Fix direction and gate stand (narrow `isMissingTable` to P2021/42P01 or `relation "…" does not exist`; report on every branch).
Orchestrator action: none.

### L4-02 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `last-seen.ts:274`, `:278-280`, `:309-311`, `:318-322` correct; `search-log.ts:55`, `:98-102` correct (guard :99); `content-view.ts:29`, `:38-42` correct; `stats-exclusion.ts:46-48` correct; `login-attempt.ts:60-64` → **:81-86** (the writer gained a raw `count(*)` cap before every failed-attempt insert in e29823cb, same catch); `audit.ts:79-83` → **:84-88**; `catchup-reads.ts:42-49` correct; `feed/actions.ts:1310-1313` → **:1488-1492** (`markFeedSeen`); `auth-tokens.ts:214-221` → **:217-220**.
What I tried to refute it with: whether e29823cb (L5-02's cap) or 91c07fbc routed any of these through a reporter — no; whether a throttled reporter now exists that they could share — one more hand-rolled one does (`auth.ts:591-602`, `sessionReadFailed`, once a minute per instance), none shared; the two tests that pin the contradiction (`stats-exclusion-rule.test.mjs`, `catchup-reads.test.mjs:62`) are unchanged.
Why it stands: every listed catch still logs only when `NODE_ENV !== "production"`, and the three stats writers still never run where that branch could fire (`statsWritesEnabled()` = `VERCEL_ENV === "production" || PRESENCE_IN_DEV === "1"`).
Live check run: none needed (source).
Corrections to the finding: line numbers above. Note for the fix: `login-attempt.ts` now does TWO statements per failed sign-in (cap count + insert) inside the same silent catch.
Orchestrator action: none.

### L4-03 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `collection/actions.ts:266-267` → **:280-281** (`contributePhoto`, no log); `:551-552` → **:572-573** (`contributePhotoDirect`, no log); `api/upload/route.ts:139-141` → **:140-141**; `api/upload/finalize/route.ts:138-140` → **:139-140**; `components/settings/actions.ts:119-123` → **:127-129**; `api/upload/audio/finalize/route.ts:82-84` → **:83**; `upload-shared.ts:368-370` → `describeProcessingError` now at **:369** (its docblock above); `storage.ts:252-254` → **:252** (`readObjectHead` catch), `:294-299` → **:297** (`headObjectSize` catch); `voice-answer-rule.ts:229-237` correct; `retention.ts:339-344` → **:336-343**, `:357-361` → **:347-361** (the audit write); `grep -rn imagesStillPending src` still finds only `retention.ts` (no reader); `upload-client.ts` warns at **:62, :93, :109** (9c992844 added a retry and a third warn — still the member's browser console).
What I tried to refute it with: a storage alarm added by the platform-health work (e29823cb added a DATABASE size alarm only); `reportSwallowed` in any upload catch (none: the full HEAD call-site list is 23 sites in 12 files, none an upload path); the sweep's status rule (`sweep/route.ts:68`, still `errors.length > 0 ? 502 : 200`, and the drain step returns `drained.deleted`, never throws on refusals).
Why it stands: unchanged mechanism at every site; the Collection's two paths still write no line at all.
Live check run: none needed.
Corrections to the finding: line numbers above.
Orchestrator action: none.

### L4-04 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the mechanism; Medium is right (the only money inflow, no alarm)
Citations re-derived: `support/actions.ts:98-136` correct (try :98, order :99-110, row :112-122, catch :133-136); `razorpay.ts:98-104` → **:91-97** (`if (!res.ok)` :91, the comment :93-94, `console.error` :95, throw :96); `credentials()` :24-30.
What I tried to refute it with: a duplicate in T8a (T8a.md:113 mentions the same catch only as the demo's accidental refusal; T8a-12/13 are post-payment) — not a duplicate; a report elsewhere on the path (`createOrder` logs and throws; the action's catch swallows; no `onRequestError`).
Why it stands: one console-only catch for both a configuration fault and a DB failure; no Contribution row, so the funnel and `/admin/support` show a quiet week.
Live check run: none possible (needs a wrong production key).
Corrections to the finding: line numbers above.
Orchestrator action: none.

### L4-05 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `use-user-search.ts:66-73` correct (`res.json()` then `Array.isArray(data) ? data : []`, catch → `[]`; `res.ok` never read); `people-picker.tsx:167` → **:177-179** ("No one found by that name."); `people-picker.tsx:106-117` → **:117-128** (`addMyBatch`: `data?.users ?? []` → "Everyone from your batch is already here"); `people-door.tsx:190` is the hook call, and its own empty copy is **:261-263** "Nobody by that name." (a different sentence from the finding's quote).
What I tried to refute it with: whether 5164de0f (composer tagging) or 44b20a91 (Start a Catch-up) touched the hook — no; consumers are still exactly the two Catch-up pickers.
Why it stands: any 401/403/429/500 body is an object, not an array, so it renders as "nobody".
Live check run: none (client).
Corrections to the finding: line numbers; people-door's sentence is "Nobody by that name."
Orchestrator action: none.

### L4-06 — CONFIRMED-CORRECTED (Medium; wider than filed)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (re-measured at HEAD)
Citations re-derived: `rate-limit.ts:224-226` → **:239-241** (`timeout: 3000`); `:264-277` → **:276-289** (`rateLimit`); `:301-310` → **:307-316** (`consume`); `:236-258` → **:248-270** (`reportLimiterFailure`); `:196-205` → **:208-221** (`getRedis`, warn :215); `@upstash/ratelimit` v2.0.8 `dist/index.js:826-828` (race) and `:926-938` (`applyTimeout` resolves `reason: "timeout"`). 21 `rateLimit("` call sites outside tests.
What I tried to refute it with: whether anything reads `reason` now (no); re-ran the finder's offline probe at HEAD with the installed libraries via `node --input-type=module -e` (no file written): non-routable host → **3,002 ms `{"success":true,"reason":"timeout"}`**; a nonexistent DNS name → **3,002 ms `{"success":true,"reason":"timeout"}`**, no throw.
Why it stands, and why wider: the finding said a backend that "REFUSES (401 wrong token, DNS failure, connection refused) throws" and is reported. A DNS failure does not throw at HEAD either (the Redis client's retries outlast the 3 s race), which V-T5 also measured. Only a fast HTTP error (e.g. a 401 within 3 s) reaches `reportLimiterFailure`; every other outage shape turns every limit off silently and adds 3 s per metered action.
Live check run: the two offline probes above.
Corrections to the finding: strike "DNS failure, connection refused" from the "throws" list; line numbers above. Fix direction unchanged (read `reason === "timeout"`; report missing env in production).
Orchestrator action: none.

### L4-07 — CONFIRMED (Low, possible)
Verdict: CONFIRMED
Confidence in verdict: certain on the mechanism; possible on delivery loss (platform behaviour)
Citations re-derived: `report-error.ts:25-46` correct (capture :37-40, no flush); `grep -rn "Sentry.flush\|flushIfServerless" src` → nothing; tick route `api/catchups/tick/route.ts:34-39` (`await advanceDueCatchups(); return …{ ok: true }`).
What I tried to refute it with: the instrumentation change since (the only diff adds `SESSION_UNAVAILABLE` to `ignoreErrors`); any `after(() => Sentry.flush…)` — none.
Why it stands: unchanged.
Live check run: none possible read-only; the finder's settle step (one deliberate report from the tick) stands.
Corrections to the finding: none.
Orchestrator action: none.

### L4-08 — CONFIRMED-CORRECTED (Medium, umbrella)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: the one enforcement is still `catchup-lifecycle.test.mjs` over `catchups.ts` alone (exemption now at :349); no `swallow-rule` test exists; no `console-only:` tag anywhere.
What I tried to refute it with: a recount at HEAD. `reportSwallowed` now has **23 call sites in 12 files** (new: `auth.ts:599` session read, `email-gate-open.ts`, `change-email-actions.ts`, a second in `batch-catchups.ts`, a second in `components/auth/actions.ts`), still **0 under `src/app`** (the two `src/app/api` mentions are comments). `console.error/warn` in non-`"use client"` files outside lab/tests: ~**71 lines in 41 files** (approximate; includes `upload-client.ts`). Each new reporter site brought its own throttle or none: `auth.ts:591-602` hand-rolls a once-a-minute throttle a second time beside `rate-limit.ts:262-270`.
Why it stands: the class is intact; the platform-health work added reporters case by case, which is exactly the pattern the finding describes.
Live check run: greps above.
Corrections to the finding: counts above. Relation: this is the canonical home for the gate; T5-02 is its auth/mail instance (same proposed test, one test not two).
Orchestrator action: none.

### L10-01 — UPGRADED to High
Verdict: UPGRADED to High (CONFIRMED-CORRECTED at HEAD)
Confidence in verdict: certain on the mechanism and the live exposure
Citations re-derived (the batch Catch-up code changed in e49e6265, daec81ec, 14f77687, eb855c71, 44b20a91):
  - The rule: `joinCatchupByToken` → **`catchups/actions.ts:587-593`** (Stage 2 comment :591-592, `requireVerifiedMember()` :593); the SAME FILE now states the rule outright at `setEditionTimeCapsule` (**:1351-1352**): "A verified member. It decides what happens to everybody's writing for a year, which is the tier every group-reaching write here sits at." `member-gate.ts:17-21` (Stage 2 = every write).
  - Door 1 (signup): `components/auth/actions.ts:190-205` → **:218-229** (`joinBatchGroup`, no stage check); `batch-catchups.ts:83-118` → **:97-125**; floor counting all members **:177** (`ensureBatchCatchup`).
  - Door 1b (batch-year edit): `profile-actions.ts:160-202` → the year write **:160-245**, then **:253** `syncBatchGroupQuietly` — the move is now IMMEDIATE at save (e49e6265), not at the next heal, and takes the member OUT of the old batch (`batch-catchups.ts:230-253`). So "collect one batch a night" becomes "hop to any batch instantly, as often as you like" (one at a time); auth only, no meter, no audit row (L10-06).
  - Door 2 (Keeper pickers): `users/search/route.ts:44-64` → **:44-62**, still no `emailVerified`/`verifyState` arm; `createCatchupWithPeople` and `addCatchupMembers` still drop blocked/leaving/teacher ids only.
  - Door 3 (the hat) — **no longer latent.** daec81ec ("everyone in a batch runs its Catch-up", owner: "make everyone a keeper") made every member of a BATCH Catch-up hold the cycle verbs through `loadKeeperEdition(..., { allowBatch: true })` (**:396-432**: a batch member skips `isEffectiveKeeper` entirely). The four batch-enabled verbs have no stage gate: `curatePrompt` (**:948**, remove deletes ANY question in a collecting Edition; reorder), `openAnswering` (**:1018**, rings "answers are open" to every member), `closeAndPublish` (**:1092**, publishes early and rings everyone), `extendDeadline` (**:1282**, unbounded repeat extensions). Only `startEdition` (**:1234**) and `setEditionTimeCapsule` (**:1382**) call `requireVerifiedMember()`. On people Catch-ups the original door 3 stands: `setCatchupKeeper` (**:2349**) and succession check no stage; `endCatchup` (:780), `removeCatchupMember` (:2179) have no stage gate.
  - **MOOT-SINCE eb855c71** in the finding's list: `updateCatchupCadence`, `pauseCatchup`, `resumeCatchup`, `nudgeGroup`, `startNextEditionNow` (deleted; tombstone comments at :680, :771, :2427).
  - Reads: no file under `src/app/(main)/catchups`, `src/components/catchups` or `src/app/catchups` reads `emailConfirmed`/`verifyState` except `actions.ts` (grep); home membership check **`(home)/page.tsx:116-124`**, People door from `IDENTITY_SELECT` :71-77/:174; `catchups/layout.tsx` turns away teachers only.
What I tried to refute it with: (1) an owner ruling that reading a Catch-up is Stage 0 — none; the opposite is written twice in `catchups/actions.ts` (invite link :591-593, time capsule :1351-1352). (2) Whether "make everyone a keeper" was meant to include unproven accounts — the owner's word was about members of the batch; the code that implements it does not ask, while the same commit set kept `startEdition` and the capsule behind Stage 2, which says the author did mean Stage 2 for group-reaching writes. (3) Whether the 2026-09-29 email-gate change (d7a8041d, `email-gate-open.ts`) matters — it loosens Stage 1 for members whose confirmation is still queued; irrelevant here because these doors check no stage at all. (4) Whether idle Editions protect a batch — `openAnswering`/`extendDeadline` call `refuseIfIdle`, so a batch nobody has started is safe until a verified member presses Start; after that, every unconfirmed member of the batch holds the verbs.
Why it is High: the trigger needs nothing but a signup. A stranger who signs up claiming any batch year (no confirmation, no vouching) is enrolled at once, reads that class's People roster with profile links, every published Edition's answers and photographs (the class-private artefact the Class Collection gates on `verifyState === "verified"`), and — the moment a real classmate starts an Edition — can delete the class's questions, open answering early, extend it indefinitely, or close and publish it early with a bell to every member. Changing the batch year moves them to another class instantly. That is wrong behaviour members will meet, at the scale of every batch, not an edge case.
Live check run (read-only, 2026-10-23): `SELECT … FROM "GroupMember" JOIN "User" JOIN "Group" JOIN "CatchupSeries" WHERE status <> 'ended' GROUP BY batch` → batch Catch-ups: **20** live, **397** members, of whom **54 unconfirmed** and **1 confirmed-unvouched**; the one people Catch-up: 23 members, 1 unconfirmed. Running batch Editions: **Batch of 2024, Edition 2, `answering`, answers close 2026-10-25 01:30 UTC**; the 2024 group holds **7 unconfirmed of 44**. Users overall: 572, 86 unconfirmed.
Corrections to the finding: severity Medium → **High**; door 1b wording (immediate move, not "one a night"; old membership now removed, e49e6265); door 3 is LIVE for batch Catch-ups through `allowBatch`; strike the five deleted Keeper actions; live numbers above replace the 2026-09-24 ones (19 unconfirmed, 14 bells). Fix direction: add `requireVerifiedMember()` to every `allowBatch` verb (`curatePrompt`, `openAnswering`, `closeAndPublish`, `extendDeadline`) and to the people-Catch-up Keeper verbs, mirroring `startEdition`; then the owner's membership decision (enrol at confirmation/verification, or gate reading at Stage 1/2 as the Class Collection does). Gate: a `gate-coverage` list asserting every `allowBatch: true` caller also calls `requireVerifiedMember`.
Orchestrator action: none needed to prove it (source + counts). If wanted, a NEW throwaway account signing up as batch 2024 would show the Catch-ups row and the live Edition's Close-and-publish control unconfirmed — DO NOT press it (it would publish a real batch's Edition early).

### L10-02 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `posts.ts:44-63` → the fragment is **:72** (`AUTHOR_IN_GOOD_STANDING = { author: { isBlocked: false } }`, its comment above), `VISIBLE_COMMENT` spread at **:92**; `profile/[id]/page.tsx:133-145` correct (404 at :145, metadata :63-67); `rich-text.ts:126-135` → **:172** (`<a href="/profile/$2" …>`).
What I tried to refute it with: (1) the new mention notifications (1f44f1e9, `mention-notifications.ts:82-86`) — they DO skip blocked and deletion-pending members, but that is the bell, not the rendered link. (2) live exposure.
Why it stands: the fragment still has no `deletionRequestedAt` arm, and mentions still render a static profile link.
Live check run: `SELECT … "deletionRequestedAt" IS NOT NULL` → **1** pending-deletion account (0 posts, 0 comments, 0 Catch-up entries, 0 photographs); 0 blocked; 0 posts or comments carrying an `@[…](…)` mention.
Corrections to the finding: line numbers; L10's Verified-clean bullet "Nobody receives a mention notification" is stale since 1f44f1e9 (cross-zone note).
Orchestrator action: none.

### L10-03 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the mechanism
Citations re-derived: `turnstile.ts:156` correct; fail-open `:201-204` (console at :202) correct; signup `components/auth/actions.ts:31-34` → **:32-33**; reset `email-actions.ts:227-229` → **:245-246**; `forgot-client.tsx:74-91` → **:75-91**; `bot-check-message.ts:10-11` and `:34-36` correct.
What I tried to refute it with: a tokenless reset allowance added since (none: `requestPasswordReset` still refuses without a token); any `no-token` logging (none).
Why it stands: unchanged.
Live check run: none possible.
Corrections to the finding: line numbers.
Orchestrator action: none.

### L10-04 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain on the mechanism
Citations re-derived: `letterhead-profile.tsx:462-476`, `:478-484`, `:490-497` correct; `updateContactMethods` at `profile-actions.ts:275`, the unconditional `user.update` at **:324**; `place-write.ts:54` (`deleteMany` then recreate); `saveOnboardingHouses` in `components/onboarding/actions.ts`.
What I tried to refute it with: a version token added in the profile rework (6c84c602 touched onboarding only) — none; a duplicate (L1.md:166 rates it benign; T6-10 is crafted input) — not a duplicate.
Why it stands: three whole-list writes from local state, no base version.
Live check run: none.
Corrections to the finding: none material.
Orchestrator action: none.

### L10-05 — CONFIRMED (Low, owner decision)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `_dev-login.mjs` default `email = process.env.ADMIN_EMAIL` at **:53** (comment :41-52) correct in substance.
What I tried to refute it with: a demotion since — none.
Why it stands: unchanged.
Live check run: `SELECT role, "verifyState", "batchYear" FROM "User" WHERE email='sanan.shankar@gmail.com'` → `admin`, `verified`, null; 2 admins; its bells now **16, 15 unread** (was 9/7).
Corrections to the finding: the bell count.
Orchestrator action: none.

### L10-06 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `photo-visibility-rule.ts:178-181` still cites "the AuditLog row written at the point of change"; the member's write `profile-actions.ts:160-255` has no `writeAudit` (none in the file); `adminUpdatePerson` → **`admin/people/actions.ts:97-207`**, which calls `syncBatchGroupQuietly` at **:193** and still writes no audit row (the file's six `writeAudit` calls are role, merge, block, delete, verify, unverify).
What I tried to refute it with: a `profile.batch_year` (or any profile) action anywhere in `src` — none; the live table.
Why it stands: the promised second mitigation never shipped, and the batch move is now immediate.
Live check run: `SELECT action, count(*) FROM "AuditLog" GROUP BY 1` → admin.verify 453, retention.sweep 72, account.export 9, account.purge 4, account.email_change 2, admin.unverify 2, account.delete_request 2, admin.block/unblock/delete 1 each, account.delete_cancel 1 — no batch-year action ever.
Corrections to the finding: Actual — "at the next tick they are also in the Batch of 2005's group … still in 2004's (T2a-01)" → "at the moment of the save they move into the Batch of 2005's group and Catch-up and leave 2004's (e49e6265 fixed T2a-01)".
Orchestrator action: none.

### L11-01 — FIXED-SINCE a281e855 (DUPLICATE of L3-08)
Verdict: FIXED-SINCE a281e855 — R2 rejected both CLI tag strategies; the sync now raises the multipart threshold to 5 GB and uses `--copy-props default`, so every copy is a plain CopyObject.
Confidence in verdict: certain
Citations re-derived: `backup.yml` media job now at **:332+**, sync **:391-393** with `aws configure set default.s3.multipart_threshold 5GB` at :390; verify step **:395-416** (still counts); `audit-status.mjs:159-165` (C4 still greps the YAML for "media").
What I tried to refute it with: the task plan names 7f28818c as the fix. It was not sufficient: 7f28818c's `--copy-props metadata-directive` sends `TaggingDirective=REPLACE`, which R2 also rejects, so the scheduled runs of 2026-10-01 and 2026-10-02 FAILED (and per a281e855's message "every photo uploaded in October failed to reach the backup"); a281e855 (2026-10-03) re-fixed it.
Why it falls: `gh run list --workflow=backup.yml`: dispatch 2026-10-03T10:09 success, then **20 consecutive scheduled successes** 2026-10-03 → 2026-10-22. Any object missed on the failed nights is picked up by the next green sync (no `--delete`, skip-if-present).
Live check run: `gh run list --workflow=backup.yml --limit 30` (above). Also `MetricSnapshot` has 21 days of `github` `backup.ok`/`backup.failures_last_10` rows to 2026-10-22, so T7b-01's metric now records.
Corrections to the finding: the fix sha is **a281e855**, not 7f28818c. Two Low residuals of L11-01 that the fix did not touch, for L3-08's canonical entry: (a) the verify step still compares object COUNTS, not key sets (`backup.yml:408-414`, the comparison at :411); (b) security-board C4 still reports green from a YAML grep, not run evidence.
Orchestrator action: correct `task_plan.md`'s "L3-08 / L11-01 photo backup (`7f28818c` …)" to a281e855.

### L11-02 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the mechanism; the legal weight is the owner's
Citations re-derived: privacy `page.tsx:160-170` → **:158-171** ("permanently erased, including the stored image files … Backups age out on their own cycle within a few weeks"); dump prune `backup.yml:171-183` → **:304-326** (`case "$D" in *-01) continue;; esac   # keep monthlies forever` at :321); media sync "NO --delete, ever" `:222-231` → **:369-393**; no `--exclude "staging/*"`.
What I tried to refute it with: whether 4487283b's restore rehearsal or the new `place-<fingerprint>.dump` changed retention (no: the place dump is gazetteer data, never pruned, no member rows); whether any purge reaches `R2_BACKUP_BUCKET` (grep: nothing in `src`/`scripts`).
Why it stands: unchanged; and now that the media copy works again (L11-01), the mirror reliably captures every object present at sync time, staged originals included.
Live check run: recent backup logs: 0 staged originals copied on 10-20, 10-21, 10-22 (quiet nights); the 330 from August/September remain by design.
Corrections to the finding: line numbers.
Orchestrator action: none (owner decision first).

### L11-03 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the mechanism
Citations re-derived: send + success write `email-queue.ts:323-342` → **:333-351**; the catch `:361-369` → **:371-378** (comment :373-376, `reportSwallowed … record-sent` :377); the reclaim `:762-765` → **:779-782**; `mail-policy.ts:313` correct; `render()`'s mint `:581-584` → **:601**; `auth-tokens.ts:46-49, :190-199` correct; `dailyBudget` `:406-410` → **:416-420**.
What I tried to refute it with: a provider-id or sentAt check in the reclaim (none); Resend idempotency key in `sendMail` (none).
Why it stands: unchanged.
Live check run: none possible.
Corrections to the finding: line numbers.
Orchestrator action: none.

### L11-04 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the gate
Citations re-derived: `queueIsSendable` `email-queue.ts:113-124` → **:123-134**; `localDrainRecipient` `mail-policy.ts:282-288` correct; the layout's drain `(main)/layout.tsx:116-122` → **:120-130**; `email.ts:165-182` → the dev guard at **:175**.
What I tried to refute it with: a `VERCEL_ENV` test added to the mail path (the stats gate has it; the mail gate does not).
Why it stands: re-ran the pure half at HEAD: `localDrainRecipient({ NODE_ENV: "production", ADMIN_EMAIL })` → `null`; with `development` → the owner's address.
Live check run: the Node import above.
Corrections to the finding: line numbers.
Orchestrator action: none.

### L11-05 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the code; likely on the vendor side
Citations re-derived: the webhook is unchanged since the audit (`git diff --stat 495ecdd2..HEAD` empty): handled types at `route.ts:104-139`, the ignore at **:143**; member state `email-queue.ts:986` → **:1013** (latest verify row `sent` → "sent"); `verify-email-banner.tsx:217-223, :237` → the states now at **:259-291**.
What I tried to refute it with: c41893f0 ("a bounced confirmation fixes itself") — it adds a `bounced` banner state with "Use another email" (`verify-email-banner.tsx:274-280`), keyed on the LATEST verify row being `failed` with `bouncedAt` (`email-queue.ts:1012-1016`). That makes the finding WORSE, not better: a resend that Resend accepts and then suppresses leaves the latest row `sent`, so the banner flips from "bounced / Use another email" back to "We sent a link / Send it again", and the self-fix door c41893f0 built disappears.
Why it stands: `email.failed` and `email.suppressed` still fall to `ignored`; `delivered` still never clears a "delayed" `lastError`.
Live check run: `OutboundEmail` by status × delivered × providerId × lastError → 610 sent+delivered, 24 sent with no providerId (pre-2026-08-19), 3 failed `Bounced (MailboxFull)`; **0** rows with the ignored-event fingerprint (sent, providerId set, no deliveredAt) — latent.
Corrections to the finding: line numbers; add the c41893f0 interaction to Actual (1).
Orchestrator action: owner check, unchanged: is the Resend webhook subscribed to `email.failed`/`email.suppressed`?

### L11-06 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the mechanism
Citations re-derived: `storage.ts:28-34` correct; `keyForUrl` **:348-358** (`useR2 ? publicBaseFor(url) : null` at :351); `delImage` **:388-390** (`if (!key) return true`); `upload-shared.ts:245-263` → `publicBases` **:282-285**, `publicBaseFor` :292-294; `storage.ts:12` still imports `@/lib/upload-shared`, so `phase8-probe.mjs` still cannot load under plain node.
What I tried to refute it with: a `VERCEL_ENV` refusal or an environment stamp in `runRetentionSweep`/`purgeUserAccount` (none); new laptop sweeps since the audit.
Why it stands: unchanged; exposure unchanged (latent).
Live check run: every `retention.sweep` audit row since 2026-09-20 (34) matches a GitHub run to the second (33 `schedule` + the 2026-09-29 17:17 `workflow_dispatch`) — no laptop sweep since 2026-08-22.
Corrections to the finding: line numbers.
Orchestrator action: none.

### L11-07 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain on the arithmetic
Citations re-derived: `retention.ts:24` (`PURGE_BATCH = 10`), `account-purge.ts:383` (30 s), `:411` (inline drain), `:428-430` (`limit = 500`), `sweep/route.ts:42` (`maxDuration = 300`), `retention.yml:34` (`timeout-minutes: 5`), `:50` (curl with no `--max-time`) — all correct; none of these files changed since the audit.
What I tried to refute it with: a time budget in the sweep (none).
Why it stands: unchanged.
Live check run: none needed.
Corrections to the finding: none.
Orchestrator action: none.

## New candidates

### V-L-b-01 — A bell written after the action's real write has committed is not isolated: when it throws, the member is told the whole action failed, and the retry either undoes the write or silently skips the bell
- Severity: Low
- Confidence: certain on the ordering (read at source); the trigger is one failed `notification.create`/`createMany` (a pool timeout, O-03's condition)
- Where:
  - `src/app/(main)/feed/actions.ts:850-880` — `toggleLike`: `like.deleteMany` → `like.create` → `notifyMemberOnceUnread(...)` with no catch around the notify. A throw rejects the action ("Check your connection", O-04); the client reverts to "not liked" while the row says liked; the member's retry hits the delete-first branch and REMOVES the like.
  - `src/components/posts/report-action.ts:263-274` (`reportPost`) and `:340-354` (`reportUser`) — the report and its thread commit in `fileReport`'s transaction (`:160-175`), then `notifyAdmins` (`admin-threads-server.ts:103-112`, a plain `createMany`) and `writeAudit`. A throw in `notifyAdmins` rejects the action; the retry answers "already reported" (`:247-259`), so that report's admin bell and its `report.*` audit row are never written. (Routed from L12 to L4; L4 finished first.)
  - `src/app/(main)/admin/people/actions.ts:593-629` — `adminVerifyUser`: CAS → `writeAudit` → `notification.create`. A throw in the bell rejects; the admin's retry finds `count === 0` and returns success, so the member is never told they were verified, and the first `revalidateAdmin` is skipped.
  - The Catch-up sibling, `toggleEntryLove` → `notifyLove` inside `runAction` ("Something went wrong" for a saved heart), is already folded into T2a-04 by V-T2.
- Expected: the action's answer describes the primary write; a side effect that cannot be written is reported, not allowed to falsify the answer or be lost on retry.
- Fix direction: wrap each post-commit bell in its own try/catch that calls `reportSwallowed` (or put the bell in the primary write's transaction, as the Catch-up transitions already do), and return the primary write's result regardless.
- Gate: a source pin per site that the notify call is inside a try or the transaction.
- Known-related: L4's lead to T1/T2b/L1 (toggleLike), L12's two leads to L4, T2a-04 (Catch-up instance), O-04.

## Cross-zone notes
- **task_plan.md**: L11-01/L3-08's fix is **a281e855** (2026-10-03), not 7f28818c; the latter failed the 10-01 and 10-02 nights. Residuals for L3-08: count-not-keys verify step; audit-status C4 from YAML.
- **V-T7b (T7b-01)**: `MetricSnapshot` now has 21 days of `github` `backup.ok` / `backup.failures_last_10` rows through 2026-10-22, so the snapshot's GitHub metric records at HEAD (snapshot.mjs touched by e29823cb/91c07fbc); rule T7b-01 FIXED-SINCE against those commits.
- **V-T2 (T2a-*)**: the batch Catch-up's "everyone is a Keeper" (daec81ec) means any rule about Keeper powers in T2a (succession, T2a-09/T2a-13) now has a batch half where every member, unconfirmed included, holds four verbs (L10-01 above).
- **L10's Verified clean** "Nobody receives a mention notification" is stale since 1f44f1e9; the new writer skips blocked and deletion-pending members correctly (`mention-notifications.ts:82-86`).
- **V-T5 / V-O-A**: d7a8041d (`email-gate-open.ts`) now opens the Stage 1 gate for an unconfirmed member whose confirmation has never been sent (still queued) — the owner's rule, but any finding that counts "unconfirmed = Stage 0" (V-O-A's directory oracle, T5-*) should be re-read against it.
- **L9**: `setEditionTimeCapsule`'s comment (`catchups/actions.ts:1358-1360`) says `loadKeeperEdition` "turns a batch away before asking anything else"; since daec81ec it lets a batch in when the caller passes `allowBatch`.

## Coverage
- Checked completely at HEAD 88642426: L4-01..L4-08, L10-01..L10-06, L11-01..L11-07 (21 of 21). Every cited file:line re-derived; moved lines corrected above.
- Read in full or at every cited site: `prisma-errors.ts`, `catchups-core.ts` (guard), `catchups.ts:290-500`, `batch-catchups.ts` (whole), `catchups/actions.ts` (runAction, both Keeper loaders, every exported action's gate marker, curatePrompt, openAnswering, closeAndPublish, extendDeadline, setCatchupKeeper, endCatchup, removeCatchupMember, the capsule gate comment), the five Catch-up pages' catches, `catchups/layout.tsx`, `(main)/layout.tsx` (drain + advance), `member-gate.ts`, `email-gate-open.ts`, `profile-actions.ts:150-262`, `users/search/route.ts`, `last-seen.ts`, `login-attempt.ts`, `audit.ts`, `catchup-reads.ts`, `auth-tokens.ts` sweep, `feed/actions.ts` markFeedSeen + toggleLike, `stats-exclusion.ts`, `report-error.ts`, `auth.ts` sessionReadFailed, `rate-limit.ts:190-320`, `@upstash/ratelimit` limit/applyTimeout, `collection/actions.ts` two catches, the upload routes' catches, `storage.ts` (useR2, readObjectHead, headObjectSize, keyForUrl, delImage), `upload-shared.ts` publicBases + describeProcessingError, `retention.ts` sweep tail, `sweep/route.ts` status rule, `support/actions.ts` startContribution, `razorpay.ts` order creation, `use-user-search.ts`, `people-picker.tsx`, `people-door.tsx`, `turnstile.ts`, `email-actions.ts` reset gate, `posts.ts` fragment, `profile/[id]/page.tsx` 404, `rich-text.ts` mention link, `mention-notifications.ts`, `letterhead-profile.tsx` commits, `admin/people/actions.ts` (adminUpdatePerson, adminVerifyUser, audit sites), `report-action.ts` tails, `admin-threads-server.ts` notifyAdmins, `email-queue.ts` (queueIsSendable, claimAndSend, reclaim, verification state), `mail-policy.ts`, Resend webhook handled types, `verify-email-banner.tsx` states, `backup.yml` (media job, verify, prune), `retention.yml`, `audit-status.mjs` C4, privacy page §Deleting, both drop migrations' headers.
- Live/offline proofs run (all read-only): information_schema for the pending Catch-up columns; `isMissingTable` and `localDrainRecipient` imported in Node; the Upstash timeout probe twice (non-routable host, nonexistent DNS name) with no file written; SELECTs on User, GroupMember×Group×CatchupSeries, CatchupEdition, AuditLog, OutboundEmail, Notification, MetricSnapshot, Post/Comment/CatchupEntry/Photo by deletion-pending authors; `gh run list` for backup.yml and retention.yml; `gh run view --log` for three recent backup runs.
- Not checked: the demo database (owner-deferred); Resend dashboard subscriptions and R2 token scopes (owner facts); whether `reportSwallowed` events survive a cron invocation (needs a production event).

STATUS: COMPLETE at HEAD 88642426
