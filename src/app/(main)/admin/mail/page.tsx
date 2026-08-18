import type { Metadata } from "next";
import { AlertTriangle, Clock, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { mailHealth, nextBudgetResetAt } from "@/lib/email-queue";
import { AdminEmpty, AdminSection, StatStrip, StatTile } from "@/components/admin/admin-chrome";
import { MailRows, type MailRow } from "@/components/admin/mail/mail-rows";

export const metadata: Metadata = {
  title: "Mail",
};

const ROW_SELECT = {
  id: true,
  to: true,
  kind: true,
  status: true,
  priority: true,
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
    <div className="flex flex-col gap-5">
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
          IST. There is no cron here: the queue drains when somebody loads a page.
        </p>
      )}

      <AdminSection label="Gave up" count={failed.length}>
        {failed.length === 0 ? (
          <AdminEmpty>Nothing has failed. Every message got through.</AdminEmpty>
        ) : (
          <MailRows rows={failed.map(toRow)} showActions />
        )}
      </AdminSection>

      <AdminSection label="Waiting to go" count={queued.length}>
        {queued.length === 0 ? (
          <AdminEmpty>The queue is empty.</AdminEmpty>
        ) : (
          <MailRows rows={queued.map(toRow)} />
        )}
      </AdminSection>

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
