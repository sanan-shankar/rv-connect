/**
 * Shared Post query fragments.
 *
 * A draft letter is visible ONLY to its author (see feed/actions.ts's draft
 * actions). Every query that reads posts for anyone else must exclude drafts;
 * spread this fragment instead of hand-typing `status: "published"` so a new
 * query can't quietly forget the filter.
 */
export const PUBLISHED_ONLY = { status: "published" } as const;

/**
 * The batch-audience fragment: a post with no targets, or one aimed at this
 * viewer's batch.
 *
 * Three queries hand-built this OR and each hand-built the viewer's key with
 * its own template literal (`${batchType}-${batchYear}`), which for a member
 * with no batch produced the string "null-null" and then LIKE-scanned every
 * post for it. One fragment, one key, so the feed, the letters index and the
 * letters rail cannot drift apart -- the same reason PUBLISHED_ONLY exists,
 * and the same lesson as audit M31.
 *
 * `key` comes from `batchTargetKey`, and null (a member with no batch) drops
 * the `contains` arm rather than searching for the word "null": someone with
 * no batch is in nobody's target list, so only untargeted posts can reach
 * them.
 *
 * Note this is a PRE-filter, not the authority. `decidePostVisibility` decides
 * the single-post case, and its check is token-exact where SQL `contains` is a
 * substring match. They agree because `postSchema` now refuses to store a
 * token that is not exactly `TYPE-YYYY` (audit M43), so no stored key can be a
 * strict prefix of another.
 */
export function batchScopeWhere(key: string | null) {
  const untargeted = [{ targetBatches: null }, { targetBatches: "" }];
  return key
    ? { OR: [...untargeted, { targetBatches: { contains: key } }] }
    : { OR: untargeted };
}

/**
 * A post whose author is still in good standing.
 *
 * OWNER DECISION, 2026-08-21: a blocked member's existing posts, letters and
 * comments leave the feed. Blocking already ends their sessions and takes them
 * out of the directory and out of search, but everything they had written
 * stayed on display under their name -- and their name linked to a profile that
 * answers 404 for everybody else. The directory and the feed disagreed, and the
 * feed was the one saying the wrong thing (audit Low 78).
 *
 * Applied WITHOUT an admin exemption, unlike the cityScope and batch fragments.
 * An admin has /admin/content, which lists everything with "Everything by
 * <name>" and a takedown on each row; the main feed is for reading, and a
 * moderator scrolling past the posts they have just blocked somebody for is
 * noise rather than oversight. The single-post view keeps its admin exemption
 * (see decidePostVisibility), so a moderator following a link still lands on
 * the post itself.
 *
 * Nothing is deleted. Unblocking puts every one of these back.
 */
export const AUTHOR_IN_GOOD_STANDING = { author: { isBlocked: false } } as const;
