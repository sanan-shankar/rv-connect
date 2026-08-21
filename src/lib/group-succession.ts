/**
 * Who inherits a group when the member leaving it was its only admin.
 *
 * Pure and dependency-free so the rule is testable without a database, and so
 * the account purge and any future "leave this group" path decide it the same
 * way. Returns null when there is nothing to do: either somebody else already
 * holds the powers, or nobody is left to hold them.
 *
 * The longest-standing remaining member gets it — "any remaining member may act
 * as Keeper" (docs/spec/catchups.md §7), decided here rather than left to
 * whoever notices, because a group with no admin has no way to curate
 * questions, pause a Catch-up or publish a Round, and no way to say so.
 */
export type GroupMemberRow = { userId: string; role: string; joinedAt: Date };

export function chooseGroupSuccessor(
  members: GroupMemberRow[],
  leavingUserId: string
): string | null {
  const staying = members.filter((m) => m.userId !== leavingUserId);
  if (staying.length === 0) return null;
  if (staying.some((m) => m.role === "admin" || m.role === "keeper")) return null;
  // Sorted, not reduced, so two reads of the same table in a different row
  // order pick the same person: id breaks a joinedAt tie (two people added by
  // the same createMany share a timestamp to the millisecond).
  const [first] = [...staying].sort(
    (a, b) =>
      a.joinedAt.getTime() - b.joinedAt.getTime() || (a.userId < b.userId ? -1 : 1)
  );
  return first.userId;
}
