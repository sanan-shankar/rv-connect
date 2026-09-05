import { prisma } from "@/lib/prisma";
import {
  MAX_MESSAGES_PER_HOUR,
  MAX_NEW_THREADS_PER_HOUR,
  THREAD_MESSAGE_LIMIT,
  deriveSubject,
  previewOf,
} from "@/lib/admin-threads";
import { IDENTITY_SELECT } from "@/lib/people-select";
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

/**
 * Who a thread belongs to, as the admin panel draws them.
 *
 * Exactly the fields `AdminPerson` declares, because `AdminPersonRow` is what
 * both admin thread surfaces render the member through -- so a field added
 * here and nowhere else is a field the row cannot draw. It was written out in
 * the queue page and the thread page, and the matching interface twice more in
 * their components: four edits to add one column.
 */
export const THREAD_MEMBER_SELECT = {
  ...IDENTITY_SELECT,
  email: true,
  accountType: true,
  batchType: true,
  batchYear: true,
} as const;

/**
 * The most recent window of a conversation, newest first.
 *
 * ONE MORE than the limit is deliberate: the extra row is how the page knows
 * it stopped short without a second count query. `splitThreadWindow` below
 * takes it off again and puts the rest in reading order. This had no `take`
 * at all once, so a long thread was an unbounded query on a page render, and
 * a member may write forty messages an hour (audit Low 86).
 */
export const THREAD_MESSAGE_WINDOW = {
  orderBy: { createdAt: "desc" },
  take: THREAD_MESSAGE_LIMIT + 1,
  select: {
    id: true,
    body: true,
    imageUrl: true,
    fromAdmin: true,
    createdAt: true,
    author: { select: IDENTITY_SELECT },
  },
} as const;

/**
 * Turn what THREAD_MESSAGE_WINDOW returned into what a conversation renders:
 * oldest first, the sentinel row dropped, and a flag saying whether it was
 * there. Both thread pages wrote this arithmetic out, and getting the
 * off-by-one wrong in one of them shows up as a message that silently never
 * appears.
 */
export function splitThreadWindow<T>(messages: T[]): { shown: T[]; olderExist: boolean } {
  const olderExist = messages.length > THREAD_MESSAGE_LIMIT;
  return {
    olderExist,
    shown: (olderExist ? messages.slice(0, THREAD_MESSAGE_LIMIT) : messages).slice().reverse(),
  };
}

/** Cheap DB-backed throttle: enough to stop a script, invisible to a person. */
export async function isThreadRateLimited(memberId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.adminThread.count({
    /* Threads the MEMBER started, not every thread with their name on it
       (audit C-057). `kind: "notice"` rows are opened BY an admin, about the
       member, one per moderated post, comment or photograph -- so a member
       whose things an admin took down in a burst spent someone else's actions
       out of their own budget, and then could not write to say what they
       thought about it. Reports stay counted, per H5: those are the member's
       own act. */
    where: { memberId, kind: { not: "notice" }, createdAt: { gte: since } },
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
  opts: { authorId?: string | null } = {}
) {
  const createdAt = new Date();
  /* `createdAt` and `db` overrides came off on 2026-09-05 with the legacy
     /notice/[id] route, which was their only caller: it locked the
     notification row and needed its create inside the same transaction
     (audit C-115). notifyAdminNote, the one caller left, opens a thread now
     and is not inside anybody's transaction. */
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
