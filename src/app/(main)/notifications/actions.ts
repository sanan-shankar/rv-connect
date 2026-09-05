"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadNotificationCount } from "@/lib/notification-count";
import { decodeKeyset, encodeKeyset, keysetWhere } from "@/lib/keyset";

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

  /* Value keyset, not Prisma's `cursor: { id }`. That names a row, and rows
     under this list do get deleted -- the nightly sweep clears them by age and
     by a per-member cap -- so a cursor naming one that has gone answers nothing
     at all rather than the next page (see keyset.ts, audits C-056 / C-171).
     Comparing values instead, the deleted row's timestamp still points at the
     right place in the list. */
  const after = decodeKeyset(opts?.cursor);
  const rows = await prisma.notification.findMany({
    where: after ? { AND: [{ userId }, keysetWhere(after, "desc")] } : { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  /* No prune here any more. This used to run two queries on every first-page
     open to delete each member's read notifications past the hundredth, under
     a comment saying "no scheduled job does either". One does now, and has
     since the retention sweep learned this table: `KEEP_NOTIFICATIONS` in
     src/lib/retention.ts, beside the age cutoff and every other number that
     says how long this app keeps things. A cap enforced only for members who
     open the bell was never a bound anyway. */

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
  return { unreadCount: await unreadNotificationCount(session.user.id) };
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

  /* No revalidatePath. A literal "/" revalidates the signed-out landing hero
     and nothing else -- only `revalidatePath("/", "layout")` means everything
     -- so this purged a page the member is not on and refreshed nothing the
     bell reads. The bell holds its list and its count in client state and
     corrects both from what this action's siblings return. */
  return { success: true };
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  // No revalidatePath, for the reason given above.
  return { success: true };
}
