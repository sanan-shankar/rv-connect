/* ------------------------------------------------------------------ *
 *  WHAT THE REVIEW ROOM LOOKS AT.
 *
 *  Two piles, one machine. The owner asked for the second one on
 *  2026-08-30, and the arithmetic that prompted it was 21 photographs in
 *  the Collection with 3 years between them:
 *
 *    WAITING   photographs nobody has decided about yet. Oldest first,
 *              because a queue that serves the newest first can leave a
 *              contribution sitting for ever behind fresher ones.
 *
 *    UNDATED   photographs already in the Collection with no date at
 *              all. Nothing is being decided here -- they are in, and
 *              they stay in -- so this pile has no Approve and no
 *              Decline. It is the rescue for every row that came in
 *              before the file's own date was ever read.
 *
 *  THE TWO ARE NOT THE SAME JOB, and the room is careful to say so. The
 *  owner drew the line himself when he was asked whether an undated
 *  photograph should be blocked from approval: "approval is not just for
 *  year, it's also for suitability of the photo and everything else."
 *  Approving is a judgement about whether a photograph belongs here.
 *  Dating is clerical work about a photograph that already does. Putting
 *  them in one room is convenience; letting either hold the other up
 *  would be a mistake.
 * ------------------------------------------------------------------ */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { bucketsOf } from "@/lib/collection";

/** How many the room loads in one go.
 *
 *  Not a page in the paging sense: there is no "next" button, because the
 *  room is emptied by acting on things rather than by scrolling past them.
 *  Each decision removes a photograph from the pile, and the count on the
 *  page is the honest number remaining, whether or not all of them were
 *  loaded. 60 is roughly a sitting; the room says so when there are more. */
export const REVIEW_BATCH = 60;

export type ReviewMode = "waiting" | "undated";

/** One photograph, with everything the room needs and nothing it does not.
 *  The full-size `url` rather than the thumbnail: the entire complaint that
 *  started this was that a 64px thumbnail is not something you can judge a
 *  photograph by. */
export type ReviewPhoto = {
  id: string;
  url: string;
  width: number;
  height: number;
  caption: string;
  /** The buckets, already split and mapped through the legacy vocabulary. */
  subject: string[];
  photoYear: number | null;
  photoMonth: number | null;
  datePrecision: string | null;
  era: string;
  /** What the FILE said, if it said anything. Never an answer -- see the
   *  columns' note in schema.prisma. */
  exifYear: number | null;
  exifMonth: number | null;
  uploaderId: string;
  uploaderName: string;
  createdAt: string;
  /** "valley" or "class". A class photograph never queues, so this is only
   *  ever "class" in the undated pile -- where the room says so, because the
   *  audience changes how carefully you read a caption. */
  scope: string;
  classYears: string | null;
};

/* The select is INLINE in the query below rather than hoisted to a constant.
   A hoisted one has to be `as const` for Prisma to infer the nested `uploader`
   relation from it, and `as const` then makes it readonly, which Prisma's own
   generated input types refuse. Inline, the client infers the row exactly and
   `shape` is checked against the real thing. */

type Row = Awaited<ReturnType<typeof rows>>[number];

function shape(row: Row): ReviewPhoto {
  const { uploader, ...rest } = row;
  return {
    ...rest,
    // The column is nullable; the room only ever wants a string in a box.
    caption: row.caption ?? "",
    subject: bucketsOf(row.subject),
    /* Serialised here rather than handed to the client as a Date: this
       crosses the server/client boundary and a string is the one thing that
       survives it unambiguously. */
    createdAt: row.createdAt.toISOString(),
    // Matches the content list's own handling of a purged account (audit M34).
    uploaderName: uploader?.name ?? "Someone who has left",
  };
}

/** A photograph with no date of any kind.
 *
 *  NOT simply "no photoYear": a contributor who said "the 1970s" HAS dated it,
 *  at the precision they had, and putting them in front of an admin to be
 *  asked again would be asking a person to re-answer an answered question. So
 *  the decade has to be empty too.
 *
 *  `era` is NOT NULL in the schema with a default of "unknown", so that one
 *  value is the whole of "no decade" -- an `OR` against null here was checking
 *  for a state the column cannot hold. */
const UNDATED = {
  photoYear: null,
  era: "unknown",
} satisfies Prisma.PhotoWhereInput;

/**
 * One pile, loaded.
 *
 * `waiting` is the review queue: everything not yet decided, oldest first.
 *
 * `undated` is the rescue pile, and its ordering is the one piece of
 * cleverness in this file. Photographs whose FILE offered a date come first,
 * because each of those is one press -- so a sitting spent here front-loads
 * every win it can and only then reaches the ones that need a person to
 * actually remember something. Within each group, newest first: a recent
 * photograph is one somebody still has the context for.
 */
function rows(mode: ReviewMode) {
  return prisma.photo.findMany({
    where:
      mode === "waiting"
        ? { approved: false, isHidden: false }
        : { approved: true, isHidden: false, ...UNDATED },
    orderBy:
      mode === "waiting"
        ? [{ createdAt: "asc" }, { id: "asc" }]
        : [{ exifYear: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }],
    take: REVIEW_BATCH,
    select: {
      id: true,
      url: true,
      width: true,
      height: true,
      caption: true,
      subject: true,
      photoYear: true,
      photoMonth: true,
      datePrecision: true,
      era: true,
      exifYear: true,
      exifMonth: true,
      uploaderId: true,
      createdAt: true,
      scope: true,
      classYears: true,
      uploader: { select: { name: true } },
    },
  });
}

export async function loadReview(mode: ReviewMode): Promise<ReviewPhoto[]> {
  return (await rows(mode)).map(shape);
}

/** How long each pile is, for the two counts the room shows. Separate from
 *  `loadReview` because the count is the honest total and the load is capped
 *  at REVIEW_BATCH -- conflating them is how a list quietly claims to be
 *  everything. */
export async function reviewCounts(): Promise<{ waiting: number; undated: number }> {
  const [waiting, undated] = await Promise.all([
    prisma.photo.count({ where: { approved: false, isHidden: false } }),
    prisma.photo.count({ where: { approved: true, isHidden: false, ...UNDATED } }),
  ]);
  return { waiting, undated };
}
