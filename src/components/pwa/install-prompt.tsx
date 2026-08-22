"use client";

/* ------------------------------------------------------------------ *
 *  Catching the one chance the browser gives you to offer an install.
 *
 *  Chrome fires `beforeinstallprompt` ONCE per hard page load, and only
 *  after its own engagement heuristic is satisfied (a tap, and thirty
 *  seconds on the page). Calling preventDefault on it hands you the
 *  event to fire later from a button of your own; ignore it and Chrome
 *  falls back to its own mini-infobar and the event is gone.
 *
 *  Which is why the listener is registered at MODULE SCOPE from a
 *  component mounted in the authenticated layout, rather than inside the
 *  tile that uses it. The tile lives behind Edit profile on the profile
 *  page. By the time anybody gets there the thirty seconds have long
 *  passed on whatever page they opened first, the event has fired and
 *  gone, and a listener attached on mount would catch nothing -- App
 *  Router navigations are soft, so there is no second page load to fire
 *  a second one.
 *
 *  No service worker anywhere in this file, deliberately. Chrome's
 *  installability criteria are HTTPS plus a manifest with name, 192 and
 *  512 icons, start_url and a standalone display -- all of which
 *  src/app/manifest.ts already ships. A service worker has not been
 *  required for years, and adding one to cache a site is the single
 *  easiest way to serve everybody a stale copy of it forever.
 * ------------------------------------------------------------------ */

import { useCallback, useSyncExternalStore } from "react";

/** Chrome's event, which TypeScript's DOM lib does not describe. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  // Installed from our button or from the browser's own menu, it makes no
  // difference: the offer is spent and the tile has nothing left to say.
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Mounted once, in the authenticated layout, purely so this module is
 * evaluated early enough to catch the event. Renders nothing and costs
 * nothing: two listeners and no state until Chrome speaks.
 */
export function InstallPromptCapture() {
  return null;
}

export interface InstallOffer {
  /** True once Chrome has handed over an event we can fire. */
  ready: boolean;
  /** Show the browser's install dialog. Resolves once the member answers. */
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export function useInstallPrompt(): InstallOffer {
  const ready = useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    // The server has no event and must not guess it has one, or the tile
    // renders an Install button on the server and swaps it for the manual
    // instructions on hydrate.
    () => false
  );

  const install = useCallback(async () => {
    const event = deferred;
    if (!event) return "unavailable" as const;
    // Spent either way: Chrome refuses a second prompt() on the same event,
    // so keeping it would leave a button that silently does nothing.
    deferred = null;
    emit();
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  }, []);

  return { ready, install };
}
