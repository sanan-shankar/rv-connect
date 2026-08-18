import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  Flag,
  IndianRupee,
  Inbox,
  Images,
  Mail,
  Send,
  ShieldQuestion,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { isOwner, requireAdminPage } from "@/lib/admin";
import { mailHealth } from "@/lib/email-queue";
import { loadWorklist } from "@/lib/admin-worklist-query";
import { QUEUE_LABEL, QUEUE_TONE, type WorkItem } from "@/lib/admin-worklist";
import { Chip } from "@/components/admin/admin-chip";
import { ADMIN_MEASURE, AdminSection, StatStrip, StatTile } from "@/components/admin/admin-chrome";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { TakeTourAgainButton } from "@/components/tour/take-tour-again-button";
import { formatPaise, formatTimeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Overview",
};

const QUEUE_ICON = {
  message: Inbox,
  report: Flag,
  photo: Images,
  flagged: ShieldQuestion,
  mail: Mail,
  catchup: CalendarDays,
} as const;

/**
 * What needs you, then how the place is doing. In that order.
 *
 * The page this replaces opened with six stat tiles that were not clickable,
 * three of which were repeated as section headings two inches below them, and
 * then stacked five queues down 2901px of scroll. So the first thing you saw
 * was a scoreboard, and the thing you actually came for was somewhere under
 * it.
 *
 * The worklist inverts that: every waiting item from every queue, mixed,
 * newest first, each one a link to where it gets dealt with. The numbers come
 * after, and every one of them is a link into the section that owns it.
 */
export default async function AdminOverviewPage() {
  const session = await requireAdminPage();

  // One clock read for the whole render. `Date.now()` inline in the query
  // tripped the react-hooks/purity rule, and it was also two different "now"s
  // in one page: the month boundary and the week boundary were read a few
  // microseconds apart for no reason.
  const now = new Date();
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [work, members, newThisWeek, mail, given] = await Promise.all([
    loadWorklist(),
    prisma.user.count({ where: { isBlocked: false } }),
    prisma.user.count({
      where: { createdAt: { gte: weekAgo } },
    }),
    mailHealth(),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { status: "paid", livemode: true, paidAt: { gte: monthStart } },
    }),
  ]);

  return (
    <div className={`flex flex-col gap-6 ${ADMIN_MEASURE}`}>
      <PageHeader
        title="Admin"
        actions={isOwner(session.email) ? <TakeTourAgainButton /> : undefined}
      />

      <AdminSection label="Waiting on you" count={work.length}>
        {work.length === 0 ? (
          /* One line, no card. There is nothing to do, and a bordered empty
             state saying so is the panel's old habit of paying 80px to say
             nothing. */
          <p className="px-0.5 py-1 text-[13px] text-muted-foreground">
            Nothing is waiting. No messages, no reports, no photos to look at, nobody flagged,
            and the mail is going out.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {work.map((item) => (
              <WorkRow key={item.key} item={item} />
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection label="The place">
        <StatStrip>
          <StatTile label="Members" value={members} icon={Users} href="/admin/people" />
          <StatTile label="New this week" value={newThisWeek} icon={UserPlus} href="/admin/people" />
          <StatTile
            label="Mail sent today"
            value={mail.sentToday}
            suffix={`/ ${mail.dailyCap}`}
            icon={Send}
            href="/admin/mail"
            tone={mail.failed > 0 ? "bad" : "plain"}
          />
          <StatTile
            label="Given this month"
            value={formatPaise(given._sum.amount ?? 0)}
            icon={IndianRupee}
            href="/admin/support"
          />
        </StatStrip>
      </AdminSection>

      {/* On a phone the rail is behind a hamburger, so the sections have to be
          reachable from the page itself. On a desktop the rail already carries
          them, so this is redundant on a busy day and hidden.

          The exception is the day the worklist is empty, which is the day this
          page is otherwise 290px of content in a 900px window. Then the same
          list earns its place: it fills the room with the panel's own
          navigation rather than with something invented to fill it. */}
      <AdminSection
        label="Everything else"
        className={work.length === 0 ? undefined : "md:hidden"}
      >
        <div className="flex flex-col gap-1.5">
          {ADMIN_NAV.flatMap((g) => g.sections)
            .filter((s) => s.href !== "/admin")
            .map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="state-layer flex items-start gap-2.5 rounded-[var(--radius)] border border-border bg-card p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <s.icon className="mt-0.5 size-4 shrink-0 text-leaf" strokeWidth={2} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-foreground">{s.label}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
                    {s.blurb}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </AdminSection>
    </div>
  );
}

function WorkRow({ item }: { item: WorkItem }) {
  const Icon = QUEUE_ICON[item.queue];
  return (
    <Link
      href={item.href}
      className="state-layer flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-foreground">{item.title}</p>
        {item.detail && (
          <p className="truncate text-[12.5px] text-muted-foreground">{item.detail}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Chip label={QUEUE_LABEL[item.queue]} tone={QUEUE_TONE[item.queue]} />
        <span className="hidden text-[11.5px] tabular-nums text-muted-foreground sm:inline">
          {formatTimeAgo(new Date(item.at))}
        </span>
      </div>
    </Link>
  );
}
