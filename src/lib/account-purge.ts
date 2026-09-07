import { prisma } from "./prisma";
import { forgetImages } from "./image-record";
import { delImage } from "./storage";
import { chooseGroupSuccessor } from "./group-succession";
import type { Prisma } from "@/generated/prisma/client";

/**
 * The one place that knows how to erase a member COMPLETELY (audit H9).
 *
 * `prisma.user.delete` cascades the rows, but rows are only half of a person's
 * data: their avatar, every image on their posts and Catch-up answers, and
 * every photograph they contributed to the Collection are bytes in R2 that no
 * cascade can reach. Before this existed, deletion left all of them publicly
 * fetchable at their pub-*.r2.dev URLs forever, with no row left pointing at
 * them, so nobody could ever find and remove them again. That is what made
 * GDPR Art. 17 unachievable for images.
 *
 * Used by both deletion routes: `adminDeleteUser` (immediate, an admin's
 * deliberate hand) and the retention sweep (a member's own request, after the
 * 60-day grace window has passed — audit M35).
 */

/**
 * How long a deletion request sits before the purge makes it final. The
 * owner's retention decision (2026-08-19): "deleted accounts purged after a
 * 60-day grace period". Signing in at any point inside the window cancels
 * the request — see authorize() in src/lib/auth.ts.
 */
export const DELETION_GRACE_DAYS = 60;

/** Anything that can run a query: the client, or a transaction's client. */
type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Leave every group this member ran with somebody at the wheel.
 *
 * `Group.creatorId` is SetNull now (2026-08-21), so the group itself survives
 * the delete — but the member's own `GroupMember` row cascades away with them,
 * and if that row was the only admin the group is left with nobody able to
 * curate questions, pause a Catch-up or publish a Round. Promoting the
 * longest-standing remaining member closes that, inside the purge transaction
 * so it can never half-happen.
 */
async function promoteOrphanedGroups(db: Db, userId: string): Promise<number> {
  const ownRoles = await db.groupMember.findMany({
    where: { userId, role: { in: ["admin", "keeper"] } },
    select: { groupId: true },
  });
  // Groups they created but are somehow no longer an admin of count too: the
  // creator column is about to go null and nothing else would notice.
  const created = await db.group.findMany({ where: { creatorId: userId }, select: { id: true } });
  const groupIds = [...new Set([...ownRoles.map((r) => r.groupId), ...created.map((g) => g.id)])];
  if (groupIds.length === 0) return 0;

  const members = await db.groupMember.findMany({
    where: { groupId: { in: groupIds } },
    select: { groupId: true, userId: true, role: true, joinedAt: true },
  });

  let promoted = 0;
  for (const groupId of groupIds) {
    const successor = chooseGroupSuccessor(
      members.filter((m) => m.groupId === groupId),
      userId
    );
    if (!successor) continue;
    // updateMany, not update: `update` throws P2025 when its where matches
    // nothing, and the successor was chosen from a snapshot read moments ago
    // under READ COMMITTED with no lock on that row. A genuinely concurrent
    // delete of the successor's own membership would then abort this whole
    // transaction and fail a purge that had nothing wrong with it. A no-op is
    // the right answer: if the person we picked has left too, there is nobody
    // to promote, and their own removal is somebody else's transaction.
    const done = await db.groupMember.updateMany({
      where: { groupId, userId: successor },
      data: { role: "admin" },
    });
    promoted += done.count;
  }
  return promoted;
}

/**
 * Every stored-image URL the member's rows point at, read INSIDE the purge
 * transaction so nothing uploaded between the reading and the delete can slip
 * past. That claim rests on the transaction's ISOLATION LEVEL, not on being
 * inside a transaction at all -- under READ COMMITTED each statement takes a
 * fresh snapshot and an upload committed mid-purge is invisible here and then
 * cascaded away, leaving bytes no row names and no sweep can find. The purge
 * runs at RepeatableRead for exactly this reason (audit C-076); see the
 * `$transaction` options below.
 *
 * `delImage` ignores URLs that are not ours (an external song artwork, a
 * legacy host), so collecting generously is safe.
 *
 * `coverPhoto` is deliberately absent: it is a Collection photo REUSED as a
 * profile cover, so its bytes belong to whoever contributed it — if that was
 * this member, it is already collected from their Photo rows.
 *
 * `Group.coverImage` used to be named here for the same class of reason. The
 * column never had a writer or a reader and left the schema on 2026-09-07
 * (refactor audit 2 / D6); a group has no image to collect.
 */
