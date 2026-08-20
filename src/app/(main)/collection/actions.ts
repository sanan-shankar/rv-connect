"use server";

import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import {
  putImage,
  delImage,
  getImageBuffer,
  delImageByKey,
  headObjectSize,
  keyBelongsTo,
  ownerPrefix,
} from "@/lib/storage";
import { sharpImage } from "@/lib/image";
import { escapeLike } from "@/lib/db-text";
import { photoSchema } from "@/lib/validators";
import {
  MAX_UPLOAD_BYTES,
  MAX_PHOTOS_PER_ACCOUNT,
  isUnsupportedHeic,
  describeProcessingError,
  sniffImageType,
} from "@/lib/upload-shared";
import { eraFromYear } from "@/lib/collection";
import { notifyAdminNote } from "@/lib/admin-note";
import { requireVerifiedMember } from "@/lib/member-gate";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 24;

export type PhotoData = {
  id: string;
  thumbUrl: string;
  url: string;
  width: number;
  height: number;
  caption: string | null;
  subject: string[];
  area: string | null;
  era: string;
  freeTags: string[];
  approved: boolean;
  loveCount: number;
  loved: boolean;
  isOwn: boolean;
  uploader: { id: string; name: string; avatarColor: string | null };
  createdAt: string;
};

function shape(
  p: {
    id: string; thumbUrl: string; url: string; width: number; height: number;
    caption: string | null; subject: string; area: string | null; era: string;
    freeTags: string | null; approved: boolean; uploaderId: string; createdAt: Date;
    uploader: { id: string; name: string; avatarColor: string | null };
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
    subject: p.subject ? p.subject.split(",").filter(Boolean) : [],
    area: p.area,
    era: p.era,
    freeTags: p.freeTags ? p.freeTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    approved: p.approved,
    loveCount: p._count.loves,
    loved: p.loves.length > 0,
    isOwn: p.uploaderId === userId,
    uploader: p.uploader,
    createdAt: p.createdAt.toISOString(),
  };
}

