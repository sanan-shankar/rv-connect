"use server";

import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { requireVerifiedMember } from "@/lib/member-gate";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { previewOf } from "@/lib/admin-threads";
import { notifyAdmins, isThreadRateLimited } from "@/lib/admin-threads-server";
import { writeAudit } from "@/lib/audit";
import { adminThreadLink } from "@/lib/notification-links";

// How many DISTINCT members must flag one person before the admin notification
// escalates from "someone flagged X" to "N members have now flagged X" (audit
// H5). It changes nothing about the target's standing — only an admin's hand
// still does that — it just tells the admin when a flag is one voice or a
// chorus. Kept small for a community this size.
const FLAG_ESCALATION_THRESHOLD = 3;

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
  if (IS_DEMO) return { error: "Reporting summons a real moderator, so the demo leaves it switched off." };

  // A report summons a moderator and creates work with a member's name in it,
  // which is exactly the lever an abusive signup wants (trust model, Stage 2).
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  // Report flooding is paging a human on demand, so it is metered (audit M2).
  const limited = await rateLimit("reports", session.user.id);
  if (!limited.ok) return { error: limited.error };

  // A report opens an AdminThread, so it also answers to the same new-thread
  // budget a member's own messages do (audit H5): reporting must not be a way
  // to fan out threads faster than messaging is allowed to.
  if (await isThreadRateLimited(session.user.id)) {
    return { error: "That's a lot of reports at once. Give it an hour and send the rest." };
  }

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
    adminThreadLink(thread.id)
  );

  await writeAudit({
    actorId: session.user.id,
    action: "report.post",
    targetType: "post",
    targetId: postId,
  });

  return { success: true };
}

export async function reportUser(reportedUserId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "Reporting summons a real moderator, so the demo leaves it switched off." };
  if (reportedUserId === session.user.id) return { error: "You can't flag yourself" };

  // Same tier as reportPost, and doubly so here: this action used to strip
  // the reported member's verified badge, so an unvetted account could take
  // standing AWAY from a vetted one (audit H5).
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  // Same meter as reportPost, same reason (audit M2).
  const limited = await rateLimit("reports", session.user.id);
  if (!limited.ok) return { error: limited.error };

  // Also the new-thread budget, same as reportPost (audit H5).
  if (await isThreadRateLimited(session.user.id)) {
    return { error: "That's a lot of reports at once. Give it an hour and send the rest." };
  }

  const trimmed = reason?.trim() ?? "";
  if (!trimmed || trimmed.length > 500) {
    return { error: "Please provide a valid reason" };
  }

  const reported = await prisma.user.findUnique({
    where: { id: reportedUserId },
    select: { id: true, name: true },
  });
  if (!reported) return { error: "We couldn't find that person" };

  // One report per (reporter, reported member): a member cannot inflate the
  // flag count by reporting the same person again (audit H5, enforced by the
  // @@unique on Report). Answered gently rather than as an error — from the
  // reporter's side "we've already got your flag" is the honest result, and it
  // must NOT open a second thread or re-page the admins.
  const already = await prisma.report.findFirst({
    where: { reporterId: session.user.id, reportedUserId, targetType: "user" },
    select: { id: true },
  });
  if (already) {
    return { success: true, alreadyFlagged: true };
  }

  let report: { id: string };
  try {
    report = await prisma.report.create({
      data: {
        targetType: "user",
        reportedUserId,
        reporterId: session.user.id,
        reason: trimmed,
      },
      select: { id: true },
    });
  } catch (err) {
    // The findFirst above is a fast path, not the guarantee — two flags of the
    // same pair racing in together both pass it, and one loses to the unique
    // index (audit H5). That is the SAME "already flagged" answer, not a 500.
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { success: true, alreadyFlagged: true };
    }
    throw err;
  }

  /* This used to also write verifyState:"flagged" onto the reported member --
     one report, from anyone, and the badge was gone (audit H5). Now that
     verifyState is a capability rather than a decoration, that write would
     have let one report strip a member's ability to post and see contacts.
     The report row and the admin notification below ARE the flag; standing
     changes only by an admin's hand (Phase 7 adds the threshold rule). */

  const subject = `${reported.name}'s profile`;
  const thread = await openReportThread({
    reportId: report.id,
    reporterId: session.user.id,
    subject,
    opening: `You flagged ${reported.name}, saying: "${trimmed}"\n\nAn admin will look into it. Anything you want to add, write it below.`,
  });

  // How many DISTINCT members have now flagged this person (this reporter is a
  // new distinct one, since the dedup above just let them through). At or past
  // the threshold the admin hears a chorus, not a single voice — the standing
  // still changes only by the admin's hand, per Phase 3's decision to make
  // verifyState a capability rather than a badge one report could strip.
  const distinctReporters = await prisma.report.groupBy({
    by: ["reporterId"],
    where: { reportedUserId, targetType: "user" },
  });
  const flagCount = distinctReporters.length;

  await notifyAdmins(
    flagCount >= FLAG_ESCALATION_THRESHOLD
      ? `${reported.name} has now been flagged by ${flagCount} members. Latest, ${session.user.name}: ${previewOf(trimmed, 60)}`
      : `${session.user.name} flagged ${reported.name}: ${previewOf(trimmed, 60)}`,
    adminThreadLink(thread.id)
  );

  await writeAudit({
    actorId: session.user.id,
    action: "report.user",
    targetType: "user",
    targetId: reportedUserId,
    detail: `distinct flaggers: ${flagCount}`,
  });

  return { success: true };
}
