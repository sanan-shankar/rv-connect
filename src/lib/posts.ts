/**
 * Shared Post query fragments.
 *
 * A draft letter is visible ONLY to its author (see feed/actions.ts's draft
 * actions). Every query that reads posts for anyone else must exclude drafts;
 * spread this fragment instead of hand-typing `status: "published"` so a new
 * query can't quietly forget the filter.
 */
export const PUBLISHED_ONLY = { status: "published" } as const;
