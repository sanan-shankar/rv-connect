# Audit working findings (orchestrator notes)

Raw candidate observations. Everything here is UNVALIDATED until it passes Phase 5.
Findings graduate to bug-report.md only after an independent refuter passes them.

## Seeds from orchestrator's own schema read (2026-08-21)

- SEED-1: `prisma.ts` `new PrismaPg({ connectionString })` — no explicit pool `max`;
  `pg` default is 10 per instance. Connection-budget math input. Also no `idleTimeoutMillis`
  override (default 10s) — check against Supavisor client cap for the compute tier.
- SEED-2: `Post` has no `[authorId, createdAt]` index — profile page post lists likely seq-scan.
  Postgres does NOT auto-index FK columns.
- SEED-3: `Like` unique is `[userId, postId]` (userId leading) — like counts per post
  (`WHERE postId=`) have no usable index. Same shape: `PollVote` counted by `pollOptionId`
  (no index), `PhotoLove` by `photoId` (userId leading), `CatchupEntryLove` by `entryId`
  (userId leading), `CommentLike` by `commentId` (userId leading).
- SEED-4: `Report` unique is `(reporterId, reportedUserId)` only — POST reports (reportedUserId
  NULL) are unconstrained: same member can file unlimited reports on one post unless app checks.
- SEED-5: telemetry tables `Visit`, `SearchLog`, `ContentView`, `LoginAttempt`, `AuditLog` —
  which have retention/pruning? ContentView is bounded by design; the others need checking
  against the retention sweep.
- SEED-6: JSON-in-string columns: `User.houses`, `User.phones`, `User.links`, `Post.images`,
  `CatchupEntry.images`, `OutboundEmail.payload` — every JSON.parse site needs malformed-data
  guards.
- SEED-7: `Session`/`VerificationToken`/`Account` models exist but strategy is JWT credentials —
  dead tables? (not a bug, but check nothing half-uses them).
- SEED-8: `CatchupEdition.remindersSent` packed bitfield — bit-math bug surface, cron territory.
- SEED-9: check gate exit code: my first run piped through `tail` masked the real exit code;
  when reproducing gate behaviour never pipe. (TS error present = other session's WIP file
  `src/app/(main)/catchups/round/[editionId]/page.tsx`.)

## 2,000-user dossier inputs (from connection + scale + dates lenses, verified against installed source)

CONNECTION BUDGET (installed-source verified by connection lens):
- prisma.ts: `new PrismaPg({ connectionString })` — NO pool `max` (pg default 10/instance), NO
  connectionTimeoutMillis (checkout queues FOREVER, pg-pool index.js:205-207), NO statement/query
  timeout, min=0, idleTimeoutMillis=10s. Prisma interactive-tx defaults maxWait 2s / timeout 5s.
- Supabase FREE plan (OPERATIONS.md:57): 5GB/mo egress, Nano compute, no backups. Supavisor
  transaction-pooler client cap is small on Nano.
- Math: each Vercel instance can open up to 10 Postgres connections; at 2,000 members →
  tens-to-low-hundreds concurrent → many instances × 10 exceeds the pooler cap → because there is
  NO connectionTimeoutMillis, excess checkouts queue forever → the (main) layout awaits its
  Promise.all ABOVE every loading.tsx, so the member sees a BLANK page / platform 504, not an
  error page. Each hung request also holds a concurrency slot → compounding.
- FIX levers: (a) set explicit `max` (3-5) + connectionTimeoutMillis(5s) + statement_timeout(15s)
  + query_timeout(20s) on the single PrismaPg construction; (b) upgrade Supabase to Pro before
  launch (retires egress cap + backup gap + raises compute).
- pgbouncer/transaction-pooler compatibility: CLEAN (no SET/advisory-lock/LISTEN/NOTIFY/prepared-
  statement hazards; adapter uses unnamed statements; the only SET is tx-scoped isolation level).
  All 16 $transaction sites reviewed — NONE hold a transaction across an R2/email/network call
  (the would-be-Critical class is absent). DIRECT_URL is CLI-only, no runtime path reads it.

