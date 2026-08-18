# Progress Log

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
