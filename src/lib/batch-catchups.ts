/* ------------------------------------------------------------------ *
 *  The batch Catch-up: the one that exists whether anybody asked for it
 *  or not.
 *
 *  His, brief 4 and 51: "anyone in that batch is automatically added to
 *  that catch-up, can see the history of rounds ... can participate in
 *  any future rounds ... This batch catch-up should exist by default",
 *  and "the batch catch up can't edit people in and out it's just
 *  people in that batch and they're all automatically added and have
 *  access to previous issues if they join later."
 *
 *  NOTHING NEW IS MODELLED. A batch is already a `Group` with
 *  `batchYear` set, and a Catch-up is already one row per Group (F6), so
 *  "a batch Catch-up by default" is one `Catchup` row per batch group
 *  and no schema change at all. What this file holds is the three
 *  places that have to make sure that row exists, minus the one-time
 *  backfill, which is
 *  `prisma/migrations-manual/2026-09-08-batch-catchups.sql`:
 *
 *    1. `joinBatchGroup`, at signup. It is also the moment a batch
 *       CROSSES the floor: the tenth person from a batch signing up is
 *       the event, and this is the code that runs on it.
 *    2. `healBatchGroupMemberships` and `healBatchCatchups`, the daily
 *       tick's two idempotent passes, which repair a signup whose
 *       best-effort block failed.
 *
 *  And `syncBatchGroup`, for the member whose batch year CHANGES after
 *  signup: it takes them out of the old batch as well as into the new one.
 *
 *  WHICH OF THE TWO ACTUALLY RUNS, checked rather than assumed:
 *  `/api/catchups/tick` requires `CRON_SECRET`, that secret IS set (in
 *  .env, on Vercel and in GitHub), and the route answers 200 to a
 *  correctly signed request -- verified 2026-09-08 against the running
 *  dev server, with both passes coming back a clean no-op. So the nightly
 *  sweep is live and both paths are real: signup creates a batch
 *  Catch-up the moment a batch reaches ten, and the tick catches
 *  everything signup could not.
 *
 *  What a batch Catch-up is NOT: it has no Keeper (`createdById` null),
 *  no invite link (`inviteToken` null -- there is nobody to invite, the
 *  membership IS the batch), no manual transitions of any kind, and no
 *  way out but archiving. Those refusals live with the actions that hold
 *  them; `BATCH_CATCHUP_REFUSAL` in catchups-core.ts is their sentence.
 *
 *  No em dashes. User-facing copy says "Rishi Valley", never "Alumni".
 * ------------------------------------------------------------------ */
import { prisma } from "@/lib/prisma";
import { reportSwallowed } from "@/lib/report-error";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { pickCatchupPicture } from "@/lib/catchup-picture-pick";
import { BATCH_CADENCE, BATCH_CATCHUP_FLOOR, isMissingCatchupTable } from "@/lib/catchups-core";
import { clearCatchupNotifications } from "@/lib/catchup-notifications";

/**
 * Find-or-create the "Batch of {year}" group, add the user to it, and make
 * sure the batch has its Catch-up.
 *
 * MOVED HERE FROM `src/components/auth/actions.ts` in build phase 4, unchanged
 * apart from the last line. It has to be callable from two places now -- the
 * signup action and the tick's self-heal -- and a `"use server"` file may
 * export nothing but async server actions, so it could not stay there and be
 * shared.
 *
 * The batch's identity is `Group.batchYear`, which is unique, NOT its name.
 * This used to be a findFirst-by-name then create with nothing constraining
 * it: two members of the same batch registering in the same second both missed
 * the read and both created "Batch of 2010", after which every later signup
 * landed in whichever one the unordered findFirst returned. The batch was
 * permanently split into two groups whose members could not see each other,
 * and launch day is exactly the concurrency spike that needs (bug audit
 * B-121).
 *
 * So: try to create, and let the LOSER of the race be told by the database
 * rather than by a read it did a moment earlier. Same shape
 * createCatchupWithPeople uses.
 *
 * The group has no creator. Everyone joins as a plain member, the first person
 * included, so creatorId would only have recorded who signed up first -- while
 * making their account deletion look like it owned the batch. That plain
 * "member" role is now load-bearing rather than merely tidy: `isEffectiveKeeper`
 * reads it, so a batch group in which nobody is "admin" or "keeper" is a
 * Catch-up nobody keeps, which is the whole design.
 *
 * Idempotent on membership via the GroupMember (groupId, userId) unique, so
 * re-running is safe.
 */
