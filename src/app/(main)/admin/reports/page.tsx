import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_MEASURE,
  AdminCapped,
  AdminEmpty,
  AdminSection,
} from "@/components/admin/admin-chrome";
import { ReportList, type ReportRow } from "@/components/admin/reports/report-list";

export const metadata: Metadata = {
  title: "Reports",
};

/** The waiting queue is meant to be emptied, so a page of it is plenty --
 *  and a spam wave must not be able to load every row into one render. */
const PENDING_LIMIT = 100;
/** History, for spotting a pattern. Older than this is in the database. */
const SETTLED_LIMIT = 50;

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
  // Re-checked per page, not only in the layout: soft navigation skips
  // layouts, which leaves a demoted admin still reading (B-024, argued in
  // lib/admin.ts).
  await requireAdminPage();
  /* Both lists are bounded. The waiting queue used to have no `take` at all,
     so a flood of reports would have loaded every one of them into a single
     page render (audit Low 55) -- and this is precisely the page a flood
     arrives on. Both say when they have stopped short, below. */
  const [pending, settled] = await Promise.all([
    prisma.report.findMany({
      where: { status: "pending" },
      select: REPORT_SELECT,
      orderBy: { createdAt: "desc" },
      take: PENDING_LIMIT,
    }),
    prisma.report.findMany({
      where: { status: { not: "pending" } },
      select: REPORT_SELECT,
      orderBy: { createdAt: "desc" },
      take: SETTLED_LIMIT,
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
    <div className={`flex flex-col gap-6 ${ADMIN_MEASURE}`}>
      <PageHeader title="Reports" />

      <AdminSection label="Waiting on you" count={pending.length}>
        {pending.length === 0 ? (
          <AdminEmpty>Nothing has been reported. Nobody is waiting.</AdminEmpty>
        ) : (
          <>
            <ReportList reports={pending.map(toRow)} />
            {pending.length === PENDING_LIMIT && (
              <AdminCapped>
                The newest {PENDING_LIMIT}. Settle some to see the rest.
              </AdminCapped>
            )}
          </>
        )}
      </AdminSection>

      <AdminSection label="Settled" count={settled.length}>
        {settled.length === 0 ? (
          <AdminEmpty>Nothing has been settled yet.</AdminEmpty>
        ) : (
          <>
            <ReportList reports={settled.map(toRow)} settled />
            {settled.length === SETTLED_LIMIT && (
              <AdminCapped>The most recent {SETTLED_LIMIT}.</AdminCapped>
            )}
          </>
        )}
      </AdminSection>
    </div>
  );
}
