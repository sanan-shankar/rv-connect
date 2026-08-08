# RV Connect bugs and fixes

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
(see Settled). Round 6 (2026-07-18) closed item 10 (houses localStorage fallback) outright and
narrowed item 4 down to just the outstanding UPI handle confirmation (see Settled for both). Item 4
then closed on 2026-07-24 when the real handle and real scannable QR codes shipped (see Settled).
What remains below is current.

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


### 12. Owner decision pending on the landing preview-only redesign
Landing is still preview-only, judged by a purpose-fit review, but the pick isn't final until the
owner confirms it and it gets built for real (moved out of `/preview`): `/preview/delight/landings`
(five concepts: postcard, notice board, prospectus, living valley, clarity). The judge favored
"Postcard."

The equivalent profile decision is moot: the round-6 profile rebuild (`ed5f9b2`, see Settled) shipped
directly into the main app, not through a pick of one of the five `/preview/delight/profiles`
concepts, so that preview page is now historical only.
- Size: owner decision, then a build phase.

### 12b. Owner decision pending on the groups rethink (round 6)
The owner has been unsure of groups' purpose since before round 6 (batch WhatsApp groups already
cover most of the need; groups also must not be a top-3 nav category). Round 6 delivered four
concept previews at `/preview/groups-rethink` — Batches + interest, Circles, Dissolve, Gatherings —
plus a written spec. The build recommendation is "Gatherings," but nothing is built for real until
the owner picks.
- Size: owner decision, then a build phase.

### 13. Copy rewrite pass not started
Nobody has read the site's user-facing text end to end and rewritten it in one voice.

An inventory of 1308 strings and a dev-only `/copy-editor` workbench were built for this in July.
Both were deleted (the tool on 2026-08-07, the inventory on 2026-08-08): the tool recorded zero
edits in a month, and the inventory had drifted badly enough to be misleading, still listing
`/groups` and `/settings` long after both were removed.

If this pass happens, regenerate the string list against the live codebase first. Do not restore
the old snapshot from git; it describes a version of the site that no longer exists.
- Size: owner's pass, then a codebase-wide apply.

### 14. Vercel environment variable duplicates (owner will handle)
Duplicate-named env vars in the Vercel dashboard; the owner said he will clean these up himself.
Left here only so it isn't forgotten before launch.
- Size: owner action, five minutes.

### 15. NEXTAUTH_URL/AUTH_URL on Vercel likely still points at the vercel.app host (owner action)
Found during round 6 while wiring the `LEGACY_HOST` redirect in `src/proxy.ts` (H20): the stray
`rv-alumni.vercel.app` landings the owner has seen are consistent with the Vercel dashboard's
`NEXTAUTH_URL`/`AUTH_URL` env var still pointing at the `.vercel.app` deployment URL rather than
`rishivalley.space`, which would make NextAuth's own redirects (post-login, callback URLs) bounce
back to the legacy host even with the proxy-level redirect in place. `proxy.ts` now 307s
`rv-alumni.vercel.app` requests to the custom domain as a client-side mitigation, but the root cause
is a dashboard env var only the owner can check/update.
- Size: owner action, check the Vercel project settings.

### 16. Vercel Analytics needs a production deploy to start collecting
`@vercel/analytics/next` is installed and wired into `src/app/layout.tsx` (round 6, `7d3a9ab`), but
the `<Analytics />` component only reports in a deployed Vercel environment; nothing will show in the
Vercel dashboard until the round-6 branch is deployed to production.
- Size: none, informational (owner deploys).

### 17. The hoopoe misbehaves at browser zoom (reproduced only by the owner)
Owner, 2026-08-04, on Cmd+ page zoom: "the eyes don't close anymore and the wings pivot about a
weird point." Real report, cause not yet found. Two obvious explanations were tested and BOTH are
wrong, so do not spend the time again:

