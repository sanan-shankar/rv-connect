import { prisma } from "./prisma";
import { writeAudit } from "./audit";
import { purgeUserAccount, drainPendingImagePurges, DELETION_GRACE_DAYS } from "./account-purge";

/**
 * The retention sweep (audit M34, GDPR Art. 5(1)(e)): personal data stops
 * accumulating forever. Every window below is the owner's decision, recorded
 * 2026-08-19 in docs/SECURITY.md (retention table), not a default anyone reached
 * for — change them there first, here second.
 *
 * Run nightly by .github/workflows/retention.yml calling
 * /api/retention/sweep with CRON_SECRET (GitHub Actions rather than a Vercel
 * cron, because the Hobby plan's two cron slots are already spent on the
 * Catch-up tick and the demo reset). Every step is a hard-cutoff deleteMany,
 * so a missed night simply means tomorrow's sweep deletes two days' worth:
 * idempotent, and safe to run twice.
 */

const DAY_MS = 86_400_000;

/** Accounts purged per nightly pass. See the comment at its use site. */
const PURGE_BATCH = 10;
const cutoff = (days: number) => new Date(Date.now() - days * DAY_MS);

/** Owner's schedule. Days, not "2y", so the cutoff arithmetic stays exact. */
const KEEP_DAYS = {
  /** Conversations with the admin: 2 years. Long enough that "as we discussed
   *  last year" still has its receipts; not a permanent transcript. */
  adminMessages: 730,
  /** Reports: 3 years. Moderation history outlives the messages because a
   *  pattern of being reported is the thing it exists to show. */
  reports: 1095,
  /** Payment records: 10 years, the outer bound of tax-record obligations. */
  contributions: 3650,
  /** Notifications: 1 year. Purely transient by design. */
  notifications: 365,
  /** LoginAttempt and AuditLog: 1 year. Enough to investigate any incident
   *  someone actually notices; not a permanent behavioural record. */
  securityLogs: 365,
  /** OutboundEmail: 180 days. The rows hold recipient addresses, and a
   *  delivery question older than six months has never once come up. */
  sentEmailLog: 180,
} as const;

export type SweepResult = {
  adminMessages: number;
  reports: number;
  contributions: number;
  notifications: number;
  loginAttempts: number;
  auditLogs: number;
  outboundEmails: number;
  accountsPurged: number;
  /** Stored images an earlier purge could not remove, cleared on this pass. */
  imagesRetried: number;
  /** ...and how many R2 still refuses. A number that only ever grows is the
   *  signal that credentials or the bucket name have drifted. */
  imagesStillPending: number;
  errors: string[];
};

/**
 * One pass over everything with an expiry. Each step survives the others
 * failing — a bad night for one table must not leave every other table
 * growing — and the pass ends with its own audit entry, so "is retention
 * actually running" is answerable from /admin/audit rather than by asking
 * GitHub.
 */
export async function runRetentionSweep(): Promise<SweepResult> {
  const errors: string[] = [];
  const step = async (name: string, fn: () => Promise<number>): Promise<number> => {
    try {
      return await fn();
    } catch (err) {
      console.error(`[retention] ${name} failed:`, err);
      errors.push(name);
      return 0;
    }
  };

  const adminMessages = await step("adminMessages", async () =>
    (await prisma.adminMessage.deleteMany({
      where: { createdAt: { lt: cutoff(KEEP_DAYS.adminMessages) } },
    })).count,
  );
  const reports = await step("reports", async () =>
    (await prisma.report.deleteMany({
      where: { createdAt: { lt: cutoff(KEEP_DAYS.reports) } },
    })).count,
  );
  const contributions = await step("contributions", async () =>
    (await prisma.contribution.deleteMany({
      where: { createdAt: { lt: cutoff(KEEP_DAYS.contributions) } },
    })).count,
  );
  const notifications = await step("notifications", async () =>
    (await prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff(KEEP_DAYS.notifications) } },
    })).count,
  );
  const loginAttempts = await step("loginAttempts", async () =>
    (await prisma.loginAttempt.deleteMany({
      where: { createdAt: { lt: cutoff(KEEP_DAYS.securityLogs) } },
    })).count,
  );
  const auditLogs = await step("auditLogs", async () =>
    (await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff(KEEP_DAYS.securityLogs) } },
    })).count,
  );
  const outboundEmails = await step("outboundEmails", async () =>
    (await prisma.outboundEmail.deleteMany({
      where: { createdAt: { lt: cutoff(KEEP_DAYS.sentEmailLog) } },
    })).count,
  );

  /* The deletion-request purge (audits H9 + M35): accounts whose 60-day
     grace window has closed are erased for real — rows and R2 bytes both,
     via the same purgeUserAccount an admin delete uses. Context for the
     audit entry is captured first, because afterwards nothing remembers who
     the id belonged to. */
  let accountsPurged = 0;
  const due = await step("accountsPurged:list", async () => {
    const rows = await prisma.user.findMany({
      where: { deletionRequestedAt: { lt: cutoff(DELETION_GRACE_DAYS) } },
      select: { id: true, name: true, email: true, deletionRequestedAt: true },
      orderBy: { deletionRequestedAt: "asc" },
      // Capped, because this is the one step whose cost is unbounded: each
      // purge is its own transaction with a 30s ceiling, run one at a time, all
      // inside a single serverless invocation that has a platform duration
      // limit. Uncapped, a night with a dozen due accounts gets killed
      // mid-loop and the GitHub Actions job fails loudly for something that is
      // working. Oldest first, and the remainder rolls to tomorrow BY DESIGN --
      // the sweep is idempotent, so a backlog drains a batch a night rather
      // than taking the whole run down with it (bug audit, Low 64).
      take: PURGE_BATCH,
    });
    for (const row of rows) {
      const purged = await purgeUserAccount(row.id);
      if (!purged.ok) {
        errors.push(`purge:${row.id}`);
        continue;
      }
      accountsPurged += 1;
      await writeAudit({
        actorId: null,
        action: "account.purge",
        targetType: "user",
        targetId: row.id,
        detail:
          `${row.name} <${row.email}> — requested ${row.deletionRequestedAt?.toISOString().slice(0, 10)}, ` +
          `${purged.imagesDeleted} stored image(s) removed` +
          (purged.imagesFailed > 0 ? `, ${purged.imagesFailed} still queued` : "") +
          (purged.groupsRehomed > 0 ? `, ${purged.groupsRehomed} group(s) handed on` : ""),
      });
    }
    return rows.length;
  });
  // A full batch means there is more waiting; the next sweep takes the rest.
  if (due >= PURGE_BATCH) {
    console.info(`[retention] purge batch full (${due}); more accounts are due tomorrow`);
  }

  /* Anything an earlier purge could not remove from R2 (a bad minute, a
     timeout, a crash between the row delete and the object delete) waits in
     PendingImagePurge. This is the retry: the one path that can still find
     those bytes, because the rows that named them are long gone (B-011). */
  let imagesRetried = 0;
  let imagesStillPending = 0;
  await step("pendingImages", async () => {
    const drained = await drainPendingImagePurges();
    imagesRetried = drained.deleted;
    imagesStillPending = await prisma.pendingImagePurge.count();
    return drained.deleted;
  });

  const result: SweepResult = {
    adminMessages,
    reports,
    contributions,
    notifications,
    loginAttempts,
    auditLogs,
    outboundEmails,
    accountsPurged,
    imagesRetried,
    imagesStillPending,
    errors,
  };

  await writeAudit({
    actorId: null,
    action: "retention.sweep",
    detail: JSON.stringify(result),
  });

  return result;
}
