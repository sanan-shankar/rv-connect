"use server";

import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import {
  putImage,
  getImageBuffer,
  headObjectSize,
  keyBelongsTo,
  ownerPrefix,
} from "@/lib/storage";
import { countImageFrames, sharpImage, storedResizeBox } from "@/lib/image";
import { purgeImageKey, purgeImageUrls, putAllOrNone } from "@/lib/image-purge";
import { drainPendingImagePurges } from "@/lib/account-purge";
import { escapeLike, insensitive } from "@/lib/db-text";
import {
  afterCursor,
  beforeCursor,
  decodeCursor,
  encodeCursor,
  orderByFor,
  orderByForTakenAscending,
  seekOlder,
  type RiverOrder,
} from "@/lib/river-cursor";
import { bandKeyOf, bandSeekBoundary, bucketsOf, takenLabel, takenShort } from "@/lib/collection";
import {
  MAX_UPLOAD_BYTES,
  MAX_PHOTOS_PER_ACCOUNT,
  isUnsupportedHeic,
  describeProcessingError,
  sniffImageType,
  stillPictureNotice,

  isImageFile,} from "@/lib/upload-shared";
import {
  parsePhotoMeta,
  isPhotoAutoApproved,
  gridThumb,
  photoRowData,
  exifDateOf,
} from "@/lib/collection-photo";
import {
  classKey,
  decidePhotoVisibility,
  photoScopeWhere,
  type PhotoScope,
} from "@/lib/photo-visibility-rule";
import { notifyAdminNote } from "@/lib/admin-note";
import { requireVerifiedMember } from "@/lib/member-gate";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/prisma-errors";

/* How many photographs a batch of the river holds.
 *
 * 24 was a page of masonry; the river is justified rows across a column that
 * reaches 1600px, where 24 photographs is about five rows and less than one
 * screen -- so the observer at the foot would fire again the moment its batch
 * landed, and again after that. 48 is roughly a screen and a half on a laptop
 * and about four screens on a phone, which is the shape the owner described on
 * his reference gallery: "only when you reach the bottom, does it load the
 * next batch." (That gallery held 35 of ~300 in the DOM.) */
const PAGE_SIZE = 48;

/* Half that for the climb back UP out of a seek. A page appended at the foot
 * is laid out below the fold where nobody sees the work; a page landing
 * ABOVE the reader is laid out while they watch, and 48 justified rows of
 * images arriving in one commit is a visible hitch even with the scroll
 * anchored. Smaller batches, gentler frames -- and the head sentinel's
 * 1200px margin refills between them, so the seam still stays ahead of the
 * reader. */
const UP_PAGE_SIZE = 24;

export type PhotoData = {
  id: string;
  thumbUrl: string;
  url: string;
  width: number;
  height: number;
  caption: string | null;
  /** The six buckets this photograph is filed under, already mapped off the
   *  stored `subject` column and de-duplicated (src/lib/collection.ts). */
  subject: string[];
  area: string | null;
  era: string;
  freeTags: string[];
  /** When the photograph was TAKEN, in the contributor's own precision --
   *  "May 1978", "1978", "the 1970s" -- or null when they gave nothing. The
   *  viewer shows this and never `createdAt`, which is the day somebody
   *  scanned it (brief #21). */
  takenLabel: string | null;
  /** The same fact at tile length -- "1978", "1970s", or nothing. The owner
   *  on the hover overlay: "I don't think we need to show the caption and the
   *  number of likes. We could just show the person. The person and the year
   *  maybe, that would be good." */
  takenShort: string | null;
  /* The three date columns as stored, which is what the edit dialog seeds its
     one date box from (`typedDate`). Carried rather than re-fetched when the
     dialog opens: they arrive on a row the river has already queried, so the
     alternative is a round trip to learn three numbers we are holding. */
  photoYear: number | null;
  photoMonth: number | null;
  datePrecision: string | null;
  approved: boolean;
  /** Which half of the Collection this belongs to. Carried on the shape so a
   *  permalink can put the RIGHT river behind the viewer, rather than opening
   *  a class photograph over the valley's. */
  scope: PhotoScope;
  loveCount: number;
  loved: boolean;
  isOwn: boolean;
  uploader: { id: string; name: string };
  createdAt: string;
};

function shape(
  p: {
    id: string; thumbUrl: string; url: string; width: number; height: number;
    caption: string | null; subject: string; area: string | null; era: string;
    freeTags: string | null; approved: boolean; scope: string; uploaderId: string; createdAt: Date;
    photoYear: number | null; photoMonth: number | null; datePrecision: string | null;
    uploader: { id: string; name: string };
    _count: { loves: number }; loves: { id: string }[];
  },
  userId: string
): PhotoData {
  return {
    id: p.id,
    thumbUrl: p.thumbUrl,
    url: p.url,
    width: p.width,
    height: p.height,
    caption: p.caption,
    /* The six buckets, resolved here rather than at each reader: the column
       can still hold a value from the fourteen-item list it used to carry, and
       four of those collapse onto Nature -- so a photograph filed
       "hills,flora" must arrive as ONE Nature, not two. */
    subject: bucketsOf(p.subject),
    area: p.area,
    era: p.era,
    freeTags: p.freeTags ? p.freeTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    takenLabel: takenLabel(p),
    takenShort: takenShort(p),
    photoYear: p.photoYear,
    photoMonth: p.photoMonth,
    datePrecision: p.datePrecision,
    approved: p.approved,
    /* Read strictly, the same way `isValley` reads it: anything that is not
       the literal "valley" is treated as class-scoped. A shape that guessed
       "valley" for an unrecognised value would put a private photograph over
       the public river. */
    scope: p.scope === "valley" ? "valley" : "class",
    loveCount: p._count.loves,
    loved: p.loves.length > 0,
    isOwn: p.uploaderId === userId,
    uploader: p.uploader,
    createdAt: p.createdAt.toISOString(),
  };
}

const includeFor = (userId: string) => ({
  uploader: { select: { id: true, name: true } },
  _count: { select: { loves: true } },
  loves: { where: { userId }, select: { id: true } },
});

/**
 * The per-account Collection quota (audit M17). Counts every photo the member
 * still has on file — approved, pending or hidden alike, since each is a stored
 * object costing money — and refuses a new contribution once the ceiling is
 * reached. Returns an error string, or null when there is room.
 */
