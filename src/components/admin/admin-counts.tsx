"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { AdminCounts } from "@/lib/admin";

/* ------------------------------------------------------------------ *
 *  How the counts reach the sidebar.
 *
 *  The rail is rendered by AppShell, in the (main) layout, ABOVE the admin
 *  layout in the tree. So the admin layout cannot hand it props and context
 *  cannot flow upward. The three obvious fixes are all worse:
 *
 *    - Query the counts in (main)/layout.tsx: six counts on EVERY page an
 *      admin loads, which is the exact waste this rebuild exists to remove.
 *    - Fetch them from the client: a second round trip for numbers the
 *      server already had in hand.
 *    - Put no counts in the rail: the owner's whole complaint is not being
 *      able to see what needs doing.
 *
 *  So the admin layout writes the numbers it already fetched into this
 *  module-level store, and the sidebar subscribes. The store is null until
 *  an admin route mounts, which is correct: outside /admin the rail is not
 *  showing these rows at all.
 * ------------------------------------------------------------------ */

let snapshot: AdminCounts | null = null;
const listeners = new Set<() => void>();

/** Stable identity for the server render, so useSyncExternalStore is happy. */
function getServerSnapshot(): AdminCounts | null {
  return null;
}

function getSnapshot(): AdminCounts | null {
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Value-compared, not identity-compared. `AdminCountsSync` receives a fresh
 * object on every render of the admin layout, and a plain assignment would
 * notify every subscriber each time, re-rendering the whole rail for numbers
 * that did not change.
 */
function publish(next: AdminCounts) {
  const same =
    snapshot !== null &&
    snapshot.waiting === next.waiting &&
    snapshot.messages === next.messages &&
    snapshot.reports === next.reports &&
    snapshot.people === next.people;
  if (same) return;
  snapshot = next;
  for (const listener of listeners) listener();
}

/**
 * Mounted once by the admin layout. Writes in an effect rather than during
 * render: publishing synchronously would call setState on the subscribed
 * sidebar mid-render, which React rightly refuses.
 */
export function AdminCountsSync({ counts }: { counts: AdminCounts }) {
  useEffect(() => {
    publish(counts);
  }, [counts]);
  return null;
}

/** Null until an admin route has mounted. Callers render no count for null. */
export function useAdminCounts(): AdminCounts | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
