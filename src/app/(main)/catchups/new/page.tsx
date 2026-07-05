import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { GroupFirstGuidance } from "@/components/catchups/index/group-first-guidance";
import { Plus, Users } from "lucide-react";
import { GroupPicker, type PickableGroup, type ExistingGroupCatchup } from "@/components/catchups/create/group-picker";
import { CreateCatchupForm } from "@/components/catchups/create/create-catchup-form";
import { CADENCE_LABELS, CATCHUP_PROMPT_SETS, isMissingCatchupTable, suggestSeedPrompts } from "@/lib/catchups";
import type { CatchupPersonRef } from "@/lib/catchups-types";

export const metadata: Metadata = {
  title: "Start a Catch-up",
};

type LoadResult =
  | { kind: "guidance" }
  | { kind: "redirect"; catchupId: string }
  | { kind: "picker"; groups: PickableGroup[]; existing: ExistingGroupCatchup[] }
  | {
      kind: "form";
      group: { id: string; name: string; memberCount: number; members: CatchupPersonRef[] };
    };

/**
 * A Catch-up can only be created from a group (spec 3.2). This resolves the
 * three entry shapes: no groups at all (guidance), a group already picked
 * via `?group=`, or a picker over the viewer's eligible groups. An invalid
 * or already-claimed `group` param never dead-ends: it either hands off to
 * the existing Catch-up or falls through to the picker/guidance below.
 */
async function loadCreateContext(userId: string, groupParam: string | undefined): Promise<LoadResult> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
          catchup: { select: { id: true } },
          members: {
            take: 4,
            select: { user: { select: { id: true, name: true, photoUrl: true } } },
          },
        },
      },
    },
  });

  const allGroups = memberships.map((m) => m.group);
  if (allGroups.length === 0) return { kind: "guidance" };

  if (groupParam) {
    const match = allGroups.find((g) => g.id === groupParam);
    if (match?.catchup) return { kind: "redirect", catchupId: match.catchup.id };
    if (match) {
      return {
        kind: "form",
        group: {
          id: match.id,
          name: match.name,
          memberCount: match._count.members,
          members: match.members.map((m) => m.user),
        },
      };
    }
    // Not a member of that group (or a stale/bogus id): behave as if no
    // group param was given at all, below.
  }

  const eligible: PickableGroup[] = [];
  const existing: ExistingGroupCatchup[] = [];
  for (const g of allGroups) {
    if (g.catchup) existing.push({ id: g.id, name: g.name, catchupId: g.catchup.id });
    else eligible.push({ id: g.id, name: g.name, memberCount: g._count.members });
  }

  return { kind: "picker", groups: eligible, existing };
}

export default async function NewCatchupPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { group: groupParam } = await searchParams;

  let result: LoadResult | null = null;
  try {
    result = await loadCreateContext(session.user.id, groupParam);
  } catch (err) {
    if (!isMissingCatchupTable(err)) throw err;
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Start a Catch-up" />
        <AlmostReady />
      </div>
    );
  }

  // Outside the try/catch on purpose: redirect() throws internally, and that
  // throw must propagate to Next.js, never be caught by the block above.
  if (result.kind === "redirect") {
    redirect(`/catchups/${result.catchupId}`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Start a Catch-up"
        subtitle="Everyone answers a few questions. Their replies become one issue the whole group reads."
      />
      {result.kind === "guidance" && (
        <GroupFirstGuidance
          primaryHref="/groups/new"
          primaryLabel="Create a group"
          primaryIcon={Plus}
          secondaryHref="/groups"
          secondaryLabel="Find a group"
          secondaryIcon={Users}
        />
      )}
      {result.kind === "picker" && (
        <GroupPicker groups={result.groups} existingGroups={result.existing} />
      )}
      {result.kind === "form" && (
        <CreateCatchupForm
          group={result.group}
          cadenceLabels={CADENCE_LABELS}
          promptSets={CATCHUP_PROMPT_SETS}
          initialSeedPrompts={suggestSeedPrompts()}
        />
      )}
    </div>
  );
}
