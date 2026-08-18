"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { titleCase } from "@/lib/normalize";
import { requireAdminAction, type AdminActionResult } from "@/lib/admin";
import { readPeopleFilters, type PeoplePage } from "@/lib/admin-people";
import { loadPeoplePage } from "@/lib/admin-people-query";

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
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }
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
}

/**
 * The four fields the owner has actually had to fix by hand.
 *
 * `name` is title-cased on the way in, which is the same treatment the
 * profile form gives it, and is what "P.v." -> "P.V." and "gnlu" -> "GNLU"
 * were about. An empty name is refused rather than silently kept: a nameless
 * row renders as a blank byline everywhere in the app.
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
    if (!Number.isFinite(parsed) || parsed < 1930 || parsed > new Date().getFullYear() + 10) {
      return { error: "That batch year does not look right." };
    }
    batchYear = parsed;
  }

  const bird = edit.birdOverride.trim();

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
  places: { placeId: number | null; label: string; city: string; lat: number | null; lng: number | null }[]
): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  const cleaned = places
    .map((p) => ({
      placeId: p.placeId,
      label: titleCase(p.label.trim()),
      city: titleCase(p.city.trim()),
      lat: p.lat,
      lng: p.lng,
    }))
    .filter((p) => p.label.length > 0)
    .slice(0, 30);

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
 * Refuses to remove the LAST admin. There is no other door into this panel
 * (the admin-login bypass is keyed to ADMIN_EMAIL and mints a session for a
 * row that must already be `role: "admin"`), so demoting the only one locks
 * everybody out of moderation permanently.
 */
export async function adminSetRole(
  userId: string,
  role: "admin" | "member"
): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  if (role === "member") {
    const admins = await prisma.user.count({ where: { role: "admin" } });
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (target?.role === "admin" && admins <= 1) {
      return { error: "This is the only admin. Make somebody else one first." };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
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
 * One transaction: a half-merged pair is worse than either state.
 */
export async function adminMergeUsers(
  sourceId: string,
  targetId: string
): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

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

  try {
    await prisma.$transaction([
      // Kept.
      prisma.post.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } }),
      prisma.comment.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } }),
      prisma.photo.updateMany({ where: { uploaderId: sourceId }, data: { uploaderId: targetId } }),
      prisma.contribution.updateMany({ where: { userId: sourceId }, data: { userId: targetId } }),
      prisma.catchupPrompt.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } }),
      prisma.catchupEntry.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } }),
      prisma.adminThread.updateMany({ where: { memberId: sourceId }, data: { memberId: targetId } }),
      prisma.adminMessage.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } }),

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

  revalidateAdmin(targetId);
  revalidatePath("/feed");
  revalidatePath("/directory");
  return { success: true };
}
