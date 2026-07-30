"use client";

/* ------------------------------------------------------------------ *
 *  HoopoeMascot — one reusable hoopoe, many poses. Built on the exact
 *  v2 password-bird geometry, extended with motion springs, an idle
 *  blink loop, gaze tracking, a happy wing-flap and a sleepy droop.
 *  Tier-2 micro-delight (kept under reduced-motion); ambient breathe and
 *  the blink loop pause when reduced or the tab is hidden.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { SPRINGS, useValleyMotion } from "./_kit";

export type HoopoePose =
  | "idle"
  | "covered"
  | "peek"
  | "curious"
  | "happy"
  | "sleepy"
  | "point"
  | "searching";

const CREST = [-24, -12, 0, 12, 24];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function HoopoeMascot({
  size = 120,
  pose = "idle",
  gaze = 0,
  className = "",
}: {
  size?: number;
  pose?: HoopoePose;
  gaze?: number; // -1 (left) .. 1 (right), used by curious / searching / point
  className?: string;
}) {
  const { reduced, paused } = useValleyMotion();
  const [blink, setBlink] = useState(false);

  // idle blink loop, every 5 to 7s, paused when resting eyes are irrelevant
  useEffect(() => {
    if (reduced || paused || pose === "covered" || pose === "sleepy") return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
        schedule();
      }, 5000 + Math.random() * 2200);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [reduced, paused, pose]);

  const eyeOpen = pose === "sleepy" ? 0.38 : blink && pose !== "covered" ? 0.12 : 1;
  const headRot =
    pose === "curious" ? clamp(gaze * 11, -11, 11)
    : pose === "sleepy" ? 5
    : pose === "peek" ? -4
    : pose === "point" ? (gaze < 0 ? -7 : 7)
    : 0;
  const headDip = pose === "sleepy" ? 3 : 0;
  const gx = pose === "curious" || pose === "searching" ? clamp(gaze * 2.6, -3, 3) : 0;

  const cover = pose === "covered";
  const happy = pose === "happy";
  const wingL = cover ? 0 : pose === "point" && gaze < 0 ? -104 : -68;
  const wingR = cover ? 0 : pose === "point" && gaze >= 0 ? 104 : 68;

  const breathe = pose === "idle" && !reduced && !paused;

  return (
    <svg
      className={`hoopoe-mascot ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
    >
      {/* body */}
      <motion.ellipse
        cx="32" cy="40" rx="17" ry="16" fill="var(--hp-body)"
        style={{ transformBox: "view-box", transformOrigin:"32px 44px" }}
        animate={breathe ? { scaleX: [1, 1.015, 1], scaleY: [1, 0.99, 1] } : { scaleX: 1, scaleY: 1 }}
        transition={breathe ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : SPRINGS.settle}
      />

      {/* head group: tilt + dip */}
      <motion.g
        style={{ transformBox: "view-box", transformOrigin:"32px 40px" }}
        animate={{ rotate: headRot, y: headDip }}
        transition={SPRINGS.gentle}
      >
        {/* crest */}
        {CREST.map((d, i) => (
          <g key={i} transform={`rotate(${d} 32 27)`}>
            <rect x="30.3" y="1" width="3.4" height="17" rx="1.7" fill="var(--hp-crest)" />
            <circle cx="32" cy="2.6" r="2.3" fill="var(--hp-tip)" />
          </g>
        ))}
        <ellipse cx="32" cy="30" rx="13.5" ry="12" fill="var(--hp-head)" />
        <path d="M32 33 L33.4 52 Q32 54 30.6 52 Z" fill="var(--hp-beak)" />
        {/* eyes: gaze translate + blink scaleY */}
        <motion.g
          style={{ transformBox: "view-box", transformOrigin:"32px 28.5px" }}
          animate={{ x: gx, scaleY: eyeOpen }}
          transition={SPRINGS.snappy}
        >
          <circle cx="26.5" cy="28.5" r="2.6" fill="var(--hp-eye)" />
          <circle cx="37.5" cy="28.5" r="2.6" fill="var(--hp-eye)" />
        </motion.g>
      </motion.g>

      {/* wings: cover the eyes, swing to the sides, flap when happy */}
      <motion.path
        d="M23 37 Q15 21 30 18 Q34 27 30 37 Q26 39 23 37 Z"
        fill="var(--hp-wing)"
        style={{ transformBox: "view-box", transformOrigin:"24px 37px" }}
        animate={happy ? { rotate: [-68, -104, -46, -76, -68] } : { rotate: wingL }}
        transition={happy ? { duration: 0.7, ease: "easeInOut" } : SPRINGS.gentle}
      />
      <motion.path
        d="M41 37 Q49 21 34 18 Q30 27 34 37 Q38 39 41 37 Z"
        fill="var(--hp-wing)"
        style={{ transformBox: "view-box", transformOrigin:"40px 37px" }}
        animate={happy ? { rotate: [68, 104, 46, 76, 68] } : { rotate: wingR }}
        transition={happy ? { duration: 0.7, ease: "easeInOut" } : SPRINGS.gentle}
      />
    </svg>
  );
}
