"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 *  useDeferredAutofocus — autoFocus, moved out of React's commit.
 *
 *  The `autoFocus` attribute makes react-dom call `.focus()` inside
 *  commitMount, synchronously, BEFORE the page's first paint. focus()
 *  needs up-to-date geometry, and at that moment the whole just-mounted
 *  tree is dirty, so it forces a full synchronous layout inside the
 *  commit task. Measured on the landing -> /login hoopoe flight, that
 *  is a 75-92ms main-thread stall — and the flight is driven by
 *  requestAnimationFrame, so every one of those milliseconds comes out
 *  of the bird: it freezes and jumps forward ("it skips a couple of
 *  frames when the other content slides in", owner, 2026-08-11).
 *
 *  Two frames later the browser has already done that same layout in
 *  its own rendering phase, so the identical focus() call finds a clean
 *  tree and forces nothing. Nobody can type inside 2 frames of a page
 *  appearing, so the deferral is unobservable except by the stall going
 *  away.
 *
 *  Double rAF, not a timeout: the first rAF fires just before the paint
 *  the commit produced, i.e. layout may still be pending; the second is
 *  the first moment provably after it. `preventScroll` because the two
 *  users of this are auth pages with a bird mid-flight above them — a
 *  focus scroll would move the perch out from under it.
 *
 *  Usage: const ref = useDeferredAutofocus<HTMLInputElement>();
 *         <Input ref={ref} />   (instead of autoFocus)
 * ------------------------------------------------------------------ */
export function useDeferredAutofocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    // DESKTOP ONLY (owner, 2026-08-14): on a phone, focusing a field summons
    // the keyboard over half the page before the visitor has asked for
    // anything ("it's annoying when it randomly gets summoned"). A device
    // with a real pointer just gets a ready caret; touch devices wait for a
    // tap. Same `(hover: hover) and (pointer: fine)` gate the InfoTip uses
    // to tell the two input worlds apart.
    try {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    } catch {
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
  return ref;
}