async function photoQuotaError(
  userId: string,
  scope: PhotoScope
): Promise<string | null> {
  /* SCOPED, so the two halves have a thousand each. Emptying a reunion into
     your Class Collection must not spend the room you had for the school's own
     archive -- they are different acts and the owner made them different
     pools. */
  const count = await prisma.photo.count({ where: { uploaderId: userId, scope } });
  if (count >= MAX_PHOTOS_PER_ACCOUNT) {
    return scope === "class"
      ? "You've reached the number of photographs one account can add to the Class Collection. Message the admin if you have more to share."
      : "You've reached the limit of photos one account can add to the Collection. Message the admin if you have more to share.";
  }
  return null;
}

/* ------------------------------------------------------------------ *
 *  Where a contribution is going, resolved server-side.
 *
 *  The client says WHICH HALF ("valley" or "class"); the server says WHOSE
 *  CLASS. A server action is a public HTTP endpoint, so a member scripting one
 *  could otherwise post into any class's private archive by naming a year --
 *  which is why `classYears` is derived from the row here and never read off
 *  the form (spec sec. 4.3).
 *
 *  Anything that is not the literal string "class" resolves to the valley. A
 *  contribution whose destination could not be understood must publish
 *  PUBLICLY and visibly, never land under-scoped in a private archive where
 *  nobody would notice it was misfiled.
 *
 *  Returns an error string when the member asked for a class they have no
 *  claim on: not verified (spec sec. 2.4), or no batch year on their profile.
 * ------------------------------------------------------------------ */
async function contributionScope(
  userId: string,
  asked: unknown
): Promise<
  | { ok: true; scope: "valley" | "class"; classYears: string | null }
  | { ok: false; error: string }
> {
  if (asked !== "class") return { ok: true, scope: "valley", classYears: null };

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { verifyState: true, batchYear: true },
  });
  const key = classKey(me?.batchYear);
  if (me?.verifyState !== "verified" || !key) {
    /* One message for both refusals. Splitting them would tell a caller which
       of the two facts about somebody else's account it had guessed right. */
    return {
      ok: false,
      error: "Only verified members with a batch year on their profile can add to the Class Collection.",
    };
  }
  return { ok: true, scope: "class", classYears: key };
}

export async function contributePhoto(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "The demo does not accept photo uploads. Everything already in the Collection is yours to browse." };

  // A contributed photograph is bytes into a bucket, credited to a name, shown
  // to the whole community. Of everything an account can do this is the one
  // with a real cost attached, so it waits for a confirmed address.
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  // The Collection's own meter, shared with the presigned door: however the
  // bytes travel, one account gets one hourly allowance (audit M2). Separate
  // from `uploads` because a contribution is bounded by a per-account ceiling
  // and a post image is not -- see rate-limit.ts.
  const limited = await rateLimit("collectionUploads", session.user.id);
  if (!limited.ok) return { error: limited.error };

  /* Resolved BEFORE a byte is read, and before the quota -- the quota is now
     PER HALF, so which half this is going to has to be known before there is
     a number to check it against. A refusal here costs nothing; the same
     refusal after the re-encode would have spent the CPU, the R2 PUT and the
     member's upload for an answer that was knowable up front. */
  const destination = await contributionScope(session.user.id, formData.get("scope"));
  if (!destination.ok) return { error: destination.error };

  const quota = await photoQuotaError(session.user.id, destination.scope);
  if (quota) return { error: quota };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No photo provided" };
  if (!isImageFile(file)) return { error: "Only image files are allowed" };
  if (isUnsupportedHeic(file)) {
    return {
      error:
        'This is a HEIC/HEIF photo, which isn\'t supported yet. Export it as JPG or PNG (or turn off "High Efficiency" in your camera settings) and try again.',
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `Photo is over the 20MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)` };
  }

  const yearRaw = formData.get("photoYear") as string | null;
  const monthRaw = formData.get("photoMonth") as string | null;

  const parsed = parsePhotoMeta({
    caption: (formData.get("caption") as string) || undefined,
    area: (formData.get("area") as string) || undefined,
    // One field per bucket, so the six arrive as a real list rather than as a
    // string this side has to agree with the form about how to split.
    buckets: formData.getAll("buckets").map(String).filter(Boolean),
    era: (formData.get("era") as string) || undefined,
    datePrecision: (formData.get("datePrecision") as string) || undefined,
    photoYear: yearRaw ? Number(yearRaw) : undefined,
    photoMonth: monthRaw ? Number(monthRaw) : undefined,
  });
  if ("error" in parsed) return { error: parsed.error };
  const { meta } = parsed;

  let thumbUrl: string;
  let url: string;
  let width: number;
  let height: number;
  /** Anything we changed about the photograph, to be said out loud. */
  let notice: string | undefined;
  /** What the file claimed, before the re-encode below stops it claiming
   *  anything. A suggestion for the review room; never an answer. */
  let exif: Awaited<ReturnType<typeof exifDateOf>> = null;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // The bytes, not the client's MIME string, decide it is an image (M13).
    if (!sniffImageType(input)) {
      return { error: "That file doesn't look like a JPG, PNG, GIF or WebP image." };
    }
    // An animated GIF is about to become a still (audit C-073).
    if ((await countImageFrames(input)) > 1) notice = stillPictureNotice(file.name);

    /* Before the re-encode, because after it there is nothing to read. This
       path is the FALLBACK, and it usually has less to offer than the direct
       one does: the browser canvas-downscales for it (Vercel's body cap), and
       a canvas keeps no metadata. Worth asking anyway -- a small enough file
       goes through `shrinkForUpload` untouched and still has its EXIF. */
    exif = await exifDateOf(input);

    const id = createId();
    const dir = ownerPrefix("collection", session.user.id);

    // Re-encoding through sharp drops EXIF (there is no .withMetadata()), so the
    // stored image carries no camera or GPS metadata (M12 in spirit; this path
    // already re-encoded, unlike the direct one).
    const display = await sharpImage(input)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    width = display.info.width;
    height = display.info.height;

    const thumb = await gridThumb(input);

    [url, thumbUrl] = await putAllOrNone(
      [putImage(display.data, dir, `${id}.webp`), putImage(thumb, dir, `${id}-t.webp`)],
      "abandoned"
    );
  } catch (e) {
    return { error: describeProcessingError(e) };
  }

  // Admins and trusted contributors skip the approval queue.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { photoTrusted: true },
  });
  /* A class contribution auto-approves whoever makes it (spec sec. 7.3): a
     private archive among people who know each other does not queue for the
     owner to read first, and a hundred classes' queues would never be read at
     all. The valley's queue is untouched. */
  const autoApprove =
    destination.scope === "class" ||
    isPhotoAutoApproved({ role: session.user.role, ...me });

  await createPhotoRow({
    data: photoRowData({
      uploaderId: session.user.id,
      url,
      thumbUrl,
      width,
      height,
      meta,
      autoApprove,
      exif,
      scope: destination.scope,
      classYears: destination.classYears,
    }),
  }, [url, thumbUrl]);

  revalidatePath("/collection");
  return { success: true, autoApprove, notice };
}

