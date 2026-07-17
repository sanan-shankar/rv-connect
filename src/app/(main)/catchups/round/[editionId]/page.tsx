/* ------------------------------------------------------------------ *
 *  The published Round reader (spec 3.6) - the crown jewel of Catch-ups.
 *
 *  Two-phase load, mirroring `loadFreshEdition` in ../../actions.ts:
 *   1. A LIGHT query (timestamps + Catchup/Group meta only) so the lazy
 *      read-time advance (spec 2.4) can bring the stored status current
 *      before we decide what to render - a deep link visited right as
 *      `answersCloseAt` passes must show the preparing ritual, not stale
 *      "answering" state, and a Round that has already reached its
 *      `publishAt` must reveal, not sit stuck in preparing forever because
 *      nobody happened to load the Catch-up home first.
 *   2. Only once that fresh status is confirmed `published` do we run the
 *      HEAVY query (every prompt, every entry, every love). This is
 *      defense in depth for the preparing-window secrecy rule (spec 2.5,
 *      threat T-catchups-04): answer bodies are never even pulled into a
 *      server render for a Round that is not published yet, Keeper
 *      included.
 *
 *  Every query path is wrapped so a missing table (P2021, pre-migration)
 *  renders the shared <AlmostReady/> holding scene instead of a 500.
 * ------------------------------------------------------------------ */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  advanceEdition,
  catchupTitle,
  isEffectiveKeeper,
  isMissingCatchupTable,
  roundLabel,
  type AdvanceEditionInput,
} from "@/lib/catchups";
import type {
  CatchupPersonRef,
  CatchupPromptView,
  EditionStatus,
  PromptCategory,
  PromptSource,
} from "@/lib/catchups-types";
import { batchLine, parseJsonArray } from "@/lib/utils";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { RoundMasthead } from "@/components/catchups/round/masthead";
import { RoundTocRail, RoundTocChips, type TocItem } from "@/components/catchups/round/toc";
import { QuestionSection } from "@/components/catchups/round/question-section";
import { RoundFooterTease } from "@/components/catchups/round/footer-tease";
import { PublishNowButton } from "@/components/catchups/round/publish-now-button";
import { NotYetPublished } from "@/components/catchups/round/not-yet-published";
import type { RoundEntry } from "@/components/catchups/round/answer-card";

const LIGHT_EDITION_SELECT = {
  id: true,
  catchupId: true,
  number: true,
  status: true,
  questionsCloseAt: true,
  answersCloseAt: true,
  publishAt: true,
  publishedAt: true,
  remindersSent: true,
  catchup: {
    select: {
      id: true,
      title: true,
      cadence: true,
      status: true,
      createdById: true,
      nextOpensAt: true,
      group: { select: { id: true, name: true } },
    },
  },
} as const;

type LightEdition = Prisma.CatchupEditionGetPayload<{ select: typeof LIGHT_EDITION_SELECT }>;

/** Bring one Round's status current against the clock, then return the fresh row. */
async function loadFreshEdition(editionId: string): Promise<LightEdition | null> {
  const base = await prisma.catchupEdition.findUnique({
    where: { id: editionId },
    select: LIGHT_EDITION_SELECT,
  });
  if (!base) return null;

  await advanceEdition(base as AdvanceEditionInput);

  return prisma.catchupEdition.findUnique({
    where: { id: editionId },
    select: LIGHT_EDITION_SELECT,
  });
}

async function loadMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ editionId: string }>;
}): Promise<Metadata> {
  const { editionId } = await params;
  const session = await auth();
  if (!session?.user) return { title: "Catch-ups" };

  try {
    const edition = await prisma.catchupEdition.findUnique({
      where: { id: editionId },
      select: {
        number: true,
        status: true,
        catchup: { select: { title: true, group: { select: { id: true, name: true } } } },
      },
    });
    if (!edition || edition.status !== "published") return { title: "Catch-ups" };

    const membership = await loadMembership(edition.catchup.group.id, session.user.id);
    if (!membership) return { title: "Catch-ups" };

    return {
      title: `${roundLabel(edition.number)} - ${catchupTitle(edition.catchup.title, edition.catchup.group.name)}`,
    };
  } catch {
    return { title: "Catch-ups" };
  }
}

