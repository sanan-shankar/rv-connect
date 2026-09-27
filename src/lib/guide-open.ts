/* ------------------------------------------------------------------ *
 *  Opening a chapter, with nothing in the way.
 *
 *  The lab's stage D was smooth because it was a state flip with no
 *  network in the path. Two attempts to keep that AND put the chapter
 *  in the address bar both failed, and both were measured rather than
 *  guessed at:
 *
 *    - An intercepting route: correct URLs, but 404-444ms of nothing
 *      after the press before the sheet existed to animate, even with
 *      the route already compiled. No easing curve survives that.
 *    - history.pushState behind a client-state open: instant, but Next's
 *      router watches history. `usePathname` moved with the pushState
 *      and the router rewrote `history.state`, so the chapter closed
 *      itself on open and the address never came back on close.
 *
 *  So the chapter is plain UI state and does not touch the address.
 *  /guide/[area] is still a real page: a mailed link, a refresh, or the
 *  index all render it in full. What is given up is being able to link
 *  to "the overlay, over the feed", which nobody asked for and which
 *  cost every bit of the smoothness that was asked for.
 *
 *  Back still closes the chapter rather than leaving the page. That used
 *  to be a history entry pushed from here; it is now the Sheet's own, the
 *  same one every dialog and sheet takes (src/lib/back-closes.ts).
 * ------------------------------------------------------------------ */

type Listener = () => void;

/** Which chapter is showing, and whether it is the first-run tour
 *  (docs/spec/guide.md section 5) rather than a title pressed. A new object on
 *  every change, so useSyncExternalStore sees the change by identity. */
export interface GuideState {
  area: string;
  tour: boolean;
}

let current: GuideState | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeGuide(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function currentGuide(): GuideState | null {
  return current;
}

/** Open a chapter, or move to another one in the sheet that is already open
 *  (Next), keeping whatever mode it is in. Synchronous: the sheet renders on
 *  this tick. */
export function openGuide(area: string): void {
  if (current?.area === area) return;
  current = { area, tour: current?.tour ?? false };
  emit();
}

/** Start the first-run tour on its first chapter (or the one it was left on). */
export function startTour(area: string): void {
  current = { area, tour: true };
  emit();
}

/** Close: the sheet finished leaving, or Next navigated somewhere else underneath it. */
export function closeGuide(): void {
  if (current === null) return;
  current = null;
  emit();
}
