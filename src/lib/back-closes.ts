/* ------------------------------------------------------------------ *
 *  The back gesture closes whatever is covering the page.
 *
 *  Owner, 2026-09-14, on an Android phone: "on collection when I click on
 *  a photo and then swipe from side it takes me to feed. i'd want it to
 *  just close the photo." Nothing that covered the screen -- the photo
 *  viewer, a dialog, a sheet, the menu drawer -- put anything in history,
 *  so back went straight past it to the page before.
 *
 *  So each one, while open, owns one history entry at the SAME address.
 *  Back pops that entry and the overlay closes; closing it any other way
 *  rewinds the entry so no trail is left. The guide proved the shape
 *  first and now rides on this.
 *
 *  Four things Next does that this has to work around, each read in
 *  node_modules/next/dist/client/components/:
 *
 *  1. It patches history.pushState, and given a URL it dispatches a
 *     router restore. Our entry is pushed with NO url, so Next only copies
 *     its own state across and does nothing else.
 *  2. Every router commit (a refresh, a server action, a search-param
 *     replace) rewrites the current entry's state from scratch
 *     (HistoryUpdater, `preserveCustomHistoryState: false`), which would
 *     wipe the mark off an open dialog's entry mid-save. replaceState is
 *     wrapped to carry the mark across.
 *  3. It answers every popstate with a restore, and a restore DISCARDS any
 *     navigation still pending (app-router-instance.js, "Navigations take
 *     priority"). The popstates this module causes are same-address and
 *     mean nothing to the router, so they are stopped in the capture phase
 *     before Next hears them.
 *  4. An overlay closing because a link inside it was pressed must not
 *     rewind: history.back() racing the navigation's own pushState can put
 *     the member back where they started. instrumentation-client.ts says
 *     when a navigation begins; a close inside that window leaves its entry
 *     behind as DEAD, and back steps over a dead entry wherever it meets one.
 * ------------------------------------------------------------------ */

import { useEffect, useRef } from "react";

const MARK = "__rvLayer";

/** Tells this page load's entries from an earlier load's, all of which are dead. */
const LOAD = Math.random().toString(36).slice(2, 10);

/** How long after a navigation starts a close counts as caused by it. Next
 *  clears it sooner, on the navigation's own pushState; this is the ceiling
 *  for a navigation that never commits (a replace, an error). */
const NAV_WINDOW_MS = 3000;

type Mark = { load: string; seq: number };
type Layer = { seq: number; close: () => void; pushed: boolean };
type Entry = { state: unknown; href: string };

const stack: Layer[] = [];
let seq = 0;
let installed = false;
let ownPush = false;
let navStartedAt = -Infinity;
/** The entry the member is on, as last written, so a pop knows what it left. */
let here: Entry = { state: null, href: "" };
let rewinding: { x: number; y: number; from: Entry; timer: number } | null = null;

function markOf(state: unknown): Mark | null {
  const m = (state as Record<string, unknown> | null)?.[MARK] as Mark | undefined;
  return m && typeof m.seq === "number" ? m : null;
}

/** Marked, but no open overlay owns it any more. */
function isDead(state: unknown): boolean {
  const m = markOf(state);
  return !!m && !(m.load === LOAD && stack.some((l) => l.pushed && l.seq === m.seq));
}

function withoutMark(state: unknown): unknown {
  if (!state || typeof state !== "object") return state;
  const rest = { ...(state as Record<string, unknown>) };
  delete rest[MARK];
  return rest;
}

function remember() {
  here = { state: window.history.state, href: window.location.href };
}

/** Called by instrumentation-client.ts when an App Router push or replace starts. */
export function noteNavigationStart(): void {
  navStartedAt = performance.now();
}

