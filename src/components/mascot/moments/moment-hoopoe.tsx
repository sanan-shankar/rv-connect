"use client";

/* ------------------------------------------------------------------ *
 *  Shared plumbing for the small resident hoopoe moments (empty search
 *  results, empty saved posts, and friends; the empty-group and
 *  loading-companion moments it also used to serve have been deleted).
 *  These are ambient companions living inside an already-drawn
 *  empty state, not a standalone feature: the bird is decorative and
 *  secondary, the empty state's own copy is what actually communicates
 *  "there is nothing here". Every moment component wraps its <Hoopoe> in
 *  `aria-hidden` so it never gets in the way of that message for
 *  assistive tech, and autoplays its one sequence once the moment
 *  actually scrolls into view (mirrors the mascot-moments idea board's
 *  demo behaviour).
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type RefObject } from "react";
import { anotherHoopoeOnScreen } from "./one-hoopoe-guard";

/**
 * The sacred one-hoopoe rule, enforced at the door: whether THIS moment's
 * own <Hoopoe> should render at all. Checked exactly ONCE, in a mount
 * effect — i.e. before this component's own bird has ever been added to
 * the DOM — via the same `anotherHoopoeOnScreen()` guard sidebar-hoopoe.tsx
 * already uses (every `<Hoopoe>` carries the `hoopoe-mascot` class, so
 * this covers the sidebar resident, the login/signup birds, the cross-page
 * flight layer, and every other empty-state companion with no shared bus
 * needed). False during SSR and until that first check runs, so the first
 * client frame never flashes a bird only to yank it away a tick later.
 *
 * Deliberately NOT a `useSyncExternalStore` read-on-every-render: once this
 * shows its own `<Hoopoe>`, that bird's own `.hoopoe-mascot` node would
 * satisfy `anotherHoopoeOnScreen()` on the very next render, flipping this
 * back to false, unmounting the bird, satisfying nothing, flipping back to
 * true — an infinite "Maximum update depth exceeded" loop chasing its own
 * tail (reproduced while building this). A single check that never re-runs
 * sidesteps that: it only ever sees OTHER birds, because at check time its
 * own has not been rendered yet.
 */
export function useSoloHoopoe(): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Asks the DOM whether another hoopoe is already on screen. Only answerable after mount.
    setShow(!anotherHoopoeOnScreen());
  }, []);
  return show;
}

export function useMomentAutoplay(
  ref: RefObject<HTMLElement | null>,
  play: () => void,
  delay = 450
) {
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  });
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired.current) {
            fired.current = true;
            window.setTimeout(() => playRef.current(), delay);
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, delay]);
}
