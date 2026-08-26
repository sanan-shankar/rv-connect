"use client";

/* ------------------------------------------------------------------ *
 *  Logo easter egg — mascot-moments idea #10 ("Sidebar logo easter
 *  egg"), owner's tweak on the trigger: "maybe you click it three
 *  times, and then the Easter egg delivers" (the board's original
 *  draft said five clicks; three is the approved number here).
 *
 *  Wraps the sidebar's PeaksMark logo (Brand) without reaching inside
 *  it: a capture-phase click counter on an outer `relative` div.
 *  Capture-phase means it only ever OBSERVES the click, same as every
 *  ordinary click on the logo today — Brand's `<Link href="/feed">`
 *  navigation is completely untouched, single clicks (and even the
 *  first two of an accidental triple) behave exactly as before.
 *
 *  Three clicks inside a short window (a real rapid triple-click, not
 *  three clicks spread across a whole visit) pop a small hoopoe up from
 *  behind the logo for a full `celebrate(3)` (the rig's existing
 *  leaf/heart particle burst, no new asset needed) with the crest
 *  fanned wide, then it tucks back out of sight.
 *
 *  One-hoopoe rule: checked the instant the third click lands, the same
 *  check-then-mount pattern celebration-detector.tsx uses before ever
 *  showing celebration-hoopoe.tsx — by the time this component's own
 *  rig could report ready, its own `.hoopoe-mascot` node is already in
 *  the DOM, so a self-check from inside the moment would always see
 *  itself and never fire. `celebrate()` already carries its own
 *  internal spam cooldown (hoopoe.tsx), so no extra frequency cap is
 *  layered on here beyond "you have to go looking and land the
 *  gesture": it fires every time three clicks land clean, blocked only
 *  when another hoopoe already owns the stage.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { anotherHoopoeOnScreen } from "./one-hoopoe-guard";
import { SPRINGS } from "@/components/common/motion";

const CLICKS_NEEDED = 3;
// A real rapid triple-click, not three clicks scattered across a whole
// session -- each click resets this window, so it only fires on a burst.
const CLICK_WINDOW_MS = 650;
const RIG_SIZE = 40;

// A real awaitable pause (NOT hoopoe-kit's `wait()`, which builds a `{wait}`
// Step for `sequence()` and resolves instantly if awaited directly outside
// one). Same helper hoopoe.tsx and mascot-flight-layer.tsx use.
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function LogoEasterEgg({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const clickCountRef = useRef(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
      if (readyTimerRef.current !== null) clearTimeout(readyTimerRef.current);
    };
  }, []);

  async function playEgg(api: HoopoeApi) {
    setRevealed(true);
    await sleep(320); // let the pop-up spring mostly settle before the burst
    await api.celebrate(3);
    await api.crest(true);
    await sleep(280);
    setRevealed(false);
    await sleep(320); // let the tuck-away spring finish before unmounting
    setPlaying(false);
    busyRef.current = false;
  }

  function handleClickCapture() {
    if (busyRef.current) return; // already mid-egg; ignore clicks until it settles
    clickCountRef.current += 1;
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (clickCountRef.current >= CLICKS_NEEDED) {
      clickCountRef.current = 0;
      if (anotherHoopoeOnScreen()) return; // stage owned elsewhere; stay quiet this time
      busyRef.current = true;
      setPlaying(true);
      return;
    }
    resetTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
      resetTimerRef.current = null;
    }, CLICK_WINDOW_MS);
  }

  return (
    <div className="relative" onClickCapture={handleClickCapture}>
      {children}
      {playing && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-1 top-0 z-40"
          initial={{ opacity: 0, y: 10, scale: 0.5 }}
          animate={
            revealed
              ? { opacity: 1, y: -8, scale: 1 }
              : { opacity: 0, y: 10, scale: 0.5 }
          }
          transition={SPRINGS.gentle}
        >
          <Hoopoe
            size={RIG_SIZE}
            idle={false}
            onReady={(api) => {
              // Deferred one tick past mount, same defensive pattern as
              // sidebar-hoopoe.tsx's onReady: React Strict Mode's dev-only
              // mount -> cleanup -> remount dance runs synchronously, and a
              // verb chain kicked off from directly inside onReady can race
              // it (the simulated cleanup can `.stop()` an animation that
              // just started). A `setTimeout(fn, 0)` lets that dance settle
              // first.
              readyTimerRef.current = setTimeout(() => void playEgg(api), 0);
            }}
          />
        </motion.div>
      )}
    </div>
  );
}
