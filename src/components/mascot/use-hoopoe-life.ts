"use client";

/* ------------------------------------------------------------------ *
 *  useHoopoeLife — a resting bird keeps living while you are still
 *  looking at it.
 *
 *  Every moment used to play its one beat and then stand as a statue that
 *  breathed and blinked for as long as the screen stayed open. The owner,
 *  2026-09-17: "after uploading photos it just sits there." The footer bird
 *  on the landing page was the one resident that kept doing things, and this
 *  is its cadence lifted out so every resting bird can have it: every so
 *  often, one small thing -- a look around, a glance at whatever is worth
 *  glancing at, a preen, a peck, a blink and a crest flick, now and then a
 *  hop.
 *
 *  Nothing here is awaited. A beat is fired and the next is scheduled
 *  regardless, and a bird that is still busy (a poke, a moment's own
 *  choreography, the beat before this one running long) is simply skipped
 *  that round. Awaiting would hang the loop for good the first time anybody
 *  calls stop(), because a cleared queue never resolves its promises.
 * ------------------------------------------------------------------ */

import { useEffect, useRef } from "react";
import { useMotionGovernor } from "@/components/common/motion";
import { rand, wait, type HoopoeApi } from "./hoopoe-kit";

// The gap between beats. The ambient crest flick already runs every 5-11s
// underneath; a beat is bigger than a flick, so it comes a little less often.
// Seven seconds is long enough that a person reading the copy beside the bird
// sees at most one, twelve short enough that a person who has stopped to look
// at it sees one before they get bored. (The footer's is 8-16s because it
// travels between perches, which is more to take in.)
const BEAT_MIN_MS = 7000;
const BEAT_MAX_MS = 12000;
// The first beat comes sooner: the moment has just ended, and the point is
// that the bird does not freeze on its last frame.
const FIRST_MIN_MS = 3000;
const FIRST_MAX_MS = 5000;

type Beat = { weight: number; play: (h: HoopoeApi, targets: HTMLElement[]) => unknown };

const BEATS: Beat[] = [
  // Looks left, then right, then back to you.
  { weight: 3, play: (h) => h.sequence(() => h.gaze(-0.7), wait(650), () => h.gaze(0.6), wait(650), () => h.gaze(0)) },
  // Glances at something on the page and holds it for a moment. Without
  // anything to glance at, this beat never comes up (weight below).
  {
    weight: 3,
    play: (h, targets) => {
      const t = targets[Math.floor(Math.random() * targets.length)];
      return h.sequence(() => h.gaze(t), wait(1300), () => h.gaze(0));
    },
  },
  { weight: 2, play: (h) => h.preen() },
  { weight: 2, play: (h) => h.peck() },
  { weight: 2, play: (h) => h.sequence(["blinkOnce", true], ["crestFlick"]) },
  // Rare, because a hop is the one beat that moves the whole bird.
  { weight: 1, play: (h) => h.hop(1) },
];

/**
 * @param h       the bird's controller
 * @param running false until the bird has finished whatever it arrived to do
 * @param lookAt  what on the page is worth a glance, read fresh at each beat
 */
export function useHoopoeLife(
  h: HoopoeApi,
  running: boolean,
  lookAt?: () => Array<HTMLElement | null | undefined>
) {
  const { paused } = useMotionGovernor();
  /* Both read through refs, so a caller may pass a fresh object or closure
     every render (the `{ ref, ...h }` spread every moment uses is new each
     time) without restarting the clock between beats. */
  const hRef = useRef(h);
  const lookAtRef = useRef(lookAt);
  useEffect(() => {
    hRef.current = h;
    lookAtRef.current = lookAt;
  });

  useEffect(() => {
    if (!running || paused) return;
    let timer: ReturnType<typeof setTimeout>;
    let last = -1;

    const tick = () => {
      const h = hRef.current;
      if (!h.isBusy()) {
        const targets = (lookAtRef.current?.() ?? []).filter((el): el is HTMLElement => !!el?.isConnected);
        // Never the same beat twice running, and never a glance with nothing to glance at.
        const pool = BEATS.map((b, i) => ({ ...b, i })).filter(
          (b) => b.i !== last && (b.i !== 1 || targets.length > 0)
        );
        let roll = Math.random() * pool.reduce((sum, b) => sum + b.weight, 0);
        const pick = pool.find((b) => (roll -= b.weight) < 0) ?? pool[0];
        last = pick.i;
        void pick.play(h, targets);
      }
      timer = setTimeout(tick, rand(BEAT_MIN_MS, BEAT_MAX_MS));
    };

    timer = setTimeout(tick, rand(FIRST_MIN_MS, FIRST_MAX_MS));
    return () => clearTimeout(timer);
  }, [running, paused]);
}
