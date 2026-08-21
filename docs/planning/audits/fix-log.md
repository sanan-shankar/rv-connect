# Pre-release fix session — disposition ledger

Running record of every finding in `bug-report.md`: fixed (with the commit), not-a-bug (with the
reason), or deferred (with the reason). **Session 1: 2026-08-21.**

Legend: **F** fixed · **N** not a bug · **D** deferred

---

## Session 1 — what shipped

Fourteen commits on `main`, none pushed. `npm run check` green (38 unit tests), `npm run visual`
23/23, every touched route rendered at 200 with a clean console.

### Phase 0 — safety nets

| ID | | Outcome |
|---|---|---|
| §4.1 pool config | F | `e98474a`. `max: 5`, `connectionTimeoutMillis: 5s`, `query_timeout: 20s`, `onPoolError` logging. **Correction to the report's fix direction:** `statement_timeout` is deliberately NOT set. pg ships it as a startup parameter and Supavisor silently drops it — probed live against both `:6543` and `:5432`: `SHOW statement_timeout` returned Supabase's own `2min` and a `pg_sleep(3)` under `statement_timeout=1000` ran to completion. Setting it would be config that reads like a guard and is not one. `query_timeout` (client-side) IS honoured; verified live. Pinned by `src/lib/db-pool-rule.test.mjs`. |

### Phase 1 — Criticals and mail

