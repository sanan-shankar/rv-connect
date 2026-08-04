import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { CatchupHomeShell } from "@/components/catchups/home/catchup-home-shell";
import type { PublishedIssue } from "@/components/catchups/home/console-published";
import type { RoundEntry } from "@/components/catchups/round/answer-card";
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
  CATCHUP_PROMPT_SETS,
  editionCountdownLabel,
  isEffectiveKeeper,
  isMissingCatchupTable,
  type AdvanceEditionInput,
} from "@/lib/catchups";
import type {
  Cadence,
  CatchupPersonRef,
  CatchupPromptView,
  CatchupStatus,
  EditionStatus,
  PromptCategory,
  PromptSource,
  ReminderMode,
} from "@/lib/catchups-types";
import { batchLine, parseJsonArray } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  The Catch-up home (spec 3.3): the command surface for the live
 *  cycle plus the archive. Asymmetric two-column shape, never a
 *  centered stack - see `home/catchup-home-shell.tsx`.
 *
 *  Every query path is wrapped so a missing Catchup* table (P2021,
 *  pre-migration) renders the shared `<AlmostReady/>` holding scene
 *  instead of a 500 (migration handoff rule 3b).
 * ------------------------------------------------------------------ */

/**
 * This screen names the Catch-up without adding "catch-up" to the visible
 * heading. A Keeper's custom title wins; otherwise the group name stands on
 * its own.
 */
function homeTitle(title: string | null | undefined, groupName: string): string {
  return title?.trim() || groupName;
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
    return { title: homeTitle(catchup.title, catchup.group.name) };
  } catch {
    return { title: "Catch-ups" };
  }
}

/**
 * The published Round, in full, for reading inline on this page (one surface,
 * owner review 2026-07-25). Only ever called once the caller has confirmed the
 * fresh status is `published`: answer bodies are never pulled into a render of
 * a Round that has not revealed yet, Keeper included (spec 2.5, threat
 * T-catchups-04). Mirrors the heavy query in `round/[editionId]/page.tsx`.
 */
