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

All three items from the 2026-07-02 consolidation were closed in the 2026-07-03/04 bug blitz: the
letter-card title fallback shipped (shared `letterTitle()` in `src/lib/utils.ts`), saved posts live
as an owner-only tab on your own profile (`src/components/profile/saved-posts-feed.tsx`; a
standalone `/saved` route was deliberately not built), and the support page now describes
Vercel/Supabase/R2. Item 1 and item 8 from the 2026-07-03/04 batch closed overnight on 2026-07-05/06
(see Settled). What remains below is current.

### 2. Collection landing screenshot is stale
`public/images/landing/collection.webp` still shows the pre-redesign UI because the Photo table has
zero rows (an empty-state capture would undersell the feature). Recapture once real photos exist;
use a new `-v3` filename (the dev `/_next/image` cache serves stale bytes when a file is
overwritten in place; see the `shots.ts` header comment).
- Size: small.

### 3. Cosmetic pill trims that dodged the sweep
`profile/[id]/page.tsx` Pencil icon still carries `mr-1.5`; `post-card.tsx`'s comment-count pill
still lacks the 4px optical trim; `alumni-map.tsx` (2 pills, full-screen and "not yet on the map")
and `flag-person-dialog.tsx` still trim 2px where the Button convention is 4px. Checked against the
2026-07-05/06 session: `profile/[id]/page.tsx` and `alumni-map.tsx` were both touched overnight for
unrelated features (secondary city, delete-user, map zoom) and the trims were not fixed in passing.
The `create-post-form.tsx` More-options item is moot: that composer was rebuilt overnight
(staged-reveal, `96f7ae3`) and More is now a plain unboxed plus, not a pill.
- Size: tiny.

### 4. Support page email line + UPI handle
The "Email" cost row still says "Sign-in links and invites" though magic links were removed
(credentials-only auth now). And `UPI_ID = "rvalumni@upi"` in `support-contribute.tsx` looks like
placeholder data; the owner must confirm the real handle before launch (`PAYEE_NAME` "RV Alumni" is
the payment-facing account name and stays as data).
- Size: tiny, plus owner confirmation.

### 5. No desktop notifications affordance outside the feed
Pre-existing: Directory/Groups/Letters/Collection/Catch-ups never pass `unreadCount` to their
PageHeader, so desktop (>=768px) has no bell there (mobile keeps the sidebar-bar bell). Needs a
product decision on a global pattern.
- Size: medium (decision first).

### 5b. Signed-out visitors never see the custom 404
`src/proxy.ts` redirects any route outside the public allowlist to `/login` (307) before Next can
resolve `not-found.tsx`, so a logged-out person following a dead or mistyped link lands on the
login page, not the hoopoe 404 (signed-in users see it fine). Found in the 2026-07-06 integrated
smoke pass; pre-existing routing behavior, needs a product decision (allowlist unknown paths to
404 publicly, or keep the login bounce).
- Size: small (decision first).

### 6. Raw-SQL timestamp trap (latent)
`Post.createdAt` etc. are `timestamp without time zone`; rows written via raw `pg` read back 5h30m
(IST) ahead through Prisma. The app's own Prisma write+read path is self-consistent, but any future
import script, migration, or admin tool writing timestamps outside Prisma will hit it. Related:
server-side `toLocaleDateString` without an explicit timeZone can show a date one day off near the
UTC/IST midnight boundary (e.g. the letters index).
- Size: investigation.

### 7. Demo data in the shared DB (owner decision)
5 seed users (`*@demo.valley.test`) and the `[Demo]` groups (one literally named "[Demo] Roundup",
a rejected term) still live in the production database. Purge or keep before launch; the
map/directory demos currently lean on them. The Catch-ups build added a second, separate demo seed
(`scripts/dev/seed-catchup.mjs`, more `*@demo.valley.test` users plus `[Demo] Collecting` / `[Demo]
Answering` / `[Demo] Roundup` groups) and a smoke-test script (`scripts/qa/catchups-smoke.mjs`) that
ran repeatedly overnight on 2026-07-05/06; both clean up after themselves and the smoke test does
before/after row-count verification on every table it touches, so no leftover QA rows were left in
the DB from tonight's session. The original 5 demo users (and whichever `[Demo]` groups the owner
wants kept for the map/directory demo) are the only demo data still there by design.
- Size: owner decision, then small cleanup.

