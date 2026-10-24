# Entries, phases G to M (High and Medium, open)

## Phase G

#### L7-02 — On an iPhone, tapping into a small text field zooms the page and leaves it zoomed
**Medium** · **Suspected** (one real iPhone tapping "Write a comment…" settles it, or Playwright `webkit` in the iPhone 13 profile reading `visualViewport.scale` after the tap; the font sizes themselves are read from source)
- **Where:** `src/app/layout.tsx:63-68` (viewport sets no `maximumScale`); `src/components/posts/comments-section.tsx:584-587` (comment textarea `text-sm`); `src/components/layout/search-pill.tsx:228-240` (`text-[13.5px]`); `src/components/ui/combobox.tsx:42-48` (onboarding city picker, `text-sm`). The report (`reports/L7.md`, L7-02) lists nine more: profile pens, poll options, filter search, batch-range selects, house picker, message composer, song answer, support amount, an admin select.
- **What happens:** iOS WebKit zooms any field under 16px on focus. The comment box, header search, a new member's city picker and every profile field are 13-15px at phone width, so the page magnifies on tap and stays magnified with a sideways scroll until the member pinches back.
- **Fix direction:** 16px at phone width, the design size from `md:` up, the way `ui/input.tsx`/`ui/textarea.tsx` already do; include the pens, which inherit their row's 15px while editing. `maximumScale: 1` also stops it but kills pinch-zoom: a design-system decision, not the fix. Drop the report's "the owner is on Android so nobody saw it" premise (`next.config.ts:268-271` exists for real-iPhone testing).
- **Pin it:** a sweep in the protocol audit (`scripts/qa/protocol-audit.mjs`): any input, textarea, select, `ComboboxInput` or contentEditable whose unprefixed font size resolves under 16px fails.
- **Travels with:** —

#### T5-01 — A member whose mistyped signup address does not bounce can never correct it; the app's advice points at edits that do not exist
**Medium** (re-ruled from High: `c41893f0` fixed the bounced case) · **Confirmed** (source; data: 24 unconfirmed members, none on a common typo domain yet)
- **Where:** `src/components/auth/verify-email-banner.tsx:274-281` ("Use another email" exists only in state `bounced`); `src/app/(main)/admin/mail/actions.ts:53-56` (`retryMail` writes `RETRY_RESET`, never `to`; sends go to the frozen `row.to`, `src/lib/email-queue.ts:333, 508, 601`); `src/components/auth/email-actions.ts:110` ("Check the email address on your profile"); `src/app/(main)/admin/people/actions.ts:93` (admin editor refuses email by design).
- **What happens:** a typo that delivers to someone else's real inbox, or ends `failed`/`suppressed` rather than bounced (L11-05), leaves the member unconfirmed for good: resend and the admin's Retry go to the frozen address, the profile row the copy points at edits only the display address and says "Saved" (T6-06), reset answers ok and mails nobody, and there is no signed-in password change. Their only exits: write to the owner from /messages, or the owner deletes the account so they sign up again.
- **Fix direction:** an admin "change their sign-in address" verb on the person page (signup's canonical form, refuse a `lower(email)` collision, `emailVerified: null`, re-address queued verify rows the way `change-email-actions.ts` already does, an audit line); `retryMail` or `render()` re-resolves `to` from the user row when `userId` is set; fix the "on your profile" copy (the report's third copy target, the stale-link lines in `verify-client.tsx` / `reset-client.tsx`, became reachable with `c41893f0` and is now right). Self-service change outside `bounced`, and an in-app password change, are the owner's call.
- **Pin it:** `src/lib/mail-policy.test.mjs`: a retry of a row whose user's email changed targets the current address; extend `src/lib/email-normalization-rule.test.mjs` to the new writer; a string test that `email-actions.ts` no longer promises a profile edit.
- **Travels with:** T6-06 (the profile row that makes the copy a trap)
- **Owner question:** Q3.

