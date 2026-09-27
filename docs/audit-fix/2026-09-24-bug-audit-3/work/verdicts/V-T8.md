# V-T8 — adversarial validation of T8a (money, demo) and T8b (shell, common components, config)
Validator: V-T8 · Started: 2026-09-24 ~08:38 BST · Model: Opus 5.5
Zone: every finding in `work/reports/T8a.md` (T8a-01 … T8a-18, first run + relaunch addendum) and `work/reports/T8b.md` (T8b-01 … T8b-21, first run + errata + continuation).
Rules kept: read-only; SELECT-only database; no gates; no browser; no sign-in; git only as one read-only `git log -1`/`git status` at the start; scratch under /tmp deleted by the command that made it.

## Summary (for the orchestrator)
39 findings: CONFIRMED 23 · CONFIRMED-CORRECTED 9 · DOWNGRADED 2 · UPGRADED 2 · DUPLICATE 2 · KNOWN 1 · REFUTED 0. One new candidate (V-T8-01).
- Severity changes: T8b-14 Medium → High (reproduced: the session token, city/coordinates and search terms leave on every server error AND every `reportSwallowed` inside a request); T8b-17 Medium → High (the only edit path for a published letter is unusable at the live median length); T8b-04 Medium → Low (feed, comments and bell are client-fetched; only the profile's seeded page and five admin lists hydrate); T8b-05 Medium → Low (the finder's own errata; touch half unproven); T8a-02 stays Medium as the relaunch set it (the ledger still says Low); T8a-03 (High-if-true) folds into T8a-02.
- DUPLICATE / KNOWN: T8a-03 → T8a-02 (Razorpay's docs: an accepted/lost chargeback ends in `lost`; the only `closed`-after-money-left path is T8a-02's fraud refund); T8b-03 → T5-06 (same proxy 307 on an action POST, same fix); T8b-13 KNOWN (bugs.md "guide contents page unreachable").
- Corrections worth reading first: T8b-01's fix direction (the no-deps re-arm covers one site in five; use `details.cancel()` + a deferred re-check); T8b-08's mechanism (Next's source says the root 404 REPLACES the shell rather than nesting a second `<main>`; one look settles it); T8a-02 (the refused refund leaves no trace at all, not "a console line").

## Status board (stub line per id; replaced by the full verdict below as each is finished)

- T8a-01 — CONFIRMED (Low)
- T8a-02 — CONFIRMED-CORRECTED (Medium, confidence possible→likely on event order)
- T8a-03 — DUPLICATE of T8a-02 (premise refuted as written; the real `closed` path is T8a-02's)
- T8a-04 — CONFIRMED-CORRECTED (Low; 'missing', not 'rotated')
- T8a-05 — CONFIRMED (Low)
- T8a-06 — CONFIRMED-CORRECTED (Low)
- T8a-07 — CONFIRMED (Low)
- T8a-08 — CONFIRMED-CORRECTED, partially checked (Low; file under the owner's deferred demo item)
- T8a-09 — CONFIRMED (Low)
- T8a-10 — CONFIRMED (Low)
- T8a-11 — CONFIRMED (Medium) — live
- T8a-12 — CONFIRMED (Medium)
- T8a-13 — CONFIRMED-CORRECTED (Low)
- T8a-14 — CONFIRMED (Low) — live
- T8a-15 — CONFIRMED (Medium)
- T8a-16 — CONFIRMED (Medium)
- T8a-17 — CONFIRMED (Low)
- T8a-18 — CONFIRMED-CORRECTED (Low)
- T8b-01 — CONFIRMED (High) — fix direction ruled: the errata is right; see verdict
- T8b-02 — CONFIRMED (Medium) — the root-boundary face was observed live by the orchestrator
- T8b-03 — DUPLICATE of T5-06 (same root cause and fix; T8b-03's Next trace folds into it)
- T8b-04 — DOWNGRADED to Low (feed posts, comments and the bell are client-fetched; only the profile's seeded first page + five admin lists hydrate)
- T8b-05 — DOWNGRADED to Low (per the finder's own errata); touch half only 'possible'
- T8b-06 — CONFIRMED-CORRECTED (Medium)
- T8b-07 — CONFIRMED (Low) — canonical for 'no global-error.tsx' (T9-04 is an instance)
- T8b-08 — CONFIRMED-CORRECTED (Low) — mechanism likely wrong: the root boundary replaces the shell, it does not nest in it
- T8b-09 — CONFIRMED (Low) — verified live (curl)
- T8b-10 — CONFIRMED (Low) — verified live (curl)
- T8b-11 — CONFIRMED (Low)
- T8b-12 — CONFIRMED (Low, informational) — fold with T1-06 into L5; no standalone fix
- T8b-13 — KNOWN (bugs.md 'guide contents page unreachable') — the two comments ride with that fix
- T8b-14 — UPGRADED to High
- T8b-15 — CONFIRMED (Medium)
- T8b-16 — CONFIRMED (Low)
- T8b-17 — UPGRADED to High
- T8b-18 — CONFIRMED (Low)
- T8b-19 — CONFIRMED (Low) — verified live (curl: 7 hidden elements, no noscript)
- T8b-20 — CONFIRMED-CORRECTED (Low)
- T8b-21 — CONFIRMED (Low)

## Verdicts

### T8a-01 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain
Citations re-derived: `scripts/ops/snapshot.mjs:121-125` (the four subqueries: `give_started` :121, `give_count` :122, `give_paise` :123, `give_people` :124-125) and `:159-172` (the six `contributions.*` metrics; `completion_rate` :170-171) correct; `.github/workflows/snapshot.yml:27` (`- cron: '10 0 * * *'`) and `:81` (`node scripts/ops/snapshot.mjs`) correct; `contribution-state.ts:63-67` and `:76-80` correct; `contribution-state.test.mjs:157-184` correct (sweeps `git grep -l 'prisma.contribution' -- src`); the three-file exclusion test is `:255-264` (the relaunch's correction is right; the first run's `:255-266`/`:257-266` are off by two).
What I tried to refute it with: (1) a reader that charts `db.contributions.*` — none: `loadTrends` (`admin-analytics.ts:37`) is read at `admin/analytics/page.tsx:183,321,662` and the trend keys used (`t("db.members.total")` … `t("db.mail.bounced")`) never include a `contributions.` key; the room's own comment (`page.tsx:65-67`) says the funnel moved to /admin/support; (2) a sweep that reaches `scripts/` — both guard tests are scoped to `src/`; (3) whether the gap is only the exclusion (yes today: `refundedAmount` is 0 on every row, so the whole 552,900-paise gap is the three uncounted givers; a refund would widen it).
Why it stands / falls: the script is raw `pg` and sums `amount` over every live paid row with no `refundedAmount` and no `COUNTED_GIVERS`, so the permanent series records a number no money surface shows. Nothing displays it today, which is why Low is right; the harm is a history table the owner treats as the record diverging silently from the ledger.
Live check run: `SELECT day::text, metric, value FROM "MetricSnapshot" WHERE metric LIKE 'contributions.%' AND day >= '2026-09-21'` → 2026-09-22 and 2026-09-23 rows: `paise` 1,620,000, `people` 10, `count` 10, `started` 32, `completion_rate` 0.3125; against `SELECT sum(amount - "refundedAmount") FILTER (WHERE "userId" IS NULL OR "userId" NOT IN (<the three>)) …` → 1,067,100 net counted, 7 counted people. Matches the finder exactly.
Corrections to the finding: "by a third" is the gap as a share of the snapshot figure (552,900 / 1,620,000 = 34 %); measured against the admin tile the snapshot over-states by 52 %. `contributions.rate` (`give_people / members_total`, :166) inherits the same inclusion and should be in the fix's list. Fix direction and gate stand.
Orchestrator action: none.

### T8a-02 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands, per the relaunch; confidence on the triggering event ORDER is "possible", the mechanism is certain)
Confidence in verdict: likely
Citations re-derived: `route.ts:391-402` (the reversal `updateMany`; the refusing guard is `status: { notIn: [...REVERSED_STATUSES] }` at :394) correct; the won/closed branch opens at :289 and runs to :336 (`unfoldDispute` :302-310, the write :312-323, the audit :328-334 with the text "the chargeback did not stand" at :333); `contribution-state.ts:159-166` correct; `REVERSED_STATUSES` includes "disputed" (`contribution-state.ts:36-39`).
What I tried to refute it with: (1) Razorpay's documentation, read today (public pages only): the disputes guide defines `closed` as "the state when a fraudulent transaction is closed after you provide details of the transaction or make a refund to the customer. This is seen in fraudulent transactions only", and "In the case of fraud, you must refund the amount"; the dispute-webhooks page's `payment.dispute.closed` sample carries `phase: "fraud"`, `amount_deducted: 0`. So a `closed` reached by money LEAVING is documented, and the route unfolds it to "paid". (2) Whether the refund could land AFTER `closed` — in that order the site ends right (closed → paid with 0 refunded → refund.processed folds it to "refunded"). Razorpay emits `refund.processed` only when the refund has actually been processed, which for normal-speed card refunds can be days after the refund is created, and nothing documents when a fraud dispute flips to `closed` relative to that. So the harmful order (refund.processed first) is the natural one but not guaranteed; that is why I hold the trigger at "possible" and the finding at "likely". (3) A console or audit trace of the refused refund — there is none: when `moved.count === 0` the branch writes nothing at all (the only `console.error` in it is the unreadable-amount one at :373-376).
Why it stands / falls: the `notIn: REVERSED_STATUSES` guard was written when a reversal was terminal; C-086 made "disputed" reversible, and a refund arriving on a disputed row is now dropped without a trace while a later `closed` restores the whole gift. The consequence is a permanent public over-count by one gift plus an audit line that says the opposite of what happened. Medium (rare edge, real money figure) is right.
Live check run: `SELECT` counts already in the report (0 reversed rows, 0 `reversalIds`); nothing further possible read-only.
Corrections to the finding: (a) "the only trace is a console line nobody reads" is wrong — the refused path leaves NO trace (no console line, no audit row, 200 returned). (b) Confidence: mechanism certain, the refund-before-closed ORDER possible (see above), overall likely. (c) Fold T8a-03 here (canonical: T8a-02). Fix direction stands; add: when a reversal is refused on a disputed row, the fix should record it rather than drop it (fold into `refundedAmount` and `reversalIds` while keeping "disputed", as the finder says), and the `closed` branch should unfold only the dispute's own paise — which needs the per-reversal paise the docblock at `contribution-state.ts:159-166` already says is missing.
Orchestrator action: none (a mocked-route unit test is the proof; no live payment may be staged).

### T8a-03 — DUPLICATE of T8a-02
Verdict: DUPLICATE of T8a-02 (the premise as written is REFUTED by Razorpay's docs; what survives is T8a-02's path)
Confidence in verdict: certain
Citations re-derived: `route.ts:172-174` (the two events in `acted`) and `:289-336` (handled identically) correct; the comment is `:165-171`; the test pin of "`closed` handled, `lost` ignored" is `contribution-state.test.mjs:232-244` (the `lost` assertion at :242).
What I tried to refute it with: Razorpay's "Accept a Dispute" API page, read today: "The dispute status will change from `open` to `lost`", sample `status: "lost"`, `amount_deducted: 10000`. So an accepted or lost chargeback ends in `lost` (which the route rightly ignores), never `closed`.
Why it stands / falls: "a lost or accepted chargeback is counted as given via `closed`" does not happen. The one documented way `closed` coincides with money leaving is a fraud dispute settled by a refund, which is exactly T8a-02's sequence. The High-if-true severity falls with the premise.
Live check run: none needed (documentation).
Corrections to the finding: fold into T8a-02; the comment at `route.ts:165-171` ("`closed` is Razorpay's terminal event for the same outcome when no explicit win arrives") should be rewritten with the guide's definition as part of T8a-02's fix.
Orchestrator action: none.

### T8a-04 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; the title's "or rotated" is wrong)
Confidence in verdict: certain
Citations re-derived: `route.ts:97-108` (unconfigured → 500 with the "the moment … is set … a retry of this same event records it" comment at :98-102) correct; `:110-124` (the M59 premise) correct; `razorpay.ts:138-140` correct; `verifyWebhookSignature` is `razorpay.ts:152-161` (`!secret` → "unconfigured" at :157; a wrong secret → "mismatch" at :160).
What I tried to refute it with: (1) the verdict function: only a MISSING secret produces "unconfigured"/500; a ROTATED (wrong) secret produces "mismatch" and is answered 200 — that is T8a-15, not this finding; (2) Razorpay's webhook FAQ (read today): a non-2xx is retried with exponential backoff for 24 hours after the event, then the webhook is disabled and the Alert Email Address is mailed; re-enabling is manual, and the FAQ does not say missed events are resent; (3) an env-presence check anywhere — none (`RAZORPAY_WEBHOOK_SECRET` is read only at `razorpay.ts:156`; README.md:56 lists it).
Why it stands / falls: the two comments promise recovery "the moment" the secret is set; that holds only for events under 24 hours old, and a longer gap leaves a disabled webhook that must be switched back on by hand. Razorpay does email, so "no signal on our side" is too strong, as the relaunch says. An operator-error scenario with a vendor alarm behind it: Low.
Live check run: none possible.
Corrections to the finding: title → "While RAZORPAY_WEBHOOK_SECRET is missing, the route answers 500 to every event; the comment's promise that setting it later recovers them holds only inside Razorpay's 24-hour retry window". The rotated case belongs to T8a-15. Fix direction: the env-presence check and the two comment rewrites; the "last webhook seen" admin line is optional.
Orchestrator action: none.

### T8a-05 — CONFIRMED
Verdict: CONFIRMED (Low stands; comment accuracy)
Confidence in verdict: certain
Citations re-derived: `support/actions.ts:232-239` (the comment, "the first click spends the grant and the second is refused" at :237-238), `:254-263` (the parallel read), `:274-287` (the fresh-contribution check), `:290-293` (unconditional `user.update`) all correct.
What I tried to refute it with: (1) the client: `bird-picker.tsx:47-48` refuses while `pending` (a `useTransition` flag), so one tab cannot double-fire; two tabs, or a replayed action POST, can; (2) a unique or conditional write — none; (3) a consumable the race could mint — none: a second write only re-stamps `birdPickedAt` and possibly replaces the slug.
Why it stands / falls: under concurrency both calls pass the gate and both write; the last write wins. Nothing is gained (the grant cannot be multiplied), so the only defect is a comment that states a guarantee the code does not make, plus (two tabs) a first tab that toasts "You are now the X" while the row ends as Y.
Live check run: none needed.
Corrections to the finding: none.
Orchestrator action: none.

### T8a-06 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `support/page.tsx:40-46` (`.catch(() => 0)` at :46) and `:52-57` (`.catch(() => null)` at :56) correct; the comment calling the zero deliberate is `:33-39`; `pick-bird/page.tsx:30-40` (C-155's reasoning) correct.
What I tried to refute it with: what the member actually sees at `recoveredPaise = 0` — `costs-card.tsx:106` `fundPct = 0`, the bar draws its 12px zero-state circle (`:165`) and `aria-valuenow` 0; no rupee figure is printed anywhere on the section (by design, `:13-16`). The page is under the (main) error boundary, so letting the read throw would show "Something went wrong" with "Go to the feed" (but see T8b-15 for its "Try again").
Why it stands / falls: a pool timeout paints a confident "nothing recovered yet" bar on the public support page and hides the admission-number chip, with no sign of failure; the same file's neighbour (/pick-bird) was fixed for exactly this conflation. Cosmetic-with-teeth: Low.
Live check run: none possible (needs a database failure).
Corrections to the finding: the title's "₹0 recovered" is a paraphrase — no ₹ figure is shown; the bar sits at its zero-state circle and a screen reader hears 0 %. L4 may list the same two lines; if so, one entry (this one carries the member-visible consequence).
Orchestrator action: none.

### T8a-07 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain
Citations re-derived: `api/account/export/route.ts:282-297` (the `contributions` entry; the select at :286-294 names `id, amount, currency, status, method, createdAt, paidAt`) correct; demo refusal `:81-86`.
What I tried to refute it with: another export section that carries the refund (none), and live exposure — `refundedAmount` is 0 on every row today, so no member's export is wrong yet; the first partial refund makes one wrong.
Why it stands / falls: the export's own promise (`:8-20`, "contribution records") and the schema's "every money sum reads amount MINUS this" disagree with a select that omits the column; the member's own order/payment ids are missing too. Low.
Live check run: none needed (read of the select).
Corrections to the finding: none. Cross-zone: ship with T6-03's export fix (same file, same "a copy of your data" promise).
Orchestrator action: none.

### T8a-08 — CONFIRMED-CORRECTED (partially checked)
Verdict: CONFIRMED-CORRECTED (Low stands), partially checked
Confidence in verdict: likely
Citations re-derived: `docs/planning/bugs.md:535-546` (the "demo database is healthy … 40 seeded people" sentence at :537-539) correct; `seed.ts:93-538` (the transaction; the Place write at :212-215) correct; `reset/route.ts:105-126` correct; `verify-guard.mts:135-147` correct — NOTE it does COUNT `posts` and `photos` (:135-140) and PRINTS them (:141), but fails only on `hacked !== 0 || users !== 40` (:142); the migrations the relaunch leans on exist (`prisma/migrations-manual/2026-08-27-drop-group-invite.sql`, `2026-08-27-drop-avatar-color.sql`, `2026-08-30-photo-exif-date.sql`).
What I tried to refute it with: I could not re-run the demo-database SELECTs: the permission system denies this session any access to `.env.demo` (the first `ls` was refused by a deny rule), and I did not try to route around it. I did not use git (the orchestrator's rule), so the relaunch's archaeology (`369f4a41^`'s `groupInvite.deleteMany`, `c6cc3392^`'s `avatarColor` select) is unverified by me. What I could check is consistent: the current seed writes Place inside the one transaction, the two drop migrations exist, and verify-guard's pass condition ignores content.
Why it stands / falls: the finding corrects a record in the dedup baseline's own deferred item ("THE PUBLIC DEMO 500s ON EVERY DATA ROUTE") — bugs.md says the data is healthy and the fault is the deployment; T8a says both are broken and explains why. Nothing here needs fixing before the owner returns to the demo, so it should be filed as a correction under that deferred item, not as its own fix unit.
Live check run: refused (see above).
Corrections to the finding: "checks `users === 40` and nothing about content" → "counts and prints posts and photos but asserts only on users and the 'Hacked' rename" (so a human reading the output would have seen `0 posts, 0 photos`). Fix direction stands (redeploy → exif migration → seed → content asserts in verify-guard → correct bugs.md:537-539 and TRAPS.md:50).
Orchestrator action: if the demo's state matters to the report, re-run the finder's counts with `node scripts/dev/run-sql.mjs --env .env.demo --inline "SELECT (SELECT count(*) FROM \"Post\"), (SELECT count(*) FROM \"User\"), (SELECT count(*) FROM \"Photo\")"` from the orchestrator's session.

### T8a-09 — CONFIRMED
Verdict: CONFIRMED (Low stands; posture/test gap)
Confidence in verdict: certain
Citations re-derived: `src/proxy.ts:78-83` (`DEMO_CLOSED_APIS`) correct; `demo.ts:297-316` and `demo.test.mjs:221-236` correct; `support/actions.ts:58, 155, 244` (the three `IS_DEMO` sentences) correct; `:99-110` (`createOrder` before the row) correct.
What I tried to refute it with: a test naming the support actions or the API list — `grep -n "DEMO_CLOSED_APIS\|startContribution\|confirmContribution\|chooseBird\|support" src/lib/demo.test.mjs` → nothing. Without its sentence, `startContribution` on the demo would reach `createOrder` → `credentials()` throws (no keys) → caught → "We could not reach the payment gateway": safe today by configuration, not by code.
Why it stands / falls: layer 1's API list has no twin and no test, and the money path is one where layer 3 (Prisma) is not independently sufficient because the vendor call precedes the row. Low.
Live check run: none needed.
Corrections to the finding: none.
Orchestrator action: none.

### T8a-10 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain
Citations re-derived: `verify-guard.mts:142` and `people.ts:630` correct; `DEMO_PEOPLE` holds 39 entries + `DEMO_VISITOR` = 40 today (counted from the source).
What I tried to refute it with: an import of the seed's own count — none; the literal 40 is the only reference.
Why it stands / falls: adding or removing one invented person makes the live proof script print "DAMAGE" with nothing let through. Low.
Live check run: none needed.
Corrections to the finding: none.
Orchestrator action: none.

### T8a-11 — CONFIRMED
Verdict: CONFIRMED (Medium stands) — reproduced live by this validator
Confidence in verdict: certain
Citations re-derived: `route.ts:231-236`, `:237-240`, `:258-271` (bell created when `moved.count === 1`, `link: "/pick-bird"`) correct; `pick-bird/page.tsx:63-77` (`redirect("/support")` at :76) correct; `notification-bell.tsx:255-272` (`handleClickNotification` → `router.push(notif.link)`) correct; `support/actions.ts:290-293` correct; `grep -rn contribution_received src` → only `route.ts:263` and `notification-bell.tsx:104`; the stale comment `pick-bird/page.tsx:18-19` against `support-shell.tsx:106-110` and the admin-only button at `support/page.tsx:68-72` correct.
What I tried to refute it with: (1) whether the four bells could be the tab-died case the bell exists for — for the two unread ones the payer picked 48 s and 52 s after paying without opening the bell, which only the client redirect explains; (2) whether the callback EVER wins — yes, historically: the two 2026-08-22 payments have `method` filled (only the webhook writes `method`) and no bell, so there the callback won and the webhook back-filled; since 2026-08-30 the webhook has won 4 of 4; (3) anything clearing the bell on pick — nothing.
Why it stands / falls: the comment's "ordinary case" is the reverse of what production now measures; every recent supporter holds a bell whose link bounces them, after they picked, to the page that asks them to pay. Medium.
Live check run: `SELECT n."createdAt"::text, c."paidAt"::text, u."birdPickedAt"::text, n.read, … FROM "Notification" n JOIN "User" u … JOIN "Contribution" c … WHERE n.type='contribution_received'` → 4 rows: bell 8 / 76 / 29 / 22 ms after `paidAt`; pick 69 / 150 / 48 / 52 s after; read = true, true, false, false; none of the four has a photo. And every paid row: the 2026-08-22 pair has `method = upi`, 0 bells, picks 67 s and ~2 h later.
Corrections to the finding: none of substance (the orchestrator's "20–30 ms" is two of the four; the full range is 8–76 ms, as the finder wrote).
Orchestrator action: none.

### T8a-12 — CONFIRMED
Verdict: CONFIRMED (Medium stands)
Confidence in verdict: certain on the mechanism; the double charge needs the member to act on the red sentence
Citations re-derived: `support/actions.ts:153-154` correct; `support-contribute.tsx:221-243` correct — the throw branch is :228-238, the `{ error }` branch `setWorking(false); toast.error(confirmed.error)` is :239-242 (the orchestrator's 237-241 is off by two); the comment :222-226 correct; `auth.ts:368-393` (session callback's `findUnique`) and `:520-524` (`guardedSession`) correct.
What I tried to refute it with: (1) whether a throw in the session callback really yields `null` from `auth()` in a server action: `@auth/core/lib/actions/session.js` catches it, logs `JWTSessionError` and leaves `body: null`; `next-auth/lib/index.js` `getSession(...).then(parseSessionResponse)` returns that null; `guardedSession` returns null → "Not authenticated". Confirmed. (2) Whether the webhook still records the payment — yes (its HMAC does not depend on the session), so the first payment is safe and the risk is the second one. (3) Whether the button is really live — `setWorking(false)` re-enables `disabled={!amountValid || working}` (:392).
Why it stands / falls: after the money has moved, a session read that times out (O-03/T5-17) or a revoked cookie makes the page say "Not authenticated" in red and hand back a live "Contribute" button; the handler's own comment names this as the outcome to avoid. Medium.
Live check run: none possible (needs a pool timeout mid-checkout).
Corrections to the finding: line numbers above. Fix direction stands; both halves are compatible with T5-17's `SessionUnavailable`.
Orchestrator action: none.

### T8a-13 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; the window is narrower than the title)
Confidence in verdict: likely
Citations re-derived: `support-contribute.tsx:263-266`, `:140-143`, `:249-250`, `:392` correct.
What I tried to refute it with: the Razorpay Standard Checkout overlay covers the whole viewport while it is open, so the re-enabled button cannot be clicked during the failed attempt or the retry; it is exposed only after the window closes on success, for the `confirmContribution` round trip and the client navigation. In that window the member has just seen Razorpay's own success screen, which makes a second click less likely than the title suggests.
Why it stands / falls: the state's own contract (:140-143) is broken by a `setWorking(false)` on a non-terminal event; the exposure is a sub-second-to-few-second window after success. Low.
Live check run: none possible.
Corrections to the finding: title → "…the Contribute button is live again for the confirm round trip after a successful retry (the Razorpay overlay covers it until then)". Fix direction stands.
Orchestrator action: none.

### T8a-14 — CONFIRMED
Verdict: CONFIRMED (Low stands) — reproduced live
Confidence in verdict: certain
Citations re-derived: `admin/support/page.tsx:143-145`, `:182`, `:203-206` correct; the page's own caption at `:195-198` does say the four tiles read "the hundred most recent payments" — but the sentence and the Users icons say "people".
What I tried to refute it with: whether the window's rows are distinct people — they are not.
Why it stands / falls: the funnel sentence counts rows and calls them people, and a reversed row stays in the denominator while leaving the numerator. Admin-only: Low.
Live check run: 100-row window, live, counted givers → 11 rows, 7 paid, 9 distinct people, 2 distinct people among the unfinished, both with no paid row (so "4 of 11 people" should read "2 of 9").
Corrections to the finding: none.
Orchestrator action: none.

### T8a-15 — CONFIRMED
Verdict: CONFIRMED (Medium stands) — a known item fixed on a false premise (bug audit 1 M59; audit 2 re-affirmed it as "intact", bug-report-2.md:660)
Confidence in verdict: certain
Citations re-derived: `route.ts:110-128` (premise :111-119, `return NextResponse.json({ received: true })` :127) correct; `razorpay.ts:141-142` correct; `REJECTION_NOTE_GAP_MS` `:35` correct; the tests: `grep -rln razorpay src --include='*.test.mjs'` → admin-rule, contribution-state, security-regressions; none asserts the signature branch's status (security-regressions names razorpay.com only in the CSP test at :156-164).
What I tried to refute it with: Razorpay's webhook FAQ, read today: "Every event that receives a non-2xx response is considered an event delivery failure", retried "in exponential backoff policy 24 hours after event creation timestamp", then "the webhook is disabled" with a mail to the Alert Email Address. Razorpay counts only its own deliveries; nothing a stranger's POST is answered with reaches that count. So M59's premise cannot hold, and the 2xx silences exactly the wrong-secret case. The one remaining signal is the hourly `razorpay.webhook_rejected` audit line.
Why it stands / falls: a wrong secret (rotation, a recreated webhook) turns every real delivery into a 200-acknowledged drop: tab-died payments, refunds, disputes and the method backfill vanish with Razorpay believing them delivered, and fixing the secret recovers none of them. Latent today (four verified deliveries, no rejection rows), Medium.
Live check run: none needed (documentation + source).
Corrections to the finding: none.
Orchestrator action: none.

### T8a-16 — CONFIRMED
Verdict: CONFIRMED (Medium stands)
Confidence in verdict: certain
Citations re-derived: `bird-avatar.tsx:10-12` (precedence doc) and `:90` (`if (user.photoUrl) {`) correct; `bird-picker.tsx:171-173` (the promise at :173), `:55` (toast), `:63-64` correct; `pick-bird/page.tsx:48-51, 80-88` correct; `support/actions.ts:290-293` correct. T8b's lead answer (three places encode photo-first: `bird-avatar.tsx:90`, `contactPhotoSrc` `:46-47`, `letterhead-profile.tsx:362/765/795`) re-checked by grep: correct.
What I tried to refute it with: any identity surface that draws the bird despite a photo — none (every avatar goes through `BirdAvatar`, and the letterhead draws `PerchedBird` only when `!hasPhoto`).
Why it stands / falls: a member with a photo pays, spends the one pick, is told "This becomes your avatar everywhere on the site", and nothing changes anywhere. Not yet hit (0 payers have a photo), but 13 of 224 members do. Medium (a paid promise broken for an identifiable group) is right.
Live check run: `SELECT` → 13 of 224 members with `photoUrl`; 0 paid payers with a photo; 0 members holding both a `birdOverride` and a photo.
Corrections to the finding: none.
Orchestrator action: none.

### T8a-17 — CONFIRMED
Verdict: CONFIRMED (Low stands; demo-only)
Confidence in verdict: certain
Citations re-derived: `demo-bar.tsx:65-78` (the response is never read; only a network rejection reaches the catch at :75-77) correct; `reset/route.ts:92-99` (500 "Reset failed") correct.
What I tried to refute it with: a status check elsewhere (none); the throttled 200 `{ ok, throttled }` (:84-89) is correctly a success.
Why it stands / falls: a failed reset reloads the same world with no word. Demo deferred by the owner: Low.
Live check run: none.
Corrections to the finding: none.
Orchestrator action: none.

### T8a-18 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived: `costs-card.tsx:1` (`"use client"`), `:34-36` (`BUILD_COST_PAISE = 400000 * 100`), `:13-16`, `:151-153` correct; the computation is `:106` (`fundPct = Math.min(100, (recoveredPaise / BUILD_COST_PAISE) * 100)`); `support/page.tsx:61` correct.
What I tried to refute it with: whether only the percentage reaches the browser — no: `recoveredPaise` is a prop of a client component, so it is serialised into the RSC payload, and the constant ships in the client chunk. Also, the unrounded percentage is written into the DOM as an inline style (`width: max(<fundPct>%, 12px)`, :165), so even after the finder's fix a full-precision percentage would let anyone who knows the build cost recover the total — hence the finder's "round it" is load-bearing, not optional.
Why it stands / falls: the page's own comments say neither figure is published; both are, to any member with devtools. No member data; intent only. Low.
Live check run: none needed.
Corrections to the finding: fix direction — compute the percentage on the server AND round it (whole percent) before it reaches the inline style; keep `BUILD_COST_PAISE` in a server module.
Orchestrator action: none.

### T8b-01 — CONFIRMED
Verdict: CONFIRMED (High stands; canonical for T4b-02). Fix direction ruled below.
Confidence in verdict: certain (mechanism, read end to end); the orchestrator already confirmed it at source
Citations re-derived: `ui/dialog.tsx:15-29` (the wrapper; `useBackCloses(open ?? uncontrolledOpen, () => actions.current?.close())` at :20; the comment promising "a dialog that refuses to close mid-save keeps refusing" at :11-14); `back-closes.ts:172` (the `closing` filter), `:179-182` (splice, then `l.close()`), `:194-201` (`release`, `i === -1` return at :196), `:215-223` (the `[open]` effect — the errata's line numbers are right, the first run's 214-222 were off by one). Refusal sites: `confirm-dialog.tsx:71-75` (bound at :98), `edit-photo-dialog.tsx:142`, `contribute-room.tsx:225-237` (refusal :230-233), `avatar-crop-dialog.tsx:269-273`, `moderation-dialog.tsx:59-66` (bound at :66) — all correct.
What I tried to refute it with: (1) whether Base UI re-renders the Dialog on a refused controlled close — `DialogStore.setOpen` (`@base-ui/react/esm/dialog/store/DialogStore.js:30-61`) calls `onOpenChange`, then `update({ open: false })`, but the `open` selector is `state.openProp ?? state.open` (`utils/popups/store.js:30`), so a controlled `open={true}` keeps the selected value unchanged and nothing subscribed re-renders; the wrapper's `setUncontrolledOpen(false)` is a same-value bail-out for a controlled dialog. So the errata is right: of the five refusals only `contribute-room` re-renders (its `setLeaving(true)`); the other four return while a busy flag that is already set. (2) `land()` re-pushing — it re-pushes only layers still in the stack with `pushed === false`, and `onPop` has already spliced the refused layer out, so nothing re-arms it. (3) Whether the four busy refusals are harmless in practice — mostly: when the save then SUCCEEDS the caller closes the dialog and `release()` finds nothing to rewind, so history ends consistent; the hole bites when the member presses Back twice during the save, or once during a save that then FAILS (the dialog stays open with no entry and the next Back leaves the page, taking the typed edits). The contribute room (T4b-02) is the serious one: Back → "Discard N?" → Cancel → Back leaves the page with photographs still climbing, and `use-leave-guard.ts` listens only for `beforeunload`, so nothing asks.
Why it stands / falls: the primitive consumes the history entry before the caller has decided, and a refusal never gives it back. High stands on the contribute room.
Live check run: none possible (browser). T4b-02's reproduction is the orchestrator's.
Corrections to the finding: FIX DIRECTION, ruled. The first run's "effect with no deps that re-pushes on the refusal's re-render" covers one site in five and must not be shipped alone. What covers all five: (a) in `onPop`, do not splice — mark the layer `pushed = false`, keep it in the stack, call `l.close()`; (b) decide "refused" without depending on a re-render. Two workable ways, and I would do both: (i) the synchronous one — have the five refusing sites refuse through Base UI's own API (`details.cancel()` inside `onOpenChange`), and in `useBackClosableRoot` read `details.isCanceled` right after the caller's `onOpenChange` returns; a cancelled back-close re-pushes the layer's entry at once; (ii) the belt for any future refuser that just ignores the close — a deferred re-check (a short timer, not `setTimeout(0)`: an update scheduled from a non-React `popstate` is rendered by React's scheduler on its own macrotask, which can land after a 0 ms timer) that re-pushes if the layer is still in the stack and still open. A late accept after a re-push is self-healing, because `release()` then finds `pushed === true` and rewinds the entry. Keep `release()`'s `i === -1` guard for layers that really were removed. Gate as the finder wrote (a fake-history unit test for both the refused and the accepted paths) plus a test that the five sites call `details.cancel()`.
Orchestrator action: T4b-02's live reproduction covers it.

### T8b-02 — CONFIRMED
Verdict: CONFIRMED (Medium stands)
Confidence in verdict: certain
Citations re-derived: `(main)/layout.tsx:26` (`await auth()`), `:28-38` (the redirect, `redirect(...)` at :37), `:83-103` (the four-way `Promise.all`), the inline `catchup.findFirst` at :98-101; `notification-count.ts:14-18` (no catch); `email-queue.ts:963` onward (`verificationMailState`, no catch); `catchups.ts:526-533` (the swallow + `reportSwallowed`); `src/app/error.tsx` (root) and `src/app/(main)/error.tsx:16-19` (its own comment: it sits INSIDE the (main) layout) correct.
What I tried to refute it with: a catch on the three helpers (none), a boundary between the root and the (main) layout (none — `(main)/error.tsx` wraps the layout's children, so a throw in the layout itself reaches the root boundary). The orchestrator's live event at 02:33 BST is this finding's middle face exactly: the copy it recorded, "Something went wrong. We hit an unexpected error. Please try again. If the problem persists, let an admin know.", is the ROOT boundary's text (`src/app/error.tsx:17-23`), not the (main) one's ("This page did not load"), with `timeout exceeded when trying to connect` thrown from `<MainLayout>`.
Why it stands / falls: one pool timeout in a non-essential sidebar/badge read throws the whole shell away to a full-screen apology with no navigation; the same cause in `auth()` signs the member out (O-03); the same cause in the page keeps the shell. Medium, with the fix shared with O-03/T5-17.
Live check run: none by me; the orchestrator's live observation above is the proof of the root-boundary face.
Corrections to the finding: the "Live" proof can cite the orchestrator's 02:33 BST event instead of a staged outage. Pair the fix with T8b-15 (the root boundary's button does nothing).
Orchestrator action: none further.

### T8b-03 — DUPLICATE of T5-06
Verdict: DUPLICATE of T5-06 (canonical: T5-06 — it carries the member-facing consequence, the lost-draft half and the `callAction` mapping; T8b-03 is the same root cause traced through Next and should be merged into it)
Confidence in verdict: certain
Citations re-derived: `proxy.ts:304-326` (the page redirect at :325, `/api` 401 at :315-317) correct; `action-handler.js:128` (`createForwardedActionResponse`), `:199` (`redirect: 'manual'`), `:205` (RSC content-type check), `:215-220` (the action-not-found pass-through), `:227` (`fromStatic('{}', JSON)`), `:494-508` (forwarding when `selectWorkerForForwarding` finds another worker) — all as the finder says.
What I tried to refute it with: I did not re-run the cookieless POST (the rules allow GETs only); the source trace holds. Both findings name the same fix: the proxy must answer a `next-action` POST without a cookie with something the client router understands, and `callAction` must map it to a sign-in sentence.
Why it stands / falls: same root cause (proxy 307 on an action POST), same trigger (absent cookie), same fix. T8b-03's added value — the three invocations per attempt and the `x-action-redirect` / `401 text/plain` options — belongs in T5-06's fix direction.
Live check run: none (POST not permitted to validators).
Corrections to the finding: merge into T5-06; keep T8b-03's option (1) (`303` + `x-action-redirect: /login?next=…`) as the preferred implementation, since it makes the client hard-navigate to sign-in exactly as a thrown `redirect()` would.
Orchestrator action: none.

### T8b-04 — DOWNGRADED to Low
Verdict: DOWNGRADED to Low (the member-facing reach is one surface, not "any feed")
Confidence in verdict: certain on which sites hydrate; likely on the mismatch itself
Citations re-derived: `utils.ts:73-109` (`formatTimeAgo` reads `new Date()`) correct; the thirteen call sites are as listed (grep), with the errata's eighth client site (`conversation.tsx:88` via the client `admin/messages/thread-view.tsx:86`) confirmed.
What I tried to refute it with: which callers are server-rendered on first load and then hydrated.
- NOT hydration sites (fetched on the client after mount, so the first client render is the empty/skeleton state): the FEED (`post-feed.tsx:38,45` — `posts` starts `[]`, `loading` true, `loadPosts` runs in an effect); ALL COMMENTS (`comments-section.tsx:164-165` — `comments` starts `[]`, loaded in an effect, and the three mounts are post-card, letter-engagement, reader-parts); the BELL (`notification-bell.tsx:116,218` — `getNotifications` on open); SAVED POSTS (`saved-posts-feed.tsx:125-127`).
- ARE hydration sites: `post-card.tsx:406` ONLY via the profile page, whose "all" tab is seeded server-side (`profile/[id]/page.tsx:435` `initialAuthorPosts` → `letterhead-profile.tsx:1940` → `profile-author-feed.tsx:67-68`); and five admin-only lists, each a client component fed server rows: `content-list.tsx:180` (/admin/content), `mail-rows.tsx:111` (/admin/mail), `review-room.tsx:651` (/admin/review), `report-list.tsx:88` (/admin/reports), `conversation.tsx:88` inside `thread-view.tsx` (/admin/messages/[id]). The server-only callers (`admin/audit`, `admin/(index)`, both `thread-list.tsx`, `messages/[id]`'s `Conversation`) are safe; `admin/analytics/presence.tsx`'s own "Xm ago" helper is in a server component, safe.
Why it stands / falls: the mechanism is real (a relative time computed on two clocks), but a member can only meet it on a profile page whose owner posted within the last hour or so (the chance per load is roughly the SSR-to-hydration gap, plus any clock skew, over the unit length), and the consequence is a client re-render of the nearest Suspense boundary, not wrong data. The rest is admin-only. Low.
Live check run: none possible read-only.
Corrections to the finding: severity Low; "Where" narrowed to the six sites above; the gate should target server-seeded lists (a `now` prop from the server, or `suppressHydrationWarning` on the element that directly holds the text), not every `"use client"` caller — a blanket rule would flag the feed, comments and bell, which cannot mismatch.
Orchestrator action: optional — a profile of an account that posted within the last minute, reloaded at second :58-:59, and `grep "Hydration failed" .next/dev/logs/next-development.log`.

### T8b-05 — DOWNGRADED to Low
Verdict: DOWNGRADED to Low (as the finder's own errata already did); the touch half is only "possible"
Confidence in verdict: likely for the desktop half; possible for the Android first-tap claim
Citations re-derived: `info-tooltip.tsx:49-58` (the three handlers at :52-54; `<Popover open={open} onOpenChange={setOpen}>` at :49), `:60-63` (`sideOffset={6}`, content mouse handlers) correct; the only consumer is `float-field.tsx:283-285` (lazy), used by the Collection description only (`photo-questions.tsx:159-171`), as the errata says; the header's "settings' batch-year note" is a stale comment.
What I tried to refute it with: the finder missed that Base UI's `PopoverTrigger` toggles on click ITSELF (`floating-ui-react/hooks/useClick.js:79-104`), in addition to the component's own `onClick`; `mergeProps` runs the rightmost handler first (`merge-props/mergeProps.js` header), so the component's toggle runs, then Base UI's. Desktop: after a hover-open (committed long before the click) both handlers compute "close" — so a click on the (i) after hovering CLOSES the note (certain from the code). Android: the tap's compatibility `mouseover` sets `open` at React's continuous priority, which is normally still unrendered when the `click` handlers run in the same task; Base UI then reads the store as closed and opens, the component's toggle also flips closed→open, so by my reading the first tap OPENS. The finder's "opens and closes in the same gesture" needs the hover update to have committed before the click, which React 19's lane ordering makes unlikely. I cannot settle it without a device.
Why it stands / falls: the component wires three open/close channels to one state with no pointer-type split, and the desktop hover-then-click-closes behaviour is certain; the touch failure is not established. One field, one hint: Low.
Live check run: none (browser).
Corrections to the finding: severity Low; replace the Android claim with "unverified; possibly opens on first tap"; add the certain desktop defect (hover opens, click closes). Fix direction stands (split by `pointerType`, or use the Popover's own `openOnHover`), and should also drop the component's own `onClick`, since Base UI already toggles.
Orchestrator action: chrome-devtools touch emulation as Jerry on any photograph's Edit dialog (no save): tap the (i) beside the description once, screenshot, tap again.

### T8b-06 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands; items 1–5 are hard contradictions, 6–8 are completeness, and one item is missing)
Confidence in verdict: certain for items 1–5
Citations re-derived: privacy page `:99`, `:160`, `:177-178` ("settings") correct — there is no settings route (`find src/app -path "*settings*"` → nothing; `auth.ts:285` and `sidebar.tsx:557-561` say so); `:168-169` (reports outlive deletion) against T7a-01 (orchestrator-confirmed); `:145-154` the table (no Visit/SearchLog/ContentView row); `:63-66`, `:129-130`, `:189-192` as quoted; `retention.ts:28-77` (`KEEP_DAYS`, `presence: 90` at :77) and the step list `:116-132` (no ContentView step) correct; `schema.prisma:1598-1628` ContentView (`@@unique([viewerId, kind, targetId])` at :1621, cascade at :1618) correct.
What I tried to refute it with: (1) a /settings page or redirect — none; (2) a ContentView step anywhere in the sweep — none (`retention.ts:70-71` itself calls ContentView "a bounded counter", bounded per target, not in time); (3) the Visit columns today — the 2026-08-27 migration dropped Visit lat/lng/timezone, but `country`, `city`, `region`, device/os/browser, language, referrer and the 40-stop `paths` trail remain (`schema.prisma:1497-1540`), so item 6 stands.
Why it stands / falls: items 1–5 are sentences a member or a regulator would read as promises the code does not keep; item 8 (cookie list) and item 7 (Vercel "United States" / Cloudflare "images") are disclosure completeness, weaker but cheap. Medium for a legal document with a UK controller.
Live check run: `SELECT count(*), min("firstAt")::text, count(*) FILTER (WHERE "lastAt" < now() - interval '90 days') FROM "ContentView"` → 1,086 rows, oldest first view 2026-08-19, 0 rows older than 90 days.
Corrections to the finding: (a) the proof line "shows rows older than every window on the table" is wrong today — the oldest ContentView row is ~36 days old; the point is that nothing will EVER remove one, not that any is already over a window. (b) Add a ninth item: the page lists Sentry for "Error reporting" only, while every server error ships the member's session cookie, city, coordinates and search terms there (T8b-14) — and the owner removed Visit coordinates on 2026-08-27 on data-minimisation grounds (`prisma/migrations-manual/2026-08-27-drop-visit-geolocation.sql`), so the Sentry path contradicts a decision as well as the page. (c) Canonical for "the privacy page as a contract"; T5-01, T6-03, T7a-01 are the code-side counterparts and should be linked, not merged.
Orchestrator action: none.

### T8b-07 — CONFIRMED
Verdict: CONFIRMED (Low stands), with both errata
Confidence in verdict: certain
Citations re-derived: `src/app/layout.tsx:90-107` (the providers and `MascotFlightLayer`/`Toaster` inside `<body>`, outside any boundary) correct; no `src/app/global-error.tsx` (checked); neither `error.tsx` reads `error` or reports; `instrumentation.ts:11-17, 84-86` correct; `LazyMotion`'s async branch is `features().then(...)` with no catch (`framer-motion/dist/es/components/LazyMotion/index.mjs`), fed by `motion-features.tsx:37-40`.
What I tried to refute it with: a root-level boundary Next supplies — Next uses its built-in global error only when the root layout itself throws, which is the unstyled page the finding describes.
Why it stands / falls: a client throw in a root-layout component has no house boundary, and no client error anywhere reaches a log; the motion-chunk erratum is right that a failed chunk leaves `initial={{ opacity: 0 }}` content invisible rather than crashing.
Live check run: none.
Corrections to the finding: canonical for "no global-error.tsx"; T9-04 (sidebar hoopoe `dynamic()` with no catch) is an instance that should point here.
Orchestrator action: none.

### T8b-08 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; the mechanism is likely wrong, the fix is right)
Confidence in verdict: likely (source-read; a browser settles it in one look)
Citations re-derived: `not-found.tsx:35` (`<main className="relative flex min-h-svh …">`), `:45-47` (`<Link href="/">`), `:23-25` (the comment) and `app-shell.tsx:85-90` correct; no `(main)/not-found.tsx` (checked; `(main)/forbidden.tsx` exists).
What I tried to refute it with: where Next 16.3.3 puts the boundary that catches a nested `notFound()`. `create-component-tree.js:306-332` builds a segment's not-found boundary only from THAT segment's own `not-found` module and passes it to its `children` LayoutRouter; there is no inheritance. So the (main) segment's LayoutRouter carries an `HTTPAccessFallbackBoundary` with `forbidden` only, and `http-access-fallback/error-boundary.js:72-76` "keeps throwing" a 404 it has no component for. The 404 therefore reaches the ROOT segment's boundary, which wraps the whole (main) layout, and the root `not-found.tsx` REPLACES the shell rather than rendering inside it. On that reading there is no second `<main>` and no doubled padding; what the member gets is a full-screen 404 with no sidebar, no bell and no navigation, whose only way out is "Back to home" (one proxy 307 to `/feed`, not two). The not-found file's own comment (":23-25 … keeps that layout and its resident sidebar hoopoe mounted underneath") is then a comment that lies.
Why it stands / falls: either way an in-app 404 does not look like `(main)/forbidden.tsx`, and the fix — a `(main)/not-found.tsx` shaped like `forbidden.tsx` — is right in both readings (it puts the boundary inside the shell). Low.
Live check run: none (signed-in route).
Corrections to the finding: "Actual" → "the in-app 404 drops the signed-in shell entirely (likely), and the comment at not-found.tsx:23-25 says the opposite"; title "two redirects" → one.
Orchestrator action: as TestBird or Jerry, open `/letters/does-not-exist` at 1440×900: count `document.querySelectorAll("main").length` and check whether the sidebar is on screen. One `main` and no sidebar confirms my reading; two confirms the finder's.

### T8b-09 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain
Citations re-derived: `src/app/page.tsx:31-38` (only `LandingHero`), `showcase.tsx:16-21` (the note), `landing-footer.tsx:64-76` correct.
What I tried to refute it with: a link in the hero itself — none.
Why it stands / falls: the front door links to no policy; the signup consent line does, so a stranger can reach them one step later. Low.
Live check run: `curl http://localhost:3000/` → 200, 25,799 bytes, 0 occurrences of "privacy"; the only internal hrefs are `/login` and `/signup`.
Corrections to the finding: none.
Orchestrator action: none.

### T8b-10 — CONFIRMED
Verdict: CONFIRMED (Low stands; latent)
Confidence in verdict: certain
Citations re-derived: `proxy.ts:237-238` (`"/"` first in `publicPaths`), `:296-298` (`pathname === path || pathname.startsWith(path + "/")`), `:300-302` (`NextResponse.next()`) correct.
What I tried to refute it with: a normalisation before the test — none in the proxy; Next's own repeated-slash 308 is what stands in front.
Why it stands / falls: `//anything` passes the cookie gate and is then 308'd by Next; the layout and every API door re-check, so today the exposure is nil.
Live check run: `curl 'http://localhost:3000//feed'` → `308 http://localhost:3000/feed`; `//api/users/search?q=a` → `308 …/api/users/search?q=a`.
Corrections to the finding: none.
Orchestrator action: none.

### T8b-11 — CONFIRMED
Verdict: CONFIRMED (Low stands; a comment that lies)
Confidence in verdict: certain
Citations re-derived: `proxy.ts:177-180` correct; `layout.tsx:65` and `:80` (`await getThemeCookie()`) correct; `(policies)/layout.tsx:9` says the same consequence.
What I tried to refute it with: a static opt-out on `/` (none).
Why it stands / falls: the dedup baseline settles that the root layout is dynamic; the comment still claims the opposite.
Live check run: `curl -sI /` → `Cache-Control: no-cache, must-revalidate` (dev; the code is the proof).
Corrections to the finding: none.
Orchestrator action: none.

### T8b-12 — CONFIRMED (informational)
Verdict: CONFIRMED (Low, informational) — fold with T1-06 into L5's capacity dossier; no standalone fix unit
Confidence in verdict: certain
Citations re-derived: `(main)/layout.tsx:26, 83-103, 116-122, 131` correct; the revalidate count: 105 matching lines in 14 non-lab files by my grep (catchups/actions 40, feed/actions 15, messages/actions 10, collection/actions 9, admin/people/actions 9, onboarding/actions 5, settings/actions 3, admin/review 3, admin/reports 3, profile-actions 2, support/actions 2, admin/mail 2, notifications/actions 1, catchups/(index)/page 1) — the finder's 103 differs by two lines, not material.
What I tried to refute it with: whether a non-revalidating action also re-renders the layout — it does not; only revalidating (or cookie-setting) actions return a fresh tree.
Why it stands / falls: it is a measurement, not a defect; its one sharp point — the Catch-up advance runs inside an action's response when an Edition falls due — is worth a sentence in L5.
Live check run: grep above.
Corrections to the finding: file as an L5 input beside T1-06, not as a bug.
Orchestrator action: none.

### T8b-13 — KNOWN
Verdict: KNOWN (bugs.md open item "guide contents page unreachable"); the two stale comments ride with that item's fix
Confidence in verdict: certain
Citations re-derived: `guide-door.tsx:7-9`, `guide-layer.tsx:26-27`, `sidebar.tsx:59-69` (NAV has no guide; nothing in sidebar.tsx mentions guide) correct.
What I tried to refute it with: a Guide row elsewhere in the shell (none).
Why it stands / falls: the defect is the known one; the comments are what would make a reader think it fixed. Not a separate unit.
Live check run: none needed.
Corrections to the finding: none.
Orchestrator action: none.

### T8b-14 — UPGRADED to High
Verdict: UPGRADED to High (from Medium)
Confidence in verdict: certain for what leaves the server (reproduced twice today, by the orchestrator and by me); likely for what Sentry stores
Citations re-derived: `instrumentation.ts:50-53` (the comment) and `:86` (`onRequestError = Sentry.captureRequestError`) correct; `@sentry/nextjs/build/cjs/common/captureRequestError.js:8-13` (`normalizedRequest: { headers: headersToDict(request.headers), method }`; also `setContext("nextjs", { request_path: request.path … })` at :14-19, which carries the query string); `@sentry/core/…/data-collection/defaultPiiToCollectionOptions.js` (PII off → `cookies: { deny: … }`, an object) and `resolveDataCollectionOptions.js` (supplying `dataCollection` at all switches the base to the permissive DEFAULTS — the finder's warning is right); `integrations/requestdata.js:14-36` (`include.cookies = dataCollection.cookies !== false` → true) and `:111-138` (`extractNormalizedRequestData` keeps `headers.cookie`, deletes only IP-named headers, parses cookies into `request.cookies`). Installed versions: `@sentry/nextjs`, `@sentry/core`, `@sentry/node` 10.70.0.
What I tried to refute it with: (1) Sentry's server-side scrubbing (docs read today): the default scrubber redacts fields NAMED like "password, secret, passwd, api_key, apikey, auth, credentials, mysql_pwd, privatekey, private_key, token, bearer" — the cookie key `__Secure-authjs.session-token` contains "auth" and "token", so `request.cookies[…]` is probably redacted before storage IF the project keeps the defaults; the raw `request.headers.cookie` string (key "cookie"), the `x-vercel-ip-city/latitude/longitude/postal-code` headers, `referer` and the query string match no default pattern and are stored. "Data scrubbing is enabled by default", but whether this project still has it on is a dashboard fact. (2) The orchestrator's question: do `reportSwallowed` events carry the request too? YES. Probe (offline; `beforeSend` printed and returned null; DSN `127.0.0.1:9`): `@sentry/nextjs` init with the app's options + a plain Node `http` server whose handler calls `captureException(new Error(...), { tags: { swallowed: "true", area: "catchups" } })` → the event's `request` carries `cookies: { "__Secure-authjs.session-token": "SECRET-JWE", "rv-theme", "rv-visit" }`, `headers.cookie` (whole string), `x-vercel-ip-city`, `-latitude`, `-postal-code`, `referer: …/directory?q=Ananya`, `url` and `query_string` (`q=secret-search`); `x-forwarded-for`/`x-real-ip` removed. That is the http instrumentation's isolation-scope request, so any `reportSwallowed` inside a request inherits it — including `advanceDueCatchups` on every page view during a pool brownout (`catchups.ts:532`) and `rate-limit.ts` when Upstash is down: the leak scales with exactly the incidents that produce errors. (Whether Vercel's Node runtime feeds requests through `http.Server` the same way is the one step I could not run; `captureRequestError` does not depend on it.)
Why it stands / falls: a live 90-day bearer credential and near-exact location are copied to a third party on every server error and every swallowed report, in bursts during incidents, against the code's own comment, the privacy page's processor line, and the owner's 2026-08-27 decision to stop keeping members' coordinates at all (`2026-08-27-drop-visit-geolocation.sql`: "a field you collect and never use is one data minimisation says you should stop collecting"). Audit 2 filed the same token going to PostHog (C-198) as Medium while it was only suspected; this one is reproduced, systematic, and cheap to fix. High.
Live check run: the two offline probes above (no network; nothing sent).
Corrections to the finding: severity High; add `reportSwallowed` to the reach (every `captureException` inside a request, not only `onRequestError`); add `request_path`/`query_string`/`referer` (search terms) to what leaves. Fix direction stands — one `beforeSend` in `common` that deletes `request.cookies`, `request.headers.cookie`, every `x-vercel-ip-*`, `referer`, and strips the query from `url`/`query_string`/`contexts.nextjs.request_path` (or keeps a header allowlist); do not reach for `dataCollection` alone. The gate is the finder's offline `node --test` built exactly like the probes above.
Orchestrator action: owner item — Sentry → Project Settings → Security & Privacy: confirm "Data Scrubber" and "Use Default Scrubbers" are ON; search issues for `authjs` / `session-token`; if any token value was stored, rotating `AUTH_SECRET` ends every session (his call).

### T8b-15 — CONFIRMED
Verdict: CONFIRMED (Medium stands)
Confidence in verdict: certain
Citations re-derived: `src/app/error.tsx:5-6, 24-30` (`onClick={reset}` at :25), `(main)/error.tsx:28-29, 44-46` (`onClick={reset}` at :44), `(auth)/error.tsx:19-20, 34-36` (`onClick={reset}` at :34) correct; there are exactly three `error.tsx` outside the lab and no `global-error.tsx`; `next/dist/client/components/error-boundary.js:39-48` (`reset` = `setState({ error: null })`; `retry` = `startTransition(() => { this.context?.refresh(); this.reset(); })`) and `:110-115` (both passed) correct; the installed docs `03-file-conventions/error.md:121` and `:157` ("In most cases, you should use `retry()` instead"), `:331` (`retry` stable since v16.3.0) correct.
What I tried to refute it with: whether a server-render error could clear on `reset` — no: the errored segment's payload lives in the router cache (or the initial flight data), `reset` re-renders the children from that same payload without a request, and the same error re-throws into the same boundary. Only a client-side render error that was transient could clear on `reset`, and none of this app's reported failures are of that kind.
Why it stands / falls: every "Try again" in the app is a button that cannot work for the failures that reach it; on the root boundary it is the only control. The orchestrator's 02:33 BST observation (root boundary, "Try again", same screen) fits.
Live check run: none needed beyond the source.
Corrections to the finding: none; implement together with T8b-02 and T8b-07 (the future `global-error.tsx` should also bind `retry`).
Orchestrator action: none.

### T8b-16 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: likely (source-read)
Citations re-derived: `guide-kit.tsx:72-83` (`Doorway` = plain `<Link>`), the six chapter doorways (`chapters/feed.tsx:66`, `directory.tsx:35`, `collection.tsx:69`, `letters.tsx:33`, `catchups.tsx:82`, `birds.tsx:36`), `guide-layer.tsx:48-52` (the effect that closes only on a pathname change), and the six `guide="…"` mounts (`feed/page.tsx:81`, `directory-client.tsx:555`, `collection-client.tsx:1445`, `letters/(index)/page.tsx:120`, `catchups/(index)/page.tsx:263/282`, `birds/page.tsx:30`) correct.
What I tried to refute it with: a same-URL navigation that changes the pathname (it cannot) or a click handler on the Doorway (none).
Why it stands / falls: the sheet's lifetime is keyed on `pathname` and the chapter's last button targets the pathname it was opened on. One addition: on `/collection?bucket=…` or `/directory?q=…` the Link navigates to the bare path, so the page BEHIND the still-open sheet silently drops its filters.
Live check run: none.
Corrections to the finding: add the filter-reset side effect.
Orchestrator action: optional — press "Feed" (the title) on /feed, scroll the sheet to its end, press "Go to the Feed".

### T8b-17 — UPGRADED to High
Verdict: UPGRADED to High (from Medium)
Confidence in verdict: certain that the popup outgrows the viewport and cannot be scrolled; the pixel figures are estimates
Citations re-derived: `ui/dialog.tsx:101-127` (the popup className at :109: `fixed top-1/2 left-1/2 … -translate-y-1/2 … sm:max-w-sm`, no `max-h`, no `overflow`) correct; `edit-post-dialog.tsx:74-119` (`<DialogContent>` at :75 with no className; `RichTextArea` `minHeight` 240/120 at :103) correct; `rich-text-area.tsx:93-105` (only `minHeight`, no max, no overflow) — the field grows with its text; callers `letter-menu.tsx:210-223` (for `isOwn` published letters) and `post-card.tsx:742` correct; the five local patches (`edit-photo-dialog.tsx:157`, `contribute-room.tsx:240`, `people-door.tsx:344`, `catchup-home.tsx:319`, `collecting.tsx:210`) and `sheet.tsx:287` correct.
What I tried to refute it with: (1) any cap elsewhere — none: no rule in `globals.css` targets `[data-slot=dialog-content]`, Base UI's `DialogPopup` sets only a CSS variable in its inline style, and the app never uses Base UI's `Dialog.Viewport` (the scrollable wrapper); (2) scrolling — the popup is `position: fixed` and Base UI's scroll lock hides the root's overflow, so neither the page nor the caret-follow can move it; (3) keyboard — Tab does reach Save off-screen and Enter would activate it, but no member will find a control they cannot see, and phones have no Tab; (4) another way to edit a published letter — none: the desk refuses anything but a draft (`letters/[id]/edit/page.tsx:51-54` → `notFound()`).
Why it stands / falls: the quick-edit dialog is the ONLY edit path for a published letter, and at the live median length (4,278 characters in a ~322 px text box) it is roughly three times the height of a laptop window, centred, with Save and the X both off-screen; 6 of the 7 published letters exceed 1,500 characters. A member who tries to fix a typo in their letter will hit this every time, so it is "wrong behaviour a member will hit" (High), not an edge case.
Live check run: `SELECT kind, status, count(*), percentile_cont(0.5) …, max(length(content)) FROM "Post" GROUP BY kind, status` → published letters: 7, median 4,278, max 7,494, 6 over 1,500; published posts: 17, median 351, max 1,465. No admin or Jerry account owns a long letter (the owner's one published letter is 115 characters), so a live proof needs either a long letter written by the throwaway account or DOM injection.
Corrections to the finding: severity High. Fix direction stands; the primitive-level `max-h-[calc(100dvh-2rem)] overflow-y-auto` is the minimum, and the letter case should also get a wider, bounded text area (or the owner's choice of routing "Edit" on a published letter to the desk).
Orchestrator action: as the owner/admin on his own 115-character letter (Edit, no Save): in chrome-devtools set the `[role=textbox]` inside `[data-slot=dialog-content]` to 4,300 characters of text via `evaluate_script`, read `getBoundingClientRect()` of the popup (expect `top < 0`, `bottom > innerHeight`), then press Escape. Nothing is saved.

### T8b-18 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain for the wiring; possible for quota actually spent
Citations re-derived: `instrumentation.ts:31-33, 39-40, 48` correct; `@sentry/nextjs/build/cjs/server/index.js:99` (`environment: options.environment || process.env.SENTRY_ENVIRONMENT || …`) confirms a `SENTRY_ENVIRONMENT=demo` would be ignored because `common` always sets `environment`.
What I tried to refute it with: an `IS_DEMO` tag or DSN switch — none. T8a-08 says the demo serves a pre-2026-08-20 build and Sentry arrived 2026-08-19, so whether the CURRENT demo reports at all is uncertain; the wiring is what the next demo deploy inherits.
Why it stands / falls: a second deployment of the same code files its errors as production incidents in the owner's only project, sharing the free quota. Low.
Live check run: none.
Corrections to the finding: none. Cross-zone: T5-10 (a down limiter spending the Sentry quota) is the same quota question from production's side.
Orchestrator action: none.

### T8b-19 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain for the HTML
Citations re-derived: `landing-hero.tsx:244-250` (`<m.section … initial="loading" animate={phase}>`), `:187-211` (the cache-hit reveal, the 220 ms loader timer and the 6 s `setTimeout(reveal, 6000)`, all inside a `useEffect`) correct; `motion-features.tsx:37-40` correct.
What I tried to refute it with: a CSS or `<noscript>` floor — none.
Why it stands / falls: every visible element of the front door ships at opacity 0 and needs hydration plus the motion chunk to appear.
Live check run: `curl http://localhost:3000/` → seven elements carry an inline `opacity:0` (the photo layer, two washes, the brand bar, the headline block containing the `<h1>` "Welcome back to the valley.", and both CTA links), and the page has no `<noscript>`.
Corrections to the finding: none.
Orchestrator action: none.

### T8b-20 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain for the second-finger path; likely for the re-render path
Citations re-derived: `sheet.tsx:164-239` (`useSwipeDownToClose`), `start` at :191-197, `end` at :219-226, deps at :238, `close = useCallback(() => onOpenChange(false), [onOpenChange])` at :268 correct; unstable callers `people-door.tsx:325` and `house-chain-editor.tsx:303-304` (inline arrows) correct; `catchup-home.tsx:304` passes a stable setter.
What I tried to refute it with: a reset of `transform` anywhere on a cancelled drag — none; `end` returns early when `!dragging`.
Why it stands / falls: a second touch on the sheet resets `dragging` and leaves the translate and `transition: none` in place. On the re-render path the new effect starts with `el.style.transition = SETTLE`, so the sheet is left displaced with its transition ON, not off (the transform is what sticks).
Live check run: none (multi-touch).
Corrections to the finding: the re-render path leaves `transition` restored; only the transform sticks.
Orchestrator action: none (a real phone).

### T8b-21 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain
Citations re-derived: `range-facet-pill.tsx:86-112` (two independent selects), `:47-53` (the label) correct; `directory/where.ts:99-100` (`gte`/`lte`) correct, with the `parseDirectoryYears` call at :67.
What I tried to refute it with: a swap anywhere (pill, `parseBatchYear`, where-builder) — none. The where-builder's own comment (:90-96) accepts contradictory inputs as "honest and legible because both tokens are on screen", which is fair for two different filters but not for one range entered backwards.
Why it stands / falls: a reversed range is a common slip on two adjacent phone wheels and returns an empty directory with no hint. Low.
Live check run: none needed.
Corrections to the finding: none.
Orchestrator action: none.

## New candidates

### V-T8-01 — A gift paid on a second attempt is recorded with the FAILED attempt's payment method whenever the browser callback wins the race
- Severity: Low (admin-only: the ledger's method column and the "Most used" tile)
- Confidence: certain on the mechanism (read end to end); frequency unknown — nothing stored today can tell which paid rows had a failed first attempt, and since 2026-08-30 the webhook has been winning the race (T8a-11), which masks it
- Where: `src/app/api/razorpay/webhook/route.ts:277-288` (`payment.failed`: `updateMany({ where: { id, status: "created" }, data: { status: "failed", razorpayPaymentId, method: payment?.method, failureReason } })`); `src/app/(main)/support/actions.ts:191-212` (`confirmContribution` moves "failed" → "paid" and clears `failureReason`, but never touches `method`); `route.ts:251-256` (the C-088 backfill, narrowed to `where: { id, status: "paid", method: null }`); `src/lib/admin-rule.test.mjs:114-135` (pins that narrowing); `admin/support/page.tsx:147` (the "Most used" count) and `:322` (the ledger's `r.method.toUpperCase()`)
- Taxonomy: 6i webhooks (out-of-order, two writers of one row) · 6a (a field one writer sets and the other never resets) · L9 (the test pins the shape that causes it)
- Expected: `support/actions.ts:197-209` — "A first attempt that failed and a second that went through are ONE row, and whichever writer wins the race owns the whole transition… The webhook backfills [method] (see the captured branch), which is why that one no longer gives up when it finds the row already paid."
- Actual: a card declined, then a UPI retry inside the same Razorpay window (the ordinary retry the test comment at `admin-rule.test.mjs:96-100` describes). `payment.failed` for the first attempt lands first and writes `method: "card"`. The retry succeeds, the browser callback wins, the row goes "paid" with the UPI payment id but still `method: "card"`. The webhook's `payment.captured` then finds the row paid, and its backfill matches nothing because `method` is not null. The ledger prints CARD for a UPI gift and the "Most used" tile counts it as card, for ever. (If the webhook wins instead, its captured branch writes the right method, which is why this is invisible while the webhook keeps winning.)
- Why: Low 116's fix cleared the failed attempt's `failureReason` on success in both writers, but not the failed attempt's `method`, and C-088's backfill only fills a NULL method.
- Proof: argue-only (needs a failed-then-succeeded live payment; do not stage one). A route-level unit test with a mocked `prisma` shows it in three calls: `payment.failed` (card) → `confirmContribution` → `payment.captured` (upi) → `method === "card"`.
- Fix direction: in `confirmContribution`'s `data`, also write `method: null` (the callback cannot know the method, so it should not keep a stale one; the backfill then fills the right one), and update the pin in `admin-rule.test.mjs:96-111` to require it — "both writers of paid write the same fields". Alternatively key the backfill on the payment that paid: `where: { id, status: "paid", razorpayPaymentId: payment.id }` and write `method` unconditionally.
- Gate: extend the C-088 test so `confirmContribution`'s update clears `method` as well as `failureReason`.
- Known-related: C-088 (introduced the backfill), audit Low 116 (cleared `failureReason`, not `method`). Not T8a-11 (that is the bell).

## Cross-zone notes

- **T4b-02 → T8b-01** (canonical, already agreed). The ruled fix direction is in T8b-01's verdict: keep the popped layer in the stack, re-push on a refusal detected synchronously via `details.cancel()` at the five sites, with a short deferred re-check as the belt. The contribute room also has `use-leave-guard.ts` listening only for `beforeunload`, which a same-document Back never fires.
- **T5-06 is canonical for T8b-03** (same cause, same fix). Carry T8b-03's Next trace and its `303 + x-action-redirect` option into T5-06.
- **T5-17 / O-03** — T8a-12 is its money-path consequence ("Not authenticated" after payment, button live again); T8b-02 is its shell-side consequence (root-boundary face). A `SessionUnavailable` throw fixes T8a-12's pool-timeout half by itself; the revoked-cookie half still needs T8a-12's client change.
- **The orchestrator's own record** (findings.md, "LIVE, 02:33 BST"): the screen it quotes ("Something went wrong. We hit an unexpected error…") is the ROOT boundary's copy (`src/app/error.tsx`), not the (main) boundary's ("This page did not load"). That is the expected result for a throw in the (main) LAYOUT and is the live proof of T8b-02's middle face; the wording "fell into the (main) error boundary" should say "root".
- **T9-04 → T8b-07** — "no `global-error.tsx`" is canonical at T8b-07; T9-04 (sidebar hoopoe `dynamic()` import with no catch) is an instance of it.
- **T5-10 ↔ T8b-18** — both are the free Sentry quota being spent by something other than a real production failure; one owner item (Spike Protection / per-key rate limit) serves both.
- **T6-03 ↔ T8a-07** — same export file and same "a copy of your data" promise; one fix session.
- **T7a-01, T5-01, T6-03 ↔ T8b-06** — T8b-06 is the privacy-page (text) half of each; link, do not merge. T8b-14 adds a ninth privacy-page mismatch (Sentry), and the owner's 2026-08-27 decision to stop storing Visit coordinates is the strongest argument for T8b-14 being High.
- **T1-06 ↔ T8b-12** — same measurement (every revalidating action re-renders the (main) layout); both belong in L5's dossier, not a fix unit.
- **L4** — may list `support/page.tsx:46,56` as silent fallbacks; T8a-06 is the member-visible version, keep one.
- **L9** — comments that lie, confirmed in this zone: `not-found.tsx:23-25` (says a nested 404 keeps the (main) layout; Next's source says the root boundary replaces it — T8b-08), `proxy.ts:177-180` (T8b-11), `guide-door.tsx:7-9` and `guide-layer.tsx:26-27` (T8b-13), `route.ts:111-119` and `razorpay.ts:141-142` (T8a-15), `route.ts:165-171` (T8a-02/03), `route.ts:237-240` (T8a-11), `support/actions.ts:232-239` (T8a-05), `info-tooltip.tsx:19-21` (T8b-05), `instrumentation.ts:50-53` (T8b-14), `support/actions.ts:206-209` (V-T8-01).
- **L7 (a lead, not verified against the baseline)** — a `<Button>` (a real `<button>`) nested inside a `<Link>` (`<a>`) in at least 15 places, including all three recovery screens (`not-found.tsx:45-47`, `(main)/error.tsx:47-49`, `(auth)/error.tsx:37-39`) and `catchups/join/[token]/page.tsx:91,154,159`: invalid interactive nesting and two tab stops per control. `support/page.tsx:69` shows the house's correct pattern (`nativeButton={false} render={<Link/>}`).
- **Demo database** — this validator could not re-run T8a-08's demo counts: the permission system denies this session any read of `.env.demo`. The orchestrator should run them if the demo's state matters to the report.

## Coverage

- Checked completely (every citation re-derived, a refutation attempted, a live or offline check where one was possible): T8a-01, 02, 03, 04, 05, 06, 07, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18; T8b-01, 02, 03, 04, 06, 07, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21.
- Partially checked:
  - T8a-08 — the repo side only; the demo-database counts and `pg_stat` evidence could not be re-run (`.env.demo` is denied to this session by a permission rule; I did not route around it), and the relaunch's git archaeology was not re-run (the orchestrator's "never touch git").
  - T8b-05 — the touch-event claim is argued against from React's lane ordering and Base UI's own click toggle, not observed; needs a device or DevTools touch emulation.
  - T8b-08 — my correction (the root boundary replaces the shell) is from Next 16.3.3's source; one signed-in look settles it.
  - T8b-17 — geometry argued from CSS and live letter lengths; the DOM-injection check in the verdict settles it without saving anything.
  - T8b-14 — what leaves the server is reproduced offline twice; what Sentry stores depends on the project's scrubber settings (dashboard).
- Live / offline checks run (all read-only): the contribution-bell timing join and the full paid-row list (T8a-11); the snapshot-vs-net comparison (T8a-01); the 100-row funnel window by people (T8a-14); members/payers with photos (T8a-16); letter/post length distribution and letter authorship by the test/admin accounts (T8b-17); ContentView age (T8b-06); `curl` of `/` for policy links, hidden elements and `<noscript>` (T8b-09, T8b-19), `//feed` and `//api/…` (T8b-10), `/settings` signed out, `-I /`; two offline Sentry probes (`captureRequestError`, and `captureException` inside a Node `http` request) with a localhost DSN and a `beforeSend` that printed and returned null (T8b-14); Razorpay public docs (disputes guide, dispute webhooks, accept-dispute API, webhook FAQ) and Sentry's server-side scrubbing doc.
- Read for this validation: both reports in full; `brief-validator.md`, `brief-common.md` §1–§3, `dedup-baseline.md`, `validation-zones.md`, `findings.md`; `src/app/api/razorpay/webhook/route.ts`, `support/actions.ts`, `contribution-state.ts`, `razorpay.ts`, `pick-bird/page.tsx`, `support/page.tsx`, `support-contribute.tsx` (120-410), `costs-card.tsx`, `bird-picker.tsx` (30-80, 160-205), `admin/support/page.tsx` (60-215), `demo-bar.tsx` (50-95), `demo/reset/route.ts` (60-126), `proxy.ts` (25-90, 170-330), `back-closes.ts`, `ui/dialog.tsx` (1-140), `confirm-dialog.tsx`, `contribute-room.tsx` (215-320), `edit-post-dialog.tsx`, `rich-text-area.tsx`, `info-tooltip.tsx`, `sheet.tsx` (148-290), `range-facet-pill.tsx`, `directory/where.ts` (60-105), the three `error.tsx`, `not-found.tsx`, root and (main) layouts, `instrumentation.ts`, `report-error.ts`, `guide-kit.tsx`, `guide-layer.tsx`, `retention.ts` (26-135), privacy page (55-200), `landing-hero.tsx` (180-252), `motion-features.tsx`, `notification-bell.tsx` (95-110, 250-285), `post-feed.tsx`, `comments-section.tsx` (150-240), `profile-author-feed.tsx`, the relevant Base UI (Dialog store/root/popup, Popover trigger/store, `useClick`, `mergeProps`, `ReactStore`), Next (`error-boundary.js`, `http-access-fallback/error-boundary.js`, `create-component-tree.js`, `next-app-loader`, `action-handler.js`), `@auth/core` session action, `next-auth/lib/index.js`, `@sentry/{nextjs,core}` request-data and data-collection modules, `framer-motion` `LazyMotion`.
- Not done: no browser, no sign-in, no POST to the dev server (T8b-03's cookieless action POST was not re-run; the source trace was), no demo-database query, no write of any kind. Git: one read-only `git log -1` / `git status --short` at the start to record HEAD (70570bcd, tree unchanged apart from the two untracked audit folders); nothing after that.
- Finished 2026-09-24 09:07 BST.
