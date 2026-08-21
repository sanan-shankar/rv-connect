import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { markThreadSeenByAdmin } from "@/app/(main)/messages/actions";
import { ThreadView } from "@/components/admin/messages/thread-view";

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
  // The role, re-established on this page and not borrowed from the layout.
  // Soft navigation re-renders only the segments that changed, so a shared
  // layout is not re-evaluated on every move -- and this page reads member
  // data. One line, and the demotion window closes (bug audit B-024).
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
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          birdOverride: true,
          accountType: true,
          batchType: true,
          batchYear: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          imageUrl: true,
          fromAdmin: true,
          createdAt: true,
          author: {
            select: { id: true, name: true, photoUrl: true, birdOverride: true },
          },
        },
      },
    },
  });

  if (!thread) notFound();

  // Reading it IS seeing it. The action re-checks the admin role itself.
  if (thread.adminUnread) {
    await markThreadSeenByAdmin(thread.id);
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
        messages: thread.messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
      }}
    />
  );
}
