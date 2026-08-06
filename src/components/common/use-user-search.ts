"use client";

/* ------------------------------------------------------------------ *
 *  useUserSearch - the debounced people search behind every "find
 *  someone by name" field.
 *
 *  Extracted 2026-08-05, when the Catch-up people panel became the
 *  second copy of this. Both callers had independently arrived at the
 *  same three decisions, which is the sign it belongs in one place:
 *  debounce the keystrokes, drop a response a newer keystroke has
 *  already superseded, and treat a failed request as "no results"
 *  rather than an error state a name field has no room to show.
 *
 *  Callers own the input and the rendering; this owns only the fetch.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";

/** The shape `/api/users/search` returns. */
export interface SearchedPerson {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride: string | null;
  batchYear: number | null;
}

const DEBOUNCE_MS = 200;

export function useUserSearch(query: string): {
  results: SearchedPerson[];
  searching: boolean;
  /** Clear results without waiting for the debounce, e.g. right after a pick. */
  reset: () => void;
} {
  const [results, setResults] = useState<SearchedPerson[]>([]);
  const [searching, setSearching] = useState(false);
  /**
   * Monotonic id per request. A slow response for "sa" must not overwrite the
   * results for "sanan" typed after it, and an aborted-looking stale response
   * must not clear the spinner someone else owns.
   */
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // Bump the id so an in-flight request cannot land after this clear.
      requestId.current += 1;
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (id !== requestId.current) return;
        setResults(Array.isArray(data) ? data : []);
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function reset() {
    requestId.current += 1;
    setResults([]);
    setSearching(false);
  }

  return { results, searching, reset };
}