// Only objects the collection presign step itself created may be recorded, AND
// only ones staged under the CALLER's own prefix (`collection/<their id>/...`);
// the ownership half is enforced with keyBelongsTo below (audit C2).
/**
 * Write the row that makes the stored bytes findable -- and if that write
 * fails, take the bytes with it.
 *
 * The create used to sit outside the processing try/catch, so a dropped
 * connection or a pool timeout at exactly this moment left a display image and
 * a thumbnail in the bucket that no row named, no sweep enumerates and no
 * retry could reach (audit C-064). The failure still reaches the caller
 * unchanged; only the orphan is new.
 */
async function createPhotoRow(
  args: Parameters<typeof prisma.photo.create>[0],
  stored: string[]
) {
  try {
    return await prisma.photo.create(args);
  } catch (e) {
    await purgeImageUrls(stored, "abandoned");
    throw e;
  }
}

/* The staged original of a Collection contribution.
 *
 * TWO ROOTS, and the second one is history rather than choice. These are
 * minted under `staging/` now; they used to be minted under `collection/`,
 * beside the archive's own photographs, which meant an abandoned drop stranded
 * its original for ever: nothing here can enumerate the bucket to find it
 * (audit C-063), and a lifecycle rule cannot reach it either, because R2
 * matches a PREFIX and the real photographs share that prefix. Sixty were
 * measured stranded on 2026-08-28, one of them confirmed publicly readable --
 * and an untouched original still carries the GPS coordinates the phone wrote
 * into it, which is exactly why the successful path deletes it (audit M12).
 *
 * `collection/` stays accepted because a browser can be holding a presigned
 * URL minted by the OLD code when the new code deploys, and refusing it would
 * fail a contribution whose bytes are already in the bucket. Safe to narrow to
 * `staging/` alone once nothing old is in flight -- which is any time after
 * the deploy, since a presign is short-lived. */
const COLLECTION_ORIGINAL_KEY =
  /^(staging|collection)\/[a-z0-9]+\/\d{4}\/\d{2}\/[a-z0-9]+-o\.(jpg|jpeg|png|webp|gif)$/;

/**
 * The direct-to-R2 completion of a Collection contribution: the browser has
 * already PUT the FULL-RESOLUTION original via a presigned URL (see
 * /api/upload/presign), dodging Vercel's ~4.5MB body cap; this validates it,
 * re-encodes it once to strip metadata, builds the grid thumbnail, and records
 * the row.
 *
 * Full resolution is preserved — nothing is downscaled, so "high-res in the
 * Collection is the point" (owner, 2026-07-30) still holds — but the canonical
 * image is now a server re-encode of the original rather than the browser's
 * exact bytes. The reason is privacy: a phone photo's EXIF carries the GPS
 * coordinates it was taken at, and serving the untouched original published
 * those to the whole community and to anyone who noted the public URL (audit
 * M12). Re-encoding through sharp drops all metadata (there is no
 * .withMetadata() call), and the raw original is deleted afterwards, so the
 * location data never persists.
 */
