"use client";

/* ------------------------------------------------------------------ *
 *  <GuideLayer> — mounted once in the (main) layout, renders nothing
 *  until somebody presses a page title or the Feed starts the tour.
 *
 *  This is what replaced the intercepting route. The route is still
 *  there and still serves cold loads and shared links; it simply is not
 *  in the path of a press any more, because it cost 400ms before the
 *  sheet existed. See src/lib/guide-open.ts for the measurement.
 *
 *  It also keeps the first-run tour's books (docs/spec/guide.md 5.3),
 *  because it is the one piece of the guide that outlives every page:
 *  the chapter reached, and the end of the tour, which is the moment it
 *  closes for any reason or reaches its last page, whichever is first.
 *  Leaving the Feed through a link inside the tour ends it too, through
 *  the navigation close below.
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { markGuideSeen } from "@/app/(main)/guide/actions";
import { findGuideArea, guideChain } from "@/lib/guide-areas";
import { subscribeGuide, closeGuide, currentGuide } from "@/lib/guide-open";
import { noteTourAt, noteTourEnded, tourEnded } from "@/lib/guide-tour";

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

/** `isTeacher` decides the chain Next walks: teachers have no Catch-ups. */
export function GuideLayer({ userId, isTeacher }: { userId: string; isTeacher: boolean }) {
  /* useSyncExternalStore rather than an effect that mirrors the store into
     state: this IS an external store, and mirroring it costs a second render
     on every open for no benefit. It also keeps the server snapshot honest,
     which matters because this component is rendered inside a server layout. */
  const guide = useSyncExternalStore(subscribeGuide, currentGuide, serverSnapshot);
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  const chain = useMemo(() => guideChain(isTeacher), [isTeacher]);
  const touring = useRef(false);

  /* Next navigating elsewhere underneath an open chapter means the member went
     somewhere else, so the chapter goes with the page it belonged to. Opening
     a chapter no longer changes the address at all, so this only ever fires on
     a real navigation. */
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    closeGuide();
  }, [pathname]);

  useEffect(() => {
    const end = () => {
      if (tourEnded(userId)) return;
      noteTourEnded(userId);
      markGuideSeen().catch((err) => {
        if (process.env.NODE_ENV !== "production") console.error("[guide] tour stamp failed", err);
      });
    };
    if (guide?.tour) {
      touring.current = true;
      const at = chain.indexOf(guide.area);
      noteTourAt(userId, at);
      if (at === chain.length - 1) end();
    } else if (touring.current && !guide) {
      touring.current = false;
      end();
    }
  }, [guide, userId, chain]);

  const found = guide ? findGuideArea(guide.area) : undefined;
  if (!guide || !found) return null;

  return <GuideBody slug={found.slug} title={found.title} chain={chain} tour={guide.tour} />;
}