#### T5-04 — Simultaneous tokenless sign-ins all pass the five-an-hour allowance, and the eventual refusal gives the wrong advice
**Medium** · **Confirmed** (source)
- **Where:** `src/lib/auth.ts:175-181` (read at :175, spend at :178, verdict at :179-181; the comment at :176-177 claims a racer "cannot outrun its own meter"); `src/lib/rate-limit.ts:300-324` (`hasBudget` reads, `consume` spends: two separate Upstash calls); `src/lib/rate-limit.ts:42-46` (`login-account`'s "stopped by the tenth guess" has the same burst gap); `src/app/(auth)/login/login-client.tsx:177-183`.
- **What happens:** N concurrent tokenless sign-ins from one address all read "budget left" and all get a bcrypt-checked guess; only the next sequential attempt is refused. Each costs a cost-12 bcrypt (~0.25 CPU-s, the dummy compare at `auth.ts:210` for unknown addresses). Once the allowance is spent the member is told "Refresh the page and try once more", the exact loop `turnstile-widget.tsx:31-36` calls the bug.
- **Fix direction:** this meter spends on success and failure alike, so replace the pair with one atomic `rateLimit("login-unverified", ip)`. Give the spent allowance its own `CredentialsSignin` code and a sentence ("try again in an hour, or from a network where the check can load"). For the failure-only meters (`login-ip`, `login-account`, `reauth`), either state the burst window in the comment or spend-then-refund, and correct `rate-limit.ts:42-46`.
- **Pin it:** `src/lib/security-regressions.test.mjs`: `auth.ts` must not contain `hasBudget("login-unverified"`; a login-client test that the new code maps to its own sentence.
- **Travels with:** —

#### T5-05 — Thirty minutes after passing the entry question, the signup form dead-ends with a question that is no longer on screen
**Medium** · **Confirmed** (source)
- **Where:** `src/components/auth/trivia-actions.ts:30` (`TOKEN_TTL_MS` 30 min), `:137-144` (pass cookie `maxAge` 30 min), `:149-158` (`hasPassedTrivia`); `src/components/auth/actions.ts:24-26` (refusal); `src/app/(auth)/signup/signup-client.tsx:29, 175` (`step` only ever goes trivia → register).
- **What happens:** a member who takes over half an hour on the nine fields and the three policy documents the consent line asks them to read presses Join and gets "Please answer the entry question before signing up." with no question on the page; the only way out is a reload, which loses everything typed.
- **Fix direction:** on that refusal, return to the trivia step while keeping the form's values, and say so; consider a longer pass window (the pass is browser-bound and buys a bot one rate-limited attempt). At HEAD (`42ec6fe7`, after the validators) the `rv_trivia_id` cookie lives 30 days (`src/lib/trivia-log.ts:62-90`), so the report's "30 minutes from the FIRST attempt" half is gone: the window now runs from the pass.
- **Pin it:** extract the "gate refusal → trivia step, fields kept" rule into a pure module and unit-test it.
- **Travels with:** —

#### T5-07 — A room of alumni on one network is refused at signup and told to wait "a minute" for a window of ten minutes to an hour
**Medium** · **Confirmed** (source for the meter sizes and the copy; data: `dig` finds no AAAA record, so phones on IPv6 carriers share a NAT64 address). Whether a launch-day room actually trips it is load-dependent.
- **Where:** `src/lib/rate-limit.ts:84` (trivia 8 per 10 min per IP), `:75` (signup 10/h), `:79` (reset 5/15 min), `:70` (login-unverified 5/h); `src/lib/rate-limit-message.ts:8` ("Give it a minute and try again."); `src/components/auth/trivia-actions.ts:101-106`; `src/components/auth/actions.ts:106-107`.
- **What happens:** thirty alumni at a reunion venue, staff on the campus network, or members on one carrier's NAT each need a trivia check; the ninth in ten minutes is refused, waits a minute as told, and is refused again. "A minute" is right only for `search`.
- **Fix direction:** the sentence names no duration (or the refusal carries its window class so it can be honest per meter); raise `trivia` to about 20 per 10 min and `signup` to about 30/h per IP, as signup's own comment argues. Drop the report's "Jio/Airtel are mostly IPv6, which helps": with no AAAA record it hurts.
- **Pin it:** a `rate-limit-message` test that the sentence names no duration; a LIMITS test that trivia's hourly allowance is not below signup's.
- **Travels with:** —

#### T5-09 — With only the Turnstile secret configured, nobody can sign up or reset a password, and sign-in drops to five an hour per address
**Medium** · **Confirmed** (source)
- **Where:** `src/lib/turnstile.ts:65-67` (comment: the server "stays consistent by skipping verification too"), `:77-80` and `:145-156` (`checkTurnstile` skips only when the SECRET is missing); `src/components/auth/turnstile-widget.tsx:236` (no site key → no token sent); `src/components/auth/actions.ts:33-34` and `src/components/auth/email-actions.ts:244-246` (hard refusals).
- **What happens:** expected, a missing site key degrades to "no bot check". Actual: with `TURNSTILE_SITE_KEY` unset and the secret set, signup and reset refuse every human with "Refresh the page and try once more" and no widget on the page; sign-in falls to the `login-unverified` allowance (`src/lib/auth.ts:137-186`). The only trace is a `console.warn` per refusal (T5-02).
- **Fix direction:** one `turnstileConfigured()` (both keys present) read by `turnstileSiteKey()` and `checkTurnstile()`; exactly one key set → report through `reportSwallowed` and fail open. The reverse asymmetry already fails open and logs.
- **Pin it:** a pure mode-decision module with a unit test over the four env combinations.
- **Travels with:** L10-03 (a Cloudflare challenge outage closes the same two doors; same fix family)

## Phase H

#### L3-02 — The Catch-ups export, the safety copy taken before every destructive Catch-ups migration, records every timestamp shifted by the laptop's time zone
**Medium** · **Confirmed** (data: the same Catch-up's `createdAt` is 5 h 30 m early in the 09-14 export and 1 h early in the 10-11 export against the live row read `::text`)
- **Where:** `scripts/dev/export-catchups.mjs:81` (`new pg.Client`, no type-1114 parser), `:85` (`iso()` over node-pg's local-time parse); `src/lib/catchups-export.ts:1-30` (the "totally regeneratable", "Dates are ISO strings" promise); `scripts/dev/.anon-cleanup/apply.mjs:127, 146, 157` (gitignored one-off undo file, same shape).
- **What happens:** expected, an archive a rebuild can trust. Actual: every timestamp is shifted by whatever zone the laptop is in (IST in September, BST in October, right only in GMT months), so a rebuild would move every deadline and publication and can put a small-hours deadline on the wrong valley day. The nightly `pg_dump` is correct and remains the real floor.
- **Fix direction:** one shared helper (beside `_env.mjs`) that installs `pg.types.setTypeParser(1114, s => new Date(s.replace(" ", "T") + "Z"))`, used by every raw-pg script including `run-sql.mjs`; or select timestamps `::text` the way `redate.mjs` does. Then mark the five existing exports as shifted (or re-take them) and fix the anon-cleanup undo file before anyone trusts it.
- **Pin it:** a `scripts/qa` rule test that every `new pg.Client`/`new pg.Pool` under `scripts/` goes through the shared helper, in the style of `scripts/qa/hand-run-passes.test.mjs`.
- **Travels with:** —

#### L4-01 — A missing column on any Catch-up table makes all of Catch-ups say "not set up yet", stops the engine, and alerts nobody
**Medium** · **Confirmed** (executed: `isMissingTable` imported in Node at HEAD returns true for a P2022 "column CatchupEntry.x does not exist"; data: two Catch-up column drops pending on the shared database)
- **Where:** `src/lib/prisma-errors.ts:50-57` (the `/does not exist/` message fallback matches a column as well as a table); `src/lib/catchups-core.ts:1290-1292` (`isMissingCatchupTable`); `src/lib/catchups.ts:320, 494` (the engine returns before its `reportSwallowed` at :329; also `src/lib/batch-catchups.ts:265, 399`); `src/app/(main)/catchups/actions.ts:205-206` (`runAction`).
- **What happens:** if a `Catchup*` column is dropped before the code stops naming it, or a new field reaches production before its `ALTER TABLE`, every member sees "Catch-ups are almost ready. Check back in a moment." on five pages (index, home, reader, new, join; lines in `verdicts/V-L-b.md` L4-01), every Catch-up action says "not set up for this community yet", Editions stop moving, and nothing reaches Sentry. The owner hears of it when a member asks.
- **Fix direction:** narrow `isMissingTable` to P2021/42P01 (or a `relation "…" does not exist` message) so a column error is never matched; better, retire the guard, since the tables exist. Any branch that keeps a friendly screen must call `reportSwallowed`. The two pending drops (`2026-10-11-drop-song-columns.sql`, `2026-10-17-drop-rhythm-columns.sql`) are already gated in their headers on the deploy going live; the ADD direction is unguarded.
- **Pin it:** `src/lib/prisma-errors.test.mjs`: a P2022/42703 "column Catchup….x does not exist" is not a missing table. Tighten the swallow sweep in `src/lib/catchup-lifecycle.test.mjs:349` (it passes today because `reportSwallowed(` appears after the early return) and extend it to `catchups/actions.ts` and the five pages.
- **Travels with:** T2a-04 (the console-only catch in the same `runAction`)

#### L7-09 — A voice answer the member removes while it is still saving comes back onto their answer; a double tap leaves the microphone on
**Medium** · **Confirmed** (source; the local repro is in `reports/L7.md` L7-09: Slow 4G, record, Done, bin within a second, reload)
- **Where:** `src/components/catchups/answer/voice-recorder.tsx:226-249` (`send`'s `.then` calls `onStored(stored)` unconditionally; `l.uploading = run` overwrites the previous run), `:449-461` (`remove` calls `onStored(null)` at once), `:262-289` with `:311-322` (`start` checks `l.recording` before the `getUserMedia` await, sets it after), `:801-830` (mic enabled through "asking"; Record again and Remove enabled while saving).
- **What happens:** a member records, presses Done, then taps the bin while "Saving the recording.": the box says "Recording removed", the answer is saved with no audio, then the upload lands and saves it again with the audio, so the batch can play what they took back. A second mic tap during the permission prompt starts two recorders into one chunk array (a garbled file) and leaves one microphone open after Done for the life of the tab.
- **Fix direction:** one generation counter bumped by `start`, `remove` and unmount; every continuation (`getUserMedia` resolution, `send`'s `.then`, `onstop`) checks its own generation and, if stale, stops what it holds and delivers nothing. Disable the mic while asking; a stale upload that lands deletes itself or is followed by `onStored(null)`; `settle()` awaits every run in flight; move `send` out of the state updater in `retry` (`:463-469`, double upload under Strict Mode).
- **Pin it:** the recorder transitions as a pure reducer with a `node:test` that an `uploaded` from a removed or superseded recording emits no `onStored`, and a second `start` while asking is a no-op.
- **Travels with:** —

#### T2a-02 — Renaming a Catch-up never reaches its notifications: every bell keeps announcing it by the original name
**Medium** · **Confirmed** (source; data: 0 of 22 Catch-ups carry a `title` today, so no member has hit it yet)
- **Where:** `src/app/(main)/catchups/actions.ts:670-673` (`renameCatchup` writes `title` only; its docblock at `:650-651` says the rename "reaches nobody"); `src/lib/catchups.ts:111, 127` (`loadMeta` takes `group.name`) and `:394-401` (`openEdition`'s bell); the action notify sites `actions.ts:1062-1068, 1120-1126, 1152-1159, 1186-1192, 1707-1716, 1842-1850, 2152-2157`; `src/lib/catchups-core.ts:391-393` (`catchupDisplayName`, what the pages print).
- **What happens:** a Keeper renames "asdf" to "Old friends"; every page shows the new name, but every bell (Edition started, answers open, reminders, ready to read, sealed, hearts, comments, "added you") still says "asdf", for ever. Since `eb855c71` any member of a people Catch-up can start an Edition, so any of them can send the stale name out.
- **Fix direction:** thread `catchupDisplayName(title, group.name)` into every notify context (`loadMeta`, `openEdition`, `loadCatchupContext`, the action sites). Do not rewrite `Group.name` instead: `renameCatchup`'s contract (`:665-668`) is that clearing the title goes back to the group's name, which a rewrite would destroy. Correct the "reaches nobody" docblock.
- **Pin it:** a `src/lib/catchup-lifecycle.test.mjs` pin that every `notify*` call site passes a name derived through `catchupDisplayName`; a unit test on the questions-open sentence with `title` set.
- **Travels with:** T3-09 (the join page and its toast print `group.name`; same root, T2a-02 canonical)

#### T2a-07 — A Keeper who ends a Catch-up mid-week strands that week's answers where nobody can ever read them
**Medium** · **Confirmed** (source)
- **Where:** `src/app/(main)/catchups/actions.ts:793-796` (`endCatchup` writes `status: "ended"` and leaves the live Edition alone); `src/lib/catchups.ts:262` (an ended Catch-up's Edition never advances); `src/lib/catchups-edition-view.ts:98` (the reader needs `published`); `src/lib/catchups-core.ts:720-735` (`overdueEditionWhere` excludes ended, so the admin room never flags it).
- **What happens:** End during collecting or answering leaves that Edition there for good: the home says "Ended", the Edition URL says not yet published, the admin room shows "Taking answers" under an "Ended" chip. Each writer can still pull their own words from the account export; nobody else ever sees them. The End row (`src/components/catchups/settings/settings-surface.tsx:254-256`, "Nothing new starts. It stays readable") is offered in any Edition state, and its confirm (`:694`, "Everything already out stays readable") does not mention the live Edition. People Catch-ups only (batch ones cannot be ended).
- **Fix direction:** the owner's call between publishing a live Edition first (reuse `closeAndPublish`'s non-capsule branch; a capsule seals), refusing to End while answers exist, or saying plainly they are discarded. Publish-first matches his 2026-10-17 "it ends when it ends". Trap: `closeAndPublish` on a zero-answer Edition re-sets the deadline instead of publishing (C3-01), so the End path must not inherit that branch.
- **Pin it:** a lifecycle test on `endCatchup` with an answering Edition holding an entry.
- **Travels with:** —
- **Owner question:** Q2.

#### T3-04 — After a failed answer save, "Click away and back to try again" does nothing unless the text changes
**Medium** · **Confirmed** (source)
- **Where:** `src/components/catchups/answer/answer-card.tsx:97-102` (`flushBody` returns at `:99` when the text equals `savedRef`, which `:100` advanced before the save); `:205-209` (the red line); `src/components/catchups/answer/answer-experience.tsx:141-146` (the `{ error }` branch never rewinds the card's ref); `answer-card.tsx:83-91` and `:173` (the voice transcript and songs field call the same `flushBody`).
- **What happens:** after a dropped connection, deploy skew or an expired session, the member blurs the field again as told and nothing is sent; Next/Share is the same no-op; the line stays "Not saved" and, if they leave, the paragraph is lost. One answering Edition is live (Batch of 2024, 44 members).
- **Fix direction:** `savedRef` records what the server accepted (set it on success), or `flushBody` always sends while the last status is failed. Separate the refusals a retry cannot fix ("closed", "stale", whose own sentence says reload) from transient ones: only the latter should invite a retry.
- **Pin it:** a pure `shouldFlush(value, lastAccepted, lastStatus)` extracted from `flushBody`, unit-tested.
- **Travels with:** —

#### T3-05 — The "Back to the Catch-up" pill after the last answer links to the page the member is already on
**Medium** · **Confirmed** (source, including Next 16's router: a same-URL navigation keeps `AnswerExperience` mounted; one browser press would show it)
- **Where:** `src/components/catchups/answer/completion-card.tsx:55-57` (`<Link href={/catchups/${catchupId}}>`); `src/components/catchups/answer/answer-experience.tsx:56, 60` (`index` state; the card is `index === total`, drawn at `:254`); `src/components/catchups/home/catchup-home.tsx:248-256` (answering is drawn on the home, no `key`).
- **What happens:** after Share on the last question, the one primary pill navigates to the current URL; the client state that put the card there survives, so the card stays (at best a refetch flicker). It was written when answering was its own page (`[catchupId]/answer/page.tsx:28-35` is now a redirect shim).
- **Fix direction:** make the pill go somewhere true: back to the questions (`goTo(0)`), to `/catchups`, or drop it and let the marks be the way back.
- **Pin it:** an e2e on a throwaway answering Edition (answer every question, press the pill, assert the URL or the view changes).
- **Travels with:** — (T3-18 is the same end screen; worth doing in one sitting)

#### T3-11 — Scrolling a published Edition re-renders every answer and re-parses every answer's text on most frames
**Medium** · **Suspected** (the re-render cadence is certain from source; whether it is perceptible jank needs `performance_start_trace` on the 133-answer Edition at 390x844 while flick-scrolling)
- **Where:** `src/components/catchups/edition/reader.tsx:358-364` (`useSpy`'s `setSpy`, firing every ~0.5 % of a question's height or 0.2 % of the page), `:458` (`spy` held in `EditionReader` state), `:736-748` (every `Section` re-created with fresh ref arrows; `Tile` `:157-217`, `Section` `:227`, no `memo`); `src/components/catchups/edition/reader-parts.tsx:176` (`renderRichText(text, { linkRanges })` in render, no `useMemo`).
- **What happens:** expected, scrolling costs the spy's rect reads and a strip update. Actual: every qualifying frame re-renders all 133 tiles of the largest live Edition and re-runs each body's link scan. One hostile 6,000-character answer costs ~0.22 s per scan (L6-05), so at this cadence it freezes the reader on a phone.
- **Fix direction:** keep `within`/`progress` out of React state (motion values, as the navigator's swell already does), keep only `current`/`labelled` in state; `memo` `Section`/`Tile` with stable ref callbacks; `useMemo` the `renderRichText` result on `text`.
- **Pin it:** a source rule that `Body` memoises `renderRichText`, plus the trace numbers recorded in the fix commit.
- **Travels with:** — (L6-05 is the link-scan cost this multiplies; either fix alone defuses the freeze)

#### T3-17 — A Keeper can no longer copy a Catch-up's invite link; the join page still works for links nobody can get
**Medium** · **Confirmed** (source; data: 1 active people Catch-up carries a token no screen shows)
- **Where:** `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:426` (`inviteToken` shipped to the client, read by no component); `src/components/catchups/home/types.ts:82-84` (comment describes a "Keeper's invite card"); `src/components/catchups/home/people-door.tsx` (rows, Keeper/Remove, `AddSomeone`; no invite); still live behind it: `src/app/(main)/catchups/actions.ts:587` (`joinCatchupByToken`), `src/proxy.ts:39, 217-220, 296`.
- **What happens:** since build phase 7 (`e8307e39`, 2026-09-09) deleted `people-panel.tsx`, a Keeper of a people Catch-up can add only people who already have accounts; a friend who has not signed up cannot be brought in, though every new people Catch-up still mints a token and the join route, its sign-up path and `welcome/page.tsx:54-57` still honour one.
- **Fix direction:** owner's call: restore a Keeper-only "Copy invite link" row in the People door on an active people Catch-up (hidden on batch and ended, as `types.ts:100-105` already says), or retire the join route, `joinCatchupByToken`, the proxy entries and the column in a dated cleanup and correct spec §7.6 / architecture.md:370.
- **Pin it:** extend `src/lib/people-search-rule.test.mjs` to fail when no component under `src/components/catchups/` reads `inviteToken` (or, if retired, when the route still exists).
- **Travels with:** —
- **Owner question:** Q11.

#### T3-18 — A member who leaves one question blank can never finish: "Share" on the last question always sends them back to it
**Medium** · **Confirmed** (source)
- **Where:** `src/components/catchups/answer/answer-experience.tsx:96-107` (`advance` on the last prompt jumps to the first unanswered one, stateless per press), `:69-75` (`answeredIds`); `src/components/catchups/answer/answer-card.tsx:104-108` (the pill is never disabled because skipping is designed in) and `:225-231`.
- **What happens:** a member answers 1, 3 and 4 of 4 and leaves 2 blank on purpose; Share on 4 lands on 2, Next takes them to 3 and 4, Share sends them to 2 again, for ever. The completion card never comes and nothing tells them their answers are already saved. Live: one answering Edition, 52 answers so far.
- **Fix direction:** sweep back once per pass (remember prompts already swept to and show the card on the next Share), or show the card on Share and list what is still blank with a way back to each. The loop has to go either way.
- **Pin it:** a pure `nextIndex(index, total, answered, sweptTo)` with a unit test for the deliberate-skip case.
- **Travels with:** — (T3-05 is the same end screen; worth doing in one sitting)

#### T3-19 — On a phone the control that takes a photograph off an answer is invisible
**Medium** · **Confirmed** (source: the class list and Tailwind 4's `hover:` variant, which sits inside `@media (hover: hover)`)
- **Where:** `src/components/catchups/answer/photo-attachments.tsx:123-130` (class at `:126`: `opacity-0 … group-hover:opacity-100 focus-visible:opacity-100`); `:118-122` with `src/components/common/photo-aim.tsx:146` (the crop button beside it returns null when nothing is cut); for contrast `src/components/catchups/home/people-door.tsx:169` (`[@media(hover:hover)]:opacity-0`).
- **What happens:** on a touch screen the remove button is an invisible 24px target in the corner of the photograph, so a member who attached the wrong picture sees no way to take it off and it goes out with the Edition. 13 of 52 answers on the live answering Edition carry photographs.
- **Fix direction:** the People door's form (`[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100`), or always visible as in the feed composer (`posts/create-post-form.tsx:885`).
- **Pin it:** a protocol-audit or grep rule over `src/components` that flags `opacity-0` paired with `group-hover:opacity-100` without a `(hover:hover)` or coarse-pointer guard.
- **Travels with:** —

#### T7b-15 — Every Catch-up deadline names a day on which answering is already shut, and the last reminder says "tomorrow" and is never withdrawn
**Medium** · **Confirmed** (source and executed: the pure `answerReminderMessage`/`computeStatus` calls in the report; data: the live answering Edition closes 2026-10-25 01:30 UTC)
- **Where:** `src/lib/catchups-core.ts:323` (deadline 01:30 UTC = 07:00 IST) with `:637-668` (`computeStatus`: answering ends at 06:55 IST); the words `:1226` (home), `:1266` (list card), `src/components/catchups/settings/settings-surface.tsx:187, 195` (Keeper row); the bell `catchups-core.ts:1097-1106` written by `src/lib/catchups-notify.ts:242-248`; the publish transition `src/lib/catchups.ts:162-164` deletes no `catchup_reminder`.
- **What happens:** the page says "Answers close Sunday 25 October" while answering ends at 06:55 IST that Sunday, 18:25 Saturday in California; the final reminder, written 07:00 IST the day before, always reads "Answers close tomorrow" (the "Last day to answer" branch is unreachable for a snapped deadline) and stays unread on the badge after the close until the 30-day sweep. Since `6fb896bd` reminders are opt-in (14 members), but the page wording reaches everyone.
- **Fix direction:** name the last full day ("Last day to answer: Saturday 24 October") or the hour on every surface; phrase `answerReminderMessage` against the same last day; delete `catchup_reminder` rows for the Catch-up in the answering → published/sealed transition and for the author in `submitEntry`, with the same type+link delete the extend path uses (`src/app/(main)/catchups/actions.ts:1321-1326`).
- **Pin it:** `src/lib/catchups-core.test.mjs`: the reminder written at close − 23.5 h must not name the close day as available, and `homeStateLine` must name a day on which `computeStatus` still returns `answering` at noon IST; a notify test that publishing leaves no `catchup_reminder` for the Catch-up.
- **Travels with:** —
- **Owner question:** Q9.

## Phase I

#### T7a-03 — No admin screen shows that a member has asked to delete their account, so an admin can merge a duplicate into an account about to be erased
**Medium** · **Confirmed** (source; data: one member has a deletion request maturing about 2026-12-04 and reads as an ordinary verified member in the admin)
- **Where:** `src/app/(main)/admin/people/actions.ts:351-356` (`adminMergeUsers` reads the target as `{ id, photoUrl }`, no `deletionRequestedAt` or `isBlocked` check); `src/app/(main)/admin/people/[id]/page.tsx:33-60` (the select omits `deletionRequestedAt`); `src/lib/admin-people.ts:38-43, 159-173` (no "leaving" state or field); `src/components/admin/people/person-detail.tsx:176-274` (Standing says nothing of it).
- **What happens:** expected, the "leaving" state the directory and search already hide is visible to the admin. Actual: a member who asked to leave looks normal on /admin/people and their page, cannot be filtered for, and the only trace is a line deep in /admin/audit. An admin who merges a duplicate signup into that account moves every post, photograph, answer and contribution into a row the sweep erases on the due night, with no confirmation.
- **Fix direction:** select `deletionRequestedAt` into `PersonRow` and the detail; a "Leaving <valley date>" chip and Standing fact; a `leaving` filter in `STATE_OPTIONS`/`peopleWhere`; `adminMergeUsers` refuses (or asks again for) a target with `deletionRequestedAt` set or `isBlocked: true`.
- **Pin it:** a shape test in `src/lib/admin-rule.test.mjs` that the person page's select and `adminMergeUsers`' target read both name `deletionRequestedAt`.
- **Travels with:** —

#### T7a-06 — An admin's "Remove verification" undoes itself the next time the member, or the admin, touches the account
**Medium** · **Confirmed** (source)
- **Where:** `src/app/(main)/admin/people/actions.ts:633-657` (`adminUnverifyUser` writes `verifyState: "unverified", verifyMethod: null`); `src/lib/roster.ts:57` and `:85-93` (the roster CAS admits `unverified`/`pending`); callers `src/components/auth/verification-actions.ts:49`, `src/components/profile/profile-actions.ts:247-248`, `src/components/auth/email-actions.ts:218, 424`, and the admin's own `admin/people/actions.ts:189`.
- **What happens:** an admin removes verification from a member who is on the office roster; the member presses "Ask to be verified", edits their name or batch, completes a password reset, or the admin corrects their name, and the row is silently back to `verified` / `office_list`. The audit log shows `admin.unverify` and nothing after it; the roster's writes are not audited.
- **Fix direction:** give the admin's refusal a state the roster refuses: `adminUnverifyUser` writes `verifyMethod: "admin_withheld"` (keeping `unverified`) and the roster's CAS and pre-check require `verifyMethod: null`; `adminVerifyUser` already overwrites the method. Trap: `src/lib/admin-rule.test.mjs:161` pins that `adminUpdatePerson` calls `tryRosterAutoVerifyQuietly(`, so keep the call and make the roster refuse the row. "Ask to be verified" should then say an admin has already decided.
- **Pin it:** extend `src/lib/admin-rule.test.mjs`: the withheld sentinel appears in both `adminUnverifyUser`'s data and the roster's `where`.
- **Travels with:** —

#### T7b-02 — On a desktop tab, the feed's bell stays dark for a new notification whenever its count repeats a number the tab has seen before
**Medium** · **Confirmed** (source: the pure rule, and `src/components/layout/unread-store.test.mjs:67` asserts the blind case as "agrees")
- **Where:** `src/components/layout/unread-store.ts:107-116` (`seedVerdict`) and `:123-129` (`seedUnread` adds every prop, fresh ones included, to `seenProps`); `src/components/layout/notification-bell.tsx:203-205` (mount effect; the only other refreshes are `focus` `:192-196` and panel open `:217-235`); `src/components/layout/page-header.tsx:158-163` (the feed header bell remounts with a page-fresh count from `src/app/(main)/feed/page.tsx:47, 100`).
- **What happens:** a member reads their one notification (badge 0), goes to /letters, and a like lands; back on /feed by the sidebar, the page counts 1, but 1 is already in the seen set, so the store keeps 0: no dot, no shake, until they refocus the window or open the panel. For a low-volume member whose count cycles 0 → 1 → 0, that is every notification after the first; bugs.md #5 (no desktop bell outside the feed) leaves nothing to correct it.
- **Fix direction:** `seedUnread(prop, { fresh })`: the page-header bell passes `fresh: true` and the store adopts the number (it is the server's answer); the layout band bell keeps `seedVerdict`. Correct the "exactly three" comment at `unread-store.ts:96-101`.
- **Pin it:** extend `src/components/layout/unread-store.test.mjs`: `seedUnread(1) → setUnread(0) → seedUnread(1, { fresh: true })` leaves `getUnread() === 1`.
- **Travels with:** —

#### T7b-13 — Analytics tiles add up a top-N list instead of counting, so the owner reads numbers that are far too low
**Medium** · **Confirmed** (data: read-only counts with the room's own exclusion, at HEAD)
- **Where:** `src/app/(main)/admin/analytics/page.tsx:524-528` ("Profile opens" sums the top 8, `src/lib/admin-analytics.ts:725-730`); `page.tsx:518-523` ("Got no response from anyone", `LIMIT 30`, `admin-analytics.ts:752-770`); `page.tsx:611-616` ("Searches that found nothing", top 10); `page.tsx:837-842` ("Still locked out", `LIMIT 20`). Same shape: `:617-621` (referrers, top 8), `:622-626` (browser languages, top 8), `:715-719` (notification types, `take: 10`), `:118-123` (on the site now, `take: 40`).
- **What happens:** today "Profile opens" shows 387 against a true 2,829; "Searches that found nothing" 17 against 73; "Browser languages" 8 against 13 stored values that are almost all English; "Got no response from anyone" has hit its cap (30 shown, 86 qualify); "Still locked out" is 18 of a cap of 20, ordered so a one-try person is never listed once it fills. Notification types is right today (9) but the code writes up to 17.
- **Fix direction:** each loader returns a real count beside its display list (a `count(*)`/`sum()` next to the `LIMIT`, or `count(*) OVER ()`), and the tile reads that; languages count distinct primary subtags and drop values that are not BCP-47-shaped (e.g. `chrome://…`); the two actionable lists say "30 of N" / "20 of N".
- **Pin it:** a source test in the spirit of `src/lib/stats-exclusion-rule.test.mjs`: no `StatGrid` `value:` in `page.tsx` may be the `.length` or `.reduce(` of a LIMIT-ed loader list.
- **Travels with:** —

## Phase J

#### L1-01 — Two partial refunds on one gift delivered together lose one of them, so every money total over-counts for good
**Medium** · **Confirmed** (source: Postgres READ COMMITTED re-evaluates the second `UPDATE`'s `WHERE` against the first's row and it still passes; the trigger, two partial reversals within milliseconds, is rare; data: 54 contributions, none refunded yet)
- **Where:** `src/app/api/razorpay/webhook/route.ts:391-402` (the reversal `updateMany` writes `refundedAmount` as an absolute value folded from the read at `:178-188`, and its `where` has no `refundedAmount`); `src/lib/contribution-state.ts:126-144` (`foldReversal`, `Math.min(amount, refundedAmount + paise)`).
- **What happens:** two different partial refunds (a Razorpay retry burst, two dashboard resends, a refund and a dispute together) both read refundedAmount 0; the second write overwrites the first. The row records both ids, so neither can ever re-apply, but only one amount. The /support recovery bar, "Given, all time", the admin tiles and the supporter's ledger over-count by the lost refund permanently, and the audit line quotes the wrong cumulative total too, so only Razorpay's dashboard can reveal it.
- **Fix direction:** make the fold atomic: CAS on the value read (`refundedAmount` and `status` in the `where`; on `count === 0`, re-read and fold once), or one `$executeRaw` that sets `"refundedAmount" = LEAST(amount, "refundedAmount" + $paise)`, derives the status with a CASE and appends the id under `NOT ($id = ANY("reversalIds"))`. Trap: the existing `has` guard stops only a re-delivery of the same id; two distinct ids both pass it.
- **Pin it:** a source pin in `src/lib/contribution-state.test.mjs` that the reversal write's `where` names `refundedAmount` (or that the raw statement uses `LEAST`); a mocked-route test with two concurrent distinct reversals if a test harness exists.
- **Travels with:** T8a-02 (the same reversal write and its `notIn` guard)

#### L4-04 — A wrong, rotated or suspended Razorpay key stops every contribution, and nothing records that anyone tried
**Medium** · **Confirmed** (source)
- **Where:** `src/app/(main)/support/actions.ts:133-136` (one console-only catch: "We could not reach the payment gateway. Please try again in a moment."), with the order created before any row at `:99-110` / `:112-122`; `src/lib/razorpay.ts:91-97` (a non-2xx logs and throws; the comment at `:93-94` says a 401 means "OUR keys are wrong").
- **What happens:** with a rotated secret, a test-mode key or an account on hold, every member who presses Contribute is told to try again in a moment, retries into the same wall, and leaves. No `Contribution` row is written, so /admin/support, the nightly `contributions.started` metric and the funnel show a quiet week; the only trace is a function-log line. A database failure after a successful order gets the same wrong sentence.
- **Fix direction:** `reportSwallowed("support", err, { step: "startContribution", status })` in the catch, at least for a non-5xx from Razorpay and for the row write; tell the member a 401/403 apart ("Contributions are paused for a moment; the team has been told"). Optionally record the attempt (an `AuditLog` line) so the admin funnel sees it.
- **Pin it:** a source pin in `src/lib/contribution-state.test.mjs` that `startContribution`'s catch calls `reportSwallowed`.
- **Travels with:** —

#### T8a-02 — A refund that lands while a gift is disputed is dropped without trace, and a later dispute close counts the whole gift again
**Medium** · **Suspected** (mechanism certain from source; whether Razorpay delivers `refund.processed` before a fraud dispute's `closed` is a vendor ordering fact. A mocked-route test with three signed POSTs, dispute.created, refund.processed, dispute.closed, on one row reading `refundedAmount === 0` proves the code half)
- **Where:** `src/app/api/razorpay/webhook/route.ts:391-402` (the `status: { notIn: [...REVERSED_STATUSES] }` guard at `:394` refuses a "disputed" row: count 0, no audit, no console line, 200 returned); `:289-336` (the won/closed branch unfolds from a `refundedAmount` that never learned of the refund); `src/lib/contribution-state.ts:36-39` (`REVERSED_STATUSES` includes "disputed") and `:159-166` (the docblock that already admits the per-reversal paise are missing).
- **What happens:** dispute.created marks the gift disputed; a refund then arrives and is silently thrown away; dispute.won or .closed (Razorpay's docs say a fraud dispute closes after the merchant refunds) restores the row to "paid" with nothing refunded. The money that left is counted as given on every public and admin surface, and the audit line says the chargeback "did not stand". Folds in T8a-03.
- **Fix direction:** let a reversal apply to a disputed row (refuse only `refunded`), keeping "disputed" while recording the paise and the id; give `unfoldDispute` the dispute's own paise (a `disputedAmount` column, or per-id paise beside `reversalIds`), which also closes the documented refund-then-dispute imprecision; write an audit line whenever a reversal is refused. Also noted in the report: dispute.created before payment.captured resurrects a "paid" row with null `paidAt`/`method` after a win.
- **Pin it:** a `src/lib/contribution-state.test.mjs` case for fold-on-disputed and unfold leaving the refund in place.
- **Travels with:** L1-01 (same write; one atomic fold should serve both)

#### T8a-11 — Supporters get a "Pick the bird you want to wear" bell after they have already picked, and it sends them to the pay page
**Medium** · **Confirmed** (live: every payment since 2026-08-30, 4 of 4, produced the bell 8-76 ms after `paidAt`; each payer had already been redirected and picked within 48-150 s)
- **Where:** `src/app/api/razorpay/webhook/route.ts:258-271` (bell created whenever the webhook's CAS moved the row, `link: "/pick-bird"`), with the false premise at `:231-240` ("the browser callback got there first, which is the ORDINARY case"); `src/app/(main)/pick-bird/page.tsx:77` (`redirect("/support")` once the pick is spent); `src/app/(main)/support/actions.ts:290-293` (`chooseBird` clears no notification); `src/components/layout/notification-bell.tsx:262-279` (click → `router.push(link)`).
- **What happens:** the webhook usually beats the browser callback, so a payer whose tab survived gets the redirect to the picker AND a bell. After picking, tapping the bell finds no fresh contribution and lands them on /support, whose one call to action is to pay again, the outcome C-155 was fixed to avoid.
- **Fix direction:** in `chooseBird`, after the `user.update`, mark the caller's unread `contribution_received` rows read (or delete them). For bells already read, a member with a spent pick who reaches /pick-bird gets "You are wearing the <bird>. A new contribution opens another pick." with a link to /birds instead of a bare redirect. Correct the comments at `route.ts:231-240` and the stale "Choose your bird button" comment at `pick-bird/page.tsx:18-19`.
- **Pin it:** a source pin (support rule or `src/lib/contribution-state.test.mjs`) that `chooseBird` clears `contribution_received`.
- **Travels with:** —

#### T8a-15 — A wrong Razorpay webhook secret would silently and permanently lose every refund, chargeback and tab-died payment
**Medium** · **Confirmed** (source plus Razorpay's public webhook FAQ: only non-2xx answers to its own deliveries count towards a disable)
- **Where:** `src/app/api/razorpay/webhook/route.ts:110-128` (mismatch or unsigned → `noteRejection` → `200 { received: true }` at `:127`; the premise at `:111-119`); `src/lib/razorpay.ts:141-142` (the same premise); `route.ts:35` (`REJECTION_NOTE_GAP_MS`, one audit line an hour).
- **What happens:** the 2xx was meant to stop forged posts from getting the webhook disabled (audit-1 M59), but Razorpay never sees what a stranger's POST is answered; what the 2xx does is mark every real delivery as delivered when the secret in Vercel and in the dashboard differ. Then tab-died payments, refunds, disputes and the method backfill vanish with no retry, no 24-hour disable, no alert email; fixing the secret later recovers none. Latent: the secret is right today.
- **Fix direction:** answer a signature mismatch (and an unsigned POST) with 401, so Razorpay retries for 24 hours, then disables and emails the owner, and a same-day fix recovers every event. Keep the hourly audit line; rewrite the comments at `route.ts:111-124` and `razorpay.ts:136-143` with the FAQ's words. This reopens M59, which audit 2 re-affirmed as intact.
- **Pin it:** a source pin in `src/lib/security-regressions.test.mjs` (or `contribution-state.test.mjs`) that the mismatch branch answers non-2xx.
- **Travels with:** —

#### T8a-16 — A supporter with a profile photo spends their one bird pick on a bird nobody sees
**Medium** · **Confirmed** (source; data: 13 of 224 members have a photo, no payer has hit it yet)
- **Where:** `src/components/common/bird-avatar.tsx:90` (photo wins over `birdOverride`; precedence documented at `:10-12`, also `:47`); `src/components/support/bird-picker.tsx:173` ("This becomes your avatar everywhere on the site"); `src/app/(main)/pick-bird/page.tsx:48-51, 80-88` (never reads `photoUrl`); `src/app/(main)/support/actions.ts:290-293` (spends the pick regardless).
- **What happens:** a member with an uploaded photo pays, picks, is told "You are now the Peregrine Falcon", and every avatar on the site still draws their photo; the pick is spent, so "changing it again takes another contribution". Nothing tells them the bird appears only if they remove the photo.
- **Fix direction:** owner's call: (a) keep photo-first and say so on /pick-bird before the pick is spent ("Your photo shows in place of a bird; your bird shows the moment you remove it"), repeated in the confirm bar; or (b) a paid pick outranks the photo in `BirdAvatar` and the other photo-first sites (`letterhead-profile.tsx:362, 769, 799`). Since `ad390fd0` every new member is dealt a `birdOverride` at signup, so (b) must tell a paid pick from a dealt one.
- **Pin it:** a test that the picker receives `photoUrl` and renders the sentence when set (a), or a `BirdAvatar` precedence test (b).
- **Travels with:** —
- **Owner question:** Q8.

## Phase K

#### T6-04 — After a directory search, Back leaves the old name in the search box over the whole unfiltered membership
**Medium** · **Confirmed** (live: the orchestrator ran `/directory?q=…` → Back → URL `/directory`, "223 people", People tab, pill still showing the name; `findings.md:116`)
- **Where:** `src/components/directory/directory-client.tsx:143` (`query` seeded once from `initialFilters.q`) and `:160-162` (`browseView` seeded once); `:204-208` (the only prop-sync effect, for `users`/`nextCursor`); `src/app/(main)/directory/page.tsx:368` (`<DirectoryClient` mounted with no `key`); `src/components/layout/search-pill.tsx:104` (controlled mode renders the prop).
- **What happens:** expected, Back returns the page to what that URL showed (`docs/spec/directory.md` §2: the URL is the state). Actual: the list and count go back to everyone, but the pill keeps the typed name and the People tab stays selected, so the screen contradicts itself; Forward brings the results back under the same text. The same after a batch tile, and since `b5a87180` after the map pin's "See all" (`seeCityPeople`, `:338-344`).
- **Fix direction:** derive `query` and `browseView` from `initialFilters` when it changes (an effect keyed on the filter values), or `key` `DirectoryClient` on the search-param string so it remounts per URL. `clearAll()` (`:321-324`) already resets `query` by hand and can lean on the same path.
- **Pin it:** `src/lib/directory-rule.test.mjs` (source-shape): an effect on `initialFilters.q` or a `key` on the mount; then a Playwright case (type, Back, pill empty) once seen in the MCP.
- **Travels with:** —

## Phase L

#### L5-07 — Supabase Free's 5 GB monthly egress is the first limit ordinary growth hits, and nothing in the app watches it
**High** (re-ruled from Critical: the backup's share was cut by `4487283b`; Supabase warns and grants a grace period first) · **Suspected** (the bytes are measured, ~60 KB per real view in early October and 67 KB raw per unfiltered directory render today; when 5 GB is crossed depends on activity, and Supabase → Organization → Usage → Egress for the current cycle settles it, last reading 0.39 GB for Oct 1-8)
- **Where:** `src/app/(main)/directory/page.tsx:279-287` (pins: every placed member with `PIN_SELECT`, `directory/select.ts:47-54`, on every render and search step, no `take`; `PIN_PEOPLE_CAP` at `:46` trims only what reaches the browser); `src/app/(main)/collection/actions.ts:933-937` (the whole archive's geometry on the first page); `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:293-315` (every published Edition's photo JSON for the covers); `scripts/ops/snapshot.mjs:129` (records database size, nothing about egress).
- **What happens:** every byte a query returns through the pooler counts against 5 GB a month for the whole organisation; past it Supabase e-mails, grants a grace period, then may pause the project, switch it read-only or answer 402 until the cycle resets. Per-view bytes grow with membership (the pins are ~160 B per placed member and the directory is 24% of page views), toward ~100-110 KB per view at 2,000. The crossing is ~700 members at launch-week activity (3.4 views/member/day), ~1,400 at early-October activity, ~3,200 at this week's 0.37. The app records no egress, so Supabase's e-mail is the only alarm.
- **Fix direction:** the owner deferred the per-page cut ("revisit before ~1,000", platform-health handover item 14), and Supabase Pro ($25) lifts the line. What the code can do now regardless: add an egress reading or proxy to the nightly snapshot with a threshold. The levers when the cut is taken: cache the unfiltered pins per version or return per-city counts and fetch a pin's people on open; cache the geometry (`use cache` keyed on filter plus a write version); covers need three URLs per Edition, not every photo JSON; the letters rail (`letters-module.tsx:31-51`) needs a word count, not the body; `api/users/first-names/route.ts` (every member's name per composer focus) is identical for everyone and cacheable.
- **Pin it:** a shape test that the directory's pin query and the Collection's first page do not fetch unbounded row sets the view does not draw; the snapshot metric with its threshold.
- **Travels with:** —
- **Owner decision already taken:** deferred on 2026-10-08, "revisit before ~1,000 members" (platform-health handover item 14). Members today: about 575.

#### L5-02 — A sign-in flood from one machine exhausts the month's Upstash quota in hours, after which every rate limit in the app is off
**Medium** (re-ruled from Critical: the database half was fixed by `e29823cb`, refusal rows capped at 120 an hour) · **Confirmed** (source; executed: `login-attempt-cap-rule.test.mjs` 2/2; vendor: Upstash Free is 500K commands a month)
- **Where:** `src/lib/auth.ts:106-113` (two `hasBudget` reads, one Upstash command each, before Turnstile is consulted, even for a caller already over the limit); `src/lib/auth.ts:175-182` (two more without a token); `src/lib/rate-limit.ts:307-310` (`hasBudget` fails open on any Upstash error; `rateLimit` likewise at `:288-291`).
- **What happens:** every refused attempt still spends 2-4 Upstash commands, so a single source at 10 requests a second empties 500K in about seven hours. For the rest of the month every limiter fails open: sign-in, sign-up, reset, trivia, posts and uploads are unmetered, and token-less attempts reach the cost-12 bcrypt (`auth.ts:210`), ~0.25 CPU-s each, billed on Pro toward the $50 cap that pauses production (L8-04). Side effect of the cap: during a flood the 120 rows an hour are shared by every reason, so the analytics room's "who cannot sign in" panel goes blind then.
- **Fix direction:** one Vercel WAF rate-limit rule (Pro allows 40 per project) on `POST /api/auth/callback/credentials`, fixed window, IP-keyed: it stops a flood before the proxy, the function, Upstash and Postgres, and it is the same rule L8-04 asks for. A dashboard action only the owner can take; add it to "things only you can do".
- **Pin it:** none mechanical for the WAF; a line in `docs/OPERATIONS.md` naming the rule and its path.
- **Travels with:** L8-04 (the same WAF rule)

#### L5-04 — The database pool ignores Vercel's suspend lifecycle, so after a quiet spell a member's first query can hit a dead connection
**Medium** · **Suspected** (Vercel's own KB states the mechanism and Fluid is measured on; not observed. Supabase → Reports → pooler client connections overnight, and Vercel runtime logs for "Connection terminated unexpectedly" / P1017 at the first request after an idle gap, would settle it)
- **Where:** `src/lib/prisma.ts:46-55` (`new PrismaPg({ max: 5, connectionTimeoutMillis, query_timeout })`, no `idleTimeoutMillis`, so pg-pool's 10 s default applies; no `attachDatabasePool` anywhere in `src` or `package.json`); `src/lib/prisma.ts:28` (the stale "5 x ~40 concurrent instances" comment).
- **What happens:** idle timers do not run while a Fluid instance is suspended, so its up-to-5 Supavisor connections stay open as phantom client slots, and on resume the next checkout can be a socket Supavisor already dropped: the member's first query fails, which since `e286daf0` shows the error screen on a hard load (and still a null session elsewhere). With ~1,500 views a week, most requests arrive long after the 10 s timer and open fresh verify-full TLS connections.
- **Fix direction:** build a `pg.Pool` at module scope with `idleTimeoutMillis` ~5000 and the TLS options from `db-tls.ts`, pass it to `new PrismaPg(pool)`, call `attachDatabasePool(pool)` from `@vercel/functions`; keep `max: 5`; correct the comment. Keep the HMR client cache in `prisma.ts` working (CLAUDE.md gotcha 8).
- **Pin it:** a source pin (in the style of `src/lib/session-revocation.test.mjs`) that `prisma.ts` builds a `Pool` handed to `attachDatabasePool`.
- **Travels with:** —

#### L8-04 — With no firewall rule, a script at the public demo or production's signed-out pages can spend a month of Hobby's allowances in about a day
**High** (raised 2026-10-24: production is on Hobby since 2026-10-23, where a spent allowance stops the feature for 30 days; the finding below was written on Pro) · **Confirmed** (data: `vercel api` finds no firewall configuration on either project and both in one team; vendor: the spend-management page's "pauses the production deployment for all projects on your team", re-fetched 2026-10-24)
- **Where:** `src/proxy.ts:136-151` (the demo is public by design); `src/app/api/demo/reset/route.ts:41, 51-52, 81-101` (unauthenticated `POST` reseeding the demo; the brake is `MIN_GAP_MS` in module memory, reset to 0 on failure at `:98`); production's own `/`, `/login`, `/signup` (each a function render plus a proxy invocation).
- **What happens:** both projects draw on one Vercel budget; the owner's $50 on-demand cap with pause ON (set 2026-10-08) turns a flood into an outage: rishivalley.space answers `503 DEPLOYMENT_PAUSED` until he resumes it by hand, and raising the cap does not unpause. A rendered page costs ~$9 per million requests, so the $20 credit plus $50 is ~8 M requests, about a day at 100/s. The demo's Supabase half is real but measured negligible (14.9 MB). This rests on the team being on Pro (V-L-c-01's billing check).
- **Fix direction:** owner, dashboard: one WAF rate-limit rule per project (production: `/`, `/login`, `/signup`, `POST /api/auth/callback/credentials`; demo: everything); pause or delete the demo's Vercel project while it is deferred (it serves 500s from the 2026-08-07 build and still runs two crons a day); keep the cap and turn on SMS at 100%. In code: gate `POST /api/demo/reset` on something stronger than per-instance memory and do not reset the brake on failure.
- **On Hobby (2026-10-23 on):** there is no spend cap to reach; instead Hobby includes 1,000,000 CDN requests and 1,000,000 function invocations a month across every project in the account, the demo included, and a spent allowance stops that feature for 30 days (Vercel's Hobby page, fetched 2026-10-24). A script at ten requests a second spends a million in about 28 hours. Hobby allows one WAF rate-limit rule per project (three custom rules in all), which is still the fix.
- **Pin it:** a line in `docs/spec/demo.md` naming team/organisation separation and the firewall rule as requirements; a source pin that the reset route's brake is not reset in its catch.
- **Travels with:** L5-02 (the same WAF rule)

## Phase M

#### T9-01 — The empty-state hoopoes (no search results, nothing saved, no messages) never play their moment or start their resting life
**Medium** · **Confirmed** (source: a mount-only effect reads a ref whose element is rendered one commit later; L7 swept every null-ref effect app-wide and found this the only one that never recovers)
- **Where:** `src/components/mascot/moments/moment-hoopoe.tsx:55-71` (the observer effect, deps `[ref, delay]`, returns at `:57` when the ref is null) and `:104-121` (`MomentStage` returns null at `:115` until solo, so the stage div at `:118` arrives a commit later); `src/components/mascot/moments/one-hoopoe-guard.ts:30-37` (`useSoloHoopoe` starts false); contrast `src/components/mascot/moments/contributed-hoopoe.tsx:165` (stage div always rendered, which is why the Collection's moment works).
- **What happens:** expected per mascot.md, "looks left and right, small head shake. Rests" on no results, a bookmark glance on empty Saved, a wave on empty Messages, then a beat every 7-12 s. Actual: no IntersectionObserver is ever created, `play` never runs and `useHoopoeLife` never starts, so the bird only breathes and blinks: the "it just sits there" the owner asked to be rid of on 2026-09-17. Affects the feed search (`post-feed.tsx:295`), the directory (`directory-client.tsx:741`), empty Saved (`saved-posts-feed.tsx:188`) and empty Messages (`messages/(index)/page.tsx:130`). Decorative; no function lost.
- **Fix direction:** ContributedHoopoe's shape: always render the stage div and gate only `<Hoopoe>` on `solo`; or a callback/state-held element so the effect re-runs when the div exists.
- **Pin it:** a Playwright spec on a no-results state asserting with `expect.poll` that the `[data-part=head]` or `headGaze` transform changes within 3 s, written after seeing it in the MCP.
- **Travels with:** —

#### T9-03 — Any hoopoe can jam after a few minutes: an ambient blink or crest flick cancels a queued verb, and the bird stops answering taps
**Medium** · **Suspected** (every link is read at source and in motion 12.38.0; the odds are computed, not observed. On the public `/hoopoe`, a MutationObserver on `[data-part=crest]`'s `style`, "Well done"/"Thinking" pressed ~20 times a second apart, then "Nod": a jam shows as a crest write during an expression and a Nod that never plays)
- **Where:** `src/components/mascot/hoopoe.tsx:1454-1463` and `:1491-1504` (ambient blink and crest flick, gated only on `!damper.active`); the verbs that write the same values, await them and never hold the damper: `blinkOnce` `:381-385`, `crestFlick` `:417-420`, `crest()` `:423-428`, `express()` `:481-508` via `applyChord` `:325-337`, `rest()` `:1210-1223`; the pump `:292-311` (races each step only against the abort token).
- **What happens:** `MotionValue.start()` tears down the verb's animation without settling its promise, so the queue waits forever. The ambient breathe and blink carry on, but everything queued stops: no later verb plays, `pokePending` latches so every tap is dropped (`:1083`), `isBusy()` stays true so resting beats stop (`use-hoopoe-life.ts:89`). Roughly a 50% chance a resting bird has jammed by minute five; on /signup a jam silences the gate-pass celebration and delays the password tuck to its 8 s cap (`signup-form.tsx:325-338`); ~13% of contributions never start ContributedHoopoe's resting life (`contributed-hoopoe.tsx:156-159`).
- **Fix direction:** one rule for every verb: either each queued verb holds the damper for its duration (`blinkOnce`, `crestFlick`, `crest`, `express`, `rest`, and `turn`/`land`), or the ambient loop does not write while the queue is busy. Independently make the queue immune: race each awaited `finished` against the value's cancellation or give each step a ceiling, and prune `live` on stop so `isBusy()` means busy.
- **Pin it:** a Playwright spec on `/hoopoe` that runs the rail's reactions ~30 times with a test-only prop shortening the ambient timers, then asserts a final Nod plays.
- **Travels with:** —

## Coverage

Written (35, every row of phases G-M in `compile/hm-rows.md`, in its order):
- G: L7-02, T5-01, T5-04, T5-05, T5-07, T5-09
- H: L3-02, L4-01, L7-09, T2a-02, T2a-07, T3-04, T3-05, T3-11, T3-17, T3-18, T3-19, T7b-15
- I: T7a-03, T7a-06, T7b-02, T7b-13
- J: L1-01, L4-04, T8a-02, T8a-11, T8a-15, T8a-16
- K: T6-04
- L: L5-07, L5-02, L5-04, L8-04
- M: T9-01, T9-03

Not settled: none. Lines are HEAD (`36ed27d3`): taken from the verdicts' at-HEAD citations where given, otherwise re-read in the file. Files changed past the validators' `88642426` and re-read here: `src/components/auth/actions.ts` (+6 lines; T5-01's email write is now `:181`), `src/components/auth/trivia-actions.ts` (rewritten by `42ec6fe7`; T5-05 narrowed, see its entry), `src/components/auth/trivia-gate.tsx` (T9-03's `express("curious")` is now `:249`, not cited).

Notes for the orchestrator:
- Suspected although the verdict reads CONFIRMED (the mechanism is certain, the member-facing consequence rests on vendor behaviour, timing or load): L7-02 (WebKit focus zoom), T3-11 (perceptible jank), T8a-02 (Razorpay event order), T9-03 (computed odds), L5-04 (Vercel suspend lifecycle), L5-07 (activity-dependent crossing). Each names its settling proof.
- T5-05 drifted after validation: `42ec6fe7` made `rv_trivia_id` live 30 days, which removes the "30 minutes from the FIRST attempt" half; the dead end itself stands, now 30 minutes from the pass.
- T5-01: since `c41893f0` the report's stale-link copy (`verify-client.tsx`, `reset-client.tsx`) is reachable and correct, so that part of its fix direction is dropped.
- L5-07 needs an owner question the draft lacks (build the cuts now, or keep his "revisit before ~1,000" deferral and buy Supabase Pro). L5-02 and L8-04 close with one WAF rule, a dashboard action missing from the draft's "things only you can do".
- V-L-c cites `PIN_SELECT` at `directory/select.ts:58-65`; at HEAD it is `:47-54` (used here).

STATUS: COMPLETE