async function collectImageUrls(db: Db, userId: string): Promise<string[]> {
  const [user, posts, photos, entries, adminMessages] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { photoUrl: true } }),
    db.post.findMany({ where: { authorId: userId }, select: { images: true } }),
    db.photo.findMany({
      where: { uploaderId: userId },
      select: { thumbUrl: true, url: true },
    }),
    db.catchupEntry.findMany({ where: { authorId: userId }, select: { images: true } }),
    // EVERY message in the member's own admin threads, not just the ones they
    // wrote: AdminThread.member is Cascade, so the whole conversation dies
    // with them, taking the only rows that point at the screenshots attached
    // to it — including the ones an admin attached while replying (B-012).
    db.adminMessage.findMany({
      where: { thread: { memberId: userId } },
      select: { imageUrl: true },
    }),
  ]);

  const urls: string[] = [];
  if (user?.photoUrl) urls.push(user.photoUrl);
  for (const p of photos) {
    urls.push(p.thumbUrl, p.url);
  }
  for (const m of adminMessages) {
    if (m.imageUrl) urls.push(m.imageUrl);
  }
  // Post and Catch-up images are JSON-encoded string arrays; a malformed
  // column is skipped rather than failing the whole purge.
  for (const row of [...posts, ...entries]) {
    if (!row.images) continue;
    try {
      const arr = JSON.parse(row.images);
      if (Array.isArray(arr)) {
        for (const u of arr) if (typeof u === "string") urls.push(u);
      }
    } catch {
      // unparseable images column; nothing to collect from it
    }
  }
  return [...new Set(urls)];
}

/** Thrown inside the transaction to roll the whole purge back when the member
 *  has cancelled; caught immediately below, never seen by a caller. */
class PurgeCancelled extends Error {}

export type PurgeResult =
  | {
      ok: true;
      /** Objects actually gone from R2, not delete attempts. */
      imagesDeleted: number;
      /** Objects R2 refused. They stay in PendingImagePurge for the sweep. */
      imagesFailed: number;
      /** Groups left with a new admin because this member was the last one. */
      groupsRehomed: number;
    }
  | {
      ok: false;
      error: string;
      /** The member cancelled between the sweep's due-list read and this
       *  purge's turn, so nothing was deleted. Not a failure -- the right
       *  outcome, and the caller must not count it as an error. */
      cancelled?: true;
    };

/**
 * Take the member's comments out without breaking anybody else's thread
 * (audit M34).
 *
 * `Comment.authorId` used to be `onDelete: Cascade`, so a purge simply removed
 * every comment they had ever written -- and the self-referencing `parentId`
 * FK is SetNull, so every reply anybody else had written underneath became a
 * context-free top-level comment. That is precisely the corruption the soft
 * delete exists to prevent, and the schema's own comment on `deletedAt` spells
 * it out; the purge path re-introduced it wholesale.
 *
 * So: anything nothing hangs off is deleted outright, and a comment that is
 * still holding somebody else's reply is blanked and tombstoned first. The FK
 * is now SetNull, so the tombstone survives the account row as an authorless
 * anchor -- which is exactly what the reader already renders for a deleted
 * parent with living replies. No personal data survives either way: the words
 * are blanked and the authorship is detached.
 */
async function tombstoneComments(db: Db, userId: string): Promise<void> {
  const anchors = await db.comment.findMany({
    where: {
      authorId: userId,
      /* Replies by anyone else, deleted or not: a hidden or soft-deleted reply
         may still be restored, and it would have nothing to hang from.
         `authorId: null` is in the OR because `<> 'x'` is NULL, not true, for a
         NULL column -- so a bare `not` would quietly exclude an already-
         authorless reply. Depth is one level, so a reply can never itself be an
         anchor and this cannot arise today; it costs nothing to be right about
         it before that changes. */
      replies: { some: { OR: [{ authorId: null }, { authorId: { not: userId } }] } },
    },
    select: { id: true },
  });
  const anchorIds = anchors.map((c) => c.id);

  if (anchorIds.length > 0) {
    await db.comment.updateMany({
      where: { id: { in: anchorIds } },
      data: { deletedAt: new Date(), content: "" },
    });
  }
  /* The `notIn` is added only when there is something to exclude, rather than
     passed an empty array. How an ORM compiles `NOT IN ()` is exactly the kind
     of thing to not depend on here: if it came out as "match nothing", this
     delete would silently do nothing and the member's words would SURVIVE the
     purge with their name detached, which is a worse failure than the bug this
     function fixes and one nothing would report. */
  await db.comment.deleteMany({
    where: {
      authorId: userId,
      ...(anchorIds.length > 0 ? { id: { notIn: anchorIds } } : {}),
    },
  });
}

