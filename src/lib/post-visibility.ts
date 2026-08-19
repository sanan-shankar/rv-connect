import { prisma } from "@/lib/prisma";
import { canViewCityScope } from "@/lib/city-scope";
import {
  decidePostVisibility,
  type GuardedPost,
  type PostViewer,
  type PostVisibility,
} from "@/lib/post-visibility-rule";

export { POST_NOT_VISIBLE } from "@/lib/post-visibility-rule";
export type { PostViewer, PostVisibility, DenialReason } from "@/lib/post-visibility-rule";

/* ------------------------------------------------------------------ *
 *  May this viewer see this one post? (audit H3)
 *
 *  The READ path already got this right -- loadPosts and loadSavedPosts both
 *  compose group membership, city scope and batch targeting into their
 *  where-clause. The INTERACTION paths did not: createComment, toggleLike,
 *  toggleBookmark, votePoll, toggleCommentLike and loadComments each took a
 *  postId and acted on it, checking only that the row existed. So a member
 *  never added to a private Catch-up group could read its whole comment
 *  thread and post into it, given nothing but the id -- which the app itself
 *  hands out in notification deep links (/feed#<postId>), shared URLs, and
 *  the nextCursor values loadPosts returns.
 *
 *  Deliberately ONE function rather than a check repeated six times. The
 *  audit's R6 finding is about exactly that failure mode: security logic
 *  pasted into several files and then quietly diverging, which is how the
 *  write path came to enforce less than the read path in the first place.
 *
 *  The decision lives in post-visibility-rule.ts so it can be unit-tested
 *  without a database. This half only fetches what that one needs.
 * ------------------------------------------------------------------ */

const GUARD_SELECT = {
  id: true,
  authorId: true,
  groupId: true,
  cityScope: true,
  targetBatches: true,
  isHidden: true,
  status: true,
} as const;

/** Fetch only the facts the rule actually consults, and only when it will. */
async function gather(post: GuardedPost, viewer: PostViewer) {
  const isGroupMember = post.groupId
    ? !!(await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: post.groupId, userId: viewer.id } },
        select: { id: true },
      }))
    : false;

  const cityMatches =
    !post.groupId && post.cityScope
      ? await canViewCityScope(post.cityScope, viewer)
      : true;

  return { isGroupMember, cityMatches };
}

export async function canViewPost(
  postId: string,
  viewer: PostViewer
): Promise<PostVisibility> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: GUARD_SELECT,
  });
  if (!post) return { ok: false, reason: "not-found" };
  return decidePostVisibility(post, viewer, await gather(post, viewer));
}

/** The same check, entered from a comment id. `toggleCommentLike` only ever
 *  learns which post it is touching by way of the comment. */
export async function canViewPostOfComment(
  commentId: string,
  viewer: PostViewer
): Promise<PostVisibility> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { post: { select: GUARD_SELECT } },
  });
  if (!comment?.post) return { ok: false, reason: "not-found" };
  return decidePostVisibility(comment.post, viewer, await gather(comment.post, viewer));
}
