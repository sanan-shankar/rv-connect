> **Delight idea bank.** Motion RULES are canonical in `docs/spec/DESIGN-SYSTEM.md` sec 7. This doc is
> the idea library: ~112 raw ideas, plus the owner's build/cut/defer verdicts (merged in at the bottom,
> from the 2026-06-30 `/preview/delight` walkthrough). Check the verdicts section before pulling an idea
> from here; some are already shipped or rejected. This is a catalog, not a status tracker.

# Delight Plan — Rishi Valley Alumni

The valley should feel alive without ever performing. This plan turns the snap points and empty
beats of the app into calm, warm, slightly springy motion, and threads one resident hoopoe through
the whole product so it reads as a place, not a template.

## Philosophy

Two buckets, one feel.

- **Common.** Polish the state changes that currently snap: route changes, nav active state,
  composer expand, focus rings, like and bookmark, toggles, list add and remove, loading. These run
  on every visit, so they must be tiny, fast, and forgettable. The motion is the absence of jank,
  not a flourish.
- **Signature.** A few things competitors would never build: a hoopoe mascot that follows you from
  login into empty states and loading, a landing hero that is "the definition of life" with leaves
  that part around the cursor and birds that hop between the screenshots, cute loading states, and
  tasteful easter eggs that hide themselves.

The **ages-well test:** would this still feel good on the 100th use? If a thing fires on every
click or loops forever, it must be sub-threshold (tiny travel, slow, no color flash). If a thing is
richer, it must be **rare or one-time** (first run, first session, success commits, late at night).
Frequent equals quiet; rich equals rare.

House feel: **calm, warm, physical, slightly springy**, like the hoopoe wings. We animate only
`transform` and `opacity` (plus the allowed `background-color` / `border-color` at 120ms and
`box-shadow`); color never transitions, so the heart snaps red on frame one. Spring easing
everywhere: `cubic-bezier(.34,1.5,.64,1)` and `cubic-bezier(.34,1.56,.64,1)`. We avoid the AI
cliches: no ripple page transitions, no neon glow, no confetti spam. No em dashes anywhere. Large
ambient motion respects `prefers-reduced-motion`; the micro-delights (hoopoe wings, like-pop, bell)
are deliberately kept on per the owner.

Everything reuses the `/preview/v2` tokens (`--primary:#1F6F57`, `--blue:#3F7CA6`,
`--cinnamon:#C26B39`, `--heart:#DD5043`, `--surface:#F6F2E8`, `--bg:#E7E1D3`, `--r-card:18px`,
Libre Baskerville + Source Sans). Nothing here touches core app files until it has been proven in
the self-contained `/preview/delight` page.

## Build first (the ~14)

Chosen to maximize wow x ages-well at reasonable effort, spread across every category, and to stand
up the shared foundation first.

| # | Idea | Where | Interaction | Technique | Effort |
|---|------|-------|-------------|-----------|--------|
| 1 | **Motion token file** | `src/lib/motion.ts` + delight index swatch | Everything that moves shares one feel | Export `SPRINGS` (gentle/snappy/settle) + CSS vars `--ease-spring`, `--ease-pop`, `--dur-*`, byte-identical to v2 values | S |
| 2 | **Hoopoe sprite component** | new `hoopoe-mascot.tsx`, demoed everywhere | One bird, swappable poses (covered, peek, idle, curious, happy, sleepy, point) | One inline SVG, pose = transform/opacity state on named groups; idle blink + tilt built in; reduced-motion guards ambient only | M |
| 3 | **Sliding sidebar marker** | green sidebar nav | Active pill glides between rows with a cinnamon left edge instead of blinking | `motion` `layoutId="navPill"`, spring 520/42; text color snaps | S |
| 4 | **Sliding seg / tab thumb** | v2 Seg controls, signup account-type, profile tabs | The on-pill and the underline slide between options | shared `layoutId` thumb + underline, spring 540/38 | S |
| 5 | **Composer unfurl** | feed composer pill to card | Avatar pinned, height springs open, toolbar/tags/footer stagger in, posts ease down | one container (no DOM swap), motion height-auto + radius morph, `staggerChildren .04` | M |
| 6 | **Route content cross-rise** | `(main)/template.tsx` | Sidebar and valley hold still; only content fades + rises 8px | `AnimatePresence` keyed on pathname, `SPRINGS.gentle`, bg outside the keyed node | M |
| 7 | **Heart pop + leaf flecks + odometer count** | PostCard like, v2 `.act.like` | Snap red, pop to 1.35, 2 to 3 leaf flecks drift up, count rolls one digit | keep existing pop; 3 tiny Leaf SVGs (leaf/cinnamon, not heart-red) opacity+translate 600ms; digit in overflow-hidden span | M |
| 8 | **Bookmark ribbon tuck** | PostCard bookmark | Cinnamon sweep then the V notch tucks in and releases | custom bookmark SVG with notch as own element, spring on notch over the existing scaleY sweep | M |
| 9 | **Soft focus ring bloom** | all inputs + composer textarea/letter-title (no ring today) | Green halo blooms in over 140ms, eases out on blur | transition `box-shadow` spread + opacity, never color; add ring where missing | S |
| 10 | **Warm skeleton shimmer** | shared `Skeleton` (feed/dir/profile loading) | Warm bone bar with a slow diagonal sheen, not gray pulse | `background-position` keyframe over surface-2; reduced-motion drops the sweep | S |
| 11 | **Hoopoe hops the skeleton rows** | feed loading | Mono hoopoe perches on each skeleton avatar disc, hops down, lands and fades when posts arrive | sprite at ~22px, motion spring between disc y-offsets, reduced-motion sits still | M |
| 12 | **First-run feed hoopoe** | post-feed empty state | Calm hoopoe on the ruled line, one warm line, hover crest-flick | sprite `pose="idle"`, hover crest-flick + blink, nudge toward composer | M |
| 13 | **Canvas leaf-fall, cursor parts the leaves** | landing hero | Leaves drift down, part softly around the pointer, resettle | hand-rolled canvas2D + rAF, capped 28 to 36, **lerped** pointer (never raw), inverse-square falloff, visibility + reduced-motion off-switch | L |
| 14 | **Hopping bird tours the screenshots** | landing FeatureSections | Bird lands on a shot, hops, flits off in scroll direction, perches on the next | extend `HoppingBird`, IO-gated, land + 1 to 2 hops + launch, reduced-motion static | M |