async function loadPublishedIssue(
  editionId: string,
  viewerId: string,
  isKeeper: boolean
): Promise<PublishedIssue | null> {
  const round = await prisma.catchupEdition.findUnique({
    where: { id: editionId },
    select: {
      publishedAt: true,
      prompts: {
        where: { accepted: true },
        orderBy: { position: "asc" },
        select: {
          id: true,
          text: true,
          category: true,
          source: true,
          showAsker: true,
          accepted: true,
          position: true,
          author: { select: { id: true, name: true, photoUrl: true, birdOverride: true } },
          entries: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              promptId: true,
              body: true,
              images: true,
              songUrl: true,
              songTitle: true,
              songArt: true,
              createdAt: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  photoUrl: true,
                  birdOverride: true,
                  accountType: true,
                  batchType: true,
                  batchYear: true,
                },
              },
              _count: { select: { loves: true } },
              loves: { where: { userId: viewerId }, select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!round) return null;

  const toPersonRef = (u: {
    id: string;
    name: string;
    photoUrl: string | null;
    birdOverride?: string | null;
  }): CatchupPersonRef => ({
    id: u.id,
    name: u.name,
    photoUrl: u.photoUrl,
    birdOverride: u.birdOverride,
  });

  const sections = round.prompts.map((p) => {
    const askerVisible = p.showAsker || isKeeper;
    const prompt: CatchupPromptView = {
      id: p.id,
      text: p.text,
      category: p.category as PromptCategory | null,
      source: p.source as PromptSource,
      showAsker: p.showAsker,
      accepted: p.accepted,
      position: p.position,
      asker: askerVisible ? toPersonRef(p.author) : null,
    };
    const entries: RoundEntry[] = p.entries.map((e) => ({
      id: e.id,
      promptId: e.promptId,
      author: toPersonRef(e.author),
      authorMeta: batchLine(e.author),
      body: e.body,
      images: parseJsonArray(e.images),
      song: e.songUrl ? { url: e.songUrl, title: e.songTitle ?? e.songUrl, art: e.songArt } : null,
      loveCount: e._count.loves,
      lovedByViewer: e.loves.length > 0,
      createdAt: e.createdAt,
    }));
    return { prompt, entries };
  });

  return {
    publishedAt: round.publishedAt?.toISOString() ?? null,
    sections,
  };
}

async function loadHome(catchupId: string, viewerId: string): Promise<CatchupHomeResult> {
  const catchup = await prisma.catchup.findUnique({
    where: { id: catchupId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          members: { select: { user: { select: { id: true, name: true, photoUrl: true, birdOverride: true } } } },
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
            include: { author: { select: { id: true, name: true, photoUrl: true, birdOverride: true } } },
          },
        },
      })
    : null;

  // Viewer first: MemberStrip shows only its first `max`, and someone who
  // fell off the end of an unordered list read that as not being a member at
  // all (owner, 2026-08-04).
  const members: HomePersonRef[] = catchup.group.members
    .map((m) => ({
      id: m.user.id,
      name: m.user.name,
      photoUrl: m.user.photoUrl,
      birdOverride: m.user.birdOverride,
    }))
    .sort((a, b) => (a.id === viewerId ? -1 : b.id === viewerId ? 1 : 0));
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
          ? { id: p.author.id, name: p.author.name, photoUrl: p.author.photoUrl, birdOverride: p.author.birdOverride }
          : null,
      };
    });

    editionView = {
      id: freshLatest.id,
      number: freshLatest.number,
      status,
      questionsCloseAt: freshLatest.questionsCloseAt?.toISOString() ?? null,
      answersCloseAt: freshLatest.answersCloseAt?.toISOString() ?? null,
      publishAt: freshLatest.publishAt?.toISOString() ?? null,
      publishedAt: freshLatest.publishedAt?.toISOString() ?? null,
      countdownLabel: editionCountdownLabel(
        {
          status,
          questionsCloseAt: freshLatest.questionsCloseAt,
          answersCloseAt: freshLatest.answersCloseAt,
        },
        new Date(now)
      ),
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
    inviteToken: catchup.inviteToken,
    groupId: catchup.groupId,
    groupName: catchup.group.name,
    title: homeTitle(catchup.title, catchup.group.name),
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
    <div className="mx-auto max-w-2xl text-center">
      {/* Symmetric padding, one LiftKit token, same as every other Catch-ups
          tile. It was `p-12`: an arbitrary step, and far bigger than the copy
          it held (owner review 2026-07-25). */}
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)]">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-[var(--space-xs)] text-muted-foreground">{body}</p>
        {cta && (
          <Link href={cta.href} className="mt-[var(--space-m)] inline-flex">
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
  let issue: PublishedIssue | null = null;
  try {
    result = await loadHome(catchupId, session.user.id);
    if (result.kind === "ok" && result.edition?.status === "published") {
      issue = await loadPublishedIssue(result.edition.id, session.user.id, result.viewer.isKeeper);
    }
  } catch (err) {
    if (isMissingCatchupTable(err)) {
      return (
        <div>
          <PageHeader title="Catch-ups" />
          {/* Explicit copy: the component's own default body still carries the
              banned "gentle"/"warm" words (fix brief rule B). */}
          <AlmostReady title="Catch-ups are almost ready." body="Check back in a moment." />
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
    // Was `/groups/${result.groupId}` -- groups have no user-facing page
    // anymore (dead route, owner review 2026-07-25). The viewer already
    // isn't a member here, so this Catch-up's own URL would just bounce them
    // back to this same wall; the index is the one place that actually goes
    // somewhere.
    return (
      <NotAvailableCard
        title="This Catch-up is for group members."
        body={`Join ${result.groupName} to add questions, answer, and read the archive.`}
        cta={{ href: "/catchups", label: "Back to Catch-ups" }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={
          result.edition?.countdownLabel
            ? `${result.title} · ${result.edition.countdownLabel}`
            : result.title
        }
      />
      <CatchupHomeShell data={result} issue={issue} />
    </div>
  );
}
