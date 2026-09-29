import type { Metadata } from "next";
import Link from "@/components/common/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import { ADMIN_MEASURE, AdminEmpty, AdminSection } from "@/components/admin/admin-chrome";
import { Chip } from "@/components/admin/admin-chip";
import { EDITION_STATUS, SERIES_STATUS } from "@/components/admin/catchup-status";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { formatDisplayDate, metaLine } from "@/lib/utils";
import { renderRichText } from "@/lib/rich-text";
import { IDENTITY_SELECT } from "@/lib/people-select";

export const metadata: Metadata = {
  title: "Catch-up",
};

/**
 * READING ROOM. One Catch-up, all of it, and nothing to press.
 *
 * The owner is not in most Catch-ups and does not want to be — joining one
 * would put his face in the roster, his name in the member count, and a
 * reminder preference on a group he has no part in. But he does need to be
 * able to read what is happening inside them (owner, 2026-08-25: "I should be
 * able to see everything in all catch ups as if I'm a member but I don't show
 * up as a member"). The member-facing `/catchups/[catchupId]` answers
 * "This Catch-up is for group members." to exactly that person.
 *
 * WHY A SEPARATE PAGE rather than an observer mode threaded through the real
 * one. That screen is 2,212 lines of client components built around a `viewer`
 * who is a member: composers, the curation console, the Keeper's settings, a
 * people panel with remove and promote controls. Every one of those would need
 * a read-only branch, and a missed branch is a button that looks live and then
 * fails. This page has no interactive component at all, so there is nothing to
 * disable and nothing to forget. It is the same posture as `/admin/catchups`
 * itself, which calls itself "oversight, not a second control panel".
 *
 * IT WRITES NOTHING AND JOINS NOTHING. No GroupMember row is created, no
 * `CatchupPref` is touched, and there is no server action on this page — so
 * reading a Catch-up cannot make the reader appear inside it. Views are not
 * recorded either: `ContentView` is for profiles, and an admin reading an Edition
 * is not a member opening one.
 *
 * ANONYMOUS QUESTIONS ARE ATTRIBUTED HERE, and that is a deliberate exception
 * the owner made (2026-08-25), not an oversight. A member never learns who
 * asked a question anonymously — `HomePromptView.author` is null over the wire
 * for exactly that reason (audit C-019, where four anonymous askers leaked).
 * This page is the one place the name appears, marked as such on the row, so
 * the exception is visible to whoever is reading rather than silent. If that
 * is ever regretted, it is the `askedBy` block below and nothing else.
 */

