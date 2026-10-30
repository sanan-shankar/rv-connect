import { prisma } from "./prisma";
import { pickCatchupPicture } from "./catchup-picture-pick";
import { forgetImages } from "./image-record";
import { delImage } from "./storage";
import { chooseGroupSuccessor, lockGroup } from "./group-succession";
import { CATCHUP_PEOPLE } from "./catchup-caps";
import { photoStoredUrls } from "./collection-photo";
import { adminThreadLink, ownProfileLink, postNotificationLink } from "./notification-links";
import { noteReportsOnErasedMember } from "./admin-threads-server";
import { reportSwallowed } from "./report-error";
import { isSerializationFailure } from "./prisma-errors";
import { PURGE_ATTEMPTS, drainQueue, retryWriteConflicts } from "./purge-rule";
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
 * Every group whose Keeper's hat this member wears: the ones where their own
 * row says "keeper" or "admin", and the ones they created, whose creator
 * column is about to go null (a purge) or move (a merge) with nothing else
 * noticing. Sorted, so a caller that locks each group takes them in one order.
 * Asked by the purge's succession below and by an admin's merge
 * (`adminMergeUsers`), so the two cannot disagree about which groups need a
 * Keeper after this member is gone.
 */
export async function groupsKeptBy(db: Db, userId: string): Promise<string[]> {
  const ownRoles = await db.groupMember.findMany({
    where: { userId, role: { in: ["admin", "keeper"] } },
    select: { groupId: true },
  });
  const created = await db.group.findMany({ where: { creatorId: userId }, select: { id: true } });
  return [...new Set([...ownRoles.map((r) => r.groupId), ...created.map((g) => g.id)])].sort();
}

/**
 * Leave every group this member ran with somebody at the wheel.
 *
 * `Group.creatorId` is SetNull now (2026-08-21), so the group itself survives
 * the delete — but the member's own `GroupMember` row cascades away with them,
 * and if that row was the only Keeper the group is left with nobody able to
 * curate questions or publish an Edition. Promoting the longest-standing
 * remaining member closes that, inside the purge transaction so it can never
 * half-happen.
 *
 * The same rule as leaving (bug audit 3, T2a-09 and T7a-07): only members who
 * can act are read, through `CATCHUP_PEOPLE`, and the hat is written as
 * "keeper". This path wrote "admin", which `setCatchupKeeper`'s revoke did not
 * match, so a successor made here could never be relieved of it.
 *
 * Every group the member is leaving is held first (`lockGroup`), in one order,
 * before anybody is chosen: the lock every other change to who is in a
 * Catch-up or who wears its hat already takes (leaving, removal, adding,
 * joining, a merge, taking a hat back), and the purge was the one departure
 * that did not (bug audit 3, Phase A review 2, after L1-03). Without it, a
 * Keeper leaving one of this member's Catch-ups in the instant the nightly
 * purge ran read the member still wearing the hat, the purge read the Keeper
 * still wearing it, neither promoted anybody, and the Catch-up was left with
 * nobody able to tend it. Held, one waits for the other: a leaver who comes
 * second reads the member already gone, and a purge that comes second meets a
 * group changed after its snapshot, which at REPEATABLE READ is a write
 * conflict, so its retry reads the leaver's change. Every group the member is
 * in, not only the ones they keep, because a Keeper leaving may be naming this
 * member as successor, and an admin's delete (the member not "leaving", so
 * still a candidate) must not take that hat away with them.
 */
