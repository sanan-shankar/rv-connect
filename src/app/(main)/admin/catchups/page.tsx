import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requireAdminPage, overdueEditionWhere } from "@/lib/admin";
import { ADMIN_MEASURE, AdminEmpty, AdminSection } from "@/components/admin/admin-chrome";
import { Chip, type ChipTone } from "@/components/admin/admin-chip";
import { formatDisplayDate, metaLine } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Catch-ups",
};

/* The Catch-up's own state, as opposed to its current Round's. Raw, these
   render as lowercase "paused" and "ended", which is the column talking. */
const SERIES_STATUS: Record<string, string> = {
  paused: "Paused",
  ended: "Ended",
};

/* The five states a Round moves through, in the words a person would use. */
const STATUS: Record<string, { label: string; tone: ChipTone }> = {
  draft: { label: "Not opened yet", tone: "idle" },
  collecting: { label: "Taking questions", tone: "info" },
  answering: { label: "Taking answers", tone: "info" },
  preparing: { label: "Being put together", tone: "warn" },
  published: { label: "Sent out", tone: "good" },
};

/**
 * Oversight, not a second control panel.
 *
 * Catch-ups is the app's largest subsystem: six models, twenty server
 * actions, and a lifecycle with real deadlines. It also has NO CRON. Rounds
 * advance in `advanceDueCatchups`, which runs off whoever happens to load a
 * page, and it only advances the Catch-ups THAT PERSON is in. So a Round
 * belonging to a group where nobody has visited lately can sit past its own
 * closing date indefinitely, and until now there was nowhere at all that
 * would say so.
 *
 * The Keeper still runs their own Catch-up. This page answers one question:
 * is any of this stuck.
 */
export default async function AdminCatchupsPage() {
  // The role, re-established on this page and not borrowed from the layout.
  // Soft navigation re-renders only the segments that changed, so a shared
  // layout is not re-evaluated on every move -- and this page reads member
  // data. One line, and the demotion window closes (bug audit B-024).
  await requireAdminPage();
  const now = new Date();

  const [catchups, overdue] = await Promise.all([
    prisma.catchup.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        cadence: true,
        group: { select: { name: true, _count: { select: { members: true } } } },
        createdBy: { select: { id: true, name: true } },
        editions: {
          select: {
            id: true,
            number: true,
            status: true,
            questionsCloseAt: true,
            answersCloseAt: true,
            publishAt: true,
            publishedAt: true,
            _count: { select: { prompts: true, entries: true } },
          },
          orderBy: { number: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.catchupEdition.findMany({
      where: overdueEditionWhere(now),
      select: { id: true },
    }),
  ]);

  const overdueIds = new Set(overdue.map((e) => e.id));

  const stuck = catchups.filter((c) => c.editions[0] && overdueIds.has(c.editions[0].id));
  const running = catchups.filter((c) => !stuck.includes(c));

  function card(c: (typeof catchups)[number]) {
    const round = c.editions[0];
    const status = round ? (STATUS[round.status] ?? STATUS.draft) : null;
    const isStuck = round ? overdueIds.has(round.id) : false;

    // The date this Round is actually waiting on, which depends on where it
    // has got to. Showing all three would say almost nothing.
    const due =
      round?.status === "collecting"
        ? round.questionsCloseAt
        : round?.status === "answering"
          ? round.answersCloseAt
          : round?.status === "preparing"
            ? round.publishAt
            : null;

    return (
      <div
        key={c.id}
        className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-3.5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/catchups/${c.id}`}
              className="truncate rounded-sm text-[13.5px] font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {c.title ?? `${c.group.name} Catch-ups`}
            </Link>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {metaLine(
                `${c.group._count.members} ${c.group._count.members === 1 ? "person" : "people"}`,
                c.cadence,
                c.createdBy ? `Kept by ${c.createdBy.name}` : "No keeper"
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {c.status !== "active" && (
              <Chip label={SERIES_STATUS[c.status] ?? c.status} tone="idle" />
            )}
            {status && <Chip label={status.label} tone={isStuck ? "bad" : status.tone} />}
          </div>
        </div>

        {round ? (
          <p className="text-[12.5px] leading-snug text-muted-foreground">
            {metaLine(
              `Round ${round.number}`,
              `${round._count.prompts} ${round._count.prompts === 1 ? "question" : "questions"}`,
              `${round._count.entries} ${round._count.entries === 1 ? "answer" : "answers"}`,
              round.publishedAt
                ? `Sent ${formatDisplayDate(round.publishedAt)}`
                : due
                  ? `${isStuck ? "Was due" : "Due"} ${formatDisplayDate(due)}`
                  : null
            )}
          </p>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">No Rounds yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${ADMIN_MEASURE}`}>
      <PageHeader title="Catch-ups" />

      <AdminSection label="Past its date" count={stuck.length}>
        {stuck.length === 0 ? (
          <AdminEmpty>Nothing is stuck. Every Round is inside its own dates.</AdminEmpty>
        ) : (
          <>
            <p className="px-0.5 pb-1 text-[12.5px] leading-relaxed text-muted-foreground">
              These Rounds are past a date they should have moved on from. Rounds advance when
              somebody in that group loads a page, so a quiet group can leave one sitting here.
              Opening the Catch-up yourself is usually enough to nudge it along.
            </p>
            <div className="flex flex-col gap-2">{stuck.map(card)}</div>
          </>
        )}
      </AdminSection>

      <AdminSection label="Everything else" count={running.length}>
        {running.length === 0 ? (
          <AdminEmpty>Nobody has started a Catch-up yet.</AdminEmpty>
        ) : (
          <div className="flex flex-col gap-2">{running.map(card)}</div>
        )}
      </AdminSection>
    </div>
  );
}
