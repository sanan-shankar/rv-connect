import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import Link from "next/link";
import { AlertTriangle, CalendarDays, CreditCard, IndianRupee, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import {
  CONTRIBUTION_SUM,
  REVERSED_STATUSES,
  isReversed,
  netPaise,
} from "@/lib/contribution-state";
import {
  ADMIN_MEASURE,
  AdminCapped,
  AdminEmpty,
  AdminSection,
  StatStrip,
  StatTile,
} from "@/components/admin/admin-chrome";

/** How much of the ledger one page render loads. The tiles above it are
 *  aggregates over the whole history, so nothing here is a total. */
const LEDGER_LIMIT = 100;
import { Chip } from "@/components/admin/admin-chip";
import { formatDisplayDate, formatPaise, metaLine, valleyDayKey, valleyMidnight } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Support",
};

/* `created` is an order that was opened and never came back, which is what a
   closed Razorpay modal leaves behind. It is not a failure and should not
   read like one. */
const STATUS_LABEL: Record<string, string> = {
  created: "Never finished",
  failed: "Failed",
  // Written only by the Razorpay webhook, from "paid", when the money went
  // back out (audit M58). Plain words rather than the payment industry's:
  // "charged back" means nothing to anybody who has not run a merchant
  // account, and "disputed" at least says what happened.
  refunded: "Refunded",
  disputed: "Disputed",
};

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
  // Re-checked per page, not only in the layout: soft navigation skips
  // layouts, which leaves a demoted admin still reading (B-024, argued in
  // lib/admin.ts).
  await requireAdminPage();
  /* The valley's month, not the server's. `setHours(0,0,0,0)` on a Date uses
     the SERVER's local zone, which on Vercel is UTC -- so "this month" began at
     05:30 IST on the 1st and every contribution made in those five and a half
     hours was counted in the previous month (audit Low 46). valleyMidnight is
     the same instrument the feed's time filter uses. */
  const [yyyy, mm] = valleyDayKey().split("-");
  const monthStart = valleyMidnight(`${yyyy}-${mm}-01`);

  const [all, thisMonth, givers, unfinished, rows] = await Promise.all([
    prisma.contribution.aggregate({
      _sum: CONTRIBUTION_SUM,
      _count: true,
      where: { status: "paid", livemode: true },
    }),
    prisma.contribution.aggregate({
      _sum: CONTRIBUTION_SUM,
      where: { status: "paid", livemode: true, paidAt: { gte: monthStart } },
    }),
    prisma.contribution
      .findMany({
        where: { status: "paid", livemode: true, userId: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      })
      .then((r) => r.length),
    /* Its own count, live-only. The tile used to be `rows.filter(not paid)`,
       which counted a developer's test orders as real attempts AND was
       silently capped at whatever fell inside the 100-row window below, so it
       stopped growing without ever saying it had (audit Low 8). A tile that
       reads "12" when the true number is 60 is worse than no tile.

       The excluded set is REVERSED_STATUSES, not a hand-typed pair. It said
       ["paid", "refunded"] and left `disputed` out, so a chargeback -- money
       that DID move, and that the webhook really does write -- was counted in
       a warn-toned "Did not go through" tile while the ledger below rendered
       the same row under "Given back" (audit C-089). Two measurements under
       one label, which is the exact thing the comment at the reversed group
       was written to prevent. One list now decides both. */
    prisma.contribution.count({
      where: { livemode: true, status: { notIn: ["paid", ...REVERSED_STATUSES] } },
    }),
    prisma.contribution.findMany({
      select: {
        id: true,
        amount: true,
        refundedAmount: true,
        status: true,
        livemode: true,
        method: true,
        failureReason: true,
        createdAt: true,
        paidAt: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: LEDGER_LIMIT,
    }),
  ]);

  const paid = rows.filter((r) => r.status === "paid");
  /* Money that came back out (audit M58). Its own group, because a refund is
     not a payment that failed: lumping it under "Did not go through" would
     read as a payer who never got through, when in fact they did and we gave
     it back. Rendered only when there is one, so the page grows a section the
     day it first has something to say and not before. */
  const reversed = rows.filter((r) => isReversed(r.status));
  const notPaid = rows.filter((r) => r.status !== "paid" && !isReversed(r.status));

  /* The funnel and the payment methods live HERE rather than in the analytics
     room (owner, 2026-08-19: "that could be under that section of admin not
     analytics"). They are facts about the money, and this is the money page;
     analytics is for exploring, not for the ledger's own arithmetic.
     livemode only, everywhere -- a developer's test order is indistinguishable
     from a real one by its ids alone. */
  const live = rows.filter((r) => r.livemode);
  const livePaid = live.filter((r) => r.status === "paid");
  const completion = live.length > 0 ? livePaid.length / live.length : 0;
  const byMethod = new Map<string, number>();
  for (const r of livePaid) byMethod.set(r.method ?? "unknown", (byMethod.get(r.method ?? "unknown") ?? 0) + 1);
  const avgPaise =
    livePaid.length > 0
      ? Math.round(
          livePaid.reduce((n, r) => n + r.amount - r.refundedAmount, 0) / livePaid.length
        )
      : 0;

  return (
    <div className={`flex flex-col gap-6 ${ADMIN_MEASURE}`}>
      <PageHeader title="Support" />

      <StatStrip>
        <StatTile label="Given, all time" value={formatPaise(netPaise(all._sum))} icon={IndianRupee} />
        <StatTile
          label="This month"
          value={formatPaise(netPaise(thisMonth._sum))}
          icon={CalendarDays}
        />
        <StatTile label="People who gave" value={givers} icon={Users} />
        <StatTile
          label="Did not go through"
          value={unfinished}
          icon={AlertTriangle}
          tone={unfinished > 0 ? "warn" : "plain"}
        />
      </StatStrip>

      <StatStrip>
        <StatTile
          label="Finished paying"
          value={`${Math.round(completion * 100)}%`}
          icon={TrendingUp}
          tone={completion < 0.5 ? "warn" : "plain"}
        />
        <StatTile label="Opened a payment" value={live.length} icon={Users} />
        <StatTile label="Typical gift" value={formatPaise(avgPaise)} icon={IndianRupee} />
        <StatTile
          label="Most used"
          value={[...byMethod.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none yet"}
          icon={CreditCard}
        />
      </StatStrip>

      {/* Said out loud, because these four are computed from the hundred most
          recent payments rather than from all of them, and a percentage that
          quietly means "lately" is the kind of number somebody plans around
          (audit Low 8). The three tiles above it are whole-history counts. */}
      <p className="-mt-3 text-[12px] text-muted-foreground">
        The four numbers above read the hundred most recent payments. The row before them counts
        everything.
      </p>

      {/* The gap between opening a payment and finishing one is the single
          most actionable number on this page, so it gets said in words rather
          than left to be inferred from two percentages. */}
      {live.length > 0 && livePaid.length < live.length && (
        <p className="text-[12.5px] leading-relaxed text-foreground">
          {live.length - livePaid.length} of {live.length} people opened a payment and did not
          finish it.{" "}
          {byMethod.size > 0 && (
            <>
              Of those who did, the methods were{" "}
              {[...byMethod.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([m, n]) => `${m} (${n})`)
                .join(", ")}
              .
            </>
          )}
        </p>
      )}

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
          <>
            <Ledger rows={paid} />
            {/* The three lists below are ONE window of the most recent
                contributions, split by outcome. Saying so where it can be read
                rather than only in a comment: a section headed "Given 43" over
                a capped list reads as the whole history (audit Low 55). */}
            {rows.length === LEDGER_LIMIT && (
              <AdminCapped>
                These three lists are the most recent {LEDGER_LIMIT} contributions of any
                kind. The totals above count every one there has ever been.
              </AdminCapped>
            )}
          </>
        )}
      </AdminSection>

      {/* Not "Did not go through", which is the tile at the top: that one
          counts real money across the whole history, this list is the recent
          hundred and shows test rows too. Two different measurements under one
          set of words was a number that looked wrong (21 against 23) with no
          way to tell which was which. */}
      <AdminSection label="Attempts that stopped" count={notPaid.length}>
        {notPaid.length === 0 ? (
          <AdminEmpty>Every attempt went through.</AdminEmpty>
        ) : (
          <Ledger rows={notPaid} />
        )}
      </AdminSection>

      {reversed.length > 0 && (
        <AdminSection label="Given back" count={reversed.length}>
          <Ledger rows={reversed} />
        </AdminSection>
      )}
    </div>
  );
}

type LedgerRow = {
  id: string;
  amount: number;
  refundedAmount: number;
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
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div
          key={r.id}
          className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-3"
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
                <Chip
                  label={STATUS_LABEL[r.status] ?? r.status}
                  tone={r.status === "failed" ? "bad" : "warn"}
                />
              )}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {metaLine(
                formatDisplayDate(new Date(r.paidAt ?? r.createdAt)),
                r.method ? r.method.toUpperCase() : null
              )}
            </p>
            {/* A refund that did not cover the whole gift leaves the row on
                "paid" and only moves paise (audit C-087), so without this the
                row would read as an untouched contribution while the total
                above counted less than it shows. */}
            {r.status === "paid" && r.refundedAmount > 0 && (
              <p className="mt-1 text-[12px] text-muted-foreground">
                {formatPaise(r.refundedAmount)} refunded, {formatPaise(r.amount - r.refundedAmount)}{" "}
                still counted
              </p>
            )}
            {/* Stored on every failure since the feature shipped, and read by
                nothing until now. */}
            {r.failureReason && (
              <p className="mt-1 break-words text-[12px] leading-snug text-destructive">
                {r.failureReason}
              </p>
            )}
          </div>
          <p className="shrink-0 text-[14px] font-semibold tabular-nums text-foreground">
            {formatPaise(r.amount)}
          </p>
        </div>
      ))}
    </div>
  );
}
