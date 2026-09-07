"use server";

import { requireAdminAction, type AdminActionResult } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { clearPostNotifications } from "@/lib/post-notifications";
import { noteOnReportThread } from "@/lib/admin-threads-server";
import { revalidatePath } from "next/cache";

/* ------------------------------------------------------------------ *
 *  What an admin does to a REPORT, and to the post a report is about.
 *
 *  These lived in src/components/profile/admin-actions.ts until
 *  2026-09-07, which is a folder about somebody's profile and had nothing
 *  to do with either. Their only caller was, and is, the reports queue
 *  beside this file.
 *
 *  Every one re-checks the role. The admin layout's guard covers
 *  navigation; a server action is its own entry point and is reachable by
 *  anyone who can POST to it.
 * ------------------------------------------------------------------ */

export async function adminHidePost(postId: string): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  const post = await prisma.post.update({
    where: { id: postId },
    data: { isHidden: true },
    select: { id: true, kind: true, authorId: true },
  });

  /* Same as adminRemovePost: a hidden post refuses everybody but its author
     and the admins, so every other member's bell rows about it now lead to a
     404 (C-054). The author's are kept -- they can still open it, and what
     they find there is the moderation notice. */
  await clearPostNotifications(post, { keepFor: post.authorId });

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
  const denied = await requireAdminAction();
  if (denied) return denied;

  return settleReport(
    reportId,
    "dismissed",
    "An admin read this and decided to leave it as it is. Thank you for flagging it anyway. If there's more to it, write back here."
  );
}

export async function adminResolveReport(reportId: string): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  return settleReport(
    reportId,
    "reviewed",
    "An admin looked at this and has dealt with it. Thank you for flagging it."
  );
}
