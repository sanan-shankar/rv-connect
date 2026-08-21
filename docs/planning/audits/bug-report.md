# Pre-Release Bug & Stability Audit — Rishi Valley

**Date**: 2026-08-21 · **Scope**: whole application, audit-only (no code changed) · **Method**:
26 read-only investigator agents (16 feature territories + 10 cross-cutting lenses) → orchestrator
compilation and dedup → 44 independent adversarial validators (one per canonical Critical/High
finding, each told to *refute* it) → live read-only reproduction on the shared database → two
completeness rounds (the second fully dry). 355 raw candidate findings were compiled into **45
canonical findings** (2 Critical, 22 High, 17 Medium, 4 Low — every Critical/High independently
validated, one candidate refuted to the dossier) plus 68 clustered Medium roots and a 117-item Low
appendix.

This report is written so a later session (or several) can fix everything without re-deriving
anything. Nothing here is fixed yet — that was deliberate; this session only finds and documents.

---

## 0. What needs YOU vs what a fix session can do alone

*Updated 2026-08-21 with the owner's decisions after the first read-through. The owner's answers are
folded in; a fix session can now proceed with almost no further input.*

**Still needs YOU (short list, mostly quick):**

1. **Supabase plan — no action needed; Free is fine.** *Correction to the first draft: I overstated
   this, twice.* Your prior agents, looking at the real usage dashboard, were right and I defer to
   that data. Photos live on Cloudflare R2, **not** Supabase, so Supabase only ships query results,
   not images; the live database is **76MB today, 61MB of which is the static Place gazetteer** (a
   reference table, barely read), and the actual member data is tiny. At 2,000 members the egress is
   very unlikely to approach the Free 5GB/month cap — *especially* once B-092 (the directory shipping
   every member to the browser) is fixed. And backups are **already handled** by your own nightly
   job (OPERATIONS.md), deliberately outside Supabase to avoid the paid tier — so that isn't a gap
   either. **Net: leave Supabase on Free, do nothing.** The fix that actually prevents the under-load
   failure is the connection-pool *code* config, which a fix session does regardless of plan.
2. **R2 image domain / CORS — two different things you're conflating (this explains the confusion).**
   I checked the live image URLs: your images are served from
   `pub-a656209a5438484f9694738260255a5e.r2.dev` right now.
   - **(a) Bucket CORS** (lets a browser upload straight to R2, past the 4.5MB limit): the code
     presigns uploads optimistically, so this works *only if* the bucket's CORS policy allows `PUT`
     from your site. I **cannot verify this from here** — it's Cloudflare-dashboard config, and a
     server-side test can't exercise browser CORS. **You very likely did this one.** To confirm:
     open the live site and upload a photo bigger than ~5MB from your phone — if it succeeds, CORS
     is set; if it errors, it isn't. Or: Cloudflare → your R2 bucket → Settings → CORS Policy should
     list your production origin with `PUT` allowed.
   - **(b) Custom serving domain** (serving images from your own domain instead of the throttled
     `pub-*.r2.dev`): this is **not done** — the live URLs prove it. This is what "production image
     domain" meant. It needs a custom domain on the R2 bucket (Cloudflare), `R2_PUBLIC_BASE_URL`
     updated in Vercel to point at it, and that domain added to `next.config.ts` remotePatterns (the
     code part is a fix session's job). So both past logs can be right: you did CORS (uploads), not
     the serving domain. This one is a small, non-urgent launch-polish item.
3. **Vercel env cleanup + `NEXTAUTH_URL` check** — already on your list (`bugs.md` 14-15), unchanged.

**DECIDED by the owner (folded into the findings/fix plan; no more input needed):**
- **Email:** you'll stagger the release — good, that removes the launch-day mail crunch. (Critical
  B-002, the bug where a transient failure *permanently* kills queued mail, still gets fixed
  regardless.)
- **Profile email (B-050 → now a real fix, not a Low):** members get a proper display-email control
  — they can **set a custom display email** (different from their sign-in address) **or clear it to
  show no email at all**. Clearing it must show *nothing*, not silently fall back to the sign-in
  address (which is the current bug). Default stays "show" as today.
- **Catch-ups leave / archive / delete (resolves B-063; new feature work):** members can **leave** a
  Catch-up; and can **archive** or **delete** one, where **delete** goes to a **"Recently deleted"
  area that holds it for 30 days** (soft delete, restorable, then purged). UI: keep the
  archive/delete affordances **compact under `/catchups`, and hidden entirely when the member has
  none** (no dead buttons); the delete flow gets a proper "are you sure" confirmation, done cleanly.
  **This must be built on top of the B-001 fix** — the ownership cascade has to be corrected first,
  or deleting/archiving would still risk wiping other members' answers.
- **Load test / throwaway database:** skipped, per the owner. (The k6 plan stays in §4.6 as
  optional reference.)

**What a fix session does entirely on its own (no input from you needed):** every code and database
fix in this report — the two Criticals, the email-normalization fix plus the safe one-line database
backfill, the missing-index and search-index migrations, the connection-pool configuration (one
line, prevents the under-load blank-page failure), the upload downscaling, the race-condition
handling, the date/timezone helper and all its surfaces, the app-wide error-handling pass, the input
caps, the telemetry-retention rules, the notification-link corrections, the profile-email control,
the Catch-up leave/archive/delete feature, and the entire Medium and Low lists — plus writing the
tests that pin each fix. Schema changes follow this repo's established hand-written-migration process
(never `db push`). In short: **check the two R2 things above, optionally decide Supabase-for-backups,
and a fix session handles everything else.**

---

## 1. Executive summary (plain language)

**Is the app ready for the public?** Almost, but not yet — and the gap is small and fixable. The
app is broadly functional and the recent security work holds up well. What this audit found is a
short list of genuinely serious bugs (two that can destroy real data, several that will visibly
break for ordinary members) sitting alongside a long tail of smaller edge cases. None of the
serious ones are hard to fix; they are the kind of thing you only find by looking this hard. I would
fix the two Critical and the top handful of High findings before opening the doors, and can launch
with the rest scheduled.

**The five scariest things found:**

1. **Deleting an account can wipe out a whole batch group or an entire Catch-up — including
   everyone else's writing.** (B-001, Critical, confirmed and reproduced in the schema.) The first
   person from a batch to sign up silently "owns" the *Batch of YYYY* group; whoever starts a
   Catch-up "owns" its hidden group. Because of how the database is wired, when that one person
   later deletes their account (or is deleted/merged by an admin, or is purged by the automatic
   60-day cleanup), the whole group and the whole Catch-up cascade away with it — every Round,
   every prompt, and **every other member's published answers**. The code even has a comment
   promising a Catch-up "survives if they leave"; it does not. This is silent, permanent,
   cross-member data loss of the flagship feature.

2. **A brief email hiccup permanently kills verification and password-reset emails.** (B-002,
   Critical.) If the email provider is slow or rate-limited for even half a minute — most likely
   exactly at launch, when hundreds of confirmations go out at once — the queue burns through all
   its retries back-to-back with no wait and marks those messages permanently failed. The only way
   to un-stick them is an admin clicking each one by hand. Members are told "check your inbox" for
   mail that will never arrive.

3. **The email that warns someone their account is being deleted can never be sent.** (B-070,
   High.) The deletion-confirmation / account-takeover-alarm email has a template, a priority, and
   a rate limit — but the one list that decides what the sender is allowed to pick up leaves it
   out, so it sits in the queue forever. If an attacker with a stolen session requests deletion,
   the victim's warning never arrives.

4. **Email capitalisation is handled inconsistently, and one real member is already affected.** A
   read-only check of the live database found 1 of your 52 current members has a capital letter in
   their stored email — which means today they can never receive a password reset, and a login with
   different capitalisation would be wrongly rejected. The same gap lets one mailbox register twice.
   (B-020, High. The fix is safe: no duplicate accounts block it.)

5. **The very first thing a new member does — set a profile photo — fails for normal phone photos**
   (B-030, High): a typical 5–12MB photo is silently rejected by the platform before the code runs,
   with a stuck spinner and no message. And **an admin you just demoted keeps their admin access
   for the rest of their browsing session** because the permission check doesn't re-run on
   in-app navigation (B-024, High).

**What does "2,000-user headroom" actually look like?** The honest answer: **the current
infrastructure will not comfortably carry 2,000 members, but the fixes are known and mostly
configuration, not rewrites.** The good news first — the hardest class of scaling bug is *absent*:
the database connection handling through the pooler is compatible, no long operation holds a
database connection while waiting on the network, and the main lists (feed, directory,
notifications) already use the efficient "keyset" pagination the roadmap promised. The real
ceiling is two code things: (a) the app never sets a database connection limit or timeout, so under a
traffic spike connections pile up and members get blank pages instead of an error — a one-line
configuration fix; (b) a set of **missing database indexes** means common actions (counting likes,
opening a comment thread, the city search box) scan whole tables — invisible today with 17 posts,
slow and expensive at scale. Add those indexes and set the connection limits, and 2,000 is realistic
on your current hosting. *(An earlier draft claimed the Supabase Free plan couldn't carry 2,000 users
on data transfer; that was an over-estimate — your prior agents, reading the real usage dashboard,
were right and I defer to them. Photos are on Cloudflare R2, not Supabase, and the live database is
only 76MB. Backups are already handled by your own nightly job, so Free is genuinely fine — no
upgrade needed.)* Full numbers in section 4.

**One more launch-day reality (already handled):** the email plan sends ~100 messages/day, of which
~75 are available for sign-up confirmations, so a big-bang launch would back the queue up for days.
The owner is **staggering the release**, which keeps this clear. (The B-002 mail bug is still fixed
in code regardless.)

---

## 2. Phased fix plan

Findings are grouped so a fix session can take them top to bottom. Phases 1–2 are the launch
blockers. Phases are mostly independent except where noted.

**Phase 0 — one-line safety nets first (do before anything else, tiny, high-leverage):**
- Set the database pool limits/timeouts (§4.1): `max`, `connectionTimeoutMillis`,
  `statement_timeout`, `query_timeout` on the single `PrismaPg` construction. Prevents the
  blank-page-under-load failure and bounds every other slow-query incident. *(This, not a Supabase
  upgrade, is the real fix for the under-load ceiling.)*
- *(Optional, owner call — Supabase Pro for automated backups only; NOT needed for capacity. See §0
  and §4.1.)*

**Phase 1 — Critical data-loss & mail (launch blockers):**
- B-001 (Group-creator cascade), B-010 (prompt-author cascade), B-002 (mail permanent-fail),
  B-070 (deletion-scheduled never sent). B-001 and B-010 are the same schema area — fix together
  (reassign ownership on delete/merge/purge, or change the FK actions, plus a purge guard).

**Phase 2 — High, member-facing correctness (fix before or immediately after launch):**
- Auth/account: B-020 (email normalization + backfill), B-021 (verify-link "already confirmed"
  lie), B-024 (admin RSC gate), B-023 (last-admin / self block-delete guard), B-022 (deep-link
  login redirect param mismatch).
- Uploads: B-030 (avatar/answer photo 4.5MB path — client downscale/crop before send).
- Feed/letters: B-041 (post list not updating after delete/edit), B-043 (letter autosave silent
  fail + no draft persistence), B-044 (composer publishes without in-flight photos), B-045
  (city-scoped letters leak in rail), B-048 (letter draft cityScope dropped).
- Money: B-080 (payment callback no error handling), B-081 (webhook-only payment gives supporter
  nothing).
- Data hygiene: B-012/B-013 (R2 orphans + swallowed delete failures + miscounted purge),
  B-093 (Visit/SearchLog unbounded growth — add retention).

**Phase 3 — High, scale & perf (before real traffic):**
- B-090 (missing indexes — one migration), B-091 (gazetteer seq-scan — add trigram index),
  B-092 (directory ships all members to browser), B-072 (unbounded mail-drain concurrency),
  B-071 (bounce webhook resurrects mail budget).

**Phase 4 — Medium correctness & robustness (batchable, independent):**
- The ~65 clustered Medium roots (section 3.M): IST date rendering (B-100/B-101 umbrella),
  toggle-action race handling (B-040), systemic client-side error handling (B-042), the Catch-up
  lifecycle gaps (B-060/B-061/B-062/B-063), validation caps (B-110/B-111), the Medium list.

**Phase 5 — Low & polish:** B-050, B-122, and the Low appendix.

---

## 3. Findings

Severity after independent validation and a two-round completeness pass: **2 Critical,
22 High, 17 Medium, 4 Low** canonical findings (45 total; each Critical/High refute-tested by
a separate agent), plus 68 clustered Medium roots (§3.M) and a 117-item Low appendix (§3.L).
One canonical candidate (B-094, Supabase Free plan) was **refuted as a finding** — it is an
infrastructure-capacity note, not a code bug, and lives in the 2,000-user dossier (§4.1).
Status "Confirmed" = provable by code/live evidence; "Suspected" = needs a live run to settle.

### 3.C/H — Critical & High (canonical, validated)

### B-001 — [Critical] Deleting/purging a Group creator cascade-destroys the whole group, its posts, and any Catch-up with every member's answers
**Status: Confirmed** (high confidence). Raw finders: W1-057, W1-148, W1-309, W1-058.

