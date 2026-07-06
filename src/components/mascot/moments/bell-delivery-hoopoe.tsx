"use client";

/* ------------------------------------------------------------------ *
 *  Bell delivery — mascot-moments idea #11 ("The bird brings the
 *  mail"), owner-approved with two conditions verbatim from the brief:
 *
 *    "We definitely shouldn't do it every time they click on the
 *    notifications. And we have to make sure that the notification
 *    thing opens only after the bird lands and delivers the letter."
 *
 *  So this is deliberately rare (see `shouldOfferBellDelivery` below:
 *  only when there ARE unread notifications, and at most once per
 *  calendar day per browser via a localStorage stamp) and the panel
 *  MUST NOT open until this component's delivery beat is done — the
 *  caller (notification-bell.tsx) is the one that actually flips the
 *  dropdown open, gated on this component's `onDelivered` callback.
 *
 *  Sequence: a small "letter" glyph appears as if picked up (the bird
 *  is carrying it), `flyIn("top")` swoops the puppet onto its own
 *  mount point (the caller positions that mount point exactly on the
 *  bell, so no explicit target is needed), `land()` is the physical
 *  "sets it down" squash, the letter drops away, a happy `nod`, then
 *  `onDelivered()` fires (the panel may open now) before the whole
 *  thing fades out and calls `onFinished()` so the caller can unmount.
 *
 *  One-hoopoe rule: the CALLER checks `anotherHoopoeOnScreen()`
 *  (one-hoopoe-guard.ts) before ever mounting this component, same
 *  pattern celebration-detector.tsx uses for celebration-hoopoe.tsx —
 *  by the time this component's onReady could fire, its own bird
 *  would already be in the DOM, so a self-check here would always see
 *  itself and never proceed.
 *
 *  IMPORTANT — this component is mounted UNCONDITIONALLY by the caller
 *  (notification-bell.tsx), for the page's whole life, with `anchorRect`
 *  starting `null` and flipping to a rect only while a delivery plays.
 *  Do NOT go back to conditionally creating `<BellDeliveryHoopoe>` only
 *  when a delivery starts (`anchorRect && <BellDeliveryHoopoe .../>`) —
 *  that was the original, broken shape and it produced a real bug: React's
 *  dev-only Strict Mode double-invokes every EFFECT that mounts in a given
 *  commit, including a plain cleanup-only `useEffect(() => () => {...}, [])`.
 *  When this component and its child `<Hoopoe>` mounted TOGETHER in the
 *  same commit (the old shape), the double-invoke synchronously ran (mount
 *  -> simulated cleanup -> simulated remount) for BOTH of them in the same
 *  tick: `<Hoopoe>`'s onReady fired and armed `readyTimerRef` with a
 *  `setTimeout(fn, 0)`, and this component's OWN cleanup-only effect
 *  (`readyTimerRef`'s safety net for a genuine unmount) then immediately
 *  cleared that very timer during ITS simulated cleanup — before the timer
 *  ever got a macrotask turn to fire. `<Hoopoe>`'s onReady never fires a
 *  second time (it's a once-per-mount guard), so `play()` never ran at
 *  all: the letter never delivered, `onDelivered`/`onFinished` never
 *  fired, and the bird sat on screen forever (confirmed empirically —
 *  `readyTimerRef` was non-null at the moment of that cleanup call).
 *  Keeping this component mounted from page load, with only the inner
 *  `<Hoopoe>` mounting later (same pattern as sidebar-hoopoe.tsx and
 *  logo-easter-egg-hoopoe.tsx, where the ref-owning wrapper is always
 *  mounted early and the puppet mounts on demand), means THIS component's
 *  own mount-time double-invoke settles at page load, long before any
 *  `readyTimerRef` is ever armed — so there is nothing for it to race.
 *
 *  Transform + opacity only, springs from src/components/common/motion.tsx.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Mail } from "lucide-react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { SPRINGS } from "@/components/common/motion";

const RIG_SIZE = 46;

// A real awaitable pause (NOT hoopoe-kit's `wait()`, which builds a `{wait}`
// Step for `sequence()` and resolves instantly if awaited directly outside
// one). Same helper hoopoe.tsx and mascot-flight-layer.tsx use.
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const STAMP_KEY = "rv:moment:bellDelivery:lastShownDate";

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Rule (verbatim from the brief): only offer the delivery when there ARE
 * unread notifications, and at most once per calendar day per browser. Both
 * localStorage and matchMedia are wrapped in guards so a private-mode quota
 * error or an old browser without `matchMedia` fails OPEN (never gates,
 * just opens the panel normally) rather than ever throwing or silently
 * wedging the panel shut.
 *
 * `prefers-reduced-motion` is checked here too, deliberately narrow to
 * THIS gating decision: the app-wide rule (src/components/common/motion.tsx)
 * is that decorative mascot motion never branches on the OS setting, and
 * that stays true — we are not disabling any bird's motion because of it.
 * What we're avoiding is BLOCKING a real UI action (opening the
 * notifications panel) behind an animation for someone who has asked the
 * OS to minimize motion; skipping the delivery for them means the panel
 * just opens immediately, same as any other day this moment doesn't fire.
 */
