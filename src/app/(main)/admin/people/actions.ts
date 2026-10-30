"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { occupationCase, titleCase } from "@/lib/normalize";
import {
  requireAdminAction,
  requireAdminActor,
  refuseSelfOrLastAdmin,
  type AdminActionResult,
} from "@/lib/admin";
import { readPeopleFilters, type PeoplePage } from "@/lib/admin-people";
import { loadPeoplePage } from "@/lib/admin-people-query";
import { writeAudit } from "@/lib/audit";
import {
  drainPendingImagePurges,
  dropCollidingAnswers,
  groupsKeptBy,
  purgeUserAccount,
} from "@/lib/account-purge";
import { CATCHUP_PEOPLE } from "@/lib/catchup-caps";
import { lockGroup, promoteGroupSuccessor } from "@/lib/group-succession";
import { isSerializationFailure } from "@/lib/prisma-errors";
import { reportSwallowed } from "@/lib/report-error";
import { OCCUPATION_MAX, batchTypeFromLeaving, valleyYear } from "@/lib/utils";
import { parsePlaces, resolvePlaces } from "@/lib/place-input";
import { replaceUserPlaces } from "@/lib/place-write";
import { lookupGazetteerPlaces } from "@/lib/place-lookup";
import { SPECIES_SLUGS } from "@/components/common/bird-avatar-v2";
import { tryRosterAutoVerifyQuietly } from "@/lib/roster";
import { ADMIN_WITHHELD } from "@/lib/roster-rule";
import { syncBatchGroupQuietly } from "@/lib/batch-catchups";

/* ------------------------------------------------------------------ *
 *  Everything you can do TO a person, from the panel.
 *
 *  These exist because the alternative was a psql prompt. In the week of
 *  2026-08-18 the owner fixed a member's city, two name capitalisations and
 *  a bird override by hand-writing SQL against the live database, which is
 *  also the fastest way to hit bugs.md #6: `createdAt` columns are
 *  `timestamp without time zone`, and a row written through raw `pg` reads
 *  back 5h30m ahead through Prisma. Everything here goes through Prisma.
 *
 *  Every one re-checks the role. The admin layout's guard covers navigation;
 *  a server action is its own entry point and is reachable by anyone who can
 *  POST to it.
 * ------------------------------------------------------------------ */

/** The whole admin tree, including the rail's counts, which live in its layout. */
function revalidateAdmin(userId?: string) {
  revalidatePath("/admin", "layout");
  if (userId) revalidatePath(`/profile/${userId}`);
}

/**
 * The next page of People.
 *
 * A read, but a server action anyway: `loadPosts` and `loadDirectoryPage`
 * already set that pattern here, and it keeps the filter-to-`where`
 * translation in one module rather than exposing a query-shaped URL.
 */
export async function loadMorePeople(
  params: Record<string, string>,
  cursor: string
): Promise<PeoplePage | { error: string }> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  return loadPeoplePage(readPeopleFilters(params), cursor);
}

/* ---------------------------------------------------------------- *
 *  Their details
 * ---------------------------------------------------------------- */

const ACCOUNT_TYPES = ["alumnus", "teacher", "ex_teacher"] as const;

export interface PersonEdit {
  name: string;
  accountType: string;
  batchYear: string;
  birdOverride: string;
  jobTitle: string;
  workplace: string;
}

/**
 * The six fields the owner has actually had to fix by hand.
 *
 * `name` is title-cased on the way in, which is the same treatment the
 * profile form gives it, and is what "P.v." -> "P.V." and "gnlu" -> "GNLU"
 * were about. An empty name is refused rather than silently kept: a nameless
 * row renders as a blank byline everywhere in the app.
 *
 * `jobTitle` and `workplace` get `occupationCase`, titleCase's twin that keeps
 * a one-word acronym, because that is what the member's own profile pen does
 * to them on commit -- a correction typed here should not read differently
 * from one typed there.
 * Either may be blanked: plenty of members have one half and not the other,
 * and the profile prints "at" only between two real halves.
 *
 * Deliberately NOT here: email (it is the login and the unique key, and
 * changing it out from under somebody locks them out), and `verifyState`
 * (that has its own verbs, below, which also write `verifyMethod` and notify).
 */