/**
 * Clear other members' profile covers that point at this member's photographs
 * (audit Low 106).
 *
 * `User.coverPhoto` is a Collection photo's URL reused as somebody's profile
 * banner -- so anyone may be wearing a photograph THIS member contributed. The
 * Photo rows cascade away with the account and their bytes go with them, but a
 * `coverPhoto` string is only text and nothing pointed at it: those profiles
 * were left carrying a banner that would never load again, with nothing to say
 * why. Cleared to null, which is exactly the state a profile with no cover has
 * always had.
 *
 * Runs inside the purge transaction and BEFORE the account row goes, because
 * the member's own Photo rows are what name the URLs to look for.
 */
async function clearCoversPointingAtThisMember(db: Db, userId: string): Promise<number> {
  const photos = await db.photo.findMany({
    where: { uploaderId: userId },
    select: { url: true, thumbUrl: true },
  });
  const urls = [...new Set(photos.flatMap((p) => [p.url, p.thumbUrl]).filter(Boolean))];
  if (urls.length === 0) return 0;

  const { count } = await db.user.updateMany({
    where: { coverPhoto: { in: urls } },
    data: { coverPhoto: null },
  });
  return count;
}

/**
 * Delete the account row (cascading the member's content) and then the R2
 * objects those rows pointed at. Order matters twice over:
 *
 *  - URLs are collected FIRST, because the cascade takes the pointing rows
 *    with it and afterwards nothing can enumerate the objects;
 *  - bytes are deleted only AFTER the row delete succeeds, because if the
 *    delete throws and rolls back, the member still exists and their images
 *    must keep rendering.
 *
 * The gap between those two is what `PendingImagePurge` closes: the collected
 * URLs are written as a worklist in the SAME transaction as the delete, so a
 * crash, a timeout or a bad minute at R2 leaves a durable record of exactly
 * which bytes are still out there instead of losing them forever. Whatever the
 * loop below cannot remove is left in the table for the nightly sweep.
 *
 * The count returned is objects actually gone, not attempts (B-013): the audit
 * entry the CALLER writes quotes it, and it used to be a lie.
 */
