# V-C — validator for the completeness rounds C1, C2, C3, C4
Validator: V-C · Started: 2026-10-24 · Model: Opus 5.5 (1M) · HEAD read: 36ed27d3
Assigned: C1-01..C1-08 (C1-06 skipped, owner-declined), C2-01..C2-03, C3-01 (severity + "second press publishes empty" only), C3-02, C4-01..C4-04, and every report's Extends lines.

Counts: CONFIRMED 8 · CONFIRMED-CORRECTED 6 · DUPLICATE 1 (C2-02 → T6-03) · REFUTED 0 · severity changes 0 (C4-03 kept Low but its reachability is near-nil; see it). Extends lines: 8 of 8 hold. New standalone candidates: 0 (one fold into C2-01's fix direction).

## Verdicts

### C1-01 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (mechanism and LAN exposure); possible (ever fired)
Citations re-derived: `screenshot-auth.mjs:29` and `:39-51` (the `shoot` call) correct; `_shoot.mjs:110` and `:136-141` correct; `_dev-login.mjs:55-67` correct (no origin check; `redirect: "error"` does not stop the body leaving with the first request); `local-base-url.mjs:4-20` correct. CORRECTION: `requireLoopbackBaseUrl` has ONE caller, `e2e/playwright.config.ts:31`; `e2e/auth.setup.ts` imports only `assertSameOriginAfterNavigation` (`:2`, used `:29`), and `:30` is the `devLoginContext` call. `verify-shot.mjs:16-20` correct. `dev-login/route.ts:60-66`, `:83-88`, `:108-128` correct (also accepts the secret in an `x-dev-login-secret` header, `:83`). `package.json:6` `"dev": "next dev"`.
What I tried to refute it with: (1) whether the dev server is really reachable off-machine: `lsof -nP -iTCP:3000 -sTCP:LISTEN` → `node … TCP *:3000 (LISTEN)`; macOS application firewall `--getglobalstate` → "Firewall is disabled"; `next.config.ts:262-272` WIDENS `allowedDevOrigins` to all three RFC1918 ranges on purpose ("it binds to every interface regardless"), and Next 16's `block-cross-site-dev.js` only guards `/_next/*` and `/__nextjs` internals (`isInternalEndpoint`), never an `/api` route, and allows any request without an `Origin` header. So `POST http://<laptop>:3000/api/dev-login` from the LAN is served. (2) whether the secret really leaves for a foreign origin: `page.goto(origin)` runs first, so a typo'd domain that does not RESOLVE throws before any fetch (the secret stays home); one that resolves (a typosquat, a reference site, the live site) receives `{"email":…,"secret":…}` in the POST body. Production itself is the owner's own Vercel (404, body not logged by default), so the live-site case is a near-miss, not a leak to a third party.
Why it stands: the guard the repo wrote for exactly this credential is applied only to the Playwright path; the one CLI that takes a URL from the command line skips it, and the credential opens an any-account session on a server bound to every interface that writes production.
Live check run: `lsof` and `socketfilterfw` above (read-only); no request sent anywhere.
Corrections to the finding: the trigger is "a URL whose host resolves" (reference site, typosquat), not "a one-letter typo" in general; the live-site case sends the secret to the owner's own deployment. `scripts/README.md:137` does correctly name the Playwright config as the user, so the L9 angle is only that its purpose sentence reads as universal. Severity Low stands.
Orchestrator action: none needed (argue-only by design).

### C1-02 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `phase3-probe.mjs:254-266` (`drive`), `:298-301`, `:116-122` (`refPost` read and never used — `grep refPost` finds only `:116`, `:122`), `:280-288`, `:56-67` all correct; `feed/actions.ts:986-994` correct; `verification-actions.ts:66-70` correct; `admin-threads-server.ts:103-111` (`notifyAdmins`, `:103-112`) correct.
What I tried to refute it with: (1) whether the first "Show comments" post could be the system `anonymous` account's (no real recipient): live, the five newest published unhidden posts are all by non-anonymous authors (`SELECT p."authorId" = 'anonymous' …` → all `false`). (2) whether `notifyMember` is skipped in dev or for probe actors: it is an unconditional `prisma.notification.create` (`post-notifications.ts:29-31`). (3) the cleanup: `Notification.userId` is the recipient; nothing in `cleanup()` names `Notification`.
Why it stands: the probe deletes the rows it authored but not the bell rows the app writes on other members' behalf. With the Extends line below (the `"Session"` throw at `:63`) the probe accounts themselves also survive, which makes the stage-1 admin bell's link live rather than 404 — the residue is worse, not better.
Live check run: newest-post authors query above; residue today 0 (C1's count, not re-run).
Corrections to the finding: under today's code the `/admin/people/probe_stage1_…` link does NOT 404 after a run, because the cleanup throws before deleting the user (C1's own Extends); it 404s only once that is fixed. Otherwise none.
Orchestrator action: none.

### C1-03 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `phase7-probe.mjs:98-113` correct; `:100` correct; index live: `Report_open_post_per_reporter_key UNIQUE (reporterId, postId) WHERE targetType='post' AND status='pending' AND postId IS NOT NULL`. Column defaults live: `status` default `'pending'`, `targetType` default `'post'`, so the probe's two INSERTs (which set neither status) both land `pending` and the second raises 23505. Probe last touched `14d229a4` 2026-09-07; the index came with `35be2c0d` 2026-08-25.
What I tried to refute it with: whether the INSERT could fail for another reason first (a NOT NULL column it omits): every NOT NULL column has a value or a default; the first insert succeeds, the second is refused by the partial unique.
Why it stands: the probe asserts the contract the index replaced, so it FAILs on correct behaviour.
Live check run: `pg_indexes` on `Report`; `information_schema.columns` on `Report`.
Corrections to the finding: none.
Orchestrator action: none.

### C1-04 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `photo-suggest.ts:164-171` and `:180-188` correct. CORRECTED (file unchanged since `089aa78c`, 2026-09-05, so the report's numbers were never right): `tag-photos-apply.mjs` problems block is **:137-141** (not 128-132), the `!verdicts.length` stop is **:151-155** (not 148-152), the write is **:209-231** (log `:214-217`, transaction `:219-228`), exit 0 on success. `tag-professions-apply.mjs:170-176` correct. `hand-run-passes.test.mjs:126-131` correct (only `--apply`, `--undo`, `applied-`). `docs/spec/hand-run-passes.md:74-78` (the two refusal rules). SKILL.md claim at **:154-155**. T4a.md's verified-clean line is at `:218`.
What I tried to refute it with: a later exit on `problems` (none: the only `problems`-conditioned exit is inside the `!verdicts.length` branch, `:154`); a per-row guard in `writeRow` (it writes whatever verdict it is given, only into empty columns).
Why it stands: the applier lists the problems and then applies everything that parsed, exactly as described.
Live check run: none needed (source; never run the applier).
Corrections to the finding: line numbers above. Cross-zone: T4a's verified-clean line ("the applier refuses … an unknown id, a duplicate id and a seventh bucket") is false in the sense the protocol means — it skips those ROWS, it does not refuse the batch.
Orchestrator action: none.

### C1-05 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain (guard and today's rollback); possible (trigger)
Citations re-derived: `seed-demo.mts:11-17`, `:27`, `:51-63` correct; `_env.mjs:78-96` correct (`DEMO_REF` at `:99`); `apply-schema.mjs:44-51, 66-75` correct; `seed.ts:102-127` correct, inside one `$transaction` with `timeout: 30_000` (`:75`, `:526`) and `maxWait: 10_000`; `retention.ts:32-34` (`reports: 1095`) correct.
What I tried to refute it with — the question "what would it do pointed at production": (1) does anything run OUTSIDE the transaction before it? No: `seedDemo` opens the transaction first and only counts afterwards (`seed.ts:93`, `:539-546`). (2) Which FKs onto the cleared tables block? Live `pg_constraint`, every FK with `confdeltype IN ('r','a')` in the whole database: in `public` exactly one, `Report_reporterId_fkey` (RESTRICT, `Report` → `User`); the rest are Supabase's own `storage.*`. (3) Do those reports exist? Live: 4 rows, all `dismissed`, all 4 reporters live. So `tx.user.deleteMany({})` raises at the first reporter and the whole transaction rolls back; nothing commits. (4) A second, equally accidental brake: the transaction also deletes `Place` (live count 234,935) and cascades `User` over every telemetry table inside a 30 s budget, so the timeout may abort it first. Either way production is saved by accident, which is the finding's point.
Why it stands: the script's own promise ("refuses to run unless the target proves it is the demo one") is checked against the request (a flag and a byte comparison with one other string), never the destination.
Live check run: the `pg_constraint` scan; `SELECT status, count(*), count(u.id) FROM "Report" r LEFT JOIN "User" u …` → `dismissed 4 4`; `SELECT count(*) FROM "Place"` → 234,935.
Corrections to the finding: "today only a RESTRICT foreign key … would roll the wipe back" — add "or the 30 s transaction timeout"; both are accidents. None else.
Orchestrator action: none (never run the seed).

### C1-07 — CONFIRMED (Low, likely)
Verdict: CONFIRMED
Confidence in verdict: likely (no browser by rule)
Citations re-derived: `admin-filter-bar.tsx:135` (blur commit), `:134` (Enter commit), `:48-57` (`setParam` from render-time `searchParams` inside `startTransition`), `:104-105` (`panelOpen`/`sheetOpen`), `:149`/`:154` (Filters buttons) correct; people page `(index)/page.tsx:41-48` key `${filters.q}|${filters.state}|${filters.kind}` correct; content page `:55-56` key correct. The hook and the bar both live INSIDE the keyed lists: `people-list.tsx:60` (`useAdminFilterParams`), `:150` (`<AdminFilterBar`); `content-list.tsx:52`, `:114`.
What I tried to refute it with: state held above the key (none — both the URL hook's `draftQ` and the bar's `panelOpen` are under it); a `useEffect` resyncing `panelOpen` (none).
Why it stands: a blur-commit navigation changes the key, the list remounts, and the bar's local panel state resets; a facet picked before that lands is built from the pre-`q` query string.
Live check run: none possible.
Corrections to the finding: none. Part (b) needs a pick inside one server round trip (bom1 ≈ a few hundred ms), so it is the rarer half; (a) happens every time a search is committed by clicking Filters.
Orchestrator action: the chrome-devtools repro in the finding, as the test account.

### C1-08 — CONFIRMED (Low, latent)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `npm-audit-gate.mjs:80` correct; `check.mjs:195-215` correct (exit 0 → `ok: code === 0`, detail "clean").
What I tried to refute it with: whether Node canonicalises `process.argv[1]` the same way the ESM loader builds `import.meta.url`: it does not — argv[1] is `path.resolve`d but not realpath'd or URL-encoded, while the main module's URL is realpath'd and percent-encoded. `node -e` → `file:///a%20b/x.mjs false`. `/tmp` on this Mac is a symlink to `private/tmp`. The owner's checkout (`/Users/sanan/Documents/rv-connect`) and the GitHub runner path have neither, so it is latent.
Why it stands: an entry guard that silently skips the gate on an unusual path, and a runner that reads "no output, exit 0" as clean.
Live check run: the `node -e` comparison above (no gate run).
Corrections to the finding: none.
Orchestrator action: none.

### C2-01 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on configuration; likely on the member sequence
Citations re-derived: `storage.ts:37-49` correct (no `requestHandler`, no `maxAttempts`; `grep abortSignal|requestHandler|maxAttempts|defaultsMode` in `storage.ts` → nothing; `git grep AWS_DEFAULTS_MODE|defaultsMode` in src/scripts/.github/vercel.json/next.config.ts → nothing). `@smithy/node-http-handler` 4.9.1: `:208` `DEFAULT_REQUEST_TIMEOUT = 0`; `:45-47` connection timeout returns early when unset; `:80-99` request timeout only WARNs without `throwOnRequestTimeout`; socket timeout registers only for `0 < ms`. `feed/actions.ts:118` and `:770` correct (post-commit drains); `settings/actions.ts` avatar purge after the committed `swapPhotoUrl` correct; `collection/actions.ts:1085` (erasePhoto drain) and `:1189` (`adminRemovePhoto` → `purgeImageUrls`) correct; `call-action.ts:43-58` correct; `image-purge.ts:53-68` has no timeout of its own.
What I tried to refute it with: a wrapper deadline around the drains (`drainPendingImagePurges`/`purgeImageUrls`: none); a Node default socket timeout (the https agent sets none); an SDK defaults-mode env var (none in the repo; dashboard unverifiable).
Why it stands: R2 is the one outbound dependency with no deadline, and several member actions await it after their database change has committed.
Live check run: none possible (needs R2 to stall).
Corrections to the finding: (1) "the SDK makes three [attempts]" — with no socket/request timeout, a request that is accepted and then hangs never FAILS, so the retry strategy never runs; the bound is the function's own kill (Fluid default) unless R2's edge answers first (e.g. a 5xx after its own timeout), and only then do retries multiply. (2) The lead / fix direction "every one already has its `PendingImagePurge` row written in the transaction" is FALSE for three of the named paths: `updateAvatar`/`removeAvatar` (`swapPhotoUrl` writes no worklist row, `avatar-swap.ts:20-36`) and `adminRemovePhoto` (`purgeImageUrls` queues only on a returned refusal, `image-purge.ts:53-61`). For those, a function killed mid-`delImage` (exactly C2-01's stall-until-kill) orphans the old bytes permanently today, and moving them into `after()` without first writing the worklist row would widen that. The fix must write the `PendingImagePurge` row before the R2 call on those paths (as `deletePostWithImages` and `erasePhoto` do) before deferring anything. Severity Low stands.
Orchestrator action: none.

### C2-02 — DUPLICATE of T6-03
Verdict: DUPLICATE of T6-03
Confidence in verdict: certain
Citations re-derived: `export/route.ts:21-31` (the M48 comment, "neither end holds it all" at `:30-31`) and `:294-332` (`new ReadableStream({ async start(controller) {…} })`, no `pull`, no `desiredSize`) correct.
What I tried to refute it with: n/a — the mechanism is right; the question is whether it is new. `reports/T6.md:49` (T6-03, Medium, CONFIRMED in V-T6) already carries it word for word: "the whole export runs inside `ReadableStream.start()`, which enqueues every chunk as fast as the database answers with no `pull()`; 'neither end holds it all' (`:31`) is true of the DATABASE side … and not of the stream's internal queue … Harmless at today's sizes; the comment overstates."
Why it falls: same mechanism, same file, same conclusion; T6-03 is canonical because it was filed first and its fix unit owns the export.
Live check run: none.
Corrections to the finding: fold into T6-03's export unit (one line: move the walk into `pull()` or correct the comment).
Orchestrator action: none.

### C2-03 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `docs/SETUP.md:13-14` and `:43` correct; `:72-74` correct (`:73-74` "A fresh database is built by applying that folder in filename order"); first migration `2026-07-05-secondary-city.sql` and no `CREATE TABLE "User"` anywhere in the folder; `auth.ts:454-464` correct; `AGENTS.md:41` and `:46` correct; `docs/README.md:70` correct (`scripts/demo/` holds only `apply-schema.mjs`, `seed-demo.mts`, `verify-guard.mts`); the map's planning list (`:44-54`) omits `birds-expansion/`, `platform-health/`, `valley/`, all present on disk.
What I tried to refute it with: any `ADMIN_EMAIL` role grant left in `src` (none: readers are `dev-login/route.ts:88`, `email-queue.ts:157` (dev-send narrowing), comments).
Why it stands: three public-facing documents state things the code stopped doing.
Live check run: none needed.
Corrections to the finding: `ADMIN_EMAIL`'s other reader is `email-queue.ts:153-160` (the dev-send narrowing), not only `mail-policy.ts`. None else.
Orchestrator action: none.

### C3-01 — CONFIRMED (Medium) — brief check, as assigned
Verdict: CONFIRMED (severity and the second-press claim only; the mechanism was verified by the orchestrator)
Confidence in verdict: certain
Citations re-derived: `catchups/actions.ts:1110` (count), `:1112-1136` (too-few branch: CAS on `remindersSent`, `notifyAnswersOpen(…, onlyNonAnswerers: true)`, return `extended: true`), then the publish branch `:1179-1201` (`publishPatch`, `notifyPublished` to everyone but the presser) correct. `catchups-core.ts:738-740` `shouldExtendForTooFew` = `entryCount === 0 && (remindersSent & REMINDER_EXTENDED) === 0`; `extendPatch` `:869-881` sets `REMINDER_EXTENDED` and anchors on `now`.
Second press: after the first press the row carries `REMINDER_EXTENDED`, so `shouldExtendForTooFew` is false, the time-capsule branch is skipped for an ordinary Edition, and the publish branch runs with zero entries → empty Edition published and every other member belled. Holds. The clock does the same at the shortened deadline (`planNextAction` `:942-944`: extend only if the bit is clear, else straight out).
Severity: Medium stands — one press by any batch member (or a people Keeper) cuts the group's week, re-rings, burns the once-only safety net and returns no visible sentence; the natural retry publishes a permanent empty Edition to the whole group. Not High: it needs the unusual act of closing before anyone has answered.
Orchestrator action: none beyond the finding's throwaway-account steps.

### C3-02 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain (mechanism)
Citations re-derived: `startEdition` docblock `actions.ts:1221-1223` and meter `:1246` correct; the file's only `rateLimit` calls are `:464`, `:1246`, `:1819` correct; `rate-limit.ts:162` `catchups: { tokens: 5, window: "1 h" }` correct; `catchups.ts:394-401` (`notifyQuestionsOpen`, `excludeUserId: starter.id`) correct; `git grep catchupEdition.delete` → only `demo-seed/seed.ts:117` correct.
What I tried to refute it with: a meter on `openAnswering`/`closeAndPublish`/`submitPrompt` (none); `openEdition` refusing a restart within some cool-down (it refuses only while one is running); a stage gate on the publish half (none for batch, V-T2-01).
Why it stands: the docblock's guarantee is met only for the Start half; the rest of a round is free, so the per-person bucket allows ten group-wide bells and five permanent empty covers an hour.
Live check run: none (would ring real people).
Corrections to the finding: none. Note it also inherits the rate limiter's fail-open (Upstash down → no meter at all).
Orchestrator action: none beyond the finding's two-person Catch-up repro.

### C4-01 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (mechanism and arithmetic)
Citations re-derived: `trivia-actions.ts:55-77` (`getTriviaQuestion`: no meter; writes `dontknow`/`skipped` + `shown`), `:45-47` ("No cost and no limit on swapping"), `:100-108` (the refused branch writes a `limited` row with the typed answer; `addedAnswers` runs in the same `Promise.all`) correct. `trivia-log.ts:37-50` (cap + promise; `TRIVIA_ROWS_PER_HOUR = 600` at `:50`), `:53` `ANSWER_MAX = 200`, `:126-141` (count-then-insert in `after()`), `:73-88` (a cookieless call mints a fresh uuid) correct. `retention.ts:83` `gateLog: 365`, `:140-141` the sweep step correct. `rate-limit.ts:84` `trivia: { tokens: 8, window: "10 m" }` (per IP).
Arithmetic, re-derived independently: `pg_column_size(ROW(…))` = **344 B** (200-char `limited` shape) and **136 B** (`shown`) — matches. On disk: 344 + 4 B line pointer; pkey index tuple on a 25-char text ≈ 40 + 4; `createdAt` ≈ 16 + 4; `browserId` (36-char) ≈ 48 + 4; plus B-tree fill loss on the random uuid → ~465-490 B, so ~485 B is right. Cap steady state: 600 × 24 × 365 = **5,256,000 rows × 485 B ≈ 2.55 GB**. At the cap: 14,400 rows/day × 485 B = **~7.0 MB/day**. Live `pg_database_size` = **128,543,891 B** (identical to C4's reading) and `TimeZone` = UTC (so the cap's `now() - interval '1 hour'` against a `timestamp without time zone` column is a correct window). Days to the snapshot alarm (`snapshot.mjs:80` `DB_ALARM_MB = 350`, decimal MB, `:187`): (350 − 128.5) / 7.0 ≈ **32 days**. Supabase's meter reads ~20 MB above Postgres's (`snapshot.mjs:181-182`), so read-only at ~480 MB of Postgres's count: (480 − 128.5) / 7.0 ≈ **50 days**. Attacker's cost: one valid-id `checkTrivia` every 6 s, or one `getTriviaQuestion(validId, "<200 chars>")` every 12 s. All correct.
What I tried to refute it with — every upstream bound: (1) `src/proxy.ts`: `/signup` is public; the only server-action handling (`:395`) is about not sliding the visit cookie; no rate limit, no bot check. (2) Turnstile: called only in `registerUser`, never in either trivia action. (3) The per-IP `trivia` meter (8 per 10 min): `checkTrivia` writes a `limited` row on EVERY refused call (`:105-107`), so the meter bounds answers, not rows; `getTriviaQuestion` has no meter at all. (4) Next's server-action CSRF check compares `Origin` to `Host`, which a non-browser client sets freely; the action id is in the public `/signup` bundle. (5) `statsWritesEnabled()`/`IS_DEMO` (`logging()`, `:91-93`): true on production. (6) Retention: 365 days, so nothing is reclaimed inside the 50-day window (and a delete would not shrink the file without VACUUM FULL anyway). (7) The site-wide cap itself: it is exactly what blinds the room — 600 slots, first come. Nothing upstream bounds it except an edge rule nobody has configured in the repo.
Why it stands: the cap bounds the rate and the retention multiplies it into a size five times the plan; the per-IP limiter writes on refusal; the swap path has no meter; the room is first-come and silently loses real visitors' rows from the first hour of a flood.
Live check run: `SELECT pg_database_size(current_database()), count(*) FROM "TriviaEvent", current_setting('TimeZone')` → 128,543,891 / 3 / UTC; `pg_column_size(ROW(…))` → 344 / 136; `pg_indexes` on `TriviaEvent` → pkey(id), (createdAt), (browserId).
Corrections to the finding: add a FIFTH place repeating the false promise — `src/lib/gate-coverage.test.mjs:42` labels `getTriviaQuestion` "(per-IP limited)", which it is not (`:43` is right for `checkTrivia`'s answers, wrong for its writes); the fix should correct that label too. Also: `checkTrivia` spends Upstash on every refused call (the L5-02 Upstash angle; fail-open site-wide when the free quota runs out), while `getTriviaQuestion` spends none — so the cheapest flood vector is the swap, as C4 says. Cross-zone: V-L-c.md:275's peer note ("the L5-02 class is handled there") is wrong in light of this. Severity Medium stands (slow, alarmed at ~32 days, owner-recoverable; the room's blinding is immediate but admin-only).
Orchestrator action: none (never flood production).

### C4-02 — CONFIRMED (Medium)
Verdict: CONFIRMED
Confidence in verdict: certain on mechanism; likely on reachability of trigger (a)
Citations re-derived: `change-email-actions.ts:164-170` (the comment), `:171-185`, `:186-191`, `:77-79`, `:93-98` correct; `verification-mail.ts:29-36` correct (the `enqueueMail` answer dropped); `email-queue.ts:437` `verify: { max: 5, windowMinutes: 60 }` (block `:435-440`), the per-USER count and refusal `:496-502` correct; the fold `:466-493` is address-aware (`to: { equals, mode: "insensitive" }`) but the state reader is not: `verificationMailState` `:985-1018` `findFirst({ where: { userId, kind: "verify" }, orderBy: { createdAt: "desc" } })` → a failed row with `bouncedAt` → `bounced`; the action maps that to `"imminent"` (`:179`), so `movedMessage` (`confirmation-copy.ts:95-106`) says "Your link is on its way to n***@new"; `(main)/layout.tsx:200-205` labels the bounce with `maskEmail(session.user.email)` (the NEW address); `verify-email-banner.tsx:230-252`, `:274-281` (bounced → only "Use another email"); `mail-policy.ts:357-365` (`confirmationStillWaiting` filters to the current address → none → gate shut).
What I tried to refute it with: (1) another entry to the dialog — `ChangeEmailDialog` has one caller, the banner, and only the bounced state renders the button, so at a move the newest verify row IS the old bounce. (2) The fold — it would rescue the move only if a queued/sending row existed, and in the bounced state none does (the fold would have made it the newest). (3) The hidden escape — `resendVerification` (`email-actions.ts:42-…`) enqueues to the session's (new) address and would fix the state, but only via the gate dialog a blocked action raises, and inside the hour it hits the same per-user ceiling.
Why it stands: once addresses can move, "newest row" stops meaning "about this address", and the one reader that drives the banner never checks.
Live check run: none new (C4's read-only window count: max 4 verify rows in an hour for one member; 2 `account.email_change` audit rows).
Corrections to the finding: none.
Orchestrator action: the local throwaway repro in the finding (never on the shared DB's real rows).

### C4-03 — CONFIRMED-CORRECTED (Low; reachability near-nil)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on mechanism; possible on reachability
Citations re-derived: `change-email-actions.ts:133-136` correct; `email-queue.ts:191-194` (claim on `{ id, status: "queued" }`, no `to`) correct; `render(row)` → `mintToken(row.userId, kind, row.to)` `:601` correct; `sendMail({ to: row.to, … })` `:333`; the `sent` write `:339-352` leaves `to` alone; drain read `:832-841` → `claimAndSend(next)` `:844`; `verificationMailState`'s `scheduleSend(row)` path `:1046-1051`.
What I tried to refute it with: the precondition — a QUEUED verify row to the old address at the instant of the move. Through the app's UI that state is essentially unreachable: the move is offered only in the bounced state (C4-02's own premise), i.e. when the newest verify row is a failed bounce, and the fold guarantees that any queued/sending row would itself be the newest (so the banner would read it and show no "Use another email"). The only UI path is a stale bounced banner in one tab after a gate-dialog resend in another created a queued row (and that row is sent inline when budget exists, so it stays queued only on a budget-exhausted day, when the drain is not sending verify mail either). A direct POST to the action can produce it, but then the consequence lands on the caller.
Why it stands (narrowly): the claim is genuinely not fenced on the address it is about to use, and the move's own comment designs for exactly this re-address; the race is real code, the trigger is contrived.
Live check run: none possible.
Corrections to the finding: severity stays Low but "Low, hardening": fold into C4-02's unit as the one-line `to: row.to` fence on the claim; do not schedule it as its own item.
Orchestrator action: none.

### C4-04 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `trivia-log.ts:55-63` and `:78-86` (`maxAge: 30 days`, set by `triviaBrowserId` on the first QUESTION) correct; privacy page `:196-199` (cookie paragraph: sign-in, theme, the short visit cookie, analytics) and `:62-66` ("Once you join, they are linked to your account") correct; `export/route.ts` has no `trivia`/`triviaEvent` reference (grep); `linkTriviaToMember` `:167-187` correct.
What I tried to refute it with: whether the cookie paragraph was ever complete: it was not — `rv_trivia_pass` (`trivia-actions.ts:138`, 30 min) and `rv_human` (`human-pass.ts:29`) were already missing before `42ec6fe7`; those two are strictly functional, `rv_trivia_id` at 30 days with a stated statistics purpose is the one whose omission now matters.
Why it stands: a public cookie list and a public "download your data" promise that the gate log made incomplete.
Live check run: none needed.
Corrections to the finding: the export half is an extension of T6-03 (export omits telemetry rows about the member) and should ride T6-03's fix unit; the cookie half stands alone. Note the paragraph also omits the two functional gate cookies.
Orchestrator action: none.

## Extends lines

- **C1 → V-T7a-03 (five probes' `"Session"` cleanup)** — HOLDS. `phase3-probe.mjs:63` and `phase4-probe.mjs:75` delete from `"Session"` with no `.catch`; live `to_regclass('public."Session"')` is NULL; both are followed by the `User` delete (`:64`, `:81`); `phase6-probe.mjs:33` and `phase7-probe.mjs:33` catch theirs; `phase6-probe.mjs:34` deletes `LoginAttempt WHERE identifier = …`, a column that does not exist (live columns `createdAt, detail, email, id, ok, reason, userId`), swallowed. Oldest batch group live = "Batch of 2023", 41 members. `git grep probe.invalid -- src` → nothing. One nuance: "because `:76` (GroupMember) comes after the throw" is beside the point — the user row itself survives, so every membership survives with it.
- **C1 → T7b-05 (manual snapshot runs)** — HOLDS. `snapshot.mjs:47-56` (no `--day` → yesterday, `BACKFILL` false), `:340-351` upsert overwriting; dry only with `--dry`.
- **C2 → L4-02 (production-silent writers)** — HOLDS. `trivia-log.ts:139` and `:179` log only when `NODE_ENV !== "production"`.
- **C2 → L11-02 (copies outliving erasure)** — HOLDS. `scripts/dev/.magazine/` 225 MB, `scripts/dev/.exports/catchups/` 31 MB with five dated folders (2026-09-05 … 2026-10-11), both ignored by `.gitignore:110`; `5d5c6898` deleted the magazine.
- **C3 → V-L-b-01 (bells after the committed write)** — HOLDS. `notifyMentioned` call sites at `feed/actions.ts:310`, `:424`, `:786`, `:1031`, each awaited after the primary write and uncaught; `notifyMember` is a bare `notification.create` (`post-notifications.ts:29-31`); `publishDraft` updates by id alone (`:409-412`) after a status read (`:392-394`), so a double publish runs `notifyMentioned` twice and the "told once" read (`mention-notifications.ts:114-121`) cannot see the other call's rows.
- **C3 → V-T2-01 / L10-01** — HOLDS (a statement of non-overlap: the gate fix does not fix C3-01 and vice versa).
- **C4 → T5-05** — HOLDS. `trivia-actions.ts` is now 158 lines; the cited `:179` and `:269-281` no longer exist (V-DRIFT's "lines unchanged" predates `42ec6fe7`). `rv_trivia_id` lives 30 days (`trivia-log.ts:63, :84`), `rv_trivia_pass` 30 minutes (`trivia-actions.ts:30, :138-144`), and `hasPassedTrivia` needs both (`:149-158`), so the dead end is now 30 minutes from the PASS. The finding stands with re-based lines.
- **C4 → L5-02 (LoginAttempt cap)** — HOLDS. `login-attempt.ts:47` `FAILURE_ROWS_PER_HOUR = 120`, retention `securityLogs` 365 days (`retention.ts:53`, `:128-129`): 1,051,200 rows × ~504 B ≈ 530 MB steady state, ~1.45 MB/day at the cap, ~150 days to the 350 MB alarm. Combined with C4-01 at both caps: ~8.5 MB/day.

## New candidates

None standalone. One defect surfaced while checking C2-01 is folded into C2-01's corrections rather than filed separately, because its only realistic trigger is C2-01's stall: `updateAvatar`, `removeAvatar` and `adminRemovePhoto` delete the old bytes through `purgeImageUrls` with no `PendingImagePurge` row written first (`avatar-swap.ts:20-36`, `image-purge.ts:53-61`, `collection/actions.ts:1189`), so a function that dies mid-delete orphans them for good — unlike `deletePostWithImages` and `erasePhoto`, which write the worklist row in their transaction.

## Cross-zone notes

- **T4a (V-T4)**: T4a.md:218's verified-clean line about the photograph applier is wrong in the protocol's sense (C1-04): it skips bad rows, it does not refuse the batch.
- **T6 (V-T6)**: C2-02 is T6-03's fourth bullet; C4-04's export half (the member's `TriviaEvent` rows) belongs in T6-03's unit too.
- **L5 / V-L-c**: V-L-c.md:275's peer note ("the L5-02 class is handled there") is overturned by C4-01; the per-hour cap is not a size bound under a 365-day retention, for `TriviaEvent` and (C4's Extends) `LoginAttempt` alike.
- **L12 (L12-06)**: C1-01 confirms the LAN exposure L12-06 relies on, with two facts: the macOS firewall is off on this machine, and `next.config.ts:272` widens `allowedDevOrigins` to all RFC1918 ranges; Next's cross-site block never covers `/api/*`.
- **T5 / L9**: `src/lib/gate-coverage.test.mjs:42` documents `getTriviaQuestion` as "(per-IP limited)"; it has no limiter.
- **C1-02 vs its own Extends**: while the `"Session"` throw stands, the stage-1 admin bell links to a probe account that still exists, not a 404.

## Coverage

- Checked completely: C1-01, C1-02, C1-03, C1-04, C1-05, C1-07, C1-08, C2-01, C2-02, C2-03, C3-02, C4-01, C4-02, C4-03, C4-04, and all eight Extends lines (C1 ×2, C2 ×2, C3 ×2, C4 ×2).
- Checked as assigned (brief): C3-01 — severity and the second-press claim only; mechanism left to the orchestrator's own verification.
- Skipped by instruction: C1-06 (owner-declined).
- Duplicate sweep: grepped `candidates.md`, every `verdicts/*.md` and every `reports/*.md` for each finding's distinctive symbols (dev-login/loopback, probe names, `npm-audit-gate`, `S3Client`/R2 timeout terms, export stream, SETUP/AGENTS, `startEdition`/`closeAndPublish`, `TriviaEvent`/`trivia-log`, `swapPhotoUrl`/`purgeImageUrls`); one hit (C2-02 = T6-03).
- Live, read-only: `lsof` on :3000; `socketfilterfw` state; newest published post authors; `pg_indexes` and `information_schema.columns` on `Report`; every `RESTRICT`/`NO ACTION` FK in the database; `Report` rows by status with live reporters; `Place` count; `to_regclass('"Session"')` and `LoginAttempt` columns; oldest batch group and size; `TriviaEvent` indexes, columns, count; `pg_database_size`; session `TimeZone`; `pg_column_size(ROW(…))` for both trivia row shapes. No writes, no gates, no browser, no sign-in, no script under validation run.
- Not verified: whether a Vercel WAF rule exists (dashboard); `AWS_DEFAULTS_MODE` in the Vercel environment (dashboard); C1-07 and C4-02 in a browser (rules).

STATUS: COMPLETE
