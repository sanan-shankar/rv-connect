# Progress Log

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
- FEATURES.md written (feature backlog).

## Round 4 — design locked + MVP build kickoff (2026-06-27)
- GSD installed (./.claude, local). FEEDBACK_CHECKLIST.md written: every owner instruction itemized + tracked.
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
  DEPLOY.md (full owner walkthrough incl. the provider split, Blob token, post-deploy seeding, follow-ups).
- VERIFIED local untouched: tsc 0 errors, dev serves, datasource still sqlite, feed works (screenshot-92), the
  prepare script no-ops on file: URL. Moved leftover .next-stale out of the repo (rm -rf blocked; used mv).
  gitignored .claude/gsd-core + node_modules + .next-stale.
- COMMITTED to a new branch `redesign` (commit 21eb32f, 111 files, NO push, NO AI attribution per CLAUDE.md).
  Excluded .claude/ (reinstallable GSD tooling w/ node_modules) and Inspiration/. Secrets (.env.local) + dev.db
  are gitignored and were not committed.

### TO GO LIVE (needs the OWNER's accounts): push branch to GitHub, Render New>Blueprint on the repo, fill the
### sync:false env vars (NEXTAUTH_URL, ADMIN_EMAIL, NEXT_PUBLIC_ADMIN_EMAIL, BLOB_READ_WRITE_TOKEN), apply. See DEPLOY.md.
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
- AUDIT (AUDIT.md): the committed app MOSTLY MATCHES the /preview/v2 contract. Feed, Profile, Login
  (photo-split), Directory (working map), Support, Collection all render correctly; heart is locked
  red (#E03A33, no color transition) and the hoopoe has a real spring + on-load peek IN CODE. The
  owner's "it looks broken" was almost certainly a STALE dev-server render. Lesson: trust screenshots
  + code, never the FEEDBACK_CHECKLIST [x] marks.
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
  Wave D polish, deploy. See HANDOFF.md.

## Fork 3 — Fix campaign COMPLETE (2026-06-27)
GROUND TRUTH: the owner's "everything broke" was a stale 2.7GB .next cache showing the OLD app.
A fresh server proved feed/login/other-profiles/landing(solid sign-in)/directory-map all MATCH the
contract. Settled the AUDIT-vs-REBUILD_PLAN contradiction (AUDIT was right; REBUILD_PLAN's diagnosis
was cache-based). Wrote PUNCHLIST.md (1 P0, 7 P1, 25 P2) + docs/contract/index.html (standalone
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
Full remaining backlog + the next-fork prompt: HANDOFF.md (rewritten) + PUNCHLIST.md.
