import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { THREAD_MESSAGE_LIMIT, threadTitle } from "@/lib/admin-threads";
import { THREAD_MESSAGE_WINDOW, splitThreadWindow } from "@/lib/admin-threads-server";
import { AdminMark, Conversation } from "@/components/messages/conversation";
import { MessageComposer } from "@/components/messages/message-composer";

export const metadata: Metadata = {
  title: "Messages",
};

/**
 * One conversation between a member and the admins.
 *
 * This is where a moderation note lands (it used to be a read-only page at
 * a /notice/[id] page, retired 2026-09-05, that a member could not answer).
 * The heading band carries the
 * title only: the time sits with each message, where a timestamp belongs,
 * rather than floating in the header.
 */
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const thread = await prisma.adminThread.findUnique({
    where: { id },
    select: {
      id: true,
      memberId: true,
      subject: true,
      kind: true,
      status: true,
      messages: THREAD_MESSAGE_WINDOW,
    },
  });

  // Ownership, checked server-side on every read: only the member the thread
  // belongs to may open it. A thread belonging to someone else is a 404, the
  // same as one that does not exist, so guessing an id tells you nothing.
  // Admins read these through /admin, not here.
  if (!thread || thread.memberId !== session.user.id) {
    notFound();
  }

  const { shown, olderExist } = splitThreadWindow(thread.messages);


  /* Marked read only THROUGH what was rendered (audit C-061).
     An admin reply committing between the message query above and this write
     had its just-set `memberUnread` cleared without ever appearing on the page,
     so the member saw no dot and never learned it had arrived. `lastMessageAt`
     is the thread's own clock; if it has moved past the newest message on
     screen, the flag stays and the next visit shows it. */
  const seenThrough = shown.at(-1)?.createdAt;
  await prisma.adminThread.updateMany({
    where: {
      id: thread.id,
      memberId: session.user.id,
      memberUnread: true,
      ...(seenThrough ? { lastMessageAt: { lte: seenThrough } } : {}),
    },
    data: { memberUnread: false },
  });

  const title = threadTitle(thread);

  return (
    <div>
      <Link
        href="/messages"
        className="mb-6 inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        All your messages
      </Link>

      <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className="flex items-center gap-3 bg-canopy px-5 py-4 sm:px-6 sm:py-5">
          <AdminMark size={36} />
          <h1 className="min-w-0 flex-1 font-heading text-[17px] font-bold leading-tight tracking-[-0.01em] text-white">
            {title}
          </h1>
          {thread.status === "closed" && (
            <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-medium text-white/90">
              Sorted
            </span>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {olderExist && (
            <p className="mb-4 text-[12.5px] text-muted-foreground">
              Showing the most recent {THREAD_MESSAGE_LIMIT} messages of this conversation.
            </p>
          )}
          <Conversation
            messages={shown.map((m) => ({
              ...m,
              createdAt: m.createdAt.toISOString(),
            }))}
            viewerId={session.user.id}
          />

          <div className="mt-6 border-t border-border pt-5">
            <MessageComposer
              mode="reply"
              threadId={thread.id}
              sender={{
                id: session.user.id,
                name: session.user.name,
                photoUrl: session.user.photoUrl,
                birdOverride: session.user.birdOverride,
              }}
              placeholder="Write back..."
              submitLabel="Reply"
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[12.5px] text-muted-foreground">
        Only you and the admins can read this.
      </p>
    </div>
  );
}
