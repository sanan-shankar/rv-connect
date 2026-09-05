import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** The bell's badge number: how many notifications this member has not read.
 *
 *  `cache()`d per request because three callers used to ask separately and get
 *  the same integer three times on one load of `/feed` -- the (main) layout for
 *  the sidebar bell, the page for its header bell, and the bell itself from a
 *  mount effect. Two of those are server-side and in the same render, so
 *  React's cache collapses them; the third was the mount effect, and it is
 *  gone (its `focus` listener, which is the one that earns its keep, stays).
 *
 *  Server-only: every importer is a page, a layout or a server action. */
export const unreadNotificationCount = cache(async function unreadNotificationCount(
  userId: string
): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
});
