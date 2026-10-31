"use client";

/* ------------------------------------------------------------------ *
 *  <AnnouncementStart> — opens the announcement window over the Feed.
 *
 *  Rendered by the Feed page only when the window is due for this
 *  account (lib/announcement.ts), never while the guide's first-run tour
 *  is still to come, and never on the demo. docs/spec/announcement.md.
 *
 *  At once, like the tour, and for the owner's reason: "if it's a second
 *  or two, they might click or do something in that time" (2026-09-27).
 *  The only wait is the window's own chunk, fetched first so the sheet
 *  rises on its real entrance rather than appearing mid-animation.
 *
 *  The account's own record is the server's; announcementEnded() is this
 *  browser's note that it ended during this visit, which the layout and a
 *  prefetched Feed can both outlive (announcement-open.ts).
 * ------------------------------------------------------------------ */

import { useEffect } from "react";
import { announcementEnded, guideJustEnded, openAnnouncement } from "@/lib/announcement-open";

/** A start in flight, so two mounts at once cannot both open it. Released on
 *  unmount, because React's development double mount unmounts the first
 *  before its chunk arrives (guide-tour-start.tsx has the same latch). */
let started = false;

export function AnnouncementStart({
  userId,
  headcount,
  admissionNumber,
  replay = false,
}: {
  userId: string;
  headcount: number;
  admissionNumber: number | null;
  /** An admin's replay: shown whatever this browser or the account
   *  remembers, and the address loses its ?announcement=replay so a reload
   *  is an ordinary Feed. */
  replay?: boolean;
}) {
  useEffect(() => {
    if (started) return;
    /* Not twice in this browser, and not in the sitting the guide's tour
       ended in: that waits for the next. */
    if (!replay && (announcementEnded(userId) || guideJustEnded())) return;
    started = true;
    let cancelled = false;
    void import("./announcement-window").then(() => {
      if (cancelled) return;
      if (replay) window.history.replaceState(null, "", "/feed");
      openAnnouncement({ headcount, admissionNumber, replay });
    });
    /* Left the Feed before the chunk arrived: this visit does without it and
       the next Feed tries again. */
    return () => {
      cancelled = true;
      started = false;
    };
  }, [userId, headcount, admissionNumber, replay]);

  return null;
}
