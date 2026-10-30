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
 *  changes, and a "beat" every three minutes while the tab is visible AND
 *  the member has touched it recently. The second condition is what stops a
 *  tab left open overnight from reading as an eight-hour visit.
 *
 *  Renders nothing. Mounted once in the (main) layout, which persists across
 *  navigations, so the interval and listeners live for the whole sitting.
 * ------------------------------------------------------------------ */

/* Three minutes, the owner's pick (bug audit 3, Q27, 2026-10-29). Each beat
   is a function invocation and a pass through the proxy, and on Vercel's
   Hobby plan the whole site has four hours of server time a month; a beat a
   minute was the steadiest cost in it and the cheapest to cut. What the
   cadence still decides is where a visit ends when nothing else marks it:
   leaving is marked to the moment (the hidden-tab beat below) and going idle
   at the idle line itself (the closing beat below), so the three minutes
   only show when a tab dies without a word. presence-rule.test.mjs holds this
   against the windows that count on it: "On the site now" and the visit
   cookie both have to outlast more than one beat. */
const BEAT_MS = 3 * 60_000;
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
    /* Statistics. A failed ping is a few minutes missing from a chart. */
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
    let closing: number | undefined;
    const mark = () => {
      lastActive.current = Date.now();
    };
    const active = () =>
      document.visibilityState === "visible" && Date.now() - lastActive.current < IDLE_MS;

    const timer = window.setInterval(() => {
      if (!active()) return;
      /* The closing beat. When the member will cross the idle line before the
         next beat (unless they touch the page again), this beat waits for the
         line instead of going now, so a visit that ends in stillness ends at
         the five minutes IDLE_MS promises rather than up to BEAT_MS before
         them. Still one ping per beat, only later. At most, not under: when
         the line falls exactly on the next beat, that beat already finds the
         member idle and sends nothing, so this one has to be the closer. */
      const idleAt = lastActive.current + IDLE_MS;
      if (idleAt <= Date.now() + BEAT_MS) {
        window.clearTimeout(closing);
        closing = window.setTimeout(() => {
          if (document.visibilityState === "visible") ping("beat", path.current);
        }, idleAt - Date.now());
      } else {
        ping("beat", path.current);
      }
    }, BEAT_MS);

    /* Leaving: close the visit at the moment they went, not up to a beat
       before, and drop a closing beat still waiting, which would stretch the
       visit past it. Coming back: counts as activity, so the next beat is not
       lost. */
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        window.clearTimeout(closing);
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
      window.clearTimeout(closing);
      for (const e of events) window.removeEventListener(e, mark);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
