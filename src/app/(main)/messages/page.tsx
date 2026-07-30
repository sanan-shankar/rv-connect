import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { MessageComposer } from "@/components/messages/message-composer";
import { ThreadList } from "@/components/messages/thread-list";
import { MessagesEmptyHoopoe } from "@/components/messages/messages-empty-hoopoe";

export const metadata: Metadata = {
  title: "Messages",
};

/**
 * The member's side of the admin conversations: one box to write in, and every
 * thread they already have underneath it.
 *
 * This replaced the third-party Tally feedback form (2026-07-24). Tally asked
 * for a category first and only then showed a text field, which is what made
 * reporting a bug feel like paperwork. Here the box comes first and everything
 * else is optional. Notes from the admins and follow-ups on anything the
 * member reported land in the same list, so there is one place to look.
 */
export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Scoped to the signed-in member. There is no way to widen this from the
  // client: no id, filter, or flag reaches this query.
  const threads = await prisma.adminThread.findMany({
    where: { memberId: session.user.id },
    orderBy: { lastMessageAt: "desc" },
    take: 60,
    select: {
      id: true,
      subject: true,
      kind: true,
      status: true,
      memberUnread: true,
      lastMessageAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, fromAdmin: true },
      },
      _count: { select: { messages: true } },
    },
  });

  const rows = threads.map((t) => ({
    id: t.id,
    subject: t.subject,
    kind: t.kind,
    status: t.status,
    memberUnread: t.memberUnread,
    lastMessageAt: t.lastMessageAt.toISOString(),
    lastBody: t.messages[0]?.body ?? "",
    lastFromAdmin: t.messages[0]?.fromAdmin ?? false,
    messageCount: t._count.messages,
  }));

  return (
    <div>
      <PageHeader
        title="You and the admins"
        subtitle="Something broken, an idea, a question. Write a line and someone will read it."
      />

      <section
        aria-label="Write to the admins"
        className="card-elevated mb-8 rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5"
      >
        <MessageComposer
          mode="new"
          sender={{
            id: session.user.id,
            name: session.user.name,
            photoUrl: session.user.photoUrl,
            birdOverride: session.user.birdOverride,
          }}
          placeholder="Say what happened, or what you'd like. One line is plenty."
        />
      </section>

      {rows.length > 0 ? (
        <section aria-label="Your conversations">
          <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Your conversations
          </h2>
          <ThreadList threads={rows} />
        </section>
      ) : (
        <section className="rounded-[var(--radius)] border border-dashed border-border px-6 py-10 text-center">
          <MessagesEmptyHoopoe className="mb-3 flex justify-center" />
          <p className="font-heading text-[17px] font-bold tracking-[-0.01em] text-foreground">
            Nothing here yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-[1.7] text-muted-foreground">
            Whatever you send sits here with the reply, so you can always find your way back to it.
            Notes from the admins land here too.
          </p>
        </section>
      )}
    </div>
  );
}
