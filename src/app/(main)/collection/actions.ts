"use server";

import sharp from "sharp";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { putImage, delImage } from "@/lib/storage";
import { photoSchema } from "@/lib/validators";
import { eraFromYear } from "@/lib/collection";
import { notifyAdminNote } from "@/lib/admin-note";
import { revalidatePath } from "next/cache";

const MAX_INPUT = 20 * 1024 * 1024; // 20MB input; output is tightly compressed
const PAGE_SIZE = 24;

/** True for iPhone photos exported as HEIC/HEIF. sharp's prebuilt binary has
 *  no HEVC decoder (patent licensing), so these fail with an opaque "unsupported
 *  image format" error from sharp; catch them earlier with a message that
 *  actually explains what to do. file.type is occasionally blank for these on
 *  some mobile browsers, so the filename extension is checked too. */
function isUnsupportedHeic(file: File) {
  return (
    file.type === "image/heic" || file.type === "image/heif" || /\.hei[cf]$/i.test(file.name)
  );
}

/** Turn a sharp processing error into a message that names the actual reason
 *  instead of a raw libvips exception string. */
function describeProcessingError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/unsupported image format/i.test(message)) {
    return "This photo's format isn't supported. Please export it as JPG or PNG and try again.";
  }
  if (/premature end|truncated|invalid/i.test(message)) {
    return "This photo looks corrupted or only partially uploaded. Please try again.";
  }
  return `Could not process the photo: ${message}`;
}

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

export async function contributePhoto(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No photo provided" };
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed" };
  if (isUnsupportedHeic(file)) {
    return {
      error:
        'This is a HEIC/HEIF photo, which isn\'t supported yet. Export it as JPG or PNG (or turn off "High Efficiency" in your camera settings) and try again.',
    };
  }
  if (file.size > MAX_INPUT) {
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
    const id = createId();

    const display = await sharp(input)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    width = display.info.width;
    height = display.info.height;

    const thumb = await sharp(input)
      .rotate()
      .resize(480, 480, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    [url, thumbUrl] = await Promise.all([
      putImage(display.data, "collection", `${id}.webp`),
      putImage(thumb, "collection", `${id}-t.webp`),
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
    ...(opts?.area ? { area: { contains: opts.area, ...insensitive } } : {}),
    ...(opts?.era ? { era: opts.era } : {}),
    ...(opts?.search
      ? {
          OR: [
            { caption: { contains: opts.search, ...insensitive } },
            { freeTags: { contains: opts.search, ...insensitive } },
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
 * Admin-only: soft-hide an already-approved Collection photo from its own
 * card/row (the grid tile and the /collection/[id] detail view), with the
 * same optional warm note flow as adminRemovePost/adminRemoveComment.
 * Distinct from declinePhoto above (a hard delete + file cleanup for photos
 * still in the pending-review queue): this keeps the row and the files, and
 * only applies to photos already live in the Collection.
 */
export async function adminRemovePhoto(photoId: string, note?: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized" };

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { uploaderId: true },
  });
  if (!photo) return { error: "Photo not found" };

  await prisma.photo.update({ where: { id: photoId }, data: { isHidden: true } });

  const trimmedNote = note?.trim();
  if (trimmedNote) await notifyAdminNote(photo.uploaderId, trimmedNote);

  revalidatePath("/collection");
  revalidatePath(`/collection/${photoId}`);
  return { success: true };
}
