/* ------------------------------------------------------------------ *
 *  The published Edition reader (spec 3.6) - the crown jewel of Catch-ups.
 *
 *  Two-phase load, mirroring `loadFreshEdition` in ../../actions.ts:
 *   1. A LIGHT query (timestamps + Catchup/Group meta only) so the lazy
 *      read-time advance (spec 2.4) can bring the stored status current
 *      before we decide what to render - a deep link visited right as
 *      `answersCloseAt` passes must reveal the Edition, not sit stuck on
 *      stale "answering" state because nobody happened to load the
 *      Catch-up home first.
 *   2. Only once that fresh status is confirmed `published` do we run the
 *      HEAVY query (every prompt, every entry, every love). This is
 *      defense in depth for the secrecy rule (threat T-catchups-04):
 *      answer bodies are never even pulled into a server render for an
 *      Edition that is not published yet, Keeper included.
 *
 *  Every query path is wrapped so a missing table (P2021, pre-migration)
 *  renders the shared <AlmostReady/> holding scene instead of a 500.
 * ------------------------------------------------------------------ */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { redirectToSignIn } from "@/lib/sign-in-redirect";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  advanceEdition,
  catchupDisplayName,
  catchupSurfaceTitle,
  isMissingCatchupTable,
  type AdvanceEditionInput,
} from "@/lib/catchups";
import { promptKind, type EditionStatus } from "@/lib/catchups-types";
import { loadPublishedEditionView } from "@/lib/catchups-edition-view";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { EditionReader } from "@/components/catchups/edition/reader";
import type { ReaderQuestion } from "@/components/catchups/edition/reader-types";
import { NotYetPublished } from "@/components/catchups/edition/not-yet-published";
import { recordView } from "@/lib/content-view";
import { markEditionRead } from "@/lib/catchup-reads";

const LIGHT_EDITION_SELECT = {
  id: true,
  catchupId: true,
  number: true,
  status: true,
  questionsCloseAt: true,
  answersCloseAt: true,
  publishedAt: true,
  remindersSent: true,
  timeCapsule: true,
  publishAt: true,
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

/** Bring one Edition's status current against the clock, then return the fresh row. */
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

/* Advance the Edition's clock-based status, then return the fresh row. Only
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
      title: catchupSurfaceTitle(edition.catchup.title, edition.catchup.group.name),
    };
  } catch {
    return { title: "Catch-ups" };
  }
}

export default async function EditionPage({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = await params;
  const session = await auth();
  if (!session?.user) return redirectToSignIn();

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
  after(() => recordView(session?.user?.id, "edition", edition.id));

  const status = edition.status as EditionStatus;
  const title = catchupSurfaceTitle(edition.catchup.title, edition.catchup.group.name);

  // draft / collecting / answering / sealed: nothing to read yet. `sealed` is
  // a time capsule waiting out its year (build phase 14), and a deep link to
  // one is told the day it opens and nothing else, the writer included (34b).
  // `preparing` is deleted, so an ordinary Edition whose answers have closed is
  // already published and falls through to the reader below.
  if (status !== "published") {
    return (
      <NotYetPublished
        catchupId={edition.catchupId}
        title={title}
        status={status}
        opensAt={status === "sealed" ? edition.publishAt : null}
      />
    );
  }

  /* The read mark (spec 3.9), and it is written HERE rather than beside
     recordView above: an Edition you deep-linked while it was still collecting
     is not one you have read, and marking it would leave it looking read on
     the day it finally comes out. `after()` for the same reason recordView
     uses it -- neither is worth a millisecond of the render. */
  const viewerId = session.user.id;
  after(() => markEditionRead(viewerId, edition.id));

  // Published: now, and only now, load every prompt/entry/love. Shared with
  // the Catch-up home, which reads the same Edition inline — including the
  // anonymity rule and the song rule, which the two pages used to keep in
  // step by hand and had already stopped agreeing on.
  const view = await loadPublishedEditionView(edition.id, session.user.id);
  if (!view) notFound();

  /* The loader's shape, mapped to the reader's. Nothing is DECIDED here: who
     may be named came out of `askerVisible` inside the loader and arrives as
     `askerReading`, and a component that re-derived it is audit C-019, where
     the home and this page came to disagree about anonymity. */
  const questions: ReaderQuestion[] = view.sections.map(({ prompt, entries }) => ({
    id: prompt.id,
    text: prompt.text,
    kind: promptKind(prompt.category),
    asker: prompt.askerReading,
    entries,
  }));

  return (
    <EditionReader
      edition={{
        catchupId: edition.catchupId,
        catchupName: catchupDisplayName(edition.catchup.title, edition.catchup.group.name),
        publishedAt: view.publishedAt ?? new Date(),
        questions,
        viewerIsAdmin: session.user.role === "admin",
      }}
    />
  );
}
