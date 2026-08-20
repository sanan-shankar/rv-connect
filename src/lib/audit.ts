import { prisma } from "@/lib/prisma";
import { IS_DEMO } from "@/lib/demo";

/**
 * The audit log's one writer (audit H10 / H14 / M36). Every accountability
 * event goes through here: sign-ins, admin actions, deletions, verification
 * and role changes, reports.
 *
 * The dotted actions, so a reader (and the /admin/audit view) can group them:
 *   signin.success  signin.fail
 *   admin.block  admin.unblock  admin.delete  admin.role  admin.verify
 *   admin.unverify  admin.merge
 *   account.delete
 *   report.user  report.post
 */
export type AuditAction =
  | "signin.success"
  | "signin.fail"
  | "admin.block"
  | "admin.unblock"
  | "admin.delete"
  | "admin.role"
  | "admin.verify"
  | "admin.unverify"
  | "admin.merge"
  | "account.delete"
  | "report.user"
  | "report.post";

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
