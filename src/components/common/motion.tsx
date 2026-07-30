"use client";

/* ------------------------------------------------------------------ *
 *  Shared motion foundation for the real app. One spring set, one set
 *  of ease curves, and two primitives (FadeRise, SpringPress), so every
 *  promoted delight reads like one hand made it. Ported from the
 *  /lab lab kit. Light-mode app; transform/opacity only.
 *
 *  Owner decision: motion runs all the time, by choice. We deliberately
 *  do NOT gate any of this on the OS prefers-reduced-motion setting.
 * ------------------------------------------------------------------ */

import { motion, type MotionProps } from "motion/react";
import { useEffect, useState, type ReactNode, type CSSProperties } from "react";

/* one spring set to rule them all (matches the v2 / lab feel) */
export const SPRINGS = {
  gentle: { type: "spring", stiffness: 210, damping: 24, mass: 0.9 } as const, // enters, route changes
  snappy: { type: "spring", stiffness: 420, damping: 30 } as const, // pills, presses, avatars
  settle: { type: "spring", stiffness: 160, damping: 22 } as const, // ambient, breathing
};

/* ease curves for multi-keyframe tweens (never pair 3+ keyframes with a spring) */
export const EASE_POP = [0.34, 1.56, 0.64, 1] as const; // anticipation + overshoot
export const EASE_SPRING = [0.34, 1.5, 0.64, 1] as const; // softer settle

/* A single decelerating swipe with zero overshoot: starts at full speed,
   settles smoothly into place, never bounces past the target and back. Use
   this (not EASE_SPRING/EASE_POP) for anything that SLIDES to a final resting
   position -- a panel, a photo, a page -- where a spring-style overshoot
   would read as the layout "wobbling", rather than a bounce that suits a
   small playful UI detail. */
export const EASE_OUT_SMOOTH = [0.16, 1, 0.3, 1] as const;

/* A symmetric ease-in-out for LARGE, full-screen travel: a scene change rather
   than a UI response. `EASE_OUT_SMOOTH` deliberately starts at full speed, which
   is right for a small panel answering a click but reads as an abrupt lurch when
   the thing moving is a viewport-sized photo -- there is no ramp-up, so the eye
   never gets to follow it away. This curve eases in, carries, and settles, so a
   long slide feels like one continuous gesture. Weighted slightly toward the
   out-side (0.55 rather than a true symmetric 0.65) so the first frame still
   answers the click promptly instead of feeling laggy. */
export const EASE_IN_OUT_SCENE = [0.55, 0, 0.25, 1] as const;

/* How long the landing -> auth photo slide takes. Exported so the photo, the
   headline exit, and both gradient crossfades stay locked to one number: they
   are one gesture, and drifting them apart is what makes a handoff look busy. */
export const AUTH_SLIDE_SECONDS = 0.9;

/* The sidebar active-row marker glides with a touch more weight than `snappy`, so the pill and its
   cinnamon edge settle rather than snap dead. Shared so any future edge-marker reads the same. */
export const NAV_MARKER_SPRING = { type: "spring", stiffness: 480, damping: 38, mass: 0.9 } as const;

/* ------------------------------------------------------------------ *
 *  useMotionGovernor — the ONE place that decides whether ambient/
 *  signature motion runs. Per the design system (sec. 7), animations
 *  always play: we never derive anything here from the OS
 *  prefers-reduced-motion setting. The only thing that pauses motion is
 *  the browser tab being hidden (battery/CPU courtesy, not preference).
 *
 *  - `paused`: true while the tab is hidden. Ambient/looping motion
 *    (idle loops, drifting leaves, hopping birds) should stop advancing
 *    while this is true and resume seamlessly when it flips back.
 *  - `ambientReduced`: always false. Kept as a named field (rather than
 *    just returning `paused`) so call sites read intent-fully and so a
 *    future, explicitly-owner-approved in-app "reduce motion" toggle
 *    has one seam to land in without another repointing pass. It must
 *    NEVER be wired to `window.matchMedia("(prefers-reduced-motion)")`.
 * ------------------------------------------------------------------ */
export function useMotionGovernor(): { paused: boolean; ambientReduced: boolean } {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return { paused, ambientReduced: false };
}

/* Content rises a touch as it arrives. Hydration-safe: server and client both
   render the initial frame, then the client animates (no reduced-motion branching). */
export function FadeRise({
  children,
  delay = 0,
  y = 10,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRINGS.gentle, delay }}
    >
      {children}
    </motion.div>
  );
}

/* A clear press on every clickable: a sink on tap, one spring.
 *
 * Deliberately has NO hover transform. Per the owner (2026-07-25), hover must
 * never move a control -- a colour change is the whole hover story. The tap
 * sink stays because that is feedback for an action you took, not a control
 * shifting under an idle cursor. */
export function SpringPress({
  children,
  className,
  onClick,
  as = "button",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "button" | "div" | "a" | "span";
} & MotionProps) {
  const Comp = (motion as unknown as Record<string, typeof motion.button>)[as] ?? motion.button;
  return (
    <Comp
      className={className}
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      transition={SPRINGS.snappy}
      {...rest}
    >
      {children}
    </Comp>
  );
}
