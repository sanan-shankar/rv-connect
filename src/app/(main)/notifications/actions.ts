"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decodeKeyset, encodeKeyset, keysetWhere } from "@/lib/keyset";
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
    return { unreadCount: 0, notifications: [], nextCursor: null, hasMore: false };
  const userId = session.user.id;

  const take = Math.min(Math.max(opts?.take ?? 20, 1), 50);

  /* Value keyset, not Prisma's `cursor: { id }`. That names a row, and the
     prune below deletes read rows past the hundredth -- so a first-page open
     in another tab could delete the very row this session's cursor named, and
     the query would then answer nothing at all rather than the next page (see
     keyset.ts, audits C-056 / C-171). Comparing values instead, the deleted
     row's timestamp still points at the right place in the list. */
  const after = decodeKeyset(opts?.cursor);
  const rows = await prisma.notification.findMany({
    where: after ? { AND: [{ userId }, keysetWhere(after, "desc")] } : { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
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

  // The unread count travels with the page, so the bell can correct its badge
  // from the server on every open instead of counting its own decrements
  // forever (audit B-120). One extra cheap count on a query that already
  // touched this member's rows.
  const unreadCount = await prisma.notification.count({ where: { userId, read: false } });

  return {
    unreadCount,
    notifications: page.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? encodeKeyset(page[page.length - 1]) : null,
    hasMore,
  };
}

/**
 * Just the badge number. Its own action so the bell can refresh on focus
 * without pulling a page of rows it is not going to render (audit B-120).
 */
export async function getUnreadNotificationCount() {
  const session = await auth();
  if (!session?.user?.id) return { unreadCount: 0 };
  return {
    unreadCount: await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
  };
}

export async function markNotificationRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  /* updateMany, not update. `update` throws P2025 when its where matches
   * nothing, and three ordinary things make it match nothing: the row was
   * pruned by the KEEP=100 sweep, it was already read on another device, or the
   * id belongs to somebody else. The click handler awaits this before it
   * navigates, so the throw killed the navigation outright -- tapping a
   * notification simply did nothing (audit Lows 52, 58, 65). Marking read is
   * idempotent by nature; a row that is gone needs no marking.
   */
  await prisma.notification.updateMany({
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
