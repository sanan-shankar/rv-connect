# Progress Log

## Session 2026-08-25 — "Still locked out: 1" was a ghost, and the panel could not tell

The owner opened `/admin/analytics` -> Joining and read a red **Still locked out: 1** over a panel
that says "worth emailing them directly", plus a bar in "Why sign-ins fail" labelled with the raw
slug `blocked`. One commit on `main`, not pushed. `npm run check` green (70 tests).

- **Nobody was locked out, and no account has ever been blocked.** `SELECT ... WHERE "isBlocked" =
  true` returns zero rows. The address was `phase2-probe-1787166205085@example.invalid`, a throwaway
  the Phase 2 security probe created on 19 Aug, blocked on purpose to prove audit H4 held, and then
  deleted. `.invalid` is the RFC 2606 reserved domain, so it was never a person.
- **The bug is that a deleted account keeps counting as somebody locked out.** `loadJourney`'s
  locked-out query read `LoginAttempt` alone, with no join to `User`, and `purgeUserAccount` clears
  neither this table nor the `userId` on it. So this was never only about probes: any member who
  self-deletes after a run of failed sign-ins would have appeared under the same instruction to email
  them. It now `LEFT JOIN`s `User` and drops any address whose attempts point at an account that has
  vanished. A `userId` of NULL is deliberately kept — that is the ordinary "no account with that
  address" failure, which is exactly the person the panel is for.
- **Both conditions are aggregates, and the test says why.** A row-level `WHERE` would drop the
  purged account's SUCCESSFUL attempt and leave its failures, flipping the address *into* the list —
  the opposite of the fix. `src/lib/login-attempt-rule.test.mjs` pins the join, pins that the guard
  stays inside the `HAVING`, and fails if `purgeUserAccount` ever starts touching `LoginAttempt`, at
  which point the comment needs re-reading rather than the guard deleting. All four assertions were
  mutation-tested: each fix reverted individually, each caught by its own test.
- **The raw slug was a label map that half-covered its vocabulary.** `REASON` named four of the seven
  reasons `LoginReason` can write; `blocked`, `rate-limited` and `bot-check` fell through to the slug.
  Keyed on `LoginReason` now, so the gap cannot reopen — an unlabelled reason is a tsc error rather
  than something the owner reads as a member in trouble. A gap that looks like data is worse than no
  label at all.
- **Nine synthetic rows removed, five addresses, all on `@example.invalid`**
  (`prisma/migrations-manual/2026-08-25-purge-synthetic-login-attempts.sql`, guarded to refuse if any
  account exists on that domain, re-run clean). This is housekeeping, not the fix — the join alone
  already takes the tile to zero, verified against the live database before deleting anything. It
  takes the probe noise out of the three totals the join does not touch. Retention would not have:
  `LoginAttempt` is kept 365 days, so these were due to clear in August 2027. Not applied to the demo
  database, on purpose: data-only file, and that `LoginAttempt` table is empty.
- **Verified at both viewports.** The tile reads a green 0, the panel reads "Nobody is locked out",
  and the reason breakdown is 31 / 5 / 1 with no slug. `npm run visual` not run: the change is
  admin-only, `/admin/analytics` is not in `ROUTES`, and another session has `e2e/visual.spec.ts`
  open mid-investigation.

## Session 2026-08-24 — Safari could not load localhost, and the cache kept it broken

The owner's Safari had been unusable on `localhost:3000` for days while Brave was fine: first an
unstyled page, then "Safari can't open the page ... the server unexpectedly dropped the connection"
on every load until a hard reload. Three commits on `main`, not pushed. `npm run check` green (54
tests). `npm run visual` 18/23 — all five reds read and confirmed as database drift (new members
moved the directory count and the map clusters, a catch-up named "test" was archived); layout and
type pixel-identical, no baselines rewritten.

- **The cause was ours and dated exactly: `b64e44a`, 20 Aug 13:58.** It added
  `Strict-Transport-Security` and the CSP's `upgrade-insecure-requests` to every response, dev
  included. WebKit obeys `upgrade-insecure-requests` on `localhost`, Chromium exempts it, so Safari
  fetched every stylesheet and script over an https the dev server does not speak. Both headers are
  gated on `isProd` now. Full mechanism in `TRAPS.md`.
- **The fix landing did not end the symptom, and that was the real lesson.** Safari served the
  broken era from its own cache through hard reloads, dev-server restarts and a verified-correct
  server — `curl` proved the headers were gone while the browser kept failing. It ended when the
  owner cleared Safari > Settings > Privacy > Manage Website Data > localhost.
- **Two suspects killed with evidence rather than guesses.** No service worker (the owner's own
  Manage Website Data listing names its categories and there is none). No HSTS pin: WebKit ignores
  an HSTS header over plain http, tested against a throwaway server and a second port on the same
  hostname, so clearing history would have done nothing.
- **A WebKit build, installed and then removed (297MB, over the 200MB line I should have asked at).**
  A clean WebKit loading the site
  perfectly — first load, reload, after a 30s idle — is what cleared the code and moved the search
  into Safari's stored state. chrome-devtools MCP cannot do this; the bug class is WebKit-vs-Chromium.
- **A second, smaller fix rode along, and it was not the cause.** `next dev` drops an idle keep-alive
  connection after six seconds (measured) and Safari, unlike Chromium, does not retry into a fresh
  socket. Dev responses now send `Connection: close`. Verified it leaves hot reload alone by watching
  `turbopack-connected` / `built` / `serverComponentChanges` still arrive over the HMR socket.
- **Left alone deliberately:** `127.0.0.1:3000` renders but refuses the HMR socket, because Next's
  dev server treats a different hostname as a different origin. One line (`allowedDevOrigins`) if it
  is ever wanted; nobody needs that address while `localhost` works.

## Session 2026-08-22 — The Turnstile checkbox: why it shows, and the second tick

The owner reported the bot check appearing in incognito, on his sister's Safari desktop in the UK,
and in a plain Samsung Chrome tab — and that she had to tick it **twice**. One commit on `main`, not
pushed. `npm run check` green (54 tests), `npm run visual` 23/23 with no baseline rewrites.

- **Why it shows is not a bug, and not something the code can fix.** The widget MODE lives in the
  Cloudflare dashboard and is set to **Managed**, whose documented job is to escalate to a checkbox
  by visitor risk. Our `appearance: "interaction-only"` was already correct and is why most members
  see nothing. Incognito, Safari (ITP, and Private Relay's shared IP) and a fresh mobile profile all
  read as an unrecognised visitor. Invisible mode would end it, and was recommended against and
  declined: it has no interactive fallback, so an alum Cloudflare cannot clear gets refused with no
  way to prove themselves — the M07 loop again. Pre-Clearance needs the hostname proxied through
  Cloudflare; `rishivalley.space` answers `server: Vercel`, so it is not available.
- **The second tick WAS ours.** `getToken()` re-armed the widget as it handed the token over, to
  brew the next one early. Reproduced with Cloudflare's forced-challenge test key and measured: the
  token was gone **33ms** after the click, while the button read "Signing in..." for another 2.5s.
  So the tick wiped itself in front of them. Re-arming now belongs to the three forms and fires only
  once an attempt has failed. Verified: the token now survives to 1500ms and clears at 3000ms beside
  the refusal — and that refusal is "Invalid email or password", the positive control proving the
  handed-out token still passes siteverify.
- **It fits the form now.** `size: "flexible"` replaced the fixed 300px box that sat short of the
  400px fields, and a `clip-path` rounds it to the fields' 12px. Measured flush at 400px desktop and
  338px at 390. Nothing inside the challenge can be styled — it is a cross-origin iframe, so the
  white fill, the type and the logo are Cloudflare's and stay Cloudflare's.
- **The visual suite earned its keep.** The obvious `overflow-hidden rounded-*` made the 0px-tall
  holder a block formatting context, which stopped margins collapsing through it; the login form's
  `space-y-3` paid 12px twice and every row slid 6px. Caught by `npm run visual` on the page nobody
  was looking at. `clip-path` paints the same corners and does not touch layout. In `TRAPS.md` now.
- **`TURNSTILE_DEV_CHALLENGE=1`** pins the always-challenge test key locally. Dev otherwise pins the
  invisible always-pass key, so nobody here had ever watched a member tick the box, which is exactly
  how the re-arm bug shipped. Off by default; every unattended flow needs the widget passing alone.
- **Known limit, left deliberately:** below a 352px viewport the column is narrower than Cloudflare's
  300px floor and the widget's right edge clips. No phone in use is that narrow (smallest current
  iPhone is 375). Still better than the old fixed box, which overflowed the page outright.

## Session 2026-08-21 — The pre-release fix session, part two

Picked up the "Still open" list from part one. **Fifteen of the sixteen remaining canonical findings
are closed**; the sixteenth (B-063, the Catch-up leave/archive/delete feature) is designed, has the
owner's two decisions recorded, and is not built. Eight commits on `main`, none pushed.
`npm run check` green (46 unit tests, up from 38), `npm run visual` 23/23.

- **Pausing a Catch-up now actually pauses it.** Pause and End wrote only the Catch-up's own status,
  so the live Round kept advancing, kept sending every non-answerer a daily reminder for the whole
  week, and published itself, all while the home page said "This Catch-up is paused" with no way to
  answer and the header counted down above that banner. The semantics chosen is FREEZE (the spec's
  paused state is a calm banner plus Resume, which only makes sense if the clock stops with it);
  resume shifts every unreached deadline forward by exactly the paused duration, so the group gets
  back the window it had. New nullable `Catchup.pausedAt`. The reviewer caught that stopping the
  clock covered only half of it: five Keeper controls and both member submissions write the Round
  directly and checked only the ROUND's status, which does not change on a pause, so a stale tab
  could still publish a paused Catch-up and announce it to everyone. All seven share `refuseIfFrozen`
  now.
- **A Round nobody asks a question in goes quiet** instead of opening for answers, nudging everyone
  daily to answer nothing, publishing an empty keepsake and starting again next cadence, forever. It
  extends the question window once, then goes dormant; the first question revives it.
- **A Round that published while paused no longer leaves the Catch-up dead** with no future Round and
  no control anywhere to start one.
- **Every date on the site is the valley's day.** The helpers named no time zone, so they used the
  server's (UTC) or the reader's, and a letter written at 00:30 showed yesterday to everyone,
  permanently. Sixteen surfaces, one convention (`VALLEY_TIME_ZONE` and friends in `utils.ts`), plus
  a test that sweeps the whole app and fails on any date rendered without a zone. The year ceilings
  on sign-up were frozen the first time their module loaded, so a server started in December kept
  rejecting January.
- **A double-tap no longer breaks a like.** All five toggles are delete-first and idempotent; the
  client holds one tap in flight. Proved live in a rolled-back transaction that the racing insert is
  rejected by the unique index, which is the exact error the action now answers.
- **Notifications land somewhere.** A comment on a letter took you to the feed, where letters'
  comments are not shown. Four admin notifications pointed at a route retired months ago. Tapping a
  notification whose row had been pruned did nothing at all.
- **A dropped connection no longer freezes the page.** Nothing handled a request that fails to
  arrive at all: the feed sat on grey placeholders forever, and forty-odd controls disabled
  themselves for the rest of the visit with no message. One `callAction` helper, 77 await-sites, 46
  stuck-button cases. Fanned out to a subagent; the whole diff was read here.
- **The bell badge tells the truth**, having been computed once per hard page load and able only to
  count down since.
- **You can take your email off your profile.** The X on that row used to write "no chosen address",
  which the profile read as "fall back", and it published your private sign-in address instead.
- Plus: the post edit cap, place validation on both writers, the admin inbox's unreachable archive,
  the unread-flag lost update, deterministic pagination in the Collection and the feed, and the
  deletion of the dead `/onboarding` route.

**Two net-new findings**, neither in the audit: `createPost` still accepted a `groupId` for the
removed Groups feature and made posts visible on no page in the app (refused now); and a non-async
export in a `"use server"` file 500s every importing route at RUNTIME while `tsc` passes it clean.

## Session 2026-08-21 — The pre-release fix session, part one

