"use client";

/* ------------------------------------------------------------------ *
 *  <GuideTourStart> — starts the guide's first-run tour over the Feed.
 *
 *  Rendered by the Feed page only while User.guideSeenAt is null, and
 *  never on the demo. docs/spec/guide.md section 5.
 *
 *  AT ONCE, NOT AFTER A BEAT. The owner, 2026-09-27: "maybe after a
 *  second or two, or maybe maybe it just immediately pops up. Because if
 *  it's a second or two, they might click or do something in that time."
 *  The only wait is the sheet's own chunk, fetched here first so that the
 *  sheet rises on its real entrance rather than appearing mid-animation;
 *  on a fresh load that is the same chunk the title door would fetch.
 *
 *  ONLY THE FEED. A member arriving from an emailed reminder or an
 *  invitation came to do one thing, and the Feed is where "/" sends
 *  everyone, so it is where "the next time they open the URL" lands.
 *
 *  The account's own "done" is the server's; tourEnded() is this
 *  browser's note that it ended during this visit, which the layout and a
 *  prefetched Feed can both outlive (lib/guide-tour.ts).
 * ------------------------------------------------------------------ */

import { useEffect } from "react";
import { guideChain } from "@/lib/guide-areas";
import { startTour } from "@/lib/guide-open";
import { tourEnded, tourStartArea } from "@/lib/guide-tour";

/** A start in flight, so two mounts at once (the Feed and its own refresh)
 *  cannot both start it. Released on unmount: React's development double
 *  mount unmounts the first before its chunk arrives, and a latch that
 *  outlived it would stop the second from ever starting. */
let started = false;

export function GuideTourStart({ userId, isTeacher }: { userId: string; isTeacher: boolean }) {
  useEffect(() => {
    /* tourEnded() and the account can disagree when the stamp was lost on
       the way. That is left alone rather than re-sent from here: the e2e
       sign-in writes the browser note for the owner's own account so the
       visual suite sees the Feed, and re-sending would spend his real tour.
       The cost of a lost stamp is one more tour on another device. */
    if (started || tourEnded(userId)) return;
    started = true;
    const area = tourStartArea(userId, guideChain(isTeacher));
    let cancelled = false;
    void import("./guide-body").then(() => {
      if (!cancelled) startTour(area);
    });
    /* Left the Feed before the chunk arrived: the member has already gone to
       do something, so this visit does without it and the next Feed tries
       again. Once the tour has started, leaving the Feed ends it (the layer
       closes the guide on navigation), so the next Feed finds it ended. */
    return () => {
      cancelled = true;
      started = false;
    };
  }, [userId, isTeacher]);

  return null;
}
