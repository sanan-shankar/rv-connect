# V-T9 — adversarial validation of T9 (mascot)
Validator: V-T9 · Model: Opus 5.5 · Started 2026-10-23 · Code checked at HEAD 88642426 (audit read 495ecdd2)
Brief: work/brief-validator.md. Zone notes: T9-01 CONFIRMED at source; T9-04 mechanism confirmed (T8b-07 canonical
for the missing global boundary); T9-02 explains KNOWN bugs.md #20.

## Verdict index (stubs, filled as each is checked)
- T9-01 — CONFIRMED-CORRECTED (Medium; directory consumer line moved to :741)
- T9-02 — KNOWN (bugs.md #20) with its diagnosis; dev-only (Low as a defect); one production read finishes it
- T9-03 — CONFIRMED-CORRECTED (Medium; the jam stops taps/beats/verbs, the idle loop keeps running; trivia line :247)
- T9-04 — CONFIRMED-CORRECTED (Medium; the no-tap instance of L7-03; T8b-07 canonical for global-error; proof page should be /letters)
- T9-05 — DOWNGRADED to Low (mechanism certain; a toy page, reload restores it)
- T9-06 — CONFIRMED (Low)
- T9-07 — CONFIRMED (Low)
- T9-08 — CONFIRMED-CORRECTED (Low; landing-footer growth latent)
- T9-09 — CONFIRMED-CORRECTED (Low; lines now :132-178)
- T9-10 — REFUTED as live (landing showcase dormant since 2026-08-26); latent note
- T9-11 — CONFIRMED-CORRECTED (Low; two more stale comments added)
- T9-12 — CONFIRMED-CORRECTED (Low; feed mount now :77, page read :56-59)
- T9-13 — CONFIRMED-CORRECTED (Low; verify-client line :105)
- T9-14 — CONFIRMED (Low)

## Verdicts

### T9-01 — CONFIRMED-CORRECTED (Medium, one citation moved)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `moments/moment-hoopoe.tsx:55-71` (observer effect, deps `[ref, delay]`, `if (!el) return;` at :57),
`:104-121` (MomentStage; `if (!solo) return null;` at :115, the stage div at :118), `one-hoopoe-guard.ts:30-37`
(`useState(false)`, flipped only in its own mount effect) — all correct at HEAD (neither file changed since 495ecdd2).
Consumers: `post-feed.tsx:295` correct; `saved-posts-feed.tsx:188` correct; `messages/(index)/page.tsx:130` correct;
**`directory-client.tsx:709` is now `:741`** (the file grew 36 lines in b5a87180/04e75d5d; the unverified-viewer card that
replaces it is the branch at :719-730). `contributed-hoopoe.tsx:165` (stage div always rendered) correct; its
`useMomentAutoplay` call is :127.
What I tried to refute it with: (1) a second caller of `play`/`fired` — none: `useMomentAutoplay` has two callers
(MomentStage :109 and ContributedHoopoe :127), and only MomentStage renders its stage conditionally. (2) Strict Mode:
the stage div is placed in a LATER commit than MomentStage's own mount, so the dev double-invoke covers only the div and
the rig, not MomentStage's effects (React 19 `recursivelyTraverseAndDoubleInvokeEffectsInDEV` keys on the PlacementDEV
fiber, `react-dom-client.development.js:20245-20315`); production has no second pass at all. (3) A re-run of the effect:
`ref` is the same `useRef` object and `delay` is the default 450 on every render, so React never re-runs it. (4) An
`IntersectionObserver` created elsewhere for the same element: none. (5) `useHoopoeLife(h, solo && played, …)`
(use-hoopoe-life.ts:82-105) returns at `if (!running …)`, and `played` is only set in the `.then` of `play`. Nothing
else can start the resting life.
Why it stands: a mount-only effect reads a ref whose element is rendered one commit later and never re-runs. Every
consumer of MomentStage is dead: the feed search's and the directory's no-results bird, the empty Saved tab, the empty
Messages page. The bird still breathes, blinks and flicks its crest (the rig's own idle loop), so what is lost is exactly
the spec's "looks left and right … Rests" column, the 2026-09-17 brief ("after uploading photos it just sits there",
quoted at use-hoopoe-life.ts:9) applied to these three. Severity: kept Medium only because it is certain, universal and
a whole shipped feature that never runs; it is decorative and a fix session may reasonably take it as High-Low. No
member-facing function is lost.
Live check run: none possible (no browser by rule). L7 independently swept every null-ref-bailing effect app-wide and
found this the only one that never recovers (reports/L7.md "Brief seed — T9-01..05").
Corrections to the finding: `directory-client.tsx:709` -> `:741`. Otherwise none.
Orchestrator action: the finder's proof stands as written (`/feed?q=zzzzqqq` signed in as Jerry; read the `head` /
`headGaze` transforms over 20 s with the pointer off the bird). Fix direction is sound; the cheapest is ContributedHoopoe's
shape (always render the stage div, gate only `<Hoopoe>` on `solo`).