export async function adminUpdatePerson(
  userId: string,
  edit: PersonEdit
): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  const name = titleCase(edit.name);
  if (!name) return { error: "A name is required." };

  const accountType = ACCOUNT_TYPES.includes(edit.accountType as (typeof ACCOUNT_TYPES)[number])
    ? edit.accountType
    : "alumnus";

  // A blank year clears it, which teachers need. Anything outside living
  // memory is a typo, not a batch.
  const yearRaw = edit.batchYear.trim();
  let batchYear: number | null = null;
  if (yearRaw) {
    const parsed = Number.parseInt(yearRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1930 || parsed > valleyYear() + 10) {
      return { error: "That batch year does not look right." };
    }
    batchYear = parsed;
  }

  /* A misspelled slug used to "succeed" while changing nothing: the value went
     into the column, `resolveSpeciesOverride` failed to find it and fell
     through to the hash, and the admin was told it saved (audit Low 10). The
     slug list is the same one the glyph resolves against, so what this accepts
     and what actually renders cannot disagree. Reserved species (the Hoopoe,
     the Indian Roller) are deliberately NOT excluded here -- the render layer
     enforces those reservations per account, and second-guessing it in a form
     validator would be a second copy of that rule. */
  const bird = edit.birdOverride.trim().toLowerCase();
  if (bird && !SPECIES_SLUGS.includes(bird)) {
    return { error: `"${bird}" is not one of the bird species.` };
  }

  // The same cap `profileSchema` puts on the member's own form. Refused, not
  // truncated: silently dropping the tail of somebody's job title is how the
  // admin ends up believing they saved something they did not.
  const jobTitle = occupationCase(edit.jobTitle);
  const workplace = occupationCase(edit.workplace);
  if (jobTitle.length > OCCUPATION_MAX || workplace.length > OCCUPATION_MAX) {
    return { error: `Keep the occupation and the organisation under ${OCCUPATION_MAX} characters.` };
  }

  /* batchType is DERIVED from the two years, never typed, and this action
     writes one of them -- so it has to re-derive the other half exactly as
     `updateProfileField` does when the member edits their own (audit C-041).
     It did not, and the credential drifted: correct somebody's batch year
     across the ICSE/ISC boundary and the stored board stayed as it was, so
     `batchTargetKey` built "ISC-2012" where the truth is "ICSE-2012" and a
     batch-targeted post went to the wrong set of people. Nothing visible gave
     it away, because the byline formats from batchYear alone.

     A cleared year clears the credential too. That is the teacher case the
     year parsing above exists for, and there is no board to derive from a
     year nobody has. */
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { yearLeft: true },
  });
  const batchType =
    batchYear != null && current?.yearLeft != null
      ? batchTypeFromLeaving(current.yearLeft, batchYear)
      : batchYear == null
        ? null
        : undefined;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      accountType,
      batchYear,
      batchType,
      // Clearing the override returns them to their deterministic bird, which
      // is the fix the owner needed on 2026-08-18 when a stale override was
      // hiding an Indian Roller.
      birdOverride: bird || null,
      jobTitle: jobTitle || null,
      workplace: workplace || null,
    },
  });

  /* The office roster matches on name and batch year, and an admin fixing
     either is the moment a member who could not be matched becomes matchable
     -- the same hook `updateProfileField` fires when they fix it themselves.
     Best-effort, like every roster call: it can only ever raise standing, and
     never on a row an admin has decided, so correcting the name of somebody
     you removed verification from leaves them removed (T7a-06). A name match
     here sends them to the verify queue rather than verifying them. */
  await tryRosterAutoVerifyQuietly(userId);

  // A new batch year, or a new account type, is a move between batch groups:
  // out of the old batch's Catch-up as well as into the new one's.
  await syncBatchGroupQuietly(userId);

  revalidateAdmin(userId);
  revalidatePath("/directory");
  return { success: true };
}

