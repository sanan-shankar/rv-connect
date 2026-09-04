import { prisma } from "@/lib/prisma";
import { postNotificationLink } from "@/lib/notification-links";

/**
 * Take down the bell rows that point at a post that is no longer readable.
 *
 * Every like, comment and reply notification links at `postNotificationLink`,
 * and nothing reconciled those rows with the post's own life: delete a letter
 * and the "X replied to your comment" in somebody else's bell still pointed at
 * `/letters/<id>`, which answers 404. Notifications are kept until the
 * 30-day sweep, so the window is a month (bug-report-2 C-054). Catch-ups has
 * done this since it was written -- `clearCatchupNotifications` is the
 * in-repo counterexample this mirrors.
 *
 * Matched on the exact link rather than on a type list, because the link IS
 * the thing that has stopped working, and one post's rows are exactly the ones
 * carrying its link.
 *
 * `keepFor` is the author on a moderator's HIDE: the row is still there, and
 * the author (like an admin) can still open it to see the notice, so their own
 * notifications still lead somewhere. Everybody else gets the 404 and their
 * rows go.
 */
export async function clearPostNotifications(
  post: { id: string; kind?: string | null },
  opts?: { keepFor?: string | null }
): Promise<void> {
  await prisma.notification.deleteMany({
    where: {
      link: postNotificationLink(post),
      ...(opts?.keepFor ? { userId: { not: opts.keepFor } } : {}),
    },
  });
}
