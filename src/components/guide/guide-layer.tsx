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
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { findGuideArea } from "@/lib/guide-areas";
import { subscribeGuide, closeGuide, currentGuide } from "@/lib/guide-open";

/* The overlay and the six chapters are ~14 KB raw, and this component is
   mounted in the (main) layout on all 39 member routes. It already rendered
   nothing until a title was pressed; only the IMPORT was eager, and an import
   ships whichever way the branch goes. `ssr: false` is not a compromise here:
   the server snapshot below is null by design, so there was never any server
   HTML to lose. GuideDoor warms the chunk on hover and focus.

   `findGuideArea` and the areas list stay static -- guide-areas.ts is plain
   data the sidebar and the door both import, and its own comment says so. */
const GuideBody = dynamic(() => import("./guide-body").then((m) => m.GuideBody), {
  ssr: false,
});

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

  /* Next navigating elsewhere underneath an open chapter means the member went
     somewhere else, so the chapter goes with the page it belonged to. Opening
     a chapter no longer changes the address at all, so this only ever fires on
     a real navigation. */
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    closeGuide();
  }, [pathname]);

  const found = area ? findGuideArea(area) : undefined;
  if (!found) return null;

  return <GuideBody slug={found.slug} title={found.title} />;
}