/**
 * Their cities, for somebody else.
 *
 * `updateUserPlaces` in the settings actions does this for the SIGNED-IN
 * user and cannot be reused: it reads the target from the session. Same
 * transaction shape, so the two cannot disagree about what a place record
 * looks like: wipe, recreate in order, then mirror the first one into the
 * legacy `currentCity` string the directory and profiles still read.
 */
export async function adminUpdatePlaces(
  userId: string,
  places: unknown
): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  // Validated before anything is touched: these two actions took the array on
  // faith, so an oversized label, a non-finite coordinate or a non-object
  // element all reached the database or threw a raw TypeError (audit B-111).
  const parsed = parsePlaces(places);
  if (!parsed.ok) return { error: parsed.error };
  const cleaned = await resolvePlaces(parsed.places, titleCase, lookupGazetteerPlaces);

  await replaceUserPlaces(userId, cleaned);

  revalidateAdmin(userId);
  revalidatePath("/directory");
  return { success: true };
}

/* ---------------------------------------------------------------- *
 *  Their standing
 * ---------------------------------------------------------------- */

/**
 * Auto-approve this person's future photo uploads.
 *
 * `photoTrusted` has been a column with no interface anywhere in the app.
 * `contributePhoto` reads it, so the feature works; nobody could ever be
 * granted it, so every upload from a regular member sat in the queue forever.
 */
export async function adminSetPhotoTrusted(
  userId: string,
  trusted: boolean
): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  await prisma.user.update({ where: { id: userId }, data: { photoTrusted: trusted } });
  revalidateAdmin(userId);
  return { success: true };
}

/**
 * Make somebody an admin, or stop them being one.
 *
 * Refuses to remove the LAST admin. Since 2026-08-19 there is genuinely no
 * other door into this panel: the /api/auth/admin-login bypass that used to
 * mint an admin session from an email address alone is deleted (security
 * audit C1-b), and its local replacement 404s outside development. So
 * demoting the only admin locks everybody out of moderation permanently, and
 * the only way back would be editing the database by hand.
 */
export async function adminSetRole(
  userId: string,
  role: "admin" | "member"
): Promise<AdminActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  // Demotion goes through the shared guard, which counts the remaining admins
  // AFTER the write and inside a serializable transaction. The old shape --
  // count, then update, no transaction -- let two admins demote each other in
  // the same second and leave zero (audit M26). Promotion cannot lock anybody
  // out, so it goes straight through.
  if (role === "member") {
    const refused = await refuseSelfOrLastAdmin(actor.actorId, userId, "demote", async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { role } });
    });
    if (refused) return refused;
  } else {
    await prisma.user.update({ where: { id: userId }, data: { role } });
  }

  await writeAudit({
    actorId: actor.actorId,
    action: "admin.role",
    targetType: "user",
    targetId: userId,
    ip: actor.ip,
    detail: `-> ${role}`,
  });

  revalidateAdmin(userId);
  return { success: true };
}

/* ---------------------------------------------------------------- *
 *  Merging a duplicate
 * ---------------------------------------------------------------- */

