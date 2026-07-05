import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { CatchupHomeShell } from "@/components/catchups/home/catchup-home-shell";
import type {
  CatchupHomeData,
  CatchupHomeResult,
  HomeArchiveRow,
  HomeEditionView,
  HomePersonRef,
  HomePromptView,
} from "@/components/catchups/home/types";
import {
  advanceEdition,
  ANSWER_WINDOW_DAYS,
  CATCHUP_PROMPT_SETS,
  catchupTitle,
  DAY_MS,
  describeEditionStatus,
  isEffectiveKeeper,
  isMissingCatchupTable,
  type AdvanceEditionInput,
} from "@/lib/catchups";
import type { Cadence, CatchupStatus, EditionStatus, ReminderMode } from "@/lib/catchups-types";

/* ------------------------------------------------------------------ *
 *  The Catch-up home (spec 3.3): the command surface for the live
 *  cycle plus the archive. Asymmetric two-column shape, never a
 *  centered stack - see `home/catchup-home-shell.tsx`.
 *
 *  Every query path is wrapped so a missing Catchup* table (P2021,
 *  pre-migration) renders the shared `<AlmostReady/>` holding scene
 *  instead of a 500 (migration handoff rule 3b).
 * ------------------------------------------------------------------ */

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ catchupId: string }>;
}): Promise<Metadata> {
  const { catchupId } = await params;
  try {
    const catchup = await prisma.catchup.findUnique({
      where: { id: catchupId },
      select: { title: true, group: { select: { name: true } } },
    });
    if (!catchup) return { title: "Catch-ups" };
    return { title: catchupTitle(catchup.title, catchup.group.name) };
  } catch {
    return { title: "Catch-ups" };
  }
}