| ID | | Outcome |
|---|---|---|
| B-001 | F | `d762f5e`. `Group.creatorId` → nullable `SetNull`. Purge promotes the longest-standing remaining member to group admin; merge inherits ownership and carries the Keeper role. Proved in a rolled-back live transaction: deleting the group creator now leaves all 12 groups, both Catch-ups, both Editions, all 13 prompts, and takes only his own 9 of 133 entries. Pinned by `cascade-rule.test.mjs`, which walks the whole Cascade graph out of `User` rather than checking two columns. |
| B-002 | F | `95811b1`. `nextAttemptAt` + `deferrals`; every failure books a later retry; transient provider errors hand the attempt back and count on their own budget; quota errors wait for the budget window. `src/lib/mail-policy.ts` + tests. |
| B-010 | F | `d762f5e`. `CatchupPrompt.authorId` → nullable `SetNull`; three render sites guard null. |
| B-011 | F | `d762f5e`, `09e7a1b`. New `PendingImagePurge` worklist written inside the delete transaction; drained after commit, retried by the nightly sweep. Report's option (a) — delete by `uploads/<userId>/` prefix — was **not** taken: the app's R2 token is object-scoped (see `presignImagePut`'s docblock), so a `ListObjectsV2` sweep cannot be relied on. |
| B-012 | F | `d762f5e`. `collectImageUrls` reads every `AdminMessage.imageUrl` in the member's threads. `Group.coverImage` is moot: groups survive the purge now. |
| B-013 | F | `d762f5e`. `delImageByKey` returns a boolean and logs the key in every environment; the purge counts objects gone, not attempts; failures reach the audit line. |
| B-070 | F | `95811b1`. Eligible kinds derived from `PRIORITY`. Swept the live queue: no rows stranded (no deletion has ever been requested). |
| B-071 | F | `95811b1`. Budget counts `sentAt` with no status filter, plus in-flight rows. |
| B-072 | F | `95811b1`. One drain pass at a time via a `QueueLease` row; claim/block/release/re-claim proved live. |

### Phase 2 — High, member-facing

| ID | | Outcome |
|---|---|---|
| B-020 | F | `69cec9f`. One `emailField()`/`normalizeEmail()`; backfilled the one live mixed-case row; unique index on `lower(email)`. |
| B-021 | F | `1fa533e`. New `superseded` outcome; verify tokens no longer burned on remint (reset tokens still are). |
| B-022 | F | `69cec9f`. Proxy writes `next` with the query string. Verified live. |
| B-023 | F | `c3f5782`. Shared `refuseSelfOrLastAdmin`, serializable; the three controls are not rendered on your own row. |
| B-024 | F | `c3f5782`. `requireAdminPage()` on all 12 admin pages + a gate-coverage assertion. All 12 verified 200 with a clean console. |
| B-030 | F | `d254560`. One `shrinkForUpload` at four client boundaries, with a 4MB budget and honest copy for the GIF/HEIC pass-throughs. `next.config.ts` now records that `bodySizeLimit` cannot raise the real cap. |
| B-041 | F | `69a31a7`. `setRemoved(true)` on delete; `onSaved` from the edit dialog into card state. |
| B-043 | F | `69a31a7`. `failed` autosave state rendered loudly, toast once per run, plus a localStorage crash net for a letter with no row yet (and one whose save is failing), cleared on success. |
| B-044 | F | `69a31a7`. Both submit buttons gated on `uploading`. |
| B-045 | F | `69a31a7`. The rail takes a viewer and applies `cityScopeWhere` + the `targetBatches` fragment. |
| B-048 | F | `69a31a7`. `cityScope` fetched, seeded, sent unconditionally on a draft, re-validated server-side. |
| B-049 | F | `69a31a7`. `onCommit(next)`, the shape `commitPlaces`/`commitHouses` always had. |
| B-080 | F | `040b0e6`. Both awaits wrapped; the confirm path's catch reassures rather than inviting a second payment. |
| B-081 | F | `040b0e6`. The webhook writes a `contribution_received` notification linking `/pick-bird`, only when it made the transition. |
| B-093 | F | `d77197a`. `Visit` and `SearchLog` expire at 180 days (double the deepest analytics lookback, 90). `SearchLog` gained the `createdAt` index the predicate needs. `docs/SECURITY.md` retention table updated. |
| B-121 | F | `7354d5b`. `Group.batchYear Int? @unique`; `joinBatchGroup` creates and catches P2002. Nine existing groups backfilled and their `creatorId` nulled (a batch group has no keeper). Unique proved live. |

### Phase 3 — scale

| ID | | Outcome |
|---|---|---|
| B-090 | F | `be1141a`. Ten child-side FK indexes + `index-coverage.test.mjs` so the eleventh relation cannot ship without one. |
| B-091 | F | `be1141a`. `pg_trgm` GIN index on `Place.altNames`. Measured with EXPLAIN (ANALYZE) before and after: **368ms / 4,690 buffers → 7.4ms / 54 buffers**. Costs 36MB; the database went 76MB → 112MB against a 500MB ceiling. |
| B-092 | F | `52a16f2`. Twelve people per pin; counts unchanged; past the cap the drilldown hands over to `/directory?city=...`. |
| B-101 | F | `d77197a`. Heatmap double-converts (`AT TIME ZONE 'UTC'` first). Measured live: a visit stored at 06:46 wall (12:16 IST) bucketed at hour 1 before, hour 12 after. |

### Medium/Low picked up along the way

| ID | | Outcome |
|---|---|---|
| M02 | F | `d762f5e`. Merge sheds colliding `CatchupEntry` rows instead of aborting. |
| M26 | F | `c3f5782`. Last-admin check inside a serializable transaction. |
| M27 | F | `040b0e6`. The `payment.failed` branch is a conditional update. |
| M55 | F | `d77197a`. `prune.mjs` agrees with `retention.ts` (365), which is the source of truth. |
| M57 | F | `040b0e6`. `startContribution` metered by a new `contributions` bucket. |
| Low 62 | F | `d254560`. The Collection's fallback path shrinks and says so. |
| Low 64 | F | `09e7a1b`. The sweep purges at most 10 accounts a night, oldest first. |
| Low 85 | F | `d77197a`. The per-user 100-cap spares unread rows. |

### Review findings acted on

- **write-path-reviewer** on `d762f5e` found `promoteOrphanedGroups` using `update()` (throws P2025
  when the row is gone, aborting an otherwise-good purge) and the uncapped nightly purge loop. Both
  fixed in `09e7a1b`. Its other checks — no network call inside the interactive transaction, the
  demo's three layers intact (`demo.test.mjs` 19/19, `verify-guard.mts` 15/15), merge statement
  ordering, no loosened gate, no non-TypeScript reader of the now-nullable columns — came back clean.
  It misattributed an in-flight `src/lib/email.ts` edit to another session; that was this session's
  own uncommitted work and `tsc` was green.
- **screenshot-qa** ×2 on `/admin/people/<own id>` confirmed the three controls are absent (not
  hidden), the replacement card is 121px vs the 110px button version so it does not read as a hole,
  type on-token (14px / 22.75px / `--muted-foreground`), no overflow, no em dash. Two findings: an
  orphaned last word (fixed in `52a16f2`) and the Standing row now reading sparse with one pill
  (127px of 310px). Left as-is: left-aligned uneven-width content is the established idiom on that
  page, and the Careful card already explains why the other controls are gone.

---

## Session 2 — what shipped

**Session 2: 2026-08-21.** Continues from the "Still open" list below, which is updated as each
piece lands.

### Catch-up lifecycle

| ID | | Outcome |
|---|---|---|
| B-060 | F | `4ad863e`. `resumeCatchup` re-arms a missing `nextOpensAt` (conditional `updateMany`, so it cannot stamp over a live schedule) and credits a surviving one with the paused duration. Freezing on pause makes the original hole unreachable; this is the belt, and it repairs any row already stuck. |
| B-061 | F | `4ad863e`, `9dd9fd9`. **Semantics decided: PAUSE FREEZES THE ROUND.** The spec's paused state is "a calm banner and, for the Keeper, Resume" (`docs/spec/catchups.md:250`) — the home already replaced the whole console, so members literally could not answer, and letting the clock keep spending their answer window was the contradiction. Option (b) (keep the console live under a slim banner) would have meant rebuilding that UI against the spec. New nullable `Catchup.pausedAt`; resume shifts every deadline still ahead of the freeze forward by exactly the paused duration, so the group gets back the window it had. Enforced in **two** places by construction: the clock in `advanceEdition`, and `refuseIfFrozen` on all seven hand-driven writes. |
| B-062 | F | `4ad863e`. A question window closing empty extends once (new bit 3, same trick as `REMINDER_EXTENDED`, no migration) and then the Round goes **dormant** — no transition, no reminder, no empty publish, so the abandoned-Catch-up loop cannot start. `submitPrompt` revives it with a fresh window on the first question. |

### Dates and IST

| ID | | Outcome |
|---|---|---|
| B-100 | F | `5451ec1`. One convention in `src/lib/utils.ts` (`VALLEY_TIME_ZONE`, `valleyYear`, `valleyDayKey`, `valleyMidnight`, `valleyDayStart`), applied to sixteen surfaces. Pinning IST on the client too is deliberate: it is what makes server and client agree, which is the hydration half of the same bug. `visual` stayed 23/23 — the baseline letters happen to sit on days where UTC and IST agree. |
| Lows 19, 45, 47, 91, 94, 117 | F | `5451ec1`. Deletion-scheduled email purge date, member messages, admin money surfaces: all through the two fixed helpers or given the zone directly. |
| Lows 40, 50, 108, 112 | F | `5451ec1`. Year ceilings were `.max(new Date().getFullYear())` — a NUMBER Zod evaluates once at module load, so a warm instance kept last year's ceiling. Now a `yearField()` `.refine` against `valleyYear()`, per parse. |
| Low 48 | F | `5451ec1`. `getTimeFilterDate` built its boundaries from the server's local midnight; now from the valley's. |
| Lows 30, 49 | F | `5451ec1`. Client components formatting dates during SSR produced server/client disagreement; pinning one zone everywhere is the fix, rather than a hydration guard per site. |

### Toggles, notifications and links

| ID | | Outcome |
|---|---|---|
| B-040 | F | `680a374`. All five toggles are **delete-first** rather than check-then-act: `deleteMany` returns 0 or 1 and cannot race with itself, and the follow-up `create`'s unique violation is the other tap having produced exactly the row we wanted. `votePoll` is an upsert with a P2002 retry (last tap wins, which is what a switch means). New `src/lib/prisma-errors.ts` replaces four ad-hoc `code === "P2002"` checks. Client side: a `useRef` in-flight guard on each. **Proved live** in a rolled-back transaction — a second concurrent insert is rejected by `Like_userId_postId_key`, which is the exact P2002 the action now answers; nothing persisted. |
| B-046 | F | `680a374`. New `src/lib/notification-links.ts`. **Correction to the report's fix direction:** it proposes `/groups/${groupId}#${postId}` for group posts. There is no `/groups` route — the Groups feature was removed — so that link would 404. Verified live: **zero** posts carry a `groupId`, no composer passes one, and every read path forces `groupId: null`, so a group post is visible on no page in the app. The honest fix was to make `createPost` **refuse** a groupId (a net-new finding, recorded below) rather than link to a route that does not exist. Letters link to `/letters/<id>` and say "your letter". |
| M33 | F | `680a374`. An unread like notification for the same post/message is left alone rather than minted again, so fidgeting with a heart cannot fill a bell. Once read, a later like is news again. |
| Lows 52, 58, 65 | F | `680a374`. `markNotificationRead` is an `updateMany`: `update` threw P2025 for a pruned / already-read / foreign row, and the click handler awaits it before navigating, so the tap did nothing at all. |
| Lows 67, 80 | F | `680a374`. Same root as B-040. |
| Low 79 | F | `680a374`. `parseInt("-5") \|\| 0` is `-5`, and Prisma will not take a negative `skip`. Both the feed's offset cursor and `loadPhotos`' page are clamped. |
| B-122 | F | `680a374`. Every sort in `loadPhotos` and the feed's two count-based sorts now end in `id`, making the ordering total. Offset pages re-run the sort, so ties had no defined position and pages repeated and skipped rows. |

### Validation and dead surfaces

| ID | | Outcome |
|---|---|---|
| B-047 | F | New `src/lib/post-caps.ts`, one constant read by both ends. **Chose the spec's numbers** (5000 post / 20000 letter) over raising the edit cap: a plain post is a short thing, which is why the composer nudges toward a Letter at 600 characters. Checked live first — longest plain post is 2,475 chars, none over 5,000 — so tightening creation makes no existing post uneditable. Its own module because `validators.ts` imports `./collection` extensionless and `node:test` cannot resolve that. |
| B-110 | F | **Deleted** `src/app/(auth)/onboarding` entirely rather than validating it. The report offered this and asked to verify which onboarding surface ships: `welcome/page.tsx:14` says in its own comment that this page is "dead code today", nothing in the app links or redirects to it, and it was a pre-redesign shadcn card form using none of the brand primitives. It was still live by URL, still able to write seven profile columns with no caps. Removed from `DEMO_CLOSED_PATHS` in both `proxy.ts` and `demo.ts`; `demo.test.mjs` parity 19/19. |
| B-111 | F | New `src/lib/place-input.ts` — bounded label/city, lat/lng on the planet (which also excludes NaN and both infinities), a capped array, and `resolvePlaces` nulling any `placeId` that is not a real gazetteer row. That last part matters: the writers create every UserPlace in one `$transaction`, so one foreign key violation lost the member ALL their places. Both bulk writers now take `unknown` and parse. |
| B-200 | F | The inbox fetched both sections with one `take: 60`, so every thread past sixty became permanently unreachable with nothing on screen to say so. Open threads (the work queue) are now uncapped; sorted threads show the newest 40 with a "Show N older" link. Rendered 200, clean console. |
| B-201 | F | **Better than the report's fix direction.** It suggests a targeted conditional update; the real answer is that neither reply should write its OWN flag at all. Replying is not reading — opening the thread is, and both pages already clear the flag with a conditional `updateMany`. Removing the contested write removes the lost update instead of narrowing it. Applied to all three writers, including `noteOnReportThread`, where clearing `adminUnread` would have hidden a member's unread message. |

### Client error handling, the bell, and the profile email

| ID | | Outcome |
|---|---|---|
| B-042 | F | `28c39b8`. One `src/lib/call-action.ts` helper; **77** await-an-action sites routed through it and **46** busy flags converted to try/finally, across 44 client components. Note the helper's return type: a bare `{ error: string }` added to an action's union breaks TypeScript's narrowing (it has none of the sibling keys, and `if (result.error)` cannot narrow it away because `string` includes `""`), so `ActionFailureLike<T>` gives the failure branch the same `?: undefined` siblings TS synthesises for the action's own branches. Every existing call site then compiles and narrows unchanged. `ConfirmDialog` and `ModerationDialog` were fixed at the source, which covers every admin caller that passes an `onConfirm` (M65). Done by a subagent; **the full diff was read here**, with the two riskiest restructures (`create-post-form.tsx`'s `handleSubmit`, `post-feed.tsx`'s initial load) checked line by line. |
| B-120 | F | `28c39b8`. `getNotifications` returns `unreadCount`, plus a new `getUnreadNotificationCount` action; the bell refreshes on mount, on window focus and on every open. Focus rather than an interval: the count only matters when somebody is looking, and a poll would be a query per member per interval for a number nobody is reading. This also resurrects the shake animation, which was unreachable while the count could only fall. |
| M65 | F | `28c39b8`. Covered by the two shared admin dialogs, which own the await and the busy flag. |
| B-050 | F | `eedbb3e`. New `User.showEmail Boolean @default(true)`. Two columns because one cannot hold two facts: `displayEmail` says WHICH address, `showEmail` says whether to offer one at all. `buildRows`/`rowsToPayload` extracted to `src/lib/contact-rows.ts` so the round trip is unit-testable (the editor is `.tsx` and node cannot strip JSX). **Note for the next session:** that module takes `formatPhone` as an injected parameter rather than importing it, because a testable module here must have no relative VALUE imports — node cannot resolve extensionless `./utils` and tsc refuses `./utils.ts`. Type-only imports are fine, which is how the other testable modules get away with one. |

### Net-new findings (not in the audit)

- **B-202 — `createPost` accepted a `groupId` for a feature that was removed.** No composer passes one, no `/groups` route exists, and every read path forces `groupId: null` — so the post was visible on no page in the application, not even to its author, while appearing to them to have posted. Only a hand-crafted call could reach it, but a write path that silently produces unreachable content should refuse. Verified live: zero such rows. Fixed in `680a374`. The read side (`loadPosts({ groupId })`, membership-gated) is left alone.
- **A non-async export in a `"use server"` file breaks the whole route at RUNTIME, and `tsc` passes it.** Adding a `clampPage` helper to `collection/actions.ts` compiled clean and 500'd every page importing it ("Server Actions must be async functions"). Caught by `next-devtools` `get_errors`, which is exactly the failure class CLAUDE.md's gotcha 3 warns about. Helpers in an actions file must be module-private.

### Review findings acted on

- **write-path-reviewer** on `4ad863e` found the freeze was NOT the single choke point it claimed to
  be: five Keeper early-trigger controls (`openAnswering`, `closeAndPrepare`, `extendDeadline`,
  `publishNow`, `nudgeGroup`) and `submitPrompt` write the edition directly and checked only the
  ROUND's status, which does not change on a pause — so a tab opened before the pause could still
  publish the Round and notify the whole group. Also caught `resumeCatchup`'s outer compare-and-swap
  pinning only `status`, not `pausedAt`. All three verified against the live code and fixed in
  `9dd9fd9`; the overstated "ONE gate" comment was corrected too. Its other checks (authorization
  ordering unchanged, migration idempotent, demo layers untouched, no stray reader of the new column)
  came back clean.

---

## Session 3 — what shipped

**Session 3: 2026-08-21.** Continues from the "Still open" list below.

### The last canonical finding

| ID | | Outcome |
|---|---|---|
| B-063 | F | `b332301`. Built to the approved design. **Leave** on the People panel; **Archive** and **Delete** on the /catchups card's own menu; an "Archived" and a "Recently deleted" section that render only when they hold something. State on `CatchupPref` (`archivedAt`, `deletedAt`, index on `deletedAt`), so per-member state cannot leak across members by construction. `groupMemberIds` in `catchups-notify.ts` excludes a binned member; an archived one still hears, because archiving is filing and muting has its own control. New nightly retention step empties the 30-day bin, capped at 200 and **serializable** (see the review findings below). **Two extensions beyond the approved design, both argued in the code:** (1) Delete is refused for the creator as well as Leave, because the sweep would strip the founder's `GroupMember` row while `Catchup.createdById` still pointed at them, leaving a Keeper every Keeper-scoped action then refuses as "not a member"; (2) the card's menu does not OFFER Delete to the creator, following this feature's own rule that an action refused server-side is not shown as a way to be told no. `RECENTLY_DELETED_DAYS` and the countdown live in one pure module (`catchup-shelf.ts`) shared with the sweep's cutoff, so the row and the sweep cannot disagree. `ConfirmDialog` moved `admin/` → `common/`; nothing about it was admin. **Proved live** with two throwaway accounts through the real signup flow: archive, delete, restore and leave each round-tripped at both viewports with a clean console, membership/pref/notification rows all landed as intended, and the sweep was proved in a rolled-back transaction (a copy binned 31 days ago loses that one membership row; one binned 29 days ago survives; the other twelve members' rows untouched). Throwaways deleted. |

