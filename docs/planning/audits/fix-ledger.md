# Fix ledger — bug-report-2

One row per finding id. Status is one of `fixed <commit>`, `not-a-bug <reason>`,
`deferred <reason>`, `owner <reason>`. Keep this current: it is the handover between sessions.

| id | status | note |
|---|---|---|
| C-122 | fixed 45f71e6 | one `isLetterDraft` predicate now decides both the gate-skip and the stored status; `src/lib/draft-rule.test.mjs` pins the predicate and both call sites |
| C-084 | fixed 1ab4ff1 + dbb65ae | (1) resurrection closed by `PAYABLE_FROM`; (2) refund-before-capture now applies to whatever state it finds |
| C-085 | fixed 1ab4ff1 | confirmContribution now uses the same `PAYABLE_FROM` predicate, conditionally |
| C-087 | fixed dbb65ae | `Contribution.refundedAmount` + `reversalIds`; every aggregate goes through `CONTRIBUTION_SUM`/`netPaise`, swept by a unit test. Migration 2026-08-24-contribution-partial-refund.sql applied to .env and .env.demo. Proved live against Postgres (partial keeps status paid, re-delivery is a no-op, capture after reversal moves 0 rows) |
| C-151 | fixed dbb65ae | duplicate of C-084 part 2; early reversal is now durable and audited |
| C-019 | fixed 07e867c | local `askerVisible` shadow deleted; all four surfaces use the shared helper; `isKeeper` param dropped from loadPublishedIssue; sweep added to catchups.test.mjs. Proved live: 4 anonymous askers leaked before, 0 after |
| C-002 | fixed 54e0f8a | `isHidden` clause dropped; canViewPost is the sole authority; page now shows a "Removed by a moderator" notice. Sweep added to post-visibility-rule.test.mjs. Verified live: hidden letter 200s for author/admin |
| C-102 | fixed e779e8e | `RETRY_RESET` (status/attempts/deferrals/lastError/claimedAt/nextAttemptAt) + `drainEligible` in mail-policy.ts; tests prove a provider-exhausted row is drain-eligible after Retry, and pin the predicate to the drain's real where clause |
| C-005 | fixed d6c61dd | feed/comments/bell now page on (createdAt, id) values via `src/lib/keyset.ts`; no row for the cursor to be missing |
| C-124 | fixed d6c61dd | same root cause as C-005; all three surfaces fixed at once |
| C-162 | fixed d6c61dd | same root cause as C-005 |
| C-171 | fixed d6c61dd | duplicate of C-124; closed by the same change |
| C-056 | fixed d6c61dd | bell cursor no longer names a row the concurrent prune can delete. Verified live: 20 rows -> 23 (the exact total), no duplicates |
| C-096 | not-a-bug | refuted live: walked the whole directory under `batch-desc` (nulls:last) one page at a time with a boundary landing inside the NULL region — 63 of 63 rows reached, no dead end. Prisma 7's cursor compiler handles the NULL arm |
| C-055 | not-a-bug | refuted live: zero `/notice/%` notifications in either database, and `notifyAdminNote` has opened an AdminThread before writing the bell row since the rewrite, so the note's text is never the notification's only copy. The prune can lose a bell entry, not a moderation note |
| C-065 | fixed 87e01e6 | adminMessages sweep now collects imageUrls into PendingImagePurge (reason "retention") inside one transaction before deleting. Collect half proved live against real data (1 of 13 messages carries a screenshot); nothing due at the 730-day cutoff yet |
| C-175 | fixed 1205c4b | timer guards on `submittingRef.current`; handleSubmit clears the pending timer before awaiting |
| C-176 | fixed 1205c4b | `audienceCity` added to the autosave deps; the gate derives the required deps from what runAutosave actually sends |
| C-177 | fixed 1205c4b | pagehide + visibilitychange flush the local belt synchronously, for resumed drafts too; the resumed-draft belt is now read back and offered on reopen. Proved in a browser |
