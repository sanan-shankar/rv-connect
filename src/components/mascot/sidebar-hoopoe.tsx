"use client";

/* ------------------------------------------------------------------ *
 *  SidebarHoopoe — the "idle-rest" moment: if nobody has touched the
 *  page in a while, the resident hoopoe glides in and settles, eyes
 *  closed, on top of the sidebar's bottom-left profile entry. The very
 *  first interaction startles it off the perch and it flies away to the
 *  LEFT, out of the viewport.
 *
 *  Desktop sidebar only (the mount point in sidebar.tsx only exists next
 *  to the desktop `UserMenu`; mobile has no equivalent row). Gated by its
 *  own `matchMedia` check rather than relying on the aside's `hidden
 *  md:flex` alone, so no idle timer or activity listeners run on mobile
 *  at all.
 *
 *  Idle detection: one fixed set of passive `window` listeners plus one
 *  `setTimeout`, reset on every activity event. No polling loop, no
 *  interval — the browser's own event queue is the "poll".
 *
 *  THE EXIT is the part that has to be defensive, and it is worth reading
 *  runWake's comments before touching it (owner, 2026-08-03: "it works like
 *  60% of the time ... the hoopoe just stays there and doesn't fly away").
 *  Every step of it is awaited on the puppet's controller, and a motion v12
 *  animation that gets superseded never resolves its `.finished`, so a step
 *  can simply never return. Three things together make the departure sure:
 *  `stop()` clears the queue so the flight cannot be trapped behind a hung
 *  entrance or sleep; the flight races EXIT_DEADLINE_MS, sized ABOVE the
 *  measured flight rather than estimated from the animation constants; and
 *  when that deadline does win, the wrapper fades on plain CSS opacity
 *  instead of the bird being unmounted mid-air. Measure any change to this
 *  with `scripts/qa/sidebar-hoopoe-probe.mjs`, which reports the flight's
 *  frame-by-frame x trace and so can tell a real departure apart from a
 *  teardown that merely left the DOM in the same state.
 *
 *  It also has to stay out of the way of the in-rail account menu, whose
 *  rows expand into the exact strip of rail the bird perches in, so it does
 *  not arrive while that menu is open. See `accountMenuOpen()` below for why
 *  neither re-anchoring nor restacking can solve that instead.
 *
 *  One-hoopoe rule: `anotherHoopoeOnScreen()` (moments/one-hoopoe-guard.ts)
 *  is the shared guard every moment checks before showing its own bird —
 *  it just looks for the `hoopoe-mascot` class every `<Hoopoe>` render
 *  carries, so it needs no dedicated bus module and already covers the
 *  login/signup birds, the landing scroll companion, any other resident
 *  or empty-state moment, and the cross-page flight layer (mascot-
 *  flight.ts). If one is up, this stays quiet and checks again shortly
 *  rather than waiting out a whole fresh idle window — the visitor is
 *  still idle either way.
 *
 *  The entrance and exit are both same-mount primitives (`flyIn`/`flyTo`
 *  on the puppet's own queued controller), not the cross-page flight bus
 *  — the bird never needs to survive a navigation here, it just swoops
 *  onto (and later off) a fixed spot within the always-mounted sidebar.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { Hoopoe } from "./hoopoe";
import { rand, type HoopoeApi } from "./hoopoe-kit";
import { maybePlayRareIdleBehaviour } from "./moments/rare-idle-behaviors";
import { anotherHoopoeOnScreen } from "./moments/one-hoopoe-guard";

const IDLE_MIN_MS = 90_000;
const IDLE_MAX_MS = 120_000;
// How soon to recheck the one-hoopoe guard when blocked. Short, because the
// visitor hasn't done anything new — they're still idle, just waiting on
// whatever else currently owns the bird.
const BLOCKED_RETRY_MS = 8_000;
const RIG_SIZE = 60;
// Comfortably past the sidebar's own left edge (already flush against the
// viewport edge), so the puppet is fully off past x=0 well before its flight
// finishes; `html { overflow-x: clip }` (globals.css) keeps it from ever
// creating a horizontal scrollbar as it passes the edge.
const EXIT_X = -200;
// How long the exit flight is allowed to take before we stop waiting on the
// puppet and take the bird away ourselves.
//
// Every step of the exit is awaited on the mascot controller, and motion v12
// never resolves `.finished` for an animation that was stopped or SUPERSEDED
// by another write to the same property (the gotcha the controller's own abort
// token exists for, hoopoe.tsx:225-227, and that arcAndLand dodges by hand for
// the landing legs, hoopoe.tsx:676-679). So a step can simply never return,
// which used to pin the phase at "waking" -- the one state nothing could leave
// -- and the bird sat on the rail until a reload.
//
// SIZE THIS ABOVE THE REAL FLIGHT, and measure it, do not estimate it. The
// first attempt at this guessed 2600ms from the animation constants and was
// less than half the truth, so it fired on perfectly healthy exits and the
// bird vanished mid-departure (owner: "it suddenly just cut and was basically
// deleted"). The flight is measured at ~2.5s once `stop()` clears the queue
// (`scripts/qa/sidebar-hoopoe-probe.mjs` reports minX and the frame trace);
// 5000ms leaves room for a slow machine without letting a genuine hang sit
// there for long.
const EXIT_DEADLINE_MS = 5_000;
// The backstop fade, when the deadline wins. Long enough to read as leaving,
// short enough that nobody waits on it. Must stay just above the wrapper's
// `duration-200` (a literal class, because Tailwind cannot extract an
// interpolated one), so the element is only unmounted after the fade has
// actually finished painting.
const FADE_MS = 220;

type Phase = "waiting" | "entering" | "asleep" | "waking";

/**
 * Is the in-rail account menu expanded right now?
 *
 * The wrapper is anchored 62px above the account section's top edge and the rig
 * box is 76px tall, so the bird's box always reaches 14px PAST that edge, onto
 * whatever the section's first element happens to be. While that section was
 * just the pill, that 14px was the whole charm: the bird perches ON your
 * profile tab. Since the rows became part of the rail (2026-08-03, `c54671a`)
 * they grow upward out of the pill and become the first element, so the same
 * 14px now lands on "My profile" (measured: ink bottom 619 against a first row
 * at 605, scripts/qa/sidebar-hoopoe-shots.mjs), and the bird's wrapper is the
 * only z-indexed thing down there, so it paints over the open menu.
 *
 * Re-anchoring cannot solve it, which is worth recording so nobody retries it:
 * anchoring to the pill instead moves the bird DEEPER into the rows (they sit
 * directly above the pill), and dropping the z-index only turns "bird over a
 * label" into "label over a bird", since the rows are transparent at rest.
 * The bird's perch and the open menu want the same 76px of rail. So the rule
 * is simply that they never hold it at once.
 *
 * Read off the DOM rather than threaded through as a prop: `open` lives inside
 * AccountSection, where it is adjusted during render off the route (the React
 * adjust-state-on-prop-change pattern), and lifting it to a shared parent would
 * turn that into a cross-component setState during render. The pill already
 * publishes the fact as `aria-expanded` for assistive tech. Same reasoning as
 * `anotherHoopoeOnScreen()`: a signal already in the DOM beats a bus module
 * built to carry it.
 *
 * Only the ARRIVAL needs this. A press on the pill is a `pointerdown`, so a
 * bird already perched is sent away by the normal activity path.
 */