Sequence: ship **1, 2, 9, 10** (foundation) first, then the rest can land independently.

## Full catalog

Deduped and merged from 112 raw ideas. Wow is 1 to 5.

### Foundation (the modular core)

| Name | Where | Interaction | Technique | Effort | Wow |
|------|-------|-------------|-----------|--------|-----|
| Motion token file | `src/lib/motion.ts`, delight index | One feel for everything | `SPRINGS` + CSS `--ease-spring`/`--ease-pop`/`--dur-*`, identical to v2 | S | 2 |
| FadeRise / AmbientLayer / SpringPress kit | `src/components/motion/` | `<FadeRise>` enter, `<AmbientLayer>` scroll-drift, `<SpringPress>` press | motion components reading SPRINGS; `useValleyMotion()` centralizes reduced + tab-visible | M | 2 |
| Reduced-motion contract | globals.css + delight `<style>` + hook | Static design + kept micro-delights; large ambient frozen | two tiers; scope reset to `.ambient`/`.parallax`/`.drift`, never blanket `*{animation:none}` | S | 2 |
| Tab-visibility / in-view governor | parallax, drift, choreography | Ambient pauses off-screen and on hidden tab | IO toggling `paused` + `visibilitychange`, via `useValleyMotion()` | S | 1 |

### Navigation and transitions

| Name | Where | Interaction | Technique | Effort | Wow |
|------|-------|-------------|-----------|--------|-----|
| Sliding sidebar marker | green sidebar nav (`sidebar.tsx`) | Pill glides between rows, cinnamon left edge tracks travel | `layoutId="navPill"`, spring 520/42, color snaps; mobile capsule slides horizontally | S | 4 |
| Sliding seg thumb | v2 Seg, signup account-type, layout toggle | On-pill slides between options, labels crossfade | `layoutId="segThumb"`, spring 540/38, shadow kept | S | 3 |
| Sliding profile-tab underline | profile tabs `.on::after` | Underline slides + stretches between Posts/About/Photos | `layoutId="tabUnderline"`, spring 500/30, content crossfade 140ms | S | 3 |
| Route content cross-rise | `(main)/template.tsx` | Content fades + rises 8px; shell and valley persist | `AnimatePresence` keyed on pathname, `SPRINGS.gentle`, bg outside keyed node | M | 3 |
| Direction-aware back/forward | shell routes | Forward enters from right, Back reverses it | nav-direction ref from popstate vs Link; feed sign into x variant | M | 3 |
| Valley wash breathes between pages | fixed back-layer | Imperceptible opacity dip .11 to .09 and back on nav | one-shot opacity keyframe, no transform, reduced-motion off | S | 2 |
| Faint banyan back-layer parallax | `.v2-bg` / AppShell bg | Photo drifts at ~7% of scroll, max ~18px | `useScroll`+`useTransform` y, ShowcaseShot rAF-arm trick, reduced-motion static | M | 4 |
| Landing to login lateral pass | hero Sign in to `/login` | Hero text slides left, login card slides in on the same photo, logo held | View Transitions shared element (PeaksMark + bg `view-transition-name`); prototype as state in delight | L | 5 |
| Open profile as rising shared avatar | post author to `/profile/[id]` | Tapped bird disc travels up and grows to the cover avatar | per-id `view-transition-name`; preview path = `layoutId` on the shared avatar | L | 5 |
| Letters open like a turned page | feed/list into a Letter | Top edge tips in ~4deg and settles, Baskerville title a beat later | motion `rotateX:4`/perspective, title child delay, scoped to Letter routes only | M | 4 |
| Page-load choreography | first paint shell | Sidebar settles, then composer/posts/rail stagger up once | `<Stagger>` variants, cap first ~6 children, hard-load only | M | 3 |
| Route crossfade-rise (client nav) | `template.tsx` | Single per-nav crossfade, distinct from one-time load stagger | shared `FadeRise` variant, no heavy re-stagger | M | 3 |

### Hoopoe and birds (signature character)

