/* ------------------------------------------------------------------ *
 *  The announcement window's state in this browser.
 *
 *  OPEN, a tiny store read by <AnnouncementLayer> in the (main) layout,
 *  which outlives every page, so a link out of the window (the Support
 *  page, or the bird picker a payment lands on) closes it the way a
 *  link out of the guide closes the guide. The hoopoe's celebrations on
 *  the Feed read it too: they hold while a window is over them and play
 *  when it closes (docs/spec/guide.md 5.4).
 *
 *  ENDED, a per-member note in one-shot.ts, the app's one localStorage
 *  latch. The account's own record is User.announcementSeenAt; the note
 *  covers the visit the server write can be outlived by (the (main)
 *  layout and a prefetched Feed), exactly as the guide's tour note does
 *  (guide-tour.ts). The e2e sign-in writes it for its own account so the
 *  visual suite photographs the Feed, not this window.
 * ------------------------------------------------------------------ */

import { hasFired, markFired } from "@/components/mascot/moments/one-shot";
import { ANNOUNCEMENT_ID, heldForTheGuide } from "./announcement";
import { tourEndedAt } from "./guide-tour";

export const ANNOUNCEMENT_ENDED = `announcement-${ANNOUNCEMENT_ID}`;

export interface AnnouncementState {
  /** Members on the site, said in passing in the ask (headcountPhrase). */
  headcount: number;
  /** The member's own number, offered as an amount ("or even your admission
   *  number!"). */
  admissionNumber: number | null;
  /** An admin's replay: shown whatever is recorded, and recording nothing. */
  replay: boolean;
}

let current: AnnouncementState | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeAnnouncement(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function currentAnnouncement(): AnnouncementState | null {
  return current;
}

export function openAnnouncement(state: AnnouncementState): void {
  current = state;
  emit();
}

export function closeAnnouncement(): void {
  if (current === null) return;
  current = null;
  emit();
}

/** Set the moment it ends in this visit, before any storage is touched. */
let endedThisVisit = false;

export function announcementEnded(userId: string): boolean {
  return endedThisVisit || hasFired(userId, ANNOUNCEMENT_ENDED);
}

export function noteAnnouncementEnded(userId: string): void {
  endedThisVisit = true;
  markFired(userId, ANNOUNCEMENT_ENDED);
}

/** Whether the guide's tour ended in this sitting, so the window waits for
 *  the next one (announcement.ts, heldForTheGuide). */
export function guideJustEnded(): boolean {
  return heldForTheGuide(tourEndedAt(), Date.now());
}
