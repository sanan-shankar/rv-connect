import type { Metadata } from "next";
import Link from "@/components/common/link";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import { overdueEditionWhere } from "@/lib/catchups-core";
import { ADMIN_MEASURE, AdminEmpty, AdminSection } from "@/components/admin/admin-chrome";
import { Chip } from "@/components/admin/admin-chip";
import { EDITION_STATUS, SERIES_STATUS } from "@/components/admin/catchup-status";
import { formatDisplayDate, metaLine } from "@/lib/utils";
import { advanceDueCatchups } from "@/lib/catchups";

export const metadata: Metadata = {
  title: "Catch-ups",
};

/**
 * Oversight, not a second control panel.
 *
 * Catch-ups is the app's largest subsystem: six models, twenty server
 * actions, and a lifecycle with real deadlines. Editions advance in
 * `advanceDueCatchups`, which runs off whoever happens to load a page, and
 * when given a member id it only advances the Catch-ups THAT PERSON is in. So
 * an Edition belonging to a group where nobody has visited lately can sit past
 * its own closing date, and there was nowhere at all that would say so.
 * (A nightly cron sweeps them too, since audit M27; this page is what answers
 * the question in between.)
 *
 * This page runs the UNSCOPED advance itself, before it reads anything. The
 * copy under the stuck list used to tell the admin that "opening the Catch-up
 * yourself is usually enough to nudge it along" -- which was not true, because
 * the advance is scoped to the reader's own memberships and an admin is
 * usually not in that group (audit Low 11). Rather than correct the sentence
 * to say there was nothing they could do, the page now does the nudging: the
 * sweep is idempotent, cannot throw, and an admin looking at a list of overdue
 * Editions is exactly the person who wants them moved on.
 *
 * The Keeper still runs their own Catch-up. This page answers one question:
 * is any of this stuck.
 */
export default async function AdminCatchupsPage() {
  // Re-checked per page, not only in the layout: soft navigation skips
  // layouts, which leaves a demoted admin still reading (B-024, argued in
  // lib/admin.ts).
  await requireAdminPage();

  /* Before the reads, so the list below reflects the advance rather than the
     state that preceded it. Swallows its own errors by design. */
  await advanceDueCatchups();

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
            publishedAt: true,
            publishAt: true,
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
    const edition = c.editions[0];
    const status = edition ? (EDITION_STATUS[edition.status] ?? EDITION_STATUS.draft) : null;
    const isStuck = edition ? overdueIds.has(edition.id) : false;

    // The date this Edition is actually waiting on, which depends on where it
    // has got to. Showing both would say almost nothing.
    const due =
      edition?.status === "collecting"
        ? edition.questionsCloseAt
        : edition?.status === "answering"
          ? edition.answersCloseAt
          : edition?.status === "sealed"
            ? edition.publishAt
            : null;

    return (
      <div
        key={c.id}
        className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-3.5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {/* To the READING ROOM, not to /catchups/<id>. That is the
                member-facing screen, and it answers "This Catch-up is for
                group members" to an admin who is not in the group -- which is
                every admin, for almost every Catch-up. So this list linked to
                a wall (owner, 2026-08-25). */}
            <Link
              href={`/admin/catchups/${c.id}`}
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
              <Chip
                label={SERIES_STATUS[c.status]?.label ?? c.status}
                tone={SERIES_STATUS[c.status]?.tone ?? "idle"}
              />
            )}
            {status && <Chip label={status.label} tone={isStuck ? "bad" : status.tone} />}
          </div>
        </div>

        {edition ? (
          /* THE NUMBER STAYS, AND ONLY HERE. Every member-facing surface lost
             it in the 2026-09-08 rename -- an Edition is named by its date
             (N92, "the round number is irrelevant") -- and `roundLabel()` was
             deleted rather than kept. The admin room is the exception, his
             decision the same day: this is the owner's own diagnostic, the
             number is the row's actual key (`@@unique([catchupId, number])`),
             and an Edition that has not published has no date to go by. Two
             other places print it, both marked: the reading room's section
             labels and the stuck-Edition alert in admin-worklist-query.ts.
             Do not "finish" the rename by taking these three out. */
          <p className="text-[12.5px] leading-snug text-muted-foreground">
            {metaLine(
              `Edition ${edition.number}`,
              `${edition._count.prompts} ${edition._count.prompts === 1 ? "question" : "questions"}`,
              `${edition._count.entries} ${edition._count.entries === 1 ? "answer" : "answers"}`,
              edition.publishedAt
                ? `Sent ${formatDisplayDate(edition.publishedAt)}`
                : due
                  ? `${isStuck ? "Was due" : "Due"} ${formatDisplayDate(due)}`
                  : null
            )}
          </p>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">No Editions yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${ADMIN_MEASURE}`}>
      <PageHeader title="Catch-ups" />

      <AdminSection label="Past its date" count={stuck.length}>
        {stuck.length === 0 ? (
          <AdminEmpty>Nothing is stuck. Every Edition is inside its own dates.</AdminEmpty>
        ) : (
          <>
            <p className="px-0.5 pb-1 text-[12.5px] leading-relaxed text-muted-foreground">
              These Editions are past a date they should have moved on from. Editions advance when
              somebody in that group loads a page, so a quiet group can leave one sitting here.
              Loading this page has already tried to move every one of them on, so anything still
              listed is stuck for a reason worth looking at.
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