| Name | Where | Interaction | Technique | Effort | Wow |
|------|-------|-------------|-----------|--------|-----|
| Hoopoe sprite component | new `hoopoe-mascot.tsx` | One bird, pose prop drives all uses | one SVG, pose = transform/opacity on named groups, idle blink/tilt built in | M | 4 |
| Password eyes (keep, fold into sprite) | login | Wings cover eyes hidden, peek when shown, intro blink | existing behavior sourced from `<HoopoeMascot pose=...>` | S | 5 |
| Idle blink + head-tilt micro-loop | any resting hoopoe | Blinks every 5 to 7s, rare small tilt | self-contained idle controller, paused on hidden/reduced | S | 3 |
| Crest-flick greeting on hover/click | any clickable hoopoe | Crest raises, head turns to cursor, click gives a bob | mouseenter spring on crest + head, click one-shot bob | S | 3 |
| Replace trivia owl with hoopoe (gaze) | `trivia-gate.tsx` | Hoopoe leans toward the answer field as you type | swap `BlinkingOwl`; map answer length to head rotate + crest, `useSpring` | M | 4 |
| Trivia right/wrong reactions | trivia success/error | Wrong = head-shake + droop; correct = wing-flap + nod, then advance | mood/pose states, reuse 500ms shake, `setTimeout(450)` success beat | M | 4 |
| Crest-flick handoff between auth steps | signup trivia to register | Card height eases, body crossfades, hoopoe nods | `AnimatePresence mode=wait` + height spring | M | 3 |
| Hoopoe peek on successful login | login submit | Happy peek + nod on success, startled flutter + shake on error | keyed wing pulses ~400ms then navigate; reuse shake | S | 4 |
| Post-signup onboarding tour | first feed visit | Hoopoe hops sidebar to composer to search with short notes | fixed overlay, `animate` x/y spring + hop arc on real anchors, `hasSeenTour` flag | L | 5 |
| Empty-feed hoopoe | post-feed empty | Idle bird beside the line, hover crest-flick | `pose="idle"`, search-empty uses `pose="searching"` | S | 3 |
| Empty search: peeking under a leaf | search-empty | Bird noses under a tilted leaf, Clear button | leaf settle on mount, `mood="searching"` | M | 3 |
| Empty Letters / all-groups-joined | letters/groups empty | Letters = peck a quill; all-joined = content nod | pose data + optional feather slot | S | 3 |
| Empty directory / region | alumni-map drill, filtered grid | Bird perched on the peaks mark, one head-turn | compose PeaksMark + glyph, one-shot turn | M | 3 |
| Success wing-flap "done" beat | post publish, RSVP, report | Brief celebratory flap + nod near the action, then fades | portal sprite `pose="happy"`, ~600ms, not on like/bookmark | M | 4 |
| Hoopoe as global loading state | route loading.tsx, async fetch | Bird looks around / hops in place over "one moment" | loop headtilt + in-place hop, reduced-motion static | M | 4 |
| Hoopoe hops the skeleton rows | feed loading | Perches and hops down the skeleton avatar discs | sprite ~22px, spring between disc y-offsets | M | 4 |
| Leaves settle into place (load handoff) | post-feed loading to loaded | 2 to 3 leaves drift onto the first card and fade | reuse Leaf SVGs, `AnimatePresence`, max 3, never loop | M | 3 |
| Macaque box-hopper | directory / collection grid loading | Bonnet macaque leaps between grid tiles | hand-drawn flat SVG, parabolic spring leaps, grids only (off the feed) | L | 5 |
| Hopping bird tours screenshots | landing FeatureSections | Bird hops a shot then flits to the next | extend `HoppingBird`, IO-gated land/hop/launch | M | 4 |
| Bird forages on the ground line | last landing section | Hops to a rule and pecks, then still | reuse hopper, descend + peck sequence, one-shot | S | 4 |
| Drifting leaves as section dividers | between landing sections | 1 to 2 leaves drift through gaps, per-accent tint | generalize `DriftingLeaves` with count prop | S | 3 |
| Landed leaf you can flick (easter egg) | hero | A resting leaf ejects if you flick it | rest state in canvas, lerped-pointer collision, one at a time | M | 4 |
| Hopping bird scroll-to-top | feed / letters | Ground bird appears after 2 screens, hops up while page scrolls | fixed button reusing hopper, smooth scroll synced, rare idle bob | M | 4 |
| Profile-complete nod | profile / edit | Your avatar nods, peaks draw on, one warm line, once ever | latch flag, head rotate spring + peaks shimmer | M | 4 |

### Feedback (likes, saves, votes, RSVP, comments, share, toasts, bell)

| Name | Where | Interaction | Technique | Effort | Wow |
|------|-------|-------------|-----------|--------|-----|
| Heart pop + leaf flecks | PostCard like, v2 `.act.like` | Snap red, pop, 2 to 3 leaf flecks drift up | keep pop; 3 tiny leaf SVGs (leaf/cinnamon), reduced-motion drops flecks not pop | M | 4 |
| Like count odometer | like count span | Digit rolls up by one, down on unlike | overflow-hidden span, stacked digits, translateY 180ms | S | 3 |
| Bookmark ribbon tuck | PostCard bookmark | Cinnamon sweep then notch tucks and releases | custom SVG notch element, spring over existing scaleY sweep | M | 4 |
| RSVP confirm morph | rail event RSVP | Label crossfades to Going, check draws, soft cinnamon to filled green | two-state button, stroke draw, one leaf fleck | M | 4 |
| Poll vote bars grow + leaf-check | poll-display | Bars sweep from 0, percentages count up, your choice gets a check | scaleX bars staggered, rAF count, shared leaf-check | M | 4 |
| Notification dot pop + one ring | bell + cinnamon dot | Arrival pops the dot in and rocks the bell once | trigger bell keyframe on unread true, dot scale spring | S | 3 |
| Fundraiser bar fills on first sight | `.v2-fund .bar > i` | Fills 0 to value on scroll-in, figure counts up | IO arm once, scaleX from left, rAF count, disconnect | M | 3 |
| Share icon nudge then check | PostCard share | Icon nudges and swaps to a check ~900ms with the toast | transient copied state, AnimatePresence crossfade | S | 3 |
| Comment like small bump | comment like | Lighter pop than the post heart, count fades 0 to 1 | low-amplitude scale, heart pinned red | S | 2 |
| Comments region open | PostCard comment toggle | Height grows + fade, ChatCircle bounces once | motion height auto + opacity, bell-style icon rock | M | 2 |
| New comment glides in | comments list | New comment fades + rises, neighbors reflow | `useAutoAnimate` tuned config, stable keys | S | 3 |
| Comments loading to list | comments-section loading | 2 warm skeleton rows cross-settle into comments | warm Skeleton rows + new-item scale settle | S | 2 |
| Image preview add/remove settle | composer previews | Thumbs ease in, removed one collapses, neighbors close gap | `useAutoAnimate` / AnimatePresence, scale .9 to 1 | S | 2 |
| Composer image upload feather | composer upload | Warm shimmer + cinnamon fill line, feather rises, image fades in | overlay shimmer, scaleX progress, crossfade img | M | 2 |
| Tag chip pop on select | composer tags | Chip pops to 1.08 as fill comes on (removes `transition-all`) | motion whileTap + selected keyframe, fixes hard-rule violation | S | 2 |
| Soft focus ring bloom | all inputs + composer | Green halo blooms over 140ms, eases out | box-shadow spread + opacity, add ring where missing | S | 2 |
| Eye/EyeOff crossfade | login password toggle | Glyphs crossfade and counter-rotate ~30deg | `AnimatePresence` opacity + rotate | S | 2 |
| Button press depth | all `.v2-btn`, chips, icons | Dip to .97, spring back through ~1.01 | `whileTap` + spring release, apply to all clickables | S | 2 |
| Search bar breathing | feed toolbar search | Eases ~8% wider on focus, placeholder fades | bounded width or padding+inner translate, no neighbor reflow | M | 2 |
| Avatar settle-in on arrival | feed/rail/directory avatars | Disc scales .92 to 1 a beat after the row | `SPRINGS.snappy`, delayed in stagger, no disc color move | S | 3 |
| Avatar beak-chirp | any bird avatar | Click opens beak, head tilts, crest flicks, faint chirp arcs | beak/crest groups with own origins, chirp keyframe, rate-limited 900ms | M | 4 |
| Warm toast slide-in (Sonner) | app-wide toasts | Warm-paper surface, layered shadow, soft spring in/out | Sonner classNames to v2 tokens, leaf for success, heart-red reserved | S | 3 |
| Menus ease open from anchor | dropdowns, select, sheet | Scale + fade from the trigger corner, gentle spring | tune existing base-ui data-state classes, set origin per side | S | 2 |

