/* ------------------------------------------------------------------ *
 *  What every route into the Collection agrees on.
 *
 *  Three code paths create a Photo row: the contribute dialog's FormData
 *  post, the same dialog's direct-to-R2 completion, and the composer's
 *  "Also add to the Collection" tick. They are deliberately three -- the
 *  dialog needs the FormData path as a fallback when presign or CORS is
 *  unavailable, and each carries its own story about cleaning up bytes it
 *  stored before it failed (audits C-063/C-064/C-159), which must NOT be
 *  merged.
 *
 *  What had no business being three is everything in here: the shape of
 *  the metadata, who skips the moderation queue, the thumbnail recipe,
 *  and the columns of the row itself. Each was written out three times,
 *  so a new Photo column or a change to the trust rule meant finding all
 *  three and getting all three right.
 * ------------------------------------------------------------------ */

import { sharpImage } from "@/lib/image";
import { eraFromYear } from "@/lib/collection";
import { photoSchema } from "@/lib/validators";

/** The 480px grid rendition every contribution ends up with. */
export const THUMB_PX = 480;

/**
 * The Collection's own facts about a photograph, resolved: whatever the
 * contributor typed, with the derived decade and the date precision already
 * settled rather than worked out again at the row.
 */
export type PhotoMeta = {
  caption: string | null;
  area: string | null;
  /** The six buckets, comma-joined for the `subject` column. Empty when the
   *  contributor filed it nowhere -- which is allowed, and is what the Other
   *  bucket and the suggestion pass (spec sec. 8.3) exist to reduce. */
  buckets: string;
  era: string;
  photoYear: number | null;
  photoMonth: number | null;
  datePrecision: string;
};

/** What a contribution with no form behind it carries: the composer tick asks
 *  for none of the Collection's own facts, which is the whole point of it. */
export const NO_PHOTO_META = (caption: string | null): PhotoMeta => ({
  caption,
  area: null,
  buckets: "",
  era: "unknown",
  photoYear: null,
  photoMonth: null,
  datePrecision: "unknown",
});

/**
 * Validate what the contributor typed and settle the two derived fields.
 *
 * Both dialog paths call this; they differ only in where the raw values come
 * from (a FormData bag or a typed argument), and each keeps its own way of
 * refusing, because the direct path's every-exit-must-purge rule (C-063) is
 * not something to hand to a shared helper.
 */
export function parsePhotoMeta(raw: {
  caption?: string;
  area?: string;
  buckets?: string[];
  era?: string;
  datePrecision?: string;
  photoYear?: number;
  photoMonth?: number;
}): { error: string } | { meta: PhotoMeta } {
  const parsed = photoSchema.safeParse({
    caption: raw.caption || undefined,
    area: raw.area || undefined,
    buckets: raw.buckets?.length ? raw.buckets : undefined,
    era: raw.era || undefined,
    datePrecision: raw.datePrecision || undefined,
    photoYear: raw.photoYear,
    photoMonth: raw.photoMonth,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { caption, area, buckets, era, datePrecision, photoYear, photoMonth } = parsed.data;
  return {
    meta: {
      caption: caption || null,
      area: area || null,
      // De-duplicated on the way in: the form cannot send the same bucket
      // twice, but this is the one place that decides what the column holds.
      buckets: [...new Set(buckets ?? [])].join(","),
      // The decade bucket other Collection surfaces (browse filters, admin
      // queue) already key off. Derived from the exact year when given, else
      // whatever decade fallback the contributor picked.
      era: photoYear !== undefined ? eraFromYear(photoYear) : era || "unknown",
      photoYear: photoYear ?? null,
      photoMonth: photoMonth ?? null,
      datePrecision: datePrecision ?? (photoYear !== undefined ? "year" : "unknown"),
    },
  };
}

/**
 * Who skips the approval queue: an admin, or a contributor already marked
 * photoTrusted. One rule, because it is a permission -- it had three
 * spellings, one per path, and a change of mind about trust would have had to
 * find all three.
 *
 * Takes the two facts rather than reading them, because WHEN each path reads
 * them is its own business: the direct path starts the query early and awaits
 * it after the image work, to overlap the round trips.
 */
export function isPhotoAutoApproved(who: {
  role?: string | null;
  photoTrusted?: boolean | null;
}): boolean {
  return who.role === "admin" || !!who.photoTrusted;
}

/**
 * The grid thumbnail: 480px longest side, WebP at 72.
 *
 * `alreadyUpright` is the one real difference between the callers, and it is
 * deliberate. Two paths hand in the raw original, which still needs its EXIF
 * orientation baked in. The direct path hands in the DISPLAY buffer it has
 * just made, which has been through `.rotate()` already -- rotating twice
 * would be wrong, and decoding the original a second time for a 480px output
 * doubled the most expensive step of that action.
 */
export async function gridThumb(
  input: Buffer,
  { alreadyUpright = false }: { alreadyUpright?: boolean } = {}
): Promise<Buffer> {
  const pipeline = alreadyUpright ? sharpImage(input) : sharpImage(input).rotate();
  return pipeline
    .resize(THUMB_PX, THUMB_PX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
}

/**
 * The columns of a Photo row, wherever the contribution came from.
 *
 * `subject` holds the six buckets, comma-joined (src/lib/collection.ts). The
 * column keeps its old name deliberately -- one database serves production and
 * local dev, so renaming it breaks every Collection query in production until
 * the next deploy lands. `freeTags` is the legacy free-text bird/species
 * field, removed from the form in the 2026-07-18 rework and kept null for old
 * rows; search still reads it so those photographs stay findable by typing.
 */
export function photoRowData(args: {
  uploaderId: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  meta: PhotoMeta;
  autoApprove: boolean;
  /** The staged key, held unique (audit C-129), on the direct path only. */
  sourceKey?: string;
  /** Which half of the Collection this is going into, and for a class
   *  contribution the audience it is going to.
   *
   *  BOTH ARE THE CALLER'S TO DERIVE FROM THE SESSION and neither is ever
   *  read off the form: a server action is a public HTTP endpoint, so a
   *  client-supplied `classYears` is a member choosing which class's private
   *  archive to write into. Defaulting to the valley is deliberate -- a
   *  caller that has not thought about scope must publish publicly and be
   *  seen doing it, never write an under-scoped row that looks private. */
  scope?: "valley" | "class";
  classYears?: string | null;
}) {
  const {
    uploaderId, url, thumbUrl, width, height, meta, autoApprove, sourceKey,
    scope = "valley", classYears = null,
  } = args;
  return {
    uploaderId,
    scope,
    /* Never an audience on a valley row: the column means nothing there, and
       a stray year in it would be a class photograph one edited `scope` away
       from existing. */
    classYears: scope === "class" ? classYears : null,
    ...(sourceKey ? { sourceKey } : {}),
    thumbUrl,
    url,
    width,
    height,
    caption: meta.caption,
    subject: meta.buckets,
    area: meta.area,
    era: meta.era,
    freeTags: null,
    photoYear: meta.photoYear,
    photoMonth: meta.photoMonth,
    datePrecision: meta.datePrecision,
    approved: autoApprove,
    approvedAt: autoApprove ? new Date() : null,
    approvedById: autoApprove ? uploaderId : null,
  };
}
