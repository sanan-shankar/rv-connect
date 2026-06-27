"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function reportPost(postId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  if (!reason || reason.length > 500) {
    return { error: "Please provide a valid reason" };
  }

  await prisma.report.create({
    data: {
      targetType: "post",
      postId,
      reporterId: session.user.id,
      reason,
    },
  });

  return { success: true };
}

export async function reportUser(reportedUserId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (reportedUserId === session.user.id) return { error: "You can't flag yourself" };

  if (!reason || reason.length > 500) {
    return { error: "Please provide a valid reason" };
  }

  await prisma.report.create({
    data: {
      targetType: "user",
      reportedUserId,
      reporterId: session.user.id,
      reason,
    },
  });

  // An identity flag suppresses the verified marker until an admin reviews it.
  await prisma.user.update({
    where: { id: reportedUserId },
    data: { verifyState: "flagged" },
  });

  return { success: true };
}
