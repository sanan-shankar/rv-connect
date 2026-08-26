# Session history — July 2026

Archived from the root `progress.md` on 2026-08-26, unedited and in its original
order. The live file keeps the current month; a month moves here once it is closed.
Nothing reads these files — they are the record, not an input.

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
