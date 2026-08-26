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
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  advanceEdition,
  isEffectiveKeeper,
  catchupSurfaceTitle,
  isMissingCatchupTable,
  roundLabel,
  type AdvanceEditionInput,
} from "@/lib/catchups";
import type {
  CatchupPersonRef,
  EditionStatus,
} from "@/lib/catchups-types";
import { loadPublishedRoundView } from "@/lib/catchups-round-view";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { RoundMasthead } from "@/components/catchups/round/masthead";
import { RoundTocRail, RoundTocChips, type TocItem } from "@/components/catchups/round/toc";
import { QuestionSection } from "@/components/catchups/round/question-section";
import { RoundFooterTease } from "@/components/catchups/round/footer-tease";
import { PublishNowButton } from "@/components/catchups/round/publish-now-button";
import { NotYetPublished } from "@/components/catchups/round/not-yet-published";
import { recordView } from "@/lib/content-view";

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
/* The plain read, WITHOUT advancing. Split from the advance below so the page
   can gate on group membership between the two: advanceEdition is a write, and
   a non-member must not be able to trigger that status transition just by
   opening the URL. The two sibling pages (catchups/[catchupId] and its answer
   page) already check membership before advancing; this page used to advance
   first, inside a combined loadFreshEdition, which was the ordering bug. */
async function loadEditionBase(editionId: string): Promise<LightEdition | null> {
  return prisma.catchupEdition.findUnique({
    where: { id: editionId },
    select: LIGHT_EDITION_SELECT,
  });
}

/* Advance the Round's clock-based status, then return the fresh row. Only
   reached once the caller is a confirmed member of the edition's group. */
async function advanceAndReload(
  base: LightEdition,
  editionId: string,
): Promise<LightEdition | null> {
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
      title: `${roundLabel(edition.number)} - ${catchupSurfaceTitle(edition.catchup.title, edition.catchup.group.name)}`,
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

  let edition: LightEdition | null = null;
  let membership: Awaited<ReturnType<typeof loadMembership>> = null;
  try {
    const base = await loadEditionBase(editionId);
    if (!base) notFound();

    // Gate BEFORE advancing: advanceEdition is a write, so a non-member must
    // not reach it. Membership is also needed just below for the Keeper check.
    membership = await loadMembership(base.catchup.group.id, session.user.id);
    if (!membership) notFound();

    edition = await advanceAndReload(base, editionId);
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

  if (!edition || !membership) notFound();

  /* after(), not the old `void`: see src/app/(main)/collection/[id]/page.tsx
     for why (bug audit Lows 25/35/44/72/77/82/87). */
  after(() => recordView(session?.user?.id, "round", edition.id));

  const status = edition.status as EditionStatus;
  const title = catchupSurfaceTitle(edition.catchup.title, edition.catchup.group.name);
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
          body="No one can read the answers yet, not even the Keeper. They all appear at once when this Round publishes."
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
        title={title}
        number={edition.number}
        status={status}
      />
    );
  }

  // Published: now, and only now, load every prompt/entry/love. Shared with
  // the Catch-up home, which reads the same Round inline — including the
  // anonymity rule and the song rule, which the two pages used to keep in
  // step by hand and had already stopped agreeing on.
  const round = await loadPublishedRoundView(edition.id, session.user.id);
  if (!round) notFound();
  const { sections } = round;

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
        number={round.number}
        publishedAt={round.publishedAt}
        contributors={contributors}
      />

      <RoundTocChips items={tocItems} className="mt-[var(--space-l)] lg:hidden" />

      {sections.length === 0 ? (
        <p className="mt-[var(--space-l)] text-center text-sm italic text-muted-foreground">
          This Round did not gather any questions.
        </p>
      ) : (
        <div className="mt-[var(--space-l)] grid grid-cols-1 gap-x-[30px] gap-y-[var(--space-xl)] lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0 space-y-[var(--space-xl)]">
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
        nextOpensAt={edition.catchup.nextOpensAt}
        showNextOpens={catchupActive}
      />
    </div>
  );
}
