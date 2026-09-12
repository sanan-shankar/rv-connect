/* The unread badge's one number, shared by every bell in the document.
 *
 * There are two bells and they take turns: /feed renders its own in the page
 * header, every other route gets the one in the mobile top band, which lives
 * in the (main) layout (see sidebar.tsx, which suppresses it on /feed so the
 * two are never both on screen). Each used to hold the count in its own
 * `useState(initialUnreadCount)`, and the second half of that is the bug:
 *
 *   1. `initialUnreadCount` for the band's bell comes from the (main) layout,
 *      and Next does NOT re-render a shared layout on a soft navigation
 *      (staleTimes.md: "shared layouts won't automatically be refetched on
 *      every navigation, only the page segment that changes"). So that prop is
 *      frozen at whatever the last FULL page load counted, for the rest of the
 *      session.
 *   2. Leaving /feed mounts that bell fresh, and a fresh mount re-seeds the
 *      badge from the frozen prop.
 *
 * So: read your notifications on the feed, tap through to the directory, and
 * the badge is back -- every time, with the database saying zero. Measured
 * 2026-09-12 at 390x844: mark all read -> badge clears -> navigate -> "3
 * unread notifications" again, while `SELECT count(*) ... read=false` returned
 * 0. That is alarm fatigue manufactured by a stale prop, and it teaches
 * members to ignore the badge entirely.
 *
 * The store is module state, so it dies with the document: a real page load
 * always starts empty and the server's prop seeds it. After that the truth is
 * here, and a remount reads it instead of the prop.
 *
 * Deliberately not React context: the two bells sit in different trees (one in
 * the layout, one inside a page's header) and a provider high enough to hold
 * both would re-render the whole app shell on every count change.
 */

let count: number | null = null;

/* Every count the server has handed this document. A stale prop repeats
   itself -- the frozen layout number is the same 3 on every navigation, and
   the feed's own fresh number alternates with it as the member moves between
   the two -- so remembering them is what keeps `seedVerdict` from asking the
   server the same question on every page change.

   Counts are small integers and a session sees a handful of distinct ones; the
   cap is only here so a very long session cannot grow this without bound. */
const SEEN_CAP = 64;
let seenProps = new Set<number>();

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeUnread(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The shared count, or null when nothing in this document has set one yet. */
export function getUnread(): number | null {
  return count;
}

/** A number from the server (a focus refresh, a panel open, a mark-read). */
export function setUnread(next: number) {
  const clamped = Math.max(0, next);
  if (count === clamped) return;
  count = clamped;
  emit();
}

/** One notification was opened. Never below zero. */
export function decrementUnread() {
  setUnread((count ?? 1) - 1);
}

export type SeedVerdict = "seed" | "agrees" | "verify";

/**
 * What a mounting bell should do with the count the server handed it.
 *
 *  - `seed`: nothing has set a count in this document, so the prop IS the
 *    truth -- it was computed on the request that built this page.
 *  - `agrees`: the prop says what the store already says, or it is a number
 *    this document has already been handed. Either way it is not news, and
 *    the store's own value -- which the member's clicks and the server's
 *    later answers produced -- stands.
 *  - `verify`: a count this document has never seen, disagreeing with the
 *    store. It may be frozen (case 1 above) or genuinely newer (a like landed
 *    while the member was reading something else and this page counted it
 *    seconds ago), and from here the two are indistinguishable. The store's
 *    number stays on screen and the bell asks the server, which is one
 *    indexed count.
 *
 * The one thing this rule cannot see: read three, then have exactly three new
 * ones arrive, and a page rendering "3" is indistinguishable from the frozen
 * "3" -- so the badge under-reports until the next focus or panel open, both
 * of which take the figure straight from the server. That is the quiet
 * direction of the error, and the loud one is what made the badge worth
 * ignoring.
 *
 * Pure, and exported for the test: the whole point of this module is an
 * ordering rule, and an ordering rule that lives only inside an effect is one
 * nobody can check.
 */
export function seedVerdict(
  stored: number | null,
  seen: ReadonlySet<number>,
  prop: number
): SeedVerdict {
  if (stored === null) return "seed";
  if (prop === stored) return "agrees";
  if (seen.has(prop)) return "agrees";
  return "verify";
}

/**
 * Called by a bell as it mounts (and whenever its prop changes). Applies the
 * verdict to the store and returns it, so the caller knows whether to go and
 * ask the server.
 */
export function seedUnread(prop: number): SeedVerdict {
  const verdict = seedVerdict(count, seenProps, prop);
  if (seenProps.size >= SEEN_CAP) seenProps.clear();
  seenProps.add(prop);
  if (verdict === "seed") setUnread(prop);
  return verdict;
}

/** Test-only: module state outlives an individual test otherwise. */
export function resetUnreadStore() {
  count = null;
  seenProps = new Set();
  listeners.clear();
}
