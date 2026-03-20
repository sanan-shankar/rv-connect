"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function adminBlockUser(userId: string, block: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isBlocked: block },
  });

  revalidatePath(`/profile/${userId}`);
  return { success: true };
}

export async function adminDeleteUser(userId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/directory");
  return { success: true };
}

export async function adminUpdateNote(userId: string, note: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { adminNote: note || null },
  });

  return { success: true };
}

export async function adminHidePost(postId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  await prisma.post.update({
    where: { id: postId },
    data: { isHidden: true },
  });

  revalidatePath("/feed");
  revalidatePath("/admin");
  return { success: true };
}

export async function adminDismissReport(reportId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status: "dismissed" },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function adminResolveReport(reportId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status: "reviewed" },
  });

  revalidatePath("/admin");
  return { success: true };
}