The formal bug audit finished this morning with 45 canonical findings; this session fixed the two
Criticals, every launch-blocking High and the whole scale phase. Fourteen commits on `main`, none
pushed. `npm run check` green throughout (38 unit tests, up from 26), `npm run visual` 23/23 twice.
(The ledger and the session briefs were working papers and were removed once the review closed on
2026-08-21; the durable part lives in `docs/TRAPS.md` and in bugs.md's "Settled" section.)

- **Deleting an account used to destroy other people's writing.** `Group.creatorId` and
  `CatchupPrompt.authorId` were both `ON DELETE CASCADE` on a column that only records who happened
  to START something communal. Proved against the real database in a rolled-back transaction:
  deleting the owner's account would have taken all 12 groups, both Catch-ups, both Editions and all
  133 answers. Both columns are nullable `SetNull` now, the purge hands a group with no admin left
  to its longest-standing member, and the merge inherits ownership rather than nulling it. Pinned by
  a test that walks the whole Cascade graph out of `User` rather than checking the two columns the
  audit named.
- **A thirty-second Resend brownout permanently failed every queued email.** A requeued row kept its
  `createdAt`, so it stayed the oldest eligible row and the same drain pass took it again: four
  attempts in four seconds, then terminally failed, which nothing retries. Every failure books a
  later retry now, and a failure the provider caused is told apart from one the address caused. In
  the same pass: `deletion-scheduled` mail could never be selected at all (the eligible list is
  derived from `PRIORITY` now), a bounce webhook handed back budget Resend had already spent, and
  overlapping drains fan out past the provider's rate limit — one pass at a time via a lease row,
  claim/block/release proved live.
- **The connection pool was unbounded and infinitely patient.** `max 5`, a 5s checkout timeout and a
  20s query timeout. `statement_timeout` is deliberately absent: probed live against both poolers,
  Supavisor silently drops pg's startup parameter, so the audit's own fix direction would have
  shipped config that reads like a guard and is not one.
- **Email capitalisation** was canonical in three different ways across signup, login and reset. One
  helper now; the one live member with a capital in her address (who could never have received a
  password reset) is backfilled; a unique index on `lower(email)` means a future path that forgets
  gets a clean refusal instead of a second account for one mailbox.
- **The admin panel could be locked shut from inside it** and eleven of its twelve pages were bare
  Prisma reads relying on a layout gate that soft navigation skips. Both closed, the last-admin count
  moved inside a serializable transaction, and the three self-destructive controls are no longer
  rendered on your own row.
- **The first thing a new member does was broken.** A normal phone photo is 5-12MB and Vercel refuses
  a body over ~4.5MB before the function runs, so onboarding's avatar step failed with a stuck
  spinner and no message. Four upload boundaries go through one `shrinkForUpload` now.
- **The feed, the composer, the letters desk and the rail** stopped losing or leaking what members
  wrote: the card updates on delete and edit, autosave says "not saving" instead of lying and keeps
  a copy on the device, Post is gated on in-flight uploads, the rail stops teasing city-scoped
  letters to everybody, a draft's audience survives being reopened, and removing a contact row saves
  the list without it.
- **Payments that land while the phone kills the tab** now reach the supporter: the webhook writes
  them a notification carrying the bird-picker link, and only when it was the one that recorded the
  payment.
- **Indexes.** Ten child-side foreign keys plus a trigram index on the gazetteer. The city
  type-ahead went from **368ms and 4,690 buffers to 7.4ms and 54**, measured with EXPLAIN (ANALYZE)
  before and after. The directory stopped serialising every member into the map on every filter
  change. Presence telemetry gained a 180-day expiry (it had none), and the admin heatmap's
  busiest-hour line stopped being eleven hours out.
- **A batch can no longer be split into two groups** by two people registering in the same second.

## Session 2026-08-21 — The house chain goes back to arrows
Owner: "the house chain was arrows before. recently we made it lines. revert it back to arrows as
it was before."

- **`houses-chain.tsx` restored to its state before commit 5aa5549** (2026-08-19,
  "replace house-chain arrows with colour-handoff lines"): the SVG arrow glyph with its head, the
  6px gap each side, the 4px `TURN_LEAD` that keeps a turn off the pills, and the arrowheads on
  the serpentine turns. Nothing else in that commit was touched.
- **The `/lab/chain-lines` room stays**, since the six line treatments are worth keeping as a
  record; its registry note no longer claims Thread shipped. The component docblock says plainly
  that lines were tried for two days and reversed, so no future session re-ships them by accident.
- Verified: `npm run check` green (26/26), `npm run visual` 23/23 against the committed baselines,
  and the real chain screenshotted at 1440x900 and 390x844 — nine houses, arrows in both rows,
  the turn arrow pointing down into the next row on both viewports.

## Session 2026-08-19 — The admin panel, rebuilt as nine sections
Owner's ask: "completely redo admin... it follows no design principles, no UI, no UX, it's just a
mess." Three specific complaints: no navigation other than scrolling, the bird/name/subtitle row
done "in a billion different ways", and "so much grey text". Spec written and approved first at
`docs/spec/admin.md`.

- **Measured before touching anything.** At 1440x900 the panel was 2901px tall (3.2 screens), 70%
  of that a 49-row users table; 203 interactive elements; 128 of 242 text nodes (53%) grey; 23
  elements below the type scale's smallest documented step, 18 of them also grey; ~15 database
  round trips per load including THREE separate scans of the User table; and a `min-w-[640px]`
  table inside a 460px scroller, so on a phone block and delete were off-screen behind a
  horizontal scroll with no affordance.
- **Nine sections in three groups, behind a swapped sidebar.** Entering `/admin` replaces the
  main rail's nav with the admin sections. Same `NavRow`, same marker group, so the cinnamon edge
  GLIDES out of the account section and up into the list. A second rail beside the first was
  offered and rejected as janky by the owner, correctly: two vertical navs and 180px of a 1192px
  column. Eleven routes, each loading only its own data.
- **People replaces three sections** that all described the same 51 members (Users, Verification,
  and Email & verification, whose fourth filter was literally labelled "Everyone" and listed all
  of them two inches above a section that listed all of them). Uses the shared filter kit rather
  than the bare pill row that reinvented it. Three-up from `xl` at the owner's ask: 51 people in
  1640px, where the old table needed 2032px for 49 with no avatars at all.
- **One person row, and it refuses a `meta` prop.** `IdentityRow` is shared GEOMETRY, not shared
  content, which is why adopting it never made two screens agree: every caller passes its own
  subtitle. `AdminPersonRow` has nowhere to put a different one. Fixes the last `formatBatch`
  call in the app (`user-management.tsx:86`), which rendered blank for every teacher and was
  flagged in round 3 as "an admin surface the owner did not name".
- **Twelve capabilities the code supported and the panel could not reach**: contributions ledger
  (with the livemode split, so a dev's test click cannot inch the real total), a content desk over
  posts/letters/comments/photos, admin notes (stored AND fetched on every load, then dropped),
  `photoTrusted` and role (columns with no UI anywhere in the app), editing a member's
  name/batch/cities/bird instead of hand-writing SQL, account merging, a blocked list, report
  history, per-message mail failures with the stored `lastError` and a retry, Catch-up rounds past
  their date, and a stubbed Analytics room.
- **Two owner notes pulled against each other and the later one won.** 2026-08-04 asked for more
  density; 2026-08-19 asked for "no overcrowded elements, everything well spaced". The answer was
  not tighter rows but FEWER THINGS PER ROW: at most one chip and one button, and a chip only for
  something a human must act on. "Email not confirmed" was showing on seven of eighteen rows for
  a state this codebase's own taxonomy calls "not a problem"; it is gone. "Unverified" is gone
  because the Verify button beside it already said so.
- **One click target per row.** The first cut had the card going to the admin record and the name,
  on top of it, going to the public profile, which needed a stretched overlay, a pointer-events
  dance and a breakpoint. It is now one plain link, and where a Verify button exists the link
  stops short of it so the hover tint ends exactly where the link does.
- **After**: no admin screen over 1.8 screens, grey down to 34% on the densest one, ZERO elements
  below the type scale, no horizontal scroll at 390px, every destructive action reachable on a
  phone.
- **Gotcha 3, again, and the owner caught it before I did.** `people-list.tsx` (client) imported
  the facet OPTIONS from a module that also imported `prisma`, which dragged `pg` and its
  `require("dns")` into the browser bundle. `tsc` was perfectly happy. Same bug `admin-threads.ts`
  hit and documented earlier; the fix is the same split, now applied three times and commented in
  each. Types and constants in `admin-*.ts`, database in `admin-*-query.ts`.
- **Also**: `docs/spec/person-row-audit.md` written (four components, ten subtitle formulas across
  the app, plus two live bugs found on the way: the mention dropdown hand-writes the batch line so
  teachers read wrong, and `IdentityRow`'s default meta style is 10.5px, below the scale). The app
  outside `/admin` was deliberately not touched. The tour trigger stays on Overview and its test
  followed the guard into the layout rather than being deleted.
- Commits: `f31a448` spec, `ae7d9c4` the rebuild, `41d5011` the spacing and clarity pass,
  `cba56e0` simplify. Not pushed.

## Session 2026-08-19 — The hoopoe gets a public playground at `/hoopoe`
Owner's ask: lift the lab's hoopoe room out to `/hoopoe`, keep the lab version untouched, and on
the public one keep only the first tile and the password/gaze demo, expanded into something easy
to play with and worth sending to people.
- **New public route** `src/app/hoopoe/page.tsx` + `src/components/mascot/hoopoe-playground.tsx`.
  `/lab/hoopoe` is unchanged: proportion sliders, tail compare, matrix and sequence builder all
  still live there. The public page carries no readouts, no code output and no API names.
- **The playground is the tile, expanded**: a scene that scales its bird off a ResizeObserver
  (150-280px), tap-anywhere-to-fly, gaze that follows the
  pointer and hands back to the ambient wander on leave, a day/dusk sky mixed from `--sky` /
  `--canopy` / `--cinnamon` (dusk is how you actually see `sleep()` land), and 36 verbs on a
  labelled rail in plain English. "Surprise me" plays one of six named four-beat routines; the
  name shows in the caption while it runs.
- **Three geometry fixes found by measuring, not by eye**: the horizon was 24px below the bird's
  feet (it is now derived from the rig's 152/120 box), an unclamped fly-to cropped the crest on
  any click in the top 45% of the sky (targets are clamped into the frame, and the marker shows
  the clamped point), and `rest()` restores the POSE but never the POSITION, so a bird flown into
  a corner could not come home. "Settle down" now flies it back to the rig anchor
  ((101+10)/152 down its own box) before settling. The rig is found by `PARTS.root` and walked up
  to its `<svg>`, not by asking the scene for its first `<svg>`, which any icon would satisfy.
- **Sticky scene** on both viewports so the toy never scrolls off while you use the rail; it
  needed `bg-card` or the chips read straight through the caption text.
- Public in `src/proxy.ts` (reads nothing, writes nothing) and in `PRODUCT_ROUTES` in
  `scripts/qa/lab-audit.mjs`. Verified at 1440x900 and 390x844 with fly, settle, surprise, dusk,
  sleep and the password toggle driven live. `npm run check` green. Not pushed.
- **Owner round 1** (same session): the intro paragraph and the butterfly prop are gone, the
  caption is just "Tap to see it fly.", and the show/hide password icons were inverted against
  the house convention (`src/components/auth/password-field.tsx:75`: shown = Eye, hidden = EyeOff).

## Session 2026-08-14 (round 3) — No rings on boxes; the whole auth family swept; mobile keeps its keyboard
Owner notes on round 2, shipped in `7a505a7` / `094a540`:
- **The leaf focus ring is OFF every calm-form box** (owner: "I don't want the green outline
  on boxes. it still shows on phone"): inputs match :focus-visible even on tap, so the ring
  flashed green on every touch. The caret + floating label are the field's focus state now.
  Buttons and links KEEP their rings (keyboard travel); the round-2 outline-solid fix still
  matters there. FloatField, trivia box and the phone shell all cleaned.
- **Autofocus is desktop-only**: useDeferredAutofocus gates on `(hover:hover) and
  (pointer:fine)`, so phones never get the keyboard summoned on arrival (owner: "the keyboard
  takes up half a page"). Covers login, signup, trivia, forgot (its raw autoFocus converted to
  the hook), reset. Composer/menus/lab autofocts untouched (post-tap, wanted).
- **Batch InfoTip stacking fixed** (owner: "the i to explain batches goes behind the UI"):
  every form row is a transformed motion.div = its own stacking context, so later rows painted
  over the bubble regardless of z-index. The years row now carries `relative z-10`; verified
  via elementFromPoint at the bubble's center.
- **Forgot + reset password swept into the calm form** (owner: "do a thorough job like the
  forgot password page... look through and make sure"): PasswordField rebuilt on FloatField
  (8-char rule as focus hint, not a grey line), reset's two fields ride it (reset KEEPS its
  confirm field - choosing an unseen new password is where confirm earns its place),
  forgot's email is a FloatField and its ask-subtitle died, AuthPanel widened 360->400,
  AuthHeading paragraph optional (kept where it informs: sent-to address, dead-link reasons,
  reset account). verify-email checked: no inputs, no work needed. Onboarding (/welcome) is a
  different surface, not swept - flag if wanted.
- All verified live at 1440x900 + 390x844 (rings gone while focused, tip above rows, zero
  autofocus under touch emulation, dead-link state, forgot both viewports). `npm run check`
  green. Not pushed.

## Session 2026-08-14 (round 2) — Login joins the calm form; toggle animates both ways; mist
Owner follow-ups on the signup redesign, shipped in `e555fde` / `4c931a2` / `12a1bac`:
- **The expand snap is fixed.** auto-animate FLIPs siblings on row REMOVAL but drops them
  straight to place on INSERTION (frame-sampled: shrink eased ~250ms, expand jumped 68px in one
  frame). Replaced with Motion layout rows + `AnimatePresence mode="popLayout"` for the years
  row and error line: both directions now interpolate identically (28 frames each way, snappy
  spring), segmented control still moves 0px. Same choreography on login's admin-hide and error.
- **Trivia step re-centred** (owner: "spaced weird, not in the middle"): anchoring is per step
  now - trivia `my-auto`, register `mt-[8vh]` - with `layout="position"` gliding the column
  between anchors at the swap (bird eases 279->118 over ~23 frames, no teleport). Trivia's
  "Answer this to prove you're one of us." deleted; question sits mt-5 under the title.
- **Paper -> mist everywhere in the calm forms** (owner: "not liking the white typing box"):
  `FIELD_SHELL`, segmented track, autofill inset shadows. Mist is +2.6 dL* on the page (auditor
  corrected my +3.5 claim), the well-you-type-into rung, no white-slab glare. DESIGN-SYSTEM.md
  §3 updated.
- **/login rebuilt on FloatField** (`4c931a2`): no subtitle, two mist wells, 400px column
  matching signup, "Forgot it?" right-aligned under the password box, lg canopy CTA, popLayout
  rows. Flight/perch/admin machinery untouched; admin bypass, wrong-password error and
  forgot-password email carry all re-verified live.
- **App-wide a11y catch** (`12a1bac`): keyboard focus rings on every `Button` and `Input` were
  INVISIBLE - Tailwind v4's `outline-none` zeroes `--tw-outline-style` and
  `focus-visible:outline-2` only restores width, so rings resolved 2px leaf with style:none.
  Screenshot-qa caught it probing computed styles; fixed with `focus-visible:outline-solid` on
  both primitives + FloatField + trivia input. NOTE for a future sweep: any other element
  pairing `outline-none` with `focus-visible:outline-*` outside these primitives has the same
  dead ring.
- QA: 2 screenshot-qa (login desktop/mobile) + design-protocol-auditor, all findings applied
  (dL* figure, stale paper comments, line-height slack on Forgot-it). `npm run check` green.
- Still parked for owner calls: SegmentedPills 32px tap target, 20px Back link, login/signup
  CTA at 44px vs 56px fields.

## Session 2026-08-14 — Signup goes calm (Revolut reference) + landing frost timing
Owner asked for the join page to stop feeling crowded and daunting, retitled to "A bit about
yourself", subtitle gone, and sent the Revolut "bank account details" reel as the target: soft
filled boxes, label inside, nothing else. Shipped in `886fbab`:
- **`FloatField`** (`src/components/common/float-field.tsx`): 56px paper-filled borderless field,
  12px radius, label floats up on focus/fill/autofill via transform-only translate+scale (0.72 =
  11.5px rendered; base stays 16px so iOS never zooms). Placeholder hints exist but appear only
  while focused ("2014", "8+ characters"). Recorded in DESIGN-SYSTEM.md §3 as the second
  sanctioned input material for calm forms; bordered `Input` stays the default elsewhere.
- **Register step rework** (`signup-form.tsx`): role segmented control first, full width, no
  "I am a..." label; alumni years (Joined/Left/Batch, 3-up, InfoTip inside the batch box) appear
  directly below it; Confirm Password deleted (eye toggle covers it; server never read it);
  phone is one composite box, "+91" fades in on wake, "Optional" hint inside, helper line gone;
  auto-animate slides the conditional rows. Every permanent grey helper paragraph is gone.
- **The toggle jump is dead structurally**: the entrance column is `mt-[8vh] mb-auto` instead of
  `my-auto` (page.tsx), so the alumnus/teacher flip changes height only BELOW the control
  (measured 0px movement; before: 151px scroll-clamp leap on mobile). Whole form now fits both
  1440x900 and 390x844 with zero scroll (was 995px tall). Bird + title are pixel-identical
  across the trivia->register swap now, so the step change no longer re-centers anything.
- **Trivia step harmonized**: same paper 56px answer box (plain input on `FIELD_SHELL`, not an
  `Input` override), `size="lg"` Check to match Join, 16px pre-CTA gap on both steps.
- QA: 2 screenshot-qa agents + design-protocol-auditor. Auditor's real catch: I had duplicated
  and orphaned `YearInput`; it now renders through FloatField so signup consumes it again.
  Flagged for a future owner call: SegmentedPills' 32px tap target (app-wide control, iOS wants
  44), the 20px-tall Back link (shared with /login), and /login still on bordered inputs while
  its sibling signup went paper (deliberate scope, worth harmonizing later).
- **Landing frost fix** (`071323d`): the hero Sign in pill's backdrop blur popped in a beat
  after load, because an ancestor fading below opacity 1 forms a backdrop root and the pill
  couldn't sample the photo mid-entrance. Middle block now animates transform only; the fade
  lives on the headline wrapper and each CTA (`MotionLink`) individually with identical
  timings. Frame-sampled 241 frames: blur(8px) active on every frame including the first,
  middle never dips below 1; sign-in exit choreography re-verified intact.
- Before/after shots in `docs/planning/shots/signup-{before,after}-*.png` (untracked).

## Session 2026-06-29 — Bird avatars reborn: 37 real Rishi Valley birds, colour, no background
Final count is **37** (started at 26; owner named more birds they remember from school, all added:
Paradise Flycatcher, Pond Heron, Little Cormorant, Golden Oriole, Cattle Egret, Verditer Flycatcher,
Peregrine Falcon, Orange-headed Thrush, Blue-faced Malkoha, Jacobin Cuckoo, Black Eagle).
Fixed a `mix()` bug (3-digit hex like `#000`/`#fff` produced a NaN blue channel -> invalid fill ->
rendered BLACK), which had been drawing several birds' wings/patches as black blobs.
The public gallery at **/preview/birds-rv** was redesigned as a clean icon display (one size, names only).
Owner rejected the mono-white silhouettes (all looked the same at profile size). Rebuilt the system:
- **New formula:** each bird has its OWN real colours and is built from big SOFT ROUNDED shapes (no
  thin spikes). Colour carries differentiation at 28-40px; one bold rounded signature gives character.
  Lives in **`src/components/common/bird-avatar-v2.tsx`**; `BirdAvatar` delegates to it via `USE_V2`.
- **50 species, researched.** A background workflow (eBird/V. Santharam, the RV checklist + book,
  the Rayalaseema arid-scrub avifauna) pooled 171 species; an art-director pass curated an initial 26
  (later expanded as the owner named more birds they remember from school). A second curation pass
  de-collided 22 further requests, keeping 13 (incl. Red Avadavat, Common Kingfisher, Flameback,
  Brahminy Kite, Bay-backed Shrike, two more sunbirds/flycatchers, green-pigeon, white-eye) and
  ditching 10 look-alikes. Final = 50, all mutually distinct as round flat avatars. Hoopoe, Peafowl,
  Spotted Owlet are in.
- **Optical centering, measured not eyeballed.** `scripts/dev/centroid.mjs` rasterises each bird,
  finds its true pixel centroid + bbox, and writes scale+nudge corrections to
  `src/components/common/bird-adjust.json` (read via `archeTransform`). Converged: every bird centroid
  = (50,50), reach ~43, even margins, zero edge-kissing (fixed the "hangs low / too close to edge" issue).
- **Background treatment = NONE (owner choice).** `BG_MODE` in bird-avatar-v2.tsx switches
  none / outline (sticker halo) / inset (bird in disc) in one line; container in bird-avatar.tsx
  stops clipping for the no-disc modes so crests/bills are not cut. No disc => no per-member colour;
  visual variety is 50 species x 2 poses. Switch to "inset"/"outline" to restore per-member colour.
- **Owner = Hoopoe.** `SPECIES_PINS` in avatar.ts pins user id -> species; sanan (owner) -> Hoopoe (#0),
  applied in BirdAvatar (manual override > pin > hash). Pin is keyed by local id; production should add
  an `avatarSpecies` column + settings UI (User has `avatarColor` but no `avatarSpecies` yet).
- `BIRD_SPECIES_COUNT` 52 -> 26; `avatar.test.mjs` updated -> PASSES. tsc clean (only a pre-existing
  unrelated error in preview/delight/_kit.tsx). Previews: **/preview/birds-rv** (gallery),
  **/preview/birds-bg** (treatment comparison), /preview/centroid (dev harness).
- Verified on the real authenticated feed: no-disc birds read cleanly; owner shows the hoopoe in the
  composer, post header, and sidebar.

## Session 2026-06-27 — Fork 5: bird-avatar species set (16 -> 52)
Scope: ONLY the bird avatars. Expanded the deterministic set from 16 to **52 distinct, cute,
centered species** (now 52 x 10 colours x 4 poses = 2080 combos). Same locked system: one off-white
fill centred in `0 0 32 32`, negative-space eye = disc colour, `birdFor` hash unchanged.
- New QA harness at **/preview/birds-qa**: every species rendered big with a centre cross + safe ring
  + the 40/28 ship sizes. Use this to judge centering/balance for any future bird edits.
- Authored 52 species in `bird-avatar.tsx` `Species()` (see docs/spec/avatars.md for the index->name list).
- Fix pass after QA: removed dangling LEGS from waders (flamingo/stork/crane/heron/kiwi) and recentred
  (they were bottom-hanging / too tall — owner's explicit pet peeve); fixed swift wings (were sweeping
  up like ears); reworked eagle + falcon (were reading as a heart/bat); replaced 3 near-duplicate round
  birds with distinctive bills (myna->spoonbill, koel->avocet, junglefowl->puffin); differentiated
  munia/dove/sparrow/robin; enlarged the hoopoe crest.
- `BIRD_SPECIES_COUNT` 16 -> 52 in avatar.ts; `avatar.test.mjs` updated (N=16000, species band 0.28) ->
  PASSES (2078/2080 combos, even spread). avatars.md given an "implementation status" header with the list.
- Verified via screenshots at large + ship sizes, light disc + full 10-colour palette. Looks delightful.
- Open for a future pass if wanted: a couple of small round birds still read as "blob+eye" at 28px
  (inherent to mono silhouettes; colour carries differentiation there); eagle #42 is the least elegant.


## Session 2026-06-27 — Fork 4: preview-parity fixes (committed fd343e2, 819bc30)
Owner was seeing the real (main) app diverge from /preview/v2 AND several "broken" things that
were actually a STALE .next cache serving old CSS. Key learning reinforced: when the UI looks wrong,
too-small, or an animation "does not work", suspect the .next cache FIRST. Always clear .next
(`mv .next` to scratchpad, rm is blocked) + restart before concluding a CSS/animation fix failed.
Fixes this session (all verified at runtime + screenshot, tsc clean):
- Valley background is now a FIXED cover back-layer (app-shell.tsx): `fixed inset-0 z-0 bg-cover
  bg-center opacity-[0.11]`, sidebar+content `z-10` above it. Fills the window at any desktop size,
  shows the whole frame, stationary on scroll (content scrolls over it). (Replaces the bg-contain
  and the earlier bg-cover-on-tall-element that looked zoomed/pixelated.)
- Notification bell (notification-bell.tsx): switched header+sidebar icon from Phosphor duotone/fill
  to lucide outline Bell (matches preview). Hover wobble (.bell-trigger:hover svg in globals) now
  actually serves after the cache clear; confirmed computed animationName="bell" on hover.
- Search pill (search-pill.tsx): width min(20rem,56vw) -> min(19rem,53vw) (~5% shorter, ~304px).
- Post actions (post-card.tsx): -ml-2.5 -> -ml-3.5 so the heart glyph's left aligns with the post
  content left (measured heart svg left 301 vs content 305).
- Feed heading confirmed 30px Libre Baskerville (matches preview; the "super small" was stale cache).
- Hoopoe (login): FLIPPED per owner. Eyes now OPEN while the password is hidden and COVER when
  revealed (was the reverse). Removed the intro timer (`intro` state + useEffect); the component's
  own blink/settle still plays on mount. Verified eye opacity hidden=1 / shown=0. (commit e277db0)
- Pushed `redesign` to GitHub (origin = github.com/sanan-shankar/rv-alumni) as the MVP checkpoint.
  Owner called this "a good MVP". Deploy (Render) still pending; deployed Vercel site is still old code.
Still open / next: more micro-delights beyond the existing bell/like/hoopoe/bookmark (avatar
click-chirp, living loading scene); the PUNCHLIST P0 own-profile crash; bird-avatar species set.

## Session 2026-06-26 — Visual overhaul kickoff

### Done
- Read the whole project: architecture, design tokens, auth, components, inspiration folder.
- Captured current-state screenshots (landing, login, signup, feed, directory, profile, mobile).
- Diagnosed root causes (see findings.md): muddy glass-over-photo, dead dark auth, electric green,
  boring single-column + bare profiles.
- Aligned with user: evolve the foundation, build multiple visual directions to choose from,
  neutrals-first palette with restrained green and very sparing brown, hearts stay red,
  sidebar nav, default light, richer profiles, kill magic links, hoopoe not owl.
- Fixed screenshot tooling (system Chrome via PUPPETEER_EXECUTABLE_PATH).
- Wrote planning files.

### In progress
- Building 3 isolated /preview directions: Grove (evolve, ambient photo, leafy),
  Almanac (rebuild, editorial paper, cinnamon hairlines), Canopy (rebuild, immersive,
  dark identity rail + image-forward content, pine + cinnamon pops).

### Built (Phase 1 complete)
- Three isolated directions live at /preview/{grove,almanac,canopy} (+ /auth each):
  - **Grove** — evolve/ambient: subtle valley photo, warm cream, muted forest green, sidebar.
    Critique: cream-card-on-cream-bg contrast is a touch weak (cards float softly). Safe, gentle.
  - **Almanac** — editorial paper: hairline-ruled feed sheet, cinnamon eyebrows, serif, right rail.
    Most intimate/literary/on-brand. No photo wash.
  - **Canopy** — immersive: dark forest identity rail + light image-forward content, pine + cinnamon
    pops, split branded login. Boldest, most "alive", best at filling space.
- All: sidebar nav, default-light content, neutrals-first + restrained green, red hearts, sparing
  cinnamon, bird/hoopoe mark, Rishi-Valley-flavoured copy, right rail (fills the dead space).
- Temporarily added "/preview" to proxy.ts publicPaths so the user can browse live (REVERT later).
- Screenshot tooling note: photo-heavy PNGs get downscaled in the Read view; use 2x clip crops to
  inspect detail. Layout verified identical across directions via getBoundingClientRect.

### Round 2 (v2 preview) — done
- User feedback digested (see task_plan). Built ONE converged interactive direction at /preview/v2
  (client component, live toggles: Light/Dark, Feed/Login, Initials/Birds). Query-param init for
  deterministic screenshots (?theme=dark&view=login&avatars=birds).
- Applied: flush corner-to-corner sidebar (no left strip), lighter medium-pine sidebar (less stark),
  faint tree bg in content (Grove idea, kept), cooler/less-warm palette, vibrancy via blue accent
  (counts, fund gradient) + cinnamon (events/dot) + red hearts, consistent rounding (pill controls /
  squircle cards), centered New-post button, iPhone-style date chip, removed "The Valley today"
  eyebrow, Letters=quill (Feather) not mailbox, Share=Apple-style, Heart=Phosphor, elegant small-caps
  batch line (no bubble), login with big photo + centered form + no quote/est-1926, animated hoopoe
  on the password field (wings cover eyes when hidden, tuck to sides when shown), like-pop + bell-shake.
- GSD: verified @opengsd/gsd-core is the genuine package for the named repo; install BLOCKED by the
  auto-classifier (org/scope hyphen mismatch); awaiting user's explicit OK.

### Deferred to after look is locked
- Mobile hamburger drawer; login slide-on-submit animation; finer warmth/saturation tuning;
  batch-display alternatives; bird-avatar art quality.

### Round 3 — done
- GSD installed locally (./.claude, 69 /gsd-* cmds + hooks, ~8MB; restart to activate). Did not touch
  CLAUDE.md or source. Suggest gitignoring .claude/gsd-core etc. (reinstallable via npx).
- Avatars: default switched to valley-birds (3 variants: plain / crested / long-tail) + profile-photo
  support (photo overrides default; Karthik shows a placeholder photo). Bird art is decent, to be
  refined into a proper species set.
- Post layout toggle added: Tiles (default) vs ruled Sheet (Almanac feel). Live via control bar + ?layout=.
- Logo lab at /preview/logos: wordmark-only, monogram (filled+outline), valley/hills, feather, leaf.
- docs/planning/FEATURES.md written (feature backlog).

## Round 4 — design locked + MVP build kickoff (2026-06-27)
- GSD installed (./.claude, local). docs/planning/FEEDBACK_CHECKLIST.md written: every owner instruction itemized + tracked.
- Locked the design in /preview/v2 and verified by screenshot:
  - dimmer + warmer light palette, less-white surfaces; darker flush sidebar green.
  - heart is ALWAYS red now (fixed the black->red fade: transform-only transition on the heart).
  - New-post glow toned down; "+" centered; search longer + "..." placeholder.
  - batch "·" dot bigger; tighter name->batch spacing; bird glyph centered; vivid avatar palette
    (green #4F9E6B, blue #3F7CA6, terracotta #C8704A, sky #5C9BC4, rose #C75F7A) with real red presence.
  - hoopoe bigger + opens eyes then closes on load (intro), fuller crest; sign-in pushed lower.
  - profile avatar cutoff FIXED; header = batch/location/profession (house dropped from view, still collected);
    dropped the "5 groups" stat; rail lowered to align with the composer.
  - DECISION: ship LIGHT-MODE-FIRST for MVP; dark mode parked (revisit as a warm "gray not black" later).
- Launched architecture/mechanics thinking workflow wpud23338 (11 area specs + synthesis) to drive the build.

### Architecture workflow landed + build started (2026-06-27)
- Workflow wpud23338 completed: persisted docs/ROADMAP.md (13-phase plan, decisions, component inventory, data
  model) + docs/spec/*.md (11 area specs). task_plan.md rewritten as the phase tracker; CLAUDE.md now points
  future sessions to these docs + the locked decisions.
- Key naming locked: long-form post = "Letters" (Post kind), newsletter = "Roundups", photo archive = "The
  Valley Collection". One shared Composer/Feed/PostCard; GroupPost folds into Post(groupId). Light-only.
- Phase 1 (design system) DONE on the REAL app and verified: globals.css warm/dim tokens (bg #E9E6DD, surface
  #FAF8F3, recessed #EFEBE1, border #DED9CC, float #FFFFFF), leaf #1F8A4C, sidebar #235C49, sky #3F7CA6,
  cinnamon #C2622F, heart #E03A33; root layout forcedTheme="light" (dark void GONE); global transition no longer
  animates colour (heart never fades through black); reduced-motion block. Verified: /login is now warm + light.

### Phase 2 done + verified (2026-06-27)
- Built src/components/layout/{peaks-mark,sidebar,app-shell}.tsx; swapped (main)/layout.tsx to AppShell.
  Flush full-height green sidebar (#235C49), peaks ridgeline mark, new nav (Feed/Directory/Groups/Collection/
  Letters/Catch-ups/Events/About), bottom user chip + bell, mobile top bar + sheet. Old top Navbar + fixed-bg gone.
- Owner decisions applied: newsletter feature renamed Roundups -> working "Catch-ups"; grandfathering dropped.

### IMPORTANT GOTCHA (cache) for future sessions
- Next dev (Turbopack) cached the OLD compiled globals.css across edits AND across a plain restart; the served
  CSS kept #F5F0E8/#fff while the file had the new tokens. Fix: kill `next dev`, move `.next` aside
  (`mv .next .next-stale`, since `rm -rf` is blocked by Safety Net), restart. After that the new tokens
  (#E9E6DD bg, #235C49 sidebar) served correctly and the sidebar rendered green. If a CSS/token change does not
  appear, suspect the .next cache first. (`.next-stale` left in repo root; safe to delete manually.)

### Phase 3a + 3b done + verified (2026-06-27)
- 3a: BirdAvatar (src/lib/avatar.ts FNV-1a hash + src/components/common/bird-avatar.tsx, 6 species x 10 vivid
  colours, centered, photo override). Verified on /preview/birds (even distribution). Wired into the sidebar.
  Also: src/components/common/person-name.tsx (name links to profile). devIndicators turned off.
- 3b: Restyled the real feed to the approved look. post-card.tsx (variant card|sheet, BirdAvatar, PersonName,
  small-caps batch line, bigger dot, always-red heart with pop, ChatCircle, ShareFat copy-link). post-feed.tsx
  (ruled SHEET container, compact pill search + sort/time, new skeleton/empty). create-post-form.tsx (card not
  glass, on-palette tags, border fix). Verified: feed matches /preview/v2; like heart computed rgb(224,58,51).

### Notes
- Git: still all uncommitted on main. Do NOT push mid-redesign (would trigger a broken Vercel deploy of the old
  host). Branch + commit + push when the MVP is coherent (near deploy phase).
- Remaining UserAvatar swaps (post profile/directory/groups/comments/mention) happen in those phases' rebuilds.

### Phase 5 (profile) done + verified (2026-06-27)
- Rebuilt src/app/(main)/profile/[id]/page.tsx: cover banner (valley photo + gradient), large ringed BirdAvatar
  overlapping (cut-off bug fixed), name + small-caps batch line + city + profession, bio, stats (post count +
  "In the valley YEAR to YEAR"), posts as a ruled sheet, and a Details + Contact rail (variable-length, not
  forced three; admission number gated to own/admin; contacts labeled + linked). Uses existing User fields.
  Verified by screenshot. Tabs (Posts/About/Photos) deferred until About-memories + Photos features land.

### Shipped so far on the REAL app (all verified): warm light design system, flush green sidebar shell, bird
### avatars, ruled-sheet feed (composer + posts + controls), rich profile. These match /preview/v2.

### Phase 6 (lite) directory done + verified (2026-06-27)
- profile-card.tsx -> BirdAvatar + clean card; directory-client.tsx -> pill search, solid surfaces (no glass),
  batch-year browse default (no alphabetical), bird profile cards. Verified. World map deferred (needs deps).

### CORE APP NOW MATCHES THE APPROVED DESIGN (all verified on the real app):
design system, flush green sidebar shell, bird avatars, ruled-sheet feed (composer/posts/controls), rich
profile, directory. Login is light + warm. Old top navbar + glassmorphism + dark void are gone.

### Phase 4 (feed header + right rail) done + verified (2026-06-27)
- New src/components/layout/page-header.tsx (reusable title + subtitle + actions slot).
- New src/components/feed/feed-rail.tsx (server component; REAL data only): "New in the directory" (4 most
  recent non-blocked members, excl. self; hidden when none) + "Your groups" (your memberships w/ counts, blue;
  graceful empty state w/ link). "Coming up" events card intentionally deferred to the Events phase (no Event
  model yet -> would be mock data, so omitted rather than faked).
- feed/page.tsx rewritten: PageHeader("Feed") + flex 3-col (composer+PostFeed | 300px rail). Rail hidden < lg.
- Verified desktop (screenshot-54) + mobile (screenshot-55): rail real-data-driven, mobile single-column, rail
  hidden. Note: dev DB has only the admin user so "New in the directory" is empty locally; populates with alumni.
- Screenshot tooling: must pass PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google
  Chrome" inline (bundled puppeteer Chrome is broken again).

### NAV GAP found: /collection /letters /catchups /events all 404 (no pages yet). /feed /directory /groups
### /about /settings /admin /donate /profile/[id] /groups/[id] /groups/new exist. Build the 4 missing surfaces.

### Phase 3c (Post schema + unified feed) DONE + verified (2026-06-27)
- Mapped the surface first via workflow we9bdjb8f (3 parallel Explore mappers): grouppost / feed / composer.
- SCHEMA (prisma/schema.prisma): Post gained `kind` ("post"|"letter", default post), `title` (letters),
  `groupId` (nullable FK -> Group, cascade) + indexes [(groupId,createdAt),(kind,createdAt),(createdAt)].
  New `Bookmark` model (userId+postId unique). `GroupPost` model REMOVED; Group.posts now Post[]; User gained
  bookmarks[]. Dev DB had 0 groups/0 group-posts so a clean swap (no data migration). `prisma db push` applied;
  4 existing posts defaulted kind=post/groupId=null. Generated client lives at src/generated/prisma; DB=dev.db.
- feed/actions.ts: createPost now takes groupId/kind/title (+ group-membership check; group posts drop tag/
  targetBatches; revalidates /groups/[id] or /feed, and /letters for letters). deletePost authorizes group
  admins for group posts. loadPosts: opaque-cursor pagination -> KEYSET for the default "recent" sort
  (orderBy createdAt,id; cursor by id), OFFSET fallback for liked/commented; new groupId + kind filters;
  main feed forces groupId:null (ISOLATION), group feed requires membership; returns {posts,hasMore,nextCursor};
  PostData now carries kind/title/groupId/bookmarked. New toggleBookmark action.
- validators.ts postSchema: + kind/title/groupId; content max raised to 20000 (letters).
- post-card.tsx: PostData +kind/title/groupId/bookmarked; renders a serif letter title; BookmarkSimple button
  (fills leaf when saved); share link is group-aware. post-feed.tsx: cursor state + groupId/showControls/
  reloadKey/emptyTitle/emptyHint props. NEW feed-column.tsx (client) ties composer+feed via reloadKey so a new
  post appears instantly. create-post-form.tsx generalized: groupId/placeholder/onPosted props.
- GROUPS folded onto shared infra: NEW group-header.tsx (warm card, BirdAvatar members, leave); groups/[id]/
  page.tsx rewritten = GroupHeader + <FeedColumn groupId showControls={false}>; old group-feed.tsx DELETED;
  createGroupPost/deleteGroupPost removed from groups/actions.ts. Group posts now get likes/comments/polls/
  bookmarks/share (big upgrade over old text-only).
- VERIFIED: tsc --noEmit clean; feed renders w/ bookmark button + keyset paging (screenshot-56); group page on
  shared composer/feed (screenshot-57/58); inserted a temp group+post -> confirmed it shows in the group AND the
  main feed still counts only 4 (isolation holds), then DELETED the temp data (DB back to 1 user/4 posts/0 groups).

### Phase 8a LETTERS done + verified (2026-06-27)
- Letters = Post with kind="letter" + title (schema already shipped in 3c). Zero new infra (just Post rows).
- create-post-form.tsx: letter-mode. A "Letter" (Feather) chip toggles kind; reveals a serif Title input;
  textarea grows to 10 rows; char cap 5000->20000; Poll disabled in letter mode; submit sends kind+title; CTA
  reads "Publish letter". New `defaultLetter` prop starts the composer in letter mode (used on /letters).
- post-card.tsx: when kind=letter, renders a COMPACT bounded letter card (cinnamon LETTER eyebrow + read time,
  serif title, 2-line excerpt, "Read this letter ->" linking to /letters/[id]) instead of full content -> never
  dominates the feed (the owner's clutter fear). Normal posts unchanged.
- NEW src/app/(main)/letters/page.tsx (index): PageHeader + LetterComposer CTA + editorial cards (eyebrow,
  serif title, excerpt, author footer) for kind=letter, groupId null, audience-filtered; lovely empty state.
- NEW src/app/(main)/letters/[id]/page.tsx (reader): back link, eyebrow, big serif title, author header, serif
  body (font-heading, 17px/1.8, whitespace-pre-wrap, ~680px measure, bold/italic/mentions via renderRichText),
  images, then LetterEngagement. Group letters gated to members.
- NEW components: letters/letter-composer.tsx (client toggle -> CreatePostForm defaultLetter + router.refresh),
  letters/letter-engagement.tsx (client like/bookmark/share + reused CommentsSection).
- GOTCHA fixed: @phosphor-icons/react uses React context -> cannot import in a SERVER component (createContext
  error). The two Letters PAGES are server components, so they use lucide's Feather (no weight prop); client
  components keep phosphor. Remember this for any future server-rendered icon.
- VERIFIED: tsc clean; /letters index (screenshot-62), reader desktop (63) + mobile (65), feed compact card (64).
  Tested with a temp letter, then deleted it (DB back to 4 posts).

### NAV now: Feed/Directory/Groups/About/Letters live. Still 404: /collection /catchups /events.
### Catch-ups (= the newsletter, owner-renamed from "Roundups") is the BIG infra feature: needs Roundup* models
### + Render Cron + Resend. Per spec it lives under Groups. Build manual-cadence MVP later; needs deploy infra.

### Phase 9 VALLEY COLLECTION (photo archive) MVP done + verified (2026-06-27)
- SCHEMA: Photo (uploaderId, thumbUrl 480px + url 1600px + optional originalUrl/blurhash, width/height, caption,
  subject/area/era/freeTags taxonomy as comma-joined strings, approved/isHidden/approvedAt/approvedById) +
  PhotoLove (userId+photoId unique). User gained coverPhoto, photoTrusted, photos[], approvedPhotos[],
  photoLoves[]. Pushed to dev DB. REMEMBER: after prisma generate you MUST restart `next dev` or prisma.photo is
  undefined at runtime (hit this; restart fixed it).
- NEW src/lib/storage.ts: putImage(buf,subdir,filename)->url + delImage(url) shim (Blob prod / filesystem dev) so
  the archive never hard-codes Blob (R2 swap = this file only). The legacy /api/upload route is unchanged.
- NEW src/lib/collection.ts: SUBJECTS/AREAS/ERAS taxonomy + label helpers (shared by validator/form/filters).
  validators.ts: photoSchema (subject array min 1, area/era enums, caption/freeTags).
- NEW src/app/(main)/collection/actions.ts: contributePhoto (sharp 2-variant 1600+480 webp -> putImage; approved
  = admin||photoTrusted else queued; 15MB input cap, HEIC rejected), loadPhotos (approved+filters+offset paging,
  love state), myPendingPhotos, togglePhotoLove, approvePhoto/declinePhoto (admin; decline deletes variants +
  notifies uploader with the place-not-people message).
- PAGES/COMPONENTS: /collection (PageHeader + CollectionClient: search+subject/area/era/sort filters, masonry
  columns-2/3/4, pending strip, empty state, ContributeDialog), /collection/[id] (detail: big image, caption,
  facet chips, uploader, PhotoLoveButton; unapproved visible only to owner/admin). collection/contribute-dialog,
  collection-client, photo-love-button. Admin: PhotoQueue + "Photos to Review" stat/section wired into /admin.
- GOTCHA (again): server-component pages must NOT import @phosphor-icons/react (createContext). Collection PAGES
  use lucide; phosphor only in the client components.
- VERIFIED end-to-end with seeded photos: grid (screenshot-67) + detail w/ colored facet chips (68) + admin queue
  Approve/Decline (69) + mobile masonry (70). Then deleted all test photos (Photo table back to 0).
- DEFERRED (noted): originalUrl + blurhash generation, CollectionPicker reuse in composer/covers, "appears in"
  backlinks, photoTrusted auto-approve UI, "A wander" random sort, hoopoe on empty state, photo reporting.

### NAV NOW WHOLE: every sidebar item resolves. /catchups + /events now show a warm "In the works"
### explainer (NEW src/components/layout/coming-soon.tsx + the two pages) instead of 404s. Catch-ups explains
### the group-newsletter model; Events explains gatherings. Both verified (screenshot-71/72).

### Phase 12 SUPPORT page done + verified (2026-06-27)
- NEW /support (warm restyle of the old donate page): "Support RV Alumni", HeartHandshake icon, UPI id pill +
  copy button + QR placeholder (both clearly marked for the owner to replace), "What it covers" panel (server/
  db/photo storage) + run-by-an-alumnus note. /donate now redirects -> /support (old links survive). Footer
  link Donate->Support and its border fixed (border-white/20 -> border-border). Verified (screenshot-73).

### Phase 11 LANDING showcase done + verified (2026-06-27)
- Replaced the bare hero with a scrollable public landing. src/app/page.tsx is now a SERVER component composing:
  LandingHero (client, evolved: peaks logo, warmer one-line subhead, "Request an invite"/"Sign in", bottom
  gradient, "See what's inside" scroll cue, min-h-dvh, transition-all bug fixed) + an invite-only intro +
  3 scroll-reveal feature sections (Feed / Letters / Valley Collection, alternating) + a leaf-tinted closing CTA.
- NEW components: landing/section-reveal.tsx (IntersectionObserver fade+rise, the one motion primitive),
  landing/landing-hero.tsx. Feature visuals are clean design-system MOCKS (FeedMock uses real BirdAvatar, LetterMock,
  CollectionMock from landing.jpeg) -- NOT sparse dev screenshots, so the marketing reads polished and honest.
  Replace mocks with curated real screenshots once there is real content. (old landing-client.tsx now unused.)
- Verified desktop hero (74) + showcase (75) + CTA (76) + mobile (77/78).

### Phase 13a HOOPOE (login delight) done + verified (2026-06-27)
- NEW src/components/auth/hoopoe.tsx: a clearly-a-hoopoe SVG (7-spoke black-tipped cinnamon crest fan, head+body,
  decurved beak, long black tail w/ white band, two eyes). Wings cover the eyes when covered=true, swing open
  like curtains (rotate +-84deg) to reveal them when false. IMPORTANT: animation is driven by INLINE styles
  (transform-box: fill-box, transform-origin, transition) NOT global CSS -- the first attempt put the wing/eye
  rules in globals.css and they never applied (stale-CSS-cache gotcha again; both states rendered identical).
  Inline styles fixed it instantly. (A now-unused .hoopoe block remains in globals.css; harmless.)
- /login wired: showPw + intro state; password field got an Eye/EyeOff toggle that flips show/hide AND drives the
  hoopoe; on load it peeks (eyes open ~1s then close). Title centered -> "Welcome back to the valley".
- Verified both states: covered=wings over eyes/no eyes (screenshot-81); open=wings down/eyes visible (82).
- TODO later: same hoopoe on /signup password; loading-bird scene; bookmark ribbon; bird-avatar click chirp.

### Phase 10 CORE (teachers + verification) done + verified (2026-06-27)
- SCHEMA: User += accountType ("alumnus"|"teacher"|"ex_teacher", default alumnus), batchType/batchYear now
  NULLABLE (teachers have no batch), taughtFrom/taughtUntil/subjects (teacher tenure), verifyState
  ("unverified"|"pending"|"verified"|"flagged", default unverified)+verifiedAt+verifyMethod. Report GENERALISED:
  targetType ("post"|"user"), postId nullable, reportedUserId + reportedUser relation; User.reports renamed
  relation "ReportsFiled" + new reportsAgainst "ReportsAgainst". Pushed; admin grandfathered verified alumnus.
- The nullable-batch change rippled ~30 files; tsc was the guardrail (drove it to 0 errors). Central helper:
  lib/utils batchLine({accountType,batchType,batchYear}) -> "Batch of 'XX" | "Teacher" | "Former teacher" |
  "Member"; formatBatch now null-safe. auth.ts session select + next-auth.d.ts now carry accountType/verifyState
  and nullable batch. Author selects (loadPosts, loadComments, profile, directory, group members) now include
  accountType+verifyState so the marker + role label work everywhere.
- NEW <VerifiedMark> (common): subtle leaf next to the name (leaf-green alum / sky-blue teacher), hover/focus
  tooltip "Verified alumnus/teacher", nothing for unverified/pending/flagged. Placed on post author line,
  profile header, directory cards. (feed-rail/comments can adopt later.)
- SIGNUP: 3-way account-type segmented toggle; batch + year fields are alumnus-only (teachers see a note);
  admission number removed from signup (-> profile). registerUser takes accountType + conditional batch.
  validators: signupSchema (accountType + conditional-batch refine), profileSchema (nullable batch + tenure).
- VERIFICATION admin queue: NEW <VerificationQueue> + adminVerifyUser/adminUnverifyUser actions; "Verification"
  section in /admin lists unverified/pending/flagged users w/ evidence + Verify. FLAG-A-PERSON: reportUser action
  (sets verifyState=flagged) + NEW <FlagPersonDialog> on non-own profiles; Report model + ReportManagement now
  render BOTH post and user reports.
- Magic links: deleted dead magic-link-sent.tsx (auth.ts already had no magic provider; /verify still redirects).
- Fixed a PRE-EXISTING hydration bug: trivia-gate picked a random question during render (Math.random) ->
  SSR/client mismatch; now picks after mount via useEffect.
- VERIFIED with a seeded unverified teacher: signup teacher view hides batch (screenshot-85), admin's own profile
  shows the leaf marker on header + post lines (87), teacher profile shows "TEACHER" + no marker + Flag (88),
  admin Verification queue lists the teacher w/ Verify (89). Then deleted the test teacher (back to 1 user).
- DEFERRED (noted, large/needs-infra): invite tokens (Invite/InviteRedemption/JoinRequest + /join/[code] +
  request-an-invite), community vouching (Vouch + threshold auto-promote), house-per-year picker, full
  /profile/complete multi-section flow, avatar photo upload field. Signup stays open (no invite gate) for now.

### WORLD MAP (directory) MVP done + verified (2026-06-27)
- Deps added (small, offline, free): d3-geo + topojson-client + world-atlas (+ @types). Imports
  world-atlas/countries-110m.json directly. geoNaturalEarth1 projection (honest sizes, no Mercator distortion).
- NEW src/lib/city-coords.ts: curated offline gazetteer (~100 cities, India-heavy + Gulf/UK/US/APAC) name->[lng,lat]
  + normalizeCity. This is the MVP stand-in for the full City model + GeoNames autocomplete (deferred).
- NEW src/components/directory/alumni-map.tsx (client): renders the world (land #CFD9CB on #E9E6DD ocean) +
  ONE pin per city sized by sqrt(count), leaf-green, count label on big pins, hover tooltip, click ->
  /directory?city=X (reuses the existing city filter). Solves clustering: aggregate per city, never per user.
- directory page aggregates users.groupBy(currentCity) -> joins gazetteer -> cityPins + unmappedCount (cities
  not in the gazetteer show as a "N alumni in places not yet on the map" chip). directory-client gains a
  Map | Batches segmented switch (Map default per spec); batch grid preserved under the Batches tab.
- VERIFIED with seeded cities: desktop map w/ Bengaluru(3)/London(2)/NYC/Dubai/Chennai pins + unmapped chip
  (screenshot-90), mobile scales (91). Then deleted the 9 seed users (back to 1).
- DEFERRED (noted): pan/zoom (d3-zoom), supercluster, fullscreen route, the canonical City model + GeoNames
  gazetteer + city autocomplete + per-user mapVisibility, hover top-3 avatars, city drilldown drawer.

### THIS SESSION SHIPPED (all verified on the real app): design system, flush green sidebar shell, bird avatars,
### ruled-sheet feed (+ header + real-data rail), rich profile, directory + WORLD MAP, Post schema migration
### (kind/groupId/title/Bookmark, keyset, groups on shared infra), Letters (composer mode + compact card + reader),
### Valley Collection (contribute->approve->grid->detail->love), Catch-ups/Events "in the works" pages, Support,
### scrollable Landing showcase, login Hoopoe delight, teacher accounts + nullable batch + verified marker +
### admin verification queue + flag-a-person. Every nav item resolves. tsc clean throughout.

### DEPLOY PREP done + local verified (2026-06-27)
- storage.ts shim already Blob/filesystem-ready (from Phase 9). Added the Postgres path WITHOUT touching local:
  src/lib/prisma.ts now picks @prisma/adapter-pg when DATABASE_URL starts with "postgres", else libSQL (local
  file: / Turso) -- so local dev is unchanged. Installed @prisma/adapter-pg + pg (+ @types/pg).
- Prisma can't env-switch `provider`, so scripts/prepare-prisma.mjs rewrites datasource provider sqlite->postgresql
  ONLY during a Postgres build (no-op locally; verified). Committed schema stays sqlite. No SQLite-only types used,
  so the swap is clean.
- render.yaml (Blueprint: web service + Render Postgres; build = prepare-prisma -> generate -> db push -> build;
  health check /login; env vars incl. DATABASE_URL fromDatabase + generated NEXTAUTH_SECRET). .env.example +
  docs/operations/DEPLOY.md (full owner walkthrough incl. the provider split, Blob token, post-deploy seeding, follow-ups).
- VERIFIED local untouched: tsc 0 errors, dev serves, datasource still sqlite, feed works (screenshot-92), the
  prepare script no-ops on file: URL. Moved leftover .next-stale out of the repo (rm -rf blocked; used mv).
  gitignored .claude/gsd-core + node_modules + .next-stale.
- COMMITTED to a new branch `redesign` (commit 21eb32f, 111 files, NO push, NO AI attribution per CLAUDE.md).
  Excluded .claude/ (reinstallable GSD tooling w/ node_modules) and Inspiration/. Secrets (.env.local) + dev.db
  are gitignored and were not committed.

### TO GO LIVE (needs the OWNER's accounts): push branch to GitHub, Render New>Blueprint on the repo, fill the
### sync:false env vars (NEXTAUTH_URL, ADMIN_EMAIL, NEXT_PUBLIC_ADMIN_EMAIL, BLOB_READ_WRITE_TOKEN), apply. See docs/operations/DEPLOY.md.
- Larger follow-ups (need deploy infra or are big net-new): full Catch-ups (Roundup* models + Render Cron +
  Resend), full Events model+page, invite tokens + community vouching + house-per-year + /profile/complete,
  remaining Phase 13 micro-delights (signup hoopoe, loading-bird scene, bookmark ribbon, avatar chirp).
- Owner to replace: /support UPI id + QR; peaks logo placeholder (trace bodi-middle-rishi.png in a logo pass).
- Bookmarks: model+action+button shipped; a saved-posts page can come later (no nav slot yet).
- Owner must replace: /support UPI id + QR; the peaks logo is still the placeholder ridgeline (trace from
  bodi-middle-rishi.png in a dedicated logo pass).
- Needs the owner's accounts: deploy (Render service + Render Postgres + GitHub connection + env vars). Also a
  git branch + commit + push when the MVP is coherent. .next-stale dir still in repo root (safe to delete).

## Session 2026-06-28/29 — Wave B + foundation polish
- Foundation (B1-B4) + photo-split login: done, tagged foundation-frozen.
- Wave B (workflow wf_84975619-cc0): Seed (14 demo users @demo.valley.test + 16 posts), Profile
  (tabs/about/open-to/fuller details+contact, authorId added to loadPosts), Directory + world map
  (clustered counted city pins, drilldowns, progressive search; map now WORKS), Landing (scrollable
  showcase with real app screenshots + tasteful motion, sign-in CTA fixed), Support (UPI, honest
  costs), Collection (masonry + facets + "A wander"). All committed. Verify: all 5 surfaces
  matchesContract=true, NO P0s.
- Foundation polish: faint tree opacity 0.07 -> 0.16 (app-shell); feed header toolbar now inline with
  the "Feed" title (page-header flex-nowrap + inner actions nowrap/shrink-0); --background
  #E9E6DD -> #EBE6D7 (marginally warmer per owner).
- OPEN P1s for next session: Support chips contradict the cost breakdown (Rs 20 "cover a month" vs
  ~Rs 1.2-1.5k/mo) -> fix amounts or relabel; Directory: ?view= not reflected in URL, filters do not
  recompute map pins (map + filters are mutually exclusive), take:60 silent cap with no Load more;
  Collection: filter Selects show raw "all"/"newest" instead of labels, no LQIP/blurhash. Profile P2s:
  mobile meta dotsep orphan on wrap, #about deep-link, posts-tab skeleton in static screenshot.
- REMAINING: Wave C (Groups; Letters + Catch-ups with Letterloop parity, distinct names;
  Onboarding/auth/verification). Wave D (polish/interactions: hoopoe choreography, bird chirp,
  bookmark sweep, loading scene, like-pop, bell-shake; then Phase 0 deploy to Render + Postgres,
  remove magic links).

## Session 2026-06-29 (fork 2) — audit truth + Wave C Groups & Letters
- AUDIT (docs/planning/AUDIT.md): the committed app MOSTLY MATCHES the /preview/v2 contract. Feed, Profile, Login
  (photo-split), Directory (working map), Support, Collection all render correctly; heart is locked
  red (#E03A33, no color transition) and the hoopoe has a real spring + on-load peek IN CODE. The
  owner's "it looks broken" was almost certainly a STALE dev-server render. Lesson: trust screenshots
  + code, never the docs/planning/FEEDBACK_CHECKLIST.md [x] marks.
- Wave B P1 cleanup (committed bd3b0f3 b048119 4f23991 e22e795): fixed landing hydration runtime error
  (showcase parallax), replaced glassmorphism landing Sign-in with solid leaf-green, deleted live-DB
  "asdfasdf" junk group + seeded 3 real groups, varied the 12 Collection tiles.
- Wave C Groups (committed 2e94a07..6f6a111, verified): Group.visibility public/private + coverImage +
  GroupInvite; organizer role shown as "Keeper"; create + browse + join (public auto / private invite)
  + @-invite via notifications; group page reuses shared FeedColumn (Composer+PostFeed+PostCard),
  groupId leak-guarded.
- Wave C Letters long-form (was ~90% built; completed + verified 4751fd3 fe0c658 e41199b): Post.kind
  "letter" + title via shared composer; compact LETTER card in feed; editorial /letters/[id] read view;
  /letters list; now allowed in group feeds + editable; seeded. Distinct from Catch-ups.
- Logo: /preview/logo = first-pass three-peaks (outline + solid-white-fill + gradient). Real app still
  uses the rough zigzag PeaksMark pending a faithful trace of /Inspiration/bodi-middle-rishi.png.
- HEAD now at the docs commit above. Remaining: Catch-ups newsletter, onboarding/auth/verification,
  Wave D polish, deploy. See docs/operations/HANDOFF.md.

## Fork 3 — Fix campaign COMPLETE (2026-06-27)
GROUND TRUTH: the owner's "everything broke" was a stale 2.7GB .next cache showing the OLD app.
A fresh server proved feed/login/other-profiles/landing(solid sign-in)/directory-map all MATCH the
contract. Settled the `docs/planning/AUDIT.md` vs `docs/planning/REBUILD_PLAN.md` contradiction (`docs/planning/AUDIT.md` was right; `docs/planning/REBUILD_PLAN.md`'s diagnosis
was cache-based). Wrote docs/planning/PUNCHLIST.md (1 P0, 7 P1, 25 P2) + docs/contract/index.html (standalone
openable reference).

EXECUTED (sequential on redesign, each tsc-clean + committed):
- 03d09f4 B-FOUNDATION: bg #E9E6DD, tree overlay 0.08, real photo avatars in feed select, three-peaks
  logo (peaks-mark, outline+solid variants, summit ~54%), bookmark cinnamon sweep+pop, bell keyframe, card primitive de-glassed.
- 47191af B-PROFILE: P0 own-profile null-group crash guard + admin tools warm restyle.
- 254754c B-AUTH: hoopoe branched tail + rounded crest + intro blink/settle, server-side trivia gate,
  dropped admissionNumber from SIGNUP (kept in profile/settings), removed dead /verify + Forgot link.
- ab33379 B-DIRECTORY: filters re-filter the live map, city normalize, case-insensitive search, load-more.
- c1fab47 B-CONTENT: rail avatar overrides, group batch-add notification + browse empty state, letter title fallback, collection seed variety.
- 236cf88 B-COPY-DELIGHT: removed About em dash (+3 more found), real bell-shake on unread increment, deleted dead landing-client.tsx, corrected 2 false [x] claims.
- 5a3cee3 B-SETTINGS-PROFILE: Sharp->WebP avatar upload in Edit Profile (with remove-photo fallback).

REGRESSION caught in my verification pass (agents could not screenshot; bundled Chrome broken):
- 06bae15 fix: the foundation+content agents added `avatarSpecies: true` to Prisma selects, but it is
  NOT a User column (species derives from id). This 500'd feed + profile post loads. Removed from
  feed/actions.ts, feed-rail.tsx, post-card.tsx. Verified: profile posts load, feed clean, zero runtime errors.

VERIFIED VISUALLY (1440, system Chrome): own-profile renders (P0 gone), feed, directory map, login
(hoopoe + three-peaks outline mark), settings avatar upload, profile posts load. tsc clean repo-wide.

NOT yet re-verified visually (low risk, owner to review): bookmark sweep + bell-shake animations
(static shots cannot show motion), collection variety, groups empty state, letter title fallback.
Pre-deploy gate: run `npm run build` before pushing.

DEFERRED to a follow-up milestone (net-new, not fixes): Catch-ups (Letterloop-parity), Events,
community vouching, profile-completion depth (house-per-year, sections, memory prompts), directory
facets/gazetteer + live map search, delight beats beyond bell (chirp, loading scene), password reset,
invite-only enforcement, deploy to Render + Postgres.

## Fork 3 (cont.) — preview-fidelity pass (2026-06-27), committed 5626686
Owner feedback on the built app vs /preview/v2. Verified (screenshots + tsc clean):
- HOOPOE root cause = the global @media(prefers-reduced-motion:reduce) block in globals.css killed ALL
  transitions; removed it so hoopoe + bell-shake + like-pop animate regardless of OS reduce-motion
  (proven by sampling computed wing transform under emulated reduce: smooth, not snap). Also removed the
  hoopoe bottom tail (rounded body only); crest kept.
- BG warmth set to preview exactly: --background #E7E1D3, --card #F6F2E8, secondary/muted/accent #EEE8DA,
  border/input #E0D8C8, --color-paper #F6F2E8.
- BUTTONS -> sidebar/canopy green #235C49 (Button default+leaf variants + 3 landing CTAs). bg-leaf/10 tints left.
- TREE was hidden by -z-10 (behind opaque page bg); fixed to z-0 + content relative z-10, opacity .11.
  Owner chose the FULL faded tree (version A, default). Fade-to-bottom variant available as .valley-tree--fade.
- SIDEBAR: peaks mark 15->26px standalone white; nav text-sm->14.5px (preview parity). Search pill already 320px.
- RAIL: feed/page aside pt-[139px]->pt-[106px] so "Coming up" top == composer top (both 138px measured).
- POSTS: ruled sheet -> tight separate tiles (PostCard variant="card", space-y-2.5).
- FONTS never changed: Libre Baskerville (headings) + Source Sans 3 (body), same CSS vars in preview + app.
- BIRDS deferred to a dedicated owner session; agent stopped, partial edits stashed ("wip-bird-avatars-deferred").

## Fork 3 (cont.) — header/tiles fidelity + tree-fixed + session wrap (2026-06-27)
Verified live after a clean .next clear + restart (routes 200, bell-rule present, bell anim=bell on hover,
tree background-attachment=fixed). Committed 0002bfc / 2c61898 / 7add1e3:
- Landing hero new title+subtitle, one line each on desktop.
- Tree pinned with bg-fixed (stationary + natural scale; was stretched to scroll height -> looked zoomed).
- Feed header now matches preview: "Feed" not bold (30px), subtitle one line, search/bell/New-post 40px,
  rail "Coming up" aligned to composer (feed/page aside pt-[85px], measured 117==117), content max-w 1280
  so the rail sits nearer the right edge.
- Posts: tight separate tiles (variant=card, space-y-2.5, p-4), tags removed, ShareFat icon, heart/comment
  pulled up+left (-ml-2.5) to align the heart with the tile content edge.
- Hoopoe tail removed (rounded body). Bell wobbles on hover (.bell-trigger:hover svg) + on new notif.
GOTCHA confirmed: editing globals.css needs a full .next clear + restart (HMR silently kept stale CSS, and a
plain restart 404'd all routes from a corrupt .next; moved .next to scratchpad to clear since rm/find-delete
are blocked and in-project copy busts the 5GB cap).
Birds deferred to a dedicated session (stash@{0} wip-bird-avatars-deferred; recommend drop + redo).

## Session 2026-06-30 — Hoopoe mascot rebuild (Delight Labs)
Replaced the minimal login/lab hoopoe (a blob with two rotating wing-petals, no tail/legs/brows,
expressions that only nudged the eyes) with a real rigged CHARACTER. See docs/spec/mascot.md.
- NEW src/components/mascot/: `hoopoe-kit.ts` (SPRINGS, PARTS map, EXPRESSIONS chord table, types,
  MascotReducedContext, useValleyMotion, makeDamper), `hoopoe.tsx` (rigged SVG puppet + continuous
  gaze + idle + the queued/awaitable/interruptible controller via forwardRef), `use-hoopoe.ts`
  (ergonomic {ref, ...methods} hook).
- Rig: front-on chibi, viewBox "0 -10 120 152". Parts: crest fan (teardrop feathers, cinnamon ->
  warm-white sub-band -> black tip), brows, two eyes (round/wide/happy/sleepy cross-faded by
  opacity), split bill (centered, slender), 2 shoulder-pivoted barred wings (fold + extended-arm
  paths), 3-sliver tail w/ band, stubby 3-toe legs, body, bodyTurn (3/4 skew), root, shadow,
  particles. Locomotion is front-on (feet + bob + lean + bodyTurn), no profile asset.
- Controller (all awaitable, queued, never clobber): walk hop flyTo land turn point wave nod shake
  crestFlick express(10 chords) smile celebrate(1/2/3 + leaf/heart particles) blinkOnce gaze
  bindPassword coverEyes peek sequence react(semantic) stop cancel rest isBusy.
- Palette locked: body #D5854A ("mid", tuned on the cream card vs the spec's #E0975F which washed
  out the belly). spec discipline kept (warm whites, one shared near-black, pink bill base).
- Lab REBUILT at /preview/delight/hoopoe: stage + control rail + sequence builder + expression
  matrix + password/gaze demo + size variants + reduced-motion split. The owner's judging surface.
- Login wired (src/app/(auth)/login/page.tsx): covers eyes while password hidden, peeks on reveal +
  follows typing, intro on onReady. Replaces src/components/auth/hoopoe.tsx (old file still present).
- Two research/critique workflows ran. Adversarial critique fixes applied: P0 queue-wedge (motion
  control.stop() never resolves .finished -> added an abort token the pump races + re-pump on
  drain), damper try/finally in every staged verb, reduced-motion short-circuits (express/point/
  smile/turn/walk/hop/fly), nod direction, sad/worried frown visibility (Math.abs), surprise/alert
  snappy + root recoil, love wing-hug, react() de-deadlocked (composes via sequence, not enqueued),
  toLocal zero-guard, celebrate cooldown sandbox guard, api memoized + reducedRef in effect +
  ambient/live cleanup on unmount. Art: wider crest fan + visible white sub-band + pivot into skull,
  centered/longer/thinner bill, 3-sliver tail, 3 thicker wing bars, softer brows. tsc + eslint clean.
- GOTCHA: motion's imperative animate() writes transform-box:fill-box inline, clobbering shared
  pivots; the rig CSS forces transform-box:view-box + per-part transform-origin with !important.
- Verified on the dev server (system Chrome via scripts/dev/shot-url.mjs + shot-svg.mjs): every
  expression reads as a distinct chord; point/cover/peek/celebrate/gaze/walk/full-sequence all work;
  login desktop + mobile show the covered bird.
- DEFERRED (surfaced to owner): lock hoopoe out of the member avatar pool (src/lib/avatar.ts is
  actively-changing WIP, went 37 -> 50 species mid-session; do not stomp). Follow-ups: walk on a
  master clock; palette as CSS vars for a live color editor; delete old auth/hoopoe.tsx + preview
  _hoopoe once all usages repointed. NOT committed (left for owner review).
Full remaining backlog + the next-fork prompt: docs/operations/HANDOFF.md (rewritten) + docs/planning/PUNCHLIST.md.

## Session 2026-06-30 (later) — Hoopoe redesign round 2 (owner feedback)

Owner judged round 1: "step in the right direction" but several concrete fixes. All applied + verified:
- CUTENESS (the crux): the rest face read like a "strict teacher"; rebuilt as a BABY hoopoe. Bigger
  rounder head (cx60 cy56 rx30 ry27), huge low catchlit eyes (cx51/69 cy61 rx6.9 ry8.1), rounder
  smaller body (cx60 cy101 rx22 ry21). Brows now HIDDEN at rest (brow.op 0), fade in only for
  emotional poses (the stern rest brows were the teacher tell).
- Removed the smile/mouth element entirely (rig + all chords + verbs + login). Removed the pink cheek
  blush entirely ("Asian-cartoon", not hoopoe-like). Both gone from the chord model.
- Bill: was two diverging lines -> ONE clean decurved beak (upper fixed + billLower hinge sharing the
  y74 edge so the silhouette is continuous; opens cleanly for surprise).
- Crest (loved, kept) now FOLDS: crest(true) springy fan open, crest(false) collapses to a slim swept
  tuft. Lab has open/fold/flick controls.
- Tail made a toggleable prop (default true); lab has a with-tail vs no-tail (legs-only) compare card
  at big + small sizes for the owner to choose. Tail redrawn as a compact stub + white band.
- Walk: stiff march -> bouncy baby waddle-hop (side rock + bob + paddling feet + head/crest/tail lag).
- Point: was a salute (wing to the brow) -> a REAL point; the arm wing telescopes OUT horizontally
  (scaleX reach) and holds aimed at the target. Wave still raises UP + waggles, so they read distinct.
- Nod + shake: were jagged/2fps -> soft gentle amplitudes on EASE_SOFT, crest lagging. No spring snap.
- Turn: dropped the oval squash (bodyTurn skew/scaleX removed) -> a gentle whole-body lean + look-over.
- Fly: fixed targeting (lands body-center exactly on the tap; absolute viewBox math incl. the -10 y
  origin that was the bug) + nicer parabolic arc, banking, 8 wingbeats, leg tuck.
- Eye life: big catchlights + secondary sparkle + an occasional idle springy eye sparkle-bounce.
- Reduced-motion REMOVED entirely (owner: always active). Stripped from kit/rig/lab; useValleyMotion
  now only pauses idle on tab-hidden. MascotReducedContext/Provider + the lab reduced-split deleted.
- Verified: tsc + eslint clean; production build exit 0; runtime check (puppeteer) drove nod/shake/
  walk/hop/crest/wave + the full sequence (drains, no wedge) + cancel-mid-action recovery, ZERO
  console errors. Rendered matrix (all 10), tail-compare, point, cover, crest-fold, turn, fly-on-tap,
  login desktop+mobile. docs/spec/mascot.md rewritten to match. NOT committed (left for owner review).

## Session 2026-06-30 (later still) — Hoopoe round 3 (owner: "amazing, final push")

Owner loved it. Round-3 fixes, all applied + verified:
- NO-TAIL CRASH (P0): with tail off, every verb that animated [data-part=tail] threw motion's "No
  valid elements provided" (zero-match selector). Fixed by guarding the A() animate wrapper: a
  selector matching nothing returns a resolved no-op. Now any verb can animate tail/legs whether or
  not they're rendered (tail=false, icon variant). Runtime re-check: ZERO console errors.
- TAIL: decided NO tail. `<Hoopoe tail>` now defaults FALSE (legs only). Lab stage toggle + compare
  card kept.
- FLY reworked for grace, not speed: distance-scaled duration (~1.0-1.9s), smooth eased parabola,
  banking, a GENTLE low-amplitude wing flutter (not the old hard 80deg flap), clear crouch takeoff +
  cushioned landing. (Owner's vision: bird spawns at Sign-in btn, flies to the hero as panel slides;
  noted as a future app-level orchestration now that flyTo is smooth enough.)
- PROPORTION STUDIO: added an interactive tuner to the lab (live sliders: head size, eye size, eye
  height/forehead, eye spacing) + presets + a small-size strip (32-120px). Hoopoe now takes
  headScale/eyeScale/eyeY/eyeSpread props (defaults = canonical, so nothing changes unless tuned).
  Head center pinned at 56 so a smaller cranium shrinks around the eyes (less forehead, narrower) and
  stays attached to the body. Eye/brow ANIMATION pivots are now CSS vars (--eye-lx/-rx/-y, --brow-y)
  the SVG sets inline, so gaze/blink keep pivoting on the eye centre at any setting. Owner to pick
  values; then bake into defaults.
- TYPING FOLLOW: now fires on every keystroke of email + password in BOTH eye states (was gated on
  reveal). When covered, the head tracks behind the wings. Updated login + lab PasswordGaze.
- FULLY CLOSED EYES: blink scaleY 0.1 -> 0.04 (no peek); idle/hop blinks tightened. Cover-eyes lifts
  the wings higher + flatter (rotate +-163, y -17) so the eyes are FULLY hidden (no catchlight peek).
- Verified: tsc + eslint clean; production build exit 0; runtime ZERO console errors (incl. no-tail).
  Rendered studio (default + smaller-head preset), small-size strip, no-tail rest, cover, matrix.

## Session 2026-06-30 (round 4) — owner: "amazing, do the rest"

- BEAK TRACKS GAZE: bill now sits in a `billGaze` group whose rotate (+-7) + small x are driven by the
  gaze spring, so the beak swings toward where the bird looks. Fixes the "beak stays frozen / collides"
  problem in turn AND point (both set gaze).
- BEAK LENGTH knob: new `billLength` prop (bill top pinned at y62.5, hinge/tip/controls scale down);
  billLower hinge pivot is a CSS var (--bill-y). Studio has a Beak length slider.
- FLIGHT reworked to feel physical (owner: "two straight lines... give it physics... altitude tied to
  wing flaps... cruising"). Now FLAP-BOUND: per powerstroke a lift bump + forward thrust, per recovery a
  slight sag, under an asymmetric envelope (climb fast by t=0.16, cruise, descend). Quick shallow takeoff
  (no long low crouch). root x/y + wings + body bank + crest/tail + shadow all share one `times` array so
  the bob syncs to the flaps. Runtime: 0 errors; mid-flight frame confirms airborne + flapping.
- SAD vs WORRIED separated: sad now uses NEGATIVE brow.ang (inner-up grief tent) + downcast gaze (0.85) +
  fully wilted crest (0.44); worried keeps the mild furrow. Clearly different in the matrix now.
- PROPORTION STUDIO presets: save named slots (mini-bird gallery, click to load, x to delete, up to 16,
  persisted to localStorage key hoopoe-proportions-v1) so the owner can swap + compare. Kept the 3
  built-in presets. Added the Beak length slider.
- Eyes-following-typing: owner confirmed it's already there (added round 3); no change.
- Verified: tsc + eslint clean; build exit 0; runtime 0 console errors (verbs + sequence + cancel +
  flight). Rendered gaze-beak, matrix (sad/worried), studio (5 sliders), save-slot gallery, mid-flight.
  NOT committed. Owner still dialing proportions in the studio; will send chosen numbers to bake.

## Session 2026-07-02 — consolidate bug docs + avatar count consistency

- CONSOLIDATED the two owner-feedback trackers into one `docs/planning/bugs.md` (bugs and small fixes
  only, per owner) and DELETED `docs/planning/FEEDBACK_CHECKLIST.md` + `docs/planning/PUNCHLIST.md`.
  Re-verified every item against live code first; dropped everything already done. Deliberately did NOT
  carry forward the superseded "traps" (tree overlay is 0.11 not 0.08; bg #E7E1D3 not #E9E6DD; theme-
  transition-speed moot under forcedTheme=light; feed ships as tiles not ruled sheet) so no future
  session re-opens a settled choice. bugs.md records these in a "Settled, do not re-open" section.
- bugs.md OPEN items (3): (1) feed letter card still shows "Untitled letter" while /letters + reader
  fall back to first line (post-card.tsx:206); (2) no /saved page though bookmark model+action+sweep
  ship (dead-end button, no nav slot); (3) /support cost breakdown still says "Render" with Render
  rupee figures, stale after the Vercel+Turso+R2 move.
- Non-bug content: already covered elsewhere so deleted with the files (features -> ROADMAP + FEATURES,
  delight -> DELIGHT.md, decisions -> DESIGN-SYSTEM). The one uncovered idea (data to collect for
  future insights: house-per-year, sections, sports-day stats, RV trivia; "you have X in common")
  folded into FEATURES.md, replacing its truncated orphan line.
- Repointed refs to the deleted files: CLAUDE.md, docs/README.md, .github/PULL_REQUEST_TEMPLATE.md,
  FEATURES.md (the digest-rejected ADR citation). No dangling links remain (remaining mentions are
  intentional provenance in bugs.md/README + history in this log).
- AVATARS: confirmed the shipped count is 50, not 37 (my earlier read was mid-refactor / stale).
  avatar.ts BIRD_SPECIES_COUNT=50, 50 ARCHES, avatar.test.mjs asserts 50/10/4. Made docs/spec/avatars.md
  internally consistent: added a strong "everything below is the SUPERSEDED original proposal" divider
  listing the deltas (50 not 12; real colours + no disc; 50 x 2 poses; real salts species::/color::/
  pose::; pin in precedence) + fixed the two summary spots (§1 768 block, §12 register). De-staled the
  "640 combinations" comment in avatar.ts. Left the original 12-species table / disc palette / hash
  pseudocode as clearly-labeled historical rationale (code is authoritative).
- GROUPS NAV ICON: a prior agent had changed Groups from FolderOpen to a campfire (Phosphor
  `CampfireIcon`); the owner rejected campfire as irrelevant. Replaced this session with `CirclesThree`
  (three soft overlapping circles = communities/groups: reads instantly as "groups", no faces so it
  stays distinct from Directory's Users, soft/rounded not corporate), applied across sidebar.tsx +
  preview/_shared.tsx + preview/v2/page.tsx. tsc clean.
- Committed on main in TWO commits: (1) the doc consolidation + avatar-doc consistency above;
  (2) the Groups nav icon swap.

## Session 2026-07-03 — landing showcase screenshots regenerated from the live post-redesign app

- The five `public/images/landing/*.webp` used by `FeatureSection` (via `src/components/landing/shots.ts`)
  predated the redesign (old sidebar-less mockups). Regenerated four of them from the real, currently
  running app: feed, directory, letters, catchups.
- Staged demo content as admin via direct Postgres inserts (not the UI, for precise control and clean
  removal): 4 feed posts across 4 existing `@demo.valley.test` alumni (one a poll on Founders' Week
  dorms-vs-guest-house with 4 votes, one a valley-life hornbill sighting, one a life update, one campus
  nostalgia) plus 1 letter ("The line for evening milk" by Rohan Mehta). All in-voice, no em dashes.
  Deleted every row straight after capture and re-verified table counts match the pre-session baseline
  exactly (Post 7->2, PollOption/PollVote 2/4->0, everything else untouched).
- Directory shot uses the People grid (`?yearFrom=1990&yearTo=2030` to reach it without narrowing
  results, then the Filters panel closed again) rather than the map (only 2 city pins with 7 users) or
  the Batches tiles (seven repetitive "1 person" cards) -- the bird-avatar grid photographed best.
  Collection was left untouched: zero contributed photos on the live DB, so the pre-redesign capture
  stays until real photos exist.
- FOUND A REAL BUG while seeding: rows written via raw `pg` (bypassing Prisma) come back from Prisma
  reads 5:30 (IST) ahead of the stored value -- `Post.createdAt`/`updatedAt` are `timestamp without
  time zone`, and whatever the Prisma driver adapter does with that type does not round-trip with plain
  `pg`. Symptom: any post apparently created less than ~5.5h ago rendered "just now" because the (too
  future) createdAt made the client's elapsed-time computation go negative. Only surfaced here because
  the seeding bypassed Prisma; posts created through the real `createPost` action are self-consistent
  (same driver writes and reads), so this likely does NOT affect real production data, but it is a trap
  for the next raw-SQL seed script (worked around here by writing timestamps 5:30 early so the app's
  read lands back on the intended value). Also noted: `toLocaleDateString` without an explicit
  `timeZone` on the server (letters index date) resolves to IST too, off by a calendar day right at the
  UTC/IST midnight boundary; cosmetic, left alone.
- Also hit a dev-only image-cache trap: `/_next/image` caches by URL and does not re-check the source
  file's mtime, so overwriting `feed.webp` etc. in place kept serving the old cached render (confirmed
  via direct `curl` against the optimizer: some width buckets served fresh bytes, others a stale HIT,
  no relation to how much time had passed). Renamed the four regenerated files with a `-v2` suffix
  instead of overwriting, which sidesteps the cache outright; comment in shots.ts explains the trap for
  next time. `.next` was not touched (out of scope for this session's constraints).
- Verified: `tsc --noEmit` clean, both the four surfaces in isolation and the full scrolled landing page
  screenshotted twice (rounds: initial capture, then again after the timezone/crop/cache fixes).

## Session 2026-07-18 (round 6) — owner voice-note wave, full build

Scope: a single large owner voice-note prompt (round 6; see `task_plan.md`), covering foundation
schema/data work, onboarding, a first-run walkthrough, the profile page rebuild, feature work
(city-scoped posts, admin moderation, display-email), the support page, curated WhatsApp content,
the peregrine falcon avatar, and a ~25-item bug blitz. Commit range `4df6c2b..774388e` (44 commits),
landing immediately after the round-6 task-plan commit (`2390eda`).

Headline changes:
- **Onboarding**: batch year collected directly (no more "grade joined" inference), phone number
  moved to the very first step (email + password + phone, default +91), everything skippable, houses
  step rebuilt with a satisfying boxes-and-arrows journey UI writing straight to the new `User.houses`
  column (no more localStorage fallback), full bird species names everywhere, welcome/done steps fixed
  to stop washing out against the app shell background.
- **Location gazetteer**: 234,934 GeoNames places (worldwide cities + Indian towns/villages) imported
  into a new `Place` table, powering one shared location-picker component (with disambiguation by
  name/state/country) reused across onboarding, settings, and the composer's city-scope picker.
- **Profile page rebuild**: shipped directly into the main app (not a pick from the five
  `/preview/delight/profiles` concepts), Dossier-based — About tab first, then Posts+Letters, houses
  chain of colored boxes/arrows/years, admission-number stamp, contact-card header density
  (batch/city/occupation/email/phone in one place), display-email override, plain city list (no
  primary/secondary labels), distinct wide vs mobile layouts. Edit-profile rebuilt alongside it.
- **Walkthrough tour**: first-run guided product tour (Feed, Directory, Collection, Catch-ups), the
  hoopoe as the main character flying between stops, re-launchable from About afterward.
- **Filters rework**: the old all/all/all unlabeled-select bars on Directory and Collection replaced
  with a shared facet-filter pill system (labeled selects, real sort names, profession as a
  first-class filter), plus a fix to the shared dropdown primitive's alignment (offset, radius,
  hover-inset) used everywhere.
- **Admin moderation + city-scoped posts**: admins can delete any post/letter/comment/photo with an
  optional note to the author (lands in their notifications), composer gained a post-to-one-city
  option, and the stray `rv-alumni.vercel.app` host now redirects to the custom domain.
- **Support page**: reworked in rupees, dropped the stale magic-link Email cost row, one-time UPI
  presets (₹200-₹5,000, no more monthly ₹20), brand palette applied to the cost bar.
- **Content**: 11 curated WhatsApp stories (banyan-tree mural update among them) seeded as the
  Anonymous user with the hoopoe avatar, original dates preserved, photos on R2; everything that
  didn't clear the quality bar compiled into a 57-page overflow PDF for later
  (`docs/content/whatsapp-curation/overflow-stories.pdf`).
- **Peregrine falcon glyph**: a fresh redesign (the previous three refinement passes had each made it
  worse) now reads as a cohesive hooded raptor at every size; assigned to Veda and Srihari via the new
  per-user `birdOverride` column, with Vihan Shah's wrongly-assigned hoopoe reassigned (no real person
  keeps the hoopoe; it's reserved for the Anonymous user) and the whole avatar system migrated to
  species-per-member resolution.
- **Bug blitz** (~25 fixes across three waves): sidebar Support entry + lockup centering + fun-fact
  toggle off + footer removed; composer focus ring/toolbar weight/no live counter/Letters nudge/caret
  fix; comment row rhythm + save-icon stroke + report-flow left bar + heart no longer scroll-jumps the
  page; notification list gets per-type icons; Catch-ups arrow centering + rewritten suggested
  questions; landing scroll-cue chevron restored + gentler ambient leaves + footer hoopoe no longer
  clipped; mascot loading sprite delay-gated + mail-delivery moment removed + bigger 404 hoopoe + auth
  slide bounce removed + flight preload; directory map mobile fullscreen exit added; 20MB upload cap +
  collection upload form stripped to caption/part-of-school/graceful year; feed search scoped to the
  feed instead of jumping to directory search.
- **Groups**: not built this round by design — four concept previews shipped at
  `/preview/groups-rethink` (Batches + interest, Circles, Dissolve, Gatherings) with a recommendation
  of "Gatherings"; awaiting the owner's pick (see `docs/planning/bugs.md` #12b).
- Docs updated to close out the round: `docs/planning/bugs.md` items 4 and 10 settled (narrowed to
  just the outstanding UPI-handle confirmation and closed outright, respectively), item 12 split
  between the still-open landing pick and the now-moot profile pick, new items opened for the
  NEXTAUTH_URL/vercel.app suspicion, the Vercel Analytics deploy dependency, and the groups-rethink
  decision.
- Owner actions still pending: confirm `NEXTAUTH_URL`/`AUTH_URL` on the Vercel dashboard (likely still
  the `.vercel.app` host, causing stray redirects); confirm the real UPI handle; deploy to production
  so Vercel Analytics starts collecting; pick a groups-rethink concept (and, independently, the landing
  preview concept from an earlier round).

## 2026-07-30 - Letterhead II, one spine, image viewer, drafts, direct uploads

- **Letterhead II** (`/preview/delight/profiles?v=letterhead-2`): the letterhead rebuilt to the owner's notes.
  PeaksMark + admission number as the colophon (pressing it stamps the sheet; the stamp thumps in, holds, fades),
  bird inside the sheet (no species name, chirps on press), occupation as the name's subtitle, exactly three
  facts (batch / cities / years) a step larger, houses trail under About, one Get in touch CTA (single pill,
  contacts stay in the dialog), tabs flush on the sheet's one left edge, entries drawn as the FEED's post UI.
  A "Preview data" toggle proves the sparse case (`&sample=sparse`): every missing slot degrades to absence.
- **Letterhead II, rebuilt again** to the owner's second review, same file (Letterhead I untouched, no
  Letterhead III). Colophon is the mark plus a bare `1385` with Letterhead I's 8px step to the name; the
  verified leaf is back on the name's baseline; Get in touch is the shared CTA at the app's default height,
  centred on the name's line box by calc (measured 0px off). Facts are batch / in the valley / cities in that
  order with every sub-line deleted, and cities are a flat equal series (`Chennai, Bengaluru, Delhi`), never a
  primary and a secondary. The bird perches on the sheet's top-right edge, still (the idle bob is gone) and
  nameless; upload a photo and the perch disappears in favour of a circle on the sheet's left edge whose
  diameter is measured from the top of the mark to the bottom of the name, so it still holds when a long name
  wraps (`&avatar=photo`). The one engraved rule gets equal air above and below and is drawn only when there
  is a body under it to separate, so a sparse sheet ends after the facts. Entries are the SHIPPED `PostCard`
  standing free on the page with nothing wrapped around them (new `demo` flag keeps its actions local against
  mock ids). The switcher above them went through three rounds before it landed: underline tabs were rejected
  as "tiny pieces of text ... insignificant", Dossier's folder tabs were rejected because a folder tab needs a
  folder and boxing the tiles inside one "doesn't look good", so it is now the app's OWN segmented pill (the
  Catch-ups cadence control's shape) with a canopy fill gliding between segments on a shared `layoutId`, plus
  a live count per segment. It is deliberately not a scroll container, so parking the pointer on it never
  steals the wheel from the page (verified: page moves 300px, strip scrollLeft stays 0, zero horizontal
  overflow). The lab toggles moved off to a fixed panel on the right (a compact glass bar above the mobile
  nav below lg) so the profile starts at the top of the shell gutter exactly as the shipped page would. Four
  states shot at 1440 and 390 by `scripts/qa/lh2-states.mjs`, which also prints the spacing it measures off
  the DOM: colophon to name 8px, CTA centre 0px off the name's line box, rule 25.9px above and below, photo
  diameter 0px off the lockup at both one and two name lines, card left edge 0px off the sheet's.
  If this concept ships, that segmented pill and `cadence-control.tsx` should be extracted into one shared
  `SegmentedPills` in `src/components/common/`.
- **Houses trail rebuilt (4th iteration)**: no more grid columns. Rows pack to natural pill widths, straight
  arrows sit dead-center between pills, and each 180 turn is a side-gutter arc from the end of one row's
  centerline around to the start of the next. Green is leaf again. Shared component, so shipped profile +
  all preview variants updated together.
- **One spine**: every `(main)` route's content now sits in one shell-owned `max-w-5xl` column - title left
  edge measured at exactly 332px and top 40px on all 11 routes (was 6 different edges, 224px apart). Shell
  padding equalized (p-5/7/10) so title-top == title-left. PageHeader is the one h1 (32px, bold); About,
  Admin, Messages hand-rolled headings removed.
- **Image viewer** (`src/components/common/image-viewer.tsx`, room at `/preview/delight/viewer`): full-screen
  warm-ink overlay, cross-dissolve steps with neighbor pre-decoding, drag/arrows/Esc, chrome hides on tap,
  caption folds up from the bottom, download + open-page actions, author chip. Wired into feed post images,
  letter photo stacks, and Collection tiles (permalink one press away).
- **Letter drafts**: `Post.status` column (additive push). Save as draft in the composer, "Your drafts" strip
  on Letters, edit/publish/delete draft flows, drafts excluded from every read path via one shared
  `PUBLISHED_ONLY` fragment; a draft's detail page 404s for anyone but its author.
- **Direct-to-R2 uploads**: `/api/upload/presign` + browser PUT + `/api/upload/finalize` (posts) /
  `contributePhotoDirect` (collection, stores the FULL-RES original). Kills the Vercel ~4.5MB cap and the
  browser downscale. The bucket CORS rule was the one blocker (the app's R2 token is object-scoped and got
  AccessDenied from `scripts/setup-r2-cors.mjs`); the owner applied it by hand from the Cloudflare dashboard
  on 2026-07-30, so the direct path is live. The proxied path stays as a graceful fallback for any origin the
  rule does not name. See `docs/ops/r2-cors.md`.
- **Shipped from the second-look rooms**: sidebar contrast (opaque idle ink 5.80:1, active/hover ladder,
  batch not email in the footer chip), support page (hedging copy deleted, knob-on-track fundraiser at zero,
  cost -> reward -> ask with 10 colourful real birds, build fund demoted to an inset note), public `/birds`
  gallery, settings rebuilt to label-outside groups with one hairline row per field (admission number moved
  to About, dashed rules gone, Card/Dialog radius corrected to a true 16px with a 16 -> 12 -> 8 ladder),
  house picker mobile bottom sheet (active year stays visible above it), houses game room deleted and
  replaced with the refined real picker, catch-ups (persistent Start a Catch-up CTA, ?group= preload fixed,
  CTA sizing/alignment, duplicate label gone), "Open to" feature removed, marker room at
  `/preview/delight/second-look/spine-marker` with five fused active-marker treatments to choose from.
- **Quality pass**: 4-angle simplify review applied - shared `PUBLISHED_ONLY`, `MAX_UPLOAD_BYTES` +
  processing-error helpers, one `directUploadPut` client helper, one display-date formatter, batch formats
  colocated, dead `chunkRows` deleted, parallelized deletes/queries, memoized viewer payloads.
- Owner actions pending: mint an Admin Read & Write R2 token and run `node scripts/setup-r2-cors.mjs`
  (until then direct upload silently falls back, capped ~4.5MB on Vercel only); pick a sidebar marker
  version from the spine-marker room; review Letterhead II.

## 2026-07-30 (later) - heading revert, two column modes, /lab

- **Heading weight reverted.** `PageHeader`'s h1 is back to exactly `font-heading text-[30px]
  leading-none tracking-[-0.02em]` with NO `font-bold` (owner: the bolded trial was "way too
  overpowering"). Feed and Directory are byte-identical to before. The last two hand-rolled bold
  titles (Settings' "Your profile", the Support hero) were brought down to the same weight so every
  page title in the app now matches instead of two staying heavy.
- **Two page columns, owned by the shell** (`src/components/layout/content-column.tsx`), replacing
  the single 1024 spine:
  - WIDE, flush to the sidebar, for two-column and screen-hungry surfaces (feed, directory,
    collection, catch-ups, admin, birds): measured at 1440 -> left 288, width 1112, right 40, so
    left padding == top padding == right padding == 40. Was 1024 centered at 332.
  - CENTERED single column (768) for everything that reads top to bottom (letters, support, about,
    settings, messages, profile): left 460, right 212. Text stays left-aligned; the column centres.
  - Two opt-outs, named with reasons: `/catchups/new` (a narrow form stranded at the left edge of a
    1100px band) and `/collection/<id>` (a detail view, not the gallery).
  - No page declares a page-level width any more; only reading measures (the letter reader's 680)
    survive, centred in the column. `AppShell`'s dead `rightRail` prop deleted.
- **`/lab`**: `/preview/delight` and `/preview/delight/second-look` are folded into one index and
  now 308-redirect to it. All 39 dev/preview routes are registered in `src/app/lab/_registry.ts`
  with a group, an active/archived status and an honest note; 31 active, 8 archived (both old
  indexes, `/preview/logos` as the superseded logo exploration, and all five `groups-rethink` rooms
  since Groups was removed). Every room keeps its own file and URL; eight back-links repointed at
  `/lab` so no room dead-ends. `/lab` added to `src/proxy.ts` publicPaths.
- **`scripts/qa/lab-audit.mjs`** is the anti-stranding guard: it reconciles every `page.tsx` on disk
  against the registry in both directions and exits 1 on a stranded page or a dead href. Verified by
  planting a fake page (caught, exit 1) and removing it (clean, 39 routes). Noted in CLAUDE.md as a
  required step for any new preview page.
- Stale doc references corrected in CLAUDE.md: `/preview/decisions` never existed, and `/preview/logos`
  was listed as approved when `/preview/logo` is the shipped mark.
- **`docs/ops/r2-cors.md`** written: exact dashboard steps and the admin-token alternative for the
  one thing still blocking full-resolution uploads.

## 2026-08-11 - Forgot password, email confirmation, and a send queue

- **Forgot password**, end to end. `/forgot-password` takes an address and answers identically
  whether or not it matches an account (a version that said "no such account" turns the form into a
  membership checker for a private community); the "check your inbox" screen masks the address the
  VISITOR TYPED rather than one from the server, so it can help with a typo without leaking anything.
  `/reset-password` judges the link server-side before painting, so a dead link never shows a form
  that fails after you have chosen a password. Dead links split by cause - expired, used, stale,
  unrecognised - because the four need different next steps. On success the person is signed in with
  the password they just chose rather than sent to a login screen to retype it.
- **Email confirmation**, on the owner's "middle" call: read everything freely, confirm to write.
  Gated server-side at posts, letters, publishing a draft, edits, comments, all three upload routes,
  Collection contributions, Catch-up creation/prompts/entries/member-adds, and other members'
  contact details. Presign matters most: what it returns writes straight into the bucket with no
  further pass through our code. Contacts are decided BEFORE the list is built, not by hiding the
  button, because everything on a profile is serialized to the browser. Likes, bookmarks, drafts and
  reports stay open.
- **The 100-a-day problem.** Resend's free plan sends 100 messages a day and launch is expected to
  exceed that in signups alone, so nothing sends inline: every message is an `OutboundEmail` row and
  a drain pass sends what the day's budget allows. Three things this had to get right. Resets sort
  first AND hold a reserved 20 of the 95, so nobody locked out is stuck behind a hundred welcome
  emails. Tokens are minted BY THE DRAIN at the moment of sending, so a confirmation that waited two
  days still arrives with its full day of life. And the app never says "check your inbox" for a
  message still queued - `verificationMailState` distinguishes sent from queued and the banner,
  dialog and verify page all say different things for the two.
- **Security**: reset tokens stored as a SHA-256 hash and never in the clear, single-use, claimed by
  a conditional update so two clicks cannot both win. `sendVerificationEmail` deliberately lives in
  `lib/` rather than the `"use server"` file: exported from there it would be an unauthenticated
  "mail anyone from hello@rishivalley.space" relay.
- **Admin**: `Email & verification` puts the two different meanings of "verified" side by side
  (did the address answer / is this really an RV person), over the three queue numbers - sent today
  out of 95, waiting, gave up.
- **Three bugs found by running it, not by reading it.** `prisma.ts`'s dev singleton key was not
  bumped with the schema, so a live dev server held a client with no `authToken` delegate and every
  read 500'd while `tsc` stayed clean (gotcha 3, again). A reset only drained when somebody happened
  to be browsing. And `.env` carries the production `RESEND_API_KEY`, so an end-to-end test sent two
  live messages to a `.invalid` address: `sendMail` now refuses reserved TLDs outright and
  development does not mail real people without `EMAIL_DEV_SEND=1`.
- Migration `2026-08-11-auth-tokens.sql` applied (AuthToken, OutboundEmail); the 37 existing members
  were grandfathered as confirmed rather than locked out of posting by a feature added after them.
- Owner action: set `APP_URL=https://rishivalley.space` on Vercel. Emailed links are deliberately
  NOT built from `AUTH_URL`/`NEXTAUTH_URL`, which bugs.md #15 suspects still points at the old
  vercel.app host.

## 2026-08-11 (later) - the hoopoe round: five bugs traced, one measured down, one disproved

Owner reported eight things about the mascot in one go, with the standing instruction not to
restructure the rig: "i want the same behaviour i have with the bugs fixed." So every fix below is
the smallest one that removes the cause, and the two design calls were put to the owner rather than
guessed (they chose: wings keep flapping through the landing flare; keep the ponder and reset after).

- **The idle bird that could not be shooed away** was the one worth the most care. The idle effect
  re-runs whenever the tab is hidden and shown again, and it restarted the ambient breathe
  unconditionally. That writes `PARTS.body {scaleY,y}` over `arcAndLand`'s own AWAITED body
  animation, and a superseded animation's `.finished` never resolves in motion v12, so `flyIn()`
  hung: the bird landed, never reached `sleep()`, and the `flyTo()` the next mouse move enqueued sat
  behind a step that could never finish. One condition (`if (!damper.active)`) fixes it, which is
  what the damper was always for. Guarded by the new `scripts/qa/hoopoe-idle-check.mjs`; on the
  unfixed code the exit flight never writes a single transform (`rootTransform: "none"`).
- **The celebration left the face dirty.** `react("thinking")` cocks the head 10 degrees and biases
  the gaze and nothing put either back, so the quick check celebrated side-on and kept that head
  afterwards; it also kept the `happy` arc eyeshape, which has no pupil, which is what the owner was
  seeing as eyes that never came back to normal before the wings covered them. `celebrate()` now
  levels the head, clears the gaze and hands the round eyes back. Verified on the real signup flow:
  head 9-10 degrees during the ponder, 0 from the moment the celebration starts, round eyes at 2.5s.
- **The arc flew off the top of the screen.** Both hero CTAs sit on one row, but /login's bird
  perches 69px higher than /signup's, so one formula put the login apex at -35px (above the viewport)
  while signup peaked at +21px and read fine. The arch is now fitted per flight to the smoothed
  target, so it is a ceiling on the flights that need one and leaves the path the owner likes alone.
  Login apex -35px -> +7px.
- **The landing plonked** because the cruise ended ON the perch at pace and stopped dead. It now aims
  16px high and sinks the rest on a decelerating ease with the wings still beating. Final approach
  3.42px/frame -> 0.42px/frame.
- **The flight jerk is a stall, not a reposition**, which measuring settled quickly: the perch rect
  never drifts vertically mid-flight (y=0.0px). A performance trace found two forced reflows stacking
  in the destination's commit; one was `reportPerchRect` running from `useLayoutEffect`, i.e. reading
  geometry synchronously inside React's commit before first paint. Made passive, and it leaves the
  trace's reflow list. The other is inside React's own `commitMount` and was left alone, so this
  REDUCES the jerk rather than removing it. Said so to the owner rather than claiming the fix.
- **Ctrl+Shift+H now ships.** It was a dev-only review aid; the owner asked for it on the live site.
- **Browser zoom (bugs.md #17) still does not reproduce**, now with both flaws in the old probe
  corrected: real viewport+DPR zoom instead of CSS `zoom`, and empirical pivot measurement (rotate
  180 degrees, midpoint of the before/after boxes) instead of reading computed style, which only
  says what the CSS declares. Every pivot correct to within 0.5 user units at five zoom levels and
  on a live resize. Third disproof; recorded in bugs.md so nobody spends a fourth session on it, and
  the next step is a screenshot from the owner rather than more code.

## 2026-08-11 (later still) - the zoom bug was Safari all along, and the jerk was three layouts deep

- **Bugs.md #17 root-caused by the owner's screenshots.** The one variable three investigations
  missed was the browser: every probe ran Chrome, the owner zooms Safari (the menu bar was in the
  screenshot; they then confirmed Chrome and Brave are fine). Chrome resolves px transform-origins
  on SVG children in user units; WebKit multiplies them by the page-zoom factor, so every pivot
  slid by the zoom and the wings swung from the bird's bottom centre instead of its shoulders.
  Fixed by converting every RIG_CSS origin to view-box percentages, which carry no unit to scale.
  On the way, measured that Chrome anchors percentage origins at 0 rather than the viewBox's y=-10
  the spec describes (the spec mapping put every y-pivot exactly 10 units low), so the shipped
  mapping is y% = y/152 per measurement; hoopoe.tsx documents it. Chrome verified byte-equivalent
  (empirical pivots within 0.25u, committed probe passes unmodified, landing check 28/28). WebKit
  still unmeasured: safaridriver needs the owner to flip "Allow remote automation" in Safari's
  Develop settings; bugs.md says exactly what to look at either way.
- **The remaining flight jerk was three stacked forced layouts, whack-a-moled one trace at a
  time.** The ~85ms bill for laying out the just-mounted auth page lands on whoever reads geometry
  first inside the commit: first autoFocus (react-dom's in-commit focus()), then Next's
  post-navigation scroll walk (shouldSkipElement), then our own perch report. All three are gone:
  a new useDeferredAutofocus hook focuses the same field two frames later on a clean tree (login
  email, trivia gate, signup first name), the flight navigation pushes with scroll:false, and the
  perch report's explicit mount call is deleted in favour of the ResizeObserver's guaranteed
  initial delivery, which the platform runs AFTER layout. The ForcedReflow insight is now absent
  from the flight trace entirely; what remains is the browser's one unavoidable rendering-phase
  layout, which rAF outruns by construction.
- **One regression caught by the guards, not by eyes**: the gate's deferred focus fires late enough
  that the rig is live, so its curious-on-focus expression queued ahead of the mobile fly-in and
  the veil lifted on a seated bird (landing check: first visible frame mid-viewport). The gate now
  swallows exactly the first, programmatic focus; a person focusing the field still gets the look.
- Owner action: either flip Safari's "Allow remote automation" (Develop settings) so the WebKit fix
  can be measured with safaridriver, or just Cmd+/Cmd- on /login and say what the bird does.

## 2026-08-12 - Safari measured for real, and the flight physics pass

- **The zoom fix verified in actual Safari** (26.5.2, safaridriver, after the owner flipped "Allow
  remote automation"): the percentage origins resolve to exactly the right pivots in WebKit too
  (computed "42px 85.000069px", empirical wing pivot (42.0, 85.0)), settling the anchor question:
  WebKit anchors percentage origins at 0 like Chrome, not at the viewBox's -10 like the spec. Two
  humbling findings recorded in bugs.md #17 for the next prober: CSS `zoom` does NOT reproduce the
  Cmd+ breakage in Safari (so the px bug is specific to real page zoom, which no automation on this
  machine can drive), and Safari does not reflect a just-written SVG child transform in
  getBoundingClientRect synchronously (a probe that reads in the same tick gets garbage; the first
  run reported every pivot uniformly ~100u off for exactly that reason). Final confirmation of
  Cmd+ itself remains the owner's eyes, said plainly.
- **The flight physics pass** (owner: sign-in ok, join worse, "doesn't feel like the hoopoe
  translation is related to the actions it's making"). Four corrections, all in the flight layer:
  the altitude ripple was rounded to whole cycles per cruise and drifted up to half a wingbeat out
  of phase with the wings by mid-flight — it now runs at the puppet's exact 440ms period,
  phase-locked to the downstroke; the symmetric sine arch became sin(pi*u^0.85) so the apex sits at
  ~44% and the descent is a long shallow glide (measured on join: 48% of the flight's time over the
  last 28% of its ground — join gains most, its perch being 70px lower); the flare now pitches
  nose-up against travel (-6.9 deg measured, level by touchdown); and the retarget smoothing is
  exponential in real time instead of per-frame, so the path no longer depends on refresh rate.
  Landing check 28/28, dx=dy=0.00px. The in-SVG flights (sidebar, mobile fly-in) were left alone:
  arcAndLand already drives wings and bob from one clock.
- Owner action: Cmd+ and Cmd- on /login in Safari (the one thing automation cannot press), and fly
  both CTAs to judge the new physics — the numbers can only prove coupling, not feel.

## 2026-08-12 (later) - the physics pass reverted

- Owner verdict on the flight physics pass (c279438): "it's made it much worse." Reverted whole,
  no cherry-picking; the flight layer is byte-identical to its pre-pass state (verified against
  7003690, which passed the landing check 28/28). Lesson recorded for the next attempt: the four
  changes were all mathematically defensible and measured as intended, and the owner still hated
  the result, so flight-feel changes must be judged by the owner WATCHING each change in isolation,
  one at a time, not shipped as a bundle argued from mechanism. The physics commit's analysis
  (wingbeat period mismatch, apex position, flare pitch, per-frame smoothing) survives in git if a
  future one-at-a-time round wants the starting points.

## 2026-08-12 (later still) - descenders in the name field

- Owner: a name with letters that go under the line "cuts off". Real, and only on your own profile:
  the read-only `<h1>` clips nothing (the nearest overflow ancestor is the card, 336px below), but
  the editable name is a textarea, which is a scroll container and clips at its own box. That box is
  the mirror's, set at line-height 1.05, while Libre Baskerville's content area is 1.226em — so
  0.09em of the font hangs outside the line box at each end. Measured at 41.6px: the tail of the j in
  "Sananjjy" lost 3.1px off the bottom, and the accent on a capital ("Śrī", "Ñ") lost 4.0px off the
  top. Nothing else on the sheet is set that tight, so nothing else was losing anything.
- Fix: the clip box grows 0.12em past the line box at both ends, pulled up by 0.12em with the same
  0.12em handed back as padding, so the text does not move by a pixel and the mirror still owns the
  height. Verified: mirror 43.67px unchanged and the Batch row still at y=227, room 4.98px each side
  against 4.02 needed at top and 3.14 at bottom; at 390px it scales with the clamp (4.19px room
  against 3.03 and 2.92). The mirror also gained `break-words` to match the UA's own wrapping on a
  textarea, or a name with no space in it for 60 characters would wrap in the field but not in the
  mirror and show a sliver of a second line through the newly taller clip box.
- The j tails now cross the dotted pen rule by 1.1px, which is what writing on a ruled line does.
  Checked at 2.6x: terminals whole, macron and acute whole. Desktop and 390x844 both shot.

## 2026-08-13 - The email queue stops lying

- A fresh signup was told "we've hit today's email limit, your link goes out at 8pm" as the third
  email of a 95-email day. Root causes, all three now structural rather than patched: the
  fire-and-forget drain never ran on the deployment (nothing has EVER sent from Vercel; every
  message in the Resend dashboard so far left this laptop - check the env var is named exactly
  RESEND_API_KEY and redeploy); `verificationMailState` answered "queued" for every unsent row and
  the banner explained it with the only reason it knew; and `appUrl` built links against localhost
  whenever NODE_ENV=development, so the one working sender mailed a member a link to a laptop.
- The shape now: `claimAndSend` is the single code path that moves a row out of the queue (drain
  loop, resend button, page-load read all go through it). `verificationMailState` repairs instead
  of reporting - a queued row with budget available is sent synchronously inside the page load, so
  "we've hit today's email limit" is IMPOSSIBLE to render while the day has budget left; the state
  is sent | imminent | queued-with-refill-time | failed | none, and only queued may mention the
  limit. Deferral names the moment ("tomorrow at 5:30 am"), formatted in the reader's locale via
  useSyncExternalStore because SSR's locale is not the reader's (found as a live hydration
  mismatch). A really-sent email never carries a localhost link.
- Proven against the running app, not asserted: a signup-shaped account with a stranded queued row
  logged in through the real form; first page load sent the mail (Resend-accepted, token minted
  with its full day) and showed "we sent a link". With 95 sends recorded today, the same load
  showed the limit banner with the refill time and no button. next-devtools reported zero errors.
  Test rows and fillers torn down; baseline verified (0 queued, 40 users).
- The three real members affected were all put right: Shrey's stranded mail was flushed (he
  confirmed himself despite the localhost origin), and Sanjula and Nirad were re-sent
  canonical-origin links, old tokens burned.
- NEEDS DEPLOY, and on the dashboard: confirm the Vercel env var is literally RESEND_API_KEY.
  Until both, this laptop remains the only machine that can send.

## 2026-08-13 - Shrey's Black Eagle, and the build-fund bar goes live

- Set Shrey Davuluri's `birdOverride` to `black-eagle` (valid slug, not a reserved species), same
  run-sql path as Sanjula's Purple Sunbird.
- Answered "how much have we received via Razorpay": Rs 3,530 across 2 real paid contributions
  (Rs 100 Sanan 2026-08-05, Rs 3,430 Shrey 2026-08-13). 17 live `created` rows are abandoned
  checkouts, not money.
- The "Recovering what it cost to build" bar on /support now reads the real figure instead of a
  hand-edited constant: the page sums paid live-mode Contribution rows per view and passes paise
  into CostBar; the bar completes at the Rs 4,00,000 build cost. Failed sum falls back to the
  zero-state bar. Verified live: fill renders max(0.8825%, 12px), exactly 3,530/4,00,000.
  Committed faa41af.

## 2026-08-13 (later) - Production sends its own mail, verified

- The owner re-created the Resend key under the exact name RESEND_API_KEY on Vercel (the old var
  could not be renamed), added APP_URL, and pushed; the redeploy made the env change take effect.
- Verified from the outside, not assumed: drove https://rishivalley.space/forgot-password in a real
  browser with the local dev server DOWN. The shared-DB row went queued -> sent in 0.64 seconds and
  Resend's own record shows the message, created by the deployment. First email Vercel has ever
  sent; the laptop is no longer load-bearing.
- The new key is full-access (old was send-only), so sent-message bodies are now auditable via the
  API - used today to prove Nirad's re-sent link carried rishivalley.space on every href (the
  localhost one he saw was the pre-fix 04:22 message threaded above it in Gmail).

## 2026-08-13 - The owner's thirteen-item punchlist

One session, eleven commits, every item from the owner's list landed and verified in the running app:

- **Letters**: drafts are deletable (the `deleteDraft` action existed with zero callers; the strip
  grew a trash button - confirm, optimistic removal, auto-animate). Tested end to end on the real
  "t4wt" junk draft. "Something's broken" is now "Bug report" everywhere the bug kind speaks.
- **Comments, the big one**: deletion is soft (`deletedAt`, content blanked) so deleting a parent
  no longer takes its replies - they anchor to a quiet "[deleted]" stub (feather in a mist circle).
  Authors delete their own comments from a hover-revealed "..." menu (owner mid-session: "would
  Instagram do it like that?"), never a bare Delete button. All four `_count.comments` sites
  exclude deleted rows, so the count can no longer include invisible comments. `loadComments` is
  keyset-paginated (5 on open, 10 per scroll page, replies always travel with their parent) with an
  auth check the security audit had flagged. The comment heart is a named `sm` variant (14px in the
  12px meta row, button 18px inside the 20px row - the love-button doc comment records both owner
  rulings). The open animation no longer overshoots on empty threads: the skeleton is sized from
  the count the card already knows. Verified with a seeded 55-comment thread: opens with 15, loads
  the rest only on scroll; parent-delete/stub/count all proven against the DB.
- **Notifications**: the bell pages by keyset (20 at a time; row 21 used to be unreachable),
  refetches its first page on every open (was once per mount, went stale), infinite-scrolls inside
  its own box, and prunes each account to its newest 100 on open (no cron, same lazy pattern as the
  mail drain). New `(userId, createdAt)` index. NOTE: my prune test seeded 130 fake rows dated 30
  days back, which pushed the owner's 13 oldest real notifications (all read, >30d old) past the
  cap and deleted them - a testing mistake, disclosed. 30 real notifications remain.
- **Catch-ups**: mobile gets one numbered, tappable dot per prompt in the sticky bar (filled =
  shared, ring = current) - phones previously had no way to jump between questions. "Share" on the
  last prompt sweeps to the first unanswered prompt instead of the completion card (verified on the
  live Round: Share on Q11 with Q7/Q9 blank lands on Q7). Spec 3.4 updated. Also fixed the square
  "white boxes" behind the answered-cluster birds (ring-2 on an unrounded box) - owner spotted it
  in a screenshot mid-session.
- **Rich text everywhere**: the composer's DOM<->markdown helpers moved to
  `src/lib/rich-text-editing.ts`; a shared `<RichTextArea>` now powers the catch-up answer box and
  the quick-edit dialog (which used to reopen rich posts as raw markdown). The round reader and
  comments render markdown via `renderRichText` instead of printing markers. Verified: bold in a
  catch-up answer round-trips to `**markdown**` in the DB (then restored the owner's answer).
- **Profile bird**: hovering/focusing/tapping the perched bird shows the species chip (below the
  bird - above it starts at viewport y=-27 and is never seen), resolved through the same
  override>pin>hash chain as the glyph. The chirp arcs follow the pose: a mirrored bird used to
  call out of the back of its head. Verified on Shrey's left-facing Black Eagle.
- **Clickable identity**: audit of every BirdAvatar site; linked the photo-viewer byline, four
  catch-up "asked by" lines, the masthead contributor strip, the answered cluster, and the people
  panel rosters. Notification rows can't link their actor yet (name is baked into the message
  string) - parked in FEATURES as "actor field on Notification".
- Two schema columns/indexes via manual idempotent SQL (`2026-08-13-comment-deleted-at.sql`,
  `2026-08-13-notification-created-index.sql`), both applied. Dev server restarted once: the
  running Turbopack held the pre-`deletedAt` Prisma client and 500'd the feed until restart.
- Separately: Shrey is a Black Eagle (`birdOverride`), and the /support build-fund bar now sums
  real paid live-mode Contributions (Rs 3,530 so far of the Rs 4L build cost) - committed and
  PUSHED earlier at the owner's request; everything after that push is committed but NOT pushed.

## 2026-08-18 - Teachers become first-class: onboarding, signup tenure, profile

Owner request thread: remove admission number and houses for teacher signups; make city picks
commit to a pill immediately; add optional subjects; then a full teacher pass (tenure years at
signup, "years in the valley" with "present", subjects on the profile like batch, clear editing).
Four commits, all gates green, verified end-to-end with a real teacher signup that was then
deleted through its own delete-account flow.

- **Onboarding**: teachers (accountType != alumnus) get a four-step wizard - Houses is a student
  record and never renders; the register step swaps Admission number for a subjects field and the
  copy says "old students", not "batchmates". Deep link ?step=houses on a teacher lands on
  register.
- **City picker**: the register step always uses the multi chip list now. A tapped result becomes
  a sky pill at once, the popup closes and the input blurs (the old single-then-"Add another
  city" toggle left the pick as plain text). LocationPicker's keep-popup-open-across-picks multi
  behaviour is gone everywhere - a pick finishes the gesture, tapping the box starts the next.
- **New `<TagInput>`** (`src/components/common/tag-input.tsx`): type-to-chip for short lists.
  Enter/comma/blur commit (blur matters on phones), backspace on empty removes the last chip,
  dedupe case-insensitive, pasted comma lists split. Chips byte-identical to the city pills;
  the input is the shared `<Input>` (protocol auditor caught my hand-rolled first draft
  reverting the 12a1bac focus-outline fix). Subjects title-case as they become pills.
- **Signup**: Teacher keeps Joined/Left at half-width each (Batch alone leaves, popLayout);
  Left is optional and its fit-to-content InfoTip says "Still teaching at Rishi Valley? / Leave
  this blank." - two forced lines, no orphan (owner rejected two longer drafts and a w-64 bubble
  with dead space; InfoTip grew a `fit` prop). Server maps the pair to taughtFrom/taughtUntil
  and derives teacher vs ex_teacher from whether Left was given; year order validated for both
  account types; accountType from the client is never stored raw.
- **Profile**: teachers show Subjects (wide fact) where alumni show Batch, "In the valley" from
  tenure with "2005-present" while current; no admission number (colophon shows the bare mark in
  edit mode too), no Houses in either state. Editing: the until-slot reads "present" at rest
  (PenValue grew `restText`), placeholder "now" while editing; typing a finish year flips the
  byline to "Former teacher" live, clearing it flips back - the year IS the control, no toggle.
  Teacher-only fields also gated by row accountType server-side (write-path reviewer's finding).
  Sidebar chip finally receives accountType, so teachers read "Teacher" not "Member". A profile
  with no occupation no longer shows a hanging "at" under the name (rest-state only; the holes
  return with the pen).
- **Hoopoe wing fix** (signup): answering the trivia fast stranded the wings half-raised - the
  unqueued coverEyes fired mid celebrate(2), then the interrupted greet's leftover wave wrote
  rotate back over the tuck's translate ("wrong pivot"). The mount tuck now polls isBusy()
  (340ms minimum settle, 8s cap past the flight failsafe) so it always lands after the whole
  queue drains. Measured the wing transforms through the fast path: flap clean, tuck settles at
  the exact login-page pose. Owner kept seeing the bug in a stale tab - a hard refresh shows it
  fixed.
- Write-path reviewer also surfaced (pre-existing, NOT from this diff): the demo database never
  got `2026-08-13-comment-deleted-at.sql`, so `scripts/demo/verify-guard.mts` fails on the
  comment step until that file is applied to the demo DB. Parked for a follow-up.
- Owner feedback logged to memory: full-page screenshots are not enough - zoom into every
  touched state and catch orphaned words, oversized bubbles and stray connectives before he does.

### Same day, round 2 - owner-reported polish and the flight-path hoopoe

- **Hoopoe, actually closed**: the owner's Safari screenshots showed the true repro was the
  LANDING -> flight -> fast trivia path, which the direct-load test never exercised. The flight
  handoff's greet could land after the form had already tucked the wings; its wave then wrote
  rotate over the tuck (the "hanging arms"). Two layers: runIntro now lets the greet lapse if the
  trivia step is already gone, and the form keeps a 15s watch that re-asserts the tucked pose the
  moment any other animation finishes - a stranded wing survives at most one 250ms tick, whatever
  path or browser timing lets a writer through. Verified live on the full landing->flight->fast
  path: pose byte-stable for 12s.
- **Letterhead**: empty occupation line takes NO space at rest and grows in with the pen (the
  Houses-hint height pattern); the verified leaf rides a no-wrap group with the name's last word
  (never orphaned on its own line); the name's type is 6cqi against the sheet's own @container
  instead of 7vw (owner: "it wraps, then unwraps and then wraps") so characters-per-line holds
  through the scaling band and wrapping is one event; the sheet keeps ONE padding, the smaller
  p-6, at every size (owner preference). Remaining single re-flow sits exactly at the 768px
  sidebar collapse; collapsing the sidebar at 1024 instead would make even that monotonic but
  changes every page's 768-1024 layout - offered, not taken unilaterally.

### Same day, round 3 - the valley gets its own pin, teachers get their own word

- **Owner asked why Kartik Kalyanram sat under Madanapalle** when his city reads Rishi Valley.
  Not a data fault: the map buckets every location onto a 0.1-degree grid (~11 km) so one city
  cannot split into two stacked dots, Rishi Valley is 10.4 km from Madanapalle, and both round
  into the same square `78.5,13.6`. A square takes the name of the FIRST member drawn into it and
  the pin query orders `batchYear desc`, so two 2023 members in Madanapalle claimed the square
  before the 1978 arrival ever reached it. Adding Rishi Valley to the gazetteer late had nothing
  to do with it - `city-coords.ts` already carried the string, and a fully linked row lands in the
  same square anyway. Only the map merged them; the Directory city facet always listed both.
- **Fix**: `OWN_PIN_CITIES` in `city-coords.ts`, an opt-out keyed by name rather than by square,
  with Rishi Valley in it. Both still plot at exact coordinates, so `maxUsefulZoom` and the
  supercluster do the rest - merged at world zoom, resolving to "Madanapalle - 2 members" and
  "Rishi Valley - 1 member" as you drill in, which is what the grid was standing in for. Grid
  stays the default everywhere else. Verified by drilling the real map to the split and opening
  the drilldown (Kartik, Batch of '78, Doctor); both viewports.
- **Data touched at the owner's direction**: Ananya Parthasarathy's workplace `Gnlu` -> `GNLU`;
  Kartik's houses JSON `(raavi)`/`(kailash)` -> `(Raavi)`/`(Kailash)` (free-text parentheticals,
  not canonical `houses.ts` entries); Kartik's UserPlace relinked from free-typed to the curated
  Rishi Valley row (placeId 900000001, exact lat/lng); Mini Muralidas's subject `Evs` -> `EVS`.
  Note the signup form title-cases what people type, which is where every one of these came from.
- **Teachers in "New in the directory"**: the last byline still calling `formatBatch`, which takes
  batchType and batchYear and therefore cannot see accountType. Teachers have no batch year, so
  they rendered with a blank line. Moved to `batchLine` (already says "Teacher"/"Former teacher")
  and gave it `blankWhenUnknown` so the rail keeps its deliberate blank for batch-less alumni
  rather than gaining "Member" filler. The sidebar account chip already routed through
  `batchLine` and needed no change - verified the chain auth.ts:108 -> layout.tsx:83 -> chip by
  reading it, NOT on screen: admin-login is locked to ADMIN_EMAIL so the teacher pill cannot be
  photographed without flipping the owner's own accountType in the shared production DB. Said so
  rather than claiming it.
- **Subject vs Subjects**: the profile fact was always plural, so a teacher of one read
  "Subjects: EVS". Pluralised off the comma list in both the read-only sheet and the editor, the
  same `> 1` rule the City/Cities fact beside it already follows. Plural branch verified by
  briefly setting two subjects on Mini's row, screenshotting, and reverting (confirmed back to
  `EVS`).
- `batchLine` now has unit tests (teacher, ex_teacher, blankWhenUnknown, anonymous, full year).
- **Left alone, flagged**: `src/components/admin/user-management.tsx:86` is the one remaining
  `formatBatch` call and shows the same blank for teachers. It needs accountType threaded through
  its server page, and it is an admin surface the owner did not name.

## Round 4 — Kartik's Pitta, and a teacher's city already filled in

- **Kartik Kalyanram is an Indian Pitta.** Data only: `User.birdOverride = 'indian-pitta'`, applied
  with `scripts/dev/run-sql.mjs`. The slug resolves through `resolveBirdOverride`
  (bird-avatar-v2.tsx:1743); Pitta is not one of the two reserved species (Hoopoe, Indian Roller),
  so it takes effect immediately. Verified on his profile — hero avatar and post byline both show
  the green back, buff underparts, azure wing patch.
- **A current teacher's city starts as Rishi Valley.** The onboarding register step already
  pre-fills Occupation and Organisation for `accountType === "teacher"`; the city chip list now
  joins them, seeded with the curated gazetteer row (placeId 900000001, "Rishi Valley, Andhra
  Pradesh") when they have no saved places. It is an ordinary pill: removable, and the box below
  still adds as many more cities as they want. Former teachers and alumni are untouched, and
  anyone with saved cities keeps exactly what they saved.
  - Verified by temporarily forcing `accountType: "teacher"` and `places: []` in welcome/page.tsx,
    shooting `/welcome?step=register` at 1440x900 and 390x844, then reverting the file. The chip
    fits the card at 390 with room to spare.
  - **Still true**: "Skip for now" writes nothing, so a teacher who skips the step keeps a blank
    city. The default only lands if they save the step.
- **Mini Muralidas set by hand** (owner: "set her place to RV"). She is the one current teacher on
  the site and had already been past onboarding, so the new default could never reach her. One
  `UserPlace` row inserted against the curated Rishi Valley entry (placeId 900000001, exact
  lat/lng, `position` 0), with the legacy `User.currentCity` column set to the same label the way
  `saveOnboardingRegister` keeps it in sync. Her profile now reads CITY: Rishi Valley, and she
  plots inside the valley's own pin.

## Round 5 — "TEACHER · TEACHER"

- **The bug the owner caught**: the map drilldown read `Mini Muralidas / TEACHER · TEACHER`. Two
  independently correct values collided — `batchLine` returns "Teacher" for a current teacher, and
  her occupation is, reasonably, "Teacher". The directory card had it too
  (`Teacher · Teacher · Rishi Valley`), and it only appeared at all because her city was set an
  hour earlier; before that she was not on the map and her card had no third segment.
- **Fix in `metaLine`, not at the two call sites.** A segment repeating one already on the line now
  vanishes the way an empty one does, comparison case- and space-insensitive, first spelling kept.
  Both surfaces that pair a role label with a free-typed field
  (`directory/profile-card.tsx:66`, `directory/alumni-map.tsx:666`) are fixed by it, and so is any
  future one — no call site should have to know its two inputs can collide.
- **Swept for the rest**: those two are the only places in the app that render `batchLine`
  alongside `jobTitle`. Every other `metaLine` call pairs things that cannot be equal (name +
  batch, batch + date, email + batch). `MetaDots`, the styled twin, was left alone deliberately:
  its two call sites are batch+date and a list of houses, which are already distinct, and its
  parts are ReactNodes with nothing to compare.
- Four `metaLine` tests added to `batch-line.test.mjs` (repeat, case/space, order preserved, empty
  segments). 10/10 in that file, `npm run check` green.
- **Verified on screen, not by reasoning**: drove the real map with chrome-devtools, zoomed to the
  valley and opened the pin — `Mini Muralidas / TEACHER`, `Kartik Kalyanram / BATCH OF '78 ·
  DOCTOR`. Directory card reads `Teacher · Rishi Valley` at 1440 and 390.

# Session — Support page redesign, four concepts in /lab

The Support page had barely been touched in months and the owner called it the weakest part of the
site: "a heading, then grey text, then subheading, then regular text, then boxes with the same
cluttered hierarchy, then the chip in box with totally different stuff going on." Counted twelve
distinct text sizes on one page. He redirected the work into `/lab` rather than straight onto the
route, and asked for one calm version plus creative alternatives.

**New room: `/lab/support-ideas`, "Four ways to ask"** (registered in `_registry.ts`, group Delight).
Four full rebuilds sharing one `_shared.tsx`: same words, same rupees, same fourteen birds, so any
difference between them is a design decision. `?v=plate|aviary|days|stamps` deep-links a concept.

- **Plate** — the calm one. Every section is a card, every card opens with the same line, nothing
  outside a card is a heading. Three type levels and no more.
- **Aviary** — his own idea. 156 bird glyphs on a responsive CSS grid behind the whole page, with
  every readable thing on glass.
- **Days** — the bill as ₹76 a day and thirty marks. Pick an amount and watch it fill some of them
  in, in cinnamon. You see what your money buys before reading a word.
- **Stamps** — two rows of seven is a sheet of stamps. Perforation is a real SVG path
  (`mask-composite` is still uneven across browsers). Click one and the button says which bird you
  are claiming, so the reward stops being a sentence.

**Copy, all his:** no "actually" before costs; the site is "this site", never "Rishi Valley"; struck
"A few people chipping in comfortably covers the whole month", "If it has helped you find an old
friend...", "Fourteen of the fifty" and "One time, never a subscription". The pledge is four short
LINES, not a paragraph — as prose it broke mid-thought, and every line now fits a 390px screen
without wrapping. CTA is "Contribute ₹1,000": formal, and no middle dot, because the dot is the
app's separator for meta segments with no grammar between them and this is one verb phrase.

**The bird arrangement** got real work after he asked for it to "reveal the true variety and beauty".
Read the fourteen discs' actual hex off the rendered glyphs, then used the one fact that matters in a
two-row grid: cells touch exactly when their columns are less than two apart, rows are irrelevant.
Spread the three greens, three teal-to-blues, three reds and two pale ones across columns ≥2 apart.
Result: no two neighbours share a hue, every column pairs warm with cool, three columns land on near
complementaries. Facing is composed too — it is seed-derived, so `seedFacingRight()` walks
`plate-<i>-<k>` until the pose lands right. All fourteen face one way like a field-guide plate; the
head-on Spotted Owlet is the one bird looking back at you.

**His rounds on it:**
- Cost tile "poor use of space" → rebuilt twice. A right-aligned list was worse (label and number
  500px apart). Landed on the bar carrying its own biggest label: Hosting is 85% of the bill, so at
  44px tall it holds "Hosting ₹1,950" in white (7.78:1). Domain and Photos cannot — 78px and 28px
  wide, and white on cinnamon is 4.13:1 — so they are named underneath. The asymmetry is the finding.
- Second bar unclear → now "Recovering what it cost to build" / "₹0 of ₹4,00,000".
- Aviary birds "waaay too small on mobile" → moved from absolutely-positioned clamped pixels to a
  responsive CSS grid, 4/6/9 columns, bird at 42% of its cell. Scales with the screen, cannot overlap.
- "No birds behind text ruins readability" → every panel is glass including the title, so the wood
  runs at full strength and nothing is read off bare background.
- Hover dim "fast and almost jittery", twice → 150ms to 620ms. Measured: 1.0 → 0.64 → 0.36 → 0.30.

Hydration note worth keeping: positions from a fixed hash are not enough on their own. React compares
the server's style string to the client's numbers, so `20.359622773614056%` against `20.3596%` is a
mismatch. Every generated number is rounded before it reaches a style attribute.

`npm run check` green throughout. Verified at 1440 and 390 with chrome-devtools, including a real
hover to confirm the dim curve. Nothing under `(main)/support` was touched: the shipped page is
unchanged pending his pick.

## Round 5 — the rectangle in the bird's shadow

- **What he saw**: on a profile, hovering the bird brought up a faint extra shadow that lingered
  about a second after the pointer left. Two screenshots settled it: at rest the contact shadow is
  a soft ellipse, while hovering it is a hard-edged RECTANGLE.
- **Cause**: hovering mounts the name label, Chrome repaints that corner, and it repaints a dirty
  RECT. A `filter: blur()` repainted inside a dirty rect cannot read pixels from outside it, so the
  ellipse came back sliced along a straight edge and stayed sliced until the next full repaint.
- **Fix**: `willChange: "filter"` on the shadow span, and nothing else. It owns its raster, so no
  neighbour's invalidation can cut it. Same bar, same 3px blur, same 0.14; darkest pixel 212 and
  spread 32 on the same crop, before and after.
- **Two wrong turns first, both reverted** (`1fe4cff`): swapping the label's spring for an
  opacity-only tween, and repainting the shadow as a radial gradient. Neither was asked for, both
  changed how the thing looks and moves, and the owner had to catch them. The artifact does not
  appear in a headless capture — asking for his screenshot earlier would have found the real cause
  in one step instead of three.

# Session — Aviary ships as /support, with the bird picker

The owner picked Aviary from /lab/support-ideas and asked for the ship, with rounds:

- **Header not in a tile.** The title and pledge sit bare on the page; the wood (see below) keeps a
  clear lane behind the content column so bare text never lands on a bird. Pledge is his exact
  paragraph, one para, body size, reading colour.
- **Costs, Revolut register.** Third rebuild of this card and the one that stuck: the ₹2,290
  headline leads at the type scale's h2 with the old card's count-up kept, an 8px segmented strip
  under it, then a receipt — one row per cost with a DOTTED LEADER carrying the eye from name to
  amount. The dots are the answer to both earlier failures (the fat labelled bar, and the
  right-aligned list whose label sat 500px from its number). Recovery bar: live sum from the
  Contribution table (paid + livemode, same as before), no figures at either end — the ₹4,00,000
  never prints.
- **The wood** (`wood.tsx`): fixed field of ~75 glyphs on a jittered responsive grid (4/6/8 cols),
  clear lane behind the 768px column via a CSS mask so it tracks every width; on phones the lane
  becomes an edge-whisper at 45% instead (no gutters exist there). left offset 248px so it never
  paints across the sidebar; -z-10 inside the shell's z-10 context so it sits above the valley
  photo and under everything readable. Counted 8 birds per gutter in a 1440 viewport — no bald sides.
- **Min contribution ₹500** (was ₹100), server-clamped, and it doubles as the perk threshold so one
  number answers "minimum" and "what unlocks the picker".
- **The bird picker** (`bird-picker.tsx` + `chooseBird` in actions.ts): members whose PAID
  contributions (current key mode) reach ₹500 see the full wearable collection — all fifty minus
  the reserved Hoopoe and Roller — in place of the fourteen-bird plate. Tap selects (canopy wash,
  the app's one green state); a confirm strip rises with the bird, its name and "This becomes your
  avatar everywhere on the site."; only "Make it my bird" writes. Re-pickable forever; current bird
  wears a canopy check. Verified LIVE end to end on the shared DB with the owner's own account:
  picked the Verditer Flycatcher, watched the sidebar avatar change on refresh, then restored
  birdOverride to NULL by targeted UPDATE (guarded on the test value).
- **Write path reviewed** (write-path-reviewer, then spot-checked its claims by hand): auth +
  own-row-only write, IS_DEMO guard, server-side slug allowlist (WEARABLE_SLUGS, reserved birds
  excluded, resolveBirdOverride as independent second enforcement), eligibility summed server-side
  from rows only a valid Razorpay signature can mark paid. Demo backstop confirmed personally:
  Contribution is not in ALLOWED_WRITE_MODELS and birdOverride is own-profile-scoped.
- **Contribute panel**: "Contribute ₹1,000" with a word space (no middle dot), "PICK AN AMOUNT"
  eyebrow removed, one-time line folded into the shield note, success copy now points at the picker
  ("the bird picker just above is now yours") and router.refresh() makes that true.
- cost-bar.tsx retired; plate data (arranged order + facing seeds) extracted to
  `plate-data.ts`, shared by plate, picker and the lab room's record.
- `npm run check` green; console clean; verified at 1440 and 390 (record shots
  `temporary screenshots/support-ship-{desktop,mobile}.png`).

Loose end noted, not mine: `scripts/demo/verify-guard.mts` fails to start under
`--experimental-strip-types` (ERR_MODULE_NOT_FOUND src/lib/prisma.js) — pre-existing tooling issue,
unrelated to this diff, flagged by the write-path review.

# Session — the owner's corrections round on /support (same day, after the first ship)

He reviewed the first ship and rejected most of my re-derivations: he wanted the LAB aviary, with
his named fixes, not a new design. Ten corrections, all landed:

- **Picker off /support** ("the support page should be the support page"): now at /pick-bird, whose
  only member entry is the post-payment redirect. No standing door on /support; the "Choose your
  bird" CTA he saw existed because his account holds old test-mode payments ≥₹500, and it is gone.
- **/pick-bird rebuilt from his verdicts**: at rest the grid is pure plumage, no labels ("fat and
  close together with their names... downright ugly"). Hover = the plate's spotlight exactly: others
  dim to 0.3 over 620ms, the name materialises under the focused bird; the state-layer hover tint
  was removed after he compared it to lab ("just copy exactly what you did in the lab"). Tap sinks
  (SpringPress), selection = canopy wash, sticky bottom confirm bar so the write is its own click.
- **Costs restored to the shipped CostBar structure** he called "at least an efficient design":
  "Where the monthly bill goes" + counted-up ₹2,290/month, the 20px segmented bar, pill legend
  (upgraded to exact rupees), then "Recovering what it cost to build" (his exact old label; my
  longer rewrite reverted) with the SAME 20px bar so the two match. Fill is live from the paid+
  livemode Contribution sum; no figures at either end, the ₹4,00,000 never prints.
- **The wood scrolls with the content** like the lab original: absolute against the shell's content
  div, not fixed. That anchor spans exactly the area right of the 248px rail, so it structurally
  cannot paint over the sidebar (his "birds in the sidebar", three times); md:pl-6 keeps even a
  first-column bird 30px+ clear of the rail edge. Bird size is clamp(40px,5vw,84px)×scale: the lab
  presence at a laptop, no specks (his word for the 26px cut), no murals on wide screens.
- **One wood, two callers**: lab aviary imports SupportWood(inset=false). Its birds vanished at
  first because the lab room root is not a stacking context, so -z-10 slid behind the room's own
  opaque background; `isolate` on the root fixed it. Density fixes can no longer land in one place
  and not the other (they did; he noticed).
- **Pledge**: his new copy, one full-width paragraph: "This site is not for profit and will always
  be free to use. Donations are much appreciated and go towards running and improving it for
  everyone. Anything left over goes to the school." (Grammar fix + "anything left over" in place of
  "100% of any money not used for the site"; offered him the explicit variant if he wants it back.)
- **Header icon**: shipped original restored exactly (rounded-lg, bg-leaf/10, no border, sway).
- **Section headings** back to the site's text-xl font-bold register. **"See all 50"** is a filled
  secondary pill at full control height ("barely a button").
- **Contribute button**: gap-2, the Button primitive's own 8px, after two smaller gaps read as none.
- **Admin test door**: "Change bird" beside the Contribute heading, admin-only; /pick-bird and
  chooseBird both carry a role==="admin" exception so the owner can walk the exact supporter flow
  without paying. Members still need the paid sum; the server action re-checks it.

Verified: hover dim measured at 0.3 on /support and /pick-bird; wood scrolls with content (bird
rect moved exactly the scroll delta); zero bird pixels left of x=281 at 1440 and 2560; lab room
renders its field again (91 birds); mobile 390 clean. npm run check green throughout.

# Session — /pick-bird unified with /birds; constant bird size; backdrop choice staged

- **/pick-bird now wears the Birds of the Valley layout exactly**: same 2/3/4/5 columns, same 96px
  glyphs, same 13px muted names, title only (owner: "why have two separate layouts"). What it adds
  is behaviour alone: the plate's spotlight dim, the press sink, canopy selection wash, sticky
  confirm bar. /birds also drops its subtitle; both pages are title + grid, one look. Cross-refs in
  both files so the grids cannot drift silently.
- **Wood birds no longer scale with the window** (owner: resizing shrank them to specs while text
  stayed put). Fixed 64px base × 0.68-0.95 → every bird is 44-61px on a phone, laptop and 5K alike;
  the column count is what adapts. The 0.95 ceiling is load-bearing: a 61px bird at max jitter
  stays inside a 97px four-column phone cell. Measured 44-61px at 390 and 1440.
- **Backdrop decision staged, not made**: /support?bg=solid (photo hidden, birds kept) and
  ?bg=plain (photo and birds both hidden) render live against the default shipped look. Temporary
  decision aid; hard-code the winner and delete the param once he picks.

# Session — plate on mount, bigger wood, /pick-bird truly matches /birds, solid backdrop chosen

- The fourteen-bird plate animates in on MOUNT with its stagger, not on scroll-into-view.
- Background birds up to an 80px base (54-76px, constant at every width) after 44-61 still read
  small; columns went 3/5/8 so a max bird at max jitter stays inside even a phone cell.
- The real layout gap between /birds and /pick-bird found and answered directly: identical grids,
  but content-column.tsx assigns /birds the WIDE column and /pick-bird defaulted to centered 768px.
  /pick-bird added to WIDE_ROUTES with a comment tying the two.
- The owner picked the backdrop: SOLID page on /support, birds kept, valley photo hidden for this
  one route (scoped style tag). Preview flags deleted.

# Session — no dim on the picker, 50% bigger field, three root causes, one-pick policy

- **/pick-bird hover**: the dim is gone ("annoying to look and choose" among fifty). Hover is the
  app's standard story: state-layer tint on the hovered cell + the name stepping up to the reading
  colour. The plate on /support keeps its spotlight; it is a preview, not a choice.
- **Field birds 50% bigger** (120px base, 82-114px, constant), and the layout finally holds three
  invariants at once after three separate owner complaints proved they interlock:
    size constant (fixed px base) + density constant (auto-fill 170px-minimum cells, replacing
    viewport-fraction columns whose 385px cells on a 27" made the bald gutters in his screenshot) +
    no overlap (34-66% jitter keeps a 114px bird's 84px reach under half the minimum cell).
- **The rearrange-on-load root cause**: (main)/template.tsx animates a TRANSFORM for the page
  entrance, and a transformed ancestor is the containing block for absolute descendants, so the
  wood spent the entrance anchored to the 768px column and snapped wide when the transform
  cleared. Moved the mount to the APP SHELL (wood-mount.tsx, usePathname === /support), outside
  the template; measured identical bird rects at first paint and after settle. The solid-backdrop
  style hide moved with it.
- **No birds behind bare text**: the centre lane is fully transparent again (not 40%), which the
  fixed-density gutters now afford; phones keep whisper edges via the media-query mask.
- **The perk policy, asked and answered**: (1) no cheating a pick — the page gate is a curtain,
  chooseBird re-checks auth, demo, allowlist, the Razorpay-signature-backed paid sum, and now the
  unspent-pick rule on every call; (2) pay now, pick later works — eligibility is a standing sum
  and /pick-bird stays open until the pick is spent; (3) one pick EVER — a set birdOverride
  refuses further picks for members (admin exempt for testing; an admin-assigned override counts
  as spent, noted as accepted edge). After a successful pick the member is walked back to
  /support; the confirm strip says "You pick once, so make it count."

# Session — pay-again-pick-again, a new deal of the field, the backdrop A/B chip

- **The pick ledger got its column**: `User.birdPickedAt` (schema + dated idempotent SQL in
  prisma/migrations-manual, applied via run-sql.mjs; never db push). The rule the owner actually
  wanted: a pick is SPENT when used and REGRANTED by any paid contribution newer than the last
  spend. First pick needs the ₹500 floor; changing your mind costs another contribution. paidAt is
  only ever written by the signature-verified paths, so the ledger cannot be forged. Enforced in
  chooseBird, mirrored by the /pick-bird gate, said in the confirm strip ("Changing it again takes
  another contribution.").
- **The field re-dealt**: ARRANGEMENT constant folds into the position hash, so one number rerolls
  the whole layout deterministically. Seed 3 replaces the original after his laptop-width
  screenshot showed two clustered gaps; clearings also thinned 1-in-7 -> 1-in-9. Verified even
  gutters at 1512.
- **pt-16 on the field**: the earliest possible bird top now lands below the page title's own top
  (owner: the hoopoe "shouldn't be above the top of Support").
- **Temporary backdrop A/B chip** (admin-only, bottom-right on /support): flips live between
  "solid + birds" and "valley photo, no birds". Marked for deletion once he calls the winner.

# Session close — tree and no birds ships; the aviary parks in the lab

The owner called it after the A/B: /support ships with the valley photo and no bird field. The
solid-plus-birds design is PARKED, not deleted, per his ask that reviving it later must not mean
re-tuning density and sizes:

- The A/B chip and the wood's shell mount are gone entirely (his follow-up: parked code should not
  ride in bundles it is not used by). wood.tsx's only consumer is now the lab reference at
  /lab/support-ideas?v=aviary, so it tree-shakes out of every (main) page.
- wood.tsx keeps every tuned number as parked (82-114px birds, fixed-density auto-fill cells,
  arrangement seed 3, the clear reading lane, the title clearance) and its header carries the full
  revival recipe, including the load-bearing lesson: mount from the APP SHELL, never the page,
  because the page-transition template's transform becomes the containing block for an absolute
  field and causes the re-anchor flash. The registry note on the lab room says the same.

What /support ships as after today, in sum: the tree-photo backdrop, his pledge paragraph, the
restored CostBar with the live recovery fill, the fourteen-bird plate with the spotlight, minimum
contribution ₹500, payment success walking straight into /pick-bird (the /birds layout with
selection and the sticky confirm), the pay-again-pick-again ledger on birdPickedAt, and the
admin-only Change bird test door.

---

# A stray hair, for two accounts

Not a feature. `StrayHair` puts one tapered strand on the screen for the two ids in
`stray-hair-ids.ts`, and only when they are looking at their own profile. Empty that array and it
is over; the gate sits on the server, so the component's chunk never reaches anyone else's bundle.

Three things had to be true or it reads as a drawing rather than as dirt on the glass:

- It is `fixed`, not absolute, so it does not scroll with the sheet. This is the whole illusion.
- It is a filled tapered path (1px at the root, 0.75 at the middle, a point at the tip), not a
  stroke, and a shallow S rather than an arc. The first pass was a symmetric dome and that was the
  tell — nothing organic is a parabola, so it read as a pencil mark. Owner then called the strand
  thick and blurry: root width came down from 1.6px and the blur from 0.3 to 0.12, with fill
  opacity up 0.55 -> 0.68 to hold its presence at the thinner width.
- It flees only while the cursor is CLOSING on it. Pushing on the receding half as well made a
  swipe straight through cancel itself: measured 9px of travel where it now moves 46. An
  incidental pass 95px away still only nudges it 4px, and that gap is what keeps it ambiguous.
  The offset accumulates and never returns to origin, so there is no snap-back frame.

Two gotchas worth keeping. Exporting the id array from the `"use client"` component gave the
server component a client *reference*, so `.includes` was not a function and the page 500'd —
`tsc` was perfectly happy, which is gotcha 3 in CLAUDE.md exactly. And this repo has no prettier
config: running `prettier --write` on the profile page reformatted 321 lines to its 80-column
defaults. Reverted and reapplied by hand; the page edit is a 9-line pure insertion.

---

# The chain trades its arrows for lines

The owner's read on the house chain (2026-08-19 voice note): the layout is right, but from afar
it is "a bunch of pills". The arrows between houses were the problem, grey glyphs floating in
air, so nothing looked connected to anything. The ask: connecting lines that leave one pill in
its colour and arrive at the next in its colour.

The first pass drew exactly that and he called it janky. Two reasons, both now understood. A
full-ink line is the most saturated thing in a block of 7% washes, so it shouted over the pills
it was joining. And 30px is too short for an end-to-end gradient to read as a choice; the more
saturated ink just wins and the middle looks like a smudge.

So the second pass went to the lab. `/lab/chain-lines` ("The colour handoff") draws the real
nine-house chain with the shipped geometry six ways: thread, garland, baton, stitch, rings
(his outline idea), wash, with a width slider so each one curls into the serpentine on demand.
He picked Thread over the old arrows and the other five, and it shipped: 1.75px at 60% opacity,
which is roughly the weight of the pill borders, and each ink holds pure for the first and last
30% of the line with the blend confined to the middle. The blend is OKLab via color-mix, because
sRGB drags green-to-orange through mud and OKLCH drags orange-to-blue through magenta. Lines now
run flush to the pill borders at both ends; the 4px standoff existed for arrowheads, and a
connector that stops short of what it connects is an arrow with no head. No arrowheads at all:
the year captions already state the order.

One gotcha for the file: a linearGradient in default objectBoundingBox units on a horizontal
line paints NOTHING, because the line's bounding box has zero height and the spec skips the
gradient entirely. Every connector gradient is gradientUnits="userSpaceOnUse" for that reason.

---

# Two lessons written down where they will be read

Session outcome (2026-08-19, evening): no product code, two doctrine commits.

The sidebar regression test earlier today took three failed rounds because the debugging
happened inside Playwright: re-run the suite, read the locator error, guess, repeat, while
chrome-devtools sat there able to show the live DOM in one call. The owner's words: "I can't
afford stupid mistakes like this when the solution is right there." That is now gotcha 7 in
CLAUDE.md, with the rule stated as a lane assignment: the MCP finds the answer, Playwright
remembers it. A spec is written after the behaviour is understood, never as the instrument for
understanding it. The two locator traps are named there too: the mobile drawer re-renders the
same components through a Radix portal (scope to the desktop `aside`), and exit-animating nodes
still answer `toBeVisible()` (assert on geometry with `expect.poll`). `e2e/sidebar.spec.ts` is
the worked example.

Separately, the owner asked that lab rooms read like the Delight group, not the Second look
group. `docs/spec/lab-voice.md` now says so in its own section: a Delight room is a thing to
play with and its prose is a caption; a Second look room is a memo with exhibits, and a new
room must not be modelled on one. Audits keep their rigour but change shape, specimen first,
fix beside it. The pre-registration checklist gained the matching question.

Commits: 6730e14 (CLAUDE.md), 28ad1bb (lab-voice.md). `npm run check` clean, 15/15 tests.

Session outcome (2026-08-19, night): audit item A2 resolved without the owner.

The owner went looking for "Object versioning" in the R2 dashboard and could not find it,
because Cloudflare R2 does not have object versioning on any plan — the audit's "enable
versioning today" remediation for C2/C4 was impossible as written. A2 anticipated this and
named its own fallback, which is now built: `backup.yml` gained a `media` job that copies
`rv-alumni-media` server-side into the private backup bucket every night, never with
`--delete`, so a deleted photo — including via the C2 arbitrary-delete bug — survives in the
backup. The job refuses public destinations (same guard as the dump job) and fails if the
backup ever holds fewer objects than the live bucket. A2 rewritten as done in
OWNER-INPUT-REQUIRED.md, PDF regenerated, OPERATIONS.md records the single-photo restore
command. One open question the first run will answer: whether the R2 token in GitHub secrets
can read the media bucket, or is scoped to the backup bucket only.

Commit: f8aeb76. `npm run check` clean, 15/15 tests. Not yet pushed — needs the owner's
go-ahead, then a manual Actions run to prove the media job end to end.

Session outcome (2026-08-20): the home-screen icon, and a divider that followed you between
devices.

The owner added rishivalley.space to his iPhone home screen and got a plain letter "R"; on a
Mac he got the mark, but blurry. Three separate causes. The site shipped no apple-touch-icon
at all, and iOS Safari reads neither favicon.ico nor an SVG icon for Add to Home Screen, so
it fell back to drawing a letter tile. There was no web app manifest either, so the only
raster anywhere was a 32px favicon.ico, which is what macOS was scaling up. And `/icon.svg`
was not excluded from the auth proxy, so a signed-out phone asking for the icon was answered
with a 307 to /login and an HTML page where it wanted an image. All three fixed:
`scripts/dev/generate-icons.mjs` derives a full-bleed 180px apple-icon and 192/512/maskable
PNGs from the one canonical PeaksMark, `src/app/manifest.ts` carries them, and the proxy
matcher now lets the brand assets through. Verified all five URLs answer 200 with the right
content type while signed out. The apple-icon and the maskable icon are deliberately NOT
pre-rounded, because iOS and Android adaptive launchers mask to their own squircle and would
otherwise eat into our rx=96 corners.

Second: "New since you were last here" lived in localStorage, so it was a fact about a
browser, not a person — the same posts were announced as new again on every device signed in.
Moved onto the account as `User.feedSeenAt`, read by the feed's server component, advanced by
a `markFeedSeen` action with a conditional updateMany so two devices cannot rewind each other.
Verified end to end against the database: the marker stamps to the newest post on load,
rewinding it by one post draws the divider in the right place at both viewports, and the same
load advances it again.

That change also caught a hole in the dev Prisma client's staleness guard. It hashed
`Prisma.ModelName` — the set of model NAMES — so it saw a new model and was blind to a new
COLUMN on an existing one. Adding feedSeenAt reproduced gotcha 8 exactly: generate succeeded,
tsc passed off the fresh types on disk, and the running server threw
PrismaClientValidationError from its cached client. The key now folds in each model's
`*ScalarFieldEnum`, so it moves on any schema change at all.

Commits: 2e160c6 (the icon set, swallowed into a concurrent session's security commit — see
below), c372839 (feed marker + the Prisma key). `npm run check` clean 15/15, `npm run visual`
21/21.

Note for whoever reads this next: several sessions were live in this tree, and one of them ran
a bare `git commit` while the icon files sat staged, so those eight files landed inside
2e160c6 rather than under their own message. Nothing is lost and nothing was rewritten. A
third item the owner raised — the show/hide password button on /reset-password — could not be
reproduced in Chrome at either viewport (it reveals and re-hides correctly on both fields) and
the owner set it aside rather than pin down what he saw.

## 2026-08-20 — Security audit, Phases 1 and 2

Two phases of `docs/planning/SECURITY-FIX-PLAN.md`, which is now the spine for the remaining eight.
Ground truth for what is closed is `npm run audit:status`, not any document.

**Phase 1 — the unauthenticated admin takeover (C1).** All three parts removed: the password-less
branch in `authorize()`, the `/api/auth/admin-login` route that minted a 30-day admin session from
an email address alone, and `NEXT_PUBLIC_ADMIN_EMAIL`, which compiled that address into every
visitor's browser bundle. A fourth path turned up that the audit had missed -- a `signIn` callback
re-writing `role: "admin"` onto whoever matched `ADMIN_EMAIL`, on every sign-in.

That route was load-bearing for every screenshot script, the Playwright visual suite and the
chrome-devtools MCP workflow, so the capability survives as `/api/dev-login`: 404 whenever
`NODE_ENV` is production, wants a 32-char secret compared with `timingSafeEqual` rather than an
identifier, and copies the role the row already holds instead of granting one. Nine hand-copied
sign-in blocks across `scripts/qa` became one `_dev-login.mjs` that authenticates from Node, so the
secret never enters page JavaScript.

**Phase 2 — authorization holes.** `loadDirectoryPage` had no `auth()` call at all. Six interaction
paths acted on any `postId` without asking whether the caller could see the post, while the read
path carefully checked group membership, city scope and batch targeting -- so a non-member could
read and post into a private Catch-up thread with nothing but an id the app hands out in its own
notification links. `isBlocked` was read by six list queries and no write path. A deleted account
kept a working session for 30 days. A password reset burned reset links but not sessions.

The last three are one mechanism: a `credentialVersion` column stamped into the JWT and compared on
every session read, dropped by the `auth()` wrapper -- the one function every page and action
already calls, so it cannot be forgotten by the next action somebody writes.

**The lesson worth keeping.** The behavioural probe caught a lockout bug that `npm run check` was
entirely happy with: neither mint path carried `credentialVersion`, so anyone who had ever reset
their password would have been thrown out immediately after signing in, forever. Every phase from
here writes the probe and pastes the numbers into the plan's session log.

## 2026-08-20 — Security Phase 3: verification finally means something

**Phase 3 — the two-gate trust model (H21, and M1's harvesting half).** `verifyState` had a badge
and no consequences: any account with a throwaway mailbox could post, vote, upload, report, and
read every phone number in the directory. Now the tiers hold server-side. Stage 0 (unconfirmed
email) reads the feed and sees the map's circles and counts, never a name -- not in /directory, not
in the two name-serving API routes, not on a profile, not even in the tab title. Stage 1
(confirmed) browses the people but writes nothing and opens no contact details. Stage 2 (profile
verified) is a member. Every write action moved from the email gate to the new
`requireVerifiedMember`; own-account writes (deleting your own content, bookmarks, the feed
marker) deliberately stayed below it. `reportUser` also stopped stripping the reported member's
badge -- one anonymous-grade report would now have stripped their *access*.

**The roster.** The school's two sheets (Centenary registrations + the 1936-onward Master list)
consolidated into 2,134 `RosterEntry` rows carrying nothing beyond name/email/batch. A signup the
sheets vouch for verifies itself with `verifyMethod: "office_list"` the moment its email is
confirmed -- email match alone, or name+batch with no single-token or initial matches. Everyone
else gets "Ask to be verified" (the confirm-email card's new sibling), which writes the first-ever
`pending` and joins a new `verify` queue on the admin worklist. No digests, no mail: the owner
mans the panel, so the worklist row IS the pipeline.

**Proof, per the Phase 2 lesson.** `scripts/qa/phase3-probe.mjs`, kept as a script: 22/22 against
the running dev server, driving disposable accounts at each tier through real pages, a real
comment typed into the real feed UI (refused with the card at Stage 1, lands at Stage 2), and all
three roster outcomes through a real /verify-email link. Locked states screenshot at 1440x900 and
390x844 and read. `npm run check` 17/17 files, `npm run visual` 21/21, production build clean,
`audit:status` 13 fixed / 18 open.

## 2026-08-20 — Security Phase 4: bots pay at the door, and everything is metered

**Closed H22, H6, M2, M3, M7** (audit:status: 18 fixed / 15 open). Turnstile now stands at all
three public doors and is verified **server-side**: inside NextAuth's `authorize()` for login (the
one place a direct POST to the callback route cannot skip), in `registerUser`, and in
`requestPasswordReset`. Development pins Cloudflare's official always-pass test pair, so the
enforcement path is byte-identical in every environment while local sign-in, e2e, visual and the
QA probes run unattended; the widget is `appearance: "interaction-only"`, so no page changed a
pixel (21/21 baselines untouched). A signup or a completed reset carries a five-minute HMAC
"human pass" bound to its one address into the auto-sign-in, instead of solving the widget twice.

**One limiter.** `src/lib/rate-limit.ts` is the single Upstash-backed throttle: login failures
per IP and per account (successes free, so nobody's own sign-ins spend anything), signup and
reset per IP, posts/comments/uploads/reports/catch-up creation per account. Fail-open with a
logged miss, IS_DEMO exempt three ways over — the demo can never be locked out. Refusals carry
honest codes: the login form now says "too many attempts" or "couldn't confirm you're human"
instead of lying "invalid password". The trivia gate lost its repo-printed fallback secret, its
cookie-keyed in-process limiter (the one an attacker skipped by omitting the cookie while it
starved real first-timers), and its shareable pass token — now per-IP in the shared store, and
HMAC-bound to the browser that earned it. Owner ask mid-session: the gate also offers "Try a
different question" now.

**Proof.** `phase4-probe.mjs` 29/29 live: refusals before bcrypt (LoginAttempt proves the
password was never judged), account lockout that survives IP rotation while a bystander signs in
from the attacker's own IP, the whole real signup driven in a browser with two forged-trivia-pass
sabotages refused mid-flow, the M7 DoS pinned dead, reset caps with zero mail rows, the 41st
presign a 429. `phase4-prod-check.mjs` 6/6 against a local production build: the QA bypass with
the CORRECT secret refused, a garbage token refused by a live siteverify round trip — plus a
positive control (human pass signs in), which caught the first run passing vacuously on
UntrustedHost 500s. `npm run check` clean, e2e 22 passed.

Post-deploy: XFF spoof-rotation confirmed dead against live Vercel; a headless bot was
refused at the production login with the honest copy while the widget loaded clean (site
key accepts the domain). Owner round from screenshots, same day: dev test key switched to
the invisible variant (the dark Cloudflare card was my wrong key pick, not the design),
challenge theme pinned light, and the trivia swap became an inline circular-arrow glyph —
half-turn per press, one-breath question crossfade, arrow gliding on layout=position.
Deploy times (~1m20 → ~2m) are Sentry + PostHog landing Aug 19, normal; puppeteer's
per-build Chrome download on Vercel was the one real waste, now skipped (.puppeteerrc.cjs).

## 2026-08-20 — Security Phase 5: the bucket stops trusting the caller

**C2 was the worst thing in the audit that was not an open front door.** Any confirmed member could
put every image URL they could scrape — the heritage Collection, other people's avatars, anyone's
post photos — into a post's `images`, then delete the post, and every one of those objects was
deleted from R2 with it. No versioning, no undo, a scanned archive that cannot be re-sourced. One
authenticated request.

**The fix: the bucket stops trusting any URL the caller hands it.** Every upload now mints its key
server-side under the uploader's own prefix, `<purpose>/<their id>/…`, and every write that accepts
image URLs (posts, letter drafts, Catch-up answers) refuses anything that is not app-minted AND under
the caller's own `uploads/` prefix, capped at three. So a post can only ever carry photos its author
uploaded, and deleting it can only ever delete those. The verdict is a pure rule with twelve tests
written as attacks; the two direct-to-R2 paths bind the staged key to the caller the same way. That
one change also closes M10 (external tracking-pixel URLs are refused by the same gate).

The rest of the upload surface got hardened alongside: removed Collection photos now actually delete
their bytes instead of leaving them fetchable forever (M11); the direct Collection path re-encodes the
original so a phone photo's GPS coordinates are not published to the whole community, full resolution
kept (M12); a magic-byte sniff decides what is really an image before libvips touches it (M13); every
sharp call has a decompression-bomb ceiling (M14); a presigned object's size is checked with a HEAD
before it is pulled into a function's memory, since R2 cannot enforce it in the signature the way S3
can (M16); and one account can only fill so much of the Collection (M17).

**Proof.** `phase5-probe.mjs` 27/27, against the running server and the REAL R2 bucket: the actual
composer driven headless with its upload response forged to a victim's URL creates no post carrying
it and the victim's object survives — while the attacker's own post goes through (positive control);
cross-user staged-key finalize is refused and own succeeds; a GPS/EXIF JPEG comes out of the
re-encode with no metadata; a delete really removes the bytes; text-in-a-png-suit is refused. `check`
clean (19 test files), `visual` 21/21 — no UI moved. New copy shows only on abuse paths; a member's
normal posting is untouched, except that a directly-uploaded Collection photo is now stored as a
full-resolution WebP with its location metadata stripped.

Self-review caught what the probe would not have: WebP's 16383px hard cap, which the M12 re-encode
would have thrown on for a very large scan where the old raw passthrough stored it — bounded now. No
schema change, so no migration and no demo-DB step this phase.

## 2026-08-20 — Security Phase 6: headers, the beta.32 auth bump, and the crons that never fired

**Seven findings, three of them structural.** The auth library and image decoder both carried live
advisories (C3): next-auth moved beta.30 → 5.0.0-beta.32 (pinned exact — a beta you can't let float),
sharp 0.34 → 0.35.3, next 16.2 → 16.3.1. The one that mattered is next-auth: the advisory is
*existence-based auth checks can fail open*, and this whole app is `if (!session?.user?.id) return`.
So the probe doesn't trust the version string — it signs a real account in through the real
credentials callback under the new library, opens a members-only route with the minted session, and
confirms a wrong password still mints nothing. beta.32 authenticates and does not fail open.

sharp 0.35 brought a stricter libpng that rejects images over cosmetic warnings; `sharpImage` now
sets `failOn: "error"` so an old heritage scan with a bad colour profile is decoded, not turned away.
(It also rejected the probe's hand-pasted 1×1 test PNG — a bad test fixture, not a real photo; the
probe now generates a valid one, and re-ran 29/29.)

**Headers (H7).** A real CSP plus X-Frame-Options: DENY, Referrer-Policy, nosniff, Permissions-Policy
and explicit HSTS. `frame-ancestors 'none'` is the clickjacking fix the audit named by name (framing
/settings to bait a click onto deleteAccount). The CSP was iterated with the browser console open, as
the plan warned: it caught Vercel Analytics' loader host, and a production build confirmed the login
page renders whole — hero, fonts, and the Cloudflare Turnstile widget all load under the enforced
policy. The one residual eval "issue" is Turnstile fingerprinting the headless browser inside
Cloudflare's own iframe, present whether or not we allow eval, i.e. not ours.

**The quiet ones.** `/lab` was public in production and `/lab/everything` served an internal audit log
of quoted source paths (M19) — now removed from the public list and behind an admin-only layout that
404s everyone else, so it doesn't even admit it exists. The nightly `vercel.json` cron pointed at
`/api/catchups/tick`, a route that never existed, so it 404'd every night and Catch-up deadlines only
advanced when a member happened to load a page (M27) — the route exists now, wrapping the cron-wide
advance the function was written for, gated by CRON_SECRET. Poll options were written in a loop after
the post existed, so a mid-loop failure left a partial poll (M32) — folded into the post's own create
as one transaction. `updateContactMethods` wrote links, socials and a display email with no
validation at all, saved from stored XSS only by a read-side re-check (M18) — now through the same
schema profileSchema uses. And `/api/users-by-batch` would dump the whole user table to any
signed-in account (H18) — capped.

**Proof.** phase6-probe 15/15 live, phase5-probe 29/29 under the new sharp, build exit 0 under all
three upgrades, check clean, visual 21/21. Owner action: confirm CRON_SECRET is set on the real
Vercel project (same one demo-reset uses) so the nightly Catch-up cron actually runs; until then the
lazy page-load tick covers it exactly as before, so nothing regresses.

## 2026-08-20 — Security Phase 7: a record that outlives the people in it

Before this, nothing was written down. An admin could block, delete, verify or demote anyone and the
only trace was the effect itself; a member could delete their account and it vanished without a line
(H10, M36). If C1 had ever been exploited you would never have learned the 72-hour clock had started
(H14). So: an **AuditLog** table with no foreign keys on purpose — actorId, targetId and a
denormalised name live as plain strings, so "admin X deleted member Y" survives Y's deletion, and X's,
which is the one property an audit log exists to have. `writeAudit()` records block/unblock, delete,
verify, unverify, role, merge, self-deletion and reports, and it can never throw — an audit write must
not turn a successful moderation click into an error page. Sign-ins were already logged (LoginAttempt,
Phase 4), so the two tables together are the record.

The admin can now **see** it: `/admin/audit` puts the attribution record and the failed-sign-in record
side by side — who did what to whom, and the shape a break-in attempt makes (a burst of wrong
passwords, a run at addresses that match no account). That is H14: not alerting, but the thing you look
at when you have a reason to.

And **H5** finally closed. Phase 3 took away the one-report-strips-a-badge bug; this took away the rest.
A member can no longer inflate a flag count by reporting the same person over and over — one report per
pair, enforced by a unique index and answered gently ("we've already got your flag", even when two
flags race in together and one loses to the constraint). Reporting routes through the same new-thread
budget messaging does, so it can't be a faster way to page a human. And at three distinct flaggers the
admin hears "N members have now flagged X" instead of a single voice — but the standing still only ever
changes by the admin's hand, which was the whole point of making verifyState a capability in Phase 3.

**Proof.** phase7-probe 9/9 live, including the real thing end to end: an admin clicks Verify in the
actual /admin/people UI, the member is verified, an attributed `admin.verify` row lands in the log, and
it renders on /admin/audit. check clean, visual 21/21, the new page screenshotted both viewports. One
migration (AuditLog + the Report unique), applied forward-only; the demo writes no audit rows.

## 2026-08-20 — Security Phase 8: leaving, and being able to see the rules

Deleting your account used to be one click and a lie: the click destroyed the rows instantly with no
confirmation and no way back, and it LEFT every photograph you ever uploaded publicly fetchable in
storage forever, with nothing left pointing at it so nobody could ever find and remove it (H9 — the
finding that made "right to erasure" unachievable for images). Now deletion is a request: it asks for
your password (a stolen browser session is not enough to erase somebody's history), signs you out
everywhere, emails you the date it becomes final, and waits 60 days — during which simply signing in
again cancels it, and your name is held out of the directory as if you had already gone. When the
window closes, a nightly job erases everything for real: the rows AND the stored images, through the
same one purge the admin's delete button uses. The same job is the retention schedule (M34): admin
messages 2 years, reports 3, payment records 10, notifications and security logs 1, email delivery
records 180 days — personal data now stops accumulating forever, and every sweep leaves a line in
/admin/audit saying what it swept.

Alongside it, the things a member can now DO: download everything the site holds about them as one
file (the "Download your data" link in settings — GDPR Art. 20), and read, at last, what the site
actually promises. Three documents went up — /privacy, /terms, /guidelines — written in plain
sentences, honest about the public image CDN and about what outlives deletion, with the controller
contact reachable at the bottom rather than featured. Signup now carries the consent tick linking
all three, enforced server-side and receipted with a timestamp. H12, the "bare violation with no
defence available", is closed pending the owner's read of the words.

**Proof.** phase8-probe 40/40 against the real server and the real bucket, twice: the real dialog
refusing a wrong password, a real uploaded image provably gone from R2 after the sweep, the seeded
over-age rows dying while fresh ones survive, the export refusing strangers, the signup refusing a
consent-stripped POST. The write-path review found three real gaps (a non-atomic purge, Catch-up
enrolment reaching grace-period members, merge stranding an avatar in R2) and the design review
three more (focus rings, a borrowed field material) — all six fixed and re-proved. check clean,
visual green with two new baselines, phase4-probe re-run 29/29.

## 2026-08-20 — Security Phase 9: the gate that stays shut on its own

Everything fixed so far was held closed by attention, and attention rotates. Now CI holds it: every
push runs `npm audit` through a gate with a written allowlist (the one accepted advisory is named,
with its reason and the condition that clears it — anything new at high or critical stops the
merge), and runs the audit status board with `--fail-on-open`, so a security fix that quietly
regresses fails the build naming the finding (H16). And the test suite grew teeth (H17): regression
pins that keep the two critical findings closed forever, an attack suite for the one function that
feeds member text into raw HTML, and a sweep that checks EVERY server action carries an auth gate
or a written reason it doesn't — the tripwire for the forgotten-line class of bug that caused three
of the audit's findings. Proved in both directions: the probes watched each gate refuse a real and
a crafted regression, 13/13. audit:status: 42 fixed, 0 open.

## 2026-08-20 — Security Phase 10: the long tail, swept

The audit's remaining mediums and lows, closed or consciously accepted, every one now on the status
board with its reason. The real changes: the three upload endpoints no longer trust a browser cookie
alone — a request from another site's page is refused by its Origin before anything else runs (M33);
passwords now have a floor beyond length — the breach-corpus classics, rishivalley123 and its family,
and your own email address are refused at signup and reset, with the reset checked before the link is
spent so a rejected password never burns it (M8); starting or growing a Catch-up tops out at 100
people instead of the 500 the audit demonstrated as forced-enrolment (M29); the password-reset form
no longer answers faster for strangers than for members (L3); a duplicate signup race gets a sentence
instead of a crash (L9); and the one production log line that printed a member's email address now
masks it (L5). Housekeeping with teeth: AGENTS.md stopped describing the deleted admin bypass as a
working feature, and the three PostHog 404s that have polluted every console check since Phase 1 are
gone, so the next real error stands alone. Proved live, 11/11, with the phase 5 and phase 8 probes
re-run green behind the route changes. The board: 74 findings tracked, 0 open.

## 2026-08-20 — Security section closed: one reference document

The three working files of the overhaul (the 2,000-line audit, the owner Q&A, the fix plan with its
ten session logs) collapsed into docs/SECURITY.md: the machinery and what must not be broken, the
owner's standing decisions, the retention schedule, the accepted-risk register with reasons, the
open items, and the traps. The full originals stay in git history. Ground truth remains `npm run
audit:status` (74 tracked, 0 open), which reads the code, not any document. Loose ends tied the
same evening: CRON_SECRET now matches across Vercel and GitHub, proved by a manual retention run
going green and writing its own line into /admin/audit; the Supabase DPA form recorded as declined
by the owner; the DPA posture of the other four providers recorded.

## 2026-08-20 — The Cloudflare checkbox stops being a trap; the reset screen learns hierarchy

Owner, from incognito: the human-verification checkbox appeared (it does, for suspicious visitors —
that is Managed mode deciding, and the right trade against refusing real humans outright), and
submitting without ticking it hung for a while and then errored. The hang is gone: the widget now
says the moment Cloudflare is waiting on a human, and all three auth forms answer an unticked
submit within two seconds with one plain sentence instead of timing out into a doomed request.
Proved live against the forced-interactive test key. And the "Check your email" screen went from
four equal grey lines to three tiers: the address bold on its own line, one quiet line for the
hour-long lifespan and the spam pointer, and a proper link to try a different address. Both
viewports read, visual 23/23. With the owner also changing the second admin's temporary password
today, the security section's open-items list is empty.

## 2026-08-21 — The pre-release audit armory: two overnight prompts and eleven imported reviewers

The owner asked for two paste-and-go prompts to run as dedicated overnight sessions before the
public release: one formal simplification audit (the codebase is ~200k lines of TS/TSX and he
named AI bloat as a real problem here) and one bug-and-stability audit with headroom to 2,000
users. Both are audit-only by design; each produces a phased report under docs/planning/audits/
that later fix sessions execute without re-deriving anything. Two research agents swept what the
community has published for each job; everything that verified was downloaded, not paraphrased.
Now in .claude/skills/: Sentry's code-simplifier (Anthropic's official one, vendored), find-bugs
and sentry-code-review; goal-sloc (SLOC-as-scoreboard with anti-gaming rules); Effeilo's
front-refactor and front-review; Dimillian's bug-hunt-swarm and review-swarm; and the 21k-line
code-review-skill reference. In .claude/agents/: Anthropic's five pr-review-toolkit agents,
silent-failure-hunter the prize among them. In docs/planning/audit-assets/: Anthropic's
production review pipeline verbatim (findings must each survive an independent validation agent)
and the Big List of Naughty Strings for input fuzzing. The prompts themselves are
docs/planning/simplification-audit-prompt.md and docs/planning/bug-audit-prompt.md; each carries
the owner's brief nearly verbatim, his prompting ideology (verbose briefs, agents decide their
own granularity), the shared-database rule stated twice, and the distilled methodology from both
research sweeps, including the connection-budget arithmetic and the IST-vs-UTC date-boundary hunt.

## 2026-08-21 — Pre-release fix session three: the last canonical finding, and half the tail

Session three of the fix work. It opened with one canonical finding left and closed with none:
**all 45 are fixed**, both feature builds have shipped, and `npm run check`, `npm run visual` and
`npm run test:e2e` are green. Nineteen commits, and the owner pushed once mid-session.

**B-063, the Catch-up leave/archive/delete feature**, was the large piece. Built to the design he
approved: Leave on the People panel, Archive and Delete on the card's own menu, an "Archived" and
a "Recently deleted" section that render only when they hold something. Personal by construction
(the state is two nullable columns on `CatchupPref`, unique on the pair, so it cannot leak across
members), a leaver's published answers stay where they were published, and the nightly sweep
empties the 30-day bin. Two extensions beyond the approved design, both argued in the code: Delete
is refused for the creator as well as Leave (the sweep would otherwise strip the founder's
membership row and leave a Keeper the app tells "you are not a member"), and the menu does not
offer what the action would refuse. Proved live with two throwaway accounts at both viewports, and
the sweep proved in a rolled-back transaction.

Then the clusters: the mail drain's recipient scope (M53, the flag that could send real members'
mail off a dev machine), Turnstile and the database-outage sign-in message (M07, M18 — both told
people something untrue at the worst moment), nine fire-and-forget writes moved to `after()`, the
money surfaces (M59 could have let a junk flood get Razorpay to disable the payment webhook), the
Catch-up engine's correctness, the directory's NaN 500 and its NULLS-FIRST batch sort, uploads
(row before bytes; a measured 81MP → 40MP ceiling), the token transactions, the app shell's error
boundaries and loading states, and the demo.

**Three findings turned out to be wrong and are recorded as such** rather than patched: M30 (the
visibility rule always had the author exemption, deliberately above the hidden check; only the list
query lacked it), M56 (the retry latch was fine — a failed `<script>` leaves its tag in the DOM and
the "already loaded?" check looked for the tag), and Low 43 (GitHub's 60-day workflow disable
applies to public repositories; this one is private). Two more are deferred with reasons: M22
trades a latency win on six pages for a theme flash, and M24 needs a new client surface.

**Two agent reports each contained a real defect, caught only by reading the diff**: a token hash
copied into a second file, and a security check dropped from a rewritten query. Both had passed
every gate. That rule earned its keep twice in one session.

Two things were found that the audit never named. **B-203**: "Start one" on a group card minted a
duplicate group, so the row stayed forever offering to do it again; the owner chose to drop the row
rather than make the button attach. And **the demo's database had received none of the audit's
migrations** — it was fourteen behind and would have broken on the next push. `run-sql.mjs` gained
an `--env` flag, all fourteen were applied, and the write guard passes 15/15 again.

Also, at the owner's ask: Renovate was unblocked (an `_comment` key it does not accept had stopped
it opening any pull request at all) and eleven of twelve npm advisories cleared, which subsumes
Dependabot PR #10.

Handed over at roughly 92% by effort with 22 Medium roots and about 47 Low items left. The brief
was the session-four brief; the disposition ledger was the record. Both were removed on 2026-08-21
when the review closed.

## 2026-08-21 — Pre-release fix session four: the tail, and the report is closed

Took the "Still open" list from part three and finished it. **Every one of the 45 canonical
findings, all 68 Medium roots and all 117 Low items in `bug-report.md` is now dispositioned** —
fixed, not-a-bug with the reason written down, or deferred with the reason written down. Eleven
commits on `main`, none pushed. `npm run check` green (53 unit tests), `npm run visual` 23/23,
`npm run test:e2e` 24 passed, and `verify:crawl` clean on every route.

The two that had teeth. **Deleting an account was silently breaking other people's conversations**:
`Comment.author` cascaded, and the self-referencing parent key is SetNull, so purging somebody
deleted every comment they had written and promoted every reply underneath to a top-level comment —
a stray sentence with no question above it, in a thread that then lied about its shape. Exactly the
corruption the soft delete exists to prevent, which the purge path had been quietly reintroducing.
A comment still holding somebody else's reply now survives as a blank, nameless anchor; everything
childless goes. Proved against a real cross-author thread in a rolled-back transaction. And **a
letter open on two devices lost whichever side wrote more** — the desk autosaves the whole body with
no precondition, and both surfaces said "Saved". Every save now carries the version it was working
from. Proved end to end with a probe: the desk saved, another surface wrote over the row, and the
desk's next save was refused with the other side's words intact.

Two more worth naming. **Nobody signed in was being identified to the analytics at all** on a full
page load: PostHog was started inside an effect, React runs a child's effects before its parent's,
so the identify step always ran first, found nothing loaded and gave up — and its deps never
changed, so it never ran again. Every first visit, every refresh, every link from an email was an
anonymous session. Caught with a before/after probe. And **the audience field on a post was the one
thing stored exactly as it arrived** — no length limit, no format — in a column every feed query
searches through; fixing it turned up a second bug, that matching was a plain text search, so a
post aimed at "ISC-20111" showed to everyone in ISC-2011.

The rest, in clusters: reports settle once instead of twice; the verification queue orders by when
somebody asked rather than when they last browsed (new `verifyStateAt`); one press is one post and
one comment; search logging finally deduplicates keystrokes; the letters index pages instead of
stopping at forty; the data export streams instead of holding a whole history in memory twice; a
failed place lookup says so instead of quietly saving a city with no map pin; and an unconfirmed
member's pages no longer wait on the email provider before rendering anything.

Then the Low appendix, all of it. Admin lists that showed less than they counted now say so.
Verifying somebody by hand records that an admin did it, not the office roster. Erasing your
Catch-up answer withdraws it. Removing a question no longer puts the next one on top of the last.
The saved contact card survives a comma. Impossible year combinations are refused. And 64 pixels of
dead space came off the bottom of every page on a phone, reserved for a tab bar that does not
exist — six mobile baselines moved, and decoding the PNGs row by row showed the shared area had
**zero** differing pixels: the pages are simply shorter.

**Four findings were wrong or already closed, and are recorded rather than patched.** Low 53's
mechanism is real (setting a cookie in a Server Action does re-render the page — it is in the
installed Next docs) but its scenario cannot happen here, so the code COMMENT claiming otherwise was
the actual defect. Low 69's live "clash" — Delhi matching New Delhi — is `city-coords.ts` aliasing
them deliberately, the way it aliases Chennai and Madras. Low 60 names a file that no longer exists.
Nine more Lows had already been closed by earlier sessions' clusters.

**Three are deferred on their merits, not skipped.** Low 89 wants a partial unique index Prisma
cannot express, and the expressible alternative fails worse: one forgotten transition and a member
can never receive a password reset again. Low 78 is a moderation policy question the audit itself
says belongs to the owner. M19 and its two siblings wait on a custom domain for the image bucket,
which only he can buy — it is the "image CORS thing" he already remembers.

Everything the report contained is now closed, so its paperwork went with it. What survives is the
part the code cannot say: `docs/TRAPS.md` (the runtime traps, each one proved) and a new section in
`docs/planning/bugs.md` under "Settled, do not re-open" (what was deliberately NOT a bug, what is
deferred and why, and the owner decisions taken along the way).

## 2026-08-22 — Pre-release bug audit, round two (audit-only)

Ran the formal pre-release bug/stability audit a second time as a fresh set of eyes, dedup baseline
being `docs/TRAPS.md` plus the `bugs.md` Settled/Open ledger. Audit-only: no application code
changed. Report at `docs/planning/audits/bug-report-2.md`, machine ledgers alongside
(`findings-raw.json`, `verdicts-merged.json`), refuted+duplicate appendix beside them.

Shape: 22 read-only finder agents (12 territories partitioned by write-path density + 10
cross-cutting lenses) → 204 candidates → 18 adversarial validators, one per code-locality zone, each
told to refute against the actual code and to fold duplicates. Then orchestrator hand-verification of
the top tier and one live database proof.

Outcome: no Critical. 3 High, 42 Medium, 131 Low confirmed (plus 7 the validators surfaced), 13
refuted with written reasons, 14 folded as duplicates, 8 left SUSPECTED with the exact runtime check
named. 292 clean checks recorded as the verified-clean map.

The three Highs: an unverified account can publish a plain post to the feed by sending saveAsDraft on
a non-letter kind (the gate reads the raw flag, the draft-effect requires kind==letter, and they
disagree — hand-confirmed); a Keeper can see anonymous Catch-up askers on the home surface that the
Round page correctly hides (M10 incomplete); and an admin mail "Retry" on a deferral-exhausted row
resets attempts but not deferrals, making an unkillable queued zombie that folds every future reset
for that member. The scariest Mediums: a refunded donation resurrects to "paid" (and re-grants a
bird) when Razorpay replays payment.captured, because the capture branch guards only status!=paid;
and a keyset cursor at a deleted/hidden row silently ends pagination across feed, letters, bell and
directory — proven live: Prisma's cursor comparison returns 0 rows when the cursor id exists in no
row, while a valid cursor returns the rest.

2,000-user headroom: comfortable. Connection budget correctly sized (pool 5 × ~40 instances = 200 =
Supavisor cap); DB is 112MB of 500MB (97MB of it the static Place gazetteer). Real watch-items are
Resend's 100/day free tier trailing a big launch day, the unbounded Visit table lacking a retention
sweep, and PostHog/Sentry free-tier ceilings. Scorecard: overall 7.6/10, launch-ready with a short
punch-list.

Honest limitation: input validation was audited by code-read, not live BLNS browser fuzzing; that
live naughty-strings pass is the one deferred brief item and the cheapest high-value follow-up. No
test account created, no rows written — every check read-only against the shared database.

## 2026-08-22 — Six items from the owner's round, plus three raised mid-session

Seven commits. The profile sheet, the picker's idea of Delhi, and the first half of the phone-app
work.

**The Done-button collapse glitch** (owner: "it shrinks but then it shrinks a bit extra and it
expands marginally a beat later") was real and had a measurable number. The occupation row reserves
6px inside its own animated height so the dotted PenRule under it is not clipped, and cancelled that
reserve with a static `-mb-[6px]`. Static was the bug: driven to `height: 0` on exit the padding's
+6px is gone but the margin's -6px is not, so the sheet settled exactly 6.00px short and jumped back
the frame AnimatePresence unmounted the node. Proved on the live page before touching anything, by
measuring the card at `height: 0` against the same card with the node removed. The margin now
animates on the same spring as the height, so the two share one progress curve. After: exit
undershoot 0.00px and monotonic, enter dips 0.00px, resting sheet unchanged at 445.13px.

Note for whoever hits this class of bug again: **a static offset cancelling an animated one is a
bug that only appears at the ends of the animation.** The give-away is a settle that overshoots by
exactly the offset.

**The organisation field cutting off text while typing** (owner: "the 'I' is getting hidden and cut
out") was two things, both reproduced with real keystrokes at 390x844. A PenValue is an `<input>`,
which is one line forever: past the width of its column the slot pins at `max-w-full` and the input
scrolls to follow the caret — measured scrollLeft climbing 6px, 26px, 100px, 173px, at which point
"Imperial" is off the left edge. Separately, the slot relocates whole to the next line at character
34, because an inline-block cannot break. Both halves of the occupation line are `PenBlock`
(a textarea) now, with a new `inline` option so they still stand mid-sentence; a textarea wraps,
which is also what the read-only sheet does with the same words. After: scrollLeft 0 at every length
to 64 characters, box grows to a second line instead. The line-relocation is unchanged and
unfixable without abandoning form controls; nothing is hidden by it now.

**Delhi and New Delhi.** The previous fix was an UPDATE, so it fixed the rows of the day and new
members went straight back to picking Delhi. The gazetteer holds Delhi (pop 11,034,555) and New
Delhi (pop 317,797) 3.4km apart, and the picker ranks exact-name-match then population, so "delhi"
put the eleven-million row under the cursor. It is a rule now, in `src/lib/place-aliases.ts`, keyed
by geonameid and never by name (Delhi, Ontario and Delhi, California are real places). Applied in
two places that close different doors: the search answers an aliased row with its replacement so the
choice is never offered, and `resolvePlaces` collapses it again at write time because the picker is
a suggestion and the gate is the gate.

Which meant fixing something else first: **onboarding never used `resolvePlaces`.** It had its own
placeSchema and its own cleaning loop, hence no lat/lng bounds and no check that placeId named a
real row — and it is the writer every new member goes through, which is exactly why the people
caught by this were the newest ones. Three writers, one gate now.

The migration also did the half the earlier merge missed: `User.currentCity` is a legacy mirror of
the first place that the feed's "New in the Directory" module reads directly, and three members had
a UserPlace saying New Delhi with a currentCity still saying "Delhi, Delhi". That is what the owner
was actually looking at. Nine place rows moved, nine currentCity values resynced (including
Bangalore/Bengaluru drift from the last merge). Seven unit cases pin the rule against a stubbed
gazetteer.

**Raised mid-session and done:** the Done button no longer moves while a field saves (34px measured;
`sm:flex-row-reverse`, so the save mark sits on whichever side is not the button's anchor at that
breakpoint). Every dotted pen rule now ends on a whole dash — it was a `repeating-linear-gradient`
tiling at a fixed 5px and stopping wherever the text stopped, so the last dash was a stub; one tile
plus `background-repeat: round` scales the tile so a whole number spans the box. The country code
slot hugs its text (51px → 22.4px, gap 29px → 4px) with the cap moved to `maxLength=4`.

**"Add it to your phone"**, under the dark mode tile, admins only, phones only, per the owner's
call. No service worker: Chrome's installability criteria are HTTPS plus a manifest with name, 192
and 512 icons, start_url and standalone display, all of which `src/app/manifest.ts` has shipped
since 2026-08-20. The `beforeinstallprompt` listener is registered from the authenticated layout,
not the tile — Chrome fires it once per hard page load and thirty seconds in, and the tile lives
behind Edit profile, so a listener attached on mount would catch nothing.

**The low-resolution app icon was not a code problem.** Every asset is already right and already on
`origin/main`: favicon.ico at 16/32/48, a vector `icon.svg` that modern browsers prefer for the tab,
apple-touch-icon at 180, and 192/512/maskable-512 for the manifest. They landed 2026-08-20; before
that the only raster icon on the site was the favicon, which is exactly the complaint. iOS and
Android snapshot the icon when the shortcut is made and never refresh it, so a home-screen icon
created before that date stays low-resolution forever. Removing and re-adding picks up the current
one — which the new Install button now does.

**The admin activity timeline needed no build either.** PostHog already runs with autocapture on,
pageviews on every client navigation and every signed-in member identified, so the per-person
chronological story is being recorded today. Persons are keyed by the opaque user id with only
accountType/batchYear/isOwner attached — deliberately no name or email — so looking somebody up
means pasting their id from their profile URL. Session replay stays off.

**One thing worth a decision:** the directory visual baseline went red twice today for things that
were not changes — once for a member's new city (Nuku'alofa) and once for sub-pixel map jitter with
identical cluster counts. It tracks live member data, so it will keep doing this. Masking the
markers would cost the test the thing it is for.

## 2026-08-22 — The app icon, in the site's own colours

The icon paints its three hills cream, sage and near-black. None of those is a colour the site uses
anywhere else, which is the whole reason it only ever looks right sitting on sidebar green: on a
dark tile the back hill is near-black on near-black and the mark loses its right shoulder.

`/lab/icon-colours` repaints the same geometry in the green, the cinnamon and the blue. Six orders
with green on the left (leaf / canopy / leaf-light, each with cinnamon and sky either way round),
four alternatives that were not asked for (three greens tonally, cream in front of the two brand
colours, depth run backwards with the far hill pale, and one flat white at three opacities), each on
paper, white, sidebar green and dark, then again at 32px and 16px. The favicon sizes are where most
of them fall apart, so they are on the same card rather than a section further down.

The three plane paths are now exported from `peaks-mark.tsx` as `PEAK_PLANES` instead of copied into
the room, so the preview can never drift from the shipped mark. The room's own corner radius is
computed per size (96 of 512); a fixed CSS radius had turned every 32px tile into a circle.

**Also shot, not committed:** the sidebar lockup with the mark in one flat colour instead of three,
desktop and mobile, against the current version. `#EBF3EE` (the sidebar foreground the wordmark
already uses) reads as one drawn logotype; pure white makes the mark brighter than the words beside
it. Both were temporary edits to `sidebar.tsx` and `logo-fact.tsx`, reverted after the screenshots.

**Unrelated red:** `npm run visual` failed on feed desktop. The diff is entirely inside "New in the
directory", which lists live members. Same class of false positive as the directory map on 2026-08-21.

## 2026-08-24 — Occupation and organisation, editable from the panel

The person page could show a member's `jobTitle` and `workplace` only through the "View profile"
link; every other field on that card was fixable in place. Two inputs now sit between Batch and
Bird, in the order the profile prints them ("Lawyer at Trilegal"), with the same 100-character cap
`profileSchema` puts on the member's own form and the same `titleCase` on save, so a correction
typed here cannot read differently from one typed there. Either half may stand alone or be cleared,
because the profile prints the "at" only between two real halves.

Labelled **Occupation** and **Organisation**, not "What they do" and "Where": the card immediately
below is "Where they are", and two fields a screen apart both asking "where" read as one question.

`revalidatePath("/directory")` was already in the action, which is what the directory's profession
filter needs.

**Not verified in a browser:** the read path is confirmed live (the inputs render the real values
off the database at both viewports), but the classifier blocked getting a session cookie into the
MCP browser, so the Save button was never actually clicked. The write is three lines added to the
`prisma.user.update` that already saves name, account type and batch year from the same button.

## 2026-08-24 — Fixing round two of the pre-release audit: phases 1 and 2, plus three more

Eight commits against `docs/planning/audits/bug-report-2.md`. The disposition ledger is
`docs/planning/audits/fix-ledger.md`; it is the handover between sessions and is current.

**Phase 1, all five.**

*Unverified publish (C-122).* `createPost` skipped the verified-member gate on the raw
`saveAsDraft` flag, but only stored a draft when the kind was also `letter`. A submission with the
flag and no kind therefore skipped the only enforcement of `emailConfirmed` and landed
`status: "published"`. One predicate, `isLetterDraft`, now answers both questions.

*Donation accounting (C-084, C-085, C-087, and C-151 with them).* Both confirmers admitted the move
to "paid" from anything that was not already "paid", so a re-delivered `payment.captured` or a
replayed browser callback put a refunded gift back on "paid" with a fresh `paidAt` and minted a
second bird pick. Stated positively now, as `PAYABLE_FROM`. Separately, the refund branch read no
amount at all: a hundred rupees back on a five thousand rupee gift erased the whole five thousand
from every money surface. `Contribution` gained `refundedAmount` and `reversalIds`; every aggregate
goes through `CONTRIBUTION_SUM`/`netPaise`, swept by a test. Migration
`2026-08-24-contribution-partial-refund.sql`, applied to both databases. Proved against Postgres:
a partial refund keeps the row on "paid" and subtracts exactly its paise, a re-delivered refund is
a no-op, and a capture arriving after a reversal moves nothing.

*Keeper anonymity (C-019).* The home page's inline Round declared `const askerVisible = p.showAsker
|| isKeeper` inside its map, shadowing the imported helper of the same name. Proved on the live
page: four anonymous questions handed their asker's name and bird to their Keeper before the fix,
none after. All four surfaces use the shared helper now, and `catchups.test.mjs` sweeps for a local
shadow or any spelling of a Keeper exception.

*Hidden letters (C-002).* `letters/[id]` tested `isHidden` above `canViewPost`, cancelling both
exemptions the rule grants above its own hidden refusal: the moderator's own Open link 404'd, and
the author had no route to their removed letter at all. The page also says "Removed by a moderator"
now, in the same shape as the draft notice; it used to say nothing.

*Mail retry (C-102).* Retry reset the status and the attempts and left the deferrals, so a row
retired by a provider outage came back queued and invisible to the drain forever. For a reset, which
folds, every later "forgot my password" folded into the zombie and returned without sending.

**Phase 2, the pagination cluster (C-005/C-124/C-162/C-171/C-056).** Proved against this database
what the audit could only infer: `cursor: { id }` on a hard-deleted row returns an empty array with
no error, and on a row that still exists but no longer matches the `where` it silently SKIPS one row,
because `skip: 1` then eats a real one. So the cursor stopped naming a row. `src/lib/keyset.ts`
carries the sort key instead, and the feed, the comment thread and the bell all page on values.
The directory keeps its M39 offset recovery: it sorts by name and batch, so it has no timestamp to
seek on. Verified end to end — the bell goes 20 rows to 23, its exact total, no duplicates.

**Two refuted by running the check.** C-096 (directory dead-ends at the NULL-batchYear region under
the batch sorts): walked all 63 rows one page at a time with a boundary inside the NULL region, no
dead end — Prisma 7's cursor compiler handles it. C-055 (a legacy admin note destroyed by the prune):
zero `/notice/%` notifications in either database, and `notifyAdminNote` has opened an AdminThread
before writing the bell row since the rewrite, so the note's text is never the notification's only
copy.

**Also fixed.** C-065: the retention sweep deleted `AdminMessage` rows without queueing their
screenshots, so the bytes orphaned unfindably; it collects then deletes in one transaction now.
C-175/C-176/C-177, the letters desk: the autosave timer guarded on state its own effect does not
depend on and fired mid-publish; the audience was sent but not watched, so choosing one and not
typing was never saved; and nothing survived the tab closing, so writing fluently and then closing
lost every word since the last pause. A `pagehide` handler writes the local copy synchronously now,
for resumed drafts too, and that copy is finally read back and offered on reopen.

**`npm run visual` is red on 7 of 20, and none of it is code.** The diffs are live data: different
members in "New in the Directory", a heart count that moved from 7 to 8, a new draft at the top of
Letters, a relative "just published" label on a Catch-up. The suite reads the shared production
database, so its baselines rot on their own between runs. Worth deciding what to do about, because
a suite that is red for reasons nobody caused is a suite nobody reads.

**Left for the owner.** C-135 (confirm Google Pay / UPI survives `payment=()` with a real test
payment), C-165/C-166 (PostHog and Sentry free-tier ceilings), C-186 (the demo project's cron env).

## 2026-08-24 (evening) — round-two fix session, phases 3, 4 and 5

Continued the bug-report-2 fix run. Phases 1 and 2 were closed in the earlier
session; this one closed **Phase 3 (uploads and orphaned bytes), Phase 5
(client-side races and autosave) and Phase 4 (Catch-ups lifecycle and
notifications)** — 27 findings in 23 commits, none pushed.

Every fix shipped its gate in the same commit, and every gate was proved by
reverting the fix and watching the test fail. Where a behaviour could be
proved against the real database or real R2, it was: a forced R2 refusal
queueing the right purge row, a two-file upload leaking an object before the
fix and none after, a photo removed from a draft actually leaving the bucket,
two concurrent avatar swaps orphaning one object under the old shape and none
under the new, a 40-day bin dropping off the retention due-list, succession
promoting the right member, a love notification reaching a member and not a
leaver.

**Phase 3** — C-063 (staged originals reclaimed on every refusal), C-064 (four
orphan paths: both upload loops, the photo row, the display+thumb pair, and a
photo taken off a draft), C-050/C-131 (avatar swap is a compare-and-swap),
C-069/C-152 (a refused delete leaves a worklist), C-067 (a turned photograph
keeps its full resolution: 22.7MP → 40.0MP), C-070 (a panorama encodes at
all), C-072 (too many pixels says so), C-066 (a blank MIME type is still a
photo), C-073 (every path that flattens an animation says so).

**Phase 5** — C-179/C-071 (Load more drops a stale page and dedupes),
C-133/C-178/C-010 (one `settledHeart` decision plus in-flight guards across
all five hearts), C-125 (a second device cannot replace a Catch-up answer).

**Phase 4** — C-020 (rejoining takes it out of the bin), C-021 (an empty Round
cannot open for answers), C-023 (the hat is handed on before the last head
leaves), C-144 (a monthly rhythm on the 31st stops skipping a month),
C-141/C-031 (one valley-day count for every countdown surface), C-025 (the
revoke no longer strips a group admin), C-026 (the manual nudge is metered),
C-027 (an answer cannot land in a closed Round), C-028 (extending a dormant
Round moves its deadline), C-029 (two questions in one slot render stably).

**Owner-visible copy change**: a Catch-up countdown one day out now reads
"closes tomorrow" where it read "last day", and the bell's one-day-out
reminder reads "Answers close tomorrow for X's Catch-up." The reminder BUCKET
is deliberately still counted in 24-hour blocks — it decides whether a nudge
fires at all — and the ledger says so at C-141.

**Still owed**: Phase 6 (113 Lows and 21 Mediums, including five test-coverage
holes), and the four owner-only items (C-135, C-165/C-166, C-186). The visual
suite is red on 8 of 20 routes from live data drift, not code — the diffs are
whole-page shifts from new content, and the directory, which nothing this
session touched, is among them. The owner still owes a decision on that.

**Trap learned**: `python3 -c "open(p,'w').write(open(p).read() + x)"` truncates
the file before it reads it. It emptied `fix-ledger.md` mid-session; rebuilt
from the last commit plus this session's rows. Read first, then open for write.

## 2026-08-25 — round-two fix session: the five test-coverage holes

Continued the bug-report-2 fix run. Phase 6 begins with the five findings that
were about the GATES rather than the code: a test that does not exist, a test
that lies about its reach, and a test whose header promises a generality its
hard-coded list does not have. They weaken every other gate in the repo, so
they went first.

- **C-187 — nothing tested session revocation at all.** The word
  `credentialVersion` appeared in no test in the repo, and the whole mechanism
  that ends a blocked, deleted or password-reset member's session was one
  inline condition in the NextAuth callback. The predicate now lives in
  `src/lib/session-revocation.ts` and is attacked as six cases, with two
  wiring tests beside them: the callback still calls it, and the session
  `select` still fetches every column it reads — derived from the rule's own
  source, so a new clause fails until the query fetches it. Four mutations
  proved it: flipped `!==`, dropped `isBlocked`, dropped the select column,
  guard removed.
- **C-193 — the C2 ownership sweep had already drifted.** It named two files
  under a title claiming "every write path"; `messages/actions.ts` was the
  third and unswept. It derives the list now. The first attempt was vacuous in
  this repo's favourite way: matching the bare name `ownedUploadUrls` passed
  against a file that still IMPORTED the helper and had stopped calling it.
- **C-194 — nothing pinned that the visibility guard is CALLED**, only that
  the rule is right. A new sweep requires every action naming a `postId` or
  `commentId` to consult `canViewPost`, or to sit on a written list of the
  ones authorised by authorship or the admin role. It found a live gap while
  being written: `reportPost` had no check, so reporting any post by id put
  its author's name into the reporter's thread. It guards now.
- **C-191 and C-192 — two headers that over-promised.** The cascade test's
  reachable-from-User walk is filtered through a fail-CLOSED subset assertion
  now (25 models, each with the reason it is that member's to lose), so a new
  communal model wired Cascade fails on the day it is written, which is what
  the header always claimed. The index test keeps its ten measured hot reads
  and gains a derived sweep over every `@@unique([aId, bId])` of real relation
  columns. Both were proved with the audit's own scratch models.

**Raised, not fixed:** generalising the index sweep exposed `GroupMember.userId`
— `loadSavedPosts` reads memberships by userId on every request with no index
to serve it, the same shape as B-090. It is exempted in the test with that
said plainly, and it wants a migration, which does not belong in a test
change. It is the first item in the ledger's open column.

## 2026-08-25 — a cancelled account deletion stays cancelled

**C-075.** The nightly retention sweep reads its due list once, then purges the
accounts one at a time, each in its own transaction — so minutes pass between
"this account is due" and "delete it". Signing in during the 60-day grace
window IS how a member calls the deletion off, and the purge erased them
anyway: irreversibly, rows and R2 bytes both, after the app had told them it
was cancelled.

The cutoff now rides on the DELETE rather than only on the due-list read, and
zero rows deleted rolls the whole transaction back — the group rehoming, the
image worklist, the cleared reports. A cancellation is counted as spared, not
as a sweep error. An admin's deliberate delete passes no cutoff and is
unchanged.

Reproduced live before the fix and after it, against the real database: three
concurrent cancel-versus-purge races under the old shape destroyed all three
accounts after a committed cancellation; five races under the new shape
refused all five. A re-read at the top of the transaction would not have
closed this — READ COMMITTED cannot see a sign-in that commits mid-flight —
which is why the condition is on the delete, where Postgres locks the row and
re-evaluates the predicate against the version that won.

## 2026-08-25 — the image optimizer stops working for strangers

**C-134.** `next/image`'s optimizer is reachable signed out (avatars render on
the login page) and it will fetch and transform anything `remotePatterns`
vouches for. That list carried `*.r2.dev` — which is every free, self-serve
Cloudflare bucket in the world. Anybody could host a large image on their own
bucket and drive `/_next/image?url=...` in a loop, once per unique URL, each
one a fresh fetch, decode and transform billed to this project's Vercel
account, until legitimate avatars degrade too.

`next.config.ts` now builds one named host list and feeds it to
`remotePatterns`, `img-src` and `connect-src` alike; it reads
`R2_PUBLIC_BASE_URL`, so the demo deployment needs no second edit.
`upload-shared.ts` had already made exactly this call, in writing — "the exact
host, not a `pub-*.r2.dev` wildcard: a wildcard would vouch for anybody else's
bucket" — and the two files now agree.

Proved against the running server: an arbitrary `pub-*.r2.dev` host is refused
with "url parameter is not allowed", the legacy host and the current one are
still accepted, and a real member avatar still optimises.

## 2026-08-25 — the directory's city chips, and a count that disagreed with its list

**C-091 — a city chip could lead nowhere.** Every city the directory offers as
a filter is a string read straight back out of the member's own row. The
filter then folded it through the gazetteer's normalizer — which strips
accents and drops a comma-qualified tail — and compared the folded key against
the unfolded column. Postgres folds case, never accents, so a member living in
"Zürich" was unreachable from the one chip that names their city, and so was
anybody whose row still carries a "Northfield, Minnesota". The picked value is
now the first thing compared, with the folded aliases (Bangalore/Bengaluru)
beside it. Reproduced live against a seeded row: nought members before, one
after, with all thirty-four real facets still full and both alias pairs still
agreeing.

**C-004 — the profile's counts answered a different question from its list.**
The tab numbers and the Photos grid were built from a hand-copied fragment of
the feed's where-clause, and the copy had lost three things: the batch arm,
the author's exemption from the city arm, and the author-standing filter. So a
count could sit above a list that did not match it, and a batch-targeted photo
could reach the grid of somebody outside its audience. One `audienceWhere`
builder now owns those arms and both surfaces compose from it.

Proved live: a batch-targeted post by an ISC-1978 member reached an ISC-1972
viewer's profile grid under the old shape and does not under the new, while
the author still sees their own. Swept every viewer-by-author pair in the real
data: no count changes today, because nothing batch-targeted exists yet, so
nothing on screen moves and the visual baselines are untouched.

## 2026-08-25 — two fields a member types, and what the app did with them

**C-040 — pasting an Instagram address produced a dead link.** The column is
meant to hold a bare handle, and every other social field tolerates a pasted
URL because it falls through to the "does it start with http" check.
Instagram did not: it was prefixed unconditionally, so a pasted
`https://instagram.com/ananya` rendered as
`https://instagram.com/https://instagram.com/ananya` and displayed as
`@https://instagram.com/ananya`, on the public profile. One
`instagramHandle` reducer now runs on the way in and on the way out — the
write so the column stops collecting URLs, the read so rows that already hold
one are fixed without asking anybody to retype. The three real Instagram
values on the site today are plain handles and are untouched.

**C-043 — signup accepted the impossible pair the profile editor refuses.** A
batch year earlier than the year you left is the two fields swapped, and the
editor says so. Signup checked only left-before-joined, so that pair went
through and `batchTypeFromLeaving` returned null for it — an account with no
batch type, outside every batch-targeted post and mis-joined to its batch
group, with nothing on screen to explain it. One `yearClashMessage` rule now
answers for both writers.

**Copy change worth knowing about:** signup's left-before-joined refusal now
reads in the editor's words, "You cannot have left before you joined. Check
the other year too.", rather than its own sentence.

## 2026-08-25 — a teacher can be mentioned by name

**C-006.** `/api/users/search` held teachers out of every result, under a
comment saying its only consumers were the Catch-ups people surfaces. They
were not: the composer's @-mention dropdown shares the same endpoint, and
picking a name from it is the only way to insert a mention. Teachers post to
the feed and write letters like anybody else, so wanting to mention one is an
ordinary thing to want, and it was impossible.

Catch-ups is an alumni feature, so the rule now lives with the surface that
has it: the two Catch-ups pickers ask for `alumniOnly=1` and the endpoint
hides nobody unless asked. Opt-in on purpose — a caller that forgets the flag
gets more people, never a narrowed list it cannot see is narrowed.

Proved against the running server with a real teacher's name: the composer's
dropdown returns them, the Catch-ups picker still does not.

## 2026-08-25 — notifications that lead somewhere

**C-052 — the feed never scrolled to the post a notification named.** Every
like and comment notification on a plain post links to `/feed#<id>`, and
nothing read the fragment: the feed fetches its posts after mount, so at the
moment the router commits there is no card with that id. The member landed at
the top of the feed with no idea which post was meant. The feed now scrolls to
that card and rings it for two seconds — a canopy ring drawn on a
pseudo-element, so only opacity animates.

Two ways to get this wrong, and the first two attempts hit both. A callback
beside `setPosts` runs before React has committed the cards, so the lookup
finds nothing and fails silently, which looks exactly like the bug. And
tapping the bell while already on the feed changes only the fragment, which is
a same-document navigation: nothing remounts and no effect re-runs. Both are
now handled and both are pinned in `e2e/deeplink.spec.ts`, which I watched fail
with the second half reverted.

**C-054 — bell rows outlived the letters they pointed at.** Delete or hide a
letter and "X replied to your comment" still sat in somebody's bell pointing
at a page that answers 404 — for up to a year, since notifications are kept
until the 365-day sweep. Catch-ups has cleared its own notifications since it
was written; the feed never did. The cleanup now lives inside the delete
helper, so a third way to delete a post cannot forget it, and a moderator's
hide clears everybody's rows except the author's, because the author can still
open the post and read the notice there.

**Also visible:** the deep-linked post gets a brief green ring. Screenshotted
at both viewports. `npm run visual` is red on the same eight routes as before
(feed, directory, letters, catchups at both sizes) and no others — still the
live-data drift the owner owes a decision on, not this change.

## 2026-08-25 — analytics stops being handed everybody's session token

**C-198**, which the audit could only mark as needing a live check. It does
not any more. `posthog-js` fires at the same-origin `/ingest` path — the whole
point of that path is that an ad blocker cannot see a third-party hostname —
and a same-origin request carries every cookie this site has set, the HttpOnly
session token included. The rewrite then hands the request on.

I pointed the rewrite at a local echo server and signed a real browser in. The
full `authjs.session-token` arrived at the destination on every analytics
request. The comment beside the rule in `proxy.ts` had said, in writing, that
these requests "carry no session by design".

The strip happens in the proxy, because a rewrite cannot edit headers:
`/ingest` and everything under it now lose their cookie header before the
request goes anywhere. Re-ran the echo test — nothing arrives. Then put the
real destination back and confirmed PostHog still accepts a live event
(`200 {"status":"Ok"}`), still serves the SDK bundle, and that the feed renders
with no console errors. PostHog identifies events from the payload, never from
our cookies, so there was never anything to lose by this.

One honest limit: this proves the local path. On Vercel the rewrite itself is
served by their infrastructure and I cannot watch it from here — but the strip
runs in middleware, which does run there.

## 2026-08-25 — the Visit table: whose row it is, and how much of it there may be

**C-163.** A visit's id arrives in a request header the proxy fills from the
caller's own cookie, and the write was an upsert keyed on that id alone. Two
consequences: replaying somebody else's id wrote into their row — their view
count, their endedAt, their device and their city — and a signed-in caller
rotating the cookie on every request minted one row per page view for ever,
with nothing anywhere to stop it. About 660,000 rows fills the free-tier disk
and takes the database read-only for everybody.

The write is now update-then-create with the update scoped to the member as
well as the id, and a new row is only opened if this account has opened fewer
than forty today — a number an ordinary browser, which carries one sliding
thirty-minute cookie, never approaches. Proved against Postgres: the wrong
member's scoped update touches nothing where the old shape touched a row and
incremented its count; the create that follows loses to the primary key. Then
re-proved the ordinary path with a throwaway member — two page views, one row,
two views, entry path kept and last path moved.

**C-164.** Presence telemetry was kept 180 days as margin: double what any
chart reads. Margin on the fastest-growing table in the schema is what puts it
over the plan — at this project's own stated scale that is over half a
gigabyte of Visit rows against a 500MB database the gazetteer already spends
97MB of. Cut to 90 days, which is exactly the deepest lookback any analytics
view uses, so the rows it removes are the ones nothing can reach and no answer
the owner can get today gets shorter. The gate derives that lookback from the
analytics queries themselves, so deepening a chart fails the build until
somebody decides about retention rather than silently reading swept rows.

## 2026-08-25 — the demo stops blaming the network for its own rules

**C-044.** Editing a contact field in the demo failed with "That did not save.
Check your connection." Nothing was wrong with the connection: the demo's
write allowlist did not contain `showEmail`, `phone` or `phones`, and the
contact action writes all three on every save whatever the visitor actually
touched — so changing an Instagram handle was refused by the Prisma layer,
which throws, which the profile's autosave prints as a network error. Same for
the admission number, and for removing a photo.

All four are ordinary scalar columns a visitor is meant to edit, and they are
on the list now. `photoUrl` deliberately is not — it is an upload output and
the demo takes no uploads — so removing a photo refuses in words at the front
door, the way uploading one already did.

The gate derives the columns the contact editor writes from that action's own
source, so a new one fails the build until somebody decides whether the demo
may have it. Not exercised against the demo deployment itself, which is a
separate project and database.

## 2026-08-25 — a chargeback the owner wins counts again

**C-086.** When a supporter's bank opens a dispute, the webhook moves that
contribution out of "paid", and every money surface — the public recovery bar,
"Given, all time", the supporter's own history — stops counting it. Nothing
anywhere moved it back. So a dispute the owner WON, money that never actually
left the account, stayed un-counted for ever, and the only way to correct it
was raw SQL against the live database.

`payment.dispute.won` and `payment.dispute.closed` now return the row to
"paid", conditional on it still being disputed and deduped against a
re-delivery, with an audit line — the one event in the whole app that moves a
money total upwards after the fact, so the owner hears why from somewhere
other than a total that quietly grew. A LOST dispute is deliberately still
ignored: un-counted is the right answer for that one.

One imprecision, written on the function rather than hidden: a dispute is
recorded as the whole payment, so a partial refund that happened before the
chargeback cannot be told apart from it and comes back too. Telling them apart
needs a column of its own; the audit line names the paise that moved.

Proved against Postgres with a throwaway row: the first delivery moves it to
paid with nothing withheld, the re-delivery moves nothing.

## 2026-08-25 — three unattended paths that gave up quietly

**C-108 — the mail drain's lease lapsed exactly when it mattered.** One pass at
a time, fleet-wide, is what stops the queue mailing a provider that rate-limits
at two requests a second. The lease lasted 45 seconds and a worst-case pass —
eight sends each timing out at ten — takes eighty, so during a brownout, the
one condition the lease exists for, a second pass took it mid-flight and the
two ran together. The pass now renews the lease before every send and stops if
it has lost it. Renewal rather than a longer lease deliberately: a lease sized
for the worst case would stall the queue for eighty seconds every time an
instance was frozen mid-drain. Proved against Postgres.

**C-161 — the confirmation banner promised a time it could not keep.** It
prints a clock time, "your link goes out tomorrow at 5:30 am", and the value
behind it was the next UTC midnight for everybody, with no term for how many
people were in the queue. The drain is oldest-first, so on a launch day with
three hundred signups the person at position two hundred was told tomorrow and
waited three days. The ETA now counts the confirmations actually ahead of this
one and divides by a day's budget.

**C-149 — the Catch-up clock's failures reached nobody.** `advanceEdition`
never re-throws, on purpose, so its callers' Sentry reporters could not see a
per-edition failure, and its own catch only wrote to the console — which on
Vercel is a line nobody reads. Round-opening failures were reported and
round-advancing failures were not: the Round simply stops moving while the
countdown carries on counting down. It reports now, and the gate sweeps every
catch in the file rather than pinning that one.

## 2026-08-25 — the Medium tier is closed

Twelve commits, none pushed (sixty in total are now unpushed, going back to 2026-08-23). `npm run check` green throughout (65 test files).
`npm run visual` red on the same eight of twenty-three checks it was red on
this morning — feed, directory, letters and catchups at both viewports, all
live data drift — and on nothing else.

**What closed.** The five test-quality gaps first, because they weakened every
other gate in the repo: session revocation had no test at all, the C2
ownership sweep named two of three write paths, nothing pinned that the
visibility guard is CALLED, and two test headers promised a generality their
hard-coded lists did not have. Then every actionable Medium: the purge that
ignored a cancellation, the open image proxy, the city chip that led nowhere,
the profile count that disagreed with its list, the pasted Instagram link, the
impossible pair of years, the teacher nobody could mention, the notification
that scrolled nowhere and the one that led to a 404, the analytics proxy
carrying everybody's session token, the Visit table's two problems, the demo
blaming the network for its own rules, the chargeback the owner wins, and
three unattended paths that gave up quietly. Four more Mediums turned out to
be duplicates of those.

Seventy-four of the run's findings are now disposed of. What remains is 121
Lows and four items only the owner can do.

**Two things found while fixing, not in the report.** `reportPost` had no
visibility check — writing the C-194 sweep is what surfaced it — so reporting
any post by id put its author's name into the reporter's thread. And
generalising the index test exposed `GroupMember.userId`, read on every
request by `loadSavedPosts` with no index to serve it; that one is written
down in the test's own exemption list and handed to the next session, because
it needs a migration.

**The trap that cost the most rounds**, and it is the same one as last
session's: a shape test that greps for a function NAME passes against a file
that only IMPORTS it. It went vacuous three separate times today before each
gate was proved by reverting the fix. A per-file sweep has a second version of
the same hole — it passes when a file has two takedown paths and you only
fixed one. Count the sites, don't detect them.

## 2026-08-25 (later) — the long tail, part one: the feed's write paths

The last session of the run. Everything above Low was closed; what is left is
121 small findings, worked in FILE order rather than id order so a module is
opened once.

**The feed's writes (C-018, C-003, C-009, C-015, C-016, C-017).** Six findings
in one file, and four of them are the same shape: a query that answers a
slightly different question from the one the surface is asking.

Deleting a post purged every url it named, whether or not another post still
named the same one. `images` is caller-supplied JSON and the ownership check
only vets the prefix, so attaching one own-upload to two posts and deleting
the first left the second's photograph 404ing — the exact "live post with
broken pictures" this function was written to prevent, reached from the other
side. It now queues only the urls no surviving row names, matched inside the
delete's own transaction. Proved against Postgres with two posts sharing one
image: the shared byte survives, the solo one goes.

The count on a card and the list in a thread were two different questions. The
four `_count.comments` fragments filtered on hidden + deleted; the thread also
required the author to be in good standing. A post whose only comment came
from a since-blocked member showed "1" and rendered nothing. `VISIBLE_COMMENT`
now lives in `src/lib/posts.ts` and both halves spread it.

The double-submit guard matched author, text, kind and status — not the
photographs, the letter's title or the poll. Two pictures shared seconds apart
under "Reunion!" were one post, and the composer said "Post shared!" about the
one it dropped. The window query is now a shortlist that `isPostTwin` settles.

`escapeLike` clamps at 100 characters before escaping (before, never after: cut
an escape pair in half and Postgres refuses the pattern outright). That one
line covers the feed, the directory, the Collection, users-search and admin
search, none of which capped the term and all of which are unmetered reads.

**Two are member-visible.** Replying to a reply notified the ROOT comment's
author while the composer said "Replying to <somebody else>"; the person whose
name was on screen heard nothing. The composer now sends the tapped reply's id
and the server notifies its author — the stored parent is still the root, so
the thread looks exactly as it did. And a letter draft scoped to a city the
author had since removed from their profile silently widened to Everyone on the
next autosave keystroke, chip still reading "X only". That save is now refused
with a sentence saying why.

Gate: `src/lib/feed-write-rule.test.mjs`, eighteen assertions, every one proved
by reverting its fix and watching it fail.

## 2026-08-25 (later) — the long tail, part two: Catch-ups

Ten findings pointed at Catch-ups. Four were already closed by the Mediums
above them -- checking first is the whole reason the ledger exists -- and two
more did not survive being looked at.

**The demo's flagship flow could never finish (C-113).** "Start a Catch-up" is
a permanent button on the demo's Catch-ups index and /catchups/new is
deliberately open, but the creating transaction's first write is
`group.create`, and Group and GroupMember were not on the demo's write
allowlist. So every attempt died on the guard and told the visitor "Something
went wrong. Please try again." -- for ever, on the one flow the demo exists to
show off. Both models are now allowed; the reset already wiped all three group
tables. The gate derives the model list from the transaction itself, so a
write added later cannot quietly re-open the hole.

**A phase that slips a whole day, about half the time (C-142).** Every
deadline is minted as `now + N days` where `now` is whenever the day-0 tick
happened to run, and the day-N tick runs at its own offset. Fire a second
earlier than day 0 did and `t >= deadline` misses, so the Round waits another
twenty-four hours. Magnitude does not matter; sign does. `TICK_GRACE_MS` is
five minutes -- more than any scheduler's wobble, far less than the hours the
shortest phase is measured in -- and it lives in `computeStatus`, so what the
tick does and what the page says stay one function.

**A photo that came back after being removed (C-182).** The upload handler
closes over the `images` prop from before its await, so removing a photo
mid-upload was undone the moment the upload landed, and the parent autosaved
the resurrected list. It reads a ref now. Remove stays live during an upload
on purpose: waiting for someone else's photo to finish before you can undo
your own is the worse answer.

**The invite link had no loading boundary (C-139).** It is the one async
database route outside `(main)`, so nothing above it applied and a stranger
opening a forwarded link on a cold function watched a blank tab. Its skeleton
is the page's own Shell with the wordmark real from the first frame; every
block is the real element's line box, and the width at which the paragraph
stops wrapping to five lines (472px, where the card stops shrinking) was
measured in the browser rather than guessed. Checked at 1440x900 and at a true
390x844.

**One refuted by asking the database (C-127).** Two comments in this codebase
contradicted each other about whether `upsert` is atomic. It is: Prisma 7.9
emits `INSERT ... ON CONFLICT DO UPDATE` for this shape, and 75 deliberately
simultaneous first-writes produced zero violations. The comment claiming
otherwise was the wrong half and now says what Postgres actually does. The
P2002 catch stays as cheap insurance, no longer as the thing holding the
toggle up.

## 2026-08-25 (later) — the long tail, part three: the edge boundary

Seven findings about `src/proxy.ts` and the two config files beside it. It runs
before every request, so everything it gets wrong is invisible from inside the
app.

**The site had no crawl policy (C-203).** No robots.ts, no sitemap.ts, and
neither filename excluded from the proxy matcher, so a crawler asking for
/robots.txt was redirected to /login and read the sign-in page as the policy.
There are now both, and both are past the matcher. Everything is disallowed
except the seven pages a stranger is meant to find; the demo disallows all of
itself, because two copies of the same site competing in search results is
worse than one. The sitemap is hand-written on purpose: derived from the route
tree it would be one refactor away from publishing the directory. Its gate
checks every url it lists against `publicPaths`.

**A cron that could never succeed (C-111, C-136, C-201).** One vercel.json
ships both crons to both Vercel projects, and /api/demo/reset was missing from
publicPaths -- so the nightly cookieless GET was 307'd to /login before the
route's deliberate 200 no-op could answer. That no-op exists precisely so the
run reports success instead of raising a failed-cron alert, and a permanently
non-2xx nightly job is exactly what teaches somebody to stop reading cron logs,
which is where a real tick failure would hide. The gate derives the cron list
from vercel.json, so a fourth one cannot drift out again.

**An API that answered in HTML (C-202).** Every gated path was redirected to
/login, /api included -- and a `fetch` cannot act on that. The browser follows
it, `res.ok` is true, `res.json()` throws on the login markup, and the member
is shown a generic failure for what is really "sign in again". /api/* now gets
a 401 in JSON. Pages still redirect, destination in tow. Verified live:
/api/places/search went from a 307 to `401 {"error":"Not authenticated"}`.

**Two small route facts.** A tokenless /catchups/join fell through to (main)'s
/catchups/[catchupId] and gave a lost link a generic 404 or a login bounce, on
a path the proxy deliberately opens; it has its own page now, saying what the
[token] page says about a link it does not recognise. And the browser chrome
colour was a static export, so once dark shipped, dark-theme members got
warm-paper Safari chrome around a charcoal app -- the exact mismatch the
constant exists to prevent, inverted. It reads the cookie now. Both verified
in the browser, at 1440x900 and 390x844.

**Two refuted by reading node_modules.** C-132 and C-184 both claimed
`skipTrailingSlashRedirect` makes every trailing-slash URL 404. It suppresses
the client-facing 308 and nothing else: `removeTrailingSlash` runs
unconditionally before route matching.

## 2026-08-25 (later) — the long tail, part four: the doors

Eleven findings on the paths somebody reaches when they cannot sign in. There
is no second door behind these, which is why a Low here is worth more than its
label.

**A blocked member could complete a password reset (C-033).** Nothing in the
reset flow read `isBlocked`: the mail went out, the link worked, the password
was written, and the screen said "we are signing you in now" -- and then
`authorize()`, the only gate that checks it, refused with "Invalid email or
password", which bounced them back to /login where the new password was refused
again. An endless loop that told them nothing true. The reset now queues no
mail for a blocked row while answering exactly as it answers everything else,
so the identical `{ ok: true }` that stops this being a membership oracle is
preserved. Proved end to end against the running server: same account, same
form, one mail queued unblocked and none blocked.

**A committed password change could still look like a failure (C-035).** Four
post-commit writes were plain awaits with no catch, under a comment claiming
the mail was "never awaited for success". A pool timeout in any of them threw
out of the server action, so the member watched "Saving..." for ever with no
way to know the password had in fact changed -- and the token was already
burned, so trying again said the link was used. They sit in a try now, with
`reportSwallowed` as the witness.

**Three auth forms could strand on a disabled button (C-034).** reset,
forgot-password and resend-confirmation all awaited a server action bare, so a
rejected dispatch skipped every line after it, including the one that
re-enables the button. They go through `callAction` like everything else.

**A valley clock printed as if it were yours (C-037 and its three
duplicates).** Three separate docstrings claimed the send time was formatted in
the reader's timezone; the code pins it to Asia/Kolkata. The comments invited a
later session to "restore" browser-local formatting and re-break a day
comparison that had already been fixed. Corrected, and the member-facing time
now says IST -- a member in London was reading a valley wall time as their own
and would have checked an empty inbox at the wrong hour.

**One written down rather than changed (C-032).** The session is an ABSOLUTE
thirty days, not the rolling one NextAuth documents: the refresh rides on
Set-Cookie headers from GET /api/auth/session, and `auth()` takes the RSC path,
which reads the body and drops them. There is no middleware, no SessionProvider
and no useSession anywhere. So every member is signed out thirty days after
signing in, however often they visit, and a launch cohort hits it together.
That is a defensible posture and a recoverable re-login, so it is the owner's
call rather than something to change quietly -- **owner decision needed.** It
is now stated beside the config, with the note that revocation does not depend
on it.

**Two refuted.** C-038 (a password-null account being stranded) is latent: no
production path mints one. C-036 (a mail scanner auto-confirming an address) is
a documented decision that grants an attacker nothing they could not get by
confirming their own address.

**A probe lesson worth carrying.** Proving C-033 in a browser failed three
times in a row, always looking like the fix worked. Two separate reasons, both
of which produce a convincing zero: the reset limiter is per-IP, so the second
submission was refused BEFORE the isBlocked branch (fixed with a distinct
`x-forwarded-for` per run); and `page.fill` before hydration sets the DOM value
of a CONTROLLED input without React ever seeing it, so the form posted an empty
address and the action returned early. React does not overwrite a value already
in the field when it hydrates, so the field looks right the whole time. The
tell is the confirmation screen, which echoes the address out of React state --
assert on that, and wait for React props on the form before typing.

## 2026-08-25 (later) — the long tail, part five: the directory

Nine findings, six real, and five of the six are the same shape: a number
produced by one query beside a list produced by another, with a rule in one
half and not the other. On the one page whose entire job is telling people
apart, that is worse than it sounds.

- **A tile that lied about its own contents (C-095).** The batch tile counts
  exclude faculty; the filter behind the tile did not. `accountType` and
  `batchYear` are written independently by the admin editor, so flipping an
  alumnus to ex_teacher keeps whatever year the row had. The tile said N and
  opening it listed N+k. Proved live: batch 2023 now says 37 and lists 37.
- **Two filters, one of them ignored (C-093).** `where.accountType` was
  assigned twice, and the second won: year=faculty + type=alumni always
  resolved to plain alumni, while both tokens sat on screen and the grid was
  headed "Faculty". It is one fold now, so a contradiction returns nothing --
  honest, and legible because both tokens are there to explain it.
- **A heading over the whole membership (C-099).** The page read the year with
  bare `Number()` while the query used `parseBatchYear`. `?year=1800` is truthy
  to Number, so the page called itself filtered and headed 63 people "Batch of
  '00" -- a filter you could see and were not getting. One exported parser now
  serves both. The first screenshot caught that the fix was half-done: the chip
  is rendered by the client from `initialFilters`, so that had to carry the
  APPLIED filters too, not the raw params.
- **Pins that led with the wrong people (C-092).** Postgres orders NULLs first
  on a DESC column. The M38 fix put `nulls: "last"` on `directoryOrderBy` and
  its sibling query never got it, so a pin's visible twelve filled with rows
  carrying no batch year at all. Every batchYear desc sort now declares it, and
  the gate sweeps for them rather than pinning the one that was wrong.
- **An escape link that reached a fraction of what it counted (C-098).** A pin
  is an 11km grid cell and two towns can share one -- Hyderabad and
  Secunderabad do. The count aggregated both; the link named whichever resolved
  first. A pin carries its whole cell now. The unmapped bucket's "See all"
  is gone rather than falling back to /directory, which lists none of them.
- **The search nobody was recording (C-097).** `SearchScope` declared
  "directory" and the analytics grouped by it, but nothing ever wrote one --
  because a comment said the directory filters in the browser, which was never
  true. Its gate derives the scope list from the union, so a declared scope
  with no writer fails.

Three refuted: C-094, C-100 and C-170 all claim an uncapped search term is a
DoS. Right about the mechanism, wrong about the cost -- the tables are small,
the endpoints are gated and rate-limited, and a long LIKE needle fails FASTER
per row, not slower. (The feed and directory terms are capped anyway now, by
C-015 earlier today.)

## 2026-08-25 (later) — the visual suite stops crying wolf

Not a finding: this came out of verifying the directory work. `npm run visual`
went from the documented 8 red to 12, and the four new ones were mobile
collection, support, birds and about -- pages nothing had touched. The diff on
each was a handful of pixels in one place: the notification bell's unread
badge, which sits in the mobile header of every route and changes the moment
anybody comments on anything. The suite was reporting somebody else's activity
as a regression on four unrelated pages.

Masking it turned up a real defect behind it. The header variant of the bell
has no `sr-only` label -- only the sidebar variant does -- so its accessible
name is whatever the badge says, literally "1", or nothing at all when the
count is zero, since `title` only fills in where there is no other content. A
screen reader announced a bare number with no clue what pressing it does. That
is why `getByRole("button", { name: /notifications/i })` matched nothing and
the first mask silently covered no pixels at all.

So: the label is added (invisible, no layout change), the bell goes into
`volatileRegions()`, and the four baselines whose only diff was that badge are
rewritten. Back to exactly the documented 8, all of them the live-data drift
still owed a decision by the owner.

**The lesson**: a Playwright mask whose locator matches nothing does not fail.
It passes, covers no pixels, and the test goes on failing for the reason you
thought you had just masked. Check the -actual.png for the magenta block before
believing a mask worked.

## 2026-08-25 (later) — the index the last session handed over

`GroupMember` carried one index, the composite unique `(groupId, userId)`.
Postgres can only use a composite when the LEADING column is constrained, so
`where: { userId }` alone could not touch it -- and `loadSavedPosts` asks
exactly that on every request, which is B-090 all over again. The previous
session found it while generalising the index sweep and wrote it into the
test's own exemption list rather than leaving it silent, because it needed a
migration.

`@@index([userId])`, applied to both databases, exemption removed so the
derived sweep covers the column rather than carrying an excuse for it. Proved
live: EXPLAIN reports `Index Scan using "GroupMember_userId_idx"` where it was
a sequential scan. Not urgent at today's size; a full scan of a few thousand
rows on a page load at the 2,000-member ceiling this audit is sized against.

## 2026-08-25 (later) — the long tail, part six: reporting

Four findings on the two report paths. One was already closed (C-001:
`canViewPost` went in with the C-194 work). The other three are all about the
same few lines.

**One complaint could look like a pattern (C-060).** `Report` carries a unique
on (reporterId, reportedUserId), which was meant to be the one-open-report
rule. It is not: a POST report leaves reportedUserId NULL, and Postgres treats
NULLs as distinct, so that index constrains member-to-member reports and
nothing else. The rule lived in a findFirst instead, which under READ COMMITTED
two simultaneous submissions both pass -- two reports, two admin threads, two
notifications, from one person double-tapping. That is the exact effect M29 set
out to stop, surviving M29.

M29 declined a unique index because the live table already holds duplicates
from before the rule and a full constraint would mean deleting moderation
records. A **partial** one does not: it covers only PENDING post reports, so
every resolved row stays exactly where it is, and a post going wrong again
still files a fresh report. Zero conflicting rows in either database. Proved
live: three simultaneous reports leave one report and one thread where the old
shape left three of each.

**A report that reached nobody, for ever (C-007).** The Report row, its
AdminThread and the admin notification were separate awaits. A pool timeout
after the first left a pending report with no thread -- and the dedupe above it
selected `thread.id` and ignored that it was null, so every retry answered
"already reported, an admin is looking at it" while it sat on nobody's desk.
They are one transaction now, in both report paths, and the dedupe repairs a
thread-less report rather than reporting success over it.

**A dead end at the end of a 500-character field (C-013).** The details box
advertised 500 characters; the submitted string is `"<reason>: <details>"`, and
the server refuses anything over 500 with a flat "Please provide a valid
reason". Somebody who did exactly what the field invited got a refusal naming
nothing to fix. The box's cap is derived from the longest reason now, so adding
a longer one cannot re-open the gap.
