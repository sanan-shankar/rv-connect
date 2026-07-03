import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, AlertTriangle, UserPlus, Images } from "lucide-react";
import { UserManagement } from "@/components/admin/user-management";
import { ReportManagement } from "@/components/admin/report-management";
import { PhotoQueue } from "@/components/admin/photo-queue";
import { VerificationQueue } from "@/components/admin/verification-queue";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/feed");
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, totalPosts, newSignups, pendingReports, pendingPhotos] =
    await Promise.all([
      prisma.user.count({ where: { isBlocked: false } }),
      prisma.post.count(),
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

  const stats = [
    { label: "Total Alumni", value: totalUsers, icon: Users },
    { label: "Total Posts", value: totalPosts, icon: FileText },
    { label: "New This Week", value: newSignups, icon: UserPlus },
    { label: "Pending Reports", value: pendingReports, icon: AlertTriangle },
    { label: "Photos to Review", value: pendingPhotos.length, icon: Images },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="font-heading text-3xl font-bold text-foreground">
        Admin Panel
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-leaf/10 p-2">
                <stat.icon className="h-5 w-5 text-leaf" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reported Posts */}
      <section>
        <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
          Reported Posts ({pendingReports})
        </h2>
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
      </section>

      {/* Verification queue */}
      <section>
        <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
          Verification ({pendingVerification.length})
        </h2>
        <VerificationQueue users={pendingVerification} />
      </section>

      {/* Photo queue */}
      <section>
        <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
          Photos to Review ({pendingPhotos.length})
        </h2>
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
      </section>

      {/* User Management */}
      <section>
        <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
          Users ({users.length})
        </h2>
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
      </section>
    </div>
  );
}
