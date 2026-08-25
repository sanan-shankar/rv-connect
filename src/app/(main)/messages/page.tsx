import type { Metadata } from "next";
import Link from "next/link";
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
/**
 * How many conversations the list shows before the escape (audit C-058).
 *
 * The cap used to be a bare `take: 60` with no count and nothing on the page,
 * so a member's sixty-first conversation was permanently unreachable and the
 * screen said nothing about it -- the same shape B-200 fixed on the admin side
 * and this page kept. Reports, admin notices and every message a member sends
 * all land here, so sixty is reached by anyone who uses the site for long.
 */
const THREAD_PAGE = 60;

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const showAll = (await searchParams).all === "1";

  // Scoped to the signed-in member. There is no way to widen this from the
  // client: no id, filter, or flag reaches this query.
  const [threads, total] = await Promise.all([
    prisma.adminThread.findMany({
    where: { memberId: session.user.id },
    orderBy: { lastMessageAt: "desc" },
    ...(showAll ? {} : { take: THREAD_PAGE }),
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
    }),
    prisma.adminThread.count({ where: { memberId: session.user.id } }),
  ]);
  const hidden = total - threads.length;

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
      {/* No subtitle (owner, 2026-08-22): the form below says what it's for. */}
      <PageHeader title="Reach out" />

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
          placeholder="Describe a problem, an idea, or any other feedback."
        />
      </section>

      {rows.length > 0 ? (
        <section aria-label="Your conversations">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Your conversations
            </h2>
            {/* The escape, so no conversation is silently unreachable. */}
            {hidden > 0 ? (
              <Link
                href="/messages?all=1"
                className="rounded-sm text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
              >
                Show {hidden} older
              </Link>
            ) : showAll && total > THREAD_PAGE ? (
              <Link
                href="/messages"
                className="rounded-sm text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
              >
                Show fewer
              </Link>
            ) : null}
          </div>
          <ThreadList threads={rows} />
        </section>
      ) : (
        <section className="rounded-[var(--radius)] border border-dashed border-border px-6 py-10 text-center">
          <MessagesEmptyHoopoe className="mb-3 flex justify-center" />
          <p className="font-heading text-[17px] font-bold tracking-[-0.01em] text-foreground">
            Nothing here yet
          </p>
        </section>
      )}
    </div>
  );
}