### T9-02 — KNOWN (bugs.md #20), with a diagnosis; as a defect: dev-only, Low
Verdict: KNOWN (docs/planning/bugs.md #20) — the finding is the mechanism #20 asked for, not a new defect. Re-rule
#20 itself: "dev server only (React Strict Mode); production believed correct, pending one read".
Confidence in verdict: likely (the dev mechanism is certain at source; the production half is a prediction that needs
one computed-style read on rishivalley.space, which this validator may not do)
Citations re-derived: `login-client.tsx:57-85` (runIntro; timer armed :70, the only `introDone = true` :72 and the only
`coverEyes()` in the intro :78), `:107-112` (toggle effect, `if (!introDone.current) return;` :109), `:117-121` (the
`[]` cleanup clearing `introTimeoutRef`) — correct at HEAD (only the Link import changed, 19be10b0, same line count).
`hoopoe.tsx:1416-1422` (onReady, `if (readyRef.current) return;`) correct; `:1303-1311` (unmount cleanup: stops and
clears `live`, never releases the abort token or the queue) correct. `use-flight-arrival.ts:172-175` correct.
React: `next/dist/compiled/react-dom/cjs/react-dom-client.development.js:12256` (hydration ORs `134221824` =
Placement|PlacementDEV into the root's children) and `:20245-20305` (`doubleInvokeEffectsOnFiber`: disconnect every
layout+passive effect in the placed subtree, then reconnect) — correct; the installed Next is now **16.3.8** (was 16.3.3)
and both still hold. `define-env.js:150-151` (`__NEXT_STRICT_MODE_APP` true when `reactStrictMode` is null) and
`server/config-shared.js:131` (`reactStrictMode: null` default); `next.config.ts` sets none — correct.
Peripheral citations: `reset-client.tsx:78-85` -> the ready handler is `:78-91`; `forgot-client.tsx:61-64` correct;
`verify-client.tsx:83-104` -> **`:86-109`** at HEAD (c41893f0 and d7a8041d added lines above); `signup-client.tsx:67-82`
correct.
What I tried to refute it with: (1) whether LoginClient and the rig mount in the same commit — yes: `Hoopoe` is a static
import (login-client.tsx:11), not `dynamic()`, so both are inside the hydrated root's PlacementDEV subtree. (2) whether
the dance re-arms anything — the reconnect re-runs the onReady effect, which returns on `readyRef` (a ref survives the
simulated unmount); nothing else calls runIntro on the direct desktop path (`onHoopoeReady` is the only caller when
`!arrivedViaFlight && !mobileFlyIn`). (3) whether the stopped blink would still settle — no: `JSAnimation.stop()` ticks
once at `time.now()` (elapsed 0 of 180 ms, not done) then `teardown()`s without `notifyFinished()`
(`motion-dom/.../JSAnimation.mjs:44-55, 351-363`), so the pump's step and the queued `express("happy")` never run.
(4) whether production ALSO breaks at 1700 ms — I checked the one way it could: the timer calls `express("content")`
and then, synchronously, `coverEyes()`, which writes the same `rotate` on both wings. It does not wedge, because the
wings' `rotate` value already exists at 0 (peek() created it at mount) and is idle, so motion SKIPS express's wing write
(`motion-dom/.../visual-element-target.mjs:48-58`: `!value.isAnimating() && valueTarget === currentValue`) and only
coverEyes animates. So the production prediction survives source.
Why it is filed as KNOWN: #20 is the symptom ("wings down, `[data-part=leftWing]` carries no style"), and this is its
cause. #20's own text points a fix session at the wrong code ("Suspect the ambient idle loop or the damper") and says
"Size: small, once the cause is known" — the ledger should replace that paragraph with this mechanism and the
instruction "check production first". The real harm is to the tooling: every localhost probe of /login,
/reset-password, /forgot-password, /verify-email and /signup's greet at desktop width shows a bird the members never see,
and #20 was filed from exactly such a probe (progress-2026-08.md:4100, run against a locally served `32128fd`).
The footer-bird paragraph is DORMANT: `src/app/page.tsx:31-38` renders only `<LandingHero>`, and `footer-hoopoe.tsx` is
imported only from the showcase tree (L7 fact 5, re-checked by grep at HEAD).
Live check run: none possible (production read needs a browser).
Corrections to the finding: filing (KNOWN #20 + diagnosis, not a new Medium); severity as a defect Low (dev-only;
the cost is misleading every localhost check of the auth birds); verify-client citation `:83-104` -> `:86-109`;
footer paragraph latent.
Orchestrator action: ONE read on production, no sign-in: fresh tab at 1440x900 on `https://rishivalley.space/login`,
wait 3 s, `getComputedStyle(document.querySelector('[data-hoopoe-perch] [data-part=leftWing]')).transform` -> expect
a ~-163deg rotation matrix; same read on `http://localhost:3000/login` -> `none`. If production ALSO reads `none`, this
diagnosis is incomplete and #20 is a live production bug again.


Addendum (found while checking T9-03): one more dev-only casualty the finder's list omits — `CelebrationHoopoe` starts
`playCelebration` synchronously inside the rig's one-shot onReady (`celebration-hoopoe.tsx:71-73`; its first verb is
`flyIn("top")`, `react("success")` or `express("proud")`, `:28-52`), with none of the one-tick deferral the sidebar,
flight layer and fly-away carry. On localhost the dance stops that first verb, `onDone` is never called, and the bird
stays `fixed bottom-3 right-3` for the rest of the page view holding the one-hoopoe guard. Same fix as the rest of
T9-02 (make `onReady` survive the dance once, in the rig).