/**
 * Fold a duplicate account into the real one, then delete it.
 *
 * Somebody signing up twice is a matter of time in an alumni directory, and
 * the fix has been a hand-written migration. What this does, and what it
 * deliberately does not:
 *
 *  MOVED   the things that are a record of what somebody made or gave, and
 *          would be a real loss: posts, comments, photos, contributions,
 *          Catch-up prompts and entries, the threads they opened with the
 *          admins, and reports, both the ones they filed and the ones filed
 *          against them (moderation history, bug audit 3, T7a-01).
 *
 *  DROPPED the duplicate's engagement: likes, comment likes, bookmarks, poll
 *          votes, photo loves, Catch-up loves, preferences. Every one of
 *          these carries a `@@unique([userId, thingId])`, so moving them
 *          throws the moment both accounts touched the same post, and a
 *          second like from the same human is not information worth an
 *          error path.
 *
 *  DROPPED the auth substrate (sessions, accounts, tokens, queued mail) and
 *          their places. The surviving account has its own.
 *
 *  INHERITED anything the duplicate happened to OWN: the groups it created,
 *          the Catch-ups it keeps, and its group memberships. Without this the
 *          merge quietly demoted the human -- `Group.creatorId` went null and
 *          the duplicate's memberships cascaded away, so a member merged out of
 *          their own Catch-up lost it (bug audit B-001).
 *
 * Where a move would collide with a row the survivor already has -- the same
 * group, the same answer to the same question -- the duplicate's row is dropped
 * rather than moved. It used to abort the entire merge instead (audit M02).
 *
 * A dropped answer takes the replies under it with it (build phase 9 gave an
 * answer a thread, `Comment.entry` is Cascade). Decided, not overlooked: the
 * alternative is re-pointing them at the survivor's answer, which files
 * somebody's reply under words they never read. It needs one human with two
 * accounts, both in one Catch-up, both answering one question, and somebody
 * replying to the duplicate -- the same trade the post cascade already makes.
 *
 * The Keeper's hat goes to the survivor only if they could be handed it by
 * anyone (CATCHUP_PEOPLE); otherwise it passes as it would if the duplicate
 * had left (bug audit 3, B3a's review follow-up).
 *
 * One transaction: a half-merged pair is worse than either state.
 */
