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

  /* Resolve idempotently (bug audit M46).
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
   * exactly what openAdminNoticeThread stamps below. */
  const existing = await prisma.adminThread.findFirst({
    where: {
      memberId: notification.userId,
      kind: "notice",
      createdAt: notification.createdAt,
    },
    select: { id: true },
  });

  const threadId =
    existing?.id ??
    (
      await openAdminNoticeThread(notification.userId, notification.message, {
        createdAt: notification.createdAt,
      })
    ).id;

  await prisma.notification.update({
    where: { id: notification.id },
    data: { link: `/messages/${threadId}`, read: true },
  });

  redirect(`/messages/${threadId}`);
}
