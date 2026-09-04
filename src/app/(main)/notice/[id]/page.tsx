import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openAdminNoticeThread } from "@/lib/admin-threads-server";

/**
 * The old landing page for a Notification(type: "admin_note"), kept only so
 * links already sitting in people's notification lists still work.
 *
 * A moderation note is a conversation now, not a page you can only read: see
 * /messages/[id]. New notes link there directly (notifyAdminNote). An old
 * notification still points here, so this resolves it into a real thread the
 * first time it is opened, repoints the notification at that thread, and
 * hands over.
 *
 * RETIRE NOW; the expiry has passed. This is a shim with a knowable expiry,
 * not a permanent route. Its whole audience is Notification rows minted before
 * the moderation-notes-to-messages migration of 2026-07-24, and retention.ts
 * caps notifications at 30 days -- it said 365 until 2026-09-04, which is where
 * the old "retire after 2027-08-01" date came from, but snapshot.yml had been
 * pruning at 30 all along. So no row this could resolve has existed since
 * 2026-08-23, and it resolves nothing ever again. To retire it: delete
 * src/app/(main)/notice/ (this file and its loading.tsx), drop the `createdAt`
 * override plumbing from `openAdminNoticeThread` if this is still its only
 * caller, and reword the four history comments that cite the route
 * (messages/[id]/page.tsx, feed/actions.ts, moderation-dialog.tsx,
 * admin-note.ts). Deleting it EARLY 404s real links in real inboxes, which is
 * why this is dated rather than done.
 */
export default async function AdminNoticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true, type: true, message: true, link: true, read: true, createdAt: true },
  });

  // Only the notification's own recipient may open it, never anyone else
  // guessing an id, and never a notification of any other type.
  if (!notification || notification.userId !== session.user.id || notification.type !== "admin_note") {
    notFound();
  }

  // Already resolved on an earlier visit: just hand over.
  if (notification.link?.startsWith("/messages/")) {
    redirect(notification.link);
  }

  /* Resolve idempotently (bug audit M46, finished in audit C-115).
   *
   * This used to create a thread unconditionally, so the resolution was only
   * ever as reliable as the update below it: two requests arriving together --
   * a double tap, a link prefetch racing the click -- both read a link that did
   * not start with /messages/ and both minted a thread, leaving the member with
   * two identical conversations about one note and the admin with two rows in
   * the inbox. A create that failed to be recorded did the same thing on the
   * next visit.
   *
   * The note itself is the key: this member, a notice thread, opened at the
   * notification's own timestamp. Nothing else can collide with that, and it is
   * exactly what openAdminNoticeThread stamps below.
   *
   * That key made SEQUENTIAL revisits idempotent and nothing more. A read
   * followed by a create is idempotent only if something stops the two
   * concurrent readers from both seeing nothing, and there was no such thing:
   * no unique constraint (AdminThread has one, on reportId, and it is not this)
   * and no lock. The M46 comment claimed the double tap was fixed; it was still
   * the exact failure it described.
   *
   * The lock is the NOTIFICATION row, not a new constraint. This resolution is
   * the only writer of that row's link, exactly one request may move it from a
   * legacy link to a thread, and `FOR UPDATE` makes the second request wait and
   * then SEE that -- so it short-circuits on the same branch a later visit
   * takes. A partial unique index on (memberId, createdAt) was the other route
   * and was declined: notice threads are also opened in bursts by moderation
   * (one per removed post), where two in the same millisecond would then throw
   * at an admin, which is a worse failure than the duplicate it prevents. */
  const threadId = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ link: string | null }[]>`
      SELECT "link" FROM "Notification" WHERE "id" = ${notification.id} FOR UPDATE
    `;
    // Re-read INSIDE the lock: whoever held it before us has committed by now,
    // so this is the first sight of their thread rather than our stale copy.
    const link = locked[0]?.link ?? null;
    if (link?.startsWith("/messages/")) return link.slice("/messages/".length);

    const existing = await tx.adminThread.findFirst({
      where: {
        memberId: notification.userId,
        kind: "notice",
        createdAt: notification.createdAt,
      },
      select: { id: true },
    });

    const id =
      existing?.id ??
      (
        await openAdminNoticeThread(notification.userId, notification.message, {
          createdAt: notification.createdAt,
          db: tx,
        })
      ).id;

    await tx.notification.update({
      where: { id: notification.id },
      data: { link: `/messages/${id}`, read: true },
    });
    return id;
  });

  redirect(`/messages/${threadId}`);
}