### Loading

| Name | Where | Interaction | Technique | Effort | Wow |
|------|-------|-------------|-----------|--------|-----|
| Warm valley shimmer | shared `Skeleton` | Warm bar with slow diagonal sheen | `background-position` keyframe, reduced-motion static | S | 2 |
| Skeleton avatar discs carry brand hues | all skeleton discs | Low-sat brand tints, slow tiny hue drift | AVATAR_PALETTE at ~12%, capped hue-rotate, deterministic | S | 2 |
| Ruled-sheet skeleton lines draw in | feed loading | Lines wipe in left to right, staggered | scaleX from left, per-line delay, then shimmer | S | 3 |
| Skeleton-to-card cross-settle | loading to loaded | Skeleton fades as card rises 6px | `AnimatePresence mode=popLayout`, stagger first 3 only | M | 3 |
| Notification panel loading | bell panel | Warm skeleton rows; empty = quiet bird on a branch | shared Skeleton rows + static glyph | S | 2 |
| Letters first-run feather | letters empty | Quill draws an underline, feather wobbles | scaleX underline + ink dot, one-shot rotate | S | 3 |
| Profile load cover wash + avatar settle | profile loading | Warm cover wash, avatar springs into overlap | warm gradient + faint valley, avatar y/scale settle | M | 2 |

### Easter eggs and ambient

| Name | Where | Interaction | Technique | Effort | Wow |
|------|-------|-------------|-----------|--------|-----|
| Canvas leaf-fall, cursor parts leaves | landing hero | Leaves part softly around the pointer, resettle | canvas2D + rAF, lerped pointer, capped count, off-switch | L | 5 |
| Scroll speed becomes a breeze | hero leaf canvas | Fast scroll leans the leaves, settles back | smoothed scroll velocity into vx + tilt, clamped | M | 5 |
| Parallax valley ridge layers | hero background | Three Konda ridges drift at different rates | PeaksMark layers + `useScroll`, ShowcaseShot recipe | M | 4 |
| Sunlight shafts and dust motes | hero | Faint shafts breathe, a dozen motes drift | gradient divs + few canvas motes, very low contrast | M | 4 |
| Sectional accent-tinted shot reveals | landing shots | Shots rise and fade from accent tint as they enter | `whileInView once`, accent overlay to 0, keeps parallax | S | 3 |
| Hero wash breathes with pointer | hero readability wash | Wash eases in on hover, eases out on leave (fixes latch) | add `onMouseLeave`, keep touch latch, 700ms color | S | 3 |
| Spring scroll-cue nudge | hero chevron | Slow spring nudge with long idle gap, eager on hover | replace `animate-bounce` with spring keyframe + repeatDelay | S | 2 |
| LandingNav CTA one-time pulse | sticky nav | CTA pulses once when the bar first arrives | one-shot scale keyframe latched by ref | S | 2 |
| ShowcaseShot lift + search caret | landing shots | Card lifts, parallax deepens, fake caret blinks | hover y/scale + warm shadow, caret on hover only | S | 3 |
| Headline settles in | hero headline | Headline, subhead, CTAs stagger up on load | motion stagger, reduced-motion final state, watch LCP | S | 3 |
| Reduced-motion poster fallback | all hero layers | Full composed hero, a few frozen leaves, no loops | centralized reduceMotion, paint one static frame | S | 2 |
| Three-peaks draw-on shimmer | brand lockup hover | Sunrise band sweeps the ridge once on hover | clipPath/gradient sweep or stroke-dashoffset, hover-latch | M | 4 |
| Peaks logo one-time draw-on | sidebar + login mark | Ridge sketches itself in once per session | `stroke-dashoffset` to 0 then fill, `sessionStorage` gate | M | 4 |
| Idle breathing on peaks + crest flick | sidebar brand | Mark breathes ~1.012 after long idle, rare crest flick | idle timer, single transform keyframe, hard-gated | M | 4 |
| Theme valley sun-sweep | v2 theme toggle (preview) | Circular dusk reveal from the toggle, bg .09 to .05 | View Transitions circular clip + bg opacity flip | M | 4 |
| Sun-to-moon morph | theme toggle (preview) | Sun rays retract, crescent bites the disc, dusk bg | masked SVG morph + bg opacity | M | 3 |
| Theme crossfade sweep | theme toggle (preview) | Bg brightens then settles dim, surfaces crossfade, thumb slides | bg opacity keyframe + seg `layoutId` thumb | M | 3 |
| Good-evening valley tint | shell bg + sidebar | Bg warmth shifts by local hour, amber after 6pm | hour bucket sets `--tod-tint`, one allowed bg-color transition | S | 3 |
| Dawn-chorus daily greeting | feed header | First load of the day keys the greeting in word by word | `localStorage` date gate, word stagger + hoopoe blink | S | 3 |
| Rishi Konda landmark tooltip | location chip, landmark posts | Hover shows a warm valley fact / sunrise time | small fade-up tooltip, static fact table | S | 3 |
| Sleepy night hoopoe | login + corner bird | Late at night the bird droops and yawns sometimes | hour check biases idle to sleepy variant, no z's | S | 4 |
| Hoopoe corner peek | feed, rarely | Hoopoe peeks from a corner, blinks, ducks out | rarity + localStorage cooldown, retract on cursor approach, reduced-motion off | M | 5 |
| Konami valley-bird flush | authenticated shell | Secret sequence flies 2 to 3 birds across once | keydown buffer ignoring inputs, bezier hop path | M | 4 |
| Bell roost (long-hover) | bell | Resting 1.5s on the bell perches a bird briefly | dwell timer, settle bounce, leaves on mouseleave | M | 3 |
| Heart-streak feather (rare) | like | Rarely a single feather drifts up instead of nothing | probability/milestone branch, one feather, reduced-motion off | S | 4 |
| Long-idle hoopoe doze | sidebar bird | After 90s idle the bird dozes, wakes on activity | idle timer, eye opacity + head dip, wake overshoot | M | 3 |
| Muted-by-default sound | opt-in toggle | Soft hoopoe oop / paper rustle on key events | WebAudio, off by default, throttled, separate consent | L | 4 |
| Mobile haptics on anchors | like/bookmark/RSVP/bell | Light tap on intentional taps | `navigator.vibrate` guarded, paired with visual pop | S | 3 |

