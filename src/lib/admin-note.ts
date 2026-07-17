import { prisma } from "@/lib/prisma";

/**
 * Sends the optional "note to the author" that an admin can attach when
 * removing a post, letter, comment, or Collection photo. Creates a
 * Notification (type "admin_note") whose `link` opens the dedicated,
 * warmly-designed /notice/[id] page -- never the raw message inline in the
 * notification dropdown, so there's room to say it kindly instead of as a
 * one-line ding.
 */
export async function notifyAdminNote(userId: string, note: string) {
  const created = await prisma.notification.create({
    data: { userId, type: "admin_note", message: note },
  });
  await prisma.notification.update({
    where: { id: created.id },
    data: { link: `/notice/${created.id}` },
  });
}