function accountMenuOpen(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector('aside button[aria-expanded="true"]') !== null;
}

export function SidebarHoopoe() {
  const [desktop, setDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  /* Set only when the exit deadline wins: fades the wrapper instead of
     unmounting it from under the viewer. See runWake. */
  const [leaving, setLeaving] = useState(false);

  const phaseRef = useRef<Phase>("waiting");
  const apiRef = useRef<HoopoeApi | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Clears the deferred onReady timer if SidebarHoopoe itself ever unmounts
  // (e.g. a fast route change) while it's pending.
  useEffect(() => () => clearTimeout(readyTimerRef.current), []);

  // Track the md breakpoint (768px, same as the aside's own `hidden md:flex`)
  // so the idle machinery below only ever arms on desktop.
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Subscribes to the md breakpoint and mirrors it into state, so the idle machinery only ever arms on desktop.
    setDesktop(mql.matches);
    const onChange = () => setDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!desktop) {
      // A resize across the breakpoint mid-cycle: drop everything cleanly
      // rather than leaving a bird stranded off-screen or mid-flight.
      clearTimeout(timerRef.current);
      clearTimeout(readyTimerRef.current);
      phaseRef.current = "waiting";
      apiRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Tears the idle machinery down when the breakpoint stops matching, rather than leaving a bird stranded mid-flight.
      setMounted(false);
      return;
    }

    function armIdle() {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(tryEnter, rand(IDLE_MIN_MS, IDLE_MAX_MS));
    }

    function tryEnter() {
      if (phaseRef.current !== "waiting") return;
      // Same retry cadence as the one-hoopoe guard, and for the same reason:
      // the visitor is still idle, they are just sitting on an open menu.
      if (anotherHoopoeOnScreen() || accountMenuOpen()) {
        timerRef.current = setTimeout(tryEnter, BLOCKED_RETRY_MS);
        return;
      }
      phaseRef.current = "entering";
      setMounted(true);
    }

    async function runWake(api: HoopoeApi) {
      // Interrupted BEFORE it ever landed, i.e. still flying in. Do not try to
      // fly it out again: `flyTo` starts its arc from `rootX/rootY`, which the
      // entrance only writes at touchdown, so a second flight begins from the
      // off-canvas point the first one started at -- the bird teleports up and
      // then leaves (traced: "arc from 0 -174.8"). It is also the one path
      // where flyCore was seen to wedge with none of its nine takeoff
      // animations resolving, not even a 100ms opacity tween. It is already
      // mid-air and only ~60px tall, so fading is both honest and cheaper than
      // a second flight from a position we do not actually know.
      const midEntrance = phaseRef.current === "entering";
      phaseRef.current = "waking";
      // Measured BEFORE anything else. If the press was on the account pill,
      // the rows expand upward and move this wrapper with them; a rect read
      // after that shift aims the exit at where the perch moved to rather than
      // at where the bird actually is.
      const r = wrapRef.current?.getBoundingClientRect();
      const y = r ? r.top + r.height / 2 : 0;

      // Clear the puppet's queue and abort whatever it is mid-way through
      // BEFORE asking for the flight. The controller runs one step at a time,
      // so an exit enqueued behind an entrance or a sleep chord cannot start
      // until that finishes -- and if that step is one of the ones that never
      // resolves, the flight is never even reached. `stop()` also commits the
      // current pose rather than snapping it back, so the bird simply takes
      // off from wherever it had got to.
      //
      // The cost is the wake stretch: stop() clears the asleep flag, so wake()
      // would no-op, and the bird leaves with its eyes still shut. That is a
      // deliberate trade. The stretch was the single largest hang surface AND
      // it doubled the exit (4.6s measured with it, ~2.5s without), and a bird
      // that reliably leaves beats a bird that yawns first and sometimes
      // doesn't. Reads as being startled off the perch, which is what happened.
      api.stop();

      const flew = await Promise.race([
        api.flyTo({ x: EXIT_X, y }).then(() => true),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), EXIT_DEADLINE_MS)
        ),
      ]);

      // The deadline is a backstop for a flight that never resolved, and it
      // must not look like the bird was deleted (owner, 2026-08-03: "it was
      // about to fly away when it suddenly just cut and was basically deleted"
      // -- that was an earlier deadline set BELOW the real exit duration, so
      // it fired on healthy exits). Fading the wrapper is deliberately not the
      // puppet's job: it is plain opacity on a plain div, so it still works
      // when the rig itself is the thing that is wedged.
      if (!flew) {
        setLeaving(true);
        await new Promise((resolve) => setTimeout(resolve, FADE_MS));
      }
      phaseRef.current = "waiting";
      apiRef.current = null;
      setLeaving(false);
      setMounted(false);
      armIdle();
    }

    function handleActivity() {
      const phase = phaseRef.current;
      if (phase === "waiting") {
        armIdle();
        return;
      }
      if ((phase === "entering" || phase === "asleep") && apiRef.current) {
        void runWake(apiRef.current);
      }
      // "waking": already on its way out, and the exit deadline guarantees it
      // finishes, so there is nothing further to do.
    }

    const events: Array<[string, AddEventListenerOptions]> = [
      ["pointerdown", { passive: true }],
      ["pointermove", { passive: true }],
      ["keydown", { passive: true }],
      ["wheel", { passive: true }],
      ["touchstart", { passive: true }],
      ["scroll", { passive: true, capture: true }],
    ];
    events.forEach(([evt, opts]) => window.addEventListener(evt, handleActivity, opts));
    armIdle();

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(([evt, opts]) => window.removeEventListener(evt, handleActivity, opts));
    };
  }, [desktop]);

  function handleReady(api: HoopoeApi) {
    apiRef.current = api;
    // Deferred one tick past mount: React Strict Mode's dev-only mount ->
    // cleanup -> remount dance runs `<Hoopoe>`'s unmount-cleanup effect (which
    // calls `.stop()` directly on any live animation) synchronously right
    // after every mount effect fires — including this `onReady` callback. A
    // verb chain launched synchronously from here starts a live animation
    // that the cleanup immediately `.stop()`s; motion v12's `.stop()` never
    // resolves `.finished` (the same gotcha the controller's own abort token
    // works around for `stop()`/`cancel()`), so the awaited chain below would
    // hang forever mid-flight — same-looking symptom as never reaching
    // `sleep()` at all (verified empirically: an immediate onReady chain
    // sticks with eyes open; a `setTimeout(fn, 0)`-deferred one closes them).
    // By the time this fires, Strict Mode's synchronous dance has already
    // settled, so there is nothing live left for it to interrupt.
    const t = setTimeout(async () => {
      await api.flyIn("top");
      if (phaseRef.current !== "entering") return; // woken mid-flight; skip straight past the sleep beat
      // Rare idle behaviour (moments board, card 14): once in a great while,
      // instead of settling straight to sleep, it preens, pecks, or does a
      // happy hop first. A no-op almost every time (see rare-idle-behaviors.ts).
      await maybePlayRareIdleBehaviour(api);
      if (phaseRef.current !== "entering") return; // woken mid-behaviour
      phaseRef.current = "asleep";
      await api.sleep();
    }, 0);
    readyTimerRef.current = t;
  }

  if (!desktop || !mounted) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={`pointer-events-none absolute -top-[62px] left-0 z-10 transition-opacity duration-200 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <Hoopoe size={RIG_SIZE} onReady={handleReady} />
    </div>
  );
}