export async function contributePhotoDirect(input: {
  key: string;
  /** Which half of the Collection this is going into. The AUDIENCE is not
   *  here and never will be: `contributionScope` derives it from the caller's
   *  own row, so naming a class is not a way into it. */
  scope?: string;
  caption?: string;
  area?: string;
  buckets?: string[];
  era?: string;
  datePrecision?: string;
  photoYear?: number;
  photoMonth?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "The demo does not accept photo uploads. Everything already in the Collection is yours to browse." };

  // The key is checked FIRST, before any gate that can refuse, because
  // everything below has an object staged in the bucket to answer for. It is a
  // regex and a prefix test -- no I/O -- so nothing is spent by doing it early.
  if (
    typeof input.key !== "string" ||
    !COLLECTION_ORIGINAL_KEY.test(input.key) ||
    /* Against the root the key actually carries. The regex above has already
       proved it is one of the two, so this cannot be widened by the caller:
       whichever it is, the id segment must still be the session user's. */
    !keyBelongsTo(input.key, session.user.id, input.key.startsWith("staging/") ? "staging" : "collection")
  ) {
    // The one refusal that must NOT delete: the key is not one we can vouch
    // for, so it is not ours to aim a delete at.
    return { error: "Bad upload reference" };
  }

  /* Past here the caller's browser has already PUT the full-resolution
     original, and nothing in this system can enumerate the bucket: an object no
     row names is unreachable for ever, and it is the EXIF-bearing copy at that
     (audit C-063). So every way out of this function that is not a created row
     goes through `refuse`, and adding a new refusal cannot forget the cleanup
     -- it would have to write a bare `return { error }` that the shape test in
     image-purge-rule.test.mjs refuses to let past. */
  const refuse = async (error: string) => {
    await purgeImageKey(input.key, "staged");
    return { error };
  };

  // A contributed photograph is bytes into a bucket, credited to a name, shown
  // to the whole community. Of everything an account can do this is the one
  // with a real cost attached, so it waits for a confirmed address.
  const gate = await requireVerifiedMember();
  if (!gate.ok) return refuse(gate.error);

  // Same meter as contributePhoto: the bytes came up through presign, but
  // the row it creates is the same kind of thing (audit M2).
  const limited = await rateLimit("collectionUploads", session.user.id);
  if (!limited.ok) return refuse(limited.error);

  /* Through `refuse`, not a bare return. The browser has ALREADY PUT the
     full-resolution original to R2 by the time this action is called, so every
     refusal on this path owes that staged object a purge -- the invariant
     image-purge-rule.test.mjs enforces by asserting no error leaves this
     function by any door but `refuse` (audit C-063).

     Before the quota, because the quota is per half and needs to know which. */
  const destination = await contributionScope(session.user.id, input.scope);
  if (!destination.ok) return refuse(destination.error);

  const quota = await photoQuotaError(session.user.id, destination.scope);
  if (quota) return refuse(quota);

  const parsed = parsePhotoMeta({
    caption: input.caption,
    area: input.area,
    buckets: input.buckets,
    era: input.era,
    datePrecision: input.datePrecision,
    photoYear: input.photoYear,
    photoMonth: input.photoMonth,
  });
  if ("error" in parsed) return refuse(parsed.error);
  const { meta } = parsed;

  // Independent of the image work below; overlap the round trips.
  const mePromise = prisma.user.findUnique({
    where: { id: session.user.id },
    select: { photoTrusted: true },
  });

  let url: string;
  let thumbUrl: string;
  let width: number;
  let height: number;
  let notice: string | undefined;
  /** What the original claimed, read in the window between it arriving and it
   *  being purged. A suggestion for the review room; never an answer. */
  let exif: Awaited<ReturnType<typeof exifDateOf>> = null;
  try {
    // Size is checked with a HEAD before the object is pulled into memory: a
    // presigned PUT cannot enforce a limit (R2 has no content-length-range), so
    // an oversized object is deleted without ever being fetched (audit M16).
    const stagedSize = await headObjectSize(input.key);
    if (stagedSize !== null && stagedSize > MAX_UPLOAD_BYTES + 1024) {
      return refuse("Photo is over the 20MB limit");
    }

    const original = await getImageBuffer(input.key);
    if (original.byteLength > MAX_UPLOAD_BYTES + 1024) {
      // Belt to the HEAD's braces (a HEAD that could not read the size falls
      // through to here).
      return refuse("Photo is over the 20MB limit");
    }
    if (!sniffImageType(original)) {
      return refuse("That upload doesn't look like a JPG, PNG, GIF or WebP image.");
    }

    // An animated GIF is about to become a still (audit C-073). This path
    // never sees a filename, so the sentence names no file.
    if ((await countImageFrames(original)) > 1) notice = stillPictureNotice();

    /* THE ONE MOMENT THE ARCHIVE CAN LEARN WHEN THIS WAS TAKEN. Below, the
       re-encode drops the metadata and `purgeImageKey` deletes the original;
       after those two lines the question is unanswerable for ever, which is
       how 18 of the first 21 photographs came to be undated. This is the
       better of the two paths for it -- the browser sends the untouched
       full-resolution file here, EXIF and all. */
    exif = await exifDateOf(original);

    const dir = ownerPrefix("collection", session.user.id);

    // The canonical full-size image: re-encoded (so EXIF/GPS is gone, M12) and
    // orientation baked in. Full resolution is kept for every realistic photo:
    // `storedResizeBox` is a no-op on anything a phone or a flatbed produces,
    // and only bounds the pathological case -- an image so large that
    // re-encoding it at full resolution inside a serverless function is a
    // memory and wall-clock problem (audit M16), or one wider than WebP can
    // hold at all. The old path stored the raw original and dodged both, but
    // the raw original is exactly the EXIF-bearing file we are no longer
    // willing to publish. `withoutEnlargement` means anything inside the box
    // is untouched, and `resolveWithObject` gives us the stored dimensions
    // directly, so there is no orientation swap left to reason about.
    const box = storedResizeBox(await sharpImage(original).rotate().metadata());

    const display = await sharpImage(original)
      .rotate()
      .resize(box.width, box.height, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    width = display.info.width;
    height = display.info.height;
    if (!width || !height) throw new Error("unsupported image format");

    /* The thumbnail is derived from the DISPLAY buffer, not from the original.
       Decoding the original a second time doubled the most expensive step of
       this whole action for a 480px output. The display copy is already
       upright, already within budget, and orders of magnitude smaller. It is a
       second lossy pass (q90 then q72), which at 480px is not visible and is
       the trade this path was already making everywhere else. */
    const thumb = await gridThumb(display.data, { alreadyUpright: true });

    [url, thumbUrl] = await putAllOrNone(
      [
        putImage(display.data, dir, `${createId()}.webp`),
        putImage(thumb, dir, `${createId()}-t.webp`),
      ],
      "abandoned"
    );

    // The raw original carried the EXIF; its re-encoded copy is now the
    // canonical image, so the original is deleted rather than left retrievable.
    // Queued for the nightly retry if storage refuses -- a GPS-bearing file is
    // not something to lose track of over a bad minute at R2.
    await purgeImageKey(input.key, "staged");
  } catch (e) {
    return refuse(describeProcessingError(e));
  }

  const me = await mePromise;
  // Same rule as the form path above: a class contribution skips the queue.
  const autoApprove =
    destination.scope === "class" ||
    isPhotoAutoApproved({ role: session.user.role, ...me });

  try {
    await createPhotoRow({
      /* `sourceKey` is the staged key, held unique (audit C-129). It is what
         makes one contribution one photograph: two calls carrying the same key
         both read the original before either delete ran, so both re-encoded
         it, both stored a pair of objects and both created a row -- with the
         per-account ceiling checked before either insert. */
      data: photoRowData({
        uploaderId: session.user.id,
        sourceKey: input.key,
        url,
        thumbUrl,
        width,
        height,
        meta,
        autoApprove,
        exif,
        scope: destination.scope,
        classYears: destination.classYears,
      }),
    }, [url, thumbUrl]);
  } catch (err) {
    /* Lost the race to `Photo_sourceKey_key`. The contribution the member
       meant to make exists, so this is their outcome, not an error --
       `createPhotoRow` has already purged the pair of objects this attempt
       stored, which is exactly what it is for. */
    if (!isUniqueViolation(err)) throw err;
    revalidatePath("/collection");
    return { success: true, autoApprove, notice };
  }

  revalidatePath("/collection");
  return { success: true, autoApprove, notice };
}

/* ------------------------------------------------------------------ *
 *  The river's query.
 *
 *  Three filters and one order, and the shape of each is an argument the
 *  brief settled rather than a convenience.
 *
 *  BUCKET is the only closed vocabulary in here (spec sec. 7.1). It reads a
 *  comma-joined column with `contains`, which is exact because no one of
 *  the six values is a substring of another -- checked, and worth
 *  rechecking the day a seventh is added.
 *
 *  BAND is the year rail: a place in the river to START at, never a filter.
 *  Pressing 1956 travels to 1956; everything above and below it still
 *  exists and scrolling either way keeps going.
 *
 *  SEARCH reads everything anybody wrote in prose -- the caption, the Where
 *  line, the legacy free tags and the contributor's name -- and NOTHING
 *  written in prose is ever offered as a dropdown. That is the whole trade
 *  the owner reasoned his own way to during the brief: "it is kind of
 *  easier for people to just write big banyan tree than it is to scroll and
 *  find the big banyan tree tag." The unanchored ILIKE this produces is
 *  served by trigram indexes, not scanned (see the 2026-08-28 migration).
 * ------------------------------------------------------------------ */

export type { RiverOrder };

export type RiverFilters = {
  /** Which half of the Collection is being read. Defaults to "valley"
   *  everywhere, so a caller that has not thought about scope gets the public
   *  archive rather than a query spanning both (spec sec. 4). */
  scope?: PhotoScope;
  bucket?: string;
  /** Not a filter -- a YEAR to SEEK to ("1956"), or "unknown" for the
   *  undated, or a legacy decade from an older `?when=` link. `loadPhotos`
   *  reads this only when there is no cursor yet, jumps the first page to
   *  that band's newest photograph, and forgets it from then on; the rail is
   *  a scroll position, not something that narrows the grid. */
  band?: string;
  search?: string;
  order?: RiverOrder;
};

/** As long a search as anybody means. Bounded here as well as in
 *  `riverFiltersFrom`, because an action is callable directly and a
 *  hundred-kilobyte `contains` is a slow query for nothing. */
const MAX_SEARCH = 100;

/* The scope fragment is a REQUIRED argument, not something read off `opts`
   here, and that is the whole design: a caller cannot build a Collection
   `where` without having first resolved which half of it the viewer is
   entitled to. `photoScopeWhere` returns null for a viewer who is entitled to
   neither, and a null can never reach this function -- the caller answers an
   empty page instead. See src/lib/security-regressions.test.mjs. */
function buildCollectionWhere(
  scopeWhere: { scope: string; classYears?: string },
  opts?: RiverFilters
) {
  const search = opts?.search?.slice(0, MAX_SEARCH).trim();
  return {
    ...scopeWhere,
    approved: true,
    isHidden: false,
    ...(opts?.bucket ? { subject: { contains: escapeLike(opts.bucket), ...insensitive } } : {}),
    ...(search
      ? {
          OR: [
            { caption: { contains: escapeLike(search), ...insensitive } },
            // "Part of school", which stopped being a dropdown and became
            // part of what search reads (spec sec. 7.2, brief #30).
            { area: { contains: escapeLike(search), ...insensitive } },
            { freeTags: { contains: escapeLike(search), ...insensitive } },
            { uploader: { name: { contains: escapeLike(search), ...insensitive } } },
          ],
        }
      : {}),
  };
}

/** How many photographs sit in each YEAR under the CURRENT bucket and
 *  search. The rail's marks are drawn in proportion to these, so it is a
 *  picture of the archive's own shape rather than a menu -- and it has to
 *  answer the question the person is actually asking, or pressing a year
 *  with twelve beside it returns nothing. */
export type BandCount = { key: string; count: number };

/** What the river hands back. `decades` rides only on the first page: it
 *  cannot change while paging through one query. There is no `total` any
 *  more -- the toolbar count it fed was cut ("I feel like we can dispense of
 *  the number of photographs anywhere, who actually cares"), which also
 *  retired a COUNT(*) the database ran on every fresh view for nothing. */
export type RiverPage = {
  photos: PhotoData[];
  nextCursor: string | null;
  /** A cursor for climbing back UP from the top of this page, toward newer
   *  photographs -- the direction only the year rail's seek ever needs.
   *  `undefined` everywhere seeking is not in play; `null` once a climb has
   *  reached the newest photograph there is. */
  topCursor?: string | null;
  bands?: BandCount[];
};

export async function loadPhotos(
  opts?: RiverFilters & { cursor?: string | null; direction?: "newer" }
): Promise<RiverPage> {
  const session = await auth();
  if (!session?.user?.id) return { photos: [], nextCursor: null, bands: [] };

  /* WHICH HALF OF THE COLLECTION, resolved before a single row is asked for.
     The two facts it turns on -- verification and batch year -- are read off
     the row rather than the JWT, because a session token is minted at sign-in
     and a member who verified or corrected their year an hour ago must not be
     answered from a stale claim. One extra lookup per fresh river query, on
     the primary key. */
  const viewer =
    opts?.scope === "class"
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { verifyState: true, batchYear: true },
        })
      : null;

  const scopeWhere = photoScopeWhere(opts?.scope ?? "valley", {
    id: session.user.id,
    role: session.user.role,
    verifyState: viewer?.verifyState,
    batchYear: viewer?.batchYear,
  });
  /* Entitled to neither: an empty page, never an unscoped query. A member with
     no class year yet reaches this, and so does one who is not verified. */
  if (!scopeWhere) return { photos: [], nextCursor: null, bands: [] };

  const filters = buildCollectionWhere(scopeWhere, opts);

  /* ---------------------------------------------------------------- *
   *  Climbing back up out of a seek.
   *
   *  Every other page of the river is walked one way -- older, appended at
   *  the foot -- and this is the one direction that walks the other way,
   *  because the year rail lands mid-river rather than at either end of
   *  it. Only "taken" order ever calls this (the rail is hidden in every
   *  other order) and only once a real row above the seek point has
   *  already been loaded, so there is always a real cursor to page from --
   *  the boundary that bootstraps the very first upward step lives in the
   *  branch below instead.
   * ---------------------------------------------------------------- */
  if (opts?.direction === "newer") {
    const cursor = decodeCursor("taken", opts.cursor);
    const where = { ...filters, ...beforeCursor(cursor) };
    const rows = await prisma.photo.findMany({
      where,
      include: includeFor(session.user.id),
      orderBy: orderByForTakenAscending(),
      take: UP_PAGE_SIZE + 1,
    });
    const hasMore = rows.length > UP_PAGE_SIZE;
    const trimmed = hasMore ? rows.slice(0, UP_PAGE_SIZE) : rows;
    // Fetched ascending -- nearest the boundary first, so the row nearest
    // "newer" lands LAST here -- and reversed before it reaches a reader
    // who always sees newest at the top.
    const newTop = trimmed[trimmed.length - 1];
    return {
      photos: [...trimmed].reverse().map((p) => shape(p, session.user.id)),
      nextCursor: null, // this page never extends the OLDER edge
      topCursor: hasMore && newTop ? encodeCursor("taken", newTop, 0) : null,
    };
  }

  const order: RiverOrder = opts?.order ?? "newest";
  const cursor = decodeCursor(order, opts?.cursor);
  const first = cursor === null;
  /* A seek only ever applies to the FIRST page of a fresh "taken" query --
     once a cursor exists the reader is already travelling the river the
     normal way, and a `band` riding along on a later page is the request
     that asked for THAT page, not a fresh jump (see the note on
     `RiverFilters.band`). `null` means there is no boundary to seek past --
     a legacy decade link naming the newest decade, or a value nothing is
     filed under; `undefined` means this is not a seek at all. */
  const seekBoundary =
    first && order === "taken" && opts?.band ? bandSeekBoundary(opts.band) : undefined;
  const where = {
    ...filters,
    ...(seekBoundary !== undefined ? seekOlder(seekBoundary) : afterCursor(order, cursor)),
  };
  const skip: number = cursor && "offset" in cursor ? cursor.offset : 0;

  const rows = await prisma.photo.findMany({
    where,
    include: includeFor(session.user.id),
    orderBy: orderByFor(order),
    take: PAGE_SIZE + 1,
    ...(skip ? { skip } : {}),
  });

  const hasMore = rows.length > PAGE_SIZE;
  const trimmed = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = trimmed[trimmed.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(order, last, skip + PAGE_SIZE) : null;

  const page: RiverPage = {
    photos: trimmed.map((p) => shape(p, session.user.id)),
    nextCursor,
  };

  // A seek that landed short of the newest year has somewhere to climb
  // back up to; hand back a cursor for it rather than making the reader
  // discover the gap by scrolling into nothing.
  if (order === "taken" && trimmed.length > 0 && typeof seekBoundary === "number") {
    page.topCursor = encodeCursor("taken", trimmed[0], 0);
  }

  if (first) {
    /* THE RAIL'S OWN COUNTS EXCLUDE ITS OWN FILTER, which is the one rule a
       facet has to obey and the one this broke when the rail's value was
       still a lingering filter: counting through a `where` that already
       pinned it returned exactly one row, so pressing "2020s" left the rail
       with a single mark and the rail hides itself below two -- it vanished
       at the moment you used it (owner, 2026-08-29). Now that a band is a
       seek rather than a filter, `filters` never pins it in the first place,
       so there is nothing left to strip here.

       GROUPED BY THE TWO COLUMNS A BAND IS DERIVED FROM rather than by a
       band key Postgres knows nothing about: `photoYear` for everything with
       a year, `era` for everything without one, folded to keys here. At most
       a hundred-odd groups off a filtered index scan, and it runs the SAME
       `bandKeyOf` the river's headings run, so the rail's rows and the
       river's chapters can never disagree about which year a photograph is
       in. */
    const groups = await prisma.photo.groupBy({
      by: ["photoYear", "era"],
      where: filters,
      _count: { _all: true },
    });
    const tally = new Map<string, number>();
    for (const g of groups) {
      const key = bandKeyOf(g);
      tally.set(key, (tally.get(key) ?? 0) + g._count._all);
    }
    page.bands = [...tally].map(([key, count]) => ({ key, count }));
  }

  return page;
}