### Mail, auth, telemetry, money

| ID | | Outcome |
|---|---|---|
| M53 | F | `16425be`. The drain's row SELECTION is narrowed to `ADMIN_EMAIL` outside production, exactly as the ledger's note specified — not a refusal inside `sendMail`, which would burn the row's attempts. **Fails closed both ways:** `queueIsSendable()` now also requires `ADMIN_EMAIL` outside production and says loudly why it declined, and `localDrainRecipient` returns an address matching nothing rather than "everybody" when it is missing. Without that second half the guard would have been undone by an UNSET variable (write-path review). Proved live: a throwaway signup's verify row sat `queued`, `attempts: 0`, through several local page views. |
| M07 | F | `5fd8af0`. **The widget's own docblock was the bug written down** ("a broken third party never bricks sign-in"): `verifyTurnstile` fails open only when Cloudflare is unreachable from the SERVER, and a request arriving with no token is a plain no everywhere. So anyone whose browser could not load `challenges.cloudflare.com` was told "refresh and try once more", refreshed, and got it again, permanently. A challenge error now resets and retries twice before latching; a SCRIPT that never loaded is reported as its own sentinel, because "refresh" is the one piece of advice certain to be wrong for it. New `BOT_CHECK_BLOCKED` names the address to allow. All three auth forms handle it. |
| M18 | F | `5fd8af0`. `authorize()` wrapped in one net: the two deliberate `CredentialsSignin` refusals re-throw untouched, anything else becomes a new `unavailable` code. A database outage used to reach the form through NextAuth's generic channel, which the form prints as "Invalid email or password." — to somebody whose password was right, who then went to reset it, which needs the same database. New `SIGN_IN_UNAVAILABLE` says it is us, not the password. |
| M24 | D | Deferred **within session 3**, not skipped: `touchLastSeen` fires only on layout render, so soft client-side navigations go uncounted. The fix is a client-side reporter, which is design work rather than a correction; see "Still open". |
| Lows 25, 35, 44, 72, 77, 82, 87 | F | `991c662`. Nine fire-and-forget writes moved to `after()`. The two LIBRARY sites (`auth-tokens.ts`, `login-attempt.ts`) guard the call and fall back to the old shape: `after()` throws SYNCHRONOUSLY outside a request scope — confirmed against the installed `next@16.3.1` source, not assumed — and both are reachable from callers that may not have one. That guard is the same one `scheduleDrain()` already carries. Low 87's ordering fix applied to the letter page AND to the Collection photo page, which had the same shape (the agent fixed only the one it was pointed at; the diff was read here). |
| M59 | F | `220ebec`. Signature reject answered 400, which Razorpay counts against the endpoint and eventually DISABLES the webhook for — on a public, necessarily unauthenticated route, so a junk flood could silently stop real payment confirmations for everyone. Now: `unconfigured` → 500 (that payment is real and the retry records it once the variable is set); `unsigned`/`mismatch` → 2xx, because we have already decided to do nothing with the body. The failure signal 400 was really buying is replaced by an audit line **deduped to one an hour**, so the same flood cannot fill the table instead. `verifyWebhookSignature` returns a verdict rather than a boolean. |
| M58 | F | `220ebec`. `refund.processed` and `payment.dispute.created` now move the row out of `paid`, which every sum in the app already filters on, so the arithmetic corrects itself everywhere at once. `refund.processed`, not `created`: created is the instruction, processed is the money having left. An audit line too — this is the only event that moves a money total DOWNWARDS after the fact. /admin/support grows a "Given back" section on the day it first has one. |
| M03 | F | `220ebec`. The person page's contribution sum gained `livemode: true`, which every other money surface already had. |
| M60 | F | `220ebec`. `razorpayLivemode()` read the keys through `credentials()`, which THROWS when they are unset — and it is called while a Prisma `where` is being built, so the throw escaped the surrounding `.catch()` and 500'd the page. Reads the env directly now. An environment with no keys has no live money in it, so `false` is the answer rather than a fallback. |
| M56 | F | `220ebec`. **The report's diagnosis was half right.** The retry latch WAS cleared on failure; what killed the retry is that a failed `<script>` leaves its element in the DOM and the "already loaded?" check looked for the tag rather than for `window.Razorpay`, so every later attempt resolved instantly and handed the caller a checkout that did not exist. Checks the global now, and removes the corpse. |
| Lows 8, 116 | F | `220ebec`. "Did not go through" counted test orders and was silently capped at the last hundred rows; it is now its own live-only count over the whole history, and the four windowed tiles say they are windowed. The ledger section below was renamed, because a tile and a list reading 21 and 23 under identical words is a number that looks wrong with no way to tell which is which. A failure reason surviving a successful retry is cleared on the paid transition. |

### The demo database had received none of this

Found by the write-path reviewer, confirmed live, and **it would have broken the
demo on the owner's next push**. The demo deployment has its own Supabase project
and there was no way to apply a manual migration to it, so it had drifted since
2026-08-20: no `User.showEmail`, none of the Catch-up pause or filing columns,
and three tables (`AuditLog`, `PendingImagePurge`, `QueueLease`) that did not
exist. Every one of those is read by code already committed here.

`scripts/dev/run-sql.mjs --env <file>` is the fix for the cause (`b3a2f4a`); all
fourteen outstanding migrations were then applied to the demo database, in date
order, and `verify-guard.mts` now passes **15 of 15** where it previously could
not finish. A second database with no way to migrate it is a second database
that will be wrong.

### Review findings acted on

