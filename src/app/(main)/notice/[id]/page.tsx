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

  const thread = await openAdminNoticeThread(notification.userId, notification.message, {
    createdAt: notification.createdAt,
  });

  await prisma.notification.update({
    where: { id: notification.id },
    data: { link: `/messages/${thread.id}`, read: true },
  });

  redirect(`/messages/${thread.id}`);
}
