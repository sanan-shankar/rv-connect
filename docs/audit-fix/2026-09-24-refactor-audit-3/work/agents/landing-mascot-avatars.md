# landing-mascot-avatars - refactor audit 3 report

Territory reader T10: the signed-out landing page, the hoopoe mascot (the rig, its controller, the
cross-page flight, the moments), the 50 hashable (+1 reserved) bird avatars and the images and
scripts behind them. Audit-only; the only file written is this one. Date: 2026-09-24, HEAD
`70570bcd`. Files in territory: 52 source files (+ 3 read-only scripts, 1 test I also own, 116
tracked images); read fully: all 52 source files, all 3 scripts, both specs, plus the out-of-charter
files my findings touch (`bird-avatar.tsx`, `auth-panel.tsx` head and `AuthHeading`,
`auth-first-frame.tsx` imports, `get-in-touch.tsx:150-280`, `sidebar.tsx:505-560`,
`konami-eggs.tsx:100-125`, `not-found.tsx:1-40`, `motion.tsx`, `motion-features.tsx`,
`avatar.test.mjs`, `lab/mascot-moments/page.lab.tsx:340-470`).

## Coverage

- **Read fully**: `src/app/page.tsx`, `src/app/hoopoe/page.tsx`, `src/app/(main)/birds/page.tsx`,
  `src/app/(main)/pick-bird/page.tsx` + `loading.tsx`; all 13 files of `src/components/landing/`;
  all 27 files of `src/components/mascot/` (including `hoopoe.tsx` all 1,700 lines and every file in
  `moments/`); `src/components/common/bird-avatar-v2.tsx` (head 1-140, tail 1,580-1,846 line by line,
  the 51 drawings by structural census: every entry's `name`, `skip` and line span, and six drawings
  read in full; they are art, and every one has the same `{ name, skip, draw }` shape);
  `src/components/common/bird-avatar.tsx`; `src/lib/avatar.ts`, `avatar-swap.ts`,
  `hoopoe-geometry.ts`, `app-icon-safe-zone.test.mjs`, `avatar.test.mjs`;
  `scripts/dev/build-app-icon.mjs`, `generate-icons.mjs`, `generate-bird-photos.mjs`;
  `docs/spec/mascot.md`, `docs/spec/avatars.md`, DESIGN-SYSTEM §7 and §9 (the landing, mascot and
  avatar lines); audit 2's `landing-mascot-avatars.md` (1,048 lines) and every row of audit 2's
  report and fix-prompt that touches this territory; the landed reports' "For other lenses"
  sections; bundle-build (02, 03, owner decisions, not-findings, carry-overs, metrics);
  auth-onboarding-settings (-03 and its carry-overs); common-primitives (01, not-findings,
  carry-overs); lab-rest-10.
- **Images**: `public/images/birds/` (102 PNG, measured), `icons/` (4), `brand/` (6),
  `landing.jpeg` (dimensions), `src/app/icon.svg`, `apple-icon.png`; reference counts for every one.
- **Measured from raw**: `raw/route-bundle-stats.json` (chunk sets and sizes for `/`, `/hoopoe`,
  `/login`, `/privacy`, `/birds`, `/pick-bird`, and the route set of every chunk named here),
  `raw/route-js.txt`, `raw/chunk-sizes-top30.txt`, `raw/cloc-by-file.csv`, `raw/jscpd.txt`.
  I did not open `.next/` (launch rule 7); every chunk ATTRIBUTION below is either bundle-build's
  string test (which I cite) or an inference from which routes share a chunk (which I label).
