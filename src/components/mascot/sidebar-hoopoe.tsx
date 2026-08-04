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
// Dev-only summon (see the listener in the effect below). How long after a
// manual summon activity is ignored, so the very keystroke that called the
// bird does not immediately scare it off again. 600ms swallows the chord
// itself plus the small pointermove of a hand coming off the keyboard, and is
// short enough that the next deliberate mouse move still triggers the wake --
// which is the half of the cycle most worth watching.
const SUMMON_GRACE_MS = 600;
// Comfortably past the sidebar's own left edge (already flush against the
// viewport edge), so the puppet is fully off past x=0 well before its flight
// finishes; `html { overflow-x: clip }` (globals.css) keeps it from ever
// creating a horizontal scrollbar as it passes the edge.
const EXIT_X = -200;

type Phase = "waiting" | "entering" | "asleep" | "waking";

export function SidebarHoopoe() {
  const [desktop, setDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  const phaseRef = useRef<Phase>("waiting");
  const apiRef = useRef<HoopoeApi | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Timestamp of the last dev-only manual summon; 0 in production, where
  // nothing writes it. See SUMMON_GRACE_MS.
  const summonedAt = useRef(0);

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
      if (anotherHoopoeOnScreen()) {
        timerRef.current = setTimeout(tryEnter, BLOCKED_RETRY_MS);
        return;
      }
      phaseRef.current = "entering";
      setMounted(true);
    }

    async function runWake(api: HoopoeApi) {
      const wasAsleep = phaseRef.current === "asleep";
      phaseRef.current = "waking";
      if (wasAsleep) await api.wake();
      const r = wrapRef.current?.getBoundingClientRect();
      const y = r ? r.top + r.height / 2 : 0;
      await api.flyTo({ x: EXIT_X, y });
      phaseRef.current = "waiting";
      apiRef.current = null;
      setMounted(false);
      armIdle();
    }

    function handleActivity() {
      // Inside a manual summon's grace window, ignore everything: see
      // SUMMON_GRACE_MS. Dead code in production, where nothing ever writes
      // summonedAt.
      if (performance.now() - summonedAt.current < SUMMON_GRACE_MS) return;
      const phase = phaseRef.current;
      if (phase === "waiting") {
        armIdle();
        return;
      }
      if ((phase === "entering" || phase === "asleep") && apiRef.current) {
        void runWake(apiRef.current);
      }
      // "waking": already on its way out, nothing further to do.
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

    // Ctrl+Shift+H: summon the bird NOW instead of waiting out the 90-120s
    // idle window. Motion is the one thing a screenshot cannot review, so the
    // only way to judge this moment is to watch it, and watching it three
    // times in a row otherwise costs five minutes of sitting still. Gated on
    // NODE_ENV, which is a compile-time constant, so the listener is not even
    // registered in a production build.
    //
    // Ctrl+Shift+H specifically: unbound in Chrome, and not the Cmd chord
    // (Cmd+Shift+H is Safari's Home). The summon writes summonedAt FIRST so
    // its own keydown falls inside the grace window above rather than being
    // read as the activity that scares the bird away.
    let stopSummon = () => {};
    if (process.env.NODE_ENV !== "production") {
      const onSummon = (e: KeyboardEvent) => {
        if (!e.ctrlKey || !e.shiftKey || e.key.toLowerCase() !== "h") return;
        e.preventDefault();
        summonedAt.current = performance.now();
        clearTimeout(timerRef.current);
        tryEnter();
      };
      window.addEventListener("keydown", onSummon);
      stopSummon = () => window.removeEventListener("keydown", onSummon);
    }

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(([evt, opts]) => window.removeEventListener(evt, handleActivity, opts));
      stopSummon();
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