/** One photograph, for a link straight to it. Same visibility rules as the
 *  grid: a hidden photograph is nothing to anybody, and one still awaiting
 *  review is visible only to whoever uploaded it and to an admin. Returns the
 *  same shape the grid uses, because /collection/[id] is now that grid with
 *  the viewer already open (spec sec. 5). */
export async function loadPhoto(id: string): Promise<PhotoData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const row = await prisma.photo.findUnique({
    where: { id },
    include: includeFor(session.user.id),
  });
  if (!row) return null;

  /* THE RULE ITSELF here, not a hand-written repeat of it. This is the path a
     shared link takes, and audits M30/M31 are both the same story: a list and
     a permalink disagreeing about who may see something, so a row absent from
     every river stayed reachable at its own URL. One function decides both.

     The viewer's verification and class are read off the row for the reason
     given in loadPhotos: a JWT claim can be an hour stale. */
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { verifyState: true, batchYear: true },
  });
  const seen = decidePhotoVisibility(row, {
    id: session.user.id,
    role: session.user.role,
    verifyState: me?.verifyState,
    batchYear: me?.batchYear,
  });
  if (!seen.ok) return null;

  return shape(row, session.user.id);
}

/** The member's own queue, for the half of the Collection they are looking at.
 *
 *  SCOPED, though every row is the caller's own and none of it is a leak: a
 *  photograph awaiting review sits above the river it belongs to, and showing
 *  a pending valley contribution over the Class Collection would say it is
 *  going somewhere it is not. Class contributions auto-approve (spec sec.
 *  7.3), so in practice this is empty there -- but it must be empty because
 *  the query said so, not by luck. */
