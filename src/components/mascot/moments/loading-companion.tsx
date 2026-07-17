"use client";

/* ------------------------------------------------------------------ *
 *  Loading companion — approved as-designed off the mascot-moments idea
 *  board ("freaking perfect"): the hoopoe hops in place with the odd
 *  crest flick and blink to keep you company, then does a little
 *  land + happy hand-off beat before settling back to content.
 *
 *  Two parts, split across a Suspense-swap boundary:
 *
 *  `LoadingCompanion` is the TRIGGER — mounted wherever a load is
 *  happening (inside a route's `loading.tsx`, or a client component's own
 *  `if (loading) ...` branch). It renders nothing itself; it just tells
 *  `loading-hoopoe-bus.ts` "a load started" on mount and "it ended" on
 *  unmount. This is deliberately dumb: a `loading.tsx` fallback sits
 *  inside a Suspense boundary that React tears down the instant the real
 *  content resolves, so nothing living inside it can ever out-live that
 *  swap or debounce its own appearance.
 *
 *  `LoadingHoopoeLayer` is the RENDERER — mounted once, at the root
 *  layout (alongside `MascotFlightLayer`, which the same "survive a route
 *  change" reasoning already applies to), so it is never itself inside a
 *  Suspense boundary and can enforce the bus's own timing: gate the first
 *  appearance behind a short delay (so a route that resolves fast never
 *  flashes the bird), and once shown, hold it for a minimum dwell even if
 *  every trigger has already released (see loading-hoopoe-bus.ts for the
 *  why). The verb sequence below is unchanged from the original
 *  single-piece version; it simply loops for as long as the bus says
 *  we're visible.
 *
 *  Fixed to a quiet viewport corner, out of the document flow, so it
 *  never sits on top of the skeleton copy on any of the warm-shimmer
 *  loading surfaces it is dropped into. Purely decorative: the
 *  shimmering skeleton is what says "loading", so the bird is
 *  `aria-hidden`.
 *
 *  `idle={false}`: this rig is torn down and rebuilt across every
 *  gate/dwell cycle, so its own queued hop/blink loop already keeps it
 *  constantly moving — the separate ambient breathe/blink/sparkle/crest-
 *  flick loop would be redundant here.
 *
 *  One-hoopoe rule: `LoadingCompanion` checks `anotherHoopoeOnScreen()`
 *  (moments/one-hoopoe-guard.ts) before ever registering with the bus, so
 *  a route change that wakes the sidebar's resident bird (or any other
 *  moment) never also asks for a loading companion.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { wait } from "@/components/mascot/hoopoe-kit";
import { useSoloHoopoe } from "./moment-hoopoe";
import { requestLoadingHoopoe, subscribeLoadingHoopoe } from "./loading-hoopoe-bus";

/** TRIGGER: drop this in anywhere a load is in flight. Renders nothing. */
export function LoadingCompanion() {
  const solo = useSoloHoopoe();

  useEffect(() => {
    if (!solo) return;
    return requestLoadingHoopoe();
  }, [solo]);

  return null;
}

/** RENDERER: mount exactly once, outside any Suspense boundary (root layout). */
export function LoadingHoopoeLayer({ size = 56 }: { size?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => subscribeLoadingHoopoe(setVisible), []);

  const { ref, ...h } = useHoopoe();

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    async function loop() {
      while (!cancelled) {
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
      cancelled = true;
      h.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-3 right-3 z-30 sm:bottom-5 sm:right-5"
    >
      <Hoopoe ref={ref} size={size} idle={false} />
    </div>
  );
}