1. **Not the pivots.** `scripts/qa/hoopoe-zoom-probe.mjs` measures the computed `transform-box` and
   `transform-origin` of the wings, eyes, crest and head at zoom 1 / 1.25 / 1.5 / 2. `transform-box`
   stays `view-box` and every origin stays put at its user-unit value at all four. That is the
   correct behaviour, and it is what would break if `RIG_CSS` ever stopped applying and motion's
   `fill-box` default won. The probe is committed as a regression guard for that.
   (Note for whoever reads its history: the probe's FIRST draft asserted the origins should SCALE
   with the rendered SVG and duly reported 15 confident failures against a correct rig. `view-box`
   origins are user units and must not scale.)
2. **Not the mobile fly-in path wedging.** Zoom does shrink the CSS viewport past the auth pages'
   `lg` (1024px) gate at about 1.4x, so a zoomed 1440 window genuinely renders the MOBILE
   arrangement, where the bird arrives by `flyIn("sky")` rather than the cross-page flight. That
   looked like the answer, since a wedged `flyIn` would never resolve and `runIntro` (which is what
   calls `coverEyes`) would never run. Measured at 390x844 against 1440x900: both end with the wings
   at the same ±163°, i.e. eyes covered. The mobile path completes.

So the remaining suspects are things headless Chrome at a fixed `deviceScaleFactor` does not
reproduce: real page-zoom rasterisation, a fractional device pixel ratio, or something specific to
the owner's display. Next step is to look at it in a real zoomed browser rather than to theorise
again. Low priority, owner: "if that's tough to fix never mind, we can push it down the road."
- Size: investigation.

---

## Settled, do not re-open

Earlier feedback that was addressed, and in a few cases changed again by a later owner decision. Listed
so a future session does not "fix" one of these back to a state the owner deliberately moved away from.

- Background warmth was `#E7E1D3` by owner choice, and that held until 2026-07-30. **The shipped
  value is now `#E4E1D5`** (`--background` in `globals.css`, changed in `c286b67` with the colour
  protocol): the owner cooled all four neutrals by 20-25% after finding iPhone True Tone had been
  exaggerating the yellow. What still stands from the original note is the floor - do not lower the
  warmth to `#E9E6DD` or `#EBE6D7`, which were earlier steps the owner moved past - plus a newer
  guard: do not cool it again without an owner ask, and check any future "too warm" report on a
  reference display (True Tone and Night Shift off) before acting on it.
- The valley tree overlay was `opacity-[0.11]` by owner choice. **The shipped value is now
  `opacity-[0.09]`** (`app-shell.tsx:40`, plus `dark:opacity-[0.04]`), lowered in the same 2026-07-30
  commit `c286b67` alongside the cooler neutrals. The surviving instruction is that the owner picked
  the fuller tree over the faint one, so `0.09` is now the floor: do not drop it to `0.08` or below.
- The feed ships as separate tinted tiles (PostCard `variant="card"`), a later switch away from the
  ruled sheet. (CLAUDE.md still calls it a "ruled-sheet feed"; the shipped code is tiles.)
- Theme transition speed was moot while the app was light only, but that ended on 2026-08-02:
  **dark mode shipped**, `forcedTheme="light"` is gone, `.dark` is a real block in `globals.css`, and
  the theme is read per request from the `rv-theme` cookie. The toggle did not come back as a toggle;
  dark is entered through the multi-step settings gauntlet. See `docs/spec/DESIGN-SYSTEM.md` section
  2 for the shipped palette and the sidebar reversal.
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
- Houses step no longer falls back to localStorage: the `houses` column migrated live 2026-07-18
  (round 6) and `/welcome`'s Houses step (`src/components/onboarding/steps/houses-step.tsx`) writes
  straight to `User.houses`; the old column-probe/localStorage path is gone. `src/lib/houses.ts`
  carries the owner-confirmed canonical 22-house list. Settings' batch field also dropped the retired
  grade-joined path in the same round (`6576aaf`).
- Support page rewritten in rupees, round 6 (`42614eb`): the stale "Sign-in links and invites" Email
  cost row is gone (no real email-sending infra to attach a cost to), and the cost bar uses the brand
  palette. Contribution is one-time-only presets, no monthly ₹20. Do not reintroduce a monthly UPI
  amount or the old Render-era cost line.
