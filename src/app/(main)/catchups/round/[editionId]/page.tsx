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
  askerVisible,
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
import { recordView } from "@/lib/content-view";

/**
 * This reader's heading: "{Group name} catch-up", singular, because it is one
 * Catch-up being read (owner review 2026-07-25). A Keeper's custom title wins
 * when they have set one. Deliberately not `catchupTitle()`, which is the
 * plural "{group} Catch-ups" label the index and the archive use for the
 * series; the Catch-up home and the answering screen both name it this way,
 * and the reader must not disagree with them.
 *
 * TODO: this is now the third copy of the same one-liner (see `homeTitle` in
 * ../../[catchupId]/page.tsx and ../../[catchupId]/answer/page.tsx). It wants
 * to be one exported helper in src/lib/catchups.ts, next to `catchupTitle`.
 */
function roundTitle(title: string | null | undefined, groupName: string): string {
  return title?.trim() || `${groupName} catch-up`;
}

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
      title: `${roundLabel(edition.number)} - ${roundTitle(edition.catchup.title, edition.catchup.group.name)}`,
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
  const title = roundTitle(edition.catchup.title, edition.catchup.group.name);
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
    /* Not `p.showAsker || keeper`, which is what this said until 2026-08-21:
       a Keeper saw the name behind every anonymous question, in the Round the
       whole group reads, with no cue that it had been asked anonymously
       (audit M10). The rule now lives in one function shared with the home
       page, which had always got it right. */
    const showsAsker = askerVisible(
      { showAsker: p.showAsker, authorId: p.author?.id ?? null },
      session?.user?.id ?? null
    );
    const prompt: CatchupPromptView = {
      id: p.id,
      text: p.text,
      category: p.category as PromptCategory | null,
      source: p.source as PromptSource,
      showAsker: p.showAsker,
      accepted: p.accepted,
      position: p.position,
      // Null once the asker has deleted their account: the question and every
      // answer under it survive them, unattributed.
      asker: showsAsker && p.author ? toPersonRef(p.author) : null,
    };
    const entries: RoundEntry[] = p.entries.map((e) => {
      // The songUrl/songTitle/songArt trio is Spotify-shaped: `songTitle` is
      // only ever written by the oembed resolver, so it carries rows from the
      // old per-question "paste a Spotify link" field. A song is worth
      // printing as soon as we have a name for it, hence the fall back to the
      // raw URL when resolution failed soft. `url: ""` is the signal to
      // SpotifyCard to render an unlinked row.
      //
      // The NEW `songs` prompt kind does not write here at all: it saves the
      // typed song name in `body` (see the TODO in answer/song-attachment.tsx
      // naming the `CatchupEntry.songs Json?` column that would lift it to
      // five). AnswerCard reads `kind` and prints that body as a song row.
      const songTitle = e.songTitle?.trim() || e.songUrl?.trim() || null;
      return {
        id: e.id,
        promptId: e.promptId,
        author: toPersonRef(e.author),
        authorMeta: batchLine(e.author),
        body: e.body,
        images: parseJsonArray(e.images),
        song: songTitle ? { url: e.songUrl ?? "", title: songTitle, art: e.songArt } : null,
        loveCount: e._count.loves,
        lovedByViewer: e.loves.length > 0,
        createdAt: e.createdAt,
      };
    });
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
