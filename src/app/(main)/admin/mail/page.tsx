import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { AlertTriangle, Clock, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { mailHealth, nextBudgetResetAt } from "@/lib/email-queue";
import { ADMIN_MEASURE, AdminEmpty, AdminSection, StatStrip, StatTile } from "@/components/admin/admin-chrome";
import { MailRows, type MailRow } from "@/components/admin/mail/mail-rows";

export const metadata: Metadata = {
  title: "Mail",
};

const ROW_SELECT = {
  id: true,
  to: true,
  kind: true,
  status: true,
  attempts: true,
  lastError: true,
  createdAt: true,
  sentAt: true,
  user: { select: { id: true, name: true } },
} as const;

/**
 * The outbound queue, as something you can operate.
 *
 * What the old panel showed of this was three numbers inside the verification
 * section, and nothing else: `lastError` was written on every failure and
 * rendered nowhere, the queue's ORDER was invisible, and a dead message could
 * never be tried again. That is a strange thing to be blind to on a plan that
 * allows 95 sends a day, where the difference between a queue that is working
 * and a queue that is stuck is the whole story.
 */
export default async function AdminMailPage() {
  // The role, re-established on this page and not borrowed from the layout.
  // Soft navigation re-renders only the segments that changed, so a shared
  // layout is not re-evaluated on every move -- and this page reads member
  // data. One line, and the demotion window closes (bug audit B-024).
  await requireAdminPage();
  const [health, failed, queued, recent] = await Promise.all([
    mailHealth(),
    prisma.outboundEmail.findMany({
      where: { status: "failed" },
      select: ROW_SELECT,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.outboundEmail.findMany({
      where: { status: { in: ["queued", "sending"] } },
      select: ROW_SELECT,
      // The drain's own order, so this list IS the send order rather than a
      // differently-sorted view of the same rows: lower priority first, then
      // oldest. A password reset is somebody locked out right now; a welcome
      // confirmation can wait a day.
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 50,
    }),
    prisma.outboundEmail.findMany({
      where: { status: "sent" },
      select: ROW_SELECT,
      orderBy: { sentAt: "desc" },
      take: 20,
    }),
  ]);

  const resetAt = nextBudgetResetAt();

  return (
    <div className={`flex flex-col gap-6 ${ADMIN_MEASURE}`}>
      <PageHeader title="Mail" />

      <StatStrip columns={3}>
        <StatTile
          label="Sent today"
          value={health.sentToday}
          suffix={`/ ${health.dailyCap}`}
          icon={Send}
        />
        <StatTile
          label="Waiting to go"
          value={health.waiting}
          icon={Clock}
          tone={health.waiting > 0 ? "warn" : "plain"}
        />
        <StatTile
          label="Gave up"
          value={health.failed}
          icon={AlertTriangle}
          tone={health.failed > 0 ? "bad" : "plain"}
        />
      </StatStrip>

      {health.waiting > 0 && (
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Resend allows {health.dailyCap} messages a day on this plan. The rest go out after the
          budget refills, at{" "}
          {resetAt.toLocaleString("en-GB", {
            hour: "numeric",
            minute: "2-digit",
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata",
          })}{" "}
          IST. Nothing drains this queue on a schedule: it goes out when somebody loads a page.
        </p>
      )}

      {/* Both of these sections VANISH when empty rather than showing an empty
          state. The strip above already says "Gave up 0" and "Waiting to go
          0", so a heading plus a line of reassurance underneath is the same
          fact a third time, and stacking those was most of what made the old
          panel long. A section here means there is something in it. */}
      {failed.length > 0 && (
        <AdminSection label="Gave up" count={failed.length}>
          <MailRows rows={failed.map(toRow)} showActions />
        </AdminSection>
      )}

      {queued.length > 0 && (
        <AdminSection label="Waiting to go" count={queued.length}>
          <MailRows rows={queued.map(toRow)} />
        </AdminSection>
      )}

      <AdminSection label="Recently sent">
        {recent.length === 0 ? (
          <AdminEmpty>Nothing has been sent from here yet.</AdminEmpty>
        ) : (
          <MailRows rows={recent.map(toRow)} />
        )}
      </AdminSection>
    </div>
  );
}

type Row = {
  id: string;
  to: string;
  kind: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  sentAt: Date | null;
  user: { id: string; name: string } | null;
};

function toRow(r: Row): MailRow {
  return {
    id: r.id,
    to: r.to,
    kind: r.kind,
    status: r.status,
    attempts: r.attempts,
    lastError: r.lastError,
    createdAt: r.createdAt.toISOString(),
    sentAt: r.sentAt?.toISOString() ?? null,
    personId: r.user?.id ?? null,
    personName: r.user?.name ?? null,
  };
}
