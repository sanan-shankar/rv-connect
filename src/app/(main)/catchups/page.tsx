import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { RAIL_GRID, RAIL_ASIDE } from "@/components/layout/rail-grid";
import { Button } from "@/components/ui/button";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { YourCatchupsCard, type IndexCardView } from "@/components/catchups/index/your-catchups-card";
import { FreshOffThePress, type FreshRoundItem } from "@/components/catchups/index/fresh-off-the-press";
import { GroupFirstGuidance } from "@/components/catchups/index/group-first-guidance";
import { FiledAway, type FiledRow } from "@/components/catchups/index/filed-away";
import { TourAnchorSlot } from "@/components/tour/tour-anchor-slot";
import { catchupShelf, type CatchupShelf } from "@/lib/catchup-shelf";
import { advanceDueCatchups, describeEditionStatus, isMissingCatchupTable } from "@/lib/catchups";
import type { CatchupPersonRef, CatchupStatus, EditionStatus } from "@/lib/catchups-types";

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
    /* Only groups that HAVE a Catch-up (owner's call, 2026-08-21).
       A group without one used to get a row saying "No Catch-up here yet"
       with a "Start one" button, and pressing that button did not consume the
       prompt: the create flow mints its own group (which is what its docblock
       says it does), so the member ended up with two rows of the same name --
       one live, one still offering "Start one" -- and a third if they pressed
       it again. Offered the choice between making the button attach to that
       group and dropping the row, the owner took the row: attaching would mean
       one member's private naming choice renaming a shared batch group, and
       the people they picked joining a batch they may not be from. Nothing is
       lost, because the header's permanent "Start a Catch-up" button and the
       create page's one-tap "Everyone from <batch>" already cover the case the
       row existed for. */
    where: { userId, group: { catchup: { isNot: null } } },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
          /* No `take` here any more. It used to fetch an arbitrary 6 with no
             ordering, so whether the VIEWER appeared in the card's avatar
             cluster came down to whatever order Postgres happened to return,
             and members who fell outside that 6 asked the owner whether they
             were even in the Catch-up (2026-08-04). The rows are four scalar
             columns each and these groups are a set of people you picked, so
             reading them all and putting the viewer first below costs nothing
             worth protecting. `_count` above still supplies the true total. */
          members: {
            select: { user: { select: { id: true, name: true, photoUrl: true, birdOverride: true } } },
          },
          catchup: {
            select: {
              id: true,
              status: true,
              // Only to decide whether to OFFER Delete: a founder is refused
              // it server-side, and this page's own rule (see PeoplePanel) is
              // that an action refused server-side is not put on screen as a
              // way to be told no.
              createdById: true,
              /* The viewer's own copy state, and only the viewer's: the
                 relation filter is what makes archiving and deleting personal
                 (bug audit B-063). At most one row, by the unique on
                 (catchupId, userId). */
              prefs: {
                where: { userId },
                select: { archivedAt: true, deletedAt: true },
              },
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
  /** The card plus which of the three sections it belongs in. The shelf is
   *  never rendered on the card itself; it only decides where the card goes. */
  type ShelvedCard = IndexCardView & { shelf: CatchupShelf; deletedAt: Date | null };
  const cards: ShelvedCard[] = memberships
    .map(({ group }): ShelvedCard | null => {
    // Viewer first, so the card's cluster (which shows only the first few)
    // always answers "am I in this?" before it answers "who else is?".
    const members = group.members
      .map((m) => m.user)
      .sort((a, b) => (a.id === userId ? -1 : b.id === userId ? 1 : 0));
    const memberCount = group._count.members;

    // Unreachable: the query above only returns groups that have one. Kept as
    // the type narrowing Prisma's optional relation still requires, and as a
    // refusal rather than a silently different-looking card if that `where`
    // ever changes.
    if (!group.catchup) return null;

    const catchupStatus = group.catchup.status as CatchupStatus;
    const pref = group.catchup.prefs[0] ?? null;
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
      shelf: catchupShelf(pref),
      deletedAt: pref?.deletedAt ?? null,
      isCreator: !!group.catchup.createdById && group.catchup.createdById === userId,
      groupId: group.id,
      groupName: group.name,
      members,
      memberCount,
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
      answeredCount: 0,
      answeredMembers: [],
    };
    })
    .filter((c): c is ShelvedCard => c !== null);

  // The live "Answering now" row needs real pull (spec polish: who-has-
  // answered avatars + a mini N-of-M badge) so it reads as more alive than a
  // quiet published or paused row. Fetched separately, scoped to just the
  // editions actually answering right now.
  const answeringCards = cards.filter(
    (c) => c.shelf === "active" && c.editionStatus === "answering" && c.editionId
  );
  if (answeringCards.length > 0) {
    const answeredRows = await prisma.catchupEntry.findMany({
      where: { editionId: { in: answeringCards.map((c) => c.editionId as string) } },
      distinct: ["editionId", "authorId"],
      select: { editionId: true, author: { select: { id: true, name: true, photoUrl: true, birdOverride: true } } },
    });
    const byEdition = new Map<string, CatchupPersonRef[]>();
    for (const row of answeredRows) {
      const arr = byEdition.get(row.editionId) ?? [];
      arr.push(row.author);
      byEdition.set(row.editionId, arr);
    }
    for (const card of answeringCards) {
      const answered = byEdition.get(card.editionId as string) ?? [];
      card.answeredCount = answered.length;
      card.answeredMembers = answered;
    }
  }

  const live = cards.filter((c) => c.shelf === "active");
  const toFiledRow = (c: ShelvedCard): FiledRow => ({
    catchupId: c.catchupId as string,
    groupName: c.groupName,
    statusLine: c.statusLine,
    deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
  });
  // Newest decision first in both bins: the thing you just filed or binned is
  // the thing you are most likely to have second thoughts about.
  const archived = cards
    .filter((c) => c.shelf === "archived")
    .map(toFiledRow)
    .sort((a, b) => a.groupName.localeCompare(b.groupName));
  const deleted = cards
    .filter((c) => c.shelf === "deleted")
    .map(toFiledRow)
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));

  live.sort((a, b) => {
    const pa = a.catchupId ? (STATUS_PRIORITY[a.editionStatus ?? "draft"] ?? 50) : 90;
    const pb = b.catchupId ? (STATUS_PRIORITY[b.editionStatus ?? "draft"] ?? 50) : 90;
    if (pa !== pb) return pa - pb;
    return a.groupName.localeCompare(b.groupName);
  });

  const freshEditions = await prisma.catchupEdition.findMany({
    where: {
      status: "published",
      catchup: {
        group: { members: { some: { userId } } },
        // A Catch-up you binned is out of your list, so it is out of the rail
        // too; an ARCHIVED one stays, because archiving files a Catch-up away
        // without saying you have stopped caring what it publishes (B-063).
        prefs: { none: { userId, deletedAt: { not: null } } },
      },
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

  return { cards: live, archived, deleted, freshItems };
}

export default async function CatchupsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const isAdmin = session.user.role === "admin";

  let data: Awaited<ReturnType<typeof loadIndexData>> | null = null;
  try {
    data = await loadIndexData(session.user.id);
  } catch (err) {
    if (!isMissingCatchupTable(err)) throw err;
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Catch-ups" />
        <AlmostReady />
      </div>
    );
  }

  return (
    <div>
      {/* The header sits inside the same rail grid as the body, alone in
          column 1, so its right edge is the CARDS column's right edge: the
          CTA lands flush with the cards, never out over the rail (owner,
          2026-07-30). Same pattern as /feed. */}
      <div className={RAIL_GRID}>
        <div className="min-w-0">
          {/* Persistent, always-visible way to start a new Catch-up with new
              people (owner review 2026-07-25: with five groups already, there
              was no button anywhere for a sixth). The zero-groups guidance below
              also offers this same action inline; that is not a conflict, it is
              the empty-state repeat of the one thing this header always offers. */}
          <PageHeader
            title="Catch-ups"
            actions={
              <>
                {/* The admin's way into every Catch-up on the site, not just
                    the ones they are in -- the shelves below are memberships,
                    and an admin is usually in none of them, so this page is
                    nearly empty for the owner and had no route to the whole
                    list (owner, 2026-08-25). A bare circle, no label: the
                    words live in aria-label and the tooltip, which is the
                    right trade for a control one person on the site can see.

                    `hidden sm:inline-flex`, and that is measured rather than
                    felt. At a true 390 this header has 33px of slack between
                    the title and the "Start a Catch-up" pill; the smallest
                    circle in the app is 32px and the cluster's gap is 10, so
                    42px into 33px wraps "Catch-ups" onto two lines where the
                    committed baseline has it on one. Nothing fits beside the
                    member's primary action on a phone, and taking a row of its
                    own below the header pushed every card down -- so on mobile
                    it is simply not here, where the admin sidebar's own
                    Catch-ups entry is one tap from the hamburger anyway. */}
                {isAdmin && (
                  <Link href="/admin/catchups" className="hidden sm:inline-flex">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Every Catch-up on the site"
                      title="Every Catch-up on the site"
                    >
                      <ListChecks className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Link href="/catchups/new" className="inline-flex">
                  <Button variant="primary">
                    <Plus className="h-4 w-4" />
                    Start a Catch-up
                  </Button>
                </Link>
              </>
            }
          />
        </div>
      </div>

      {/* Nothing on any of the three shelves. Same card as the never-in-a-
          group case, because it answers the same question: this is where a
          Catch-up would be, and here is how to start one. */}
      {data.cards.length === 0 && data.archived.length === 0 && data.deleted.length === 0 ? (
        <GroupFirstGuidance />
      ) : (
        // Both columns start at the same y, so the rail's first card lines up
        // with the first Catch-up card on its own. (There used to be an
        // eyebrow heading here and an invisible copy of it in the rail to
        // cancel the offset; both are gone.)
        <div className={`${RAIL_GRID} gap-y-[var(--space-m)]`}>
          <div className="min-w-0 space-y-3.5">
            {/* The tour's Catch-ups stop spotlights the first card. It used
                to name an anchor `catchups-explainer` that no element has
                registered since the Catch-ups rebuild, so `awaitSpotlight`
                timed out and every demo visitor watched a 2.5s stall on stop
                4 before the hoopoe gave up and shrugged (audit
                landing-mascot-avatars-04). The first card is what the stop's
                copy is describing, and the demo's seeded visitor is a member
                of the seeded Catch-up, so there is always one here for them. */}
            {data.cards.map((card, i) =>
              i === 0 ? (
                <TourAnchorSlot key={card.groupId} anchorKey="catchups-explainer">
                  <YourCatchupsCard card={card} />
                </TourAnchorSlot>
              ) : (
                <YourCatchupsCard key={card.groupId} card={card} />
              )
            )}
            {/* Renders nothing at all when both are empty, which is the state
                almost every member is in (owner: "hidden entirely when the
                member has none, no dead buttons"). */}
            <FiledAway archived={data.archived} deleted={data.deleted} />
          </div>
          <aside className={RAIL_ASIDE}>
            <div className="sticky top-7">
              <FreshOffThePress items={data.freshItems} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
