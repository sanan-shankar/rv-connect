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
  /** Holds the CATCH-UP's verbs: rename, rhythm, hold, end. False on every
   *  batch Catch-up, where nobody keeps it. */
  youKeep: boolean;
  /** May work the EDITION: open answering, nudge, close early, extend, start
   *  the next one. False on every batch Catch-up, which is his own correction
   *  (N30) -- a batch runs on its rhythm and there is nothing to press by
   *  mistake. */
  canRun: boolean;
  canChangePicture: boolean;
  cadence: Cadence;
  reminderMode: ReminderMode;
  /** The Edition the clock rows act on. Null when there is none. */
  editionId: string | null;
  answersCloseAt: string | null;
  picture: { src: string; focus: string };
};
