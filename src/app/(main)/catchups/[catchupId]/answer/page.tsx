/* eslint-disable react-hooks/error-boundaries --
   Async Server Component. The try/catch guards the awaited Prisma calls (the
   Catch-up tables can be absent before a push); the JSX inside it is only the
   value those branches return, and is never rendered inside the try. An error
   boundary cannot do this job, because the failure happens during the await. */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";
import {
  advanceEdition,
  askerVisible,
  catchupSurfaceTitle,
  isMissingCatchupTable,
  answersCloseSentence,
  type AdvanceEditionInput,
} from "@/lib/catchups";
import { promptKind, type EditionStatus, type PromptCategory } from "@/lib/catchups-types";
import { PageHeader } from "@/components/layout/page-header";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { NotAvailableCard } from "@/components/catchups/not-available";
import { AnswerRedirect } from "@/components/catchups/answer/answer-redirect";
import { AnswerExperience } from "@/components/catchups/answer/answer-experience";
import type { AnswerPromptData } from "@/components/catchups/answer/types";
import { IDENTITY_SELECT } from "@/lib/people-select";

/* ------------------------------------------------------------------ *
 *  /catchups/[catchupId]/answer — spec 3.4, the answering experience.
 *
 *  Loads the Catch-up's latest Edition, brings it current with the same
 *  lazy-advance touchpoint every other Catch-ups surface uses
 *  (`advanceEdition`, spec 2.4), then either hands off to the two-pane
 *  <AnswerExperience> (status === answering) or bounces to the Catch-up
 *  home with a toast for every other status (spec 3.4 edge state).
 * ------------------------------------------------------------------ */

function redirectMessageFor(status: EditionStatus, groupName: string): string {
  switch (status) {
    case "draft":
      return `${groupName}'s Catch-up has not opened its Edition yet.`;
    case "collecting":
      return "Questions are still open. Answering starts once the Keeper opens it.";
    case "preparing":
      return "Answers are in. This Edition is being put together.";
    case "published":
      return "This Edition is already out. Come read it.";
    default:
      return "Answering is not open for this Edition right now.";
  }
}

function closesLabel(at: Date | null): string {
  if (!at) return "Answering now.";
  /* Calendar days in the valley, not 24-hour windows. `Math.ceil` on the
     millisecond gap called anything under a day "today", so a deadline at 5pm
     tomorrow read "Answers close today" to somebody looking at 6pm this
     evening -- a whole day early, in the one sentence that exists to say when
     to write by (audit Low 28). The shared `valleyDaysLeft` is the same count
     the index card, the masthead and the bell now use, so no two surfaces can
     name a different last day again (audits C-141/C-031). */
  return answersCloseSentence(at, new Date());
}

const editionSelect = {
  id: true,
  number: true,
  status: true,
  questionsCloseAt: true,
  answersCloseAt: true,
  publishAt: true,
  publishedAt: true,
  remindersSent: true,
} as const;

