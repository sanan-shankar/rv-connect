"use client";

import { useEffect, useState } from "react";

/**
 * Whether the primary pointer is a finger rather than a mouse or trackpad.
 *
 * For the handful of places where the two devices want genuinely different
 * affordances rather than the same one at a different size: a phone gets a
 * swipe, a laptop gets a control that appears when you point at the thing it
 * belongs to. Sizing off the VIEWPORT would be the wrong question -- a 1,024px
 * tablet is a finger and a 1,024px browser window is not.
 *
 * False until the first effect runs, so the server and the first client frame
 * agree. That default is the deliberate way round: the hover-revealed control
 * is the path that also works with a keyboard, so a device we have not
 * classified yet gets the one that cannot leave anybody with nothing.
 *
 * `(pointer: coarse)` asks about the PRIMARY pointer, which is what "what will
 * this person actually do" means. `(any-pointer: coarse)` would be true of a
 * laptop with a touchscreen, where the trackpad is still how it is used.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return coarse;
}