## Shared motion foundation

Build this before anything else so every effect speaks one language.

**Token set (`src/lib/motion.ts`).** One source for both motion and CSS:

```
SPRINGS = {
  gentle: { type:'spring', stiffness:210, damping:24, mass:0.9 }, // enters, route changes
  snappy: { type:'spring', stiffness:420, damping:30 },           // pills, presses, avatars
  settle: { type:'spring', stiffness:160, damping:22 },           // ambient, breathing
}
CSS: --ease-spring: cubic-bezier(.34,1.5,.64,1);   // hoopoe wings
     --ease-pop:    cubic-bezier(.34,1.56,.64,1);   // like-pop
     --dur-fast:120ms; --dur-soft:300ms; --dur-amb:1200ms;
```

The two cubic-beziers are byte-identical to the v2 values, so nothing already shipped shifts.

**Reusable motion components (`src/components/motion/`).**
- `FadeRise({delay})` — the `settle` enter (opacity 0 to 1, y 10 to 0). Used by route transitions,
  load choreography, empty states.
- `AmbientLayer({factor=0.07})` — scroll-linked y drift, reduced-motion safe. Used by the bg
  parallax and ridge layers.
- `SpringPress` — `whileTap={{scale:0.97}}` matching the existing CSS so motion and non-motion
  presses feel identical.
- Shared `layoutId` thumbs: `navPill`, `segThumb`, `tabUnderline` are one small primitive reused
  three places, so sidebar, segmented controls, and profile tabs are visibly one system.
- `useValleyMotion()` — returns `{reduced, paused}`, combining `useReducedMotion()` with a
  `visibilitychange` + IntersectionObserver pause. Every ambient effect reads it.

**prefers-reduced-motion strategy (two tiers).**
- **Tier 1, large ambient** (parallax, leaf canvas, draw-ons, choreography, corner peek, route
  travel): hard-guarded. CSS reset is **scoped to marker classes** `.ambient`, `.parallax`,
  `.drift` and JS checks `useValleyMotion().reduced`. Never the nuclear
  `*{animation-duration:0.01ms !important}` reset, which would kill the brand micro-delights.
- **Tier 2, micro** (hoopoe wings, like-pop, bell, beak-chirp, focus ring): deliberately left on
  per the owner. New code documents which tier it belongs to in a comment.
- Add the missing global `@media (prefers-reduced-motion: reduce)` backstop to `globals.css` and a
  matching guard inside the delight `<style>` block (the v2 block has none today).
- Everything pauses on `document.hidden` for battery, via the same hook.

## /preview/delight showcase build-spec

A self-contained set of public client routes mirroring the `/preview/v2` pattern: one client
component per route, all styles in an inline `<style>` namespaced under `.delight`, tokens redefined
locally (do not read globals.css), `.delight.dark` overrides colors only. Each route is clickable so
the owner can react. The index links the rest.

### `/preview/delight` (index)
Hero strip naming the philosophy and the two buckets, plus the **foundation swatch row**: three demo
tiles (a card, a pill, the heart) that press in unison so the single spring feel is visible. A
"parts bin" section renders `FadeRise`, `AmbientLayer`, `SpringPress`, and the reduced-motion toggle
live. Links out to each sub-route below.

- foundation spring swatch row (card + pill + heart, one press)
- parts bin: FadeRise / AmbientLayer / SpringPress
- reduced-motion live toggle (shows tier 1 freezing, tier 2 still playing)

### `/preview/delight/transitions`
A two-pane mock shell (sidebar + content) so transitions run without real routing.

- sliding sidebar marker with cinnamon edge
- sliding seg thumb and sliding profile-tab underline
- content cross-rise on view change, direction-aware
- valley wash breathe + faint bg parallax
- page-load choreography (replay button)
- Letters turned-page entrance vs the plain feed entrance, side by side
- faked landing-to-login lateral pass with the held logo

### `/preview/delight/hoopoe`
The mascot lab. Renders `<HoopoeMascot>` at large size with a pose picker.

- pose grid: covered, peek, idle, blink, curious, happy, sleepy, point-left/down
- password-field demo (cover/peek, intro blink)
- trivia gaze-follow + right/wrong reactions
- idle blink + head-tilt loop, hover crest-flick, click bob
- success wing-flap beat, login peek-on-success
- sleepy night variant (with an hour override control)

### `/preview/delight/landing`
The living valley. A hero-sized canvas surface plus the screenshot strip.

- canvas leaf-fall, cursor parts the leaves
- scroll-speed breeze (a scrollable inner panel)
- parallax ridge layers from PeaksMark
- sunlight shafts and dust motes
- hopping bird touring the shots, then foraging on the ground line
- drifting leaves as section dividers
- hero wash breathes with pointer, spring scroll cue, headline settle
- landed-leaf flick easter egg

### `/preview/delight/loading`
A grid of loading surfaces side by side.

- warm valley shimmer skeleton (vs the old gray pulse for contrast)
- brand-hue avatar discs, ruled-sheet lines draw in
- hoopoe hops the skeleton rows
- macaque box-hopper over a mock grid
- leaves settle on the load-to-content handoff
- hoopoe global loading loop, Letters first-run feather
- skeleton-to-card cross-settle

