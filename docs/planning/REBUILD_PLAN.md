# REBUILD PLAN — bringing the built app up to the /preview/v2 contract

This is the campaign overlay for fixing the MVP build, which drifted from the approved look
under context compaction. It tells any session HOW to run one batch of the fix without
re-explaining anything. Read this + the contract + the area spec before touching code.

## Prime directive (every session reads this first)
1. **`/preview/v2` is law.** `src/app/preview/v2/page.tsx` is the approved look (feed, profile, login,
   light + the controls). Open it, screenshot it, and build the real surface to MATCH it. The reason the
   build failed is that compaction lost sight of this file. Do not let that happen again.
2. **Source of truth stack:** `docs/ROADMAP.md` (build order + DoD) -> `docs/planning/FEEDBACK_CHECKLIST.md` (every owner
   instruction, tracked) -> `docs/spec/<area>.md` (depth). This doc maps those into fork-sized batches.
3. **One batch per session. Stop at the verify gate.** Do NOT let a session compact. If you approach the
   context limit mid-batch, commit WIP, write a handoff note in `progress.md`, and stop. A compacted
   session produces the exact garbage we are fixing.
4. **Verify, do not assume.** A batch is done only when: (a) screenshots of the real surface match
   `/preview/v2` at 1440 wide, (b) every interaction is exercised by hand (click the like, toggle the
   password, open the menu), (c) `npm run build` passes. Screenshots alone are not enough.
5. **No sloppy bugs.** The black-heart-on-like was unacceptable. Match that bar.
6. **No em dashes** in any shipped copy. **No AI attribution** in commits.
7. When a decision changes, update this doc + the checklist so the next session starts as smart.

## Verified current-state diagnosis (2026-06-27)
Survived: flush green sidebar, bird avatars, peaks/leaf mark, the routes + backend + data model.
Drifted (the work): design tokens reverted to near-white (no warm dim, no faint tree); feed reverted to
old composer-box + exposed search/filter row (lost header search pill + bell + New post + collapsed
composer); feed rail lost "Coming up" + "New in the directory"; posts render as tiles not the ruled sheet;
profile lost tabs/About/Photos/bio/open-to/profession line and has thin Details/Contact; login reverted to
the dark void (lost the photo-split + centered form); hoopoe no longer animates (snaps, no bounce); landing
sign-in button still bad; directory map reportedly does not load. Full per-item list = `docs/planning/FEEDBACK_CHECKLIST.md`.

## How to run this (the recommended model)
The owner's instinct is right: avoid compaction, one self-contained chunk per session, hand off via docs.
Three refinements over "12 random tasks per fork":
- **Batch = a ROADMAP phase, not a task count.** Phases are already coherent + dependency-ordered + have a
  DoD. Size by phase + verify gate, never by "context percentage."
- **Foundation is SEQUENTIAL; surfaces are PARALLEL.** The design tokens (globals.css), the shell
  (AppShell/Sidebar/PageHeader), and the shared primitives (BirdAvatar/Composer/Feed/PostCard) are consumed
  by everything. If parallel forks edit them at once you get merge hell and re-drift. So do B1->B2->B3 (and
  ideally B4) strictly in order, in ONE branch, committing each. Only AFTER the primitives are frozen do the
  surface phases parallelize.
- **Parallel forks must NOT edit shared primitives.** A surface fork consumes `<Feed>/<Composer>/<PostCard>/
  <BirdAvatar>`; if it needs a change to one, that is a foundation change and goes back to a sequential pass.
  Each parallel fork runs in its own git worktree/branch off the frozen-foundation commit, then merges in
  dependency order. (See "Coordination" below.)
- **Do not hard-revert.** The backend/data model/server actions are real and mostly fine. Rebuild the
  PRESENTATION layer surface-by-surface on top of them, to match the contract. If a surface's components are
  hopeless, that fork deletes and rebuilds just that surface from `/preview/v2`.

## Batches (each maps to a ROADMAP phase; do the phase's DoD + the checklist items + match the contract)

