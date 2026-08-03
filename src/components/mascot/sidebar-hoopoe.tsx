"use client";

/* ------------------------------------------------------------------ *
 *  SidebarHoopoe — the "idle-rest" moment: if nobody has touched the
 *  page in a while, the resident hoopoe glides in and settles, eyes
 *  closed, on top of the sidebar's bottom-left profile entry. The very
 *  first interaction wakes it (eyes open, a small startle-stretch) and
 *  it flies off to the LEFT, out of the viewport.
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
 *  The exit is the part that has to be defensive, and it is worth knowing
 *  why before touching it (owner, 2026-08-03: "it works like 60% of the
 *  time ... the hoopoe just stays there and doesn't fly away"). Every step
 *  of it is awaited on the puppet's controller, and a motion v12 animation
 *  that gets superseded never resolves its `.finished`, so any step can
 *  simply never return. So: the whole exit races EXIT_DEADLINE_MS and the
 *  teardown runs either way, which is what makes "waking" an escapable
 *  state rather than a permanent one. `scripts/qa/sidebar-hoopoe-probe.mjs`
 *  measures it (6 of 11 runs stuck before, 0 of 33 after).
 *
 *  It also has to stay out of the way of the in-rail account menu, whose
 *  rows expand into the exact strip of rail the bird perches in: it does
 *  not arrive while that menu is open, and a press on the account pill
 *  startles it off immediately instead of playing the full wake first.
 *  See `accountMenuOpen()` below for why neither re-anchoring nor
 *  restacking can solve that instead.
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
// How long the whole exit (wake + flight) is allowed to take before we stop
// waiting on the puppet and tear it down anyway.
//
// THIS IS THE FIX for "it just stays there and doesn't fly away" (owner,
// 2026-08-03). Every await in `runWake` goes through the mascot controller,
// and motion v12 never resolves `.finished` for an animation that was stopped
// or SUPERSEDED by another write to the same property (the same gotcha the
// controller's own abort token exists for -- hoopoe.tsx:225-227 -- and that
// arcAndLand already dodges by hand for the landing legs, hoopoe.tsx:676-679).
// So any one of those awaits can simply never settle. It used to pin the phase
// at "waking" forever, and "waking" was the one state nothing could leave, so
// the bird sat on the rail until a page reload. Measured at 6 of 11 runs by
// scripts/qa/sidebar-hoopoe-probe.mjs, including one where the flight had
// visibly finished (ink at x=-202, fully off-screen) and only the promise was
// stuck. Racing the chain against this deadline makes a hang cosmetic at
// worst: the bird leaves without its exit animation instead of never leaving.
//
// 2600ms is the longest legitimate exit plus headroom: wake() is a 500ms
// stretch, a gentle chord settle and two 200ms blinks (~1.1s), and flyTo's
// arc is capped at 1.9s by `clamp(0.95 + dist/150, 1.0, 1.9)` but runs ~1.0s
// over the short hop off the rail.
const EXIT_DEADLINE_MS = 2_600;

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

    async function runWake(api: HoopoeApi, startled = false) {
      const wasAsleep = phaseRef.current === "asleep" && !startled;
      phaseRef.current = "waking";
      // Measured BEFORE the wake, not after it. The press that wakes the bird
      // is usually the account pill, which expands the rows upward and moves
      // this wrapper with them; a rect read after that shift aimed the exit at
      // where the perch had moved to rather than where the bird actually is.
      const r = wrapRef.current?.getBoundingClientRect();
      const y = r ? r.top + r.height / 2 : 0;
      await Promise.race([
        (async () => {
          if (wasAsleep) await api.wake();
          await api.flyTo({ x: EXIT_X, y });
        })(),
        new Promise<void>((resolve) => setTimeout(resolve, EXIT_DEADLINE_MS)),
      ]);
      // Reached on both branches, so the teardown happens whether the flight
      // finished or the deadline won. Unmounting is what actually removes the
      // bird; the rig's own unmount cleanup stops anything still live.
      phaseRef.current = "waiting";
      apiRef.current = null;
      setMounted(false);
      armIdle();
    }

    function handleActivity(e: Event) {
      const phase = phaseRef.current;
      if (phase === "waiting") {
        armIdle();
        return;
      }
      if ((phase === "entering" || phase === "asleep") && apiRef.current) {
        // A press on the account pill is the one activity that does not just
        // wake the bird, it takes its perch: the rows open into exactly the
        // 62px it is standing in, so the usual leisurely exit (a 500ms stretch,
        // a chord settle and two blinks before it even takes off) leaves it
        // sitting on "My profile" for ~2.2s. Startled, it skips the stretch and
        // just goes, which halves that and reads as being displaced rather than
        // as ignoring you. `closest` on the pressed node, not a check of the
        // menu's own state, because pointerdown lands BEFORE React flips it.
        const target = e.target;
        const startled =
          target instanceof Element &&
          target.closest('aside button[aria-expanded]') !== null;
        void runWake(apiRef.current, startled);
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
      className="pointer-events-none absolute -top-[62px] left-0 z-10"
    >
      <Hoopoe size={RIG_SIZE} onReady={handleReady} />
    </div>
  );
}
