/* ------------------------------------------------------------------ *
 *  loading-hoopoe-bus — decides WHEN the loading companion (the hopping
 *  hoopoe shown while a route's loading.tsx or a client fetch is
 *  pending) is actually visible, independent of any single caller's own
 *  mount lifetime.
 *
 *  Why this needs to live outside the component that shows the bird:
 *  a `loading.tsx` fallback is a React Suspense boundary — the instant
 *  the real content resolves, React unmounts the whole fallback tree in
 *  the same commit. There is no way for a component INSIDE that tree to
 *  ask React "wait, let me stay a little longer" once the swap happens.
 *  So the two things the owner asked for here —
 *    1) never show the bird for a route that resolves fast (no flash)
 *    2) once shown, keep it up for a minimum dwell even if the real
 *       content is ready sooner
 *  — can only both be true if the VISIBLE bird lives somewhere that
 *  survives the Suspense swap, and the swap itself is treated as just a
 *  signal ("a load started" / "a load ended") rather than the thing
 *  directly controlling the bird's presence.
 *
 *  Shape: `requestLoadingHoopoe()` is called by every trigger (the
 *  per-route `LoadingCompanion`, mounted inside a `loading.tsx`, and any
 *  client-side caller like `saved-posts-feed.tsx`'s own `loading` state)
 *  the instant it wants a companion; it returns a release function to
 *  call the instant that load ends (component unmount / state flips).
 *  Overlapping requests are counted, not just booleaned, so two loads
 *  finishing at different times never hide the bird early.
 *
 *  `subscribeLoadingHoopoe` is read by the ONE persistent renderer
 *  (`LoadingHoopoeLayer`, mounted once at the root layout so it is never
 *  itself subject to a Suspense swap) to know when to actually render
 *  the puppet.
 * ------------------------------------------------------------------ */

// Never show a companion for a load that resolves faster than this — the
// exact "appears for a frame then vanishes" flash the owner flagged.
const MOUNT_GATE_MS = 350;

// Once shown, stays up at least this long even if every requester has
// already released (~two of the loop's own hops).
const MIN_DWELL_MS = 1200;

type Listener = (visible: boolean) => void;

let activeCount = 0;
let visible = false;
let shownAt = 0;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let dwellTimer: ReturnType<typeof setTimeout> | null = null;
let listeners: Listener[] = [];

function setVisible(next: boolean) {
  if (visible === next) return;
  visible = next;
  if (next) shownAt = Date.now();
  listeners.forEach((l) => l(visible));
}

function clearPendingTimer() {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

function clearDwellTimer() {
  if (dwellTimer !== null) {
    clearTimeout(dwellTimer);
    dwellTimer = null;
  }
}

/**
 * Register one pending load. Returns a release function — call it the
 * instant that particular load ends (effect cleanup / state flip). Safe
 * to call from more than one place at once; the bird only ever hides once
 * every outstanding request has released.
 */
export function requestLoadingHoopoe(): () => void {
  activeCount += 1;
  if (activeCount === 1) {
    // A fresh request arriving while we're still in the min-dwell window
    // (a quick back-to-back navigation) cancels the scheduled hide instead
    // of re-gating — the bird just stays up, seamlessly.
    clearDwellTimer();
    if (!visible && pendingTimer === null) {
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        if (activeCount > 0) setVisible(true);
      }, MOUNT_GATE_MS);
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeCount = Math.max(0, activeCount - 1);
    if (activeCount > 0) return;

    if (pendingTimer !== null) {
      // Never became visible — this load finished inside the gate window,
      // so there is nothing to dwell on; just cancel the timer.
      clearPendingTimer();
      return;
    }
    if (!visible) return;

    const elapsed = Date.now() - shownAt;
    const remaining = MIN_DWELL_MS - elapsed;
    if (remaining <= 0) {
      setVisible(false);
    } else {
      dwellTimer = setTimeout(() => {
        dwellTimer = null;
        if (activeCount === 0) setVisible(false);
      }, remaining);
    }
  };
}

/** RENDERER: subscribe to visibility. Called immediately with the current value. */
export function subscribeLoadingHoopoe(cb: Listener): () => void {
  listeners.push(cb);
  cb(visible);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
