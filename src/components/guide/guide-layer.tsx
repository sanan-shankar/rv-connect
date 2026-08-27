"use client";

/* ------------------------------------------------------------------ *
 *  <GuideLayer> — mounted once in the (main) layout, renders nothing
 *  until somebody presses a page title.
 *
 *  This is what replaced the intercepting route. The route is still
 *  there and still serves cold loads and shared links; it simply is not
 *  in the path of a press any more, because it cost 400ms before the
 *  sheet existed. See src/lib/guide-open.ts for the measurement.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { findGuideArea } from "@/lib/guide-areas";
import { CHAPTERS } from "./chapters";
import { GuideOverlay } from "./guide-overlay";
import { subscribeGuide, syncGuideFromHistory, resetGuide, currentGuide } from "@/lib/guide-open";

/** The server renders nothing here, always. */
const serverSnapshot = () => null;

export function GuideLayer() {
  /* useSyncExternalStore rather than an effect that mirrors the store into
     state: this IS an external store, and mirroring it costs a second render
     on every open for no benefit. It also keeps the server snapshot honest,
     which matters because this component is rendered inside a server layout. */
  const area = useSyncExternalStore(subscribeGuide, currentGuide, serverSnapshot);
  const pathname = usePathname();
  const firstPath = useRef(pathname);

  useEffect(() => {
    const onPop = () => syncGuideFromHistory();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* Next navigating elsewhere underneath an open chapter means the member went
     somewhere else, so the chapter goes with the page it belonged to. Opening
     a chapter no longer changes the address at all, so this only ever fires on
     a real navigation. */
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    resetGuide();
  }, [pathname]);

  const found = area ? findGuideArea(area) : undefined;
  const Chapter = found ? CHAPTERS[found.slug] : undefined;
  if (!found || !Chapter) return null;

  return (
    <GuideOverlay title={found.title}>
      <Chapter />
    </GuideOverlay>
  );
}