MISSING INDEX DOSSIER (B-090): Like.postId, Comment.parentId, PollVote.postId+pollOptionId,
CommentLike.commentId, PhotoLove.photoId, Post.authorId, CatchupEntryLove.entryId, Bookmark.postId,
Photo.uploaderId. All are hot count/FK columns whose uniques lead with userId, so per-target
counting and thread reads seq-scan. Postgres does NOT auto-index FK columns.

PAGINATION (scale lens VERIFIED CLEAN): feed is genuinely keyset ([createdAt desc, id desc] +
cursor); directory, notifications, comment roots, admin people all keyset with take N+1. Offset
only where documented (count-based feed sorts; Collection grid). The roadmap's keyset claim holds.

RESEND LAUNCH MATH: 100/day plan − ~20 reset reserve = ~75 verification emails/day. 400 launch-day
signups → a multi-day verification backlog (queue drains oldest-first). Members told "check your
inbox" for mail that will not arrive for up to ~5 days. Quantify in report; owner may need a paid
Resend tier or a staged-invite launch.

DATES (dates lens VERIFIED CLEAN): email-queue UTC budget window is CORRECT (matches Resend's UTC
reset, shown IST-explicitly on /admin/mail); verify-email banner is client-side hydration-guarded.
The IST bug is specifically server-rendered DISPLAY dates (B-100) + the heatmap direction (B-101).

## Live GET probes (orchestrator, 2026-08-21, authed read-only fetches, no writes)

- DIRECTORY NaN CRASH CLAIM (W1-127/179/194/234, "throws NaN → error-pages the whole /directory"):
  **REFUTED as a crash.** Live: /directory?year=abc → HTTP 200, full render (264KB, no error body);
  /directory?year=-5 and ?year=99999999999 → HTTP 200 empty view (68KB); ?year=2010.5 → 200;
  /api/users-by-batch?batches=1a,2b → 200 (empty array). Root cause of the non-crash:
  `Number("abc")=NaN`; where.ts:46 `typeof showingYear === "number"` is TRUE for NaN so
  `where.batchYear = NaN` is set, but Prisma/pg does NOT throw on a NaN int filter — it silently
  matches (year=abc returned the FULL directory; out-of-range/negative matched nobody). So the real
  bug is a SILENT MIS-FILTER + missing validation (Low/Medium correctness), NOT a page crash.
  Report reclassifies this cluster accordingly. This is exactly what live-repro is for: three
  finders confidently predicted a 500; the live status is 200.
- Controls: /feed 200, /directory 200. Baseline healthy.

## Live read-only DB proofs (orchestrator, 2026-08-21, via run-sql.mjs --inline, reads only)

- CL-2 email-case: 52 total users, **1 has a mixed-case email** → that real member cannot reset
  their password today and would false-fail a lowercased login. `dup_groups` over lower(email) = 0,
  so a `UPDATE ... SET email=lower(email)` backfill is safe (no case-variant duplicate pairs).
  This CONFIRMS CL-2 as live (not just latent) and de-risks its fix.
- Pre-launch data volumes (context for 2,000-user projections; today the DB is tiny): posts=17,
  comments=16, photos=1, groups=12, catchups=2, visits=87, searchlogs=16, notifications=227.
  Notifications already the biggest table and unbounded per-user prune KEEP=100; Visit=87 for 52
  users → ~1.7 visits/user already, unbounded. Confirms the scale-lens growth concern direction.
- CL-7 duplicate batch groups: 0 duplicate Group.name rows today → the join-batch race is LATENT
  (needs concurrent same-batch signup, i.e. launch day), not already triggered. Report as High
  because launch day is exactly the concurrency spike.

## Dedupe cluster map (orchestrator, preliminary — Critical/High/Medium pass)

Canonical clusters where multiple agents found the same root. W1 IDs from wave1-ledger.tsv.
- CL-1 Group-creator cascade data loss (CRITICAL root): W1-057, W1-058 (prompt-author variant),
  W1-134, W1-258 (+W1-200 comment-purge variant is a SEPARATE root, keep). Schema onDelete:Cascade
  on Group.creator / CatchupPrompt.author / Comment hard-delete in purge.
- CL-2 Email normalization (High): W1-034, W1-145, W1-226, W1-280. ORCHESTRATOR-VERIFIED (code).
- CL-3 IST/UTC server-rendered day (High umbrella + per-surface instances): W1-023, W1-271
  umbrella; instances W1-009, W1-047, W1-063, W1-081, W1-096, W1-097, W1-098, W1-099, W1-100,
  W1-116, W1-148/W1-190 (feed filters), W1-211. Heatmap wrong-direction conversion is separate:
  W1-002 = W1-095. Report as one umbrella finding + surface table + separate heatmap finding.
