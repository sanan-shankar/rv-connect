import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { ADMIN_MEASURE, AdminSection, AdminEmpty } from "@/components/admin/admin-chrome";
import { formatTimeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Audit log",
};

/**
 * The audit trail (audit H10 / H14). Two records, side by side, because they
 * answer two different questions:
 *
 *  - AuditLog: WHO did the things that change standing or destroy data — an
 *    admin blocking, deleting, verifying or changing a role, a member deleting
 *    their own account, a report filed. Attribution and non-repudiation.
 *  - the failed sign-ins (LoginAttempt, written since Phase 4): the shape a
 *    break-in attempt makes — a burst of wrong passwords, a run at addresses
 *    that match no account. Detection.
 *
 * Read-only. Nothing here can be edited; the log is append-only by design.
 */

// Human labels for the dotted action codes writeAudit records.
const ACTION_LABEL: Record<string, string> = {
  "admin.block": "Blocked",
  "admin.unblock": "Unblocked",
  "admin.delete": "Deleted account",
  "admin.role": "Changed role",
  "admin.verify": "Verified",
  "admin.unverify": "Removed verification",
  "admin.merge": "Merged accounts",
  "account.delete": "Deleted own account",
  "account.delete_request": "Asked to delete their account",
  "account.delete_cancel": "Cancelled their deletion",
  "account.purge": "Deletion became final",
  "account.export": "Downloaded their data",
  "retention.sweep": "Retention sweep ran",
  "report.user": "Flagged a member",
  "report.post": "Reported a post",
};

export default async function AdminAuditPage() {
  // Re-checked per page, not only in the layout: soft navigation skips
  // layouts, which leaves a demoted admin still reading (B-024, argued in
  // lib/admin.ts).
  await requireAdminPage();
  const [events, failedLogins] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.loginAttempt.findMany({
      where: { ok: false },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  // Resolve the plain-string actor/target ids to names where the account still
  // exists; where it does not (the point of an audit log — the record outlives
  // the account), the row falls back to the `detail` it captured at the time.
  const ids = [
    ...new Set(events.flatMap((e) => [e.actorId, e.targetId]).filter((x): x is string => !!x)),
  ];
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  const label = (id: string | null) => (id ? nameOf.get(id) ?? null : null);

  return (
    <div className={`flex flex-col gap-6 ${ADMIN_MEASURE}`}>
      <PageHeader title="Audit log" />

      <AdminSection label="Actions on the record" count={events.length}>
        {events.length === 0 ? (
          <AdminEmpty>Nothing has happened yet that is worth keeping a record of.</AdminEmpty>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60 rounded-[var(--radius)] border border-border/60 bg-card">
            {events.map((e) => {
              const actor = label(e.actorId);
              const target = label(e.targetId);
              return (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3">
                  <span className="text-sm font-medium text-foreground">
                    {ACTION_LABEL[e.action] ?? e.action}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {actor ?? "someone"}
                    {target && target !== actor ? ` → ${target}` : ""}
                  </span>
                  {e.detail ? (
                    <span className="text-[13px] text-muted-foreground/80">{e.detail}</span>
                  ) : null}
                  <span className="ml-auto shrink-0 text-[13px] tabular-nums text-muted-foreground/70">
                    {formatTimeAgo(e.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>

      <AdminSection label="Sign-ins that failed" count={failedLogins.length}>
        {failedLogins.length === 0 ? (
          <AdminEmpty>No failed sign-ins on record. A quiet door is a good sign.</AdminEmpty>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60 rounded-[var(--radius)] border border-border/60 bg-card">
            {failedLogins.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3">
                <span className="text-sm text-foreground">{a.email}</span>
                <span className="text-[13px] text-muted-foreground">{a.reason}</span>
                {/* The cause, where the reason word is not enough to act on.
                    Only "bot-check" carries one, and it is the whole point of
                    the column: "no-token/timeout" and "no-token/error-110200"
                    are two different problems that read as one refusal for
                    three sessions running. Monospace because it is a code to
                    be repeated back, not prose. */}
                {a.detail && (
                  <span className="rounded-[var(--radius-sm)] bg-muted/60 px-1.5 py-0.5 font-mono text-[11.5px] text-muted-foreground/80">
                    {a.detail}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[13px] tabular-nums text-muted-foreground/70">
                  {formatTimeAgo(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
