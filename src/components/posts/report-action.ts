"use server";

import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { requireVerifiedMember } from "@/lib/member-gate";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { previewOf } from "@/lib/admin-threads";
import { notifyAdmins, isThreadRateLimited } from "@/lib/admin-threads-server";
import { writeAudit } from "@/lib/audit";
import { adminThreadLink } from "@/lib/notification-links";
import { canViewPost, POST_NOT_VISIBLE } from "@/lib/post-visibility";

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
  db,
  reportId,
  reporterId,
  subject,
  opening,
}: {
  /* The client to write through: the caller's transaction where there is one,
     so the Report row and the thread that answers it land together (audit
     C-007). Before this they were separate awaits, and a pool timeout between
     them left a pending Report with no thread and no admin notification --
     which the dedupe below then treated as "already reported", returning
     success on every retry for ever. */
  db: Prisma.TransactionClient | typeof prisma;
  reportId: string;
  reporterId: string;
  subject: string;
  opening: string;
}) {
  const thread = await db.adminThread.create({
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

  await db.notification.create({
    data: {
      userId: reporterId,
      type: "report_update",
      message: `We've got your report. ${subject}`,
      link: `/messages/${thread.id}`,
    },
  });

  return thread;
}

/**
 * The gates both report paths open with, and the reason they carry.
 *
 * The file already argued for keeping the two paths the same shape: "half
 * fixing one of a matched pair is how this codebase has drifted before". A
 * shared preamble is that argument taken seriously -- the pairing becomes
 * structural instead of visual, and the two pins that used to COUNT these
 * checks (profile-editor-rule's two `typeof reason` guards, C-013's two 500s)
 * now check the one place they live.
 *
 * `auth()` and the demo refusal deliberately stay at each call site: reportUser
 * has to refuse a self-report between them and these gates, and moving that
 * would let a self-report spend a rate-limit token on its way to being
 * refused. Keeping `await auth()` in the exported bodies is also what
 * gate-coverage.test.mjs looks for.
 */
async function vetReport(
  userId: string,
  reason: string
): Promise<{ ok: true; trimmed: string } | { ok: false; error: string }> {
  // A report summons a moderator and creates work with a member's name in it,
  // which is exactly the lever an abusive signup wants (trust model, Stage 2).
  // Doubly so for reportUser: it used to strip the reported member's verified
  // badge, so an unvetted account could take standing AWAY from a vetted one
  // (audit H5).
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { ok: false, error: gate.error };

  // Report flooding is paging a human on demand, so it is metered (audit M2).
  const limited = await rateLimit("reports", userId);
  if (!limited.ok) return { ok: false, error: limited.error };

  // A report opens an AdminThread, so it also answers to the same new-thread
  // budget a member's own messages do (audit H5): reporting must not be a way
  // to fan out threads faster than messaging is allowed to.
  if (await isThreadRateLimited(userId)) {
    return { ok: false, error: "That's a lot of reports at once. Give it an hour and send the rest." };
  }

  /* `reason` is typed a string and that type is erased at runtime: a crafted
     call past the verified-member and rate-limit gates could send a number,
     and `(5).trim()` threw a 500 digest instead of a refusal (audit C-174). */
  if (typeof reason !== "string") return { ok: false, error: "Please provide a valid reason" };
  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 500) {
    return { ok: false, error: "Please provide a valid reason" };
  }

  return { ok: true, trimmed };
}

/**
 * The Report row and the thread that answers it, in ONE transaction (audit
 * C-007), and the lost race that means the same thing.
 *
 * Both were four separate awaits once, so a pool timeout after the first left
 * a pending Report with no thread and no admin notification -- which the
 * dedupe in each caller then honoured for ever, returning success on every
 * retry. The fix was made twice, in twenty-three near-identical lines each,
 * with a comment in `reportUser` promising the two matched. That promise is
 * this function now: the two report paths are kept the same shape on purpose,
 * because half-fixing one of a matched pair is how this file's other entries
 * came to exist.
 *
 * "duplicate" rather than a throw, because losing the race is not a failure:
 * the `findFirst` each caller runs first is a fast path, not the guarantee --
 * under READ COMMITTED two submissions landing together both see no open
 * report and both write, and the partial unique index
 * (`Report_open_post_per_reporter_key`) decides it. The loser has the outcome
 * it wanted, which is one open report on the desk. What that reads as to the
 * member differs by path -- "already reported" or "already flagged" -- so the
 * wording stays at the call site.
 */
async function fileReport(
  /* The five columns a report IS, not the whole create input. A bare
     `ReportUncheckedCreateInput` would also accept `status` -- so a third
     caller could file a report already marked resolved, past the admin, and
     `tsc` would agree. Both callers today build this literal by hand from
     validated values; the narrower type is what keeps that true. */
  data: Pick<
    Prisma.ReportUncheckedCreateInput,
    "targetType" | "postId" | "reportedUserId" | "reporterId" | "reason"
  >,
  thread: { subject: string; opening: string }
): Promise<{ id: string } | "duplicate"> {
  try {
    return await prisma.$transaction(async (tx) => {
      const report = await tx.report.create({ data, select: { id: true } });
      return openReportThread({
        db: tx,
        reportId: report.id,
        reporterId: data.reporterId,
        subject: thread.subject,
        opening: thread.opening,
      });
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    return "duplicate";
  }
}

export async function reportPost(postId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "Reporting summons a real moderator, so the demo leaves it switched off." };

  const vetted = await vetReport(session.user.id, reason);
  if (!vetted.ok) return { error: vetted.error };
  const { trimmed } = vetted;

  /* You cannot report a post you were never allowed to see (audit H3, this
     one found by bug-report-2 C-194). This action reads the author's name off
     the row and prints it into the thread it opens ("A post by X"), so
     without the guard a member could learn who wrote any private-group,
     city-scoped or batch-targeted post from its id alone -- and post ids are
     handed out in deep links and cursors. */
  const visible = await canViewPost(postId, session.user);
  if (!visible.ok) return { error: POST_NOT_VISIBLE };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, author: { select: { name: true } } },
  });
  if (!post) return { error: "That post is already gone" };

  /* One open report per person per post (audit M29).
   *
   * `Report` carries a unique on (reporterId, reportedUserId) for exactly this
   * reason, but a POST report leaves reportedUserId NULL and Postgres treats
   * NULLs as distinct, so that index constrains member-to-member reports and
   * nothing else. Reporting the same post twice therefore filed a second
   * report, opened a SECOND admin thread about it, and notified the admins
   * again -- so a member repeating themselves, or double-clicking, made the
   * same complaint look like a pattern of them.
   *
   * Enforced here rather than by a second unique index because there are
   * already duplicate rows in the live table from before this rule existed,
   * and adding the constraint would mean deleting moderation records to make
   * room for it. History stays; the behaviour stops.
   *
   * Only PENDING reports count. Once an admin has dismissed or acted on one,
   * the post going wrong again is genuinely new information. */
  const subject = `A post by ${post.author.name}`;
  const opening = `You reported a post by ${post.author.name}, saying: "${trimmed}"\n\nAn admin will read it. Anything you want to add, write it below.`;

  const openAlready = await prisma.report.findFirst({
    where: {
      reporterId: session.user.id,
      postId,
      targetType: "post",
      status: "pending",
    },
    select: { id: true, thread: { select: { id: true } } },
  });
  if (openAlready) {
    /* A pending report with NO thread is one that failed halfway before the
       write became atomic (audit C-007). This branch used to select the thread
       id and ignore that it was null, so every retry answered "already
       reported" and the complaint sat on nobody's desk for ever. Repair it
       rather than report success over it. */
    if (!openAlready.thread) {
      await openReportThread({
        db: prisma,
        reportId: openAlready.id,
        reporterId: session.user.id,
        subject,
        opening,
      });
    }
    // Success, not an error: they did the thing they meant to do, and it is
    // already on the moderator's desk. Saying "you already reported this"
    // as a failure would read as the report not having worked.
    return { success: true as const, alreadyReported: true as const };
  }

  const filed = await fileReport(
    { targetType: "post", postId, reporterId: session.user.id, reason: trimmed },
    { subject, opening }
  );
  // Losing the race to the partial unique index reads to the reporter exactly
  // as the findFirst above does: their complaint is on the desk (audit C-060).
  if (filed === "duplicate") {
    return { success: true as const, alreadyReported: true as const };
  }
  const thread = filed;

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

  const vetted = await vetReport(session.user.id, reason);
  if (!vetted.ok) return { error: vetted.error };
  const { trimmed } = vetted;

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

  const subject = `${reported.name}'s profile`;
  const opening = `You flagged ${reported.name}, saying: "${trimmed}"\n\nAn admin will look into it. Anything you want to add, write it below.`;

  const filed = await fileReport(
    { targetType: "user", reportedUserId, reporterId: session.user.id, reason: trimmed },
    { subject, opening }
  );
  // Two flags of the same pair racing in together both pass the findFirst
  // above and one loses to the @@unique (audit H5). That is the SAME "already
  // flagged" answer the fast path gives, not a 500.
  if (filed === "duplicate") {
    return { success: true, alreadyFlagged: true };
  }
  const thread = filed;

  /* This used to also write verifyState:"flagged" onto the reported member --
     one report, from anyone, and the badge was gone (audit H5). Now that
     verifyState is a capability rather than a decoration, that write would
     have let one report strip a member's ability to post and see contacts.
     The report row and the admin notification below ARE the flag; standing
     changes only by an admin's hand (Phase 7 adds the threshold rule). */

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