### `/preview/delight/feedback`
A mock post card, comment thread, poll, RSVP button, bell, and toaster.

- heart pop + leaf flecks + odometer count
- bookmark ribbon tuck, RSVP confirm morph, poll vote bars + leaf-check
- notification dot pop + one ring, fundraiser bar fill on first sight
- share icon nudge to check, comment-like bump, comments region open
- composer unfurl with staggered toolbar, tag chip pop, image preview settle
- soft focus ring bloom, button press depth
- warm Sonner toast (fire buttons), avatar settle-in, avatar beak-chirp

### `/preview/delight/eggs`
The hidden and ambient layer, surfaced here so the owner can see what is normally invisible.

- good-evening valley tint (hour override), dawn-chorus greeting
- Rishi Konda landmark tooltip
- hoopoe corner peek (force-trigger button), bell roost, heart-streak feather
- long-idle hoopoe doze (short idle override), idle peaks breathing
- Konami valley-bird flush (with the sequence printed)
- theme sun-sweep / sun-to-moon morph / crossfade (dark lives here only)
- muted-by-default sound toggle + mobile haptics demo

## Build status (live, 2026-06-27)

All seven routes are BUILT and compiling, light and dark, with a reduced-motion toggle in the top bar.
Self-contained under `src/app/preview/delight/`; no core app files touched. Verified by screenshot.

- `_kit.tsx` — SPRINGS (gentle/snappy/settle); BASE_CSS (v2 tokens namespaced under `.delight`, plus
  `--ease-spring`/`--ease-pop`/`--dur-*`); FadeRise, Stagger, SpringPress, AmbientLayer, Seg (sliding
  `layoutId` thumb); useValleyMotion (reduced + tab-paused); DelightShell + DemoCard/DemoGrid; re-exports
  PeaksMark + BirdAvatar. Two-tier reduced-motion contract (`.ambient/.parallax/.drift` freeze; micro stays).
- `_hoopoe.tsx` — HoopoeMascot, poses idle/peek/covered/curious/happy/sleepy/point/searching, idle blink,
  `gaze`. GOTCHA: every animated SVG part needs `transform-box: view-box` (Framer defaults to fill-box,
  which breaks userspace transform origins). Login semantics: eyes OPEN while hidden, COVER when revealed.
- Routes: `/preview/delight` (index + foundation), `/hoopoe`, `/landing` (canvas leaf-fall the cursor
  parts + parallax ridges + hopping bird), `/transitions`, `/loading`, `/feedback`, `/eggs`.

Next, once favourites are chosen: promote winners into real components (PostCard like/bookmark, sidebar
marker, route template, login, skeletons) and the landing page, lifting the kit into `src/lib/motion.ts`
+ `src/components/motion/`. Tiny polish: the feedback fundraiser demo uses `$`; switch to `₹`.

---

## Salvaged detailed specs (from the retired docs/spec/delight.md, 2026-07-02)

These two specs were the only non-duplicated content in the old `delight.md` inventory (now deleted). Kept verbatim so no detail is lost. Note: the avatar spec below predates the shipped avatar system, so it references `common/user-avatar.tsx` (now `BirdAvatar` / `bird-avatar.tsx`) and `BirdGlyph` (now shipped as the 50-species engine). Read it for the interaction intent, not the file names.

### 1c. Consolidation decision (cut the owl, or keep it?)
There are now two hand-built birds on auth: `BlinkingOwl` (trivia gate) and `Hoopoe`. Recommendation: **retire `BlinkingOwl` and let the hoopoe carry the trivia gate too**, peeking instead of blinking-idle, so the signup flow has one consistent mascot rather than two competing birds. Rationale: two different birds on adjacent auth screens reads as inconsistent, not charming. If the owl has sentimental value, the fallback is to keep it but move it off auth entirely (e.g. the 404 page) so the two never appear in the same flow. Either way, do not ship both on signup.

## 2. Avatar easter egg — the bird chirp/wiggle

**Status:** new. The brief's named example. This is the "spread it off auth" anchor, because avatars appear on every surface.

**Decision on scope:** the wiggle fires only on the **bird-glyph** default avatars, not on photo avatars and not on initials avatars. Rationale: a photo of a real person doing a "chirp wiggle" is uncanny; initials wiggling is meaningless. The bird is the only thing it makes sense for, and it doubles as a gentle nudge: "this is a default bird, you can upload a photo." This requires the bird-glyph avatar (currently preview-only `BirdGlyph`) to be promoted into the real `UserAvatar` as the default-when-no-photo rendering, which aligns with the locked v2 design decision ("bird avatars as default + photo upload override").

- **Trigger:** a deliberate **click/tap on your OWN bird avatar** (the user-chip avatar in the sidebar, and your avatar in the composer). Decision: only your own, not other people's, to keep it a private little toy and avoid "why is this stranger's face wiggling" confusion. Optional second trigger: triple-click any bird avatar anywhere (power-user easter egg, undiscoverable by accident).
- **Animation spec (one beat, ≈420ms):**
  - The whole glyph does a quick **head-tilt wiggle**: `rotate(0 → -9deg → 7deg → 0)` with origin at the body center, spring easing `cubic-bezier(.34,1.56,.64,1)`.
  - The **beak** opens once: a tiny `scaleY(1 → 1.35 → 1)` on the beak path (chirp), synced to the first rotation peak.
  - A single faint **note glyph** (a small ♪ or a 4px dot) fades up and drifts: `opacity 0 → 1 → 0`, `translateY(0 → -10px)` over 500ms, positioned top-right of the avatar, then unmounts. This is the only "added element"; keep it 8px, low-contrast cinnamon, no sound.
  - **No audio.** Decision: never play actual sound; "chirp" is purely visual. Rationale: sound on click is the fastest route to "intrusive/cringe" and breaks in shared/quiet spaces.
