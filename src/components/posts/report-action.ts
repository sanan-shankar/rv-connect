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
      postId,
      reporterId: session.user.id,
      reason,
    },
  });

  return { success: true };
}