const includeFor = (userId: string) => ({
  uploader: { select: { id: true, name: true, avatarColor: true } },
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
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed" };
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

  const parsed = photoSchema.safeParse({
    caption: (formData.get("caption") as string) || undefined,
    area: (formData.get("area") as string) || undefined,
    era: (formData.get("era") as string) || undefined,
    datePrecision: (formData.get("datePrecision") as string) || undefined,
    photoYear: yearRaw ? Number(yearRaw) : undefined,
    photoMonth: monthRaw ? Number(monthRaw) : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // The decade bucket other Collection surfaces (browse filters, admin queue)
  // already key off. Derived from the exact year when given, else whatever
  // decade fallback the contributor picked.
  const era =
    parsed.data.photoYear !== undefined ? eraFromYear(parsed.data.photoYear) : parsed.data.era || "unknown";

  let thumbUrl: string;
  let url: string;
  let width: number;
  let height: number;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // The bytes, not the client's MIME string, decide it is an image (M13).
    if (!sniffImageType(input)) {
      return { error: "That file doesn't look like a JPG, PNG, GIF or WebP image." };
    }
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

    const thumb = await sharpImage(input)
      .rotate()
      .resize(480, 480, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    [url, thumbUrl] = await Promise.all([
      putImage(display.data, dir, `${id}.webp`),
      putImage(thumb, dir, `${id}-t.webp`),
    ]);
  } catch (e) {
    return { error: describeProcessingError(e) };
  }

  // Admins and trusted contributors skip the approval queue.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { photoTrusted: true },
  });
  const autoApprove = session.user.role === "admin" || !!me?.photoTrusted;

  await prisma.photo.create({
    data: {
      uploaderId: session.user.id,
      thumbUrl,
      url,
      width,
      height,
      caption: parsed.data.caption || null,
      // Subject tagging and the bird/species free-tag field were removed from
      // the form (2026-07-18 rework); kept as empty/null for older rows and
      // any other Collection surface still reading them.
      subject: "",
      area: parsed.data.area || null,
      era,
      freeTags: null,
      photoYear: parsed.data.photoYear ?? null,
      photoMonth: parsed.data.photoMonth ?? null,
      datePrecision: parsed.data.datePrecision ?? (parsed.data.photoYear !== undefined ? "year" : "unknown"),
      approved: autoApprove,
      approvedAt: autoApprove ? new Date() : null,
      approvedById: autoApprove ? session.user.id : null,
    },
  });

  revalidatePath("/collection");
  return { success: true, autoApprove };
}

// Only objects the collection presign step itself created may be recorded, AND
// only ones staged under the CALLER's own prefix (`collection/<their id>/...`);
// the ownership half is enforced with keyBelongsTo below (audit C2).
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
  era?: string;
  datePrecision?: string;
  photoYear?: number;
  photoMonth?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "The demo does not accept photo uploads. Everything already in the Collection is yours to browse." };

  // A contributed photograph is bytes into a bucket, credited to a name, shown
  // to the whole community. Of everything an account can do this is the one
  // with a real cost attached, so it waits for a confirmed address.
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  // Same meter as contributePhoto: the bytes came up through presign, but
  // the row it creates is the same kind of thing (audit M2).
  const limited = await rateLimit("uploads", session.user.id);
  if (!limited.ok) return { error: limited.error };

  if (
    typeof input.key !== "string" ||
    !COLLECTION_ORIGINAL_KEY.test(input.key) ||
    !keyBelongsTo(input.key, session.user.id, "collection")
  ) {
    return { error: "Bad upload reference" };
  }

  const quota = await photoQuotaError(session.user.id);
  if (quota) {
    // The staged original is orphaned if we refuse it; clean it up.
    await delImageByKey(input.key);
    return { error: quota };
  }

  const parsed = photoSchema.safeParse({
    caption: input.caption || undefined,
    area: input.area || undefined,
    era: input.era || undefined,
    datePrecision: input.datePrecision || undefined,
    photoYear: input.photoYear,
    photoMonth: input.photoMonth,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const era =
    parsed.data.photoYear !== undefined ? eraFromYear(parsed.data.photoYear) : parsed.data.era || "unknown";

  // Independent of the image work below; overlap the round trips.
  const mePromise = prisma.user.findUnique({
    where: { id: session.user.id },
    select: { photoTrusted: true },
  });

  let url: string;
  let thumbUrl: string;
  let width: number;
  let height: number;
  try {
    // Size is checked with a HEAD before the object is pulled into memory: a
    // presigned PUT cannot enforce a limit (R2 has no content-length-range), so
    // an oversized object is deleted without ever being fetched (audit M16).
    const stagedSize = await headObjectSize(input.key);
    if (stagedSize !== null && stagedSize > MAX_UPLOAD_BYTES + 1024) {
      await delImageByKey(input.key);
      return { error: "Photo is over the 20MB limit" };
    }

    const original = await getImageBuffer(input.key);
    if (original.byteLength > MAX_UPLOAD_BYTES + 1024) {
      // Belt to the HEAD's braces (a HEAD that could not read the size falls
      // through to here).
      await delImageByKey(input.key);
      return { error: "Photo is over the 20MB limit" };
    }
    if (!sniffImageType(original)) {
      await delImageByKey(input.key);
      return { error: "That upload doesn't look like a JPG, PNG, GIF or WebP image." };
    }

    const dir = ownerPrefix("collection", session.user.id);

    // The canonical full-size image: re-encoded (so EXIF/GPS is gone, M12) and
    // orientation baked in. Full resolution is kept for every realistic photo;
    // the only resize is a ceiling at WebP's hard 16383px dimension limit, so a
    // scan larger than WebP can even hold is bounded rather than throwing (the
    // old path stored the raw original and dodged this, but the raw original is
    // exactly the EXIF-bearing file we are no longer willing to publish).
    // withoutEnlargement means anything under the ceiling is untouched.
    // resolveWithObject gives us the upright dimensions directly, so there is
    // no EXIF-orientation swap to reason about.
    const WEBP_MAX_DIM = 16383;
    const display = await sharpImage(original)
      .rotate()
      .resize(WEBP_MAX_DIM, WEBP_MAX_DIM, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    width = display.info.width;
    height = display.info.height;
    if (!width || !height) throw new Error("unsupported image format");

    const thumb = await sharpImage(original)
      .rotate()
      .resize(480, 480, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    [url, thumbUrl] = await Promise.all([
      putImage(display.data, dir, `${createId()}.webp`),
      putImage(thumb, dir, `${createId()}-t.webp`),
    ]);

    // The raw original carried the EXIF; its re-encoded copy is now the
    // canonical image, so the original is deleted rather than left retrievable.
    await delImageByKey(input.key);
  } catch (e) {
    await delImageByKey(input.key);
    return { error: describeProcessingError(e) };
  }

  const me = await mePromise;
  const autoApprove = session.user.role === "admin" || !!me?.photoTrusted;

  await prisma.photo.create({
    data: {
      uploaderId: session.user.id,
      thumbUrl,
      url,
      width,
      height,
      caption: parsed.data.caption || null,
      subject: "",
      area: parsed.data.area || null,
      era,
      freeTags: null,
      photoYear: parsed.data.photoYear ?? null,
      photoMonth: parsed.data.photoMonth ?? null,
      datePrecision: parsed.data.datePrecision ?? (parsed.data.photoYear !== undefined ? "year" : "unknown"),
      approved: autoApprove,
      approvedAt: autoApprove ? new Date() : null,
      approvedById: autoApprove ? session.user.id : null,
    },
  });

  revalidatePath("/collection");
  return { success: true, autoApprove };
}

// Postgres accepts `mode: "insensitive"` on `contains`; SQLite's Prisma
// adapter rejects it (same gate as directory/where.ts and feed/actions.ts).
const IS_POSTGRES = (process.env.DATABASE_URL ?? "").startsWith("postgres");
const insensitive = IS_POSTGRES ? ({ mode: "insensitive" } as const) : {};

/**
 * Build the Prisma `where` for the Collection gallery from a set of filters.
 * Subject and the bird/species free-tag picker were removed from upload
 * (2026-07-18 rework), so neither gets a dropdown here; caption search still
 * ORs the legacy `freeTags` column so older bird-tagged photos stay findable
 * by typing (filters-rework.md sec 3.2).
 */
function buildCollectionWhere(opts?: { area?: string; era?: string; search?: string }) {
  return {
    approved: true,
    isHidden: false,
    // `area` is free text (upload no longer offers a fixed picklist), so this
    // is a `contains`, not equality -- matches both the option the person
    // picked from the live distinct-value list and anyone who free-typed a
    // near variant.
    ...(opts?.area ? { area: { contains: escapeLike(opts.area), ...insensitive } } : {}),
    ...(opts?.era ? { era: opts.era } : {}),
    ...(opts?.search
      ? {
          OR: [
            { caption: { contains: escapeLike(opts.search), ...insensitive } },
            { freeTags: { contains: escapeLike(opts.search), ...insensitive } },
          ],
        }
      : {}),
  };
}

export async function loadPhotos(opts?: {
  page?: number;
  area?: string;
  era?: string;
  search?: string;
  sortBy?: "newest" | "oldest" | "loved" | "wander";
}) {
  const session = await auth();
  if (!session?.user?.id) return { photos: [] as PhotoData[], hasMore: false, total: 0 };

  const page = opts?.page ?? 0;
  const where = buildCollectionWhere(opts);

  // "A wander": a gentle shuffle of a bounded set, single page (no load-more).
  if (opts?.sortBy === "wander") {
    const [rows, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        include: includeFor(session.user.id),
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      prisma.photo.count({ where }),
    ]);
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    return { photos: rows.map((p) => shape(p, session.user.id)), hasMore: false, total };
  }

  const orderBy =
    opts?.sortBy === "oldest"
      ? { createdAt: "asc" as const }
      : opts?.sortBy === "loved"
        ? { loves: { _count: "desc" as const } }
        : { createdAt: "desc" as const };

  const [rows, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      include: includeFor(session.user.id),
      orderBy,
      take: PAGE_SIZE + 1,
      skip: page * PAGE_SIZE,
    }),
    prisma.photo.count({ where }),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const trimmed = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return { photos: trimmed.map((p) => shape(p, session.user.id)), hasMore, total };
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

  const existing = await prisma.photoLove.findUnique({
    where: { userId_photoId: { userId: session.user.id, photoId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.photoLove.delete({ where: { id: existing.id } });
  } else {
    await prisma.photoLove.create({ data: { userId: session.user.id, photoId } });
  }
  return { success: true, loved: !existing };
}

export async function approvePhoto(photoId: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized" };

  await prisma.photo.update({
    where: { id: photoId },
    data: { approved: true, approvedAt: new Date(), approvedById: session.user.id },
  });
  revalidatePath("/collection");
  revalidatePath("/admin");
  return { success: true };
}

export async function declinePhoto(photoId: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized" };

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { thumbUrl: true, url: true, originalUrl: true, uploaderId: true },
  });
  if (!photo) return { error: "Photo not found" };

  await Promise.all([
    delImage(photo.thumbUrl),
    delImage(photo.url),
    delImage(photo.originalUrl),
  ]);
  await prisma.photo.delete({ where: { id: photoId } });

  await prisma.notification.create({
    data: {
      userId: photo.uploaderId,
      type: "admin",
      message:
        "A photo you shared was not added to the Collection. This space is for the place itself; please share people-shots on the feed or your profile instead.",
      link: "/collection",
    },
  });

  revalidatePath("/admin");
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
    select: { uploaderId: true, thumbUrl: true, url: true, originalUrl: true },
  });
  if (!photo) return { error: "Photo not found" };

  await prisma.photo.update({ where: { id: photoId }, data: { isHidden: true } });

  // The row survives (structure + note); the retrievable bytes do not.
  await Promise.all([
    delImage(photo.thumbUrl),
    delImage(photo.url),
    delImage(photo.originalUrl),
  ]);

  const trimmedNote = note?.trim();
  if (trimmedNote) await notifyAdminNote(photo.uploaderId, trimmedNote);

  revalidatePath("/collection");
  revalidatePath(`/collection/${photoId}`);
  return { success: true };
}
