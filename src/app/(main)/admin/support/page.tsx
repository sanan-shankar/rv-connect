import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarDays, IndianRupee, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { AdminEmpty, AdminSection, StatStrip, StatTile } from "@/components/admin/admin-chrome";
import { Chip } from "@/components/admin/admin-chip";
import { formatDisplayDate, metaLine } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Support",
};

/** Paise to a readable rupee figure. Rupees exist only in the UI. */
function rupees(paise: number): string {
  return `Rs ${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * The contributions ledger.
 *
 * The `Contribution` table has been live and taking real money with no admin
 * surface at all: to answer "who has given" you had to query the database by
 * hand.
 *
 * THE LIVEMODE SPLIT IS THE LOAD-BEARING PART. This database is shared by
 * production and local dev, and a Razorpay test order is indistinguishable
 * from a real one by its ids alone, so the schema carries `livemode` and the
 * public total on /support already filters on it. If this page summed the
 * table without the same filter, the two surfaces would disagree about how
 * much money exists, and the one on the wall would be the one that was wrong.
 * Test rows are shown, clearly marked, and never counted.
 */
export default async function AdminSupportPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [all, thisMonth, givers, rows] = await Promise.all([
    prisma.contribution.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: "paid", livemode: true },
    }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { status: "paid", livemode: true, paidAt: { gte: monthStart } },
    }),
    prisma.contribution
      .findMany({
        where: { status: "paid", livemode: true, userId: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      })
      .then((r) => r.length),
    prisma.contribution.findMany({
      select: {
        id: true,
        amount: true,
        status: true,
        livemode: true,
        method: true,
        failureReason: true,
        createdAt: true,
        paidAt: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const paid = rows.filter((r) => r.status === "paid");
  const notPaid = rows.filter((r) => r.status !== "paid");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Support" />

      <StatStrip>
        <StatTile label="Given, all time" value={rupees(all._sum.amount ?? 0)} icon={IndianRupee} />
        <StatTile
          label="This month"
          value={rupees(thisMonth._sum.amount ?? 0)}
          icon={CalendarDays}
        />
        <StatTile label="People who gave" value={givers} icon={Users} />
        <StatTile
          label="Did not go through"
          value={notPaid.length}
          icon={AlertTriangle}
          tone={notPaid.length > 0 ? "warn" : "plain"}
        />
      </StatStrip>

      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        The totals above count real payments only. This database is shared with local
        development, where a test payment looks exactly like a real one, so anything marked{" "}
        <span className="font-medium text-foreground">Test</span> below is left out of them, the
        same rule the public total on the Support page follows.
      </p>

      <AdminSection label="Given" count={paid.length}>
        {paid.length === 0 ? (
          <AdminEmpty>Nobody has given anything yet.</AdminEmpty>
        ) : (
          <Ledger rows={paid} />
        )}
      </AdminSection>

      <AdminSection label="Did not go through" count={notPaid.length}>
        {notPaid.length === 0 ? (
          <AdminEmpty>Every attempt went through.</AdminEmpty>
        ) : (
          <Ledger rows={notPaid} />
        )}
      </AdminSection>
    </div>
  );
}

type LedgerRow = {
  id: string;
  amount: number;
  status: string;
  livemode: boolean;
  method: string | null;
  failureReason: string | null;
  createdAt: Date;
  paidAt: Date | null;
  user: { id: string; name: string } | null;
};

function Ledger({ rows }: { rows: LedgerRow[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div
          key={r.id}
          className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-card px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-foreground">
              {r.user ? (
                <Link
                  href={`/admin/people/${r.user.id}`}
                  className="truncate rounded-sm underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {r.user.name}
                </Link>
              ) : (
                /* userId is nullable with SetNull, so a gift outlives the
                   account that made it. That is deliberate, and it renders as
                   an amount with nobody attached rather than as a crash. */
                <span className="truncate text-muted-foreground">Account since deleted</span>
              )}
              {!r.livemode && <Chip label="Test" tone="info" />}
              {r.status !== "paid" && (
                <Chip label={r.status} tone={r.status === "failed" ? "bad" : "warn"} />
              )}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {metaLine(
                formatDisplayDate(new Date(r.paidAt ?? r.createdAt)),
                r.method ? r.method.toUpperCase() : null
              )}
            </p>
            {/* Stored on every failure since the feature shipped, and read by
                nothing until now. */}
            {r.failureReason && (
              <p className="mt-1 break-words text-[12px] leading-snug text-destructive">
                {r.failureReason}
              </p>
            )}
          </div>
          <p className="shrink-0 text-[14px] font-semibold tabular-nums text-foreground">
            {rupees(r.amount)}
          </p>
        </div>
      ))}
    </div>
  );
}
