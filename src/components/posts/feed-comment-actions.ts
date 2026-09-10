/* The feed's (and a letter's) half of `CommentActions`.
 *
 * Adapters, not re-exports, and the reason is `createComment`: it takes a
 * FormData because it was written for a form, while the Catch-up side takes
 * plain arguments. Rather than change a live server action's signature and
 * every validator behind it, the shim is here -- it runs on the client and
 * calls the action, which is what this file already was implicitly.
 *
 * `remove` and `adminRemove` pass straight through because they are already
 * target-agnostic: one checks the author (or an admin), the other checks an
 * admin, and neither asks what the comment is attached to. That is why a
 * Catch-up answer's bundle points at the same two rather than owning copies.
 */

import {
  adminRemoveComment,
  createComment,
  deleteComment,
  loadComments,
  toggleCommentLike,
} from "@/app/(main)/feed/actions";
import type { CommentActions } from "./comments-section";

export const FEED_COMMENT_ACTIONS: CommentActions = {
  load: (targetId, opts) => loadComments(targetId, opts),
  create: (targetId, content, parentId) => {
    const formData = new FormData();
    formData.set("content", content);
    formData.set("postId", targetId);
    if (parentId) formData.set("parentId", parentId);
    return createComment(formData);
  },
  remove: deleteComment,
  toggleLike: toggleCommentLike,
  adminRemove: adminRemoveComment,
};
