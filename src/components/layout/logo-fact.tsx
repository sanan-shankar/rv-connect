"use client";

/* ------------------------------------------------------------------ *
 *  LogoFact wraps the sidebar PeaksMark logo. On hover or keyboard
 *  focus it reveals a small tooltip card with one Rishi Valley fact.
 *
 *  The fact is chosen once on mount inside useEffect (never during
 *  render, never in a useState initializer) so it is SSR-safe and
 *  stays steady across repeated hovers in a session, then differs on
 *  reload. Ported from the /preview/delight/eggs logo-fact demo onto
 *  the real sidebar with real tokens. Transform/opacity only.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import { PeaksMark } from "./peaks-mark";

// Ten made-up but plausible Rishi Valley facts. One is chosen per page load and
// stays fixed for the session; a reload picks a different one.
const VALLEY_FACTS = [
  "The valley is a recognised bird sanctuary. Patient watchers have logged more than two hundred species along the same dry-stream paths the children walk to class.",
  "There are no bells. Lessons begin and end by a shared sense of time, an idea Krishnamurti held to so that attention was never summoned by a ringing.",
  "Three hills frame the school: Bodikonda to the west, Middle Peak in the centre, and Rishikonda to the east, the granite ridge that gives the valley its first light.",
  "The great banyan is old enough that its dropped roots have become trunks of their own, so a single tree now shelters whole classes sitting in its shade.",
  "Asthachal, the sunset-watching place, is kept in silence. Students gather at dusk to watch the light leave the hills and say nothing at all.",
  "The open-air amphitheatre is cut into a slope, so an unamplified voice on the stone floor carries cleanly to the back row.",
  "Jiddu Krishnamurti founded the school in 1926 with the wish that learning happen without fear, reward, or comparison between one child and the next.",
  "Decades of careful planting turned eroded scrubland back into woodland, and the returning birds were the first sign that the valley had healed.",
  "The houses are named for trees and hills of the valley, so a student's first address is also a small lesson in what grows around them.",
  "Rain is read, not forecast. Old students still tell which hill the clouds will break over by the way the wind turns through the three peaks.",
];

export function LogoFact({
  href = "/feed",
  onNavigate,
}: {
  href?: string;
  onNavigate?: () => void;
}) {
  // Pick ONE fact index once, on mount, so it is stable across every hover for
  // this page load and differs on reload. A useState initializer would run on
  // the server too (hydration mismatch with Math.random), so we gate it to the
  // client with useEffect and render a calm resting state until it is set.
  const [factIndex, setFactIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    setFactIndex(Math.floor(Math.random() * VALLEY_FACTS.length));
  }, []);

  // The card lives inside the brand link, so a click within the wrapper still
  // navigates home. We keep the reveal open while either the logo or the card
  // itself holds hover/focus, with a small grace delay so moving from one to
  // the other does not flicker it shut.
  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  function show() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }

  function hide() {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 90);
  }

  const ready = factIndex !== null;
  const fact = ready ? VALLEY_FACTS[factIndex] : "";
  const reveal = open && ready;

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      <Link
        href={href}
        onClick={onNavigate}
        aria-label="Rishi Valley Alumni, home"
        aria-describedby={reveal ? "logo-fact-card" : undefined}
        className="flex items-center gap-2.5 rounded-xl px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
      >
        <PeaksMark
          size={28}
          variant="two-plane"
          className="shrink-0 -translate-y-px text-sidebar-foreground"
        />
        <span className="flex min-w-0 flex-col justify-center leading-none">
          <span className="block truncate font-heading text-[17px] font-bold leading-none tracking-tight text-sidebar-foreground">
            Rishi Valley
          </span>
          <span className="mt-1 block text-[10px] uppercase leading-none tracking-[0.2em] text-sidebar-foreground/55">
            Alumni
          </span>
        </span>
      </Link>

      <motion.div
        id="logo-fact-card"
        role="tooltip"
        className="absolute left-2 top-[calc(100%+10px)] z-30 w-[260px] rounded-[var(--radius)] border border-border bg-card p-3.5 text-left card-elevated"
        initial={false}
        animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={SPRINGS.settle}
        style={{ pointerEvents: reveal ? "auto" : "none" }}
        aria-hidden={!reveal}
      >
        <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.08em] text-cinnamon">
          Did you know
        </span>
        <p className="m-0 text-[12.5px] leading-[1.55] text-foreground">{fact}</p>
      </motion.div>
    </div>
  );
}
