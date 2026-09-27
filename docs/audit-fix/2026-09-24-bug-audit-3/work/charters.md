# Bug audit 3 — charters (one section per agent)

Every agent reads `work/brief-common.md` FIRST, then its own section here. "Own" means: read it
completely, apply every taxonomy row to it, account for it in `## Coverage`. Files listed under
"also touch" are read as far as your territory's paths lead into them. Line counts are from
2026-09-24 so you can budget.

---

## T1 — feed-posts-letters-comments

**Own:** `src/app/(main)/feed/actions.ts` (1,316: createPost, editPost, deletePostWithImages,
likes, bookmarks, polls, loadPosts, loadComments, feedSeenAt, search, report), `src/app/(main)/feed/page.tsx`,
`feed/loading.tsx`; `src/components/posts/*` (5,730: create-post-form 1,309, post-card 773,
comments-section 1,157, post-feed 345, feed-comment-actions.ts, report-action.ts, report-dialog,
edit-post-dialog, poll-creator, poll-display, mention-dropdown, use-composer-uploads,
use-engagement, use-letter-persistence 469, feed-column, post-card-skeleton);
`src/components/feed/*` (710: the rail modules); `src/components/letters/*` (779: letter-desk,
letter-images, letter-menu, letter-engagement, drafts-strip, letter-title); every page under
`src/app/(main)/letters/**`; `src/lib/posts.ts`, `post-visibility.ts`, `post-visibility-rule.ts`,
`post-notifications.ts`, `post-caps.ts`, `draft-rule.ts`, `draft-images.ts`, `comment-thread.ts`
(330), `rich-text.ts`, `rich-text-editing.ts`, `read-more-fold.ts`, `keyset.ts`, `append-page.ts`,
`heart.ts`, `toggle-queue.ts` (new 2026-09-17: "every tap counts while a save is in the air"),
`double-submit.ts`, `city-scope.ts`, `call-action.ts`, `search-continuation.ts`, `report-error.ts`,
`notification-links.ts`, `text-width.ts`; the Comment/Post/Like/Bookmark/PollOption/PollVote/
CommentLike/Report schema blocks.

**Spec:** `docs/spec/letters.md`. Also `docs/spec/profile.md` §Posts tab for the author feed.

**What changed here since audit 2 (hot):** the comment section was rebuilt 2026-09-16 ("the two
looks become one", reply box, gradual close); the Comment table became DUAL-OWNER on 2026-09-10
(postId XOR entryId, a CHECK constraint, `comment-target-rule.test.mjs`) — every comment reader,
counter, notifier, hider and purger must name the column; hearts got an in-flight queue
(2026-09-17); "Read more folds by measured lines" (2026-09-12); a 300-word rule decides post vs
letter and "a short letter is asked whether it would rather be a post" (2026-09-17); the composer's
pill was replaced by the member's own bird (2026-09-14); feed loading screen rewritten 2026-09-21;
"a notification you have read stays read" (2026-09-12); the verified leaf left bylines (09-15).

**Primary taxonomy:** 6c(1)(2)(3) on every action here; 6h on every text input (post body, letter
title/body, comment, poll options, mention ids, search q, report reason, city scope); 6a keyset
pagination (feed, comments, letters, saved) incl. cursor at a deleted/hidden row and concurrent
insert; identity states (blocked/deleted/deletion-requested author, teacher with no batch on
batch-targeted posts, unverified member); 6b on the composer, the comment section and hearts.

**Seeded questions:** (1) Does every comment query since the dual-owner change filter on the
right column, and does a comment on a Catch-up entry ever leak into feed counts/notifications or
vice versa? (2) The 300-word post/letter rule: where is the count made, is it the same function on
client and server, what about a letter edited under 300 or a post edited over? (3) `toggle-queue.ts`:
what happens when the last tap's save fails — does the UI resettle to the row? (4) `feedSeenAt`
"only ever moves forward" — prove it under two devices. (5) Letter drafts: autosave vs session
expiry vs edit-by-two-tabs (`use-letter-persistence`). (6) Polls: vote change, vote on a deleted
option, option count bounds, a poll on a letter. (7) `/letters` visual shot took 1.1 minutes in
this session's baseline run — is the letters index doing something slow (a count over all posts,
an unindexed order) or was it a cold compile? Read the query. (8) The feed rail modules: each does
a query on every feed render — bounded? cached? per-user?

---

## T2a — catchups-lifecycle (server)

