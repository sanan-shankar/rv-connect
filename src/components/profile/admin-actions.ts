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

  try {
    // Report.reporterId is intentionally not a cascading relation (a filed
    // report should normally outlive the person who filed it), but that
    // means the FK is RESTRICT: deleting a user who has ever filed a report
    // throws and the whole delete rolls back silently. Clear their filed
    // reports first; reports filed against them already cascade.
    await prisma.report.deleteMany({ where: { reporterId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  } catch (err) {
    console.error("adminDeleteUser failed:", err);
    return { error: "Could not delete this user. Check the server log." };
  }

  revalidatePath("/directory");
  revalidatePath("/admin");
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

export async function adminVerifyUser(
  userId: string,
  method: "office_list" | "admin_manual" = "admin_manual"
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      verifyState: "verified",
      verifyMethod: method,
      verifiedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "admin",
      message: "You're verified. Your name now carries a small leaf to show you belong.",
      link: `/profile/${userId}`,
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/profile/${userId}`);
  return { success: true };
}

export async function adminUnverifyUser(userId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { verifyState: "unverified", verifyMethod: null, verifiedAt: null },
  });

  revalidatePath("/admin");
  revalidatePath(`/profile/${userId}`);
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
