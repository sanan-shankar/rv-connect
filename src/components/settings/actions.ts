"use server";

import sharp from "sharp";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { putImage, delImage } from "@/lib/storage";
import { profileSchema } from "@/lib/validators";
import { batchTypeFromLeaving } from "@/lib/utils";
import { titleCase, normalizePhone } from "@/lib/normalize";
import { revalidatePath } from "next/cache";

const MAX_AVATAR_INPUT = 15 * 1024 * 1024; // 15MB input; output is tightly compressed

export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // "Other links" travels as a JSON string (the form serialises its repeater
  // rows before calling this action); malformed JSON is treated as "none"
  // rather than failing the whole save.
  let rawLinks: unknown;
  try {
    const linksField = formData.get("links") as string | null;
    rawLinks = linksField ? JSON.parse(linksField) : undefined;
  } catch {
    rawLinks = undefined;
  }

  // Phone numbers travel the same way: the form serialises its repeater rows
  // to a JSON string; malformed JSON is treated as "none" rather than failing
  // the whole save.
  let rawPhones: unknown;
  try {
    const phonesField = formData.get("phones") as string | null;
    rawPhones = phonesField ? JSON.parse(phonesField) : undefined;
  } catch {
    rawPhones = undefined;
  }

  const raw = {
    name: formData.get("name") as string,
    about: (formData.get("about") as string) || undefined,
    displayEmail: (formData.get("displayEmail") as string | null) ?? undefined,
    workplace: (formData.get("workplace") as string) || undefined,
    jobTitle: (formData.get("jobTitle") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    instagram: (formData.get("instagram") as string) || undefined,
    linkedin: (formData.get("linkedin") as string) || undefined,
    facebook: (formData.get("facebook") as string) || undefined,
    phones: rawPhones,
    links: rawLinks,
    batchYear: formData.get("batchYear")
      ? Number(formData.get("batchYear"))
      : undefined,
    yearJoined: formData.get("yearJoined")
      ? Number(formData.get("yearJoined"))
      : undefined,
    yearLeft: formData.get("yearLeft")
      ? Number(formData.get("yearLeft"))
      : undefined,
    admissionNumber: formData.get("admissionNumber")
      ? Number(formData.get("admissionNumber"))
      : undefined,
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Batch: same direct model as sign-up. The "Batch of ___" field is written
  // straight through; batchType (the board credential) is derived from it plus
  // the year left, via the same batchTypeFromLeaving helper registerUser uses,
  // so the two can never disagree. A blank batch on a partial edit never wipes
  // a batch already on file, and without a year left the existing batchType is
  // left untouched rather than cleared.
  const batchUpdate: { batchYear?: number | null; batchType?: string | null } = {};
  if (parsed.data.batchYear != null) {
    batchUpdate.batchYear = parsed.data.batchYear;
    if (parsed.data.yearLeft != null) {
      batchUpdate.batchType = batchTypeFromLeaving(parsed.data.yearLeft, parsed.data.batchYear);
    }
  }

  // Title-case the free-text identity fields on save (leave emails/handles alone).
  const cleanName = titleCase(parsed.data.name);
  const cleanWorkplace = parsed.data.workplace ? titleCase(parsed.data.workplace) : null;
  const cleanJobTitle = parsed.data.jobTitle ? titleCase(parsed.data.jobTitle) : null;
  const displayEmail = parsed.data.displayEmail?.trim() || null;

  // Phone numbers: the repeater rows when the form sent them, else the legacy
  // single field as a one-element list (so an older client that only posts
  // `phone` can't wipe anything). Every entry is normalized the same way
  // registerUser does, empties dropped, duplicates removed (Set keeps first
  // occurrence, so the order the member chose survives).
  const phoneInput = parsed.data.phones ?? (parsed.data.phone ? [parsed.data.phone] : []);
  const phoneArr = Array.from(
    new Set(phoneInput.map(normalizePhone).filter((p) => p.length > 0))
  );

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: cleanName,
      about: parsed.data.about?.trim() || null,
      displayEmail,
      workplace: cleanWorkplace,
      jobTitle: cleanJobTitle,
      // The mirror is the contract: legacy `phone` always holds the FIRST
      // number (or null), so every reader that predates the list (directory,
      // vCard fallback, profile fallback) keeps working untouched.
      phone: phoneArr[0] ?? null,
      phones: phoneArr.length > 0 ? JSON.stringify(phoneArr) : null,
      instagram: parsed.data.instagram || null,
      linkedin: parsed.data.linkedin || null,
      facebook: parsed.data.facebook || null,
      links: parsed.data.links && parsed.data.links.length > 0 ? JSON.stringify(parsed.data.links) : null,
      yearJoined: parsed.data.yearJoined ?? null,
      yearLeft: parsed.data.yearLeft ?? null,
      admissionNumber: parsed.data.admissionNumber ?? null,
      ...batchUpdate,
    },
  });

  revalidatePath("/settings");
  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}

/**
 * Persist a member's ordered city list (the "Where you are" section). Writes
 * the `UserPlace` rows wholesale (delete + recreate in order) and syncs the
 * legacy `User.currentCity` to the first city label so old read paths that
 * still reference it keep working during the migration.
 */
export async function updateUserPlaces(
  places: { placeId: number | null; label: string; city: string; lat: number | null; lng: number | null }[]
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

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

  const userId = session.user.id;
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

  revalidatePath("/settings");
  revalidatePath(`/profile/${userId}`);
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

export async function deleteAccount() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.user.delete({
    where: { id: session.user.id },
  });

  return { success: true };
}
