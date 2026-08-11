import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Users, FileText, AlertTriangle, UserPlus, Images, Mail } from "lucide-react";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminStats } from "@/components/admin/admin-stats";
import { UserManagement } from "@/components/admin/user-management";
import { ReportManagement } from "@/components/admin/report-management";
import { PhotoQueue } from "@/components/admin/photo-queue";
import { VerificationQueue } from "@/components/admin/verification-queue";
import {
  VerificationOverview,
  type EmailState,
  type VerificationRow,
} from "@/components/admin/verification-overview";
import { MessageQueue } from "@/components/admin/message-queue";
import { mailHealth } from "@/lib/email-queue";
import { TakeTourAgainButton } from "@/components/tour/take-tour-again-button";
import { PUBLISHED_ONLY } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage({
  searchParams,
}: {
  // ?thread=<id> comes from the notification an admin gets when a member
  // writes in, so the row they were told about opens straight away.
  searchParams: Promise<{ thread?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/feed");
  }

  const ownerEmail = process.env.ADMIN_EMAIL;
  const showTour = Boolean(ownerEmail) && session.user.email === ownerEmail;
  const { thread: openThreadId } = await searchParams;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, totalPosts, newSignups, pendingReports, pendingPhotos] =
    await Promise.all([
      prisma.user.count({ where: { isBlocked: false } }),
      // Drafts are unpublished, private letters -- don't count them toward
      // the sitewide "Total Posts" stat.
      prisma.post.count({ where: { ...PUBLISHED_ONLY } }),
      prisma.user.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.report.count({ where: { status: "pending" } }),
      prisma.photo.findMany({
        where: { approved: false, isHidden: false },
        include: { uploader: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      batchType: true,
      batchYear: true,
      role: true,
      isBlocked: true,
      createdAt: true,
      adminNote: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingVerification = await prisma.user.findMany({
    where: { isBlocked: false, verifyState: { in: ["unverified", "pending", "flagged"] } },
    select: {
      id: true,
      name: true,
      email: true,
      accountType: true,
      verifyState: true,
      batchType: true,
      batchYear: true,
      admissionNumber: true,
      yearJoined: true,
      yearLeft: true,
    },
    orderBy: { createdAt: "asc" },
  });

  /* ---- Verification overview: both kinds of "verified", in one place ----
     The panel had two rows describing two different facts (did this address
     answer, and is this really a Rishi Valley person) that never appeared
     together, so neither could be read against the other. */
  const [verificationUsers, mail] = await Promise.all([
    prisma.user.findMany({
      where: { isBlocked: false },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        birdOverride: true,
        accountType: true,
        batchType: true,
        batchYear: true,
        verifyState: true,
        emailVerified: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    mailHealth(),
  ]);

  // Mail state for the unconfirmed only. Everyone confirmed is already
  // answered by their own row, so there is nothing to look up for them, and on
  // a healthy day that is almost the whole membership.
  const unconfirmedIds = verificationUsers.filter((u) => !u.emailVerified).map((u) => u.id);
  const verifyMail = unconfirmedIds.length
    ? await prisma.outboundEmail.findMany({
        where: { userId: { in: unconfirmedIds }, kind: "verify" },
        select: { userId: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  // First row wins: the list is newest-first, so this keeps the LATEST attempt
  // per person and ignores the history behind it.
  const latestMail = new Map<string, string>();
  for (const row of verifyMail) {
    if (row.userId && !latestMail.has(row.userId)) latestMail.set(row.userId, row.status);
  }

  const verificationRows: VerificationRow[] = verificationUsers.map((u) => {
    const status = latestMail.get(u.id);
    const emailState: EmailState = u.emailVerified
      ? "confirmed"
      : status === "sent"
        ? "waiting"
        : status === "queued" || status === "sending"
          ? "queued"
          : status === "failed"
            ? "failed"
            : "none";
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      photoUrl: u.photoUrl,
      birdOverride: u.birdOverride,
      accountType: u.accountType,
      batchType: u.batchType,
      batchYear: u.batchYear,
      verifyState: u.verifyState,
      emailState,
      confirmedAt: u.emailVerified ? u.emailVerified.toISOString() : null,
    };
  });

  const emailPending = verificationRows.filter((r) => r.emailState !== "confirmed").length;

  // Member <-> admin conversations. Unanswered first, then by recency, so the
  // queue reads top-down. Capped at 40 threads (with their messages) to keep
  // this one page query honest as the archive grows.
  const messageThreads = await prisma.adminThread.findMany({
    orderBy: [{ adminUnread: "desc" }, { lastMessageAt: "desc" }],
    take: 40,
    select: {
      id: true,
      subject: true,
      kind: true,
      status: true,
      adminUnread: true,
      lastMessageAt: true,
      member: { select: { id: true, name: true, photoUrl: true, birdOverride: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          imageUrl: true,
          fromAdmin: true,
          createdAt: true,
          author: { select: { id: true, name: true, photoUrl: true, birdOverride: true } },
        },
      },
    },
  });
  const unansweredMessages = messageThreads.filter((t) => t.adminUnread).length;

  const reports = await prisma.report.findMany({
    where: { status: "pending" },
    include: {
      reporter: { select: { name: true } },
      post: {
        select: {
          id: true,
          content: true,
          author: { select: { name: true } },
        },
      },
      reportedUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Short labels: each one now has a sixth of the width rather than a quarter,
  // and "Total" said nothing that the number beside it did not.
  const stats = [
    { label: "Members", value: totalUsers, icon: Users },
    { label: "Posts", value: totalPosts, icon: FileText },
    { label: "New this week", value: newSignups, icon: UserPlus },
    { label: "Awaiting reply", value: unansweredMessages, icon: Mail },
    { label: "Reports", value: pendingReports, icon: AlertTriangle },
    { label: "Photos", value: pendingPhotos.length, icon: Images },
  ];

  return (
    // space-y-5, not space-y-8: five sections down one page were paying 32px
    // each to be told apart, on a surface whose whole problem was scrolling.
    <div className="space-y-5">
      <PageHeader
        title="Admin Panel"
        actions={showTour ? <TakeTourAgainButton /> : undefined}
      />

      <AdminStats stats={stats} />

      {/* Messages from members (the in-app replacement for the old Tally form) */}
      <AdminSection
        id="messages"
        label="Messages"
        count={unansweredMessages > 0 ? unansweredMessages : undefined}
      >
        <MessageQueue
          initialOpenId={openThreadId}
          threads={messageThreads.map((t) => ({
            id: t.id,
            subject: t.subject,
            kind: t.kind,
            status: t.status,
            adminUnread: t.adminUnread,
            lastMessageAt: t.lastMessageAt.toISOString(),
            member: t.member,
            messages: t.messages.map((m) => ({
              ...m,
              createdAt: m.createdAt.toISOString(),
            })),
          }))}
        />
      </AdminSection>

      {/* Reported Posts */}
      <AdminSection label="Reported posts" count={pendingReports}>
        <ReportManagement
          reports={reports.map((r) => ({
            id: r.id,
            reason: r.reason,
            createdAt: r.createdAt.toISOString(),
            reporterName: r.reporter.name,
            targetType: r.targetType,
            postId: r.post?.id ?? null,
            postContent: r.post ? r.post.content.slice(0, 200) : null,
            postAuthor: r.post?.author.name ?? null,
            reportedUserId: r.reportedUser?.id ?? null,
            reportedUserName: r.reportedUser?.name ?? null,
          }))}
        />
      </AdminSection>

      {/* Email and membership, side by side. Sits ABOVE the verification queue
          below it: this is the overview, that is the action list. */}
      <AdminSection
        label="Email & verification"
        count={emailPending > 0 ? emailPending : undefined}
      >
        <VerificationOverview rows={verificationRows} mail={mail} />
      </AdminSection>

      {/* Verification queue */}
      <AdminSection label="Verification" count={pendingVerification.length}>
        <VerificationQueue users={pendingVerification} />
      </AdminSection>

      {/* Photo queue */}
      <AdminSection label="Photos to review" count={pendingPhotos.length}>
        <PhotoQueue
          photos={pendingPhotos.map((p) => ({
            id: p.id,
            thumbUrl: p.thumbUrl,
            caption: p.caption,
            subject: p.subject ? p.subject.split(",").filter(Boolean) : [],
            area: p.area,
            era: p.era,
            freeTags: p.freeTags
              ? p.freeTags.split(",").map((t) => t.trim()).filter(Boolean)
              : [],
            uploaderName: p.uploader.name,
            createdAt: p.createdAt.toISOString(),
          }))}
        />
      </AdminSection>

      {/* User Management */}
      <AdminSection label="Users" count={users.length}>
        <UserManagement
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            batchType: u.batchType,
            batchYear: u.batchYear,
            role: u.role,
            isBlocked: u.isBlocked,
            createdAt: u.createdAt.toISOString(),
          }))}
        />
      </AdminSection>
    </div>
  );
}
