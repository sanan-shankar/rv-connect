"use server";

import { requireAdminAction, requireAdminActor, type AdminActionResult } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { noteOnReportThread } from "@/lib/admin-threads-server";
import { purgeUserAccount } from "@/lib/account-purge";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/* The guard and the result shape moved to src/lib/admin.ts on 2026-08-19, when
   the admin rebuild added a second and third file of these actions. One copy,
   so the check and its error copy cannot drift across three files. */
const requireAdmin = requireAdminAction;

export async function adminBlockUser(userId: string, block: boolean): Promise<AdminActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  await prisma.user.update({
    where: { id: userId },
    data: {
      isBlocked: block,
      /* Blocking has to reach the sessions the person is already holding, not
         just the next sign-in. Sessions are JWTs with no server-side store, so
         bumping the epoch is the only way to end one (audit H4): without it a
         blocked member kept a valid 30-day token and carried on posting.
         Bumped on UNBLOCK as well -- cheap, and it means an accidental block
         and unblock leaves no token minted during the gap still floating. */
      credentialVersion: { increment: 1 },
    },
  });

  await writeAudit({
    actorId: actor.actorId,
    action: block ? "admin.block" : "admin.unblock",
    targetType: "user",
    targetId: userId,
    ip: actor.ip,
  });

  revalidatePath(`/profile/${userId}`);
  return { success: true };
}

export async function adminDeleteUser(userId: string): Promise<AdminActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  // Capture a little context BEFORE the row is gone, so the audit entry is
  // still readable once the account it names no longer exists.
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  // The row delete, the RESTRICT-FK report clearing (audit H8) and the R2
  // object cleanup (audit H9) all live in purgeUserAccount, shared with the
  // retention sweep's grace-period purge — one definition of "gone".
  const purged = await purgeUserAccount(userId);
  if (!purged.ok) {
    return { error: "Could not delete this user. Check the server log." };
  }

  await writeAudit({
    actorId: actor.actorId,
    action: "admin.delete",
    targetType: "user",
    targetId: userId,
    ip: actor.ip,
    detail: target
      ? `${target.name} <${target.email}> — ${purged.imagesDeleted} stored image(s) removed` +
        (purged.imagesFailed > 0 ? `, ${purged.imagesFailed} still queued` : "") +
        (purged.groupsRehomed > 0 ? `, ${purged.groupsRehomed} group(s) handed on` : "")
      : undefined,
  });

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
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  await prisma.user.update({
    where: { id: userId },
    data: {
      verifyState: "verified",
      verifyMethod: method,
      verifiedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: actor.actorId,
    action: "admin.verify",
    targetType: "user",
    targetId: userId,
    ip: actor.ip,
    detail: method,
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
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  await prisma.user.update({
    where: { id: userId },
    data: { verifyState: "unverified", verifyMethod: null, verifiedAt: null },
  });

  await writeAudit({
    actorId: actor.actorId,
    action: "admin.unverify",
    targetType: "user",
    targetId: userId,
    ip: actor.ip,
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