export async function adminMergeUsers(
  sourceId: string,
  targetId: string
): Promise<AdminActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  if (sourceId === targetId) return { error: "That is the same account." };

  const [source, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: sourceId }, select: { id: true, role: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }),
  ]);
  if (!source) return { error: "The duplicate account no longer exists." };
  if (!target) return { error: "Could not find the account to merge into." };
  if (source.role === "admin") {
    return { error: "Take away the admin role before merging this account away." };
  }

  let handedOn = 0;
  let queued: string[];
  try {
    queued = await prisma.$transaction(
      async (tx) => {
        /* The groups whose Keeper's hat the duplicate wears, read before
           anything moves, and each held for the rest of the transaction:
           `lockGroup` is what every change to who wears a hat takes first
           (bug audit 3, L1-03), and sorted, so two merges take them in one
           order. */
        const keptGroups = await groupsKeptBy(tx, sourceId);
        for (const groupId of keptGroups) await lockGroup(tx, groupId);
        /* Whether the survivor may take the hat at all. Every other path that
           hands it on gives it only to someone who can act (CATCHUP_PEOPLE:
           a verified alumnus with a confirmed email, not blocked, not leaving,
           not the Anonymous byline), and this one gave it to the survivor
           whatever they were (bug audit 3, B3a's review follow-up). When the
           survivor cannot keep it, it goes where leaving would send it. */
        const survivorCanKeep =
          (await tx.user.count({ where: { id: targetId, AND: [CATCHUP_PEOPLE] } })) > 0;

        // Kept.
        await tx.post.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } });
        await tx.comment.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } });
        await tx.photo.updateMany({ where: { uploaderId: sourceId }, data: { uploaderId: targetId } });
        await tx.contribution.updateMany({ where: { userId: sourceId }, data: { userId: targetId } });
        await tx.catchupPrompt.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } });
        // CatchupEntry carries @@unique([promptId, authorId]), so an answer the
        // survivor already wrote to the same question blocks the move. Drop the
        // duplicate's copy first and move the rest, rather than failing the whole
        // merge on one shared question (audit M02). The dropped answers' files
        // are queued with them and drained after the commit (V-T7a-02).
        const droppedUrls = await dropCollidingAnswers(tx, sourceId, targetId);
        await tx.catchupEntry.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } });
        await tx.adminThread.updateMany({ where: { memberId: sourceId }, data: { memberId: targetId } });
        await tx.adminMessage.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } });
        // The admins' bells about the duplicate ("asked to be verified",
        // "matches the office list by name") lead to its person page, which
        // 404s once it is gone: point them at the survivor's (bug audit 3,
        // C8-09). Thread bells need nothing; the threads move above.
        await tx.notification.updateMany({
          where: { link: `/admin/people/${sourceId}` },
          data: { link: `/admin/people/${targetId}` },
        });

        // Owned, not authored. Same shape: shed the collisions, move the rest.
        // Who STARTED a group or a Catch-up moves whatever the survivor's
        // standing: it is the same human, and the creator is always a Keeper
        // (docs/spec/catchups.md 2.2). One who cannot act presses nothing,
        // since every Keeper control waits for a verified member, and counts
        // for nothing in succession below, so the Catch-up is still tended.
        await tx.group.updateMany({ where: { creatorId: sourceId }, data: { creatorId: targetId } });
        await tx.catchup.updateMany({ where: { createdById: sourceId }, data: { createdById: targetId } });
        // If the duplicate was the group's Keeper and the survivor is already an
        // ordinary member of it, dropping the colliding row would quietly demote
        // the human. Carry the hat over first, then drop. As "keeper", the role
        // every path hands the hat on with: this wrote "admin", which a Keeper's
        // revoke never matched (bug audit 3, T7a-07). Only to a survivor who can
        // keep it (above).
        if (survivorCanKeep) {
          await tx.groupMember.updateMany({
            where: {
              userId: targetId,
              group: { members: { some: { userId: sourceId, role: { in: ["admin", "keeper"] } } } },
            },
            data: { role: "keeper" },
          });
        }
        await tx.groupMember.deleteMany({
          where: { userId: sourceId, group: { members: { some: { userId: targetId } } } },
        });
        // The duplicate's other memberships become the survivor's, hat and all,
        // or as plain membership when the survivor cannot keep a hat.
        await tx.groupMember.updateMany({
          where: { userId: sourceId },
          data: survivorCanKeep ? { userId: targetId } : { userId: targetId, role: "member" },
        });
        // Ordinary succession for every group the duplicate kept: the
        // longest-standing member who can act, unless one already wears a hat.
        if (!survivorCanKeep) {
          for (const groupId of keptGroups) {
            if (await promoteGroupSuccessor(tx, groupId, sourceId)) handedOn += 1;
          }
        }

        // Dropped: unique-keyed engagement that would collide on the way over.
        await tx.like.deleteMany({ where: { userId: sourceId } });
        await tx.commentLike.deleteMany({ where: { userId: sourceId } });
        await tx.bookmark.deleteMany({ where: { userId: sourceId } });
        await tx.pollVote.deleteMany({ where: { userId: sourceId } });
        await tx.photoLove.deleteMany({ where: { userId: sourceId } });
        await tx.catchupEntryLove.deleteMany({ where: { userId: sourceId } });
        await tx.catchupPref.deleteMany({ where: { userId: sourceId } });
        await tx.userPlace.deleteMany({ where: { userId: sourceId } });

        // Reports: moderation history, so MOVED, never dropped (bug audit 3,
        // T7a-01; the owner's Q1). The ones the duplicate filed become the
        // survivor's, and the ones filed AGAINST it name the survivor, or the
        // human behind it loses their "reported N times" (the delete below
        // used to cascade those away). Shed first, then move, as above. Shed
        // only what cannot exist after the move: a flag between the two
        // accounts, which would be one member flagging themselves (reportUser
        // refuses that), and the same complaint on file twice, which
        // @@unique([reporterId, reportedUserId]) and the partial
        // Report_open_post_per_reporter_key refuse. Of two flags on one person
        // a pending one is kept over a settled one, so an open complaint never
        // leaves the desk; otherwise the survivor's own.
        await tx.report.deleteMany({
          where: {
            OR: [
              { reporterId: sourceId, reportedUserId: targetId },
              { reporterId: targetId, reportedUserId: sourceId },
            ],
          },
        });
        await tx.report.deleteMany({
          where: {
            reporterId: targetId,
            status: { not: "pending" },
            reportedUser: { reportsAgainst: { some: { reporterId: sourceId, status: "pending" } } },
          },
        });
        await tx.report.deleteMany({
          where: { reporterId: sourceId, reportedUser: { reportsAgainst: { some: { reporterId: targetId } } } },
        });
        await tx.report.deleteMany({
          where: {
            reporterId: sourceId,
            targetType: "post",
            status: "pending",
            post: { reports: { some: { reporterId: targetId, targetType: "post", status: "pending" } } },
          },
        });
        await tx.report.updateMany({ where: { reporterId: sourceId }, data: { reporterId: targetId } });
        await tx.report.deleteMany({
          where: {
            reportedUserId: targetId,
            status: { not: "pending" },
            reporter: { reports: { some: { reportedUserId: sourceId, status: "pending" } } },
          },
        });
        await tx.report.deleteMany({
          where: { reportedUserId: sourceId, reporter: { reports: { some: { reportedUserId: targetId } } } },
        });
        await tx.report.updateMany({ where: { reportedUserId: sourceId }, data: { reportedUserId: targetId } });

        /* The duplicate's avatar, the one object a merge otherwise strands
           (write-path review, Phase 8): it lives under `avatars/<sourceId>/`
           and no moved row points at it. Read off the row as the row is
           deleted, so it is the avatar the account last wore, and queued in
           this transaction with the dropped answers' files, so a request cut
           off after the commit cannot strand it; it was deleted after the
           commit and queued only if storage refused (bug audit 3, B3b's
           write-path review). Never an object the survivor itself displays.
           The coverPhoto is NOT touched: that URL belongs to a Collection
           Photo row, re-pointed at the survivor above and still alive. */
        const gone = await tx.user.delete({ where: { id: sourceId }, select: { photoUrl: true } });
        const survivor = await tx.user.findUnique({ where: { id: targetId }, select: { photoUrl: true } });
        const avatar = gone.photoUrl && gone.photoUrl !== survivor?.photoUrl ? [gone.photoUrl] : [];
        if (avatar.length > 0) {
          await tx.pendingImagePurge.createMany({ data: avatar.map((url) => ({ url, reason: "merge" })) });
        }
        return [...droppedUrls, ...avatar];
      },
      // Interactive, because the hat now hangs on a read. The 5 s default is
      // a page render's budget, not thirty statements' (the purge's reasoning,
      // account-purge.ts); maxWait matches the pool's connection timeout.
      { timeout: 30_000, maxWait: 5_000 }
    );
  } catch (err) {
    // A deadlock against another change to one of the two accounts' groups:
    // nothing was written, and pressing again is the answer.
    if (isSerializationFailure(err)) {
      return { error: "Somebody was changing one of these accounts at the same moment, so nothing was changed. Try again." };
    }
    // Reported, not just logged, and nobody is sent to a server log they
    // cannot read (bug audit 3, T7a-09, the merge's half).
    reportSwallowed("merge", err, { sourceId, targetId });
    return { error: "Could not merge those accounts. Nothing was changed, and the error has been reported." };
  }

  // On the record before any byte is deleted, as an erasure is (bug audit 3,
  // T7a-05's reasoning; the merge's R2 work is small, but a hung request
  // would still have lost the line).
  await writeAudit({
    actorId: actor.actorId,
    action: "admin.merge",
    targetType: "user",
    targetId: targetId,
    ip: actor.ip,
    detail:
      `merged ${sourceId} into ${targetId}` +
      (handedOn > 0 ? `; ${handedOn} Catch-up(s) handed to another member, the survivor cannot keep one` : "") +
      (queued.length > 0 ? `; ${queued.length} of the duplicate's stored image(s) queued for deletion` : ""),
  });

  // The files queued in the transaction above: the dropped answers' and the
  // duplicate's avatar. What the drain cannot reach, or storage refuses,
  // waits for tonight's sweep, which is the queue's job.
  if (queued.length > 0) {
    try {
      await drainPendingImagePurges(queued);
    } catch (err) {
      reportSwallowed("merge", err, { sourceId, targetId, step: "drain" });
    }
  }

  revalidateAdmin(targetId);
  revalidatePath("/feed");
  revalidatePath("/directory");
  return { success: true };
}

