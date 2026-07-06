"use client";

/* ------------------------------------------------------------------ *
 *  Loading companion — approved as-designed off the mascot-moments idea
 *  board ("freaking perfect"): the hoopoe hops in place with the odd
 *  crest flick and blink to keep you company, then does a little
 *  land + happy hand-off beat before settling back to content.
 *
 *  A route's loading.tsx has no event for "the real content just
 *  landed" (Next swaps it out for the resolved page atomically), so
 *  there is no real hand-off moment to hook into. We keep the board's
 *  exact verb sequence and simply loop it for as long as this stays
 *  mounted; the "hand-off" beat still reads fine as part of the loop's
 *  own little rhythm, and it disappears the instant the real page
 *  takes over.
 *
 *  Fixed to a quiet viewport corner, out of the document flow, so it
 *  never sits on top of the skeleton copy on any of the warm-shimmer
 *  loading surfaces it is dropped into. Purely decorative: the
 *  shimmering skeleton is what says "loading", so the bird is
 *  `aria-hidden`.
 *
 *  `idle={false}`: this is the one moment that mounts and unmounts on
 *  essentially every route change across the app (every warm-shimmer
 *  surface swaps it for the real page the instant data lands), so it is
 *  the highest-churn user of the rig. Its own queued hop/blink loop
 *  already keeps it constantly moving, so the separate ambient
 *  breathe/blink/sparkle/crest-flick loop would be redundant here — and
 *  skipping it means one fewer timer-driven animation racing this
 *  component's frequent unmounts.
 *
 *  One-hoopoe rule: a route change is exactly the moment the sidebar's
 *  resident bird (sidebar-hoopoe.tsx) wakes and flies off if it was
 *  asleep, so this checks `anotherHoopoeOnScreen()` (moments/one-hoopoe-
 *  guard.ts) before showing itself, same as every other moment.
 * ------------------------------------------------------------------ */

import { useEffect, useRef } from "react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { wait } from "@/components/mascot/hoopoe-kit";
import { useSoloHoopoe } from "./moment-hoopoe";

export function LoadingCompanion({ size = 56 }: { size?: number }) {
  const { ref, ...h } = useHoopoe();
  const cancelled = useRef(false);
  const solo = useSoloHoopoe();

  useEffect(() => {
    if (!solo) return;
    cancelled.current = false;

    async function loop() {
      // A beat before the first hop so it never pops in mid-frame on a route
      // that resolves almost instantly.
      await new Promise((r) => window.setTimeout(r, 350));
      while (!cancelled.current) {
        await h.sequence(
          ["hop", 1],
          ["crestFlick"],
          ["hop", 1],
          ["blinkOnce", false],
          ["hop", 1],
          ["land"],
          ["express", "happy"],
          wait(400),
          ["express", "content"],
          wait(1100)
        );
      }
    }
    loop();

    return () => {
      cancelled.current = true;
      h.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solo]);

  if (!solo) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-3 right-3 z-30 sm:bottom-5 sm:right-5"
    >
      <Hoopoe ref={ref} size={size} idle={false} />
    </div>
  );
}
