import { CATCHUP_PEOPLE } from "./catchup-caps.ts";

/**
 * Who inherits a group when the member leaving it was its only Keeper.
 *
 * Pure, with no database in it (the one import is the rule's own constant), so
 * it is testable without one, and so the account purge and any future "leave
 * this group" path decide it the same way. Returns null when there is nothing to do: either somebody else already
 * holds the powers, or nobody is left to hold them.
 *
 * The longest-standing remaining member gets it — "any remaining member may act
 * as Keeper" (docs/spec/catchups.md §5), decided here rather than left to
 * whoever notices, because a group with no Keeper has no way to curate
 * questions or publish an Edition, and no way to say so.
 *
 * `members` is ONLY the members who can act: both callers read them through
 * `CATCHUP_PEOPLE` (bug audit 3, T2a-09 and L10-01). A blocked account cannot
 * sign in, a leaving one has no session, a teacher is turned away from every
 * Catch-up page, and an unverified one meets the stage gate on every Keeper
 * control, so handing any of them the hat left the Catch-up as untended as no
 * Keeper at all. The same goes for a holder: one who can no longer act does
 * not count as "somebody else already holds the powers".
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

/**
 * Hand the group's powers on before the person holding them walks out.
 *
 * `chooseGroupSuccessor` decides WHO; this is the read and the write around
 * it, taking its database as an argument so it can run inside whichever
 * transaction is already removing the membership -- and so it can be tested
 * without one.
 *
 * Called wherever a `GroupMember` row is about to disappear: leaving a
 * Catch-up, or a Keeper removing somebody. Either could take the last member
 * holding "keeper" or "admin", and once `Catchup.createdById` has gone null
 * (its holder's account purged) there is then nobody who can curate a
 * question, publish an Edition or end it, and no way for anyone to claim it:
 * setCatchupKeeper itself needs a Keeper to call it (audit C-023). The
 * Catch-up keeps running on its clock, notifying a group that can no longer
 * steer it.
 *
 * Reads only the members who can act (`CATCHUP_PEOPLE`, see above), and
 * writes "keeper", the one role every path hands the hat on with.
 *
 * A no-op in the ordinary case -- somebody else still holds the powers, so
 * `chooseGroupSuccessor` returns null and nothing is written.
 */
export type SuccessionDb = {
  groupMember: {
    findMany(args: {
      where: { groupId: string; user: typeof CATCHUP_PEOPLE };
      select: { userId: true; role: true; joinedAt: true };
    }): Promise<GroupMemberRow[]>;
    updateMany(args: {
      where: { groupId: string; userId: string };
      data: { role: string };
    }): Promise<{ count: number }>;
  };
};

export async function promoteGroupSuccessor(
  db: SuccessionDb,
  groupId: string,
  leavingUserId: string
): Promise<string | null> {
  const members = await db.groupMember.findMany({
    where: { groupId, user: CATCHUP_PEOPLE },
    select: { userId: true, role: true, joinedAt: true },
  });
  const successor = chooseGroupSuccessor(members, leavingUserId);
  if (!successor) return null;
  // updateMany, not update, for the reason promoteOrphanedGroups gives: the
  // successor was chosen from a snapshot, and their own membership going in
  // the same beat must be a no-op rather than an aborted transaction.
  const done = await db.groupMember.updateMany({
    where: { groupId, userId: successor },
    data: { role: "keeper" },
  });
  return done.count > 0 ? successor : null;
}
