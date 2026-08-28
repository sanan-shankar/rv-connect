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
  decodeCursor,
  encodeCursor,
  orderByFor,
  type RiverOrder,
} from "@/lib/river-cursor";
import { bucketsOf, takenLabel, takenShort } from "@/lib/collection";
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
} from "@/lib/collection-photo";
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
  approved: boolean;
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
    freeTags: string | null; approved: boolean; uploaderId: string; createdAt: Date;
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
    approved: p.approved,
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
async function photoQuotaError(userId: string): Promise<string | null> {
  const count = await prisma.photo.count({ where: { uploaderId: userId } });
  if (count >= MAX_PHOTOS_PER_ACCOUNT) {
    return "You've reached the limit of photos one account can add to the Collection. Message the admin if you have more to share.";
  }
  return null;
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

  // Shares the uploads meter with the /api/upload routes: however the bytes
  // travel, one account gets one hourly allowance (audit M2).
  const limited = await rateLimit("uploads", session.user.id);
  if (!limited.ok) return { error: limited.error };

  const quota = await photoQuotaError(session.user.id);
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
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // The bytes, not the client's MIME string, decide it is an image (M13).
    if (!sniffImageType(input)) {
      return { error: "That file doesn't look like a JPG, PNG, GIF or WebP image." };
    }
    // An animated GIF is about to become a still (audit C-073).
    if ((await countImageFrames(input)) > 1) notice = stillPictureNotice(file.name);

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
  const autoApprove = isPhotoAutoApproved({ role: session.user.role, ...me });

  await createPhotoRow({
    data: photoRowData({
      uploaderId: session.user.id,
      url,
      thumbUrl,
      width,
      height,
      meta,
      autoApprove,
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

const COLLECTION_ORIGINAL_KEY =
  /^collection\/[a-z0-9]+\/\d{4}\/\d{2}\/[a-z0-9]+-o\.(jpg|jpeg|png|webp|gif)$/;

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
    !keyBelongsTo(input.key, session.user.id, "collection")
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
     collection-rule.test.mjs refuses to let past. */
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
  const limited = await rateLimit("uploads", session.user.id);
  if (!limited.ok) return refuse(limited.error);

  const quota = await photoQuotaError(session.user.id);
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
  const autoApprove = isPhotoAutoApproved({ role: session.user.role, ...me });

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
 *  ERA is the decade rail: a filter as well as an index, so pressing 1978
 *  on the rail narrows the river to it rather than merely jumping there.
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
  bucket?: string;
  era?: string;
  search?: string;
  order?: RiverOrder;
};

/** As long a search as anybody means. Bounded here as well as in
 *  `riverFiltersFrom`, because an action is callable directly and a
 *  hundred-kilobyte `contains` is a slow query for nothing. */
const MAX_SEARCH = 100;

function buildCollectionWhere(opts?: RiverFilters) {
  const search = opts?.search?.slice(0, MAX_SEARCH).trim();
  return {
    approved: true,
    isHidden: false,
    ...(opts?.bucket ? { subject: { contains: escapeLike(opts.bucket), ...insensitive } } : {}),
    ...(opts?.era ? { era: opts.era } : {}),
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

/** How many photographs sit in each decade under the CURRENT bucket and
 *  search. The rail's marks are drawn in proportion to these, so it is a
 *  picture of the archive's own shape rather than a menu -- and it has to
 *  answer the question the person is actually asking, or pressing a decade
 *  with twelve beside it returns nothing. */
export type DecadeCount = { era: string; count: number };

/** What the river hands back. `total` and `decades` ride only on the first
 *  page: neither can change while paging through one query, and counting
 *  twenty thousand rows again per page is the second thing offset
 *  pagination was making the database do for nothing. */
export type RiverPage = {
  photos: PhotoData[];
  nextCursor: string | null;
  total?: number;
  decades?: DecadeCount[];
};

export async function loadPhotos(
  opts?: RiverFilters & { cursor?: string | null }
): Promise<RiverPage> {
  const session = await auth();
  if (!session?.user?.id) return { photos: [], nextCursor: null, total: 0, decades: [] };

  const order: RiverOrder = opts?.order ?? "newest";
  const filters = buildCollectionWhere(opts);
  const cursor = decodeCursor(order, opts?.cursor);
  const first = cursor === null;
  const where = { ...filters, ...afterCursor(order, cursor) };
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

  if (first) {
    const [total, byEra] = await Promise.all([
      prisma.photo.count({ where: filters }),
      prisma.photo.groupBy({
        by: ["era"],
        where: filters,
        _count: { era: true },
      }),
    ]);
    page.total = total;
    page.decades = byEra.map((g) => ({ era: g.era, count: g._count.era }));
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
  if (!row || row.isHidden) return null;
  const isOwn = row.uploaderId === session.user.id;
  if (!row.approved && !isOwn && session.user.role !== "admin") return null;
  return shape(row, session.user.id);
}

export async function myPendingPhotos(): Promise<PhotoData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await prisma.photo.findMany({
    where: { uploaderId: session.user.id, approved: false, isHidden: false },
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