- **write-path-reviewer** on the B-063 diff came back clean on authorization
  ordering, the founder guards, `clearCatchupNotifications`' scoping, the P2002
  retry, and the migration's idempotence — and found four real things, all fixed
  before the commit:
  1. **M53's guard failed open on a MISSING `ADMIN_EMAIL`**, reintroducing the
     exact incident it was written to prevent. Fixed in two places (above).
  2. **The retention sweep raced a restore.** Read the due list, then delete, and
     a member pressing "Put back" in the gap had their restore silently undone:
     membership gone, no error, the row that said "4 days left" simply absent in
     the morning. The whole step is now one **serializable** transaction with the
     read inside it — the same instrument the last-admin guard uses (M26). If it
     aborts, `step()` records it and tomorrow's pass does the work; the sweep is
     idempotent by design, so losing a night costs nothing and a member's undo is
     the thing worth protecting.
  3. **`addCatchupMembers` could clear another member's personal filing state.**
     The stamp-clearing update was scoped to everyone named in the call rather
     than to those actually added, so a Keeper re-listing an existing member
     dragged their own copy back out of their bin. Scoped to genuinely new
     members now — the picker never offers an existing one, so this only ever
     mattered to a hand-made call, which is exactly the kind that must not be
     able to do it.
  4. **No `IS_DEMO` guard on the three new actions.** The demo is one shared
     persona, so these three — personal everywhere else — would there change the
     list for whoever else is looking. All three refuse with one honest sentence.
  Its check on "a member with two binned Catch-ups in one group" came back
  structurally impossible: `Catchup.groupId` is `@unique`, so a group has at most
  one Catch-up and a member at most one pref row per group.

### Net-new findings (not in the audit)

- **B-203 — "Start one" on a group card creates a DUPLICATE group.** Found live
  while testing B-063. `/catchups/new?group=<id>` preloads that group's name and
  members, but `createCatchupWithPeople` always mints a NEW Group row, so the
  original card stays on the list saying "No Catch-up here yet" with "Start one"
  still on it — for ever, and pressing it again makes a third. Reproduced with
  the throwaway accounts: two rows both named "Batch of 1965", one live and one
  dormant. **Not fixed: it needs an owner decision**, because the two readings
  lead to materially different work. Either (a) "Start one" means *for this
  group*, and the Catch-up attaches to it — but then a custom name renames a
  shared batch group and extra people picked join it, both of which are one
  member's private choice with a shared side effect; or (b) it means *seeded
  from this group*, which is what the page's own docblock says it means, and the
  fix is on the index instead: stop rendering a card for a group that has no
  Catch-up, since the header's permanent "Start a Catch-up" button and the
  create page's one-tap "Everyone from <batch>" already cover it. (b) is the
  cheaper and more honest reading, and it removes a row rather than adding
  machinery; it also removes an affordance the owner has already reviewed, which
  is why it is his call.

### Session 3, part two — the clusters after B-063

| ID | | Outcome |
|---|---|---|
| B-203 | F | `31f84c9`. **Net-new, owner decided.** "Start one" on a group card minted a NEW group, so the original row stayed forever offering to do it again; pressing it twice gave two rows of the same name and a third on the next press. Offered the two readings, the owner chose **drop the row**: attaching would mean one member's private naming choice renaming a shared batch group and their picked people joining a batch they may not be from. `?group=` went with it (that row was its only producer, and the create page was spending two membership queries per load resolving a link nobody could send). |
| M08 | F | `43b3d9b`. Cadence change now recomputes `nextOpensAt` from the last Round's publish moment, not from now: anchoring on now would let a Keeper push the next Round away by opening a menu. An already-overdue result lands on now. |
| M09, M54 | F | `43b3d9b`. New `src/lib/report-error.ts`. Both the Catch-up engine and the retention sweep swallow their own errors by design, but only `console.error` saw them, so Sentry — which exists because "nobody reports a broken page, they leave" — never heard. The sweep route also answers **502** when a step failed, so the nightly job goes red instead of green. Imported dynamically in `catchups.ts` because that file must load under `node --test` with no database. |
| M10 | F | `43b3d9b`. **The two render sites disagreed in both directions.** The home hid an anonymous asker from everyone but the asker; the published Round revealed them to any Keeper, with no cue. One `askerVisible` now decides, **with no role argument at all**, so the rule cannot grow an exception without its signature changing. The Round gained the cue: "asked anonymously", and "asked by you, anonymously" for the one person who does see it. |
| M11, Low 37 | F | `43b3d9b`. "Answered" was derived from the text on screen, not from what reached the database, so a failed save still ticked the progress rail and showed the completion card. Now only `failed` disqualifies, the text always stays, and the card says "Not saved" in red. Saves for one question queue instead of racing. |
| M12 | F | `43b3d9b`. New `catchup-caps.ts`; the picker adds as many as fit and says how many did not. |
| M13 | F | `43b3d9b`. Archive was a query per published Round, each reading every answer BODY to count distinct authors. One `groupBy` that reads no bodies, plus a single-row teaser query for the six most recent. |
| M23, M38, M39, M36, Lows 70, 71, 73 | F | `7855437`. New `batch-year.ts` (tested): `?year=abc` was NaN and 500'd the directory. `nulls: "last"` on every batch sort — verified live that the four members with no batch year now sort last. Load-more recovers from a cursor row that left the result set, and a page fetched under old filters is dropped rather than appended. Year + range now intersect instead of the range clobbering the tile. |
| M53 | F | `16425be`. See above. |
| M03, M56, M58, M59, M60, Lows 8, 116 | F | `220ebec`. **M59 has teeth**: a forged POST could get Razorpay to DISABLE the webhook, silently stopping real payment confirmations. Now 2xx for a body we will never trust, 500 only for a missing secret, and an audit line (deduped to one an hour) replacing the dashboard signal. **M56's diagnosis in the report was half wrong**: the retry latch WAS cleared; what killed the retry is that a failed `<script>` leaves its tag in the DOM and the "already loaded?" check looked for the tag rather than for `window.Razorpay`. |
| M14, M15, M16, M17 | F | `74d2a18`. Row before bytes at all three delete sites, via `PendingImagePurge` inside the same transaction. Pixel-budget ceiling on stored images: **measured on a real 81MP image, 9000x9000 in, 6324x6324 (40.0MP) out in 1.3s**, thumbnail derived from the display copy in 69ms instead of a second full decode. Animated GIFs are still flattened (frame count multiplies the decode budget; an upload path is not where to discover that) but now SAY so at all three upload surfaces. |
| M50, M51, M52, Lows 20, 22, 114 | F | `9e91c98`. Token burn and its effect are now one transaction. **Proved end to end on a throwaway account**: the reset moved credentialVersion 0→1, set emailVerified, changed the hash and burned the token together; replaying the link gave "That link has been used"; a verify link burned only itself. Two things were fixed in the agent's work before committing: it had **copied the token hash into a second file** (two implementations of one hash breaks every reset the day somebody edits one), and its claim had **dropped `readToken`'s "address has not moved on" check**. |
| M05, M06, M28, M29, M30, M31, M32, M49 | F | `6aaefbb`. Error boundaries inside the shell and the auth group; five missing `loading.tsx`. **M30 is half wrong and worth recording**: it says the visibility RULE lacks an author self-exemption. The rule has carried one from the start, deliberately above the `isHidden` check so an author can still reach a post a moderator hid. Only `loadPosts` was missing it. A test pins the hidden-post case because it reads like an oversight and is not. M31 replaced two hand-rolled copies of the audience rules (each testing three of four, both omitting `targetBatches`) with the shared `canViewPost`. |
| M61, M62, M63, M64, Lows 66, 68 | F | `c6cc339`. The demo reset is one transaction, so a visitor cannot land on a half-built world and get redirected to a `/login` that cannot work. `/api/places` reopened — the proxy comment justifying its closure described a metered geocoding provider the route has not been for a long time — and the demo now seeds the cities its own people live in. |
| Lows 38, 88, 92, 99, 107, 109, 110, M41, M45 | F | `d08286d`. Grapheme-aware truncation everywhere (tests assert no lone surrogate survives, rather than checking one example string). `normalizeHouse` resolved through the prototype chain. Two schemas capped one name column at two different numbers. Checked the live data first: longest name is 20 characters, none blank, so nothing saved today became unsaveable. |
| Lows 51, 102, 103, 104, 105 | F | `98c7073`. The metric snapshot ran at 21:00 UTC and asked PostHog for "today", permanently missing 02:30-05:30 IST every day. Moved to 00:10 UTC recording the day that just ended, which also resolves the collision the file's own comment denied. |
| Low 43 | **N** | **Not a bug here.** GitHub's documented 60-day auto-disable of scheduled workflows applies to PUBLIC repositories; this one is private (`gh repo view --json isPrivate` → true). Recorded rather than "fixed". |
| M21 | **N** | Already closed by session 1's pool config (`e98474a`): connect, query and pool-checkout timeouts are set. `statement_timeout` is deliberately absent and must stay absent — Supavisor drops it. |
| M37 | **N** | Already fixed by session 2's B-042 sweep: load-more uses `callAction` + try/finally + a toast. |
| M22 | **D** | **Deferred, owner's call.** The root layout reads the theme cookie, which opts every route into dynamic rendering including the six public pages that could be static. Every fix trades that for a flash of the wrong theme on a first visit, which is the exact thing the cookie read exists to prevent and which the owner would notice immediately. It is a latency optimisation on six pages, not a correctness bug. |
| M24 | **D** | Deferred: `touchLastSeen` fires only on layout render, so soft navigations go uncounted. The fix is a client-side route-change reporter, which is a new surface rather than a correction. |
| GitHub items | F | `61bb340`. Renovate had stopped opening ALL pull requests because `.github/renovate.json` carried an `_comment` key, which is not a Renovate option. `npm audit fix` cleared eleven of twelve advisories including both bumps Dependabot PR #10 wanted, so that PR can be closed rather than merged. Three left, none a production risk: npm's "fix" for Prisma is a DOWNGRADE to v6; puppeteer's is a semver-major to QA tooling nothing in `src/` imports (Renovate's own rules will now propose it alone); `xlsx` has no fix at any version and is used by one hand-run script over the owner's own files. |

