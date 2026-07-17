import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";
import { advanceEdition, catchupTitle, isMissingCatchupTable, type AdvanceEditionInput } from "@/lib/catchups";
import type { EditionStatus } from "@/lib/catchups-types";
import { PageHeader } from "@/components/layout/page-header";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { NotAvailableCard } from "@/components/catchups/answer/not-available";
import { AnswerRedirect } from "@/components/catchups/answer/answer-redirect";
import { AnswerExperience } from "@/components/catchups/answer/answer-experience";
import type { AnswerPromptData } from "@/components/catchups/answer/types";

/* ------------------------------------------------------------------ *
 *  /catchups/[catchupId]/answer — spec 3.4, the answering experience.
 *
 *  Loads the Catch-up's latest Round, brings it current with the same
 *  lazy-advance touchpoint every other Catch-ups surface uses
 *  (`advanceEdition`, spec 2.4), then either hands off to the two-pane
 *  <AnswerExperience> (status === answering) or bounces to the Catch-up
 *  home with a toast for every other status (spec 3.4 edge state).
 * ------------------------------------------------------------------ */

function redirectMessageFor(status: EditionStatus, groupName: string): string {
  switch (status) {
    case "draft":
      return `${groupName}'s Catch-up has not opened its Round yet.`;
    case "collecting":
      return "Questions are still open. Answering starts once the Keeper opens it.";
    case "preparing":
      return "Answers are in. This Round is being put together.";
    case "published":
      return "This Round is already out. Come read it.";
    default:
      return "Answering is not open for this Round right now.";
  }
}

function closesLabel(at: Date | null): string {
  if (!at) return "Answering now.";
  const diff = at.getTime() - Date.now();
  if (diff <= 0) return "Answers are closing.";
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days <= 1) return "Answers close today.";
  return `Answers close in ${days} days.`;
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
      return (
        <NotAvailableCard
          title="This Catch-up is for group members."
          body={`Join ${catchup.group.name} to add questions, answer, and read the archive.`}
          cta={{ href: `/groups/${catchup.group.id}`, label: "View the group" }}
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
          title="This Catch-up has not opened a Round yet."
          body="Check back once the first Round starts collecting questions."
          cta={{ href: `/catchups/${catchup.id}`, label: "Go to the Catch-up" }}
        />
      );
    }

    // Lazy read-time advance (spec 2.4): bring this Round to the status the
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
          body="This Round may have been removed."
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
        orderBy: { position: "asc" },
        select: {
          id: true,
          text: true,
          showAsker: true,
          author: { select: { id: true, name: true, photoUrl: true, birdOverride: true } },
        },
      }),
      prisma.catchupEntry.findMany({
        where: { editionId: edition.id, authorId: session.user.id },
        select: { promptId: true, body: true, images: true, songUrl: true, songTitle: true, songArt: true },
      }),
      prisma.catchupEntry.findMany({
        where: { editionId: edition.id },
        distinct: ["authorId"],
        select: { authorId: true, author: { select: { id: true, name: true, photoUrl: true, birdOverride: true } } },
      }),
    ]);

    if (prompts.length === 0) {
      return (
        <NotAvailableCard
          title="No questions in this Round yet."
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
        asker: p.showAsker ? p.author : null,
        entry: {
          body: entry?.body ?? "",
          images: parseJsonArray(entry?.images),
          song: entry?.songUrl
            ? { url: entry.songUrl, title: entry.songTitle ?? entry.songUrl, art: entry.songArt }
            : null,
        },
      };
    });

    const others = answererRows.filter((r) => r.authorId !== session.user.id);

    return (
      <div>
        <Link
          href={`/catchups/${catchup.id}`}
          className="mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {catchupTitle(catchup.title, catchup.group.name)}
        </Link>

        <PageHeader title={`Round ${edition.number}`} subtitle={closesLabel(edition.answersCloseAt)} />

        <AnswerExperience
          catchupId={catchup.id}
          groupName={catchup.group.name}
          prompts={promptData}
          currentUser={{
            id: session.user.id,
            name: session.user.name,
            photoUrl: session.user.photoUrl,
            birdOverride: session.user.birdOverride,
          }}
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