- CL-4 Avatar/upload 4.5MB body cap (High): W1-035, W1-082, W1-093, W1-247, W1-282.
- CL-5 Toggle-action P2002/P2025 races (High): W1-137, W1-149, W1-186, W1-185 (poll variant),
  W1-079 (photo love). One canonical + per-action table.
- CL-6 deletion-scheduled mail never sent (High): W1-108, W1-225. ORCHESTRATOR-VERIFIED (code).
- CL-7 joinBatchGroup duplicate batch groups (High): W1-038, W1-135, W1-153, W1-286.
- CL-8 adminMergeUsers CatchupEntry unique abort: W1-007, W1-066, W1-138.
- CL-9 R2 delete-before-row ordering inversion: W1-085, W1-150, W1-193.
- CL-10 Purge/R2 orphan classes: W1-147 (attempts-as-deletions + silent delImageByKey),
  W1-240/W1-260 (AdminMessage.imageUrl + Group.coverImage missed), W1-259 (urls-in-memory),
  W1-241/W1-264 (unbounded sweep vs 60s). Related but distinct — keep separate, one phase.
- CL-11 Fire-and-forget without after(): W1-026, W1-037, W1-114, W1-129, W1-265, W1-274.
- CL-12 Layout blocking Resend send: W1-092, W1-112, W1-151, W1-234.
- CL-13 Missing FK indexes: W1-120, W1-121, W1-123, W1-124, W1-125, W1-126, W1-127, W1-194.
  One dossier table.
- CL-14 Directory NaN params crash: W1-113, W1-155, W1-170.
- CL-15 updateUserPlaces unvalidated: W1-154, W1-173, W1-242.
- CL-16 Bounce webhook resurrects budget: W1-152, W1-227.
- CL-17 Verify-link "Already confirmed" lie: W1-136, W1-146.
- CL-18 Catchup home archive N+1: W1-064, W1-128.
- CL-19 Places search seq-scan per keystroke: W1-089, W1-172.
- CL-20 Telemetry unbounded growth: W1-010, W1-261 (+W1-262 contradictory notification policies).
- CL-21 Legacy /onboarding orphan writes: W1-039, W1-287.
- CL-22 Bell badge frozen/desync: W1-110, W1-213, W1-025.
- CL-23 Feed #fragment notification links: W1-208, W1-245.
- CL-24 Landing dynamic (theme cookie): W1-111, W1-288.
- CL-25 Test-mode money as real: W1-006, W1-300, W1-301.

## Baseline state

- verify:crawl 2026-08-21: 17 routes, all HTTP 200, zero console errors reported. Clean baseline.
  (Crawl list does not include /catchups/round/[editionId], the WIP-broken page.)
- Wave 1 workflow launched: run wf_a3eccac4-718, 16 territory agents + 10 lens agents.


- `npm run check` 2026-08-21: unit tests 26/26 ok; ONE TS error + 2 ESLint warnings, all in the
  other session's mid-edit WIP file (catchups round page). Everything else green.
- Dev server up on :3000. `/catchups/round/[editionId]` expected broken until their edit lands.
- MALFORMED-JSON READER (W1-250 etc): live check — 0 rows in User.houses/phones/links start with a non-"[" char. The JSON.parse-reader-crash class is LATENT (no bad rows exist), a defensive-hardening item, not a live crash.
- COMPLETENESS ROUND 1 (critic a1ab429106d43c36e): essentially DRY. 1 net-new Low (admin
  inbox take:60 no pagination = B-200) + 1 trivial AdminThread flag lost-update (B-201).
  Broad examined-clean: Sharp guard universal (100MP cap, only sharp() call), session
  maxAge benign (credentialVersion re-checked each request), map-cluster null/0,0/antimeridian
  handled, JSON readers guarded, catch-ups song answers round-trip, use-user-search cancels
  stale responses. Verdict: "one of the most thoroughly audited codebases." Named 3 unread
  surfaces -> ROUND 2 (agent ad459a676483323aa) reading them now.