### Wave A — Foundation (SEQUENTIAL, smartest session, freeze before forking)
- **B1 = Phase 1 Design system.** globals.css token deltas (warm dim surfaces base #E9E6DD / surface
  #FAF8F3 / float #FFFFFF; sidebar #235C49; accents leaf #1F8A4C, office-blue #3F7CA6, cinnamon #C2622F,
  heart #E03A33). Kill `transition-all`/global `color` transition; heart explicit non-transitioning red;
  remove button glow; faster theme transition; `forcedTheme="light"`; reduced-motion block; fix `.dotsep`
  size, bird centroid, `+` alignment. Acceptance: bg warm not white, heart red on first frame, no glow.
- **B2 = Phase 2 Shell + nav.** AppShell + Sidebar (flush #235C49) + PageHeader hosting the compact
  search pill (placeholder ends "...", longer) + bell + per-page primary CTA. Mobile bottom bar. Footer
  inside main. Acceptance: every (main) page in the flush shell; header matches contract.
- **B3 = Phase 3 Shared primitives.** BirdAvatar (500+ combos, centered glyph, photo override),
  PersonName (links to profile everywhere), Composer (collapsed pill, not a big box), Feed (RULED SHEET
  default), PostCard (sheet/card/letter variants, softer share icon, bookmark), keyset pagination,
  Post-schema fold of GroupPost. Acceptance: feed is a ruled sheet, names link, avatars centered + varied.
- **B4 = Phase 4 Feed surface.** 3-col shell, collapsed composer pill, rail = Coming up + New in directory
  + Your groups (rail top aligned to the composer, not the header), reveal-on-demand filters, catch-up
  divider, expand-on-click search. Acceptance: matches the `/preview/v2` feed exactly.
  (B4 lives with the foundation because it is the flagship that proves the primitives.)

### Wave B — Surfaces (PARALLEL-SAFE after Wave A is merged; one fork each, own worktree)
- **B5 = Phase 5 Profile** — cover + avatar-overlap (no clip), batch/city/profession line, tabs
  Posts/About/Photos, user-written About + prompted memories, full Details/Contact (phone, email, any
  socials labeled), open-to tags, right CTA. Matches `/preview/v2?view=profile`.
- **B6 = Phase 6 Directory + map** — Map-default browse, fix the broken map, counted/clustered city pins,
  progressive search; never an alphabetical default.
- **B9 = Phase 9 Collection** — photo archive (WebP renditions, faceted tags, admin approval, picker).
- **B11 = Phase 11 Landing** — calm hero (fix the blurred sign-in button) + scrollable feature showcase
  with real screenshots + tasteful motion.
- **B12 = Phase 12 Support** — UPI support page, honest cost copy.
  (B5/B6/B9/B11/B12 touch mostly their own files = safest to run at the same time.)

### Wave C — Surfaces that lean on feed patterns (PARALLEL among themselves, after Wave B merges)
- **B7 = Phase 7 Groups** — shared Composer/Feed/PostCard; create groups, public/private, roles, @-invite.
- **B8 = Phase 8 Letters + Catch-ups** — long-form "letter" post type + Letterloop-parity newsletter
  ("Catch-ups"); distinct names; manual cadence first, then Render Cron + Resend.
- **B10 = Phase 10 Onboarding + auth + verification** — restore the photo-split login + animated hoopoe
  (bigger, opens-then-closes on load); invite-only; teacher accounts; minimal signup + complete-profile;
  three-track verification; subtle verified mark.

### Wave D — Last
- **B13 = Phase 13 Polish + interactions** — hoopoe choreography, bird chirp, bookmark ribbon sweep,
  living loading scene (<=2 routes), like-pop, bell-shake; run /simplify, /impeccable, LiftKit, VibeSec;
  2 screenshot rounds per viewport. Cross-cutting, so do it after surfaces exist.
- **B0 = Phase 0 Deploy** — Render always-on + Render Postgres; Prisma provider -> postgresql; storage.ts
  Blob shim; remove magic links + /verify. At the very end.

## Coordination (for parallel forks)
- Foundation (Wave A) commits land on `redesign` directly, in order. Freeze with a tagged commit, e.g.
  `git tag foundation-frozen`.
- Each parallel fork: `git worktree add ../rv-<batch> redesign` (or branch `fix/<batch>` off the frozen
  commit), works only in its surface's files, commits, and the owner merges branches in wave order.
- A fork that discovers it needs a shared-primitive change STOPS and flags it; that change is made once,
  sequentially, and the frozen commit is re-tagged. This prevents the re-drift the owner fears.
- Every fork's kickoff prompt: "Read docs/planning/REBUILD_PLAN.md + /preview/v2 + docs/spec/<area>.md + the relevant
  docs/planning/FEEDBACK_CHECKLIST.md section. Do ONLY batch <id>. Match the contract. Verify interactions + screenshots at
  1440. Update the checklist + progress.md. Commit. Stop before compaction."

## Status (update as batches complete)
- [ ] B1 design system   - [ ] B2 shell   - [ ] B3 primitives   - [ ] B4 feed
- [ ] B5 profile  - [ ] B6 directory  - [ ] B9 collection  - [ ] B11 landing  - [ ] B12 support
- [ ] B7 groups   - [ ] B8 letters/catch-ups   - [ ] B10 onboarding/auth
- [ ] B13 polish   - [ ] B0 deploy
