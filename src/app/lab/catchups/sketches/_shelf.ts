/* ------------------------------------------------------------------ *
 *  A shelf of Catch-ups, in every state a Catch-up can be in.
 *
 *  There is exactly one published Round on this database (F1), so the
 *  seven states cannot be read off it. They are built HERE, out of that
 *  Round's own questions and its own people, so every screen is drawn
 *  against real questions of real length written by real members, and
 *  only the state machine is invented. His ask, para 51: "it's important
 *  especially to see how literally every state of the catch up looks and
 *  every sequence of events through those states looks."
 *
 *  Everything derived from a date is derived from the Round's OWN
 *  publication date, never from `new Date()`: a clock read at render time
 *  gives the server one answer and the browser another, and React tears
 *  the page down over the difference.
 * ------------------------------------------------------------------ */

import type { SketchPerson, SketchQuestion, SketchRound } from "./_types";

/** The Round's state, which is the only thing the home's middle branches
 *  on. A Catch-up being paused is a MARK on one of these, never an
 *  eighth: today's pause replaces the page and hides a live Round
 *  (recon section 11). */
export type RoundState =
  | "none"
  | "collecting"
  | "answering"
  | "published"
  | "ended";

/* `preparing` is deleted, and it is deleted rather than redrawn. It is a
   hard-coded 24-hour hold between answers closing and the Round coming
   out (PREPARING_HOLD_HOURS in catchups-core.ts), during which nothing
   happens and nobody -- Keeper included -- can read a word. Its only real
   job is stopping a Round landing at 3am, and "Publish now" exists solely
   to skip it. His question, 2026-09-07: "Why doesn't it just publish
   immediately? Is there a reason we have to have a separate preparing
   section? I can't just publish at midnight and the deadline is done."
   There is not. Answers close and the Round comes out at the same moment,
   and that moment is a civil hour. One state, one console and one control
   go with it. */

export type ShelfRound = {
  number: number;
  questions: SketchQuestion[];
  /** Published only. */
  publishedAt: string | null;
  /** Answering only: when answers close, which is also when it comes out. */
  closesAt: string | null;
  /** Published only: when the next one opens, if it is known. */
  nextOpensAt: string | null;
  /** Answering only, by name, never a count (R21, R32). */
  wroteIn: SketchPerson[];
  /** Whether the viewer has written in this Round. */
  youAnswered: boolean;
  /** Invented. Whether the viewer has read it. */
  read: boolean;
  /** Photographs from inside the Round. A published Round's cover is
   *  these, not a list of its questions: "the way that it's shown over
   *  here, it just looks like a bunch of questions ... it looks like work
   *  honestly. It's not like an appetizing, beautiful thing you want to
   *  click and find out." (2026-09-07) A Round with none falls back to the
   *  Catch-up's own picture. */
  photos: string[];
};

export type SketchCatchup = {
  id: string;
  name: string;
  kind: "batch" | "people";
  /** The rhythm in words, and for a batch, whose it is. */
  meta: string;
  state: RoundState;
  paused: boolean;
  /** Whether the viewer keeps it: the CATCH-UP's verbs, which are rhythm,
   *  hold and end. A batch Catch-up has no Keeper and never gets these --
   *  nobody may rename a batch or change who is in it (his 2026-08-21
   *  reasoning, recon section 9). */
  youKeep: boolean;
  /** Whether the viewer may work the ROUND: start it early, open
   *  answering, nudge, close early, extend.
   *
   *  FALSE ON EVERY BATCH CATCH-UP, and that is the whole answer to who
   *  runs one. He caught the earlier "anyone in the batch can": "Can
   *  anyone open answering? That shouldn't be allowed. Because many people
   *  would click it by accident. Especially on a batch thing ... it seems
   *  like the kind of irreversible thing." So a batch Catch-up has NO
   *  manual transitions at all -- it runs on its rhythm, nobody opens or
   *  closes anything, and there is nothing to press by mistake. The only
   *  things anyone does on one are ask and answer. */
  canRun: boolean;
  /** The Round that Now is about. Null only when the state is `none`. */
  round: ShelfRound | null;
  /** Published Rounds that are NOT the one in Now, newest first. */
  before: ShelfRound[];
  /** Ended only. */
  endedAt: string | null;
  members: SketchPerson[];
  /** The Catch-up's picture. His, 2026-09-07: "Catch-ups is the only one
   *  that has like nothing, no images, no media. It's just all text and
   *  organization and very functional and very corporate ... let's just
   *  incorporate the image into the identity of the catch-up ... It's
   *  almost like a group chat photo."
   *
   *  Every Catch-up has one from the day it is made: one of about twenty
   *  photographs of the school, picked for it, and replaceable by
   *  whoever may run the Catch-up. Never optional, so there is never a
   *  Catch-up-without-a-picture layout to design as well -- which is the
   *  reason he gave for not making it an upload-only feature: "then we'd
   *  have to have 2 different architectures".
   *
   *  Stand-ins here, from the photographs already in the repository, so
   *  the shape can be judged before the real twenty are shot. */
  picture: string;
};

