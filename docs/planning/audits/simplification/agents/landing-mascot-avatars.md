# landing-mascot-avatars - simplification audit report

Territory reader for the public landing page (`src/app/page.tsx` + `src/components/landing/`),
the hoopoe mascot system (`src/components/mascot/`, `/hoopoe` playground), the first-run tour
(`src/components/tour/` + `src/lib/tour-*`), the PWA install tile (`src/components/pwa/`), and
the 50-bird avatar system (`bird-avatar.tsx`, `bird-avatar-v2.tsx`, `bird-adjust.json`,
`src/lib/avatar.ts`, `src/lib/avatar-swap.ts`). Date: 2026-08-25. Files in territory: 54;
read fully: 38; skimmed with purpose: 16 (listed below).

## Coverage

- Read fully: `src/app/page.tsx`, `src/app/hoopoe/page.tsx`, `src/app/(main)/birds/page.tsx`,
  `src/app/(main)/pick-bird/page.tsx`, `src/components/common/bird-avatar.tsx`,
  `src/components/common/bird-avatar-v2.tsx` (head 840 lines + tail 240 lines; the middle is
  the remaining ~30 bird drawings, same shape as the 25 read), `src/lib/avatar.ts`,
  `src/lib/avatar-swap.ts`, `src/lib/tour-local.ts`, `src/lib/tour-auto-offer.ts`, all 9
  `src/components/tour/*` (offer/panel/spotlight read to their structural skeletons), all of
  `src/components/mascot/` except as noted (hoopoe.tsx read in full, both halves;
  hoopoe-kit.ts, use-hoopoe.ts, hoopoe-warmup.tsx, sidebar-hoopoe.tsx, mascot-flight.ts,
  mascot-flight-layer.tsx, all 10 `moments/*` in full), both `src/components/pwa/*` in full,
  `src/components/landing/landing-hero.tsx`, `hero-photo.ts`, `shots.ts`,
  `section-reveal.tsx`, `trust-section.tsx`, `landing-nav.tsx`, `landing-footer.tsx`,
  `landing-auth-ui.test.mjs`, tour test files, `src/lib/avatar.test.mjs` (head).
- Skimmed (why): `ambient-leaves.tsx` (676), `perching-birds.tsx` (664),
  `footer-hoopoe.tsx` (317), `hoopoe-playground.tsx` (410), `feature-section.tsx` (104),
  `showcase-shot.tsx` (119) - banner comments, imports, and the jscpd-flagged regions read;
  bodies skimmed because every one of these is only reachable behind `SHOW_SHOWCASE = false`
  (finding 02) or is a public play surface with no dead branches visible from its structure.
  Their internals are craft, not bloat, and their reachability status is the finding.
