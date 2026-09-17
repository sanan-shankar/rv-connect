"use client";

/* ------------------------------------------------------------------ *
 *  Logo easter egg — three fast clicks on the sidebar's logo.
 *
 *  On a phone the same three taps work on the top bar's logo, where the
 *  peek fills the width of the screen as it was first imagined.
 *
 *  Wraps the sidebar's PeaksMark logo (Brand) without reaching inside
 *  it: a capture-phase click counter on an outer `relative` div, so it
 *  only ever OBSERVES the click. Brand's `<Link href="/feed">` still
 *  navigates on every click, the first two of a triple included; this
 *  component lives in the sidebar, which survives that navigation, so
 *  the egg plays on regardless.
 *
 *  What it plays changed on 2026-09-17. It used to pop a 40px rig up
 *  from behind the logo for a celebration. Now it is <LogoPeek>: the app
 *  icon's hoopoe, screen-sized, rising slowly over the bottom edge and
 *  ducking back down. See logo-peek.tsx.
 *
 *  One-hoopoe rule: checked the instant the third click lands, before
 *  anything mounts, the same check-then-mount pattern the celebration
 *  detector uses.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { anotherHoopoeOnScreen } from "./one-hoopoe-guard";

/* Deferred: this wraps the sidebar wordmark on every authenticated page, and
   the peek (its geometry and the edge-light filter) is for a bird that only
   exists if somebody triple-clicks a logo. The FIRST click warms the chunk,
   not the third, so it is there by the time the egg fires. */
const loadPeek = () => import("./logo-peek").then((m) => m.LogoPeek);
const LogoPeek = dynamic(loadPeek, { ssr: false });

const CLICKS_NEEDED = 3;
// A real rapid triple-click, not three clicks scattered across a whole
// session -- each click resets this window, so it only fires on a burst.
const CLICK_WINDOW_MS = 650;

export function LogoEasterEgg({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [playing, setPlaying] = useState<{ x: number; y: number } | null>(null);
  const clickCountRef = useRef(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
    };
  }, []);

  function handleClickCapture() {
    if (playing) return; // already up; ignore clicks until it has ducked
    if (clickCountRef.current === 0) void loadPeek();
    clickCountRef.current += 1;
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (clickCountRef.current >= CLICKS_NEEDED) {
      clickCountRef.current = 0;
      if (anotherHoopoeOnScreen()) return; // stage owned elsewhere; stay quiet this time
      const r = wrapRef.current?.getBoundingClientRect();
      setPlaying(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 });
      return;
    }
    resetTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
      resetTimerRef.current = null;
    }, CLICK_WINDOW_MS);
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`} onClickCapture={handleClickCapture}>
      {children}
      {playing && <LogoPeek lookFirstAt={playing} onDone={() => setPlaying(null)} />}
    </div>
  );
}