export async function myPendingPhotos(
  scope: PhotoScope = "valley"
): Promise<PhotoData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await prisma.photo.findMany({
    where: { scope, uploaderId: session.user.id, approved: false, isHidden: false },
    include: includeFor(session.user.id),
    orderBy: { createdAt: "desc" },
  });
  return rows.map((p) => shape(p, session.user.id));
}

export async function togglePhotoLove(photoId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Same tier as the feed's likes: a public gesture is a Stage 2 write.
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  // Delete-first, then create; the shape and the reasoning are toggleLike's
  // (feed/actions.ts), which this is the Collection's twin of.
  const removed = await prisma.photoLove.deleteMany({
    where: { userId: session.user.id, photoId },
  });
  if (removed.count > 0) return { success: true, loved: false };

  try {
    await prisma.photoLove.create({ data: { userId: session.user.id, photoId } });
  } catch (err) {
    // P2002: another tap already loved it, which is the state asked for.
    // P2003: the photo was deleted between the page render and this tap, so
    // there is nothing to love. Say so rather than throwing a raw foreign-key
    // error at a member who tapped a heart.
    if (isForeignKeyViolation(err)) return { error: "That photo is no longer here." };
    if (!isUniqueViolation(err)) throw err;
  }
  return { success: true, loved: true };
}

