# Medium canonical clustering (orchestrator judgment; report-ready)
# Format: B-ID | title | constituent W1 ids. "note under B-0xx" = fold into a High umbrella.

## Distinct Medium roots (own report entry)
M-Report-double: Report dismiss/resolve no status precondition (double-click/two-admins duplicate+contradictory) | W1-004
M-Merge-catchup: adminMergeUsers wholesale abort when both accounts answered same prompt (CatchupEntry unique) | W1-007,W1-066
M-Testmoney: Test-mode Razorpay money counted as real (person page sum, support funnel) | W1-006,W1-351,W1-352
M-Worklist-updatedAt: Worklist queues sort/timestamp on User.updatedAt, polluted by 15-min presence writes | W1-003
M-ErrBoundary: One error boundary for whole app — any widget throw unmounts the entire shell | W1-027
M-Loading: Five async DB routes ship no loading.tsx (zero feedback during auth+DB round trip) | W1-028
M-Turnstile-dead: Turnstile blocked/erroring client-side bricks sign-in permanently (dead latch, misleading copy) | W1-093,W1-335,W1-036
M-Cadence-resched: Changing cadence doesn't reschedule an already-set nextOpensAt | W1-046
M-Catchup-swallow: Catch-up engine failure swallowed to console.error, Sentry blind, member sees nothing | W1-048
M-Anon-unmask: Anonymous question askers unmasked to Keepers in published Rounds, no cue | W1-062
M-Answer-falsesuccess: Answering marks 'shared'/shows completion card even when the save failed | W1-065
M-Batch100: 'Everyone from my batch' can exceed the 100-person create cap, submission then fails flat | W1-067
M-Archive-nplus1: Catch-up home archive N+1 fetches every entry body of every published Round on each view | W1-064,W1-142
M-Orphan-presign: Orphaned R2 objects — abandoned presign, staging/, refusal paths skip cleanup, no sweep | W1-077,W1-095,W1-166,W1-180
M-GIF: Animated GIFs silently flattened to first frame by every server encode path | W1-080
M-Encode-heavy: contributePhotoDirect re-encodes up to 100MP originals at full res (timeout/memory) | W1-083,W1-167
M-Delete-order: deletePost/deleteDraft/declinePhoto delete R2 bytes BEFORE the row (inverts stated invariant) | W1-085,W1-174,W1-217
M-DBdown-login: DB outage during login shown as 'Invalid email or password' → doomed reset loop | W1-096
M-r2dev: Production images served from throttled pub-*.r2.dev via plain <img> | W1-099
M-Resend-layout: sendMail no timeout + layout blocks render on Resend for unconfirmed members | W1-100,W1-106,W1-126,W1-165,W1-175,W1-272
M-NoTimeout: No connect/query/statement/pool-checkout timeout at any layer | W1-105
M-Landing-dynamic: Root layout awaits theme cookie → every route dynamic, landing not static as promised | W1-125,W1-339
M-Directory-NaN: Unvalidated numeric directory params reach Prisma as NaN → whole page 500s | W1-127,W1-179,W1-194,W1-234
M-Visit-undercount: touchLastSeen fires only on layout render → soft navigations uncounted | W1-129
M-SearchLog-dedupe: SearchLog keystroke dedupe doesn't dedupe (each prefix distinct) | W1-144
M-LastAdmin-race: adminSetRole last-admin guard check-then-act → two demotions → zero admins | W1-153
M-Razorpay-failoverpaid: payment.failed branch check-then-update can overwrite a concurrent 'paid' | W1-154
M-Comment-parent: createComment never verifies parentId belongs to postId (cross-thread reply, count inflation) | W1-213
M-Report-nodedupe: Post reports have no per-(reporter,post) dedupe | W1-216
M-Self-cityscope: Own city-scoped post vanishes from own feed (list queries lack author self-exemption) | W1-220
M-Letter-targetbatch: Letter reading page + generateMetadata skip the targetBatches visibility check | W1-221
M-Draft-unverified: Unverified members cannot save letter drafts (contradicts documented intent) | W1-222
M-Relike-spam: Re-like mints a fresh notification every time, un-rate-limited → bell spam | W1-223
M-Purge-comments: Account purge hard-deletes comments, silently promoting replies to top-level | W1-224
M-Post-doublesubmit: createPost/createComment have no unique guard and thin double-submit protection | W1-225
M-Loadmore-race: Load-more stale page appended under new filter, adopts old cursor | W1-198,W1-302
M-Loadmore-err: Load-more no error handling (button stuck 'Loading...') | W1-199,W1-219
M-Batch-nulls: 'Batch: newest first' lists no-batch members first (Postgres DESC NULLS FIRST) + keyset skips them | W1-200
M-Loadmore-deleted: Keyset load-more silently truncates when the cursor row was deleted | W1-201,W1-215
M-LocationPicker-degrade: LocationPicker silently converts to free-typed coordinate-less on /api/places failure | W1-202
M-Proto-house: normalizeHouse resolves via prototype chain (constructor/toString/valueOf 'match') | W1-323
M-PostHog-race: PostHog identify never fires on full page load into a (main) route | W1-324
M-Targetbatches-cap: postSchema.targetBatches no cap/format, stored raw, LIKE-scanned by every feed query | W1-236,W1-326
M-Search-tokens: users/search builds one AND-clause per whitespace token, unbounded query | W1-237
M-Whitespace-name: Whitespace-only display name passes schema, titleCase collapses to empty | W1-238
M-Notice-idempotent: /notice/[id] legacy resolver non-idempotent → duplicate admin threads | W1-256
M-Letters-40: Letters index truncates at 40 with no pagination | W1-257
M-Export-unbounded: /api/account/export streams entire history in one unbounded JSON | W1-287
M-Cancel-settings: deletion-cancelled notification links to /settings (dead route) | W1-286
M-Claim-scope: email-queue claim not scoped → duplicate sends past the 2-min stale window | W1-268,W1-269
M-Resend-banner: resendVerification maps 'failed'→'imminent' → banner lies after terminal failure | W1-270
M-Token-mint-burn: Failed sends consume token-mint rate limit → real resend blocked | W1-271
M-DevSend: sendMail EMAIL_DEV_SEND marks real members' queued mail as sent in dev (shared DB) | W1-267
M-Sweep-silent: Retention-sweep step failures invisible to nightly alarm (route answers 200) | W1-314
M-Notif-retention-conflict: Contradictory notification retention (prune.mjs 30d vs retention.ts age) | W1-313
M-Razorpay-scriptretry: Checkout script retry broken after one failed load (dead <script> latch) | W1-347
M-Contrib-norl: startContribution has no rate limit (unbounded orders/rows) | W1-348
M-Refund-invisible: Refunds/disputes invisible — no webhook, no status | W1-349
M-Webhook-400: Webhook signature reject answers 400 → Razorpay auto-disables the endpoint | W1-350
M-Pickbird-500: /pick-bird 500s without Razorpay keys (razorpayLivemode throws at module scope) | W1-354
M-Demo-reset: Demo reset leaves world half-written, can sign concurrent visitors out to dead /login | W1-187
M-Demo-birdpicker: Demo tells visitors to change bird via species picker, which refuses | W1-188
M-Demo-welcome: /welcome (real onboarding) renders in demo, not in DEMO_CLOSED_PATHS | W1-189
M-Demo-cities: City autocomplete dead throughout demo (/api/places closed, empty gazetteer) | W1-190
M-Admin-nocatch: Admin client wrappers await actions with no try/catch; several actions throw | W1-005
M-Twotab-draft: Two tabs/devices editing one draft silently clobber (last-write-wins) | W1-253
M-Reorder-rmw: Catch-up reorder/remove stale-props read-modify-write, no pending guard | W1-304
M-Field-retry: Profile field save stamps 'already saved' before success → failed save cannot be retried | W1-282,W1-306

## Fold as notes under a High umbrella (do NOT make separate entries)
note under B-011/B-093: W1-008,W1-094,W1-279,W1-315,W1-010 (purge/sweep unbounded R2, telemetry growth)
note under B-030: W1-082,W1-107,W1-163,W1-164,W1-285 (more 4.5MB instances)
note under B-090: W1-137,W1-138,W1-139,W1-140,W1-141,W1-218 (missing-index instances)
note under B-100: W1-009,W1-047,W1-063,W1-081,W1-110..114,W1-130,W1-249,W1-303,W1-097,W1-172,W1-214 (IST date instances)
note under B-042: W1-024,W1-078,W1-199,W1-219,W1-284,W1-334 (client no-catch instances)
note under B-002/B-070/B-071/B-072: email-queue mediums W1-145,W1-176
note under B-120: W1-025,W1-129,W1-251,W1-301 (bell badge desync instances)
note under B-020: W1-098,W1-177,W1-337 (dup batch-group instances → B-121)
note under fire-and-forget (make B-093 sibling or its own): W1-026,W1-037,W1-128,W1-143,W1-162,W1-316,W1-325
