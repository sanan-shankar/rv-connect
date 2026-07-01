"use client";

/* ------------------------------------------------------------------ *
 *  Hoopoe mascot — shared foundation (springs, part map, motion
 *  governor, idle damper, expression chords, types).
 *
 *  The mascot is ONE rigged SVG puppet driven by a queued, awaitable
 *  controller. This file holds everything the rig and controller share
 *  but that has no dependency on the rendered DOM.
 *
 *  House feel: calm, warm, physical, soft, babyish. We animate ONLY
 *  transform + opacity. Geometry lives in viewBox "0 -10 120 152" user
 *  units; pivots are documented in hoopoe.tsx alongside the CSS that
 *  sets transform-box: view-box (motion defaults to fill-box, which
 *  silently breaks shared anatomical pivots).
 *
 *  Per the owner: the micro-delights are ALWAYS active. There is no
 *  reduced-motion branch anywhere in the mascot.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";

/* ---- one spring set, byte-identical to the app's house springs ---- */
export const SPRINGS = {
  gentle: { type: "spring", stiffness: 210, damping: 24, mass: 0.9 }, // body, head, warm motions, expressions, gaze settle
  snappy: { type: "spring", stiffness: 420, damping: 30 }, // eyes, flicks, pops
  settle: { type: "spring", stiffness: 160, damping: 22 }, // crest + tail follow-through, landings, return-to-rest
  soft: { type: "spring", stiffness: 120, damping: 20, mass: 1.1 }, // the gentlest: nods, shakes, baby head motions
  bounce: { type: "spring", stiffness: 235, damping: 20, mass: 0.9 }, // marginal overshoot + ~15% slower: cover eyes / peek / rest
} as const;

// duration-based easings for timeline beats (walk clock, particle drifts)
export const EASE_SPRING = [0.34, 1.5, 0.64, 1] as const;
export const EASE_POP = [0.34, 1.56, 0.64, 1] as const;
// a soft symmetric ease for head bobs and wing sweeps (no overshoot snap)
export const EASE_SOFT = [0.37, 0, 0.31, 1] as const;

/* ---- part selectors (scoped to the rig's <svg> by useAnimate) ---- */
export const PARTS = {
  root: "[data-part=root]",
  shadow: "[data-part=shadow]",
  tail: "[data-part=tail]",
  leftWing: "[data-part=leftWing]",
  rightWing: "[data-part=rightWing]",
  leftWingFold: "[data-wing=foldL]",
  rightWingFold: "[data-wing=foldR]",
  leftWingArm: "[data-wing=armL]",
  rightWingArm: "[data-wing=armR]",
  leftLeg: "[data-part=leftLeg]",
  rightLeg: "[data-part=rightLeg]",
  bodyTurn: "[data-part=bodyTurn]",
  body: "[data-part=body]",
  head: "[data-part=head]",
  crest: "[data-part=crest]",
  feather: "[data-feather]",
  browL: "[data-part=browL]",
  browR: "[data-part=browR]",
  brows: "[data-part=browL],[data-part=browR]",
  eyeBlinkL: "[data-part=eyeBlinkL]",
  eyeBlinkR: "[data-part=eyeBlinkR]",
  eyeBlink: "[data-part=eyeBlinkL],[data-part=eyeBlinkR]",
  billLower: "[data-part=billLower]",
  // eye shape layers, cross-faded by opacity (never morph `d`)
  eyeRound: "[data-eyeshape=round]",
  eyeWide: "[data-eyeshape=wide]",
  eyeHappy: "[data-eyeshape=happy]",
  eyeSleepy: "[data-eyeshape=sleepy]",
} as const;

export type EyeShape = "round" | "wide" | "happy" | "sleepy";

/* ---- public types ---- */
export type Dir = "left" | "right";
export type Target = HTMLElement | DOMRect | { x: number; y: number } | null;
export type Level = 1 | 2 | 3;

export type Expression =
  | "content"
  | "curious"
  | "happy"
  | "surprise"
  | "sad"
  | "sleepy"
  | "love"
  | "alert"
  | "proud"
  | "worried";

export type SemanticEvent =
  | "correct"
  | "wrong"
  | "success"
  | "error"
  | "thinking"
  | "greet"
  | "idleBored";

export type Step =
  | [string, ...unknown[]]
  | (() => Promise<void> | void)
  | { wait: number }
  | { parallel: Step[] };

export const wait = (ms: number): Step => ({ wait: ms });
export const parallel = (...steps: Step[]): Step => ({ parallel: steps });

export interface HoopoeApi {
  walk(steps: number, dir?: Dir): Promise<void>;
  hop(count?: number, dir?: Dir): Promise<void>;
  flyTo(target: Target): Promise<void>;
  land(): Promise<void>;
  turn(dir: Dir | 0): Promise<void>;
  point(target: Target | Dir, opts?: { label?: string; hold?: number }): Promise<void>;
  wave(times?: number): Promise<void>;
  nod(times?: number): Promise<void>;
  shake(times?: number): Promise<void>;
  crest(open: boolean): Promise<void>;
  crestFlick(): Promise<void>;
  express(name: Expression, opts?: { hold?: number }): Promise<void>;
  celebrate(level?: Level): Promise<void>;
  blinkOnce(double?: boolean): Promise<void>;
  gaze(to: number | Target): void;
  bindPassword(getRevealed: () => boolean): () => void;
  coverEyes(): void;
  peek(): void;
  sequence(...steps: Step[]): Promise<void>;
  react(event: SemanticEvent): Promise<void>;
  stop(): void;
  cancel(): void;
  rest(): Promise<void>;
  isBusy(): boolean;
}

