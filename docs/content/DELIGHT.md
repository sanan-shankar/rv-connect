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