export async function joinBatchGroup(userId: string, batchYear: number) {
  const find = () => prisma.group.findFirst({ where: { batchYear }, select: { id: true } });

  let group = await find();
  if (!group) {
    try {
      group = await prisma.group.create({
        data: {
          name: `Batch of ${batchYear}`,
          batchYear,
          creatorId: null,
        },
        select: { id: true },
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Somebody else from this batch created it between our read and our
      // write. Their row is the batch's group; join that one.
      group = await find();
      if (!group) throw err;
    }
  }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId } },
    create: { groupId: group.id, userId, role: "member" },
    update: {},
  });

  // And the Catch-up, which is the phase-4 addition. Nobody is told: see
  // ensureBatchCatchup.
  await ensureBatchCatchup(group.id);
}

/**
 * Make sure one batch group has its Catch-up, if it is big enough to deserve
 * one.
 *
 * Idempotent, and the guarantee is a database constraint rather than the read
 * above it: `Catchup.groupId` is unique, so two simultaneous tenth-members
 * produce one Catch-up and the loser silently finds it already there. Returns
 * the Catch-up's id when it made one, null when it did not (already there, too
 * small, or not a batch group).
 *
 * The FLOOR is checked here rather than by the caller because all three
 * callers want the same answer and the count is the same query every time.
 * Under it, nothing is created at all -- and per spec 3.5b that member also
 * has no Catch-ups item on their sidebar, so there is no empty door either.
 *
 * WHAT IT CREATES, and every field is a decision:
 *   - `createdById` null. Nobody keeps a batch Catch-up (architecture 6).
 *   - `inviteToken` null. There is nobody to invite: the membership is the
 *     batch, and `joinCatchupByToken` is the one door this closes.
 *   - the rhythm `BATCH_CADENCE`, every three months (owner, 2026-09-27).
 *   - a picture, from the shipped pool, the one the batch sees least on the
 *     Catch-ups its members already have, exactly as `createCatchupWithPeople`
 *     picks (spec 3.4). Every Catch-up has one from the day it is made.
 *   - Edition 1, open and `collecting`, with NO question deadline and NO
 *     notification. It appears at ten ("once there's ten it appears and the
 *     catch up would be created for that batch") but does not start: the
 *     window stays open until the batch has asked `BATCH_QUESTIONS_TO_START`
 *     questions, and the one that makes three starts the usual three days
 *     (`submitPrompt`). Nobody had asked for it, so nobody is told.
 */
export async function ensureBatchCatchup(groupId: string): Promise<string | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      batchYear: true,
      catchup: { select: { id: true } },
      _count: { select: { members: true } },
    },
  });
  if (!group || group.batchYear == null) return null;
  if (group.catchup) return null;
  if (group._count.members < BATCH_CATCHUP_FLOOR) return null;

  const picture = await pickCatchupPicture(prisma, group.id);

  try {
    return await prisma.$transaction(async (tx) => {
      const catchup = await tx.catchup.create({
        data: {
          groupId: group.id,
          createdById: null,
          inviteToken: null,
          cadence: BATCH_CADENCE,
          pictureSrc: picture.src,
          pictureFocus: picture.focus,
        },
      });
      await tx.catchupEdition.create({
        data: {
          catchupId: catchup.id,
          number: 1,
          status: "collecting",
          questionsCloseAt: null,
        },
      });
      return catchup.id;
    });
  } catch (err) {
    // Somebody else's tenth-member click got there first. The unique on
    // `groupId` is the guarantee; this is the losing half of it, and it is a
    // no-op, not a failure.
    if (isUniqueViolation(err)) return null;
    throw err;
  }
}

