/* ------------------------------------------------------------------ *
 *  A shelf of Catch-ups, in every state a Catch-up can be in.
 *
 *  There is exactly one published Edition on this database (F1), so the
 *  seven states cannot be read off it. They are built HERE, out of that
 *  Edition's own questions and its own people, so every screen is drawn
 *  against real questions of real length written by real members, and
 *  only the state machine is invented. His ask, para 51: "it's important
 *  especially to see how literally every state of the catch up looks and
 *  every sequence of events through those states looks."
 *
 *  Everything derived from a date is derived from the Edition's OWN
 *  publication date, never from `new Date()`: a clock read at render time
 *  gives the server one answer and the browser another, and React tears
 *  the page down over the difference.
 * ------------------------------------------------------------------ */

import { CATCHUP_PICTURES, type CatchupPicture } from "@/lib/catchup-pictures";
import type { SketchPerson, SketchQuestion, SketchEdition } from "./_types";

/*  An Edition's state, which is the only thing the home's middle branches
 *  on. A Catch-up being paused is a MARK on one of these, never a
 *  fifth: today's pause replaces the page and hides a live Edition
 *  (recon section 11). */
export type EditionState =
  | "collecting"
  | "answering"
  | "published"
  | "ended";

/* `preparing` is deleted, and it is deleted rather than redrawn. It is a
   hard-coded 24-hour hold between answers closing and the Edition coming
   out (PREPARING_HOLD_HOURS in catchups-core.ts), during which nothing
   happens and nobody -- Keeper included -- can read a word. Its only real
   job is stopping an Edition landing at 3am, and "Publish now" exists solely
   to skip it. His question, 2026-09-07: "Why doesn't it just publish
   immediately? Is there a reason we have to have a separate preparing
   section? I can't just publish at midnight and the deadline is done."
   There is not. Answers close and the Edition comes out at the same moment,
   and that moment is a civil hour. One state, one console and one control
   go with it. */

export type ShelfEdition = {
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
  /** Whether the viewer has written in this Edition. */
  youAnswered: boolean;
  /** Invented. Whether the viewer has read it. */
  read: boolean;
  /** Photographs from inside the Edition. A published Edition's cover is
   *  these, not a list of its questions: "the way that it's shown over
   *  here, it just looks like a bunch of questions ... it looks like work
   *  honestly. It's not like an appetizing, beautiful thing you want to
   *  click and find out." (2026-09-07) An Edition with none falls back to the
   *  Catch-up's own picture. */
  photos: string[];
};

export type SketchCatchup = {
  id: string;
  name: string;
  kind: "batch" | "people";
  /** The rhythm in words, and for a batch, whose it is. */
  meta: string;
  state: EditionState;
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
  /** The Edition that Now is about. Null only when the state is `none`. */
  edition: ShelfEdition | null;
  /** Published Editions that are NOT the one in Now, newest first. */
  before: ShelfEdition[];
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
  picture: Picture;
};

/* The pool, and the type the room's cards carry. BOTH MOVED OUT OF THIS
   FILE on 2026-09-08 (spec 3.4): the picture is a real column now, and the
   pool has to be readable by the creation path, the settings control and
   the demo seed -- none of which can import a lab room, because the public
   demo's build does not compile one. The judgement that picked these six
   and the crop each is taken at travelled with them; see
   src/lib/catchup-pictures.ts. Re-exported here so the room reads the same
   as it did, and so there is only ever one pool. */
export type Picture = CatchupPicture;
export const PICTURES = CATCHUP_PICTURES;

/* ── dates, all off the Edition's own ────────────────────────────────── */

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

/** "15 August 2026". A published Edition is dated in full, because that date
 *  is its NAME -- the Edition number is gone, so this is the only thing that
 *  tells one apart from another, and a shelf of them spans years. His,
 *  2026-09-07: "also include the year for the past editions not just the date
 *  and the month."
 *
 *  The live deadline keeps `dayAndDate` below and stays year-less: a deadline
 *  is always within a fortnight, so a year on it is the kind of true, useless
 *  fact he keeps taking out. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ── the shelf ─────────────────────────────────────────────────────── */

/** Six Catch-ups covering all seven states, built from one real Edition.
 *  The order is the order the list draws them in: whatever wants
 *  something from you first, then whatever there is to read, then the
 *  quiet ones. */