export async function purgeUserAccount(
  userId: string,
  /* Set by the nightly sweep, never by an admin's deliberate delete.
   *
   * The sweep reads its due list once and then purges the rows one at a time,
   * each in its own transaction, so minutes pass between "this account is due"
   * and "delete it". Signing in during the grace window IS the cancellation --
   * auth.ts clears deletionRequestedAt and says so on screen -- and with an
   * unconditional delete that member was erased anyway, irreversibly, after
   * the app had told them it was called off (bug-report-2 C-075).
   *
   * A re-read at the top of the transaction would not close it: this runs at
   * READ COMMITTED, so a sign-in committing mid-transaction is invisible to a
   * snapshot already taken. The condition therefore rides on the DELETE
   * itself, which locks the row and re-evaluates the predicate against the
   * updated version. Zero rows deleted means they came back, and the whole
   * transaction rolls back with them. */
  opts?: { onlyIfRequestedBefore?: Date }
): Promise<PurgeResult> {
  let urls: string[];
  let groupsRehomed: number;

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        const rehomed = await promoteOrphanedGroups(tx, userId);
        const collected = await collectImageUrls(tx, userId);
        if (collected.length > 0) {
          await tx.pendingImagePurge.createMany({
            data: collected.map((url) => ({ url, reason: "purge" })),
          });
        }
        // Report.reporterId is RESTRICT, not cascade: a member who has EVER
        // filed a report cannot be deleted until those rows are cleared, or
        // the delete throws and rolls back (audit H8). Reports filed AGAINST
        // them cascade. ONE transaction: if the user.delete fails, the report
        // clearing and the worklist roll back with it, so a failed purge can
        // never silently destroy the report history while leaving the account
        // alive (write-path review, Phase 8 — this matters doubly now that the
        // retention sweep runs this unattended).
        await tx.report.deleteMany({ where: { reporterId: userId } });
        await tombstoneComments(tx, userId);
        await clearCoversPointingAtThisMember(tx, userId);
        const removed = await tx.user.deleteMany({
          where: {
            id: userId,
            ...(opts?.onlyIfRequestedBefore
              ? { deletionRequestedAt: { lt: opts.onlyIfRequestedBefore } }
              : {}),
          },
        });
        if (removed.count === 0) throw new PurgeCancelled();
        return { urls: collected, rehomed };
      },
      // The default 5s is a page-render budget, not a cascade budget: this one
      // transaction deletes every row a long-standing member ever wrote.
      // maxWait matches the pool's own connectionTimeoutMillis (prisma.ts):
      // waiting longer than the pool will wait for a connection is dead
      // configuration, and waiting less would fail before the pool gives up.
      {
      timeout: 30_000,
      maxWait: 5_000,
      /* RepeatableRead, because the comment on `collectImageUrls` claims
         something READ COMMITTED does not give (audit C-076): that nothing
         uploaded between reading the urls and deleting the rows can slip past.
         Under READ COMMITTED every statement takes a fresh snapshot, so a post
         committed mid-transaction is invisible to the collect and then deleted
         by the cascade -- its bytes referenced by no row and reachable by no
         sweep, which is unrecoverable, because nothing can enumerate the
         bucket. Under RepeatableRead the whole transaction reads one snapshot
         and a conflicting concurrent write aborts it instead, which is a retry
         rather than a leak. */
      isolationLevel: "RepeatableRead",
    }
    );
    urls = outcome.urls;
    groupsRehomed = outcome.rehomed;
  } catch (err) {
    if (err instanceof PurgeCancelled) {
      // Everything above rolled back with the delete: the rehoming, the image
      // worklist, the cleared reports. The account is exactly as they left it.
      console.info(`[purge] ${userId} was not deleted: the request no longer stands`);
      return { ok: false, cancelled: true, error: "That account is no longer due for deletion." };
    }
    console.error("purgeUserAccount failed:", err);
    return { ok: false, error: "Could not delete the account." };
  }

  const drained = await drainPendingImagePurges(urls);
  return {
    ok: true,
    imagesDeleted: drained.deleted,
    imagesFailed: drained.failed,
    groupsRehomed,
  };
}

/**
 * Work through the pending-delete list: remove the object, then the row that
 * remembered it. A row that survives is a byte that survived.
 *
 * Called twice: once by the purge that queued the URLs (so the common case
 * finishes in the same request), and once a night by the retention sweep for
 * anything left behind by a crash or a bad minute at R2.
 */
export async function drainPendingImagePurges(
  onlyUrls?: string[],
  limit = 500
): Promise<{ deleted: number; failed: number }> {
  const rows = await prisma.pendingImagePurge.findMany({
    where: onlyUrls ? { url: { in: onlyUrls } } : {},
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, url: true },
  });

  let deleted = 0;
  let failed = 0;
  /* The `Image` rows for whatever actually goes. This is the second of the two
     places bytes are deleted (the other is `purgeImageUrls`), and it is the one
     that finishes the job for a post or an account, whose urls are queued
     inside a transaction rather than handed over directly. Collected and
     forgotten in one statement after the loop rather than one at a time. */
  const gonePermanently: string[] = [];
  for (const row of rows) {
    const gone = await delImage(row.url);
    if (gone) {
      gonePermanently.push(row.url);
      await prisma.pendingImagePurge.delete({ where: { id: row.id } }).catch(() => {
        // Row already taken by a concurrent drain; the object is gone either
        // way, which is the part that matters.
      });
      deleted += 1;
    } else {
      failed += 1;
      await /* updateMany, not update (audit C-118). The success branch beside this one
         already tolerates a concurrent drain having taken the row; this one did
         not, and Prisma's `update` throws P2025 on a missing row -- so the
         BOOKKEEPING for a failure could itself throw out of the sweep and stop
         every remaining purge behind it. `updateMany` no-ops on zero matches,
         which is the honest answer: somebody else already dealt with it. */
      prisma.pendingImagePurge.updateMany({
        where: { id: row.id },
        data: { attempts: { increment: 1 }, lastError: "delete refused by storage" },
      });
    }
  }
  await forgetImages(gonePermanently);
  return { deleted, failed };
}
