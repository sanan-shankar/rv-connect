/* ------------------------------------------------------------------ *
 *  Where the reader was standing when they opened a chapter.
 *
 *  The overlay pins the body to stop the page behind it scrolling, and
 *  puts the reader back on teardown. The obvious place to read the
 *  scroll position is the overlay's own effect, and that is wrong: by
 *  the time it mounts, a soft navigation has already happened and the
 *  router may have moved the page. Measured on /feed, a reader 600px
 *  down came back at 5041.
 *
 *  So the door records the number before it navigates, and the overlay
 *  spends it. One value, written by whoever is about to leave, read
 *  once by whoever arrives.
 * ------------------------------------------------------------------ */

let pending: number | null = null;

/** Called by the door, synchronously, before the navigation starts. */
export function markGuideReturn(): void {
  pending = window.scrollY;
}

/**
 * Called by the overlay when it mounts. Falls back to reading the scroll
 * itself, which covers arriving by any route that did not go through the
 * door (a browser forward button, say).
 */
export function takeGuideReturn(): number {
  const y = pending ?? window.scrollY;
  pending = null;
  return y;
}
