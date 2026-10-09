import { prisma } from "@/lib/prisma";
import { speciesForMember } from "@/lib/avatar";
import { dealBird, tallyVisibleWearers } from "@/lib/avatar-deal";
import { resolveBirdOverride } from "@/components/common/bird-avatar-v2";
import { WEARABLE_SPECIES } from "@/components/support/plate-data";

/**
 * The database half of the dealing rule; the rule itself, and why, is avatar-deal.ts. Split from
 * it because this file reaches Prisma and a .tsx file, neither of which node:test can load.
 * Server only: never import it, directly or transitively, from a "use client" component.
 */

/**
 * Visible wearers per species index across every member, each resolved through BirdAvatar's own
 * precedence (override, then pin, then hash), so a paid pick counts under the bird it bought and
 * a member whose hash lands on the Hoopoe counts under the Treepie they actually show. One query,
 * three columns: a few hundred rows today and still small at a few thousand.
 */
export async function countVisibleWearers(): Promise<Map<number, number>> {
  const members = await prisma.user.findMany({
    select: { id: true, birdOverride: true, photoUrl: true },
  });
  return tallyVisibleWearers(members, (m) =>
    speciesForMember(m.id, resolveBirdOverride(m.id, m.birdOverride))
  );
}

/**
 * The slug for a member about to be created. Dealt from WEARABLE_SPECIES, the list chooseBird
 * validates a paid pick against, so a species appended to the drawings joins the deal with no
 * other change, at zero wearers, which puts it first in line.
 */
export async function dealNewMemberBird(): Promise<string> {
  return dealBird(await countVisibleWearers(), WEARABLE_SPECIES, Math.random);
}