- **Skimmed**: nothing in territory.
- **Not read**: the middle 45 bird drawings line by line (see above; they are drawings, not logic).
- **Uncommitted edits seen (someone else's WIP)**: none. `git status --short` over every territory
  path is empty.

## Summary

The mascot and avatar systems are well built and very well argued; the structural well here is
about **where things load**, not how they are written. Five structural items carry the report.
(1) **The signed-out landing page, `/`, is invisible until its JavaScript has run** (the hero
renders at `initial="loading"`, opacity 0, and reveals from the photo's `onLoad`), and roughly a
third of what it loads above the floor is for things that happen only after a click or a 220 ms
stall: the hoopoe rig (31.9 KB raw / 8.6 KB gz, bundle-build's string test) and, by route-set
inference, the auth form's two chunks that `AuthFirstFrame` drags in (46.4 KB raw / 17.5 KB gz).
Three static edges pin the rig there, one of them through `AuthHeading`, a hook-free heading
stranded in a module that imports the rig (01). (2) **The 51 bird drawings (47.9 KB raw / 16.0 KB
gz) ride all 39 member routes** because two shell components each need one bird; audit 2's free
half of this fix never reached a phase row, and as written it would not have worked, because the
bundler follows modules, not props (02). (3) **The cross-page flight choreography and the mascot
kit sit in the root floor of all 118 routes** for a flight that only ever launches from `/` on a
desktop (03). (4) **The saved-contact bird photos are 102 pre-rendered PNGs** plus a generator that
must be re-run by hand whenever a bird changes, although the calling card already draws that very
bird as SVG and already re-encodes the photo on a canvas (04). (5) **The empty-state moments have
never played**: `MomentStage` mounts its IntersectionObserver while its stage is not rendered, so
the choreography and the new "keep living" beats never start for no-results, no-saved and
empty-messages; the lab room the owner approved them in renders its stage unconditionally, which is
why nobody saw it (05, a bug routed to the bug lens, and a simplification because the fix is to use
the one stage shape `ContributedHoopoe` already has).

In the right units: up to ~78 KB raw / ~26 KB gz off `/` (01); ~48 KB raw / ~16 KB gz off roughly
15-20 member routes (02, measured per route after the change); ~8-12 KB raw off all 118 routes (03,
estimate); −102 files / −698 KB tracked / −1 script (04); −1 query per `/feed` and `/welcome` render
(06). Structural vs cheap: 10 structural (01-06, 08, 09, 11, 15), 5 cheap (07, 10, 12, 13, 14).
What surprised me: how much prior-audit guidance in the code is now wrong in a way that would stop
a fixer (the `not-found.tsx` claim that the landing draws the bird at first paint; bundle-build-02's
"keep the server render" advice for `ResidentHoopoe`, which never server-renders). What earlier
audits left that is now moot: G9's `hoopoe-geometry.ts` half (it ships now, in the logo peek), B2
for the logo egg (it no longer uses the rig at all), A17's `ring` (no shipped caller left).

## Findings

### landing-mascot-avatars-01 - Take the hoopoe rig and the auth-form preview off `/`'s first load: the landing is invisible until its JavaScript runs, and ~78 KB of that JavaScript is for a click or a 220 ms stall
- **Where**: `src/components/landing/landing-hero.tsx:10` (`import { Hoopoe } from
  "@/components/mascot/hoopoe"`, used only by `HeroLoader` at `:450-469`, which renders only when
  `showLoader` is true at `:428-440`, i.e. 220 ms into a slow photo decode, never on the server);
  `:12` + `:445` (`HoopoeWarmup`, which renders `null` until idle); `:21` + `:261-265`
  (`import { AuthFirstFrame }`, rendered only when `phase === "exiting" && exitingTo`, i.e. after a
  desktop click on a CTA); `src/components/mascot/hoopoe-warmup.tsx:42`
  (`import { Hoopoe } from "./hoopoe"`) and `:56` (`void import("./hoopoe")`, a no-op next to the
  static import on every current mount); `src/components/auth/auth-first-frame.tsx:12`
  (`import { AuthHeading } from "@/components/auth/auth-panel"`) → `src/components/auth/auth-panel.tsx:8`
  (`import { Hoopoe } from "@/components/mascot/hoopoe"`), where `AuthHeading` (`:163-192`) is a
  hook-free presentational heading; the stale guard comment `src/app/not-found.tsx:17-18`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - `raw/route-bundle-stats.json`, `/`: 780,963 B raw / 247,736 B gz first load ("763 KB" in
    `route-js.txt`), of which 145,378 / 51,081 gz is above the 14-chunk floor, in six chunks:
    `0et6nzrgew7fc.js` 33,714 / 12,706 (motion engine, 15 shipped routes), **`1gnprwog56le7.js`
    31,884 / 8,633 (the hoopoe rig; bundle-build-02 string-confirmed it by the puppet's path literals
    `M0 -3.4 Q3 0 0 3.4 Q-3 0 0 -3.4 Z` and `M42 84 Q26 82 7 89`)**, **`01ya05e0tpt0o.js` 26,538 /
    9,483 (on exactly `/` + `/signup /login /reset-password /forgot-password /verify-email`)**,
    `0rdc1o7t83rd6.js` 20,605 / 7,688 (`/` only: the hero), **`2fo0ol_tfefr0.js` 19,877 / 8,027 (on
    exactly `/` + `/signup /login /reset-password /forgot-password`)**, `2lh508ihjcx5s.js` 12,760 /
    4,544 (`/` only). The two bold auth-only chunks are on `/` for one reason I can find in source:
    `AuthFirstFrame` imports `FloatField`, `PasswordField`, `Button` and `AuthHeading`
    (`auth-first-frame.tsx:3-12`). That attribution is by route set, not by string test.
  - **The hero is JS-gated.** `landing-hero.tsx:247` `initial="loading"`; the photo layer's
    `loading` variant is `{ opacity: 0, scale: 1.05 }` (`:152-161`), the brand's `{ opacity: 0 }`
    (`:76-80`), the headline's and both CTAs' `{ opacity: 0 }` (`:103-110`). Motion renders
    `initial` into the server HTML, and the reveal needs `onLoad` or the cache-hit check in an
    effect (`:163-211`), plus the async `domMax` feature chunk (`motion-features.tsx:29-32`: "an
    interaction in the first moments after load animates once the feature chunk lands; elements
    still render, and `initial` styles apply"). So on this page first-load JavaScript is on the path
    to the first visible pixel, which is not true of most routes.
  - **The rig is never drawn at rest on `/`.** `HeroLoader` needs a 220 ms stall
    (`:196-201`), `HoopoeWarmup` mounts off-screen at idle (`hoopoe-warmup.tsx:63-79`), the flight
    layer loads the rig through its own `dynamic()` (`mascot-flight-layer.tsx:48`). `mascot.md`'s own
    table says the landing bird "Hops in place until the photo decodes". bundle-build-02 filed the
    landing hero with the pages that draw the bird at rest; `not-found.tsx:17-18` says "Do NOT copy
    this to login, signup or the landing -- all three show the bird at first paint by design". That
    is true of `/login` and `/signup` and false of `/`, and it is exactly the sentence that would
    stop a fixer.
  - **One static edge is enough to keep a chunk** (audit 2's lesson, proved when
    `useSoloHoopoe` living in `moment-hoopoe.tsx` dragged the puppet onto `/privacy`; the fix moved
    the hook, `one-hoopoe-guard.ts:23-28`). So all three edges must go, including the one through
    `auth-panel.tsx`.
- **What to do**:
  1. Move `AuthHeading` (`auth-panel.tsx:161-192`, its docblock included) into its own module,
     `src/components/auth/auth-heading.tsx` (no `"use client"` needed: it has no hooks), and
     re-export it from `auth-panel.tsx` so the five auth pages need no edit. Point
     `auth-first-frame.tsx:12` at the new module. (T05's file: coordinate; it is a pure move.)
  2. In `landing-hero.tsx`, lazy-load the three late things:
     `const Hoopoe = dynamic(() => import("@/components/mascot/hoopoe").then((m) => m.Hoopoe), { ssr: false })`
     for `HeroLoader` (it passes `ref={ref}` from `useHoopoe()`; next/dynamic does not forward refs,
     so switch it to `onReady` the way `sidebar-hoopoe.tsx:43-58` documents, and keep the hop loop
     starting from `onReady`), and
     `const AuthFirstFrame = dynamic(() => import("@/components/auth/auth-first-frame").then((m) => m.AuthFirstFrame), { ssr: false })`.
  3. Turn `HoopoeWarmup` into the landing's prefetcher: keep `void import("./hoopoe")` (now real
     work), add `void import("@/components/auth/auth-first-frame")` behind the same
     `matchMedia("(min-width: 1024px)")` test `startExit` uses (`:220`; a phone never plays the exit,
     so it never needs the frame), and render the two-frame probe through a dynamic `Hoopoe`. Start
     the imports at mount, not at idle, so a fast click still finds them; the probe itself can stay
     idle-timed.
  4. The exit must not start before the frame chunk is there: `startExit` can
     `await import(...)` before `setPhase("exiting")` (a cached module resolves in a microtask), or
     keep today's order and accept one frame of empty cream on a click faster than the prefetch.
  5. Correct `not-found.tsx:17-18` to name `/login` and `/signup` only, and say why the landing is
     different.
- **Saving**: the rig **31,884 B raw / 8,633 B gz** off `/`'s first load (string-confirmed); the two
  auth-form chunks **46,415 B raw / 17,510 B gz** more if the route-set attribution holds; together
  **~78 KB raw / ~26 KB gz, about 10 % of `/`'s gzip first load and a third of what it loads above
  the floor**. The bytes are still fetched on a desktop, a moment later: `router.prefetch("/login")`
  (`:204-205`) and the warm-up pull them off the critical path, which is the point. A phone saves the
  form chunks outright. Possibly more: `0et6nzrgew7fc.js` (the motion engine, 33.7 KB) is on `/`
  either for the rig's `useAnimate`/`useSpring` or for something else eager; measure it after.
- **Risk & gate**: low-medium. The flight must still launch instantly and land seamlessly: the rig
  was already lazy in the flight layer, so nothing about the flight changes; the frame is the one
  new wait. Gates: `npm run check`; `npm run visual` (`/` is a baseline route, and its resting frame
  must not move); `node scripts/qa/hoopoe-landing-check.mjs` (samples the flyer frame by frame);
  by hand at 1440: a cold `/` then an immediate click on "Sign in" and on "Join" (DevTools, cache
  disabled, Fast 4G), and a throttled Slow 4G load to see the `HeroLoader` still appear; at 390:
  `/` loads with no rig request until the `/login` prefetch. Measure: `raw/route-bundle-stats.json`
  before and after, and `performance.getEntriesByType("resource")` on a cold `/` should not list
  the rig chunk before hydration. `auth-first-frame.test.mjs` pins copy and classes, not imports;
  it stays green.
- **Confidence**: high on the rig (string-confirmed, three edges read). Medium on the auth-form
  chunks (inferred from which routes share them: exactly the pages that render `FloatField`, plus
  `/`). What would change my mind: a string test showing those chunks are something `/` renders at
  rest.
- **Notes**: This is not a proposal to change the reveal: the owner's "never a beige-then-photo pop"
  is the reason the hero is gated, and it stays. It trims what rides with the gate. The same shape
  as bundle-build-02 and auth-onboarding-settings-03 ("eager for a later surface"), and it is the
  answer to charter question 1: `/` ships **0 bytes of bird drawings** (`01c64ezhe149a.js` is on no
  public route) and **~32 KB of rig plus the root floor's mascot share (finding 03)**, none of which
  it needs to paint. Related: 03 (the floor), 15 (the warm-up on the auth pages), bundle-build-02
  (the moments), for runtime-perf: the `domMax` feature chunk is fetched after hydration, so the
  hero's reveal waits on one more round trip on a cold visit; worth one Slow-4G trace of `/`.

### landing-mascot-avatars-02 - The 51 bird drawings ride all 39 member routes for two shell birds: split the names from the art, then cut the two shell edges (audit 2's free half, lost in compilation and wrong as written)
- **Where**: the art, `src/components/common/bird-avatar-v2.tsx:102-1609` (`const ARCHES: Arche[]`,
  51 entries, `draw: () => JSX` closures) and the data in the same module: `:1622-1674`
  `SPECIES_FULL_NAMES`, `:1685-1687` `GALLERY_SPECIES`, `:1697-1700` `speciesNameFor`,
  `:1703-1720` `slugifySpecies`/`SPECIES_SLUGS`/`SLUG_TO_SPECIES_INDEX`, `:1727-1750`
  `resolveBirdOverride`, `:1776-1778` `isMirrored`. The shell edges: `src/components/layout/sidebar.tsx:32`
  (`import { IdentityRow }`) and `:530-555` (the account pill), `identity-row.tsx:3`
  (`import { BirdAvatar, SIZE_TOKENS }`); `src/components/layout/konami-eggs.tsx:16` and `:121`
  (a flock of `BirdAvatar`s drawn only after the konami code). Client files that import only the
  DATA and so drag the art: `profile/letterhead-profile.tsx` (`resolveBirdOverride`,
  `speciesNameFor`), `onboarding/steps/photo-step.tsx` (the same two),
  `profile/get-in-touch.tsx` via `contactPhotoSrc` (`bird-avatar.tsx:46-51`), and
  `support/plate-data.ts` (a server-capable module imported by the client `bird-picker.tsx` and
  `bird-plate.tsx`).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (steps 1-3); the sprite is **owner** (Owner decision B)
- **Evidence**:
  - `raw/route-bundle-stats.json`: `01c64ezhe149a.js` = **47,902 B raw / 16,027 B gz on all 39
    member routes and no other route**; bundle-build's shell-tier breakdown names it "bird-avatar-v2
    46.3 KB" (and "next/image + link + bird wrapper 25.9 KB" is the `bird-avatar.tsx` side). Audit 2
    measured the same set at 47,415 raw on 39 routes: unchanged.
  - An array of closures cannot be tree-shaken: every reference to `ARCHES` keeps all 51 drawings,
    so any client import of anything in this module (a name, a slug, the mirror test) ships the art.
  - Audit 2's `landing-mascot-avatars-01` split the fix into a free half (take the shell edges out)
    and a sprite (owner). The report routed the sprite to owner question #16 and Q26 left it "as
    it is", but **the free half was never made a row**: `grep -n "konami\|IdentityRow" report.md
    fix-prompt.md` returns nothing. And as written it would not have worked: it proposed giving
    `IdentityRow` an `avatar` element prop, but `sidebar.tsx` would still import `identity-row.tsx`,
    which still imports `bird-avatar.tsx`, which imports the art; the chunk follows modules, not
    props (the `useSoloHoopoe` lesson, `one-hoopoe-guard.ts:23-28`).
  - About 23 non-lab client files import `BirdAvatar`, `IdentityRow` or `BirdGlyphV2`
    (post-card, comments-section, create-post-form, feed-column, mention-dropdown, alumni-map,
    image-viewer, message-composer, answer-card, people-picker, collecting, people-door,
    flush-avatar, person-detail, new-post-cta, get-in-touch, letterhead-profile, photo-step,
    bird-picker, bird-plate, wood, sidebar, konami-eggs). Routes whose only client-side bird is the
    shell's are the ones the edge cut frees.
- **What to do**:
  1. **Split data from art** (0 bytes on its own; it is what makes 2 and 3, and the sprite, able to
     move anything on `/profile/[id]` and `/welcome`). Move `SPECIES_FULL_NAMES`, `GALLERY_SPECIES`,
     `SPECIES_SLUGS`, `resolveBirdOverride`, `speciesNameFor` (bound it with
     `SPECIES_FULL_NAMES.length`, not `ARCHES.length`) and `isMirrored` into `src/lib/bird-species.ts`
     (it needs only `@/lib/avatar`). Re-export them from `bird-avatar-v2.tsx` so the lab rooms and
     `plate-data.ts` compile unchanged; repoint the shipped client importers (`letterhead-profile`,
     `photo-step`, `bird-avatar.tsx`'s `contactPhotoSrc`, `plate-data.ts`, `admin/people/actions.ts`)
     at the new module.
  2. **Konami**: `const BirdAvatar = dynamic(() => import("@/components/common/bird-avatar").then((m) => m.BirdAvatar), { ssr: false })`
     in `konami-eggs.tsx`. It renders `null` until a key sequence lands.
  3. **Sidebar** (T09's file; coordinate): split `identity-row.tsx` into a slot-only
     `IdentityRowBase` (no `BirdAvatar` import; takes `avatar: ReactNode`) and today's `IdentityRow`
     as a thin wrapper that passes `<BirdAvatar .../>` (so its 7 other callers change nothing).
     `sidebar.tsx` imports the base, and `app-shell.tsx` (a server component) renders the member's
     `<BirdAvatar user={...} size="sm" />` once and passes it down as a prop; the Sidebar can render
     the same element in the desktop rail and in the mobile drawer.
  4. Rebuild and diff `route-bundle-stats.json`: every member route with no other client importer
     should lose `01c64ezhe149a.js`. Expect `/about`, `/guide`, `/guide/[area]`, `/birds`,
     `/dark-mode`, `/letters`, `/letters/[id]` and most `/admin/*` among them; measure, do not
     predict (`/support` and `/pick-bird` keep it legitimately: `bird-plate`/`bird-picker` draw 12
     and 49 birds client-side).
- **Saving**: 47.9 KB raw / 16.0 KB gz off each freed route's first load; my estimate is 12-20 of
  the 39, measured after step 4. Lines: +~25 (a module, a base component), −~0.
- **Risk & gate**: medium-low. Nothing draws differently; the risk is an RSC boundary mistake in the
  sidebar (an element prop across a client boundary is fine; a function prop is not). Gates:
  `npm run check`; `npm run visual` (the sidebar is on every member baseline); the mobile drawer at
  390 (the same element rendered twice); the konami code once; `/profile/[id]`'s "You're a X" copy
  and the onboarding photo step's species line. `src/lib/avatar.test.mjs` imports `./avatar.ts`, not
  the moved names, so it is untouched.
- **Confidence**: high on the chunk and the edges; medium on how many routes step 4 frees (it
  depends on each route's other client components).
- **Notes**: I considered splitting the glyph set **per bird** (the charter's question) and reject
  it: a per-species `import()` makes an identity avatar render asynchronously in client trees and
  flicker in, and server-rendered avatars gain nothing from it. The other in-file alternative,
  pre-rendering each drawing to an SVG markup string at build time and rendering it with
  `dangerouslySetInnerHTML`, would shave perhaps a third off the chunk (the `jsx()` call overhead and
  the 59 runtime `mix()` calls) but adds a generated artefact and takes the drawings away from the
  person who draws them; not worth it next to steps 1-3 or the sprite. For Owner decision B, one fact
  audits 1 and 2 did not weigh: avatars rendered by the server inline their full SVG into the HTML
  and the RSC payload once per avatar (the directory grid, the feed rail, the admin people list);
  a sprite would shrink those responses too, not only the JavaScript.

### landing-mascot-avatars-03 - The cross-page flight and the mascot kit sit in the root floor of all 118 routes for a flight that only launches from `/` on a desktop: keep a listener in the root, load the stage on launch
- **Where**: `src/app/layout.tsx:5` + `:103` (`<MascotFlightLayer />` in the root layout, so it
  survives the `/` → `/login` navigation); `src/components/mascot/mascot-flight-layer.tsx:1-596`
  (265 code lines of choreography: `runFlight`, `fitPeak`, `tween`, the failsafe, the handoff);
  its imports `:31-42`, including `:33` `import { LEGS_DOWN_AT } from "./hoopoe-kit"`;
  `src/components/mascot/hoopoe-kit.ts:21` (`import { useMotionGovernor } from "@/components/common/motion"`)
  and `:244-258` (`useValleyMotion`, a one-line alias kept "under its old name"); its one caller
  `hoopoe.tsx:46` + `:1373`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: bundle-build's floor breakdown (14 chunks on all 118 routes) lists "providers/theme/
  mascot kit 19.4 KB (7.6 gz)" and "one-hoopoe guard 1.5 KB". The flight layer is statically imported
  by the root layout, so its whole module (and `hoopoe-kit`, which it imports for one number) is in
  that floor. Flights launch from exactly one place, `landing-hero.tsx:239` `launchFlight(...)`, and
  only at `min-width: 1024px` (`:220`). At rest the layer is, in its own words, "a single message-bus
  callback" (`:14-16`): true of its runtime cost, not of its download. `hoopoe-kit.ts` imports
  `common/motion` only for `useValleyMotion`, whose single caller could import `useMotionGovernor`
  directly (as `use-hoopoe-life.ts:24` and `footer-hoopoe.tsx:77` already do). Hypothesis for the
  bundle lens, not verified: if Turbopack keeps whole modules on import (the `useSoloHoopoe` lesson),
  this edge (layout → flight layer → kit → `common/motion` → `m`) is also one reason `m` and
  motion-dom core sit in the floor of `/privacy`, `/terms` and `/guidelines`.
- **What to do**:
  1. Delete `useValleyMotion` from `hoopoe-kit.ts` (`:244-258`) and call
     `const { paused } = useMotionGovernor()` in `hoopoe.tsx:1373`, importing it from
     `@/components/common/motion`. `hoopoe-kit.ts` then imports nothing and is pure constants and
     types. (The lab's `_kit.tsx` has its own `useValleyMotion`; untouched.)
  2. Split the layer: `mascot-flight-layer.tsx` keeps only the bus subscription and `active` state
     (~20 lines) and renders a `dynamic(() => import("./mascot-flight-stage"), { ssr: false })`
     when a flight is active; the stage module takes today's `runFlight`, `fitPeak`, the tweens, the
     constants and the dynamic rig. The flyer's constants `RIG_SIZE`, `BOX_H`, `BODY_CX/CY` move
     with it.
  3. Warm the stage where flights start: the landing's warm-up (finding 01, step 3) adds
     `void import("@/components/mascot/mascot-flight-stage")` behind the desktop test, so the first
     flight never waits.
- **Saving**: an estimated 8-12 KB raw / 3-4 KB gz off the floor of all 118 routes (265 code lines
  of choreography plus the kit's tables; estimate from source, to be measured as the floor chunk's
  size before and after). Lines ~+15 (the new module boundary).
- **Risk & gate**: medium-low; the flight is the owner's most-polished moment. Gates:
  `npm run check`; `node scripts/qa/hoopoe-landing-check.mjs` (the flyer's per-frame samples; its
  `data-mascot-flyer` hook, `:576-579`, must move to the stage); at 1440, a cold `/` then an
  immediate "Sign in", and a second flight after navigating back; `perch-report.test.mjs` reads
  `use-flight-arrival.ts` only and stays green.
- **Confidence**: high that the layer is in every route's floor (a static root import); medium on
  the byte figure.
- **Notes**: This does not move the flight bus or the arrival hook: `mascot-flight.ts` (62 code
  lines, no imports) must stay loadable by both ends, and `use-flight-arrival.ts` is on the auth
  pages only. Do together with 01 (both touch the warm-up).

### landing-mascot-avatars-04 - Draw the saved contact's bird from the bird already on the card: retire 102 pre-rendered PNGs, their generator, and the "re-run it whenever a bird changes" duty
- **Where**: `public/images/birds/` (102 PNGs, 480x480, `{species}-{0|1}.png`);
  `scripts/dev/generate-bird-photos.mjs` (77 lines; needs `npm run dev`, signs in, drives
  `/lab/centroid` in Puppeteer); `src/components/common/bird-avatar.tsx:40-51` (`contactPhotoSrc`);
  `src/components/profile/get-in-touch.tsx:19` (the import), `:158-175` (`jpegBase64`: fetch, draw
  on a 384px canvas, `toDataURL("image/jpeg", 0.9)`), `:267-279` (the prefetch when the card opens),
  `:350` (`<BirdAvatar user={person} size={72} />`, the same bird, drawn as SVG on the open card);
  `docs/spec/avatars.md:23-27`; `scripts/README.md:96`.
- **Phase**: rewrite
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `git ls-files public/images/birds | wc -l` = 102; the two pose sets are 349,198 B
  and 349,200 B (698,398 B tracked, and under `public/`, so also traced into every server function
  until bundle-build-01 lands). The generator's own reason for pre-rendering is that "this stack's
  app/ directory refuses to compile a manual `react-dom/server` call" (`generate-bird-photos.mjs:4-11`),
  i.e. it considered rendering on the SERVER per request. It did not consider the client, where the
  card has the bird on screen as SVG at the moment Save is pressed, and where the photo is already
  drawn onto a canvas. The spec carries the maintenance cost in bold: "**Re-run it whenever a bird's
  drawing or `bird-adjust.json` changes**, or saved contacts keep the old bird" (`avatars.md:26-27`).
  tracked-weight judged the folder "not a weight problem", and it is not: this is about the pipeline.
- **What to do**:
  1. In `get-in-touch.tsx`, when `person.photoUrl` is null, build the photo from the rendered avatar:
     a ref on the avatar's wrapper, `const svg = ref.current.querySelector("svg")`,
     `new XMLSerializer().serializeToString(svg)`, wrapped in an outer SVG with the probe's framing
     (viewBox `-12.5 -12.5 125 125`, which is the `pad=1` 125-unit frame, and a `#F5F2EA` rect behind,
     the `PAPER` of `generate-bird-photos.mjs:41`), loaded through `new Image()` + `await img.decode()`
     (not `createImageBitmap`, which Safari and Firefox refuse for SVG), drawn on the same 384px
     canvas, `toDataURL("image/jpeg", 0.9)`. The pose comes for free: the serialized glyph already
     carries its mirror transform.
  2. `contactPhotoSrc` keeps only its photo branch (or goes, if the card calls `photoSrc` itself).
  3. Delete `public/images/birds/`, `scripts/dev/generate-bird-photos.mjs` and its README row
     (`scripts-ledger.test.mjs` fails on a README row naming a deleted script, and on a script with no
     row, so both in one commit), and rewrite `avatars.md:23-27`.
  4. If Safari taints the canvas in testing (it should not: the SVG has no `foreignObject`), the
     fallback is smaller: keep the pose-0 set, mirror on the canvas with
     `ctx.translate(side, 0); ctx.scale(-1, 1)` when `isMirrored(seed)`, and delete the 51 `-1.png`
     files and the generator's pose loop.
- **Saving**: −102 files, −698 KB tracked and deployed, −77-line script and its README row, one
  hand-run step that silently goes stale; +~15 lines in `get-in-touch.tsx`, −~10 in
  `bird-avatar.tsx`. Client JavaScript +0: the card already ships the glyph code to draw the bird.
  (Fallback: −51 files, −349 KB.)
- **Risk & gate**: medium-low. The saved contact must look the same. Gates: `npm run check`; open a
  profile of a member with no photo (both poses: pick one whose bird faces left) as Jerry Maguire,
  press Save contact on Chrome desktop, on iOS Safari and on Android Chrome, and compare the
  imported photo with today's PNG; a member with a photo must be unchanged (that path is not
  touched).
- **Confidence**: high on the mechanism and the savings; medium on cross-browser canvas behaviour,
  which is why step 4 exists.
- **Notes**: The `pad`/`flip` query parameters of `/lab/centroid` exist for this script
  (`generate-bird-photos.mjs:61`); after the retirement `scripts/dev/centroid.mjs` is the room's only
  driver (lab-rest's contract list). Tell the owner: it is invisible if it works, and it is in his
  contacts app, not the site.

### landing-mascot-avatars-05 - The empty-state moments have never played: `MomentStage` arms its IntersectionObserver while its stage is not rendered; use the one stage shape `ContributedHoopoe` already has
- **Where**: `src/components/mascot/moments/moment-hoopoe.tsx:44-72` (`useMomentAutoplay`: the
  effect reads `ref.current` once, deps `[ref, delay]` at `:71`), `:92-122` (`MomentStage`: `const
  solo = useSoloHoopoe()` at `:106`, `useMomentAutoplay(stageRef, ...)` at `:109-112`, then
  `if (!solo) return null;` at `:115`, so the `<div ref={stageRef}>` at `:118` does not exist on the
  first commit). The working shape: `contributed-hoopoe.tsx:127` (the same hook) with its stage div
  rendered unconditionally at `:164-219` and only the `<Hoopoe>` gated on `solo` (`:214-218`).
  Mount sites: `posts/post-feed.tsx:295` and `directory/directory-client.tsx:709`
  (`<NoResultsHoopoe size={76} />`), `profile/saved-posts-feed.tsx:188` (`NoSavedHoopoe`),
  `messages/(index)/page.tsx:130` (`MessagesEmptyHoopoe`).
- **Phase**: dedupe (and a bug, routed to the bug lens)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (tell the owner: the moments start playing)
- **Evidence**: commit 1: `solo` is `false` (it is `useState(false)` until an effect runs,
  `one-hoopoe-guard.ts:30-36`), `MomentStage` returns `null`, `stageRef.current` is `null`. In that
  commit's passive effects, the guard's effect schedules `setShow(true)`, and `useMomentAutoplay`'s
  effect finds no element and returns without an observer. Commit 2 renders the stage, but the
  effect's deps (`ref`, `delay`) have not changed, so it never runs again. No observer, no `play`,
  `played` stays `false`, and `useHoopoeLife(h, solo && played, lookAt)` (`:113`) never starts. The
  bird sits there breathing and blinking (the rig's own idle), which is why it looks alive enough to
  pass a glance. The shape predates `MomentStage` (every moment wrote it inline on 2026-07-06;
  `git show 7a55fa25^:src/components/mascot/moments/no-results-hoopoe.tsx`). The owner approved these
  moments in `/lab/mascot-moments`, whose own `useAutoplay` copy (`page.lab.tsx:354-380`, jscpd pairs
  it with `moment-hoopoe.tsx:48-60`) observes a stage that is always rendered (`:428-438`), so it
  plays there and only there. The 2026-08-26 refactor's check ("moves through 30 distinct poses",
  `7a55fa25`) would also be satisfied by breathing and blinking.
- **What to do**: render the stage div always and gate only the bird, as `ContributedHoopoe` does:
  `return <div ref={stageRef} aria-hidden className={className}>{solo && <Hoopoe ref={ref} size={size} />}</div>;`.
  Do not add `solo` to the hook's deps instead: that works, but leaves two stage shapes where one is
  proven. Move the 20-line "Deliberately NOT a useSyncExternalStore" docblock (`moment-hoopoe.tsx:24-43`,
  which describes `useSoloHoopoe`, not the hook it sits on) onto `useSoloHoopoe` in
  `one-hoopoe-guard.ts`, where that hook moved on 2026-08-26.
  **If bundle-build-02 lands (the rig lazy inside `MomentStage`)**, `play` must also wait for the rig:
  with a dynamic `<Hoopoe>`, `useHoopoe`'s verbs "resolve harmlessly" against a null ref
  (`use-hoopoe.ts:4-7`), so a `play` fired by the observer before the chunk arrives is silently a
  no-op. Start `play` from `onReady` when the stage has already been seen, or from the observer when
  the rig is already ready, whichever comes second.
- **Saving**: 0 lines; four moments start doing what `mascot.md`'s table says they do ("Looks left
  and right, small head shake. Rests").
- **Risk & gate**: low. Gates: `npm run check`; as Jerry Maguire, `/directory?q=zzzz` and a feed search
  with no match (curious, look left and right, a head shake, then the 7-12 s life beats), an empty
  saved list, an empty inbox, at 1440 and 390; with the sidebar bird summoned (Ctrl+Shift+H) the
  moment must still stand down.
- **Confidence**: high. It follows from React's effect rules, and the working sibling and the working
  lab copy differ from it in exactly this one respect. Verify live before editing (chrome-devtools:
  a `console.log` in `play` never fires on `/directory?q=zzzz` today).
- **Notes**: Corrections for bundle-build-02, from this reading: `MomentStage`, `ResidentHoopoe` and
  `CelebrationHoopoe` are all client-only in practice (`ResidentHoopoe`'s three callers render it only
  when their own `useSoloHoopoe()` is true, `almost-ready.tsx:74`, `completion-card.tsx:41`,
  `nothing-here.tsx:33`, and that is `false` on the server), so `ssr: false` is right for all three;
  the "keep the server render" advice for `ResidentHoopoe` does not apply.

### landing-mascot-avatars-06 - `CelebrationSignals` runs three queries on every `/feed` and `/welcome` render; two are one `groupBy`, and the profile-complete half reads a column nothing writes
- **Where**: `src/components/mascot/moments/celebration-signals.tsx:30-47` (a `findUnique` plus two
  `prisma.post.count`s in `Promise.all`; `profileComplete` needs `user.bio?.trim()` at `:45-47`);
  mounted by `src/app/(main)/feed/page.tsx:70` and `(main)/welcome/page.tsx:82`; the stale comments
  `:11` and `celebration-detector.tsx:68` ("currently just /feed").
- **Phase**: rewrite (queries) + placeholder (the `bio` condition)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous for the query; **owner** for what "profile complete" means (Owner decision D)
- **Evidence**: directory-profile's attribution of `raw/db-statements-live.json`: statements #42
  (17,445 calls) and #44 (17,444) are these two counts. `bio`: the only shipped writers are the demo
  seed (`src/lib/demo-seed/seed.ts:165`); `src/lib/admin-analytics.ts:856` says "The old `bio` column
  is retired", and profile editing writes `about`. So for any member without a legacy `bio`, the
  PROFILE_COMPLETE branch (`celebration-detector.tsx:94-112`) records "incomplete" and can never fire.
- **What to do**: replace the two counts with
  `prisma.post.groupBy({ by: ["kind"], where: { authorId: userId, isHidden: false, ...PUBLISHED_ONLY }, _count: { _all: true } })`,
  `postCount` = the sum, `letterCount` = the `letter` row. Fix the two comments to name both mounts.
  For `bio`: Owner decision D (default: count `about` in its place).
- **Saving**: −1 query per `/feed` and `/welcome` render (at today's rate, ~17k statement calls per
  stats window); ~2 lines.
- **Risk & gate**: low. `npm run check`; the first-Letter moment (0 → 1) and a post milestone still
  fire (`localStorage` keys `rv:moment:*`); `src/lib/posts.ts`' `PUBLISHED_ONLY` must be a plain
  `where` fragment (it is spread into both counts today).
- **Confidence**: high.
- **Notes**: The data-layer lens owns the statement list; this is the source line for it.

### landing-mascot-avatars-07 - The rig's dead surface: a prop, an option, a reaction and a guard that nothing uses, in a module on 17 routes
- **Where**:
  - `src/components/mascot/hoopoe.tsx:1330` `initialExpression?: Expression;` (not destructured at
    `:1350`, no caller in `src`, `scripts`, `e2e`, lab or docs; audit 2's -05, still open).
  - `hoopoe-kit.ts:149` and `hoopoe.tsx:532` `opts?: { label?: string; hold?: number }` on `point()`:
    the body reads only `opts?.hold` (`:539`); callers that pass a label anyway:
    `hoopoe-playground.tsx:59` (`{ label: "over here" }`, the public "tour guide" routine) and
    `src/app/lab/hoopoe/page.lab.tsx:80` (`{ label: "this" }`); `docs/spec/mascot.md:51` documents it
    (audit 2's -04, still open).
  - `hoopoe.tsx:1254-1261` `case "idleBored":` in `react()`, `hoopoe-kit.ts:120` the union member,
    `mascot.md:106`: no caller anywhere (the only other mention is prose on a card in
    `/lab/mascot-moments/page.lab.tsx:166`).
  - `hoopoe.tsx:1316-1323` `safeNow()` ("Date.now is blocked in some sandboxes", a try/catch around
    `Date.now()`), its two callers `:918`, `:1078`, and the `now > 0 &&` guard at `:920` that exists
    only for the catch branch. `Date.now()` does not throw in a browser; this reads as a leftover from
    prototyping in an artefact sandbox.
  - `src/components/mascot/moments/rare-idle-behaviors.ts:26` `inMonsoonWindow(now: Date = new Date())`:
    no caller passes `now`.
  - `src/lib/hoopoe-geometry.ts:331` `export const PEEK_CREST`: used only at `:340` (audit 2's -13).
  - `hoopoe-playground.tsx:228` `transition-[background] duration-500` on a `radial-gradient`
    background: gradients do not interpolate, so the sky snaps either way.
- **Phase**: dead / placeholder
- **Tier**: T1     **Class**: cheap (structural in kind, tiny in size)     **Decides**: autonomous
- **Evidence**: each grep-verified across `src/` (lab included), `scripts/`, `e2e/`, `docs/spec/`.
- **What to do**: delete `initialExpression`; drop `label` from both signatures and from the two
  callers (they become `["point", "right"]` and `h.point(targetRef.current)`) and fix `mascot.md:51`;
  delete the `idleBored` case, union member and `mascot.md:106` mention (the lab card's prose can stay
  or say "not built"); replace `safeNow()` with `Date.now()` and drop `now > 0 &&`; drop the `now`
  parameter; un-export `PEEK_CREST`; drop the inert `transition-[background] duration-500`.
- **Saving**: ~25 lines; one prop, one option and one reaction off a public API the `/hoopoe` page
  invites strangers to play with.
- **Risk & gate**: low. `npm run check` (TypeScript names every caller); open `/hoopoe`, run "Surprise
  me" until "the tour guide" plays (byte-identical), toggle Dusk (identical); five fast taps on any
  bird (the fluster still runs; `safeNow` fed its cooldown).
- **Confidence**: high.

### landing-mascot-avatars-08 - One small flight toolkit: the launch pose is written twice in the rig, and the quintic ease, `clamp`, `sleep` and the launch crouch are each written three to five times across the mascot
- **Where**: the launch pose, `hoopoe.tsx:740-750` (`flyCore`) and `:844-855` (`takeOffRaw`) (jscpd
  pairs `:737-745`/`:844-850` and `:745-750`/`:850-855`; audit 2's -15, still open). `smoother`
  (the C2 quintic): `mascot-flight-layer.tsx:72`, `moments/not-found-stage.tsx:78`, `hoopoe.tsx:669`.
  `clamp`: `hoopoe-kit.ts:290` exports it, yet `mascot-flight-layer.tsx:70` and
  `hoopoe-playground.tsx:90` re-declare it while already importing `hoopoe-kit`. `sleep`:
  `mascot-flight-layer.tsx:244`, `hoopoe.tsx:284`, `moments/contributed-hoopoe.tsx:72`,
  `moments/logo-peek.tsx:67`. The launch crouch: `moments/fly-away-hoopoe.tsx:35`
  (`LAUNCH_CROUCH_MS = 90`, "as the 404's flight does it") and `not-found-stage.tsx:230`
  (`hold(90, t)`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (the crouch numbers want a look)
- **Evidence**: the charter asked whether the idle, flight and arrival controllers are one state
  machine or several. Answer: **one protocol with three parties** (bus `mascot-flight.ts`, flyer
  `mascot-flight-layer.tsx`, destination `use-flight-arrival.ts`), not overlapping machines, **plus
  four independent viewport-flight drivers** that each own their own travel (the landing flight, the
  404's `flyTo`, `FlyAwayHoopoe`, and the rig's in-SVG `arcAndLand`) and each re-derived the same
  small helpers. The idle side is layered, not duplicated: the rig's own breathe/blink/sparkle/flick
  (`hoopoe.tsx:1424-1516`), `useHoopoeLife`'s 7-12 s beats after a moment, `rare-idle-behaviors`' 1 %
  roll on the sidebar bird, and the 404's own emote loop (which must avoid root-moving verbs and says
  why, `not-found-stage.tsx:42-48`).
- **What to do**: export `smoother`, `sleep` and `LAUNCH_CROUCH_MS = 90` from `hoopoe-kit.ts` (every
  file above imports the kit already, or can at no cost: it is in the root floor today, and after
  finding 03 it imports nothing); delete the local copies; import `clamp` in the playground and the
  flight layer. For the launch pose, widen `takeOffRaw(dir: 1 | -1 = 1)` to `dir: -1 | 0 | 1` (audit
  2's verifier: the proposed `takeOffRaw(0)` does not typecheck as the signature stands) and have
  `flyCore` `await takeOffRaw(0)`. That adopts `takeOffRaw`'s crouch (`0.26 s`, `scaleY 0.88`, `y 5`)
  for the in-SVG flight instead of `flyCore`'s (`0.22 s`, `0.9`, `4`); look at `/hoopoe`'s "Fly in"
  and a tap-to-fly before and after, and if the 40 ms matters, pass the numbers in.
- **Saving**: ~25 lines; one place for "how this bird takes off". Leave the two rAF `tween`s
  (`mascot-flight-layer.tsx:225-242`, `not-found-stage.tsx:199-211`): one cancels by generation, the
  other by token, and a shared helper would need both.
- **Risk & gate**: low. `npm run check`; `/hoopoe` (Fly in, tap the sky, "the forager"); the landing
  flight once; a 404 click-to-fly; the Collection's "See them in the Collection" fly-away (or
  `/lab/hoopoe-lives`).
- **Confidence**: high on the duplication; medium on whether the crouch difference was deliberate
  (nothing says it was, and `takeOffRaw`'s banner says the cross-screen primitives "reuse the proven
  poses from flyCore").
- **Notes**: Not proposed: merging the in-SVG landing (`arcAndLand`, `:717-731`) with `perchRaw`
  (`:896-911`), the other jscpd pair; audit 2 recorded their three argued divergences and they hold.

### landing-mascot-avatars-09 - Name the flight's three deadlines once: 2500 < 5800 < 6000 live in two files and two comments, and the comments have already drifted
- **Where**: `mascot-flight-layer.tsx:283` (`const failsafeMs = 5800`), `:317`
  (`const perchTimeoutMs = 2500`), the explanatory comments `:62-68` and `:266-282`;
  `use-flight-arrival.ts:292` (`setTimeout(reveal, 6000)`) and `:287-291`.
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the invariant (perch wait < flyer failsafe < destination fallback, so the flyer always
  hands off before a page reveals its own bird) is kept by prose in two files. The prose is already
  wrong twice: `mascot-flight-layer.tsx:62-65` says the 6000 is "/login and /signup's `fallback =
  setTimeout(reveal, 6000)`... Referenced only in this comment, not imported -- those pages don't
  depend on this module", but it lives in `use-flight-arrival.ts`, which imports the bus
  (`:34-40`); and `use-flight-arrival.ts:287-288` says "(5800ms at the default speed, ...)", a speed
  setting audit 1 deleted.
- **What to do**: export `PERCH_WAIT_MS = 2500`, `FLYER_FAILSAFE_MS = 5800`,
  `ARRIVAL_FALLBACK_MS = 6000` from `mascot-flight.ts` (the module both ends already import), with the
  ordering stated once beside them; use them at the three sites; shrink both comments to a pointer.
  Optionally pin the order in `perch-report.test.mjs` with three imports and one assertion (the bus is
  plain TypeScript and imports under Node's type stripping).
- **Saving**: ~0 lines net; two stale statements gone and the invariant checkable.
- **Risk & gate**: low. `npm run check`; one landing flight.
- **Confidence**: high.

### landing-mascot-avatars-10 - The hero's hover wash animates `background-color` on a full-viewport layer: cross-fade a black layer's opacity instead
- **Where**: `src/components/landing/landing-hero.tsx:306-310`
  (`className="absolute inset-0 transition-colors duration-700 ease-in-out" style={{ backgroundColor: hovered ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.03)" }}`).
- **Phase**: rewrite
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the layer covers the whole viewport; a `background-color` transition repaints it every
  frame for 700 ms on the first mouse-over, on the page whose smoothness the owner watches most.
  CLAUDE.md: "Only `transform` and `opacity` animate". A black layer at opacity `a` paints the same
  pixels as `rgba(0,0,0,a)`.
- **What to do**: `className="absolute inset-0 bg-black transition-opacity duration-700 ease-in-out" style={{ opacity: hovered ? 0.18 : 0.03 }}`.
  (`bg-black` is not a surface, and the hero already carries the protocol's photo-overlay exemption
  for its white CTA; check `protocol-audit` accepts it, or use an `rgb()` inline background.)
- **Saving**: 0 lines; a compositor-only fade instead of a 700 ms full-screen repaint.
- **Risk & gate**: low. `npm run visual` (`/` baseline: identical at rest); hover at 1440.
- **Confidence**: high.

### landing-mascot-avatars-11 - `one-shot.ts` is the app's per-user localStorage latch, not a mascot file: move it to `src/lib/`
- **Where**: `src/components/mascot/moments/one-shot.ts` (46 lines); importers
  `moments/celebration-detector.tsx:22`, `components/demo/demo-bar.tsx:35`,
  `components/onboarding/onboarding-flow.tsx:42` (whose comment at `:118-122` records that onboarding
  adopted "the mascot's one-shot latch" deliberately).
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: two of its three importers are not mascot code; it depends only on
  `@/lib/local-storage`.
- **What to do**: `git mv` to `src/lib/one-shot.ts`, update the three imports, widen its banner from
  "celebration moments" to "one-shot latches (the celebrations, the onboarding welcome, the demo
  bar)". **Keep the `rv:moment:` key prefix**: changing it would re-fire every latch for every
  existing member (the post-signup welcome, the onboarding skip).
- **Saving**: 0 lines; one fewer cross-folder surprise.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.

### landing-mascot-avatars-12 - Small dead surface in the avatar modules
- **Where**:
  - `src/lib/avatar.ts:141-146` + `:165` `BirdChoice.color`: computed on every `birdFor`, read by
    nobody (every caller reads `.species`, `.pose` or `.colorIndex`).
  - `src/components/common/bird-avatar-v2.tsx:1795` `const bird = birdFor(seed);` is used only by the
    dormant `inset` branch (`:1839`), while `isMirrored(seed)` at `:1797` hashes the same seed again
    (`:1777`): two salted-FNV triples per glyph render; `const flip = bird.pose >= 2` reuses the first.
  - `avatar.ts:44` `BIRD_SPECIES_COUNT` and `:47` `BIRD_POSE_COUNT` are exported with no importer (the
    test mirrors them on purpose; audit 2's -13).
  - Stale docblocks: `avatar.ts:80-87` (`SPECIES_PINS`: "until a settings UI lets members pick their own
    bird", "should migrate to an avatarSpecies column"; the `birdOverride` column and `/pick-bird`
    exist); `bird-avatar-v2.tsx:1612` (`ARCHETYPES`: "preview/centroid + scripts/dev/centroid.mjs"; its
    consumers are five lab rooms); `src/app/lab/hoopoe-marks/_parts.tsx:25` re-exports `H, G` for no
    consumer (lab; audit 2's -13).
- **Phase**: dead / hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **What to do**: drop `color` from `BirdChoice` and `birdFor`; reuse `bird` for `flip`; un-export the
  two counts; rewrite the two docblocks; drop the lab re-export.
- **Saving**: ~5 lines; one hash per avatar render.
- **Risk & gate**: low. `npm run check`; `src/lib/avatar.test.mjs` imports none of these.
- **Confidence**: high.

### landing-mascot-avatars-13 - Stale comments in the mascot and landing files, including three that would mislead a fixer
- **Where** (each verified against the code it describes):
  - `src/app/not-found.tsx:17-18`: "the landing ... show[s] the bird at first paint" (false; see 01).
  - `mascot-flight-layer.tsx:18-20` ("the landing's scroll-companion hoopoe is out of view") and
    `:44-47` ("the scroll companion has already loaded it"): the scroll companion is `footer-hoopoe.tsx`,
    in the switched-off showcase; the rig is on `/` because of `HeroLoader` and the warm-up (audit 2's
    -12, still open).
  - `hoopoe-warmup.tsx:7-12` (the footer bird "only mounts once scrolled into view": it never mounts)
    and `:23-26`.
  - `landing-hero.tsx:412-413` ("see SHOW_SHOWCASE in src/app/page.tsx": the constant is gone; audit
    2's -12).
  - `moments/moment-hoopoe.tsx:3-15` (lists "empty search results, empty saved posts, and friends";
    four moments now, one of them a celebration) and `:24-43` (the docblock of `useSoloHoopoe`, left on
    `useMomentAutoplay`; finding 05 moves it).
  - `moments/messages-empty-hoopoe.tsx:8-10` ("on desktop where the sidebar resident holds the
    one-hoopoe slot": it only holds it after 90-120 s of idle).
  - `moments/logo-easter-egg-hoopoe.tsx:30-33` ("the peek (its geometry and the edge-light filter)"):
    the edge light came out in `86447f73`.
  - `moments/celebration-signals.tsx:11` and `celebration-detector.tsx:68` ("currently just /feed"):
    `/welcome` too.
  - `sidebar-hoopoe.tsx:23-26` names "the landing scroll companion" among the birds the guard covers.
  - Dormant showcase: `showcase-shot.tsx:10` and `ambient-leaves.tsx:296-297` point at `page.tsx`, where
    `Band` and the tilt alternation no longer live (they are in `showcase.tsx`).
  - Specs: `docs/spec/mascot.md:13-20` (`## Files` names five files and a `src/app/preview/...` path),
    `:51` and `:106` (finding 07), `:280-283` (the "Sign-in fly-in" follow-up, built in August);
    `DESIGN-SYSTEM.md:482-483` ("wire the hoopoe onto the signup password field": done).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **What to do**: correct each to what the code does now; the spec lines ship with whichever code
  change touches them (one-commit rule), not as a `docs:` commit.
- **Saving**: ~0 lines; ten wrong statements gone from files the next mascot session reads first.
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.
- **Notes**: The comment mass itself is not bloat. Reason-carrying example that stays:
  `mascot-flight-layer.tsx:521-547` (why `flushSync` makes the shadow hand-off land in one paint,
  with the owner's 2026-08-04 report). Restating example, the rare one: `hoopoe.tsx:1415`
  "// expose to onReady once mounted" over a six-line effect named by its body. I found fewer than five
  of the second kind in 5,775 mascot lines.

### landing-mascot-avatars-14 - E8's residue: the one real item is the missing Strict-Mode deferral in `CelebrationHoopoe`; the waiter unification is not worth a row
- **Where**: `moments/celebration-hoopoe.tsx:71-73` (`handleReady` calls `playCelebration` directly);
  the siblings that defer: `mascot-flight-layer.tsx:191-194`, `sidebar-hoopoe.tsx:221-232`,
  `moments/fly-away-hoopoe.tsx:55-58`. The waiters: `sidebar-hoopoe.tsx:65` (8 s, forever),
  `celebration-detector.tsx:35-36` (3 s x 10), `logo-easter-egg-hoopoe.tsx:64` (one check, no retry,
  by design), `footer-hoopoe.tsx:89` + `:150-157` (4 s, and a private copy of the DOM query; dormant).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: unchanged since audit 2 except that the logo egg now guards `LogoPeek`, not a rig.
  Two live retry loops with different, argued constants; a shared `waitForClearStage` would cost what
  it saves (audit 1's measured lesson).
- **What to do**: wrap `celebration-hoopoe.tsx:72` in `setTimeout(() => ..., 0)` with a one-line
  pointer to `mascot-flight-layer.tsx:162-190`. Record E8 as closed-by-judgement: the waiting stays per
  caller.
- **Saving**: 0 lines; `/welcome`'s celebration plays the same on localhost as deployed.
- **Risk & gate**: low (dev-only symptom). `npm run check`; a fresh account's first `/welcome` on
  `npm run dev`.
- **Confidence**: high.

### landing-mascot-avatars-15 - `HoopoeWarmup` on `/login` and `/signup` warms a rig those pages have already drawn (audit 2's auth-edge-04, re-verified)
- **Where**: `src/app/(auth)/login/login-client.tsx:15` + `:383-386`, `(auth)/signup/signup-client.tsx:14`
  + its mount; the component `src/components/mascot/hoopoe-warmup.tsx:4-38`.
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the warm-up's one job is the landing's case, "there is usually no `<Hoopoe>` mounted
  anywhere yet" (`:7-19`). Both auth pages render their own `<Hoopoe>` at first paint (at opacity 0
  during an inbound flight, which still lays out and paints), so by idle time the cost it pre-pays is
  paid. Its mount comment ("in case a visitor lands here directly and bounces back to the landing hero
  to fly again", `login-client.tsx:383-385`) describes a case the landing's own warm-up covers on the
  way back. auth-onboarding-settings deferred this row to T10 ("OPEN inside E11's mascot tail").
- **What to do**: delete the import and the mount (and its comment) from both auth clients. Leave the
  landing's.
- **Saving**: ~10 lines; one off-screen rig mount per `/login` and `/signup` load, right when the
  mobile fly-in starts.
- **Risk & gate**: low. `node scripts/qa/hoopoe-landing-check.mjs`; landing → Sign in → back → Sign in
  at 1440 (the second flight must not stutter); `npm run visual`.
- **Confidence**: medium-high; would change with a measured second-flight stutter that only the
  auth-page warm-up fixed (none is recorded).

## Owner decisions

**A. The front page's pictures are gone; the switched-off section still points at them.** *(rows:
landing-mascot-avatars carry-over D2 + lab-rest-10, one question)*
- *What I'd change*: nothing is broken on the live front page. But the section below the hero that you
  chose to keep switched off (last audit) shows five screenshots of the site, and on 7 September your
  own cleanup deleted those five pictures. The switched-off section and the design lab's landing room
  both now point at pictures that do not exist.
- *What you'd notice*: nothing on the live site. In the lab's landing room, the feature screenshots are
  broken images today.
- *If I guess wrong*: if you want the section back one day, the pictures are one command away in the
  project's history, or you may want fresh ones anyway (they were taken in July).
- *Options*: (a) bring the five pictures back from history, as they were; (b) leave the section's code
  as it is and replace the missing pictures with plain placeholder frames; (c) leave everything as it is.
- *If you don't reply I'll do*: (b). It keeps your decision to keep the section, costs nothing, and stops
  the lab room drawing broken images.

**B. The fifty bird drawings as one shared picture file (a "sprite").** *(rows: landing-mascot-avatars-02,
bundle-build owner decision 3; carried from audits 1 and 2)*
- *What I'd change*: first, without asking, the free part: every member page downloads all fifty bird
  drawings because the sidebar and the konami easter egg each need one bird; I would hand them their
  one bird instead. Then, only if you agree: keep the fifty drawings in one picture file the browser
  fetches once and remembers, instead of as code in every page.
- *What you'd notice*: nothing for the first part. For the second, the birds should look identical; the
  directory and other pages full of birds would also get lighter to load.
- *If I guess wrong*: the second part changes how the site's most repeated picture is drawn, so it would be
  tried in the lab first, and you would compare before and after.
- *Options*: (a) free part only, then measure and ask again; (b) free part plus the picture file;
  (c) neither.
- *If you don't reply I'll do*: (a). It may turn out the free part is most of the win.

**C. The five proportion sliders in the mascot's lab room.** *(rows: landing-mascot-avatars not-findings;
mascot.md "Open follow-ups: Proportions")*
- *What I'd change*: the lab room where the hoopoe was designed has sliders for head size, eye size, eye
  height, eye spacing and beak length, waiting since July for you to pick final values. Every hoopoe on
  the site carries the code for those sliders. If the bird you have now is the bird you want, I would bake
  today's values in and take the sliders out.
- *What you'd notice*: nothing on the site; the lab room would lose its slider panel (the rest of the room
  stays).
- *If I guess wrong*: you wanted to keep tuning the face. The sliders are in the project's history.
- *Options*: (a) keep the sliders, you still mean to tune; (b) the current bird is final, take them out.
- *If you don't reply I'll do*: (a). It is your design room.

**D. The hoopoe's "you finished your profile" moment can never happen.** *(rows: landing-mascot-avatars-06)*
- *What I'd change*: the hoopoe is meant to appear proudly when a member finishes their profile. It checks
  for four things, one of which is an old "bio" field the profile no longer has (you replaced it with
  "About" in the summer). So for nearly everyone it never fires.
- *What you'd notice*: members who fill in About, their city, their workplace and their job title would see
  a short proud hoopoe on the feed, once.
- *If I guess wrong*: you had quietly dropped this moment and prefer it off.
- *Options*: (a) check "About" instead of the old field; (b) remove the profile half of the moment and keep
  the post-milestone half.
- *If you don't reply I'll do*: (a). It is what the mascot spec says the moment does.

## Not-findings

- **`use-flight-arrival.ts` (1.22 comment/code) and `mascot-flight-layer.tsx` (1.10).** Re-read line by
  line: every block carries a date, an owner quote, a measured number or a postmortem (the 85 ms forced
  layout, the two-frame veil lift, the flare's 53 px/s, the shadow's 0.33 double-alpha). Two stale
  sentences aside (09, 13), this is the "every constant argued" standard. `perch-report.test.mjs` pins
  two of the conclusions. Audit 2's verdict stands.
- **`src/lib/avatar.ts` at 1.73.** The largest block is the "never raise `BIRD_SPECIES_COUNT`" warning
  that `avatar.test.mjs` spends 200,000 hash evaluations enforcing.
- **`avatar.test.mjs` re-implements the hash instead of importing `birdFor`.** Deliberate ("so a bug in
  avatar.ts cannot hide behind the same bug in its test"), and since audit C-196 a parity loop ties the
  mirror to the real `hashSpeciesFor` on 2,000 seeds (`avatar.test.mjs:100-131`). Keep.
- **`BG_MODE`'s dormant `outline`/`inset` branches, `discFor`, `INSET_SCALE` and the 51 `skip:` lines**
  (~90 lines, `bird-avatar-v2.tsx:1752-1845` plus one line per drawing). Defended by `avatars.md`
  ("switching is a one-line change") and by audits 1 and 2. Numbers recorded, not re-argued. `mix()`
  stays regardless: the drawings call it 59 times.
- **`bird-adjust.json` read at runtime** (257 pretty-printed lines, ~2 KB in the chunk): a converged
  measurement `centroid.mjs` rewrites; baking it into `ARCHES` would make a script edit a `.tsx`.
- **The four brand SVGs with zero references** (`rishi-valley-mountain-mark{,-dark,-light,-white}.svg`,
  3,955 B). Audit 1's owner call: master vectors. Re-checked today: their paths are exactly the
  silhouette and planes `peaks-mark.tsx:73-155` still draws, so they are current, not stale.
- **`ResidentHoopoe` leaving the one-hoopoe guard to its callers.** All three callers use `solo` for their
  own layout too (`almost-ready.tsx:69,89,99`, `completion-card.tsx:45`), so the guard cannot move inside.
- **`hoopoe-geometry.ts` living in `src/lib/`.** Audit 2's G9 wanted it relocated as build-and-lab-only
  tooling; since `eb55658c` (2026-09-17) the logo peek imports it at runtime, lazily. Its place is right now.
- **The icon pipeline's seam assertion at both ends** (`build-app-icon.mjs:58-66`,
  `generate-icons.mjs:67-74`): deliberate, "a silently flat Android icon is the failure this whole path
  exists to prevent". And `app-icon-safe-zone.test.mjs` decodes the shipped PNG and counts eye pixels
  inside Android's mask: the icon broke twice before it existed.
- **`useHoopoe`'s 33 hand-listed wrappers** (`use-hoopoe.ts:51-86`). A `Proxy` would be ~10 lines but loses
  the promise-vs-void split and TypeScript's check that every verb is wrapped.
- **`RIG_CSS` as a `<style>` in every rig** (19 rules, `hoopoe.tsx:1680-1700`). Moving it to `globals.css`
  would put it on every page to save a few hundred bytes on the few pages with two birds.
- **The poke system on every rig** (`hoopoe.tsx:208-222`, `:1070-1186`, ~130 lines, 2026-09-17): an
  owner delight ("every bird answers a tap"). Keep.
- **The hero's JS-gated reveal.** The owner's design ("never a beige-then-photo pop"). Finding 01 trims what
  loads with it; it does not touch it.
- **`showScrollCue`, `nudgeVariants` and `ChevronDown` in the hero** (only caller passes `false`): the
  documented two-line path back to the showcase (`page.tsx:24-29`), and D2 was declined. Keep.
- **`HoopoeWarmup` mounting a second real rig for two frames** on the landing: argued in its banner
  (`:31-38`); the guard is never polled.
- **The hero photo at 1680 px under `sizes="100vw"`** (tracked-weight's lead, confirmed:
  `sips` 1680x1260; the master `landing-original.jpeg` is 4032x3024, gitignored). A 2x 1440 laptop
  upscales it 1.7x; a 390x844 phone, where `object-cover` scales the 4:3 photo to the viewport's
  HEIGHT, displays ~1125 CSS px of width from a candidate the browser chose for 390 (`sizes` says
  100vw), about 2.8x. Sharper means more bytes on the page's LCP image, the opposite of this audit's
  goal; not proposed. If the owner ever wants it sharper: re-export from the master at ~2400 px and set
  `sizes="max(100vw, 133vh)"` (the cover width of a 4:3 image). For runtime-perf, not here.
- **The 102 bird PNGs as a weight problem** (tracked-weight: 6.6 KB each). Agreed; finding 04 is about the
  pipeline, not the weight.
- **Per-bird code splitting of the glyph set** (charter lead): rejected in 02's notes.
- **The 404 stage's own flight token kit** (`not-found-stage.tsx:95-132`): "one bird, one intent" needs
  cancellation the other drivers do not; only its ease and crouch join 08.

## Audit carry-overs in this territory

- **Audit 1 §4 #1 / audit 2 D2, the landing showcase**: DECLINED at audit 2 Q1 (keep, switched off).
  Still off and still 0 client bytes; 11 files / ~2,480 lines. New since: its five screenshots were
  deleted by the owner's own `f8ef8a20` (2026-09-07), so `shots.ts:22-56` names five missing files
  (Owner decision A). Internal state if it ever ships: `trust-section.tsx:4-10,60` still has the five
  invented names and "10 people vouched"; `footer-hoopoe.tsx` still carries its own copy of the life
  cadence `use-hoopoe-life.ts` was lifted from, and a private guard query; `ambient-leaves.tsx:95`
  `SETTLE_PILE = true` is a hard-coded flag; `ambient-leaves.tsx:104` and `footer-hoopoe.tsx:170`
  still write a ref during render, the pattern `perching-birds.tsx:126-136` fixed on 2026-08-08. And
  the live landing still links no Privacy, Terms or Guidelines page (those links live in the dormant
  footer; security audit H12's point).
- **Audit 1 §4 #13 / audit 2 #16 & Q26 / bundle-build Q3, the bird sprite**: left as is by audit 2's
  close-out default; re-raised as Owner decision B with 02's facts.
- **Audit 2 -01 step 1 (the shell glyph edges, "free half")**: never made a row; OPEN; finding 02, with
  the module-graph correction.
- **Audit 2 -02 / B2 (rig deferral)**: DONE for the sidebar (`sidebar-hoopoe.tsx:55-58`); MOOT for the
  logo egg (since `eb55658c` it draws `LogoPeek`, no rig); the moments half is bundle-build-02 (with
  05's corrections); `/` is finding 01.
- **Audit 2 -04 (`point` label), -05 (`initialExpression`)**: OPEN; finding 07.
- **Audit 2 -06 / A17 (`BirdAvatar`'s `ring`)**: resolved by the owner (keep pixels, guard argued in
  source, `bird-avatar.tsx:66-81`); now no shipped caller passes `ring` (common-primitives' lane).
- **Audit 2 -07 / E8 (one-hoopoe waiters)**: OPEN in the report, closed by judgement here; finding 14
  keeps the one real line.
- **Audit 2 -08 / G9 (`hoopoe-geometry.ts` + `edge-light.ts` out of `src/lib/`)**: never executed
  (not on the board's G line). `hoopoe-geometry.ts` half MOOT (ships since `eb55658c`); `edge-light.ts`
  half still open (consumers: `/lab/glass-edges` and `scripts/dev/generate-icons.mjs` only; T09 owns the
  file).
- **Audit 2 -09 (`apple-edge` scripts hard-wired to `sanan's stuff/`)**: OPEN
  (`truth.mjs:3`, `truth-profile.mjs:6`, `compare.mjs:9`); the `look.mjs` half DONE (writes under
  `e2e/.shots/`). Scripts lens.
- **Audit 2 -10 (`mascot.md`)**: PARTIAL. The 09-17 "Where it lives" table and `MomentStage` paragraph
  landed; the `## Files` list, `point({ label })`, `idleBored` and the built "Sign-in fly-in" follow-up
  remain (13).
- **Audit 2 -11 (`/pick-bird` shimmer)**: DONE (`loading.tsx:3-12` records the fix).
- **Audit 2 -12 (stale comments)**: OPEN, all three still present, plus new ones (13).
- **Audit 2 -13 (six exports)**: PARTIAL. `useMomentAutoplay` is now rightly exported
  (`contributed-hoopoe.tsx:32` imports it); `BIRD_SPECIES_COUNT`, `BIRD_POSE_COUNT`, `PEEK_CREST`, the
  lab's `H, G` re-export and the stale `ARCHETYPES` label remain (07, 12).
- **Audit 2 -14 (`BIRD_GRID`)**: OPEN; the three copies are now identical (the shimmer drift was fixed
  by -11), so the constant would prevent a future drift and save 0 lines. Do it only with other edits
  to those files.
- **Audit 2 -15 (launch pose twice)**: OPEN; finding 08.
- **Audit 2 -16 (icon pipeline)**: PARTIAL. The Chrome-path half DONE (`shot-clip.mjs:11` and
  `shot-svg.mjs:15` use `chromePath()`); the single entry point (`"icons": "node
  scripts/dev/build-app-icon.mjs && node scripts/dev/generate-icons.mjs"`) is not in `package.json`.
  Scripts lens.
- **auth-edge-04 (`HoopoeWarmup` on auth pages)**: OPEN; finding 15. **auth-edge-05 (two handles to one
  bird in forgot/reset/verify)**: OPEN, T05's files, not re-argued.
- **Audit 2 Q11 (reduced motion)**: DONE. `grep -rn "prefers-reduced-motion\|useReducedMotion"` in
  territory returns only comments saying there is none.

## For other lenses

- **bug lens**: 05 (the empty-state moments never autoplay; high confidence, verify live first);
  06 / Owner decision D (the profile-complete moment reads the retired `bio`); 14 (the celebration's
  missing Strict-Mode deferral, dev-only); `profile/letterhead-profile.tsx:1640` re-derives `isMirrored`
  by hand (`birdFor(seed).pose >= 2`), a second definition of a member's facing; `/lab/feed-canvas`
  (`:92,228,242`) and six `/lab/profiles` variants pass `avatarSpecies`, which `BirdAvatar` ignores
  (`bird-avatar.tsx:30-31`), so those rooms draw the hashed bird, not the one they ask for.
- **bundle-build / runtime-perf**: 01 (`/`: rig string-confirmed; the two auth-form chunks by route set,
  please string-test `01ya05e0tpt0o.js` and `2fo0ol_tfefr0.js`, and check whether `0et6nzrgew7fc.js`
  leaves `/` with the rig); 02 (the glyph chunk's real edges, and the module-graph correction to audit
  2's plan); 03 (the floor's mascot share, and the unverified chain layout → flight layer → kit →
  `common/motion` → `m`); bundle-build-02 corrections in 05's notes; a Slow-4G trace of a cold `/` to see
  whether the hero's reveal waits on the async `domMax` chunk (`motion-features.tsx:29-32`); the hero's
  `sizes` under `object-cover` (Not-findings).
- **auth-onboarding-settings (T05)**: 01 step 1 (`AuthHeading` into its own module; `auth-panel.tsx` is
  yours); 15 (your deferred auth-edge-04); auth-edge-05 is still yours.
- **shell-ui-guide (T09)**: 02 step 3 (`sidebar.tsx:32,530-555` and `identity-row.tsx`), 02 step 2
  (`konami-eggs.tsx:16,121`); `not-found.tsx:17-18` (13); `edge-light.ts` (G9's open half).
- **directory-profile**: 04 (`get-in-touch.tsx:158-175, 267-279, 350`); 02 step 1 repoints
  `letterhead-profile.tsx`'s name imports.
- **data-layer**: 06 is the source line for statements #42 and #44.
- **common-primitives / duplication**: of the six shipped `clamp` copies, two (`hoopoe-playground.tsx:90`,
  `mascot-flight-layer.tsx:70`) are free to import from `hoopoe-kit` because both files already import
  it, so audit 2's "it pulls in `common/motion`" trap does not apply to them; after 03 step 1 the kit
  imports nothing and is safe to import from anywhere in the mascot.
- **docs**: `mascot.md:13-20, 51, 106, 280-283`; `DESIGN-SYSTEM.md:482-483`; `avatars.md:23-27` if 04 lands.
- **scripts-e2e-ci**: audit 2 -16's `icons` entry point; -09's hard-wired path; 04 retires
  `generate-bird-photos.mjs` (README row with it); `scripts/qa/hoopoe-landing-check.mjs` follows the
  `data-mascot-flyer` hook if 03 lands.
- **lab-rest**: 07 changes `/lab/hoopoe/page.lab.tsx:80` (drop `{ label: "this" }`); Owner decision A is
  lab-rest's decision 4 (one question); `/lab/mascot-moments`'s `useAutoplay` is the working copy of 05.
- **tracked-weight**: 04 removes `public/images/birds/` (698 KB) if it lands.

## Metrics

- **Territory**: 52 source files, 11,515 lines (wc -l): landing 13 files / 2,956; mascot 27 / 5,775;
  `bird-avatar-v2.tsx` 1,846; routes 5 / 230; `src/lib` 4 / 708 (`avatar.ts` 166, `avatar-swap.ts` 39,
  `hoopoe-geometry.ts` 375, `app-icon-safe-zone.test.mjs` 128). Scripts read: 371 lines (77 + 70 +
  224). Also read: `bird-avatar.tsx` 155, `avatar.test.mjs` ~180, specs 775, audit 2's report 1,048.
  Lines read in total: ~16,500.
- **Biggest files**: `bird-avatar-v2.tsx` 1,846 (1,621 code, 51 drawings of 19-53 lines each);
  `hoopoe.tsx` 1,700 (1,253 code); `ambient-leaves.tsx` 676 and `perching-birds.tsx` 664 (both dormant);
  `mascot-flight-layer.tsx` 596; `landing-hero.tsx` 469; `hoopoe-playground.tsx` 411;
  `not-found-stage.tsx` 377; `hoopoe-geometry.ts` 375; `use-flight-arrival.ts` 350.
- **Comment-heaviest** (cloc comment/code): `hero-photo.ts` 3.60, `avatar.ts` 1.73, `one-hoopoe-guard.ts`
  1.54, `generate-icons.mjs` 1.54, `rare-idle-behaviors.ts` 1.24, `use-flight-arrival.ts` 1.22,
  `page.tsx` 1.18, `mascot-flight-layer.tsx` 1.10; all reason-carrying (13's notes).
- **Bundle facts** (`raw/route-bundle-stats.json`): `/` 780,963 raw / 247,736 gz (145,378 / 51,081 above
  the floor, six chunks); the rig `1gnprwog56le7.js` 31,884 / 8,633 on 17 shipped routes (+3 lab);
  the glyph set `01c64ezhe149a.js` 47,902 / 16,027 on the 39 member routes only; `/hoopoe` 749,501 /
  235,473; `/birds` +0 private above floor+shell; `/pick-bird` +6,633 private (`bird-picker`).
- **Tracked images in territory**: `birds/` 102 files / 698,398 B; `icons/` 4 / 162,525 B; `brand/` 6 /
  15,349 B; `landing.jpeg` 498,076 B (1680x1260); `apple-icon.png` 8,657 B; `icon.svg` 1,771 B.
  Untracked master `landing-original.jpeg` 6.2 MB (4032x3024, gitignored).
- **Clones (jscpd) in territory**: 4 intra-`hoopoe.tsx` (2 are 08's launch pose, 2 the argued landing
  pair); 1 `ambient-leaves`/`perching-birds` (common-primitives-01's media query); 2 inside the dormant
  `perching-birds.tsx`; 4 lab-copies-shipped (`/lab/birds-bg` ≈ the outline filter, `/lab/landings` ≈
  `trust-section`, `/lab/mascot-moments` ≈ `useMomentAutoplay` and ≈ `no-results-hoopoe`).
- **Local re-declarations**: `smoother` x3, `clamp` x3 (+3 outside territory), `sleep` x4, launch crouch x2.
- **Six-signature scan (charter question 3)**, per file; "-" means none found:
  | File | 1 single-use helper | 2 once-used type | 3 defensive try/catch | 4 needless intermediate | 5 over-abstraction / dead option | 6 narrating comment |
  |---|---|---|---|---|---|---|
  | `hoopoe.tsx` | - | `Ctx` (one use, harmless) | `safeNow` (07) | `W`/`H` at `:1518-1519` | `initialExpression`, `label`, `idleBored` (07); lab-only knobs (Owner C) | `:1415` |
  | `hoopoe-kit.ts` | `useValleyMotion` alias (03) | - | - | - | - | - |
  | `mascot-flight-layer.tsx` | `queueFlight` (argued) | `Active` | - | - | - | - |
  | `use-flight-arrival.ts` | - | - | storage try/catch (needed: storage can throw) | - | - | - |
  | `hoopoe-warmup.tsx` | - | `IdleWindow` (Safari lacks rIC) | - | - | `void import` no-op today | - |
  | `moment-hoopoe.tsx` | - | - | - | - | - | docblock on the wrong function (05) |
  | `celebration-signals.tsx` | - | - | - | - | `bio` condition (06) | - |
  | `rare-idle-behaviors.ts` | - | - | - | - | unused `now` param (07) | - |
  | `hoopoe-playground.tsx` | `Chip` (earns its keep, 30 uses) | - | - | - | inert transition (07) | - |
  | `landing-hero.tsx` | - | - | storage try/catch (needed) | - | - | - |
  | `ambient-leaves.tsx` (dormant) | - | - | - | - | `SETTLE_PILE = true` | - |
  | `bird-avatar-v2.tsx` | `slugifySpecies` (named, fine) | `Arche` | - | `bird` used by a dormant branch (12) | `BG_MODE` (defended) | - |
  | `avatar.ts` | - | - | - | - | `BirdChoice.color` (12) | - |
  | every other file in territory | - | - | - | - | - | - |
- **Structural vs cheap**: 10 structural (01, 02, 03, 04, 05, 06, 08, 09, 11, 15), 5 cheap (07, 10, 12,
  13, 14). 4 owner decisions. 17 not-findings.