async function promoteOrphanedGroups(db: Prisma.TransactionClient, userId: string): Promise<number> {
  const groupIds = await groupsKeptBy(db, userId);
  const joined = await db.groupMember.findMany({ where: { userId }, select: { groupId: true } });
  const leaving = [...new Set([...groupIds, ...joined.map((m) => m.groupId)])].sort();
  for (const groupId of leaving) await lockGroup(db, groupId);
  if (groupIds.length === 0) return 0;

  const members = await db.groupMember.findMany({
    where: { groupId: { in: groupIds }, user: CATCHUP_PEOPLE },
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
    // nothing. The group is held, so every path that takes its lock waits for
    // this one, but not every writer of a membership row does (moving a member
    // between batch Catch-ups, batch-catchups.ts), and a successor whose row
    // went in the same beat must be a no-op here rather than a failed purge:
    // if the person we
    // picked has gone too, there is nobody to promote, and their own removal
    // is somebody else's transaction.
    const done = await db.groupMember.updateMany({
      where: { groupId, userId: successor },
      data: { role: "keeper" },
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
  const [user, posts, photos, entries, catchupPictures, adminMessages] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { photoUrl: true } }),
    db.post.findMany({ where: { authorId: userId }, select: { images: true } }),
    db.photo.findMany({
      where: { uploaderId: userId },
      select: { thumbUrl: true, url: true, screenUrl: true },
    }),
    // `audioUrl`: a recorded answer (phase 12). Bytes in the same bucket that
    // no cascade reaches, collected here the way `pictureSrc` is below.
    db.catchupEntry.findMany({ where: { authorId: userId }, select: { images: true, audioUrl: true } }),
    // A Catch-up's own picture, when this member uploaded it. Not keyed by a
    // column -- ownership is the `uploads/<their id>/` prefix the server wrote
    // into the key, which no request can forge, and which a pool path can
    // never match. `restoreCatchupPicturesUploadedBy` puts those rows back on
    // the pool in the same transaction, so the bytes go and nothing is left
    // pointing at them.
    db.catchup.findMany({
      where: { pictureSrc: { contains: `/uploads/${userId}/` } },
      select: { pictureSrc: true },
    }),
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
  for (const p of photos) urls.push(...photoStoredUrls(p));
  for (const m of adminMessages) {
    if (m.imageUrl) urls.push(m.imageUrl);
  }
  for (const c of catchupPictures) urls.push(c.pictureSrc);
  for (const e of entries) if (e.audioUrl) urls.push(e.audioUrl);
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

/**
 * Take down the bells in OTHER members' lists that lead to something of this
 * member's (bug audit 3, T7a-04 and C8-09; the owner's Q21).
 *
 * The member's own bell cascades with them; nobody else's does. A "replied to
 * your comment" aimed at their letter, a "mentioned you" in their post, a
 * "tagged you in a photo" on their photograph, a reply under their Catch-up
 * answer, the admins' "<name> wrote: ..." aimed at their thread and "asked to
 * be verified" aimed at their person page: once the purge has run, each opens
 * a page that is gone, and keeps a line of their words, until the 30-day
 * sweep. `clearPostNotifications` already does this for a post deleted on its
 * own (C-054); the purge removes posts by cascade, so no app code ran for
 * them.
 *
 * Matched on the exact link, as `clearPostNotifications` matches, because the
 * link is the thing that stops working; each shape is the one its writer
 * builds, and purge-rule.test.mjs holds the writers to it. Bells that only
 * NAME the member, aimed at someone else's post ("X liked your letter"), are
 * left to the sweep: no column records who rang a bell, and a name is not
 * unique. Read inside the purge transaction, before the rows that name the
 * targets are gone.
 */
async function clearBellsPointingAtThisMember(db: Db, userId: string): Promise<void> {
  const [posts, threads, photos, entries] = await Promise.all([
    db.post.findMany({ where: { authorId: userId }, select: { id: true, kind: true } }),
    db.adminThread.findMany({ where: { memberId: userId }, select: { id: true } }),
    db.photo.findMany({ where: { uploaderId: userId }, select: { id: true } }),
    db.catchupEntry.findMany({ where: { authorId: userId }, select: { id: true, editionId: true } }),
  ]);
  const links = [
    `/admin/people/${userId}`,
    ownProfileLink(userId),
    ...posts.map((post) => postNotificationLink(post)),
    ...threads.flatMap((t) => [adminThreadLink(t.id), `/messages/${t.id}`]),
    ...photos.map((p) => `/collection/${p.id}`),
    ...entries.map((e) => `/catchups/edition/${e.editionId}#entry-${e.id}`),
  ];
  await db.notification.deleteMany({ where: { link: { in: links } } });
}

/**
 * Take the member's unanswered Catch-up questions with them (bug audit 3,
 * C8-08; the owner's Q21: what nobody has read yet goes with the person, and
 * what was sent out stays).
 *
 * `CatchupPrompt.author` is SetNull so that a question thirty people answered
 * outlives its asker, and that reason covers a question somebody ANSWERED. One
 * nobody did, never accepted, or in a round that never opened, or passed over
 * by everyone, protects nobody's words, and it survived word for word as from
 * "an asker who left", which the privacy page never listed.
 *
 * Answered means an answer from someone else: the member's own answers go
 * with them, so a question only they answered is left with none. Never a
 * question with ANY other member's row under it, empty or not, because
 * deleting a question deletes its answers (`CatchupEntry.prompt` is Cascade);
 * an answer landing while this runs fails the purge's RepeatableRead
 * transaction rather than being deleted, and the sweep tries again. Runs
 * after `collectImageUrls`, which has the bytes of the member's own answers.
 */
async function deleteUnansweredPrompts(db: Db, userId: string): Promise<void> {
  await db.catchupPrompt.deleteMany({
    where: { authorId: userId, entries: { none: { authorId: { not: userId } } } },
  });
}

/** Thrown inside the transaction to roll the whole purge back when the member
 *  has cancelled; caught immediately below, never seen by a caller. */
class PurgeCancelled extends Error {}

export type PurgeResult =
  | {
      ok: true;
      /** Every stored-image url the account's rows named, written to
       *  PendingImagePurge in the same transaction as the delete. All of them
       *  are still to remove when this returns: the caller writes its audit
       *  line first, then drains them (`drainPendingImagePurges`). */
      queued: string[];
      /** Groups left with a new Keeper because this member was the last one. */
      groupsRehomed: number;
    }
  | {
      ok: false;
      /** Said to the admin who pressed delete, as it stands. */
      error: string;
      /** The member cancelled between the sweep's due-list read and this
       *  purge's turn, so nothing was deleted. Not a failure -- the right
       *  outcome, and the caller must not count it as an error. */
      cancelled?: true;
      /** Every attempt met another write to the member's rows, so nothing was
       *  deleted this time. A race that settles itself, not a fault: the sweep
       *  takes the account again tomorrow and an admin can press again. */
      deferred?: true;
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
/**
 * Put back the pool photograph on any Catch-up wearing a picture THIS member
 * uploaded.
 *
 * The same class of problem as `clearCoversPointingAtThisMember` above, and
 * the same shape of fix, but it cannot end in a null: `Catchup.pictureSrc` is
 * NOT NULL by design, so that there is never a Catch-up without a picture and
 * never a no-picture layout to draw (schema, spec 3.4). So the row goes back
 * to the pool, picked the way a new Catch-up is: the photograph its people see
 * least on their other Catch-ups.
 *
 * Which pictures are this member's is not a column: it is the R2 key the
 * server wrote at upload time, `uploads/<their id>/...`, which no request can
 * forge. A pool path can never match, because it has no `/uploads/` in it.
 *
 * Runs inside the purge transaction and BEFORE the account row goes. The bytes
 * themselves are collected by `collectImageUrls` and deleted after the row
 * delete succeeds, like every other object this member uploaded.
 */
async function restoreCatchupPicturesUploadedBy(db: Db, userId: string): Promise<number> {
  const rows = await db.catchup.findMany({
    where: { pictureSrc: { contains: `/uploads/${userId}/` } },
    select: { id: true, groupId: true },
  });
  for (const row of rows) {
    const picture = await pickCatchupPicture(db, row.groupId);
    await db.catchup.update({
      where: { id: row.id },
      data: { pictureSrc: picture.src, pictureFocus: picture.focus },
    });
  }
  return rows.length;
}

async function clearCoversPointingAtThisMember(db: Db, userId: string): Promise<number> {
  const photos = await db.photo.findMany({
    where: { uploaderId: userId },
    select: { url: true, thumbUrl: true, screenUrl: true },
  });
  const urls = [...new Set(photos.flatMap(photoStoredUrls))];
  if (urls.length === 0) return 0;

  const { count } = await db.user.updateMany({
    where: { coverPhoto: { in: urls } },
    data: { coverPhoto: null },
  });
  return count;
}

/**
 * Delete the account row (cascading the member's content), and queue the R2
 * objects those rows pointed at for the caller to delete. Order matters twice
 * over:
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
 * which bytes are still out there instead of losing them forever.
 *
 * The bytes are the CALLER's to delete, after it has written its audit line
 * (bug audit 3, T7a-05 and L11-07). This function used to drain them itself,
 * so the line recording an erasure came after the slowest step in it: an
 * admin's delete cut off mid-drain left the account gone with no
 * `admin.delete` line and the admin told it had not gone through, and a sweep
 * night with a few large archives ran out of time mid-purge and lost the
 * erased member's `account.purge` line for good. An admin's delete drains
 * right after its line; the sweep drains once, after all its purges.
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
   * So the condition rides on the DELETE itself, and zero rows deleted rolls
   * the whole transaction back. The transaction runs at REPEATABLE READ
   * (C-076, below), and where the sign-in lands decides how the purge learns
   * of it. Committed before the purge's snapshot, the delete matches nothing
   * and the member is spared at once. Committed while the purge runs, the
   * delete meets a row changed after its snapshot, and Postgres refuses it
   * (40001, Prisma's P2034) rather than reading the new version; the
   * transaction is then tried again from a fresh snapshot, which sees the
   * sign-in, and spares them there. This comment used to say the purge ran at
   * READ COMMITTED and that the delete re-read the row, which stopped being
   * true when C-076 raised the isolation level: that sign-in turned the
   * night's job red instead of counting the member as spared (bug audit 3,
   * T7a-10). */
  opts?: { onlyIfRequestedBefore?: Date }
): Promise<PurgeResult> {
  let urls: string[];
  let groupsRehomed: number;

  try {
    /* Tried again on a write conflict (bug audit 3, L1-04): RepeatableRead,
       below, refuses a write to any row somebody else changed after this
       transaction's snapshot, where READ COMMITTED would have waited for it.
       Each new attempt starts again from the top with a fresh snapshot, so
       everything it collects and deletes is read again. */
    const outcome = await retryWriteConflicts(
      () =>
        prisma.$transaction(
          async (tx) => {
            const rehomed = await promoteOrphanedGroups(tx, userId);
            const collected = await collectImageUrls(tx, userId);
            if (collected.length > 0) {
              await tx.pendingImagePurge.createMany({
                data: collected.map((url) => ({ url, reason: "purge" })),
              });
            }
            await clearBellsPointingAtThisMember(tx, userId);
            await deleteUnansweredPrompts(tx, userId);
            await noteReportsOnErasedMember(tx, userId);
            /* Nothing here touches the reports this member FILED. They are
               moderation history about somebody else, and they outlive the
               account: Report.reporter is SetNull, so the delete below detaches
               them and the Reports page shows "a member who has since left" (bug
               audit 3, T7a-01; the owner's Q1, and the privacy page's promise).
               The edge was RESTRICT, and the purge used to delete every one of
               them here, pending ones included, so the delete could succeed (audit
               H8).
               Reports on the member's posts, and flags against them, still go
               with them by Cascade, and whoever is still waiting on one is
               answered on the line above, the closing line a post's own delete
               writes (T7a-02; B3a's write-path review). */
            await tombstoneComments(tx, userId);
            await clearCoversPointingAtThisMember(tx, userId);
            await restoreCatchupPicturesUploadedBy(tx, userId);
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
        ),
      {
        attempts: PURGE_ATTEMPTS,
        onRetry: (failed) =>
          console.info(
            `[purge] ${userId}: another write landed on this account mid-purge; trying again (${failed + 1} of ${PURGE_ATTEMPTS})`
          ),
      }
    );
    urls = outcome.urls;
    groupsRehomed = outcome.rehomed;
  } catch (err) {
    const sweep = !!opts?.onlyIfRequestedBefore;
    if (err instanceof PurgeCancelled) {
      // Everything above rolled back with the delete: the rehoming, the image
      // worklist, the tombstoned comments. The account is exactly as they left it.
      console.info(`[purge] ${userId} was not deleted: the request no longer stands`);
      return {
        ok: false,
        cancelled: true,
        // Only the sweep's delete carries a condition; an admin's matches
        // nothing only when the row is already gone.
        error: sweep ? "That account is no longer due for deletion." : "That account no longer exists.",
      };
    }
    if (isSerializationFailure(err)) {
      /* Every attempt met another write. If one of them was the member
         signing back in, the right answer is the one a cancellation gets
         (T7a-10), so the sweep asks the row itself before calling it a
         failure. */
      if (opts?.onlyIfRequestedBefore && !(await stillDue(userId, opts.onlyIfRequestedBefore))) {
        console.info(`[purge] ${userId} was not deleted: they signed back in while it ran`);
        return { ok: false, cancelled: true, error: "That account is no longer due for deletion." };
      }
      // Three collisions in a row is unusual enough to want seeing, even
      // though it settles itself (bug audit 3, T7a-09).
      reportSwallowed("purge", err, { userId, sweep, attempts: PURGE_ATTEMPTS });
      return {
        ok: false,
        deferred: true,
        error: "Somebody was changing this account at the same moment, so nothing was deleted. Try again.",
      };
    }
    /* Reported, not just logged (bug audit 3, T7a-09). This was a console line
       on the one unattended destructive path: the nightly job went red with a
       bare `purge:<id>`, Sentry never saw the cause, and an admin was told to
       check a server log they cannot read. */
    reportSwallowed("purge", err, { userId, sweep });
    return {
      ok: false,
      error: "Could not delete this account. Nothing was removed, and the error has been reported.",
    };
  }

  return { ok: true, queued: urls, groupsRehomed };
}

/** Whether the member's request still stands by the sweep's cutoff. A read
 *  that fails answers yes, so the failure it was asked about is reported as it
 *  stands rather than called a cancellation. */
async function stillDue(userId: string, requestedBefore: Date): Promise<boolean> {
  try {
    const n = await prisma.user.count({
      where: { id: userId, deletionRequestedAt: { lt: requestedBefore } },
    });
    return n > 0;
  } catch {
    return true;
  }
}

/** How long a drain keeps starting deletes when its caller names no budget of
 *  its own: an admin's delete, a post's, a declined photograph's. At 25 at a
 *  time that is thousands of objects, far past any one member's archive. */
const DRAIN_BUDGET_MS = 20_000;

/**
 * Work through the pending-delete list: remove the object, then the row that
 * remembered it. A row that survives is a byte that survived.
 *
 * Called with the urls a caller has just queued (an erasure, a post's delete,
 * a merge, a declined photograph), so the common case finishes in the same
 * request, and once a night by the retention sweep with no urls, for
 * everything still queued. Rounds of parallel deletes until the worklist is
 * empty or `budgetMs` is spent (`drainQueue`, purge-rule.ts); it used to take
 * 500 rows and delete them one at a time, so a large archive waited nights
 * (bug audit 3, T7a-21).
 *
 * The count returned is objects actually gone, not attempts (B-013).
 */
export async function drainPendingImagePurges(
  onlyUrls?: string[],
  budgetMs = DRAIN_BUDGET_MS
): Promise<{ deleted: number; failed: number; finished: boolean }> {
  // An empty list means nothing to do. Never let `in: []` decide whether it
  // means everything (docs/TRAPS.md, "Do not depend on how an empty array
  // compiles").
  if (onlyUrls && onlyUrls.length === 0) return { deleted: 0, failed: 0, finished: true };
  const scope: Prisma.PendingImagePurgeWhereInput = onlyUrls ? { url: { in: onlyUrls } } : {};

  return drainQueue(
    {
      // Oldest first, and a page after the last one by (createdAt, id): one
      // createMany gives every row the same createdAt, so the id breaks ties.
      page: (after, limit) =>
        prisma.pendingImagePurge.findMany({
          where: after
            ? {
                AND: [
                  scope,
                  {
                    OR: [
                      { createdAt: { gt: after.createdAt } },
                      { createdAt: after.createdAt, id: { gt: after.id } },
                    ],
                  },
                ],
              }
            : scope,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: limit,
          select: { id: true, url: true, createdAt: true },
        }),
      remove: delImage,
      settle: async (gone, refused) => {
        if (gone.length > 0) {
          // deleteMany: a row a concurrent drain already took is simply not
          // counted, and the object is gone either way, which is the part
          // that matters.
          await prisma.pendingImagePurge.deleteMany({ where: { id: { in: gone.map((r) => r.id) } } });
          /* The `Image` rows for whatever actually went. This is the second
             of the two places bytes are deleted (the other is
             `purgeImageUrls`), the one that finishes the job for a post or an
             account, whose urls are queued inside a transaction rather than
             handed over directly. Forgotten each round, so a drain cut off
             mid-way leaves no record of an object it already removed. */
          await forgetImages(gone.map((r) => r.url));
        }
        if (refused.length > 0) {
          /* updateMany, not update (audit C-118): `update` throws P2025 on a
             missing row, so the BOOKKEEPING for a refusal could itself throw
             out of the sweep and stop every remaining purge behind it.
             updateMany no-ops on zero matches, which is the honest answer:
             somebody else already dealt with it. */
          await prisma.pendingImagePurge.updateMany({
            where: { id: { in: refused.map((r) => r.id) } },
            data: { attempts: { increment: 1 }, lastError: "delete refused by storage" },
          });
        }
      },
    },
    { deadline: Date.now() + budgetMs }
  );
}