/* ---------------------------------------------------------------- *
 *  Standing: blocked, deleted, noted, verified
 *
 *  These five sat in src/components/profile/admin-actions.ts until
 *  2026-09-07 -- a components folder about somebody's profile, exporting
 *  moderation. Their callers are the person page, the People list and the
 *  admin tools card on a member's public profile, all of them admin.
 * ---------------------------------------------------------------- */

export async function adminBlockUser(userId: string, block: boolean): Promise<AdminActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  // Blocking is the one that traps: it lands on the very next request, and a
  // blocked account cannot sign in to undo it. Unblocking cannot lock anybody
  // out, so it goes straight through (bug audit B-023).
  const refused = block
    ? await refuseSelfOrLastAdmin(actor.actorId, userId, "block", (tx) =>
        blockWrite(tx, userId, block)
      )
    : await blockWrite(prisma, userId, block).then(() => null);
  if (refused) return refused;

  await writeAudit({
    actorId: actor.actorId,
    action: block ? "admin.block" : "admin.unblock",
    targetType: "user",
    targetId: userId,
    ip: actor.ip,
  });

  revalidatePath(`/profile/${userId}`);
  return { success: true };
}

async function blockWrite(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string,
  block: boolean
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      isBlocked: block,
      /* Blocking has to reach the sessions the person is already holding, not
         just the next sign-in. Sessions are JWTs with no server-side store, so
         bumping the epoch is the only way to end one (audit H4): without it a
         blocked member kept a valid 30-day token and carried on posting.
         Bumped on UNBLOCK as well -- cheap, and it means an accidental block
         and unblock leaves no token minted during the gap still floating. */
      credentialVersion: { increment: 1 },
    },
  });
}