## Session 4 — what shipped

**Session 4: 2026-08-21.** The tail: the last Medium roots, the Low appendix, and the close-out.

### The Medium tail

| ID | | Outcome |
|---|---|---|
| M01 | F | `cb1a111`. Both report endings used a plain `update` with no precondition, so two admins working the queue at once — or one double-click — wrote the status twice and dragged a note plus a notification into the reporter's conversation each time. The reporter could be told "we left it as it is" AND "we dealt with it" about one flag. `updateMany` with `status: "pending"` in the WHERE makes the transition the decision; the loser is told somebody got there first, and the list refreshes on that refusal too, because the stale row on screen is what produced the mistake. |
| M04 | F | `cb1a111`. New `User.verifyStateAt` (`2026-08-21-verify-state-at.sql`, applied to BOTH databases). The worklist ordered "asked to be verified" by `updatedAt` ascending — but Prisma bumps `@updatedAt` on every write to the row, including `touchLastSeen`'s fifteen-minute stamp, so the queue really read "least recently active" and every row said "3m ago" for as long as the person had a tab open. NOT NULL with `default(now())` so the queues never meet a null and never need a fallback ordering; backfilled from `verifiedAt` (all 52 live rows had one). Stamped at all four `verifyState` writers, with the rule written at the column. **Worth recording:** nothing writes `verifyState: "flagged"` any more — report-action dropped that deliberately in the security work — so the worklist's flagged queue can only ever surface rows predating that decision, and the live database has none. Left in place; an admin may still set it by hand. |
| M25 | F | `0eeda58`. The keystroke dedupe deduped nothing: it matched on an EXACT query string, and two consecutive keystrokes never produce the same string, so typing "Bengaluru" wrote eight rows exactly as the docblock said it must not. New pure `search-continuation.ts` (`isSameSearch`: either is a prefix of the other), tested, and the row now follows the typing to wherever it stops — the LATEST text, not the longest, so trimming back to "Bengal" records "Bengal". |
| M42 | F | `0eeda58`. **Proved with a probe, before and after.** `posthog.init()` ran in the PROVIDER's effect and React runs a child's effects first, so `<PostHogIdentify>` always fired first, found `__loaded` false and returned — and its deps never changed, so it never ran again. Every full page load into a signed-in route was an anonymous session. Init moved to module scope, which runs before any render and therefore before every effect. The old silent `return` now logs in development: that silence is what hid this for the whole life of the analytics room. Before: the probe caught `[posthog] identify skipped`. After: `$user_state: "identified"`, `distinct_id` = the member's cuid. |
| M43 | F | `5a8d43f`. `targetBatches` was the one field on createPost that reached the column exactly as the client sent it — `z.string().optional()`, no cap, no shape — while every neighbour carried one. A server action is a public HTTP endpoint, so that was megabytes per post into a column every feed query LIKE-scans. The vocabulary (`parseBatchTargets`, `batchTargetKey`, `batchTargetsInclude`, `storedBatchTargets`) lives in `post-visibility-rule.ts`, which is the file that decides what a target list MEANS, so the write path and the read path cannot disagree; the schema refines against the same reader, and what gets stored is rebuilt from the parse the way `images` is rebuilt from `ownedUploadUrls`. **A second bug found while fixing it:** matching was `stored.includes(key)`, so a post aimed at "ISC-20111" was shown to everyone in ISC-2011. Token-exact now. The three queries that each hand-built the same audience OR — and each hand-built the viewer's key as `${batchType}-${batchYear}`, which for a member with no batch was the literal string "null-null" — share one `batchScopeWhere` fragment. |
| M44 | F | `5a8d43f`. `/api/users/search` split the query on whitespace and built one ILIKE clause per token with no ceiling. Six terms, and `q` itself capped at `FULL_NAME_MAX`. The tail is DROPPED rather than refused: every extra token only narrows, so ignoring it returns a superset — the safe direction, and invisible to anyone typing a real name. |
| M35 | F | `4bde823`. Both halves. Client: an in-flight REF (not just the state flag) on the comment form and the composer, because `disabled` only takes effect on the next render and an Enter plus a click in one frame reached the action twice. Server: Post and Comment are free text so no unique index can dedupe them, and the client guard cannot see a second tab or a retried request — an identical write by the same author within ten seconds returns the first row as though this call had made it, with the notification suppressed on the duplicate. |
| M66 | F | `4bde823`. **Proved end to end.** The desk autosaves the WHOLE body and `editPost` had no precondition, so a laptop and a phone on one draft meant whichever wrote more lost it, with both surfaces saying "Saved". Every save now carries the row version it was working from (`baseUpdatedAt`), the update is conditional on it, and a stale save is refused with a sentence saying so. `updatedAt` is `TIMESTAMP(3)` and JS Date is millisecond-precision, so the token round-trips exactly — checked live before relying on it. An in-flight autosave is awaited before an explicit Save or Publish, so a member's own autosave cannot make their Publish look like somebody else's edit. Probe: the desk saved, another surface wrote over the row, and the desk's next save was refused with the other surface's words intact. |
| M67 | F | `4bde823`. Both handlers computed from the `accepted` PROP while `onChanged` is a fire-and-forget `router.refresh()`, so a Keeper moving a question up twice quickly had the second click read the pre-first-click order and silently undo the first move. The list is held locally now, moves as it is clicked, and every action computes from what is on screen; props re-sync only when the id SEQUENCE really changed, or the optimistic move would flick back a frame later. One action at a time, reverted on failure. **Could not be seen live:** no round is in `collecting` today, and flipping a real Catch-up back would be mutating real member data. |
| M68 | F | `4bde823`. `saved.current[key] = value` was written BEFORE the action ran, so after a failure every later blur short-circuited on the first line: the banner said "That did not save", the member clicked back in and blurred again, and nothing was sent. Stamped on success. |
| M34 | F | `365805c`. **Proved in a rolled-back transaction against a real cross-author thread.** `Comment.author` was Cascade and `Comment.parent` is SetNull, so purging an account deleted every comment that member had written and silently PROMOTED every reply underneath to a top-level comment — the exact corruption the soft delete exists to prevent, as the schema's own comment on `deletedAt` says. `authorId` is now nullable with SetNull (`2026-08-21-comment-survives-its-author.sql`, both databases), matching `AdminMessage`, and `purgeUserAccount` deletes everything nothing hangs off while blanking the few still holding somebody else's reply. No personal data survives either way: words blanked, authorship detached. The read path already rendered an anchor stub with no author, so the ripple was seven sites. `cascade-rule.test.mjs` gained a test pinning BOTH halves, because either alone brings the bug back — note Comment is still cascade-reachable through Post, so the existing "own writing goes with them" assertion still passes and would NOT have caught this. |
| M46 | F | `365805c`. The legacy `/notice/[id]` resolver created a thread unconditionally, so two requests arriving together both minted one. It reuses a thread matching (member, notice, the notification's own timestamp) — which is exactly what `openAdminNoticeThread` stamps. Live count of reachable rows: zero, so this is future-proofing a legacy path rather than a live fix. |
| M47 | F | `365805c`. The letters index stopped dead at 40 with no link and no hint. Twenty per page with keyset `?before=` links ("Older letters" / "Back to the latest"), keyset rather than offset because letters publish while people read. A plain link, not a load-more button: an archive index is read rather than scrolled, and this keeps it a server component with a URL somebody can share. Malformed cursor is ignored rather than reaching Prisma as an Invalid Date — the same trap M23 sprang on the directory. |
| M48 | F | `365805c`. Ten unbounded queries, every row resident at once, then `JSON.stringify(..., null, 2)` of the lot — the whole history in memory twice before a byte could be sent. Capping was not an option: an export that silently omits half a person's data is worse than a slow one, and completeness is the point of it. Streamed instead: each table walked keyset in pages of 500, each row written and dropped. Verified live — 200, parses, all ten sections, row shape unchanged. |
| M40 | F | `2bea4fc`. A failed place search and an empty one both landed as `results = []`, and an empty result list is what offers "Use what I typed" — so a dropped connection quietly became a coordinate-less place that looked like a real one, and the member's pin never appeared on the map. The failure is now tracked separately: the status line says the list could not be reached, and the save-as-typed row says "Saved as typed, with no map pin" instead of the claim "Not in our list", which we cannot make about a list we could not read. **Proved live** in `/lab/location-picker` with `/api/places/search` forced to 500. |
| M20 | F | `2bea4fc`. **Half was already done and the ledger had not caught up:** `sendMail` has carried a `SEND_TIMEOUT_MS` race since the mail work, citing M20. The other half was real: `verificationMailState` reaches Resend, and the (main) layout awaited it inside its render-blocking `Promise.all`, so an unconfirmed member's every page could hang for the provider's full ten seconds showing nothing. Now `sendInline` decides: the resend BUTTON passes true (somebody is watching it for an honest answer), the layout passes nothing and the send is scheduled behind the response with the same guarded `after()` shape `scheduleDrain` carries. |
| M19 | **D** | **Owner-blocked, and only the owner can unblock it.** Images are still served from `pub-a656209a5438484f9694738260255a5e.r2.dev` — confirmed live, every `Photo.url` row is on that host. The code half is one entry in `next.config.ts` remotePatterns, and it cannot be written because there is no custom hostname to write yet. See the owner list. The second strand — a plain `<img>` rather than `next/image` — is deliberately NOT changed here: it would alter the feed's look (an aspect ratio has to be reserved to stop the reflow, and the images currently size themselves) and it would route every photo through Vercel's METERED image optimisation. Both are the owner's calls, not a bug fix. Low 101 is the same question and is deferred with it. |

### The Low appendix

Grouped as they were fixed. **Nine were already closed** by earlier sessions' work and are recorded
here so nobody re-opens them: Low 1 (M26's serializable last-admin guard), Low 3 (`collectImageUrls`
runs INSIDE the purge transaction since B-011), Low 18 (M18), Low 39 (both indexes exist since
B-090 — checked in the schema), Low 54 (M05), Low 59 (M17), Low 61 (M48), Low 63 (B-042),
Low 60 (**the file it cites no longer exists** — `(auth)/onboarding/actions.ts` was deleted with the
legacy route; `components/onboarding/actions.ts` is zod-validated throughout).

| ID | | Outcome |
|---|---|---|
| Lows 7, 55 | F | `e579dad`. Three admin lists showed less than they counted and none of them said so. New `AdminCapped`. The Overview's rail counts every waiting row while the list takes twenty per queue, so past that they simply disagreed (`worklistIsCapped` derives the answer from the rendered items, so it cannot drift from what was drawn). `/admin/reports`' waiting queue had **no `take` at all** — the one page a spam wave arrives on. The money ledger's three lists are one window of a hundred contributions under headings that read like totals. |
| Lows 5, 6 | F | `e579dad`. Both admin surfaces passed `"office_list"` explicitly, so a member an admin had checked BY HAND was recorded and displayed as "Off the office list" — a claim about how it was done that was untrue. The default (`admin_manual`) is now let through, and only `tryRosterAutoVerifyQuietly`, which really reads the roster, writes the other. Verification also became a conditional TRANSITION, so a double press cannot send the member two identical congratulations (the shape `requestVerification` already carried for Low 20), plus an in-flight set on the button. |
| Lows 2, 4, 9, 10, 11, 12, 86 | F | `e579dad`. **Low 2:** new `@@unique([userId, position])` on `UserPlace` (`2026-08-21-user-place-position-unique.sql`, both databases, zero existing duplicates — checked before writing). Both writers are wipe-and-recreate, so interleaving could leave a member with two whole sets of cities. **Low 4:** `retryMail` refuses a row in `sending` (releasing a live claim would send the same real email twice) and its requeue is conditional on the status it read. **Low 11:** the Catch-ups admin page told the admin that opening a stuck Catch-up would nudge it — which is false, since the advance is scoped to the READER's memberships and an admin is usually not in that group. Rather than correct the sentence to say nothing could be done, the page now runs the UNSCOPED advance itself before it reads: idempotent, cannot throw, and the person looking at a list of overdue Rounds is exactly who wants them moved on. **Low 12:** the same cursor-recovery the directory carries for M39. **Low 86:** both thread pages took the most recent 200 messages (a member may write forty an hour) and say when they have stopped short. |
| Lows 23, 26, 28, 29, 32, 33, 36, 27/34/57 | F | `1c35a9f`. **Lows 27/34/57 were not a race but a certainty:** `position` was the COUNT of accepted prompts, so after any removal the next question landed on top of the last one. Read as `max+1` now, inside the same transaction as the cap check, with a `createdAt` tie-break at all three read sites. **Low 36:** clearing every field left the row, so a member who took their words back was still published as an empty card, counted in "N of the group wrote in", and counted as an entry by the too-few-answers rule. An emptied answer is deleted. **Low 23:** the reminder compare-and-swap omitted the `status` guard its three siblings carry, so a daily nudge could fire just after the Round published. **Lows 26/32:** the love toggle is delete-first with a P2002 catch, the shape `toggleLike` already had. **Low 28:** "Answers close today" was `Math.ceil` on a millisecond gap, so a 5pm-tomorrow deadline read as today from 6pm this evening; new `valleyDaysBetween` counts calendar days in the valley, tested. **Low 29:** creating a Catch-up twice minted two whole ones and notified up to a hundred people twice; `DOUBLE_SUBMIT_MS` moved to its own module and shared with M35's guards. **Low 33:** the invite page is the likeliest place in the app to meet the second gate and was answering it with a bare toast about "posting"; it uses `useEmailGate` like every other write surface. |
| Lows 74, 75, 76, 81, 83, 93, 98, 100 | F | `107a044`. **Low 74:** tapping your ALREADY-chosen poll option added one to it without subtracting from itself, so the percentages walked past 100. **Low 75:** the feed's load-more had no generation guard, so a page fetched under old filters was appended under the new list and its cursor adopted (M36's shape, for the feed). **Low 76:** the Saved shelf ended at 120 with nothing to say so. **Low 81:** `markFeedSeen` accepted a future date and only moves forward, so one crafted call retired a member's "new since" divider permanently. **Low 83:** the contact form shaped `input.phones.map(...)` BEFORE validation, so a crafted payload threw a raw TypeError out of a public endpoint. **Low 98:** the block control lives on the profile page, and a blocked profile 404s for everyone — so blocking somebody from their own page made that page unreachable and the button one-way. Admins are exempt now. |
| Lows 69, 84, 90, 96, 97, 111, 113, 115 | F | `6f5a29c`. **Low 97:** the vCard put the house history into NOTE with its commas and semicolons unescaped, and a vCard reads those as FIELD SEPARATORS — so every single download reached an address book as several mangled fields. New pure `vcard.ts` (escape + CRLF), tested. **Low 96:** new `yearClash`; years that cannot all be true saved silently and printed an impossible profile. Checked live first: zero existing rows are impossible, so nobody is trapped. **Low 84:** the profile's name field capped at a hand-typed 80 while signup allows `FULL_NAME_MAX` = 100, so some members could never edit their own name; the two schemas writing `phones` now share one `phoneList()`. **Low 90:** a bounce webhook can outrun the `providerId` write, and the match is on `providerId` alone, so the event was dropped and the row stayed "sent" for ever — it retries twice behind the response now. **Low 111:** `finally` re-enabled the Join button during the 1.4s celebration. **Low 115:** a failed auto-sign-in stranded the account with no path to `/welcome`; it goes to `/login?next=/welcome` with the explanation in a toast that survives the navigation. **Low 69 is half not-a-bug:** the one live "clash" (Delhi also matching New Delhi) is `city-coords.ts` DELIBERATELY aliasing them to one place, exactly as it does Chennai/Madras and Mumbai/Bombay. The `contains` was still the wrong operator for a filter — an unaliased pair like York/New York would conflate — so it is `equals` over the variant list. The house filter keeps `contains`, because `houses` is a JSON blob and no house name in `lib/houses.ts` is a substring of another (checked programmatically). |
| Lows 13, 14, 15, 17, 24, 41, 42, 46, 53, 106 | F | (this commit). **Low 13:** a second flight shared `abortRef`, `rafRef` and the failsafe with the first, so the old flight's five-second failsafe deleted the NEW bird mid-air; every loop and the failsafe now check a generation. **Low 15:** `pb-16` reserved 64px on every mobile page for a fixed bottom tab bar that does not exist. **Low 17:** a mid-tour navigation left the spotlight measuring a DETACHED element, whose rect is all zeros, so the dim collapsed to a pinhole; a disconnected target falls back to the plain full-screen dim. **Low 14:** `generateMetadata` and the page body both guard the same post in the same request, so `guardedPost` and `isMemberOf` are `cache()`d. **Low 46:** `setHours(0,0,0,0)` uses the SERVER's zone (UTC on Vercel), so "this month" began at 05:30 IST on the 1st; and `date_trunc('day', ...)` on a naive UTC column cut the loyalty day at the same seam. Both use the valley's clock now, the second by the double conversion B-101 established. **Low 41:** some mobile browsers hand over a picked photo with a BLANK MIME string — the quirk `isUnsupportedHeic` already documents — and every picker refused those with "Please choose an image"; `isImageFile` accepts a blank type with an image extension, which costs nothing because every path sniffs the bytes server-side anyway, and the six hand-rolled copies of that check now share it. **Low 42:** every caller wraps the STORAGE write in the same try as the sharp work, so a bad minute at R2 told the member to "try a different one" — a photograph that was never the problem. **Low 106:** `User.coverPhoto` is a Collection photo's URL worn as somebody else's banner, and nothing pointed at it, so purging the contributor left other members with a banner that would never load. |
| Low 53 | **N** | **Mechanism real, consequence absent — and the code comment was the actual defect.** Setting a cookie in a Server Action DOES make Next re-render the current page and its layouts (confirmed in the installed `next/docs`, 07-mutating-data.md), so `theme-actions.ts`'s claim that it "revalidates nothing" was wrong about the effect. But the finding's scenario — "toggling theme mid-scroll" — cannot happen: the only two callers are `LightsOn` and the dark gauntlet, each its own dedicated page, and both NAVIGATE the instant it resolves. The comment now says what really happens and names the fix (move the cookie write client-side; it is `httpOnly: false` already) for the day an inline switcher appears. |
| Low 89 | **D** | **Deferred, and the reason is that every available fix is worse than the bug.** The forgot-password fold is a check-then-insert, so two simultaneous requests can mint two reset rows and two emails. A partial unique index (`WHERE status IN ('queued','sending')`) is the correct instrument and Prisma cannot express one, so it would join the expression indexes as permanent `migrate diff` noise — for a duplicate email. A Prisma-expressible sentinel column (`pendingKey`, NULL when terminal) trades that for a worse failure: one transition forgetting to clear it locks that member out of ever receiving that kind of mail again. The existing fold catches every non-simultaneous case and `ENQUEUE_LIMIT` caps the blast radius. |
| Low 78 | F | **Owner decided, 2026-08-21: hide them.** Blocking already ended the account's sessions and removed the person from the directory, but everything they had written stayed on display under their name — and that name linked to a profile answering 404 for everybody else. One fragment, `AUTHOR_IN_GOOD_STANDING` in `lib/posts.ts`, is spread into the feed, Saved, the letters index, the letters rail and `VISIBLE_COMMENT`, so no list can forget it; `decidePostVisibility` gained an `author-blocked` refusal so a direct link cannot disagree with the list it vanished from. **No admin exemption in the LISTS** (a moderator has /admin/content, and scrolling past what they have just blocked somebody for is noise, not oversight) but the single-post rule keeps its admin exemption, so following a link from that surface still lands on the post. `authorIsBlocked` is OPTIONAL on `GuardedPost` and a missing value means "in good standing", so a query that forgets the join fails open on this one flag rather than emptying the feed — pinned by a test. Nothing is deleted; unblocking restores all of it. **Proved live**: a member's post was on the feed, gone the moment they were blocked, and back when unblocked, with the row restored. Deliberately NOT extended to the Collection — a photograph there was approved by an admin into a shared archive of the school's history, which is a different thing from something published under a member's own name; the decision is recorded at `User.isBlocked` in the schema. |
| Lows 16, 101 | **D** | **Both blocked on the same owner item as M19.** Low 16: the viewer's Download button fetches the image cross-origin from `pub-*.r2.dev`, which sends no CORS header, so it silently degrades to opening the photo in a tab. Fixing it needs either a custom domain we can set CORS on (his) or a same-origin download proxy (a new route, only worth writing once the domain question is settled). Low 101: reserving space for an image to stop the reflow means choosing an aspect ratio, which changes how the feed looks, and `next/image` would route every photograph through Vercel's METERED optimisation. Both are his calls. |