export default async function CatchupAnswerPage({
  params,
}: {
  params: Promise<{ catchupId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { catchupId } = await params;

  try {
    const catchup = await prisma.catchup.findUnique({
      where: { id: catchupId },
      select: {
        id: true,
        title: true,
        cadence: true,
        status: true,
        group: { select: { id: true, name: true } },
      },
    });

    if (!catchup) {
      return (
        <NotAvailableCard
          title="This Catch-up is not available."
          body="It may have been removed, or this link points somewhere that no longer exists."
          cta={{ href: "/catchups", label: "Back to Catch-ups" }}
        />
      );
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: catchup.group.id, userId: session.user.id } },
      select: { id: true },
    });

    if (!membership) {
      // Was `/groups/${catchup.group.id}` -- groups have no user-facing page
      // anymore (dead route, owner review 2026-07-25). The viewer already
      // isn't a member here, so this Catch-up's own URL would just bounce
      // them back to this same wall; the index is the one place that
      // actually goes somewhere.
      return (
        <NotAvailableCard
          title="This Catch-up is for group members."
          body={`Join ${catchup.group.name} to add questions, answer, and read the archive.`}
          cta={{ href: "/catchups", label: "Back to Catch-ups" }}
        />
      );
    }

    // A paused Catch-up is frozen: its home shows a calm banner and no way in,
    // so the direct /answer URL says the same thing rather than quietly working
    // (audit B-061). Checked before the advance, which is itself a no-op while
    // frozen.
    if (catchup.status !== "active") {
      return (
        <NotAvailableCard
          title={
            catchup.status === "paused"
              ? "This Catch-up is paused."
              : "This Catch-up has ended."
          }
          body={
            catchup.status === "paused"
              ? "Answering picks up where it left off when the Keeper resumes it."
              : "Its published Editions are still there to read."
          }
          cta={{ href: `/catchups/${catchup.id}`, label: "Go to the Catch-up" }}
        />
      );
    }

    const latestEdition = await prisma.catchupEdition.findFirst({
      where: { catchupId: catchup.id },
      orderBy: { number: "desc" },
      select: editionSelect,
    });

    if (!latestEdition) {
      return (
        <NotAvailableCard
          title="This Catch-up has not opened an Edition yet."
          body="Check back once the first Edition starts collecting questions."
          cta={{ href: `/catchups/${catchup.id}`, label: "Go to the Catch-up" }}
        />
      );
    }

    // Lazy read-time advance (spec 2.4): bring this Edition to the status the
    // clock justifies before deciding whether answering is actually open.
    await advanceEdition({
      catchupId: catchup.id,
      ...latestEdition,
      catchup: { cadence: catchup.cadence, status: catchup.status, group: catchup.group },
    } as AdvanceEditionInput);

    const edition = await prisma.catchupEdition.findUnique({
      where: { id: latestEdition.id },
      select: editionSelect,
    });

    if (!edition) {
      return (
        <NotAvailableCard
          title="This Catch-up is not available."
          body="This Edition may have been removed."
          cta={{ href: `/catchups/${catchup.id}`, label: "Go to the Catch-up" }}
        />
      );
    }

    if (edition.status !== "answering") {
      return (
        <AnswerRedirect
          href={`/catchups/${catchup.id}`}
          message={redirectMessageFor(edition.status as EditionStatus, catchup.group.name)}
        />
      );
    }

    const [prompts, myEntries, answererRows] = await Promise.all([
      prisma.catchupPrompt.findMany({
        where: { editionId: edition.id, accepted: true },
        /* A createdAt tie-break, so two questions that end up sharing a
           position (a pair submitted in the same instant) still render in a
           stable, sensible order rather than shuffling between renders
           (audit Lows 27/34/57). */
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          text: true,
          category: true,
          showAsker: true,
          author: { select: IDENTITY_SELECT },
        },
      }),
      prisma.catchupEntry.findMany({
        where: { editionId: edition.id, authorId: session.user.id },
        select: { promptId: true, body: true, images: true, updatedAt: true },
      }),
      prisma.catchupEntry.findMany({
        where: { editionId: edition.id },
        distinct: ["authorId"],
        select: { authorId: true, author: { select: IDENTITY_SELECT } },
      }),
    ]);

    if (prompts.length === 0) {
      return (
        <NotAvailableCard
          title="No questions in this Edition yet."
          body="Check back once the Keeper has added a few questions to answer."
          cta={{ href: `/catchups/${catchup.id}`, label: "Go to the Catch-up" }}
        />
      );
    }

    const myEntryByPrompt = new Map(myEntries.map((e) => [e.promptId, e]));
    const promptData: AnswerPromptData[] = prompts.map((p) => {
      const entry = myEntryByPrompt.get(p.id);
      return {
        id: p.id,
        text: p.text,
        // The category doubles as the question's kind (photo-wall / songs
        // switch the answering control; everything else writes text).
        kind: promptKind(p.category as PromptCategory | null),
        // The one helper, like every other surface that names an asker. Its
        // shape is what stops a Keeper exception growing back into one of
        // them (audit C-019); the difference it makes here is that an
        // anonymous asker sees their own byline on their own question.
        asker: askerVisible({ showAsker: p.showAsker, authorId: p.author?.id ?? null }, session.user.id)
          ? p.author
          : null,
        entry: {
          body: entry?.body ?? "",
          images: parseJsonArray(entry?.images),
        },
        entryUpdatedAt: entry?.updatedAt.toISOString() ?? null,
      };
    });

    const others = answererRows.filter((r) => r.authorId !== session.user.id);

    return (
      <div>
        <Link
          href={`/catchups/${catchup.id}`}
          className="mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {catchupSurfaceTitle(catchup.title, catchup.group.name)}
        </Link>

        {/* "Answering", not "Edition 4": Edition numbers are gone (spec
            section 3.3) and this Edition has no date yet -- it gets one when
            it publishes. The back-link above already names the Catch-up and
            the subtitle already carries the deadline, so the title says the
            one thing neither of them does, which is what you are here to
            do. */}
        <PageHeader title="Answering" subtitle={closesLabel(edition.answersCloseAt)} />

        <AnswerExperience
          catchupId={catchup.id}
          groupName={catchup.group.name}
          prompts={promptData}
          othersAnsweredCount={others.length}
          clusterPeople={others.slice(0, 3).map((r) => r.author)}
        />
      </div>
    );
  } catch (err) {
    if (isMissingCatchupTable(err)) {
      return (
        <div>
          <PageHeader title="Catch-ups" />
          <AlmostReady />
        </div>
      );
    }
    throw err;
  }
}
