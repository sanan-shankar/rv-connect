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

## Still open

**Canonical: NONE. All 45 are fixed** (session 3 closed the last, B-063, in `b332301`).

**§3.M:** 50 of the 68 Medium roots remain. Done: M02, M03, M07, M18, M26, M27, M33, M53, M55,
M56, M57, M58, M59, M60, M65. Deferred with a reason: M24 (needs a client-side reporter, which is
design work rather than a correction; a soft navigation inside `(main)` never re-runs the layout, so
the fix is a route-change listener that pings a small endpoint, and that is a new surface rather than
a corrected one).

**§3.L:** ~88 of the 117 Low items remain. Done: 8, 19, 25, 30, 35, 40, 44, 45, 47, 48, 49, 50, 52,
58, 62, 64, 65, 67, 72, 77, 79, 80, 82, 85, 87, 91, 94, 108, 112, 116, 117.

**Feature builds: both shipped.** B-050 in `eedbb3e`, B-063 in `b332301`.

**Needs an owner decision:** B-203 (see "Net-new findings" above).

### B-063 — the owner's decisions, taken 2026-08-21 (session 2), not yet implemented

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

- **Another session shares this checkout.** It committed `d86005d copy(support): ...` mid-way
  through. Stage by name, never `git add -A`.
- **`statement_timeout` does not work through Supavisor.** Proved twice. Don't add it back.
- **`CREATE INDEX CONCURRENTLY` cannot be used with `run-sql.mjs`**: it sends the file as one simple
  query, which Postgres wraps in an implicit transaction. Plain `CREATE INDEX IF NOT EXISTS` is fine
  at this data size.
- **A rolled-back transaction is the safest way to prove a destructive behaviour** against the shared
  production database: `BEGIN; DELETE ...; SELECT counts; ROLLBACK;` through `run-sql.mjs`. Used for
  B-001 and B-121.
- **`pg_trgm` lives in the `extensions` schema** on this project and the operator class is
  schema-qualified in the migration, so the index does not depend on `search_path`.
- **Avoid backticks in `git commit -m` strings** — zsh eats them. One commit message needed amending.