export function shouldOfferBellDelivery(hasUnread: boolean): boolean {
  if (!hasUnread) return false;
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  } catch {
    // matchMedia unsupported — proceed, motion is the safe default everywhere else
  }
  try {
    if (window.localStorage.getItem(STAMP_KEY) === todayStamp()) return false;
  } catch {
    return false; // storage blocked — fail open to plain instant behaviour, never gate blind
  }
  return true;
}

/** Consumed the instant we commit to playing the delivery (not after it
 *  finishes), so a second bell-open mid-animation can't re-arm the gate. */
export function markBellDeliveryShownToday(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STAMP_KEY, todayStamp());
  } catch {
    // storage disabled — worst case the moment can offer again same day; never crash for it
  }
}

export interface BellRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function BellDeliveryHoopoe({
  anchorRect,
  onDelivered,
  onFinished,
}: {
  /** The bell trigger's client rect at the moment a delivery starts; `null`
   *  the rest of the time (this component is always mounted — see the file
   *  banner comment for why). The puppet mounts centred on the rect so
   *  `flyIn`'s default target (its own rest anchor) IS the bell. */
  anchorRect: BellRect | null;
  /** Fires once, the instant the letter has been set down — the caller
   *  opens the notification panel here, not before. */
  onDelivered: () => void;
  /** Fires once the whole visual (bird + letter) has faded out, safe to unmount. */
  onFinished: () => void;
}) {
  const [letterPhase, setLetterPhase] = useState<"hidden" | "carrying" | "dropped">("hidden");
  const [fadeOut, setFadeOut] = useState(false);
  // Refs so the onReady closure (captured once, per hoopoe.tsx's
  // once-per-mount guard) always calls the latest callbacks.
  const onDeliveredRef = useRef(onDelivered);
  onDeliveredRef.current = onDelivered;
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Safe now that this component mounts once at page load (see file banner):
  // by the time a delivery ever arms `readyTimerRef`, this effect's own
  // Strict-Mode double-invoke settled long ago with nothing to clear.
  useEffect(() => () => {
    if (readyTimerRef.current !== null) clearTimeout(readyTimerRef.current);
  }, []);

  // This component stays mounted across many deliveries (today's, and any
  // future day's), so `letterPhase`/`fadeOut` must not carry a previous
  // delivery's end-state (`"dropped"` / faded out) into the next one's first
  // paint. Reset them the instant a NEW anchorRect arrives — React's
  // documented "adjust state while rendering" pattern (a `useState`, not a
  // ref, so it stays render-safe): https://react.dev/learn/you-might-not-need-an-effect
  const [prevAnchorRect, setPrevAnchorRect] = useState<BellRect | null>(null);
  if (anchorRect !== prevAnchorRect) {
    setPrevAnchorRect(anchorRect);
    if (anchorRect && (letterPhase !== "hidden" || fadeOut)) {
      setLetterPhase("hidden");
      setFadeOut(false);
    }
  }

  async function play(api: HoopoeApi) {
    setLetterPhase("carrying");
    await api.flyIn("top"); // swoops onto its own mount point == the bell
    await api.land(); // the physical "sets it down" squash
    setLetterPhase("dropped");
    await sleep(240);
    await api.nod(1);
    onDeliveredRef.current(); // gate satisfied: the panel may open now
    await sleep(160);
    setFadeOut(true);
    await sleep(260);
    onFinishedRef.current();
  }

  if (typeof document === "undefined" || !anchorRect) return null;

  const cx = anchorRect.left + anchorRect.width / 2;
  const cy = anchorRect.top + anchorRect.height / 2;

  return createPortal(
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-[70]"
      style={{ left: cx - RIG_SIZE / 2, top: cy - RIG_SIZE / 2, width: RIG_SIZE, height: RIG_SIZE }}
      initial={{ opacity: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={SPRINGS.settle}
    >
      <Hoopoe
        size={RIG_SIZE}
        idle={false}
        onReady={(api) => {
          // Deferred one tick past mount, same defensive pattern as
          // sidebar-hoopoe.tsx's onReady: React Strict Mode's dev-only mount
          // -> cleanup -> remount dance runs synchronously, and a verb chain
          // kicked off from directly inside onReady can race it (the
          // simulated cleanup can `.stop()` an animation that just
          // started). A `setTimeout(fn, 0)` lets that dance settle first —
          // and because THIS component (unlike its child `<Hoopoe>`) is
          // mounted once at page load rather than fresh per delivery, its
          // own `readyTimerRef` cleanup effect (above) never races this
          // timer (see the file banner comment for the bug that happens
          // when that invariant is broken).
          readyTimerRef.current = setTimeout(() => void play(api), 0);
        }}
      />
      {/* The carried letter: a small cinnamon pill near the bill, faded in
          the instant it "picks up" the letter, dropped + faded once set down. */}
      <motion.span
        className="absolute left-[56%] top-[40%] grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cinnamon text-white shadow-[0_2px_6px_rgba(194,98,47,0.35)]"
        initial={{ opacity: 0, scale: 0.4, y: 0 }}
        animate={
          letterPhase === "hidden"
            ? { opacity: 0, scale: 0.4, y: 0 }
            : letterPhase === "carrying"
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 0.7, y: 9 }
        }
        transition={SPRINGS.gentle}
      >
        <Mail size={11} strokeWidth={2.2} />
      </motion.span>
    </motion.div>,
    document.body
  );
}
