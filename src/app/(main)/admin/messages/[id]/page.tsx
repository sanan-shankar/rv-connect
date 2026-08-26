import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { markThreadSeenByAdmin } from "@/app/(main)/messages/actions";
import { ThreadView } from "@/components/admin/messages/thread-view";
import {
  THREAD_MEMBER_SELECT,
  THREAD_MESSAGE_WINDOW,
  splitThreadWindow,
} from "@/lib/admin-threads-server";

export const metadata: Metadata = {
  title: "Message",
};

/**
 * One conversation.
 *
 * The notification an admin gets used to point at `/admin?thread=<id>`, which
 * meant the queue had to auto-open a row on mount and clear its marker from
 * inside an effect guarded by a ref so it could not loop against its own
 * `router.refresh`. As a route, the same thing is a page load: the thread is
 * open because it IS the page, and marking it seen happens on the server on
 * the way in.
 */
export default async function AdminThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Re-checked per page, not only in the layout: soft navigation skips
  // layouts, which leaves a demoted admin still reading (B-024, argued in
  // lib/admin.ts).
  await requireAdminPage();
  const { id } = await params;

  const thread = await prisma.adminThread.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      kind: true,
      status: true,
      adminUnread: true,
      lastMessageAt: true,
      member: { select: THREAD_MEMBER_SELECT },
      messages: THREAD_MESSAGE_WINDOW,
    },
  });

  if (!thread) notFound();

  const { shown, olderExist } = splitThreadWindow(thread.messages);


  /* Reading it IS seeing it -- but only through what was actually rendered
     (audit C-061). A member reply committing between the query above and this
     write had its flag cleared without appearing on the page. The action
     re-checks the admin role itself. */
  if (thread.adminUnread) {
    await markThreadSeenByAdmin(thread.id, shown.at(-1)?.createdAt);
  }

  return (
    <ThreadView
      thread={{
        id: thread.id,
        subject: thread.subject,
        kind: thread.kind,
        status: thread.status,
        lastMessageAt: thread.lastMessageAt.toISOString(),
        member: thread.member,
        olderExist,
        messages: shown.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
      }}
    />
  );
}
