import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { CreateCatchupForm } from "@/components/catchups/create/create-catchup-form";
import type { PickedPerson } from "@/components/catchups/create/people-picker";
import { CADENCE_LABELS, isMissingCatchupTable } from "@/lib/catchups";

export const metadata: Metadata = {
  title: "Start a Catch-up",
};

/**
 * Start a Catch-up.
 *
 * Previously this route could only be reached with a group in hand, and it
 * resolved three shapes: guidance when you had no groups, a group picker, or
 * the form for an already-chosen group. Groups are now being retired as a
 * user-facing feature (owner, 2026-07-25), so all three collapse into one
 * form: name it, pick the people, pick the rhythm. The Group row that still
 * backs membership underneath is created silently by `createCatchupWithPeople`.
 *
 * The only thing loaded here is the viewer's batch year, which seeds both the
 * suggested name and the "everyone from my batch" shortcut, so the overwhelmingly
 * common case (a batch Catch-up) takes no typing at all.
 *
 * `?group=<id>` is still a live link: the index's "Start one" row on a group
 * that has no Catch-up yet points here with the group preselected. This page
 * used to ignore the param entirely, landing on a blank form (a real bug, not
 * a design choice) -- it now resolves that group's name and members
 * server-side (only if the viewer is actually a member of it) and preloads
 * them into the form, so the picker opens with those people already chipped
 * in instead of asking the viewer to redo work the group already recorded.
 */
export default async function NewCatchupPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { group: groupId } = await searchParams;

  let batchYear: number | null = null;
  let tableMissing = false;
  let groupName: string | null = null;
  let groupMembers: PickedPerson[] = [];
  try {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { batchYear: true },
    });
    batchYear = me?.batchYear ?? null;

    if (groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: session.user.id } },
        select: { id: true },
      });
      if (membership) {
        const group = await prisma.group.findUnique({
          where: { id: groupId },
          select: {
            name: true,
            members: {
              select: {
                user: {
                  select: { id: true, name: true, photoUrl: true, birdOverride: true, batchYear: true },
                },
              },
            },
          },
        });
        if (group) {
          groupName = group.name;
          groupMembers = group.members
            .map((m) => m.user)
            .filter((u) => u.id !== session.user.id);
        }
      }
    }
  } catch (err) {
    if (!isMissingCatchupTable(err)) throw err;
    tableMissing = true;
  }

  if (tableMissing) {
    return (
      <div>
        <PageHeader title="Start a Catch-up" />
        <AlmostReady />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Start a Catch-up" />
      <CreateCatchupForm
        cadenceLabels={CADENCE_LABELS}
        myBatchYear={batchYear}
        suggestedName={groupName ?? (batchYear ? `Batch of ${batchYear}` : "")}
        initialPeople={groupMembers}
      />
    </div>
  );
}