export async function approvePhoto(photoId: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized" };

  /* updateMany, so a row another admin declined a moment ago is ANSWERED
     rather than thrown at (audit C-074/C-130). `update` raises P2025 on a
     missing row, which reached callAction as "check your connection and try
     again" -- a wrong diagnosis that invites the admin to retry something that
     will never work. Two admins clearing the queue together is the ordinary
     way this happens, not an exotic race. */
  const approved = await prisma.photo.updateMany({
    where: { id: photoId },
    data: { approved: true, approvedAt: new Date(), approvedById: session.user.id },
  });
  if (approved.count === 0) return { error: "That photo is no longer here." };
  revalidatePath("/collection");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Approve a page of the queue in one press.
 *
 * Spec §9 asks for this beside trusted contributors and for the same reason:
 * once bulk upload exists, one contributor can put a hundred photographs in
 * front of an admin, and clearing them one press at a time is the thing that
 * stops the archive being opened to the school photographer at all. Blessing
 * him `photoTrusted` answers the SECOND hundred; this answers the first.
 *
 * Deliberately a SELECTION rather than an "approve everything" button. The
 * point of the ticks is that you can leave one out: a batch approval with no
 * way to exclude is how a photograph nobody looked at reaches the Collection,
 * and an admin who cannot exclude will either approve blind or go back to one
 * at a time.
 *
 * `updateMany` for the same reason `approvePhoto` uses it (audits
 * C-074/C-130): two admins clearing the queue together is ordinary, and a row
 * that is already gone should be counted out rather than thrown.
 */
export async function approvePhotos(photoIds: string[]) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized" };

  /* The list is user input, so it is bounded before it becomes an `IN` clause.
     A page of the queue is CONTENT_PAGE_SIZE (40); this is generous room above
     that and still a number rather than whatever was posted. */
  if (!Array.isArray(photoIds)) return { error: "Nothing to approve" };
  const ids = [...new Set(photoIds.filter((id) => typeof id === "string" && id))].slice(0, 100);
  if (ids.length === 0) return { error: "Nothing to approve" };

  const approved = await prisma.photo.updateMany({
    // `approved: false` so a row somebody else waved through a moment ago
    // keeps THEIR name against it rather than being re-stamped with ours.
    where: { id: { in: ids }, approved: false },
    data: { approved: true, approvedAt: new Date(), approvedById: session.user.id },
  });
  if (approved.count === 0) return { error: "Those photos are no longer waiting." };
  revalidatePath("/collection");
  revalidatePath("/admin");
  return { success: true, count: approved.count };
}

/** Thrown to roll back a removal whose row somebody else already took. A
 *  sentinel rather than a flag, because the only way out of a Prisma
 *  interactive transaction without committing is to throw. */
class AlreadyGone extends Error {}

/** Delete a photograph's row and book its stored bytes for removal, as one
 *  atomic step. Shared by the admin's decline of something in the queue and by
 *  a member's delete of their own photograph, because both are the same
 *  irreversible act and the ordering inside is audit M17's, not a detail: the
 *  row goes first and the urls are queued in the SAME transaction, so either
 *  the photo is gone and its files are booked for removal or nothing happened.
 *  The three byte-deletes used to run before the row delete, and a failure on
 *  that line left a photograph in the Collection whose every image 404'd for
 *  ever, with no retry able to put them back.
 *
 *  Returns the uploader's id so a caller can tell them, or an error string
 *  that is already fit to show a person. */
async function erasePhoto(
  photoId: string,
  reason: string
): Promise<{ error: string } | { uploaderId: string }> {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { thumbUrl: true, url: true, uploaderId: true },
  });
  if (!photo) return { error: "Photo not found" };

  const urls = [photo.thumbUrl, photo.url].filter(
    (u): u is string => typeof u === "string" && u.length > 0
  );
  try {
    await prisma.$transaction(async (tx) => {
      if (urls.length > 0) {
        await tx.pendingImagePurge.createMany({
          data: urls.map((url) => ({ url, reason })),
        });
      }
      /* deleteMany rather than delete, for the same reason as approvePhoto
         above (audit C-130): two people acting on the same photograph in the
         same moment would otherwise throw P2025 out of the transaction, and
         the purge rows just written would roll back with it. */
      const gone = await tx.photo.deleteMany({ where: { id: photoId } });
      if (gone.count === 0) {
        // Somebody else got there first. Rolling back is correct: whoever won
        // the race queued the same urls.
        throw new AlreadyGone();
      }
    });
  } catch (err) {
    if (!(err instanceof AlreadyGone)) throw err;
    return { error: "That photo is no longer here." };
  }
  // After the commit, so a slow R2 cannot hold the transaction open. Anything
  // it cannot reach is retried by the nightly sweep.
  await drainPendingImagePurges(urls);
  return { uploaderId: photo.uploaderId };
}