## Still open

**Canonical: NONE. All 45 are fixed** (session 3 closed the last, B-063, in `b332301`).

### After session 4: every finding in the report is dispositioned.

**§3.M — 68 of 68.** Fixed: 63. Not a bug: M21, M37. Deferred with a reason: M22 (theme cookie
makes every route dynamic; every fix trades it for a flash of the wrong theme), M24
(`touchLastSeen` misses soft navigations; the fix is a new client surface), **M19 (owner-blocked:
there is no custom R2 hostname to write into `next.config.ts` yet)**.

**§3.L — 117 of 117.** Fixed: 105 (including the nine already closed by earlier sessions' work).
Not a bug: Low 43 (public repositories only), Low 53 (mechanism real, scenario impossible; the
comment was the defect and is corrected). Deferred with a reason: Low 16 and Low 101 (both blocked
on the same owner item as M19), Low 78 (**owner decision** — the audit says so itself), Low 89
(every available fix is worse than the bug; argued in full above).

**Feature builds: both shipped.** B-050 in `eedbb3e`, B-063 in `b332301`.
**Net-new, both fixed:** B-202 (session 2), B-203 (session 3, owner decided).

---

### The old worklist, kept for the record

**§3.M — 46 of 68 done, 22 left.** Done: M02, M03, M05, M06, M07, M08, M09, M10, M11, M12, M13,
M14, M15, M16, M17, M18, M23, M26, M27, M28, M29, M30, M31, M32, M33, M36, M38, M39, M41, M45,
M49, M50, M51, M52, M53, M54, M55, M56, M57, M58, M59, M60, M61, M62, M63, M64, M65. Not a bug:
M21, M37. Deferred with a reason: M22, M24.
**Still open (22):** M01, M04, M19, M20, M25, M34, M35, M40, M42, M43, M44, M46, M47, M48, M66,
M67, M68.

**§3.L — roughly 70 of 117 done, ~47 left.** Done: 8, 19, 20, 22, 25, 30, 35, 37, 38, 40, 43 (not
a bug), 44, 45, 47, 48, 49, 50, 51, 52, 58, 62, 64, 65, 66, 67, 68, 70, 71, 72, 73, 77, 79, 80,
82, 85, 87, 88, 91, 92, 94, 99, 102, 103, 104, 105, 107, 108, 109, 110, 112, 114, 116, 117.

**Feature builds: both shipped.** B-050 in `eedbb3e`, B-063 in `b332301`.

**Net-new, both fixed:** B-202 (session 2), B-203 (session 3, owner decided).

### B-063 — the owner's decisions, taken 2026-08-21 (session 2). BUILT in session 3 (`b332301`); kept here as the record of what was decided and why.

Asked directly, because the two readings led to materially different work and different risk:

1. **Delete is PERSONAL.** Any member can delete a Catch-up and it removes **only their own copy**.
   Nobody else's view changes. *(The owner was offered, and declined, the Keeper-only variant that
   soft-deletes the shared Catch-up for everyone.)* This is the safer shape: no member action can
   destroy anything another member relies on.
