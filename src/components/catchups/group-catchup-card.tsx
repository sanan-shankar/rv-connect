/* ------------------------------------------------------------------ *
 *  <GroupCatchupCard> — the group page's Catch-up entry point (spec
 *  "3. Screens and flows": "Group integration: a Catch-up card on
 *  /groups/[id]"). Mounted once, at the top of the members-only branch
 *  of /groups/[id], for every group member.
 *
 *  This is an async Server Component with its OWN Prisma query so the
 *  query can be wrapped in isMissingCatchupTable and degrade to a calm
 *  "coming soon" stub without ever touching the group page's own render
 *  path — a missing Catch-up table can never break the group page.
 *
 *  Three states, each the whole-card-is-a-link shape (mirrors
 *  <YourCatchupsCard>, so there is exactly one focus target and no
 *  interactive element nested inside another):
 *   1. Tables absent (P2021): calm "coming soon" stub, not a link.
 *   2. No Catch-up yet for this group: "Start one" -> the create flow.
 *   3. A Catch-up exists: current status + the CTA for that Round state.
 *      While a Round is answering, this also carries the same "who has
 *      answered" pull the Catch-up home console gives it (spec polish:
 *      the group page's card should not read as a thinner, lesser copy
 *      of the real thing).
 *
 *  Layout is a vertical stack, not a left-label/right-pill split — the CTA
 *  sits directly under its own title rather than stranded at the far edge
 *  of a full-width card (spec polish).
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { catchupTitle, describeEditionStatus, isMissingCatchupTable } from "@/lib/catchups";
import type { CatchupPersonRef, CatchupStatus, EditionStatus } from "@/lib/catchups-types";

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

async function loadGroupCatchup(groupId: string) {
  return prisma.catchup.findUnique({
    where: { groupId },
    select: {
      id: true,
      title: true,
      status: true,
      group: { select: { _count: { select: { members: true } } } },
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
  });
}

const ICON_MEDALLION_LEAF = "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf";
const ICON_MEDALLION_CINNAMON = "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cinnamon/10 text-cinnamon";
const CARD_SHELL =
  "card-elevated group relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius)] border border-border bg-card p-5 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0";
const CTA_PILL =
  "relative inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-canopy px-4 py-2 text-[13px] font-semibold text-white shadow-[0_5px_13px_-12px_var(--color-canopy)] transition-transform duration-150 group-hover:scale-[1.03]";

export async function GroupCatchupCard({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  let catchup: Awaited<ReturnType<typeof loadGroupCatchup>> | null = null;
  try {
    catchup = await loadGroupCatchup(groupId);
  } catch (err) {
    if (!isMissingCatchupTable(err)) throw err;
    // Tables absent (pre-migration): a calm, on-theme stub. Never a broken card.
    return (
      <div className="card-elevated relative flex items-center gap-4 overflow-hidden rounded-[var(--radius)] border border-border bg-card p-5">
        <div className={ICON_MEDALLION_LEAF}>
          <MessagesSquare className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
            Catch-ups are coming to {groupName}
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            A gentle group newsletter is being wired up. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  if (!catchup) {
    // No Catch-up yet for this group: any member may start one.
    return (
      <Link href={`/catchups/new?group=${groupId}`} className={CARD_SHELL}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--color-leaf) 8%, transparent), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className={ICON_MEDALLION_LEAF}>
            <MessagesSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
              No Catch-up here yet
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Everyone answers a few questions. Their replies become one issue the whole group reads.
            </p>
          </div>
        </div>
        <span className={CTA_PILL}>
          Start one
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    );
  }

  const catchupStatus = catchup.status as CatchupStatus;
  const rawEdition = catchup.editions[0] ?? null;
  const edition = rawEdition ? { ...rawEdition, status: rawEdition.status as EditionStatus } : null;
  const now = new Date();
  const memberCount = catchup.group._count.members;

  const statusLine =
    catchupStatus === "paused"
      ? "This Catch-up is paused"
      : catchupStatus === "ended"
        ? "This Catch-up has ended"
        : edition
          ? describeEditionStatus(edition, now)
          : "Getting started";

  const cta = buildCta({
    catchupStatus,
    editionStatus: edition?.status ?? null,
    catchupId: catchup.id,
    editionId: edition?.id ?? null,
  });

  // Live pull (spec polish): while a Round is answering, show the same
  // who-has-answered read the Catch-up home console gives it, so this card
  // does not read as a thinner copy of the real thing.
  let answered: CatchupPersonRef[] = [];
  if (catchupStatus === "active" && edition?.status === "answering") {
    const rows = await prisma.catchupEntry.findMany({
      where: { editionId: edition.id },
      distinct: ["authorId"],
      select: { author: { select: { id: true, name: true, photoUrl: true } } },
    });
    answered = rows.map((r) => r.author);
  }

  return (
    <Link href={cta.href} className={CARD_SHELL}>
      <div className="relative flex items-center gap-4">
        <div className={ICON_MEDALLION_CINNAMON}>
          <MessagesSquare className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-leaf">
            {catchupTitle(catchup.title, groupName)}
            {edition && catchupStatus === "active" && ` · Round ${edition.number}`}
          </p>
          <p className="mt-0.5 font-heading text-[15px] font-semibold tracking-tight text-foreground">
            {statusLine}
          </p>
        </div>
      </div>

      {edition?.status === "answering" && (
        <div className="relative flex items-center gap-2.5 pl-[60px]">
          {answered.length > 0 && (
            <div className="flex -space-x-1.5">
              {answered.slice(0, 4).map((m) => (
                <BirdAvatar key={m.id} user={m} size="xs" ring />
              ))}
            </div>
          )}
          <span className="text-[12px] font-bold text-cinnamon">
            {answered.length} of {memberCount} shared
          </span>
        </div>
      )}

      <span className={CTA_PILL}>
        {cta.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
