/* ------------------------------------------------------------------ *
 *  What the settings surface needs to know about a Catch-up.
 *
 *  Built by the home's server load and passed down once. It is a view
 *  model rather than the row: every permission on it decides what is
 *  OFFERED, and every action behind it re-derives the same question from
 *  the database for itself. `canRun` being wrong here would draw a
 *  control that the server then refuses, which is a bug; it would never
 *  let anybody do anything.
 * ------------------------------------------------------------------ */

import type { Cadence, EditionStatus, ReminderMode } from "@/lib/catchups-types";

export type SettingsCatchup = {
  catchupId: string;
  /** The display name, already through `catchupDisplayName`, so a Catch-up
   *  with no title of its own reads as its group everywhere. */
  name: string;
  isBatch: boolean;
  /** The live Edition's state, or `none` when there is not one. */
  state: EditionStatus | "none";
  paused: boolean;
  ended: boolean;
  /** Holds the CATCH-UP's identity: rename, rhythm, end. False on every
   *  batch Catch-up -- the batch IS the roster, so there is nobody to
   *  rename it, change its rhythm or end it. Narrower than `canRun` since
   *  2026-09-27; it used to also gate hold/resume, which moved to `canRun`
   *  when those became a cycle verb everyone in a batch holds. */
  youKeep: boolean;
  /** May run the CYCLE: choose questions, open answering, nudge, close
   *  early, extend, start the next Edition, hold and resume. True on every
   *  batch Catch-up too (owner, 2026-09-27: "make everyone a keeper"),
   *  which reverses his earlier N30 -- the accident worry that word
   *  answered is why a batch starts paused, not why this stays refused. */
  canRun: boolean;
  canChangePicture: boolean;
  cadence: Cadence;
  reminderMode: ReminderMode;
  /** The Edition the clock rows act on. Null when there is none. */
  editionId: string | null;
  answersCloseAt: string | null;
  picture: { src: string; focus: string };
};
