"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { previewOf } from "@/lib/admin-threads";
import { notifyAdmins } from "@/lib/admin-threads-server";

/**
 * Reporting a post or flagging a person opens a conversation the reporter can
 * follow (AdminThread, kind "report"), instead of the report vanishing into a
 * queue they never hear about again. The notification they get links straight
 * at that conversation, so tapping it lands on the thread rather than nowhere.
 */
async function openReportThread({
  reportId,
  reporterId,
  subject,
  opening,
}: {
  reportId: string;
  reporterId: string;
  subject: string;
  opening: string;
}) {
  const thread = await prisma.adminThread.create({
    data: {
      memberId: reporterId,
      kind: "report",
      subject,
      reportId,
      adminUnread: true,
      memberUnread: true,
      messages: {
        // authorId null marks a line the app wrote itself, not an admin.
        create: { authorId: null, fromAdmin: true, body: opening },
      },
    },
    select: { id: true },
  });

  await prisma.notification.create({
    data: {
      userId: reporterId,
      type: "report_update",
      message: `We've got your report. ${subject}`,
      link: `/messages/${thread.id}`,
    },
  });

  return thread;
}

export async function reportPost(postId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const trimmed = reason?.trim() ?? "";
  if (!trimmed || trimmed.length > 500) {
    return { error: "Please provide a valid reason" };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, author: { select: { name: true } } },
  });
  if (!post) return { error: "That post is already gone" };

  const report = await prisma.report.create({
    data: {
      targetType: "post",
      postId,
      reporterId: session.user.id,
      reason: trimmed,
    },
    select: { id: true },
  });

  const subject = `A post by ${post.author.name}`;
  const thread = await openReportThread({
    reportId: report.id,
    reporterId: session.user.id,
    subject,
    opening: `You reported a post by ${post.author.name}, saying: "${trimmed}"\n\nAn admin will read it. Anything you want to add, write it below.`,
  });

  await notifyAdmins(
    `${session.user.name} reported a post by ${post.author.name}: ${previewOf(trimmed, 60)}`,
    `/admin?thread=${thread.id}#messages`
  );

  return { success: true };
}

export async function reportUser(reportedUserId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (reportedUserId === session.user.id) return { error: "You can't flag yourself" };

  const trimmed = reason?.trim() ?? "";
  if (!trimmed || trimmed.length > 500) {
    return { error: "Please provide a valid reason" };
  }

  const reported = await prisma.user.findUnique({
    where: { id: reportedUserId },
    select: { id: true, name: true },
  });
  if (!reported) return { error: "We couldn't find that person" };

  const report = await prisma.report.create({
    data: {
      targetType: "user",
      reportedUserId,
      reporterId: session.user.id,
      reason: trimmed,
    },
    select: { id: true },
  });

  // An identity flag suppresses the verified marker until an admin reviews it.
  await prisma.user.update({
    where: { id: reportedUserId },
    data: { verifyState: "flagged" },
  });

  const subject = `${reported.name}'s profile`;
  const thread = await openReportThread({
    reportId: report.id,
    reporterId: session.user.id,
    subject,
    opening: `You flagged ${reported.name}, saying: "${trimmed}"\n\nAn admin will look into it. Anything you want to add, write it below.`,
  });

  await notifyAdmins(
    `${session.user.name} flagged ${reported.name}: ${previewOf(trimmed, 60)}`,
    `/admin?thread=${thread.id}#messages`
  );

  return { success: true };
}