- UPI handle confirmed and wired, 2026-07-24 (`1f549b3`, closes the old Open #4): `UPI_ID` is the
  owner's real handle and the placeholder `rvalumni@upi` is gone. The QR codes are now real and
  scannable, generated and decode-verified by `scripts/gen-support-qr.mjs` (one SVG per amount, so
  scanning prefills that amount); the old hand-drawn `support-qr-placeholder.svg` encoded nothing and
  was deleted. `PAYEE_NAME` stays "Rishi Valley", which is also what a payer sees when they scan, so
  the owner's personal name appears nowhere. The copyable UPI-ID text was deliberately removed from
  the page for the same reason (the real handle contains the owner's name): people scan the QR or tap
  the deep-link button. Do not print the UPI ID back onto the page.
- Support amounts are ₹500/₹1,000/₹2,000/₹5,000 plus "Other", defaulting to ₹1,000 (2026-07-24, owner
  decision). ₹200 was deliberately dropped; do not reintroduce it.
- The one-time build cost is published as a fundraiser bar (2026-07-24, owner decision): ₹4,00,000
  goal, in `BuildFundBar` (`cost-bar.tsx`). The amount recovered is a hand-maintained constant
  (`BUILD_RECOVERED`) because nothing tracks UPI contributions automatically. The page no longer says
  the build cost is withheld. Monthly costs are hosting ₹1,950, photos under ₹100, and domain ₹250 a
  month; the domain is billed monthly now and sits inside the bar, not as a separate yearly pill.
- Filters rework shipped for Directory and Collection, round 6 (`180968d` + follow-ups): the old
  all/all/all unlabeled-select bars are gone, replaced by a shared facet-filter pill system
  (`src/lib/directory-facets.ts`, `src/lib/collection-facets.ts`,
  `src/components/common/filters/*`) with labeled selects, real sort names (newest is no longer
  mislabeled "relevance"), and profession as a first-class filter separate from organization. Do not
  revert to the old unlabeled bars.
- Feed search now actually searches the feed (`c710782`): the sidebar search box used to silently
  jump to directory people-search from every surface; it is now scoped to the surface you're
  searching from.
- The six legacy Catch-ups tables are gone (closed the old Open #11, 2026-08-03). A check against
  `information_schema` found `Catchup`, `CatchupPref`, `CatchupAnswer`, `CatchupAnswerLove`,
  `CatchupIssue` and `CatchupQuestion` already dropped; only the six live tables remain
  (`CatchupSeries`, `CatchupEdition`, `CatchupPrompt`, `CatchupEntry`, `CatchupEntryLove`,
  `CatchupReminderPref`). `prisma/migrations-manual/2026-08-03-demo-purge-and-drift.sql` then
  settled the one real remaining drift (`LabRoomState.updatedAt` was `timestamptz(6)`, now
  `timestamp(3)`). `migrate diff` is now down to the three `lower()` expression indexes on
  `Place`/`UserPlace` and nothing else. That last one is the PERMANENT false positive: `db push`
  would replace those with plain column indexes and silently slow directory search, so it still must
  never be run unattended. The `@@map` on Catchup/CatchupPref is now only load-bearing for the
  physical table names, not for collision avoidance.
- The `[Demo]` groups are deleted (closed the old Open #7, 2026-08-03, owner: "delete the demo
  groups"). Three rows went: `[Demo] Answering`, `[Demo] Catch-up`, `[Demo] Collecting`, cascading
  through 2 Catch-up series, 2 editions, 7 prompts, 4 entries and 3 memberships. No `[Demo] Roundup`
  survived to be deleted. The six real groups (`Batch of 1972/2020/2021/2023/2024`, `Testing
  Newsletter`) and all 15 posts / 21 users were verified untouched before and after. The 5
  `*@demo.valley.test` seed USERS were deliberately left in place: the owner asked for the groups
  only, and the map/directory demos still lean on those users.
- Dropdown/select popover alignment fixed at the shared primitive, round 6 (`ac4a90b`, `f5e65ca`):
  offset, width, corner radius, and the hover-highlight inset now match the trigger everywhere
  (report-post reason select, collection/directory facet selects), including when a popover opens
  upward. Fix future dropdown issues at the shared primitive, not per-instance.
