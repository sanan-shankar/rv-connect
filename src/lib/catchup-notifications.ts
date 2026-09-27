/* ------------------------------------------------------------------ *
 *  Clearing a member's Catch-up notifications when they stop being able
 *  to open that Catch-up.
 *
 *  Lived privately in the Catch-ups actions file until 2026-09-27, when
 *  a second caller needed it: `syncBatchGroup` takes a member out of a
 *  batch that is no longer theirs, and that is leaving by another route.
 *  A "use server" file may export nothing but server actions, so the
 *  helper moved here rather than being copied.
 * ------------------------------------------------------------------ */
import { prisma } from "@/lib/prisma";

/**
 * Every notification kind this feature writes. Listed rather than matched by
 * prefix so a future `catchup_`-prefixed type has to be considered here on
 * purpose: a member who has left, or binned their copy, should be left with
 * none of them, and silently missing one is a dead link in a bell.
 */
export const CATCHUP_NOTIFICATION_TYPES = [
  "catchup_questions_open",
  "catchup_answers_open",
  "catchup_reminder",
  "catchup_published",
  "catchup_sealed",
  "catchup_love",
  "catchup_comment",
] as const;

/**
 * Clear one member's waiting notifications for one Catch-up.
 *
 * Two link shapes, because the reveal and the love nudge point at a ROUND
 * (`/catchups/edition/<editionId>`) rather than at the Catch-up, so a
 * `startsWith('/catchups/<catchupId>')` filter alone quietly leaves the two
 * that matter most sitting in the bell, aimed at a page the member can no
 * longer open.
 */
export async function clearCatchupNotifications(userId: string, catchupId: string): Promise<void> {
  const editions = await prisma.catchupEdition.findMany({
    where: { catchupId },
    select: { id: true },
  });
  /* PREFIX, not equality. `catchup_comment` (build phase 9) links at one
     ANSWER -- `/catchups/edition/<id>#entry-<id>` -- so an exact match on the
     Edition's own path walked straight past every one of them and left them
     in the bell, aimed at a door that no longer opens. That is the same fault
     this function's docblock already describes, one link shape later. An
     Edition id is a cuid, so a prefix cannot reach a second Edition. */
  const editionLinks = editions.map((e) => `/catchups/edition/${e.id}`);
  await prisma.notification.deleteMany({
    where: {
      userId,
      type: { in: [...CATCHUP_NOTIFICATION_TYPES] },
      OR: [
        { link: { startsWith: `/catchups/${catchupId}` } },
        ...editionLinks.map((link) => ({ link: { startsWith: link } })),
      ],
    },
  });
}