### T9-03 — CONFIRMED-CORRECTED (Medium; "frozen" overstated — the idle loop keeps running)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: likely (every link read at source and in the installed motion 12.38.0; the odds are computed,
not observed — the finder's own caveat stands)
Citations re-derived: `hoopoe.tsx` is unchanged since 495ecdd2, so every rig line holds: ambient blink `:1454-1463`,
flick `:1491-1504` (both gated only on `!damper.active`), `blinkOnce` `:381-385`, `crestFlickRaw/crestFlick` `:417-420`,
`crest()` `:423-428`, `express()` `:481-508`, `applyChord` `:325-337`, `rest()` `:1210-1223`, `isBusy` `:1224`, `react()`
`:1230-1265`, pump `:292-311` (races only `token.p`), `live` add/delete `:279-280`, poke drop `:1083`, pointer-events
`:1546`. Damper holders re-listed by grep: nod, shake, preen, peck, wave, point, walk, hop, fly*, celebrate, sleep, poke;
NOT held by blinkOnce, crestFlick, crest, express, rest, land — as the finder says. `use-hoopoe-life.ts:56, :89` correct.
`celebration-hoopoe.tsx:71-73` correct; `contributed-hoopoe.tsx:156-159` correct; `rare-idle-behaviors.ts:48-49` correct
(`Promise.all([api.hop(2), api.express("happy", …)])`); `not-found-stage.tsx:120-121` correct (`until` races the token).
**Moved: `trivia-gate.tsx:238` -> `:247`** (e91dbb77 added the "I don't know" branch). `signup-form.tsx:333-338` -> the
poll is `:325-338`, cap at `:332`. `footer-hoopoe.tsx:235-243, 263-265` are DORMANT (the showcase is not rendered,
`src/app/page.tsx:31-38`; L7 fact 5).
What I tried to refute it with: (1) that the ambient write and the verb's write hit different motion values — no:
framer-motion's scoped animate resolves the selector inside the same scope and fetches the element's ONE VisualElement
from `visualElementStore` (`framer-motion/dist/es/animation/animate/subject.mjs:31-38`), so `scaleY`/`rotate` on
`[data-part=crest]` and `[data-part=eyeBlink]` are the same MotionValues for both writers. (2) that a superseded
animation might still settle — no: `MotionValue.start()` calls `this.stop()` first (`motion-dom/dist/es/value/index.mjs:260-261`),
which calls `AsyncMotionValueAnimation.stop()` -> `JSAnimation.stop()` -> `teardown()` with no `notifyFinished()`
(`JSAnimation.mjs:44-55, 351-363`); `GroupAnimation.finished` is `Promise.all` of the children (`GroupAnimation.mjs:7-9`).
Reading `.finished` forces the keyframes to resolve synchronously (`AsyncMotionValueAnimation.mjs` `get animation()`),
so there is no window in which the verb's animation does not yet exist. (3) a no-op guard — motion skips a write only
when the value is idle AND already at the target (`visual-element-target.mjs:48-58`); a chord change, a blink and a flick
are real animations. (4) a recovery path — the pump has no timeout and nothing calls `stop()`/`cancel()` on a resting
bird after its moment's opening `h.cancel()`; `useHoopoeLife` never cancels. (5) the reverse collision (a verb starting
while an ambient flick is in flight) is harmless: the abandoned animation is the ambient one, which nobody awaits.
Why it stands: two writers own one value and only one of them is in the queue; the queue awaits an animation the other
writer can silently cancel. From then on the bird answers no tap (`pokePending` latched), runs no beat (`isBusy()` true
for ever) and plays no later verb.
Correction to the consequence: the bird is not a statue after a jam — the ambient breathe, blink, sparkle and crest flick
are timer-driven and carry on. What stops is everything queued. The finder's "about a 50% chance a resting bird has
frozen by minute five" is a reasonable estimate of THAT state (beat 5 picked ~15% of the time x ~16% per pick; ~6 beats
a minute). The CelebrationHoopoe corner-stranding is real in mechanism, but its exposed `express` calls land before the
first possible flick (5 s), so it is dev-only in practice (the T9-02 Strict Mode wedge, which this validator also traced:
CelebrationHoopoe runs `playCelebration` inside the rig's one-shot onReady, so on localhost every celebration wedges
during the dance and never calls `onDone`).
Severity: kept Medium. Decorative, but it breaks two spec promises on every bird in the app ("every verb is awaitable
and queues, so calls never clobber"; "Every bird answers a tap"), it is the owner's 2026-09-17 complaint coming back on
its own after a few minutes, and on /signup a jam silences the gate-pass celebration and delays the password tuck 8 s.
Nothing a member needs is blocked (the finder's own Verified-clean list shows no UI awaits a bird except T9-05's).
Live check run: none possible (needs a browser).
Corrections to the finding: trivia-gate `:238` -> `:247`; signup-form poll `:325-338`; the footer-bird consequences are
latent (dormant showcase); "frozen/statue" -> "stops answering taps and doing beats; the idle loop continues".
Orchestrator action: the finder's /hoopoe proof (public, no sign-in): MutationObserver on `[data-part=crest]` `style`,
press "Well done"/"Thinking" ~20 times a second apart, then "Nod" — a jam coincides with a crest write during an
expression and Nod never plays until "Settle down".

### T9-04 — CONFIRMED-CORRECTED (Medium stands; fold into L7-03's fix unit; T8b-07 canonical for the missing global boundary)
Verdict: CONFIRMED-CORRECTED — the no-tap instance of L7-03 (the app-wide `dynamic()` census, canonical for the class);
the "no `global-error.tsx`" half is T8b-07 (V-T8 ruled it canonical); the "Try again only `reset`s" half is T8b-15.
Keep T9-04 as a linked row, not a separate fix: one wrapper for every lazy import fixes all three.
Confidence in verdict: certain for the mechanism; possible for frequency (finder's own rating stands)
Citations re-derived: `sidebar-hoopoe.tsx:55-58` (`dynamic(() => import("./hoopoe").then(m => m.Hoopoe), { ssr: false })`),
`:127-135` (`tryEnter` -> `setMounted(true)` from an idle timer; `armIdle` :122-125 at 90-120 s), `:235-245` (the render)
— correct at HEAD (file unchanged). `sidebar.tsx:676` correct; the chain is `(main)/layout.tsx:164` -> `AppShell`
(`app-shell.tsx:69`) -> `Sidebar` -> `SidebarHoopoe`, all inside the (main) LAYOUT, so `(main)/error.tsx` (which wraps
only the page) cannot catch it and the throw lands on `src/app/error.tsx` (exists; `reset`-only, T8b-15). No
`src/app/global-error.tsx` (checked). `next/dist/shared/lib/lazy-dynamic/loadable.js:36` (`React.lazy(() =>
opts.loader().then(convertModule))`, no catch; `ssr:false` wraps in `Suspense` + `BailoutToCSR`, neither of which catches
errors) — correct in the installed Next 16.3.8. Siblings: `logo-easter-egg-hoopoe.tsx:35` (`dynamic(loadPeek)`; finder
said :34-35) and `:56` `void loadPeek()`; `mascot-flight-layer.tsx:48` — correct.
What I tried to refute it with: (1) an error boundary between the sidebar and the root — none (`AppShell`, `Sidebar`
render no boundary; `BailoutToCSR` only throws a bailout on the server). (2) React.lazy NOT caching a rejection — it
does: the lazy payload moves to Rejected and every later render rethrows the same error, so "Try again" re-throws on
the next summon. (3) whether the rig chunk is usually already in the tab — partly: `/feed` and `/welcome` carry the rig
STATICALLY (`celebration-detector.tsx:21` -> `celebration-hoopoe.tsx:22`; `post-feed.tsx:11` -> `moment-hoopoe.tsx:18`),
as do /directory, /messages and the profile's Saved tab; on those pages the dynamic import most likely resolves from
an already-loaded module. Pages with no static importer (e.g. /letters, /catchups' list, /support, /settings outside
the dark trial) are where a post-deploy summon must fetch. This narrows frequency; it does not change the mechanism.
(4) Vercel's 2026-07-17 immutable-asset change (L8 lead) lowers the odds for chunks the CDN already served; a chunk
nobody requested before the deploy still 404s on Hobby (no Skew Protection).
Why it stands: a decorative child, mounted by a timer with no user action, can replace the whole signed-in shell with
the root apology, and a cached rejection makes it recur every 90-120 s until a reload.
Live check run: none possible (needs a browser).
Corrections to the finding: logo-egg `dynamic` is at `:35`; the proof's "open a fresh tab straight onto /feed" picks
the one page most likely to have the rig ALREADY loaded — use /letters instead. Filing: link to L7-03 (census) and
T8b-07 (global boundary), one fix unit.
Orchestrator action: signed in as Jerry in chrome-devtools on a FRESH tab opened straight onto `/letters` at 1440x900,
`emulate` offline, press Ctrl+Shift+H: expect the root "Something went wrong"; restore network, "Try again", Ctrl+Shift+H
again: expect it again until a reload.

### T9-05 — DOWNGRADED to Low (mechanism CONFIRMED)
Verdict: DOWNGRADED to Low
Confidence in verdict: certain for the mechanism
Citations re-derived: `hoopoe-playground.tsx:203-210` (`surprise()`: `setBusy(true); await h.sequence(...pick.steps);
setBusy(false)`), `:275-280` (`disabled={busy}` beside "Settle down"), `:186-201` (`settle()` -> `h.cancel()`) —
correct at HEAD (only the Link import changed, same line count). `hoopoe.tsx:1189-1209` (`stop()`: `queue.length = 0`,
`live` stopped, token released) correct. ROUTINES `:55-62`.
What I tried to refute it with: (1) a routine step that resolves on its own after a cancel — every ROUTINES step is a
queued verb (no `wait` or function step), so at any click the sequence is awaiting a verb's enqueue promise that is
either cleared from the queue or in flight with its animations stopped; neither settles. The one narrow escape is a verb
caught inside an internal `sleep()` that re-checks `token.aborted` (e.g. celebrate) — it returns and the routine
carries on — so "always" is "almost always". (2) a reset of `busy` elsewhere — none; `settle()` does not touch it.
(3) the unqueued-wing case: "Cover its eyes"/"Peek" during "the greeting" (`wave` awaits the right wing) or "the
show-off" (`celebrate`) supersedes an awaited wing animation and strands the routine the same way — confirmed by the
same motion facts as T9-03.
Why it is downgraded: the page is a toy with no task, no data and no flow; every other control on it still works after
the strand (the queue itself is healthy after `cancel()`), and a reload restores the button. That is cosmetic-with-teeth
on a public page, not a degradation a member hits doing something they came to do.
Live check run: none possible.
Corrections to the finding: severity Medium -> Low; "certain" holds for the mechanism, not for every press timing.
Orchestrator action: the finder's proof is exact and public (no sign-in): `/hoopoe`, Surprise me, Settle down within a
second, then read the button's `.disabled` after 10 s.

### T9-06 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain for the mechanism; the trigger is narrow (desktop only, two landing launches inside one
~2.5-5.8 s flight)
Citations re-derived: `mascot-flight-layer.tsx:566-570` (the `finally`: `clearTimeout(failsafe)`,
`cancelAnimationFrame(rafRef.current)` :568, `if (!abortRef.current) setActive(null)` :569), post-flare guards `:483`,
`:487`, `:502` check `abortRef` only, `:147` one shared `rafRef`, `:548-559` (`flushSync(signalHandoff)` and the shadow
write on the shared box) — all correct at HEAD (file unchanged). The guards that DO check ownership are `:308`
(after phase 0) and `:460` (after the cruise); the tween's own is `:233`, the cruise loop's `:388`, the failsafe's `:287`.
What I tried to refute it with: (1) the old flight never reaching its `finally` — in phases 0/1 its loop resolves on
the next frame once `flightGen` moves (`:233`, `:388`) and returns straight into the `finally`; in the post-flare
stretch a tween (`:473`, `:498`) does the same. (One sub-case the finder did not separate: if the old flight is inside
`await api.perch()` when the re-keyed `<Hoopoe key={active.id}>` unmounts its rig, the rig's cleanup stops perch's
animations and that flight simply hangs for good, touching nothing — harmless.) (2) ordering inside the frame — the old
flight's rAF callback was registered a frame earlier than the new flight's, so it runs first; its `finally` runs at the
microtask checkpoint after that callback, and `cancelAnimationFrame` on the newer, still-pending id removes it from the
current frame's list, so the new tween never steps again. (3) `setActive(null)` being skipped — no: the new flight reset
`abortRef` to false at `runFlight`'s top (`:261`), so the old `finally` unmounts the new bird. The new flight's failsafe
(`:284-292`, it still owns the layer) then signals the destination at 5.8 s.
Why it stands: the audit Low 13 fix moved ownership checks into the loops and the failsafe but not into the `finally`
or the post-flare steps, and `rafRef` is still shared, so the overtaken flight's cleanup tears down the overtaking one.
Live check run: none possible.
Corrections to the finding: none of substance (add the hang-at-perch sub-case above; it changes nothing).
Orchestrator action: the finder's MCP sketch (Sign in, Back within ~1 s, Join; sample `[data-mascot-flyer]` per frame)
is the right proof if the fix session wants one; argue-only is acceptable for a Low.

### T9-07 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain for the mechanism; both triggers uncommon
Citations re-derived: `landing-hero.tsx:228-241` (the two `sessionStorage.setItem`s at :230 and :234, written at the
click, before the 0.9 s slide) and the push in the photo layer's `onAnimationComplete` (`:272-287`) — correct at HEAD
(only the Link import changed). `use-flight-arrival.ts:76-86, 94-102` (flags read in lazy initialisers at mount),
`:103-110` and `:267-297` (the only places the flags are cleared — both run only once the DESTINATION mounts), the
6000 ms fallback `:292`; `mascot-flight-layer.tsx:283-292` (5800 ms failsafe from take-off) — correct.
What I tried to refute it with: (1) a clear on the landing's unmount or on an abandoned exit — none (grep of
`removeItem(FLIGHT_FLAG|AUTH_PREVIEW_FLAG)`: only the two destination effects). (2) a replay of a missed handoff —
none: `mascot-flight.ts:128-137` keeps one callback and `signalHandoff()` calls whatever is subscribed at that instant,
so a page that mounts after the failsafe fired waits its own 6 s. (3) staleness: the flags carry no timestamp, so they
survive in the tab for as long as the tab lives; the next arrival at that route by any path (a reload, a sign-out that
lands on /login) hides its bird for 6 s and skips its entrance.
Why it stands: a two-step handshake whose second step can fail to happen, with the first step's state never expired.
Live check run: none possible.
Corrections to the finding: the (a) proof needs a history entry before the landing ("Back" from a landing that was the
tab's first page does nothing and the push completes); clicking any other link during the slide also works.
Orchestrator action: none needed for a Low.

### T9-08 — CONFIRMED-CORRECTED (Low; the landing-footer part is latent)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (read in the installed framer-motion 12.38.0)
Citations re-derived: `node_modules/framer-motion/dist/es/animation/animate/index.mjs:44-48` (`scope.animations.push(
animation); animation.finished.then(() => removeItem(...))`) correct; `hoopoe.tsx:1427-1430` (the breathe,
`repeat: Infinity`; the finder's :1428-1431 is one line off), `:279-280` (`live`), `:1303-1311` correct; `let ambient`
`:990` correct; `hoopoe-playground.tsx:180` (`stopWatching` -> `h.gaze(null)`) correct.
What I tried to refute it with: (1) useAnimate pruning stopped animations — it does not: the only removal is on
`finished`, and a stopped or superseded group never resolves (T9-03's motion facts); `useAnimate`'s unmount effect
empties the list, so the growth is bounded by the mount. (2) the breathe being reused — no: every damper `resume()` and
every tab show calls `startBreathe()`, which creates a new group; `stopBreathe()` stops the old one, which stays listed.
(3) the dev-only `ambient` claim — React 19 reuses the first pass's `useMemo` result in a Strict Mode double render, so
`api.gaze` closes over pass 1's `let ambient` while the committed `[]` cleanup closes over pass 2's; production renders
once before commit, so the two agree. Correct and dev-only.
Why it stands: a per-page-view leak of a few KB a minute on any bird left open (a resting Catch-ups bird, the 404, the
playground), plus every T9-03 casualty in `live`.
Live check run: none possible (heap snapshot needs a browser).
Corrections to the finding: the landing footer (~4 damped beats a minute) is DORMANT — the showcase is not rendered
(`src/app/page.tsx:31-38`, unchanged since 7d0e5e41 on 2026-08-26, before the audit base); breathe line `:1427-1430`.
Orchestrator action: none.

### T9-09 — CONFIRMED-CORRECTED (Low; lines moved)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: the finder's `celebration-detector.tsx:131-172` is now **`:132-178`** at HEAD (46d4408f added the
`useSyncExternalStore` import and the guide hold at `:165-171`): `playing`/`canRender` `:132-133`, the poll effect
`:137-163` keyed on `[playing?.id]`, the gate `if (!playing || !canRender || guideOpen) return null;` `:171`, `onDone`
slicing the queue `:177`. The "checked BEFORE <CelebrationHoopoe> ever mounts" promise is `:31-35`.
What I tried to refute it with: (1) whether the new guide hold resets `canRender` — no, it is an extra gate, not a reset.
(2) whether the first bird is still mounted when the second renders — no: same slot, new `key`, so the first unmounts;
the guard was meant to see OTHER birds (sidebar sleeper, a moment bird), and on the render after `onDone` it is not
consulted at all. (3) the poll then finding the celebration's own `.hoopoe-mascot` and burning its 10 x 3 s retries
before re-setting a flag that is already true — confirmed by the code.
Why it stands: `canRender` is state from the previous head of the queue, read one render before the effect that would
re-poll for the new head.
Live check run: none possible.
Corrections to the finding: line numbers above. Note too that in DEVELOPMENT no celebration ever calls `onDone` (see
T9-02's addendum), so this is reachable only in production.
Orchestrator action: none.

### T9-10 — REFUTED as a live defect (unreachable: the landing showcase is dormant); carry as a latent note
Verdict: REFUTED (unreachable in the shipped app; latent)
Confidence in verdict: certain about reachability; the mechanism itself stays "possible" (frame-vs-effect ordering)
Citations re-derived: `perching-birds.tsx:131-137` (`pausedRef` synced in a passive effect, `:133-136`), `:343-350`
(a tick that sees `paused` hides the birds and stops), `:572-577` (`pump`, the only restart) — correct.
What refutes it: `PerchingBirds` is imported only by `landing/showcase.tsx` (and `/lab/landings`), and `src/app/page.tsx`
renders `<LandingHero showScrollCue={false} />` alone; the showcase left the route on 2026-08-26 (7d0e5e41), a month
before the audit read the code. No member can reach it. L7 reached the same conclusion independently (L7 fact 5).
Why it is kept as a note: the page header says the showcase is meant to come back ("I just need to improve it further
before it's shipped"); the cheap fix (call `pump()` when `pausedRef` turns false) should ride with that return, and the
mechanism needs its one live look then.
Live check run: grep of every importer of `perching-birds`, `footer-hoopoe`, `ambient-leaves` (all inside the showcase
tree) and `git log -- src/app/page.tsx`.
Corrections to the finding: not a live Low; a latent item for the showcase's return.
Orchestrator action: none.

### T9-11 — CONFIRMED-CORRECTED (Low; two more lies added)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived, each checked at HEAD: mascot.md "Where it lives" (`docs/spec/mascot.md:155-177`): the dark-mode
row (:177) vs `dark-gauntlet.tsx:385-500` (rebuilt 2026-09-21 as a keep-still-until-it-sleeps trial; `express("sleepy")`
:438, `sleep()` :454) — true; the three "Rests" rows (:172-174) — false today (T9-01). `mascot-flight-layer.tsx:17-20`
and `:44-47` ("the landing's scroll-companion hoopoe") — true, there is no scroll companion. `logo-easter-egg-hoopoe.tsx:31`
("its geometry and the edge-light filter") vs `logo-peek.tsx:22` ("Flat, with no edge light: tried and taken out") —
true. `rare-idle-behaviors.ts:10-12` ("the only long-running resident … is the sidebar's idle-rest bird") — true (the
Collection's bird and the Catch-ups `ResidentHoopoe`s rest now). `:46-48` ("hop() alongside express("happy")") — true:
both are queued, so the `Promise.all` runs them one after the other. `hoopoe.tsx:249-251` ("only natural completion or
cancel does") — true: `JSAnimation.cancel()` ticks to 0 and tears down without `notifyFinished()`
(`JSAnimation.mjs:351-357`). `hoopoe-kit.ts:77-80` (the "top" edge "suits … the sidebar perch") vs `sidebar.tsx:673-677`
(the perch is at the rail's FOOT, above `AccountSection`) — true. `HoopoeProps.initialExpression` (`hoopoe.tsx:1330`)
declared, absent from the destructure at `:1349`, passed by nothing (grep of src incl. /lab) — true.
Additions found while checking: (a) `moment-hoopoe.tsx:24-43` is `useSoloHoopoe`'s docblock ("Checked exactly ONCE,
in a mount effect …") left above `useMomentAutoplay` after the hook moved to `one-hoopoe-guard.ts`; it now describes the
wrong function. (b) `moment-hoopoe.tsx:89-90` ("When `play` resolves, the bird does not stop: `useHoopoeLife` takes
over") is false while T9-01 stands. L9's A31 (`rare-idle-behaviors.ts:15-18`, "the feed's 'on this day' copy", which does
not exist) is the same header and should be fixed in the same edit; L9's A46 row is this finding (T9-11 canonical).
Why it stands: every item is a sentence that misdirects the next reader, and #20's suspects already misled one.
Live check run: none needed (source + grep).
Corrections to the finding: add (a) and (b); link L9 A31/A46.
Orchestrator action: none.

### T9-12 — CONFIRMED-CORRECTED (Low; lines moved, and the fold is now cheaper)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain for the queries; the cost is an argument (L5 has already folded it into its /feed count)
Citations re-derived: `celebration-signals.tsx:30-57` correct (the `Promise.all` is `:31-40`). **`feed/page.tsx:70` ->
`:77`** (6fb896bd/46d4408f added the tour and its comment), still with no `<Suspense>` of its own; the page's own read of
the member's row is now **`:56-59`** and selects `{ feedSeenAt, guideSeenAt }` — a second field already rides on it,
which makes folding the four celebration fields into it the natural edit. **`welcome/page.tsx:82` -> `:85`**.
`schema.prisma:727` -> the index is `@@index([authorId, createdAt])` at **`:732`**.
What I tried to refute it with: a Suspense boundary around the signals (none; `feed/loading.tsx` is the segment's, so the
signals gate the segment's reveal with the rail and the column — they run concurrently, so they add checkouts more than
latency); a cache — none (`prisma` calls in a server component, uncached).
Why it stands: three extra statements and checkouts on every /feed render for a result the client discards almost
every time, one of them a duplicate read of a row the page already reads.
Live check run: `EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM "Post" WHERE "authorId" = (heaviest poster) AND
"isHidden" = false AND status = 'published'` -> Bitmap Index Scan on `Post_authorId_createdAt_idx`, 24 rows, 14 shared
hits, 1.8 ms. Round trips and checkouts, not scans — as the finder said.
Corrections to the finding: line numbers above.
Orchestrator action: none.

### T9-13 — CONFIRMED-CORRECTED (Low; one line moved)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: ambient flick `hoopoe.tsx:1491-1504` (`rotate: [0, -5, 2.5, 0], scaleY: [1, 1.07, 1]`) and the
verb `:417-420` (`rotate: [0, -6, 3, 0], scaleY: [1, 1.1, 1]`) — correct; the chords `hoopoe-kit.ts:217-241` — `sad`
crest `0.44/0.78/-9`, `worried` `0.58/0.88/-3`, `sleepy` `0.46/0.8/-6`, `curious` `1.16/1.06/5` — correct.
Surfaces: `reset-client.tsx:88` (`express("sad")`) correct; **`verify-client.tsx:102` -> `:105`** (`worried`), `:100`
(`curious`); `forgot-client.tsx:63` (`curious`); `dark-gauntlet.tsx:438` (`sleepy`) correct.
What I tried to refute it with: (1) the damper — a bird resting in a chord holds no damper (only `sleep` does), so the
flick fires; (2) explicit `[x, ...]` keyframes override the current value, so motion starts from 0/1, not from the chord;
`scaleX` is not in the flick, so a sad crest ends `0.44` wide and `1.0` tall — the finder's `matrix(0.44, 0, 0, 1, 0, 0)`.
Why it stands: certain, and on every surface whose whole message is carried by the bird's mood (a dead reset link, an
expired confirmation).
Live check run: none possible.
Corrections to the finding: verify-client line.
Orchestrator action: none (the finder's public `/reset-password?token=nonsense` read works, on production or on a phone
viewport locally; a desktop localhost load never plays the sad beat — T9-02).

### T9-14 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain for the offset; visibility under the closing glass is a judgment
Citations re-derived: `contributed-hoopoe.tsx:113-118` (`flyAway` measures `birdRef`, the wrapper div at `:215`),
`:148-150` (`await h.hop(1, "left")`), `hoopoe.tsx:624-626` (`rootX.current += s * 16`, root animated to `x: rootX`),
`fly-away-hoopoe.tsx:84-93` (a fresh rig at `left/top` of that rect) — correct. Default `size = 104` (`:80`), so 16 view-box
units = 16 x 104/120 = 13.9 px. The room's wiring moved but is the same shape (`contribute-room.tsx:221-225, :307`).
What I tried to refute it with: a later hop back (`useHoopoeLife`'s `hop(1)` has no direction, `s = 0`, so `rootX` never
returns), and a reset of `rootX` in `rest()`/`cancel()` — none (`rest()` restores pose, deliberately not position,
`hoopoe-playground.tsx:86-87` says so).
Live check run: none possible.
Corrections to the finding: none.
Orchestrator action: none.

## New candidates

### VT9-01 — On /signup's register step, any error after the first 15 seconds drops the bird's wings off its eyes and leaves them hanging out of place until the password reveal is toggled
- Severity: Low
- Confidence: likely (every line read; the "half-hung" look is the geometry of `rotate 0` at `x 6, y -17`, which the
  finder already described for /login's narrow poke case; one screenshot settles how it reads)
- Where: `src/components/auth/signup-form.tsx:370, 377, 383, 389, 402, 410, 419, 442` (`hoopoe.react("error")` on
  every validation and server refusal), `hoopoe.tsx:1238-1239` (`react("error")` = `sequence(["express", "worried"],
  ["shake", 1])`), `hoopoe.tsx:494-505` (`express()` writes `leftWing/rightWing { rotate: 0 }` and nothing else on the
  wings), `hoopoe.tsx:1019-1022` (`coverEyes()` = `rotate ∓163, x ±6, y -17`), `signup-form.tsx:290-352` (the tuck: a
  re-assert watch that stops at `waited < 15000`, `:342`; after it, the effect re-runs only when `showPw` or the
  `hoopoe` prop object changes, and an error is state inside the form, so signup-client does not re-render)
- Taxonomy: 6a (state assumed, not read: two writers of one pose), 6b
- Expected: mascot.md:165 ("Sign in, sign up, reset password | Covers its eyes while the password is hidden … reacts to
  errors and success"); the poke code says
  the same rule out loud ("a tap must not be the thing that uncovers them … the startle is applyChord, not express(),
  which levels the wings", `hoopoe.tsx:1069-1075`), and /reset-password already obeys it: both of its error paths
  re-cover by hand (`reset-client.tsx:113-114`, `:130-131`: `express("worried")` then `setTimeout(coverEyes, 1200/1400)`).
- Actual: a member fills in the register step (name, email, password, batch; well over 15 s), presses Join and gets a
  refusal — password too short (`:370`), email taken, rate-limited, bot check. The bird looks worried and shakes its
  head, and its wings swing down off its eyes but stay shifted up and in by the cover's translation: the "wings
  stranded half-hung at the bird's sides" look the owner reported from Safari on 2026-08-18 (`signup-client.tsx:72-77`).
  It stays that way, eyes uncovered over a hidden password, until the member toggles the reveal.
- Why: `express()` is the one queued verb that touches the wings, and it levels only their rotation; the register step
  calls it on every error and, unlike /reset-password, never re-covers; the tuck's watch that would re-assert the pose
  "the moment that intruder finishes" ends at 15 s.
- Proof: argue-only from code, or with a throwaway: on /signup at 1440x900 (production, or a phone viewport locally —
  T9-02), pass the trivia, wait 20 s on the register step, enter a 5-character password and press Join; read
  `getComputedStyle(document.querySelector('[data-part=leftWing]')).transform` -> a pure translation (no rotation)
  where a ~-163deg matrix is expected. No account is created (the length check refuses client-side, `:368-373`).
- Fix direction: re-cover after an error the way reset-client does (or make `react("error")`'s face change through
  `applyChord`, which leaves the wings alone, as `poke()` already does); simplest is a `react("error").then(tuck)`.
- Gate: none needed beyond the fix; the lab room can show it.
- Known-related: T9-02's "production-reachable crack" on /login (same `express()` levelling, much narrower trigger);
  T9-03 (if the member toggles the reveal inside express's ~350 ms spring, the unqueued wing write supersedes the
  awaited one and the bird jams as well).

## Cross-zone notes
- **L7 / V-L-d** — T9-04 is the no-tap instance of L7-03's `dynamic()` census; fold them into one fix unit with
  T8b-07 (global boundary, canonical per V-T8) and T8b-15 (`reset` vs retry). Correction for L7-03's own proof: /feed and
  /welcome carry the rig STATICALLY (`celebration-detector.tsx:21`, `post-feed.tsx:11`), so use /letters to reproduce.
- **L9 / V-L-d** — L9's A46 row is T9-11 (T9-11 canonical); A31 (`rare-idle-behaviors.ts:15-18`) sits in the same header
  and should be edited with it. Add T9-11's two new items (moment-hoopoe.tsx:24-43 misplaced docblock, :89-90).
- **L5 / V-L-c** — T9-12's lines moved (`feed/page.tsx:77`, the page's own user read `:56-59`, now selecting
  `guideSeenAt` too); the EXPLAIN above (1.8 ms, index-backed) supports L5's "checkouts, not scans" reading.
- **T5 / V-T5** — VT9-01 is on T5's surface (signup-form); and every localhost observation of an auth-page bird at desktop
  width is unreliable (T9-02), which matters for any T5 finding or live check that read the bird on localhost.
- **Orchestrator (bugs.md)** — #20 should be rewritten with T9-02's mechanism and "check production first"; its
  "Suspect the ambient idle loop or the damper" points a fix session at code that is not the cause.

## Coverage
- Checked completely at HEAD 88642426: T9-01, T9-02, T9-03, T9-04, T9-05, T9-06, T9-07, T9-08, T9-09, T9-10, T9-11,
  T9-12, T9-13, T9-14 (14 of 14). Every cited `file:line` reopened at HEAD; moved lines corrected in each verdict.
- Files changed since 495ecdd2 that touch this zone, read in their changed parts: `celebration-detector.tsx` (guide
  hold, +6 lines), `hoopoe-playground.tsx`, `login-client.tsx`, `landing-hero.tsx`, `sidebar.tsx` (Link import only),
  `verify-client.tsx`, `trivia-gate.tsx`, `feed/page.tsx`, `welcome/page.tsx`, `contribute-room.tsx`. `hoopoe.tsx`,
  `use-flight-arrival.ts`, `mascot-flight-layer.tsx`, `sidebar-hoopoe.tsx`, `moment-hoopoe.tsx`, `one-hoopoe-guard.ts`,
  `use-hoopoe-life.ts`, `contributed-hoopoe.tsx`, `fly-away-hoopoe.tsx`, `celebration-signals.tsx`, `perching-birds.tsx`
  are unchanged; none of the 14 is FIXED-SINCE or MOOT-SINCE.
- Library facts re-verified in the INSTALLED versions (motion/motion-dom/framer-motion 12.38.0, React 19.2.4, Next now
  16.3.8): `JSAnimation.stop/cancel/teardown`, `WithPromise`, `AsyncMotionValueAnimation` (sync flush on `.finished`),
  `GroupAnimation.finished`, `MotionValue.start/stop`, `animateTarget`'s skip rule, framer-motion `animateSubject` +
  `createScopedAnimate`, React dev `doubleInvokeEffectsOnFiber` + hydration PlacementDEV, Next `define-env.js`,
  `config-shared.js` default, `lazy-dynamic/loadable.js`.
- Live checks: one read-only EXPLAIN (T9-12). No browser, no sign-in, no writes, no scratch files.
- Partially checked: T9-02's production half (needs one computed-style read on rishivalley.space — orchestrator action
  in the verdict); T9-03's odds (computed, not observed); T9-04's real-world frequency.
- Leads-routed rows naming T9: the T4b lead (FlyAwayHoopoe outside the Dialog) is in T9's Verified clean and still
  holds at HEAD (`contribute-room.tsx:221-225`); the rest are T9's outbound leads, ruled in Cross-zone notes above.

STATUS: COMPLETE at HEAD 88642426
