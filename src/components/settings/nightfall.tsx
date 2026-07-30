"use client";

/* ------------------------------------------------------------------ *
 *  Nightfall - the dark mode payoff scene (owner: "the transition to
 *  dark mode has to be done, like, insanely well... it's been built up
 *  so much, so take your time and give them the payoff").
 *
 *  A full-screen sunset over Rishikonda: the day sky dims into dusk
 *  (two stacked gradient layers crossfading, so only OPACITY animates),
 *  the sun sinks behind the peaks (pure transform), stars arrive in a
 *  stagger, a pair of fireflies drift up, a line of copy holds the
 *  beat. The actual theme class flips at full dusk, hidden behind the
 *  scene, so the raw swap is never seen. ~4.5s start to finish; the
 *  ceremony earned it.
 *
 *  Dusk colours are fixed scene art (like the image viewer's warm-ink
 *  backdrop): the scene must look identical whichever theme is active
 *  underneath, so it cannot use flipping tokens.
 * ------------------------------------------------------------------ */

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { EASE_IN_OUT_SCENE, EASE_OUT_SMOOTH } from "@/components/common/motion";

/* Deterministic star field: golden-angle scatter, no randomness, so the
   sky is the same every night (and SSR could never disagree anyway). */
const STARS = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 137.5) % 96}%`,
  top: `${6 + ((i * 61.8) % 46)}%`,
  size: i % 3 === 0 ? 2.5 : 1.5,
  delay: 1.6 + (i % 9) * 0.14,
}));

export function Nightfall({
  onDusk,
  onDone,
}: {
  /** Fired at full dusk (~2.4s), while the scene fully covers the app:
   *  the caller flips the theme class here, unseen. */
  onDusk: () => void;
  onDone: () => void;
}) {
  const duskFired = useRef(false);
  const doneFired = useRef(false);

  /* Timeline anchors (safety-netted with timers so a dropped animation
     callback can never strand the user under an opaque overlay). */
  useEffect(() => {
    const duskT = setTimeout(() => {
      if (!duskFired.current) {
        duskFired.current = true;
        onDusk();
      }
    }, 2400);
    const doneT = setTimeout(() => {
      if (!doneFired.current) {
        doneFired.current = true;
        onDone();
      }
    }, 4600);
    return () => {
      clearTimeout(duskT);
      clearTimeout(doneT);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[80]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.5, ease: EASE_OUT_SMOOTH } }}
      /* The whole scene lifts at the end to reveal the darkened app. */
      exit={{ opacity: 0 }}
    >
      {/* Dusk sky: warm charcoal with the last ember of the day at the
          horizon. Constant; the DAY layer above it fades out to reveal it,
          so the "sky darkening" is an opacity-only crossfade. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, #131A17 0%, #1C2420 52%, #2E2A22 84%, #4A3826 100%)",
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, #F2E9D8 0%, #E7DBC4 55%, #DFC9A8 100%)",
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0, transition: { duration: 2.2, delay: 0.4, ease: EASE_IN_OUT_SCENE } }}
      />

      {/* The sun, sinking behind the peaks. */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-[30%] h-24 w-24 -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, #F6D8A0 0%, #E8B76A 60%, rgba(232,183,106,0) 100%)",
          boxShadow: "0 0 80px 30px rgba(232,183,106,0.35)",
        }}
        initial={{ y: 0, opacity: 1 }}
        animate={{
          y: "52vh",
          opacity: 0.25,
          transition: { duration: 2.6, delay: 0.2, ease: EASE_IN_OUT_SCENE },
        }}
      />

      {/* Rishikonda and Bodikonda, silhouetted, anchoring the horizon. */}
      <div className="absolute inset-x-0 bottom-[-4vh] flex justify-center">
        <PeaksMark
          variant="solid"
          className="h-[38vh] w-auto min-w-[140vw] text-[#0E1412] opacity-95"
        />
      </div>

      {/* Stars, arriving in a stagger once the sky is dark enough. */}
      {STARS.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-[#E8EDE6]"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9, transition: { delay: s.delay, duration: 0.6 } }}
        />
      ))}

      {/* Two fireflies drifting up from the treeline: the valley's night
          shift clocking in. Transform + opacity only. */}
      {[0, 1].map((i) => (
        <motion.span
          key={`fly-${i}`}
          aria-hidden
          className="absolute bottom-[22vh] h-1.5 w-1.5 rounded-full bg-[#D8E6A8]"
          style={{ left: i === 0 ? "32%" : "63%", boxShadow: "0 0 8px 2px rgba(216,230,168,0.6)" }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.9, 0.4, 0.9, 0],
            y: -120 - i * 40,
            x: i === 0 ? 24 : -18,
            transition: { delay: 2.0 + i * 0.5, duration: 2.2, ease: "linear" },
          }}
        />
      ))}

      {/* The line. Held just long enough to read twice. */}
      <motion.p
        className="absolute inset-x-0 top-[38%] text-center font-heading text-[22px] tracking-[-0.01em] text-[#E8EDE6]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 2.6, duration: 0.7, ease: EASE_OUT_SMOOTH } }}
      >
        The valley, after dark.
      </motion.p>
    </motion.div>
  );
}
