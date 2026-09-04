# landing-mascot-avatars - refactor audit 2 report

Territory reader for the public landing page, the hoopoe mascot system, the 51-bird avatar set,
the `/birds` and `/pick-bird` pages, the public `/hoopoe` playground, the support page's bird
surfaces, and the icon / edge-light tooling behind the app mark. Date: 2026-09-04 (work started
2026-09-03). Files in territory: 63 source files (~11,700 lines) plus 19 tracked image assets;
read fully: 52; read partially with purpose: 11 (listed below).

---

## Coverage

**Read fully** (every line):

- Routes: `src/app/page.tsx`, `src/app/hoopoe/page.tsx`, `src/app/(main)/birds/page.tsx`,
  `src/app/(main)/pick-bird/page.tsx`, `src/app/(main)/pick-bird/loading.tsx`.
- Landing (7 of 13): `landing-hero.tsx`, `showcase.tsx`, `hero-photo.ts`, `shots.ts`,
  `section-reveal.tsx`, `trust-section.tsx`, `landing-footer.tsx`, `landing-nav.tsx`,
  `feature-section.tsx`.
- Mascot (18 of 22): `hoopoe.tsx` (all 1,512 lines, both halves), `hoopoe-kit.ts`,
  `use-hoopoe.ts`, `hoopoe-warmup.tsx`, `mascot-flight.ts`, `mascot-flight-layer.tsx` (all 595),
  `use-flight-arrival.ts` (all 350), `perch-report.test.mjs`, and every file in `moments/`
  (`moment-hoopoe.tsx`, `one-hoopoe-guard.ts`, `one-shot.ts`, `rare-idle-behaviors.ts`,
  `celebration-detector.tsx`, `celebration-hoopoe.tsx`, `celebration-signals.tsx`,
  `contributed-hoopoe.tsx`, `logo-easter-egg-hoopoe.tsx`, `messages-empty-hoopoe.tsx`,
  `no-results-hoopoe.tsx`, `no-saved-hoopoe.tsx`).
- Avatars: `bird-avatar.tsx`, `bird-avatar-v2.tsx` head (1-200) and tail (1,555-1,839) in full plus
  a structural pass over the middle via a `mix(` / `beak(` / `Eye ` / `name:` census (the middle is
  the remaining 45 bird drawings, all the same three-part shape as the six read in full);
  `bird-adjust.json`; `src/lib/avatar.ts`; `src/lib/avatar-swap.ts`; `src/lib/avatar.test.mjs`.
- Support bird surfaces: `plate-data.ts`, `bird-plate.tsx`, `bird-picker.tsx`.
- Icon/mark: `src/lib/edge-light.ts`, `src/lib/mark-centring.test.mjs`,
  `src/lib/app-icon-safe-zone.test.mjs`, `scripts/dev/build-app-icon.mjs`,
  `scripts/dev/generate-icons.mjs`, all five `scripts/dev/apple-edge/*.mjs`,
  `scripts/dev/centroid.mjs`, `scripts/dev/shot-clip.mjs`, `scripts/dev/shot-svg.mjs`.
- Specs: `docs/spec/mascot.md` (all 209), `docs/spec/avatars.md` (banner + the shipped-system
  section in full, the superseded 2026-06 proposal below the line skimmed for claims that are still
  quoted at people — findings 03 and 15 both quote from it).
- Audit-1's own `landing-mascot-avatars.md` report, in full, before opening a source file.

**Read partially, with the reason:**

- `ambient-leaves.tsx` (676) and `perching-birds.tsx` (664): banner comments, imports, all constant
  tables, the glyph components and the rAF driver's tail read; the middle of each physics loop
  skimmed. Both are only reachable through the switched-off showcase (finding 03) and through one
  lab room, so their reachability is the finding, not their internals.
- `footer-hoopoe.tsx` (317): banner in full (it is the file that explains why the flight bus must
  not gain a second subscriber), constants, the guard, the `GroundAccent` component. Same reason.
- `hoopoe-playground.tsx` (411): banner, all imports, `MOODS`, `ROUTINES`, the rail. The remaining
  ~200 lines are button markup for verbs already traced elsewhere.
- `showcase-shot.tsx` (119): first 60 lines; the rest is the parallax markup.
- `src/lib/hoopoe-geometry.ts` (361): banner, `H`, `G`, `Prim`, `FeatherOptions`, and the whole
  "shipped mark" + rendering tail. The middle is the four `*Prims()` builders, pinned by
  `mark-centring.test.mjs`.
- `src/components/layout/sidebar.tsx`, `app-shell.tsx`, `konami-eggs.tsx`,
  `identity-row.tsx`: read only far enough to establish the mascot/avatar mount chain. These are
  **shell-primitives territory**; findings 01 and 02 name the exact lines and are flagged for that
  agent too.

**Not read:** nothing in territory.