2. **A leaver's published answers STAY** in the Rounds they were published in. A published Round is
   a keepsake the whole group has read; pulling one person's answers out later would put holes in
   something other people remember.

The design presented and approved in chat:

- **Leave** — on the Catch-up's own People panel (where the finding says to put it). Immediate,
  confirmed, permanent. Refused for the creator, who is offered End or hand-over instead.
- **Archive** — tucks the card into an "Archived" section on `/catchups`. Still a member; this is
  for finished Catch-ups cluttering the list. Instantly reversible, no confirmation needed.
- **Delete** — your copy only. Moves to "Recently deleted", stops that Catch-up's notifications to
  you, restorable for 30 days with the days remaining shown on the row. After 30 days the nightly
  retention sweep removes your `GroupMember` row for real. Confirmation dialog, on-brand.
- **Where the state lives:** `CatchupPref` — it is already unique on `(catchupId, userId)` and
  cascades from both sides, so per-member state cannot leak across members by construction. Add
  `archivedAt` and `deletedAt`, both nullable, plus an index on `deletedAt` for the sweep.
- **Notifications:** a deleted Catch-up stops notifying that member (`groupMemberIds` in
  `catchups-notify.ts` must exclude them). An archived one does not — archiving is filing, and
  muting already has its own control (`reminderMode`).
