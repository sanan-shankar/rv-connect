/* ------------------------------------------------------------------ *
 *  The contract a direction's sketch implements.
 *
 *  /lab/catchups/sketches is the CULL, not the pick (handover, "S3:
 *  Directions"): one real Round, drawn once per direction, the reader
 *  only, so the owner can flick between them on his phone and kill the
 *  ones nobody should spend a room on. Static is fine and expected; the
 *  rooms S4 builds are where a navigator has to be tappable for real.
 *
 *  Three drawings per direction, because the reader's whole complaint is
 *  about what happens AFTER the first screen (brief ¶11: "At some point I
 *  scroll on a question, and then I don't even know what the question is,
 *  on my phone"):
 *    Reader        the page from the top, at the viewport's width, natural
 *                  height, the first three questions with every answer;
 *    MidScroll     one 390x844 phone screen deep in question 5, the
 *                  navigator RESTING: what persists, what names the
 *                  question you are in;
 *    NavigatorOpen one 390x844 phone screen with the navigator OPEN.
 *
 *  A sketch is drawn inside a fixed-width frame that the harness scales
 *  to fit (see _frame.tsx), so it must size itself from the `viewport`
 *  prop and never from Tailwind's sm:/lg: prefixes, which answer to the
 *  real window rather than the frame. Anything that would be `fixed` on a
 *  real phone is `absolute` inside the 390x844 frames.
 *
 *  The data is the live "in the loop" Round 1 (13 people, 133 answers),
 *  read from the database at render time, the way the lab already does
 *  and the owner approved (handover, owner question 5). Members' words
 *  stay on this admin-only page and never enter git.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
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
  /** What the byline prints under a name: "Batch of '11", "Teacher", "Member". */
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
  /** Comments do not exist yet (they are LOCKED in, D7). A deterministic
   *  invented count per answer, 0 to 4, so a sketch can draw the affordance
   *  with a believable spread. Any comment TEXT a sketch shows is invented
   *  by the sketch and labelled so. */
  commentCount: number;
};

export type SketchQuestion = {
  id: string;
  text: string;
  kind: "text" | "photo" | "songs";
  showAsker: boolean;
  asker: SketchPerson | null;
  entries: SketchEntry[];
};

export type SketchRound = {
  catchupId: string;
  /** Plain, no suffix (¶25). */
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

export type SketchProps = { round: SketchRound; viewport: SketchViewport };

export type SketchDirection = {
  /** Matches the direction file's slug in docs/planning/catchups-rework/directions/. */
  slug: string;
  /** The direction's name, after what it does (lab-voice.md). */
  name: string;
  /** One sentence: what it bets on. Shown under the name in the harness. */
  thesis: string;
  Reader: (props: SketchProps) => ReactNode;
  MidScroll: (props: { round: SketchRound }) => ReactNode;
  NavigatorOpen: (props: { round: SketchRound }) => ReactNode;
};