- **Files**: prisma/schema.prisma:201, prisma/schema.prisma:717, src/lib/account-purge.ts:101, src/app/(main)/catchups/actions.ts:442, src/app/(main)/admin/people/actions.ts:315
- **Expected**: A Catch-up survives its creator leaving. The schema comment says Catchup.createdById is 'nullable so the Catch-up survives if they leave' (SetNull); removal copy promises 'their words stay where they are'; spec 2.2 says published Rounds are 'readable forever'.
- **Actual**: The hidden Group under every Catch-up is created with creatorId = the Catch-up creator, and Group.creatorId is onDelete: Cascade. prisma.user.delete (the 60-day retention purge, adminDeleteUser, and adminMergeUsers all end in it) deletes the Group, cascading Catchup (groupId Cascade) -> CatchupEdition -> CatchupPrompt -> CatchupEntry -> loves/prefs. Everyone else's published answers and the whole archive vanish. createdById SetNull is unreachable in practice because the Group dies first. Bonus damage: collectImageUrls() in account-purge.ts only collects the purged member's OWN entry images (catchupEntry.findMany where authorId=userId), so eve
- **Fix direction**: Change Group.creatorId to a nullable FK with onDelete: SetNull (mirroring Catchup.createdById), via a dated idempotent file in prisma/migrations-manual/ (ALTER COLUMN DROP NOT NULL + drop/re-add FK), and make purge/merge reassign or null creatorId first. Then implement the spec's 'any remaining member may re-adopt' rule or at least keep the group alive. Also make collectImageUrls collect images for ALL entries that will cascade (entries under editions of catchups on groups the user created), or stop the cascade so the question does not arise.
- **Pin it fixed**: New unit/integration test: create user A, catchup via createCatchupWithPeople with member B, B submits an entry, purgeUserAccount(A), assert B's CatchupEntry and the CatchupEdition still exist. Pin the schema with a security-regressions-style test asserting Group.creatorId is not Cascade.
- **Validation**: Cascade chain is real and reachable. Group.creator onDelete: Cascade (schema.prisma:201); datasource sets no relationMode (schema.prisma:6-8) so default foreignKeys mode applies and Prisma emitted a real DB-level cascading FK; the Group table predates the manual-migration era and nothing overrides its creatorId FK. Downstream CatchupSeries.groupId is physically ON DELETE CASCADE, confirmed in actual migration SQL (2026-07-05-secondary-city.sql:121), as are Edition->Series (131), Prompt/Entry->Ed
- **Orchestrator note**: Group.creator onDelete:Cascade + Catchup/Post/GroupMember cascades. First batch member and Catch-up initiator become creatorId. Self-delete->retention purge fires prisma.user.delete -> full cascade. Contradicts Catchup.createdById SetNull comment 'nullable so the Catch-up survives if they leave'. ORCHESTRATOR-VERIFIED in code (joinBatchGroup creatorId=first member; createCatchupWithPeople creatorI

### B-002 — [Critical] A transient Resend failure permanently fails a queued email: all attempts burn in one drain pass, no backoff, no transient/permanent split
**Status: Confirmed** (high confidence). Raw finders: W1-262, W1-089.

- **Files**: src/lib/email-queue.ts:461-483, src/lib/email-queue.ts:159-238, src/lib/email-queue.ts:105, src/lib/email.ts:180-200
- **Expected**: MAX_ATTEMPTS exists so 'a permanently bad address (someone typed gmial) must not be retried forever' (comment at email-queue.ts:103-105). A transient provider error (Resend 429 rate limit, 5xx, network blip) should be retried later, spread over time, and must never terminally fail a queued password reset.
- **Actual**: A row whose send fails transiently is requeued with status 'queued' and its original createdAt, so the very next iteration of the SAME drain pass re-selects it (it is still the oldest eligible row under orderBy [priority asc, createdAt asc]). Four failures in four consecutive iterations, seconds apart, hit MAX_ATTEMPTS and the row is terminally 'failed'. One BATCH=8 pass during an outage terminally kills 2 rows; every authenticated page view spawns another pass (layout after()), so a ~5-minute Resend outage or 429 storm at launch traffic converts the entire backlog, resets included, to permanent 'failed'. Nothing retries after the outage ends
- **Fix direction**: Two changes. (1) Add a nextAttemptAt (or reuse claimedAt semantics) set with exponential backoff on failure, and add `nextAttemptAt: { lte: now }` to the drain's findFirst, so retries spread across passes instead of burning in one. (2) Classify errors in sendMail (Resend returns error names/status: rate_limit_exceeded, daily_quota_exceeded, validation errors): provider-level/transient errors must not increment toward terminal failure (or must use a much higher ceiling), while validation/'invalid to address' errors may fail fast. At minimum, a failure whose error indicates rate/quota should lea
- **Pin it fixed**: New unit test beside the 14 in npm run check: stub sendMail to fail twice then succeed, run drainMailQueue once, assert the row ends 'sent' (or at least not 'failed') and that attempts were not all consumed within a single pass.
- **Validation**: Every load-bearing claim is present in the real code and I could not refute it.

1. Same-pass re-selection: drainMailQueue's loop (email-queue.ts:471-475) does `findFirst({ where: { status: "queued", attempts: { lt: MAX_ATTEMPTS } }, orderBy: [{priority:"asc"},{createdAt:"asc"}] })`. claimAndSend on a transient failure writes `status: afterFailure` where `afterFailure = spent >= MAX_ATTEMPTS ? "failed" : "queued"` (174, 224/231). A requeued row keeps its createdAt and has attempts still < 4, so
- **Orchestrator note**: drainMailQueue loop re-picks the same requeued row immediately, burning MAX_ATTEMPTS back-to-back; claimAndSend has no transient vs permanent distinction. A 30s Resend brownout permanently fails every in-flight verify/reset.

### B-010 — [High] Deleting a member cascades away every Catch-up question they asked, removing every OTHER member's answers to it from published Rounds
**Status: Confirmed** (high confidence). Raw finders: W1-058.

- **Files**: prisma/schema.prisma:765, prisma/schema.prisma:785, src/lib/account-purge.ts:101
- **Expected**: Account deletion removes the member's own content. Other members' answers in a published Round (a keepsake, 'readable forever') survive; a question with a gone asker can render as 'asked by someone who left'.
- **Actual**: CatchupPrompt.authorId is onDelete: Cascade, and CatchupEntry.promptId is onDelete: Cascade. Purging member A deletes every prompt A authored in ANY catch-up (not just ones A created), which cascades every entry anyone wrote answering those prompts. In a 30-person Round where A asked one of the questions, 30 people's answers (text, photos, hearts) silently disappear from the published Round. The cascaded entries' images are also not collected by collectImageUrls (it only reads entries where authorId = the purged user), so those photos are stranded in R2.
- **Fix direction**: Make CatchupPrompt.authorId nullable with onDelete: SetNull (migration in prisma/migrations-manual/), and teach the three asker-render sites (round page, loadPublishedIssue, home consoles) to render a null author as anonymous/'a member who left' (they already have a null-author branch for anonymity, so the render path exists). Alternatively reassign prompts to a tombstone user during purge.
- **Pin it fixed**: Integration test: A asks a prompt, B answers it, purge A, assert B's entry still exists and the round renders the prompt with a null asker.
- **Validation**: Every link confirmed by reading full functions. schema.prisma:765 sets CatchupPrompt.author onDelete Cascade and schema.prisma:785 sets CatchupEntry.prompt onDelete Cascade, exactly as cited. The datasource declares provider postgresql with no relationMode override, so default foreignKeys mode makes Postgres cascade recursively: deleting a User deletes every CatchupPrompt where authorId matches, and each deleted prompt cascades every CatchupEntry under it via promptId, regardless of that entry's
- **Orchestrator note**: CatchupPrompt.author onDelete:Cascade and CatchupEntry.prompt Cascade: purging a question's author deletes the prompt and all entries under it.

### B-012 — [High] Account purge and the 2-year sweep never delete AdminMessage.imageUrl screenshots or Group.coverImage from R2 — permanent orphans / GDPR gap
**Status: Confirmed** (high confidence). Raw finders: W1-278, W1-311.

- **Files**: src/lib/account-purge.ts:37, prisma/schema.prisma:568, prisma/schema.prisma:587, prisma/schema.prisma:590, prisma/schema.prisma:195
- **Expected**: purgeUserAccount's own contract (header comment: 'The one place that knows how to erase a member COMPLETELY... bytes in R2 that no cascade can reach... That is what made GDPR Art. 17 unachievable for images') collects EVERY stored-image URL the member's rows point at before the cascade destroys them.
- **Actual**: collectImageUrls (account-purge.ts:37-68) reads only User.photoUrl, Post.images, Photo.{thumbUrl,url,originalUrl}, and CatchupEntry.images. It never reads AdminMessage.imageUrl ('one optional screenshot (WebP via /api/upload)', schema.prisma:587). AdminThread.member is `onDelete: Cascade` (schema.prisma:568) and AdminMessage.thread is `onDelete: Cascade` (line 590), so a deleted member's admin-thread messages — and with them the only rows pointing at their uploaded screenshots — are destroyed in the same transaction, leaving the WebP bytes publicly fetchable at their pub-*.r2.dev URLs forever with nothing able to enumerate them. (The `authorI
- **Fix direction**: In collectImageUrls, add `prisma.adminMessage.findMany({ where: { thread: { memberId: userId } }, select: { imageUrl: true } })` (all messages in the member's threads, since the whole thread cascades) and, if legacy Group rows can exist, `prisma.group.findMany({ where: { creatorId: userId }, select: { coverImage: true } })`; push non-null URLs into the list. delImage already ignores URLs that are not ours, so collecting generously stays safe.
- **Pin it fixed**: Extend the purge unit test (or add one): seed a user with an admin-thread message carrying imageUrl, run purgeUserAccount, assert delImage was called with that URL. A schema-audit check could also assert every String column whose comment mentions an upload URL appears in collectImageUrls.
- **Validation**: The finding is real and correctly described. collectImageUrls (src/lib/account-purge.ts:37-68) collects R2 URLs from exactly four sources — user.photoUrl (line 39), post.images (40), photo.{thumbUrl,url,originalUrl} (41-44), catchupEntry.images (45) — and never queries AdminMessage or Group. purgeUserAccount then does prisma.user.delete (account-purge.ts:101). The schema confirms the destructive cascade: `member User @relation("AdminThreadMember", ... onDelete: Cascade)` (schema.prisma:568) and
- **Orchestrator note**: collectImageUrls omits AdminMessage.imageUrl and Group.coverImage; no path ever deletes them.

### B-013 — [High] R2 delete failures are swallowed with no log (delImageByKey empty catch) and purge counts delete ATTEMPTS as deletions — the audit line lies
**Status: Confirmed** (high confidence). Raw finders: W1-171, W1-147.

- **Files**: src/lib/storage.ts:218, src/lib/account-purge.ts:108, src/lib/retention.ts:127, src/components/profile/admin-actions.ts:64
- **Expected**: Deleting a member's stored images either succeeds, or the failure is at least logged with the failed keys and reflected in the audit entry so it can be retried — especially in the purge path, where the code itself documents that after the row cascade 'nothing can enumerate the objects' ever again.
- **Actual**: delImageByKey's catch block is completely empty — not even the repo's own 'loud in dev' rule is honoured, making it the one catch site in the codebase that violates the stated contract. purgeUserAccount then counts `deleted += 1` for every URL regardless of outcome, and both the retention sweep and adminDeleteUser write that count into the audit log as fact. If R2 has a bad minute (or credentials rotate, or the bucket name env var drifts) during a purge, zero objects are deleted, the rows that pointed at them are already gone, the images stay live at their public pub-*.r2.dev URLs forever, and every record says the purge removed them.
- **Fix direction**: Make delImageByKey return a boolean (or throw-and-let-callers-decide) and log the key on failure in ALL environments (this is a moderation/GDPR path, not per-page telemetry). In purgeUserAccount, count real successes, include failures (count + keys) in PurgeResult, and have the retention sweep/adminDeleteUser record failures in the audit detail and errors[]. For durability, consider writing failed keys to a small table the next sweep retries — the row cascade means these keys exist nowhere else.
- **Pin it fixed**: Unit test with a stubbed R2 client that rejects DeleteObjectCommand: purgeUserAccount must return imagesDeleted: 0 and surface the failed keys; the retention sweep result must carry the failure.
- **Validation**: All cited lines read in full and confirmed. storage.ts:218-228 `delImageByKey` has a truly empty catch (`} catch { // best-effort cleanup }`) with no console.error even in dev. storage.ts:267-271 `delImage` calls it via `keyForUrl` (pure string ops, cannot throw) so `delImage` never rejects. account-purge.ts:108-112 `for (const url of urls) { await delImage(url); deleted += 1; }` therefore increments unconditionally — it counts attempts, and even counts external/legacy URLs that keyForUrl return
- **Orchestrator note**: storage.ts delImageByKey catch{} empty; purgeUserAccount increments deleted per attempt regardless of success.

### B-020 — [High] Email case/whitespace normalized inconsistently: mixed-case accounts can never reset password, false login failures, one mailbox registers twice
**Status: Confirmed** (high confidence). Raw finders: W1-034, W1-091, W1-169, W1-231, W1-264, W1-331.

- **Files**: src/lib/auth.ts:102, src/components/auth/actions.ts:103, src/components/auth/actions.ts:149, src/components/auth/email-actions.ts:160, src/lib/validators.ts:18, prisma/schema.prisma:13
- **Expected**: One canonical form of an email address across signup, login, reset and duplicate-detection, so foo@x.com, Foo@x.com and 'Foo@x.com ' are the same account everywhere (orchestrator seed S-A1).
- **Actual**: Signup stores the address exactly as typed (signupSchema: `email: z.email("Please enter a valid email")` — zod v4 z.email() validates format only, no trim/lowercase; the create writes `email: parsed.data.email` verbatim; User.email is a plain case-sensitive `String @unique`). Login looks up the RAW submitted string: authorize() does `const user = await prisma.user.findUnique({ where: { email } })` while only the rate-limit key is normalized (`const acctKey = email.trim().toLowerCase()`). The reset flow normalizes the OTHER way: requestPasswordReset does `const raw = ((formData.get("email") as string) ?? "").trim().toLowerCase()` then `prisma.
- **Fix direction**: Pick trim().toLowerCase() as the canonical form (the codebase already uses it in four places). Apply it (a) in signupSchema via z.email().trim().toLowerCase() or in registerUser before the existing-check and create; (b) in authorize() — look up by acctKey, which already exists; (c) leave requestPasswordReset as is; (d) add a max length (e.g. .max(200)) to the signup email to match displayEmail's cap. Then backfill: UPDATE "User" SET email = lower(email) WHERE email <> lower(email) — but FIRST check for case-variant duplicate pairs (SELECT lower(email) FROM "User" GROUP BY 1 HAVING count(*) > 1
- **Pin it fixed**: Unit test in the -rule style: a signup/login/reset round-trip helper asserting all three paths resolve 'FoO@x.com ' to the same row; plus a security-regressions-style static check that no prisma.user lookup uses an unnormalized email. A Playwright spec pinning signup-then-relogin with changed case.
- **Validation**: All three cited mechanisms are real; I read each function in full and found no normalization layer, guard, or collation that refutes them.

(A) Signup stores raw. validators.ts:18 uses z.email() which validates format only (no trim/lowercase transform). actions.ts:149 writes email: parsed.data.email verbatim; the dedupe at :103-105 findUnique({ where: { email: parsed.data.email } }) also uses the raw string.

(B) Login looks up raw, case-sensitively. auth.ts:62 acctKey = email.trim().toLowerCase
- **Orchestrator note**: LIVE-CONFIRMED: 1 of 52 members has mixed-case email today (cannot reset). authorize() looks up raw email; reset lowercases; signup stores/dedupes raw. Backfill safe (0 dup-lower pairs).

### B-021 — [High] Verification link superseded by any resend shows 'Already confirmed - nothing left to do' (happy bird, no resend button) to a still-unverified member
**Status: Confirmed** (high confidence). Raw finders: W1-150, W1-170.

- **Files**: src/components/auth/email-actions.ts:107, src/lib/auth-tokens.ts:91, src/lib/email-queue.ts:403, src/app/(auth)/verify-email/verify-client.tsx:31, src/app/(auth)/verify-email/verify-client.tsx:55
- **Expected**: Clicking a verification link that has been superseded by a newer one tells the member the link is out of date and points them at the newer mail (or a resend). "Already confirmed" is shown only when the address is actually confirmed — the code's own comment says: "Used token: if the address really is confirmed, say so plainly."
- **Actual**: The claim is never checked. mintToken burns ALL outstanding tokens of the kind on every mint (auth-tokens.ts:91-99: `updateMany({ where: { userId, kind, usedAt: null }, data: { usedAt: new Date() } })`), and because the queue mints the token at SEND time (email-queue.ts:402-403 `const minted = await mintToken(row.userId, kind, row.to)`), every resend — the button, or a second queue row from the enqueue-fold race (email-queue.ts:308-317 findFirst→create is itself TOCTOU) — marks the earlier mail's token usedAt. The member now has two mails in their inbox; opening the older one hits readToken → `if (row.usedAt) return { ok: false, reason: "used
- **Fix direction**: On reason "used", look up the token row by hash again (or extend readToken's failure results to carry userId) and read User.emailVerified: return "already" only when actually verified; otherwise return a new outcome ("superseded") whose copy says a newer link replaced this one, with the resend button enabled. Optionally stop burning verify tokens on remint (burn is a security necessity for reset, but multiple live verify links to the same inbox are harmless) — that removes the trap at the source.
- **Pin it fixed**: Unit test on confirmEmailToken: mint token A, mint token B (burning A), redeem A, assert outcome is not "already" while user.emailVerified is null; redeem B → "confirmed"; redeem B again → "already".
- **Validation**: Every cited line checks out and I could not find a guard that refutes it. Flow: mintToken (auth-tokens.ts:91-99) burns all usedAt:null tokens of the kind then creates a new one inside a $transaction; the token is minted at SEND time in render() (email-queue.ts:402-403 `const minted = await mintToken(row.userId, kind, row.to)`). A resend after the first mail is already `sent` does NOT fold (enqueueMail fold only matches status in [queued,sending], email-queue.ts:309-317), so a new row is created
- **Orchestrator note**: confirmEmailToken treats a used/expired-superseded token as already-confirmed; member is NOT verified, sees a dead-end success screen.

### B-023 — [High] An admin can block or delete their own or the last admin's account with no guard — permanent lockout of the whole admin surface
**Status: Confirmed** (high confidence). Raw finders: W1-001.

- **Files**: src/components/profile/admin-actions.ts:15, src/components/profile/admin-actions.ts:45, src/components/admin/people/person-detail.tsx:268, src/components/admin/people/person-detail.tsx:369, src/app/(main)/admin/people/actions.ts:216
- **Expected**: The panel refuses (or at least loudly warns about) blocking/deleting yourself, and refuses blocking/deleting the last remaining admin, exactly as adminSetRole already refuses demoting the last admin ("This is the only admin. Make somebody else one first.").
- **Actual**: adminBlockUser and adminDeleteUser have no self-check and no last-admin check. The owner's own row is reachable at /admin/people/<own-id> and PersonDetail renders Block, Delete and Merge for it unconditionally (no current-admin id is even passed to the component). Blocking yourself takes effect on the very next request: the session callback in src/lib/auth.ts:277 invalidates any session whose row reads isBlocked, and authorize() (auth.ts:155) refuses a blocked account at login, so the sole admin can never unblock himself. The block dialog's copy makes it worse: "You can undo this from the same button" (person-detail.tsx:373) is false for self
- **Fix direction**: In adminBlockUser and adminDeleteUser, after requireAdminActor: (1) if userId === actor.actorId, refuse with copy like "You cannot block your own account from here."; (2) for block=true and for delete, if the target row has role admin and prisma.user.count({where:{role:"admin", isBlocked:false}}) <= 1, refuse like adminSetRole does. Also hide/disable Block, Delete and Merge on your own detail page (pass the acting admin's id into PersonDetail) and fix the block dialog copy for the other-admin case.
- **Pin it fixed**: Extend src/lib/security-regressions.test.mjs (or a new unit test) asserting adminBlockUser/adminDeleteUser return an error for self-target and for the last unblocked admin; write-path-reviewer on admin-actions.ts.
- **Validation**: Every load-bearing claim checks out against the code. adminBlockUser (src/components/profile/admin-actions.ts:15-43) and adminDeleteUser (:45-78) both obtain the actor via requireAdminActor() (which does return actor.actorId, used only for the audit write) yet never compare userId to actorId and never count remaining admins; block does `prisma.user.update({ where:{id:userId}, data:{ isBlocked:block, credentialVersion:{increment:1} } })` and delete calls `purgeUserAccount(userId)` directly. The o
- **Orchestrator note**: admin-actions block/delete lack a last-admin / self guard (adminSetRole has a check-then-act one, block/delete none).

### B-024 — [High] All 12 /admin pages rely on the layout gate, which does not re-run on page-segment RSC requests: a demoted admin keeps reading admin data mid-session
**Status: Confirmed** (high confidence). Raw finders: W1-123.

- **Files**: src/app/(main)/admin/layout.tsx:29, src/lib/admin.ts:32, src/app/(main)/admin/people/page.tsx:27, src/app/(main)/admin/audit/page.tsx:1, src/lib/admin-people-query.ts:1
- **Expected**: Every admin page render re-establishes that the requester is an admin before returning member emails, verification states, login attempts, audit rows, reports and analytics.
- **Actual**: requireAdminPage() runs only in admin/layout.tsx. Grep confirms none of the 12 admin page.tsx files (nor their query helpers, e.g. lib/admin-people-query.ts) call auth()/requireAdminPage — they are bare prisma reads. In App Router partial rendering, a navigation request renders only the segments the client's Next-Router-State-Tree marks as changed: node_modules/next/dist/server/app-render/walk-tree-with-flight-router-state.js gates rendering on `renderComponentsOnThisLevel` derived from the client-sent flightRouterState, and the staleTimes doc states 'shared layouts won't automatically be refetched on every navigation, only the page segment t
- **Fix direction**: Call requireAdminPage() at the top of every admin page (or, cheaper, inside the shared data helpers: loadPeoplePage, the audit/reports/analytics/mail/content/messages/support/catchups loaders), exactly as every admin server action already calls requireAdmin(). Keep the layout call for the counts. This is one line per page and removes both the demotion window and the crafted-request question entirely.
- **Pin it fixed**: Extend src/lib/gate-coverage.test.mjs to assert every file matching src/app/(main)/admin/**/page.tsx contains a requireAdminPage( call (same pattern the repo already uses to pin deleted routes deleted).
- **Validation**: The mechanism and the headline consequence are real and statically provable; only the "all 12 / none of the 12" scoping is wrong, hence ADJUSTED.

WHAT IS CONFIRMED:
1) Partial-render skip is real in Next 16.3.1. In node_modules/next/dist/server/app-render/walk-tree-with-flight-router-state.js, `renderComponentsOnThisLevel` is false when the client-sent flightRouterState[0] matches the current segment and it is not a 'refetch'; in that case the function does NOT call createComponentTree at that
- **Orchestrator note**: SUSPECTED: admin/layout.tsx is the only role gate; RSC segment requests may skip layout re-eval. Needs live proof.

### B-030 — [High] Onboarding + settings avatar and Catch-up answer photos ship raw bytes (up to 15MB / 5MBx3) through Server Actions past Vercel's ~4.5MB body cap
**Status: Confirmed** (high confidence). Raw finders: W1-035, W1-159, W1-160, W1-333.

- **Files**: src/components/onboarding/steps/photo-step.tsx:42, src/components/settings/actions.ts:20, next.config.ts:111, src/components/profile/letterhead-profile.tsx:363, src/lib/image-downscale.ts:4
- **Expected**: A new member picking a normal phone photo (5–12MB is typical for modern phones) during the onboarding wizard has it uploaded, or is downscaled/cropped client-side first so the bytes on the wire fit — exactly what the profile page's avatar path and the feed's /api/upload path already do.
- **Actual**: PhotoStep validates only `if (file.size > 15 * 1024 * 1024)` and then ships the original bytes straight into the updateAvatar server action: `const fd = new FormData(); fd.set("file", file); const result = await updateAvatar(fd);`. There is no crop dialog and no downscaleImage call on this path (AttachImageDialog explicitly has 'no opinion about size/format limits'). On Vercel, request bodies above ~4.5MB are rejected by the PLATFORM (413 FUNCTION_PAYLOAD_TOO_LARGE) before the function runs — the `serverActions: { bodySizeLimit: "25mb" }` in next.config.ts only lifts Next's own guard and cannot raise Vercel's cap. So any photo between ~4.5MB 
- **Fix direction**: Run the picked file through the existing downscaleImage() (2048px webp, already in src/lib/image-downscale.ts) before fd.set in PhotoStep — one import and one line — or route the step through the same crop dialog letterhead-profile uses. Optionally also lower MAX_AVATAR_INPUT/client caps to something the platform can actually carry (~4MB) so the error copy stops promising 15MB.
- **Pin it fixed**: A unit test asserting PhotoStep's pick handler produces a payload under 4MB for an oversized input (jsdom + a stubbed downscale), or at minimum a grep-style regression test that every `fd.set("file", ...)` call site references downscaleImage or a crop dialog.
- **Validation**: The core claim is real in code, but the finding's scope is partly wrong.

CONFIRMED paths (ship raw bytes, no downscale/crop):
1. Onboarding avatar. photo-step.tsx:36-49 validates only file.type and file.size > 15*1024*1024, then fd.set("file", file) and await updateAvatar(fd). No downscaleImage import, no crop. AttachImageDialog/AttachImageWell (attach-image-dialog.tsx) does zero resizing (comment: "no opinion about size/format limits"). updateAvatar (settings/actions.ts:210-215) accepts up to
- **Orchestrator note**: photo-step ships raw file to updateAvatar; catchup answer allows 5MBx3 to /api/upload; both exceed 4.5MB -> 413 before the function runs, opaque failure at first-run.

### B-041 — [High] Deleting or editing a post from the feed never updates the on-screen list: the stale/old card stays until a full reload
**Status: Confirmed** (high confidence). Raw finders: W1-296, W1-208.

- **Files**: src/components/posts/post-card.tsx:147, src/components/posts/post-card.tsx:463, src/components/posts/edit-post-dialog.tsx:46, src/components/posts/post-feed.tsx:114, src/components/posts/feed-column.tsx:43, src/app/(main)/feed/actions.ts:340
- **Expected**: After 'Delete this post? This cannot be undone.' is confirmed and the server succeeds, the card disappears. After 'Save' in the edit dialog, the card shows the new text.
- **Actual**: Nothing visible happens. Every surface that renders PostCard (main feed, group feed, profile Posts/Letters tabs, Saved) holds its posts in client useState populated by the loadPosts/loadSavedPosts server actions. revalidatePath('/feed') in deletePost/editPost only re-renders the server component tree; the client `posts` state persists, so the deleted post remains on screen (clicking delete again errors) and the edited card keeps the pre-edit content until the member navigates away and back.
- **Fix direction**: Mirror the existing patterns: give PostCard an internal `setRemoved(true)` on successful member delete (exactly like handleModerationConfirm), and have EditPostDialog return the saved content/title to PostCard via an onSaved callback that PostCard mirrors into local state (add `const [content, setContent] = useState(post.content)` or an override state). Alternatively bump FeedColumn's reloadKey via an onChanged callback threaded down, but the local-state fix avoids a refetch and matches the admin path.
- **Pin it fixed**: Playwright spec: create a post, delete it, expect.poll the card count to drop without navigation; edit a post, assert the card text updates. Pin in e2e/ next to sidebar.spec.ts.
- **Validation**: I read every cited function in full and could not refute the finding.

1) post-card.tsx handleDelete (147-152): on a successful deletePost(post.id) it does nothing locally — no state change, no callback, no router.refresh, and useRouter is not even imported. It only toasts on error. Re-clicking Delete hits deletePost -> findUnique returns null (line 322) -> {error:'Post not found'} -> error toast, exactly as claimed.

2) The contrast is real and damning: handleModerationConfirm (154-158) sets se
- **Orchestrator note**: post-feed client posts state has no removal/update path after delete/edit server action.

### B-043 — [High] Letter autosave fails silently: on any error the desk keeps saying 'Saving...', and a fresh never-saved letter is lost entirely on nav/close/crash
**Status: Confirmed** (high confidence). Raw finders: W1-092, W1-297.

- **Files**: src/components/posts/create-post-form.tsx:218-227, src/components/letters/letter-desk.tsx:54-56, src/components/settings/actions.ts, src/lib/auth.ts:277-281
- **Expected**: The immersive letter desk (20,000-char compositions) either saves reliably or tells the writer loudly that saving has stopped; the owner's chaos question 'is the half-written letter lost?' should be answerable with 'no'.
- **Actual**: Two gaps. (1) Resumed-draft autosave: `const result = await editPost(postId, fd); if (!result.error) onAutosaveState?.("saved")` — when result.error is set (e.g. 'Not authenticated' after the session was revoked, which the app's own credentialVersion mechanism does instantly on a password reset or deletion request from another device) NOTHING happens: no toast, no state change, the desk chrome stays on 'Saving...' (letter-desk.tsx:55) while every subsequent autosave also fails; a transport rejection additionally goes unhandled (no try/catch). The writer continues for an hour believing the letter is persisting; navigating away loses everything
- **Fix direction**: In the autosave callback: wrap in try/catch; on result.error or rejection set a third autosave state ('failed') that letter-desk renders loudly ('Not saving — check your connection / sign in again'), and toast once on first failure. Mirror the typed content into localStorage keyed by postId (and a 'new-letter' key for fresh compositions) as a crash net; offer restore on next mount. Consider a beforeunload prompt while unsaved changes exist.
- **Pin it fixed**: Playwright: open a draft, block the action route, type, assert the failed-save state becomes visible within one autosave interval (expect.poll on the status text).
- **Validation**: Both halves verified in code. (1) Resumed-draft autosave, create-post-form.tsx:218-227: the setTimeout awaits editPost and only calls onAutosaveState with "saved" when result.error is falsy; the failure path is genuinely empty and the await has no try/catch. saveState in letter-desk.tsx (36, 54-56, 71) is driven ONLY by that callback, which is called with "saving" (line 220) then conditionally "saved"; nothing ever resets it to idle or an error state, so on failure the desk chrome stays on the l
- **Orchestrator note**: autosave error path leaves 'Saving...' with no surface; no draft persistence for an unsaved letter/long post.

### B-044 — [High] Composer Post/Save stays enabled while photo uploads are in flight: the post publishes without its photos
**Status: Confirmed** (high confidence). Raw finders: W1-299.

- **Files**: src/components/posts/create-post-form.tsx:1087, src/components/posts/create-post-form.tsx:1059, src/components/posts/create-post-form.tsx:453, src/components/posts/create-post-form.tsx:473
- **Expected**: While `uploading` is true, Post and Save-as-draft are disabled (or the submit waits for the batch), so what the member attached is what publishes. message-composer.tsx gets this right: `const busy = sending || uploading; const canSend = body.trim().length > 0 && !busy;`.
- **Actual**: On a slow connection a member attaches photos (spinner on the photo icon), types, and hits Post before the batch finishes: the post is created from the current `images` state — without the in-flight photos. When handleImageFiles later completes, it appends the uploaded URLs to the now-cleared arrays, so thumbnails reappear inside the empty, collapsed composer; the next post the member writes silently carries the previous post's photos. The uploaded R2 objects are orphaned if they never post.
- **Fix direction**: Add `uploading` to both disabled conditions (label the button 'Uploading photo...' while so), and/or stamp a batch id when uploads start and drop the results if the composer was cleared meanwhile.
- **Pin it fixed**: Unit-testable if the upload helper is injectable; otherwise Playwright with a throttled route: attach, submit immediately, assert the created post contains the image or the button was disabled.
- **Validation**: Read create-post-form.tsx in full around state, upload, and submit paths. All four claims hold. (1) Submit CTAs are not gated on upload: line 1087 disabled={!content.trim() || submitting || savingDraft} for Post and line 1059 identical for Save as draft, with uploading absent from both, while the photo control at line 832 IS gated (disabled: images.length >= 3 || uploading). So during an in-flight upload the photo icon disables but Post/Save stay clickable (type=button motion.button, plain onCli
- **Orchestrator note**: create-post-form submit not gated on in-flight upload promises.

### B-045 — [High] 'This week in Letters' rail surfaces city-scoped letters to every member sitewide — content leak + guaranteed 404 on click-through
**Status: Confirmed** (high confidence). Raw finders: W1-245.

- **Files**: src/components/feed/rail/letters-module.tsx:22, src/app/(main)/letters/page.tsx:52, src/app/(main)/letters/[id]/page.tsx:106
- **Expected**: A letter published with a city audience ("Bangalore only", set at the letters desk) is visible only to members with a matching UserPlace, everywhere it is surfaced — the letters index and the feed both enforce this via cityScopeWhere.
- **Actual**: The feed rail's LettersModule picks the newest main-feed letter with NO viewer context and NO cityScope filter, so a city-scoped letter's title, excerpt, author and read time are shown to every member on /feed. An out-of-city member who clicks it hits the reading page's canViewCityScope check and gets notFound() — a teaser to a 404, for as long as that letter is the newest of the week.
- **Fix direction**: Pass the viewer (session) into LettersModule (or into FeedRail) and add the same audience filters the letters index uses: `...(isAdmin ? {} : { AND: [cityScopeWhere(viewerCities)] })` plus the targetBatches OR-fragment for symmetry with loadPosts. Since the rail is per-request server-rendered this is one extra Promise.all leg; alternatively query the newest 3 letters and pick the first the viewer may see.
- **Pin it fixed**: New unit/integration test: a letter with cityScope='X' and a viewer without X — assert LettersModule renders null / a different letter. Also a Playwright check that the rail teaser never 404s on click for a non-admin member.
- **Validation**: The rail query is genuinely unscoped. letters-module.tsx:22-39 runs `prisma.post.findFirst` with where `{ kind:"letter", isHidden:false, groupId:null, ...PUBLISHED_ONLY, createdAt:{gte: now-WEEK} }` — no cityScope predicate and no viewer/session at all (the function takes no args and never calls auth()). It selects title+content+author and renders letterTitle (falls back to first line of body, utils.ts:349-356), plainExcerpt (up to 160 chars of the body, utils.ts:377-390) and the author name/bat
- **Orchestrator note**: letters-module rail query omits the cityScope visibility filter the letter page enforces.

### B-048 — [High] A letter draft's city audience is invisible and unchangeable at the desk: editPost drops cityScope and the desk never hydrates it
**Status: Confirmed** (high confidence). Raw finders: W1-248.

- **Files**: src/app/(main)/feed/actions.ts:447, src/components/posts/create-post-form.tsx:156, src/app/(main)/letters/[id]/edit/page.tsx:26, src/components/letters/letter-desk.tsx:72
- **Expected**: The audience a writer picks at the letters desk is what the letter publishes with, and the desk always shows the draft's current audience.
- **Actual**: Three interlocking gaps. (1) editPost's update writes only `{ content, title?, images? }` — cityScope is never read from the form, so choosing a city (or 'Everyone') while resuming a draft is silently ignored. (2) The edit page's select fetches `id, kind, status, authorId, title, content, images, isHidden` — not cityScope — and LetterDesk/CreatePostForm have no initialCityScope prop; `audienceCity` always initialises to null, so a draft saved as 'Bangalore only' renders with no audience chip, looking like 'Everyone'. (3) Even in one sitting: first "Save as draft" stores cityScope via createPost, then onDraftSaved does router.replace to the ed
- **Fix direction**: Fetch cityScope on the edit page, add an initialCityScope prop threaded LetterDesk -> CreatePostForm to seed audienceCity, and make editPost accept a cityScope field for the author's own letter drafts, re-validated against the author's UserPlace list exactly as createPost does (including explicit clearing to null when 'Everyone' is chosen — note the current `if (audienceCity)` guard cannot express clearing; send the field unconditionally for drafts).
- **Pin it fixed**: Unit test: save draft with cityScope, resume, change to Everyone, publish — assert row cityScope is null; and resume-render shows the stored city chip.
- **Validation**: All three cited mechanisms verified in code. (1) editPost (src/app/(main)/feed/actions.ts:447-455) writes only { content, ...(isLetter ? { title } : {}), ...imagesUpdate }; it never reads formData.get("cityScope") and never writes the cityScope column, so a city choice on a resumed draft is silently discarded. The autosave path (lines 218-227) likewise omits cityScope. (2) The edit page select (src/app/(main)/letters/[id]/edit/page.tsx:28-37) fetches id, kind, status, authorId, title, content, i
- **Orchestrator note**: editPost omits cityScope from the update; edit page does not load it.

### B-049 — [High] Contact-editor stale closure: removing a phone/link/email row saves the PRE-removal list, so the removed value silently survives
**Status: Confirmed** (high confidence). Raw finders: W1-276.

- **Files**: src/components/profile/contacts-editor.tsx:223, src/components/profile/letterhead-profile.tsx:423, src/components/profile/letterhead-profile.tsx:1173
- **Expected**: Clicking the X on a contact row removes that phone number / link / social from the member's stored contact methods.
- **Actual**: The UI removes the row, but the server write persists the OLD list including the removed row. On the next page load the 'removed' phone number is back on the member's public Get in touch sheet.
- **Fix direction**: Make removal commit the list it just computed: either change ContactsEditor's remove handler to call a new `onRemove(next: ContactRow[])` prop that both sets state and saves `rowsToPayload(next)` directly, or change `commitContacts` to accept an explicit rows argument (`commitContacts(next)`) and have the remove button pass the filtered array. Same pattern commitPlaces/commitHouses already use (they pass `next` into the action).
- **Pin it fixed**: New unit/component test: render ContactsEditor with two phone rows, click remove on one, assert updateContactMethods was called with a payload of ONE phone. Also a Playwright spec: remove a phone in edit mode, reload the profile, assert the number is absent from Get in touch.
- **Validation**: Mechanism verified end to end. contacts-editor.tsx:226-229 remove button runs `onChange(rows.filter(...))` then `onCommit()` synchronously in one handler. letterhead-profile.tsx:1173-1177 wires `onChange={setContactRows}` (bare setter) and `onCommit={commitContacts}`, both captured in the SAME parent render. commitContacts (letterhead-profile.tsx:423-429) calls `run(async () => updateContactMethods(rowsToPayload(contactRows)))`; `contactRows` is read directly from that render's closure — no ref,
- **Orchestrator note**: commitContacts reads a stale contactRows closure captured before the removal setState.

### B-060 — [High] A Catch-up whose Round publishes while paused never schedules another Round; resume does not re-arm nextOpensAt and there is no manual recovery
**Status: Confirmed** (high confidence). Raw finders: W1-045.

- **Files**: src/lib/catchups.ts:802-806, src/app/(main)/catchups/actions.ts:591, src/app/(main)/catchups/actions.ts:618, src/lib/catchups.ts:907-909, src/app/(main)/catchups/actions.ts:1054-1058
- **Expected**: Pausing suspends the rhythm; resuming restores it. After resume, the next Round should eventually open on the cadence.
- **Actual**: If the live Round crosses answering->preparing->published while the Catch-up is paused (the clock advance in advanceEdition does not stop for paused Catch-ups), nextOpensAt is never written. resumeCatchup only flips status back to active. openNextRoundIfDue requires a non-null nextOpensAt, and nothing else in the codebase ever sets it, so the Catch-up sits 'active' forever with no future Round, no error, and no Keeper control to start one.
- **Fix direction**: In resumeCatchup, after flipping status to active, backfill the schedule when it is missing: read the latest edition; if it is published and nextOpensAt is null, set nextOpensAt = max(now, addCadenceGap(latest.publishedAt, cadence)) (or simply addCadenceGap(now, cadence) to restart the rhythm from resume). Alternatively/additionally have the publish transition write nextOpensAt unconditionally and let the status:'active' filter in advanceDueCatchups/openNextRoundIfDue be the sole pause gate — that second shape also removes the stale-meta corner where a pause/resume racing the publish transacti
- **Pin it fixed**: New integration-style test (or a node:test against a stubbed prisma) : pause -> clock-publish -> resume -> assert nextOpensAt is non-null; plus a regression assertion that resumeCatchup on a series whose latest edition is published never leaves nextOpensAt null.
- **Validation**: Traced the full path and could not refute it. (1) advanceDueCatchups selects in-flight editions with `where: { status: { in: ["collecting","answering","preparing"] }, catchup: scope }` (catchups.ts:956-964); `scope` is `{}` or a membership filter, never `catchup.status`, so paused Catch-ups' editions still advance. (2) planNextAction/nextEditionStatus (catchups.ts:356-534) are purely clock-based on the edition's own timing and never read catchup status, so a Round crosses answering->preparing->p

### B-061 — [High] Pausing or ending a Catch-up does not stop the in-flight Round: it keeps advancing, sending daily reminders, and publishes itself
**Status: Confirmed** (high confidence). Raw finders: W1-059.

- **Files**: src/lib/catchups.ts:956, src/lib/catchups.ts:802, src/lib/catchups.ts:827, src/components/catchups/home/catchup-home-shell.tsx:57, src/app/(main)/catchups/[catchupId]/page.tsx:513, src/app/(main)/catchups/actions.ts:1119
- **Expected**: After the Keeper pauses (or ends) a Catch-up, members stop being nudged and the live cycle visibly freezes (or, if 'the current round finishes' is the intended semantics, the home keeps showing the live console so members can still answer from it).
- **Actual**: advanceDueCatchups selects live editions with no filter on catchup.status, and applyEditionAction only consults catchupStatus for setsNextOpensAt. So a paused/ended Catch-up's Round keeps auto-advancing collecting->answering->preparing->published, keeps firing catchup_answers_open/catchup_published to every member, and non-answerers keep receiving a DAILY catchup_reminder for the whole 7-10 day window. Meanwhile the home replaces the entire console with 'This Catch-up is paused.' (no Answer CTA, no question list), yet the page header still prints the live countdown ('{name} · 3 days left') above that banner, the notification links to /catchup
- **Fix direction**: Decide the semantics and enforce them in one place: either (a) exclude paused/ended catchups from advanceDueCatchups' edition query and from advanceEdition (freeze), shifting deadlines by the pause duration on resume; or (b) let the current Round finish but keep rendering the live console + countdown under a slim paused banner and keep reminders consistent with what the page shows. Also gate submitEntry and the /answer page on catchup.status if (a).
- **Pin it fixed**: Unit test on planNextAction/advanceEdition with a paused catchup asserting no transition and no reminder fires; e2e: pause mid-answering, assert no new notification rows appear after a simulated day.
- **Validation**: Every load-bearing claim checks out and I found no refuting guard.

1) Pause/end touch ONLY the catchup row, never the in-flight edition. pauseCatchup (actions.ts:591) does catchup.update data:{status:"paused"}; endCatchup (actions.ts:645-648) does data:{status:"ended", nextOpensAt:null}. Neither writes catchupEdition, so the live edition keeps its collecting/answering/preparing status.

2) The advance engine ignores catchup.status. advanceDueCatchups (catchups.ts:956-964) selects editions on st

### B-070 — [High] deletion-scheduled emails can never be sent: drain eligibleKinds omits the kind, so every account-deletion confirmation / takeover alarm sits queued forever
**Status: Confirmed** (high confidence). Raw finders: W1-263, W1-122.

- **Files**: src/lib/email-queue.ts:468-469, src/lib/email-queue.ts:471-472, src/components/settings/actions.ts:338-350, src/lib/email-queue.ts:565-567, src/lib/retention.ts:103-106
- **Expected**: requestAccountDeletion enqueues kind 'deletion-scheduled' at priority 20 as 'the only warning a person gets that their account is going away' and the takeover alarm for the 60-day grace window. The drain should send it just behind resets, as PRIORITY, ENQUEUE_LIMIT and render() all provide for.
- **Actual**: The drain can never select the row. `eligibleKinds` is `["verify", "reset", "password-changed"]` or `["reset", "password-changed"]` — 'deletion-scheduled' appears in neither branch, and findFirst filters `kind: { in: eligibleKinds }`. The only other caller of claimAndSend is verificationMailState, which reads `kind: "verify"` rows only. So every deletion-scheduled row sits status 'queued' forever: the member who requested deletion never gets the written confirmation, a victim of an account takeover never gets the alarm during the 60-day undo window, the admin panel's 'Waiting to go' count is permanently inflated, admin retryMail cannot help (
- **Fix direction**: Add "deletion-scheduled" to both branches of eligibleKinds (it is a priority-20 security notice exactly like password-changed, so it belongs wherever password-changed is). Better: derive the always-eligible list from PRIORITY's keys minus 'verify' so a future fifth kind cannot repeat this bug. Then sweep the database for stranded queued deletion-scheduled rows and re-send or hand-notify.
- **Pin it fixed**: Unit test: for every key of PRIORITY, enqueue a row and assert one drainMailQueue pass (with sendMail stubbed ok) marks it 'sent'. This pins the invariant that no MailKind is ever un-drainable.
- **Validation**: The bug is real and exactly as stated. claimAndSend (email-queue.ts:159) is the ONLY function that moves a row out of status "queued"; grep confirmed it has exactly two callers. Caller 1, drainMailQueue, computes eligibleKinds = verifyRemaining>0 ? ["verify","reset","password-changed"] : ["reset","password-changed"] (468-469) and its findFirst filters kind:{in: eligibleKinds} (471-472); "deletion-scheduled" is in neither array, so the row is never picked. Caller 2, verificationMailState, findFir
- **Orchestrator note**: ORCHESTRATOR-VERIFIED: MailKind includes 'deletion-scheduled' but eligibleKinds is always ['verify','reset','password-changed'].

### B-071 — [High] A bounce/complaint webhook flips a 'sent' row to 'failed', which resurrects daily-budget slots and lets the app send past Resend's real 100/day cap
**Status: Confirmed** (high confidence). Raw finders: W1-265, W1-152.

- **Files**: src/app/api/resend/webhook/route.ts:110-129, src/lib/email-queue.ts:257-267, src/lib/email-queue.ts:80, src/lib/email-queue.ts:502-509
- **Expected**: dailyBudget's 'used' should count every message Resend accepted today (that is what spends the provider's quota), so the app's DAILY_CAP=95 stays under Resend's 100 with the deliberate 5-message margin.
- **Actual**: dailyBudget counts `{ status: "sent", sentAt: { gte: startOfUtcDay() } }`. The webhook's bounce patch sets `status: "failed"` (and complaint likewise) while leaving sentAt in place — so every same-day bounce or complaint removes a message from 'used' that Resend already counted against the real quota. Each bounce resurrects one phantom budget slot. The webhook file's own motivation is launch mail 'bouncing off stale addresses' in the hundreds; a dozen same-day bounces already exceeds the entire 5-message headroom, after which the drain keeps sending while Resend hard-rejects — and each rejection burns attempts toward terminal 'failed' (see th
- **Fix direction**: Count acceptance, not current status: change dailyBudget (and mailHealth.sentToday) to `where: { sentAt: { gte: startOfUtcDay() } }` with no status filter (sentAt is only ever written on a real provider accept, and the webhook never clears it), or keep bounce state in bouncedAt/bounceKind without overwriting status. If status:'failed' stays (the admin worklist depends on it), the budget query must switch to sentAt-only. Also confirm with Resend docs/support whether the 100/day refusal is hard-fail (the code currently assumes it).
- **Pin it fixed**: Unit test: create a row with status 'failed', sentAt = today, bouncedAt set; assert dailyBudget().used counts it.
- **Validation**: The mechanism is real and accurately described. dailyBudget() (email-queue.ts:257-260) derives used ONLY from count where status is "sent" and sentAt >= startOfUtcDay(); remaining and verifyRemaining (261-266) come straight off that count, and it is the single budget gate used by drainMailQueue (452,462) and verificationMailState (589). The Resend webhook bounce patch (webhook/route.ts:110-124) and complaint patch (126-130) both set status="failed" and never touch sentAt; updateMany at 140-143 a
- **Orchestrator note**: dailyBudget counts by status; webhook status='failed' on a delivered row frees a slot.

### B-081 — [High] When the webhook (not the browser) records a payment, the supporter gets nothing: no notification, no email, no path to the promised bird perk
**Status: Confirmed** (high confidence). Raw finders: W1-346.

- **Files**: src/app/api/razorpay/webhook/route.ts:72, src/app/(main)/support/page.tsx:121, src/components/support/support-contribute.tsx:175
- **Expected**: The webhook exists precisely because 'the callback only runs if the payer's tab survives long enough to run it' (its own header). When it is the recorder, the member who paid ₹500+ should still receive some signal that the payment landed and that their pick is open — at minimum an in-app notification carrying the /pick-bird link.
- **Actual**: The webhook's payment.captured branch updates the Contribution row and does nothing else — no Notification row, no email, no revalidation. Meanwhile /support deliberately never links /pick-bird (page.tsx:121-126: 'the ONLY way in is the redirect after a successful payment'). So the exact scenario the webhook was built for — Android kills the tab during the UPI app switch, or the payer closes the 3-D Secure page — ends with money recorded, the recovery bar advanced, and the supporter locked out of the perk they were promised ('Anyone who contributes picks their own bird') unless they guess the /pick-bird URL. The owner's no-standing-link decis
- **Fix direction**: In the webhook's captured branch (only when the row transitions created/failed → paid), create a Notification for contribution.userId along the lines of 'Your contribution was received — pick your bird', linking /pick-bird. That respects the owner's no-standing-link rule (it is a one-time consequence of a payment, not a standing door) and closes the loop for every browser-death case at once. Surface it to the owner as the product decision it is.
- **Pin it fixed**: An integration test on the webhook route: signed payment.captured for a 'created' row asserts both the status flip and the notification row for the contributor.
- **Validation**: All load-bearing claims verified in code. webhook/route.ts:72-83 payment.captured branch is a single prisma.contribution.update({status:"paid",...}) with no Notification, no email, no revalidatePath — grep for notification|outboundemail|sendemail across src/app/api/razorpay/, support/, components/support/ returns NONE. support/page.tsx: the sole <Link href="/pick-bird"> in the whole app (grep) is at line 141, gated by {isAdmin && (...)} (line 140); the comment at 121-125 explicitly says "No stan

### B-092 — [High] Directory page serializes every located member into map props on every load and every filter change (~1-2MB) with no take/pagination
**Status: Confirmed** (high confidence). Raw finders: W1-136.

- **Files**: src/app/(main)/directory/page.tsx:294, src/app/(main)/directory/page.tsx:92, src/app/(main)/directory/page.tsx:344
- **Expected**: The directory should stay usable at 2,000 members: bounded payloads, and per-interaction cost independent of total membership.
- **Actual**: `prisma.user.findMany({ where: pinWhere, select: PIN_SELECT, orderBy: [...] })` (directory/page.tsx:294-298) has no `take` — it fetches every non-blocked member who has any UserPlace, with ~10 scalar fields plus their full places array. buildPins (:92-169) then pushes a full PinPerson object into `people` for EVERY resolvable city the member lists (`existing.people.push(person)` :160), so a member with 3 cities is serialized 3 times. The whole structure is passed as props to the client component `<DirectoryClient users cityPins unmappedPeople ...>` (:344-350), i.e. serialized into the RSC payload of every directory load. At 2,000 members with
- **Fix direction**: Cap what ships: send pins as {city, lng, lat, count} only and lazy-load a pin's people on drilldown via a server action (paginated), or cap people-per-pin (e.g. first 12 + count). Keep the aggregate count server-side. Also consider caching the unfiltered pin aggregation (it is identical for every viewer above Stage 1) with a short revalidate.
- **Pin it fixed**: An e2e assertion on /directory response size (fail above e.g. 300KB), seeded with a few hundred members; or a unit test on buildPins output size bounds.
- **Validation**: Read directory/page.tsx in full and directory-client.tsx. Every load-bearing claim is verified. (1) page.tsx:294-298 `prisma.user.findMany({ where: pinWhere, select: PIN_SELECT, orderBy: [...] })` has NO `take` — and it is the only Promise.all findMany without one; the grid query directly above (pageRows, :281-287) DOES take PAGE_SIZE+1, confirming the pins query is intentionally unbounded. In the default unfiltered view pinWhere = { isBlocked:false, deletionRequestedAt:null, places:{ some:{} }

### B-093 — [High] Visit and SearchLog (identifiable presence telemetry) have no retention: absent from the sweep, prune.mjs, and the retention table — unbounded growth
**Status: Confirmed** (high confidence). Raw finders: W1-312.

- **Files**: prisma/schema.prisma:925, prisma/schema.prisma:986, src/lib/retention.ts:23, scripts/ops/prune.mjs:9, docs/SECURITY.md:84
- **Expected**: Every table that grows with traffic has something bounding it (the sweep, a prune, or a by-design cap), and the owner's retention table covers all personal-data tables. The project's own standard: prune.mjs exists because one unbounded table 'can actually exhaust' the 500MB free tier.
- **Actual**: runRetentionSweep deletes from exactly seven tables (adminMessages, reports, contributions, notifications, loginAttempts, auditLogs, outboundEmails — retention.ts:73-107) plus due accounts; prune.mjs touches only Notification. Nothing anywhere deletes Visit or SearchLog rows (repo-wide grep for visit/searchLog deleteMany: zero hits outside generated code; the only non-telemetry readers are admin-analytics SELECTs). Both tables were added 2026-08-19, AFTER prune.mjs was written, whose header still claims 'Nothing else here grows unbounded' (prune.mjs:9-10) — that claim is now false. Arithmetic: a Visit row is one per member-sitting and carries
- **Fix direction**: Pick retention windows with the owner (e.g. Visit 90-180 days — the analytics room's questions are about recent behaviour; SearchLog 180-365 days) and add two deleteMany steps to runRetentionSweep (both tables need a createdAt/endedAt-leading index for the sweep predicate: Visit already has @@index([endedAt]); SearchLog has @@index([scope, createdAt]) which does not lead on createdAt — add @@index([createdAt]) or sweep per-scope). Record both in the SECURITY.md retention table and in the KEEP_DAYS comment block.
- **Pin it fixed**: Extend the sweep's result type and any sweep test to include visits/searches counts; a schema-coverage assertion (every model with a traffic-driven insert path appears either in KEEP_DAYS, in prune.mjs, or on an explicit bounded-by-design list) would catch the next telemetry table added without a po
- **Validation**: Every cited claim checks out and I found no guard, cron, TTL, trigger, or cascade that bounds these tables. retention.ts KEEP_DAYS (lines 23-40) and its sweep body (lines 73-107) cover exactly seven table categories (adminMessage, report, contribution, notification, loginAttempt, auditLog, outboundEmail) plus the 60-day account purge — no visit or searchLog delete. prune.mjs deletes only "Notification" (lines 64-75) and its header (lines 5-9) still claims "Nothing else here grows unbounded," now

### B-121 — [High] joinBatchGroup is check-then-create with no unique on Group.name: concurrent same-batch signups (launch day) create duplicate 'Batch of Y' groups, splitting the batch
**Status: Confirmed** (high confidence). Raw finders: W1-149.

- **Files**: src/components/auth/actions.ts:215, src/components/auth/actions.ts:221, prisma/schema.prisma:191
- **Expected**: One "Batch of {year}" group per batch, with every alumnus of that batch auto-joined into the same group — the rule the code's own comment states ("The first person from a batch creates the group").
- **Actual**: The rule is backed by nothing: Group has no unique on name (schema.prisma:191-208 — the code admits it: "Group.name is not unique in the schema, so match by exact name"). auth/actions.ts:215-230 is a findFirst → create with no P2002 possible: two members of the same batch registering concurrently (launch day is explicitly expected to exceed 100 signups) both miss the findFirst and both create a group named "Batch of 2010". From then on every later signup's `findFirst({ where: { name } })` — with no orderBy, so arbitrary but sticky — lands members in one or the other: the batch is permanently split into two groups whose members cannot see each
- **Fix direction**: Give the batch group an enforceable identity: either a partial/expression unique in a manual migration (e.g. UNIQUE on name for rows where name LIKE 'Batch of %', or better a dedicated nullable `batchYear Int? @unique` column on Group written only by joinBatchGroup), then convert joinBatchGroup to create-with-catch-P2002-then-findFirst (mirror the createCatchup pattern at catchups/actions.ts:326-372). Also add a one-off dedupe script for any duplicates already in the table before the constraint lands.
- **Pin it fixed**: Unit test firing two concurrent joinBatchGroup calls for the same fresh batchYear against a test DB and asserting exactly one Group row; a data-integrity check in the admin panel (or npm run check script) asserting no duplicate 'Batch of %' names.
- **Validation**: Real and as described. joinBatchGroup (auth/actions.ts:208-237) builds the name Batch of {year}, runs findFirst({where:{name}}) at 215-218, and only if null runs group.create({data:{name,...,creatorId}}) at 220-230, with no transaction, no lock, no SELECT FOR UPDATE. I confirmed there is NO unique on Group.name: schema.prisma:191-208 declares name String with only @@index([visibility, createdAt]); grepping all of prisma/migrations-manual/ and the whole prisma/ tree shows the only Group-adjacent
- **Orchestrator note**: LIVE: 0 dup groups today (latent). Race needs concurrency; launch is the spike.

### B-011 — [Medium] Account purge deletes DB rows first then R2 bytes best-effort from an in-memory URL list; any crash/timeout mid-loop permanently orphans images
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-310, W1-161, W1-259.

- **Files**: src/lib/account-purge.ts:88, src/lib/account-purge.ts:108, src/lib/storage.ts:218, src/lib/storage.ts:267, src/lib/retention.ts:127
- **Expected**: A purge (GDPR Art. 17, audits H9/M35) reliably removes the member's R2 objects, or at minimum leaves a durable record of what still needs removing so a retry can finish the job; the audit trail reports what actually happened.
- **Actual**: purgeUserAccount collects URLs in a local array, deletes the rows in a transaction, then loops `for (const url of urls) { await delImage(url); deleted += 1; }` (account-purge.ts:109-112). Three defects compound: (1) delImageByKey swallows every error (`catch { /* best-effort cleanup */ }`, storage.ts:225-227), so a transient R2 429/500 during the loop silently skips the object — and because the pointing rows are already gone, the file's own comment admits 'afterwards nothing can enumerate the objects' (account-purge.ts:79-81): the miss is permanent and the bytes stay publicly fetchable at pub-*.r2.dev, which is exactly the pre-H9 failure this
- **Fix direction**: Make the object list durable before the row delete: either (a) delete R2 objects keyed by prefix instead of by collected URLs — all app-minted uploads live under `uploads/<userId>/...` and `avatars/<userId>/...` (see ownedUploadUrls and the merge's avatar note in admin/people/actions.ts:322-330), so a ListObjectsV2+delete over those two prefixes AFTER the row delete is re-runnable and misses nothing even on crash; or (b) persist the collected URLs into a small PendingImagePurge table in the same transaction as user.delete, drain it in the loop, and let the nightly sweep retry leftovers. Also m
- **Pin it fixed**: Unit test with a stubbed storage layer: make delImage fail for one of three URLs, assert imagesDeleted reports 2 (not 3) and that the failed key remains discoverable (pending row or prefix listing) for a retry; a second run must remove it.
- **Validation**: All three sub-claims are literally true in the code as read.

(1) Silent swallow: storage.ts:218-228 delImageByKey has an empty `catch { // best-effort cleanup }` — no rethrow AND no log; delImage (267-271) never throws. account-purge.ts:78-81 comment confirms "afterwards nothing can enumerate the objects," and my grep of src/ and scripts/ found NO orphan-reconciliation / ListObjects / R2 sweep anywhere. So a failed R2 delete during the purge produces zero signal and permanently orphans the byte
- **Orchestrator note**: purgeUserAccount: prisma.$transaction deletes rows, then for-loop delImage over urls collected before the delete. No resume, no persisted worklist. Unbounded sequential R2 deletes vs Vercel duration ceiling.

### B-022 — [Medium] proxy.ts redirects signed-out visitors to /login?callbackUrl=<path> but the login page reads only ?next= — every shared deep link drops to /feed
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-332.

- **Files**: src/proxy.ts:242-245, src/app/(auth)/login/login-client.tsx:399-404, src/lib/next-path.ts:33-36
- **Expected**: A signed-out person clicking a shared link to /letters/xyz signs in and lands on /letters/xyz.
- **Actual**: They land on /feed, always. The parameter the proxy writes is never read by anything.
- **Fix direction**: Change proxy.ts to set `next` instead of `callbackUrl` (value = pathname + search, so query strings survive too), since safeNextPath already validates it against open-redirects. Alternatively teach nextPathFromLocation to fall back to callbackUrl; the single-param option is cleaner. Mirror on the signup path if desired (signup already forwards next through /welcome).
- **Pin it fixed**: Playwright spec: visit a gated route signed out, sign in through the form, expect.poll final URL to equal the original route.
- **Validation**: The finding's mechanism is exactly correct. proxy.ts:242-245 writes the destination as `?callbackUrl=` (`loginUrl.searchParams.set("callbackUrl", pathname)`). The login success path reads only `?next=`: login-client.tsx:403 does `window.location.href = nextPathFromLocation()`, and next-path.ts:33-36 reads solely `new URLSearchParams(window.location.search).get("next")`, falling back to "/feed" when absent. Crucially, login-client.tsx:378-383 calls `signIn("credentials", { redirect: false })`, so
- **Orchestrator note**: proxy sets callbackUrl; login-client + next-path.ts read next=. Deep links (shared post/letter/profile) never return to target after login.

### B-040 — [Medium] All five like/vote/bookmark toggle actions are check-then-write with no P2002/P2025 handling: a double-tap throws a raw error and desyncs the UI
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-151, W1-209, W1-210.

- **Files**: src/app/(main)/feed/actions.ts:477, src/app/(main)/feed/actions.ts:533, src/app/(main)/feed/actions.ts:1053, src/app/(main)/feed/actions.ts:284, src/app/(main)/collection/actions.ts:508, src/components/posts/post-card.tsx:134
- **Expected**: Per the app's own contract (stated at the top of catchups/actions.ts) actions return "a loose { error } / { success } shape rather than throwing to the client", and every one-row-per-pair rule is settled by its unique index with the P2002 loser answered gracefully — the pattern reportUser (report-action.ts:185-193) and registerUser (auth/actions.ts:164-169) already implement.
- **Actual**: toggleLike, toggleBookmark, toggleCommentLike, votePoll (feed/actions.ts) and togglePhotoLove (collection/actions.ts) each do findUnique → create/delete/update with NO try/catch. Two rapid invocations (mobile double-tap, two tabs — post-card.tsx handleLike at 134-145 has zero in-flight guard: no busy state, no disable) both read `existing = null` and both create; the loser throws PrismaClientKnownRequestError P2002 out of the action. Symmetrically, both reading `existing` and both deleting throws P2025. The client code only handles `result.error` (post-card.tsx:140 `if (result.error)`), so the throw becomes an unhandled promise rejection: no 
- **Fix direction**: Make the five toggles race-proof at the server: replace check-then-act with delete-first semantics or wrap create in try/catch treating P2002 as success-liked and P2025 as success-unliked (idempotent toggle), returning the loose { success, liked } shape; add an existence check (or P2003 catch) in togglePhotoLove. Optionally add an in-flight guard to handleLike/handleBookmark like poll-display.tsx's `submitting` ref.
- **Pin it fixed**: Unit tests invoking each toggle twice concurrently (Promise.all) against a test DB asserting neither call rejects and the final row state is consistent; a lint-style grep gate asserting no bare prisma.<model>.create for models with @@unique inside actions files without an enclosing try/P2002 handler
- **Validation**: The code confirms the core mechanism. Server side the actions are check-then-write with no try/catch and no runAction wrapper: toggleLike (feed/actions.ts:477-521, findUnique then delete/create), toggleBookmark (533-546), toggleCommentLike (1053-1092), votePoll (284-307), togglePhotoLove (collection/actions.ts:508-518). The uniqueness that makes a concurrent create throw P2002 exists in schema.prisma: Like @@unique([userId,postId]) line 465, Bookmark 428, CommentLike 627, PhotoLove 188, PollVote
- **Orchestrator note**: toggleLike/toggleCommentLike/toggleBookmark/togglePhotoLove/votePoll: find-then-create, unhandled unique/notfound; no client rejection handler.

### B-042 — [Medium] No client component handles a rejected server action anywhere: one network blip / deploy skew / auth redirect strands the UI (infinite skeletons, stuck buttons)
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-298, W1-090.

- **Files**: src/components/posts/post-feed.tsx:118, src/components/posts/comments-section.tsx:161, src/components/posts/comments-section.tsx:191, src/components/posts/poll-display.tsx:103, src/components/messages/message-composer.tsx:88, src/components/posts/create-post-form.tsx:497
- **Expected**: A server action call can REJECT (it does not return {error}) on: network failure, 'Failed to find Server Action' version skew right after a deploy, and the proxy redirecting an expired/revoked session to /login. Each await site needs try/catch (or .catch) that resets its pending flag, reverts optimistic state, and tells the member something actionable — the standard the codebase itself sets in edi
- **Actual**: Almost every other await-an-action site assumes resolution. Consequences by class: (a) ETERNAL LOADING — post-feed.tsx initial load `fetchPosts(null).then((data) => {...})` has no .catch, so a rejection leaves `loading` true forever: the app's main page shows skeletons with no retry path. Same shape in comments-section initial load, saved-posts-feed, profile-author-feed, collection-client. (b) WEDGED CONTROLS — comments-section handleSubmit: `setSubmitting(true); ... await createComment(formData); ... setSubmitting(false)` with no try: a throw leaves submitting true and the comment box disabled forever; identical pattern wedges poll-display (
- **Fix direction**: Introduce one helper (e.g. `callAction(fn): Promise<{error?...}>` that catches rejection into `{ error: 'That did not go through. Check your connection.' }`) and route every client await-an-action through it; convert each setBusy pair to try/finally. Priority order: post-feed initial load and load-more, comments-section (all three sites), create-post-form handleSubmit, poll-display, message-composer, the four love/bookmark callers (revert in catch), notification-bell, directory/collection load-more, letterhead avatar paths, catchups controls.
- **Pin it fixed**: Unit-test the helper; add one Playwright spec that blocks the action route (route.abort) and asserts the comment button re-enables with an error toast instead of wedging.
- **Validation**: The core defect is real and every cited line checks out. (a) post-feed.tsx:114-142 starts loading=true/posts=[] and client-fetches the feed via fetchPosts(null).then(...) with no .catch; a rejected loadPosts (network drop, 500, or a Prisma/pgbouncer error — loadPosts at actions.ts:764 has no internal try/catch) never runs the callback, so setLoading(false) is unreachable and the app's primary surface shows skeletons forever with no retry. comments-section.tsx:138-150 has the identical shape. (b)
- **Orchestrator note**: Systemic: fetch/mutation handlers lack try/catch across feed, collection, profile, notifications, auth.

### B-046 — [Medium] Like/comment/reply notifications link to /feed#<postId> (never scrolls, wrong for group posts/letters); admin bell links to retired /admin?thread=
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-246, W1-247.

- **Files**: src/app/(main)/feed/actions.ts:503, src/app/(main)/feed/actions.ts:628, src/app/(main)/feed/actions.ts:649, src/app/(main)/feed/actions.ts:1078, src/components/posts/post-feed.tsx:102, src/components/layout/notification-bell.tsx:168
- **Expected**: Clicking "X liked your post" / "X commented on your post" lands the member on that content: a letter's thread at /letters/[id], a group post at its group feed, a feed post scrolled into view.
- **Actual**: All four write sites hard-code `link: \`/feed#${postId}\`` regardless of the post's kind or groupId. (1) Group posts never appear in the main feed (loadPosts filters `groupId: null`), so the link lands on /feed with nothing to show. (2) A letter's comments are not rendered in the feed (the feed shows a compact letter card; the thread lives at /letters/[id]), so a comment notification on a letter cannot reach the comment. (3) Even for plain feed posts the fragment never works: PostFeed is a client component that fetches posts via the loadPosts server action after mount, so at the moment router.push(notif.link) commits, no element with id=postI
- **Fix direction**: At each notification write, read kind and groupId alongside authorId, and build the link: letters -> `/letters/${postId}` (optionally `#comment-<id>`), group posts -> `/groups/${groupId}#${postId}`, feed posts -> `/feed#${postId}` plus a small client hash-handler in PostFeed that, after the first page loads, scrolls to location.hash if present (and ideally fetches the single post by id if it is not on page 1). Fix the copy to say "your letter" when kind=letter.
- **Pin it fixed**: Unit test on the notification writers asserting link shape per kind/groupId; Playwright: like a group post as B, click A's notification, assert URL is the group page and the post is visible.
- **Validation**: Every mechanical claim checks out in code.

(1) All four write sites hard-code the feed fragment regardless of post kind/groupId: toggleLike `link: `/feed#${postId}`` at feed/actions.ts:508 (post select is only `{ authorId: true }` at :499 — no kind/groupId read); createComment `/feed#${parsed.data.postId}` at :633; reply `/feed#${parsed.data.postId}` at :654; toggleCommentLike `/feed#${comment.postId}` at :1083.

(2) Group posts are excluded from the main feed: loadPosts builds the main-feed wh
- **Orchestrator note**: notification link builders use #fragment and a removed admin route.

### B-047 — [Medium] editPost caps plain posts at 5000 chars while createPost accepts 20000 — a legitimately long post becomes permanently uneditable
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-212.

- **Files**: src/app/(main)/feed/actions.ts:396, src/lib/validators.ts:154, src/components/posts/create-post-form.tsx:63, docs/spec/letters.md:253
- **Expected**: Per the letters spec ("content max becomes conditional: 5000 for 'post', 20000 for 'letter'"), the create and edit paths enforce the same per-kind cap; anything you could post you can edit.
- **Actual**: postSchema is a flat `content: z.string().min(1).max(20000)` for BOTH kinds, and the composer has no length limit on the contentEditable (only a soft "This might make a lovely Letter" nudge at 600 chars). So a member can post 5001-20000 chars as a plain post through the normal UI. editPost then enforces `const cap = isLetter ? 20000 : 5000; if (!content || content.length > cap) return { error: ... }` — opening the edit dialog on such a post and saving (even with zero changes) is refused with "Content must be between 1 and 5000 characters".
- **Fix direction**: Make the caps agree: either refine postSchema to a conditional max (5000 when kind !== 'letter') so creation matches the spec, or raise editPost's post cap to 20000 to match what creation already allows. Pick one number and enforce it in both places from one shared constant.
- **Pin it fixed**: Unit test: create a 6000-char kind:'post' payload through postSchema and through editPost's validation, asserting the two verdicts agree.
- **Validation**: The core defect is real and I could not refute it. postSchema.content is a flat z.string().min(1).max(20000) for both kinds (validators.ts:154). createPost validates only through that schema (postSchema.safeParse(raw), actions.ts:91) and stores parsed.data.content directly (actions.ts:158) with no extra plain-post cap, so a 5001-20000 char plain post is accepted. The composer (create-post-form.tsx) is a contentEditable with no length cap; LETTER_NUDGE_LEN=600 (line 63) is only a soft, non-blocki
- **Orchestrator note**: editPost validator maxes 5000; createPost 20000.

### B-062 — [Medium] A Catch-up nobody adds questions to still runs the full cycle: answering opens with zero questions and everyone is reminded to answer nothing
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-060.

- **Files**: src/lib/catchups.ts:505, src/lib/catchups.ts:896, src/app/(main)/catchups/[catchupId]/answer/page.tsx:199, src/lib/catchups-notify.ts:132
- **Expected**: A Round with no accepted questions should not open answering on the clock (there is nothing to answer), should not nudge every member daily about it, and should not publish an empty keepsake; an abandoned Catch-up should quiesce, not loop.
- **Actual**: computeStatus/planNextAction advance collecting->answering purely on questionsCloseAt with no prompt-count guard, firing catchup_answers_open to all members. With zero prompts nobody CAN answer, so every member is a non-answerer and receives a daily catchup_reminder for the 7-day window; at close, the too-few rule extends once (+3 more days of dailies, another answers-open blast), then it publishes an empty Round ('This Round did not gather any questions.') and notifies 'ready to read'. openNextRoundIfDue only requires latest.status === 'published', so a fresh empty Round opens next cadence and the whole loop repeats forever until a human end
- **Fix direction**: In planNextAction (or advanceEdition, which already counts entries lazily), when the collecting window lapses with zero accepted prompts, either extend the question window once (mirroring the too-few-answers rule) and then auto-pause the catchup, or skip straight to a quiet no-op state that never notifies; and make openNextRoundIfDue refuse (or auto-pause) after publishing an edition with zero entries, so an abandoned catch-up goes dormant instead of looping. Fix the /answer zero-prompt copy to not promise an impossible action.
- **Pin it fixed**: Unit tests on planNextAction: (collecting, 0 prompts, past close) does not transition to answering / does not notify; (published empty, nextOpensAt past) does not open the next Round.
- **Validation**: The mechanism is real and every cited line checks out. computeStatus (catchups.ts:330-353) and nextEditionStatus (356-362) advance collecting->answering purely on questionsCloseAt timestamps; planNextAction's collecting->answering branch (505-514) returns notify:"catchup_answers_open" with no prompt-count input in scope (its only count is entryCount, and even that is loaded only for the answering->preparing decision, advanceEdition 858-864). Prompts (CatchupPrompt = questions) and Entries (Catch

### B-072 — [Medium] Drain concurrency is unbounded: every authenticated page view and every enqueue kicks a full drain, so launch traffic fans past Resend's rate
**Status: Confirmed** (medium confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-266.

- **Files**: src/app/(main)/layout.tsx:63-69, src/lib/email-queue.ts:350, src/lib/email-queue.ts:364-377, src/lib/email-queue.ts:452-483
- **Expected**: The claim (one row, one sender) is safe, but the SYSTEM should also bound how many drain passes send concurrently, because Resend rate-limits to roughly 2 requests/second (the code's own comment at email-queue.ts:93-95) and the budget check must not be overshootable by more than the 5-message margin.
- **Actual**: There is no global coordination at all. Every authenticated page view runs `after(drainMailQueue)` (layout.tsx:63-69) and every enqueueMail calls scheduleDrain (350). K overlapping passes do not collapse: when two race for the head row, the loser gets 'lost-claim' and simply moves to the NEXT row (comment at 481-482), so K concurrent passes send K different rows in parallel. At launch (steady page views over a 100+ row backlog) that is a self-inflicted 429 storm against a 2 rps provider limit — and every 429 burns an attempt toward terminal failure (Critical finding above). Independently, the budget check is per-pass check-then-send: rows in 
- **Fix direction**: Serialize or throttle drains with a lease row (NOT a pg advisory lock — session-level locks do not survive the pgbouncer transaction pooler): e.g. a single QueueLock row claimed with a conditional updateMany + stale takeover exactly like claimedAt, so at most one (or N) pass sends at a time; other passes return immediately. Alternatively count 'sending' rows into 'used' when computing remaining, which bounds overshoot even with concurrency. Add a small inter-send sleep or honor Resend's rate-limit headers inside the pass.
- **Pin it fixed**: Unit test with sendMail stubbed slow: fire drainMailQueue twice concurrently over a 10-row queue with remaining=1 budget and assert total sent <= budget + lease bound (today it sends 2).
- **Validation**: The code-level premise is verified and correctly located; only the severity/framing is overstated, so CONFIRMED-ADJUSTED to Medium. CONFIRMED mechanics: there is NO global coordination of any kind. I grepped email-queue.ts and email.ts for a draining/in-flight flag, pg advisory lock, SELECT..FOR UPDATE SKIP LOCKED, semaphore/mutex, rate limiter, sleep/backoff, and 429 handling and found none. The only synchronization is the optimistic per-row claim in claimAndSend (email-queue.ts:160-164): updat

### B-080 — [Medium] Payment success callback has no error handling: a thrown confirmContribution after money moved leaves the button stuck on 'Opening' forever, no receipt
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-345.

- **Files**: src/components/support/support-contribute.tsx:119, src/components/support/support-contribute.tsx:161, src/app/(main)/support/actions.ts:81
- **Expected**: Every await of a server action in the payment flow is wrapped so a transport failure (network blip on mobile right after a UPI payment, DB hiccup, action digest error) resets `working`, tells the payer what happened, and — on the confirm path — reassures them the payment itself is safe (the webhook records it).
- **Actual**: Neither `await startContribution(amount)` (line 119) nor `await confirmContribution(res)` inside the Razorpay `handler` (line 161) has a try/catch. A server action that THROWS (as opposed to returning `{error}`) rejects the client-side promise; `pay()` and the async `handler` are fire-and-forget callbacks, so the rejection is unhandled, `setWorking(false)` never runs, no toast appears, and the button shows the 'Opening' spinner permanently. On the confirm path the member has just paid: the modal closes, then nothing — no toast, no redirect to /pick-bird, a dead button. Server side makes the throw realistic: in startContribution the `prisma.us
- **Fix direction**: Wrap the two awaits: in `pay()`, a try/catch around `startContribution` that resets working and toasts the generic gateway message; in `handler`, a try/catch around `confirmContribution` whose catch resets working and toasts something specific and calming — the payment went through at Razorpay and will be recorded by the webhook, e.g. 'Your payment went through. We could not update the page — it will show on Support shortly.' Server side, move the phone `findUnique` inside the existing try in startContribution (or give it its own `.catch(() => null)`, since an absent phone is already an accept
- **Pin it fixed**: A unit test on the component with a mocked `confirmContribution` that rejects: assert the button re-enables and a toast fires. For the server half, a test that startContribution returns `{error}` (not a throw) when the user read rejects.
- **Validation**: The core defect is real. In support-contribute.tsx the try/catch in pay() covers only loadCheckout() (lines 111-117); line 119 `await startContribution(amount)` is a bare await, and in the Razorpay handler (lines 161-178) `const confirmed = await confirmContribution(res)` (line 162) is also bare. Both callbacks are fire-and-forget (onClick=pay and Razorpay's handler; neither consumes the returned promise), so if either server action REJECTS (as opposed to returning {error}), it is an unhandled r

### B-090 — [Medium] Missing indexes on hot count FKs: Like.postId, Comment.parentId, PollVote.postId/pollOptionId, CommentLike.commentId, PhotoLove.photoId, Post.authorId
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-134, W1-135.

- **Files**: prisma/schema.prisma:465, src/app/(main)/feed/actions.ts:859, src/app/(main)/feed/actions.ts:893, src/app/(main)/letters/page.tsx:58, src/app/(main)/feed/actions.ts:996, src/lib/account-purge.ts:99
- **Expected**: Counting likes per post (WHERE postId = ?) and the FK cascade from Post deletion should be index lookups. Postgres does not auto-index FK columns; a child-side index on Like.postId is required.
- **Actual**: Like's only index is `@@unique([userId, postId])` (schema.prisma:465), which leads with userId and cannot serve postId-only predicates. Every feed page (`_count: { select: { comments: {...}, likes: true } }`, feed/actions.ts:859), the letters index (letters/page.tsx:58), saved posts (feed/actions.ts:996), and the 'liked' sort (`orderBy: { likes: { _count: "desc" } }`, feed/actions.ts:893) all count likes per post. Prisma executes relation counts as a grouped aggregate/lateral count on Like WHERE postId — with no usable index that is a full scan of the Like table per request. Plausible 2,000-user row count: ~20k posts x ~10 likes = ~200k Like 
- **Fix direction**: Add `@@index([postId])` to Like in schema.prisma via a dated idempotent file in prisma/migrations-manual/ (CREATE INDEX CONCURRENTLY IF NOT EXISTS), run npx prisma generate, apply with scripts/dev/run-sql.mjs per the repo's schema-change protocol. While in there, add the sibling child-side FK indexes from the companion findings in one migration.
- **Pin it fixed**: Extend the schema-assertion style of src/lib/security-regressions.test.mjs: a unit test that reads prisma/schema.prisma and fails if Like lacks a postId-leading @@index. Orchestrator can confirm live read-only with EXPLAIN on `SELECT "postId", COUNT(*) FROM "Like" WHERE "postId" IN ('x') GROUP BY 1`
- **Validation**: The finding's factual core is fully verified. schema.prisma confirms every cited FK is unindexed: Like has only @@unique([userId, postId]) (:465), no postId index; Comment has only postId-leading indexes (:453-454), no parentId index; PollVote has only @@unique([userId, postId]) (:616) so pollOptionId (:608) and second-column postId are unindexed; PollOption (:596-604) has NO @@index at all; CommentLike has only @@unique([userId, commentId]) (:627); PhotoLove has only @@unique([userId, photoId])
- **Orchestrator note**: Uniques lead with userId so per-target counts seq-scan; Comment.parentId thread reads full-scan; Post.authorId profile reads full-scan. See CL-13 dossier.

### B-091 — [Medium] Place gazetteer search full-scans all 234,934 rows on every keystroke of 4+ chars: the altNames ILIKE arm in an OR defeats the expression index
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-103.

- **Files**: src/app/api/places/search/route.ts:99-120, prisma/migrations-manual/2026-07-18-round6.sql:30-31, prisma/schema.prisma:636
- **Expected**: Type-ahead city search stays on the two `lower(...) text_pattern_ops` expression indexes at every query length, so each keystroke costs single-digit milliseconds and the shared pooler never notices it.
- **Actual**: For queries of 4+ characters (i.e. most of every city name typed: "chen", "chenn", "chennai") the WHERE clause becomes `indexable-arm OR indexable-arm OR altNames ILIKE '%q%'`. Postgres can only use a BitmapOr when EVERY arm of an OR is indexable; `"altNames"` has no index of any kind (schema.prisma:636 is a bare `String?`, no migration creates one — verified across all of prisma/migrations-manual/), so the planner falls back to a sequential scan of the full 234,934-row Place table, evaluating `lower()` twice plus an ILIKE over a long comma-joined text column per row, per keystroke, per member.
- **Fix direction**: Two independent fixes, either sufficient: (1) add `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE INDEX ON "Place" USING gin ("altNames" gin_trgm_ops);` in a dated migrations-manual file and keep the query as-is (BitmapOr then works for all three arms); or (2) restructure so the OR never mixes indexable and non-indexable arms — run the two prefix arms first (indexed), and only if they return fewer than LIMIT 8 rows run the altNames contains query as a separate statement (or UNION ALL with per-arm LIMIT). Option 2 also cuts the common-case cost to zero extra. Keep the existing ORDER BY semantic
- **Pin it fixed**: After the fix, run `EXPLAIN SELECT id FROM "Place" WHERE lower("asciiName") LIKE 'chen%' OR lower("name") LIKE 'chen%' OR "altNames" ILIKE '%chen%'` via scripts/dev/run-sql.mjs and pin that the plan contains no `Seq Scan on "Place"`; add that EXPLAIN assertion as a script check so a future query edi
- **Validation**: The core mechanism is real. src/app/api/places/search/route.ts:99-109 folds `OR "altNames" ILIKE ${containsPattern} ESCAPE '\\'` into the WHERE for raw.length>=4. `altNames` has no index of any kind: prisma/schema.prisma:636 is a bare `altNames String?`, the only Place indexes are `@@index([asciiName])`/`@@index([name])` (schema:652-653), the live equivalents are expression btrees `lower("asciiName")`/`lower("name")` with text_pattern_ops (2026-07-18-round6.sql:30-31), and a grep for altNames/pg

### B-100 — [Medium] Every server-rendered date shows the UTC calendar day, not IST: anything timestamped 00:00-05:30 IST renders one day early, sitewide
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-322, W1-023.

- **Files**: src/lib/utils.ts:151, src/lib/utils.ts:21, src/app/(main)/letters/page.tsx:163, src/app/(main)/letters/[id]/page.tsx:188, src/components/messages/thread-list.tsx:70
- **Expected**: A letter published at 00:30 IST on 15 June shows "15 Jun 2026" — the valley's day is an IST day (the codebase already states this rule in src/lib/wordle.ts: "we ask for the IST date, because the valley's day is an IST day").
- **Actual**: formatDisplayDate is `new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })` with no timeZone option, and formatTimeAgo's >4-week fallback is `date.toLocaleDateString("en-IN", {...})` with no timeZone. Both are called from genuine React Server Components running in UTC on Vercel: letters/page.tsx line 163 `metaLine(batchLine(l.author), formatDisplayDate(l.createdAt))` and letters/[id]/page.tsx line 188 `date={formatDisplayDate(letter.createdAt)}` (neither file is "use client"). A letter created at 00:30 IST 15 June is 19:00 UTC 14 June, so the server renders "14 Jun 2026" for every viewer, permanently
- **Fix direction**: Add `timeZone: "Asia/Kolkata"` to the toLocaleDateString options in formatDisplayDate and in formatTimeAgo's date fallback in src/lib/utils.ts (matching the site-wide IST-day convention wordle.ts already documents). Note this also changes what client components render (post-card, collection-client currently show the viewer's local day); pinning IST everywhere is the consistent choice for a site whose members' shared frame is the valley's day — the alternative (leave client sites local, fix only server) reintroduces server/client disagreement and hydration-adjacent mismatch. One helper change f
- **Pin it fixed**: New unit test alongside the existing *.test.mjs suite: formatDisplayDate(new Date("2026-06-14T19:00:00Z")) === "15 Jun 2026", and the formatTimeAgo fallback for a 5-week-old date constructed at a UTC/IST day boundary. The visual suite letters baseline would also move.
- **Validation**: The mechanism is exactly as described and I could not refute it.

- src/lib/utils.ts:151-157 `formatDisplayDate` = `new Date(date).toLocaleDateString("en-GB", { day, month, year })` with NO timeZone option. Confirmed verbatim.
- src/lib/utils.ts:21-25 `formatTimeAgo` >4-week fallback = `date.toLocaleDateString("en-IN", {...})`, also no timeZone. Confirmed.
- With no timeZone arg, toLocaleDateString uses the runtime's default zone. Vercel serverless Node defaults to UTC and I found NO override: g
- **Orchestrator note**: formatDisplayDate/formatTimeAgo have no timeZone. Umbrella; per-surface instances in dates dossier.

### B-101 — [Medium] Admin analytics Rhythms heatmap applies AT TIME ZONE 'Asia/Kolkata' in the wrong direction, shifting every hour bucket by ~11 hours
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-002, W1-109.

- **Files**: src/lib/admin-analytics.ts:583, src/app/(main)/admin/analytics/page.tsx:452, src/components/admin/analytics/heatmap.tsx:75, prisma/schema.prisma:929
- **Expected**: The 7x24 heatmap and its "Busiest: <day> around <hour> IST" line show visits at their Indian wall-clock hour, since Visit.endedAt stores a UTC wall time in a `timestamp without time zone` column.
- **Actual**: The query applies `"endedAt" AT TIME ZONE 'Asia/Kolkata'` directly to a timestamp-without-time-zone. In Postgres that means "interpret this wall time AS Kolkata local", producing an instant 5h30 EARLIER in UTC; EXTRACT then reads it in the session timezone (UTC on Supabase). A 19:30-IST visit (stored 14:00 UTC wall) buckets at hour 8 instead of 19 — 11 hours off, with DOW shifting wrongly near midnight too. The peak hour the page tells the owner to schedule Catch-up email against is fiction.
- **Fix direction**: Change both EXTRACT expressions to `("endedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata'`. While there, apply the same double-conversion to any future raw-SQL IST bucketing; note loadRhythm is the only AT TIME ZONE use in the repo today (verified by grep).
- **Pin it fixed**: A unit test on the corrected SQL expression via a raw query fixture, or pin loadRhythm output for a synthetic Visit row at a known UTC instant.
- **Validation**: The technical claim is exactly right; I only adjust severity.

Column class confirmed: prisma/migrations-manual/2026-08-19-presence.sql:18 creates `"endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` — a timestamp WITHOUT time zone. schema.prisma:932 declares `endedAt DateTime @default(now())` with no `@db.Timestamptz`, matching. No migration alters Visit.endedAt to timestamptz (grep found only an unrelated `updatedAt` conversion in 2026-08-03-demo-purge-and-drift.sql). docs/planning/bugs
- **Orchestrator note**: Double-conversion / wrong direction on a timestamp-without-tz column.

### B-110 — [Medium] Onboarding updateProfile action validates nothing: seven profile columns writable with no length caps up to the 25MB action limit
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-232.

- **Files**: src/app/(auth)/onboarding/actions.ts:6, src/app/(auth)/onboarding/page.tsx:52, next.config.ts:112
- **Expected**: Every write path to a profile column enforces the same caps profileSchema does (bio 1000, currentCity 100, workplace 100, jobTitle 100, phone 24, instagram 100, linkedin 200), because the server, not a maxLength attribute, is the guard.
- **Actual**: The /onboarding page's server action writes bio, currentCity, workplace, jobTitle, phone, instagram, linkedin with zero validation — no Zod, no length caps, no phone normalization, nothing but a trim. The page's own <textarea maxLength={1000}> is the only cap, and it is client-side. With serverActions.bodySizeLimit raised to "25mb" (next.config.ts:112, for photo uploads), a signed-in account can POST a multi-megabyte bio or currentCity directly to this action.
- **Fix direction**: Run the collected fields through the corresponding subset of profileSchema (or a local zod object with identical caps) before the update; run phone through normalizePhone; alternatively delete this legacy action/page if the /welcome wizard (components/onboarding) has superseded it — verify with the owner which onboarding surface ships.
- **Pin it fixed**: Extend src/lib/gate-coverage.test.mjs (or add a validation-coverage test) asserting every "use server" file that writes User columns imports a validator; minimally a unit test calling updateProfile with an oversized field and asserting an error.
- **Validation**: The core technical claim is fully accurate. src/app/(auth)/onboarding/actions.ts:6-30 (read in full) does exactly what the finder quotes: it takes seven fields (bio, currentCity, workplace, jobTitle, phone, instagram, linkedin), does `value.trim()` and nothing else, then `prisma.user.update({ where: { id: session.user.id }, data })`. No Zod, no `.max()`, no `normalizePhone`, no import of validators. The only auth is `if (!session?.user?.id)`. next.config.ts:111-112 confirms serverActions.bodySiz

### B-111 — [Medium] updateUserPlaces and adminUpdatePlaces have no schema: unbounded label/city strings and lat/lng, FK crash on bogus placeId
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-233.

- **Files**: src/components/settings/actions.ts:144, src/app/(main)/admin/people/actions.ts:132, src/components/onboarding/actions.ts:22
- **Expected**: The same placeSchema the onboarding wizard already has (label/city trimmed, 1..160 chars; placeId int-or-null; lat/lng bounded) applied to both bulk city writers, since UserPlace.label mirrors into User.currentCity and renders on the directory for every member.
- **Actual**: Both actions accept the places array on faith: no length cap on label/city (25MB possible per the action body limit), no numeric bounds or type check on lat/lng, no existence/int check on placeId, and .map(p => p.label.trim()) throws a raw TypeError on any non-string payload. cleaned[0].label is mirrored into User.currentCity, which the directory serializes for every viewer; lat/lng feed the alumni map's cluster math.
- **Fix direction**: Export placeSchema from components/onboarding/actions (or move to validators.ts), and in both actions parse `z.array(placeSchema).max(30)` before any .map; add lat -90..90 / lng -180..180 bounds and Number.isFinite; on placeId either verify existence (findMany in) or null it on FK failure.
- **Pin it fixed**: Unit test feeding oversized label / non-finite lat / unknown placeId to the (extracted) validation and asserting refusal; visual suite would catch the directory blowup after the fact.
- **Validation**: Every factual premise checks out. updateUserPlaces (src/components/settings/actions.ts:150-181) accepts the places array with only auth() in front of it and no Zod: the map does `label: titleCase(p.label.trim())` and `city: titleCase(p.city.trim())`, the ONLY cap is `.slice(0, 30)` on row count (line 159), lat/lng are copied through unbounded/untyped, placeId is written straight into `placeId: p.placeId ?? null`, and there is no try/catch around the `prisma.$transaction` (lines 162-181). adminUp

### B-120 — [Medium] The notification bell badge is frozen for the whole browsing session: (main) layout computes unreadCount only on hard loads; badge only ever falls
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-124.

- **Files**: src/app/(main)/layout.tsx:35, src/components/layout/notification-bell.tsx:98, src/components/layout/notification-bell.tsx:110, src/components/layout/notification-bell.tsx:140
- **Expected**: The bell badge reflects unread notifications with reasonable freshness: it rises when a like/comment/catch-up notification arrives during a session (the component even ships a shake animation for exactly that: 'Shakes the bell when the unread count RISES'), and falls when notifications are read on another device or tab.
- **Actual**: Three compounding facts make the badge correct only at the moment of a full page load. (1) unreadCount is computed in the (main) layout, and shared layouts are not re-rendered on soft navigation (staleTimes doc: 'shared layouts won't automatically be refetched on every navigation, only the page segment that changes'), so browsing feed→directory→letters never recomputes it. (2) Even when the layout IS re-rendered server-side (any server action that calls revalidatePath re-renders the full current route), `useState(initialUnreadCount)` only reads the prop at mount — the persistent sidebar/mobile-band bell instance never takes the new value. (3)
- **Fix direction**: Have the bell own its count: on mount and on a modest interval (or at least on every dropdown open and on window focus), fetch the unread count via the existing getNotifications action (add a count to its return) and setUnreadCount from the server value. That single change fixes the frozen badge, the cross-device case, the panel/badge disagreement, and resurrects the shake animation. Optionally also sync state from initialUnreadCount when the prop changes (an effect comparing prop to a ref) so action-triggered layout re-renders propagate.
- **Pin it fixed**: Playwright: sign in, mark all read via a direct server call, poll the badge geometry/count to assert it clears without a reload; and the inverse (insert a notification row, assert the badge appears within the refresh interval).
- **Validation**: Core mechanism is real and verified. notification-bell.tsx:98 useState(initialUnreadCount) reads the prop only at mount; the only effect (109-115) watches the unreadCount STATE, not the initialUnreadCount PROP, so nothing syncs a changed prop into a persistent instance's state. setUnreadCount is called in exactly two places: line 166 Math.max(0, c - 1) and line 176 zero, both decrements, so the count never rises after mount. handleOpen (134-145) refreshes notifications/nextCursor/hasMore/loaded

### B-122 — [Medium] 'Most loved' collection sort has no deterministic tiebreaker: offset pagination duplicates and drops photos, and produces duplicate React keys
**Status: Confirmed** (high confidence) (finder rated High; validation adjusted to Medium). Raw finders: W1-076.

- **Files**: src/app/(main)/collection/actions.ts:466, src/app/(main)/collection/actions.ts:473, src/components/collection/collection-client.tsx:400
- **Expected**: Sorting by "Most loved" and pressing Load more walks the collection exactly once: every approved photo appears once across pages.
- **Actual**: Rows tied on love count (which is almost all of them: most photos have 0-2 loves) are returned in arbitrary, non-stable order per query. Page 2 (skip 24) re-runs the sort and can return rows already shown on page 1 and omit others. The client appends with setPhotos(prev => [...prev, ...data.photos]) keyed by key={p.id}, so duplicates also collide as React keys.
- **Fix direction**: Add a secondary deterministic key to every orderBy in loadPhotos, e.g. orderBy: [{ loves: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }] (and [{ createdAt }, { id }] for newest/oldest). Optionally dedupe by id in handleLoadMore as a belt (`const seen = new Set(prev.map(p=>p.id))`).
- **Pin it fixed**: New unit/e2e test: seed 25+ photos with equal love counts, fetch page 0 and page 1 via loadPhotos({sortBy:"loved"}), assert the id sets are disjoint and their union covers take*2 distinct rows.
- **Validation**: Path note: actions.ts lives at src/app/(main)/collection/actions.ts (parentheses stripped in linesChecked to avoid a parse issue). Every premise verified against the real code. actions.ts:466-471 builds orderBy for "loved" as exactly `{ loves: { _count: "desc" as const } }` with no secondary/unique tiebreaker. actions.ts:473-486 paginates with `take: PAGE_SIZE + 1, skip: page * PAGE_SIZE` (PAGE_SIZE=24 at line 32); each page is an independent query. Only "wander" is special-cased to one page (ha

### B-050 — [Fix per owner decision] Profile email control: clearing must show nothing (not fall back to the sign-in email), and members can set a custom display email
**Status: Confirmed** (finder rated High; validation adjusted to Low; **owner has decided to FIX it** — treat as a real Medium-priority fix, not a Low). Raw finders: W1-277.

- **OWNER DECISION (2026-08-21)**: implement fix-direction option (b). A member can (i) set a
  **custom display email** different from their sign-in address, or (ii) **clear it to show no email
  at all** — and clearing must display *nothing*, never the private sign-in address. Default stays
  "show" as today. The sign-in email itself is unchanged; this only controls what the profile
  displays.

- **Files**: src/app/(main)/profile/[id]/page.tsx:177, src/components/profile/contacts-editor.tsx:94, src/components/profile/contacts-editor.tsx:126, src/components/profile/profile-actions.ts:229
- **Expected**: The email row in 'Reaching you' carries the same remove affordance as every other row; removing it should stop the profile from offering an email address (or the row should not offer removal at all).
- **Actual**: Removing the email row (even when the stale-closure bug above doesn't intervene) writes displayEmail=null, after which the profile serves the member's LOGIN email to every Stage-2 viewer: page.tsx:177 `const contactEmail = user.displayEmail?.trim() || user.email;`. On next edit, buildRows (contacts-editor.tsx:126-127: `if (source.displayEmail || source.email) rows.push({ ... value: source.displayEmail || source.email })`) re-seeds the row from the account email, so the 'removed' row reappears. The X on the email row is a no-op that looks like a privacy control.
- **Fix direction**: Decide the contract and make the UI honest. Either (a) email is mandatory on the sheet: drop the X on the email row (kind === "email" renders no remove button) so the affordance stops lying; or (b) support hiding: add an explicit empty-state for displayEmail (e.g. a sentinel or a showEmail boolean) that suppresses the fallback in page.tsx:177 and in the vCard, and stop buildRows re-seeding from source.email when the member explicitly cleared it.
- **Pin it fixed**: Component test: buildRows/rowsToPayload round-trip with the email row removed must not resurrect an email. E2E: remove email row, reload, assert Get in touch shows no email (or assert the X is absent, per the chosen contract).
- **Validation**: Two independent refuters split. Refuter A: REFUTED the High 'private sign-in email leaks' framing — contactEmail is gated behind maySeeContacts (own-profile OR Stage-2-verified alumni via viewerMaySeeContacts), so it never reaches the public or unverified members; showing an alumni email to verified alumni is the intended 'Get in touch' feature. Refuter B: CONFIRMED-ADJUSTED->Medium the mechanism (page.tsx:177 contactEmail = displayEmail?.trim() || user.email falls back to the sign-in address, f
- **Orchestrator note**: profile page falls back to user.email when displayEmail is null.

### B-063 — [Fix + feature per owner decision] Members can leave a Catch-up; and can archive/delete one (30-day recently-deleted)
**Status: Confirmed** (finder rated High; validation adjusted to Low; **owner has expanded this into a feature** — see decision). Raw finders: W1-061.

- **OWNER DECISION (2026-08-21)** — build all of: (1) **Leave a Catch-up** (the finding's fix
  below); (2) **Archive** a Catch-up; (3) **Delete** a Catch-up, where delete is a **soft delete
  into a "Recently deleted" area that holds it for 30 days** and is restorable, then purged.
  **UI**: keep the archive/delete affordances **compact under `/catchups`, hidden entirely when the
  member has none** (no dead buttons); a clean "are you sure" confirmation on delete. **Dependency:
  build this on top of the B-001 fix** — the ownership cascade must be corrected first, or
  deleting/archiving a Catch-up would still cascade-destroy every member's answers. Soft-delete +
  recently-deleted also gives a natural safety net for the cascade Critical.

- **Files**: src/app/(main)/catchups/actions.ts:1355, src/lib/catchups-notify.ts:82, src/lib/catchups-notify.ts:142, src/app/(main)/catchups/actions.ts:420
- **Expected**: Someone enrolled in a Catch-up (they never accepted an invite; createCatchupWithPeople and addCatchupMembers enrol up to 100 people without consent) can remove themselves, or at minimum silence it completely.
- **Actual**: The only membership-removal path is removeCatchupMember, which is Keeper-only (loadKeeperScope) and explicitly refuses self-removal ('You cannot remove yourself.'); no leave/exit action exists anywhere in the feature (the only groupMember.deleteMany in the app is that Keeper action). The reminder pref 'off' silences only the daily catchup_reminder, and even that is bypassed by Keeper nudges (bypassOff); catchup_questions_open, catchup_answers_open and catchup_published go to ALL group members unconditionally, every cycle, on a recurring cadence, forever. So a member who wants out of a monthly catch-up they were added to must personally ask a 
- **Fix direction**: Add a leaveCatchup(catchupId) server action: auth + membership check, refuse only when the caller is the creator (offer end/handover instead), delete own GroupMember row and own pending catchup notifications, revalidate. Surface it in PeoplePanel ('Leave this Catch-up'). Optionally make questions_open/answers_open/published respect reminderMode 'off' as a full mute.
- **Pin it fixed**: Unit test on the new action (member can leave; creator refused; notifications cleared); e2e: leave, assert home shows the not-member card.
- **Validation**: Every code fact in the finding is accurate:
- No self-service leave exists. The only application-code groupMember delete outside the demo seed is removeCatchupMember (actions.ts:1360), which is gated by loadKeeperScope (Keeper-only) and refuses self-removal: `if (userId === session.user.id) return { error: "You cannot remove yourself." };` (actions.ts:1355). A grep across src/ confirms no leaveCatchup/exit/self-removal path.
- The `off` reminder pref (setReminderPref, actions.ts:1425; CatchupPre

## 3.N — Net-new from the completeness pass (surfaces no finder cited)

The completeness critic swept the ~257 files no finder had cited and the specific taxonomy rows at
risk of being under-examined. It came back **essentially dry** — the overwhelming result was
*examined-clean* (see §5), which independently corroborates that the 355 finder findings covered the
ground. It surfaced these net-new items:

### B-200 — [Low] Admin message inbox is a fixed `take: 60` with no pagination and no thread search
**Status: Confirmed** (completeness pass). Distinct from the tracked "unbounded per-thread message
load" (Medium list) and the "silent hard caps" note — neither names the moderation inbox.
- **Files**: src/app/(main)/admin/messages/page.tsx:22-24, src/app/(main)/messages/page.tsx:32
- **Actual**: `prisma.adminThread.findMany({ orderBy: [{ adminUnread: "desc" }, { lastMessageAt:
  "desc" }], take: 60 })` with no cursor, no "load more", and (unlike /admin/content) no search over
  threads. AdminThread accumulates for the app's whole life across all members (every bug/idea/
  message thread + admin notices + report threads), so >60 rows arrives within weeks. Unread work
  floats up via `adminUnread desc` so nothing waiting is hidden, but every read/closed thread past
  position 60 becomes permanently unreachable from the moderation surface.
- **Fix direction**: Add keyset pagination (lastMessageAt, id) + "load more" to the admin inbox, or a
  thread search over member name/subject — the same treatment /admin/content already gives
  posts/comments/photos. At minimum surface a total count so the admin knows threads are hidden.
- **Taxonomy**: 6j silent hard cap with no pagination (admin moderation surface).

### B-201 — [Low] AdminThread unread-flag lost update on exactly-simultaneous member+admin reply
**Status: Confirmed** (completeness pass; trivial impact, named so it is not assumed-covered).
- **Files**: src/app/(main)/messages/actions.ts:141-149 (replyToThread),
  src/app/(main)/messages/actions.ts:187-195 (adminReplyToThread)
- **Actual**: both reply paths do an unconditional full-row update to `memberUnread`/`adminUnread`.
  If a member reply and an admin reply commit within the same ~10ms window and the member's
  transaction lands last, the admin's just-added reply can lose the member's unread dot (the message
  is still visible on open; only the badge is lost). This is a genuine lost-update the round-1
  coverage note did not cover (that note only addressed member-READ vs admin-reply via the
  conditional-updateMany argument).
- **Fix direction**: Set the *other* side's unread flag with a targeted conditional update rather
  than a full-row overwrite, or bump only the specific boolean in an `updateMany` guarded by thread
  id. Trivial priority — a 1-2 admin community makes the exact collision astronomically rare.
- **Taxonomy**: 6i two-surfaces-one-row lost update.

## 3.M — Medium findings (clustered; confirmed-in-code by finders, orchestrator-reviewed)

Each row is a distinct root. `W1-xxx` point to the full evidence in `docs/planning/audits/wave1/*.json`. Grouped by area.

| ID | Finding | Primary file | Constituent |
|---|---|---|---|
| M01 | Report dismiss/resolve no status precondition (double-click/two-admins duplicate+contradictory) | src/components/profile/admin-actions.ts:167 | W1-004 |
| M02 | adminMergeUsers wholesale abort when both accounts answered same prompt (CatchupEntry unique) | src/app/(main)/admin/people/actions.ts:296 | W1-007, W1-066 |
| M03 | Test-mode Razorpay money counted as real (person page sum, support funnel) | src/app/(main)/admin/people/[id]/page.tsx:64 | W1-006, W1-351, W1-352 |
| M04 | Worklist queues sort/timestamp on User.updatedAt, polluted by 15-min presence writes | src/lib/admin-worklist-query.ts:63 | W1-003 |
| M05 | One error boundary for whole app — any widget throw unmounts the entire shell | src/app/error.tsx:1 | W1-027 |
| M06 | Five async DB routes ship no loading.tsx (zero feedback during auth+DB round trip) | src/app/(main)/letters/[id]/page.tsx:60 | W1-028 |
| M07 | Turnstile blocked/erroring client-side bricks sign-in permanently (dead latch, misleading copy) | src/lib/turnstile.ts:86 | W1-093, W1-335, W1-036 |
| M08 | Changing cadence doesn't reschedule an already-set nextOpensAt | src/app/(main)/catchups/actions.ts:564 | W1-046 |
| M09 | Catch-up engine failure swallowed to console.error, Sentry blind, member sees nothing | src/lib/catchups.ts:885-888 | W1-048 |
| M10 | Anonymous question askers unmasked to Keepers in published Rounds, no cue | src/app/(main)/catchups/round/[editionId]/page.tsx:295 | W1-062 |
| M11 | Answering marks 'shared'/shows completion card even when the save failed | src/components/catchups/answer/answer-experience.tsx:104 | W1-065 |
| M12 | 'Everyone from my batch' can exceed the 100-person create cap, submission then fails flat | src/components/catchups/create/people-picker.tsx:103 | W1-067 |
| M13 | Catch-up home archive N+1 fetches every entry body of every published Round on each view | src/app/(main)/catchups/[catchupId]/page.tsx:374 | W1-064, W1-142 |
| M14 | Orphaned R2 objects — abandoned presign, staging/, refusal paths skip cleanup, no sweep | src/app/(main)/collection/actions.ts:271 | W1-077, W1-095, W1-166, W1-180 |
| M15 | Animated GIFs silently flattened to first frame by every server encode path | src/lib/image.ts:27 | W1-080 |
| M16 | contributePhotoDirect re-encodes up to 100MP originals at full res (timeout/memory) | src/app/(main)/collection/actions.ts:345 | W1-083, W1-167 |
| M17 | deletePost/deleteDraft/declinePhoto delete R2 bytes BEFORE the row (inverts stated invariant) | src/app/(main)/feed/actions.ts:336 | W1-085, W1-174, W1-217 |
| M18 | DB outage during login shown as 'Invalid email or password' → doomed reset loop | src/app/(auth)/login/login-client.tsx:385-398 | W1-096 |
| M19 | Production images served from throttled pub-*.r2.dev via plain <img> | src/components/posts/post-card.tsx:366-378 | W1-099 |
| M20 | sendMail no timeout + layout blocks render on Resend for unconfirmed members | src/lib/email.ts:180-200 | W1-100, W1-106, W1-126, W1-165, W1-175, W1-272 |
| M21 | No connect/query/statement/pool-checkout timeout at any layer | src/lib/prisma.ts:16 | W1-105 |
| M22 | Root layout awaits theme cookie → every route dynamic, landing not static as promised | src/app/layout.tsx:68 | W1-125, W1-339 |
| M23 | Unvalidated numeric directory params reach Prisma as NaN → whole page 500s | src/app/(main)/directory/where.ts:28 | W1-127, W1-179, W1-194, W1-234 |
| M24 | touchLastSeen fires only on layout render → soft navigations uncounted | src/app/(main)/layout.tsx:51 | W1-129 |
| M25 | SearchLog keystroke dedupe doesn't dedupe (each prefix distinct) | src/lib/search-log.ts:29 | W1-144 |
| M26 | adminSetRole last-admin guard check-then-act → two demotions → zero admins | src/app/(main)/admin/people/actions.ts:216 | W1-153 |
| M27 | payment.failed branch check-then-update can overwrite a concurrent 'paid' | src/app/api/razorpay/webhook/route.ts:59 | W1-154 |
| M28 | createComment never verifies parentId belongs to postId (cross-thread reply, count inflation) | src/app/(main)/feed/actions.ts:581 | W1-213 |
| M29 | Post reports have no per-(reporter,post) dedupe | src/components/posts/report-action.ts:90 | W1-216 |
| M30 | Own city-scoped post vanishes from own feed (list queries lack author self-exemption) | src/app/(main)/feed/actions.ts:820 | W1-220 |
| M31 | Letter reading page + generateMetadata skip the targetBatches visibility check | src/app/(main)/letters/[id]/page.tsx:96 | W1-221 |
| M32 | Unverified members cannot save letter drafts (contradicts documented intent) | src/app/(main)/feed/actions.ts:56 | W1-222 |
| M33 | Re-like mints a fresh notification every time, un-rate-limited → bell spam | src/app/(main)/feed/actions.ts:465 | W1-223 |
| M34 | Account purge hard-deletes comments, silently promoting replies to top-level | src/lib/account-purge.ts:99 | W1-224 |
| M35 | createPost/createComment have no unique guard and thin double-submit protection | src/components/posts/comments-section.tsx:181 | W1-225 |
| M36 | Load-more stale page appended under new filter, adopts old cursor | src/components/directory/directory-client.tsx:133 | W1-198, W1-302 |
| M37 | Load-more no error handling (button stuck 'Loading...') | src/components/directory/directory-client.tsx:133 | W1-199, W1-219 |
| M38 | 'Batch: newest first' lists no-batch members first (Postgres DESC NULLS FIRST) + keyset skips them | src/app/(main)/directory/where.ts:94 | W1-200 |
| M39 | Keyset load-more silently truncates when the cursor row was deleted | src/app/(main)/directory/actions.ts:65 | W1-201, W1-215 |
| M40 | LocationPicker silently converts to free-typed coordinate-less on /api/places failure | src/components/common/location-picker.tsx:155 | W1-202 |
| M41 | normalizeHouse resolves via prototype chain (constructor/toString/valueOf 'match') | src/lib/houses.ts:92 | W1-323 |
| M42 | PostHog identify never fires on full page load into a (main) route | src/components/analytics/posthog-identify.tsx:32 | W1-324 |
| M43 | postSchema.targetBatches no cap/format, stored raw, LIKE-scanned by every feed query | src/lib/validators.ts:159 | W1-236, W1-326 |
| M44 | users/search builds one AND-clause per whitespace token, unbounded query | src/app/api/users/search/route.ts:30 | W1-237 |
| M45 | Whitespace-only display name passes schema, titleCase collapses to empty | src/lib/validators.ts:54 | W1-238 |
| M46 | /notice/[id] legacy resolver non-idempotent → duplicate admin threads | src/app/(main)/notice/[id]/page.tsx:41 | W1-256 |
| M47 | Letters index truncates at 40 with no pagination | src/app/(main)/letters/page.tsx:61 | W1-257 |
| M48 | /api/account/export streams entire history in one unbounded JSON | src/app/api/account/export/route.ts:87 | W1-287 |
| M49 | deletion-cancelled notification links to /settings (dead route) | src/lib/auth.ts:191 | W1-286 |
| M50 | email-queue claim not scoped → duplicate sends past the 2-min stale window | src/lib/email-queue.ts:101 | W1-268, W1-269 |
| M51 | resendVerification maps 'failed'→'imminent' → banner lies after terminal failure | src/components/auth/email-actions.ts:78-88 | W1-270 |
| M52 | Failed sends consume token-mint rate limit → real resend blocked | src/lib/email-queue.ts:400-409 | W1-271 |
| M53 | sendMail EMAIL_DEV_SEND marks real members' queued mail as sent in dev (shared DB) | src/lib/email.ts:150-178 | W1-267 |
| M54 | Retention-sweep step failures invisible to nightly alarm (route answers 200) | src/lib/retention.ts:63 | W1-314 |
| M55 | Contradictory notification retention (prune.mjs 30d vs retention.ts age) | scripts/ops/prune.mjs:23 | W1-313 |
| M56 | Checkout script retry broken after one failed load (dead <script> latch) | src/components/support/support-contribute.tsx:71 | W1-347 |
| M57 | startContribution has no rate limit (unbounded orders/rows) | src/app/(main)/support/actions.ts:53 | W1-348 |
| M58 | Refunds/disputes invisible — no webhook, no status | src/app/api/razorpay/webhook/route.ts:55 | W1-349 |
| M59 | Webhook signature reject answers 400 → Razorpay auto-disables the endpoint | src/app/api/razorpay/webhook/route.ts:36 | W1-350 |
| M60 | /pick-bird 500s without Razorpay keys (razorpayLivemode throws at module scope) | src/app/(main)/pick-bird/page.tsx:33 | W1-354 |
| M61 | Demo reset leaves world half-written, can sign concurrent visitors out to dead /login | src/lib/demo-seed/seed.ts:72 | W1-187 |
| M62 | Demo tells visitors to change bird via species picker, which refuses | src/components/settings/actions.ts:191 | W1-188 |
| M63 | /welcome (real onboarding) renders in demo, not in DEMO_CLOSED_PATHS | src/lib/demo.ts:255 | W1-189 |
| M64 | City autocomplete dead throughout demo (/api/places closed, empty gazetteer) | src/proxy.ts:61 | W1-190 |
| M65 | Admin client wrappers await actions with no try/catch; several actions throw | src/components/admin/people/person-detail.tsx:128 | W1-005 |
| M66 | Two tabs/devices editing one draft silently clobber (last-write-wins) | src/components/posts/create-post-form.tsx:209 | W1-253 |
| M67 | Catch-up reorder/remove stale-props read-modify-write, no pending guard | src/components/catchups/home/console-collecting.tsx:236 | W1-304 |
| M68 | Profile field save stamps 'already saved' before success → failed save cannot be retried | src/components/profile/letterhead-profile.tsx:392 | W1-282, W1-306 |

_68 Medium roots._

### Medium/Low instances folded as notes under a High finding
- note under B-011/B-093: W1-008,W1-094,W1-279,W1-315,W1-010 (purge/sweep unbounded R2, telemetry growth)
- note under B-030: W1-082,W1-107,W1-163,W1-164,W1-285 (more 4.5MB instances)
- note under B-090: W1-137,W1-138,W1-139,W1-140,W1-141,W1-218 (missing-index instances)
- note under B-100: W1-009,W1-047,W1-063,W1-081,W1-110..114,W1-130,W1-249,W1-303,W1-097,W1-172,W1-214 (IST date instances)
- note under B-042: W1-024,W1-078,W1-199,W1-219,W1-284,W1-334 (client no-catch instances)
- note under B-002/B-070/B-071/B-072: email-queue mediums W1-145,W1-176
- note under B-120: W1-025,W1-129,W1-251,W1-301 (bell badge desync instances)
- note under B-020: W1-098,W1-177,W1-337 (dup batch-group instances → B-121)
- note under fire-and-forget (make B-093 sibling or its own): W1-026,W1-037,W1-128,W1-143,W1-162,W1-316,W1-325

## 3.L — Low appendix (cosmetic-with-teeth; not individually validated)

117 finder-rated Low items, confirmed-in-code with cites, spanning the same clusters as the higher tiers (extra IST-date surfaces, more fire-and-forget telemetry sites, more missing-index columns, small copy/date/link nits). Listed compactly; open the cited file or the raw finding in `wave1/*.json` for detail. Two were promoted to canonical: **B-050** (profile email fallback) and **B-063** (can't leave a Catch-up).

| # | Finding | File |
|---|---|---|
| 1 | adminSetRole's last-admin check is a read-then-write outside the transaction: two concurrent demotions can still leave zero admins | src/app/(main)/admin/people/actions.ts:216 |
| 2 | adminUpdatePlaces and the member's own updateUserPlaces are identical wipe-and-recreate transactions with no unique constraint: a  | src/app/(main)/admin/people/actions.ts:150 |
| 3 | purgeUserAccount collects image URLs before the delete transaction: anything the member uploads in between is cascaded away as row | src/lib/account-purge.ts:89 |
| 4 | retryMail accepts rows in status 'sending': a stale failed-list plus an impatient second retry can double-send a real email | src/app/(main)/admin/mail/actions.ts:33 |
| 5 | Verify has no in-flight guard in the People list and creates a notification unconditionally: double-fire sends the member duplicat | src/components/admin/people/people-list.tsx:119 |
| 6 | Both admin UIs hard-code verifyMethod 'office_list', so a manual admin verification is recorded and displayed as an office-roster  | src/components/admin/people/people-list.tsx:120 |
| 7 | The rail's 'waiting' count and the Overview worklist stop agreeing beyond 20 items in any queue — the exact drift the code declare | src/lib/admin.ts:110 |
| 8 | Support page's 'Did not go through' tile counts test-mode rows and is silently windowed to the last 100 contributions, contradicti | src/app/(main)/admin/support/page.tsx:59 |
| 9 | Admin nav still describes Analytics as 'Not built yet.' although the nine-view analytics room shipped | src/components/admin/admin-nav.ts:122 |
| 10 | The bird-override field accepts any string and saves it silently: a misspelled slug 'succeeds' while changing nothing, with no fee | src/app/(main)/admin/people/actions.ts:103 |
| 11 | Catch-ups page tells the admin that opening a stuck Catch-up 'is usually enough to nudge it along', but the advance is membership- | src/app/(main)/admin/catchups/page.tsx:158 |
| 12 | People 'Show more' silently ends when the cursor row was deleted: the rest of the list becomes unreachable until reload | src/lib/admin-people-query.ts:65 |
| 13 | MascotFlightLayer: a second launch while a flight is live shares abortRef/rafRef/ranId with the first — the first flight's failsaf | src/components/mascot/mascot-flight-layer.tsx:202 |
| 14 | generateMetadata re-runs the page's full permission-checked fetch with no React cache(), doubling DB round trips (up to 6 queries  | src/app/(main)/letters/[id]/page.tsx:24 |
| 15 | AppShell reserves 64px of bottom padding on mobile for a "fixed bottom tab bar" that does not exist on the real site | src/components/layout/app-shell.tsx:58 |
| 16 | ImageViewer's Download button silently degrades to open-in-new-tab in production because the R2 public host fetch is cross-origin  | src/components/common/image-viewer.tsx:180 |
| 17 | Mid-tour navigation leaves the spotlight measuring a detached element: the dim overlay collapses to a zero-rect pinhole at the vie | src/components/tour/tour-spotlight.tsx:40 |
| 18 | A database error during sign-in surfaces as 'Invalid email or password.', sending members with correct passwords into a doomed res | src/app/(auth)/login/login-client.tsx:391 |
| 19 | The deletion-scheduled email renders the purge date in server UTC (toLocaleDateString with no timeZone), so IST members deleting b | src/components/settings/actions.ts:344 |
| 20 | requestVerification ignores the conditional updateMany count, so two simultaneous requests both notify the admins; and the delete- | src/components/auth/verification-actions.ts:52 |
| 21 | Signup derives batchType from an unvalidated (yearLeft, batchYear) pair: batchTypeFromLeaving happily returns 'ISC' for impossible | src/lib/utils.ts:250 |
| 22 | confirmEmailToken and resetPassword burn the single-use token before applying its effect, outside any transaction: a crash or DB e | src/components/auth/email-actions.ts:104 |
| 23 | Reminder compare-and-swap omits the status guard, so a daily reminder can fire just after the Round closed or was closed by the Ke | src/lib/catchups.ts:826-833 |
| 24 | The (main) layout comment claims the Catch-up advance cannot hold up page render, but it is awaited in the render-blocking Promise | src/app/(main)/layout.tsx:31-52 |
| 25 | void recordView on the Round page (and three sibling pages) is a fire-and-forget DB write that serverless may kill after the respo | src/app/(main)/catchups/round/[editionId]/page.tsx:193-194 |
| 26 | toggleEntryLove races surface a raw 'Something went wrong' on double-click, and notifyLove's check-then-insert can double-notify | src/app/(main)/catchups/actions.ts:1213-1233 |
| 27 | submitPrompt assigns position by count outside any transaction: concurrent submissions get duplicate positions and an unstable que | src/app/(main)/catchups/actions.ts:707-725 |
| 28 | 'Answers close today' is a 24-hour-window claim wearing calendar-day words: it shows a day early for deadlines that fall tomorrow  | src/app/(main)/catchups/[catchupId]/answer/page.tsx:56-63 |
| 29 | createCatchupWithPeople has no server-side idempotency: a duplicated invocation mints two whole Catch-ups and double-notifies up t | src/app/(main)/catchups/actions.ts:441-475 |
| 30 | Client components format Catch-up dates during SSR with server timezone/locale, guaranteeing hydration mismatches around IST midni | src/components/catchups/home/console-published.tsx:30-46 |
| 31 | A member removed from a Catch-up keeps dead 'ready to read' notifications, and the round reader gives them (and any non-member) a  | src/app/(main)/catchups/actions.ts:1366 |
| 32 | Rapid double-click on the love heart can strand the UI out of sync with the database and surface 'Something went wrong' for a beni | src/app/(main)/catchups/actions.ts:1213 |
| 33 | Invite flow dead-ends for brand-new signups at the Stage-2 gate with a message about 'posting', and the invite context is lost by  | src/app/catchups/join/[token]/page.tsx:139 |
| 34 | Concurrent question submissions produce duplicate positions and can overshoot the 40-question ceiling (count-then-insert TOCTOU) | src/app/(main)/catchups/actions.ts:707 |
| 35 | recordView on the round reader is fire-and-forget during a serverless render, so round-view telemetry is silently lossy in product | src/app/(main)/catchups/round/[editionId]/page.tsx:194 |
| 36 | A member who erases their answer still publishes as an empty card and is counted in 'N of the group wrote in'; there is no way to  | src/app/(main)/catchups/actions.ts:1160 |
| 37 | Autosave has no ordering guarantee: a slow earlier save can overwrite a newer one after the member saw 'Saved' | src/components/catchups/answer/answer-experience.tsx:93 |
| 38 | Teasers slice raw markdown mid-character: formatting markers print verbatim and a cut inside an emoji/surrogate pair renders a bro | src/app/(main)/catchups/page.tsx:55 |
| 39 | Photo.uploaderId and PhotoLove.photoId have no index: every /collection visit and every contribution runs sequential scans on the  | prisma/schema.prisma:176 |
| 40 | Two small date traps: photoYear's max is frozen at module load in UTC (New-Year IST rejections of a valid year), and eraFromYear b | src/lib/validators.ts:188 |
| 41 | Blank-MIME image files (a mobile-browser quirk the codebase itself documents and accommodates elsewhere) dead-end: the contribute  | src/components/collection/contribute-dialog.tsx:85 |
| 42 | R2/network failures during upload are blamed on the member's photo ('try a different one'), the misleading generic branch of descr | src/lib/upload-shared.ts:96-108 |
| 43 | GitHub Actions disables scheduled workflows after 60 days of repository inactivity — the nightly retention sweep and 60-day accoun | .github/workflows/retention.yml:17-20 |
| 44 | Nine fire-and-forget database writes rely on post-response execution without after()/waitUntil, so on serverless they are stochast | src/app/api/places/search/route.ts:127 |
| 45 | Member messages surfaces show UTC dates for messages older than 4 weeks (formatTimeAgo fallback, server-rendered) | src/components/messages/thread-list.tsx:70 |
| 46 | Admin aggregates bucket days and months at UTC boundaries (5:30 IST shift): 'Given this month', distinct-day loyalty, daysActive,  | src/app/(main)/admin/page.tsx:63 |
| 47 | Deletion-scheduled email names a purge date formatted in UTC — one day earlier than the IST purge day for late-night requests | src/components/settings/actions.ts:344 |
| 48 | Feed time filter ('today'/'week'/'month'/'year') computes boundaries in server UTC — latent, since the filter UI is currently unre | src/app/(main)/feed/actions.ts:742 |
| 49 | SSR'd client components format dates without a hydration guard — recoverable hydration errors and a wrong-date/wrong-format flash | src/components/catchups/home/extend-deadline-card.tsx:48 |
| 50 | Zod year ceilings snapshot getFullYear() at module load in server TZ — rejects the new year for 5.5 IST hours (longer on a warm la | src/lib/validators.ts:22 |
| 51 | Nightly PostHog snapshot queries a UTC day 3 hours before it ends — every day's posthog.* metrics permanently undercount | .github/workflows/snapshot.yml:16 |
| 52 | Clicking a notification whose row was pruned or deleted does nothing: markNotificationRead throws P2025 and the navigation never r | src/app/(main)/notifications/actions.ts:77 |
| 53 | setTheme's cookie write triggers the exact full-page action refresh the like-button work removed: toggling theme mid-scroll re-ren | src/components/settings/theme-actions.ts:33 |
| 54 | One error boundary for the whole app: any single page's render error replaces the entire shell, and most degradation paths funnel  | src/app/error.tsx:1 |
| 55 | Two admin lists are unbounded and grow forever: /admin/support fetches every Contribution row ever recorded, /admin/reports fetche | src/app/(main)/admin/support/page.tsx:59 |
| 56 | Production images are served from pub-*.r2.dev, which Cloudflare rate-limits and documents as not for production; mostly shielded  | next.config.ts:167 |
| 57 | submitPrompt assigns position = count of accepted prompts, producing duplicate positions deterministically after any removal (and  | src/app/(main)/catchups/actions.ts:707 |
| 58 | markNotificationRead throws P2025 for a pruned/foreign notification id, killing the click (navigation never happens) | src/app/(main)/notifications/actions.ts:77 |
| 59 | deletePost/deleteDraft delete the R2 images before the database row: a failed row-delete leaves a live post with permanently broke | src/app/(main)/feed/actions.ts:337 |
| 60 | Legacy /onboarding updateProfile action writes bio/city/socials with no length or format validation | src/app/(auth)/onboarding/actions.ts:6 |
| 61 | Account export is unbounded (no take on any of the ten queries) and pretty-printed; a prolific member's export can exceed Vercel's | src/app/api/account/export/route.ts:87 |
| 62 | Collection fallback upload path (used whenever presign/CORS fails) dies at Vercel's ~4.5MB platform body cap for full-resolution p | src/lib/upload-client.ts:17 |
| 63 | Client fetch-on-mount .then() chains with no .catch(): a transient action failure (deploy mid-session, network blip, expired sessi | src/components/posts/comments-section.tsx:140 |
| 64 | Retention sweep is one serverless invocation doing every table's delete plus every due account purge sequentially — approaching th | src/lib/retention.ts:115 |
| 65 | markNotificationRead throws unhandled P2025 when the target row is gone (pruned by the KEEP=100 sweep or read from a second device | src/app/(main)/notifications/actions.ts:77 |
| 66 | DemoWriteError's visitor-facing message is unreachable dead copy: no action wrapper or client handler ever surfaces err.message, s | src/lib/demo.ts:156 |
| 67 | Shared demo persona turns concurrent visitors' like/vote toggles into unhandled P2002/P2025 throws (no unique-violation handler on | src/app/(main)/feed/actions.ts:477 |
| 68 | Seeded demo notification hard-codes "open for answers until Friday" while the actual deadline is always reset-time + 4 days — wron | src/lib/demo-seed/seed.ts:447 |
| 69 | City and House filters match by substring: filtering one city/house also returns members of any city/house that contains it as a s | src/app/(main)/directory/where.ts:62 |
| 70 | users-by-batch: non-integer numeric values in ?batches= reach a Prisma Int `in` filter and 500 the route | src/app/api/users-by-batch/route.ts:32 |
| 71 | Directory search debounce timer survives unmount: navigating away within 300ms of typing yanks the member back to /directory | src/components/directory/directory-client.tsx:181 |
| 72 | Search telemetry (logSearch) is fire-and-forget with no after()/waitUntil: on Vercel the write can be frozen with the function and | src/app/api/places/search/route.ts:127 |
| 73 | A batch-tile year filter is silently overridden by the batch-range facet while both render as active filter tokens | src/app/(main)/directory/where.ts:49 |
| 74 | PollDisplay: tapping your already-chosen option optimistically inflates its count without adjusting the total (percentages exceed  | src/components/posts/poll-display.tsx:89 |
| 75 | PostFeed 'Load more' has no cancellation: a stale page from the previous filter/sort is appended after the filters change; offset  | src/components/posts/post-feed.tsx:152 |
| 76 | Silent hard caps with no pagination: saved posts stop at 120, the letters index at 40 — older items become unreachable with no ind | src/app/(main)/feed/actions.ts:980 |
| 77 | Fire-and-forget DB writes in server components (feed search log, letter view counter) can die on serverless before committing; rec | src/app/(main)/feed/page.tsx:29 |
| 78 | Blocked members' posts and comments remain in every feed under their linked name while the directory excludes them | src/app/(main)/feed/actions.ts:822 |
| 79 | Negative pagination values reach Prisma unclamped and throw: loadPosts "offset:-1" cursor and loadPhotos page:-1 | src/app/(main)/feed/actions.ts:888 |
| 80 | Check-then-create toggles have the unique constraints but no P2002 handler; togglePhotoLove and markNotificationRead also throw ra | src/app/(main)/feed/actions.ts:489 |
| 81 | markFeedSeen accepts arbitrary future dates and its monotonic guard makes the mistake permanent | src/app/(main)/feed/actions.ts:1232 |
| 82 | Fire-and-forget telemetry writes without after(): search logs and login attempts can be lost when the serverless instance freezes | src/app/api/users/search/route.ts:72 |
| 83 | Actions that shape input with .map/.trim before validating throw raw TypeErrors on crafted non-string/non-array payloads | src/components/profile/profile-actions.ts:209 |
| 84 | Cross-path validation caps disagree for the same columns: name 100 vs 80 vs 101, years capped at current-year vs 2100, phone min 4 | src/lib/validators.ts:54 |
| 85 | The 100-notification prune deletes UNREAD rows, including moderation/admin notices the member never saw | src/app/(main)/notifications/actions.ts:44 |
| 86 | Thread pages load every message with no take: an unbounded query on both the member and admin conversation views | src/app/(main)/messages/[id]/page.tsx:40 |
| 87 | Letter view telemetry (recordView) fires before the visibility checks and is un-awaited on serverless | src/app/(main)/letters/[id]/page.tsx:85 |
| 88 | letterTitle and the letters-index excerpt leave a stray "!" for letters opening with image markdown — the exact bug already fixed  | src/lib/utils.ts:350 |
| 89 | Double-submit of forgot-password creates two reset rows: the dedupe fold is a check-then-insert TOCTOU with no unique constraint b | src/lib/email-queue.ts:306-338 |
| 90 | A very fast bounce webhook can outrun the providerId write and is silently dropped, leaving the row 'sent' forever | src/app/api/resend/webhook/route.ts:140-146 |
| 91 | Account-deletion email prints the purge date in server UTC: requests made 00:00-05:30 IST name a date one day earlier than the mem | src/components/settings/actions.ts:344-348 |
| 92 | parseJsonArray(user.phones) has no element-type guard: one non-string element in the phones column crashes the entire profile page | src/lib/utils.ts:28 |
| 93 | generateMetadata omits the deletionRequestedAt gate the page body enforces: the tab title can carry the name of an account the pag | src/app/(main)/profile/[id]/page.tsx:34 |
| 94 | Deletion-scheduled email renders the purge date in server UTC: members acting between 00:00 and 05:30 IST are told a purge date on | src/components/settings/actions.ts:315 |
| 95 | Dark-mode tile keys on the DB while the /dark-mode route keys on the device cookie: on a new device a dark-mode member is told 'Tu | src/components/profile/letterhead-profile.tsx:1194 |
| 96 | No cross-field sanity on the year set: yearLeft < yearJoined, batchYear < yearLeft and similar combinations save silently, printin | src/components/profile/profile-actions.ts:126 |
| 97 | The generated vCard is spec-non-compliant: LF line endings instead of CRLF and unescaped commas/semicolons in FN/ADR/NOTE (gazette | src/app/(main)/profile/[id]/page.tsx:270 |
| 98 | Admins get notFound() for blocked members' profiles too, so the profile's own block control is one-way: block someone from their s | src/app/(main)/profile/[id]/page.tsx:112 |
| 99 | parseHouseSpans merges same-house entries across an unrecorded gap year, so the profile asserts a span covering a year the member  | src/lib/house-spans.ts:157 |
| 100 | Mention dropdown shows the previous query's stale results while a new mention query loads | src/components/posts/mention-dropdown.tsx:31 |
| 101 | Feed and letter images render without dimensions: the page reflows under the reader as each lazy image loads | src/components/posts/post-card.tsx:367 |
| 102 | retention.yml and snapshot.yml both fire at 21:00 UTC despite retention.yml's comment claiming it avoids simultaneity: the sweep's | .github/workflows/retention.yml:21 |
| 103 | snapshot.mjs runs at 21:00 UTC but queries PostHog for 'today's UTC date', so the 21:00-24:00 UTC window (02:30-05:30 IST) is neve | scripts/ops/snapshot.mjs:28 |
| 104 | snapshot.mjs --day backfill records TODAY's live database, Sentry and GitHub values under the requested past date, silently corrup | scripts/ops/snapshot.mjs:27 |
| 105 | snapshot.mjs backup.ok reads workflow_runs[0], which can be an in-progress or manually-dispatched run with conclusion null, record | scripts/ops/snapshot.mjs:236 |
| 106 | After a purge, other members' User.coverPhoto (and Group.coverImage) strings still point at the purged uploader's deleted Collecti | src/lib/account-purge.ts:33 |
| 107 | Code-unit truncation and initials split surrogate pairs: plainExcerpt, letterTitle and getInitials cut strings with .slice()/[0] o | src/lib/utils.ts:389 |
| 108 | Year validators evaluate new Date().getFullYear() in UTC at module scope: for 5.5 hours every New Year (and for as long as a warm  | src/lib/validators.ts:22 |
| 109 | Signup accepts a 101-character name (50 + space + 50) but profileSchema caps name at 100, so such a member's settings form can nev | src/lib/validators.ts:16 |
| 110 | batchTypeFromLeaving silently returns "ISC" for impossible input (batchYear earlier than yearLeft), so a swapped-fields typo at si | src/lib/utils.ts:250 |
| 111 | Signup Join button re-enables during the 1400ms celebration window: a double-click after success fires registerUser again, paintin | src/components/auth/signup-form.tsx:436 |
| 112 | signupSchema's year ceilings call new Date().getFullYear() at module load, so a warm serverless instance (or the IST/UTC New Year  | src/lib/validators.ts:22-29 |
| 113 | Houses step's empty-state copy tells members to enter joined/left years 'in the previous step', but the previous step (register) h | src/components/onboarding/steps/houses-step.tsx:50-51 |
| 114 | resetPassword burns the single-use token before writing the new password: a DB failure between the two leaves the member with a sp | src/components/auth/email-actions.ts:252 |
| 115 | If the post-signup auto sign-in fails, onboarding is lost forever: /welcome is only ever reached via the signup client's push, and | src/components/auth/signup-form.tsx:418-419 |
| 116 | Paid-transition field hygiene: failureReason survives a failed-then-successful retry (red error under a successful gift), and meth | src/app/(main)/support/actions.ts:170 |
| 117 | Admin money surfaces render UTC dates and UTC month boundaries to IST admins: payments between 00:00 and 05:30 IST display the pre | src/lib/utils.ts:151 |

---

## 4. The 2,000-user dossier

All numbers verified against installed source (`node_modules/pg-pool`, `@prisma/adapter-pg`,
`@prisma/client`) and the live database (read-only), by the connection-budget and scale lenses.

### 4.1 Connection budget — the real ceiling

- **What the code sets today**: `src/lib/prisma.ts` builds `new PrismaPg({ connectionString })`
  with **no pool `max`** (pg default = **10 connections per serverless instance**), **no
  `connectionTimeoutMillis`** (a connection checkout with no free connection **queues forever** —
  `pg-pool/index.js:205-207`), no `statement_timeout`, no `query_timeout`, `min=0`,
  `idleTimeoutMillis=10s`. Prisma interactive transactions default to maxWait 2s / timeout 5s.
- **The platform**: Supabase **Free** plan (`docs/OPERATIONS.md:57`) — Nano compute, small
  Supavisor client-connection cap. *(Egress and backups are NOT concerns: the 5GB/month egress cap
  is comfortably clear — photos are on R2, the DB is 76MB — and backups are handled by the owner's
  own nightly job. The connection issue below is a **code** problem, not a plan problem, and is why
  Free is fine.)*
- **The arithmetic**: each Vercel instance can open up to 10 Postgres connections. At 2,000
  members the concurrent-request count reaches tens-to-low-hundreds; many instances × 10 quickly
  exceeds the pooler's client cap. Because there is **no connection timeout**, the excess checkouts
  queue **forever**, and the `(main)` layout awaits its data **above every `loading.tsx`**, so the
  member sees a **blank page / platform 504**, not the app's error screen. Each hung request also
  holds a Vercel concurrency slot → the incident compounds. *(The small Supavisor cap on Nano
  compute is exactly why the connection-pool config matters — but the fix is the code below, not a
  paid tier.)*
- **Fix (one construction site, code only — no plan change)**: `new PrismaPg({ connectionString,
  max: 3, connectionTimeoutMillis: 5000, statement_timeout: 15000, query_timeout: 20000 })` (all
  pgbouncer-transaction-mode safe). A capped `max` with a real timeout turns "site hangs under load"
  into "a few requests get a fast, honest error under load," and keeps the fleet's total connections
  under the Supavisor cap so Free-tier compute is sufficient. Tune `max` to (Supavisor client cap ÷
  expected peak concurrent instances).
- **VERIFIED CLEAN here**: pgbouncer/transaction-pooler compatibility is fine — the adapter uses
  unnamed prepared statements, issues no `SET`/advisory-lock/`LISTEN`/`NOTIFY` outside a
  transaction, and **all 16 `$transaction` sites were reviewed and none hold a transaction open
  across an R2/email/network call** (the would-be-Critical class is absent). `DIRECT_URL` is
  CLI-only; no runtime path reads it.

### 4.2 Missing-index list (B-090; one migration file)

Postgres does not auto-index foreign keys, and the "one per user/pair" uniques all lead with
`userId`, so per-target counting and thread reads sequential-scan. Add indexes on:
`Like.postId`, `Comment.parentId`, `PollVote.postId` and `PollVote.pollOptionId`,
`CommentLike.commentId`, `PhotoLove.photoId`, `Post.authorId`, `CatchupEntryLove.entryId`,
`Bookmark.postId`, `Photo.uploaderId`. Each serves a hot count/thread/profile query that runs on
every feed page, comment open, collection grid, or profile view. Invisible at today's 17 posts;
table-scan at scale. Apply via a dated `prisma/migrations-manual/` file (never `db push`).

### 4.3 Gazetteer search (B-091)

`/api/places/search` does a full **234,934-row sequential scan on every keystroke of 4+ characters**:
the `altNames ILIKE '%q%'` arm of the `OR` is on an unindexed column, and an `OR` whose arms are not
all indexable cannot use a BitmapOr. 15-25 members typing in the onboarding city picker at once can
saturate the pooler for the whole site. Fix: `CREATE EXTENSION pg_trgm; CREATE INDEX ... USING gin
("altNames" gin_trgm_ops)` (dated manual migration), or restructure so the OR never mixes indexable
and non-indexable arms.

### 4.4 Unbounded tables (B-093)

`Visit` and `SearchLog` (identifiable presence telemetry) have **no retention** — absent from the
sweep, from `prune.mjs`, and from the retention table. At 2,000 members these grow without bound
(today: Visit=87, SearchLog=16 for 52 members → ~1.7 visits/member already). Add both to the
retention sweep with a defined window. `ContentView` is bounded by design (verified). There is also
a **contradictory notification policy** (B-262: `prune.mjs` deletes at 30 days while `retention.ts`
uses a different age) — reconcile.

### 4.5 Third-party quotas at launch

- **Resend**: 100 messages/day plan − ~20 reset reserve = **~75 verification emails/day**. 400
  launch-day sign-ups would otherwise back up for days. **RESOLVED by the owner: the release is being
  staggered**, keeping daily sign-ups under the cap. B-002 (a transient failure *permanently* fails
  queued mail) is still fixed in code regardless, since it can bite even a staggered launch.
- **Upstash** (rate limiting) fails **open** — verified and reasonable — but that means quota
  exhaustion is *silent*; worth a dashboard alert.
- **Images** are served from `pub-a656209a5438484f9694738260255a5e.r2.dev` (confirmed live), the
  throttled host Cloudflare documents as not for production. The custom **serving** domain is not yet
  active (this is separate from the bucket-CORS upload rule — see §0 item 2). Non-urgent launch
  polish: add a custom domain to the R2 bucket, point `R2_PUBLIC_BASE_URL` at it, and add it to
  `next.config.ts` remotePatterns (currently only `*.r2.dev` is allowed).

### 4.6 Ready-to-run k6 load-test plan (for the fix session, against a PREVIEW deploy — never the
shared production DB)

```
// smoke → average → spike; watch Supabase connection count the whole time
import http from 'k6/http'; import { check, sleep } from 'k6';
export const options = {
  scenarios: {
    smoke:   { executor: 'constant-vus', vus: 5,  duration: '2m' },
    average: { executor: 'ramping-vus', startTime: '2m',
               stages: [{duration:'3m',target:50},{duration:'10m',target:50},{duration:'3m',target:0}] },
    spike:   { executor: 'ramping-vus', startTime: '20m',
               stages: [{duration:'30s',target:200},{duration:'3m',target:200},{duration:'1m',target:0}] },
  },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
};
// Auth once via /api/dev-login (preview only), reuse the cookie. Hit the real hot paths:
export default function () {
  const j = { headers: { Cookie: __ENV.SESSION } };
  check(http.get(`${__ENV.BASE}/feed`, j),      { 'feed 200': r => r.status === 200 });
  check(http.get(`${__ENV.BASE}/directory`, j), { 'dir 200':  r => r.status === 200 });
  check(http.get(`${__ENV.BASE}/api/places/search?q=chennai`, j), { 'places 200': r => r.status === 200 });
  sleep(1);
}
```
Run against a preview deployment pointed at a **throwaway** database (a Supabase branch or a
separate project), not the shared production DB. 2,000 registered members ≈ tens-to-low-hundreds
concurrent, so the spike stage (0→200) is the meaningful test. Pass = `http_req_failed<1%`,
`p95<500ms`, and the Supabase connection count staying under the pooler cap through the spike. If
connections pin at the cap and latency climbs, section 4.1's pool config is the fix; re-run to
confirm.

---

## 5. Verified-clean map (examined and came back clean — so future audits know what was checked)

- **pgbouncer / transaction pooler**: no `SET`/advisory-lock/`LISTEN`/`NOTIFY`/prepared-statement
  hazards; unnamed statements; the only `SET` is transaction-scoped isolation level.
- **Transactions across network calls**: all 16 `$transaction` sites reviewed — none hold a
  connection open across R2/email/network. (The purge's R2 deletes happen *after* the transaction,
  which is B-011, a different — Medium — issue.)
- **`DIRECT_URL`**: CLI-only; no runtime path reads it.
- **Pagination**: feed (`[createdAt desc, id desc]` + cursor), directory, notifications, comment
  roots, and admin people are all keyset with `take N+1`. Offset paging exists only where documented
  (count-based feed sorts; the Collection grid — which is B-122, a real but Low tiebreaker gap).
- **Email-queue daily budget window**: correct — matches Resend's own UTC reset and is shown
  IST-explicitly on `/admin/mail`; the verify-email banner is client-side and hydration-guarded.
- **Directory NaN params**: do **not** crash (live HTTP 200); the earlier "500-crash" claim is
  refuted — it is a silent mis-filter (`NaN` matches all, out-of-range matches none), a
  validation gap, not an outage.
- **Password hashing / timing**: bcrypt cost 12 everywhere; the dummy-hash constant-time equalisation
  across no-account / no-password / wrong-password branches is intact (auth core lens).
- **Demo write protection**: the three-layer default-deny (proxy → per-action guard → Prisma
  allowlist) holds; the demo findings are UX (a denied write shows a generic error), not a breach.
- **B-050** (profile email): the "private email leaks publicly" claim is **refuted** — the email is
  gated to own-profile and Stage-2-verified alumni; only a Low residual remains (no "show no email"
  option).

**Examined-clean from the completeness pass** (the uncited files, read line-by-line):
- **Sharp / decompression bombs**: the *only* `sharp(` call in all of `src/` is inside
  `sharpImage()` (image.ts:27) with `limitInputPixels=100MP` + `sequentialRead` + `failOn:'error'`.
  No path decodes attacker bytes without the guard — a small-bytes/huge-pixel bomb is refused, not
  OOM'd.
- **Session lifetime (maxAge/updateAge)**: absent config means NextAuth defaults (30d absolute /
  24h rotation), and the session callback re-reads `isBlocked` + `credentialVersion` on *every*
  request, so revocation is immediate and there is no session-immortality or surprise-expiry.
- **map-cluster.ts**: null / non-finite coords dropped via `Number.isFinite` (a legitimate `0`
  survives); coincident-pin and antimeridian cases handled by the projection before clustering.
- **Malformed stored JSON readers**: `parseJsonArray`/`parseUserLinks`/`parseHouseSpans` all guard
  element shape and return `[]` on bad input; `targetBatches` is a delimited string (never
  JSON.parsed). Live check: 0 of 52 members hold malformed JSON today. The one real
  non-string-`phones` reader crash is already tracked. Latent hardening, not a live crash.
- **geocode.ts, wordle.ts, poll-creator, report-dialog, catch-ups answer surface,
  use-user-search/tag-input/year-input, and the pure rule files** (roster/human-pass/timing-safe/
  mask-email): all read in full and clean (details in the completeness report).
- **Admin worklist cross-queue assembly** (round 2): the count and the list use byte-identical
  predicates for all seven queues; no cross-queue double-count (`verifyState` is a single scalar, so
  flagged/pending are mutually exclusive; a member legitimately in two queues gets two distinct
  namespaced WorkItems); ordering is correct because every `at` is a fixed-width ISO `Z` string. Only
  the tracked >20-per-queue cap causes count-vs-list drift.
- **Catch-ups multi-keeper console** (round 2): no whole-object save anywhere — each keeper action
  writes a single field (`{cadence}`, `{status}`), so two keepers touching different columns don't
  clobber; `extendDeadline` and the state transitions are CAS-protected (`updateMany` guarded on the
  prior timestamp/status), so a stale second keeper loses cleanly with "the deadline just moved."
- **admission-stamp.tsx** (round 2): purely presentational, no date/parse/null-deref risk.

---

## 6. Coverage map

- **Decomposition rationale**: I split the work into **16 feature territories** (every file belongs
  to exactly one, with a catch-all agent sweeping the remainder) plus **10 cross-cutting lenses**
  (races, caching, IST dates, connection budget, silent failures, 2,000-user scale, Vercel limits,
  input validation, React client, chaos) — because the per-feature bugs and the pattern-level bugs
  (a race that only makes sense seen across all actions; a date class present on twelve surfaces)
  fail differently and a lens agent sees the pattern a territory agent cannot.
- **What each covered**: territories = auth-core, feed/posts, letters/messages/notifications,
  catchups-actions, catchups-lifecycle, directory/places, collection/uploads, profile/settings,
  admin, support/razorpay, email pipeline, crons/retention, demo, shell/telemetry,
  auth-clients/landing, lib/utilities-catchall. Each returned findings + a verified-clean list +
  coverage notes (in `docs/planning/audits/wave1/`).
- **Consciously out of scope** (and why): design/visual polish (a separate `/simplify` audit owns
  that); the `/lab` and `/preview` dev rooms (not shipped to members); pure presentational UI
  (`ui/*`, `landing/*`, `mascot/*` — low bug-likelihood, spot-checked only); re-running the closed
  security audit; the hoopoe Safari-zoom bug (three prior disproofs, owner-deferred).
- **Live reproduction** was done on the shared production database **read-only** (SQL counts, authed
  GET probes); no test account writes were needed, so nothing was created to clean up.
- **Raw material**: all 26 agent reports in `docs/planning/audits/wave1/*.json`; the 355-row ledger
  in `wave1-ledger.tsv`; the 44 validation verdicts in `verdicts.json`; dedup and dossier working
  notes in `findings.md`; Medium clustering in `medium-clusters.md`.
