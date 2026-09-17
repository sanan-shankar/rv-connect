"use client";

/* ------------------------------------------------------------------ *
 *  <HoopoeWarmup> — fixes the "first flight after page load stutters,
 *  later ones are smooth" jitter.
 *
 *  On a fresh landing-page load, above the fold, there is usually no
 *  `<Hoopoe>` mounted anywhere yet: the hero photo almost always decodes
 *  fast enough that HeroLoader never appears (landing-hero.tsx), and the
 *  footer's resident bird (footer-hoopoe.tsx) only mounts once scrolled
 *  into view. So the FIRST real `<Hoopoe>` instance the browser ever has
 *  to build is the cross-page flight puppet (mascot-flight-layer.tsx),
 *  the moment someone clicks "Sign in" / "Join the community" — paying,
 *  right when it matters most, every first-time cost of that mount: the
 *  rig's `useAnimate()` scope being created, the browser computing style
 *  + layout + a first paint for a fairly large animated SVG tree it has
 *  never seen before. All of that is normally invisible because it is
 *  spread across the page's initial load; here it lands mid-flight and
 *  reads as a stutter.
 *
 *  Fix: pay that cost once, off-screen, at idle time, before any real
 *  flight/entrance needs the rig warm. Two parts:
 *   1. Resolve the `./hoopoe` module import eagerly (a harmless no-op on
 *      pages that already statically import it, like this one, and a
 *      real head start on any that only reach it through the flight
 *      layer's lazy `dynamic()` import).
 *   2. Mount one real, fully off-screen `<Hoopoe>` for two animation
 *      frames — long enough for the browser to build, style, and paint
 *      it once — then unmount it again.
 *
 *  One-hoopoe rule: the probe DOES carry the shared `.hoopoe-mascot`
 *  class (stripping it would defeat the whole point — the CSS on that
 *  class is exactly what the probe needs to warm), so it is technically
 *  "another hoopoe on screen" for the ~2 frames (well under 32ms) it
 *  exists. `anotherHoopoeOnScreen()` is only ever read at specific,
 *  one-shot trigger moments (a mount effect, a click), never polled
 *  continuously, so the odds of a real collision are vanishingly small —
 *  an accepted, deliberately time-boxed trade-off, not an oversight.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { Hoopoe } from "./hoopoe";

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function HoopoeWarmup() {
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    // Resolve the module into the chunk cache ahead of the flight layer's own
    // lazy import. Harmless / instant if this page already has it (it does,
    // via every static `import { Hoopoe } from "./hoopoe"` elsewhere).
    void import("./hoopoe");

    const w = window as IdleWindow;
    let raf1 = 0;
    let raf2 = 0;
    let cancelled = false;

    const runWarmup = () => {
      if (cancelled) return;
      setWarm(true);
      // Two rAFs: the first commits the mount, the second runs only after
      // the browser has actually laid out + painted it once — then the
      // probe tears itself back down.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (!cancelled) setWarm(false);
        });
      });
    };

    const idleHandle =
      typeof w.requestIdleCallback === "function"
        ? w.requestIdleCallback(runWarmup, { timeout: 1500 })
        : window.setTimeout(runWarmup, 300);

    return () => {
      cancelled = true;
      if (typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(idleHandle);
      } else {
        window.clearTimeout(idleHandle);
      }
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  if (!warm) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed -left-[9999px] -top-[9999px] opacity-0">
      <Hoopoe size={96} idle={false} pokeable={false} />
    </div>
  );
}