export default async function AdminCatchupReadingRoom({
  params,
}: {
  params: Promise<{ catchupId: string }>;
}) {
  // Re-checked per page, not only in the layout (B-024, argued in
  // lib/admin.ts) -- and this page reads the most private writing on the
  // site, so the demotion window is the one that matters most here.
  await requireAdminPage();
  const { catchupId } = await params;

  const catchup = await prisma.catchup.findUnique({
    where: { id: catchupId },
    select: {
      id: true,
      title: true,
      intro: true,
      cadence: true,
      status: true,
      createdBy: { select: { name: true } },
      group: { select: { name: true, _count: { select: { members: true } } } },
      editions: {
        select: {
          id: true,
          number: true,
          theme: true,
          status: true,
          questionsCloseAt: true,
          answersCloseAt: true,
          publishedAt: true,
          publishAt: true,
          prompts: {
            /* A SEALED TIME CAPSULE IS SEALED HERE TOO (build phase 14). His 34b
               is that nothing in one is readable until it opens, and he is the
               admin: this room is the one place the app could spoil his own
               capsule. So its questions and answers are never QUERIED, not
               fetched and hidden (write-path review, phase 14), and the room
               says when it opens. Reversing that for moderation is his call,
               and it is this one clause. */
            where: { edition: { status: { not: "sealed" } } },
            select: {
              id: true,
              text: true,
              accepted: true,
              showAsker: true,
              position: true,
              // Always selected, shown with a marker. See the anonymity note
              // in the docblock: this is the exception, and it is the only
              // place in the app where it is made.
              author: {
                select: IDENTITY_SELECT,
              },
              entries: {
                select: {
                  id: true,
                  body: true,
                  songTitle: true,
                  createdAt: true,
                  author: {
                    select: IDENTITY_SELECT,
                  },
                  _count: { select: { loves: true } },
                },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: [{ accepted: "desc" }, { position: "asc" }, { createdAt: "asc" }],
          },
        },
        // Newest Edition first: what is happening now is the thing somebody
        // came here to read, and the archive is underneath it.
        orderBy: { number: "desc" },
      },
    },
  });

  if (!catchup) notFound();

  const series = SERIES_STATUS[catchup.status] ?? SERIES_STATUS.active;
  const title = catchup.title ?? `${catchup.group.name} Catch-ups`;
  const members = catchup.group._count.members;

  return (
    <div className={`flex flex-col gap-6 ${ADMIN_MEASURE}`}>
      <div>
        <Link
          href="/admin/catchups"
          className="mb-2 inline-flex items-center gap-1 rounded-sm text-[12.5px] font-medium text-canopy underline-offset-2 transition-opacity hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy active:opacity-70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Every Catch-up
        </Link>
        <PageHeader title={title} />
        <p className="-mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
          {metaLine(
            `${members} ${members === 1 ? "person" : "people"}`,
            catchup.cadence,
            catchup.createdBy ? `Kept by ${catchup.createdBy.name}` : "No keeper",
            `${catchup.editions.length} ${catchup.editions.length === 1 ? "Edition" : "Editions"}`
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Chip label={series.label} tone={series.tone} />
        </div>
        {/* Said once, at the top, rather than repeated beside every name: what
            this page is, and the one thing about it a member's view does not
            do. Without it the attributed anonymous questions below would read
            as a bug rather than a decision. */}
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
          Reading only. Nothing here writes anything, and opening this page does not add
          you to the Catch-up or show you to the people in it. Questions asked anonymously
          are attributed on this page and nowhere else.
        </p>
      </div>

      {catchup.editions.length === 0 ? (
        <AdminEmpty>This Catch-up has no Editions yet.</AdminEmpty>
      ) : (
        catchup.editions.map((edition) => {
          const status = EDITION_STATUS[edition.status] ?? EDITION_STATUS.draft;
          // The date this Edition is actually waiting on, which depends on where
          // it has got to. Showing all three would say almost nothing.
          const due =
            edition.status === "collecting"
              ? edition.questionsCloseAt
              : edition.status === "answering"
                ? edition.answersCloseAt
                : edition.status === "sealed"
                  ? edition.publishAt
                  : null;
          // Answers live under prompts, so the Edition's own total is a sum
          // rather than a stored number that could disagree with the list.
          const answers = edition.prompts.reduce((n, p) => n + p.entries.length, 0);
          const wroteIn = new Set(
            edition.prompts.flatMap((p) => p.entries.map((e) => e.author.id))
          ).size;

          return (
            /* The number is deliberate here; see the note in
               admin/catchups/(index)/page.tsx. Member-facing surfaces have
               none, the admin room keeps its key, his decision 2026-09-08. */
            <AdminSection key={edition.id} label={`Edition ${edition.number}`} count={edition.prompts.length}>
              <div className="mb-2 flex flex-wrap items-center gap-2 px-0.5">
                <Chip label={status.label} tone={status.tone} />
                <p className="text-[12.5px] text-muted-foreground">
                  {metaLine(
                    edition.theme,
                    edition.status === "sealed"
                      ? null
                      : `${answers} ${answers === 1 ? "answer" : "answers"} from ${wroteIn} ${wroteIn === 1 ? "person" : "people"}`,
                    edition.publishedAt
                      ? `Sent ${formatDisplayDate(edition.publishedAt)}`
                      : due
                        ? `Due ${formatDisplayDate(due)}`
                        : null
                  )}
                </p>
              </div>

              {edition.status === "sealed" ? (
                <AdminEmpty>A time capsule. Nothing in it can be read until it opens, here included.</AdminEmpty>
              ) : edition.prompts.length === 0 ? (
                <AdminEmpty>Nobody has asked anything in this Edition yet.</AdminEmpty>
              ) : (
                <div className="flex flex-col gap-2">
                  {edition.prompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="flex flex-col gap-2.5 rounded-[var(--radius)] border border-border bg-card p-3.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 text-[13.5px] font-semibold leading-snug text-foreground">
                          {prompt.text}
                        </p>
                        {/* Only when it is NOT in the Edition: an accepted
                            question is the ordinary case and does not need a
                            chip on every row saying so. */}
                        {!prompt.accepted && (
                          <Chip label="Not in the Edition" tone="idle" />
                        )}
                      </div>

                      <p className="text-[12px] text-muted-foreground">
                        {prompt.author ? (
                          prompt.showAsker ? (
                            `Asked by ${prompt.author.name}`
                          ) : (
                            <>
                              {/* One sentence rather than "Asked anonymously"
                                  and a name joined by a hand-typed dot, which
                                  the protocol audit rightly refuses -- and
                                  which read as two facts stuck together
                                  instead of the one fact it is. */}
                              Asked anonymously, by{" "}
                              <span className="font-medium text-foreground">
                                {prompt.author.name}
                              </span>
                              {/* The shared Chip in `info`, which the panel
                                  defines as "a system fact, not a judgement" --
                                  which is exactly what this is. The first
                                  version hand-rolled a pill on a
                                  `bg-state-layer` class that does not exist
                                  (state-layer is the hover utility), so the
                                  marker rendered as bare text and the one
                                  thing on this page that needed to stand out
                                  did not. */}
                              <Chip label="Only you see this" tone="info" className="ml-1.5" />
                            </>
                          )
                        ) : (
                          // authorId is SetNull, so a purged account leaves the
                          // question standing with nobody behind it.
                          "Asked by somebody who has since left"
                        )}
                      </p>

                      {prompt.entries.length === 0 ? (
                        <p className="text-[12.5px] text-muted-foreground">
                          Nobody has answered this one.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2.5 border-t border-border pt-2.5">
                          {prompt.entries.map((entry) => (
                            <div key={entry.id} className="flex gap-2.5">
                              <BirdAvatar
                                user={{
                                  id: entry.author.id,
                                  name: entry.author.name,
                                  photoUrl: entry.author.photoUrl,
                                  birdOverride: entry.author.birdOverride,
                                }}
                                size="xs"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] text-muted-foreground">
                                  {metaLine(
                                    entry.author.name,
                                    formatDisplayDate(entry.createdAt),
                                    entry._count.loves > 0
                                      ? `${entry._count.loves} ${entry._count.loves === 1 ? "heart" : "hearts"}`
                                      : null,
                                    entry.songTitle
                                  )}
                                </p>
                                {entry.body && (
                                  /* renderRichText, the same call the member's
                                     own answer card makes, so a mention or a
                                     bold phrase reads here exactly as it does
                                     in the Edition itself. */
                                  <div
                                    className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground"
                                    dangerouslySetInnerHTML={{
                                      __html: renderRichText(entry.body),
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AdminSection>
          );
        })
      )}
    </div>
  );
}
