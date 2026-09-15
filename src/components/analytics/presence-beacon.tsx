"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/* ------------------------------------------------------------------ *
 *  Tells the visit statistics which page a member is really on, and for
 *  how long.
 *
 *  This used to be the (main) layout's job, and the layout was the wrong
 *  witness twice over (measured on the live Visit table, 2026-09-15):
 *
 *   - It renders for Next's link PREFETCHES. A member sitting on the feed
 *     "visited" /support three times in seven seconds, and the page recorded
 *     as where they ended up was whichever sidebar link was prefetched last.
 *   - It renders only when a page does, so a visit's length stood still
 *     while somebody read. One letter for ten minutes lasted 0s.
 *
 *  So the browser reports instead: a "view" when the pathname actually
 *  changes, and a "beat" once a minute while the tab is visible AND the
 *  member has touched it recently. The second condition is what stops a tab
 *  left open overnight from reading as an eight-hour visit.
 *
 *  Renders nothing. Mounted once in the (main) layout, which persists across
 *  navigations, so the interval and listeners live for the whole sitting.
 * ------------------------------------------------------------------ */

/* One minute: a visit's length is honest to within a minute, which is finer
   than any question the room asks, for one small UPDATE per active member. */
const BEAT_MS = 60_000;
/* Idle past five minutes and the beats stop. Long enough to read a letter
   without scrolling; short enough that a forgotten tab stops counting. */
const IDLE_MS = 5 * 60_000;

function ping(kind: "view" | "beat", path: string) {
  /* The admin panel is the owner working, not the community using the site;
     the route refuses it too, this just saves the request. */
  if (path.startsWith("/admin")) return;
  /* keepalive, so the beat sent as the tab hides still lands. */
  fetch("/api/presence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, path }),
    keepalive: true,
  }).catch(() => {
    /* Statistics. A failed ping is a minute missing from a chart. */
  });
}

export function PresenceBeacon() {
  const pathname = usePathname();
  const path = useRef(pathname);
  const lastActive = useRef(0);

  useEffect(() => {
    path.current = pathname;
    lastActive.current = Date.now();
    ping("view", pathname);
  }, [pathname]);

  useEffect(() => {
    const mark = () => {
      lastActive.current = Date.now();
    };
    const active = () =>
      document.visibilityState === "visible" && Date.now() - lastActive.current < IDLE_MS;

    const timer = window.setInterval(() => {
      if (active()) ping("beat", path.current);
    }, BEAT_MS);

    /* Leaving: close the visit at the moment they went, not up to a minute
       before. Coming back: counts as activity, so the next beat is not lost. */
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (Date.now() - lastActive.current < IDLE_MS) ping("beat", path.current);
      } else {
        mark();
      }
    };

    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, mark, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      for (const e of events) window.removeEventListener(e, mark);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