function install() {
  if (installed) return;
  installed = true;
  const { history } = window;
  const push = history.pushState;
  const replace = history.replaceState;

  history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
    // Anyone else pushing is Next committing a navigation.
    if (!ownPush) navStartedAt = -Infinity;
    push.call(history, data, unused, url);
    remember();
  };
  history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
    const m = markOf(history.state);
    if (m && data && typeof data === "object" && !markOf(data)) data = { ...data, [MARK]: m };
    replace.call(history, data, unused, url);
    remember();
  };
  window.addEventListener("popstate", onPop, { capture: true });
  remember();
}

function pushEntry(layer: Layer) {
  ownPush = true;
  try {
    window.history.pushState({ [MARK]: { load: LOAD, seq: layer.seq } satisfies Mark }, "");
  } finally {
    ownPush = false;
  }
  layer.pushed = true;
}

/** Point the entry just landed on at the address and router state the member
 *  was actually looking at. Only differs when a search-param replace moved
 *  the address while the overlay was open (the admin filter sheet does). */
function carryAddress(from: Entry) {
  if (window.location.href !== from.href) {
    window.history.replaceState(withoutMark(from.state), "", from.href);
  }
}

function rewind() {
  rewinding = {
    x: window.scrollX,
    y: window.scrollY,
    from: here,
    /* A back() that never answers must not strand every later push. */
    timer: window.setTimeout(() => land(false), 1000),
  };
  window.history.back();
}

function land(popped: boolean) {
  const r = rewinding;
  if (!r) return;
  window.clearTimeout(r.timer);
  rewinding = null;
  if (popped) {
    carryAddress(r.from);
    /* A same-document traversal restores the scroll the entry was pushed
       at. Scroll-locked overlays never moved it; the reader's question list
       closes BECAUSE the page scrolled, and must not be yanked back. */
    if (window.scrollX !== r.x || window.scrollY !== r.y) window.scrollTo(r.x, r.y);
  }
  for (const l of stack) if (!l.pushed) pushEntry(l);
}

function onPop(e: PopStateEvent) {
  const left = here;
  remember();
  const swallow = () => e.stopImmediatePropagation();

  if (rewinding) {
    swallow();
    if (isDead(e.state)) window.history.back();
    else land(true);
    return;
  }

  const m = markOf(e.state);
  const at = m && m.load === LOAD ? m.seq : -1;
  const closing = stack.filter((l) => l.pushed && l.seq > at);

  if (closing.length > 0) {
    /* Same address: this was our entry, and the router has nothing to do.
       A different one means the browser went past our entry (it skips
       entries pushed without a user gesture), so Next must hear it. */
    if (window.location.href === left.href) swallow();
    for (const l of closing.reverse()) {
      stack.splice(stack.indexOf(l), 1);
      l.close();
    }
    return;
  }

  /* A dead entry is not a place to stop. Landing on one, or leaving one for
     the same address, means this press has not closed anything yet. */
  if (isDead(e.state) || (isDead(left.state) && window.location.href === left.href)) {
    swallow();
    window.history.back();
  }
}

function release(layer: Layer) {
  const i = stack.indexOf(layer);
  if (i === -1) return; // back already closed it
  stack.splice(i, 1);
  if (!layer.pushed || rewinding) return;
  const navigating = performance.now() - navStartedAt < NAV_WINDOW_MS;
  if (isDead(window.history.state) && !navigating) rewind();
}

/**
 * While `open`, the back button and the Android back gesture call `close`
 * instead of leaving the page. Every overlay that covers the screen uses
 * this; `ui/dialog` and `ui/sheet` already do, so anything built on them
 * needs nothing.
 */
export function useBackCloses(open: boolean, close: () => void): void {
  const latest = useRef(close);
  useEffect(() => {
    latest.current = close;
  });

  useEffect(() => {
    if (!open) return;
    install();
    const layer: Layer = { seq: ++seq, close: () => latest.current(), pushed: false };
    stack.push(layer);
    // Mid-rewind, the push waits for the rewind to land (see `land`).
    if (!rewinding) pushEntry(layer);
    return () => release(layer);
  }, [open]);
}
