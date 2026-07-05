"use server";

import sharp from "sharp";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { putImage, delImage } from "@/lib/storage";
import { profileSchema } from "@/lib/validators";
import { computeBatchFromSchooling } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const MAX_AVATAR_INPUT = 15 * 1024 * 1024; // 15MB input; output is tightly compressed
const MAX_COVER_INPUT = 15 * 1024 * 1024; // 15MB input; output is tightly compressed

export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const raw = {
    name: formData.get("name") as string,
    bio: (formData.get("bio") as string) || undefined,
    currentCity: (formData.get("currentCity") as string) || undefined,
    workplace: (formData.get("workplace") as string) || undefined,
    jobTitle: (formData.get("jobTitle") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    instagram: (formData.get("instagram") as string) || undefined,
    linkedin: (formData.get("linkedin") as string) || undefined,
    yearJoined: formData.get("yearJoined")
      ? Number(formData.get("yearJoined"))
      : undefined,
    yearLeft: formData.get("yearLeft")
      ? Number(formData.get("yearLeft"))
      : undefined,
    gradeJoined: formData.get("gradeJoined")
      ? Number(formData.get("gradeJoined"))
      : undefined,
    admissionNumber: formData.get("admissionNumber")
      ? Number(formData.get("admissionNumber"))
      : undefined,
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // The batch is derived, never taken directly off the form. Only recompute
  // it when all three schooling facts are present and valid; otherwise leave
  // whatever batch is already on file untouched (e.g. someone just fixing
  // their job title shouldn't have a correct batch wiped by a blank field).
  let batchUpdate: { batchYear?: number | null; batchType?: string | null } = {};
  if (
    parsed.data.yearJoined != null &&
    parsed.data.yearLeft != null &&
    parsed.data.gradeJoined != null
  ) {
    const batch = computeBatchFromSchooling(
      parsed.data.yearJoined,
      parsed.data.yearLeft,
      parsed.data.gradeJoined
    );
    if (!batch.ok) {
      return { error: batch.error };
    }
    batchUpdate = { batchYear: batch.batchYear, batchType: batch.batchType };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio || null,
      currentCity: parsed.data.currentCity || null,
      workplace: parsed.data.workplace || null,
      jobTitle: parsed.data.jobTitle || null,
      phone: parsed.data.phone || null,
      instagram: parsed.data.instagram || null,
      linkedin: parsed.data.linkedin || null,
      yearJoined: parsed.data.yearJoined ?? null,
      yearLeft: parsed.data.yearLeft ?? null,
      gradeJoined: parsed.data.gradeJoined ?? null,
      admissionNumber: parsed.data.admissionNumber ?? null,
      ...batchUpdate,
    },
  });

  revalidatePath("/settings");
  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}

export async function updateAvatar(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No photo provided" };
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed" };
  if (file.type === "image/heic" || file.type === "image/heif")
    return { error: "HEIC is not supported yet. Please export as JPG or PNG." };
  if (file.size > MAX_AVATAR_INPUT) return { error: "Photo must be under 15MB" };

  let url: string;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const id = createId();
    // Square crop to a compact WebP; avatars never need more than ~512px.
    const webp = await sharp(input)
      .rotate()
      .resize(512, 512, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
    url = await putImage(webp, "avatars", `${id}.webp`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: `Could not process the photo: ${message}` };
  }

  // Replace any prior uploaded photo, best-effort.
  const prev = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { photoUrl: true },
  });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { photoUrl: url },
  });
  if (prev?.photoUrl && prev.photoUrl !== url) await delImage(prev.photoUrl);

  revalidatePath("/settings");
  revalidatePath(`/profile/${session.user.id}`);
  return { success: true, photoUrl: url };
}

export async function removeAvatar() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const prev = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { photoUrl: true },
  });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { photoUrl: null },
  });
  if (prev?.photoUrl) await delImage(prev.photoUrl);

  revalidatePath("/settings");
  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}

export async function updateCover(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No photo provided" };
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed" };
  if (file.type === "image/heic" || file.type === "image/heif")
    return { error: "HEIC is not supported yet. Please export as JPG or PNG." };
  if (file.size > MAX_COVER_INPUT) return { error: "Photo must be under 15MB" };

  let url: string;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const id = createId();
    // Wide banner crop to WebP. The header renders it with bg-cover/center, so
    // a landscape frame crops cleanly across desktop and mobile bands.
    const webp = await sharp(input)
      .rotate()
      .resize(1600, 600, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer();
    url = await putImage(webp, "covers", `${id}.webp`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: `Could not process the photo: ${message}` };
  }

  // Replace any prior uploaded cover, best-effort.
  const prev = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { coverPhoto: true },
  });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { coverPhoto: url },
  });
  if (prev?.coverPhoto && prev.coverPhoto !== url) await delImage(prev.coverPhoto);

  revalidatePath("/settings");
  revalidatePath(`/profile/${session.user.id}`);
  return { success: true, coverPhoto: url };
}

export async function removeCover() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const prev = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { coverPhoto: true },
  });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { coverPhoto: null },
  });
  if (prev?.coverPhoto) await delImage(prev.coverPhoto);

  revalidatePath("/settings");
  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}

export async function deleteAccount() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.user.delete({
    where: { id: session.user.id },
  });

  return { success: true };
}
