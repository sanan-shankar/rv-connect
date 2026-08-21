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
