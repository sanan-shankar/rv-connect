import { prisma } from "@/lib/prisma";
import {
  MAX_MESSAGES_PER_HOUR,
  MAX_NEW_THREADS_PER_HOUR,
  deriveSubject,
  previewOf,
} from "@/lib/admin-threads";
// One definition of "did this app mint that URL", in a pure module so both the
// message path and the post/Catch-up write paths share it (audit C2/M10).
export { isUploadedImageUrl } from "@/lib/upload-shared";

/**
 * The database half of member <-> admin conversations. Split from
 * admin-threads.ts (which is client-safe) so the composer and the admin queue
 * can share the vocabulary without dragging Prisma, and therefore `pg`, into
 * the browser bundle. That exact mistake shipped once during this build and
 * broke /messages with "Module not found: Can't resolve 'dns'" while
 * `tsc --noEmit` stayed green, so: NEVER import this file, directly or
 * transitively, from a "use client" component. Import the pure vocabulary from
 * admin-threads.ts instead.
 *
 * Threads are private: a member may only ever touch their own, admins may
 * touch all. Those checks live in the server actions, against the session.
 */

/** Cheap DB-backed throttle: enough to stop a script, invisible to a person. */
export async function isThreadRateLimited(memberId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.adminThread.count({
    where: { memberId, createdAt: { gte: since } },
  });
  return count >= MAX_NEW_THREADS_PER_HOUR;
}

export async function isMessageRateLimited(authorId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.adminMessage.count({
    where: { authorId, createdAt: { gte: since } },
  });
  return count >= MAX_MESSAGES_PER_HOUR;
}

/** Tell every admin that a member has written. Small table, so a fan-out is fine. */
export async function notifyAdmins(message: string, link: string): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "admin", isBlocked: false },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type: "admin_message", message, link })),
  });
}

/**
 * Writes a line into the conversation a report opened and tells the reporter,
 * so "we looked at this" reaches the person who bothered to flag it. A no-op
 * when the report has no thread (reports filed before this feature shipped).
 */
export async function noteOnReportThread(reportId: string, body: string): Promise<void> {
  const thread = await prisma.adminThread.findUnique({
    where: { reportId },
    select: { id: true, memberId: true },
  });
  if (!thread) return;

  await prisma.$transaction([
    prisma.adminMessage.create({
      data: { threadId: thread.id, authorId: null, fromAdmin: true, body },
    }),
    prisma.adminThread.update({
      where: { id: thread.id },
      // Not `adminUnread: false`: a note added here is not an admin reading
      // the thread, and clearing it would hide whatever the member had written
      // and nobody had looked at yet (audit B-201's shape, same column).
      data: { lastMessageAt: new Date(), memberUnread: true },
    }),
    prisma.notification.create({
      data: {
        userId: thread.memberId,
        type: "report_update",
        message: previewOf(body, 80),
        link: `/messages/${thread.id}`,
      },
    }),
  ]);
}

/**
 * Opens a thread that an admin (or the app) started, e.g. the note attached to
 * a removed post. Returns the thread so the caller can link a notification
 * straight at the conversation.
 */
export async function openAdminNoticeThread(
  memberId: string,
  note: string,
  opts: { authorId?: string | null; createdAt?: Date } = {}
) {
  const createdAt = opts.createdAt ?? new Date();
  return prisma.adminThread.create({
    data: {
      memberId,
      kind: "notice",
      subject: deriveSubject(note),
      lastMessageAt: createdAt,
      memberUnread: true,
      createdAt,
      messages: {
        create: {
          authorId: opts.authorId ?? null,
          fromAdmin: true,
          body: note,
          createdAt,
        },
      },
    },
  });
}
