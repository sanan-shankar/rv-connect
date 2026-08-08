"use client";

/* ------------------------------------------------------------------ *
 *  tour-anchors.ts — a tiny rect registry modeled directly on
 *  mascot-flight.ts's reportPerch/awaitPerch: the destination page says
 *  "my highlighted thing is here", and the tour waits for that before
 *  flying the hoopoe to it (walkthrough spec sec 3).
 *
 *  Unlike the flight bus (which stores a plain, pre-corrected rect
 *  because the flyer lives outside the destination's DOM entirely), the
 *  tour and its four destination pages share one document, so we can
 *  register the live HTMLElement itself. That means no scroll/resize
 *  re-reporting is needed to stay accurate: any consumer reading the
 *  element's current `getBoundingClientRect()` always gets the live
 *  position, right up to the moment it's used.
 *
 *  Resolves with `null` on timeout so a slow page (or a control that
 *  moved and lost its `data-tour` attribute) never hangs the tour — same
 *  failsafe shape as `awaitPerch`.
 * ------------------------------------------------------------------ */

import { useEffect, useRef } from "react";

const registry = new Map<string, HTMLElement>();
const waiters = new Map<string, Array<(el: HTMLElement | null) => void>>();

/** DESTINATION: report the element the tour should spotlight for this key. */
export function reportSpotlight(key: string, el: HTMLElement): void {
  registry.set(key, el);
  const list = waiters.get(key);
  if (list?.length) {
    waiters.delete(key);
    list.forEach((resolve) => resolve(el));
  }
}

/** Drop a stale registration (e.g. right before navigating to a stop we've
 *  visited before, so a leftover element from the last visit can never be
 *  read as "already there" before the fresh page has actually reported). */
export function clearSpotlight(key: string): void {
  registry.delete(key);
}

/** TOUR: the most recently reported element for this key, or null. */
export function getSpotlightEl(key: string): HTMLElement | null {
  return registry.get(key) ?? null;
}

/** TOUR: resolve once a spotlight element is registered (or immediately if
 *  one already is). Never rejects; on timeout resolves with whatever is
 *  latest (possibly null), so a stalled page never hangs the tour. */
export function awaitSpotlight(key: string, timeoutMs = 2500): Promise<HTMLElement | null> {
  const current = registry.get(key);
  if (current) return Promise.resolve(current);
  return new Promise((resolve) => {
    let done = false;
    const settle = (el: HTMLElement | null) => {
      if (done) return;
      done = true;
      resolve(el);
    };
    const list = waiters.get(key) ?? [];
    list.push(settle);
    waiters.set(key, list);
    setTimeout(() => settle(registry.get(key) ?? null), timeoutMs);
  });
}

/**
 * DESTINATION hook: measures a `[data-tour]` element on mount and reports
 * it under `key`. Pass `enabled={false}` for composer/etc instances that
 * render the same component in a context the tour doesn't cover (e.g. a
 * group composer, not the feed's own). Cleans its own registration up on
 * unmount so a route change never leaves a detached element behind.
 */
export function useTourAnchor<T extends HTMLElement>(key: string, enabled = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    reportSpotlight(key, el);
    return () => {
      if (getSpotlightEl(key) === el) clearSpotlight(key);
    };
  }, [key, enabled]);

  return ref;
}
