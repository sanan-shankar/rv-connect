import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { markThreadSeenByAdmin } from "@/app/(main)/messages/actions";
import { ThreadView } from "@/components/admin/messages/thread-view";
import { IDENTITY_SELECT } from "@/lib/people-select";

/** How many messages of one conversation a page render loads. Its most recent
 *  end: a thread is read for what was said last. */
const THREAD_MESSAGE_LIMIT = 200;

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
        /* The most recent page, newest first, then reversed for reading below.
           This had no `take` at all, so one long conversation was an unbounded
           query on a page render -- and a member may write forty messages an
           hour (audit Low 86). The END of a conversation is the part anybody
           opens it for, so the window is taken from that end. */
        orderBy: { createdAt: "desc" },
        take: THREAD_MESSAGE_LIMIT + 1,
        select: {
          id: true,
          body: true,
          imageUrl: true,
          fromAdmin: true,
          createdAt: true,
          author: {
            select: IDENTITY_SELECT,
          },
        },
      },
    },
  });

  if (!thread) notFound();

  /* The query above asked for one more than the window so the page can say
     whether it stopped short, and it read newest-first; the conversation reads
     oldest-first (audit Low 86). */
  const olderExist = thread.messages.length > THREAD_MESSAGE_LIMIT;
  const shown = (olderExist ? thread.messages.slice(0, THREAD_MESSAGE_LIMIT) : thread.messages)
    .slice()
    .reverse();


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