/* ---- expression chords: an emotion is a CHORD of many parts, never a
   single note. Values are viewBox user units (x/y), degrees (rotate),
   or unitless scale. The controller fans these out through SPRINGS.

   No smile / no cheek blush (owner: too human, too "cartoon"). Brows are
   HIDDEN at rest (brow.op 0) and only fade in for the emotional poses —
   visible rest brows are what made the face read "strict / teacherly". ---- */
export interface Chord {
  crest: { sx: number; sy: number; rot: number }; // fan spread / height / tilt
  brow: { y: number; ang: number; op: number }; // y lift (neg = up), ang (deg, + tents inner-up = sad), op (opacity)
  eye: EyeShape;
  bill: number; // lower-mandible open degrees
  head: { rot: number; y: number };
  body: { sy: number; y: number };
  tail: { rot: number; sx: number };
  gaze?: { x: number; y: number }; // optional gaze bias
}

// crest.sx / .sy are MULTIPLIERS of the drawn rest fan (content == 1.0), so the
// static rest markup carries no transform and SSR stays clean.
export const EXPRESSIONS: Record<Expression, Chord> = {
  content: { crest: { sx: 1.0, sy: 1.0, rot: 0 }, brow: { y: 0, ang: 0, op: 0 }, eye: "round", bill: 0, head: { rot: 0, y: 0 }, body: { sy: 1, y: 0 }, tail: { rot: 0, sx: 1 } },
  curious: { crest: { sx: 1.16, sy: 1.06, rot: 5 }, brow: { y: -3, ang: -2, op: 0.5 }, eye: "wide", bill: 0, head: { rot: 10, y: 0 }, body: { sy: 1, y: 0 }, tail: { rot: 7, sx: 1 } },
  happy: { crest: { sx: 1.24, sy: 1.06, rot: 0 }, brow: { y: -3, ang: -1, op: 0 }, eye: "happy", bill: 4, head: { rot: 0, y: -2 }, body: { sy: 1.03, y: -1 }, tail: { rot: 6, sx: 1.06 } },
  surprise: { crest: { sx: 1.42, sy: 1.16, rot: 0 }, brow: { y: -7, ang: -1, op: 0.7 }, eye: "wide", bill: 12, head: { rot: 0, y: -2 }, body: { sy: 1.06, y: -2 }, tail: { rot: 13, sx: 1.08 } },
  // sad: the inner brow corners lift into a grief tent (NEGATIVE ang = inner-up), brows ride low and
  // strong, crest fully wilts, head droops and looks down. Clearly different from worried's furrow.
  sad: { crest: { sx: 0.44, sy: 0.78, rot: -9 }, brow: { y: 1.5, ang: -9, op: 1 }, eye: "round", bill: 0, head: { rot: 0, y: 4 }, body: { sy: 0.96, y: 3 }, tail: { rot: -16, sx: 0.93 }, gaze: { x: 0, y: 0.85 } },
  sleepy: { crest: { sx: 0.46, sy: 0.8, rot: -6 }, brow: { y: 1.5, ang: -1, op: 0.25 }, eye: "sleepy", bill: 0, head: { rot: 5, y: 3 }, body: { sy: 1, y: 1 }, tail: { rot: -9, sx: 0.95 } },
  love: { crest: { sx: 1.1, sy: 1.03, rot: 0 }, brow: { y: -2.5, ang: -1, op: 0 }, eye: "happy", bill: 2, head: { rot: 6, y: 0 }, body: { sy: 1, y: 0 }, tail: { rot: 4, sx: 1 } },
  alert: { crest: { sx: 1.06, sy: 1.22, rot: 0 }, brow: { y: -5.5, ang: -1, op: 0.7 }, eye: "wide", bill: 0, head: { rot: 0, y: -3 }, body: { sy: 1.06, y: -3 }, tail: { rot: 11, sx: 1 } },
  proud: { crest: { sx: 1.14, sy: 1.14, rot: 0 }, brow: { y: -2, ang: -2, op: 0.3 }, eye: "round", bill: 0, head: { rot: -7, y: -1 }, body: { sy: 1.06, y: -1 }, tail: { rot: 5, sx: 1.05 } },
  worried: { crest: { sx: 0.58, sy: 0.88, rot: -3 }, brow: { y: -1, ang: 4, op: 0.85 }, eye: "round", bill: 0, head: { rot: 0, y: 1 }, body: { sy: 0.99, y: 1 }, tail: { rot: -7, sx: 0.95 } },
};

/* ---- motion governor ----
   Per the owner the micro-delights are ALWAYS on (no prefers-reduced-motion
   check anywhere). The only thing we still honour is document visibility:
   ambient idle loops pause when the tab is hidden (battery), with zero
   visible difference while the tab is in view. ---- */
export function useValleyMotion(): { paused: boolean } {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const onVis = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return { paused };
}

/* ---- idle damper: depth-counted suspend/resume so actions can claim a
   clean stage (stop breathe + idle flicks) and hand it back. ---- */
export interface Damper {
  bind(onSuspend: () => void, onResume: () => void): void;
  suspend(): void;
  resume(): void;
  readonly active: boolean;
}
export function makeDamper(): Damper {
  let depth = 0;
  let onSuspend = () => {};
  let onResume = () => {};
  return {
    bind(s, r) {
      onSuspend = s;
      onResume = r;
    },
    suspend() {
      if (depth++ === 0) onSuspend();
    },
    resume() {
      if (depth > 0 && --depth === 0) onResume();
    },
    get active() {
      return depth > 0;
    },
  };
}

/* small helpers */
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
