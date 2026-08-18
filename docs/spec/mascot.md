# The Hoopoe Mascot

The valley's signature bird, built as a real character: one rigged SVG puppet driven by one queued,
awaitable, interruptible controller. It replaces the old minimal login bird (a blob with two rotating
wing-petals, no tail or legs, expressions that only nudged the eyes).

It is drawn as a **baby hoopoe**: a big round head, huge low catchlit eyes, a soft pudgy body, a folding
crest, ONE clean decurved bill, two barred wings, stubby legs and feet. No mouth, no cheek blush, no
eyebrows at rest (brows fade in only for emotional poses). The goal is "insanely cute and cuddly," not a
stern adult face. It is a Common Hoopoe (Upupa epops), the founder's favourite bird, and it is the mascot
only (not in the member avatar pool).

## Files

- `src/components/mascot/hoopoe-kit.ts` — springs (gentle / snappy / settle / soft), the `PARTS` selector map, types (`HoopoeApi`, `Expression`, `Step`), the `EXPRESSIONS` chord table, `useValleyMotion` (visibility only), the idle `makeDamper`.
- `src/components/mascot/hoopoe.tsx` — the rig art + continuous gaze + idle system + the queued controller + the `<Hoopoe>` component (forwardRef, exposes `HoopoeApi`).
- `src/components/mascot/use-hoopoe.ts` — `useHoopoe()`, an ergonomic wrapper returning `{ ref, ...methods }`.
- `src/app/preview/delight/hoopoe/page.tsx` — the Delight Labs control room (stage, every verb, tail-or-no-tail compare, sequence builder, expression matrix, password/gaze demo, size variants). The judging surface. Now at `src/app/lab/hoopoe/page.tsx`.
- `src/app/hoopoe/page.tsx` + `src/components/mascot/hoopoe-playground.tsx` — the PUBLIC playground at `/hoopoe`, the link to hand somebody who has never seen the site. One big scene (click the sky to fly there, click the butterfly to be pointed at, the gaze follows the pointer, a day/dusk switch), every verb on a labelled rail in plain English, six named "Surprise me" routines, and the sign-in peek-a-boo underneath. Wears the app's tokens, not the lab's palette; carries no readouts, sliders or code output. The lab room stays the judging surface, this is the showing-off one. Public in `src/proxy.ts`, and listed in `PRODUCT_ROUTES` in `scripts/qa/lab-audit.mjs` so it is not mistaken for a stranded lab page.

## Using it

```tsx
const h = useHoopoe();
return <Hoopoe ref={h.ref} size={160} />;

// every verb is awaitable and queues, so calls never clobber:
h.walk(4, "right")
  .then(() => h.flyTo(publishBtn))
  .then(() => h.point(publishBtn, { label: "Post it here" }))
  .then(() => h.celebrate(2));

// or one abortable promise:
h.sequence(["walk", 4, "right"], ["point", "right"], wait(300), ["express", "happy"], ["celebrate", 2]);
```

Or hold a ref directly: `const ref = useRef<HoopoeApi>(null); <Hoopoe ref={ref} />; ref.current?.express("curious")`.

`<Hoopoe>` props: `size`, `variant` ("full" | "icon"; icon drops legs + tail for 24 to 40px chips and
keeps the four ID tells), `tail` (default FALSE per the owner; legs only), `onReady(api)`, `idle`
(default true), and five proportion knobs (defaults = the canonical bird, so omitting them changes
nothing): `headScale` (cranium size, ~0.86..1.0), `eyeScale`, `eyeY` (vertical eye offset; negative =
higher = less forehead), `eyeSpread` (horizontal eye spacing), `billLength` (beak length). The lab's
Proportion Studio drives these live and can SAVE named slots (mini-bird gallery, persisted to
localStorage, up to 16) to swap between and compare; once the owner picks values they get baked into the
defaults.

## Controller (HoopoeApi)

