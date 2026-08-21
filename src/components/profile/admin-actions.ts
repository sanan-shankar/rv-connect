"use server";

import {
  requireAdminAction,
  requireAdminActor,
  refuseSelfOrLastAdmin,
  type AdminActionResult,
} from "@/lib/admin";
import type { Prisma } from "@/generated/prisma/client";
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

  // Blocking is the one that traps: it lands on the very next request, and a
  // blocked account cannot sign in to undo it. Unblocking cannot lock anybody
  // out, so it goes straight through (bug audit B-023).
  const refused = block
    ? await refuseSelfOrLastAdmin(actor.actorId, userId, "block", (tx) =>
        blockWrite(tx, userId, block)
      )
    : await blockWrite(prisma, userId, block).then(() => null);
  if (refused) return refused;

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

async function blockWrite(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string,
  block: boolean
): Promise<void> {
  await db.user.update({
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
}

export async function adminDeleteUser(userId: string): Promise<AdminActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  // Capture a little context BEFORE the row is gone, so the audit entry is
  // still readable once the account it names no longer exists.
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true },
  });

  // The same two refusals blocking gets (B-023), asked BEFORE the purge rather
  // than inside it: purgeUserAccount runs its own transaction and reaches R2
  // afterwards, neither of which belongs inside a serializable retry. The read
  // is a hair racy against a simultaneous demotion elsewhere, which is the
  // right trade -- an admin count is not worth holding a purge open for.
  if (actor.actorId === userId) {
    return { error: "You cannot delete your own account from here. Use Settings." };
  }
  if (target?.role === "admin") {
    const others = await prisma.user.count({
      where: { role: "admin", isBlocked: false, id: { not: userId } },
    });
    if (others === 0) {
      return { error: "This is the only admin. Make somebody else one first." };
    }
  }

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

/**
 * Verify a member by hand.
 *
 * `method` defaults to "admin_manual" and both admin surfaces now let it,
 * because that is what actually happened. They used to pass "office_list"
 * explicitly, so a member an admin had checked themselves was recorded -- and
 * displayed on their own page -- as "Off the office list" (audit Low 6). Only
 * `tryRosterAutoVerifyQuietly`, which really does read the roster, writes
 * "office_list".
 */
export async function adminVerifyUser(
  userId: string,
  method: "office_list" | "admin_manual" = "admin_manual"
): Promise<AdminActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  /* A conditional update, so the notification below follows the TRANSITION
     rather than the click (audit Low 5). Verify had no in-flight guard in the
     People list and minted a notification unconditionally, so a double-press --
     or two admins clearing the queue together -- sent the member the same
     "You're verified" twice. The same shape `requestVerification` carries for
     the member's own side of this (Low 20). */
  const became = await prisma.user.updateMany({
    where: { id: userId, verifyState: { not: "verified" } },
    data: {
      verifyState: "verified",
      verifyStateAt: new Date(),
      verifyMethod: method,
      verifiedAt: new Date(),
    },
  });

  if (became.count === 0) {
    // Already verified. Nothing changed, so nothing is audited and nobody is
    // told; the caller still gets a success, because the state it asked for is
    // the state that holds.
    revalidatePath("/admin", "layout");
    revalidatePath(`/profile/${userId}`);
    return { success: true };
  }

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
    data: {
      verifyState: "unverified",
      verifyStateAt: new Date(),
      verifyMethod: null,
      verifiedAt: null,
    },
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

/**
 * Settle a report exactly once (bug audit M01).
 *
 * Both endings used a plain `update`, which has no precondition: two admins
 * working the queue at the same moment — or one double-click — wrote the status
 * twice, and each write dragged a note into the reporter's conversation and a
 * notification with it. The reporter could be told "we left it as it is" and
 * "we dealt with it" about the same flag, in whichever order the writes landed.
 *
 * `updateMany` with `status: "pending"` in the WHERE makes the transition the
 * decision: the first admin to settle it moves the row, everyone after sees a
 * count of 0 and stops before the note. The buttons are only ever rendered on
 * the pending list, so a count of 0 always means somebody else got there first
 * (or the same person clicked twice), never that the admin chose a settled row.
 */
async function settleReport(
  reportId: string,
  status: "dismissed" | "reviewed",
  note: string
): Promise<AdminActionResult> {
  const { count } = await prisma.report.updateMany({
    where: { id: reportId, status: "pending" },
    data: { status },
  });

  if (count === 0) {
    // Not a silent success: the admin pressed "Nothing wrong here" and the
    // report may now read "reviewed". Say so, and let the list refresh.
    return { error: "Another admin has already settled this report." };
  }

  // Close the loop with whoever filed it (see src/lib/admin-threads.ts).
  await noteOnReportThread(reportId, note);

  revalidatePath("/admin", "layout");
  return { success: true };
}

export async function adminDismissReport(reportId: string): Promise<AdminActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  return settleReport(
    reportId,
    "dismissed",
    "An admin read this and decided to leave it as it is. Thank you for flagging it anyway. If there's more to it, write back here."
  );
}

export async function adminResolveReport(reportId: string): Promise<AdminActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  return settleReport(
    reportId,
    "reviewed",
    "An admin looked at this and has dealt with it. Thank you for flagging it."
  );
}
