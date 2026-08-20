"use server";

import { createId } from "@paralleldrive/cuid2";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { hasBudget, consume } from "@/lib/rate-limit";
import { DELETION_GRACE_DAYS } from "@/lib/account-purge";
import { enqueueMail } from "@/lib/email-queue";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { putImage, delImage, ownerPrefix } from "@/lib/storage";
import { sharpImage } from "@/lib/image";
import { sniffImageType } from "@/lib/upload-shared";
import { profileSchema } from "@/lib/validators";
import { batchTypeFromLeaving } from "@/lib/utils";
import { titleCase, normalizePhone } from "@/lib/normalize";
import { writeAudit } from "@/lib/audit";
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
  if (IS_DEMO) return { error: "The demo does not accept photo uploads, but you can change your bird from the species picker." };

  /* Deliberately NOT behind requireVerifiedMember, unlike every other image
     write (Phase 3 review, 2026-08-20). Three reasons, all load-bearing:
     the owner's capability table grants "own profile" at Stage 0 and the
     onboarding wizard's photo step calls this before an email could possibly
     be confirmed; the abuse is bounded in a way the open upload routes are
     not (one 512px WebP per account, the previous object deleted on
     replace); and the image is only ever shown to Stage 1+ viewers, since a
     Stage 0 account cannot post and the directory is gated. Revisit if
     avatars ever render anywhere unauthenticated. */

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No photo provided" };
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed" };
  if (file.type === "image/heic" || file.type === "image/heif")
    return { error: "HEIC is not supported yet. Please export as JPG or PNG." };
  if (file.size > MAX_AVATAR_INPUT) return { error: "Photo must be under 15MB" };

  let url: string;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // The bytes, not the client MIME string, decide it is an image (M13).
    if (!sniffImageType(input)) {
      return { error: "That file doesn't look like a JPG, PNG, GIF or WebP image." };
    }
    const id = createId();
    // Square crop to a compact WebP; avatars never need more than ~512px. The
    // key is scoped to the owner (`avatars/<their id>/...`) like every other
    // upload root (audit C2).
    const webp = await sharpImage(input)
      .rotate()
      .resize(512, 512, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
    url = await putImage(webp, ownerPrefix("avatars", session.user.id), `${id}.webp`);
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

/**
 * A member deleting their own account (audit M35, replacing the old one-call
 * `deleteAccount`). Nothing is destroyed here: the request is recorded, every
 * session ends, and the retention sweep purges the row and its R2 objects
 * once the 60-day grace window has passed (src/lib/retention.ts, audit H9).
 * Signing in again inside the window cancels it — authorize() in auth.ts.
 *
 * Re-auth is the password, not the session: a stolen cookie must not be
 * enough to schedule someone's history for destruction. That makes this a
 * second door where passwords can be guessed, which the login limiter never
 * sees — so wrong guesses here spend their own budget ("reauth").
 */
export async function requestAccountDeletion(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "This is a demo account, so it stays put." };

  const userId = session.user.id;
  const password = (formData.get("password") as string) || "";

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, password: true },
  });
  if (!me) return { error: "Not authenticated" };
  if (!me.password) {
    // An account with no password cannot prove itself here. Rare (nothing
    // mints these today), but honest beats a dead button.
    return { error: "This account has no password to confirm with. Please message the admin instead." };
  }

  if (!(await hasBudget("reauth", userId))) {
    return { error: "Too many password attempts. Try again in a little while." };
  }
  if (!password || !(await bcrypt.compare(password, me.password))) {
    await consume("reauth", userId);
    return { error: "That password isn't right." };
  }

  const purgeAt = new Date(Date.now() + DELETION_GRACE_DAYS * 86_400_000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletionRequestedAt: new Date(),
      /* Ends every session this account holds, everywhere, right now — the
         same epoch bump a block uses (audit M4). The person confirming just
         proved the password, so THEY can sign straight back in (which is
         also the cancel gesture); a thief holding only a cookie cannot. */
      credentialVersion: { increment: 1 },
    },
  });

  await writeAudit({
    actorId: userId,
    action: "account.delete_request",
    targetType: "user",
    targetId: userId,
    detail: `${me.name} <${me.email}> — purge due ${purgeAt.toISOString().slice(0, 10)}`,
  });

  // The written confirmation, and the takeover alarm: if somebody else did
  // this, the mail says how to undo it while the window is still open.
  await enqueueMail({
    kind: "deletion-scheduled",
    to: me.email,
    userId,
    payload: {
      name: me.name,
      purgeDate: purgeAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  });

  return { success: true };
}