async function loadHome(catchupId: string, viewerId: string): Promise<CatchupHomeResult> {
  const catchup = await prisma.catchup.findUnique({
    where: { id: catchupId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          members: { select: { user: { select: { id: true, name: true, photoUrl: true } } } },
        },
      },
      createdBy: { select: { id: true, name: true } },
      editions: {
        orderBy: { number: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          questionsCloseAt: true,
          answersCloseAt: true,
          publishAt: true,
          publishedAt: true,
          remindersSent: true,
          createdAt: true,
        },
      },
    },
  });
  if (!catchup) return { kind: "not-found" };

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: catchup.groupId, userId: viewerId } },
    select: { role: true },
  });
  if (!membership) return { kind: "not-member", groupId: catchup.groupId, groupName: catchup.group.name };

  const isKeeper = isEffectiveKeeper({
    viewerId,
    createdById: catchup.createdById,
    groupRole: membership.role,
  });

  // Lazy read-time advance (spec 2.4): bring the latest Round current on every
  // home visit, on top of the global app-shell piggyback (WP7).
  const latestRaw = catchup.editions[0] ?? null;
  if (latestRaw) {
    const advanceInput: AdvanceEditionInput = {
      id: latestRaw.id,
      catchupId: catchup.id,
      status: latestRaw.status as EditionStatus,
      questionsCloseAt: latestRaw.questionsCloseAt,
      answersCloseAt: latestRaw.answersCloseAt,
      publishAt: latestRaw.publishAt,
      publishedAt: latestRaw.publishedAt,
      remindersSent: latestRaw.remindersSent,
      catchup: {
        cadence: catchup.cadence,
        status: catchup.status,
        group: { id: catchup.group.id, name: catchup.group.name },
      },
    };
    await advanceEdition(advanceInput);
  }

  const freshLatest = latestRaw
    ? await prisma.catchupEdition.findUnique({
        where: { id: latestRaw.id },
        include: {
          prompts: {
            include: { author: { select: { id: true, name: true, photoUrl: true } } },
          },
        },
      })
    : null;

  const members: HomePersonRef[] = catchup.group.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    photoUrl: m.user.photoUrl,
  }));
  const viewerName = members.find((m) => m.id === viewerId)?.name ?? "You";

  let editionView: HomeEditionView | null = null;

  if (freshLatest) {
    const status = freshLatest.status as EditionStatus;
    const now = Date.now();

    let answeredAuthorIds: string[] = [];
    if (status === "answering" || status === "preparing") {
      const distinct = await prisma.catchupEntry.findMany({
        where: { editionId: freshLatest.id },
        select: { authorId: true },
        distinct: ["authorId"],
      });
      answeredAuthorIds = distinct.map((d) => d.authorId);
    }

    let promptPool =
      status === "collecting"
        ? freshLatest.prompts
        : status === "answering"
          ? freshLatest.prompts.filter((p) => p.accepted)
          : [];

    // Anonymity boundary: never send another member's identity for a
    // question they asked anonymously - hiding it only in the rendered UI
    // would still leak it in the payload. Non-Keepers also never see other
    // members' still-pending submissions (spec 3.3.1: "the Keeper sees all").
    if (!isKeeper) {
      promptPool = promptPool.filter((p) => p.accepted || p.authorId === viewerId);
    }

    const accepted = promptPool
      .filter((p) => p.accepted)
      .sort((a, b) => a.position - b.position);
    const pending = promptPool
      .filter((p) => !p.accepted)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const prompts: HomePromptView[] = [...accepted, ...pending].map((p) => {
      const isOwn = p.authorId === viewerId;
      const revealAsker = p.showAsker || isOwn;
      return {
        id: p.id,
        text: p.text,
        category: p.category,
        accepted: p.accepted,
        position: p.position,
        showAsker: p.showAsker,
        isOwn,
        author: revealAsker
          ? { id: p.author.id, name: p.author.name, photoUrl: p.author.photoUrl }
          : null,
      };
    });

    let ringRatio = 0;
    if (status === "collecting" && freshLatest.questionsCloseAt) {
      const close = freshLatest.questionsCloseAt.getTime();
      const start = freshLatest.createdAt.getTime();
      ringRatio = clamp01((now - start) / Math.max(1, close - start));
    } else if (status === "answering" && freshLatest.answersCloseAt) {
      const close = freshLatest.answersCloseAt.getTime();
      const start = close - ANSWER_WINDOW_DAYS * DAY_MS;
      ringRatio = clamp01((now - start) / Math.max(1, close - start));
    }

    editionView = {
      id: freshLatest.id,
      number: freshLatest.number,
      status,
      questionsCloseAt: freshLatest.questionsCloseAt?.toISOString() ?? null,
      answersCloseAt: freshLatest.answersCloseAt?.toISOString() ?? null,
      publishAt: freshLatest.publishAt?.toISOString() ?? null,
      publishedAt: freshLatest.publishedAt?.toISOString() ?? null,
      statusLabel: describeEditionStatus(
        { status, number: freshLatest.number, questionsCloseAt: freshLatest.questionsCloseAt, answersCloseAt: freshLatest.answersCloseAt },
        new Date(now)
      ),
      ringRatio,
      prompts,
      answeredCount: answeredAuthorIds.length,
      answeredAuthorIds,
    };
  }

  // Archive: every published Round (spec 3.7), including the latest if it just published.
  const publishedEditions = await prisma.catchupEdition.findMany({
    where: { catchupId: catchup.id, status: "published" },
    orderBy: { number: "desc" },
    select: { id: true, number: true, publishedAt: true },
  });

  const archive: HomeArchiveRow[] = [];
  for (const ed of publishedEditions) {
    const entries = await prisma.catchupEntry.findMany({
      where: { editionId: ed.id },
      select: { authorId: true, body: true, _count: { select: { loves: true } } },
    });
    const contributorCount = new Set(entries.map((e) => e.authorId)).size;
    const top = entries
      .filter((e) => e.body && e.body.trim().length > 0)
      .sort((a, b) => b._count.loves - a._count.loves)[0];
    const teaser = top?.body
      ? top.body.length > 140
        ? `${top.body.slice(0, 140).trimEnd()}...`
        : top.body
      : null;
    archive.push({
      editionId: ed.id,
      number: ed.number,
      publishedAt: ed.publishedAt?.toISOString() ?? null,
      contributorCount,
      teaser,
    });
  }

  const pref = await prisma.catchupPref.findUnique({
    where: { catchupId_userId: { catchupId: catchup.id, userId: viewerId } },
    select: { reminderMode: true },
  });

  const data: CatchupHomeData = {
    catchupId: catchup.id,
    groupId: catchup.groupId,
    groupName: catchup.group.name,
    title: catchupTitle(catchup.title, catchup.group.name),
    cadence: catchup.cadence as Cadence,
    catchupStatus: catchup.status as CatchupStatus,
    keeperName: catchup.createdBy?.name ?? null,
    members,
    memberCount: members.length,
    viewer: {
      id: viewerId,
      name: viewerName,
      isKeeper,
      reminderMode: (pref?.reminderMode as ReminderMode) ?? "all",
    },
    edition: editionView,
    archive,
    promptLibrary: CATCHUP_PROMPT_SETS,
  };

  return { kind: "ok", ...data };
}

function NotAvailableCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-muted-foreground">{body}</p>
        {cta && (
          <Link href={cta.href} className="mt-5 inline-flex">
            <Button variant="primary">{cta.label}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function CatchupHomePage({
  params,
}: {
  params: Promise<{ catchupId: string }>;
}) {
  const { catchupId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let result: CatchupHomeResult;
  try {
    result = await loadHome(catchupId, session.user.id);
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

  if (result.kind === "not-found") {
    return (
      <NotAvailableCard
        title="This Catch-up is not available."
        body="It may have been removed, or this link points somewhere that no longer exists."
        cta={{ href: "/catchups", label: "Back to Catch-ups" }}
      />
    );
  }

  if (result.kind === "not-member") {
    return (
      <NotAvailableCard
        title="This Catch-up is for group members."
        body={`Join ${result.groupName} to add questions, answer, and read the archive.`}
        cta={{ href: `/groups/${result.groupId}`, label: "View the group" }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={result.title}
        subtitle={`A gentle round of questions for ${result.groupName}, answered together and gathered into one issue.`}
      />
      <CatchupHomeShell data={result} />
    </div>
  );
}
