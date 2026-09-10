/* ------------------------------------------------------------------ *
 *  A comment thread, once, for both the things that have one.
 *
 *  Build phase 9 (spec.md 3.7) gave Catch-up answers comments. His words,
 *  review-2026-09-07 N1: "I feel like the comment section can be done the
 *  same way that we do it in feed. I don't know why we're trying to do it
 *  in a different way ... I think we can just copy that comment section."
 *
 *  "Copy" is the one thing not done here. `Comment` is ONE table with two
 *  nullable targets and a CHECK that exactly one is set (the schema says
 *  why), so the paging, the stub rule, the double-submit guard and the
 *  serialiser are one implementation with a `where` clause passed in.
 *
 *  WHAT IS *NOT* IN HERE, deliberately: the gate and the notification.
 *  Every function below assumes the caller has already decided this viewer
 *  may see this thread -- a feed post goes through `canViewPost`, a
 *  Catch-up answer through `loadMemberEdition` plus the published check --
 *  and none of them writes a bell. Those are the only two things that
 *  genuinely differ between the two owners, and keeping them at the call
 *  site is what stops this file growing a `kind` parameter and deciding
 *  access for a feature it cannot see.
 * ------------------------------------------------------------------ */

import "server-only";

import { prisma } from "@/lib/prisma";
import { VISIBLE_COMMENT } from "@/lib/posts";
import { AUTHOR_CARD_SELECT } from "@/lib/people-select";
import { decodeKeyset, encodeKeyset, keysetWhere } from "@/lib/keyset";
import { DOUBLE_SUBMIT_MS } from "@/lib/double-submit";
import { isUniqueViolation } from "@/lib/prisma-errors";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Which thread. Exactly one key, which is the TypeScript half of the
 * `Comment_one_target` CHECK: the database refuses a row with both or
 * neither, and this union means a caller cannot assemble one by accident.
 */
export type CommentTarget = { postId: string } | { entryId: string };

/** The target as a `where` fragment, and as the columns a create writes. */
function targetWhere(target: CommentTarget) {
  return "postId" in target
    ? { postId: target.postId, entryId: null }
    : { entryId: target.entryId, postId: null };
}

/** True when this row belongs to the thread being asked about. */
function sameTarget(
  row: { postId: string | null; entryId: string | null },
  target: CommentTarget
): boolean {
  return "postId" in target ? row.postId === target.postId : row.entryId === target.entryId;
}

/**
 * The wire shape of one comment, and every default is deliberate: a stub
 * means `deleted: true`, a freshly written comment means `likeCount: 0`,
 * and each of those is a fact its own call site knows and this function
 * does not. (Moved here from feed/actions.ts unchanged in build phase 9.)
 */
export type CommentRow = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  author: Prisma.UserGetPayload<{ select: typeof AUTHOR_CARD_SELECT }> | null;
  likeCount: number;
  liked: boolean;
  deleted: boolean;
};

export type CommentViewer = { userId: string; isAdmin: boolean };

export function serializeComment(c: CommentRow, viewer: CommentViewer) {
  return {
    id: c.id,
    content: c.content,
    parentId: c.parentId,
    createdAt: c.createdAt.toISOString(),
    author: c.author,
    likeCount: c.likeCount,
    liked: c.liked,
    deleted: c.deleted,
    /* Was hardcoded `true` in createComment (the writer is the viewer) and
       `false` in the stub (whose author is null). Both fall out of the one
       comparison, which is why the three could be folded at all. */
    isOwn: c.author?.id === viewer.userId,
    viewerIsAdmin: viewer.isAdmin,
  };
}

export type SerializedComment = ReturnType<typeof serializeComment>;

export type CommentPage = {
  comments: SerializedComment[];
  nextCursor: string | null;
  hasMore: boolean;
};

/** What a caller with no access gets: the same answer a thread that does
 *  not exist gives, so neither can be used to discover which ids are real. */
export const EMPTY_COMMENT_PAGE: CommentPage = {
  comments: [],
  nextCursor: null,
  hasMore: false,
};

/**
 * One page of a thread. Pagination walks TOP-LEVEL comments only (keyset on
 * (createdAt, id), oldest first); each page carries every visible reply of
 * its parents, so a parent can never be sliced away from its thread.
 *
 * A deleted or admin-hidden parent whose replies survive is still returned,
 * as a content-free stub (`deleted: true`, no author) — the client renders
 * "[deleted]" and the replies keep their place. Without the stub the replies
 * silently vanished from the UI while the count still included them.
 */
