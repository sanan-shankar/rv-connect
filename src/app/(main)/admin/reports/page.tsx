import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { AdminEmpty, AdminSection } from "@/components/admin/admin-chrome";
import { ReportList, type ReportRow } from "@/components/admin/reports/report-list";

export const metadata: Metadata = {
  title: "Reports",
};

const REPORT_SELECT = {
  id: true,
  reason: true,
  status: true,
  targetType: true,
  createdAt: true,
  reporter: { select: { id: true, name: true } },
  post: {
    select: {
      id: true,
      content: true,
      isHidden: true,
      author: { select: { id: true, name: true } },
    },
  },
  reportedUser: { select: { id: true, name: true } },
  thread: { select: { id: true } },
} as const;

/**
 * Flagged posts and people.
 *
 * Its own section rather than a filter inside Content, because
 * `Report.targetType` is "post" | "user": a report can be against a PERSON,
 * so it belongs to neither Content nor People and would have to be duplicated
 * into both.
 *
 * The new part is the settled list. The old panel queried `status: "pending"`
 * and nothing else, so dismissing a report put it permanently out of reach
 * and there was no way to notice that the same person had been reported five
 * times. That is the one fact a moderation queue exists to surface.
 */
export default async function AdminReportsPage() {
  const [pending, settled] = await Promise.all([
    prisma.report.findMany({
      where: { status: "pending" },
      select: REPORT_SELECT,
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.findMany({
      where: { status: { not: "pending" } },
      select: REPORT_SELECT,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  // How many times each reported PERSON has come up, across every report ever
  // filed, pending or not. A single complaint is noise; the fifth is a
  // pattern, and the row is the only place that can say so.
  const priors = await prisma.report.groupBy({
    by: ["reportedUserId"],
    where: { reportedUserId: { not: null } },
    _count: true,
  });
  const priorByUser = new Map(
    priors.map((p) => [p.reportedUserId as string, p._count])
  );

  const toRow = (r: (typeof pending)[number]): ReportRow => ({
    id: r.id,
    reason: r.reason,
    status: r.status,
    targetType: r.targetType,
    createdAt: r.createdAt.toISOString(),
    reporterId: r.reporter.id,
    reporterName: r.reporter.name,
    postId: r.post?.id ?? null,
    postExcerpt: r.post ? r.post.content.slice(0, 240) : null,
    postTruncated: (r.post?.content.length ?? 0) > 240,
    postHidden: r.post?.isHidden ?? false,
    postAuthorId: r.post?.author.id ?? null,
    postAuthorName: r.post?.author.name ?? null,
    reportedUserId: r.reportedUser?.id ?? null,
    reportedUserName: r.reportedUser?.name ?? null,
    priorReports: r.reportedUser ? (priorByUser.get(r.reportedUser.id) ?? 1) : 1,
    threadId: r.thread?.id ?? null,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Reports" />

      <AdminSection label="Waiting on you" count={pending.length}>
        {pending.length === 0 ? (
          <AdminEmpty>Nothing has been reported. Nobody is waiting.</AdminEmpty>
        ) : (
          <ReportList reports={pending.map(toRow)} />
        )}
      </AdminSection>

      <AdminSection label="Settled" count={settled.length}>
        {settled.length === 0 ? (
          <AdminEmpty>Nothing has been settled yet.</AdminEmpty>
        ) : (
          <ReportList reports={settled.map(toRow)} settled />
        )}
      </AdminSection>
    </div>
  );
}
