/* ------------------------------------------------------------------ *
 *  The shape of one published Round, as the sketch room draws it.
 *
 *  A drawing is made inside a fixed-width frame that the harness scales
 *  to fit (see _frame.tsx), so it sizes itself from the `viewport` prop
 *  and never from Tailwind's sm:/lg: prefixes, which answer to the real
 *  window rather than the frame. Anything that would be `fixed` on a real
 *  phone is `absolute` or `sticky` inside the frames.
 *
 *  The data is the live "in the loop" Round 1 (13 people, 133 answers),
 *  read from the database at render time, the way the lab already does
 *  and the owner approved (handover, owner question 5). Members' words
 *  stay on this admin-only page and never enter git.
 * ------------------------------------------------------------------ */

import type { StoredPhoto } from "@/lib/photo-layout";
import type { SketchMedia } from "./_media";

export type SketchViewport = "phone" | "laptop";

/** His phone and his MacBook (recon.md, "How this was looked at"). */
export const VIEWPORT_WIDTH: Record<SketchViewport, number> = { phone: 390, laptop: 1512 };
export const PHONE_HEIGHT = 844;

export type SketchPerson = {
  id: string;
  name: string;
  batchYear: number | null;
  /** What a byline USED to print under a name. Kept on the type because
   *  the loader fills it; nothing in the front runner prints it. */
  batchLine: string;
  photoUrl: string | null;
  birdOverride: string | null;
  isKeeper: boolean;
};

export type SketchSong = { url: string; title: string; art: string | null };

export type SketchEntry = {
  id: string;
  author: SketchPerson;
  body: string | null;
  images: string[];
  /** Measured shape per image, same order; null when never measured. */
  photos: (StoredPhoto | null)[];
  song: SketchSong | null;
  /** Spotify and YouTube links found in the body and resolved to a title,
   *  an artist and a still. See _media.ts: on this Round the `song` column
   *  above is null on every single answer, and the links people actually
   *  pasted are sitting in their body text as raw URLs. */
  media: SketchMedia[];
  /** The body with those links removed, so a card is not printed twice. */
  text: string;
  loveCount: number;
  lovedByViewer: boolean;
  createdAt: string;
  /** Replies do not exist yet (they are LOCKED in, D7). A deterministic
   *  invented count per answer, 0 to 4, so the drawing can carry the
   *  control with a believable spread. Any reply TEXT shown is invented
   *  by the drawing and labelled so. */
  commentCount: number;
};

export type SketchQuestion = {
  id: string;
  text: string;
  kind: "text" | "photo" | "songs";
  /** "library" | "member" | "keeper". Only a member-written question names
   *  its asker: see AskedBy in _parts.tsx. */
  source: string;
  showAsker: boolean;
  asker: SketchPerson | null;
  /** The name to print after "Asked by", or nothing. Decided once, in the
   *  loader, through `askerVisible`; a drawing only prints it. */
  askedBy: string | null;
  entries: SketchEntry[];
};

export type SketchRound = {
  catchupId: string;
  /** Plain, no suffix (brief para 25). */
  catchupName: string;
  number: number;
  publishedAt: string;
  nextOpensAt: string | null;
  cadence: string;
  /** Everyone in the Catch-up, Keeper first, then alphabetical. */
  members: SketchPerson[];
  /** Everyone who wrote in, in the order they first appear. */
  contributors: SketchPerson[];
  questions: SketchQuestion[];
  /** The signed-in admin, for "you" states. */
  viewer: SketchPerson;
};
