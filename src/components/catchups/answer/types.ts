/* ------------------------------------------------------------------ *
 *  Catch-ups answering experience: shared client-side shapes.
 *
 *  A prompt carries its `kind` (from `promptKind(category)`), because the
 *  kind is what the answering control switches on: text writes prose, photo
 *  adds one picture, songs names a song. Everything downstream (the draft,
 *  the "has this been shared" test) is the same for all three.
 * ------------------------------------------------------------------ */

import type { PromptKind } from "@/lib/catchups-types";

type AnswerAsker = {
  id: string;
  name: string;
  photoUrl: string | null;
};

/**
 * One prompt's editable draft: what the viewer has typed/attached so far.
 *
 * `body` carries the written answer for a text prompt and the song name for a
 * songs prompt (see the TODO in song-attachment.tsx for why a named song lives
 * here rather than in the entry's Spotify columns). `images` carries photos:
 * up to three on a text prompt, exactly one on a photo prompt.
 */
export type AnswerEntryDraft = {
  body: string;
  images: string[];
};

export type AnswerPromptData = {
  id: string;
  text: string;
  /** Which control answers this question. Derived server-side from the category. */
  kind: PromptKind;
  /** The asker, or null when submitted anonymously (showAsker=false). */
  asker: AnswerAsker | null;
  entry: AnswerEntryDraft;
  /** The row version this page was rendered from, or null when the member has
   *  not answered this prompt yet. Sent back with every save so a second
   *  device cannot silently replace what the first one wrote (audit C-125). */
  entryUpdatedAt: string | null;
};

/** A prompt counts as "shared" once it carries text or a photo. */
export function isMeaningfulEntry(entry: AnswerEntryDraft): boolean {
  return Boolean(entry.body.trim().length > 0 || entry.images.length > 0);
}