- Not read: none in territory.
- Uncommitted edits seen: none in my territory. The charter warned of another session's WIP
  in `next.config.ts`, `src/lib/admin.ts`, `src/components/tour/manual-tour-entry.test.mjs`
  and others; by the time I ran `git status --short` all of it had been committed (the
  `manual-tour-entry.test.mjs` I read is HEAD's, commit c74d99f). Only the audit's own
  untracked files remain.

## Summary

This territory is the app's showpiece: the mascot rig, the 51-bird art set, and a landing
page built to a spec-per-pixel standard. Most of what looks like bloat here is defended, in
writing, with dates and owner quotes - the comment density that tops the repo charts
(mascot-flight-layer at 1.18 comment/code) is almost entirely reasons, not narration, and I
have filed it as a not-finding. The real weight is in three places. First, a genuinely dead
~595-line legacy avatar renderer sitting inside `bird-avatar.tsx` behind a flag that has been
hard-true since 2026-06-29 (finding 01: the file's own comments call it "that dead path").
Second, the entire below-the-hero landing showcase - about 2,200 lines across ten files - is
switched off by `SHOW_SHOWCASE = false` (2026-08-04) yet still statically imported by the
highest-traffic public route, whose client payload is 636 KB (finding 02); the code's fate is
an owner call, but decoupling it from the route is mechanical. Third, the first-run tour
(9 files + 2 lib files, ~1,100 lines) mounts on every authed page but can never fire for a
member - it is demo-auto-offer + owner-manual-only by design, pinned by tests - and its
fourth stop's spotlight anchor no longer exists anywhere in the app (findings 03, 04). The
rest is small: a dead controller verb, a placeholder `enabled` field for a Groups tour stop
that was never written, unused speed plumbing in the flight bus, a spec section describing a
deleted moment, a misfiled test, and a batch of export keywords knip flagged. Structural vs
cheap: roughly 700 lines of autonomous deletion, one large owner decision worth ~2,200 more,
and one bundle-shaped T3 (the rig in the authed shared chunk) that costs no lines but real
client JS. What surprised me: how little was actually dead - this codebase's mascot and
avatar systems are unusually well-tended - and how much of the switched-off landing is
invisible-by-flag rather than deleted, including the public policy links audit H12 required.

## Findings

### landing-mascot-avatars-01 - Delete the legacy mono-silhouette avatar path behind the always-true USE_V2 flag
- **Where**: `src/components/common/bird-avatar.tsx:16` (the flag), `:51-72` (WHITE + legacy Eye), `:74-608` (the 52-case `Species` switch), `:610-622` (`poseTransform`), `:682-733` (the `if (USE_V2)` wrapper and the entire legacy return block), imports `birdFor`/`BIRD_POSE_COUNT` at `:3-8`
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (with one caveat in Notes)
- **Evidence**: `const USE_V2 = true;` was set in commit b80b5cc (2026-06-29) and has never
  flipped since (`git log -S"USE_V2 = true"` shows exactly that one commit). Every render
  takes the `if (USE_V2)` early return at line 682; nothing after line 703 can execute. The
  file's own comment at lines 707-710 says the quiet part aloud: the legacy index mapping "is
  approximate for that dead path - it is not used while USE_V2 is on" - i.e. the fallback
  would not even render the *right* species if re-enabled, because the legacy case order
  never learned about the 2026-07-18 species-per-member migration or the 2026-08-04
  Roller/Dove slot swap. No test references the legacy path (`grep USE_V2 src/**/*.test.mjs`
  is empty; `avatar.test.mjs` tests the hash, not the renderer). 45 modules import
  `BirdAvatar` (depcruise Ca=45), so this dead code rides into the client bundle of nearly
  every page that shows an avatar.
- **What to do**: Delete lines 51-72 (`WHITE`, legacy `Eye`), 74-608 (`Species`), 610-622
  (`poseTransform`), and the legacy return block 705-733; collapse the `if (USE_V2)` wrapper
  so the v2 branch is the only body; delete the `USE_V2` const and its comment (11-16); drop
  the now-unused `birdFor` and `BIRD_POSE_COUNT` imports (keep `speciesForMember`). Update
  the doc-comment at lines 18-34 to stop describing the flag. Edit `docs/spec/avatars.md`
  line 8 ("the legacy mono path remains behind `USE_V2=false`") to say the mono path was
  removed in this audit, one line. `src/lib/avatar.ts` keeps `BIRD_POSE_COUNT` (bird-avatar-v2
  reads pose via `birdFor` there) - only this file's import changes.
- **Saving**: ~595 lines of code in one shipped file (734 -> ~140), plus that many lines of
  parsed-and-shipped JS in every client chunk containing an avatar.
- **Risk & gate**: low. `npm run check` (type + lint + tests), `npm run visual` (avatars are
  on nearly every baselined route), open `/feed` and `/birds` signed in.
- **Confidence**: high. The one thing that would change my mind: the owner saying he wants
  the mono-white silhouette *art* preserved - in which case move the `Species` switch into a
  lab room (e.g. a `/lab/birds-mono` gallery) instead of deleting, and the shipped file still
  shrinks by the same amount.
- **Notes**: The spec banner documents the flag's existence but does not argue for keeping
  it; two months of USE_V2=true, a superseding system that gained `birdOverride`, the Hoopoe
  hash-exclusion and the Roller reservation the legacy path knows nothing about, and the
  file's own "dead path" comment make this the clearest large deletion in my territory. This
  is also the single biggest honest line win here.

### landing-mascot-avatars-02 - The switched-off landing showcase (~2,200 lines) is still wired into the public landing route
- **Where**: `src/app/page.tsx:113-127` (the `SHOW_SHOWCASE = false` flag and its rationale),
  `:2-11` (static imports of every showcase component), `:132-252` (the gated JSX);
  the components only reachable behind the flag: `src/components/landing/landing-nav.tsx`
  (74), `ambient-leaves.tsx` (676), `perching-birds.tsx` (664), `feature-section.tsx` (104),
  `showcase-shot.tsx` (119), `trust-section.tsx` (71), `landing-footer.tsx` (81),
  `footer-hoopoe.tsx` (317, reached only via LandingFooter), `shots.ts` (56), plus
  `section-reveal.tsx` (60, used only by the gated sections) and ~120 lines of gated JSX and
  helpers (`Shot`, `MemoryTiles`, `Band`) in page.tsx itself
- **Phase**: placeholder (the flag) + relocate (the decoupling)
- **Tier**: T2 for the decoupling; T4 for the fate of the code     **Class**: structural     **Decides**: autonomous (decoupling) / owner (fate; see Owner decisions)
- **Evidence**: `const SHOW_SHOWCASE = false;` since commit cc4ed24 (2026-08-04), with the
  owner's words quoted in the comment: "I don't want to delete everything under the landing
  page, I just need to improve it further before it's shipped." Grep confirms nothing else
  imports these components except `src/app/lab/landings/_variant-*.tsx` (lab rooms). The
  landing route's client payload is the concern: `raw/route-js.txt` shows `/` at **636 KB
  route JS / 1,067 KB first load / 14 chunks** - the single most-visited signed-out page.
  Six of the gated files are `"use client"` (leaves, birds, nav, section-reveal,
  showcase-shot, footer-hoopoe) and are statically imported by page.tsx, so they are
  registered in the client-reference manifest regardless of the `false &&` around their JSX;
  whether the bundler's DCE actually drops their chunks from `/` is one manifest grep away
  for the bundle lens, but the source-tree coupling is certain either way.
- **What to do**: Mechanical, safe today, and reversible in one line: move everything inside
  the two `SHOW_SHOWCASE && (...)` blocks plus the `Shot`/`MemoryTiles`/`Band` helpers into
  one new file `src/components/landing/showcase.tsx` (a server component that renders
  nav + leaves + birds + the five bands + trust + footer), and remove ALL showcase imports
  from `page.tsx`. While the flag is off, page.tsx simply does not import it - the route's
  module graph carries only the hero. Turning the showcase back on is `import { Showcase }`
  plus one JSX line, exactly as cheap as flipping the flag is now. Keep `showScrollCue`
  wiring as is.
- **Saving**: page.tsx drops ~130 lines to ~60; 0 net lines elsewhere (it is a move), but
  potentially hundreds of KB off the landing's client payload (bundle lens to measure
  before/after). If the owner instead retires the showcase (see Owner decisions), ~2,200
  lines and 5 webp screenshots delete outright.
- **Risk & gate**: low. `npm run check`; `npm run visual` (the `/` baseline shows only the
  hero today, so the move must produce a zero-diff run); `npm run screenshot http://localhost:3000 landing`
  signed out.
- **Confidence**: high on the decoupling; the owner quote makes the fate his call.
- **Notes**: Two side-effects of the flag the owner should hear about (also under Owner
  decisions): (1) `LandingFooter` carries the Privacy / Terms / Guidelines links that
  security audit H12 called "the transparency layer's front door ... the documents a
  stranger should be able to find before an account exists" - with the flag off, the public
  landing page links to none of them; (2) `TrustSection` renders five invented names
  ("Ananya Krishnan", "Rohan Mehta"...) and a hard-coded "10 people vouched" pill - fine as
  a mock, but it must not ship as-is when the showcase returns.

### landing-mascot-avatars-03 - The tour ships in every member's layout chunk but can never run for a member
- **Where**: `src/app/(main)/layout.tsx:103` (`<TourProvider userId=... autoOffer={IS_DEMO}>`),
  `src/components/tour/tour-provider.tsx:27-29` (static imports of TourOffer, TourPanel,
  TourSpotlight - each of which statically imports the 1,522-line `Hoopoe` rig),
  `src/components/tour/` (9 files, 1,023 lines) + `src/lib/tour-local.ts` (55) +
  `src/lib/tour-auto-offer.ts` (19)
- **Phase**: placeholder (for the member site) / architecture (the loading shape)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (lazy-loading) / owner (whether members ever get the tour; see Owner decisions)
- **Evidence**: `autoOffer` defaults false and is passed `IS_DEMO`, so on the production
  member site the offer never arms; the only other entry is `useTour().start()` from
  `TakeTourAgainButton`, which `manual-tour-entry.test.mjs` pins to the admin Overview,
  owner-only ("the tour finish points the owner back to the Admin trigger"). So for every
  real member, TourProvider mounts on every (main) page, evaluates one `useEffect` that
  returns immediately, and renders `{children}` - while its statically imported
  offer/panel/spotlight components (and through them a second static path to the hoopoe rig)
  sit in the shared authed chunk.
- **What to do**: Inside `tour-provider.tsx`, load the three UI pieces with `next/dynamic`
  (ssr: false) the way `mascot-flight-layer.tsx:49` already loads the rig - they render only
  when `phase !== "idle"`, which for members is never and for the demo/owner is behind a
  click or a first-feed arrival where a one-network-fetch delay is invisible. The provider
  itself (context + state machine, ~250 lines) stays static so `useTour()` keeps working.
  Keep `tour-provider.test.mjs` green: it greps for `autoOffer` plumbing and `start`, not
  for the import style.
- **Saving**: 0 source lines; removes tour UI + one static rig path from the every-page
  authed chunk (bundle lens to size; the three files total 442 lines plus their motion/rig
  imports).
- **Risk & gate**: low-medium (dynamic import timing vs. the hoopoe choreography - the
  provider already awaits `apiRef.current` being registered, so a late panel mount is
  handled). Gate: `npm run check` incl. `tour-provider.test.mjs` and
  `manual-tour-entry.test.mjs`; then run the tour end-to-end once from the admin button.
- **Confidence**: high on the mechanics; medium on the payoff size until the bundle lens
  measures (the rig may remain in the shared chunk via the sidebar regardless - see
  finding 08; do 08 and this together or the chunk win does not materialize).
- **Notes**: I considered proposing the tour's deletion as "a subsystem no member can reach"
  - but it is live in the demo deployment (autoOffer={IS_DEMO}) and is the owner's own demo
  walkthrough, so it is not dead, just dormant on one of the two deployments. The real
  question (arm it for members at launch?) is in Owner decisions.

### landing-mascot-avatars-04 - The tour's Catch-ups stop points at a spotlight anchor that no longer exists
- **Where**: `src/components/tour/tour-steps.ts:100` (`spotlight: "catchups-explainer"`);
  registration sites: none (grep for `catchups-explainer` across src returns only that line;
  `useTourAnchor` is called only in `collection-client.tsx:119`, `create-post-form.tsx:191`,
  `directory-client.tsx:106`)
- **Phase**: dead (a dangling reference) - practically a bug in the demo's walkthrough
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The other three stops' keys (`feed-composer`, `directory-search`,
  `collection-contribute`) all have live `useTourAnchor` registrations. `catchups-explainer`
  has none, so `awaitSpotlight("catchups-explainer", 2500)` in tour-provider.tsx:170 always
  times out and the stop falls into the no-anchor fallback (`express("curious")`, no
  spotlight, no fly-and-point). The Catch-ups area was rebuilt recently (memory: "Catch-ups
  rebuild shipped"); the anchor evidently did not survive the rebuild.
- **What to do**: Add `useTourAnchor("catchups-explainer")` + `data-tour="catchups-explainer"`
  to whatever element on `/catchups` is the explainer card today (the catchups territory
  agent or a fixer session picks the exact element), or - if the demo is fine with the
  degraded stop - change `spotlight` to an existing key and delete the fallback dance. The
  first option is right: the fallback exists for slow pages, not for permanently missing
  anchors, and every demo visitor currently watches a 2.5 s stall on stop 4.
- **Saving**: 0 lines; restores a shipped behaviour and removes a guaranteed 2.5 s dead wait
  from the demo's walkthrough.
- **Risk & gate**: low. Run the tour from the admin button through stop 4; the hoopoe must
  fly to and point at the explainer.
- **Confidence**: high (grep is unambiguous; the timeout path is explicit in
  tour-provider.tsx:170-178).
- **Notes**: Found while answering the charter's "is the tour data-driven" floor question.
  It is data-driven (one `TOUR_STOPS` array carries order, routes, copy and anchors - no
  hand-unrolled steps), which is exactly why one stale string is the whole failure.

### landing-mascot-avatars-05 - Remove the `enabled` stop-flag machinery for a Groups tour stop that no longer exists
- **Where**: `src/components/tour/tour-steps.ts:12-15` (banner paragraph claiming "Groups
  keeps a reserved slot (`enabled: false`) between Catch-ups and Finish"), `:30` (the
  `enabled: boolean` field), `:61,75,86,101` (four `enabled: true`), `:111-112`
  (`ENABLED_TOUR_STOPS = TOUR_STOPS.filter(...)`), `tour-provider.tsx:26,116` (the only
  consumer)
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural (small)     **Decides**: autonomous
- **Evidence**: There is no Groups entry in `TOUR_STOPS` - all four stops are `enabled: true`,
  so `ENABLED_TOUR_STOPS` is identically `TOUR_STOPS` and the filter never filters. The
  banner comment describes a reserved slot that is not in the file. Groups was removed from
  the product entirely (memory: "Groups removed"; no `/groups` route exists in build.txt's
  route table), so the slot is not coming back in this shape. No test pins the field
  (`manual-tour-entry.test.mjs` greps only for the finish copy in this file).
- **What to do**: Delete the `enabled` field from the `TourStop` interface and the four
  literals, delete `ENABLED_TOUR_STOPS` and export `TOUR_STOPS` as the run list (or rename),
  update the two references in tour-provider.tsx, and rewrite the stale banner paragraph.
  knip's `TOUR_STOPS` unused-export line resolves itself in the same edit.
- **Saving**: ~8 lines + a false statement out of the file future sessions will read.
- **Risk & gate**: low. `npm run check` (tour tests are text-pins on other files).
- **Confidence**: high.
- **Notes**: If a fifth stop ever arrives, adding an object to the array is the same effort
  the flag was saving.

### landing-mascot-avatars-06 - Strip the unused `speed` plumbing from the mascot flight bus
- **Where**: `src/components/mascot/mascot-flight.ts:20-23` (banner sentence), `:41-52` (the
  `speed?` field and its 12-line doc), `:55-60` (`normalizeFlightSpeed`);
  `mascot-flight-layer.tsx:39` (import), `:70-82` (13-line comment on speed-scaled timers),
  `:280-284` (`speed` + `ms()`), `:303-317` (failsafe speed discussion + `ms(5800)`),
  `:330,344,362,500,525,588,591` (seven `ms(...)` call sites), `:584-585` (two-rAF "should
  not scale by speed" note)
- **Phase**: placeholder (LLM-bloat signature 5: an options param no caller passes)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The field's own doc says it: "Optional and unused by any current launcher -
  plumbing for a future faster/slower control." The only launcher is
  `landing-hero.tsx:223`, which passes `{ from, target }` and no speed. The layer's comments
  then spend ~30 further lines reasoning about what happens at speeds that can never occur
  (the `Math.min` bug discussion at 74-82 concerns "a future slow-flight caller" only).
- **What to do**: Delete `speed?` from `FlightLaunch` and `normalizeFlightSpeed`; in the
  layer, delete the import, `const speed = ...`, replace `const ms = (b) => b / speed` call
  sites with the base numbers (`ms(5800)` -> `5800` etc.), and trim the three comment blocks
  that exist only to reason about non-1 speeds (keep every derived-number comment that
  explains the 5800/2500/6000 relationship - those are load-bearing). No test references
  `normalizeFlightSpeed` (grep across `*.test.mjs` is empty).
- **Saving**: ~45 lines across the two files, most of them comment lines about a feature
  that does not exist; one exported function; one indirection (`ms()`) out of a file whose
  timing logic is already dense.
- **Risk & gate**: low (behaviour at speed=1 is byte-identical). Gate: `npm run check`; one
  manual landing -> Sign in flight watched end to end (the QA script
  `scripts/qa/hoopoe-landing-check.mjs` samples the flyer's transform if a recorded proof is
  wanted).
- **Confidence**: high. Would change my mind: the owner having actually asked for a
  slow-motion flight control (nothing in the specs or the moments board mentions one).
- **Notes**: I checked whether removing it would orphan the careful failsafe math - it does
  not; the 5800/2500/6000 relationships survive verbatim as constants. This file is
  otherwise a not-finding: its 314 comment lines are owner quotes, measured pixel numbers
  and audit IDs, exactly the kind CLAUDE.md mandates.

### landing-mascot-avatars-07 - Delete the dead `bindPassword` verb from the mascot controller API
- **Where**: `src/components/mascot/hoopoe.tsx:1002-1006` (implementation), `:1156` (api
  object entry); `hoopoe-kit.ts:176` (interface entry); `use-hoopoe.ts:62` (the one
  specially-cast wrapper line); `docs/spec/mascot.md:53` (documented in the Continuous verb
  list)
- **Phase**: dead
- **Tier**: T1     **Class**: structural (small)     **Decides**: autonomous
- **Evidence**: Zero call sites anywhere (`grep -rn "\.bindPassword("` across src finds only
  the use-hoopoe wrapper). The login/reset pages drive the peek-a-boo directly with
  `coverEyes()`/`peek()`/`gaze()` (login-client.tsx:166-191, reset-client.tsx:83-130). The
  implementation is also degenerate: it applies the current state once and returns a no-op
  unbinder (`return () => {}`), i.e. it never actually *binds* anything - a caller that
  trusted the name would get a silently broken feature.
- **What to do**: Delete the four code sites and the one spec line. The `getRevealed`
  pattern it gestured at is already implemented properly by the pages themselves.
- **Saving**: ~12 lines, one lying API name off a 33-method controller.
- **Risk & gate**: low. `npm run check`; open `/login` and toggle the password eye.
- **Confidence**: high.
- **Notes**: Related dead crumbs in the same API surface, same treatment, same commit:
  `parallel(...)` in hoopoe-kit.ts:130 has zero callers (the `{parallel}` branch in
  hoopoe.tsx:1144-1147 therefore never receives a value; both can go, ~8 lines - the `wait`
  helper next to it IS used), and `EASE_POP` in hoopoe-kit.ts:34 is an unused duplicate of
  `common/motion.tsx:24`'s EASE_POP (1 line). `land()` I checked and left: it is reachable
  from `/lab/mascot-moments` sequences.

### landing-mascot-avatars-08 - The hoopoe rig is statically imported into the always-loaded authed chunk by surfaces that render it rarely or never
- **Where**: `src/components/mascot/sidebar-hoopoe.tsx:37` (static `import { Hoopoe }`;
  rendered only after 90-120 s of idle), `src/components/mascot/moments/logo-easter-egg-hoopoe.tsx:37`
  (rendered on a triple-click), both mounted via `src/components/layout/sidebar.tsx:44,642`
  on every (main) page; plus the tour surfaces of finding 03. Full static-importer map of
  `hoopoe.tsx` (23 files) gathered for the bundle lens: auth pages (login, signup,
  auth-panel - these legitimately need it at first paint for the peek-a-boo), not-found,
  landing-hero, footer-hoopoe, playground, warmup, 4 moments, sidebar-hoopoe, tour-offer,
  tour-panel, messages-empty-hoopoe, dark-gauntlet, 3 catchups components, 2 lab pages.
  The ONE dynamic import in the whole app is `mascot-flight-layer.tsx:49`, which exists
  precisely to keep the rig out of the root layout chunk - a fix the sidebar path then
  defeats for every authed page.
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `hoopoe.tsx` is 1,522 lines of client code plus its motion imports.
  `raw/use-client.txt` line 289 shows the flight layer's dynamic import; nothing else lazy-
  loads the rig. Every authed page therefore parses the full rig on first load so that a
  bird *might* glide in two minutes later. `hoopoe-warmup.tsx` (landing only) demonstrates
  the pattern is already understood: it eagerly resolves `import("./hoopoe")` at idle time
  to warm the lazy chunk.
- **What to do**: Convert `sidebar-hoopoe.tsx` and `logo-easter-egg-hoopoe.tsx` (and the
  tour surfaces per finding 03) to the flight layer's exact `dynamic(() => import("./hoopoe")...,
  { ssr: false })` pattern. Both render `null` until an interaction/timer, so `ssr: false`
  costs nothing. Optionally add a `HoopoeWarmup`-style idle prefetch in the sidebar so the
  glide-in never pays a fetch. Do NOT touch the auth pages or the playground - there the
  bird is above the fold. Empty-state moments (no-results, no-saved, messages-empty) and
  celebration-hoopoe are secondary candidates; they mount per-page, not in the layout, so
  the win is smaller.
- **Saving**: 0 lines; the bundle lens should measure the authed shared chunk before/after.
  The rig + its subtree is the largest single client-code block in my territory.
- **Risk & gate**: medium (dynamic mount timing vs. the Strict-Mode onReady dance both files
  document; the flight layer proves the combination works). Gate: `npm run check`;
  `npm run visual`; summon the sidebar bird with Ctrl+Shift+H and triple-click the logo,
  watching for a first-time fetch stutter (the warmup pattern is the cure if one appears).
- **Confidence**: high that the imports are as mapped; medium on net KB until measured,
  because the win only lands if every always-mounted static path is converted in the same
  pass (one survivor keeps the rig in the chunk).
- **Notes**: This is the charter's "what does the mascot cost on every page" answer: at rest
  the mascot costs zero DOM and zero listeners beyond one idle timer and one bus callback
  (both files document this), but it costs every authed visitor the full rig download and
  parse up front. The fix keeps the owner's centrepiece byte-identical in behaviour.

### landing-mascot-avatars-09 - docs/spec/mascot.md documents a bell-delivery moment that was deleted from the code
- **Where**: `docs/spec/mascot.md:174-199` (the 26-line "Bell delivery" paragraph, including
  the Strict-Mode bug postmortem for `moments/bell-delivery-hoopoe.tsx`); the file it
  describes was deleted in commit 87c054d ("drop bell-delivery moment") along with
  `shouldOfferBellDelivery`; also `moments/moment-hoopoe.tsx:5-6` whose banner lists "empty
  group, loading companion" among the moments it serves - `empty-group-hoopoe.tsx` and
  `loading-companion.tsx` were deleted in commits 5bcbf61 and 0f414f9
- **Phase**: hygiene (stale docs)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `ls src/components/mascot/moments/` contains no bell-delivery file; grep for
  `BellDelivery|shouldOfferBellDelivery` across src returns nothing; git log confirms the
  deletions above. A future session reading the spec would go looking for wiring that is not
  there (the spec is the second document CLAUDE.md orders read before mascot work).
- **What to do**: Replace mascot.md's bell-delivery paragraph with one line ("A bell
  letter-delivery moment shipped 2026-08 and was removed in 87c054d; see git history"), and
  trim the two dead names from moment-hoopoe.tsx's banner. Check the same commit's other
  claims while there ("Wired in" also references the notification-bell wiring that went with
  it).
- **Saving**: ~28 lines of misleading spec/comments.
- **Risk & gate**: low; docs only. Gate: none needed beyond `npm run check` (no test reads
  mascot.md).
- **Confidence**: high.

### landing-mascot-avatars-10 - Move the misfiled sidebar test out of components/landing
- **Where**: `src/components/landing/landing-auth-ui.test.mjs` (23 lines)
- **Phase**: relocate
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Despite its name and location, the file's single test reads
  `../layout/sidebar.tsx` and pins the Support row's Phosphor Tree icon (owner decision
  2026-07-18, commit a2279ff). Nothing in it touches landing or auth UI. Its comment even
  narrates its own history of asserting stale decisions.
- **What to do**: `git mv` it to `src/components/layout/sidebar-support-icon.test.mjs` (the
  relative URL inside changes from `../layout/sidebar.tsx` to `./sidebar.tsx`). The test
  runner discovers `*.test.mjs` by glob, so nothing else changes.
- **Saving**: 0 lines; the landing folder stops advertising a test coverage it does not have,
  and the sidebar's one pinned decision lives next to the sidebar.
- **Risk & gate**: low. `npm run check` (the suite has a file-count floor; a move keeps the
  count).
- **Confidence**: high.

### landing-mascot-avatars-11 - Trim the knip-flagged export keywords across avatar/mascot/tour files
- **Where**: `src/components/common/bird-avatar-v2.tsx:87` (`archeTransform` - used only
  internally at :1794), `:1611` (`ARCHETYPE_COUNT` - zero references anywhere);
  `src/lib/avatar.ts:66` (`DRAWN_SPECIES_COUNT` - internal only), `:86` (`SPECIES_PINS` -
  internal only), `:140` (`fnv1a` - internal only; avatar.test.mjs mirrors its own copy);
  `src/components/landing/hero-photo.ts:23` (`AUTH_PANEL_VW` - internal only, derives
  AUTH_FORM_VW); `src/components/tour/tour-anchors.ts:28` (`reportSpotlight` - internal
  only, via useTourAnchor); `src/lib/tour-local.ts:38` (`readTourState` - internal only);
  `hoopoe-kit.ts:71` (`EyeShape` type - internal only)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Each verified by grep beyond knip's claim (knip's list also contains false
  alarms I am NOT proposing: `HOOPOE_HASH_REMAP_INDEX` is imported by `avatar.test.mjs:22`,
  so its export stays; `TOUR_STOPS` resolves via finding 05; `RARE_IDLE_CHANCE` is a tuning
  constant whose export makes it lab-inspectable - leave it or demote it, either is fine).
  `ARCHETYPE_COUNT` is the only one that deletes a line outright; the rest just lose the
  `export` keyword so the module's real surface is visible at a glance.
- **What to do**: Drop `export` on the eight internal symbols; delete `ARCHETYPE_COUNT`.
  Run `npm run check` - if any lint rule (`no-unused-vars` on module-scope consts) then
  fires on a now-unexported symbol that really is unused, that is the point.
- **Saving**: ~2 lines; clarity of module surface (the v2 file currently exports 9 things;
  after this, the 6 that are actually its API).
- **Risk & gate**: low. `npm run check`; `avatar.test.mjs` must stay green (it imports 6
  symbols from avatar.ts - none of the demoted ones).
- **Confidence**: high; each symbol grep-verified individually, not taken from knip on faith.

## Owner decisions

**The landing showcase (finding 02).** Everything below the landing hero - the five feature
bands with real screenshots, the falling leaves, the perching birds, the trust card, the
closing footer - has been switched off since 2026-08-04, on your own instruction to improve
it before shipping. It is finished-quality code, about 2,200 lines, and it still travels
with the landing page's download even though nobody sees it. Three choices: (a) finish and
ship it before launch, (b) keep waiting - in which case we should at least do the mechanical
decoupling in finding 02 so the landing page stops carrying it, or (c) accept the hero-only
landing as the launch design and retire the showcase (delete it or park it as a lab room;
git keeps it either way). Two things to know regardless: with the showcase off, the public
landing page currently has **no links to Privacy, Terms or Guidelines** (the security audit
called those "the documents a stranger should be able to find before an account exists") -
if the hero-only landing ships, those three links need a small home in the hero or a minimal
footer; and the trust card contains five made-up member names and a made-up "10 people
vouched" count that must become real (or clearly illustrative) before it ever renders.
My recommendation: do the decoupling now (it is free and reversible), decide (a) vs (c)
before launch, and give the policy links a home in the hero this week.

**The tour at launch (finding 03).** The hoopoe tour currently auto-offers only on the
public demo; on the real site the only way in is your own "hoopoe tour" button on the Admin
page. That is exactly what the tests pin, so it is working as designed - but launch is the
moment to decide the design: should a real member's first arrival at the feed get the offer?
If yes, it is a one-word change (`autoOffer` on) plus fixing the broken Catch-ups stop
anchor (finding 04). If no, the lazy-loading in finding 03 makes the dormant tour free for
members. My recommendation: turn it on for members at launch - it is warm, skippable,
remembered per-browser, and it is the best 60 seconds of onboarding the site has - and fix
the stop-4 anchor either way, because the demo shows that stall to every prospect today.

**The legacy mono bird set (finding 01).** The original off-white silhouette avatars (52
hand-drawn shapes) have been unreachable since June and would render wrong species if
re-enabled. I recommend deleting them outright; if the art has sentimental value, the same
deletion can move the drawings into a lab gallery room instead, at zero cost to the shipped
file. Either way the shipped avatar file drops from 734 lines to ~140.

**The install tile's admin gate.** "Add it to your phone" on the profile page is currently
shown to admins only, per your 2026-08-22 instruction ("for now only show it for admins").
Not bloat - just flagging that "for now" has a natural expiry at launch. One condition in
`profile/[id]/page.tsx` opens it to everyone on phones.

## Not-findings

- **mascot-flight-layer.tsx's comment density (1.18 comment/code, top-10 in the repo).**
  Read line by line: the comments are owner quotes with dates, measured pixel/ms numbers,
  audit IDs (Low 13), and two postmortems of real bugs (Strict-Mode double-mount, the
  shadow-stacking frame). This is the "every constant argued for" owner standard executed,
  not narration. Same verdict for `sidebar-hoopoe.tsx` (0.70) and `hoopoe-kit.ts` (0.64).
- **BG_MODE's dormant "outline"/"inset" branches in bird-avatar-v2.tsx (:1806-1839,
  `discFor`, `INSET_SCALE`, ~45 lines).** A flag hardcoded to "none", but explicitly
  defended by `docs/spec/avatars.md`: "the disc palette is held in reserve for the optional
  outline/inset modes... switching is a one-line change." The colour axis is still hashed
  and tested for exactly this reason (avatar.test.mjs's own banner says so). Kept.
- **bird-adjust.json.** All 51 entries are consumed: keyed by `ARCHES[i].name` (51 archetypes
  including the reserved Roller), imported by the shipped renderer and read at runtime by two
  lab harness pages plus `scripts/dev/centroid.mjs`, which regenerates it. Fully live.
- **avatar-swap.ts as a 39-line single-caller module.** LLM-bloat signature on its face, but
  the compare-and-swap exists to close audit C-050/C-131 (two-tab upload orphaning bytes in
  R2) and the file is one decision with one documented reason. Inlining it into
  settings/actions.ts would save ~5 lines and bury a write-path invariant. Kept.
- **The `<MascotFlightLayer>` in the root layout.** Renders null when idle, holds one bus
  callback, and lazy-loads the rig - it is the app's single `next/dynamic` and the pattern
  finding 08 asks the rest of the mascot to copy. Model citizen.
- **`InstallPromptCapture` mounting in the authed layout as a null component.** Looks like a
  no-op; is actually the only way to catch Chrome's once-per-load `beforeinstallprompt`
  before the member ever reaches the profile page - the file's banner documents the
  mechanism precisely. Kept.
- **hoopoe.tsx at 1,522 lines.** The size is 51 birds' worth of rig art plus a controller
  whose every verb is reachable by a member (all 33 verbs traced to app call sites, or to
  the public `/hoopoe` playground for walk/land). The jscpd hits inside it (3 clones, 6-13
  lines each, wing-pose blocks) are below any sensible extraction threshold - a shared
  "foldWings" helper would save ~15 lines and add a name for three subtly different poses.
- **one-hoopoe-guard.ts as a DOM class query instead of a bus.** Deliberate and documented
  in three files: every `<Hoopoe>` carries `.hoopoe-mascot`, so the DOM is the registry, and
  the flight bus's single-slot design must not gain second subscribers (footer-hoopoe.tsx
  explains the steal hazard).
- **`HoopoeWarmup`'s two-frame off-screen mount.** Documented perf fix for the first-flight
  stutter; the "technically a second hoopoe for 32ms" trade-off is argued in the banner.
- **The tour's admin-only finish copy ("use 'hoopoe tour' in the Admin panel").** Pinned
  intentional by `manual-tour-entry.test.mjs`; consistent with the tour being owner/demo-only
  today. Becomes wrong copy only if the owner enables the tour for members (Owner decisions).

## For other lenses

- **bundle lens**: the full static-importer map of `hoopoe.tsx` is in finding 08; `/` is
  636 KB route JS with the showcase off (finding 02) - measure the manifest before/after the
  decoupling; tour lazy-load (03) and sidebar/easter-egg dynamic (08) only pay off together.
- **lab agent**: `src/app/lab/_hoopoe.tsx` (134 lines) is the pre-rig HoopoeMascot, imported
  only by `lab/feed-canvas/page.tsx`; `mascot.md:223-224`'s open follow-up to remove its
  predecessor is otherwise complete (`components/auth/hoopoe.tsx` is already gone).
  `lab/landings/_variant-editorial.tsx:73-81` duplicates `components/landing/trust-section.tsx:2-10`
  (jscpd) - expected lab-copies-shipped direction, but worth a note in the pick ledger.
- **scripts lens**: knip lists `scripts/qa/hoopoe-idle-check.mjs`, `hoopoe-landing-check.mjs`,
  `hoopoe-zoom-probe.mjs`, `tour-mobile-verify.mjs` (+ its test) as unused files;
  `mascot-flight-layer.tsx:603` documents that `data-mascot-flyer` exists solely for
  `hoopoe-landing-check.mjs`, so that one is a kept tool; the zoom probe reads like a
  one-session repro of the Safari transform-origin bug now fixed and documented in RIG_CSS.
- **shell-primitives agent**: `sidebar.tsx` hosts both `SidebarHoopoe` (absolute-positioned
  over the profile row) and the logo easter egg's capture-phase wrapper - the two mascot
  couplings to know about before touching the rail; finding 08 proposes making both imports
  dynamic.
- **catchups agent**: finding 04 needs a `useTourAnchor("catchups-explainer")` home on the
  rebuilt `/catchups` explainer card.
- **docs lens**: `docs/spec/mascot.md` staleness is finding 09; `docs/spec/avatars.md` needs
  the one-line banner edit if finding 01 lands.

## Metrics

- Territory size: 54 files, ~11,500 lines (landing 2,730; mascot 4,153; tour 1,023 + 74 lib;
  pwa 278; avatar system 2,574 + 3.5 KB JSON; app routes ~430).
- Read: ~9,800 lines fully, ~1,700 skimmed with the banner/import/jscpd regions read.
- Biggest files: bird-avatar-v2.tsx 1,840; hoopoe.tsx 1,522; bird-avatar.tsx 734 (~595 dead);
  ambient-leaves.tsx 676 (off); perching-birds.tsx 664 (off); mascot-flight-layer.tsx 622.
- Comment-density leaders (all verified justified): mascot-flight-layer 314c/267l,
  install-app-tile 77c/85l, sidebar-hoopoe 86c/123l, hoopoe-kit 105c/165l.
- Dead or dormant totals: ~595 lines dead (01) + ~110 lines of small dead/placeholder
  (05,06,07,09) autonomous; ~2,200 lines owner-contingent (02); ~1,100 lines member-dormant
  but demo-live (03).
- Landing route client payload: 636 KB route JS / 1,067 KB first load / 14 chunks
  (route-js.txt), for a page that renders one hero image, two CTAs and a lazy mascot.
