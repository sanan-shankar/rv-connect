import { cache } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { NotAvailableCard } from "@/components/catchups/not-available";
import { CatchupHome } from "@/components/catchups/home/catchup-home";
import type {
  CatchupHomeData,
  CatchupHomeResult,
  HomeEditionView,
  HomePersonRef,
  HomePromptView,
} from "@/components/catchups/home/types";
import type { ListEdition } from "@/components/catchups/index/edition-cover-card";
import type { AnswerPromptData } from "@/components/catchups/answer/types";
import {
  advanceEdition,
  askerVisible,
  CATCHUP_PROMPT_SETS,
  editionCountdownLabel,
  homeStateLine,
  isEffectiveKeeper,
  isMissingCatchupTable,
  mayChangeCatchupPicture,
  isBatchCatchup,
  catchupDisplayName,
  type AdvanceEditionInput,
} from "@/lib/catchups";
import type {
  Cadence,
  CatchupStatus,
  EditionStatus,
  ReminderMode,
} from "@/lib/catchups-types";
import { IDENTITY_SELECT } from "@/lib/people-select";
import { COVER_SHOTS } from "@/lib/catchup-pictures";
import { readEditionIds } from "@/lib/catchup-reads";
import { promptKind, type PromptCategory } from "@/lib/catchups-types";
import { formatDayAndDate, formatDisplayDateLong, parseJsonArray } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  The Catch-up home (spec 3.3): the command surface for the live
 *  cycle plus the archive. Asymmetric two-column shape, never a
 *  centered stack - see `home/catchup-home-shell.tsx`.
 *
 *  Every query path is wrapped so a missing Catchup* table (P2021,
 *  pre-migration) renders the shared `<AlmostReady/>` holding scene
 *  instead of a 500 (migration handoff rule 3b).
 * ------------------------------------------------------------------ */

/* One read of the Catch-up for the two functions Next runs on the same
   request. The tab title needs two of these columns and used to fetch them
   itself; React's cache() collapses that into the read `loadHome` was going to
   do anyway. Keyed on the id string. */
const loadCatchup = cache(async function loadCatchup(catchupId: string) {
  return prisma.catchup.findUnique({
    where: { id: catchupId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          // The whole test for "this is a batch Catch-up" (F6), and the reason
          // the picture control is not Keeper-only: on a batch, anyone in the
          // batch may replace it. His answer to owner question 18.
          batchYear: true,
          members: {
            select: {
              // The role IS the second-Keeper flag: `setCatchupKeeper` writes
              // "keeper" here, which `isEffectiveKeeper` honours, so the hat is
              // handed over without a new column.
              role: true,
              user: { select: IDENTITY_SELECT },
            },
          },
        },
      },
      editions: {
        orderBy: { number: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          questionsCloseAt: true,
          answersCloseAt: true,
          publishedAt: true,
          remindersSent: true,
          createdAt: true,
        },
      },
    },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ catchupId: string }>;
}): Promise<Metadata> {
  const { catchupId } = await params;
  try {
    const catchup = await loadCatchup(catchupId);
    if (!catchup) return { title: "Catch-ups" };
    return { title: catchupDisplayName(catchup.title, catchup.group.name) };
  } catch {
    return { title: "Catch-ups" };
  }
}