export function buildShelf(edition: SketchEdition): SketchCatchup[] {
  const q = edition.questions;
  const base = edition.publishedAt;
  const people = edition.members;
  const wrote = edition.contributors;

  /* Every photograph anyone put in this Edition, in the order they appear.
     A cover takes the first few. */
  const shots = q.flatMap((s) => s.entries.flatMap((e) => e.images));
  const from = (n: number) => shots.slice(n, n + 4);

  const published: ShelfEdition = {
    number: edition.number,
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
      edition: {
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
      id: edition.catchupId,
      name: edition.catchupName,
      kind: "people",
      meta: "Every month",
      state: "published",
      paused: false,
      youKeep: true,
      canRun: true,
      edition: published,
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
      edition: {
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
       here and is deleted; an Edition now comes out at the moment answers
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
      edition: {
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

    /* A batch on its first day. It opens straight into collecting -- there
       is no "no Edition yet" any more, because there is no moment a member can
       reach one: "when you start a catch-up, it should immediately start into
       questions." */
    {
      id: "batch-1978",
      name: "Batch of 1978",
      kind: "batch",
      meta: "Everyone from 1978 · every three months",
      state: "collecting",
      paused: false,
      youKeep: false,
      canRun: false,
      edition: {
        number: 1,
        questions: [],
        publishedAt: null,
        closesAt: null,
        nextOpensAt: null,
        wroteIn: [],
        youAnswered: false,
        read: false,
        photos: [],
      },
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
      edition: null,
      before: [{ ...published, number: 1, publishedAt: shift(base, -240), questions: q.slice(0, 5), read: true, photos: from(6) }],
      endedAt: shift(base, -120),
      members: people.slice(0, 5),
      picture: PICTURES[5],
    },
  ];
}

/** The paused variant of a Catch-up, for the home's state picker. A
 *  pause is a mark on whatever the Edition is doing, so this is the same
 *  Catch-up with one flag turned on and nothing else changed. */
export function paused(c: SketchCatchup): SketchCatchup {
  return { ...c, id: `${c.id}-paused`, paused: true };
}

/** The Catch-ups a member actually has on their list, in order. Two or
 *  three is the real number (I12); the room can show more. */
export function shelfOf(all: SketchCatchup[], howMany: number): SketchCatchup[] {
  return all.slice(0, howMany);
}

/** The home, in every state an Edition can be in, plus held. The room's state
 *  picker walks this list.
 *
 *  FIVE, not seven, and two went for his reasons on 2026-09-07.
 *
 *  "No Edition yet" is deleted: "I don't understand when the situation would
 *  occur because it's like when you start a catch-up, it should immediately
 *  start into questions." He is right -- a Catch-up that has just been made is
 *  collecting, and a batch whose turn has come opens straight into collecting
 *  too. There is no moment a member can reach a home with no Edition on it, so
 *  there is no state to draw.
 *
 *  "Out, with earlier ones" and "Published" are one: "Out with the early ones,
 *  published, and then the reader. All of them kind of mean the same thing to
 *  me. Like there's definite redundancy there." They differed only in whether
 *  the Catch-up had back numbers, which is not a state -- so the one Published
 *  home has them, and the sidebar is where they live. */
export function homeVariants(
  all: SketchCatchup[],
): Array<{ key: string; label: string; c: SketchCatchup }> {
  const by = (id: string) => all.find((c) => c.id.startsWith(id)) ?? all[0];
  const answering = all.find((c) => c.state === "answering") ?? all[0];
  return [
    { key: "collecting", label: "Collecting", c: by("sunday-four") },
    /* The same state, on a Catch-up that has never published anything -- so
       the sidebar has no back numbers to draw and shows the placeholder
       instead. It is a variant of its own because it is the state most members
       will be in on day one and there was no way to look at it: "i'd also like
       to see the placeholder sidebar for when there's no previous issues." */
    { key: "first", label: "First Edition", c: by("batch-1978") },
    { key: "answering", label: "Answering", c: answering },
    { key: "published", label: "Published", c: by("crimes") },
    /* A hold is a mark on a live Edition, so the illustrative case is an Edition
       mid-answer: the page says it is held and offers the one control that
       changes that, rather than redrawing the answering page with one word
       swapped ("why is paused the same as answering?"). */
    { key: "paused", label: "On hold", c: paused(answering) },
    { key: "ended", label: "Ended", c: by("test") },
  ];
}
