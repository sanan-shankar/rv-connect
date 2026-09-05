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

### The demo database is missing four of production's eleven hand-written indexes
Found while doing refactor audit 2's C10 (the schema/database reconciliation), counted from
`pg_indexes` on both on 2026-09-05. Production has eleven expression, trigram and partial indexes
that `schema.prisma` cannot express; the demo has seven. Missing there: `Place_asciiName_idx`,
`Place_name_idx`, `UserPlace_city_idx` and `User_lastSeenAt_idx`. The migrations that created them
(`2026-07-18-round6.sql`, `2026-08-19-analytics.sql`) predate the demo project, which was created
on 2026-08-21 — the same class of drift that `run-sql.mjs --env` was built to end, arriving from
before the flag existed.

Nothing is broken at demo data size, which is why this is a note and not a fix: the searches these
serve are sequential scans over a few hundred rows there. It matters the day somebody reads
production's plan and assumes the demo's matches. All four migration files are idempotent
(`CREATE INDEX IF NOT EXISTS`), so the repair is to replay them with
`node scripts/dev/run-sql.mjs --env .env.demo <file>`; the owner's call, since it is a live
schema change on a second database. The census query is in `docs/TRAPS.md`.

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

### 17. The hoopoe misbehaves at browser zoom — ROOT CAUSE FOUND: it is Safari

**2026-08-11, solved by the owner's screenshots.** The variable every probe missed was the
BROWSER: all three investigations ran Chrome (headless, DevTools MCP), where the geometry is
provably zoom-invariant, and the owner zooms in SAFARI (visible in the screenshots' menu bar; the
owner then confirmed Chrome and Brave do NOT break). The rig's pivots were written in px
(`transform-origin: 42px 85px` with `transform-box: view-box`): Chrome resolves those in SVG user
units, zoom-independent, but WebKit multiplies px lengths by the page-zoom factor, so at Cmd+ every
pivot slides down-right and at Cmd- up-left. At ~1.4x the wing pivot lands at the bird's bottom
centre, which is why cover-eyes swung the wings off BESIDE the body ("the eyes don't close
anymore"); zoomed out it lands up by the head, the owner's wing-over-the-crest screenshot; the
detached feet are the 138° flight tuck about the same wrong point.

**Fix shipped**: RIG_CSS origins converted to view-box percentages, which carry no unit for zoom to
scale. One compat trap found on the way, measured and documented in hoopoe.tsx: Chrome anchors
percentage origins at 0, NOT at the viewBox's y=-10 origin the spec describes (the spec-faithful
mapping landed every y-pivot exactly 10 units low), so the mapping is y% = y/152, per measurement.