/**
 * Put a member in the batch group their row names, and take them out of
 * every other one.
 *
 * `joinBatchGroup` only ever adds, which was right at signup and wrong the
 * first time anyone fixed a typo'd year afterwards: the new batch's group
 * gained them (the nightly heal saw to that) and the old one never lost
 * them. Measured 2026-09-27: seven members sat in a batch that was not
 * theirs, able to open that batch's Catch-up and read its history. His
 * word on it: "obviously they shouldn't see the previous batch's catch up".
 *
 * Only alumni belong to a batch, which is the same rule the heal joins by;
 * a teacher, or anyone whose year is cleared, is in none.
 *
 * Leaving is the same leaving `leaveCatchup` does: the membership, their
 * own pref row, and any bell still pointing at the old Catch-up go; their
 * words, if they wrote any, stay in the Editions other people have read.
 * No Keeper succession, because a batch group has no Keeper to hand on.
 */
export async function syncBatchGroup(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { batchYear: true, accountType: true },
  });
  if (!user) return;
  const own = user.accountType === "alumnus" ? user.batchYear : null;

  const memberships = await prisma.groupMember.findMany({
    where: { userId, group: { batchYear: { not: null } } },
    select: { groupId: true, group: { select: { batchYear: true, catchup: { select: { id: true } } } } },
  });
  for (const m of memberships) {
    if (m.group.batchYear === own) continue;
    await prisma.groupMember.deleteMany({ where: { groupId: m.groupId, userId } });
    const catchupId = m.group.catchup?.id;
    if (catchupId) {
      await prisma.catchupPref.deleteMany({ where: { catchupId, userId } });
      await clearCatchupNotifications(userId, catchupId);
    }
  }

  if (own != null) await joinBatchGroup(userId, own);
}

/**
 * `syncBatchGroup` for the two edit paths, which have already saved the year
 * by the time it runs. Best-effort and reported, like the signup call: the
 * saved year is the truth, and the nightly heal finishes the move if this
 * half fails.
 */
export async function syncBatchGroupQuietly(userId: string): Promise<void> {
  try {
    await syncBatchGroup(userId);
  } catch (err) {
    if (isMissingCatchupTable(err)) return;
    reportSwallowed("catchups", err, { step: "syncBatchGroup", userId });
  }
}

/**
 * Tick pass one: every member is in their own batch group, and no other.
 *
 * THIS FAILURE HAS ALREADY HAPPENED. `registerUser` calls `joinBatchGroup`
 * inside a best-effort try/catch, and the comment beside it said so in as many
 * words: "there is no self-heal anywhere: nothing re-checks 'an alumnus with a
 * batchYear and no batch-group row', so a pool timeout during a launch-day
 * burst left that member out of their batch permanently, with no witness but a
 * Vercel log line." Measured on 2026-09-08: one member, Rukmini Rau, carries
 * `batchYear` 2024 and was not in the Batch of 2024 group. The one-time repair
 * is in the migration; this is what stops the next one lasting.
 *
 * Since 2026-09-27 it also finds the opposite fault: a member still in a batch
 * group that is not theirs, whose year changed by some path that did not call
 * `syncBatchGroup` (an admin merge, a hand-run fix, anything written later).
 * Both kinds go through `syncBatchGroup`, which does the whole move.
 *
 * It creates the group when it is missing, for the same reason `joinBatchGroup`
 * does: the member most likely to need healing is the FIRST of their batch, and
 * a heal that refuses to create a group could never repair them.
 *
 * Idempotent (upsert per member) and normally zero rows. It is NOT an indexed
 * read, and the honest shape matters if this ever runs against a much larger
 * table: `User.batchYear` and `User.accountType` carry no index, so the plan is
 * a SEQ SCAN of `User` feeding a hash anti-join against the batch memberships,
 * which ARE indexed (`GroupMember(groupId, userId)`, `Group.batchYear` unique).
 * Measured on the live database 2026-09-08: 0.35ms over 64 alumni, 0 rows out.
 * That is the right trade at this size -- an index to serve one nightly pass
 * would cost every signup a write -- and at ten thousand members it is still
 * one sequential scan a night. Returns how many it repaired.
 */
