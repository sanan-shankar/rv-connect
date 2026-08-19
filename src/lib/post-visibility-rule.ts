/* ------------------------------------------------------------------ *
 *  The visibility rule itself: who may see a post, as a pure function.
 *
 *  Split out from post-visibility.ts, which does the database work, for one
 *  reason: this is the security decision, and a security decision that cannot
 *  be tested is a security decision nobody will notice breaking. The audit's
 *  H17 finding was that 97,500 lines carried 14 unit tests and none of them
 *  touched authorization. This file has no imports at all, so a plain .mjs
 *  test can import it and try every case, including the ones that would be
 *  laborious to set up against a real database.
 *
 *  It takes the two facts it cannot work out for itself -- group membership
 *  and city match -- as arguments. The caller fetches them.
 * ------------------------------------------------------------------ */

export type PostViewer = {
  id: string;
  role?: string | null;
  batchType?: string | null;
  batchYear?: number | null;
};

export type DenialReason =
  | "not-found"
  | "hidden"
  | "draft"
  | "not-a-member"
  | "other-city"
  | "other-batch";

export type GuardedPost = {
  id: string;
  authorId: string;
  groupId: string | null;
  cityScope: string | null;
  targetBatches: string | null;
  isHidden: boolean;
  status: string | null;
};

export type PostVisibility =
  | { ok: true; post: GuardedPost }
  | { ok: false; reason: DenialReason };

/** The two facts the rule needs but cannot derive. */
export type VisibilityFacts = {
  /** Is the viewer a member of the post's group? Only consulted when the post
   *  has a groupId, so callers may skip the query otherwise. */
  isGroupMember: boolean;
  /** Does the viewer have a UserPlace matching the post's cityScope? Only
   *  consulted when the post has a cityScope. */
  cityMatches: boolean;
};

/* ONE message for every refusal, including "no such post". Distinguishing them
   would turn any caller into an oracle: "not a member of that group" confirms
   both that the group exists and that this id belongs to it, which is exactly
   the fact being protected. The specific reason stays server-side. */
export const POST_NOT_VISIBLE = "That post is not available.";

export function decidePostVisibility(
  post: GuardedPost,
  viewer: PostViewer,
  facts: VisibilityFacts
): PostVisibility {
  /* Admins see everything -- the same exemption loadPosts makes by skipping
     the cityScope fragment entirely for an admin viewer. */
  if (viewer.role === "admin") return { ok: true, post };

  /* Your own post is always yours, including a draft you are still editing.
     Checked BEFORE isHidden on purpose: an author whose post an admin has
     hidden can still reach it to delete or edit it, which is the only way
     they could respond to the moderation at all. */
  if (post.authorId === viewer.id) return { ok: true, post };

  if (post.isHidden) return { ok: false, reason: "hidden" };

  /* Everyone else is refused a draft outright: loadPosts applies
     PUBLISHED_ONLY with no exception, so an unpublished letter has never been
     visible in any feed, and it must not become reachable by id either. */
  if (post.status !== "published") return { ok: false, reason: "draft" };

  /* A group is the hidden container under every people-started Catch-up.
     Membership is the whole of its privacy. Group posts never carry a
     cityScope or targetBatches -- createPost writes both as null whenever
     groupId is set -- so membership settles it. */
  if (post.groupId) {
    return facts.isGroupMember
      ? { ok: true, post }
      : { ok: false, reason: "not-a-member" };
  }

  if (post.cityScope && !facts.cityMatches) {
    return { ok: false, reason: "other-city" };
  }

  /* Batch targeting, mirroring loadPosts' top-level OR: no targets at all
     means everyone, otherwise the viewer's own "ISC-2011"-shaped key must
     appear in the stored list. */
  if (post.targetBatches) {
    const key = `${viewer.batchType}-${viewer.batchYear}`;
    if (!post.targetBatches.includes(key)) {
      return { ok: false, reason: "other-batch" };
    }
  }

  return { ok: true, post };
}