- **The two extra sections render only when they have something in them** (owner: "hidden entirely
  when the member has none, no dead buttons").

---

## What is owed to the OWNER, carried forward from session 4

Nothing below is a fix somebody forgot. Each one needs a decision or an account only he has.

1. **The R2 serving domain.** Confirmed live again this session: every stored image is on
   `pub-a656209a5438484f9694738260255a5e.r2.dev`, which Cloudflare rate-limits and documents as not
   for production. **This is the one he already remembers, as "the image CORS thing."** It needs a
   custom domain on the bucket and `R2_PUBLIC_BASE_URL` set in Vercel; the code half is one line in
   `next.config.ts` remotePatterns and is ours the moment the hostname exists. Three findings wait
   on it: M19, Low 16 (the photo viewer's Download silently becomes "open in a tab", because a
   cross-origin fetch to a bucket with no CORS header cannot read the bytes) and Low 56.
2. **`next/image` for feed photographs, or not (Low 101).** Photos render through a plain `<img>`
   with no reserved space, so the page reflows under the reader as each one loads. Fixing it means
   choosing an aspect ratio to reserve — which changes how the feed looks — and switching to
   `next/image` would route every photograph through Vercel's METERED image optimisation, which
   has a monthly quota and a bill past it. His call on both counts, and worth taking with the R2
   domain above since they are the same photograph.
3. ~~**Blocked members' existing posts (Low 78).**~~ **Answered 2026-08-21: hide them.** Done; see
   the Low appendix above.
4. ~~**`CRON_SECRET`**~~ **Added 2026-08-21.** Both guarded routes still answer 401 locally, because
   the dev server has been running since before the variable existed and `process.env` is read at
   boot — a restart of `npm run dev` is all it needs, and then `/api/catchups/tick` and
   `/api/retention/sweep` can be exercised with `Authorization: Bearer $CRON_SECRET`. Both refuse
   correctly with no header.
5. **`EMAIL_DEV_SEND` is no longer set in `.env`** — checked this session. Nothing to do; recorded
   so the previous sessions' warning is not carried forward as if it still applied.
6. **Dependabot PR #10 can be closed rather than merged** (session 3 applied those bumps locally).
7. **Four duplicate reports on one post** are still in the live `Report` table from before the
   dedupe existed. Harmless; his to clean up if he wants the number tidy.

## One thing for the OWNER, found live (not in the audit's own words)

**`EMAIL_DEV_SEND=1` is currently set in the local `.env`.** That flag makes this development
machine send REAL mail, from the production sending domain, to real member addresses in the shared
production database. It exists for the deliberate case of checking how a message renders in an
inbox; it is not meant to stay on. Nothing was sent by session 1 (the queue was empty; the only two
recent rows are from 2026-08-20 12:07 UTC, before it started), but the next drain from any local
page view will send whatever is queued.

Short answer for the owner: comment that line out in `.env` when you are not actively testing a
mail template.

This is audit item **M53** ("EMAIL_DEV_SEND marks real members' queued mail as sent in dev, shared
DB"), now confirmed live. The code fix session 2 should make: keep `queueIsSendable()` all-or-
nothing as it is, and give the drain's row selection a development-only `to: { in: [ADMIN_EMAIL] }`
filter, so a local drain can never CLAIM a row addressed to somebody else. Do NOT make `sendMail`
refuse the address instead — a refusal there is a non-transient failure, so the row would burn its
attempts and end up `failed`, which is the 2026-08-12 incident wearing a different hat.

## Things a later session should know

- **Another session shares this checkout.** Stage by name, never `git add -A`. Session 3 hit this
  from the other side: an agent's already-saved edit to a file was swept into an unrelated commit
  because that file was staged by name for a different reason. Check `git status` before staging.
- **`statement_timeout` does not work through Supavisor.** Proved twice. Don't add it back.
- **`CREATE INDEX CONCURRENTLY` cannot be used with `run-sql.mjs`**: it sends the file as one simple
  query, which Postgres wraps in an implicit transaction. Plain `CREATE INDEX IF NOT EXISTS` is fine
  at this data size.
- **A rolled-back transaction is the safest way to prove a destructive behaviour** against the shared
  production database: `BEGIN; DELETE ...; SELECT counts; ROLLBACK;` through `run-sql.mjs`. Used for
  B-001, B-121 and B-063's retention sweep.
- **`pg_trgm` lives in the `extensions` schema** and the operator class is schema-qualified in the
  migration, so the index does not depend on `search_path`.
- **Avoid backticks in `git commit -m` strings** — zsh eats them. Use a heredoc.

### Added by session 3

- **THE DEMO HAS ITS OWN DATABASE AND IT DRIFTS.** It had received NONE of the audit's migrations
  and would have broken on the next push. `node scripts/dev/run-sql.mjs --env .env.demo <file>` is
  how you apply one now (the `--env` flag was added for exactly this). **Any new manual migration
  must be applied to BOTH databases.** There is no automation for this; it is a thing to remember.
- **`npm run check` and a subagent's own gate at the same time will kill the process.** Session 3
  lost a turn to an OOM kill (exit 137) doing this. Tell every agent explicitly NOT to run
  `npm run check`, and give it `npx tsc --noEmit` + `npx eslint <files>` + `node --test <files>`
  instead. Serialise the heavy gates.
- **`Intl.Segmenter` is the right instrument for cutting text**, and it must be constructed ONCE at
  module load. Constructing an Intl object is the expensive part of using one, and `getInitials`
  runs per avatar.
- **`after()` throws SYNCHRONOUSLY outside a request scope** (confirmed against the installed
  next@16.3.1 source, error E468). A library function reachable from a non-request caller must use
  the `try { after(x) } catch { void x() }` shape that `scheduleDrain()` already carries.
- **npm's suggested audit fix can be a DOWNGRADE.** `npm audit fix --force` would take Prisma from
  7.9.1 back to 6.12.0 and break the app. Always read what a fix actually does.
- **Two agent reports in session 3 contained a real defect each**, both caught only by reading the
  diff: a hash function copied into a second file, and a security check silently dropped from a
  rewritten query. Both would have passed every gate. The rule holds: an agent's "passing" is a
  claim.
- **The audit is wrong sometimes, and saying so is worth more than a patch.** Session 3 found three:
  M30 (the rule always had the author exemption; only the list query lacked it), M56 (the retry
  latch was fine; the dead `<script>` tag was the cause), Low 43 (applies to public repositories,
  and this one is private). Sessions 1 and 2 found two more.

### Added by session 4

- **A red `npm run visual` is a question, and the answer is in the pixels, not the picture.** Six
  mobile routes failed after the `pb-16` removal and every diff image looked alarming (a whole
  tinted frame). Decoding both PNGs and comparing row by row gave the real answer in seconds: the
  shared area had **zero differing pixels** and every page was exactly 64px shorter. The two that
  did differ turned out to be a like count (3 -> 4) and the member count (51 -> 52) drifting since
  the baselines were taken. `node -e` with `pngjs` beats squinting at a diff.
- **A finding can be right about the mechanism and wrong about the consequence.** Low 53's claim
  that setting a cookie in a Server Action re-renders the page is TRUE (it is in the installed
  next docs). Its scenario — "toggling theme mid-scroll" — cannot happen here, because both callers
  are dedicated pages that navigate immediately. The defect was the code comment claiming the
  opposite, and that is what got fixed.
- **Check a "clash" against the data before fixing it.** Low 69 said the city filter's substring
  match conflates cities, and live data agreed: filtering Delhi returned New Delhi. But
  `city-coords.ts` aliases them DELIBERATELY, the same way it aliases Chennai/Madras. The operator
  was still wrong for an unaliased pair, so the fix stands — but "confirmed live" nearly became
  "confirmed wrong".
- **Two findings named files that no longer exist** (Low 60's `(auth)/onboarding/actions.ts`) or
  had already been fixed by an earlier session's cluster (Lows 1, 3, 18, 39, 54, 59, 61, 63). Grep
  before reading the fix direction.
- **`cache()` from React is the tool for `generateMetadata` + page double-fetching** (Low 14). Key
  it on STRINGS, never on a session object: `auth()` returns a fresh object per call, so an object
  argument makes every call a cache miss and the memo silently does nothing.
- **A partial unique index is the right instrument Prisma cannot hold.** Low 89 wanted
  `UNIQUE (userId, kind) WHERE status IN ('queued','sending')`. Prisma cannot express it, so it
  would become permanent `migrate diff` noise; the Prisma-expressible alternative (a nullable
  sentinel column) fails far worse if one transition forgets to clear it. Deferred on those
  grounds rather than patched.
- **A `@@unique` can be actively harmful where a reorder writes positions one row at a time.** The
  same instrument that fixed `UserPlace` (Low 2) would break `CatchupPrompt`'s reorder, because
  swapping two positions violates the constraint mid-transaction unless it is DEFERRABLE — which
  Prisma also cannot express. Fixed the arithmetic instead (`max + 1`, not `count`).