export async function adminDeleteUser(userId: string): Promise<AdminActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  // Capture a little context BEFORE the row is gone, so the audit entry is
  // still readable once the account it names no longer exists.
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true },
  });
  if (!target) return { error: "That account no longer exists." };

  // The same two refusals blocking gets (B-023), asked BEFORE the purge rather
  // than inside it: purgeUserAccount runs its own transaction and reaches R2
  // afterwards, neither of which belongs inside a serializable retry. The read
  // is a hair racy against a simultaneous demotion elsewhere, which is the
  // right trade -- an admin count is not worth holding a purge open for.
  if (actor.actorId === userId) {
    return { error: "You cannot delete your own account from here. Use Settings." };
  }
  if (target.role === "admin") {
    const others = await prisma.user.count({
      where: { role: "admin", isBlocked: false, id: { not: userId } },
    });
    if (others === 0) {
      return { error: "This is the only admin. Make somebody else one first." };
    }
  }

  // The row delete and the R2 object cleanup (audit H9) live in
  // purgeUserAccount, shared with the retention sweep's grace-period purge —
  // one definition of "gone". The reports this member filed outlive them,
  // unnamed (bug audit 3, T7a-01).
  const purged = await purgeUserAccount(userId);
  // The purge's own sentence: a write that collided three times says so, and
  // anything else has already been reported (bug audit 3, T7a-09). This said
  // "Check the server log", which the admin cannot read.
  if (!purged.ok) return { error: purged.error };

  /* On the record before a single byte is deleted (bug audit 3, T7a-05). The
     line used to wait for the in-request drain, the slowest and least needed
     step, so a request cut off or hung in it left an erased account with no
     `admin.delete` line and an admin told "That did not go through". It
     quotes what is certain at this point: what the account's rows named, all
     of it queued in the transaction that deleted them. */
  await writeAudit({
    actorId: actor.actorId,
    action: "admin.delete",
    targetType: "user",
    targetId: userId,
    ip: actor.ip,
    detail:
      `${target.name} <${target.email}> — ${purged.queued.length} stored image(s) queued for deletion` +
      (purged.groupsRehomed > 0 ? `, ${purged.groupsRehomed} group(s) handed on` : ""),
  });

  revalidatePath("/directory");
  revalidatePath("/admin", "layout");

  /* Then the bytes, while the admin waits, inside the drain's own time budget.
     Whatever it cannot reach or R2 refuses stays queued for tonight's sweep,
     whose line counts it; a failure here is the queue's to finish, so it is
     reported and the delete still answers that it worked, because it did. */
  try {
    await drainPendingImagePurges(purged.queued);
  } catch (err) {
    reportSwallowed("purge", err, { userId, step: "drain" });
  }
  return { success: true };
}