**Measured in real Safari (26.5.2, via safaridriver after the owner enabled "Allow remote
automation", 2026-08-12):**
- The percentage origins resolve EXACTLY right in WebKit: computed `transform-origin` reads
  "42px 85.000069px" and the empirically measured wing pivot is (42.0, 85.0) user units. So the
  percentage-anchor question is answered: WebKit anchors at 0, same as Chrome, NOT at the viewBox's
  -10 the spec describes. The shipped y% = y/152 mapping is correct in both engines.
- CSS `zoom` does NOT reproduce the Cmd+ breakage in Safari: px origins ALSO held under CSS zoom
  1.5. So the failure is specific to real page zoom, which nothing on this machine can drive
  (WebDriver has no zoom API; synthetic Cmd+ keystrokes need an Accessibility grant the terminal
  does not have). Honest status therefore: the fix is PROVEN not-worse in every measurable
  configuration of both engines, and believed correct for Cmd+ because a percentage carries no px
  length for page zoom to scale — but the only direct test of Cmd+ itself is the owner's eyes.
- Probe gotcha for whoever measures next: Safari does not reflect a just-written SVG child
  `style.transform` in getBoundingClientRect synchronously. Read in the same tick and you get a
  stale rect and garbage pivots (a first run of this measurement reported every part uniformly
  ~100u off for exactly this reason). Wait a frame (~40ms) between the write and the read.

The original investigation record follows, kept because its two disproofs (the pivots, the mobile
fly-in path) and its probe-methodology notes are still what stops this bug from being re-theorised.
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

**3. Not the geometry, measured properly (2026-08-11).** The owner re-reported this, so it was
re-investigated with the two flaws in the probe above corrected, and it still does not reproduce:

- The committed probe fakes zoom with CSS `zoom`, which is not what Cmd+ does. Cmd+ shrinks the
  LAYOUT VIEWPORT in CSS px and raises `devicePixelRatio`. Reproduced faithfully as
  `setViewport({ width: 1440/z, height: 900/z, deviceScaleFactor: z })`.
- The committed probe READS the computed `transform-box`/`transform-origin`, which only says what
  the CSS declares, not where the element actually turns. Measured EMPIRICALLY instead: rotate a
  part 180 degrees and take the midpoint of its bounding box before and after, which for a pure
  rotation is exactly the centre of rotation.

At z = 1, 1.1, 1.25, 1.5 and 2 every pivot came back on its RIG_CSS value to within 0.5 user units
(leftWing 42,85 / rightWing 78,85 / crest 60,37 / head 60,80 / eyeBlinkL 51,61), and the same held
when the viewport was resized LIVE on an already-loaded page, which is how the owner actually hits
it. So the rig's geometry is zoom-invariant and the pivots are not what is wrong.

That is now three disproofs of the transform-origin theory. Do not spend a fourth session on it.
What has NOT been done is the one thing bugs.md has asked for twice: someone looking at it on the
owner's own screen and saying concretely what looks wrong, since "body parts are weird" may well be
describing clipping, rasterisation or the flight pose rather than pivots. Get a screenshot from the
owner at zoom before writing any more code.

### 20. The /login password peek-a-boo never covers the bird's eyes
`login-client.tsx` is written around it — "the hoopoe covers its eyes (wings up) while the password
is hidden, and peeks when you reveal it" — and the wings do not move. Not at the end of the intro
(`runIntro` calls `coverEyes()` after its 1700ms settle), and not on the reveal toggle
(`useEffect` on `showPw` calls `peek()` / `coverEyes()`). The bird sits wings-down, eyes open,
whatever the field is doing. It is not the mascot: /signup's register step tucks the wings over the
eyes correctly with the same two verbs, so `coverEyes()` works and something on /login is either
not calling it or being overwritten after it.

Found on 2026-08-26 while extracting the shared flight hook (phase 4 of the refactor-audit
campaign). **It is not a regression from that work**: the same probe against `e7efc97`, the commit
before the campaign touched these files, shows the identical wings-down bird at rest, and
`[data-part=leftWing]` carries no style in either. Filed rather than fixed because it is a bug, not
a simplification.
- Size: small, once the cause is known. Suspect the ambient idle loop or the damper re-posing the
  wings after an unqueued verb — `coverEyes`/`peek` are deliberately not queued.
- Watch out: the visual suite cannot see this. `/login`'s hoopoe is inside a masked volatile region
  in `e2e/visual.spec.ts`, which is why a pixel-perfect green run says nothing about it.
- Where: `src/app/(auth)/login/login-client.tsx` (runIntro + the showPw effect),
  `src/components/mascot/hoopoe.tsx:994-1001`.

---

## Owner decisions carried from the second bug audit's fix ledger (closed 2026-08-25)

The audit itself is archived at `docs/audit-fix/2026-08-22-bug-audit-2/`. Nothing below
blocks anything; each is a choice the code cannot make for itself.

- **C-032** — the session is an ABSOLUTE 30 days, not rolling: every member is signed out
  30 days after signing in however often they visit, and a launch cohort hits it together.
  Documented at the config in `src/lib/auth.ts`. Rolling refresh is a product call.
- **C-012** — admins can read unpublished letter drafts, and a test pins it. One line in
  `decidePostVisibility` and one test to change if drafts should be private from admins.
- **C-138** — the theme is per DEVICE: a new device starts light and walks the dark
  gauntlet again. Deliberate as it stands; one line at sign-in if it should follow a member.
- **C-135** (Google Pay/UPI test payment), **C-165/C-166** (PostHog/Sentry free-tier
  ceilings; levers named in `docs/OPERATIONS.md`), **C-186** (the demo project's cron env),
  **C-112/C-167** (plan-ceiling questions: demo's anonymous writes vs its nightly reset;
  type-ahead search vs the Upstash free command quota at 2,000 members).
- Still owed: **CRON_SECRET**, and a decision on the visual suite's live-data drift
  (8 of 23 shots red on data, not code, since before that audit ran).

## Settled, do not re-open

Earlier feedback that was addressed, and in a few cases changed again by a later owner decision. Listed
so a future session does not "fix" one of these back to a state the owner deliberately moved away from.

### Closed by the Collection rework, 2026-08-28

- **#18. Feed photos had no reserved space, so the page jumped as each one loaded.** The entry
  said "the owner is reworking how photos crop and size and will fold this in", and that is what
  happened: `docs/planning/collection-rework/` is the campaign, and its phase 1 added the `Image`
  table so every uploaded photograph's real width and height are stored, phase 2 put `<PhotoFrame>`
  and `src/lib/photo-layout.ts` in front of every single-photograph surface, and phase 3 did the
  same for several at once with justified rows. The box is reserved from the stored dimensions
  before a byte arrives; measured CLS on the feed is 0.0000. **Neither of the two options this
  entry offered was taken** — nothing is cropped to a fixed ratio and nothing goes through
  `next/image`, so the metered optimiser and its bill are still avoided (campaign finding F1).
  The two things it said would ride along: photographs are now served at the size they render,
  and the viewer's Download button was fixed by the custom image domain, as this entry predicted.

- **#19. A Catch-up photo caption showed its formatting markers on the photo wall.** The wall
  printed `entry.body` raw beside an answer card that ran the identical field through
  `renderRichText`. Fixed on the wall, in `src/components/catchups/round/photo-wall.tsx`.

### Owner-reported, 2026-08-27

- **A letter draft's blank lines doubled between sessions.** "The paragraphs which I spaced with one
  empty line for spacing now have two empty lines between each." The composer's DOM-to-markdown walk
  counted a block AND the filler `<br>` the browser puts inside an empty one, so a blank line was
  stored as `\n\n\n`. Nothing was wrong on screen while writing; the extra line was written to the
  row and only appeared on reopening. Fixed in `src/lib/rich-text-editing.ts` (a trailing `<br>` in a
  block is the browser's, not the writer's) and pinned in `rich-text-editing.test.mjs`. Drafts saved
  before the fix keep the extra line — no migration can tell an accidental blank line from a wanted
  one, so those are edited by hand.

- **A stray up/down stepper beside member names, on Android.** Reported as "two of the toggle
  things ... it doesn't have any function", on the sidebar profile pill and the feed rail's "New in
  the directory" card; tapping it shifted the text a pixel. It was a real scrollbar on a real
  overflow: `IdentityRow` paired `overflow-y-visible` (for the descenders `leading-none` pushes below
  the line box) with the `overflow: hidden` that a caller's `truncate` brings, and CSS computes the
  visible axis to `auto` in that pairing. Fixed with `overflow-x-clip`, which is exempt from that
  rule and still fires `text-overflow`, and pinned repo-wide in `identity-row-overflow-rule.test.mjs`.
  Not reproducible on macOS, which draws overlay scrollbars rather than stepper ones.

### From the pre-release hardening, 2026-08-21

A formal bug and stability review ran over four sessions and every one of its findings is closed.
The fixes themselves live in the code, each with the reasoning in a comment beside it, and in the
git history. What is kept here is only the part the code cannot say: the places where the answer was
**no**, or **not yet**, and why. Do not re-open these without a reason that is new.

**Deliberately NOT a bug:**

- **`statement_timeout` is absent from the pool config on purpose.** Supavisor drops it. See
  `docs/TRAPS.md`.
- **The post visibility rule's author exemption sits ABOVE the hidden check**, so an author can
  still reach a post a moderator has hidden — which is the only way they can respond to the
  moderation. It reads like an oversight and is not; a test pins it.
- **The nightly GitHub Actions workflows do not need a keep-alive.** GitHub's 60-day auto-disable of
  scheduled workflows applies to PUBLIC repositories. This one is private.
- **`setTheme` writing a cookie does re-render the page** (that part of the report was right), but
  the only two callers are dedicated pages that navigate immediately, so nothing is paid for it. The
  code comment claiming otherwise was the actual defect and is corrected.
- **The directory's city filter aliasing Delhi to New Delhi is deliberate**, from `city-coords.ts`,
  the same way it aliases Chennai/Madras and Mumbai/Bombay. The filter is an exact match over that
  alias list, not a substring.

**Deferred, with the reason:**

- **The root layout reads the theme cookie, so every route renders dynamically**, including the six
  public pages that could be static. Every fix trades that for a flash of the wrong theme on a first
  visit, which is the exact thing the cookie read prevents. A latency optimisation on six pages, not
  a correctness bug.
- **`touchLastSeen` fires only on layout render, so soft navigations go uncounted.** The fix is a
  client-side route-change reporter — a new surface, not a correction.
- **Two simultaneous forgot-password requests can mint two reset rows.** The correct instrument is a
  partial unique index Prisma cannot express, and the expressible alternative fails worse (see
  `docs/TRAPS.md`). The existing fold catches every non-simultaneous case and the enqueue rate limit
  caps the blast radius.

**Owner decisions taken during it, which are now how the product works:**

- **Deleting a Catch-up is PERSONAL** — it removes only your own copy, and nobody else's view
  changes. The Keeper-only variant that soft-deletes it for everyone was offered and declined.
- **A leaver's published Catch-up answers STAY** in the Rounds they were published in.
- **"Start one" on a group card was removed** rather than made to attach, because attaching would
  mean one member's private naming choice renaming a shared batch group.
- **Blocking someone hides everything they have written** — posts, letters and comments leave the
  feed, the index and Saved, and the direct link agrees. Nothing is deleted; unblocking restores it.
  Collection photographs are deliberately exempt: one of those was approved by an admin into a
  shared archive of the school's history. The reasoning is at `User.isBlocked` in the schema.

**Still open elsewhere:** the feed photo reflow is item 18 above, waiting on the photo rework.

### The image domain, done 2026-08-21

Photographs are served from `images.rishivalley.space` instead of Cloudflare's throttled free
`pub-*.r2.dev` address. The owner moved the domain's DNS to Cloudflare, attached the custom domain
to the bucket and set the CORS policy; the code side was the CSP (`img-src` AND `connect-src`),
`remotePatterns`, a rewrite of the 41 stored addresses, and teaching `publicBaseFor` both hosts.
`docs/TRAPS.md` has the five-part checklist for the next time a host moves.

That work also fixed two things nobody had filed. **The Download button in the photo viewer** could
not have worked before: a bucket CORS policy does not apply to the `r2.dev` address at all, and the
fetch was CSP-blocked as well. And **direct uploads had never actually worked in production** --
`connect-src` did not list the bucket's S3 endpoint, so the browser refused the PUT and every upload
fell back through the server and its ~4.5MB cap, which is the single thing presigned upload exists
to avoid. Both are listed in the policy now.

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

## Dated cleanups

Work that is correct to do only after a date, because doing it early breaks something real.
Each entry says what to delete, when, and why that date.

- ~~**After 2027-08-01: delete `/notice/[id]`.**~~ **Done 2026-09-05**, eleven months early,
  because the date was arithmetic off a number that changed. It was 2026-07-24 plus a 365-day
  notification retention; the owner settled retention at **30 days** on 2026-09-04 (`74cc61a`),
  which moves the answer to 2026-08-23. Checked live before deleting rather than trusting the
  arithmetic: **0 notifications predate 2026-07-24 and 0 carry a `/notice/%` link, on production
  and on demo.** The route, its `loading.tsx`, `openAdminNoticeThread`'s `createdAt` and `db`
  overrides, the C-115 pin that read the page, and the four comments citing it all went together.
  (Refactor audit member-surfaces-05, re-dated by docs-12.)

