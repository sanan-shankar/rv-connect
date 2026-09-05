import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { previewOf } from "@/lib/admin-threads";
import { openAdminNoticeThread } from "@/lib/admin-threads-server";

/**
 * Sends the optional "note to the author" that an admin can attach when
 * removing a post, letter, comment, or Collection photo.
 *
 * The note opens a real conversation (AdminThread) rather than a dead-end
 * page, so the author can write back and ask what they got wrong. The
 * Notification (type "admin_note") links straight at that thread. Notes
 * minted before the 2026-07-24 migration pointed at a /notice/[id] page that
 * resolved itself into a thread on first open; that route was retired on
 * 2026-09-05, once 30-day retention had left it with no rows to serve.
 *
 * Only admins ever reach this (every caller is admin-gated), so the acting
 * admin is read straight from the session and stored as the note's author.
 * That is what makes the note render as an admin bubble with the shield mark
 * rather than a centered system line (which is reserved for the app's own
 * procedural receipts, e.g. "you reported a post by X").
 */
export async function notifyAdminNote(userId: string, note: string) {
  const session = await auth();
  const thread = await openAdminNoticeThread(userId, note, {
    authorId: session?.user?.id ?? null,
  });
  await prisma.notification.create({
    data: {
      userId,
      type: "admin_note",
      message: previewOf(note),
      link: `/messages/${thread.id}`,
    },
  });
}
