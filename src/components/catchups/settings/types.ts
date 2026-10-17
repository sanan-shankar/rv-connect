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

import type { EditionStatus, ReminderMode } from "@/lib/catchups-types";

export type SettingsCatchup = {
  catchupId: string;
  /** The display name, already through `catchupDisplayName`, so a Catch-up
   *  with no title of its own reads as its group everywhere. */
  name: string;
  isBatch: boolean;
  /** The running Edition's state, or `none` when the Catch-up is idle:
   *  nothing has started, the last one is out, or one fizzled
   *  (`isEditionRunning`). Idle draws no Edition rows here; Start is on the
   *  home. */
  state: EditionStatus | "none";
  ended: boolean;
  /** Everyone in it, the viewer included, for Start's confirmation: the
   *  number of bells it rings is the thing worth saying before it does. */
  people: number;
  /** Holds the CATCH-UP's identity: rename, end. False on every batch
   *  Catch-up -- the batch IS the roster, so there is nobody to rename it
   *  or end it. Narrower than `canRun` since 2026-09-27. */
  youKeep: boolean;
  /** May run the CYCLE: choose questions, open answering, nudge, close
   *  early, extend. True on every batch Catch-up too (owner, 2026-09-27:
   *  "make everyone a keeper"), which reverses his earlier N30. Starting an
   *  Edition is wider still -- anyone in any Catch-up, his answer of
   *  2026-10-17 -- so it is not gated on this. */
  canRun: boolean;
  canChangePicture: boolean;
  reminderMode: ReminderMode;
  /** The Edition the clock rows act on. Null when there is none. */
  editionId: string | null;
  answersCloseAt: string | null;
  picture: { src: string; focus: string };
};