- **De-dupe:** ignore re-clicks while a wiggle is in flight (a `isWiggling` ref/state gate); the note element keys off a counter so rapid clicks do not stack.
- **Reduced motion:** the note still fades in/out (opacity only, no drift); the rotation/beak are suppressed. So the easter egg is still acknowledged, just calmly.
- **Where it lives:** `src/components/common/user-avatar.tsx` (the shared avatar). Gate the behavior behind a prop like `interactive` so it only activates on the self-avatar instances (sidebar user-chip, composer), keeping all other avatars inert and cheap.
- **Cringe risk:** LOW, provided audio stays off and it is self-only. The note glyph is the one part that could tip twee; keep it tiny and optional behind a flag if the team wants to A/B it.

Note: DELIGHT_FEEDBACK.md's later owner review confirms 'React on tap (rotate + enlarge) is good' but says the chirp noise itself ('two crude curved lines') needs a nicer chirp glyph (clean concentric arcs / little notes) -- this original spec's 'note glyph' idea is the seed of that fix.


---

# Owner verdicts on delight (merged verbatim from DELIGHT_FEEDBACK.md, /preview/delight walkthrough 2026-06-30)

> **Superseded 2026-07-02.** Current source for motion rules: `docs/spec/DESIGN-SYSTEM.md` sec 7. This
> doc remains the authoritative record of the owner's per-item verdicts (build/fix/skip/defer) from the
> `/preview/delight` walkthrough and is the newest feature-detail layer for delight work; consult it
> for WHAT to build. The companion HOW/where document, `docs/planning/DELIGHT_FIX.md`, was
> deleted in `c1aca36` and lives in git history
> (`git log --follow -- docs/planning/DELIGHT_FIX.md`). Still the record for unresolved items
> (composer rework, loading-ideas gallery, easter-egg verdicts); not all items here have
> shipped yet.

# Delight lab: owner feedback, tracked line by line

Source: the owner's full walkthrough of `/preview/delight` (2026-06-30). Every instruction is captured here so nothing is dropped. This round REFINES the lab to final quality; promotion into the core app is a separate, coordinated pass on the owner's word (other sessions are editing core concurrently).

Status key: [build] building this pass in the lab · [keep] approved, preserve as is · [fix] change per note
· [defer-hoopoe] owned by the owner's other session · [ideas] needs another idea round before any build
· [skip] dropped per owner · [clarify] owner asked me to explain what I meant; addressed in the reply

Lane: which lab route/file. Promotion target noted where it differs.

---

## Global decisions (apply everywhere)

- [keep] One spring for everything. Adopt the single spring set across the product.
- [keep] FadeRise entrance is good. Use it for enters / route changes / empty states.
- [build] Press feedback is barely noticeable; make it more intentional. (Done in `_kit` SpringPress:
  tap sink 0.93 + small hover lift, snappy spring, transform only.)
- [build] REDUCED MOTION: the owner overrides the usual rule. Every animation runs all the time,
  regardless of the OS reduced-motion setting. Nothing here moves fast or jars; the people will want to
  see it. Lab already ignores OS and is toggle-only. Promotion note: the REAL app must also NOT gate on
  `prefers-reduced-motion` for these (owner's explicit call).
- [skip] DARK MODE: light mode only for now. Do not invest in dark mode. (Anything "theme transition"
  related is parked with it.)
- [keep] Hearts are always red. Only transform animates; colour never fades through dark.

## Page-load / landing load

- [build] On a fresh machine the landing content paints, then the photo pops in a beat later. Make
  everything arrive together, intentionally (not necessarily FadeRise; pick the best thing). Lane:
  transitions route demonstrates a "hold until images are ready, then reveal as one" choreography.
  Promotion target: real landing page.
- [build] Landing to login: slide the shared elements off to the left while the login panel slides in
  from the right; same background and logo stay put. Owner loved this and the bounce. Lane: transitions.

## Navigation & transitions (transitions route)

- [build] Sliding sidebar active marker. Must-have, no debate. The active indicator slides between items.
- [build] Segmented control thumb slide. Must-have. (Already in kit `Seg`; feature it.)
- [build] Content cross-fade + size between feed views/tabs. Must-have.
- [keep] Letter vs fade entrance distinction is fine.
- [clarify] "Valley wash in parallax" was not legible; owner could not see it. Real background is a static
  photo, so a moving-background parallax has no home. Downplay / remove it and label it "not used."

## The living valley (landing route)

- [build] Effects belong BELOW the calm first-photo hero, in the section that describes the site. That
  section is the most-seen part, so it must look great. Keep the calm hero photo at the very top; do not
  change that.
- [keep] Cursor parts the leaves. Done tastefully; keep it.
- [fix] Cursor does not affect leaves in the horizontal band where content sits (only above/below). Make
  at least the side margins of that band react. Nice-to-have, not critical.
- [build] LEAVES: they read as leaf-shaped silhouettes, not leaves. Add detail (midrib + veins, slight
  curl/asymmetry) and real VARIETY: neem, pipal/peepal, banyan, gulmohar, duranta and similar. Colour them
  better. Current count is fine. Include a YELLOW leaf instead of having two greens.
- [keep] Leaves settle on hand-off. Nice touch; keep, and keep this leaf palette (plus the new yellow).
- [build] BIRDS (replace entirely): the current hopping bird has no character and just slides up and down
  like a zombie; the screenshot-hopping bird is sharp, ugly, all black, and zooms like a Star Wars
  character. Ditch both. Build cute, polished, DISTINCT little birds (different species, not one repeated,
  not all black, warm palette) with ARTICULATED LEGS that move individually; a believable hop-and-walk
  gait along surfaces (top of screenshot frames / a branch / the ground) that occasionally jumps to the
  next frame. Much more polished than Flappy Bird. Several birds doing different things.
- [defer-hoopoe] The hoopoe mascot should also appear here with richer capability. Leave a labeled slot;
  the other session builds the character.

## Loading states (loading route + new loading-ideas round)

- [ideas] Do NOT implement loading states yet. The owner wants something much more involved and asked for
  another round of ideas first. Build a richer IDEAS gallery (live mockups) to choose from. Constraints:
  one reusable thing usable on EVERY page (not a different scene per page); enjoyable to watch for however
  long it shows (1 to 10s); not shown at all if the page loads basically instantly; school-relevant.
  Candidate directions floated by the owner: sports-day human avatars (running races, long jump, javelin),
  birds sleeping then waking, birds foraging a grid (liked), many birds in a Pac-Man trail (owner unsure /
  maybe cringe; present honestly).
- [keep] Bird foraging the grid is liked. Refine it into the gallery.
- [fix] Valley-warm shimmer does not loop cleanly (second sweep cuts off at halfway). Fix to a seamless
  loop, then it can stay. Owner likes the colour.
- [keep] Leaves settle on hand-off (also liked here).
- [defer-hoopoe] Hoopoe hopping the rows: it is off-centre in each icon and very small; deferred with the
  hoopoe. For now swap to a plain bird-avatar moving between avatar spots, or mark deferred.
- [build] Letters "Dear friend, ..." draw-on (the quill/envelope writing animation). Owner: "that is a
  must. That is amazing." Keep the icon and colours. Lane: loading-ideas (and reused by the Letters
  compose/read surface at promotion).