### 9. Hoopoe flight is hero-only on the landing page (deliberate scope)
Only the hero "Sign in" / "Join the community" buttons launch the fly-and-perch (the photo-slide
transition only exists from the hero); the sticky nav and closing-band CTAs still navigate plainly.
This is narrower than it sounds: the mascot now flies in several other places shipped overnight on
2026-07-05/06 (rare bell letter delivery gating the notification panel, the mobile auth pages'
fly-in-and-perch, the sidebar eyes-closed sleep-on-idle, assorted empty-state and celebration
moments across the app). The landing page itself, though, still only flies from the hero CTAs. The
mascot flight layer (`src/components/mascot/mascot-flight.ts`) is reusable from anywhere via
launchFlight/reportPerch if the owner wants more landing-page flights.
- Size: small.

### 10. Houses step still falls back to localStorage
The `houses` column migrated live 2026-07-18 (`prisma/migrations-manual/2026-07-18-round6.sql`,
now mirrored in `prisma/schema.prisma`'s `User.houses`) and `src/lib/houses.ts` carries the
owner-confirmed canonical 22-house list. What is left: the `/welcome` onboarding flow's Houses step
(`src/components/onboarding/steps/houses-step.tsx`) still has its old column-probe/localStorage
fallback path from before the migration landed; it should be simplified to write straight to
`User.houses` (JSON string of `[{year, house}]`) now that the column is guaranteed to exist.
- Size: small, wave-2 onboarding task.

### 11. Legacy Catch-ups tables still live; `prisma db push` still unusable
The old, reverted Catch-ups build left six physical tables behind with columns that don't match the
current schema: `Catchup`, `CatchupPref`, `CatchupAnswer`, `CatchupAnswerLove`, `CatchupIssue`,
`CatchupQuestion`. The new Catch-ups feature deliberately used different table names
(`CatchupSeries`, `CatchupReminderPref`, etc., mapped via `@@map` in `schema.prisma`) specifically to
avoid colliding with these. Section 3 of `prisma/pending-migration.sql` has the `DROP TABLE`
statements for all six, commented out and optional. Until the owner runs it, `prisma db push`
remains unusable on this database; schema changes keep going through raw additive SQL.
- Size: owner decision, then small cleanup (unblocks `prisma db push` for good).

### 12. Owner decisions pending on two preview-only redesigns
Both shipping-blocker areas got full concept spreads on preview pages, judged by a purpose-fit
review, but neither pick is final until the owner confirms it and it gets built for real (moved out
of `/preview`):
- Profiles: `/preview/delight/profiles` (five concepts: letterhead, field guide, editorial, valley
  terrain, dossier). The purpose-fit judge favored "Field guide."
- Landing: `/preview/delight/landings` (five concepts: postcard, notice board, prospectus, living
  valley, clarity). The judge favored "Postcard."
- Size: owner decision, then a build phase per pick.

### 13. Copy rewrite pass not started (inventory is current)
`docs/content/COPY-INVENTORY.md` and `.copy-review/inventory.json` now hold 1308 strings: the
original 831 plus a 477-entry delta sweep (end of the 2026-07-05/06 session) covering everything
that session built (Catch-ups incl. the 30-question library and notification templates, the feed
rail and greeting strip, the guided welcome flow, the rebuilt composer, the mascot moment strings).
The owner works through the dev-only `/copy-editor` UI (`src/app/copy-editor/`, reads and writes
`.copy-review/inventory.json`; leaving a box empty keeps the current text), after which the
replacements get applied codebase-wide and the tool plus `.copy-review/` get deleted.
- Size: owner's pass, then a codebase-wide apply.

### 14. Vercel environment variable duplicates (owner will handle)
Duplicate-named env vars in the Vercel dashboard; the owner said he will clean these up himself.
Left here only so it isn't forgotten before launch.
- Size: owner action, five minutes.

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
- Secondary city shipped overnight on 2026-07-05/06 (`ab90b19`): `currentCity` stays primary, the
  new `secondaryCity` column is live and wired through settings, the profile "also in ..." line,
  and directory search.
- Mobile scroll-hoopoe is moot: the landing scroll companion was removed entirely by owner decision
  (`0cface8`), desktop and mobile both. The one remaining landing hoopoe flutters near the footer.
