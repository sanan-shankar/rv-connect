import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { AdminEmpty, AdminSection } from "@/components/admin/admin-chrome";
import { ThreadList, type ThreadRow } from "@/components/admin/messages/thread-list";

export const metadata: Metadata = {
  title: "Messages",
};

/**
 * The member inbox.
 *
 * Two things changed from the queue this replaces. It loads thread HEADERS
 * only: the old one fetched 40 threads with every message nested inside all
 * of them, on every render of a page that also fetched the user table three
 * times. And a thread opens on its own route instead of expanding in place,
 * which is what makes the notification deep link an ordinary page rather than
 * a `?thread=` query string with a mount-once effect behind it.
 */
export default async function AdminMessagesPage() {
  // The role, re-established on this page and not borrowed from the layout.
  // Soft navigation re-renders only the segments that changed, so a shared
  // layout is not re-evaluated on every move -- and this page reads member
  // data. One line, and the demotion window closes (bug audit B-024).
  await requireAdminPage();
  const threads = await prisma.adminThread.findMany({
    orderBy: [{ adminUnread: "desc" }, { lastMessageAt: "desc" }],
    take: 60,
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
      // The last line only, for the preview. Not the whole conversation.
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, fromAdmin: true },
      },
    },
  });

  const rows: ThreadRow[] = threads.map((t) => ({
    id: t.id,
    subject: t.subject,
    kind: t.kind,
    status: t.status,
    adminUnread: t.adminUnread,
    lastMessageAt: t.lastMessageAt.toISOString(),
    member: t.member,
    preview: t.messages[0]
      ? `${t.messages[0].fromAdmin ? "You: " : ""}${t.messages[0].body}`
      : "",
  }));

  const live = rows.filter((t) => t.status !== "closed");
  const sorted = rows.filter((t) => t.status === "closed");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Messages" />

      <AdminSection label="Open" count={live.length}>
        {live.length === 0 ? (
          <AdminEmpty>Nobody is waiting. Everything has been sorted.</AdminEmpty>
        ) : (
          <ThreadList threads={live} />
        )}
      </AdminSection>

      {sorted.length > 0 && (
        /* Sorted threads keep their own section rather than sitting in the
           same stack at the same size, which made a panel with three answered
           messages and one waiting look like four jobs (owner, 2026-08-04:
           "put all the sorted messages away, or at least collapsible"). */
        <AdminSection label="Sorted" count={sorted.length}>
          <ThreadList threads={sorted} />
        </AdminSection>
      )}
    </div>
  );
}
