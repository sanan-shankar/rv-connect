# RV Alumni bugs and fixes

The single tracker for outstanding bugs and small fixes.

Consolidated on 2026-07-02 from two now-deleted files: `FEEDBACK_CHECKLIST.md` (owner feedback
gathered across many sessions) and `PUNCHLIST.md` (the 2026-06-27 verified backlog). Every item from
both was re-checked against the live code on 2026-07-02. Anything already done, or since superseded by
a later owner decision, was removed rather than carried forward, so nothing here tells you to redo work
that is finished.

This file is bugs and small fixes only. The rest lives where it belongs:
- Features and bigger builds (Catch-ups, Events, community vouching, invite enforcement,
  profile-completion depth, house-per-year, directory gazetteer, password reset, deploy) live in
  `docs/ROADMAP.md` (the phased plan) and `docs/planning/FEATURES.md` (the idea backlog).
- Delight and micro-interactions (avatar chirp, living loading scene, more moments) live in
  `docs/content/DELIGHT.md` (authoritative, with a verdict per item).
- Design and brand rules live in `docs/spec/DESIGN-SYSTEM.md`.

Why this list is short: the 2026-06-27 fix campaign (seven committed batches, B-FOUNDATION through
B-SETTINGS-PROFILE) closed every P0, P1, and P2 bug in the old punchlist. On 2026-07-02 the owner also
confirmed the three peaks logo, the password hoopoe, and the sign-in button are finished. What is left
is below.

Status: `[ ]` open · `[x]` done (kept briefly for the record, then removed).

---

## Open

### 1. Feed letter card shows "Untitled letter"
A titleless Letter still renders the literal "Untitled letter" in the compact feed card, even though
`/letters` and `/letters/[id]` already fall back to the first line (or "A letter"). Make the card use
the same fallback so the three surfaces agree.
- Where: `src/components/posts/post-card.tsx:206` (`{post.title || "Untitled letter"}`).
- Origin: PUNCHLIST P2 #27 (2026-06-27). It was fixed for the list and the reader, and missed on the card.
- Size: small.

### 2. No page to see saved posts
Bookmarking is fully wired: the model, the `toggleBookmark` action, and the cinnamon save-sweep pop on
the card all ship. But there is nowhere to view saved posts and no sidebar slot, so the bookmark button
is a dead end. Build a `/saved` route reusing the shared `<Feed>`, and decide where it sits in the nav.
- Where: no `src/app/(main)/saved/` route exists; the bookmark button is in `post-card.tsx`.
- Origin: FEEDBACK "Feed" ("Saved/bookmarked posts, with a cute colored bookmark animation"). The
  animation shipped; the page did not. Also noted as an idea in `FEATURES.md` section 3.
- Size: small.

### 3. Support page cost breakdown is stale (still says "Render")
The `/support` cost rows describe hosting as "Render, kept warm..." with Render-based rupee figures,
but the deploy moved to Vercel plus Turso (Supabase Postgres, Mumbai) and Cloudflare R2 for images.
The public support page is showing wrong information. Update the platform names and the amounts (owner
has the real figures).
- Where: `src/app/(main)/support/page.tsx:16` and the amounts around `:15-37` and `:101`.
- Origin: found on 2026-07-02 during this consolidation. It is not in either old file, because both
  predate the Vercel/Turso decision and still described Render.
- Size: small.

---

## Settled, do not re-open

Earlier feedback that was addressed, and in a few cases changed again by a later owner decision. Listed
so a future session does not "fix" one of these back to a state the owner deliberately moved away from.

- Background warmth is `#E7E1D3` (`globals.css:87`) by owner choice. Do not lower it to `#E9E6DD` or
  `#EBE6D7`; those were earlier steps the owner moved past.
- The valley tree overlay is `opacity-[0.11]` (`app-shell.tsx:31`) by owner choice. Do not drop it to
  `0.08` or `0.09`; the owner chose the fuller tree.
- The feed ships as separate tinted tiles (PostCard `variant="card"`), a later switch away from the
  ruled sheet. (CLAUDE.md still calls it a "ruled-sheet feed"; the shipped code is tiles.)
- Theme transition speed is moot: the app is light only (`forcedTheme="light"`) and the toggle is gone.
- The heart is always red `#E03A33` with `transition:none`. Never let its color transition again (that
  was the black-flash bug).
- Every 2026-06-27 punchlist P0, P1, and P2 bug is fixed: own-profile crash, feed and rail avatar
  overrides, About em dash, settings photo upload, server-side trivia gate, bell-shake on unread,
  directory filters/city-normalize/case-insensitive/pagination, group batch-add notification and browse
  empty state, collection seed variety, dead `landing-client.tsx` removed, stale Card primitive de-glassed.
- Logo, password hoopoe, and sign-in button: owner-confirmed finished on 2026-07-02.
