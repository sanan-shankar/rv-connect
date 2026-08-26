import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/prisma";
import { getImageBuffer, keyForUrl, putImage, ownerPrefix } from "@/lib/storage";
import { sharpImage } from "@/lib/image";
import {
  isPhotoAutoApproved,
  gridThumb,
  photoRowData,
  NO_PHOTO_META,
} from "@/lib/collection-photo";
import { MAX_PHOTOS_PER_ACCOUNT } from "@/lib/upload-shared";
import { plainExcerpt } from "@/lib/utils";
import { reportSwallowed } from "@/lib/report-error";

/* ------------------------------------------------------------------ *
 *  Posting a photograph into the Valley Collection.
 *
 *  The composer offers a tick when there is a photo attached: "Also add to the
 *  Collection" (owner, 2026-08-04, who asked for "a very unobtrusive way ...
 *  maybe it could even just be a tiny tick mark"). This is what that tick does
 *  once the post itself is safely written.
 *
 *  The bytes are already in storage, uploaded for the post. The Collection row
 *  gets its OWN copy of them (a fresh object under the uploader's collection
 *  prefix) plus a 480px grid thumbnail — deliberately NOT a reference to the
 *  post's object. Sharing one object between the two rows was cheaper, but once
 *  removing a Collection photo deletes its bytes (Phase 5, M11) an aliased
 *  delete would silently break the still-live feed post; independent objects
 *  keep the two rows from ever taking each other down.
 *
 *  Approval is unchanged. A contribution made this way lands in the same
 *  admin queue as one made through the contribute dialog, and auto-approves on
 *  the same rule (an admin, or an uploader already marked photoTrusted), so the
 *  tick is a shortcut past the FORM, never past the moderator.
 * ------------------------------------------------------------------ */

/**
 * Copy a post's images into the Collection as pending contributions.
 *
 * Deliberately total: every image is attempted, one failing does not stop the
 * rest, and the whole thing resolves rather than throwing. It runs after the
 * response has gone out (see the `after()` call in createPost), so there is
 * nobody left to show an error to; the honest options are "it worked" or "it
 * quietly did not", and taking the post down over a failed thumbnail would be
 * far worse than the missing photo.
 *
 * Returns how many rows it managed to create, for the server log.
 */
export async function copyPostImagesToCollection({
  userId,
  imageUrls,
  caption,
}: {
  userId: string;
  imageUrls: string[];
  /** The post's own text, used as the photo's caption. */
  caption: string;
}): Promise<number> {
  if (imageUrls.length === 0) return 0;

  /* The two reads before the loop are inside the same total-resolution
     promise as everything after them (audit C-159). This function's docblock
     promises "the whole thing resolves rather than throwing", because it runs
     in `after()` where a rejection reaches nobody -- and these two sat outside
     any try, so a pool timeout on either rejected the after() callback and the
     promise was quietly broken. */
  let me: { role: string; photoTrusted: boolean } | null;
  let existing: number;
  try {
    [me, existing] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { role: true, photoTrusted: true } }),
      prisma.photo.count({ where: { uploaderId: userId } }),
    ]);
  } catch (e) {
    reportSwallowed("collection-intake", e, { userId, step: "pre-loop" });
    return 0;
  }
  if (!me) return 0;
  const autoApprove = isPhotoAutoApproved(me);

  // The per-account Collection ceiling applies here too (audit M17): this path
  // creates Photo rows just like the contribute dialog, so without it a member
  // could tick "add to the Collection" on post after post and never hit the
  // cap the two dialog paths enforce. Take only as many as the account has room
  // for; the rest are simply not copied (the tick is best-effort by design).
  const room = Math.max(0, MAX_PHOTOS_PER_ACCOUNT - existing);
  if (room === 0) return 0;
  const toCopy = imageUrls.slice(0, room);

  // The post's text is the only thing the member wrote about this photograph,
  // so it is the caption. Trimmed to the same 300 the contribute form allows.
  const photoCaption = plainExcerpt(caption, 300) || null;

  const results = await Promise.all(
    toCopy.map(async (url) => {
      /* Set as soon as each PUT lands, so the catch below knows what it has to
         clean up. `let`, outside the try, for exactly that reason. */
      let stagedCopiedUrl: string | null = null;
      let stagedThumbUrl: string | null = null;
      const key = keyForUrl(url);
      // Not ours (a legacy host, an external URL): there are no bytes to read
      // and no thumbnail to build, so there is nothing to contribute.
      if (!key) return false;
      try {
        const original = await getImageBuffer(key);
        const md = await sharpImage(original).metadata();
        // EXIF orientations 5-8 are the rotated ones, where stored width and
        // height are swapped relative to how the image displays.
        const swap = (md.orientation ?? 1) >= 5;
        const width = (swap ? md.height : md.width) ?? 0;
        const height = (swap ? md.width : md.height) ?? 0;
        if (!width || !height) return false;

        // The Collection row gets its OWN copy of the bytes under the uploader's
        // collection prefix, NOT the post's URL. Sharing one object between a
        // post and a Collection row was safe only while nothing deleted a
        // Collection photo's bytes; Phase 5's M11 fix (adminRemovePhoto /
        // declinePhoto now delete the file) made an aliased delete silently
        // break the still-live feed post. A distinct object keeps the two rows
        // independent, at the cost of one extra PUT of bytes already in memory.
        /* Named OUTSIDE the try's inner scope so the catch can reach them
           (audit C-159). A `photo.create` that fails after both PUTs have
           landed used to leave two fresh R2 objects that no row names -- and
           nothing in this system can enumerate the bucket, so they are
           unreachable for ever. */
        const [copiedUrl, thumbUrl] = await Promise.all([
          putImage(original, ownerPrefix("collection", userId), `${createId()}.webp`),
          gridThumb(original).then((thumb) =>
            putImage(thumb, ownerPrefix("collection", userId), `${createId()}-t.webp`)
          ),
        ]);

        stagedCopiedUrl = copiedUrl;
        stagedThumbUrl = thumbUrl;

        // The composer asks for none of the Collection's own facts, which is
        // the entire point of the tick. They stay empty exactly as they do for
        // a contributor who skips them in the dialog.
        await prisma.photo.create({
          data: photoRowData({
            uploaderId: userId,
            url: copiedUrl,
            thumbUrl,
            width,
            height,
            meta: NO_PHOTO_META(photoCaption),
            autoApprove,
          }),
        });
        return true;
      } catch (e) {
        reportSwallowed("collection-intake", e, { url });
        /* Whatever this attempt stored before it failed goes into the purge
           queue, so the nightly sweep can reach bytes no row names (audit
           C-159). Queued rather than deleted inline: this runs inside after(),
           with nobody to tell if a delete also fails. */
        const stored = [stagedCopiedUrl, stagedThumbUrl].filter(
          (u): u is string => typeof u === "string" && u.length > 0
        );
        if (stored.length > 0) {
          await prisma.pendingImagePurge
            .createMany({ data: stored.map((u) => ({ url: u, reason: "intake-failed" })) })
            .catch(() => {
              // The queue itself is unreachable. Nothing further to try here;
              // the report above is the record.
            });
        }
        return false;
      }
    })
  );

  return results.filter(Boolean).length;
}