- Locomotion: `walk(steps, dir)`, `hop(count, dir)`, `flyTo(target)`, `flyIn(edge, target?)`, `land()`, `turn(dir | 0)`.
- Gesture: `point(target | "left" | "right", { label, hold })`, `wave(times)`, `nod(times)`, `shake(times)`, `crest(open)`, `crestFlick()`, `preen()`, `peck()`.
- Expression: `express(name, { hold })`, `celebrate(level 1 | 2 | 3)`, `blinkOnce(double)`, `sleep()`, `wake()`.
- Continuous (not queued): `gaze(number | target)`, `coverEyes()`, `peek()`, `bindPassword(getRevealed)`.
- Composition + control: `sequence(...steps)`, `react(event)`, `stop()`, `cancel()`, `rest()`, `isBusy()`.

`Step` is a verb tuple (`["walk", 4, "right"]`), a thunk, `wait(ms)`, or `parallel(...steps)`.

`Expression`: content, curious, happy, surprise, sad, sleepy, love, alert, proud, worried, asleep. Each is a
CHORD: crest spread + height, brows (height + angle + opacity), eye shape, bill open, head tilt, body lean,
tail move together. The crest carries most of the emotion (full fan = surprise/alert, collapsed =
sad/sleepy/worried/asleep, perked = curious). Brows are HIDDEN at rest (`brow.op` 0) and fade in only for the
emotional poses — visible rest brows were what made the old face read "strict / teacherly". There is no
mouth and no cheek blush. `sad` vs `worried` are deliberately separated: `sad` uses NEGATIVE `brow.ang`
(inner corners lift into a grief tent) + downcast gaze + a fully wilted crest; `worried` keeps a mild
positive-ang furrow. Per the owner's emotional guidance, bias every moment toward `happy`/`content`/`curious`;
reach for `sad`/`worried`/`asleep` sparingly.

`asleep` is a new, deeper cousin of `sleepy`: eyes fully SHUT (a near-flat lid, new `closed` eye shape) rather
than sleepy's drowsy-but-open hooded curve, crest wilted further, head tucked down. It is paired with two new
verbs, `sleep()` and `wake()` (both queued, both no-ops if already in that state): `sleep()` applies the
`asleep` chord AND, unlike a plain `express("sleepy")`, also suspends the ambient idle loop (breathe/blink/
sparkle/crest-flick) for as long as it holds — a resident bird meant to look genuinely asleep (e.g. a sidebar
perch during a long idle stretch) shouldn't still be blinking and sparkling at random. `wake()` plays a small
stretch (crest flick + a light wing shrug), returns to `content`, resumes the idle loop, then a soft
double-blink as the eyes flutter open. An interrupted `sleep()` (`stop()`/`cancel()` mid-hold) releases the
idle-loop suspension immediately, same as every other damper hold in the controller — it never wedges the
bird's breathing off.

`preen()` and `peck()` are small idle-life reactions with no dependency on tail/legs, so they work in both
rig variants: `preen()` dips the bill into a wing (a random side each time) for a self-groom, ending with a
`crestFlick`; `peck()` is a quick foraging lunge (head + body dip, bill snaps open then shut) followed by a
happy little upward beat, as if it just caught something. Both are queued verbs like every other gesture.
"Look around" and "a happy hop" (also mentioned in the moments catalogue) did not need new verbs — they
compose from what already exists: a look-around is `gaze(-x)` → `gaze(x)` → `gaze(0)` (optionally paired with
`turn`), and a happy hop is `hop()` alongside `express("happy")`.

