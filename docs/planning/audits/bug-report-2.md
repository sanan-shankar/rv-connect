# Pre-release bug & stability audit — round 2

**Date:** 2026-08-22 · **Scope:** whole application, pre-public-launch, 2,000-user headroom target
**Method:** 22 read-only finder agents (12 territories + 10 cross-cutting lenses) → 204 candidates →
18 adversarial validators (one per code-locality zone, each trying to *refute*) → orchestrator
hand-verification and live proof of the top tier. This is the **second** formal audit; the first
(4 fix sessions) closed 2026-08-21. Nothing already tracked in `docs/TRAPS.md` or `bugs.md`
("Settled" / "Open") is re-reported here.

**Audit-only session. No application code was changed.** Every write below is a proposal for a
later fix session.

---

## 1. Executive summary (plain language)

**Is it ready for the public?** Yes, with a short pre-launch punch-list. The app is fundamentally
sound: the scary categories — money, auth, account deletion, the demo's write-protection, the
database connection budget — are all in good shape, and the previous audit's fixes have held. This
round found **no Critical bugs** (nothing that loses data for everyone or takes the site down). It
found **3 High**, **42 Medium**, and **131 Low** issues, plus 7 more the validators caught while
checking. Most are edge cases a member hits rarely; a handful are worth fixing before you open the
doors.

**The five scariest things found** (all fixable in an afternoon each):

1. **An unverified account can post to the whole feed** (C-122). The rule "you must confirm your
   email before posting" has a one-line hole: send a post with the "save as draft" flag set and the
   check is skipped, but because the post isn't a letter it publishes anyway. This is exactly the
   spam vector email-verification exists to stop. *I confirmed this by reading the code myself.*

2. **A refunded donation can silently come back to life as "paid"** (C-084/C-085). If a donation is
   refunded and then Razorpay re-sends the original "payment captured" message (which payment
   providers routinely do), the code flips it back to "paid" and re-grants the supporter bird — so
   your recovery total counts money you gave back. *Confirmed by reading the webhook.*

3. **Reporting a post leaks the author's name for posts you can't see** (C-001, now Low after
   validation). Every other post action checks "are you allowed to see this?" first; the report
   action doesn't, so a member can confirm a hidden/draft post exists and learn who wrote it.

4. **Infinite scroll can silently stop early** (C-005 and its cluster). *I proved this live against
   the database:* when the post at a page boundary is deleted between scrolls, the feed, the letters
   list, the notification bell, and the directory all quietly report "no more" while older items
   still exist. A refresh fixes it, but the member sees a truncated list until then.

5. **A Keeper can see who asked anonymous Catch-up questions** (C-019). One surface (the Catch-up
   home) grants Keepers a peek at anonymous askers that the other surface (the Round page) correctly
   hides — an incomplete fix from the last round.