**Own:** `src/app/(main)/catchups/actions.ts` (2,822 — the largest file in the app; read ALL of
it), `src/lib/catchups-core.ts` (1,402), `src/lib/catchups.ts` (534), `src/lib/catchups-notify.ts`
(350), `src/lib/catchups-types.ts` (335), `src/lib/batch-catchups.ts` (313; "a batch gets its own
Catch-up, and nobody keeps it" 2026-09-08; "appears quietly and waits for three questions"
2026-09-22), `src/lib/group-succession.ts`, `src/lib/catchup-caps.ts`, `src/lib/catchup-picture-pick.ts`,
`src/lib/catchup-pictures.ts`, `src/lib/catchup-shelf.ts`, `src/lib/catchup-reads.ts`,
`src/lib/catchups-edition-view.ts` (255), `src/app/api/catchups/tick/route.ts` (the nightly cron,
`maxDuration = 120`), `src/app/api/users-by-batch/route.ts`, the Catchup/CatchupEdition/
CatchupEditionRead/CatchupPrompt/CatchupPref/Group/GroupMember schema blocks, and the migrations
`prisma/migrations-manual/2026-09-08-*` through `2026-09-22-batch-catchups-wait-for-questions.sql`.
Also touch: `src/app/(main)/admin/catchups/**` (the admin's view of the lifecycle), `src/components/admin/catchup-status.ts`.

**Spec:** `docs/spec/catchups.md` AND `docs/planning/catchups-rework/architecture.md` (the settled
shape; supersedes directions.md Part 1). The rework shipped in phases through 2026-09-14; the spec
may lag the code — where they disagree, say which.

**Primary taxonomy:** 6i crons (tick: overlapping runs, double-fire, partial failure mid-loop,
`maxDuration` vs N Catch-ups × mail); 6h DATES — every deadline "lands on a civil hour, 07:00 IST"
(2026-09-08): questionsCloseAt, answersCloseAt, nextOpensAt, pausedAt shift-forward on resume,
`addMonths` clamp, the reminder buckets (`dailyBucket`), the time capsule's "a year on at 07:00
IST" and its CHECK constraint on sealed rows, DST-free IST vs UTC cron at 02:00 UTC; 6c races
between two Keepers / Keeper vs clock (CAS on status), openAnswering/closeAndPrepare/
extend/publish/seal/open-capsule transitions; 6d transactions in a 2,800-line actions file;
membership: join by token, leave (deleting became leaving 2026-09-08), remove, succession when the
last role-holder leaves, batch Catch-ups with no Keeper ("nobody keeps it") — who can do what;
identity: a leaver's answers stay; a purged author's prompts SetNull; teacher (no batchYear) in a
batch Catch-up; blocked member in a Catch-up.

**Seeded questions:** (1) The batch Catch-up "waits for three questions" — what state is it in,
does the tick skip it correctly, can it wait forever, what does a member see? (2) Time capsule:
sealed → publishAt; what opens it (tick? page read?), what if the tick misses the day, what does
the reader show between sealedAt and publishAt, can a sealed Edition be edited/extended/deleted?
(3) The read mark (`CatchupEditionRead`): written on open of a PUBLISHED Edition — what about a
capsule opened early via a URL? (4) "A Keeper can start the next Edition now" (2026-09-08) —
racing the clock's own open; the unique on (catchupId, number). (5) `nextOpensAt` for
biweekly/monthly/quarterly across month ends and the 31st; a paused Catch-up across a cadence
boundary. (6) The notify fanout: for a 60-member batch Catch-up, how many rows/mails per tick, and
is `groupMemberIds` bounded? (7) Every `updateMany`-as-CAS: what is returned when count=0 and is it
handled? (8) Rename: "a batch one cannot" be renamed — enforced server-side?

---

## T2b — catchups-answers (server)

**Own:** the answer/entry half of `src/app/(main)/catchups/actions.ts` (submitEntry, deleteEntry,
loves, photo attachments, the vote pick, the voice answer, prompts: ask/curate/reorder/anonymous),
`src/lib/vote-question-rule.ts` (175), `src/lib/voice-answer-rule.ts` (239), `src/lib/voice-answer.ts`,
`src/lib/link-preview.ts` (416) + `src/lib/link-preview-core.ts` (518) (a pasted link becomes a
card, 2026-09-14: server-side fetch of an arbitrary URL, oEmbed for Spotify/YouTube, thumbnails
re-hosted in our bucket, `failedAt` retry-once-a-day), `src/lib/catchups-export.ts` (232) +
`scripts/dev/export-catchups.mjs`, `src/components/catchups/edition/entry-comment-actions.ts`
(comments on answers, 2026-09-10), `src/app/api/upload/audio/route.ts` + `audio/finalize/route.ts`
(a recorded answer, 2026-09-14; `maxDuration = 30`), the `audio/<authorId>/` ownership rule, the
CatchupEntry/CatchupPromptOption/CatchupEntryLove/LinkPreview schema blocks and their migrations
(`2026-09-14-link-previews.sql`, `-voice-answers.sql`, `-vote-questions.sql`, `2026-09-10-comments-on-answers.sql`).
Also touch: `src/lib/upload-shared.ts` and `storage.ts` as far as the audio path leads.

**Spec:** `docs/spec/catchups.md` §3.7–3.12 + `docs/planning/catchups-rework/architecture.md`.

**Primary taxonomy:** 6c(1)(2)(3): one answer per (promptId, authorId) — is P2002 handled on a
double submit; the `baseUpdatedAt` precondition on edit (C-125's fix) still present after the
rework?; vote change = ? (update in place or delete+create; what does the unique do); 6g the audio
path: size/length caps (2 minutes — enforced where? by whom?), MIME, ownership, orphaned audio on
abandon, purge includes audioUrl?, CSP media-src; 6h link previews: SSRF (private IPs, redirects to
internal hosts, `file:`), response size caps, timeouts, HTML parsing of hostile pages, oEmbed shape
drift (TRAPS: Spotify art host rotated once already), the thumbnail re-host writing unbounded
objects into the bucket from any pasted link, `LinkPreview` rows never deleted (unbounded table),
the `failedAt` retry; 6i transactions across the network (a preview fetch inside a transaction?);
comments-on-answers: the dual-owner Comment (entryId), its notifications, hide/delete, purge;
identity: an answer by a blocked/deleted member in a published Edition; the export's data for a
leaver.

**Seeded questions:** (1) Where is the 2-minute voice cap enforced and can a client send 20
minutes? (2) `link-preview.ts` — does it follow redirects, cap bytes, time out, refuse
`localhost`/RFC1918/link-local/IPv6 targets, and what does a 50MB page do to a Vercel function?
(3) Are LinkPreview thumbnails ever purged, and can one pasted link per answer fill the bucket?
(4) A vote for an option of ANOTHER question is refused by the composite FK — but what does the
member see (a Prisma error page)? (5) submitEntry with body, images, audio AND a vote at once —
"a vote may carry a line beside the pick; photographs and a recording may not" — enforced server-side?

---

## T3 — catchups-surfaces (pages + client)

**Own:** every page and loading under `src/app/(main)/catchups/**` (index, [catchupId]/(home),
[catchupId]/answer, edition/[editionId], round/[editionId] — the OLD name, still a page: redirect
shim or dead duplicate?, new, layout) and `src/app/catchups/join/**` (public); `src/components/catchups/**`
(7,396: home/catchup-home, home/collecting, home/people-door, home/picture-picker-dialog,
answer/answer-experience, answer/answer-card, answer/photo-attachments, answer/song-attachment,
answer/completion-card, answer/answer-redirect, edition/reader 754, edition/reader-parts,
edition/navigator, edition/photo-run, edition/entry-love-button, edition/not-yet-published,
index/*, create/*, settings/settings-surface, join/accept-invite, almost-ready, not-available);
`src/lib/magazine/**` (2,692: "design the magazine as a layout engine, with its corpus, room and
printer" 2026-09-14) + `scripts/dev/print-magazine.mjs`; `src/lib/photo-wall.ts`; `src/lib/catchups-edition-view.ts` as consumed here.

**Spec:** `docs/spec/catchups.md`, `docs/planning/catchups-rework/architecture.md`,
`docs/planning/catchups-rework/brief.md` (his words on what it must feel like).

**Primary taxonomy:** 6b on every client component (effects, cleanup, out-of-order responses when
a member answers two prompts fast, stale closures over the edition, index keys on reorderable
prompt lists, `useOptimistic` on love/delete); 6c router cache after a mutation (answer submitted →
navigate to home → is the answer there?); loading boundaries (TRAPS: the outer boundary paints);
6h every input surface (answer body, prompt text, theme, title/intro rename, vote options, the
transcript field); identity/empty states: a Catch-up with zero members, zero editions, a batch
Catch-up waiting for questions, a sealed capsule, a viewer who left, a non-member hitting a URL,
a stranger on the join page; the reader's "who wrote in" with a deleted author; the photo run
capped at three; "More under an answer only shows when there is more".

**Seeded questions:** (1) What does `/catchups/round/[editionId]` do today and does anything
still link to it (notifications written before 2026-09-08 carry `/catchups/round/...` links —
check `Notification.link` rows read-only)? (2) The answering surface moved onto the home
(2026-09-09) — the C-125 lost-update guard: is `baseUpdatedAt` still threaded through the new
component per prompt? (3) The magazine printer: is it reachable from the app or only from a
script; what does it do with a 60-entry Edition (time, memory)? (4) The join page for a stranger:
what does it show, and can a token enumerate?

---

## T4a — collection-pipeline (server)

**Own:** `src/app/(main)/collection/actions.ts` (1,283: contributePhotoDirect, the FormData
fallback, loadPhotos, edit, remove, love, set-aside, approve/decline in review, screen copies),
`src/app/(main)/collection/collection-data.ts` (329), the two Collection pages + loadings
(`maxDuration = 60` on both — why?), `src/lib/collection.ts` (608), `collection-photo.ts` (231),
`collection-image.ts` (152; SCREEN_PX 3200, q82), `collection-intake.ts` (174), `collection-viewer-image.ts`,
`collection-viewer-facts.ts`, `collection-shape.ts`, `collection-facets.ts`, `river-cursor.ts`,
`river-geometry.ts`, `photo-layout.ts` (731), `photo-visibility-rule.ts` (240), `photo-suggest.ts`,
`photo-save-name.ts`, `taken-date.ts` (379), `file-taken-date.ts`, `exif-date.ts` (159),
`image.ts` (307), `image-cdn.ts`, `image-record.ts`, `image-purge.ts`, `image-downscale.ts`,
`upload-shared.ts` (373), `upload-client.ts` (243), `upload-ownership.ts` + `-rule.ts`,
`storage.ts` (392), `src/app/api/upload/route.ts` (`maxDuration = 60`), `upload/presign/route.ts`,
`upload/finalize/route.ts`, `src/app/api/photo/download/route.ts` (streams sharp output — TRAPS 4.5MB
response), the Photo/PhotoLove/Image/PendingImagePurge schema blocks, migrations
`2026-08-28-collection-river.sql` → `2026-09-23-photo-screen-copy.sql`; the scripts that write
production data: `scripts/dev/backfill-screen-copies.mjs` (ran 2026-09-24 against production:
1,940 copies, has a `reconcile` mode), `import-album.mjs` (530; three objects concurrently with
all-or-none rollback), `sweep-stranded-originals.mjs`, `backfill-image-dimensions.mjs`,
`tag-photos-apply.mjs`/`-pick.mjs` (the hand-run pass; read `docs/spec/hand-run-passes.md`).

**Spec:** `docs/spec/media.md` (§4.2 has the encode table — TRAPS says an earlier version of it
was wrong; read it against the code), `docs/planning/collection-rework/` (spec + handover),
`docs/planning/class-collection/spec.md`.

**Primary taxonomy:** 6g in full (presign/finalize contract, Content-Type, expiry vs a 20MB
upload on a phone, the client's bytes vs the server's re-verify, staging/ prefix and the abandon
path, orphaned objects on every failure exit, delete ordering, `photoStoredUrls` in EVERY deleter
now that `screenUrl` exists: remove, decline, purge, retention, the sweep script, the reconcile
mode); Sharp: EXIF orientation, animated, decompression bomb (40MP area cap), PNG EXIF (TRAPS),
HEIC; 6j the river's keyset over `takenKey DESC, id DESC` and the class river, the decade rail
count, `findMany` bounds, the trigram searches, the two-scope visibility rule (`scope` +
`classYears` token-exact); 6h `photoYear`/`photoMonth`/`era`/`datePrecision` boundaries (year 0,
1800, 2100, month 13, decade math), caption caps; 6c races: two contributions of the same staged
key (`sourceKey` unique), love double-tap per photograph, edit vs admin decline; 6i the backfill
and import scripts as production write paths (idempotency, partial failure, running twice, running
while a member uploads).

**Seeded questions:** (1) After 2026-09-23, which code path opens `screenUrl` and which still
opens `url`; is `screenUrl` NULL handling right on every surface (viewer, download, cover reuse,
post reuse, the magazine)? (2) The FormData fallback encodes 1600px q80 while direct encodes full
resolution — TRAPS says this divergence is an OPEN owner question, not a design; is it still
there, and can the fallback be reached by accident (CSP, a 4.6MB phone photo)? (3) Does the
download route stream for EVERY branch, including the JPEG conversion path
("saved photographs are JPEGs" 2026-09-08)? (4) `heldAt` (set aside, 2026-09-15): does it clear
on approve AND decline, and does the class river / "waiting on you" count agree? (5) The
`Image` table (feed photographs): rows never deleted when a post is — orphaned rows by design, or a
leak? (6) `import-album.mjs` wrote 1,719 photographs into a class scope — what does it do on a
re-run, on a caption file with a bad row, on a duplicate filename?

---

## T4b — collection-surfaces (client)

**Own:** `src/components/collection/*` (6,598: collection-client 1,800, contribute-room 1,339,
photo-river 774, year-rail, river-controls, photo-scrubber ("a year you can hold" 2026-09-13),
edit-photo-dialog, contribute-stage, file-says, photo-questions, bucket-tiles, scope-caret,
collection-skeleton), `src/components/common/image-viewer.tsx` (1,114; screen copy then master on
zoom, 2026-09-23; the outcome Map), `lazy-image-viewer.tsx`, `pinch-zoom.ts`, `photo-frame.tsx`,
`photo-rows.tsx`, `photo-opener.tsx`, `photo-carousel.tsx`, `carousel-arrow.tsx`, `photo-aim.tsx`,
`attach-image-dialog.tsx`, `src/lib/back-closes.ts` (224; "back closes a photo, dialog, sheet or
drawer instead of leaving the page" 2026-09-14 — TRAPS lists three App Router history traps it
handles), `src/lib/upload-client.ts` as the browser half, `src/lib/image-downscale.ts` (the
browser shrink), `src/components/feed/rail/collection-module.tsx`, `src/app/(main)/collection/[id]/page.tsx`
as the permalink entry, `e2e/collection-*.spec.ts` + `e2e/comments-close.spec.ts` (what they pin).

**Spec:** `docs/spec/media.md`, `docs/planning/collection-rework/`.

**Primary taxonomy:** 6b in full (this is the most-fixed client surface of the month: "the river
stops fetching itself, and re-rendering itself" 2026-09-09, "a year stops going blank when a
photograph joins or leaves it" 2026-09-12, "pressing the oldest year from another order lands at
the top" 2026-09-13, "the hover never animated" 2026-09-09 — each fix is a place a sibling bug
lives): effects without cleanup, IntersectionObserver/scroll listeners, `listGeneration`-style
guards on every fetch that can be superseded, `appendUnseen` dedupe on every page append, the
outcome Map in the viewer (a failed screen copy → master fallback → failed master → terminal state),
the upload progress + "ask before discarding a drop" (leave guard vs back-closes vs the
visibilitychange flush), the contribute room's staged uploads on tab close; 6h every input in the
contribute room and edit dialog (caption, year, month, decade, bucket tiles, class year); 6c the
`?when=` / `?scope=` search params and the router cache after a contribute/remove; identity/empty:
a class viewer with no batch year (teacher), a member of a class with zero photographs, the
`/collection/[id]` permalink to a hidden/declined/other-class photograph.

**Seeded questions:** (1) The viewer opens the screen copy and fetches the master "only on zoom" —
what if the member zooms before the screen copy has arrived, or the master 404s (backfill
reconcile deleted it)? (2) `back-closes.ts`: a dialog inside the viewer inside the river — how many
history entries, and what does a second Back do? (3) The scrubber is "a timer rather than a
state" (OPERATIONS §1) — is that timer cleared on unmount and on route change? (4) The river's
keyset pages under `?when=` when a year is empty.

---

## T5 — auth-email-tokens

**Own:** `src/lib/auth.ts` (528 — the orchestrator has read it; you read it again with fresh
eyes), `session-revocation.ts`, `auth-tokens.ts` (329), `email-queue.ts` (1,051), `email.ts` (255),
`email-templates.ts` (387), `mail-policy.ts` (335), `verification-mail.ts`, `email-verification.ts`,
`email-gate-message.ts`, `member-gate.ts` + `-message.ts`, `rate-limit.ts` (338; Upstash, fails
open) + `rate-limit-message.ts`, `turnstile.ts` (236) + `turnstile-origin-rule.ts`, `human-pass.ts`
+ `human-pass-rule.ts`, `bot-check-detail.ts` + `bot-check-message.ts`, `login-attempt.ts`,
`app-secret.ts`, `timing-safe.ts`, `email-address.ts`, `password-rule.ts`, `mask-email.ts`,
`next-path.ts`, `origin.ts` + `origin-rule.ts`, `sign-in-unavailable-message.ts`, `wordle.ts`(?);
`src/components/auth/*` (3,272: actions.ts 226 (signup), email-actions.ts 434 (forgot/reset/
verify/resend), trivia-actions.ts (the trivia gate, "folky" fixed 2026-09-23), verification-actions.ts
(member verification: office_list/community/admin_manual), signup-form 702, login-client (under
(auth)/login), trivia-gate, verify-email-banner, verify-email-dialog, member-verify-dialog,
turnstile-widget, password-field, auth-panel, auth-first-frame); every page under `src/app/(auth)/**`
(login, signup, forgot-password, reset-password, verify-email, error.tsx); `src/app/api/auth/[...nextauth]/route.ts`,
`src/app/api/dev-login/route.ts`, `src/app/api/resend/webhook/route.ts` (189), `src/app/(main)/admin/mail/actions.ts`
+ `admin/mail/page.tsx` + `components/admin/mail/*`; `src/types/next-auth.d.ts`; the User (auth
columns), AuthToken, OutboundEmail, QueueLease, LoginAttempt schema blocks; `scripts/dev/set-password.mjs`,
`email-mark.mjs`; `src/lib/security-regressions.test.mjs` (what it pins — and what it does not).

**Reference:** `docs/SECURITY.md` (the 2026-08-20 overhaul's record — security proper is DONE; you
are after stability, races, lockouts, dead ends and lies), `docs/spec/admin.md` §mail.

**Primary taxonomy:** 6e in full; 6i the mail queue (lease, claim, backoff, deferrals, the 100/day
budget's UTC midnight, `after(drainMailQueue)` on every authenticated page view, fold rules, the
retry action), the Resend webhook (Svix signature, replay, out-of-order delivered/bounced, an
event for a row that does not exist); 6k email provider down mid-signup — can they ever verify;
Turnstile unreachable at signup (hard refusal) vs login (soft since 2026-09-11 — the
`login-unverified` meter: 5/hour/IP, spent on success too?); rate limiter fails open — what is
the symptom when Upstash is down; 6h email normalization (unicode, plus-addressing, trailing dot,
case) consistent across signup/login/reset/verify/roster match; the trivia gate's normalize and
one-edit rules against every question; the signup form's every field (name, email, password,
batch/year/grade/teacher tenure — six-value each); identity: a deletion-requested member signing
in cancels the request (notification best-effort) — two devices; a blocked member's token; a
member whose row is purged mid-request.

**Seeded questions:** (1) `dev-login` writes presence/login telemetry against whoever it signs in
as — does it write `LoginAttempt`/`AuditLog` rows that the analytics room counts? (2) Cookie
chunking: the JWT carries id/role/batchType/batchYear/credentialVersion — under 4KB always? (3)
The ABSOLUTE 90-day expiry: what happens mid-form when it lapses (letter desk autosave, Catch-up
answer, upload finalize)? (4) `recordLoginAttempt` "cannot throw or block" — verify; and the
`console.warn` on the unverified budget — is that read anywhere in production? (5) The verify
link minted at DRAIN time: a member who signs up, waits 3 days for the budget, then clicks — is
the token's expiry counted from mint or from signup? (6) The password-changed mail, the reset
flow's `after()` timing equalisation — still there?

---

## T6 — people-profile-directory

**Own:** `src/components/profile/*` (5,651: letterhead-profile 2,048, profile-actions.ts,
contacts-editor, house-chain-editor, houses-chain, admission-stamp, get-in-touch ("the person's
calling card" 2026-09-09), flag-person-dialog, saved-posts-feed, profile-author-feed,
admin-profile-tools, letterhead-sheet, pen, stray-hair*), `src/app/(main)/profile/[id]/**`;
`src/components/settings/*` (1,647: actions.ts 254, theme-actions, avatar-upload, avatar-crop-dialog,
dark-gauntlet 603, nightfall, lights-on), `src/app/(main)/dark-mode/**`, `pick-bird/**`,
`birds/**`; `src/components/onboarding/*` (988: actions.ts, onboarding-flow, steps/*),
`src/app/(main)/welcome/**`; `src/components/directory/*` (2,196: directory-client 824,
alumni-map 884, directory-grid, profile-card), `src/app/(main)/directory/**` + `directory/actions.ts`;
`src/app/api/places/search/route.ts`, `api/users/search/route.ts`, `api/account/export/route.ts`
(350; the data export — every table a member owns?); `src/lib`: `avatar.ts`, `avatar-swap.ts`,
`bird*` if any, `batch-year.ts`, `houses.ts`, `house-spans.ts`, `contact-rows.ts`, `phone.ts`,
`social.ts`, `vcard.ts` (the .vcf with the member's photo, 2026-09-11), `place-input.ts`,
`place-lookup.ts`, `place-write.ts`, `place-aliases.ts`, `geocode.ts`, `city-coords.ts`,
`map-cluster.ts`, `directory-facets.ts`, `directory-rule`(test), `profession-tags.ts` (332) +
`scripts/dev/tag-professions-*.mjs`, `roster.ts` + `roster-rule.ts` (office-list verification),
`normalize.ts`, `people-select.ts`, `theme.ts`, `local-storage.ts`, `validators.ts` (321 —
shared: read it whole, note which schemas belong to other territories and flag caps that disagree
across writers), `utils.ts` (551 — shared; read `formatTimeAgo`/date helpers for L3's benefit),
`content-view.ts`; the User (profile columns), UserPlace, Place, RosterEntry, ContentView schema
blocks; `src/components/common/location-picker.tsx`, `year-input.tsx`, `tag-input.tsx`,
`house-options.tsx`, `bird-avatar*.tsx`, `identity-row.tsx`, `person-name.tsx`, `verified-mark.tsx`.

**Spec:** `docs/spec/profile.md`, `directory.md`, `avatars.md`, `docs/spec/person-row-audit.md`,
`docs/spec/hand-run-passes.md` for the profession pass.

**Primary taxonomy:** 6h in full on the profile pen (name, bio, about, cities, houses JSON
`[{year,house}]`, phones JSON, links JSON `{label,url}` — javascript: URLs?, displayEmail/showEmail,
workplace/jobTitle, batch/year/grade, teacher tenure, admission number), settings (password change,
theme, avatar crop: dimensions, EXIF, non-image), onboarding steps (each writes to the real row;
resumable? skippable? re-enterable after done?), directory filters (every facet, batch range
bounds, city aliasing, profession tags, sort), the places search (LIKE escaping, length, the
trigram index, result bound), users search (mention/people pickers; teacher exclusion per C-006's
fix), the export (size, every relation, a member with 1,700 photos → 4.5MB response cap?); 6c races:
UserPlace wipe-and-recreate under the unique (documented), avatar CAS (C-050), profile edit vs
admin edit of the same row, two tabs of onboarding; 6j the directory page's 7-leg `Promise.all`
vs the 5-connection pool, the map's cluster query, `findMany` bounds on the grid, batch-year
group counts; identity: teacher/ex_teacher (no batchYear, tenure instead) on EVERY batch-keyed
surface (directory batch filter, batch group, batch Catch-up, profile letterhead), blocked/
deletion-requested rows held out of the directory AND search AND map AND users-by-batch, a
profile URL for a purged id, a member with houses `"[]"` (bugs.md).

**Seeded questions:** (1) The export route: which tables, is it bounded, does it include other
members' data (comments on my post? their names?), can it exceed 4.5MB, is it rate-limited? (2)
`vcard.ts`: photo embedded as base64 — size; a name with a comma/semicolon/newline (vCard
escaping); non-ASCII. (3) The dark gauntlet writes `User.theme` AND a cookie — the two can
disagree (C-138 is an owner decision; a NEW divergence is not). (4) The onboarding "done" step:
can a member land on /welcome again and what does it overwrite? (5) The map: a place with lat/lng
null, two members at identical coordinates, 2,000 pins in the browser.

---

## T7a — admin-purge-retention

**Own:** `src/app/(main)/admin/**` pages (index, people/(index) + people/[id], reports, review,
content, audit, catchups (with T2a), support (with T8a), messages (with T7b), mail (with T5),
analytics (with T7b)) and `admin/layout.tsx`; `src/app/(main)/admin/people/actions.ts` (655:
block/unblock/role/verify/merge/delete/edit/note), `admin/reports/actions.ts`, `admin/review/actions.ts`
(approve/decline with reason 2026-09-21/set aside 2026-09-15/date-from-file "in one press"
2026-09-17); `src/components/admin/*` except analytics/ and messages/ (4,771: review-room 831,
person-detail 800, people-list, content-list, report-list, moderation-dialog, use-admin-act,
admin-filter-bar, admin-counts, admin-chrome, admin-nav, admin-chip, admin-person-row,
admin-skeleton, catchup-status); `src/lib/admin.ts` (278; `forbidden()` gate), `admin-people.ts`,
`admin-people-query.ts`, `admin-review.ts` (`AWAITING_REVIEW`), `admin-content.ts`,
`admin-content-query.ts`, `admin-worklist-query.ts` (245), `admin-note.ts`, `account-purge.ts`
(472: every User relation walked?), `retention.ts` (364) + `src/app/api/retention/sweep/route.ts`
(`maxDuration = 300`), `image-purge.ts` (with T4a), `audit.ts`, `prisma-errors.ts`, `roster.ts`
(with T6) + `scripts/dev/import-roster.mjs`, `src/app/lab/actions.ts` + `src/app/lab/layout.tsx`
(the admin gate on the lab) + `src/app/lab/_archive-state.ts`; the AuditLog, Report, AdminThread
(with T7b), PendingImagePurge schema blocks; `docs/spec/admin.md` (726).

**Primary taxonomy:** 6c every admin action re-checks role server-side (not just the layout's
`forbidden()`), Zod on every id; races: last-admin protection (Serializable, P2034), block while
the member is mid-action, merge users (which relations move? which are dropped? the unique on
email/batchYear group?), delete vs the member's own deletion request; 6i the retention sweep
(idempotent under double-fire from `workflow_dispatch` + schedule; partial failure mid-step; what
each step deletes: notifications 30d, Visits?, SearchLog?, LoginAttempt?, AuditLog?, LinkPreview?,
AuthToken, OutboundEmail, AdminMessage 730d, the 60-day purge; the PendingImagePurge drain and its
give-up); the purge (every relation; SetNull vs Cascade vs explicit; R2 objects incl. audio and
screenUrl; the audit row that outlives; `promoteOrphanedGroups`); 6j admin lists — every
`findMany` bound, the worklist's ordering by `verifyStateAt`, the content list including hidden;
review room: 1,960 photos, the waiting pile query, set-aside vs approve vs decline state machine,
decline reason storage and who sees it, the notification to the uploader; identity: an admin
viewing a purged member's page, a report whose post is gone (SetNull thread), a report against a
purged user.

**Seeded questions:** (1) Does the retention sweep's notification cutoff (30 days, settled
2026-09-04) agree with `docs/…/privacy` policy TODAY? (2) `adminMergeUsers`: two members with
Catch-up entries on the same prompt — the unique (promptId, authorId) collides; what happens?
(3) The audit log has no FKs by design — does anything display names by joining ids that no
longer exist and crash on null? (4) `forbidden()` requires `authInterrupts: true` (set) — every
admin PAGE calls the gate, but do the admin ACTIONS (importable from anywhere) each check role?
(5) The lab's `LabRoomState` write from `lab/actions.ts` — admin only? demo-refused?

---

## T7b — analytics-presence-messages

**Own:** `src/lib/admin-analytics.ts` (1,265 — #2 on the Glasswing ranking: 30 writes, 46 date
sites, 15 async, 29 inputs), `src/app/(main)/admin/analytics/page.tsx` (896; `force-dynamic`),
`src/components/admin/analytics/*` (tabs, cohort, presence, heatmap, compare, stat),
`src/lib/last-seen.ts` (351: visits, `SESSION_GAP_MIN`, the 15-minute lastSeenAt throttle, paths
capped at 40), `src/app/api/presence/route.ts` (the browser's page-view beacon since 2026-09-15 —
a POST any signed-in client can call at any rate with any body), `src/components/analytics/*`
(presence-beacon, posthog-client 196, posthog-provider, posthog-identify), `src/lib/search-log.ts`,
`content-view.ts`, `stats-exclusion.ts` ("keep dev and the owner's own use out of the stats"
2026-09-15 — and "the site's own people's payments" 2026-09-22), `fnv1a.ts`, `scripts/ops/snapshot.mjs`
(338; nightly MetricSnapshot writer, PostHog/Sentry/GitHub sources) + `.github/workflows/snapshot.yml`;
messages: `src/app/(main)/messages/**` + `messages/actions.ts` (317), `src/components/messages/*`,
`src/lib/admin-threads.ts` + `admin-threads-server.ts`, `src/app/(main)/admin/messages/**` +
`components/admin/messages/*`; notifications: `src/app/(main)/notifications/actions.ts`,
`src/components/layout/notification-bell.tsx` (500), `unread-store.ts` (one shared count,
2026-09-12), `src/lib/notification-count.ts`, `notification-links.ts`, `post-notifications.ts`
(with T1), `catchups-notify.ts` (with T2a) as the WRITERS of Notification; the Visit, SearchLog,
ContentView, LoginAttempt, MetricSnapshot, Notification, AdminThread, AdminMessage schema blocks;
`docs/spec/admin.md` §analytics/§messages; `src/proxy.ts`'s visit-cookie half.

**Primary taxonomy:** 6h DATES — this file is where IST-vs-UTC will bite: "today", "this week",
day buckets, the heatmap's hour-of-day, cohorts by signup week, "who is online now", the
snapshot's UTC day vs the room's IST labels, `Visit.startedAt/endedAt` maths, the 30-minute gap;
6j unbounded tables (Visit 2,053 rows in ~5 weeks with 221 users → at 2,000 users?; ContentView
bounded by pairs; SearchLog; LoginAttempt written every sign-in) vs what the sweep deletes;
raw SQL in analytics (`$queryRaw` — parameterised? `timestamp without time zone` trap, bugs.md #6);
every analytics query's cost at 2,000 users (the room is admin-only but `force-dynamic` and does
N queries per view); 6c the presence route: auth, body validation (paths array length/element
length/charset), rate, the visit upsert race across tabs, the derived visit id in the proxy;
6a `unread-store.ts` vs the bell's keyset walk vs mark-read races ("a notification you have read
stays read" 2026-09-12 — the fix and its siblings); the 100-per-user prune vs the 30-day sweep;
messages: thread ownership re-checked in every action, memberUnread/adminUnread flag races,
the screenshot upload's ownership, `lastMessageAt` ordering, a member whose thread's report was
deleted (SetNull); identity: a purged member's threads (Cascade) — do admins lose the record?

**Seeded questions:** (1) `/api/presence`: what stops a client posting 10,000 paths or a 1MB
body, and is the beacon fired on every soft navigation (prefetch storm)? (2) The bell reads one
shared count — where is it written on a new notification while the tab is open (poll? never?).
(3) `stats-exclusion.ts`: which ids/emails are excluded, is the list the same for analytics and
for support totals, and what if the owner's id changes? (4) The snapshot: two runs on one UTC day
collide by design; a run at 00:10 UTC records "yesterday" — and the room labels it which IST day?

---

## T8a — money-demo

**Own:** money: `src/app/(main)/support/**` + `support/actions.ts` (299: createOrder,
confirmContribution, bird pick), `src/components/support/*` (1,558: support-contribute 466,
costs-card, bird-picker, bird-plate, plate-data, support-shell, wood), `src/lib/razorpay.ts` (161),
`contribution-state.ts` (181; `PAYABLE_FROM`, `netPaise`, `CONTRIBUTION_SUM`), `stats-exclusion.ts`
(with T7b), `src/app/api/razorpay/webhook/route.ts` (422), `src/app/(main)/admin/support/page.tsx`
(351), the Contribution schema block, `scripts/gen-support-qr.mjs` if present; demo: `src/lib/demo.ts`
(316; `demoWriteAllowed`, DEMO_CLOSED_PATHS mirror), `src/lib/demo-seed/**` (2,479), `src/app/api/demo/reset/route.ts`
(`maxDuration = 120`, `force-dynamic`), `src/components/demo/demo-bar.tsx`, `scripts/demo/verify-guard.mts`,
`src/lib/demo.test.mjs`, `docs/spec/demo.md` (348), the demo half of `src/proxy.ts`, `src/lib/auth.ts`'s
`demoSession`, `src/lib/prisma.ts`'s `$allOperations` guard, and `IS_DEMO` at every action that
names it (grep).

**Primary taxonomy:** money: 6i webhook replay/out-of-order/duplicate (capture after refund,
refund before capture, partial refunds via `refundedAmount` + `reversalIds`, dispute), the
browser callback vs webhook race on `razorpayOrderId` unique, amount server-authoritative,
livemode filtering on EVERY sum, the "site's own people" exclusion (2026-09-22) applied to every
sum (support page, admin support, the bird perk, the build bar), the bird pick grant (`birdPickedAt`
vs a newer paid contribution), 6h amount bounds (₹1 minimum? ₹10,00,000? "Other" free text →
paise rounding, NaN, negative, decimals), currency; 6k Razorpay down mid-checkout (row stuck
"created" forever — is that "normal and worth seeing" or a leak?); demo: the three layers agree
(proxy list == demo.ts list, pinned by a test?), every NEW model since 2026-08-25 (Image,
LinkPreview, CatchupEditionRead, CatchupPromptOption, QueueLease, PendingImagePurge, audio) is
in the allowlist or correctly denied, the reset's atomic transaction vs the new tables, telemetry
tables not writable by anonymous visitors (presence route on the demo!), `sendMail` refuses,
uploads refused incl. AUDIO and presign, the demo persona's row edited by every visitor.

**Seeded questions:** (1) `/api/presence` on the demo: is Visit writable by anonymous visitors
(disk fill)? (2) The "site's own people" exclusion: by id, by email, by role? — and does the
webhook's bird-pick grant also skip them, or does the owner get a bird for a test payment? (3) A
contribution with `userId` null (SetNull after purge) in the admin support list — rendered how?
(4) Demo reset at 20:00 UTC while a visitor is mid-"answer" — what do they see?

---

## T8b — shell-common-config

**Own:** `src/proxy.ts` (423 — the orchestrator has read it; re-read with the route inventory
in hand), `src/app/layout.tsx`, `src/app/(main)/layout.tsx` (206: session, the awaits ABOVE every
loading.tsx, `touchLastSeen`, the sign-in redirect with `x-pathname`/`x-search`), `(policies)/layout.tsx`,
`src/app/error.tsx`, `(main)/error.tsx`, `(auth)/error.tsx`, `not-found.tsx`, `(main)/forbidden.tsx`,
`src/app/page.tsx` (landing), `about`, `guide/**` + `src/components/guide/*` (824) + `src/lib/guide-*.ts`,
`hoopoe/page.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts`; `src/components/layout/*` (2,575:
sidebar 815, page-header, app-shell, content-column, search-pill ("the header glass rests in the
bell's circle" 2026-09-14), app-bar-title, konami-eggs, rail-grid, peaks-mark; NOT
notification-bell/unread-store — T7b); `src/components/common/*` NOT owned by T4b/T6 (motion.tsx,
motion-features*.ts, confirm-dialog, use-closing-dialog, use-leave-guard, focus-modality,
use-deferred-autofocus, use-wide-viewport, use-coarse-pointer, control-geometry, segmented-pills,
float-field, meta-dots, info-tooltip, share-button, flush-avatar, skeleton, rich-text-area,
filters/* (the facet-filter kit: filter-sheet "one bottom sheet with a shared title, round X and
swipe to close" 2026-09-15), love-button, bookmark-button, use-user-search); `src/components/ui/*`
(1,651: the shadcn/base-ui primitives: dialog, sheet, popover, select, dropdown-menu, combobox,
button, input, textarea, sonner, field-focus, menu-material); `src/components/landing/*` (2,956);
`src/components/pwa/*`; `src/instrumentation.ts`, `instrumentation-client.ts`, `next.config.ts`
(CSP, headers, rewrites, `serverActions.bodySizeLimit` 25mb, `proxyClientMaxBodySize` 25mb,
`allowedDevOrigins`, `pageExtensions`), `vercel.json`, `package.json` (scripts, overrides,
`postinstall: prisma generate`), `tsconfig.json`, `eslint.config.*`, `e2e/playwright.config.ts`,
`src/lib/api-gate.ts` (164), `page-label.ts`, `origin.ts`, `utils.ts` (with T6), `local-storage.ts`,
`theme.ts`, `src/app/globals.css` only as far as a runtime bug leads (not design).

**Primary taxonomy:** 6c the proxy's public allowlist vs the route inventory (`work/charters.md`
lists every route file under T8b's own section end); prefix matching side effects (`/catchups/join`
public → `/catchups/join/anything`); the `//` path trick; `x-pathname` trust; the visit cookie on
server actions (documented trap) — and on RSC prefetches; the `/` → `/feed` redirect with a stale
cookie loop; the LEGACY_HOST 308; `/ingest` cookie strip; the (main) layout: what it awaits, what
happens when the session read throws (DB down → every page blank? the error boundary?), the
redirect-with-next round trip for a revoked session; error boundaries: does every segment that
can throw have one, and does `error.tsx` reset work; `not-found` for signed-out (bugs.md #5b);
CSP vs every host the app actually talks to (audio, Spotify art, YouTube stills, R2 S3 PUT,
Razorpay, Turnstile, PostHog) — a directive miss is a silent break; `bodySizeLimit` 25mb vs
Vercel's 4.5MB; `instrumentation.ts`'s Sentry init (server-only, sample rates, PII, quota storm);
`instrumentation-client.ts` — what runs on every page; PostHog identify with what fields; PWA
manifest/install prompt; the landing page's static-ness (does anything opt it into dynamic?);
`sitemap.ts`/`robots.ts` listing gated routes; 6b the shared primitives (dialog focus traps,
sheet swipe-to-close listeners, sonner), `use-leave-guard` vs `back-closes`; 6a `api-gate.ts` — what
it gates and what bypasses it.

**Seeded question:** the crawl baseline in this session hit 25s navigation timeouts on `/birds`,
`/guide`, `/profile/<id>` and `/` — cold Turbopack compiles most likely, but if any of those has a
render-blocking await that can hang (a `fetch` with no timeout, a `Promise.all` over the pool), say so.

---

## T9 — mascot

**Own:** `src/components/mascot/**` (5,728: hoopoe.tsx 1,701 (the SVG rig, 47 async/listener
sites), mascot-flight-layer 597, mascot-flight.ts, use-flight-arrival 351, use-hoopoe,
use-hoopoe-life, sidebar-hoopoe, resident-hoopoe, hoopoe-warmup, hoopoe-kit, hoopoe-playground,
moments/* (18 files: celebration-detector, celebration-signals, one-hoopoe-guard, one-shot,
rare-idle-behaviors, logo-easter-egg-hoopoe ("three clicks on the logo raise the app icon's hoopoe
over the screen" 2026-09-17), logo-peek, not-found-stage 378, fly-away, contributed, no-results,
no-saved, messages-empty, celebration, moment-hoopoe)), `src/lib/hoopoe-geometry.ts` (375),
`src/lib/edge-light.ts`, `src/components/landing/footer-hoopoe.tsx` + `perching-birds.tsx` +
`ambient-leaves.tsx`, `src/app/hoopoe/page.tsx` (public playground), `docs/spec/mascot.md`,
`scripts/qa/hoopoe-*.mjs` (what they pin).

**Primary taxonomy:** 6a resource leaks — every `setTimeout`/`setInterval`/`requestAnimationFrame`/
`addEventListener`/`ResizeObserver`/`IntersectionObserver`/motion animation controls: cleared on
unmount? on route change? on a second mount (React strict mode double-invoke)? The "one hoopoe"
guard under two moments firing at once; the idle loop vs a verb (`coverEyes`/`peek` are
deliberately unqueued — bugs.md #20 says the login peek never works; find the mechanism, it may
be the same defect elsewhere); the flight layer's portal across navigations (a flight in progress
when the destination unmounts); the celebration detector's listeners; the easter egg's global
click counter; memory growth on a long session (the sidebar hoopoe lives for the whole session —
does anything accumulate: timers, motion values, SVG nodes?); `hoopoe-warmup` and what it costs
every page; 6b effects/deps/stale closures across 26 files; reduced-motion: "nothing checks the
reduce-motion setting any more" (2026-09-08, owner decision) — note only if something STILL
checks it inconsistently.

This territory is client-only and cannot corrupt data; its bugs are leaks, jank, stuck states
and the login peek. Severity accordingly (a leak that grows for the whole session is Medium; a
stuck moment that hides a button is High).

---

## L1 — races-mutations (lens)

**Question:** for EVERY mutation in the app — all 22 `actions.ts` files (`src/app/(main)/*/actions.ts`,
`src/app/(main)/admin/*/actions.ts`, `src/components/{auth,onboarding,posts,profile,settings,
catchups/edition}/*actions.ts`, `src/app/lab/actions.ts`) and every writing API route (upload ×5,
presence, razorpay, resend, catchups/tick, retention/sweep, demo/reset, dev-login, account/export
if it writes) — which of the three race classes apply and what actually guards it?

**Method:** build the table first (mutation → rows it touches → the invariant → the guard: a
`@@unique` + P2002 handler / an atomic `increment`/`updateMany` precondition / a `$transaction`
with the right isolation / nothing). Then for each "nothing", construct the interleaving and say
what the member sees. Sweep `schema.prisma` for every `@@unique` and match it to the rule it
protects; list the "only one per X" rules with NO unique (those are the real findings). Check every
`$transaction` (37 sites) for: a network call inside it (R2, Resend, Razorpay, oEmbed, fetch), its
length vs the 5s default timeout, `isolationLevel`, P2034 retry on Serializable, partial-write
handling on throw. Check every `updateMany`-as-CAS for the count=0 branch. Check every toggle
(hearts ×5+, bookmark, read marks, archive, reminderMode, set-aside, hide) for delete-first+P2002
or in-flight guards. Check double-submit on every form (`double-submit.ts` — who uses it, who
doesn't). Check out-of-order completion on every rapid-fire client action (autosave, answer edit,
filters, search). Read `docs/TRAPS.md` "Prisma" first.

**Deliverable:** the table itself goes in your report (it is the 2k dossier's concurrency
appendix), then findings.

---

## L2 — caching-rendering-routes (lens)

**Question:** where does the App Router serve something stale, blank, wrong-user, or 200-with-a-
broken-page — and does the proxy's public allowlist match the routes that exist?

**Method:** (a) The route inventory: every `page.tsx`/`route.ts`/`layout.tsx`/`loading.tsx`/
`error.tsx` outside `/lab` (find them; ~110). For each page: dynamic or static? what does it
await? in a layout or the page? behind which loading boundary (TRAPS: the OUTER boundary paints;
`loading-boundary-rule.test.mjs` exists — read it)? which error boundary? `generateMetadata` +
page double-fetch (`cache()` keyed on strings — TRAPS)? (b) All 135 `revalidatePath`/`revalidateTag`
sites: what layer each purges, what it does NOT purge (the client Router Cache after a
`router.push`/`Link` navigation; `revalidatePath("/feed")` after a comment on `/letters/[id]`?),
actions that mutate and revalidate NOTHING, `router.refresh()` reliance; the "cookie set in an
action = revalidation + scroll to top" trap (proxy.ts documents one instance — find others:
`theme-actions.ts`, `human-pass`, dev-login). (c) `"use cache"`/`unstable_cache`/`React.cache`/
module-level memo: anything per-user captured in a shared scope. (d) `src/proxy.ts` publicPaths vs
the inventory: gated routes reachable without auth, public routes that read a session anyway,
`/catchups/round/[editionId]` (renamed 2026-09-08 — shim?), `/donate`, `/groups`, the `//`
prefix, `x-pathname` consumers. (e) Errors after the shell streamed: server components that throw
after the first flush (a `notFound()`/`redirect()`/`forbidden()` after an await inside a
Suspense boundary). (f) `dynamic = "force-dynamic"` and `maxDuration` exports vs what the page
does. (g) Streaming + `after()`: TRAPS says `after()` throws synchronously outside request scope
— 24 files call it; is each inside a request, and does any call `headers()`/`cookies()` inside
`after()` (refactor audit C4 found one)?

---

## L3 — dates-ist (lens)

**Question:** the server is UTC, the members are IST (+5:30), Vercel crons are UTC, Postgres
columns are `timestamp without time zone` — where does a date, a day, a deadline, a week, a
streak, a bucket or a label shift by 5:30 or a day?

**Method:** all 198 `new Date(`/`Date.now(` sites outside lab/tests, every `toLocale*`,
`getHours/getDate/getDay/setHours`, `timeZone`, `Asia/Kolkata`, every `addDays/addMonths/
startOfDay`-style helper (`utils.ts` has 43 date sites — read them all), every `@db.Date` column
(MetricSnapshot.day), every raw SQL with `date_trunc`/`::date`/`now()`/`interval`
(admin-analytics.ts has 46 date sites and raw queries), every cron schedule and the comment beside
it, `valleyDaysLeft`/`daysLeftUntil`/`answersCloseSentence` (audit 2 unified three surfaces —
verify the fourth and fifth agree), "07:00 IST" deadlines (2026-09-08), the capsule's "a year on"
(leap day: sealed 2028-02-29 opens when?), the read mark's `readAt`, `formatTimeAgo` on the
client vs server (hydration mismatch when the server renders "2 hours ago" in UTC?), the
"New since you were last here" divider (`feedSeenAt`), the mail budget's UTC midnight (documented
deliberate — check it is still the same after the queue changes), the retention cutoffs (30 days
from when?), `Visit` gaps across midnight, the analytics heatmap's hour-of-day (IST or UTC?), the
snapshot's day, cohorts by week (which weekday starts a week?), `photoYear`/`exifYear` (the EXIF
date's timezone — none — vs `taken-date.ts`), `valley-day.test.mjs` (what it sweeps and what
escapes it: a date rendered without a time zone in a NON-tsx file, in an email template, in a
.vcf, in an export). `bugs.md` #6 (raw-SQL timestamp trap) is known — find where it is LIVE.

**Deliverable:** a table of every date computation that matters (surface → what it computes →
tz assumption → correct? → member-visible effect), then findings.

---

## L4 — silent-failures (lens)

**Question:** of the 204 `catch` sites outside lab/tests, plus every `.catch(() => {})`,
`void promise`, `try {} catch {}` fallback, `?? default`, optional chain that hides a null that
should be an error, `console.error` that nobody reads in production, and Sentry capture that may
be quota-limited — which ones let execution continue into a state a member will later see as
wrong, and which hide a breakage that would otherwise be caught in minutes?

**Method:** you ARE `.claude/agents/silent-failure-hunter.md` — read it and apply it to the WHOLE
of `src/lib`, every `actions.ts`, every API route, `src/proxy.ts`, `src/instrumentation*.ts`,
`scripts/ops/snapshot.mjs`, `scripts/dev/{backfill-screen-copies,import-album,sweep-stranded-originals}.mjs`.
For each catch: what is caught, what is swallowed, what is logged and where the log goes (Vercel
function logs are ephemeral; Sentry is server-only with what sample rate?), what state is left,
whether the member sees a lie ("saved" when it was not), whether telemetry hides its own failure
(CLAUDE.md's `touchLastSeen` rule: log loudly in development at least). Grade each: OK (deliberate,
documented, harmless) / SMELL / BUG. Pay special attention to: `recordLoginAttempt` ("cannot
throw"), `writeAudit`, `touchLastSeen`, `logSearch`, `bumpContentView`, the mail drain's
`bookFailure`, `purgeImageUrls` fallbacks, the link-preview fail-soft, the presence beacon, every
`after()` body (errors inside `after()` vanish), `Promise.allSettled` results that are never read,
`.catch(() => null)` on a fetch whose null then flows into a render. Also: `error.tsx` files —
what do they show and do they report?

---

## L5 — scale-2k-and-connection-budget (lens)

**Question:** with 2,000 registered members (tens to low hundreds concurrent) what breaks first,
and what is the actual connection arithmetic?

**Method:** (a) The arithmetic, with real numbers: Postgres `max_connections` = 60 on this
Supabase compute (read-only: `SHOW max_connections`; `SELECT count(*) FROM pg_stat_activity`;
`SELECT * FROM pg_settings WHERE name IN ('max_connections','superuser_reserved_connections')`),
Supavisor transaction-mode `default_pool_size` for this tier (check Supabase docs for the Nano/
Micro tier: 15?), the app's `max: 5` per instance, Vercel Hobby concurrency (Fluid compute: how
many concurrent invocations per instance and how many instances?), the GitHub Actions jobs that
also connect (backup via `DIRECT_URL` session pooler, snapshot, retention via the app), `prisma
studio`/dev sessions on the same DB. Put the numbers in a table and say at what concurrency the
pooler queues and at what point `connectionTimeoutMillis: 5000` starts failing requests — and what
the member sees then (prisma.ts says "fast honest error" — which page shows it?). (b) Every
`findMany` (280 sites) with no `take`: list the unbounded ones on member-facing paths, with the
table's growth rate (rows per member per month from the live counts in brief §2). (c) N+1: every
loop body containing `prisma.` or an `await` of a query per item (`for`, `map(async`, `Promise.all(
items.map`). (d) Index coverage: for every `where`/`orderBy` shape on a table that grows with
members (Post, Comment, Like, Notification, Visit, ContentView, SearchLog, LoginAttempt, Photo,
CatchupEntry, CatchupEntryLove, OutboundEmail, AuthToken, UserPlace, GroupMember), does an index
with the right leading column exist (schema + the 11 hand indexes in the schema header)? Run
`EXPLAIN (ANALYZE, BUFFERS)` read-only for the ten hottest queries (feed page 1, comments for a
post, bell page 1, directory grid, collection river page 1, catch-up home, profile page counts,
admin worklist, notification count, the presence upsert) and record whether the planner uses the
index. (e) Over-fetching: `findMany` without `select` on rows with big text columns (Post.content,
CatchupEntry.body, User.about, Comment.content, AdminMessage.body) feeding list views. (f) Fanout:
every O(members) loop per request (batch Catch-up creation for a batch of 60, notification fanout
on a post to a batch, reminder mails per Catch-up per tick, `users-by-batch`). (g) Third-party
quotas: Resend 100/day (launch-day maths: 300 signups → 3 days of verify mail), Upstash free
command quota vs type-ahead search + every rate-limit check per request, PostHog free events,
Sentry free errors during a storm, Turnstile, Cloudflare R2 class A/B ops per month with 1,960
photos × screen + thumb + master per view. (h) Unbounded tables vs retention: Visit, ContentView,
SearchLog, LoginAttempt, AuditLog, LinkPreview, MetricSnapshot, PendingImagePurge, OutboundEmail —
which the sweep prunes and at what age; project row counts at 2,000 members after a year.
(i) Write the **k6 load-test plan** for a preview deployment (smoke → average → spike 0→200
concurrent → 30–60 min soak; thresholds `http_req_failed<1%`, `p95<500ms`; which routes; what to
watch on Supabase) — designing it is in scope, running it against the shared production DB is NOT.

**Deliverable:** the 2,000-user dossier's raw material: arithmetic table, unbounded-query list,
missing-index list (each its own finding), fanout list, quota table, growth projections, the k6
plan — then findings.

---

## L6 — input-validation (lens)

**Question:** for every input that reaches the server — every `formData.get`, every Zod schema
in `src/lib/validators.ts` and inline in actions, every route's `searchParams`/`params`/JSON body,
every webhook body — does the six-value rule hold (empty, one, at-limit, limit+1, invalid,
unicode-hostile), are IDs validated (cuid shape, existence, ownership), and do the CAPS agree
between every writer of the same column?

**Method:** build the input inventory first: action/route → field → schema (or none) → cap →
column → render path (escaped how). Then per field, reason the six values and the string extras
(whitespace-only, 100k chars, ZWJ emoji, combining marks, RTL override, `O'Brien`, `<script>`,
`javascript:` URLs in link fields, `%` and `_` in LIKE searches, NUL bytes (Postgres rejects
`\0` in text — a 500?), lone surrogates (JSON.stringify → `\ud800` → Postgres?), numbers: 0, -1,
`MAX_SAFE_INTEGER`, `1e308`, NaN from `Number("")`, `parseInt("12abc")`, `"0x10"`; arrays:
empty, 1, cap, cap+1, non-array; JSON columns (houses, phones, links, images, targetBatches,
paths) — who parses them on read and what does a malformed value do to the page; dates/years:
1800, 2100, 0, negative, month 13; pagination cursors: a forged cursor string; search params:
`?when=abc`, `?scope=admin`, `?batch=1e9`. Cross-writer cap mismatches (audit 2 found several
between the profile pen and other writers — re-check after the month's changes). Note where
validation is client-only. **Then design the live naughty-strings pass for the orchestrator**: a
table of every text input surface (post, comment, letter title/body, Catch-up prompt/answer/
theme/title/intro/vote option, profile name/bio/about/city/workplace/jobTitle/links/phones,
caption, message to admins, report reason, search boxes ×4, signup name/email, trivia answer,
"Other" amount) with: the file:line of the form, the action it posts to, the column, the render
path, the payload classes worth sending, and the expected safe behaviour — so the orchestrator can
run it with one throwaway account in one sitting.

---

## L7 — client-react (lens)

**Question:** across `src/components/**` and `src/app/**` client components (189 `useEffect`s, 97
listener/timer sites outside lab): where do hooks break their rules, effects leak or race, state
go stale, keys collide, and Suspense/error boundaries leave a member staring at nothing?

**Method:** grep-driven sweep, then read the hits in context: every `useEffect` (deps complete?
cleanup returned for every listener/timer/observer/subscription/AbortController? async work
guarded against unmount and against out-of-order completion?), every `addEventListener`/
`setTimeout`/`setInterval`/`requestAnimationFrame`/`ResizeObserver`/`IntersectionObserver`/
`MutationObserver`/`matchMedia` (removed/cleared?), every `useRef` used as a guard (reset when?),
every `key={index}` on a list that can reorder/insert, every component declared inside a
component, every `"use client"` on a file that could be a server component and drags a server
import (`prisma`, `fs`) or a big dep into the bundle, `useFormStatus` placement, `useOptimistic`
on deletes, `startTransition` around navigations, `router.refresh()` loops, `window.location`
reads at render (hydration mismatch), `localStorage` reads at render, `Date`/random at render
(hydration mismatch), portals (the mobile drawer re-renders components through a Radix/Base UI
portal — TRAPS; duplicate ids, duplicate listeners), `motion` layout animations on lists
(`project_motion_gotchas` memory: gap never animates, SVG scale ignores transformOrigin, layout
prop stretches). T3, T4b, T6, T9 do deep reads of their own components; you are the pattern sweep
over ALL of them plus everything nobody owns (feed rail, landing, guide, pwa, ui, layout,
messages, admin components). Coordinate by citing file:line so duplicates fold cleanly.

---

## L8 — platform-limits (lens)

**Question:** where does this app exceed a Vercel, R2, Supabase, Resend, Upstash, Turnstile,
Razorpay, PostHog or Sentry limit — with the EXACT number from the vendor's current docs (you have
web access: check them; do not trust the numbers in the brief or in code comments)?

**Method:** (a) Vercel: request AND response body 4.5MB (the download route streams — verify
every branch; the export route; `/api/upload` fallback; Server Action `bodySizeLimit` 25mb is
above the platform cap — what does a member see when a 6MB FormData hits the platform 413?),
function duration on the Hobby plan under Fluid compute (default and max; `maxDuration` exports
of 60/120/300 — are 120 and 300 honoured on Hobby?), `after()` and the response lifetime, memory
per function (a 40MP sharp decode?), concurrency limits, cron precision on Hobby (Vercel says
Hobby crons are "once a day, may be delayed by up to an hour" — a 02:00 UTC tick firing at 03:00
UTC = 08:30 IST, after the 07:00 IST deadline — does the tick's logic tolerate lateness?), the
Hobby plan's 2 cron limit (both used), edge middleware/proxy size, build-time DB connections
(does any page pre-render at build with a DB call?), ISR/static of the landing. (b) R2: 1
write/sec/key (every write uses a fresh cuid? the screen-copy backfill? the link-preview
thumbnail keyed by what?), object size, presign expiry, CORS on the custom domain, the class A/B
op counts, Smart Tiered Cache dependence (TRAPS). (c) Supabase free/micro: connection caps (with
L5), `max_connections` 60, disk 500MB (118MB used; growth), pooler behaviours (prepared statements
in transaction mode with the pg adapter — `pgbouncer=true`?), statement timeout 2min platform.
(d) Resend 100/day + 2 req/s (the lease). (e) Upstash free: 10k commands/day? — count commands
per request (`hasBudget` ×2 + `consume` ×2 per login; per search keystroke; per upload). (f)
Turnstile: hostnames (TRAPS: `vercel.app` not on the list), rate. (g) PostHog free 1M events/
month; Sentry free 5k errors/month — an error storm at launch. (h) Sharp memory/pixel limits and
`serverExternalPackages`. (i) Browser limits: `localStorage` quota for the letter belt, IndexedDB?
cookie count/size (4KB JWT), `history` entries.

**Deliverable:** a limits table (limit → vendor's number with source URL → where the app meets it
→ headroom at 2,000 members → verdict), then findings.

---

## L9 — test-quality-and-comment-lies (lens)

**Question:** (a) of the 138 tests (`src/**/*.test.mjs`, `scripts/qa/*.test.mjs`, `e2e/*.spec.ts`)
which ones would still pass if the thing they claim to pin were broken — and which safety
properties of this codebase have NO test at all? (b) Which comments lie about the code beside
them (bug evidence: the code drifted from its contract)? (c) Which types lie (a declared `Date`
that arrives as a string — TRAPS has one; `ActionFailureLike`; the session type; JSON-string
columns typed `string`)?

**Method:** you ARE `.claude/agents/pr-test-analyzer.md` + `comment-analyzer.md` +
`type-design-analyzer.md` applied to the whole repo. For tests: read each, classify (pure unit /
rule-sweep over source / shape-grep for a literal / live-DB / e2e), and for each rule-sweep ask
TRAPS' question — does it pin the PROPERTY or the INSTANCE (a grep for a literal breaks on
refactor and passes on a rename that removes the guard)? For the gate tests (`gate-coverage`,
`cascade-rule`, `security-regressions`, `comment-target-rule`, `loading-boundary-rule`,
`back-closes-rule`, `valley-day`, `index-coverage` if present, `hand-run-passes`, `campaign`,
`ci-parity`, `scripts-ledger`, `progress-log`): what would they miss? Which invariants named in
schema comments and CLAUDE.md have no test (e.g. every deleter includes `screenUrl`; every comment
query names its owner column; every Notification writer uses `notification-links`; every sum
filters livemode AND exclusion; every action checks `IS_DEMO`)? For comments: sweep for
comments that name a caller, a count, a line number, a file, a date, a value, a "the only reader
is…" — and check each against the code (grep the caller). For the e2e specs: what do they assert
and are they run by anything (`npm run test:e2e` is manual)? Read `.claude/skills/check/SKILL.md`
and `scripts/qa/check.mjs` for what the gate actually runs (test floor, crashed-tool detection).

---

## L10 — identity-states-empty-states-chaos (lens)

**Question:** for each identity state and each empty state, walk EVERY surface; then run the
chaos-lite experiments from code.

**Method:** (a) States: a purged user's id referenced by a live post/comment/notification link/
entry/prompt/report/admin thread/contribution/audit row/mention `@[name](id)`/vCard/export; a
blocked user (content hidden everywhere? their notifications? their Catch-up membership and
answers? their photographs (deliberately visible); mentions of them; their profile URL for others
and for themselves (they cannot sign in — but a token minted before the block passes the proxy
and gets the layout's revocation); a deletion-requested user (held out of directory/search — and
feeds? Catch-ups? the bell of others?); an unverified (`emailVerified` null) and an un-vouched
(`verifyState` != verified) member — what each can and cannot do, and whether every write path
that should gate does (`requireVerifiedMember` callers vs the mutation list); a teacher/
ex_teacher (batchYear null) on every batch-keyed surface; an admin acting as a member; a member
promoted to admin mid-session (role read fresh); a member with two sessions who changes
password on one; a brand-new member with nothing (every list surface's empty state: feed with no
posts in batch, directory with one member, Catch-ups none, Collection class with zero, letters
none, messages none, notifications none, saved none, profile with no cities/houses/contacts). (b)
Chaos, argued from code with file:line: DB unreachable for 30s (which pages blank, which show the
error boundary, which actions lie); pool exhausted (`connectionTimeoutMillis` 5s → which error →
which sentence); R2 500/429 on a PUT/DELETE (upload path, purge path, backfill); Resend down
during signup (queue absorbs? verify link timing); Turnstile unreachable at signup/login/reset;
Sentry quota gone (does the SDK throw? block?); Upstash down (fails open — every limiter?); the
tick fired twice / an hour late / skipped a day; the retention sweep killed mid-step; a Razorpay
webhook twice / out of order; a Resend webhook for an unknown id; the session cookie expires
mid-letter / mid-answer / mid-upload; a member's clock is wrong; two tabs editing the same
profile; JavaScript disabled (which forms still submit? progressive enhancement of server
actions); a 2G connection (the presence beacon, the upload progress).

---

## L11 — jobs-webhooks-queues (lens)

**Question:** every scheduled job, webhook and queue: what happens on overlap, double-fire,
lateness, partial failure, replay, out-of-order, unknown ids, and the run that lands on the same
minute as another?

**Own the reads:** `src/app/api/catchups/tick/route.ts` + what it calls in `catchups-core.ts`
(`advanceEdition`, `planNextAction`, reminders, capsule open, batch waits), `src/app/api/retention/sweep/route.ts`
+ `retention.ts` (every step, order, transaction boundaries, the PendingImagePurge drain),
`src/app/api/demo/reset/route.ts`, `scripts/ops/snapshot.mjs`, `.github/workflows/{backup,retention,snapshot}.yml`
(concurrency groups, timeouts, the curl's failure mode, secrets), `src/app/api/razorpay/webhook/route.ts`,
`src/app/api/resend/webhook/route.ts`, `src/lib/email-queue.ts` (the drain, `QueueLease`, claim/
release, `after()` scheduling from every page view, `drainEligible`, backoff, give-up, the UTC
budget), `src/lib/mail-policy.ts`, `src/lib/image-purge.ts` + the sweep's drain, `src/lib/link-preview.ts`
(the once-a-day retry as a queue), `src/app/api/presence/route.ts` + `last-seen.ts` (a
high-frequency write path), `auth-tokens.ts` (opportunistic expiry sweep on mint), and every
`after(` site (24 files) as a fire-and-forget job.

**Method:** for each job: idempotency key or not; what a second concurrent run does (the tick has
no lease? the sweep relies on the Actions concurrency group — and `workflow_dispatch` while the
schedule runs?); `maxDuration` vs the work (tick 120s: N Catch-ups × M members × mail enqueue;
sweep 300s: a purge of a member with 1,700 photos → 3,400+ R2 deletes at what rate?); partial
failure: which rows are left half-transitioned and whether the next run repairs them; lateness
(Hobby cron jitter up to an hour): deadlines at 07:00 IST vs a tick at 08:30 IST — does anything
compute "today" from the run time?; the audit row / log line that proves a run happened (or does
nothing record it, so a silently dead cron is invisible — bugs.md records this happened once);
webhooks: signature check → parse → idempotency → state transition — replay of each event type,
out-of-order pairs (delivered before sent, refund before capture, bounce after delivered), unknown
`providerId`, a 2xx that must always be returned vs a 500 that triggers a retry storm; the queue:
the lease's expiry vs a pass that legitimately runs long, the claim race, the "sending" reclaim
window, folds, priorities, the retry action.

---

## L12 — write-path-invariants (lens)

**Question:** you ARE `.claude/agents/write-path-reviewer.md` — read it. Apply its four invariants
and the demo's three layers to EVERY server action (22 files) and EVERY API route (18), not a
diff. For each mutation: (1) does it re-derive identity from `auth()` and never trust a client id;
(2) does it check ownership/role on the exact row it writes, with Zod on every id and field; (3)
is it demo-safe (an explicit `IS_DEMO` refusal or a `demoWriteAllowed` model rule — and is the
proxy list, the demo.ts list and the action's own guard consistent for it); (4) does it leave the
data invariants intact on every exit (the transaction boundaries, the R2-vs-row ordering, the
notification written for the right recipient, the audit row where the spec demands one). Build the
matrix (mutation × invariant → evidence line) and report every empty cell. Also: the `api-gate.ts`
helper — who uses it and who hand-rolls; `requireVerifiedMember`/`requireAdmin` callers vs the
full mutation list; server actions exported from a file that also exports a non-async (TRAPS —
runtime break); actions reachable from the demo persona that write to Meera's real row by design
(profile edit) and which of those are unbounded.

---

## Route inventory (for L2, T8b, L10) — every non-lab route file as of 2026-09-24

(auth): error.tsx, forgot-password, login, reset-password, signup, verify-email.
(main): about; admin/(index); admin/analytics; admin/audit; admin/catchups/(index);
admin/catchups/[catchupId]; admin/content; admin/layout.tsx; admin/mail; admin/messages/(index);
admin/messages/[id]; admin/people/(index); admin/people/[id]; admin/reports; admin/review;
admin/support; birds; catchups/(index); catchups/[catchupId]/(home); catchups/[catchupId]/answer;
catchups/edition/[editionId]; catchups/layout.tsx; catchups/new; catchups/round/[editionId]
(OLD NAME — still present); collection/(index); collection/[id]; dark-mode; directory; error.tsx;
feed; forbidden.tsx; guide/[area]; guide; layout.tsx; letters/(index); letters/[id]/(read);
letters/[id]/edit; letters/new; messages/(index); messages/[id]; pick-bird; profile/[id]; support;
welcome. (policies): guidelines, layout.tsx, privacy, terms. api: account/export;
auth/[...nextauth]; catchups/tick; demo/reset; dev-login; photo/download; places/search; presence;
razorpay/webhook; resend/webhook; retention/sweep; upload/audio/finalize; upload/audio; upload/
finalize; upload/presign; upload; users-by-batch; users/search. Top-level: catchups/join/[token],
catchups/join, error.tsx, hoopoe, layout.tsx, not-found.tsx, page.tsx, manifest.ts, robots.ts,
sitemap.ts. Each (main) page has a loading.tsx beside it except: about, birds, guide, guide/[area],
catchups/[catchupId]/answer, catchups/round/[editionId], profile? (check), feed (has), etc. — L2
verifies the list.
