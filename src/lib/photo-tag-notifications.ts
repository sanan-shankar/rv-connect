import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { MAX_MENTION_NOTIFICATIONS } from "@/lib/mention-notifications";
import { decidePhotoVisibility } from "@/lib/photo-visibility-rule";
import { mentionedUserIds } from "@/lib/rich-text";

/* ------------------------------------------------------------------ *
 *  Telling somebody they have been tagged in a Collection photograph.
 *
 *  The owner, 2026-10-27, asked for people to be taggable in a photo's
 *  description, the way they already are in a post. A tag is the post's own
 *  wire format, `@[Name](id)`, written into `Photo.caption`, so there is no
 *  table to keep in step: the caption IS the list.
 *
 *  WHEN, AND THE ANSWER IS "WHEN THEY CAN OPEN IT". A member's contribution
 *  waits in the review room unapproved, and a bell pointing at a photograph
 *  its reader cannot open is a bell that leads to "That photo is not
 *  available." So this is called after every save that can change who is
 *  tagged or who may look -- a contribution, an edit, every review decision --
 *  and each time it asks `decidePhotoVisibility` the same question the
 *  permalink asks. A tag written while the photograph waits is told the
 *  moment it is let in; a class photograph tells only that class.
 *
 *  ONCE PER PHOTOGRAPH, EVER. Matched on the link, not the message, because
 *  the person saving changes (the contributor, then the admin who approves)
 *  and the same tag must not ring twice because a different name pressed
 *  Save. Taking a tag out and putting it back is the same photograph: quiet.
 * ------------------------------------------------------------------ */

export type PhotoTagNotice = {
  photoId: string;
  /** The caption the caller just wrote: the tags in it are the people to tell. */
  caption: string | null;
  /** Who is credited in the bell: whoever wrote the tag in. Left out, it is
   *  the contributor, whose photograph it is -- which is the review room's
   *  case, where the admin pressing Approve did not write the caption. */
  tagger?: { id: string; name: string | null | undefined };
};

/* AFTER THE RESPONSE, AND NEVER THE SAVE'S FAILURE. The caption is already
   written when this is called, so the member is not kept waiting on three
   reads across the Arabian Sea to hear "Saved", and a database blip in here
   cannot reach them as "that didn't work": a contributor who believes their
   upload failed uploads it again, and an admin whose Approve landed is told on
   the retry that somebody else already dealt with it (write-path review,
   2026-10-27). A missed bell is the lesser loss, and it is logged, never
   swallowed in silence. An untagged save costs nothing at all. */
export function notifyPhotoTags(notice: PhotoTagNotice): void {
  const ids = notice.caption ? mentionedUserIds(notice.caption) : [];
  if (ids.length === 0) return;
  after(async () => {
    try {
      await tellTagged(notice, ids);
    } catch (e) {
      console.error(`[photo-tags] could not notify for ${notice.photoId}`, e);
    }
  });
}

async function tellTagged(notice: PhotoTagNotice, ids: string[]): Promise<void> {
  const link = `/collection/${notice.photoId}`;
  /* The tagger is dropped once the photograph says who that is, so the cap
     is taken from one past it: the people asked for are never fewer than 20
     because the writer tagged themselves. */
  const candidates = ids.slice(0, MAX_MENTION_NOTIFICATIONS + 1);
  const [photo, members, told] = await Promise.all([
    prisma.photo.findUnique({
      where: { id: notice.photoId },
      select: {
        id: true,
        uploaderId: true,
        scope: true,
        classYears: true,
        approved: true,
        isHidden: true,
        uploader: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { id: { in: candidates }, isBlocked: false, deletionRequestedAt: null },
      select: { id: true, role: true, verifyState: true, batchYear: true },
    }),
    prisma.notification.findMany({
      where: { userId: { in: candidates }, type: "mention", link },
      select: { userId: true },
    }),
  ]);
  if (!photo) return; // declined or removed between the save and now
  const tagger = notice.tagger ?? { id: photo.uploaderId, name: photo.uploader.name };
  const already = new Set(told.map((n) => n.userId));

  const reach = members
    .filter((m) => m.id !== tagger.id && !already.has(m.id))
    .filter((m) => decidePhotoVisibility(photo, m).ok)
    .slice(0, MAX_MENTION_NOTIFICATIONS);
  if (reach.length === 0) return;
  await prisma.notification.createMany({
    data: reach.map((m) => ({
      userId: m.id,
      type: "mention",
      message: `${tagger.name ?? "Someone"} tagged you in a photo`,
      link,
    })),
  });
}