**Uncommitted edits seen (someone else's WIP):** none. The session opened with
`M src/components/common/image-viewer.tsx` in `git status`; by the time I checked (`git status
--short`) the tree was clean apart from this audit's own untracked
`docs/audit-fix/2026-09-03-refactor-audit-2/`, so a peer committed it mid-session. Nothing I read
carries uncommitted changes.

---

## Summary

This territory is in much better shape than audit 1 found it: the 595-line dead mono-avatar path is
gone, the showcase is decoupled from `/`, the `speed` plumbing and `bindPassword` are gone, and
`use-flight-arrival.ts` (new since audit 1, 151 code / 184 comment) is the single best-argued file
in the repo. **The structural well is not dry, but it has moved: almost all of the remaining weight
is bundle weight, not line weight.** Two measurements carry this report.

**First**, the 51 bird glyphs are one `ARCHES` array literal, which no bundler can tree-shake, and
they cost **44,428 bytes raw / 12,182 gzip** in chunk `42nji2hh4aeuo.js` on **39 of 52 non-lab
routes**. The reason they are in the *client* bundle at all is two always-mounted client components
in the app shell (`sidebar.tsx` → `IdentityRow` → `BirdAvatar`, and `konami-eggs.tsx`), each of
which needs exactly **one** bird. Audit-1 owner decision 13 ("a birds sprite") is still open and now
has its number.

**Second**, the hoopoe rig is **28,691 bytes raw / 7,874 gzip** in chunk `0qa8au6zlhx7_.js` and sits
in the first load of **46 of 52 non-lab routes**. On roughly 32 of those it exists only so the
sidebar can glide a bird in after 90-120 s of idle and so a triple-click on the logo can pop one.
Audit-1's finding 08 was executed for the 404 boundary but **not** for `sidebar-hoopoe.tsx:37` or
`logo-easter-egg-hoopoe.tsx:36`, which are still static imports — and one static importer is enough
to defeat the flight layer's lone `next/dynamic`.

The line-shaped wins are small and honest: a dead `initialExpression` prop, a `label` option on
`point()` that four places document and two callers pass and nothing reads, a `ring` prop that
silently does nothing for the bird avatars two shipped call sites pass it for, six `export`
keywords, ~9 lines of a duplicated take-off pose inside `hoopoe.tsx`, and a `loading.tsx` that
promises a subtitle the page never renders. Against that: 506 lines of build-and-lab-only tooling
(`hoopoe-geometry.ts` + `edge-light.ts`) living in `src/lib/`, `docs/spec/mascot.md` listing a
shipped feature as an open follow-up and omitting four of the eight moments, and three
`apple-edge` scripts hard-wired to a file inside `sanan's stuff/` — the folder the owner has an open
decision to move out of the repo.

Structural vs cheap: **9 structural, 7 cheap**, plus 3 owner decisions. The surprise was how much of
the mascot's cost is *architectural placement* rather than code — at rest the rig genuinely costs one
idle timer and one bus callback, exactly as its comments claim, but it is downloaded and parsed by
every member on every page to deliver that. What audit 1 left that is now moot: findings 01, 02, 05,
06, 07, 09, 10 and 11 of its report all landed; only its finding 08 is half-done, and it is my
finding 02.

---

## Findings

### landing-mascot-avatars-01 - The 51 bird drawings (44 KB raw / 12 KB gzip) ride 39 non-lab routes' client bundles so the sidebar can draw one bird

- **Where**: `src/components/common/bird-avatar-v2.tsx:102-1,609` (the `ARCHES: Arche[]` array
  literal, 51 entries), `:1,613` (`export const ARCHETYPES = ARCHES`), `:1,779-1,839`
  (`BirdGlyphV2`); the two shell entry points that put it in the client graph are
  `src/components/layout/sidebar.tsx:1` (`"use client"`) `:32`
  (`import { IdentityRow } from "@/components/common/identity-row"`) `:536` (`<IdentityRow …>`)
  → `src/components/common/identity-row.tsx` → `src/components/common/bird-avatar.tsx:4`, and
  `src/components/layout/konami-eggs.tsx:16` + `:121` (`<BirdAvatar user={{ id, name: "Flush" }}
  size={30} />`), both mounted unconditionally by `src/components/layout/app-shell.tsx:2,64` and
  `:1`(`Sidebar`). The other twelve client importers, for the fixer's map:
  `admin/people/person-detail.tsx`, `catchups/answer/answer-card.tsx`,
  `catchups/answer/answer-experience.tsx`, `catchups/create/people-picker.tsx`,
  `catchups/home/people-panel.tsx`, `common/image-viewer.tsx`, `letters/letter-images.tsx`,
  `messages/message-composer.tsx`, `onboarding/steps/photo-step.tsx`,
  `posts/comments-section.tsx`, `posts/create-post-form.tsx`, `posts/feed-column.tsx`,
  `profile/letterhead-profile.tsx`.
- **Phase**: architecture (with a `library`/asset alternative — the sprite)
- **Tier**: T3 for the RSC-prop fix, T4 for the sprite     **Class**: structural     **Decides**: autonomous for the prop fix / **owner** for the sprite (this is audit-1 §4 #13)
- **Evidence**: Measured off the audit's own production build, not estimated.
  - `grep -l "Q46.4 26 48.6 18" .scratch/audit2-build/.next/static/chunks/*.js` →
    `42nji2hh4aeuo.js`, **47,415 bytes raw / 13,610 gzip / 11,174 brotli**. Of that, the first
    2,987 bytes are `bird-adjust.json` (1,936 B) plus `src/lib/avatar.ts`; the glyph code proper
    begins at byte 2,987 and is **44,428 raw / 12,182 gzip / 10,128 brotli**.
  - `route-bundle-stats.json`: that chunk is in `firstLoadChunkPaths` for **66 of 100 routes, 39 of
    52 non-lab**. Per glyph that is ~871 bytes; a page showing one avatar pays for all 51.
  - **It cannot tree-shake.** The spec's own claim is out of date: `docs/spec/avatars.md:350` says
    "No external SVG assets … Everything is inline JSX, so it tree-shakes and ships in the JS/HTML,
    with zero extra network requests," and `:356` estimates "~8-9 KB source". That was written for a
    12-species design. Today all 51 `draw: () => …` closures are elements of one array literal, so
    every reference to `ARCHES` retains every one of them. (Those two lines are in the file's
    explicitly-superseded lower half, but they are the only written argument against a sprite and a
    fix session will find them.)
  - `BirdAvatar` has **no `"use client"`**: on a server-rendered page the SVG is inlined into the
    HTML at zero client cost. The chunk is in the client graph purely because client components
    import it — and the two that do so on *every* `(main)` route each need exactly one bird
    (`sidebar.tsx`: the signed-in member's own; `konami-eggs.tsx`: one decorative "Flush" bird that
    appears only after the konami code is typed).
  - Verified quiet routes whose only client-side bird is the shell's: `/about`, `/guide`,
    `/guide/[area]`, `/dark-mode`, `/admin/audit`, `/admin/mail`, `/letters` (its `IdentityRow` use
    is server-side). `/support` and `/pick-bird` legitimately need the set (`bird-plate.tsx` and
    `bird-picker.tsx` are client and render 12 and 49 glyphs); `/birds` is a server component and
    needs none of it client-side.
- **What to do**: two independent moves, in this order, measuring after each.
  1. **Get the glyphs out of the shell's client graph (autonomous, no new assets).**
     `app-shell.tsx` is a server component; `Sidebar` is a client component receiving a serialized
     `SidebarUser`. Add an `avatar?: React.ReactNode` prop to `IdentityRow` (defaulting to today's
     `<BirdAvatar>` so no other caller changes) and have `app-shell.tsx` pass
     `<BirdAvatar user={…} size="sm" />` down as an element. RSC serializes a rendered element
     across the boundary, so the glyph module stays server-only for that path. Do the same for
     `konami-eggs.tsx`: it renders `null` until a keystroke sequence lands, so
     `dynamic(() => import("@/components/common/bird-avatar").then(m => m.BirdAvatar),
     { ssr: false })` is enough and needs no prop plumbing. Then re-run the build and diff
     `route-bundle-stats.json`: the seven routes named above should each drop ~44 KB raw / 12 KB
     gzip from first load.
  2. **The sprite (owner's call, audit-1 §4 #13).** For the routes that genuinely draw many
     different birds client-side (feed, directory, messages, catchups, `/pick-bird`), the remaining
     option is to emit the 51 glyphs once into `public/images/birds.svg` at build time (a sibling of
     `scripts/dev/build-app-icon.mjs`, reusing `ARCHES` the same way `centroid.mjs` already does)
     and have `BirdGlyphV2` render `<svg><use href="/images/birds.svg#bird-19"/></svg>`. That trades
     44 KB of parsed JS on every one of those routes for one cacheable 40-50 KB asset fetched once.
     **Verify first**: external `<use href="file.svg#id">` has a history of partial support, and the
     per-bird `archeTransform` (scale-about-centre + nudge from `bird-adjust.json`) and the
     `pose >= 2` mirror must survive the `<use>` wrapper. Prototype in a lab room before touching
     the shipped component.
- **Saving**: step 1: **44 KB raw / 12 KB gzip off at least 7 non-lab routes' first load**, 0 source
  lines, measured. Step 2: the same 44 KB off up to 32 more, at the cost of one static request and
  perhaps 30 new lines of sprite plumbing. Neither changes a pixel.
- **Risk & gate**: step 1 low-medium (the RSC element-as-prop boundary; the mobile drawer renders
  the same `IdentityRow` through a Radix portal, so the element must be passed once and used twice,
  which is fine). Step 2 medium-high (a rendering change to the app's most-repeated visual).
  Gate for both: `npm run check`; `npm run visual` (11 routes × 2 viewports — avatars are on nearly
  every baseline, so a zero-diff run is the proof); open `/feed`, `/directory`, `/birds`,
  `/pick-bird` and the sidebar signed in as Jerry; **re-run the production build and diff
  `route-bundle-stats.json` before and after**, because "it should be smaller" is not a measurement.
- **Confidence**: high on the numbers (all read off the build on disk) and on the two shell
  importers. Medium on how many routes step 1 alone frees — that depends on each route's other
  client components and must be measured, not predicted. What would change my mind: if Next's
  client-reference manifest keeps the module on a route for a reason I have not modelled, step 1
  produces no byte change and the sprite becomes the only lever.
- **Notes**: This is the single largest lever in my territory and it costs zero features. Related:
  finding 02 (the rig, same shape of problem, same two shell files). For the **bundle lens**: the
  chunk id is `42nji2hh4aeuo.js` and the sprite's before/after is a whole-build diff, not a
  per-route guess. For **shell-primitives**: `sidebar.tsx:32,536`, `konami-eggs.tsx:16,121` and
  `app-shell.tsx:2,64` are the three lines that decide this.

### landing-mascot-avatars-02 - The 28 KB hoopoe rig is in 46 of 52 non-lab routes' first load; audit-1's finding 08 was only half executed

- **Where**: `src/components/mascot/sidebar-hoopoe.tsx:37` (`import { Hoopoe } from "./hoopoe";`)
  and `src/components/mascot/moments/logo-easter-egg-hoopoe.tsx:36`
  (`import { Hoopoe } from "@/components/mascot/hoopoe";`), both mounted on every `(main)` route by
  `src/components/layout/sidebar.tsx:43,44` (`:627-629` the `<LogoEasterEgg>` wrapper, `:652`
  `<SidebarHoopoe />`). Secondary static importers, each mounted per-page:
  `moments/moment-hoopoe.tsx:18` (serves the four ambient moments),
  `moments/celebration-hoopoe.tsx:22`, `settings/dark-gauntlet.tsx:26`,
  `catchups/almost-ready.tsx:26`, `catchups/answer/completion-card.tsx:13`,
  `catchups/index/group-first-guidance.tsx:20`. The one file that already does it right:
  `mascot-flight-layer.tsx:48`.
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - `grep -l "M42 84 Q30 88 31 106" .scratch/audit2-build/.next/static/chunks/*.js` →
    `0qa8au6zlhx7_.js`, **28,691 bytes raw / 7,874 gzip / 7,064 brotli** (contains `RIG_CSS` and the
    `hoopoe-kit` chord table, so it is the rig plus its foundation).
  - `route-bundle-stats.json`: present on **46 of 52 non-lab routes**. The six without it are
    `/privacy`, `/terms`, `/guidelines`, `/catchups/join`, `/catchups/join/[token]`, `/_not-found` —
    i.e. exactly the routes audit-1's fix session freed by moving `useSoloHoopoe` out of
    `moment-hoopoe.tsx` into `one-hoopoe-guard.ts`.
  - Of the 46, seven need the rig above the fold and legitimately: `/login`, `/signup`,
    `/reset-password`, `/forgot-password`, `/verify-email` (the peek-a-boo), `/` (the hero loader
    and `HoopoeWarmup`), `/hoopoe` (the playground). Roughly **32** of the rest are `(main)` routes
    where the only reason is the sidebar's 90-120 s idle bird and the logo triple-click:
    `/admin/*` (13), `/letters*` (4), `/catchups*` (6), `/about`, `/guide`, `/guide/[area]`,
    `/notice/[id]`, `/support`, `/pick-bird`, `/birds`, `/welcome`, `/collection`,
    `/collection/[id]`.
  - `mascot-flight-layer.tsx:44-48` states the intent in writing — "Lazy-load the rig so it is NOT
    bundled into the root layout's shared chunk (which loads on every route, most of which never fly
    a hoopoe)" — and one static importer in the shell defeats it for every authed page. Audit-1's
    finding 08 asked for exactly this conversion; the fix log records only the 404 half.
- **What to do**: convert both shell files to the flight layer's own pattern,
  `const Hoopoe = dynamic<HoopoeProps>(() => import("./hoopoe").then(m => m.Hoopoe), { ssr: false })`.
  Both already render `null` until a timer or a click, so `ssr: false` costs nothing and no markup
  moves. Two things the fixer must carry over from audit-1's fix log: **use `onReady`, not `ref`** —
  `next/dynamic` does not forward a ref, and `useHoopoe` swallows verbs on a null ref — and keep the
  deferred `setTimeout(fn, 0)` inside `onReady` that both files already have (`sidebar-hoopoe.tsx`
  `readyTimerRef`, `logo-easter-egg-hoopoe.tsx:125`). Optionally add a `HoopoeWarmup`-style idle
  prefetch in the sidebar so the first glide never pays a fetch — the file exists and documents the
  pattern. Do **not** touch the auth pages, `/hoopoe`, or `landing-hero.tsx`: there the bird is
  above the fold. `moment-hoopoe.tsx` and `celebration-hoopoe.tsx` are the natural second pass (both
  render only after an `IntersectionObserver` or a queue decision) but they are per-page, so the win
  is smaller and route-specific.
- **Saving**: 0 source lines; **28.7 KB raw / 7.9 KB gzip off the first load of ~32 non-lab
  routes**, measured before/after in `route-bundle-stats.json`. The win only lands if *both* shell
  importers are converted in the same pass — one survivor keeps the chunk.
- **Risk & gate**: medium. The Strict-Mode double-mount dance is the known hazard and both files
  already carry the fix; `mascot-flight-layer.tsx` proves `dynamic` + deferred `onReady` works
  together in this rig. Gate: `npm run check`; `npm run visual`; then, signed in as Jerry, summon
  the sidebar bird with **Ctrl+Shift+H** and triple-click the sidebar logo, watching for a
  first-time fetch stutter (the warmup pattern is the cure if one appears); leave a page idle past
  90 s once to see the natural entrance. `scripts/qa/hoopoe-idle-check.mjs` exists for the idle path
  if a recorded proof is wanted.
- **Confidence**: high that the imports are as mapped (grep is unambiguous) and on the chunk size.
  Medium on net KB until measured. What would change my mind: if the rig chunk is co-located with
  something else those routes need, the diff will show a smaller number — read it, don't assume.
- **Notes**: This answers the charter's "what does the mascot cost on every page". At rest it costs
  one `setTimeout` and one module-bus callback, exactly as `mascot-flight-layer.tsx:14-16` claims —
  but it costs every authed visitor a 28.7 KB download and parse up front for a bird that may never
  appear. Related: finding 01 (same two shell files). For **shell-primitives**: `sidebar.tsx:43-44`
  is the coupling; nothing about the rail's own behaviour changes.

### landing-mascot-avatars-03 - The switched-off landing showcase: 11 files, 2,477 lines, of which 828 are referenced by nothing at all

- **Where**: the five knip-unused files — `src/components/landing/showcase.tsx` (255),
  `feature-section.tsx` (104), `trust-section.tsx` (71), `landing-footer.tsx` (81),
  `footer-hoopoe.tsx` (317) = **828 lines, imported by nothing**; plus six reachable only from
  `showcase.tsx` and from `src/app/lab/landings/_variant-*.tsx` — `ambient-leaves.tsx` (676),
  `perching-birds.tsx` (664), `showcase-shot.tsx` (119), `landing-nav.tsx` (74),
  `section-reveal.tsx` (60), `shots.ts` (56) = **1,649 lines**. Assets: `public/images/landing/`
  (5 webp, **283 KB tracked**). The entry point that no longer imports any of it:
  `src/app/page.tsx:31-38` (39 lines total).
- **Phase**: placeholder
- **Tier**: T4     **Class**: structural     **Decides**: **owner** (this is audit-1 §4 #1, still open — state, do not re-argue)
- **Evidence**: `raw/knip-repo-config.txt` lists exactly those five under "Unused files (7)"; the
  other two are unrelated (`common/filters/*`). Audit-1's decoupling landed: `src/app/page.tsx` is
  now 39 lines and imports only `LandingHero`, and the `SHOW_SHOWCASE` flag is gone. The landing's
  first-load is **899 KB raw across 24 chunks**, of which **621 KB is the app-wide floor** (12
  chunks present on all 52 non-lab routes), **245 KB is partly shared** (base-ui 106 KB in three
  chunks, motion 34 KB, the hoopoe rig 28 KB, sonner+lucide 36 KB), and only **33.4 KB is
  exclusive to `/`** (`3n7am_4y6ghac.js` 18.2 KB + `30zzb45zpll8d.js` 15.3 KB, the latter holding
  the hero's own strings and exactly two lucide icons, `arrow-left` and `chevron-down`). **None of
  the showcase is in any of those chunks.** Its only residual cost in production today is CSS: I
  attributed every class rule in the 232.8 KB stylesheet to its source and found **28 rules /
  1.6 KB whose only shipped source is a showcase file and which no lab room also uses**
  (`-mx-[50vw]`, `text-[6.5rem]`, `text-leaf/[0.09]`, `lg:grid-cols-[1.4fr_1fr]`, `bg-cinnamon/45`
  …), plus 39 rules / 1.7 KB it shares with the lab rooms and which would survive its deletion.
- **What to do**: nothing until the owner decides. If he ships it: two things must be settled first,
  and `showcase.tsx:16-21` already records both — `TrustSection:4-10` renders five invented alumni
  names ("Ananya Krishnan", "Rohan Mehta", "Meera Iyer", "Arjun Reddy", "Fatima Sheikh") and a
  hard-coded "10 people vouched" pill (`:60`), and `showcase-shot.tsx:5,55` calls
  `useReducedMotion()`, which contradicts the house rule that motion always plays (`section-reveal.tsx:11-12`
  spells the rule out; `footer-hoopoe.tsx:60-67` argues its own scoped exception, this one does
  not). If he retires it: delete the 11 files, the 5 webp (283 KB tracked), the `SHOTS` re-export
  at `src/app/lab/landings/_shared.ts:20`, and copy whatever the six lab-shared files still owe
  `lab/landings/` into that folder — but note `section-reveal.tsx` is imported by **five** lab
  variants and would have to move rather than die.
- **Saving**: if retired, **11 files / 2,477 lines / 283 KB tracked assets / 1.6 KB CSS**. If
  shipped, 0 — plus whatever the five webp and the leaf/bird rAF loops cost the landing's LCP,
  which nobody has measured because it has never been on.
- **Risk & gate**: n/a until decided. Whichever way: `npm run check` (`raw/knip-repo-config.txt`'s
  unused-file count is not gated, but the lab registry is), `npm run visual` (the `/` baseline shows
  only the hero, so shipping the showcase is a deliberate rebaseline), and
  `npm run screenshot http://localhost:3000 landing` signed out.
- **Confidence**: high on every number.
- **Notes**: Three side effects the owner should hear again because they have not changed since
  audit 1. (a) **The public landing still links to no Privacy, Terms or Guidelines** — those three
  links live in `landing-footer.tsx:66-76`, inside the showcase, and security audit H12 calls them
  "the documents a stranger should be able to find before an account exists". This has been carried
  in every fix-session handover since 2026-08-26 and is the one item here that is not merely
  cosmetic. (b) `mascot-flight-layer.tsx:46-47` still says "on the landing — the only place flights
  launch — the scroll companion has already loaded it": the scroll companion is `footer-hoopoe.tsx`,
  which is inside the showcase and has not mounted since 2026-08-04. The statement is accidentally
  still true (`landing-hero.tsx:10` statically imports the rig for `HeroLoader`) but for a different
  reason, and a future session trusting that sentence would reason wrongly. (c)
  `landing-hero.tsx:412-413` points at "`SHOW_SHOWCASE` in `src/app/page.tsx`", a constant that no
  longer exists. Both comments are one-line fixes and belong with finding 12.

### landing-mascot-avatars-04 - `point()`'s `label` option is declared, documented and passed, and never read

- **Where**: `src/components/mascot/hoopoe-kit.ts:149`
  (`point(target: Target | Dir, opts?: { label?: string; hold?: number }): Promise<void>;`),
  `src/components/mascot/hoopoe.tsx:507` (the same signature) — and nowhere else in that file;
  `docs/spec/mascot.md:51` documents it (`point(target | "left" | "right", { label, hold })`);
  callers that pass it: `src/components/mascot/hoopoe-playground.tsx:59` (the public "tour guide"
  routine, `{ label: "over here" }`) and `src/app/lab/hoopoe/page.tsx:80` (`{ label: "this" }`).
- **Phase**: placeholder (LLM-bloat signature 5: an options field no implementation reads)
- **Tier**: T1     **Class**: structural (small)     **Decides**: autonomous
- **Evidence**: `grep -n "label" src/components/mascot/hoopoe.tsx` returns **exactly one line**,
  507, the parameter declaration. The verb's body reads `opts?.hold` and nothing else off `opts`. So a caller who supplies a label — as the public `/hoopoe` playground does, on a routine
  called "the tour guide" — gets silence, and a future session reading the spec would reasonably
  believe the rig can caption a point.
- **What to do**: delete `label?: string` from both signatures, drop `{ label: "over here" }` at
  `hoopoe-playground.tsx:59` and `{ label: "this" }` at `lab/hoopoe/page.tsx:80` (both become
  `["point", "right"]` / `h.point(targetRef.current)`), and change `docs/spec/mascot.md:51` to
  `point(target | "left" | "right", { hold })`. If instead the owner wants a speech bubble, that is
  a feature and belongs in Owner decisions, not in a signature nobody implemented.
- **Saving**: ~6 lines, and one lying option removed from a 33-verb public API that the `/hoopoe`
  page invites strangers to play with.
- **Risk & gate**: low. `npm run check`; open `/hoopoe` and press "Surprise me" until "the tour
  guide" plays (behaviour is byte-identical today).
- **Confidence**: high. What would change my mind: nothing short of finding an implementation, and
  the grep is exhaustive for that file.
- **Notes**: I checked the rest of the controller for the same shape. `initialExpression` is finding
  05. Every other verb option (`hold`, `double`, `dir`, `edge`, `target`, `level`, `times`,
  `steps`) is read. `rest()` and `land()` are reachable-but-barely — see Not-findings.

### landing-mascot-avatars-05 - `initialExpression` is a dead prop on `HoopoeProps`

- **Where**: `src/components/mascot/hoopoe.tsx:1,182` (`initialExpression?: Expression;` in the
  exported `HoopoeProps` interface). It is **not** in the component's destructured parameter list
  (`:1,187-1,190`) and not referenced anywhere in the file, the repo, the specs, the scripts or
  `e2e/`.
- **Phase**: dead
- **Tier**: T1     **Class**: structural (small)     **Decides**: autonomous
- **Evidence**: `grep -rn "initialExpression" src/ scripts/ e2e/ docs/` returns exactly one hit:
  the declaration. `HoopoeProps` is exported and used as the type argument of the flight layer's
  `dynamic<HoopoeProps>(…)` (`mascot-flight-layer.tsx:32,48`), so the field is in the public prop
  surface of a component 23 files mount — a caller could pass it today, get no error, and get no
  effect. `docs/spec/mascot.md`'s props paragraph does not mention it, so the delete is clean.
- **What to do**: delete line 1,182 and the now-unused nothing else. (`Expression` stays imported —
  `EXPRESSIONS` and `express()` both use it.)
- **Saving**: 1 line, and one prop off the rig's public surface.
- **Risk & gate**: low. `npm run check` (TypeScript will name any caller instantly; there are none).
- **Confidence**: high.

### landing-mascot-avatars-06 - `BirdAvatar`'s `ring` prop silently does nothing for bird avatars, and two shipped call sites pass it for exactly that

- **Where**: `src/components/common/bird-avatar.tsx:41` (the `ring` prop), `:50`
  (`const ringStyle = ring ? { boxShadow: "0 0 0 4px var(--card)" } : undefined;`), `:58` (applied
  on the **photo** branch), `:97` (`const clipped = BG_MODE === "inset";` — always false), `:104`
  (`...(clipped ? ringStyle : undefined)` — so the bird branch never applies it). Shipped callers:
  `src/components/catchups/index/your-catchups-card.tsx:76` and `:100`, both inside
  `flex -space-x-2` overlap stacks (`:74` and `:98`).
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous to delete / **owner** to make it work
- **Evidence**: `BG_MODE` is `"none"` (`bird-avatar-v2.tsx:1,766`) and typed as the full union
  `"none" | "outline" | "inset"`, so TypeScript does not narrow it and the bundler cannot fold the
  branch — `clipped` is a runtime `false` on every render. The intent at the call site is
  unmistakable: `your-catchups-card.tsx:74` overlaps the avatars with `-space-x-2`, and the `+N`
  overflow chip two lines below the map (`:78-85`, the box-shadow at `:81`) carries the same ring
  by hand — `style={{ boxShadow: "0 0 0 4px var(--card)" }}`, which is byte-for-byte the value
  `BirdAvatar`'s own `ringStyle` builds and then throws away. So today a stack of members shows a separator
  ring on anyone with a photo and none on anyone wearing a bird — which is most of them. The idiom
  that *does* work elsewhere is a wrapper span:
  `answer-experience.tsx:183` (`className="rounded-full ring-2 ring-card"`) and
  `trust-section.tsx:47,54` both do it that way.
- **What to do**: the honest minimum, with zero visual change, is to **delete the prop**: remove
  `ring` from the signature and `ringStyle` from `bird-avatar.tsx`, and drop `ring` from the two
  `your-catchups-card.tsx` call sites and from the four lab call sites
  (`lab/tiles/_specimens.tsx:149`, `lab/feed-canvas/page.tsx:228`,
  `lab/profiles/_profile-avatar.tsx:180`, `lab/profiles/_variant-dossier.tsx:262`). That removes a
  control that lies. **If the owner wants the separation** (and the `+N` chip beside it says the
  design intends it), the fix is a wrapper span with `ring-2 ring-card` at the two call sites — but
  a `rounded-full` ring around a transparent, non-circular bird glyph is a look he has to see
  before it ships, which is why this half is his.
- **Saving**: ~8 lines and one dead branch; or, on the other path, a visible inconsistency fixed in
  the Catch-ups card.
- **Risk & gate**: low either way. `npm run check`; `npm run visual`; open `/catchups` signed in as
  Jerry and look at the two member stacks on the "your catch-ups" card at 1440 and at 390.
- **Confidence**: high on the mechanism (the two lines are unambiguous). Medium on what the owner
  wants to see, which is why the second half is his.
- **Notes**: I nearly filed this as a not-finding on the grounds that `BG_MODE`'s dormant branches
  are defended by `docs/spec/avatars.md` (audit-1 not-finding, and I am not re-arguing that). But
  the defence covers keeping the *modes*; it does not cover a prop whose only live effect is on the
  photo path while two shipped call sites pass it for the bird path.

### landing-mascot-avatars-07 - Four independent "one hoopoe at a time" wait loops, four different constants, no shared owner

- **Where**: the one primitive is `src/components/mascot/moments/one-hoopoe-guard.ts:15-18`
  (`anotherHoopoeOnScreen()`, a `.hoopoe-mascot` DOM count) and `:30-36` (`useSoloHoopoe()`).
  The four independent waiters built on it:
  1. `src/components/mascot/sidebar-hoopoe.tsx:47` (`BLOCKED_RETRY_MS = 8_000`) `:112`;
  2. `src/components/mascot/moments/celebration-detector.tsx:35-36`
     (`BLOCKED_RETRY_MS = 3000`, `MAX_BLOCKED_RETRIES = 10`) `:136-162`;
  3. `src/components/mascot/moments/logo-easter-egg-hoopoe.tsx:88` (a one-shot check, **no** retry);
  4. `src/components/landing/footer-hoopoe.tsx:89` (`BLOCKED_RETRY_MS = 4000`) `:150-152`
     (`anotherHoopoeVisible(self)`, a **second copy** of the DOM query with a self-exclusion) `:255-257`.
  Two structurally different mechanisms enforce the same rule elsewhere:
  `src/components/mascot/mascot-flight.ts:75-78` (a single-slot bus: one `launchCb`, one
  `handoffCb`) and `src/components/mascot/use-flight-arrival.ts:155,166` (the destination hides its
  own bird behind `hoopoeShown` / `preFlightVeil` until handoff). And one documented, deliberate
  violation: `src/components/mascot/hoopoe-warmup.tsx:31-38` (a real `<Hoopoe>` carrying the class
  for ~2 frames).
- **Phase**: architecture (with a small `dedupe` inside it)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "BLOCKED_RETRY_MS\|MAX_BLOCKED_RETRIES" src/` returns three separate
  constants with three values and no comment relating any of them to the others; `grep -rn
  "hoopoe-mascot" src/` shows two independent implementations of the same query
  (`one-hoopoe-guard.ts:17` and `footer-hoopoe.tsx:152`). So the *rule* has one owner and the
  *waiting* has four, and nothing in the codebase says why a blocked sidebar bird waits 8 s, a
  blocked celebration 3 s ten times, and a blocked footer bird 4 s. **The answer to the charter's
  question is: one primitive, six mechanisms.**
- **What to do**: give `one-hoopoe-guard.ts` the wait, not just the check. Add
  `anotherHoopoeOnScreen(except?: Element | null)` (the self-exclusion `footer-hoopoe.tsx` already
  needs) and `waitForClearStage({ retryMs, maxTries, except }): () => void` returning a canceller,
  then have the three retry loops call it with their own numbers **in one file where they can be
  read side by side**. Keep `useSoloHoopoe()` exactly as it is — its "checked exactly ONCE, never
  a `useSyncExternalStore`" comment (`moment-hoopoe.tsx:34-41`) records a real infinite-loop
  postmortem and must not be turned into a poll. Do **not** unify the flight bus or the arrival
  veil into this: they solve a different problem (a bird crossing a navigation) and
  `footer-hoopoe.tsx:47-54` explains why a second bus subscriber would silently steal the flight.
- **Saving**: ~0 lines (audit 1's lesson holds: three imports and a docblock cost what the three
  loops save). The payoff is one place to change the rule and three tuning constants finally visible
  together — plus the self-exclusion stops being a private copy in a switched-off file.
- **Risk & gate**: low-medium (timer behaviour). `npm run check`; then, signed in as Jerry, force
  the collision: leave a page idle to summon the sidebar bird, then triple-click the logo (the egg
  must stay quiet), and trigger a celebration on `/welcome` while the sidebar bird is up.
- **Confidence**: high on the census. Medium on whether it is worth doing at all — say so plainly to
  the owner: this is a quality change, not a size change.
- **Notes**: **A real inconsistency found while counting.** Three of the four mount-and-play files
  defer their first verb by `setTimeout(fn, 0)` inside `onReady`, each with a long comment about
  React Strict Mode's dev-only mount → cleanup → remount dance killing a synchronously-started
  animation: `mascot-flight-layer.tsx:162-194`, `sidebar-hoopoe.tsx:193-203`,
  `logo-easter-egg-hoopoe.tsx:117-126`. **`celebration-hoopoe.tsx:71-73` does not** — `handleReady`
  calls `void playCelebration(api, kind)` straight away. It is dev-only, so production is fine, but
  the celebration is the moment a member is most likely to see (post-signup welcome on `/welcome`),
  and a session debugging it on localhost would walk into precisely the
  "looks different deployed than on localhost" trap `mascot-flight-layer.tsx` spends 25 lines
  describing. One `setTimeout(…, 0)` and a pointer to that comment closes it; ship it with this
  finding.

### landing-mascot-avatars-08 - `hoopoe-geometry.ts` (361) and `edge-light.ts` (145) are build-time and lab-only tooling living in `src/lib/`

- **Where**: `src/lib/hoopoe-geometry.ts` (361 lines) and `src/lib/edge-light.ts` (145 lines).
  Consumers of the first: `src/app/lab/hoopoe-marks/_parts.tsx:23,25`,
  `src/app/lab/hoopoe-marks/page.tsx:16`, `src/app/lab/glass-edges/page.tsx:48`,
  `src/lib/mark-centring.test.mjs:23`, `scripts/dev/build-app-icon.mjs:15`. Of the second:
  `src/app/lab/glass-edges/page.tsx:47`, `scripts/dev/generate-icons.mjs:31`.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (with the caveat in Notes)
- **Evidence**: **No shipped route imports either file.** Confirmed by grep across `src/` and by
  the build: neither reaches a non-lab client chunk, because their only `src/` consumers are two lab
  rooms. So the answer to the charter's question is: **`edge-light.ts` is tooling, not runtime** —
  its two consumers are one lab room and one Node script that bakes the filter into a PNG through
  sharp. `hoopoe-geometry.ts` is the same shape: data for the icon builder and for three lab rooms.
  Together they are **506 lines, 4.1% of `src/lib`'s 12,215 TS lines**, in a folder whose name means
  "code the app runs".
- **What to do**: honestly, this is a judgement call and the fixer should read the two banners
  before moving anything. `hoopoe-geometry.ts:9-15` argues its own location: "the shipped app icon
  has to be built by a plain Node script, and the lab rooms have to draw the identical thing in
  React … So the assembly lives here once." `edge-light.ts:14-17` says the same. Both reasons are
  about **sharing between a script and a lab room**, which is exactly what a `scripts/lib/` or a
  `src/app/lab/_shared/` folder is for; `src/lib/` is not the only place two consumers can meet.
  If it moves: `scripts/dev/build-app-icon.mjs:15` and `generate-icons.mjs:31` already use relative
  paths and only need the path edited; the three lab rooms swap `@/lib/…` for a relative import;
  `src/lib/mark-centring.test.mjs:23` moves with it (the test runner discovers `*.test.mjs` by glob
  and `npm run check` enforces a file-count floor, so a move is safe but a delete is not); and
  `scripts/qa/protocol-audit.mjs:117-118` holds an allow-list entry for **both** paths and must be
  updated in the same commit or the shape+colour gate fails.
- **Saving**: 506 lines out of `src/lib`, 0 client bytes (they never ship), 0 build seconds. Clarity
  only — but `src/lib` is the folder a new session reads to learn what the app does, and two of its
  larger files are for an icon.
- **Risk & gate**: low. `npm run check` (**`protocol-audit` will fail loudly if the allow-list is
  not moved with the files** — that is the gate); `npm run visual` (unchanged); open
  `/lab/hoopoe-marks` and `/lab/glass-edges`.
- **Confidence**: high on the facts; **medium on whether it is worth doing**. If the fix session
  disagrees after reading the two banners, "kept, and here is why" is a fine outcome — record it as
  a not-finding so audit 3 does not raise it again.
- **Notes**: I did *not* propose deleting either file. `hoopoe-geometry.ts` is what stops the app
  icon from drifting from the mascot, and `mark-centring.test.mjs` pins that; `edge-light.ts` is the
  single source both the lab room and the icon generator read, which is the whole reason the two
  cannot disagree.

### landing-mascot-avatars-09 - Three `apple-edge` scripts are hard-wired to a file inside `sanan's stuff/`, which the owner has an open decision to move

- **Where**: `scripts/dev/apple-edge/truth.mjs:3`, `truth-profile.mjs:6-7`, `compare.mjs:8` — all
  three read the literal path `"sanan's stuff/Inspiration/not yet right.png"`. Also
  `scripts/dev/apple-edge/look.mjs:17` (`const OUT = '.tmp-shots/edge'`).
- **Phase**: hygiene (with a containment issue)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -n "sanan's stuff" scripts/dev/apple-edge/*.mjs` returns those three lines.
  Audit-1 report §4 carries an **open owner decision to move `sanan's stuff` out of the repo**
  (item #15, "owner does it himself"); the day he does, three of these five scripts fail with an
  ENOENT and nothing in `scripts/README.md` warns of it. The README's harness section
  (lines 90-104) documents what each script does and even says "anything that changes the mark will
  want to re-check itself against the same screenshot" — without naming where that screenshot is.
  Separately, `look.mjs` writes to **`.tmp-shots/`, a folder at the repo root**, while every other
  screenshot tool in the repo writes to `e2e/.shots/` (`npm run screenshot`, `screenshot:auth`,
  `verify:shot`, `verify:crawl`). It is gitignored (`.gitignore:99`) and the folder does not exist
  right now, so nothing has been committed — but CLAUDE.md's "the repo root is closed" is exactly
  about a folder appearing there, and the fix-prompt records that `temporary screenshots/` had to be
  moved off the root on 2026-08-28 for the same reason.
- **What to do**: two small edits. (a) Read the ground-truth path from `process.env.APPLE_EDGE_TRUTH
  ?? process.argv[2]` with today's string as the documented default, and add one sentence to the
  harness table in `scripts/README.md` naming the file it needs and saying it is the owner's, not
  the repo's — so the failure, when it comes, says what is missing. (b) Point `look.mjs`'s `OUT` at
  `e2e/.shots/edge` and drop `.tmp-shots/` from `.gitignore:99` if nothing else claims it (check
  first: `grep -rn "tmp-shots" scripts/ e2e/ package.json`).
- **Saving**: 0 lines; one silent future breakage turned into a stated dependency, and one root
  folder that can no longer appear.
- **Risk & gate**: low, and none of it is runnable in an audit. `npm run check` (these scripts are
  in `scripts/README.md`'s ledger, which `scripts/qa/*` gates on); the harness itself is hand-run.
- **Confidence**: high.
- **Notes**: I am **not** proposing retiring the harness. `scripts/README.md:90-109` argues for
  keeping it ("the method — measure, fit, then LOOK — is the part that took the longest to learn"),
  its write-up shipped as `docs/spec/apple-edge-light.md`, and its two generated PNGs are already
  gone (the README says the output is ignored, and `ls` confirms only the five `.mjs` remain). This
  is about making a kept tool survive a move the owner has already said he wants to make.

### landing-mascot-avatars-10 - `docs/spec/mascot.md` lists a shipped feature as an open follow-up and omits four of the eight moments

- **Where**: `docs/spec/mascot.md` — `:18` (a `src/app/preview/delight/hoopoe/page.tsx` path with
  "Now at `src/app/lab/hoopoe/page.tsx`" bolted on), the whole `## Files` list (`:13-20`, five
  entries for a folder of 22 files), the `## Wired in` section (`:154-192`), and two of the four
  `## Open follow-ups` (`:193-209`).
- **Phase**: hygiene (stale spec)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: CLAUDE.md orders this file read before any mascot work, so its accuracy is
  load-bearing. Four faults, each verified:
  1. **"Sign-in fly-in: the owner's vision is the bird appearing at the Sign-in button and flying to
     the login hero as the panel slides over … this is an app-level orchestration to build when
     wiring the real sign-in transition."** It is built. `mascot-flight.ts` (138) is the bus,
     `mascot-flight-layer.tsx` (595) flies it, `landing-hero.tsx:213-242` (`startExit`) launches it
     from both CTAs, and `use-flight-arrival.ts` (350) lands it — with a `perch-report.test.mjs`
     pinning the ResizeObserver. The spec's newest open item is its oldest shipped feature.
  2. **`## Files` names five files.** The folder has 22. `mascot-flight.ts`,
     `mascot-flight-layer.tsx`, `use-flight-arrival.ts`, `sidebar-hoopoe.tsx`, `hoopoe-warmup.tsx`
     and all twelve of `moments/` appear only in prose, if at all.
  3. **Four of the eight moments are undocumented.** `grep -n
     "contributed\|no-results\|no-saved\|messages-empty\|MomentStage\|moment-hoopoe"
     docs/spec/mascot.md` returns **nothing**. `MomentStage` — the one engine all four ambient
     moments are built on — is not in the spec at all, and `contributed-hoopoe.tsx` shipped
     2026-08-29 with an owner quote in its own banner and never reached the spec.
  4. `src/components/auth/hoopoe.tsx` (named in the last follow-up as still removable) **does not
     exist**; `src/app/preview/delight/_hoopoe.tsx` is now `src/app/lab/_hoopoe.tsx` and is still
     imported by `lab/feed-canvas/page.tsx:28`.
- **What to do**: replace the sign-in-fly-in follow-up with a two-line "SHIPPED" entry naming the
  four files and pointing at `mascot-flight.ts`'s header for the three-party design; rewrite
  `## Files` as the real 22 (grouped: rig, controller, flight, residents, moments); add a short
  `MomentStage` paragraph to `## Wired in` naming the four ambient moments and their mount sites
  (`posts/post-feed.tsx:366`, `directory/directory-client.tsx:662`,
  `profile/saved-posts-feed.tsx:188`, `messages/(index)/page.tsx:130`,
  `collection/contribute-room.tsx:1038`); fix the `:18` path; drop the dead
  `components/auth/hoopoe.tsx` clause. Keep the "Proportions" follow-up — it is still open and it is
  the standing justification for the five lab-only props (see Not-findings).
- **Saving**: ~25 lines net, and a spec that stops sending the next session looking for wiring that
  is not there (or building a feature that already exists).
- **Risk & gate**: low; docs only. No test reads `mascot.md`. Ships in the same commit as whichever
  code change the session is doing, per the one-commit-per-change rule — do not make it a standalone
  `docs:` commit.
- **Confidence**: high; every claim grep-verified.

### landing-mascot-avatars-11 - `/pick-bird`'s warm shimmer promises a subtitle and a column count the page never renders

- **Where**: `src/app/(main)/pick-bird/loading.tsx:9` (a second skeleton line,
  `h-4 w-80 max-w-full`) and `:11` (`grid-cols-3 sm:grid-cols-4 md:grid-cols-5`), against
  `src/app/(main)/pick-bird/page.tsx:87` (`<PageHeader title="Pick your bird" />` — title only, no
  subtitle) and `src/components/support/bird-picker.tsx:78`
  (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: The page's own comment at `:84-86` says "Title only, matching `/birds` (owner: one
  layout for both pages, no subtitles)" — so the skeleton's second line is drawing a subtitle the
  owner explicitly removed. And the column counts differ at every breakpoint below `lg`, so the
  shimmer's grid visibly reflows the instant the real content arrives. The `/birds` page it is
  supposed to mirror has no `loading.tsx` at all (it is a static server page).
- **What to do**: delete `loading.tsx:9`; change `:11` to
  `grid-cols-2 gap-x-[var(--space-m)] gap-y-[var(--space-l)] sm:grid-cols-3 md:grid-cols-4
  lg:grid-cols-5` to match `bird-picker.tsx:78` exactly; raise the placeholder count from 15 to 20
  so a `lg` viewport's first four rows are filled. Add a one-line comment at both sites saying they
  are a pair (see finding 14, which is the general version of this).
- **Saving**: 1 line; a loading state that stops lying about the page's shape.
- **Risk & gate**: low. `npm run check`; throttle the network and open `/pick-bird` as an admin
  (the page's own gate lets admins through without a contribution — `page.tsx:60-62`), at 1440 and
  at 390.
- **Confidence**: high.

### landing-mascot-avatars-12 - Stale comments in the mascot and landing files pointing at code that has moved or gone

- **Where**: `src/components/mascot/mascot-flight-layer.tsx:46-47` ("on the landing — the only
  place flights launch — the scroll companion has already loaded it": the scroll companion is
  `footer-hoopoe.tsx`, inside the switched-off showcase, and has not mounted since 2026-08-04);
  `src/components/landing/landing-hero.tsx:412-413` ("see `SHOW_SHOWCASE` in `src/app/page.tsx`":
  that constant no longer exists — `grep -rn "SHOW_SHOWCASE" src/` finds only three prose mentions,
  none of them a declaration); `src/components/mascot/moments/moment-hoopoe.tsx:4-6` (the banner
  says the plumbing serves "empty search results, empty saved posts, and friends", written when
  there were three callers; there are now four, the two unnamed ones being `messages-empty-hoopoe`
  and `contributed-hoopoe` — and the second of those is a celebration, not an empty state, so the
  same banner's "ambient companions living inside an already-drawn empty state … the empty state's
  own copy is what actually communicates 'there is nothing here'" is now wrong about a quarter of
  what it describes).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each grep-verified above. These are the exact class CLAUDE.md distinguishes: not
  "comments that restate the next line" (this repo has almost none of those in my territory) but
  **comments that carry a reason which is no longer true**, which is worse than no comment because a
  future session will act on them.
- **What to do**: `mascot-flight-layer.tsx:46-47` — say instead that the landing statically imports
  the rig for `HeroLoader` and warms it via `HoopoeWarmup`, so the first flight has it cached; note
  that this changes if finding 02 lands. `landing-hero.tsx:412-413` — point at
  `src/app/page.tsx:36` (`showScrollCue={false}`) and `@/components/landing/showcase`.
  `moment-hoopoe.tsx:4-6` — list the four real moments.
- **Saving**: ~0 lines; three fewer wrong statements in files the next mascot session will read
  first.
- **Risk & gate**: low; comments only. `npm run check`.
- **Confidence**: high.
- **Notes**: I looked hard for the sixth bloat signature ("comments that narrate the obvious") across
  this territory and found essentially none — see Not-findings. Every long comment I read carried a
  date, an owner quote, a measured number or an audit id. These three are stale, not verbose.

### landing-mascot-avatars-13 - Six `export` keywords that widen a module's surface for no consumer

- **Where**: `src/components/mascot/moments/moment-hoopoe.tsx:43` (`useMomentAutoplay` — used only
  at `:101` in the same file); `src/lib/avatar.ts:44` (`BIRD_SPECIES_COUNT`) and `:47`
  (`BIRD_POSE_COUNT`) — both used only at `:162,164` in the same file;
  `src/lib/hoopoe-geometry.ts:331` (`PEEK_CREST` — used only at `:336`);
  `src/lib/hoopoe-geometry.ts:32` (`H`) — re-exported by `src/app/lab/hoopoe-marks/_parts.tsx:25`
  and consumed by nobody; `src/components/common/bird-avatar-v2.tsx:1,613`
  (`export const ARCHETYPES = ARCHES`) — imported only by four **lab** rooms
  (`lab/centroid/page.tsx:3`, `lab/feedback/page.tsx:19`, `lab/profiles/_profile-avatar.tsx:29`,
  `lab/birds-bg/page.tsx:3`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each verified beyond knip's claim by grep across `src/`, `scripts/`, `e2e/` and
  `docs/spec/`. `raw/knip-repo-config.txt` lists the first four; `H` and `ARCHETYPES` I found by
  hand. **Two knip lines in my territory I am NOT proposing**: `HOOPOE_HASH_REMAP_INDEX` is imported
  by `src/lib/avatar.test.mjs:24`, so its export stays; and `RARE_IDLE_CHANCE` is not exported at
  all any more.
- **What to do**: drop the `export` keyword on the first four. Leave `ARCHETYPES` and `H` **exported
  but relabelled**: change the `ARCHETYPES` doc-comment from "Exposed for the optical-centering
  harness (preview/centroid + scripts/dev/centroid.mjs)" to name its four real consumers (all lab)
  so a future audit does not read it as dead; do the same for `H`. Note the two caveats: `avatar.ts`
  is deliberately import-clean (its test imports it by relative path under Node's type-stripping),
  so demoting two constants there changes nothing about how the test runs; and if `no-unused-vars`
  then fires on a now-unexported const, that is the point.
- **Saving**: ~2 lines; `bird-avatar-v2.tsx`'s public surface drops from 9 exports to the 8 that are
  really its API, and `avatar.ts`'s from 9 to 7.
- **Risk & gate**: low. `npm run check`; `src/lib/avatar.test.mjs` must stay green (it imports six
  symbols from `avatar.ts`, none of them demoted).
- **Confidence**: high; each symbol grep-verified individually rather than taken from knip on faith.

### landing-mascot-avatars-14 - The `/birds` and `/pick-bird` grids are kept identical by three comments instead of one constant

- **Where**: `src/app/(main)/birds/page.tsx:31` and `:26-28` (the comment: "/pick-bird mirrors this
  exact layout; if the grid classes change here, change them there");
  `src/components/support/bird-picker.tsx:78` and `:70-75` (the mirror comment: "THE /birds LAYOUT,
  exactly … If the grid classes change in src/app/(main)/birds/page.tsx, change them here");
  `src/app/(main)/pick-bird/loading.tsx:11` (a third copy which has **already drifted** — finding
  11).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural (small)     **Decides**: autonomous
- **Evidence**: three copies of
  `grid grid-cols-2 gap-x-[var(--space-m)] gap-y-[var(--space-l)] sm:grid-cols-3 md:grid-cols-4
  lg:grid-cols-5`, two of them synchronised by a comment that names the other file, and the third
  already wrong. The comment-as-enforcement worked exactly as well as comment-as-enforcement ever
  does. The owner's instruction is quoted in both files ("use the birds of the valley layout… why
  have two separate layouts"), so the sameness is the requirement, not an accident.
- **What to do**: one exported constant — `BIRD_GRID` in `src/components/support/plate-data.ts`
  (which both pages already import through, and which is a plain `.ts` module both a server page and
  a client component can read) — used at all three sites. Keep a one-line comment at the constant
  saying it is the owner's "one layout for both pages" and that `loading.tsx` is the third consumer.
- **Saving**: **0 net lines** (this is the audit-1 lesson in miniature: one export, three imports,
  a docblock). The value is that the third copy stops being able to drift, which it already has.
  Say that plainly to the owner rather than dressing it as a size win.
- **Risk & gate**: low. `npm run check`; `npm run visual`; open `/birds` and `/pick-bird` at 1440
  and 390 and compare the two grids at each breakpoint.
- **Confidence**: high.

### landing-mascot-avatars-15 - The launch pose is written twice inside `hoopoe.tsx`, nine animations each

- **Where**: `src/components/mascot/hoopoe.tsx:715-724` (inside `flyCore`, under the comment
  "1. takeoff: a quick, shallow crouch + a push off the legs") and `:819-831` (`takeOffRaw`, under
  "1. launch pose: swap to flight (arm) wings, raise them into a V, tuck the legs up").
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural (small)     **Decides**: autonomous
- **Evidence**: both blocks fire the same nine `A(...)` calls in the same order — fade the two
  folded wings out over 0.1 s, fade the two arm wings in over 0.1 s, crouch the body, raise both
  wings to ∓74° on `SPRINGS.snappy`, tuck both legs to ±138° on `SPRINGS.gentle`. Eight of the nine
  are character-for-character identical. The ninth, the crouch, differs:
  `flyCore` writes `{ scaleY: [1, 0.9, 1], y: [0, 4, 0] }` over **0.22 s** with no rotate;
  `takeOffRaw` writes `{ scaleY: [1, 0.88, 1], y: [0, 5, 0], rotate: dir * 4 }` over **0.26 s**.
  Nothing in either comment argues the two crouches *should* differ, and `takeOffRaw`'s own banner
  (`:817-818`, and the block comment at `:836-839`) says the cross-screen primitives "reuse the
  proven poses from flyCore so a cross-screen flight reads like the in-SVG one" — the intent is
  sameness, expressed as a copy that has since drifted by 4 frames and 0.02 of scale.
- **What to do**: delete `flyCore`'s copy and have it `await takeOffRaw(0)` (dir 0 gives
  `rotate: 0`, which is what `flyCore` has today). That accepts `takeOffRaw`'s 0.26 s / 0.88 / 5
  numbers for the in-SVG flight too, which is the smaller change and the one the banner endorses.
  If the 4-frame difference turns out to be deliberate, give `takeOffRaw` a
  `{ dir = 1, dur = 0.26, dip = 5, squash = 0.88 }` options object instead and pass `flyCore`'s
  numbers — same dedupe, both readings preserved. **Look at both flights before choosing**: the
  in-SVG `flyTo` is what a visitor presses on the public `/hoopoe` page.
- **Saving**: ~9 lines out of the territory's largest file, and one place where "the launch pose"
  lives instead of two that have already drifted.
- **Risk & gate**: low-medium (it is animation timing). `npm run check`; open `/hoopoe`, press
  "Fly" and then "Surprise me" → "the forager"; then run the landing → Sign in flight once and watch
  the take-off. `scripts/qa/hoopoe-landing-check.mjs` samples the flyer's transform frame by frame
  if a recorded proof is wanted (`mascot-flight-layer.tsx:576-579` documents that hook).
- **Confidence**: high on the duplication (the two blocks are eight identical lines apart);
  medium on which set of crouch numbers should win — that is the one thing that would change the
  shape of the fix, and it is a 30-second look at the two flights.
- **Notes**: **The 13-line clone `raw/jscpd.txt` actually flags is a different pair, and that one I
  am NOT proposing.** It is the LANDING fold — `arcAndLand:695-706` against `perchRaw:870-884` —
  which shares the arm→fold cross-fade and the identical cushion squash
  `{ scaleY: [1.08, 0.95, 1], y: [0, 3, 0], rotate: 0 }` at 0.45 s. Its three divergences are each
  argued in a comment: `arcAndLand` deliberately does **not** re-write the legs (they were sent to 0
  mid-descent and superseding an unsettled spring leaves an unresolvable `.finished`, `:695-698`)
  and does restore the shadow, while `perchRaw` does set the legs and levels the crest and tail. A
  shared helper with three booleans would be worse than the copy. Leave it; this note is here so
  audit 3 does not chase the jscpd line.

### landing-mascot-avatars-16 - The icon pipeline is two ordered commands with no entry point, and one of its two screenshot helpers ignores the Chrome override

- **Where**: `scripts/dev/build-app-icon.mjs` (stage 1: reads `src/lib/hoopoe-geometry.ts`, writes
  `public/images/brand/app-icon.svg`) and `scripts/dev/generate-icons.mjs` (stage 2: reads that
  SVG **and** `src/app/icon.svg`, writes `src/app/apple-icon.png`, three
  `public/images/icons/*.png`, and `src/app/favicon.ico`). The run order is recorded only in a
  comment, `build-app-icon.mjs:11-12`. Separately: `scripts/dev/shot-clip.mjs:10` hard-codes
  `/Applications/Google Chrome.app/…` with no `PUPPETEER_EXECUTABLE_PATH` fallback, while its
  sibling `shot-svg.mjs:15-16` and `scripts/dev/centroid.mjs:29` and
  `scripts/dev/apple-edge/look.mjs:22` all honour it.
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: **The two icon scripts are one pipeline, not two** — that is the answer to the
  charter's question, and they are well built: stage 1 asserts the two string seams
  (`<defs id="fx"></defs>`, `<g id="lit">`) exist before writing (`build-app-icon.mjs:58-66`) and
  stage 2 asserts they matched after substituting (`generate-icons.mjs:67-74`), because "a silently
  flat Android icon is the failure this whole path exists to prevent". The duplication of the seam
  assertion is deliberate and argued. What is missing is a single entry point: `package.json`
  exposes `dev:centroid` and `dev:shot-clip` as npm scripts but neither icon stage, so the ordering
  lives in a comment and in `scripts/README.md`'s two separate table rows. Running stage 2 alone
  after editing `hoopoe-geometry.ts` produces PNGs from a stale SVG, silently.
  `shot-clip.mjs`'s hard-coded path is CLAUDE.md gotcha 2 exactly ("set
  `PUPPETEER_EXECUTABLE_PATH` … or they exit with a stack trace"); it happens to work on this
  machine and fails on any other.
- **What to do**: add one npm script, `"icons": "node scripts/dev/build-app-icon.mjs && node
  scripts/dev/generate-icons.mjs"`, and change the two `scripts/README.md` rows to name it as the
  way to run either. Add the same `process.env.PUPPETEER_EXECUTABLE_PATH ||` prefix to
  `shot-clip.mjs:10` that `shot-svg.mjs:16` already has. (Do **not** wire the icon pipeline into
  `npm run check`: it takes sharp and writes binaries, and `scripts/qa/ci-parity.test.mjs` pins the
  check gate's contents.)
- **Saving**: 1 line of config, 1 line of script; a two-stage build that can no longer be run half
  way round, and one script that stops depending on where Chrome is installed.
- **Risk & gate**: low. `npm run check`. The pipeline itself is hand-run and its output is committed
  — `src/lib/app-icon-safe-zone.test.mjs` decodes the shipped `icon-maskable-512.png` and asserts
  the hoopoe's eyes survive a circular Android mask, so a bad regeneration fails `npm run check`
  loudly. The committed PNGs are in sync today (last touched by `48e3312`, the same commit as the
  maskable safe-zone fix, and the tree is clean).
- **Confidence**: high.

---

## Owner decisions

**The landing showcase — still your call, and now with numbers (finding 03).** Everything below the
landing hero — the five feature bands with real screenshots, the falling leaves, the perching birds,
the trust card, the closing footer — has been switched off since 2026-08-04 on your own instruction
to improve it before shipping. Since audit 1 it has been properly *disconnected*: the landing page
no longer carries a single byte of it, which was the free half of the job and it is done. What
remains is 11 files and 2,477 lines of finished-quality code, five screenshots taking 283 KB of the
repository, and about 1.6 KB of the shared stylesheet, all of it for a page nobody has seen. Three
choices, unchanged: finish and ship it before launch; keep waiting (it now costs almost nothing to
wait); or accept the hero-only landing as the launch design and retire it, with git keeping every
line. **My recommendation is to decide before launch rather than after**, because two things ride on
it. First — and this is the one that actually matters — **the public landing page still links to no
Privacy, Terms or Guidelines page.** Those three links live inside the switched-off footer, and the
security audit called them "the documents a stranger should be able to find before an account
exists". Whichever way the showcase goes, those three links need a small home in the hero, and that
is new UI on your most-visited public page, so it is yours to approve. Second, the trust card
contains five invented alumni names and a made-up "10 people vouched" count that must become real,
or clearly illustrative, before anyone sees it.

**A sprite for the fifty birds — this is audit-1 item #13, and it now has its number (finding 01).**
Every page that shows a member's face downloads all fifty-one bird drawings to draw one. Measured on
the real build: **44 KB of code (12 KB compressed) on 39 of the site's 52 pages**, and it cannot be
made smaller by the build tools, because the birds are one list and taking one out of a list is not
something they know how to do. There are two ways to fix it and they are independent. The first is
free and invisible and needs no decision from you: the sidebar and the konami easter egg — the two
things on every page that pull the birds in — each need exactly one bird, and there is a standard
way to hand them a single pre-drawn bird instead of the whole set. A later session can just do that.
The second is the sprite: draw all fifty once into a single image file that the browser fetches once
and caches for ever, instead of shipping them as code on every page. That one *is* yours, because it
changes how the most-repeated image on the site is drawn, and there is a small compatibility question
(one older way of referencing shapes inside a shared image file) that must be prototyped in a lab
room before it goes near the real avatars. **My recommendation: do the free half now, measure, and
only then decide whether the sprite is worth the plumbing.** It may turn out the free half is most
of the win.

**Should the hoopoe be downloaded by everyone, everywhere? (finding 02.)** The mascot's code is
28 KB, and it currently arrives with every single page a signed-in member opens — 46 of 52 pages —
because the sidebar might, after ninety seconds of stillness, glide a bird onto the rail. On about
thirty of those pages that is the *only* reason it is there. Making it load on demand instead is a
known, documented pattern this codebase already uses in one place, and the bird's behaviour would be
byte-for-byte identical; the only risk is a small stutter the first time it appears, which there is
an existing fix for. This is not really a decision, it is unfinished work from the last audit, and I
have written it up as autonomous — but you should know it is happening, because if it goes wrong the
symptom is your favourite feature appearing a beat late.

---

## Not-findings

Things that look like bloat in this territory and are verified intentional. Each is here so audit 3
does not re-litigate it.

- **`use-flight-arrival.ts`'s 1.22 comment/code ratio (184 comment lines to 151 of code), the
  second-highest in the repo.** Read line by line. Every block carries a date, an owner quote, a
  measured number or a postmortem: the 2026-08-11 forced-layout trace ("~85ms, billed to whichever
  code touches geometry first"), the owner's "it jerks slightly when the sign in content comes in",
  the 2026-08-26 `/signup` trivia-question reflow, the two-frame veil lift, the 5800/6000 failsafe
  pair. Its banner even records that it replaced three copies ("the perch half written twice
  comment-for-comment and the fly-in half three times"). This is the "every constant argued for"
  standard executed, and `perch-report.test.mjs` pins two of the conclusions. Same verdict for
  `mascot-flight-layer.tsx` and `src/lib/avatar.ts` (1.73, 95 comment lines to 55 of code — of which
  the largest block is the "never raise `BIRD_SPECIES_COUNT`" warning that `avatar.test.mjs:149-160`
  spends 200,000 hash evaluations enforcing).
- **`BG_MODE`'s dormant `"outline"` and `"inset"` branches.** Measured today: `discFor`
  (`bird-avatar-v2.tsx:1,753-1,761`), `INSET_SCALE` (`:1,771`) and the two `BG_MODE !== "none"`
  branches (`:1,813-1,839`) are ~40 lines that can never render. I checked whether `mix()`
  (`:40-57`) goes with them — it does not: the bird drawings themselves call it 60 times, so it
  stays whatever happens to the disc modes. Defended in
  writing by `docs/spec/avatars.md`: "the disc palette is held in reserve for the optional
  outline/inset modes… switching is a one-line change," and the colour axis is still hashed and
  distribution-tested for exactly that reason (`avatar.test.mjs:13-14`). Audit-1 ruled it kept; I am
  recording the current number, not re-arguing. (The one thing the defence does **not** cover is the
  `ring` prop — finding 06.)
- **`bird-adjust.json` is consumed at RUNTIME, and that is right.** It is imported by
  `bird-avatar-v2.tsx:10` and read per render by `archeTransform` (`:87-95`); it compiles to
  **1,936 bytes raw / 917 gzip** inside the shipped chunk. All 51 entries are live (keyed by
  `ARCHES[i].name`, including the reserved Roller). `scripts/dev/centroid.mjs` regenerates it from
  the `/lab/centroid` harness and composes each correction onto the previous one, so the file is a
  converged measurement, not a hand-tuned table. Baking the transforms into `ARCHES` at build time
  would save ~2 KB and make `centroid.mjs` rewrite a `.tsx` file, which is worse. Kept.
- **There IS one moment engine, and the eight files are four configs plus three other engines.**
  `MomentStage` (`moment-hoopoe.tsx:88-113`, 26 lines) carries the controller, the stage ref, the
  solo guard, the scroll-into-view autoplay and the `aria-hidden` wrapper, and its own banner records
  that it was extracted after "all three moments wrote this out identically". The four configs —
  `no-results-hoopoe.tsx` (40), `no-saved-hoopoe.tsx` (47), `messages-empty-hoopoe.tsx` (30),
  `contributed-hoopoe.tsx` (56) — are 173 lines of which roughly **24 are actual choreography**; the
  rest is a banner explaining which board card the moment is and a props signature. Collapsing them
  into one data-driven file would save perhaps 60 lines and cost four sets of reasons, which is
  exactly the trade audit 1 measured at 65 commits for −90 lines. Kept as four files. The three
  files that are *not* on this engine each have a stated reason: `celebration-hoopoe.tsx` must play
  on mount rather than on intersection and its guard lives in its parent (`:11-15`);
  `logo-easter-egg-hoopoe.tsx` needs a capture-phase click counter and its own reveal spring;
  `sidebar-hoopoe.tsx` is a long-lived resident with an idle lifecycle. (One inconsistency between
  them **is** a finding — the missing Strict-Mode deferral in `celebration-hoopoe.tsx`, filed under
  finding 07's Notes.)
- **`avatar.test.mjs`'s 200,000-iteration reserved-range loop is cheap.** It looked like a build-time
  cost worth reporting. Benchmarked the identical arithmetic in isolation: **144 ms** for the 200k
  loop and 15 ms for the 16k distribution loop. Against a 24.8 s `npm run check` that is noise, and
  the loop is what proves the hash can never reach the owner's reserved Roller. Kept, unchanged.
- **The five lab-only proportion knobs on `<Hoopoe>`** (`headScale`, `eyeScale`, `eyeY`,
  `eyeSpread`, `billLength`, plus `variant="icon"` and `tail`). No shipped caller passes any of
  them; the only consumer is `/lab/hoopoe`'s Proportion Studio. They cost ~12 lines of geometry
  arithmetic and eight `variant === "icon"` guards in a file on 46 routes. But `docs/spec/mascot.md`
  keeps "Proportions" as a live open follow-up — the owner is still dialling head/eye/beak size in
  that room and the values get baked into the defaults when he picks — so the knobs are the
  unfinished half of an approved decision, not leftovers. Kept. **If** the owner closes that
  follow-up, deleting them is a clean ~25-line win and should be raised then.
- **`land()` and `rest()`, the two thinnest verbs.** `land()` has exactly one caller,
  `src/app/lab/mascot-moments/page.tsx:510`; the api entry `rest` has none (`cancel()` calls the
  internal closure directly at `hoopoe.tsx:1,058-1,061`). Both are documented in `mascot.md`'s controller
  list, both are four lines, and `/lab/mascot-moments` is registered approved design history. Audit
  1 reached the same conclusion about `land()`. Kept.
- **`avatar-swap.ts` as a 39-line single-caller module.** An LLM-bloat signature on its face; it
  exists to close audit C-050/C-131 (two tabs uploading at once orphaning bytes in R2 for ever) and
  the whole file is one decision with one documented reason. Inlining it would save ~5 lines and
  bury a write-path invariant. Kept — same verdict as audit 1, re-checked, unchanged.
- **`hoopoe-warmup.tsx` mounting a real second hoopoe for two frames.** A deliberate, time-boxed
  violation of the one-hoopoe rule, argued in its own banner (`:31-38`): the probe must carry the
  `.hoopoe-mascot` class because that class's CSS is exactly what it exists to warm. The guard is
  only ever read at one-shot trigger moments, never polled, so the collision window is ~32 ms. Kept.
- **`one-hoopoe-guard.ts` being a DOM class query rather than a bus.** Documented in four files: the
  rig bakes the class in (`hoopoe.tsx:1,354`), so the DOM *is* the registry, and the flight bus's
  single-slot design must not gain a second subscriber (`footer-hoopoe.tsx:47-54` explains the steal
  hazard precisely). Kept. (The *waiting* built on top of it is finding 07; the *check* is right.)
- **`plate-data.ts`'s 45-line banner for a 12-name list.** It records why the order is what it is
  (an exhaustive search so no two look-alike birds touch in **either** of the two grid reflows), why
  the list is names and not indices (an earlier index list silently mislabelled a bird for weeks when
  the Roller was reserved), and the twelve real disc colours read off the rendered glyphs. Every
  sentence is a reason a `git blame` could not recover. Kept.
- **`section-reveal.tsx`, `landing-nav.tsx`, `showcase-shot.tsx`, `shots.ts`, `ambient-leaves.tsx`,
  `perching-birds.tsx` surviving knip's unused-file list.** They are not listed because five
  `src/app/lab/landings/_variant-*.tsx` rooms import them. That is lab code depending on shipped
  code — the expected direction — and those rooms are approved design history. They ship 0 bytes to
  any non-lab route.
- **`public/images/landing-original.jpeg` (6.2 MB).** Untracked and explicitly gitignored
  (`.gitignore:37`); audit 1 already settled it as the deliberately-kept local source of the shipped
  498 KB `landing.jpeg`. Not a finding, recorded so nobody measures `du` and files it again.

---

## Audit-1 carry-overs in this territory

- **§4 #1, the landing showcase's fate** — still open, and it is my finding 03. The mechanical half
  (decoupling it from `src/app/page.tsx`) landed; the fate has not been decided. Current cost while
  it waits: 11 files / 2,477 lines / 283 KB tracked images / ~1.6 KB CSS, 0 KB of client JS.
- **§4 #13, a birds sprite** — still open, and it is my finding 01. It now has a measured number
  (44 KB raw / 12 KB gzip on 39 non-lab routes) and a cheaper first step that does not need the
  owner at all.
- **§4 #15, moving `sanan's stuff` out of the repo** — still open (the owner does it himself). It
  now has a dependent: three `apple-edge` scripts read a file inside that folder (my finding 09).
- **§4 #9, retiring two security probes** — not in my territory, but the analogous question here
  (retire the `apple-edge` harness?) is answered NO by `scripts/README.md:90-109`, and I agree.
- **Audit-1 finding 01 (the 595-line legacy mono avatar path)** — LANDED. `bird-avatar.tsx` is 117
  lines; `USE_V2` and the 52-case `Species` switch are gone; `docs/spec/avatars.md:8` was updated to
  say so.
- **Audit-1 finding 02 (the showcase wired into `/`)** — LANDED. `src/app/page.tsx` is 39 lines and
  imports only `LandingHero`; `showcase.tsx` exists and nothing imports it.
- **Audit-1 findings 03/04/05 (the tour)** — the tour is gone from this territory entirely; a peer
  session removed it (referenced in the fix-prompt as "another session worked in this tree
  throughout, removing the hoopoe tour"). No `src/components/tour/` exists.
- **Audit-1 finding 06 (the `speed` plumbing)** — LANDED. No `normalizeFlightSpeed`, no `ms()`, and
  `mascot-flight.ts` is 138 lines carrying only the bus.
- **Audit-1 finding 07 (`bindPassword`, `parallel`, `EASE_POP`)** — LANDED. None of the three exists.
- **Audit-1 finding 08 (dynamic-loading the rig)** — **HALF DONE, and it is my finding 02.** The 404
  boundary was fixed (`not-found.tsx:29` is dynamic, and `useSoloHoopoe` was moved into
  `one-hoopoe-guard.ts` so a seven-line hook stopped dragging the rig behind it — the fix log calls
  this out). `sidebar-hoopoe.tsx:37` and `logo-easter-egg-hoopoe.tsx:36` are still static.
- **Audit-1 finding 09 (mascot.md's bell-delivery paragraph)** — LANDED, and well: the spec now
  carries a "RETIRED" entry that keeps the one still-governing lesson. But the spec has since gone
  stale in four *new* ways — my finding 10.
- **Audit-1 finding 10 (the misfiled sidebar test)** — LANDED. `landing-auth-ui.test.mjs` is gone;
  `src/components/layout/sidebar-support-icon.test.mjs` exists.
- **Audit-1 finding 11 (knip export keywords)** — LANDED for `archeTransform`, `ARCHETYPE_COUNT`,
  `DRAWN_SPECIES_COUNT`, `SPECIES_PINS`, `fnv1a`, `AUTH_PANEL_VW` and `EyeShape` (all now
  non-exported or gone). A new crop has appeared since — my finding 13.

---

## For other lenses

- **bundle lens.** Two chunk ids and their exact contents, both measured: `42nji2hh4aeuo.js` =
  47,415 B raw / 13,610 gzip = `bird-adjust.json` + `src/lib/avatar.ts` + all 51 bird glyphs, on
  **39 of 52 non-lab routes**; `0qa8au6zlhx7_.js` = 28,691 B raw / 7,874 gzip = the hoopoe rig +
  `hoopoe-kit`, on **46 of 52**. The landing's 899 KB decomposes as **621 KB app-wide floor / 245 KB
  partly-shared / 33.4 KB exclusive to `/`** — so the landing is not the problem, the floor is. Two
  items in that floor look worth your attention and are not mine: **base-ui ships 106 KB across
  three chunks (`0jlq6l4f8yx9k.js` 59 KB, `3lg6rokqb517_.js` 25 KB, `42rp5c5ri0wnd.js` 23 KB) onto
  the signed-out landing page, which has no dialog, no select and no popover**; and
  `1454vpw-cvghc.js` (36 KB, sonner + lucide) likewise, for a page whose entire icon usage is
  `ChevronDown` and `ArrowLeft`. Both identified by string fingerprinting the chunks, so confirm
  before acting.
- **shell-primitives.** `src/components/layout/app-shell.tsx:2,64` mounts `KonamiEggs`, and
  `sidebar.tsx:43,44,627-629,652` mounts `SidebarHoopoe` and `LogoEasterEgg`. Those five lines are
  what put 73 KB (rig + glyphs) into every authed route's first load. Findings 01 and 02 propose
  changes to `sidebar.tsx`, `konami-eggs.tsx` and `identity-row.tsx` — coordinate before touching
  the rail. Also: `identity-row.tsx` has no `"use client"` but reaches `bird-avatar-v2` through
  `bird-avatar`, so whether it is a server or client module is decided entirely by its importer.
- **lab agent.** (a) `src/app/lab/_hoopoe.tsx:76` renders `className="hoopoe-mascot …"` — the
  pre-rig lab mascot carries the same class the one-hoopoe guard counts, so it blocks moments on
  `/lab/feed-canvas`. Harmless, but the class is not owned by the shipped rig alone. (b) **The lab
  holds the live source of truth for two shipped things**, which is worth stating: `/lab/hoopoe`'s
  Proportion Studio is the only consumer of five props the shipped rig carries on 46 routes, and
  `/lab/centroid` is the harness `scripts/dev/centroid.mjs` drives to regenerate the shipped
  `bird-adjust.json` — neither is "a finished experiment whose verdict is already shipped", both are
  live tools. (c) `src/app/lab/hoopoe-marks/_parts.tsx:25` re-exports `H` and `G` and nothing
  consumes the re-export. (d) `lab/landings/_variant-editorial.tsx:73-81` still duplicates
  `components/landing/trust-section.tsx:2-10` (jscpd) — lab copying shipped, the expected direction.
- **scripts / e2e lens.** `scripts/dev/shot-clip.mjs` (17 lines) and `shot-svg.mjs` (25) are two
  near-identical puppeteer screenshot harnesses that overlap `scripts/qa/screenshot.mjs`; only
  `shot-clip` has an npm script, and only `shot-svg` honours `PUPPETEER_EXECUTABLE_PATH` (finding
  16). `scripts/qa/hoopoe-idle-check.mjs`, `hoopoe-landing-check.mjs` and `hoopoe-zoom-probe.mjs`
  are in knip's unused list; `mascot-flight-layer.tsx:576-579` documents that `data-mascot-flyer`
  exists **solely** for `hoopoe-landing-check.mjs`, so that one is a kept tool with a shipped hook —
  the zoom probe reads like a one-session repro of the Safari transform-origin bug now fixed and
  documented in `RIG_CSS`.
- **docs lens.** `docs/spec/mascot.md` is my finding 10. `docs/spec/avatars.md:350,356` contains the
  only written argument against a bird sprite ("no sprite fetch… it tree-shakes", "~8-9 KB source"),
  written for a 12-species design and untrue of today's 51 — it is below the "everything below this
  line is superseded" divider, but a fix session working on owner decision #13 will find it and
  should not be misled. One sentence in the banner would settle it.
- **fresh-code lens.** Five files in my territory are new since audit 1 and have never been audited
  before today: `src/lib/edge-light.ts`, `src/lib/hoopoe-geometry.ts`,
  `src/lib/app-icon-safe-zone.test.mjs`, `scripts/dev/build-app-icon.mjs`,
  `src/components/mascot/moments/contributed-hoopoe.tsx`. Plus `use-flight-arrival.ts` and
  `perch-report.test.mjs`, which post-date audit 1's read. I read all seven in full; the only
  findings against them are 08 (location) and 09 (the `sanan's stuff` path). The icon work in
  particular is unusually well built — two-stage, seam-asserted at both ends, and pinned by a test
  that decodes the shipped PNG and counts eye pixels inside Android's mask radius.
- **catchups lens.** `your-catchups-card.tsx:76,100` are the two shipped call sites of the
  non-functioning `ring` prop (my finding 06); the visual symptom is on `/catchups`.

---

## Metrics

- **Territory size**: 63 source files, ~11,713 lines — landing 2,972 (13 files); mascot 4,620
  (22 files); avatar system 2,213 (3 files incl. the 257-line JSON); support bird surfaces 455
  (3 files); lib + tests 1,093 (7 files); scripts 617 (10 files); routes 218 (5 files). Plus 19
  tracked image assets (~880 KB: landing screenshots 283 KB, app icons 152 KB, brand marks 15 KB,
  `landing.jpeg` 498 KB, email mark 1.5 KB).
- **Read**: ~10,300 lines in full, ~1,400 partially (listed under Coverage), plus 691 lines of spec
  and audit-1's 524-line report on this same territory.
- **Biggest files**: `bird-avatar-v2.tsx` 1,839; `hoopoe.tsx` 1,512; `ambient-leaves.tsx` 676 (off);
  `perching-birds.tsx` 664 (off); `mascot-flight-layer.tsx` 595; `landing-hero.tsx` 469;
  `hoopoe-playground.tsx` 411; `src/lib/hoopoe-geometry.ts` 361; `use-flight-arrival.ts` 350;
  `footer-hoopoe.tsx` 317 (off).
- **Comment-heaviest in territory** (all verified justified, see Not-findings): `src/lib/avatar.ts`
  1.73 (95c/55l); `use-flight-arrival.ts` 1.22 (184c/151l); folder ratios — `components/mascot`
  0.54 (1,506c/2,793l), `components/landing` 0.35 (722c/2,076l).
- **Client-bundle facts, measured off `.scratch/audit2-build`**: bird glyphs 44,428 B raw /
  12,182 gzip on 39/52 non-lab routes; hoopoe rig 28,691 B raw / 7,874 gzip on 46/52; combined,
  **73 KB raw / 20 KB gzip on every `(main)` route**. Landing first-load 899 KB across 24 chunks
  (621 shared floor / 245 partly shared / 33.4 exclusive). `/birds` 1,064 KB, `/pick-bird` 1,069 KB,
  `/hoopoe` 754 KB (lowest non-lab route in the top-75).
- **CSS**: 28 rules / 1.6 KB of the 232.8 KB stylesheet exist only because of the switched-off
  showcase and are used by no lab room; a further 39 rules / 1.7 KB are shared with the lab.
- **Clones** (jscpd, within territory): 1 real 13-line intra-file clone in `hoopoe.tsx` (finding 15);
  4 lab-copies-shipped; 3 sub-10-line hits below any sensible threshold.
- **Dead / placeholder totals**: ~16 lines of outright dead or never-read code (findings 04, 05, 13)
  + ~8 lines of a prop that cannot work (06) + ~40 lines of intentionally-dormant `BG_MODE` branches
  (kept) + 828 lines referenced by nothing at all in the switched-off showcase (owner's call) +
  1,649 more reachable only from lab rooms.
- **Structural vs cheap**: 9 structural findings (01, 02, 03, 04, 05, 06, 07, 08, 15) and 7 cheap
  (09, 10, 11, 12, 13, 14, 16). 3 owner decisions. 13 not-findings recorded so audit 3 skips them.
