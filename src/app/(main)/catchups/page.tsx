import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { ExplainerBand } from "@/components/catchups/index/explainer-band";
import { YourCatchupsCard } from "@/components/catchups/index/your-catchups-card";
import { FreshOffThePress, type FreshRoundItem } from "@/components/catchups/index/fresh-off-the-press";
import { GroupFirstGuidance } from "@/components/catchups/index/group-first-guidance";
import { advanceDueCatchups, describeEditionStatus, isMissingCatchupTable } from "@/lib/catchups";
import type { CatchupIndexCard, CatchupStatus, EditionStatus } from "@/lib/catchups-types";

export const metadata: Metadata = {
  title: "Catch-ups",
};

/** Forward-only urgency order for sorting "Your Catch-ups": live cycles first. */
const STATUS_PRIORITY: Partial<Record<EditionStatus, number>> = {
  answering: 0,
  collecting: 1,
  preparing: 2,
  draft: 3,
  published: 4,
};

function buildCta(opts: {
  catchupStatus: CatchupStatus;
  editionStatus: EditionStatus | null;
  catchupId: string;
  editionId: string | null;
}): { label: string; href: string } {
  const { catchupStatus, editionStatus, catchupId, editionId } = opts;
  if (catchupStatus === "ended") return { label: "View archive", href: `/catchups/${catchupId}` };
  if (catchupStatus === "paused") return { label: "View", href: `/catchups/${catchupId}` };

  switch (editionStatus) {
    case "answering":
      return { label: "Answer now", href: `/catchups/${catchupId}/answer` };
    case "published":
      return {
        label: "Read the Round",
        href: editionId ? `/catchups/round/${editionId}` : `/catchups/${catchupId}`,
      };
    case "preparing":
      return { label: "View", href: `/catchups/${catchupId}` };
    case "collecting":
    default:
      return { label: "Add a question", href: `/catchups/${catchupId}` };
  }
}

function truncate(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}...` : clean;
}

async function loadIndexData(userId: string) {
  // Lazy read-time advance (spec 2.4): bring every stale Round in the
  // viewer's groups current before building the cards below. Never throws.
  await advanceDueCatchups(userId);

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          members: {
            take: 6,
            select: { user: { select: { id: true, name: true, photoUrl: true } } },
          },
          catchup: {
            select: {
              id: true,
              status: true,
              editions: {
                orderBy: { number: "desc" },
                take: 1,
                select: {
                  id: true,
                  number: true,
                  status: true,
                  questionsCloseAt: true,
                  answersCloseAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const now = new Date();
  const cards: CatchupIndexCard[] = memberships.map(({ group }) => {
    const members = group.members.map((m) => m.user);

    if (!group.catchup) {
      return {
        groupId: group.id,
        groupName: group.name,
        members,
        catchupId: null,
        catchupStatus: null,
        editionId: null,
        editionStatus: null,
        roundNumber: null,
        statusLine: "No Catch-up here yet",
        cta: { label: "Start one", href: `/catchups/new?group=${group.id}` },
      };
    }

    const catchupStatus = group.catchup.status as CatchupStatus;
    const rawEdition = group.catchup.editions[0] ?? null;
    const edition = rawEdition ? { ...rawEdition, status: rawEdition.status as EditionStatus } : null;

    const statusLine =
      catchupStatus === "paused"
        ? "Paused"
        : catchupStatus === "ended"
          ? "Ended"
          : edition
            ? describeEditionStatus(edition, now)
            : "Getting started";

    return {
      groupId: group.id,
      groupName: group.name,
      members,
      catchupId: group.catchup.id,
      catchupStatus,
      editionId: edition?.id ?? null,
      editionStatus: edition?.status ?? null,
      roundNumber: edition?.number ?? null,
      statusLine,
      cta: buildCta({
        catchupStatus,
        editionStatus: edition?.status ?? null,
        catchupId: group.catchup.id,
        editionId: edition?.id ?? null,
      }),
    };
  });

  cards.sort((a, b) => {
    const pa = a.catchupId ? (STATUS_PRIORITY[a.editionStatus ?? "draft"] ?? 50) : 90;
    const pb = b.catchupId ? (STATUS_PRIORITY[b.editionStatus ?? "draft"] ?? 50) : 90;
    if (pa !== pb) return pa - pb;
    return a.groupName.localeCompare(b.groupName);
  });

  const freshEditions = await prisma.catchupEdition.findMany({
    where: {
      status: "published",
      catchup: { group: { members: { some: { userId } } } },
    },
    orderBy: { publishedAt: "desc" },
    take: 6,
    select: {
      id: true,
      number: true,
      publishedAt: true,
      catchup: { select: { group: { select: { name: true } } } },
      entries: { select: { authorId: true, body: true, _count: { select: { loves: true } } } },
    },
  });

  const freshItems: FreshRoundItem[] = freshEditions.map((ed) => {
    const contributorCount = new Set(ed.entries.map((e) => e.authorId)).size;
    const best = ed.entries
      .filter((e) => e.body && e.body.trim().length > 0)
      .sort((a, b) => b._count.loves - a._count.loves)[0];
    return {
      editionId: ed.id,
      number: ed.number,
      groupName: ed.catchup.group.name,
      publishedAt: ed.publishedAt,
      contributorCount,
      teaser: best?.body ? truncate(best.body, 110) : null,
    };
  });

  return { cards, freshItems, hasGroups: memberships.length > 0 };
}

export default async function CatchupsPage() {
  const session = await auth();
  if (!session?.user) return null;

  let data: Awaited<ReturnType<typeof loadIndexData>> | null = null;
  try {
    data = await loadIndexData(session.user.id);
  } catch (err) {
    if (!isMissingCatchupTable(err)) throw err;
  }

  if (!data) {
    return (
      <div>
        <PageHeader
          title="Catch-ups"
          subtitle="A gentle group newsletter: everyone answers a few prompts, and their replies are gathered into one issue."
        />
        <AlmostReady />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Catch-ups"
        subtitle="A gentle group newsletter: everyone answers a few prompts, and their replies are gathered into one issue."
      />

      <div className="mb-7">
        <ExplainerBand />
      </div>

      {!data.hasGroups ? (
        <GroupFirstGuidance />
      ) : (
        <div className="grid grid-cols-1 gap-x-[30px] gap-y-6 min-[1180px]:grid-cols-[minmax(0,1fr)_318px]">
          <div className="min-w-0 space-y-3.5">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              Your Catch-ups
            </h2>
            {data.cards.map((card) => (
              <YourCatchupsCard key={card.groupId} card={card} />
            ))}
          </div>
          <aside className="hidden min-[1180px]:block">
            <div className="sticky top-7">
              <FreshOffThePress items={data.freshItems} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
