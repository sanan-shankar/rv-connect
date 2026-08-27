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
 *  One history entry IS pushed, with the same URL, so the back button
 *  and the Android back gesture close the chapter instead of leaving
 *  the page. Same URL means Next sees no route change and stays out of
 *  it entirely.
 * ------------------------------------------------------------------ */

/** Marks our history entry so popstate can tell it apart from anyone else's. */
const GUIDE_MARK = "__rvGuideOpen";

type Listener = () => void;

let current: string | null = null;
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

export function currentGuide(): string | null {
  return current;
}

/** Open a chapter. Synchronous: the sheet renders on this tick. */
export function openGuide(area: string): void {
  if (current === area) return;
  current = area;
  /* Same URL, so Next's router sees nothing and does nothing. The entry
     exists only so that back closes the chapter rather than leaving the page,
     which is what a phone's back gesture expects of anything covering the
     screen. */
  window.history.pushState({ [GUIDE_MARK]: true }, "", window.location.href);
  emit();
}

/** Close. Rewinds our own history entry so no trail is left behind. */
export function closeGuide(): void {
  if (current === null) return;
  current = null;
  emit();
  if (window.history.state?.[GUIDE_MARK]) window.history.back();
}

/** popstate: the member pressed back, or a gesture did it for them. */
export function syncGuideFromHistory(): void {
  if (current === null) return;
  current = null;
  emit();
}

/** Next navigated somewhere else underneath an open chapter. */
export function resetGuide(): void {
  if (current === null) return;
  current = null;
  emit();
}
