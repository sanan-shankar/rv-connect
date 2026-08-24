import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
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
import { CONTRIBUTION_SUM, netPaise } from "@/lib/contribution-state";
import { isOwner, requireAdminPage } from "@/lib/admin";
import { mailHealth } from "@/lib/email-queue";
import { loadWorklist, worklistIsCapped } from "@/lib/admin-worklist-query";
import { QUEUE_LABEL, QUEUE_TONE, type WorkItem } from "@/lib/admin-worklist";
import { Chip } from "@/components/admin/admin-chip";
import {
  ADMIN_MEASURE,
  AdminCapped,
  AdminSection,
  StatStrip,
  StatTile,
} from "@/components/admin/admin-chrome";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { TakeTourAgainButton } from "@/components/tour/take-tour-again-button";
import { formatPaise, formatTimeAgo, valleyDayKey, valleyMidnight } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Overview",
};

const QUEUE_ICON = {
  message: Inbox,
  report: Flag,
  photo: Images,
  flagged: ShieldQuestion,
  verify: BadgeCheck,
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
  /* The valley's month, not the server's. `setHours(0,0,0,0)` on a Date uses
     the SERVER's local zone, which on Vercel is UTC -- so "this month" began at
     05:30 IST on the 1st and every contribution made in those five and a half
     hours was counted in the previous month (audit Low 46). valleyMidnight is
     the same instrument the feed's time filter uses. */
  const [yyyy, mm] = valleyDayKey().split("-");
  const monthStart = valleyMidnight(`${yyyy}-${mm}-01`);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [work, members, newThisWeek, mail, given] = await Promise.all([
    loadWorklist(),
    prisma.user.count({ where: { isBlocked: false } }),
    prisma.user.count({
      where: { createdAt: { gte: weekAgo } },
    }),
    mailHealth(),
    prisma.contribution.aggregate({
      _sum: CONTRIBUTION_SUM,
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
          <>
            <div className="flex flex-col gap-1.5">
              {work.map((item) => (
                <WorkRow key={item.key} item={item} />
              ))}
            </div>
            {/* The rail counts every waiting row; this list takes twenty per
                queue. Past that they stop agreeing, and a rail reading 34 over
                a list of 20 is worse than no count (audit Low 7). */}
            {worklistIsCapped(work) && (
              <AdminCapped>
                The most pressing from each queue. The count in the sidebar is
                everything; open a section to see the rest.
              </AdminCapped>
            )}
          </>
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
            value={formatPaise(netPaise(given._sum))}
            icon={IndianRupee}
            href="/admin/support"
          />
        </StatStrip>
      </AdminSection>

      {/* MOBILE ONLY, at every worklist length. On a phone the rail is behind a
          hamburger and the sections have to be reachable from the page itself.

          It was briefly shown on desktop too whenever the worklist was empty,
          to fill the ~600px of room that leaves. That was wrong: it is eight
          cards restating the rail two inches to its right, which is exactly
          the "overcrowded" the owner asked to be rid of. An admin panel whose
          front page says nothing is waiting SHOULD be a short page. The empty
          state is the good news, not a hole to fill. */}
      <AdminSection label="Everything else" className="md:hidden">
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
