import type { Metadata } from "next";
import Link from "next/link";
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
 *
 * The two sections are fetched separately, and only the sorted one is capped.
 * A single `take: 60` over both used to mean that once the app had accumulated
 * sixty threads -- which it does within weeks, since AdminThread collects every
 * bug report, idea, message, notice and report thread for the life of the site
 * -- every thread past position sixty became permanently unreachable from the
 * moderation surface, with nothing on the page to say so (audit B-200). Open
 * threads are the work queue and are never hidden; sorted threads are the
 * archive, so they show the newest forty with a link to the rest.
 */
const SORTED_PAGE = 40;

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const showAllSorted = sp.sorted === "all";
  // The role, re-established on this page and not borrowed from the layout.
  // Soft navigation re-renders only the segments that changed, so a shared
  // layout is not re-evaluated on every move -- and this page reads member
  // data. One line, and the demotion window closes (bug audit B-024).
  await requireAdminPage();

  const threadSelect = {
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
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: { body: true, fromAdmin: true },
      },
  } as const;

  const [openThreads, sortedThreads, sortedTotal] = await Promise.all([
    prisma.adminThread.findMany({
      where: { status: { not: "closed" } },
      orderBy: [{ adminUnread: "desc" }, { lastMessageAt: "desc" }],
      select: threadSelect,
    }),
    prisma.adminThread.findMany({
      where: { status: "closed" },
      orderBy: { lastMessageAt: "desc" },
      ...(showAllSorted ? {} : { take: SORTED_PAGE }),
      select: threadSelect,
    }),
    prisma.adminThread.count({ where: { status: "closed" } }),
  ]);

  const toRow = (t: (typeof openThreads)[number]): ThreadRow => ({
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
  });

  const live = openThreads.map(toRow);
  const sorted = sortedThreads.map(toRow);
  const sortedHidden = sortedTotal - sorted.length;

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
        <AdminSection
          label="Sorted"
          count={sortedTotal}
          action={
            sortedHidden > 0 ? (
              <Link
                href="/admin/messages?sorted=all"
                className="rounded-sm text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
              >
                Show {sortedHidden} older
              </Link>
            ) : showAllSorted && sortedTotal > SORTED_PAGE ? (
              <Link
                href="/admin/messages"
                className="rounded-sm text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
              >
                Show fewer
              </Link>
            ) : undefined
          }
        >
          <ThreadList threads={sorted} />
        </AdminSection>
      )}
    </div>
  );
}