export async function healBatchGroupMemberships(): Promise<number> {
  /* Raw, because Prisma cannot express "a member row in the group whose
     batchYear equals THIS user's batchYear" -- the correlation is between two
     columns on two tables, and a relation filter can only compare against a
     literal. The alternative is reading every alumnus with their memberships
     and doing it in JavaScript, which is the whole User table on every tick. */
  const misfiled = await prisma.$queryRaw<{ id: string }[]>`
    SELECT u.id
      FROM "User" u
     WHERE (u."batchYear" IS NOT NULL
            AND u."accountType" = 'alumnus'
            AND NOT EXISTS (
                  SELECT 1
                    FROM "GroupMember" m
                    JOIN "Group" g ON g.id = m."groupId"
                   WHERE m."userId" = u.id AND g."batchYear" = u."batchYear"))
        OR EXISTS (
             SELECT 1
               FROM "GroupMember" m
               JOIN "Group" g ON g.id = m."groupId"
              WHERE m."userId" = u.id
                AND g."batchYear" IS NOT NULL
                AND (u."accountType" <> 'alumnus' OR g."batchYear" IS DISTINCT FROM u."batchYear"))
  `;

  let healed = 0;
  for (const user of misfiled) {
    try {
      await syncBatchGroup(user.id);
      healed += 1;
    } catch (err) {
      // One member's repair failing must not stop the other nine. Reported
      // rather than logged, for the same reason the signup path reports: the
      // symptom of this going wrong is silence.
      reportSwallowed("catchups", err, {
        step: "healBatchGroupMemberships",
        userId: user.id,
      });
    }
  }
  return healed;
}

/**
 * Tick pass two: every batch group at or over the floor has a Catch-up.
 *
 * Also the mechanism by which a batch that grows past ten between signups gets
 * one -- a member being added to a batch group by anything other than
 * `joinBatchGroup` (a repair, a hand-run pass, an import) would otherwise leave
 * the batch over the floor with no Catch-up until the next person registered.
 *
 * Runs AFTER pass one, deliberately: healing a membership can be the thing that
 * carries a batch over the floor, and doing it in the other order would leave
 * that batch waiting a whole day for its Catch-up. Returns how many it made.
 */
export async function healBatchCatchups(): Promise<number> {
  const groups = await prisma.group.findMany({
    where: { batchYear: { not: null }, catchup: { is: null } },
    select: { id: true, _count: { select: { members: true } } },
  });

  let made = 0;
  for (const group of groups) {
    if (group._count.members < BATCH_CATCHUP_FLOOR) continue;
    try {
      if (await ensureBatchCatchup(group.id)) made += 1;
    } catch (err) {
      reportSwallowed("catchups", err, { step: "healBatchCatchups", groupId: group.id });
    }
  }
  return made;
}

/**
 * Both passes, wrapped so they can never throw and never be the reason a page
 * or a cron fails.
 *
 * Called from `advanceDueCatchups` only when it is UNSCOPED, never on the lazy
 * read-time advance that fires on essentially every authenticated page view.
 * The two passes each scan a whole table; that is a nightly cost, not a
 * per-page-view one, and the `userId` argument is the whole distinction.
 *
 * "Unscoped" is not the same as "the cron", and the difference is worth being
 * accurate about: `/api/catchups/tick` is one unscoped caller and
 * `/admin/catchups` is the other. That second one is deliberate and predates
 * this -- the admin room's job is to show every Catch-up's true state, so it
 * sweeps the lot -- and it means these passes also run when the owner opens
 * that page. Which is harmless (one person, and both passes are normally zero
 * rows) but it is not what "only on the cron" would mean.
 * `batch-catchups.test.mjs` pins the list of unscoped callers, so a THIRD one
 * appearing on a member-facing page fails the build rather than quietly
 * putting two table scans on it.
 */
export async function healBatchCatchupsAndMemberships(): Promise<void> {
  try {
    await healBatchGroupMemberships();
    await healBatchCatchups();
  } catch (err) {
    if (isMissingCatchupTable(err)) return; // tables absent (pre-migration): no-op
    reportSwallowed("catchups", err, { step: "healBatchCatchupsAndMemberships" });
  }
}
