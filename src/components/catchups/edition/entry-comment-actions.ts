/* A Catch-up answer's half of `CommentActions` (build phase 9, spec 3.7).
 *
 * Three of the five are the Catch-up's own, because three of the five have to
 * ask a question only this feature can answer: is the Edition published, and
 * is this member in it. `loadEntryComments`, `createEntryComment` and
 * `toggleEntryCommentLike` all go through the same `loadCommentableEntry`
 * gate, which is the heart's gate exactly (architecture 8 puts comment and
 * heart in one cell).
 *
 * TWO ARE THE FEED'S, and that is deliberate rather than lazy. Deleting your
 * own comment checks the author; an admin removing one checks the admin.
 * Neither looks at what the comment hangs off, so a Catch-up copy of them
 * would be two more places for the soft-delete rule to drift out of step --
 * and that rule (blank the row, never delete it, or replies get promoted to
 * top level) is one the owner has already been bitten by once.
 */

import { adminRemoveComment, deleteComment } from "@/app/(main)/feed/actions";
import {
  createEntryComment,
  loadEntryComments,
  toggleEntryCommentLike,
} from "@/app/(main)/catchups/actions";
import type { CommentActions } from "@/components/posts/comments-section";

export const ENTRY_COMMENT_ACTIONS: CommentActions = {
  load: (targetId, opts) => loadEntryComments(targetId, opts),
  create: (targetId, content, parentId) => createEntryComment(targetId, content, parentId),
  remove: deleteComment,
  toggleLike: toggleEntryCommentLike,
  adminRemove: adminRemoveComment,
};
