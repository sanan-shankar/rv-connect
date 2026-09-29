import { prisma } from "@/lib/prisma";
import { IS_DEMO } from "@/lib/demo";

/**
 * The audit log's one writer (audit H10 / H14 / M36). Every accountability
 * event goes through here: admin actions, deletions, verification and role
 * changes, reports. Sign-ins are NOT among them -- they are recorded by
 * `recordLoginAttempt` into LoginAttempt, and a session that logged them here
 * too would double-log.
 *
 * The dotted actions, so a reader (and the /admin/audit view) can group them:
 *   admin.block  admin.unblock  admin.delete  admin.role  admin.verify
 *   admin.unverify  admin.merge
 *   account.delete_request  account.delete_cancel  account.purge  account.export
 *   account.email_change
 *   report.user  report.post
 *   retention.sweep
 *
 * ("account.delete" was the pre-grace-period self-deletion event, and
 * "signin.success"/"signin.fail" were Phase 7 sign-in events superseded by
 * LoginAttempt; nothing writes any of them now, but old rows may still carry
 * them. The view renders whatever string a row holds, so they still display.)
 */
export type AuditAction =
  | "admin.block"
  | "admin.unblock"
  | "admin.delete"
  | "admin.role"
  | "admin.verify"
  | "admin.unverify"
  | "admin.merge"
  | "account.delete_request"
  | "account.delete_cancel"
  | "account.purge"
  | "account.export"
  /* A member moved their unconfirmed account to another address because the
     first would not take mail (change-email-actions.ts). It changes what they
     sign in with, so it is on the record, with both addresses masked. */
  | "account.email_change"
  | "report.user"
  | "report.post"
  | "retention.sweep"
  /* A webhook POST we could not authenticate. Written at most once an hour
     (see the route): the endpoint is public and unauthenticated by necessity,
     so an unbounded row per rejection would be a table-filling vector. */
  | "razorpay.webhook_rejected"
  /* A gift that came back out: refunded, or charged back after a dispute. The
     one event that moves a money total downwards after the fact. */
  | "razorpay.contribution_reversed"
  /* ...and the other way: a chargeback the owner won, so money that had been
     un-counted counts again. The only event that moves a money total UPWARDS
     after the fact (bug-report-2 C-086). */
  | "razorpay.dispute_resolved";

/**
 * Record one event. NEVER throws and never blocks the caller's real work: an
 * audit write failing must not turn a successful block, delete or sign-in into
 * an error page (the same contract touchLastSeen keeps). Development logs the
 * failure, because a guard that hides its own breakage is worse than none.
 *
 * The demo writes nothing: its accounts are throwaway and its Prisma extension
 * would deny an AuditLog write anyway, so short-circuit rather than log noise.
 */
export async function writeAudit(entry: {
  actorId?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string | null;
  ip?: string | null;
  detail?: string | null;
}): Promise<void> {
  if (IS_DEMO) return;
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        ip: entry.ip ?? null,
        detail: entry.detail ?? null,
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[audit] could not record", entry.action, err);
    }
  }
}
