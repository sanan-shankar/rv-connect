/* ------------------------------------------------------------------ *
 *  The Overview worklist.
 *
 *  Split from admin-worklist.ts for the usual reason: that one is imported
 *  by a client component and this one imports `prisma`.
 *
 *  THE RULE THIS FILE EXISTS TO KEEP: the list here and the count in the
 *  rail must be the same fact. `worklistCounts()` in lib/admin.ts counts
 *  exactly these six predicates, and if the two ever drift the rail will say
 *  three things are waiting above a list showing two, which is worse than no
 *  count at all. Change one, change the other.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";
import { overdueEditionWhere } from "@/lib/admin";
import { threadTitle } from "@/lib/admin-threads";
import type { WorkItem } from "@/lib/admin-worklist";

const PER_QUEUE = 20;

export async function loadWorklist(): Promise<WorkItem[]> {
  const now = new Date();

  const [threads, reports, photos, flagged, failedMail, stuck] = await Promise.all([
    prisma.adminThread.findMany({
      where: { adminUnread: true },
      select: {
        id: true,
        subject: true,
        kind: true,
        lastMessageAt: true,
        member: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: PER_QUEUE,
    }),
    prisma.report.findMany({
      where: { status: "pending" },
      select: {
        id: true,
        reason: true,
        targetType: true,
        createdAt: true,
        reporter: { select: { name: true } },
        reportedUser: { select: { name: true } },
        post: { select: { author: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: PER_QUEUE,
    }),
    prisma.photo.findMany({
      where: { approved: false, isHidden: false },
      select: {
        id: true,
        caption: true,
        createdAt: true,
        uploader: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: PER_QUEUE,
    }),
    prisma.user.findMany({
      where: { isBlocked: false, verifyState: "flagged" },
      select: { id: true, name: true, email: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: PER_QUEUE,
    }),
    prisma.outboundEmail.findMany({
      where: { status: "failed" },
      select: {
        id: true,
        to: true,
        kind: true,
        lastError: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PER_QUEUE,
    }),
    prisma.catchupEdition.findMany({
      where: overdueEditionWhere(now),
      select: {
        id: true,
        number: true,
        status: true,
        updatedAt: true,
        catchup: { select: { id: true, title: true, group: { select: { name: true } } } },
      },
      take: PER_QUEUE,
    }),
  ]);

  const items: WorkItem[] = [
    ...threads.map((t) => ({
      key: `message-${t.id}`,
      queue: "message" as const,
      title: `${t.member.name} wrote in`,
      detail: t.messages[0]?.body.slice(0, 120) ?? threadTitle(t),
      href: `/admin/messages/${t.id}`,
      at: t.lastMessageAt.toISOString(),
    })),
    ...reports.map((r) => ({
      key: `report-${r.id}`,
      queue: "report" as const,
      title:
        r.targetType === "user"
          ? `${r.reporter.name} flagged ${r.reportedUser?.name ?? "somebody"}`
          : `${r.reporter.name} reported a post by ${r.post?.author.name ?? "somebody"}`,
      detail: r.reason,
      href: "/admin/reports",
      at: r.createdAt.toISOString(),
    })),
    ...photos.map((p) => ({
      key: `photo-${p.id}`,
      queue: "photo" as const,
      title: `${p.uploader.name} added a photo`,
      detail: p.caption?.slice(0, 120) ?? "No caption",
      href: "/admin/content?type=pending",
      at: p.createdAt.toISOString(),
    })),
    ...flagged.map((u) => ({
      key: `flagged-${u.id}`,
      queue: "flagged" as const,
      title: `${u.name} has been flagged`,
      detail: u.email,
      href: `/admin/people/${u.id}`,
      at: u.updatedAt.toISOString(),
    })),
    ...failedMail.map((m) => ({
      key: `mail-${m.id}`,
      queue: "mail" as const,
      title: `Could not reach ${m.user?.name ?? m.to}`,
      // The error is the point. It has been recorded on every failure since
      // the queue shipped and shown nowhere.
      detail: m.lastError?.slice(0, 140) ?? m.to,
      href: "/admin/mail",
      at: m.createdAt.toISOString(),
    })),
    ...stuck.map((e) => ({
      key: `catchup-${e.id}`,
      queue: "catchup" as const,
      title: `Round ${e.number} of ${e.catchup.title ?? `${e.catchup.group.name} Catch-ups`} is past its date`,
      detail:
        e.status === "collecting"
          ? "Still taking questions"
          : e.status === "answering"
            ? "Still taking answers"
            : "Still being put together",
      href: "/admin/catchups",
      at: e.updatedAt.toISOString(),
    })),
  ];

  // One list, newest first, mixed. Deliberately not grouped by queue: the
  // question this page answers is "what is waiting", and a person triaging
  // does not care which table a job came out of.
  items.sort((a, b) => b.at.localeCompare(a.at));
  return items;
}