export async function declinePhoto(photoId: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized" };

  const erased = await erasePhoto(photoId, "declined");
  if ("error" in erased) return erased;

  await prisma.notification.create({
    data: {
      userId: erased.uploaderId,
      type: "admin",
      /* No longer "this space is for the place itself": the owner widened the
         frame to the school's whole visual memory, people included (D2), so
         the old line refused a class photograph on grounds that stopped being
         true. There is no single reason a photograph is declined any more, so
         this does not invent one. */
      message:
        "A photo you shared was not added to the Collection. If you think that was a mistake, message the admins and we will take another look.",
      link: "/collection",
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

/**
 * A member takes down their own photograph.
 *
 * Until now nobody could: both removal paths were gated on `role === "admin"`,
 * which made the Collection the one place in the product where you could
 * publish something and then not unpublish it (spec sec. 9, handover F11). The
 * owner, 2026-08-27: "there's no easy intuitive way for me to take down a
 * photo that i've uploaded now? apart from using the admin thing." It matters
 * more, not less, once trusted contributors publish with no queue in front of
 * them, because then a delete is the ONLY correction available.
 *
 * Uploader or admin, which is exactly the gate `deletePost` uses for the same
 * act on a post. An admin removing SOMEONE ELSE'S approved photograph should
 * still reach for `adminRemovePhoto` below, which keeps the row and relays a
 * warm note; this is the plain hard delete, and it takes the bytes with it.
 */
export async function deleteOwnPhoto(photoId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { uploaderId: true },
  });
  if (!photo) return { error: "Photo not found" };
  if (photo.uploaderId !== session.user.id && session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  const erased = await erasePhoto(photoId, "uploader-deleted");
  if ("error" in erased) return erased;

  revalidatePath("/collection");
  return { success: true };
}

/**
 * Admin-only: remove an already-approved Collection photo. The row is KEPT
 * (soft-hidden) for the record and the warm-note flow, exactly like
 * adminRemovePost/adminRemoveComment — but unlike those, the stored image
 * BYTES are deleted here. A hidden text post is unreadable once hidden; a
 * hidden photo's file stayed at a public, permanent R2 URL that anyone who had
 * noted it could still fetch forever, so "removed" did not remove the thing
 * that mattered (audit M11). Deleting the bytes is best-effort and never
 * throws, so it cannot turn a moderation click into an error page.
 */
export async function adminRemovePhoto(photoId: string, note?: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized" };

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { uploaderId: true, thumbUrl: true, url: true },
  });
  if (!photo) return { error: "Photo not found" };

  await prisma.photo.update({ where: { id: photoId }, data: { isHidden: true } });

  // The row survives (structure + note); the retrievable bytes do not. A
  // delete storage refuses is queued for the nightly drain rather than logged
  // and forgotten -- "removed by a moderator" has to mean it (audit C-069).
  await purgeImageUrls([photo.thumbUrl, photo.url], "moderation");

  const trimmedNote = note?.trim();
  if (trimmedNote) await notifyAdminNote(photo.uploaderId, trimmedNote);

  revalidatePath("/collection");
  revalidatePath(`/collection/${photoId}`);
  return { success: true };
}

/* ------------------------------------------------------------------ *
 *  CORRECTING A PHOTOGRAPH THAT IS ALREADY HERE.
 *
 *  Until now the only correction was delete and re-upload, which for a
 *  scanned negative means the file is gone and the love count with it.
 *  The owner, 2026-08-30: "instead of delete photo button, have an edit
 *  icon. there let it pull up a dialog similar to the contribute where
 *  they can retag, recaption, and add year all that stuff. give me
 *  ability to do that for everyone's photo regardless of my uploading
 *  them or not."
 *
 *  So: the uploader OR an admin, which is the same gate `deleteOwnPhoto`
 *  uses for the other correction. An admin editing somebody else's
 *  photograph raises no note and no notification -- this is filing, not
 *  moderation, and it is the same act the hand-run tagging pass
 *  (docs/spec/hand-run-passes.md) already performs on members' rows.
 *  Taking something DOWN still goes through the warm-note flow.
 *
 *  THE BYTES ARE NOT TOUCHED, and neither is `approved`: this changes
 *  what we know about a photograph, never whether it is in the archive,
 *  so an edit cannot quietly publish something still in the queue or
 *  push an approved one back into it. `area` is left alone as well --
 *  the form stopped asking for it (see photo-questions.tsx) and a form
 *  that no longer asks a question must not answer it with a blank.
 * ------------------------------------------------------------------ */
export async function editPhoto(input: {
  id: string;
  caption?: string;
  buckets?: string[];
  era?: string;
  datePrecision?: string;
  photoYear?: number;
  photoMonth?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) {
    return { error: "The demo does not take changes to the Collection. Everything in it is yours to browse." };
  }

  /* The same Stage 2 gate the contribution itself passed. A caption on a
     Collection photograph is text in front of the whole community, so a
     member whose verification was withdrawn does not get to rewrite one. */
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  const limited = await rateLimit("photoEdits", session.user.id);
  if (!limited.ok) return { error: limited.error };

  const photo = await prisma.photo.findUnique({
    where: { id: input.id },
    select: { uploaderId: true },
  });
  if (!photo) return { error: "Photo not found" };
  if (photo.uploaderId !== session.user.id && session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  const parsed = parsePhotoMeta({
    caption: input.caption || undefined,
    buckets: input.buckets?.filter(Boolean),
    era: input.era || undefined,
    datePrecision: input.datePrecision || undefined,
    photoYear: input.photoYear,
    photoMonth: input.photoMonth,
  });
  if ("error" in parsed) return { error: parsed.error };
  const { meta } = parsed;

  /* updateMany, not update: two people editing the same photograph as one of
     them deletes it would otherwise throw P2025 out of a member's Save
     button, the same race `approvePhoto` and `erasePhoto` answer this way. */
  const changed = await prisma.photo.updateMany({
    where: { id: input.id },
    data: {
      caption: meta.caption,
      subject: meta.buckets,
      era: meta.era,
      photoYear: meta.photoYear,
      photoMonth: meta.photoMonth,
      datePrecision: meta.datePrecision,
    },
  });
  if (changed.count === 0) return { error: "That photo is no longer here." };

  revalidatePath("/collection");
  revalidatePath(`/collection/${input.id}`);

  /* Handed straight back rather than left for a refetch, so the tile and the
     open viewer show the new answers on the frame the dialog closes. Derived
     HERE through the same helpers `shape` uses -- a client recomputing
     "1978" from what it typed is a second implementation of the date rule. */
  return {
    success: true,
    patch: {
      caption: meta.caption,
      subject: bucketsOf(meta.buckets),
      era: meta.era,
      photoYear: meta.photoYear,
      photoMonth: meta.photoMonth,
      datePrecision: meta.datePrecision,
      takenLabel: takenLabel(meta),
      takenShort: takenShort(meta),
    },
  };
}