export default async function RoundPage({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  let edition: LightEdition | null;
  try {
    edition = await loadFreshEdition(editionId);
  } catch (err) {
    if (isMissingCatchupTable(err)) {
      return (
        <div className="py-10">
          <AlmostReady />
        </div>
      );
    }
    throw err;
  }

  if (!edition) notFound();

  const membership = await loadMembership(edition.catchup.group.id, session.user.id);
  if (!membership) notFound();

  const status = edition.status as EditionStatus;
  const title = catchupTitle(edition.catchup.title, edition.catchup.group.name);
  const keeper = isEffectiveKeeper({
    viewerId: session.user.id,
    createdById: edition.catchup.createdById,
    groupRole: membership.role,
  });

  // Preparing: the ritual holding scene (spec 2.5). No answers are readable
  // by anyone, Keeper included, until publishAt (or the Keeper shortcuts it).
  if (status === "preparing") {
    return (
      <div className="py-10">
        <AlmostReady
          eyebrow={`${title} - ${roundLabel(edition.number)}`}
          title="Putting your Catch-up together."
          body="Every answer is being gathered into one issue. No one can read them yet, not even the Keeper - the reveal lands all at once, very soon."
        />
        {keeper && (
          <div className="mx-auto mt-[var(--space-l)] flex max-w-3xl justify-center">
            <PublishNowButton editionId={edition.id} />
          </div>
        )}
      </div>
    );
  }

  // draft / collecting / answering: nothing to read yet.
  if (status !== "published") {
    return (
      <NotYetPublished
        catchupId={edition.catchupId}
        groupName={edition.catchup.group.name}
        title={title}
        number={edition.number}
        status={status}
      />
    );
  }

  // Published: now, and only now, load every prompt/entry/love.
  const round = await prisma.catchupEdition.findUnique({
    where: { id: edition.id },
    select: {
      number: true,
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
              loves: { where: { userId: session.user.id }, select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!round) notFound();

  function toPersonRef(u: {
    id: string;
    name: string;
    photoUrl: string | null;
    birdOverride?: string | null;
  }): CatchupPersonRef {
    return { id: u.id, name: u.name, photoUrl: u.photoUrl, birdOverride: u.birdOverride };
  }

  const sections: Array<{ prompt: CatchupPromptView; entries: RoundEntry[] }> = round.prompts.map((p) => {
    const askerVisible = p.showAsker || keeper;
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

  const contributorMap = new Map<string, CatchupPersonRef>();
  for (const section of sections) {
    for (const entry of section.entries) {
      if (!contributorMap.has(entry.author.id)) contributorMap.set(entry.author.id, entry.author);
    }
  }
  const contributors = Array.from(contributorMap.values());

  const tocItems: TocItem[] = sections.map((s, i) => ({
    id: `q-${s.prompt.id}`,
    label: `${i + 1}. ${s.prompt.text.length > 44 ? `${s.prompt.text.slice(0, 44).trimEnd()}...` : s.prompt.text}`,
  }));

  const catchupActive = edition.catchup.status === "active";

  return (
    <div className="pb-4">
      <RoundMasthead
        title={title}
        groupName={edition.catchup.group.name}
        number={round.number}
        publishedAt={round.publishedAt}
        contributors={contributors}
      />

      <RoundTocChips items={tocItems} className="mt-[var(--space-l)] lg:hidden" />

      {sections.length === 0 ? (
        <p className="mt-[var(--space-xl)] text-center text-sm italic text-muted-foreground">
          This Round did not gather any questions.
        </p>
      ) : (
        <div className="mt-[var(--space-xl)] grid grid-cols-1 gap-x-[30px] gap-y-[var(--space-xxl)] lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0 space-y-[var(--space-xxl)]">
            {sections.map((section, i) => (
              <QuestionSection
                key={section.prompt.id}
                id={`q-${section.prompt.id}`}
                index={i}
                prompt={section.prompt}
                entries={section.entries}
              />
            ))}
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-7">
              <RoundTocRail items={tocItems} />
            </div>
          </aside>
        </div>
      )}

      <RoundFooterTease
        catchupId={edition.catchupId}
        groupName={edition.catchup.group.name}
        nextOpensAt={edition.catchup.nextOpensAt}
        showNextOpens={catchupActive}
      />
    </div>
  );
}