async function loadHome(catchupId: string, viewerId: string): Promise<CatchupHomeResult> {
  const catchup = await loadCatchup(catchupId);
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

  // Lazy read-time advance (spec 2.4): bring the latest Edition current on every
  // home visit, on top of the global app-shell piggyback (WP7).
  const latestRaw = catchup.editions[0] ?? null;
  if (latestRaw) {
    const advanceInput: AdvanceEditionInput = {
      id: latestRaw.id,
      catchupId: catchup.id,
      status: latestRaw.status as EditionStatus,
      questionsCloseAt: latestRaw.questionsCloseAt,
      answersCloseAt: latestRaw.answersCloseAt,
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
            include: { author: { select: IDENTITY_SELECT } },
          },
        },
      })
    : null;

  // Viewer first: the people panel shows only the first PILLS_SHOWN, and
  // someone who fell off the end of an unordered list read that as not being a
  // member at all (owner, 2026-08-04). Keepers next, then everyone else in name order,
  // so the roster reads the same way every time it is opened rather than in
  // whatever order the join table happened to return.
  const members: HomePersonRef[] = catchup.group.members
    .map((m) => ({
      id: m.user.id,
      name: m.user.name,
      photoUrl: m.user.photoUrl,
      birdOverride: m.user.birdOverride,
      isKeeper: isEffectiveKeeper({
        viewerId: m.user.id,
        createdById: catchup.createdById,
        groupRole: m.role,
      }),
      isCreator: !!catchup.createdById && m.user.id === catchup.createdById,
    }))
    .sort((a, b) => {
      if (a.id === viewerId) return -1;
      if (b.id === viewerId) return 1;
      if (a.isKeeper !== b.isKeeper) return a.isKeeper ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  const viewerName = members.find((m) => m.id === viewerId)?.name ?? "You";

  let editionView: HomeEditionView | null = null;

  if (freshLatest) {
    const status = freshLatest.status as EditionStatus;
    const now = Date.now();

    let answeredAuthorIds: string[] = [];
    if (status === "answering") {
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

    /* Position, then createdAt -- the same total order the answering page and
       the published Edition use. Two questions can share a position (the cap
       check is a snapshot, not a lock; see submitPrompt), and a bare position
       sort leaves those two in whatever order the rows arrived in, which can
       differ between two loads of the same page (audit C-029). */
    const accepted = promptPool
      .filter((p) => p.accepted)
      .sort((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime());
    const pending = promptPool
      .filter((p) => !p.accepted)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const prompts: HomePromptView[] = [...accepted, ...pending].map((p) => {
      const isOwn = p.authorId === viewerId;
      // Shared with the published Edition page, which used to answer this
      // differently and named anonymous askers to any Keeper (audit M10).
      const revealAsker = askerVisible({ showAsker: p.showAsker, authorId: p.authorId }, viewerId);
      return {
        id: p.id,
        text: p.text,
        category: p.category,
        accepted: p.accepted,
        position: p.position,
        showAsker: p.showAsker,
        isOwn,
        author:
          revealAsker && p.author
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
      publishedAt: freshLatest.publishedAt?.toISOString() ?? null,
      // No countdown on a frozen Catch-up. The clock genuinely is not running
      // (advanceEdition returns early while paused or ended), and the shell
      // below already replaces the whole console with "This Catch-up is
      // paused" -- a header reading "3 days left" over that banner was the
      // page contradicting itself (audit B-061).
      countdownLabel:
        catchup.status === "active"
          ? editionCountdownLabel(
              {
                status,
                questionsCloseAt: freshLatest.questionsCloseAt,
                answersCloseAt: freshLatest.answersCloseAt,
              },
              new Date(now)
            )
          : null,
      prompts,
      answeredAuthorIds,
    };
  }

  /* THE PUBLISHED EDITIONS, AS COVERS. `HomeArchiveRow` is gone and with it
     the Edition number, the contributor count and the quoted teaser -- he
     deleted all three. What a published Edition is on this page is the same
     `ListEdition` the /catchups list draws, so there is ONE representation of
     one rather than "15 different ways in 15 different places" (brief 13, 39).

     The newest goes in the Edition region when it is the live one; the rest
     are the sidebar. */
  const publishedEditions = await prisma.catchupEdition.findMany({
    where: { catchupId: catchup.id, status: "published" },
    orderBy: { publishedAt: "desc" },
    select: { id: true, publishedAt: true },
  });

  /* The photographs, in one query rather than as a nested `entries` select:
     the biggest live Edition has 143 entries and a cover needs three urls off
     the front of it. Bounded by the entries that carry a photograph at all,
     which is 30 on that Edition and 0 on three of the five published ones.

     Together with the read marks, because neither depends on the other and
     they are two round trips to a pooler in Mumbai. */
  const editionIds = publishedEditions.map((e) => e.id);
  const [withPhotos, readIds] = await Promise.all([
    editionIds.length > 0
      ? prisma.catchupEntry.findMany({
          where: { editionId: { in: editionIds }, images: { not: null } },
          orderBy: { createdAt: "asc" },
          select: { editionId: true, images: true },
        })
      : [],
    readEditionIds(viewerId, editionIds),
  ]);
  const photosByEdition = new Map<string, string[]>();
  for (const entry of withPhotos) {
    const have = photosByEdition.get(entry.editionId) ?? [];
    if (have.length >= COVER_SHOTS) continue;
    have.push(...parseJsonArray(entry.images));
    photosByEdition.set(entry.editionId, have);
  }

  const fallback = { src: catchup.pictureSrc, focus: catchup.pictureFocus };
  const covers: ListEdition[] = publishedEditions
    .filter((e) => e.publishedAt !== null)
    .map((e) => ({
      editionId: e.id,
      publishedAt: e.publishedAt as Date,
      photos: (photosByEdition.get(e.id) ?? []).slice(0, COVER_SHOTS),
      /* Never printed here: you are already inside this Catch-up, so saying
         which one it came from is the same fact twice. */
      fromName: null,
      fallback,
      read: readIds.has(e.id),
    }));

  /* The live Edition's own cover, when the REGION is going to draw it, and
     everything else for the sidebar.

     The test is the CATCH-UP's state and not just the Edition's, and that is
     a bug found by looking at one: an ended Catch-up draws no Edition region
     at all (architecture 5), so pulling its newest Edition out of the sidebar
     to be drawn there left it drawn NOWHERE -- the one published Edition of
     an ended Catch-up was unreachable from its own home, with the sidebar
     showing "Your previous Editions appear here" beside it. Same for a paused
     one, where the region is the on-hold card.

     So: the region claims the newest cover only while the Catch-up is active
     and that Edition has actually published. Otherwise every published
     Edition is a back number and the sidebar has all of them. */
  const regionDrawsLatest = catchup.status === "active" && freshLatest?.status === "published";
  const latest = regionDrawsLatest
    ? (covers.find((c) => c.editionId === freshLatest.id) ?? null)
    : null;
  const earlier = latest ? covers.filter((c) => c.editionId !== latest.editionId) : covers;

  const pref = await prisma.catchupPref.findUnique({
    where: { catchupId_userId: { catchupId: catchup.id, userId: viewerId } },
    select: { reminderMode: true },
  });

  /* THE QUESTIONS TO ANSWER, and only while the Edition is `answering`.
     Answering happens on this page now (his N77: "it doesn't make sense to
     have the collecting in the home screen and then the answering takes you
     away from it"), so what `/catchups/[id]/answer` used to load, this loads.

     Only the viewer's OWN entries, and only for accepted questions. Nobody's
     answers are readable before the Edition publishes -- his, 2026-09-09: "no
     I wanted todays behaviour only. it's only readable once the edition is
     out" (spec 3.13, closed as reading (a)). */
  let answering: AnswerPromptData[] = [];
  if (freshLatest?.status === "answering") {
    const accepted = freshLatest.prompts
      .filter((p) => p.accepted)
      .sort((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime());
    const mine = accepted.length
      ? await prisma.catchupEntry.findMany({
          where: { promptId: { in: accepted.map((p) => p.id) }, authorId: viewerId },
          select: { promptId: true, body: true, images: true, updatedAt: true },
        })
      : [];
    const byPrompt = new Map(mine.map((e) => [e.promptId, e]));
    answering = accepted.map((p) => {
      const entry = byPrompt.get(p.id);
      return {
        id: p.id,
        text: p.text,
        // The category doubles as the question's kind (photo-wall / songs
        // switch the answering control; everything else writes text).
        kind: promptKind(p.category as PromptCategory | null),
        // The one helper, like every other surface that names an asker. Its
        // shape is what stops a Keeper exception growing back into one of
        // them (audit C-019); what it does here is let an anonymous asker
        // see their own byline on their own question.
        asker: askerVisible({ showAsker: p.showAsker, authorId: p.author?.id ?? null }, viewerId)
          ? p.author
          : null,
        entry: { body: entry?.body ?? "", images: parseJsonArray(entry?.images) },
        // The row version this page was rendered from, sent back with every
        // save so a second device cannot silently replace what the first one
        // wrote (audit C-125).
        entryUpdatedAt: entry?.updatedAt.toISOString() ?? null,
      };
    });
  }

  const isBatch = isBatchCatchup(catchup.group.batchYear);

  const data: CatchupHomeData = {
    catchupId: catchup.id,
    inviteToken: catchup.inviteToken,
    groupId: catchup.groupId,
    groupName: catchup.group.name,
    title: catchupDisplayName(catchup.title, catchup.group.name),
    cadence: catchup.cadence as Cadence,
    nextOpensAt: catchup.nextOpensAt?.toISOString() ?? null,
    catchupStatus: catchup.status as CatchupStatus,
    picture: { src: catchup.pictureSrc, focus: catchup.pictureFocus },
    isBatch,
    members,
    viewer: {
      id: viewerId,
      name: viewerName,
      isKeeper,
      canChangePicture: mayChangeCatchupPicture({
        viewerId,
        createdById: catchup.createdById,
        groupRole: membership.role,
        batchYear: catchup.group.batchYear,
      }),
      reminderMode: (pref?.reminderMode as ReminderMode) ?? "all",
    },
    edition: editionView,
    latest,
    earlier,
    stateLine: homeStateLine(
      catchup.status as CatchupStatus,
      freshLatest
        ? { status: freshLatest.status as EditionStatus, answersCloseAt: freshLatest.answersCloseAt }
        : null,
      catchup.nextOpensAt,
      { dayAndDate: formatDayAndDate, longDate: formatDisplayDateLong }
    ),
    answering,
    settings: {
      catchupId: catchup.id,
      name: catchupDisplayName(catchup.title, catchup.group.name),
      isBatch,
      state: (freshLatest?.status as EditionStatus | undefined) ?? "none",
      paused: catchup.status === "paused",
      ended: catchup.status === "ended",
      /* Both are FALSE on a batch Catch-up, and that is his own correction
         (N30): "Can anyone open answering? That shouldn't be allowed. Because
         many people would click it by accident. Especially on a batch thing."
         Nobody keeps a batch and it has no manual transitions at all. Every
         one of these is refused server-side too -- `loadKeeperScope` and
         `loadKeeperEdition` both turn a batch away before they ask who the
         Keeper is -- so this decides what is OFFERED, never what is allowed. */
      youKeep: isKeeper && !isBatch,
      canRun: isKeeper && !isBatch,
      canChangePicture: mayChangeCatchupPicture({
        viewerId,
        createdById: catchup.createdById,
        groupRole: membership.role,
        batchYear: catchup.group.batchYear,
      }),
      cadence: catchup.cadence as Cadence,
      reminderMode: (pref?.reminderMode as ReminderMode) ?? "all",
      editionId: freshLatest?.id ?? null,
      answersCloseAt: freshLatest?.answersCloseAt?.toISOString() ?? null,
      picture: fallback,
    },
    promptLibrary: CATCHUP_PROMPT_SETS,
  };

  return { kind: "ok", ...data };
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

  /* NO <PageHeader>. The head IS the page's title: the Catch-up's name is
     written on its own photograph, which is the thing he asked for -- "let's
     have it fade to black and again have the name". A second title above it,
     with the countdown appended, was the page saying its own name twice and
     the deadline in a third place. */
  return <CatchupHome data={result} />;
}
