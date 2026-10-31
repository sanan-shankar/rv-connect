"use client";

/* ------------------------------------------------------------------ *
 *  <AnnouncementLayer> — mounted once in the (main) layout, renders
 *  nothing until the Feed opens the announcement window.
 *
 *  It lives in the layout rather than on the Feed for the guide layer's
 *  reason: it outlives every page, so a link out of the window (the bird
 *  picker a payment lands on) closes the window instead of tearing it
 *  down with the Feed.
 *
 *  It also keeps the books. The window is one page, so it has been seen
 *  the moment it opens, and that is when it is noted: on the account
 *  (markAnnouncementSeen), so it never opens again on any device, and in
 *  this browser (announcement-open.ts) for the visit the server write can
 *  be outlived by. An admin's replay records nothing.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { markAnnouncementSeen } from "@/app/(main)/announcement/actions";
import { usePathname } from "next/navigation";
import {
  announcementEnded,
  closeAnnouncement,
  currentAnnouncement,
  noteAnnouncementEnded,
  subscribeAnnouncement,
} from "@/lib/announcement-open";

/* The window, the wall and the contribute form are the Feed's to fetch
   (AnnouncementStart warms this chunk before it opens the window), never
   part of the first load of the 39 routes this layout serves. */
const AnnouncementWindow = dynamic(
  () => import("./announcement-window").then((m) => m.AnnouncementWindow),
  { ssr: false },
);

const serverSnapshot = () => null;

/* The account's stamp, tried again if it does not land (a dropped connection,
   a server hiccup), twice more over the next ten seconds while the member is
   still reading. A write that never lands costs at most a second showing on
   another device; this browser's own note keeps it shut here either way. */
async function stampAccount() {
  for (const pause of [0, 2000, 8000]) {
    if (pause) await new Promise((resolve) => setTimeout(resolve, pause));
    try {
      if (await markAnnouncementSeen()) return;
    } catch {
      /* Unreachable server: the next try, or the note, covers it. */
    }
  }
}

export function AnnouncementLayer({ userId }: { userId: string }) {
  const state = useSyncExternalStore(subscribeAnnouncement, currentAnnouncement, serverSnapshot);

  /* A real navigation underneath the window means the member went
     somewhere, so the window goes with the page it was over. */
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    closeAnnouncement();
  }, [pathname]);

  useEffect(() => {
    if (!state || state.replay || announcementEnded(userId)) return;
    noteAnnouncementEnded(userId);
    void stampAccount();
  }, [state, userId]);

  if (!state) return null;
  return <AnnouncementWindow headcount={state.headcount} admissionNumber={state.admissionNumber} />;
}
