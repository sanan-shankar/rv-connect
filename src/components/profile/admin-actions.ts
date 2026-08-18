"use server";

import { requireAdminAction, type AdminActionResult } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { noteOnReportThread } from "@/lib/admin-threads-server";
import { revalidatePath } from "next/cache";

/* The guard and the result shape moved to src/lib/admin.ts on 2026-08-19, when
   the admin rebuild added a second and third file of these actions. One copy,
   so the check and its error copy cannot drift across three files. */
const requireAdmin = requireAdminAction;

export async function adminBlockUser(userId: string, block: boolean): Promise<AdminActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  await prisma.user.update({
    where: { id: userId },
    data: { isBlocked: block },
  });

  revalidatePath(`/profile/${userId}`);
  return { success: true };
}

export async function adminDeleteUser(userId: string): Promise<AdminActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

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
  revalidatePath("/admin", "layout");
  return { success: true };
}

export async function adminUpdateNote(userId: string, note: string): Promise<AdminActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  await prisma.user.update({
    where: { id: userId },
    data: { adminNote: note || null },
  });

  return { success: true };
}

export async function adminVerifyUser(
  userId: string,
  method: "office_list" | "admin_manual" = "admin_manual"
): Promise<AdminActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

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

  revalidatePath("/admin", "layout");
  revalidatePath(`/profile/${userId}`);
  return { success: true };
}

export async function adminUnverifyUser(userId: string): Promise<AdminActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  await prisma.user.update({
    where: { id: userId },
    data: { verifyState: "unverified", verifyMethod: null, verifiedAt: null },
  });

  revalidatePath("/admin", "layout");
  revalidatePath(`/profile/${userId}`);
  return { success: true };
}

export async function adminHidePost(postId: string): Promise<AdminActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  await prisma.post.update({
    where: { id: postId },
    data: { isHidden: true },
  });

  revalidatePath("/feed");
  revalidatePath("/admin", "layout");
  return { success: true };
}

export async function adminDismissReport(reportId: string): Promise<AdminActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  await prisma.report.update({
    where: { id: reportId },
    data: { status: "dismissed" },
  });

  // Close the loop with whoever filed it (see src/lib/admin-threads.ts).
  await noteOnReportThread(
    reportId,
    "An admin read this and decided to leave it as it is. Thank you for flagging it anyway. If there's more to it, write back here."
  );

  revalidatePath("/admin", "layout");
  return { success: true };
}

export async function adminResolveReport(reportId: string): Promise<AdminActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  await prisma.report.update({
    where: { id: reportId },
    data: { status: "reviewed" },
  });

  await noteOnReportThread(
    reportId,
    "An admin looked at this and has dealt with it. Thank you for flagging it."
  );

  revalidatePath("/admin", "layout");
  return { success: true };
}
