/* ------------------------------------------------------------------ *
 *  Catch-ups answering experience: shared client-side shapes.
 *
 *  `SongState` reuses the app-wide `CatchupSongView` (WP1, catchups-types.ts)
 *  rather than inventing a parallel shape, so this screen and the reader
 *  (round/*) agree on exactly what a resolved song looks like.
 * ------------------------------------------------------------------ */

import type { CatchupSongView } from "@/lib/catchups-types";

export type SongState = CatchupSongView | null;

export type AnswerAsker = {
  id: string;
  name: string;
  photoUrl: string | null;
};

/** One prompt's editable draft: what the viewer has typed/attached so far. */
export type AnswerEntryDraft = {
  body: string;
  images: string[];
  song: SongState;
};

export type AnswerPromptData = {
  id: string;
  text: string;
  /** The asker, or null when submitted anonymously (showAsker=false). */
  asker: AnswerAsker | null;
  entry: AnswerEntryDraft;
};

/** A prompt counts as "shared" once it carries text, a photo, or a song. */
export function isMeaningfulEntry(entry: AnswerEntryDraft): boolean {
  return Boolean(entry.body.trim().length > 0 || entry.images.length > 0 || entry.song);
}
