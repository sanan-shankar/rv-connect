"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { titleCase } from "@/lib/normalize";
import {
  requireAdminAction,
  requireAdminActor,
  refuseSelfOrLastAdmin,
  type AdminActionResult,
} from "@/lib/admin";
import { readPeopleFilters, type PeoplePage } from "@/lib/admin-people";
import { loadPeoplePage } from "@/lib/admin-people-query";
import { writeAudit } from "@/lib/audit";
import { delImage } from "@/lib/storage";
import { valleyYear } from "@/lib/utils";
import { parsePlaces, resolvePlaces } from "@/lib/place-input";
import { lookupGazetteerPlaces } from "@/lib/place-lookup";
import { SPECIES_SLUGS } from "@/components/common/bird-avatar-v2";

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
  cursor: string,
  /** How many rows the caller is already showing. Only used to recover from a
   *  cursor row that has left the result set (audit Low 12). */
  loaded = 0
): Promise<PeoplePage | { error: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }
  return loadPeoplePage(readPeopleFilters(params), cursor, loaded);
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

/** What `profileSchema` allows a member to type into the same two columns. */
const MAX_OCCUPATION = 100;

/**
 * The six fields the owner has actually had to fix by hand.
 *
 * `name` is title-cased on the way in, which is the same treatment the
 * profile form gives it, and is what "P.v." -> "P.V." and "gnlu" -> "GNLU"
 * were about. An empty name is refused rather than silently kept: a nameless
 * row renders as a blank byline everywhere in the app.
 *
 * `jobTitle` and `workplace` get the same title-casing as `name`, because
 * that is what the member's own profile pen does to them on commit -- a
 * correction typed here should not read differently from one typed there.
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
  const jobTitle = titleCase(edit.jobTitle);
  const workplace = titleCase(edit.workplace);
  if (jobTitle.length > MAX_OCCUPATION || workplace.length > MAX_OCCUPATION) {
    return { error: `Keep the occupation and the organisation under ${MAX_OCCUPATION} characters.` };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      accountType,
      batchYear,
      // Clearing the override returns them to their deterministic bird, which
      // is the fix the owner needed on 2026-08-18 when a stale override was
      // hiding an Indian Roller.
      birdOverride: bird || null,
      jobTitle: jobTitle || null,
      workplace: workplace || null,
    },
  });

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

  await prisma.$transaction([
    prisma.userPlace.deleteMany({ where: { userId } }),
    ...cleaned.map((p, i) =>
      prisma.userPlace.create({
        data: {
          userId,
          placeId: p.placeId ?? null,
          label: p.label,
          city: p.city,
          lat: p.lat,
          lng: p.lng,
          position: i,
        },
      })
    ),
    prisma.user.update({
      where: { id: userId },
      data: { currentCity: cleaned[0]?.label ?? null },
    }),
  ]);

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
 *          Catch-up prompts and entries, and the threads they opened with
 *          the admins.
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
    prisma.user.findUnique({ where: { id: sourceId }, select: { id: true, role: true, photoUrl: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { id: true, photoUrl: true } }),
  ]);
  if (!source) return { error: "The duplicate account no longer exists." };
  if (!target) return { error: "Could not find the account to merge into." };
  if (source.role === "admin") {
    return { error: "Take away the admin role before merging this account away." };
  }

  try {
    await prisma.$transaction([
      // Kept.
      prisma.post.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } }),
      prisma.comment.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } }),
      prisma.photo.updateMany({ where: { uploaderId: sourceId }, data: { uploaderId: targetId } }),
      prisma.contribution.updateMany({ where: { userId: sourceId }, data: { userId: targetId } }),
      prisma.catchupPrompt.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } }),
      // CatchupEntry carries @@unique([promptId, authorId]), so an answer the
      // survivor already wrote to the same question blocks the move. Drop the
      // duplicate's copy first and move the rest, rather than failing the whole
      // merge on one shared question (audit M02).
      prisma.catchupEntry.deleteMany({
        where: { authorId: sourceId, prompt: { entries: { some: { authorId: targetId } } } },
      }),
      prisma.catchupEntry.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } }),
      prisma.adminThread.updateMany({ where: { memberId: sourceId }, data: { memberId: targetId } }),
      prisma.adminMessage.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } }),

      // Owned, not authored. Same shape: shed the collisions, move the rest.
      prisma.group.updateMany({ where: { creatorId: sourceId }, data: { creatorId: targetId } }),
      prisma.catchup.updateMany({ where: { createdById: sourceId }, data: { createdById: targetId } }),
      // If the duplicate was the group's Keeper and the survivor is already an
      // ordinary member of it, dropping the colliding row would quietly demote
      // the human. Carry the role over first, then drop.
      prisma.groupMember.updateMany({
        where: {
          userId: targetId,
          group: { members: { some: { userId: sourceId, role: { in: ["admin", "keeper"] } } } },
        },
        data: { role: "admin" },
      }),
      prisma.groupMember.deleteMany({
        where: { userId: sourceId, group: { members: { some: { userId: targetId } } } },
      }),
      prisma.groupMember.updateMany({ where: { userId: sourceId }, data: { userId: targetId } }),

      // Dropped: unique-keyed engagement that would collide on the way over.
      prisma.like.deleteMany({ where: { userId: sourceId } }),
      prisma.commentLike.deleteMany({ where: { userId: sourceId } }),
      prisma.bookmark.deleteMany({ where: { userId: sourceId } }),
      prisma.pollVote.deleteMany({ where: { userId: sourceId } }),
      prisma.photoLove.deleteMany({ where: { userId: sourceId } }),
      prisma.catchupEntryLove.deleteMany({ where: { userId: sourceId } }),
      prisma.catchupPref.deleteMany({ where: { userId: sourceId } }),
      prisma.userPlace.deleteMany({ where: { userId: sourceId } }),

      // Reports they filed are RESTRICT, not cascade, so they block the
      // delete below exactly as they do in adminDeleteUser.
      prisma.report.deleteMany({ where: { reporterId: sourceId } }),

      prisma.user.delete({ where: { id: sourceId } }),
    ]);
  } catch (err) {
    console.error("adminMergeUsers failed:", err);
    return { error: "Could not merge those accounts. Nothing was changed. Check the server log." };
  }

  // The one R2 object a merge otherwise strands (write-path review, Phase 8):
  // the duplicate's avatar. It lives under `avatars/<sourceId>/`, no moved row
  // points at it, and the target keeps its own photo, so without this it sat
  // publicly fetchable forever with nothing left to find it by (the H9
  // failure mode, via merge instead of delete). The coverPhoto is NOT
  // touched: that URL belongs to a Collection Photo row, which has just been
  // re-pointed at the target and is still alive. Guarded and best-effort:
  // only after the transaction committed, and never an object the target
  // itself displays.
  if (source.photoUrl && source.photoUrl !== target.photoUrl) {
    await delImage(source.photoUrl);
  }

  await writeAudit({
    actorId: actor.actorId,
    action: "admin.merge",
    targetType: "user",
    targetId: targetId,
    ip: actor.ip,
    detail: `merged ${sourceId} into ${targetId}`,
  });

  revalidateAdmin(targetId);
  revalidatePath("/feed");
  revalidatePath("/directory");
  return { success: true };
}