export async function adminUpdateNote(userId: string, note: string): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  await prisma.user.update({
    where: { id: userId },
    data: { adminNote: note || null },
  });

  return { success: true };
}

/**
 * Verify a member by hand.
 *
 * `method` defaults to "admin_manual" and both admin surfaces now let it,
 * because that is what actually happened. They used to pass "office_list"
 * explicitly, so a member an admin had checked themselves was recorded -- and
 * displayed on their own page -- as "Off the office list" (audit Low 6). Only
 * `tryRosterAutoVerifyQuietly`, which really does read the roster, writes
 * "office_list".
 */
export async function adminVerifyUser(
  userId: string,
  method: "office_list" | "admin_manual" = "admin_manual"
): Promise<AdminActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  /* A conditional update, so the notification below follows the TRANSITION
     rather than the click (audit Low 5). Verify had no in-flight guard in the
     People list and minted a notification unconditionally, so a double-press --
     or two admins clearing the queue together -- sent the member the same
     "You're verified" twice. The same shape `requestVerification` carries for
     the member's own side of this (Low 20). */
  const became = await prisma.user.updateMany({
    where: { id: userId, verifyState: { not: "verified" } },
    data: {
      verifyState: "verified",
      verifyStateAt: new Date(),
      verifyMethod: method,
      verifiedAt: new Date(),
    },
  });

  if (became.count === 0) {
    // Already verified. Nothing changed, so nothing is audited and nobody is
    // told; the caller still gets a success, because the state it asked for is
    // the state that holds.
    revalidateAdmin(userId);
    return { success: true };
  }

  await writeAudit({
    actorId: actor.actorId,
    action: "admin.verify",
    targetType: "user",
    targetId: userId,
    ip: actor.ip,
    detail: method,
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "admin",
      message: "You're verified. Your name now carries a small leaf to show you belong.",
      link: `/profile/${userId}`,
    },
  });

  revalidateAdmin(userId);
  return { success: true };
}

/**
 * Take a member's verification away, and keep it away.
 *
 * The method is not cleared but set to ADMIN_WITHHELD. A null method is what a
 * row nobody has looked at carries, so the office list used to verify a
 * roster-matched member again on their next password reset, profile edit or
 * "Ask to be verified", or on an admin's own edit of their name, with nothing
 * in the audit log after this action's own line (bug audit 3, T7a-06). The
 * list leaves any row with a method alone, "Ask to be verified" tells them an
 * admin has already looked, and `adminVerifyUser` overwrites it.
 */
export async function adminUnverifyUser(userId: string): Promise<AdminActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  await prisma.user.update({
    where: { id: userId },
    data: {
      verifyState: "unverified",
      verifyStateAt: new Date(),
      verifyMethod: ADMIN_WITHHELD,
      verifiedAt: null,
    },
  });

  await writeAudit({
    actorId: actor.actorId,
    action: "admin.unverify",
    targetType: "user",
    targetId: userId,
    ip: actor.ip,
  });

  revalidateAdmin(userId);
  return { success: true };
}