**What 2,000-user headroom actually looks like:** comfortable. The database connection budget is
correctly sized (pool of 5 per instance × ~40 concurrent instances = 200, exactly Supabase's cap),
the expensive query paths are indexed, and the app is 112 MB of a 500 MB database — 97 MB of which
is the one-time city gazetteer, not member data. The real scale watch-items are three, none
blocking: launch-day confirmation emails will trail signups by up to ~3 days if 300+ people join at
once (Resend's 100/day free tier — C-161); the analytics `Visit` table grows unbounded and needs a
retention sweep before it becomes the biggest table (C-163/C-164); and PostHog's free analytics tier
is sized for ~600k events/year in the docs but 2,000 active users generate several million (C-165).
Full arithmetic in §5.

---

## 2. Codebase scorecard

You asked for a rating across categories. This is my honest read after two rounds of audit, scored
1–10 (10 = I would hold this up as exemplary). The bar is "production SaaS," not "hobby project."

| Category | Score | Why |
|---|---:|---|
| **Security** | 9 | A 10-phase overhaul closed 74 findings; this round found no auth bypass, no IDOR that survived validation, no injection. The one real gap (C-122 unverified-publish) is a logic slip, not a hole in the model. Session revocation, timing-safe compares, CSP, rate limiting are all real. |
| **Data integrity** | 8 | Purge/cascade/soft-delete are carefully reasoned and tested. Dock: the money state machine can resurrect a refunded row (C-084/C-085), and a few multi-write chains lack a transaction (C-007, C-075). |
| **Correctness (business logic)** | 7 | Most logic is right and commented with its reasoning. The Medium cluster is real edge-case drift: batch-targeting ignored on the profile (C-004), Keeper anonymity leak (C-019), Catch-up lifecycle gaps (C-020/C-021/C-023). |
| **Reliability / error handling** | 7 | Silent-failure discipline is mostly excellent (the queue, telemetry, webhooks). Dock: a few swallows that should reach Sentry (C-149, C-024), and forms that strand on a rejected action (C-034). |
| **Scalability to 2k** | 8 | Connection math is right, hot paths indexed, keyset pagination used. Dock: unbounded `Visit` growth (C-164), a per-page-view drain cost (C-104), and third-party free-tier ceilings (C-161/C-165). |
| **Concurrency / races** | 7 | The important invariants have DB unique constraints behind them. Dock: keyset-cursor-at-deleted-row (proven live), autosave lost-updates (C-125/C-175), and several toggles with no in-flight guard (C-178). |
| **Input validation** | 8 | Zod on the important actions; ownership checks on uploads. Dock: a few uncapped strings into LIKE/JSON columns (C-015, C-169) and cap mismatches between the profile pen and every other writer (C-047/C-048). |
| **Time / timezone correctness** | 6 | The known raw-SQL trap is documented and the valley-day test guards rendered dates. But server-side UTC-vs-IST still bites: Catch-up "days left" disagrees across surfaces (C-141), monthly cadence overflows on the 31st (C-144), and several docstrings claim browser-time while pinning IST (C-037/C-145/C-160). |
| **Test quality** | 6 | 54 tests, and the *rules* tests (cascade, gate-coverage, index-coverage) are a genuinely good idea. But several claim to catch a class of regression they don't: they check fixed lists, not the live graph (C-191/C-192), or git-tracked files only (C-189), and the credentialVersion revocation has no test at all (C-187). |
| **Code craft / maintainability** | 9 | Genuinely high. Every constant is argued in a comment; the "why" is almost always present. The one recurring flaw is comments that outlive their code and start lying (C-006, C-049, C-052, C-067, C-138) — which this audit turned into finding-evidence. |

**Overall: 7.6 / 10 — a well-built, carefully-reasoned application that is close to launch-ready.**
The gap between it and a 9 is a punch-list, not a rebuild.

---
## 3. Phased fix plan

Grouped so a fix session can take them top-to-bottom. Phases 1–2 are the pre-launch punch-list;
3–6 are independent of each other and can be done in any order or across sessions.

**Phase 1 — Before launch (correctness with teeth).** The handful a real member or the owner will
actually hit. C-122 (unverified publish), C-084 + C-085 + C-087 (donation refund/replay accounting),
C-019 (Keeper anonymity leak), C-002 (hidden letters 404 for admin/author — breaks moderation),
C-102 (mail retry zombie blackholes resets). Independent of each other.

**Phase 2 — Before launch (the pagination cluster, one fix pattern).** C-005/C-124/C-162 (feed),
C-055/C-056 (bell), C-096 (directory), C-171 (comments). All one root cause — a keyset cursor at a
deleted/hidden row returns an empty page. Fix once (a recovery that re-seeds from the last *live*
row, the shape M39 already added to the directory) and apply everywhere. Proven live in this audit.

**Phase 3 — Uploads & orphaned bytes.** C-063/C-064 (no sweeper for staged/abandoned R2 objects),
C-065 (retention deletes AdminMessage rows but not their screenshots), C-050/C-131/C-069/C-152
(best-effort deletes with no PendingImagePurge fallback), C-066/C-067/C-070/C-072/C-073 (Sharp edge
cases). Theme: bytes that outlive their DB row, and DB rows whose bytes never arrive.

**Phase 4 — Catch-ups lifecycle & notifications.** C-020 (rejoin doesn't clear the bin), C-021
(empty-Round answering), C-023 (permanent Keeperlessness), C-141/C-144/C-031 (date math), C-025–C-030
(fanout, metering, ordering). Independent of Phases 1–3.

**Phase 5 — Client-side races & autosave.** C-175/C-176/C-177 (letter desk autosave), C-125
(Catch-up answer lost-update), C-178/C-010 (heart double-tap), C-179/C-071 (Load-more stale/dup),
C-133 (back-nav stale like state). Independent.

**Phase 6 — Hardening, hygiene, and the comment-lies.** The Low table: cap mismatches, comment-vs-code
drift, timezone docstrings, unbounded admin queries, test-quality gaps (C-187/C-191/C-192/C-193/C-194
deserve their own mini-pass since they weaken the safety net). Independent.

**Owner-only / dashboard (not code):** C-135 (verify Google Pay/UPI works past `payment=()` with a
real test payment), C-165/C-166 (PostHog/Sentry free-tier ceilings — a plan decision), C-186 (demo
project's cron env).

---

## 4. Findings

Status legend: **CONFIRMED** = validated against the code (and, where marked *(live)*, proven at
runtime by the orchestrator). **SUSPECTED** = mechanism is real but the final proof needs a runtime
check only the owner's environment can run; the exact check is given. Every finding carries a fix
direction and the gate that should pin it. High and Medium are detailed below; Low is tabulated.
The full per-finding record (every candidate's finder argument + validator reasoning + fix + gate,
keyed by id) is the machine-readable ledger `verdicts-merged.json` alongside this report.

### High severity (3)

#### C-019 — Home page's inline published Round reveals anonymous askers to Keepers (M10 fix incomplete)
`src/app/(main)/catchups/[catchupId]/page.tsx:155` · CONFIRMED

- **What:** Verified the shadow: loadPublishedIssue at [catchupId]/page.tsx:155 declares `const askerVisible = p.showAsker || isKeeper;` inside the .map, shadowing the imported askerVisible() helper (imported :23, used correctly at loadHome :340). round/[editionId]/page.tsx:307 uses the shared helper, whose body (catchups.ts:98-104) grants NO keeper exception (only showAsker OR authorId===viewerId). The home renders the inline issue via ConsolePublished -> QuestionSection with prompt.asker set, so for a published latest edition a Keeper receives and sees the name+bird of every anonymous asker (asker: askerVisible && p.author). The page path is live: CatchupHomePage:517-519 calls loadPublishedIssue with result.viewer.isKeeper when the latest edition is published. Two surfaces of the same Round disagree exactly as M10 described. Secondary confirmed: a non-Keeper anonymous author is denied their own by
- **Fix:** Delete the local shadow at :155 and call the shared askerVisible({ showAsker: p.showAsker, authorId: p.author?.id ?? null }, viewerId) exactly as the round page and loadHome do; drop the isKeeper param if it becomes unused. Also correct the stale comment at catchups-types.ts:132.
- **Gate:** A unit/integration assertion that loadPublishedIssue (or a shared render helper) yields asker=null for a showAsker=false prompt when the viewer is a Keeper but not the author; ideally a shared test over both surfaces so they cannot diverge again.

#### C-102 — Admin 'Retry' on a deferral-exhausted row creates an unkillable queued zombie that blackholes all future resets for that member
`src/app/(main)/admin/mail/actions.ts:47` · CONFIRMED

- **What:** Verified against actual code. retryMail's write is `data: { status: "queued", attempts: 0, lastError: null, claimedAt: null }` (actions.ts:47) — it does NOT reset `deferrals` or `nextAttemptAt`. A row is retired to status='failed' with deferrals=MAX_DEFERRALS(10) by bookFailure's transient giveUp branch (email-queue.ts:256-274), and because transient failures decrement the attempt they consumed (:263), such a row can be 'failed' with attempts as low as 0. The drain's selection requires `deferrals: { lt: MAX_DEFERRALS }` (email-queue.ts:728), so after retryMail flips it back to 'queued' with deferrals still 10 the drain never selects it again. Compounding for kind='reset': it is foldable (email-queue.ts:447) and enqueueMail folds any queued/sending row of the same userId+kind and early-returns without draining (:449-459), so every later requestPasswordReset for that member folds into the 
- **Fix:** retryMail must also reset `deferrals: 0` and `nextAttemptAt: null` so a provider-exhausted row becomes genuinely drain-eligible again; and correct the docstring to name the deferrals ceiling alongside the attempts ceiling.
- **Gate:** Unit test: a row with deferrals=MAX_DEFERRALS and status='failed', after retryMail, satisfies the drain's exact selection predicate (attempts<MAX_ATTEMPTS AND deferrals<MAX_DEFERRALS AND due).

#### C-122 — createPost skips the verified-member gate for any submission carrying saveAsDraft=true, so an unverified account can publish a plain post to the whole feed
`src/app/(main)/feed/actions.ts:113` · CONFIRMED

- **What:** The gate-skip and the draft-effect disagree. feed/actions.ts:113 `const savingDraft = formData.get('saveAsDraft') === 'true'` skips requireVerifiedMember at :114-117 on the raw flag alone. But :203 `const isDraft = parsed.data.kind === 'letter' && parsed.data.saveAsDraft === true`, and :261 stores `status: isDraft ? 'draft' : 'published'`. postSchema allows saveAsDraft on any kind (validators.ts:215 kind optional, :245 saveAsDraft optional). So a crafted createPost with saveAsDraft='true' and NO kind field: savingDraft=true (gate skipped), kind defaults to 'post' (:251/:247), isDraft=false, status='published'. requireVerifiedMember (member-gate.ts:59-60) is the ONLY enforcement of emailConfirmed + verifyState==='verified'; nothing between :117 and the create at :247 re-checks. AUTHOR_IN_GOOD_STANDING (posts.ts) filters only isBlocked, not verifyState, so the post renders in every feed. A
- **Fix:** Compute savingDraft from the same condition as isDraft (kind==='letter' && saveAsDraft), i.e. gate-skip only for genuine letter drafts; anything stored status='published' must pass requireVerifiedMember.
- **Gate:** A security-regression test that an unverified/unconfirmed session cannot createPost a published row via saveAsDraft with a non-letter kind.

### Medium severity (42)

#### C-002 — Hidden letters 404 for the admin and the author because letters/[id] checks isHidden before canViewPost, defeating both documented exemptions
`src/app/(main)/letters/[id]/page.tsx:67` · CONFIRMED

- **What:** letters/[id]/page.tsx:67 `if (!letter || letter.kind !== 'letter' || letter.isHidden) notFound();` runs BEFORE canViewPost at line 88. decidePostVisibility admits admin (post-visibility-rule.ts:180) and author (line 190) ABOVE the isHidden refusal (line 202), and both bugs.md 'Settled' and the rule comment (lines 195-199) promise a moderator following an /admin/content link lands on the post and an author can reach a hidden post to respond to moderation. admin-content-query.ts:79 sets a letter href to `/letters/${p.id}` and includes hidden rows when includeHidden (line 36), so the moderation list's own Open on a hidden letter 404s. A hidden (admin-removed, status still published) letter is filtered from loadPosts (feed/actions.ts:1049) and the letters index (letters/page.tsx:70), so its author has no other route; line 67 defeats the documented exemption whose ONLY page surface is this on
- **Fix:** Remove the `letter.isHidden` clause from line 67 and let canViewPost be the sole authority (it already 404s hidden for everyone except admin/author); keep the kind/existence checks and the single-message 404.
- **Gate:** A test that an admin/author request for a hidden letter renders rather than 404s, alongside the existing post-visibility-rule unit test.

#### C-004 — Profile page ignores targetBatches: tab counts disagree with the tab lists, and the Photos grid shows images from posts outside the viewer's batch audience
`src/app/(main)/profile/[id]/page.tsx:144` · CONFIRMED

- **What:** Verified the divergence in code. profile/[id]/page.tsx builds visiblePostsWhere (lines 144-153) = {authorId, isHidden:false, groupId:null, PUBLISHED_ONLY, AND:[cityScopeWhere(viewerCities)] unless admin}. It contains NO batchScopeWhere and NO AUTHOR_IN_GOOD_STANDING, and its cityScopeWhere carries no {authorId} self-exemption. The actual Posts/Letters tab list is ProfileAuthorFeed -> loadPosts({authorId,kind}) (profile-author-feed.tsx:61), and loadPosts (feed/actions.ts:1063-1077) adds top-level OR:[...batchScopeWhere(userBatch).OR, {authorId: session.user.id}] plus AUTHOR_IN_GOOD_STANDING (1056) and the cityScope self-exemption (1042-1046). Counts (158-162) and photoPosts (165-170) both read visiblePostsWhere, so they diverge from the list on three axes. targetBatches is a real, validated, accepted field on the public createPost server action (validators.ts:229-236; feed/actions.ts:257 
- **Fix:** Make visiblePostsWhere match loadPosts' authorId path exactly: fold in batchScopeWhere(viewerBatch).OR (with the {authorId} self-exemption), add the {authorId} self-exemption to the cityScope arm, and add AUTHOR_IN_GOOD_STANDING with the same admin handling loadPosts uses. Better: derive counts/photos from the same shared where-builder loadPosts uses rather than a hand-copied fragment, so they cannot drift again.
- **Gate:** A unit test that asserts the profile counts/photos where-fragment is the same object loadPosts builds for an authorId query (pin the property, not a literal, per TRAPS), plus a test that a batch-targeted photo post is excluded from photoCount for an out-of-batch viewer.

#### C-005 — Feed keyset pagination silently ends when the cursor post is deleted between pages
`src/app/(main)/feed/actions.ts:1114` · CONFIRMED (live)

- **What:** loadPosts recent path uses `cursor:{id:keysetCursor}, skip:1` (feed/actions.ts:1114) and posts are hard-deleted (deletePostWithImages -> tx.post.delete, line 78), so a boundary cursor id can vanish between pages. The finding hinges entirely on Prisma 7 + @prisma/adapter-pg returning an EMPTY result (rather than a full first page or an error) when the cursor row no longer exists — a runtime behavior that cannot be settled from source. If true, hasMore=false/nextCursor=null ends infinite scroll early, but a full reload re-seeds a fresh cursor and recovers, so Medium at most. Same pattern in loadComments roots (line 1414), though comments are soft-deleted except account-purge.

#### C-006 — @-mentions cannot find teachers: the shared people-search endpoint excludes them on a Catch-ups-only rationale, and its comment mis-states its consumers
`src/app/api/users/search/route.ts:66` · CONFIRMED

- **What:** grep confirms /api/users/search has three consumers, not the one its comment claims: use-user-search.ts (two Catch-ups pickers) AND components/posts/mention-dropdown.tsx:50, which is rendered by create-post-form.tsx:858 — the composer for BOTH feed posts and letters (used via feed-column.tsx and letter-desk.tsx). route.ts:66 filters accountType notIn [teacher, ex_teacher], so the mention dropdown can never surface a teacher, and handleMentionSelect (create-post-form.tsx:485-490) is the only way to insert the @[name](id) link. Teachers ARE first-class authors (they post to the feed/letters), so wanting to mention one is a normal path. The route.ts:62-63 comment 'This endpoint's only consumers are the Catch-ups people surfaces' is a genuine comment-vs-code lie. Consequence is a degradation, not a crash: mentions carry no notification (no 'mention' notif type exists in feed/actions.ts or sc
- **Fix:** Move the teacher exclusion out of the shared /api/users/search endpoint and into the two Catch-ups callers (the use-user-search pickers), or gate it behind an explicit opt-in query param the Catch-ups pickers pass, so mentions keep reaching teachers.
- **Gate:** Unit/integration test: /api/users/search returns a seeded teacher account; a separate test pins that the Catch-ups people pickers exclude teachers at their own layer.

#### C-020 — Rejoining via the invite link never clears the personal bin, so the 30-day sweep still removes the member
`src/app/(main)/catchups/actions.ts:596` · CONFIRMED

- **What:** Binning (setCatchupDeleted deleted=true, actions.ts:1908) sets CatchupPref.deletedAt but leaves the GroupMember row. Following the invite link: the join page finds the still-present membership (join/[token]/page.tsx:100-104) and redirect()s to /catchups/<id> BEFORE joinCatchupByToken runs; even if it ran, joinCatchupByToken:596-600 upserts GroupMember with update:{} and never touches CatchupPref. So deletedAt stays set. Consequence chain verified: groupMemberIds (catchups-notify.ts:56-64) keeps excluding them (deletedAt not null) from every broadcast; the index keeps the card in Recently deleted; retention.ts:189-204 deletes their GroupMember row once deletedAt < now-30d (countdown runs from the ORIGINAL bin, never reset). addCatchupMembers:1724-1734 clears deletedAt for newlyAdded, proving the intended disarm exists for the Keeper-add path but not for self-rejoin. leaveCatchup deletes t
- **Fix:** When a still-member reaches the Catch-up via the invite token (both the join-page already-member redirect at join/[token]/page.tsx:100-104 and joinCatchupByToken), clear the caller's own CatchupPref.deletedAt (updateMany where catchupId+userId, data deletedAt:null), mirroring addCatchupMembers' newlyAdded disarm. Leave archivedAt/reminderMode alone.
- **Gate:** Test: bin a copy, follow the token path, assert CatchupPref.deletedAt is null afterward and the row is excluded from the retention due-list.

#### C-021 — openAnswering has no accepted-prompt guard: a zero-question Round can be opened for answering, resurrecting the B-062 spam loop
`src/app/(main)/catchups/actions.ts:1080` · CONFIRMED

- **What:** Confirmed openAnswering (actions.ts:1080-1097) reads only status and CASes on status='collecting'; it never counts prompts. The natural clock advance guards this: planNextAction (catchups.ts:630-640) returns extend-questions then {none} (dormant) when collecting->answering with counts.prompts===0, precisely to avoid the B-062 empty-Round loop (catchups.ts:443-451). closeAndPrepare took the mirror care for too-few (actions.ts:1138), but openAnswering did not get the no-questions mirror. UI hides the button (catchup-home-shell.tsx:122-127 gates on edition.prompts.some(p=>p.accepted)), so the reachable paths are a stale second tab / second Keeper (setCatchupKeeper makes two-Keeper real) racing curatePrompt removal of the last question, or a direct action call. Once opened empty there is no reverse transition; the Round rides answering->daily reminders->too-few extension->empty publish->next
- **Fix:** In openAnswering, count accepted prompts (catchupPrompt.count where editionId+accepted:true, the same rows advanceEdition counts) before/inside the transaction and refuse with a friendly error when zero, so the early trigger enforces the same no-questions rule the clock does.
- **Gate:** Test: call openAnswering on a collecting edition with zero accepted prompts and assert it returns an error and leaves status='collecting'.

#### C-023 — A Catch-up can be left permanently Keeperless once createdById is null; the spec's re-adopt rule is implemented nowhere
`src/app/(main)/catchups/actions.ts:1818` · CONFIRMED

- **What:** Verified chooseGroupSuccessor is imported/called ONLY in account-purge.ts:3,61 (grep found no other src use besides its test). leaveCatchup's founder refusal (actions.ts:1818) is `if (ctx.catchup.createdById && ctx.catchup.createdById === viewerId)`, so once createdById is null (Catchup.createdBy is SetNull on creator purge) the guard is inert and the last effective role-holder can leave with no succession promoted; removeCatchupMember protects only the creator (:1767); setCatchupDeleted refuses only the creator (:1901) so a promoted admin can bin, and retention.ts:201-204 then deletes that last role-holder's GroupMember with no succession check. isEffectiveKeeper (catchups.ts:356-364) has no 'any remaining member may re-adopt' fallback (spec 7), and setCatchupKeeper requires an existing Keeper via loadKeeperScope, so once stranded nobody can mint one; admin/catchups/page.tsx:138 renders
- **Fix:** Add a last-effective-Keeper guard to leaveCatchup (and a succession/re-adopt at the retention sweep and at leave) so removing the final role-holder of a createdById-null Catch-up either promotes chooseGroupSuccessor or is refused; and/or implement spec 7 by letting any remaining member re-adopt when no Keeper exists, plus an admin repair control on /admin/catchups.
- **Gate:** Test: createdById null, single member holding role admin/keeper; assert leaveCatchup either promotes a successor or refuses, and that the retention sweep never deletes the last role-holder without succession.

#### C-040 — Pasting a full Instagram URL stores it verbatim and renders a double-prefixed dead link
`src/lib/social.ts:14` · CONFIRMED

- **What:** social.ts:14 `if (kind === "instagram") return https://instagram.com/${v.replace(/^@/, "")}` sits ABOVE the http(s) prefix check at line 15, so a stored value like `https://instagram.com/ananya` becomes `https://instagram.com/https://instagram.com/ananya`. Nothing normalizes instagram on write: updateContactMethods (profile-actions.ts:326) stores `parsed.data.instagram` verbatim; contactMethodsSchema (validators.ts:187) only caps it at 100 chars (a full IG URL is ~28 chars, fits); contacts-editor.tsx has an `@handle` placeholder but no normalization. The profile page builds the Instagram method from socialHref/socialDisplay at page.tsx:256-261, so the dead link and the `@https://instagram.com/ananya` display ship on the public profile. linkedin/facebook/website avoid this because they fall through to the http check. Downgraded High->Medium: real and hit on a normal-ish path (pasting a fu
- **Fix:** Normalize the instagram value on write (strip a leading http(s)://instagram.com/ and any @ before storing) OR make socialHref honor an http(s) prefix for instagram too (move the instagram branch below the startsWith('http') check, extracting the trailing path segment). Apply the same normalize at contactMethodsSchema/contacts-editor so the stored column is always a bare handle.
- **Gate:** Unit test on socialHref/socialDisplay + a write-side normalizer test: a pasted 'https://instagram.com/x' resolves to a working 'https://instagram.com/x' href and '@x' display.

#### C-043 — Signup accepts batchYear earlier than yearLeft — the impossible pair the profile editor refuses
`src/components/auth/actions.ts:77` · CONFIRMED

- **What:** Verified the asymmetry. signupSchema (validators.ts:59-97) has no cross-field check that batchYear >= yearLeft — its only refines are 'alumni need all three years', 'teachers need yearJoined', and fullNameFits. registerUser (auth/actions.ts:77-93) cross-checks ONLY yearLeft < yearJoined, then derives batchType = batchTypeFromLeaving(yearLeft, batchYear). batchTypeFromLeaving (utils.ts:402-419) explicitly returns null when batchYear < yearLeft, with a comment stating that pair 'is the two fields swapped at signup' (audit Low 110). The profile editor's yearClash (profile-actions.ts:239-241) refuses exactly this pair ('Your batch year cannot be before the year you left'). So signup stores the impossible pair the editor refuses: batchYear=2005 + yearLeft=2010 (both individually calendar-valid; batchYear allows ahead:7) passes, batchType is silently written null. Confirmed cross-field validat
- **Fix:** In registerUser (or signupSchema), add the same guard yearClash enforces: reject when batchYear != null && yearLeft != null && batchYear < yearLeft, with the editor's message. Best placed as a shared cross-field check imported by both the signup path and yearClash so the two cannot drift.
- **Gate:** A unit test on the shared clash rule asserting (batchYear=2005, yearLeft=2010) is refused, exercised by both the signup validation path and profile yearClash.

#### C-044 — Demo: contact editing, admission number, and photo removal fail with a misleading 'check your connection' error
`src/lib/demo.ts:120` · CONFIRMED

- **What:** Verified the full chain. EDITABLE_PROFILE_FIELDS (src/lib/demo.ts:120-147) does NOT contain showEmail, phone, phones, admissionNumber, or photoUrl, yet schema.prisma:30/36/47/17 confirm all four are real User columns. updateContactMethods (src/components/profile/profile-actions.ts:307-331) writes a data object that UNCONDITIONALLY includes showEmail (boolean), phone (string|null) and phones (string|null) on every call. isOwnProfileEdit (demo.ts:241-244) iterates data keys and returns false on the first non-allowlisted key (showEmail), so demoWriteAllowed('User','update',...) is false for EVERY contact save, including one that only touched instagram. The Prisma demo extension (src/lib/prisma.ts:81-84) throws DemoWriteError; profile-actions.ts wraps nothing in try/catch, so it propagates to useAutoSave.run's catch (src/components/profile/pen.tsx:357-358) which sets the misleading 'That did
- **Fix:** Add showEmail, phone, phones and admissionNumber to EDITABLE_PROFILE_FIELDS in src/lib/demo.ts (they are ordinary scalar profile columns the visitor is meant to edit). Keep photoUrl/coverPhoto out of the set, but give removeAvatar an IS_DEMO front-door sentence the way updateAvatar (settings/actions.ts:195) has, so photo removal returns a written demo message instead of the generic connection error.
- **Gate:** Extend src/lib/demo.test.mjs with assertions that demoWriteAllowed('User','update', <full updateContactMethods payload incl showEmail/phone/phones>) === true and the admissionNumber payload === true, pinning the allowlist against future column drift.

#### C-052 — Feed post notifications deep-link to /feed#<postId> but nothing implements the scroll; the module comment claims PostFeed does
`src/lib/notification-links.ts:28` · CONFIRMED

- **What:** Verified against the actual code. postNotificationLink returns `/feed#${post.id}` for every non-letter post (notification-links.ts:28); the bell navigates with router.push(notif.link) (notification-bell.tsx:235); PostCard renders `<article id={post.id}>` (post-card.tsx:234) but PostFeed fetches posts in a useEffect after mount behind a skeleton (post-feed.tsx:120-160) so the anchor does not exist when the router commits. A repo-wide grep for location.hash/scrollIntoView/getElementById finds NO reader of the fragment in the feed path (only lab landings, house-picker, tour-provider, catchups toc, landing-nav). The repo's OWN lab audit independently states it: src/app/lab/everything/_findings.ts feed-2, 'The feed fetches its posts after mount and nothing reads the URL hash... it silently gives up.' The module comment at notification-links.ts:13-15 ('PostFeed handles the scrolling half of th
- **Fix:** Either give a post its own server-rendered route and point postNotificationLink (and Share, see new finding) at it, or have PostFeed read window.location.hash once the first page resolves, fetch the post if it is missing from the page, scroll it into view and ring the card. Separately correct the false comment at notification-links.ts:13-15.
- **Gate:** e2e that clicks a like/comment notification and asserts the target article is scrolled into view (expect.poll on geometry); at minimum a unit test pinning the link plus a documented, actually-present scroll mechanism.

#### C-054 — Deleting or hiding a letter (and legacy group notifications) leaves bell rows whose links 404; only Catch-ups clean up notifications
`src/app/(main)/feed/actions.ts:426` · CONFIRMED

- **What:** deletePost (feed/actions.ts:402-429) hard-deletes and adminRemovePost (:439-460) sets isHidden without touching any Notification row. postNotificationLink (notification-links.ts:19-30) returns `/letters/<id>` for kind==='letter'. letters/[id]/page.tsx:67 answers notFound() when the letter is missing OR isHidden. So an existing 'liked/commented on your letter' (author's bell) or 'X replied to your comment' (a third commenter's bell) row links `/letters/<id>` and 404s the hoopoe once the letter is deleted or admin-hidden. No cleanup exists on these paths; the only writers that reconcile bell rows with content lifecycle are the Catch-up actions (the in-repo counterexample). Feed posts degrade gently (`/feed#id` lands on the feed), so this is specifically the letter surface. Notifications persist (KEEP=100 unread indefinitely until the 365-day sweep), so the window is long.
- **Fix:** In deletePost and adminRemovePost (and adminRemoveComment), deleteMany the Notification rows whose link is this post's postNotificationLink, mirroring clearCatchupNotifications.
- **Gate:** Unit/integration test asserting no dangling Notification.link -> /letters/<id> survives a letter delete/hide.

#### C-055 — A legacy unresolved admin_note can be permanently destroyed by mark-all-read plus the 100-row prune, losing the moderation note's only copy
`src/app/(main)/notifications/actions.ts:58` · CONFIRMED (live)

- **What:** Mechanism fully verified. Legacy notifyAdminNote (git show 4ab894a:src/lib/admin-note.ts) stored the full note ONLY in Notification.message with link `/notice/<notificationId>` and created NO thread; the note materialises into an AdminThread only on a /notice/[id] visit (notice/[id]/page.tsx:54-69). markAllNotificationsRead (notifications/actions.ts:124-127) flips read=true with no type exemption; the first-page prune (notifications/actions.ts:58-60) deletes read rows past position 100 with no type exemption; retention.ts:127-129 deletes notifications older than 365 days regardless of read state. So an unopened legacy admin_note can be destroyed and its only copy lost. Current notifyAdminNote (admin-note.ts:22-35) creates the thread EAGERLY and links to /messages/, so all post-messaging notes are safe. The whole finding therefore hinges on whether any legacy `/notice/%` admin_note rows s
- **Fix:** If legacy rows exist: backfill them into AdminThreads once (a one-shot migration mirroring notice/[id] resolution) so the text no longer lives only in Notification.message, OR exempt type IN ('admin_note') from the read-based prune the way unread rows are already exempt.
- **Gate:** The migration/exemption plus a test that an admin_note notification is never deleted while its thread does not exist.

#### C-063 — Staged direct-upload objects are never reclaimed: no sweeper, no lifecycle rule, and several refusal paths skip cleanup
`src/app/api/upload/presign/route.ts:108` · CONFIRMED

- **What:** Verified. contributePhotoDirect returns on rate-limit refusal at collection/actions.ts:290-291 and on parse failure at :316 with NO delImageByKey, while the quota (:304) and processing-error (:411) paths DO clean up — the asymmetry is exactly as claimed. presign consumes an 'uploads' token (rate-limit.ts:69, 40/h) and so do finalize/contribute, so at the window boundary a presign+PUT succeeds and the very next completion call is 429'd, stranding the staged original; this is a systematically reachable path, not just a crafted one. Confirmed by grep that NO ListObjects/LifecycleConfiguration exists anywhere in src/ or scripts/, and retention.ts's sweep (line 272) only calls drainPendingImagePurges() — it has no bucket-listing step. account-purge's collectImageUrls reads only row-referenced URLs, so staged keys are never enumerable. A browser closed after the PUT (normal abandonment) or a d
- **Fix:** Delete the staged key on every refusal path in contributePhotoDirect/finalize (rate-limit and parse branches), and/or add an R2 lifecycle rule expiring staging/ and collection/*-o.* objects after N days as a backstop. Consider a nightly reconciliation that lists the staging prefix and deletes objects with no finalize.
- **Gate:** A unit test asserting delImageByKey is called before every non-success return in contributePhotoDirect; owner confirmation of an R2 lifecycle rule on staging/ and *-o.* prefixes.

#### C-064 — Processed uploads orphan whenever the referencing row is never written; no DB-to-R2 reconciliation exists
`src/app/api/upload/route.ts:149` · CONFIRMED

- **What:** Verified multiple orphan paths. (1) /api/upload/route.ts loop pushes url after putImage (:149); a later file failing isImageFile/HEIC/size (:84-105, before the try) or sniff/sharp (in the try) returns 400/422 while earlier files' objects stay stored with no cleanup. (2) finalize/route.ts:116 has the same shape — an earlier file's processed webp is orphaned when a later file 422s (the finally only deletes STAGED keys, not the processed output). (3) prisma.photo.create sits OUTSIDE the try in both contributePhoto (:218) and contributePhotoDirect (:418); a DB throw there leaves url+thumbUrl already stored and orphaned, and the try's catch (which deletes the staged key) never runs for a create failure. A partial Promise.all putImage (one of the two succeeds, other throws) also strands the successful object. (5) editPost (feed/actions.ts:~525) writes imagesUpdate={images: allowed} which can D
- **Fix:** Wrap photo.create in the same try (or write a PendingImagePurge row for the just-stored objects on any post-store failure); in the multi-file loops, track successfully-stored URLs and delete/queue them on an early error; in editPost, diff old vs new images and queue removed URLs into PendingImagePurge.
- **Gate:** Tests: (a) a two-file /api/upload where file 2 is corrupt asserts file 1's object is deleted or queued; (b) editPost removing an image queues the old URL; (c) photo.create failure queues the two stored objects.

#### C-065 — Retention sweep deletes AdminMessage rows without purging their screenshot bytes
`src/lib/retention.ts:111` · CONFIRMED

- **What:** Verified: AdminMessage.imageUrl exists and points at an uploaded R2 screenshot (schema.prisma:677 `imageUrl String? // one optional screenshot`). The sweep's adminMessages step (retention.ts:111-115) is a bare `prisma.adminMessage.deleteMany({ where: { createdAt: { lt: cutoff(730) } } })` — it never reads imageUrl and never queues into PendingImagePurge. Contrast: the account-purge path DELIBERATELY collects admin-thread screenshots (account-purge.ts:109-112 selects imageUrl from every message in the member's threads and createMany's them into PendingImagePurge at 266-269), proving the system treats these bytes as purge-worthy. Once the sweep deletes the rows, collectImageUrls can no longer enumerate them, so the R2 objects orphan permanently, unfindable — exactly the H9 class this subsystem exists to close. LATENT like C-062 (needs a 730-day-old message), but the consequence is a perman
- **Fix:** Make the adminMessages step a transaction that findMany's the due rows' imageUrls, pendingImagePurge.createMany's the non-null ones (reason:'retention'), then deleteMany — the same collect-then-delete shape declinePhoto/deletePost/purge use.
- **Gate:** Test asserting the adminMessages sweep step enqueues each deleted message's imageUrl into PendingImagePurge before deleting the row.

#### C-066 — Blank-MIME images (explicitly supported per audit Low 41) are hard-refused by the direct upload path instead of falling back
`src/app/api/upload/presign/route.ts:75` · CONFIRMED

- **What:** Verified. presign/route.ts:75 does `contentType ? EXT_BY_TYPE[contentType] : undefined`; an empty MIME string is falsy → ext undefined → 400 with 'That photo format isn't supported...' (:79-86). directUploadPut (upload-client.ts:45) does `if (status===400 && presign.error) throw new Error(presign.error)` — a hard throw, not a null-fallback, so the caller surfaces the message and stops. Meanwhile isImageFile (upload-shared.ts:40-43) deliberately ACCEPTS a blank type when the filename extension is an image (the audit Low 41 fix, whose comment explicitly says refusing blank-MIME 'left the member holding a photograph the site would not take'). So a valid JPEG that a mobile browser reports with an empty MIME passes the client's own is-an-image check, then is hard-refused at presign with a wrong 'unsupported format' message and never falls back to the byte-sniffing classic route. Since R2 is c
- **Fix:** In presign, when contentType is empty/outside EXT_BY_TYPE but the request is otherwise valid, answer {direct:false} so the client falls back to the classic route that sniffs real bytes; or have directUploadPut return null (fall back) rather than throw when the 400 is specifically the unsupported-format message for a blank contentType.
- **Gate:** A test that a presign call with contentType:'' returns direct:false (or that the client falls back), and an e2e upload of a blank-MIME JPEG succeeds.

#### C-067 — contributePhotoDirect reads unrotated metadata (its comment lies): EXIF-portrait photos over 40MP are over-shrunk to roughly half the pixel budget
`src/app/(main)/collection/actions.ts:375` · CONFIRMED

- **What:** The comment lies and the code over-shrinks EXIF-rotated large photos. Confirmed against the installed sharp 0.35.3: metadata() calls sharp.metadata(this.options) (dist/input.cjs) which reads the INPUT header and does NOT execute pending pipeline ops, so `.rotate().metadata()` returns the same width/height as `.metadata()`; the type defs (index.d.ts:1233-1235) state width/height are 'EXIF orientation is not taken into consideration', with the upright values only in `.autoOrient.width/height` (:1238-1242). So at collection/actions.ts:375-376, `upright` holds STORED (unrotated) dims, contradicting the comment at :373-374. For orientation 5-8 the areaFit box is transposed relative to the actual rotated pipeline image. Worked example: 8160x6144 stored, orientation 6 (50.1MP): areaFit={7287,5487} (landscape); the rotated image is 6144x8160 (portrait); `.resize(7287,5487,{fit:'inside'})` scales
- **Fix:** Compute areaFit from the upright dimensions: `const upright = await sharpImage(original).rotate().metadata(); storedPixelFit(upright.autoOrient.width, upright.autoOrient.height)` (or just autoOrient.*), and correct the comment.
- **Gate:** A local sharp test: generate 8160x6144 with EXIF orientation 6, run the resize block, assert output pixels are within ~5% of 40MP (currently ~22.7MP).

#### C-075 — Grace-period purge races sign-in cancellation: account erased after the member cancelled
`src/lib/retention.ts:240` · CONFIRMED

- **What:** Verified TOCTOU. The sweep reads the due list once (retention.ts:225-238, WHERE deletionRequestedAt < cutoff(60)) then loops purgeUserAccount(row.id) sequentially (240). purgeUserAccount's transaction (account-purge.ts:261-290) calls tx.user.delete at 281 with NO condition on deletionRequestedAt. Meanwhile a sign-in during the grace window IS the cancel gesture and is AWAITED: auth.ts:202-206 clears deletionRequestedAt to null (and the comment at 199-201 explicitly says 'signing someone in while their purge date still stands is the one wrong outcome here'). Because the purge tx runs READ COMMITTED with no predicate on the column, the interleaving sign-in's committed UPDATE conflicts with nothing, so a member who signs in between the findMany and their turn in the loop is purged anyway — irreversible loss of rows and R2 bytes after the product told them the deletion was cancelled. Window:
- **Fix:** When purgeUserAccount is invoked from the sweep, gate the delete on the request still standing — e.g. inside the tx do a conditional `deleteMany({ where: { id: userId, deletionRequestedAt: { lt: cutoff } } })` (or a `findUnique` re-check) and treat count 0 as 'cancelled, skip'. adminDeleteUser must stay unconditional (an admin's deliberate delete has no deletionRequestedAt), so pass a flag or use a separate entry point.
- **Gate:** Test: seed a due user, clear deletionRequestedAt mid-flight, run the sweep, assert the user row survives and no account.purge audit was written.

#### C-084 — Duplicate/out-of-order payment.captured resurrects a refunded contribution to "paid" (and re-grants a bird pick)
`src/app/api/razorpay/webhook/route.ts:164` · CONFIRMED

- **What:** Confirmed against the code. Webhook captured branch at src/app/api/razorpay/webhook/route.ts:163-164 is updateMany({ where: { id, status: { not: "paid" } }, data: { status: "paid", paidAt: new Date(), failureReason: null, method, razorpayPaymentId } }). 'refunded' and 'disputed' both satisfy status != 'paid', so a re-delivered payment.captured (Razorpay retries any delivery it did not 2xx, plus the dashboard 'resend webhook' button) landing after a refund flips the terminal row back to 'paid' with a FRESH paidAt. Consequences all verified: every money sum filters status='paid' (support/page.tsx:41, actions.ts:226, admin-analytics.ts:280, admin/support/page.tsx:81), so the returned gift re-counts in the public recovery bar and 'Given, all time'; the fresh paidAt > birdPickedAt makes chooseBird's regrant query (actions.ts:244-249) mint a new bird pick; and moved.count===1 fires the 'Your c
- **Fix:** Two distinct changes. (1) Resurrection: narrow route.ts:164 from status:{ not:'paid' } to status:{ in:['created','failed'] } so refunded/disputed are terminal (apply the same narrowing to confirmContribution, C-085). (2) Refund-before-capture lost (mirror / C-151): when refund.processed or dispute.created finds the row not-yet-paid, do not silently 200-and-drop — persist the pending reversal so it applies once capture lands, or return a non-2xx so Razorpay redelivers after capture, and write an 
- **Gate:** New webhook state-machine test (node --test) asserting: a payment.captured cannot move a row out of 'refunded'/'disputed'; and a refund.processed on a 'created' row is recorded/deferred, not dropped.

#### C-085 — confirmContribution can be replayed after a refund to restore "paid" and mint a fresh bird pick
`src/app/(main)/support/actions.ts:181` · CONFIRMED

- **What:** Confirmed and distinct from C-084 (different writer, different trigger; C-084 covers only the webhook). confirmContribution at src/app/(main)/support/actions.ts:181-185 is check-then-write: if (contribution.status !== "paid") { update({ status: "paid", paidAt: new Date() }) }. Any non-paid state — including terminal 'refunded'/'disputed' — transitions back to 'paid'. The idempotency token is the HMAC triple (order_id, payment_id, signature); verifyPaymentSignature (actions.ts:159) is HMAC(orderId|paymentId) with no timestamp/expiry, so it is valid forever and was handed to the payer's own browser at checkout (visible in their network tab). The ownership check (actions.ts:176) passes because it is their own row. So a member who gives ₹500, spends the pick, then obtains a refund can replay confirmContribution with their saved triple: row returns to 'paid' with paidAt=now, the refunded amou
- **Fix:** Replace the guard at actions.ts:181 with a positive predicate that only admits the source states: transition to 'paid' only when contribution.status is 'created' or 'failed' (mirror of the C-084 webhook fix). Refunded/disputed must be a no-op.
- **Gate:** Unit test on confirmContribution's transition predicate (or the shared state-machine test from C-084) asserting a refunded/disputed row stays put when confirm is replayed.

#### C-087 — A partial refund un-counts the entire contribution: refund.processed never reads the refund amount
`src/app/api/razorpay/webhook/route.ts:229` · CONFIRMED

- **What:** Confirmed. The refund branch (route.ts:222-245) flips the WHOLE row to status:'refunded' on any refund.processed, and the audit detail says '${contribution.amount} paise no longer counted as given' (route.ts:243) — the FULL contribution amount. Nothing reads the refund amount: the WebhookPayment type (route.ts:64-70) models only the payment entity, not event.payload.refund.entity.amount, and event is typed at route.ts:114 with no refund payload at all. Since every sum filters status='paid' (support/page.tsx:41 etc.), a partial refund (e.g. ₹100 back on a ₹5,000 gift, one text field in the Razorpay dashboard) erases the entire ₹5,000 from the public recovery bar, 'Given, all time', the month tile, and the member's perk ledger — the paid sum in chooseBird (actions.ts:224-233) can drop below PERK_MIN_PAISE over a token partial refund. Reachable by an ordinary owner dashboard action. Medium:
- **Fix:** Parse event.payload.refund.entity.amount. For a partial refund, do not move the row to 'refunded'; instead subtract the refunded paise (a refundedAmount column, or a separate ledger row) so sums count amount minus refunded. Reserve the full 'refunded' transition for refund.amount === contribution.amount. Audit the actual refunded amount, not contribution.amount.
- **Gate:** Unit test feeding a refund.processed payload with refund.amount < contribution.amount and asserting the counted total drops by exactly the refunded paise, not the whole gift.

#### C-091 — City facet filter and map 'See all' return zero results for any stored city whose string differs from its normalized form by more than case (accents, comma-qualified free-typed entries)
`src/app/(main)/directory/where.ts:79` · CONFIRMED

- **What:** Write path preserves accents: location-picker.tsx:90 (toSelection) writes city: result.name verbatim (GeoNames bare name, e.g. 'Zürich'), and place-input.ts:79 (resolvePlaces) only titleCases — no ASCII fold. Facet options come from userPlace.groupBy raw city (page.tsx:328-333), so the dropdown offers 'Zürich'. Selecting it -> buildDirectoryWhere city branch (where.ts:65-81): cityNameVariants -> normalizeCity -> normalizePlaceString NFKD-strips the accent to 'zurich' (city-coords.ts:106-119), then compares { city: { equals: 'zurich', mode: 'insensitive' } } (where.ts:80). Postgres ILIKE folds CASE only, never accents, so 'Zürich' != 'zurich' -> zero rows. Same for comma-qualified legacy rows: normalizeCity strips the ', Minnesota' tail so 'northfield' can never equal stored 'Northfield, Minnesota'. The person still plots on the map (placeCoords uses the row's own lat/lng, page.tsx:84), a
- **Fix:** Normalize on BOTH sides of the comparison: either store a folded/ascii city alongside the raw display string and filter the facet against that, or compare normalizePlaceString(city) on the stored side too (e.g. a lower(unaccent(city)) expression) so a facet option always matches the rows that produced it.
- **Gate:** Unit test on buildDirectoryWhere: a UserPlace seeded with an accented and a comma-qualified city is matched by its own facet value.

#### C-108 — DRAIN_LEASE_MS (45s) is shorter than a worst-case pass (8 sends x 10s timeout ≈ 80s+), so the one-pass-at-a-time guarantee lapses exactly during provider brownouts
`src/lib/email-queue.ts:602` · CONFIRMED

- **What:** Arithmetic and control flow confirmed on committed constants. BATCH=8 (email-queue.ts:92) x SEND_TIMEOUT_MS=10_000 (email.ts:77) = 80s worst-case pass, well over DRAIN_LEASE_MS=45_000 (email-queue.ts:602). The lease is taken once in drainMailQueue (:660) and drainWithLease's loop (:704-744) never re-checks or renews it; takeDrainLease fences only on `expiresAt: { lte: now }` (:616-617), so expiry alone hands the lease over while the first pass is still alive and sending. During a Resend brownout (the exact B-072 condition the lease exists for) pass 1 runs ~80s, the lease lapses at 45s, a concurrent page-view after() takes it, and two-plus passes run in parallel — reopening the self-inflicted 429 storm and burning deferrals across rows faster. Per-row claims (claimAndSend conditional updateMany) still prevent same-row double-sends, so the damage is rate-storm + accelerated deferral burn, 
- **Fix:** Set DRAIN_LEASE_MS >= BATCH * SEND_TIMEOUT_MS + margin (e.g. match STALE_CLAIM_MS = 120_000), or renew/re-check the lease each loop iteration in drainWithLease.
- **Gate:** Add a unit assertion importing the constants: DRAIN_LEASE_MS >= BATCH * SEND_TIMEOUT_MS (beside mail-policy.test.mjs's pass-timing assertions).

#### C-124 — Feed infinite scroll dies silently when the keyset cursor post is deleted (or leaves the visible set); loadComments has the same hole — the M39 fallback was added to the directory only
`src/app/(main)/feed/actions.ts:1114` · CONFIRMED

- **What:** loadPosts recent-sort (feed/actions.ts:1105-1118) passes `cursor: { id: keysetCursor }, skip: 1` with no recovery. The project's own verified M39 record (directory/actions.ts:77-105) states on THIS exact stack: 'Prisma's cursor needs the row it names to be INSIDE the filtered set... this query answers nothing.' The feed where-clause filters isHidden:false, PUBLISHED_ONLY, AUTHOR_IN_GOOD_STANDING; if the cursor post (the last row of the prior page) is hard-deleted (deletePost, member-facing), admin-hidden, or its author blocked between two page loads, the next page returns [], hasMore=false, nextCursor=null — infinite scroll silently ends with older posts unreachable until a full reload. loadComments (:1405-1415, root cursor leaving VISIBLE_COMMENT) and getNotifications (notifications/actions.ts:30-35, another device's KEEP=100 prune) share the shape. The directory got the M39 offset-fall
- **Fix:** Port the M39 recovery to loadPosts/loadComments/getNotifications: when a cursored page returns empty, verify the cursor row still matches the filter, and if not, fall back to a `loaded`-based offset page.
- **Gate:** Test deleting a cursor row mid-scroll and asserting the next page still returns rows.

#### C-133 — Back/forward navigation restores stale like/love state on letters/[id] and collection/[id], and one tap then silently inverts the member's real state
`src/app/(main)/feed/actions.ts:697` · CONFIRMED

- **What:** Three verified facts compose. (1) toggleLike (feed/actions.ts:697-703) and togglePhotoLove (collection/actions.ts:559-585) deliberately call NO revalidatePath (heart scroll-jump fix), so the client Router Cache entry for the server-rendered detail page (letters/[id], collection/[id]) is never purged. (2) Next 16 reuses the cached RSC payload on browser back/forward (glossary/staleTimes docs cited). (3) LetterEngagement.handleLike (letter-engagement.tsx:40-50) and PhotoLoveButton.handle (photo-love-button.tsx:24-40) seed useState from server props and, on tap, set only the optimistic next value — they IGNORE the returned {liked/loved:false}, so the inversion is never reconciled. Navigating away and pressing Back re-mounts the detail component from the pre-like payload (heart empty, old count); the client like-state is gone because it never touched the payload. Tapping the stale-empty hear
- **Fix:** Have handleLike/handle adopt result.liked/result.loved (and reconcile the count) from the action response instead of trusting the optimistic value; or revalidate the detail path only (detail pages have no feed-style scroll-jump exposure).
- **Gate:** Test/interaction asserting the heart state after back/forward matches the DB, and that the handler adopts the server-returned liked/loved.

#### C-134 — Unauthenticated /_next/image plus the *.r2.dev wildcard remotePattern is an open image-optimization amplifier billed to the owner
`next.config.ts:215` · CONFIRMED

- **What:** Verified. next.config.ts remotePatterns includes { protocol:'https', hostname:'*.r2.dev' } (213-216) with no pathname restriction, and proxy.ts's matcher excludes _next/image (322) with no other auth guard on the endpoint (grep confirms), so /_next/image is reachable anonymously. Because pub-<hash>.r2.dev public buckets are free and self-serve on the r2.dev suffix, an attacker can host arbitrarily large images on their own bucket and drive /_next/image?url=https://pub-<attacker>.r2.dev/<unique>.png&w=<size> in a loop; each unique source URL is a fresh fetch+decode+transform on the owner's Vercel image-optimization quota/billing. Next 16 clamps w/q, which caps output dimensions but NOT the per-unique-source billing/CPU dimension the attack exploits. next/image is actively used (bird-avatar.tsx:665 routes member photoUrl through it; also login/signup), so quota exhaustion also degrades leg
- **Fix:** Replace the { hostname:'*.r2.dev' } remotePattern with the single historical host pinned in upload-shared.ts:80 (pub-a656209a5438484f9694738260255a5e.r2.dev), matching that file's deliberate exact-host choice. Optionally tighten the img-src/connect-src '*.r2.dev' CSP wildcards to the same exact host.
- **Gate:** A next.config test asserting no image remotePattern uses a wildcard r2.dev hostname (only the exact legacy host or images.rishivalley.space), pinned alongside the existing security-regressions suite.

#### C-135 — Permissions-Policy payment=() may block PaymentRequest-based methods (Google Pay / UPI intent) inside Razorpay checkout
`next.config.ts:116` · SUSPECTED

- **What:** The header is real and its inheritance semantics are sound, but the scenario is unverifiable from code. next.config.ts:117 sets Permissions-Policy payment=() on /:path* (128), which per spec disables the W3C Payment Request API for the document AND all nested browsing contexts regardless of any iframe allow attribute. Razorpay checkout is loaded via checkout.js and opened with `new Razorpay(options)` (support-contribute.tsx:80,192), i.e. an injected modal iframe that IS a nested context of rishivalley.space, so payment=() would govern it — and the header comment 'Powerful features nothing here uses' is factually contradicted by the site integrating a payment provider. What cannot be settled from code: (a) whether Razorpay's checkout actually invokes new PaymentRequest() for its Google Pay / UPI-intent flows (it may use a redirect/popup or the Google Pay JS API path instead), and (b) whet

#### C-141 — Catch-up 'days left' disagrees across surfaces: index/status/reminders count 24h blocks, answer page counts valley calendar days
`src/lib/catchups.ts:705` · CONFIRMED

- **What:** Verified the lib-level split. daysUntilLabel (catchups.ts:700-708) computes days = Math.ceil(diff/DAY_MS) — a 24h-duration count — and feeds editionCountdownLabel (711-722) and describeEditionStatus (724-751). Those render member-facing on the /catchups index (page.tsx:164, via describeEditionStatus) and the Catch-up home masthead ([catchupId]/page.tsx:371, via editionCountdownLabel), plus not-yet-published.tsx. The daily reminder copy (catchups-notify.ts:194-196) uses `days` from daysLeftUntil (catchups.ts:186-193), also Math.ceil duration. Meanwhile the answer page's closesLabel (answer/page.tsx:56-69) counts valleyDaysBetween (utils.ts:669-673) — valley CALENDAR days — a deliberate audit-Low-28 fix commented at 60-64. So for answersCloseAt = 07:30 IST on day D: at ~20:00 IST on D-1, diff ~11.5h -> daysUntilLabel='last day' / daysLeftUntil=1 -> bell 'Last day to answer', while valleyDa
- **Fix:** Route daysUntilLabel / editionCountdownLabel / describeEditionStatus and the reminder text through valley calendar-day counting (the same valleyDaysBetween conversion closesLabel already uses) so every countdown surface agrees. Note daysLeftUntil is ALSO used to seed the reminder daily bucket (answeringPatch:474, extendPhasePatch:499) and to key dueReminder — the safe change is to fix only the member-visible STRINGS to valley days and leave the bucket arithmetic, or unify both consistently; do n
- **Gate:** Unit test asserting daysUntilLabel/editionCountdownLabel agree with the answer page's closesLabel for an answersCloseAt anchored at a cron instant, swept across `now` values that straddle both valley-midnight and the anchor hour.

#### C-149 — advanceEdition swallows engine failures with console.error only, bypassing the M09 Sentry reporter
`src/lib/catchups.ts:1089` · CONFIRMED

- **What:** advanceEdition's catch (catchups.ts:1087-1090) does only console.error('[catchups] advanceEdition failed', err); it never calls the file's own report()/reportSwallowed helper (catchups.ts:71-77). Because advanceEdition never re-throws, the reportSwallowed calls in advanceDueCatchups (catchups.ts:1200) and openNextRoundIfDue's wrapper (catchups.ts:1190) cannot see a per-edition failure - round-OPENING failures are reported, round-ADVANCING failures are not, so the M09 fix is half-applied. report-error.ts's own docblock states the exact failure mode and there is no captureConsole integration (the whole reportSwallowed mechanism exists because console.error on Vercel does not reach Sentry). So a repeatable error inside applyEditionAction (a notify create throwing inside the shared transaction at 960-1001, a constraint violation, a 20s query timeout) is reduced to a Vercel log line: the edit
- **Fix:** In advanceEdition's catch, replace console.error with `await report("catchups", err, { step: "advanceEdition", editionId: edition.id })` (report() already exists in this file), keeping the swallow but adding the Sentry report, matching advanceDueCatchups and openNextRoundIfDue.
- **Gate:** A source-level assertion/test that advanceEdition's catch routes through reportSwallowed, not a bare console.error (same shape as security-regressions pins).

#### C-161 — Launch-day verify-mail backlog: last confirmation sends ~3 days after signup at 300 signups, while the banner promises tomorrow's UTC midnight to everyone
`src/lib/email-queue.ts:874` · CONFIRMED

- **What:** The banner-ETA half is a real defect; the backlog-capacity half restates an already-accepted constraint. Verified: effective verify budget is 75/day (email-queue.ts:76 DAILY_CAP=95 minus :87 RESET_RESERVE=20; dailyBudget:406 verifyRemaining = remaining-20). verificationMailState (email-queue.ts:872-874) returns { state:'queued', sendingAt: nextBudgetResetAt() } whenever verifyRemaining<=0, and nextBudgetResetAt (781-785) is pure calendar arithmetic — Date.UTC(y,m,d+1) — with NO queue-depth term. verify-email-banner.tsx:44-58 (sendTimeLabel) renders that ISO as a concrete clock time and line 189 prints 'Your link goes out tomorrow at 5:30 am'. Drain is oldest-first within priority (drainWithLease:734 orderBy priority asc, createdAt asc), so a signup past position ~150 on a >150-signup launch day genuinely waits 2+ UTC days while being shown 'tomorrow'. The ETA is wrong and self-corrects o
- **Fix:** Compute sendingAt from queue position: ceil((count of eligible verify rows ahead of this one) / 75) days forward from the next UTC reset, instead of always nextBudgetResetAt(). Independently, raising the Resend plan before launch removes the backlog. Do not change the banner copy without changing the source value in verificationMailState.
- **Gate:** Unit test on a pure sendingAt-from-queue-depth helper: N rows ahead at 75/day must yield ceil(N/75) days, not a constant.

#### C-162 — Feed load-more dies silently when the cursor post is deleted, hidden, or its author blocked (no M39-style recovery, unlike directory and admin people)
`src/app/(main)/feed/actions.ts:1114` · CONFIRMED

- **What:** The Prisma cursor-at-vanished-row mechanism is proven by the codebase itself. directory/actions.ts:77-105 documents and fixes exactly this (audit M39): 'Prisma's cursor needs the row it names to be INSIDE the filtered set... this query answers nothing for a list with hundreds of rows left', and recovers when rows.length===0 && cursor by re-checking cursor membership and falling back to skip:loaded. The feed keyset branch (feed/actions.ts:1109-1118) does cursor:{id:keysetCursor}, skip:1 with NO such recovery; hasMore (1116) then computes false and nextCursor null, so infinite scroll ends silently though older posts remain. The feed where includes isHidden:false and AUTHOR_IN_GOOD_STANDING (posts.ts:60 = {author:{isBlocked:false}}) plus the deleted-post case, so the exact page-boundary post (the PAGE_SIZE-th, whose id is nextCursor) can leave the set via own-delete, a moderator hide, or th
- **Fix:** Mirror directory/actions.ts:91-105 in the feed keyset branch and loadComments: when rows.length===0 && cursor, re-check the cursor still satisfies where; if not, re-query with skip set to the loaded count (offset fallback).
- **Gate:** e2e/unit like the existing directory M39 guard: deleting the boundary row must still return the next page, not an empty one.

#### C-163 — Visit rows are minted from a client-controlled cookie with no throttle: an authed member can create one row per request forever, or write into another member's Visit row
`src/lib/last-seen.ts:119` · CONFIRMED

- **What:** Both mechanisms verified. proxy.ts:296-301 takes the visit id from the member's own rv-visit cookie, accepting ANY string matching /^[0-9a-z-]{8,64}$/, and stamps it into x-visit-id. last-seen.ts:115-161 upserts prisma.visit on that id on every authenticated layout render (last-seen.ts:8-9 'Called from the (main) layout... on EVERY authenticated page'); the update branch (141-160) is scoped only to {id:visitId}, never to userId. rate-limit.ts LIMITS (35-100) has NO limiter for page GETs or presence — only login/signup/reset/trivia/posts/comments/uploads/reports/catchups/contributions/reauth/export/search — so nothing throttles Visit creation. (1) An authed member rotating the cookie value per request mints one new Visit row per GET, uncapped: ~660k rows (~500MB at ~750B/row measured in db-sizes-live.json) fills the free-tier disk and takes the DB read-only for everyone. (2) The unscoped 
- **Fix:** Derive the visit id server-side from a hash of (userId, 30-min bucket) rather than trusting the cookie, OR scope the upsert to (id AND userId) so a replayed/foreign id cannot update another's row, plus a per-user daily Visit-row cap.
- **Gate:** Test: a request whose x-visit-id names a row owned by another userId must not update that row; a per-user row cap must hold under a rotating-cookie loop.

#### C-164 — Visit table alone approaches the 500MB Supabase free-tier cap at the 2,000-user target (Place already spends 97MB of it)
`prisma/schema.prisma:1060` · CONFIRMED

- **What:** Structural point verified against live numbers. Visit (schema.prisma:1060-1109) is one row per session with ~19 columns (8 free-text) and 3 indexes (PK, @@index([endedAt]), @@index([userId,endedAt])), written by touchLastSeen on every authed render, deleted only when endedAt<now-180d (retention.ts:58 presence=180, :147-151). Unlike ContentView, which schema.prisma:1150-1156 was DELIBERATELY made a bounded counter with the exact reasoning '2,000 members at twenty views a day is 14M rows a year, which is gigabytes on a 500MB plan', Visit was never run through that plan arithmetic. Measured cost is 184kB/243 rows (db-sizes-live.json) = ~757B/row incl. indexes. The project's own stated scale (last-seen.ts:22-23: 2,000 members x 30 views/day) at ~8 views/session is ~7.5k visits/day x 180d ≈ 1.35M rows; even at a conservative 400-500B/row that is ~540-675MB for Visit alone, on top of Place's 9
- **Fix:** Halve presence retention from 180 to 90 days (retention.ts:54-57 records the deepest analytics read is 90 days, so no answer shortens), or upgrade the Supabase plan before scaling. Change the window in docs/SECURITY.md retention table first per retention.ts:9-11.
- **Gate:** Capacity checklist item; optionally a test that KEEP_DAYS.presence matches the deepest analytics lookback.

#### C-175 — Letter autosave timer races an explicit Publish/Save: its in-flight guard reads stale closure state
`src/components/posts/create-post-form.tsx:314` · CONFIRMED

- **What:** The autosave timer callback (create-post-form.tsx:313-318) guards with `if (submitting || savingDraft) return;`, reading those from the closure of the effect that armed it, whose deps are [content, title, images, postId] (:367, eslint-disabled). setSubmitting(true) inside handleSubmit re-renders but does NOT re-run that effect (submitting is not a dep), so the already-armed timer's closure still sees submitting=false and proceeds. handleSubmit (:636-643) only awaits an autosave that has already STARTED (autosaveRunRef) and never clears autosaveTimer.current. So a timer armed by a keystroke within 2.5s of a Publish click fires mid-publish and issues a second editPost carrying baseUpdatedAtRef; if it fires while handleSubmit's own editPost is still in flight both writes carry the same base, and editPost's updateMany precondition (:596-606, where updatedAt=base) makes exactly one return 'Th
- **Fix:** Have the timer guard read submittingRef.current, and/or have handleSubmit clearTimeout(autosaveTimer.current) before awaiting autosaveRunRef.
- **Gate:** Test that a Publish/Save cancels or excludes any pending autosave so only one versioned editPost is in flight.

#### C-176 — Autosave never persists an audience-only change and can save a stale cityScope: audienceCity is missing from the autosave effect's deps
`src/components/posts/create-post-form.tsx:328` · CONFIRMED

- **What:** The autosave effect deps are [content, title, images, postId] (create-post-form.tsx:367) and omit audienceCity, which runAutosave sends unconditionally via `fd.set('cityScope', audienceCity ?? '')` (:328) from the effect closure. The audience picker IS present on the resumed-draft desk: letters/[id]/edit/page.tsx passes userPlaces={cities} and initialCityScope (:61,:66) through to the composer, and audienceOptions = userPlaces (:181) renders the picker (:1088-1131) for any member with cities. So (a) picking or clearing an audience with no subsequent typing never re-runs the effect, never arms a timer, and is never autosaved — the desk keeps saying 'Saved' while the choice is unsaved, and abandoning the tab loses it (the B-048 scenario returns); (b) a timer armed by an earlier keystroke fires with the stale closure audienceCity and writes the OLD scope. Only an explicit Publish/Save (hand
- **Fix:** Add audienceCity to the autosave effect deps (and its equivalent to the localStorage belt) so an audience change schedules an autosave and the timer closure captures the current value.
- **Gate:** Test that changing the audience alone triggers an autosave carrying the new cityScope.

#### C-177 — Letters desk loses everything typed since the last 2.5s idle pause on navigate/close: no flush on unmount, no beforeunload/pagehide, and resumed drafts have no local belt except on save failure
`src/components/posts/create-post-form.tsx:363` · CONFIRMED

- **What:** Both persistence paths are idle-debounced and neither flushes on teardown. The resumed-draft autosave (create-post-form.tsx:301-367) and the fresh-letter localStorage belt (:263-267) fire only after 2.5s of idle, each timer restarts on every keystroke, and each effect cleanup (:363-365 and :266) clearTimeout's the pending write on unmount WITHOUT executing it. There is no beforeunload/pagehide/visibilitychange flush anywhere in src (grep: only motion.tsx and lab/_kit.tsx use visibilitychange, neither for the composer). For a resumed draft writeLocalDraft runs ONLY in runAutosave's failure branch (:354), so during successful typing nothing but React state holds the delta. So writing fluently (keystrokes <2.5s apart) and then clicking 'All letters', Back, or closing the tab discards every word since the last >=2.5s pause silently, while the chrome still shows 'Saved' — the exact B-043 'cra
- **Fix:** Flush the pending write in the effect cleanup and add a pagehide/visibilitychange('hidden') handler that persists synchronously (autosave for resumed drafts, localStorage belt for fresh ones).
- **Gate:** Test/interaction asserting a mid-burst navigate-away persists the unsaved text.

#### C-179 — Collection 'Load more' lacks the stale-response generation guard its two siblings have: a filter change mid-flight stitches two result sets together
`src/components/collection/collection-client.tsx:174` · CONFIRMED

- **What:** Verified. collection-client.tsx has no generation/stale-response guard on load-more, unlike its siblings post-feed.tsx (listGeneration) and directory-client.tsx. handleLoadMore (:174-192) captures `next=page+1` and appends unconditionally with `setPhotos(prev => [...prev, ...data.photos])` (:183) and adopts the response's hasMore/total/page (:184-186); it has no `cancelled` flag (the filter effect at :148-172 has one only for ITS OWN fetch). So if the user changes When/Part-of-school/search/sort while a Load-more is in flight: the filter effect fires (setLoading(true), setPage(0), fetch page 0 of NEW filters, setPhotos(newData)), then the in-flight OLD-filter response resolves and appends the old query's page onto the new page-0 set — interleaving two different result sets, setting total to the old query's count, and setting page to the OLD next value against the NEW filters so every sub
- **Fix:** Mirror post-feed's listGeneration: bump a ref in the filter effect, capture it in handleLoadMore, and ignore the response if the ref changed; also dedupe the append by id. fetchPage identity already changes with filters, so the guard can key off that.
- **Gate:** An e2e (or unit with a delayed action) asserting a filter change during an in-flight Load-more discards the stale page and leaves total/page consistent with the new filters.

#### C-187 — credentialVersion session-revocation comparison has no test anywhere
`src/lib/auth.ts:314` · CONFIRMED

- **What:** Verified: grep for `credentialVersion` across every *.test.mjs (54 files) returns zero hits. The whole session-revocation loop lives inline in the NextAuth callbacks: stamped at src/lib/auth.ts:246/274 and compared at src/lib/auth.ts:314 `if (!dbUser || dbUser.isBlocked || (dbUser.credentialVersion ?? 0) !== (token.credentialVersion ?? 0))`. security-regressions.test.mjs pins C1 (lines 24-65) and C2 (69-95) and M1 (99-111) shapes in the same file but never this line. Nothing imports the predicate (it is inline), so no unit test sweeps it. A flipped `!==`→`===`, a dropped `dbUser.isBlocked` clause, or a `select` that stops reading credentialVersion would leave every blocked/deleted/password-reset session live for the 30-day JWT window and pass `npm run check` and CI. The behavioural 'Phase 2 probe' the code comment cites (auth.ts:244) is a one-time proof, not part of the gate. Corrected f
- **Fix:** Extract the three-clause predicate into a pure src/lib/session-revocation.ts (no request-scope deps) and add a test pinning: blocked row → invalid; bumped credentialVersion → invalid; null/undefined token version treated as 0 (legacy token, valid); deleted row (null dbUser) → invalid. Or, minimally, add a shape pin in security-regressions.test.mjs asserting auth.ts still contains the `isBlocked` and `credentialVersion ?? 0 !== token.credentialVersion ?? 0` clauses.
- **Gate:** New src/lib/session-revocation.test.mjs (behavioural) or an added shape assertion in security-regressions.test.mjs, run by the existing `tests` gate in check.mjs.

#### C-193 — C2 ownership-gate sweep pins 2 of the 3 write paths that accept image URLs; messages/actions.ts is unswept
`src/lib/security-regressions.test.mjs:86` · CONFIRMED

- **What:** Confirmed, and the drift has ALREADY happened. security-regressions.test.mjs:86-89 sweeps only [feed/actions.ts, catchups/actions.ts] for `ownedUploadUrls`, under a test NAMED 'C2: every write path that accepts image URLs runs the ownership gate'. But grep shows three source files call ownedUploadUrls: feed, catchups, AND src/app/(main)/messages/actions.ts (import line 14, call line 55). messages/actions.ts accepts caller-supplied imageUrl into AdminMessage rows on all three write paths — startThread (line 95), replyToThread (line 140), adminReplyToThread (line 192) — each funnelled through parsePayload() which runs the ownedUploadUrls check (lines 54-62). So C2 is currently ENFORCED on messages (no live vuln — the shared helper is a robust single choke point), but the test's name promises coverage it does not have: a refactor dropping the ownedUploadUrls call from parsePayload regresses
- **Fix:** Add src/app/(main)/messages/actions.ts to the loop at security-regressions.test.mjs:86, or better derive the list — for every `src/**/actions.ts` that writes prisma rows and references imageUrl/images, assert it contains ownedUploadUrls, with named exemptions.
- **Gate:** security-regressions.test.mjs C2 sweep, list extended or derived; verify by deleting the messages ownedUploadUrls call.

#### C-194 — No test pins that interaction actions actually CALL the visibility guard (the H3 wiring)
`src/lib/post-visibility.ts:90` · CONFIRMED

- **What:** Confirmed: no test pins the H3 WIRING. grep for `canViewPost` across all *.test.mjs = 0 hits. post-visibility-rule.test.mjs exhaustively tests the pure `decidePostVisibility` rule (311 lines of attacks) but never asserts that the interaction actions CALL it. In feed/actions.ts only 6 of the 17 exported actions consult the guard (canViewPost at lines 366, 635, 713, 757, 1398; canViewPostOfComment at 1316). H3's actual bug was five interaction paths acting on a postId WITHOUT the visibility check — i.e. the wiring, which the pure-rule test cannot cover. A new interaction path (a reaction, a share, a report-with-quote) taking a postId and skipping the guard would leak private-group/city/batch content by id with every test green — and this codebase demonstrably grows such paths (toggleCommentLike was added exactly this way). Same untested-security-wiring class as C-187; Medium (regression ve
- **Fix:** Add a gate-coverage-style sweep: for each exported action in feed/actions.ts (and any actions file) whose body references a `postId`/`commentId` parameter, assert the body contains canViewPost|canViewPostOfComment OR is on a written exempt list (createPost, deletePost, loadPosts, markFeedSeen, ...), each exemption reasoned. Reuse the balanced fnBody from gate-coverage.test.mjs.
- **Gate:** New sweep in post-visibility-rule.test.mjs or its own file, under the `tests` gate.

#### C-198 — /ingest PostHog reverse proxy forwards members' live session cookies to a third party
`next.config.ts:190` · SUSPECTED

- **What:** The browser half is essentially certain: posthog-js fires against the same-origin /ingest path (next.config.ts rewrites), fetch's default credentials is 'same-origin' so cookies including the HttpOnly __Secure-authjs.session-token ARE attached, and proxy.ts lists /ingest as public so signed-in requests pass through with cookies intact. The local (self-hosted next start) proxy DOES forward them: proxy-request.js:30-41 builds httpxy ProxyServer with changeOrigin:true and adds only x-forwarded-host -- it never strips Cookie, so httpxy relays the incoming request headers (Cookie included) to eu.i.posthog.com. What CANNOT be settled from the repo is the PRODUCTION path: on Vercel the external rewrite is served by Vercel's own proxy infrastructure, not this Node code, and whether Vercel forwards or strips the Cookie header on an external rewrite is not determinable from source here. Severity d
- **Proof to settle:** Runtime check (production, signed in): open DevTools Network, pick any /ingest/* request (e.g. /ingest/e or /ingest/decide) and read the outgoing Cookie request header -- confirm it carries __Secure-authjs.session-token (proves the browser half). Then confirm the server half: either (a) a request-capture endpoint temporarily set as the /ingest rewrite target on a non-prod deploy, loaded while sign
- **Fix:** n/a until live

### Low severity (131)

Compact table; full per-id record (finder argument + validator reasoning + fix + gate) in `verdicts-merged.json`.

| ID | File | Issue | Fix gist |
|---|---|---|---|
| C-001 | `report-action.ts:91` | reportPost skips the post-visibility rule every other post interaction enforces, leaking e | Call canViewPost(postId, session.user) after fetching (or in place of the bare findUnique) and return POST_NOT |
| C-003 | `actions.ts:1092` | Comment counts on cards include blocked authors' comments while the thread excludes them | Spread AUTHOR_IN_GOOD_STANDING into all four `_count.comments.where` fragments so the count matches VISIBLE_CO |
| C-007 | `report-action.ts:130` | reportPost's report -> thread -> notify chain has no transaction; a mid-chain failure leav | Create the Report and its AdminThread (+ first message) inside one $transaction so the dedupe's Report row imp |
| C-008 | `page.tsx:74` | Letters index lacks the author exemption the feed carries: an author who removes a city lo | Add `OR:[cityScopeWhere(viewerCities), {authorId: session.user.id}]` (and the batch equivalent) to the letters |
| C-009 | `actions.ts:231` | createPost's 10-second twin check compares only content/kind/status, so a same-caption dif | Add a discriminator to the twin match (hash of images/title/pollOptions) or, better, a client-supplied idempot |
| C-010 | `comments-section.tsx:581` | Comment hearts have no in-flight guard and every toggle ignores the server's returned stat | Add a busy ref to CommentItem.handleLike mirroring likeBusy; optionally set state from result.liked/result.boo |
| C-011 | `post-card.tsx:131` | Long posts are split at a hard 300-char boundary: formatting or a mention spanning it rend | Render renderRichText(content) once and truncate the RENDERED output, or split on a safe boundary (Intl.Segmen |
| C-012 | `post-visibility-rule.ts:180` | Admins can read members' unpublished letter drafts by direct URL, while deleteDraft's comm | Reconcile: either correct the deleteDraft comment (admins CAN see drafts per the rule) or, if drafts must be p |
| C-013 | `report-dialog.tsx:44` | Report dialog lets details reach 500 chars, then prefixes the reason so the combined strin | Lower details maxLength to 500 minus the longest 'reason: ' prefix, or pass reason and details as separate arg |
| C-014 | `create-post-form.tsx:239` | Letter crash-net localStorage key is not account-scoped: the next person on a shared brows | Scope the key to the signed-in user id (e.g. `rv:letter-draft:${userId}:${postId ?? 'new'}`) and/or clear it o |
| C-015 | `actions.ts:1029` | No length cap on the feed search term: loadPosts LIKE-scans title, content and author name | Clamp opts.search (e.g. .slice(0,100)) in loadPosts before escapeLike, and the same in buildDirectoryWhere. |
| C-016 | `actions.ts:843` | Replying to a reply notifies the root comment's author, not the person actually replied to | Carry the actually-replied-to comment's author and notify them (or notify both the root and the tapped reply a |
| C-017 | `actions.ts:564` | A draft's saved city audience silently widens to Everyone if the city was removed from the | Distinguish a validation miss from an intentional clear — when a non-empty wanted city fails to match a UserPl |
| C-018 | `actions.ts:70` | No reference counting on post image bytes: the same owned URL attached to two rows lets de | Before queueing a url for purge in deletePostWithImages, exclude urls still referenced by any other live Post  |
| C-024 | `catchups.ts:1089` | advanceEdition failures are console-only while the sibling swallow points report to Sentry | In advanceEdition's catch, after the isMissingCatchupTable early-return, call report('catchups', err, { step:' |
| C-025 | `actions.ts:1947` | Revoking the Keeper hat overwrites a legacy group-admin role with 'member', silently strip | Scope the revoke to the hat only: updateMany({ where:{ groupId, userId, role: 'keeper' }, data:{ role:'member' |
| C-026 | `actions.ts:1989` | nudgeGroup is unmetered despite whole-group fanout that bypasses 'off' preferences | Meter nudgeGroup with the existing 'catchups' bucket (rateLimit('catchups', session.user.id)) or add a per-edi |
| C-027 | `actions.ts:1398` | submitEntry's status check is separated from its write by the 3s Spotify fetch, so answers | Re-assert the edition is still 'answering' at write time: wrap the upsert (and the empty-row delete) in a tran |
| C-028 | `catchups.ts:491` | Extending the deadline of a dormant Round extends from the long-dead deadline: success rep | In extendDeadline (or extendPhasePatch) for collecting, extend from max(questionsCloseAt, now) so the new dead |
| C-029 | `actions.ts:894` | submitPrompt's cap-check comment overstates the transaction: two concurrent submissions ca | Give the home console query the same total order the other surfaces have (orderBy [{ position:'asc' }, { creat |
| C-030 | `catchups-notify.ts:219` | Hearting an ex-member's answer notifies them with a link their own membership loss 404s | Before creating the love row, verify the author is still a reachable member: check the author has a GroupMembe |
| C-031 | `catchups.ts:186` | Reminder copy and answer-page copy disagree about 'last day' near the close boundary (24h  | Bucket the reminder copy on valley days (valleyDaysBetween) so 'Last day' coincides with the page's 'close tod |
| C-032 | `auth.ts:256` | JWT session cookie never refreshes: every member is hard signed out 30 days after sign-in, | Product decision. To restore rolling sessions, refresh the cookie from a context that can write it (a real Nex |
| C-033 | `email-actions.ts:258` | Blocked member can complete the password-reset flow and is told 'we are signing you in now | Add an isBlocked check to the reset flow: either short-circuit requestPasswordReset for blocked rows (keeping  |
| C-034 | `reset-client.tsx:117` | Three auth clients await server actions with no try/catch — a rejected action strands the  | Route each await through callAction() as verify-email-banner.tsx:97 does, or wrap in try/catch and move the bu |
| C-035 | `email-actions.ts:424` | resetPassword awaits two post-commit writes with no catch, so a transient DB error after t | Wrap the post-commit writes (burnTokens, enqueueMail, mintHumanPass) in try/catch that logs, or move them behi |
| C-037 | `verify-email-banner.tsx:44` | sendTimeLabel's docstring says 'Formatted in the BROWSER's timezone' while the code pins V | Correct the three stale docstrings to say the time is pinned to Asia/Kolkata (valley day), and append an 'IST' |
| C-041 | `actions.ts:127` | adminUpdatePerson writes batchYear without re-deriving batchType, so the credential drifts | In adminUpdatePerson, when batchYear changes, read the row's yearLeft and set batchType = batchTypeFromLeaving |
| C-042 | `actions.ts:22` | Onboarding register step bypasses the shared place validation all other UserPlace writers  | Replace the local placeSchema/createMany in saveOnboardingRegister with parsePlaces + resolvePlaces (the share |
| C-045 | `letterhead-profile.tsx:429` | Places autosave fires an unserialized wipe-and-recreate per edit: overlapping saves lose d | Serialize commits in useAutoSave (chain each run() onto the previous promise, or coalesce trailing calls), and |
| C-046 | `import-roster.mjs:200` | Roster import's --match-existing backfill verifies members without stamping verifyStateAt | Add "verifyStateAt" = now() to the UPDATE at import-roster.mjs:200-201, matching the four Prisma writers (veri |
| C-047 | `profile-actions.ts:111` | Three different admission-number ceilings: 10000 in onboarding/settings schemas, 100000 in | Pick one ceiling for User.admissionNumber (owner to confirm whether real numbers exceed 10000) and use it in a |
| C-048 | `profile-actions.ts:28` | Profile pen accepts years up to 2100 that every other writer refuses | Bound updateProfileField's year fields by valleyYear()+ahead (batchYear +7, yearLeft +1, yearJoined +0), reusi |
| C-049 | `actions.ts:209` | chooseBird's header comment describes the abolished re-pick model the code below refuses | Rewrite the header comment (actions.ts:206-208) to describe the shipped one-pick-per-contribution model: a pic |
| C-050 | `actions.ts:249` | Concurrent avatar upload/remove races orphan R2 objects that nothing can ever find again | Make the swap atomic: read prev and update in one transaction with an updatedAt/version precondition, or recor |
| C-051 | `photo-step.tsx:57` | Onboarding photo step still ships the uncropped photo into the server's blind centre crop | Reuse AvatarCropDialog in the onboarding photo step before calling updateAvatar, matching letterhead-profile.t |
| C-053 | `actions.ts:237` | Closing a thread ('Sorted') unconditionally clears adminUnread, burying a member reply tha | Guard the clear the way settleReport guards its transition: only clear adminUnread when lastMessageAt has not  |
| C-056 | `actions.ts:34` | Bell infinite scroll silently truncates when the cursor row is pruned by a concurrent firs | The code shape is real: getNotifications pages with `cursor:{id}, skip:1` (notifications/actions.ts:34) and th |
| C-057 | `admin-threads-server.ts:29` | Admin-opened notice threads count against the member's own new-thread budget, which also g | Exclude admin-originated rows from the budget: count only threads the member created, e.g. add `kind: { notIn: |
| C-058 | `page.tsx:31` | Member /messages list silently caps at 60 threads with no affordance — the same shape as f | Mirror the B-200 fix: keep the cap but add a 'Show older' link (or keyset pagination) and a total count, so no |
| C-059 | `admin-threads.ts:67` | deriveSubject/previewOf cut at UTF-16 code-unit offsets, splitting surrogate pairs into U+ | Cut on grapheme boundaries using a module-scope Intl.Segmenter (as getInitials does) instead of raw slice in b |
| C-060 | `report-action.ts:114` | reportPost double-file TOCTOU: the pending-report dedup is check-then-insert with no uniqu | Either a partial unique index on pending post-reports (raw SQL, accepting migrate-diff noise) with a P2002 cat |
| C-061 | `page.tsx:83` | Mark-read-on-open clears an unread flag for a message that arrived after the page's messag | Fold into the C-053 fix: condition the unread clear on the rendered snapshot, e.g. clear only when no AdminMes |
| C-062 | `retention.ts:111` | The 730-day AdminMessage retention leaves AdminThread shells forever: subject text (member | In the adminMessages sweep step, after deleting messages past the cutoff, also delete AdminThreads left with z |
| C-068 | `storage.ts:266` | keyForUrl refuses this bucket's own URLs whenever full R2 credentials are absent, so delet | If confirmed worth hardening: recognise legacy/current R2 hosts in keyForUrl regardless of useR2 (publicBaseFo |
| C-069 | `actions.ts:669` | adminRemovePhoto (and avatar replace/remove, admin merge) delete bytes best-effort with no | At each site, either check the boolean and write a PendingImagePurge row on false (mirroring declinePhoto), or |
| C-070 | `actions.ts:378` | A >40MP panorama with aspect ratio above ~6.7:1 fails WebP encode: the areaFit branch bypa | Clamp areaFit dims to WEBP_MAX_DIM before the resize (fit:'inside' preserves aspect), e.g. resize(min(areaFit. |
| C-071 | `collection-client.tsx:183` | Collection Load-more duplicates tiles (React key collision) when a photo is inserted betwe | Dedupe on append: `setPhotos(prev => { const seen=new Set(prev.map(p=>p.id)); return [...prev, ...data.photos. |
| C-072 | `image.ts:24` | MAX_INPUT_PIXELS comment claims 'a full 108MP shot is under this' — 108,000,000 > 100,000, | Either raise MAX_INPUT_PIXELS to ~110-120MP (still far under sharp's 268MP default, bomb argument intact) OR f |
| C-073 | `actions.ts:180` | Animated GIFs contributed to the Collection are flattened to a still with nothing said — t | Call countImageFrames in contributePhoto, contributePhotoDirect and finalize/route.ts and surface the same 'sa |
| C-074 | `actions.ts:591` | approvePhoto throws raw P2025 when the photo was concurrently declined — the admin is told | Wrap in try/catch and return 'That photo is no longer here.' on isRecordNotFound(err), matching declinePhoto/t |
| C-076 | `account-purge.ts:83` | collectImageUrls' in-transaction claim is false under READ COMMITTED: a concurrent upload' | Set the purge transaction's isolationLevel to 'RepeatableRead' (the delete then aborts on a conflicting concur |
| C-077 | `retention.ts:201` | Sweep's catch-up bin step strips a creator-less group's last admin with no succession | In the catchup-bin step, after removing each member's GroupMember, re-run chooseGroupSuccessor for that group  |
| C-078 | `route.ts:139` | Data export omits categories of data the person provided, against its own completeness cla | Add a `catchupPrompts` section fetching prisma.catchupPrompt.findMany({ where: { authorId: userId }, select: t |
| C-079 | `retention.ts:224` | Retention sweep's worst case exceeds serverless duration ceilings; no maxDuration declared | Code-level facts verified: no maxDuration is declared anywhere — the retention route (api/retention/sweep/rout |
| C-080 | `admin-analytics.ts:624` | Analytics leaderboards group by user NAME, merging same-named members | GROUP BY u.id and carry the name via min(u.name)/any_value, or group by id then look names up — the pattern lo |
| C-081 | `page.tsx:75` | Admin Messages page fetches every open thread unbounded | Cap the open query too (take + a Show-older/paginate escape mirroring the closed section), or auto-close/expir |
| C-083 | `actions.ts:78` | dismissMail read-then-delete race can delete a message another admin just requeued | Replace the unconditional delete with `deleteMany({ where: { id, status: 'failed' } })` and treat count===0 as |
| C-086 | `route.ts:141` | Dispute-won and dispute-closed events are ignored, so a chargeback the owner WINS stays un | Add payment.dispute.won and payment.dispute.closed to a handler that transitions status back to 'paid' only fr |
| C-088 | `actions.ts:183` | First-audit Low 116 is only half-fixed: the browser confirm path still leaves failureReaso | In confirmContribution's update (actions.ts:184) add failureReason: null and set method from the successful pa |
| C-089 | `page.tsx:92` | Admin "Did not go through" tile counts disputed contributions, whose payments did go throu | Exclude disputed from the tile the same way refunded is: `status: { notIn: ["paid", "refunded", "disputed"] }` |
| C-090 | `route.ts:230` | A refund does not revoke the bird already picked with that money | Owner ruling required. If revocation is wanted: in the refund/dispute branch, when the member's remaining paid |
| C-092 | `page.tsx:321` | Map pin people lists (and pin naming) lead with NULL-batchYear members: the pins query lac | Add nulls: 'last' to the batchYear desc in the page.tsx:321 orderBy, matching directoryOrderBy's batch-desc br |
| C-093 | `where.ts:95` | year=faculty is silently clobbered by type=alumni: accountType is assigned twice in buildD | Fold accountType from both faculty and type inputs into one constraint (contradictory inputs -> impossible set |
| C-095 | `where.ts:60` | Teacher/ex_teacher accounts can hold a batchYear, making the batch tile count disagree wit | On the write paths (adminUpdatePerson and updateUserProfile) clear batchYear when accountType becomes teacher/ |
| C-096 | `actions.ts:69` | Keyset 'Load more' under the batch sorts likely dead-ends at the NULL-batchYear region, an | The finder itself flags the deciding fact as unknown ('Whether Prisma 7's query compiler adds IS NULL arms for |
| C-097 | `page.tsx:281` | Directory searches are never logged: SearchScope 'directory' has no writer, on a false pre | In directory/page.tsx, when params.q is present, after(() => logSearch({ scope:'directory', query: params.q, u |
| C-098 | `page.tsx:183` | A shared 0.1-degree grid pin is named and 'See all'-linked by only its first member's city | Link the pin drilldown by the whole cell (an OR over every distinct city string in the cell) or by coordinates |
| C-099 | `page.tsx:222` | hasFilter uses raw Number() while the where uses parseBatchYear: an out-of-range year rend | In page.tsx derive showingYear/hasFilter/yearFrom/yearTo from parseBatchYear (the same parser the where uses)  |
| C-101 | `actions.ts:176` | Clearing every place resurrects a stale legacy secondaryCity on the profile | Clear secondaryCity alongside currentCity in updateUserPlaces and adminUpdatePlaces (or drop secondaryCity fro |
| C-103 | `email-queue.ts:458` | enqueueMail's fold path returns before scheduleDrain, so pressing 'resend' never nudges a  | Call scheduleDrain() before the fold-path return (or restructure enqueueMail so every return path nudges the d |
| C-104 | `layout.tsx:81` | The layout's after() drain costs ~9 OutboundEmail/QueueLease queries including 3 writes on | Add a single cheap precheck at the top of drainMailQueue after queueIsSendable(): count({where:{status:'queued |
| C-105 | `email.ts:197` | Dev drain with EMAIL_DEV_SEND=1 but no RESEND_API_KEY marks rows 'sent' off a console.log, | queueIsSendable's dev branch should also require RESEND_API_KEY (fail-closed, matching the production branch), |
| C-106 | `actions.ts:78` | Dismissing a same-day-bounced row deletes its sentAt and hands back a phantom budget slot  | dismissMail should not remove rows whose sentAt falls in the current UTC day (soft-clear the status instead of |
| C-107 | `email-queue.ts:913` | A provider-quota-deferred verify row shows 'A link has been sent to your email' for up to  | Return {state:'queued', sendingAt: row.nextAttemptAt} (not 'imminent') when a queued row's nextAttemptAt is a  |
| C-111 | `proxy.ts:203` | Production's daily /api/demo/reset cron GET is redirected to /login by the proxy — the car | Add '/api/demo/reset' as an exact entry in publicPaths, alongside /api/catchups/tick and /api/retention/sweep, |
| C-112 | `rate-limit.ts:156` | Demo has zero rate limiting plus unbounded allowlisted creates; a disk-fill makes the nigh | The three code facts are confirmed: (1) rateLimit/hasBudget/consume all short-circuit open when IS_DEMO (rate- |
| C-113 | `actions.ts:508` | 'Start a Catch-up' is reachable in the demo but structurally can never succeed: Group/Grou | Either add Group + GroupMember to ALLOWED_WRITE_MODELS (seedDemo already clears group/groupMember/groupInvite, |
| C-115 | `page.tsx:54` | First-open race on /notice/[id] still mints duplicate admin threads (the exact M46 failure | Make the create idempotent: either add a unique index scoped to notice threads (partial unique on (memberId, c |
| C-116 | `wordle.ts:36` | getWordleAnswer has no fetch deadline: a hanging NYT endpoint blocks the /dark-mode render | Add signal: AbortSignal.timeout(3000) (or similar) to the fetch options so a slow/blackholed NYT endpoint abor |
| C-117 | `layout.tsx:25` | A stale or revoked session cookie drops the deep link: (main) layout redirects to /login w | In layout.tsx replace redirect('/login') with redirect('/login?next=' + encodeURIComponent(path)) using the x- |
| C-118 | `account-purge.ts:338` | drainPendingImagePurges can throw P2025 from its failure branch when a concurrent drain de | Give the failure branch the same protection as the delete branch: append `.catch(() => {})` to the update, or  |
| C-119 | `layout.tsx:51` | viewport themeColor is hard-coded to the light background, so dark-theme members get warm- | Replace the static `viewport` export with `export async function generateViewport()` that awaits getThemeCooki |
| C-120 | `posthog-provider.tsx:90` | PostHog config comment promises input-content masking that the two lines under it do not i | Either correct the comment to describe what these two options actually do (property masking + attribute captur |
| C-125 | `actions.ts:1398` | submitEntry (catch-up answer autosave) has no lost-update guard: a stale device silently o | Add an optional baseUpdatedAt precondition to submitEntry mirroring editPost: updateMany where {promptId_autho |
| C-126 | `actions.ts:894` | submitPrompt's cap-and-position transaction claims a concurrency guarantee READ COMMITTED  | Correct the comment so it no longer claims mutual exclusion (the small overshoot and shared position are benig |
| C-127 | `actions.ts:1977` | setReminderPref and submitEntry use bare upserts on @@unique keys without the P2002 retry  | setReminderPref (actions.ts:1977-1981) and submitEntry (actions.ts:1398) use a bare prisma.*.upsert on a compo |
| C-128 | `actions.ts:88` | startThread and replyToThread have no double-submit guard: a double-tap or two-tab send fi | Add the server twin-window guard to startThread and replyToThread as feed/catchups do (look for the caller's o |
| C-129 | `actions.ts:418` | Collection contributions have no duplicate guard: concurrent double-submission mints two P | Make the staged key single-use: record it (e.g. a unique column or a claimed-keys set) and reject a second con |
| C-130 | `actions.ts:591` | A family of admin/maintenance writes uses unconditional update/delete on possibly-stale ro | Convert to updateMany/deleteMany or catch isRecordNotFound at approvePhoto and declinePhoto's tx delete; add a |
| C-136 | `vercel.json:11` | One vercel.json ships both crons to both Vercel projects: /api/demo/reset bounces off the  | Add '/api/demo/reset' to publicPaths (its GET is CRON_SECRET-gated and its POST is IS_DEMO-404 on the real sit |
| C-138 | `theme-actions.ts:56` | User.theme is write-only: the promised 'drift back to the DB truth on next sign-in' does n | Either (a) set the rv-theme cookie from User.theme during the sign-in / session-establishment path so the DB t |
| C-139 | `page.tsx:44` | /catchups/join/[token] is the one async DB route with no loading.tsx | Add src/app/catchups/join/[token]/loading.tsx (or src/app/catchups/join/loading.tsx) using the warm shimmer, m |
| C-142 | `catchups.ts:470` | Cron-anchored catch-up deadlines land inside the next tick's jitter window; a quiet group' | Anchor phase deadlines to a stable nominal instant instead of the tick's jittered `now` (e.g. floor answersClo |
| C-143 | `admin-analytics.ts:834` | Admin growth chart and joinedMonth bucket months by naive UTC timestamp, unlike every othe | Bucket both on the valley conversion used elsewhere in the file: date_trunc('month', ("createdAt" AT TIME ZONE |
| C-144 | `catchups.ts:310` | addMonths uses setUTCMonth, so a monthly/quarterly cadence anchored on the 29th-31st overf | Clamp day-of-month in addMonths: capture the original UTC date, set to the 1st, advance the month, then set th |
| C-145 | `verify-email-banner.tsx:38` | sendTimeLabel's docstring claims browser-timezone formatting while the code pins IST, and  | Rewrite the 38-42 docstring to say the label formats in VALLEY_TIME_ZONE and compares valley day-keys (matchin |
| C-146 | `actions.ts:339` | Audit-log purge dates are UTC day-strings while the member's email names the valley day; t | Format the audit-log purge/requested dates in VALLEY_TIME_ZONE using the same toLocaleDateString shape the ema |
| C-147 | `backup.yml:32` | backup.yml's schedule comment claims it matches the catch-ups cron in one quiet-hours wind | Correct the backup.yml:32-33 comment to state that the catchups cron fires at 02:00 UTC (07:30 IST), not 02:00 |
| C-151 | `route.ts:231` | Razorpay refund/dispute arriving before the capture event is acknowledged with 200 and per | Make an early reversal durable: either return a non-2xx when the row is not-yet-paid so Razorpay retries after |
| C-153 | `email-queue.ts:532` | Mail drain failure paths log to console only - a systematically failing drain never reache | Route the drain-scheduling and lease failures through reportSwallowed('email', err, ...), and narrow takeDrain |
| C-154 | `rate-limit.ts:163` | Rate limiters fail open with console-only evidence - a Redis outage silently disables ever | On a limiter backend error, emit a throttled Sentry.captureMessage/captureException (e.g. once per N minutes o |
| C-155 | `page.tsx:36` | pick-bird treats a failed contribution query as 'not a supporter' and bounces a paid membe | Do not swallow the query error into a value that changes the redirect outcome. Let a real DB error propagate t |
| C-156 | `actions.ts:178` | Batch-group auto-join failure at signup is swallowed with no retry - the member is silentl | Add a repair path rather than making the join blocking: a lightweight self-heal on an authenticated surface (e |
| C-157 | `image-viewer.tsx:184` | Photo viewer download fetch never checks res.ok - an error response is saved as the photo | After fetch, `if (!res.ok) throw new Error(String(res.status))` so control falls into the catch (open in new t |
| C-158 | `upload-client.ts:55` | Direct-upload presign fallback is still fully silent - the failure mode that hid for weeks | Add a console.warn in both catches naming the failure (presign network error / blocked PUT origin), so a recur |
| C-159 | `collection-intake.ts:57` | copyPostImagesToCollection can reject despite its 'resolves rather than throwing' contract | Wrap the two pre-loop reads in the same total-resolution try (or return 0 on throw); in the loop catch, delIma |
| C-165 | `posthog-provider.tsx:74` | PostHog free tier (1M events/month) is ~5-8x exceeded at the 2,000-user target; OPERATIONS | Before scaling: sample autocapture and/or drop capture_pageleave, or accept the paid tier as a decision; and c |
| C-166 | `instrumentation.ts:58` | Sentry sampling sized for today's traffic, not the target: 10% tracing is ~120k traces/mon | Lower tracesSampleRate to ~0.005-0.01 for launch and rely on Sentry server-side spike protection knowingly; ke |
| C-167 | `rate-limit.ts:99` | Type-ahead search limiter spends Upstash commands per keystroke; at target scale it can ex | N/A |
| C-169 | `validators.ts:238` | Image URL strings pass ownership checks with no length cap; a verified member can store mu | Add a per-URL length cap on the image path -- either a .max on each parsed URL in ownedUploadUrls/decideOwnedU |
| C-172 | `profile-actions.ts:101` | The live inline profile editor enforces looser caps than every other writer of the same co | Make updateProfileField reuse the profileSchema per-field bounds (workplace/jobTitle 100, admissionNumber shar |
| C-174 | `profile-actions.ts:80` | Several actions throw raw exceptions (500 digests) instead of returning {error} when a cra | Add a runtime type guard at each entry the way Low 83 did for updateContactMethods: coerce/validate the second |
| C-178 | `comments-section.tsx:581` | Comment hearts, letter heart/bookmark, and catch-up entry hearts have no in-flight guard:  | Add the same likeBusy/busy ref (early-return while in flight) to the three handlers. |
| C-180 | `post-feed.tsx:170` | Feed and profile 'Load more' have no synchronous re-entry guard and no id-dedupe: a double | Add a synchronous loadingMoreRef guard and dedupe the appended page by id (as comments-section/directory-clien |
| C-182 | `photo-attachments.tsx:81` | Removing a catch-up photo while another photo is uploading resurrects the removed one (sta | In the post-upload onChange, recompute from the freshest prop via a ref (or use a functional updater), rather  |
| C-183 | `create-post-form.tsx:725` | Composer preview object URLs are never revoked on successful post or unmount | Revoke the fresh-upload object URLs on successful post (before setPreviews([])) and in an unmount cleanup; lea |
| C-186 | `route.ts:27` | The catchups-tick cron also fires nightly on the demo project, which has no wrong-deployme | The code facts are confirmed: vercel.json schedules both crons (/api/catchups/tick at 02:00, /api/demo/reset a |
| C-188 | `composer-rule.test.mjs:128` | composer-rule's B-048 editPost pin is vacuous: cityScope matches later functions in the sa | Replace the whole-tail slice with the balanced-brace fnBody used in gate-coverage.test.mjs:68-95 (which correc |
| C-189 | `gate-coverage.test.mjs:106` | gate-coverage's action discovery has three silent-skip vectors for a future ungated action | grep for both quote styles at line 97; change the line-106 filter to allow leading comments before the directi |
| C-190 | `check.mjs:79` | check.mjs reports ESLint and the protocol audit as "clean" when the tool itself crashes | In both the lint and protocol gate `run()`s, treat a nonzero child exit code WITHOUT a successfully parsed sum |
| C-191 | `cascade-rule.test.mjs:83` | cascade-rule cannot catch a NEW communal model, though its header claims it "fails on the  | Invert to fail-closed like PUBLIC_BY_DESIGN: assert the cascade-reachable-from-User set is a SUBSET of an expl |
| C-192 | `index-coverage.test.mjs:41` | index-coverage's header claims it catches a forgotten index on a new relation; it checks a | Derive the checked set from every model carrying an interaction-shaped `@@unique([userId, X])` and assert each |
| C-195 | `check.mjs:54` | check.mjs test discovery is extension- and location-bound: a renamed or relocated test sil | Assert a minimum test-file count (the way gate-coverage asserts files.length>=15) so a drop fails loud; and/or |
| C-196 | `avatar.test.mjs:28` | avatar.test's distribution check exercises a hand-copied mirror of the hash, not avatar.ts | Keep the independent mirror but add a parity assertion over a few hundred fakeCuid ids: `assert.equal(hashSpec |
| C-197 | `email-normalization-rule.test.mjs:66` | email-normalization's negative-shape pins are spelling-bound; the B-020 raw-lookup bug can | Add a POSITIVE pin that the unique-email lookup goes through the normalized key — e.g. assert authorize()'s fi |
| C-199 | `page.tsx:67` | Letter page's raw isHidden check defeats the pinned author-exemption on hidden posts | Drop `letter.isHidden` from line 67 and let canViewPost decide (it returns not-ok/hidden for non-authors and o |
| C-200 | `layout.tsx:25` | Expired or revoked session + deep link loses the destination: (main) layout redirects to / | In the layout's !session branch, read the x-pathname header the proxy already forwards and redirect to /login? |
| C-202 | `proxy.ts:256` | Gated /api/* requests without a valid cookie get a 307-to-login HTML page instead of 401 J | In the proxy's !sessionCookie branch, answer pathname.startsWith('/api/') with NextResponse.json({error:...},{ |
| C-203 | `proxy.ts:322` | robots.txt, sitemap.xml and .well-known/* are neither excluded from the matcher nor public | Add app/robots.ts (Next serves it at /robots.txt) and optionally app/sitemap.ts for the six public pages, then |
| C-204 | `proxy.ts:245` | Bare /catchups/join (tokenless) falls through to the [catchupId] route instead of the join | Add src/app/catchups/join/page.tsx that renders the same 'link not recognised' shell (or redirects to /catchup |
---

## 5. The 2,000-user dossier

**Live numbers captured this session (read-only):** database **112 MB** of a 500 MB Supabase free
tier; the `Place` gazetteer is **234,935 rows / 97 MB** of that (static reference data, not member
data); everything member-generated is tiny today (52 users, 17 posts, 224 notifications). 129 live
indexes; the `lower()` and `pg_trgm` expression indexes are confirmed applied.

**Connection-budget arithmetic (the headline).** Runtime pool is `max: 5` per instance with a 5 s
checkout timeout and 20 s client-side query timeout (`src/lib/prisma.ts`). Supavisor's client cap is
~200. So the ceiling is **5 × ~40 concurrent instances = 200**, exactly at the cap. At 2,000
registered users the realistic concurrent-request peak is tens to low-hundreds → **well under 40
instances → comfortable.** The failure mode if a burst *does* exceed ~40 instances is graceful: a
few requests get a fast honest 5 s error rather than the site hanging (this is the deliberate design,
and it is correct). **No change needed; the math holds.** One watch-item: the `(main)` layout awaits
its data above every `loading.tsx`, so under a slow-DB minute the member sees a blank page before the
error boundary — already known, not re-filed.

**Unbounded / expensive queries at scale** (fix before the member count climbs, not before launch):
- **C-104** — every authenticated page view runs `after(drainMailQueue)`, ~9 OutboundEmail/QueueLease
  queries incl. 3 writes, *even when the queue is empty*. At 2,000 users × 20 views/day = 40k
  page-views/day = 360k needless queries/day + lease-row write contention. Fix: cheap "is anything
  due?" guard before taking the lease.
- **C-168** — the feed rail "pulse" module reads *every post row of the trailing week* on every feed
  render (and counts blocked authors). Bounded by a week of posts, but that grows. Add a cap/index or
  cache it.
- **C-081** — admin Messages page fetches *every* open thread unbounded. Fine at 6 threads, not at
  2,000-user volume. Paginate.
- **C-015 / C-169** — no length cap on the feed search term (LIKE-scans title+content+author) and no
  cap on stored image-URL JSON. Cap both.

**Table growth / retention gaps:**
- **C-164 / C-163** — `Visit` is written on a schedule from a client-controlled cookie with *no
  throttle and no retention sweep*. It is the one table that grows unbounded with traffic and will
  become the largest table well before 2,000 users. Add: (a) a write throttle (one row per
  visit-window, which the cookie already enables — verify it dedupes), (b) a retention sweep like
  SearchLog's. This is the single most important scale fix.
- `AuditLog`, `LoginAttempt`, `ContentView`, `MetricSnapshot` — checked: bounded or swept. `Notification`
  is pruned at 100/user. Only `Visit` lacks a sweep.

**Third-party free-tier ceilings (owner plan decisions, not code):**
- **C-161 — Resend 100 emails/day.** At a 300-signup launch day, the queue correctly absorbs the
  burst, but the *last* confirmation email sends ~3 days later while the UI says "check your inbox."
  Either raise the Resend plan for launch week, or set expectation copy. **This is the most likely
  launch-day surprise.**
- **C-165 — PostHog 1M events/month free.** 2,000 active users generate several million; OPERATIONS.md's
  "600k/year" sizing is ~2 orders of magnitude low. Decide the plan before launch or sampling kicks in
  silently.
- **C-166 — Sentry** tracing at 10% is ~120k traces/month against a 10k-span free plan; one error
  storm exhausts it. Lower the sample rate or size the plan.
- **C-167 — Upstash** rate-limiter spends commands per keystroke on type-ahead search; at scale this
  can exhaust the free command quota and (fail-open) silently disable *every* limit in the app.

**Load-test plan for a preview deployment** (do NOT run against the shared production DB). k6, against
a Vercel preview pointed at a *throwaway* Supabase branch:
1. *Smoke* — 1 VU, 1 min, every main route + one post + one comment. Threshold `http_req_failed<1%`.
2. *Average* — ramp 0→50 VUs over 5 min, hold 10 min. Watch Supabase dashboard connection count stay
   under 200. Threshold `p95<500ms`.
3. *Spike* — 0→200 VUs in 30 s, hold 2 min, drop. This is the burst that tests the 40-instance
   ceiling; expect some fast 5 s checkout errors, not hangs — confirm the site sheds load rather than
   compounding.
4. *Soak* — 30 VUs, 30–60 min, watch for connection leak (count should plateau, not climb) and `Visit`
   table growth rate (extrapolate to the retention decision above).

---

## 6. Verified-clean map (what was examined and came back clean)

292 specific checks came back clean across the fleet. The load-bearing ones, so future audits know
what was actually verified (not merely unexamined):

- **Auth:** the `credentialVersion` *writer* sweep is complete (reset, self-delete, block, unblock all
  bump it; the session callback compares it on every read); email normalization single-sourced and
  consistent signup-vs-login; timing equalisation real (valid dummy hash burned in both fast branches);
  single-use reset-token races closed.
- **Money:** webhook HMAC over the raw body before parse; livemode filtering on *every* surfaced sum;
  amount server-authoritative (rupees→paise once); the M59 junk-flood 200-response guard intact.
- **Purge/retention:** all **31** User relations walked against `purgeUserAccount` — each is Cascade,
  SetNull, or explicitly handled; PendingImagePurge written in the row-delete transaction; last-admin
  protection under a Serializable transaction with P2034 handled.
- **Demo:** reset is one atomic transaction; every allowlisted-writable model is wiped by the seed;
  `sendMail` refuses in demo; telemetry tables are not allowlisted (no anonymous disk-fill).
- **Uploads:** presign Content-Type made unsignable; finalize re-verifies size/type server-side; every
  write uses a fresh cuid key (no 1-write/sec-per-key collision); publicBaseFor host list matches CSP.
- **XSS/injection:** `renderRichText` escapes all five HTML-significant chars before markup; mention id
  charset is strict; every free-text `contains` escapes LIKE metacharacters; no `use cache`/unstable_cache.
- **Races:** every toggle uses delete-first + P2002-retry; no `$transaction` holds a connection across an
  R2/Resend/Razorpay/Spotify network call.
- **Proxy:** `x-pathname`/`x-visit-id` are `set()` (overwrite) unconditionally — not forgeable; the `//`
  double-slash prefix lead reasoned through against the installed Next source and found safe; route-level
  IDOR sweep on `(main)` sub-pages clean.
- **Dates:** the mail budget's UTC day, MetricSnapshot's UTC day, and the feed's valley-week are all
  *deliberate and documented* — not the timezone bugs (the real ones are in §4).

Full list: `findings-raw.json` → `cleanAreas` (292 entries).

---

## 7. Coverage map

**Decomposition (why this shape):** territories were partitioned by write-path density (the Glasswing
ranking — actions files, stateful libs, crons, webhooks rank above static display), and the
cross-cutting concerns that fall between territorial cracks (races, caching, UTC/IST, silent failures,
2k-scale, input validation, client-React, Vercel limits, test quality, route/proxy drift) each got a
dedicated lens agent so no file belonged to nobody and no lens belonged to no file.

| Agent | Territory | Findings | Clean checks |
|---|---|---:|---:|
| feed-posts | feed, posts, comments, letters, visibility | 18 | 16 |
| catchups-engine | the Catch-ups lifecycle & notify | 13 | 17 |
| auth | sign-in, tokens, sessions, verification | 7 | 13 |
| profile-settings-onboarding | profile, settings, onboarding, roster | 13 | 14 |
| messages-notifications | member↔admin threads, the bell | 11 | 16 |
| collection-uploads | Collection + the image pipeline | 12 | 16 |
| admin-purge-retention | admin surface, purge, retention | 9 | 16 |
| support-money | donations, Razorpay, contributions | 7 | 17 |
| directory-search | directory, search, places, map | 11 | 10 |
| email-pipeline | the mail queue end to end | 8 | 13 |
| demo-deployment | the public demo's three layers | 5 | 11 |
| shell-misc | app shell, proxy, misc lib | 7 | 14 |
| lens-races | server-action races (all mutations) | 10 | 11 |
| lens-caching-next | App Router caching & rendering | 9 | 11 |
| lens-dates-ist | UTC-vs-IST time | 7 | 15 |
| lens-silent-failures | every catch/fallback/swallow | 13 | 13 |
| lens-scale-2k | 2,000-user scale | 8 | 10 |
| lens-validation-inputs | input validation coverage | 6 | 13 |
| lens-client-react | the React client layer | 9 | 14 |
| lens-vercel-limits | platform limits (exact numbers) | 3 | 13 |
| lens-test-quality | are the tests testing anything | 11 | 11 |
| lens-routes-proxy | route map & gates | 7 | 8 |

**Consciously out of scope:** `src/generated/**` (generated Prisma client), `src/app/lab/**` UI pages
(dev/preview rooms, non-production — but `lab/actions.ts` and the admin gate WERE audited), the
`e2e/__screenshots__` baselines, and anything already tracked in `TRAPS.md`/`bugs.md`. The hoopoe
Safari-zoom item (bugs.md #17) and the feed-photo-reflow (bugs.md #18) are owner-owned and untouched.

**Refuted findings** (mechanism real, consequence disproven — the TRAPS "right about the mechanism,
wrong about the consequence" class) and the **duplicate map** are in the appendix
`bug-report-2-appendix-refuted-and-dupes.md`. 13 candidates were refuted with a written reason so nobody re-opens them; 14 were
folded as duplicates of a canonical finding.

**Completeness:** the adversarial validation pass itself acted as a second sweep and surfaced 7
findings the finders missed (folded into §4). Every taxonomy row in the audit brief produced either a
finding or an explicit clean check. No taxonomy area came back wholly unexamined.

**Honest limitations of this round.** (1) Input validation was audited by *reading* every action's
Zod coverage and cap logic (the `lens-validation-inputs` agent + the six-value reasoning), **not** by
live BLNS/naughty-strings fuzzing through the browser — that live pass was deliberately deferred to
keep machine load and usage down; the code-level coverage came back strong (see §6) but a live
naughty-strings sweep against every text input is the one brief item not executed and is the cheapest
high-value follow-up. (2) Live runtime confirmation was done by the orchestrator for the highest-value
cluster only — the keyset-cursor bug (proven against the DB), the money/refund and unverified-publish
paths (proven by code trace) — while the 8 remaining SUSPECTED items carry the exact runtime check
needed rather than a live result. (3) No throwaway test account was created and no member rows were
written this round; every check was read-only against the shared database.

---

*Method sources appended per the brief: Anthropic's production review pipeline (parallel finders →
one independent validator per finding → filter), Project Glasswing's hypothesize→execute→confirm and
bug-likelihood file ranking, the pr-review-toolkit lenses (silent-failure-hunter, test-analyzer,
comment-analyzer), Sentry's find-bugs, the code-review-skill reference, BLNS/awesome-falsehood input
designs, and the Prisma+pgbouncer / Vercel / R2 limit docs. Full candidate ledger:
`findings-raw.json`; per-finding verdicts: `verdicts-merged.json`; full Low detail:
`_findings-body.md`.*