## Feedback moments (feedback route)

- [fix] Heart: still lacking and feels jagged, like 5fps versus the smoother animations. Make it buttery
  and smooth (multi-keyframe via tween + ease, never a 3-plus-keyframe spring). Stay always-red,
  transform-only.
- [keep] Heart leaf flourish is good.
- [fix] Bookmark ribbon tuck: when unsaved the outline is uneven (the bottom inverted-V notch is much
  thinner than the three straight sides) and the animation is mid / not visible / not joyful. Even the
  outline and make the tuck clearly visible and delightful.
- [fix] Share: making it a checkmark is good, but the post-morph wiggle feels forced and unnatural. Remove
  the wiggle; let it settle cleanly.
- [build] RSVP to going: incorporate it.
- [build] Poll vote bars: make it happen.
- [build] Bell dot: needed.
- [build] Scholarship fund shows progress: animate the bar filling on load / in-view.
- [keep] Comments open: owner loved it. Preserve.
- [keep] Composer expand/unfurl: good. (Full rework lives in the composer route.)
- [build] Bird avatar reacts on tap: the rotate + enlarge is good; refine it to be polished and
  intentional.
- [fix] The "noise" coming out of the avatar on tap is two crude curved lines; make a nicer chirp (clean
  concentric arcs / little notes).
- [build] Hover-to-reveal SPECIES: on PROFILE pages only (anyone's profile, including your own), hovering
  the bird shows its species name.
- [clarify] "Send a toast": owner likes the animation but does not know where it goes. Keep the demo;
  explain it fires on confirmations in-app (contact saved, post shared, RSVP) via the existing toast
  system.

## The composer (rework; new composer route)

- [build] Do research on how good social composers are built, then rework. Owner likes the expand/open.
- [build] Do NOT keep photo/poll/letter visible at all times. Tuck them away.
- [build] Poll is rarely used yet takes major space; tuck it away specifically (behind a more/plus menu).
- [build] Remove the suggested tag chips (campus memory / life update / looking for connections / photo /
  general). No tag suggestions. Instead a small "add a tag" affordance: click it to add one tag (e.g.
  Memory, School update). Do not waste vertical space on tags.
- [build] Bold + italic needed. ADD underline + strikethrough. No superscript/subscript. The formatting
  controls currently feel stranded; integrate them cleanly (e.g. on focus, inline).
- [fix] Focus bug: clicking to type draws a weird extra green shape/box behind the field that needs a
  second click to clear. Only a clean, subtle focus treatment on the field itself (a soft ring that fades
  in). No double green.
- [build] Clicking the empty background (no tiles/elements) should auto-retract the composer; there is
  currently no obvious way to collapse it.
- [build] Post button shape: the current core curvature looks dated. Reshape it into a clean, confident
  button. (The lab/delight post button was preferred over the core one.) Animate the enabled state.

## Bird avatar (cross-cutting)

- [build] React on tap (rotate + enlarge), refined and intentional. (feedback route)
- [fix] Better chirp animation. (feedback route)
- [build] Species name on hover, on profile pages only. (feedback route demo; promotion target: profile)

## Easter eggs & ambient (eggs route)

- [build] Hover the logo to reveal a school fact. Make 10 made-up RV facts. Same fact for the whole
  page-load session; a different one on reload (hovering repeatedly shows the same one). Tasteful.
- [keep] Konami "valley flash": liked the birds and the animation. Keep; frame it as "type the Konami
  sequence anywhere."
- [clarify] Time-of-day background tint ("the hour thing"): owner did not get it and there is already a
  background. Skip; explain it was a day-to-dusk wash that has no home with a static background.
- [skip] Dawn-code greeting: not wanted.
- [skip] Heart-streak feather: redundant with the existing heart flourish.
- [fix/skip] Idle peaks breathing + rare crest shimmer: owner sees nothing. Remove the broken version
  (do not ship something invisible).
- [skip] Theme sun-sweep transition: parked with dark mode.
- [defer-hoopoe] Hoopoe corner peek / corner peak: defer to the hoopoe session.
- [clarify] "Bell rouge": owner asks which bell. Explain (a hidden school-bell chime easter egg, distinct
  from the notification bell-dot); hold unless owner wants it.
- [skip] Sound + haptics: owner leaves entirely to me. Holding sound; will consider a subtle mobile haptic
  only where it clearly helps, later.

---

## Deferred to the owner's other session
- The hoopoe mascot and every hoopoe-driven moment (landing mascot, loading hopper, corner peek, trivia
  gate replacement). Lab keeps labeled placeholders only.

## Needs the owner before core promotion
- Confirm the lab-first, then-promote sequencing (vs. me editing core now while other sessions run).
- Loading states: owner picked the SLEEPING BIRDS waking-on-load concept ONLY. Drop sports day,
  drop Pac-Man, and the foraging bird needs a believable peck (it currently reads as twerking, not
  pecking). Not built into the app yet (the app is responsive enough that a loading state rarely
  shows); build the sleeping-birds overlay when prioritized.
- Composer: approve the reworked direction before it replaces the core composer.