/** The pool a new Catch-up's picture is drawn from. These are the demo
 *  Collection's own files, standing in for the twenty he will supply.
 *  What the real twenty want to be is DETAILS -- a wall, a bit of the
 *  banyan, a shadow on a step -- rather than wide valley views: the
 *  landing page and half the Collection are already wide valley views, so
 *  twenty more would read as the same picture again, and a detail is what
 *  survives being cropped to 120px. */
export const PICTURES = [
  "/images/collection/demo-banyan-arch.webp",
  "/images/collection/demo-banyan-trunk.webp",
  "/images/collection/demo-banyan-benches.webp",
  "/images/collection/demo-banyan-canopy.webp",
  "/images/collection/demo-banyan-pillar.webp",
  "/images/collection/demo-assembly-wide.webp",
];

/* ── dates, all off the Round's own ────────────────────────────────── */

function shift(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/** "Friday 12 September". A deadline is a day of the week first, because
 *  that is how anyone reads one. */
export function dayAndDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "15 August". The year only when it is not this Round's own. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

/* ── the shelf ─────────────────────────────────────────────────────── */

/** Six Catch-ups covering all seven states, built from one real Round.
 *  The order is the order the list draws them in: whatever wants
 *  something from you first, then whatever there is to read, then the
 *  quiet ones. */
export function buildShelf(round: SketchRound): SketchCatchup[] {
  const q = round.questions;
  const base = round.publishedAt;
  const people = round.members;
  const wrote = round.contributors;

  /* Every photograph anyone put in this Round, in the order they appear.
     A cover takes the first few. */
  const shots = q.flatMap((s) => s.entries.flatMap((e) => e.images));
  const from = (n: number) => shots.slice(n, n + 4);

  const published: ShelfRound = {
    number: round.number,
    questions: q,
    publishedAt: base,
    closesAt: null,
    nextOpensAt: shift(base, 30),
    wroteIn: wrote,
    youAnswered: true,
    read: false,
    photos: from(0),
  };

  return [
    /* Answers are open. The one Catch-up that wants something from you,
       and the reason it sorts first. */
    {
      id: "batch-2005",
      name: "Batch of 2005",
      kind: "batch",
      meta: "Everyone from 2005 · every three months",
      state: "answering",
      paused: false,
      youKeep: false,
      canRun: false,
      round: {
        number: 4,
        questions: q.slice(0, 5),
        publishedAt: null,
        closesAt: shift(base, 5),
        nextOpensAt: null,
        wroteIn: wrote.slice(0, 6),
        youAnswered: false,
        read: false,
        photos: [],
      },
      before: [
        { ...published, number: 3, publishedAt: shift(base, -90), questions: q.slice(0, 6), read: true, photos: from(4) },
        { ...published, number: 2, publishedAt: shift(base, -180), questions: q.slice(4, 9), read: true, photos: from(8) },
      ],
      endedAt: null,
      members: people,
      picture: PICTURES[0],
    },

    /* Out, and not yet read. The whole panel opens the reader. */
    {
      id: round.catchupId,
      name: round.catchupName,
      kind: "people",
      meta: "Every month",
      state: "published",
      paused: false,
      youKeep: true,
      canRun: true,
      round: published,
      before: [],
      endedAt: null,
      members: people,
      picture: PICTURES[1],
    },

    /* Questions are being gathered. */
    {
      id: "sunday-four",
      name: "the sunday four",
      kind: "people",
      meta: "Every month",
      state: "collecting",
      paused: false,
      youKeep: true,
      canRun: true,
      round: {
        number: 2,
        questions: q.slice(5, 8),
        publishedAt: null,
        closesAt: null,
        nextOpensAt: null,
        wroteIn: [],
        youAnswered: false,
        read: false,
        photos: [],
      },
      before: [{ ...published, number: 1, publishedAt: shift(base, -60), questions: q.slice(2, 7), read: true, photos: from(2) }],
      endedAt: null,
      members: people.slice(0, 4),
      picture: PICTURES[2],
    },

    /* Out, and read, with two behind it. The state `preparing` used to sit
       here and is deleted; a Round now comes out at the moment answers
       close. */
    {
      id: "crimes",
      name: "photographs & other crimes",
      kind: "people",
      meta: "Every three months",
      state: "published",
      paused: false,
      youKeep: true,
      canRun: true,
      round: {
        ...published,
        number: 3,
        publishedAt: shift(base, -14),
        questions: q.slice(3, 7),
        wroteIn: wrote.slice(0, 9),
        read: true,
        photos: from(4),
      },
      before: [
        { ...published, number: 2, publishedAt: shift(base, -95), questions: q.slice(0, 4), read: true, photos: from(8) },
        { ...published, number: 1, publishedAt: shift(base, -190), questions: q.slice(2, 6), read: true, photos: [] },
      ],
      endedAt: null,
      members: people.slice(0, 8),
      picture: PICTURES[3],
    },

    /* A batch whose first day it is. Nobody has started anything. */
    {
      id: "batch-1978",
      name: "Batch of 1978",
      kind: "batch",
      meta: "Everyone from 1978 · every three months",
      state: "none",
      paused: false,
      youKeep: false,
      canRun: false,
      round: null,
      before: [],
      endedAt: null,
      members: people.slice(0, 11),
      picture: PICTURES[4],
    },

    /* Over. */
    {
      id: "test",
      name: "test",
      kind: "people",
      meta: "Every month",
      state: "ended",
      paused: false,
      youKeep: true,
      canRun: true,
      round: null,
      before: [{ ...published, number: 1, publishedAt: shift(base, -240), questions: q.slice(0, 5), read: true, photos: from(6) }],
      endedAt: shift(base, -120),
      members: people.slice(0, 5),
      picture: PICTURES[5],
    },
  ];
}

/** The paused variant of a Catch-up, for the home's state picker. A
 *  pause is a mark on whatever the Round is doing, so this is the same
 *  Catch-up with one flag turned on and nothing else changed. */
export function paused(c: SketchCatchup): SketchCatchup {
  return { ...c, id: `${c.id}-paused`, paused: true };
}

/** The Catch-ups a member actually has on their list, in order. Two or
 *  three is the real number (I12); the room can show more. */
export function shelfOf(all: SketchCatchup[], howMany: number): SketchCatchup[] {
  return all.slice(0, howMany);
}

/** The home, in every state a Round can be in, plus paused. The room's
 *  state picker walks this list; the list page shows six of the same
 *  Catch-ups in the order a member would meet them. */
export function homeVariants(
  all: SketchCatchup[],
): Array<{ key: string; label: string; c: SketchCatchup }> {
  const by = (id: string) => all.find((c) => c.id.startsWith(id)) ?? all[0];
  const answering = all.find((c) => c.state === "answering") ?? all[0];
  return [
    { key: "none", label: "No Round yet", c: by("batch-1978") },
    { key: "collecting", label: "Collecting", c: by("sunday-four") },
    { key: "answering", label: "Answering", c: answering },
    { key: "issues", label: "Out, with earlier ones", c: by("crimes") },
    { key: "published", label: "Published", c: all.find((c) => c.state === "published") ?? all[0] },
    /* A pause is a mark on a live Round, so the illustrative case is a
       Round mid-answer: everything is still on the page, marked Paused,
       with the actions frozen and Resume in their place. */
    { key: "paused", label: "Paused", c: paused(answering) },
    { key: "ended", label: "Ended", c: by("test") },
  ];
}
