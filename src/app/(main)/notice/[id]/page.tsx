import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatTimeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "A note from the admins",
};

/**
 * The dedicated landing page a Notification(type: "admin_note") links to
 * (see notifyAdminNote / adminRemovePost / adminRemoveComment / adminRemovePhoto).
 * Deliberately its own calm-but-warm page rather than the raw message inline
 * in the notification dropdown: a moderation note deserves room to read
 * clearly, without any shaming chrome (no red, no "violation" language).
 */
export default async function AdminNoticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true, type: true, message: true, read: true, createdAt: true },
  });

  // Only the notification's own recipient may open it -- never by anyone
  // else guessing an id, and never a notification of any other type.
  if (!notification || notification.userId !== session.user.id || notification.type !== "admin_note") {
    notFound();
  }

  if (!notification.read) {
    await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/feed"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to the feed
      </Link>

      <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className="flex items-center gap-3 bg-canopy px-6 py-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-white">
            <ShieldCheck size={20} weight="fill" />
          </span>
          <div>
            <p className="font-heading text-[17px] font-bold leading-tight text-white">
              A note from the Rishi Valley admins
            </p>
            <p className="text-[12.5px] text-white/75">{formatTimeAgo(new Date(notification.createdAt))}</p>
          </div>
        </div>

        <div className="p-6">
          <p className="whitespace-pre-wrap text-[15.5px] leading-[1.7] text-foreground">
            {notification.message}
          </p>

          <div className="mt-6 rounded-xl border border-border bg-paper/70 p-4 text-[13.5px] leading-relaxed text-muted-foreground">
            This is meant to help, not to embarrass -- a small ask so the space stays good for
            everyone. If anything here is unclear, you're welcome to reach out to an admin directly.
          </div>
        </div>
      </div>
    </div>
  );
}
