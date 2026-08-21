"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** How many notifications one account keeps. Everything below the newest
 *  KEEP is deleted whenever the bell opens: past a hundred, old activity is
 *  noise nobody will ever scroll to, and an unbounded table grows forever
 *  (every like/comment/reply writes a row and nothing ever deleted one). */
const KEEP = 100;

/**
 * One page of the viewer's notifications, newest first. Keyset on the row id
 * (ids are cuids, but the cursor row's position is resolved by Prisma, so the
 * (createdAt, id) ordering stays stable across pages). The bell fetches a
 * first page on open and further pages as the panel scrolls.
 */
export async function getNotifications(opts?: {
  cursor?: string | null;
  take?: number;
}) {
  const session = await auth();
  if (!session?.user?.id)
    return { notifications: [], nextCursor: null, hasMore: false };
  const userId = session.user.id;

  const take = Math.min(Math.max(opts?.take ?? 20, 1), 50);

  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  // The prune, piggy-backed on a first-page open the same way the mail queue
  // drains on page load (no cron on this project). Two cheap queries: find
  // the KEEP-th newest row, delete everything older. Skipped on later pages
  // so scrolling can never delete rows out from under its own cursor.
  if (!opts?.cursor) {
    const cutoff = await prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: KEEP - 1,
      take: 1,
      select: { createdAt: true },
    });
    if (cutoff.length > 0) {
      // `read: true` matters. Without it the cap deleted UNREAD rows too --
      // including moderation notices and admin messages the member had never
      // opened, which is the one class of notification that must survive
      // being outranked by a hundred likes (bug audit, Low 85). Unread rows
      // are still bounded: the nightly sweep clears them by age.
      await prisma.notification.deleteMany({
        where: { userId, createdAt: { lt: cutoff[0].createdAt }, read: true },
      });
    }
  }

  return {
    notifications: page.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
    hasMore,
  };
}

export async function markNotificationRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.notification.update({
    where: { id: notificationId, userId: session.user.id },
    data: { read: true },
  });

  revalidatePath("/");
  return { success: true };
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/");
  return { success: true };
}
