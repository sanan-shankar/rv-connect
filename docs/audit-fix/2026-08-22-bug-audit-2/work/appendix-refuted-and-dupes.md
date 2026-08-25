
## Duplicates (folded into canonical)
- C-109 -> C-037
- C-160 -> C-037
- C-131 -> C-050
- C-173 -> C-126
- C-171 -> C-124
- C-121 -> C-056
- C-181 -> C-128
- C-123 -> C-084
- C-152 -> C-069
- C-110 -> C-044
- C-185 -> C-108
- C-170 -> C-100
- C-039 -> C-004
- C-201 -> C-136

## Refuted (verified NOT a bug)
- **C-036** (src/app/(auth)/verify-email/page.tsx): Confirm-on-GET is a documented, deliberate design decision: verify-email/page.tsx:7-18 states the token is 'redeemed during render rather than behind a button' because 'a confirmation page with a confirm button on it asks somebody to click twice', and the prefetch case was already handled gracefully (B-021/Low-22: used->already/superseded). The finder's novel 'hostile signup with the victim's addr
- **C-038** (src/components/auth/email-actions.ts): Latent and deliberate. requestPasswordReset returning the same {ok:true} for a password-null row (email-actions.ts:263-265) is the intended membership-oracle protection (same answer whether or not an account exists). No production path mints password-null rows today: the only creator is the demo seed (demo-seed/seed.ts:143), which lives in the separate demo DB where auth() is demoSession (no real 
- **C-082** (src/app/(main)/admin/people/actions.ts): The finding's 'expected' overstates the log's scope. The AuditLog schema comment (schema.prisma) only describes columns and gives example verbs; it does NOT say 'every admin action'. The declared scope is stated in audit/page.tsx:14-16: 'WHO did the things that change standing or destroy data -- an admin blocking, deleting, verifying or changing a role, a member deleting their own account, a repor
- **C-022** (src/app/(main)/catchups/actions.ts): The mechanism (addCatchupMembers:1660-1667 caps only the per-call userIds array; no cumulative groupMember.count; joinCatchupByToken uncapped) is real, but it is not a bug. The invite link is a deliberately uncapped bearer token (catchups.ts:118-125 and joinCatchupByToken docblock: 'Whoever holds the link can join, which is the point of a share link'), so unbounded roster growth is an accepted des
- **C-137** (src/app/(main)/catchups/[catchupId]/page.tsx): The claimed incremental leak is 'the custom title alone' (the finding itself concedes the group name is already shown). But no production code path writes Catchup.title: createCatchup (actions.ts:372) and createCatchupWithPeople (actions.ts:517) both omit it, and a repo-wide search finds Catchup.title assigned only in the demo seed (seed.ts:370, title: CATCHUP_META.title), which runs on the demo d
- **C-114** (src/lib/demo.ts): Mechanically the claim is accurate: for a model in ALLOWED_WRITE_MODELS, demoWriteAllowed returns true at demo.ts:206 without inspecting args, so demoWriteAllowed('Post','update',{data:{author:{update:{role:'admin'}}}}) === true and the PhotoLove nested-Photo-create === true. But the finder itself states this is NOT exploitable: no reachable server action passes visitor-controlled data into a nest
- **C-150** (src/lib/email.ts): The central premise is factually wrong about JS/V8 semantics. Promise.race registers a reaction (via PerformPromiseThen) on EVERY input promise, so a rejection handler IS attached to `send` at email.ts:215 even after the timer wins the race — a later rejection of `send` runs race's internal reject reaction (a no-op because the result already settled) and is therefore 'handled', never surfacing to 
- **C-148** (src/lib/audit.ts): The mechanism (writeAudit is silent in production on a failed insert — audit.ts:74-77 logs only when NODE_ENV !== 'production', no Sentry) is TRUE, but this is a deliberate, documented best-effort-telemetry contract, not a defect. The function's doc (audit.ts:45-52) explicitly states it 'NEVER throws and never blocks the caller's real work... the same contract touchLastSeen keeps' and 'Development
- **C-094** (src/app/(main)/directory/actions.ts): The mechanism is factually true — loadDirectoryPage (actions.ts) imports no rate-limit module and buildDirectoryWhere applies escapeLike but no length truncation — but the claimed stability/DoS consequence does not hold, so this is 'right about the mechanism, wrong about the consequence' (TRAPS). (1) The queries run over the ~2,000-row User table (audit's own '2k headroom'), not a large table; a 1
- **C-100** (src/app/api/places/search/route.ts): Mechanism true (places/search route.ts:89 trims but does not length-cap q before building prefix/contains patterns), but the DoS consequence does not hold. (1) The rate limit IS present: rateLimit('search', ...) at route.ts:84, 120/min per verified account. (2) A long LIKE pattern is CHEAP, not expensive: the prefix arms use the btree lower() indexes and an 8-16KB prefix matches essentially nothin
- **C-132** (next.config.ts): The imagined mechanism (route resolution 404s on a trailing slash) is contradicted by the installed Next source. skipTrailingSlashRedirect:true (next.config.ts:199) only suppresses the client-facing 308 redirect; it does NOT disable internal trailing-slash normalization for route MATCHING (that is the separate skipProxyUrlNormalize flag, which this project does not set). In node_modules/next/dist/
- **C-140** (src/app/(main)/profile/[id]/page.tsx): The observation is factually accurate -- profile/[id]/page.tsx awaits getViewerCities (143), then the counts Promise.all (158), then photoPosts (165), then viewerMaySeeContacts (220) sequentially, and the last three depend only on visiblePostsWhere/nothing, so they could join one Promise.all. But this is a pure micro-optimization with no correctness, member-visible, or stability consequence that c
- **C-184** (next.config.ts): The premise -- that skipTrailingSlashRedirect makes every trailing-slash URL 404 -- is wrong about the mechanism. Next's router strips the trailing slash UNCONDITIONALLY before matching: next-server.js:278-283 does pathname = removeTrailingSlash(pathname) with the comment 'next.js core assumes page path without trailing slash' and THEN calls this.matchers.match(pathname); base-server.js:1410-1411 