export async function readCommentPage(
  target: CommentTarget,
  viewer: CommentViewer,
  opts?: { cursor?: string | null; take?: number }
): Promise<CommentPage> {
  const take = Math.min(Math.max(opts?.take ?? 10, 1), 50);

  // A top-level row earns a slot on the page if it is itself visible, or if
  // it must stand in as the anchor for visible replies.
  const after = decodeKeyset(opts?.cursor);
  const rootWhere = {
    ...targetWhere(target),
    parentId: null,
    OR: [VISIBLE_COMMENT, { replies: { some: VISIBLE_COMMENT } }],
  };
  /* Value keyset, oldest-first. A root comment can leave this set between
     two pages -- soft-deleted with no visible replies left, or hidden by a
     moderator -- and naming it as a Prisma cursor then returned nothing at
     all (see keyset.ts). */
  const roots = await prisma.comment.findMany({
    where: after ? { AND: [rootWhere, keysetWhere(after, "asc")] } : rootWhere,
    select: { id: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: take + 1,
  });

  const hasMore = roots.length > take;
  const pageRoots = hasMore ? roots.slice(0, take) : roots;
  const nextCursor = hasMore ? encodeKeyset(pageRoots[pageRoots.length - 1]) : null;
  const rootIds = pageRoots.map((r) => r.id);

  const rows = await prisma.comment.findMany({
    where: {
      OR: [
        { id: { in: rootIds }, ...VISIBLE_COMMENT },
        { parentId: { in: rootIds }, ...VISIBLE_COMMENT },
      ],
    },
    include: {
      author: { select: { ...AUTHOR_CARD_SELECT } },
      _count: { select: { commentLikes: true } },
      commentLikes: { where: { userId: viewer.userId }, select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const visibleIds = new Set(rows.map((r) => r.id));
  const stubs = pageRoots
    .filter((r) => !visibleIds.has(r.id))
    .map((r) =>
      serializeComment(
        {
          id: r.id,
          content: "",
          parentId: null,
          createdAt: r.createdAt,
          author: null,
          likeCount: 0,
          liked: false,
          deleted: true,
        },
        viewer
      )
    );

  return {
    comments: [
      ...rows.map((c) =>
        serializeComment(
          {
            ...c,
            likeCount: c._count.commentLikes,
            liked: c.commentLikes.length > 0,
            deleted: false,
          },
          viewer
        )
      ),
      ...stubs,
    ],
    nextCursor,
    hasMore,
  };
}

export type WriteCommentResult =
  | { error: string }
  | {
      /** The row, whether this call made it or found its twin. */
      comment: CommentRow & { authorId: string | null };
      /** Who the writer was ANSWERING, before the reparenting below. */
      repliedToId: string | null;
      /** True when this call was the second half of a double submission, so
       *  the caller knows not to send the notification twice. */
      twin: boolean;
    };

/**
 * Write one comment, or recognise that it has already been written.
 *
 * Two rules live here rather than at either call site, because getting
 * either wrong is a live bug that has already happened once:
 *
 * 1. THREADS ARE ONE LEVEL DEEP, and a reply to a reply is stored under the
 *    root — but the person being answered is the one whose name the composer
 *    printed. Notifying the root's author instead told somebody else
 *    entirely while the addressee heard nothing (audit C-016), which is why
 *    `repliedToId` comes back separately from `parentId`.
 * 2. THE PARENT MUST BELONG TO THIS THREAD (audit M28). The target and the
 *    parent arrive as two independent fields, so without this a crafted call
 *    files a reply under a comment on a DIFFERENT post — it renders in a
 *    thread it was never written for and both threads' counts move. The
 *    caller vets the target; this vets the pair.
 */
export async function writeComment(input: {
  target: CommentTarget;
  authorId: string;
  content: string;
  parentId?: string | null;
}): Promise<WriteCommentResult> {
  const { target, authorId, content } = input;

  let parentId = input.parentId || null;
  const repliedToId = parentId;
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: {
        parentId: true,
        postId: true,
        entryId: true,
        deletedAt: true,
        isHidden: true,
      },
    });
    // The UI offers no reply button on a "[deleted]" stub, so this only fires
    // when the target was deleted between render and submit.
    if (!parent || parent.deletedAt || parent.isHidden) {
      return { error: "That comment is gone" };
    }
    if (!sameTarget(parent, target)) {
      return { error: "That comment is not on this one" };
    }
    if (parent.parentId) {
      parentId = parent.parentId; // reply to the root comment instead
    }
  }

  /* The server half of the double-submit guard (audit M35).
   *
   * Comment is free text, so there is no unique index that could dedupe it,
   * and the client's in-flight ref cannot cover two tabs, a retried request
   * or a hand-made call. The same person writing the same words under the
   * same comment within seconds is a duplicate submission, not a person
   * saying it twice, so the first row is returned as if the second call had
   * made it -- the caller merges it into the thread and nothing on screen
   * betrays that anything happened. The window is deliberately tight: a
   * deliberate repeat a minute later still lands. */
  const existing = await prisma.comment.findFirst({
    where: {
      ...targetWhere(target),
      authorId,
      parentId,
      content,
      deletedAt: null,
      createdAt: { gte: new Date(Date.now() - DOUBLE_SUBMIT_MS) },
    },
    include: { author: { select: AUTHOR_CARD_SELECT } },
  });
  if (existing) {
    return {
      comment: { ...existing, likeCount: 0, liked: false, deleted: false },
      repliedToId,
      twin: true,
    };
  }

  const created = await prisma.comment.create({
    data: { ...targetWhere(target), content, authorId, parentId },
    include: { author: { select: AUTHOR_CARD_SELECT } },
  });
  return {
    comment: { ...created, likeCount: 0, liked: false, deleted: false },
    repliedToId,
    twin: false,
  };
}

/**
 * The heart on one comment, toggled. Delete-first, then create and let the
 * unique settle a tie: a findUnique followed by a create meant two taps in
 * the same instant both read "not liked" and both inserted, and the loser
 * threw a raw P2002 out of the action for a gesture that had in fact worked.
 *
 * `created` is false when a concurrent tap got there first — the like stands,
 * and the caller uses it to decide whether a notification is owed.
 */
export async function toggleCommentLikeRow(
  userId: string,
  commentId: string
): Promise<{ liked: boolean; created: boolean }> {
  const removed = await prisma.commentLike.deleteMany({ where: { userId, commentId } });
  if (removed.count > 0) return { liked: false, created: false };

  try {
    await prisma.commentLike.create({ data: { userId, commentId } });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    return { liked: true, created: false };
  }
  return { liked: true, created: true };
}
