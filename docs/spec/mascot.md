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
- `src/app/preview/delight/hoopoe/page.tsx` — the Delight Labs control room (stage, every verb, tail-or-no-tail compare, sequence builder, expression matrix, password/gaze demo, size variants). The judging surface.

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

- Locomotion: `walk(steps, dir)`, `hop(count, dir)`, `flyTo(target)`, `land()`, `turn(dir | 0)`.
- Gesture: `point(target | "left" | "right", { label, hold })`, `wave(times)`, `nod(times)`, `shake(times)`, `crest(open)`, `crestFlick()`.
- Expression: `express(name, { hold })`, `celebrate(level 1 | 2 | 3)`, `blinkOnce(double)`.
- Continuous (not queued): `gaze(number | target)`, `coverEyes()`, `peek()`, `bindPassword(getRevealed)`.
- Composition + control: `sequence(...steps)`, `react(event)`, `stop()`, `cancel()`, `rest()`, `isBusy()`.

`Step` is a verb tuple (`["walk", 4, "right"]`), a thunk, `wait(ms)`, or `parallel(...steps)`.

`Expression`: content, curious, happy, surprise, sad, sleepy, love, alert, proud, worried. Each is a
CHORD: crest spread + height, brows (height + angle + opacity), eye shape, bill open, head tilt, body lean,
tail move together. The crest carries most of the emotion (full fan = surprise/alert, collapsed =
sad/sleepy/worried, perked = curious). Brows are HIDDEN at rest (`brow.op` 0) and fade in only for the
emotional poses — visible rest brows were what made the old face read "strict / teacherly". There is no
mouth and no cheek blush. `sad` vs `worried` are deliberately separated: `sad` uses NEGATIVE `brow.ang`
(inner corners lift into a grief tent) + downcast gaze + a fully wilted crest; `worried` keeps a mild
positive-ang furrow.

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

## Open follow-ups

- Lock the hoopoe out of the member avatar pool: in `src/lib/avatar.ts`, exclude species index 0 from
  `birdFor()` (`species = 1 + axisIndex(s, "species::", BIRD_SPECIES_COUNT - 1)`) and reassign the owner's
  `SPECIES_PINS` pin off 0; update `avatar.test.mjs` to assert no species 0. NOT done yet because the
  avatar files are actively-changing uncommitted WIP (they should be edited once that work settles).
- Tail: DECIDED — no tail (default `tail={false}`; legs only). The compare card stays in the lab.
- Proportions: the owner is dialing head/eye/beak size + position in the lab's Proportion Studio (saving
  slots to compare). Once they pick, bake the chosen `headScale`/`eyeScale`/`eyeY`/`eyeSpread`/`billLength`
  into the component defaults (and, if permanent, fold them into the static coords + RIG_CSS var fallbacks).
- Sign-in fly-in: the owner's vision is the bird appearing at the Sign-in button and flying to the login
  hero as the panel slides over. `flyTo` is now smooth enough; this is an app-level orchestration to build
  when wiring the real sign-in transition.
- Old `src/components/auth/hoopoe.tsx` and the placeholder `src/app/preview/delight/_hoopoe.tsx` can be
  removed once all usages are repointed to the new mascot.
