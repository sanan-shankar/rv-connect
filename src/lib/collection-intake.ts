import sharp from "sharp";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/prisma";
import { getImageBuffer, keyForUrl, putImage } from "@/lib/storage";
import { plainExcerpt } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  Posting a photograph into the Valley Collection.
 *
 *  The composer offers a tick when there is a photo attached: "Also add to the
 *  Collection" (owner, 2026-08-04, who asked for "a very unobtrusive way ...
 *  maybe it could even just be a tiny tick mark"). This is what that tick does
 *  once the post itself is safely written.
 *
 *  The bytes are already in storage, uploaded for the post. Nothing is
 *  re-uploaded: the post's own image becomes the Collection photo's `url`, and
 *  the only new object is the 480px grid thumbnail, which the Collection needs
 *  and a post does not.
 *
 *  Approval is unchanged. A contribution made this way lands in the same
 *  admin queue as one made through the contribute dialog, and auto-approves on
 *  the same rule (an admin, or an uploader already marked photoTrusted), so the
 *  tick is a shortcut past the FORM, never past the moderator.
 * ------------------------------------------------------------------ */

/** The 480px grid rendition, matching contributePhotoDirect's. */
const THUMB_PX = 480;

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

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, photoTrusted: true },
  });
  if (!me) return 0;
  const autoApprove = me.role === "admin" || me.photoTrusted;

  // The post's text is the only thing the member wrote about this photograph,
  // so it is the caption. Trimmed to the same 300 the contribute form allows.
  const photoCaption = plainExcerpt(caption, 300) || null;

  const results = await Promise.all(
    imageUrls.map(async (url) => {
      const key = keyForUrl(url);
      // Not ours (a legacy host, an external URL): there are no bytes to read
      // and no thumbnail to build, so there is nothing to contribute.
      if (!key) return false;
      try {
        const original = await getImageBuffer(key);
        const md = await sharp(original).metadata();
        // EXIF orientations 5-8 are the rotated ones, where stored width and
        // height are swapped relative to how the image displays.
        const swap = (md.orientation ?? 1) >= 5;
        const width = (swap ? md.height : md.width) ?? 0;
        const height = (swap ? md.width : md.height) ?? 0;
        if (!width || !height) return false;

        const thumb = await sharp(original)
          .rotate()
          .resize(THUMB_PX, THUMB_PX, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 72 })
          .toBuffer();
        const thumbUrl = await putImage(thumb, "collection", `${createId()}-t.webp`);

        await prisma.photo.create({
          data: {
            uploaderId: userId,
            thumbUrl,
            url,
            width,
            height,
            caption: photoCaption,
            // The composer asks for none of the Collection's own facts, which
            // is the entire point of the tick. They stay empty exactly as they
            // do for a contributor who skips them in the dialog.
            subject: "",
            area: null,
            era: "unknown",
            freeTags: null,
            datePrecision: "unknown",
            approved: autoApprove,
            approvedAt: autoApprove ? new Date() : null,
            approvedById: autoApprove ? userId : null,
          },
        });
        return true;
      } catch (e) {
        console.error("[collection-intake] could not copy", url, e);
        return false;
      }
    })
  );

  return results.filter(Boolean).length;
}