`flyIn(edge, target?)` is a same-mount off-canvas entrance for a spot with no CTA-click origin to launch a
cross-page flight from (e.g. a small mobile auth panel with nothing to fly in FROM). `edge` is `"top"`
(default), `"left"`, `"right"`, or `"sky"` — `"top"` warps just above the rig's own box (right when the rig
sits near the top of what the viewer sees, e.g. the tour offer card), while `"sky"` spawns fully above the
VIEWPORT for a genuine descent from off-screen (the mobile auth pages, where a box-relative start point was
still visibly inside the viewport). It instantly (no animated travel) warps the puppet to that point,
already posed for flight, then runs the exact same cruise-and-land arc `flyTo`
uses onto `target` (defaults to the rig's own rest anchor, i.e. wherever it is mounted). During any
arc-and-land flight the legs unfold at 70% of the cruise (`LEGS_DOWN_AT`, shared with the cross-page flight
layer's `legsDown()` primitive) so the bird never lands legless. It shares its
arc/landing math with `flyTo` via an internal `arcAndLand` helper so the two moves read identically; the only
difference is `flyIn` skips `flyTo`'s ground-takeoff crouch, since the bird is meant to already be mid-flight
the instant it appears. This is a same-component primitive, not a replacement for the cross-page
`mascot-flight.ts` bus (`launchFlight`/`onLaunch`/`glide`/`perch`) — reach for that instead when the flight
needs to survive a client navigation between routes (as the landing-to-login/signup button flight already
does); reach for `flyIn` when the bird just needs to swoop onto a spot within one already-mounted page.

`react(event)` is app-semantic sugar so feature code never touches bones: `correct`, `wrong`, `success`,
`error`, `thinking`, `greet`, `idleBored`.

## How it works

- Front-on chibi, viewBox `0 -10 120 152`. Every movable part is a `[data-part]` group with a real pivot
  (declared in `RIG_CSS`). Key anchors: body `60,101`; head/neck `60,80`; crest `60,37`; eyes `51/69,61`;
  wings (shoulders) `42/85` and `78/85`; legs `52/68,118`; bill hinge `60,74`; root (feet) `60,124`.
- Locomotion is sold front-on, never a profile asset. **Walk** is a bouncy baby waddle-hop: it rocks side
  to side, bobs up, paddles its feet, and the head/crest/tail lag a beat. **Turn** is a gentle whole-body
  lean + look-over (`body` rotate + gaze), NOT an oval squash (the old `bodyTurn` skew/scaleX is gone).
  **Hop** is a springy jump. **Fly** lands the body-center exactly on the tapped point (absolute viewBox
  math including the `-10` y origin). It is FLAP-BOUND, not two straight lines: altitude is tied to the
  wings (a lift bump + forward thrust on each powerstroke, a slight sag on recovery), under an asymmetric
  envelope that climbs fast, CRUISES, then descends. Quick shallow takeoff (no long low crouch). Root x/y,
  wing rotate, body bank, crest/tail, and shadow all animate off the SAME `times` array so the bobbing
  syncs to the flaps. (Future app-level touch: spawn the bird at the Sign-in button and `flyTo` the login
  hero as the panel slides in.)
- **Beak tracks the gaze**: the bill sits in a `billGaze` group whose rotate + small x are driven by the
  gaze spring, so the beak swings toward where the bird looks instead of staying frozen during turn/point.
- **Point** is a real point, distinct from wave: the extended "arm" wing telescopes OUT horizontally
  (`scaleX` reach) toward the target and holds, aimed slightly up/down at it. **Wave** raises the arm UP and
  waggles. **Nod / shake** are soft: gentle amplitudes on `EASE_SOFT` (no spring snap, no jagged frames),
  with the crest lagging. **Crest** opens (`crest(true)`, a springy fan) or folds shut (`crest(false)`,
  collapses to a slim swept tuft) like a real hoopoe.
- Built on motion v12 `useAnimate`: the controller is a self-draining queue; each verb enqueues a step and
  returns a Promise that resolves when its key pose settles. `stop()` commits current values and clears the
  queue; `cancel()` clears and returns to rest. Continuous gaze lives on `useMotionValue`/`useSpring`,
  never the queue. Multiple mascots on one page never cross-talk (animate is scoped to each rig).
- **Abort token**: motion v12 `control.stop()` does NOT resolve `.finished`, so the pump races each step
  against an abort promise that `stop()` flips + releases; otherwise an interrupted verb would wedge the
  queue forever.
- We animate ONLY transform + opacity. Eye-SHAPE changes (round / wide / happy-arc / sleepy-lid) cross-fade
  pre-authored sibling paths by opacity; we never morph `d`/`cx`/`r`. Eye "life" comes from big catchlights
  plus an occasional idle springy sparkle-bounce and the gaze spring overshoot.
- **SVG pivot gotcha**: motion's imperative `animate()` writes `transform-box: fill-box` inline, which would
  re-base every shared anatomical pivot to the part's own bbox. `RIG_CSS` sets `transform-box: view-box`
  and per-part `transform-origin` (in user units) with `!important` so it beats motion's inline write. The
  tunable eye/brow pivots are CSS variables (`--eye-lx/--eye-rx/--eye-y/--brow-y`) the SVG sets inline, so
  gaze/blink keep pivoting on the eye centre at any `eyeY`/`eyeSpread`.
- **Missing-part safety**: the `A()` animate wrapper short-circuits a selector that matches nothing
  (returns a resolved no-op). motion throws "No valid elements provided" on a zero-match selector, so this
  lets any verb animate the tail/legs whether or not they are currently rendered (`tail={false}`, icon
  variant). Without it, every verb that touched the tail crashed when the tail was off.
- **No reduced-motion.** Per the owner the delights are ALWAYS on; there is no `prefers-reduced-motion`
  branch anywhere. `useValleyMotion` only pauses the ambient idle loop when the tab is hidden (battery),
  with zero visible difference while in view.
- SSR safe: the rest pose is static markup with no animated inline transforms; gaze motion values seed at 0
  so the first client frame equals the server frame; idle and intro start only in `useEffect`.

## Wired in

- Login (`src/app/(auth)/login/page.tsx`): the mascot covers its eyes (wings lift fully over the eyes,
  peek-a-boo) while the password is hidden, peeks when revealed, and follows what you type in BOTH states
  (gaze fires on every keystroke of email + password; when covered the head still tracks behind the wings).
  Intro on `onReady`: peek + double-blink, then cover. Replaces the old `src/components/auth/hoopoe.tsx`.
- Celebrations (`src/components/mascot/moments/`): three "earned" one-shot moments from the
  mascot-moments board. `celebration-signals.tsx` (mounted on `/feed` AND on `/welcome`, the post-signup
  onboarding wizard added 2026-07-06) reads the numbers server-side and hands them to
  `celebration-detector.tsx`, which one-shot-latches (`one-shot.ts`, per user id) and hands
  the actual play to `celebration-hoopoe.tsx`: **post-signup welcome** (`flyIn` + wave + `celebrate(1)`,
  fires once within 30 minutes of account creation, and in practice now plays on `/welcome` since that is
  the first page a fresh signup lands on; the one-shot latch means it never repeats when they reach
  `/feed` afterward), **your first Letter** (`react("success")`, fires on
  the 0→1 letter transition), and a **proud moment** (`express("proud")` + wave + `crest(true)` + nod,
  fires on finishing your profile or crossing a post milestone every 10). One-hoopoe rule: the detector
  polls `anotherHoopoeOnScreen()` (`one-hoopoe-guard.ts`) before ever mounting the celebration's `<Hoopoe>`.
  Also wired: **rare idle behaviours** (`rare-idle-behaviors.ts`) — a ~1% roll, checked once as the
  sidebar's idle-rest bird (`sidebar-hoopoe.tsx`) glides in, to preen/peck/happy-hop before it settles to
  sleep instead of going straight there.
- **Bell delivery** (`moments/bell-delivery-hoopoe.tsx`, idea #11 off the board): opening the notifications
  bell (`src/components/layout/notification-bell.tsx`, both the "header" and "sidebar" variants) can pop a
  hoopoe up to `flyIn` onto the bell carrying a small letter (a Lucide `Mail` glyph), `land()`, drop the
  letter, and `nod()` before it fades. Owner's two conditions, both enforced: it only offers this when there
  ARE unread notifications AND at most once per calendar day per browser (`shouldOfferBellDelivery`, a plain
  localStorage date stamp, not the per-user `one-shot.ts`, since the rule is per-browser not per-account),
  and the notifications panel is a CONTROLLED dropdown that only actually opens once the delivery's
  `onDelivered` fires (a `cancel()` on the open attempt defers it) — with a ~6s failsafe timer so a stalled
  animation can never leave the panel stuck shut (the delivery's own real runtime measured ~3.7-4.1s end to
  end, so this leaves real headroom rather than racing it). One-hoopoe rule + a narrow, scoped
  `prefers-reduced-motion` check both gate the offer itself (checked at click time via
  `anotherHoopoeOnScreen()`); when either blocks it, or the daily stamp is already spent, the panel just
  opens immediately like any ungated click. This is the one place in the mascot system that reads OS
  reduced-motion — deliberately narrow to this one blocking-the-UI decision, not a change to the app-wide
  "motion always runs" policy (`src/components/common/motion.tsx`).
  **`<BellDeliveryHoopoe>` is mounted unconditionally** by `notification-bell.tsx` for the page's whole life
  (`anchorRect` starts/returns to `null` between deliveries) rather than only while a delivery is playing —
  see that file's banner comment for the real bug this fixes: React dev-only Strict Mode double-invokes any
  effect that mounts in the same commit as another, and a plain `useEffect(() => () => clearTimeout(...), [])`
  cleanup on a component that mounted fresh alongside its `<Hoopoe>` child was silently clearing the child's
  just-armed `onReady` timer before it ever got a turn to fire — so `play()` never ran, the letter never
  delivered, and the bird sat on screen forever (confirmed empirically, then fixed and re-verified: the panel
  now opens via the real `onDelivered` signal in every trial, the failsafe timer is armed but never fires, and
  the bird fades and unmounts within ~1s of delivery). Same shape as `sidebar-hoopoe.tsx` and
  `logo-easter-egg-hoopoe.tsx`, both already structured this way (ref-owning wrapper mounted early, puppet
  mounted on demand) and unaffected by this hazard.
- **Logo easter egg** (`moments/logo-easter-egg-hoopoe.tsx`, idea #10 off the board): three rapid clicks
  (owner's tweak from the board's original five) on the desktop sidebar's peaks logo pop a small hoopoe up
  from behind it for a `celebrate(3)` + `crest(true)`, then it tucks away. A capture-phase click counter on
  a wrapper around `LogoFact` — it only observes, so the logo's own hover fact-card and its `Link`
  navigation are untouched. Gated by the one-hoopoe rule at the moment the third click lands; otherwise
  fires every time the gesture is landed clean (no daily cap — `celebrate()`'s own internal cooldown is the
  only frequency limit).

## Open follow-ups

- ~~Lock the hoopoe out of the member avatar pool.~~ DONE. Not by narrowing `birdFor()` (that would
  have re-rolled every existing member's bird, since the pool size is the hash modulo) but by
  remapping the ids that land on index 0 to a fixed alternate: `hashSpeciesFor` /
  `HOOPOE_HASH_REMAP_INDEX` in `src/lib/avatar.ts`. `avatar.test.mjs` asserts the hash never returns
  species 0. The owner's `SPECIES_PINS` pin is the Indian Roller, which as of 2026-08-04 is reserved
  to him the same way (index 50, outside the pool entirely). See `docs/spec/avatars.md`.
- Tail: DECIDED — no tail (default `tail={false}`; legs only). The compare card stays in the lab.
- Proportions: the owner is dialing head/eye/beak size + position in the lab's Proportion Studio (saving
  slots to compare). Once they pick, bake the chosen `headScale`/`eyeScale`/`eyeY`/`eyeSpread`/`billLength`
  into the component defaults (and, if permanent, fold them into the static coords + RIG_CSS var fallbacks).
- Sign-in fly-in: the owner's vision is the bird appearing at the Sign-in button and flying to the login
  hero as the panel slides over. `flyTo` is now smooth enough; this is an app-level orchestration to build
  when wiring the real sign-in transition.
- Old `src/components/auth/hoopoe.tsx` and the placeholder `src/app/preview/delight/_hoopoe.tsx` can be
  removed once all usages are repointed to the new mascot.
